import { describe, expect, it } from 'vitest'
import {
  fortolkThc,
  lagThcModell,
  mildereVedHoyereMargin,
  THC_KONKLUSJONER,
  tomThcInndata,
  tomThcProve,
  type ThcInndata,
  type ThcModell,
} from '../thcMotor'
import { normalkvantil, type ThcRegelsett } from '../thcRegelsett'
import { konklusjonsnavn, marginliste, medMargin } from '../thcVisning'
import { THC_MODELL, THC_REGELSETT, THC_TEKSTER } from '../../__tests__/hjelp/thcgrunnlag'

/**
 * Banneret om at en høyere sikkerhetsmargin gir en mildere konklusjon. Peders
 * bestilling 05.11.2026: alle marginer over den valgte prøves, hvert mildere
 * utfall vises, og det sies aldri at en lavere margin gir en strengere
 * konklusjon. Alle tall er syntetiske.
 */

const R = THC_REGELSETT

/** Kronisk, 50 → 40 på tre døgn: hver publiserte margin gir sin konklusjon (eksempelet i marginforklaringen). */
function eksempel(margin: number, endring: Partial<ThcInndata> = {}): ThcInndata {
  return {
    ...tomThcInndata(R),
    forrigeVerdi: '50',
    forrigeDato: '2026-07-04',
    aktuellVerdi: '40',
    aktuellDato: '2026-07-07',
    sikkerhetsmargin: margin,
    ...endring,
  }
}

function lagModell(regler: ThcRegelsett): ThcModell {
  const m = lagThcModell(regler, THC_TEKSTER)
  if (!m.ok) throw new Error(m.feil.join('\n'))
  return m.modell
}

/** Regelsettet med en ekstra margin, med z regnet av marginen slik redigeringen gjør. */
function medEkstraMargin(margin: number): ThcModell {
  const sikkerhetsmarginer = [...R.sikkerhetsmarginer, { margin, z: normalkvantil(1 - margin) }].sort(
    (a, b) => a.margin - b.margin,
  )
  return lagModell({ ...R, sikkerhetsmarginer })
}

const konklusjon = (inn: ThcInndata, modell: ThcModell = THC_MODELL) => {
  const r = fortolkThc(inn, modell)
  if (r.type !== 'kommentar') throw new Error('Tilfellet skal gi en kommentar.')
  return r.konklusjon
}

describe('mildere konklusjon med høyere sikkerhetsmargin', () => {
  it('forutsetter at eksempelet gir tre ulike konklusjoner med de publiserte marginene', () => {
    expect(R.sikkerhetsmarginer.map((m) => m.margin)).toEqual([0.5, 0.9, 0.99])
    expect([0.5, 0.9, 0.99].map((m) => konklusjon(eksempel(m)))).toEqual([
      'nytt_inntak',
      'vanskelig',
      'ikke_nodvendigvis',
    ])
  })

  it('viser hvert mildere utfall, med den laveste marginen som gir det, i stigende margin', () => {
    expect(mildereVedHoyereMargin(eksempel(0.5), THC_MODELL)).toEqual([
      { marginer: [0.9], konklusjon: 'vanskelig', samlet: null },
      { marginer: [0.99], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
    expect(mildereVedHoyereMargin(eksempel(0.9), THC_MODELL)).toEqual([
      { marginer: [0.99], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
  })

  it('sier aldri noe om lavere marginer, og ingenting på den høyeste marginen', () => {
    // 99 % gir den mildeste konklusjonen; at 90 % og 50 % gir strengere, skal ikke vises.
    expect(mildereVedHoyereMargin(eksempel(0.99), THC_MODELL)).toEqual([])
  })

  it('viser ingenting når de høyere marginene gir samme konklusjon', () => {
    // Stor nedgang: ikke nødvendigvis nytt med alle marginer.
    const nedgang = eksempel(0.5, { aktuellVerdi: '5' })
    expect(R.sikkerhetsmarginer.map(({ margin }) => konklusjon({ ...nedgang, sikkerhetsmargin: margin }))).toEqual(
      ['ikke_nodvendigvis', 'ikke_nodvendigvis', 'ikke_nodvendigvis'],
    )
    expect(mildereVedHoyereMargin(nedgang, THC_MODELL)).toEqual([])
    // Stor økning: nytt inntak med alle marginer.
    const okning = eksempel(0.5, { aktuellVerdi: '200' })
    expect(R.sikkerhetsmarginer.map(({ margin }) => konklusjon({ ...okning, sikkerhetsmargin: margin }))).toEqual([
      'nytt_inntak',
      'nytt_inntak',
      'nytt_inntak',
    ])
    expect(mildereVedHoyereMargin(okning, THC_MODELL)).toEqual([])
  })

  it('prøver alle marginene i regelsettet, og samler marginene som gir samme utfall', () => {
    const modell = medEkstraMargin(0.999)
    expect(mildereVedHoyereMargin(eksempel(0.9), modell)).toEqual([
      { marginer: [0.99, 0.999], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
    expect(mildereVedHoyereMargin(eksempel(0.5), modell)).toEqual([
      { marginer: [0.9], konklusjon: 'vanskelig', samlet: null },
      { marginer: [0.99, 0.999], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
    // En ny margin mellom de andre prøves også.
    const mellom = medEkstraMargin(0.95)
    const utfall = mildereVedHoyereMargin(eksempel(0.5), mellom)
    expect(utfall.flatMap((u) => u.marginer)).toEqual(
      [0.9, 0.95, 0.99].filter((m) => konklusjon(eksempel(m), mellom) !== 'nytt_inntak'),
    )
  })

  it('følger grensen der konklusjonen skifter, helt ned til siste siffer', () => {
    // Finner IRCAK der 90 % går fra «kan ikke fastslås» til nytt inntak.
    const ved = (verdi: number) => konklusjon(eksempel(0.9, { aktuellVerdi: String(verdi).replace('.', ',') }))
    let lav = 40
    let hoy = 200
    for (let i = 0; i < 60; i++) {
      const midt = (lav + hoy) / 2
      if (ved(midt) === 'nytt_inntak') hoy = midt
      else lav = midt
    }
    const over = eksempel(0.9, { aktuellVerdi: String(hoy).replace('.', ',') })
    const under = eksempel(0.9, { aktuellVerdi: String(lav).replace('.', ',') })
    expect(konklusjon(over)).toBe('nytt_inntak')
    expect(konklusjon(under)).toBe('vanskelig')
    // Rett over grensen gir 99 % en mildere konklusjon og vises.
    const overUtfall = mildereVedHoyereMargin(over, THC_MODELL)
    expect(overUtfall).toHaveLength(1)
    expect(overUtfall[0]!.marginer).toEqual([0.99])
    expect(overUtfall[0]!.konklusjon).toBe(konklusjon({ ...over, sikkerhetsmargin: 0.99 }))
    // Rett under er 99 % bare med om den gir noe mildere enn «kan ikke fastslås».
    const underUtfall = mildereVedHoyereMargin(under, THC_MODELL)
    const nittini = konklusjon({ ...under, sikkerhetsmargin: 0.99 })
    expect(underUtfall).toEqual(
      nittini === 'ikke_nodvendigvis' ? [{ marginer: [0.99], konklusjon: nittini, samlet: null }] : [],
    )
  })

  it('stemmer med fortolkningen for hver margin over et rutenett av prøver', () => {
    const modell = medEkstraMargin(0.999)
    const marginer = modell.regler.sikkerhetsmarginer.map((m) => m.margin)
    const trinn = (k: string) => THC_KONKLUSJONER.indexOf(k as (typeof THC_KONKLUSJONER)[number])
    let vist = 0
    for (const kronisk of [true, false]) {
      for (const aktuell of [3, 8, 15, 25, 35, 45, 60, 90]) {
        for (const dager of [1, 3, 5, 9, 15]) {
          for (const margin of marginer) {
            const inn = eksempel(margin, {
              kronisk,
              aktuellVerdi: String(aktuell),
              aktuellDato: `2026-07-${String(4 + dager).padStart(2, '0')}`,
            })
            const naa = trinn(konklusjon(inn, modell))
            const utfall = mildereVedHoyereMargin(inn, modell)
            const listet = utfall.flatMap((u) => u.marginer)
            // Akkurat de høyere marginene som gir en mildere konklusjon, og ingen lavere.
            const forventet = marginer.filter((m) => m > margin && trinn(konklusjon({ ...inn, sikkerhetsmargin: m }, modell)) < naa)
            expect(listet).toEqual(forventet)
            for (const u of utfall) {
              for (const m of u.marginer) expect(konklusjon({ ...inn, sikkerhetsmargin: m }, modell)).toBe(u.konklusjon)
            }
            // Utfallene er ulike.
            expect(new Set(utfall.map((u) => u.konklusjon)).size).toBe(utfall.length)
            vist += utfall.length
          }
        }
      }
    }
    expect(vist).toBeGreaterThan(0)
  })

  it('viser ingenting uten en vurdering mot forrige prøve', () => {
    // Ingen tidligere prøve.
    expect(mildereVedHoyereMargin(eksempel(0.5, { ingenTidligere: true }), THC_MODELL)).toEqual([])
    // IRCAK 0 i forrige prøve: nytt inntak uansett margin.
    expect(mildereVedHoyereMargin(eksempel(0.5, { forrigeVerdi: '0' }), THC_MODELL)).toEqual([])
    // Kort tid mellom prøvene, huket av.
    const kort = eksempel(0.5, { aktuellDato: '2026-07-05', kortTid: true })
    expect(fortolkThc(kort, THC_MODELL)).toMatchObject({ kommentarnokkel: 'kort_tid' })
    expect(mildereVedHoyereMargin(kort, THC_MODELL)).toEqual([])
    // Noe mangler.
    expect(mildereVedHoyereMargin(eksempel(0.5, { aktuellVerdi: '' }), THC_MODELL)).toEqual([])
    // En margin regelsettet ikke har.
    expect(mildereVedHoyereMargin(eksempel(0.8), THC_MODELL)).toEqual([])
  })

  it('regner nytt inntak etter en enda tidligere prøve som mildere enn nytt inntak etter forrige prøve', () => {
    const tidligere = [{ ...tomThcProve(), verdi: '0', dato: '2026-06-01' }]
    const inn = eksempel(0.5, { samletVurdering: true, tidligere })
    expect(fortolkThc({ ...inn, sikkerhetsmargin: 0.9 }, THC_MODELL)).toMatchObject({
      kommentarnokkel: 'samlet_vurdering',
    })
    const utfall = mildereVedHoyereMargin(inn, THC_MODELL)
    expect(utfall).toEqual([
      { marginer: [0.9], konklusjon: 'vanskelig', samlet: { dato: '01.06.2026', ircak: 0, dager: 36 } },
      { marginer: [0.99], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
    expect(konklusjonsnavn(utfall[0]!.konklusjon, utfall[0]!.samlet)).toBe(
      'Nytt inntak etter tidligere prøve 01.06.2026',
    )
    // Med 90 % står den samlede vurderingen; 99 % gir fortsatt noe mildere.
    expect(mildereVedHoyereMargin({ ...inn, sikkerhetsmargin: 0.9 }, THC_MODELL)).toEqual([
      { marginer: [0.99], konklusjon: 'ikke_nodvendigvis', samlet: null },
    ])
  })

  it('skriver marginene og konklusjonene slik banneret viser dem', () => {
    expect(medMargin(0.5)).toBe('Uten sikkerhetsmargin')
    expect(medMargin(0.9)).toBe('Med 90 % sikkerhetsmargin')
    expect(marginliste([0.99])).toBe('99 %')
    expect(marginliste([0.99, 0.999])).toBe('99 % eller 99,9 %')
    expect(marginliste([0.95, 0.99, 0.999])).toBe('95 %, 99 % eller 99,9 %')
    expect(konklusjonsnavn('vanskelig', null)).toBe('Kan ikke fastslås')
    expect(konklusjonsnavn('ikke_nodvendigvis', null)).toBe('Ikke nødvendigvis nytt')
  })
})
