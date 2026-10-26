// @vitest-environment jsdom
/**
 * Høyden på tekstfeltet i fagsidenes redigering (`justerbar`): nedre kant kan
 * dras, høyden lagres på brukeren og hentes når feltet åpnes, og et
 * dobbeltklikk gir feltet høyden skriveflaten gir det igjen. jsdom legger ikke
 * ut sider, så feltet og grensene får mål her.
 */
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { rensDokument } from '../faginnhold/riktekst'
import { medPekerhendelser } from './hjelp/pekerhendelser'

const innstilling = vi.hoisted(() => ({
  hent: vi.fn<() => Promise<number | null>>(),
  lagre: vi.fn(async (_lengde: number | null) => {}),
}))

vi.mock('../auth/innstillinger', async (original) => ({
  ...(await original<typeof import('../auth/innstillinger')>()),
  lengdeinnstilling: (nokkel: string) => (nokkel === 'redigering.teksthoyde' ? innstilling : null),
}))

const { Rikteksteditor } = await import('../components/stoffside/Rikteksteditor')

/** Feltet er 300 piksler høyt, én linje 40 og hele flaten 800. */
const MAAL: [string, number][] = [
  ['--tekstfelt-min', 40],
  ['--tekstfelt-dratt-mest', 800],
]

beforeAll(() => {
  medPekerhendelser()
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    const token = MAAL.find(([navn]) => this.style.height.includes(navn))
    const hoyde = token ? token[1] : this.classList.contains('rikteksteditor__tekst') ? 300 : 0
    return new DOMRect(0, 0, 0, hoyde)
  })
})

beforeEach(() => void innstilling.hent.mockResolvedValue(null))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const vis = (justerbar = true) =>
  render(<Rikteksteditor dokument={rensDokument(null)} onEndre={() => {}} etikett="Dosering" justerbar={justerbar} />)

const handtak = () => screen.getByRole('separator', { name: 'Høyden på tekstfeltet' })
const felt = (container: HTMLElement) => container.querySelector<HTMLElement>('.rikteksteditor')!
const ved = (y: number) => ({ clientY: y, button: 0, pointerId: 2 })

describe('et justerbart tekstfelt', () => {
  it('har høyden skriveflaten gir det, til det dras, og lagrer høyden når draget slippes', async () => {
    const { container } = vis()
    await screen.findByRole('textbox', { name: 'Dosering' })
    expect(felt(container).dataset.hoyde).toBeUndefined()

    fireEvent.pointerDown(handtak(), ved(500))
    fireEvent.pointerMove(handtak(), ved(620))
    expect(felt(container).style.getPropertyValue('--tekstfelt-valgt')).toBe('420px')
    expect(innstilling.lagre).not.toHaveBeenCalled()
    fireEvent.pointerUp(handtak(), ved(2000))
    expect(innstilling.lagre).toHaveBeenCalledWith(800)
    expect(felt(container).dataset.hoyde).toBe('true')
    expect(felt(container).style.getPropertyValue('--tekstfelt-valgt')).toBe('800px')
  })

  it('åpner med høyden brukeren har lagret, og går tilbake ved dobbeltklikk', async () => {
    innstilling.hent.mockResolvedValue(520)
    const { container } = vis()
    await waitFor(() => expect(felt(container).style.getPropertyValue('--tekstfelt-valgt')).toBe('520px'))
    fireEvent.doubleClick(handtak())
    expect(innstilling.lagre).toHaveBeenCalledWith(null)
    expect(felt(container).dataset.hoyde).toBeUndefined()
  })

  it('lar høyden brukeren drar til, vinne over en lagret høyde som kommer for sent', async () => {
    let svar: (hoyde: number) => void = () => undefined
    innstilling.hent.mockReturnValue(new Promise((ferdig) => (svar = ferdig)))
    const { container } = vis()
    await screen.findByRole('textbox', { name: 'Dosering' })
    fireEvent.keyDown(handtak(), { key: 'ArrowDown' })
    await act(async () => svar(520))
    expect(felt(container).style.getPropertyValue('--tekstfelt-valgt')).toBe('316px')
  })
})

it('har ingen kant å dra og henter ingen høyde uten `justerbar`', async () => {
  vis(false)
  await screen.findByRole('textbox', { name: 'Dosering' })
  expect(screen.queryByRole('separator', { name: 'Høyden på tekstfeltet' })).toBeNull()
  expect(innstilling.hent).not.toHaveBeenCalled()
})
