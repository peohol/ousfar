// @vitest-environment jsdom
/**
 * Kanthåndtaket, prøvd i en nettleser i minnet: at kanten kan dras og flyttes
 * med tastaturet innenfor grensene, og at lengden meldes underveis og lagres
 * når den er ferdig endret. Grensene og lengden er gitt; i appen måles de.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { Kanthandtak, type Kant, type Lengdemaal } from '../components/Kanthandtak'
import { medPekerhendelser } from './hjelp/pekerhendelser'

beforeAll(medPekerhendelser)

afterEach(cleanup)

function visHandtak(kant: Kant = 'venstre', start = 500, onNullstill?: () => void) {
  const naa: Lengdemaal = { lengde: start, minst: 448, mest: 900 }
  const onEndre = vi.fn((lengde: number) => void (naa.lengde = lengde))
  const onFerdig = vi.fn()
  render(
    <Kanthandtak etikett="Lengden" kant={kant} maal={() => ({ ...naa })} onEndre={onEndre} onFerdig={onFerdig} onNullstill={onNullstill} />,
  )
  return { handtak: screen.getByRole('separator', { name: 'Lengden' }), onEndre, onFerdig }
}

const ved = (x: number) => ({ clientX: x, button: 0, pointerId: 3 })
const vedY = (y: number) => ({ clientY: y, button: 0, pointerId: 3 })

describe('med pekeren', () => {
  it('gjør flaten bredere når venstre kant dras til venstre, og lagrer når den slippes', () => {
    const { handtak, onEndre, onFerdig } = visHandtak()
    fireEvent.pointerDown(handtak, ved(1000))
    expect(handtak.dataset.drar).toBeDefined()
    fireEvent.pointerMove(handtak, ved(900))
    expect(onEndre).toHaveBeenLastCalledWith(600)
    expect(onFerdig).not.toHaveBeenCalled()
    fireEvent.pointerUp(handtak, ved(880))
    expect(onFerdig).toHaveBeenCalledWith(620)
    expect(handtak.dataset.drar).toBeUndefined()
  })

  it('holder bredden innenfor grensene', () => {
    const { handtak, onEndre, onFerdig } = visHandtak()
    fireEvent.pointerDown(handtak, ved(1000))
    fireEvent.pointerMove(handtak, ved(1500))
    expect(onEndre).toHaveBeenLastCalledWith(448)
    fireEvent.pointerMove(handtak, ved(0))
    expect(onEndre).toHaveBeenLastCalledWith(900)
    fireEvent.pointerUp(handtak, ved(0))
    expect(onFerdig).toHaveBeenCalledWith(900)
  })

  it('følger retningen når håndtaket står på høyre kant', () => {
    const { handtak, onFerdig } = visHandtak('hoyre')
    fireEvent.pointerDown(handtak, ved(1000))
    fireEvent.pointerUp(handtak, ved(1050))
    expect(onFerdig).toHaveBeenCalledWith(550)
  })

  it('lagrer ingenting for et trykk uten drag, og går til minste bredde ved dobbeltklikk', () => {
    const { handtak, onFerdig } = visHandtak()
    fireEvent.pointerDown(handtak, ved(1000))
    fireEvent.pointerUp(handtak, ved(1000))
    expect(onFerdig).not.toHaveBeenCalled()
    fireEvent.doubleClick(handtak)
    expect(onFerdig).toHaveBeenCalledWith(448)
  })

  it('gjør flaten høyere når bunnen dras ned, og bryr seg ikke om sidelengs bevegelse', () => {
    const { handtak, onEndre, onFerdig } = visHandtak('bunn')
    expect(handtak.getAttribute('aria-orientation')).toBe('horizontal')
    fireEvent.pointerDown(handtak, { ...vedY(600), clientX: 10 })
    fireEvent.pointerMove(handtak, { ...vedY(700), clientX: 500 })
    expect(onEndre).toHaveBeenLastCalledWith(600)
    fireEvent.pointerUp(handtak, vedY(550))
    expect(onFerdig).toHaveBeenCalledWith(450)
  })

  it('gir flaten tilbake lengden den har av seg selv ved dobbeltklikk, når det er bedt om', () => {
    const onNullstill = vi.fn()
    const { handtak, onFerdig } = visHandtak('bunn', 500, onNullstill)
    fireEvent.doubleClick(handtak)
    expect(onNullstill).toHaveBeenCalledOnce()
    expect(onFerdig).not.toHaveBeenCalled()
    expect(handtak.title).toBe('Lengden. Dobbeltklikk for vanlig høyde.')
  })
})

describe('med tastaturet', () => {
  it('flytter kanten med piltastene, Shift for større steg, og lagrer når tasten slippes', () => {
    const { handtak, onEndre, onFerdig } = visHandtak()
    fireEvent.keyDown(handtak, { key: 'ArrowLeft' })
    expect(onEndre).toHaveBeenLastCalledWith(516)
    fireEvent.keyDown(handtak, { key: 'ArrowLeft', shiftKey: true })
    expect(onEndre).toHaveBeenLastCalledWith(580)
    expect(onFerdig).not.toHaveBeenCalled()
    fireEvent.keyUp(handtak, { key: 'ArrowLeft' })
    expect(onFerdig).toHaveBeenCalledWith(580)
    fireEvent.keyDown(handtak, { key: 'ArrowRight' })
    expect(onEndre).toHaveBeenLastCalledWith(564)
  })

  it('går til minste og største bredde med Home og End, og melder bredden og grensene', () => {
    const { handtak, onEndre } = visHandtak()
    expect(handtak.getAttribute('aria-valuenow')).toBe('500')
    expect(handtak.getAttribute('aria-valuemin')).toBe('448')
    expect(handtak.getAttribute('aria-valuemax')).toBe('900')
    fireEvent.keyDown(handtak, { key: 'End' })
    expect(onEndre).toHaveBeenLastCalledWith(900)
    expect(handtak.getAttribute('aria-valuenow')).toBe('900')
    fireEvent.keyDown(handtak, { key: 'Home' })
    expect(onEndre).toHaveBeenLastCalledWith(448)
  })

  it('flytter bunnen med pil opp og ned', () => {
    const { handtak, onEndre, onFerdig } = visHandtak('bunn')
    fireEvent.keyDown(handtak, { key: 'ArrowDown' })
    expect(onEndre).toHaveBeenLastCalledWith(516)
    fireEvent.keyDown(handtak, { key: 'ArrowUp', shiftKey: true })
    expect(onEndre).toHaveBeenLastCalledWith(452)
    fireEvent.keyDown(handtak, { key: 'ArrowRight' })
    fireEvent.keyUp(handtak, { key: 'ArrowUp' })
    expect(onFerdig).toHaveBeenCalledWith(452)
  })

  it('lar andre taster være', () => {
    const { handtak, onEndre, onFerdig } = visHandtak()
    fireEvent.keyDown(handtak, { key: 'Enter' })
    fireEvent.keyUp(handtak, { key: 'Enter' })
    expect(onEndre).not.toHaveBeenCalled()
    expect(onFerdig).not.toHaveBeenCalled()
  })
})

describe('et drag som avbrytes', () => {
  it('setter bredden tilbake og lagrer ingenting', () => {
    const { handtak, onEndre, onFerdig } = visHandtak()
    fireEvent.pointerDown(handtak, ved(1000))
    fireEvent.pointerMove(handtak, ved(900))
    fireEvent.pointerCancel(handtak, ved(900))
    expect(onEndre).toHaveBeenLastCalledWith(500)
    expect(onFerdig).not.toHaveBeenCalled()
  })
})
