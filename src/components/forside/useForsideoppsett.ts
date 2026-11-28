import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { harFunksjon, useRettigheter } from '../../auth/rettigheter'
import { hentOppsett, lagreOppsett } from '../../forside/api'
import { STANDARDOPPSETT, tilgangFor, type Forsideoppsett, type Tilgang } from '../../forside/moduler'

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
 * Panelene den innloggede har nå: de med en funksjon bare når hen har den i
 * fagmiljøet hen arbeider i (`public.mine_funksjoner()`). Følger rettighetene,
 * så et panel forsvinner og kommer tilbake med funksjonen og fagmiljøbyttet.
 */
export function useModultilgang(): Tilgang {
  const rettigheter = useRettigheter()
  return useMemo(() => tilgangFor(rettigheter.arbeidsfagmiljo, (funksjon, fagmiljo) => harFunksjon(rettigheter, funksjon, fagmiljo)), [rettigheter])
}
