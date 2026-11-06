/**
 * Datakildene som er stanset på ubestemt tid: ingen henting kjøres, verken
 * planlagt eller av en administrator, og appen leser og viser ingenting fra
 * dem. Dataene er slettet fra databasen i samme omgang (`docs/datakilder.md`).
 *
 * Å ta en kilde i bruk igjen er å fjerne den her og legge den planlagte
 * jobben tilbake; første henting laster da alt på nytt fra en tom kopi.
 */
import type { Datakilde } from './status'

export interface Stans {
  /** Datoen kilden ble stanset, som ÅÅÅÅ-MM-DD. */
  fra: string
  /** Hvorfor, i én setning. */
  grunn: string
}

export const STANSEDE_KILDER: Readonly<Partial<Record<Datakilde, Stans>>> = {
  cpic: {
    fra: '2026-11-06',
    grunn: 'CPIC-dataene er slettet for å spare plass i databasen, og skal erstattes av norske farmakogenetiske data.',
  },
}

export function stansFor(kilde: Datakilde, stansede = STANSEDE_KILDER): Stans | null {
  return stansede[kilde] ?? null
}

/** «Stanset 06.11.2026. <grunn> Ingenting hentes eller vises fra <navn>.» */
export function stansmelding(stans: Stans, navn: string): string {
  const [aar, maaned, dag] = stans.fra.split('-')
  return `Stanset ${dag}.${maaned}.${aar}. ${stans.grunn} Ingenting hentes eller vises fra ${navn}.`
}

/**
 * Svaret synkroniseringsendepunktet gir mens kilden er stanset: 410 for både
 * den planlagte jobben og administratorer, uten å kalle kilden. `null` når
 * kilden ikke er stanset.
 */
export function stansetSvar(kilde: Datakilde, navn: string, stansede = STANSEDE_KILDER): Response | null {
  const stans = stansFor(kilde, stansede)
  if (!stans) return null
  return Response.json({ status: 'stanset', feil: stansmelding(stans, navn) }, { status: 410 })
}
