/**
 * Lyttingen på dørklokken for diskusjonene (`src/diskusjoner/klokke.ts`,
 * docs/diskusjoner.md, «Sanntiden»), mot en falsk kanal og et falskt dokument.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Dorklokkevalg } from '../gruppechat/dorklokke'
import { gjelderTraad, lyttPaDiskusjoner, type Diskusjonsendring } from '../diskusjoner/klokke'

function oppsett() {
  let valg: Dorklokkevalg | null = null
  const stoppet = vi.fn()
  const lyttere = new Set<() => void>()
  const dokument = {
    visibilityState: 'visible' as DocumentVisibilityState,
    addEventListener: (_: string, f: () => void) => void lyttere.add(f),
    removeEventListener: (_: string, f: () => void) => void lyttere.delete(f),
  }
  const endringer: Diskusjonsendring[] = []
  const status: boolean[] = []
  const klar = vi.fn()
  const stopp = lyttPaDiskusjoner(
    (side, v) => {
      expect(side).toBe('stoff:litium')
      valg = v
      return stoppet
    },
    'stoff:litium',
    { vedEndring: (e) => endringer.push(e), vedKlar: klar, vedStatus: (s) => status.push(s), samleMs: 100, ventPaaKanalenMs: 1000, dokument: dokument as unknown as Document },
  )
  return {
    endringer,
    status,
    klar,
    stopp,
    stoppet,
    lyttere,
    dokument,
    ring: (diskusjon: unknown) => valg!.vedRinging(1, { diskusjon_id: diskusjon }),
    kanal: (s: 'tilkoblet' | 'frakoblet') => valg!.vedStatus(s),
  }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('lyttingen på diskusjonene', () => {
  it('samler trådene som ringer tett, og gjør en ringing uten tråd til «alle»', () => {
    const k = oppsett()
    k.ring('t1')
    k.ring('t2')
    k.ring('t1')
    vi.advanceTimersByTime(100)
    expect(k.endringer).toEqual([new Set(['t1', 't2'])])
    k.ring('t3')
    k.ring(null)
    k.ring('t4')
    vi.advanceTimersByTime(100)
    expect(k.endringer[1]).toBe('alle')
    expect(gjelderTraad('alle', 'x')).toBe(true)
    expect(gjelderTraad(new Set(['t1']), 't2')).toBe(false)
  })

  it('venter mens fanen er skjult, og gir det som ringte, når den blir synlig', () => {
    const k = oppsett()
    k.dokument.visibilityState = 'hidden'
    k.ring('t1')
    vi.advanceTimersByTime(1000)
    expect(k.endringer).toEqual([])
    k.dokument.visibilityState = 'visible'
    for (const f of k.lyttere) f()
    vi.advanceTimersByTime(100)
    expect(k.endringer).toEqual([new Set(['t1'])])
  })

  it('henter første gang når kanalen er tilkoblet, alt etter et brudd, og sier fra om tilkoblingen', () => {
    const k = oppsett()
    expect(k.klar).not.toHaveBeenCalled()
    k.kanal('tilkoblet')
    expect(k.klar).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2000)
    expect(k.endringer).toEqual([])
    expect(k.klar).toHaveBeenCalledTimes(1)
    k.kanal('frakoblet')
    k.kanal('frakoblet')
    k.kanal('tilkoblet')
    vi.advanceTimersByTime(100)
    expect(k.endringer).toEqual(['alle'])
    expect(k.status).toEqual([true, false, true])
  })

  it('henter etter fristen uten kanal, og alt når kanalen kommer etterpå', () => {
    const k = oppsett()
    vi.advanceTimersByTime(1000)
    expect(k.klar).toHaveBeenCalledTimes(1)
    k.kanal('tilkoblet')
    vi.advanceTimersByTime(100)
    expect(k.endringer).toEqual(['alle'])
    expect(k.klar).toHaveBeenCalledTimes(1)
  })

  it('henter med en gang når abonnementet ikke kan startes, uten å feile', () => {
    const klar = vi.fn()
    const stopp = lyttPaDiskusjoner(() => { throw new TypeError('ingen kanaler') }, 'stoff:litium', { vedEndring: () => {}, vedKlar: klar, dokument: null })
    expect(klar).not.toHaveBeenCalled()
    vi.advanceTimersByTime(0)
    expect(klar).toHaveBeenCalledTimes(1)
    expect(() => stopp()).not.toThrow()
  })

  it('gir ingenting etter at den er stoppet, og stopper abonnementet', () => {
    const k = oppsett()
    k.ring('t1')
    k.stopp()
    vi.advanceTimersByTime(1000)
    expect(k.endringer).toEqual([])
    expect(k.stoppet).toHaveBeenCalledTimes(1)
    expect(k.lyttere.size).toBe(0)
    expect(k.klar).not.toHaveBeenCalled()
  })
})
