// @vitest-environment jsdom
/**
 * «Varsler på denne enheten» øverst i chatinnstillingene (bak ⚙ i chatmenyen
 * og i Innstillinger → Chat; docs/chatvarsler.md): bryteren, forklaringen for
 * hver tilstand og feilen når det ikke går.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Chatvarsler, Varseltilstand } from '../chatvarsler/enhet'
import { Chatinnstillinger } from '../components/chat/Chatinnstillinger'
import { Chatvarslervalg, VARSELTEKST } from '../components/chat/Chatvarslervalg'
import { direktemeldingene } from '../direktemeldinger/useDirekte'

vi.mock('../auth/okt', () => ({ useProfil: () => ({ id: 'meg' }) }))
vi.mock('../auth/klient', () => ({ klient: () => ({}) }))

afterEach(cleanup)

function falske(start: Varseltilstand, slaPa: () => Promise<Varseltilstand> = async () => 'pa'): Chatvarsler {
  return {
    tilstand: vi.fn(async () => start),
    slaPa: vi.fn(slaPa),
    slaAv: vi.fn(async () => 'av' as const),
    synk: vi.fn(async () => undefined),
    vedUtlogging: vi.fn(async () => undefined),
  }
}

const bryter = () => screen.findByRole<HTMLInputElement>('switch', { name: /Varsler på denne enheten/ })

describe('Chatvarslervalg', () => {
  it('slår på for den innloggede, og av igjen', async () => {
    const varsler = falske('av')
    render(<Chatvarslervalg varsler={varsler} />)
    const b = await bryter()
    expect((b).checked).toBe(false)
    expect(screen.getByText(VARSELTEKST.av)).toBeTruthy()
    await userEvent.click(b)
    await waitFor(() => expect((b).checked).toBe(true))
    expect(varsler.slaPa).toHaveBeenCalledWith('meg')
    expect(screen.getByText(VARSELTEKST.pa)).toBeTruthy()
    await userEvent.click(b)
    await waitFor(() => expect((b).checked).toBe(false))
    expect(varsler.slaAv).toHaveBeenCalled()
  })

  it.each(['blokkert', 'hjemskjerm', 'ustottet'] as const)('er låst og forklarer «%s»', async (tilstand) => {
    render(<Chatvarslervalg varsler={falske(tilstand)} />)
    expect((await bryter()).disabled).toBe(true)
    expect(screen.getByText(VARSELTEKST[tilstand])).toBeTruthy()
  })

  it('viser feilen og tilstanden etterpå når det ikke går', async () => {
    const varsler = falske('av', async () => {
      throw new Error('Varsler kan ikke slås på akkurat nå. Prøv igjen senere.')
    })
    render(<Chatvarslervalg varsler={varsler} />)
    await userEvent.click(await bryter())
    expect((await screen.findByRole('alert')).textContent).toContain('Varsler kan ikke slås på akkurat nå.')
    expect((await bryter()).checked).toBe(false)
  })

  it('sier at nettleseren ikke kan, utenfor en nettleser', async () => {
    render(<Chatvarslervalg varsler={null} />)
    expect((await bryter()).disabled).toBe(true)
    expect(screen.getByText(VARSELTEKST.ustottet)).toBeTruthy()
  })
})

describe('Chatinnstillinger', () => {
  it('har varslene øverst, over valgene for direktemeldingene', async () => {
    act(() =>
      direktemeldingene.sett({
        pa: true,
        kjent: true,
        samtaler: [],
        valg: { tillat_direktemeldinger: true, vis_aktiv: false },
        aktive: new Set(),
        settValg: async () => undefined,
        oppdater: () => undefined,
      }),
    )
    try {
      render(<Chatinnstillinger />)
      await bryter()
      expect(screen.getAllByRole('switch').map((b) => b.getAttribute('aria-label') ?? b.closest('label')?.textContent ?? '')[0]).toMatch(
        /Varsler på denne enheten/,
      )
    } finally {
      act(() => direktemeldingene.sett(null))
    }
  })
})
