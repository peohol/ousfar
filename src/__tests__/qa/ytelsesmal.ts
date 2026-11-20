/**
 * Utregningene og rapporten for ytelsesmålingen (`ytelse.ts`,
 * `docs/ytelse-maling.md`): uten nettleser og database, så de prøves i
 * `npm test` (`src/__tests__/ytelsesmal.test.ts`).
 */

/** Median, p95 (nærmeste rang), minste og største verdi. Tomt gir null. */
export interface Fordeling {
  n: number
  median: number
  p95: number
  min: number
  maks: number
}

export function fordeling(verdier: readonly (number | null | undefined)[]): Fordeling | null {
  const v = verdier.filter((x): x is number => typeof x === 'number' && Number.isFinite(x)).sort((a, b) => a - b)
  if (v.length === 0) return null
  const rang = (p: number) => v[Math.min(v.length - 1, Math.max(0, Math.ceil(p * v.length) - 1))]!
  const midt = v.length / 2
  const median = v.length % 2 ? v[Math.floor(midt)]! : (v[midt - 1]! + v[midt]!) / 2
  return { n: v.length, median, p95: rang(0.95), min: v[0]!, maks: v[v.length - 1]! }
}

/** En ressurs siden hentet (Resource Timing), i millisekunder fra sidens start. */
export interface Ressurs {
  /** Stien, uten spørring (for API-et: `/rest/v1/rpc/les_stoff`). */
  sti: string
  /** Samme opphav som appen (JS, CSS, bilder) eller API-et. */
  egen: boolean
  start: number
  slutt: number
  /** Overført (0 når nettleseren ikke får vite det, som for et annet opphav). */
  overfort: number
  /** Kroppen slik den ble sendt (komprimert når tjeneren komprimerte). */
  kropp: number
  /** Kroppen utpakket: det nettleseren må lese og kjøre. */
  utpakket: number
}

export const erKode = (r: Ressurs) => r.egen && /\.(m?js)$/.test(r.sti)
export const erStil = (r: Ressurs) => r.egen && /\.css$/.test(r.sti)
export const erApi = (r: Ressurs) => !r.egen && /^\/(rest|auth|functions|storage|realtime)\/v1\//.test(r.sti)

/** Navnet på et API-kall: RPC-funksjonen, tabellen eller auth-endepunktet. */
export function kallnavn(sti: string): string {
  const m = /^\/rest\/v1\/(?:rpc\/)?([^/?]+)/.exec(sti) ?? /^\/(auth|storage|functions|realtime)\/v1\/([^/?]+)/.exec(sti)
  if (!m) return sti
  return m.length > 2 ? `${m[1]}/${m[2]}` : m[1]!
}

/** Det som var hentet innen tiden `t` (fra `fra`): kall, kode og stil. */
export interface Hentetinnen {
  kall: number
  api: string[]
  /** Kode som var ferdig hentet, i byte: overført (lite når hurtigbufferen hadde den), og utpakket. */
  kodeOverfort: number
  kodeUtpakket: number
  /** Stil som var ferdig hentet, overført. */
  stilOverfort: number
  kodefiler: string[]
}

export function hentetInnen(ressurser: readonly Ressurs[], fra: number, t: number): Hentetinnen {
  const innen = ressurser.filter((r) => r.start >= fra - 1 && r.start <= t)
  const ferdig = innen.filter((r) => r.slutt <= t)
  const kode = ferdig.filter(erKode)
  return {
    kall: innen.length,
    api: innen.filter(erApi).map((r) => kallnavn(r.sti)),
    kodeOverfort: kode.reduce((s, r) => s + r.overfort, 0),
    kodeUtpakket: kode.reduce((s, r) => s + r.utpakket, 0),
    stilOverfort: ferdig.filter(erStil).reduce((s, r) => s + r.overfort, 0),
    kodefiler: kode.map((r) => r.sti),
  }
}

/** Antall av hvert navn, flest først: `les_stoff ×2, profiles`. */
export function telling(navn: readonly string[]): string {
  const n = new Map<string, number>()
  for (const x of navn) n.set(x, (n.get(x) ?? 0) + 1)
  return [...n.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([x, k]) => (k > 1 ? `${x} ×${k}` : x))
    .join(', ')
}

const ms = (x: number) => (x >= 10_000 ? `${(x / 1000).toFixed(1)} s` : `${Math.round(x)} ms`)
const kb = (x: number) => `${Math.round(x / 1024)} kB`

/** «median (p95; min–maks)», eller en strek. Enheten er millisekunder, eller byte med `byte`. */
export function visFordeling(f: Fordeling | null, byte = false): string {
  if (!f) return '–'
  const v = byte ? kb : ms
  if (f.n === 1) return v(f.median)
  return `${v(f.median)} (p95 ${v(f.p95)}; ${v(f.min)}–${v(f.maks)})`
}

/** En Markdown-tabell. */
export function tabell(hode: readonly string[], rader: readonly (readonly string[])[]): string {
  const linje = (celler: readonly string[]) => `| ${celler.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`
  return [linje(hode), linje(hode.map(() => '---')), ...rader.map(linje)].join('\n')
}
