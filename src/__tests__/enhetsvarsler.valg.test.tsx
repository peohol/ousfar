// @vitest-environment jsdom
/**
 * «Varsler på denne enheten» øverst i varselinnstillingene (bjella → ⚙;
 * docs/enhetsvarsler.md): bryteren for enheten med forklaringen for hver
 * tilstand og feilen når det ikke går, valgene per formål under den, og
 * veien dit fra chatinnstillingene.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Chatvarsler, Varseltilstand } from '../chatvarsler/enhet'
import { Chatinnstillinger } from '../components/chat/Chatinnstillinger'
import { meldChatstatus } from '../components/chat/chatstyring'
import { Enhetsbryter, Enhetsvarsler, VARSELTEKST, type Formaltjeneste } from '../components/varsler/Enhetsvarsler'
import { direktemeldingene } from '../direktemeldinger/useDirekte'
import { lesFormalvalg, VARSELFORMAL } from '../enhetsvarsler/formal'
import { lyttEtterApning } from '../varsler/bjella'

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

const tjeneste = (valg = [{ formal: 'chat', pa: true }], sett: Formaltjeneste['sett'] = async () => undefined): Formaltjeneste => ({
  hent: vi.fn(async () => valg),
  sett: vi.fn(sett),
})

const bryter = () => screen.findByRole<HTMLInputElement>('switch', { name: /Varsler på denne enheten/ })
const chatbryter = () => screen.findByRole<HTMLInputElement>('switch', { name: /Chatmeldinger/ })

describe('Enhetsbryter', () => {
  it('slår på for den innloggede, og av igjen', async () => {
    const varsler = falske('av')
    render(<Enhetsbryter varsler={varsler} />)
    const b = await bryter()
    expect(b.checked).toBe(false)
    expect(screen.getByText(VARSELTEKST.av)).toBeTruthy()
    await userEvent.click(b)
    await waitFor(() => expect(b.checked).toBe(true))
    expect(varsler.slaPa).toHaveBeenCalledWith('meg')
    expect(screen.getByText(VARSELTEKST.pa)).toBeTruthy()
    await userEvent.click(b)
    await waitFor(() => expect(b.checked).toBe(false))
    expect(varsler.slaAv).toHaveBeenCalled()
  })

  it.each(['blokkert', 'hjemskjerm', 'ustottet'] as const)('er låst og forklarer «%s»', async (tilstand) => {
    render(<Enhetsbryter varsler={falske(tilstand)} />)
    expect((await bryter()).disabled).toBe(true)
    expect(screen.getByText(VARSELTEKST[tilstand])).toBeTruthy()
  })

  it('viser feilen og tilstanden etterpå når det ikke går', async () => {
    const varsler = falske('av', async () => {
      throw new Error('Varsler kan ikke slås på akkurat nå. Prøv igjen senere.')
    })
    render(<Enhetsbryter varsler={varsler} />)
    await userEvent.click(await bryter())
    expect((await screen.findByRole('alert')).textContent).toContain('Varsler kan ikke slås på akkurat nå.')
    expect((await bryter()).checked).toBe(false)
  })

  it('sier at nettleseren ikke kan, utenfor en nettleser', async () => {
    render(<Enhetsbryter varsler={null} />)
    expect((await bryter()).disabled).toBe(true)
    expect(screen.getByText(VARSELTEKST.ustottet)).toBeTruthy()
  })
})

describe('Enhetsvarsler', () => {
  it('har bryteren for enheten øverst og valget for hvert formål under', async () => {
    render(<Enhetsvarsler varsler={falske('av')} tjeneste={tjeneste()} />)
    await chatbryter()
    expect(screen.getByRole('heading', { name: 'På denne enheten' })).toBeTruthy()
    const navn = screen.getAllByRole('switch').map((b) => b.closest('label')?.textContent ?? '')
    expect(navn[0]).toMatch(/^Varsler på denne enheten/)
    expect(navn[1]).toMatch(/^Chatmeldinger/)
  })

  it('lagrer valget for et formål, og setter det tilbake med feilen når det ikke går', async () => {
    const t = tjeneste([{ formal: 'chat', pa: true }], async (_f, pa) => {
      if (!pa) throw new Error('Kunne ikke lagre valget. Prøv igjen.')
    })
    render(<Enhetsvarsler varsler={falske('pa')} tjeneste={t} />)
    const b = await chatbryter()
    await userEvent.click(b)
    expect(t.sett).toHaveBeenCalledWith('chat', false)
    expect((await screen.findByRole('alert')).textContent).toBe('Kunne ikke lagre valget. Prøv igjen.')
    await waitFor(() => expect(b.checked).toBe(true))
  })

  it('vises ikke når den innloggede ikke har noe formål', async () => {
    const t = tjeneste([])
    const { container } = render(<Enhetsvarsler varsler={falske('pa')} tjeneste={t} />)
    await waitFor(() => expect(t.hent).toHaveBeenCalled())
    expect(container.textContent).toBe('')
  })

  it('viser bare formål appen kjenner, og leser bare svar med riktig form', () => {
    expect(
      lesFormalvalg([{ formal: 'chat', pa: false }, { formal: 'ukjent', pa: true }, { formal: 'chat' }, null, { formal: 'toString', pa: true }]),
    ).toEqual([{ formal: 'chat', pa: false }])
    expect(lesFormalvalg('feil')).toEqual([])
    expect(Object.keys(VARSELFORMAL)).toContain('chat')
  })
})

describe('Chatinnstillinger', () => {
  it('viser veien til varselinnstillingene øverst, over valgene for direktemeldingene', async () => {
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
    const apnet: string[] = []
    const slutt = lyttEtterApning((side) => apnet.push(side))
    try {
      render(<Chatinnstillinger />)
      expect(screen.queryByRole('switch', { name: /Varsler på denne enheten/ })).toBeNull()
      const knapp = screen.getByRole('button', { name: 'Varselinnstillinger' })
      expect(knapp.compareDocumentPosition(screen.getByRole('switch', { name: /Tillat direktemeldinger/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
      await userEvent.click(knapp)
      expect(apnet).toEqual(['innstillinger'])
    } finally {
      slutt()
      act(() => direktemeldingene.sett(null))
    }
  })

  it('har veien også når bare gruppechatten er slått på, og ingenting når ingen chat er det', async () => {
    act(() => meldChatstatus({ finnes: true, mobilApen: false, uleste: 0 }))
    try {
      const { unmount } = render(<Chatinnstillinger />)
      expect(screen.getByRole('button', { name: 'Varselinnstillinger' })).toBeTruthy()
      expect(screen.queryAllByRole('switch')).toHaveLength(0)
      unmount()
    } finally {
      act(() => meldChatstatus({ finnes: false, mobilApen: false, uleste: 0 }))
    }
    const { container } = render(<Chatinnstillinger />)
    expect(container.textContent).toBe('')
  })
})
