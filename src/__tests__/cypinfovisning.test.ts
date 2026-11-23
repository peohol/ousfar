/**
 * CYPinfo på fagsidene (`src/cypinfo/stoffside.ts`, `src/cypinfo/lesing.ts`):
 * hvem som ser den, hva siden spør etter, lesingen av svaret, hvordan
 * anbefalingene ordnes, og referansen og tekstene søket finner
 * (`src/cypinfo/referanser.ts`, `cypinfosoketekster`, `cypinfoFor`). Med hele utdraget fra CYPinfo (`hjelp/cypinfo.ts`),
 * gjennom synkroniseringen, slik `les_cypinfo` gir det til fagsidene.
 */
import { beforeAll, describe, expect, it } from 'vitest'
import type { Cypinfolager, Uttrekksinnhold } from '../cypinfo/lager'
import {
  cypinfoFor,
  delIder,
  lagCypinfosok,
  lesCypinfoutvalg,
  slaSammenIder,
  TOMT_CYPINFOUTVALG,
  type Cypinfoleser,
  type Cypinfoutvalg,
} from '../cypinfo/lesing'
import { CYPINFO_KILDE, cypinforeferanser } from '../cypinfo/referanser'
import type { Anbefalingsdata, Genresultatdata, Legemiddeldata } from '../cypinfo/modell'
import {
  byggCypinfovisning,
  cypinfoForesporsel,
  cypinfokort,
  cypinfoSynlig,
  cypinfosoketekster,
  gensettittel,
  legemiddeloppsummering,
  oppsummerCypinfo,
} from '../cypinfo/stoffside'
import { synkroniserCypinfo } from '../cypinfo/synk'
import { CYPINFOKOBLINGER } from '../faginnhold/cypinfokoblinger'
import { METABOLITTSIDER } from '../faginnhold/metabolittsider'
import { FARMAKOGENETIKKPANEL } from '../faginnhold/paneler'
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

/** Det siden spør etter og får, som på fagsiden (`useCypinfo`). */
const sidensIder = (side: string, fest_ider = fagside(side).fest_ider) => slaSammenIder(cypinfoForesporsel(fest_ider, side))
const visningFor = (side: string, fest_ider?: readonly string[]) => {
  const { fest_ider: fest, cypinfo_ider } = delIder(sidensIder(side, fest_ider ? [...fest_ider] : undefined))
  return byggCypinfovisning(utvalg(fest, cypinfo_ider))
}
const legemiddelId = (navn: string) => innhold.entiteter.legemiddel.rader.find((r) => (r.data as Legemiddeldata).navn === navn)!.id
const tekstene = (side: string, fest_ider?: readonly string[]) => cypinfosoketekster(visningFor(side, fest_ider))
/** En fagside CYPinfo ikke har noe for. */
const udekket = () => CYPINFO.fagsider.find((f) => visningFor(f.side).legemidler.length === 0 && !METABOLITTSIDER.some((m) => m.side === f.side))!.side
const av = (tekster: ReturnType<typeof cypinfosoketekster>, felt: string) => tekster.filter((t) => t.felt === felt).map((t) => t.tekst)

describe('referansen til CYPinfo', () => {
  it('står i referansefeltet til «Farmakogenetikk» når siden viser noe fra CYPinfo, uten lisens', () => {
    const kilder = cypinforeferanser(visningFor('Aripiprazol'))
    expect(kilder.panelreferanser).toEqual({ [FARMAKOGENETIKKPANEL]: [CYPINFO_KILDE] })
    const [kilde] = kilder.referanser
    expect(kilde).toMatchObject({
      id: CYPINFO_KILDE,
      tittel: 'CYPinfo',
      lenke: 'https://cypinfo.no',
      forfattere: expect.stringContaining('Oslo universitetssykehus'),
      automatisk: { kilde: 'CYPinfo', opphav: 'Anbefalinger fra CYPinfo, gjengitt uendret, sist kontrollert 18. november 2026' },
    })
    // CYPinfo oppgir ingen lisens, så referansen nevner ingen.
    expect(kilde!.automatisk!.lenker).toBeUndefined()
    expect(JSON.stringify(kilde)).not.toMatch(/lisens|CC BY/i)
  })

  it('står ikke når siden ikke viser noe fra CYPinfo, eller ingenting er hentet', () => {
    expect(cypinforeferanser(visningFor(udekket()))).toEqual({ referanser: [] })
    expect(cypinforeferanser(null)).toEqual({ referanser: [] })
  })
})

describe('tekstene søket finner', () => {
  it('står i legemiddelets kort i «Farmakogenetikk», med navnet, genene, fenotypene, nivået og CYPinfos tekst', () => {
    const visning = visningFor('Aripiprazol')
    const tekster = cypinfosoketekster(visning)
    const [l] = visning.legemidler
    expect(tekster.every((t) => t.panel === FARMAKOGENETIKKPANEL && t.detaljkort === l!.kort && t.element.id === l!.kort)).toBe(true)
    expect(av(tekster, 'overskrift')).toEqual(['aripiprazol', 'CYP2D6'])
    expect(av(tekster, 'verdi')).toContain('CYP2D6: Normal enzymaktivitet')
    expect(av(tekster, 'verdi')).toContain(l!.gensett[0]!.rader[0]!.nivatekst)
    expect(av(tekster, 'fritekst')).toEqual(l!.gensett.flatMap((s) => s.rader.flatMap((r) => r.avsnitt)))
  })

  it('har kodein med CYP2D6', () => {
    expect(av(tekstene('Kodein'), 'overskrift')).toEqual(['kodein', 'CYP2D6'])
  })

  it('har genene TCA-ene slås opp på sammen', () => {
    expect(av(tekstene('Amitriptylin'), 'overskrift')).toContain('CYP2C19 og CYP2D6 sammen')
    expect(av(tekstene('Klomipramin'), 'overskrift')).toContain('CYP2C19 og CYP2D6 sammen')
  })

  it('har sertralin med hvert gen for seg og begge sammen', () => {
    expect(av(tekstene('Sertralin'), 'overskrift')).toEqual(['sertralin', 'CYP2B6', 'CYP2C19', 'CYP2B6 og CYP2C19 sammen'])
  })

  it('har warfarin med genene CYPinfo oppgir', () => {
    const tekster = cypinfosoketekster(byggCypinfovisning(utvalg([], [legemiddelId('warfarin')])))
    const overskrifter = av(tekster, 'overskrift')
    expect(overskrifter[0]).toBe('warfarin')
    expect(overskrifter.join(' ')).toMatch(/CYP2C9/)
    expect(overskrifter.join(' ')).toMatch(/VKORC1/)
  })

  it('har esketamin på Ketamin, gjennom koblingslisten', () => {
    const tekster = tekstene('Ketamin')
    expect(av(tekster, 'overskrift')[0]).toBe('esketamin')
    // Uten relevante gener: CYPinfos faste tekst og nivået, ingen fenotyper.
    expect(av(tekster, 'fritekst').length).toBeGreaterThan(0)
    expect(av(tekster, 'verdi').some((t) => t.includes(':'))).toBe(false)
  })

  it('er tomme på metabolittsidene og på sider CYPinfo ikke har', () => {
    for (const { side } of METABOLITTSIDER) {
      expect({ side, tekster: tekstene(side), referanser: cypinforeferanser(visningFor(side)).referanser }).toEqual({ side, tekster: [], referanser: [] })
    }
    expect(tekstene(udekket())).toEqual([])
  })
})

describe('CYPinfo i søket i hele kunnskapsbasen', () => {
  it('gir hver side det samme som siden selv får fra `les_cypinfo`', () => {
    const alle = innhold.entiteter.legemiddel.rader.map((r) => r.id)
    const alt = utvalg([], alle)
    for (const { side } of CYPINFO.fagsider) {
      const ider = sidensIder(side)
      const { fest_ider, cypinfo_ider } = delIder(ider)
      expect({ side, utvalg: cypinfoFor(alt, ider) }).toEqual({ side, utvalg: utvalg(fest_ider, cypinfo_ider) })
    }
  })

  it('skiller FEST-ID-ene fra CYPinfo-ID-ene i én liste', () => {
    const foresporsel = { fest_ider: ['ID_A'], cypinfo_ider: ['abc'] }
    expect(slaSammenIder(foresporsel)).toEqual(['ID_A', 'cypinfo:abc'])
    expect(delIder(slaSammenIder(foresporsel))).toEqual(foresporsel)
  })

  it('leser i kall på høyst det `les_cypinfo` tar, og slår svarene sammen med hver rad én gang', async () => {
    const kall: { fest_ider: readonly string[]; cypinfo_ider: readonly string[] }[] = []
    const leser: Cypinfoleser = {
      les: async (fest_ider, cypinfo_ider) => {
        kall.push({ fest_ider, cypinfo_ider })
        return utvalg(fest_ider, cypinfo_ider)
      },
    }
    const ider = [...sidensIder('Amitriptylin'), ...sidensIder('Nortriptylin'), ...sidensIder('Ketamin')]
    const lest = await lagCypinfosok(leser, 2).les(ider)
    expect(kall.length).toBe(Math.ceil(ider.length / 2))
    expect(kall.every((k) => k.fest_ider.length + k.cypinfo_ider.length <= 2)).toBe(true)
    const { fest_ider, cypinfo_ider } = delIder(ider)
    const samlet = utvalg(fest_ider, cypinfo_ider)
    const sortert = (u: Cypinfoutvalg) => ({
      legemidler: u.legemidler.map((l) => l.id).sort(),
      anbefalinger: u.anbefalinger.map((a) => a.id).sort(),
      genresultater: u.genresultater.map((g) => g.id).sort(),
    })
    expect(sortert(lest)).toEqual(sortert(samlet))
    expect(await lagCypinfosok(leser).les([])).toEqual({ ...TOMT_CYPINFOUTVALG })
  })
})
