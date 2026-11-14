import { afterEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../auth/klient', () => ({ klient: () => ({ rpc }) }))

import { hentLenkemaal } from '../direktelenker/api'
import { meldOktskifte } from '../auth/oktskifte'
import { erSystemarkitekt, glemSystemroller } from '../auth/systemrolle'

afterEach(() => {
  glemSystemroller()
  rpc.mockReset()
})

describe('svaret om systemarkitekten', () => {
  it('deler spørsmål som går samtidig, husker svaret, og godtar bare et uttrykkelig ja', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    expect(await Promise.all([erSystemarkitekt('a', { fersk: true }), erSystemarkitekt('a', { fersk: true })])).toEqual([true, true])
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('er_systemarkitekt')
    expect(await erSystemarkitekt('a')).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(1)
    rpc.mockResolvedValue({ data: 'ja', error: null })
    expect(await erSystemarkitekt('b')).toBe(false)
  })

  it('spør på nytt når svaret skal være ferskt, så en rolle som er tatt bort, slår igjennom', async () => {
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await erSystemarkitekt('a')).toBe(true)
    rpc.mockResolvedValueOnce({ data: false, error: null })
    expect(await erSystemarkitekt('a', { fersk: true })).toBe(false)
    expect(await erSystemarkitekt('a')).toBe(false)
  })

  it('svarer nei når oppslaget går galt, og husker ikke det', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'nede' } })
    expect(await erSystemarkitekt('a')).toBe(false)
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await erSystemarkitekt('a')).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})

describe('når kontoen i fanen skifter', () => {
  it('glemmer svaret om rollen og forhåndsvisningene av lenker', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    await erSystemarkitekt('a')
    const mal = { slag: 'diskusjon', id: '00000000-0000-0000-0000-000000000001', kommentar: null } as const
    await hentLenkemaal(mal).catch(() => null)
    expect(rpc).toHaveBeenCalledTimes(2)
    // Husket: ingen nye spørsmål.
    await erSystemarkitekt('a')
    await hentLenkemaal(mal).catch(() => null)
    expect(rpc).toHaveBeenCalledTimes(2)

    meldOktskifte()
    await erSystemarkitekt('a')
    await hentLenkemaal(mal).catch(() => null)
    expect(rpc).toHaveBeenCalledTimes(4)
  })
})
