/**
 * Merkene på aksene i kurvefigurene for benzoylekgonin i urin: alltid en
 * begrenset liste, eller ingen når aksen ikke kan representeres.
 */
import { describe, expect, it } from 'vitest'
import { aksemerker, MAKS_AKSEMERKER, penYAkse } from '../figurakser'

describe('aksemerker', () => {
  it('gir merkene fra bunnen til og med toppen', () => {
    expect(aksemerker(-100, 20, 20)).toEqual([-100, -80, -60, -40, -20, 0, 20])
    expect(aksemerker(0, 3, 1)).toEqual([0, 1, 2, 3])
    expect(aksemerker(0, 0, 1)).toEqual([0])
  })

  it('tåler at toppen ligger litt under et helt trinn på grunn av avrunding', () => {
    expect(aksemerker(0, 0.3 - 1e-12, 0.1)).toHaveLength(4)
  })

  it('gir ingen merker for en akse som ikke kan representeres', () => {
    expect(aksemerker(-100, Infinity, 2e307)).toBeNull()
    expect(aksemerker(-100, 100, Infinity)).toBeNull()
    expect(aksemerker(Number.NaN, 100, 10)).toBeNull()
    expect(aksemerker(0, 10, 0)).toBeNull()
    expect(aksemerker(0, 10, -1)).toBeNull()
    expect(aksemerker(10, 0, 1)).toBeNull()
    expect(aksemerker(0, MAKS_AKSEMERKER, 1)).toBeNull()
    expect(aksemerker(0, MAKS_AKSEMERKER - 1, 1)).toHaveLength(MAKS_AKSEMERKER)
  })

  it('avviser y-aksen når toppen rundes opp utenfor flyttallene', () => {
    // Endelig største verdi, men 9 · 2e307 er ∞.
    const y = penYAkse(-100, 1.75e308)
    expect(y.yTopp).toBe(Infinity)
    expect(aksemerker(y.yBunn, y.yTopp, y.ySteg)).toBeNull()
  })
})
