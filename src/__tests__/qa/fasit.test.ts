/**
 * P4: de godkjente forløpene regnet uten nettleser (samme vei som verktøysiden,
 * mot de lagrede FEST-uttrekkene og appens faktiske godkjenninger) skal stemme
 * med den håndskrevne fasiten i `fasit.ts`. Nettleserkjøringen
 * (`scripts/verktoy-p0-app.mjs`) kontrollerer skjerm, kopi og utskrift mot den
 * samme fasiten.
 */
import { describe, expect, it } from 'vitest'
import { BRUKERFORLOP, kjorForlop, lesUttrekkene } from './brukerforlop'
import { FASIT, forlopsavvik, harDosepunkt, kontrollerMotFasit, vedlikeholdsavvik } from './fasit'

const uttrekkene = lesUttrekkene()

/** P0-forløpet og brukerforløpet med de samme inndataene. */
const SAMME: [string, string][] = [
  ['P0-A01', 'K0-01'],
  ['P0-A02', 'H-03'],
  ['P0-A03', 'H-30'],
  ['P0-A04', 'H-31'],
  ['P0-B01', 'H-15'],
  ['P0-B03', 'H-45'],
  ['P0-C01', 'H-40'],
  ['P0-C03', 'K0-08'],
  ['P0-C04', 'K0-09'],
  ['P0-C05', 'H-42'],
  ['P0-C06', 'H-24'],
  ['P0-D01', 'K0-12'],
  ['P0-D02', 'K0-11'],
]

describe('P4 fasit mot motoren', () => {
  it.each(SAMME)('%s (%s): komplett plan med fasitens doser og sluttmål', (p0, h) => {
    const r = kjorForlop(BRUKERFORLOP.find((f) => f.id === h)!, uttrekkene)
    const tekst = r.vist.join('\n')
    expect(r.klasse).toBe('komplett')
    expect(kontrollerMotFasit(p0, { utfall: 'komplett plan', skjerm: tekst, kopi: tekst }).filter((a) => a.type === 'klinisk')).toEqual([])
  })
})

describe('P4 kontrollen av fasiten', () => {
  const linjer = ['Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg', 'Fra dag 197: Escitalopram peroralt: Seponert'].join('\n')

  it('finner dosepunktet bare ved riktig dag og dose', () => {
    expect(harDosepunkt(linjer, { fra: 1, til: 28, legemiddel: 'Escitalopram', dose: '8 mg' })).toBe(true)
    expect(harDosepunkt(linjer, { fra: 1, til: 28, legemiddel: 'Escitalopram', dose: '18 mg' })).toBe(false)
    expect(harDosepunkt(linjer, { fra: 1, til: 29, legemiddel: 'Escitalopram', dose: '8 mg' })).toBe(false)
    expect(harDosepunkt(linjer, { fra: 1, til: 28, legemiddel: 'Sertralin', dose: '8 mg' })).toBe(false)
  })

  it('melder en dose som avviker fra fasiten som klinisk avvik', () => {
    const feil = linjer.replace('8 mg = 8', '7 mg = 7')
    expect(kontrollerMotFasit('P0-A01', { utfall: 'komplett plan', skjerm: feil, kopi: linjer }).map((a) => a.hva)).toContain('Skjermen mangler Escitalopram 8 mg dag 1–28.')
  })

  it('melder generiske stopp, «Prøv igjen senere» og stopp uten grunn som bruksavvik', () => {
    const a = kontrollerMotFasit('P0-N01', { utfall: 'stopp', skjerm: 'Ingen plan\nDa gjelder ikke regelen. Prøv igjen senere.', kopi: '' })
    expect(a.map((x) => x.type)).toEqual(['bruk', 'bruk', 'bruk'])
    expect(kontrollerMotFasit('P0-N01', { utfall: 'stopp', skjerm: 'Ingen plan\nDen godkjente planen gjelder bare kort behandlingstid.', kopi: '' })).toEqual([])
  })

  it('godtar begge riktige utfall der en låst tilpasning gir standardplanen, men bare med standardplanens doser', () => {
    const standard = kjorForlop(BRUKERFORLOP.find((f) => f.id === 'K0-01')!, uttrekkene).vist.join('\n')
    const klinisk = (o: Parameters<typeof kontrollerMotFasit>[1]) => kontrollerMotFasit('P0-N06', o).filter((a) => a.type === 'klinisk')
    expect(klinisk({ utfall: 'komplett plan', skjerm: standard, kopi: standard })).toEqual([])
    expect(klinisk({ utfall: 'komplett plan', skjerm: 'x', kopi: 'x' }).length).toBeGreaterThan(0)
    expect(kontrollerMotFasit('P0-N06', { utfall: 'stopp', skjerm: 'Ingen plan\nBare 20 % per trinn er godkjent.', kopi: '' }).map((a) => a.hva)).toEqual([
      'Stoppet sier ikke hvilket forhold som stopper (venter 25 %).',
    ])
  })

  describe('hele doseforløpet, dag for dag', () => {
    const b01 = kjorForlop(BRUKERFORLOP.find((f) => f.id === 'H-15')!, uttrekkene).vist.join('\n')
    const avvik = (kopi: string) => forlopsavvik(kopi, FASIT['P0-B01']!.doser!)
    const CIT = 'Dag 1–14: Citalopram peroralt: 10 mg = 1 tablett à 10 mg'
    const SER = 'Fra dag 29: Sertralin peroralt: 100 mg = 1 tablett à 100 mg'

    it('godtar motorens plan og en annen oppdeling av det samme intervallet', () => {
      expect(avvik(b01)).toEqual([])
      expect(avvik(b01.replace(CIT, 'Dag 1–7: Citalopram peroralt: 10 mg\nDag 8–14: Citalopram peroralt: 10 mg'))).toEqual([])
      expect(avvik(b01.replace(SER, 'Dag 29–40: Sertralin peroralt: 100 mg\nFra dag 41: Sertralin peroralt: 100 mg'))).toEqual([])
    })

    it('melder overlapp: sertralin før dag 15', () => {
      expect(avvik(b01.replace(CIT, `${CIT}; Sertralin peroralt: 50 mg = 1 tablett à 50 mg`))).toEqual(['Sertralin dag 1–14: 50 mg, fasiten sier ingen dose'])
    })

    it('melder citalopram som fortsetter etter dag 14', () => {
      expect(avvik(b01.replace('Citalopram peroralt: Seponert;', 'Citalopram peroralt: 10 mg = 1 tablett à 10 mg;'))).toEqual(['Citalopram dag 15–28: 10 mg, fasiten sier ingen dose'])
    })

    it('melder et ekstra trinn og et legemiddel fasiten ikke har', () => {
      expect(avvik(`${b01}\nFra dag 60: Sertralin peroralt: 150 mg; Mirtazapin peroralt: 15 mg`)).toEqual([
        'Sertralin fra dag 60: 100 mg + 150 mg, fasiten sier 100 mg',
        'Mirtazapin peroralt fra dag 60: 15 mg, fasiten sier ingen dose',
      ])
    })

    it('melder et hull inne i et doseintervall', () => {
      expect(avvik(b01.replace(CIT, 'Dag 1–3: Citalopram peroralt: 10 mg\nDag 12–14: Citalopram peroralt: 10 mg'))).toEqual(['Citalopram dag 4–11: ingen dose, fasiten sier 10 mg'])
    })

    it('melder en avkortet vedlikeholdsperiode', () => {
      expect(avvik(b01.replace(SER, 'Dag 29: Sertralin peroralt: 100 mg'))).toEqual(['Sertralin fra dag 30: ingen dose, fasiten sier 100 mg'])
      expect(avvik(b01.replace(SER, 'Dag 29–90: Sertralin peroralt: 100 mg'))).toEqual(['Sertralin fra dag 91: ingen dose, fasiten sier 100 mg'])
    })

    it('melder feil dose og et legemiddel som seponeres for tidlig', () => {
      expect(avvik(b01.replace('Dag 15–28: Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg', 'Dag 15–28: Citalopram peroralt: Seponert; Sertralin peroralt: 75 mg'))).toEqual([
        'Sertralin dag 15–28: 75 mg, fasiten sier 50 mg',
      ])
      expect(avvik(b01.replace(CIT, 'Dag 1–14: Citalopram peroralt: Seponert'))).toEqual(['Citalopram dag 1–14: ingen dose, fasiten sier 10 mg'])
    })

    it('krever at et legemiddel som fortsetter uendret, har samme dose gjennom hele planen', () => {
      const d01 = kjorForlop(BRUKERFORLOP.find((f) => f.id === 'K0-12')!, uttrekkene).vist.join('\n')
      expect(forlopsavvik(d01, FASIT['P0-D01']!.doser!)).toEqual([])
      expect(forlopsavvik(d01.replace('Fra dag 36: Valproat peroralt: 1000 mg', 'Fra dag 36: Valproat peroralt: 1500 mg'), FASIT['P0-D01']!.doser!)).toEqual([
        'Valproat fra dag 36: 1500 mg natriumvalproat, fasiten sier 1000 mg natriumvalproat',
      ])
    })

    it('holder skjermen, kopien og utskriften hver for seg mot fasiten', () => {
      const hull = b01.replace(CIT, 'Dag 1–3: Citalopram peroralt: 10 mg')
      const o = { utfall: 'komplett plan' as const, skjerm: b01, kopi: b01, utskrift: b01, skjermrader: b01, utskriftsrader: b01 }
      expect(kontrollerMotFasit('P0-B01', o)).toEqual([])
      expect(kontrollerMotFasit('P0-B01', { ...o, skjermrader: hull }).map((a) => a.hva)).toEqual(['Skjermen: Citalopram dag 4–14: ingen dose, fasiten sier 10 mg.'])
      expect(kontrollerMotFasit('P0-B01', { ...o, kopi: hull }).map((a) => a.hva)).toEqual(['Kopien: Citalopram dag 4–14: ingen dose, fasiten sier 10 mg.'])
      expect(kontrollerMotFasit('P0-B01', { ...o, utskriftsrader: hull }).map((a) => a.hva)).toEqual(['Utskriften: Citalopram dag 4–14: ingen dose, fasiten sier 10 mg.'])
    })

    it('leser skjermens injeksjonsrader («Injeksjon 400 mg»)', () => {
      const rader = ['Dag 1–14: Aripiprazol peroralt: 15 mg', 'Dag 1: Aripiprazol depotinjeksjon: Injeksjon 400 mg', 'Fra dag 15: Aripiprazol peroralt: Seponert'].join('\n')
      expect(forlopsavvik(rader, FASIT['P0-C04']!.doser!)).toEqual([])
      expect(forlopsavvik(rader.replace('Injeksjon 400 mg', 'Injeksjon 300 mg'), FASIT['P0-C04']!.doser!)).toEqual(['Aripiprazol depotinjeksjon dag 1: 300 mg, fasiten sier 400 mg'])
    })
  })

  describe('vedlikeholdsinjeksjonene i depotforløpene', () => {
    const plan = (id: string) => kjorForlop(BRUKERFORLOP.find((f) => f.id === id)!, uttrekkene).vist.join('\n')
    const xeplion = plan('H-42')
    const avvik = (tekst: string, id = 'P0-C05') => vedlikeholdsavvik(tekst, FASIT[id]!.vedlikehold!)
    const VEDLIKEHOLD = 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg'

    it('godtar motorens planer for Abilify Maintena og Xeplion', () => {
      expect(avvik(xeplion)).toEqual([])
      expect(avvik(plan('H-24'), 'P0-C06')).toEqual([])
      expect(avvik(plan('K0-09'), 'P0-C04')).toEqual([])
    })

    it('melder en første vedlikeholdsinjeksjon som er flyttet, også når oppstarten og den månedlige dosen er riktige', () => {
      const flyttet = xeplion.replace(VEDLIKEHOLD, 'Hver måned fra 1 måned etter dag 1: Paliperidon depotinjeksjon 75 mg')
      expect(forlopsavvik(flyttet, FASIT['P0-C05']!.doser!)).toEqual([])
      expect(avvik(flyttet)).toEqual([
        'mangler Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8',
        'har Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 1, som fasiten ikke har',
      ])
      expect(kontrollerMotFasit('P0-C05', { utfall: 'komplett plan', skjerm: xeplion, kopi: flyttet }).map((a) => a.hva)).toEqual([
        'Kopien: mangler Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8.',
        'Kopien: har Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 1, som fasiten ikke har.',
      ])
    })

    it('melder feil dose, et annet intervall, et vindu som mangler og en ekstra vedlikeholdsrad', () => {
      expect(avvik(xeplion.replace(VEDLIKEHOLD, 'Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 100 mg'))).toEqual([
        'mangler Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8',
        'har Paliperidon depotinjeksjon 100 mg hver måned fra 1 måned etter dag 8, som fasiten ikke har',
      ])
      expect(avvik(xeplion.replace('Hver måned fra 1 måned etter dag 8', 'Hver 2. måned fra 2 måneder etter dag 8'))).toEqual([
        'mangler Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8',
      ])
      expect(avvik(xeplion.replace('±7 dager, ', ''))).toEqual(['Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8 mangler vinduet (±\\s?7 dager)'])
      expect(avvik(`${xeplion}\n${VEDLIKEHOLD} = 1 injeksjon à 75 mg (±7 dager)`)).toEqual(['har Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8, som fasiten ikke har'])
    })

    it('leser vedlikeholdsraden slik nettleserkjøringen leser den fra skjermen og utskriften', () => {
      const skjerm =
        'Dag 8: Paliperidon depotinjeksjon: Injeksjon 100 mg (±4 dager, deltoideus)\nHver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon: Injeksjon 75 mg (±7 dager, deltoideus eller setemuskel)'
      expect(avvik(skjerm)).toEqual([])
      expect(avvik(skjerm.replace(' (±7 dager, deltoideus eller setemuskel)', ''))).toEqual(['Paliperidon depotinjeksjon 75 mg hver måned fra 1 måned etter dag 8 mangler vinduet (±\\s?7 dager)'])
    })
  })

  it('har fasit med kilde for hvert forløp den nevner', () => {
    for (const f of Object.values(FASIT)) expect(f.kilde).toMatch(/docs\/|preparatomtale/)
  })
})
