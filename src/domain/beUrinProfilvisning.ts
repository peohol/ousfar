import {
  type BeUrinGrad,
  type BeUrinKronisk,
  type BeUrinProfilMildere,
  type BeUrinProfilresultat,
  type BeUrinProfilsamlet,
  type BeUrinRolle,
  type BeUrinSporadisk,
} from './beUrinProfiler'
import { formaterDatoNorsk } from './thcTall'
import { marginbobler, marginliste, type MildereMarginer } from './thcVisning'

/**
 * Det modulen skriver om fortolkningen med fem utskillelsesprofiler
 * (modellform 2, #570, forenklet i #576). Konklusjonene først og kort;
 * begrunnelsen står i forklaringen (`beUrinProfilforklaring.ts`). Modulen er
 * intern beslutningsstøtte: tekstene står i resultatet og kopieres ikke.
 */

/** Navnet hver profil har i tabellen, figuren og forklaringen. */
export const BE_URIN_ROLLENAVN: Record<BeUrinRolle, string> = {
  enkeltinntak: 'Enkeltinntak',
  gjentatte_doser: 'Gjentatte doser',
  moderat: 'Moderat utskillelse',
  treg: 'Treg utskillelse',
  ekstrem: 'Ekstrem utskillelse',
}

/** Det endringen sammenlignes med for hver profil: «det som kan ses etter et enkeltinntak». */
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

/** De to vurderingene. */
export type BeUrinVurderingstype = 'sporadisk' | 'kronisk'

/** Overskriftene på de to vurderingene. */
export const BE_URIN_KORTTITTEL: Record<BeUrinVurderingstype, string> = {
  sporadisk: 'Sporadisk bruk lagt til grunn',
  kronisk: 'Kronisk bruk lagt til grunn',
}

/** En vurdering slik den står: den korte konklusjonen, og der det er relevant én setning til. */
export interface BeUrinVurderingstekst {
  konklusjon: string
  utdyping?: string
}

const NYTT_INNTAK = 'Nytt inntak.'
const SANNSYNLIG = 'Sannsynlig nytt inntak.'
const KAN_IKKE = 'Nytt inntak kan ikke fastslås.'

/** Vurderingen når sporadisk bruk legges til grunn. */
export const BE_URIN_SPORADISK_TEKST: Record<BeUrinSporadisk, BeUrinVurderingstekst> = {
  forenlig_enkeltinntak: {
    konklusjon: KAN_IKKE,
    utdyping: 'Endringen er forenlig med utskillelse etter et enkeltinntak.',
  },
  forenlig_gjentatte_doser: {
    konklusjon: KAN_IKKE,
    utdyping: 'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
  },
  sannsynlig: { konklusjon: SANNSYNLIG },
  nytt_inntak: { konklusjon: NYTT_INNTAK },
}

/** Vurderingen når kronisk bruk legges til grunn. */
export const BE_URIN_KRONISK_TEKST: Record<BeUrinKronisk, BeUrinVurderingstekst> = {
  uavklart: { konklusjon: KAN_IKKE },
  uavklart_uvanlig: {
    konklusjon: KAN_IKKE,
    utdyping: 'En såpass treg utskillelse anses likevel som svært uvanlig.',
  },
  sannsynlig: { konklusjon: SANNSYNLIG },
  nytt_inntak: { konklusjon: NYTT_INNTAK },
}

/** Vurderingen som én tekst: konklusjonen og utdypingen. */
export function vurderingstekst(t: BeUrinVurderingstekst): string {
  return t.utdyping ? `${t.konklusjon} ${t.utdyping}` : t.konklusjon
}

/** «Tidligere prøve fra 01.11.2026» midt i en setning: «prøven fra 01.11.2026». */
const provenFra = (dato: string) => `prøven fra ${formaterDatoNorsk(dato)}`

/** Indikasjonen på nytt inntak etter en enda tidligere prøve, som utfall av den samlede vurderingen. */
export function samletIndikasjon(dato: string): string {
  return `Indikasjon på nytt inntak etter ${provenFra(dato)}, men ikke nødvendigvis etter forrige prøve.`
}

/** Den samlede vurderingen, under vurderingen for kronisk bruk. */
export function samlettekst(samlet: BeUrinProfilsamlet): string {
  if (!samlet.treff) return 'Heller ikke sammenlignet med de tidligere prøvene er det indikasjon på nytt inntak.'
  return `Sammenlignet med ${provenFra(samlet.treff.dato)} er det indikasjon på nytt inntak etter den prøven, men ikke nødvendigvis etter forrige prøve.`
}

/** Vurderingen slik den står nå, til å si hva en høyere margin endrer. */
export interface BeUrinGjeldende {
  tekst: BeUrinVurderingstekst
  /** Den samlede vurderingen fant indikasjon på nytt inntak etter en eldre prøve. */
  samletTreff: boolean
}

/**
 * Et mildere utfall en høyere margin gir, med det som skiller det klinisk fra
 * vurderingen som står: «Ved 99 % sikkerhetsmargin blir vurderingen ved
 * sporadisk bruk: Nytt inntak kan ikke fastslås. Endringen er forenlig med
 * utskillelse etter gjentatte doser innenfor et kort tidsrom.» Konklusjonen og
 * utdypingen står alltid, så to marginer med samme konklusjon, men ulik
 * utdyping, ikke ser like ut. Indikasjonen etter en eldre prøve står når
 * utfallet har en, og at den faller bort når vurderingen som står har en.
 */
export function mildereTekst(u: BeUrinProfilMildere, gjeldende: BeUrinGjeldende): string {
  const tekst = u.vurdering === 'sporadisk' ? BE_URIN_SPORADISK_TEKST[u.utfall] : BE_URIN_KRONISK_TEKST[u.utfall]
  const deler = [tekst.konklusjon]
  if (tekst.utdyping) deler.push(tekst.utdyping)
  // Samme konklusjon uten utdyping ved kronisk bruk: bemerkningen om svært
  // uvanlig utskillelse faller bort, og det sies.
  else if (tekst.konklusjon === gjeldende.tekst.konklusjon && gjeldende.tekst.utdyping) {
    deler.push('Uten bemerkningen om svært uvanlig utskillelse.')
  }
  if (u.vurdering === 'kronisk' && u.samletDato) deler.push(samletIndikasjon(u.samletDato))
  else if (gjeldende.samletTreff) deler.push('Ingen indikasjon på nytt inntak etter de tidligere prøvene.')
  return `Ved ${marginliste(u.marginer)} sikkerhetsmargin blir vurderingen ved ${u.vurdering} bruk: ${deler.join(' ')}`
}

/** Konklusjonene kort, i snakkeboblene ved sikkerhetsmarginen. */
const KORT_KONKLUSJON: Record<string, string> = {
  [KAN_IKKE]: 'Kan ikke fastslås',
  [SANNSYNLIG]: 'Sannsynlig nytt inntak',
  [NYTT_INNTAK]: 'Nytt inntak',
}

/** Utdypingene kort, så hvert klinisk utfall får sin egen linje i boblene. */
const KORT_UTDYPING = new Map<string | undefined, string>([
  [BE_URIN_SPORADISK_TEKST.forenlig_enkeltinntak.utdyping, 'forenlig med enkeltinntak'],
  [BE_URIN_SPORADISK_TEKST.forenlig_gjentatte_doser.utdyping, 'forenlig med gjentatte doser'],
  [BE_URIN_KRONISK_TEKST.uavklart_uvanlig.utdyping, 'svært uvanlig utskillelse'],
])

const KORT_VURDERING: Record<BeUrinVurderingstype, string> = { sporadisk: 'Sporadisk', kronisk: 'Kronisk' }

/**
 * Det høyere marginer ville gitt (#588): boblene ved sikkerhetsmarginen med
 * hvert mildere utfall kort ({@link boblelinje}), og hele setningen
 * ({@link mildereTekst}) for hvert utfall.
 */
export function beMildereMarginer(
  resultat: Extract<BeUrinProfilresultat, { type: 'vurdering' }>,
  mildere: readonly BeUrinProfilMildere[],
): MildereMarginer {
  const { sammenligning: s, samlet } = resultat
  const gjeldende: Record<BeUrinVurderingstype, BeUrinGjeldende> = {
    sporadisk: { tekst: BE_URIN_SPORADISK_TEKST[s.sporadisk], samletTreff: false },
    kronisk: { tekst: BE_URIN_KRONISK_TEKST[s.kronisk], samletTreff: Boolean(samlet?.treff) },
  }
  return {
    bobler: marginbobler(mildere.map((u) => ({ marginer: u.marginer, linje: boblelinje(u, gjeldende[u.vurdering]) }))),
    tekster: mildere.map((u) => mildereTekst(u, gjeldende[u.vurdering])),
  }
}

/**
 * Et mildere utfall kort, i samme rekkefølge som {@link mildereTekst}, så
 * klinisk ulike utfall aldri får samme linje: «Kronisk: Kan ikke fastslås –
 * svært uvanlig utskillelse», «Sporadisk: Kan ikke fastslås – forenlig med
 * gjentatte doser». Faller bare bemerkningen om svært uvanlig utskillelse bort,
 * sies det («uten …»); indikasjonen etter en eldre prøve står med datoen, og at
 * den faller bort, sies også.
 */
export function boblelinje(u: BeUrinProfilMildere, gjeldende: BeUrinGjeldende): string {
  const tekst = u.vurdering === 'sporadisk' ? BE_URIN_SPORADISK_TEKST[u.utfall] : BE_URIN_KRONISK_TEKST[u.utfall]
  let linje = `${KORT_VURDERING[u.vurdering]}: ${KORT_KONKLUSJON[tekst.konklusjon] ?? tekst.konklusjon}`
  const utdyping = KORT_UTDYPING.get(tekst.utdyping)
  const bortfalt = KORT_UTDYPING.get(gjeldende.tekst.utdyping)
  if (utdyping) linje += ` – ${utdyping}`
  else if (tekst.konklusjon === gjeldende.tekst.konklusjon && bortfalt) linje += `, uten «${bortfalt}»`
  if (u.vurdering === 'kronisk' && u.samletDato) linje += ` (indikasjon etter ${formaterDatoNorsk(u.samletDato)})`
  else if (gjeldende.samletTreff) linje += ', uten indikasjon etter tidligere prøve'
  return linje
}

/** Forbeholdet under vurderingene: kort og diskret, ikke et banner. */
export const BE_URIN_FORUTSETNING =
  'Fortolkningen forutsetter at prøvene er tatt i eliminasjonsfasen, etter at opptaket fra et inntak er avsluttet.'

/** Hva vurderingene er, i forklaringen. */
export const BE_URIN_KVALITATIV =
  'Vurderingene er kvalitative modellvurderinger, ikke statistisk kalibrerte sannsynligheter. «Nytt inntak» er ' +
  'verktøyets sterkeste vurdering, ikke et matematisk bevis.'
