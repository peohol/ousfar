import { profilFor, type BeUrinGrad, type BeUrinProfilresultat, type BeUrinRolle } from './beUrinProfiler'
import { BE_URIN_GRADTEKST, BE_URIN_KVALITATIV, BE_URIN_SAMMENLIGNINGSGRUNNLAG } from './beUrinProfilvisning'
import { antallDogn, tallMedEnhet } from './beUrinVisning'
import { INGEN_SIKKERHETSMARGIN } from './thcRegelsett'
import { formaterDatoNorsk, formaterIrcak } from './thcTall'
import { endringsfrase, somProsent } from './thcVisning'

/**
 * Forklaringen av en vurdering med fem utskillelsesprofiler (#576), i vanlig
 * språk og uten formler: hvor stor endringen er, hvordan det er tatt hensyn
 * til måleusikkerheten, hva som kunne ventes uten et nytt inntak, og hvorfor
 * vurderingene ble som de ble. Alt leses av resultatet motoren ga, så
 * forklaringen alltid stemmer med vurderingene. Stilen er THC-syremodulens
 * (`ThcForklaring.tsx`).
 */

type Vurdering = Extract<BeUrinProfilresultat, { type: 'vurdering' }>

/** Bolkene i forklaringen, med avsnittene i hver. */
export interface BeUrinForklaringstekst {
  endring: string[]
  maleusikkerhet: string[]
  forventet: string[]
  hvorfor: string[]
}

/** Over dette skrives en økning ikke i prosent: tallet sier ikke lenger noe. */
const STOR_OKNING = 1e4

/** «en nedgang på 31 %», «en økning på 20 %», «ingen endring», eller «en svært stor økning». */
export function endringstekst(ratio: number): string {
  if (!Number.isFinite(ratio) || ratio > STOR_OKNING) return 'en svært stor økning'
  return endringsfrase(ratio - 1)
}

/** Hva profilen forventer, uten «det som»: «etter et enkeltinntak». */
const FORVENTET_VED: Record<BeUrinRolle, string> = {
  enkeltinntak: 'etter et enkeltinntak',
  gjentatte_doser: 'etter gjentatte doser innenfor et kort tidsrom',
  moderat: 'ved moderat utskillelse',
  treg: 'ved treg utskillelse',
  ekstrem: 'ved ekstrem utskillelse',
}

/** Hvordan kvotienten har endret seg mot det profilen forventer: «har kvotienten falt mindre enn det som …». */
function relasjon(korrigert: number, grad: BeUrinGrad, rolle: BeUrinRolle): string {
  if (korrigert > 1) return `har kvotienten økt, mens den forventes å falle ${FORVENTET_VED[rolle]}`
  if (korrigert === 1) return `er kvotienten uendret, mens den forventes å falle ${FORVENTET_VED[rolle]}`
  const hvor =
    grad === 'under' ? 'mer enn' : grad === 'paa_nivaa' ? 'like mye som' : grad === 'over' ? 'mindre enn' : 'betydelig mindre enn'
  return `har kvotienten falt ${hvor} ${BE_URIN_SAMMENLIGNINGSGRUNNLAG[rolle]}`
}

export function beUrinForklaring(r: Vurdering, enhet: string, tidligereProver: number): BeUrinForklaringstekst {
  const { sammenligning: s, forrige, denne } = r
  const utenMargin = s.margin === INGEN_SIKKERHETSMARGIN
  const grad = (rolle: BeUrinRolle) => profilFor(s, rolle).grad
  const q = (verdi: number) => tallMedEnhet(formaterIrcak(verdi), enhet)

  const endring = [
    `Kvotienten er ${q(s.fra)} i forrige prøve (${formaterDatoNorsk(forrige.dato)}) og ${q(s.til)} i denne ` +
      `prøven (${formaterDatoNorsk(denne.dato)}), ${antallDogn(s.dager)} senere. Det er ${endringstekst(s.maltRatio)}.`,
  ]

  const usikre = 'Målingene av benzoylekgonin og kreatinin er usikre, så den målte endringen kan avvike noe fra den sanne.'
  const maleusikkerhet = [
    utenMargin
      ? `${usikre} Uten sikkerhetsmargin tas det ikke hensyn til dette: den målte endringen sammenlignes direkte med utskillelsesprofilene.`
      : `${usikre} Med ${somProsent(s.margin)} % sikkerhetsmargin legges en mer forsiktig endring til grunn, slik at ` +
        `tvilen kommer prøvegiver til gode. Endringen som fortolkes, er ${endringstekst(s.korrigertRatio)}.`,
  ]

  const endringen = utenMargin ? 'Den målte endringen' : 'Endringen som fortolkes,'
  const g = (rolle: BeUrinRolle) => BE_URIN_GRADTEKST[grad(rolle)]
  const forventet = [
    'Hvor raskt benzoylekgonin skilles ut, varierer betydelig, særlig med bruksmønsteret. Etter et enkeltinntak ' +
      'eller noen få doser faller kvotienten vanligvis raskt, mens utskillelsen ved kronisk bruk kan være mye tregere.',
    `${endringen} ligger ${g('enkeltinntak')} ${BE_URIN_SAMMENLIGNINGSGRUNNLAG.enkeltinntak} og ${g('gjentatte_doser')} ` +
      `${BE_URIN_SAMMENLIGNINGSGRUNNLAG.gjentatte_doser}. Sammenlignet med kronisk bruk ligger den ${g('moderat')} ` +
      `moderat, ${g('treg')} treg og ${g('ekstrem')} ekstrem utskillelse.`,
  ]

  return {
    endring,
    maleusikkerhet,
    forventet,
    hvorfor: hvorfor(r, utenMargin, tidligereProver),
  }
}

/** «Hvorfor blir konklusjonen slik?»: én eller noen få setninger per vurdering, etter utfallet. */
function hvorfor(r: Vurdering, utenMargin: boolean, tidligereProver: number): string[] {
  const { sammenligning: s, samlet } = r
  const grad = (rolle: BeUrinRolle) => profilFor(s, rolle).grad
  const rel = (rolle: BeUrinRolle) => relasjon(s.korrigertRatio, grad(rolle), rolle)
  const streng = s.sporadisk === 'sannsynlig' || s.sporadisk === 'nytt_inntak'
  const forbehold = utenMargin
    ? 'Uten sikkerhetsmargin'
    : streng
      ? 'Selv etter at vi har tatt hensyn til måleusikkerheten'
      : 'Når vi tar hensyn til måleusikkerheten'

  const sporadisk = {
    nytt_inntak: `${forbehold}, ${rel('gjentatte_doser')}. Dersom sporadisk bruk legges til grunn, vurderes det derfor at et nytt inntak har skjedd.`,
    sannsynlig: `${forbehold}, ${rel('gjentatte_doser')}. Dersom sporadisk bruk legges til grunn, er et nytt inntak derfor sannsynlig.`,
    forenlig_gjentatte_doser:
      `${forbehold}, ${rel('enkeltinntak')}, men minst like mye som ${BE_URIN_SAMMENLIGNINGSGRUNNLAG.gjentatte_doser}. ` +
      'Dersom sporadisk bruk legges til grunn, kan et nytt inntak derfor ikke fastslås.',
    forenlig_enkeltinntak: `${forbehold}, ${rel('enkeltinntak')}. Dersom sporadisk bruk legges til grunn, kan et nytt inntak derfor ikke fastslås.`,
  }[s.sporadisk]

  const ekstrem = BE_URIN_GRADTEKST[grad('ekstrem')]
  const imidlertid = streng ? ' imidlertid' : ''
  const kronisk = {
    nytt_inntak:
      `Ved kronisk bruk kan utskillelsen være mye tregere, men endringen ligger ${ekstrem} selv ekstrem utskillelse. ` +
      'Dersom kronisk bruk legges til grunn, vurderes det derfor at et nytt inntak har skjedd.',
    sannsynlig:
      'Ved kronisk bruk kan utskillelsen være mye tregere, men endringen ligger over selv ekstrem utskillelse. ' +
      'Dersom kronisk bruk legges til grunn, er et nytt inntak derfor sannsynlig.',
    uavklart_uvanlig:
      `Ved kronisk bruk kan utskillelsen${imidlertid} være så treg at et nytt inntak ikke kan fastslås, siden endringen ` +
      'ikke ligger over ekstrem utskillelse. Endringen ligger likevel over både moderat og treg utskillelse, og en så ' +
      'treg utskillelse anses som svært uvanlig.',
    uavklart: streng
      ? 'Ved kronisk bruk kan utskillelsen imidlertid være så treg at et nytt inntak ikke kan fastslås.'
      : 'Heller ikke dersom kronisk bruk legges til grunn, kan et nytt inntak fastslås.',
  }[s.kronisk]

  const avsnitt = [sporadisk, kronisk]
  if (samlet?.treff) {
    avsnitt.push(
      `Sammenlignet med prøven fra ${formaterDatoNorsk(samlet.treff.dato)}, ${antallDogn(samlet.treff.sammenligning.dager)} ` +
        'før denne prøven, ligger endringen derimot over ekstrem utskillelse. Det er en indikasjon på nytt inntak etter ' +
        'den prøven, men ikke nødvendigvis etter forrige prøve.',
    )
  } else if (samlet) {
    avsnitt.push('Heller ikke sammenlignet med de tidligere prøvene ligger endringen over ekstrem utskillelse.')
  } else if (tidligereProver > 0) {
    avsnitt.push(
      'De tidligere prøvene er ikke brukt. De brukes bare når endringen ligger over moderat eller treg utskillelse, ' +
        'men ikke over ekstrem utskillelse.',
    )
  }
  avsnitt.push(BE_URIN_KVALITATIV)
  return avsnitt
}
