// @vitest-environment jsdom
/**
 * Et museklikk på et kort i fortolkningsmodulene lar siden ligge i ro:
 * kortet rulles ikke lenger fram til midten av vinduet.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Card } from '../components/Card'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('Card', () => {
  it('ruller ikke når man klikker på selve kortet', () => {
    const rull = vi.fn()
    Element.prototype.scrollIntoView = rull
    const vindusrull = vi.spyOn(window, 'scrollBy').mockImplementation(() => {})
    render(
      <Card>
        <p>Innhold i kortet</p>
      </Card>,
    )
    fireEvent.click(screen.getByText('Innhold i kortet'))
    expect(rull).not.toHaveBeenCalled()
    expect(vindusrull).not.toHaveBeenCalled()
  })
})
