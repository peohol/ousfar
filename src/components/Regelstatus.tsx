import { Button } from './Button'
import { Panelhode } from './Panelhode'
import { Ikon } from './ikon/Ikon'

export interface RegelstatusProps {
  /** Reglene er på vei, eller de mangler eller kunne ikke hentes. */
  regler: { status: 'laster' } | { status: 'feil'; melding: string; provIgjen: () => void } | { status: 'klar' }
  /** Overskriften når noe mangler. */
  tittel?: string
}

/**
 * Det en fortolkningsmodul viser i stedet for fortolkningen når reglene ikke
 * er der: at de hentes, eller hvorfor de mangler, med veien til å prøve igjen.
 * En modul uten regler fortolker ingenting, og sier det tydelig.
 */
export function Regelstatus({ regler, tittel = 'Reglene mangler' }: RegelstatusProps) {
  if (regler.status === 'feil') {
    return (
      <>
        <Panelhode ikon="fallback" tone="toksisk">
          {tittel}
        </Panelhode>
        <ul className="mangelliste" role="alert">
          <li>{regler.melding}</li>
        </ul>
        <Button variant="subtle" icon={<Ikon navn="reset" />} onClick={regler.provIgjen}>
          Prøv igjen
        </Button>
      </>
    )
  }
  if (regler.status === 'klar') return null
  return (
    <>
      <Panelhode>Henter reglene</Panelhode>
      <p role="status">Fortolkningsreglene hentes …</p>
    </>
  )
}
