// @vitest-environment jsdom
/**
 * Lagstakken (`src/hooks/lagstakk.ts`): bare det øverste laget får `Escape`,
 * et åpent dialogvindu går foran lagene utenfor det, og et trykk som alt er
 * brukt, lukker ingenting (`docs/design/d0-dashboard-chat/flyt.md` §4).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef, type ReactNode } from 'react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Modallag } from '../components/Modallag'
import { TipsLag } from '../components/Tips'
import { Nedtrekksmeny } from '../components/toppmeny/Nedtrekksmeny'
import { lagErApne, useEscapelag } from '../hooks/lagstakk'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

function Lag({ apen, onEscape, children }: { apen: boolean; onEscape: () => void; children?: ReactNode }) {
  const rot = useRef<HTMLDivElement>(null)
  useEscapelag(apen, onEscape, rot)
  return <div ref={rot}>{children}</div>
}

function trykkEscape(mal: Element = document.body): boolean {
  return fireEvent.keyDown(mal, { key: 'Escape' })
}

describe('lagstakken', () => {
  it('gir Escape bare til laget som ble åpnet sist, og tar trykket fra resten av appen', () => {
    const meny = vi.fn()
    const nedtrekk = vi.fn()
    render(
      <>
        <Lag apen onEscape={meny} />
        <Lag apen onEscape={nedtrekk} />
      </>,
    )
    expect(trykkEscape()).toBe(false)
    expect(nedtrekk).toHaveBeenCalledTimes(1)
    expect(meny).not.toHaveBeenCalled()
  })

  it('gir neste trykk til laget under når det øverste lukkes', () => {
    const meny = vi.fn()
    const nedtrekk = vi.fn()
    const { rerender } = render(
      <>
        <Lag apen onEscape={meny} />
        <Lag apen onEscape={nedtrekk} />
      </>,
    )
    rerender(
      <>
        <Lag apen onEscape={meny} />
        <Lag apen={false} onEscape={nedtrekk} />
      </>,
    )
    trykkEscape()
    expect(meny).toHaveBeenCalledTimes(1)
    expect(nedtrekk).not.toHaveBeenCalled()
  })

  it('er tom når ingen lag står åpne, og lar tasten være', () => {
    const meny = vi.fn()
    render(<Lag apen={false} onEscape={meny} />)
    expect(lagErApne()).toBe(false)
    expect(trykkEscape()).toBe(true)
    expect(meny).not.toHaveBeenCalled()
  })

  it('lar et åpent dialogvindu over menyen lukkes av nettleseren, uten å lukke menyen', () => {
    const meny = vi.fn()
    render(
      <>
        <Lag apen onEscape={meny} />
        <dialog open />
      </>,
    )
    expect(lagErApne()).toBe(true)
    expect(trykkEscape(document.querySelector('dialog')!)).toBe(true)
    expect(meny).not.toHaveBeenCalled()
  })

  it('lukker et nedtrekk som står inni dialogvinduet, og bare det', () => {
    const meny = vi.fn()
    const nedtrekk = vi.fn()
    render(
      <>
        <Lag apen onEscape={meny} />
        <dialog open>
          <Lag apen onEscape={nedtrekk} />
        </dialog>
      </>,
    )
    expect(trykkEscape(document.querySelector('dialog')!)).toBe(false)
    expect(nedtrekk).toHaveBeenCalledTimes(1)
    expect(meny).not.toHaveBeenCalled()
  })

  it('lukker ingenting når et felt alt har brukt trykket, som når søket tømmes', () => {
    const meny = vi.fn()
    render(
      <Lag apen onEscape={meny}>
        <input aria-label="Søk" onKeyDown={(e) => e.key === 'Escape' && e.preventDefault()} />
      </Lag>,
    )
    trykkEscape(document.querySelector('input')!)
    expect(meny).not.toHaveBeenCalled()
    trykkEscape()
    expect(meny).toHaveBeenCalledTimes(1)
  })

  it('lar Escape med en modifikatortast være', () => {
    const meny = vi.fn()
    render(<Lag apen onEscape={meny} />)
    fireEvent.keyDown(document.body, { key: 'Escape', ctrlKey: true })
    expect(meny).not.toHaveBeenCalled()
  })

  it('kaller den nyeste lukkefunksjonen uten å melde laget på igjen', () => {
    const forste = vi.fn()
    const andre = vi.fn()
    const { rerender } = render(<Lag apen onEscape={forste} />)
    rerender(<Lag apen onEscape={andre} />)
    trykkEscape()
    expect(andre).toHaveBeenCalledTimes(1)
    expect(forste).not.toHaveBeenCalled()
  })
})

describe('et nedtrekk i et dialogvindu med skjemavakt', () => {
  it('lukker bare nedtrekket med første Escape, og lar neste gå til vinduet', async () => {
    const user = userEvent.setup()
    // Skjemaet har ulagrede endringer: vakten holder vinduet åpent.
    const vedLukking = vi.fn(() => false)
    const onLukk = vi.fn()
    render(
      <TipsLag>
        <Modallag apen tittel="Skjema" onLukk={onLukk} vedLukking={vedLukking}>
          <Nedtrekksmeny knapp={{ ikon: 'more', etikett: 'Flere valg' }} etikett="Valg" lag="valg">
            {(lukk) => (
              <button type="button" onClick={lukk}>
                Et valg
              </button>
            )}
          </Nedtrekksmeny>
        </Modallag>
      </TipsLag>,
    )
    const panel = () => document.querySelector<HTMLElement>('.nedtrekk__panel')!
    await user.click(screen.getByRole('button', { name: 'Flere valg' }))
    expect(panel().hidden).toBe(false)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Et valg' }))

    await user.keyboard('{Escape}')
    expect(panel().hidden).toBe(true)
    expect(vedLukking).not.toHaveBeenCalled()
    expect(document.querySelector('dialog')!.open).toBe(true)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Flere valg' }))

    await user.keyboard('{Escape}')
    expect(vedLukking).toHaveBeenCalledTimes(1)
    expect(document.querySelector('dialog')!.open).toBe(true)
    expect(onLukk).not.toHaveBeenCalled()
  })
})
