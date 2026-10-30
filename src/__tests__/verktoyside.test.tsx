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
 * - En regel som lar forskriveren justere en verdi, får et felt for den; et
 *   valg innenfor området gir planen og står som kontroll, et valg utenfor
 *   stopper. Et spørsmål må besvares, og et valg som krever begrunnelse,
 *   stopper uten den; svaret og begrunnelsen står i planen.
 * - Når et trinn ikke kan gis nøyaktig og regelen tillater det, viser siden de
 *   nærmeste dosene som kan gis, med faktisk reduksjon; et valg gir en ny
 *   plan med en gang, står i planen og kan fjernes.
 */
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { glemBildet, oppdaterOgTaVare, taBilde } from '../oppdatering/bevaring'
import { KARTLEGGING } from '../verktoy/register'
import { godkjennITest, TEST_BEGRUNNELSE, TEST_DEPOT, TEST_JUSTERBAR, TEST_NEDTRAPPING, TEST_TRINNVALG, TESTKLOKKE, testFest, testsett } from './hjelp/verktoyplan'

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
  it('viser de tre verktøyene, og at bare de to godkjente depotreglene kan beregnes', () => {
    vis()
    expect(screen.getByRole('heading', { level: 1, name: 'Verktøy' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(document.title).toBe('Verktøy – OUSFAR')
    const kort = screen.getAllByRole('link').filter((a) => a.classList.contains('verktoykort__lenke'))
    expect(kort.map((a) => a.getAttribute('href'))).toEqual(['#/verktoy/trappe-ned-antidepressiv', '#/verktoy/bytte-antidepressiv', '#/verktoy/bytte-antipsykotikum'])
    expect(kort.map((a) => a.querySelector('.verktoykort__status')?.textContent)).toEqual([
      'Ingen beregning tilgjengelig ennå · 24 til faglig kontroll',
      'Ingen beregning tilgjengelig ennå · 2 til faglig kontroll',
      '2 regler kan beregnes · 1 til faglig kontroll',
    ])
    expect(screen.queryByText(/Ingen beregninger er tilgjengelige ennå/)).toBeNull()
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
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Olanzapin')
    // Olanzapin finnes både peroralt og som depot; formuleringen velges aldri for brukeren.
    const formulering = screen.getByRole('group', { name: 'Formulering av olanzapin (bytte fra)' })
    expect(within(formulering).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    await user.click(within(formulering).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Kvetiapin')

    const status = screen.getByRole('status')
    expect(within(status).getByRole('heading', { name: 'Beregning er ikke tilgjengelig' })).toBeTruthy()
    expect(status.textContent).toMatch(/faglig kontroll av regelen gjenstår/)
    expect(status.textContent).toMatch(/til faglig kontroll/)
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    expect(legemidler.les).not.toHaveBeenCalled()
  })

  it('tilbyr beregning for en depotregel kontrolløren har godkjent, og henter preparatene først når forskriveren beregner', async () => {
    const user = userEvent.setup()
    const legemidler = lesing()
    vis({ verktoy: 'bytte-antipsykotikum', legemidler })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Paliperidon')
    // Paliperidon finnes både peroralt og som depot; formuleringen velges aldri for brukeren.
    const formulering = screen.getByRole('group', { name: 'Formulering av paliperidon (bytte fra)' })
    expect(within(formulering).getAllByRole('radio').every((r) => !(r as HTMLInputElement).checked)).toBe(true)
    await user.click(within(formulering).getByRole('radio', { name: 'Peroral' }))
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Paliperidon')
    await user.click(within(screen.getByRole('group', { name: 'Formulering av paliperidon (bytte til)' })).getByRole('radio', { name: /^Depotinjeksjon/ }))
    expect(screen.queryByText(/faglig kontroll av regelen gjenstår/)).toBeNull()
    expect(screen.getByRole('button', { name: 'Beregn doseplan' })).toBeTruthy()
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
    expect(within(fagtekst).getByText(/^Klinisk godkjent 30\.10\.2026 av ChatGPT \(uavhengig fagkontrollør\), regelversjon 1\..*gjelder ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler\.$/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()
    // Duloksetin er også bare fagtekst, men ikke godkjent: da står bare at faglig kontroll gjenstår.
    await user.clear(felt)
    await user.type(felt, 'Duloksetin')
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Beregning er ikke tilgjengelig.*Seponering av duloksetin.*til faglig kontroll/)
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
    // Planen går ikke til null: siste dose fortsetter til avslutningen er vurdert, og den er ikke «siste dose før seponering».
    expect(rader.at(-1)!).toEqual(['Fra dag 15', expect.stringMatching(/^6,25 mg.*1¼ tabletter à 5 mg/)])
    expect(within(plan).getByText(/Fra dag 15 står pasienten på 6,25 mg av escitalopram til planen revurderes.*Planen stopper her av tekniske grunner\. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping\. Dosen er ikke nødvendigvis en sluttdose\./)).toBeTruthy()
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

describe('med en regel forskriveren kan justere', () => {
  it('viser feltet med forslaget, bruker valget innenfor området og stopper utenfor', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_JUSTERBAR), klokke: TESTKLOKKE })
    await fyllInn(user)
    const felt = screen.getByRole('textbox', { name: 'Dager per trinn' }) as HTMLInputElement
    expect(felt.placeholder).toBe('14 dager')
    expect(felt.getAttribute('aria-describedby') && document.getElementById(felt.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Dager per trinn: Regelens forslag er 14 dager; tomt felt bruker forslaget. Regelen tillater 14–28 dager.',
    )
    // Tomt felt: regelens forslag.
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    const rad = async () => within(await screen.findByRole('region', { name: TEST_JUSTERBAR.tittel })).getAllByRole('row')[1]!.querySelector('th, td')!.textContent
    expect(await rad()).toBe('Dag 1–14')
    // Innenfor området: valget gir planen og står som kontroll.
    await user.type(felt, '28')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await rad()).toBe('Dag 1–28')
    expect(screen.getByText(/Dager per trinn er valgt av forskriveren innenfor regelens område: oppfylt \(28 dager i stedet for regelens forslag 14 dager; regelen tillater 14–28 dager\.\)/)).toBeTruthy()
    // Utenfor området: ingen plan.
    await user.clear(felt)
    await user.type(felt, '30')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByText('Dager per trinn: 30 dager er utenfor det regelen tillater (14–28 dager).')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('krever svar på regelens spørsmål, og begrunnelse for et valg som krever det, og viser begge i planen', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_BEGRUNNELSE), klokke: TESTKLOKKE })
    await fyllInn(user)
    const sporsmal = screen.getByRole('group', { name: 'Et syntetisk spørsmål som må besvares.' })
    const felt = screen.getByRole('textbox', { name: 'Dager per trinn' })
    const begrunnelse = screen.getByRole('textbox', { name: 'Begrunnelse for valgene' })
    expect(document.getElementById(begrunnelse.getAttribute('aria-describedby')!)?.textContent).toMatch(/^Begrunnelse kreves ved Dager per trinn under 21 dager ved syntetisk ja, .*skriv ikke navn eller andre personopplysninger\.$/)
    // Uten svar: ingen plan.
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByText(/Må besvares før beregning: Et syntetisk spørsmål som må besvares\./)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    // Ja, og 14 dager uten begrunnelse: ingen plan.
    await user.click(within(sporsmal).getByRole('radio', { name: 'Ja' }))
    await user.type(felt, '14')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByText(/Dager per trinn 14 dager krever en skriftlig begrunnelse fra forskriveren/)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    // Med begrunnelse: planen, med svaret og begrunnelsen.
    await user.type(begrunnelse, 'Syntetisk begrunnelse.')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(screen.getByText(/Et syntetisk spørsmål som må besvares\. Ja/)).toBeTruthy()
    expect(screen.getByText(/Forskriverens begrunnelse: «Syntetisk begrunnelse\.»/)).toBeTruthy()
    // Nei: 14 dager krever ingen begrunnelse.
    await user.clear(begrunnelse)
    await user.click(within(sporsmal).getByRole('radio', { name: 'Nei' }))
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()
    expect(screen.queryByText(/Forskriverens begrunnelse/)).toBeNull()
  })

  it('har ikke feltet for en regel uten valg', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_NEDTRAPPING), klokke: TESTKLOKKE })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    expect(screen.queryByRole('group', { name: /Tilpasning av planen/ })).toBeNull()
  })
})

describe('med en regel der forskriveren kan velge dosen for et trinn som ikke kan gis', () => {
  it('viser de nærmeste dosene med faktisk reduksjon, beregner på nytt fra valget og lar valgene fjernes', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler: lesing(), regelsett: testsett(TEST_TRINNVALG), klokke: TESTKLOKKE })
    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    // 25 mg → 18,75 mg kan gis; neste trinn (14,06 mg) kan ikke, så planen står på 18,75 mg og tilbyr de nærmeste dosene.
    const tabell = await screen.findByRole('region', { name: TEST_TRINNVALG.tittel })
    expect(within(tabell).getAllByRole('row').at(-1)!.textContent).toMatch(/18,75 mg/)
    const valg = screen.getByRole('group', { name: 'Trinn 2 av Escitalopram kan ikke gis nøyaktig' })
    expect(within(valg).getByText(/Den foretrukne reduksjonen til 14,06 mg \(−25,01 % fra 18,75 mg\) kan ikke gis med preparatene\. Velg en dose som kan gis; den faktiske reduksjonen må være 5–50 %\. En dose som krever begrunnelse, er et avvik/)).toBeTruthy()
    expect(within(valg).getAllByRole('button').map((b) => b.textContent)).toEqual(['13,75 mg (−26,67 %, avvik som krever begrunnelse)', '15 mg (−20 %)'])
    // Valget gir en ny plan med en gang, fra den valgte dosen, og står i planen og i skjemaet.
    await user.click(within(valg).getByRole('button', { name: '15 mg (−20 %)' }))
    expect(await screen.findByText(/valgt av forskriveren \(beregnet 14,06 mg; −20 %\)/)).toBeTruthy()
    expect(screen.getByText(/escitalopram (fra )?dag [\d–]+: 15 mg, valgt av forskriveren fordi den beregnede dosen 14,06 mg ikke kan gis; faktisk reduksjon 20 % fra dosen før\./i)).toBeTruthy()
    const valgte = screen.getByRole('group', { name: 'Valgte doser per trinn' })
    expect(within(valgte).getByRole('listitem').textContent).toBe('Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)')
    // Et valg som krever begrunnelse, stopper uten den.
    // 15 mg → 11,25 mg kan gis; 8,44 mg kan ikke, og 7,5 mg (−33,33 %) krever begrunnelse.
    const neste = await screen.findByRole('group', { name: 'Trinn 4 av Escitalopram kan ikke gis nøyaktig' })
    expect(within(neste).getAllByRole('button').map((b) => b.textContent)).toEqual(['7,5 mg (−33,33 %, avvik som krever begrunnelse)', '8,75 mg (−22,22 %)'])
    await user.click(within(neste).getByRole('button', { name: '7,5 mg (−33,33 %, avvik som krever begrunnelse)' }))
    expect(await screen.findByText(/Trinn 4 av escitalopram: den valgte dosen 7,5 mg er en reduksjon på 33,33 % og krever en skriftlig begrunnelse fra forskriveren \(over 25 %\)\. Skriv begrunnelsen, eller velg en annen dose\./)).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Valgte doser per trinn' })).getAllByRole('listitem').map((x) => x.textContent)).toEqual([
      'Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)',
      'Trinn 4 av Escitalopram: 7,5 mg (fra 11,25 mg)',
    ])
    // Valgene kan fjernes; planen må da beregnes på nytt.
    await user.click(within(screen.getByRole('group', { name: 'Valgte doser per trinn' })).getByRole('button', { name: 'Fjern valgene' }))
    expect(screen.queryByRole('group', { name: 'Valgte doser per trinn' })).toBeNull()
    expect(await screen.findByText('Inndataene er endret. Beregn på nytt for å se en plan.')).toBeTruthy()
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
