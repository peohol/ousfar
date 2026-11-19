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
import { connect } from 'node:net'
import { createHash, randomBytes } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { internAuthAdresse } from '@delt/brukernavn'
import { grunnlagsdatabase, kjorMigrasjoner, migrasjonsfiler } from '../hjelp/migrasjonskjoring'
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { lesUttrekkene } from './brukerforlop'
import { SUPABASE_CLI } from '../../drift/supabaseCli'


/**
 * Tjenestene kontrollene ikke bruker, og som derfor ikke startes. Realtime står
 * på: gruppechatten bruker den (docs/gruppechat.md, «Sanntiden»).
 */
export const UTELATT = 'studio,imgproxy,edge-runtime,logflare,vector,supavisor,postgres-meta,mailpit'

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
export async function sikreDocker(): Promise<void> {
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
export async function valgteMigrasjoner(): Promise<string[]> {
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

export interface Status {
  API_URL: string
  PUBLISHABLE_KEY: string
  SECRET_KEY: string
  /** Postgres-adressen, for det kontrollene gjør som superbruker. */
  DB_URL?: string
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

/**
 * En syntetisk konto med navn, ferdig oppsett og passordet. Den får
 * medlemskapet databasen gir nye kontoer. Gir tilbake ID-en.
 */
export async function sikreTestkonto(s: Status, brukernavn: string, passord: string, navn: [string, string]): Promise<string> {
  const admin = createClient(s.API_URL, s.SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
  const { data: fraFor, error: oppslag } = await admin.from('profiles').select('id').eq('username', brukernavn).maybeSingle()
  if (oppslag) throw oppslag
  let id = fraFor?.id as string | undefined
  if (id) {
    const { error } = await admin.auth.admin.updateUserById(id, { password: passord })
    if (error) throw error
  } else {
    const { error: reservasjon } = await admin.from('kontoreservasjoner').upsert({ username: brukernavn, reservert_kl: new Date().toISOString() })
    if (reservasjon) throw reservasjon
    const { data, error } = await admin.auth.admin.createUser({ email: internAuthAdresse(brukernavn), password: passord, email_confirm: true })
    if (error) throw error
    id = data.user.id
  }
  const { error } = await admin
    .from('profiles')
    .update({ first_name: navn[0], last_name: navn[1], must_change_password: false, onboarding_completed: true })
    .eq('id', id)
  if (error) throw error
  return id!
}

/** Bryterne for hele funksjoner i databasen, som `intern.gruppechat_aktivert()`. */
export type Funksjonsbryter = 'gruppechat_aktivert' | 'direktemeldinger_aktivert'

/** Kjører SQL i den lokale databasen, som eier, og gir tilbake svaret som tekst. */
export function lokalSql(s: Status, sql: string): string {
  if (!s.DB_URL) throw new Error('Det lokale testmiljøet gir ingen databaseadresse.')
  const r = spawnSync('psql', [s.DB_URL, '-v', 'ON_ERROR_STOP=1', '-qAtc', sql], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr)
  return r.stdout.trim()
}

const settFunksjonsbryter = (s: Status, navn: Funksjonsbryter, pa: boolean) =>
  lokalSql(s, `create or replace function intern.${navn}() returns boolean language sql stable set search_path = '' as $$ select ${pa} $$;`)

/**
 * Slår bryterne på i den lokale databasen mens en kontroll går, og gir
 * tilbake funksjonen som setter dem som de stod, slik migrasjonene satte dem.
 */
export function slaPaFunksjoner(s: Status, ...navn: Funksjonsbryter[]): () => void {
  const fraFor = navn.map((n) => [n, lokalSql(s, `select intern.${n}()`) === 't'] as const)
  for (const n of navn) settFunksjonsbryter(s, n, true)
  return () => {
    for (const [n, pa] of fraFor) settFunksjonsbryter(s, n, pa)
  }
}

/** Den syntetiske administratoren, med navn, adminrolle (og systemarkitekt i den tomme databasen) og ferdig oppsett. Passordet gjenbrukes. */
export async function sikreAdministrator(s: Status): Promise<string> {
  const passordfil = join(MAPPE, 'passord.txt')
  const passord = existsSync(passordfil) ? readFileSync(passordfil, 'utf8') : randomBytes(18).toString('base64url')
  writeFileSync(passordfil, passord, { mode: 0o600 })
  const id = await sikreTestkonto(s, BRUKERNAVN, passord, ['QA', 'Testadministrator'])
  const admin = createClient(s.API_URL, s.SECRET_KEY, { auth: { autoRefreshToken: false, persistSession: false } })
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
  // Sanntiden (Realtime) går over WebSocket: oppgraderingene sendes rett videre.
  tjener.on('upgrade', (inn, sokkel, hode) => {
    const videre = connect(Number(mal.port), mal.hostname, () => {
      const linjer = [`${inn.method} ${inn.url} HTTP/${inn.httpVersion}`]
      for (let i = 0; i < inn.rawHeaders.length; i += 2) {
        const navn = inn.rawHeaders[i]!
        linjer.push(`${navn}: ${navn.toLowerCase() === 'host' ? mal.host : inn.rawHeaders[i + 1]}`)
      }
      videre.write(`${linjer.join('\r\n')}\r\n\r\n`)
      if (hode.length > 0) videre.write(hode)
      sokkel.pipe(videre).pipe(sokkel)
    })
    const lukk = () => {
      sokkel.destroy()
      videre.destroy()
    }
    videre.on('error', lukk)
    sokkel.on('error', lukk)
  })
  await new Promise<void>((ok, feil) => tjener.once('error', feil).listen(MELLOMPORT, '127.0.0.1', ok))
  return { url: `http://127.0.0.1:${MELLOMPORT}`, tjener }
}

/** Appen bygd mot mellomtjeneren foran den lokale databasen, servert på {@link PORT}. */
async function serverApp(s: Status, supabaseUrl: string): Promise<{ url: string; prosess: ChildProcess }> {
  const ut = join(MAPPE, 'app')
  // Som i produksjonen: vite-node setter NODE_ENV=development, og da ville appen
  // blitt bygget med Reacts utviklingsutgave (StrictMode monterer alt to ganger).
  const miljo = { ...process.env, NODE_ENV: 'production', VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_PUBLISHABLE_KEY: s.PUBLISHABLE_KEY }
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

/** Bare den lokale databasen (med Realtime), for kontroller uten nettleser. */
export async function startLokalDatabase(): Promise<Status> {
  mkdirSync(MAPPE, { recursive: true })
  await sikreDocker()
  return sikreDatabase()
}

export async function startLokaltMiljo(): Promise<LokaltMiljo> {
  const s = await startLokalDatabase()
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

/**
 * `npm run qa:lokal` starter miljøet og lar appen stå til Ctrl+C; `-- stopp`
 * stopper databasen. Kjent på npm-skriptet: vite-node gir ikke filen i
 * `process.argv`, bare argumentene etter den.
 */
if (process.env.npm_lifecycle_event === 'qa:lokal') {
  if (process.argv.slice(2).includes('stopp')) {
    supabase('stop', '--no-backup')
    logg('stoppet')
  } else {
    const m = await startLokaltMiljo()
    logg(`logg inn som «${m.brukernavn}» med passordet i ${join(MAPPE, 'passord.txt')}. Ctrl+C avslutter.`)
    process.on('SIGINT', () => void m.avslutt().then(() => process.exit(0)))
  }
}
