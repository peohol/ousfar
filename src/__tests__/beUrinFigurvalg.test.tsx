// @vitest-environment jsdom
/**
 * Figuren i fortolkningen av benzoylekgonin i urin, for begge modellformene:
 * valget om alle sikkerhetsmarginer (et skyvefelt med form 1, en avkrysning med form 2) står når skjemaet en stund
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

/** Hver form med sitt valg for alle sikkerhetsmarginer og det som viser at resultatet står. */
interface Form {
  svar: BeUrinModellsvar
  /** Valget, eller `null` når det ikke vises. */
  valg: () => HTMLElement | null
  /** Slår på alle sikkerhetsmarginene. */
  alle: () => void
  /** Antall punkter for denne prøven under figuren. */
  punkter: () => number
  /** Det som står når resultatet står. */
  resultat: () => HTMLElement
}

/** Punktene for denne prøven under figuren: ett per margin som vises. */
const marginpunkter = () =>
  within(screen.getByRole('list', { name: 'Denne prøven med sikkerhetsmarginen' })).getAllByRole('listitem').length

const FORMER: [string, Form][] = [
  [
    'form 1',
    {
      svar: { fagmiljo: FAGMILJO, modell: SYNTETISK_MODELL },
      valg: () => screen.queryByRole('slider', { name: 'Visualisering' }),
      alle: () => fireEvent.change(screen.getByRole('slider', { name: 'Visualisering' }), { target: { value: '1' } }),
      punkter: marginpunkter,
      resultat: () => screen.getByRole('heading', { name: 'Resultat' }),
    },
  ],
  [
    'form 2',
    {
      svar: { fagmiljo: FAGMILJO, modell: PROFILMODELL },
      valg: () => screen.queryByRole('checkbox', { name: 'Vis alle sikkerhetsmarginer' }),
      alle: () => fireEvent.click(screen.getByRole('checkbox', { name: 'Vis alle sikkerhetsmarginer' })),
      // Med én margin står endringen alt i tabellen, så listen står bare med alle.
      punkter: () =>
        screen.queryByRole('list', { name: 'Denne prøven med sikkerhetsmarginen' }) ? marginpunkter() : 1,
      resultat: () => screen.getByRole('region', { name: 'Sporadisk bruk lagt til grunn' }),
    },
  ],
]

describe.each(FORMER)('figuren, %s', (_navn, form) => {
  async function vis() {
    visBeUrin(form.svar)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await fyll('Denne prøven', '150', '2', '2026-01-03')
  }

  it('beholder «alle sikkerhetsmarginer» når et felt tømmes og fylles igjen, og etter Nullstill', async () => {
    const user = userEvent.setup()
    await vis()
    expect(form.punkter()).toBe(1)
    form.alle()
    expect(form.punkter()).toBe(3)

    // Et tomt felt: ingen figur en stund.
    fireEvent.change(gruppe('Denne prøven').getByLabelText(/^Benzoylekgonin/), { target: { value: '' } })
    expect(form.valg()).toBeNull()
    fireEvent.change(gruppe('Denne prøven').getByLabelText(/^Benzoylekgonin/), { target: { value: '150' } })
    expect(form.punkter()).toBe(3)

    await user.click(screen.getByRole('button', { name: 'Nullstill' }))
    await act(async () => {})
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await fyll('Denne prøven', '150', '2', '2026-01-03')
    expect(form.punkter()).toBe(3)
  })

  it('gir merknaden i stedet for figuren når aksens topp ikke kan representeres, og resultatet står', async () => {
    visBeUrin(form.svar)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    // Q 1 → 2,5e306 med 90 % margin: denne prøven ved om lag +1,7e308 %, som er
    // endelig, men toppen av aksen ville blitt 9 · 2e307 = ∞.
    await fyll('Forrige prøve', '2', '2', '2026-01-01')
    await fyll('Denne prøven', `5${'0'.repeat(306)}`, '2', '2026-01-02')
    expect(screen.getByText(FOR_STOR_TIL_FIGUR)).toBeTruthy()
    expect(screen.queryByRole('img', { name: /Prosentvis endring/ })).toBeNull()
    expect(form.resultat()).toBeTruthy()
  })
})
