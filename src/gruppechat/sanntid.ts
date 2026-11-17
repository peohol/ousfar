/**
 * Dørklokken: abonnementet på gruppens rad i `public.gruppechatter`
 * (docs/gruppechat.md, «Sanntiden»). Supabase sjekker radsikkerheten for hver
 * hendelse og hver abonnent, så den som har mistet tilgangen, får ingenting.
 * Hendelsen sier bare at noe er endret, og hvor langt endringstelleren har
 * kommet; klienten henter selv det som er nytt. Ingen meldingstekst går
 * gjennom sanntidstjenesten, og innholdet i hendelsene logges ikke.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { klient } from '../auth/klient'
import { erObjekt, tall } from '../ideer/lesing'

export type Kanalstatus = 'tilkoblet' | 'frakoblet'

export interface Dorklokkevalg {
  /** Noe er endret i gruppens chat; `sisteEndring` når hendelsen har den. */
  vedRinging: (sisteEndring: number | null) => void
  vedStatus: (status: Kanalstatus) => void
}

/** Starter abonnementet og gir tilbake funksjonen som stopper det. */
export type Abonner = (gruppe: string, valg: Dorklokkevalg) => () => void

/** Ventetiden før en kanal som er lukket av tjenesten, åpnes på nytt: 1, 2, 4 … høyst 30 sekunder. */
export function ventetid(forsok: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, forsok))
}

let lopenr = 0

/**
 * Abonnerer på dørklokken for gruppen. Supabase kobler selv til igjen etter
 * nettbrudd og feil på kanalen; lukker tjenesten kanalen, åpnes en ny med
 * økende ventetid til abonnementet stoppes.
 */
export const abonnerPaGruppechat: Abonner = (gruppe, { vedRinging, vedStatus }) => {
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
      .channel(`gruppechat:${gruppe}:${lopenr}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'gruppechatter', filter: `gruppe_id=eq.${gruppe}` }, (hendelse) => {
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
