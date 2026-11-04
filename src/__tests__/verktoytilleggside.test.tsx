// @vitest-environment jsdom
/**
 * Den faktiske brukerflyten for de godkjente tilleggsreglene i K4 på
 * verktøysiden (`#/verktoy/kombinere-stemningsstabiliserende`): skjemaet,
 * spørsmålene og bekreftelsene, stoppene og planen som kopieres, med de
 * godkjente reglene i appen og preparatene i det lagrede FEST-uttrekket.
 * Ingen simulering: reglene er godkjent av den uavhengige kontrolløren for
 * nøyaktig sin versjon og sitt fingeravtrykk (`TILLEGGSVEDTAK`).
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import { glemBildet } from '../oppdatering/bevaring'
import { FEST_TILLEGG } from '../verktoy/tilleggsgrunnlag'
import { besvarAlt, pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'

beforeEach(() => {
  window.scrollTo = () => {}
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const TILLEGG = pilotuttrekk(FEST_TILLEGG)

function vis(props: Partial<VerktoysideProps> = {}) {
  return render(
    <Verktoyside
      verktoy="kombinere-stemningsstabiliserende"
      legemidler={pilotlesing(TILLEGG)}
      klokke={pilotklokke(TILLEGG)}
      sperrer={{ les: async () => [] }}
      regelvarsler={{ les: async () => [] }}
      onLukk={vi.fn()}
      {...props}
    />,
  )
}

type Bruker = ReturnType<typeof userEvent.setup>

/** Velger det eksisterende legemidlet og lamotrigin, og fyller inn dosen og måldosen. */
async function fyllInn(user: Bruker, fra: string, dose: string, maldose: string) {
  await act(async () => {})
  await user.type(screen.getByRole('combobox', { name: 'Eksisterende legemiddel' }), fra)
  await user.type(screen.getByRole('combobox', { name: 'Legemiddel som legges til' }), 'Lamotrigin')
  await user.type(await screen.findByRole('textbox', { name: /^Aktuell (døgn)?dose av/ }), dose)
  await user.type(screen.getByRole('textbox', { name: /Måldose/ }), maldose)
}

const beregn = async (user: Bruker) => user.click(screen.getByRole('button', { name: 'Beregn doseplan' }))

/** Teksten som kopieres med «Kopier planen». */
async function kopier(user: Bruker) {
  await user.click(screen.getByRole('button', { name: 'Kopier planen' }))
  return navigator.clipboard.readText()
}

/** Ingen plan å kopiere, og siden sier hvorfor: i et varsel ved skjemaet eller under «Ingen doseplan». */
async function stoppet(grunn: RegExp) {
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Kopier planen' })).toBeNull())
  const steder = [...screen.queryAllByRole('alert'), ...screen.queryAllByRole('heading', { name: 'Ingen doseplan' }).map((h) => h.closest('section')!)]
  expect(steder.map((x) => x.textContent).join('\n')).toMatch(grunn)
}

describe('Kombinere stemningsstabiliserende med de godkjente reglene', () => {
  it('valproat → lamotrigin: planen kopieres med mg natriumvalproat og preparatet fra legemiddellisten, og stopper uten nødvendige bekreftelser', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Valproat', '1000', '100')
    // Ingenting er bekreftet eller besvart: ingen plan.
    await beregn(user)
    expect((await screen.findAllByRole('alert')).length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: 'Kopier planen' })).toBeNull()

    // Alt bekreftet, nei på hvert spørsmål og unntak: hele planen.
    await besvarAlt(user)
    await beregn(user)
    const tekst = await kopier(user)
    expect(tekst).toMatch(/^Kombinere stemningsstabiliserende\n/)
    expect(tekst).toContain('Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten); Lamotrigin fortsetter på 100 mg fra dag 36.')
    const rader = tekst.split('\n').filter((l) => l.includes('Valproat peroralt:'))
    expect(rader).toHaveLength(4)
    for (const l of rader)
      expect(l).toContain('Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke')
    expect(tekst).toMatch(/Dag 1–14: Valproat peroralt: .*; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg/)
    expect(tekst).toMatch(/Fra dag 36: Valproat peroralt: .*; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg/)
    expect(tekst).toContain('Bekreftet: Pasienten bruker et natriumvalproatpreparat')
    expect(tekst).toMatch(/Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk 0a9213f31b5f/)
    expect(tekst).not.toMatch(/simulert/i)
    // Planen bygger på den ordinære 25 mg-pakningen; advarselen gjelder bare fritakspakningen med samme navn, med varenummer.
    expect(tekst).toContain('- Lamictal tyggetab/disperg tab 25 mg, varenr. 196808 (FEST oppgir ikke deling; regnes som ikke delbar)')
    expect(tekst).toContain('Lamictal tyggetab/disperg tab 25 mg, varenr. 279054: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt; planen bruker i stedet varenr. 196808 med samme navn')
    expect(tekst).not.toMatch(/Lamictal tyggetab\/disperg tab 25 mg: /)

    // Pasienten kan bli gravid: de fire vilkårene i programmet må bekreftes; uten dem ingen plan.
    await besvarAlt(user, [/kan bli gravid/])
    await besvarAlt(user, [/kan bli gravid/]) // bekreftelsene svaret tar fram
    const vilkar = within(screen.getByRole('group', { name: 'Bekreft før beregning' })).getByRole('checkbox', { name: /sikker prevensjon uten avbrudd/ })
    await user.click(vilkar)
    await beregn(user)
    await stoppet(/bekreft én forutsetning/)
    await user.click(vilkar)
    await beregn(user)
    expect(await kopier(user)).toContain('Bekreftet: Pasienten bruker sikker prevensjon uten avbrudd')

    // Pasienten kan bli far: forholdsreglene for menn må bekreftes; uten dem ingen plan.
    await besvarAlt(user, [/kan gjøre en partner gravid/])
    await besvarAlt(user, [/kan gjøre en partner gravid/]) // bekreftelsene svaret tar fram
    const far = within(screen.getByRole('group', { name: 'Bekreft før beregning' })).getByRole('checkbox', { name: /mulige risikoen for nevroutviklingsforstyrrelser/ })
    await user.click(far)
    await beregn(user)
    await stoppet(/bekreft én forutsetning/)
    await user.click(far)
    await beregn(user)
    expect(await kopier(user)).toContain('Bekreftet: Pasienten er informert om den mulige risikoen')

    // Uten bekreftet natriumvalproatpreparat og dose: ingen plan.
    await besvarAlt(user)
    await user.click(within(screen.getByRole('group', { name: 'Bekreft før beregning' })).getByRole('checkbox', { name: /natriumvalproatpreparat/ }))
    await beregn(user)
    await stoppet(/bekreft én forutsetning/)
  })

  it('litium → lamotrigin: planen kopieres med Lithionit-tabletter, mg Li⁺ og mmol, og en dose som ikke er hele tabletter stopper', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Litium', '168', '200')
    await besvarAlt(user)
    await beregn(user)
    const tekst = await kopier(user)
    expect(tekst).toContain('Komplett plan til sluttmålet: Litium fortsetter uendret på 168 mg Li⁺ (24 mmol); Lamotrigin fortsetter på 200 mg fra dag 36.')
    const rader = tekst.split('\n').filter((l) => l.includes('Litium peroralt:'))
    expect(rader).toHaveLength(4)
    for (const l of rader)
      expect(l).toContain(
        'Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke',
      )
    expect(tekst).toMatch(/Fra dag 36: Litium peroralt: .*; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg/)
    expect(tekst).toMatch(/Regel tillegg-litium-lamotrigin, versjon 2, fingeravtrykk 786436a0ea8d/)

    // 170 mg er ikke hele Lithionit-tabletter, og et annet mål enn 200 mg er utenfor regelen.
    const dose = screen.getByRole('textbox', { name: /^Aktuell (døgn)?dose av/ })
    await user.clear(dose)
    await user.type(dose, '170')
    await beregn(user)
    await stoppet(/170 mg er utenfor det regelen gjelder for/)
    await user.clear(dose)
    await user.type(dose, '168')
    const mal = screen.getByRole('textbox', { name: /Måldose/ })
    await user.clear(mal)
    await user.type(mal, '300')
    await beregn(user)
    await stoppet(/300 mg er utenfor det regelen gjelder for/)
  })
})
