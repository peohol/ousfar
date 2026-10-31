/**
 * Verktøyregisteret for OUSFAR Verktøy (P6.1 i `docs/verktøy-utviklingsplan.md`):
 * hvert verktøy med stabil ID, norsk navn, søkealiaser, adresse og
 * virkestoffene som kan velges i det. Sidemenyen, søket og verktøysidene
 * leser alle herfra, så et nytt verktøy legges til med én oppføring.
 *
 * Virkestoffene er de kildetabellen har som eget virkestoff i P1-kartleggingen
 * (`src/data/verktoy/virkestoffkartlegging.json`), og medlemmene i gruppene
 * der. En gruppe (som «Rest AP») er aldri et valg i seg selv, og det som er
 * utelatt (johannesurt) kommer aldri med.
 */
import kartleggingsfil from '../data/verktoy/virkestoffkartlegging.json'
import type { Ikonnavn } from '../components/ikon/register'
import { fold, sokeord } from '../faginnhold/sok'
import { erSperret, type Kildeformulering, type Virkestoffkartlegging } from './kartlegging'
import type { Tabell_id } from './kildetabeller'

export const KARTLEGGING = kartleggingsfil as unknown as Virkestoffkartlegging

export type Verktoytype = 'seponering' | 'bytte'

export interface Verktoy {
  /** Stabil ID, også i adressen (`#/verktoy/<id>`). Endres aldri. */
  id: string
  navn: string
  /** Én setning om hva verktøyet gjør. */
  beskrivelse: string
  type: Verktoytype
  /** Kildetabellen virkestoffene hentes fra. */
  tabell: Tabell_id
  ikon: Ikonnavn
  /** Andre ord verktøyet skal finnes på i søket. */
  aliaser: readonly string[]
}

export const VERKTOY: readonly Verktoy[] = [
  {
    id: 'trappe-ned-antidepressiv',
    navn: 'Trappe ned antidepressiv',
    beskrivelse: 'Beregnet forslag til de første trinnene når ett antidepressivum skal seponeres.',
    type: 'seponering',
    tabell: 'SwitchAntidepressants',
    ikon: 'ned',
    aliaser: ['nedtrapping', 'seponering', 'seponere', 'avslutte antidepressiv', 'antidepressiva', 'taper', 'tapering'],
  },
  {
    id: 'bytte-antidepressiv',
    navn: 'Bytte antidepressiv',
    beskrivelse: 'Beregnet forslag til starten på et bytte fra ett antidepressivum til et annet.',
    type: 'bytte',
    tabell: 'SwitchAntidepressants',
    ikon: 'rotate',
    aliaser: ['bytte antidepressiva', 'kryssnedtrapping', 'krysstitrering', 'switch', 'skifte antidepressiv'],
  },
  {
    id: 'bytte-antipsykotikum',
    navn: 'Bytte antipsykotikum',
    beskrivelse: 'Beregnet forslag til bytte mellom antipsykotika, også til depotinjeksjon.',
    type: 'bytte',
    tabell: 'SwitchAntipsychotics',
    ikon: 'depot',
    aliaser: ['bytte antipsykotika', 'nevroleptika', 'depot', 'depotinjeksjon', 'kryssnedtrapping', 'switch'],
  },
]

export const verktoyFor = (id: string | undefined): Verktoy | undefined => VERKTOY.find((v) => v.id === id)

/* --- Virkestoffene ------------------------------------------------------------ */

/** Et virkestoff som kan velges i et verktøy, med formuleringene kilden har det i. */
export interface Verktoyvirkestoff {
  nokkel: string
  navn: string
  /** Navn og stavemåter det også kan skrives som. */
  aliaser: readonly string[]
  /** Formuleringene i kildetabellen; flere betyr at formuleringen må velges. */
  formuleringer: readonly Kildeformulering[]
}

/** Hva formuleringene i kildetabellene heter i valgene. */
export const FORMULERINGSNAVN: Record<Kildeformulering, string> = {
  standard: 'Peroral',
  LA: 'Depotinjeksjon',
  ER: 'Depotinjeksjon (paliperidonpalmitat)',
  MA: 'Middels langtidsvirkende injeksjon',
}

const REKKEFOLGE: readonly Kildeformulering[] = ['standard', 'LA', 'ER', 'MA']

/** Virkestoffene i verktøyets kildetabell, alfabetisk: egne rader og medlemmene i gruppene. */
export function virkestoffvalg(verktoy: Verktoy, k: Virkestoffkartlegging = KARTLEGGING): Verktoyvirkestoff[] {
  const formuleringer = new Map<string, Set<Kildeformulering>>()
  const legg = (nokkel: string, f: Kildeformulering) => formuleringer.set(nokkel, (formuleringer.get(nokkel) ?? new Set()).add(f))
  for (const i of k.kildeidentiteter[verktoy.tabell]) {
    if (i.type === 'virkestoff') legg(i.virkestoff, i.kildeformulering)
    // Et gruppemedlem har gruppens rad, som er uten tillegg.
    if (i.type === 'gruppe') for (const m of k.grupper.find((g) => g.id === i.gruppe)?.medlemmer ?? []) legg(m.virkestoff, 'standard')
  }
  return [...formuleringer]
    .flatMap(([nokkel, f]) => {
      const v = k.virkestoffer.find((x) => x.nokkel === nokkel)
      if (!v || erSperret(k, v.navn) || erSperret(k, nokkel)) return []
      return [{ nokkel, navn: v.navn, aliaser: v.aliaser, formuleringer: REKKEFOLGE.filter((x) => f.has(x)) }]
    })
    .sort((a, b) => a.navn.localeCompare(b.navn, 'nb'))
}

/** Virkestoffet et navn eller alias i valgene står for, uansett store bokstaver og aksenter. */
export function finnVirkestoff(valg: readonly Verktoyvirkestoff[], tekst: string): Verktoyvirkestoff | undefined {
  const s = fold(tekst.trim())
  if (!s) return undefined
  return valg.find((v) => fold(v.navn) === s || v.nokkel === s || v.aliaser.some((a) => fold(a) === s))
}

/** FEST-ID-ene til moderstoffene for virkestoffene, fra kartleggingen. */
export function festkoblinger(nokler: readonly string[], k: Virkestoffkartlegging = KARTLEGGING): Record<string, string[]> {
  return Object.fromEntries(nokler.map((n) => [n, k.virkestoffer.find((v) => v.nokkel === n)?.fest ?? []]))
}

/* --- Søket ------------------------------------------------------------------- */

export interface Verktoytreff {
  verktoy: Verktoy
  /** Aliaset som ga treffet, når det ikke var navnet. */
  alias?: string
}

/**
 * Verktøyene et søk finner: hvert ord i søket må være begynnelsen på et ord i
 * navnet eller i ett av aliasene. Navnet går foran aliasene, og rekkefølgen er
 * registerets.
 */
export function sokVerktoy(sporring: string, register: readonly Verktoy[] = VERKTOY): Verktoytreff[] {
  const ord = sokeord(sporring)
  if (ord.length === 0) return []
  const passer = (tekst: string) => {
    const ordene = fold(tekst).split(/[^\p{L}\p{N}]+/u)
    return ord.every((o) => ordene.some((w) => w.startsWith(o)))
  }
  return register.flatMap((verktoy): Verktoytreff[] => {
    if (passer(verktoy.navn)) return [{ verktoy }]
    const alias = verktoy.aliaser.find(passer)
    return alias ? [{ verktoy, alias }] : []
  })
}
