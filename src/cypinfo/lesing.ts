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

/** Leseren, eller `undefined` når CYPinfo er stanset (`STANSEDE_KILDER`): da vises ingenting fra CYPinfo. */
export function lagCypinfoleserOmIBruk(klient: SupabaseClient, stansede = STANSEDE_KILDER): Cypinfoleser | undefined {
  return omIBruk('cypinfo', () => lagCypinfoleser(klient), stansede)
}
