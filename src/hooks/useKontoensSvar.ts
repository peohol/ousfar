import { useCallback, useRef, useState } from 'react'
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
 * etter en endring den innloggede selv gjorde, og `sett` for å ta i bruk et
 * svar endringen alt ga tilbake. Begge har fast identitet. Bare det nyeste
 * tas i bruk: en henting som startet før en nyere henting eller før `sett`,
 * forkastes når den kommer, så et eldre svar aldri overskriver et nyere.
 * `kjent` sier om kontoen har fått et svar ennå.
 */
export function useKontoensSvarMedSjekk<T>(
  bruker: string,
  hent: () => Promise<T>,
  ingen: T,
): { verdi: T; kjent: boolean; sjekk: () => void; sett: (verdi: T) => void } {
  const [svar, setSvar] = useState<{ bruker: string; verdi: T } | null>(null)
  // Nummeret på det siste som ble bedt om; eldre svar forkastes.
  const siste = useRef(0)
  const ta = useCallback(
    (verdi: T) =>
      setSvar((forrige) =>
        forrige !== null && forrige.bruker === bruker && JSON.stringify(forrige.verdi) === JSON.stringify(verdi)
          ? forrige
          : { bruker, verdi },
      ),
    [bruker],
  )
  const sett = useCallback(
    (verdi: T) => {
      siste.current += 1
      ta(verdi)
    },
    [ta],
  )
  const sjekk = useCallback(() => {
    const denne = (siste.current += 1)
    hent().then(
      (verdi) => {
        if (denne === siste.current) ta(verdi)
      },
      () => undefined,
    )
  }, [hent, ta])
  useJevnligSjekk(sjekk)
  const kjent = svar !== null && svar.bruker === bruker
  return { verdi: kjent ? svar.verdi : ingen, kjent, sjekk, sett }
}
