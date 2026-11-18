/**
 * Svaret fra `forsideoppsummering(modul)`: inntil tre rader til ett panel på
 * forsiden (docs/forside.md). Rene funksjoner; verdier uten riktig form blir
 * borte i stedet for å velte panelet.
 */
import { lesGruppe, lesInvitasjon, lesSamhandling, liste, type Gruppe, type Gruppeinvitasjon, type Gruppesamhandling } from '../grupper/modell'
import { erObjekt, tall, tekst } from '../ideer/lesing'
import { lesVarselliste, type Databasevarsel, type Favorittside } from '../varsler/modell'

/** En gruppe på forsiden: med antall medlemmer og det som er nytt der. */
export interface Forsidegruppe extends Gruppe {
  medlemmer: number
  samhandling: Gruppesamhandling
}

/** En fagside med publiserte endringer: delene som ble endret, og når. */
export interface Fagsideendring {
  side: Favorittside
  deler: string[]
  kl: string
}

/** En åpen oppgave den innloggede er ansvarlig for. */
export interface Forsideoppgave {
  id: string
  tittel: string
  prioritet: 'hoy' | 'normal' | 'lav'
  kl: string
  gruppe: { id: string; navn: string }
}

export interface Oppsummering {
  /** Når svaret ble lest: et varsel merkes lest slik det var da. */
  lest_kl: string
  varsler: Databasevarsel[]
  invitasjoner: Gruppeinvitasjon[]
  grupper: Forsidegruppe[]
  fagsider: Fagsideendring[]
  oppgaver: Forsideoppgave[]
}

/** Høyst så mange rader i et panel (planen §4.2); databasen gir aldri flere. */
export const RADER_PER_PANEL = 3

const lesForsidegruppe = (verdi: unknown): Forsidegruppe | null => {
  const gruppe = lesGruppe(verdi)
  return gruppe && erObjekt(verdi) ? { ...gruppe, medlemmer: tall(verdi.medlemmer), samhandling: lesSamhandling(verdi.samhandling) } : null
}

const lesFagsideendring = (verdi: unknown): Fagsideendring | null => {
  if (!erObjekt(verdi) || !erObjekt(verdi.side) || !tekst(verdi.side.id) || !tekst(verdi.side.stoff)) return null
  return {
    side: { id: tekst(verdi.side.id), navn: tekst(verdi.side.navn), stoff: tekst(verdi.side.stoff) },
    deler: Array.isArray(verdi.deler) ? verdi.deler.filter((d): d is string => typeof d === 'string') : [],
    kl: tekst(verdi.kl),
  }
}

const PRIORITETER = ['hoy', 'normal', 'lav'] as const

const lesForsideoppgave = (verdi: unknown): Forsideoppgave | null => {
  if (!erObjekt(verdi) || !tekst(verdi.id) || !erObjekt(verdi.gruppe) || !tekst(verdi.gruppe.id)) return null
  const prioritet = PRIORITETER.find((p) => p === verdi.prioritet) ?? 'normal'
  return {
    id: tekst(verdi.id),
    tittel: tekst(verdi.tittel),
    prioritet,
    kl: tekst(verdi.kl),
    gruppe: { id: tekst(verdi.gruppe.id), navn: tekst(verdi.gruppe.navn) },
  }
}

/** Svaret for én modul. Det modulen ikke gir, er tomt. */
export function lesOppsummering(data: unknown): Oppsummering {
  const svar = erObjekt(data) ? data : {}
  const { lest_kl, varsler } = lesVarselliste({ lest_kl: svar.lest_kl, varsler: svar.varsler })
  return {
    lest_kl,
    varsler,
    invitasjoner: liste(svar.invitasjoner, lesInvitasjon),
    grupper: liste(svar.grupper, lesForsidegruppe),
    fagsider: liste(svar.fagsider, lesFagsideendring),
    oppgaver: liste(svar.oppgaver, lesForsideoppgave),
  }
}
