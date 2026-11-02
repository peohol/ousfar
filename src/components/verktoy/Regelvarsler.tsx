import { tidspunkt } from '../../faginnhold/historikk'
import type { Regel } from '../../verktoy/regler/modell'
import { Ikon } from '../ikon/Ikon'

/**
 * Et faglig varsel om én regelversjon fra kildeoppfølgingen (VDR-1/VDR-3 i
 * `docs/verktøy-omlegging-2026-11.md`), i formen `les_regelvarsler()` gir
 * det: kort tekst uten tekniske detaljer, satt når en kildeendring faktisk er
 * til faglig gjennomgang. Et varsel sperrer aldri; det gjør bare nødstoppen.
 */
export interface Regelvarsel {
  regel: string
  versjon: number
  tekst: string
  /** ISO-tidspunktet varselet gjelder fra. */
  siden: string
}

/** Varslene for akkurat denne regelversjonen; et varsel for en annen versjon gjelder ikke det som vises. */
export const varslerFor = (varsler: readonly Regelvarsel[], regel: Pick<Regel, 'id' | 'versjon'>): Regelvarsel[] =>
  varsler.filter((v) => v.regel === regel.id && v.versjon === regel.versjon)

/** Varslene ved anbefalingen de gjelder; ingenting når det ikke finnes noen. */
export function Regelvarsler({ varsler, regel }: { varsler: readonly Regelvarsel[]; regel: Pick<Regel, 'id' | 'versjon'> }) {
  const egne = varslerFor(varsler, regel)
  if (egne.length === 0) return null
  return (
    <div className="regelvarsel" role="note" aria-label="Faglig merknad">
      <Ikon navn="info2" className="regelvarsel__ikon" />
      <div>
        {egne.map((v) => {
          const siden = tidspunkt(v.siden)
          return (
            <p key={v.siden + v.tekst}>
              {v.tekst}
              {siden && <span className="regelvarsel__siden"> Fra {siden}.</span>}
            </p>
          )
        })}
      </div>
    </div>
  )
}
