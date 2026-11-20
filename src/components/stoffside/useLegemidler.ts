import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { byggPreparatvisning, type Preparatvisning } from '../../legemiddeldata/preparatmodell'
import { useFaginnholdskilde } from './Faginnholdskilde'
import { useKilde, type Kildetilstand } from './useKilde'

export type Legemiddeltilstand = Kildetilstand<Legemiddelutvalg, Preparatvisning>

/**
 * Legemiddeldataene for virkestoffene siden er koblet til, og preparatene
 * gruppert slik seksjonen viser dem. `ingen` når siden ikke er koblet, eller
 * appen er satt opp uten legemiddeldataene.
 */
export function useLegemidler(koblet: readonly string[]): Legemiddeltilstand {
  return useKilde(useFaginnholdskilde().legemidler, koblet, byggPreparatvisning).tilstand
}
