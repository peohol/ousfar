// @vitest-environment jsdom
/**
 * `useMurverk` (src/hooks/useMurverk.ts): hvert barn får `--spenn`, radene
 * det trenger for høyden pluss luften, og måles på nytt når barna kommer og
 * går. I et vanlig rutenett (ingen fast radhøyde) måles ingenting.
 */
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useMurverk } from '../hooks/useMurverk'

/** Rutenettets stil slik nettleseren ville regnet den ut. */
function stil(gridAutoRows: string, columnGap = '28px') {
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({ gridAutoRows, columnGap } as CSSStyleDeclaration)
}

/** Høyden hvert barn har, etter `data-hoyde`. */
vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
  return { height: Number(this.dataset['hoyde'] ?? 0) } as DOMRect
})

function Flate({ hoyder }: { hoyder: number[] }) {
  const ref = useMurverk()
  return (
    <div ref={ref}>
      {hoyder.map((h, i) => (
        <section key={i} data-hoyde={h} />
      ))}
    </div>
  )
}

const spenn = (container: HTMLElement) => Array.from(container.querySelectorAll('section'), (s) => s.style.getPropertyValue('--spenn'))

afterEach(() => {
  cleanup()
  vi.mocked(window.getComputedStyle).mockRestore?.()
})

describe('useMurverk', () => {
  it('gir hvert barn radene høyden og luften krever, rundet opp', () => {
    stil('1px')
    const { container } = render(<Flate hoyder={[100, 240.4, 0]} />)
    expect(spenn(container)).toEqual(['128', '269', '28'])
  })

  it('regner med radhøyden stilarket gir', () => {
    stil('4px', '8px')
    const { container } = render(<Flate hoyder={[100]} />)
    expect(spenn(container)).toEqual(['27'])
  })

  it('måler barn som kommer til', async () => {
    stil('1px')
    const { container, rerender } = render(<Flate hoyder={[100]} />)
    await act(async () => rerender(<Flate hoyder={[100, 50]} />))
    expect(spenn(container)).toEqual(['128', '78'])
  })

  it('måler ingenting i et vanlig rutenett', () => {
    stil('auto')
    const { container } = render(<Flate hoyder={[100]} />)
    expect(spenn(container)).toEqual([''])
  })
})
