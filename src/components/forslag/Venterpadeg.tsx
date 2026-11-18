import { useCallback } from 'react'
import { useRettigheter } from '../../auth/rettigheter'
import { forslagsadresse } from '../../domain/rute'
import { hentForslagsantall } from '../../forslag/behandling'
import type { Forslagsrad } from '../../forslag/modell'
import { useHentet, type Hentet } from './Forslagsside'

interface Punkt {
  id: string
  tekst: string
  antall: number
  adresse: string
  /** Noe den innloggede skal gjøre, ikke bare noe å vite. */
  venter: boolean
}

/**
 * Den rolige oppsummeringen øverst på `#/forslag` (planen §9, D6): det som
 * venter på den innloggede, før arbeidslistene. Alle får egne forslag som
 * venter på svar; den som behandler forslag, får også de nye ingen har tatt,
 * dem hen behandler selv og hvor mange som er under behandling i alt
 * (`les_forslagsko`, bare tallene). Hvert tall er en lenke til lista det
 * hører til. Et tall som ikke kunne hentes, står ikke; lista under sier fra
 * om feilen.
 */
export function Venterpadeg({ mine }: { mine: Hentet<readonly Forslagsrad[]> }) {
  const behandler = useRettigheter().behandlerForslag
  const hentAntall = useCallback(() => (behandler ? hentForslagsantall() : Promise.resolve(null)), [behandler])
  const { tilstand: ko } = useHentet(hentAntall)
  const behandling = forslagsadresse(undefined, 'behandling')
  const antall = ko.status === 'klar' ? ko.data : null

  const punkter: Punkt[] = [
    ...(mine.status === 'klar'
      ? [{ id: 'svar', tekst: 'Venter på svar fra deg', antall: mine.data.filter((f) => f.venter_pa_meg).length, adresse: forslagsadresse(), venter: true }]
      : []),
    ...(antall
      ? [
          { id: 'nye', tekst: 'Nye, uten behandler', antall: antall.nye, adresse: behandling, venter: true },
          { id: 'mine', tekst: 'Du behandler', antall: antall.mine, adresse: behandling, venter: true },
          { id: 'pagaende', tekst: 'Under behandling i alt', antall: antall.pagaende, adresse: behandling, venter: false },
        ]
      : []),
  ]
  if (punkter.length === 0) return null
  const ingenting = punkter.every((p) => !p.venter || p.antall === 0)

  return (
    <section className="forslagsoversikt" aria-label="Det som venter på deg">
      <ul className="forslagsoversikt__liste">
        {punkter.map((p) => (
          <li key={p.id}>
            <a className="forslagsoversikt__punkt" href={p.adresse} data-tomt={p.antall === 0 || undefined} data-venter={(p.venter && p.antall > 0) || undefined}>
              <span className="forslagsoversikt__tall">{p.antall}</span>
              <span className="forslagsoversikt__tekst">{p.tekst}</span>
            </a>
          </li>
        ))}
      </ul>
      {ingenting && <p className="forslagsoversikt__rolig">Ingenting venter på deg nå.</p>}
    </section>
  )
}
