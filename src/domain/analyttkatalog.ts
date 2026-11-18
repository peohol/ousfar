import { displayName } from './names'
import type { Referanseomrade } from './piller'
import { adresse, fortolkningsrute } from './rute'
import type { Analyte, Analyttmodul, Antihypertensivgrenser, Interval, MeasuringRange } from '../types'

/**
 * Analyttkatalogen til fagmiljøet fortolkningen gjelder (arbeidskonteksten):
 * analysemetodene, oppføringene søket i fortolkningen viser, og analyttkodene
 * hver av dem dekker, med referanseområdet fortolkningen viser for koden.
 *
 * Fortolkningen er et eget domene, helt skilt fra fagsidene: katalogen
 * kjenner ingen stoffer, fagsider eller datakort, og ingenting her lenker
 * dit eller leser derfra (`docs/domener.md`).
 *
 * Katalogen er laboratoriets egen og står i databasen per fagmiljø
 * (`public.les_analyttkatalog()`, docs/fagmiljoer.md, «Analyttkatalogen per
 * fagmiljø»). Appen har ingen katalog i klientpakken: et fagmiljø uten egen
 * katalog får en tom, og fortolkningen sier fra i stedet for å bruke et annet
 * fagmiljøs.
 */

/** Hvordan en oppføring fortolkes: med konsentrasjonsbånd eller i en egen modul. */
export type Fortolkningstype = 'konsentrasjon' | 'scenario' | 'thc' | 'etg'

export const FORTOLKNINGSTYPER: readonly Fortolkningstype[] = ['konsentrasjon', 'scenario', 'thc', 'etg']

/** En analyttkode og navnet den står med i lister og menyer. */
export interface Katalogkode {
  kode: string
  navn: string
}

/**
 * En analyttkode slik katalogen har den, med referanseområdet fortolkningen
 * viser for den (pillen over knappene i steg 2), eller `null` når den ikke
 * har noe. Området er fagmiljøets eget og står i katalogen, ikke på
 * fagsidene.
 */
export interface Katalogkodedata extends Katalogkode {
  referanseomrade: Referanseomrade | null
}

export interface Analysemetode {
  /** Koden metoden rekvireres med, f.eks. «SPFA». */
  kode: string
  /** Hva metoden er, i klartekst. */
  beskrivelse: string
}

/** Fagmiljøet katalogen hører til. */
export interface Katalogfagmiljo {
  id: string
  navn: string
}

/** En oppføring i katalogen, slik databasen har den. */
export interface Katalogoppforing {
  /** Nøkkelen i fagmiljøet: koden for en konsentrasjonsanalytt, ellers modulen (regelsettets `modul`). */
  nokkel: string
  type: Fortolkningstype
  navn: string
  visningsnavn: string
  /** Linja under navnet i en fortolkningsmodul. */
  undertittel: string | null
  komponenter: string[]
  gruppe: string
  analysemetode: string
  kategori: string
  enhet: string
  maleomrade: MeasuringRange
  antihypertensiv: Antihypertensivgrenser | null
  aliaser: string[]
  /** Analyttkodene oppføringen dekker, i rekkefølge. */
  koder: Katalogkodedata[]
}

/**
 * Det fortolkningen trenger for å finne referanseområdene på fagsidene, slik
 * appen gjorde før de kom i katalogen: hvilket kort på siden til hvilket
 * stoff hver kode brukte. Bare i et svar fra en database der migrasjonen
 * `20261118090000_fortolkning_skilt_fra_fagsidene.sql` ikke er kjørt ennå
 * (`docs/domener.md`, «Overgangen»; `src/katalog/referanseomrader.ts`).
 * Fjernes med overgangen (#405).
 */
export interface Eldrekatalog {
  /** Kortet hver kode brukte: sidens egne (`gjelder: null`) eller forbindelsens, på siden til det primære stoffet. */
  bruk: { kode: string; stoff: string; gjelder: string | null }[]
  /** Forbindelsen hver kode måler, for et kort med en analyttkode i `gjelder` fra før (#405). */
  forbindelser: ReadonlyMap<string, string>
}

/** Katalogen slik databasen gir den. */
export interface Katalogdata {
  fagmiljo: Katalogfagmiljo | null
  metoder: Analysemetode[]
  oppforinger: Katalogoppforing[]
  /** Bare fra en database uten referanseområdene i katalogen (`Eldrekatalog`). */
  eldre?: Eldrekatalog
}

export const TOM_KATALOGDATA: Katalogdata = { fagmiljo: null, metoder: [], oppforinger: [] }

/**
 * En laboratorieanalytt i fortolkningssystemet: koden laboratoriet
 * rapporterer, og det fortolkningen trenger å vite om den.
 *
 * Analytten er ikke en fagside og peker ikke på noen.
 */
export interface Laboratorieanalytt {
  /** Analyttkoden, f.eks. «AMTNORSUM». */
  kode: string
  /** Navnet i fortolkningen, f.eks. «Amitriptylin + nortriptylin». */
  navn: string
  analysemetode: string
  /** Kategorien i datasettet, f.eks. «ARB». Tom når metoden ikke er delt opp. */
  kategori: string
  /**
   * Stoffene analysen måler, slik datasettet navngir dem. Én for de fleste,
   * flere for sumanalysene.
   */
  komponenter: string[]
  /** Oppføringen som åpner fortolkningen — den samme som søket gir. */
  fortolkning: Analyte
  /** Referanseområdet fortolkningen viser (`Katalogkodedata.referanseomrade`), eller `null`. */
  referanseomrade: Referanseomrade | null
}

export interface Analyttkatalog {
  /** Fagmiljøet katalogen hører til; `null` når det ikke finnes noe. */
  fagmiljo: Katalogfagmiljo | null
  /** Analysemetodene, i den rekkefølgen filteret viser dem. */
  metoder: readonly Analysemetode[]
  /** Alt fortolkningen kan fortolke, som søkeoppføringer, i katalogens rekkefølge. */
  fortolkninger: readonly Analyte[]
  /** Alle analyttene, én per kode, i katalogens rekkefølge. */
  oppforinger: Laboratorieanalytt[]
  finn: (kode: string) => Laboratorieanalytt | undefined
  /** Søkeoppføringen for en modul (`Analyttmodul.id`). */
  modulMedId: (id: string) => Analyte | undefined
  /** Bare fra en database uten referanseområdene i katalogen (`Eldrekatalog`). */
  eldre?: Eldrekatalog
}

/** Kodene i en oppføring satt sammen, slik `Analyte.kode` har dem: «DIAZ · DMI · OXA». */
export const KODESKILLE = ' · '

/** Søkeoppføringen en katalogoppføring gir. */
export function tilFortolkning(o: Katalogoppforing): Analyte {
  const modul: Analyttmodul | undefined =
    o.type === 'konsentrasjon'
      ? undefined
      : { type: o.type, id: o.nokkel, analytter: o.koder.map(({ kode, navn }) => ({ kode, navn })), ...(o.undertittel !== null && { undertittel: o.undertittel }) }
  return {
    kode: o.koder.map((k) => k.kode).join(KODESKILLE),
    navn: o.navn,
    visningsnavn: o.visningsnavn,
    komponenter: [...o.komponenter],
    gruppe: o.gruppe,
    analysemetode: o.analysemetode,
    kategori: o.kategori,
    enhet: o.enhet,
    maleomrade: o.maleomrade,
    ...(o.antihypertensiv !== null && { antihypertensiv: o.antihypertensiv }),
    aliaser: [...o.aliaser],
    ...(modul && { modul }),
  }
}

/**
 * Kodene en søkeoppføring dekker, med navnene sine: ett per analyttkode.
 * De fleste oppføringene er én analytt med én kode. Modulene som dekker
 * flere koder (DIAZ · DMI · OXA), har hver kode med stoffets eget navn.
 */
export function kodeneI(analyte: Analyte): Katalogkode[] {
  return analyte.modul ? analyte.modul.analytter : [{ kode: analyte.kode, navn: displayName(analyte) }]
}

function laboratorieanalytter(analyte: Analyte, koder: ReadonlyMap<string, Katalogkodedata>): Laboratorieanalytt[] {
  return kodeneI(analyte).map(({ kode, navn }) => {
    const hele = kode === analyte.kode
    return {
      kode,
      navn,
      analysemetode: analyte.analysemetode,
      kategori: analyte.kategori,
      komponenter: hele && analyte.komponenter.length > 0 ? [...analyte.komponenter] : [navn],
      fortolkning: analyte,
      referanseomrade: koder.get(kode)?.referanseomrade ?? null,
    }
  })
}

/** Katalogen appen bruker, bygd av det databasen ga. */
export function byggKatalog(data: Katalogdata): Analyttkatalog {
  const fortolkninger = data.oppforinger.map(tilFortolkning)
  const koder = new Map(data.oppforinger.flatMap((o) => o.koder.map((k) => [k.kode, k] as const)))
  const oppforinger = fortolkninger.flatMap((f) => laboratorieanalytter(f, koder))
  const perKode = new Map(oppforinger.map((o) => [o.kode, o]))
  const perModul = new Map(fortolkninger.flatMap((f) => (f.modul ? [[f.modul.id, f] as const] : [])))
  return {
    fagmiljo: data.fagmiljo,
    metoder: data.metoder,
    fortolkninger,
    oppforinger,
    finn: (kode) => perKode.get(kode.trim().toUpperCase()),
    modulMedId: (id) => perModul.get(id),
    ...(data.eldre && { eldre: data.eldre }),
  }
}

export const TOM_KATALOG = byggKatalog(TOM_KATALOGDATA)

/**
 * Analyttene en fortolkningsmodul fortolker, i katalogens rekkefølge: én for
 * de fleste, og hver kode for modulene som dekker flere (DIAZ · DMI · OXA).
 * Det er reglene for dem fortolkningssiden redigerer.
 */
export function analytterForFortolkning(fortolkning: Analyte, katalog: Analyttkatalog): Laboratorieanalytt[] {
  return katalog.oppforinger.filter((a) => a.fortolkning.kode === fortolkning.kode)
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
 * Referanseområdet for hver analyttkode som har et, slik steg 2 viser det.
 * For en katalog fra en database uten dem, se `lesReferanseomrader`.
 */
export function referanseomraderI(katalog: Analyttkatalog): ReadonlyMap<string, Referanseomrade> {
  return new Map(katalog.oppforinger.flatMap((a) => (a.referanseomrade ? [[a.kode, a.referanseomrade] as const] : [])))
}

/* --- Svaret fra databasen ----------------------------------------------- */

/** Svaret fra databasen hadde ikke formen katalogen skal ha. */
export class UgyldigKatalog extends Error {}

type Felt = Record<string, unknown>

function objekt(verdi: unknown, hva: string): Felt {
  if (typeof verdi !== 'object' || verdi === null || Array.isArray(verdi)) throw new UgyldigKatalog(`${hva} mangler.`)
  return verdi as Felt
}

function liste(verdi: unknown, hva: string): unknown[] {
  if (!Array.isArray(verdi)) throw new UgyldigKatalog(`${hva} mangler.`)
  return verdi
}

function tekst(f: Felt, navn: string, hva: string): string {
  const v = f[navn]
  if (typeof v !== 'string') throw new UgyldigKatalog(`${hva}: ${navn} mangler.`)
  return v
}

function tekster(f: Felt, navn: string, hva: string): string[] {
  return liste(f[navn], `${hva}: ${navn}`).map((v) => {
    if (typeof v !== 'string') throw new UgyldigKatalog(`${hva}: ${navn} har noe som ikke er tekst.`)
    return v
  })
}

function tallEllerNull(f: Felt, navn: string, hva: string): number | null {
  const v = f[navn]
  if (v === null) return null
  if (typeof v !== 'number' || !Number.isFinite(v)) throw new UgyldigKatalog(`${hva}: ${navn} er ikke et tall.`)
  return v
}

function intervall(verdi: unknown, hva: string): Interval {
  const f = objekt(verdi, hva)
  return { fra: tallEllerNull(f, 'fra', hva), til: tallEllerNull(f, 'til', hva), merknad: tekst(f, 'merknad', hva), tekst: tekst(f, 'tekst', hva) }
}

function maleomrade(verdi: unknown, hva: string): MeasuringRange {
  const f = objekt(verdi, `${hva}: måleområdet`)
  return {
    tekst: tekst(f, 'tekst', hva),
    deler: liste(f.deler, `${hva}: delene av måleområdet`).map((d) => {
      const del = objekt(d, hva)
      const kode = del.kode
      if (kode !== null && typeof kode !== 'string') throw new UgyldigKatalog(`${hva}: koden i måleområdet er ugyldig.`)
      return { kode, ...intervall(del, hva) }
    }),
  }
}

/**
 * Referanseområdet til en kode. Et område uten noen grense gir `null`. Et
 * svar fra før katalogen hadde det (`referanseomrade` mangler) gir også
 * `null` her; da finnes områdene med `Eldrekatalog`.
 */
function referanseomrade(verdi: unknown, hva: string): Referanseomrade | null {
  if (verdi === null || verdi === undefined) return null
  const f = objekt(verdi, `${hva}: referanseområdet`)
  const nedre = tallEllerNull(f, 'nedre', hva)
  const ovre = tallEllerNull(f, 'ovre', hva)
  const enhet = f.enhet ?? ''
  if (typeof enhet !== 'string') throw new UgyldigKatalog(`${hva}: enheten i referanseområdet er ikke tekst.`)
  return nedre === null && ovre === null ? null : { nedre, ovre, enhet }
}

function antihypertensiv(verdi: unknown, hva: string): Antihypertensivgrenser | null {
  if (verdi === null || verdi === undefined) return null
  const f = objekt(verdi, hva)
  const grense = f.pavisningsgrense
  if (typeof grense !== 'number' || !Number.isFinite(grense)) throw new UgyldigKatalog(`${hva}: påvisningsgrensen er ikke et tall.`)
  return { pavisningsgrense: grense, terapiomrade: f.terapiomrade === null ? null : intervall(f.terapiomrade, hva) }
}

function oppforing(verdi: unknown): Katalogoppforing {
  const f = objekt(verdi, 'En oppføring i katalogen')
  const nokkel = tekst(f, 'nokkel', 'En oppføring i katalogen')
  const hva = `Oppføringen ${nokkel}`
  const type = tekst(f, 'type', hva) as Fortolkningstype
  if (!FORTOLKNINGSTYPER.includes(type)) throw new UgyldigKatalog(`${hva} har en ukjent type.`)
  const koder = liste(f.koder, `${hva}: kodene`).map((k) => {
    const kode = objekt(k, hva)
    return {
      kode: tekst(kode, 'kode', hva),
      navn: tekst(kode, 'navn', hva),
      referanseomrade: referanseomrade(kode.referanseomrade, `${hva}, ${tekst(kode, 'kode', hva)}`),
    }
  })
  if (koder.length === 0) throw new UgyldigKatalog(`${hva} har ingen analyttkoder.`)
  const undertittel = f.undertittel ?? null
  if (undertittel !== null && typeof undertittel !== 'string') throw new UgyldigKatalog(`${hva}: undertittelen er ugyldig.`)
  return {
    nokkel,
    type,
    navn: tekst(f, 'navn', hva),
    visningsnavn: tekst(f, 'visningsnavn', hva),
    undertittel,
    komponenter: tekster(f, 'komponenter', hva),
    gruppe: tekst(f, 'gruppe', hva),
    analysemetode: tekst(f, 'analysemetode', hva),
    kategori: tekst(f, 'kategori', hva),
    enhet: tekst(f, 'enhet', hva),
    maleomrade: maleomrade(f.maleomrade, hva),
    antihypertensiv: antihypertensiv(f.antihypertensiv, hva),
    aliaser: tekster(f, 'aliaser', hva),
    koder,
  }
}

/**
 * `Eldrekatalog` i et svar der kodene ikke har `referanseomrade`: koblingene
 * og datakortbruken databasen ga fram til `20261118090000`, lest slik appen
 * leste dem før (`datakort` er `egne` eller `forbindelse`).
 */
function eldrekatalog(f: Felt, oppforinger: readonly unknown[]): Eldrekatalog | undefined {
  const koder = oppforinger.flatMap((o) => liste(objekt(o, 'En oppføring i katalogen').koder, 'Kodene').map((k) => objekt(k, 'En kode')))
  if (koder.every((k) => 'referanseomrade' in k)) return undefined
  const valgfri = (k: Felt, navn: string) => (typeof k[navn] === 'string' ? (k[navn] as string) : null)
  const kortet = new Map<string, string | null>(
    koder.flatMap((k): [string, string | null][] => {
      const kode = tekst(k, 'kode', 'En kode')
      const datakort = valgfri(k, 'datakort')
      const forbindelse = valgfri(k, 'forbindelse')
      if (datakort === 'egne') return [[kode, null]]
      return datakort === 'forbindelse' && forbindelse ? [[kode, forbindelse]] : []
    }),
  )
  const bruk = liste(f.koblinger ?? [], 'Koblingene').flatMap((verdi) => {
    const kobling = objekt(verdi, 'En kobling')
    const kode = tekst(kobling, 'kode', 'En kobling')
    if (kobling.primar !== true || !kortet.has(kode)) return []
    return [{ kode, stoff: tekst(kobling, 'stoff', 'En kobling'), gjelder: kortet.get(kode)! }]
  })
  const forbindelser = new Map([...kortet].flatMap(([kode, gjelder]): [string, string][] => (gjelder === null ? [] : [[kode, gjelder]])))
  return { bruk, forbindelser }
}

/**
 * Katalogen i svaret fra `les_analyttkatalog()`. Et svar som ikke har
 * formen, avvises i sin helhet: fortolkningen skal heller stoppe enn bruke
 * en katalog som kan være feil.
 */
export function lesKatalogdata(svar: unknown): Katalogdata {
  const f = objekt(svar, 'Analyttkatalogen')
  const fagmiljo = f.fagmiljo === null ? null : objekt(f.fagmiljo, 'Fagmiljøet')
  const metoder = liste(f.metoder, 'Analysemetodene').map((m) => {
    const metode = objekt(m, 'En analysemetode')
    return { kode: tekst(metode, 'kode', 'En analysemetode'), beskrivelse: tekst(metode, 'beskrivelse', 'En analysemetode') }
  })
  const oppforinger = liste(f.oppforinger, 'Oppføringene')
  const eldre = eldrekatalog(f, oppforinger)
  return {
    fagmiljo: fagmiljo && { id: tekst(fagmiljo, 'id', 'Fagmiljøet'), navn: tekst(fagmiljo, 'navn', 'Fagmiljøet') },
    metoder,
    oppforinger: oppforinger.map(oppforing),
    ...(eldre && { eldre }),
  }
}
