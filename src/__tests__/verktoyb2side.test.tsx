// @vitest-environment jsdom
/**
 * Den faktiske brukerflyten for escitalopram versjon 14 med tabletter og
 * dråper (B2) på verktøysiden (`#/verktoy/trappe-ned-antidepressiv`):
 * skjemaet, spørsmålene, dosevalgene ved hvert trinn helt til 0 mg,
 * tidslinjen, planen som kopieres, og stoppene utenfor godkjenningen, med
 * regelen slik den er i appen og preparatene i FEST-uttrekket for
 * aksepttesten. Ingen simulering: versjon 14 er klinisk godkjent av den
 * uavhengige kontrolløren 05.11.2026 for nøyaktig sin versjon og sitt
 * fingeravtrykk (`B2_GODKJENNING_0511`). Planene sammenlignes med kasusene i
 * kontrollgrunnlaget (`docs/verktøy-b2-escitalopram-kontrollgrunnlag.md`).
 *
 * Til slutt viser siden versjon 13 slik den var før godkjenningen, og at
 * versjon 13 gjelder igjen hvis godkjenningen av versjon 14 ikke lenger er
 * gyldig. Alle doser og svar er syntetiske.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoyside, type VerktoysideProps } from '../components/verktoy/Verktoyside'
import { glemBildet } from '../oppdatering/bevaring'
import { FORSLAG_B2, kjorKontrollkasus } from '../verktoy/kontrollgrunnlag'
import { FOR_B2 } from '../verktoy/kontrollsett'
import { FEST_AKSEPTTEST } from '../verktoy/regler/aksepttest'
import { B2_ESCITALOPRAM, B2_GODKJENNING_0511 } from '../verktoy/regler/k1'
import type { Regelsett } from '../verktoy/regler/modell'
import { avregistrert } from '../verktoy/regler/pilotmatrise'
import { REGELSETT, samlet } from '../verktoy/tilgjengelighet'
import { pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'
import { besvarAlt, stoppet as ingenPlan, tidslinje as tidslinjen, tidslinjetekst, velgForm, type Bruker } from './hjelp/verktoyflyt'
import { tidslinjeavvik } from './qa/brukerforlop'

beforeEach(() => {
  window.scrollTo = () => {}
  sessionStorage.clear()
  glemBildet()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const AKSEPT = pilotuttrekk(FEST_AKSEPTTEST)
const TABLETT = '53'
const DRAPER = '748'
const V14 = REGELSETT.regler.find((r) => r.id === B2_ESCITALOPRAM.id)!
const V13 = REGELSETT.regler.find((r) => r.id === B2_ESCITALOPRAM.regel)!
const kasus = (id: string) => FORSLAG_B2.kasus.find((k) => k.id === id)!

function vis(props: Partial<VerktoysideProps> = {}) {
  return render(
    <Verktoyside
      verktoy="trappe-ned-antidepressiv"
      legemidler={pilotlesing(AKSEPT)}
      klokke={pilotklokke(AKSEPT)}
      sperrer={{ les: async () => [] }}
      regelvarsler={{ les: async () => [] }}
      onLukk={vi.fn()}
      {...props}
    />,
  )
}

/**
 * Fyller inn escitalopram og dosen, velger formen når steg 2 spør om den, og
 * svarer på alt (`ja` er det som gjelder; `svar` er bestemte svar). Planen
 * beregnes av seg selv. Stopper forhåndskontrollen før formen spørres om,
 * står det i panelet, og da velges ingen form.
 */
async function beregn(user: Bruker, dose: string, form: string, ja: RegExp[] = [], svar: (readonly [RegExp, RegExp])[] = []) {
  await act(async () => {})
  await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
  await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), dose)
  const formvalg = await waitFor(
    () => {
      const f = screen.queryByRole('radiogroup', { name: 'Legemiddelform av escitalopram' })
      if (!f && !/Ingen plan/.test(screen.getByRole('region', { name: /^Steg 4: / }).textContent ?? '')) throw new Error('venter på formvalg eller stopp')
      return f
    },
    { timeout: 3000 },
  )
  if (!formvalg) return false
  await velgForm(user, 'Legemiddelform av escitalopram', form)
  await besvarAlt(user, ja, svar)
  return true
}

/** Velger dosen ved hvert trinn som ikke kan gis nøyaktig, til planen er komplett; siden viser ingen doser før det. */
async function velgTilKomplett(user: Bruker, tittel: string) {
  const valgt: string[] = []
  for (;;) {
    const neste = await waitFor(() => screen.queryByRole('region', { name: tittel }) ?? screen.getByRole('group', { name: /^Trinn \d+ av Escitalopram$/ }), { timeout: 3000 })
    if (neste.tagName === 'SECTION') return { valgt, plan: neste }
    expect(tidslinjen()).toBeNull()
    expect(screen.queryByRole('button', { name: 'Kopier planen' })).toBeNull()
    // Siden tilbyr nøyaktig én dose ved hvert trinn, som i kontrollgrunnlaget.
    const [knapp, ...andre] = within(neste).getAllByRole('button')
    expect(andre).toEqual([])
    valgt.push(knapp!.textContent!)
    await user.click(knapp!)
    await act(async () => {})
    expect(valgt.length).toBeLessThan(20)
  }
}

/** Tidslinjen på siden: kolonneoverskriftene og cellene i hver rad. */
const tidslinje = (plan: HTMLElement) => tidslinjetekst(within(plan).getByRole('list', { name: 'Planen dag for dag' }))

async function kopier(user: Bruker, plan: HTMLElement) {
  await user.click(within(plan).getByRole('button', { name: 'Kopier planen' }))
  return navigator.clipboard.readText()
}

/** Dosene i kopien, i rekkefølge, med formen hver dose gis med. */
const doselinjer = (tekst: string) =>
  [...tekst.matchAll(/^(?:Dag|Fra dag) [\d–]+: Escitalopram peroralt: (\d+) mg = (.+?)(?: \(valgt av forskriveren.*\))?$/gm)].map(([, mg, hva]) => ({
    mg: Number(mg),
    form: /dråpe/.test(hva!) ? 'dråper' : /tablett/.test(hva!) ? 'tablett' : hva!,
    hva: hva!,
  }))

/** Ingen plan å kopiere og ingen doser; panelet sier hvorfor (motorens egen tekst står bak «Vis detaljer»). */
async function stoppet(grunn: RegExp) {
  await ingenPlan(grunn)
  expect(screen.queryByRole('button', { name: 'Kopier planen' })).toBeNull()
  expect(screen.queryByText(/ mg = \d+ (dråper?|tablett)/)).toBeNull()
}

const FINGERAVTRYKK = `Regel ${V14.id}, versjon 14, fingeravtrykk ${B2_GODKJENNING_0511.fingeravtrykk.slice(0, 12)}`

describe('Escitalopram versjon 14 (B2) på verktøysiden, uten simulering', () => {
  it('bruker den godkjente versjonen 14 med nøyaktig fingeravtrykket, og versjon 13 er trukket', () => {
    expect(V14.godkjenning.status).toBe('klinisk_godkjent')
    expect(V14.godkjenning.historikk.at(-1)).toMatchObject({ rolle: 'uavhengig_kontrollor', regelversjon: 14, fingeravtrykk: B2_GODKJENNING_0511.fingeravtrykk })
    expect(V13.versjon).toBe(13)
  })

  for (const [id, dose, form, forste, seponert, valg] of [
    ['B2-01', '20', TABLETT, 'tablett', 281, ['12 mg (−20 %)', '7 mg (−22,22 %)', '6 mg (−14,29 %)', '5 mg (−16,67 %)', '4 mg (−20 %)', '2 mg (−33,33 %)', '1 mg (−50 %)']],
    ['B2-02', '10', TABLETT, 'dråper', 197, ['8 mg (−20 %)', '5 mg (−16,67 %)', '4 mg (−20 %)', '2 mg (−33,33 %)', '1 mg (−50 %)']],
    ['B2-03', '20', DRAPER, 'dråper', 281, ['12 mg (−20 %)', '7 mg (−22,22 %)', '6 mg (−14,29 %)', '5 mg (−16,67 %)', '4 mg (−20 %)', '2 mg (−33,33 %)', '1 mg (−50 %)']],
    ['B2-04', '10', DRAPER, 'dråper', 197, ['8 mg (−20 %)', '5 mg (−16,67 %)', '4 mg (−20 %)', '2 mg (−33,33 %)', '1 mg (−50 %)']],
  ] as const) {
    it(`${id}: ${dose} mg ${form === TABLETT ? 'tabletter' : 'dråper'} gir en komplett plan til 0 mg med riktig form ved hvert trinn, tidslinjen er lik kopien, og kopien er lik kontrollgrunnlaget`, async () => {
      const user = userEvent.setup()
      vis()
      await beregn(user, dose, form)
      const { valgt, plan } = await velgTilKomplett(user, V14.tittel)
      expect(valgt).toEqual(valg)
      expect(within(plan).getByText(new RegExp(`^Komplett plan til sluttmålet: Escitalopram seponert fra dag ${seponert}\\.`))).toBeTruthy()

      const tekst = await kopier(user, plan)
      // Hver dose til 0 mg, med hele tabletter bare så lenge de gir dosen, så dråper; aldri tilbake til tabletter og aldri begge i én dose.
      const doser = doselinjer(tekst)
      expect(doser.map((d) => d.mg)).toEqual(dose === '20' ? [15, 12, 9, 7, 6, 5, 4, 3, 2, 1] : [8, 6, 5, 4, 3, 2, 1])
      expect(doser[0]!.form).toBe(forste)
      if (forste === 'tablett') expect(doser[0]!.hva).toBe('1 tablett à 10 mg + 1 tablett à 5 mg')
      for (const d of doser.slice(1)) expect(d.hva, `${d.mg} mg`).toBe(`${d.mg} ${d.mg === 1 ? 'dråpe' : 'dråper'} à 1 mg`)
      for (const d of doser) expect(/tablett/.test(d.hva) && /dråpe/.test(d.hva), `${d.mg} mg`).toBe(false)
      expect(tekst).toContain(`Fra dag ${seponert}: Escitalopram peroralt: Seponert`)
      for (const d of [7, 14, 28]) expect(tekst).toContain(`Dag ${seponert - 1 + d}: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall ${d} dager etter siste dose.`)
      expect(tekst).toMatch(/\n- Cipralex dråper, oppl 20 mg\/ml(, varenr\. \d{6})? \(Hele dråper\)\n/)
      if (forste === 'tablett') expect(tekst).toMatch(/\n- Cipralex tab 5 mg/)
      expect(tekst).toContain(FINGERAVTRYKK)
      expect(tekst).not.toMatch(/simulert|versjon 13/i)

      // Tidslinjen på siden har de samme dosene, dagene og vurderingene som kopien, celle for celle.
      const t = tidslinje(plan)
      expect(t.rader).toContainEqual([`Fra dag ${seponert}`, 'Seponert'])
      expect(tidslinjeavvik(t, tekst)).toEqual([])

      // Den samme planen som kasuset i kontrollgrunnlaget, regnet gjennom verktøyets egen tilgjengelighet uten simulering.
      const k = kasus(id)
      expect(k.regel).toBeUndefined()
      const u = kjorKontrollkasus(k, { pilot: AKSEPT, aksept: AKSEPT })
      expect(u.feil).toEqual([])
      expect(tekst).toBe(u.tekst)
    }, 60_000)
  }

  it('stopper uten doser utenfor godkjenningen: 65 år eller eldre, lang behandlingstid, tidligere seponeringsplager, en annen startdose og avregistrerte styrker', async () => {
    const user = userEvent.setup()
    for (const [dose, form, ja, grunn] of [
      // Panelet sier grunnen i klartekst; motorens egen tekst står bak «Vis detaljer».
      ['20', TABLETT, [/65 år eller eldre/], /Ingen plan med disse svareneVerktøyet har ingen godkjent plan ved 65 år eller eldre\./],
      ['10', DRAPER, [/65 år eller eldre/], /Ingen plan med disse svareneVerktøyet har ingen godkjent plan ved 65 år eller eldre\./],
      [
        '20',
        TABLETT,
        [/mange måneder/],
        /Ingen plan med disse svareneMed dette svaret kan verktøyet ikke lage en komplett plan helt til sluttmålet\.[^]*Komplett plan ikke tilgjengelig: escitalopram: /,
      ],
      ['20', TABLETT, [/tidligere forsøk/i], /Ingen plan med disse svareneDa gjelder ikke regelen\./],
      ['15', TABLETT, [], /Ingen plan for dette tilfelletDen godkjente planen gjelder bare startdosene 10 og 20 mg\./],
    ] as const) {
      vis()
      await beregn(user, dose, form, [...ja])
      await stoppet(grunn)
      cleanup()
      glemBildet()
      sessionStorage.clear()
    }
    // Avregistrerte styrker: uten dråpene à 1 mg eller tablettene à 5 mg gir 20 mg tabletter ingen plan. Uten 1 mg-dråpene
    // finnes ingen godkjent plan; uten 5 mg-tablettene sier siden at bare dråper kan gi en komplett plan.
    const idag = pilotklokke(AKSEPT)().toISOString().slice(0, 10)
    for (const [mg, grunn] of [
      [1, /Ingen plan for dette tilfellet[^]*styrken 1 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST/],
      [5, /Ett spørsmål igjenMed tablett kan verktøyet ikke lage en komplett plan, men med dråper, oppløsning kan det\./],
    ] as const) {
      vis({ legemidler: pilotlesing(AKSEPT, (x) => avregistrert('escitalopram', mg).endre(x as never, idag)) })
      await beregn(user, '20', TABLETT)
      await stoppet(grunn)
      cleanup()
      glemBildet()
      sessionStorage.clear()
    }
  }, 120_000)

  it('spør om 65 år eller eldre, ikke om over 65 år', async () => {
    const user = userEvent.setup()
    vis()
    await act(async () => {})
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Escitalopram')
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av escitalopram/ }), '20')
    await velgForm(user, 'Legemiddelform av escitalopram', TABLETT)
    const pasient = await screen.findByRole('region', { name: /^Steg 3(, utfylt)?: Om pasienten$/ }, { timeout: 3000 })
    await waitFor(() => expect(pasient.textContent).not.toContain('Spørsmålene kommer når steg 2 er fylt ut.'), { timeout: 3000 })
    expect(pasient.textContent).toContain('Er pasienten 65 år eller eldre?')
    expect(pasient.textContent).not.toContain('Er pasienten over 65 år?')
  }, 30_000)
})

describe('Versjon 13 gjelder bare til versjon 14 er gyldig godkjent', () => {
  /** Appens regelsett med versjon 14 endret etter godkjenningen: fingeravtrykket stemmer ikke, så godkjenningen gjelder ikke. */
  const utenGyldigV14 = (): Regelsett => {
    const endret = structuredClone(V14)
    endret.plan.forlop[0]!.dosevalg!.praktisk!.draper = 3
    return { ...REGELSETT, regler: REGELSETT.regler.map((r) => (r.id === V14.id ? endret : r)) }
  }

  for (const [navn, regelsett] of [
    ['før godkjenningen av versjon 14', () => samlet(FOR_B2)],
    ['når versjon 14 er endret etter godkjenningen', utenGyldigV14],
  ] as const) {
    it(`${navn}: dråper gir planen etter versjon 13, og tabletter stopper`, async () => {
      const user = userEvent.setup()
      vis({ regelsett: regelsett() })
      await beregn(user, '10', DRAPER)
      const { plan } = await velgTilKomplett(user, V13.tittel)
      const tekst = await kopier(user, plan)
      expect(tekst).toMatch(/Regel seponering-escitalopram, versjon 13, fingeravtrykk e8a3c17edda1/)
      expect(tekst).not.toContain(V14.id)
      cleanup()
      glemBildet()
      sessionStorage.clear()

      vis({ regelsett: regelsett() })
      // Med tabletter ingen plan: versjon 13 gjelder bare dråper, og siden sier det.
      await beregn(user, '20', TABLETT)
      await stoppet(/Ett spørsmål igjenMed tablett kan verktøyet ikke lage en komplett plan, men med dråper, oppløsning kan det\./)
      await waitFor(() => expect(document.body.textContent).not.toContain(V14.tittel))
    }, 60_000)
  }
})
