/**
 * Regelsettet for kombinasjon av stemningsstabiliserende (K4 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`).
 * Filen eies av leveransen K4; motortråden har bare laget den tomme
 * registreringen (`domenesett.ts`). Et sett uten regler gir ingenting i verktøyet.
 */
import type { Domenesett } from './domenesett'
import { REGELMODELLVERSJON, type Regelsett } from './modell'

export const TILLEGGSSETT: Regelsett = {
  id: 'ousfar-verktoy-tillegg',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Regler for kombinasjon av stemningsstabiliserende. Ingen regler ennå.',
  regler: [],
}

export const TILLEGG: Domenesett = {
  sett: TILLEGGSSETT,
  rapport: { fil: 'docs/verktøy-k4-tillegg.md', tittel: 'K4: regler for kombinasjon av stemningsstabiliserende', notater: ['docs/verktøy-klinisk-leveranseplan-2026-11.md'] },
}
