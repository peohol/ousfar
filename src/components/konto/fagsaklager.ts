import { klient } from '../../auth/klient'
import { kallMot } from '../../legemiddeldata/lager'
import { lagFagsaklager, type Fagsaklager } from '../../verktoy/overvaking/fagsak'

/**
 * Lageret for de faglige kildesakene: sjekken i administrasjonen og vinduet
 * for kildeovervåkingen bruker det samme. Står for seg, så sjekken ikke tar
 * med seg vinduet, som hentes først når det åpnes.
 */
export const fagsaklager = (): Fagsaklager => lagFagsaklager(kallMot(klient()))
