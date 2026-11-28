/**
 * Gjenopprettingsprøven i det lokale testmiljøet, med syntetiske brukere
 * (`docs/drift-gjenoppretting.md`, tiltak 2 i `docs/s4-pilotplan.md`):
 *
 *   npm run sikkerhetskopi:prove
 *
 * 1. En ren Supabase i Docker (uten OUSFARs migrasjoner) gir referansen.
 * 2. Den samme med migrasjonene er kilden: en syntetisk administrator med
 *    tofaktor og en syntetisk bruker med profilbilde legges inn, og kopien tas
 *    og krypteres. Brukeren får dessuten en tofaktorfaktor slik Auth lagrer
 *    den når plattformen krypterer nøklene, som ikke kan leses i et nytt prosjekt.
 *    Mens kopien tas, skriver en egen tilkobling hele tiden til to tabeller i
 *    samme transaksjon, og i første forsøk byttes profilbildet etter at
 *    databasen er lest: forsøket skal forkastes og kopien tas på nytt.
 *    Før kopien tas, får profilbildet en eTag som ikke er en md5-sum, så bare
 *    versjonen i Storage kan avsløre byttet.
 * 3. Databasen slettes, og en ny, ren Supabase startes. To forfalskede kopier,
 *    kryptert til den samme mottakeren, skal avvises uten at målet røres. Så
 *    gjenopprettes den ekte.
 * 4. Prøven kontrollerer punktene i §3.2: like tabeller, filer og
 *    tilpasninger; administratoren logger inn med sitt gamle passord; en ny
 *    bruker opprettes gjennom adminflyten (Edge-funksjonen `opprett-bruker`) og får profil og
 *    medlemskap; en bruker uten myndighet avvises; profilbildereglene holder;
 *    og skrivingen under kopieringen ga ett sammenhengende kopipunkt.
 * 5. Nattens kopi slik GitHub-jobben tar den (`kjorNatt`), mot et falskt
 *    lager med versjoner og Object Lock, fire «netter» med klokka spolt fram:
 *    den første kopien, en ny der bare biten med en endret rad hentes, en
 *    etter at mottakernøkkelen er byttet (alt krypteres på nytt), og en
 *    etter oppbevaringstiden, som rydder bort kopiene med den gamle nøkkelen.
 *    Kopiene hentes fra lageret og gjenopprettes hver i sin nye, rene
 *    Supabase, den siste med bare den nye nøkkelen og etter oppryddingen.
 *    Kilden har en direktemelding med en kjent tekst: den finnes ikke i noe
 *    kopien har (alt dekrypteres og letes gjennom), mens samtalen,
 *    lest-statusen, valgene og blokkeringen står etter gjenopprettingen.
 *    Den midlertidige innloggingsrollen (`cli_login_…`) blir ikke en tilpasning.
 *
 * Ingen produksjonsdata er med. Alt ligger i en midlertidig mappe som
 * slettes, og databasen stoppes uten å lagre noe.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFileSync, spawn } from 'node:child_process'
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { internAuthAdresse } from '@delt/brukernavn'
import { genererMidlertidigPassord } from '@delt/passord'
import { SUPABASE_CLI } from '../src/drift/supabaseCli'
import { Stopp, fingeravtrykk, filsum, gjenopprett, lagReferanse, pakk, summerAv, taKopi, ventPaTjenestene } from '../src/drift/sikkerhetskopi/kopi'
import { lagSigneringsnokler, signer } from '../src/drift/sikkerhetskopi/signatur'
import { forskjell } from '../src/drift/sikkerhetskopi/tilpasninger'
import { kjorNatt, type Nattrapport } from '../src/drift/sikkerhetskopi/natt'
import { hentKopi, lesLageret, tilsyn } from '../src/drift/sikkerhetskopi/lager'
import { S3 } from '../src/drift/sikkerhetskopi/s3'
import { FalskS3 } from '../src/__tests__/hjelp/falskS3'
import { lokaltOppsett, sikreDocker, UTELATT, valgteMigrasjoner } from '../src/__tests__/qa/lokalmiljo'

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MAPPE = mkdtempSync(join(tmpdir(), 'ousfar-kopiprove-'))
const MILJO = join(MAPPE, 'miljo')
/** Edge-funksjonene trengs i prøven; resten av tjenestene appen ikke bruker, startes ikke. */
const UTEN = UTELATT.split(',').filter((t) => t !== 'edge-runtime').join(',')

const logg = (tekst: string) => console.log(`[gjenopprettingsprøve] ${tekst}`)
const supabase = (...a: string[]) =>
  execFileSync('npx', [...SUPABASE_CLI, ...a, '--workdir', MILJO], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })

interface Status {
  API_URL: string
  DB_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
}

/**
 * Prosjektets oppsett for prøven. Uten migrasjoner er miljøet en ren
 * Supabase, slik et nytt prosjekt er: da tas bøttene i oppsettet bort, siden
 * CLI-en ellers lager dem ved oppstart, og de kommer fra kopien.
 */
function oppsett(ren: boolean): string {
  let seksjon = ''
  const tekst = lokaltOppsett(readFileSync(join(REPO, 'supabase/config.toml'), 'utf8'))
    .replace(/^project_id\s*=.*$/m, 'project_id = "ousfar-kopiprove"')
    .split('\n')
    .filter((linje) => {
      seksjon = /^\s*\[([^\]]+)\]/.exec(linje)?.[1] ?? seksjon
      return !(ren && seksjon.startsWith('storage.buckets'))
    })
    .join('\n')
  // Tofaktor med autentiseringsapp, som i produksjonen, når oppsettet ikke sier noe om det.
  return /^\[auth\.mfa\.totp\]/m.test(tekst) ? tekst : `${tekst}\n[auth.mfa.totp]\nenroll_enabled = true\nverify_enabled = true\n`
}

/** Starter en ren Supabase, med migrasjonene som er gitt. */
async function start(migrasjoner: readonly string[]): Promise<Status> {
  rmSync(join(MILJO, 'supabase'), { recursive: true, force: true })
  mkdirSync(join(MILJO, 'supabase/migrations'), { recursive: true })
  writeFileSync(join(MILJO, 'supabase/config.toml'), oppsett(migrasjoner.length === 0))
  cpSync(join(REPO, 'supabase/functions'), join(MILJO, 'supabase/functions'), { recursive: true })
  for (const f of migrasjoner) cpSync(join(REPO, 'supabase/migrations', f), join(MILJO, 'supabase/migrations', f))
  supabase('start', '-x', UTEN)
  const status = JSON.parse(supabase('status', '-o', 'json')) as Status
  await ventPaTjenestene(status.API_URL, status.SECRET_KEY)
  return status
}

const stopp = () => {
  try {
    supabase('stop', '--no-backup')
  } catch {
    /* sto ikke */
  }
}

const klient = (s: Status, nokkel = s.PUBLISHABLE_KEY) => createClient(s.API_URL, nokkel, { auth: { autoRefreshToken: false, persistSession: false } })

async function innlogget(s: Status, brukernavn: string, passord: string): Promise<SupabaseClient> {
  const k = klient(s)
  const { error } = await k.auth.signInWithPassword({ email: internAuthAdresse(brukernavn), password: passord })
  if (error) throw new Error(`${brukernavn} kunne ikke logge inn: ${error.message}`)
  return k
}

/** En syntetisk konto direkte med Auth-API-et, slik det lokale testmiljøet lager administratoren. */
async function lagKonto(s: Status, brukernavn: string, passord: string): Promise<string> {
  const admin = klient(s, s.SECRET_KEY)
  const { error: r } = await admin.from('kontoreservasjoner').upsert({ username: brukernavn, reservert_kl: new Date().toISOString() })
  if (r) throw r
  const { data, error } = await admin.auth.admin.createUser({ email: internAuthAdresse(brukernavn), password: passord, email_confirm: true })
  if (error) throw error
  const id = data.user.id
  const { error: p } = await admin.from('profiles').update({ first_name: 'Syntetisk', last_name: brukernavn, must_change_password: false, onboarding_completed: true }).eq('id', id)
  if (p) throw p
  return id
}

interface Opprettet {
  passord?: string
  avvist: boolean
  vei: string
  feil?: string
}

/**
 * En ny konto gjennom adminflyten: Edge-funksjonen `opprett-bruker`, som den
 * innloggede. Kan funksjonen ikke starte i miljøet (i skymiljøet når
 * Edge-kjøretøyet ikke npm-registeret gjennom mellomtjeneren), gjøres de samme
 * kallene den gjør, med den innloggede som aktør, og prøven sier hvilken vei
 * som ble brukt. Myndigheten og utløseren kontrolleres i begge tilfeller av
 * databasen.
 */
async function opprettGjennomAdminflyten(s: Status, innlogget: SupabaseClient, aktor: string, brukernavn: string): Promise<Opprettet> {
  const svar = await innlogget.functions.invoke('opprett-bruker', { body: { brukernavn } })
  if (!svar.error) return { passord: (svar.data as { midlertidigPassord?: string }).midlertidigPassord, avvist: false, vei: 'Edge-funksjonen' }
  const kropp = await ((svar.error as { context?: Response }).context?.json?.().catch(() => null) ?? null) as { code?: string } | null
  if (kropp?.code !== 'BOOT_ERROR') return { avvist: true, vei: 'Edge-funksjonen', feil: svar.error.message }
  const vei = 'databasekallene funksjonen gjør (Edge-funksjonen kunne ikke starte i dette miljøet)'
  const admin = klient(s, s.SECRET_KEY)
  const { error: klarering } = await admin.rpc('kontooperasjon_klarer_konto', { aktor, brukernavn })
  if (klarering) return { avvist: true, vei, feil: klarering.message }
  const passord = genererMidlertidigPassord()
  const { error } = await admin.auth.admin.createUser({ email: internAuthAdresse(brukernavn), password: passord, email_confirm: true })
  return error ? { avvist: true, vei, feil: error.message } : { passord, avvist: false, vei }
}

const BILDE = Buffer.from('UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAcJaQAA3AA/v3AgAA=', 'base64')
/** Det nye profilbildet i første forsøk: like stort, annet innhold, og eTagen er ikke en md5-sum, så bare versjonen i Storage avslører det. */
const NYTT_BILDE = Buffer.from(BILDE.map((b, i) => (i === BILDE.length - 2 ? b ^ 0xff : b)))
const sha = (b: Uint8Array) => createHash('sha256').update(b).digest('hex')

/** Koden en autentiseringsapp viser nå for en base32-nøkkel (RFC 6238: SHA-1, 30 s, 6 sifre). */
function totp(nokkel: string, tid = Date.now()): string {
  const alfabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const biter = [...nokkel.replace(/=+$/, '').toUpperCase()].map((c) => alfabet.indexOf(c).toString(2).padStart(5, '0')).join('')
  const k = Buffer.from(biter.match(/.{8}/g)!.map((b) => parseInt(b, 2)))
  const teller = Buffer.alloc(8)
  teller.writeBigUInt64BE(BigInt(Math.floor(tid / 30_000)))
  const h = createHmac('sha1', k).update(teller).digest()
  return String((h.readUInt32BE(h[h.length - 1]! & 15) & 0x7fffffff) % 1_000_000).padStart(6, '0')
}

/** Melder inn og bekrefter tofaktor for den innloggede, og gir nøkkelen. */
async function meldInnTofaktor(k: SupabaseClient): Promise<string> {
  const { data, error } = await k.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'prove' })
  if (error) throw error
  const { error: bekreftet } = await k.auth.mfa.challengeAndVerify({ factorId: data.id, code: totp(data.totp.secret) })
  if (bekreftet) throw bekreftet
  return data.totp.secret
}

/** Logger inn med tofaktor, og gir innloggingsnivået etterpå. */
async function medTofaktor(k: SupabaseClient, nokkel: string): Promise<string> {
  const { data: faktorer, error } = await k.auth.mfa.listFactors()
  if (error) throw error
  const faktor = faktorer.totp[0]
  if (!faktor) return 'ingen faktor'
  const { error: feil } = await k.auth.mfa.challengeAndVerify({ factorId: faktor.id, code: totp(nokkel) })
  if (feil) return feil.message
  return (await k.auth.mfa.getAuthenticatorAssuranceLevel()).data?.currentLevel ?? 'ukjent'
}

const KRYPTERT_NOKKEL = JSON.stringify({ key_id: 'plattformen', alg: 'aes-gcm-hkdf', data: randomBytes(32).toString('base64'), nonce: randomBytes(12).toString('base64') })

/**
 * Skriver hele tiden til to tabeller i én transaksjon, med et løpenummer, til
 * `stopp()`: et sammenhengende kopipunkt har like mange rader i begge, uten
 * hull, og færre enn kilden har når skrivingen er stoppet.
 */
function samtidigSkriver(dbUrl: string): { stopp(): Promise<void> } {
  execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl, '-c',
    'create table public.kopiprove_a (n int primary key); create table public.kopiprove_b (n int primary key);'])
  const p = spawn('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl], { stdio: ['pipe', 'ignore', 'inherit'] })
  let n = 0
  const tikk = setInterval(() => {
    n++
    p.stdin.write(`begin; insert into public.kopiprove_a values (${n}); select pg_sleep(0.01); insert into public.kopiprove_b values (${n}); commit;\n`)
  }, 20)
  return {
    stopp: () =>
      new Promise((ok, avvis) => {
        clearInterval(tikk)
        p.once('exit', (kode) => (kode === 0 ? ok() : avvis(new Error(`skriveren feilet (${kode})`))))
        p.stdin.end()
      }),
  }
}

const tellinger = (dbUrl: string) => {
  const ut = execFileSync('psql', ['-X', '-At', '--dbname', dbUrl, '-c',
    `select (select count(*) from public.kopiprove_a) || ',' || (select coalesce(max(n), 0) from public.kopiprove_a) || ',' ||
            (select count(*) from public.kopiprove_b) || ',' || (select coalesce(max(n), 0) from public.kopiprove_b)`], { encoding: 'utf8' })
  const [a, maksA, b, maksB] = ut.trim().split(',').map(Number) as [number, number, number, number]
  return { a, maksA, b, maksB }
}

const psql = (dbUrl: string, sql: string) => execFileSync('psql', ['-X', '-q', '-At', '-v', 'ON_ERROR_STOP=1', '--dbname', dbUrl, '-c', sql], { encoding: 'utf8' }).trim()

/** Teksten i direktemeldingen i kilden. Den skal ikke finnes i noe en kopi har. */
const DM_TEKST = `DMPROVE${randomBytes(8).toString('hex')}`

/**
 * En direktesamtale mellom de to, med én melding med `DM_TEKST`, lest-status,
 * valgene og en blokkering, lagt rett i tabellene.
 */
function leggInnDirektemeldinger(dbUrl: string, a: string, b: string) {
  psql(dbUrl, `
    insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ('${a}', true), ('${b}', true);
    with s as (
      insert into public.direktesamtaler (bruker_lav, bruker_hoy, opprettet_av, siste_nr, siste_endring, siste_melding_kl)
      values (least('${a}'::uuid, '${b}'::uuid), greatest('${a}'::uuid, '${b}'::uuid), '${a}', 1, 1, now()) returning id
    ), m as (
      insert into public.direktemeldinger (samtale_id, nr, forfatter_id, klient_id, tekst, endring)
      select id, 1, '${a}', gen_random_uuid(), '${DM_TEKST}', 1 from s returning samtale_id
    )
    insert into public.direktesamtale_status (samtale_id, bruker_id, lest_til_nr) select samtale_id, '${a}', 1 from m;
    insert into public.direktemelding_blokkeringer (blokkerer, blokkert) values ('${b}', '${a}');`)
}

/** Det som skal stå etter en gjenoppretting av direktemeldingene: alt uten meldingene. */
const direkte = (dbUrl: string) =>
  psql(dbUrl, `select (select count(*) from public.direktemeldinger) || ',' || (select count(*) from public.direktesamtaler) || ',' ||
    (select count(*) from public.direktesamtale_status) || ',' || (select count(*) from public.chatvalg) || ',' || (select count(*) from public.direktemelding_blokkeringer)`)

/** Om noe i en kopi (hovedfila og hver bit, dekryptert med `identitet`) har teksten. */
function harTekst(kopi: string, identitet: string, tekst: string): boolean {
  const deler = join(dirname(kopi), 'deler')
  const filer = [kopi, ...readdirSync(deler).map((n) => join(deler, n))]
  return filer.some((f) => execFileSync('age', ['-d', '-i', identitet, f], { maxBuffer: 1024 * 1024 * 1024 }).includes(tekst))
}

/** Om ingen av filene i en kopi kan dekrypteres med `identitet`. */
function stengtFor(kopi: string, identitet: string): boolean {
  const deler = join(dirname(kopi), 'deler')
  return [kopi, ...readdirSync(deler).map((n) => join(deler, n))].every((f) => {
    try {
      execFileSync('age', ['-d', '-i', identitet, '-o', '/dev/null', f], { stdio: 'ignore' })
      return false
    } catch {
      return true
    }
  })
}

const DOGN = 24 * 3600 * 1000

const punkter: { punkt: string; ok: boolean; detalj?: string }[] = []
function sjekk(punkt: string, ok: boolean, detalj?: string) {
  punkter.push({ punkt, ok, detalj })
  logg(`${ok ? 'OK ' : 'FEIL'} ${punkt}${detalj ? ` (${detalj})` : ''}`)
}

async function prove(): Promise<void> {
  await sikreDocker()
  execFileSync('age-keygen', ['-o', join(MAPPE, 'nokkel.txt')], { stdio: 'ignore' })
  const mottaker = execFileSync('age-keygen', ['-y', join(MAPPE, 'nokkel.txt')], { encoding: 'utf8' }).trim()
  const jobben = lagSigneringsnokler()
  // Den nye mottakernøkkelen etter byttet i natt 3.
  execFileSync('age-keygen', ['-o', join(MAPPE, 'ny-nokkel.txt')], { stdio: 'ignore' })
  const nyMottaker = execFileSync('age-keygen', ['-y', join(MAPPE, 'ny-nokkel.txt')], { encoding: 'utf8' }).trim()
  stopp()

  logg('1. ren Supabase: referansen')
  const ren = await start([])
  const referanse = lagReferanse(ren.DB_URL)
  stopp()

  logg('2. kilden: migrasjonene og syntetiske brukere')
  const kilde = await start(await valgteMigrasjoner())
  const adminPassord = randomBytes(18).toString('base64url')
  const brukerPassord = randomBytes(18).toString('base64url')
  const adminId = await lagKonto(kilde, 'kopi-admin', adminPassord)
  const { error: rolle } = await klient(kilde, kilde.SECRET_KEY).rpc('kontooperasjon_forste_administrator', { bruker: adminId })
  if (rolle) throw rolle
  const adminNokkel = await meldInnTofaktor(await innlogget(kilde, 'kopi-admin', adminPassord))
  const brukerId = await lagKonto(kilde, 'kopi-bruker', brukerPassord)
  execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', kilde.DB_URL, '-c',
    `insert into auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret)
     values (gen_random_uuid(), '${brukerId}', 'kryptert', 'totp', 'verified', now(), now(), '${KRYPTERT_NOKKEL}')`])
  const bruker = await innlogget(kilde, 'kopi-bruker', brukerPassord)
  const opplasting = await bruker.storage.from('avatarer').upload(`${brukerId}/avatar.webp`, BILDE, { contentType: 'image/webp' })
  if (opplasting.error) throw opplasting.error
  const { error: sti } = await bruker.from('profiles').update({ avatar_path: `${brukerId}/avatar.webp` }).eq('id', brukerId)
  if (sti) throw sti
  // En eTag som ikke er en md5-sum (som ved flerdelsopplasting): da må versjonen avsløre et bytte av like stor fil.
  execFileSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--dbname', kilde.DB_URL, '-c',
    `update storage.objects set metadata = jsonb_set(metadata, '{eTag}', '"\\"0123456789abcdef-2\\""') where bucket_id = 'avatarer'`])
  leggInnDirektemeldinger(kilde.DB_URL, adminId, brukerId)
  const direkteIKilden = direkte(kilde.DB_URL)
  // Slik Management API-et lager innloggingsrollen kopijobben bruker: den er ikke en tilpasning.
  // Som plattformens administrator, som Management API-et: bare den kan gi medlemskap i `postgres`.
  execFileSync('docker', ['exec', 'supabase_db_ousfar-kopiprove', 'psql', '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-U', 'supabase_admin', '-d', 'postgres', '-c',
    `create role cli_login_kopiprove login noinherit; grant postgres to cli_login_kopiprove; alter role cli_login_kopiprove set statement_timeout = '1min';`], { stdio: ['ignore', 'ignore', 'pipe'] })
  const midlertidig = forskjell(fingeravtrykk(kilde.DB_URL), referanse).tilpasninger.filter((o) => o.nokkel.includes('cli_login'))
  sjekk('den midlertidige innloggingsrollen, medlemskapet og innstillingen er ikke tilpasninger', midlertidig.length === 0, midlertidig.map((o) => `${o.art} ${o.nokkel}`).join(', ') || undefined)
  // pg_dump må ha minst serverens versjon; Postgres-bildet til miljøet har den.
  process.env.KOPI_PG_BILDE ??= execFileSync('docker', ['inspect', '--format', '{{.Config.Image}}', 'supabase_db_ousfar-kopiprove'], { encoding: 'utf8' }).trim()
  const skriver = samtidigSkriver(kilde.DB_URL)
  await new Promise((ok) => setTimeout(ok, 1000))
  const fraKilden = await taKopi({
    dbUrl: kilde.DB_URL,
    apiUrl: kilde.API_URL,
    nokkel: kilde.SECRET_KEY,
    referanse,
    mottakere: [mottaker],
    ut: join(MAPPE, 'kopier'),
    migrasjoner: join(REPO, 'supabase/migrations'),
    kontrollnokkel: join(MAPPE, 'nokkel.txt'),
    signeringsnokkel: jobben.privat,
    underveis: async (forsok) => {
      if (forsok !== 1) return
      const { error } = await klient(kilde, kilde.SECRET_KEY).storage.from('avatarer')
        .update(`${brukerId}/avatar.webp`, NYTT_BILDE, { contentType: 'image/webp' })
      if (error) throw error
    },
  })
  await skriver.stopp()
  const iKilden = tellinger(kilde.DB_URL)
  const kopi = fraKilden.fil
  sjekk('direktemeldingene: teksten finnes ikke i noe kopien har', !harTekst(kopi, join(MAPPE, 'nokkel.txt'), DM_TEKST))

  logg('5. nattens kopi mot et lager med lås: fire netter, nøkkelbytte og opprydding')
  const lager = await new FalskS3().start()
  const s3 = new S3({ ...lager.oppsett(), naa: () => lager.naa })
  const start0 = Date.now()
  const natt = (dogn: number, mottakere: string[]): Promise<Nattrapport> => {
    lager.naa = new Date(start0 + dogn * DOGN)
    return kjorNatt({
      s3, dbUrl: kilde.DB_URL, apiUrl: kilde.API_URL, nokkel: kilde.SECRET_KEY, referanse, mottakere,
      migrasjoner: join(REPO, 'supabase/migrations'), signeringsnokkel: jobben.privat, naa: () => lager.naa,
    })
  }
  const hentet: Record<string, string> = {}
  const hent = async (navn: string, fil: string) => {
    const ut = join(MAPPE, 'hentet', navn)
    hentet[navn] = (await hentKopi(s3, jobben.offentlig, ut, summerAv, fil)).kopi
  }
  let nettene: Nattrapport[] = []
  try {
    const n1 = await natt(0, [mottaker])
    sjekk('natt 1: den første kopien i lageret har alle bitene', n1.forste && n1.nye === n1.biter && n1.biter > 1, `${n1.biter} biter`)
    await hent('natt1', n1.kopi)
    psql(kilde.DB_URL, `update public.profiles set first_name = 'Endret' where id = '${brukerId}'`)
    const n2 = await natt(1, [mottaker])
    sjekk('natt 2: bare bitene med endrede rader hentes; resten gjenbrukes fra natt 1', !n2.forste && !n2.nyeMottakere && n2.nye >= 1 && n2.nye < n2.biter, `${n2.nye} av ${n2.biter} biter nye`)
    await hent('natt2', n2.kopi)
    const n3 = await natt(2, [nyMottaker])
    sjekk('natt 3: med ny mottakernøkkel krypteres alle bitene på nytt, ingen gjenbrukes', n3.nyeMottakere && n3.nye === n3.biter, `${n3.nye} av ${n3.biter} biter nye`)
    const etterBytte = await lesLageret(s3, jobben.offentlig)
    sjekk(
      'tilsynet: den nyeste kopien er kryptert til den nye nøkkelen, ikke den gamle',
      tilsyn(etterBytte, lager.naa, [nyMottaker]).ok && !tilsyn(etterBytte, lager.naa, [mottaker]).ok,
    )
    const n4 = await natt(10, [nyMottaker])
    const igjen = await lesLageret(s3, jobben.offentlig)
    const hele = igjen.kopier.filter((k) => k.hel).map((k) => k.signatur.fil)
    sjekk(
      'natt 4, etter oppbevaringstiden: kopiene med den gamle nøkkelen er ryddet, den forrige står låst, og bitene gjenbrukes',
      n4.rydding.slettet > 0 && !hele.includes(n1.kopi) && !hele.includes(n2.kopi) && hele[0] === n4.kopi && hele.includes(n3.kopi) && n4.nye < n4.biter,
      `${n4.rydding.slettet} filer ryddet, ${n4.rydding.last} låst; hele kopier: ${hele.length}; ${n4.nye} av ${n4.biter} biter nye`,
    )
    await hent('natt4', n4.kopi)
    sjekk('natt 4: ingen fil i kopien kan åpnes med den gamle nøkkelen', stengtFor(hentet.natt4!, join(MAPPE, 'nokkel.txt')))
    nettene = [n1, n2, n3, n4]
    for (const [navn, identitet] of [['natt1', 'nokkel.txt'], ['natt2', 'nokkel.txt'], ['natt4', 'ny-nokkel.txt']] as const) {
      sjekk(`${navn}: teksten i direktemeldingen finnes ikke i noe kopien har`, !harTekst(hentet[navn]!, join(MAPPE, identitet), DM_TEKST))
    }
  } finally {
    await lager.stopp()
  }
  stopp()

  logg('3. ny, ren Supabase: gjenopprettingen')
  const mal = await start([])
  const malValg = { kopi, identitet: join(MAPPE, 'nokkel.txt'), avsender: jobben.offentlig, dbUrl: mal.DB_URL, apiUrl: mal.API_URL, nokkel: mal.SECRET_KEY }
  const urort = () =>
    execFileSync('psql', ['-X', '-At', '--dbname', mal.DB_URL, '-c',
      `select (select count(*) from auth.users) = 0 and to_regclass('public.forfalsket') is null`], { encoding: 'utf8' }).trim() === 't'

  // En forfalsket kopi: gyldig kryptert til den samme mottakeren, med egne SQL-filer og eget manifest.
  const falsk = join(MAPPE, 'falsk')
  mkdirSync(falsk)
  writeFileSync(join(falsk, 'struktur.sql'), 'create table public.forfalsket (x int);')
  writeFileSync(join(falsk, 'data.sql'), '')
  writeFileSync(join(falsk, 'manifest.json'), JSON.stringify({ laget: new Date().toISOString(), kilde: 'forfalsket', versjoner: referanse.versjoner, tabeller: [], filer: [], hemmeligheter: [], referanse, tilpasninger: [] }))
  const utskiftet = join(MAPPE, 'utskiftet', basename(kopi))
  mkdirSync(dirname(utskiftet))
  await pakk(falsk, utskiftet, ['age', '-r', mottaker])
  const angriper = lagSigneringsnokler()
  for (const [hva, sig] of [
    ['med den ekte signaturen', readFileSync(fraKilden.signatur, 'utf8')],
    ['signert med en annen nøkkel', JSON.stringify(signer(basename(kopi), await filsum(utskiftet), new Date().toISOString(), angriper.privat))],
  ] as const) {
    writeFileSync(`${utskiftet}.sig`, sig)
    const svar = await gjenopprett({ ...malValg, kopi: utskiftet, krypterteFaktorer: 'fjern' }).then(() => null, (e: unknown) => e)
    sjekk(
      `en utskiftet, gyldig kryptert kopi ${hva} avvises før noe åpnes, og målet er urørt`,
      svar instanceof Stopp && urort(),
      svar instanceof Error ? svar.message.slice(0, 80) : 'ble ikke avvist',
    )
  }
  const utenValg = await gjenopprett(malValg).then(() => null, (e: unknown) => e)
  const brukereIMalet = execFileSync('psql', ['-X', '-At', '--dbname', mal.DB_URL, '-c', 'select count(*) from auth.users'], { encoding: 'utf8' }).trim()
  sjekk(
    'krypterte tofaktornøkler: uten valget begynner gjenopprettingen ikke, og målet er urørt',
    utenValg instanceof Stopp && brukereIMalet === '0',
    utenValg instanceof Error ? utenValg.message.slice(0, 80) : 'ble ikke stoppet',
  )
  const r = await gjenopprett({ ...malValg, krypterteFaktorer: 'fjern' })
  sjekk('1–3, 5: tabeller, kontrollsummer, filer, migrasjonshistorikk og tilpasninger er like kilden', r.avvik.length === 0, r.avvik.join('; ') || undefined)
  const iKopien = tellinger(mal.DB_URL)
  sjekk(
    'samtidig skriving: kopien er ett sammenhengende punkt, og skrivingen fortsatte etter det',
    iKopien.a > 0 && iKopien.a === iKopien.b && iKopien.a === iKopien.maksA && iKopien.maksA === iKopien.maksB && iKilden.maksA > iKopien.maksA,
    `${iKopien.a} skrivinger i kopien, ${iKilden.maksA} i kilden da skrivingen stoppet`,
  )
  sjekk(
    'krypterte tofaktornøkler: med valget fjernes faktoren etter kontrollen, og brukeren listes',
    r.fjernedeFaktorer.length === 1 && r.fjernedeFaktorer[0] === internAuthAdresse('kopi-bruker'),
    r.fjernedeFaktorer.join(', '),
  )
  sjekk('samtidig bytte av en like stor fil uten md5-eTag: første forsøk ble forkastet og kopien tatt på nytt', fraKilden.forsok === 2, `${fraKilden.forsok} forsøk`)

  logg('4. kontrollene etter gjenopprettingen')
  const admin = await innlogget(mal, 'kopi-admin', adminPassord).catch((e: Error) => e)
  sjekk('4: administratoren logger inn med sitt gamle passord', !(admin instanceof Error), admin instanceof Error ? admin.message : undefined)
  if (admin instanceof Error) return
  const niva = await medTofaktor(admin, adminNokkel)
  sjekk('4: administratoren når tofaktornivået (aal2) med koden fra sin gamle autentiseringsapp', niva === 'aal2', niva)
  const { data: profil } = await admin.from('profiles').select('username').eq('id', adminId).maybeSingle()
  sjekk('4: profilen kan leses som innlogget', profil?.username === 'kopi-admin')

  const ny = await opprettGjennomAdminflyten(mal, admin, adminId, 'kopi-ny')
  const nyttPassord = ny.passord
  sjekk('6: en ny bruker opprettes gjennom adminflyten', !ny.avvist && !!nyttPassord, [ny.vei, ny.feil].filter(Boolean).join(': '))
  const service = klient(mal, mal.SECRET_KEY)
  const { data: nyProfil } = await service.from('profiles').select('id').eq('username', 'kopi-ny').maybeSingle()
  const { count: medlemskap } = await service.from('medlemskap').select('*', { count: 'exact', head: true }).eq('bruker_id', nyProfil?.id ?? '')
  sjekk('6: utløseren ga den nye brukeren profil og medlemskap', !!nyProfil && (medlemskap ?? 0) > 0)
  const nyInnlogget = nyttPassord ? await innlogget(mal, 'kopi-ny', nyttPassord).catch((e: Error) => e) : new Error('ingen passord')
  sjekk('6: den nye brukeren kan logge inn', !(nyInnlogget instanceof Error))

  const brukerMal = await innlogget(mal, 'kopi-bruker', brukerPassord)
  const brukersFaktorer = (await brukerMal.auth.mfa.listFactors()).data?.all.length
  sjekk('4: brukeren med den fjernede faktoren logger inn med passordet og kan melde inn tofaktor på nytt', brukersFaktorer === 0)
  const uten = await opprettGjennomAdminflyten(mal, brukerMal, brukerId, 'kopi-uten')
  const { data: utenProfil } = await service.from('profiles').select('id').eq('username', 'kopi-uten').maybeSingle()
  sjekk('6: en bruker uten myndighet avvises', uten.avvist && !utenProfil, [uten.vei, uten.feil].filter(Boolean).join(': '))

  const eget = await brukerMal.storage.from('avatarer').download(`${brukerId}/avatar.webp`)
  sjekk(
    '7: det gjenopprettede profilbildet kan hentes av eieren, og er det nye',
    !eget.error && sha(new Uint8Array(await eget.data!.arrayBuffer())) === sha(NYTT_BILDE),
  )
  if (!(nyInnlogget instanceof Error) && nyProfil) {
    const egen = await nyInnlogget.storage.from('avatarer').upload(`${nyProfil.id}/avatar.webp`, BILDE, { contentType: 'image/webp' })
    sjekk('7: den nye brukeren kan legge inn sitt eget profilbilde', !egen.error, egen.error?.message)
    const bytt = await nyInnlogget.storage.from('avatarer').update(`${nyProfil.id}/avatar.webp`, BILDE, { contentType: 'image/webp' })
    sjekk('7: … og bytte det', !bytt.error, bytt.error?.message)
    const fremmed = await nyInnlogget.storage.from('avatarer').upload(`${brukerId}/avatar.webp`, BILDE, { contentType: 'image/webp', upsert: true })
    sjekk('7: men ikke legge inn eller bytte en annens', !!fremmed.error)
    const fjernFremmed = await nyInnlogget.storage.from('avatarer').remove([`${brukerId}/avatar.webp`])
    const finnes = await service.storage.from('avatarer').download(`${brukerId}/avatar.webp`)
    sjekk('7: og ikke fjerne en annens', !finnes.error && (fjernFremmed.data?.length ?? 0) === 0)
    const fjern = await nyInnlogget.storage.from('avatarer').remove([`${nyProfil.id}/avatar.webp`])
    sjekk('7: den nye brukeren kan fjerne sitt eget', !fjern.error && (fjern.data?.length ?? 0) === 1)
  }
  sjekk(`8: tid fra start av gjenopprettingen til kontrollert: ${r.sekunder} s`, true)
  sjekk('direktemeldingene: samtalen, lest-statusen, valgene og blokkeringen står, uten meldingen', direkte(mal.DB_URL) === direkteIKilden.replace(/^1,/, '0,'), direkte(mal.DB_URL))
  stopp()

  logg('6. kopiene fra lageret, hver i en ny, ren Supabase')
  if (nettene.length !== 4) return
  for (const [navn, identitet, fornavn] of [
    ['natt1', 'nokkel.txt', 'Syntetisk'],
    ['natt2', 'nokkel.txt', 'Endret'],
    ['natt4', 'ny-nokkel.txt', 'Endret'],
  ] as const) {
    const nyttMal = await start([])
    const svar = await gjenopprett({
      kopi: hentet[navn]!, identitet: join(MAPPE, identitet), avsender: jobben.offentlig,
      dbUrl: nyttMal.DB_URL, apiUrl: nyttMal.API_URL, nokkel: nyttMal.SECRET_KEY, krypterteFaktorer: 'fjern',
    }).catch((e: Error) => e)
    if (svar instanceof Error) {
      sjekk(`${navn}: gjenopprettet fra lageret`, false, svar.message.slice(0, 200))
      stopp()
      continue
    }
    sjekk(`${navn}: signaturen holder, og tabeller, kontrollsummer, filer og tilpasninger er like kopien`, svar.avvik.length === 0, svar.avvik.join('; ') || undefined)
    const inn = await innlogget(nyttMal, 'kopi-admin', adminPassord).catch((e: Error) => e)
    sjekk(`${navn}: administratoren logger inn med sitt gamle passord`, !(inn instanceof Error))
    const brukerInn = await innlogget(nyttMal, 'kopi-bruker', brukerPassord)
    const bildet = await brukerInn.storage.from('avatarer').download(`${brukerId}/avatar.webp`)
    sjekk(`${navn}: profilbildet kan hentes av eieren`, !bildet.error && sha(new Uint8Array(await bildet.data!.arrayBuffer())) === sha(NYTT_BILDE))
    sjekk(`${navn}: radene er som da kopien ble tatt`, psql(nyttMal.DB_URL, `select first_name from public.profiles where id = '${brukerId}'`) === fornavn)
    sjekk(`${navn}: direktemeldingene: samtalen, lest-statusen, valgene og blokkeringen står, uten meldingen`, direkte(nyttMal.DB_URL) === direkteIKilden.replace(/^1,/, '0,'), direkte(nyttMal.DB_URL))
    stopp()
  }
}

/** `KOPIPROVE_BEHOLD=ja` lar miljøet stå etter prøven, for feilsøking; `npx supabase stop --no-backup --workdir <mappe>/miljo` rydder. */
const behold = process.env.KOPIPROVE_BEHOLD === 'ja'
try {
  await prove()
} finally {
  if (behold) logg(`miljøet står i ${MILJO}`)
  else {
    stopp()
    rmSync(MAPPE, { recursive: true, force: true })
  }
}
const feil = punkter.filter((p) => !p.ok)
console.log(JSON.stringify({ dato: new Date().toISOString(), punkter }, null, 2))
if (feil.length || !punkter.length) process.exit(1)
