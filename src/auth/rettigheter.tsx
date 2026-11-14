/**
 * Den innloggedes egne rettigheter, slik databasen svarer på dem
 * (`public.mine_rettigheter()`, docs/fagmiljoer.md, «Systemrettigheter»).
 *
 * Appen viser menyer og knapper etter dem: adminmenyen, «Opprett bruker» og
 * redigeringen av stoffregisteret. Det er et grensesnitt, ikke en kontroll;
 * databasen og Edge-funksjonene kontrollerer hver handling på nytt. Den
 * gamle adminrollen (`profiles.role`) spiller ingen rolle her.
 *
 * Rettighetene hentes når appen åpnes, når fanen blir synlig igjen og
 * jevnlig, så en endring slår gjennom uten ny innlogging. Et svar som feiler,
 * endrer ingenting; før det første svaret vises ingen rettigheter.
 */
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useJevnligSjekk } from '../hooks/useJevnligSjekk'
import { klient } from './klient'

export interface Fagmiljoreferanse {
  id: string
  nokkel: string
  navn: string
}

export interface Rettigheter {
  /** Kan alt som gjelder hele OUSFAR: datakildene, kildesakene, nødstoppen, kurateringene, autoerstatt og papirkurven. */
  systemarkitekt: boolean
  /** Fagmiljøene den innloggede er lokal administrator i nå. */
  administrerer: readonly Fagmiljoreferanse[]
  /** Kan endre stoffregisterets inndeling og arkiv. */
  stoffregister: boolean
  /** Kan opprette nye brukere. */
  opprettBruker: boolean
}

export const INGEN_RETTIGHETER: Rettigheter = {
  systemarkitekt: false,
  administrerer: [],
  stoffregister: false,
  opprettBruker: false,
}

const erFagmiljo = (v: unknown): v is Fagmiljoreferanse =>
  typeof v === 'object' &&
  v !== null &&
  ['id', 'nokkel', 'navn'].every((felt) => typeof (v as Record<string, unknown>)[felt] === 'string')

/** Svaret fra databasen, der alt som mangler eller har feil form, regnes som nei. */
export function lesRettigheter(svar: unknown): Rettigheter {
  const r = typeof svar === 'object' && svar !== null ? (svar as Record<string, unknown>) : {}
  return {
    systemarkitekt: r.systemarkitekt === true,
    administrerer: Array.isArray(r.administrerer) ? r.administrerer.filter(erFagmiljo) : [],
    stoffregister: r.stoffregister === true,
    opprettBruker: r.opprett_bruker === true,
  }
}

export async function hentMineRettigheter(): Promise<Rettigheter> {
  const { data, error } = await klient().rpc('mine_rettigheter')
  if (error) throw error
  return lesRettigheter(data)
}

/** Om den innloggede har noe å gjøre i adminmenyen. */
export const harAdministrasjon = (r: Rettigheter): boolean =>
  r.systemarkitekt || r.opprettBruker || r.administrerer.length > 0

const Kontekst = createContext<Rettigheter>(INGEN_RETTIGHETER)

export function RettigheterKilde({ verdi, children }: { verdi: Rettigheter; children: ReactNode }) {
  return <Kontekst.Provider value={verdi}>{children}</Kontekst.Provider>
}

/** Rettighetene appen er gitt (`RettigheterKilde`); ingen utenfor den. */
export function useRettigheter(): Rettigheter {
  return useContext(Kontekst)
}

/**
 * Henter rettighetene til kontoen og holder dem oppdatert. `bruker` er
 * kontoen de gjelder; en annen konto starter uten rettigheter til svaret
 * kommer.
 */
export function useMineRettigheter(bruker: string, hent: () => Promise<Rettigheter> = hentMineRettigheter): Rettigheter {
  const [svar, setSvar] = useState<{ bruker: string; rettigheter: Rettigheter } | null>(null)
  const sjekk = useCallback(() => {
    hent().then(
      // Samme svar gir samme objekt, så ingenting tegnes på nytt uten grunn.
      (rettigheter) =>
        setSvar((forrige) =>
          forrige !== null && forrige.bruker === bruker && JSON.stringify(forrige.rettigheter) === JSON.stringify(rettigheter)
            ? forrige
            : { bruker, rettigheter },
        ),
      () => undefined,
    )
  }, [bruker, hent])
  useJevnligSjekk(sjekk)
  return svar !== null && svar.bruker === bruker ? svar.rettigheter : INGEN_RETTIGHETER
}
