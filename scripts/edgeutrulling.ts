/**
 * Utrullingen av Edge-funksjonene til produksjonen, med Supabase Management API.
 * GitHub Actions kjører stegene på `main` (`.github/workflows/edge-funksjoner.yml`);
 * bakgrunnen står i `docs/edge-funksjoner.md`.
 *
 *   npm run edgeutrulling -- kontroll
 *   npm run edgeutrulling -- utrull
 *   npm run edgeutrulling -- etterkontroll
 *
 * - `kontroll` sammenligner hver funksjon i repoet med den som kjører, og sier
 *   hva som skal rulles ut. Den stopper ved kode i produksjonen som ikke finnes
 *   i repoets historikk, og venter (uten å feile) når databasen mangler
 *   migrasjoner fra repoet. Den endrer ingenting.
 * - `utrull` gjør den samme kontrollen og ruller ut de funksjonene som avviker,
 *   én om gangen. Den første feilen stopper resten. Ingenting slettes.
 * - `etterkontroll` stopper hvis noen funksjon i repoet ikke kjører nøyaktig det
 *   repoet har, med riktig `verify_jwt`, eller ikke avviser et kall uten innlogging.
 *
 * Krever `SUPABASE_ACCESS_TOKEN` og `SUPABASE_PROJECT_REF`. `EDGE_OVERSKRIV`
 * (kommaseparerte funksjonsnavn) lar `utrull` overskrive kode i produksjonen
 * som ikke finnes i repoet; settes bare etter at avviket er undersøkt.
 */
import { execFileSync } from 'node:child_process'
import { appendFileSync, existsSync, readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  erFunksjonsmappe,
  funksjonsfiler,
  funksjonsoppsett,
  INNGANG,
  type Kildefiler,
  normaliserUtrullet,
  opplastingsnavn,
  planlegg,
  planTabell,
  type Repofunksjon,
  skalRullesUt,
  stoppendeAvvik,
  type Utrullet,
  Utrullingsfeil,
} from '../src/drift/edgefunksjoner'
import { migrasjoner } from './migrasjonsmappe'

const RELATIV = 'supabase/functions'
const ROT = fileURLToPath(new URL('../', import.meta.url))
const API = 'https://api.supabase.com/v1'

function sammendrag(tekst: string) {
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tekst}\n\n`)
}

function utdata(navn: string, verdi: string | number) {
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `${navn}=${verdi}\n`)
}

function stopp(melding: string): never {
  console.error(`\n${melding}`)
  sammendrag(`### Stoppet\n\n\`\`\`\n${melding}\n\`\`\``)
  process.exit(1)
}

function miljo(navn: string): string {
  const verdi = process.env[navn]
  if (!verdi) stopp(`${navn} mangler (se docs/edge-funksjoner.md).`)
  return verdi
}

const REF = miljo('SUPABASE_PROJECT_REF')
if (!/^[a-z0-9]{20}$/.test(REF)) stopp('SUPABASE_PROJECT_REF er ikke en gyldig prosjekt-ref.')
const PROSJEKT = `${API}/projects/${REF}`

/** Et kall til Management API-et. Lesekall prøves inntil tre ganger ved nettverks- og serverfeil; tokenet skrives aldri ut. */
async function api(sti: string, valg: RequestInit = {}, forsok = valg.method && valg.method !== 'GET' ? 1 : 3): Promise<Response> {
  for (let n = 1; ; n++) {
    try {
      const svar = await fetch(`${PROSJEKT}${sti}`, {
        ...valg,
        headers: { Authorization: `Bearer ${miljo('SUPABASE_ACCESS_TOKEN')}`, ...valg.headers },
      })
      if (svar.ok) return svar
      const tekst = (await svar.text()).slice(0, 500)
      if (svar.status < 500 || n >= forsok) stopp(`${valg.method ?? 'GET'} ${sti} svarte ${svar.status}: ${tekst}`)
    } catch (feil) {
      if (n >= forsok) stopp(`${valg.method ?? 'GET'} ${sti} feilet: ${(feil as Error).message}`)
    }
    await new Promise((r) => setTimeout(r, 2000 * n))
  }
}

// ── Repoet ────────────────────────────────────────────────────────────────

const git = (...args: string[]) => execFileSync('git', args, { cwd: ROT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

/** Funksjonens kildefiler slik de var i hver commit på `main` som endret `supabase/functions/`. */
function tidligereVersjoner(slug: string): Kildefiler[] {
  let commits: string[]
  try {
    commits = git('log', '--format=%H', '--reverse', '--', RELATIV).split('\n').filter(Boolean)
  } catch {
    return []
  }
  return commits.flatMap((c) => {
    try {
      return [
        funksjonsfiler(slug, (sti) => {
          try {
            return git('show', `${c}:${RELATIV}/${sti}`)
          } catch {
            return undefined
          }
        }),
      ]
    } catch {
      return []
    }
  })
}

function repofunksjoner(): Record<string, Repofunksjon> {
  const mappe = `${ROT}${RELATIV}`
  const oppsett = funksjonsoppsett(readFileSync(`${ROT}supabase/config.toml`, 'utf8'))
  const slugs = readdirSync(mappe, { withFileTypes: true })
    .filter((d) => d.isDirectory() && erFunksjonsmappe(d.name))
    .map((d) => d.name)
    .sort()
  const feil: string[] = []
  for (const slug of slugs) {
    if (!existsSync(`${mappe}/${slug}/${INNGANG}`)) feil.push(`${slug}: mangler ${INNGANG}`)
    if (!oppsett[slug]) feil.push(`${slug}: mangler [functions.${slug}] med verify_jwt i supabase/config.toml`)
  }
  for (const slug of Object.keys(oppsett)) if (!slugs.includes(slug)) feil.push(`config.toml har [functions.${slug}], men mappen finnes ikke`)
  if (feil.length) throw new Utrullingsfeil(feil.join('\n'))
  const les = (sti: string) => (existsSync(`${mappe}/${sti}`) ? readFileSync(`${mappe}/${sti}`, 'utf8') : undefined)
  return Object.fromEntries(
    slugs.map((slug) => [slug, { filer: funksjonsfiler(slug, les), verifyJwt: (oppsett[slug] as { verifyJwt: boolean }).verifyJwt, tidligere: tidligereVersjoner(slug) }]),
  )
}

// ── Produksjonen ──────────────────────────────────────────────────────────

interface Funksjonsliste {
  slug: string
  status: string
  version: number
  verify_jwt: boolean
}

async function utrullet(slug: string, liste: Funksjonsliste): Promise<Utrullet> {
  const svar = await api(`/functions/${encodeURIComponent(slug)}/body`, { headers: { Accept: 'multipart/form-data' } })
  const skjema = await svar.formData()
  const meta = JSON.parse(String(skjema.get('metadata') ?? '{}')) as { deno2_entrypoint_path?: string }
  if (!meta.deno2_entrypoint_path) stopp(`${slug}: Supabase oppga ikke inngangsfila til den utrullede versjonen.`)
  const filer: Record<string, string> = {}
  for (const del of skjema.getAll('file')) {
    if (typeof del === 'string') continue
    filer[del.name] = await del.text()
  }
  return {
    filer: normaliserUtrullet(slug, meta.deno2_entrypoint_path, filer),
    verifyJwt: liste.verify_jwt,
    status: liste.status,
    versjon: liste.version,
  }
}

async function produksjonsfunksjoner(): Promise<Record<string, Utrullet>> {
  const liste = (await (await api('/functions')).json()) as Funksjonsliste[]
  const ut: Record<string, Utrullet> = {}
  for (const f of liste) ut[f.slug] = await utrullet(f.slug, f)
  return ut
}

/** Migrasjonene i repoet som databasen ikke har kjørt ennå. */
async function ventendeMigrasjoner(): Promise<string[]> {
  const svar = await api('/database/query/read-only', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: 'select version from supabase_migrations.schema_migrations' }),
  }, 3)
  const kjort = new Set(((await svar.json()) as { version: string }[]).map((r) => String(r.version)))
  return migrasjoner().filter((m) => !kjort.has(m.versjon)).map((m) => m.versjon)
}

async function rullUt(slug: string, r: Repofunksjon) {
  const skjema = new FormData()
  skjema.append('metadata', JSON.stringify({ name: slug, entrypoint_path: INNGANG, verify_jwt: r.verifyJwt }))
  for (const [navn, innhold] of Object.entries(opplastingsnavn(slug, r.filer))) {
    skjema.append('file', new Blob([innhold], { type: 'application/typescript' }), navn)
  }
  const svar = await api(`/functions/deploy?slug=${encodeURIComponent(slug)}`, { method: 'POST', body: skjema })
  const ut = (await svar.json()) as { version?: number; status?: string }
  return `versjon ${ut.version ?? '?'} (${ut.status ?? '?'})`
}

// ── Stegene ───────────────────────────────────────────────────────────────

async function lagPlan() {
  const repo = repofunksjoner()
  const overskriv = (process.env.EDGE_OVERSKRIV ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const ukjent = overskriv.filter((s) => !repo[s])
  if (ukjent.length) stopp(`EDGE_OVERSKRIV nevner funksjoner som ikke finnes i repoet: ${ukjent.join(', ')}`)
  const plan = planlegg(repo, await produksjonsfunksjoner(), overskriv)
  console.log(planTabell(plan))
  sammendrag(`### Edge-funksjonene\n\n${planTabell(plan)}`)
  for (const p of plan.filter((p) => p.handling === 'bare-i-produksjonen')) {
    console.log(`::warning::Edge-funksjonen ${p.slug} finnes bare i produksjonen. Den røres ikke; se docs/edge-funksjoner.md.`)
  }
  return { repo, plan }
}

async function kontroll(): Promise<number> {
  const { plan } = await lagPlan()
  const avvik = stoppendeAvvik(plan)
  if (avvik.length) {
    stopp(
      'Produksjonen kjører kode som ikke finnes i repoets historikk. Ingenting er endret.\n' +
        `${avvik.map((p) => `- ${p.slug}: ${p.filer.join(', ')}`).join('\n')}\n` +
        'Undersøk avviket (docs/edge-funksjoner.md) før funksjonen overskrives.',
    )
  }
  const endres = skalRullesUt(plan)
  const venter = endres.length ? await ventendeMigrasjoner() : []
  utdata('endres', endres.length)
  utdata('venter', venter.length)
  const melding = !endres.length
    ? 'Produksjonen kjører det repoet har; ingenting å rulle ut.'
    : venter.length
      ? `${endres.length} funksjon(er) skal rulles ut, men databasen mangler ${venter.length} migrasjon(er) (${venter.join(', ')}). ` +
        'Utrullingen venter til produksjonsmigreringen har kjørt.'
      : `${endres.length} funksjon(er) skal rulles ut: ${endres.map((p) => p.slug).join(', ')}.`
  console.log(`\nKontrollen er bestått. ${melding}`)
  sammendrag(`**Kontroll:** ${melding}`)
  return endres.length
}

async function utrull() {
  const { repo, plan } = await lagPlan()
  const avvik = stoppendeAvvik(plan)
  if (avvik.length) stopp(`Stoppet før noe er endret: produksjonen kjører kode som ikke finnes i repoet (${avvik.map((p) => p.slug).join(', ')}).`)
  const endres = skalRullesUt(plan)
  const venter = endres.length ? await ventendeMigrasjoner() : []
  if (venter.length) stopp(`Stoppet før noe er endret: databasen mangler migrasjonene ${venter.join(', ')}. Kjør produksjonsmigreringen først.`)
  const ferdige: string[] = []
  for (const p of endres) {
    console.log(`Ruller ut ${p.slug} …`)
    try {
      ferdige.push(`- ${p.slug}: ${await rullUt(p.slug, repo[p.slug] as Repofunksjon)}`)
    } finally {
      if (ferdige.length) sammendrag(`**Rullet ut:**\n${ferdige.join('\n')}`)
    }
  }
  const melding = endres.length ? ferdige.join('\n') : 'Ingenting å rulle ut.'
  console.log(melding)
}

async function etterkontroll() {
  const repo = repofunksjoner()
  // Supabase kan bruke noen sekunder på å ta i bruk en ny versjon.
  let ulike: ReturnType<typeof planlegg> = []
  for (let forsok = 1; forsok <= 4; forsok++) {
    ulike = planlegg(repo, await produksjonsfunksjoner()).filter((p) => repo[p.slug] && p.handling !== 'uendret')
    if (!ulike.length) break
    if (forsok < 4) await new Promise((r) => setTimeout(r, 10_000))
  }
  if (ulike.length) stopp(`Etterkontrollen fant funksjoner som ikke kjører det repoet har:\n${planTabell(ulike)}`)
  // Funksjonene skal svare, og med verify_jwt avvise et kall uten innlogging.
  const feil: string[] = []
  for (const [slug, r] of Object.entries(repo)) {
    if (!r.verifyJwt) continue
    const svar = await fetch(`https://${REF}.supabase.co/functions/v1/${slug}`, { method: 'POST', body: '{}' })
    if (svar.status !== 401) feil.push(`${slug}: svarte ${svar.status} på et kall uten innlogging (ventet 401)`)
  }
  if (feil.length) stopp(`Etterkontrollen feilet:\n${feil.join('\n')}`)
  const melding = `Alle ${Object.keys(repo).length} funksjonene i repoet kjører nøyaktig det repoet har, og avviser kall uten innlogging.`
  console.log(`\n${melding}`)
  sammendrag(`**Etterkontroll:** ${melding}`)
}

const steg: Record<string, () => Promise<unknown>> = { kontroll, utrull, etterkontroll }
const valgt = process.argv.slice(2).find((a) => a !== '--')
if (!valgt || !(valgt in steg)) stopp(`Bruk: npm run edgeutrulling -- ${Object.keys(steg).join(' | ')}`)
;(steg[valgt] as () => Promise<unknown>)().catch((feil: unknown) =>
  stopp(feil instanceof Utrullingsfeil ? feil.message : `Uventet feil: ${(feil as Error).stack ?? String(feil)}`),
)
