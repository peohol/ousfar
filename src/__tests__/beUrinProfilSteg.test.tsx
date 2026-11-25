// @vitest-environment jsdom
/**
 * Fortolkningen av benzoylekgonin i urin med fem utskillelsesprofiler
 * (modellform 2, #570) i en nettleser i minnet, med den syntetiske modellen
 * av form 2: resultatpanelet med marginsetningen, gradene og de to
 * vurderingene, ingen fast merking om tentativ modell, figuren med alle fem
 * profilene, beregningen, høyere margin, samme dato og den samlede vurderingen.
 * Det finnes ingen kommentar eller kopiering.
 *
 * Tallene (CV 0,2 og 0,05, 90 % margin: R_korr = 0,6882 · R_målt):
 * Q 100 → 100 etter 1 døgn gir F ≈ 7,41 mot enkeltinntak, 1,107 mot gjentatte
 * doser, 0,919 mot moderat, 1,014 mot treg (B) og 0,742 mot ekstrem (A).
 */
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import type { BeUrinModellsvar } from '../domain/beUrinModell'
import { BE_URIN_TENTATIV } from '../domain/beUrinVisning'
import { BE_URIN_ROLLENAVN } from '../domain/beUrinProfilvisning'
import { BE_URIN_ROLLER } from '../domain/beUrinProfiler'
import { PROFILMODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { forberedBeUrinDom, fyll, visBeUrin } from './hjelp/beUrinvisning'

forberedBeUrinDom()

const MED_PROFILER: BeUrinModellsvar = { fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' }, modell: PROFILMODELL }

const resultatkort = () => screen.getByRole('heading', { name: 'Resultat' }).closest('.thc-resultat') as HTMLElement
const vurdering = (navn: string) => within(resultatkort()).getByRole('region', { name: navn })

async function visMedProver(forrige: [string, string], denne: [string, string]) {
  visBeUrin(MED_PROFILER)
  await screen.findByRole('group', { name: 'Forrige prøve' })
  await fyll('Forrige prøve', forrige[0], '2', forrige[1])
  await fyll('Denne prøven', denne[0], '2', denne[1])
}

describe('resultatpanelet med fem profiler', () => {
  it('viser marginsetningen, gradene og begge vurderingene, uten merking om tentativ modell og uten kopiering', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const kort = resultatkort()
    const tekst = kort.textContent!
    expect(tekst).toContain('Konsentrasjonsendringene er justert for måleusikkerhet med 90 % sikkerhetsmargin.')
    expect(tekst).toContain('Sammenlignet med det som kan ses ved sporadisk bruk, ligger endringen mellom denne prøven og forrige prøve')
    expect(tekst).toContain('Sammenlignet med det som kan ses ved kronisk bruk, ligger endringen')
    const punkter = within(kort).getAllByRole('listitem').map((li) => li.textContent)
    expect(punkter).toEqual(
      expect.arrayContaining([
        'langt over det som kan ses etter et enkeltinntak',
        'over det som forventes etter gjentatte doser innenfor et kort tidsrom',
        'under det som kan ses ved moderat utskillelse',
        'over det som kan ses ved treg utskillelse',
        'under det som kan ses ved ekstrem utskillelse',
      ]),
    )
    expect(within(kort).getAllByRole('separator')).toHaveLength(3)
    expect(vurdering('Sporadisk bruk lagt til grunn').textContent).toContain('Det er sannsynlig at et nytt inntak har skjedd.')
    expect(vurdering('Kronisk bruk lagt til grunn').textContent).toContain(
      'Det kan ikke fastslås om et nytt inntak har skjedd basert på analyseresultatene alene.',
    )
    expect(screen.queryByText(BE_URIN_TENTATIV)).toBeNull()
    expect(screen.queryByText(/tentativ/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Kopier/ })).toBeNull()
  })

  it('sier at endringene ikke er justert med 50 % margin', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    // Bryteren er et skyvefelt, som også styres med tastaturet.
    fireEvent.change(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }), { target: { value: '0' } })
    expect(resultatkort().textContent).toContain(
      'Konsentrasjonsendringene er ikke justert for måleusikkerhet (50 % sikkerhetsmargin).',
    )
  })

  it('foreslår en høyere margin som gir en mildere vurdering, med hvilken vurdering det gjelder, uten å bytte selv', async () => {
    const user = userEvent.setup()
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const forslag = screen.getByRole('note', { name: 'Vurder høyere sikkerhetsmargin' })
    expect(forslag.textContent).toContain(
      'Med 99 % sikkerhetsmargin blir vurderingen når sporadisk bruk legges til grunn «forenlig med utskillelse etter gjentatte doser».',
    )
    expect(forslag.textContent).not.toContain('kronisk')
    expect(vurdering('Sporadisk bruk lagt til grunn').textContent).toContain('sannsynlig')
    await user.click(within(forslag).getByRole('button', { name: 'Bruk 99 % sikkerhetsmargin' }))
    expect(vurdering('Sporadisk bruk lagt til grunn').textContent).toContain(
      'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom. Et nytt inntak kan ikke fastslås.',
    )
    expect(screen.queryByRole('note', { name: 'Vurder høyere sikkerhetsmargin' })).toBeNull()
  })

  it('viser alle fem profilene i figuren og legenden, med hver sin strek', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const figur = screen.getByRole('img', { name: /de fem utskillelsesprofilene/ })
    const kurver = [...figur.querySelectorAll('polyline')].map((k) => k.getAttribute('class'))
    expect(kurver).toEqual(BE_URIN_ROLLER.map((r) => `thc-plot__kurve be-kurve--${r}`))
    const legende = within(screen.getByRole('list', { name: 'Utskillelsesprofilene' }))
    for (const rolle of BE_URIN_ROLLER) expect(legende.getByText(BE_URIN_ROLLENAVN[rolle])).toBeTruthy()
    // Endepunktene i legenden er motorens terskler.
    expect(legende.getByText(BE_URIN_ROLLENAVN.enkeltinntak).closest('li')!.textContent).toContain('Etter 1 døgn: −91 %')
  })

  it('viser R_målt, R_korr, terskelen og F per profil i beregningen, med enhetene', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const beregning = screen.getByText('Beregningen').closest('details')!
    const tekst = beregning.textContent!
    expect(tekst).toContain('Q1 = 100 nmol/mmol')
    expect(tekst).toMatch(/Rmålt = Q2\/Q1 = 1/)
    expect(tekst).toContain('Rkorr = 0,6882')
    expect(tekst).toContain('Ekstrem utskillelse: bieksponentiell (profil A)')
    expect(tekst).toContain('Treg utskillelse: bieksponentiell (profil B)')
    expect(tekst).toContain('Moderat utskillelse: monoeksponentiell, R = e^(−k·d) med k = 0,2891 per døgn')
    expect(tekst).toMatch(/terskelen R = 0,09287 \(−91 %\)\. F = Rkorr\/R = 7,41: langt over/)
  })

  it('bytter navnene på de to bieksponentielle profilene med referanseprøven', async () => {
    // Q 1 og Q 3,25 etter 1 døgn: profil A er ekstrem ved Q 1, profil B ved Q 3,25.
    await visMedProver(['2', '2026-01-01'], ['2', '2026-01-02'])
    const beregning = () => screen.getByText('Beregningen').closest('details')!.textContent!
    expect(beregning()).toContain('Ekstrem utskillelse: bieksponentiell (profil A)')
    await fyll('Forrige prøve', '6,5', '2', '2026-01-01')
    await fyll('Denne prøven', '6,5', '2', '2026-01-02')
    expect(beregning()).toContain('Ekstrem utskillelse: bieksponentiell (profil B)')
    expect(beregning()).toContain('Treg utskillelse: bieksponentiell (profil A)')
  })

  it('tegner ingen figur samme dag, og sier at et nytt inntak ikke kan fastslås ut fra prøvene alene', async () => {
    await visMedProver(['200', '2026-01-01'], ['400', '2026-01-01'])
    expect(screen.queryByRole('img', { name: /utskillelsesprofilene/ })).toBeNull()
    for (const navn of ['Sporadisk bruk lagt til grunn', 'Kronisk bruk lagt til grunn']) {
      expect(vurdering(navn).textContent).toContain('Et nytt inntak kan ikke fastslås ut fra prøvene alene.')
    }
    expect(resultatkort().textContent).toContain('alle tersklene er da 1')
    expect(screen.getByRole('heading', { name: 'Beregningen' })).toBeTruthy()
  })

  it('viser den samlede vurderingen under kronisk bruk, med datoen og forbeholdet', async () => {
    const user = userEvent.setup()
    visBeUrin(MED_PROFILER)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await user.click(screen.getByLabelText('Samlet vurdering med enda tidligere prøver'))
    expect(screen.getByText(/Er vurderingen ved kronisk bruk uavklart/)).toBeTruthy()
    // Hovedparet er uavklart ved kronisk bruk, men over treg: den samlede vurderingen er aktuell.
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await fyll('Denne prøven', '200', '2', '2026-01-02')
    await fyll('Tidligere prøve', '100', '2', '2025-12-31')
    const kronisk = vurdering('Kronisk bruk lagt til grunn').textContent!
    expect(kronisk).toContain('Det kan ikke fastslås om et nytt inntak har skjedd basert på analyseresultatene alene.')
    expect(kronisk).toContain(
      'Samlet vurdering: mot den tidligere prøven fra 31.12.2025 ligger endringen over det som kan ses ved ekstrem ' +
        'utskillelse. Det er en indikasjon på nytt inntak etter den eldre prøven, ikke nødvendigvis etter forrige prøve.',
    )
    // En tidligere prøve som ikke er før forrige prøve, gir mangler og ingen vurdering.
    fireEvent.change(screen.getByRole('group', { name: 'Tidligere prøve' }).querySelector('input[type=date]')!, {
      target: { value: '2026-01-01' },
    })
    expect(screen.getByText('Den tidligere prøven må være tatt før forrige prøve.')).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Kronisk bruk lagt til grunn' })).toBeNull()
  })

  it('viser enhetene fra modellen i feltene og Q', async () => {
    visBeUrin(MED_PROFILER)
    const forrige = await screen.findByRole('group', { name: 'Forrige prøve' })
    expect(within(forrige).getByLabelText('Benzoylekgonin (nmol/L)')).toBeTruthy()
    expect(within(forrige).getByLabelText('Kreatinin (mmol/L)')).toBeTruthy()
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    expect(within(forrige).getByRole('status').textContent).toBe('Q (benzoylekgonin/kreatinin): 100 nmol/mmol')
  })

  it('tømmer skjemaet når fagmiljøet byttes', async () => {
    const { rerender, steg } = visBeUrin(MED_PROFILER)
    await screen.findByRole('group', { name: 'Forrige prøve' })
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    await act(async () => {
      rerender(steg('b'))
    })
    const felt = (await screen.findByRole('group', { name: 'Forrige prøve' })).querySelector('input') as HTMLInputElement
    expect(felt.value).toBe('')
  })

  it('sier fra om å oppdatere når databasen har en form appen ikke kjenner', async () => {
    visBeUrin({ ...MED_PROFILER, modell: { ...PROFILMODELL, form: 3 } })
    expect((await screen.findByRole('alert')).textContent).toMatch(/ikke gyldig og brukes ikke/)
    expect(screen.queryByRole('group', { name: 'Forrige prøve' })).toBeNull()
  })
})
