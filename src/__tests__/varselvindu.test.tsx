// @vitest-environment jsdom
/**
 * Bjella og varselvinduet: tallet for uleste i de valgte kategoriene, lista
 * med de nye først, hvor et varsel leder, «Merk som lest» og innstillingene.
 *
 * Økten, endringsloggen og kallene mot databasen er erstattet; det er
 * skjermbildene som prøves.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Endring } from '../domain/versjon'
import type { Endringsloggstatus, Varselliste, Varselvalg } from '../varsler/modell'

function profil(id: string, fornavn: string): Profil {
  return {
    id,
    username: fornavn.toLowerCase(),
    first_name: fornavn,
    last_name: 'Nordmann',
    role: 'user',
    avatar_path: null,
    must_change_password: false,
    onboarding_completed: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  }
}

const KARI = profil('kari', 'Kari')
const OLA = profil('ola', 'Ola')

/** I går, så føringene alltid er innenfor fristen for varsler (`VARSELFRIST_DAGER`), uansett når testen kjøres. */
const I_GAAR = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10)

const endring = (versjon: string, sammendrag: string): Endring => ({
  id: versjon,
  versjon,
  dato: I_GAAR,
  sammendrag,
  typer: ['Funksjonalitet'],
  omfang: 'Mindre omfang',
  punkter: ['Noe'],
  varsleFunksjonsendring: true,
})

const LISTE: Varselliste = {
  lest_kl: '2026-09-29T12:00:00Z',
  varsler: [
    {
      kilde: 'database',
      id: 'v-ide',
      kategori: 'mine_ideer',
      ide: { id: 'i1', tittel: 'Mørk modus', forfatterId: 'kari', gruppe: null },
      hendelser: [{ kl: '2026-09-29T11:00:00Z', av: 'ola', kommentar: 'k1', svarTil: null }],
      oppdatert_kl: '2026-09-29T11:00:00Z',
      lest: false,
      arkivert: false,
    },
    {
      kilde: 'database',
      id: 'v-aktiv',
      kategori: 'aktive_ideer',
      ide: { id: 'i2', tittel: 'Flere kilder', forfatterId: 'ola', gruppe: null },
      hendelser: [{ kl: '2026-09-29T10:00:00Z', av: 'ola', kommentar: 'k2', svarTil: null }],
      oppdatert_kl: '2026-09-29T10:00:00Z',
      lest: false,
      arkivert: false,
    },
    {
      kilde: 'database',
      id: 'v-fortolkning',
      kategori: 'fortolkning',
      ide: null,
      hendelser: [
        {
          kl: '2026-09-28T10:00:00Z',
          av: 'ola',
          objekt: { id: 'o1', type: 'kommentar', navn: 'Uten kode – kommentar', analyttkode: null },
        },
      ],
      oppdatert_kl: '2026-09-28T10:00:00Z',
      lest: true,
      arkivert: false,
    },
    {
      kilde: 'database',
      id: 'v-ny-ide',
      kategori: 'nye_ideer',
      ide: { id: 'i3', tittel: 'Utskrift av svaret', forfatterId: 'ola', gruppe: null },
      hendelser: [{ kl: '2026-09-29T08:00:00Z', av: 'ola' }],
      oppdatert_kl: '2026-09-29T08:00:00Z',
      lest: false,
      arkivert: false,
    },
    {
      kilde: 'database',
      id: 'v-favoritt',
      kategori: 'favoritter',
      ide: null,
      hendelser: [
        { kl: '2026-09-29T09:00:00Z', av: 'ola', side: { id: 's1', navn: 'Litium', stoff: 'litium' }, deler: ['tdm'] },
        { kl: '2026-09-29T09:30:00Z', av: 'ola', side: { id: 's1', navn: 'Litium', stoff: 'litium' }, deler: ['navn', 'dosering'] },
      ],
      oppdatert_kl: '2026-09-29T09:30:00Z',
      lest: false,
      arkivert: false,
    },
  ],
}

const api = vi.hoisted(() => ({
  hentVarsler: vi.fn(),
  hentUleste: vi.fn(),
  merkVarslerLest: vi.fn(async (_ider: readonly string[] | null, _til: string) => {}),
  arkiverVarsler: vi.fn(async (ider: readonly string[], _til: string) => [...ider]),
  gjenopprettVarsler: vi.fn(async (_ider: readonly string[]) => {}),
  hentVarselvalg: vi.fn(),
  lagreVarselvalg: vi.fn(async (_valg: Varselvalg) => {}),
  hentEndringsloggstatus: vi.fn(),
  lagreEndringsloggstatus: vi.fn(async (_status: Endringsloggstatus) => {}),
  lyttEtterOppfrisking: vi.fn(() => () => {}),
}))
const visIde = vi.hoisted(() => vi.fn())
const visEndringslogg = vi.hoisted(() => vi.fn())
const visDiskusjon = vi.hoisted(() => vi.fn())
const gruppevisning = vi.hoisted(() => ({
  visGruppeide: vi.fn((_gruppe: string, _ide: string, _kommentar?: string | null, _valg?: { deretter?: () => void }) => {}),
  visGruppeoppgave: vi.fn((_gruppe: string, _oppgave: string, _gjort?: () => void) => {}),
  visGruppen: vi.fn((_gruppe: string, _gjort?: () => void) => {}),
}))

vi.mock('../varsler/api', () => api)
vi.mock('../auth/okt', () => ({ useProfil: () => KARI }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [KARI, OLA]) }))
vi.mock('../components/ideer/idevisning', () => ({ visIde }))
vi.mock('../components/endringsloggvisning', () => ({ visEndringslogg }))
vi.mock('../components/diskusjoner/diskusjonsvisning', () => ({ visDiskusjon }))
vi.mock('../components/grupper/gruppevisning', () => gruppevisning)
vi.mock('../data/endringslogg', () => ({
  ENDRINGSLOGG: [endring('2.1.0', 'Varsler i toppmenyen'), endring('2.0.0', 'Noe eldre')],
}))

const { Varselknapp } = await import('../components/varsler/Varselknapp')
const { merkEndringerLestIBjella } = await import('../varsler/bjella')
const { RettigheterKilde, lesRettigheter } = await import('../auth/rettigheter')

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  api.hentVarsler.mockResolvedValue(LISTE)
  api.hentUleste.mockResolvedValue({ mine_ideer: 1, aktive_ideer: 1 })
  api.hentVarselvalg.mockResolvedValue({})
  api.hentEndringsloggstatus.mockResolvedValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const bjella = () => screen.getByRole('button', { name: /^Varsler/ })

async function apne() {
  const bruker = userEvent.setup()
  render(<Varselknapp />)
  await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (3 uleste)'))
  await bruker.click(bjella())
  const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
  await within(vindu).findByRole('region', { name: 'Nye' })
  return { bruker, vindu }
}

describe('bjella', () => {
  it('teller de uleste fra databasen og den nyeste føringen, og lagrer der en ny bruker begynner i loggen', async () => {
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (3 uleste)'))
    expect(screen.getByText('3')).toBeTruthy()
    expect(api.lagreEndringsloggstatus).toHaveBeenCalledWith({ fra: '2.0.0', lest: [], arkivert: [] })
  })

  it('merker en føring lest når den er åpnet et annet sted, som på forsiden', async () => {
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (3 uleste)'))
    act(() => merkEndringerLestIBjella(['2.1.0']))
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (2 uleste)'))
    await waitFor(() => expect(api.lagreEndringsloggstatus).toHaveBeenLastCalledWith(expect.not.objectContaining({ fra: '2.0.0', lest: [] })))
  })

  it('teller ikke det brukeren har slått av', async () => {
    api.hentVarselvalg.mockResolvedValue({ aktive_ideer: false, funksjonalitet: false })
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (1 uleste)'))
  })

  it('har ikke noe tall uten uleste', async () => {
    api.hentUleste.mockResolvedValue({})
    api.hentEndringsloggstatus.mockResolvedValue({ fra: '2.1.0', lest: [], arkivert: [] })
    render(<Varselknapp />)
    await waitFor(() => expect(api.hentUleste).toHaveBeenCalled())
    expect(bjella().getAttribute('aria-label')).toBe('Varsler')
  })
})

describe('vinduet', () => {
  it('viser de nye først og de leste under «Tidligere»', async () => {
    const { vindu } = await apne()
    const nye = within(vindu).getByRole('region', { name: 'Nye' })
    expect(within(nye).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Varsler i toppmenyen'),
      expect.stringContaining('Ola Nordmann kommenterte idéen din'),
      expect.stringContaining('Ola Nordmann kommenterte en idé du har kommentert'),
    ])
    const tidligere = within(vindu).getByRole('region', { name: 'Tidligere' })
    expect(within(tidligere).getByText('Fortolkningen er endret')).toBeTruthy()
    expect(within(tidligere).getByText('Kommentaren «Uten kode – kommentar»')).toBeTruthy()
  })

  it('åpner idéen og merker varselet lest', async () => {
    const { bruker, vindu } = await apne()
    await bruker.click(within(vindu).getByRole('button', { name: 'Ola Nordmann kommenterte idéen din' }))
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-ide'], LISTE.lest_kl)
    expect(visIde).toHaveBeenCalledWith({ id: 'i1' })
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('åpner føringen i endringsloggen og husker at den er lest', async () => {
    const { bruker, vindu } = await apne()
    await bruker.click(within(vindu).getByRole('button', { name: 'Varsler i toppmenyen' }))
    expect(visEndringslogg).toHaveBeenCalledWith('2.1.0')
    expect(api.lagreEndringsloggstatus).toHaveBeenLastCalledWith({ fra: '2.0.0', lest: ['2.1.0'], arkivert: [] })
  })

  it('merker ett eller alle lest', async () => {
    const { bruker, vindu } = await apne()
    const aktiv = within(vindu).getByText(/kommenterte en idé du har kommentert/).closest('li')!
    await bruker.click(within(aktiv).getByRole('button', { name: 'Merk som lest' }))
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-aktiv'], LISTE.lest_kl)
    expect(within(within(vindu).getByRole('region', { name: 'Tidligere' })).getByText(/kommenterte en idé du har kommentert/)).toBeTruthy()

    await bruker.click(within(vindu).getByRole('button', { name: 'Merk alle som lest' }))
    // Bare det brukeren ser: favorittene er av og står urørt.
    expect(api.merkVarslerLest).toHaveBeenLastCalledWith(['v-ide'], LISTE.lest_kl)
    expect(api.lagreEndringsloggstatus).toHaveBeenLastCalledWith({ fra: '2.0.0', lest: ['2.1.0'], arkivert: [] })
    expect(within(vindu).queryByRole('region', { name: 'Nye' })).toBeNull()
    expect((within(vindu).getByRole('button', { name: 'Merk alle som lest' }) as HTMLButtonElement).disabled).toBe(true)
  })

  it('arkiverer ett eller alle leste, og henter dem fram fra arkivet', async () => {
    const { bruker, vindu } = await apne()
    const tidligere = () => within(vindu).getByRole('region', { name: 'Tidligere' })
    const arkivet = () => within(vindu).getByRole('button', { name: /^Arkivet/ })

    // Et ulest varsel arkiveres og er dermed lest.
    const aktiv = within(vindu).getByText(/kommenterte en idé du har kommentert/).closest('li')!
    await bruker.click(within(aktiv).getByRole('button', { name: 'Arkiver' }))
    expect(api.arkiverVarsler).toHaveBeenCalledWith(['v-aktiv'], LISTE.lest_kl)
    expect(within(within(vindu).getByRole('region', { name: 'Nye' })).queryByText(/kommenterte en idé du har kommentert/)).toBeNull()
    expect(within(within(vindu).getByRole('region', { name: 'Arkivet' })).getByText(/kommenterte en idé du har kommentert/)).toBeTruthy()
    expect(arkivet().textContent).toContain('1')

    await bruker.click(within(tidligere()).getByRole('button', { name: 'Arkiver alle' }))
    expect(api.arkiverVarsler).toHaveBeenLastCalledWith(['v-fortolkning'], LISTE.lest_kl)
    expect(within(vindu).queryByRole('region', { name: 'Tidligere' })).toBeNull()
    expect(arkivet().textContent).toContain('2')

    // Føringen i endringsloggen arkiveres i brukerinnstillingene.
    const foring = within(vindu).getByRole('button', { name: 'Varsler i toppmenyen' }).closest('li')!
    await bruker.click(within(foring).getByRole('button', { name: 'Arkiver' }))
    expect(api.lagreEndringsloggstatus).toHaveBeenLastCalledWith({ fra: '2.0.0', lest: ['2.1.0'], arkivert: ['2.1.0'] })

    await bruker.click(arkivet())
    expect(arkivet().getAttribute('aria-expanded')).toBe('true')
    const fortolkning = within(vindu).getByText('Fortolkningen er endret').closest('li')!
    await bruker.click(within(fortolkning).getByRole('button', { name: 'Hent fram fra arkivet' }))
    expect(api.gjenopprettVarsler).toHaveBeenCalledWith(['v-fortolkning'])
    expect(within(tidligere()).getByText('Fortolkningen er endret')).toBeTruthy()
  })

  it('henter lista på nytt når et varsel har fått noe nytt og ikke ble arkivert', async () => {
    api.arkiverVarsler.mockResolvedValueOnce([])
    const { bruker, vindu } = await apne()
    const aktiv = within(vindu).getByText(/kommenterte en idé du har kommentert/).closest('li')!
    await bruker.click(within(aktiv).getByRole('button', { name: 'Arkiver' }))
    await waitFor(() => expect(api.hentVarsler).toHaveBeenCalledTimes(2))
    expect(within(within(vindu).getByRole('region', { name: 'Nye' })).getByText(/kommenterte en idé du har kommentert/)).toBeTruthy()
  })

  it('viser endringene på favorittsidene når brukeren har slått dem på, og leder til siden', async () => {
    api.hentVarselvalg.mockResolvedValue({ favoritter: true })
    api.hentUleste.mockResolvedValue({ mine_ideer: 1, aktive_ideer: 1, favoritter: 1 })
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (4 uleste)'))
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const lenke = await within(vindu).findByRole('link', { name: 'Ola Nordmann endret Litium' })
    expect(lenke.getAttribute('href')).toBe('#/stoff/litium/dosering')
    expect(lenke.closest('li')!.textContent).toContain('Navnet, Dosering og Terapeutisk legemiddelmonitorering (TDM)')
    lenke.addEventListener('click', (e) => e.preventDefault())
    await bruker.click(lenke)
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-favoritt'], LISTE.lest_kl)
  })

  it('leder et varsel om en kommentar i en diskusjon til siden tråden står på, og åpner tråden', async () => {
    const traad: Varselliste['varsler'][number] = {
      kilde: 'database',
      id: 'v-diskusjon',
      kategori: 'mine_diskusjoner',
      ide: null,
      diskusjon: { id: 't1', tittel: 'Dosering ved nyresvikt', side: 'fortolkning:hbup', forfatterId: 'kari' },
      hendelser: [{ kl: '2026-09-29T11:30:00Z', av: 'ola', kommentar: 'k9', svarTil: null }],
      oppdatert_kl: '2026-09-29T11:30:00Z',
      lest: false,
      arkivert: false,
    }
    api.hentVarsler.mockResolvedValue({ ...LISTE, varsler: [traad, ...LISTE.varsler] })
    api.hentUleste.mockResolvedValue({ mine_ideer: 1, aktive_ideer: 1, mine_diskusjoner: 1 })
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (4 uleste)'))
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const lenke = await within(vindu).findByRole('link', { name: 'Ola Nordmann kommenterte tråden din' })
    expect(lenke.getAttribute('href')).toBe('#/fortolkning/hbup')
    expect(lenke.closest('li')!.textContent).toContain('«Dosering ved nyresvikt»')
    lenke.addEventListener('click', (e) => e.preventDefault())
    await bruker.click(lenke)
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-diskusjon'], LISTE.lest_kl)
    expect(visDiskusjon).toHaveBeenCalledWith('fortolkning:hbup', 't1')
  })

  it('viser nye idéer når brukeren har slått dem på, og leder til idéen', async () => {
    api.hentVarselvalg.mockResolvedValue({ nye_ideer: true })
    api.hentUleste.mockResolvedValue({ mine_ideer: 1, aktive_ideer: 1, nye_ideer: 1 })
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (4 uleste)'))
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const knapp = await within(vindu).findByRole('button', { name: 'Ola Nordmann skrev en ny idé' })
    expect(knapp.closest('li')!.textContent).toContain('«Utskrift av svaret»')
    await bruker.click(knapp)
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-ny-ide'], LISTE.lest_kl)
    expect(visIde).toHaveBeenCalledWith({ id: 'i3' })
  })

  it('lar brukeren slå av og på de valgfrie kategoriene, men ikke de obligatoriske', async () => {
    const { bruker, vindu } = await apne()
    await bruker.click(within(vindu).getByRole('button', { name: 'Varselinnstillinger' }))
    const innstillinger = await screen.findByRole('dialog', { name: 'Varselinnstillinger' })
    const grupper = within(innstillinger).getAllByRole('region')
    const tilstand = (b: HTMLInputElement) => [b.closest('label')!.querySelector('.varselinnstilling__tittel')!.textContent, b.checked, b.disabled]
    expect(
      grupper.map((g) => [
        within(g).getByRole('heading').textContent,
        (within(g).getAllByRole('switch') as HTMLInputElement[]).map(tilstand),
      ]),
    ).toEqual([
      ['Faglige varsler', [
          ['Endringer i fortolkningen', true, true],
          ['Kritiske faglige sikkerhetsmeldinger', true, true],
        ]],
      [
        'Idéer',
        [
          ['Kommentarer til mine idéer og kommentarer', true, true],
          ['Kommentarer til idéer jeg har vært aktiv i', true, false],
          ['Nye idéer', false, false],
        ],
      ],
      [
        'Diskusjoner',
        [
          ['Kommentarer i mine diskusjoner', true, true],
          ['Kommentarer i diskusjoner jeg har vært aktiv i', true, false],
        ],
      ],
      [
        'Grupper',
        [
          ['Nye idéer i gruppene mine', true, false],
          ['Oppgaver og idéene mine i gruppene', true, false],
        ],
      ],
      // Gruppechatten er avslått: innstillingen for den vises ikke (se
      // gruppechat.varselvisning.test.tsx). Forslag til behandling vises bare for dem som kan behandle forslag.
      ['Endringsforslag', [['Mine endringsforslag', true, true]]],
      [
        'Favorittsider',
        [
          ['Endringer på mine favorittsider', false, false],
          ['Nye diskusjoner på mine favorittsider', false, false],
        ],
      ],
      ['Appen', [['Vesentlige kliniske funksjonsendringer', true, false]]],
    ])
    const brytere = within(innstillinger).getAllByRole('switch') as HTMLInputElement[]
    await bruker.click(brytere[3]!)
    expect(api.lagreVarselvalg).toHaveBeenCalledWith({ aktive_ideer: false })
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (2 uleste)'))

    await bruker.click(within(innstillinger).getByRole('button', { name: 'Tilbake til varslene' }))
    const nye = within(await screen.findByRole('dialog', { name: 'Varsler' })).getByRole('region', { name: 'Nye' })
    expect(within(nye).queryByText(/kommenterte en idé du har kommentert/)).toBeNull()
  })
})

describe('gruppene', () => {
  const gruppe = { id: 'g1', navn: 'Lithiumgruppen' }
  const oppgave = { id: 'o1', tittel: 'Skriv sjekklisten', gruppe }
  const varsel = (id: string, kategori: 'gruppeideer' | 'gruppeoppgaver' | 'mine_ideer', ide: unknown, hendelse: Record<string, unknown>) => ({
    kilde: 'database' as const,
    id,
    kategori,
    ide,
    hendelser: [{ kl: '2026-09-29T11:30:00Z', av: 'ola', ...hendelse }],
    oppdatert_kl: '2026-09-29T11:30:00Z',
    lest: false,
    arkivert: false,
  })

  it('leder idéene og oppgavene i en gruppe til gruppesiden, med gruppens navn', async () => {
    const gruppeide = { id: 'gi1', tittel: 'Felles rutine', forfatterId: 'kari', gruppe }
    api.hentVarsler.mockResolvedValue({
      lest_kl: LISTE.lest_kl,
      varsler: [
        varsel('v-tildelt', 'gruppeoppgaver', null, { art: 'tildelt', gruppeoppgave: oppgave }),
        varsel('v-gjort', 'gruppeoppgaver', gruppeide, { art: 'gjort_om', gruppeoppgave: oppgave }),
        varsel('v-kommentar', 'mine_ideer', gruppeide, { kommentar: 'k1', svarTil: null }),
      ],
    })
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const tildelt = await within(vindu).findByRole('button', { name: 'Ola Nordmann ga deg en oppgave' })
    expect(tildelt.closest('li')!.textContent).toContain('«Skriv sjekklisten» · Lithiumgruppen')
    await bruker.click(tildelt)
    expect(gruppevisning.visGruppeoppgave).toHaveBeenCalledWith('g1', 'o1', expect.any(Function))

    await bruker.click(bjella())
    const igjen = await screen.findByRole('dialog', { name: 'Varsler' })
    await bruker.click(await within(igjen).findByRole('button', { name: 'Ola Nordmann gjorde idéen din om til en oppgave' }))
    expect(gruppevisning.visGruppeide).toHaveBeenCalledWith('g1', 'gi1', null, { deretter: expect.any(Function) })

    await bruker.click(bjella())
    const tredje = await screen.findByRole('dialog', { name: 'Varsler' })
    const kommentar = await within(tredje).findByRole('button', { name: 'Ola Nordmann kommenterte idéen din' })
    expect(kommentar.closest('li')!.textContent).toContain('Lithiumgruppen')
    await bruker.click(kommentar)
    expect(gruppevisning.visGruppeide).toHaveBeenLastCalledWith('g1', 'gi1', null, { deretter: expect.any(Function) })
    expect(visIde).not.toHaveBeenCalled()
  })

  it('merker et gruppevarsel lest først når brukeren går dit, ikke når et ulagret skjema blir stående', async () => {
    const gruppeide = { id: 'gi1', tittel: 'Felles rutine', forfatterId: 'kari', gruppe }
    api.hentVarsler.mockResolvedValue({
      lest_kl: LISTE.lest_kl,
      varsler: [
        varsel('v-tildelt', 'gruppeoppgaver', null, { art: 'tildelt', gruppeoppgave: oppgave }),
        varsel('v-kommentar', 'mine_ideer', gruppeide, { kommentar: 'k1', svarTil: null }),
      ],
    })
    // Skjemavakten på gruppesiden: brukeren blir i skjemaet («Fortsett å redigere»), så veien blir ikke gått.
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await bruker.click(bjella())
    let vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    await bruker.click(await within(vindu).findByRole('button', { name: 'Ola Nordmann ga deg en oppgave' }))
    expect(gruppevisning.visGruppeoppgave).toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: 'Varsler' })).toBeNull()
    await bruker.click(bjella())
    vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    await bruker.click(await within(vindu).findByRole('button', { name: 'Ola Nordmann kommenterte idéen din' }))
    expect(gruppevisning.visGruppeide).toHaveBeenCalled()
    expect(api.merkVarslerLest).not.toHaveBeenCalled()

    // Begge står fortsatt som nye. Brukeren forkaster endringene, og veien blir gått: først da er varselet lest.
    gruppevisning.visGruppeoppgave.mockImplementationOnce((_gruppe, _oppgave, gjort) => gjort?.())
    await bruker.click(bjella())
    vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const nye = within(vindu).getByRole('region', { name: 'Nye' })
    expect(within(nye).getByRole('button', { name: 'Ola Nordmann kommenterte idéen din' })).toBeTruthy()
    await bruker.click(within(nye).getByRole('button', { name: 'Ola Nordmann ga deg en oppgave' }))
    await waitFor(() => expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-tildelt'], LISTE.lest_kl))
    expect(api.merkVarslerLest).toHaveBeenCalledTimes(1)
  })
})

describe('endringsforslagene', () => {
  const forslagsvarsel = (id: string, kategori: 'mine_forslag' | 'forslag_til_behandling', art: string, ressurs: { type: string; navn: string }) => ({
    kilde: 'database' as const,
    id,
    kategori,
    ide: null,
    hendelser: [{ kl: '2026-09-29T11:30:00Z', av: 'ola', art, forslag: { id: `f-${id}`, ressurs: { ...ressurs, analyttkode: null } } }],
    oppdatert_kl: '2026-09-29T11:30:00Z',
    lest: false,
    arkivert: false,
  })

  it('sier hva som skjedde med forslaget, og lenker til det', async () => {
    api.hentVarsler.mockResolvedValue({
      lest_kl: LISTE.lest_kl,
      varsler: [
        forslagsvarsel('v-mitt', 'mine_forslag', 'godkjent', { type: 'infoside', navn: 'Litium' }),
        forslagsvarsel('v-nytt', 'forslag_til_behandling', 'opprettet', { type: 'intervallregelsett', navn: 'AMIS' }),
      ],
    })
    const bruker = userEvent.setup()
    render(<Varselknapp />)
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    const mitt = await within(vindu).findByRole('link', { name: 'Ola Nordmann godkjente forslaget ditt' })
    expect(mitt.getAttribute('href')).toBe('#/forslag/f-v-mitt')
    expect(within(mitt.closest('li')!).getByText('Litium')).toBeTruthy()
    const nytt = within(vindu).getByRole('link', { name: 'Ola Nordmann foreslo en endring' })
    expect(within(nytt.closest('li')!).getByText('Reglene for AMIS')).toBeTruthy()
    await bruker.click(mitt)
    expect(api.merkVarslerLest).toHaveBeenCalledWith(['v-mitt'], LISTE.lest_kl)
  })

  /** Innstillingene for den som har rettighetene i svaret fra `mine_rettigheter`, med bryterne i «Endringsforslag». */
  async function forslagsinnstillinger(svar: Record<string, unknown>) {
    const bruker = userEvent.setup()
    render(
      <RettigheterKilde verdi={lesRettigheter(svar)}>
        <Varselknapp />
      </RettigheterKilde>,
    )
    await waitFor(() => expect(bjella().getAttribute('aria-label')).toBe('Varsler (3 uleste)'))
    await bruker.click(bjella())
    const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
    await bruker.click(within(vindu).getByRole('button', { name: 'Varselinnstillinger' }))
    const innstillinger = await screen.findByRole('dialog', { name: 'Varselinnstillinger' })
    const gruppe = within(innstillinger).getByRole('region', { name: 'Endringsforslag' })
    const brytere = within(gruppe).getAllByRole('switch') as HTMLInputElement[]
    const tilstand = brytere.map((b) => [b.closest('label')!.querySelector('.varselinnstilling__tittel')!.textContent, b.checked, b.disabled])
    return { bruker, brytere, tilstand }
  }

  const KF = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi' }

  it.each([
    ['en redaktør uten administratorrolle', { behandler_forslag: true }],
    ['en lokal administrator', { administrerer: [KF], behandler_forslag: true }],
    ['en systemarkitekt', { systemarkitekt: true, behandler_forslag: true }],
    ['en lokal administrator når databasen ikke svarer med feltet', { administrerer: [KF] }],
  ])('viser «Forslag til behandling» i innstillingene for %s, som kan slå den av', async (_hvem, svar) => {
    const { bruker, brytere, tilstand } = await forslagsinnstillinger(svar)
    expect(tilstand).toEqual([
      ['Mine endringsforslag', true, true],
      ['Forslag til behandling', true, false],
    ])
    await bruker.click(brytere[1]!)
    expect(api.lagreVarselvalg).toHaveBeenCalledWith({ forslag_til_behandling: false })
  })

  it.each([
    ['en vanlig bruker', { mine_fagmiljoer: [KF], behandler_forslag: false }],
    ['en vanlig bruker når databasen ikke svarer med feltet', { mine_fagmiljoer: [KF] }],
  ])('viser ikke «Forslag til behandling» for %s', async (_hvem, svar) => {
    const { tilstand } = await forslagsinnstillinger(svar)
    expect(tilstand).toEqual([['Mine endringsforslag', true, true]])
  })
})
