import { useCallback, useState } from 'react'
import { useJevnligSjekk } from './useJevnligSjekk'

/**
 * Et svar fra databasen om kontoen `bruker`, hentet når appen åpnes, når
 * fanen blir synlig igjen og jevnlig (`useJevnligSjekk`), så en endring slår
 * gjennom uten ny innlogging. Et svar som feiler, endrer ingenting. Før det
 * første svaret, og for en annen konto til svaret for den kommer, gis
 * `ingen`. Samme svar gir samme verdi, så ingenting tegnes på nytt uten grunn.
 */
export function useKontoensSvar<T>(bruker: string, hent: () => Promise<T>, ingen: T): T {
  return useKontoensSvarMedSjekk(bruker, hent, ingen).verdi
}

/**
 * Som {@link useKontoensSvar}, med `sjekk` for å hente på nytt med en gang,
 * etter en endring den innloggede selv gjorde. `sjekk` har fast identitet.
 */
export function useKontoensSvarMedSjekk<T>(bruker: string, hent: () => Promise<T>, ingen: T): { verdi: T; sjekk: () => void } {
  const [svar, setSvar] = useState<{ bruker: string; verdi: T } | null>(null)
  const sjekk = useCallback(() => {
    hent().then(
      (verdi) =>
        setSvar((forrige) =>
          forrige !== null && forrige.bruker === bruker && JSON.stringify(forrige.verdi) === JSON.stringify(verdi)
            ? forrige
            : { bruker, verdi },
        ),
      () => undefined,
    )
  }, [bruker, hent])
  useJevnligSjekk(sjekk)
  return { verdi: svar !== null && svar.bruker === bruker ? svar.verdi : ingen, sjekk }
}
