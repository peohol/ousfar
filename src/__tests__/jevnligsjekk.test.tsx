// @vitest-environment jsdom
/**
 * Den jevnlige sjekken (`useJevnligSjekk`, #504): ved oppstart, når fanen
 * blir synlig igjen eller får fokus, og jevnlig. Et fanebytte, der nettleseren
 * sender både `visibilitychange` og `focus`, gir én sjekk.
 */
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SAMME_FANEBYTTE_MS, useJevnligSjekk } from '../hooks/useJevnligSjekk'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const synlig = () => document.dispatchEvent(new Event('visibilitychange'))
const fokus = () => window.dispatchEvent(new Event('focus'))

describe('useJevnligSjekk', () => {
  it('sjekker ved oppstart, og én gang per fanebytte, uansett rekkefølgen på hendelsene', () => {
    const sjekk = vi.fn()
    renderHook(() => useJevnligSjekk(sjekk))
    expect(sjekk).toHaveBeenCalledTimes(1)
    synlig()
    fokus()
    expect(sjekk).toHaveBeenCalledTimes(2)
    vi.advanceTimersByTime(SAMME_FANEBYTTE_MS)
    fokus()
    synlig()
    expect(sjekk).toHaveBeenCalledTimes(3)
  })

  it('sjekker hver gang vinduet får fokus, også rett etter oppstart og rett etter hverandre', () => {
    const sjekk = vi.fn()
    renderHook(() => useJevnligSjekk(sjekk))
    fokus()
    fokus()
    expect(sjekk).toHaveBeenCalledTimes(3)
  })

  it('sjekker ved fokus som kommer lenge etter at fanen ble synlig', () => {
    const sjekk = vi.fn()
    renderHook(() => useJevnligSjekk(sjekk))
    synlig()
    vi.advanceTimersByTime(SAMME_FANEBYTTE_MS)
    fokus()
    expect(sjekk).toHaveBeenCalledTimes(3)
  })

  it('sjekker jevnlig mens fanen er synlig', () => {
    const sjekk = vi.fn()
    renderHook(() => useJevnligSjekk(sjekk, 5000))
    vi.advanceTimersByTime(5000)
    expect(sjekk).toHaveBeenCalledTimes(2)
  })

  it('slutter å sjekke når komponenten forsvinner', () => {
    const sjekk = vi.fn()
    const { unmount } = renderHook(() => useJevnligSjekk(sjekk, 5000))
    unmount()
    vi.advanceTimersByTime(20_000)
    synlig()
    fokus()
    expect(sjekk).toHaveBeenCalledTimes(1)
  })
})
