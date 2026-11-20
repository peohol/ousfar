/**
 * Formen på opplysningene om et bygg, delt mellom byggingen (`vite.config.ts`)
 * og appen (`versjon.ts`). Står for seg fordi byggingen ikke kan laste
 * modulen appen leser bygget fra.
 */
import type { Endringsomrade } from './sider'

/** Det `versjon.json` inneholder. */
export interface Byggopplysninger {
  bygg: string
  /** Versjonsnummeret til bygget, den øverste føringen i endringsloggen. */
  versjon: string
  /**
   * Versjonen brukerne bes om å oppdatere til, den nyeste føringen som varsles
   * (`oppdateringsversjon`). Mangler i bygg fra før feltet fantes.
   */
  oppdatering?: string
  /**
   * De nyeste føringene som varsles, nyest først, med sidene de gjelder
   * (`endringsomrader`). Bare i `versjon.json`; mangler i bygg fra før feltet
   * fantes, og da kan en ny versjon berøre alle sider.
   */
  endringer?: Endringsomrade[]
  /**
   * Stien til den kliniske delen av bygget, ved siden av `index.html`. Bare i
   * `versjon.json`: før siden lastes på nytt med en ny versjon, sjekker appen
   * at den faktisk kan hentes (`forberedelse.ts`). Mangler i bygg fra før
   * feltet fantes.
   */
  klinisk?: string
}

/** Fila bygget legger ut, ved siden av `index.html`. */
export const VERSJONSFIL = 'versjon.json'
