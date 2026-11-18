import { useRef } from 'react'
import { erStandard, flytt, FORSIDEMODULER, settSynlig, STANDARDOPPSETT, type Forsidemodul, type Forsideoppsett } from '../../forside/moduler'
import { Bryter } from '../Bryter'
import { Button } from '../Button'
import { Ikonknapp } from '../Ikonknapp'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'

export interface TilpassforsidenProps {
  apen: boolean
  onLukk: () => void
  oppsett: Forsideoppsett
  /** Tar det nye oppsettet i bruk med en gang og lagrer det. */
  onEndre: (oppsett: Forsideoppsett) => void
}

/**
 * «Tilpass forsiden» (planen §4.4, skisse 05): én bryter og opp/ned per panel,
 * og «Gjenopprett standard». Ingen dra-og-slipp, så alt går like godt med
 * tastatur og skjermleser. Fortolkningen står alltid øverst og kan ikke
 * skjules. Hver endring gjelder med en gang; «Ferdig» lukker bare.
 */
export function Tilpassforsiden({ apen, onLukk, oppsett, onEndre }: TilpassforsidenProps) {
  /** Opp- og ned-knappene, så fokus kan gå til den andre når et panel er flyttet helt ut. */
  const knapper = useRef(new Map<string, HTMLButtonElement>())
  const knapp = (modul: Forsidemodul, retning: 'opp' | 'ned') => (element: HTMLButtonElement | null) => {
    if (element) knapper.current.set(`${modul}:${retning}`, element)
    else knapper.current.delete(`${modul}:${retning}`)
  }

  const flyttModul = (modul: Forsidemodul, retning: -1 | 1) => {
    const nytt = flytt(oppsett, modul, retning)
    onEndre(nytt)
    // Står panelet nå ytterst, kan knappen ikke trykkes igjen; fokus går til den andre.
    const plass = nytt.findIndex((v) => v.modul === modul)
    if (plass === 0 || plass === nytt.length - 1) {
      const annen = plass === 0 ? 'ned' : 'opp'
      requestAnimationFrame(() => knapper.current.get(`${modul}:${annen}`)?.focus())
    }
  }

  return (
    <Modallag
      apen={apen}
      tittel="Tilpass forsiden"
      meta="Forsiden"
      ikon="gears"
      onLukk={onLukk}
      fot={
        <div className="tilpass__fot">
          <Button variant="subtle" disabled={erStandard(oppsett)} onClick={() => onEndre(STANDARDOPPSETT)}>
            Gjenopprett standard
          </Button>
          <Button onClick={onLukk}>Ferdig</Button>
        </div>
      }
    >
      <ul className="tilpass">
        <li className="tilpass__rad tilpass__rad--fast">
          <span className="tilpass__fast">Fortolkning</span>
          <Merke tone="flate">Alltid øverst</Merke>
        </li>
        {oppsett.map(({ modul, synlig }, i) => {
          const { tittel } = FORSIDEMODULER[modul]
          return (
            <li key={modul} className="tilpass__rad">
              <Bryter pa={synlig} onEndre={(pa) => onEndre(settSynlig(oppsett, modul, pa))} className="tilpass__bryter">
                {tittel}
              </Bryter>
              <span className="tilpass__status" aria-hidden="true">
                {synlig ? 'På' : 'Av'}
              </span>
              <Ikonknapp
                ref={knapp(modul, 'opp')}
                ikon="opp"
                etikett={`Flytt ${tittel} opp`}
                variant="stille"
                storrelse="liten"
                utenTips
                disabled={i === 0}
                onClick={() => flyttModul(modul, -1)}
              />
              <Ikonknapp
                ref={knapp(modul, 'ned')}
                ikon="ned"
                etikett={`Flytt ${tittel} ned`}
                variant="stille"
                storrelse="liten"
                utenTips
                disabled={i === oppsett.length - 1}
                onClick={() => flyttModul(modul, 1)}
              />
            </li>
          )
        })}
      </ul>
      <p className="tilpass__merknad">Valgene følger deg på alle maskiner. Innholdet følger fagmiljøet du har valgt.</p>
    </Modallag>
  )
}
