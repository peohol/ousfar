import { useCallback, useState } from 'react'
import {
  arbeidskontekst,
  kanVelgeArbeidsfagmiljo,
  useOppdaterRettigheter,
  useRettigheter,
  velgArbeidsfagmiljo,
  type Fagmiljoreferanse,
  type Rettigheter,
} from '../../auth/rettigheter'
import { forhentPaneler } from '../forside/Forsidepanel'

/**
 * Byttet av fagmiljøet brukeren arbeider i (arbeidsfagmiljøet), felles for
 * valget i kontomenyen og pilen ved fagmiljønavnet på forsiden. Databasen
 * kontrollerer og lagrer valget, og rettighetene byttet gir, tas i bruk med en
 * gang, så appen aldri fortolker med det forrige fagmiljøet etter at serveren
 * har byttet. En systemarkitekt blir ikke medlem av et fagmiljø hen velger.
 * Panelene på forsiden begynner å hentes for det nye fagmiljøet med det samme,
 * mens katalogen for det hentes.
 */
export function useFagmiljobytte(velg: (fagmiljo: string) => Promise<Rettigheter> = velgArbeidsfagmiljo) {
  const rettigheter = useRettigheter()
  const oppdater = useOppdaterRettigheter()
  /** Fagmiljøet som byttes til, mens det pågår. */
  const [bytter, setBytter] = useState<string | null>(null)
  const [feil, setFeil] = useState(false)
  const gjeldende = rettigheter.arbeidsfagmiljo

  const bytt = useCallback(
    /** Gir `true` når fagmiljøet er byttet (eller alt var det valgte). */
    async (f: Fagmiljoreferanse): Promise<boolean> => {
      if (f.id === gjeldende?.id) return true
      if (bytter !== null) return false
      setBytter(f.id)
      setFeil(false)
      try {
        const nye = await velg(f.id)
        forhentPaneler(arbeidskontekst(nye, true))
        oppdater(nye)
        return true
      } catch {
        setFeil(true)
        return false
      } finally {
        setBytter(null)
      }
    },
    [bytter, gjeldende?.id, oppdater, velg],
  )

  return {
    gjeldende,
    velgbare: rettigheter.velgbareFagmiljoer,
    /** Med ett valg (det brukeren alt arbeider i) er det ingenting å velge. */
    kanVelge: kanVelgeArbeidsfagmiljo(rettigheter),
    erMedlem: (f: Fagmiljoreferanse) => rettigheter.mineFagmiljoer.some((m) => m.id === f.id),
    bytter,
    feil,
    bytt,
  }
}
