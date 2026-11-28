/**
 * «Vis som» slik databasen gir den (`personal.vis_som_json`, K-SKJ-7): den
 * virkelige rollen, og den valgte rollen og syntetiske medarbeideren.
 */
import { isRole } from '@delt/personal/permissions'
import type { Personalgrunnlag } from './grunnlag'
import type { Kalenderrolle } from './roller'

export interface Simulering {
  reellRolle: Kalenderrolle
  rolle: Kalenderrolle | null
  medarbeider: string | null
}

/** Simuleringen slik databasen gir den (`personal.vis_som_json`), eller `null` utenfor et testmiljø. */
export function tolkSimulering(s: unknown): Simulering | null {
  if (typeof s !== 'object' || s === null) return null
  const o = s as Record<string, unknown>
  const reell = o.reell_rolle
  if (!isRole(reell) || reell === 'outsideArchitect') return null
  const valg = (typeof o.vis_som === 'object' && o.vis_som !== null ? o.vis_som : {}) as Record<string, unknown>
  return {
    reellRolle: reell,
    rolle: isRole(valg.rolle) && valg.rolle !== 'outsideArchitect' ? valg.rolle : null,
    medarbeider: typeof valg.medarbeider === 'string' ? valg.medarbeider : null,
  }
}

export const lesSimulering = (g: Personalgrunnlag): Simulering | null => tolkSimulering(g.svar.simulering)
