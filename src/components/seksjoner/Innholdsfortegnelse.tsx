import { useCallback } from 'react'
import { Menyvalg, Nedtrekksmeny } from '../toppmeny/Nedtrekksmeny'
import { ToppmenyInnhold } from '../toppmeny/Toppmenykilde'
import { seksjonsanker } from './Seksjon'
import { useSeksjonsstyring, type Innholdspunkt } from './Seksjonsstyring'
import '../../styles/innholdsfortegnelse.css'

/**
 * Innholdsfortegnelsen for en side med seksjoner: overskriftene til
 * seksjonene på siden, uten detaljkortene. Et trykk på en av dem åpner
 * seksjonen, lukker den som sto åpen, og ruller siden rett dit, slik en
 * direktelenke gjør; fokus flytter til seksjonens overskrift. Seksjonen som
 * står åpen, er merket.
 *
 * Seksjonene melder seg selv på med navnet sitt (`navn` på `Seksjon`), så
 * fortegnelsen viser det siden faktisk har, i den rekkefølgen det står, også
 * når en seksjon først kommer når dataene er hentet. Den vises når siden har
 * minst to seksjoner.
 *
 * Fortegnelsen står to steder, og CSS viser det ene som passer bredden
 * (`innholdsfortegnelse.css`):
 *
 * - Er det plass til venstre for innholdet, flyter den der, midt i høyden.
 * - Ellers er den en knapp i toppmenyen (`innhold`, i dokken på smale flater)
 *   som åpner seksjonene i en nedtrekksmeny, med seksjonsikonene.
 */
export function Innholdsfortegnelse() {
  const styring = useSeksjonsstyring()
  const apne = styring?.apne
  const punkter = styring?.innhold ?? []
  const gaaTil = useCallback(
    (id: string) => {
      apne?.([id])
      // Tastaturet fortsetter fra seksjonen, uten at fokus ruller siden for seg.
      document
        .getElementById(seksjonsanker(id))
        ?.querySelector<HTMLElement>(':scope > .skuff__hode .skuff__knapp')
        ?.focus({ preventScroll: true })
    },
    [apne],
  )
  if (punkter.length < MINST) return null

  return (
    <>
      <nav className="innholdsfortegnelse" aria-label={ETIKETT}>
        <p className="innholdsfortegnelse__tittel" aria-hidden="true">
          Innhold
        </p>
        <ol className="innholdsfortegnelse__liste">
          {punkter.map((punkt) => (
            <li key={punkt.id}>
              <button
                type="button"
                className="innholdsfortegnelse__punkt"
                {...gjeldende(punkt)}
                onClick={() => gaaTil(punkt.id)}
              >
                {punkt.navn}
              </button>
            </li>
          ))}
        </ol>
      </nav>
      <ToppmenyInnhold spor="innhold">
        <Nedtrekksmeny
          className="innholdsmeny"
          knapp={{ ikon: 'innhold', etikett: ETIKETT, variant: 'myk' }}
          etikett={ETIKETT}
          lag="innholdsmeny"
        >
          {(lukk) => (
            <ol className="nedtrekk__valg">
              {punkter.map((punkt) => (
                <li key={punkt.id}>
                  <Menyvalg
                    ikon={punkt.ikon ?? 'fallback'}
                    tekst={punkt.navn}
                    aktiv={punkt.apen}
                    onClick={() => {
                      lukk()
                      gaaTil(punkt.id)
                    }}
                  />
                </li>
              ))}
            </ol>
          )}
        </Nedtrekksmeny>
      </ToppmenyInnhold>
    </>
  )
}

/** Så mange seksjoner må siden ha før en innholdsfortegnelse er til hjelp. */
const MINST = 2

/** Navnet på fortegnelsen og knappen for skjermlesere og som tooltip. */
const ETIKETT = 'Innhold på siden'

/** Seksjonen som står åpen, er den leseren er i. */
function gjeldende(punkt: Innholdspunkt) {
  return punkt.apen ? { 'aria-current': 'true' as const } : {}
}
