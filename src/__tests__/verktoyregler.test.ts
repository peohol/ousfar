/**
 * Regelmodellen og pilotsettet for OUSFAR Verktøy (P4 i
 * `docs/verktøy-utviklingsplan.md`): hver nedtrappingsstrategi ved
 * grenseverdiene, utvasking, depot og datoer, at beregningen stopper i
 * stedet for å gjette (ukjente unntak, dosespenn, ugyldige datoer og
 * parametre), at den aldri kaster, er deterministisk og bærer versjonene, at
 * en godkjenning bare gjelder nøyaktig den kontrollerte regelversjonen, at
 * pilotreglenes regneeksempler (regnet ut for hånd) stemmer, at ingen regel
 * er klinisk godkjent eller bygger på Psychiatrienet, at kontrollene slår ut
 * på feil (også en Psychiatrienet-referanse med feil retning), at bare
 * verktøymodulene bruker reglene, og at rapporten er oppdatert og sier hvor
 * mange regler som faktisk er godkjent.
 */
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  avrund,
  beregn,
  datoFor,
  erIsoDato,
  FORBEHOLD_GODKJENT,
  FORBEHOLD_IKKE_GODKJENT,
  kortform,
  leggTilMaaneder,
  MOTORVERSJON,
  trinnserie,
  type Beregningsresultat,
} from '../verktoy/regler/beregning'
import { fingeravtrykk, godkjenningsfeil, kanonisk, sha256 } from '../verktoy/regler/godkjenning'
import { KILDER } from '../verktoy/regler/kilder'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import {
  alleGrunnlag,
  apneValg,
  henvisninger,
  REGELMODELLVERSJON,
  type Avklaring,
  type Nedtrappingsstrategi,
  type Parameter,
  type Regel,
  type Regelsett,
} from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { lagRegelrapport, REGELRAPPORTFIL } from '../verktoy/regler/rapport'

const GRUNNLAG = lesKontrollgrunnlag()
const regel = (id: string) => structuredClone(PILOTSETT.regler.find((r) => r.id === id)!)
const p = (verdi: number | null, enhet: Parameter['enhet'] = 'mg'): Parameter => ({
  verdi,
  enhet,
  art: 'veiledende_preferanse',
  grunnlag: { type: 'ousfar_vurdering', begrunnelse: 'test', avklaring: null },
})
const serie = (s: Nedtrappingsstrategi, d0: number) => trinnserie(s, d0).map(avrund)
const stoppgrunner = (r: Beregningsresultat) => (r.status === 'stoppet' ? r.stoppgrunner : [])
const sett = (regler: Regel[]): Regelsett => ({ ...PILOTSETT, regler })
/** Legger til en klinisk godkjenning av regelen slik den er nå. */
const godkjenn = (r: Regel, av = 'Uavhengig kontrollør') => {
  r.godkjenning = {
    status: 'klinisk_godkjent',
    historikk: [
      ...r.godkjenning.historikk,
      { status: 'klinisk_godkjent', dato: '2026-11-01', av, rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), merknad: 'test' },
    ],
  }
  return r
}
/** Avklarer hver åpen OUSFAR-vurdering og validerer foreslåtte medlemmer, slik en uavhengig kontrollør ville gjort det. */
const avklarAlle = (r: Regel, av = 'Uavhengig kontrollør') => {
  const avklaring: Avklaring = { dato: '2026-11-01', av, rolle: 'uavhengig_kontrollor', regelversjon: r.versjon, merknad: 'Vurdert og akseptert.' }
  for (const [, g] of alleGrunnlag(r)) if (g.type === 'ousfar_vurdering' && !g.avklaring) g.avklaring = { ...avklaring }
  for (const m of r.medlemmer ?? []) if (m.validering === 'foreslatt') m.validering = 'validert'
  return r
}
const XEPLION = { startdose_mg: 6, bekreftet: ['indikasjon'], pasientforhold: { nedsatt_nyrefunksjon: false } }
const MAINTENA = { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: { cyp2d6_langsom: false, sterk_cyp_hemmer: false, cyp3a4_induktor: false } }
const AP = ['indikasjon', 'peroral_formulering']

describe('Nedtrappingsstrategiene', () => {
  it('prosent av aktuell dose: beholder en dose lik sluttdosen, seponerer like under', () => {
    const s = (slutt: number): Nedtrappingsstrategi => ({ type: 'prosent_av_aktuell', prosent: p(50, 'prosent'), sluttdose_mg: p(slutt) })
    expect(serie(s(5), 20)).toEqual([10, 5])
    expect(serie(s(5.0001), 20)).toEqual([10])
    expect(serie(s(10), 10)).toEqual([])
  })

  it('prosent av aktuell dose: bytter til lav prosent når dosen er lik grensen, ikke før', () => {
    const s = (grense: number): Nedtrappingsstrategi => ({
      type: 'prosent_av_aktuell',
      prosent: p(50, 'prosent'),
      lav_prosent: p(25, 'prosent'),
      lav_grense_mg: p(grense),
      sluttdose_mg: p(2.5),
    })
    expect(serie(s(5), 20)).toEqual([10, 5, 3.75, 2.81])
    expect(serie(s(4.99), 20)).toEqual([10, 5, 2.5])
    expect(serie(s(10), 20)).toEqual([10, 7.5, 5.63, 4.22, 3.16])
  })

  it('prosent av startdosen er lineær, og et siste trinn under null blir seponering', () => {
    expect(serie({ type: 'prosent_av_startdose', prosent: p(25, 'prosent') }, 20)).toEqual([15, 10, 5])
    expect(serie({ type: 'prosent_av_startdose', prosent: p(30, 'prosent') }, 100)).toEqual([70, 40, 10])
    expect(serie({ type: 'prosent_av_startdose', prosent: p(100, 'prosent') }, 100)).toEqual([])
  })

  it('absolutte trinn går ned med samme antall mg', () => {
    expect(serie({ type: 'absolutt', mg: p(5) }, 20)).toEqual([15, 10, 5])
    expect(serie({ type: 'absolutt', mg: p(6) }, 20)).toEqual([14, 8, 2])
  })

  it('hyperbolsk: like store trinn i beregnet binding, stadig mindre dosetrinn, n − 1 doser over null', () => {
    const s: Nedtrappingsstrategi = { type: 'hyperbolsk', ed50_mg: p(3.4), trinn: p(8, 'trinn') }
    const doser = trinnserie(s, 20)
    expect(doser).toHaveLength(7)
    const binding = [20, ...doser].map((d) => d / (3.4 + d))
    const steg = binding.slice(1).map((b, i) => binding[i]! - b)
    for (const x of steg) expect(x).toBeCloseTo(binding[0]! / 8, 10)
    const dosetrinn = [20, ...doser].slice(1).map((d, i) => [20, ...doser][i]! - d)
    for (let i = 1; i < dosetrinn.length; i++) expect(dosetrinn[i]).toBeLessThan(dosetrinn[i - 1]!)
    expect(serie({ type: 'hyperbolsk', ed50_mg: p(3.4), trinn: p(1, 'trinn') }, 20)).toEqual([])
  })

  it('kaster når en strategi aldri når null, i stedet for å gå i ring', () => {
    expect(() => trinnserie({ type: 'absolutt', mg: p(0) }, 20)).toThrow(/når ikke 0/)
  })
})

describe('Datoer', () => {
  it('godtar bare gyldige kalenderdatoer som ÅÅÅÅ-MM-DD', () => {
    for (const d of ['2027-02-28', '2028-02-29', '2026-12-31']) expect(erIsoDato(d), d).toBe(true)
    for (const d of ['2027-02-29', '2027-02-31', '2027-13-01', '2027-00-10', '2027-1-5', 'i morgen', '', '2027-02-28T00:00']) expect(erIsoDato(d), d).toBe(false)
  })

  it('dag 1 er startdatoen, også over et årsskifte', () => {
    expect(datoFor('2026-12-30', 1)).toBe('2026-12-30')
    expect(datoFor('2026-12-30', 3)).toBe('2027-01-01')
  })

  it('én måned senere er samme dato, eller siste dag i en kortere måned', () => {
    expect(leggTilMaaneder('2027-01-15', 1)).toBe('2027-02-15')
    expect(leggTilMaaneder('2027-01-31', 1)).toBe('2027-02-28')
    expect(leggTilMaaneder('2028-01-31', 1)).toBe('2028-02-29')
    expect(leggTilMaaneder('2027-12-31', 1)).toBe('2028-01-31')
  })
})

describe('Pilotsettet', () => {
  it('består alle kontrollene', () => {
    expect(kontrollerRegelsett(PILOTSETT, GRUNNLAG)).toEqual([])
  })

  it('har ingen klinisk godkjent regel; alle er til faglig kontroll i sin gjeldende versjon, med historikk', () => {
    for (const r of PILOTSETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(godkjenningsfeil(r).length, r.id).toBeGreaterThan(0)
      const forventet = r.versjon === 1 ? ['utkast', 'til_faglig_kontroll'] : ['utkast', 'til_faglig_kontroll', 'utkast', 'til_faglig_kontroll']
      expect(r.godkjenning.historikk.map((s) => s.status), r.id).toEqual(forventet)
      expect(r.godkjenning.historikk.at(-1)!.regelversjon, r.id).toBe(r.versjon)
      expect(r.godkjenning.historikk.every((s) => s.rolle === 'utvikler')).toBe(true)
    }
    // Reglene som ble rettet etter første kontroll, er nye versjoner.
    expect(PILOTSETT.regler.filter((r) => r.versjon === 2).map((r) => r.id)).toEqual([
      'antipsykotikabytte-olanzapin-kvetiapin',
      'gruppe-rest-ap-aripiprazol',
      'depot-aripiprazol-maintena',
      'depot-paliperidon-xeplion',
    ])
  })

  it('dekker regelklassene planen prioriterer', () => {
    const r = PILOTSETT.regler
    const json = JSON.stringify(r)
    expect(new Set(r.map((x) => x.plan.form))).toEqual(new Set(['seponering', 'kryssnedtrapping', 'sekvensielt', 'oppstart_depot']))
    for (const t of ['prosent_av_aktuell', 'prosent_av_startdose', 'hyperbolsk', 'opptrapping', 'etter_utvasking', 'injeksjoner', 'tabell', 'uten_beregning']) {
      expect(json, t).toContain(`"type":"${t}"`)
    }
    expect(r.some((x) => x.medlemmer)).toBe(true)
    expect(r.some((x) => x.unntak.length > 0) && r.some((x) => x.bekreftelser.length > 0)).toBe(true)
    expect(new Set(r.map((x) => x.beregnbarhet))).toEqual(new Set(['entydig_beregnbar', 'beregnbar_etter_avklaring']))
  })

  it('bruker Psychiatrienet bare som referanse til en P3-kildeoppføring, uten innhold', () => {
    for (const r of PILOTSETT.regler) {
      expect(r.referanser.length, r.id).toBeGreaterThan(0)
      for (const h of r.referanser) {
        expect(Object.keys(h).sort()).toEqual(['kilde', 'kildeoppforing'])
        expect(GRUNNLAG.kildeoppforinger.has((h as { kildeoppforing: string }).kildeoppforing)).toBe(true)
      }
      expect(henvisninger({ ...r, referanser: [] }).filter((h) => h.kilde === 'psychiatrienet'), r.id).toEqual([])
    }
  })

  it('har kontrollsum og hentetidspunkt for hver kilde som er lest i sin helhet', () => {
    for (const k of KILDER) {
      expect(k.hentet).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/)
      if (k.type !== 'kildeoppføring' && k.id !== 'horowitz-2019') expect(k.sha256, k.id).toMatch(/^[0-9a-f]{64}$/)
    }
  })

  const eksempler = PILOTSETT.regler.flatMap((r) => r.eksempler.map((e) => [r.id, e.id, r, e] as const))
  it.each(eksempler)('%s: eksempel %s gir det som er regnet ut for hånd', (_r, _e, r, e) => {
    const res = beregn(r, e.inndata, PILOTSETT)
    if (e.stopp) {
      expect(res.status).toBe('stoppet')
      expect(stoppgrunner(res).some((g) => e.stopp!.test(g)), JSON.stringify(stoppgrunner(res))).toBe(true)
    } else {
      expect(res.status).toBe('modellberegning')
      expect(kortform(res)).toEqual(e.forventet)
    }
  })
})

describe('Beregningen', () => {
  it('er deterministisk og bærer regel-, regelsett-, modell- og motorversjon', () => {
    const r = regel('kryssnedtrapping-sertralin-mirtazapin')
    const a = beregn(r, { startdose_mg: 100, maldose_mg: 30 }, PILOTSETT)
    expect(beregn(r, { startdose_mg: 100, maldose_mg: 30 }, PILOTSETT)).toEqual(a)
    expect(a).toMatchObject({
      status: 'modellberegning',
      klinisk_godkjent: false,
      forbehold: FORBEHOLD_IKKE_GODKJENT,
      regel: { id: r.id, versjon: 1, godkjenning: 'til_faglig_kontroll' },
      regelsett: { id: PILOTSETT.id, versjon: PILOTSETT.versjon },
      modell: REGELMODELLVERSJON,
      motor: MOTORVERSJON,
    })
  })

  it('er bare klinisk godkjent når godkjenningen gjelder nøyaktig denne regelversjonen', () => {
    const r = godkjenn(regel('depot-paliperidon-xeplion'))
    expect(godkjenningsfeil(r)).toEqual([])
    expect(beregn(r, XEPLION)).toMatchObject({ klinisk_godkjent: true, forbehold: FORBEHOLD_GODKJENT, merknader: [] })
    expect(beregn(r, { ...XEPLION, startdose_mg: 15 }).klinisk_godkjent).toBe(false)
  })

  it('mister godkjenningen når en godkjent regel endres faglig, uten at versjonen økes (regresjon)', () => {
    const r = godkjenn(regel('depot-paliperidon-xeplion'))
    const fase = r.plan.forlop[1]!.faser[0]!
    if (fase.type !== 'injeksjoner') throw new Error()
    fase.vedlikehold.vindu_dager = { ...fase.vedlikehold.vindu_dager!, verdi: 14 }
    const res = beregn(r, XEPLION)
    expect(res).toMatchObject({ status: 'modellberegning', klinisk_godkjent: false, forbehold: FORBEHOLD_IKKE_GODKJENT })
    expect(res.merknader.join()).toMatch(/endret etter godkjenningen.*behandlet som ikke godkjent/)
    // Også en endring bare i fortolkningen, et eksempel eller en kildes versjon gir nytt fingeravtrykk.
    const a = regel('depot-paliperidon-xeplion')
    const f0 = fingeravtrykk(a)
    a.fortolkning.usikkerhet.push('Ny merknad.')
    expect(fingeravtrykk(a)).not.toBe(f0)
    const b = regel('depot-paliperidon-xeplion')
    b.eksempler[0]!.stopp = /x/
    expect(fingeravtrykk(b)).not.toBe(f0)
    const kilde = KILDER.find((k) => k.id === 'ema-xeplion')!
    const versjon = kilde.versjon
    try {
      kilde.versjon = 'ny revisjon'
      expect(fingeravtrykk(regel('depot-paliperidon-xeplion'))).not.toBe(f0)
    } finally {
      kilde.versjon = versjon
    }
    // Godkjenningen selv inngår ikke, og rekkefølgen på feltene betyr ingenting.
    expect(fingeravtrykk(godkjenn(regel('depot-paliperidon-xeplion')))).toBe(f0)
    expect(kanonisk({ b: 1, a: [2, { d: undefined, c: /x/g }] })).toBe(kanonisk({ a: [2, { c: /x/g }], b: 1 }))
  })

  it('mister godkjenningen når versjonen økes, og godtar ikke godkjenning fra utvikler eller av en regel med åpne valg', () => {
    const v = godkjenn(regel('depot-paliperidon-xeplion'))
    v.versjon = 3
    expect(godkjenningsfeil(v).join()).toMatch(/gjelder regelversjon 2, ikke versjon 3/)
    expect(beregn(v, XEPLION).klinisk_godkjent).toBe(false)
    const u = godkjenn(regel('depot-paliperidon-xeplion'), 'Claude Code')
    expect(godkjenningsfeil(u).join()).toMatch(/ikke en klinisk godkjenning fra en uavhengig kontrollør/)
    const a = godkjenn(regel('seponering-escitalopram'))
    expect(godkjenningsfeil(a).join()).toMatch(/åpne valg som må avklares faglig: .*trinnlengde \(åpent forslag\)/)
    expect(beregn(a, { startdose_mg: 20 }).klinisk_godkjent).toBe(false)
    const uten = godkjenn(regel('depot-paliperidon-xeplion'))
    delete uten.godkjenning.historikk.at(-1)!.fingeravtrykk
    expect(beregn(uten, XEPLION).klinisk_godkjent).toBe(false)
  })

  it('kan godkjenne OUSFARs egne valg etter eksplisitt uavhengig avklaring, uten å endre opprinnelsen (regresjon)', () => {
    const r = regel('seponering-escitalopram')
    const for0 = alleGrunnlag(r)
    // Først blokkerer de åpne forslagene godkjenningen.
    expect(apneValg(r).length).toBeGreaterThan(0)
    expect(godkjenningsfeil(godkjenn(structuredClone(r))).join()).toMatch(/åpne valg/)
    // Etter avklaring av en uavhengig kontrollør kan nøyaktig denne versjonen godkjennes.
    avklarAlle(r)
    expect(apneValg(r)).toEqual([])
    godkjenn(r)
    expect(godkjenningsfeil(r)).toEqual([])
    expect(kontrollerRegelsett(sett([r]), GRUNNLAG)).toEqual([])
    expect(beregn(r, { startdose_mg: 20 })).toMatchObject({ klinisk_godkjent: true, forbehold: FORBEHOLD_GODKJENT })
    // Opprinnelsen er uendret: fortsatt OUSFARs vurdering med samme begrunnelse, og regelen er fortsatt klassifisert som beregnbar etter avklaring.
    const etter = alleGrunnlag(r)
    expect(etter.map(([sti, g]) => [sti, g.type, g.type === 'ousfar_vurdering' ? g.begrunnelse : null])).toEqual(
      for0.map(([sti, g]) => [sti, g.type, g.type === 'ousfar_vurdering' ? g.begrunnelse : null]),
    )
    expect(r.beregnbarhet).toBe('beregnbar_etter_avklaring')
    // En avklaring etter godkjenningen endrer fingeravtrykket, så godkjenningen faller bort.
    const g = etter.find(([, x]) => x.type === 'ousfar_vurdering')![1]
    if (g.type !== 'ousfar_vurdering') throw new Error()
    g.avklaring = { ...g.avklaring!, merknad: 'Endret vurdering.' }
    expect(godkjenningsfeil(r).join()).toMatch(/fingeravtrykket stemmer ikke/)
  })

  it('godtar ikke en avklaring fra en utvikler av regelen', () => {
    const r = godkjenn(avklarAlle(regel('seponering-escitalopram'), 'Claude Code'))
    expect(godkjenningsfeil(r).join()).toMatch(/avklart av en utvikler av regelen, ikke uavhengig/)
    expect(kontrollerRegelsett(sett([r]), GRUNNLAG).join()).toMatch(/er avklart av en utvikler av regelen; avklaringen må være uavhengig/)
    expect(beregn(r, { startdose_mg: 20 }).klinisk_godkjent).toBe(false)
    // Rest AP: et medlem som bare er foreslått, er også et åpent valg.
    const g = regel('gruppe-rest-ap-aripiprazol')
    expect(apneValg(g)).toContain('zuklopentiksol (medlem foreslått, ikke validert)')
  })

  it('regner SHA-256 likt med Node', () => {
    for (const t of ['', 'abc', 'æøå – μg/l', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'y'.repeat(1000)]) {
      expect(sha256(t), t.slice(0, 10)).toBe(createHash('sha256').update(t, 'utf8').digest('hex'))
    }
  })

  it('holder utvaskingen: fenelzin tidligst etter 35 hele dager uten fluoksetin', () => {
    const r = regel('mao-fluoksetin-fenelzin')
    for (const startdose_mg of [20, 30, 40, 60]) {
      const res = beregn(r, { startdose_mg, bekreftet: ['spesialisthelsetjeneste'] })
      if (res.status !== 'modellberegning') throw new Error('stoppet')
      const [fra, til] = res.forlop
      expect(til!.start - fra!.siste_dosedag! - 1).toBe(35)
      expect(til!.perioder).toEqual([])
      expect(res.kontroller.find((k) => k.krav.startsWith('Minst 35 dager'))?.oppfylt).toBe(true)
    }
  })

  it('stopper når et bindende minimum for nedtrappingen ikke nås, og gir bare en merknad når det er veiledende', () => {
    const r = regel('seponering-escitalopram')
    r.inndata = [{ ...r.inndata[0]!, omrade: [1, 20] }]
    // 3 mg → 2,25 mg er under sluttdosen 2,5 mg: seponering med én gang, 0 dager.
    expect(stoppgrunner(beregn(r, { startdose_mg: 3 })).join()).toMatch(/blir 0 dager, kortere enn 14 dager/)
    // 3,4 mg → 2,55 mg i 14 dager: akkurat nok.
    expect(kortform(beregn(r, { startdose_mg: 3.4 }))).toEqual({ fra: ['dag 1–14: 2,55 mg', 'fra dag 15: seponert'] })
    const fase = r.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'nedtrapping') throw new Error()
    fase.minste_varighet = { ...fase.minste_varighet!, verdi: 28 }
    expect(beregn(r, { startdose_mg: 5 }).status).toBe('modellberegning')
    expect(stoppgrunner(beregn(r, { startdose_mg: 3.4 })).join()).toMatch(/blir 14 dager, kortere enn 28/)
    fase.minste_varighet = { ...fase.minste_varighet, art: 'veiledende_preferanse' }
    const res = beregn(r, { startdose_mg: 3.4 })
    expect(res.status).toBe('modellberegning')
    expect(res.merknader.join()).toMatch(/ikke oppfylt/)
  })

  it('stopper ved grensene for inndata, og gir merknad ved en veiledende grense', () => {
    const r = regel('seponering-escitalopram')
    expect(beregn(r, { startdose_mg: 20 }).status).toBe('modellberegning')
    expect(beregn(r, { startdose_mg: 5 }).status).toBe('modellberegning')
    expect(stoppgrunner(beregn(r, { startdose_mg: 20.01 })).join()).toMatch(/utenfor/)
    expect(stoppgrunner(beregn(r, { startdose_mg: 4.99 })).join()).toMatch(/utenfor/)
    expect(stoppgrunner(beregn(r, { startdose_mg: 0 })).join()).toMatch(/Startdosen må være et positivt tall/)
    const g = regel('gruppe-rest-ap-aripiprazol')
    const res = beregn(g, { startdose_mg: 10, maldose_mg: 15, medlem: 'zuklopentiksol', bekreftet: AP })
    expect(res.status).toBe('modellberegning')
    expect(res.merknader.join()).toMatch(/Startdosen 10 mg er utenfor .*veiledende grense/)
    expect(stoppgrunner(beregn(g, { startdose_mg: 20, maldose_mg: 35, medlem: 'zuklopentiksol', bekreftet: AP })).join()).toMatch(/Måldosen 35 mg er utenfor/)
  })

  it('stopper for unntak, ukjente pasientforhold og manglende bekreftelser, og sier alle grunnene', () => {
    const r = regel('depot-aripiprazol-maintena')
    const res = beregn(r, { startdose_mg: 25, pasientforhold: { sterk_cyp_hemmer: true, cyp3a4_induktor: false, graviditet: true } })
    expect(stoppgrunner(res)).toEqual([
      'Må avklares før beregning (ukjent): Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser.',
      'Regelen gjelder ikke: Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.',
      'Pasientforholdet «graviditet» er ukjent for regelen; det må vurderes individuelt.',
      'Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol.',
      'Startdosen 25 mg er utenfor det regelen gjelder for (10–20 mg).',
    ])
    expect(res.klinisk_godkjent).toBe(false)
  })

  it('skiller ukjent fra avkreftet: bare et eksplisitt nei på hvert unntak slipper gjennom', () => {
    const r = regel('depot-aripiprazol-maintena')
    const alle = MAINTENA.pasientforhold
    const ok = beregn(r, MAINTENA)
    expect(ok.status).toBe('modellberegning')
    if (ok.status !== 'modellberegning') throw new Error()
    expect(ok.kontroller.filter((k) => k.krav.startsWith('Avkreftet:'))).toHaveLength(3)
    for (const id of Object.keys(alle)) {
      const { [id as keyof typeof alle]: _, ...uten } = alle
      expect(stoppgrunner(beregn(r, { ...MAINTENA, pasientforhold: uten })).join(), `${id} ukjent`).toMatch(/Må avklares før beregning \(ukjent\)/)
      expect(stoppgrunner(beregn(r, { ...MAINTENA, pasientforhold: { ...alle, [id]: true } })).join(), `${id} ja`).toMatch(/Regelen gjelder ikke/)
    }
    expect(stoppgrunner(beregn(r, { ...MAINTENA, pasientforhold: undefined })).filter((g) => g.includes('(ukjent)'))).toHaveLength(3)
    // Et nei på et forhold regelen ikke kjenner, endrer ingenting.
    expect(beregn(r, { ...MAINTENA, pasientforhold: { ...alle, graviditet: false } }).status).toBe('modellberegning')
    // Den gamle formen (en liste med forhold som gjelder) godtas ikke.
    expect(stoppgrunner(beregn(r, { ...MAINTENA, pasientforhold: ['cyp2d6_langsom'] as never })).join()).toMatch(/ja eller nei/)
    expect(stoppgrunner(beregn(r, { ...MAINTENA, pasientforhold: { ...alle, cyp2d6_langsom: 'nei' } as never })).join()).toMatch(/ja eller nei/)
  })

  it('krever klinikerens dosevalg når omregningstabellen gir et spenn, og godtar det bare innenfor spennet', () => {
    const r = regel('depot-paliperidon-xeplion')
    const ved3 = (maldose_mg?: number) => beregn(r, { ...XEPLION, startdose_mg: 3, ...(maldose_mg === undefined ? {} : { maldose_mg }) })
    expect(stoppgrunner(ved3()).join()).toMatch(/spenn på 25–50 mg.*beregningen velger ikke selv/)
    for (const x of [25, 37.5, 50]) {
      const res = ved3(x)
      if (res.status !== 'modellberegning') throw new Error(`${x}: ${stoppgrunner(res).join()}`)
      expect(res.forlop[1]!.injeksjoner.at(-1)!.mg).toBe(x)
    }
    for (const x of [24.99, 50.01]) expect(stoppgrunner(ved3(x)).join(), String(x)).toMatch(/utenfor spennet 25–50 mg/)
    expect(stoppgrunner(ved3(-5)).join()).toMatch(/Måldosen må være et positivt tall/)
    // Ved en entydig rad kan måldosen utelates, men må være lik tabellens når den oppgis.
    expect(beregn(r, { ...XEPLION, maldose_mg: 75 }).status).toBe('modellberegning')
    expect(stoppgrunner(beregn(r, { ...XEPLION, maldose_mg: 50 })).join()).toMatch(/stemmer ikke med omregningstabellen, som gir 75 mg/)
  })

  it('stopper når et forløp starter på en ugyldig dag, og når en dose har en varighetsenhet', () => {
    for (const dag of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = regel('kryssnedtrapping-sertralin-mirtazapin')
      r.plan.forlop[1]!.start = { type: 'dag', dag }
      expect(stoppgrunner(beregn(r, { startdose_mg: 100, maldose_mg: 30 })).join(), String(dag)).toMatch(/forløp til starter dag .*startdagen må være et helt tall fra 1/)
    }
    const r = regel('kryssnedtrapping-sertralin-mirtazapin')
    const hold = r.plan.forlop[1]!.faser[0]!
    if (hold.type !== 'hold' || hold.dose.type !== 'fast') throw new Error()
    hold.dose.mg = { ...hold.dose.mg, enhet: 'dager' }
    expect(stoppgrunner(beregn(r, { startdose_mg: 100, maldose_mg: 30 })).join()).toMatch(/dose\.mg er ugyldig: enheten er dager, men mg skal være i mg/)
  })

  it('stopper på ugyldige datoer og inndata i stedet for å normalisere dem eller kaste', () => {
    const r = regel('antipsykotikabytte-olanzapin-kvetiapin')
    const inn = { startdose_mg: 20, maldose_mg: 300, bekreftet: AP }
    for (const startdato of ['2027-02-31', '2027-02-29', '2027-13-01', 'i morgen', '']) {
      expect(stoppgrunner(beregn(r, { ...inn, startdato })).join(), startdato).toMatch(/ikke en gyldig dato/)
    }
    expect(beregn(r, { ...inn, startdato: '2028-02-29' }).status).toBe('modellberegning')
    expect(stoppgrunner(beregn(r, { ...inn, startdose_mg: Number.NaN })).join()).toMatch(/Startdosen må være et positivt tall/)
    expect(stoppgrunner(beregn(r, { ...inn, maldose_mg: Number.POSITIVE_INFINITY })).join()).toMatch(/Måldosen må være et positivt tall/)
    expect(stoppgrunner(beregn(r, { ...inn, bekreftet: 'indikasjon' as never })).join()).toMatch(/liste med id-er/)
  })

  it('stopper på ugyldige regelparametre, og kaster aldri selv når regelen er feil', () => {
    const med = (strategi: Nedtrappingsstrategi, trinnlengde = 14) => {
      const r = regel('seponering-escitalopram')
      const fase = r.plan.forlop[0]!.faser[0]!
      if (fase.type !== 'nedtrapping') throw new Error()
      fase.strategi = strategi
      fase.trinnlengde = p(trinnlengde, 'dager')
      delete fase.minste_varighet
      return beregn(r, { startdose_mg: 20 })
    }
    expect(stoppgrunner(med({ type: 'absolutt', mg: p(0) })).join()).toMatch(/strategi\.mg er ugyldig: 0 mg må være over 0/)
    expect(stoppgrunner(med({ type: 'prosent_av_startdose', prosent: p(0, 'prosent') })).join()).toMatch(/er ugyldig: 0 prosent må være over 0/)
    expect(stoppgrunner(med({ type: 'prosent_av_startdose', prosent: p(100.01, 'prosent') })).join()).toMatch(/kan ikke være over 100 %/)
    expect(stoppgrunner(med({ type: 'hyperbolsk', ed50_mg: p(3.4), trinn: p(2.5, 'trinn') })).join()).toMatch(/må være et helt tall/)
    expect(stoppgrunner(med({ type: 'absolutt', mg: p(Number.NaN) })).join()).toMatch(/ikke et endelig tall/)
    expect(stoppgrunner(med({ type: 'absolutt', mg: p(5) }, 0)).join()).toMatch(/trinnlengde er ugyldig/)
    expect(med({ type: 'prosent_av_startdose', prosent: p(100, 'prosent') }).status).toBe('modellberegning')
    // Enheten må være den feltet krever, ikke bare en gyldig enhet.
    const r = regel('seponering-escitalopram')
    const fase = r.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'nedtrapping') throw new Error()
    fase.trinnlengde = { ...fase.trinnlengde, enhet: 'mg' }
    expect(stoppgrunner(beregn(r, { startdose_mg: 20 })).join()).toMatch(/trinnlengde er ugyldig: enheten er mg, men trinnlengde skal være i dager/)
    // Gyldige verdier som likevel ikke når null: kontrollert stopp, ikke et unntak.
    expect(stoppgrunner(med({ type: 'absolutt', mg: p(0.01) })).join()).toMatch(/Beregningen kunne ikke fullføres: .*når ikke 0 på 200 trinn/)
  })

  it('beregner bare gruppemedlemmer som er vurdert, og bare medlemmer av gruppen', () => {
    const r = regel('gruppe-rest-ap-aripiprazol')
    const inn = { startdose_mg: 20, maldose_mg: 15, bekreftet: AP }
    expect(stoppgrunner(beregn(r, inn)).join()).toMatch(/virkestoffet pasienten bruker må oppgis/)
    expect(stoppgrunner(beregn(r, { ...inn, medlem: 'olanzapin' })).join()).toMatch(/ikke medlem av gruppen/)
    for (const m of r.medlemmer!.filter((x) => x.validering === 'ikke_vurdert')) {
      expect(beregn(r, { ...inn, medlem: m.nokkel }).status, m.nokkel).toBe('stoppet')
    }
    // Et medlems egne faser går foran gruppens.
    const z = r.medlemmer!.find((m) => m.nokkel === 'zuklopentiksol')!
    z.faser = [{ type: 'seponer' }]
    const res = beregn(r, { ...inn, medlem: 'zuklopentiksol' })
    expect(kortform(res)).toEqual({ fra: ['fra dag 1: seponert'], til: ['fra dag 1: 15 mg'] })
  })

  it('stopper når en verdi mangler, regelen bare er tekstlig, eller er avvist', () => {
    const r = regel('seponering-citalopram-hyperbolsk')
    const fase = r.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'nedtrapping' || fase.strategi.type !== 'hyperbolsk') throw new Error()
    fase.strategi.trinn = { ...fase.strategi.trinn, verdi: null }
    expect(stoppgrunner(beregn(r, { startdose_mg: 20 })).join()).toMatch(/Verdien fra\.faser\[0\]\.strategi\.trinn mangler/)
    const t = { ...regel('seponering-escitalopram'), beregnbarhet: 'bare_tekstlig' as const }
    expect(stoppgrunner(beregn(t, { startdose_mg: 20 })).join()).toMatch(/bare tekstlig/)
    const a = regel('seponering-escitalopram')
    a.godkjenning = {
      status: 'avvist',
      historikk: [...a.godkjenning.historikk, { status: 'avvist', dato: '2026-11-01', av: 'Kontrollør', rolle: 'uavhengig_kontrollor', regelversjon: 1, merknad: '' }],
    }
    expect(stoppgrunner(beregn(a, { startdose_mg: 20 })).join()).toMatch(/avvist/)
  })

  it('stopper når startdosen ikke finnes i omregningstabellen, uten å velge nærmeste', () => {
    const r = regel('depot-paliperidon-xeplion')
    r.inndata = []
    expect(stoppgrunner(beregn(r, { ...XEPLION, startdose_mg: 7.5 })).join()).toMatch(/finnes ikke i omregningstabellen/)
  })

  it('har ingen skjult standard måldose', () => {
    const r = regel('antipsykotikabytte-olanzapin-kvetiapin')
    expect(stoppgrunner(beregn(r, { startdose_mg: 20 })).join()).toMatch(/Måldosen må oppgis; regelen har ingen standard måldose/)
    r.inndata = r.inndata.filter((x) => x.navn !== 'maldose')
    expect(stoppgrunner(beregn(r, { startdose_mg: 20 })).join()).toMatch(/Måldosen må oppgis/)
  })
})

describe('Kontrollene av et regelsett', () => {
  const feil = (r: Regel) => kontrollerRegelsett(sett([r]), GRUNNLAG).join('\n')

  it('slår ut når Psychiatrienet har innhold, er grunnlag eller viser til en ukjent oppføring', () => {
    const a = regel('seponering-escitalopram')
    a.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Es>Stop', faktum: 'Trapp ned.' } as never]
    expect(feil(a)).toMatch(/Psychiatrienet-henvisning har innhold/)
    const b = regel('seponering-escitalopram')
    b.fortolkning.kildetro.push({ tekst: 'x', henvisninger: [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Es>Stop' }] })
    expect(feil(b)).toMatch(/bygger på Psychiatrienet/)
    const c = regel('seponering-escitalopram')
    c.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Es>Xx' }]
    expect(feil(c)).toMatch(/er ikke en kildeoppføring i P3/)
  })

  it('slår ut på johannesurt, ukjente virkestoffer og gruppemedlemmer som ikke er P1-gruppens', () => {
    const a = regel('seponering-escitalopram')
    a.fortolkning.usikkerhet.push('Gjelder også Hypericum.')
    expect(feil(a)).toMatch(/johannesurt/)
    const b = regel('seponering-escitalopram')
    b.fra = { type: 'virkestoff', nokkel: 'ukjentin' }
    expect(feil(b)).toMatch(/ukjentin er ikke et virkestoff/)
    const c = regel('gruppe-rest-ap-aripiprazol')
    c.medlemmer = c.medlemmer!.filter((m) => m.nokkel !== 'promazin')
    expect(feil(c)).toMatch(/er ikke de samme som i P1-gruppen rest-ap/)
  })

  it('slår ut på ukjente kilder, kildetro utsagn uten kilde og for lange gjengivelser', () => {
    const a = regel('seponering-escitalopram')
    a.fortolkning.kildetro.push({ tekst: 'Uten kilde.', henvisninger: [] })
    a.fortolkning.kildetro[0]!.henvisninger.push({ kilde: 'ukjent', sted: 'x', faktum: 'y' }, { kilde: 'nice-ng222', sted: 'x', faktum: 'z'.repeat(251) })
    expect(feil(a)).toMatch(/har ingen kilde/)
    expect(feil(a)).toMatch(/ukjent kilde ukjent/)
    expect(feil(a)).toMatch(/lengre enn 250 tegn/)
  })

  it('slår ut når en regel med forslag er merket entydig, eller er klinisk godkjent uten uavhengig kontroll', () => {
    const a = { ...regel('seponering-escitalopram'), beregnbarhet: 'entydig_beregnbar' as const }
    expect(feil(a)).toMatch(/merket entydig beregnbar, men har OUSFAR-vurderinger/)
    const b = regel('depot-paliperidon-xeplion')
    const f = fingeravtrykk(b)
    b.godkjenning = {
      status: 'klinisk_godkjent',
      historikk: [...b.godkjenning.historikk, { status: 'klinisk_godkjent', dato: '2026-11-01', av: 'Claude Code', rolle: 'utvikler', regelversjon: 2, fingeravtrykk: f, merknad: '' }],
    }
    expect(feil(b)).toMatch(/ikke en klinisk godkjenning fra en uavhengig kontrollør/)
    b.godkjenning.historikk.push({ status: 'klinisk_godkjent', dato: '2026-11-02', av: 'Claude Code', rolle: 'uavhengig_kontrollor', regelversjon: 2, fingeravtrykk: f, merknad: '' })
    expect(feil(b)).toMatch(/ikke en klinisk godkjenning fra en uavhengig kontrollør/)
    expect(feil(godkjenn(regel('depot-paliperidon-xeplion')))).toBe('')
  })

  it('slår ut når en godkjent regel er endret, eller en endret regel ikke er sendt til kontroll på nytt', () => {
    const a = godkjenn(regel('depot-paliperidon-xeplion'))
    a.unntak = []
    a.eksempler = a.eksempler.filter((e) => !/nyre/.test(e.id))
    expect(feil(a)).toMatch(/fingeravtrykket stemmer ikke/)
    const b = regel('seponering-escitalopram')
    b.versjon = 2
    expect(feil(b)).toMatch(/siste godkjenningssteg gjelder regelversjon 1, ikke versjon 2; en endret regel må sendes til kontroll på nytt/)
  })

  it('slår ut når en Psychiatrienet-referanse har feil retning, virkestoff, type eller formulering', () => {
    const a = regel('kryssnedtrapping-sertralin-mirtazapin')
    a.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Mz>Se' }]
    expect(feil(a)).toMatch(/Mz>Se passer ikke regelen: den fra-siden gjelder mirtazapin, ikke sertralin/)
    expect(feil(a)).toMatch(/til-siden gjelder sertralin, ikke mirtazapin/)
    const b = regel('depot-paliperidon-xeplion')
    b.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntipsychotics:Dp>Pp' }]
    expect(feil(b)).toMatch(/fra-siden gjelder formuleringen ER \(depotinjeksjon\), ikke peroral/)
    expect(feil(b)).toMatch(/til-siden gjelder formuleringen standard \(peroral\/peroral_modifisert\), ikke depotinjeksjon/)
    const c = regel('seponering-escitalopram')
    c.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Ci>Stop' }]
    expect(feil(c)).toMatch(/fra-siden gjelder citalopram, ikke escitalopram/)
    const d = regel('seponering-escitalopram')
    d.referanser = [{ kilde: 'psychiatrienet', kildeoppforing: 'SwitchAntidepressants:Es>Ci' }]
    expect(feil(d)).toMatch(/er en anbefaling om bytte, men regelen seponerer/)
    const e = regel('gruppe-rest-ap-aripiprazol')
    e.fra = { type: 'gruppe', gruppe: 'partiell-agonist' }
    expect(feil(e)).toMatch(/fra-siden gjelder gruppen rest-ap, ikke gruppen partiell-agonist/)
  })

  it('slår ut på ugyldige parametre, inndatagrenser og omregningsrader', () => {
    const a = regel('depot-paliperidon-xeplion')
    const fase = a.plan.forlop[1]!.faser[0]!
    if (fase.type !== 'injeksjoner' || fase.vedlikehold.dose.type !== 'tabell') throw new Error()
    fase.vedlikehold.dose.rader[0] = { fra_mg: 3, til_mg: [50, 25] }
    fase.vedlikehold.maaneder = { ...fase.vedlikehold.maaneder, verdi: 0.5 }
    a.inndata[0] = { ...a.inndata[0]!, verdier: [0, 6] }
    expect(feil(a)).toMatch(/omregningsraden 3 mg er ugyldig/)
    expect(feil(a)).toMatch(/maaneder er ugyldig: 0.5 maaneder må være et helt tall/)
    expect(feil(a)).toMatch(/inndatakravet for startdose har ugyldige grenser/)
  })

  it('slår ut når en parameter har feil enhet for feltet, eller et forløp starter på en ugyldig dag', () => {
    const a = regel('seponering-escitalopram')
    const fase = a.plan.forlop[0]!.faser[0]!
    if (fase.type !== 'nedtrapping' || fase.strategi.type !== 'prosent_av_aktuell') throw new Error()
    fase.trinnlengde = { ...fase.trinnlengde, enhet: 'mg' }
    fase.strategi.prosent = { ...fase.strategi.prosent, enhet: 'mg' }
    fase.strategi.sluttdose_mg = { ...fase.strategi.sluttdose_mg, enhet: 'prosent' }
    expect(feil(a)).toMatch(/trinnlengde er ugyldig: enheten er mg, men trinnlengde skal være i dager/)
    expect(feil(a)).toMatch(/strategi\.prosent er ugyldig: enheten er mg, men prosent skal være i prosent/)
    expect(feil(a)).toMatch(/sluttdose_mg er ugyldig: enheten er prosent, men sluttdose_mg skal være i mg/)
    for (const dag of [0, 1.5, Number.NaN]) {
      const b = regel('kryssnedtrapping-sertralin-mirtazapin')
      b.plan.forlop[1]!.start = { type: 'dag', dag }
      expect(feil(b), String(dag)).toMatch(/forløp til starter dag .*startdagen må være et helt tall fra 1/)
    }
  })

  it('slår ut når beregnbarheten ikke stemmer med opprinnelsen, og på avklaringer uten innhold', () => {
    // Avklarte OUSFAR-vurderinger gjør ikke regelen entydig: den bygger fortsatt på OUSFARs valg.
    const a = { ...avklarAlle(regel('seponering-escitalopram')), beregnbarhet: 'entydig_beregnbar' as const }
    expect(feil(a)).toMatch(/merket entydig beregnbar, men har OUSFAR-vurderinger/)
    const b = { ...regel('depot-paliperidon-xeplion'), beregnbarhet: 'beregnbar_etter_avklaring' as const }
    expect(feil(b)).toMatch(/merket beregnbar etter avklaring, men har ingen OUSFAR-vurderinger/)
    const c = avklarAlle(regel('seponering-escitalopram'))
    const g = alleGrunnlag(c).find(([, x]) => x.type === 'ousfar_vurdering')![1]
    if (g.type !== 'ousfar_vurdering') throw new Error()
    g.avklaring = { ...g.avklaring!, merknad: ' ', regelversjon: 5 }
    expect(feil(c)).toMatch(/mangler dato, navn eller merknad/)
    expect(feil(c)).toMatch(/gjelder en ukjent regelversjon \(5\)/)
  })

  it('slår ut når et regneeksempel ikke stemmer med beregningen', () => {
    const a = regel('seponering-escitalopram')
    a.eksempler[0]!.forventet = { fra: ['dag 1–14: 10 mg', 'fra dag 15: seponert'] }
    a.eksempler[2]!.stopp = /noe annet/
    expect(feil(a)).toMatch(/eksempel fra-20-mg gir/)
    expect(feil(a)).toMatch(/eksempel over-maksimum stopper ikke som forventet/)
  })

  it('slår ut på to regler med samme id', () => {
    const r = regel('seponering-escitalopram')
    expect(kontrollerRegelsett(sett([r, r]), GRUNNLAG).join()).toMatch(/finnes flere ganger/)
  })
})

describe('Reglene', () => {
  it('brukes ikke av appen: bare verktøymodulene og testene bruker regelmodellen', () => {
    const filer: string[] = []
    const gaa = (mappe: string) => {
      for (const n of readdirSync(mappe)) {
        const sti = join(mappe, n)
        if (statSync(sti).isDirectory()) gaa(sti)
        else if (/\.(ts|tsx)$/.test(n)) filer.push(sti)
      }
    }
    const rot = new URL('../', import.meta.url).pathname
    gaa(rot)
    const brukere = filer
      .filter((f) => /verktoy\/regler\//.test(readFileSync(f, 'utf8')))
      .map((f) => f.slice(rot.length))
      .filter((f) => !f.startsWith('verktoy/regler/') && !f.startsWith('__tests__/'))
    expect(brukere).toEqual([])
  })

  it('rapporten sier hvor mange regler som faktisk er gyldig klinisk godkjent', () => {
    expect(lagRegelrapport()).toMatch(/\*\*8 regler, 0 klinisk godkjent\.\*\*.*ingen av reglene er klinisk godkjent/)
    const en = lagRegelrapport(sett([godkjenn(regel('depot-paliperidon-xeplion')), regel('seponering-escitalopram')]))
    expect(en).toMatch(/\*\*2 regler, 1 klinisk godkjent\.\*\*.*1 av reglene er klinisk godkjent/)
    expect(en).not.toMatch(/ingen av reglene/)
    expect(lagRegelrapport(sett([godkjenn(regel('depot-paliperidon-xeplion'))]))).toMatch(/Alle reglene er klinisk godkjent/)
    const endret = godkjenn(regel('depot-paliperidon-xeplion'))
    endret.unntak = []
    const ugyldig = lagRegelrapport(sett([endret]))
    expect(ugyldig).toMatch(/\*\*1 regler, 0 klinisk godkjent\.\*\*/)
    expect(ugyldig).toMatch(/merket klinisk godkjent, men ugyldig \(Regelen er endret etter godkjenningen/)
  })

  it('rapporten er oppdatert', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:regler -- rapport`.'
    expect(readFileSync(new URL(`../../${REGELRAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagRegelrapport())
  })
})
