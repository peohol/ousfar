// @vitest-environment jsdom
/**
 * Den delte stillingslista i appen (`src/stillinger/katalog.ts`): en lesing
 * som startet før en endring, skal ikke legge den gamle lista tilbake etter
 * den nye, og en lesing fra forrige innlogging skal ikke komme inn i den neste.
 */
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Rad = { id: string; navn: string; rekkefolge: number; stillinger: [] }
const svar = vi.hoisted(() => [] as Array<(rader: Rad[]) => void>)

vi.mock('../auth/klient', () => ({
  klient: () => ({
    from: () => ({
      select: () => new Promise((losning) => svar.push((rader) => losning({ data: rader, error: null }))),
    }),
  }),
}))
vi.mock('../auth/api', () => ({ rpc: vi.fn(async () => 'ny') }))

const { useStillinger, oppfriskStillinger, lagreStillingskategori } = await import('../stillinger/katalog')
const { meldOktskifte } = await import('../auth/oktskifte')

const kategori = (navn: string): Rad => ({ id: navn, navn, rekkefolge: 0, stillinger: [] })
const navnene = (liste: readonly { navn: string }[]) => liste.map((k) => k.navn)

beforeEach(() => {
  meldOktskifte()
  svar.length = 0
})

describe('den delte stillingslista', () => {
  it('henter lista på nytt etter en endring, selv om en lesing alt var underveis', async () => {
    const { result } = renderHook(() => useStillinger())
    await waitFor(() => expect(svar).toHaveLength(1))

    // Endringen er gjort i databasen mens den første lesingen fortsatt venter.
    let endret!: Promise<string>
    act(() => {
      endret = lagreStillingskategori(null, 'Ny')
    })
    await waitFor(() => expect(svar).toHaveLength(2))

    await act(async () => {
      svar[1]!([kategori('Gammel'), kategori('Ny')])
      await endret
    })
    expect(navnene(result.current)).toEqual(['Gammel', 'Ny'])

    // Den første lesingen svarer sist, med lista fra før endringen.
    await act(async () => svar[0]!([kategori('Gammel')]))
    expect(navnene(result.current)).toEqual(['Gammel', 'Ny'])
  })

  it('deler samtidige lesinger som ikke følger en endring', async () => {
    const forste = oppfriskStillinger()
    expect(oppfriskStillinger()).toBe(forste)
    expect(svar).toHaveLength(1)
  })

  it('legger ikke inn en lesing fra forrige innlogging', async () => {
    const { result } = renderHook(() => useStillinger())
    await waitFor(() => expect(svar).toHaveLength(1))
    act(() => meldOktskifte())
    await act(async () => svar[0]!([kategori('Forrige')]))
    expect(result.current).toEqual([])
  })
})
