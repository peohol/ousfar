import { useCallback, useEffect, useState } from 'react'
import {
  REGLENE_KUNNE_IKKE_HENTES,
  tilScenarioregler,
  type Scenarioregeldata,
  type Scenarioreglertilstand,
} from '../../faginnhold/scenarioregler'
import { useKontekstbytte } from '../../hooks/useKontekstbytte'

/** Reglene appen har hentet, og en måte å hente dem på nytt. */
export interface Scenarioreglerkilde {
  tilstand: Scenarioreglertilstand
  provIgjen: () => void
}

/**
 * Henter de publiserte scenarioreglene én gang når appen starter, og på nytt
 * når noen ber om det: etter en feil, eller når en administrator har
 * publisert. `les` er kallet mot databasen; testene gir sitt eget. Byttes
 * fagmiljøet reglene gjelder (`kontekst`), tømmes de før de nye hentes.
 */
export function useHentScenarioregler(
  les: () => Promise<Scenarioregeldata>,
  kontekst?: string | null,
): Scenarioreglerkilde {
  const [tilstand, setTilstand] = useState<Scenarioreglertilstand>({ status: 'laster' })
  const [runde, setRunde] = useState(0)

  useEffect(() => {
    let gjelder = true
    // Reglene appen alt har, står til de nye er hentet, og blir stående om
    // hentingen feiler: fortolkningen skal ikke miste reglene underveis.
    setTilstand((forrige) => (forrige.status === 'klar' ? forrige : { status: 'laster' }))
    les()
      .then((data) => {
        if (gjelder) setTilstand({ status: 'klar', regler: tilScenarioregler(data) })
      })
      .catch((e: Error) => {
        if (!gjelder) return
        setTilstand((forrige) =>
          forrige.status === 'klar' ? forrige : { status: 'feil', melding: `${REGLENE_KUNNE_IKKE_HENTES} ${e.message}` },
        )
      })
    return () => {
      gjelder = false
    }
  }, [les, runde])

  const provIgjen = useCallback(() => setRunde((r) => r + 1), [])
  const hentForfra = useCallback(() => {
    setTilstand({ status: 'laster' })
    setRunde((r) => r + 1)
  }, [])
  useKontekstbytte(kontekst, hentForfra)
  return { tilstand, provIgjen }
}
