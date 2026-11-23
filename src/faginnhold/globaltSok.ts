/**
 * Grunnlaget for søket i hele kunnskapsbasen: alle de publiserte sidene,
 * lest i én omgang og indeksert med den samme koden som søket på én side.
 *
 * Dataene kommer fra fem kilder, som leses hver for seg (se {@link lesSokeindeks}):
 *
 * - **sider**: `les_stoffer` gir alle fagsidene på samme form som `les_stoff`.
 * - **preparater** og **interaksjoner**: `les_preparatsok` og
 *   `les_interaksjonssok` gir bare navnene søket finner — preparatnavnene per
 *   legemiddelform og det hver interaksjon er med — for hver side, med de
 *   samme preparatene og interaksjonene som seksjonene på siden viser.
 * - **farmakogenetikk**: `les_farmakogenetikk_sok` gir dataene for alle
 *   kjemikaliene sidene er koblet til i ClinPGx. Hver side får sin del
 *   (`farmakogenetikkFor`).
 * - **laboratorier**: `les_laboratoriesok` gir navnene og metodene i
 *   analysene fra Farmakologiportalen for alle forbindelsene i registeret, og
 *   hver side får de samme analysene som seksjonen på siden viser.
 *
 * Før sidene selv er lest, finner søket dem med navnet: navnene på de
 * publiserte fagsidene står i stoffregisteret (`les_stoffregister`), som er
 * lite og svarer raskt, mens `les_stoffer` er stort. Uten dette ventet et søk
 * på et stoffnavn på hele innholdet første gang.
 *
 * Indeksen bygges i korte strekk når nettleseren er ledig
 * ({@link indekserStykkevis}), så et klikk eller et tastetrykk, og det appen
 * gjør for det, ikke venter på den.
 *
 * Det som er lest, lagres i nettleseren, og neste gang vises det med én gang.
 * `sokedata_versjoner` sier hvilke kilder som er endret siden, og bare de
 * leses på nytt. Feiler en kilde, prøves den igjen et par ganger; feiler den
 * fortsatt, brukes det som er lagret fra før, og ellers står den i
 * {@link Kunnskapsbase.mangler}. De andre kildene er med uansett.
 *
 * Hvert treff er et stoff i stoffregisteret. Aliasene i registeret er andre
 * veier til det samme stoffet (se `stoffidentitet` i `sok.ts`). Laboratorienes
 * analyttkoder er ikke med: de hører til fortolkningen (`docs/domener.md`).
 *
 * Rangeringen skjer bare i `sok.ts`; databasen gir bare innholdet.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Mellomlager } from '../auth/mellomlager'
import { KJORER } from '../oppdatering/versjon'
import { byggSidemodell, type Sidemodell } from './stoffside'
import { tilFeil } from './lagring'
import { TOM_STOFFSIDE, type Stoffsidedata, type Utgave } from './lesing'
import type { Referanseinnhold, Tilstand } from './modell'
import { indekserSide, lagSokeindeks, stoffidentitet, type Sokedokument, type Sokeindeks, type Tilleggstekst } from './sok'
import { byggStoffregister, STOFFREGISTERDATA, type Registerdata, type Stoffoppforing } from '../domain/stoffregister'
import type { Interaksjonssokerad, Legemiddelsok, Preparatsokerad } from '../legemiddeldata/lesing'
import {
  interaksjonerFraSok,
  interaksjonstekster,
  koblede,
  preparatformerFraSok,
  preparattekster,
} from '../legemiddeldata/stoffside'
import { farmakogenetikkFor, type Farmakogenetikkleser, type Farmakogenetikkutvalg } from '../clinpgx/lesing'
import { byggFarmakogenetikkvisning, farmakogenetikktekster, kobledeKjemikalier } from '../clinpgx/stoffside'
import type { Labsokedata, Labsokleser } from '../farmakologiportalen/lesing'
import { alleLabkomponenter, labsoketeksterFor } from '../farmakologiportalen/stoffside'

/** Kildene søket leser, hver for seg. */
export type Sokekilde = 'sider' | 'preparater' | 'interaksjoner' | 'farmakogenetikk' | 'laboratorier'

/** Kildene som ikke kunne leses, med feilen. */
export type Manglende = Partial<Record<Sokekilde, string>>

/** Søkedata per side, etter virkestoffene siden er koblet til ({@link koblingsnokkel}). */
export type Perkobling<T> = ReadonlyMap<string, readonly T[]>

/** Alt søket i kunnskapsbasen indekserer. Det som mangler, er ikke lest (ennå). */
export interface Kunnskapsbase {
  sider: Stoffsidedata[]
  /**
   * De publiserte fagsidene i databasen, bare med navnet, til sidene selv er
   * lest. Søket finner dem da med navnet og aliasene, som et stoff uten side.
   */
  stoffer?: readonly Stoffoppforing[]
  /** Preparatnavnene på hver side. */
  preparater?: Perkobling<Preparatsokerad> | null
  /** Interaksjonene på hver side. */
  interaksjoner?: Perkobling<Interaksjonssokerad> | null
  /** ClinPGx-dataene for alle koblingene. */
  farmakogenetikk?: Farmakogenetikkutvalg | null
  /** Laboratorieanalysene fra Farmakologiportalen for alle forbindelsene i registeret. */
  laboratorier?: Labsokedata | null
  /** Kildene som ikke kunne leses. */
  mangler?: Manglende
}

/** Når hver kilde sist ble endret i databasen (`sokedata_versjoner`). */
export interface Sokedataversjoner {
  sider?: string
  fest?: string
  clinpgx?: string
  laboratorier?: string
}

const VERSJONSNOKLER = ['sider', 'fest', 'clinpgx', 'laboratorier'] as const satisfies readonly (keyof Sokedataversjoner)[]

export interface Sideleser {
  /** Alle stoffsidene i én tilstand, alfabetisk. */
  lesStoffsider(tilstand: Tilstand): Promise<Stoffsidedata[]>
}

/** Det søket leser fra. Uten en kilde er dataene fra den ikke med. */
export interface Sokekilder {
  sider: Sideleser
  /** Navnene på de publiserte fagsidene, lest før sidene selv (stoffregisteret). */
  stoffer?: (() => Promise<readonly Stoffoppforing[]>) | null
  legemidler?: Legemiddelsok | null
  farmakogenetikk?: Pick<Farmakogenetikkleser, 'les'> | null
  laboratorier?: Pick<Labsokleser, 'les'> | null
  /** Versjonene. Uten dem leses alt på nytt, og det lagrede brukes bare til det er lest. */
  versjoner?: (() => Promise<Sokedataversjoner>) | null
  /** Hvor det som er lest, lagres til neste gang. */
  mellomlager?: Mellomlager | null
  /** Ventetidene før hvert nytt forsøk når en kilde feiler, i millisekunder. */
  ventetider?: readonly number[]
}

/** Formen `les_stoffer` gir: sidene, og referansene de siterer, én gang. */
interface Samletlesing {
  sider: (Omit<Stoffsidedata, 'referanser'> & { referanser: string[] })[]
  referanser: Utgave<Referanseinnhold>[]
}

export function lagSideleser(klient: SupabaseClient): Sideleser {
  return {
    async lesStoffsider(tilstand) {
      const { data, error } = await klient.rpc('les_stoffer', { sidetilstand: tilstand })
      if (error) throw tilFeil(error)
      const { sider = [], referanser = [] } = (data ?? {}) as Partial<Samletlesing>
      const perId = new Map(referanser.map((r) => [r.id, r]))
      return sider.map((side) => ({
        ...TOM_STOFFSIDE,
        ...side,
        referanser: side.referanser.flatMap((id) => perId.get(id) ?? []),
      }))
    },
  }
}

export function lagVersjonsleser(klient: SupabaseClient): () => Promise<Sokedataversjoner> {
  return async () => {
    const { data, error } = await klient.rpc('sokedata_versjoner', {})
    if (error) throw tilFeil(error)
    const svar = (data ?? {}) as Record<string, unknown>
    return Object.fromEntries(
      VERSJONSNOKLER.flatMap((k) => (typeof svar[k] === 'string' ? [[k, svar[k]]] : [])),
    )
  }
}

/** Ventetidene før nye forsøk når ikke annet er gitt: ett sekund, så fire. */
const VENTETIDER = [1000, 4000]

/** Nøkkelen til en sides søkedata fra FEST: virkestoffene den er koblet til. */
export function koblingsnokkel(koblet: readonly string[]): string {
  return [...new Set(koblet)].sort().join(' ')
}

/* --- Kildene ---------------------------------------------------------------- */

type Tillegg = Exclude<Sokekilde, 'sider'>

interface Tilleggsdata {
  preparater: Perkobling<Preparatsokerad>
  interaksjoner: Perkobling<Interaksjonssokerad>
  farmakogenetikk: Farmakogenetikkutvalg
  laboratorier: Labsokedata
}

interface Tilleggskilde<K extends Tillegg> {
  /** Versjonen som sier om de lagrede dataene fortsatt gjelder. */
  versjon: keyof Sokedataversjoner
  /** Det dataene leses for: tom når ingen side er koblet til kilden. */
  inndata(modeller: readonly Sidemodell[]): string[]
  /** Lesingen, eller `null` når kilden ikke er gitt. */
  leser(kilder: Sokekilder): ((inndata: string[]) => Promise<Tilleggsdata[K]>) | null | undefined
}

const koblingene = (modeller: readonly Sidemodell[]) =>
  [...new Set(modeller.map((m) => koblingsnokkel(koblede(m))).filter(Boolean))].sort()

const kjemikaliene = (modeller: readonly Sidemodell[]) => [...new Set(modeller.flatMap(kobledeKjemikalier))].sort()

/** Svaret for hver kobling, med koblingen som nøkkel. */
async function perKobling<T>(
  nokler: readonly string[],
  les: (sider: string[][]) => Promise<T[][]>,
): Promise<Perkobling<T>> {
  const svar = await les(nokler.map((n) => n.split(' ')))
  return new Map(nokler.map((n, i) => [n, svar[i] ?? []]))
}

const TILLEGGSKILDER: { [K in Tillegg]: Tilleggskilde<K> } = {
  preparater: {
    versjon: 'fest',
    inndata: koblingene,
    leser: ({ legemidler }) => legemidler && ((nokler) => perKobling(nokler, (s) => legemidler.preparater(s))),
  },
  interaksjoner: {
    versjon: 'fest',
    inndata: koblingene,
    leser: ({ legemidler }) => legemidler && ((nokler) => perKobling(nokler, (s) => legemidler.interaksjoner(s))),
  },
  farmakogenetikk: {
    versjon: 'clinpgx',
    inndata: kjemikaliene,
    leser: ({ farmakogenetikk }) => farmakogenetikk && ((ider) => farmakogenetikk.les(ider)),
  },
  laboratorier: {
    versjon: 'laboratorier',
    // Koblingene til portalen står i registeret, ikke på sidene.
    inndata: () => alleLabkomponenter(),
    leser: ({ laboratorier }) => laboratorier && ((ider) => laboratorier.les(ider)),
  },
}

const TILLEGG = Object.keys(TILLEGGSKILDER) as Tillegg[]

/* --- Lesingen ----------------------------------------------------------------- */

/** Det som lagres per kilde: hva det ble lest for, versjonen, og dataene. */
interface Lagret<T> {
  bygg: string
  inndata: string
  versjon: string | null
  data: T
}

const lagernokkel = (kilde: Sokekilde) => `sok:${kilde}`

function melding(feil: unknown): string {
  return feil instanceof Error ? feil.message : String(feil)
}

async function medGjenforsok<T>(hent: () => Promise<T>, ventetider: readonly number[]): Promise<T> {
  for (let forsok = 0; ; forsok += 1) {
    try {
      return await hent()
    } catch (feil) {
      const vent = ventetider[forsok]
      if (vent === undefined) throw feil
      await new Promise((ok) => setTimeout(ok, vent))
    }
  }
}

/**
 * Leser alt søket indekserer. `endret` får kunnskapsbasen hver gang mer er
 * kommet til: først det som var lagret fra forrige gang, så sidene, så hver
 * kilde etter hvert som den er lest.
 */
async function lesSokedata(
  kilder: Sokekilder,
  tilstand: Tilstand,
  endret?: (base: Kunnskapsbase) => void,
): Promise<Kunnskapsbase> {
  const lager = kilder.mellomlager ?? null
  const ventetider = kilder.ventetider ?? VENTETIDER
  const tilleggskilder = TILLEGG.flatMap((kilde) => {
    const les = TILLEGGSKILDER[kilde].leser(kilder)
    return les ? [{ kilde, les: les as (inndata: string[]) => Promise<unknown> }] : []
  })

  // Hver kilde leses fra lageret bare én gang.
  const lest = new Map<Sokekilde, Promise<unknown>>()
  async function fraLager<T>(kilde: Sokekilde, inndata: string): Promise<Lagret<T> | undefined> {
    if (!lager) return undefined
    if (!lest.has(kilde)) lest.set(kilde, lager.les(lagernokkel(kilde)).catch(() => undefined))
    const lagret = (await lest.get(kilde)) as Lagret<T> | undefined
    return lagret?.bygg === KJORER.bygg && lagret.inndata === inndata ? lagret : undefined
  }

  /** Dataene fra en kilde: de lagrede når versjonen er den samme, ellers lest på nytt. */
  async function lesKilde<T>(
    kilde: Sokekilde,
    inndata: string,
    lagret: Lagret<T> | undefined,
    versjon: string | undefined,
    hent: () => Promise<T>,
  ): Promise<{ data: T } | { feil: string }> {
    if (lagret && versjon !== undefined && lagret.versjon === versjon) return { data: lagret.data }
    try {
      const data = await medGjenforsok(hent, ventetider)
      void lager?.skriv(lagernokkel(kilde), { bygg: KJORER.bygg, inndata, versjon: versjon ?? null, data } satisfies Lagret<T>)
      return { data }
    } catch (feil) {
      return lagret ? { data: lagret.data } : { feil: melding(feil) }
    }
  }

  let base: Kunnskapsbase = { sider: [] }
  // Når lesingen er avsluttet, endres ingenting mer: et svar som kommer
  // etterpå (navnene), ville ellers gitt en delvis indeks etter den endelige.
  let avsluttet = false
  const sett = (endring: Partial<Kunnskapsbase>) => {
    if (avsluttet) return
    base = { ...base, ...endring }
    endret?.(base)
  }
  const avslutt = () => {
    avsluttet = true
    return base
  }

  /** Tilleggsdataene som er lagret for sidene slik de er nå. */
  async function lagredeTillegg(): Promise<Partial<Kunnskapsbase>> {
    const modeller = base.sider.map(modellFor)
    const lagret = await Promise.all(
      tilleggskilder.map(async ({ kilde }) => {
        const inndata = TILLEGGSKILDER[kilde].inndata(modeller)
        return [kilde, inndata.length > 0 ? (await fraLager(kilde, JSON.stringify(inndata)))?.data : undefined] as const
      }),
    )
    return Object.fromEntries(lagret.filter(([, data]) => data !== undefined))
  }

  // Det som er lagret fra forrige gang, kan søkes i med én gang.
  const lagredeSider = await fraLager<Stoffsidedata[]>('sider', tilstand)
  if (lagredeSider) {
    base = { sider: lagredeSider.data }
    sett(await lagredeTillegg())
  }

  // Uten noe lagret: navnene først, så søket finner sidene før innholdet er
  // lest. Det kan komme før eller etter versjonene; sidene går foran det.
  if (!lagredeSider && kilder.stoffer) {
    kilder.stoffer().then(
      (stoffer) => {
        if (base.sider.length === 0 && !base.stoffer) sett({ stoffer })
      },
      () => undefined,
    )
  }

  const versjoner = (await kilder.versjoner?.().catch(() => null)) ?? {}

  const sider = await lesKilde('sider', tilstand, lagredeSider, versjoner.sider, () =>
    kilder.sider.lesStoffsider(tilstand),
  )
  if ('feil' in sider) {
    sett({ mangler: { sider: sider.feil } })
    return avslutt()
  }
  if (sider.data !== base.sider) {
    base = { sider: sider.data }
    sett(await lagredeTillegg())
  }

  const modeller = base.sider.map(modellFor)
  const mangler: Manglende = {}
  await Promise.all(
    tilleggskilder.map(async ({ kilde, les }) => {
      const definisjon = TILLEGGSKILDER[kilde]
      const liste = definisjon.inndata(modeller)
      if (liste.length === 0) return
      const inndata = JSON.stringify(liste)
      const svar = await lesKilde(kilde, inndata, await fraLager(kilde, inndata), versjoner[definisjon.versjon], () =>
        les(liste),
      )
      if ('feil' in svar) {
        mangler[kilde] = svar.feil
        sett({ mangler: { ...mangler } })
      } else if (svar.data !== base[kilde]) {
        sett({ [kilde]: svar.data })
      }
    }),
  )
  return avslutt()
}

/**
 * Leser alt søket indekserer: sidene i `tilstand`, og dataene fra de andre
 * kildene som er gitt.
 */
export function lesKunnskapsbase(kilder: Sokekilder, tilstand: Tilstand = 'publisert'): Promise<Kunnskapsbase> {
  return lesSokedata(kilder, tilstand)
}

/* --- Indekseringen ------------------------------------------------------------- */

/**
 * `lag` husket per objekt og nøkkel. Indeksen bygges på nytt hver gang en
 * kilde kommer til, og det som ikke er endret, gjøres da ikke om igjen.
 */
function husket<O extends object, R>(lag: (objekt: O, nokkel: string) => R): (objekt: O, nokkel: string) => R {
  const minne = new WeakMap<O, Map<string, R>>()
  return (objekt, nokkel) => {
    let perNokkel = minne.get(objekt)
    if (!perNokkel) minne.set(objekt, (perNokkel = new Map()))
    if (!perNokkel.has(nokkel)) perNokkel.set(nokkel, lag(objekt, nokkel))
    return perNokkel.get(nokkel)!
  }
}

const modeller = new WeakMap<Stoffsidedata, Sidemodell>()

function modellFor(side: Stoffsidedata): Sidemodell {
  let modell = modeller.get(side)
  if (!modell) modeller.set(side, (modell = byggSidemodell(side)))
  return modell
}

const preparatteksteneFor = husket((data: Perkobling<Preparatsokerad>, nokkel: string) =>
  preparattekster(preparatformerFraSok(data.get(nokkel) ?? [])),
)

const interaksjonsteksteneFor = husket((data: Perkobling<Interaksjonssokerad>, nokkel: string) =>
  interaksjonstekster(interaksjonerFraSok(data.get(nokkel) ?? [])),
)

const farmakogenetikkteksteneFor = husket((utvalg: Farmakogenetikkutvalg, nokkel: string) =>
  farmakogenetikktekster(byggFarmakogenetikkvisning(farmakogenetikkFor(utvalg, nokkel.split(' ')))),
)

const labteksteneFor = husket((sokedata: Labsokedata, stoff: string) => labsoketeksterFor(stoff, sokedata))

/** Tekstene fra de andre kildene på én side, de samme som søket på siden får. */
function tilleggstekster(base: Kunnskapsbase, modell: Sidemodell, stoff: string): Tilleggstekst[] {
  const kobling = koblingsnokkel(koblede(modell))
  const kjemikalier = kobledeKjemikalier(modell).join(' ')
  return [
    ...(kobling && base.preparater ? preparatteksteneFor(base.preparater, kobling) : []),
    ...(kobling && base.interaksjoner ? interaksjonsteksteneFor(base.interaksjoner, kobling) : []),
    ...(kjemikalier && base.farmakogenetikk ? farmakogenetikkteksteneFor(base.farmakogenetikk, kjemikalier) : []),
    ...labtekster(base, stoff),
  ]
}

/** Laboratorieanalysene er knyttet til stoffet, ikke til siden, og vises også for et stoff uten publisert side. */
function labtekster(base: Kunnskapsbase, stoff: string): Tilleggstekst[] {
  return base.laboratorier ? labteksteneFor(base.laboratorier, stoff) : []
}

export interface Indekseringsvalg {
  /** Stoffregisteret sidene hører til. Når det ikke er gitt: stoffene i datafilen. */
  registerdata?: Registerdata
}

const TOM_MODELL = byggSidemodell(TOM_STOFFSIDE)

/**
 * Søkedokumentene for hele kunnskapsbasen: hvert stoff i stoffregisteret —
 * med stoffsidene i databasen som registeret ikke kjenner — indeksert med
 * `indekserSide`, som på siden selv. Stoffene står alfabetisk, så like gode
 * treff kommer i en fast rekkefølge.
 *
 * Et stoff uten side i databasen indekseres med navnet, aliasene og
 * laboratorieanalysene, så søket finner det som menyen og siden gjør. En side
 * i databasen hvis nøkkel er et alias for et stoff i registeret, er ikke en
 * egen side og indekseres ikke.
 */
export function indekserKunnskapsbase(base: Kunnskapsbase, valg: Indekseringsvalg = {}): Sokedokument[] {
  const { stoffer, dokumenterFor } = stoffdokumenter(base, valg)
  return stoffer.flatMap(dokumenterFor)
}

/** Stoffene som indekseres, i fast rekkefølge, og dokumentene for hvert av dem. */
function stoffdokumenter(base: Kunnskapsbase, { registerdata = STOFFREGISTERDATA }: Indekseringsvalg) {
  // Navnene fra registeret til sidene er lest; deretter sidene selv.
  const register = byggStoffregister(
    base.sider.length > 0 ? base.sider.flatMap((s) => s.stoff ?? []) : (base.stoffer ?? []),
    registerdata,
  )
  const perSlug = new Map(base.sider.flatMap((s) => (s.stoff && s.infoside ? [[s.stoff.slug, s] as const] : [])))
  return {
    stoffer: register.stoffer,
    dokumenterFor: (stoff: (typeof register.stoffer)[number]): Sokedokument[] => {
      const data = perSlug.get(stoff.slug)
      const modell = data ? modellFor(data) : TOM_MODELL
      const identitet = stoffidentitet(stoff)
      return indekserSide(identitet, modell, data ? tilleggstekster(base, modell, stoff.slug) : labtekster(base, stoff.slug))
    },
  }
}

/**
 * Hvor lenge indekseringen arbeider i ett strekk før nettleseren slipper til.
 * En hel indeks tar flere hundre millisekunder på en treg maskin; i ett strekk
 * ville et klikk eller et tastetrykk da vente til den er ferdig.
 */
export const INDEKSERINGSSTREKK_MS = 12

/**
 * Hvor lenge indekseringen venter på at nettleseren blir ledig, før den
 * fortsetter likevel.
 */
const LENGSTE_PAUSE_MS = 500

/**
 * Venter til nettleseren er ledig: det brukeren gjør, og det appen henter og
 * viser for det, går foran indekseringen.
 */
const slippTil = (): Promise<void> =>
  new Promise((ok) => {
    if (typeof requestIdleCallback === 'function') requestIdleCallback(() => ok(), { timeout: LENGSTE_PAUSE_MS })
    else setTimeout(ok, 0)
  })

/**
 * Den samme indeksen som `lagSokeindeks(indekserKunnskapsbase(base))`, bygd i
 * strekk på høyst omtrent `strekk` millisekunder, hvert når nettleseren er
 * ledig. Hvert stoff indekseres for seg, så alt om en side står i samme del.
 */
export async function indekserStykkevis(
  base: Kunnskapsbase,
  valg: Indekseringsvalg = {},
  strekk = INDEKSERINGSSTREKK_MS,
): Promise<Sokeindeks> {
  const { stoffer, dokumenterFor } = stoffdokumenter(base, valg)
  const deler: Sokeindeks[] = []
  let start = performance.now()
  for (const stoff of stoffer) {
    deler.push(lagSokeindeks(dokumenterFor(stoff)))
    if (performance.now() - start >= strekk) {
      await slippTil()
      start = performance.now()
    }
  }
  return {
    dokumenter: deler.flatMap((d) => d.dokumenter),
    foldet: deler.flatMap((d) => d.foldet),
    nokler: deler.flatMap((d) => d.nokler),
    identitet: new Map(deler.flatMap((d) => [...d.identitet])),
  }
}

/** En søkeindeks med kildene som ikke kunne leses. */
export type Kunnskapsindeks = Sokeindeks & { mangler?: Manglende }

/**
 * Leser og indekserer hele kunnskapsbasen, klar til `sokGlobalt`.
 *
 * Søket venter ikke på noe: `delvis` får først en indeks over stoffene i
 * registeret — navnene og aliasene — så en over det som var
 * lagret fra forrige gang, og så en ny hver gang mer er lest. Det som er
 * lest, er det samme som i den endelige indeksen, så treffene på stoffene
 * står fast, og treffene fra de andre kildene kommer til under dem.
 */
export async function lesSokeindeks(
  kilder: Sokekilder,
  valg: Indekseringsvalg & { tilstand?: Tilstand } = {},
  delvis?: (indeks: Kunnskapsindeks) => void,
): Promise<Kunnskapsindeks> {
  const medMangler = (indeks: Sokeindeks, base: Kunnskapsbase): Kunnskapsindeks => ({
    ...indeks,
    ...(base.mangler && Object.keys(base.mangler).length > 0 && { mangler: base.mangler }),
  })
  delvis?.(medMangler(lagSokeindeks(indekserKunnskapsbase({ sider: [] }, valg)), { sider: [] }))
  // Én indeks om gangen, i den rekkefølgen dataene kom; den samme kunnskapsbasen
  // indekseres bare én gang, så den siste delvise er også den endelige.
  let ko: Promise<unknown> = Promise.resolve()
  const indekser = husketSiste((base: Kunnskapsbase) => {
    const indeks = ko.then(async () => medMangler(await indekserStykkevis(base, valg), base))
    ko = indeks.catch(() => undefined)
    return indeks
  })
  const base = await lesSokedata(
    kilder,
    valg.tilstand ?? 'publisert',
    delvis &&
      ((base) => {
        void indekser(base).then(delvis, () => undefined)
      }),
  )
  return indekser(base)
}

/** `lag` som gir det samme svaret igjen når det kalles med det samme som sist. */
function husketSiste<A, R>(lag: (a: A) => R): (a: A) => R {
  let sist: { a: A; r: R } | null = null
  return (a) => {
    if (sist?.a !== a) sist = { a, r: lag(a) }
    return sist.r
  }
}
