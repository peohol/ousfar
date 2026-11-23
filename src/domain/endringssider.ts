/**
 * Delingen av endringsloggen i sider, så appen bare henter føringene den
 * viser (`src/data/endringslogg.ts`). Byggingen lager én pakke per side
 * (`versjonsfil()` i `vite.config.ts`), og appen regner ut hvilke den trenger,
 * med de samme reglene herfra.
 *
 * Sidene telles fra den eldste føringen: side 0 er de {@link ENDRINGER_PER_SIDE}
 * eldste, og den øverste siden har de nyeste og kan være kortere enn de andre.
 * Da endrer en ny føring bare den øverste siden, og de eldre pakkene er de
 * samme fra bygg til bygg, så nettleseren kan bruke dem den alt har.
 *
 * `logg` og plassene er nyest først, som loggen vises: plass 0 er den nyeste.
 */
import { ENDRINGER_PER_SIDE } from './versjon'

/** Hvor mange sider en logg med `antall` føringer deles i. */
export function antallSider(antall: number): number {
  return Math.ceil(antall / ENDRINGER_PER_SIDE)
}

/** Siden føringen på `plass` står på, i en logg med `antall` føringer. */
export function sideFor(plass: number, antall: number): number {
  if (!Number.isInteger(plass) || plass < 0 || plass >= antall) throw new Error(`Plass ${plass} finnes ikke i en logg med ${antall} føringer`)
  return Math.floor((antall - 1 - plass) / ENDRINGER_PER_SIDE)
}

/** Føringene på `side`, nyest først. */
export function fraSide<T>(logg: readonly T[], side: number): T[] {
  if (!Number.isInteger(side) || side < 0 || side >= antallSider(logg.length)) throw new Error(`Endringsloggen har ingen side ${side}`)
  const slutt = logg.length - side * ENDRINGER_PER_SIDE
  return logg.slice(Math.max(0, slutt - ENDRINGER_PER_SIDE), slutt)
}

/**
 * Sidene som til sammen har de `vist` nyeste føringene, nyest først. Satt
 * sammen i den rekkefølgen og kuttet ved `vist`, er de akkurat dem.
 */
export function siderFor(vist: number, antall: number): number[] {
  const n = Math.min(Math.max(0, Math.floor(vist)), antall)
  if (n === 0) return []
  const overst = sideFor(0, antall)
  const nederst = sideFor(n - 1, antall)
  return Array.from({ length: overst - nederst + 1 }, (_, i) => overst - i)
}

/**
 * Hvor mange føringer loggen må vise for at føringen på `plass` skal være
 * med: helt ut den visningen den står i, når loggen vises
 * {@link ENDRINGER_PER_SIDE} om gangen.
 */
export function visningFor(plass: number): number {
  return (Math.floor(plass / ENDRINGER_PER_SIDE) + 1) * ENDRINGER_PER_SIDE
}
