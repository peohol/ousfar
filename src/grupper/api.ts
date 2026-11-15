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
