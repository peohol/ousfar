/**
 * Signaler til bjella (`Varselknapp`, `useVarsler`) fra andre steder i appen,
 * som forsiden. Bjella eier varselvinduet og hvor langt brukeren er kommet i
 * endringsloggen; resten ber bare om det. Uten kall mot databasen, så de kan
 * brukes og prøves uten resten av `api.ts`.
 */
import { lagSignal } from '../domain/signal'

/** Siden varselvinduet åpnes på; som `Varselside` i `Varsler.tsx`. */
export type Varselstart = 'liste' | 'innstillinger'

const apne = lagSignal<Varselstart>()

/**
 * Åpner varselvinduet, som «Alle varsler» på forsiden, eller rett på
 * innstillingene, som fra chatinnstillingene.
 */
export const apneVarsler = (side: Varselstart = 'liste') => apne.send(side === 'innstillinger' ? side : 'liste')
export const lyttEtterApning = apne.lytt

const lesteEndringer = lagSignal<readonly string[]>()

/**
 * Merker føringer i endringsloggen (versjonene) lest, som når de åpnes fra
 * varselvinduet: bjella oppdaterer tallet og lagrer det.
 */
export const merkEndringerLestIBjella = (versjoner: readonly string[]) => lesteEndringer.send(versjoner)
export const lyttEtterLesteEndringer = lesteEndringer.lytt
