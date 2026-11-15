import type { Kommentarplassering } from './kommentar'
import type { Rusregler } from './rus'
import { fortolkScenarier } from './scenario'
import type { Analyte } from '../types'

/**
 * Fortolkning av etanolmarkørene i urin: etylglukuronid (EtG) og etylsulfat
 * (EtS).
 *
 * Begge er omdannelsesprodukter av etanol, og de fortolkes under ett. Det som
 * må avgjøres er hva som er påvist av de to, for det bestemmer både hvilken
 * kommentar som gjelder og hvilken analyttkode den skal ligge på. Derfor er
 * modulen ett valg: én knapp per tilfelle.
 *
 * Kodene, navnene og analysemetoden står i fagmiljøets analyttkatalog
 * (`src/domain/analyttkatalog.ts`), og tilfellene med kommentartekstene er
 * modulens publiserte scenarioregelsett, med kommentarene som egne objekter
 * (`docs/scenarioregler.md`). Hvert scenario er ett tilfelle, i regelsettets
 * rekkefølge. Ingenting av det står i klientpakken.
 */

/** Tilfellet som er valgt: nøkkelen til scenariet. */
export type EtgValg = string

/** Ett av tilfellene modulen fortolker. */
export interface EtgAlternativ {
  id: EtgValg
  /** Teksten på knappen. */
  merke: string
  /** Analyttkodene alternativet sier er påvist. */
  pavist: string[]
  /** Kommentarene tilfellet gir, i den rekkefølgen de skal limes inn. */
  plasseringer: Kommentarplassering[]
}

export function erEtgAnalytt(analyte: Analyte): boolean {
  return analyte.modul?.type === 'etg'
}

/**
 * Teksten på knappen for tilfellet: «Begge påvist» når de to er påvist, ellers
 * navnet på det som er påvist («EtG påvist»).
 */
export function merkeFor(pavist: readonly string[], analytter: readonly { kode: string; navn: string }[]): string {
  if (analytter.length > 1 && pavist.length === analytter.length) {
    return analytter.length === 2 ? 'Begge påvist' : 'Alle påvist'
  }
  const navn = analytter.filter((a) => pavist.includes(a.kode)).map((a) => a.navn)
  return `${navn.join(' og ')} påvist`
}

/** Tilfellene modulen kan fortolke, eller hvorfor de ikke kan brukes. */
export type Etgtilfeller =
  | { status: 'laster' }
  | { status: 'feil'; melding: string; provIgjen: () => void }
  | { status: 'klar'; alternativer: EtgAlternativ[] }

/**
 * Tilfellene, ett per scenario i regelsettet, i regelsettets rekkefølge.
 *
 * Modulen er bare et valg mellom tilfellene, uten konsentrasjoner å taste
 * inn. Et regelsett med forholdstall eller med en manuell vurdering kan den
 * ikke vise; det brukes ikke, og modulen sier fra i stedet.
 */
export function etgTilfeller(analyte: Analyte, regler: Rusregler): Etgtilfeller {
  if (regler.status !== 'klar') return regler
  const analytter = analyte.modul?.analytter ?? []
  const { regelsett, kommentarer } = regler
  const kanVises = regelsett.forhold.length === 0 && regelsett.scenarier.every((s) => s.vilkar.length === 0 && s.utfall.type === 'kommentarer')
  const ukjent = () => ({ status: 'feil' as const, melding: `Reglene for ${analyte.navn} kan ikke vises som et valg. Si fra til den som redigerer fortolkningsreglene.`, provIgjen: () => {} })
  if (!kanVises) return ukjent()
  const alternativer: EtgAlternativ[] = []
  for (const s of regelsett.scenarier) {
    const resultat = fortolkScenarier(regelsett, kommentarer, { pavist: s.pavist, verdier: {} })
    if (resultat.type !== 'kommentarer' || resultat.notiser.length > 0) return ukjent()
    alternativer.push({ id: s.nokkel, merke: merkeFor(s.pavist, analytter), pavist: [...s.pavist], plasseringer: resultat.plasseringer })
  }
  return { status: 'klar', alternativer }
}
