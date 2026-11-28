/**
 * Grunnlaget for personalkalenderen i et fagmiljø, slik databasen gir det
 * (`public.personal_grunnlag`, docs/personal-database.md): rollen den
 * innloggede har i kalenderen, og resten av svaret slik det står. Rollen
 * avledes på serveren og avgjør bare hva siden viser; hver kommando
 * kontrollerer den på nytt (K-TIL-2).
 */
import { isRole } from '@delt/personal/permissions'
import type { Role } from '@delt/personal/types'
import { klient } from '../auth/klient'
import { lesbarFeil, UVENTET_FEIL, type Databasefeil } from '../auth/databasefeil'

export interface Personalgrunnlag {
  /** Rollen i kalenderen: `reader` (kollega), `planner` eller `localAdmin`. */
  rolle: Role
  /** Hele svaret, med oppsettet, stillingene, medarbeiderne og de vaktplanansvarlige. */
  svar: Readonly<Record<string, unknown>>
}

/**
 * Kastes når databasen svarer som om kalenderen ikke fantes: uten funksjonen
 * (`P0002`, K-SKJ-3) eller uten eget aktivt medlemskap (`42501`). Siden viser
 * da det samme som for en ukjent adresse (K-SKJ-2).
 */
export class FinnesIkke extends Error {
  constructor() {
    super('Finnes ikke.')
    this.name = 'FinnesIkke'
  }
}

/** Feilkodene som betyr at kalenderen ikke finnes for den innloggede. */
const FINNES_IKKE = new Set(['P0002', '42501'])

export function tilPersonalfeil(feil: Databasefeil): Error {
  return feil.code && FINNES_IKKE.has(feil.code) ? new FinnesIkke() : lesbarFeil(feil)
}

/** Svaret, når det har en rolle appen kjenner; ellers en feil. */
export function lesGrunnlag(svar: unknown): Personalgrunnlag {
  const r = typeof svar === 'object' && svar !== null && !Array.isArray(svar) ? (svar as Record<string, unknown>) : null
  if (!r || !isRole(r.rolle) || r.rolle === 'outsideArchitect') throw new Error(UVENTET_FEIL)
  return { rolle: r.rolle, svar: r }
}

export async function hentGrunnlag(fagmiljo: string): Promise<Personalgrunnlag> {
  const { data, error } = await klient().rpc('personal_grunnlag', { fagmiljo })
  if (error) throw tilPersonalfeil(error)
  return lesGrunnlag(data)
}
