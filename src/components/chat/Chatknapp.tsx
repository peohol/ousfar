import { merketall } from '../../varsler/modell'
import { Ikonknapp } from '../Ikonknapp'
import { chatknappnavn, CHATIKON } from './chatvisning'
import { useChatstatus, veksleChatten } from './chatstyring'

/**
 * Chatknappen i toppmenyen, foran bjella. Den står bare på smale flater
 * (`chat.css`); på brede er chatboblen i venstre kant inngangen. Merket viser
 * uleste meldinger, uten tekstutdrag.
 */
export function Chatknapp() {
  const { finnes, mobilApen, uleste } = useChatstatus()
  if (!finnes) return null
  return (
    <div className="chatknapp">
      <Ikonknapp
        ikon={CHATIKON}
        etikett={chatknappnavn(uleste)}
        variant="stille"
        storrelse="liten"
        aria-expanded={mobilApen}
        onClick={veksleChatten}
      />
      {uleste > 0 && (
        <span className="nyttmerke nyttmerke--knapp" aria-hidden="true">
          {merketall(uleste)}
        </span>
      )}
    </div>
  )
}
