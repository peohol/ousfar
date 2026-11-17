/**
 * Kallene gruppechatten gjør mot Supabase (docs/gruppechat.md, «Funksjonene»).
 * Alt går gjennom funksjonene i databasen, som kontrollerer tilgangen selv;
 * tabellene med meldingene nås ikke fra nettleseren. Svarer en funksjon
 * `42501`, har den innloggede ikke (lenger) tilgang til gruppen, eller chatten
 * er ikke slått på: `Ingen tilgang`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
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
 * fødselsnummer, arkivert gruppe), og de vises som de er (`lesbarFeil`);
 * `42501` blir `IngenTilgang`.
 */
function tilFeil(feil: Databasefeil): Error {
  const melding = feil.message ?? ''
  if (feil.code === '42501') return new IngenTilgang(/^\p{Lu}/u.test(melding) ? melding : 'Du har ikke tilgang til denne gruppen.')
  return lesbarFeil(feil)
}

function svar<T>(verdi: T | null): T {
  if (verdi === null) throw new Error(UVENTET_FEIL)
  return verdi
}

/**
 * Kallene gjennom en klient. Appen bruker sin egen (under); kontrollene i det
 * lokale testmiljøet sin, for hver syntetiske bruker.
 */
export function lagChatapi(supabase: () => Pick<SupabaseClient, 'rpc'>) {
  async function kall(navn: string, argumenter: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await supabase().rpc(navn, argumenter)
    if (error) throw tilFeil(error)
    return data
  }

  return {
    /** De siste meldingene før `forNr` (uten: de nyeste), med det visningen trenger. */
    lesGruppechat: async (gruppe: string, forNr: number | null = null, antall = 50): Promise<Chatside> =>
      svar(lesChatside(await kall('les_gruppechat', { gruppe, for_nr: forNr, antall }))),

    /** Alt som er skrevet, endret eller slettet etter endringstelleren `etter`. */
    hentChatendringer: async (gruppe: string, etter: number, antall = 200): Promise<Chatendringer> =>
      svar(lesChatendringer(await kall('gruppechat_endringer', { gruppe, etter, antall }))),

    /** Sender meldingen. Samme `klientId` på nytt gir den samme meldingen, ikke en ny. */
    sendGruppemelding: async (gruppe: string, klientId: string, tekst: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('send_gruppemelding', { gruppe, klient_id: klientId, tekst }))),

    endreGruppemelding: async (melding: string, tekst: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('endre_gruppemelding', { melding, tekst }))),

    slettGruppemelding: async (melding: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('slett_gruppemelding', { melding }))),

    /** Merker meldingene til og med `tilNr` lest, og varslene om dem. */
    merkGruppechatLest: async (gruppe: string, tilNr: number): Promise<void> => {
      await kall('merk_gruppechat_lest', { gruppe, til_nr: tilNr })
    },
  }
}

export type Chatapi = ReturnType<typeof lagChatapi>

export const {
  lesGruppechat,
  hentChatendringer,
  sendGruppemelding,
  endreGruppemelding,
  slettGruppemelding,
  merkGruppechatLest,
} = lagChatapi(klient)
