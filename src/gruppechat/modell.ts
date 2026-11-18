/**
 * Gruppechatten: formen dataene har, og lesingen av det databasen svarer
 * (docs/gruppechat.md, «Formen på svarene»). Alt her er rene funksjoner og
 * typer; kallene står i `api.ts`, sanntiden og tilstanden i `useGruppechat`
 * (tråd C), og visningen i `src/components/grupper/Gruppechat*.tsx` (tråd B).
 *
 * Verdier som ikke har formen, blir tomme i stedet for å velte visningen, som
 * ellers i appen (`src/ideer/lesing.ts`).
 */
import type { Profilkort } from '@delt/profil'
import { erObjekt, tall, tekst, tekstEllerNull } from '../ideer/lesing'

/**
 * Grensene databasen håndhever (`les_gruppechat(...).grenser` er fasit).
 * Appen bruker disse til svaret er lest.
 */
export const GRUPPECHAT_GRENSER = { maks_tegn: 4000, maks_per_minutt: 20 } as const

export interface Chatgrenser {
  maks_tegn: number
  maks_per_minutt: number
}

/** Én melding, slik funksjonene gir den. */
export interface Gruppemelding {
  id: string
  /** Løpenummeret i gruppen: rekkefølgen meldingene vises i. */
  nr: number
  /** Gruppens endringsteller da meldingen sist ble endret. */
  endring: number
  /** `null` når kontoen er slettet. */
  forfatter: Profilkort | null
  /** `null` når meldingen er slettet. */
  tekst: string | null
  skrevet_kl: string
  redigert_kl: string | null
  /**
   * Hvem som slettet: forfatteren, en moderator i gruppen, eller i en
   * direktesamtale den andre deltakeren (`motpart`).
   */
  slettet: null | { av: Slettetav; kl: string }
  /** Den innloggede skrev meldingen. */
  egen: boolean
  /**
   * ID-en nettleseren sendte meldingen med; bare på egne meldinger (`null`
   * ellers), så en ventende melding kan flettes sammen med den lagrede også
   * når endringene kommer før svaret, eller svaret går tapt.
   */
  klient_id: string | null
  kan_endre: boolean
  kan_slette: boolean
}

export type Slettetav = 'forfatter' | 'moderator' | 'motpart'

/**
 * Hvorfor den innloggede ikke kan skrive i en direktesamtale: hen har selv
 * slått av direktemeldinger (`selv_av`), har blokkert den andre
 * (`selv_blokkert`), eller den andre kan ikke motta (`mottaker`, uten grunn).
 */
export type Direktesperre = 'selv_av' | 'selv_blokkert' | 'mottaker'

/** Det en direktesamtale har i tillegg til en gruppechat (docs/direktemeldinger-personvern.md). */
export interface Direktemeta {
  /** Den andre i samtalen; `null` når kontoen er slettet. */
  motpart: Profilkort | null
  sperre: Direktesperre | null
  dempet: boolean
}

/** Hvem som kan lese chatten, til forklaringen øverst. */
export interface Chatlesere {
  /** Aktive medlemmer med tilgang nå. */
  medlemmer: number
  /** Systemarkitektene leser alle gruppene (P6). */
  systemarkitekter: boolean
}

/** Svaret fra `les_gruppechat`. */
export interface Chatside {
  /** Stigende etter `nr`. */
  meldinger: Gruppemelding[]
  flere_eldre: boolean
  siste_endring: number
  lest_til_nr: number
  kan_skrive: boolean
  kan_moderere: boolean
  lesere: Chatlesere
  grenser: Chatgrenser
  /** Bare i en direktesamtale. */
  direkte: Direktemeta | null
}

/** Svaret fra `gruppechat_endringer` og `direktesamtale_endringer`. */
export interface Chatendringer {
  /** Stigende etter `endring`. */
  meldinger: Gruppemelding[]
  siste_endring: number
  /** Det er mer å hente etter `siste_endring`. */
  flere: boolean
  /**
   * Bare i en direktesamtale: om det kan skrives nå, og den andre, sperren og
   * dempingen, så en åpen samtale ser endringene ved hvert livstegn.
   */
  kan_skrive?: boolean
  direkte?: Direktemeta | null
}

/** En melding som er sendt fra denne nettleseren, men ikke bekreftet ennå. */
export interface Ventende {
  klient_id: string
  tekst: string
  sendt_kl: string
  status: 'sender' | 'feilet'
  /** Feilen fra databasen, på norsk, når sendingen feilet. */
  feil: string | null
}

export type Chatstatus = 'laster' | 'klar' | 'ingen_tilgang' | 'feil'
export type Tilkobling = 'tilkoblet' | 'kobler_til' | 'frakoblet'

/**
 * Det visningen får fra `useGruppechat(gruppe)` (tråd C). Tråd B bygger mot
 * denne og mot testchatten (`src/__tests__/hjelp/testchat.ts`).
 */
export interface Gruppechat {
  status: Chatstatus
  /** Feilen når `status` er `'feil'`. */
  feil: string | null
  tilkobling: Tilkobling
  /** Stigende etter `nr`, uten duplikater. */
  meldinger: Gruppemelding[]
  /** Egne meldinger som ikke er bekreftet, i den rekkefølgen de ble sendt. */
  ventende: Ventende[]
  flereEldre: boolean
  henterEldre: boolean
  hentEldre: () => Promise<void>
  /** Sender teksten; den står som ventende til databasen har svart. */
  send: (tekst: string) => void
  provIgjen: (klientId: string) => void
  forkast: (klientId: string) => void
  /** Kaster med feilen på norsk når endringen ikke går. */
  endre: (melding: string, tekst: string) => Promise<void>
  slett: (melding: string) => Promise<void>
  /** Merker meldingene til og med `nr` lest; flytter bare framover. */
  merkLest: (nr: number) => void
  lestTilNr: number
  kanSkrive: boolean
  kanModerere: boolean
  lesere: Chatlesere
  grenser: Chatgrenser
  /** Bare i en direktesamtale: den andre, sperren og dempingen. */
  direkte: Direktemeta | null
  /** Henter det nye og rettighetene på nytt med en gang, etter noe brukeren selv har endret (som en blokkering). */
  oppfrisk: () => void
}

const INGEN_LESERE: Chatlesere = { medlemmer: 0, systemarkitekter: true }

/** Et profilkort fra databasen, eller `null` uten ID. */
export function lesProfilkort(verdi: unknown): Profilkort | null {
  if (!erObjekt(verdi) || typeof verdi.id !== 'string') return null
  return {
    id: verdi.id,
    username: tekst(verdi.username),
    first_name: tekst(verdi.first_name),
    last_name: tekst(verdi.last_name),
    avatar_path: tekstEllerNull(verdi.avatar_path),
    updated_at: tekst(verdi.updated_at),
  }
}

function lesSlettet(verdi: unknown): Gruppemelding['slettet'] {
  if (!erObjekt(verdi)) return null
  const av: Slettetav = verdi.av === 'moderator' || verdi.av === 'motpart' ? verdi.av : 'forfatter'
  return { av, kl: tekst(verdi.kl) }
}

/** Én melding, eller `null` når den mangler ID eller nummer. */
export function lesGruppemelding(verdi: unknown): Gruppemelding | null {
  if (!erObjekt(verdi) || typeof verdi.id !== 'string') return null
  const nr = tall(verdi.nr)
  if (nr < 1) return null
  const slettet = lesSlettet(verdi.slettet)
  return {
    id: verdi.id,
    nr,
    endring: tall(verdi.endring),
    forfatter: lesProfilkort(verdi.forfatter),
    tekst: slettet ? null : tekstEllerNull(verdi.tekst),
    skrevet_kl: tekst(verdi.skrevet_kl),
    redigert_kl: tekstEllerNull(verdi.redigert_kl),
    slettet,
    egen: verdi.egen === true,
    klient_id: verdi.egen === true ? tekstEllerNull(verdi.klient_id) : null,
    kan_endre: verdi.kan_endre === true,
    kan_slette: verdi.kan_slette === true,
  }
}

function lesMeldinger(verdi: unknown): Gruppemelding[] {
  return Array.isArray(verdi) ? verdi.map(lesGruppemelding).filter((m): m is Gruppemelding => m !== null) : []
}

function lesGrenser(verdi: unknown): Chatgrenser {
  if (!erObjekt(verdi)) return { ...GRUPPECHAT_GRENSER }
  return {
    maks_tegn: tall(verdi.maks_tegn) || GRUPPECHAT_GRENSER.maks_tegn,
    maks_per_minutt: tall(verdi.maks_per_minutt) || GRUPPECHAT_GRENSER.maks_per_minutt,
  }
}

function lesLesere(verdi: unknown): Chatlesere {
  if (!erObjekt(verdi)) return INGEN_LESERE
  return { medlemmer: tall(verdi.medlemmer), systemarkitekter: verdi.systemarkitekter !== false }
}

const SPERRER: readonly Direktesperre[] = ['selv_av', 'selv_blokkert', 'mottaker']

/** Det en direktesamtale har i tillegg, eller `null` (en gruppechat). */
export function lesDirektemeta(verdi: unknown): Direktemeta | null {
  if (!erObjekt(verdi)) return null
  return {
    motpart: lesProfilkort(verdi.motpart),
    sperre: SPERRER.find((s) => s === verdi.sperre) ?? null,
    dempet: verdi.dempet === true,
  }
}

/** Svaret fra `les_gruppechat` og `les_direktesamtale`, eller `null` uten formen. */
export function lesChatside(verdi: unknown): Chatside | null {
  if (!erObjekt(verdi)) return null
  return {
    meldinger: lesMeldinger(verdi.meldinger).sort((a, b) => a.nr - b.nr),
    flere_eldre: verdi.flere_eldre === true,
    siste_endring: tall(verdi.siste_endring),
    lest_til_nr: tall(verdi.lest_til_nr),
    kan_skrive: verdi.kan_skrive === true,
    kan_moderere: verdi.kan_moderere === true,
    lesere: lesLesere(verdi.lesere),
    grenser: lesGrenser(verdi.grenser),
    direkte: lesDirektemeta(verdi.direkte),
  }
}

/** Svaret fra `gruppechat_endringer`, eller `null` uten formen. */
export function lesChatendringer(verdi: unknown): Chatendringer | null {
  if (!erObjekt(verdi)) return null
  return {
    meldinger: lesMeldinger(verdi.meldinger).sort((a, b) => a.endring - b.endring),
    siste_endring: tall(verdi.siste_endring),
    flere: verdi.flere === true,
    ...(typeof verdi.kan_skrive === 'boolean' && { kan_skrive: verdi.kan_skrive }),
    ...('direkte' in verdi && { direkte: lesDirektemeta(verdi.direkte) }),
  }
}

/** Navnet på avsenderen, slik det står over meldingen. */
export function avsendernavn(melding: Pick<Gruppemelding, 'forfatter'>): string {
  const f = melding.forfatter
  if (!f) return 'Slettet bruker'
  const navn = `${f.first_name} ${f.last_name}`.trim()
  return navn || f.username
}
