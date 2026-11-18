/**
 * Signaler til bjella (`Varselknapp`, `useVarsler`) fra andre steder i appen,
 * som forsiden. Bjella eier varselvinduet og hvor langt brukeren er kommet i
 * endringsloggen; resten ber bare om det. Uten kall mot databasen, så de kan
 * brukes og prøves uten resten av `api.ts`.
 */
import { lagSignal } from '../domain/signal'

const apne = lagSignal()

/** Åpner varselvinduet, som «Alle varsler» på forsiden. */
export const apneVarsler = () => apne.send()
export const lyttEtterApning = apne.lytt

const lesteEndringer = lagSignal<readonly string[]>()

/**
 * Merker føringer i endringsloggen (versjonene) lest, som når de åpnes fra
 * varselvinduet: bjella oppdaterer tallet og lagrer det.
 */
export const merkEndringerLestIBjella = (versjoner: readonly string[]) => lesteEndringer.send(versjoner)
export const lyttEtterLesteEndringer = lesteEndringer.lytt
