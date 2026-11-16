/**
 * Den innloggedes egne rettigheter, slik databasen svarer på dem
 * (`public.mine_rettigheter()`, docs/fagmiljoer.md, «Systemrettigheter»).
 *
 * Appen viser menyer og knapper etter dem: adminmenyen, «Opprett bruker» per
 * fagmiljø og redigeringen av stoffregisteret. Det er et grensesnitt, ikke en kontroll;
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
  /** Standardfagmiljøet, som oppstartsskriptet gir nye kontoer. */
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
  /** De aktive fagmiljøene den innloggede er aktivt medlem av, etter navn. */
  mineFagmiljoer: readonly Fagmiljoreferanse[]
  /**
   * Fagmiljøene arbeidsfagmiljøet kan velges blant (`velgArbeidsfagmiljo`),
   * etter navn: de i {@link mineFagmiljoer}, og alle aktive for en
   * systemarkitekt, som kan se fortolkningen i et fagmiljø uten å være medlem.
   */
  velgbareFagmiljoer: readonly Fagmiljoreferanse[]
  /** Kan endre stoffregisterets inndeling og arkiv. */
  stoffregister: boolean
  /** Fagmiljøene den innloggede kan opprette nye brukere i (id-ene); nye kontoer blir medlemmer der. */
  opprettBrukerI: readonly string[]
  /** Har et redaktøransvar som gjelder nå (P5, docs/redaktorer-og-forslag.md). */
  redaktor: boolean
  /** Kan behandle endringsforslag til noe: redaktørene, administratorene og systemarkitektene. */
  behandlerForslag: boolean
}

export const INGEN_RETTIGHETER: Rettigheter = {
  systemarkitekt: false,
  administrerer: [],
  arbeidsfagmiljo: null,
  mineFagmiljoer: [],
  velgbareFagmiljoer: [],
  stoffregister: false,
  opprettBrukerI: [],
  redaktor: false,
  behandlerForslag: false,
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
  const mineFagmiljoer = lesFagmiljoer(r.mine_fagmiljoer)
  return {
    systemarkitekt: r.systemarkitekt === true,
    administrerer: lesFagmiljoer(r.administrerer),
    arbeidsfagmiljo: lesFagmiljo(r.arbeidsfagmiljo),
    mineFagmiljoer,
    // En database uten feltet gir bare medlemskapene å velge blant, som før.
    velgbareFagmiljoer: 'velgbare_fagmiljoer' in r ? lesFagmiljoer(r.velgbare_fagmiljoer) : mineFagmiljoer,
    stoffregister: r.stoffregister === true,
    opprettBrukerI: lesFagmiljoer(r.opprett_bruker_i).map((f) => f.id),
    redaktor: r.redaktor === true,
    behandlerForslag: r.behandler_forslag === true,
  }
}

export async function hentMineRettigheter(): Promise<Rettigheter> {
  const { data, error } = await klient().rpc('mine_rettigheter')
  if (error) throw error
  return lesRettigheter(data)
}

/**
 * Gjør `fagmiljo` til fagmiljøet den innloggede arbeider i, blant
 * {@link Rettigheter.velgbareFagmiljoer}, og gir rettighetene etter byttet.
 * Databasen kontrollerer valget og lagrer det; det gjelder fortolkningen og
 * ingenting annet, og en systemarkitekt blir ikke medlem av fagmiljøet.
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
export const kanVelgeArbeidsfagmiljo = ({ velgbareFagmiljoer: v, arbeidsfagmiljo }: Rettigheter): boolean =>
  v.length > 1 || (v.length === 1 && v[0]!.id !== arbeidsfagmiljo?.id)

/** Arbeidskonteksten når rettighetene er kjent og den innloggede ikke arbeider i noe fagmiljø. */
export const UTEN_ARBEIDSFAGMILJO = 'uten-arbeidsfagmiljo'

/**
 * Fagmiljøet fortolkningen gjelder, slik det hentede følger det
 * (`useKontekstbytte`): id-en, {@link UTEN_ARBEIDSFAGMILJO} når rettighetene er
 * kjent og hen ikke arbeider i noe (som når det er arkivert), og `null` før
 * de er kjent. Et skifte til eller fra «uten» er et bytte som det andre, så
 * ingenting hentet i det forrige fagmiljøet blir stående.
 */
export const arbeidskontekst = (r: Rettigheter, kjent: boolean): string | null =>
  kjent ? (r.arbeidsfagmiljo?.id ?? UTEN_ARBEIDSFAGMILJO) : null

/** Om den innloggede har noe å gjøre i adminmenyen. */
/** Om den innloggede kan gi redaktøransvar: lokale administratorer og systemarkitektene. */
export const kanGiRedaktoransvar = (r: Rettigheter): boolean => r.systemarkitekt || r.administrerer.length > 0

/**
 * Om den innloggede kan publisere fortolkningen i fagmiljøet hen arbeider i:
 * systemarkitektene og de lokale administratorene der. En redaktør endrer
 * utkastet, men publiserer ikke.
 */
export const kanPublisereFortolkningen = (r: Rettigheter): boolean =>
  r.systemarkitekt || (r.arbeidsfagmiljo !== null && r.administrerer.some((f) => f.id === r.arbeidsfagmiljo!.id))

export const harAdministrasjon = (r: Rettigheter): boolean =>
  r.systemarkitekt || r.opprettBrukerI.length > 0 || r.administrerer.length > 0

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
): { rettigheter: Rettigheter; oppdater: OppdaterRettigheter; arbeidskontekst: string | null } {
  const { verdi, kjent, sjekk, sett } = useKontoensSvarMedSjekk(bruker, hent, INGEN_RETTIGHETER)
  const oppdater = useCallback<OppdaterRettigheter>((nye) => (nye ? sett(nye) : sjekk()), [sett, sjekk])
  return { rettigheter: verdi, oppdater, arbeidskontekst: arbeidskontekst(verdi, kjent) }
}
