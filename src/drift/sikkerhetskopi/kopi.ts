/**
 * Å ta og gjenopprette en fullstendig, kryptert sikkerhetskopi av en
 * Supabase-database etter `docs/s4-pilotplan.md` §3.2 valg b. Rutinen står i
 * `docs/drift-gjenoppretting.md`; kommandolinjen er `scripts/sikkerhetskopi.ts`.
 *
 * En kopi er én fil, kryptert med `age` til en offentlig nøkkel. Inne i den:
 *
 *   roller.sql, struktur.sql, data.sql      Supabases tredelte CLI-kopi
 *   historikk_struktur.sql, historikk_data.sql   migrasjonshistorikken
 *   tilpasninger.sql                        OUSFARs objekter i auth og storage
 *   filer/<bøtte>/<navn>                    filene i Storage
 *   auth-innstillinger.json                 uten hemmeligheter (valgfritt)
 *   manifest.json                           radtall, kontrollsummer, filer, versjoner,
 *                                           referansen og navnene på hemmelighetene
 *
 * Kopien inneholder passordhasher og tofaktornøkler. Den ukrypterte mappen
 * ligger bare i en midlertidig mappe med tilgang for eieren, og slettes når
 * den er kryptert eller gjenopprettet.
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import {
  FINGERAVTRYKK_SQL,
  VERSJONSTABELLER,
  avvik,
  finnesSql,
  forskjell,
  manglendeDekning,
  objekterFraMigrasjoner,
  somObjekter,
  tilpasningsskript,
  versjonSql,
  type Fingeravtrykk,
  type Objekt,
} from './tilpasninger'
import { SUPABASE_CLI } from '../supabaseCli'
import { PLATTFORMTABELLER, TABELLER_SQL, sammenlign, tabellsumSql, type Fil, type Manifest, type Tabellsum } from './manifest'


/** Produksjonsprosjektet. En gjenoppretting går aldri dit: et reelt tap gjenopprettes i et nytt prosjekt. */
export const PRODUKSJONSREF = 'jfzqowsmjtthpbipnxnf'

const logg = (tekst: string) => console.log(`[sikkerhetskopi] ${tekst}`)

export class Stopp extends Error {}

// --- Postgres gjennom psql ----------------------------------------------------

function psql(dbUrl: string, argumenter: string[]): string {
  return execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl, ...argumenter], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  })
}

/** Radene fra en spørring som JSON. */
export function sporring<T = Record<string, unknown>>(dbUrl: string, sql: string): T[] {
  const ut = psql(dbUrl, ['-At', '-c', `select coalesce(json_agg(x), '[]'::json) from (${sql}) x`])
  return JSON.parse(ut.trim() || '[]') as T[]
}

export function fingeravtrykk(dbUrl: string): Fingeravtrykk {
  const versjoner: Fingeravtrykk['versjoner'] = {}
  for (const [skjema, tabell] of Object.entries(VERSJONSTABELLER) as [keyof typeof VERSJONSTABELLER, string][]) {
    const [{ finnes }] = sporring<{ finnes: boolean }>(dbUrl, finnesSql(tabell)) as [{ finnes: boolean }]
    versjoner[skjema] = finnes ? (sporring<{ versjon: string | null }>(dbUrl, versjonSql(skjema))[0]?.versjon ?? null) : null
  }
  return { versjoner, objekter: somObjekter(sporring(dbUrl, FINGERAVTRYKK_SQL)) }
}

export function tabellsummer(dbUrl: string): Tabellsum[] {
  const tabeller = sporring<{ tabell: string }>(dbUrl, TABELLER_SQL).map((r) => r.tabell)
  return tabeller.map((t) => {
    const [rad] = sporring<Tabellsum>(dbUrl, tabellsumSql(t))
    return { tabell: t, rader: Number(rad!.rader), sum: rad!.sum }
  })
}

/** Tabellene i OUSFARs egne skjemaer, og plattformtabellene i manifestet som har rader: et tomt mål har ingen. */
function harEgneData(dbUrl: string): string[] {
  const plattform = new Set<string>(PLATTFORMTABELLER)
  return tabellsummer(dbUrl)
    .filter((t) => !plattform.has(t.tabell) || t.rader > 0)
    .map((t) => `${t.tabell}${plattform.has(t.tabell) ? ` (${t.rader} rader)` : ''}`)
}

// --- Supabase-CLI-en ----------------------------------------------------------

/**
 * Tabellene i `auth` og `storage` innloggingsrollen ikke kan skrive i. De
 * fylles og eies av plattformen selv (som `storage.buckets_vectors`), kan ikke
 * legges inn ved en gjenoppretting og tas derfor ikke med i dataene.
 */
export function utenSkrivetilgang(dbUrl: string): string[] {
  return sporring<{ tabell: string }>(
    dbUrl,
    `select n.nspname || '.' || c.relname as tabell from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname in ('auth', 'storage') and c.relkind in ('r', 'p')
       and not has_table_privilege(c.oid, 'insert') order by 1`,
  ).map((r) => r.tabell)
}

function dump(dbUrl: string, fil: string, ...valg: string[]): void {
  execFileSync('npx', [...SUPABASE_CLI, 'db', 'dump', '--db-url', dbUrl, '-f', fil, ...valg], {
    stdio: ['ignore', 'ignore', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

// --- Storage ------------------------------------------------------------------

const lagringsklient = (apiUrl: string, nokkel: string) =>
  createClient(apiUrl, nokkel, { auth: { autoRefreshToken: false, persistSession: false } }).storage

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

interface Lagret {
  bucket: string
  navn: string
  type: string | null
}

const lagredeObjekter = (dbUrl: string) =>
  sporring<Lagret>(dbUrl, `select bucket_id as bucket, name as navn, metadata->>'mimetype' as type from storage.objects order by 1, 2`)

async function hentFiler(dbUrl: string, apiUrl: string, nokkel: string, mappe: string): Promise<Fil[]> {
  const lager = lagringsklient(apiUrl, nokkel)
  const filer: Fil[] = []
  for (const o of lagredeObjekter(dbUrl)) {
    const { data, error } = await lager.from(o.bucket).download(o.navn)
    if (error) throw new Stopp(`Kunne ikke hente ${o.bucket}/${o.navn}: ${error.message}`)
    const innhold = new Uint8Array(await data.arrayBuffer())
    const sti = join(mappe, 'filer', o.bucket, o.navn)
    mkdirSync(dirname(sti), { recursive: true })
    writeFileSync(sti, innhold)
    filer.push({ bucket: o.bucket, navn: o.navn, bytes: innhold.length, sha256: sha256(innhold) })
  }
  return filer
}

async function leggTilbakeFiler(manifest: Manifest, dbUrl: string, apiUrl: string, nokkel: string, mappe: string): Promise<void> {
  const lager = lagringsklient(apiUrl, nokkel)
  const typer = new Map(lagredeObjekter(dbUrl).map((o) => [`${o.bucket}/${o.navn}`, o.type]))
  for (const f of manifest.filer) {
    const innhold = readFileSync(join(mappe, 'filer', f.bucket, f.navn))
    const { error } = await lager
      .from(f.bucket)
      .upload(f.navn, innhold, { upsert: true, contentType: typer.get(`${f.bucket}/${f.navn}`) ?? undefined })
    if (error) throw new Stopp(`Kunne ikke legge tilbake ${f.bucket}/${f.navn}: ${error.message}`)
  }
}

async function filsummer(manifest: Manifest, apiUrl: string, nokkel: string): Promise<Fil[]> {
  const lager = lagringsklient(apiUrl, nokkel)
  const ut: Fil[] = []
  for (const f of manifest.filer) {
    const { data, error } = await lager.from(f.bucket).download(f.navn)
    if (error) continue
    const innhold = new Uint8Array(await data.arrayBuffer())
    ut.push({ bucket: f.bucket, navn: f.navn, bytes: innhold.length, sha256: sha256(innhold) })
  }
  return ut
}

// --- Management API (valgfritt) ----------------------------------------------

/** Feltene i Auth-innstillingene som kan være hemmelige, og som aldri lagres. */
const HEMMELIG = /secret|key|password|token|smtp_pass|client_id|hook_.*_uri/i

async function managementApi(prosjekt: string, sti: string, token: string): Promise<unknown> {
  const svar = await fetch(`https://api.supabase.com/v1/projects/${prosjekt}${sti}`, { headers: { authorization: `Bearer ${token}` } })
  if (!svar.ok) throw new Stopp(`Management API ${sti}: ${svar.status}`)
  return svar.json()
}

// --- Referansen ---------------------------------------------------------------

/** Fingeravtrykket av en ren Supabase uten OUSFARs migrasjoner. */
export function lagReferanse(dbUrl: string): Fingeravtrykk {
  const avtrykk = fingeravtrykk(dbUrl)
  const egne = harEgneData(dbUrl)
  if (egne.length) throw new Stopp(`Referansen må være en ren Supabase, men har ${egne.slice(0, 5).join(', ')}.`)
  return avtrykk
}

// --- Å ta en kopi -------------------------------------------------------------

export interface TaValg {
  dbUrl: string
  apiUrl: string
  /** Hemmelig nøkkel (service role) for Storage i kilden. */
  nokkel: string
  referanse: Fingeravtrykk
  /** Offentlige `age`-nøkler kopien krypteres til. */
  mottakere: string[]
  /** Mappen kopien skrives til, som `ousfar-kopi-<tid>.tar.age`. */
  ut: string
  /** Migrasjonsmappen dekningen leses fra. */
  migrasjoner: string
  /** Prosjekt og token for Auth-innstillingene og navnene på hemmelighetene. */
  prosjekt?: string
  token?: string
}

export async function taKopi(valg: TaValg): Promise<string> {
  if (!valg.mottakere.length) throw new Stopp('Kopien må krypteres: oppgi minst én mottaker (offentlig age-nøkkel).')
  const kilde = fingeravtrykk(valg.dbUrl)
  const f = forskjell(kilde, valg.referanse)
  const feil = avvik(f)
  if (feil.length) throw new Stopp(`Tilpasningene kan ikke skilles ut mot referansen:\n- ${feil.join('\n- ')}`)
  const fraMigrasjoner = objekterFraMigrasjoner(
    readdirSync(valg.migrasjoner).filter((n) => n.endsWith('.sql')).sort().map((n) => readFileSync(join(valg.migrasjoner, n), 'utf8')),
  )
  const mangler = manglendeDekning(f.tilpasninger, fraMigrasjoner)
  if (mangler.length) throw new Stopp(`Objekter fra migrasjonene finnes ikke blant tilpasningene: ${mangler.join(', ')}`)

  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-kopi-'))
  chmodSync(mappe, 0o700)
  try {
    logg('tar roller, struktur og data')
    dump(valg.dbUrl, join(mappe, 'roller.sql'), '--role-only')
    dump(valg.dbUrl, join(mappe, 'struktur.sql'))
    dump(valg.dbUrl, join(mappe, 'data.sql'), '--data-only', '--use-copy', ...utenSkrivetilgang(valg.dbUrl).flatMap((t) => ['-x', t]))
    dump(valg.dbUrl, join(mappe, 'historikk_struktur.sql'), '--schema', 'supabase_migrations')
    dump(valg.dbUrl, join(mappe, 'historikk_data.sql'), '--data-only', '--use-copy', '--schema', 'supabase_migrations')
    writeFileSync(join(mappe, 'tilpasninger.sql'), tilpasningsskript(f.tilpasninger))
    logg(`${f.tilpasninger.length} tilpasninger i auth og storage`)

    logg('henter filene i Storage')
    const filer = await hentFiler(valg.dbUrl, valg.apiUrl, valg.nokkel, mappe)

    let hemmeligheter: string[] = []
    if (valg.prosjekt && valg.token) {
      const innstillinger = (await managementApi(valg.prosjekt, '/config/auth', valg.token)) as Record<string, unknown>
      writeFileSync(
        join(mappe, 'auth-innstillinger.json'),
        JSON.stringify(Object.fromEntries(Object.entries(innstillinger).filter(([k]) => !HEMMELIG.test(k))), null, 2),
      )
      hemmeligheter = ((await managementApi(valg.prosjekt, '/secrets', valg.token)) as { name: string }[]).map((s) => s.name).sort()
    }

    const manifest: Manifest & { referanse: Fingeravtrykk; tilpasninger: Objekt[] } = {
      laget: new Date().toISOString(),
      kilde: new URL(valg.apiUrl).host,
      versjoner: kilde.versjoner as Record<string, string | null>,
      tabeller: tabellsummer(valg.dbUrl),
      filer,
      hemmeligheter,
      referanse: valg.referanse,
      tilpasninger: f.tilpasninger,
    }
    writeFileSync(join(mappe, 'manifest.json'), JSON.stringify(manifest, null, 2))

    mkdirSync(valg.ut, { recursive: true })
    const fil = resolve(valg.ut, `ousfar-kopi-${manifest.laget.replaceAll(/[:.]/g, '-')}.tar.age`)
    const tar = execFileSync('tar', ['-C', mappe, '-cf', '-', '.'], { maxBuffer: 2 * 1024 ** 3 })
    execFileSync('age', [...valg.mottakere.flatMap((m) => ['-r', m]), '-o', fil], { input: tar })
    logg(`kopien er kryptert: ${fil} (${manifest.tabeller.length} tabeller, ${filer.length} filer)`)
    return fil
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

// --- Å gjenopprette -----------------------------------------------------------

export interface GjenopprettValg {
  kopi: string
  /** Fila med den private `age`-nøkkelen. */
  identitet: string
  dbUrl: string
  apiUrl: string
  /** Hemmelig nøkkel (service role) for Storage i målet. */
  nokkel: string
}

export interface Resultat {
  sekunder: number
  avvik: string[]
}

/** Avvikene i målets fingeravtrykk fra referansen pluss tilpasningene, tomt når de er like. */
export function kontrollerTilpasninger(mal: Fingeravtrykk, referanse: Fingeravtrykk, tilpasninger: readonly Objekt[]): string[] {
  const f = forskjell(mal, { versjoner: referanse.versjoner, objekter: [...referanse.objekter, ...tilpasninger] })
  return [
    ...avvik(f),
    ...f.tilpasninger.map((o) => `ekstra i målet: ${o.art} ${o.nokkel}`),
  ]
}

/** Venter til Auth og Storage i prosjektet svarer, høyst to minutter. */
export async function ventPaTjenestene(apiUrl: string, nokkel: string): Promise<void> {
  const svarer = (sti: string) =>
    fetch(`${apiUrl}${sti}`, { headers: { apikey: nokkel, authorization: `Bearer ${nokkel}` } }).then((r) => r.ok, () => false)
  for (let i = 0; i < 120; i++) {
    if ((await svarer('/auth/v1/health')) && (await svarer('/storage/v1/bucket'))) return
    await new Promise((ok) => setTimeout(ok, 1000))
  }
  throw new Stopp(`Auth og Storage i ${apiUrl} svarer ikke.`)
}

export async function gjenopprett(valg: GjenopprettValg): Promise<Resultat> {
  const start = Date.now()
  if (valg.dbUrl.includes(PRODUKSJONSREF) || valg.apiUrl.includes(PRODUKSJONSREF)) {
    throw new Stopp('Gjenopprettingen går aldri over produksjonen. Lag et nytt prosjekt og gjenopprett dit.')
  }
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-gjenoppretting-'))
  chmodSync(mappe, 0o700)
  try {
    const tar = execFileSync('age', ['-d', '-i', valg.identitet, valg.kopi], { maxBuffer: 2 * 1024 ** 3 })
    execFileSync('tar', ['-C', mappe, '-xf', '-'], { input: tar })
    const manifest = JSON.parse(readFileSync(join(mappe, 'manifest.json'), 'utf8')) as Manifest & {
      referanse: Fingeravtrykk
      tilpasninger: Objekt[]
    }

    await ventPaTjenestene(valg.apiUrl, valg.nokkel)
    // Målet må være en ren Supabase med de samme versjonene og plattformobjektene som referansen.
    const egne = harEgneData(valg.dbUrl)
    if (egne.length) throw new Stopp(`Målet er ikke tomt (${egne.slice(0, 5).join(', ')}). Gjenopprett bare til et nytt prosjekt.`)
    const forMal = avvik(forskjell(fingeravtrykk(valg.dbUrl), manifest.referanse))
    if (forMal.length) throw new Stopp(`Målet er ikke likt referansen:\n- ${forMal.join('\n- ')}`)

    logg('legger inn roller, struktur og data')
    const fil = (n: string) => join(mappe, n)
    // `roller.sql` kjøres ikke: den har bare Supabases egne innstillinger, som
    // målet alt har. OUSFARs endringer på rollene er blant tilpasningene.
    psql(valg.dbUrl, [
      '--single-transaction',
      '-f', fil('struktur.sql'),
      '-c', 'set session_replication_role = replica',
      '-f', fil('data.sql'),
    ])
    logg('legger inn tilpasningene i auth og storage')
    psql(valg.dbUrl, ['-f', fil('tilpasninger.sql')])
    logg('legger inn migrasjonshistorikken')
    psql(valg.dbUrl, ['--single-transaction', '-f', fil('historikk_struktur.sql'), '-f', fil('historikk_data.sql')])
    logg('legger tilbake filene i Storage')
    await leggTilbakeFiler(manifest, valg.dbUrl, valg.apiUrl, valg.nokkel, mappe)

    const resultat = kontroller(manifest, valg, await filsummer(manifest, valg.apiUrl, valg.nokkel))
    return { sekunder: Math.round((Date.now() - start) / 1000), avvik: resultat }
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

function kontroller(manifest: Manifest & { referanse: Fingeravtrykk; tilpasninger: Objekt[] }, valg: GjenopprettValg, filer: Fil[]): string[] {
  return [
    ...sammenlign(manifest, { tabeller: tabellsummer(valg.dbUrl), filer }),
    ...kontrollerTilpasninger(fingeravtrykk(valg.dbUrl), manifest.referanse, manifest.tilpasninger),
  ]
}

export const lesReferanse = (fil: string): Fingeravtrykk => {
  if (!existsSync(fil)) throw new Stopp(`Referansen ${fil} finnes ikke. Lag den med «referanse».`)
  return JSON.parse(readFileSync(fil, 'utf8')) as Fingeravtrykk
}
