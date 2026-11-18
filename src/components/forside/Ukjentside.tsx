import { useEffect, useId } from 'react'
import { Button } from '../Button'
import { Ikon } from '../ikon/Ikon'

/**
 * En adresse appen ikke kjenner. Siden sender ikke brukeren videre på egen
 * hånd, så adressen står og kan rettes.
 */
export function Ukjentside({ onTilForsiden }: { onTilForsiden: () => void }) {
  const tittelId = useId()
  useEffect(() => {
    const forrige = document.title
    document.title = 'Siden finnes ikke – OUSFAR'
    document.getElementById(tittelId)?.focus({ preventScroll: true })
    return () => {
      document.title = forrige
    }
  }, [tittelId])

  return (
    <section className="forside forside--ukjent" aria-labelledby={tittelId}>
      <h1 id={tittelId} className="forside__tittel" tabIndex={-1}>
        Siden finnes ikke
      </h1>
      <p className="forside__beskrivelse">Lenken kan være feil, eller siden kan være flyttet eller slettet.</p>
      <div>
        <Button variant="kant" icon={<Ikon navn="back" />} onClick={onTilForsiden}>
          Til forsiden
        </Button>
      </div>
    </section>
  )
}
