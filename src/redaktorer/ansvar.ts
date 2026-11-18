/**
 * Redaktøransvaret (P5 tråd A, docs/redaktorer-og-forslag.md,
 * «Redaktøransvar»): det appen leser og sender. Databasen kontrollerer hver
 * handling; svarene leses forsiktig, så det som mangler eller har feil form,
 * regnes som ingenting.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { lesFagmiljo, type Fagmiljoreferanse } from '../auth/rettigheter'
import { klient } from '../auth/klient'

export type Redaktoromrade = 'ressurs' | 'fortolkning' | 'fagsider'

export interface Redaktorperson {
  id: string
  fornavn: string
  etternavn: string
}

/** En fagside eller et regelsett et ansvar kan gjelde. */
export interface Redaktorressurs {
  id: string
  type: string
  navn: string
  /** Analyttkodene regelsettet gjelder; tom for en fagside. */
  analyttkoder: readonly string[]
  fagmiljoId: string | null
  /** Bare i oversikten: om noen har ansvaret for den nå. */
  harRedaktor?: boolean
}

export interface Redaktoransvar {
  id: string
  omrade: Redaktoromrade
  nasjonalt: boolean
  /** Om ansvaret gjelder nå (aktivt medlemskap, og for nasjonalt: slått på). */
  gjelder: boolean
  bruker: Redaktorperson
  /** Ressursen, når den innloggede kan lese den. */
  ressurs: Redaktorressurs | null
  fagmiljo: Fagmiljoreferanse | null
  tildeltAv: Redaktorperson | null
  tildeltKl: string
  merknad: string | null
}

export interface Redaktoroversikt {
  nasjonalt: { vises: boolean; aktivert: boolean }
  fagmiljoer: readonly Fagmiljoreferanse[]
  ansvar: readonly Redaktoransvar[]
  /** De lokale fagsidene og regelsettene i fagmiljøene. */
  ressurser: readonly Redaktorressurs[]
  /** Fagsidene uten redaktør, for systemarkitekten når det nasjonale vises. */
  fagsiderUtenRedaktor: number | null
}

type Rad = Record<string, unknown>
const rad = (v: unknown): Rad | null => (typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Rad) : null)
const tekst = (v: unknown): string => (typeof v === 'string' ? v : '')
const liste = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])

function lesPerson(v: unknown): Redaktorperson | null {
  const r = rad(v)
  return r && typeof r.id === 'string' ? { id: r.id, fornavn: tekst(r.fornavn), etternavn: tekst(r.etternavn) } : null
}

export function lesRessurs(v: unknown): Redaktorressurs | null {
  const r = rad(v)
  if (!r || typeof r.id !== 'string' || typeof r.type !== 'string') return null
  return {
    id: r.id,
    type: r.type,
    navn: tekst(r.navn),
    analyttkoder: liste(r.analyttkoder).filter((k): k is string => typeof k === 'string'),
    fagmiljoId: typeof r.fagmiljo_id === 'string' ? r.fagmiljo_id : null,
    ...(typeof r.har_redaktor === 'boolean' && { harRedaktor: r.har_redaktor }),
  }
}

const OMRADER: readonly Redaktoromrade[] = ['ressurs', 'fortolkning', 'fagsider']

export function lesAnsvar(v: unknown): Redaktoransvar | null {
  const r = rad(v)
  const bruker = lesPerson(r?.bruker)
  if (!r || typeof r.id !== 'string' || !OMRADER.includes(r.omrade as Redaktoromrade) || !bruker) return null
  return {
    id: r.id,
    omrade: r.omrade as Redaktoromrade,
    nasjonalt: r.nasjonalt === true,
    gjelder: r.gjelder === true,
    bruker,
    ressurs: lesRessurs(r.ressurs),
    fagmiljo: lesFagmiljo(r.fagmiljo),
    tildeltAv: lesPerson(r.tildelt_av),
    tildeltKl: tekst(r.tildelt_kl),
    merknad: typeof r.merknad === 'string' && r.merknad !== '' ? r.merknad : null,
  }
}

const alle = <T>(v: unknown, les: (x: unknown) => T | null): T[] => liste(v).map(les).filter((x): x is T => x !== null)

export function lesOversikt(v: unknown): Redaktoroversikt {
  const r = rad(v) ?? {}
  const n = rad(r.nasjonalt) ?? {}
  return {
    nasjonalt: { vises: n.vises === true, aktivert: n.aktivert === true },
    fagmiljoer: alle(r.fagmiljoer, lesFagmiljo),
    ansvar: alle(r.ansvar, lesAnsvar),
    ressurser: alle(r.ressurser, lesRessurs),
    fagsiderUtenRedaktor: typeof r.fagsider_uten_redaktor === 'number' ? r.fagsider_uten_redaktor : null,
  }
}

/** Avslagene databasen skriver for å vises; alt annet er en uventet feil. */
const AVSLAG_MED_MELDING = new Set(['42501', 'P0002', '22023', '55000', 'PT404'])
const UVENTET = 'Noe gikk galt. Prøv igjen.'


/** Det appen trenger for redaktøransvaret; byttes ut i testene. */
export interface Redaktorlager {
  oversikt(fagmiljo?: string): Promise<Redaktoroversikt>
  tildel(mal: { bruker: string; omrade: Redaktoromrade; ressurs?: string; fagmiljo?: string; merknad?: string }): Promise<string>
  tilbakekall(ansvar: string): Promise<void>
  mine(): Promise<Redaktoransvar[]>
  forRessurs(ressurs: string): Promise<Redaktoransvar[]>
}

/** Lageret mot databasen. `hentKlient` gis i testene; appen bruker den innloggede klienten. */
export function lagRedaktorlager(hentKlient: () => SupabaseClient = klient): Redaktorlager {
  const rpc = async (navn: string, argumenter: Record<string, unknown> = {}): Promise<unknown> => {
    const { data, error } = await hentKlient().rpc(navn, argumenter)
    if (error) throw new Error(AVSLAG_MED_MELDING.has(error.code) && error.message ? error.message : UVENTET)
    return data
  }
  return {
    oversikt: async (fagmiljo) => lesOversikt(await rpc('les_redaktoransvar', fagmiljo ? { fagmiljo } : {})),
    tildel: async ({ bruker, omrade, ressurs, fagmiljo, merknad }) =>
      tekst(
        await rpc('tildel_redaktoransvar', {
          bruker,
          omrade,
          ressurs: ressurs ?? null,
          fagmiljo: fagmiljo ?? null,
          merknad: merknad?.trim() || null,
        }),
      ),
    tilbakekall: async (ansvar) => {
      await rpc('tilbakekall_redaktoransvar', { ansvar })
    },
    mine: async () => alle(await rpc('mine_redaktoransvar'), lesAnsvar),
    forRessurs: async (ressurs) => alle(await rpc('ressursens_redaktoransvar', { ressurs }), lesAnsvar),
  }
}

export const redaktorlager: Redaktorlager = lagRedaktorlager()

export const personnavn = (p: Redaktorperson): string => `${p.fornavn} ${p.etternavn}`.trim() || 'Ukjent'

/** Hva et ansvar gjelder, kort, som i listene. */
export function ansvarstekst(a: Pick<Redaktoransvar, 'omrade' | 'ressurs' | 'fagmiljo'>): string {
  switch (a.omrade) {
    case 'fortolkning':
      return `Hele fortolkningen${a.fagmiljo ? ` i ${a.fagmiljo.navn}` : ''}`
    case 'fagsider':
      return 'Alle fagsidene (nasjonalt)'
    case 'ressurs':
      return a.ressurs ? ressursnavn(a.ressurs) : 'En ressurs du ikke kan se'
  }
}

/** Navnet på en fagside eller et regelsett, som i listene. */
export const ressursnavn = (r: Redaktorressurs): string => (r.type === 'infoside' ? `Fagsiden ${r.navn}` : `Regelsettet ${r.navn}`)

/** Regelsettene en redaktør for enkelte regelsett får redigere: id-ene, og analyttkodene de gjelder. */
export interface RedigerbareRegelsett {
  /** Id-ene til regelsettene; bare de kan redigeres på en side med flere. */
  ider: ReadonlySet<string>
  /** Analyttkodene i dem; fortolkningen for disse kodene får «Rediger». */
  koder: ReadonlySet<string>
}

export const INGEN_REGELSETT: RedigerbareRegelsett = { ider: new Set(), koder: new Set() }

/**
 * Regelsettene den innloggede er redaktør for gjennom et ansvar for ett
 * regelsett i fagmiljøet hen arbeider i, og som gjelder nå. Appen viser
 * redigeringen av akkurat dem; databasen avgjør hva som kan lagres.
 */
export function redigerbareRegelsett(ansvar: readonly Redaktoransvar[], arbeidsfagmiljo: string | null): RedigerbareRegelsett {
  const regelsett = ansvar
    .filter((a) => a.gjelder && a.omrade === 'ressurs' && a.ressurs && a.ressurs.type !== 'infoside' && a.ressurs.fagmiljoId === arbeidsfagmiljo)
    .map((a) => a.ressurs!)
  return { ider: new Set(regelsett.map((r) => r.id)), koder: new Set(regelsett.flatMap((r) => r.analyttkoder)) }
}
