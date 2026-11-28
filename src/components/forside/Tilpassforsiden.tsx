import { useRef } from 'react'
import {
  ALLE,
  erStandard,
  flytt,
  FORSIDEMODULER,
  gjenopprettStandard,
  plassFor,
  settSynlig,
  tilgjengeligeValg,
  type Forsidemodul,
  type Forsideoppsett,
  type Tilgang,
} from '../../forside/moduler'
import { Bryter } from '../Bryter'
import { Button } from '../Button'
import { Ikonknapp } from '../Ikonknapp'
import { Merke } from '../Merke'
import { Modallag } from '../Modallag'

export interface TilpassforsidenProps {
  apen: boolean
  onLukk: () => void
  oppsett: Forsideoppsett
  /** Panelene brukeren har; de andre finnes ikke her, og valget for dem står. */
  tilgang?: Tilgang
  /** Tar det nye oppsettet i bruk med en gang og lagrer det. */
  onEndre: (oppsett: Forsideoppsett) => void
}

/**
 * «Tilpass forsiden» (planen §4.4, skisse 05): én bryter og opp/ned per panel,
 * og «Gjenopprett standard». Ingen dra-og-slipp, så alt går like godt med
 * tastatur og skjermleser. Fortolkningen står alltid øverst og kan ikke
 * skjules. Et panel i feltet øverst står rett under den, uten opp/ned.
 * Paneler brukeren ikke har, står ikke her. Hver endring gjelder med en gang;
 * «Ferdig» lukker bare.
 */
export function Tilpassforsiden({ apen, onLukk, oppsett, tilgang = ALLE, onEndre }: TilpassforsidenProps) {
  /** Opp- og ned-knappene, så fokus kan gå til den andre når et panel er flyttet helt ut. */
  const knapper = useRef(new Map<string, HTMLButtonElement>())
  const knapp = (modul: Forsidemodul, retning: 'opp' | 'ned') => (element: HTMLButtonElement | null) => {
    if (element) knapper.current.set(`${modul}:${retning}`, element)
    else knapper.current.delete(`${modul}:${retning}`)
  }

  const valg = tilgjengeligeValg(oppsett, tilgang)
  const topp = valg.filter((v) => plassFor(v.modul) === 'topp')
  const paneler = valg.filter((v) => plassFor(v.modul) === 'paneler')
  const kanFlytte = (modul: Forsidemodul, retning: -1 | 1) => flytt(oppsett, modul, retning, tilgang) !== oppsett

  const flyttModul = (modul: Forsidemodul, retning: -1 | 1) => {
    const nytt = flytt(oppsett, modul, retning, tilgang)
    onEndre(nytt)
    // Står panelet nå ytterst, kan knappen ikke trykkes igjen; fokus går til den andre.
    if (flytt(nytt, modul, retning, tilgang) === nytt) {
      const annen = retning === -1 ? 'ned' : 'opp'
      requestAnimationFrame(() => knapper.current.get(`${modul}:${annen}`)?.focus())
    }
  }

  const bryter = (modul: Forsidemodul, synlig: boolean) => (
    <>
      <Bryter pa={synlig} onEndre={(pa) => onEndre(settSynlig(oppsett, modul, pa))} className="tilpass__bryter">
        {FORSIDEMODULER[modul].tittel}
      </Bryter>
      <span className="tilpass__status" aria-hidden="true">
        {synlig ? 'På' : 'Av'}
      </span>
    </>
  )

  return (
    <Modallag
      apen={apen}
      tittel="Tilpass forsiden"
      meta="Forsiden"
      ikon="gears"
      onLukk={onLukk}
      fot={
        <div className="tilpass__fot">
          <Button variant="subtle" disabled={erStandard(oppsett, tilgang)} onClick={() => onEndre(gjenopprettStandard(oppsett, tilgang))}>
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
        {topp.map(({ modul, synlig }) =>
          FORSIDEMODULER[modul].fast ? (
            <li key={modul} className="tilpass__rad tilpass__rad--fast">
              <span className="tilpass__fast">{FORSIDEMODULER[modul].tittel}</span>
              <Merke tone="flate">Øverst</Merke>
            </li>
          ) : (
            <li key={modul} className="tilpass__rad tilpass__rad--topp">
              {bryter(modul, synlig)}
              <Merke tone="flate">Øverst</Merke>
            </li>
          ),
        )}
        {paneler.map(({ modul, synlig }) => {
          const { tittel } = FORSIDEMODULER[modul]
          return (
            <li key={modul} className="tilpass__rad">
              {bryter(modul, synlig)}
              <Ikonknapp
                ref={knapp(modul, 'opp')}
                ikon="opp"
                etikett={`Flytt ${tittel} opp`}
                variant="stille"
                storrelse="liten"
                utenTips
                disabled={!kanFlytte(modul, -1)}
                onClick={() => flyttModul(modul, -1)}
              />
              <Ikonknapp
                ref={knapp(modul, 'ned')}
                ikon="ned"
                etikett={`Flytt ${tittel} ned`}
                variant="stille"
                storrelse="liten"
                utenTips
                disabled={!kanFlytte(modul, 1)}
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
