// @vitest-environment jsdom
/**
 * Funksjonsbryterne i administrasjonsmenyen (#598): systemarkitekten slår en
 * funksjon av og på per fagmiljø og merker testmiljøer, med en begrunnelse,
 * og får bare tilbudt det databasen tillater. Tilgangen og vernet avgjøres i
 * databasen (`funksjonsbrytere.test.ts`); her prøves visningen og at
 * rettighetene gir appen funksjonene den innloggede har, og ingenting annet.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Funksjoner } from '../components/konto/Funksjoner'
import {
  kanEndreTestmiljo,
  lesFunksjonsoversikt,
  tillatteTilstander,
  type Funksjonsbryterlager,
  type Funksjonsoversikt,
  type Funksjonstilstand,
} from '../auth/funksjonsbrytere'
import { fagmiljoerMedFunksjon, harFunksjon, INGEN_RETTIGHETER, lesRettigheter } from '../auth/rettigheter'
import { glemBildet } from '../oppdatering/bevaring'

beforeEach(() => {
  sessionStorage.clear()
  glemBildet()
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

const miljo = (id: string, navn: string, testmiljo: boolean, standard = false) => ({
  id,
  nokkel: id,
  navn,
  standard,
  apent: true,
  ikon: 'laboratorium' as const,
  testmiljo,
})

/** Et lager i minnet med det samme vernet som databasen. */
function minnelager(): Funksjonsbryterlager & { data: Funksjonsoversikt } {
  const data: Funksjonsoversikt = {
    funksjoner: [{ nokkel: 'testfunksjon', navn: 'Testfunksjon', beskrivelse: 'Syntetisk funksjon.', virkeligeFagmiljoer: false, brytere: [] }],
    fagmiljoer: [miljo('a', 'Fagmiljø A', false, true), miljo('t', 'Testmiljø T', true)],
  }
  return {
    data,
    oversikt: async () => structuredClone(data),
    settBryter: vi.fn(async (funksjon: string, fagmiljo: string, tilstand: Funksjonstilstand) => {
      const f = data.funksjoner.find((x) => x.nokkel === funksjon)!
      const m = data.fagmiljoer.find((x) => x.id === fagmiljo)!
      if (!tillatteTilstander(f, m).includes(tilstand)) throw new Error('Funksjonen er ikke godkjent for virkelige fagmiljøer ennå.')
      const brytere = f.brytere.filter((b) => b.fagmiljo !== fagmiljo)
      ;(f as { brytere: unknown[] }).brytere =
        tilstand === 'av' ? brytere : [...brytere, { fagmiljo, tilstand, endretKl: '2026-11-27T19:00:00Z', endretAv: 'Aria Arkitekt' }]
    }),
    settTestmiljo: vi.fn(async (fagmiljo: string, testmiljo: boolean) => {
      const m = data.fagmiljoer.find((x) => x.id === fagmiljo)!
      if (!kanEndreTestmiljo(data, m)) throw new Error('Slå av funksjonene som prøves ut eller er på i fagmiljøet først.')
      ;(m as { testmiljo: boolean }).testmiljo = testmiljo
    }),
  }
}

describe('funksjonsbryterne i administrasjonsmenyen', () => {
  it('slår en funksjon til utprøving i testmiljøet med en begrunnelse, og tilbyr bare av i et virkelig fagmiljø', async () => {
    const user = userEvent.setup()
    const lager = minnelager()
    render(<Funksjoner apen onLukk={() => {}} lager={lager} />)
    expect(await screen.findByText('Testfunksjon')).toBeTruthy()
    expect(screen.getByText('Bare godkjent for testmiljøer.')).toBeTruthy()

    // Det virkelige fagmiljøet kan bare stå av.
    const virkelig = screen.getByRole('combobox', { name: 'Testfunksjon i Fagmiljø A' }) as HTMLSelectElement
    expect(virkelig.disabled).toBe(true)
    expect([...virkelig.options].map((o) => o.value)).toEqual(['av'])

    // Uten begrunnelse endres ingenting.
    const test = screen.getByRole('combobox', { name: 'Testfunksjon i Testmiljø T (testmiljø)' }) as HTMLSelectElement
    expect([...test.options].map((o) => o.value)).toEqual(['av', 'utprøving', 'på'])
    await user.selectOptions(test, 'utprøving')
    expect(screen.getByRole('alert').textContent).toBe('Skriv begrunnelsen for endringen først, minst 5 tegn.')
    expect(lager.settBryter).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Begrunnelse for endringen' }), 'Syntetisk utprøving')
    await user.selectOptions(test, 'utprøving')
    expect(lager.settBryter).toHaveBeenCalledWith('testfunksjon', 't', 'utprøving', 'Syntetisk utprøving')
    expect(((await screen.findByRole('combobox', { name: 'Testfunksjon i Testmiljø T (testmiljø)' })) as HTMLSelectElement).value).toBe('utprøving')
    expect(screen.getByText(/Endret .* av Aria Arkitekt/)).toBeTruthy()
    // Begrunnelsen gjelder én endring.
    expect((screen.getByRole('textbox', { name: 'Begrunnelse for endringen' }) as HTMLInputElement).value).toBe('')
  })

  it('lar ikke standardfagmiljøet bli testmiljø, og ikke merket fjernes mens en funksjon prøves ut der', async () => {
    const user = userEvent.setup()
    const lager = minnelager()
    render(<Funksjoner apen onLukk={() => {}} lager={lager} />)
    const testmiljoer = within((await screen.findByRole('heading', { name: 'Testmiljøer' })).closest('section')!)
    expect((testmiljoer.getByRole('checkbox', { name: 'Fagmiljø A' }) as HTMLInputElement).disabled).toBe(true)
    const t = testmiljoer.getByRole('checkbox', { name: 'Testmiljø T' }) as HTMLInputElement
    expect(t.checked).toBe(true)
    expect(t.disabled).toBe(false)

    await user.type(screen.getByRole('textbox', { name: 'Begrunnelse for endringen' }), 'Syntetisk utprøving')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Testfunksjon i Testmiljø T (testmiljø)' }), 'på')
    expect(((await testmiljoer.findByRole('checkbox', { name: 'Testmiljø T' })) as HTMLInputElement).disabled).toBe(true)
    expect(lager.settTestmiljo).not.toHaveBeenCalled()
  })

  it('sier fra når ingen funksjoner er ført inn', async () => {
    const lager = minnelager()
    lager.data.funksjoner = []
    render(<Funksjoner apen onLukk={() => {}} lager={lager} />)
    expect(await screen.findByText('Ingen funksjoner er ført inn ennå.')).toBeTruthy()
  })
})

describe('svarene fra databasen', () => {
  it('leser funksjonene i rettighetene, uten dem med feil form, og svarer bare om dem', () => {
    const r = lesRettigheter({
      funksjoner: [{ funksjon: 'personal', fagmiljo: 't' }, { funksjon: 'personal' }, 'personal', { funksjon: 1, fagmiljo: 'a' }],
    })
    expect(r.funksjoner).toEqual([{ funksjon: 'personal', fagmiljo: 't' }])
    expect(harFunksjon(r, 'personal')).toBe(true)
    expect(harFunksjon(r, 'personal', 't')).toBe(true)
    expect(harFunksjon(r, 'personal', 'a')).toBe(false)
    expect(harFunksjon(r, 'annen')).toBe(false)
    expect(fagmiljoerMedFunksjon(r, 'personal')).toEqual(['t'])
    // En database uten feltet gir ingen funksjoner.
    expect(lesRettigheter({}).funksjoner).toEqual([])
    expect(harFunksjon(INGEN_RETTIGHETER, 'personal')).toBe(false)
  })

  it('leser oversikten, og ser bort fra brytere på av og med ukjent tilstand', () => {
    const o = lesFunksjonsoversikt({
      funksjoner: [
        {
          nokkel: 'personal',
          navn: 'Personal',
          beskrivelse: 'Syntetisk',
          virkelige_fagmiljoer: false,
          brytere: [
            { fagmiljo: 't', tilstand: 'utprøving', endret_kl: '2026-11-27T19:00:00Z', endret_av: null },
            { fagmiljo: 'a', tilstand: 'av' },
            { fagmiljo: 'b', tilstand: 'halvveis' },
          ],
        },
        { navn: 'Uten nøkkel' },
      ],
      fagmiljoer: [{ id: 't', nokkel: 't', navn: 'T', testmiljo: true }, { navn: 'Feil' }],
    })
    expect(o.funksjoner).toHaveLength(1)
    expect(o.funksjoner[0]!.brytere).toEqual([{ fagmiljo: 't', tilstand: 'utprøving', endretKl: '2026-11-27T19:00:00Z', endretAv: null }])
    expect(o.fagmiljoer).toEqual([expect.objectContaining({ id: 't', testmiljo: true })])
    expect(lesFunksjonsoversikt(null)).toEqual({ funksjoner: [], fagmiljoer: [] })
  })
})
