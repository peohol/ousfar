/**
 * Hvem som ser OUSFAR Verktøy i appen: fanen i sidemenyen, treffene i søket
 * og verktøysidene (`#/verktoy`). Inntil verktøyene er klare til bruk, ser
 * bare administratorene dem; for alle andre finnes de ikke i appen, og
 * adressen fører til fortolkningen.
 *
 * Bryteren er {@link VERKTOYENE_VISES_FOR}. Settes den til `'alle'`, er
 * verktøyene tilbake for alle brukere, uten andre endringer.
 */
import { createContext, useContext } from 'react'

/** `'admin'`: bare administratorene. `'alle'`: alle innloggede brukere. */
export type Verktoypublikum = 'alle' | 'admin'

/** Hvem som ser verktøyene nå. */
export const VERKTOYENE_VISES_FOR: Verktoypublikum = 'admin'

/** Om en bruker med `rolle` skal se verktøyene. */
export function verktoyeneVisesFor(rolle: string | undefined, publikum: Verktoypublikum = VERKTOYENE_VISES_FOR): boolean {
  return publikum === 'alle' || rolle === 'admin'
}

/**
 * Svaret for den innloggede, satt av appen. Uten noen som setter det, er
 * verktøyene skjult, så de aldri vises ved en feil.
 */
const Verktoytilgang = createContext(false)

export const VerktoytilgangProvider = Verktoytilgang.Provider

/** Om den innloggede skal se verktøyene. */
export const useVerktoyeneVises = (): boolean => useContext(Verktoytilgang)
