// @vitest-environment jsdom
/**
 * Når prøveberegningen i forhåndskontrollen når taket uten å finne en komplett
 * plan, er ingenting avgjort (`ikke_avklart`, ChatGPT 04.11): siden sier det
 * uten å love en plan, lukker ikke flyten, og beregner planen med de faktiske
 * svarene når alt er besvart. Taket settes lavt her slik at kontrollen alltid
 * stopper før første prøve.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Verktoyside } from '../components/verktoy/Verktoyside'
import { glemBildet } from '../oppdatering/bevaring'
import { IKKE_AVKLART, KAN_LAGES_HVIS } from '../verktoy/flyt/forhandskontroll'
import { planen, planpanel, velgForm } from './hjelp/verktoyflyt'
import { TEST_NEDTRAPPING, TESTKLOKKE, testFest, testsett } from './hjelp/verktoyplan'

vi.mock('../verktoy/flyt/forhandskontroll', async (original) => {
  const m = await original<typeof import('../verktoy/flyt/forhandskontroll')>()
  return { ...m, forhandskontroll: (g: Parameters<typeof m.forhandskontroll>[0]) => m.forhandskontroll({ ...g, provetak: { beregninger: 0 } }) }
})

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView ??= function () {}
  sessionStorage.clear()
  glemBildet()
})
afterEach(cleanup)

it('sier at ingenting er avklart på forhånd, og beregner planen med svarene', async () => {
  const user = userEvent.setup()
  render(
    <Verktoyside
      verktoy="trappe-ned-antidepressiv"
      legemidler={{ les: async () => testFest() }}
      sperrer={{ les: async () => [] }}
      regelvarsler={{ les: async () => [] }}
      regelsett={testsett(TEST_NEDTRAPPING)}
      klokke={TESTKLOKKE}
      onLukk={() => {}}
    />,
  )
  await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
  await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), '25')
  await velgForm(user, 'Formulering av escitalopram', 'peroral')
  await velgForm(user, 'Legemiddelform av escitalopram', 'SYN-TAB')
  // Planen beregnes med de faktiske svarene, og statusen lover ingenting og sier ikke «kan ikke».
  expect(await planen(TEST_NEDTRAPPING.tittel)).toBeTruthy()
  expect(document.querySelector('.flytstatus[data-utfall="ukjent"]')?.textContent).toContain(IKKE_AVKLART)
  expect(screen.queryByText(KAN_LAGES_HVIS)).toBeNull()
  expect(document.querySelector('.flytstatus[data-utfall="kan_ikke"]')).toBeNull()
  expect(within(planpanel()).queryByText(/Ingen plan/)).toBeNull()
})
