import { NYE_ENDRINGER } from 'virtual:ousfar-endringer'
import type { Endring } from '../domain/versjon'
import { settSammen } from '../domain/versjonering'
import { HISTORISKE_ENDRINGER } from './endringshistorikk'

/**
 * Endringsloggen appen viser, nyest først: endringene med egen fil i
 * `src/data/endringer/`, med versjonene byggingen ga dem, over det frosne
 * arkivet med de eldre føringene (`endringshistorikk.ts`). Den øverste
 * føringen er versjonen appen kjører.
 *
 * Fila redigeres ikke når noe er endret: en ny endring får sin egen fil, og
 * versjonsnummeret beregnes når appen bygges (`src/domain/versjonering.ts`).
 * Rutinen står i `docs/endringslogg.md`.
 */
export const ENDRINGSLOGG: Endring[] = settSammen(NYE_ENDRINGER, HISTORISKE_ENDRINGER)
