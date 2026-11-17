/**
 * Det OUSFAR leser fra CYPinfo, og hvordan (`docs/cypinfo-integrasjon.md`).
 *
 * CYPinfo (cypinfo.no) er OUS Avdeling for farmakologis oppslagsverk for
 * farmakogenetikk. OUSFAR holder en kopi av katalogen: legemidlene, gentabellen
 * (fra genotype til fenotype) og hvilke kombinasjoner av gen og fenotype som
 * har en anbefaling for hvert legemiddel. Anbefalingstekstene lagres ikke; bare
 * CYPinfos ID for anbefalingen, nivået og en sha256 av teksten, så en endring
 * kan oppdages. Unntaket er teksten for legemidlene uten relevante gener, som
 * ikke avhenger av noe resultat og er en del av katalogen.
 *
 * Lesingen normaliserer det CYPinfo skriver ulikt: ATC-koder med mellomrom og
 * harde mellomrom, FEST-ID-ene som `festCodes` (katalogen) eller `festCode`
 * (enkeltoppslag og rapporten), og tekst med tomme avsnitt. Feltnavnene i
 * `data` er OUSFARs; reglene for hvilke av dem som er kliniske, står i
 * migrasjonen (`datakilder.feltregler`).
 *
 * Alt her er rene funksjoner.
 */
import { createHash } from 'node:crypto'
import { erObjekt } from '../datakilder/struktur.js'

/** Økes når lesingen endres, så en endring som bare kommer av ny lesing, kan skilles fra en endring hos kilden. */
export const PARSERVERSJON = 1

export const CYPINFO_API = 'https://cypinfo.no/api'
export const CYPINFO_NETTSTED = 'https://cypinfo.no'

/** Typene i kopien, som tabellene i skjemaet `cypinfo`. */
export const ENTITETNAVN = ['legemiddel', 'genresultat', 'anbefaling'] as const
export type Entitetnavn = (typeof ENTITETNAVN)[number]

/**
 * Nivåene CYPinfo gir en anbefaling, med teksten CYPinfos nettside bruker for
 * dem (API-et har den ikke). Et nivå som ikke står her, er en ny form.
 */
export const NIVAER = {
  info: 'Lite eller ingen informasjon om metabolismevei',
  standard: 'Standard dosering',
  medium: 'Kan ha bivirkninger eller manglende effekt',
  high: 'Endret dosebehov eller bytte av legemiddel',
} as const
export type Niva = keyof typeof NIVAER

export const erNiva = (v: unknown): v is Niva => typeof v === 'string' && Object.hasOwn(NIVAER, v)

/* --- Felles lesing ---------------------------------------------------------- */

/** Tekst med mellomrommene ryddet (også harde), eller `null` når den er tom. */
export function tekst(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.replace(/\s+/gu, ' ').trim()
  return t || null
}

/** Tekstene i en liste, ryddet og uten tomme og dubletter. */
function tekster(v: unknown): string[] {
  const liste = Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : []
  return [...new Set(liste.map(tekst).filter((t): t is string => t !== null))]
}

const ATC = /^[A-Z](\d{2}([A-Z]([A-Z](\d{2})?)?)?)?$/

/**
 * ATC-kodene uten mellomrom (CYPinfo har både vanlige og harde mellomrom inne
 * i kodene), med store bokstaver. `ugyldige` er det som ikke er en ATC-kode
 * selv etter det.
 */
export function lesAtc(v: unknown): { koder: string[]; ugyldige: string[] } {
  const alle = (Array.isArray(v) ? v : typeof v === 'string' ? v.split(',') : [])
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.replace(/\s+/gu, '').toUpperCase())
    .filter(Boolean)
  const unike = [...new Set(alle)]
  return { koder: unike.filter((k) => ATC.test(k)), ugyldige: unike.filter((k) => !ATC.test(k)) }
}

const FEST_ID = /^ID_[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/

/** FEST-ID-ene (virkestoffets ID i FEST), fra `festCodes` eller `festCode`, som liste eller tekst. */
export function lesFest(rad: Record<string, unknown>): string[] {
  const v = rad.festCodes ?? rad.festCode
  return tekster(v)
    .map((x) => x.toUpperCase())
    .filter((x) => FEST_ID.test(x))
}

/** Avsnittene i en tekst fra CYPinfo: delt på linjeskift, ryddet, uten tomme. */
export function avsnitt(v: unknown): string[] {
  if (typeof v !== 'string') return []
  return v
    .split(/\r?\n/)
    .map(tekst)
    .filter((t): t is string => t !== null)
}

/** sha256 av avsnittene, så bare en endring i innholdet gir en ny hash, ikke mellomrom og tomme linjer. */
export function teksthash(avsnittene: readonly string[]): string {
  return createHash('sha256').update(avsnittene.join('\n'), 'utf8').digest('hex')
}

/** ID-ene CYPinfo bruker (Sanity-dokumenter), og gen-sluggene. */
const CYPINFO_ID = /^[0-9A-Za-z_.-]{1,80}$/
export const cypinfoId = (v: unknown): string | null => (typeof v === 'string' && CYPINFO_ID.test(v) ? v : null)

/* --- Katalogen: legemidlene -------------------------------------------------- */

/** Et legemiddel uten relevante gener: CYPinfos faste anbefaling, som ikke avhenger av noe resultat. */
export interface UtenRelevanteGener {
  anbefaling_id: string
  niva: Niva
  avsnitt: string[]
}

export interface Legemiddeldata {
  navn: string
  atc: string[]
  fest: string[]
  varenavn: string[]
  kategori: string | null
  terapiomrade: string | null
  /** Satt når CYPinfo sier at ingen gener er relevante for legemiddelet. */
  uten_relevante_gener: UtenRelevanteGener | null
  /** Genene legemiddelet har anbefalinger for, som sluggene i rapporten, sortert. */
  gener: string[]
  /**
   * Gensettene som har egne anbefalinger: `[['cyp2d6']]` for et legemiddel
   * som slås opp på ett gen, `[['cyp2c19', 'cyp2d6']]` når de to må sendes
   * sammen (TCA-ene), og `[['cyp2b6'], ['cyp2b6', 'cyp2c19'], ['cyp2c19']]`
   * når både hvert gen for seg og begge sammen har anbefalinger (sertralin).
   */
  gensett: string[][]
}

/** Det katalogen sier om et legemiddel, før genene er utledet av rapportene. */
export type Katalogdata = Omit<Legemiddeldata, 'uten_relevante_gener' | 'gener' | 'gensett'>

/** En rad i katalogen (`GET /api/legemiddel`). `null` uten ID eller navn. */
export function lesLegemiddel(rad: Record<string, unknown>): { id: string; data: Katalogdata; ugyldigeAtc: string[] } | null {
  const id = cypinfoId(rad._id)
  const navn = tekst(rad.name)
  if (!id || !navn) return null
  const atc = lesAtc(rad.atcCodes ?? rad.atcCode)
  const navnPa = (v: unknown) => (erObjekt(v) ? tekst(v.name) : tekst(v))
  return {
    id,
    data: {
      navn,
      atc: atc.koder,
      fest: lesFest(rad),
      varenavn: tekster(rad.brandNames),
      kategori: navnPa(rad.category),
      terapiomrade: navnPa(rad.therapyArea),
    },
    ugyldigeAtc: atc.ugyldige,
  }
}

/* --- Gentabellen --------------------------------------------------------------- */

export interface Genresultatdata {
  /** Genet slik CYPinfo skriver det («CYP2D6»). */
  gen: string
  /** Sluggen genet har i rapporten. Små bokstaver, unntatt `VKORC1`; må brukes nøyaktig som den står. */
  gen_slug: string
  allel1: string
  allel2: string
  /** Genduplikasjon (flere kopier). Bare for CYP2D6; ellers `null`. */
  duplikasjon: boolean | null
  fenotype_id: string
  fenotype: string
}

/**
 * En rad i gentabellen (`GET /api/gene`). CYPinfo har ingen ID for raden; den
 * er genet, allelene og duplikasjonen, som er det som avgjør fenotypen.
 */
export function lesGenresultat(rad: Record<string, unknown>): { id: string; data: Genresultatdata } | null {
  const gen = tekst(rad.gene)
  const gen_slug = cypinfoId(rad.geneId)
  const allel1 = tekst(rad.allele1)
  const allel2 = tekst(rad.allele2)
  const fenotype_id = cypinfoId(rad.phenotypeId)
  const fenotype = tekst(rad.phenotype)
  if (!gen || !gen_slug || !allel1 || !allel2 || !fenotype_id || !fenotype) return null
  const duplikasjon = typeof rad.isDuplicate === 'boolean' ? rad.isDuplicate : null
  const id = `${gen_slug} ${allel1}/${allel2}${duplikasjon ? ' dup' : ''}`
  return { id, data: { gen, gen_slug, allel1, allel2, duplikasjon, fenotype_id, fenotype } }
}

/* --- Rapporten: anbefalingene ------------------------------------------------- */

/** Ett gen med én fenotype, slik en anbefaling gjelder det. */
export interface Genfenotype {
  gen: string
  gen_slug: string
  fenotype_id: string
  fenotype: string
}

/** En anbefaling i rapporten, lest. Teksten er med her, men lagres aldri; bare hashen. */
export interface Rapportanbefaling {
  id: string
  legemiddel_id: string
  /** Tom for legemidlene uten relevante gener. */
  kombinasjoner: Genfenotype[]
  uten_relevante_gener: boolean
  niva: Niva
  avsnitt: string[]
}

/** Det som lagres om en anbefaling: hvem den gjelder, nivået og hashen av teksten. */
export interface Anbefalingsdata {
  legemiddel_id: string
  /** Navnet legemiddelet har i katalogen, for endringsloggen. */
  legemiddel: string
  kombinasjoner: Genfenotype[]
  niva: Niva
  tekst_sha256: string
}

/** Nøkkelen CYPinfo bruker for et gen med en fenotype i rapporten: `cyp2d6:<fenotype-ID>`. */
export const kombinasjonsnokkel = (k: Pick<Genfenotype, 'gen_slug' | 'fenotype_id'>) => `${k.gen_slug}:${k.fenotype_id}`

export class CypinfoFeil extends Error {
  constructor(
    melding: string,
    readonly status: number | null = null,
  ) {
    super(melding)
    this.name = 'CypinfoFeil'
  }
}

function lesKombinasjon(v: unknown): Genfenotype | null {
  if (!erObjekt(v) || !erObjekt(v.gene) || !erObjekt(v.result)) return null
  const gen_slug = cypinfoId(v.gene.slug)
  const fenotype_id = cypinfoId(v.result._id)
  const gen = tekst(v.gene.name) ?? gen_slug
  const fenotype = (erObjekt(v.result.title) ? tekst(v.result.title.current) : tekst(v.result.title)) ?? fenotype_id
  return gen_slug && fenotype_id && gen && fenotype ? { gen, gen_slug, fenotype_id, fenotype } : null
}

/**
 * Svaret fra `POST /api/legemiddel/rapport`: et objekt med en liste
 * anbefalinger per kategori. Lesingen er streng: en anbefaling som ikke kan
 * leses helt, er en ny form, og da kastes en {@link CypinfoFeil} i stedet for
 * at noe stille blir borte. Et tomt objekt er et gyldig svar; om det er
 * ventet, avgjør den som spurte.
 */
export function lesRapport(svar: unknown): Rapportanbefaling[] {
  if (!erObjekt(svar)) throw new CypinfoFeil('Rapporten fra CYPinfo har en ny form: svaret er ikke et objekt.')
  const ut: Rapportanbefaling[] = []
  for (const [kategori, liste] of Object.entries(svar)) {
    if (!Array.isArray(liste)) throw new CypinfoFeil(`Rapporten fra CYPinfo har en ny form: «${kategori}» er ikke en liste.`)
    for (const a of liste) {
      const id = erObjekt(a) ? cypinfoId(a._id) : null
      const feil = (hva: string) => new CypinfoFeil(`Rapporten fra CYPinfo har en ny form: anbefalingen ${id ?? '(uten ID)'} ${hva}.`)
      if (!erObjekt(a) || !id) throw feil('kan ikke leses')
      const legemiddel_id = erObjekt(a.drug) ? cypinfoId(a.drug._id) : null
      if (!legemiddel_id) throw feil('mangler legemiddelet')
      if (!erNiva(a.severity)) throw feil(`har et ukjent nivå (${JSON.stringify(a.severity)})`)
      if (typeof a.text !== 'string') throw feil('mangler teksten')
      const uten = a.noRelavantGenes === true
      if (!(a.combinations === null || Array.isArray(a.combinations))) throw feil('mangler kombinasjonene')
      const kombinasjoner = (a.combinations ?? []).map(lesKombinasjon)
      if (kombinasjoner.some((k) => k === null)) throw feil('har en kombinasjon som ikke kan leses')
      if (uten !== (kombinasjoner.length === 0)) {
        throw feil(uten ? 'er uten relevante gener, men har kombinasjoner' : 'har verken kombinasjoner eller «ingen relevante gener»')
      }
      ut.push({
        id,
        legemiddel_id,
        kombinasjoner: (kombinasjoner as Genfenotype[]).sort((x, y) => (x.gen_slug < y.gen_slug ? -1 : x.gen_slug > y.gen_slug ? 1 : 0)),
        uten_relevante_gener: uten,
        niva: a.severity,
        avsnitt: avsnitt(a.text),
      })
    }
  }
  return ut
}
