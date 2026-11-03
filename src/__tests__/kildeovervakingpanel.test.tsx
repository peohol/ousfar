// @vitest-environment jsdom
/**
 * Vinduet «Kildeovervåking» i administrasjonsmenyen (VDR-1 og VDR-2): de
 * faglige sakene først (`fagsaker.test.tsx`), og under dem, lukket, det
 * tekniske sporet for kontrollører: de åpne sakene med tilstand og de
 * godkjente reglene de kan berøre, uten frister og uten skjema for tekniske
 * vurderinger eller fritekstavslutning, og hva siste kontroll sammenlignet.
 * Tilgangen og reglene for sakene avgjøres i databasen
 * (`kildeovervaking.test.ts`). Syntetiske data.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Kildeovervaking } from '../components/konto/Kildeovervaking'
import { glemBildet } from '../oppdatering/bevaring'
import type { Fagsaklager } from '../verktoy/overvaking/fagsak'
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
  tilstand: 'teknisk_utredning',
  versjon: 1,
  alvor: 'faglig',
  konklusjon: null,
  konklusjon_tekst: null,
  konklusjon_kl: null,
  nytt_innhold_kl: null,
  utfall: null,
  avsluttet_kl: null,
  teknisk_vurdering: null,
  teknisk_av: null,
  beslutning: null,
  beslutning_av: null,
  tiltak: [],
  hendelser: [{ kl: timerFor(80), art: 'opprettet', fra: null, til: 'teknisk_utredning', av: null }],
  ...over,
})

/** Ingen faglige saker: vinduet viser da bare at ingenting venter, og det tekniske sporet under. */
const INGEN_SAKER: Fagsaklager = { les: async () => ({ saker: [], teknisk: 'oppfolging', sist_kontrollert_kl: null }), beslutt: async () => 'registrert' }

const minnelager = (data: Overvaking): Kildeovervakingslager => ({ les: async () => structuredClone(data) })

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
  it('viser de faglige sakene først og det tekniske sporet lukket under', async () => {
    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={minnelager({ funn: [funn({})], kjoringer: [SISTE], siste: SISTE })} na={() => NA} />)
    expect(await screen.findByText('Ingenting venter på deg.')).toBeTruthy()
    expect(screen.getByText(/Noen kilder følges opp teknisk\. Det krever ingenting av deg/)).toBeTruthy()
    const spor = screen.getByRole('region', { name: 'Teknisk spor' }).querySelector('details')!
    expect(spor.open).toBe(false)
    expect(within(spor).getByText('Teknisk spor for kontrollører')).toBeTruthy()
    // Overskriftene for redaktøren står før det tekniske sporet.
    const overskrifter = screen.getAllByRole('heading').map((h) => h.textContent)
    expect(overskrifter.indexOf('Trenger din beslutning')).toBeLessThan(overskrifter.indexOf('Alle åpne saker, også tekniske'))
  })

  it('viser en åpen sak med tilstand og regelen den kan berøre, uten frister eller skjema, og det tekniske bare i den lukkede loggen', async () => {
    const lager = minnelager({ funn: [funn({})], kjoringer: [SISTE], siste: SISTE })
    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={lager} na={() => NA} />)

    const rad = (await screen.findByText('Syntetin 50 mg tablett')).closest('li')!
    expect(within(rad).getByText('Teknisk utredning')).toBeTruthy()
    expect(rad.textContent).toMatch(/Kan berøre: .*\(versjon 9\)\./)
    expect(rad.textContent).toContain('Følges opp teknisk; ingen handling fra deg.')
    expect(rad.textContent).not.toMatch(/frist/i)
    expect(within(rad).queryByRole('textbox')).toBeNull()
    expect(within(rad).queryByRole('button', { name: /Lagre/ })).toBeNull()
    const logg = rad.querySelector('details')!
    expect(logg.open).toBe(false)
    expect(within(logg).getByText('Teknisk logg')).toBeTruthy()
    expect(logg.textContent).toContain('Sak nr. 1, versjon 1 (fest:sertralin:ID_X)')
  })

  it('merker et mulig sikkerhetsproblem og en prøve, og viser hvordan en avsluttet sak endte', async () => {
    const lager = minnelager({
      funn: [
        funn({ id: 4, alvor: 'sikkerhet', tilstand: 'faglig_gjennomgang', etikett: 'Syntetisk kilde' }),
        funn({ id: 2, funn: 'provesak:syntetisk', prove: true, etikett: 'Syntetisk prøvesak (ingen reell kilde)', berorte: [] }),
        funn({ id: 1, etikett: 'Avsluttet kilde', tilstand: 'avsluttet', utfall: 'ikke_funnet_igjen', avsluttet_kl: timerFor(2) }),
      ],
      kjoringer: [],
      siste: { ...SISTE, feil: [] },
    })
    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={lager} na={() => NA} />)
    const sikker = (await screen.findByText('Syntetisk kilde')).closest('li')!
    expect(within(sikker).getByText('Mulig sikkerhetsproblem')).toBeTruthy()
    expect(sikker.textContent).not.toContain('ingen handling fra deg')
    expect(within(screen.getByText('Syntetisk prøvesak (ingen reell kilde)').closest('li')!).getByText('Prøve')).toBeTruthy()
    const avsluttet = within(screen.getByRole('region', { name: 'Avsluttede saker' }))
    expect(avsluttet.getByText(/Avsluttet .*: kilden stemte igjen med grunnlaget\./)).toBeTruthy()
  })

  it('viser hva siste kontroll sammenlignet, det som stoppet og de informative endringene, og sier fra når den har uteblitt', async () => {
    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={minnelager({ funn: [], kjoringer: [SISTE], siste: SISTE })} na={() => NA} />)
    const siste = within(await screen.findByRole('region', { name: 'Siste kontroll' }))
    expect(await siste.findByText('Siste kildekontroll stoppet.')).toBeTruthy()
    expect(siste.getByText('Ikke kontrollert: FEST: innlogging avvist')).toBeTruthy()
    expect(siste.getByText(/Kildedokument: 3 kontrollert/)).toBeTruthy()
    expect(siste.getByText('Kildedokument: Syntetisk preparatomtale (kunne ikke kontrolleres)')).toBeTruthy()
    expect(siste.getByRole('link', { name: 'Hele rapporten' }).getAttribute('href')).toBe(SISTE.lenke)
    expect(screen.getByText('Ingen åpne saker.')).toBeTruthy()
    cleanup()

    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={minnelager({ funn: [], kjoringer: [], siste: { ...SISTE, feil: [], kjort_kl: timerFor(9 * 24) } })} na={() => NA} />)
    expect(await screen.findByText('Kildeovervåkingen har ikke kjørt på over en uke.')).toBeTruthy()
  })

  it('sier at kildeovervåkingen ikke kunne leses, i stedet for at ingen saker er åpne, og prøver igjen', async () => {
    const user = userEvent.setup()
    const data = { funn: [funn({})], kjoringer: [SISTE], siste: SISTE }
    const les = vi.fn(async (): Promise<Overvaking> => {
      throw new Error('Nettverket svarte ikke.')
    })
    render(<Kildeovervaking apen onLukk={() => {}} fagsaker={INGEN_SAKER} lager={{ les }} na={() => NA} />)
    expect(await screen.findByText('Kildeovervåkingen kunne ikke leses, så det er ukjent om saker venter.')).toBeTruthy()
    expect(screen.getByRole('alert').textContent).toBe('Nettverket svarte ikke.')
    expect(screen.queryByText('Ingen åpne saker.')).toBeNull()
    expect(screen.queryByText('Henter kildeovervåkingen …')).toBeNull()

    les.mockResolvedValue(structuredClone(data))
    await user.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    expect(await screen.findByText('Syntetin 50 mg tablett')).toBeTruthy()
    expect(screen.queryByText(/kunne ikke leses/)).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
