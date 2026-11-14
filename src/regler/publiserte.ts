import type { Referanseomrade } from '../domain/piller'
import type { Intervallregelsett } from './modell'

/**
 * Det fortolkningen henter fra databasen når appen åpnes: de publiserte
 * regelsettene, og referanseområdet stoffsiden har for hver kode.
 */
export interface Publisertgrunnlag {
  regelsett: Intervallregelsett[]
  referanseomrader: ReadonlyMap<string, Referanseomrade>
}

/**
 * Regelsettene og referanseområdene fortolkningen bruker: de publiserte,
 * hentet fra databasen når appen åpnes (se `usePubliserteRegler`). Steg 2 får
 * det som gjelder koden, som et {@link Regeloppslag} og henter ingenting selv.
 */
export type Regeltilstand =
  | { status: 'laster' }
  | { status: 'feil'; melding: string }
  | {
      status: 'klar'
      etterKode: ReadonlyMap<string, Intervallregelsett>
      referanseomrader: ReadonlyMap<string, Referanseomrade>
    }

/** Det steg 2 har å vise for én analyttkode. */
export type Regeloppslag =
  | { status: 'laster' }
  | { status: 'feil'; melding: string }
  | { status: 'mangler'; referanseomrade: Referanseomrade | null }
  | { status: 'klar'; regelsett: Intervallregelsett; referanseomrade: Referanseomrade | null }

/**
 * « i <fagmiljø>», til meldingen om at reglene mangler: databasen gir bare
 * reglene til fagmiljøet fortolkningen gjelder (arbeidskonteksten), så et
 * fagmiljø uten egne regler får en tydelig stopp, aldri et annets regler.
 * Tom når fagmiljøet ikke er kjent ennå.
 */
export function iFagmiljoet(fagmiljo: string | null | undefined): string {
  return fagmiljo ? ` i ${fagmiljo}` : ''
}

/** Regelsettene ordnet etter analyttkoden de gjelder. */
export function etterKode(regelsett: Intervallregelsett[]): ReadonlyMap<string, Intervallregelsett> {
  return new Map(regelsett.map((r) => [r.analyttkode, r]))
}

/** Tilstanden når grunnlaget er hentet. */
export function klar({ regelsett, referanseomrader }: Publisertgrunnlag): Regeltilstand {
  return { status: 'klar', etterKode: etterKode(regelsett), referanseomrader }
}

/** Regelsettet og referanseområdet for koden, eller hvorfor de ikke finnes ennå. */
export function slaOpp(tilstand: Regeltilstand, kode: string): Regeloppslag {
  if (tilstand.status !== 'klar') return tilstand
  const regelsett = tilstand.etterKode.get(kode)
  const referanseomrade = tilstand.referanseomrader.get(kode) ?? null
  return regelsett ? { status: 'klar', regelsett, referanseomrade } : { status: 'mangler', referanseomrade }
}

/** Referanseområdet steg 2 viser for koden: `null` til det er hentet, og når koden ikke har noe. */
export function referanseomradet(oppslag: Regeloppslag): Referanseomrade | null {
  return 'referanseomrade' in oppslag ? oppslag.referanseomrade : null
}
