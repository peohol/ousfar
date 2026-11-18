/**
 * Åpner varselvinduet fra andre steder i appen, som «Alle varsler» på
 * forsiden; bjella (`Varselknapp`) hører etter. Et eget signal uten kall mot
 * databasen, så det kan brukes og prøves uten resten av `api.ts`.
 */
import { lagSignal } from '../domain/signal'

const apne = lagSignal()

export const apneVarsler = () => apne.send()
export const lyttEtterApning = apne.lytt
