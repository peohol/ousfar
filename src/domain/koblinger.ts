import type { Analyttkatalog, Laboratorieanalytt } from './analyttkatalog'
import { menyanalytter } from './analysemetoder'
import { adresse, fortolkningsrute, stoffadresse } from './rute'
import { iSetning } from './names'
import { ANDRE_STOFFER, type Stoff, type StoffAnalyttKobling, type Stoffregister } from './stoffregister'
import type { Analyte } from '../types'
import { FORBINDELSER, type Forbindelsesregister } from '../kjemi/forbindelser'

/**
 * Veiene mellom de to domenene: stoffregisteret (fagsidene, etter stoffets
 * nøkkel) og fortolkningssystemet (laboratorieanalyttene, etter koden).
 *
 * Alt går gjennom de eksplisitte koblingene i registeret. Ingenting her
 * gjetter en kobling av at navnene ligner, og ingen av sidene bytter identitet:
 *
 *   Fortolkning:  HBUP → HBUP-reglene
 *   Fagstoff:     bupropion → Bupropion-monografien
 *   Kobling:      bupropion ↔ HBUP (metabolitt)
 */

/** En kobling med analytten den peker på, slik stoffsiden viser den. */
export interface KobletAnalytt {
  kobling: StoffAnalyttKobling
  analytt: Laboratorieanalytt
}

/** Analyttene koblet til stoffet, i registerets rekkefølge. Koder fortolkningen ikke kjenner, utelates. */
export function analytterForStoff(
  slug: string,
  register: Stoffregister,
  katalog: Analyttkatalog,
): KobletAnalytt[] {
  return register.analytterFor(slug).flatMap((kobling) => {
    const analytt = katalog.finn(kobling.kode)
    return analytt ? [{ kobling, analytt }] : []
  })
}

/**
 * Analyttene stoffet er primært stoff for, hovedanalytten først. Det er dem
 * stoffsiden viser fortolkningsreglene og datakortene for.
 */
export function primareAnalytter(
  slug: string,
  register: Stoffregister,
  katalog: Analyttkatalog,
): Laboratorieanalytt[] {
  return analytterForStoff(slug, register, katalog)
    .filter(({ kobling }) => kobling.primar)
    .map(({ analytt }) => analytt)
}

/** En fortolkningsmodul og analyttene i den. */
export interface Fortolkningsmodul {
  fortolkning: Analyte
  analytter: Laboratorieanalytt[]
}

/**
 * Fortolkningsmodulene til stoffets primære analytter, i rekkefølge. Analytter
 * som deler modul (DIAZ og DMI), står sammen.
 */
export function fortolkningsmoduler(
  slug: string,
  register: Stoffregister,
  katalog: Analyttkatalog,
): Fortolkningsmodul[] {
  const moduler: Fortolkningsmodul[] = []
  for (const analytt of primareAnalytter(slug, register, katalog)) {
    const kjent = moduler.find((m) => m.fortolkning === analytt.fortolkning)
    if (kjent) kjent.analytter.push(analytt)
    else moduler.push({ fortolkning: analytt.fortolkning, analytter: [analytt] })
  }
  return moduler
}

/**
 * Analyttene en fortolkningsmodul fortolker, i katalogens rekkefølge: én for
 * de fleste, og hver kode for modulene som dekker flere (DIAZ · DMI · OXA).
 * Det er reglene for dem fortolkningssiden redigerer.
 */
export function analytterForFortolkning(
  fortolkning: Analyte,
  katalog: Analyttkatalog,
): Laboratorieanalytt[] {
  return katalog.oppforinger.filter((a) => a.fortolkning.kode === fortolkning.kode)
}

/**
 * Fortolkningsmodulen «Åpne fortolkning» på stoffsiden åpner: den ene modulen
 * stoffets primære analytter hører til. `undefined` når stoffet ikke har noen,
 * eller når de hører til flere — da åpnes hver fra koden sin på siden.
 */
export function fortolkningForStoff(
  slug: string,
  register: Stoffregister,
  katalog: Analyttkatalog,
): Analyte | undefined {
  const moduler = fortolkningsmoduler(slug, register, katalog)
  return moduler.length === 1 ? moduler[0]!.fortolkning : undefined
}

/**
 * Stoffsidene en fortolkningsmodul fører til: stoffene kodene i modulen
 * primært hører til, hvert én gang, i kodenes rekkefølge. EtG og EtS fører
 * begge til Etanol; DIAZ · DMI · OXA fører til Diazepam og Oksazepam.
 */
export function stofferForFortolkning(analyte: Analyte, register: Stoffregister): Stoff[] {
  const stoffer = new Map<string, Stoff>()
  for (const { kode } of menyanalytter(analyte)) {
    const stoff = register.primartStoffFor(kode)
    if (stoff) stoffer.set(stoff.slug, stoff)
  }
  return [...stoffer.values()]
}

/**
 * Adressen til fortolkningssiden der reglene for en analyttkode fortolkes og
 * redigeres: modulen koden hører til. `undefined` når appen ikke kjenner koden.
 */
export function fortolkningsadresseForAnalytt(kode: string, katalog: Analyttkatalog): string | undefined {
  const analytt = katalog.finn(kode)
  return analytt && adresse(fortolkningsrute(analytt.fortolkning.kode))
}

/**
 * Adressen til fagsiden en analyttkode lenker til: det primære stoffets side.
 * `undefined` når koden ikke har noe primært stoff — da finnes det ingen
 * fagside å lenke til, og det lages ingen.
 */
export function stoffadresseForAnalytt(
  kode: string,
  register: Stoffregister,
  sted: readonly string[] = [],
): string | undefined {
  const stoff = register.primartStoffFor(kode)
  return stoff && stoffadresse(stoff.slug, sted)
}

/** Et referanseområdekort slik databasen gir det (`les_stoffreferanseomrader`). */
export interface Stoffreferanseomrade {
  /** Nøkkelen til stoffsiden kortet står på. */
  stoff: string
  /** Forbindelsen kortet gjelder (`data.gjelder`), eller `null` for sidens egne kort. */
  gjelder: string | null
  verdi: unknown
}

/** En analytt slik koblingen til datakortene trenger den. */
export type Datakortanalytt = Pick<Laboratorieanalytt, 'kode' | 'forbindelse' | 'datakort'>

/**
 * Datakortene på siden til analysens primære stoff som analysen bruker, som
 * `gjelder` på kortene: `null` for sidens egne, nøkkelen til forbindelsen for
 * en metabolitt med egne tall, og `undefined` når den ikke bruker noen.
 *
 * Datakortene er felles for alle fagmiljøer og vet ingenting om laboratorienes
 * koder; et kort for en metabolitt sier hvilken forbindelse det gjelder
 * (O-desmetyltramadol på tramadolsiden). Hvilke kort en analyse bruker, sier
 * fagmiljøets egen katalog uttrykkelig for hver kode, så ingen kode får et
 * kort av at den står først, og en ny katalog får ingen før det er sagt.
 */
export function datakortnokkel(analytt: Datakortanalytt | undefined): string | null | undefined {
  if (analytt?.datakort === 'egne') return null
  if (analytt?.datakort === 'forbindelse' && analytt.forbindelse) return analytt.forbindelse
  return undefined
}

/**
 * Analyttkodene som står i `gjelder` på datakort fra før kortene ble koblet til
 * forbindelsen, med forbindelsen koden måler. Kortene er felles, så hvert
 * fagmiljø leser dem slik, også uten koden i sin katalog. I produksjonen er det
 * bare `OTRAM` (lest 15.11.2026); testen holder lista lik katalogen til OUS
 * Klinisk farmakologi. Fjernes når kortene er skrevet om (#405).
 */
export const ELDRE_DATAKORTKODER: ReadonlyMap<string, string> = new Map([['OTRAM', 'o-desmetyltramadol']])

/**
 * Forbindelsen et datakort gjelder (`gjelder` på kortet), også for et kort som
 * fra før har en analyttkode der: det regnes som kortet for forbindelsen koden
 * måler, etter katalogen eller ellers `ELDRE_DATAKORTKODER`. Overgangen varer
 * til kortene er skrevet om, når appen før 1.133.4 ikke er i bruk lenger
 * (#405, `docs/fagmiljoer.md`, «Overgangen»); fram til da finner den gamle
 * appen kortet med koden.
 */
export function kortetsForbindelse(
  gjelder: string | null,
  finn: (kode: string) => Datakortanalytt | undefined,
): string | null {
  if (gjelder === null) return null
  const analytt = finn(gjelder)
  if (analytt?.datakort === 'forbindelse' && analytt.forbindelse) return analytt.forbindelse
  return ELDRE_DATAKORTKODER.get(gjelder) ?? gjelder
}

/** Det koblingen til datakortene trenger av en analyttkatalog: koblingene, og analyttene etter koden. */
export interface Datakortkatalog {
  koblinger: readonly Pick<StoffAnalyttKobling, 'kode' | 'stoff' | 'primar'>[]
  finn: (kode: string) => Datakortanalytt | undefined
}

/**
 * Referanseområdet for hver analyttkode, slik fortolkningen viser det: kortet
 * på det primære stoffets side som analysen bruker (`datakortnokkel`). En
 * metabolitt på moderstoffets side får aldri moderstoffets referanseområde,
 * og et stoff uten analytt gir ingen.
 */
export function referanseomraderPerAnalytt(
  kort: readonly Stoffreferanseomrade[],
  katalog: Datakortkatalog,
): Map<string, unknown> {
  const svar = new Map<string, unknown>()
  for (const { kode, stoff } of katalog.koblinger.filter((k) => k.primar)) {
    const gjelder = datakortnokkel(katalog.finn(kode))
    if (gjelder === undefined) continue
    const treff = kort.find((k) => k.stoff === stoff && kortetsForbindelse(k.gjelder, katalog.finn) === gjelder)
    if (treff) svar.set(kode, treff.verdi)
  }
  return svar
}

/** Analyttene etter koden, slik `kortetsForbindelse` slår opp i dem. */
export function analyttFinner<A extends Datakortanalytt>(analytter: readonly A[]): (kode: string) => A | undefined {
  return (kode) => analytter.find((a) => a.kode === kode)
}

/** En plass for datakortene i «Viktige data»: sidens egne, eller dem for en forbindelse. */
export interface Datakorteier {
  /** Forbindelsen kortene gjelder (`data.gjelder`), eller `null` for sidens egne. */
  gjelder: string | null
  /** Navnet kortene merkes med når siden har kort for flere. */
  navn: string
}

/**
 * Plassene for datakortene på et stoffs fagside, sidens egne først: sidens
 * egne kort, en plass for hver forbindelse siden alt har kort for — uansett
 * fagmiljø, siden kortene er felles — og en for hver forbindelse fagmiljøets
 * primære analytter for stoffet bruker kort for (`datakortnokkel`), så de kan
 * legges inn. Forbindelsene står i registerets rekkefølge og merkes med
 * navnet analysen har i katalogen, ellers navnet i registeret.
 */
export function datakorteiere({
  stoff,
  stoffnavn,
  analytter,
  kortnokler,
  forbindelser = FORBINDELSER,
}: {
  stoff: string
  stoffnavn: string
  /** Stoffets primære analytter i arbeidskontekstens katalog (`primareAnalytter`). */
  analytter: readonly (Datakortanalytt & { navn?: string })[]
  /** `gjelder` på kortene siden har. */
  kortnokler: readonly (string | null)[]
  forbindelser?: Forbindelsesregister
}): Datakorteier[] {
  const finn = analyttFinner(analytter)
  const finnes = new Set(kortnokler.flatMap((k) => kortetsForbindelse(k, finn) ?? []))
  const nye = analytter.flatMap((a) => {
    const gjelder = datakortnokkel(a)
    return gjelder ? [gjelder] : []
  })
  const rekkefolge = forbindelser.forStoff(stoff).map((f) => f.nokkel)
  const plass = (nokkel: string) => {
    const i = rekkefolge.indexOf(nokkel)
    return i < 0 ? rekkefolge.length : i
  }
  const andre = [...new Set([...finnes, ...nye])].sort((a, b) => plass(a) - plass(b) || a.localeCompare(b, 'nb'))
  return [
    { gjelder: null, navn: stoffnavn },
    ...andre.map((gjelder) => ({
      gjelder,
      navn:
        analytter.find((a) => a.navn && datakortnokkel(a) === gjelder)?.navn ?? forbindelser.finn(gjelder)?.navn ?? gjelder,
    })),
  ]
}

/**
 * Linja under et stoff i søketreffene: kategorien i registeret og analyttene
 * stoffet er primært stoff for, som sekundær informasjon — f.eks.
 * «Antidepressiver › NDRI · analytt HBUP · hydroksybupropion». `undefined`
 * når det ikke er noe å si.
 */
export function stoffbeskrivelse(
  slug: string,
  register: Stoffregister,
  katalog: Analyttkatalog,
): string | undefined {
  const stoff = register.finn(slug)
  const kategori = register.kategorierFor(slug).find((k) => k.kategori !== ANDRE_STOFFER)
  const deler = [
    kategori && [kategori.kategori, kategori.underkategori].filter(Boolean).join(' › '),
    ...primareAnalytter(slug, register, katalog).map((a) =>
      stoff && a.navn.toLocaleLowerCase('nb') === stoff.navn.toLocaleLowerCase('nb')
        ? `analytt ${a.kode}`
        : `analytt ${a.kode} · ${iSetning(a.navn)}`,
    ),
  ].filter((d): d is string => Boolean(d))
  return deler.length > 0 ? deler.join(' · ') : undefined
}
