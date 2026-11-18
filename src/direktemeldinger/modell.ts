/**
 * Direktemeldingene i appen (docs/direktemeldinger-personvern.md): formen på
 * samtalelista, søketreffene og valgene, og lesingen av det databasen svarer.
 * Selve samtalen har samme form som en gruppechat (`Chatside`, `Gruppemelding`
 * og `Direktemeta` i `src/gruppechat/modell.ts`), så chatvisningen og
 * kontrolleren brukes uendret.
 *
 * Verdier som ikke har formen, blir tomme i stedet for å velte visningen.
 */
import type { Profilkort } from '@delt/profil'
import { erObjekt, tall, tekst, tekstEllerNull } from '../ideer/lesing'
import { lesProfilkort } from '../gruppechat/modell'

/** Én direktesamtale i samtalelista. Ingen tekst. */
export interface Direktesamtale {
  id: string
  /** Den andre; `null` når kontoen er slettet. */
  motpart: Profilkort | null
  /** Den nyeste meldingen; `null` uten meldinger. */
  siste_kl: string | null
  /** Meldinger fra den andre den innloggede ikke har lest. */
  uleste: number
  dempet: boolean
  /** Det kan skrives i samtalen nå. */
  kan_skrive: boolean
}

/** Et treff i søket etter mottakere: bare navnet og brukernavnet. */
export interface Direktemottaker {
  id: string
  username: string
  first_name: string
  last_name: string
}

/** Egne valg for chatten, begge av som standard. */
export interface Chatvalg {
  tillat_direktemeldinger: boolean
  vis_aktiv: boolean
}

export const AVSLAATTE_CHATVALG: Chatvalg = { tillat_direktemeldinger: false, vis_aktiv: false }

export function lesDirektesamtale(verdi: unknown): Direktesamtale | null {
  if (!erObjekt(verdi) || typeof verdi.id !== 'string') return null
  return {
    id: verdi.id,
    motpart: lesProfilkort(verdi.motpart),
    siste_kl: tekstEllerNull(verdi.siste_kl),
    uleste: Math.max(0, tall(verdi.uleste)),
    dempet: verdi.dempet === true,
    kan_skrive: verdi.kan_skrive === true,
  }
}

export function lesDirektesamtaler(verdi: unknown): Direktesamtale[] {
  return Array.isArray(verdi) ? verdi.map(lesDirektesamtale).filter((s): s is Direktesamtale => s !== null) : []
}

export function lesDirektemottakere(verdi: unknown): Direktemottaker[] {
  if (!Array.isArray(verdi)) return []
  return verdi.flatMap((t) =>
    erObjekt(t) && typeof t.id === 'string'
      ? [{ id: t.id, username: tekst(t.username), first_name: tekst(t.first_name), last_name: tekst(t.last_name) }]
      : [],
  )
}

export function lesChatvalg(verdi: unknown): Chatvalg {
  if (!erObjekt(verdi)) return AVSLAATTE_CHATVALG
  return { tillat_direktemeldinger: verdi.tillat_direktemeldinger === true, vis_aktiv: verdi.vis_aktiv === true }
}

export function lesProfilkortene(verdi: unknown): Profilkort[] {
  return Array.isArray(verdi) ? verdi.map(lesProfilkort).filter((p): p is Profilkort => p !== null) : []
}

/** Navnet på en person: fornavn og etternavn, ellers brukernavnet, eller «Tidligere bruker». */
export function personnavn(p: Pick<Profilkort, 'first_name' | 'last_name' | 'username'> | null): string {
  if (!p) return 'Tidligere bruker'
  return `${p.first_name} ${p.last_name}`.trim() || p.username
}

/** Uleste i direktesamtalene som ikke er dempet, til chatknappen. */
export function ulesteDirekte(samtaler: readonly Direktesamtale[]): number {
  return samtaler.reduce((sum, s) => sum + (s.dempet ? 0 : s.uleste), 0)
}

/** Samtalene der navnet eller brukernavnet til den andre inneholder søket. */
export function sokIDirektesamtaler(samtaler: readonly Direktesamtale[], sok: string): Direktesamtale[] {
  const ord = sok.trim().toLocaleLowerCase('nb')
  if (!ord) return samtaler as Direktesamtale[]
  return samtaler.filter((s) => `${personnavn(s.motpart)} ${s.motpart?.username ?? ''}`.toLocaleLowerCase('nb').includes(ord))
}
