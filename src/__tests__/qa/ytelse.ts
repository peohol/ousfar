/**
 * Ytelsesmålingen (Issue #500, `docs/ytelse-synlig-innlasting.md` §3,
 * resultatene i `docs/ytelse-maling.md`): hvor lang tid det går før brukeren
 * ser relevant innhold og kan bruke siden, i et produksjonsbygg i det lokale
 * testmiljøet (`docs/qa-testmiljo.md`), med syntetiske data
 * (`ytelsesdata.ts`). Aldri mot produksjonen: `maleside()` finnes bare lokalt.
 *
 *     npx vite-node src/__tests__/qa/ytelse.ts
 *
 * Miljø, valgfritt:
 * - `YTELSE_UT=<mappe>`: rapporten (`ytelse-rapport.md`) og rådataene
 *   (`ytelse-malinger.json`); standard en midlertidig mappe.
 * - `YTELSE_GJENTAKELSER=5`: gjentakelser per scenario og profil.
 * - `YTELSE_PROFILER=rask,treg`: nettverks- og maskinprofilene ({@link PROFILER}).
 * - `YTELSE_SCENARIER=kald,varm,…`: bare disse ({@link SCENARIER}).
 * - `YTELSE_PERSONER=50,500,5000`: personmengdene personsøket, «Brukere» og
 *   SQL-målingene kjøres for. De andre scenariene kjøres med den midterste.
 * - `YTELSE_SQL_GJENTAKELSER=5`: gjentakelser per SQL-kall.
 * - `YTELSE_FORTSETT=1`: fortsetter en avbrutt kjøring i den samme `YTELSE_UT`
 *   (rådataene lagres etter hver del).
 *
 * Merkene og hva de betyr står i `ytelsesmaler.js`.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, tmpdir, totalmem } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { SupabaseClient } from '@supabase/supabase-js'
import { arkiverTidligereGrupper, innen, klient, rpc, vent, type Side } from './kontroll'
import { lokalSql, sikreAdministrator, slaPaFunksjoner, startLokalDatabase, type Status } from './lokalmiljo'
import { apneTestmiljo, type Testmiljo } from './testmiljo'
import { datamengde, KOBLEDE_SIDER, MALEBOERE, sikreYtelsesdata, somBruker, type Ytelsesdata } from './ytelsesdata'
import { fordeling, hentetInnen, tabell, telling, visFordeling, type Ressurs } from './ytelsesmal'

const UT = process.env.YTELSE_UT ?? join(tmpdir(), 'ousfar-ytelse')
const GJENTAKELSER = Number(process.env.YTELSE_GJENTAKELSER ?? 5)
const SQL_GJENTAKELSER = Number(process.env.YTELSE_SQL_GJENTAKELSER ?? 5)
const PERSONMENGDER = (process.env.YTELSE_PERSONER ?? '50,500,5000').split(',').map(Number)
const HOVEDMENGDE = PERSONMENGDER[Math.floor((PERSONMENGDER.length - 1) / 2)]!
const MALER = readFileSync(fileURLToPath(new URL('./ytelsesmaler.js', import.meta.url)), 'utf8')
const VINDU = { viewport: { width: 1440, height: 900 } }
const GRENSE = 60_000

/**
 * Profilene. `rask`: maskinen og nettet i testmiljøet uten begrensning (det
 * beste tilfellet). `treg`: et vanlig sykehus-/mobilnett (80 ms ekstra per
 * forespørsel, 10/5 Mbit/s) og en maskin fire ganger tregere enn testmaskinen
 * (Chromiums CPU-struping), nærmere en eldre arbeidsstasjon eller mobil.
 */
const PROFILER = {
  rask: null,
  treg: { latency: 80, downloadThroughput: (10e6 / 8) | 0, uploadThroughput: (5e6 / 8) | 0, cpu: 4 },
} as const
type Profil = keyof typeof PROFILER
const PROFILVALG = (process.env.YTELSE_PROFILER ?? 'rask,treg').split(',') as Profil[]

interface Sidemaling {
  merker: Record<string, number>
  t0: number
  ressurser: Ressurs[]
  lange: [number, number][]
  referanser: [number, number, string][]
  personsok: [number, string, string, string[]][]
  tast: number | null
}

interface Kjoring {
  scenario: string
  profil: Profil
  personer: number
  nr: number
  merker: Record<string, number>
  /** Kall og kode hentet innen hvert merke. */
  innen: Record<string, ReturnType<typeof hentetInnen>>
  /** Summen av lange oppgaver (over 50 ms) til hvert merke: hvor lenge siden ikke svarte. */
  blokkert: Record<string, number>
  ekstra: Record<string, number | string | boolean>
}

const kjoringer: Kjoring[] = []
const sqlMalinger: { rpc: string; hvem: string; personer: number; sok: string; ms: ReturnType<typeof fordeling>; treff: number; blokker: number }[] = []
const serverkall: { scenario: string; profil: Profil; personer: number; kall: string; antall: number; snitt: number; maks: number }[] = []
/** Delene av kjøringen som er ferdige, så en avbrutt kjøring kan fortsette (`YTELSE_FORTSETT=1`). */
const ferdige = new Set<string>()
const MALINGSFIL = () => join(UT, 'ytelse-malinger.json')
/** Delen av kjøringen en måling hører til: scenariet (personsøkene samlet), profilen og personmengden. */
const delFor = (x: { scenario: string; profil: Profil; personer: number }) => `${x.scenario.startsWith('personsøk') ? 'personsøk' : x.scenario}:${x.profil}:${x.personer}`
const logg = (t: string) => console.log(`[ytelse] ${t}`)
mkdirSync(UT, { recursive: true })

// --- Siden -----------------------------------------------------------------------

async function nySide(miljo: Testmiljo, profil: Profil): Promise<Side> {
  const side = await miljo.maleside(VINDU)
  await side.addInitScript({ content: MALER })
  if (process.env.YTELSE_FEILSOK) {
    side.on('console', (m: Side) => m.type() === 'error' && logg(`konsoll: ${m.text()}`))
    side.on('response', (r: Side) => r.status() >= 400 && logg(`svar ${r.status()} ${r.url()}`))
    side.on('requestfailed', (r: Side) => logg(`feilet ${r.url()} ${r.failure()?.errorText}`))
  }
  const p = PROFILER[profil]
  if (p) {
    const cdp = side.__cdp
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: p.latency, downloadThroughput: p.downloadThroughput, uploadThroughput: p.uploadThroughput })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: p.cpu })
  }
  return side
}

const lukk = (side: Side) => side.context().close().catch(() => undefined)

async function merke(side: Side, navn: string, ms = GRENSE): Promise<number> {
  try {
    await innen(ms, `merket «${navn}»`, async () => (await side.evaluate((n: string) => (window as never as { __ytelse: { merker: Record<string, number> } }).__ytelse.merker[n] !== undefined, navn)) as boolean, 50)
  } catch (e) {
    await side.screenshot({ path: join(UT, `feil-${navn}-${Date.now()}.png`) }).catch(() => undefined)
    throw e
  }
  return side.evaluate((n: string) => (window as never as { __ytelse: { merker: Record<string, number> } }).__ytelse.merker[n], navn)
}

const nullstill = (side: Side) => side.evaluate(() => (window as never as { __ytelse: { nullstill(): void } }).__ytelse.nullstill())

async function les(side: Side): Promise<Sidemaling> {
  return side.evaluate(() => {
    const y = (window as never as { __ytelse: Sidemaling & { t0: number } }).__ytelse
    const her = location.origin
    const ressurser = performance.getEntriesByType('resource').map((e) => {
      const r = e as PerformanceResourceTiming
      const u = new URL(r.name)
      return { sti: u.pathname, egen: u.origin === her, start: r.startTime, slutt: r.responseEnd, overfort: r.transferSize, kropp: r.encodedBodySize, utpakket: r.decodedBodySize }
    })
    return { merker: y.merker, t0: y.t0, ressurser, lange: y.lange, referanser: y.referanser, personsok: y.personsok, tast: y.tast }
  })
}

/** Fører kjøringen: merkene, og det som var hentet og blokkert innen hvert av dem. */
function forKjoring(scenario: string, profil: Profil, personer: number, nr: number, m: Sidemaling, ekstra: Kjoring['ekstra'] = {}): Kjoring {
  const innen: Kjoring['innen'] = {}
  const blokkert: Kjoring['blokkert'] = {}
  for (const [navn, t] of Object.entries(m.merker)) {
    innen[navn] = hentetInnen(m.ressurser, m.t0, m.t0 + t)
    blokkert[navn] = m.lange.filter(([s]) => s >= m.t0 && s <= m.t0 + t).reduce((sum, [, d]) => sum + d, 0)
  }
  const k = { scenario, profil, personer, nr, merker: m.merker, innen, blokkert, ekstra }
  kjoringer.push(k)
  logg(`${scenario} ${profil} #${nr}: ${Object.entries(m.merker).map(([n, t]) => `${n} ${Math.round(t)}`).join(', ')}`)
  return k
}

async function loggInn(side: Side, url: string, brukernavn: string, passord: string) {
  await side.goto(url)
  await side.waitForSelector('input[name=username]', { timeout: GRENSE })
  await side.fill('input[name=username]', brukernavn)
  await side.fill('input[name=password]', passord)
  await nullstill(side)
  await side.click('button:has-text("Logg inn")')
}

/** Den første vellykkede handlingen: fagsøket (Ctrl + K) med et stoffnavn, til første treff. */
async function fagsok(side: Side, stoffnavn: string) {
  await side.keyboard.press('Control+k')
  await side.keyboard.type(stoffnavn, { delay: 20 })
  await merke(side, 'fagsok_svar')
}

// --- Serverens side: pg_stat_statements ------------------------------------------

function nullstillServer(s: Status) {
  lokalSql(s, 'select pg_stat_statements_reset()')
}

/** De tyngste kallene fra appen (rollene API-et bruker) siden forrige nullstilling. */
function lesServer(s: Status, scenario: string, profil: Profil, personer: number) {
  const rader = lokalSql(
    s,
    `select coalesce(json_agg(r), '[]') from (
       select query, calls, mean_exec_time, max_exec_time from pg_stat_statements
       where userid in (select oid from pg_roles where rolname in ('authenticated', 'anon', 'authenticator', 'service_role'))
       order by total_exec_time desc limit 40) r`,
  )
  const navngitt = new Map<string, { antall: number; sum: number; maks: number }>()
  for (const r of JSON.parse(rader) as { query: string; calls: number; mean_exec_time: number; max_exec_time: number }[]) {
    const navn = /"public"\."([a-z_0-9]+)"/.exec(r.query)?.[1] ?? /from "?([a-z_0-9.]+)"?/i.exec(r.query)?.[1] ?? r.query.slice(0, 40)
    const n = navngitt.get(navn) ?? { antall: 0, sum: 0, maks: 0 }
    n.antall += r.calls
    n.sum += r.calls * r.mean_exec_time
    n.maks = Math.max(n.maks, r.max_exec_time)
    navngitt.set(navn, n)
  }
  for (const [kall, n] of navngitt) serverkall.push({ scenario, profil, personer, kall, antall: n.antall, snitt: n.sum / n.antall, maks: n.maks })
}

/** Koden hentet fra siden ble åpnet (også innloggingssiden) til merket: hele oppstarten. */
function medHeleOppstarten(m: Sidemaling, til: string): [Sidemaling, Kjoring['ekstra']] {
  const i = hentetInnen(m.ressurser, 0, m.t0 + (m.merker[til] ?? 0))
  return [m, { kodeOverfort: i.kodeOverfort, kodeUtpakket: i.kodeUtpakket, stilOverfort: i.stilOverfort, kodefiler: i.kodefiler.length }]
}

// --- Scenariene ------------------------------------------------------------------

interface Kontekst {
  miljo: Testmiljo
  s: Status
  data: Ytelsesdata
  admin: { brukernavn: string; passord: string; id: string; klient: SupabaseClient }
  gruppe: string
  fagmiljonavn: { standard: string; annet: string }
}

/**
 * En side innlogget som administratoren, på forsiden med panelene hentet og
 * nettet i ro (også fagsøkets indeks, som hentes når appen er ledig). Økten,
 * det appen lagret (IndexedDB) og hurtigbufferen hører til den samme
 * konteksten, slik de gjør i en vanlig nettleser.
 */
async function varmForside(k: Kontekst, profil: Profil): Promise<Side> {
  const side = await nySide(k.miljo, profil)
  await loggInn(side, k.miljo.url, k.admin.brukernavn, k.admin.passord)
  await merke(side, 'forside_paneler')
  await side.waitForLoadState('networkidle')
  return side
}

const koblet = (k: Kontekst, nr: number) => k.data.fagsider[nr % KOBLEDE_SIDER]!
const stoffnavn = (slug: string) => `Syntetisk stoff ${slug.replace('syntetisk-stoff-', '')}`

/**
 * Referanselisten fra den først ble vist til den siste: hvor mange ganger den
 * ble vist på nytt, hvor mange referanser som fikk et annet nummer, og hvor
 * mange som kom til.
 */
function referansestabilitet(m: Sidemaling): Record<string, number> {
  const lister = m.referanser.map(([, , avtrykk]) => new Map(avtrykk.split('|').filter(Boolean).map((x) => x.split(':').reverse() as [string, string])))
  const forste = lister[0] ?? new Map<string, string>()
  const siste = lister.at(-1) ?? new Map<string, string>()
  return {
    referanser: siste.size,
    listevisninger: lister.length,
    nyttNummer: [...forste].filter(([id, nr]) => siste.has(id) && siste.get(id) !== nr).length,
    lagtTil: [...siste.keys()].filter((id) => !forste.has(id)).length,
  }
}

type Scenario = (k: Kontekst, profil: Profil, nr: number) => Promise<void>

const SCENARIER: Record<string, Scenario> = {
  /** Kald oppstart: tom nettleser, innlogging, forsiden og første fagsøk (startet så snart toppmenyen står). */
  async kald(k, profil, nr) {
    const side = await nySide(k.miljo, profil)
    try {
      await loggInn(side, k.miljo.url, k.admin.brukernavn, k.admin.passord)
      await merke(side, 'skall')
      await fagsok(side, stoffnavn(koblet(k, nr)))
      await merke(side, 'forside_paneler')
      await vent(300)
      forKjoring('kald', profil, HOVEDMENGDE, nr, ...medHeleOppstarten(await les(side), 'forside_paneler'))
    } finally {
      await lukk(side)
    }
  },

  /** Varm oppstart: gyldig økt, det appen lagret, og nettleserens hurtigbuffer fra en tidligere innlasting. */
  async varm(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      await side.goto('about:blank')
      await side.goto(`${k.miljo.url}/#/`)
      await merke(side, 'skall')
      await fagsok(side, stoffnavn(koblet(k, nr)))
      await merke(side, 'forside_paneler')
      forKjoring('varm', profil, HOVEDMENGDE, nr, ...medHeleOppstarten(await les(side), 'forside_paneler'))
    } finally {
      await lukk(side)
    }
  },

  /** Fra forsiden til en fagside (koblet til FEST): navnet, panelene og alle kildene. */
  async fagside(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      await nullstill(side)
      await side.evaluate((slug: string) => (location.hash = `#/stoff/${slug}`), koblet(k, nr))
      await merke(side, 'fagside_komplett')
      await vent(1500)
      const m = await les(side)
      forKjoring('fagside', profil, HOVEDMENGDE, nr, m, referansestabilitet(m))
    } finally {
      await lukk(side)
    }
  },

  /** Direkte lenke til en fagside i en ny fane (økten og hurtigbufferen er der). */
  async direkte(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      await side.goto('about:blank')
      await side.goto(`${k.miljo.url}/#/stoff/${koblet(k, nr)}`)
      await merke(side, 'fagside_komplett')
      await vent(1500)
      const m = await les(side)
      forKjoring('direkte', profil, HOVEDMENGDE, nr, m, referansestabilitet(m))
    } finally {
      await lukk(side)
    }
  },

  /** Fra forsiden til fortolkningen: søkefeltet, og første treff i analyttsøket. */
  async fortolkning(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      await nullstill(side)
      await side.getByRole('button', { name: 'Åpne fortolkning' }).click()
      await merke(side, 'fortolkning')
      await side.keyboard.type('Escit', { delay: 20 })
      await merke(side, 'fortolkning_treff')
      forKjoring('fortolkning', profil, HOVEDMENGDE, nr, await les(side))
    } finally {
      await lukk(side)
    }
  },

  /** Administrasjon → Brukere: fra trykket på «Brukere» til medlemslisten står. */
  async brukere(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      await side.keyboard.press('Control+m')
      const meny = side.getByRole('navigation', { name: 'Meny' })
      await meny.getByRole('button', { name: /^Administrasjon/ }).click()
      await nullstill(side)
      await meny.getByRole('button', { name: 'Brukere' }).click()
      await merke(side, 'brukere')
      forKjoring('brukere', profil, k.data.personer, nr, await les(side))
    } finally {
      await lukk(side)
    }
  },

  /** Bytte arbeidsfagmiljø i kontomenyen: til det nye navnet og panelene står. Annenhver gang hver vei. */
  async fagmiljobytte(k, profil, nr) {
    const side = await varmForside(k, profil)
    try {
      const fra = await side.locator('.forside__tittel').innerText()
      const til = fra === k.fagmiljonavn.standard ? k.fagmiljonavn.annet : k.fagmiljonavn.standard
      await side.getByRole('button', { name: /^Kontoen din/ }).click()
      await side.getByText(/^Fagmiljø: /).click()
      await side.evaluate((t: string) => {
        const y = (window as never as { __ytelse: { nullstill(): void; forventetTittel: string | null } }).__ytelse
        y.nullstill()
        y.forventetTittel = t
      }, til)
      await side.locator('ul[aria-label="Fagmiljøet du arbeider i"] button').filter({ hasText: til }).first().click()
      await merke(side, 'forside_tittel')
      await merke(side, 'forside_paneler').catch(() => undefined)
      // Panelene kan ha stått ferdige fra før byttet; de regnes fra når det nye navnet står.
      forKjoring('fagmiljobytte', profil, HOVEDMENGDE, nr, await les(side), { retning: `${fra} → ${til}` })
    } finally {
      await lukk(side)
    }
  },
}

// --- Personsøket -----------------------------------------------------------------

interface Sokested {
  navn: string
  rpc: string
  hvem: string
  /** Åpner søkefeltet og gir det. */
  apne(side: Side, k: Kontekst): Promise<Side>
  /** Svaret databasen gir den innloggede for søket: navnene i rekkefølge. */
  fasit(k: Kontekst, sok: string): Promise<string[]>
}

const navnene = (treff: { first_name: string; last_name: string }[]) => treff.map((t) => `${t.first_name} ${t.last_name}`.trim())

/**
 * Søkene, ett per gjentakelse, så hver gjentakelse er et nytt søk (komponenten
 * husker svarene på søk den har gjort): navn og etternavn, skrivefeil, aksenter
 * og nordiske tegn, tomt treff og rask skriving. «Gjentatt søk» gjentar det
 * første, og måler det komponenten husker.
 */
const SOKENE = {
  // Personene blant de første 50 (ytelsesdata.ts), så søkene har treff i alle personmengdene.
  vanlig: ['nils johansen', 'emma grønli', 'siv rød', 'noah andersen', 'nora lie'],
  skrivefeil: ['johanssen', 'gronnli', 'andersne', 'jensn', 'karlsne'],
  aksent: ['jose', 'muller', 'goran', 'haland', 'ase holm'],
  tomt: ['xqzwvy', 'qqxzzv', 'zzqxwy', 'wqxzzy', 'yxqzwz'],
  rask: ['bjørn müller', 'solveig fjære', 'linh jensen', 'mai håland', 'gøran tran'],
  foreldet: [['solveig', 'siv'], ['emma', 'mai'], ['nora', 'noah'], ['linh', 'nils'], ['jose', 'bjørn']],
} as const
const nte = <T,>(liste: readonly T[], nr: number): T => liste[(nr - 1) % liste.length]!

function sokesteder(k: Kontekst, klienter: { lokal: SupabaseClient; medlem: SupabaseClient }): Sokested[] {
  const { standard } = k.data.fagmiljo
  return [
    {
      navn: 'gruppeinvitasjon',
      rpc: 'sok_gruppekandidater',
      hvem: 'systemarkitekt',
      async apne(side) {
        await side.goto(`${k.miljo.url}/#/grupper/${k.gruppe}`)
        await side.getByRole('button', { name: /Vis medlemmer/ }).click({ timeout: GRENSE })
        const felt = side.getByRole('dialog', { name: 'Medlemmer' }).getByRole('combobox', { name: 'Inviter' })
        await felt.waitFor({ timeout: GRENSE })
        return felt
      },
      fasit: async (kk, sok) => navnene(await rpc(kk.admin.klient, 'sok_gruppekandidater', { gruppe: kk.gruppe, sok })),
    },
    {
      navn: 'medlemskandidater',
      rpc: 'sok_medlemskandidater',
      hvem: 'systemarkitekt',
      async apne(side) {
        await side.goto(`${k.miljo.url}/#/`)
        await merke(side, 'forside')
        await side.keyboard.press('Control+m')
        const meny = side.getByRole('navigation', { name: 'Meny' })
        await meny.getByRole('button', { name: /^Administrasjon/ }).click()
        await meny.getByRole('button', { name: 'Brukere' }).click()
        const vindu = side.getByRole('dialog', { name: 'Brukere' })
        await vindu.getByRole('button', { name: 'Legg til medlem' }).click({ timeout: GRENSE })
        return vindu.getByRole('combobox', { name: 'Legg til medlem' })
      },
      fasit: async (kk, sok) => navnene(await rpc(kk.admin.klient, 'sok_medlemskandidater', { fagmiljo: standard, sok })),
    },
    {
      navn: 'direktemelding',
      rpc: 'sok_direktemottakere',
      hvem: 'medlem',
      async apne(side) {
        await side.goto(`${k.miljo.url}/#/chat`)
        await side.getByRole('button', { name: 'Ny chat' }).first().click({ timeout: GRENSE })
        const felt = side.getByRole('combobox', { name: 'Søk etter navn eller brukernavn' })
        await felt.waitFor({ timeout: GRENSE })
        return felt
      },
      fasit: async (_kk, sok) => navnene(await rpc(klienter.medlem, 'sok_direktemottakere', { sok })),
    },
  ]
}

/** Navnene personsøket viser nå. */
const viste = async (side: Side): Promise<string[]> =>
  ((await side.locator('.personsok__treff [role="option"] .personsok__navn').allInnerTexts()) as string[])
    .map((t) => t.trim())
    // Reservevalget for et nøyaktig brukernavn er ikke et treff fra databasen.
    .filter((t) => !t.startsWith('Bruk brukernavnet «'))

/**
 * Ett søk: skriver `sok` (med `forsinkelse` mellom tastene), venter svaret og
 * gir tidene etter siste tastetrykk: til kallet gikk (pausen), til svaret kom
 * (nettverk og server) og til treffene stod (visningen).
 */
async function sok(side: Side, felt: Side, rpcNavn: string, tekst: string, forsinkelse = 60) {
  await felt.fill('')
  await vent(400)
  await nullstill(side)
  await felt.focus()
  await side.keyboard.type(tekst, { delay: forsinkelse })
  await merke(side, 'personsok', 30_000)
  await vent(150)
  const m = await les(side)
  const tast = m.tast! - m.t0
  const kall = m.ressurser.filter((r) => r.sti.endsWith(`/rpc/${rpcNavn}`) && r.start >= m.t0)
  const siste = kall.filter((r) => r.start - m.t0 >= tast - 5).at(-1)
  const svar = m.merker.personsok! - tast
  return {
    m,
    tider: {
      svar,
      pause: siste ? siste.start - m.t0 - tast : null,
      nettverk: siste ? siste.slutt - siste.start : null,
      visning: siste ? m.merker.personsok! - (siste.slutt - m.t0) : null,
      kall: kall.length,
    },
  }
}

async function personsok(k: Kontekst, profil: Profil, klienter: { lokal: SupabaseClient; medlem: SupabaseClient }, passord: Record<string, string>) {
  for (const sted of sokesteder(k, klienter)) {
    const brukernavn = sted.hvem === 'medlem' ? MALEBOERE.medlem : k.admin.brukernavn
    const side = await nySide(k.miljo, profil)
    try {
      await loggInn(side, k.miljo.url, brukernavn, passord[brukernavn]!)
      await merke(side, 'skall')
      const felt = await sted.apne(side, k)
      const fasit = new Map<string, string[]>()
      const riktig = async (sokeord: string) => {
        if (!fasit.has(sokeord)) fasit.set(sokeord, await sted.fasit(k, sokeord))
        const vist = await viste(side)
        return JSON.stringify(vist) === JSON.stringify(fasit.get(sokeord))
      }
      for (let nr = 1; nr <= GJENTAKELSER; nr++) {
        const forste = nte(SOKENE.vanlig, nr)
        const tilfeller: [string, string, number][] = [
          ['første søk', forste, 60],
          ['gjentatt søk', forste, 60],
          ['skrivefeil', nte(SOKENE.skrivefeil, nr), 60],
          ['aksent', nte(SOKENE.aksent, nr), 60],
          ['tomt treff', nte(SOKENE.tomt, nr), 60],
          ['rask skriving', nte(SOKENE.rask, nr), 15],
        ]
        for (const [tilfelle, tekst, forsinkelse] of tilfeller) {
          const { m, tider } = await sok(side, felt, sted.rpc, tekst, forsinkelse)
          const ok = tilfelle === 'tomt treff' ? (await viste(side)).length === 0 : await riktig(tekst)
          forKjoring(`personsøk ${sted.navn}: ${tilfelle}`, profil, k.data.personer, nr, m, {
            svar: tider.svar,
            ...(tider.pause !== null && { pause: tider.pause }),
            ...(tider.nettverk !== null && { nettverk: tider.nettverk }),
            ...(tider.visning !== null && { visning: tider.visning }),
            kall: tider.kall,
            riktig: ok,
          })
        }
        // Feil: databasen svarer med en feil (syntetisk, i nettleseren).
        await side.route(`**/rest/v1/rpc/${sted.rpc}`, (r: Side) =>
          r.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ code: 'XX000', message: 'Syntetisk feil i målingen.' }) }),
        )
        const feil = await sok(side, felt, sted.rpc, `feil ${nr}`)
        const varsel = await side.locator('.personsok [role="alert"]').count()
        forKjoring(`personsøk ${sted.navn}: feil`, profil, k.data.personer, nr, feil.m, { svar: feil.tider.svar, kall: feil.tider.kall, riktig: varsel > 0 })
        await side.unroute(`**/rest/v1/rpc/${sted.rpc}`)
        // Lang responstid: det første søket svarer 2 s for sent, og et nytt søk skrives før det.
        const [gammelt, nytt] = nte(SOKENE.foreldet, nr)
        await side.route(`**/rest/v1/rpc/${sted.rpc}`, async (r: Side) => {
          const kropp = JSON.parse(r.request().postData() ?? '{}') as { sok?: string }
          if (kropp.sok === gammelt) await vent(2000)
          return r.fallback()
        })
        await felt.fill('')
        await vent(400)
        await nullstill(side)
        await felt.focus()
        await side.keyboard.type(gammelt, { delay: 40 })
        await vent(450)
        await felt.fill('')
        const treg = await sok(side, felt, sted.rpc, nytt, 40)
        await vent(2300)
        const etter = await les(side)
        const foreldet = etter.personsok.some(([, verdi, , navn]) => {
          const treff = navn.filter((x) => !x.startsWith('Bruk brukernavnet «'))
          return verdi === nytt && treff.length > 0 && JSON.stringify(treff) !== JSON.stringify(fasit.get(nytt) ?? treff)
        })
        const stod = await riktig(nytt)
        forKjoring(`personsøk ${sted.navn}: sent svar på forrige søk`, profil, k.data.personer, nr, treg.m, { svar: treg.tider.svar, kall: treg.tider.kall, riktig: stod && !foreldet })
        await side.unroute(`**/rest/v1/rpc/${sted.rpc}`)
      }
    } finally {
      await lukk(side)
    }
  }
}

// --- SQL-målingen ----------------------------------------------------------------

interface Plan {
  'Execution Time': number
  Plan: { 'Shared Hit Blocks'?: number; 'Shared Read Blocks'?: number; 'Temp Written Blocks'?: number }
}

/** Kjøretiden i databasen for personsøkene, med EXPLAIN (ANALYZE, BUFFERS), som hver av måleboerne. */
function sqlPersonsok(k: Kontekst, ider: Record<'admin' | 'lokal' | 'medlem', string>) {
  const kall: { rpc: string; hvem: keyof typeof ider; sql: (sok: string) => string }[] = [
    { rpc: 'sok_gruppekandidater', hvem: 'admin', sql: (sok) => `public.sok_gruppekandidater('${k.gruppe}', '${sok}')` },
    { rpc: 'sok_medlemskandidater', hvem: 'admin', sql: (sok) => `public.sok_medlemskandidater('${k.data.fagmiljo.standard}', '${sok}')` },
    { rpc: 'sok_medlemskandidater', hvem: 'lokal', sql: (sok) => `public.sok_medlemskandidater('${k.data.fagmiljo.standard}', '${sok}')` },
    { rpc: 'sok_direktemottakere', hvem: 'medlem', sql: (sok) => `public.sok_direktemottakere('${sok}')` },
  ]
  for (const c of kall) {
    for (const sokeord of [SOKENE.vanlig[0], SOKENE.skrivefeil[0], 'an']) {
      const tider: number[] = []
      let treff = 0
      let blokker = 0
      for (let i = 0; i <= SQL_GJENTAKELSER; i++) {
        const svar = lokalSql(k.s, `begin; ${somBruker(ider[c.hvem])} explain (analyze, buffers, format json) select ${c.sql(sokeord)}; rollback;`)
        const plan = (JSON.parse(svar) as Plan[])[0]!
        if (i === 0) continue // første kjøring varmer opp
        tider.push(plan['Execution Time'])
        blokker = (plan.Plan['Shared Hit Blocks'] ?? 0) + (plan.Plan['Shared Read Blocks'] ?? 0)
      }
      treff = (JSON.parse(lokalSql(k.s, `begin; ${somBruker(ider[c.hvem])} select ${c.sql(sokeord)}; rollback;`)) as unknown[]).length
      sqlMalinger.push({ rpc: c.rpc, hvem: c.hvem === 'admin' ? 'systemarkitekt' : c.hvem === 'lokal' ? 'lokal administrator' : 'medlem', personer: k.data.personer, sok: sokeord, ms: fordeling(tider), treff, blokker })
      logg(`SQL ${c.rpc} (${c.hvem}, ${k.data.personer} personer, «${sokeord}»): ${visFordeling(fordeling(tider))}`)
    }
  }
}

// --- Rapporten -------------------------------------------------------------------

/** Merkene som hører til hvert scenario, i rekkefølgen de kommer. */
const MERKER: Record<string, readonly string[]> = {
  kald: ['skall', 'forside', 'forside_tittel', 'fagsok_svar', 'fagsok_feil', 'forside_paneler'],
  varm: ['skall', 'forside', 'forside_tittel', 'fagsok_svar', 'fagsok_feil', 'forside_paneler'],
  fagside: ['fagside_navn', 'fagside_innhold', 'fagside_komplett'],
  direkte: ['skall', 'fagside_navn', 'fagside_innhold', 'fagside_komplett'],
  fortolkning: ['fortolkning', 'fortolkning_treff'],
  fagmiljobytte: ['forside_tittel', 'forside_paneler'],
  brukere: ['brukere'],
}

const grupper = <T extends { profil: Profil; personer: number }>(liste: readonly T[], nokkel: (x: T) => string) => {
  const ut = new Map<string, T[]>()
  for (const x of liste) ut.set(nokkel(x), [...(ut.get(nokkel(x)) ?? []), x])
  return [...ut.values()]
}
const antall = (f: ReturnType<typeof fordeling>) => (f ? (f.n === 1 || f.min === f.maks ? String(f.median) : `${f.median} (${f.min}–${f.maks})`) : '–')
const andel = (verdier: unknown[]) => `${verdier.filter((v) => v === true).length}/${verdier.length}`

function rapport(miljoinfo: Record<string, unknown>, mengder: Record<number, Record<string, number>>): string {
  const deler: string[] = []
  deler.push(`# Ytelsesmåling ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC`)
  deler.push(`Miljø: \`${JSON.stringify(miljoinfo)}\``)
  deler.push(`Datagrunnlag per personmengde: \`${JSON.stringify(mengder)}\``)

  const app = kjoringer.filter((k) => MERKER[k.scenario])
  const rader: string[][] = []
  for (const liste of grupper(app, (k) => `${k.scenario}|${k.profil}|${k.personer}`)) {
    const { scenario, profil, personer } = liste[0]!
    for (const m of MERKER[scenario]!) {
      const verdier = liste.map((k) => k.merker[m])
      if (verdier.every((v) => v === undefined)) continue
      const kode = (f: (i: Kjoring['innen'][string]) => number) => visFordeling(fordeling(liste.map((k) => (k.innen[m] ? f(k.innen[m]!) : undefined))), true)
      rader.push([
        scenario,
        profil,
        String(personer),
        m,
        `${visFordeling(fordeling(verdier))}${verdier.some((v) => v === undefined) ? ` (${verdier.filter((v) => v !== undefined).length}/${verdier.length})` : ''}`,
        antall(fordeling(liste.map((k) => k.innen[m]?.api.length))),
        `${kode((i) => i.kodeOverfort)} / ${kode((i) => i.kodeUtpakket)}`,
        visFordeling(fordeling(liste.map((k) => k.blokkert[m]))),
      ])
    }
  }
  deler.push('## Appen: tid til hvert merke (fra handlingen)')
  deler.push(
    tabell(['Scenario', 'Profil', 'Personer', 'Merke', 'Tid: median (p95; min–maks)', 'API-kall startet innen', 'JS hentet innen: overført / utpakket', 'Lange oppgaver innen (sum)'], rader),
  )

  const fagsider = app.filter((k) => k.scenario === 'fagside' || k.scenario === 'direkte')
  deler.push('## Fagsiden: referanselisten mens kildene kommer')
  deler.push(
    tabell(
      ['Scenario', 'Profil', 'Referanser til slutt', 'Visninger av listen', 'Referanser som fikk nytt nummer', 'Referanser lagt til etter første visning'],
      grupper(fagsider, (k) => `${k.scenario}|${k.profil}`).map((l) => [
        l[0]!.scenario,
        l[0]!.profil,
        antall(fordeling(l.map((k) => k.ekstra.referanser as number))),
        antall(fordeling(l.map((k) => k.ekstra.listevisninger as number))),
        antall(fordeling(l.map((k) => k.ekstra.nyttNummer as number))),
        antall(fordeling(l.map((k) => k.ekstra.lagtTil as number))),
      ]),
    ),
  )

  const sok = kjoringer.filter((k) => k.scenario.startsWith('personsøk'))
  deler.push('## Personsøket: fra siste tastetrykk til svaret står')
  deler.push(
    tabell(
      ['Søket', 'Profil', 'Personer', 'Svar: median (p95; min–maks)', 'Pause før kallet', 'Kallet (nett og server)', 'Visning', 'Kall per søk', 'Riktige treff'],
      grupper(sok, (k) => `${k.scenario}|${k.profil}|${k.personer}`).map((l) => {
        const f = (n: string) => visFordeling(fordeling(l.map((k) => k.ekstra[n] as number | undefined)))
        return [l[0]!.scenario.replace('personsøk ', ''), l[0]!.profil, String(l[0]!.personer), f('svar'), f('pause'), f('nettverk'), f('visning'), antall(fordeling(l.map((k) => k.ekstra.kall as number))), andel(l.map((k) => k.ekstra.riktig))]
      }),
    ),
  )

  deler.push('## Oppstarten: kode og stil hentet fra siden ble åpnet til panelene på forsiden står')
  deler.push(
    tabell(
      ['Scenario', 'Profil', 'JS overført', 'JS utpakket', 'CSS overført', 'Kodefiler'],
      grupper(app.filter((k) => k.scenario === 'kald' || k.scenario === 'varm'), (k) => `${k.scenario}|${k.profil}`).map((l) => [
        l[0]!.scenario,
        l[0]!.profil,
        visFordeling(fordeling(l.map((k) => k.ekstra.kodeOverfort as number)), true),
        visFordeling(fordeling(l.map((k) => k.ekstra.kodeUtpakket as number)), true),
        visFordeling(fordeling(l.map((k) => k.ekstra.stilOverfort as number)), true),
        antall(fordeling(l.map((k) => k.ekstra.kodefiler as number))),
      ]),
    ),
  )

  const kallrader: string[][] = []
  for (const liste of grupper(app, (k) => `${k.scenario}|${k.profil}`)) {
    const forste = liste[0]!
    for (const m of MERKER[forste.scenario]!) if (forste.innen[m]) kallrader.push([forste.scenario, forste.profil, m, telling(forste.innen[m]!.api) || '–'])
  }
  deler.push('## API-kall startet før merket (første gjentakelse)')
  deler.push(tabell(['Scenario', 'Profil', 'Merke', 'Kall'], kallrader))

  deler.push('## SQL: personsøkene i databasen (EXPLAIN ANALYZE, uten nett)')
  deler.push(
    tabell(
      ['RPC', 'Hvem', 'Personer', 'Søk', 'Kjøretid: median (p95; min–maks)', 'Treff', 'Blokker lest'],
      sqlMalinger.map((m) => [m.rpc, m.hvem, String(m.personer), `«${m.sok}»`, visFordeling(m.ms), String(m.treff), String(m.blokker)]),
    ),
  )
  deler.push('## Serverens tid per kall (pg_stat_statements, alle gjentakelser i scenariet, over 0,5 ms i snitt)')
  deler.push(
    tabell(
      ['Scenario', 'Profil', 'Personer', 'Kall', 'Antall', 'Snitt', 'Maks'],
      serverkall
        .filter((r) => r.snitt >= 0.5)
        .sort((a, b) => a.scenario.localeCompare(b.scenario) || a.profil.localeCompare(b.profil) || a.personer - b.personer || b.snitt * b.antall - a.snitt * a.antall)
        .map((r) => [r.scenario, r.profil, String(r.personer), r.kall, String(r.antall), `${r.snitt.toFixed(1)} ms`, `${r.maks.toFixed(1)} ms`]),
    ),
  )
  return deler.join('\n\n')
}

// --- Kjøringen -------------------------------------------------------------------

const s = await startLokalDatabase()
const adminpassord = await sikreAdministrator(s)
const adminId = lokalSql(s, `select id from public.profiles where username = 'qa-admin'`)
const tilbakestill = slaPaFunksjoner(s, 'gruppechat_aktivert', 'direktemeldinger_aktivert')
const valgte = process.env.YTELSE_SCENARIER?.split(',').map((x) => x.trim())
const skal = (navn: string) => !valgte || valgte.includes(navn)
const mengder: Record<number, Record<string, number>> = {}
let miljo: Testmiljo | null = null
try {
  // Først data og database, så appen: bygget skal ikke måle mens databasen fylles.
  let data = await sikreYtelsesdata(s, adminId, HOVEDMENGDE)
  miljo = await apneTestmiljo()
  const adminklient = await klient(s, 'qa-admin', adminpassord)
  await arkiverTidligereGrupper(adminklient, 'Syntetisk ytelse')
  const gruppe = await rpc<string>(adminklient, 'opprett_gruppe', { navn: `Syntetisk ytelse ${new Date().toISOString().slice(11, 19)}`, beskrivelse: 'Ytelsesmåling (syntetisk).', fagmiljo: data.fagmiljo.standard })
  const fagmiljonavn = {
    standard: lokalSql(s, `select navn from public.fagmiljoer where id = '${data.fagmiljo.standard}'`),
    annet: lokalSql(s, `select navn from public.fagmiljoer where id = '${data.fagmiljo.annet}'`),
  }
  const k: Kontekst = { miljo, s, data, admin: { brukernavn: 'qa-admin', passord: adminpassord, id: adminId, klient: adminklient }, gruppe, fagmiljonavn }
  mengder[HOVEDMENGDE] = datamengde(s)
  const kode = execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim()
  // Appens kode (alt i src utenom testene) mot main: «uendret» er grunnlaget for en før-måling.
  const appkode = spawnSync('git', ['diff', '--quiet', 'origin/main', '--', 'src', ':!src/__tests__']).status === 0 ? 'lik origin/main' : 'endret mot origin/main'
  const miljoinfo = { kode, appkode, cpu: cpus()[0]?.model, kjerner: cpus().length, minneGB: Math.round(totalmem() / 2 ** 30), node: process.version, postgres: lokalSql(s, 'show server_version'), work_mem: lokalSql(s, 'show work_mem'), gjentakelser: GJENTAKELSER, profiler: PROFILVALG }

  // Rådataene lagres etter hver del. Med YTELSE_FORTSETT=1 fortsetter en avbrutt kjøring der den slapp, i den samme mappen.
  if (process.env.YTELSE_FORTSETT && existsSync(MALINGSFIL())) {
    const fra = JSON.parse(readFileSync(MALINGSFIL(), 'utf8')) as { ferdige?: string[]; kjoringer: Kjoring[]; sqlMalinger: typeof sqlMalinger; serverkall: typeof serverkall; mengder: typeof mengder }
    for (const f of fra.ferdige ?? []) ferdige.add(f)
    kjoringer.push(...fra.kjoringer.filter((x) => ferdige.has(delFor(x))))
    sqlMalinger.push(...fra.sqlMalinger.filter((x) => ferdige.has(`sql:${x.personer}`)))
    serverkall.push(...fra.serverkall.filter((x) => ferdige.has(delFor(x))))
    Object.assign(mengder, fra.mengder)
    logg(`fortsetter etter ${ferdige.size} ferdige deler`)
  }
  const lagre = () => writeFileSync(MALINGSFIL(), JSON.stringify({ miljoinfo, mengder, ferdige: [...ferdige], kjoringer, sqlMalinger, serverkall }, null, 1))
  async function del(navn: string, arbeid: () => Promise<void>) {
    if (ferdige.has(navn)) return
    await arbeid()
    ferdige.add(navn)
    lagre()
  }

  // Scenariene for appen, med hovedmengden personer.
  for (const profil of PROFILVALG) {
    for (const [navn, scenario] of Object.entries(SCENARIER)) {
      if (!skal(navn)) continue
      if (navn === 'brukere') continue // med hver personmengde, under
      await del(`${navn}:${profil}:${HOVEDMENGDE}`, async () => {
        nullstillServer(s)
        for (let nr = 1; nr <= GJENTAKELSER; nr++) await scenario(k, profil, nr)
        lesServer(s, navn, profil, HOVEDMENGDE)
      })
      // Byttet lagres i databasen: de neste scenariene skal arbeide i standardfagmiljøet.
      if (navn === 'fagmiljobytte') await rpc(adminklient, 'velg_arbeidsfagmiljo', { fagmiljo: data.fagmiljo.standard })
    }
  }

  // Personsøket, «Brukere» og SQL-en for hver personmengde.
  for (const personer of PERSONMENGDER) {
    data = await sikreYtelsesdata(s, adminId, personer)
    k.data = data
    mengder[personer] = datamengde(s)
    const passord = { 'qa-admin': adminpassord, [MALEBOERE.lokal]: data.passord.lokal, [MALEBOERE.medlem]: data.passord.medlem }
    const klienter = { lokal: await klient(s, MALEBOERE.lokal, data.passord.lokal), medlem: await klient(s, MALEBOERE.medlem, data.passord.medlem) }
    if (skal('sql')) await del(`sql:${personer}`, async () => sqlPersonsok(k, { admin: adminId, lokal: data.ider.lokal, medlem: data.ider.medlem }))
    for (const profil of PROFILVALG) {
      if (skal('brukere'))
        await del(`brukere:${profil}:${personer}`, async () => {
          nullstillServer(s)
          for (let nr = 1; nr <= GJENTAKELSER; nr++) await SCENARIER.brukere!(k, profil, nr)
          lesServer(s, 'brukere', profil, personer)
        })
      if (skal('personsok'))
        await del(`personsøk:${profil}:${personer}`, async () => {
          nullstillServer(s)
          await personsok(k, profil, klienter, passord)
          lesServer(s, 'personsøk', profil, personer)
        })
    }
  }
  const tekst = rapport(miljoinfo, mengder)
  writeFileSync(join(UT, 'ytelse-rapport.md'), tekst)
  lagre()
  logg(`rapporten: ${join(UT, 'ytelse-rapport.md')}`)
} finally {
  // Tilbake til hovedmengden, så andre kontroller ser det samme som før.
  tilbakestill()
  await miljo?.avslutt()
}
