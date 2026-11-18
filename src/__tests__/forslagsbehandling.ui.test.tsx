// @vitest-environment jsdom
/**
 * Behandlingen av endringsforslagene i appen (P5 tråd C): fanen og
 * arbeidskøen «Til behandling», behandlerens handlinger på siden til ett
 * forslag, konfliktvisningen, «Åpne utkastet», «Marker som innarbeidet» og
 * tallet i kontomenyen. Kallene er erstattet; tilgangen og overgangene selv
 * prøves mot databasen i `forslagsbehandling.test.ts`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const ID = '0f1e2d3c-4b5a-4968-8776-655443322110'
const SIDE = '11111111-0000-4000-8000-000000000001'
const DOSERING = '22222222-0000-4000-8000-000000000002'
const REGELSETT = '44444444-0000-4000-8000-000000000004'

const api = vi.hoisted(() => ({
  kall: vi.fn(async (): Promise<unknown> => null),
  sendForslag: vi.fn(),
  hentMineForslag: vi.fn(async (): Promise<unknown[]> => []),
  hentForslag: vi.fn(async (): Promise<unknown> => null),
  trekkForslag: vi.fn(),
  svarPaForslag: vi.fn(),
}))
vi.mock('../forslag/api', () => api)

const { RettigheterKilde, INGEN_RETTIGHETER } = await import('../auth/rettigheter')
const { lesForslag } = await import('../forslag/modell')
const { lesForslagsko, muligeBehandlinger, ventende } = await import('../forslag/behandling')
const { taRedigeringsonske } = await import('../faginnhold/redigeringsonske')
const { FaginnholdskildeProvider } = await import('../components/stoffside/Faginnholdskilde')
const { Forslagsside } = await import('../components/forslag/Forslagsside')
const { TilbehandlingMenyvalg } = await import('../components/forslag/behandling/Tilbehandling')

beforeAll(() => {
  window.scrollTo = () => undefined
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  api.kall.mockResolvedValue(null)
  window.location.hash = ''
})

/** En redaktør uten administratorrolle: `behandler_forslag` er det eneste som gir behandlingen i appen. */
const BEHANDLER = { ...INGEN_RETTIGHETER, behandlerForslag: true }

function somBehandler(innhold: ReactNode, rettigheter = BEHANDLER) {
  return render(<RettigheterKilde verdi={rettigheter}>{innhold}</RettigheterKilde>)
}

const FAGSIDE = { id: SIDE, type: 'infoside', navn: 'Citalopram', stoff: 'citalopram', analyttkode: null, omfang: 'lokal' }
const REGLER = { id: REGELSETT, type: 'intervallregelsett', navn: 'HBUP', stoff: null, analyttkode: 'HBUP', omfang: 'lokal' }

const korad = (ekstra: Record<string, unknown> = {}) => ({
  id: ID,
  status: 'ny',
  ressurs: FAGSIDE,
  element_id: DOSERING,
  sted: 'Citalopram · Dosering',
  sammendrag: '10 mg om morgenen.',
  stilt_av: { er_meg: false, navn: 'Anne Ansatt' },
  opprettet_kl: '2026-11-16T10:00:00Z',
  oppdatert_kl: '2026-11-16T10:00:00Z',
  behandler_er_meg: false,
  har_behandler: false,
  uten_redaktor: false,
  endret_siden: false,
  ...ekstra,
})

const KO = {
  antall: { nye: 2, pagaende: 1, uten_redaktor: 1, mine: 1 },
  nye: [korad(), korad({ id: 'b', sted: 'Citalopram · Interaksjoner', uten_redaktor: true, endret_siden: true })],
  pagaende: [korad({ id: 'c', status: 'venter_pa_forslagsstiller', har_behandler: true, behandler_er_meg: true })],
  ferdige: [],
}

const forslaget = (ekstra: Record<string, unknown> = {}) =>
  lesForslag({
    id: ID,
    status: 'ny',
    ressurs: FAGSIDE,
    element: { id: DOSERING, type: 'innholdselement' },
    grunnrevisjon: 3,
    sideversjon: 7,
    sted: 'Citalopram · Dosering',
    utdrag: '20 mg om morgenen.',
    forslag: '10 mg om morgenen.',
    begrunnelse: 'Ny retningslinje.',
    kilder: [],
    opprettet_kl: '2026-11-16T10:00:00Z',
    oppdatert_kl: '2026-11-16T10:00:00Z',
    stilt_av: { er_meg: false, navn: 'Anne Ansatt' },
    behandler: null,
    vedtak: null,
    innarbeidet: null,
    hendelser: [{ id: 1, art: 'opprettet', tekst: null, utfort_av: { er_meg: false, navn: 'Anne Ansatt' }, utfort_kl: '2026-11-16T10:00:00Z', data: {} }],
    er_mitt: false,
    kan_behandle: true,
    kan_trekke: false,
    kan_svare: false,
    konflikt: { grunnrevisjon: 3, publisert_revisjon: 3, endret_siden: false, side_endret_siden: false, utkast_endret: false },
    ...ekstra,
  })!

describe('modellen', () => {
  it('leser køen, og tallet som venter er de nye og dem du behandler', () => {
    const ko = lesForslagsko(KO)
    expect(ko.nye.map((r) => r.id)).toEqual([ID, 'b'])
    expect(ko.nye[1]).toMatchObject({ uten_redaktor: true, endret_siden: true, stilt_av: { er_meg: false, navn: 'Anne Ansatt' } })
    expect(ko.pagaende[0]).toMatchObject({ status: 'venter_pa_forslagsstiller', behandler_er_meg: true })
    expect(ventende(ko.antall)).toBe(3)
    expect(lesForslagsko(null)).toEqual({ antall: { nye: 0, pagaende: 0, uten_redaktor: 0, mine: 0 }, nye: [], pagaende: [], ferdige: [] })
  })

  it('handlingene følger statusen, og ingen uten behandlingsrett', () => {
    const f = forslaget()
    expect(muligeBehandlinger(f)).toEqual({ ta: true, behandlinger: ['kommenter', 'presisering', 'godkjenn', 'avvis'], innarbeid: false })
    expect(muligeBehandlinger({ ...f, status: 'under_behandling', behandler: { er_meg: true, navn: null } }).ta).toBe(false)
    expect(muligeBehandlinger({ ...f, status: 'under_behandling', behandler: { er_meg: false, navn: 'Per' } }).ta).toBe(true)
    expect(muligeBehandlinger({ ...f, status: 'venter_pa_forslagsstiller' }).behandlinger).toEqual(['kommenter', 'avvis'])
    expect(muligeBehandlinger({ ...f, status: 'godkjent' })).toEqual({ ta: false, behandlinger: ['kommenter'], innarbeid: true })
    expect(muligeBehandlinger({ ...f, status: 'avvist' }).behandlinger).toEqual(['kommenter'])
    expect(muligeBehandlinger({ ...f, status: 'trukket' }).behandlinger).toEqual([])
    expect(muligeBehandlinger({ ...f, kan_behandle: false }).behandlinger).toEqual([])
  })
})

describe('«Til behandling»', () => {
  it('fanen står bare for dem som behandler forslag', async () => {
    render(<Forslagsside onLukk={() => {}} />)
    await screen.findByText(/Du har ikke sendt noen forslag/)
    expect(screen.queryByRole('link', { name: 'Til behandling' })).toBeNull()
    cleanup()
    somBehandler(<Forslagsside onLukk={() => {}} />)
    expect((await screen.findByRole('link', { name: 'Til behandling' })).getAttribute('href')).toBe('#/forslag/til-behandling')
  })

  it('viser de nye, de pågående og de ferdige, med filteret for dem uten redaktør', async () => {
    const bruker = userEvent.setup()
    api.kall.mockResolvedValue(KO)
    somBehandler(<Forslagsside fane="behandling" onLukk={() => {}} />)
    const liste = await screen.findByRole('list', { name: 'Nye forslag' })
    expect(api.kall).toHaveBeenCalledWith('les_forslagsko', { filter: 'alle' })
    expect(screen.getByRole('heading', { level: 1, name: 'Til behandling' })).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Til behandling' }).getAttribute('aria-current')).toBe('page')
    const rader = within(liste).getAllByRole('link')
    expect(rader).toHaveLength(2)
    expect(within(rader[0]!).getByText('Ny')).toBeTruthy()
    expect(rader[0]!.textContent).toContain('fra Anne Ansatt')
    expect(within(rader[1]!).getByText('Uten redaktør')).toBeTruthy()
    expect(within(rader[1]!).getByText('Innholdet er endret siden')).toBeTruthy()

    await bruker.click(screen.getByRole('switch', { name: 'Bare uten redaktør' }))
    expect(within(screen.getByRole('list', { name: 'Nye forslag' })).getAllByRole('link')).toHaveLength(1)

    await bruker.click(screen.getByRole('button', { name: /Pågående/ }))
    expect(screen.getByText('Ingen forslag uten redaktør i denne listen.')).toBeTruthy()
    await bruker.click(screen.getByRole('switch', { name: 'Bare uten redaktør' }))
    const pagaende = screen.getByRole('list', { name: 'Pågående forslag' })
    expect(within(pagaende).getByText('Venter på forslagsstilleren')).toBeTruthy()
    expect(within(pagaende).getByRole('link').textContent).toContain('du behandler det')
    expect(screen.getByRole('button', { name: /Pågående/ }).getAttribute('aria-pressed')).toBe('true')

    await bruker.click(screen.getByRole('button', { name: /Ferdige/ }))
    expect(screen.getByText('Ingen forslag er ferdigbehandlet ennå.')).toBeTruthy()
  })

  it('viser feilen databasen gir', async () => {
    api.kall.mockRejectedValue(new Error('Kontoen har ikke et aktivt medlemskap.'))
    somBehandler(<Forslagsside fane="behandling" onLukk={() => {}} />)
    expect((await screen.findByRole('alert')).textContent).toBe('Kontoen har ikke et aktivt medlemskap.')
  })
})

describe('det som venter på deg (D6)', () => {
  it('viser behandleren de nye, dem hen behandler og de pågående øverst, og hens egne øverst i lista', async () => {
    const bruker = userEvent.setup()
    api.kall.mockResolvedValue({
      ...KO,
      pagaende: [korad({ id: 'd', status: 'under_behandling', har_behandler: true, sted: 'Hos en annen' }), ...KO.pagaende],
    })
    somBehandler(<Forslagsside fane="behandling" onLukk={() => {}} />)
    const oversikt = await screen.findByRole('region', { name: 'Det som venter på deg' })
    await waitFor(() =>
      expect(within(oversikt).getAllByRole('link').map((l) => l.textContent)).toEqual([
        '0Venter på svar fra deg',
        '2Nye, uten behandler',
        '1Du behandler',
        '1Under behandling i alt',
      ]),
    )
    expect(within(oversikt).getByRole('link', { name: /Du behandler/ }).getAttribute('href')).toBe('#/forslag/til-behandling')
    await bruker.click(screen.getByRole('button', { name: /Pågående/ }))
    const rader = within(screen.getByRole('list', { name: 'Pågående forslag' })).getAllByRole('link')
    expect(rader[0]!.textContent).toContain('du behandler det')
    expect(rader[1]!.textContent).toContain('en annen behandler det')
  })

  it('viser ikke arbeidskøens tall til den som ikke behandler forslag', async () => {
    api.kall.mockResolvedValue(KO)
    render(<Forslagsside onLukk={() => {}} />)
    const oversikt = await screen.findByRole('region', { name: 'Det som venter på deg' })
    expect(within(oversikt).getAllByRole('link').map((l) => l.textContent)).toEqual(['0Venter på svar fra deg'])
    expect(api.kall).not.toHaveBeenCalledWith('les_forslagsko', { filter: 'antall' })
  })
})

describe('behandlerens handlinger på ett forslag', () => {
  it('står ikke for den som ikke kan behandle forslaget', async () => {
    api.hentForslag.mockResolvedValueOnce(forslaget({ kan_behandle: false, er_mitt: true }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await screen.findByRole('heading', { level: 1 })
    expect(screen.queryByRole('heading', { name: 'Behandling' })).toBeNull()
  })

  it('tar et nytt forslag og henter det på nytt', async () => {
    const bruker = userEvent.setup()
    api.hentForslag
      .mockResolvedValueOnce(forslaget())
      .mockResolvedValueOnce(forslaget({ status: 'under_behandling', behandler: { er_meg: true, navn: null } }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    expect(await screen.findByText('Ingen har tatt forslaget ennå.')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Til behandling' }).getAttribute('href')).toBe('#/forslag/til-behandling')
    await bruker.click(screen.getByRole('button', { name: 'Ta forslaget' }))
    expect(api.kall).toHaveBeenCalledWith('ta_forslag', { forslag: ID })
    expect(await screen.findByText('Du behandler forslaget.')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Du har tatt forslaget.')
    expect(screen.queryByRole('button', { name: 'Ta forslaget' })).toBeNull()
  })

  it('tilbyr å ta over et forslag en annen behandler', async () => {
    api.hentForslag.mockResolvedValueOnce(forslaget({ status: 'under_behandling', behandler: { er_meg: false, navn: 'Per Redaktør' } }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    expect(await screen.findByText('Per Redaktør behandler forslaget.')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Ta over' })).toBeTruthy()
  })

  it('avviser bare med en begrunnelse, med fokus i feltet og tastaturet alene', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValue(forslaget({ status: 'under_behandling', behandler: { er_meg: true, navn: null } }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    const avvis = await screen.findByRole('button', { name: 'Avvis' })
    avvis.focus()
    await bruker.keyboard('{Enter}')
    const felt = screen.getByLabelText('Hvorfor avvises forslaget?')
    expect(document.activeElement).toBe(felt)
    expect(felt.getAttribute('aria-required')).toBe('true')
    await bruker.click(screen.getByRole('button', { name: 'Avvis forslaget' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Skriv hvorfor forslaget avvises.')
    expect(api.kall).not.toHaveBeenCalledWith('avvis_forslag', expect.anything())
    await bruker.type(felt, 'Dekkes alt av kortet om dosering.')
    await bruker.click(screen.getByRole('button', { name: 'Avvis forslaget' }))
    expect(api.kall).toHaveBeenCalledWith('avvis_forslag', { forslag: ID, begrunnelse: 'Dekkes alt av kortet om dosering.' })
    expect(await screen.findByText('Forslaget er avvist.')).toBeTruthy()
  })

  it('godkjenner uten begrunnelse, og sier at det ikke publiseres', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValue(forslaget({ status: 'under_behandling', behandler: { er_meg: true, navn: null } }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.click(await screen.findByRole('button', { name: 'Godkjenn' }))
    expect(screen.getByText(/Et godkjent forslag publiseres ikke/)).toBeTruthy()
    await bruker.click(screen.getByRole('button', { name: 'Godkjenn forslaget' }))
    expect(api.kall).toHaveBeenCalledWith('godkjenn_forslag', { forslag: ID, begrunnelse: null })
  })

  it('ber om en presisering, og avbryter uten å sende noe', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValue(forslaget({ status: 'under_behandling', behandler: { er_meg: true, navn: null } }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.click(await screen.findByRole('button', { name: 'Be om presisering' }))
    await bruker.type(screen.getByLabelText('Hva lurer du på?'), 'Gjelder det eldre?')
    await bruker.click(screen.getByRole('button', { name: 'Send spørsmålet' }))
    expect(api.kall).toHaveBeenCalledWith('be_om_presisering', { forslag: ID, tekst: 'Gjelder det eldre?' })
    await bruker.click(await screen.findByRole('button', { name: 'Kommenter' }))
    await bruker.click(screen.getByRole('button', { name: 'Avbryt' }))
    expect(screen.queryByLabelText('Kommentar til forslagsstilleren')).toBeNull()
    expect(api.kall).not.toHaveBeenCalledWith('kommenter_forslag', expect.anything())
  })

  it('viser avslaget når en annen kom først', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValue(forslaget({ status: 'under_behandling', behandler: { er_meg: true, navn: null } }))
    api.kall.mockRejectedValueOnce(new Error('Forslaget er endret i mellomtiden. Last siden på nytt.'))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.click(await screen.findByRole('button', { name: 'Godkjenn' }))
    await bruker.click(screen.getByRole('button', { name: 'Godkjenn forslaget' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Forslaget er endret i mellomtiden. Last siden på nytt.')
    expect(screen.getByRole('button', { name: 'Godkjenn forslaget' })).toBeTruthy()
  })

  it('markerer et godkjent forslag som innarbeidet i utkastet slik det står', async () => {
    const bruker = userEvent.setup()
    api.hentForslag
      .mockResolvedValueOnce(forslaget({ status: 'godkjent', behandler: { er_meg: true, navn: null } }))
      .mockResolvedValueOnce(
        forslaget({ status: 'innarbeidet', behandler: { er_meg: true, navn: null }, innarbeidet: { objekt: DOSERING, revisjon: 5 } }),
      )
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    await bruker.click(await screen.findByRole('button', { name: 'Marker som innarbeidet' }))
    expect(screen.getByText(/revisjonen utkastet står på nå/)).toBeTruthy()
    await bruker.click(screen.getByRole('button', { name: 'Marker som innarbeidet' }))
    expect(api.kall).toHaveBeenCalledWith('marker_forslag_innarbeidet', { forslag: ID })
    expect(await screen.findByText(/Arbeidet inn i revisjon 5 av utkastet/)).toBeTruthy()
  })

  it('«Åpne utkastet» åpner fagsiden i redigeringen, og regelsettet i redigeringen av fortolkningen', async () => {
    const bruker = userEvent.setup()
    api.hentForslag.mockResolvedValueOnce(forslaget())
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    const lenke = await screen.findByRole('link', { name: 'Åpne utkastet' })
    expect(lenke.getAttribute('href')).toBe('#/stoff/citalopram')
    await bruker.click(lenke)
    expect(taRedigeringsonske('citalopram')).toBe(true)
    expect(taRedigeringsonske('citalopram')).toBe(false)
    cleanup()
    api.hentForslag.mockResolvedValueOnce(forslaget({ ressurs: REGLER, element: null }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    expect((await screen.findByRole('link', { name: 'Åpne utkastet' })).getAttribute('href')).toBe('#/fortolkning/hbup/rediger')
  })

  it('sier fra når innholdet er endret siden, og åpner historikken for sammenligning', async () => {
    const bruker = userEvent.setup()
    const lesHistorikk = vi.fn(async () => ({ hendelser: [], revisjoner: [] }))
    const kilde = { leser: { lesHistorikk }, lager: {}, kanRedigere: true } as never
    api.hentForslag.mockResolvedValueOnce(
      forslaget({
        status: 'under_behandling',
        konflikt: { grunnrevisjon: 3, publisert_revisjon: 4, endret_siden: true, side_endret_siden: false, utkast_endret: true },
      }),
    )
    render(
      <FaginnholdskildeProvider kilde={kilde}>
        <Forslagsside forslag={ID} onLukk={() => {}} />
      </FaginnholdskildeProvider>,
    )
    const merknad = await screen.findByRole('note', { name: 'Innholdet er endret' })
    expect(merknad.textContent).toContain('Forslaget gjelder revisjon 3, og revisjon 4 er publisert nå.')
    expect(merknad.textContent).toContain('Utkastet har endringer som ikke er publisert')
    expect(within(merknad).getByRole('link', { name: 'Se utkastet' })).toBeTruthy()
    await bruker.click(within(merknad).getByRole('button', { name: 'Se hva som er endret' }))
    await waitFor(() => expect(lesHistorikk).toHaveBeenCalledWith(DOSERING))
  })

  it('når bare utkastet er endret, viser merknaden utkastet og ikke en tom sammenligning', async () => {
    const bruker = userEvent.setup()
    const lesHistorikk = vi.fn(async () => ({ hendelser: [], revisjoner: [] }))
    const kilde = { leser: { lesHistorikk }, lager: {}, kanRedigere: true } as never
    const bareUtkast = { grunnrevisjon: 3, publisert_revisjon: 3, endret_siden: false, sideversjon: 7, publisert_sideversjon: 7, side_endret_siden: false, utkast_endret: true }
    api.hentForslag.mockResolvedValueOnce(forslaget({ konflikt: bareUtkast }))
    render(
      <FaginnholdskildeProvider kilde={kilde}>
        <Forslagsside forslag={ID} onLukk={() => {}} />
      </FaginnholdskildeProvider>,
    )
    const merknad = await screen.findByRole('note', { name: 'Innholdet er endret' })
    expect(merknad.textContent).toContain('Det publiserte er som da forslaget ble skrevet.')
    expect(merknad.textContent).toContain('Utkastet har endringer som ikke er publisert, og de vises i redigeringen.')
    // Revisjon 3 mot seg selv ville vist «ingen forskjeller»: ingen slik knapp.
    expect(within(merknad).queryByRole('button', { name: 'Se hva som er endret' })).toBeNull()
    const utkast = within(merknad).getByRole('link', { name: 'Se utkastet' })
    expect(utkast.getAttribute('href')).toBe('#/stoff/citalopram')
    await bruker.click(utkast)
    expect(taRedigeringsonske('citalopram')).toBe(true)
    expect(lesHistorikk).not.toHaveBeenCalled()
    cleanup()
    api.hentForslag.mockResolvedValueOnce(forslaget({ ressurs: REGLER, element: null, konflikt: bareUtkast }))
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    const regler = await screen.findByRole('note', { name: 'Innholdet er endret' })
    expect(within(regler).getByRole('link', { name: 'Se utkastet' }).getAttribute('href')).toBe('#/fortolkning/hbup/rediger')
  })

  it('når bare fagsideversjonen er endret, lenker merknaden til versjonen forslaget ble skrevet mot', async () => {
    const lesHistorikk = vi.fn(async () => ({ hendelser: [], revisjoner: [] }))
    const kilde = { leser: { lesHistorikk }, lager: {}, kanRedigere: true } as never
    api.hentForslag.mockResolvedValueOnce(
      forslaget({
        konflikt: { grunnrevisjon: 3, publisert_revisjon: 3, endret_siden: false, sideversjon: 7, publisert_sideversjon: 8, side_endret_siden: true, utkast_endret: false },
      }),
    )
    render(
      <FaginnholdskildeProvider kilde={kilde}>
        <Forslagsside forslag={ID} onLukk={() => {}} />
      </FaginnholdskildeProvider>,
    )
    const merknad = await screen.findByRole('note', { name: 'Innholdet er endret' })
    expect(merknad.textContent).toContain('Fagsiden er publisert på nytt siden forslaget ble skrevet mot versjon 7; versjon 8 er den gjeldende.')
    expect(merknad.textContent).not.toContain('Forslaget gjelder revisjon')
    expect(within(merknad).queryByRole('button', { name: 'Se hva som er endret' })).toBeNull()
    expect(within(merknad).queryByRole('link', { name: 'Se utkastet' })).toBeNull()
    // Versjonssiden har «Sammenlign med den gjeldende».
    expect(within(merknad).getByRole('link', { name: 'Se fagsiden slik den var (versjon 7)' }).getAttribute('href')).toBe('#/versjon/citalopram/7')
  })

  it('uten historikken for hånden står merknaden uten knappen', async () => {
    api.hentForslag.mockResolvedValueOnce(
      forslaget({ konflikt: { grunnrevisjon: 3, publisert_revisjon: 4, endret_siden: true, side_endret_siden: false, utkast_endret: false } }),
    )
    render(<Forslagsside forslag={ID} onLukk={() => {}} />)
    const merknad = await screen.findByRole('note', { name: 'Innholdet er endret' })
    expect(within(merknad).queryByRole('button')).toBeNull()
  })
})

describe('kontomenyen', () => {
  it('viser «Til behandling» med tallet som venter, bare for behandlerne', async () => {
    const bruker = userEvent.setup()
    const lukk = vi.fn()
    api.kall.mockResolvedValue({ antall: { nye: 2, pagaende: 3, uten_redaktor: 0, mine: 1 } })
    somBehandler(
      <ul>
        <TilbehandlingMenyvalg onGaa={lukk} />
      </ul>,
    )
    const valg = await screen.findByRole('button', { name: 'Til behandling' })
    await waitFor(() => expect(valg.getAttribute('aria-describedby')).toBeTruthy())
    expect(document.getElementById(valg.getAttribute('aria-describedby')!)!.textContent).toBe('3 forslag venter')
    expect(api.kall).toHaveBeenCalledWith('les_forslagsko', { filter: 'antall' })
    await bruker.click(valg)
    expect(lukk).toHaveBeenCalled()
    expect(window.location.hash).toBe('#/forslag/til-behandling')
    cleanup()
    api.kall.mockClear()
    render(
      <ul>
        <TilbehandlingMenyvalg onGaa={lukk} />
      </ul>,
    )
    expect(screen.queryByRole('button', { name: 'Til behandling' })).toBeNull()
    expect(api.kall).not.toHaveBeenCalled()
  })
})
