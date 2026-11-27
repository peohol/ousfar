/**
 * Funksjonsbryterne per fagmiljø og testmiljøene, slik systemarkitektene ser og
 * endrer dem i Administrasjon → Funksjoner (#598, docs/fagmiljoer.md,
 * «Funksjonsbrytere per fagmiljø»).
 *
 * Databasen avgjør alt: hvem som kan endre (bare systemarkitektene), hvilke
 * tilstander som er lov i et fagmiljø, og hvem som får funksjonen. Det som står
 * her, er bare det grensesnittet trenger for å vise det og ikke tilby noe
 * databasen vil avvise. Hva den innloggede selv har, står i rettighetene
 * (`harFunksjon` i `rettigheter.tsx`).
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { lesFagmiljo, type Fagmiljoreferanse } from './rettigheter'

export const FUNKSJONSTILSTANDER = ['av', 'utprøving', 'på'] as const
export type Funksjonstilstand = (typeof FUNKSJONSTILSTANDER)[number]

/** Navnet og hvem som får funksjonen, for hver tilstand. */
export const TILSTANDER: Record<Funksjonstilstand, { navn: string; hvem: string }> = {
  av: { navn: 'Av', hvem: 'Ingen' },
  utprøving: { navn: 'Utprøving', hvem: 'Systemarkitekter som selv er medlemmer' },
  på: { navn: 'På', hvem: 'Alle medlemmene' },
}

/** Den minste begrunnelsen databasen godtar (`intern.funksjonsbegrunnelse`). */
export const MINSTE_BEGRUNNELSE = 5

export interface Funksjonsbryter {
  fagmiljo: string
  tilstand: Exclude<Funksjonstilstand, 'av'>
  endretKl: string
  endretAv: string | null
}

export interface Funksjonsbeskrivelse {
  nokkel: string
  navn: string
  beskrivelse: string
  /**
   * De aktive fagmiljøene funksjonen er godkjent for ordinær bruk i, der den
   * kan prøves ut eller slås på uten å være testmiljø. Gis bare med en
   * migrasjon fra eierprosjektet.
   */
  godkjenteFagmiljoer: readonly string[]
  /** Bryterne som ikke står på av. */
  brytere: readonly Funksjonsbryter[]
}

export interface Funksjonsfagmiljo extends Fagmiljoreferanse {
  testmiljo: boolean
}

export interface Funksjonsoversikt {
  funksjoner: readonly Funksjonsbeskrivelse[]
  /** De aktive fagmiljøene, etter navn. */
  fagmiljoer: readonly Funksjonsfagmiljo[]
}

const erTilstand = (v: unknown): v is Funksjonstilstand => FUNKSJONSTILSTANDER.includes(v as Funksjonstilstand)
const objekt = (v: unknown): Record<string, unknown> => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : {})
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

/** Svaret fra `public.funksjonsoversikt()`, uten det som har feil form. */
export function lesFunksjonsoversikt(svar: unknown): Funksjonsoversikt {
  const o = objekt(svar)
  return {
    funksjoner: liste(o.funksjoner)
      .map(objekt)
      .filter((f) => typeof f.nokkel === 'string' && typeof f.navn === 'string')
      .map((f) => ({
        nokkel: f.nokkel as string,
        navn: f.navn as string,
        beskrivelse: typeof f.beskrivelse === 'string' ? f.beskrivelse : '',
        godkjenteFagmiljoer: liste(f.godkjente_fagmiljoer).filter((v): v is string => typeof v === 'string'),
        brytere: liste(f.brytere)
          .map(objekt)
          .filter((b) => typeof b.fagmiljo === 'string' && erTilstand(b.tilstand) && b.tilstand !== 'av')
          .map((b) => ({
            fagmiljo: b.fagmiljo as string,
            tilstand: b.tilstand as Funksjonsbryter['tilstand'],
            endretKl: typeof b.endret_kl === 'string' ? b.endret_kl : '',
            endretAv: typeof b.endret_av === 'string' ? b.endret_av : null,
          })),
      })),
    fagmiljoer: liste(o.fagmiljoer).flatMap((v) => {
      const f = lesFagmiljo(v)
      return f ? [{ ...f, testmiljo: objekt(v).testmiljo === true }] : []
    }),
  }
}

/** Tilstanden funksjonen har i fagmiljøet: av uten bryter. */
export const tilstandI = (f: Funksjonsbeskrivelse, fagmiljo: string): Funksjonstilstand =>
  f.brytere.find((b) => b.fagmiljo === fagmiljo)?.tilstand ?? 'av'

/** Om funksjonen er godkjent for ordinær bruk i fagmiljøet. */
export const erGodkjentI = (f: Funksjonsbeskrivelse, fagmiljo: string): boolean => f.godkjenteFagmiljoer.includes(fagmiljo)

/**
 * Tilstandene funksjonen kan få i fagmiljøet, som databasen avgjør det
 * (`intern.funksjonsbryteravslag`): alle i et testmiljø og i et fagmiljø
 * funksjonen er godkjent for, ellers bare av.
 */
export const tillatteTilstander = (f: Funksjonsbeskrivelse, fagmiljo: Funksjonsfagmiljo): readonly Funksjonstilstand[] =>
  fagmiljo.testmiljo || erGodkjentI(f, fagmiljo.id) ? FUNKSJONSTILSTANDER : ['av']

/**
 * Om testmerkingen kan endres for fagmiljøet: standardfagmiljøet er aldri et
 * testmiljø, og merket kan ikke fjernes mens en funksjon som ikke er godkjent
 * der, prøves ut eller er på der.
 */
export function kanEndreTestmiljo(o: Funksjonsoversikt, fagmiljo: Funksjonsfagmiljo): boolean {
  if (!fagmiljo.testmiljo) return !fagmiljo.standard
  return o.funksjoner.every((f) => erGodkjentI(f, fagmiljo.id) || tilstandI(f, fagmiljo.id) === 'av')
}

export interface Funksjonsbryterlager {
  oversikt(): Promise<Funksjonsoversikt>
  settBryter(funksjon: string, fagmiljo: string, tilstand: Funksjonstilstand, begrunnelse: string): Promise<void>
  settTestmiljo(fagmiljo: string, testmiljo: boolean, begrunnelse: string): Promise<void>
}

export function lagFunksjonsbryterlager(k: SupabaseClient): Funksjonsbryterlager {
  const kall = async (navn: string, argumenter?: Record<string, unknown>) => {
    const { data, error } = await k.rpc(navn, argumenter)
    if (error) throw new Error(error.message)
    return data as unknown
  }
  return {
    oversikt: async () => lesFunksjonsoversikt(await kall('funksjonsoversikt')),
    settBryter: async (funksjon, fagmiljo, tilstand, begrunnelse) => {
      await kall('sett_funksjonsbryter', { funksjon, fagmiljo, tilstand, begrunnelse })
    },
    settTestmiljo: async (fagmiljo, testmiljo, begrunnelse) => {
      await kall('sett_testmiljo', { fagmiljo, testmiljo, begrunnelse })
    },
  }
}
