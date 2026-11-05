/**
 * Regelsettene slik appen brukte dem da et tidligere kontrollgrunnlag ble
 * laget, så grunnlaget fortsatt gjelder nøyaktig de versjonene kontrolløren
 * så, også etter at nyere versjoner er tatt i bruk. Brukes bare av skriptet og
 * testene.
 */
import { K1_AVSLUTNINGER, K1_OVERGANGER, medAvslutninger } from './regler/k1'
import type { Regelsett } from './regler/modell'
import { NEDTRAPPINGSSETT, NEDTRAPPINGSSETT_FOR_K1 } from './regler/nedtrapping'
import { REGELSETTENE } from './tilgjengelighet'

/**
 * Regelsettene rett etter rettelsene (PR #309), i samme rekkefølge som
 * `REGELSETTENE`: settene appen bruker, men med nedtrappingsreglene før K1 ga
 * escitalopram en ny versjon (`regler/k1.ts`). Rettelseskontrollen og
 * VDK-3 forslag 1 gjelder dem.
 */
export const ETTER_RETTELSENE: readonly Regelsett[] = REGELSETTENE.map((s) => (s.id === NEDTRAPPINGSSETT_FOR_K1.id ? NEDTRAPPINGSSETT_FOR_K1 : s))

/**
 * Regelsettene slik appen brukte dem rett før kontrolløren godkjente
 * escitalopram versjon 14 med tabletter og dråper (B2) 05.11.2026, i samme
 * rekkefølge som `REGELSETTENE`: versjon 14 står til faglig kontroll, så
 * versjon 13 (K1) gjelder. Kontrollgrunnlaget for K1 gjelder dem, og B2 viser
 * med dem at versjon 13 gjaldt til versjon 14 ble godkjent.
 */
export const FOR_B2: readonly Regelsett[] = REGELSETTENE.map((s) =>
  s.id === NEDTRAPPINGSSETT.id
    ? { ...NEDTRAPPINGSSETT, regler: medAvslutninger([...NEDTRAPPINGSSETT_FOR_K1.regler], K1_AVSLUTNINGER, K1_OVERGANGER.map(({ godkjent: _, ...o }) => o)) }
    : s,
)
