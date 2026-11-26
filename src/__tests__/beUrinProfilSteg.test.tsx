// @vitest-environment jsdom
/**
 * Fortolkningen av benzoylekgonin i urin med fem utskillelsesprofiler
 * (modellform 2, #570, forenklet i #576) i en nettleser i minnet, med den
 * syntetiske modellen av form 2: skjemaet med feltene, kvotienten, de
 * tidligere prøvene og sikkerhetsmarginen; de to vurderingene først, med det
 * en høyere margin ville gitt; profiltabellen og figuren, og forklaringen,
 * lukket under hver sin overskrift. Ingen bannere, ingen formler, ingen
 * merknader om ekstrapolasjon, ingen kopiering.
 *
 * Tallene (CV 0,2 og 0,05, 90 % margin: endringen som fortolkes er 0,6882 ·
 * den målte): Q 100 → 100 etter 1 døgn gir F ≈ 7,41 mot enkeltinntak, 1,107
 * mot gjentatte doser, 0,919 mot moderat, 1,014 mot treg og 0,742 mot ekstrem.
 */
import { act, fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { BE_URIN_VENTER } from '../components/BeUrinDeler'
import { FOR_STOR_TIL_FIGUR } from '../components/BeUrinPlot'
import type { BeUrinModellsvar } from '../domain/beUrinModell'
import { SAMME_DAG_FEIL } from '../domain/beUrinMotor'
import { BE_URIN_ROLLER } from '../domain/beUrinProfiler'
import { BE_URIN_FORUTSETNING, BE_URIN_KVALITATIV, BE_URIN_ROLLENAVN } from '../domain/beUrinProfilvisning'
import { BE_URIN_TENTATIV } from '../domain/beUrinVisning'
import { PROFILMODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { marginbeskrivelse, marginbobler } from './hjelp/marginbobler'
import { forberedBeUrinDom, fyll, gruppe, visBeUrin } from './hjelp/beUrinvisning'

forberedBeUrinDom()

const MED_PROFILER: BeUrinModellsvar = { fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' }, modell: PROFILMODELL }

const SPORADISK = 'Sporadisk bruk lagt til grunn'
const KRONISK = 'Kronisk bruk lagt til grunn'
const vurdering = (navn: string) => screen.getByRole('region', { name: navn })
const seksjon = (navn: string) => screen.getByText(navn, { selector: '.detalj__tekst' }).closest('details') as HTMLDetailsElement

async function vis() {
  visBeUrin(MED_PROFILER)
  await screen.findByRole('group', { name: 'Forrige prøve' })
}

async function visMedProver(forrige: [string, string], denne: [string, string]) {
  await vis()
  await fyll('Forrige prøve', forrige[0], '2', forrige[1])
  await fyll('Denne prøven', denne[0], '2', denne[1])
}

describe('resultatet med fem profiler', () => {
  it('gir de to vurderingene først, kort, uten banner, marginsetning, merking om tentativ modell eller kopiering', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    expect(vurdering(SPORADISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Sannsynlig nytt inntak.')
    expect(vurdering(KRONISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Nytt inntak kan ikke fastslås.')
    // Ingen overskrift «Resultat», ingen merknad om justering, ingen banner.
    expect(screen.queryByRole('heading', { name: 'Resultat' })).toBeNull()
    expect(document.body.textContent).not.toMatch(/justert for måleusikkerhet|Konsentrasjonsendringene/)
    expect(screen.queryByRole('note')).toBeNull()
    expect(screen.queryByText(BE_URIN_TENTATIV)).toBeNull()
    expect(screen.queryByText(/tentativ/i)).toBeNull()
    expect(screen.queryByRole('button', { name: /Kopier/ })).toBeNull()
    // Vurderingene står før profilene og forklaringen.
    const rekkefolge = [vurdering(SPORADISK), vurdering(KRONISK), seksjon('Utskillelsesprofiler og figur'), seksjon('Forklaring')]
    for (let i = 1; i < rekkefolge.length; i++) {
      expect(rekkefolge[i - 1]!.compareDocumentPosition(rekkefolge[i]!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    }
    // Forbeholdet om eliminasjonsfasen står kort under vurderingene.
    expect(screen.getByText(BE_URIN_FORUTSETNING)).toBeTruthy()
  })

  it('gir utdypingen når endringen er forenlig med enkeltinntak eller gjentatte doser', async () => {
    await visMedProver(['200', '2026-01-01'], ['2', '2026-01-03'])
    expect(vurdering(SPORADISK).textContent).toContain(
      'Nytt inntak kan ikke fastslås.Endringen er forenlig med utskillelse etter et enkeltinntak.',
    )
    expect(vurdering(KRONISK).textContent).toBe(`${KRONISK}Nytt inntak kan ikke fastslås.`)
  })

  it('gir «Nytt inntak.» ved en stor økning, og bemerkningen om svært uvanlig utskillelse ved kronisk bruk', async () => {
    await visMedProver(['200', '2026-01-01'], ['2000', '2026-01-02'])
    expect(vurdering(SPORADISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Nytt inntak.')
    expect(vurdering(KRONISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Nytt inntak.')
    await fyll('Denne prøven', '250', '2', '2026-01-02')
    expect(vurdering(KRONISK).textContent).toContain(
      'Nytt inntak kan ikke fastslås.En såpass treg utskillelse anses likevel som svært uvanlig.',
    )
  })

  it('viser i en snakkeboble ved marginen hva en høyere margin ville gitt, uten å bytte selv', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    expect(marginbobler()).toEqual([{ side: 'over', margin: '99 %', linjer: ['Sporadisk: Kan ikke fastslås'] }])
    expect(marginbeskrivelse()).toEqual([
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
    ])
    expect(screen.queryByRole('button', { name: /Bruk 99 %/ })).toBeNull()
    // Ingenting om marginen ved vurderingene.
    expect(vurdering(SPORADISK).textContent).not.toContain('sikkerhetsmargin')
    // Med 99 % står den mildere vurderingen, og ingen boble.
    fireEvent.change(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }), { target: { value: '2' } })
    expect(vurdering(SPORADISK).textContent).toContain(
      'Nytt inntak kan ikke fastslås.Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
    )
    expect(marginbobler()).toEqual([])
  })

  it('legger to bobler over og under bryteren, og skiller de to «kan ikke fastslås» ved kronisk bruk for skjermlesere', async () => {
    // BE 200 → 240 etter ett døgn uten margin: sannsynlig ved begge; 90 % gir «svært uvanlig», 99 % ikke.
    await visMedProver(['200', '2026-01-01'], ['240', '2026-01-02'])
    fireEvent.change(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }), { target: { value: '0' } })
    expect(marginbeskrivelse()).toEqual([
      'Ved 90 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'En såpass treg utskillelse anses likevel som svært uvanlig.',
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås.',
    ])
    // Boblene sier konklusjonen kort, og «kan ikke fastslås» ved kronisk bruk står bare ved 90 %.
    expect(marginbobler()).toEqual([
      { side: 'over', margin: '90 %', linjer: ['Kronisk: Kan ikke fastslås'] },
      { side: 'under', margin: '99 %', linjer: ['Sporadisk: Kan ikke fastslås'] },
    ])
    // Ved 90 % er kronisk alt «kan ikke fastslås»: at bemerkningen faller bort ved 99 %, gir ingen boble.
    fireEvent.change(screen.getByRole('slider', { name: 'Sikkerhetsmargin' }), { target: { value: '1' } })
    expect(marginbobler()).toEqual([{ side: 'over', margin: '99 %', linjer: ['Sporadisk: Kan ikke fastslås'] }])
    expect(marginbeskrivelse()).toEqual([
      'Ved 99 % sikkerhetsmargin blir vurderingen ved sporadisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Endringen er forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.',
      'Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Nytt inntak kan ikke fastslås. ' +
        'Uten bemerkningen om svært uvanlig utskillelse.',
    ])
  })

  it('sier fra når «Nytt inntak» blir «Sannsynlig nytt inntak» med høyere margin', async () => {
    await visMedProver(['200', '2026-01-01'], ['1600', '2026-01-02'])
    expect(vurdering(KRONISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Nytt inntak.')
    expect(marginbobler()).toEqual([{ side: 'over', margin: '99 %', linjer: ['Kronisk: Sannsynlig nytt inntak'] }])
    expect(marginbeskrivelse()).toEqual(['Ved 99 % sikkerhetsmargin blir vurderingen ved kronisk bruk: Sannsynlig nytt inntak.'])
  })

  it('har profiltabellen og figuren lukket, med alle fem profilene, hver med sin strek, og ett valg for alle marginer', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const profiler = seksjon('Utskillelsesprofiler og figur')
    expect(profiler.open).toBe(false)
    const tabell = within(profiler).getByRole('table')
    const rader = within(tabell)
      .getAllByRole('row')
      .map((rad) => [...rad.querySelectorAll('th, td')].map((c) => c.textContent))
    expect(rader).toEqual([
      ['Utskillelsesprofil', 'Forventet endring etter 1 døgn', 'Endringen ligger'],
      ['Sporadisk bruk'],
      ['Enkeltinntak', '−91 %', 'langt over'],
      ['Gjentatte doser', '−38 %', 'over'],
      ['Kronisk bruk'],
      ['Moderat utskillelse', '−25 %', 'under'],
      ['Treg utskillelse', '−32 %', 'over'],
      ['Ekstrem utskillelse', '−7 %', 'under'],
    ])
    for (const rolle of BE_URIN_ROLLER) {
      const navn = within(tabell).getByText(BE_URIN_ROLLENAVN[rolle])
      expect(navn.querySelector(`.be-kurve--${rolle}`)).toBeTruthy()
    }
    const figur = within(profiler).getByRole('img', { name: /de fem utskillelsesprofilene/ })
    expect([...figur.querySelectorAll('polyline')].map((k) => k.getAttribute('class'))).toEqual(
      BE_URIN_ROLLER.map((r) => `thc-plot__kurve be-kurve--${r}`),
    )
    // Ingen egen legende: tabellen er tegnforklaringen.
    expect(screen.queryByRole('list', { name: 'Utskillelsesprofilene' })).toBeNull()
    const alle = within(profiler).getByRole('checkbox', { name: 'Vis alle sikkerhetsmarginer' }) as HTMLInputElement
    expect(alle.checked).toBe(false)
    expect(screen.queryByRole('slider', { name: 'Visualisering' })).toBeNull()
  })

  it('har forklaringen lukket, med de fire spørsmålene, uten formler eller ekstrapolasjon', async () => {
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    const forklaring = seksjon('Forklaring')
    expect(forklaring.open).toBe(false)
    expect(within(forklaring).getAllByRole('heading').map((h) => h.textContent)).toEqual([
      'Hvor stor er endringen mellom prøvene?',
      'Hvordan er det tatt hensyn til måleusikkerhet?',
      'Hva kan forventes dersom det ikke har skjedd et nytt inntak?',
      'Hvorfor blir konklusjonen slik?',
    ])
    const tekst = forklaring.textContent!
    expect(tekst).toContain('Kvotienten er 100 nmol/mmol i forrige prøve (01.01.2026) og 100 nmol/mmol i denne prøven')
    expect(tekst).toContain('Med 90 % sikkerhetsmargin legges en mer forsiktig endring til grunn')
    expect(tekst).toContain('Dersom sporadisk bruk legges til grunn, er et nytt inntak derfor sannsynlig.')
    expect(tekst).toContain(BE_URIN_KVALITATIV)
    expect(screen.queryByText('Beregningen')).toBeNull()
    expect(document.body.textContent).not.toMatch(/ekstrapol|Rkorr|Rmålt|e\^|bieksponentiell|profil A|\bSD\b|logaritm/i)
  })

  it('viser ingen merknad om ekstrapolasjon når forrige prøve ligger over startverdien, heller ikke i forklaringen', async () => {
    // BE 300 / kreatinin 2 gir Q 150, over startverdien til begge de bieksponentielle profilene
    // (om lag 111 og 120): tersklene er ekstrapolert i motoren (testet i beUrinProfilforklaring.test.ts).
    await visMedProver(['300', '2026-01-01'], ['250', '2026-01-03'])
    expect(vurdering(SPORADISK)).toBeTruthy()
    expect(seksjon('Forklaring').textContent).toContain('Hvorfor blir konklusjonen slik?')
    expect(document.body.textContent).not.toMatch(/ekstrapol|startverdi|utenfor (dataene|modellen)|ikke dokumentert/i)
  })

  it('viser ingen merknad om ekstrapolasjon etter svært lang tid', async () => {
    await visMedProver(['200', '2025-01-01'], ['200', '2026-01-01'])
    expect(vurdering(SPORADISK)).toBeTruthy()
    expect(document.body.textContent).not.toMatch(/ekstrapol|startverdi|utenfor (dataene|modellen)|ikke dokumentert/i)
  })

  it('vurderer en endring for stor for flyttallene, uten å tegne en ødelagt figur', async () => {
    // Q 1e−10 → 1e300 etter 1 døgn: Q2/Q1 overflyter, men logaritmene gir vurderingen.
    await visMedProver(['0,0000000002', '2026-01-01'], [`2${'0'.repeat(300)}`, '2026-01-02'])
    expect(vurdering(SPORADISK).textContent).toContain('Nytt inntak.')
    expect(screen.queryByRole('img', { name: /utskillelsesprofilene/ })).toBeNull()
    expect(screen.getByText(FOR_STOR_TIL_FIGUR)).toBeTruthy()
    const tekst = seksjon('Forklaring').textContent!
    expect(tekst).toContain('en svært stor økning')
    expect(tekst).not.toMatch(/Infinity|NaN/)
  })
})

describe('skjemaet', () => {
  it('viser enhetene fra modellen i feltene og kvotienten diskret under', async () => {
    await vis()
    const forrige = screen.getByRole('group', { name: 'Forrige prøve' })
    expect(within(forrige).getByLabelText('Benzoylekgonin (nmol/L)')).toBeTruthy()
    expect(within(forrige).getByLabelText('Kreatinin (mmol/L)')).toBeTruthy()
    expect(within(forrige).getByRole('status').textContent).toBe('Kreatinin-normalisert konsentrasjon –')
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    expect(within(forrige).getByRole('status').textContent).toBe('Kreatinin-normalisert konsentrasjon 100 nmol/mmol')
  })

  it('viser ingen liste over det som mangler, bare at vurderingen kommer', async () => {
    await vis()
    expect(screen.getByText(BE_URIN_VENTER)).toBeTruthy()
    await fyll('Forrige prøve', '200', '2', '2026-01-01')
    expect(screen.getByText(BE_URIN_VENTER)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(document.body.textContent).not.toMatch(/Fyll inn/)
  })

  it('sier kort ved feltet hva som er ugyldig, og knytter det til feltet', async () => {
    await visMedProver(['200', '2026-01-01'], ['0', '2026-01-02'])
    const felt = gruppe('Denne prøven').getByLabelText(/^Benzoylekgonin/)
    expect(felt.getAttribute('aria-invalid')).toBe('true')
    expect(document.getElementById(felt.getAttribute('aria-describedby')!)!.textContent).toBe('Må være kvantifisert og over 0.')
    expect(screen.queryByRole('region', { name: SPORADISK })).toBeNull()
    fireEvent.change(gruppe('Denne prøven').getByLabelText(/^Kreatinin/), { target: { value: '0' } })
    expect(gruppe('Denne prøven').getByText('Må være over 0.')).toBeTruthy()
    fireEvent.change(felt, { target: { value: '100' } })
    expect(felt.getAttribute('aria-invalid')).toBeNull()
  })

  it('sammenligner ikke prøver fra samme dag, og sier fra om det', async () => {
    await visMedProver(['200', '2026-01-01'], ['400', '2026-01-01'])
    expect(screen.getByRole('alert').textContent).toBe(SAMME_DAG_FEIL)
    expect(screen.queryByRole('region', { name: SPORADISK })).toBeNull()
    expect(screen.queryByRole('img', { name: /utskillelsesprofilene/ })).toBeNull()
    expect(screen.queryByText('Forklaring')).toBeNull()
  })

  it('har informasjonstegnet ved sikkerhetsmarginen, med forklaringen for skjermlesere', async () => {
    await vis()
    const info = screen.getByRole('button', { name: 'Om sikkerhetsmarginen' })
    const beskrivelse = document.getElementById(info.getAttribute('aria-describedby')!)!.textContent!
    expect(beskrivelse).toContain('Marginen gjelder bare måleusikkerheten, ikke sannsynligheten for at selve fortolkningen er riktig.')
    expect(beskrivelse).toContain('90 % (standard)')
    expect(screen.queryByText('Hva er sikkerhetsmarginen?')).toBeNull()
    const margin = screen.getByRole('slider', { name: 'Sikkerhetsmargin' })
    expect(margin.getAttribute('aria-valuetext') ?? (margin as HTMLInputElement).value).toBeTruthy()
  })

  it('legger til og fjerner tidligere prøver med knapper, og flytter fokuset med', async () => {
    const user = userEvent.setup()
    await vis()
    expect(screen.queryByRole('checkbox', { name: /Samlet vurdering/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    expect(document.activeElement).toBe(gruppe('Tidligere prøve').getByLabelText(/^Benzoylekgonin/))
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    expect(screen.getByRole('group', { name: 'Tidligere prøve 1' })).toBeTruthy()
    expect(document.activeElement).toBe(gruppe('Tidligere prøve 2').getByLabelText(/^Benzoylekgonin/))
    await user.click(screen.getByRole('button', { name: 'Fjern tidligere prøve 1' }))
    expect(screen.queryByRole('group', { name: 'Tidligere prøve 2' })).toBeNull()
    expect(screen.getByRole('group', { name: 'Tidligere prøve' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    await user.click(screen.getByRole('button', { name: 'Fjern tidligere prøve' }))
    expect(screen.queryByRole('group', { name: /Tidligere prøve/ })).toBeNull()
  })

  it('viser indikasjonen etter en eldre prøve rett under vurderingen ved kronisk bruk, med datoen', async () => {
    const user = userEvent.setup()
    // Hovedparet er uavklart ved kronisk bruk, men over treg: den samlede vurderingen er aktuell.
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    // En tidligere prøve som ikke er fylt ut, gir ingen vurdering ennå, og ingen feilmelding.
    expect(screen.queryByRole('region', { name: KRONISK })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    await fyll('Tidligere prøve', '100', '2', '2025-12-31')
    const samlet = vurdering(KRONISK).querySelector('.be-vurdering__samlet')!
    expect(samlet.textContent).toBe(
      'Sammenlignet med prøven fra 31.12.2025 er det indikasjon på nytt inntak etter den prøven, men ikke ' +
        'nødvendigvis etter forrige prøve.',
    )
    expect(vurdering(KRONISK).querySelector('.be-vurdering__konklusjon')!.textContent).toBe('Nytt inntak kan ikke fastslås.')
    // Ved kronisk bruk endrer en høyere margin bare indikasjonen etter den tidligere prøven, og boblen sier det.
    expect(marginbobler()).toEqual([
      {
        side: 'over',
        margin: '99 %',
        linjer: ['Sporadisk: Kan ikke fastslås', 'Kronisk: Ingen indikasjon etter tidligere prøve'],
      },
    ])
    // En tidligere prøve som ikke er før forrige prøve, gir en kort feil og ingen vurdering.
    fireEvent.change(gruppe('Tidligere prøve').getByLabelText('Prøvedato'), { target: { value: '2026-01-01' } })
    expect(screen.getByRole('alert').textContent).toBe('Tidligere prøve må være tatt før forrige prøve.')
    expect(screen.queryByRole('region', { name: KRONISK })).toBeNull()
  })

  it('tømmer skjemaet med Nullstill og gir fokuset til det første feltet', async () => {
    const user = userEvent.setup()
    await visMedProver(['200', '2026-01-01'], ['200', '2026-01-02'])
    await user.click(screen.getByRole('button', { name: '+ Legg til tidligere prøve' }))
    await user.click(screen.getByRole('button', { name: 'Nullstill' }))
    await act(async () => {})
    const forste = gruppe('Forrige prøve').getByLabelText(/^Benzoylekgonin/) as HTMLInputElement
    expect(forste.value).toBe('')
    expect(document.activeElement).toBe(forste)
    expect(screen.queryByRole('group', { name: /Tidligere prøve/ })).toBeNull()
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
