/**
 * CYPinfo på fagsidene (`src/cypinfo/stoffside.ts`, `src/cypinfo/lesing.ts`):
 * hvem som ser den, hva siden spør etter, lesingen av svaret og hvordan
 * anbefalingene ordnes. Med hele utdraget fra CYPinfo (`hjelp/cypinfo.ts`),
 * gjennom synkroniseringen, slik `les_cypinfo` gir det til fagsidene.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import type { Cypinfolager, Uttrekksinnhold } from '../cypinfo/lager'
import { lesCypinfoutvalg, TOMT_CYPINFOUTVALG, type Cypinfoutvalg } from '../cypinfo/lesing'
import type { Anbefalingsdata, Genresultatdata, Legemiddeldata } from '../cypinfo/modell'
import {
  byggCypinfovisning,
  cypinfoForesporsel,
  cypinfokort,
  cypinfoSynlig,
  gensettittel,
  legemiddeloppsummering,
  oppsummerCypinfo,
} from '../cypinfo/stoffside'
import { synkroniserCypinfo } from '../cypinfo/synk'
import { CYPINFOKOBLINGER } from '../faginnhold/cypinfokoblinger'
import { CYPINFO, falskCypinfoApi } from './hjelp/cypinfo'

/** Det synkroniseringen ville byttet inn, fanget uten database. */
let innhold: Uttrekksinnhold

beforeAll(async () => {
  const lager: Cypinfolager = {
    forrige: async () => ({ gener: {} }),
    start: async () => 1,
    fullfor: async (_, i) => {
      innhold = i
      return { status: 'fullfort', antall: {} as never }
    },
    avbryt: async (_, feil) => {
      throw new Error(feil)
    },
  }
  await synkroniserCypinfo({ lager, api: falskCypinfoApi() })
})

/** Det `les_cypinfo` gir for disse FEST- og CYPinfo-ID-ene. */
function utvalg(fest_ider: readonly string[], cypinfo_ider: readonly string[] = []): Cypinfoutvalg {
  const legemidler = innhold.entiteter.legemiddel.rader
    .map((r) => ({ id: r.id, data: r.data as Legemiddeldata }))
    .filter((l) => cypinfo_ider.includes(l.id) || l.data.fest.some((f) => fest_ider.includes(f)))
  const ider = new Set(legemidler.map((l) => l.id))
  const gener = new Set(legemidler.flatMap((l) => l.data.gener))
  return {
    kilde: { navn: 'CYPinfo', endret_kl: '2026-11-18T03:47:00Z', kontrollert_kl: '2026-11-18T03:47:00Z' },
    legemidler,
    anbefalinger: innhold.entiteter.anbefaling.rader.flatMap((r) => {
      const d = r.data as Anbefalingsdata
      return ider.has(d.legemiddel_id) ? [{ id: r.id, legemiddel_id: d.legemiddel_id, kombinasjoner: d.kombinasjoner, niva: d.niva, avsnitt: d.avsnitt }] : []
    }),
    genresultater: innhold.entiteter.genresultat.rader
      .map((r) => ({ id: r.id, data: r.data as Genresultatdata }))
      .filter((g) => gener.has(g.data.gen_slug))
      .sort((a, b) => (a.id < b.id ? -1 : 1)),
  }
}

const fagside = (side: string) => CYPINFO.fagsider.find((f) => f.side === side)!

describe('hvem som ser CYPinfo', () => {
  it('er systemarkitektene først, og alle når det slås på', () => {
    expect(cypinfoSynlig({ systemarkitekt: true })).toBe(true)
    expect(cypinfoSynlig({ systemarkitekt: false })).toBe(false)
    expect(cypinfoSynlig({ systemarkitekt: false }, 'alle')).toBe(true)
  })
})

describe('det fagsiden spør etter', () => {
  it('er FEST-ID-ene i sidens kobling og legemidlene koblingslisten har for siden', () => {
    expect(cypinfoForesporsel(['ID_A', 'ID_A', 'ID_B'], 'Aripiprazol')).toEqual({ fest_ider: ['ID_A', 'ID_B'], cypinfo_ider: [] })
    const esketamin = CYPINFOKOBLINGER.find((k) => k.navn === 'esketamin')!
    expect(cypinfoForesporsel([], 'Ketamin')).toEqual({ fest_ider: [], cypinfo_ider: [esketamin.cypinfo_id] })
  })
})

describe('lesingen av svaret', () => {
  it('utelater rader som mangler noe eller har et ukjent nivå, i stedet for å vise dem halvt', () => {
    const helt = utvalg(fagside('Aripiprazol').fest_ider)
    const svar = {
      ...helt,
      anbefalinger: [
        ...helt.anbefalinger,
        { ...helt.anbefalinger[0], id: 'ukjent-niva', niva: 'kritisk' },
        { ...helt.anbefalinger[0], id: 'uten-kombinasjoner', kombinasjoner: [] },
        { id: 'uten-legemiddel' },
      ],
      legemidler: [...helt.legemidler, { id: 'uten-data' }],
    }
    const lest = lesCypinfoutvalg(JSON.parse(JSON.stringify(svar)))
    expect(lest.anbefalinger.map((a) => a.id)).toEqual(helt.anbefalinger.map((a) => a.id))
    expect(lest.legemidler.map((l) => l.id)).toEqual(helt.legemidler.map((l) => l.id))
    expect(lesCypinfoutvalg(null)).toEqual(TOMT_CYPINFOUTVALG)
  })
})

describe('visningen', () => {
  it('viser ett gen med én anbefaling per fenotype, i gentabellens rekkefølge', () => {
    const visning = byggCypinfovisning(utvalg(fagside('Aripiprazol').fest_ider))
    expect(visning.legemidler.map((l) => [l.navn, l.kort])).toEqual([['aripiprazol', 'cypinfo-aripiprazol']])
    const [sett] = visning.legemidler[0]!.gensett
    expect(sett!.gener).toEqual(['CYP2D6'])
    expect(sett!.rader[0]!.fenotyper).toEqual([{ gen: 'CYP2D6', fenotype: 'Normal enzymaktivitet' }])
    expect(new Set(sett!.rader.map((r) => r.fenotyper[0]!.fenotype)).size).toBe(sett!.rader.length)
    expect(sett!.rader.every((r) => r.avsnitt.length > 0 && r.nivatekst.length > 0)).toBe(true)
    expect(oppsummerCypinfo(visning)).toBe('CYPinfo: CYP2D6')
  })

  it('viser genene CYPinfo slår opp sammen, med hele produktet av fenotyper', () => {
    const visning = byggCypinfovisning(utvalg(fagside('Amitriptylin').fest_ider))
    const ami = visning.legemidler.find((l) => l.navn === 'amitriptylin')!
    expect(ami.gensett.map((s) => [s.gener, s.rader.length])).toEqual([[['CYP2C19', 'CYP2D6'], 25]])
    expect(gensettittel(ami.gensett[0]!.gener)).toBe('CYP2C19 og CYP2D6 sammen')
    expect(legemiddeloppsummering(ami)).toBe('CYP2C19, CYP2D6 · 25 anbefalinger')
    // Sortert på fenotypen for det første genet, så det andre.
    const forste = ami.gensett[0]!.rader.slice(0, 5).map((r) => r.fenotyper[0]!.fenotype)
    expect(new Set(forste).size).toBe(1)
  })

  it('viser hvert gen for seg før genene sammen, når CYPinfo har begge', () => {
    const visning = byggCypinfovisning(utvalg(fagside('Sertralin').fest_ider))
    expect(visning.legemidler[0]!.gensett.map((s) => s.gener)).toEqual([['CYP2B6'], ['CYP2C19'], ['CYP2B6', 'CYP2C19']])
  })

  it('viser CYPinfos faste tekst når genene ikke er relevante', () => {
    const uten = innhold.entiteter.legemiddel.rader.find((r) => (r.data as Legemiddeldata).uten_relevante_gener)!
    const visning = byggCypinfovisning(utvalg([], [uten.id]))
    const l = visning.legemidler[0]!
    expect(l.gensett).toEqual([])
    expect(l.utenRelevanteGener?.avsnitt.length).toBeGreaterThan(0)
    expect(legemiddeloppsummering(l)).toBe('Ingen relevante gener')
    expect(oppsummerCypinfo(visning)).toBe('CYPinfo: ingen relevante gener')
  })

  it('viser ingenting for en side CYPinfo ikke har', () => {
    const visning = byggCypinfovisning(utvalg(['ID_FINNES-IKKE']))
    expect(visning.legemidler).toEqual([])
    expect(oppsummerCypinfo(visning)).toBeNull()
  })

  it('gir hvert legemiddel en fast kortnøkkel uten aksenter og tegn', () => {
    expect(cypinfokort('Fluoksetin (Fontex)')).toBe('cypinfo-fluoksetin-fontex')
    expect(cypinfokort('Åse')).toBe('cypinfo-ase')
  })
})
