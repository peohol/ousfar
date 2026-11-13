/**
 * Det lokale testmiljøet for nettleserkontrollene: en egen Supabase-database i
 * Docker, bygd av de samme migrasjonene som testdatabasen, en syntetisk
 * administrator, og appen bygd mot denne databasen og servert på maskinen.
 * Produksjonsdatabasen blir ikke berørt (`docs/qa-testmiljo.md`).
 *
 * Den lokale databasen har ingen FEST-kopi. Appen når den derfor gjennom en
 * liten mellomtjener som sender alt videre, unntatt `les_legemidler`, som den
 * svarer på fra de lagrede FEST-uttrekkene: de samme som den lokale kjøringen
 * av forløpene bruker, med kontrolltidspunktet satt til nå, så appen ikke
 * stopper for gammel FEST. Alt som går gjennom nettverket — appen, og
 * kontroller som henter og endrer svaret (`route.fetch()`) — ser det samme.
 *
 * `startLokaltMiljo()` gjør alt som mangler og gjenbruker det som alt står:
 * Docker-tjenesten, databasen (så lenge migrasjonene er de samme) og
 * administratoren. Appen bygges på nytt hver gang, så den er lik koden som
 * kontrolleres. Databasen står igjen etter kjøringen; `npm run qa:lokal --
 * stopp` stopper den.
 */
import { createClient } from '@supabase/supabase-js'
import { execFileSync, spawn, spawnSync, type ChildProcess } from 'node:child_process'
import { createServer, request, type Server } from 'node:http'
import { createHash, randomBytes } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { internAuthAdresse } from '@delt/brukernavn'
import { grunnlagsdatabase, kjorMigrasjoner, migrasjonsfiler } from '../hjelp/migrasjonskjoring'
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { lesUttrekkene } from './brukerforlop'

/** Supabase-CLI-en, i en fast versjon, så miljøet blir det samme fra gang til gang. */
const SUPABASE_CLI = ['-y', 'supabase@2.120.0']

/** Tjenestene kontrollene ikke bruker, og som derfor ikke startes. */
const UTELATT = 'studio,imgproxy,realtime,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit'

const DENNE = fileURLToPath(import.meta.url)
const REPO = resolve(dirname(DENNE), '../../..')
const MAPPE = process.env.QA_LOKAL_MAPPE ?? join(tmpdir(), 'ousfar-qa-lokal')
const PORT = Number(process.env.QA_LOKAL_PORT ?? 4173)
/** Mellomtjeneren foran Supabase, som appen bygges mot. */
const MELLOMPORT = PORT + 1

/** Den syntetiske administratoren. Passordet lages første gang og står bare i mappen over. */
const BRUKERNAVN = 'qa-admin'

export interface LokaltMiljo {
  url: string
  supabaseUrl: string
  brukernavn: string
  passord: string
  avslutt(): Promise<void>
}

const logg = (tekst: string) => console.log(`[lokalt testmiljø] ${tekst}`)

function kjor(kommando: string, argumenter: string[], cwd = MAPPE): string {
  return execFileSync(kommando, argumenter, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 })
}

const supabase = (...argumenter: string[]) => kjor('npx', [...SUPABASE_CLI, ...argumenter, '--workdir', MAPPE])

const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/** Docker må svare. I skymiljøet startes tjenesten her når den ikke kjører. */
async function sikreDocker(): Promise<void> {
  const svarer = () => spawnSync('docker', ['info'], { stdio: 'ignore' }).status === 0
  if (svarer()) return
  if (process.getuid?.() !== 0) throw new Error('Docker kjører ikke. Start Docker og prøv igjen.')
  logg('starter Docker')
  spawn('dockerd', [], { detached: true, stdio: 'ignore' }).unref()
  for (let i = 0; i < 60 && !svarer(); i++) await vent(1000)
  if (!svarer()) throw new Error('Docker startet ikke innen ett minutt.')
}

/**
 * Migrasjonene som bygger databasen: de samme som testdatabasen kjører
 * (`kjorMigrasjoner`), altså uten dem som bare kan kjøres i produksjonen og uten
 * bivirkningsimportene for fagsider en ny database ikke har.
 */
async function valgteMigrasjoner(): Promise<string[]> {
  const kjort: string[] = []
  await kjorMigrasjoner(await grunnlagsdatabase(), { kjort: (fil) => kjort.push(fil) })
  return kjort
}

const fingeravtrykk = (filer: readonly string[]) => {
  const h = createHash('sha256').update(SUPABASE_CLI.join(' ')).update(lokaltOppsett(readFileSync(join(REPO, 'supabase/config.toml'), 'utf8')))
  for (const f of filer) h.update(f).update(readFileSync(join(REPO, 'supabase/migrations', f)))
  return h.digest('hex').slice(0, 16)
}

/**
 * Prosjektets `supabase/config.toml` for det lokale miljøet. CLI-en leser
 * `enable_signup = false` under `[auth.email]` som at innlogging med e-post er
 * slått av (`GOTRUE_EXTERNAL_EMAIL_ENABLED=false`), og da kan ingen logge inn.
 * Linjen tas bort her; registrering er fortsatt stengt av `[auth]
 * enable_signup = false`.
 */
export function lokaltOppsett(toml: string): string {
  let seksjon = ''
  return toml
    .split('\n')
    .filter((linje) => {
      seksjon = /^\s*\[([^\]]+)\]/.exec(linje)?.[1] ?? seksjon
      return !(seksjon === 'auth.email' && /^\s*enable_signup\s*=/.test(linje))
    })
    .join('\n')
}

interface Status {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
}

function status(): Status | null {
  try {
    const s = JSON.parse(supabase('status', '-o', 'json')) as Partial<Status>
    return s.API_URL && s.PUBLISHABLE_KEY && s.SECRET_KEY ? (s as Status) : null
  } catch {
    return null
  }
}

/** Databasen med de gjeldende migrasjonene: gjenbrukt når den står, ellers bygd på nytt. */
async function sikreDatabase(): Promise<Status> {
  const filer = migrasjonsfiler()
  const avtrykksfil = join(MAPPE, 'migrasjoner.txt')
  const avtrykk = fingeravtrykk(filer)
  const naa = status()
  if (naa && existsSync(avtrykksfil) && readFileSync(avtrykksfil, 'utf8') === avtrykk) return naa

  if (naa) {
    logg('migrasjonene er endret; databasen bygges på nytt')
    supabase('stop', '--no-backup')
  }
  logg('velger migrasjonene')
  const valgte = await valgteMigrasjoner()
  rmSync(join(MAPPE, 'supabase'), { recursive: true, force: true })
  mkdirSync(join(MAPPE, 'supabase/migrations'), { recursive: true })
  writeFileSync(join(MAPPE, 'supabase/config.toml'), lokaltOppsett(readFileSync(join(REPO, 'supabase/config.toml'), 'utf8')))
  for (const f of valgte) cpSync(join(REPO, 'supabase/migrations', f), join(MAPPE, 'supabase/migrations', f))
  logg(`starter Supabase med ${valgte.length} av ${filer.length} migrasjoner (første gang lastes bildene ned)`)
  supabase('start', '-x', UTELATT)
  writeFileSync(avtrykksfil, avtrykk)
  const ny = status()
  if (!ny) throw new Error('Supabase startet, men gir ingen status.')
  return ny
}

/** Den syntetiske administratoren, med navn, adminrolle (og systemarkitekt i den tomme databasen) og ferdig oppsett. Passordet gjenbrukes. */
async function sikreAdministrator(s: Status): Promise<string> {
  const passordfil = join(MAPPE, 'passord.txt')
  const passord = existsSync(passordfil) ? readFileSync(passordfil, 'utf8') : randomBytes(18).toString('base64url')
  writeFileSync(passordfil, passord, { mode: 0o600 })
  const admin = createClient(s.API_URL, s.SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: fraFor, error: oppslag } = await admin.from('profiles').select('id').eq('username', BRUKERNAVN).maybeSingle()
  if (oppslag) throw oppslag
  let id = fraFor?.id as string | undefined
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password: passord })
    if (error) throw error
  } else {
    const { error: reservasjon } = await admin.from('kontoreservasjoner').upsert({ username: BRUKERNAVN, reservert_kl: new Date().toISOString() })
    if (reservasjon) throw reservasjon
    const { data, error } = await admin.auth.admin.createUser({ email: internAuthAdresse(BRUKERNAVN), password: passord, email_confirm: true })
    if (error) throw error
    id = data.user.id
  }
  const { error } = await admin
    .from('profiles')
    .update({ first_name: 'QA', last_name: 'Testadministrator', must_change_password: false, onboarding_completed: true })
    .eq('id', id)
  if (error) throw error
  // Adminrollen med tildelingene som følger med den, som `npm run bootstrap:admin`.
  const { error: rollefeil } = await admin.rpc('kontooperasjon_forste_administrator', { bruker: id })
  if (rollefeil) throw rollefeil
  return passord
}

/** FEST-utvalget for virkestoffene: uttrekket som dekker flest av dem, kontrollert nå. */
export function lagFestsvar(uttrekk = Object.values(lesUttrekkene())): (virkestoff: readonly string[]) => Legemiddelutvalg {
  return (virkestoff) => {
    const dekning = (u: (typeof uttrekk)[number]) => virkestoff.filter((id) => u.utvalg.virkestoff.some((v) => v.id === id)).length
    const beste = uttrekk.reduce((a, b) => (dekning(b) > dekning(a) ? b : a))
    return { ...beste.utvalg, kontrollert_kl: new Date().toISOString() }
  }
}

/** Mellomtjeneren på {@link MELLOMPORT}: alt videre til Supabase, unntatt `les_legemidler`. */
async function startMellomtjener(s: Status): Promise<{ url: string; tjener: Server }> {
  const mal = new URL(s.API_URL)
  const fest = lagFestsvar()
  const tjener = createServer((inn, ut) => {
    const deler: Buffer[] = []
    inn.on('data', (d: Buffer) => deler.push(d))
    inn.on('end', () => {
      const kropp = Buffer.concat(deler)
      if (inn.method === 'POST' && inn.url?.split('?')[0] === '/rest/v1/rpc/les_legemidler') {
        const { virkestoff_ider = [] } = JSON.parse(kropp.toString('utf8') || '{}') as { virkestoff_ider?: string[] }
        ut.writeHead(200, { 'content-type': 'application/json', 'access-control-allow-origin': inn.headers.origin ?? '*' })
        ut.end(JSON.stringify(fest(virkestoff_ider)))
        return
      }
      const videre = request(
        { host: mal.hostname, port: mal.port, path: inn.url, method: inn.method, headers: { ...inn.headers, host: mal.host } },
        (svar) => {
          ut.writeHead(svar.statusCode ?? 502, svar.headers)
          svar.pipe(ut)
        },
      )
      videre.on('error', () => {
        ut.writeHead(502)
        ut.end()
      })
      videre.end(kropp)
    })
  })
  await new Promise<void>((ok, feil) => tjener.once('error', feil).listen(MELLOMPORT, '127.0.0.1', ok))
  return { url: `http://127.0.0.1:${MELLOMPORT}`, tjener }
}

/** Appen bygd mot mellomtjeneren foran den lokale databasen, servert på {@link PORT}. */
async function serverApp(s: Status, supabaseUrl: string): Promise<{ url: string; prosess: ChildProcess }> {
  const ut = join(MAPPE, 'app')
  const miljo = { ...process.env, VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY }
  logg('bygger appen mot den lokale databasen')
  execFileSync('npx', ['vite', 'build', '--outDir', ut, '--emptyOutDir', '--logLevel', 'warn'], { cwd: REPO, env: miljo, stdio: ['ignore', 'ignore', 'inherit'] })
  const url = `http://127.0.0.1:${PORT}`
  const prosess = spawn('npx', ['vite', 'preview', '--outDir', ut, '--host', '127.0.0.1', '--port', String(PORT), '--strictPort'], { cwd: REPO, env: miljo, stdio: 'ignore' })
  for (let i = 0; i < 60; i++) {
    if (prosess.exitCode !== null) throw new Error(`Appen startet ikke (port ${PORT} kan være i bruk).`)
    if (await fetch(url).then((r) => r.ok, () => false)) return { url, prosess }
    await vent(500)
  }
  prosess.kill()
  throw new Error('Appen svarte ikke innen 30 sekunder.')
}

export async function startLokaltMiljo(): Promise<LokaltMiljo> {
  mkdirSync(MAPPE, { recursive: true })
  await sikreDocker()
  const s = await sikreDatabase()
  const passord = await sikreAdministrator(s)
  const mellom = await startMellomtjener(s)
  const { url, prosess } = await serverApp(s, mellom.url)
  logg(`klart: ${url} mot ${mellom.url} (Supabase på ${s.API_URL})`)
  return {
    url,
    supabaseUrl: mellom.url,
    brukernavn: BRUKERNAVN,
    passord,
    avslutt: async () => {
      prosess.kill()
      await new Promise((ok) => mellom.tjener.close(ok))
    },
  }
}

/** `npm run qa:lokal` starter miljøet og lar appen stå til Ctrl+C; `-- stopp` stopper databasen. */
if (process.argv[1] && resolve(process.argv[1]) === DENNE) {
  if (process.argv[2] === 'stopp') {
    supabase('stop', '--no-backup')
    logg('stoppet')
  } else {
    const m = await startLokaltMiljo()
    logg(`logg inn som «${m.brukernavn}» med passordet i ${join(MAPPE, 'passord.txt')}. Ctrl+C avslutter.`)
    process.on('SIGINT', () => void m.avslutt().then(() => process.exit(0)))
  }
}
