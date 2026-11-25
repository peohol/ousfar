/**
 * Motoren for benzoylekgonin i urin med fem utskillelsesprofiler (#570,
 * docs/benzoylekgonin-urin.md): tersklene, navnene på de to
 * bieksponentielle profilene, gradene, de to vurderingene, den samlede
 * vurderingen, høyere margin, svært lange tidsrom, modellkontrollen og
 * figuren. Profilene er bestillingens; prøveverdiene er oppdiktede.
 */
import { describe, expect, it } from 'vitest'
import { tilBeUrinModell, validerBeUrinProfilmodell, type BeUrinProfil, type BeUrinProfilmodell } from '../beUrinModell'
import { SAMME_DAG_FEIL, tomBeUrinInndata, type BeUrinInndata, type BeUrinProve } from '../beUrinMotor'
import { byggProfilgraf, prosentFor } from '../beUrinPlot'
import {
  fortolkBeUrinProfiler,
  mildereProfilutfall,
  profilFor,
  profilMarginpunkter,
  ratioEtter,
  samletAktuell,
  sammenlignProfiler,
  type BeUrinProfilresultat,
  type BeUrinRolle,
} from '../beUrinProfiler'
import { BE_URIN_ROLLENAVN } from '../beUrinProfilvisning'
import {
  BESTILTE_PROFILER,
  MARGINER,
  PROFILMODELL,
  SYNTETISK_MODELL,
  godkjentProfilmodell,
  medProfil,
} from './hjelp/beUrinTestmodell'

const MODELL = godkjentProfilmodell()

/** Nærmeste flyttall over eller under `x`. */
function nabo(x: number, retning: 1 | -1): number {
  const buffer = new DataView(new ArrayBuffer(8))
  buffer.setFloat64(0, x)
  const bits = buffer.getBigUint64(0)
  buffer.setBigUint64(0, x > 0 === (retning === 1) ? bits + 1n : bits - 1n)
  return buffer.getFloat64(0)
}

/** Sammenligningen med marginen «Ingen» (z = 0), så R_korr = Q2/Q1. */
function uten(fra: number, til: number, dager: number, m = MODELL) {
  const s = sammenlignProfiler(m, fra, til, dager, 0.5)
  if (!s) throw new Error('Ventet en sammenligning.')
  return s
}

const terskel = (s: ReturnType<typeof uten>, rolle: BeUrinRolle) => profilFor(s, rolle).terskel
const id = (s: ReturnType<typeof uten>, rolle: BeUrinRolle) => profilFor(s, rolle).profil.id

const prove = (benzoylekgonin: number | string, dato: string, kreatinin: number | string = 1): BeUrinProve => ({
  benzoylekgonin: String(benzoylekgonin),
  kreatinin: String(kreatinin),
  dato,
})

function inndata(forrige: BeUrinProve, denne: BeUrinProve, margin = 0.5, tillegg: Partial<BeUrinInndata> = {}): BeUrinInndata {
  return { ...tomBeUrinInndata(MODELL), forrige, denne, sikkerhetsmargin: margin, ...tillegg }
}

function vurdering(r: BeUrinProfilresultat) {
  if (r.type !== 'vurdering') throw new Error(`Ventet en vurdering, fikk: ${r.mangler.join(' ')}`)
  return r
}

describe('tersklene', () => {
  it('gir de monoeksponentielle tersklene etter ett døgn', () => {
    const s = uten(100, 100, 1)
    expect(terskel(s, 'enkeltinntak')).toBeCloseTo(0.0928746430710593, 15)
    expect(terskel(s, 'gjentatte_doser')).toBeCloseTo(0.6216979445974911, 15)
    expect(terskel(s, 'moderat')).toBeCloseTo(0.7489251525043829, 15)
  })

  it('lar de monoeksponentielle tersklene være uavhengige av Q1 og a', () => {
    const annenA = godkjentProfilmodell({
      profiler: medProfil({ id: 'moderat', type: 'mono', a: 1, k: 0.2891162303589332 }),
    })
    for (const q of [0.01, 1, 3.25, 100, 5000]) {
      for (const rolle of ['enkeltinntak', 'gjentatte_doser', 'moderat'] as const) {
        expect(terskel(uten(q, q, 3), rolle), `${rolle} ${q}`).toBe(terskel(uten(100, 100, 3), rolle))
        expect(terskel(uten(q, q, 3, annenA), rolle), `${rolle} ${q}`).toBe(terskel(uten(100, 100, 3), rolle))
      }
    }
  })

  it('gir de bieksponentielle tersklene ved Q = 100 etter ett døgn, med treg under moderat', () => {
    const s = uten(100, 100, 1)
    expect(id(s, 'ekstrem')).toBe('bi_a')
    expect(id(s, 'treg')).toBe('bi_b')
    expect(terskel(s, 'ekstrem')).toBeCloseTo(0.92734167193, 10)
    expect(terskel(s, 'treg')).toBeCloseTo(0.6789017331, 10)
    expect(terskel(s, 'treg')).toBeLessThan(terskel(s, 'moderat'))
    expect(s.likeBi).toBe(false)
  })

  it('bytter navnene på A og B etter referanseprøven', () => {
    const lav = uten(1, 1, 1)
    expect([id(lav, 'ekstrem'), id(lav, 'treg')]).toEqual(['bi_a', 'bi_b'])
    const midt = uten(3.25, 3.25, 1)
    expect([id(midt, 'ekstrem'), id(midt, 'treg')]).toEqual(['bi_b', 'bi_a'])
    // Den med høyest terskel er ekstrem.
    for (const s of [lav, midt]) expect(terskel(s, 'ekstrem')).toBeGreaterThan(terskel(s, 'treg'))
  })

  it('lar A være ekstrem og sier fra når A og B gir samme terskel', () => {
    const b = BESTILTE_PROFILER.find((p) => p.id === 'bi_b')!
    const like = godkjentProfilmodell({ profiler: medProfil({ ...b, id: 'bi_a' } as BeUrinProfil) })
    const s = uten(50, 40, 2, like)
    expect(s.likeBi).toBe(true)
    expect(id(s, 'ekstrem')).toBe('bi_a')
    expect(id(s, 'treg')).toBe('bi_b')
    expect(terskel(s, 'ekstrem')).toBe(terskel(s, 'treg'))
  })

  it('gir terskel 1 for alle profilene uten tid mellom prøvene', () => {
    const s = uten(100, 300, 0)
    for (const p of s.profiler) {
      expect(p.terskel, p.rolle).toBe(1)
      expect(p.logTerskel, p.rolle).toBe(0)
    }
  })

  it('gir ratioEtter lik terskelen ved d, for alle profilene', () => {
    for (const [q, d] of [
      [100, 1],
      [3.25, 4],
      [500, 7],
      [0.2, 30],
    ] as const) {
      const s = uten(q, q, d)
      for (const p of s.profiler) {
        const r = ratioEtter(p, s.fra, s.dager)
        expect(Math.abs(r / p.terskel - 1), `${p.rolle} ${q} ${d}`).toBeLessThan(1e-12)
      }
    }
  })
})

describe('gradene', () => {
  // Samme dag er R = 1, og uten margin er F = Q2/Q1 nøyaktig.
  const grad = (q2: number) => profilFor(uten(1, q2, 0), 'moderat').grad

  it('graderer F uten avrunding rundt 1, 5 og 10, med grensen i den lavere graden', () => {
    expect(grad(nabo(1, -1))).toBe('under')
    expect(grad(1)).toBe('paa_nivaa')
    expect(grad(nabo(1, 1))).toBe('over')
    expect(grad(5)).toBe('over')
    expect(grad(nabo(5, 1))).toBe('langt_over')
    expect(grad(5 * (1 + 1e-12))).toBe('langt_over')
    expect(grad(10)).toBe('langt_over')
    expect(grad(nabo(10, 1))).toBe('svaert_langt_over')
    expect(grad(0.2)).toBe('under')
  })

  it('graderer hver profil for seg', () => {
    const s = uten(100, 80, 1)
    expect(s.profiler.map((p) => [p.rolle, p.grad])).toEqual([
      ['enkeltinntak', 'langt_over'],
      ['gjentatte_doser', 'over'],
      ['moderat', 'over'],
      ['treg', 'over'],
      ['ekstrem', 'under'],
    ])
    for (const p of s.profiler) expect(p.f).toBeCloseTo(0.8 / p.terskel, 12)
  })
})

describe('vurderingene', () => {
  it.each([
    [0.05, 'forenlig_enkeltinntak'],
    [0.5, 'forenlig_gjentatte_doser'],
    [1, 'sannsynlig'],
    [4, 'svaert_sannsynlig'],
  ] as const)('gir ved sporadisk bruk ratio %s → %s', (ratio, utfall) => {
    expect(uten(100, 100 * ratio, 1).sporadisk).toBe(utfall)
  })

  it.each([
    [0.5, 'uavklart'],
    [0.7, 'uavklart'],
    [0.8, 'uavklart_uvanlig'],
    [1, 'sannsynlig'],
    [5, 'svaert_sannsynlig'],
  ] as const)('gir ved kronisk bruk ratio %s → %s', (ratio, utfall) => {
    expect(uten(100, 100 * ratio, 1).kronisk).toBe(utfall)
  })

  it('gir «sannsynlig» når F for gjentatte doser er nøyaktig 5, og «svært sannsynlig» rett over', () => {
    // e^(−ln 2) er nøyaktig 0,5, så F = 2,5 / 0,5 = 5 nøyaktig.
    const m = godkjentProfilmodell({ profiler: medProfil({ id: 'gjentatte_doser', type: 'mono', a: 1, k: Math.LN2 }) })
    expect(Math.exp(-Math.LN2)).toBe(0.5)
    const pa = uten(1, 2.5, 1, m)
    expect(profilFor(pa, 'gjentatte_doser').f).toBe(5)
    expect(pa.sporadisk).toBe('sannsynlig')
    expect(uten(1, nabo(2.5, 1), 1, m).sporadisk).toBe('svaert_sannsynlig')
    // Nøyaktig 1: forenlig med gjentatte doser.
    const en = uten(1, 0.5, 1, m)
    expect(profilFor(en, 'gjentatte_doser').grad).toBe('paa_nivaa')
    expect(en.sporadisk).toBe('forenlig_gjentatte_doser')
  })

  it('gir «sannsynlig» ved kronisk bruk når F for ekstrem er over 1 og høyst 5', () => {
    const s = uten(100, 100, 1)
    const f = profilFor(s, 'ekstrem').f
    expect(f).toBeGreaterThan(1)
    expect(f).toBeLessThanOrEqual(5)
    expect(s.kronisk).toBe('sannsynlig')
    // Rett over 5: svært sannsynlig.
    const ekstrem = terskel(s, 'ekstrem')
    expect(uten(100, 100 * ekstrem * 5.000001, 1).kronisk).toBe('svaert_sannsynlig')
    expect(uten(100, 100 * ekstrem * 4.999999, 1).kronisk).toBe('sannsynlig')
  })

  it('gjør den samlede vurderingen aktuell bare når kronisk er uavklart og endringen er over moderat eller treg', () => {
    expect(samletAktuell(uten(100, 50, 1))).toBe(false)
    expect(samletAktuell(uten(100, 70, 1))).toBe(true)
    expect(samletAktuell(uten(100, 80, 1))).toBe(true)
    expect(samletAktuell(uten(100, 100, 1))).toBe(false)
  })
})

describe('fortolkningen', () => {
  it('gir det som mangler, og ingen vurdering, ved tomme eller ugyldige felt', () => {
    const r = fortolkBeUrinProfiler(inndata(prove('', '2026-01-01'), prove(0, '2026-13-01')), MODELL)
    expect(r.type).toBe('mangler')
    if (r.type !== 'mangler') return
    expect(r.mangler).toContain('Fyll inn benzoylekgonin for forrige prøve.')
    expect(r.mangler.some((m) => m.includes('kvantifisert og over 0'))).toBe(true)
    expect(r.mangler).toContain('Prøvedatoen for denne prøven er ikke en gyldig dato.')
    const for_ = fortolkBeUrinProfiler(inndata(prove(10, '2026-01-05'), prove(10, '2026-01-01')), MODELL)
    expect(for_.type === 'mangler' && for_.mangler).toEqual(['Denne prøven kan ikke være tatt før forrige prøve.'])
  })

  it('gir ingen vurdering med en margin modellen ikke har', () => {
    const r = fortolkBeUrinProfiler(inndata(prove(100, '2026-01-01'), prove(80, '2026-01-02'), 0.95), MODELL)
    expect(r.type === 'mangler' && r.mangler).toEqual([
      'Sikkerhetsmarginen finnes ikke i modellen. Velg en av marginene som tilbys.',
    ])
  })

  it('vurderer forrige og denne prøven med marginen', () => {
    const r = vurdering(fortolkBeUrinProfiler(inndata(prove(100, '2026-01-01'), prove(80, '2026-01-02'), 0.9), MODELL))
    expect(r.sammenligning.dager).toBe(1)
    expect(r.sammenligning.margin).toBe(0.9)
    expect(r.sammenligning.korrigertRatio).toBeLessThan(0.8)
    expect(r.samlet).toBeNull()
  })

  it('regner Q med kreatininen', () => {
    const r = vurdering(fortolkBeUrinProfiler(inndata(prove(200, '2026-01-01', 2), prove(160, '2026-01-02', 2)), MODELL))
    expect(r.forrige.q).toBe(100)
    expect(r.denne.q).toBe(80)
  })
})

describe('den samlede vurderingen', () => {
  const forrige = prove(100, '2026-01-02')
  const denne = prove(80, '2026-01-03') // uavklart, uvanlig: aktuell
  const samlet = (tidligere: BeUrinProve[], d = denne) =>
    fortolkBeUrinProfiler(inndata(forrige, d, 0.5, { samletVurdering: true, tidligere }), MODELL)

  it('finner den nyeste tidligere prøven endringen ligger over ekstrem utskillelse mot', () => {
    const treffer = prove(40, '2025-12-25')
    const bom = prove(200, '2026-01-01')
    for (const tidligere of [
      [bom, treffer],
      [treffer, bom],
    ]) {
      const r = vurdering(samlet(tidligere))
      expect(r.sammenligning.kronisk).toBe('uavklart_uvanlig')
      expect(r.samlet?.vurdert).toBe(2)
      expect(r.samlet?.treff?.dato).toBe('2025-12-25')
      expect(r.samlet?.treff?.sammenligning.dager).toBe(9)
      expect(profilFor(r.samlet!.treff!.sammenligning, 'ekstrem').f).toBeGreaterThan(1)
    }
    // To treff: den nyeste vinner.
    const r = vurdering(samlet([prove(40, '2025-12-25'), prove(50, '2026-01-01')]))
    expect(r.samlet?.treff?.dato).toBe('2026-01-01')
  })

  it('sier at ingen traff', () => {
    const r = vurdering(samlet([prove(200, '2026-01-01')]))
    expect(r.samlet).toEqual({ vurdert: 1, treff: null })
  })

  it('kjøres ikke når den ikke er aktuell, eller ikke er slått på', () => {
    expect(vurdering(samlet([prove(40, '2025-12-25')], prove(50, '2026-01-03'))).samlet).toBeNull()
    expect(vurdering(samlet([prove(40, '2025-12-25')], prove(100, '2026-01-03'))).samlet).toBeNull()
    const av = fortolkBeUrinProfiler(
      inndata(forrige, denne, 0.5, { samletVurdering: false, tidligere: [prove(40, '2025-12-25')] }),
      MODELL,
    )
    expect(vurdering(av).samlet).toBeNull()
  })

  it('sammenligner ikke prøver fra samme dag, heller ikke med den samlede vurderingen', () => {
    const r = samlet([prove(40, '2025-12-25')], prove(80, '2026-01-02'))
    expect(r.type === 'mangler' && r.mangler).toEqual([SAMME_DAG_FEIL])
    // Ingen vurdering, så ingen høyere margin heller.
    expect(mildereProfilutfall(inndata(forrige, prove(80, '2026-01-02'), 0.5), MODELL)).toEqual([])
  })

  it('gir mangler for en ugyldig tidligere prøve, eller en som ikke er før forrige', () => {
    const ugyldig = samlet([prove('', '2025-12-25')])
    expect(ugyldig.type === 'mangler' && ugyldig.mangler).toEqual(['Fyll inn benzoylekgonin for den tidligere prøven.'])
    const etter = samlet([prove(40, '2026-01-02')])
    expect(etter.type === 'mangler' && etter.mangler).toEqual(['Den tidligere prøven må være tatt før forrige prøve.'])
    const ingen = samlet([])
    expect(ingen.type === 'mangler' && ingen.mangler).toEqual([
      'Legg til en tidligere prøve, eller slå av den samlede vurderingen.',
    ])
  })
})

describe('høyere sikkerhetsmargin', () => {
  const inn = (ratio: number, margin: number) => inndata(prove(100, '2026-01-01'), prove(100 * ratio, '2026-01-02'), margin)

  it('viser den mildere vurderingen ved kronisk bruk, med marginen som gir den', () => {
    const r = vurdering(fortolkBeUrinProfiler(inn(1.5, 0.5), MODELL))
    expect([r.sammenligning.sporadisk, r.sammenligning.kronisk]).toEqual(['sannsynlig', 'sannsynlig'])
    expect(mildereProfilutfall(inn(1.5, 0.5), MODELL)).toEqual([
      { vurdering: 'kronisk', utfall: 'uavklart_uvanlig', samletDato: null, marginer: [0.99] },
    ])
  })

  it('viser mildere vurderinger for begge, gruppert etter utfall', () => {
    expect(mildereProfilutfall(inn(0.9, 0.5), MODELL)).toEqual([
      { vurdering: 'sporadisk', utfall: 'forenlig_gjentatte_doser', samletDato: null, marginer: [0.9, 0.99] },
      { vurdering: 'kronisk', utfall: 'uavklart', samletDato: null, marginer: [0.9, 0.99] },
    ])
  })

  it('prøver aldri lavere marginer, og er tom når ingenting blir mildere', () => {
    expect(mildereProfilutfall(inn(1.5, 0.99), MODELL)).toEqual([])
    expect(mildereProfilutfall(inn(0.9, 0.9), MODELL)).toEqual([])
    expect(mildereProfilutfall(inn(0.05, 0.5), MODELL)).toEqual([])
    expect(mildereProfilutfall(inndata(prove('', ''), prove('', '')), MODELL)).toEqual([])
  })

  it('tar med en indikasjon etter en eldre prøve som mildere enn «sannsynlig»', () => {
    const med = (margin: number) =>
      inndata(prove(100, '2026-01-02'), prove(150, '2026-01-03'), margin, {
        samletVurdering: true,
        tidligere: [prove(30, '2025-12-25')],
      })
    const valgt = vurdering(fortolkBeUrinProfiler(med(0.5), MODELL))
    expect(valgt.sammenligning.kronisk).toBe('sannsynlig')
    expect(valgt.samlet).toBeNull()
    const hoy = vurdering(fortolkBeUrinProfiler(med(0.99), MODELL))
    expect(hoy.sammenligning.kronisk).toBe('uavklart_uvanlig')
    expect(hoy.samlet?.treff?.dato).toBe('2025-12-25')
    expect(mildereProfilutfall(med(0.5), MODELL)).toEqual([
      { vurdering: 'kronisk', utfall: 'uavklart_uvanlig', samletDato: '2025-12-25', marginer: [0.99] },
    ])
  })
})

describe('svært lange tidsrom og store kvotienter', () => {
  it.each([1e5, 1e6])('gir gyldige grader etter %s døgn, også når tersklene er 0 i flyttall', (dager) => {
    const s = uten(50, 50, dager)
    for (const p of s.profiler) {
      expect(Number.isFinite(p.logTerskel), p.rolle).toBe(true)
      expect(p.logTerskel, p.rolle).toBeLessThan(0)
      expect(Number.isNaN(p.f), p.rolle).toBe(false)
      expect(Number.isFinite(p.logF), p.rolle).toBe(true)
      expect(p.grad, p.rolle).toBe('svaert_langt_over')
    }
    expect(s.sporadisk).toBe('svaert_sannsynlig')
    expect(s.kronisk).toBe('svaert_sannsynlig')
    expect(terskel(s, 'enkeltinntak')).toBe(0)
  })

  it('bruker logaritmene når ratioen ikke er et vanlig tall', () => {
    const stor = uten(1e-10, 1e300, 1)
    expect(stor.maltRatio).toBe(Infinity)
    for (const p of stor.profiler) {
      expect(Number.isFinite(p.logF), p.rolle).toBe(true)
      expect(p.grad, p.rolle).toBe('svaert_langt_over')
    }
    const liten = uten(1e10, 1e-300, 1)
    for (const p of liten.profiler) {
      expect(Number.isFinite(p.logF), p.rolle).toBe(true)
      expect(p.grad, p.rolle).toBe('under')
    }
    expect([liten.sporadisk, liten.kronisk]).toEqual(['forenlig_enkeltinntak', 'uavklart'])
  })
})

describe('modellkontrollen', () => {
  const feil = (m: unknown) => validerBeUrinProfilmodell(m as BeUrinProfilmodell)

  it('godtar modellen med de fem profilene, i vilkårlig rekkefølge', () => {
    expect(feil(PROFILMODELL)).toEqual([])
    expect(feil({ ...PROFILMODELL, profiler: [...BESTILTE_PROFILER].reverse() })).toEqual([])
    const r = tilBeUrinModell(PROFILMODELL)
    expect(r?.ok).toBe(true)
  })

  it('avviser feil antall, doble, ukjente og feiltypede profiler', () => {
    expect(feil({ ...PROFILMODELL, profiler: BESTILTE_PROFILER.slice(0, 4) })).toEqual(
      expect.arrayContaining(['Modellen må ha nøyaktig 5 utskillelsesprofiler.', 'Modellen mangler profilen bi_b.']),
    )
    const dobbel = [...BESTILTE_PROFILER.slice(0, 4), BESTILTE_PROFILER[0]!]
    expect(feil({ ...PROFILMODELL, profiler: dobbel })).toEqual(
      expect.arrayContaining(['Profilen enkeltinntak står mer enn én gang.', 'Modellen mangler profilen bi_b.']),
    )
    const ukjent = [...BESTILTE_PROFILER.slice(0, 4), { id: 'ukjent', type: 'mono', a: 1, k: 1 } as unknown as BeUrinProfil]
    expect(feil({ ...PROFILMODELL, profiler: ukjent })).toEqual(
      expect.arrayContaining(['Utskillelsesprofil 5 har en ukjent ID.']),
    )
    const feilType = medProfil({ id: 'moderat', type: 'bi', a1: 1, k1: 1, a2: 1, k2: 1 } as unknown as BeUrinProfil)
    expect(feil({ ...PROFILMODELL, profiler: feilType })).toEqual(['Profilen moderat må være monoeksponentiell.'])
    const biSomMono = medProfil({ id: 'bi_a', type: 'mono', a: 1, k: 1 } as unknown as BeUrinProfil)
    expect(feil({ ...PROFILMODELL, profiler: biSomMono })).toEqual(['Profilen bi_a må være bieksponentiell.'])
  })

  it.each([0, -1, Number.NaN, Infinity, '1', null])('avviser parameteren %s', (verdi) => {
    const mono = medProfil({ id: 'gjentatte_doser', type: 'mono', a: 1, k: verdi } as unknown as BeUrinProfil)
    expect(feil({ ...PROFILMODELL, profiler: mono })).toEqual(['Profilen gjentatte_doser: k må være et tall større enn 0.'])
    const b = BESTILTE_PROFILER.find((p) => p.id === 'bi_b')!
    const bi = medProfil({ ...b, a2: verdi } as unknown as BeUrinProfil)
    expect(feil({ ...PROFILMODELL, profiler: bi })).toEqual(['Profilen bi_b: a2 må være et tall større enn 0.'])
  })

  it('avviser en modell uten formen, og en ukjent form', () => {
    const { form: _form, ...utenForm } = PROFILMODELL
    expect(feil(utenForm)).toContain('Modellen har ikke formen med fem utskillelsesprofiler.')
    // Uten `form` leses den som form 1, og har ingen kurver.
    expect(tilBeUrinModell(utenForm)?.ok).toBe(false)
    expect(tilBeUrinModell({ ...PROFILMODELL, form: 3 })).toEqual({
      ok: false,
      feil: ['Modellen har en form appen ikke kjenner.'],
    })
    expect(tilBeUrinModell({ ...PROFILMODELL, profiler: 'fem' })?.ok).toBe(false)
    expect(feil({ ...PROFILMODELL, maleusikkerhet: { cv_benzoylekgonin: 0, cv_kreatinin: 0.05 } })).toEqual([
      'CV for benzoylekgonin må ligge mellom 0 og 1.',
    ])
  })

  it('godtar fortsatt en modell av form 1, og aldri fem profiler som to', () => {
    expect(tilBeUrinModell(SYNTETISK_MODELL)?.ok).toBe(true)
    expect(tilBeUrinModell({ ...SYNTETISK_MODELL, form: 1 })?.ok).toBe(true)
    // En modell av form 2 med `kurver` i tillegg leses fortsatt som form 2.
    const r = tilBeUrinModell({ ...PROFILMODELL, kurver: SYNTETISK_MODELL.kurver })
    expect(r?.ok && 'profiler' in r.modell).toBe(true)
  })
})

describe('figuren', () => {
  it('har alle fem profilene, fra 0 % til motorens terskler', () => {
    const s = uten(100, 80, 3)
    const punkter = profilMarginpunkter(MODELL, s, MARGINER.map((m) => m.margin))
    const graf = byggProfilgraf(s, BE_URIN_ROLLENAVN, punkter.map((p) => prosentFor(p.korrigertRatio)))
    expect(graf.kurver.map((k) => k.navn)).toEqual([
      'Utskillelse etter enkeltinntak',
      'Utskillelse etter gjentatte doser innenfor et kort tidsrom',
      'Moderat utskillelse',
      'Treg utskillelse',
      'Ekstrem utskillelse',
    ])
    expect(graf.xMaks).toBe(3)
    for (const kurve of graf.kurver) {
      expect(kurve.punkter[0]).toEqual({ dag: 0, prosent: 0 })
      expect(kurve.punkter.at(-1)).toEqual({ dag: 3, prosent: prosentFor(terskel(s, kurve.rolle)) })
    }
    expect(graf.yBunn).toBeLessThanOrEqual(Math.min(...graf.kurver.flatMap((k) => k.punkter.map((p) => p.prosent))))
    expect(graf.yTopp).toBeGreaterThanOrEqual(0)
  })

  it('tegner de monoeksponentielle profilene likt uansett Q1, og navnene følger sammenligningen', () => {
    const graf = (q: number) => byggProfilgraf(uten(q, q, 2), BE_URIN_ROLLENAVN, [0])
    const [lav, hoy] = [graf(1), graf(100)]
    for (const rolle of ['enkeltinntak', 'gjentatte_doser', 'moderat'] as const) {
      expect(lav.kurver.find((k) => k.rolle === rolle)!.punkter).toEqual(hoy.kurver.find((k) => k.rolle === rolle)!.punkter)
    }
    const midt = uten(3.25, 3.25, 1)
    expect(id(midt, 'ekstrem')).toBe('bi_b')
    const ekstrem = byggProfilgraf(midt, BE_URIN_ROLLENAVN, [0]).kurver.find((k) => k.rolle === 'ekstrem')!
    expect(ekstrem.navn).toBe('Ekstrem utskillelse')
    expect(ekstrem.punkter.at(-1)!.prosent).toBe(prosentFor(terskel(midt, 'ekstrem')))
  })

  it('gir punktene for denne prøven med motorens korreksjon', () => {
    const s = vurdering(fortolkBeUrinProfiler(inndata(prove(100, '2026-01-01'), prove(80, '2026-01-02'), 0.9), MODELL))
      .sammenligning
    const [punkt] = profilMarginpunkter(MODELL, s, [0.9])
    expect(punkt!.korrigertRatio).toBe(s.korrigertRatio)
  })
})
