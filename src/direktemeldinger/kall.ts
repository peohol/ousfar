/**
 * Kallene direktemeldingene gjør mot funksjonene i databasen
 * (docs/direktemeldinger-personvern.md, «Funksjonene og svarene»), gjennom en
 * gitt klient, så kontrollene i det lokale testmiljøet kan bruke de samme
 * kallene med sine egne innlogginger; appen bruker `api.ts`.
 *
 * Feilene leses som i gruppechatten (`tilChatfeil`): `42501` er
 * `IngenTilgang` (bryteren av, ikke med i samtalen, eller ikke aktivt
 * medlemskap), `PT409` er `Sperret`.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profilkort } from '@delt/profil'
import { svar, tilChatfeil } from '../gruppechat/kall'
import { lesChatendringer, lesChatside, lesGruppemelding, type Chatendringer, type Chatside, type Gruppemelding } from '../gruppechat/modell'
import {
  lesChatvalg,
  lesDirektemottakere,
  lesDirektesamtaler,
  lesProfilkortene,
  type Chatvalg,
  type Direktemottaker,
  type Direktesamtale,
} from './modell'

const UTEN_TILGANG = 'Samtalen finnes ikke, eller du har ikke tilgang til den.'

export function lagDirekteapi(supabase: () => Pick<SupabaseClient, 'rpc'>) {
  async function kall(navn: string, argumenter: Record<string, unknown> = {}): Promise<unknown> {
    const { data, error } = await supabase().rpc(navn, argumenter)
    if (error) throw tilChatfeil(error, UTEN_TILGANG)
    return data
  }

  return {
    /* --- Samtalen (samme form som gruppechatten) ------------------------------ */

    lesDirektesamtale: async (samtale: string, forNr: number | null = null, antall = 50): Promise<Chatside> =>
      svar(lesChatside(await kall('les_direktesamtale', { samtale, for_nr: forNr, antall }))),

    hentDirekteendringer: async (samtale: string, etter: number, antall = 200): Promise<Chatendringer> =>
      svar(lesChatendringer(await kall('direktesamtale_endringer', { samtale, etter, antall }))),

    sendDirektemelding: async (samtale: string, klientId: string, tekst: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('send_direktemelding', { samtale, klient_id: klientId, tekst }))),

    endreDirektemelding: async (melding: string, tekst: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('endre_direktemelding', { melding, tekst }))),

    slettDirektemelding: async (melding: string): Promise<Gruppemelding> =>
      svar(lesGruppemelding(await kall('slett_direktemelding', { melding }))),

    merkDirektesamtaleLest: async (samtale: string, tilNr: number): Promise<void> => {
      await kall('merk_direktesamtale_lest', { samtale, til_nr: tilNr })
    },

    /* --- Lista, søket og samtalene --------------------------------------------- */

    mineDirektesamtaler: async (): Promise<Direktesamtale[]> => lesDirektesamtaler(await kall('mine_direktesamtaler')),

    sokDirektemottakere: async (sok: string): Promise<Direktemottaker[]> => lesDirektemottakere(await kall('sok_direktemottakere', { sok })),

    /** Samtalen med personen: den som finnes, eller en ny når det kan sendes. */
    aapneDirektesamtale: async (mottaker: string): Promise<string> => {
      const id = await kall('aapne_direktesamtale', { mottaker })
      if (typeof id !== 'string') throw new Error('Samtalen kunne ikke åpnes. Prøv igjen.')
      return id
    },

    dempDirektesamtale: async (samtale: string, dempet: boolean): Promise<void> => {
      await kall('demp_direktesamtale', { samtale, dempet })
    },

    skjulDirektesamtale: async (samtale: string): Promise<void> => {
      await kall('skjul_direktesamtale', { samtale })
    },

    /* --- Valgene og blokkeringene ----------------------------------------------- */

    mineChatvalg: async (): Promise<Chatvalg> => lesChatvalg(await kall('mine_chatvalg')),

    /** Endrer valgene; det som er utelatt, står. */
    settChatvalg: async (valg: Partial<Chatvalg>): Promise<Chatvalg> =>
      lesChatvalg(await kall('sett_chatvalg', { tillat: valg.tillat_direktemeldinger ?? null, vis_aktiv: valg.vis_aktiv ?? null })),

    blokkerBruker: async (bruker: string): Promise<void> => {
      await kall('blokker_bruker', { bruker })
    },

    opphevBlokkering: async (bruker: string): Promise<void> => {
      await kall('opphev_blokkering', { bruker })
    },

    mineBlokkeringer: async (): Promise<Profilkort[]> => lesProfilkortene(await kall('mine_blokkeringer')),

    /* --- Aktivitetsstatusen ----------------------------------------------------- */

    markerChataktivitet: async (): Promise<void> => {
      await kall('marker_chataktivitet')
    },

    aktiveMotparter: async (): Promise<string[]> => {
      const svar = await kall('aktive_motparter')
      return Array.isArray(svar) ? svar.filter((x): x is string => typeof x === 'string') : []
    },
  }
}

export type Direkteapi = ReturnType<typeof lagDirekteapi>
