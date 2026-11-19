/**
 * Stillingene brukerne kan oppgi (docs/stillinger.md).
 *
 * Lista er data i databasen: kategorier med stillinger i, i rekkefølgen
 * systemarkitektene har satt. Den hentes én gang per innlogging og deles av
 * alle som viser en stilling (kontoen, brukerlista, profilkortene), og hentes
 * på nytt når en systemarkitekt har endret den. Stillingen til en bruker står
 * på profilkortet (`stilling_id`); navnet slås opp her med `stillingsnavn`.
 */
import { useEffect } from 'react'
import type { Profilkort } from '@delt/profil'
import { rpc } from '../auth/api'
import { klient } from '../auth/klient'
import { vedOktskifte } from '../auth/oktskifte'
import { lagDeltTilstand } from '../hooks/deltTilstand'

export interface Stilling {
  id: string
  kategori_id: string
  navn: string
  rekkefolge: number
}

export interface Stillingskategori {
  id: string
  navn: string
  rekkefolge: number
  /** I rekkefølge. */
  stillinger: Stilling[]
}

/** Hele lista, kategoriene i rekkefølge. */
export type Stillingskatalog = readonly Stillingskategori[]

const iRekkefolge = <T extends { rekkefolge: number; navn: string }>(a: T, b: T) =>
  a.rekkefolge - b.rekkefolge || a.navn.localeCompare(b.navn, 'nb')

/** Leser lista fra databasen, sortert. */
export async function lesStillingskatalog(): Promise<Stillingskatalog> {
  const { data, error } = await klient()
    .from('stillingskategorier')
    .select('id, navn, rekkefolge, stillinger (id, kategori_id, navn, rekkefolge)')
  if (error) throw error
  return ((data ?? []) as unknown as Stillingskategori[])
    .map((k) => ({
      ...k,
      stillinger: [...(k.stillinger ?? [])].sort(iRekkefolge),
    }))
    .sort(iRekkefolge)
}

/* --- Den delte lista ------------------------------------------------------- */

/** `null` til lista er hentet. */
const katalog = lagDeltTilstand<Stillingskatalog | null>(null)

/**
 * Hver lesing har et løpenummer, og bare svaret på den siste legges inn. Slik
 * kan ikke en lesing som startet før en endring, legge den gamle lista tilbake
 * etter den nye, og ikke en lesing fra forrige innlogging komme inn i den neste.
 */
let lopenummer = 0
let underveis: Promise<void> | null = null

/**
 * Henter lista på nytt. Samtidige kall deles, unntatt med `etterEndring`, som
 * alltid starter en ny lesing. En feil lar den forrige stå.
 */
export function oppfriskStillinger(etterEndring = false): Promise<void> {
  if (underveis && !etterEndring) return underveis
  const denne = ++lopenummer
  const lesing = lesStillingskatalog()
    .then(
      (liste) => {
        if (denne === lopenummer) katalog.sett(liste)
      },
      () => undefined,
    )
    .finally(() => {
      if (underveis === lesing) underveis = null
    })
  underveis = lesing
  return lesing
}

vedOktskifte(() => {
  lopenummer++
  underveis = null
  katalog.sett(null)
})

/**
 * Stillingslista, hentet første gang noe trenger den. Tom til den er hentet,
 * og om den ikke kunne hentes.
 */
export function useStillinger(): Stillingskatalog {
  const verdi = katalog.bruk()
  useEffect(() => {
    if (verdi === null) void oppfriskStillinger()
  }, [verdi])
  return verdi ?? []
}

/** Stillingen med ID-en, med kategorien den står i, eller `null`. */
export function finnStilling(
  liste: Stillingskatalog,
  id: string | null | undefined,
): { stilling: Stilling; kategori: Stillingskategori } | null {
  if (!id) return null
  for (const kategori of liste) {
    const stilling = kategori.stillinger.find((s) => s.id === id)
    if (stilling) return { stilling, kategori }
  }
  return null
}

/** Navnet på stillingen til en bruker, eller `null` når hen ikke har oppgitt noen. */
export function stillingsnavn(liste: Stillingskatalog, profil: Pick<Profilkort, 'stilling_id'>): string | null {
  return finnStilling(liste, profil.stilling_id)?.stilling.navn ?? null
}

/* --- Endringene ------------------------------------------------------------- */

/**
 * Setter stillingen til en bruker, eller fjerner den (`null`): egen, eller
 * andres for systemarkitekter og lokale administratorer. Kontrolleres i
 * databasen (`intern.stillingsavslag`).
 */
export function settStilling(bruker: string, stilling: string | null): Promise<string | null> {
  return rpc('sett_stilling', { bruker, stilling })
}

/**
 * Systemarkitektenes endringer av lista. Hver av dem henter lista på nytt
 * etterpå, også når endringen ble avvist, så alle ser det som faktisk står.
 */
async function endreLista<T>(navn: string, argumenter: Record<string, unknown>): Promise<T> {
  try {
    return await rpc<T>(navn, argumenter)
  } finally {
    await oppfriskStillinger(true)
  }
}

/** Oppretter en kategori (`kategori` er `null`) eller gir den et nytt navn. */
export const lagreStillingskategori = (kategori: string | null, navn: string) =>
  endreLista<string>('lagre_stillingskategori', { kategori, navn })

/** Flytter kategorien til plass `indeks` (fra 0). */
export const flyttStillingskategori = (kategori: string, indeks: number) =>
  endreLista<void>('flytt_stillingskategori', { kategori, indeks })

/** Fjerner en tom kategori. */
export const fjernStillingskategori = (kategori: string) => endreLista<void>('fjern_stillingskategori', { kategori })

/** Oppretter en stilling (`stilling` er `null`), eller gir den nytt navn eller ny kategori. */
export const lagreStilling = (stilling: string | null, kategori: string, navn: string) =>
  endreLista<string>('lagre_stilling', { stilling, kategori, navn })

/** Flytter stillingen til plass `indeks` (fra 0) i kategorien. */
export const flyttStilling = (stilling: string, indeks: number) =>
  endreLista<void>('flytt_stilling', { stilling, indeks })

/**
 * Fjerner stillingen. Har noen den, får de `erstatning`, alle på én gang.
 * Gir hvor mange som fikk den.
 */
export const fjernStilling = (stilling: string, erstatning: string | null = null) =>
  endreLista<number>('fjern_stilling', { stilling, erstatning })

/** Hvor mange som har hver stilling. Bare systemarkitektene. */
export async function hentStillingsbruk(): Promise<Map<string, number>> {
  const rader = await rpc<{ stilling_id: string; antall: number }[] | null>('stillingsbruk', {})
  return new Map((rader ?? []).map((r) => [r.stilling_id, r.antall]))
}

/** En bruker som har en stilling, med fagmiljøene hen er aktivt medlem av. */
export interface Stillingsinnehaver extends Profilkort {
  fagmiljoer: string[]
}

/** Brukerne som har stillingen. Bare systemarkitektene. */
export async function hentBrukereMedStilling(stilling: string): Promise<Stillingsinnehaver[]> {
  return (
    (await rpc<Stillingsinnehaver[] | null>('brukere_med_stilling', {
      stilling,
    })) ?? []
  )
}
