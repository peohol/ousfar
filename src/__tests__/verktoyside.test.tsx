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
import { readFileSync } from 'node:fs'
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import type { Legemiddelutvalg } from '../legemiddeldata/lesing'
import { glemBildet, oppdaterOgTaVare, taBilde } from '../oppdatering/bevaring'
import { KARTLEGGING } from '../verktoy/register'
import type { Verktoysperre } from '../verktoy/sperrer'
import { osloDato } from '../verktoy/doseplan'
import { STARTFORLOP } from '../verktoy/planvisning'
import { FEST_AKSEPTTEST, FEST_PILOT, type Festuttrekk } from '../verktoy/regler/aksepttest'
import { avregistrert, tidFor } from '../verktoy/regler/pilotmatrise'
import { REGELSETT } from '../verktoy/tilgjengelighet'
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

/** Nødstoppen uten aktive sperrer. */
const INGEN_SPERRER = { les: async () => [] }

function vis(props: Partial<VerktoysideProps> = {}) {
  const onLukk = vi.fn()
  const utskrift = render(<Verktoyside legemidler={undefined} sperrer={INGEN_SPERRER} onLukk={onLukk} {...props} />)
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
  it('viser de tre verktøyene, og at bare de godkjente reglene kan beregnes: vortioksetin, sertralin → mirtazapin og de to depotreglene', () => {
    vis()
    expect(screen.getByRole('heading', { level: 1, name: 'Verktøy' })).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('heading', { level: 1 }))
    expect(document.title).toBe('Verktøy – OUSFAR')
    const kort = screen.getAllByRole('link').filter((a) => a.classList.contains('verktoykort__lenke'))
    expect(kort.map((a) => a.getAttribute('href'))).toEqual(['#/verktoy/trappe-ned-antidepressiv', '#/verktoy/bytte-antidepressiv', '#/verktoy/bytte-antipsykotikum'])
    expect(kort.map((a) => a.querySelector('.verktoykort__status')?.textContent)).toEqual([
      '1 regel kan beregnes · 22 ikke godkjent',
      '1 regel kan beregnes · 1 ikke godkjent',
      '2 regler kan beregnes · 1 ikke godkjent',
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
  it('sier at beregning ikke er tilgjengelig fordi regelen er kontrollert og ikke godkjent, og henter ingenting', async () => {
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
    expect(status.textContent).toMatch(/regelen er kontrollert, men ikke godkjent for klinisk beregning/)
    expect(within(status).getByText('Bytte fra olanzapin til kvetiapin', { exact: false }).textContent).toMatch(/kontrollert, ikke godkjent$/)
    // En regel kontrolløren har vurdert, står ikke som et åpent spørsmål.
    expect(status.textContent).not.toMatch(/faglig kontroll/)
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
    // Duloksetin er også bare fagtekst, men ikke godkjent: da står at det ikke finnes en dokumentert måte å gi trinnene på.
    await user.clear(felt)
    await user.type(felt, 'Duloksetin')
    expect(screen.queryByRole('region', { name: 'Fagtekst' })).toBeNull()
    expect(screen.getByRole('status').textContent).toMatch(/Beregning er ikke tilgjengelig.*regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater.*Seponering av duloksetin.*bare fagtekst, ikke beregnbar/)
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
    expect(screen.getByText(/Beregning er tilgjengelig: regelen er klinisk godkjent, men bare for et avgrenset omfang/)).toBeTruthy()
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
    rerender(<Verktoyside verktoy="trappe-ned-antidepressiv" legemidler={legemidler} sperrer={INGEN_SPERRER} onLukk={onLukk} regelsett={regelsett} klokke={() => tid} />)
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
    // Skjemaet står først når sperrene er lest.
    expect(((await screen.findByRole('textbox', { name: /Aktuell døgndose/ })) as HTMLInputElement).value).toBe('25')
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
    expect(within(valg).getByText(/Den foretrukne reduksjonen til 14,06 mg \(−25,01 % fra 18,75 mg\) kan ikke gis med preparatene\. Velg en dose som kan gis; den faktiske reduksjonen må være innenfor det foretrukne området 5–25 %\. Verktøyet velger ikke selv/)).toBeTruthy()
    // 13,75 mg (−26,67 %) ville kreve begrunnelse; et avvik tilbys ikke.
    expect(within(valg).getAllByRole('button').map((b) => b.textContent)).toEqual(['15 mg (−20 %)'])
    // Valget gir en ny plan med en gang, fra den valgte dosen, og står i planen og i skjemaet.
    await user.click(within(valg).getByRole('button', { name: '15 mg (−20 %)' }))
    expect(await screen.findByText(/valgt av forskriveren \(beregnet 14,06 mg; −20 %\)/)).toBeTruthy()
    expect(screen.getByText(/escitalopram (fra )?dag [\d–]+: 15 mg, valgt av forskriveren fordi den beregnede dosen 14,06 mg ikke kan gis; faktisk reduksjon 20 % fra dosen før\./i)).toBeTruthy()
    const valgte = screen.getByRole('group', { name: 'Valgte doser per trinn' })
    expect(within(valgte).getByRole('listitem').textContent).toBe('Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)')
    // 15 mg → 11,25 mg kan gis; 8,44 mg kan ikke, og bare 8,75 mg (−22,22 %) er innenfor området; 7,5 mg (−33,33 %) tilbys ikke.
    const neste = await screen.findByRole('group', { name: 'Trinn 4 av Escitalopram kan ikke gis nøyaktig' })
    expect(within(neste).getAllByRole('button').map((b) => b.textContent)).toEqual(['8,75 mg (−22,22 %)'])
    await user.click(within(neste).getByRole('button', { name: '8,75 mg (−22,22 %)' }))
    expect(await screen.findByText(/escitalopram (fra )?dag [\d–]+: 8,75 mg, valgt av forskriveren/i)).toBeTruthy()
    expect(within(screen.getByRole('group', { name: 'Valgte doser per trinn' })).getAllByRole('listitem').map((x) => x.textContent)).toEqual([
      'Trinn 2 av Escitalopram: 15 mg (fra 18,75 mg)',
      'Trinn 4 av Escitalopram: 8,75 mg (fra 11,25 mg)',
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
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()
    feiler = false
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByRole('button', { name: 'Beregn doseplan' })).toBeTruthy()
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
    const status = () => [...document.querySelectorAll('.verktoykort__status')].map((x) => x.textContent)
    expect(status().every((t) => t!.startsWith('Midlertidig deaktivert · '))).toBe(true)
    cleanup()

    vis({ sperrer: nodstopp(() => [sperre('verktoy', 'bytte-antipsykotikum')]) })
    await screen.findAllByText(/^Midlertidig deaktivert · /)
    expect(status()).toEqual(['1 regel kan beregnes · 22 ikke godkjent', '1 regel kan beregnes · 1 ikke godkjent', 'Midlertidig deaktivert · 2 regler kan beregnes · 1 ikke godkjent'])
    cleanup()

    // Én regel: fagteksten for agomelatin er borte, mens bupropion fortsatt vises.
    vis({ verktoy: 'trappe-ned-antidepressiv', sperrer: nodstopp(() => [sperre('regel', 'seponering-agomelatin', 'Fagteksten må kontrolleres på nytt.')]) })
    const felt = screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' })
    await user.type(felt, 'Agomelatin')
    expect((await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).textContent).toMatch(/Regelen seponering-agomelatin: Fagteksten må kontrolleres på nytt\./)
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
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()

    // Sperren settes mens planen står: neste kontroll (her fokus på fanen) tar planen og skjemaet bort.
    aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()

    // Opphevet: skjemaet er der igjen med det som var fylt inn, og planen må beregnes på nytt.
    aktive = []
    await act(async () => window.dispatchEvent(new Event('focus')))
    expect(await screen.findByRole('button', { name: 'Beregn doseplan' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()

    // Sperren settes etter siste kontroll, men før beregningen: sperrene leses på nytt i det planen beregnes.
    aktive = [sperre('verktoy', 'trappe-ned-antidepressiv')]
    const dose = screen.getByRole('textbox', { name: /Aktuell døgndose/ })
    await user.clear(dose)
    await user.type(dose, '20')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('gir ingen plan når sperren settes mens preparatene hentes fra FEST', async () => {
    const user = userEvent.setup()
    let aktive: Verktoysperre[] = []
    const lager = nodstopp(() => aktive)
    let slipp: () => void = () => {}
    const legemidler = lesing()
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, sperrer: lager, regelsett, klokke: TESTKLOKKE })
    await fyllInn(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByRole('table')).toBeTruthy()

    // FEST svarer sent; sperren settes etter at beregningen startet, men før preparatene er hentet.
    legemidler.les.mockImplementationOnce(() => new Promise((ok) => (slipp = () => ok(testFest()))))
    const dose = screen.getByRole('textbox', { name: /Aktuell døgndose/ })
    await user.clear(dose)
    await user.type(dose, '20')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    aktive = [sperre('regel', TEST_NEDTRAPPING.id)]
    await act(async () => slipp())
    expect(await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })
})

/**
 * Pilotgjennomgangen med de klinisk godkjente reglene og preparatene i det
 * lagrede FEST-uttrekket (P11.2 og P11.4, `docs/verktøy-p11-publisering.md`):
 * det forskriveren ser, også etter en oppdatering, ved navigering, med en
 * endret regelversjon og med endrede preparater.
 */
describe('pilotgjennomgangen med de godkjente reglene (P11.2, P11.4)', () => {
  // Stien er relativ til repoet; i jsdom skriver Vite om `new URL(…, import.meta.url)` med en mal.
  const uttrekk = (fil: string) => JSON.parse(readFileSync(fil, 'utf8')) as Festuttrekk
  const PILOT = uttrekk(FEST_PILOT)
  const AKSEPT = uttrekk(FEST_AKSEPTTEST)
  const klokke = (u: Festuttrekk) => () => tidFor({ uttrekk: 'pilot' }, { pilot: u, aksept: u })
  const fra = (u: Festuttrekk, endre?: (x: Legemiddelutvalg) => void) =>
    lesing(() => {
      const x = structuredClone(u.utvalg)
      endre?.(x)
      return x
    })

  /** Krysser av hver bekreftelse og svarer nei på hvert spørsmål og unntak; `ja` er unntakene og spørsmålene som gjelder. */
  async function besvar(user: ReturnType<typeof userEvent.setup>, ja: RegExp[] = []) {
    const felt = screen.getByRole('group', { name: 'Forutsetninger for regelen' })
    for (const boks of within(felt).queryAllByRole('checkbox')) if (!(boks as HTMLInputElement).checked) await user.click(boks)
    for (const gruppe of within(felt).queryAllByRole('group')) {
      const tekst = gruppe.querySelector('legend')!.textContent!
      const radioer = within(gruppe).getAllByRole('radio')
      await user.click(radioer[ja.some((j) => j.test(tekst)) ? 0 : 1]!)
    }
  }
  const rader = () => [...screen.getByRole('table').querySelectorAll('tbody tr')].map((r) => r.textContent)
  const ingenPlan = async () => (await screen.findByRole('heading', { name: 'Ingen doseplan' })).closest('section')!

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
    await user.clear(dose)
    await user.type(dose, '3')
    expect(screen.getByText('Ved 3 mg gir omregningstabellen et spenn på 25–50 mg. Dosen i spennet er et klinisk valg og skrives inn som måldose.')).toBeTruthy()
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await screen.findByText('Måldosen må fylles inn som et tall større enn 0.')).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
    await user.type(screen.getByRole('textbox', { name: 'Måldose av paliperidon (depot) (mg per injeksjon)' }), '50')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    await screen.findByRole('table')
    expect(rader()[0]).toMatch(/^Fra dag 1.*Seponert/)
    expect(rader().at(-1)).toMatch(/Hver måned fra 1 måned etter dag 8.*50 mg/)
    // Tilbake til 6 mg: måldosen som står igjen, brukes ikke, og planen følger tabellen.
    await user.clear(dose)
    await user.type(dose, '6')
    expect(screen.queryByRole('textbox', { name: /Måldose/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    await screen.findByRole('table')
    expect(rader().at(-1)).toMatch(/Hver måned fra 1 måned etter dag 8.*75 mg/)
  })

  it('sertralin → mirtazapin: planen sier rett under tittelen at den er et startforløp, ikke en fullstendig plan', async () => {
    const user = userEvent.setup()
    vis({ verktoy: 'bytte-antidepressiv', legemidler: fra(PILOT), klokke: klokke(PILOT) })
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Sertralin')
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Mirtazapin')
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av sertralin/ }), '100')
    await besvar(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Legemiddelform av mirtazapin' }), '53')
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    await screen.findByRole('table')
    expect(screen.getByText(STARTFORLOP)).toBeTruthy()
    expect(rader()).toHaveLength(2)
  })

  it('gir ingen plan etter en regel som ikke er godkjent, heller ikke etter en oppdatering av appen eller navigering', async () => {
    const user = userEvent.setup()
    const legemidler = fra(AKSEPT)
    vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, klokke: klokke(AKSEPT) })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Vortioksetin')
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av vortioksetin/ }), '20')
    // Tidligere seponeringssymptomer: da gjelder den langsomme varianten, som ikke er godkjent.
    await besvar(user, [/tidligere forsøk/])
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect((await ingenPlan()).textContent).toMatch(/Regelen gjelder ikke: Et tidligere forsøk.*den langsomme varianten/)
    expect(screen.queryByRole('table')).toBeNull()

    // Etter en oppdatering står svarene, og den nye beregningen stopper på samme måte.
    oppdaterOgTaVare(vi.fn())
    cleanup()
    glemBildet()
    const { rerender, onLukk } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, klokke: klokke(AKSEPT) })
    await screen.findByRole('textbox', { name: /Aktuell døgndose av vortioksetin/ })
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await ingenPlan()).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()

    // Til et annet verktøy og tilbake: ingen plan før en ny beregning, og den stopper fortsatt.
    const side = (verktoy: string) => <Verktoyside verktoy={verktoy} legemidler={legemidler} sperrer={INGEN_SPERRER} onLukk={onLukk} klokke={klokke(AKSEPT)} />
    rerender(side('bytte-antidepressiv'))
    expect(screen.queryByRole('heading', { name: 'Ingen doseplan' })).toBeNull()
    rerender(side('trappe-ned-antidepressiv'))
    expect(screen.queryByRole('heading', { name: 'Ingen doseplan' })).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
    // Skjemaet begynner på nytt for det andre verktøyet; fylt inn igjen stopper beregningen på samme måte.
    expect((screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }) as HTMLInputElement).value).toBe('')
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Vortioksetin')
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av vortioksetin/ }), '20')
    await besvar(user, [/tidligere forsøk/])
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    expect(await ingenPlan()).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('tar bort planen når regelversjonen endres, og gir ingen ny plan når preparatene i FEST er endret', async () => {
    const user = userEvent.setup()
    let endre: ((x: Legemiddelutvalg) => void) | undefined
    const legemidler = lesing(() => {
      const x = structuredClone(AKSEPT.utvalg)
      endre?.(x)
      return x
    })
    const { rerender, onLukk } = vis({ verktoy: 'trappe-ned-antidepressiv', legemidler, klokke: klokke(AKSEPT) })
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Vortioksetin')
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av vortioksetin/ }), '20')
    await besvar(user)
    await user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))
    await screen.findByRole('table')
    expect(rader()).toEqual([expect.stringMatching(/^Fra dag 1.*15 mg.*1 tablett à 15 mg$/)])

    // En ny regelversjon uten ny godkjenning: verken planen eller beregningen står igjen.
    const regelsett = structuredClone(REGELSETT)
    regelsett.regler.find((r) => r.id === 'seponering-vortioksetin')!.versjon += 1
    rerender(<Verktoyside verktoy="trappe-ned-antidepressiv" legemidler={legemidler} sperrer={INGEN_SPERRER} onLukk={onLukk} regelsett={regelsett} klokke={klokke(AKSEPT)} />)
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Beregn doseplan' })).toBeNull()

    // Tilbake til den godkjente versjonen, men 15 mg er avregistrert i FEST: ingen plan.
    rerender(<Verktoyside verktoy="trappe-ned-antidepressiv" legemidler={legemidler} sperrer={INGEN_SPERRER} onLukk={onLukk} klokke={klokke(AKSEPT)} />)
    endre = (x) => avregistrert('vortioksetin', 15).endre(x, osloDato(klokke(AKSEPT)()))
    await user.click(await screen.findByRole('button', { name: 'Beregn doseplan' }))
    expect((await ingenPlan()).textContent).toMatch(/styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST/)
    expect(screen.queryByRole('table')).toBeNull()
  })
})
