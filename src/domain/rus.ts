import type { Kommentaroppslag } from './kommentarobjekt'
import type { Scenarioinndata, Scenarioregelsett, Scenarioresultat } from './scenario'
import type { Analyte } from '../types'

/**
 * Stoffene med ruspotensial i serum: modulene fortolkningen har for dem, og
 * søkeoppføringene de gir.
 *
 * Denne kategorien skiller seg fra psykofarmaka på tre måter:
 *
 * - Kommentaren varierer ikke med konsentrasjonen. Det finnes én kommentar per
 *   analytt, uansett hvor svaret ligger, så det er ingen konsentrasjonsbånd å
 *   velge mellom.
 * - Noen stoffer fortolkes samlet. Da legges hele kommentaren på én analytt,
 *   og de andre får en tilleggskommentar som henviser dit. Hvilken analytt som
 *   bærer hovedkommentaren avhenger av hva som faktisk er påvist.
 * - Stoffer som tolkes sammen deler én modul, slik at hvilket som helst av
 *   navnene i søket fører til den samme fortolkningen.
 *
 * Hvilke moduler som finnes, hva de heter og hvilke analytter de dekker, står
 * i fagmiljøets analyttkatalog. Reglene og kommentartekstene er faginnhold i Supabase: ett
 * scenarioregelsett per modul, med samme nøkkel som modulen, og
 * kommentarobjektene scenariene peker på (`docs/scenarioregler.md`). Appen
 * henter de publiserte og sender dem inn til fortolkningen som {@link Rusregler}.
 */

/* --- Fortolkningen ------------------------------------------------------ */

export type RusResultat = Scenarioresultat
export type RusPlassering = Extract<RusResultat, { type: 'kommentarer' }>['plasseringer'][number]

/** Det brukeren har svart i modulen. */
export type RusInndata = Scenarioinndata

export const TOM_RUS_INNDATA: RusInndata = { pavist: [], verdier: {} }

/**
 * Reglene fortolkningen av en modul bruker, slik appen har dem: på vei, ikke
 * mulige å hente, eller klare — regelsettet for modulen og kommentarene det
 * peker på.
 */
export type Rusregler =
  | { status: 'laster' }
  | { status: 'feil'; melding: string; provIgjen: () => void }
  | { status: 'klar'; regelsett: Scenarioregelsett; kommentarer: Kommentaroppslag }

/* --- Modulene ------------------------------------------------------------ */

/** En analytt modulen dekker. */
export interface RusAnalytt {
  kode: string
  navn: string
}

/** Et konsentrasjonsfelt modulen ber om for å avgjøre hvilken regel som gjelder. */
export type RusVerdifelt = RusAnalytt

export interface RusModul {
  /** Nøkkelen, den samme som regelsettets `modul`. */
  id: string
  gruppe: string
  /** Kategorien i datasettet, som metalinjen på siden viser. */
  kategori: string
  /** Navnet modulen vises og søkes opp med. */
  navn: string
  analytter: RusAnalytt[]
  /** Ekstra søkeord — koder og navnevarianter. */
  aliaser: string[]
}

/** Alle kodene modulen kan legge en kommentar på. */
export function moduleKoder(modul: RusModul): string[] {
  return modul.analytter.map((a) => a.kode)
}

/**
 * Sant når brukeren skal se hovedkommentaren før den kopieres.
 *
 * Har modulen noe å velge mellom, kan valget bli feil, og da må teksten som
 * faktisk havner på utklippstavlen kunne leses av. Er det bare én kommentar
 * uansett, holder det at den henger på kopiknappen som et tips.
 */
export function viserKommentartekst(modul: RusModul): boolean {
  return modul.analytter.length > 1
}

/** Konsentrasjonsfeltene regelsettet ber om, med analyttnavnene fra modulen. */
export function rusVerdifelter(modul: RusModul, koder: readonly string[]): RusVerdifelt[] {
  return koder.map((kode) => modul.analytter.find((a) => a.kode === kode) ?? { kode, navn: kode })
}

/* --- Oppføringene i søket ------------------------------------------------ */

const moduler = new WeakMap<Analyte, RusModul>()

/**
 * Scenariomodulen en søkeoppføring åpner, slik fortolkningen bruker den.
 * Modulene står i fagmiljøets analyttkatalog (`src/domain/analyttkatalog.ts`);
 * samme oppføring gir alltid det samme objektet.
 */
export function rusModulFor(analyte: Analyte): RusModul | undefined {
  const modul = analyte.modul
  if (modul?.type !== 'scenario') return undefined
  let rus = moduler.get(analyte)
  if (!rus) {
    rus = {
      id: modul.id,
      gruppe: analyte.gruppe,
      kategori: analyte.kategori,
      navn: analyte.navn,
      analytter: modul.analytter.map((a) => ({ ...a })),
      aliaser: [...analyte.aliaser],
    }
    moduler.set(analyte, rus)
  }
  return rus
}

/** Scenariomodulene analyttene fortolkes i, hver én gang. */
export function scenariomoduler(analytter: readonly Analyte[]): RusModul[] {
  const funnet = new Map<string, RusModul>()
  for (const analytt of analytter) {
    const modul = rusModulFor(analytt)
    if (modul) funnet.set(modul.id, modul)
  }
  return [...funnet.values()]
}

export function erRusAnalytt(analyte: Analyte): boolean {
  return analyte.modul?.type === 'scenario'
}
