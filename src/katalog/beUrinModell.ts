/**
 * Modellen for fortolkningen av benzoylekgonin i urin, slik modulen henter
 * den: fra databasen, for arbeidskonteksten til den innloggede
 * (`public.les_be_urin_modell()`), når modulen åpnes. Den lagres ikke i
 * nettleseren. Et fagmiljø uten modell får ingen, aldri et annet fagmiljøs.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { lesBeUrinModellsvar, tilBeUrinModell, type BeUrinModellstatus, type BeUrinModellsvar } from '../domain/beUrinModell'
import { tilFeil } from '../faginnhold/lagring'
import { REGLENE_KUNNE_IKKE_HENTES } from '../faginnhold/scenarioregler'
import type { Henting } from '../hooks/useHenting'
import { iFagmiljoet } from '../regler/publiserte'

export async function lesBeUrinModell(klient: SupabaseClient): Promise<BeUrinModellsvar> {
  const { data, error } = await klient.rpc('les_be_urin_modell')
  if (error) throw tilFeil(error)
  return lesBeUrinModellsvar(data)
}

const SI_FRA = 'Si fra til en systemarkitekt.'

/**
 * Modellen i den formen modulen tar imot den. Mangler den eller består den
 * ikke kontrollen, gir den en feil med forklaring, og ingenting fortolkes.
 */
export function beUrinModellFra(henting: Henting<BeUrinModellsvar>, provIgjen: () => void): BeUrinModellstatus {
  if (henting.status === 'laster') return henting
  if (henting.status === 'feil') return { status: 'feil', melding: `${REGLENE_KUNNE_IKKE_HENTES} ${henting.melding}`, provIgjen }
  const { fagmiljo, modell } = henting.data
  const kontrollert = tilBeUrinModell(modell)
  if (kontrollert === null) {
    return {
      status: 'feil',
      melding: `Modellen for benzoylekgonin i urin er ikke satt opp${iFagmiljoet(fagmiljo?.navn)}. ${SI_FRA}`,
      provIgjen,
    }
  }
  if (!kontrollert.ok) {
    return { status: 'feil', melding: `Modellen for benzoylekgonin i urin er ikke gyldig og brukes ikke. ${SI_FRA}`, provIgjen }
  }
  return { status: 'klar', modell: kontrollert.modell, fagmiljo: fagmiljo?.id ?? '' }
}
