/**
 * Gjenopprettingsprøven i det lokale testmiljøet, med syntetiske brukere
 * (`docs/drift-gjenoppretting.md`, tiltak 2 i `docs/s4-pilotplan.md`):
 *
 *   npm run sikkerhetskopi:prove
 *
 * 1. En ren Supabase i Docker (uten OUSFARs migrasjoner) gir referansen.
 * 2. Den samme med migrasjonene er kilden: en syntetisk administrator og en
 *    syntetisk bruker med profilbilde legges inn, og kopien tas og krypteres.
 * 3. Databasen slettes, en ny, ren Supabase startes, og kopien gjenopprettes.
 * 4. Prøven kontrollerer punktene i §3.2: like tabeller, filer og
 *    tilpasninger; administratoren logger inn med sitt gamle passord; en ny
 *    bruker opprettes gjennom adminflyten (Edge-funksjonen `opprett-bruker`) og får profil og
 *    medlemskap; en bruker uten myndighet avvises; profilbildereglene holder.
 *
 * Ingen produksjonsdata er med. Alt ligger i en midlertidig mappe som
 * slettes, og databasen stoppes uten å lagre noe.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { execFileSync } from 'node:child_process'
import { randomBytes } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { internAuthAdresse } from '@delt/brukernavn'
import { genererMidlertidigPassord } from '@delt/passord'
import { SUPABASE_CLI } from '../src/drift/supabaseCli'
import { gjenopprett, lagReferanse, taKopi, ventPaTjenestene } from '../src/drift/sikkerhetskopi/kopi'
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
  return lokaltOppsett(readFileSync(join(REPO, 'supabase/config.toml'), 'utf8'))
    .replace(/^project_id\s*=.*$/m, 'project_id = "ousfar-kopiprove"')
    .split('\n')
    .filter((linje) => {
      seksjon = /^\s*\[([^\]]+)\]/.exec(linje)?.[1] ?? seksjon
      return !(ren && seksjon.startsWith('storage.buckets'))
    })
    .join('\n')
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

const punkter: { punkt: string; ok: boolean; detalj?: string }[] = []
function sjekk(punkt: string, ok: boolean, detalj?: string) {
  punkter.push({ punkt, ok, detalj })
  logg(`${ok ? 'OK ' : 'FEIL'} ${punkt}${detalj ? ` (${detalj})` : ''}`)
}

async function prove(): Promise<void> {
  await sikreDocker()
  execFileSync('age-keygen', ['-o', join(MAPPE, 'nokkel.txt')], { stdio: 'ignore' })
  const mottaker = execFileSync('age-keygen', ['-y', join(MAPPE, 'nokkel.txt')], { encoding: 'utf8' }).trim()
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
  const brukerId = await lagKonto(kilde, 'kopi-bruker', brukerPassord)
  const bruker = await innlogget(kilde, 'kopi-bruker', brukerPassord)
  const opplasting = await bruker.storage.from('avatarer').upload(`${brukerId}/avatar.webp`, BILDE, { contentType: 'image/webp' })
  if (opplasting.error) throw opplasting.error
  const { error: sti } = await bruker.from('profiles').update({ avatar_path: `${brukerId}/avatar.webp` }).eq('id', brukerId)
  if (sti) throw sti
  const kopi = await taKopi({
    dbUrl: kilde.DB_URL,
    apiUrl: kilde.API_URL,
    nokkel: kilde.SECRET_KEY,
    referanse,
    mottakere: [mottaker],
    ut: join(MAPPE, 'kopier'),
    migrasjoner: join(REPO, 'supabase/migrations'),
  })
  stopp()

  logg('3. ny, ren Supabase: gjenopprettingen')
  const mal = await start([])
  const r = await gjenopprett({ kopi, identitet: join(MAPPE, 'nokkel.txt'), dbUrl: mal.DB_URL, apiUrl: mal.API_URL, nokkel: mal.SECRET_KEY })
  sjekk('1–3, 5: tabeller, kontrollsummer, filer, migrasjonshistorikk og tilpasninger er like kilden', r.avvik.length === 0, r.avvik.join('; ') || undefined)

  logg('4. kontrollene etter gjenopprettingen')
  const admin = await innlogget(mal, 'kopi-admin', adminPassord).catch((e: Error) => e)
  sjekk('4: administratoren logger inn med sitt gamle passord', !(admin instanceof Error), admin instanceof Error ? admin.message : undefined)
  if (admin instanceof Error) return
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
  const uten = await opprettGjennomAdminflyten(mal, brukerMal, brukerId, 'kopi-uten')
  const { data: utenProfil } = await service.from('profiles').select('id').eq('username', 'kopi-uten').maybeSingle()
  sjekk('6: en bruker uten myndighet avvises', uten.avvist && !utenProfil, [uten.vei, uten.feil].filter(Boolean).join(': '))

  const eget = await brukerMal.storage.from('avatarer').download(`${brukerId}/avatar.webp`)
  sjekk('7: det gjenopprettede profilbildet kan hentes av eieren', !eget.error && (await eget.data!.arrayBuffer()).byteLength === BILDE.length)
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
