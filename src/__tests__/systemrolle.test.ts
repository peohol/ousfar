import { afterEach, describe, expect, it, vi } from 'vitest'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../auth/klient', () => ({ klient: () => ({ rpc }) }))

import { erSystemarkitekt, glemSystemroller } from '../auth/systemrolle'

afterEach(() => {
  glemSystemroller()
  rpc.mockReset()
})

describe('svaret om systemarkitekten', () => {
  it('spør databasen én gang per bruker, og godtar bare et uttrykkelig ja', async () => {
    rpc.mockResolvedValue({ data: true, error: null })
    expect(await Promise.all([erSystemarkitekt('a'), erSystemarkitekt('a')])).toEqual([true, true])
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('er_systemarkitekt')
    rpc.mockResolvedValue({ data: 'ja', error: null })
    expect(await erSystemarkitekt('b')).toBe(false)
  })

  it('svarer nei når oppslaget går galt, og spør på nytt neste gang', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'nede' } })
    expect(await erSystemarkitekt('a')).toBe(false)
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await erSystemarkitekt('a')).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})
