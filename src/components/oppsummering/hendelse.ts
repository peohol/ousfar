import type { Ikonnavn } from '../ikon/register'

/**
 * Én hendelse i en oppsummering: på forsiden, under «Siste aktivitet» i en
 * gruppe og i andre korte paneler (`docs/design/d0-dashboard-chat/`, kart §3).
 *
 * Hele raden er lenken til selve hendelsen, aldri bare til en liste: riktig
 * idé, oppgave, kommentar, samtale eller seksjon på en fagside.
 */
export interface Hendelse {
  /** Stabil nøkkel for hendelsen, så samme hendelse ikke tegnes to ganger. */
  id: string
  ikon: Ikonnavn
  /** Hva som har skjedd, eller navnet på det raden peker på. */
  tittel: string
  /** Hvor: gruppen, fagsiden eller «Appen», og hva slags ting det er. */
  hvor: string
  /** Når, som ISO-tid. Utelatt når tiden ikke sier noe (en gruppe, en favoritt). */
  tid?: string
  /** Kort tekst i stedet for tiden, som «Pågår» eller «3 nye». Går foran `tid`. */
  merknad?: string
  /** Adressen i appen raden fører til (`#/…`), også en direktelenke. */
  til: string
  /**
   * Kalles når raden åpnes, i tillegg til lenken (ikke i stedet for den):
   * merke et varsel lest, eller åpne noe uten egen adresse, som en føring i
   * endringsloggen (da peker `til` på siden brukeren står på).
   */
  ved?: () => void
  /** Brukeren har ikke sett hendelsen. Vises med prikk og skjult tekst. */
  ulest?: boolean
}

/** Flest rader et oppsummeringspanel viser (planen §4.2). */
export const MAKS_HENDELSER = 3

const KLOKKE = new Intl.DateTimeFormat('nb-NO', { hour: '2-digit', minute: '2-digit' })
const DAG_OG_MAANED = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'numeric' })
const DATO_MED_AAR = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'numeric', year: 'numeric' })

const sammeDag = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

/**
 * Tiden ved en hendelse, så kort som mulig: klokkeslettet i dag («14.02»),
 * «I går», ellers dagen («17.11.»), med år når det ikke er i år. Tom for en
 * ugyldig tid.
 */
export function hendelsestid(iso: string, naa: Date = new Date()): string {
  const tid = new Date(iso)
  if (Number.isNaN(tid.getTime())) return ''
  if (sammeDag(tid, naa)) return KLOKKE.format(tid)
  const igaar = new Date(naa)
  igaar.setDate(naa.getDate() - 1)
  if (sammeDag(tid, igaar)) return 'I går'
  return (tid.getFullYear() === naa.getFullYear() ? DAG_OG_MAANED : DATO_MED_AAR).format(tid)
}
