/**
 * Visualiseringen viser hvilke kurver som er terskler for bruksmønsteret, og
 * hvor denne prøven ligger mot dem — med én sikkerhetsmargin eller alle.
 * Punktene skal stå der fortolkningen leser dem, og få fargen konklusjonen
 * mot forrige prøve gir.
 */
import { describe, expect, it } from 'vitest'
import { THC_MODELL, THC_REGELSETT } from '../../__tests__/hjelp/thcgrunnlag'
import { fortolkThc, korrigertEndring, tomThcInndata, type ThcGrunnlag } from '../thcMotor'
import { marginpunkter, terskler, visningsmarginer } from '../thcPlot'
import { INGEN_SIKKERHETSMARGIN, type ThcRegelsett } from '../thcRegelsett'

const UTEN_INGEN: ThcRegelsett = {
  ...THC_REGELSETT,
  sikkerhetsmarginer: THC_REGELSETT.sikkerhetsmarginer.filter((m) => m.margin !== INGEN_SIKKERHETSMARGIN),
}

function fortolk(forrigeVerdi: string, aktuellVerdi: string, dager: number, ekstra = {}) {
  const dato = (d: number) => new Date(Date.UTC(2026, 1, 1 + d)).toISOString().slice(0, 10)
  const resultat = fortolkThc(
    {
      ...tomThcInndata(THC_REGELSETT),
      forrigeVerdi,
      forrigeDato: dato(0),
      aktuellVerdi,
      aktuellDato: dato(dager),
      ...ekstra,
    },
    THC_MODELL,
  )
  if (resultat.type !== 'kommentar' || !resultat.grunnlag) throw new Error('Tilfellet skal gi et grunnlag.')
  return { konklusjon: resultat.konklusjon, grunnlag: resultat.grunnlag }
}

const grunnlag = (...args: Parameters<typeof fortolk>): ThcGrunnlag => fortolk(...args).grunnlag

describe('tersklene i figuren', () => {
  it('følger bruksmønsteret i regelsettet: nedre, øvre og den som ikke brukes', () => {
    expect(terskler(THC_REGELSETT, true)).toEqual({ gronn: 'ubrukt', gul: 'nedre', rod: 'ovre' })
    expect(terskler(THC_REGELSETT, false)).toEqual({ gronn: 'nedre', gul: 'ovre', rod: 'ubrukt' })
  })
})

describe('marginene figuren viser', () => {
  it('er den valgte, eller alle — med «Ingen (50 %)» lagt til når regelsettet ikke har den', () => {
    expect(visningsmarginer(THC_REGELSETT, 0.9, false)).toEqual([0.9])
    expect(visningsmarginer(THC_REGELSETT, 0.9, true)).toEqual(THC_REGELSETT.sikkerhetsmarginer.map((m) => m.margin))
    expect(visningsmarginer(UTEN_INGEN, 0.9, true)).toEqual([
      INGEN_SIKKERHETSMARGIN,
      ...UTEN_INGEN.sikkerhetsmarginer.map((m) => m.margin),
    ])
  })
})

describe('punktene for denne prøven', () => {
  const tilfeller = [
    ['120', '80', 7],
    ['120', '95', 3],
    ['40', '35', 2],
    ['6,5', '2', 23],
    ['50', '60', 10],
  ] as const

  it('står for den valgte marginen der fortolkningen leser den, med samme konklusjon', () => {
    const utfall = new Set<string>()
    for (const kronisk of [true, false]) {
      for (const { margin } of THC_REGELSETT.sikkerhetsmarginer) {
        for (const [forrige, aktuell, dager] of tilfeller) {
          const { grunnlag: g, konklusjon } = fortolk(forrige, aktuell, dager, { kronisk, sikkerhetsmargin: margin })
          const [punkt] = marginpunkter(THC_REGELSETT, g, [margin])
          expect(punkt!.prosent).toBe(g.korrigertEndring * 100)
          expect(punkt!.utfall).toBe(konklusjon)
          utfall.add(konklusjon)
        }
      }
    }
    // Tilfellene dekker alle tre fargene.
    expect([...utfall].sort()).toEqual(['ikke_nodvendigvis', 'nytt_inntak', 'vanskelig'])
  })

  it('bruker den målte endringen for «Ingen» når regelsettet ikke har den', () => {
    const g = grunnlag('120', '80', 7)
    const [ingen] = marginpunkter(UTEN_INGEN, g, [INGEN_SIKKERHETSMARGIN])
    expect(ingen!.prosent).toBe(g.maltEndring * 100)
    // Og det er det samme som regelsettet med «Ingen» gir.
    expect(marginpunkter(THC_REGELSETT, g, [INGEN_SIKKERHETSMARGIN])[0]!.prosent).toBeCloseTo(g.maltEndring * 100, 12)
  })

  it('er grønt på den nedre terskelen, gult rett over den, og rødt rett over den øvre', () => {
    const g = grunnlag('120', '80', 7)
    const endring = korrigertEndring(THC_REGELSETT, g.forrige, g.aktuell, g.sikkerhetsmargin)
    const under = (v: number) => v - Math.max(Math.abs(v) * Number.EPSILON, Number.MIN_VALUE)
    const med = (gul: number, rod: number) =>
      marginpunkter(THC_REGELSETT, { ...g, kronisk: true, forventet: { gronn: -1, gul, rod } }, [g.sikkerhetsmargin])[0]!
        .utfall
    // Ved kronisk bruk er den gule kurven nedre og den røde øvre terskel, og
    // grensene er strengt større enn, som i konklusjonen.
    expect(med(endring, 10)).toBe('ikke_nodvendigvis')
    expect(med(under(endring), 10)).toBe('vanskelig')
    expect(med(under(endring), endring)).toBe('vanskelig')
    expect(med(under(endring), under(endring))).toBe('nytt_inntak')
  })
})
