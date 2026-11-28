import { useCallback, useEffect, useRef, useState } from 'react'
import { useKontekstbytte } from './useKontekstbytte'

/** Noe appen henter: på vei, ikke mulig å hente, eller hentet. */
export type Henting<T> =
  | { status: 'laster' }
  | { status: 'feil'; melding: string }
  | { status: 'klar'; data: T }

/**
 * Henter noe én gang når komponenten settes opp.
 *
 * `hentPaNytt` henter det igjen: etter en feil, eller når en administrator kan
 * ha publisert noe nytt. Har appen det alt, blir det stående til det nye er
 * hentet, så det som bruker det ikke blinker; en feil da beholder det gamle.
 * Den svarer om nettopp denne hentingen ble det som vises (`true`), eller om
 * den feilet eller ble forbigått av en nyere (`false`), for den som må vite
 * at det gamle er erstattet.
 *
 * `kontekst` er det svaret gjelder for, som fagmiljøet fortolkningsreglene
 * hører til. Byttes den, tømmes det appen har, før det nye hentes: noe som
 * hørte til den forrige, skal ikke vises i mellomtiden.
 */
export function useHenting<T>(
  hent: () => Promise<T>,
  kontekst?: string | null,
): { tilstand: Henting<T>; hentPaNytt: () => Promise<boolean> } {
  const [tilstand, setTilstand] = useState<Henting<T>>({ status: 'laster' })
  // Bare det siste svaret teller, om to hentinger skulle krysse hverandre.
  const siste = useRef(0)

  const hentPaNytt = useCallback((): Promise<boolean> => {
    const denne = (siste.current += 1)
    setTilstand((forrige) => (forrige.status === 'feil' ? { status: 'laster' } : forrige))
    return hent().then(
      (data) => {
        if (denne !== siste.current) return false
        setTilstand({ status: 'klar', data })
        return true
      },
      (feil: unknown) => {
        if (denne !== siste.current) return false
        const melding = feil instanceof Error ? feil.message : String(feil)
        setTilstand((forrige) => (forrige.status === 'klar' ? forrige : { status: 'feil', melding }))
        return false
      },
    )
  }, [hent])

  useEffect(() => {
    void hentPaNytt()
  }, [hentPaNytt])

  const hentForfra = useCallback(() => {
    setTilstand({ status: 'laster' })
    void hentPaNytt()
  }, [hentPaNytt])
  useKontekstbytte(kontekst, hentForfra)

  return { tilstand, hentPaNytt }
}
