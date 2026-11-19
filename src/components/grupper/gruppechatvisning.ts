/**
 * Det chatvisningen regner ut, uten React: dagene, klokkeslettene, hvilke
 * meldinger som henger sammen, teksten om hvem som leser og telleren ved
 * skrivefeltet (docs/gruppechat.md, «Brukerflaten»). Rene funksjoner, så de
 * kan prøves for seg.
 */
import type { Chatlesere, Direktemeta, Gruppemelding } from '../../gruppechat/modell'
import { personnavn } from '../../direktemeldinger/modell'

const KLOKKE = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' })
const UKEDAG_OG_DATO = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long' })
const UKEDAG_DATO_OG_AAR = new Intl.DateTimeFormat('nb-NO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
const FULLT = new Intl.DateTimeFormat('nb-NO', { dateStyle: 'long', timeStyle: 'short' })

/** Meldinger fra samme avsender så tett etter hverandre står under ett navn. */
export const SAMMENHENGENDE_MS = 5 * 60_000

/** Telleren ved skrivefeltet vises når så mye av grensen er brukt. */
export const TELLER_FRA = 0.9

const dato = (iso: string): Date | null => {
  const tid = new Date(iso)
  return Number.isNaN(tid.getTime()) ? null : tid
}

/** Nøkkelen for dagen (lokal tid), så meldingene kan grupperes etter den. */
export function dagsnokkel(iso: string): string {
  const tid = dato(iso)
  return tid ? `${tid.getFullYear()}-${tid.getMonth()}-${tid.getDate()}` : ''
}

/** Overskriften over en dag: «I dag», «I går», «mandag 16. november» (med år når det ikke er i år). */
export function dagsnavn(iso: string, naa: Date = new Date()): string {
  const tid = dato(iso)
  if (!tid) return ''
  const igaar = new Date(naa)
  igaar.setDate(naa.getDate() - 1)
  if (dagsnokkel(iso) === dagsnokkel(naa.toISOString())) return 'I dag'
  if (dagsnokkel(iso) === dagsnokkel(igaar.toISOString())) return 'I går'
  const tekst = (tid.getFullYear() === naa.getFullYear() ? UKEDAG_OG_DATO : UKEDAG_DATO_OG_AAR).format(tid)
  return tekst.charAt(0).toUpperCase() + tekst.slice(1)
}

/** Klokkeslettet ved en melding: «14:32». */
export function klokkeslett(iso: string): string {
  const tid = dato(iso)
  return tid ? KLOKKE.format(tid) : ''
}

/** Hele tidspunktet, til `title` og skjermlesere. */
export function heleTidspunktet(iso: string): string {
  const tid = dato(iso)
  return tid ? FULLT.format(tid) : ''
}

/**
 * Meldingen står rett under den forrige fra samme avsender, samme dag og
 * innen {@link SAMMENHENGENDE_MS}, og trenger ikke navnet på nytt.
 */
export function henger(forrige: Gruppemelding | undefined, melding: Gruppemelding): boolean {
  if (!forrige || !forrige.forfatter || !melding.forfatter) return false
  if (forrige.forfatter.id !== melding.forfatter.id) return false
  if (dagsnokkel(forrige.skrevet_kl) !== dagsnokkel(melding.skrevet_kl)) return false
  const mellom = Date.parse(melding.skrevet_kl) - Date.parse(forrige.skrevet_kl)
  return mellom >= 0 && mellom <= SAMMENHENGENDE_MS
}

/** Hvem som kan lese en direktesamtale: bare de to (docs/direktemeldinger-personvern.md). */
export const DIREKTE_LESERE = 'Bare dere to kan lese samtalen.'

/** Hvem som kan lese chatten, øverst i den. */
export function lesertekst({ medlemmer, systemarkitekter }: Chatlesere): string {
  const hvem = [
    medlemmer === 1 ? 'det ene medlemmet i gruppen' : medlemmer > 1 ? `de ${medlemmer} medlemmene i gruppen` : null,
    systemarkitekter ? 'systemarkitektene i OUSFAR' : null,
  ].filter(Boolean)
  return hvem.length ? `Leses av ${hvem.join(' og av ')}.` : 'Ingen kan lese chatten nå.'
}

/**
 * Telleren ved skrivefeltet: tom til {@link TELLER_FRA} av grensen er brukt,
 * så hvor mange tegn som er igjen, eller hvor mange for mye.
 */
export function tegnteller(tekst: string, maks: number): { tekst: string; over: boolean } | null {
  const lengde = tekst.trim().length
  if (lengde < maks * TELLER_FRA) return null
  const igjen = maks - lengde
  if (igjen >= 0) return { tekst: igjen === 1 ? '1 tegn igjen' : `${igjen} tegn igjen`, over: false }
  return { tekst: -igjen === 1 ? '1 tegn for mye' : `${-igjen} tegn for mye`, over: true }
}

/** Teksten kan sendes: ikke tom, og innenfor grensen. */
export function kanSendes(tekst: string, maks: number): boolean {
  const lengde = tekst.trim().length
  return lengde > 0 && lengde <= maks
}

/** Tallet på nye meldinger fra andre etter `sistSett`, til knappen «N nye meldinger». */
export function nyeEtter(meldinger: readonly Gruppemelding[], sistSett: number): number {
  return meldinger.filter((m) => m.nr > sistSett && !m.egen && !m.slettet).length
}

/** Teksten på knappen som tar brukeren ned til de nye. */
export function nyeMeldingerTekst(antall: number): string {
  return antall === 1 ? '1 ny melding' : `${antall} nye meldinger`
}

/**
 * Berøringsskjerm (grov peker): Enter gir ny linje, og Send-knappen sender.
 * Uten `matchMedia` (eldre nettlesere, testmiljøet) gjelder tastaturet.
 */
export function erBeroring(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
}

/**
 * Linjen i stedet for skrivefeltet når det ikke kan skrives. I en
 * direktesamtale etter sperren: den andre kan ikke motta (samme tekst uansett
 * grunn), eller den innloggedes egen grunn. `navn` er navnet den andre står
 * med over samtalen.
 */
export function laastTekst(aktiv: boolean, direkte: Direktemeta | null, navn = personnavn(direkte?.motpart ?? null)): string {
  if (direkte) {
    switch (direkte.sperre) {
      case 'selv_av':
        return 'Du har slått av direktemeldinger. Slå dem på for å skrive.'
      case 'selv_blokkert':
        return `Du har blokkert ${navn}. Opphev blokkeringen for å skrive.`
      default:
        return `${navn} kan ikke motta nye direktemeldinger. Samtalen kan fortsatt leses.`
    }
  }
  return aktiv ? 'Du kan lese chatten, men ikke skrive i den.' : 'Gruppen er arkivert. Chatten kan leses, men ingen kan skrive i den.'
}

/**
 * Det som står der en slettet melding var. I en direktesamtale (`motpart` er
 * navnet på den andre) kan begge slette alt, og den som fjernet den andres
 * melding står der.
 */
export function slettettekst(melding: Pick<Gruppemelding, 'slettet' | 'egen'>, motpart?: string): string {
  switch (melding.slettet?.av) {
    case 'moderator':
      return 'Fjernet av en moderator'
    case 'motpart':
      return melding.egen ? `Fjernet av ${motpart ?? 'den andre'}` : 'Fjernet av deg'
    default:
      return 'Meldingen er slettet'
  }
}

/** Tekstene i menyen og bekreftelsen når den innloggede sletter en melding. */
export interface Slettetekster {
  meny: string
  forklaring?: string
  tittel: string
  bekreft: string
  tekst: string
}

/**
 * Tekstene for å slette en melding: sin egen, eller en andre skrev, som
 * moderator i en gruppe eller som deltaker i en direktesamtale (`direkte`).
 */
export function slettetekster(navn: string, egen: boolean, direkte: boolean): Slettetekster {
  const hvem = direkte ? 'dere begge' : 'alle'
  const hvor = direkte ? 'samtalen' : 'chatten'
  if (egen) {
    return {
      meny: 'Slett',
      tittel: 'Slette meldingen?',
      bekreft: 'Slett meldingen',
      tekst: `Teksten fjernes for ${hvem} med en gang og kan ikke hentes tilbake. I ${hvor} står det at meldingen er slettet.`,
    }
  }
  return {
    meny: 'Fjern meldingen',
    forklaring: direkte ? 'Den fjernes for dere begge. Det står i samtalen at du fjernet den.' : 'Som moderator. Det står i chatten at den er fjernet.',
    tittel: `Fjerne meldingen fra ${navn}?`,
    bekreft: 'Fjern meldingen',
    tekst: `Teksten fjernes for ${hvem} med en gang og kan ikke hentes tilbake. I ${hvor} står det at ${direkte ? 'du' : 'en moderator'} fjernet den.`,
  }
}
