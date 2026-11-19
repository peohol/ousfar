/**
 * Gruppene: formen dataene har, og lesingen av det databasen svarer
 * (`mine_grupper`, `gruppeoversikt` og svarene fra operasjonene). Alt her er
 * rene funksjoner; kallene står i `api.ts`, og reglene databasen håndhever, i
 * migrasjonen `*_grupper.sql` og i docs/fagmiljoer.md, «Gruppene».
 *
 * Verdier som ikke har formen, blir tomme i stedet for å velte visningen, som
 * ellers i appen (`src/ideer/lesing.ts`).
 */
import type { Profilkort } from '@delt/profil'
import { erObjekt, tall, tekst, tekstEllerNull } from '../ideer/lesing'
import { lesGruppesymbol, type Gruppesymbol } from './symbol'

/** Rollene i en gruppe, fra den med minst myndighet. */
export const GRUPPEROLLER = ['medlem', 'moderator', 'ansvarlig'] as const
export type Grupperolle = (typeof GRUPPEROLLER)[number]

/** Navnet på rollen, slik det står i lista og i valgene. */
export const ROLLENAVN: Readonly<Record<Grupperolle, string>> = {
  medlem: 'Medlem',
  moderator: 'Moderator',
  ansvarlig: 'Ansvarlig',
}

/** Hva rollen gir, kort, til valgene. */
export const ROLLEFORKLARING: Readonly<Record<Grupperolle, string>> = {
  medlem: 'Leser og skriver i diskusjonene og idéene, og kan få oppgaver.',
  moderator: 'Kan også skjule, arkivere og ordne diskusjonene, og slette idéer og kommentarer.',
  ansvarlig: 'Kan også invitere, endre roller, fjerne medlemmer og behandle idéene og oppgavene.',
}

export type Gruppeart = 'fagmiljo' | 'tverrfaglig'
export type Gruppestatus = 'aktiv' | 'arkivert'
export type Medlemsstatus = 'invitert' | 'aktiv' | 'avsluttet'

/** En gruppe, slik den står overalt (`intern.gruppereferanse`). */
export interface Gruppe {
  id: string
  navn: string
  beskrivelse: string
  art: Gruppeart
  status: Gruppestatus
  /** Fagmiljøet gruppen hører til; `null` for en gruppe på tvers. */
  fagmiljo: { id: string; navn: string } | null
  /** Emojien eller bildet gruppen har valgt (`symbol.ts`); uten står gruppeikonet. */
  symbol?: Gruppesymbol | null
}

/** En gruppe i oversikten, med rollen den innloggede har der. */
export interface MinGruppe extends Gruppe {
  /** `null` for en systemarkitekt som ikke selv er med. */
  rolle: Grupperolle | null
  /** Antall aktive medlemmer. */
  medlemmer: number
}

export interface Gruppeinvitasjon {
  gruppe: Gruppe
  invitert_kl: string
  invitert_av: Pick<Profilkort, 'username' | 'first_name' | 'last_name'> | null
}

/** Svaret fra `mine_grupper`. */
export interface MineGrupper {
  grupper: MinGruppe[]
  invitasjoner: Gruppeinvitasjon[]
  /** Hvor den innloggede kan opprette en gruppe. */
  kan_opprette: { tverrfaglig: boolean; fagmiljoer: { id: string; navn: string }[] }
  /** Gruppechatten er slått på (`intern.gruppechat_aktivert()`, docs/gruppechat.md). */
  chat_aktivert: boolean
}

export const INGEN_GRUPPER: MineGrupper = {
  grupper: [],
  invitasjoner: [],
  kan_opprette: { tverrfaglig: false, fagmiljoer: [] },
  chat_aktivert: false,
}

/** Ett medlem eller én invitert i gruppen, med handlingene den innloggede kan gjøre. */
export interface Gruppemedlem extends Profilkort {
  rolle: Grupperolle
  status: Exclude<Medlemsstatus, 'avsluttet'>
  fra: string
  aktiv_fra: string | null
  /**
   * Medlemmet leser gruppen nå. Usant for et aktivt medlem som har mistet
   * medlemskapet i fagmiljøet en gruppe i et fagmiljø hører til.
   */
  har_tilgang: boolean
  kan_fjerne: boolean
  kan_endre_rolle: boolean
  /** Den eneste ansvarlige: kan verken gå, fjernes eller få en annen rolle. */
  siste_ansvarlige: boolean
}

/** Tallene til fanene i gruppen (`intern.gruppesamhandling`). */
export interface Gruppesamhandling {
  /** Idéer som er nye, eller har nye kommentarer, for den innloggede. */
  nye_ideer: number
  /** Idéer som venter på behandling: verken «Ikke aktuelt» eller gjort om til en oppgave. */
  venter: number
  /** Oppgaver den innloggede har, og som ikke er fullført. */
  mine_oppgaver: number
  /**
   * Meldinger fra andre i chatten som den innloggede ikke har lest
   * (docs/gruppechat.md). `null` når chatten er avslått eller databasen ikke
   * gir tallet: da står ingen chatfane.
   */
  chat_uleste: number | null
}

export const INGEN_SAMHANDLING: Gruppesamhandling = { nye_ideer: 0, venter: 0, mine_oppgaver: 0, chat_uleste: null }

/** Svaret fra `gruppeoversikt`. */
export interface Gruppeoversikt extends Gruppe {
  opprettet_kl: string
  rolle: Grupperolle | null
  kan_styre: boolean
  kan_moderere: boolean
  kan_forlate: boolean
  kan_gjenapne: boolean
  medlemmer: Gruppemedlem[]
  samhandling: Gruppesamhandling
}

/** Svaret fra operasjonene på et medlemskap. */
export interface Gruppesvar {
  gruppe: string
  bruker: string
  status: Medlemsstatus | 'ingen'
  rolle: Grupperolle | null
}

/* --- Lesingen ---------------------------------------------------------------- */

export const enAv = <T extends string>(verdier: readonly T[], verdi: unknown): T | null =>
  typeof verdi === 'string' && (verdier as readonly string[]).includes(verdi) ? (verdi as T) : null

export const liste = <T>(verdi: unknown, les: (v: unknown) => T | null): T[] =>
  Array.isArray(verdi) ? verdi.map(les).filter((v): v is T => v !== null) : []

const lesRolle = (verdi: unknown) => enAv(GRUPPEROLLER, verdi)

const lesReferanse = (verdi: unknown): { id: string; navn: string } | null =>
  erObjekt(verdi) && tekst(verdi.id) ? { id: tekst(verdi.id), navn: tekst(verdi.navn) } : null

export function lesGruppe(verdi: unknown): Gruppe | null {
  if (!erObjekt(verdi) || !tekst(verdi.id)) return null
  return {
    id: tekst(verdi.id),
    navn: tekst(verdi.navn),
    beskrivelse: tekst(verdi.beskrivelse),
    art: enAv(['fagmiljo', 'tverrfaglig'] as const, verdi.art) ?? 'tverrfaglig',
    status: enAv(['aktiv', 'arkivert'] as const, verdi.status) ?? 'aktiv',
    fagmiljo: lesReferanse(verdi.fagmiljo),
    symbol: lesGruppesymbol(verdi.symbol),
  }
}

const lesProfilkort = (verdi: Record<string, unknown>) => ({
  username: tekst(verdi.username),
  first_name: tekst(verdi.first_name),
  last_name: tekst(verdi.last_name),
})

/** En invitasjon slik `mine_grupper` gir den. */
export function lesInvitasjon(v: unknown): Gruppeinvitasjon | null {
  const gruppe = erObjekt(v) ? lesGruppe(v.gruppe) : null
  if (!gruppe || !erObjekt(v)) return null
  return { gruppe, invitert_kl: tekst(v.invitert_kl), invitert_av: erObjekt(v.invitert_av) ? lesProfilkort(v.invitert_av) : null }
}

export function lesMineGrupper(verdi: unknown): MineGrupper {
  if (!erObjekt(verdi)) return INGEN_GRUPPER
  const kan = erObjekt(verdi.kan_opprette) ? verdi.kan_opprette : {}
  return {
    grupper: liste(verdi.grupper, (v) => {
      const gruppe = lesGruppe(v)
      return gruppe && erObjekt(v) ? { ...gruppe, rolle: lesRolle(v.rolle), medlemmer: tall(v.medlemmer) } : null
    }),
    invitasjoner: liste(verdi.invitasjoner, lesInvitasjon),
    kan_opprette: { tverrfaglig: kan.tverrfaglig === true, fagmiljoer: liste(kan.fagmiljoer, lesReferanse) },
    chat_aktivert: verdi.chat_aktivert === true,
  }
}

function lesMedlem(verdi: unknown): Gruppemedlem | null {
  if (!erObjekt(verdi) || !tekst(verdi.id)) return null
  const rolle = lesRolle(verdi.rolle)
  const status = enAv(['invitert', 'aktiv'] as const, verdi.status)
  if (!rolle || !status) return null
  return {
    id: tekst(verdi.id),
    ...lesProfilkort(verdi),
    avatar_path: tekstEllerNull(verdi.avatar_path),
    updated_at: tekst(verdi.updated_at),
    rolle,
    status,
    fra: tekst(verdi.fra),
    aktiv_fra: tekstEllerNull(verdi.aktiv_fra),
    har_tilgang: verdi.har_tilgang === true,
    kan_fjerne: verdi.kan_fjerne === true,
    kan_endre_rolle: verdi.kan_endre_rolle === true,
    siste_ansvarlige: verdi.siste_ansvarlige === true,
  }
}

export function lesSamhandling(verdi: unknown): Gruppesamhandling {
  if (!erObjekt(verdi)) return INGEN_SAMHANDLING
  return {
    nye_ideer: tall(verdi.nye_ideer),
    venter: tall(verdi.venter),
    mine_oppgaver: tall(verdi.mine_oppgaver),
    chat_uleste: typeof verdi.chat_uleste === 'number' && Number.isFinite(verdi.chat_uleste) ? Math.max(0, verdi.chat_uleste) : null,
  }
}

export function lesGruppeoversikt(verdi: unknown): Gruppeoversikt | null {
  const gruppe = lesGruppe(verdi)
  if (!gruppe || !erObjekt(verdi)) return null
  return {
    ...gruppe,
    opprettet_kl: tekst(verdi.opprettet_kl),
    rolle: lesRolle(verdi.rolle),
    kan_styre: verdi.kan_styre === true,
    kan_moderere: verdi.kan_moderere === true,
    kan_forlate: verdi.kan_forlate === true,
    kan_gjenapne: verdi.kan_gjenapne === true,
    medlemmer: liste(verdi.medlemmer, lesMedlem),
    samhandling: lesSamhandling(verdi.samhandling),
  }
}

export function lesGruppesvar(verdi: unknown): Gruppesvar {
  const v = erObjekt(verdi) ? verdi : {}
  return {
    gruppe: tekst(v.gruppe),
    bruker: tekst(v.bruker),
    status: enAv(['invitert', 'aktiv', 'avsluttet', 'ingen'] as const, v.status) ?? 'ingen',
    rolle: lesRolle(v.rolle),
  }
}

/* --- Visningen --------------------------------------------------------------- */

/** Hvor gruppen hører til, kort: fagmiljøet, eller «På tvers av fagmiljøene». */
export function gruppetilhorighet(gruppe: Pick<Gruppe, 'fagmiljo'>): string {
  return gruppe.fagmiljo ? gruppe.fagmiljo.navn : 'På tvers av fagmiljøene'
}

/** De aktive medlemmene og de inviterte, hver for seg, i rekkefølgen databasen gir. */
export function delMedlemmer(medlemmer: readonly Gruppemedlem[]): { aktive: Gruppemedlem[]; inviterte: Gruppemedlem[] } {
  return {
    aktive: medlemmer.filter((m) => m.status === 'aktiv'),
    inviterte: medlemmer.filter((m) => m.status === 'invitert'),
  }
}
