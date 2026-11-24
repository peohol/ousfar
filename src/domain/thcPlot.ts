import { penYAkse, velgXSteg } from './figurakser'
import { forventetEndring, tidForVerdi, verdiPaaKurve, type Kurve } from './thcKurver'
import {
  erUtenMargin,
  konklusjon,
  korrigertEndring,
  type ThcGrafgrunnlag,
  type ThcGrunnlag,
  type ThcKonklusjon,
} from './thcMotor'
import {
  INGEN_SIKKERHETSMARGIN,
  THC_KURVEROLLER,
  kurverI,
  type ThcKurverolle,
  type ThcRegelsett,
} from './thcRegelsett'

/**
 * Tallgrunnlaget for visualiseringen av en fortolkning mot forrige prøve —
 * samme figur som i regnearkets Fortolkning-ark: tre utskillelseskurver som
 * prosentvis endring fra forrige prøve, med de to prøvene som punkter.
 * Komponenten som tegner får ferdige tall og trenger ikke regne selv.
 */

/**
 * En kurve slik figuren tegner den. Fargen følger rollen kurven har i
 * konklusjonen.
 */
export interface Figurkurve {
  navn: string
  tone: ThcKurverolle
  kurve: Kurve
}

/**
 * Kurvene i figuren — de samme tre som konklusjonsgrensene leses av, med
 * navnene fra regelsettet. Merk at dette er ett skritt bort fra regnearkets
 * egen graf, som tegner mellomkurven «Kronisk, typisk» (den lilla) i stedet
 * for den gule. Den lilla kurven er ikke med i konklusjonen, så figuren viste
 * en kurve kommentaren aldri leste av — og utelot den som avgjør. Figuren
 * skal speile fortolkningen.
 */
export function figurkurver(r: ThcRegelsett): Figurkurve[] {
  const kurver = kurverI(r)
  return THC_KURVEROLLER.map((rolle) => ({ navn: r.kurver[rolle].navn, tone: rolle, kurve: kurver[rolle] }))
}

/** Punkter per kurve. Nok til at også den bratteste starten står jevn. */
const OPPLOSNING = 160

export interface Kurvespor {
  navn: string
  tone: ThcKurverolle
  /** Prosentvis endring per tidspunkt, fra dag 0 til siste dag. */
  punkter: { dag: number; prosent: number }[]
}

export interface Grafpunkt {
  navn: string
  dag: number
  prosent: number
}

export interface Graf {
  /** Siste dag på x-aksen — antall døgn mellom prøvene. */
  xMaks: number
  xSteg: number
  /** Y-aksen i prosent, med runde tall i begge ender. */
  yTopp: number
  yBunn: number
  ySteg: number
  kurver: Kurvespor[]
  punkter: Grafpunkt[]
}

/**
 * Bygger hele figuren fra fortolkningens grafgrunnlag. `denne` er punktene
 * for denne prøven y-aksen skal romme, i prosent — som standard bare den
 * korrigerte endringen, og alle marginenes når figuren viser dem
 * ({@link marginpunkter}).
 */
export function byggGraf(
  { forrige, dager, korrigertEndring }: ThcGrafgrunnlag,
  figur: Figurkurve[],
  denne: readonly number[] = [korrigertEndring * 100],
): Graf {
  const korrigertProsent = korrigertEndring * 100

  const kurver: Kurvespor[] = figur.map(({ navn, tone, kurve }) => {
    // Kurven leses av fra der forrige prøve ligger på den, som i regnearkets
    // graftabell — ett oppslag her i stedet for ett per punkt.
    const start = tidForVerdi(forrige, kurve)
    const punkter = []
    for (let i = 0; i <= OPPLOSNING; i++) {
      const dag = (dager * i) / OPPLOSNING
      punkter.push({ dag, prosent: (verdiPaaKurve(start + dag, kurve) / forrige - 1) * 100 })
    }
    return { navn, tone, punkter }
  })

  // Grønn kurve faller brattest og setter bunnen, om ikke prøvepunktet gjør det.
  const gronn = figur.find((k) => k.tone === 'gronn')?.kurve ?? figur[0]!.kurve
  const gronnSlutt = forventetEndring(forrige, dager, gronn) * 100
  const { yTopp, yBunn, ySteg } = penYAkse(Math.min(gronnSlutt, ...denne), Math.max(0, ...denne))

  return {
    xMaks: dager,
    xSteg: velgXSteg(dager),
    yTopp,
    yBunn,
    ySteg,
    kurver,
    punkter: [
      { navn: 'Forrige prøve', dag: 0, prosent: 0 },
      { navn: 'Denne prøven', dag: dager, prosent: korrigertProsent },
    ],
  }
}

/* --- Terskelkurvene og punktene for denne prøven ------------------------------ */

/**
 * Funksjonen en kurve har i konklusjonen for bruksmønsteret: den nedre
 * terskelen skiller «ikke nødvendigvis nytt» fra «kan ikke fastslås», den
 * øvre «kan ikke fastslås» fra nytt inntak, og en ubrukt kurve leses ikke av.
 * Figuren farger kurvene etter dette, ikke etter hvilken kurve det er.
 */
export type ThcTerskel = 'nedre' | 'ovre' | 'ubrukt'

/** Terskelen hver kurve er for bruksmønsteret, lest av regelsettet. */
export function terskler(r: ThcRegelsett, kronisk: boolean): Record<ThcKurverolle, ThcTerskel> {
  const monster = kronisk ? r.bruksmonstre.kronisk : r.bruksmonstre.ikke_kronisk
  const terskel = (rolle: ThcKurverolle): ThcTerskel =>
    rolle === monster.vanskelig_over ? 'nedre' : rolle === monster.nytt_inntak_over ? 'ovre' : 'ubrukt'
  return Object.fromEntries(THC_KURVEROLLER.map((rolle) => [rolle, terskel(rolle)])) as Record<
    ThcKurverolle,
    ThcTerskel
  >
}

/**
 * Hvordan figuren viser denne prøven: med den valgte sikkerhetsmarginen eller
 * med alle. Valget følger brukeren, i nettleseren og på kontoen.
 */
export type ThcVisning = 'valgt' | 'alle'

/** Nøkkelen for visningen i nettleserens minne og i brukerinnstillingene. */
export const THC_VISNING = { lagring: 'far:thc-visualisering', konto: 'thc_visualisering' } as const

/** Visningen slik den er lagret, eller `null` når den ikke er gyldig. */
export function lesThcVisning(verdi: unknown): ThcVisning | null {
  return verdi === 'valgt' || verdi === 'alle' ? verdi : null
}

/** Konklusjonene et punkt for denne prøven kan ha mot forrige prøve. */
export type ThcPunktutfall = Exclude<ThcKonklusjon, 'uten_forrige'>

/** Et punkt for denne prøven: endringen med én sikkerhetsmargin, og hvor den ligger mot tersklene. */
export interface Marginpunkt {
  margin: number
  /** Endringen som sammenlignes med kurvene, i prosent. */
  prosent: number
  utfall: ThcPunktutfall
}

/**
 * Marginene figuren viser denne prøven med: den valgte, eller alle
 * regelsettets — med «Ingen (50 %)» i tillegg når regelsettet ikke har den.
 * Stigende.
 */
export function visningsmarginer(r: ThcRegelsett, valgt: number, alle: boolean): number[] {
  if (!alle) return [valgt]
  const marginer = r.sikkerhetsmarginer.map((m) => m.margin)
  if (!marginer.includes(INGEN_SIKKERHETSMARGIN)) marginer.push(INGEN_SIKKERHETSMARGIN)
  return marginer.sort((a, b) => a - b)
}

/**
 * Denne prøven med hver av marginene: endringen fortolkningen ville
 * sammenlignet med kurvene, og konklusjonen den gir mot forrige prøve — med
 * motorens egne funksjoner, så punktene står der fortolkningen leser dem.
 * «Ingen» uten å være i regelsettet er den målte endringen (z = 0).
 */
export function marginpunkter(r: ThcRegelsett, g: ThcGrunnlag, marginer: readonly number[]): Marginpunkt[] {
  const usikkerhet = g.underCutoff ? r.maleusikkerhet.faktor_under_cutoff : 1
  return marginer.map((margin) => {
    const iRegelsettet = r.sikkerhetsmarginer.some((m) => m.margin === margin)
    const endring =
      !iRegelsettet && erUtenMargin(margin)
        ? g.maltEndring
        : korrigertEndring(r, g.forrige, g.aktuell, margin, usikkerhet)
    const utfall = konklusjon(r, g.kronisk, endring, g.forventet) as ThcPunktutfall
    return { margin, prosent: endring * 100, utfall }
  })
}

/** «−45 %», «0 %», «+12 %» — med ekte minustegn, som ellers i appen. */
export function formaterProsent(verdi: number): string {
  const rundet = Math.round(verdi)
  const fortegn = rundet > 0 ? '+' : rundet < 0 ? '−' : ''
  return `${fortegn}${Math.abs(rundet)} %`
}
