// @vitest-environment jsdom
/**
 * Vinduet «Kildeovervåking» i administrasjonsmenyen (P12.1): en administrator
 * ser funnene som venter, med fristene og de godkjente reglene de kan berøre,
 * skriver den tekniske vurderingen og den faglige beslutningen som avslutter
 * funnet, og ser hva siste kontroll sammenlignet. Tilgangen og reglene for
 * funnene avgjøres i databasen (`kildeovervaking.test.ts`). Syntetiske data.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Kildeovervaking } from '../components/konto/Kildeovervaking'
import { glemBildet } from '../oppdatering/bevaring'
import type { Kildefunn, Kildeovervaking as Overvaking, Kildeovervakingslager } from '../verktoy/overvaking/varsling'

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

const NA = Date.parse('2026-11-10T08:00:00Z')
const timerFor = (t: number) => new Date(NA - t * 3_600_000).toISOString()

const funn = (over: Partial<Kildefunn>): Kildefunn => ({
  id: 1,
  funn: 'fest:sertralin:ID_X',
  kilde: 'fest',
  art: 'fjernet',
  prioritet: 'hoy',
  prove: false,
  etikett: 'Syntetin 50 mg tablett',
  detaljer: ['Preparatet er borte fra FEST.'],
  berorte: [{ regelsett: 'nedtrapping-ad', regel: 'kryssnedtrapping-sertralin-mirtazapin', versjon: 9, fingeravtrykk: 'f'.repeat(64), hvorfor: 'bruker styrken' }],
  opprettet_kl: timerFor(80),
  sist_sett_kl: timerFor(80),
  borte_kl: null,
  erstatter: null,
  erstattet_kl: null,
  teknisk_vurdering: null,
  teknisk_av: null,
  teknisk_kl: null,
  beslutning: null,
  beslutning_av: null,
  beslutning_kl: null,
  ...over,
})

/** Et lager i minnet som oppfører seg som databasen for de åpne funnene. */
function minnelager(data: Overvaking): Kildeovervakingslager & { data: Overvaking } {
  return {
    data,
    les: async () => structuredClone(data),
    vurder: vi.fn(async (id: number, vurdering: string) => {
      Object.assign(data.funn.find((f) => f.id === id)!, { teknisk_vurdering: vurdering.trim(), teknisk_av: 'Ada Admin', teknisk_kl: timerFor(0) })
    }),
    beslutt: vi.fn(async (id: number, beslutning: string) => {
      Object.assign(data.funn.find((f) => f.id === id)!, { beslutning: beslutning.trim(), beslutning_av: 'Ada Admin', beslutning_kl: timerFor(0) })
    }),
  }
}

const SISTE = {
  id: 3,
  kjort_kl: timerFor(2),
  utlost: 'cron' as const,
  prove: false,
  grunnlag: [
    { kilde: 'dokument' as const, kjort: true, kontrollert: 3, beskrivelse: 'Kontrollsummene i grunnlaget.' },
    { kilde: 'psychiatrienet' as const, kjort: false, kontrollert: 0, beskrivelse: 'Psychiatrienet ble ikke kontrollert i denne kjøringen (kontrolleres månedlig).' },
  ],
  feil: ['FEST: innlogging avvist'],
  informative: [{ id: 'dokument:emc-nardil', kilde: 'dokument' as const, art: 'utilgjengelig' as const, etikett: 'Syntetisk preparatomtale' }],
  lenke: 'https://github.com/eier/repo/actions/runs/1',
}

describe('kildeovervåkingen i administrasjonsmenyen', () => {
  it('viser et funn med fristene og regelen det kan berøre, og avslutter det med en teknisk vurdering og en faglig beslutning', async () => {
    const user = userEvent.setup()
    const lager = minnelager({ funn: [funn({})], kjoringer: [SISTE], siste: SISTE })
    render(<Kildeovervaking apen onLukk={() => {}} lager={lager} na={() => NA} />)

    const rad = (await screen.findByText('Syntetin 50 mg tablett')).closest('li')!
    expect(within(rad).getByText('Høy prioritet')).toBeTruthy()
    expect(within(rad).getByText('Preparatet er borte fra FEST.')).toBeTruthy()
    expect(rad.textContent).toMatch(/Kan berøre: .*\(versjon 9\)\./)
    expect(rad.textContent).toContain('Funn nr. 1 (fest:sertralin:ID_X)')
    expect(within(rad).getByText(/Teknisk vurdering mangler, over fristen på 24 timer/)).toBeTruthy()
    expect(within(rad).getByText(/Faglig beslutning mangler, over fristen på 72 timer/)).toBeTruthy()

    // For kort: ingenting lagres.
    await user.click(within(rad).getByRole('button', { name: 'Lagre teknisk vurdering' }))
    expect(screen.getByRole('alert').textContent).toBe('Skriv den tekniske vurderingen, minst fem tegn.')
    expect(lager.vurder).not.toHaveBeenCalled()

    await user.type(within(rad).getByRole('textbox', { name: /Teknisk vurdering/ }), 'Syntetisk: preparatet er avregistrert.')
    await user.click(within(rad).getByRole('button', { name: 'Lagre teknisk vurdering' }))
    expect(lager.vurder).toHaveBeenCalledWith(1, 'Syntetisk: preparatet er avregistrert.')
    const vurdert = (await screen.findByText('Syntetisk: preparatet er avregistrert.')).closest('li')!
    expect(within(vurdert).queryByText(/Teknisk vurdering mangler/)).toBeNull()
    expect(within(vurdert).getByText(/Teknisk vurdering av Ada Admin/)).toBeTruthy()

    await user.type(within(vurdert).getByRole('textbox', { name: /Faglig beslutning/ }), 'Ny regelversjon lages; nødstopp ikke nødvendig.')
    await user.click(within(vurdert).getByRole('button', { name: 'Lagre beslutning og avslutt' }))
    expect(lager.beslutt).toHaveBeenCalledWith(1, 'Ny regelversjon lages; nødstopp ikke nødvendig.')
    expect(await screen.findByText('Ingen funn venter.')).toBeTruthy()
    const avsluttet = within(screen.getByRole('region', { name: 'Avsluttede funn' }))
    expect(avsluttet.getByText(/Avsluttet .* av Ada Admin: Ny regelversjon lages/)).toBeTruthy()
  })

  it('viser hva siste kontroll sammenlignet, det som stoppet og de informative endringene, og sier fra når den har uteblitt', async () => {
    render(<Kildeovervaking apen onLukk={() => {}} lager={minnelager({ funn: [], kjoringer: [SISTE], siste: SISTE })} na={() => NA} />)
    const siste = within(await screen.findByRole('region', { name: 'Siste kontroll' }))
    expect(await siste.findByText('Siste kildekontroll stoppet.')).toBeTruthy()
    expect(siste.getByText('Ikke kontrollert: FEST: innlogging avvist')).toBeTruthy()
    expect(siste.getByText(/Kildedokument: 3 kontrollert/)).toBeTruthy()
    expect(siste.getByText('Kildedokument: Syntetisk preparatomtale (kunne ikke kontrolleres)')).toBeTruthy()
    expect(siste.getByRole('link', { name: 'Hele rapporten' }).getAttribute('href')).toBe(SISTE.lenke)
    cleanup()

    render(<Kildeovervaking apen onLukk={() => {}} lager={minnelager({ funn: [], kjoringer: [], siste: { ...SISTE, feil: [], kjort_kl: timerFor(9 * 24) } })} na={() => NA} />)
    expect(await screen.findByText('Kildeovervåkingen har ikke kjørt på over en uke.')).toBeTruthy()
  })

  it('merker en prøve og et funn som ikke lenger finnes, uten frist for den faglige beslutningen ved vanlig prioritet', async () => {
    const lager = minnelager({
      funn: [
        funn({ id: 2, funn: 'provesak:syntetisk', prove: true, etikett: 'Syntetisk prøvesak (ingen reell kilde)', opprettet_kl: timerFor(1), berorte: [] }),
        funn({ id: 3, funn: 'dokument:a', kilde: 'dokument', art: 'endret', prioritet: 'vanlig', etikett: 'Syntetisk kilde', opprettet_kl: timerFor(30), borte_kl: timerFor(2) }),
      ],
      kjoringer: [],
      siste: { ...SISTE, feil: [] },
    })
    render(<Kildeovervaking apen onLukk={() => {}} lager={lager} na={() => NA} />)
    const prove = (await screen.findByText('Syntetisk prøvesak (ingen reell kilde)')).closest('li')!
    expect(within(prove).getByText('Prøve')).toBeTruthy()
    expect(within(prove).getByText(/Teknisk vurdering mangler \(frist 24 timer etter funnet\)/)).toBeTruthy()
    const borte = screen.getByText('Syntetisk kilde').closest('li')!
    expect(borte.textContent).toMatch(/Ikke funnet igjen i kontrollen .*; ta stilling til om det kan avsluttes\./)
    expect(within(borte).queryByText(/Faglig beslutning mangler/)).toBeNull()
  })

  it('sier at kildeovervåkingen ikke kunne leses, i stedet for at ingen funn venter, og prøver igjen', async () => {
    const user = userEvent.setup()
    const data = { funn: [funn({})], kjoringer: [SISTE], siste: SISTE }
    const les = vi.fn(async (): Promise<Overvaking> => {
      throw new Error('Nettverket svarte ikke.')
    })
    render(<Kildeovervaking apen onLukk={() => {}} lager={{ les, vurder: vi.fn(), beslutt: vi.fn() }} na={() => NA} />)
    expect(await screen.findByText('Kildeovervåkingen kunne ikke leses, så det er ukjent om funn venter.')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Nettverket svarte ikke.')
    expect(screen.queryByText('Ingen funn venter.')).toBeNull()
    expect(screen.queryByText('Henter kildeovervåkingen …')).toBeNull()

    les.mockResolvedValue(structuredClone(data))
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByText('Syntetin 50 mg tablett')).toBeTruthy()
    expect(screen.queryByText(/kunne ikke leses/)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
