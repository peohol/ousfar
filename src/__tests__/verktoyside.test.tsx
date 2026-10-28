// @vitest-environment jsdom
/**
 * Verktøysidene (`#/verktoy`, P6 i `docs/verktøy-utviklingsplan.md`):
 *
 * - Oversikten viser de tre verktøyene og at ingen beregning er tilgjengelig
 *   så lenge ingen regel er klinisk godkjent; en ukjent adresse sier fra.
 * - Med pilotreglene står det at faglig kontroll gjenstår, uten skjema,
 *   uten henting fra FEST og uten tabell.
 * - Med en regel godkjent bare i testen og syntetiske preparater i FESTs form
 *   ber siden om formulering og form, viser planen, kopierer og skriver den
 *   ut. Endrede inndata, foreldet FEST og en ny dag tar planen bort.
 * - Det som er fylt inn, kommer tilbake etter en oppdatering av appen; planen
 *   gjør det ikke, og må beregnes på nytt.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { glemBildet, oppdaterOgTaVare, taBilde } from '../oppdatering/bevaring'
import { KARTLEGGING } from '../verktoy/register'
import { godkjennITest, TEST_DEPOT, TEST_NEDTRAPPING, TESTKLOKKE, testFest, testsett } from './hjelp/verktoyplan'

beforeEach(() => {
  window.scrollTo = () => {}
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function vis(props: Partial<VerktoysideProps> = {}) {
  const onLukk = vi.fn()
  const utskrift = render(<Verktoyside legemidler={undefined} onLukk={onLukk} {...props} />)
  return { onLukk, ...utskrift }
}

/** FEST-lesingen, med preparatene `utvalg` gir. */
const lesing = (utvalg: () => Legemiddelutvalg = () => testFest()) => ({ les: vi.fn(async (_ider: string[]) => utvalg()) })

const ESCITALOPRAM_FEST = KARTLEGGING.virkestoffer.find((v) => v.nokkel === 'escitalopram')!.fest

/** Fyller inn escitalopram og 25 mg, og velger tablettene når siden ber om det. */
async function fyllInn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
  await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), '25')
  await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
  expect(await screen.findByText('Velg formulering og legemiddelform over, og beregn på nytt.')).toBeTruthy()
  expect(screen.queryByRole('table')).toBeNull()
  await user.selectOptions(screen.getByRole('combobox', { name: 'Formulering av escitalopram' }), 'peroral')
  await user.selectOptions(screen.getByRole('combobox', { name: 'Legemiddelform av escitalopram' }), 'SYN-TAB')
}

describe('oversikten', () => {
  it('viser de tre verktøyene, og at ingen beregning er tilgjengelig ennå', () => {
    vis()
    expect(screen.getByRole('heading', { level: 1, name: 'Verktøy' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(document.title).toBe('Verktøy – OUSFAR')
    const kort = screen.getAllByRole('link').filter((a) => a.classList.contains('verktoykort__lenke'))
    expect(kort.map((a) => a.getAttribute('href'))).toEqual(['#/verktoy/trappe-ned-antidepressiv', '#/verktoy/bytte-antidepressiv', '#/verktoy/bytte-antipsykotikum'])
    expect(kort.map((a) => a.querySelector('.verktoykort__status')?.textContent)).toEqual([
      'Ingen beregning tilgjengelig ennå · 2 til faglig kontroll',
      'Ingen beregning tilgjengelig ennå · 2 til faglig kontroll',
      'Ingen beregning tilgjengelig ennå · 4 til faglig kontroll',
    ])
    expect(screen.getByText(/Ingen beregninger er tilgjengelige ennå/)).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('sier fra om en adresse uten verktøy, og lukkes med Esc', async () => {
    const { onLukk } = vis({ verktoy: 'finnes-ikke' })
    expect(screen.getByRole('alert').textContent).toMatch(/Fant ikke verktøyet/)
    await userEvent.keyboard('{Escape}')
    expect(onLukk).toHaveBeenCalledOnce()
  })
})

describe('med pilotreglene', () => {
  it('sier at beregning ikke er tilgjengelig fordi faglig kontroll gjenstår, og henter ingenting', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'bytte-antipsykotikum', legemidler })
    expect(screen.getByText(/Velg begge virkestoffene/)).toBeTruthy()
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    // Paliperidon finnes både peroralt og som depot; formuleringen velges aldri for brukeren.
    const formulering = screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })
    expect(within(formulering).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    await user.click(within(formulering).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))

    const status = screen.getByRole('status')
    expect(within(status).getByRole('heading', { name: 'Beregning er ikke tilgjengelig' })).toBeTruthy()
    expect(status.textContent).toMatch(/faglig kontroll av regelen gjenstår/)
    expect(status.textContent).toMatch(/til faglig kontroll/)
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(legemidler.les).not.toHaveBeenCalled()
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
    await user.type(felt, 'Agomelatin')
    expect(screen.getByRole('status').textContent).toMatch(/Ikke støttet.*ingen regel/)
  })
})

describe('med en regel godkjent bare i testen', () => {
  const regelsett = testsett(TEST_NEDTRAPPING)

  it('ber om det som mangler, viser planen og kopierer og skriver den ut', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    const print = vi.spyOn(window, 'print').mockImplementation(() => {})
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })

    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    expect(screen.getByText(/Beregningen er tilgjengelig/)).toBeTruthy()
    // Regelen har ingen måldose, og ingen er skjult.
    expect(screen.queryByRole('textbox', { name: /Måldose/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(screen.getByRole('alert').textContent).toBe('Aktuell døgndose må fylles inn som et tall større enn 0.')
    expect(legemidler.les).not.toHaveBeenCalled()
    await user.clear(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }))

    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    const plan = await screen.findByRole('region', { name: TEST_NEDTRAPPING.tittel })
    expect(legemidler.les).toHaveBeenLastCalledWith(ESCITALOPRAM_FEST)
    const rader = within(plan).getAllByRole('row').map((r) => [...r.querySelectorAll('th, td')].map((c) => c.textContent))
    expect(rader[0]).toEqual(['Når', 'Escitalopram peroralt'])
    expect(rader[1]![0]).toBe('Dag 1–14')
    expect(rader[1]![1]).toMatch(/^12,5 mg.*1 tablett à 10 mg.*½ tablett à 5 mg/)
    expect(rader.at(-1)![1]).toMatch(/Seponert/)
    expect(within(plan).getByRole('heading', { name: 'Versjoner' })).toBeTruthy()
    expect(within(plan).getByRole('heading', { name: 'Advarsler' })).toBeTruthy()

    await user.click(within(plan).getByRole('button', { name: 'Kopier planen' }))
    const tekst = await navigator.clipboard.readText()
    // Kopien har det samme som skjermen: hver del under tabellen, med hver linje.
    for (const del of plan.querySelectorAll('.doseplan__del')) {
      const tittel = del.querySelector('h3')!.textContent!
      if (tittel === 'Kilder') continue
      expect(tekst).toContain(`\n${tittel}:\n`)
      for (const li of del.querySelectorAll('li')) expect(tekst).toContain(`- ${li.textContent}`)
    }
    expect(tekst).toMatch(/\nKontroller:\n- Hver døgndose av escitalopram/)
    expect(tekst).toMatch(/^Trappe ned antidepressiv\n/)
    expect(tekst).toMatch(/Dag 1–14: Escitalopram peroralt: 12,5 mg = 1 tablett à 10 mg \+ ½ tablett à 5 mg/)
    expect(within(plan).getByRole('status').textContent).toBe('Planen er kopiert.')
    await user.click(within(plan).getByRole('button', { name: 'Skriv ut' }))
    expect(print).toHaveBeenCalledOnce()

    // Endres en dose, står ingen plan igjen før den er beregnet på nytt.
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '0')
    expect(screen.queryByRole('region', { name: TEST_NEDTRAPPING.tittel })).toBeNull()
    expect(screen.getByText('Inndataene er endret. Beregn på nytt for å se en plan.')).toBeTruthy()
  })

  it('viser bare resultatet av den siste beregningen, også når en eldre henting blir ferdig senere', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    // To hentinger fra FEST som svarer i omvendt rekkefølge.
    const svar: ((u: Legemiddelutvalg) => void)[] = []
    legemidler.les.mockImplementation(() => new Promise<Legemiddelutvalg>((ok) => svar.push(ok)))
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    const dose = screen.getByRole('textbox', { name: /Aktuell døgndose/ })
    await user.clear(dose)
    await user.type(dose, '20')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(svar).toHaveLength(2)
    await act(async () => svar[1]!(testFest()))
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(within(screen.getByRole('table')).getAllByRole('row')[1]!.textContent).toMatch(/^Dag 1–1410 mg/)
    await act(async () => svar[0]!(testFest()))
    expect(screen.getByRole('table')).toBeTruthy()
    expect(screen.queryByText('Inndataene er endret. Beregn på nytt for å se en plan.')).toBeNull()
  })

  it('tar planen bort når FEST-kopien blir foreldet eller dagen skifter, og gir ingen plan med foreldet FEST', async () => {
    const user = userEvent.setup()
    let tid = TESTKLOKKE()
    const klokke = () => tid
    const legemidler = lesing()
    const { rerender, onLukk } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke })
    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()

    // Midnatt i Norge: preparatstatusen gjaldt i går.
    tid = new Date('2026-11-01T23:30:00Z')
    rerender(<Verktoyside verktoy="trappe-ned-antidepressiv" legemidler={legemidler} onLukk={onLukk} regelsett={regelsett} klokke={() => tid} />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText(/Planen gjelder ikke lenger/)).toBeTruthy()

    // En ny beregning med den samme, nå foreldede kopien stopper.
    tid = new Date('2026-11-03T12:00:00Z')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    const stopp = await screen.findByRole('heading', { name: 'Ingen doseplan' })
    expect(stopp.parentElement!.textContent).toMatch(/sist kontrollert mot FEST/)
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('stopper når legemiddeldataene ikke kan hentes, eller ikke er FEST', async () => {
    const user = userEvent.setup()
    const legemidler = { les: vi.fn(async () => Promise.reject(new Error('Nettverket svarte ikke.'))) }
    const { unmount } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '25')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/Fikk ikke hentet preparatene fra FEST\. Nettverket svarte ikke\./)
    unmount()

    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(() => ({ ...testFest(), kilde: 'Syntetiske testdata' })), regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    const stopp = await screen.findByRole('heading', { name: 'Ingen doseplan' })
    expect(stopp.parentElement!.textContent).toMatch(/ikke fra FEST/)
  })

  it('tar vare på det som er fylt inn gjennom en oppdatering av appen, men ikke planen', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()

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
    expect((screen.getByRole('textbox', { name: /Aktuell døgndose/ }) as HTMLInputElement).value).toBe('25')
    expect(screen.queryByRole('table')).toBeNull()
    expect(legemidler.les).not.toHaveBeenCalled()
    // Planen kommer bare tilbake med en ny beregning, med FEST lest og godkjenningen kontrollert på nytt.
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(legemidler.les).toHaveBeenCalledOnce()
    // Formvalget fra før oppdateringen gjelder fortsatt, så siden ber ikke om det igjen.
    expect(screen.queryByText('Velg formulering og legemiddelform over, og beregn på nytt.')).toBeNull()
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

  it('tar ikke med bekreftelser, svar på unntak eller måldose til en annen strategi, men beholder dosen', async () => {
    const user = userEvent.setup()
    const annen = structuredClone(TEST_DEPOT)
    annen.tittel = 'SYNTETISK TESTREGEL: annen strategi'
    const regelsett = testsett(TEST_DEPOT, godkjennITest(annen, 'test-depot-annen'))
    vis({ verktoy: 'bytte-antipsykotikum', legemidler: lesing(), regelsett, klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))

    const strategi = screen.getByRole('group', { name: 'Strategi' })
    await user.click(within(strategi).getByRole('radio', { name: TEST_DEPOT.tittel }))
    await user.type(screen.getByRole('textbox', { name: /Aktuell døgndose/ }), '6')
    const unntak = () => screen.getByRole('group', { name: 'Et syntetisk unntak som må besvares.' })
    await user.click(within(unntak()).getByRole('radio', { name: 'Gjelder ikke' }))
    await user.click(screen.getByRole('checkbox', { name: /godkjenningsfritak/ }))

    await user.click(within(strategi).getByRole('radio', { name: annen.tittel }))
    expect(within(unntak()).getAllByRole('radio').map((r) => (r as HTMLInputElement).checked)).toEqual([false, false])
    expect((screen.getByRole('checkbox', { name: /godkjenningsfritak/ }) as HTMLInputElement).checked).toBe(false)
    expect((screen.getByRole('textbox', { name: /Aktuell døgndose/ }) as HTMLInputElement).value).toBe('6')
    // Og tilbake: svaret for den første strategien er heller ikke tatt vare på.
    await user.click(within(strategi).getByRole('radio', { name: TEST_DEPOT.tittel }))
    expect(within(unntak()).getAllByRole('radio').map((r) => (r as HTMLInputElement).checked)).toEqual([false, false])
  })
})
