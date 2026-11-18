/**
 * Dørklokken: abonnementet på gruppens rad i `public.gruppechatter`
 * (docs/gruppechat.md, «Sanntiden»). Supabase sjekker radsikkerheten for hver
 * hendelse og hver abonnent, så den som har mistet tilgangen, får ingenting.
 * Hendelsen sier bare at noe er endret, og hvor langt endringstelleren har
 * kommet; klienten henter selv det som er nytt. Ingen meldingstekst går
 * gjennom sanntidstjenesten, og innholdet i hendelsene logges ikke.
 *
 * Fila bruker ikke appens klient (den står i `sanntid.ts`), så kontrollene i
 * det lokale testmiljøet kan bruke den samme dørklokken.
 */
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'
import { erObjekt, tall } from '../ideer/lesing'

export type Kanalstatus = 'tilkoblet' | 'frakoblet'

export interface Dorklokkevalg {
  /** Noe er endret i gruppens chat; `sisteEndring` når hendelsen har den. */
  vedRinging: (sisteEndring: number | null) => void
  vedStatus: (status: Kanalstatus) => void
}

/**
 * Starter abonnementet og gir tilbake funksjonen som stopper det. Med
 * `gruppe` lik `null` ringer den for alle gruppene den innloggede leser
 * chatten i (samtalelista i chatmenyen); radsikkerheten avgjør hvilke.
 * For direktemeldingene er `gruppe` samtalens ID.
 */
export type Abonner = (gruppe: string | null, valg: Dorklokkevalg) => () => void

/** Tabellen dørklokken lytter på, og kolonnen med samtalens ID. */
export interface Dorklokkekilde {
  tabell: string
  nokkel: string
}

/** Gruppechattene: én rad per gruppe i `public.gruppechatter`. */
export const GRUPPECHATKILDE: Dorklokkekilde = { tabell: 'gruppechatter', nokkel: 'gruppe_id' }
/** Direktemeldingene: én rad per samtale i `public.direktesamtaler` (bare de to deltakerne får hendelsene). */
export const DIREKTEKILDE: Dorklokkekilde = { tabell: 'direktesamtaler', nokkel: 'id' }

/** Ventetiden før en kanal som er lukket av tjenesten, åpnes på nytt: 1, 2, 4 … høyst 30 sekunder. */
export function ventetid(forsok: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, forsok))
}

let lopenr = 0

/**
 * Abonnementet på dørklokken gjennom klienten. Supabase kobler selv til igjen
 * etter nettbrudd og feil på kanalen; lukker tjenesten kanalen, åpnes en ny
 * med økende ventetid til abonnementet stoppes.
 */
export const lagAbonner = (klient: () => SupabaseClient, kilde: Dorklokkekilde = GRUPPECHATKILDE): Abonner => (gruppe, { vedRinging, vedStatus }) => {
  let kanal: RealtimeChannel | null = null
  let stoppet = false
  let forsok = 0
  let tidtaker: ReturnType<typeof setTimeout> | null = null

  const lukk = () => {
    if (!kanal) return
    const gammel = kanal
    kanal = null
    void klient().removeChannel(gammel)
  }

  const apne = () => {
    if (stoppet) return
    lopenr += 1
    const denne: RealtimeChannel = klient()
      .channel(`${kilde.tabell}:${gruppe ?? 'alle'}:${lopenr}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: kilde.tabell, ...(gruppe ? { event: 'UPDATE', filter: `${kilde.nokkel}=eq.${gruppe}` } : {}) }, (hendelse) => {
        if (stoppet || kanal !== denne) return
        const ny = (hendelse as { new?: unknown }).new
        vedRinging(erObjekt(ny) && ny.siste_endring != null ? tall(ny.siste_endring) : null)
      })
    kanal = denne
    denne.subscribe((status) => {
      if (stoppet || kanal !== denne) return
      if (status === 'SUBSCRIBED') {
        forsok = 0
        vedStatus('tilkoblet')
        return
      }
      vedStatus('frakoblet')
      if (status === 'CLOSED') {
        lukk()
        tidtaker = setTimeout(apne, ventetid(forsok++))
      }
    })
  }

  apne()
  return () => {
    stoppet = true
    if (tidtaker) clearTimeout(tidtaker)
    lukk()
  }
}
