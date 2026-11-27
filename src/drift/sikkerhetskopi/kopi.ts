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
 * **Ett kopipunkt.** Alle delene leses i det samme øyeblikksbildet av
 * databasen: en transaksjon eksporterer et øyeblikksbilde
 * (`pg_export_snapshot()`), hver `pg_dump` tar det i bruk (`--snapshot`), og
 * manifestet, fingeravtrykket og listen over filer leses i det samme. Endringer
 * som skjer mens kopien tas, kommer derfor verken med i dumpen eller i
 * manifestet. Filene i Storage ligger utenfor databasen; de sammenlignes med
 * størrelsen og md5-summen øyeblikksbildet har for dem, og er en fil endret
 * eller borte, forkastes forsøket og tas på nytt (høyst tre ganger).
 *
 * **I biter.** Dataene i OUSFARs tabeller med primærnøkkel ligger ikke i
 * `data.sql`, men i biter ved siden av kopien (`deler/<identitet>.age`, hver
 * kryptert for seg; `deler.ts`). En bit kopilageret alt har, hentes ikke ut av
 * databasen på nytt. Signaturen lister bitene med sha256 og md5, og manifestet
 * inne i kopien lister dem med tabellen og kolonnene.
 *
 * **Utelatt.** Tabellene i `UTELATTE_TABELLER` (direktemeldingene og
 * samtalene deres, og de flyktige varselkøene) tas aldri med og leses ikke.
 * Viser en tabell som tas med, til en utelatt, stopper kopien: da ville den
 * gjenopprettede databasen hatt referanser til rader som ikke finnes.
 *
 * **Strømmet.** Pakking, kryptering, dekryptering og utpakking går rett fra
 * prosess til prosess (`tar | age`), uten at kopien er i minnet, så størrelsen
 * begrenses bare av disken.
 *
 * Kopien inneholder passordhasher og tofaktornøkler. Den ukrypterte mappen
 * ligger bare i en midlertidig mappe med tilgang for eieren, og slettes når
 * den er kryptert eller gjenopprettet.
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, closeSync, copyFileSync, createReadStream, existsSync, mkdirSync, mkdtempSync, openSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
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
import { Endret, Stopp } from './feil'
import { signer, verifiser, type Delfil } from './signatur'
import {
  EGNE_SKJEMAER_SQL,
  KRYPTERTE_FAKTORER_SQL,
  PLATTFORMTABELLER,
  TABELLER_SQL,
  TOM_SUM,
  UTELATTE_TABELLER,
  sammenlign,
  tabellsumSql,
  type Fil,
  type Manifest,
  type Tabellsum,
} from './manifest'
import {
  FASTE_INNSTILLINGER,
  delplanSql,
  delteTabellerSql,
  henteskript,
  nyeBiter,
  sekvensSql,
  tilbakeskript,
  type Bit,
  type DeltTabell,
  type Sekvens,
} from './deler'


/** Produksjonsprosjektet. En gjenoppretting går aldri dit: et reelt tap gjenopprettes i et nytt prosjekt. */
export const PRODUKSJONSREF = 'jfzqowsmjtthpbipnxnf'

const logg = (tekst: string) => console.log(`[sikkerhetskopi] ${tekst}`)

export { Endret, Stopp }

// --- Postgres gjennom psql ----------------------------------------------------

function psql(dbUrl: string, argumenter: string[]): string {
  return execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl, ...argumenter], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 256 * 1024 * 1024,
  })
}

/**
 * Radene fra en spørring som JSON. Med `bilde` leses de i det eksporterte
 * øyeblikksbildet, slik dumpene leser dataene. Øktinnstillingene teksten til
 * en rad avhenger av, er faste (`FASTE_INNSTILLINGER`), så kontrollsummene
 * blir de samme i kilden og i et mål med andre standardinnstillinger.
 */
export function sporring<T = Record<string, unknown>>(dbUrl: string, sql: string, bilde?: string): T[] {
  const i = bilde ? `begin isolation level repeatable read read only; set transaction snapshot '${bilde.replaceAll("'", '')}'; ` : ''
  const faste = FASTE_INNSTILLINGER.map((x) => `${x}; `).join('')
  const ut = psql(dbUrl, ['-At', '-c', `${i}${faste}select coalesce(json_agg(x), '[]'::json) from (${sql}) x`])
  return JSON.parse(ut.trim() || '[]') as T[]
}

export function fingeravtrykk(dbUrl: string, bilde?: string): Fingeravtrykk {
  const versjoner: Fingeravtrykk['versjoner'] = {}
  for (const [skjema, tabell] of Object.entries(VERSJONSTABELLER) as [keyof typeof VERSJONSTABELLER, string][]) {
    const [{ finnes }] = sporring<{ finnes: boolean }>(dbUrl, finnesSql(tabell), bilde) as [{ finnes: boolean }]
    versjoner[skjema] = finnes ? (sporring<{ versjon: string | null }>(dbUrl, versjonSql(skjema), bilde)[0]?.versjon ?? null) : null
  }
  return { versjoner, objekter: somObjekter(sporring(dbUrl, FINGERAVTRYKK_SQL, bilde)) }
}

/** Radtall og kontrollsum per tabell. De utelatte leses ikke; de skal være tomme etter en gjenoppretting. */
export function tabellsummer(dbUrl: string, bilde?: string, utelatt: readonly string[] = []): Tabellsum[] {
  const tabeller = sporring<{ tabell: string }>(dbUrl, TABELLER_SQL, bilde).map((r) => r.tabell)
  const ute = new Set(utelatt)
  return tabeller.map((t) => {
    if (ute.has(t)) return { tabell: t, rader: 0, sum: TOM_SUM }
    const [rad] = sporring<Tabellsum>(dbUrl, tabellsumSql(t), bilde)
    return { tabell: t, rader: Number(rad!.rader), sum: rad!.sum }
  })
}

/**
 * Et eksportert øyeblikksbilde, holdt åpent av en egen tilkobling til
 * `slipp()` kalles. Alt som leses med navnet, ser databasen slik den var da.
 */
export interface Oyeblikksbilde {
  navn: string
  slipp(): Promise<void>
}

export function holdOyeblikksbilde(dbUrl: string): Promise<Oyeblikksbilde> {
  const p = spawn('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl], { stdio: ['pipe', 'pipe', 'pipe'] })
  let feil = ''
  p.stderr.on('data', (d: Buffer) => (feil += d.toString()))
  return new Promise((ok, avvis) => {
    let ut = ''
    const lytt = (d: Buffer) => {
      ut += d.toString()
      const navn = ut.split('\n').map((l) => l.trim()).find((l) => /^[0-9A-F]+-[0-9A-F]+-\d+$/i.test(l))
      if (!navn) return
      p.stdout.off('data', lytt)
      ok({
        navn,
        slipp: () =>
          new Promise<void>((ferdig) => {
            p.once('exit', () => ferdig())
            p.stdin.end('commit;\n')
          }),
      })
    }
    p.stdout.on('data', lytt)
    p.once('exit', (kode) => avvis(new Stopp(`Øyeblikksbildet kunne ikke holdes (${kode}): ${feil.trim()}`)))
    p.stdin.write('begin isolation level repeatable read read only;\nselect pg_export_snapshot();\n')
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
       and not has_table_privilege('postgres', c.oid, 'insert') order by 1`,
  ).map((r) => r.tabell)
}

/**
 * Skriptet Supabase-CLI-en ville kjørt for `db dump` med valgene (`--dry-run`),
 * med `--snapshot` lagt til hver `pg_dump`, så CLI-en fortsatt avgjør hva som
 * tas med og hvordan det skrives, men alt leses i det samme øyeblikksbildet.
 */
export function dumpskript(dbUrl: string, bilde: string, valg: readonly string[]): string {
  const skript = execFileSync('npx', [...SUPABASE_CLI, 'db', 'dump', '--db-url', dbUrl, '--dry-run', ...valg], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return medOyeblikksbilde(skript, bilde)
}

/** `--snapshot` på hver `pg_dump` i et dumpskript; stopper hvis skriptet ikke har noen. */
export function medOyeblikksbilde(skript: string, bilde: string): string {
  if (!/^[0-9A-F]+-[0-9A-F]+-\d+$/i.test(bilde)) throw new Stopp(`Ugyldig øyeblikksbilde: ${bilde}`)
  let antall = 0
  const ut = skript.replace(/^pg_dump \\$/gm, () => {
    antall++
    return `pg_dump --snapshot "${bilde}" \\`
  })
  if (!antall) throw new Stopp('Fant ingen pg_dump i skriptet fra Supabase-CLI-en; den kan ha endret seg.')
  return ut
}

/**
 * Kjører et dumpskript og strømmer det til fila. `pg_dump` må ha minst
 * serverens hovedversjon; har maskinen ingen slik, kjøres skriptet i
 * Postgres-bildet i `KOPI_PG_BILDE` (Docker, vertsnettet).
 */
export async function kjorDumpskript(skript: string, fil: string): Promise<void> {
  const bilde = process.env.KOPI_PG_BILDE
  const ut = openSync(fil, 'w', 0o600)
  try {
    // Uten passord i adressen setter CLI-en et tomt `PGPASSWORD`; da gjelder det i miljøet (den midlertidige rollen, prosjekt.ts).
    const kjores = skript.replace(/^export PGPASSWORD=""\n/m, '')
    const miljo = ['PGPASSWORD', 'PGSSLMODE'].filter((n) => process.env[n]).flatMap((n) => ['-e', n])
    const prosess = bilde
      ? spawn('docker', ['run', '--rm', '-i', '--network', 'host', ...miljo, '--entrypoint', 'bash', bilde, '-s'], { stdio: ['pipe', ut, 'pipe'] })
      : spawn('bash', ['-s'], { stdio: ['pipe', ut, 'pipe'] })
    prosess.stdin!.end(kjores)
    await ferdig(prosess, 'pg_dump')
  } finally {
    closeSync(ut)
  }
}

/** Venter til prosessen er ferdig, og stopper med feilmeldingen dens hvis den ikke lyktes. */
function ferdig(p: ChildProcess, navn: string): Promise<void> {
  let feil = ''
  p.stderr?.on('data', (d: Buffer) => (feil = (feil + d.toString()).slice(-4000)))
  return new Promise((ok, avvis) => {
    p.once('error', (e) => avvis(new Stopp(`${navn}: ${e.message}`)))
    p.once('close', (kode) => (kode === 0 ? ok() : avvis(new Stopp(`${navn} feilet (${kode}): ${feil.trim()}`))))
  })
}

// --- Pakking og kryptering, strømmet ------------------------------------------

/**
 * Pakker mappen med `tar` og sender strømmen rett videre til `krypter`
 * (som `age -r <nøkkel>`), som skriver til fila. Ingenting av kopien går
 * gjennom Node.
 */
export async function pakk(mappe: string, fil: string, krypter: readonly string[]): Promise<void> {
  const ut = openSync(fil, 'w', 0o600)
  try {
    await ror(['tar', '-C', mappe, '-cf', '-', '.'], krypter, ['ignore', ut])
  } finally {
    closeSync(ut)
  }
}

/** Det motsatte av {@link pakk}: `dekrypter` (som `age -d -i <fil>`) leser fila, og `tar` pakker ut i mappen. */
export async function pakkUt(fil: string, mappe: string, dekrypter: readonly string[]): Promise<void> {
  if (!existsSync(fil)) throw new Stopp(`Kopien ${fil} finnes ikke.`)
  await ror([...dekrypter, fil], ['tar', '-C', mappe, '-xf', '-'], ['ignore', 'ignore'])
}

/**
 * `forste | andre` som en rørledning i operativsystemet: den andre arver den
 * første sin utgang direkte, og Node slipper sin ende av røret, så ingenting
 * av strømmen går gjennom Node. Stopper hvis en av dem feiler.
 */
async function ror(forste: readonly string[], andre: readonly string[], [inn, ut]: ['ignore', 'ignore' | number]): Promise<void> {
  const a = spawn(forste[0]!, forste.slice(1), { stdio: [inn, 'pipe', 'pipe'] })
  const b = spawn(andre[0]!, andre.slice(1), { stdio: [a.stdout!, ut, 'pipe'] })
  a.stdout!.destroy()
  await Promise.all([ferdig(a, forste[0]!), ferdig(b, andre[0]!)])
}

/** sha256 av en fil, lest i biter. */
export function filsum(fil: string): Promise<string> {
  return new Promise((ok, avvis) => {
    const h = createHash('sha256')
    createReadStream(fil).on('data', (d) => h.update(d)).on('end', () => ok(h.digest('hex'))).on('error', avvis)
  })
}

/** sha256 av hver fil under mappen, med stien relativ til den. */
async function innholdssummer(mappe: string, under = ''): Promise<Record<string, string>> {
  const ut: Record<string, string> = {}
  for (const navn of readdirSync(join(mappe, under)).sort()) {
    const rel = under ? `${under}/${navn}` : navn
    if (statSync(join(mappe, rel)).isDirectory()) Object.assign(ut, await innholdssummer(mappe, rel))
    else ut[rel] = await filsum(join(mappe, rel))
  }
  return ut
}

// --- Storage ------------------------------------------------------------------

const lagringsklient = (apiUrl: string, nokkel: string) =>
  createClient(apiUrl, nokkel, { auth: { autoRefreshToken: false, persistSession: false } }).storage

const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

export interface Lagret {
  bucket: string
  navn: string
  type: string | null
  storrelse: string | null
  etag: string | null
  /** Storage gir hver opplasting en ny versjon, og innholdet til en versjon endres aldri. */
  versjon: string | null
}

const lagredeObjekter = (dbUrl: string, bilde?: string) =>
  sporring<Lagret>(
    dbUrl,
    `select bucket_id as bucket, name as navn, metadata->>'mimetype' as type,
       metadata->>'size' as storrelse, metadata->>'eTag' as etag, version as versjon
     from storage.objects order by 1, 2`,
    bilde,
  )

const md5Av = (etag: string | null) => /^"?([0-9a-f]{32})"?$/i.exec(etag ?? '')?.[1]?.toLowerCase()

/**
 * Om det hentede innholdet sikkert er det øyeblikksbildet beskriver, ut fra
 * raden i bildet og raden slik den er etter at filene er hentet (`naa`).
 *
 * - Med en versjon i bildet må raden ha den samme versjonen etterpå. Storage
 *   gir hver opplasting en ny versjon og serverer innholdet til den versjonen
 *   raden har, så da er det hentede innholdet versjonen i bildet, uansett hva
 *   eTagen er.
 * - Uten versjon må eTagen være innholdets md5, og raden den samme etterpå.
 * - Har raden ingen av delene, kan innholdet ikke knyttes til bildet, og
 *   kopien stopper i stedet for å godta det.
 *
 * Gir `null` når innholdet er riktig, og ellers hva som er galt.
 */
export function kontrollerFil(
  o: Pick<Lagret, 'storrelse' | 'etag' | 'versjon'>,
  innhold: Uint8Array,
  naa: Pick<Lagret, 'etag' | 'versjon'> | undefined,
): { endret: string } | { upalitelig: string } | null {
  const md5 = md5Av(o.etag)
  if (!o.versjon && !md5) return { upalitelig: 'Storage har verken versjon eller md5-sum for den' }
  if (!naa) return { endret: 'fjernet underveis' }
  if (naa.versjon !== o.versjon || naa.etag !== o.etag) return { endret: 'byttet etter øyeblikksbildet' }
  if (o.storrelse !== null && Number(o.storrelse) !== innhold.length) return { endret: 'har en annen størrelse enn i øyeblikksbildet' }
  if (md5 && createHash('md5').update(innhold).digest('hex') !== md5) return { endret: 'har et annet innhold enn i øyeblikksbildet' }
  return null
}

/**
 * Filene øyeblikksbildet har, hentet fra Storage og kontrollert mot det
 * ({@link kontrollerFil}). Er en endret eller borte, er kilden {@link Endret};
 * kan en ikke knyttes til bildet, stopper kopien.
 */
async function hentFiler(dbUrl: string, bilde: string, apiUrl: string, nokkel: string, mappe: string): Promise<Fil[]> {
  const lager = lagringsklient(apiUrl, nokkel)
  const iBildet = lagredeObjekter(dbUrl, bilde)
  const hentet: { o: Lagret; innhold: Uint8Array }[] = []
  for (const o of iBildet) {
    const { data, error } = await lager.from(o.bucket).download(o.navn)
    if (error) throw new Endret(`${o.bucket}/${o.navn} kunne ikke hentes (${error.message}); den kan være fjernet underveis`)
    const innhold = new Uint8Array(await data.arrayBuffer())
    const sti = join(mappe, 'filer', o.bucket, o.navn)
    mkdirSync(dirname(sti), { recursive: true })
    writeFileSync(sti, innhold)
    hentet.push({ o, innhold })
  }
  // Radene slik de er nå, etter at alt er hentet: en opplasting underveis har gitt en ny versjon.
  const naa = new Map(lagredeObjekter(dbUrl).map((o) => [`${o.bucket}/${o.navn}`, o]))
  return hentet.map(({ o, innhold }) => {
    const feil = kontrollerFil(o, innhold, naa.get(`${o.bucket}/${o.navn}`))
    if (feil && 'upalitelig' in feil) throw new Stopp(`${o.bucket}/${o.navn} kan ikke knyttes sikkert til kopipunktet: ${feil.upalitelig}.`)
    if (feil) throw new Endret(`${o.bucket}/${o.navn} er ${feil.endret}`)
    return { bucket: o.bucket, navn: o.navn, bytes: innhold.length, sha256: sha256(innhold) }
  })
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
  /** Prosjekt og token for Auth-innstillingene og navnene på hemmelighetene; med prosjekt kreves token. */
  prosjekt?: string
  token?: string
  /**
   * En privat `age`-nøkkel kopien prøves med etter krypteringen: den pakkes ut
   * igjen og hver fil sammenlignes med det som ble pakket. Uten den kontrolleres
   * bare at pakkingen og krypteringen lyktes.
   */
  kontrollnokkel?: string
  /**
   * Den private Ed25519-nøkkelen (PEM) kopien signeres med. Gjenopprettingen
   * krever signaturen, kontrollert mot den offentlige nøkkelen.
   */
  signeringsnokkel: string
  /**
   * Bitene kopilageret alt har, etter identiteten, fra innholdslisten til
   * forrige kopi (signaturen). De hentes ikke på nytt; den nye kopien viser
   * til dem med de samme summene.
   */
  kjente?: ReadonlyMap<string, Delfil>
  /** Kalles i hvert forsøk etter dumpene og før filene hentes. Bare for prøvene. */
  underveis?: (forsok: number) => Promise<void>
  /** Høyst så mange forsøk når kilden endres underveis. Standard 3. */
  forsok?: number
}

export interface Kopi {
  fil: string
  /** Signaturen, `<fil>.sig`. */
  signatur: string
  /** Kopipunktet, som i manifestet og signaturen. */
  laget: string
  forsok: number
  /** Alle bitene kopien består av, også de lageret alt har. */
  deler: Delfil[]
  /** Identitetene til bitene som er nye i denne kopien; filene ligger i `<ut>/deler/`. */
  nye: string[]
  /** Omtrent hvor mange byte som ble hentet ut av databasen og Storage (for kvoten). */
  hentet: number
}

/** Mappen bitene ligger i, ved siden av kopien, og fila til én bit. */
export const delmappe = (ut: string) => join(ut, 'deler')
export const delfil = (ut: string, identitet: string) => join(delmappe(ut), `${identitet}.age`)

export async function taKopi(valg: TaValg): Promise<Kopi> {
  if (!valg.mottakere.length) throw new Stopp('Kopien må krypteres: oppgi minst én mottaker (offentlig age-nøkkel).')
  // En kopi uten Auth-innstillingene og navnene på hemmelighetene er ufullstendig: den skal ikke se vellykket ut.
  if (valg.prosjekt && !valg.token) throw new Stopp('Med --prosjekt kreves SUPABASE_ACCESS_TOKEN, for Auth-innstillingene og navnene på hemmelighetene.')
  // En nøkkel som ikke kan signere, skal stoppe kopien før den tas, ikke etter.
  signer('kontroll', '', '', valg.signeringsnokkel)
  const maks = valg.forsok ?? 3
  for (let forsok = 1; ; forsok++) {
    try {
      return { ...(await taEttForsok(valg, forsok)), forsok }
    } catch (e) {
      if (!(e instanceof Endret) || forsok >= maks) {
        if (e instanceof Endret) throw new Stopp(`Kilden ble endret under alle ${maks} forsøkene: ${e.message}. Ingen kopi er lagret.`)
        throw e
      }
      logg(`forsøk ${forsok} forkastet: ${e.message}; prøver på nytt`)
    }
  }
}

/** Summene til en kryptert fil, lest i én omgang. */
export function summerAv(fil: string): Promise<{ sha256: string; md5: string; bytes: number }> {
  return new Promise((ok, avvis) => {
    const s = createHash('sha256')
    const m = createHash('md5')
    let bytes = 0
    createReadStream(fil)
      .on('data', (d) => {
        s.update(d)
        m.update(d)
        bytes += d.length
      })
      .on('end', () => ok({ sha256: s.digest('hex'), md5: m.digest('hex'), bytes }))
      .on('error', avvis)
  })
}

/** Antall linjeskift i en fil, lest som strøm. */
async function tellLinjer(fil: string): Promise<number> {
  let n = 0
  for await (const d of createReadStream(fil) as AsyncIterable<Buffer>) for (let i = d.indexOf(10); i >= 0; i = d.indexOf(10, i + 1)) n++
  return n
}

/**
 * Henter de nye bitene i øyeblikksbildet til hver sin fil i en privat mappe,
 * krypterer hver til `<ut>/deler/<identitet>.age` og sletter den ukrypterte.
 * Gir summene til de krypterte filene.
 */
async function hentBiter(dbUrl: string, bilde: string, nye: readonly { t: DeltTabell; b: Bit }[], ut: string, mottakere: readonly string[], skrevet: string[]): Promise<Map<string, Delfil>> {
  const resultat = new Map<string, Delfil>()
  if (!nye.length) return resultat
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-deler-'))
  chmodSync(mappe, 0o700)
  try {
    const filer = nye.map((n, i) => ({ ...n, fil: join(mappe, `${i}.copy`) }))
    await new Promise<void>((ok, avvis) => {
      const p = spawn('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl], { stdio: ['pipe', 'ignore', 'pipe'] })
      ferdig(p, 'psql (bitene)').then(ok, avvis)
      p.stdin!.end(henteskript(bilde, filer))
    })
    mkdirSync(delmappe(ut), { recursive: true, mode: 0o700 })
    for (const { t, b, fil } of filer) {
      // COPY skriver én linje per rad (linjeskift i verdiene skrives som \n), så linjene skal være radene i planen.
      const linjer = await tellLinjer(fil)
      if (linjer !== Number(b.rader)) throw new Stopp(`En bit i ${t.tabell} fikk ${linjer} rader, men planen har ${b.rader}.`)
      const kryptert = delfil(ut, b.identitet)
      skrevet.push(kryptert)
      execFileSync('age', [...mottakere.flatMap((m) => ['-r', m]), '-o', kryptert, fil], { stdio: ['ignore', 'ignore', 'pipe'] })
      rmSync(fil)
      resultat.set(b.identitet, { identitet: b.identitet, ...(await summerAv(kryptert)) })
    }
    return resultat
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

/** Fremmednøklene fra en tabell som tas med, til en som er utelatt (`liste` er en SQL-tabell med navnene). */
export const utelattReferanseSql = (liste: string) => /* sql */ `
  select distinct fn.nspname || '.' || f.relname as fra, tn.nspname || '.' || t.relname as til
  from pg_constraint c
  join pg_class f on f.oid = c.conrelid join pg_namespace fn on fn.oid = f.relnamespace
  join pg_class t on t.oid = c.confrelid join pg_namespace tn on tn.oid = t.relnamespace
  where c.contype = 'f'
    and tn.nspname || '.' || t.relname = any (${liste})
    and fn.nspname || '.' || f.relname <> all (${liste})
`

/** Stopper hvis en utelatt tabell ikke finnes: da er den omdøpt eller fjernet, og unntaket må følge med. */
function krevUtelatte(dbUrl: string, bilde: string): string[] {
  const navn = Object.keys(UTELATTE_TABELLER)
  const mangler = sporring<{ tabell: string; finnes: boolean }>(
    dbUrl,
    navn.map((t) => `select '${t}' as tabell, to_regclass('${t}') is not null as finnes`).join(' union all '),
    bilde,
  ).filter((r) => !r.finnes)
  if (mangler.length) {
    throw new Stopp(`Tabellene som ikke skal være med i kopien, finnes ikke: ${mangler.map((r) => r.tabell).join(', ')}. Oppdater UTELATTE_TABELLER før en kopi tas.`)
  }
  const liste = `array[${navn.map((t) => `'${t}'`).join(', ')}]::text[]`
  const avhengige = sporring<{ fra: string; til: string }>(dbUrl, utelattReferanseSql(liste), bilde)
  if (avhengige.length) {
    throw new Stopp(`Tabeller i kopien viser til tabeller som ikke er med: ${avhengige.map((r) => `${r.fra} → ${r.til}`).join(', ')}. Utelat dem også, eller ta med den de viser til.`)
  }
  return navn
}

async function taEttForsok(valg: TaValg, forsok: number): Promise<Omit<Kopi, 'forsok'>> {
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-kopi-'))
  chmodSync(mappe, 0o700)
  const bilde = await holdOyeblikksbilde(valg.dbUrl)
  let fil: string | undefined
  const skrevet: string[] = []
  try {
    // Tilpasningene, dekningen og alt som skrives, leses i det samme øyeblikksbildet.
    const kilde = fingeravtrykk(valg.dbUrl, bilde.navn)
    const f = forskjell(kilde, valg.referanse)
    const feil = avvik(f)
    if (feil.length) throw new Stopp(`Tilpasningene kan ikke skilles ut mot referansen:\n- ${feil.join('\n- ')}`)
    const fraMigrasjoner = objekterFraMigrasjoner(
      readdirSync(valg.migrasjoner).filter((n) => n.endsWith('.sql')).sort().map((n) => readFileSync(join(valg.migrasjoner, n), 'utf8')),
    )
    const mangler = manglendeDekning(f.tilpasninger, fraMigrasjoner)
    if (mangler.length) throw new Stopp(`Objekter fra migrasjonene finnes ikke blant tilpasningene: ${mangler.join(', ')}`)

    const utelatt = krevUtelatte(valg.dbUrl, bilde.navn)
    const delte = sporring<DeltTabell>(valg.dbUrl, delteTabellerSql(EGNE_SKJEMAER_SQL, utelatt), bilde.navn)

    logg(`forsøk ${forsok}: tar struktur, data og historikk i øyeblikksbildet ${bilde.navn}`)
    const dump = (navn: string, ...v: string[]) => kjorDumpskript(dumpskript(valg.dbUrl, bilde.navn, v), join(mappe, navn))
    // Rollefila tas med som dokumentasjon; den kjøres ikke ved gjenoppretting (se gjenopprett()).
    // Skriptet CLI-en ville kjørt, kjørt her som de andre, så det ikke trengs et eget bilde; rollene er ikke i øyeblikksbildet.
    await kjorDumpskript(
      execFileSync('npx', [...SUPABASE_CLI, 'db', 'dump', '--db-url', valg.dbUrl, '--dry-run', '--role-only'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }),
      join(mappe, 'roller.sql'),
    )
    await dump('struktur.sql')
    // De delte tabellene ligger i bitene, de utelatte er ikke med i det hele tatt.
    const utenfor = [...utenSkrivetilgang(valg.dbUrl), ...utelatt, ...delte.map((t) => t.tabell)]
    await dump('data.sql', '--data-only', '--use-copy', ...utenfor.flatMap((t) => ['-x', t]))
    await dump('historikk_struktur.sql', '--schema', 'supabase_migrations')
    await dump('historikk_data.sql', '--data-only', '--use-copy', '--schema', 'supabase_migrations')
    writeFileSync(join(mappe, 'tilpasninger.sql'), tilpasningsskript(f.tilpasninger))
    logg(`${f.tilpasninger.length} tilpasninger i auth, storage og på rollene`)

    // Bitene: identitetene regnes ut i databasen, og bare de nye hentes.
    const plan = delte.flatMap((t) => sporring<Bit>(valg.dbUrl, delplanSql(t), bilde.navn).map((b) => ({ t, b })))
    const kjente = valg.kjente ?? new Map<string, Delfil>()
    const nye = nyeBiter(plan.map((p) => ({ ...p, identitet: p.b.identitet })), new Set(kjente.keys()))
    logg(`${plan.length} biter i ${delte.length} tabeller; ${nye.length} nye, ${plan.length - nye.length} finnes alt i lageret`)
    const hentetBiter = await hentBiter(valg.dbUrl, bilde.navn, nye, valg.ut, valg.mottakere, skrevet)
    const deler = [...new Map(plan.map(({ b }) => [b.identitet, hentetBiter.get(b.identitet) ?? kjente.get(b.identitet)!])).values()]
    const sekvensnavn = [...new Set(delte.flatMap((t) => t.sekvenser))]
    const sekvenser = sekvensnavn.length ? sporring<Sekvens>(valg.dbUrl, sekvensnavn.map(sekvensSql).join(' union all '), bilde.navn) : []

    const tabeller = tabellsummer(valg.dbUrl, bilde.navn, utelatt)
    const krypterteFaktorer = sporring(valg.dbUrl, KRYPTERTE_FAKTORER_SQL, bilde.navn).length
    if (krypterteFaktorer) logg(`${krypterteFaktorer} tofaktornøkler er kryptert av plattformen og må meldes inn på nytt etter en gjenoppretting`)

    await valg.underveis?.(forsok)
    logg('henter filene i Storage')
    const filer = await hentFiler(valg.dbUrl, bilde.navn, valg.apiUrl, valg.nokkel, mappe)

    let hemmeligheter: string[] = []
    if (valg.prosjekt) {
      const innstillinger = (await managementApi(valg.prosjekt, '/config/auth', valg.token!)) as Record<string, unknown>
      writeFileSync(
        join(mappe, 'auth-innstillinger.json'),
        JSON.stringify(Object.fromEntries(Object.entries(innstillinger).filter(([k]) => !HEMMELIG.test(k))), null, 2),
      )
      hemmeligheter = ((await managementApi(valg.prosjekt, '/secrets', valg.token!)) as { name: string }[]).map((s) => s.name).sort()
    }

    const manifest: Manifest & { referanse: Fingeravtrykk; tilpasninger: Objekt[]; oyeblikksbilde: string; forsok: number } = {
      laget: new Date().toISOString(),
      kilde: new URL(valg.apiUrl).host,
      versjoner: kilde.versjoner as Record<string, string | null>,
      tabeller,
      filer,
      hemmeligheter,
      krypterteFaktorer,
      referanse: valg.referanse,
      tilpasninger: f.tilpasninger,
      oyeblikksbilde: bilde.navn,
      forsok,
      utelatt,
      deler: plan.map(({ t, b }) => ({ tabell: t.tabell, kolonner: t.kolonner, nr: b.nr, rader: Number(b.rader), identitet: b.identitet })),
      sekvenser,
    }
    writeFileSync(join(mappe, 'manifest.json'), JSON.stringify(manifest, null, 2))
    const pakket = await innholdssummer(mappe)

    mkdirSync(valg.ut, { recursive: true })
    fil = resolve(valg.ut, `ousfar-kopi-${manifest.laget.replaceAll(/[:.]/g, '-')}.tar.age`)
    await pakk(mappe, fil, ['age', ...valg.mottakere.flatMap((m) => ['-r', m])])
    if (!statSync(fil).size) throw new Stopp('Den krypterte kopien er tom.')
    if (valg.kontrollnokkel) await provArkivet(fil, valg.kontrollnokkel, pakket)
    const summer = await summerAv(fil)
    writeFileSync(`${fil}.sig`, JSON.stringify(signer(basename(fil), summer.sha256, manifest.laget, valg.signeringsnokkel, { md5: summer.md5, bytes: summer.bytes, deler }), null, 2))
    logg(`kopien er kryptert${valg.kontrollnokkel ? ' og prøvd' : ''}: ${fil} (${tabeller.length} tabeller, ${deler.length} biter, ${filer.length} filer)`)
    const ukryptert = (n: string) => (existsSync(join(mappe, n)) ? statSync(join(mappe, n)).size : 0)
    const hentet =
      ['struktur.sql', 'data.sql', 'historikk_struktur.sql', 'historikk_data.sql'].reduce((sum, n) => sum + ukryptert(n), 0) +
      nye.reduce((sum, n) => sum + Number(n.b.bytes), 0) +
      filer.reduce((sum, f) => sum + f.bytes, 0)
    return { fil, signatur: `${fil}.sig`, laget: manifest.laget, deler, nye: [...hentetBiter.keys()], hentet }
  } catch (e) {
    // En kopi som ikke ble ferdig, blir ikke liggende, heller ikke bitene den hentet.
    if (fil) for (const f of [fil, `${fil}.sig`]) rmSync(f, { force: true })
    for (const f of skrevet) rmSync(f, { force: true })
    throw e
  } finally {
    await bilde.slipp()
    rmSync(mappe, { recursive: true, force: true })
  }
}

/** Pakker ut den krypterte kopien og krever at hver fil er lik den som ble pakket. */
async function provArkivet(fil: string, identitet: string, pakket: Record<string, string>): Promise<void> {
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-kopiprove-'))
  chmodSync(mappe, 0o700)
  try {
    await pakkUt(fil, mappe, ['age', '-d', '-i', identitet])
    const utpakket = await innholdssummer(mappe)
    const ulike = [...new Set([...Object.keys(pakket), ...Object.keys(utpakket)])].filter((n) => pakket[n] !== utpakket[n])
    if (ulike.length) throw new Stopp(`Den krypterte kopien er ikke lik det som ble pakket: ${ulike.slice(0, 5).join(', ')}`)
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

// --- Å gjenopprette -----------------------------------------------------------

export interface GjenopprettValg {
  kopi: string
  /** Fila med den private `age`-nøkkelen. */
  identitet: string
  /**
   * Den offentlige Ed25519-nøkkelen (PEM) til kopijobben, fra et sted
   * utenfor kopilageret. Kopien gjenopprettes bare med en gyldig signatur fra den.
   */
  avsender: string
  /** Signaturfila; standard `<kopi>.sig`. */
  signatur?: string
  /** Mappen med bitene (`<identitet>.age`); standard `deler/` ved siden av kopien. */
  deler?: string
  dbUrl: string
  apiUrl: string
  /** Hemmelig nøkkel (service role) for Storage i målet. */
  nokkel: string
  /**
   * Hva som gjøres med tofaktornøkler plattformen har kryptert (se
   * `KRYPTERTE_FAKTORER_SQL`). `stopp` (standard): gjenopprettingen begynner
   * ikke. `fjern`: faktorene fjernes etter kontrollen, og brukerne listes; de
   * logger inn med passordet og melder inn tofaktor på nytt.
   */
  krypterteFaktorer?: 'stopp' | 'fjern'
}

export interface Resultat {
  sekunder: number
  avvik: string[]
  /** Brukerne som fikk tofaktorfaktoren fjernet og må melde den inn på nytt. */
  fjernedeFaktorer: string[]
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
    // Hvem som laget kopien, kontrolleres på en egen kopi av fila før den åpnes, så den ikke kan byttes underveis.
    if (!existsSync(valg.kopi)) throw new Stopp(`Kopien ${valg.kopi} finnes ikke.`)
    const kopi = join(mappe, 'kopi.tar.age')
    copyFileSync(valg.kopi, kopi)
    const sigFil = valg.signatur ?? `${valg.kopi}.sig`
    if (!existsSync(sigFil)) throw new Stopp(`Signaturen ${sigFil} finnes ikke. Ingenting er gjenopprettet.`)
    let sig: unknown
    try {
      sig = JSON.parse(readFileSync(sigFil, 'utf8'))
    } catch {
      sig = null
    }
    const signert = verifiser(sig, basename(valg.kopi), await filsum(kopi), valg.avsender)
    logg(`signaturen er gyldig: kopien ble laget ${signert.laget} av kopijobben`)
    // Bitene kopieres og kontrolleres mot signaturen før noe dekrypteres.
    const biter = join(mappe, 'biter')
    mkdirSync(biter, { mode: 0o700 })
    const fra = valg.deler ?? delmappe(dirname(valg.kopi))
    for (const d of signert.deler ?? []) {
      const kilde = join(fra, `${d.identitet}.age`)
      if (!existsSync(kilde)) throw new Stopp(`Biten ${d.identitet} mangler i ${fra}. Ingenting er gjenopprettet.`)
      copyFileSync(kilde, join(biter, `${d.identitet}.age`))
      const sum = await summerAv(join(biter, `${d.identitet}.age`))
      if (sum.sha256 !== d.sha256 || sum.bytes !== d.bytes) throw new Stopp(`Biten ${d.identitet} er ikke den som ble signert. Ingenting er gjenopprettet.`)
    }
    const innhold = join(mappe, 'innhold')
    mkdirSync(innhold, { mode: 0o700 })
    await pakkUt(kopi, innhold, ['age', '-d', '-i', valg.identitet])
    rmSync(kopi)
    const manifest = JSON.parse(readFileSync(join(innhold, 'manifest.json'), 'utf8')) as Manifest & {
      referanse: Fingeravtrykk
      tilpasninger: Objekt[]
    }
    const iManifestet = [...new Set((manifest.deler ?? []).map((d) => d.identitet))].sort()
    const iSignaturen = (signert.deler ?? []).map((d) => d.identitet).sort()
    if (iManifestet.join() !== iSignaturen.join()) throw new Stopp('Bitene i manifestet er ikke de signaturen lister. Ingenting er gjenopprettet.')

    const krypterte = manifest.krypterteFaktorer ?? 0
    if (krypterte && valg.krypterteFaktorer !== 'fjern') {
      throw new Stopp(
        `Kopien har ${krypterte} tofaktornøkler plattformen har kryptert, og de kan ikke leses i et nytt prosjekt. ` +
          'Gjenopprett med --fjern-krypterte-faktorer: faktorene fjernes etter kontrollen, og brukerne melder inn tofaktor på nytt.',
      )
    }

    await ventPaTjenestene(valg.apiUrl, valg.nokkel)
    // Målet må være en ren Supabase med de samme versjonene og plattformobjektene som referansen.
    const egne = harEgneData(valg.dbUrl)
    if (egne.length) throw new Stopp(`Målet er ikke tomt (${egne.slice(0, 5).join(', ')}). Gjenopprett bare til et nytt prosjekt.`)
    const forMal = avvik(forskjell(fingeravtrykk(valg.dbUrl), manifest.referanse))
    if (forMal.length) throw new Stopp(`Målet er ikke likt referansen:\n- ${forMal.join('\n- ')}`)

    logg('legger inn roller, struktur og data')
    const fil = (n: string) => join(innhold, n)
    // `roller.sql` kjøres ikke: den har bare Supabases egne innstillinger, som
    // målet alt har. OUSFARs endringer på rollene er blant tilpasningene.
    // Bitene dekrypteres til hver sin fil og legges inn etter data.sql, i den samme transaksjonen.
    const lagt = (manifest.deler ?? []).map((d) => ({ ...d, fil: join(biter, `${d.identitet}.${d.tabell}.${d.nr}.copy`) }))
    for (const d of lagt) execFileSync('age', ['-d', '-i', valg.identitet, '-o', d.fil, join(biter, `${d.identitet}.age`)], { stdio: ['ignore', 'ignore', 'pipe'] })
    writeFileSync(join(biter, 'deler.sql'), tilbakeskript(lagt, manifest.sekvenser ?? []))
    psql(valg.dbUrl, [
      '--single-transaction',
      '-f', fil('struktur.sql'),
      '-c', 'set session_replication_role = replica',
      '-f', fil('data.sql'),
      '-f', join(biter, 'deler.sql'),
    ])
    logg('legger inn tilpasningene i auth og storage')
    psql(valg.dbUrl, ['-f', fil('tilpasninger.sql')])
    logg('legger inn migrasjonshistorikken')
    psql(valg.dbUrl, ['--single-transaction', '-f', fil('historikk_struktur.sql'), '-f', fil('historikk_data.sql')])
    logg('legger tilbake filene i Storage')
    await leggTilbakeFiler(manifest, valg.dbUrl, valg.apiUrl, valg.nokkel, innhold)

    const resultat = kontroller(manifest, valg, await filsummer(manifest, valg.apiUrl, valg.nokkel))
    // Faktorene fjernes først når det gjenopprettede er kontrollert likt kilden.
    let fjernedeFaktorer: string[] = []
    const krypterteIMalet = resultat.length ? [] : sporring<{ id: string; bruker: string }>(valg.dbUrl, KRYPTERTE_FAKTORER_SQL)
    if (krypterteIMalet.length && valg.krypterteFaktorer === 'fjern') fjernedeFaktorer = fjernFaktorer(valg.dbUrl, krypterteIMalet)
    else if (krypterteIMalet.length) resultat.push(`${krypterteIMalet.length} tofaktornøkler i målet er kryptert av plattformen og kan ikke leses`)
    return { sekunder: Math.round((Date.now() - start) / 1000), avvik: resultat, fjernedeFaktorer }
  } finally {
    rmSync(mappe, { recursive: true, force: true })
  }
}

/** Fjerner faktorene (utfordringene deres følger med) og gir brukerne, som melder inn tofaktor på nytt. */
function fjernFaktorer(dbUrl: string, krypterte: readonly { id: string; bruker: string }[]): string[] {
  const ider = krypterte.map((f) => `'${f.id.replaceAll("'", '')}'::uuid`).join(', ')
  psql(dbUrl, ['-c', `delete from auth.mfa_factors where id in (${ider})`])
  logg(`fjernet ${krypterte.length} tofaktorfaktorer plattformen hadde kryptert; brukerne melder dem inn på nytt`)
  return [...new Set(krypterte.map((f) => f.bruker))]
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
