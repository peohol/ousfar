// @vitest-environment jsdom
/**
 * Endringsloggen hentes først når den åpnes, ti føringer om gangen
 * (`src/data/endringslogg.ts`, `src/components/Endringslogg.tsx`).
 *
 * Fila henter ingen sider på forhånd, så den prøver det brukeren møter
 * første gang loggen åpnes. Hentingen av sidene kan feile på bestilling.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'

const henting = vi.hoisted(() => ({ feiler: false, sider: [] as number[] }))

vi.mock('virtual:ousfar-endringer', async (importOriginal) => {
  const ekte = await importOriginal<typeof import('virtual:ousfar-endringer')>()
  return {
    ...ekte,
    SIDER: ekte.SIDER.map((hent, side) => () => {
      if (henting.feiler) return Promise.reject(new Error('Nettet er nede'))
      henting.sider.push(side)
      return hent()
    }),
  }
})

const { ENDRINGSREGISTER } = await import('../data/endringslogg')
const { Endringslogg } = await import('../components/Endringslogg')
const { ENDRINGER_PER_SIDE } = await import('../domain/versjon')
const { antallSider } = await import('../domain/endringssider')

beforeAll(() => {
  Element.prototype.scrollIntoView ??= function () {}
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  cleanup()
  henting.feiler = false
})

/** Føringene loggen viser, som knappene som folder dem ut. */
const foringer = (lag: HTMLElement) => within(lag).queryAllByRole('button', { expanded: false }).concat(within(lag).queryAllByRole('button', { expanded: true }))

describe('endringsloggen ti om gangen', () => {
  it('har ingenting av loggen før den åpnes', () => {
    render(<Endringslogg apen={false} onLukk={() => {}} />)
    expect(henting.sider).toEqual([])
  })

  it('henter og viser de ti nyeste når den åpnes, og ti til med «Vis flere»', async () => {
    const bruker = userEvent.setup()
    render(<Endringslogg apen onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    expect(within(lag).getByRole('status').textContent).toBe('Henter endringsloggen …')
    // Fokuset venter på lista, ikke på lukkeknappen, så Enter ikke lukker loggen.
    expect(document.activeElement).toBe(lag.querySelector('.logg__liste'))

    await waitFor(() => expect(foringer(lag)).toHaveLength(ENDRINGER_PER_SIDE))
    const forste = foringer(lag)[0]!
    expect(forste.textContent).toContain(ENDRINGSREGISTER[0]!.versjon)
    expect(document.activeElement).toBe(forste)
    // Bare sidene med de nyeste er hentet.
    expect(henting.sider.length).toBeLessThanOrEqual(2)

    await bruker.click(within(lag).getByRole('button', { name: 'Vis flere' }))
    await waitFor(() => expect(foringer(lag)).toHaveLength(2 * ENDRINGER_PER_SIDE))
    // Fokuset går til den første av de nye.
    const ellevte = lag.querySelectorAll<HTMLElement>('.loggskuff__tittel')[ENDRINGER_PER_SIDE]!
    expect(ellevte.textContent).toContain(ENDRINGSREGISTER[ENDRINGER_PER_SIDE]!.versjon)
    expect(document.activeElement).toBe(ellevte)
    expect(henting.sider.length).toBeLessThan(antallSider(ENDRINGSREGISTER.length))
  })

  it('henter alt fram til føringen den åpnes på, og legger den åpen med fokus', async () => {
    const plass = 2 * ENDRINGER_PER_SIDE + 3
    const valgt = ENDRINGSREGISTER[plass]!
    render(<Endringslogg apen versjon={valgt.id} onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(foringer(lag)).toHaveLength(3 * ENDRINGER_PER_SIDE))
    const foring = lag.querySelector<HTMLElement>(`[data-versjon="${valgt.versjon}"] .loggskuff__tittel`)!
    expect(foring.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(foring)
  })

  it('begynner på toppen igjen når den lukkes og åpnes på nytt', async () => {
    const bruker = userEvent.setup()
    const { rerender } = render(<Endringslogg apen onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(foringer(lag)).toHaveLength(ENDRINGER_PER_SIDE))
    await bruker.click(within(lag).getByRole('button', { name: 'Vis flere' }))
    await waitFor(() => expect(foringer(lag)).toHaveLength(2 * ENDRINGER_PER_SIDE))

    rerender(<Endringslogg apen={false} onLukk={() => {}} />)
    rerender(<Endringslogg apen onLukk={() => {}} />)
    // Sidene er hentet før, så de nyeste står der med en gang.
    expect(foringer(screen.getByRole('dialog', { name: 'Endringslogg' }))).toHaveLength(ENDRINGER_PER_SIDE)
  })

  it('sier fra når føringene ikke lot seg hente, og prøver igjen', async () => {
    const bruker = userEvent.setup()
    // Langt bak i loggen, der sidene ikke er hentet ennå.
    const plass = 6 * ENDRINGER_PER_SIDE
    henting.feiler = true
    render(<Endringslogg apen versjon={ENDRINGSREGISTER[plass]!.id} onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    expect((await within(lag).findByRole('alert')).textContent).toBe('Fikk ikke hentet endringsloggen.')
    expect(foringer(lag).length).toBeLessThan(plass)

    henting.feiler = false
    await bruker.click(within(lag).getByRole('button', { name: 'Prøv igjen' }))
    await waitFor(() => expect(foringer(lag)).toHaveLength(plass + ENDRINGER_PER_SIDE))
    expect(within(lag).queryByRole('alert')).toBeNull()
  })

  it('har ingen «Vis flere» når hele loggen vises', async () => {
    const siste = ENDRINGSREGISTER.at(-1)!
    render(<Endringslogg apen versjon={siste.id} onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    await waitFor(() => expect(foringer(lag)).toHaveLength(ENDRINGSREGISTER.length))
    await act(async () => {})
    expect(within(lag).queryByRole('button', { name: 'Vis flere' })).toBeNull()
  })
})
