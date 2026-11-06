// @vitest-environment jsdom
/**
 * Verktøysidene (`#/verktoy`, P6 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Oversikten viser de fire verktøyene og at ingen beregning er tilgjengelig
 *   så lenge ingen regel er klinisk godkjent; en ukjent adresse sier fra.
 * - Med pilotreglene står det at faglig kontroll gjenstår, uten skjema,
 *   uten henting fra FEST og uten tabell.
 * - Med en regel godkjent bare i testen og syntetiske preparater i FESTs form
 *   går siden gjennom de fire stegene (§3 i
 *   `docs/verktøy-brukervennlighet-2026-11.md`): steg 2 ber om formulering og
 *   form når dosen er fylt inn, og planen beregnes av seg selv når alt er
 *   besvart, uten en «Beregn»-knapp. Den vises som en tidslinje, kopieres og
 *   skrives ut. Endrede inndata gir en ny beregning; foreldet FEST og en ny dag
 *   tar planen bort.
 * - Det som er fylt inn, kommer tilbake etter en oppdatering av appen; planen
 *   beregnes da på nytt med FEST lest og godkjenningen kontrollert på nytt.
 * - En regel som lar forskriveren justere en verdi, får et felt for den; et
 *   valg innenfor området gir planen og står som kontroll, et valg utenfor
 *   stopper. Et spørsmål må besvares, og et valg som krever begrunnelse,
 *   stopper uten den; svaret og begrunnelsen står i planen.
 * - Når et trinn ikke kan gis nøyaktig og regelen tillater det, viser siden de
 *   nærmeste dosene som kan gis, med faktisk reduksjon; et valg gir en ny
 *   plan med en gang, står i planen og kan fjernes.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { VARSLER_HENTES, VARSLER_ULEST } from '../components/verktoy/Regelvarsler'
import { AUTOBEREGNING_MS } from '../components/verktoy/Arbeidsflyt'
import { UNNTAK_STANDARD as FORHOLD_JA } from '../verktoy/flyt/flyt'
import { DEKNING_UKONTROLLERT, FEST_NYTT_FORSOK_MS, TILGJENGELIGHET_UKONTROLLERT, Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import { lagRegelvarsellager, UGYLDIGE_REGELVARSLER } from '../verktoy/overvaking/regelvarsler'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { glemBildet, oppdaterOgTaVare, taBilde } from '../oppdatering/bevaring'
import { KARTLEGGING } from '../verktoy/register'
import { FOR_SEN, LES_SPERRENE_HVER_MS, LESEFRIST_MS, NYE_FORSOK_MS, PLAN_TATT_BORT, SPERRENE_GJELDER_MS, UKONTROLLERT, UTEN_NETT, utenForbindelse, type Verktoysperre } from '../verktoy/sperrer'
import { STARTFORLOP } from '../verktoy/planvisning'
import { FEST_AKSEPTTEST, FEST_PILOT } from '../verktoy/regler/aksepttest'
import { REGELSETT } from '../verktoy/tilgjengelighet'
import { pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'
import { besvarAlt, kopier, planen, planpanel, punkter, sporsmal, stoppet, tidslinje, velgForm, type Bruker } from './hjelp/verktoyflyt'
import { godkjennITest, TEST_BEGRUNNELSE, TEST_DEPOT, TEST_JUSTERBAR, TEST_NEDTRAPPING, TEST_TRINNVALG, TESTKLOKKE, testFest, testsett } from './hjelp/verktoyplan'

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView ??= function () {}
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

/** Nødstoppen uten aktive sperrer. */
const INGEN_SPERRER = { les: async () => [] }

/** Kildeoppfølgingen uten faglige varsler. */
const INGEN_VARSLER = { les: async () => [] }

function vis(props: Partial<VerktoysideProps> = {}) {
  const onLukk = vi.fn()
  const utskrift = render(<Verktoyside legemidler={undefined} sperrer={INGEN_SPERRER} regelvarsler={INGEN_VARSLER} onLukk={onLukk} {...props} />)
  return { onLukk, ...utskrift }
}

/** FEST-lesingen, med preparatene `utvalg` gir. */
const lesing = (utvalg: () => Legemiddelutvalg = () => testFest()) => ({ les: vi.fn(async (_ider: string[]) => utvalg()) })

const ESCITALOPRAM_FEST = KARTLEGGING.virkestoffer.find((v) => v.nokkel === 'escitalopram')!.fest

/** Fyller inn escitalopram og 25 mg, og velger tablettene når steg 2 ber om det; verktøyet velger aldri formen selv. */
async function fyllInn(user: Bruker) {
  await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
  await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), '25')
  const form = await screen.findByRole('radiogroup', { name: 'Formulering av escitalopram' })
  expect(
    within(form)
      .getAllByRole('radio')
      .every((r) => !(r as HTMLInputElement).checked),
  ).toBe(true)
  expect(tidslinje()).toBeNull()
  await velgForm(user, 'Formulering av escitalopram', 'peroral')
  await velgForm(user, 'Legemiddelform av escitalopram', 'SYN-TAB')
}

/** Planen etter den syntetiske nedtrappingen, når den er beregnet av seg selv. */
const nedtrapping = () => planen(TEST_NEDTRAPPING.tittel)

/** Skriver `verdi` i dosefeltet i stedet for det som står. */
async function nyDose(user: Bruker, verdi: string) {
  const dose = screen.getByRole('textbox', { name: /Aktuell døgndose/ })
  await user.clear(dose)
  await user.type(dose, verdi)
}

describe('oversikten', () => {
  const kortlinjer = () =>
    screen
      .getAllByRole('link')
      .filter((a) => a.classList.contains('verktoykort__lenke'))
      .map((a) => [...a.querySelectorAll('.verktoykort__linje')].map((l) => l.textContent))

  it('viser de fire verktøyene, og at bare de godkjente reglene som kan gi en komplett plan, kan beregnes: escitalopram, de to sertralinbyttene fra K2, depotreglene, de tre antipsykotikabyttene fra K3 og de to tilleggsreglene', async () => {
    vis()
    expect(screen.getByRole('heading', { level: 1, name: 'Verktøy' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(document.title).toBe('Verktøy – OUSFAR')
    const kort = screen.getAllByRole('link').filter((a) => a.classList.contains('verktoykort__lenke'))
    expect(kort.map((a) => a.getAttribute('href'))).toEqual([
      '#/verktoy/trappe-ned-antidepressiv',
      '#/verktoy/bytte-antidepressiv',
      '#/verktoy/bytte-antipsykotikum',
      '#/verktoy/kombinere-stemningsstabiliserende',
    ])
    // Før nødstoppen er lest, loves ingenting om hva som kan beregnes.
    expect(kortlinjer()).toEqual(Array(4).fill([DEKNING_UKONTROLLERT.henter]))
    await act(async () => {})
    // Kortene sier hva som faktisk kan brukes, ikke hvor mange regler som venter.
    // Vortioksetin og sertralin → mirtazapin er godkjent, men gir aldri en komplett plan, så de loves ikke (leveranseplanen §3).
    expect(kortlinjer()).toEqual([
      // Escitalopram (versjon 14, godkjent 05.11.2026) gir en komplett plan til seponering med tabletter og dråper.
      ['Kan beregnes: Escitalopram', 'Fagtekst: Agomelatin, Bupropion'],
      // Bytte antidepressiv: de to byttene til sertralin fra K2 som kontrolløren godkjente 05.11.2026.
      ['Kan beregnes: Citalopram → sertralin, Escitalopram → sertralin'],
      // Bytte antipsykotikum: pilotens depotregler og de tre byttene fra K3 som kontrolløren godkjente 04.11.2026.
      [
        'Kan beregnes: Aripiprazol: peroral → depotinjeksjon, Olanzapin (peroral) → aripiprazol (peroral), Paliperidon: peroral → depotinjeksjon (paliperidonpalmitat), Risperidon (peroral) → aripiprazol (peroral), Risperidon (peroral) → paliperidon (depotinjeksjon (paliperidonpalmitat))',
      ],
      // Kombinere stemningsstabiliserende (K4): begge tilleggsreglene er godkjent av den uavhengige kontrolløren og gir en komplett plan.
      ['Kan beregnes: Litium → lamotrigin, Valproat → lamotrigin'],
    ])
    expect(screen.queryByText(/Ingen beregninger er tilgjengelige ennå/)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sier at tilgjengeligheten ikke kan kontrolleres, ikke «Kan beregnes», mens nødstoppen ikke svarer eller ikke kan leses', async () => {
    vis({ sperrer: { les: () => new Promise<Verktoysperre[]>(() => {}) } })
    await act(async () => {})
    expect(kortlinjer()).toEqual(Array(4).fill([DEKNING_UKONTROLLERT.henter]))
    cleanup()
    vis({ sperrer: { les: async () => Promise.reject(new Error('nettverksfeil')) } })
    await act(async () => {})
    expect(kortlinjer()).toEqual(Array(4).fill([DEKNING_UKONTROLLERT.feil]))
    expect(screen.queryByText(/Kan beregnes/)).toBeNull()
  })

  it('forklarer en nødstopp for alle som midlertidig deaktivering, ikke som manglende godkjenning, og manglende godkjenning bare når det er grunnen', async () => {
    const alle: Verktoysperre = { id: 's', omfang: 'alle', mal: null, grunn: 'Syntetisk sperre for alle.', satt_kl: '2026-11-01T08:00:00Z', satt_av: 'Ada Admin' }
    vis({ sperrer: { les: async () => [alle] } })
    await act(async () => {})
    expect(kortlinjer()).toEqual(Array(4).fill(['Midlertidig deaktivert']))
    expect(screen.getByRole('alert', { name: 'Midlertidig deaktivert' }).textContent).toMatch(/Syntetisk sperre for alle\./)
    expect(screen.queryByText(/venter på faglig kontroll og klinisk godkjenning/)).toBeNull()
    cleanup()
    // Uten noen godkjent regel er det grunnen, og da sies det.
    vis({ regelsett: { ...REGELSETT, regler: [] } })
    await act(async () => {})
    expect(screen.getByText(/Ingen beregninger er tilgjengelige ennå: reglene venter på faglig kontroll og klinisk godkjenning\./)).toBeTruthy()
  })

  it('sier fra om en adresse uten verktøy, og lukkes med Esc', async () => {
    const { onLukk } = vis({ verktoy: 'finnes-ikke' })
    expect(screen.getByRole('alert').textContent).toMatch(/Fant ikke verktøyet/)
    await userEvent.keyboard('{Escape}')
    expect(onLukk).toHaveBeenCalledOnce()
  })
})

describe('med pilotreglene', () => {
  it('sier at beregning ikke er tilgjengelig fordi regelen er kontrollert og ikke godkjent, og henter ingenting', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'bytte-antipsykotikum', legemidler })
    expect(screen.getByText(/Velg begge virkestoffene/)).toBeTruthy()
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Olanzapin')
    // Olanzapin finnes både peroralt og som depot; formuleringen velges aldri for brukeren.
    const formulering = screen.getByRole('group', { name: 'Formulering av olanzapin (bytte fra)' })
    expect(
      within(formulering)
        .getAllByRole('radio')
        .every((r) => !(r as HTMLInputElement).checked),
    ).toBe(true)
    await user.click(within(formulering).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Kvetiapin')

    const status = screen.getByRole('status')
    expect(within(status).getByRole('heading', { name: 'Verktøyet kan ikke lage en plan for dette ennå' })).toBeTruthy()
    expect(status.textContent).toMatch(/regelen er kontrollert, men ikke godkjent for klinisk beregning/)
    // En regel kontrolløren har vurdert, står ikke som et åpent spørsmål, og kontrollens merkelapper står ikke.
    expect(status.textContent).not.toMatch(/faglig kontroll|kontrollert, ikke godkjent|olanzapin til kvetiapin/)
    // Ingen steg 2 og ingen plan: bare steg 1 og panelet med grunnen.
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
    expect(within(planpanel()).getByRole('status')).toBe(status)
    expect(tidslinje()).toBeNull()
    expect(legemidler.les).not.toHaveBeenCalled()
  })

  it('tilbyr beregning for en depotregel kontrolløren har godkjent, og henter preparatene først når dosen er fylt inn', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'bytte-antipsykotikum', legemidler })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    // Paliperidon finnes både peroralt og som depot; formuleringen velges aldri for brukeren.
    const formulering = screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })
    expect(
      within(formulering)
        .getAllByRole('radio')
        .every((r) => !(r as HTMLInputElement).checked),
    ).toBe(true)
    await user.click(within(formulering).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))
    expect(screen.queryByText(/faglig kontroll av regelen gjenstår/)).toBeNull()
    expect(screen.getByRole('heading', { name: 'Steg 2: Nåværende behandling' })).toBeTruthy()
    expect(within(planpanel()).getByText('Fyll inn dosen')).toBeTruthy()
    expect(legemidler.les).not.toHaveBeenCalled()
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose av paliperidon/ }), '6')
    await waitFor(() => expect(legemidler.les).toHaveBeenCalledOnce())
  })

  it('skiller en kombinasjon uten regel og et ukjent navn, og gjør ikke en gruppe eller johannesurt valgbar', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv' })
    const felt = screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })
    await user.type(felt, 'Johannesurt')
    expect(felt.getAttribute('aria-invalid')).toBe('true')
    expect(screen.getByText(/Verktøyet har ikke dette virkestoffet/)).toBeTruthy()
    expect([...document.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))).not.toContain('Johannesurt')
    await user.clear(felt)
    await user.type(felt, 'Dosulepin')
    expect(screen.getByRole('status').textContent).toMatch(/Ikke støttet.*ingen preparater i FEST.*ingen regel for dosulepin/)
  })

  it('viser fagteksten for en klinisk godkjent regel uten beregning, med godkjenningen og avgrensningen, og ingen doseplan', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv' })
    const felt = screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })
    await user.type(felt, 'Agomelatin')
    const fagtekst = screen.getByRole('region', { name: 'Fagtekst' })
    expect(within(fagtekst).getByRole('heading', { name: 'Bare fagtekst – ingen beregning' })).toBeTruthy()
    expect(within(fagtekst).getByText('Agomelatin kan seponeres uten nedtrapping.')).toBeTruthy()
    expect(
      within(fagtekst).getByText(
        /^Klinisk godkjent 30\.10\.2026 av ChatGPT \(uavhengig fagkontrollør\), regelversjon 1\..*gjelder ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler\.$/,
      ),
    ).toBeTruthy()
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
    // Duloksetin er også bare fagtekst, men ikke godkjent: da står at det ikke finnes en dokumentert måte å gi trinnene på.
    await user.clear(felt)
    await user.type(felt, 'Duloksetin')
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(
      /Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater\./,
    )
  })
})

describe('med en regel godkjent bare i testen', () => {
  const regelsett = testsett(TEST_NEDTRAPPING)

  it('ber om det som mangler, beregner planen av seg selv, viser den som tidslinje og kopierer og skriver den ut', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })

    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    // Snarvalget for det som er valgt, er markert, og kildene for regelen står lukket under planpanelet.
    expect(within(screen.getByRole('group', { name: 'Kan beregnes nå:' })).getByRole('button', { name: 'Escitalopram', pressed: true })).toBeTruthy()
    expect(
      within(planpanel())
        .getByText(/^Kilder og (versjon|grunnlag)$/)
        .closest('details')!.open,
    ).toBe(false)
    // De fire stegene står i rekkefølge, og det finnes ingen «Beregn»-knapp: planen beregnes av seg selv.
    const steg = ['Steg 1, utfylt: Hva skal trappes ned', 'Steg 2: Nåværende behandling', 'Steg 3: Om pasienten', 'Steg 4: Planen'].map((name) => screen.getByRole('heading', { level: 2, name }))
    expect(screen.getAllByRole('heading', { level: 2 })).toEqual(steg)
    expect(screen.queryByRole('button', { name: /^Beregn/ })).toBeNull()
    // Regelen har ingen måldose, og ingen er skjult. Uten dose ber panelet om den, og ingenting hentes.
    expect(screen.queryByRole('textbox', { name: /Måldose/ })).toBeNull()
    expect(within(planpanel()).getByText('Fyll inn dosen')).toBeTruthy()
    expect(legemidler.les).not.toHaveBeenCalled()
    await user.clear(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }))

    await fyllInn(user)
    const plan = await nedtrapping()
    expect(legemidler.les).toHaveBeenLastCalledWith(ESCITALOPRAM_FEST)
    // Tidslinjen er en ordnet liste med ett punkt per periode, og sluttmålet til slutt.
    const linje = within(plan).getByRole('list', { name: 'Planen dag for dag' })
    expect(linje.tagName).toBe('OL')
    const rader = punkter(linje)
    expect(rader[0]![0]).toBe('Dag 1–14')
    expect(rader[0]![1]).toMatch(/^12,5 mg.*1 tablett à 10 mg.*½ tablett à 5 mg/)
    // Planen når sluttmålet: siste dose holdes ett trinn, og så seponeres legemidlet etter regelens avslutning.
    expect(rader.slice(-2)).toEqual([
      ['Dag 15–28', expect.stringMatching(/^6,25 mg.*1¼ tabletter à 5 mg/)],
      ['Fra dag 29', 'Seponert'],
    ])
    expect(linje.lastElementChild!.getAttribute('data-type')).toBe('slutt')
    expect(within(plan).getByText(/^Komplett plan til sluttmålet: Escitalopram seponert fra dag 29\./)).toBeTruthy()
    // Det som gjelder akkurat denne planen, står ved tidslinjen; kildene og versjonen i den lukkede delen nederst.
    expect(within(plan).getByRole('heading', { name: 'Viktig for denne planen' })).toBeTruthy()
    expect(within(plan).getByRole('heading', { name: 'Preparater planen bruker' })).toBeTruthy()
    const grunnlag = within(plan).getByText('Kilder og versjon').closest('details')!
    expect(grunnlag.open).toBe(false)
    for (const h of ['Slik er forslaget laget', 'Forutsetninger', 'Kontrollert ved beregningen', 'Sporbarhet']) {
      expect(within(grunnlag).getByRole('heading', { name: h, hidden: true })).toBeTruthy()
    }
    // Preparatene står én gang, i planen.
    expect(within(grunnlag).queryByRole('heading', { name: 'Preparater fra FEST', hidden: true })).toBeNull()
    expect(within(grunnlag).getByText(/^Regel test-nedtrapping, versjon \d+, fingeravtrykk/)).toBeTruthy()
    // Interne versjoner og fingeravtrykk står bare i den lukkede delen.
    expect([...plan.querySelectorAll('li, p')].filter((x) => !grunnlag.contains(x) && /fingeravtrykk|test-nedtrapping/.test(x.textContent!))).toEqual([])

    const tekst = await kopier(user)
    // Kopien har hver linje i planen, også i den lukkede delen, unntatt kildene, som står med lenken, og tidslinjen, som står som dager.
    expect(tekst).toContain('\nAdvarsler:\n')
    const kilder = within(grunnlag).queryByRole('heading', { name: 'Kilder', hidden: true })?.parentElement
    for (const li of plan.querySelectorAll('li')) if (!kilder?.contains(li) && !linje.contains(li)) expect(tekst).toContain(`- ${li.textContent}`)
    for (const [nar] of rader) expect(tekst).toContain(`\n${nar}: Escitalopram peroralt: `)
    expect(tekst).toMatch(/\nKontroller:\n- Hver døgndose av escitalopram/)
    expect(tekst).toMatch(/^Trappe ned antidepressiv\n/)
    expect(tekst).toMatch(/Dag 1–14: Escitalopram peroralt: 12,5 mg = 1 tablett à 10 mg \+ ½ tablett à 5 mg/)
    expect(within(plan).getByRole('status').textContent).toBe('Planen er kopiert.')
    await user.click(within(plan).getByRole('button', { name: 'Skriv ut' }))
    expect(print).toHaveBeenCalledOnce()

    // Endres dosen, er planen borte med en gang og beregnes på nytt av seg selv, med FEST lest på nytt.
    const hentet = legemidler.les.mock.calls.length
    await nyDose(user, '20')
    expect(screen.queryByRole('region', { name: TEST_NEDTRAPPING.tittel })).toBeNull()
    expect(punkter(within(await nedtrapping()).getByRole('list', { name: 'Planen dag for dag' }))[0]).toEqual(['Dag 1–14', expect.stringMatching(/^10 mg/)])
    expect(legemidler.les.mock.calls.length).toBe(hentet + 1)
  })

  it('viser bare resultatet av den siste beregningen, også når en eldre henting blir ferdig senere', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await nedtrapping()
    // To hentinger fra FEST som svarer i omvendt rekkefølge.
    const svar: ((u: Legemiddelutvalg) => void)[] = []
    legemidler.les.mockImplementation(() => new Promise<Legemiddelutvalg>((ok) => svar.push(ok)))
    await nyDose(user, '15')
    await waitFor(() => expect(svar).toHaveLength(1))
    await nyDose(user, '20')
    await waitFor(() => expect(svar).toHaveLength(2))
    await act(async () => svar[1]!(testFest()))
    const forste = async () => punkter(within(await nedtrapping()).getByRole('list', { name: 'Planen dag for dag' }))[0]
    expect(await forste()).toEqual(['Dag 1–14', expect.stringMatching(/^10 mg/)])
    await act(async () => svar[0]!(testFest()))
    expect(await forste()).toEqual(['Dag 1–14', expect.stringMatching(/^10 mg/)])
  })

  it('tar planen bort når FEST-kopien blir foreldet eller dagen skifter, og gir ingen plan med foreldet FEST', async () => {
    const user = userEvent.setup()
    let tid = TESTKLOKKE()
    const klokke = () => tid
    const legemidler = lesing()
    const { rerender, onLukk } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke })
    await fyllInn(user)
    await nedtrapping()

    // Midnatt i Norge: preparatstatusen gjaldt i går.
    tid = new Date('2026-11-01T23:30:00Z')
    rerender(<Verktoyside verktoy="trappe-ned-antidepressiv" legemidler={legemidler} sperrer={INGEN_SPERRER} regelvarsler={INGEN_VARSLER} onLukk={onLukk} regelsett={regelsett} klokke={() => tid} />)
    expect(tidslinje()).toBeNull()
    expect(within(planpanel()).getByText(/Planen gjelder ikke lenger/)).toBeTruthy()

    // En ny beregning med den samme, nå foreldede kopien stopper.
    tid = new Date('2026-11-03T12:00:00Z')
    await user.click(within(planpanel()).getByRole('button', { name: 'Beregn på nytt' }))
    await stoppet(/sist kontrollert mot FEST/)
  })

  it('stopper når legemiddeldataene ikke kan hentes, eller ikke er FEST', async () => {
    const user = userEvent.setup()
    const legemidler = { les: vi.fn(async () => Promise.reject(new Error('Nettverket svarte ikke.'))) }
    const { unmount } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '25')
    // K6: ett nytt forsøk etter to sekunder, så feilen, i panelet; «Prøv igjen» leser på nytt.
    const feil = await within(planpanel()).findByRole('alert', {}, { timeout: 4000 })
    expect(feil.textContent).toMatch(/Fikk ikke hentet preparatene fra FEST.*Nettverket svarte ikke\./)
    expect(legemidler.les).toHaveBeenCalledTimes(2)
    expect(screen.queryByRole('radiogroup')).toBeNull()
    await user.click(within(feil).getByRole('button', { name: 'Prøv igjen' }))
    await waitFor(() => expect(legemidler.les).toHaveBeenCalledTimes(3))
    unmount()

    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(() => ({ ...testFest(), kilde: 'Syntetiske testdata' })), regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await stoppet(/ikke fra FEST/)
  }, 10_000)

  it('tar vare på det som er fylt inn gjennom en oppdatering av appen, og beregner planen på nytt i stedet for å ta den med', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await nedtrapping()

    const bilde = JSON.stringify(taBilde().verdier)
    expect(bilde).toContain('Escitalopram')
    expect(bilde).not.toMatch(/tablett à|Seponert|doseplan|fingeravtrykk/)
    // «Oppdater nå»: bildet legges i fanen, appen tas ned, og den nye versjonen starter.
    oppdaterOgTaVare(vi.fn())
    cleanup()
    glemBildet()

    legemidler.les.mockClear()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    expect((screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }) as HTMLInputElement).value).toBe('Escitalopram')
    // Skjemaet står først når sperrene er lest, og planen er ikke tatt med.
    expect(((await screen.findByRole('textbox', { name: /Aktuell døgndose/ })) as HTMLInputElement).value).toBe('25')
    expect(tidslinje()).toBeNull()
    // Planen kommer bare tilbake med en ny beregning, med FEST lest og godkjenningen kontrollert på nytt.
    expect(await nedtrapping()).toBeTruthy()
    expect(legemidler.les).toHaveBeenLastCalledWith(ESCITALOPRAM_FEST)
    // Formvalget fra før oppdateringen gjelder fortsatt, så siden ber ikke om det igjen.
    expect(
      (
        within(screen.getByRole('radiogroup', { name: 'Legemiddelform av escitalopram' }))
          .getAllByRole('radio')
          .find((r) => (r as HTMLInputElement).checked) as HTMLInputElement
      ).value,
    ).toBe('SYN-TAB')
  })
})

describe('med en regel forskriveren kan justere', () => {
  /** Åpner «Tilpass planen» i planpanelet og gir feltet `navn`. */
  async function tilpass(user: Bruker, navn: string) {
    const summary = within(planpanel()).getByText('Tilpass planen')
    if (!summary.closest('details')!.open) await user.click(summary)
    return within(planpanel()).getByRole('textbox', { name: navn }) as HTMLInputElement
  }

  it('viser feltet med forslaget, bruker valget innenfor området og stopper utenfor', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_JUSTERBAR), klokke: TESTKLOKKE })
    await fyllInn(user)
    // Tomt felt: regelens forslag, og planen beregnes av seg selv.
    const rad = async () => punkter(within(await planen(TEST_JUSTERBAR.tittel)).getByRole('list', { name: 'Planen dag for dag' }))[0]![0]
    expect(await rad()).toBe('Dag 1–14')
    const felt = await tilpass(user, 'Dager per trinn')
    expect(felt.placeholder).toBe('14 dager')
    expect(felt.getAttribute('aria-describedby') && document.getElementById(felt.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Regelens forslag er 14 dager; tomt felt bruker forslaget. Regelen tillater 14–28 dager. Dagene er minstetider.',
    )
    // Innenfor området: valget gir planen og står som kontroll.
    await user.type(felt, '28')
    await waitFor(async () => expect(await rad()).toBe('Dag 1–28'))
    expect(
      screen.getByText(/Dager per trinn er valgt av forskriveren innenfor regelens område: oppfylt \(28 dager i stedet for regelens forslag 14 dager; regelen tillater 14–28 dager\.\)/),
    ).toBeTruthy()
    // Utenfor området: ingen plan, og feltet står fortsatt så valget kan rettes.
    await user.clear(felt)
    await user.type(felt, '30')
    await stoppet(/Dager per trinn: 30 dager er utenfor det regelen tillater \(14–28 dager\)\./)
    await user.clear(await tilpass(user, 'Dager per trinn'))
    expect(await rad()).toBe('Dag 1–14')
  })

  it('krever svar på regelens spørsmål, og begrunnelse for et valg som krever det, og viser begge i planen', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett: testsett(TEST_BEGRUNNELSE), klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), '25')
    // Spørsmålene kommer når steg 2 er fylt ut.
    expect(screen.getByText('Spørsmålene kommer når steg 2 er fylt ut.')).toBeTruthy()
    await velgForm(user, 'Formulering av escitalopram', 'peroral')
    await velgForm(user, 'Legemiddelform av escitalopram', 'SYN-TAB')
    const sp = sporsmal('Et syntetisk spørsmål som må besvares.')
    expect(
      within(sp)
        .getAllByRole('radio')
        .map((r) => r.closest('label')!.textContent),
    ).toEqual(['Ja', 'Nei'])
    // Uten svar: ingen plan, bare preparatene for steg 2 er hentet, og panelet sier hva som gjenstår.
    expect(within(planpanel()).getByText('Ett spørsmål igjen')).toBeTruthy()
    expect(legemidler.les).toHaveBeenCalledOnce()
    // Knappen hopper til spørsmålet og merker det.
    await user.click(screen.getByRole('button', { name: 'Ett spørsmål igjen' }))
    await waitFor(() => expect(sp.getAttribute('aria-invalid')).toBe('true'))
    await waitFor(() => expect(document.activeElement).toBe(within(sp).getAllByRole('radio')[0]))
    // Tallet 1 velger det første svaret: ja. Merket er borte, og planen beregnes.
    await user.keyboard('1')
    expect((within(sp).getByRole('radio', { name: 'Ja' }) as HTMLInputElement).checked).toBe(true)
    expect(sp.getAttribute('aria-invalid')).toBeNull()
    // Regelens forslag, 14 dager, krever ved ja en begrunnelse: ingen plan, og feltet for begrunnelsen står i steg 3.
    await stoppet(/Dager per trinn 14 dager krever en skriftlig begrunnelse fra forskriveren/)
    const begrunnelse = screen.getByRole('textbox', { name: 'Begrunnelse for valgene' })
    expect(document.getElementById(begrunnelse.getAttribute('aria-describedby')!)?.textContent).toMatch(
      /^Kreves ved Dager per trinn under 21 dager ved syntetisk ja\. Begrunnelsen står i planen; skriv ikke navn eller andre personopplysninger\.$/,
    )
    // Med begrunnelse: planen, med svaret og begrunnelsen.
    await user.type(begrunnelse, 'Syntetisk begrunnelse.')
    const plan = await planen(TEST_BEGRUNNELSE.tittel)
    expect(within(plan).getByText(/Et syntetisk spørsmål som må besvares\. Ja/)).toBeTruthy()
    expect(within(plan).getByText(/Forskriverens begrunnelse: «Syntetisk begrunnelse\.»/)).toBeTruthy()
    // Nei: 14 dager krever ingen begrunnelse.
    await user.clear(begrunnelse)
    await user.click(within(sp).getByRole('radio', { name: 'Nei' }))
    expect(await planen(TEST_BEGRUNNELSE.tittel)).toBeTruthy()
    expect(screen.queryByText(/Forskriverens begrunnelse/)).toBeNull()
  })

  it('har ikke feltet for en regel uten valg', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_NEDTRAPPING), klokke: TESTKLOKKE })
    await fyllInn(user)
    await nedtrapping()
    await user.click(within(planpanel()).getByText('Tilpass planen'))
    expect(within(planpanel()).getByLabelText('Startdato')).toBeTruthy()
    expect(screen.queryByRole('textbox', { name: 'Dager per trinn' })).toBeNull()
  })
})

describe('med en regel der forskriveren kan velge dosen for et trinn som ikke kan gis', () => {
  it('viser de nærmeste dosene med faktisk reduksjon, beregner på nytt fra valget og lar valgene fjernes', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_TRINNVALG), klokke: TESTKLOKKE })
    await fyllInn(user)
    // 25 mg → 18,75 mg kan gis; neste trinn (14,06 mg) kan ikke, og avslutningen gjelder bare fra 10 mg. Klinikeren får ingen delplan,
    // bare grunnen og de nærmeste dosene som kan gjøre planen komplett.
    const valg = await screen.findByRole('group', { name: 'Trinn 2 av Escitalopram' })
    expect(planpanel().textContent).toMatch(
      /Planen er ikke komplett ennå.*Komplett plan ikke tilgjengelig: escitalopram: .*regelens avslutning gjelder bare fra 10 mg eller lavere \(planen står på 18,75 mg\)/i,
    )
    expect(screen.queryByRole('region', { name: TEST_TRINNVALG.tittel })).toBeNull()
    expect(screen.queryByText(/18,75 mg =/)).toBeNull()
    expect(
      within(valg).getByText(
        /Den foretrukne reduksjonen til 14,06 mg \(−25,01 % fra 18,75 mg\) kan ikke gis med preparatene\. Velg en dose som kan gis; den faktiske reduksjonen må være innenfor det foretrukne området 5–25 %\. Verktøyet velger ikke selv/,
      ),
    ).toBeTruthy()
    // 13,75 mg (−26,67 %) ville kreve begrunnelse; et avvik tilbys ikke.
    expect(
      within(valg)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['15 mg (−20 %)'])
    // Valget gir en ny beregning med en gang, fra den valgte dosen, og står under «Tilpass planen».
    await user.click(within(valg).getByRole('button', { name: '15 mg (−20 %)' }))
    const valgte = screen.getByRole('group', { name: 'Valgte doser per trinn' })
    expect(within(valgte).getByRole('listitem').textContent).toBe('Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)')
    // 15 mg → 11,25 mg kan gis; 8,44 mg kan ikke, og 11,25 mg er over avslutningen. Bare 8,75 mg (−22,22 %) er innenfor området; 7,5 mg (−33,33 %) tilbys ikke.
    const neste = await screen.findByRole('group', { name: 'Trinn 4 av Escitalopram' })
    expect(screen.queryByRole('region', { name: TEST_TRINNVALG.tittel })).toBeNull()
    expect(
      within(neste)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['8,75 mg (−22,22 %)'])
    await user.click(within(neste).getByRole('button', { name: '8,75 mg (−22,22 %)' }))
    // Fra 8,75 mg gjelder avslutningen: planen er komplett og vises, med valgene.
    const plan = await planen(TEST_TRINNVALG.tittel)
    expect(punkter(within(plan).getByRole('list', { name: 'Planen dag for dag' })).at(-1)![1]).toBe('Seponert')
    expect(within(plan).getByText(/valgt av forskriveren \(beregnet 14,06 mg; −20 %\)/)).toBeTruthy()
    expect(within(plan).getByText(/escitalopram (fra )?dag [\d–]+: 15 mg, valgt av forskriveren fordi den beregnede dosen 14,06 mg ikke kan gis; faktisk reduksjon 20 % fra dosen før\./i)).toBeTruthy()
    expect(within(plan).getByText(/escitalopram (fra )?dag [\d–]+: 8,75 mg, valgt av forskriveren/i)).toBeTruthy()
    expect(
      within(screen.getByRole('group', { name: 'Valgte doser per trinn' }))
        .getAllByRole('listitem')
        .map((x) => x.textContent),
    ).toEqual(['Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)', 'Trinn 4 av Escitalopram: 8,75 mg (fra 11,25 mg)'])
    // Valgene kan fjernes; planen beregnes da på nytt, og valget for trinn 2 står igjen.
    await user.click(within(screen.getByRole('group', { name: 'Valgte doser per trinn' })).getByRole('button', { name: 'Fjern valgene' }))
    expect(screen.queryByRole('group', { name: 'Valgte doser per trinn' })).toBeNull()
    expect(tidslinje()).toBeNull()
    expect(await screen.findByRole('group', { name: 'Trinn 2 av Escitalopram' })).toBeTruthy()
  })
})

describe('valgene som hører sammen', () => {
  it('glemmer formuleringen når et annet virkestoff skrives inn, også når det nye har den samme', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'bytte-antipsykotikum' })
    const fra = screen.getByRole('combobox', { name: 'Bytte fra' })
    await user.type(fra, 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
    // Aripiprazol finnes også peroralt og som depot; valget for paliperidon gjelder ikke.
    fireEvent.change(fra, { target: { value: 'Aripiprazol' } })
    const radioer = within(screen.getByRole('group', { name: 'Formulering av aripiprazol (bytte fra)' })).getAllByRole('radio')
    expect(radioer.map((r) => (r as HTMLInputElement).checked)).toEqual([false, false])
    // Samme virkestoff med annen skrivemåte er ikke et nytt valg.
    await user.click(radioer[0]!)
    fireEvent.change(fra, { target: { value: 'aripiprazol' } })
    expect((within(screen.getByRole('group', { name: 'Formulering av aripiprazol (bytte fra)' })).getAllByRole('radio')[0] as HTMLInputElement).checked).toBe(true)
  })

  it('begynner skjemaet på nytt med et annet virkestoff, og når det samme velges igjen', async () => {
    const user = userEvent.setup()
    const regelsett = testsett(TEST_NEDTRAPPING)
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett, klokke: TESTKLOKKE })
    const felt = screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })
    await user.type(felt, 'Escitalopram')
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '25')
    await user.click(screen.getByRole('checkbox', { name: /godkjenningsfritak/ }))
    fireEvent.change(felt, { target: { value: 'Citalopram' } })
    expect(screen.queryByRole('textbox', { name: /Aktuell døgndose/ })).toBeNull()
    fireEvent.change(felt, { target: { value: 'Escitalopram' } })
    expect((screen.getByRole('textbox', { name: /Aktuell døgndose/ }) as HTMLInputElement).value).toBe('')
    expect((screen.getByRole('checkbox', { name: /godkjenningsfritak/ }) as HTMLInputElement).checked).toBe(false)
  })

  it('tar ikke med bekreftelser, svar på unntak eller måldose til en annen fremgangsmåte, men beholder dosen', async () => {
    const user = userEvent.setup()
    const annen = structuredClone(TEST_DEPOT)
    annen.tittel = 'SYNTETISK TESTREGEL: annen strategi'
    const regelsett = testsett(TEST_DEPOT, godkjennITest(annen, 'test-depot-annen'))
    vis({ verktoy: 'bytte-antipsykotikum', legemidler: lesing(), regelsett, klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))

    // Flere godkjente regler: fremgangsmåten velges i steg 2, med regelens tittel.
    const fremgang = screen.getByRole('group', { name: 'Fremgangsmåte' })
    await user.click(within(fremgang).getByRole('radio', { name: TEST_DEPOT.tittel }))
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '6')
    const unntak = (vent = false) => (vent ? screen.findByRole('radiogroup', { name: 'Et syntetisk unntak som må besvares.' }, { timeout: 3000 }) : sporsmal('Et syntetisk unntak som må besvares.'))
    await user.click(within(await unntak(true)).getByRole('radio', { name: 'Gjelder ikke' }))
    await user.click(screen.getByRole('checkbox', { name: /godkjenningsfritak/ }))

    await user.click(within(fremgang).getByRole('radio', { name: annen.tittel }))
    const avkrysset = async () =>
      within(await unntak(true))
        .getAllByRole('radio')
        .map((r) => (r as HTMLInputElement).checked)
    expect(await avkrysset()).toEqual([false, false])
    expect((screen.getByRole('checkbox', { name: /godkjenningsfritak/ }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('textbox', { name: /Aktuell døgndose/ }) as HTMLInputElement).value).toBe('6')
    // Og tilbake: svaret for den første fremgangsmåten er heller ikke tatt vare på.
    await user.click(within(fremgang).getByRole('radio', { name: TEST_DEPOT.tittel }))
    expect(await avkrysset()).toEqual([false, false])
  })
})

describe('nødstoppen (P11.6)', () => {
  const regelsett = testsett(TEST_NEDTRAPPING)
  const sperre = (omfang: Verktoysperre['omfang'], mal: string | null, grunn = 'Syntetisk feil under pilot.'): Verktoysperre => ({
    id: `sperre-${omfang}-${mal}`,
    omfang,
    mal,
    grunn,
    satt_kl: '2026-11-01T08:00:00Z',
    satt_av: 'Ada Admin',
  })
  /** Nødstoppen med sperrene `aktive()` gir når den leses. */
  const nodstopp = (aktive: () => Verktoysperre[] | Promise<Verktoysperre[]> = () => []) => ({ les: vi.fn(async () => aktive()) })

  it('viser ingen beregning eller fagtekst før sperrene er lest, og ingenting klinisk når de ikke kan leses', async () => {
    const user = userEvent.setup()
    let svar: (s: Verktoysperre[]) => void = () => {}
    const venter = nodstopp(() => new Promise<Verktoysperre[]>((ok) => (svar = ok)))
    vis({ verktoy: 'trappe-ned-antidepressiv', sperrer: venter })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Agomelatin')
    expect(screen.getByText(/Kontrollerer om verktøyet er tilgjengelig/)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
    await act(async () => svar([]))
    expect(screen.getByRole('region', { name: 'Fagtekst' })).toBeTruthy()
    cleanup()

    // En lesing som feiler, og en side uten nødstoppen, viser ingenting klinisk; «Prøv igjen» leser på nytt.
    let feiler = true
    const ustabil = nodstopp(() => {
      if (feiler) throw new Error('nettverksfeil')
      return []
    })
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, sperrer: ustabil, regelsett, klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    expect((await screen.findByRole('alert')).textContent).toMatch(/fikk ikke kontrollert om verktøyet er midlertidig deaktivert/)
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
    feiler = false
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByRole('heading', { name: /^Steg 2/ })).toBeTruthy()
    expect(legemidler.les).not.toHaveBeenCalled()
    cleanup()

    vis({ verktoy: 'trappe-ned-antidepressiv', sperrer: undefined })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Agomelatin')
    expect((await screen.findByRole('alert')).textContent).toMatch(/fikk ikke kontrollert/)
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
  })

  it('deaktiverer alle verktøyene, ett verktøy eller én regel, med grunnen, og oversikten sier fra', async () => {
    const user = userEvent.setup()
    vis({ sperrer: nodstopp(() => [sperre('alle', null, 'Kritisk feil i doseplanmotoren.')]) })
    const melding = await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })
    expect(melding.textContent).toMatch(/Alle verktøyene: Kritisk feil i doseplanmotoren\.Ada Admin, 01\.11\.2026/)
    const deaktivert = () => [...document.querySelectorAll('.verktoykort__status')].map((x) => x.firstElementChild?.textContent === 'Midlertidig deaktivert')
    expect(deaktivert()).toEqual([true, true, true, true])
    cleanup()

    vis({ sperrer: nodstopp(() => [sperre('verktoy', 'bytte-antipsykotikum')]) })
    await screen.findByText('Midlertidig deaktivert')
    expect(deaktivert()).toEqual([false, false, true, false])
    // Et deaktivert verktøy lover ingen beregning i oversikten.
    expect(document.querySelectorAll('.verktoykort__status')[2]!.textContent).toBe('Midlertidig deaktivert')
    cleanup()

    // Én regel: fagteksten for agomelatin er borte, mens bupropion fortsatt vises.
    vis({ verktoy: 'trappe-ned-antidepressiv', sperrer: nodstopp(() => [sperre('regel', 'seponering-agomelatin', 'Fagteksten må kontrolleres på nytt.')]) })
    const felt = screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })
    // Den sperrede regelen tilbys ikke som snarvalg; de andre gjør det.
    const fagtekstvalg = await screen.findByRole('group', { name: 'Bare fagtekst:' })
    expect(
      within(fagtekstvalg)
        .getAllByRole('button')
        .map((b) => b.textContent),
    ).toEqual(['Bupropion'])
    await user.type(felt, 'Agomelatin')
    expect((await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).textContent).toMatch(/Regelen «Seponering av agomelatin»: Fagteksten må kontrolleres på nytt\./)
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
    await user.clear(felt)
    await user.type(felt, 'Bupropion')
    expect(screen.getByRole('region', { name: 'Fagtekst' })).toBeTruthy()
    expect(screen.queryByRole('alert', { name: 'Midlertidig deaktivert' })).toBeNull()
  })

  it('tar bort en plan som står når en sperre settes, gir ingen plan når sperren kommer i det planen beregnes, og beregner igjen når den er opphevet', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    let aktive: Verktoysperre[] = []
    const lager = nodstopp(() => aktive)
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, sperrer: lager, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    expect(await nedtrapping()).toBeTruthy()

    // Sperren settes mens planen står: neste kontroll (her fokus på fanen) tar planen og skjemaet bort.
    aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(tidslinje()).toBeNull()
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()

    // Opphevet: skjemaet er der igjen med det som var fylt inn, og planen kommer ikke av seg selv; den må beregnes på nytt.
    aktive = []
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(((await screen.findByRole('textbox', { name: /Aktuell døgndose/ })) as HTMLInputElement).value).toBe('25')
    expect(tidslinje()).toBeNull()
    await user.click(within(planpanel()).getByRole('button', { name: 'Beregn på nytt' }))
    expect(await nedtrapping()).toBeTruthy()

    // Sperren settes etter siste kontroll, men før beregningen: sperrene leses på nytt i det planen beregnes.
    aktive = [sperre('verktoy', 'trappe-ned-antidepressiv')]
    await nyDose(user, '20')
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(tidslinje()).toBeNull()
  })

  it('gir ingen plan når sperren settes mens preparatene hentes fra FEST', async () => {
    const user = userEvent.setup()
    let aktive: Verktoysperre[] = []
    const lager = nodstopp(() => aktive)
    let slipp: () => void = () => {}
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, sperrer: lager, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    expect(await nedtrapping()).toBeTruthy()

    // FEST svarer sent; sperren settes etter at beregningen startet, men før preparatene er hentet.
    const hentet = legemidler.les.mock.calls.length
    legemidler.les.mockImplementationOnce(() => new Promise((ok) => (slipp = () => ok(testFest()))))
    await nyDose(user, '20')
    await waitFor(() => expect(legemidler.les).toHaveBeenCalledTimes(hentet + 1))
    aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
    await act(async () => slipp())
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(tidslinje()).toBeNull()
  })

  describe('når kontrollen av sperrene henger, er for gammel eller svarer i en annen rekkefølge', () => {
    beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
    afterEach(() => vi.useRealTimers())
    const vent = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))
    const fokus = () => act(async () => window.dispatchEvent(new Event('focus')))

    /** Viser nedtrappingen med `lager` som nødstopp og beregner en plan. */
    async function medPlan(lager: ReturnType<typeof nodstopp>, props: Partial<VerktoysideProps> = {}) {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), sperrer: lager, regelsett, klokke: TESTKLOKKE, ...props })
      await fyllInn(user)
      expect(await nedtrapping()).toBeTruthy()
      return user
    }

    it('tar bort en plan som står når en lesing ikke svarer innen fristen, og viser den igjen etter en ny vellykket lesing', async () => {
      let henger = false
      const lager = nodstopp(() => (henger ? new Promise<Verktoysperre[]>(() => {}) : []))
      const user = await medPlan(lager)
      henger = true
      await fokus()
      // Mens lesingen pågår, gjelder den forrige, men bare til fristen.
      await vent(LESEFRIST_MS - 1_000)
      expect(tidslinje()).toBeTruthy()
      await vent(1_000)
      expect((await screen.findByRole('alert')).textContent).toMatch(/fikk ikke kontrollert om verktøyet er midlertidig deaktivert/)
      expect(tidslinje()).toBeNull()
      expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
      henger = false
      await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
      // Planen kommer ikke tilbake av seg selv; siden sier hvorfor den ble borte (S6).
      expect(await screen.findByText(PLAN_TATT_BORT)).toBeTruthy()
      expect(tidslinje()).toBeNull()
      await user.click(within(planpanel()).getByRole('button', { name: 'Beregn på nytt' }))
      expect(await nedtrapping()).toBeTruthy()
      expect(screen.queryByText(PLAN_TATT_BORT)).toBeNull()
    })

    it('tar bort en plan som står når ingen ny lesing kommer før den forrige går ut, og leser sperrene på nytt', async () => {
      let henger = false
      const lager = nodstopp(() => (henger ? new Promise<Verktoysperre[]>(() => {}) : []))
      await medPlan(lager)
      // Fanen er ikke synlig, så de jevnlige lesingene uteblir.
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
      try {
        henger = true
        const lest = lager.les.mock.calls.length
        await vent(SPERRENE_GJELDER_MS - 1_000)
        expect(tidslinje()).toBeTruthy()
        expect(lager.les.mock.calls.length).toBe(lest)
        await vent(1_000)
        expect(tidslinje()).toBeNull()
        expect(screen.getByText(/Kontrollerer om verktøyet er tilgjengelig/)).toBeTruthy()
        expect(lager.les.mock.calls.length).toBe(lest + 1)
        // Lesingen svarer ikke innen fristen; det nye forsøket etter fem sekunder lykkes, og siden sier at planen ble tatt bort.
        await vent(LESEFRIST_MS)
        expect(screen.getByRole('alert').textContent).toContain(UKONTROLLERT)
        henger = false
        await vent(NYE_FORSOK_MS[0])
        expect(lager.les.mock.calls.length).toBe(lest + 2)
        expect(await screen.findByText(PLAN_TATT_BORT)).toBeTruthy()
        expect(tidslinje()).toBeNull()
      } finally {
        delete (document as { visibilityState?: unknown }).visibilityState
      }
    })

    it('bruker svaret fra en langsom lesing når en nyere ikke har svart, men aldri et eldre svar etter et nyere', async () => {
      const svar: ((s: Verktoysperre[]) => void)[] = []
      let venter = false
      const lager = nodstopp(() => (venter ? new Promise<Verktoysperre[]>((ok) => svar.push(ok)) : []))
      await medPlan(lager)
      const stopp = [sperre('regel', TEST_NEDTRAPPING.id)]
      venter = true
      await fokus()
      await vent(5_000)
      await fokus()
      // Den første svarer med en sperre mens den andre fortsatt venter: sperren gjelder med en gang.
      await act(async () => svar[0]!(stopp))
      expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
      expect(tidslinje()).toBeNull()
      await act(async () => svar[1]!([]))
      expect(await screen.findByRole('heading', { name: /^Steg 2/ })).toBeTruthy()

      // Den nyeste svarer først med en sperre; det eldre svaret uten sperre som kommer etterpå, brukes ikke.
      await fokus()
      await fokus()
      await act(async () => svar[3]!(stopp))
      expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
      await act(async () => svar[2]!([]))
      expect(screen.getByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
      expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
    })

    /**
     * Kortvarig svikt (S6, N1 og K6 i `docs/verktøy-vdr4-tilgjengelighet.md`):
     * nye forsøk på å lese sperrene, en melding når en plan ble tatt bort fordi
     * kontrollen ikke svarte, og ett nytt forsøk mot FEST. Ingenting beregnes
     * av seg selv, og en sperre gjelder så snart den er lest.
     */
    describe('kortvarig svikt (VDR-4)', () => {
      /** Nødstoppen som feiler med `svikt.feil` så lenge `svikt.na` er sann, og ellers gir `svikt.aktive`. */
      const ustabil = () => {
        const svikt = { na: false, feil: 'Tjenesten svarte med en feil.', aktive: [] as Verktoysperre[] }
        const lager = nodstopp(() => {
          if (svikt.na) throw new Error(svikt.feil)
          return svikt.aktive
        })
        return { svikt, lager }
      }
      const tattBort = () => screen.queryByText(PLAN_TATT_BORT)
      /** «Beregn på nytt» i planpanelet: planen kommer ikke tilbake av seg selv etter et brudd. */
      const beregnknapp = () => within(planpanel()).getByRole('button', { name: 'Beregn på nytt' }) as HTMLButtonElement
      /** Én lesing som feiler, og en vellykket rett etter. */
      async function kortBrudd(svikt: ReturnType<typeof ustabil>['svikt']) {
        svikt.na = true
        await fokus()
        expect((await screen.findByRole('alert')).textContent).toContain(UKONTROLLERT)
        svikt.na = false
        await fokus()
        await screen.findByRole('heading', { name: /^Steg 2/ })
      }

      it('leser sperrene på nytt etter 5 og 15 sekunder, viser ingenting klinisk imens, og ber om en ny beregning uten å beregne selv', async () => {
        const { svikt, lager } = ustabil()
        const legemidler = lesing()
        const user = await medPlan(lager, { legemidler })
        const hentet = legemidler.les.mock.calls.length
        svikt.na = true
        await fokus()
        expect((await screen.findByRole('alert')).textContent).toContain(UKONTROLLERT)
        expect(tidslinje()).toBeNull()
        expect(tattBort()).toBeNull()

        const lest = lager.les.mock.calls.length
        await vent(NYE_FORSOK_MS[0] - 100)
        expect(lager.les.mock.calls.length).toBe(lest)
        await vent(100)
        expect(lager.les.mock.calls.length).toBe(lest + 1)
        expect(screen.getByRole('alert').textContent).toContain(UKONTROLLERT)
        expect(tidslinje()).toBeNull()

        svikt.na = false
        await vent(NYE_FORSOK_MS[1])
        expect(lager.les.mock.calls.length).toBe(lest + 2)
        const melding = await screen.findByText(PLAN_TATT_BORT)
        expect(melding.closest('[role="status"]')).toBeTruthy()
        expect(beregnknapp().disabled).toBe(false)
        expect(tidslinje()).toBeNull()
        // Heller ikke senere kontroller beregner planen av seg selv.
        await vent(LES_SPERRENE_HVER_MS)
        expect(tidslinje()).toBeNull()
        expect(legemidler.les.mock.calls.length).toBe(hentet)

        await user.click(beregnknapp())
        expect(await nedtrapping()).toBeTruthy()
        expect(tattBort()).toBeNull()
        expect(legemidler.les.mock.calls.length).toBe(hentet + 1)
      })

      it('viser ikke meldingen når vellykkede lesinger bare bekrefter planen som står, heller ikke etter en ny beregning etter et brudd', async () => {
        const { svikt, lager } = ustabil()
        const user = await medPlan(lager)
        /** Vellykkede lesinger, både ved fokus og hvert minutt: planen står, og meldingen vises ikke. */
        const bekreftet = async () => {
          const lest = lager.les.mock.calls.length
          await fokus()
          await vent(LES_SPERRENE_HVER_MS)
          await fokus()
          expect(lager.les.mock.calls.length).toBeGreaterThanOrEqual(lest + 3)
          expect(tidslinje()).toBeTruthy()
          expect(tattBort()).toBeNull()
        }
        await bekreftet()

        // Et reelt tap gir meldingen; etter en ny beregning kommer den ikke tilbake ved nye vellykkede lesinger.
        await kortBrudd(svikt)
        expect(tattBort()).toBeTruthy()
        await user.click(beregnknapp())
        expect(await nedtrapping()).toBeTruthy()
        expect(tattBort()).toBeNull()
        await bekreftet()
      })

      it('ber om en ny beregning når planen ble tatt bort fordi lesingen ble for gammel mens fanen var skjult', async () => {
        // Lesingen tar et øyeblikk, som over nettet.
        let treg = false
        const lager = nodstopp(() => (treg ? new Promise<Verktoysperre[]>((ok) => setTimeout(() => ok([]), 200)) : []))
        const legemidler = lesing()
        await medPlan(lager, { legemidler })
        const hentet = legemidler.les.mock.calls.length
        treg = true
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
        try {
          await vent(SPERRENE_GJELDER_MS)
          expect(tidslinje()).toBeNull()
          await vent(200)
        } finally {
          delete (document as { visibilityState?: unknown }).visibilityState
        }
        expect(await screen.findByText(PLAN_TATT_BORT)).toBeTruthy()
        expect(tidslinje()).toBeNull()
        expect(legemidler.les.mock.calls.length).toBe(hentet)
      })

      it('prøver bare to ganger på nytt, og begynner rekken på nytt ved en ny feil', async () => {
        const { svikt, lager } = ustabil()
        await medPlan(lager)
        // Fanen er ikke synlig, så bare de nye forsøkene leser sperrene.
        Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })
        try {
          svikt.na = true
          const lest = lager.les.mock.calls.length
          await act(async () => window.dispatchEvent(new Event('online')))
          expect(lager.les.mock.calls.length).toBe(lest + 1)
          await vent(NYE_FORSOK_MS[0] + NYE_FORSOK_MS[1])
          expect(lager.les.mock.calls.length).toBe(lest + 3)
          await vent(SPERRENE_GJELDER_MS)
          expect(lager.les.mock.calls.length).toBe(lest + 3)
          expect(screen.getByRole('alert').textContent).toContain(UKONTROLLERT)
          // «Prøv igjen» er en ny feil, ikke et forsøk i rekken: den gir et nytt forsøk etter 5 sekunder.
          fireEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }))
          await act(async () => {})
          expect(lager.les.mock.calls.length).toBe(lest + 4)
          await vent(NYE_FORSOK_MS[0])
          expect(lager.les.mock.calls.length).toBe(lest + 5)
        } finally {
          delete (document as { visibilityState?: unknown }).visibilityState
        }
      })

      it('sier fra om at forbindelsen mangler, og leser sperrene med en gang den er tilbake', async () => {
        const { svikt, lager } = ustabil()
        await medPlan(lager)
        svikt.feil = 'TypeError: Failed to fetch'
        svikt.na = true
        await fokus()
        const varsel = await screen.findByRole('alert')
        expect(varsel.textContent).toContain(UTEN_NETT)
        expect(varsel.textContent).not.toContain(UKONTROLLERT)
        expect(screen.queryByRole('alert', { name: 'Midlertidig deaktivert' })).toBeNull()
        expect(tidslinje()).toBeNull()

        svikt.na = false
        const lest = lager.les.mock.calls.length
        await act(async () => window.dispatchEvent(new Event('online')))
        expect(lager.les.mock.calls.length).toBe(lest + 1)
        expect(await screen.findByText(PLAN_TATT_BORT)).toBeTruthy()
        expect(tidslinje()).toBeNull()

        // Sier nettleseren selv at den er uten nett, gjelder det samme uansett feilmelding.
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
        svikt.feil = 'Tjenesten svarte med en feil.'
        svikt.na = true
        await fokus()
        expect((await screen.findByRole('alert')).textContent).toContain(UTEN_NETT)
      })

      it('viser sperren, ikke meldingen, når lesingen etter bruddet finner en sperre, og heller ikke meldingen for en plan som sperren tok bort', async () => {
        const { svikt, lager } = ustabil()
        const user = await medPlan(lager)
        svikt.na = true
        await fokus()
        expect(await screen.findByRole('alert')).toBeTruthy()
        svikt.aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
        svikt.na = false
        await vent(NYE_FORSOK_MS[0])
        expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
        expect(tattBort()).toBeNull()
        expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
        svikt.aktive = []
        await fokus()
        await user.click(await within(planpanel()).findByRole('button', { name: 'Beregn på nytt' }))
        expect(await nedtrapping()).toBeTruthy()

        // Sperren tar bort planen; et brudd mens sperren står, gir ikke meldingen når sperren er opphevet, for det var sperren som tok planen.
        svikt.aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
        await fokus()
        expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
        svikt.na = true
        await fokus()
        expect((await screen.findByRole('alert')).textContent).toContain(UKONTROLLERT)
        svikt.aktive = []
        svikt.na = false
        await fokus()
        await screen.findByRole('heading', { name: /^Steg 2/ })
        expect(tattBort()).toBeNull()
        expect(tidslinje()).toBeNull()
      })

      it('tar bort meldingen når noe endres, viser den ikke uten en plan, og tar den ikke med gjennom en oppdatering av appen', async () => {
        const { svikt, lager } = ustabil()
        const user = await medPlan(lager)
        await kortBrudd(svikt)
        expect(tattBort()).toBeTruthy()
        const dose = screen.getByRole('textbox', { name: /Aktuell døgndose/ })
        await user.clear(dose)
        expect(tattBort()).toBeNull()

        // Uten en plan som står, er det ingen plan å ta bort.
        await kortBrudd(svikt)
        expect(tattBort()).toBeNull()

        // En ny dose er en endring: planen beregnes av seg selv.
        await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '20')
        expect(await nedtrapping()).toBeTruthy()
        await kortBrudd(svikt)
        expect(tattBort()).toBeTruthy()
        oppdaterOgTaVare(vi.fn())
        cleanup()
        glemBildet()
        vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), sperrer: lager, regelsett, klokke: TESTKLOKKE })
        expect(((await screen.findByRole('textbox', { name: /Aktuell døgndose/ })) as HTMLInputElement).value).toBe('20')
        expect(tattBort()).toBeNull()
        // Den nye versjonen beregner planen på nytt, med FEST og sperrene lest på nytt; meldingen følger ikke med.
        expect(await nedtrapping()).toBeTruthy()
        expect(tattBort()).toBeNull()
      })

      it('prøver FEST én gang til før feilen vises, og kontrollerer svaret som ellers', async () => {
        let tid = TESTKLOKKE()
        const legemidler = lesing()
        const user = await medPlan(nodstopp(), { legemidler, klokke: () => tid })
        const hentet = legemidler.les.mock.calls.length

        // Første henting feiler, den andre lykkes: planen vises uten feil. En ny dose gir den nye beregningen.
        legemidler.les.mockRejectedValueOnce(new Error('Nettverket svarte ikke.'))
        await nyDose(user, '20')
        await vent(AUTOBEREGNING_MS)
        await waitFor(() => expect(legemidler.les.mock.calls.length).toBe(hentet + 1))
        expect(screen.queryByRole('alert')).toBeNull()
        expect(tidslinje()).toBeNull()
        await vent(FEST_NYTT_FORSOK_MS)
        expect(await nedtrapping()).toBeTruthy()
        expect(legemidler.les.mock.calls.length).toBe(hentet + 2)
        expect(screen.queryByRole('alert')).toBeNull()

        // Er FEST-kopien fra det nye forsøket for gammel, gir den ingen plan.
        tid = new Date('2026-11-03T12:00:00Z')
        legemidler.les.mockRejectedValueOnce(new Error('Nettverket svarte ikke.'))
        await nyDose(user, '25')
        await vent(AUTOBEREGNING_MS)
        await vent(FEST_NYTT_FORSOK_MS)
        await stoppet(/sist kontrollert mot FEST/)
        expect(legemidler.les.mock.calls.length).toBe(hentet + 4)
      })

      it('kjenner igjen et kall som ikke nådde serveren', () => {
        for (const m of ['TypeError: Failed to fetch', 'NetworkError when attempting to fetch resource.', 'Load failed', 'Network request failed']) expect(utenForbindelse(m, true)).toBe(true)
        expect(utenForbindelse('permission denied for function les_verktoysperrer', true)).toBe(false)
        expect(utenForbindelse(FOR_SEN, true)).toBe(false)
        expect(utenForbindelse('Tjenesten svarte med en feil.', false)).toBe(true)
      })
    })
  })
})

/**
 * Pilotgjennomgangen med de klinisk godkjente reglene og preparatene i det
 * lagrede FEST-uttrekket (P11.2 og P11.4, `docs/verktøy-p11-publisering.md`):
 * det forskriveren ser, også etter en oppdatering, ved navigering, med en
 * endret regelversjon og med endrede preparater.
 */
describe('pilotgjennomgangen med de godkjente reglene (P11.2, P11.4)', () => {
  const PILOT = pilotuttrekk(FEST_PILOT)
  const AKSEPT = pilotuttrekk(FEST_AKSEPTTEST)
  const klokke = pilotklokke
  const fra = pilotlesing
  const besvar = besvarAlt
  /** Punktene i tidslinjen som én tekst hver: når og hva. */
  const rader = () => punkter().map(([nar, innhold]) => nar + innhold)

  it('Xeplion fra 3 mg: siden ber om dosen i spennet, og planen sier at den perorale behandlingen er seponert', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT) })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))
    const dose = await screen.findByRole('textbox', { name: /Aktuell døgndose av paliperidon/ })
    await user.type(dose, '6')
    // Ved 6 mg gir tabellen én dose, så siden spør ikke etter en måldose.
    expect(screen.queryByRole('textbox', { name: /Måldose/ })).toBeNull()
    await besvar(user)
    await planen(/Xeplion/)
    await user.clear(dose)
    await user.type(dose, '3')
    expect(screen.getByText('Ved 3 mg gir omregningstabellen et spenn på 25–50 mg. Dosen i spennet er et klinisk valg og skrives inn som måldose.')).toBeTruthy()
    await stoppet(/Måldosen må fylles inn som et tall større enn 0\./)
    await user.type(screen.getByRole('textbox', { name: 'Måldose av paliperidon (depot) (mg per injeksjon)' }), '50')
    await planen(/Xeplion/)
    expect(rader()[0]).toMatch(/^Fra dag 1.*Seponert/)
    expect(rader().at(-1)).toMatch(/Hver måned fra 1 måned etter dag 8.*50 mg/)
    // Tilbake til 6 mg: måldosen som står igjen, brukes ikke, og planen følger tabellen.
    await user.clear(dose)
    await user.type(dose, '6')
    expect(screen.queryByRole('textbox', { name: /Måldose/ })).toBeNull()
    await waitFor(() => expect(rader().at(-1)).toMatch(/Hver måned fra 1 måned etter dag 8.*75 mg/))
  })

  it('sertralin → mirtazapin og vortioksetin 20 → 15 mg: en delplan vises ikke, og siden sier det med en gang, før dosen og spørsmålene', async () => {
    const user = userEvent.setup()
    // Klinikere får aldri en delplan (Peders beslutning 03.11.2026), heller ikke etter en tidligere godkjent regelversjon.
    const legemidler = fra(PILOT)
    vis({ verktoy: 'bytte-antidepressiv', legemidler, klokke: klokke(PILOT) })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Sertralin')
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Mirtazapin')
    await stoppet(/^4Steg 4: PlanenIngen plan for dette valgetIngen godkjent regel gir en komplett plan for dette valget ennå\. Verktøyet lager ingen plan/)
    expect(screen.queryByRole('heading', { name: /^Steg [23]/ })).toBeNull()
    expect(screen.queryByText(STARTFORLOP)).toBeNull()
    expect(legemidler.les).not.toHaveBeenCalled()
    cleanup()

    // Vortioksetin: én mulig reduksjon med revurdering er en delplan.
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: fra(AKSEPT), klokke: klokke(AKSEPT) })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Vortioksetin')
    await stoppet(/Ingen godkjent regel gir en komplett plan for dette valget ennå\./)
    expect(screen.queryByRole('textbox', { name: /Aktuell døgndose av vortioksetin/ })).toBeNull()
    expect(screen.queryByText(/15 mg =/)).toBeNull()
  })

  it('stopper med en gang et forhold som gjelder er besvart, før noe beregnes, også etter en oppdatering av appen og navigering', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    const regelsett = testsett(TEST_DEPOT)
    const fyll = async () => {
      await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
      await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
      await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
      await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))
      await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose av paliperidon/ }), '6')
      await besvar(user, [/syntetisk unntak/])
    }
    vis({ verktoy: 'bytte-antipsykotikum', legemidler, regelsett, klokke: TESTKLOKKE })
    await fyll()
    // Forholdet gjelder: regelen gjelder ikke, og siden sier det ved forholdet og i panelet, uten å beregne.
    await stoppet(new RegExp(`Ingen plan med disse svarene${FORHOLD_JA}`))
    expect(sporsmal('Et syntetisk unntak som må besvares.').closest('li')!.textContent).toContain(FORHOLD_JA)
    expect(legemidler.les).toHaveBeenCalledOnce()

    // Etter en oppdatering står svarene, og flyten stopper på samme måte.
    oppdaterOgTaVare(vi.fn())
    cleanup()
    glemBildet()
    const { rerender, onLukk } = vis({ verktoy: 'bytte-antipsykotikum', legemidler, regelsett, klokke: TESTKLOKKE })
    await stoppet(new RegExp(FORHOLD_JA))

    // Til et annet verktøy og tilbake: skjemaet begynner på nytt, og fylt inn igjen stopper flyten på samme måte.
    const side = (verktoy: string) => (
      <Verktoyside verktoy={verktoy} legemidler={legemidler} sperrer={INGEN_SPERRER} regelvarsler={INGEN_VARSLER} onLukk={onLukk} regelsett={regelsett} klokke={TESTKLOKKE} />
    )
    rerender(side('bytte-antidepressiv'))
    rerender(side('bytte-antipsykotikum'))
    expect(within(planpanel()).queryByText('Ingen plan med disse svarene')).toBeNull()
    expect(tidslinje()).toBeNull()
    expect((screen.getByRole('combobox', { name: 'Bytte fra' }) as HTMLInputElement).value).toBe('')
    await fyll()
    await stoppet(new RegExp(FORHOLD_JA))
  })

  it('tar bort planen når regelversjonen endres', async () => {
    const user = userEvent.setup()
    // En godkjent regel med komplett plan (Xeplion); klinikere får aldri en delplan.
    const XEPLION = 'depot-paliperidon-xeplion'
    const { rerender, onLukk } = vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT) })
    await user.click(await screen.findByRole('button', { name: 'Paliperidon: peroral → depotinjeksjon (paliperidonpalmitat)' }))
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose av paliperidon/ }), '6')
    await besvar(user)
    await planen(/Xeplion/)
    expect(rader().at(-1)).toMatch(/Hver måned fra 1 måned etter dag 8.*75 mg/)

    // En ny regelversjon uten ny godkjenning: verken planen eller beregningen står igjen.
    const regelsett = structuredClone(REGELSETT)
    regelsett.regler.find((r) => r.id === XEPLION)!.versjon += 1
    rerender(<Verktoyside verktoy="bytte-antipsykotikum" legemidler={fra(PILOT)} sperrer={INGEN_SPERRER} regelvarsler={INGEN_VARSLER} onLukk={onLukk} regelsett={regelsett} klokke={klokke(PILOT)} />)
    expect(tidslinje()).toBeNull()
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
  })

  // Escitalopram (versjon 14 med tabletter og dråper, og versjon 13 før godkjenningen): src/__tests__/verktoyb2side.test.tsx.

  describe('forenklingen (VDR-3)', () => {
    // En godkjent regel som gir en komplett plan; klinikere får aldri en delplan (Peders beslutning 03.11.2026).
    const XEPLION = 'depot-paliperidon-xeplion'
    const XEPLION_SNARVALG = 'Paliperidon: peroral → depotinjeksjon (paliperidonpalmitat)'
    const versjon = REGELSETT.regler.find((r) => r.id === XEPLION)!.versjon
    const beregnXeplion = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose av paliperidon/ }), '6')
      await besvar(user)
    }
    const velgXeplion = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
      await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
      await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
      await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))
    }

    it('fyller ut feltene med et snarvalg, viser et faglig varsel bare ved regelversjonen det gjelder uten å sperre, og skriver ut det faglige grunnlaget', async () => {
      const user = userEvent.setup()
      // Hele kjeden fra databasesvaret: lageret appen bruker, med `les_regelvarsler` som syntetisk databasekall.
      const kall = vi.fn(async (funksjon: string) => {
        expect(funksjon).toBe('les_regelvarsler')
        return [
          { regel: XEPLION, versjon, tekst: 'Under faglig gjennomgang: syntetisk varsel.', siden: '2026-11-01T08:00:00Z' },
          { regel: XEPLION, versjon: versjon - 1, tekst: 'Syntetisk varsel for en eldre versjon.', siden: '2026-11-01T08:00:00Z' },
          { regel: 'depot-aripiprazol-maintena', versjon: 3, tekst: 'Syntetisk varsel for en annen regel.', siden: '2026-11-01T08:00:00Z' },
        ]
      })
      vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), regelvarsler: lagRegelvarsellager(kall) })
      await act(async () => {})
      expect(kall).toHaveBeenCalled()
      expect(screen.queryByRole('note')).toBeNull()
      await user.click(within(screen.getByRole('group', { name: 'Kan beregnes nå:' })).getByRole('button', { name: XEPLION_SNARVALG, pressed: false }))
      expect((screen.getByRole('combobox', { name: 'Bytte fra' }) as HTMLInputElement).value).toBe('Paliperidon')
      expect((screen.getByRole('combobox', { name: 'Bytte til' }) as HTMLInputElement).value).toBe('Paliperidon')
      expect(screen.getByRole('button', { name: XEPLION_SNARVALG, pressed: true })).toBeTruthy()
      expect(screen.getByRole('note').textContent).toBe('Under faglig gjennomgang: syntetisk varsel. Fra 01.11.2026 kl. 09:00.')
      expect(screen.queryByText(/eldre versjon|annen regel/)).toBeNull()

      await beregnXeplion(user)
      // Varselet sperrer ikke, og står én gang: i planen den gjelder.
      const plan = await planen(REGELSETT.regler.find((r) => r.id === XEPLION)!.tittel)
      expect(screen.getAllByRole('note')).toHaveLength(1)
      expect(within(plan).getByRole('note')).toBeTruthy()

      const grunnlag = within(plan).getByText('Kilder og versjon').closest('details')!
      expect(grunnlag.open).toBe(false)
      fireEvent(window, new Event('beforeprint'))
      expect(grunnlag.open).toBe(true)
      fireEvent(window, new Event('afterprint'))
      expect(grunnlag.open).toBe(false)
    })

    it('sier kort fra ved anbefalingen når varslene ikke kan leses, og beregner likevel med nødstoppen kontrollert som før', async () => {
      const user = userEvent.setup()
      const sperrer = { les: vi.fn(async () => []) }
      const varsler = { les: vi.fn(async (): Promise<never> => Promise.reject(new Error('nettverksfeil'))) }
      vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), sperrer, regelvarsler: varsler })
      await user.click(await screen.findByRole('button', { name: XEPLION_SNARVALG }))
      expect(varsler.les).toHaveBeenCalled()
      expect(screen.getByRole('note').textContent).toBe(VARSLER_ULEST)
      const lest = sperrer.les.mock.calls.length
      await beregnXeplion(user)
      const plan = await planen(/Xeplion/)
      // Sperrene leses på nytt rett før planen vises, som før; merknaden står i planen.
      expect(sperrer.les.mock.calls.length).toBeGreaterThan(lest)
      expect(within(plan).getByRole('note').textContent).toBe(VARSLER_ULEST)
      cleanup()

      // En aktiv nødstopp gjelder fortsatt når varslene ikke kan leses.
      vis({
        verktoy: 'bytte-antipsykotikum',
        legemidler: fra(PILOT),
        klokke: klokke(PILOT),
        regelvarsler: varsler,
        sperrer: { les: async () => [{ id: 's', omfang: 'regel' as const, mal: XEPLION, grunn: 'Syntetisk sperre.', satt_kl: '2026-11-01T08:00:00Z', satt_av: 'Ada Admin' }] },
      })
      await velgXeplion(user)
      expect((await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).textContent).toMatch(/Syntetisk sperre\./)
      expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()

      // Uten lager sies det samme, ikke ingenting.
      cleanup()
      vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), regelvarsler: undefined })
      await user.click(await screen.findByRole('button', { name: XEPLION_SNARVALG }))
      expect(screen.getByRole('note').textContent).toBe(VARSLER_ULEST)
    })

    it('tilbyr ingen snarvalg og lover ingenting om hva som kan beregnes før nødstoppen er lest, og holder sperrede valg utenfor', async () => {
      const sperre = (omfang: Verktoysperre['omfang'], mal: string): Verktoysperre => ({
        id: `s-${omfang}`,
        omfang,
        mal,
        grunn: 'Syntetisk sperre.',
        satt_kl: '2026-11-01T08:00:00Z',
        satt_av: 'Ada Admin',
      })
      const side = (sperrer: VerktoysideProps['sperrer']) => vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), sperrer })
      // En sperre på Xeplion holder bare det valget utenfor; aripiprazol står fortsatt.
      const ingenSnarvalg = (ingenGruppe = true) => {
        if (ingenGruppe) expect(screen.queryByRole('group', { name: 'Kan beregnes nå:' })).toBeNull()
        expect(screen.queryByRole('button', { name: XEPLION_SNARVALG })).toBeNull()
      }

      side({ les: () => new Promise<Verktoysperre[]>(() => {}) })
      await act(async () => {})
      ingenSnarvalg()
      expect(screen.getByText(TILGJENGELIGHET_UKONTROLLERT.henter)).toBeTruthy()
      cleanup()

      side({ les: async () => Promise.reject(new Error('nettverksfeil')) })
      await act(async () => {})
      ingenSnarvalg()
      expect(screen.getByText(TILGJENGELIGHET_UKONTROLLERT.feil)).toBeTruthy()
      cleanup()

      // En kjent sperre på regelen eller verktøyet holder valget utenfor; uten sperre står det.
      for (const [sperrer, ingenGruppe] of [
        [[sperre('regel', XEPLION)], false],
        [[sperre('verktoy', 'bytte-antipsykotikum')], true],
      ] as const) {
        side({ les: async () => [...sperrer] })
        await act(async () => {})
        ingenSnarvalg(ingenGruppe)
        expect(screen.queryByText(/Kontrollerer tilgjengeligheten|Kan ikke kontrollere tilgjengeligheten/)).toBeNull()
        cleanup()
      }
      side({ les: async () => [] })
      expect(await screen.findByRole('button', { name: XEPLION_SNARVALG })).toBeTruthy()
    })

    describe('når varslene ikke svarer eller svaret har ukjent form', () => {
      beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }))
      afterEach(() => vi.useRealTimers())

      it('sier at merknadene hentes, og etter fristen at de ikke kunne hentes, mens beregningen og nødstoppen virker som før', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        const sperrer = { les: vi.fn(async (): Promise<Verktoysperre[]> => []) }
        const varsler = { les: vi.fn(() => new Promise<never>(() => {})) }
        vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), sperrer, regelvarsler: varsler })
        await user.click(await screen.findByRole('button', { name: XEPLION_SNARVALG }))
        // Ikke «ingen merknad» før det er kjent.
        expect(screen.getByRole('note').textContent).toBe(VARSLER_HENTES)
        await act(() => vi.advanceTimersByTimeAsync(LESEFRIST_MS - 1_000))
        expect(screen.getByRole('note').textContent).toBe(VARSLER_HENTES)
        await act(() => vi.advanceTimersByTimeAsync(1_000))
        expect(screen.getByRole('note').textContent).toBe(VARSLER_ULEST)

        const lest = sperrer.les.mock.calls.length
        await beregnXeplion(user)
        const plan = await planen(/Xeplion/)
        expect(sperrer.les.mock.calls.length).toBeGreaterThan(lest)
        expect(within(plan).getByRole('note').textContent).toBe(VARSLER_ULEST)

        // En aktiv nødstopp sperrer fortsatt mens varslene henger.
        cleanup()
        vis({
          verktoy: 'bytte-antipsykotikum',
          legemidler: fra(PILOT),
          klokke: klokke(PILOT),
          regelvarsler: varsler,
          sperrer: { les: async () => [{ id: 's', omfang: 'regel' as const, mal: XEPLION, grunn: 'Syntetisk sperre.', satt_kl: '2026-11-01T08:00:00Z', satt_av: 'Ada Admin' }] },
        })
        await velgXeplion(user)
        expect((await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).textContent).toMatch(/Syntetisk sperre\./)
        expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
      })

      it('regner et svar som ikke er en liste av varsler, som ulest, ikke som ingen varsler', async () => {
        const gyldig = { regel: XEPLION, versjon, tekst: 'Under faglig gjennomgang: syntetisk varsel.', siden: '2026-11-01T08:00:00Z' }
        for (const svar of [null, {}, { varsler: [gyldig] }, [gyldig, { ...gyldig, tekst: null }], [{ ...gyldig, versjon: String(versjon) }]]) {
          const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
          vis({ verktoy: 'bytte-antipsykotikum', legemidler: fra(PILOT), klokke: klokke(PILOT), regelvarsler: lagRegelvarsellager(async () => svar) })
          await user.click(await screen.findByRole('button', { name: XEPLION_SNARVALG }))
          await act(async () => {})
          expect(screen.getByRole('note').textContent).toBe(VARSLER_ULEST)
          expect(screen.getByRole('heading', { name: /^Steg 2/ })).toBeTruthy()
          cleanup()
        }
        await expect(lagRegelvarsellager(async () => ({})).les()).rejects.toThrow(UGYLDIGE_REGELVARSLER)
        expect(await lagRegelvarsellager(async () => [gyldig]).les()).toEqual([gyldig])
      })
    })

    it('merker det som mangler før planen beregnes, og sier med en gang hva et pasientforhold som gjelder betyr', async () => {
      const user = userEvent.setup()
      const legemidler = fra(PILOT)
      vis({ verktoy: 'bytte-antipsykotikum', legemidler, klokke: klokke(PILOT) })
      await user.click(await screen.findByRole('button', { name: 'Aripiprazol: peroral → depotinjeksjon' }))
      await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av aripiprazol/ }), '10')
      // FEST har flere former: steg 2 spør, og verktøyet velger ikke selv.
      const form = await screen.findByRole('radiogroup', { name: 'Legemiddelform av aripiprazol' }, { timeout: 3000 })
      await user.click(within(form).getByRole('radio', { name: 'Tablett' }))
      // Uten svar: ingen plan, bare preparatene for steg 2 er hentet, og knappen sier hvor mange spørsmål som gjenstår.
      const hopp = await screen.findByRole('button', { name: /^(Ett|\d+) spørsmål igjen$/ })
      expect(within(planpanel()).getByText(/^(Ett|\d+) spørsmål igjen$/)).toBeTruthy()
      expect(legemidler.les).toHaveBeenCalledOnce()
      await user.click(hopp)
      // Regelen har en kontrollert katalog: forutsetningen og forholdene stilles som spørsmål med Ja, Nei og Ukjent, og de som mangler svar, merkes.
      const stopp = screen.getByRole('group', { name: 'Forhold som stopper en automatisk plan' })
      const [forutsetning, forhold] = within(stopp).getAllByRole('radiogroup') as [HTMLElement, HTMLElement]
      await waitFor(() => expect(forutsetning.getAttribute('aria-invalid')).toBe('true'))
      expect(forhold.getAttribute('aria-invalid')).toBe('true')
      await user.click(within(forutsetning).getByRole('radio', { name: 'Ja' }))
      expect(forutsetning.getAttribute('aria-invalid')).toBeNull()

      // Et forhold som stopper: svaret sier straks hva det betyr, ved spørsmålet og i panelet.
      const ved = forhold.closest('li')!
      expect(ved.querySelector('.sporsmal__merknad')).toBeNull()
      await user.click(within(forhold).getByRole('radio', { name: 'Ja' }))
      expect(ved.querySelector('.sporsmal__merknad:not([data-tone])')!.textContent).toMatch(/\S/)
      expect(within(planpanel()).getByText('Ingen plan med disse svarene')).toBeTruthy()
      await user.click(within(forhold).getByRole('radio', { name: 'Nei' }))
      expect(ved.querySelector('.sporsmal__merknad')).toBeNull()
      expect(legemidler.les).toHaveBeenCalledOnce()
    })
  })
})
