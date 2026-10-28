import { useCallback, useMemo } from 'react'
import { sokeord, sokGlobalt, type Soketreff } from '../../faginnhold/sok'
import type { Sokeindekstilstand } from '../../hooks/useSokeindeks'
import { sokVerktoy } from '../../verktoy/register'
import { visTreff, visVerktoy, type Treffvisning } from './treffvisning'

/**
 * Treffene for et søk i fagstoffet, best først — det beste treffet på hvert
 * sted (`sokGlobalt`). Tomt til indeksen er hentet. `vis` gjør et treff klart
 * til å vises; rullegardinen trenger bare de første, søkesiden alle.
 *
 * `verktoy` er verktøyene søket finner, som en egen trefftype. De søkes i
 * verktøyregisteret i appen og står der med én gang, også mens fagstoffet
 * hentes.
 */
export function useFagsoketreff(
  tilstand: Sokeindekstilstand,
  sporring: string,
  beskrivSide?: (stoff: string) => string | undefined,
): { treff: Soketreff[]; vis: (treff: Soketreff) => Treffvisning; verktoy: Treffvisning[] } {
  const ord = useMemo(() => sokeord(sporring), [sporring])
  const verktoy = useMemo(() => sokVerktoy(sporring).map((t) => visVerktoy(t, ord)), [sporring, ord])
  const treff = useMemo(
    () => (tilstand.status === 'klar' && ord.length > 0 ? sokGlobalt(tilstand.indeks, sporring, Infinity) : []),
    [tilstand, sporring, ord],
  )
  const vis = useCallback((t: Soketreff) => visTreff(t, ord, beskrivSide), [ord, beskrivSide])
  return { treff, vis, verktoy }
}
