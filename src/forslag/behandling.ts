/**
 * Behandlingen av endringsforslagene (P5 tråd C, docs/redaktorer-og-forslag.md,
 * «Behandling»): arbeidskøen slik `les_forslagsko` gir den, og kallene
 * behandlerne gjør. Hvem appen viser behandlingen for, sier
 * `Rettigheter.behandlerForslag`. Databasen kontrollerer hver handling på
 * nytt (`intern.kan_behandle_forslag`).
 */
import { erObjekt, tall } from '../ideer/lesing'
import { kall } from './api'
import { lesForslagsrader, lesPerson, type Forslag, type Forslagsperson, type Forslagsrad } from './modell'

/** Ett forslag i arbeidskøen. */
export interface Korad extends Omit<Forslagsrad, 'venter_pa_meg'> {
  stilt_av: Forslagsperson | null
  behandler_er_meg: boolean
  har_behandler: boolean
  /** Ingen redaktør har ansvaret for innholdet; administratoren er reserve. */
  uten_redaktor: boolean
  /** Innholdet er publisert på nytt siden forslaget ble skrevet. */
  endret_siden: boolean
}

export interface Forslagsantall {
  nye: number
  pagaende: number
  uten_redaktor: number
  /** De den innloggede behandler og ikke er ferdig med. */
  mine: number
}

export interface Forslagsko {
  antall: Forslagsantall
  nye: Korad[]
  pagaende: Korad[]
  ferdige: Korad[]
}

function lesKoradene(verdi: unknown): Korad[] {
  const rader = Array.isArray(verdi) ? verdi : []
  const ekstra = new Map(rader.filter(erObjekt).map((r) => [r.id, r]))
  return lesForslagsrader(rader).map(({ venter_pa_meg: _, ...rad }) => {
    const r = ekstra.get(rad.id) ?? {}
    return {
      ...rad,
      stilt_av: lesPerson(r.stilt_av),
      behandler_er_meg: r.behandler_er_meg === true,
      har_behandler: r.har_behandler === true,
      uten_redaktor: r.uten_redaktor === true,
      endret_siden: r.endret_siden === true,
    }
  })
}

export function lesForslagsko(verdi: unknown): Forslagsko {
  const v = erObjekt(verdi) ? verdi : {}
  const a = erObjekt(v.antall) ? v.antall : {}
  return {
    antall: { nye: tall(a.nye), pagaende: tall(a.pagaende), uten_redaktor: tall(a.uten_redaktor), mine: tall(a.mine) },
    nye: lesKoradene(v.nye),
    pagaende: lesKoradene(v.pagaende),
    ferdige: lesKoradene(v.ferdige),
  }
}

/** Hvor mange forslag som venter: de ingen har tatt, og dem den innloggede behandler. */
export const ventende = (antall: Forslagsantall): number => antall.nye + antall.mine

/* --- Kallene --------------------------------------------------------------- */

export async function hentForslagsko(): Promise<Forslagsko> {
  return lesForslagsko(await kall('les_forslagsko', { filter: 'alle' }))
}

export async function hentForslagsantall(): Promise<Forslagsantall> {
  return lesForslagsko(await kall('les_forslagsko', { filter: 'antall' })).antall
}

/** Det en behandler kan gjøre med et forslag, med teksten handlingen tar. */
export const BEHANDLINGER = {
  kommenter: { funksjon: 'kommenter_forslag', felt: 'tekst' },
  presisering: { funksjon: 'be_om_presisering', felt: 'tekst' },
  godkjenn: { funksjon: 'godkjenn_forslag', felt: 'begrunnelse' },
  avvis: { funksjon: 'avvis_forslag', felt: 'begrunnelse' },
} as const
export type Behandling = keyof typeof BEHANDLINGER

export async function behandle(handling: Behandling, forslag: string, tekst: string): Promise<void> {
  const { funksjon, felt } = BEHANDLINGER[handling]
  await kall(funksjon, { forslag, [felt]: tekst.trim() || null })
}

export async function taForslag(forslag: string): Promise<void> {
  await kall('ta_forslag', { forslag })
}

/**
 * Kobler et godkjent forslag til utkastet: elementet forslaget gjelder (eller
 * ressursen), på revisjonen utkastet står på nå. Databasen finner revisjonen.
 */
export async function markerInnarbeidet(forslag: string): Promise<void> {
  await kall('marker_forslag_innarbeidet', { forslag })
}

/* --- Hva behandleren kan gjøre --------------------------------------------- */

/** Handlingene siden viser for forslaget, etter statusen (overgangene i kontrakten). */
export function muligeBehandlinger(f: Pick<Forslag, 'status' | 'behandler' | 'kan_behandle'>): {
  ta: boolean
  behandlinger: Behandling[]
  innarbeid: boolean
} {
  if (!f.kan_behandle || f.status === 'trukket') return { ta: false, behandlinger: [], innarbeid: false }
  const min = f.behandler?.er_meg === true
  switch (f.status) {
    case 'ny':
      return { ta: true, behandlinger: ['kommenter', 'presisering', 'godkjenn', 'avvis'], innarbeid: false }
    case 'under_behandling':
      return { ta: !min, behandlinger: ['kommenter', 'presisering', 'godkjenn', 'avvis'], innarbeid: false }
    case 'venter_pa_forslagsstiller':
      return { ta: !min, behandlinger: ['kommenter', 'avvis'], innarbeid: false }
    case 'godkjent':
      return { ta: false, behandlinger: ['kommenter'], innarbeid: true }
    default:
      return { ta: false, behandlinger: ['kommenter'], innarbeid: false }
  }
}
