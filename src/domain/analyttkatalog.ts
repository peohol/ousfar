import { displayName } from './names'
import { FORBINDELSESNOKKEL } from '../enheter/konsentrasjon'
import type { Analyte, Analyttmodul, Antihypertensivgrenser, Interval, MeasuringRange } from '../types'

/**
 * Analyttkatalogen til fagmiljøet fortolkningen gjelder (arbeidskonteksten):
 * analysemetodene, oppføringene søket i fortolkningen viser, analyttkodene
 * hver av dem dekker, og koblingene fra kodene til stoffene i
 * stoffregisteret.
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
 * Hvilke av de felles datakortene på siden til kodens primære stoff analysen
 * bruker (referanseområdet fortolkningen viser): sidens egne (`egne`), eller
 * dem for forbindelsen analysen måler (`forbindelse`). Kortene gjelder serum;
 * en analyse de ikke gjelder for, bruker ingen (`null`).
 */
export type Datakortbruk = 'egne' | 'forbindelse'

export const DATAKORTBRUK: readonly Datakortbruk[] = ['egne', 'forbindelse']

/**
 * En analyttkode slik katalogen har den, med forbindelsen analysen måler —
 * nøkkelen i forbindelsesregisteret (`src/data/forbindelser.ts`), eller
 * `null` når den ikke er én forbindelse (sumanalysene) — og hvilke datakort
 * den bruker. Koblingen til de felles datakortene på fagsidene går gjennom
 * dette, aldri gjennom koden (`datakortnokkel` i `src/domain/koblinger.ts`).
 */
export interface Katalogkodedata extends Katalogkode {
  forbindelse: string | null
  datakort: Datakortbruk | null
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

/** En kobling fra en analyttkode til et stoff i stoffregisteret. */
export interface Analyttkoblingsdata {
  kode: string
  stoff: string
  relasjon: string
  primar: boolean
  merknad: string | null
}

/** Katalogen slik databasen gir den. */
export interface Katalogdata {
  fagmiljo: Katalogfagmiljo | null
  metoder: Analysemetode[]
  oppforinger: Katalogoppforing[]
  koblinger: Analyttkoblingsdata[]
}

export const TOM_KATALOGDATA: Katalogdata = { fagmiljo: null, metoder: [], oppforinger: [], koblinger: [] }

/**
 * En laboratorieanalytt i fortolkningssystemet: koden laboratoriet
 * rapporterer, og det fortolkningen trenger å vite om den.
 *
 * Analytten er ikke en fagside. Hvilke stoffer i stoffregisteret den gjelder,
 * står i koblingene i katalogen, og veien mellom de to domenene i
 * `src/domain/koblinger.ts`.
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
  /** Forbindelsen analysen måler (`Katalogkodedata.forbindelse`), eller `null`. */
  forbindelse: string | null
  /** Datakortene analysen bruker (`Katalogkodedata.datakort`), eller `null`. */
  datakort: Datakortbruk | null
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
  koblinger: readonly Analyttkoblingsdata[]
  finn: (kode: string) => Laboratorieanalytt | undefined
  /** Søkeoppføringen for en modul (`Analyttmodul.id`). */
  modulMedId: (id: string) => Analyte | undefined
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
      forbindelse: koder.get(kode)?.forbindelse ?? null,
      datakort: koder.get(kode)?.datakort ?? null,
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
    koblinger: data.koblinger,
    finn: (kode) => perKode.get(kode.trim().toUpperCase()),
    modulMedId: (id) => perModul.get(id),
  }
}

export const TOM_KATALOG = byggKatalog(TOM_KATALOGDATA)

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
    // Forbindelsen og datakortene kom til etter katalogen; et svar uten dem
    // får den gamle koblingen (`medEldreDatakort`).
    const forbindelse = kode.forbindelse ?? null
    if (forbindelse !== null && (typeof forbindelse !== 'string' || !FORBINDELSESNOKKEL.test(forbindelse))) {
      throw new UgyldigKatalog(`${hva}: forbindelsen er ugyldig.`)
    }
    const datakort = kode.datakort ?? null
    if (datakort !== null && !DATAKORTBRUK.includes(datakort as Datakortbruk)) {
      throw new UgyldigKatalog(`${hva}: datakortene er ugyldige.`)
    }
    return {
      kode: tekst(kode, 'kode', hva),
      navn: tekst(kode, 'navn', hva),
      forbindelse,
      datakort: datakort as Datakortbruk | null,
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
 * Datakortene slik koblingen var før katalogen sa hvilke kort hver kode bruker:
 * den første primære koden for et stoff fikk sidens egne kort, og de andre
 * primære kortene med koden i `gjelder`. Bare for et svar fra en database der
 * `*_analyttforbindelser_ous.sql` ikke er kjørt ennå. Der står koden fortsatt i
 * `gjelder`, så `forbindelse` er her koden, ikke en nøkkel i
 * forbindelsesregisteret. Appen og databasen rulles ut hver for seg, og
 * referanseområdene skal ikke forsvinne i mellomtiden.
 */
function medEldreDatakort(oppforinger: Katalogoppforing[], koblinger: readonly Analyttkoblingsdata[]): Katalogoppforing[] {
  const bruk = new Map<string, Pick<Katalogkodedata, 'forbindelse' | 'datakort'>>()
  const medEgne = new Set<string>()
  for (const { kode, stoff, primar } of koblinger) {
    if (!primar || bruk.has(kode)) continue
    const egne = !medEgne.has(stoff)
    medEgne.add(stoff)
    bruk.set(kode, egne ? { forbindelse: null, datakort: 'egne' } : { forbindelse: kode, datakort: 'forbindelse' })
  }
  return oppforinger.map((o) => ({
    ...o,
    koder: o.koder.map((k) => ({ ...k, ...(bruk.get(k.kode) ?? { forbindelse: null, datakort: null }) })),
  }))
}

/** Om svaret er fra før katalogen sa hvilke datakort kodene bruker. Oppføringene er alt lest (`oppforing`). */
function utenDatakort(oppforinger: unknown[]): boolean {
  return (oppforinger as Felt[]).every((o) => (o.koder as Felt[]).every((k) => !('datakort' in k)))
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
  const koblinger = liste(f.koblinger, 'Koblingene til stoffene').map((k) => {
    const kobling = objekt(k, 'En kobling')
    const merknad = kobling.merknad ?? null
    if (merknad !== null && typeof merknad !== 'string') throw new UgyldigKatalog('En kobling har en ugyldig merknad.')
    if (typeof kobling.primar !== 'boolean') throw new UgyldigKatalog('En kobling mangler om stoffet er primært.')
    return {
      kode: tekst(kobling, 'kode', 'En kobling'),
      stoff: tekst(kobling, 'stoff', 'En kobling'),
      relasjon: tekst(kobling, 'relasjon', 'En kobling'),
      primar: kobling.primar,
      merknad,
    }
  })
  const svarene = liste(f.oppforinger, 'Oppføringene')
  const oppforinger = svarene.map(oppforing)
  return {
    fagmiljo: fagmiljo && { id: tekst(fagmiljo, 'id', 'Fagmiljøet'), navn: tekst(fagmiljo, 'navn', 'Fagmiljøet') },
    metoder,
    oppforinger: utenDatakort(svarene) ? medEldreDatakort(oppforinger, koblinger) : oppforinger,
    koblinger,
  }
}
