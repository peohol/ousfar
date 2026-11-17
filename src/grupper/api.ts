/**
 * Kallene gruppene gjør mot Supabase. Alt går gjennom funksjonene i
 * databasen, som kontrollerer myndigheten selv og gir det samme svaret når en
 * operasjon alt er utført (docs/fagmiljoer.md, «Gruppene»). Tabellene nås ikke
 * fra nettleseren.
 */
import { lesbarFeil, UVENTET_FEIL, type Databasefeil } from '../auth/databasefeil'
import { klient } from '../auth/klient'
import {
  lesGruppeoversikt,
  lesGruppesvar,
  lesMineGrupper,
  type Grupperolle,
  type Gruppeoversikt,
  type Gruppesvar,
  type MineGrupper,
} from './modell'
import { lesGruppeoppgave, lesGruppeoppgaveliste, type Gruppeoppgave, type Gruppeoppgaveliste, type Gruppeoppgavestatus, type Prioritet } from './oppgaver'
import type { Riktekstdokument } from '../faginnhold/riktekst'

/**
 * Funksjonene sier avslagene sine på norsk, også regelen om minst én
 * ansvarlig, og de vises som de er; resten som ellers (`lesbarFeil`).
 */
function tilFeil(feil: Databasefeil): Error {
  return feil.code === '23514' && /^\p{Lu}/u.test(feil.message ?? '') ? new Error(feil.message) : lesbarFeil(feil)
}

async function kall(navn: string, argumenter: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await klient().rpc(navn, argumenter)
  if (error) throw tilFeil(error)
  return data
}

export async function hentMineGrupper(): Promise<MineGrupper> {
  return lesMineGrupper(await kall('mine_grupper'))
}

export async function hentGruppeoversikt(gruppe: string): Promise<Gruppeoversikt> {
  const oversikt = lesGruppeoversikt(await kall('gruppeoversikt', { gruppe }))
  if (!oversikt) throw new Error(UVENTET_FEIL)
  return oversikt
}

/** Oppretter gruppen i fagmiljøet, eller på tvers av fagmiljøene uten. Gir ID-en. */
export async function opprettGruppe(navn: string, beskrivelse: string, fagmiljo: string | null): Promise<string> {
  const id = await kall('opprett_gruppe', { navn, beskrivelse, fagmiljo })
  if (typeof id !== 'string') throw new Error(UVENTET_FEIL)
  return id
}

export async function endreGruppe(gruppe: string, navn: string, beskrivelse: string): Promise<void> {
  await kall('endre_gruppe', { gruppe, navn, beskrivelse })
}

export async function arkiverGruppe(gruppe: string, arkivert: boolean): Promise<void> {
  await kall('arkiver_gruppe', { gruppe, arkivert })
}

export async function inviterTilGruppe(gruppe: string, brukernavn: string): Promise<Gruppesvar> {
  return lesGruppesvar(await kall('inviter_til_gruppe', { gruppe, brukernavn }))
}

export async function svarPaaInvitasjon(gruppe: string, godta: boolean): Promise<Gruppesvar> {
  return lesGruppesvar(await kall('svar_paa_gruppeinvitasjon', { gruppe, godta }))
}

export async function settGrupperolle(gruppe: string, bruker: string, rolle: Grupperolle): Promise<Gruppesvar> {
  return lesGruppesvar(await kall('sett_grupperolle', { gruppe, bruker, rolle }))
}

/** Avslutter medlemskapet eller invitasjonen; for den innloggede selv er det å forlate gruppen. */
export async function avsluttGruppemedlemskap(gruppe: string, bruker: string): Promise<Gruppesvar> {
  return lesGruppesvar(await kall('avslutt_gruppemedlemskap', { gruppe, bruker }))
}

/* --- Oppgavene i gruppen -------------------------------------------------------- */

export async function hentGruppeoppgaver(gruppe: string): Promise<Gruppeoppgaveliste> {
  return lesGruppeoppgaveliste(await kall('gruppeoppgaveoversikt', { gruppe }))
}

/** Oppgaven, eller `null` når den ikke finnes eller ikke kan leses. */
export async function hentGruppeoppgave(oppgave: string): Promise<Gruppeoppgave | null> {
  return lesGruppeoppgave(await kall('gruppeoppgave', { oppgave }))
}

export interface Gruppeoppgaveinnhold {
  tittel: string
  beskrivelse: Riktekstdokument | null
  prioritet: Prioritet
}

/** Oppretter en oppgave uten idé bak, med eller uten noen som har den. Gir ID-en. */
export async function opprettGruppeoppgave(gruppe: string, innhold: Gruppeoppgaveinnhold, ansvarlig: string | null): Promise<string> {
  return id(await kall('opprett_gruppeoppgave', { gruppe, ...innhold, ansvarlig }))
}

/** Gjør idéen om til en oppgave i gruppen, eller gir oppgaven den alt er gjort om til. */
export async function gjorOmTilGruppeoppgave(ide: string): Promise<string> {
  return id(await kall('gjor_om_til_gruppeoppgave', { ide }))
}

export async function endreGruppeoppgave(oppgave: string, innhold: Gruppeoppgaveinnhold): Promise<void> {
  await kall('endre_gruppeoppgave', { oppgave, ...innhold })
}

/** Gir oppgaven til et aktivt medlem, eller tar den fra den som har den (`null`). */
export async function tildelGruppeoppgave(oppgave: string, ansvarlig: string | null): Promise<void> {
  await kall('tildel_gruppeoppgave', { oppgave, ansvarlig })
}

export async function settGruppeoppgavestatus(oppgave: string, status: Gruppeoppgavestatus): Promise<void> {
  await kall('sett_gruppeoppgavestatus', { oppgave, status })
}

/** Fjerner oppgaven. Kom den fra en idé, står idéen åpen igjen, med kommentarene. */
export async function fjernGruppeoppgave(oppgave: string): Promise<void> {
  await kall('fjern_gruppeoppgave', { oppgave })
}

/** Varslene om oppgaven er lest når den åpnes: de som var der da den ble lest (`lest_kl`). */
export async function merkGruppeoppgaveSett(oppgave: string, til: string): Promise<void> {
  await kall('merk_gruppeoppgave_sett', { oppgave, til })
}

function id(verdi: unknown): string {
  if (typeof verdi !== 'string') throw new Error(UVENTET_FEIL)
  return verdi
}
