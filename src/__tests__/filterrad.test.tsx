// @vitest-environment jsdom
/**
 * Filterraden under søket: alle analysemetodene står framme som piller, med
 * «Alle» først, og pillen som gjelder er markert som valgt.
 */
import { cleanup, screen, within } from '@testing-library/react'
import { renderMedOusKatalog } from './hjelp/ouskatalogkilde'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Filterbytte } from '../components/Filterbytte'
import { ANALYSEMETODER } from '../domain/ouskatalog'

afterEach(cleanup)

function rad() {
  return screen.getByRole('group', { name: 'Begrens søket til analysemetode' })
}

function valgt() {
  return within(rad())
    .getAllByRole('button')
    .filter((knapp) => knapp.getAttribute('aria-pressed') === 'true')
}

describe('filterraden', () => {
  it('viser «Alle» først og deretter hver metode, uten å måtte åpne noe', () => {
    renderMedOusKatalog(<Filterbytte metodefilter={null} onFilter={() => {}} />)
    const tekster = within(rad())
      .getAllByRole('button')
      .map((knapp) => knapp.textContent)
    expect(tekster).toEqual(['Alle', ...ANALYSEMETODER.map((m) => m.kode)])
  })

  it('har «Alle» valgt når søket ikke er begrenset', () => {
    renderMedOusKatalog(<Filterbytte metodefilter={null} onFilter={() => {}} />)
    expect(valgt()).toHaveLength(1)
    expect(valgt()[0]?.textContent).toBe('Alle')
  })

  it('markerer metoden filteret står på, og bare den', () => {
    renderMedOusKatalog(<Filterbytte metodefilter="SRUS" onFilter={() => {}} />)
    expect(valgt()).toHaveLength(1)
    expect(valgt()[0]?.textContent).toBe('SRUS')
  })

  it('setter filteret på metoden som trykkes, og slår det av med «Alle»', async () => {
    const onFilter = vi.fn()
    renderMedOusKatalog(<Filterbytte metodefilter="SPFA" onFilter={onFilter} />)
    await userEvent.click(screen.getByRole('button', { name: /^UCAK/ }))
    expect(onFilter).toHaveBeenLastCalledWith('UCAK')
    await userEvent.click(screen.getByRole('button', { name: 'Alle analysemetoder' }))
    expect(onFilter).toHaveBeenLastCalledWith(null)
  })

  it('lar fokus bli i søkefeltet når en pille klikkes', async () => {
    renderMedOusKatalog(
      <>
        <input aria-label="Søk" />
        <Filterbytte metodefilter={null} onFilter={() => {}} />
      </>,
    )
    const felt = screen.getByRole('textbox', { name: 'Søk' })
    felt.focus()
    await userEvent.click(screen.getByRole('button', { name: /^SPFA/ }))
    expect(document.activeElement).toBe(felt)
  })

  it('oppgir hurtigtasten på hver pille', () => {
    renderMedOusKatalog(<Filterbytte metodefilter={null} onFilter={() => {}} />)
    const snarvei = (navn: string | RegExp) =>
      screen.getByRole('button', { name: navn }).getAttribute('aria-keyshortcuts')
    expect(snarvei('Alle analysemetoder')).toBe('Alt+0')
    expect(snarvei(/^SPFA/)).toBe('Alt+1')
  })
})
