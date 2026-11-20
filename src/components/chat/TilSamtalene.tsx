import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'

/**
 * «Til alle samtaler»: tilbake til lista fra en samtale, eller fra en
 * undervisning i oversikten («Ny chat», ⚙). En samtale på helsiden har lista
 * ved siden av og skjuler knappen (`chat.css`); en undervisning viser den alltid.
 */
export function TilSamtalene({ onTilbake, undervisning = false }: { onTilbake: () => void; undervisning?: boolean }) {
  const knapp = (
    <Button variant="subtle" className={undervisning ? 'chatsamtale__tilbake chatny__tilbake' : 'chatsamtale__tilbake'} icon={<Ikon navn="back" />} onClick={onTilbake}>
      Til alle samtaler
    </Button>
  )
  return undervisning ? <div className="chatny__topp">{knapp}</div> : knapp
}
