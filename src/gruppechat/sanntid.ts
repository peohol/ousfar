/**
 * Dørklokken gjennom appens klient (docs/gruppechat.md, «Sanntiden»).
 * Abonnementet selv står i `dorklokke.ts`.
 */
import { klient } from '../auth/klient'
import { lagAbonner, type Abonner } from './dorklokke'

export { DIREKTEKILDE, GRUPPECHATKILDE, lagAbonner, ventetid, type Abonner, type Dorklokkekilde, type Dorklokkevalg, type Kanalstatus } from './dorklokke'

export const abonnerPaGruppechat: Abonner = lagAbonner(klient)
