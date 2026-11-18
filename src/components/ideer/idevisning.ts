import { lagSignal } from '../../domain/signal'
import { lagDeltTilstand } from '../../hooks/deltTilstand'

/**
 * Veien inn til idéene og de planlagte oppgavene fra resten av appen:
 * hovedmenyen, et varsel om en ny kommentar eller en direktelenke.
 * `Idelag` eier vinduene og hører etter her.
 */
export interface Idevisning {
  id: string
  /** Kommentaren under idéen som skal vises, om noen. */
  kommentar?: string | null
}

const ide = lagSignal<Idevisning>()
/** Lagene som kan åpnes: Idéer for hele appen, og Planlagte oppgaver (bare systemarkitektene). */
export type Idelagnavn = 'ideer' | 'oppgaver'

const lag = lagSignal<Idelagnavn>()

/** Åpner Idéer eller Planlagte oppgaver på oversikten, som fra hovedmenyen. */
export const apneIdelag = lag.send

/** Hører etter `apneIdelag`. */
export const lyttEtterIdelag = lag.lytt

/**
 * Hvor mange idéer som har kommentarer brukeren ikke har sett. `Idelag`
 * henter tallet; hovedmenyen viser det.
 */
export const idestatus = lagDeltTilstand(0)

/** Vakten `Idelag` melder: lukker lagene og gjør så det som ble bedt om. */
let forlatLagene: ((deretter: () => void) => void) | null = null

/** Åpner Idéer på idéen, og eventuelt kommentaren, med denne ID-en. */
export const visIde = ide.send

/** Hører etter `visIde`. Gir tilbake funksjonen som slutter å høre etter. */
export const lyttEtterIde = ide.lytt

/**
 * Lukker Idéer og Planlagte oppgaver og gjør så `deretter`, som når en lenke
 * fører til en diskusjon bak dem. Har et skjema i dem endringer som ikke er
 * lagret, spør det først, og forkastes ikke endringene, skjer ingenting. Uten
 * lagene i appen gjøres det med en gang.
 */
export function forlatIdelagene(deretter: () => void): void {
  if (forlatLagene) forlatLagene(deretter)
  else deretter()
}

/** For `Idelag`, som eier lagene. Gir tilbake funksjonen som melder vakten av. */
export function meldIdelagene(forlat: (deretter: () => void) => void): () => void {
  forlatLagene = forlat
  return () => {
    if (forlatLagene === forlat) forlatLagene = null
  }
}
