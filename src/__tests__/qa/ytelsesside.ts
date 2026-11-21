/**
 * Siden i ytelsesmålingen (`ytelse.ts`) og etterkontrollen
 * (`ytelseskontroll.ts`): en nettleserkontekst med hurtigbufferen på
 * (`maleside()`), måleren (`ytelsesmaler.js`) lagt inn før appen starter, og
 * profilene for nett og maskin. Bare for skript i det lokale testmiljøet
 * (`docs/ytelse-maling.md`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { innen, type Side } from './kontroll'
import type { Testmiljo } from './testmiljo'
import type { Ressurs } from './ytelsesmal'

/** Måleren, lagt inn i siden før appen starter. */
const MALER = readFileSync(fileURLToPath(new URL('./ytelsesmaler.js', import.meta.url)), 'utf8')

/** Høyst så lenge (ms) ventes det på et merke. */
export const GRENSE = 60_000

/**
 * Profilene. `rask`: maskinen og nettet i testmiljøet uten begrensning (det
 * beste tilfellet). `treg`: et vanlig sykehus-/mobilnett (80 ms ekstra per
 * forespørsel, 10/5 Mbit/s) og en maskin fire ganger tregere enn testmaskinen
 * (Chromiums CPU-struping), nærmere en eldre arbeidsstasjon eller mobil.
 */
export const PROFILER = {
  rask: null,
  treg: { latency: 80, downloadThroughput: (10e6 / 8) | 0, uploadThroughput: (5e6 / 8) | 0, cpu: 4 },
} as const
export type Profil = keyof typeof PROFILER

/** Det måleren har notert i siden (`window.__ytelse`), og ressursene siden har hentet. */
export interface Sidemaling {
  merker: Record<string, number>
  t0: number
  ressurser: Ressurs[]
  lange: [number, number][]
  referanser: [number, number, string][]
  personsok: [number, string, string, string[]][]
  tast: number | null
}

/**
 * En ny side med måleren og profilen. `feilsok` logger konsollfeil, svar med
 * status 400 eller mer og forespørsler som feilet.
 */
export async function apneMaleside(
  miljo: Testmiljo,
  profil: Profil,
  valg: { vindu?: Record<string, unknown>; feilsok?: boolean; logg?: (t: string) => void } = {},
): Promise<Side> {
  const side = await miljo.maleside(valg.vindu)
  await side.addInitScript({ content: MALER })
  const logg = valg.logg ?? console.log
  if (valg.feilsok) {
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

/** Lukker sidens kontekst (og med den økten og hurtigbufferen). */
export const lukk = (side: Side) => side.context().close().catch(() => undefined)

/**
 * Venter til merket `navn` er satt, og gir tiden (ms fra start eller siste
 * {@link nullstill}). Går tiden ut, tas et skjermbilde i `feilbilder` (om gitt).
 */
export async function ventPaMerke(side: Side, navn: string, valg: { ms?: number; feilbilder?: string } = {}): Promise<number> {
  const hent = () => side.evaluate((n: string) => (window as never as { __ytelse: { merker: Record<string, number> } }).__ytelse.merker[n], navn) as Promise<number | undefined>
  try {
    await innen(valg.ms ?? GRENSE, `merket «${navn}»`, async () => (await hent()) !== undefined, 50)
  } catch (e) {
    if (valg.feilbilder) await side.screenshot({ path: join(valg.feilbilder, `feil-${navn}-${Date.now()}.png`) }).catch(() => undefined)
    throw e
  }
  return (await hent())!
}

/** Begynner målingen på nytt: tiden regnes fra nå, og merkene glemmes. */
export const nullstill = (side: Side) => side.evaluate(() => (window as never as { __ytelse: { nullstill(): void } }).__ytelse.nullstill())

/** Logger inn fra innloggingssiden; målingen regnes fra trykket på «Logg inn». */
export async function loggInn(side: Side, url: string, brukernavn: string, passord: string) {
  await side.goto(url)
  await side.waitForSelector('input[name=username]', { timeout: GRENSE })
  await side.fill('input[name=username]', brukernavn)
  await side.fill('input[name=password]', passord)
  await nullstill(side)
  await side.click('button:has-text("Logg inn")')
}

/** Det måleren har notert, og ressursene siden har hentet (Resource Timing). */
export async function les(side: Side): Promise<Sidemaling> {
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
