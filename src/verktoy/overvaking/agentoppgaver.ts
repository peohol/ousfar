/**
 * Agentens arbeid med kildesakene (VDR-1, `docs/verktøy-p12-overvaking.md` §5):
 * oppgavene Claude (eller noen andre med tilgang til repoet) sender gjennom
 * arbeidsflyten `verktoy-overvaking.yml` og serverendepunktet. Hver oppgave er
 * én databasefunksjon; her kontrolleres bare formen, så en feil melding aldri
 * når databasen. Hva som er lov i hvilken tilstand, og hva som krever bevis,
 * avgjør databasen (`supabase/migrations/20261102210000_kildesaker.sql`).
 *
 * Alle oppgaver på en sak tar versjonen agenten leste, og avvises når saken er
 * endret siden, så en utløst oppgave aldri overskriver en nyere vurdering.
 */
import type { Databasekall } from '../../legemiddeldata/lager.js'

type Felt = (x: unknown) => unknown

const AVVIST = Symbol('avvist')

/** Et positivt heltall, også som tekst (arbeidsflyten sender tekst). */
const nummer: Felt = (x) => {
  const n = typeof x === 'number' ? x : typeof x === 'string' && /^\s*\d{1,15}\s*$/.test(x) ? Number(x) : NaN
  return Number.isSafeInteger(n) && n >= 1 ? n : AVVIST
}
const tekst =
  (min: number, maks: number): Felt =>
  (x) =>
    typeof x === 'string' && x.trim().length >= min && x.trim().length <= maks ? x.trim() : AVVIST
const enAv =
  (...lov: string[]): Felt =>
  (x) =>
    typeof x === 'string' && lov.includes(x) ? x : AVVIST
const objekt: Felt = (x) => (x !== null && typeof x === 'object' && !Array.isArray(x) ? x : AVVIST)
const liste: Felt = (x) => (Array.isArray(x) ? x : AVVIST)
/** Feltet kan mangle; da sendes `null`. */
const valgfri =
  (f: Felt): Felt =>
  (x) =>
    x === undefined || x === null ? null : f(x)

export const KONKLUSJONER = ['uten_faglig_betydning', 'uavklart', 'faglig_relevant', 'mulig_alvorlig_risiko'] as const
export type Konklusjon = (typeof KONKLUSJONER)[number]

/** Oppgavene, med databasefunksjonen og feltene den tar (`av` blir `agent`). */
export const AGENTOPPGAVER = {
  teknisk_konklusjon: {
    funksjon: 'kildesak_teknisk_konklusjon',
    felt: { funn: nummer, versjon: nummer, konklusjon: enAv(...KONKLUSJONER), begrunnelse: tekst(10, 5000), bevis: valgfri(objekt) },
  },
  faglig_sporsmal: { funksjon: 'kildesak_faglig_sporsmal', felt: { funn: nummer, versjon: nummer, sporsmal: objekt } },
  brukervarsel: { funksjon: 'kildesak_brukervarsel', felt: { funn: nummer, versjon: nummer, tekst: valgfri(tekst(10, 300)), regler: valgfri(liste) } },
  tiltak: {
    funksjon: 'kildesak_tiltak',
    felt: { tiltak: nummer, status: enAv('pagar', 'utfort', 'kontrollert', 'feilet'), bevis: valgfri(tekst(5, 2000)), lenke: valgfri(tekst(9, 500)) },
  },
  avslutt_prove: { funksjon: 'kildesak_avslutt_prove', felt: { funn: nummer, versjon: nummer, bevis: tekst(10, 5000) } },
} as const satisfies Record<string, { funksjon: string; felt: Record<string, Felt> }>

export type Agentoppgave = keyof typeof AGENTOPPGAVER

export const erAgentoppgave = (x: unknown): x is Agentoppgave => typeof x === 'string' && Object.hasOwn(AGENTOPPGAVER, x)

/** Argumentene til databasefunksjonen, eller `null` når et felt mangler eller har feil form. */
export function agentargumenter(oppgave: Agentoppgave, innhold: Record<string, unknown>): Record<string, unknown> | null {
  const argumenter: Record<string, unknown> = {}
  for (const [navn, sjekk] of Object.entries(AGENTOPPGAVER[oppgave].felt) as [string, Felt][]) {
    const verdi = sjekk(innhold[navn])
    if (verdi === AVVIST) return null
    argumenter[navn] = verdi
  }
  const av = tekst(2, 200)(innhold.av)
  if (av === AVVIST) return null
  argumenter.agent = av
  return argumenter
}

/** Utfører oppgaven; databasen svarer med sakens nye versjon (eller tiltakets nye status). */
export async function utforAgentoppgave(kall: Databasekall, oppgave: Agentoppgave, argumenter: Record<string, unknown>): Promise<unknown> {
  return kall(AGENTOPPGAVER[oppgave].funksjon, argumenter)
}
