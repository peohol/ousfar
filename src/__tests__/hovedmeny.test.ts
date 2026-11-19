/**
 * Byggeklossene til hovedmenyen og kontoen fra D6, uten React: valgene i
 * administrasjonen etter rettighetene, tallet på forslag som venter på den
 * innloggede, teksten under «Innstillinger» og den delte tilstanden.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { INGEN_RETTIGHETER, type Fagmiljoreferanse, type Rettigheter } from '../auth/rettigheter'

const api = vi.hoisted(() => ({
  kall: vi.fn(async (): Promise<unknown> => null),
  hentMineForslag: vi.fn(async (): Promise<unknown[]> => []),
}))
vi.mock('../forslag/api', () => api)

const { ADMINVALG, adminvalg, adminvarsel } = await import('../components/konto/adminvisning')
const { hentForslagTilMeg } = await import('../forslag/behandling')
const { forst } = await import('../forslag/modell')
const { innstillingsforklaring } = await import('../components/konto/Innstillinger')
const { lagDeltTilstand } = await import('../hooks/deltTilstand')

const FAGMILJO: Fagmiljoreferanse = { id: 'a', nokkel: 'ous', navn: 'OUS', standard: true, apent: true, ikon: 'laboratorium' }
const panelene = (r: Rettigheter) => adminvalg(r).map((v) => v.panel)

describe('valgene i administrasjonen', () => {
  it('er ingen for en vanlig bruker, og ingen for en redaktør', () => {
    expect(panelene(INGEN_RETTIGHETER)).toEqual([])
    expect(panelene({ ...INGEN_RETTIGHETER, redaktor: true, behandlerForslag: true })).toEqual([])
  })

  it('er brukerne for den som kan opprette brukere, og redaktørene for den som administrerer et fagmiljø', () => {
    expect(panelene({ ...INGEN_RETTIGHETER, opprettBrukerI: ['a'] })).toEqual(['brukere'])
    expect(panelene({ ...INGEN_RETTIGHETER, administrerer: [FAGMILJO] })).toEqual(['brukere', 'redaktorer'])
  })

  it('er alle for en systemarkitekt, i fast rekkefølge', () => {
    expect(panelene({ ...INGEN_RETTIGHETER, systemarkitekt: true })).toEqual(ADMINVALG.map((v) => v.panel))
  })

  it('samler det som bør ses over i én tekst, i valgenes rekkefølge', () => {
    expect(adminvarsel({})).toBeUndefined()
    expect(adminvarsel({ kildeovervaking: 'B', datakilder: 'A' })).toBe('A; B')
  })
})

describe('forslagene som venter på den innloggede', () => {
  beforeEach(() => vi.clearAllMocks())
  const mine = (venter: boolean[]) => venter.map((v, i) => ({ id: String(i), venter_pa_meg: v }))

  it('teller egne forslag som venter på svar, uten arbeidskøen for den som ikke behandler forslag', async () => {
    api.hentMineForslag.mockResolvedValueOnce(mine([true, false, true]))
    expect(await hentForslagTilMeg(false)).toBe(2)
    expect(api.kall).not.toHaveBeenCalled()
  })

  it('legger til de nye og dem behandleren har selv, men ikke de andre pågående', async () => {
    api.hentMineForslag.mockResolvedValueOnce(mine([true]))
    api.kall.mockResolvedValueOnce({ antall: { nye: 2, pagaende: 5, uten_redaktor: 1, mine: 1 } })
    expect(await hentForslagTilMeg(true)).toBe(4)
    expect(api.kall).toHaveBeenCalledWith('les_forslagsko', { filter: 'antall' })
  })

  it('setter det viktige først og lar resten stå som før', () => {
    expect(forst([1, 2, 3, 4, 5], (n) => n % 2 === 0)).toEqual([2, 4, 1, 3, 5])
  })
})

describe('Innstillinger', () => {
  it('sier hvilke faner vinduet har, under valget i kontomenyen', () => {
    expect(innstillingsforklaring()).toBe('Visning')
    expect(innstillingsforklaring([{ id: 'visning', navn: 'Visning' }, { id: 'chat', navn: 'Chat' }])).toBe('Visning og chat')
  })
})

describe('den delte tilstanden', () => {
  it('varsler bare når verdien endres', () => {
    const tilstand = lagDeltTilstand({ a: 1 }, (x, y) => x.a === y.a)
    const forrige = tilstand.les()
    tilstand.sett({ a: 1 })
    expect(tilstand.les()).toBe(forrige)
    tilstand.sett({ a: 2 })
    expect(tilstand.les()).toEqual({ a: 2 })
  })
})
