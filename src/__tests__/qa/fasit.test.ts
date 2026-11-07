/**
 * P4: de godkjente forløpene regnet uten nettleser (samme vei som verktøysiden,
 * mot de lagrede FEST-uttrekkene og appens faktiske godkjenninger) skal stemme
 * med den håndskrevne fasiten i `fasit.ts`. Nettleserkjøringen
 * (`scripts/verktoy-p0-app.mjs`) kontrollerer skjerm, kopi og utskrift mot den
 * samme fasiten.
 */
import { describe, expect, it } from 'vitest'
import { BRUKERFORLOP, kjorForlop, lesUttrekkene } from './brukerforlop'
import { FASIT, harDosepunkt, kontrollerMotFasit } from './fasit'

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

  it('godtar begge riktige utfall der en låst tilpasning gir standardplanen', () => {
    expect(kontrollerMotFasit('P0-N06', { utfall: 'komplett plan', skjerm: 'x', kopi: 'x' }).filter((a) => a.type === 'klinisk')).toEqual([])
  })

  it('har fasit med kilde for hvert forløp den nevner', () => {
    for (const f of Object.values(FASIT)) expect(f.kilde).toMatch(/docs\/|preparatomtale/)
  })
})
