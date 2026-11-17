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
  slettet: null | { av: 'forfatter' | 'moderator'; kl: string }
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
}

/** Svaret fra `gruppechat_endringer`. */
export interface Chatendringer {
  /** Stigende etter `endring`. */
  meldinger: Gruppemelding[]
  siste_endring: number
  /** Det er mer å hente etter `siste_endring`. */
  flere: boolean
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
}

const INGEN_LESERE: Chatlesere = { medlemmer: 0, systemarkitekter: true }

function lesForfatter(verdi: unknown): Profilkort | null {
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
  return { av: verdi.av === 'moderator' ? 'moderator' : 'forfatter', kl: tekst(verdi.kl) }
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
    forfatter: lesForfatter(verdi.forfatter),
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

/** Svaret fra `les_gruppechat`, eller `null` uten formen. */
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
  }
}

/** Svaret fra `gruppechat_endringer`, eller `null` uten formen. */
export function lesChatendringer(verdi: unknown): Chatendringer | null {
  if (!erObjekt(verdi)) return null
  return {
    meldinger: lesMeldinger(verdi.meldinger).sort((a, b) => a.endring - b.endring),
    siste_endring: tall(verdi.siste_endring),
    flere: verdi.flere === true,
  }
}

/** Navnet på avsenderen, slik det står over meldingen. */
export function avsendernavn(melding: Pick<Gruppemelding, 'forfatter'>): string {
  const f = melding.forfatter
  if (!f) return 'Slettet bruker'
  const navn = `${f.first_name} ${f.last_name}`.trim()
  return navn || f.username
}
