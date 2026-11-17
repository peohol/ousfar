/**
 * Synkroniseringen av CYPinfo-katalogen til OUSFARs kopi
 * (`docs/cypinfo-integrasjon.md`). Kjøres på serveren, aldri i nettleseren:
 * hver uke fra GitHub Actions, og når en systemarkitekt ber om det.
 *
 * Én kjøring:
 *
 * 1. registrerer at en synkronisering er startet;
 * 2. henter katalogen og gentabellen, og kontrollerer formen;
 * 3. utleder hvilke gener hvert legemiddel slås opp på, med rapportkall mot
 *    CYPinfo ({@link planlagteKall}): ett per gen og fenotype, en parvis
 *    dekning med alle genene samtidig (som viser hvilke gener som hører
 *    sammen, uansett hvilke fenotyper anbefalingen gjelder), og til slutt
 *    hele produktet av fenotyper for hver gengruppe. Slik har hver anbefaling
 *    CYPinfo kan gi, sin ID, sitt nivå og sin tekst i kopien;
 * 4. stanser hvis et legemiddel har fått færre gener enn sist (bare den
 *    planlagte kjøringen; en systemarkitekts «Hent nå» godtar endringen og
 *    melder den), og melder legemidler uten FEST-ID og uten kobling;
 * 5. ber databasen bytte inn alt i én transaksjon, med vernet mot for få rader.
 *
 * Tekstene er CYPinfos, uendret, og byttes ut hver uke; de redigeres aldri i
 * OUSFAR. Går noe galt, merkes
 * kjøringen som feilet, og det som lå i databasen fra før, står urørt.
 */
import { erObjekt } from '../datakilder/struktur.js'
import { CYPINFOKOBLINGER, type Cypinfokobling } from '../faginnhold/cypinfokoblinger.js'
import type { CypinfoApi } from './api.js'
import type { Cypinfolager, Innlastingsrad, Opptelling, Synkrapport } from './lager.js'
import {
  CypinfoFeil,
  kombinasjonsnokkel,
  lesGenresultat,
  lesLegemiddel,
  lesRapport,
  PARSERVERSJON,
  type Anbefalingsdata,
  type Genresultatdata,
  type Katalogdata,
  type Legemiddeldata,
  type Rapportanbefaling,
} from './modell.js'
import { listeavvik, type Listetype } from './struktur.js'

export type Cypinfosynkresultat =
  | { status: 'fullfort' | 'uendret'; synk: number; antall: Opptelling }
  | { status: 'feilet'; synk: number; feil: string }

export interface Cypinfosynkvalg {
  lager: Cypinfolager
  api: CypinfoApi
  utlostAv?: 'cron' | 'manuell'
  koblinger?: readonly Cypinfokobling[]
}

/** Et gen i gentabellen med fenotypene det kan ha, i CYPinfos rekkefølge. */
export interface Gen {
  slug: string
  fenotyper: string[]
}

/** Genene og fenotypene i gentabellen, i rekkefølgen CYPinfo gir dem. */
export function genene(genresultater: readonly Genresultatdata[]): Gen[] {
  const per = new Map<string, Set<string>>()
  for (const g of genresultater) {
    if (!per.has(g.gen_slug)) per.set(g.gen_slug, new Set())
    per.get(g.gen_slug)!.add(g.fenotype_id)
  }
  return [...per].map(([slug, fenotyper]) => ({ slug, fenotyper: [...fenotyper] }))
}

/** Et rapportkall: gen:fenotype-parene og legemidlene. `alle` er sann når alle legemidlene er med. */
export interface Rapportkall {
  kombinasjoner: string[]
  legemidler: string[]
  alle: boolean
}

/** Alle kombinasjonene av én fenotype for hvert gen: det kartesiske produktet. */
export function produktet(gener: readonly Gen[]): string[][] {
  return gener.reduce<string[][]>(
    (rader, g) => rader.flatMap((rad) => g.fenotyper.map((f) => [...rad, kombinasjonsnokkel({ gen_slug: g.slug, fenotype_id: f })])),
    [[]],
  )
}

/**
 * Rader med én fenotype for hvert gen, slik at hvert par av fenotyper for to
 * ulike gener står sammen i minst én rad (en parvis dekning). Bygges grådig, med
 * genene med flest fenotyper først og alt sortert, så svaret ikke avhenger av
 * rekkefølgen CYPinfo gir dem i: hver rad starter med det første paret som
 * mangler, og hvert av de andre genene får fenotypen som dekker flest nye par.
 */
export function parvisDekning(gener: readonly Gen[]): string[][] {
  const med = gener
    .filter((g) => g.fenotyper.length > 0)
    .map((g) => ({ slug: g.slug, fenotyper: [...g.fenotyper].sort() }))
    .sort((a, b) => b.fenotyper.length - a.fenotyper.length || (a.slug < b.slug ? -1 : 1))
  const par = (i: number, p: number, j: number, q: number) => `${i}.${p} ${j}.${q}`
  const mangler = new Set<string>()
  med.forEach((a, i) =>
    med.forEach((b, j) => {
      if (j > i) a.fenotyper.forEach((_, p) => b.fenotyper.forEach((_, q) => mangler.add(par(i, p, j, q))))
    }),
  )
  const rader: number[][] = []
  while (mangler.size > 0) {
    const [i, p, j, q] = mangler.values().next().value!.split(/[. ]/).map(Number) as [number, number, number, number]
    const rad = med.map(() => -1)
    rad[i] = p
    rad[j] = q
    med.forEach((g, k) => {
      if (rad[k]! >= 0) return
      const nye = (f: number) => rad.reduce((n, v, h) => n + (v >= 0 && mangler.has(h < k ? par(h, v, k, f) : par(k, f, h, v)) ? 1 : 0), 0)
      rad[k] = g.fenotyper.reduce((beste, _, f) => (nye(f) > nye(beste) ? f : beste), 0)
    })
    rad.forEach((v, a) => rad.forEach((w, b) => b > a && mangler.delete(par(a, v, b, w))))
    rader.push(rad)
  }
  return rader.map((rad) => rad.map((f, k) => kombinasjonsnokkel({ gen_slug: med[k]!.slug, fenotype_id: med[k]!.fenotyper[f]! })))
}

/**
 * Kallene som utleder genene, før gengruppene er kjent: ett per gen og
 * fenotype, og en parvis dekning med alle genene samtidig
 * ({@link parvisDekning}). En anbefaling for to gener kommer bare når begge
 * parene er sendt, så dekningen sørger for at hver slik anbefaling, for hvilken
 * som helst kombinasjon av fenotyper, kommer i minst ett kall og viser at
 * genene hører sammen. Gengruppene hentes så i sin helhet ({@link gruppekall}).
 */
export function planlagteKall(gener: readonly Gen[], legemidler: readonly string[]): Rapportkall[] {
  const alle = [...legemidler]
  const enkelt = gener.flatMap((g) =>
    g.fenotyper.map((f) => ({ kombinasjoner: [kombinasjonsnokkel({ gen_slug: g.slug, fenotype_id: f })], legemidler: alle, alle: true })),
  )
  const samtidig = parvisDekning(gener).map((kombinasjoner) => ({ kombinasjoner, legemidler: alle, alle: true }))
  return [...enkelt, ...samtidig]
}

/**
 * Kallene for gengruppene: hele produktet av fenotyper for hvert sett gener
 * som har felles anbefalinger, med legemidlene som har dem.
 */
export function gruppekall(gener: readonly Gen[], anbefalinger: Iterable<Rapportanbefaling>): Rapportkall[] {
  const grupper = new Map<string, Set<string>>()
  for (const a of anbefalinger) {
    if (a.kombinasjoner.length < 2) continue
    const nokkel = a.kombinasjoner.map((k) => k.gen_slug).join(' ')
    if (!grupper.has(nokkel)) grupper.set(nokkel, new Set())
    grupper.get(nokkel)!.add(a.legemiddel_id)
  }
  const perSlug = new Map(gener.map((g) => [g.slug, g]))
  return [...grupper]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .flatMap(([nokkel, legemidler]) => {
      const gruppe = nokkel.split(' ').map((s) => perSlug.get(s))
      if (gruppe.some((g) => !g)) {
        throw new CypinfoFeil(`Rapporten fra CYPinfo bruker et gen som ikke står i gentabellen (${nokkel}).`)
      }
      return produktet(gruppe as Gen[]).map((kombinasjoner) => ({ kombinasjoner, legemidler: [...legemidler].sort(), alle: false }))
    })
}

/**
 * Et rapportsvar, lest og kontrollert mot det som ble spurt om: hver
 * anbefaling skal gjelde et legemiddel og gen:fenotype-par fra spørsmålet.
 * Når alle legemidlene er med, er et tomt svar avvik i kilden: CYPinfo gir
 * alltid anbefalingene for legemidlene uten relevante gener.
 */
export function kontrollertRapport(kall: Rapportkall, svar: unknown): Rapportanbefaling[] {
  const anbefalinger = lesRapport(svar)
  if (kall.alle && anbefalinger.length === 0) {
    throw new CypinfoFeil(`CYPinfo ga et tomt svar for ${kall.kombinasjoner.join(', ')} med alle legemidlene. Det er avvik i kilden; ingenting er byttet inn.`)
  }
  const spurtLegemiddel = new Set(kall.legemidler)
  const spurtKombinasjon = new Set(kall.kombinasjoner)
  for (const a of anbefalinger) {
    if (!spurtLegemiddel.has(a.legemiddel_id) || a.kombinasjoner.some((k) => !spurtKombinasjon.has(kombinasjonsnokkel(k)))) {
      throw new CypinfoFeil(`CYPinfo ga anbefalingen ${a.id} for noe det ikke ble spurt om. Det er avvik i kilden; ingenting er byttet inn.`)
    }
  }
  return anbefalinger
}

/** Det som avgjør om to svar med samme ID er like. */
const avtrykk = (a: Rapportanbefaling) =>
  JSON.stringify([a.legemiddel_id, a.kombinasjoner.map(kombinasjonsnokkel), a.uten_relevante_gener, a.niva, a.avsnitt])

/** Legger anbefalingene til i samlingen; samme ID med ulikt innhold er avvik i kilden. */
function samle(samling: Map<string, Rapportanbefaling>, anbefalinger: readonly Rapportanbefaling[]): void {
  for (const a of anbefalinger) {
    const forrige = samling.get(a.id)
    if (forrige && avtrykk(forrige) !== avtrykk(a)) {
      throw new CypinfoFeil(`CYPinfo ga anbefalingen ${a.id} med ulikt innhold i samme kjøring. Ingenting er byttet inn.`)
    }
    samling.set(a.id, a)
  }
}

/** Radene i en liste, lest, uten dubletter og sortert på ID. */
function lesRader<T extends object>(
  rader: readonly unknown[],
  les: (rad: Record<string, unknown>) => { id: string; data: T } | null,
): { rader: (Innlastingsrad & { data: T })[]; forkastet: number } {
  const etterId = new Map<string, Innlastingsrad & { data: T }>()
  let forkastet = 0
  for (const raa of rader) {
    const lest = erObjekt(raa) ? les(raa) : null
    if (!lest || etterId.has(lest.id)) {
      forkastet += 1
      continue
    }
    etterId.set(lest.id, { id: lest.id, data: lest.data, raa })
  }
  return { rader: [...etterId.values()].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), forkastet }
}

const gensettnokkel = (gener: readonly string[]) => gener.join(' ')

/**
 * Katalogen med det rapportene viste: teksten for legemidlene uten relevante
 * gener, genene og gensettene for de andre, og anbefalingene som rader.
 */
export function byggKatalog(
  katalog: ReadonlyMap<string, Katalogdata>,
  anbefalinger: Iterable<Rapportanbefaling>,
): { legemidler: Map<string, Legemiddeldata>; anbefalinger: Innlastingsrad[] } {
  const legemidler = new Map<string, Legemiddeldata>(
    [...katalog].map(([id, data]) => [id, { ...data, uten_relevante_gener: null, gener: [], gensett: [] }]),
  )
  const rader: Innlastingsrad[] = []
  const gensett = new Map<string, Set<string>>()
  for (const a of anbefalinger) {
    const legemiddel = legemidler.get(a.legemiddel_id)
    if (!legemiddel) {
      throw new CypinfoFeil(`CYPinfo ga anbefalingen ${a.id} for legemiddelet ${a.legemiddel_id}, som ikke står i katalogen.`)
    }
    if (a.uten_relevante_gener) {
      legemiddel.uten_relevante_gener = { anbefaling_id: a.id, niva: a.niva, avsnitt: a.avsnitt }
      continue
    }
    const data: Anbefalingsdata = {
      legemiddel_id: a.legemiddel_id,
      legemiddel: legemiddel.navn,
      kombinasjoner: a.kombinasjoner,
      niva: a.niva,
      avsnitt: a.avsnitt,
    }
    // Rådataene er uten teksten, som i parserversjon 1: en ny tekst hos CYPinfo
    // står da bare i dataene og logges som endring hos kilden, og en ny lesing
    // av det samme svaret som metadata (datakilder.cypinfo_etter_bytte).
    rader.push({ id: a.id, data, raa: { _id: a.id, combinations: a.kombinasjoner.map(kombinasjonsnokkel), severity: a.niva } })
    if (!gensett.has(a.legemiddel_id)) gensett.set(a.legemiddel_id, new Set())
    gensett.get(a.legemiddel_id)!.add(gensettnokkel(a.kombinasjoner.map((k) => k.gen_slug)))
  }
  for (const [id, sett] of gensett) {
    const legemiddel = legemidler.get(id)!
    legemiddel.gensett = [...sett].sort().map((s) => s.split(' '))
    legemiddel.gener = [...new Set(legemiddel.gensett.flat())].sort()
  }
  rader.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
  return { legemidler, anbefalinger: rader }
}

/**
 * Det kjøringen fant som noen bør vurdere: legemidler uten FEST-ID og uten
 * kobling (uavklarte), legemidler CYPinfo ikke gir noen anbefaling for,
 * ATC-koder som ikke kunne leses, og koblinger til legemidler som er borte.
 */
export function lagRapport(
  legemidler: ReadonlyMap<string, Legemiddeldata>,
  ugyldigeAtc: ReadonlyMap<string, string[]>,
  koblinger: readonly Cypinfokobling[],
): Synkrapport {
  const koblet = new Set(koblinger.map((k) => k.cypinfo_id))
  const uavklarte = [...legemidler]
    .filter(([id, l]) => l.fest.length === 0 && !koblet.has(id))
    .map(([, l]) => l.navn)
    .sort((a, b) => a.localeCompare(b, 'nb'))
  const merknader: string[] = []
  const utenSvar = [...legemidler.values()].filter((l) => !l.uten_relevante_gener && l.gener.length === 0).map((l) => l.navn)
  if (utenSvar.length > 0) {
    merknader.push(`CYPinfo ga ingen anbefaling for ${utenSvar.join(', ')}, verken med gener eller uten relevante gener.`)
  }
  for (const [id, koder] of ugyldigeAtc) {
    merknader.push(`ATC-koden for «${legemidler.get(id)?.navn ?? id}» kan ikke leses: ${koder.map((k) => `«${k}»`).join(', ')}.`)
  }
  for (const k of koblinger) {
    if (!legemidler.has(k.cypinfo_id)) {
      merknader.push(`${k.side ? `«${k.side}» er koblet til` : 'Koblingslisten har'} ${k.navn} (${k.cypinfo_id}), som ikke står i CYPinfo lenger.`)
    }
  }
  if (uavklarte.length > 0) {
    merknader.push(`Uten FEST-ID og uten kobling til en fagside: ${uavklarte.join(', ')}. Vurder dem i src/faginnhold/cypinfokoblinger.ts.`)
  }
  return { uavklarte, merknader }
}

/** Legemidlene som har mistet gener siden forrige bytte, som tekst. */
export function tapteGener(forrige: Readonly<Record<string, readonly string[]>>, legemidler: ReadonlyMap<string, Legemiddeldata>): string[] {
  return [...legemidler]
    .map(([id, l]) => ({ l, borte: (forrige[id] ?? []).filter((g) => !l.gener.includes(g)) }))
    .filter(({ borte }) => borte.length > 0)
    .map(({ l, borte }) => `${l.navn} (${borte.join(', ')})`)
}

export async function synkroniserCypinfo({
  lager,
  api,
  utlostAv = 'cron',
  koblinger = CYPINFOKOBLINGER,
}: Cypinfosynkvalg): Promise<Cypinfosynkresultat> {
  const forrige = await lager.forrige()
  const synk = await lager.start(utlostAv)
  try {
    const lister: Record<Listetype, unknown[]> = { legemiddel: await api.legemidler(), genresultat: await api.gentabell() }
    const avvik = (Object.keys(lister) as Listetype[]).map((t) => listeavvik(t, lister[t])).filter((a): a is string => a !== null)
    if (avvik.length > 0) throw new CypinfoFeil(`${avvik.join(' ')} Ingenting er byttet inn.`)

    const ugyldigeAtc = new Map<string, string[]>()
    const katalog = lesRader(lister.legemiddel, (rad) => {
      const lest = lesLegemiddel(rad)
      if (lest && lest.ugyldigeAtc.length > 0) ugyldigeAtc.set(lest.id, lest.ugyldigeAtc)
      return lest
    })
    const genresultater = lesRader(lister.genresultat, lesGenresultat)
    const gener = genene(genresultater.rader.map((r) => r.data))
    const alleLegemidler = katalog.rader.map((r) => r.id)

    const samling = new Map<string, Rapportanbefaling>()
    let antallKall = 0
    const kjor = async (kall: readonly Rapportkall[]) => {
      for (const k of kall) {
        antallKall += 1
        samle(samling, kontrollertRapport(k, await api.rapport(k.kombinasjoner, k.legemidler)))
      }
    }
    await kjor(planlagteKall(gener, alleLegemidler))
    await kjor(gruppekall(gener, [...samling.values()]))

    const { legemidler, anbefalinger } = byggKatalog(new Map(katalog.rader.map((r) => [r.id, r.data])), samling.values())
    const rapport = lagRapport(legemidler, ugyldigeAtc, koblinger)

    const tapt = tapteGener(forrige.gener, legemidler)
    if (tapt.length > 0) {
      const tekst = `Færre gener enn sist for ${tapt.join('; ')}.`
      if (utlostAv === 'cron') {
        throw new CypinfoFeil(`${tekst} Det kan være en endring i svarene fra CYPinfo, så ingenting er byttet inn. Kontroller hos CYPinfo; «Hent nå» i «Datakilder» godtar endringen.`)
      }
      rapport.merknader.unshift(`${tekst} Godtatt ved «Hent nå».`)
    }

    const { status, antall } = await lager.fullfor(synk, {
      parserversjon: PARSERVERSJON,
      entiteter: {
        legemiddel: { rader: katalog.rader.map((r) => ({ ...r, data: legemidler.get(r.id)! })), forkastet: katalog.forkastet },
        genresultat: genresultater,
        anbefaling: { rader: anbefalinger, forkastet: 0 },
      },
      kall: antallKall,
      rapport,
    })
    return { status, synk, antall }
  } catch (e) {
    const feil = e instanceof Error ? e.message : String(e)
    await lager.avbryt(synk, feil)
    return { status: 'feilet', synk, feil }
  }
}

