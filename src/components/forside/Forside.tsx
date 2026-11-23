import { useCallback, useEffect, useId, useRef } from 'react'
import { iKolonner, synligeModuler } from '../../forside/moduler'
import { useMediesporring } from '../../hooks/useSystemvalg'
import { useBevart } from '../../oppdatering/Bevaring'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'
import { Fagmiljooverskrift } from './Fagmiljooverskrift'
import { Forsidepanel } from './Forsidepanel'
import { Tilpassforsiden } from './Tilpassforsiden'
import { useForsideoppsett } from './useForsideoppsett'

/**
 * Under denne bredden står panelene i én kolonne (nettbrett og mobil). Den
 * står bare her: antallet kolonner avgjøres i koden, så rekkefølgen i siden
 * (tastatur og skjermleser) alltid er den brukeren ser.
 */
const EN_KOLONNE = '(max-width: 56em)'

/**
 * Den personlige forsiden (`#/`), der appen åpner (docs/forside.md,
 * `docs/design/d0-dashboard-chat/`, skisse 01–05 og 24): fagmiljøets navn, veien
 * inn til fortolkningen som den ene hovedhandlingen, og panelene brukeren har
 * valgt, hvert med inntil tre hendelser.
 *
 * Fokus står på «Åpne fortolkning» når siden åpnes, så `Enter` tar brukeren
 * rett inn i fortolkningen, like raskt som da den var startsiden. Knappen
 * virker med en gang; panelene henter hvert for seg.
 */
export function Forside({ onApneFortolkning }: { onApneFortolkning: () => void }) {
  const tittelId = useId()
  const knapp = useRef<HTMLButtonElement>(null)
  const [oppsett, endreOppsett] = useForsideoppsett()
  const [tilpass, setTilpass] = useBevart('forside/tilpass', false)
  // Fast identitet: `Modallag` kobler den til lukkehendelsen på dialogen.
  const lukkTilpass = useCallback(() => setTilpass(false), [setTilpass])

  useEffect(() => {
    window.scrollTo({ top: 0 })
    knapp.current?.focus({ preventScroll: true })
  }, [])

  const moduler = synligeModuler(oppsett)
  const enKolonne = useMediesporring(EN_KOLONNE)
  const kolonner = iKolonner(moduler, enKolonne ? 1 : 2)

  return (
    <div className="forside">
      <div className="forside__hode">
        <Fagmiljooverskrift />
        <Button variant="subtle" className="forside__tilpass" icon={<Ikon navn="gears" />} aria-haspopup="dialog" onClick={() => setTilpass(true)}>
          Tilpass forsiden
        </Button>
      </div>
      <section className="forside__hovedhandling" aria-labelledby={tittelId}>
        <span className="forside__ikon" aria-hidden="true">
          <Ikon navn="interp" storrelse="plot" />
        </span>
        <div className="forside__tekst">
          <h2 id={tittelId} className="forside__handlingstittel">
            Fortolkning av analysesvar
          </h2>
          <p className="forside__beskrivelse">Søk etter analytt og hent fortolkningskommentar.</p>
        </div>
        <Button ref={knapp} icon={<Ikon navn="chev" />} onClick={onApneFortolkning}>
          Åpne fortolkning
        </Button>
      </section>
      {moduler.length > 0 && (
        <div className="forside__paneler">
          {kolonner.map((kolonne, i) => (
            <div key={i} className="forside__kolonne">
              {kolonne.map((modul) => (
                <Forsidepanel key={modul} modul={modul} />
              ))}
            </div>
          ))}
        </div>
      )}
      <Tilpassforsiden apen={tilpass} onLukk={lukkTilpass} oppsett={oppsett} onEndre={endreOppsett} />
    </div>
  )
}
