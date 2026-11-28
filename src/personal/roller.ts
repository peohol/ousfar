import type { Role } from '@delt/personal/types'

/** Rollene i kalenderen med OUSFARs ord, fra den med færrest rettigheter (personal.md §8.4). */
export const KALENDERROLLER = [
  { rolle: 'reader', navn: 'Kollega' },
  { rolle: 'planner', navn: 'Vaktplanansvarlig' },
  { rolle: 'localAdmin', navn: 'Lokal administrator' },
] as const satisfies readonly { rolle: Role; navn: string }[]

export type Kalenderrolle = (typeof KALENDERROLLER)[number]['rolle']

export const rollenavn = (rolle: Role): string => KALENDERROLLER.find((r) => r.rolle === rolle)?.navn ?? rolle

/** Rollene som har høyst rettighetene til `rolle`, som «Vis som» kan gi (`personal.rolle_rang`). */
export function rollerTil(rolle: Role): Kalenderrolle[] {
  const rang = KALENDERROLLER.findIndex((r) => r.rolle === rolle)
  return KALENDERROLLER.slice(0, rang + 1).map((r) => r.rolle)
}
