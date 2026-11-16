import { Ikonknapp } from '../Ikonknapp'
import { useForslagFor } from './Forslagskilde'
import '../../styles/forslag.css'

/**
 * Den diskrete knappen «Foreslå endring» under et kort eller en tekst, når
 * stedet tar imot forslag og elementet er publisert (`ForslagsstedKilde`).
 */
export function Forslagsknapp({ element, navn }: { element: string; navn: string }) {
  const apne = useForslagFor(element)
  if (!apne) return null
  return (
    <div className="forslagsknapp">
      <Ikonknapp ikon="foresla" variant="stille" storrelse="liten" etikett={`Foreslå endring: ${navn}`} onClick={apne} />
    </div>
  )
}
