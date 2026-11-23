/**
 * Lesingen av OUSFARs kopi av CYPinfo, slik appen gjør den (`les_cypinfo`).
 * Nettleseren snakker aldri med CYPinfo; kopien fylles av synkroniseringen.
 *
 * Svaret leses forsiktig: en rad som mangler det visningen trenger, eller har
 * et nivå OUSFAR ikke kjenner, utelates i stedet for å vises halvt.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { omIBruk, STANSEDE_KILDER } from '../datakilder/stans'
import { erObjekt } from '../datakilder/struktur'
import { erNiva, type Genfenotype, type Genresultatdata, type Legemiddeldata, type Niva } from './modell'

/** Når kopien sist ble endret og kontrollert mot CYPinfo. */
export interface Cypinfokilde {
  navn: 'CYPinfo'
  endret_kl: string | null
  kontrollert_kl: string | null
}

/** En anbefaling CYPinfo gir for en kombinasjon av gen og fenotype. */
export interface Cypinfoanbefaling {
  id: string
  legemiddel_id: string
  kombinasjoner: Genfenotype[]
  niva: Niva
  avsnitt: string[]
}

export interface Cypinfoutvalg {
  kilde: Cypinfokilde
  legemidler: { id: string; data: Legemiddeldata }[]
  anbefalinger: Cypinfoanbefaling[]
  genresultater: { id: string; data: Genresultatdata }[]
}

export interface Cypinfoleser {
  /** Legemidlene med en av FEST-ID-ene eller CYPinfo-ID-ene, med anbefalingene og gentabellen for dem. */
  les(fest_ider: readonly string[], cypinfo_ider: readonly string[]): Promise<Cypinfoutvalg>
}

export const TOMT_CYPINFOUTVALG: Cypinfoutvalg = {
  kilde: { navn: 'CYPinfo', endret_kl: null, kontrollert_kl: null },
  legemidler: [],
  anbefalinger: [],
  genresultater: [],
}

const tekst = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null)
const tekster = (v: unknown): string[] => (Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [])
const liste = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter(erObjekt) : [])

function lesKombinasjon(v: Record<string, unknown>): Genfenotype | null {
  const [gen, gen_slug, fenotype_id, fenotype] = [v.gen, v.gen_slug, v.fenotype_id, v.fenotype].map(tekst)
  return gen && gen_slug && fenotype_id && fenotype ? { gen, gen_slug, fenotype_id, fenotype } : null
}

function lesAnbefaling(v: Record<string, unknown>): Cypinfoanbefaling | null {
  const id = tekst(v.id)
  const legemiddel_id = tekst(v.legemiddel_id)
  const kombinasjoner = liste(v.kombinasjoner).map(lesKombinasjon)
  if (!id || !legemiddel_id || !erNiva(v.niva) || kombinasjoner.length === 0 || kombinasjoner.some((k) => !k)) return null
  return { id, legemiddel_id, kombinasjoner: kombinasjoner as Genfenotype[], niva: v.niva, avsnitt: tekster(v.avsnitt) }
}

/** Svaret fra `les_cypinfo`, lest. */
export function lesCypinfoutvalg(svar: unknown): Cypinfoutvalg {
  if (!erObjekt(svar)) return TOMT_CYPINFOUTVALG
  const kilde = erObjekt(svar.kilde) ? svar.kilde : {}
  const rader = <T,>(v: unknown, gyldig: (data: Record<string, unknown>) => boolean) =>
    liste(v).flatMap((r) => (tekst(r.id) && erObjekt(r.data) && gyldig(r.data) ? [{ id: r.id as string, data: r.data as T }] : []))
  return {
    kilde: { navn: 'CYPinfo', endret_kl: tekst(kilde.endret_kl), kontrollert_kl: tekst(kilde.kontrollert_kl) },
    legemidler: rader<Legemiddeldata>(svar.legemidler, (d) => !!tekst(d.navn) && Array.isArray(d.gensett)),
    anbefalinger: liste(svar.anbefalinger).flatMap((a) => lesAnbefaling(a) ?? []),
    genresultater: rader<Genresultatdata>(svar.genresultater, (d) => !!tekst(d.gen_slug) && !!tekst(d.fenotype_id) && !!tekst(d.fenotype)),
  }
}

export function lagCypinfoleser(klient: SupabaseClient): Cypinfoleser {
  return {
    les: async (fest_ider, cypinfo_ider) => {
      if (fest_ider.length === 0 && cypinfo_ider.length === 0) return TOMT_CYPINFOUTVALG
      const { data, error } = await klient.rpc('les_cypinfo', { fest_ider: [...fest_ider], cypinfo_ider: [...cypinfo_ider] })
      if (error) throw new Error(error.message)
      return lesCypinfoutvalg(data)
    },
  }
}

/** Merket foran CYPinfo-ID-ene i en liste der de står sammen med FEST-ID-ene. */
const CYPINFO_ID = 'cypinfo:'

/** FEST-ID-ene og CYPinfo-ID-ene i én liste, med CYPinfo-ID-ene merket, så de skilles fra hverandre. */
export function slaSammenIder(foresporsel: { fest_ider: readonly string[]; cypinfo_ider: readonly string[] }): string[] {
  return [...foresporsel.fest_ider, ...foresporsel.cypinfo_ider.map((i) => CYPINFO_ID + i)]
}

/** Det motsatte av {@link slaSammenIder}. */
export function delIder(ider: readonly string[]): { fest_ider: string[]; cypinfo_ider: string[] } {
  return {
    fest_ider: ider.filter((i) => !i.startsWith(CYPINFO_ID)),
    cypinfo_ider: ider.filter((i) => i.startsWith(CYPINFO_ID)).map((i) => i.slice(CYPINFO_ID.length)),
  }
}

/** Så mange ID-er tar `les_cypinfo` i ett kall. */
export const CYPINFO_IDER_PER_KALL = 200

/** Flere utvalg som ett, med hver rad én gang. */
export function slaSammenCypinfoutvalg(utvalg: readonly Cypinfoutvalg[]): Cypinfoutvalg {
  const unike = <T extends { id: string }>(rader: readonly T[]) => [...new Map(rader.map((r) => [r.id, r])).values()]
  return {
    kilde: utvalg[0]?.kilde ?? TOMT_CYPINFOUTVALG.kilde,
    legemidler: unike(utvalg.flatMap((u) => u.legemidler)),
    anbefalinger: unike(utvalg.flatMap((u) => u.anbefalinger)),
    genresultater: unike(utvalg.flatMap((u) => u.genresultater)),
  }
}

/**
 * Den delen av utvalget én side får, med samme regel som `les_cypinfo`:
 * legemidlene med en av FEST-ID-ene eller CYPinfo-ID-ene (som i
 * {@link slaSammenIder}), anbefalingene for dem og gentabellen for genene deres.
 */
export function cypinfoFor(utvalg: Cypinfoutvalg, ider: readonly string[]): Cypinfoutvalg {
  const { fest_ider, cypinfo_ider } = delIder(ider)
  const fest = new Set(fest_ider)
  const egne = new Set(cypinfo_ider)
  const legemidler = utvalg.legemidler.filter((l) => egne.has(l.id) || l.data.fest.some((f) => fest.has(f)))
  const valgte = new Set(legemidler.map((l) => l.id))
  const gener = new Set(legemidler.flatMap((l) => l.data.gener))
  return {
    kilde: utvalg.kilde,
    legemidler,
    anbefalinger: utvalg.anbefalinger.filter((a) => valgte.has(a.legemiddel_id)),
    genresultater: utvalg.genresultater.filter((g) => gener.has(g.data.gen_slug)),
  }
}

/** Lesingen søket i hele kunnskapsbasen bruker: alle ID-ene på en gang, som i {@link slaSammenIder}. */
export interface Cypinfosok {
  les(ider: readonly string[]): Promise<Cypinfoutvalg>
}

/** Søkets lesing over `leser`: ID-ene i kall på høyst {@link CYPINFO_IDER_PER_KALL}, slått sammen. */
export function lagCypinfosok(leser: Cypinfoleser, perKall = CYPINFO_IDER_PER_KALL): Cypinfosok {
  return {
    les: async (ider) => {
      const deler: string[][] = []
      for (let i = 0; i < ider.length; i += perKall) deler.push(ider.slice(i, i + perKall))
      const svar = await Promise.all(deler.map((d) => {
        const { fest_ider, cypinfo_ider } = delIder(d)
        return leser.les(fest_ider, cypinfo_ider)
      }))
      return slaSammenCypinfoutvalg(svar)
    },
  }
}

/** Leseren, eller `undefined` når CYPinfo er stanset (`STANSEDE_KILDER`): da vises ingenting fra CYPinfo. */
export function lagCypinfoleserOmIBruk(klient: SupabaseClient, stansede = STANSEDE_KILDER): Cypinfoleser | undefined {
  return omIBruk('cypinfo', () => lagCypinfoleser(klient), stansede)
}

/** Søkets lesing, eller `undefined` når CYPinfo er stanset. */
export function lagCypinfosokOmIBruk(klient: SupabaseClient, stansede = STANSEDE_KILDER): Cypinfosok | undefined {
  return omIBruk('cypinfo', () => lagCypinfosok(lagCypinfoleser(klient)), stansede)
}
