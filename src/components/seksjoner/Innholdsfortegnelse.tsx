import { useCallback, useLayoutEffect, useRef } from 'react'
import { Ikon } from '../ikon/Ikon'
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
 * - Er det plass til venstre for innholdet, flyter den der, midt i høyden,
 *   med seksjonsikonet foran hver tittel.
 * - Ellers er den en knapp i toppmenyen (`innhold`, i dokken på smale flater)
 *   som åpner seksjonene i en nedtrekksmeny, med seksjonsikonene.
 *
 * Plassen regnes i flaten innholdet står i, uten diskusjonsmenyen, så
 * fortegnelsen aldri havner under innholdet når menyen står åpen. Den
 * flaten kan ikke en media query se, så CSS avgjør det i en container query,
 * og fortegnelsen sier fra til toppmenyen (`useVedSiden`).
 */
export function Innholdsfortegnelse() {
  const styring = useSeksjonsstyring()
  const apne = styring?.apne
  const punkter = styring?.innhold ?? []
  const vises = punkter.length >= MINST
  const [felt, liste] = useVedSiden(vises)
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
  if (!vises) return null

  return (
    <>
      <div ref={felt} className="innholdsfelt">
        <nav ref={liste} className="innholdsfortegnelse" aria-label={ETIKETT}>
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
                  data-ih=""
                >
                  <Ikon navn={punkt.ikon ?? 'fallback'} storrelse="ui" />
                  <span>{punkt.navn}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </div>
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

/** Merket på rotelementet når fortegnelsen står ved siden av innholdet. */
const ROTMERKE = 'innholdsfortegnelse'

/**
 * Følger med på om fortegnelsen står ved siden av innholdet (CSS avgjør det
 * ut fra bredden på `felt`), og merker rotelementet så knappen i toppmenyen
 * skjules da. Merket settes før skjermen tegnes, og fjernes når
 * fortegnelsen forsvinner.
 */
function useVedSiden(aktiv: boolean) {
  const felt = useRef<HTMLDivElement>(null)
  const liste = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const element = felt.current
    if (!aktiv || !element) return
    const rot = document.documentElement
    const maal = () => {
      const vedSiden = !!liste.current && getComputedStyle(liste.current).display !== 'none'
      if (vedSiden) rot.dataset[ROTMERKE] = 'ved-siden'
      else delete rot.dataset[ROTMERKE]
    }
    maal()
    const vakt = typeof ResizeObserver === 'function' ? new ResizeObserver(maal) : undefined
    vakt?.observe(element)
    return () => {
      vakt?.disconnect()
      delete rot.dataset[ROTMERKE]
    }
  }, [aktiv])
  return [felt, liste] as const
}

/** Seksjonen som står åpen, er den leseren er i. */
function gjeldende(punkt: Innholdspunkt) {
  return punkt.apen ? { 'aria-current': 'true' as const } : {}
}
