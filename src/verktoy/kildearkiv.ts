/**
 * Kildearkivet for Psychiatrienets anbefalinger (P3 i
 * `docs/verktøy-utviklingsplan.md`): hver innhenting av de tre
 * switchtabellene og kildesidene, versjonert, i
 * `src/data/verktoy/psychiatrienet-kildearkiv.json`.
 *
 * Arkivet vokser bare. En innhenting legger til et nytt uttrekk; en tabell
 * eller side som er uendret siden forrige uttrekk, får bare `sist_sett`
 * flyttet frem, og en som er endret eller ny, får en ny versjon ved siden av de
 * gamle. Ingen versjon endres eller slettes, så en eldre kildeversjon aldri
 * går tapt og en endring alltid kan vises. Arkivet er kildedata, ikke regler:
 * det publiserer ingenting og endrer ingen godkjent regel (P4).
 *
 * Arkivet har ingen anbefalingstekst, bare det `kildeside.ts` leser av hver
 * side og tabellene som `Arkivtabell` (`docs/verktøy-p3-rettigheter.md`).
 * Testene har den fullstendige listen over feltene arkivet kan ha (`ARKIVFELT`).
 */
import type { Kildeinnhold } from './kildeside'
import type { Arkivtabell, Tabell_id } from './kildetabeller'

export interface Uttrekk {
  nr: number
  startet: string
  ferdig: string
  /** `LESERVERSJON` da uttrekket ble gjort. */
  leser: number
}

/** Hvilke uttrekk en versjon ble sett i: fra og med `forst_sett` til og med `sist_sett`, uten opphold. */
export interface Sett {
  forst_sett: number
  sist_sett: number
}

export interface Tabellinnhenting extends Arkivtabell {
  tabell: Tabell_id
  url: string
  hentet: string
  /** SHA-256 av tabellens HTML, som i P1. */
  sha256: string
  revisjon: number | null
  lagret: string | null
}

export interface Sideinnhenting {
  href: string
  url: string
  hentet: string
  status: number
  /** Adressen etter videresending, når den er en annen. */
  endelig: string | null
  leser: number
  /** Det som ble lest av siden; `null` når den ikke svarte 200. */
  innhold: Kildeinnhold | null
}

export type Tabellversjon = Tabellinnhenting & Sett
export type Sideversjon = Sideinnhenting & Sett

export interface Kildearkiv {
  om: string
  uttrekk: Uttrekk[]
  tabeller: Tabellversjon[]
  sider: Sideversjon[]
}

export interface Innhenting {
  startet: string
  ferdig: string
  leser: number
  tabeller: Tabellinnhenting[]
  sider: Sideinnhenting[]
}

export type Endringstype = 'ny' | 'endret' | 'uendret' | 'forsvunnet'

export interface Endring {
  type: Endringstype
  hva: 'tabell' | 'side'
  id: string
}

export const TOMT_ARKIV: Kildearkiv = {
  om: 'Psychiatrienets switchtabeller og kildesider, versjonert. Bare metadata og kontrollsummer, ingen anbefalingstekst. Laget av `npm run verktoy:kildeimport -- hent`.',
  uttrekk: [],
  tabeller: [],
  sider: [],
}

/** Det som avgjør om to innhentinger av samme tabell eller side er samme versjon: alt utenom tidspunktet. */
function innholdsnokkel(x: { hentet: string }): string {
  const { hentet: _h, ...resten } = x
  return stabil(resten)
}

/** JSON med nøklene sortert på alle nivåer, så rekkefølgen aldri lager en ny versjon. */
function stabil(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stabil).join(',')}]`
  if (x && typeof x === 'object') {
    return `{${Object.keys(x)
      .sort()
      .filter((n) => (x as Record<string, unknown>)[n] !== undefined)
      .map((n) => `${JSON.stringify(n)}:${stabil((x as Record<string, unknown>)[n])}`)
      .join(',')}}`
  }
  return JSON.stringify(x)
}

function utenSett<T extends Sett>(x: T): Omit<T, keyof Sett> {
  const { forst_sett: _f, sist_sett: _s, ...resten } = x
  return resten
}

function registrer<T extends Tabellinnhenting | Sideinnhenting>(
  versjoner: (T & Sett)[],
  nye: T[],
  id: (x: T) => string,
  nr: number,
  hva: Endring['hva'],
): Endring[] {
  const endringer: Endring[] = []
  const sett = new Set<string>()
  for (const ny of nye) {
    const nokkel = id(ny)
    if (sett.has(nokkel)) throw new Error(`${nokkel} er hentet to ganger i samme innhenting`)
    sett.add(nokkel)
    const tidligere = versjoner.filter((v) => id(v) === nokkel)
    const siste = tidligere.reduce<(T & Sett) | null>((a, v) => (!a || v.forst_sett > a.forst_sett ? v : a), null)
    if (siste && siste.sist_sett === nr - 1 && innholdsnokkel(utenSett(siste)) === innholdsnokkel(ny)) {
      siste.sist_sett = nr
      endringer.push({ type: 'uendret', hva, id: nokkel })
      continue
    }
    versjoner.push({ ...ny, forst_sett: nr, sist_sett: nr })
    endringer.push({ type: !siste ? 'ny' : siste.sist_sett === nr - 1 ? 'endret' : 'ny', hva, id: nokkel })
  }
  const forsvunnet = new Set(versjoner.filter((v) => v.sist_sett === nr - 1).map(id))
  for (const nokkel of forsvunnet) if (!sett.has(nokkel)) endringer.push({ type: 'forsvunnet', hva, id: nokkel })
  return endringer
}

/**
 * Legger en innhenting til arkivet som et nytt uttrekk, uten å endre det som
 * står der: returnerer et nytt arkiv og hva som er nytt, endret, uendret eller
 * ikke lenger finnes siden forrige uttrekk.
 */
export function registrerInnhenting(arkiv: Kildearkiv, inn: Innhenting): { arkiv: Kildearkiv; endringer: Endring[] } {
  const ut = structuredClone(arkiv)
  const nr = (ut.uttrekk.at(-1)?.nr ?? 0) + 1
  ut.uttrekk.push({ nr, startet: inn.startet, ferdig: inn.ferdig, leser: inn.leser })
  const endringer = [
    ...registrer(ut.tabeller, structuredClone(inn.tabeller), (t) => t.tabell, nr, 'tabell'),
    ...registrer(ut.sider, structuredClone(inn.sider), (s) => s.href, nr, 'side'),
  ]
  ut.tabeller.sort((a, b) => a.tabell.localeCompare(b.tabell) || a.forst_sett - b.forst_sett)
  ut.sider.sort((a, b) => a.href.localeCompare(b.href) || a.forst_sett - b.forst_sett)
  return { arkiv: ut, endringer }
}

/** Hva som er nytt, endret og borte i uttrekk `nr` sammenlignet med uttrekket før (ikke det som er uendret). */
export function uttrekksendringer(arkiv: Kildearkiv, nr = arkiv.uttrekk.at(-1)?.nr ?? 0): Endring[] {
  const ut: Endring[] = []
  const se = <T extends Sett>(versjoner: T[], id: (v: T) => string, hva: Endring['hva']) => {
    const ider = [...new Set(versjoner.map(id))].sort()
    for (const x of ider) {
      const egne = versjoner.filter((v) => id(v) === x)
      const naa = egne.find((v) => v.forst_sett <= nr && nr <= v.sist_sett)
      const for_ = egne.find((v) => v.forst_sett <= nr - 1 && nr - 1 <= v.sist_sett)
      if (naa && !for_) ut.push({ type: 'ny', hva, id: x })
      else if (naa && for_ && naa !== for_) ut.push({ type: 'endret', hva, id: x })
      else if (!naa && for_) ut.push({ type: 'forsvunnet', hva, id: x })
    }
  }
  se(arkiv.tabeller, (t) => t.tabell, 'tabell')
  se(arkiv.sider, (s) => s.href, 'side')
  return ut
}

/** Tabellene og sidene slik de var i uttrekk `nr` (det siste når det ikke er gitt). */
export function utsnitt(arkiv: Kildearkiv, nr = arkiv.uttrekk.at(-1)?.nr ?? 0): { uttrekk: Uttrekk; tabeller: Tabellversjon[]; sider: Map<string, Sideversjon> } {
  const uttrekk = arkiv.uttrekk.find((u) => u.nr === nr)
  if (!uttrekk) throw new Error(`Arkivet har ikke uttrekk ${nr}`)
  const i = (v: Sett) => v.forst_sett <= nr && nr <= v.sist_sett
  return {
    uttrekk,
    tabeller: arkiv.tabeller.filter(i),
    sider: new Map(arkiv.sider.filter(i).map((s) => [s.href, s])),
  }
}
