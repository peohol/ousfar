import type { Kurve } from './thcKurver'
import { sikkerhetsmarginfeil, type ThcSikkerhetsmargin } from './thcRegelsett'
import type { Analyte } from '../types'

/**
 * Modellen for fortolkningen av benzoylekgonin i urin
 * (`docs/benzoylekgonin-urin.md`): utskillelsesprofilene for kvotienten
 * benzoylekgonin/kreatinin, måleusikkerheten og sikkerhetsmarginene.
 *
 * Alt som er klinisk innhold, står i modellen, ikke i koden: profilene,
 * enhetene, CV-ene og marginene. Modellen er fagmiljøets egen og står i
 * databasen per fagmiljø (`public.les_be_urin_modell()`); appen har ingen
 * modell i klientpakken og ingen reserve. Uten en modell i fagmiljøet
 * fortolker modulen ingenting.
 *
 * Modellen finnes i to former. Form 1 ({@link BeUrinModell}, uten feltet
 * `form`) er den første: to bieksponentielle profiler og konklusjonen etter
 * hvor mange av dem endringen ligger over. Form 2 ({@link BeUrinProfilmodell},
 * #570) har fem profiler, tre monoeksponentielle og de to bieksponentielle, og
 * vurderer sporadisk og kronisk bruk hver for seg. Appen sender formene den
 * kjenner ({@link MODELLFORMOVERSKRIFT}), og databasen gir ingen app en form
 * den ikke kjenner.
 */

/** Formene appen kjenner. */
export const BE_URIN_MODELLFORMER = [1, 2] as const
export type BeUrinModellform = (typeof BE_URIN_MODELLFORMER)[number]

/** Overskriften appen oppgir formene den kjenner i (kommaskilt). */
export const MODELLFORMOVERSKRIFT = 'x-far-be-urin-modellformer'

/** Overskriftene modellen hentes med. */
export const modelloverskrifter = (): Record<string, string> => ({ [MODELLFORMOVERSKRIFT]: BE_URIN_MODELLFORMER.join(',') })

/** Det begge formene har. */
export interface BeUrinFellesmodell {
  /** Hvilken utgave av modellen dette er, slik den er godkjent. */
  versjon: string
  /**
   * Enhetene feltene tastes i, og kvotientenheten profilene står i. Tom tekst
   * betyr laboratoriets egne enheter uten noe navn i appen, som i
   * THC-syremodulen: profilene er da laget med de samme enhetene som tastes inn.
   */
  enheter: { benzoylekgonin: string; kreatinin: string; kvotient: string }
  /**
   * Q = kvotientfaktor · benzoylekgonin / kreatinin, i kvotientenheten.
   * 1 når feltenes enheter er de regresjonene er laget med.
   */
  kvotientfaktor: number
  /** Analysevariasjonen (CV, som andel) for hver av de to målingene. */
  maleusikkerhet: { cv_benzoylekgonin: number; cv_kreatinin: number }
  /** Stigende. «Ingen» (0,5) har z = 0. */
  sikkerhetsmarginer: ThcSikkerhetsmargin[]
  standard_sikkerhetsmargin: number
}

/** En utskillelsesprofil: C(t) = a1·e^(−k1·t) + a2·e^(−k2·t), t i døgn, C i kvotientenheten. */
export interface BeUrinKurve extends Kurve {
  /** Navnet i figuren og forklaringen, nøytralt («Utskillelsesprofil 1»). */
  navn: string
}

/** Form 1: de to bieksponentielle profilene (#562). */
export interface BeUrinModell extends BeUrinFellesmodell {
  form?: 1
  /** De to profilene. Rekkefølgen sier ikke hvilken som er strengest; det varierer med Q og tid. */
  kurver: [BeUrinKurve, BeUrinKurve]
}

/* --- Form 2: fem profiler (#570) ------------------------------------------ */

/** De monoeksponentielle profilene: C(t) = a·e^(−k·t). Terskelen e^(−k·d) avhenger ikke av a eller Q. */
export const BE_URIN_MONOPROFILER = ['enkeltinntak', 'gjentatte_doser', 'moderat'] as const
/**
 * De bieksponentielle profilene, med faste ID-er. Hvilken av dem som er «treg»
 * og hvilken som er «ekstrem», avgjøres per sammenligning, ikke her.
 */
export const BE_URIN_BIPROFILER = ['bi_a', 'bi_b'] as const
export type BeUrinMonoId = (typeof BE_URIN_MONOPROFILER)[number]
export type BeUrinBiId = (typeof BE_URIN_BIPROFILER)[number]
export type BeUrinProfilId = BeUrinMonoId | BeUrinBiId

export interface BeUrinMonoprofil {
  id: BeUrinMonoId
  type: 'mono'
  a: number
  /** Per døgn. */
  k: number
}

/** C(t) = a1·e^(−k1·t) + a2·e^(−k2·t), t i døgn. */
export interface BeUrinBiprofil extends Kurve {
  id: BeUrinBiId
  type: 'bi'
}

export type BeUrinProfil = BeUrinMonoprofil | BeUrinBiprofil

/** Form 2: de fem profilene, hver med fast ID og type, i vilkårlig rekkefølge. */
export interface BeUrinProfilmodell extends BeUrinFellesmodell {
  form: 2
  profiler: BeUrinProfil[]
}

declare const godkjent: unique symbol
type Godkjent<T> = T & { readonly [godkjent]: true }
/** En modell av form 1 som har bestått {@link validerBeUrinModell}. Motoren tar bare imot denne. */
export type GodkjentBeUrinModell = Godkjent<BeUrinModell>
/** En modell av form 2 som har bestått {@link validerBeUrinProfilmodell}. */
export type GodkjentBeUrinProfilmodell = Godkjent<BeUrinProfilmodell>
/** En godkjent modell av en av formene. */
export type GodkjentBeUrinModellutgave = GodkjentBeUrinModell | GodkjentBeUrinProfilmodell

/** Sant for en modell av form 2. */
export function erProfilmodell<T extends BeUrinFellesmodell>(m: T): m is T & BeUrinProfilmodell {
  return (m as { form?: unknown }).form === 2
}

const KURVEFELT = ['a1', 'k1', 'a2', 'k2'] as const

function positivt(verdi: unknown): verdi is number {
  return typeof verdi === 'number' && Number.isFinite(verdi) && verdi > 0
}

function ikkeTom(verdi: unknown): verdi is string {
  return typeof verdi === 'string' && verdi.trim() !== ''
}

const erObjekt = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Det som gjør at modellen ikke engang har formen sin: delene som ikke er
 * objekter eller lister. `profilfelt` er listen med profilene i formen.
 */
function formfeil(m: unknown, profilfelt: 'kurver' | 'profiler'): string[] {
  if (!erObjekt(m)) return ['Modellen har ikke formen den skal ha.']
  const feil: string[] = []
  if (!erObjekt(m.enheter)) feil.push('Modellen mangler enhetene.')
  const profiler = m[profilfelt]
  if (!Array.isArray(profiler) || !profiler.every(erObjekt)) feil.push('Modellen mangler utskillelsesprofilene.')
  if (!erObjekt(m.maleusikkerhet)) feil.push('Modellen mangler måleusikkerheten.')
  if (!Array.isArray(m.sikkerhetsmarginer) || !m.sikkerhetsmarginer.every(erObjekt)) {
    feil.push('Modellen mangler sikkerhetsmarginene.')
  }
  return feil
}

/** Feilene i det begge formene har: versjonen, enhetene, kvotientfaktoren, CV-ene og marginene. */
function fellesfeil(m: BeUrinFellesmodell): string[] {
  const feil: string[] = []
  if (!ikkeTom(m.versjon)) feil.push('Modellen mangler versjon.')
  for (const felt of ['benzoylekgonin', 'kreatinin', 'kvotient'] as const) {
    const enhet = m.enheter[felt]
    if (typeof enhet !== 'string' || enhet !== enhet.trim()) feil.push(`Enheten for ${felt} er ugyldig.`)
  }
  if (!positivt(m.kvotientfaktor)) feil.push('Kvotientfaktoren må være et tall større enn 0.')
  const { cv_benzoylekgonin, cv_kreatinin } = m.maleusikkerhet
  if (!positivt(cv_benzoylekgonin) || cv_benzoylekgonin >= 1) feil.push('CV for benzoylekgonin må ligge mellom 0 og 1.')
  if (!positivt(cv_kreatinin) || cv_kreatinin >= 1) feil.push('CV for kreatinin må ligge mellom 0 og 1.')
  feil.push(...sikkerhetsmarginfeil(m.sikkerhetsmarginer, m.standard_sikkerhetsmargin))
  return feil
}

/** Feltene som må være positive tall i en profil av hver type. */
const PROFILFELT = { mono: ['a', 'k'], bi: KURVEFELT } as const

/** Alt som er galt med en modell av form 1, i vanlig språk. Tom liste betyr at den kan brukes. */
export function validerBeUrinModell(m: BeUrinModell): string[] {
  const form = formfeil(m, 'kurver')
  if (form.length > 0) return form
  const feil: string[] = []
  if (m.form !== undefined && m.form !== 1) feil.push('Modellen har en annen form enn de to utskillelsesprofilene.')
  if (m.kurver.length !== 2) {
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
  return [...fellesfeil(m), ...feil]
}

/** Typen hver profil-ID skal ha. */
const PROFILTYPE: Record<BeUrinProfilId, BeUrinProfil['type']> = {
  ...(Object.fromEntries(BE_URIN_MONOPROFILER.map((id) => [id, 'mono'])) as Record<BeUrinMonoId, 'mono'>),
  ...(Object.fromEntries(BE_URIN_BIPROFILER.map((id) => [id, 'bi'])) as Record<BeUrinBiId, 'bi'>),
}
const PROFIL_IDER = Object.keys(PROFILTYPE) as BeUrinProfilId[]

/**
 * Alt som er galt med en modell av form 2, i vanlig språk: hver av de fem
 * profilene nøyaktig én gang, med riktig type og positive parametre.
 */
export function validerBeUrinProfilmodell(m: BeUrinProfilmodell): string[] {
  const form = formfeil(m, 'profiler')
  if (form.length > 0) return form
  const feil: string[] = []
  if (m.form !== 2) feil.push('Modellen har ikke formen med fem utskillelsesprofiler.')
  if (m.profiler.length !== PROFIL_IDER.length) {
    feil.push(`Modellen må ha nøyaktig ${PROFIL_IDER.length} utskillelsesprofiler.`)
  }
  const sett = new Set<string>()
  m.profiler.forEach((profil, i) => {
    const id = profil.id as unknown
    const forventet = typeof id === 'string' ? PROFILTYPE[id as BeUrinProfilId] : undefined
    if (forventet === undefined) {
      feil.push(`Utskillelsesprofil ${i + 1} har en ukjent ID.`)
      return
    }
    if (sett.has(id as string)) feil.push(`Profilen ${String(id)} står mer enn én gang.`)
    sett.add(id as string)
    if (profil.type !== forventet) {
      feil.push(`Profilen ${String(id)} må være ${forventet === 'mono' ? 'monoeksponentiell' : 'bieksponentiell'}.`)
      return
    }
    const verdier = profil as unknown as Record<string, unknown>
    for (const felt of PROFILFELT[forventet]) {
      if (!positivt(verdier[felt])) feil.push(`Profilen ${String(id)}: ${felt} må være et tall større enn 0.`)
    }
  })
  for (const id of PROFIL_IDER) if (!sett.has(id)) feil.push(`Modellen mangler profilen ${id}.`)
  return [...fellesfeil(m), ...feil]
}

type Godkjenning<T> = { ok: true; modell: Godkjent<T> } | { ok: false; feil: string[] }

const godkjennMed =
  <T>(valider: (m: T) => string[]) =>
  (m: T): Godkjenning<T> => {
    const feil = valider(m)
    return feil.length === 0 ? { ok: true, modell: m as Godkjent<T> } : { ok: false, feil }
  }

/** Kontrollerer en modell av form 1 og gir den videre som godkjent, eller feilene. */
export const godkjennBeUrinModell = godkjennMed(validerBeUrinModell)

/** Kontrollerer en modell av form 2 og gir den videre som godkjent, eller feilene. */
export const godkjennBeUrinProfilmodell = godkjennMed(validerBeUrinProfilmodell)

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
 * Modellen i svaret, kontrollert etter formen den har: `null` når fagmiljøet
 * ikke har noen, og feilene når den ikke kan brukes. Formen kontrolleres felt
 * for felt; en modell med noe annet enn tall der det skal stå tall, består
 * ikke, og en form appen ikke kjenner, brukes aldri som en annen.
 */
export function tilBeUrinModell(
  modell: unknown,
): { ok: true; modell: GodkjentBeUrinModellutgave } | { ok: false; feil: string[] } | null {
  if (modell === null) return null
  const form = erObjekt(modell) ? modell.form : undefined
  if (form === undefined || form === 1) return godkjennBeUrinModell(modell as BeUrinModell)
  if (form === 2) return godkjennBeUrinProfilmodell(modell as BeUrinProfilmodell)
  return { ok: false, feil: ['Modellen har en form appen ikke kjenner.'] }
}

/** Modellen slik modulen har den: på vei, ikke mulig å bruke, eller klar. */
export type BeUrinModellstatus =
  | { status: 'laster' }
  | { status: 'feil'; melding: string; provIgjen: () => void }
  | { status: 'klar'; modell: GodkjentBeUrinModellutgave; fagmiljo: string }

/* --- Oppføringen -------------------------------------------------------- */

/** Sant for søkeoppføringen som åpner fortolkningen av benzoylekgonin i urin. */
export function erBeUrinAnalytt(analyte: Analyte): boolean {
  return analyte.modul?.type === 'be_urin'
}
