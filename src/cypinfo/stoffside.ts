/**
 * CYPinfo på fagsiden, under «Farmakogenetikk» (`docs/cypinfo-integrasjon.md`,
 * «Visningen»): for hvert legemiddel siden er koblet til, hva CYPinfo
 * anbefaler ved hver fenotype, eller at genene ikke er relevante. Visningen er
 * oppslagsverk, ikke et verktøy: ingen legger inn en pasients resultat; for det
 * lenkes det til CYPinfo.
 *
 * Et legemiddel kobles når CYPinfo har en av FEST-ID-ene i sidens
 * FEST-kobling, eller når det står i koblingslisten for siden
 * (`src/faginnhold/cypinfokoblinger.ts`).
 *
 * Alt her er rene funksjoner.
 */
import { CYPINFOKOBLINGER, cypinfoIderForSide, type Cypinfokobling } from '../faginnhold/cypinfokoblinger'
import { FARMAKOGENETIKKPANEL } from '../faginnhold/paneler'
import type { Tilleggstekst } from '../faginnhold/sok'
import type { Cypinfokilde, Cypinfoutvalg } from './lesing'
import { NIVAER, type Niva } from './modell'

/**
 * Hvem som ser CYPinfo på fagsidene. Systemarkitektene først (Peder 17.11.2026); `alle` slår det på for alle.
 * `les_cypinfo` håndhever det samme i databasen, så begge byttes i samme endring.
 */
export type Cypinfopublikum = 'systemarkitekter' | 'alle'
export const CYPINFO_VISES_FOR: Cypinfopublikum = 'systemarkitekter'

/** Om den innloggede ser CYPinfo på fagsidene. */
export const cypinfoSynlig = (r: { systemarkitekt: boolean }, publikum: Cypinfopublikum = CYPINFO_VISES_FOR): boolean =>
  publikum === 'alle' || r.systemarkitekt

export const CYPINFO_ADRESSE = 'https://cypinfo.no'
export const CYPINFO_TITTEL = 'Anbefalinger fra CYPinfo'

/** Det `les_cypinfo` skal spørres etter for siden: FEST-ID-ene i koblingen og ID-ene i koblingslisten. */
export function cypinfoForesporsel(
  festIder: readonly string[],
  side: string,
  koblinger: readonly Cypinfokobling[] = CYPINFOKOBLINGER,
): { fest_ider: string[]; cypinfo_ider: string[] } {
  return { fest_ider: [...new Set(festIder)], cypinfo_ider: cypinfoIderForSide(side, koblinger) }
}

/** En anbefaling slik kortet viser den. */
export interface Cypinforad {
  id: string
  /** Genet og fenotypen for hvert gen anbefalingen gjelder, i genenes rekkefølge. */
  fenotyper: { gen: string; fenotype: string }[]
  niva: Niva
  nivatekst: string
  avsnitt: string[]
}

/** Anbefalingene for ett sett gener: ett gen, eller flere som CYPinfo slår opp sammen. */
export interface Cypinfogensett {
  gener: string[]
  rader: Cypinforad[]
}

export interface Cypinfolegemiddel {
  id: string
  navn: string
  /** Detaljkortets nøkkel, fast for legemiddelet. */
  kort: string
  /** CYPinfos faste anbefaling når genene ikke er relevante for legemiddelet. */
  utenRelevanteGener: { niva: Niva; nivatekst: string; avsnitt: string[] } | null
  gensett: Cypinfogensett[]
}

export interface Cypinfovisning {
  kilde: Cypinfokilde
  legemidler: Cypinfolegemiddel[]
}

/** Detaljkortets nøkkel for et legemiddel: navnet, små bokstaver uten aksenter og tegn. */
export function cypinfokort(navn: string): string {
  const nokkel = navn
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `cypinfo-${nokkel || 'legemiddel'}`
}

const sammenlign = (a: string, b: string) => a.localeCompare(b, 'nb')

/**
 * Visningen av utvalget: legemidlene etter navn; for hvert av dem gensettene
 * (ett gen før flere sammen), og anbefalingene i rekkefølgen fenotypene har i
 * gentabellen.
 */
export function byggCypinfovisning(utvalg: Cypinfoutvalg): Cypinfovisning {
  // Fenotypenes rekkefølge per gen: der de først står i gentabellen.
  const plass = new Map<string, number>()
  for (const g of utvalg.genresultater) {
    const nokkel = `${g.data.gen_slug}:${g.data.fenotype_id}`
    if (!plass.has(nokkel)) plass.set(nokkel, plass.size)
  }
  const plassFor = (gen_slug: string, fenotype_id: string) => plass.get(`${gen_slug}:${fenotype_id}`) ?? Number.MAX_SAFE_INTEGER

  const perLegemiddel = new Map<string, Cypinfoutvalg['anbefalinger']>()
  for (const a of utvalg.anbefalinger) perLegemiddel.set(a.legemiddel_id, [...(perLegemiddel.get(a.legemiddel_id) ?? []), a])

  /** Rekkefølgen for to anbefalinger i samme gensett: fenotypen for første gen, så neste. */
  const forst = (a: readonly number[], b: readonly number[]) => {
    const i = a.findIndex((p, k) => p !== b[k])
    return i < 0 ? 0 : a[i]! - b[i]!
  }

  const legemidler = utvalg.legemidler.map(({ id, data }): Cypinfolegemiddel => {
    const sett = new Map<string, { gener: string[]; rader: { plasser: number[]; rad: Cypinforad }[] }>()
    for (const a of perLegemiddel.get(id) ?? []) {
      const kombinasjoner = [...a.kombinasjoner].sort((x, y) => sammenlign(x.gen, y.gen))
      const nokkel = kombinasjoner.map((k) => k.gen_slug).join(' ')
      if (!sett.has(nokkel)) sett.set(nokkel, { gener: kombinasjoner.map((k) => k.gen), rader: [] })
      sett.get(nokkel)!.rader.push({
        plasser: kombinasjoner.map((k) => plassFor(k.gen_slug, k.fenotype_id)),
        rad: {
          id: a.id,
          fenotyper: kombinasjoner.map((k) => ({ gen: k.gen, fenotype: k.fenotype })),
          niva: a.niva,
          nivatekst: NIVAER[a.niva],
          avsnitt: a.avsnitt,
        },
      })
    }
    const gensett = [...sett.values()]
      .sort((a, b) => a.gener.length - b.gener.length || sammenlign(a.gener.join(' '), b.gener.join(' ')))
      .map(({ gener, rader }) => ({ gener, rader: rader.sort((a, b) => forst(a.plasser, b.plasser)).map((r) => r.rad) }))
    const uten = data.uten_relevante_gener
    return {
      id,
      navn: data.navn,
      kort: cypinfokort(data.navn),
      utenRelevanteGener: uten ? { niva: uten.niva, nivatekst: NIVAER[uten.niva], avsnitt: uten.avsnitt } : null,
      gensett,
    }
  })
  return { kilde: utvalg.kilde, legemidler: legemidler.sort((a, b) => sammenlign(a.navn, b.navn)) }
}

/** Genene i et sett slik overskriften viser dem: «CYP2D6», eller «CYP2C19 og CYP2D6 sammen». */
export function gensettittel(gener: readonly string[]): string {
  if (gener.length < 2) return gener[0] ?? ''
  return `${gener.slice(0, -1).join(', ')} og ${gener.at(-1)} sammen`
}

/** Oppsummeringen av et legemiddels kort: genene, eller at de ikke er relevante. */
export function legemiddeloppsummering(l: Cypinfolegemiddel): string {
  if (l.gensett.length === 0) return l.utenRelevanteGener ? 'Ingen relevante gener' : 'Ingen anbefalinger'
  const gener = [...new Set(l.gensett.flatMap((s) => s.gener))]
  const antall = l.gensett.reduce((n, s) => n + s.rader.length, 0)
  return `${gener.join(', ')} · ${antall} ${antall === 1 ? 'anbefaling' : 'anbefalinger'}`
}

/** Det den lukkede seksjonen sier om CYPinfo: «CYPinfo: CYP2D6», eller ingenting uten legemidler. */
export function oppsummerCypinfo(visning: Cypinfovisning): string | null {
  if (visning.legemidler.length === 0) return null
  const gener = [...new Set(visning.legemidler.flatMap((l) => l.gensett.flatMap((s) => s.gener)))].sort(sammenlign)
  return `CYPinfo: ${gener.length > 0 ? gener.join(', ') : 'ingen relevante gener'}`
}

/**
 * Tekstene fra CYPinfo søket på siden finner, med kortet de står i: navnet på
 * legemiddelet, genene og fenotypene, nivået og CYPinfos tekst. Kortet åpnes
 * når søket peker på det, med ankeret `elementAnker(l.kort)`.
 */
export function cypinfosoketekster(visning: Cypinfovisning): Tilleggstekst[] {
  return visning.legemidler
    .flatMap((l) => {
      const legg = (felt: Tilleggstekst['felt'], tekst: string): Tilleggstekst => ({
        panel: FARMAKOGENETIKKPANEL,
        element: { id: l.kort, tittel: l.navn },
        detaljkort: l.kort,
        felt,
        tekst,
      })
      const anbefalinger = [...(l.utenRelevanteGener ? [l.utenRelevanteGener] : []), ...l.gensett.flatMap((s) => s.rader)]
      return [
        legg('overskrift', l.navn),
        ...l.gensett.map((s) => legg('overskrift', gensettittel(s.gener))),
        ...l.gensett.flatMap((s) => s.rader.flatMap((r) => r.fenotyper.map((f) => legg('verdi', `${f.gen}: ${f.fenotype}`)))),
        ...anbefalinger.flatMap((a) => [legg('verdi', a.nivatekst), ...a.avsnitt.map((t) => legg('fritekst', t))]),
      ]
    })
    .filter((t) => t.tekst.trim())
}
