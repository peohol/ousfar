import { useEffect, useId, useRef } from 'react'
import { useRettigheter } from '../../auth/rettigheter'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'

/**
 * Forsiden (`#/`), der appen åpner: fagmiljøets navn og veien inn til
 * fortolkningen, som er den ene hovedhandlingen på siden
 * (`docs/design/d0-dashboard-chat/`, skisse 01). Panelene med det som er nytt
 * for brukeren, kommer med den personlige forsiden.
 *
 * Fokus står på knappen når siden åpnes, så `Enter` tar brukeren rett inn i
 * fortolkningen, like raskt som da den var startsiden.
 */
export function Forside({ onApneFortolkning }: { onApneFortolkning: () => void }) {
  const { arbeidsfagmiljo } = useRettigheter()
  const tittelId = useId()
  const knapp = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    window.scrollTo({ top: 0 })
    knapp.current?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="forside">
      <h1 className="forside__tittel">{arbeidsfagmiljo?.navn ?? 'OUSFAR'}</h1>
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
    </div>
  )
}
