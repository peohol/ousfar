/**
 * Motoren for benzoylekgonin i urin (#562, docs/benzoylekgonin-urin.md), med
 * de bestilte kurvene og syntetiske CV-er. Fasitene er uavhengige av
 * binærsøket: profiler med én rate (terskel e^(−k·d)) og kvotienter laget
 * med et kjent tidspunkt på kurven.
 */
import { describe, expect, it } from 'vitest'
import { lesBeUrinModellsvar, tilBeUrinModell, validerBeUrinModell, type BeUrinModell } from '../beUrinModell'
import {
  BE_URIN_KONKLUSJONER,
  erGyldigDato,
  fortolkBeUrin,
  konklusjonFor,
  korrigertRatio,
  kvotient,
  logSd,
  marginpunkter,
  mildereVedHoyereMargin,
  profilterskel,
  tomBeUrinInndata,
  visningsmarginer,
  type BeUrinInndata,
  type BeUrinProve,
  type BeUrinResultat,
} from '../beUrinMotor'
import { byggBeUrinGraf, prosentFor, terskelroller } from '../beUrinPlot'
import { verdiPaaKurve } from '../thcKurver'
import { BESTILTE_KURVER, SYNTETISK_MODELL, enkelModell, godkjent } from './hjelp/beUrinTestmodell'

const MODELL = godkjent()

/** Nærmeste flyttall over eller under `x`. */
function nabo(x: number, retning: 1 | -1): number {
  const buffer = new DataView(new ArrayBuffer(8))
  buffer.setFloat64(0, x)
  const bits = buffer.getBigUint64(0)
  buffer.setBigUint64(0, x > 0 === (retning === 1) ? bits + 1n : bits - 1n)
  return buffer.getFloat64(0)
}

const prove = (benzoylekgonin: number | string, dato: string, kreatinin: number | string = 1): BeUrinProve => ({
  benzoylekgonin: String(benzoylekgonin),
  kreatinin: String(kreatinin),
  dato,
})

function inndata(
  forrige: BeUrinProve,
  denne: BeUrinProve,
  margin = 0.5,
  tillegg: Partial<BeUrinInndata> = {},
): BeUrinInndata {
  return { ...tomBeUrinInndata(MODELL), forrige, denne, sikkerhetsmargin: margin, ...tillegg }
}

function vurdering(r: BeUrinResultat) {
  if (r.type !== 'vurdering') throw new Error(`Ventet en vurdering, fikk: ${r.mangler.join(' ')}`)
  return r
}

function mangler(r: BeUrinResultat): string[] {
  if (r.type !== 'mangler') throw new Error('Ventet mangler')
  return r.mangler
}

describe('tersklene', () => {
  it('er e^(−k·d) for profiler med én rate, uansett Q', () => {
    const m = enkelModell(0.1, 0.3)
    for (const q of [0.5, 10, 100, 1000]) {
      for (const d of [1, 3, 7, 30]) {
        const [a, b] = m.kurver.map((k) => profilterskel(k, q, d)!)
        expect(a!.terskel).toBeCloseTo(Math.exp(-0.1 * d), 12)
        expect(b!.terskel).toBeCloseTo(Math.exp(-0.3 * d), 12)
      }
    }
  })

  it('er C(t₀ + d)/C(t₀) for de bestilte kurvene når Q ligger ved et kjent t₀', () => {
    for (const kurve of BESTILTE_KURVER) {
      for (const t0 of [0, 0.5, 2, 10, 40, 120]) {
        const q = verdiPaaKurve(t0, kurve)
        for (const d of [1, 2, 5, 14, 60]) {
          const p = profilterskel(kurve, q, d)!
          expect(p.tidspunkt).toBeCloseTo(t0, 8)
          expect(p.terskel / (verdiPaaKurve(t0 + d, kurve) / q)).toBeCloseTo(1, 10)
          expect(p.ekstrapolert).toBe(false)
        }
      }
    }
  })

  it('gir nøyaktig 1 samme dag', () => {
    for (const kurve of BESTILTE_KURVER) for (const q of [0.3, 5, 80, 500]) expect(profilterskel(kurve, q, 0)!.terskel).toBe(1)
  })

  it('merker matematisk ekstrapolasjon når Q ligger over startverdien', () => {
    const [c1, c2] = BESTILTE_KURVER
    expect(verdiPaaKurve(0, c1)).toBeCloseTo(111.069169, 6)
    expect(verdiPaaKurve(0, c2)).toBeCloseTo(120.341742, 6)
    expect(profilterskel(c1, 115, 3)!.ekstrapolert).toBe(true)
    expect(profilterskel(c2, 115, 3)!.ekstrapolert).toBe(false)
    expect(profilterskel(c1, 200, 3)!.tidspunkt).toBeLessThan(0)
    const r = vurdering(fortolkBeUrin(inndata(prove(200, '2026-01-01'), prove(100, '2026-01-03')), MODELL))
    expect(r.sammenligning.profiler.map((p) => p.ekstrapolert)).toEqual([true, true])
  })

  it('ligger i ulik rekkefølge for ulike Q: ingen profil er alltid strengest', () => {
    const roller = (q: number, dato: string) => {
      const r = vurdering(fortolkBeUrin(inndata(prove(q, '2026-01-01'), prove(q / 2, dato)), MODELL))
      return terskelroller(r.sammenligning)
    }
    // Ved Q 50 faller profil 2 raskest, ved Q 3 over ett døgn profil 1.
    expect(roller(50, '2026-01-04')).toEqual(['ovre', 'nedre'])
    expect(roller(3, '2026-01-02')).toEqual(['nedre', 'ovre'])
  })
})

describe('konklusjonen', () => {
  // Profil A: e^(−0,1·d), profil B: e^(−0,3·d). Uten margin er den korrigerte ratioen den målte.
  const m = enkelModell(0.1, 0.3)
  const fortolk = (q1: number, q2: number, dager = 1, margin = 0.5) =>
    fortolkBeUrin(inndata(prove(q1, '2026-01-01'), prove(q2, dato(dager)), margin), m)
  const dato = (dager: number) => new Date(Date.UTC(2026, 0, 1 + dager)).toISOString().slice(0, 10)

  it('gir alle tre utfallene etter antall profiler ratioen ligger over', () => {
    expect(vurdering(fortolk(10, 5)).sammenligning.konklusjon).toBe('ikke_nodvendigvis')
    expect(vurdering(fortolk(10, 8)).sammenligning.konklusjon).toBe('kan_ikke_fastslaas')
    expect(vurdering(fortolk(10, 9.5)).sammenligning.konklusjon).toBe('nytt_inntak')
    expect(vurdering(fortolk(10, 12)).sammenligning.konklusjon).toBe('nytt_inntak')
  })

  it('teller bare en ratio strengt over terskelen, med full presisjon', () => {
    for (const d of [1, 4, 9]) {
      const [a, b] = m.kurver.map((k) => profilterskel(k, 1, d)!.terskel)
      for (const [terskel, under, over] of [
        [b!, 'ikke_nodvendigvis', 'kan_ikke_fastslaas'],
        [a!, 'kan_ikke_fastslaas', 'nytt_inntak'],
      ] as const) {
        expect(vurdering(fortolk(1, nabo(terskel, -1), d)).sammenligning.konklusjon).toBe(under)
        expect(vurdering(fortolk(1, terskel, d)).sammenligning.konklusjon).toBe(under)
        expect(vurdering(fortolk(1, nabo(terskel, 1), d)).sammenligning.konklusjon).toBe(over)
      }
    }
  })

  it('har ikke noe mellomutfall når tersklene er like', () => {
    const lik = enkelModell(0.2, 0.2)
    for (const q2 of [1, 5, 8, 8.1, 8.2, 9, 12]) {
      const r = vurdering(fortolkBeUrin(inndata(prove(10, '2026-01-01'), prove(q2, '2026-01-02')), lik))
      expect(r.sammenligning.konklusjon).not.toBe('kan_ikke_fastslaas')
      expect(terskelroller(r.sammenligning)).toEqual(['lik', 'lik'])
    }
  })

  it('er den samme når profilene står i omvendt rekkefølge i modellen', () => {
    const omvendt = godkjent({ ...SYNTETISK_MODELL, kurver: [BESTILTE_KURVER[1], BESTILTE_KURVER[0]] })
    for (const q1 of [0.4, 2, 3.66, 12, 60, 150]) {
      for (const andel of [0.05, 0.2, 0.5, 0.8, 0.95, 1.1]) {
        for (const margin of [0.5, 0.9, 0.99]) {
          const inn = inndata(prove(q1, '2026-02-01'), prove(q1 * andel, '2026-02-06'), margin)
          expect(vurdering(fortolkBeUrin(inn, omvendt)).sammenligning.konklusjon).toBe(
            vurdering(fortolkBeUrin(inn, MODELL)).sammenligning.konklusjon,
          )
        }
      }
    }
  })

  it('sammenligner ratioer, ikke prosent', () => {
    expect(konklusjonFor(0.5, [0.4, 0.6])).toBe('kan_ikke_fastslaas')
    expect(konklusjonFor(0.6, [0.6, 0.6])).toBe('ikke_nodvendigvis')
    expect(konklusjonFor(0.7, [0.6, 0.6])).toBe('nytt_inntak')
    expect(BE_URIN_KONKLUSJONER).toEqual(['ikke_nodvendigvis', 'kan_ikke_fastslaas', 'nytt_inntak'])
  })
})

describe('Q og datoene', () => {
  it('regnes som kvotientfaktor · BE / kreatinin, med komma eller punktum', () => {
    expect(kvotient(prove('12,5', '2026-01-01', '2.5'), MODELL)).toBe(5)
    expect(kvotient(prove('12,5', '2026-01-01', '2.5'), godkjent({ ...SYNTETISK_MODELL, kvotientfaktor: 2 }))).toBe(10)
    expect(kvotient(prove('0', '2026-01-01'), MODELL)).toBeNull()
    expect(kvotient(prove('3', '2026-01-01', '0'), MODELL)).toBeNull()
  })

  it('teller kalenderdøgn også over sommertid og vintertid', () => {
    for (const [fra, til] of [
      ['2026-03-28', '2026-03-30'],
      ['2026-10-24', '2026-10-26'],
    ]) {
      expect(vurdering(fortolkBeUrin(inndata(prove(10, fra!), prove(5, til!)), MODELL)).sammenligning.dager).toBe(2)
    }
  })

  it('godtar bare ekte datoer', () => {
    expect(erGyldigDato('2026-02-28')).toBe(true)
    expect(erGyldigDato('2028-02-29')).toBe(true)
    for (const d of ['2026-02-30', '2026-13-01', '26-01-01', 'i går', '']) expect(erGyldigDato(d)).toBe(false)
  })
})

describe('samme dag', () => {
  it('gir d = 0 og begge tersklene 1', () => {
    const r = vurdering(fortolkBeUrin(inndata(prove(10, '2026-05-01'), prove(11, '2026-05-01')), MODELL))
    expect(r.sammeDag).toBe(true)
    expect(r.sammenligning.dager).toBe(0)
    expect(r.sammenligning.profiler.map((p) => p.terskel)).toEqual([1, 1])
    expect(r.sammenligning.konklusjon).toBe('nytt_inntak')
  })

  it('fortolkes med marginen som ellers', () => {
    const r = vurdering(fortolkBeUrin(inndata(prove(10, '2026-05-01'), prove(11, '2026-05-01'), 0.9), MODELL))
    expect(r.sammenligning.korrigertRatio).toBeLessThan(1)
    expect(r.sammenligning.konklusjon).toBe('ikke_nodvendigvis')
  })
})

describe('det som mangler eller er ugyldig', () => {
  const gyldig = () => inndata(prove(10, '2026-01-01'), prove(5, '2026-01-04'))

  it('gir ingen konklusjon før alt er fylt inn', () => {
    const tom = mangler(fortolkBeUrin(tomBeUrinInndata(MODELL), MODELL))
    expect(tom).toEqual([
      'Fyll inn benzoylekgonin for forrige prøve.',
      'Fyll inn kreatinin for forrige prøve.',
      'Fyll inn prøvedato for forrige prøve.',
      'Fyll inn benzoylekgonin for denne prøven.',
      'Fyll inn kreatinin for denne prøven.',
      'Fyll inn prøvedato for denne prøven.',
    ])
  })

  it('vurderer ikke benzoylekgonin 0 eller ikke kvantifisert, og imputerer ingenting', () => {
    for (const verdi of ['0', '0,0']) {
      const m = mangler(fortolkBeUrin({ ...gyldig(), forrige: prove(verdi, '2026-01-01') }, MODELL))
      expect(m).toEqual([
        'Benzoylekgonin for forrige prøve må være kvantifisert og over 0. Modellen kan ikke vurdere prøver med benzoylekgonin 0, ikke påvist eller under kvantifiseringsgrensen.',
      ])
    }
    expect(mangler(fortolkBeUrin({ ...gyldig(), denne: prove('0', '2026-01-04') }, MODELL))[0]).toMatch(/denne prøven må være kvantifisert/)
  })

  it('krever kreatinin over 0, gyldige datoer og riktig rekkefølge', () => {
    expect(mangler(fortolkBeUrin({ ...gyldig(), denne: prove(5, '2026-01-04', 0) }, MODELL))).toEqual([
      'Kreatinin for denne prøven må være et tall større enn 0.',
    ])
    expect(mangler(fortolkBeUrin({ ...gyldig(), denne: prove(5, '2026-02-30') }, MODELL))).toEqual([
      'Prøvedatoen for denne prøven er ikke en gyldig dato.',
    ])
    expect(mangler(fortolkBeUrin({ ...gyldig(), denne: prove(5, '2025-12-31') }, MODELL))).toEqual([
      'Denne prøven kan ikke være tatt før forrige prøve.',
    ])
  })

  it('avviser en margin modellen ikke har', () => {
    expect(mangler(fortolkBeUrin({ ...gyldig(), sikkerhetsmargin: 0.95 }, MODELL))).toEqual([
      'Sikkerhetsmarginen finnes ikke i modellen. Velg en av marginene som tilbys.',
    ])
  })

  it('gir ingen konklusjon når Q ikke er et endelig tall', () => {
    const enorm = '9'.repeat(400)
    expect(mangler(fortolkBeUrin({ ...gyldig(), forrige: prove(enorm, '2026-01-01') }, MODELL))).toEqual([
      'Kvotienten for forrige prøve lar seg ikke regne ut.',
    ])
  })

  it('regner robust også for svært små og store kvotienter', () => {
    for (const [q1, q2] of [
      ['0.000000001', '0.0000000005'],
      ['50000', '20000'],
    ] as const) {
      const r = vurdering(fortolkBeUrin(inndata(prove(q1, '2026-01-01'), prove(q2, '2026-01-08')), MODELL))
      for (const p of r.sammenligning.profiler) {
        expect(Number.isFinite(p.terskel) && p.terskel > 0).toBe(true)
        expect(Number.isFinite(p.tidspunkt)).toBe(true)
      }
    }
  })
})

describe('sikkerhetsmarginen', () => {
  it('korrigerer med exp(z · √(2·(CV_BE² + CV_kreatinin²)))', () => {
    expect(logSd(MODELL)).toBeCloseTo(Math.sqrt(2 * (0.1 ** 2 + 0.05 ** 2)), 15)
    expect(korrigertRatio(MODELL, 0.8, 0.5)).toBe(0.8)
    expect(korrigertRatio(MODELL, 0.8, 0.9)).toBeCloseTo(0.8 * Math.exp(-1.2815515655446008 * logSd(MODELL)), 15)
    expect(korrigertRatio(MODELL, 0.8, 0.99)).toBeCloseTo(0.8 * Math.exp(-2.3263478740408408 * logSd(MODELL)), 15)
  })

  it('gir aldri en strengere konklusjon med høyere margin', () => {
    for (const q1 of [0.5, 3, 20, 90]) {
      for (const andel of [0.02, 0.1, 0.3, 0.6, 0.9, 1.2]) {
        for (const d of [0, 1, 3, 10]) {
          const trinn = [0.5, 0.9, 0.99].map((margin) => {
            const inn = inndata(prove(q1, '2026-03-01'), prove(q1 * andel, new Date(Date.UTC(2026, 2, 1 + d)).toISOString().slice(0, 10)), margin)
            return BE_URIN_KONKLUSJONER.indexOf(vurdering(fortolkBeUrin(inn, MODELL)).sammenligning.konklusjon)
          })
          expect(trinn[1]!).toBeLessThanOrEqual(trinn[0]!)
          expect(trinn[2]!).toBeLessThanOrEqual(trinn[1]!)
        }
      }
    }
  })

  it('foreslår bare høyere marginer som gir en mildere konklusjon', () => {
    const m = enkelModell(0.1, 0.3)
    const inn = (margin: number) => inndata(prove(10, '2026-01-01'), prove(11.5, '2026-01-02'), margin)
    // Målt 1,15: uten margin og med 90 % over begge profilene, med 99 % mellom dem.
    expect(vurdering(fortolkBeUrin(inn(0.9), m)).sammenligning.konklusjon).toBe('nytt_inntak')
    expect(mildereVedHoyereMargin(inn(0.5), m)).toEqual([{ marginer: [0.99], konklusjon: 'kan_ikke_fastslaas', samletDato: null }])
    expect(mildereVedHoyereMargin(inn(0.9), m)).toEqual([{ marginer: [0.99], konklusjon: 'kan_ikke_fastslaas', samletDato: null }])
    expect(mildereVedHoyereMargin(inn(0.99), m)).toEqual([])
    // Endrer ikke valgt margin.
    const valgt = inn(0.5)
    mildereVedHoyereMargin(valgt, m)
    expect(valgt.sikkerhetsmargin).toBe(0.5)
  })

  it('foreslår ingenting uten en vurdering', () => {
    expect(mildereVedHoyereMargin(tomBeUrinInndata(MODELL), MODELL)).toEqual([])
  })
})

describe('den samlede vurderingen', () => {
  // A: e^(−0,1·d), B: e^(−0,3·d). Forrige 10 → denne 8 etter ett døgn: kan ikke fastslås.
  const m = enkelModell(0.1, 0.3)
  const forrige = prove(10, '2026-01-10')
  const denne = prove(8, '2026-01-11')
  const samlet = (tidligere: BeUrinProve[], margin = 0.5) =>
    fortolkBeUrin(inndata(forrige, denne, margin, { samletVurdering: true, tidligere }), m)
  const hoved = vurdering(fortolkBeUrin(inndata(forrige, denne), m)).sammenligning

  it('finner nytt inntak etter den nærmeste tidligere prøven, uansett rekkefølgen de er lagt inn i', () => {
    const naer = prove(9, '2026-01-09') // 2 døgn, ratio 0,889 over begge
    const fjern = prove(100, '2026-01-01') // 10 døgn, ratio 0,08
    for (const tidligere of [[naer, fjern], [fjern, naer]]) {
      const r = vurdering(samlet(tidligere))
      expect(r.samlet).toMatchObject({ vurdert: 2, treff: { dato: '2026-01-09', q: 9 } })
      expect(r.samlet!.treff!.sammenligning.dager).toBe(2)
      expect(r.sammenligning).toEqual(hoved)
    }
  })

  it('går bakover og bruker hver prøves egen Q og tidsrom', () => {
    const r = vurdering(samlet([prove(20, '2026-01-09'), prove(8.1, '2026-01-08')]))
    expect(r.samlet!.treff).toMatchObject({ dato: '2026-01-08', q: 8.1 })
    const s = r.samlet!.treff!.sammenligning
    expect(s.dager).toBe(3)
    expect(s.profiler[0].terskel).toBeCloseTo(Math.exp(-0.3), 12)
    expect(s.maltRatio).toBe(8 / 8.1)
  })

  it('sier fra når ingen tidligere prøve gir nytt inntak', () => {
    expect(vurdering(samlet([prove(20, '2026-01-09'), prove(100, '2026-01-01')])).samlet).toEqual({ vurdert: 2, treff: null })
  })

  it('vurderes bare når hovedsammenligningen gir «kan ikke fastslås»', () => {
    const r = vurdering(fortolkBeUrin(inndata(forrige, prove(9.9, '2026-01-11'), 0.5, { samletVurdering: true, tidligere: [prove(9, '2026-01-09')] }), m))
    expect(r.sammenligning.konklusjon).toBe('nytt_inntak')
    expect(r.samlet).toBeNull()
  })

  it('fortolker ikke ugyldige tidligere prøver lydløst', () => {
    expect(mangler(samlet([prove(9, '2026-01-09', '')]))).toEqual(['Fyll inn kreatinin for den tidligere prøven.'])
    expect(mangler(samlet([prove(9, '2026-01-10')]))).toEqual(['Den tidligere prøven må være tatt før forrige prøve.'])
    expect(mangler(samlet([prove(9, '2026-01-09'), prove(9, '2026-01-12')]))).toEqual(['Tidligere prøve 2 må være tatt før forrige prøve.'])
    expect(mangler(samlet([]))).toEqual(['Legg til en tidligere prøve, eller slå av den samlede vurderingen.'])
  })

  it('ser bort fra de tidligere prøvene når vurderingen er slått av', () => {
    const r = vurdering(fortolkBeUrin(inndata(forrige, denne, 0.5, { samletVurdering: false, tidligere: [prove('', '')] }), m))
    expect(r.samlet).toBeNull()
  })

  it('regner nytt inntak etter en eldre prøve som mildere enn nytt inntak etter forrige', () => {
    // Forrige 10 → denne 11,5: uten margin nytt inntak; med 99 % kan ikke fastslås, men nytt etter 09.01.
    const inn = (margin: number) =>
      inndata(forrige, prove(11.5, '2026-01-11'), margin, { samletVurdering: true, tidligere: [prove(9, '2026-01-09')] })
    expect(vurdering(fortolkBeUrin(inn(0.5), m)).sammenligning.konklusjon).toBe('nytt_inntak')
    const r99 = vurdering(fortolkBeUrin(inn(0.99), m))
    expect(r99.sammenligning.konklusjon).toBe('kan_ikke_fastslaas')
    expect(r99.samlet!.treff!.dato).toBe('2026-01-09')
    expect(mildereVedHoyereMargin(inn(0.5), m).map((u) => [u.marginer, u.konklusjon, u.samletDato])).toContainEqual([
      [0.99],
      'kan_ikke_fastslaas',
      '2026-01-09',
    ])
  })
})

describe('figuren', () => {
  it('bruker nøyaktig motorens terskler og punkter', () => {
    for (const [q1, q2, d] of [
      [50, 20, 3],
      [1, 0.9, 7],
      [200, 30, 2],
    ] as const) {
      const r = vurdering(fortolkBeUrin(inndata(prove(q1, '2026-01-01'), prove(q2, `2026-01-0${1 + d}`), 0.9), MODELL))
      const s = r.sammenligning
      const punkter = marginpunkter(MODELL, s, visningsmarginer(MODELL, 0.9, true))
      expect(punkter.map((p) => p.margin)).toEqual([0.5, 0.9, 0.99])
      const valgt = punkter.find((p) => p.margin === 0.9)!
      expect(valgt.korrigertRatio).toBe(s.korrigertRatio)
      expect(valgt.konklusjon).toBe(s.konklusjon)
      const graf = byggBeUrinGraf(s, MODELL.kurver, punkter.map((p) => prosentFor(p.korrigertRatio)))
      expect(graf.xMaks).toBe(d)
      graf.kurver.forEach((kurve, i) => {
        expect(kurve.punkter[0]).toEqual({ dag: 0, prosent: 0 })
        expect(kurve.punkter.at(-1)).toEqual({ dag: d, prosent: prosentFor(s.profiler[i]!.terskel) })
      })
      // Y-aksen rommer kurvene og alle punktene.
      for (const p of [...punkter.map((x) => prosentFor(x.korrigertRatio)), ...graf.kurver.flatMap((k) => k.punkter.map((x) => x.prosent))]) {
        expect(p).toBeGreaterThanOrEqual(graf.yBunn)
        expect(p).toBeLessThanOrEqual(graf.yTopp)
      }
    }
  })

  it('farger etter terskelen, ikke etter profilen', () => {
    const s = (q: number, dato: string) => vurdering(fortolkBeUrin(inndata(prove(q, '2026-01-01'), prove(q, dato)), MODELL)).sammenligning
    expect(terskelroller(s(50, '2026-01-04'))).toEqual(['ovre', 'nedre'])
    expect(terskelroller(s(3, '2026-01-02'))).toEqual(['nedre', 'ovre'])
  })
})

describe('modellen', () => {
  it('godtar den syntetiske testmodellen', () => {
    expect(validerBeUrinModell(SYNTETISK_MODELL)).toEqual([])
  })

  it.each<[string, Partial<BeUrinModell>, string]>([
    ['CV 0', { maleusikkerhet: { cv_benzoylekgonin: 0, cv_kreatinin: 0.05 } }, 'CV for benzoylekgonin må ligge mellom 0 og 1.'],
    ['CV 1', { maleusikkerhet: { cv_benzoylekgonin: 0.1, cv_kreatinin: 1 } }, 'CV for kreatinin må ligge mellom 0 og 1.'],
    ['én kurve', { kurver: [BESTILTE_KURVER[0]] as unknown as BeUrinModell['kurver'] }, 'Modellen må ha nøyaktig to utskillelsesprofiler.'],
    ['negativ k', { kurver: [{ ...BESTILTE_KURVER[0], k2: -1 }, BESTILTE_KURVER[1]] }, 'Utskillelsesprofil 1: k2 må være et tall større enn 0.'],
    ['like navn', { kurver: [BESTILTE_KURVER[0], { ...BESTILTE_KURVER[1], navn: 'Utskillelsesprofil 1' }] }, 'De to utskillelsesprofilene må ha ulike navn.'],
    ['feil z', { sikkerhetsmarginer: [{ margin: 0.5, z: 0 }, { margin: 0.9, z: -1.2 }] }, 'z-verdien for 90 % stemmer ikke med marginen.'],
    ['standard utenfor', { standard_sikkerhetsmargin: 0.95 }, 'Standardmarginen må være en av sikkerhetsmarginene.'],
    ['kvotientfaktor 0', { kvotientfaktor: 0 }, 'Kvotientfaktoren må være et tall større enn 0.'],
    ['uten enhet', { enheter: { benzoylekgonin: '', kreatinin: 'K', kvotient: 'Q' } }, 'Enheten for benzoylekgonin mangler.'],
    ['uten versjon', { versjon: ' ' }, 'Modellen mangler versjon.'],
  ])('avviser %s', (_, endring, feil) => {
    expect(validerBeUrinModell({ ...SYNTETISK_MODELL, ...endring })).toContain(feil)
  })

  it('tåler et svar med feil form uten å kaste', () => {
    for (const modell of ['tekst', 3, [], { kurver: 'x' }, { ...SYNTETISK_MODELL, sikkerhetsmarginer: null }]) {
      const r = tilBeUrinModell(modell)
      expect(r?.ok).toBe(false)
    }
    expect(tilBeUrinModell(null)).toBeNull()
    expect(() => lesBeUrinModellsvar('x')).toThrow()
    expect(() => lesBeUrinModellsvar({ fagmiljo: null })).toThrow()
    expect(lesBeUrinModellsvar({ fagmiljo: null, modell: null })).toEqual({ fagmiljo: null, modell: null })
  })
})
