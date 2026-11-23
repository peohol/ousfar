/**
 * Datakildene som er stanset på ubestemt tid: ingen henting kjøres, verken
 * planlagt eller av en administrator, og appen leser og viser ingenting fra
 * dem (`docs/datakilder.md`). Om dataene slettes fra databasen, er en egen
 * beslutning: CPICs ble slettet i samme omgang, mens ClinPGx' står til de
 * slettes med Peders ja (#540).
 *
 * Å ta en kilde i bruk igjen er å fjerne den her og legge den planlagte
 * jobben tilbake; første henting laster da alt på nytt fra en tom kopi. CPIC
 * tas ikke i bruk igjen: koden er fjernet (#437), og den står her bare så
 * «Datakilder» viser den som stanset til skjemaet er slettet.
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

/**
 * Det `lag` gir, eller `undefined` når kilden er stanset. Appen bygger
 * leserne for en kilde gjennom denne, så en stanset kilde verken leses eller
 * vises: uten leser er kilden `ingen` på fagsidene og ute av søket.
 */
export function omIBruk<T>(kilde: Datakilde, lag: () => T, stansede = STANSEDE_KILDER): T | undefined {
  return stansFor(kilde, stansede) ? undefined : lag()
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
