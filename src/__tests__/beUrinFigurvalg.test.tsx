// @vitest-environment jsdom
/**
 * Figuren i fortolkningen av benzoylekgonin i urin, for begge modellformene:
 * valget «Visualiser med alle sikkerhetsmarginer» står når skjemaet en stund
 * er ufullstendig og etter Nullstill, og en endring så stor at aksene ikke kan
 * tegnes gir merknaden i stedet for figuren, mens resultatet står.
 *
 * Figuren har ingen løkker over aksene lenger (merkene er en begrenset liste
 * fra domenet), så testen med de store verdiene kan ikke henge.
 */
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { FOR_STOR_TIL_FIGUR } from '../components/BeUrinPlot'
import type { BeUrinModellsvar } from '../domain/beUrinModell'
import { PROFILMODELL, SYNTETISK_MODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { forberedBeUrinDom, fyll, gruppe, visBeUrin } from './hjelp/beUrinvisning'

forberedBeUrinDom()

const FAGMILJO = { id: 'a', navn: 'OUS Klinisk farmakologi' }
const FORMER: [string, BeUrinModellsvar][] = [
  ['form 1', { fagmiljo: FAGMILJO, modell: SYNTETISK_MODELL }],
  ['form 2', { fagmiljo: FAGMILJO, modell: PROFILMODELL }],
]

/** Punktene for denne prøven under figuren: ett per margin som vises. */
const marginpunkter = () =>
  within(screen.getByRole('list', { name: 'Denne prøven med sikkerhetsmarginen' })).getAllByRole('listitem')
const visningsvalg = () => screen.getByRole('slider', { name: 'Visualisering' })

describe.each(FORMER)('figuren, %s', (_navn, svar) => {
  async function vis() {
    visBeUrin(svar)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await fyll('Denne prøven', '150', '2', '2026-01-03')
  }

  it('beholder «alle sikkerhetsmarginer» når et felt tømmes og fylles igjen, og etter Nullstill', async () => {
    const user = userEvent.setup()
    await vis()
    expect(marginpunkter()).toHaveLength(1)
    fireEvent.change(visningsvalg(), { target: { value: '1' } })
    expect(marginpunkter()).toHaveLength(3)

    // Et tomt felt: ingen figur en stund.
    fireEvent.change(gruppe('Denne prøven').getByLabelText(/^Benzoylekgonin/), { target: { value: '' } })
    expect(screen.queryByRole('slider', { name: 'Visualisering' })).toBeNull()
    fireEvent.change(gruppe('Denne prøven').getByLabelText(/^Benzoylekgonin/), { target: { value: '150' } })
    expect(marginpunkter()).toHaveLength(3)

    await user.click(screen.getByRole('button', { name: 'Nullstill' }))
    await act(async () => {})
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await fyll('Denne prøven', '150', '2', '2026-01-03')
    expect(marginpunkter()).toHaveLength(3)
  })

  it('gir merknaden i stedet for figuren når aksens topp ikke kan representeres, og resultatet står', async () => {
    visBeUrin(svar)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    // Q 1 → 2,5e306 med 90 % margin: denne prøven ved om lag +1,7e308 %, som er
    // endelig, men toppen av aksen ville blitt 9 · 2e307 = ∞.
    await fyll('Forrige prøve', '2', '2', '2026-01-01')
    await fyll('Denne prøven', `5${'0'.repeat(306)}`, '2', '2026-01-02')
    expect(screen.getByText(FOR_STOR_TIL_FIGUR)).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Prosentvis endring/ })).toBeNull()
    expect(screen.getByRole('heading', { name: 'Resultat' })).toBeTruthy()
    expect(screen.getByText('Beregningen')).toBeTruthy()
  })
})
