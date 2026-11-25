// @vitest-environment jsdom
/**
 * Fortolkningen av benzoylekgonin i urin med modellform 1 i en nettleser i minnet (#562), med
 * en syntetisk katalogoppføring og den syntetiske modellen: henting, felt,
 * Q, resultatet med merkingen, marginen, den samlede vurderingen,
 * nullstillingen, og at det ikke finnes noen kommentar eller kopiering.
 */
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BE_URIN_VENTER } from '../components/BeUrinDeler'
import { beUrinBevaringsnavn } from '../components/BeUrinStep'
import type { BeUrinModellsvar } from '../domain/beUrinModell'
import { search } from '../domain/search'
import { tomBeUrinInndata } from '../domain/beUrinMotor'
import { LAGRINGSNOKKEL, glemBildet } from '../oppdatering/bevaring'
import { BE_URIN_TENTATIV } from '../domain/beUrinVisning'
import { SYNTETISK_MODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { initialState, reducer, stageOf } from '../state'
import { ANALYTT, KATALOG, forberedBeUrinDom, fyll, gruppe, visBeUrin } from './hjelp/beUrinvisning'

forberedBeUrinDom()

const MED_MODELL: BeUrinModellsvar = { fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' }, modell: SYNTETISK_MODELL }

const vis = (svar: BeUrinModellsvar | Error = MED_MODELL, kontekst: string | null = 'a') => visBeUrin(svar, kontekst)

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
    expect(screen.getByText(BE_URIN_VENTER)).toBeTruthy()
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    expect(gruppe('Forrige prøve').getByRole('status').textContent).toBe('Kvotient 25 enhet Q')
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

  it('viser ingen enhet når modellen bruker laboratoriets egne enheter uten navn', async () => {
    vis({ ...MED_MODELL, modell: { ...SYNTETISK_MODELL, enheter: { benzoylekgonin: '', kreatinin: '', kvotient: '' } } })
    await screen.findByRole('group', { name: 'Forrige prøve' })
    expect(gruppe('Forrige prøve').getByLabelText('Benzoylekgonin')).toBeTruthy()
    expect(gruppe('Forrige prøve').getByLabelText('Kreatinin')).toBeTruthy()
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    expect(gruppe('Forrige prøve').getByRole('status').textContent).toBe('Kvotient 25')
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
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
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
    expect(screen.getByRole('alert').textContent).toBe('Tidligere prøve må være tatt før forrige prøve.')
    expect(screen.queryByText('Kan ikke fastslås.')).toBeNull()
  })

  it('sier fra når det samlede treffet er regnet ved ekstrapolasjon, og lar hovedresultatet stå', async () => {
    const user = userEvent.setup()
    vis({ ...MED_MODELL, modell: { ...SYNTETISK_MODELL, maleusikkerhet: { cv_benzoylekgonin: 0.2, cv_kreatinin: 0.05 } } })
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    // Q 25 → 18 etter 3 døgn: kan ikke fastslås, uten ekstrapolasjon. Den eldre prøven (Q 130)
    // ligger over startverdien til begge profilene.
    await fyll('Forrige prøve', '50', '2', '2026-01-10')
    await fyll('Denne prøven', '36', '2', '2026-01-13')
    await fyll('Tidligere prøve', '260', '2', '2025-12-04')
    const resultat = screen.getByRole('heading', { name: 'Resultat' }).closest('.thc-resultat') as HTMLElement
    expect(within(resultat).getByText('Kan ikke fastslås.')).toBeTruthy()
    expect(resultat.textContent).toContain('Samlet vurdering: Nytt inntak etter 04.12.2025 (modellindikasjon).')
    const merknader = within(resultat).getAllByRole('note').map((n) => n.textContent)
    expect(merknader).toContain(
      'Samlet vurdering: Den tidligere prøven fra 04.12.2025 ligger over startverdien til minst én utskillelsesprofil. ' +
        'Terskelen er regnet ved matematisk ekstrapolasjon, et område modellen ikke er dokumentert for.',
    )
    // Hovedsammenligningen er ikke ekstrapolert, så den merknaden står ikke.
    expect(merknader.some((t) => t?.startsWith('Forrige prøve ligger over'))).toBe(false)
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

  it('tar ikke med tidligere prøver som var slått av i et skjema fra før #576', async () => {
    const gammelt = {
      ...tomBeUrinInndata(SYNTETISK_MODELL),
      forrige: { benzoylekgonin: '50', kreatinin: '2', dato: '2026-01-01' },
      samletVurdering: false,
      tidligere: [{ benzoylekgonin: '26', kreatinin: '2', dato: '2025-12-31' }],
    }
    sessionStorage.setItem(
      LAGRINGSNOKKEL,
      JSON.stringify({ tatt: Date.now(), verdier: { [beUrinBevaringsnavn('a', SYNTETISK_MODELL.versjon)]: gammelt }, rulling: [] }),
    )
    vis()
    const forrige = await screen.findByRole('group', { name: 'Forrige prøve' })
    expect((forrige.querySelector('input') as HTMLInputElement).value).toBe('50')
    expect(screen.queryByRole('group', { name: /Tidligere prøve/ })).toBeNull()
  })

  it('tømmer skjemaet når fagmiljøet byttes', async () => {
    const { rerender, steg } = vis()
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '50', '2', '2026-01-01')
    await act(async () => {
      rerender(steg('b'))
    })
    const felt = (await screen.findByRole('group', { name: 'Forrige prøve' })).querySelector('input') as HTMLInputElement
    expect(felt.value).toBe('')
  })
})
