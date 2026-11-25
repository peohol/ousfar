import { tidForVerdi, verdiPaaKurve } from './thcKurver'
import {
  korrigertRatio,
  lesBeUrinInndata,
  logSd,
  NUMERISK_FEIL,
  zFor,
  type BeUrinInndata,
  type BeUrinLestProve,
  type BeUrinMangler,
} from './beUrinMotor'
import type {
  BeUrinBiprofil,
  BeUrinFellesmodell,
  BeUrinMonoprofil,
  BeUrinProfil,
  GodkjentBeUrinProfilmodell,
} from './beUrinModell'

/**
 * Fortolkningsmotoren for benzoylekgonin i urin med fem utskillelsesprofiler
 * (modellform 2, #570, `docs/benzoylekgonin-urin.md`).
 *
 * 1. Q = kvotientfaktor · benzoylekgonin / kreatinin for begge prøvene, og
 *    R_korr = Q2/Q1 · exp(z · √(2 · (CV_BE² + CV_kreatinin²))), som i form 1.
 * 2. Terskelen R_i for hver profil etter d døgn:
 *    · monoeksponentiell: R_i = e^(−k_i·d), uavhengig av Q1 og a;
 *    · bieksponentiell: t_i der C_i(t_i) = Q1, og R_i = C_i(t_i + d)/Q1.
 *    Samme dato gir R_i = 1 for alle.
 * 3. De to bieksponentielle profilene får navnene sine per sammenligning: den
 *    med høyest R er «ekstrem», den andre «treg». Like terskler gir A som
 *    ekstrem og B som treg, og det sies.
 * 4. F_i = R_korr/R_i graderes uten avrunding: under (F < 1), på nivå med
 *    (F = 1), over (≤ 5), langt over (≤ 10), svært langt over (> 10).
 * 5. To vurderinger, hver for seg: sporadisk bruk (enkeltinntak og gjentatte
 *    doser) og kronisk bruk (moderat, treg og ekstrem).
 *
 * Tersklene regnes også som logaritmer, så et svært langt tidsrom aldri gir
 * en ugyldig konklusjon av at e^(−k·d) blir 0 i flyttall.
 */

/* --- Gradene --------------------------------------------------------------- */

/** Gradene, fra lavest. */
export const BE_URIN_GRADER = ['under', 'paa_nivaa', 'over', 'langt_over', 'svaert_langt_over'] as const
export type BeUrinGrad = (typeof BE_URIN_GRADER)[number]

/** Grensene for F mellom gradene «over», «langt over» og «svært langt over». Nøyaktig grensen hører til den lavere. */
export const BE_URIN_GRADGRENSER = { over: 5, langtOver: 10 } as const

const LN = { over: Math.log(BE_URIN_GRADGRENSER.over), langtOver: Math.log(BE_URIN_GRADGRENSER.langtOver) }

/** Graden for F, eller for log F med grensene som logaritmer. */
function gradFor(v: number, en: number, over: number, langtOver: number): BeUrinGrad {
  if (v < en) return 'under'
  if (v === en) return 'paa_nivaa'
  if (v <= over) return 'over'
  if (v <= langtOver) return 'langt_over'
  return 'svaert_langt_over'
}

/** Sant når F > 1. */
export const over = (grad: BeUrinGrad): boolean => BE_URIN_GRADER.indexOf(grad) > BE_URIN_GRADER.indexOf('paa_nivaa')
/** Sant når F > 5. */
export const langtOver = (grad: BeUrinGrad): boolean => BE_URIN_GRADER.indexOf(grad) > BE_URIN_GRADER.indexOf('over')

/** Det minste normale flyttallet: under det har en kvotient mistet sifre. */
const MINSTE_NORMALE = 2.2250738585072014e-308
const normalt = (x: number) => Number.isFinite(x) && x >= MINSTE_NORMALE

/**
 * F = R_korr/R og graden. Direkte når begge og kvotienten er vanlige tall,
 * ellers med logaritmene, så et svært langt tidsrom ikke gir 0 eller ∞.
 */
function grader(korrigert: number, logKorrigert: number, terskel: number, logTerskel: number) {
  const f = korrigert / terskel
  if (normalt(korrigert) && normalt(terskel) && normalt(f)) return { f, logF: Math.log(f), grad: gradFor(f, 1, BE_URIN_GRADGRENSER.over, BE_URIN_GRADGRENSER.langtOver) }
  const logF = logKorrigert - logTerskel
  return { f: Math.exp(logF), logF, grad: gradFor(logF, 0, LN.over, LN.langtOver) }
}

/* --- Profilene -------------------------------------------------------------- */

/**
 * Navnene profilene har i resultatet, i den rekkefølgen de står. «Treg» og
 * «ekstrem» er de to bieksponentielle profilene, fordelt per sammenligning.
 */
export const BE_URIN_ROLLER = ['enkeltinntak', 'gjentatte_doser', 'moderat', 'treg', 'ekstrem'] as const
export type BeUrinRolle = (typeof BE_URIN_ROLLER)[number]

/** Profilene den sporadiske og den kroniske vurderingen bygger på. */
export const BE_URIN_SPORADISKE_ROLLER = ['enkeltinntak', 'gjentatte_doser'] as const satisfies readonly BeUrinRolle[]
export const BE_URIN_KRONISKE_ROLLER = ['moderat', 'treg', 'ekstrem'] as const satisfies readonly BeUrinRolle[]

/** Én profil lest av for en referanseprøve og et tidsrom. */
export interface BeUrinProfilvurdering {
  rolle: BeUrinRolle
  profil: BeUrinProfil
  /** ln R_i. */
  logTerskel: number
  /** R_i. Kan bli 0 i flyttall for svært lange tidsrom; graden bygger da på {@link logTerskel}. */
  terskel: number
  /** Bieksponentiell: punktet på profilen der referanseprøven står (døgn). Ikke tiden siden inntak. */
  tidspunkt: number | null
  /** Bieksponentiell: referanseprøven ligger over profilens startverdi (t < 0), så terskelen er ekstrapolert. */
  ekstrapolert: boolean
  /** F = R_korr/R_i. */
  f: number
  logF: number
  grad: BeUrinGrad
}

type Terskel = Pick<BeUrinProfilvurdering, 'logTerskel' | 'tidspunkt' | 'ekstrapolert'>

/** Hvor nær C(t) må ligge Q for at tidspunktet regnes som funnet. */
const TIDSPUNKT_TOLERANSE = 1e-9

/** ln C(t) for en bieksponentiell profil, uten at leddene blir 0 for store t. */
function logKurve(t: number, p: BeUrinBiprofil): number {
  const x = Math.log(p.a1) - p.k1 * t
  const y = Math.log(p.a2) - p.k2 * t
  const storst = Math.max(x, y)
  return storst + Math.log1p(Math.exp(Math.min(x, y) - storst))
}

function monoterskel(p: BeUrinMonoprofil, dager: number): Terskel {
  return { logTerskel: dager === 0 ? 0 : -p.k * dager, tidspunkt: null, ekstrapolert: false }
}

/**
 * Terskelen for en bieksponentiell profil fra `q`, `dager` døgn fram. `null`
 * når tidspunktet ikke lar seg finne med full presisjon.
 */
function biterskel(p: BeUrinBiprofil, q: number, dager: number): Terskel | null {
  const tidspunkt = tidForVerdi(q, p)
  if (!Number.isFinite(tidspunkt) || !(Math.abs(verdiPaaKurve(tidspunkt, p) / q - 1) <= TIDSPUNKT_TOLERANSE)) return null
  // Uten tid mellom prøvene er terskelen nøyaktig 1.
  const logTerskel = dager === 0 ? 0 : logKurve(tidspunkt + dager, p) - Math.log(q)
  if (!Number.isFinite(logTerskel)) return null
  return { logTerskel, tidspunkt, ekstrapolert: q > verdiPaaKurve(0, p) }
}

/** R/Q1 på profilen `dag` døgn etter referanseprøven, til figuren. Endepunktet er {@link BeUrinProfilvurdering.terskel}. */
export function ratioEtter(v: BeUrinProfilvurdering, fra: number, dag: number): number {
  const p = v.profil
  if (p.type === 'mono') return Math.exp(-p.k * dag)
  return Math.exp(logKurve(v.tidspunkt! + dag, p) - Math.log(fra))
}

/* --- Vurderingene ----------------------------------------------------------- */

/**
 * Vurderingen når sporadisk bruk legges til grunn, fra mildest. Den sterkeste
 * er «nytt inntak» (#576), ikke «svært sannsynlig».
 */
export const BE_URIN_SPORADISK = ['forenlig_enkeltinntak', 'forenlig_gjentatte_doser', 'sannsynlig', 'nytt_inntak'] as const
/** Vurderingen når kronisk bruk legges til grunn, fra mildest. */
export const BE_URIN_KRONISK = ['uavklart', 'uavklart_uvanlig', 'sannsynlig', 'nytt_inntak'] as const
export type BeUrinSporadisk = (typeof BE_URIN_SPORADISK)[number]
export type BeUrinKronisk = (typeof BE_URIN_KRONISK)[number]

/** En sammenligning av denne prøven med en referanseprøve, med alle fem profilene. */
export interface BeUrinProfilsammenligning {
  /** Q i referanseprøven. */
  fra: number
  /** Q i denne prøven. */
  til: number
  dager: number
  margin: number
  maltRatio: number
  korrigertRatio: number
  /** ln R_målt. Endelig også når {@link maltRatio} ikke er det (Q2/Q1 utenfor flyttallene). */
  logMalt: number
  /** ln R_korr. */
  logKorrigert: number
  /** I {@link BE_URIN_ROLLER}-rekkefølgen. */
  profiler: BeUrinProfilvurdering[]
  /** De to bieksponentielle profilene gir nøyaktig samme terskel (A er da «ekstrem»). */
  likeBi: boolean
  sporadisk: BeUrinSporadisk
  kronisk: BeUrinKronisk
}

/** Profilen med navnet i sammenligningen. */
export function profilFor(s: Pick<BeUrinProfilsammenligning, 'profiler'>, rolle: BeUrinRolle): BeUrinProfilvurdering {
  return s.profiler.find((p) => p.rolle === rolle)!
}

function sporadiskFor(s: BeUrinProfilsammenligning): BeUrinSporadisk {
  const enkelt = profilFor(s, 'enkeltinntak').grad
  const gjentatt = profilFor(s, 'gjentatte_doser').grad
  if (!over(enkelt)) return 'forenlig_enkeltinntak'
  if (!over(gjentatt)) return 'forenlig_gjentatte_doser'
  return langtOver(gjentatt) ? 'nytt_inntak' : 'sannsynlig'
}

function kroniskFor(s: BeUrinProfilsammenligning): BeUrinKronisk {
  const ekstrem = profilFor(s, 'ekstrem').grad
  if (langtOver(ekstrem)) return 'nytt_inntak'
  if (over(ekstrem)) return 'sannsynlig'
  return over(profilFor(s, 'moderat').grad) && over(profilFor(s, 'treg').grad) ? 'uavklart_uvanlig' : 'uavklart'
}

/** Nytt inntak etter referanseprøven ved kronisk bruk: endringen ligger over ekstrem utskillelse. */
const overEkstrem = (s: BeUrinProfilsammenligning) => over(profilFor(s, 'ekstrem').grad)

/**
 * Om den samlede vurderingen er aktuell: vurderingen ved kronisk bruk er
 * uavklart mens endringen ligger over minst én av moderat og treg utskillelse.
 */
export function samletAktuell(s: BeUrinProfilsammenligning): boolean {
  return !overEkstrem(s) && (over(profilFor(s, 'moderat').grad) || over(profilFor(s, 'treg').grad))
}

/**
 * Sammenligningen fra Q `fra` til Q `til` etter `dager` døgn med marginen.
 * `null` ved en numerisk feil: da gis ingen vurdering.
 */
export function sammenlignProfiler(
  m: GodkjentBeUrinProfilmodell,
  fra: number,
  til: number,
  dager: number,
  margin: number,
): BeUrinProfilsammenligning | null {
  const z = zFor(m, margin)
  if (z === undefined) throw new Error(`Sikkerhetsmarginen ${margin} finnes ikke i modellen.`)
  const maltRatio = til / fra
  const korrigert = korrigertRatio(m, maltRatio, margin)
  const logMalt = Math.log(til) - Math.log(fra)
  const logKorrigert = logMalt + z * logSd(m)
  if (!Number.isFinite(logKorrigert)) return null

  const terskler = new Map<BeUrinProfil, Terskel>()
  for (const p of m.profiler) {
    const t = p.type === 'mono' ? monoterskel(p, dager) : biterskel(p, fra, dager)
    if (!t) return null
    terskler.set(p, t)
  }
  const id = (navn: BeUrinProfil['id']) => m.profiler.find((p) => p.id === navn)!
  const [a, b] = [id('bi_a'), id('bi_b')]
  const likeBi = terskler.get(a)!.logTerskel === terskler.get(b)!.logTerskel
  const [ekstrem, treg] = likeBi || terskler.get(a)!.logTerskel > terskler.get(b)!.logTerskel ? [a, b] : [b, a]
  const roller: Record<BeUrinRolle, BeUrinProfil> = {
    enkeltinntak: id('enkeltinntak'),
    gjentatte_doser: id('gjentatte_doser'),
    moderat: id('moderat'),
    treg,
    ekstrem,
  }

  const profiler = BE_URIN_ROLLER.map((rolle): BeUrinProfilvurdering => {
    const profil = roller[rolle]
    const t = terskler.get(profil)!
    const terskel = Math.exp(t.logTerskel)
    return { rolle, profil, ...t, terskel, ...grader(korrigert, logKorrigert, terskel, t.logTerskel) }
  })
  const s = {
    fra,
    til,
    dager,
    margin,
    maltRatio,
    korrigertRatio: korrigert,
    logMalt,
    logKorrigert,
    profiler,
    likeBi,
  } as BeUrinProfilsammenligning
  s.sporadisk = sporadiskFor(s)
  s.kronisk = kroniskFor(s)
  return s
}

/* --- Fortolkningen ---------------------------------------------------------- */

/** Den samlede vurderingen med enda tidligere prøver. */
export interface BeUrinProfilsamlet {
  /** Hvor mange tidligere prøver som ble sammenlignet. */
  vurdert: number
  /** Den nyeste tidligere prøven endringen ligger over ekstrem utskillelse mot, eller `null`. */
  treff: (BeUrinLestProve & { sammenligning: BeUrinProfilsammenligning }) | null
}

export type BeUrinProfilresultat =
  | BeUrinMangler
  | {
      type: 'vurdering'
      forrige: BeUrinLestProve
      denne: BeUrinLestProve
      /** Mot forrige prøve: begge vurderingene, figuren og beregningen. */
      sammenligning: BeUrinProfilsammenligning
      /** Satt bare når det er lagt til tidligere prøver og den samlede vurderingen er aktuell ({@link samletAktuell}). */
      samlet: BeUrinProfilsamlet | null
    }

/**
 * Validerer inndataene og fortolker med en modell av form 2. Mangler noe,
 * eller er noe ugyldig, gis ingen vurdering og ingen graf ({@link BeUrinMangler}).
 */
export function fortolkBeUrinProfiler(inn: BeUrinInndata, m: GodkjentBeUrinProfilmodell): BeUrinProfilresultat {
  // Prøver fra samme dag sammenlignes ikke: tiden mellom dem er ukjent.
  const lest = lesBeUrinInndata(inn, m, { avvisSammeDag: true })
  if (lest.type === 'mangler') return lest
  const { forrige, denne, dager, tidligere } = lest
  const hoved = sammenlignProfiler(m, forrige.q, denne.q, dager, inn.sikkerhetsmargin)
  if (!hoved) return { type: 'mangler', feil: [NUMERISK_FEIL] }

  let samlet: BeUrinProfilsamlet | null = null
  if (tidligere.length > 0 && samletAktuell(hoved)) {
    let treff: BeUrinProfilsamlet['treff'] = null
    for (const p of tidligere) {
      const s = sammenlignProfiler(m, p.q, denne.q, p.dager, inn.sikkerhetsmargin)
      if (!s) return { type: 'mangler', feil: [NUMERISK_FEIL] }
      if (overEkstrem(s)) {
        treff = { q: p.q, dato: p.dato, sammenligning: s }
        break
      }
    }
    samlet = { vurdert: tidligere.length, treff }
  }

  return { type: 'vurdering', forrige, denne, sammenligning: hoved, samlet }
}

/* --- Mildere vurdering med høyere margin ------------------------------------ */

/** Et mildere utfall en høyere sikkerhetsmargin gir for én av vurderingene. */
export type BeUrinProfilMildere = {
  /** Marginene som gir det, stigende. Den første er den laveste. */
  marginer: number[]
} & (
  | { vurdering: 'sporadisk'; utfall: BeUrinSporadisk; samletDato: null }
  | {
      vurdering: 'kronisk'
      utfall: BeUrinKronisk
      /** ISO-datoen for den tidligere prøven når utfallet er indikasjon på nytt inntak etter den. */
      samletDato: string | null
    }
)

type Strenghet = readonly [number, number]

/** Hvor streng vurderingen ved sporadisk bruk er. */
function sporadiskStrenghet(r: Extract<BeUrinProfilresultat, { type: 'vurdering' }>): Strenghet {
  return [BE_URIN_SPORADISK.indexOf(r.sammenligning.sporadisk), 0]
}

/**
 * Hvor streng vurderingen ved kronisk bruk er, fra mildest: uavklart,
 * uavklart men uvanlig, indikasjon på nytt inntak etter en enda tidligere
 * prøve (mildere jo eldre prøven er), sannsynlig nytt inntak og nytt inntak.
 */
function kroniskStrenghet(r: Extract<BeUrinProfilresultat, { type: 'vurdering' }>): Strenghet {
  const treff = r.samlet?.treff
  if (treff) return [BE_URIN_KRONISK.indexOf('sannsynlig') - 0.5, -treff.sammenligning.dager]
  return [BE_URIN_KRONISK.indexOf(r.sammenligning.kronisk), 0]
}

const mildere = (a: Strenghet, b: Strenghet) => a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

/**
 * Hvert mildere utfall en høyere margin i modellen enn den valgte gir, for
 * hver av de to vurderingene, med marginene som gir det. Lavere marginer
 * prøves aldri, og valgt margin endres ikke. Tomt uten en vurdering.
 */
export function mildereProfilutfall(
  inn: BeUrinInndata,
  m: GodkjentBeUrinProfilmodell,
  resultat: BeUrinProfilresultat = fortolkBeUrinProfiler(inn, m),
): BeUrinProfilMildere[] {
  if (resultat.type !== 'vurdering') return []
  const valgt = { sporadisk: sporadiskStrenghet(resultat), kronisk: kroniskStrenghet(resultat) }
  const utfall = new Map<string, BeUrinProfilMildere>()
  const legg = (nokkel: string, margin: number, nytt: () => BeUrinProfilMildere) => {
    const funnet = utfall.get(nokkel)
    if (funnet) funnet.marginer.push(margin)
    else utfall.set(nokkel, nytt())
  }
  for (const { margin } of m.sikkerhetsmarginer) {
    if (!(margin > inn.sikkerhetsmargin)) continue
    const alt = fortolkBeUrinProfiler({ ...inn, sikkerhetsmargin: margin }, m)
    if (alt.type !== 'vurdering') continue
    const sporadisk = sporadiskStrenghet(alt)
    if (mildere(sporadisk, valgt.sporadisk)) {
      const u = alt.sammenligning.sporadisk
      legg(`sporadisk|${u}`, margin, () => ({ vurdering: 'sporadisk', utfall: u, samletDato: null, marginer: [margin] }))
    }
    if (mildere(kroniskStrenghet(alt), valgt.kronisk)) {
      const u = alt.sammenligning.kronisk
      const samletDato = alt.samlet?.treff?.dato ?? null
      legg(`kronisk|${u}|${samletDato ?? ''}`, margin, () => ({ vurdering: 'kronisk', utfall: u, samletDato, marginer: [margin] }))
    }
  }
  return [...utfall.values()]
}

/* --- Punktene i figuren ------------------------------------------------------ */

/** Denne prøven med én margin. */
export interface BeUrinProfilMarginpunkt {
  margin: number
  korrigertRatio: number
}

/** Denne prøven med hver margin, regnet med motorens egen korreksjon. */
export function profilMarginpunkter(
  m: BeUrinFellesmodell,
  s: Pick<BeUrinProfilsammenligning, 'maltRatio'>,
  marginer: readonly number[],
): BeUrinProfilMarginpunkt[] {
  return marginer.map((margin) => ({ margin, korrigertRatio: korrigertRatio(m, s.maltRatio, margin) }))
}
