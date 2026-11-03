import { useCallback, useRef, useState } from 'react'
import { tidspunkt } from '../../faginnhold/historikk'
import { useJevnligSjekk } from '../../hooks/useJevnligSjekk'
import type { Regel } from '../../verktoy/regler/modell'
import { varslerFor, type Regelvarsel, type Regelvarsellager } from '../../verktoy/overvaking/regelvarsler'
import { LESEFRIST_MS, medFrist } from '../../verktoy/sperrer'
import { Ikon } from '../ikon/Ikon'

/**
 * De faglige varslene fra kildeoppfølgingen (`les_regelvarsler`, VDR-1/VDR-3
 * i `docs/verktøy-omlegging-2026-11.md`) slik verktøysiden kjenner dem:
 * `varsler` er de sist leste (`null` før noen lesing har lyktes), og `feil`
 * at den siste lesingen ikke lyktes, ikke svarte innen `LESEFRIST_MS` eller
 * ga et svar med ukjent form. Er ingen av delene satt, pågår den første lesingen. Et varsel sperrer aldri, og en lesing
 * som feiler, stopper ingen beregning; nødstoppen leses for seg (`sperrer.ts`).
 */
export interface Varseltilstand {
  varsler: readonly Regelvarsel[] | null
  feil: boolean
}

/** Det som står mens den første lesingen pågår, så «ingen merknad» ikke vises før det er kjent. */
export const VARSLER_HENTES = 'Henter eventuelle faglige merknader fra kildeoppfølgingen …'

/** Det som står når varslene ikke kunne leses: kort, ved anbefalingen, så et varsel ikke forsvinner i stillhet. */
export const VARSLER_ULEST =
  'OUSFAR fikk ikke hentet eventuelle faglige merknader fra kildeoppfølgingen. Beregningen og nødstoppen påvirkes ikke. Prøv igjen senere.'

/**
 * Leser varslene med en gang, når fanen får fokus og jevnlig. Feiler en
 * lesing, beholdes varslene fra forrige vellykkede lesing, og `feil` sier fra.
 * Uten lager kan ingenting leses, og det sies fra på samme måte.
 */
export function useRegelvarsler(lager: Regelvarsellager | undefined): Varseltilstand {
  const [tilstand, setTilstand] = useState<Varseltilstand>({ varsler: null, feil: false })
  // Bare svaret fra den siste lesingen som er startet, brukes.
  const siste = useRef(0)
  const les = useCallback(() => {
    const denne = ++siste.current
    const bruk = (endre: (t: Varseltilstand) => Varseltilstand) => denne === siste.current && setTilstand(endre)
    if (!lager) return void bruk((t) => ({ ...t, feil: true }))
    medFrist(lager.les(), LESEFRIST_MS, 'De faglige varslene svarte ikke i tide.').then(
      (varsler) => bruk(() => ({ varsler, feil: false })),
      () => bruk((t) => ({ ...t, feil: true })),
    )
  }, [lager])
  useJevnligSjekk(les)
  return tilstand
}

/**
 * Varslene ved anbefalingen de gjelder, at de hentes før den første lesingen
 * har svart, og at de ikke kunne leses når det er tilfellet; ellers ingenting.
 * Ingenting av dette sperrer.
 */
export function Regelvarsler({ tilstand, regel }: { tilstand: Varseltilstand; regel: Pick<Regel, 'id' | 'versjon'> }) {
  const egne = varslerFor(tilstand.varsler ?? [], regel.id, regel.versjon)
  const venter = tilstand.varsler === null && !tilstand.feil
  if (egne.length === 0 && !tilstand.feil && !venter) return null
  return (
    <div className="regelvarsel" role="note" aria-label="Faglig merknad" data-ulest={tilstand.feil || venter || undefined}>
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
        {venter && <p className="regelvarsel__ulest">{VARSLER_HENTES}</p>}
        {tilstand.feil && <p className="regelvarsel__ulest">{VARSLER_ULEST}</p>}
      </div>
    </div>
  )
}
