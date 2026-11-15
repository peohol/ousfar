import type { ReactNode } from 'react'
import { Button } from '../Button'

/**
 * Bekreftelsen før en handling som fjerner tilgang: tittelen sier hva, teksten
 * hva som skjer. «Avbryt» har fokus, så et tastetrykk for mye ikke fjerner
 * noe. Brukes av brukerlista og gruppene.
 */
export function Bekreftelseskort({
  tittel,
  bekreft,
  opptatt,
  onBekreft,
  onAvbryt,
  children,
}: {
  tittel: string
  /** Teksten på knappen som utfører handlingen. */
  bekreft: string
  opptatt: boolean
  onBekreft: () => void
  onAvbryt: () => void
  children: ReactNode
}) {
  return (
    <div className="tilgangsbekreftelse" role="group" aria-label={tittel}>
      <p className="tilgangsbekreftelse__tittel">{tittel}</p>
      <p>{children}</p>
      <div className="skjema__knapper">
        <Button disabled={opptatt} onClick={onBekreft}>
          {bekreft}
        </Button>
        <Button variant="subtle" autoFocus onClick={onAvbryt}>
          Avbryt
        </Button>
      </div>
    </div>
  )
}
