// @vitest-environment jsdom
/**
 * Chatmenyen og diskusjonsmenyen samtidig (D0, flyt.md §3; `useKantmeny`):
 * begge kan stå åpne når siden mellom dem får plass; ellers vinner den som
 * ble åpnet sist, og den andre lukkes. Det samme når vinduet blir smalere.
 * Testmiljøet har ingen CSS, så plassen settes her: hvor bredt det som trengs
 * er, og hvor bredt vinduet er.
 */
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKantmeny, type Kantmeny } from '../hooks/useKantmeny'

const BEHOV = 1200
let vindu = 1600

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(() => ({ width: BEHOV }) as DOMRect)
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockImplementation(() => vindu)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vindu = 1600
})

function meny(navn: Kantmeny, apen: boolean) {
  const lukk = vi.fn()
  const krok = renderHook(({ apen: a }) => useKantmeny(navn, a, lukk), { initialProps: { apen } })
  return { lukk, apne: () => krok.rerender({ apen: true }), lukkHer: () => krok.rerender({ apen: false }) }
}

describe('chat og diskusjoner samtidig', () => {
  it('lar begge stå når siden får plass', () => {
    const diskusjoner = meny('diskusjoner', true)
    const chat = meny('chat', true)
    expect(diskusjoner.lukk).not.toHaveBeenCalled()
    expect(chat.lukk).not.toHaveBeenCalled()
  })

  it('lukker den som sto åpen fra før når det ikke er plass', () => {
    vindu = 1000
    const diskusjoner = meny('diskusjoner', true)
    const chat = meny('chat', false)
    chat.apne()
    expect(diskusjoner.lukk).toHaveBeenCalledTimes(1)
    expect(chat.lukk).not.toHaveBeenCalled()
  })

  it('lukker den eldste når vinduet blir for smalt med begge åpne', () => {
    const chat = meny('chat', true)
    const diskusjoner = meny('diskusjoner', true)
    vindu = 1000
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(chat.lukk).toHaveBeenCalledTimes(1)
    expect(diskusjoner.lukk).not.toHaveBeenCalled()
  })

  it('lar den ene stå alene uansett bredde', () => {
    vindu = 500
    const chat = meny('chat', true)
    act(() => void window.dispatchEvent(new Event('resize')))
    expect(chat.lukk).not.toHaveBeenCalled()
  })
})
