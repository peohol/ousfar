/**
 * Modulene byggingen gir appen endringsloggen gjennom (`versjonsfil()` i
 * `vite.config.ts`), lest av `src/data/endringslogg.ts`.
 *
 * - {@link ENDRINGSMODUL} er med i appen fra start, og er liten: et merke per
 *   føring (versjon, ID, dato og varselmerker), de hele føringene som varsles
 *   i bjella, og hver side av loggen som en henting.
 * - Hver side er en egen modul ({@link SIDEMODUL}), og blir en egen pakke som
 *   bare hentes når den vises (`src/domain/endringssider.ts`).
 * - Føringene under utprøving, som bare systemarkitektene ser, er en egen
 *   modul ({@link UTPROVINGSMODUL}) som bare hentes for dem. De er ikke med i
 *   noen av de andre: loggen de får, er den alle andre ser
 *   (`delLogg` i `src/domain/versjonering.ts`).
 */
import { antallSider, fraSide } from '../domain/endringssider'
import { endringsmerke, varslesIBjella, type Endring } from '../domain/versjon'

export const ENDRINGSMODUL = 'virtual:ousfar-endringer'

/** Starten på navnet til modulen for én side; nummeret står etter. */
export const SIDEMODUL = `${ENDRINGSMODUL}/endringslogg-`

/** Modulen med føringene under utprøving, hele, nyest først. */
export const UTPROVINGSMODUL = `${ENDRINGSMODUL}/utproving`

/** Nummeret på siden modulen `id` er, eller `null` når den ikke er en side. */
export function sidenummer(id: string): number | null {
  if (!id.startsWith(SIDEMODUL)) return null
  const tekst = id.slice(SIDEMODUL.length)
  return /^(0|[1-9]\d*)$/.test(tekst) ? Number(tekst) : null
}

/** Modulen appen har fra start. */
export function registermodul(logg: readonly Endring[]): string {
  const sider = Array.from({ length: antallSider(logg.length) }, (_, side) => `() => import(${JSON.stringify(SIDEMODUL + side)})`)
  // En eldre føring har versjonen som ID; den står bare én gang.
  const merker = logg.map(endringsmerke).map(({ id, ...merke }) => (id === merke.versjon ? merke : { id, ...merke }))
  return [
    `export const REGISTER = ${JSON.stringify(merker)}.map((m) => ({ id: m.versjon, ...m }))`,
    `export const VARSLEDE = ${JSON.stringify(logg.filter(varslesIBjella))}`,
    `export const SIDER = [${sider.join(', ')}]`,
    '',
  ].join('\n')
}

/** Modulen for én side: føringene på den, hele, nyest først. */
export function sidemodul(logg: readonly Endring[], side: number): string {
  return `export const ENDRINGER = ${JSON.stringify(fraSide(logg, side))}\n`
}

/** Modulen for føringene under utprøving: bare dem, hele, nyest først. */
export function utprovingsmodul(utproving: readonly Endring[]): string {
  if (utproving.some((e) => !e.bareSystemarkitekter)) throw new Error('Modulen for utprøving kan bare ha føringer som bare systemarkitektene ser')
  return `export const UTPROVING = ${JSON.stringify(utproving)}\n`
}
