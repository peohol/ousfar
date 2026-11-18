import { type ReactNode, useId } from 'react'
import { Button } from '../Button'
import { Lastesirkel } from '../Lasteindikator'
import { Panelhode } from '../Panelhode'
import { Ikon } from '../ikon/Ikon'
import type { Ikonnavn } from '../ikon/register'
import type { Hendelse, Maal } from './hendelse'
import { Maallenke } from './Maallenke'
import { Hendelsesliste } from './Hendelsesliste'

/** Hvor langt innholdet i et panel er kommet. Hvert panel henter for seg. */
export type Panelinnhold =
  | { status: 'laster' }
  | { status: 'feil'; provIgjen: () => void }
  | { status: 'klar'; hendelser: readonly Hendelse[] }

export interface OppsummeringskortProps {
  tittel: string
  ikon: Ikonnavn
  /** Hendelsene, eller at de hentes eller ikke kunne hentes. */
  innhold: Panelinnhold
  /** Linjen når det ikke er noe å vise. */
  tomtekst?: string
  /**
   * Tekstlenken nederst til hele lista («Vis alle»). Vises bare når det er noe
   * i panelet. Fører dit som en hendelse ({@link Maal}).
   */
  visAlle?: { tekst: string } & Maal
  /** Annet innhold under hendelsene, som én sekundærknapp i et gruppepanel. */
  children?: ReactNode
}

/**
 * Et kort oppsummeringspanel, på forsiden og på gruppesiden (D0 README,
 * skisse 01 og 10): Atlas-panelet med kursiv serif-tittel og ikon, inntil tre
 * hendelser og en tekstlenke til resten.
 *
 * Panelet laster, feiler og er tomt for seg selv: en feil her lar resten av
 * siden virke, og «Prøv igjen» henter bare dette panelet på nytt.
 */
export function Oppsummeringskort({ tittel, ikon, innhold, tomtekst, visAlle, children }: OppsummeringskortProps) {
  const tittelId = useId()
  return (
    <section className="oppsummering" aria-labelledby={tittelId} aria-busy={innhold.status === 'laster'}>
      <Panelhode ikon={ikon} id={tittelId}>
        {tittel}
      </Panelhode>
      {innhold.status === 'laster' && (
        <p className="oppsummering__tom oppsummering__laster">
          <Lastesirkel /> Henter …
        </p>
      )}
      {innhold.status === 'feil' && (
        <div className="oppsummering__feil" role="status">
          <p className="oppsummering__tom">Kunne ikke hente dette nå.</p>
          <Button variant="kant" onClick={innhold.provIgjen}>
            Prøv igjen
          </Button>
        </div>
      )}
      {innhold.status === 'klar' && <Hendelsesliste hendelser={innhold.hendelser} tomtekst={tomtekst} />}
      {children}
      {visAlle && innhold.status === 'klar' && innhold.hendelser.length > 0 && (
        <Maallenke maal={visAlle} className="oppsummering__alle">
          {visAlle.tekst}
          <Ikon navn="chev" />
        </Maallenke>
      )}
    </section>
  )
}
