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
import { createContext, useCallback, useContext, type ReactNode } from 'react'
import { useKontoensSvarMedSjekk } from '../hooks/useKontoensSvar'
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
  /**
   * De aktive fagmiljøene den innloggede er aktivt medlem av, etter navn.
   * Arbeidsfagmiljøet velges blant dem (`velgArbeidsfagmiljo`).
   */
  mineFagmiljoer: readonly Fagmiljoreferanse[]
  /** Kan endre stoffregisterets inndeling og arkiv. */
  stoffregister: boolean
  /** Kan opprette nye brukere. */
  opprettBruker: boolean
}

export const INGEN_RETTIGHETER: Rettigheter = {
  systemarkitekt: false,
  administrerer: [],
  arbeidsfagmiljo: null,
  mineFagmiljoer: [],
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

/** En liste fagmiljøer i svaret, uten dem som har feil form. */
const lesFagmiljoer = (v: unknown): Fagmiljoreferanse[] =>
  Array.isArray(v) ? v.map(lesFagmiljo).filter((f): f is Fagmiljoreferanse => f !== null) : []

/** Svaret fra databasen, der alt som mangler eller har feil form, regnes som nei. */
export function lesRettigheter(svar: unknown): Rettigheter {
  const r = typeof svar === 'object' && svar !== null ? (svar as Record<string, unknown>) : {}
  return {
    systemarkitekt: r.systemarkitekt === true,
    administrerer: lesFagmiljoer(r.administrerer),
    arbeidsfagmiljo: lesFagmiljo(r.arbeidsfagmiljo),
    mineFagmiljoer: lesFagmiljoer(r.mine_fagmiljoer),
    stoffregister: r.stoffregister === true,
    opprettBruker: r.opprett_bruker === true,
  }
}

export async function hentMineRettigheter(): Promise<Rettigheter> {
  const { data, error } = await klient().rpc('mine_rettigheter')
  if (error) throw error
  return lesRettigheter(data)
}

/**
 * Gjør `fagmiljo` til fagmiljøet den innloggede arbeider i, blant egne aktive
 * medlemskap, og gir rettighetene etter byttet. Databasen kontrollerer
 * medlemskapet og lagrer valget; det gjelder fortolkningen og ingenting annet.
 */
export async function velgArbeidsfagmiljo(fagmiljo: string): Promise<Rettigheter> {
  const { data, error } = await klient().rpc('velg_arbeidsfagmiljo', { fagmiljo })
  if (error) throw error
  return lesRettigheter(data)
}

/**
 * Om den innloggede kan velge hvilket fagmiljø hen arbeider i: med flere å
 * velge mellom, eller når det hen arbeider i, ikke lenger er blant dem (som
 * når det er arkivert) og et annet kan velges.
 */
export const kanVelgeArbeidsfagmiljo = (r: Rettigheter): boolean =>
  r.mineFagmiljoer.length > 1 ||
  (r.mineFagmiljoer.length === 1 && r.mineFagmiljoer[0]!.id !== r.arbeidsfagmiljo?.id)

/** Om den innloggede har noe å gjøre i adminmenyen. */
export const harAdministrasjon = (r: Rettigheter): boolean =>
  r.systemarkitekt || r.opprettBruker || r.administrerer.length > 0

const Kontekst = createContext<Rettigheter>(INGEN_RETTIGHETER)
/** Tar i bruk `nye` rettigheter en endring alt ga tilbake, eller henter dem på nytt uten. */
export type OppdaterRettigheter = (nye?: Rettigheter) => void
const Oppdatering = createContext<OppdaterRettigheter>(() => undefined)

/** Gir rettighetene videre, og `oppdater` for å ta i bruk eller hente nye etter en endring den innloggede selv gjorde. */
export function RettigheterKilde({
  verdi,
  oppdater = () => undefined,
  children,
}: {
  verdi: Rettigheter
  oppdater?: OppdaterRettigheter
  children: ReactNode
}) {
  return (
    <Kontekst.Provider value={verdi}>
      <Oppdatering.Provider value={oppdater}>{children}</Oppdatering.Provider>
    </Kontekst.Provider>
  )
}

/** Tar i bruk eller henter nye rettigheter med en gang (`RettigheterKilde`). */
export function useOppdaterRettigheter(): OppdaterRettigheter {
  return useContext(Oppdatering)
}

/** Rettighetene appen er gitt (`RettigheterKilde`); ingen utenfor den. */
export function useRettigheter(): Rettigheter {
  return useContext(Kontekst)
}

/**
 * Henter rettighetene til kontoen og holder dem oppdatert, med `oppdater` for
 * å hente dem på nytt med en gang. `bruker` er kontoen de gjelder; en annen
 * konto starter uten rettigheter til svaret kommer.
 */
export function useMineRettigheter(
  bruker: string,
  hent: () => Promise<Rettigheter> = hentMineRettigheter,
): { rettigheter: Rettigheter; oppdater: OppdaterRettigheter } {
  const { verdi, sjekk, sett } = useKontoensSvarMedSjekk(bruker, hent, INGEN_RETTIGHETER)
  const oppdater = useCallback<OppdaterRettigheter>((nye) => (nye ? sett(nye) : sjekk()), [sett, sjekk])
  return { rettigheter: verdi, oppdater }
}
