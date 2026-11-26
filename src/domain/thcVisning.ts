import {
  type ThcForventet,
  type ThcKonklusjon,
  type ThcMildereUtfall,
  type ThcSamletVurdering,
} from './thcMotor'
import { INGEN_SIKKERHETSMARGIN, KURVEFARGE, type ThcKonsentrasjonsniva, type ThcRegelsett } from './thcRegelsett'
import {
  kommentardeler,
  settSammen,
  THC_SITUASJONSINFO,
  THC_TEKSTBOLKER,
  type ThcKommentarnokkel,
  type ThcTekster,
} from './thcTekster'
import { formaterIrcak, ordEndring } from './thcTall'

/**
 * Det fortolkningen og simulatoren viser om THC-syreregelsettet, avledet av
 * reglene, så visningen følger med når reglene redigeres.
 */

/** En andel som prosenttall med norsk desimaltegn: 0,9 → «90», 0,995 → «99,5». */
export function somProsent(andel: number): string {
  return String(Math.round(andel * 10000) / 100).replace('.', ',')
}

/** Merket på sikkerhetsmarginen: «Ingen» for margin uten korreksjon, ellers «90 %». */
export function marginmerke(margin: number): string {
  return margin === INGEN_SIKKERHETSMARGIN ? 'Ingen' : `${somProsent(margin)} %`
}

/**
 * Valget for marginen i skjemaet: som {@link marginmerke}, men «Ingen» får med
 * hvor sikker den er, «Ingen (50 %)». Parentesen holdes samlet om merket må
 * brytes.
 */
export function marginvalg(margin: number): string {
  return margin === INGEN_SIKKERHETSMARGIN
    ? `${marginmerke(margin)} (${somProsent(margin)}\u00a0%)`
    : marginmerke(margin)
}

/** Marginene som en liste: «99 %», «99 % eller 99,9 %», «95 %, 99 % eller 99,9 %». */
export function marginliste(marginer: readonly number[]): string {
  const merker = marginer.map(marginmerke)
  return merker.length <= 1 ? (merker[0] ?? '') : `${merker.slice(0, -1).join(', ')} eller ${merker.at(-1)}`
}

/**
 * Navnet på en konklusjon slik modulen viser den: situasjonens tittel, og for
 * den samlede vurderingen nytt inntak etter den tidligere prøven den fant.
 */
export function konklusjonsnavn(konklusjon: ThcKonklusjon, samlet: ThcSamletVurdering | null): string {
  return samlet ? `Nytt inntak etter tidligere prøve ${samlet.dato}` : THC_SITUASJONSINFO[konklusjon].tittel
}

/** Som {@link konklusjonsnavn}, men midt i en setning: «kan ikke fastslås». */
export function konklusjonsnavnISetning(konklusjon: ThcKonklusjon, samlet: ThcSamletVurdering | null): string {
  const navn = konklusjonsnavn(konklusjon, samlet)
  return navn.charAt(0).toLowerCase() + navn.slice(1)
}

/* --- Det modulen skriver ved skjemaet og kommentaren (#586) ------------------ */

/** Teksten der kommentaren kommer, så lenge skjemaet ikke er ferdig utfylt. */
export const THC_VENTER = 'Kommentaren vises når prøvene er fylt inn.'

/** «1 dag», «3 dager». */
export function antallDager(dager: number): string {
  return dager === 1 ? '1 dag' : `${dager} dager`
}

/** Meldingen om kort tid mellom prøvene: «Prøvene er tatt samme dag.» eller «Det er bare 2 dager mellom prøvene.» */
export function kortTidtekst(dager: number): string {
  return dager === 0 ? 'Prøvene er tatt samme dag.' : `Det er bare ${antallDager(dager)} mellom prøvene.`
}

/** Meldingen om lang tid mellom prøvene, med forslaget om å fortolke uten forrige prøve. */
export function langTidtekst(dager: number): string {
  return `Det er ${antallDager(dager)} mellom prøvene. Vurder å fortolke uten å sammenligne med forrige prøve.`
}

/**
 * Merknaden ved sikkerhetsmarginen når forrige prøve fortolkes under
 * cut-off og marginen faktisk korrigerer for måleusikkerheten. Meningen er
 * eierens: større måleusikkerhet legges til grunn, og det gjør fortolkningen
 * mer forsiktig.
 */
export function underCutofftekst(faktor: number): string {
  return (
    `Forrige prøve er under cut-off, så det er lagt til grunn ${Math.round((faktor - 1) * 100)}\u00a0% høyere ` +
    'måleusikkerhet. Det gjør fortolkningen mer forsiktig.'
  )
}

/** Merknaden når den samlede vurderingen ble gjort, men ingen tidligere prøve ga nytt inntak. */
export const THC_SAMLET_UTEN_TREFF = 'Ingen av de tidligere prøvene ga «nytt inntak».'

/**
 * Et mildere utfall en høyere margin gir, kort ved kommentaren (#586):
 * «Ved 99 % sikkerhetsmargin kan et nytt inntak ikke fastslås.» Teksten gir
 * hele det kliniske utfallet, så to utfall aldri ser like ut: nytt inntak
 * etter en enda tidligere prøve med datoen for den prøven, og at de tidligere
 * prøvene ikke gir nytt inntak, eller ikke vurderes, når det står i
 * fortolkningen nå og faller bort med den høyere marginen.
 *
 * `gjeldende` er fortolkningen med den valgte marginen: den tidligere prøven
 * den samlede vurderingen fant nytt inntak etter, og om denne prøven
 * sammenlignes med tidligere prøver når forrige prøve gir «kan ikke
 * fastslås» (det står tidligere prøver i skjemaet).
 */
export function mildereMargintekst(
  u: ThcMildereUtfall,
  gjeldende: { samlet: ThcSamletVurdering | null; medTidligere: boolean },
): string {
  const ved = `Ved ${marginliste(u.marginer)} sikkerhetsmargin`
  if (u.samlet) {
    return (
      `${ved} kan et nytt inntak etter forrige prøve ikke fastslås, men det har skjedd minst ett inntak ` +
      `etter prøven tatt ${u.samlet.dato}.`
    )
  }
  if (u.konklusjon === 'vanskelig') {
    return gjeldende.medTidligere
      ? `${ved} kan et nytt inntak ikke fastslås, heller ikke mot de tidligere prøvene.`
      : `${ved} kan et nytt inntak ikke fastslås.`
  }
  // «Ikke nødvendigvis nytt»: de tidligere prøvene vurderes bare ved «kan ikke fastslås».
  return (
    `${ved} har cannabis ikke nødvendigvis vært inntatt etter forrige prøve.` +
    (gjeldende.samlet ? ' De tidligere prøvene vurderes da ikke.' : '')
  )
}

/** «en nedgang på 74 %», «en økning på 5 %» eller «ingen endring». */
export function endringsfrase(endring: number): string {
  const ord = ordEndring(endring)
  if (ord === 'ingen endring') return 'ingen endring'
  return `en ${ord} på ${Math.round(Math.abs(endring) * 100)} %`
}

/**
 * Hvor ofte endringen som fortolkes, er større enn den sanne med marginen:
 * «i annethvert tilfelle» uten margin, «i 1 av 10 tilfeller» med 90 %.
 */
export function hvorOfteForStor(margin: number): string {
  const n = Math.round(1 / (1 - margin))
  return n === 2 ? 'i annethvert tilfelle' : `i 1 av ${n} tilfeller`
}

/** Hvert konsentrasjonsnivå med området det dekker: «under 20», «20–40», «40 eller mer». */
export function nivaomrader(r: ThcRegelsett): { navn: string; omrade: string }[] {
  const nivaer = r.konsentrasjonsnivaer
  return nivaer.map((niva, i) => {
    const neste = nivaer[i + 1]?.nedre ?? null
    const nedre = niva.nedre
    const omrade =
      nedre === null
        ? neste === null
          ? 'alle konsentrasjoner'
          : `under ${formaterIrcak(neste)}`
        : neste === null
          ? `${formaterIrcak(nedre)} eller mer`
          : `${formaterIrcak(nedre)}–${formaterIrcak(neste)}`
    return { navn: niva.navn, omrade }
  })
}

/**
 * Hvordan konsentrasjonen i prøven gir nivået i kommentarens åpning: «under 20
 * omtales som lav, 20–40 som middels høy, og 40 eller mer som høy».
 */
export function nivabeskrivelse(r: ThcRegelsett): string {
  const deler = nivaomrader(r).map(({ navn, omrade }, i) => `${omrade}${i === 0 ? ' omtales' : ''} som ${navn}`)
  if (deler.length === 1) return deler[0]!
  // Komma også foran «og», som i den opprinnelige teksten.
  return `${deler.slice(0, -1).join(', ')}, og ${deler.at(-1)}`
}

/**
 * Forventet nedgang i prosent ved de to grensene konklusjonen bruker for
 * bruksmønsteret: den som skiller «ikke nødvendigvis» fra «vanskelig», og den
 * som skiller «vanskelig» fra nytt inntak.
 */
export function forventetNedgang(
  r: ThcRegelsett,
  kronisk: boolean,
  forventet: ThcForventet,
): { hosFleste: number; ovreGrense: number } {
  const monster = kronisk ? r.bruksmonstre.kronisk : r.bruksmonstre.ikke_kronisk
  return {
    hosFleste: Math.round(-forventet[monster.vanskelig_over] * 100),
    ovreGrense: Math.round(-forventet[monster.nytt_inntak_over] * 100),
  }
}

/**
 * Kurvene konklusjonen mot forrige prøve avgjøres av for et bruksmønster:
 * «Over den gule kurven («Moderat utskillelse»): kan ikke fastslås. Over den
 * røde («Treg utskillelse»): nytt inntak.» Fargen er kurvens navn i
 * redigeringen; figuren farger kurvene etter terskelen, så navnet fra figuren
 * står med.
 */
export function bruksmonsterbeskrivelse(r: ThcRegelsett, kronisk: boolean): string {
  const monster = kronisk ? r.bruksmonstre.kronisk : r.bruksmonstre.ikke_kronisk
  const navn = (rolle: keyof typeof KURVEFARGE) => `(«${r.kurver[rolle].navn}»)`
  return (
    `Over den ${KURVEFARGE[monster.vanskelig_over]} kurven ${navn(monster.vanskelig_over)}: kan ikke fastslås. ` +
    `Over den ${KURVEFARGE[monster.nytt_inntak_over]} ${navn(monster.nytt_inntak_over)}: nytt inntak.`
  )
}

/* --- Kommentarene ----------------------------------------------------------- */

/** Nivåene en kommentar gjelder for: alle, eller de som tyder (ikke) på nylig inntak. */
export function nivaerForKommentar(r: ThcRegelsett, nokkel: ThcKommentarnokkel): ThcKonsentrasjonsniva[] {
  const { nivaer } = THC_TEKSTBOLKER[nokkel]
  return r.konsentrasjonsnivaer.filter((n) => nivaer === 'alle' || (nivaer === 'nylig') === n.nylig_inntak)
}

/** «Lav og middels høy», «Lav, middels høy og høy», eller «Ingen nivåer nå». */
export function nivaliste(navn: readonly string[]): string {
  if (navn.length === 0) return 'Ingen nivåer nå'
  const tekst = navn.length === 1 ? navn[0]! : `${navn.slice(0, -1).join(', ')} og ${navn.at(-1)}`
  return tekst.charAt(0).toUpperCase() + tekst.slice(1)
}

/** Datoene eksemplene på kommentarene viser. Oppdiktede. */
export const EKSEMPELDATOER = { forrigeDato: '04.07.2026', tidligereDato: '01.06.2026' } as const

/**
 * Kommentaren slik den blir, med det første nivået den gjelder for og
 * eksempeldatoene. Brukes også for et utkast som ikke er gyldig ennå, så
 * redigeringen kan vise hva som skrives.
 */
export function eksempelkommentar(r: ThcRegelsett, tekster: ThcTekster, nokkel: ThcKommentarnokkel): string {
  const niva = nivaerForKommentar(r, nokkel)[0] ?? r.konsentrasjonsnivaer[0]
  return settSammen(tekster, kommentardeler(r.med_sporsmalsetning ?? [], nokkel), {
    niva: niva?.navn ?? '{nivå}',
    ...EKSEMPELDATOER,
  })
}
