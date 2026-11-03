/**
 * Regelsettene slik appen brukte dem da et tidligere kontrollgrunnlag ble
 * laget, så grunnlaget fortsatt gjelder nøyaktig de versjonene kontrolløren
 * så, også etter at nyere versjoner er tatt i bruk. Brukes bare av skriptet og
 * testene.
 */
import type { Regelsett } from './regler/modell'
import { NEDTRAPPINGSSETT_FOR_AVSLUTNING } from './regler/nedtrapping'
import { REGELSETTENE } from './tilgjengelighet'

/**
 * Regelsettene rett etter rettelsene (PR #309), i samme rekkefølge som
 * `REGELSETTENE`: settene appen bruker, men med nedtrappingsreglene før K1 ga
 * noen av dem en ny versjon (`regler/avslutning.ts`). Rettelseskontrollen og
 * VDK-3 forslag 1 gjelder dem.
 */
export const ETTER_RETTELSENE: readonly Regelsett[] = REGELSETTENE.map((s) => (s.id === NEDTRAPPINGSSETT_FOR_AVSLUTNING.id ? NEDTRAPPINGSSETT_FOR_AVSLUTNING : s))
