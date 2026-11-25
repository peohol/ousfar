import { tidForVerdi, verdiPaaKurve } from './thcKurver'
import { INGEN_SIKKERHETSMARGIN } from './thcRegelsett'
import { dagerMellom, lesTall } from './thcTall'
import type { BeUrinFellesmodell, BeUrinKurve, BeUrinModell, GodkjentBeUrinModell } from './beUrinModell'

/**
 * Fortolkningsmotoren for benzoylekgonin i urin (`docs/benzoylekgonin-urin.md`).
 * Vesentlig enklere enn THC-syremotoren: ingen kommentar, ingen nivåer, ingen
 * bruksmønstre og ingen regler for kort tid.
 *
 * 1. Q = kvotientfaktor · benzoylekgonin / kreatinin for begge prøvene.
 * 2. For hver profil: t er tidspunktet der profilen står på Q i forrige
 *    prøve, og terskelen R = C(t + d) / Q_forrige etter d døgn. t er et
 *    matematisk punkt på kurven, ikke tiden siden inntak.
 * 3. Den målte ratioen Q_denne / Q_forrige korrigeres for måleusikkerheten:
 *    · exp(z · √(2 · (CV_BE² + CV_kreatinin²))), z = Φ⁻¹(1 − margin).
 * 4. Antall profiler den korrigerte ratioen ligger strengt over, avgjør
 *    konklusjonen: 0, 1 eller 2. Hvilken profil som er strengest, varierer
 *    med Q og tid, så ingen rekkefølge forutsettes.
 *
 * Alt klinisk står i modellen ({@link BeUrinModell}); her står bare
 * fremgangsmåten. Ratioene sammenlignes direkte, med full presisjon.
 */

/** Konklusjonene, fra mildest. Indeksen er antall profiler den korrigerte ratioen ligger over. */
export const BE_URIN_KONKLUSJONER = ['ikke_nodvendigvis', 'kan_ikke_fastslaas', 'nytt_inntak'] as const
export type BeUrinKonklusjon = (typeof BE_URIN_KONKLUSJONER)[number]

/* --- Inndataene ------------------------------------------------------------ */

/** En prøve slik den tastes. */
export interface BeUrinProve {
  benzoylekgonin: string
  kreatinin: string
  /** ISO-dato fra datofeltet: «2026-07-04». */
  dato: string
}

export interface BeUrinInndata {
  forrige: BeUrinProve
  denne: BeUrinProve
  sikkerhetsmargin: number
  /**
   * Prøvene før forrige prøve, til den samlede vurderingen. Den er med så
   * snart det er lagt til en tidligere prøve, og bare da.
   */
  tidligere: BeUrinProve[]
}

/** Feltene i en prøve. */
export type BeUrinFelt = keyof BeUrinProve

export function tomBeUrinProve(): BeUrinProve {
  return { benzoylekgonin: '', kreatinin: '', dato: '' }
}

/** Et tomt skjema, med modellens standardmargin. */
export function tomBeUrinInndata(m: BeUrinFellesmodell): BeUrinInndata {
  return {
    forrige: tomBeUrinProve(),
    denne: tomBeUrinProve(),
    sikkerhetsmargin: m.standard_sikkerhetsmargin,
    tidligere: [],
  }
}

/** Sant for en ekte kalenderdato på formen datofeltet gir. */
export function erGyldigDato(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false
  const tid = Date.parse(iso)
  return Number.isFinite(tid) && new Date(tid).toISOString().slice(0, 10) === iso
}

/**
 * Det som er galt med verdien i ett felt, kort, til å stå ved feltet; `null`
 * når feltet er tomt eller gyldig. Et tomt felt er ikke en feil: skjemaet er
 * bare ikke ferdig utfylt.
 */
export function feltfeil(prove: BeUrinProve, felt: BeUrinFelt): string | null {
  const verdi = prove[felt]
  if (verdi.trim() === '') return null
  if (felt === 'dato') return erGyldigDato(verdi) ? null : 'Ugyldig dato.'
  const tall = lesTall(verdi)
  if (tall === null) return 'Må være et tall.'
  if (tall > 0) return null
  // 0, ikke påvist og under kvantifiseringsgrensen kan modellen ikke vurdere.
  return felt === 'benzoylekgonin' ? 'Må være kvantifisert og over 0.' : 'Må være over 0.'
}

/** Q for en prøve, eller `null` når feltene ikke gir en kvantifisert, positiv kvotient. */
export function kvotient(prove: BeUrinProve, m: BeUrinFellesmodell): number | null {
  const b = lesTall(prove.benzoylekgonin)
  const k = lesTall(prove.kreatinin)
  if (b === null || !(b > 0) || k === null || !(k > 0)) return null
  const q = (m.kvotientfaktor * b) / k
  return Number.isFinite(q) && q > 0 ? q : null
}

/* --- Sammenligningen ------------------------------------------------------- */

/** log-standardavviket for ratioen mellom to prøver: √(2 · (CV_BE² + CV_kreatinin²)). */
export function logSd(m: BeUrinFellesmodell): number {
  const { cv_benzoylekgonin, cv_kreatinin } = m.maleusikkerhet
  return Math.sqrt(2 * (cv_benzoylekgonin ** 2 + cv_kreatinin ** 2))
}

/**
 * z for marginen: modellens, eller 0 for «Ingen (50 %)» også når modellen
 * ikke har den (bare figuren bruker det). `undefined` for en ukjent margin.
 */
export function zFor(m: BeUrinFellesmodell, margin: number): number | undefined {
  const z = m.sikkerhetsmarginer.find((s) => s.margin === margin)?.z
  return z ?? (margin === INGEN_SIKKERHETSMARGIN ? 0 : undefined)
}

/** Den målte ratioen korrigert med marginen: R_målt · exp(z · logSD). */
export function korrigertRatio(m: BeUrinFellesmodell, maltRatio: number, margin: number): number {
  const z = zFor(m, margin)
  // En ukjent margin ville gitt NaN, og NaN ligger aldri over noen profil:
  // en stille konklusjon. Fortolkningen avviser den før dette.
  if (z === undefined) throw new Error(`Sikkerhetsmarginen ${margin} finnes ikke i modellen.`)
  return maltRatio * Math.exp(z * logSd(m))
}

/** Én profil lest av for en referanseprøve og et tidsrom. */
export interface BeUrinProfilterskel {
  navn: string
  /** Punktet på profilen der referanseprøven står (døgn). Matematisk, ikke tiden siden inntak. */
  tidspunkt: number
  /** Terskelen R = C(t + d) / Q_referanse. 1 når d = 0. */
  terskel: number
  /** Sant når referanseprøven ligger over profilens startverdi C(0) (t < 0): matematisk ekstrapolasjon. */
  ekstrapolert: boolean
}

/** Hvor nær C(t) må ligge Q for at tidspunktet regnes som funnet. */
const TIDSPUNKT_TOLERANSE = 1e-9

/**
 * Profilen lest av fra `q` og `dager` døgn fram. `null` når tidspunktet ikke
 * lar seg finne med full presisjon (en kvotient så liten eller stor at
 * profilen ikke rekker dit innenfor søket).
 */
export function profilterskel(kurve: BeUrinKurve, q: number, dager: number): BeUrinProfilterskel | null {
  const tidspunkt = tidForVerdi(q, kurve)
  if (!Number.isFinite(tidspunkt) || !(Math.abs(verdiPaaKurve(tidspunkt, kurve) / q - 1) <= TIDSPUNKT_TOLERANSE)) return null
  // Samme dato: ingen tid er regnet, og terskelen er nøyaktig 1, ikke det
  // binærsøket ville gitt av avrunding.
  const terskel = dager === 0 ? 1 : verdiPaaKurve(tidspunkt + dager, kurve) / q
  if (!(Number.isFinite(terskel) && terskel > 0)) return null
  return { navn: kurve.navn, tidspunkt, terskel, ekstrapolert: q > verdiPaaKurve(0, kurve) }
}

/** Konklusjonen for en korrigert ratio mot tersklene: antall terskler den ligger strengt over. */
export function konklusjonFor(korrigert: number, terskler: readonly number[]): BeUrinKonklusjon {
  const over = terskler.filter((t) => korrigert > t).length
  return BE_URIN_KONKLUSJONER[Math.min(over, BE_URIN_KONKLUSJONER.length - 1)]!
}

/** En sammenligning av denne prøven med en referanseprøve. */
export interface BeUrinSammenligning {
  /** Q i referanseprøven (forrige eller en enda tidligere prøve). */
  fra: number
  /** Q i denne prøven. */
  til: number
  dager: number
  margin: number
  maltRatio: number
  korrigertRatio: number
  profiler: [BeUrinProfilterskel, BeUrinProfilterskel]
  konklusjon: BeUrinKonklusjon
}

/**
 * Sammenligningen fra Q `fra` til Q `til` etter `dager` døgn med marginen.
 * `null` ved en numerisk feil: da gis ingen konklusjon.
 */
export function sammenlign(
  m: GodkjentBeUrinModell,
  fra: number,
  til: number,
  dager: number,
  margin: number,
): BeUrinSammenligning | null {
  const [a, b] = m.kurver.map((k) => profilterskel(k, fra, dager))
  if (!a || !b) return null
  const maltRatio = til / fra
  const korrigert = korrigertRatio(m, maltRatio, margin)
  if (!(Number.isFinite(maltRatio) && Number.isFinite(korrigert))) return null
  return {
    fra,
    til,
    dager,
    margin,
    maltRatio,
    korrigertRatio: korrigert,
    profiler: [a, b],
    konklusjon: konklusjonFor(korrigert, [a.terskel, b.terskel]),
  }
}

/* --- Fortolkningen --------------------------------------------------------- */

/** En prøve slik fortolkningen har lest den. */
export interface BeUrinLestProve {
  q: number
  /** ISO-dato. */
  dato: string
}

/** Den samlede vurderingen med enda tidligere prøver. */
export interface BeUrinSamlet {
  /** Hvor mange tidligere prøver som ble sammenlignet. */
  vurdert: number
  /** Den nærmeste tidligere prøven denne prøven overskrider begge profilene mot, eller `null`. */
  treff: (BeUrinLestProve & { sammenligning: BeUrinSammenligning }) | null
}

export type BeUrinResultat =
  | BeUrinMangler
  | {
      type: 'vurdering'
      forrige: BeUrinLestProve
      denne: BeUrinLestProve
      /** Mot forrige prøve. Hovedkonklusjonen, grafen og tallgrunnlaget. */
      sammenligning: BeUrinSammenligning
      /** Prøvene har samme dato: d = 0, og tiden innen døgnet er ukjent. */
      sammeDag: boolean
      /** Satt bare når hovedsammenligningen gir «kan ikke fastslås» og den samlede vurderingen er slått på. */
      samlet: BeUrinSamlet | null
    }

/** Navnet en tidligere prøve har i meldingene og i skjemaet. */
export function tidligereNavn(antall: number, i: number): string {
  return antall === 1 ? 'Tidligere prøve' : `Tidligere prøve ${i + 1}`
}

/**
 * Når ingen vurdering kan gis. `feil` er det som er galt utover det enkelte
 * feltet (rekkefølgen på datoene, samme dag, en kvotient som ikke lar seg
 * regne ut, en numerisk feil), kort, til å stå der vurderingen ellers står.
 * Tomme felt gir ingen melding, og et ugyldig felt sies ved feltet
 * ({@link feltfeil}): tom `feil` betyr at skjemaet ikke er ferdig utfylt.
 */
export interface BeUrinMangler {
  type: 'mangler'
  feil: string[]
}

const smaa = (tekst: string) => tekst.charAt(0).toLowerCase() + tekst.slice(1)

/**
 * Leser en prøve. `null` når et felt er tomt eller ugyldig; en kvotient som
 * ikke lar seg regne ut av gyldige tall, legges til `feil`.
 */
function lesProve(prove: BeUrinProve, navn: string, m: BeUrinFellesmodell, feil: string[]): BeUrinLestProve | null {
  const felt: BeUrinFelt[] = ['benzoylekgonin', 'kreatinin', 'dato']
  if (felt.some((f) => prove[f].trim() === '' || feltfeil(prove, f) !== null)) return null
  const q = kvotient(prove, m)
  if (q === null) {
    feil.push(`Kvotienten for ${smaa(navn)} lar seg ikke regne ut.`)
    return null
  }
  return { q, dato: prove.dato }
}

/** Meldingen når tersklene ikke lar seg regne ut for verdiene. */
export const NUMERISK_FEIL = 'Modellen kan ikke regne ut en vurdering for disse verdiene. Kontroller tallene.'

/** Meldingen når modellformen ikke sammenligner prøver fra samme dag. */
export const SAMME_DAG_FEIL = 'Prøver fra samme dag kan ikke sammenlignes. Bruk en forrige prøve fra en tidligere dag.'

/** Hvordan en modellform leser inndataene. */
export interface BeUrinLeseregler {
  /** Prøver fra samme dag sammenlignes ikke: da gis bare {@link SAMME_DAG_FEIL}. */
  avvisSammeDag?: boolean
}

/** Inndataene slik begge modellformene leser dem: det som mangler, eller prøvene. */
export type BeUrinLesteInndata =
  | BeUrinMangler
  | {
      type: 'lest'
      forrige: BeUrinLestProve
      denne: BeUrinLestProve
      /** Kalenderdøgn fra forrige prøve til denne. */
      dager: number
      /** De tidligere prøvene i den samlede vurderingen, nyeste først, med døgnene til denne prøven. Tom uten tidligere prøver. */
      tidligere: (BeUrinLestProve & { dager: number })[]
    }

/**
 * Validerer inndataene: prøvene, datoene, de tidligere prøvene og marginen.
 * Er et felt tomt eller ugyldig, eller noe annet galt, gis ingen prøver,
 * bare {@link BeUrinMangler}.
 */
export function lesBeUrinInndata(
  inn: BeUrinInndata,
  m: BeUrinFellesmodell,
  regler: BeUrinLeseregler = {},
): BeUrinLesteInndata {
  const feil: string[] = []
  const forrige = lesProve(inn.forrige, 'Forrige prøve', m, feil)
  const denne = lesProve(inn.denne, 'Denne prøven', m, feil)
  const mellom = forrige && denne ? dagerMellom(forrige.dato, denne.dato) : null
  if (mellom !== null && mellom < 0) feil.push('Denne prøven kan ikke være tatt før forrige prøve.')
  else if (mellom === 0 && regler.avvisSammeDag) feil.push(SAMME_DAG_FEIL)

  const { tidligere } = inn
  let utfylt = forrige !== null && denne !== null
  const tidligereLest = tidligere.map((prove, i) => {
    const navn = tidligereNavn(tidligere.length, i)
    const lest = lesProve(prove, navn, m, feil)
    if (!lest) utfylt = false
    else if (forrige && !(dagerMellom(lest.dato, forrige.dato) > 0)) feil.push(`${navn} må være tatt før forrige prøve.`)
    return lest
  })

  // Marginen kommer fra skjemaet, som kan leve lenger enn modellen det ble
  // fylt ut mot. En margin modellen ikke har, gir aldri en konklusjon.
  if (!m.sikkerhetsmarginer.some((s) => s.margin === inn.sikkerhetsmargin)) {
    feil.push('Sikkerhetsmarginen finnes ikke i modellen. Velg en av marginene som tilbys.')
  }

  if (feil.length > 0 || !utfylt || !forrige || !denne) return { type: 'mangler', feil }
  return {
    type: 'lest',
    forrige,
    denne,
    dager: mellom!,
    tidligere: (tidligereLest as BeUrinLestProve[])
      .map((p) => ({ ...p, dager: dagerMellom(p.dato, denne.dato) }))
      .sort((a, b) => a.dager - b.dager),
  }
}

/**
 * Validerer inndataene og fortolker med en modell av form 1. Mangler noe,
 * eller er noe ugyldig, gis ingen konklusjon og ingen graf: bare det som mangler.
 */
export function fortolkBeUrin(inn: BeUrinInndata, m: GodkjentBeUrinModell): BeUrinResultat {
  const lest = lesBeUrinInndata(inn, m)
  if (lest.type === 'mangler') return lest
  const { forrige, denne, dager, tidligere } = lest
  const hoved = sammenlign(m, forrige.q, denne.q, dager, inn.sikkerhetsmargin)
  if (!hoved) return { type: 'mangler', feil: [NUMERISK_FEIL] }

  let samlet: BeUrinSamlet | null = null
  if (hoved.konklusjon === 'kan_ikke_fastslaas' && tidligere.length > 0) {
    let treff: BeUrinSamlet['treff'] = null
    for (const p of tidligere) {
      const s = sammenlign(m, p.q, denne.q, p.dager, inn.sikkerhetsmargin)
      if (!s) return { type: 'mangler', feil: [NUMERISK_FEIL] }
      if (s.konklusjon === 'nytt_inntak') {
        treff = { q: p.q, dato: p.dato, sammenligning: s }
        break
      }
    }
    samlet = { vurdert: tidligere.length, treff }
  }

  return { type: 'vurdering', forrige, denne, sammenligning: hoved, sammeDag: dager === 0, samlet }
}

/* --- Mildere konklusjon med høyere margin ------------------------------------ */

/**
 * Hvor streng konklusjonen er: høyere er strengere. Nytt inntak etter en enda
 * tidligere prøve ligger mellom «kan ikke fastslås» og nytt inntak, og er
 * mildere jo eldre prøven er, siden inntaket da kan ha skjedd før forrige
 * prøve. `null` uten en vurdering.
 */
function strenghet(r: BeUrinResultat): readonly [number, number] | null {
  if (r.type !== 'vurdering') return null
  const trinn = BE_URIN_KONKLUSJONER.indexOf(r.sammenligning.konklusjon)
  const treff = r.samlet?.treff
  return treff ? [trinn + 0.5, -treff.sammenligning.dager] : [trinn, 0]
}

function mildere(a: readonly [number, number], b: readonly [number, number]): boolean {
  return a[0] - b[0] < 0 || (a[0] === b[0] && a[1] - b[1] < 0)
}

/** Et mildere utfall en høyere sikkerhetsmargin gir. */
export interface BeUrinMildereUtfall {
  /** Marginene som gir det, stigende. Den første er den laveste. */
  marginer: number[]
  konklusjon: BeUrinKonklusjon
  /** ISO-datoen for den tidligere prøven når utfallet er nytt inntak etter en enda tidligere prøve. */
  samletDato: string | null
}

/**
 * Hver mildere konklusjon en høyere margin i modellen enn den valgte gir, med
 * marginene som gir den. Lavere marginer prøves aldri, og valgt margin endres
 * ikke. Tomt uten en vurdering.
 */
export function mildereVedHoyereMargin(
  inn: BeUrinInndata,
  m: GodkjentBeUrinModell,
  resultat: BeUrinResultat = fortolkBeUrin(inn, m),
): BeUrinMildereUtfall[] {
  const valgt = strenghet(resultat)
  if (valgt === null) return []
  const utfall = new Map<string, BeUrinMildereUtfall>()
  for (const { margin } of m.sikkerhetsmarginer) {
    if (!(margin > inn.sikkerhetsmargin)) continue
    const alternativ = fortolkBeUrin({ ...inn, sikkerhetsmargin: margin }, m)
    const grad = strenghet(alternativ)
    if (alternativ.type !== 'vurdering' || grad === null || !mildere(grad, valgt)) continue
    const samletDato = alternativ.samlet?.treff?.dato ?? null
    const nokkel = `${alternativ.sammenligning.konklusjon}|${samletDato ?? ''}`
    const funnet = utfall.get(nokkel)
    if (funnet) funnet.marginer.push(margin)
    else utfall.set(nokkel, { marginer: [margin], konklusjon: alternativ.sammenligning.konklusjon, samletDato })
  }
  return [...utfall.values()]
}

/* --- Punktene i figuren ------------------------------------------------------ */

/** Denne prøven med én margin: den korrigerte ratioen og konklusjonen mot forrige prøves terskler. */
export interface BeUrinMarginpunkt {
  margin: number
  korrigertRatio: number
  konklusjon: BeUrinKonklusjon
}

/**
 * Marginene figuren viser: den valgte, eller alle modellens med «Ingen (50 %)»
 * i tillegg når modellen ikke har den. Stigende.
 */
export function visningsmarginer(m: BeUrinFellesmodell, valgt: number, alle: boolean): number[] {
  if (!alle) return [valgt]
  const marginer = m.sikkerhetsmarginer.map((s) => s.margin)
  if (!marginer.includes(INGEN_SIKKERHETSMARGIN)) marginer.push(INGEN_SIKKERHETSMARGIN)
  return marginer.sort((a, b) => a - b)
}

/** Denne prøven med hver margin, regnet med motorens egne funksjoner mot de samme tersklene. */
export function marginpunkter(m: BeUrinModell, s: BeUrinSammenligning, marginer: readonly number[]): BeUrinMarginpunkt[] {
  const terskler = s.profiler.map((p) => p.terskel)
  return marginer.map((margin) => {
    const korrigert = korrigertRatio(m, s.maltRatio, margin)
    return { margin, korrigertRatio: korrigert, konklusjon: konklusjonFor(korrigert, terskler) }
  })
}
