import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { harFunksjon, useRettigheter, type Rettigheter } from '../../auth/rettigheter'
import { hentOppsett, lagreOppsett } from '../../forside/api'
import { erForsidemodul, STANDARDOPPSETT, tilgangFor, type Forsideoppsett, type Tilgang } from '../../forside/moduler'
import { glemPanelerUtenTilgang, type Paneltilgang } from './usePanelhenting'

/** Det siste oppsettet appen kjenner for brukeren, så forsiden står som sist når brukeren kommer tilbake. */
let sistKjent: { bruker: string; oppsett: Forsideoppsett } | null = null

/**
 * Brukerens oppsett av forsiden. Standarden (eller det siste kjente) tegnes
 * med en gang, så forsiden aldri venter på valget; når det lagrede er hentet,
 * byttes oppsettet uten at fokus flyttes. En endring brukeren gjør før det er
 * hentet, vinner. Svarer ikke tjenesten, står det som var.
 */
export function useForsideoppsett(
  hent: () => Promise<Forsideoppsett> = hentOppsett,
  lagre: (oppsett: Forsideoppsett) => Promise<void> = lagreOppsett,
): [Forsideoppsett, (oppsett: Forsideoppsett) => void] {
  const bruker = useProfil().id
  const [oppsett, setOppsett] = useState<Forsideoppsett>(() => (sistKjent && sistKjent.bruker === bruker ? sistKjent.oppsett : STANDARDOPPSETT))
  const endret = useRef(false)

  useEffect(() => {
    let gjelder = true
    hent().then(
      (lagret) => {
        if (!gjelder || endret.current) return
        sistKjent = { bruker, oppsett: lagret }
        setOppsett(lagret)
      },
      () => undefined,
    )
    return () => {
      gjelder = false
    }
  }, [hent, bruker])

  const endre = useCallback(
    (nytt: Forsideoppsett) => {
      endret.current = true
      sistKjent = { bruker, oppsett: nytt }
      setOppsett(nytt)
      void lagre(nytt).catch(() => undefined)
    },
    [lagre, bruker],
  )

  return [oppsett, endre]
}

/**
 * Panelene rettighetene `r` gir: de med en funksjon bare når den innloggede
 * har den i fagmiljøet hen arbeider i (`public.mine_funksjoner()`).
 */
export const modultilgang = (r: Rettigheter): Tilgang => tilgangFor(r.arbeidsfagmiljo, (funksjon, fagmiljo) => harFunksjon(r, funksjon, fagmiljo))

/** Det samme for hentingen, som kjenner panelene bare ved navn. */
export function paneltilgang(r: Rettigheter): Paneltilgang {
  const tilgang = modultilgang(r)
  return (modul) => erForsidemodul(modul) && tilgang(modul)
}

/**
 * Panelene den innloggede har nå. Følger rettighetene, så et panel forsvinner
 * og kommer tilbake med funksjonen og fagmiljøbyttet.
 */
export function useModultilgang(): Tilgang {
  const rettigheter = useRettigheter()
  return useMemo(() => modultilgang(rettigheter), [rettigheter])
}

/**
 * Glemmer det som er hentet til panelene rettighetene ikke lenger gir, hver
 * gang de endres, også når forsiden ikke vises (brukt i `App`). Et panel som
 * kommer tilbake, henter da på nytt i stedet for å vise det gamle.
 */
export function useGlemPanelerUtenTilgang(rettigheter: Rettigheter): void {
  useEffect(() => glemPanelerUtenTilgang(paneltilgang(rettigheter)), [rettigheter])
}
