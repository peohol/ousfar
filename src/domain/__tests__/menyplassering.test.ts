import { describe, expect, it } from 'vitest'
import { MENYKANT, MENYLUFT, plasserMeny } from '../menyplassering'
import type { Rute, Storrelse } from '../tipsplassering'

const VINDU: Storrelse = { bredde: 1200, hoyde: 800 }
const MENY: Storrelse = { bredde: 300, hoyde: 200 }

/** En rund knapp på 32 × 32 med øvre venstre hjørne der man vil ha det. */
const knapp = (venstre: number, topp: number): Rute => ({ venstre, topp, bredde: 32, hoyde: 32 })

describe('plasserMeny', () => {
  it('henger under knappen, i flukt med høyre kant', () => {
    const p = plasserMeny(knapp(600, 100), MENY, VINDU)
    expect(p.side).toBe('under')
    expect(p.topp).toBe(100 + 32 + MENYLUFT)
    expect(p.venstre + MENY.bredde).toBe(632)
    expect(p.maksHoyde).toBeGreaterThanOrEqual(MENY.hoyde)
  })

  it('flukter med venstre kant når den åpner fra et navn', () => {
    const p = plasserMeny(knapp(600, 100), MENY, VINDU, 'start')
    expect(p.venstre).toBe(600)
  })

  it('åpner seg over knappen når det ikke er plass under, som fra dokken eller nederst i en chat', () => {
    const p = plasserMeny(knapp(600, 740), MENY, VINDU)
    expect(p.side).toBe('over')
    expect(p.topp + MENY.hoyde).toBe(740 - MENYLUFT)
  })

  it('blir under når det er like trangt begge steder, men under har mest plass', () => {
    const p = plasserMeny(knapp(600, 300), { bredde: 300, hoyde: 900 }, VINDU)
    expect(p.side).toBe('under')
    expect(p.maksHoyde).toBe(800 - 332 - MENYLUFT - MENYKANT)
  })

  it('får en makshøyde som holder den inne i vinduet når den er for høy for begge sider', () => {
    const p = plasserMeny(knapp(600, 600), { bredde: 300, hoyde: 900 }, VINDU)
    expect(p.side).toBe('over')
    expect(p.maksHoyde).toBe(600 - MENYLUFT - MENYKANT)
    expect(p.topp).toBe(MENYKANT)
  })

  it('skyves inn fra venstre kant når knappen står helt til venstre', () => {
    const p = plasserMeny(knapp(10, 100), MENY, VINDU)
    expect(p.venstre).toBe(MENYKANT)
  })

  it('skyves inn fra høyre kant når en venstrejustert meny ville gått ut', () => {
    const p = plasserMeny(knapp(1150, 100), MENY, VINDU, 'start')
    expect(p.venstre + MENY.bredde).toBe(VINDU.bredde - MENYKANT)
  })

  it('legger seg mot venstre kant når menyen er bredere enn vinduet', () => {
    const p = plasserMeny(knapp(100, 100), { bredde: 400, hoyde: 100 }, { bredde: 320, hoyde: 600 })
    expect(p.venstre).toBe(MENYKANT)
  })
})
