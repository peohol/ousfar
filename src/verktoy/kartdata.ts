/**
 * Kartleggingen og øyeblikksbildene fra `src/data/verktoy/`, samlet. Brukes av
 * testene og av skriptet som lager rapporten, ikke av appen.
 */
import kartlegging from '../data/verktoy/virkestoffkartlegging.json'
import tabeller from '../data/verktoy/psychiatrienet-tabeller.json'
import lenker from '../data/verktoy/psychiatrienet-lenker.json'
import fest from '../data/verktoy/fest-formuleringer.json'
import fagsider from '../data/verktoy/ousfar-fagsider.json'
import stoffregister from '../data/stoffregister.json'
import type { Festformuleringer } from './festformuleringer'
import type { Fagsidebilde, Kartdata, Lenkebilde, Stoffregisterfil, Tabellbilde, Virkestoffkartlegging } from './kartlegging'

export function lesKartdata(): Kartdata {
  return {
    kartlegging: kartlegging as Virkestoffkartlegging,
    tabeller: tabeller as Tabellbilde,
    lenker: lenker as Lenkebilde,
    fest: fest as Festformuleringer,
    fagsider: fagsider as Fagsidebilde,
    stoffregister: stoffregister as Stoffregisterfil,
  }
}
