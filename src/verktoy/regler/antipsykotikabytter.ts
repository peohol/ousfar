/**
 * Regelsettet for bytte av antipsykotikum (K3 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`).
 * Filen eies av leveransen K3; motortråden har bare laget den tomme
 * registreringen (`domenesett.ts`). Et sett uten regler gir ingenting i verktøyet.
 */
import type { Domenesett } from './domenesett'
import { REGELMODELLVERSJON, type Regelsett } from './modell'

export const ANTIPSYKOTIKASETT: Regelsett = {
  id: 'ousfar-verktoy-antipsykotikabytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Regler for bytte av antipsykotikum. Ingen regler ennå.',
  regler: [],
}

export const ANTIPSYKOTIKABYTTER: Domenesett = {
  sett: ANTIPSYKOTIKASETT,
  rapport: { fil: 'docs/verktøy-k3-antipsykotikabytter.md', tittel: 'K3: regler for bytte av antipsykotikum', notater: ['docs/verktøy-klinisk-leveranseplan-2026-11.md'] },
}
