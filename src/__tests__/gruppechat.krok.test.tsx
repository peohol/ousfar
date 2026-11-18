// @vitest-environment jsdom
/**
 * `useGruppechat` i React: den gir det kontrolleren vet, bytter abonnement når
 * gruppen byttes, og rydder opp når visningen forsvinner. Kallene og kanalen
 * er erstattet; reglene for sanntiden prøves i `gruppechat.sanntid.test.ts`.
 */
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { syntetiskeMeldinger } from './hjelp/testchat'

const abonnement = vi.hoisted(() => ({ aktive: new Set<string>(), alle: [] as string[] }))

vi.mock('../gruppechat/sanntid', () => ({
  abonnerPaGruppechat: (gruppe: string, valg: { vedStatus: (s: string) => void }) => {
    abonnement.aktive.add(gruppe)
    abonnement.alle.push(gruppe)
    queueMicrotask(() => valg.vedStatus('tilkoblet'))
    return () => abonnement.aktive.delete(gruppe)
  },
}))

vi.mock('../gruppechat/api', async (importer) => ({
  ...(await importer<typeof import('../gruppechat/api')>()),
  lesGruppechat: vi.fn(async (gruppe: string) => ({
    meldinger: syntetiskeMeldinger(gruppe === 'gruppe-a' ? 2 : 3),
    flere_eldre: false,
    siste_endring: 3,
    lest_til_nr: 0,
    kan_skrive: true,
    kan_moderere: false,
    lesere: { medlemmer: 3, systemarkitekter: true },
    grenser: { maks_tegn: 4000, maks_per_minutt: 20 },
  })),
  hentChatendringer: vi.fn(async () => ({ meldinger: [], siste_endring: 3, flere: false })),
}))

vi.mock('../varsler/api', () => ({ oppfriskVarsler: vi.fn() }))

const { useGruppechat } = await import('../gruppechat/useGruppechat')

afterEach(() => {
  cleanup()
  abonnement.aktive.clear()
  abonnement.alle = []
})

describe('useGruppechat', () => {
  it('gir meldingene, og bytter abonnement når gruppen byttes', async () => {
    const { result, rerender } = renderHook(({ gruppe }) => useGruppechat(gruppe), { initialProps: { gruppe: 'gruppe-a' } })
    await waitFor(() => expect(result.current.status).toBe('klar'))
    expect(result.current.meldinger).toHaveLength(2)
    expect(result.current.tilkobling).toBe('tilkoblet')
    expect([...abonnement.aktive]).toEqual(['gruppe-a'])

    rerender({ gruppe: 'gruppe-b' })
    await waitFor(() => expect(result.current.meldinger).toHaveLength(3))
    expect([...abonnement.aktive]).toEqual(['gruppe-b'])
  })

  it('stopper abonnementet når visningen forsvinner', async () => {
    const { result, unmount } = renderHook(() => useGruppechat('gruppe-a'))
    await waitFor(() => expect(result.current.status).toBe('klar'))
    act(() => unmount())
    expect(abonnement.aktive.size).toBe(0)
  })

  it('deler én kontroller mellom visningene av samme gruppe, som chatmenyen og gruppesiden', async () => {
    const forste = renderHook(() => useGruppechat('gruppe-a'))
    const andre = renderHook(() => useGruppechat('gruppe-a'))
    await waitFor(() => expect(andre.result.current.status).toBe('klar'))
    // Ett abonnement, og det samme utsnittet i begge.
    expect(abonnement.alle).toEqual(['gruppe-a'])
    expect(andre.result.current).toBe(forste.result.current)
    act(() => forste.result.current.send('Fra menyen'))
    expect(andre.result.current.ventende.map((v) => v.tekst)).toEqual(['Fra menyen'])
    // Står den ene igjen, står abonnementet; når begge er borte, stoppes det.
    act(() => forste.unmount())
    expect([...abonnement.aktive]).toEqual(['gruppe-a'])
    act(() => andre.unmount())
    expect(abonnement.aktive.size).toBe(0)
  })
})
