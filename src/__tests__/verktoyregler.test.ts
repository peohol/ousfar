/**
 * Regelmodellen og pilotsettet for OUSFAR Verktøy (P4 i
 * `docs/verktøy-utviklingsplan.md`): hver nedtrappingsstrategi ved
 * grenseverdiene, utvasking, depot og datoer, at beregningen stopper i
 * stedet for å gjette, at den er deterministisk og bærer versjonene, at
 * pilotreglenes regneeksempler (regnet ut for hånd) stemmer, at ingen regel
 * er klinisk godkjent eller bygger på Psychiatrienet, at kontrollene slår ut
 * på feil, at bare verktøymodulene bruker reglene, og at rapporten er
 * oppdatert.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  avrund,
  beregn,
  datoFor,
  FORBEHOLD_GODKJENT,
  FORBEHOLD_IKKE_GODKJENT,
  kortform,
  leggTilMaaneder,
  MOTORVERSJON,
  trinnserie,
  type Beregningsresultat,
} from '../verktoy/regler/beregning'
import { KILDER } from '../verktoy/regler/kilder'
import { kontrollerRegelsett, lesKontrollgrunnlag } from '../verktoy/regler/kontroll'
import { henvisninger, REGELMODELLVERSJON, type Nedtrappingsstrategi, type Parameter, type Regel, type Regelsett } from '../verktoy/regler/modell'
import { PILOTSETT } from '../verktoy/regler/pilotsett'
import { lagRegelrapport, REGELRAPPORTFIL } from '../verktoy/regler/rapport'

const GRUNNLAG = lesKontrollgrunnlag()
const regel = (id: string) => structuredClone(PILOTSETT.regler.find((r) => r.id === id)!)
const p = (verdi: number | null, enhet: Parameter['enhet'] = 'mg'): Parameter => ({
  verdi,
  enhet,
  art: 'veiledende_preferanse',
  grunnlag: { type: 'ousfar_forslag', begrunnelse: 'test' },
})
const serie = (s: Nedtrappingsstrategi, d0: number) => trinnserie(s, d0).map(avrund)
const stoppgrunner = (r: Beregningsresultat) => (r.status === 'stoppet' ? r.stoppgrunner : [])
const sett = (regler: Regel[]): Regelsett => ({ ...PILOTSETT, regler })

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

  it('har ingen klinisk godkjent regel; alle er til faglig kontroll, med historikk', () => {
    for (const r of PILOTSETT.regler) {
      expect(r.godkjenning.status, r.id).toBe('til_faglig_kontroll')
      expect(r.godkjenning.historikk.map((s) => s.status)).toEqual(['utkast', 'til_faglig_kontroll'])
      expect(r.godkjenning.historikk.every((s) => s.rolle === 'utvikler')).toBe(true)
    }
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

  it('er bare klinisk godkjent når regelversjonen er det', () => {
    const r = regel('depot-paliperidon-xeplion')
    r.godkjenning = {
      status: 'klinisk_godkjent',
      historikk: [...r.godkjenning.historikk, { status: 'klinisk_godkjent', dato: '2026-11-01', av: 'Kontrollør', rolle: 'uavhengig_kontrollor', merknad: 'test' }],
    }
    const res = beregn(r, { startdose_mg: 6, bekreftet: ['stabil_peroralt'] })
    expect(res).toMatchObject({ klinisk_godkjent: true, forbehold: FORBEHOLD_GODKJENT })
    expect(beregn(r, { startdose_mg: 15, bekreftet: ['stabil_peroralt'] }).klinisk_godkjent).toBe(false)
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
    expect(stoppgrunner(beregn(r, { startdose_mg: 0 })).join()).toMatch(/Startdosen må oppgis/)
    const g = regel('gruppe-rest-ap-aripiprazol')
    const res = beregn(g, { startdose_mg: 10, maldose_mg: 15, medlem: 'zuklopentiksol' })
    expect(res.status).toBe('modellberegning')
    expect(res.merknader.join()).toMatch(/Startdosen 10 mg er utenfor .*veiledende grense/)
    expect(stoppgrunner(beregn(g, { startdose_mg: 20, maldose_mg: 35, medlem: 'zuklopentiksol' })).join()).toMatch(/Måldosen 35 mg er utenfor/)
  })

  it('stopper for unntak, ukjente pasientforhold og manglende bekreftelser, og sier alle grunnene', () => {
    const r = regel('depot-aripiprazol-maintena')
    const res = beregn(r, { startdose_mg: 25, pasientforhold: ['sterk_cyp_hemmer', 'graviditet'] })
    expect(stoppgrunner(res)).toEqual([
      'Regelen gjelder ikke: Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.',
      'Pasientforholdet «graviditet» er ukjent for regelen; det må vurderes individuelt.',
      'Må bekreftes før beregning: Pasienten har tålt peroral aripiprazol.',
      'Startdosen 25 mg er utenfor det regelen gjelder for (10–20 mg).',
    ])
    expect(res.klinisk_godkjent).toBe(false)
  })

  it('beregner bare gruppemedlemmer som er vurdert, og bare medlemmer av gruppen', () => {
    const r = regel('gruppe-rest-ap-aripiprazol')
    expect(stoppgrunner(beregn(r, { startdose_mg: 20, maldose_mg: 15 })).join()).toMatch(/virkestoffet pasienten bruker må oppgis/)
    expect(stoppgrunner(beregn(r, { startdose_mg: 20, maldose_mg: 15, medlem: 'olanzapin' })).join()).toMatch(/ikke medlem av gruppen/)
    for (const m of r.medlemmer!.filter((x) => x.validering === 'ikke_vurdert')) {
      expect(beregn(r, { startdose_mg: 20, maldose_mg: 15, medlem: m.nokkel }).status, m.nokkel).toBe('stoppet')
    }
    // Et medlems egne faser går foran gruppens.
    const z = r.medlemmer!.find((m) => m.nokkel === 'zuklopentiksol')!
    z.faser = [{ type: 'seponer' }]
    const res = beregn(r, { startdose_mg: 20, maldose_mg: 15, medlem: 'zuklopentiksol' })
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
    a.godkjenning = { status: 'avvist', historikk: [...a.godkjenning.historikk, { status: 'avvist', dato: '2026-11-01', av: 'Kontrollør', rolle: 'uavhengig_kontrollor', merknad: '' }] }
    expect(stoppgrunner(beregn(a, { startdose_mg: 20 })).join()).toMatch(/avvist/)
  })

  it('stopper når startdosen ikke finnes i omregningstabellen, uten å velge nærmeste', () => {
    const r = regel('depot-paliperidon-xeplion')
    r.inndata = []
    expect(stoppgrunner(beregn(r, { startdose_mg: 7.5, bekreftet: ['stabil_peroralt'] })).join()).toMatch(/finnes ikke i omregningstabellen/)
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
    expect(feil(a)).toMatch(/merket entydig beregnbar, men har forslag/)
    const b = regel('depot-paliperidon-xeplion')
    b.godkjenning = { status: 'klinisk_godkjent', historikk: [...b.godkjenning.historikk, { status: 'klinisk_godkjent', dato: '2026-11-01', av: 'Claude Code', rolle: 'utvikler', merknad: '' }] }
    expect(feil(b)).toMatch(/uten et godkjenningssteg fra en uavhengig kontrollør/)
    b.godkjenning.historikk.push({ status: 'klinisk_godkjent', dato: '2026-11-02', av: 'Claude Code', rolle: 'uavhengig_kontrollor', merknad: '' })
    expect(feil(b)).toMatch(/uten et godkjenningssteg fra en uavhengig kontrollør/)
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

  it('rapporten er oppdatert', () => {
    const ny = 'Lag den på nytt med `npm run verktoy:regler -- rapport`.'
    expect(readFileSync(new URL(`../../${REGELRAPPORTFIL}`, import.meta.url), 'utf8'), ny).toBe(lagRegelrapport())
  })
})
