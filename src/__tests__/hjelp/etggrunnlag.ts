/**
 * Fortolkningen av EtG og EtS slik OUS Klinisk farmakologi har den: modulens
 * scenarioregelsett og kommentarene i importgrunnlaget
 * (`src/domain/__tests__/fasit/etg-import.json`, `scripts/etg-import.ts`),
 * gjort om til tilfellene modulen viser, slik appen gjør det med reglene fra
 * databasen.
 */
import grunnlag from '../../domain/__tests__/fasit/etg-import.json'
import { etgTilfeller, type EtgAlternativ } from '../../domain/etg'
import type { Rusregler } from '../../domain/rus'
import type { Scenarioregelsett } from '../../domain/scenario'
import { ETG_ANALYTT } from '../../domain/ouskatalog'
import type { Scenarioregeldata } from '../../faginnhold/scenarioregler'
import { rusScenarioregeldata } from './rusgrunnlag'

/** Reglene modulen fortolkes med, med kommentarene etter nøkkelen i grunnlaget. */
export const ETG_REGLER: Rusregler = {
  status: 'klar',
  regelsett: grunnlag.regelsett[0] as unknown as Scenarioregelsett,
  kommentarer: new Map(grunnlag.kommentarer.map((k) => [k.id, k.innhold.tekst])),
}

/** Tilfellene, i regelsettets rekkefølge: begge påvist, bare EtG, bare EtS. */
export const ETG_ALTERNATIVER: EtgAlternativ[] = (() => {
  const tilfeller = etgTilfeller(ETG_ANALYTT, ETG_REGLER)
  if (tilfeller.status !== 'klar') throw new Error('Grunnlaget for EtG og EtS kan ikke vises som et valg.')
  return tilfeller.alternativer
})()

/** Tilfellet med denne nøkkelen. */
export const alternativFor = (id: string) => ETG_ALTERNATIVER.find((a) => a.id === id)

/**
 * Alle scenarioregelsettene OUS Klinisk farmakologi har publisert — rusmodulene
 * og EtG og EtS — i den formen `les_scenarioregler` gir dem, med nøklene i
 * grunnlagene som ID-er.
 */
export function scenarioregeldata(): Scenarioregeldata {
  const rus = rusScenarioregeldata()
  const [mal] = rus.regelsett
  const utgave = <T,>(id: string, innhold: T) => ({ ...mal!, id, innhold })
  return {
    regelsett: [...rus.regelsett, ...grunnlag.regelsett.map((r) => utgave(`regelsett/${r.modul}`, structuredClone(r) as unknown as Scenarioregelsett))],
    kommentarer: [...rus.kommentarer, ...grunnlag.kommentarer.map((k) => utgave(k.id, k.innhold))],
  }
}
