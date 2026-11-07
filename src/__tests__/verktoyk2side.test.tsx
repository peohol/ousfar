// @vitest-environment jsdom
/**
 * Den faktiske brukerflyten for de to godkjente byttene til sertralin i K2 på
 * verktøysiden (`#/verktoy/bytte-antidepressiv`): skjemaet, spørsmålene og
 * bekreftelsene, tidslinjen, planen som kopieres, og stoppene utenfor
 * godkjenningen, med reglene slik de er i appen og preparatene i det lagrede
 * FEST-uttrekket for K2. Ingen simulering: reglene er godkjent av den
 * uavhengige kontrolløren for nøyaktig sin versjon og sitt fingeravtrykk
 * (`K2VEDTAK`). Byttene til mirtazapin er ikke godkjent og gir ingen plan.
 */
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import { glemBildet } from '../oppdatering/bevaring'
import { FEST_K2 } from '../verktoy/k2kontroll'
import { avregistrert } from '../verktoy/regler/pilotmatrise'
import { pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'
import { besvarAlt, kopier, punkter, sporsmal, stoppet, type Bruker } from './hjelp/verktoyflyt'

beforeEach(() => {
  window.scrollTo = () => {}
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const K2 = pilotuttrekk(FEST_K2)

function vis(props: Partial<VerktoysideProps> = {}) {
  return render(
    <Verktoyside
      verktoy="bytte-antidepressiv"
      legemidler={pilotlesing(K2)}
      klokke={pilotklokke(K2)}
      sperrer={{ les: async () => [] }}
      regelvarsler={{ les: async () => [] }}
      onLukk={vi.fn()}
      {...props}
    />,
  )
}

/** Velger byttet, fyller inn dosen og måldosen, og svarer på alt (`ja` er unntakene som gjelder); planen beregnes av seg selv. */
async function fyllInn(user: Bruker, fra: string, til: string, dose: string, maldose: string, ja: RegExp[] = []) {
  await act(async () => {})
  await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), fra)
  await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), til)
  await user.type(await screen.findByRole('textbox', { name: new RegExp(`^Aktuell døgndose av ${fra.toLowerCase()}`) }), dose)
  const mal = screen.queryByRole('textbox', { name: /Måldose/ })
  if (mal) await user.type(mal, maldose)
  await besvarAlt(user, ja)
}

describe('Bytte antidepressiv til sertralin med de godkjente reglene', () => {
  it('escitalopram 10 mg → sertralin 100 mg: halvering til 5 mg i 14 dager, sertralin 50 mg fra dag 15, dagen etter siste escitalopram, vurdering før økningen til 100 mg, og hele planen kopieres', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Escitalopram', 'Sertralin', '10', '100')
    const tekst = await kopier(user)
    expect(tekst).toMatch(/^Bytte antidepressiv\nBytte fra escitalopram til sertralin, nedtrapping og direkte overgang\n/)
    expect(tekst).toContain('Komplett plan til sluttmålet: Escitalopram seponert fra dag 15; Sertralin fortsetter på 100 mg fra dag 29.')
    // Tidslinjen: halvert til 5 mg (laveste tablettdose) i 14 dager, så direkte overgang dagen etter siste dose, og økning tidligst dag 29 etter en vurdering.
    expect(tekst).toMatch(/\nDag 1–14: Escitalopram peroralt: 5 mg = 1 tablett à 5 mg\n/)
    expect(tekst).toMatch(/\nDag 15: Vurdering \(Escitalopram\): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres\./)
    expect(tekst).toMatch(/\nDag 15–28: Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg\n/)
    expect(tekst).toMatch(
      /\nDag 21: Vurdering \(Escitalopram\): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin\./,
    )
    expect(tekst).toMatch(
      /\nDag 29: Vurdering \(Sertralin\): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram\./,
    )
    expect(tekst).toMatch(/\nFra dag 29: Sertralin peroralt: 100 mg = 1 tablett à 100 mg\n/)
    expect(tekst).toMatch(/\nDag 43: Vurdering \(Sertralin\): Vurder respons og bivirkninger av sertralin\.\n/)
    expect(tekst).toContain('Beregnet etter en klinisk godkjent regelversjon.')
    expect(tekst).toContain('Avkreftet: Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker.')
    expect(tekst).toContain('Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram')
    expect(tekst).toContain('Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler')
    expect(tekst).toContain('Direkte overgang uten dager uten legemiddel; sertralin tidligst dag 15, dagen etter siste dose av escitalopram.')
    expect(tekst).toMatch(/- Cipralex tab 5 mg/)
    expect(tekst).toMatch(/- Zoloft tab 100 mg/)
    expect(tekst).toContain('Regel bytte-escitalopram-sertralin, versjon 2, fingeravtrykk c0bf6c61e38c')
    expect(tekst).not.toMatch(/simulert/i)
    // Siden viser de samme dagene i tidslinjen.
    expect(punkter().map((r) => r[0])).toEqual(expect.arrayContaining(['Dag 1–14', 'Dag 15–28', 'Fra dag 29']))
  })

  it('citalopram 40 mg → sertralin 50 mg: halvering til 20 mg, så 10 mg, og sertralin 50 mg fra dagen etter siste citalopram; ingen økning og ingen vurdering før økning', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Citalopram', 'Sertralin', '40', '50')
    const tekst = await kopier(user)
    expect(tekst).toContain('Komplett plan til sluttmålet: Citalopram seponert fra dag 29; Sertralin fortsetter på 50 mg fra dag 29.')
    expect(tekst).toMatch(/\nDag 1–14: Citalopram peroralt: 20 mg = 1 tablett à 20 mg\n/)
    expect(tekst).toMatch(/\nDag 15–28: Citalopram peroralt: 10 mg = 1 tablett à 10 mg\n/)
    expect(tekst).toMatch(/\nFra dag 29: Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg\n/)
    expect(tekst).toMatch(/\nDag 35: Vurdering \(Citalopram\): Vurder seponeringssymptomer, tegn på serotonerg belastning/)
    expect(tekst).not.toMatch(/Dag \d+ \(?.*Vurdering \(Sertralin\): Før endringen/)
    expect(tekst).toContain('Regel bytte-citalopram-sertralin, versjon 2, fingeravtrykk 2b64ff9e383e')
    expect(tekst).not.toMatch(/simulert/i)
  })

  it('stopper utenfor godkjenningen: mer enn 8 uker, tidligere seponeringsplager, interaksjoner ikke kontrollert, en annen startdose og et annet mål', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Escitalopram', 'Sertralin', '20', '100', [/mer enn 8 uker/])
    // Et svar som stopper, stopper med en gang med katalogens forklaring, ved spørsmålet og i panelet.
    const OVER_8_UKER = 'Den godkjente planen gjelder bare de første 8 ukene med escitalopram.'
    await stoppet(new RegExp(`Ingen plan med disse svarene${OVER_8_UKER}`))
    expect(sporsmal(/mer enn 8 uker/).closest('li')!.textContent).toContain(OVER_8_UKER)

    const TIDLIGERE = 'Verktøyet har foreløpig ingen godkjent standardplan ved tidligere seponeringsvansker.'
    await besvarAlt(user, [/tidligere fått seponeringssymptomer/])
    await stoppet(new RegExp(`Ingen plan med disse svarene${TIDLIGERE}`))
    expect(sporsmal(/tidligere fått seponeringssymptomer/).closest('li')!.textContent).toContain(TIDLIGERE)

    // Er de øvrige legemidlene ikke kontrollert ennå, gjenstår det, og planen beregnes ikke.
    await besvarAlt(user, [], [[/øvrige legemidler kontrollert/, /^Ikke ennå$/]])
    await stoppet(/Ett spørsmål igjen/)
    await besvarAlt(user)

    const dose = screen.getByRole('textbox', { name: /^Aktuell døgndose av escitalopram/ })
    await user.clear(dose)
    await user.type(dose, '15')
    // Utenfor det godkjente omfanget sier panelet straks hva regelen gjelder for.
    await stoppet(/Ingen plan for dette tilfelletRegelen gjelder bare startdoser på 10 og 20 mg\./)
    await user.clear(dose)
    await user.type(dose, '20')
    const mal = screen.getByRole('textbox', { name: /Måldose/ })
    await user.clear(mal)
    await user.type(mal, '150')
    await stoppet(/150 mg er utenfor det regelen gjelder for/)

    // Tilbake i omfanget: hele planen.
    await user.clear(mal)
    await user.type(mal, '100')
    expect(await kopier(user)).toContain('Komplett plan til sluttmålet: Escitalopram seponert fra dag 29; Sertralin fortsetter på 100 mg fra dag 43.')
  }, 30_000)

  it('gir ingen plan når sertralin 50 mg er avregistrert i FEST eller FEST-kopien er foreldet', async () => {
    const user = userEvent.setup()
    const idag = pilotklokke(K2)().toISOString().slice(0, 10)
    vis({ legemidler: pilotlesing(K2, (x) => avregistrert('sertralin', 50).endre(x as never, idag)) })
    await fyllInn(user, 'Citalopram', 'Sertralin', '20', '50')
    await stoppet(/finnes ikke lenger i FEST/)
    cleanup()
    glemBildet()
    sessionStorage.clear()

    vis({ klokke: () => new Date(pilotklokke(K2)().getTime() + 49 * 3_600_000) })
    await fyllInn(user, 'Citalopram', 'Sertralin', '20', '50')
    await stoppet(/Den nattlige oppdateringen har ikke gått siden/)
  }, 30_000)

  it('gir ingen plan for byttene til mirtazapin, som ikke er godkjent', async () => {
    const user = userEvent.setup()
    vis()
    await act(async () => {})
    for (const fra of ['Escitalopram', 'Citalopram']) {
      const felt = screen.getByRole('combobox', { name: 'Bytte fra' })
      await user.clear(felt)
      await user.type(felt, fra)
      const til = screen.getByRole('combobox', { name: 'Bytte til' })
      await user.clear(til)
      await user.type(til, 'Mirtazapin')
      // Ingen dose kan fylles inn og ingen plan beregnes; siden sier at faglig kontroll gjenstår.
      await waitFor(() => expect(document.body.textContent).toMatch(/Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår/))
      expect(screen.queryByRole('textbox', { name: /^Aktuell døgndose av/ }), fra).toBeNull()
      expect(screen.queryByRole('list', { name: 'Planen dag for dag' }), fra).toBeNull()
    }
  })
})
