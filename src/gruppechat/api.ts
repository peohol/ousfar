/**
 * Kallene gruppechatten gjør mot Supabase (docs/gruppechat.md, «Funksjonene»).
 * Alt går gjennom funksjonene i databasen, som kontrollerer tilgangen selv;
 * tabellene med meldingene nås ikke fra nettleseren. Svarer en funksjon
 * `42501`, har den innloggede ikke (lenger) tilgang til gruppen, eller chatten
 * er ikke slått på: `Ingen tilgang`.
 */
import { lesbarFeil, UVENTET_FEIL, type Databasefeil } from '../auth/databasefeil'
import { klient } from '../auth/klient'
import { lesChatendringer, lesChatside, lesGruppemelding, type Chatendringer, type Chatside, type Gruppemelding } from './modell'

/** Kastes når databasen svarer at den innloggede ikke har tilgang (`42501`). */
export class IngenTilgang extends Error {
  constructor(melding: string) {
    super(melding)
    this.name = 'IngenTilgang'
  }
}

/**
 * Funksjonene sier avslagene sine på norsk (tom tekst, for lang, for fort,
 * fødselsnummer), og de vises som de er; resten som ellers (`lesbarFeil`).
 */
function tilFeil(feil: Databasefeil): Error {
  const melding = feil.message ?? ''
  if (feil.code === '42501') return new IngenTilgang(/^\p{Lu}/u.test(melding) ? melding : 'Du har ikke tilgang til denne gruppen.')
  if ((feil.code === '22023' || feil.code === '54000') && /^\p{Lu}/u.test(melding)) return new Error(melding)
  return lesbarFeil(feil)
}

async function kall(navn: string, argumenter: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await klient().rpc(navn, argumenter)
  if (error) throw tilFeil(error)
  return data
}

function svar<T>(verdi: T | null): T {
  if (verdi === null) throw new Error(UVENTET_FEIL)
  return verdi
}

/** De siste meldingene før `forNr` (uten: de nyeste), med det visningen trenger. */
export async function lesGruppechat(gruppe: string, forNr: number | null = null, antall = 50): Promise<Chatside> {
  return svar(lesChatside(await kall('les_gruppechat', { gruppe, for_nr: forNr, antall })))
}

/** Alt som er skrevet, endret eller slettet etter endringstelleren `etter`. */
export async function hentChatendringer(gruppe: string, etter: number, antall = 200): Promise<Chatendringer> {
  return svar(lesChatendringer(await kall('gruppechat_endringer', { gruppe, etter, antall })))
}

/** Sender meldingen. Samme `klientId` på nytt gir den samme meldingen, ikke en ny. */
export async function sendGruppemelding(gruppe: string, klientId: string, tekst: string): Promise<Gruppemelding> {
  return svar(lesGruppemelding(await kall('send_gruppemelding', { gruppe, klient_id: klientId, tekst })))
}

export async function endreGruppemelding(melding: string, tekst: string): Promise<Gruppemelding> {
  return svar(lesGruppemelding(await kall('endre_gruppemelding', { melding, tekst })))
}

export async function slettGruppemelding(melding: string): Promise<Gruppemelding> {
  return svar(lesGruppemelding(await kall('slett_gruppemelding', { melding })))
}

/** Merker meldingene til og med `tilNr` lest, og varslene om dem. */
export async function merkGruppechatLest(gruppe: string, tilNr: number): Promise<void> {
  await kall('merk_gruppechat_lest', { gruppe, til_nr: tilNr })
}
