import type { BeUrinKonklusjon } from './beUrinMotor'
import { formaterDatoNorsk } from './thcTall'

/**
 * Det modulen skriver om fortolkningen av benzoylekgonin i urin. Ordlyden for
 * konklusjonene og merkingen er bestillingens (#562). Ingen kommentartekst:
 * modulen er intern beslutningsstøtte og har ingen kommentar å kopiere.
 */

/** Konklusjonene slik de står i resultatet. */
export const BE_URIN_KONKLUSJONSTEKST: Record<BeUrinKonklusjon, string> = {
  ikke_nodvendigvis: 'Ikke nødvendigvis nytt inntak.',
  kan_ikke_fastslaas: 'Kan ikke fastslås.',
  nytt_inntak: 'Nytt inntak.',
}

/** Hva hver konklusjon betyr, under den. */
export const BE_URIN_KONKLUSJONSFORKLARING: Record<BeUrinKonklusjon, string> = {
  ikke_nodvendigvis:
    'Endringen ligger ikke over noen av de to utskillelsesprofilene. Det utelukker ikke et nytt inntak.',
  kan_ikke_fastslaas: 'Endringen ligger over den ene utskillelsesprofilen, men ikke over den andre.',
  nytt_inntak:
    'Endringen ligger over begge utskillelsesprofilene. Det er en modellindikasjon på nytt inntak etter forrige prøve, ikke et bevis.',
}

/** Den faste merkingen over resultatet. */
export const BE_URIN_TENTATIV =
  'Tentativ modell – ikke klinisk validert. Resultatet må vurderes sammen med øvrige opplysninger.'

/** Konklusjonen midt i en setning, uten punktum: «kan ikke fastslås», «nytt inntak etter 01.06.2026». */
export function konklusjonISetning(konklusjon: BeUrinKonklusjon, samletDato: string | null): string {
  if (samletDato) return `nytt inntak etter ${formaterDatoNorsk(samletDato)}`
  const tekst = BE_URIN_KONKLUSJONSTEKST[konklusjon].replace(/\.$/, '')
  return tekst.charAt(0).toLowerCase() + tekst.slice(1)
}

/** En ratio med fire gjeldende siffer og norsk desimaltegn: «0,4123». */
/** «Kreatinin (mmol/L)», eller bare «Kreatinin» når modellen ikke navngir enheten. */
export function medEnhet(tekst: string, enhet: string): string {
  return enhet ? `${tekst} (${enhet})` : tekst
}

/** «25 mmol/mol», eller bare «25» når modellen ikke navngir enheten. */
export function tallMedEnhet(tall: string, enhet: string): string {
  return enhet ? `${tall} ${enhet}` : tall
}

/** Om minst én av tersklene i sammenligningen er regnet ved ekstrapolasjon (referanseprøven over kurvens start). */
export function erEkstrapolert(s: { profiler: readonly { ekstrapolert: boolean }[] }): boolean {
  return s.profiler.some((p) => p.ekstrapolert)
}

/** Merknaden når referanseprøven ligger over startverdien til en profil, så terskelen er ekstrapolert. */
export function ekstrapolasjonsmerknad(referanseprove: string): string {
  return (
    `${referanseprove} ligger over startverdien til minst én utskillelsesprofil. Terskelen er regnet ved matematisk ` +
    'ekstrapolasjon, et område modellen ikke er dokumentert for.'
  )
}

export function formaterRatio(ratio: number): string {
  return Number(ratio.toPrecision(4)).toString().replace('.', ',')
}

/** Et tidspunkt på profilen i døgn, med én desimal: «−7,7». */
export function formaterDogn(dogn: number): string {
  const tall = Math.round(dogn * 10) / 10
  return `${tall < 0 ? '−' : ''}${String(Math.abs(tall)).replace('.', ',')}`
}

/** «1 døgn», «3 døgn». */
export function antallDogn(dager: number): string {
  return `${dager} døgn`
}
