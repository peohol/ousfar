import { useState } from 'react'
import { tomThcInndata, type ThcModell } from '../../domain/thcMotor'
import { THC_TEKSTBOLKER } from '../../domain/thcTekster'
import { Button } from '../Button'
import { ThcKommentar, ThcSeksjoner, useThcFortolkning } from '../ThcUtfall'
import { ThcSkjema } from '../ThcSkjema'
import { Detaljkort } from '../seksjoner/Seksjon'

/**
 * Fortolkningsmodulen i det små: det samme skjemaet, den samme kommentaren
 * og de samme sammenleggbare seksjonene som modulen (#586), med reglene som
 * vises over, og hvilke tekster kommentaren ble satt sammen av. Det er
 * ingenting å kopiere.
 */
export function Thcsimulator({ modell }: { modell: ThcModell }) {
  const { regler } = modell
  const [inndata, setInndata] = useState(() => tomThcInndata(regler))
  const { resultat, mildere } = useThcFortolkning(inndata, modell)
  const sett = <K extends keyof typeof inndata>(felt: K, verdi: (typeof inndata)[K]) =>
    setInndata((forrige) => ({ ...forrige, [felt]: verdi }))

  return (
    <Detaljkort
      id="simulator"
      tittel="Prøv reglene"
      oppsummering="Fyll inn en prøve"
      handlinger={
        <Button variant="subtle" className="redigeringsknapp" onClick={() => setInndata(tomThcInndata(regler))}>
          Nullstill
        </Button>
      }
      className="simulator"
    >
      <p className="regler__ingress">Fyll inn slik som i fortolkningen. Kommentaren regnes ut med reglene over.</p>
      <ThcSkjema inndata={inndata} regler={regler} onEndre={sett} mildere={mildere} />
      <div className="simulator__resultat">
        {resultat.type === 'kommentar' && (
          <p className="simulator__scenario" role="status">
            Satt sammen av: {resultat.bolker.map((nokkel) => THC_TEKSTBOLKER[nokkel].tittel).join(', ')}.
          </p>
        )}
        <ThcKommentar resultat={resultat} />
        <ThcSeksjoner resultat={resultat} regler={regler} />
      </div>
    </Detaljkort>
  )
}
