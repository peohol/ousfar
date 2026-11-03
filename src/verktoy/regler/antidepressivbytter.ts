/**
 * Regelsettet for bytte av antidepressiv (K2 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`).
 * Filen eies av leveransen K2; motortråden har bare laget den tomme
 * registreringen (`domenesett.ts`). Et sett uten regler gir ingenting i verktøyet.
 */
import type { Domenesett } from './domenesett'
import { REGELMODELLVERSJON, type Regelsett } from './modell'

export const BYTTESETT: Regelsett = {
  id: 'ousfar-verktoy-antidepressivbytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Regler for bytte av antidepressiv. Ingen regler ennå.',
  regler: [],
}

export const ANTIDEPRESSIVBYTTER: Domenesett = {
  sett: BYTTESETT,
  rapport: { fil: 'docs/verktøy-k2-antidepressivbytter.md', tittel: 'K2: regler for bytte av antidepressiv', notater: ['docs/verktøy-klinisk-leveranseplan-2026-11.md'] },
}
