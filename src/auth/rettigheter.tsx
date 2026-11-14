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
import { createContext, useContext, type ReactNode } from 'react'
import { useKontoensSvar } from '../hooks/useKontoensSvar'
import { klient } from './klient'

export interface Fagmiljoreferanse {
  id: string
  nokkel: string
  navn: string
  /** Nye brukere opprettes som medlemmer her. */
  standard: boolean
  /** Tar imot ordinære medlemmer (startporten S2 er passert for det). */
  apent: boolean
}

export interface Rettigheter {
  /** Kan alt som gjelder hele OUSFAR: datakildene, kildesakene, nødstoppen, kurateringene, autoerstatt og papirkurven. */
  systemarkitekt: boolean
  /** Fagmiljøene den innloggede er lokal administrator i nå. */
  administrerer: readonly Fagmiljoreferanse[]
  /**
   * Fagmiljøet fortolkningen gjelder (arbeidskonteksten, det aktive
   * primærmedlemskapet). Reglene databasen gir, er dette fagmiljøets; `null`
   * uten et slikt, og før det første svaret.
   */
  arbeidsfagmiljo: Fagmiljoreferanse | null
  /** Kan endre stoffregisterets inndeling og arkiv. */
  stoffregister: boolean
  /** Kan opprette nye brukere. */
  opprettBruker: boolean
}

export const INGEN_RETTIGHETER: Rettigheter = {
  systemarkitekt: false,
  administrerer: [],
  arbeidsfagmiljo: null,
  stoffregister: false,
  opprettBruker: false,
}

/** Et fagmiljø i svaret, eller `null` når formen er feil. Det som mangler av standard og åpent, regnes som nei. */
function lesFagmiljo(v: unknown): Fagmiljoreferanse | null {
  if (typeof v !== 'object' || v === null) return null
  const f = v as Record<string, unknown>
  if (!['id', 'nokkel', 'navn'].every((felt) => typeof f[felt] === 'string')) return null
  return { id: f.id as string, nokkel: f.nokkel as string, navn: f.navn as string, standard: f.standard === true, apent: f.apent === true }
}

/** Svaret fra databasen, der alt som mangler eller har feil form, regnes som nei. */
export function lesRettigheter(svar: unknown): Rettigheter {
  const r = typeof svar === 'object' && svar !== null ? (svar as Record<string, unknown>) : {}
  return {
    systemarkitekt: r.systemarkitekt === true,
    administrerer: Array.isArray(r.administrerer)
      ? r.administrerer.map(lesFagmiljo).filter((f): f is Fagmiljoreferanse => f !== null)
      : [],
    arbeidsfagmiljo: lesFagmiljo(r.arbeidsfagmiljo),
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
  return useKontoensSvar(bruker, hent, INGEN_RETTIGHETER)
}
