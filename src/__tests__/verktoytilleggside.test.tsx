// @vitest-environment jsdom
/**
 * Den faktiske brukerflyten for de godkjente tilleggsreglene i K4 på
 * verktøysiden (`#/verktoy/kombinere-stemningsstabiliserende`): skjemaet,
 * spørsmålene og bekreftelsene, stoppene og planen som kopieres, med de
 * godkjente reglene i appen og preparatene i det lagrede FEST-uttrekket.
 * Ingen simulering: reglene er godkjent av den uavhengige kontrolløren for
 * nøyaktig sin versjon og sitt fingeravtrykk (`TILLEGGSVEDTAK`).
 */
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import { glemBildet } from '../oppdatering/bevaring'
import { forsteSetning } from '../verktoy/planvisning'
import { VALPROAT_LAMOTRIGIN } from '../verktoy/regler/tillegg'
import { FEST_TILLEGG } from '../verktoy/tilleggsgrunnlag'
import { pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'
import { besvarAlt, kopier, planpanel, sporsmal, stoppet, type Bruker } from './hjelp/verktoyflyt'

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

/** Velger det eksisterende legemidlet og lamotrigin, og fyller inn dosen og måldosen. */
async function fyllInn(user: Bruker, fra: string, dose: string, maldose: string) {
  await act(async () => {})
  await user.type(screen.getByRole('combobox', { name: 'Eksisterende legemiddel' }), fra)
  await user.type(screen.getByRole('combobox', { name: 'Legemiddel som legges til' }), 'Lamotrigin')
  await user.type(await screen.findByRole('textbox', { name: /^Aktuell (døgn)?dose av/ }), dose)
  await user.type(screen.getByRole('textbox', { name: /Måldose/ }), maldose)
}

/** Svaret som sier at et vilkår ikke er oppfylt: «Nei», eller «Ikke ennå» for en vurdering. */
const IKKE = /^(Nei|Ikke ennå)$/

/** Vilkårene i det graviditetsforebyggende programmet for valproat, i regelens rekkefølge. */
const PPP = VALPROAT_LAMOTRIGIN.bekreftelser.filter((b) => b.ved?.sporsmal === 'kan_bli_gravid')
/** Hvert unntak i valproatregelen, avkreftet, med første setning. */
const AVKREFTET = VALPROAT_LAMOTRIGIN.unntak.map((u) => `- Avkreftet: ${forsteSetning(u.tekst)}`)

/** Linjene under «Avklart for denne pasienten» i en kopi. */
function avklart(tekst: string) {
  const linjer = tekst.split('\n')
  const fra = linjer.indexOf('Avklart for denne pasienten:') + 1
  expect(fra).toBeGreaterThan(0)
  const til = linjer.indexOf('', fra)
  return linjer.slice(fra, til === -1 ? undefined : til)
}

/** De samme linjene slik de står på skjermen. */
const avklartPaSkjermen = () => within(screen.getByRole('region', { name: 'Avklart for denne pasienten' })).getAllByRole('listitem').map((li) => li.textContent)

/** Svarer `verdi` på spørsmålet som passer `tekst`. */
const svar = (user: Bruker, tekst: RegExp, verdi: RegExp) => user.click(within(sporsmal(tekst)).getByRole('radio', { name: verdi }))

describe('Kombinere stemningsstabiliserende med de godkjente reglene', () => {
  it('valproat → lamotrigin: planen kopieres med mg natriumvalproat og preparatet fra legemiddellisten, og stopper uten nødvendige bekreftelser', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Valproat', '1000', '100')
    // Ingenting er bekreftet eller besvart: ingen plan, og panelet sier hvor mange spørsmål som gjenstår.
    await stoppet(/\d+ spørsmål igjen/)
    expect(screen.queryByRole('button', { name: 'Kopier planen' })).toBeNull()

    // Alt bekreftet, nei på hvert spørsmål og unntak: hele planen, beregnet av seg selv.
    await besvarAlt(user)
    const tekst = await kopier(user, 'utvidet')
    expect(tekst).toMatch(/^Kombinere stemningsstabiliserende\n/)
    expect(tekst).toContain(
      'Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten); Lamotrigin fortsetter på 100 mg fra dag 36.',
    )
    const rader = tekst.split('\n').filter((l) => l.includes('Valproat peroralt:'))
    expect(rader).toHaveLength(4)
    // Hele forklaringen i den første raden; deretter samme dose, merket uendret.
    expect(rader[0]).toContain(
      'Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke',
    )
    for (const l of rader.slice(1)) expect(l).toContain('Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose;')
    expect(tekst).toMatch(/Dag 1–14: Valproat peroralt: .*; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg/)
    expect(tekst).toMatch(/Fra dag 36: Valproat peroralt: .*; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg/)
    expect(tekst).toContain('Bekreftet: Pasienten bruker et natriumvalproatpreparat')
    expect(tekst).toMatch(/Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk 0a9213f31b5f/)
    expect(tekst).not.toMatch(/simulert/i)
    // Planen bygger på den ordinære 25 mg-pakningen; advarselen gjelder bare fritakspakningen med samme navn, med varenummer.
    expect(tekst).toContain('- Lamictal tyggetab/disperg tab 25 mg, varenr. 196808 (FEST oppgir ikke deling; regnes som ikke delbar)')
    expect(tekst).toContain(
      'Lamictal tyggetab/disperg tab 25 mg, varenr. 279054: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt; en annen pakning med samme navn kan brukes: varenr. 196808',
    )
    expect(tekst).not.toMatch(/Lamictal tyggetab\/disperg tab 25 mg: /)
    // Kan ikke bli gravid: den korte planen sier det, uten vilkårene i det graviditetsforebyggende programmet.
    const nei = await kopier(user)
    expect(avklart(nei)).toContain('- Kan ikke bli gravid.')
    expect(avklart(nei)).toContain('- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer.')
    for (const b of PPP) expect(nei, b.id).not.toContain(b.tekst)
    expect(avklartPaSkjermen()).toEqual(avklart(nei).map((l) => l.slice(2)))

    // Pasienten kan bli gravid: vilkårene i programmet stilles som spørsmål; et vilkår som ikke er oppfylt, gir ingen plan.
    await besvarAlt(user, [/kan bli gravid/])
    await svar(user, /sikker prevensjon uten avbrudd/, IKKE)
    await stoppet(/Ingen plan med disse svarene/)
    await svar(user, /sikker prevensjon uten avbrudd/, /^Ja$/)
    expect(await kopier(user, 'utvidet')).toContain('Bekreftet: Pasienten bruker sikker prevensjon uten avbrudd')
    // Det står kort i standardplanen: på skjermen, i den korte kopien og utenfor det faglige grunnlaget, så det kommer med i utskriften.
    const ja = await kopier(user)
    expect(avklart(ja)).toEqual(['- Kan bli gravid.', ...PPP.map((b) => `- Bekreftet: ${b.tekst}`), '- Kan ikke bli far.', expect.stringMatching(/^- Ingen østrogenholdig/), ...AVKREFTET])
    expect(avklartPaSkjermen()).toEqual(avklart(ja).map((l) => l.slice(2)))
    expect(screen.getByRole('region', { name: 'Avklart for denne pasienten' }).closest('details')).toBeNull()

    // Pasienten kan bli far: forholdsreglene for menn må være gitt. «Ikke ennå» er en vurdering som gjenstår, ikke en stopp.
    await besvarAlt(user, [/kan gjøre en partner gravid/])
    await svar(user, /mulige risikoen for nevroutviklingsforstyrrelser/, /^Ikke ennå$/)
    await stoppet(/Ett spørsmål igjen/)
    await svar(user, /mulige risikoen for nevroutviklingsforstyrrelser/, /^Ja$/)
    expect(await kopier(user, 'utvidet')).toContain('Bekreftet: Pasienten er informert om den mulige risikoen')

    // Uten natriumvalproatpreparat og dose i mg natriumvalproat: ingen plan.
    await besvarAlt(user)
    await svar(user, /natriumvalproatpreparat/, IKKE)
    await stoppet(/Ingen plan med disse svarene/)
  }, 30_000)

  it('litium → lamotrigin: planen kopieres med Lithionit-tabletter, mg Li⁺ og mmol, og en dose som ikke er hele tabletter stopper', async () => {
    const user = userEvent.setup()
    vis()
    await fyllInn(user, 'Litium', '168', '200')
    await besvarAlt(user)
    const tekst = await kopier(user, 'utvidet')
    expect(tekst).toContain('Komplett plan til sluttmålet: Litium fortsetter uendret på 168 mg Li⁺ (24 mmol); Lamotrigin fortsetter på 200 mg fra dag 36.')
    const rader = tekst.split('\n').filter((l) => l.includes('Litium peroralt:'))
    expect(rader).toHaveLength(4)
    expect(rader[0]).toContain(
      'Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke',
    )
    for (const l of rader.slice(1)) expect(l).toContain('Litium peroralt: 168 mg Li⁺ (24 mmol) = uendret dose;')
    expect(tekst).toMatch(/Fra dag 36: Litium peroralt: .*; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg/)
    expect(tekst).toMatch(/Regel tillegg-litium-lamotrigin, versjon 2, fingeravtrykk 786436a0ea8d/)

    // 170 mg er ikke hele Lithionit-tabletter, og et annet mål enn 200 mg er utenfor regelen.
    const dose = screen.getByRole('textbox', { name: /^Aktuell (døgn)?dose av/ })
    await user.clear(dose)
    await user.type(dose, '170')
    // Forhåndskontrollen stopper dosen med en gang, før et eneste spørsmål om pasienten, og sier hvilke doser regelen gjelder for.
    await stoppet(/Ingen plan for dette tilfelletRegelen gjelder bare startdoser på 42, 84, .* og 420 mg litium \(Li⁺\) per døgn\./)
    await user.clear(dose)
    await user.type(dose, '168')
    const mal = screen.getByRole('textbox', { name: /Måldose/ })
    await user.clear(mal)
    await user.type(mal, '300')
    // Et annet mål: forhåndskontrollen sier det i klartekst, og motorens egen tekst står bak «Vis detaljer».
    await stoppet(/Ingen plan for dette tilfelletDosen er utenfor det regelen gjelder for\. Kontroller dosen\./)
    expect(within(planpanel()).getByText('Vis detaljer').closest('details')!.textContent).toMatch(/300 mg er utenfor det regelen gjelder for/)
  }, 30_000)
})
