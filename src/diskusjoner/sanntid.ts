/**
 * Dørklokken for diskusjonene gjennom appens klient (docs/diskusjoner.md,
 * «Sanntiden»). Lyttingen selv står i `klokke.ts`.
 */
import { klient } from '../auth/klient'
import { lagAbonner, type Abonner } from '../gruppechat/dorklokke'
import { DISKUSJONSKILDE } from './klokke'

export const abonnerPaDiskusjoner: Abonner = lagAbonner(klient, DISKUSJONSKILDE)
