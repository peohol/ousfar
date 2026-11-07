/**
 * Skånsom måling av produksjonsdatabasen (docs/db-maling.md):
 *
 *   npm run db:maling -- maling  --historikk <fil.jsonl>   # legger én måling til historikken
 *   npm run db:maling -- rapport --historikk <fil.jsonl> […] # skriver sammenligningen i Markdown;
 *                                                          # flere historikkfiler slås sammen
 *
 * En måling henter maskinens metrikker én gang, gjør én liten skrivebeskyttet
 * spørring mot statistikktabellene og tre små spørringer mot loggene (som ikke
 * går mot databasen). Trafikken telles fra der forrige måling i historikken sluttet,
 * høyst 24 timer tilbake (grensen i logg-API-et), og fram til ti minutter før
 * nå, fordi loggene kommer fram med litt forsinkelse. Den belaster ikke appen
 * og endrer ingenting.
 *
 * Trenger `SUPABASE_ACCESS_TOKEN` (Management API). `SUPABASE_PROJECT_REF`
 * velger et annet prosjekt enn produksjonen.
 */
import { appendFileSync, existsSync, readFileSync } from 'node:fs'
import {
  beregningsstorrelse,
  fraMetrikker,
  lesHistorikk,
  lesMetrikker,
  rapport,
  type Funksjonsteller,
  type Maling,
  type Rpctrafikk,
  type Trafikk,
} from '../src/drift/dbmaling'

const REF = process.env.SUPABASE_PROJECT_REF || 'jfzqowsmjtthpbipnxnf'
const API = `https://api.supabase.com/v1/projects/${REF}`
const STANDARDVINDU_TIMER = 3
const MAKS_VINDU_TIMER = 24
const LOGGFORSINKELSE_MIN = 10

function stopp(melding: string): never {
  console.error(melding)
  process.exit(1)
}

async function hent(url: string, init: RequestInit = {}, forsok = 2): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const svar = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) })
      if (svar.ok || i >= forsok || svar.status < 500) return svar
    } catch (feil) {
      if (i >= forsok) throw feil
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
}

function token(): string {
  const t = process.env.SUPABASE_ACCESS_TOKEN
  if (!t) stopp('SUPABASE_ACCESS_TOKEN må være satt.')
  return t
}

async function management<T>(sti: string, init: RequestInit = {}): Promise<T> {
  const svar = await hent(`${API}${sti}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!svar.ok) throw new Error(`${sti.split('?')[0]} svarte ${svar.status}: ${(await svar.text()).slice(0, 300)}`)
  return (await svar.json()) as T
}

/** Skrivebeskyttet spørring mot databasen. */
async function sql<T>(sporring: string): Promise<T[]> {
  return management<T[]>('/database/query', { method: 'POST', body: JSON.stringify({ query: sporring, read_only: true }) })
}

/** ClickHouse-spørring mot loggene i tidsrommet. */
async function logger<T>(sporring: string, fra: string, til: string): Promise<T[]> {
  const q = new URLSearchParams({ sql: sporring, iso_timestamp_start: fra, iso_timestamp_end: til })
  const svar = await management<{ result?: T[]; error?: unknown }>(`/analytics/endpoints/logs?${q}`)
  if (svar.error || !svar.result) throw new Error(`Loggspørringen feilet: ${JSON.stringify(svar.error).slice(0, 300)}`)
  return svar.result
}

async function metrikker() {
  const nokler = await management<{ type: string; api_key?: string }[]>('/api-keys?reveal=true')
  const nokkel = nokler.find((n) => n.type === 'secret')?.api_key
  if (!nokkel) throw new Error('Fant ingen hemmelig API-nøkkel for metrikkene.')
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${nokkel}`)
  const svar = await hent(`https://${REF}.supabase.co/customer/v1/privileged/metrics`, {
    headers: { Authorization: `Basic ${Buffer.from(`service_role:${nokkel}`).toString('base64')}` },
  })
  if (!svar.ok) throw new Error(`Metrikkene svarte ${svar.status}.`)
  return fraMetrikker(lesMetrikker(await svar.text()))
}

const STATUS = "toInt32OrZero(log_attributes['response.status_code'])"
const STI = "log_attributes['request.path']"
const AGENT = "log_attributes['request.headers.user_agent']"
const SVARTID = "toFloat64OrZero(log_attributes['response.origin_time'])"
// Målingens eget kall til metrikkene går også gjennom API-et; det telles ikke.
const API_KALL = `source = 'edge_logs' and ${STI} not like '/customer/%'`

async function trafikk(fra: string, til: string): Promise<Trafikk> {
  const [[sum], rpc, [avbrudd]] = await Promise.all([
    logger<{ kall: number; feil5xx: number; automatisert: number }>(
      `select count() kall, countIf(${STATUS} >= 500) feil5xx,
         countIf(match(${AGENT}, '(?i)headless|playwright')) automatisert
       from logs where ${API_KALL}`,
      fra,
      til,
    ),
    logger<{ f: string; kall: number; feil5xx: number; p50: number; p95: number }>(
      `select extract(${STI}, '/rpc/([a-z0-9_]+)') f, count() kall, countIf(${STATUS} >= 500) feil5xx,
         round(quantile(0.5)(${SVARTID})) p50, round(quantile(0.95)(${SVARTID})) p95
       from logs where ${API_KALL} and ${STI} like '/rest/v1/rpc/%' group by f`,
      fra,
      til,
    ),
    logger<{ n: number }>(`select count() n from logs where source = 'postgres_logs' and event_message like '%statement timeout%'`, fra, til),
  ])
  const perRpc: Record<string, Rpctrafikk> = {}
  for (const r of rpc) if (r.f) perRpc[r.f] = { kall: Number(r.kall), feil5xx: Number(r.feil5xx), p50Ms: Number(r.p50), p95Ms: Number(r.p95) }
  return {
    fra,
    til,
    kall: Number(sum?.kall ?? 0),
    feil5xx: Number(sum?.feil5xx ?? 0),
    automatisert: Number(sum?.automatisert ?? 0),
    tidsavbrudd: Number(avbrudd?.n ?? 0),
    rpc: perRpc,
  }
}

interface Databasetall {
  db_bytes: string
  sist_migrering: string | null
  statistikk_fra: string | null
  funksjoner: Record<string, Funksjonsteller> | null
}

async function databasetall(): Promise<Databasetall> {
  // Bare katalog- og statistikkvisninger; ingen tabeller leses.
  const [rad] = await sql<Databasetall>(`
    select
      (select sum(pg_database_size(datname)) from pg_database)::text db_bytes,
      (select max(version) from supabase_migrations.schema_migrations) sist_migrering,
      (select stats_reset from extensions.pg_stat_statements_info)::text statistikk_fra,
      (select json_object_agg(f, json_build_object('kall', kall, 'totalMs', round(ms::numeric, 1), 'tempBlokker', temp))
         from (select substring(query from '"public"\\."(\\w+)"\\(') f, sum(calls) kall, sum(total_exec_time) ms, sum(temp_blks_written) temp
                 from extensions.pg_stat_statements where query like 'WITH pgrst_source%' group by 1) x
        where f is not null) funksjoner`)
  if (!rad) throw new Error('Databasespørringen ga ingen rad.')
  return rad
}

async function mal(historikkfil: string) {
  const historikk = existsSync(historikkfil) ? lesHistorikk(readFileSync(historikkfil, 'utf8')) : []
  const naa = new Date()
  // Loggene kommer fram med noen minutters forsinkelse, så trafikkvinduet slutter litt før nå
  // og begynner der forrige måling sluttet, slik at ingen kall telles to ganger eller faller ut.
  const til = new Date(naa.getTime() - LOGGFORSINKELSE_MIN * 60_000)
  const forrige = historikk.map((m) => Date.parse(m.trafikk.til)).sort((a, b) => b - a)[0]
  const tidligst = til.getTime() - MAKS_VINDU_TIMER * 3600_000
  const fra = new Date(forrige && forrige > tidligst && forrige < til.getTime() ? forrige : til.getTime() - STANDARDVINDU_TIMER * 3600_000)
  const [maskin, tillegg, db, api] = await Promise.all([
    metrikker(),
    management<unknown>('/billing/addons'),
    databasetall(),
    trafikk(fra.toISOString(), til.toISOString()),
  ])
  const funksjoner: Record<string, Funksjonsteller> = {}
  for (const [navn, f] of Object.entries(db.funksjoner ?? {})) {
    funksjoner[navn] = { kall: Number(f.kall), totalMs: Number(f.totalMs), tempBlokker: Number(f.tempBlokker) }
  }
  const maling: Maling = {
    versjon: 1,
    tid: naa.toISOString(),
    oppstart: maskin.oppstart,
    kapasitet: { beregning: beregningsstorrelse(tillegg), minneMB: maskin.minneMB },
    sistMigrering: db.sist_migrering,
    databaseMB: Math.round(Number(db.db_bytes) / 1e5) / 10,
    minne: maskin.minne,
    teller: maskin.teller,
    statistikkFra: db.statistikk_fra,
    funksjoner,
    trafikk: api,
  }
  appendFileSync(historikkfil, `${JSON.stringify(maling)}\n`)
  console.log(
    `Måling ${maling.tid}: ${maling.kapasitet.beregning}, ${maling.minne.ledigMB} MB ledig, ${maling.minne.swapBruktMB} MB swap, ` +
      `databasen ${maling.databaseMB} MB, ${api.kall} API-kall siden ${api.fra}.`,
  )
}

const argumenter = process.argv.slice(2).filter((a) => a !== '--')
const kommando = argumenter[0]
/** `--historikk` kan gis flere ganger til rapporten; en måling legges til den første. */
const filer = argumenter.flatMap((a, i) => (a === '--historikk' && argumenter[i + 1] ? [argumenter[i + 1] as string] : []))
const BRUK = 'Bruk: db-maling (maling|rapport) --historikk <fil.jsonl> [--historikk <fil.jsonl> …]'
const [forste] = filer
if (!forste) stopp(BRUK)

if (kommando === 'maling') {
  await mal(forste).catch((feil: unknown) => stopp(`Målingen feilet: ${feil instanceof Error ? feil.message : String(feil)}`))
} else if (kommando === 'rapport') {
  const unike = new Map<string, Maling>()
  for (const f of filer) if (existsSync(f)) for (const m of lesHistorikk(readFileSync(f, 'utf8'))) unike.set(m.tid, m)
  console.log(rapport([...unike.values()]))
} else {
  stopp(BRUK)
}
