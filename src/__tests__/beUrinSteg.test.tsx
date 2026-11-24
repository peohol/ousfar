// @vitest-environment jsdom
/**
 * Fortolkningen av benzoylekgonin i urin i en nettleser i minnet (#562), med
 * en syntetisk katalogoppføring og den syntetiske modellen: henting, felt,
 * Q, resultatet med merkingen, marginen, den samlede vurderingen,
 * nullstillingen, og at det ikke finnes noen kommentar eller kopiering.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { BeUrinStep, beUrinBevaringsnavn } from '../components/BeUrinStep'
import { TipsLag } from '../components/Tips'
import { byggKatalog, type Katalogoppforing } from '../domain/analyttkatalog'
import type { BeUrinModellsvar } from '../domain/beUrinModell'
import { search } from '../domain/search'
import { tomBeUrinInndata } from '../domain/beUrinMotor'
import { LAGRINGSNOKKEL, glemBildet } from '../oppdatering/bevaring'
import { BE_URIN_TENTATIV } from '../domain/beUrinVisning'
import { SYNTETISK_MODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { ShortcutVisibilityProvider } from '../hooks/useShortcutVisibility'
import { initialState, reducer, stageOf } from '../state'
import { medPekerhendelser } from './hjelp/pekerhendelser'

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

/** En syntetisk oppføring: den lokale urinkoden er ikke avklart (docs/benzoylekgonin-urin.md). */
const OPPFORING: Katalogoppforing = {
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
const KATALOG = byggKatalog({ fagmiljo: null, metoder: [{ kode: 'TESTU', beskrivelse: 'Test i urin' }], oppforinger: [OPPFORING] })
const ANALYTT = KATALOG.modulMedId('be-urin-test')!

const MED_MODELL: BeUrinModellsvar = { fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' }, modell: SYNTETISK_MODELL }

function vis(svar: BeUrinModellsvar | Error = MED_MODELL, kontekst: string | null = 'a') {
  const hent = vi.fn(async () => {
    if (svar instanceof Error) throw svar
    return svar
  })
  const utfall = render(
    <TipsLag>
      <ShortcutVisibilityProvider>
        <BeUrinStep analyte={ANALYTT} hentModell={hent} kontekst={kontekst} onBack={vi.fn()} />
      </ShortcutVisibilityProvider>
    </TipsLag>,
  )
  return { hent, ...utfall }
}

const gruppe = (navn: string) => within(screen.getByRole('group', { name: navn }))

async function fyll(navn: string, be: string, kreatinin: string, dato: string) {
  const g = gruppe(navn)
  fireEvent.change(g.getByLabelText(/^Benzoylekgonin/), { target: { value: be } })
  fireEvent.change(g.getByLabelText(/^Kreatinin/), { target: { value: kreatinin } })
  fireEvent.change(g.getByLabelText('Prøvedato'), { target: { value: dato } })
}

describe('oppføringen', () => {
  it('åpner sin egen modul fra søket, også med «kokain»', () => {
    expect(search('kokain', KATALOG.fortolkninger).map((h) => h.analyte.visningsnavn)).toEqual(['Benzoylekgonin i urin'])
    const tilstand = reducer(initialState, { type: 'velg-analytt', analyte: ANALYTT })
    expect(stageOf(tilstand)).toBe('be_urin')
    expect(stageOf(reducer(tilstand, { type: 'tilbake' }))).toBe('search')
  })
})

describe('fortolkningsmodulen for benzoylekgonin i urin', () => {
  it('fortolker ingenting uten en modell i fagmiljøet', async () => {
    vis({ fagmiljo: { id: 'b', navn: 'Et annet fagmiljø' }, modell: null })
    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Modellen for benzoylekgonin i urin er ikke satt opp i Et annet fagmiljø. Si fra til en systemarkitekt.',
    )
    expect(screen.queryByRole('textbox')).toBeNull()
  })

  it('fortolker ingenting med en ugyldig modell, og sier fra når den ikke kan hentes', async () => {
    vis({ ...MED_MODELL, modell: { ...SYNTETISK_MODELL, maleusikkerhet: { cv_benzoylekgonin: 0, cv_kreatinin: 0.05 } } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/ikke gyldig og brukes ikke/)
    cleanup()
    vis(new Error('Nede.'))
    expect((await screen.findByRole('alert')).textContent).toBe('Fortolkningsreglene kunne ikke hentes. Nede.')
  })

  it('viser Q med enhetene, resultatet med merkingen, og ingen kommentar eller kopiering', async () => {
    vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    expect(screen.getByText('Fyll inn benzoylekgonin for forrige prøve.')).toBeTruthy()
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    expect(gruppe('Forrige prøve').getByRole('status').textContent).toBe('Q (benzoylekgonin/kreatinin): 25 enhet Q')
    expect(gruppe('Forrige prøve').getByLabelText('Benzoylekgonin (enhet B)')).toBeTruthy()
    await fyll('Denne prøven', '52,5', '2', '2026-01-04')
    const resultat = screen.getByRole('heading', { name: 'Resultat' }).closest('.thc-resultat') as HTMLElement
    expect(within(resultat).getByText(BE_URIN_TENTATIV)).toBeTruthy()
    expect(within(resultat).getByText('Nytt inntak.')).toBeTruthy()
    expect(within(resultat).getByText(/ikke et bevis/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Kopier/ })).toBeNull()
    expect(screen.queryByText(/Ingen tidligere prøve/)).toBeNull()
    expect(screen.queryByText(/kronisk/i)).toBeNull()
    // Visualiseringen og beregningen med motorens tall.
    expect(screen.getByRole('img', { name: /utskillelsesprofilene/ })).toBeTruthy()
    expect(screen.getAllByText(/Utskillelsesprofil 1/).length).toBeGreaterThan(0)
  })

  it('gjør ingenting på Enter eller mellomrom', async () => {
    const user = userEvent.setup()
    const skriv = vi.spyOn(navigator.clipboard ?? { writeText: async () => {} }, 'writeText')
    vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    await fyll('Denne prøven', '52,5', '2', '2026-01-04')
    gruppe('Denne prøven').getByLabelText(/^Kreatinin/).focus()
    await user.keyboard('{Enter} ')
    expect(skriv).not.toHaveBeenCalled()
    expect(screen.getByText('Nytt inntak.')).toBeTruthy()
  })

  it('foreslår en høyere margin som gir et mildere resultat, uten å bytte selv', async () => {
    const user = userEvent.setup()
    vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    // Q 25 → 26,25 etter 3 døgn: nytt inntak med 90 % (standard), «kan ikke fastslås» med 99 %.
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    await fyll('Denne prøven', '52,5', '2', '2026-01-04')
    expect(screen.getByText('Nytt inntak.')).toBeTruthy()
    const forslag = screen.getByRole('note', { name: 'Vurder høyere sikkerhetsmargin' })
    expect(forslag.textContent).toContain('Med 99 % sikkerhetsmargin endres resultatet til «kan ikke fastslås».')
    await user.click(within(forslag).getByRole('button', { name: 'Bruk 99 % sikkerhetsmargin' }))
    expect(screen.getByText('Kan ikke fastslås.')).toBeTruthy()
    expect(screen.queryByRole('note', { name: 'Vurder høyere sikkerhetsmargin' })).toBeNull()
  })

  it('viser nytt inntak etter en eldre prøve separat, og lar hovedresultatet stå', async () => {
    const user = userEvent.setup()
    vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await user.click(screen.getByLabelText('Samlet vurdering med enda tidligere prøver'))
    expect(screen.getByText('Fyll inn benzoylekgonin for den tidligere prøven.')).toBeTruthy()
    // Forrige Q 25 → denne Q 18 etter 3 døgn: kan ikke fastslås. Mot Q 13 dagen før: over begge.
    await fyll('Forrige prøve', '50', '2', '2026-01-10')
    await fyll('Denne prøven', '36', '2', '2026-01-13')
    await fyll('Tidligere prøve', '26', '2', '2026-01-09')
    const tekst = screen.getByRole('heading', { name: 'Resultat' }).closest('.thc-resultat')!.textContent!
    expect(tekst).toContain('Kan ikke fastslås.')
    expect(tekst).toContain('Samlet vurdering: Nytt inntak etter 09.01.2026 (modellindikasjon).')
    expect(tekst).not.toContain('Nytt inntak.')
    // En tidligere prøve som ikke er før forrige prøve, fortolkes ikke.
    fireEvent.change(gruppe('Tidligere prøve').getByLabelText('Prøvedato'), { target: { value: '2026-01-10' } })
    expect(screen.getByText('Den tidligere prøven må være tatt før forrige prøve.')).toBeTruthy()
    expect(screen.queryByText('Kan ikke fastslås.')).toBeNull()
  })

  it('nullstiller skjemaet og setter fokus i første felt', async () => {
    const user = userEvent.setup()
    vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    await user.click(screen.getByRole('button', { name: 'Nullstill' }))
    const forste = gruppe('Forrige prøve').getByLabelText(/^Benzoylekgonin/) as HTMLInputElement
    expect(forste.value).toBe('')
    expect(document.activeElement).toBe(forste)
  })

  it('tar tilbake skjemaet etter en oppdatering bare med samme fagmiljø og modellversjon', async () => {
    const fylt = (be: string) => ({
      ...tomBeUrinInndata(SYNTETISK_MODELL),
      forrige: { benzoylekgonin: be, kreatinin: '2', dato: '2026-01-01' },
    })
    const bilde = (navn: string, be: string) =>
      sessionStorage.setItem(LAGRINGSNOKKEL, JSON.stringify({ tatt: Date.now(), verdier: { [navn]: fylt(be) }, rulling: [] }))
    const forsteFelt = async () =>
      ((await screen.findByRole('group', { name: 'Forrige prøve' })).querySelector('input') as HTMLInputElement).value

    // En annen modellversjon: de gamle verdiene fortolkes ikke med den nye modellen.
    bilde(beUrinBevaringsnavn('a', 'en-eldre-versjon'), '77')
    vis()
    expect(await forsteFelt()).toBe('')
    cleanup()
    glemBildet()

    bilde(beUrinBevaringsnavn('a', SYNTETISK_MODELL.versjon), '50')
    vis()
    expect(await forsteFelt()).toBe('50')
  })

  it('tømmer skjemaet når fagmiljøet byttes', async () => {
    const { rerender, hent } = vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    await act(async () => {
      rerender(
        <TipsLag>
          <ShortcutVisibilityProvider>
            <BeUrinStep analyte={ANALYTT} hentModell={hent} kontekst="b" onBack={vi.fn()} />
          </ShortcutVisibilityProvider>
        </TipsLag>,
      )
    })
    const felt = (await screen.findByRole('group', { name: 'Forrige prøve' })).querySelector('input') as HTMLInputElement
    expect(felt.value).toBe('')
  })
})
