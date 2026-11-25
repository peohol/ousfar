/**
 * Det testene av modulen for benzoylekgonin i urin i en nettleser i minnet
 * har felles: oppsettet av DOM-en, en syntetisk katalogoppføring, visningen
 * med en modell og utfyllingen av en prøve.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, vi } from 'vitest'
import { BeUrinStep } from '../../components/BeUrinStep'
import { TipsLag } from '../../components/Tips'
import { byggKatalog, type Katalogoppforing } from '../../domain/analyttkatalog'
import type { BeUrinModellsvar } from '../../domain/beUrinModell'
import { ShortcutVisibilityProvider } from '../../hooks/useShortcutVisibility'
import { glemBildet } from '../../oppdatering/bevaring'
import { medPekerhendelser } from './pekerhendelser'

/** Oppsettet av DOM-en før og etter hver test. Kalles øverst i testfila. */
export function forberedBeUrinDom() {
  beforeAll(() => {
    globalThis.ResizeObserver ??= class {
      observe() {}
      unobserve() {}
      disconnect() {}
    }
    Element.prototype.scrollIntoView ??= function () {}
    window.scrollBy = () => {}
    medPekerhendelser()
  })

  afterEach(() => {
    cleanup()
    sessionStorage.clear()
    glemBildet()
  })
}

/** En syntetisk oppføring, ikke den aktiverte. */
export const OPPFORING: Katalogoppforing = {
  nokkel: 'be-urin-test',
  type: 'be_urin',
  navn: 'Benzoylekgonin',
  visningsnavn: 'Benzoylekgonin i urin',
  undertittel: null,
  komponenter: [],
  gruppe: 'Rusmiddelanalyse',
  analysemetode: 'TESTU',
  kategori: '',
  enhet: '',
  maleomrade: { tekst: '', deler: [] },
  antihypertensiv: null,
  aliaser: ['kokain'],
  koder: [{ kode: 'TESTBEU', navn: 'Benzoylekgonin', referanseomrade: null }],
}
export const KATALOG = byggKatalog({ fagmiljo: null, metoder: [{ kode: 'TESTU', beskrivelse: 'Test i urin' }], oppforinger: [OPPFORING] })
export const ANALYTT = KATALOG.modulMedId('be-urin-test')!

/** Modulen med svaret som hentes (eller feilen), i arbeidskonteksten. */
export function visBeUrin(svar: BeUrinModellsvar | Error, kontekst: string | null = 'a') {
  const hent = vi.fn(async () => {
    if (svar instanceof Error) throw svar
    return svar
  })
  const steg = (k: string | null) => (
    <TipsLag>
      <ShortcutVisibilityProvider>
        <BeUrinStep analyte={ANALYTT} hentModell={hent} kontekst={k} onBack={vi.fn()} />
      </ShortcutVisibilityProvider>
    </TipsLag>
  )
  const utfall = render(steg(kontekst))
  return { hent, steg, ...utfall }
}

export const gruppe = (navn: string) => within(screen.getByRole('group', { name: navn }))

/** Fyller inn én prøve. */
export async function fyll(navn: string, be: string, kreatinin: string, dato: string) {
  const g = gruppe(navn)
  fireEvent.change(g.getByLabelText(/^Benzoylekgonin/), { target: { value: be } })
  fireEvent.change(g.getByLabelText(/^Kreatinin/), { target: { value: kreatinin } })
  fireEvent.change(g.getByLabelText('Prøvedato'), { target: { value: dato } })
}
