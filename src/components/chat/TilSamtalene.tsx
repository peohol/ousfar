import { Ikon } from '../ikon/Ikon'

/**
 * «Til alle samtaler»: tilbake til lista fra en samtale, eller fra en
 * undervisning i oversikten («Ny chat», ⚙). En samtale på helsiden har lista
 * ved siden av og skjuler knappen (`chat.css`); en undervisning viser den alltid.
 */
export function TilSamtalene({ onTilbake, undervisning = false }: { onTilbake: () => void; undervisning?: boolean }) {
  const knapp = (
    <button type="button" className={undervisning ? 'chatsamtale__tilbake chatny__tilbake' : 'chatsamtale__tilbake'} onClick={onTilbake}>
      <Ikon navn="chev" storrelse="ui" />
      <span>Til alle samtaler</span>
    </button>
  )
  return undervisning ? <div className="chatny__topp">{knapp}</div> : knapp
}
