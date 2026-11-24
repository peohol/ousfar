import type { Kurve } from './thcKurver'
import { sikkerhetsmarginfeil, type ThcSikkerhetsmargin } from './thcRegelsett'
import type { Analyte } from '../types'

/**
 * Modellen for den tentative fortolkningen av benzoylekgonin i urin
 * (`docs/benzoylekgonin-urin.md`): to empiriske utskillelsesprofiler for
 * kvotienten benzoylekgonin/kreatinin, måleusikkerheten og
 * sikkerhetsmarginene.
 *
 * Alt som er klinisk innhold, står i modellen, ikke i koden: kurvene,
 * enhetene, CV-ene og marginene. Modellen er fagmiljøets egen og står i
 * databasen per fagmiljø (`public.les_be_urin_modell()`); appen har ingen
 * modell i klientpakken og ingen reserve. Uten en modell i fagmiljøet
 * fortolker modulen ingenting.
 */

/** En utskillelsesprofil: C(t) = a1·e^(−k1·t) + a2·e^(−k2·t), t i døgn, C i kvotientenheten. */
export interface BeUrinKurve extends Kurve {
  /** Navnet i figuren og forklaringen, nøytralt («Utskillelsesprofil 1»). */
  navn: string
}

export interface BeUrinModell {
  /** Hvilken utgave av modellen dette er, slik den er godkjent. */
  versjon: string
  /**
   * Enhetene feltene tastes i, og kvotientenheten kurvenes amplituder står i.
   * Tom tekst betyr laboratoriets egne enheter uten noe navn i appen, som i
   * THC-syremodulen: kurvene er da laget med de samme enhetene som tastes inn.
   */
  enheter: { benzoylekgonin: string; kreatinin: string; kvotient: string }
  /**
   * Q = kvotientfaktor · benzoylekgonin / kreatinin, i kvotientenheten.
   * 1 når feltenes enheter er de regresjonene er laget med.
   */
  kvotientfaktor: number
  /** De to profilene. Rekkefølgen sier ikke hvilken som er strengest; det varierer med Q og tid. */
  kurver: [BeUrinKurve, BeUrinKurve]
  /** Analysevariasjonen (CV, som andel) for hver av de to målingene. */
  maleusikkerhet: { cv_benzoylekgonin: number; cv_kreatinin: number }
  /** Stigende. «Ingen» (0,5) har z = 0. */
  sikkerhetsmarginer: ThcSikkerhetsmargin[]
  standard_sikkerhetsmargin: number
}

declare const godkjent: unique symbol
/** En modell som har bestått {@link validerBeUrinModell}. Motoren tar bare imot denne. */
export type GodkjentBeUrinModell = BeUrinModell & { readonly [godkjent]: true }

const KURVEFELT = ['a1', 'k1', 'a2', 'k2'] as const

function positivt(verdi: unknown): verdi is number {
  return typeof verdi === 'number' && Number.isFinite(verdi) && verdi > 0
}

function ikkeTom(verdi: unknown): verdi is string {
  return typeof verdi === 'string' && verdi.trim() !== ''
}

const erObjekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/** Det som gjør at modellen ikke engang har formen sin: delene som ikke er objekter eller lister. */
function formfeil(m: unknown): string[] {
  if (!erObjekt(m)) return ['Modellen har ikke formen den skal ha.']
  const feil: string[] = []
  if (!erObjekt(m.enheter)) feil.push('Modellen mangler enhetene.')
  if (!Array.isArray(m.kurver) || !m.kurver.every(erObjekt)) feil.push('Modellen mangler utskillelsesprofilene.')
  if (!erObjekt(m.maleusikkerhet)) feil.push('Modellen mangler måleusikkerheten.')
  if (!Array.isArray(m.sikkerhetsmarginer) || !m.sikkerhetsmarginer.every(erObjekt)) {
    feil.push('Modellen mangler sikkerhetsmarginene.')
  }
  return feil
}

/** Alt som er galt med modellen, i vanlig språk. Tom liste betyr at den kan brukes. */
export function validerBeUrinModell(m: BeUrinModell): string[] {
  const form = formfeil(m)
  if (form.length > 0) return form
  const feil: string[] = []
  if (!ikkeTom(m.versjon)) feil.push('Modellen mangler versjon.')
  for (const felt of ['benzoylekgonin', 'kreatinin', 'kvotient'] as const) {
    const enhet = m.enheter[felt]
    if (typeof enhet !== 'string' || enhet !== enhet.trim()) feil.push(`Enheten for ${felt} er ugyldig.`)
  }
  if (!positivt(m.kvotientfaktor)) feil.push('Kvotientfaktoren må være et tall større enn 0.')
  if (!Array.isArray(m.kurver) || m.kurver.length !== 2) {
    feil.push('Modellen må ha nøyaktig to utskillelsesprofiler.')
  } else {
    m.kurver.forEach((kurve, i) => {
      const navn = ikkeTom(kurve.navn) ? kurve.navn : `Profil ${i + 1}`
      if (!ikkeTom(kurve.navn)) feil.push(`Utskillelsesprofil ${i + 1} mangler navn.`)
      for (const felt of KURVEFELT) {
        if (!positivt(kurve[felt])) feil.push(`${navn}: ${felt} må være et tall større enn 0.`)
      }
    })
    if (ikkeTom(m.kurver[0].navn) && m.kurver[0].navn === m.kurver[1].navn) {
      feil.push('De to utskillelsesprofilene må ha ulike navn.')
    }
  }
  const { cv_benzoylekgonin, cv_kreatinin } = m.maleusikkerhet
  if (!positivt(cv_benzoylekgonin) || cv_benzoylekgonin >= 1) feil.push('CV for benzoylekgonin må ligge mellom 0 og 1.')
  if (!positivt(cv_kreatinin) || cv_kreatinin >= 1) feil.push('CV for kreatinin må ligge mellom 0 og 1.')
  feil.push(...sikkerhetsmarginfeil(m.sikkerhetsmarginer, m.standard_sikkerhetsmargin))
  return feil
}

/** Kontrollerer modellen og gir den videre som godkjent, eller feilene. */
export function godkjennBeUrinModell(
  m: BeUrinModell,
): { ok: true; modell: GodkjentBeUrinModell } | { ok: false; feil: string[] } {
  const feil = validerBeUrinModell(m)
  return feil.length === 0 ? { ok: true, modell: m as GodkjentBeUrinModell } : { ok: false, feil }
}

/* --- Svaret fra databasen ----------------------------------------------- */

/** Svaret fra `public.les_be_urin_modell()`: fagmiljøet og modellen, eller `null` uten modell. */
export interface BeUrinModellsvar {
  fagmiljo: { id: string; navn: string } | null
  modell: unknown
}

/** Svaret hadde ikke formen det skal ha. */
export class UgyldigBeUrinSvar extends Error {}

export function lesBeUrinModellsvar(data: unknown): BeUrinModellsvar {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) throw new UgyldigBeUrinSvar('Svaret mangler.')
  const { fagmiljo, modell } = data as Record<string, unknown>
  const gyldigFagmiljo =
    fagmiljo === null ||
    (typeof fagmiljo === 'object' &&
      typeof (fagmiljo as Record<string, unknown>).id === 'string' &&
      typeof (fagmiljo as Record<string, unknown>).navn === 'string')
  if (!gyldigFagmiljo || modell === undefined) throw new UgyldigBeUrinSvar('Svaret har ikke formen det skal ha.')
  return { fagmiljo: fagmiljo as BeUrinModellsvar['fagmiljo'], modell }
}

/**
 * Modellen i svaret, kontrollert: `null` når fagmiljøet ikke har noen, og
 * feilene når den ikke kan brukes. Formen kontrolleres felt for felt; en
 * modell med noe annet enn tall der det skal stå tall, består ikke.
 */
export function tilBeUrinModell(
  modell: unknown,
): { ok: true; modell: GodkjentBeUrinModell } | { ok: false; feil: string[] } | null {
  if (modell === null) return null
  return godkjennBeUrinModell(modell as BeUrinModell)
}

/** Modellen slik modulen har den: på vei, ikke mulig å bruke, eller klar. */
export type BeUrinModellstatus =
  | { status: 'laster' }
  | { status: 'feil'; melding: string; provIgjen: () => void }
  | { status: 'klar'; modell: GodkjentBeUrinModell; fagmiljo: string }

/* --- Oppføringen -------------------------------------------------------- */

/** Sant for søkeoppføringen som åpner fortolkningen av benzoylekgonin i urin. */
export function erBeUrinAnalytt(analyte: Analyte): boolean {
  return analyte.modul?.type === 'be_urin'
}
