/**
 * Slettingen i oppryddingene av grener, felles for dem: for hver gren reglene
 * vil slette, leses grenene åpne PR-er bruker, på nytt (en PR kan åpnes eller
 * gjenåpnes uten at grenen får en ny commit), og grenen slettes bare om den
 * står på commiten som ble vurdert (`./gitslett`).
 *
 * Feiler noe, stopper runden: ingen flere slettinger forsøkes, og feilen
 * gis tilbake så kjøringen kan feile synlig.
 */
import type { Slettutfall } from './gitslett'

export interface Slettrunde {
  slettet: Set<string>
  /** Grener reglene ville slettet, men som er beholdt, med hvorfor. */
  underveis: Map<string, string>
  /** Feilen som stoppet runden, eller `null`. */
  feil: string | null
}

const UTFALL: Readonly<Record<Exclude<Slettutfall, 'slettet'>, string>> = {
  endret: 'endret underveis',
  borte: 'slettet av noen andre underveis',
}

export async function slettRunde({
  grener,
  kunVis,
  iBruk,
  slett,
  logg,
}: {
  grener: readonly { gren: string; sha: string; grunn: string }[]
  kunVis: boolean
  /** Grenene åpne PR-er kommer fra eller skal inn i, nå. */
  iBruk: () => Promise<ReadonlySet<string>>
  slett: (gren: string, sha: string) => Promise<Slettutfall>
  logg: (linje: string) => void
}): Promise<Slettrunde> {
  const slettet = new Set<string>()
  const underveis = new Map<string, string>()
  let feil: string | null = null
  for (const { gren, sha, grunn } of grener) {
    if (kunVis) {
      logg(`VILLE SLETTET: ${gren} (${grunn})`)
      continue
    }
    if (feil) {
      underveis.set(gren, 'ikke forsøkt etter feilen')
      continue
    }
    try {
      const utfall = (await iBruk()).has(gren) ? 'pr' : await slett(gren, sha)
      if (utfall === 'slettet') {
        slettet.add(gren)
        logg(`SLETTET: ${gren} (${grunn})`)
        continue
      }
      const hvorfor = utfall === 'pr' ? 'en PR ble åpnet underveis' : UTFALL[utfall]
      underveis.set(gren, hvorfor)
      logg(`BEHOLDT: ${gren} (${hvorfor})`)
    } catch (e) {
      feil = e instanceof Error ? e.message : String(e)
      underveis.set(gren, 'slettingen feilet')
      logg(`FEIL: ${gren} (${feil})`)
    }
  }
  return { slettet, underveis, feil }
}
