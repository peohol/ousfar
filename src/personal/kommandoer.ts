/**
 * Kommandoene for medarbeiderne og «Vis som» (P2c, docs/personal-database.md,
 * «Innstillingene» og «Vis som»). Databasen kontrollerer rollen, revisjonen og
 * reglene på hvert kall, og feilene kommer tilbake med meldingen derfra: at
 * noen andre har endret det samme imens, at rollen ikke rekker, eller
 * regelbruddet. «Finnes ikke.» (funksjonen er slått av siden) blir
 * `FinnesIkke`, som for grunnlaget.
 */
import type { DutyShareSchedule, Role } from '@delt/personal/types'
import { klient } from '../auth/klient'
import { lesbarFeil } from '../auth/databasefeil'
import { FinnesIkke } from './grunnlag'
import { lesInnstillinger, type Innstillinger } from './medarbeidere/modell'

async function kall<T>(funksjon: string, argumenter: Record<string, unknown>, les: (svar: unknown) => T): Promise<T> {
  const { data, error } = await klient().rpc(funksjon, argumenter)
  if (error) throw error.code === 'P0002' ? new FinnesIkke() : lesbarFeil(error)
  return les(data)
}

export const settKvalifikasjoner = (fagmiljo: string, medarbeider: string, statuser: readonly string[], revisjon: number): Promise<Innstillinger> =>
  kall('personal_sett_kvalifikasjoner', { fagmiljo, medarbeider, statuser, forventet_revisjon: revisjon }, lesInnstillinger)

export const lagreVaktandel = (fagmiljo: string, medarbeider: string, vaktandel: DutyShareSchedule, revisjon: number): Promise<Innstillinger> =>
  kall('personal_lagre_vaktandel', { fagmiljo, medarbeider, vaktandel, forventet_revisjon: revisjon }, lesInnstillinger)

export interface Medlem {
  bruker: string
  navn: string
  vaktplanansvarlig: boolean
}

export const hentMedlemmer = (fagmiljo: string): Promise<Medlem[]> =>
  kall('personal_medlemmer', { fagmiljo }, (svar) => (Array.isArray(svar) ? (svar as Medlem[]) : []))

export const settVaktplanansvarlig = (fagmiljo: string, bruker: string, ansvarlig: boolean): Promise<void> =>
  kall('personal_sett_vaktplanansvarlig', { fagmiljo, bruker, ansvarlig }, () => undefined)

/** «Vis som» i et testmiljø: en lavere rolle og/eller én syntetisk medarbeider; begge tomme avslutter. */
export const visSom = (fagmiljo: string, rolle: Role | null, medarbeider: string | null): Promise<void> =>
  kall('personal_vis_som', { fagmiljo, rolle, medarbeider }, () => undefined)
