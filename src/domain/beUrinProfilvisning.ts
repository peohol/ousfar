import type { BeUrinGrad, BeUrinKronisk, BeUrinProfilsamlet, BeUrinRolle, BeUrinSporadisk } from './beUrinProfiler'
import { formaterRatio } from './beUrinVisning'
import { formaterDatoNorsk } from './thcTall'
import { INGEN_SIKKERHETSMARGIN } from './thcRegelsett'
import { somProsent } from './thcVisning'

/**
 * Det modulen skriver om fortolkningen med fem utskillelsesprofiler
 * (modellform 2, #570). Ordlyden er bestillingens. Modulen er intern
 * beslutningsstøtte: tekstene står i resultatet og kopieres ikke.
 */

/** Navnet hver profil har i figuren, legenden og beregningen. */
export const BE_URIN_ROLLENAVN: Record<BeUrinRolle, string> = {
  enkeltinntak: 'Utskillelse etter enkeltinntak',
  gjentatte_doser: 'Utskillelse etter gjentatte doser innenfor et kort tidsrom',
  moderat: 'Moderat utskillelse',
  treg: 'Treg utskillelse',
  ekstrem: 'Ekstrem utskillelse',
}

/** Det endringen sammenlignes med for hver profil, etter graden: «over det som kan ses etter et enkeltinntak». */
export const BE_URIN_SAMMENLIGNINGSGRUNNLAG: Record<BeUrinRolle, string> = {
  enkeltinntak: 'det som kan ses etter et enkeltinntak',
  gjentatte_doser: 'det som forventes etter gjentatte doser innenfor et kort tidsrom',
  moderat: 'det som kan ses ved moderat utskillelse',
  treg: 'det som kan ses ved treg utskillelse',
  ekstrem: 'det som kan ses ved ekstrem utskillelse',
}

export const BE_URIN_GRADTEKST: Record<BeUrinGrad, string> = {
  under: 'under',
  paa_nivaa: 'på nivå med',
  over: 'over',
  langt_over: 'langt over',
  svaert_langt_over: 'svært langt over',
}

/** «over det som kan ses etter et enkeltinntak». */
export const gradsetning = (grad: BeUrinGrad, rolle: BeUrinRolle) =>
  `${BE_URIN_GRADTEKST[grad]} ${BE_URIN_SAMMENLIGNINGSGRUNNLAG[rolle]}`

/** Innledningen til gradene for hver vurdering. */
export const BE_URIN_INNLEDNING = {
  sporadisk: 'Sammenlignet med det som kan ses ved sporadisk bruk, ligger endringen mellom denne prøven og forrige prøve',
  kronisk: 'Sammenlignet med det som kan ses ved kronisk bruk, ligger endringen',
} as const

/** Overskriftene på de to kortene. */
export const BE_URIN_KORTTITTEL = {
  sporadisk: 'Sporadisk bruk lagt til grunn',
  kronisk: 'Kronisk bruk lagt til grunn',
} as const

const SANNSYNLIG = 'Det er sannsynlig at et nytt inntak har skjedd.'
const SVAERT_SANNSYNLIG = 'Det er svært sannsynlig at et nytt inntak har skjedd.'
const UAVKLART = 'Det kan ikke fastslås om et nytt inntak har skjedd basert på analyseresultatene alene.'

/** Vurderingen på kortet for sporadisk bruk. */
export const BE_URIN_SPORADISK_TEKST: Record<BeUrinSporadisk, string> = {
  forenlig_enkeltinntak:
    'Endringen er forenlig med utskillelse etter et enkeltinntak. Et nytt inntak kan ikke fastslås.',
  forenlig_gjentatte_doser:
    'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom. Et nytt inntak kan ikke fastslås.',
  sannsynlig: SANNSYNLIG,
  svaert_sannsynlig: SVAERT_SANNSYNLIG,
}

/** Vurderingen på kortet for kronisk bruk. */
export const BE_URIN_KRONISK_TEKST: Record<BeUrinKronisk, string> = {
  uavklart: UAVKLART,
  uavklart_uvanlig: `${UAVKLART} Det bemerkes likevel at en såpass ekstrem utskillelse anses svært uvanlig.`,
  sannsynlig: SANNSYNLIG,
  svaert_sannsynlig: SVAERT_SANNSYNLIG,
}

/** Vurderingene kort, midt i en setning, til banneret om høyere margin. */
const SPORADISK_KORT: Record<BeUrinSporadisk, string> = {
  forenlig_enkeltinntak: 'forenlig med utskillelse etter et enkeltinntak',
  forenlig_gjentatte_doser: 'forenlig med utskillelse etter gjentatte doser',
  sannsynlig: 'sannsynlig nytt inntak',
  svaert_sannsynlig: 'svært sannsynlig nytt inntak',
}
const KRONISK_KORT: Record<BeUrinKronisk, string> = {
  uavklart: 'kan ikke fastslås',
  uavklart_uvanlig: 'kan ikke fastslås, men svært uvanlig utskillelse',
  sannsynlig: 'sannsynlig nytt inntak',
  svaert_sannsynlig: 'svært sannsynlig nytt inntak',
}

const VURDERINGEN = {
  sporadisk: 'vurderingen når sporadisk bruk legges til grunn',
  kronisk: 'vurderingen når kronisk bruk legges til grunn',
} as const

/** Et mildere utfall i banneret, etter marginene: «blir vurderingen når kronisk bruk legges til grunn «kan ikke fastslås».» */
export function mildereTekst(
  u: { vurdering: 'sporadisk'; utfall: BeUrinSporadisk } | { vurdering: 'kronisk'; utfall: BeUrinKronisk; samletDato: string | null },
): string {
  const utfall =
    u.vurdering === 'sporadisk'
      ? SPORADISK_KORT[u.utfall]
      : u.samletDato
        ? `indikasjon på nytt inntak etter den eldre prøven fra ${formaterDatoNorsk(u.samletDato)}`
        : KRONISK_KORT[u.utfall]
  return `blir ${VURDERINGEN[u.vurdering]} «${utfall}».`
}

/** Første linje i resultatet: hvordan endringene er justert. */
export function marginsetning(margin: number): string {
  return margin === INGEN_SIKKERHETSMARGIN
    ? `Konsentrasjonsendringene er ikke justert for måleusikkerhet (${somProsent(margin)} % sikkerhetsmargin).`
    : `Konsentrasjonsendringene er justert for måleusikkerhet med ${somProsent(margin)} % sikkerhetsmargin.`
}

/** Merknaden når de to bieksponentielle profilene gir samme terskel. */
export const BE_URIN_LIKE_BI =
  'Treg og ekstrem utskillelse gir nøyaktig samme terskel for disse prøvene.'

/** Den samlede vurderingen, under kortet for kronisk bruk. */
export function samlettekst(samlet: BeUrinProfilsamlet): string {
  if (!samlet.treff) {
    return 'Samlet vurdering: mot ingen av de tidligere prøvene ligger endringen over det som kan ses ved ekstrem utskillelse.'
  }
  return (
    `Samlet vurdering: mot den tidligere prøven fra ${formaterDatoNorsk(samlet.treff.dato)} ligger endringen over det ` +
    'som kan ses ved ekstrem utskillelse. Det er en indikasjon på nytt inntak etter den eldre prøven, ikke nødvendigvis ' +
    'etter forrige prøve.'
  )
}

/**
 * En ratio med fire gjeldende siffer, også når den er for liten eller stor
 * for et vanlig tall: da som en tierpotens fra logaritmen («≈ 10^−412»).
 */
export function formaterLogRatio(logVerdi: number): string {
  const tier = logVerdi / Math.LN10
  if (Math.abs(tier) < 12) return formaterRatio(Math.exp(logVerdi))
  const eksponent = Math.round(tier)
  return `≈ 10^${eksponent < 0 ? '−' : ''}${Math.abs(eksponent)}`
}
