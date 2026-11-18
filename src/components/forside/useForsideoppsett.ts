import { useCallback, useEffect, useRef, useState } from 'react'
import { useProfil } from '../../auth/okt'
import { hentOppsett, lagreOppsett } from '../../forside/api'
import { STANDARDOPPSETT, type Forsideoppsett } from '../../forside/moduler'

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
  const [oppsett, setOppsett] = useState<Forsideoppsett>(() => (sistKjent?.bruker === bruker ? sistKjent.oppsett : STANDARDOPPSETT))
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
