/**
 * Kallene gruppechatten gjør mot funksjonene i databasen
 * (docs/gruppechat.md, «Funksjonene»), gjennom en gitt klient. Alt går gjennom
 * funksjonene, som kontrollerer tilgangen selv; tabellene med meldingene nås
 * ikke fra nettleseren. Svarer en funksjon `42501`, har den innloggede ikke
 * (lenger) tilgang til gruppen, eller chatten er ikke slått på: `IngenTilgang`.
 *
 * Fila bruker ikke appens klient, så kontrollene i det lokale testmiljøet kan
 * bruke de samme kallene med sine egne innlogginger; appen bruker `api.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { lesbarFeil, UVENTET_FEIL, type Databasefeil } from '../auth/databasefeil'
import { lesChatendringer, lesChatside, lesGruppemelding, type Chatendringer, type Chatside, type Gruppemelding } from './modell'

/** Kastes når databasen svarer at den innloggede ikke har tilgang (`42501`). */
export class IngenTilgang extends Error {
  constructor(melding: string) {
    super(melding)
    this.name = 'IngenTilgang'
  }
}

/**
 * Kastes når samtalen finnes, men det ikke kan skrives i den nå (`55000`):
 * gruppen er arkivert, eller den andre i en direktesamtale kan ikke motta.
 * Chatten henter da rettighetene på nytt.
 */
export class Sperret extends Error {
  constructor(melding: string) {
    super(melding)
    this.name = 'Sperret'
  }
}

/**
 * Funksjonene sier avslagene sine på norsk (tom tekst, for lang, for fort,
 * fødselsnummer, arkivert gruppe), og de vises som de er (`lesbarFeil`);
 * `42501` blir `IngenTilgang` og `55000` `Sperret`.
 */
export function tilChatfeil(feil: Databasefeil, utenTilgang = 'Du har ikke tilgang til denne gruppen.'): Error {
  const melding = feil.message ?? ''
  if (feil.code === '42501') return new IngenTilgang(/^\p{Lu}/u.test(melding) ? melding : utenTilgang)
  if (feil.code === '55000' && /^\p{Lu}/u.test(melding)) return new Sperret(melding)
  return lesbarFeil(feil)
}

export function svar<T>(verdi: T | null): T {
  if (verdi === null) throw new Error(UVENTET_FEIL)
  return verdi
}

/**
 * Kallene gjennom klienten. Appen bruker sin egen (`api.ts`); kontrollene i
 * det lokale testmiljøet sin, for hver syntetiske bruker.
 */
export function lagChatapi(supabase: () => Pick<SupabaseClient, 'rpc'>) {
  async function kall(navn: string, argumenter: Record<string, unknown>): Promise<unknown> {
    const { data, error } = await supabase().rpc(navn, argumenter)
    if (error) throw tilChatfeil(error)
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
