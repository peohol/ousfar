import { kodeneI, type Analysemetode } from './analyttkatalog'
import { optionColourVars } from './optionColours'
import type { Analyte } from '../types'

export type { Analysemetode } from './analyttkatalog'

/**
 * Analysemetodene i fagmiljøets analyttkatalog, og filteret søket i
 * fortolkningen kan begrenses med.
 *
 * Hvilke metoder som finnes, og i hvilken rekkefølge filterraden viser dem,
 * står i katalogen i databasen (`src/domain/analyttkatalog.ts`). Ingenting her
 * lister opp metoder eller analytter.
 */

/**
 * Fargen metoden bærer overalt i appen: pillen i analyttkortet, pillen i
 * søket og filteret. Én farge per metode, ett sted, så SPFA er den samme
 * fargen uansett hvor den dukker opp.
 *
 * Fargene kommer fra det samme settet som søkealternativene bruker, spredt
 * jevnt rundt fargesirkelen etter metodens plass i katalogen. En kode som
 * ikke står der, får den første fargen.
 */
export function metodefarger(kode: string, metoder: readonly Analysemetode[]): Record<string, string> {
  const plass = metoder.findIndex((m) => m.kode === kode)
  return optionColourVars(Math.max(plass, 0), Math.max(metoder.length, 1))
}

/**
 * Hurtigtasten som setter filteret på metoden: Alt + plassen i lista, fra 1.
 * `null` for en metode som ligger utenfor talltastene, og for ukjente koder.
 *
 * Tasten leses av den samme lista som fargen og rekkefølgen, så merket i
 * filterraden og tasten som faktisk virker ikke kan komme i utakt.
 */
export function metodesnarvei(kode: string, metoder: readonly Analysemetode[]): string | null {
  const plass = metoder.findIndex((m) => m.kode === kode)
  return plass >= 0 && plass < 9 ? `Alt + ${plass + 1}` : null
}

/**
 * Hurtigtasten som slår filteret av. Null hører ikke til noen metode, og står
 * derfor for «ingen av dem».
 */
export const AV_SNARVEI = 'Alt + 0'

/* --- Kodene i en oppføring --------------------------------------------- */

/** Ett virkestoff med sin analyttkode, og analytten det fører til. */
export interface Menyanalytt {
  /** Analyttkoden virkestoffet svares ut med. */
  kode: string
  /** Virkestoffnavnet, slik det står i lista. */
  navn: string
  /** Søkeoppføringen et trykk velger — den samme som søket ville gitt. */
  analyte: Analyte
}

/**
 * Virkestoffene én søkeoppføring dekker: ett per analyttkode.
 *
 * De fleste oppføringene er én analytt med én kode, og blir én linje.
 * Fortolkningsmodulene kan dekke flere koder hver, og deles opp — det er
 * virkestoffene brukeren leter etter, ikke modulen de deler.
 *
 * Sumanalyser som «Amitriptylin + nortriptylin» deles ikke: de har én kode og
 * kommenteres under ett.
 */
export function menyanalytter(analyte: Analyte): Menyanalytt[] {
  return kodeneI(analyte).map(({ kode, navn }) => ({ kode, navn, analyte }))
}

/* --- Filteret ------------------------------------------------------------ */

/**
 * Analyttene søket skal lete i. `null` betyr alle metodene — det er filteret
 * slått av.
 */
export function filtrertPool(pool: readonly Analyte[], metode: string | null): readonly Analyte[] {
  if (metode === null) return pool
  return pool.filter((a) => a.analysemetode === metode)
}
