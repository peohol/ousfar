// @vitest-environment jsdom
/**
 * Gruppene i appen: adressene, gruppesidene i diskusjonene, lesingen av det
 * databasen svarer, oversikten med invitasjonene og siden til én gruppe med
 * handlingene databasen tillater. Kallene er erstattet; det er skjermbildene
 * og reglene i appen som prøves. Tilgangen selv prøves mot databasen i
 * `grupper.test.ts`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { MineGrupper } from '../grupper/modell'

const ID = '0f1e2d3c-4b5a-4968-8776-655443322110'
const ANNEN = '11111111-2222-4333-8444-555555555555'

const MEG: Profil = {
  id: 'meg',
  username: 'anne.a',
  first_name: 'Anne',
  last_name: 'Ansvarlig',
  role: 'user',
  avatar_path: null,
  must_change_password: false,
  onboarding_completed: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const api = vi.hoisted(() => ({
  oversikt: null as unknown,
  hentGruppeoversikt: vi.fn(),
  svarPaaInvitasjon: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'aktiv', rolle: 'medlem' })),
  avsluttGruppemedlemskap: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'avsluttet', rolle: null })),
  settGrupperolle: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'aktiv', rolle: 'moderator' })),
  inviterTilGruppe: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'invitert', rolle: 'medlem' })),
  opprettGruppe: vi.fn(async () => ANNEN),
  arkiverGruppe: vi.fn(async () => undefined),
  endreGruppe: vi.fn(async () => undefined),
}))

vi.mock('../auth/okt', () => ({ useProfil: () => MEG }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../grupper/api', () => api)

const { Grupperside } = await import('../components/grupper/Grupperside')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt, lesMineGrupper } = await import('../grupper/modell')
const { adresse, lesRute, sidesti } = await import('../domain/rute')
const { adresseForSide, diskusjonssideFor, diskusjonssider, lesDiskusjonsside, navnPaaSide, ruteForSide, siderekkevidde } =
  await import('../diskusjoner/modell')

const GRUPPE = { id: ID, navn: 'Lithiumgruppen', beskrivelse: 'Om litium.', art: 'tverrfaglig', status: 'aktiv', fagmiljo: null }

const MINE: MineGrupper = lesMineGrupper({
  grupper: [{ ...GRUPPE, rolle: 'ansvarlig', medlemmer: 2 }],
  invitasjoner: [
    {
      gruppe: { ...GRUPPE, id: ANNEN, navn: 'TDM-gruppen', art: 'fagmiljo', fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' } },
      invitert_kl: '2026-11-14T10:00:00Z',
      invitert_av: { username: 'kari.k', first_name: 'Kari', last_name: 'Kollega' },
    },
  ],
  kan_opprette: { tverrfaglig: false, fagmiljoer: [{ id: 'a', navn: 'OUS Klinisk farmakologi' }] },
})

const medlem = (id: string, fornavn: string, ekstra: Record<string, unknown> = {}) => ({
  id,
  username: `${fornavn.toLowerCase()}.x`,
  first_name: fornavn,
  last_name: 'X',
  avatar_path: null,
  updated_at: '2026-09-01T00:00:00Z',
  rolle: 'medlem',
  status: 'aktiv',
  fra: '2026-11-01T00:00:00Z',
  aktiv_fra: '2026-11-01T00:00:00Z',
  har_tilgang: true,
  kan_fjerne: true,
  kan_endre_rolle: true,
  siste_ansvarlige: false,
  ...ekstra,
})

const OVERSIKT = {
  ...GRUPPE,
  opprettet_kl: '2026-11-01T00:00:00Z',
  rolle: 'ansvarlig',
  kan_styre: true,
  kan_moderere: true,
  kan_forlate: false,
  kan_gjenapne: false,
  medlemmer: [
    medlem('meg', 'Anne', { rolle: 'ansvarlig', kan_fjerne: false, kan_endre_rolle: false, siste_ansvarlige: true }),
    medlem('ola', 'Ola', { har_tilgang: false }),
    medlem('per', 'Per', { status: 'invitert', aktiv_fra: null }),
  ],
}

function vis(gruppe: string | undefined, kilde: MineGrupper = MINE) {
  const oppdater = vi.fn()
  render(
    <GruppekildeProvider verdi={{ ...kilde, oppdater }}>
      <Grupperside gruppe={gruppe} onLukk={() => undefined} />
    </GruppekildeProvider>,
  )
  return { oppdater }
}

beforeEach(() => {
  window.scrollTo = () => undefined
  window.location.hash = ''
  api.hentGruppeoversikt.mockImplementation(async () => lesGruppeoversikt(api.oversikt))
  api.oversikt = OVERSIKT
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('adressene', () => {
  it('leser og skriver oversikten og én gruppe, og bare med en gyldig ID', () => {
    expect(lesRute('#/grupper')).toEqual({ side: 'grupper' })
    expect(lesRute(`#/grupper/${ID.toUpperCase()}/`)).toEqual({ side: 'grupper', gruppe: ID })
    expect(lesRute('#/grupper/ikke-en-id').side).toBe('ukjent')
    expect(adresse({ side: 'grupper', gruppe: ID })).toBe(`#/grupper/${ID}`)
    expect(sidesti({ side: 'grupper' })).toBe('grupper')
    expect(sidesti({ side: 'grupper', gruppe: ID })).toBe(`grupper/${ID}`)
  })

  it('leser og skriver fanene i gruppen, med én idé eller oppgave, uten å bytte side', () => {
    expect(lesRute(`#/grupper/${ID}/ideer`)).toEqual({ side: 'grupper', gruppe: ID, fane: 'ideer' })
    expect(lesRute(`#/grupper/${ID}/IDEER/${ANNEN.toUpperCase()}`)).toEqual({ side: 'grupper', gruppe: ID, fane: 'ideer', element: ANNEN })
    expect(lesRute(`#/grupper/${ID}/oppgaver/${ANNEN}/`)).toEqual({ side: 'grupper', gruppe: ID, fane: 'oppgaver', element: ANNEN })
    expect(lesRute(`#/grupper/${ID}/noe-annet`).side).toBe('ukjent')
    expect(lesRute(`#/grupper/${ID}/ideer/ikke-en-id`).side).toBe('ukjent')
    expect(adresse({ side: 'grupper', gruppe: ID, fane: 'ideer', element: ANNEN })).toBe(`#/grupper/${ID}/ideer/${ANNEN}`)
    expect(adresse({ side: 'grupper', gruppe: ID, fane: 'oppgaver' })).toBe(`#/grupper/${ID}/oppgaver`)
    // Fanene er samme side: diskusjonene i gruppen står, og siden lastes ikke på nytt.
    expect(sidesti({ side: 'grupper', gruppe: ID, fane: 'ideer', element: ANNEN })).toBe(`grupper/${ID}`)
    expect(diskusjonssideFor({ side: 'grupper', gruppe: ID, fane: 'ideer' })).toBe(`gruppe:${ID}`)
  })

  it('gir gruppen sin egen diskusjonsside, som leder tilbake og ikke deler rekkevidde med andre', () => {
    const side = diskusjonssideFor({ side: 'grupper', gruppe: ID })
    expect(side).toBe(`gruppe:${ID}`)
    expect(diskusjonssideFor({ side: 'grupper' })).toBeNull()
    expect(lesDiskusjonsside(`gruppe:${ID}`)).toBe(`gruppe:${ID}`)
    expect(lesDiskusjonsside('gruppe:noe-annet')).toBeNull()
    expect(adresseForSide(`gruppe:${ID}`)).toBe(`#/grupper/${ID}`)
    expect(ruteForSide(`gruppe:${ID}`)).toEqual({ side: 'grupper', gruppe: ID })
    expect(siderekkevidde(`gruppe:${ID}`)).toBe(`gruppe:${ID}`)
    expect(siderekkevidde(`gruppe:${ANNEN}`)).not.toBe(siderekkevidde(`gruppe:${ID}`))
    expect(siderekkevidde('stoff:litium')).toBe('felles')

    const sider = diskusjonssider([], [], [{ id: ID, navn: 'Lithiumgruppen' }])
    expect(navnPaaSide(sider, `gruppe:${ID}`)).toBe('Gruppen Lithiumgruppen')
    expect(navnPaaSide(sider, `gruppe:${ANNEN}`)).toBe('En gruppe')
  })
})

describe('lesingen', () => {
  it('tåler svar uten formen', () => {
    expect(lesMineGrupper(null)).toEqual(INGEN_GRUPPER)
    expect(lesMineGrupper({ grupper: [{ navn: 'uten ID' }, 3], invitasjoner: 'nei' })).toEqual(INGEN_GRUPPER)
    expect(lesGruppeoversikt({ id: ID, medlemmer: [{ id: 'x', rolle: 'sjef', status: 'aktiv' }] })?.medlemmer).toEqual([])
  })
})

describe('oversikten', () => {
  it('viser invitasjonene med hvem som inviterte, og godtar dem', async () => {
    const { oppdater } = vis(undefined)
    const invitasjoner = screen.getByRole('region', { name: 'Invitasjoner' })
    expect(within(invitasjoner).getByText('TDM-gruppen')).toBeTruthy()
    expect(within(invitasjoner).getByText(/OUS Klinisk farmakologi · invitert av Kari Kollega/)).toBeTruthy()

    await userEvent.click(within(invitasjoner).getByRole('button', { name: 'Godta' }))
    expect(api.svarPaaInvitasjon).toHaveBeenCalledWith(ANNEN, true)
    expect(oppdater).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Du er med i TDM-gruppen.')
  })

  it('lenker til gruppene, og oppretter en ny der den innloggede kan', async () => {
    vis(undefined)
    const lenke = within(screen.getByRole('region', { name: 'Gruppene dine' })).getByRole('link', { name: /Lithiumgruppen/ })
    expect(lenke.getAttribute('href')).toBe(`#/grupper/${ID}`)

    const ny = screen.getByRole('region', { name: 'Ny gruppe' })
    // Bare fagmiljøet hen administrerer; ikke «på tvers».
    expect(within(ny).getAllByRole('option').map((o) => o.textContent)).toEqual(['OUS Klinisk farmakologi'])
    await userEvent.type(within(ny).getByLabelText('Navn'), ' Ny gruppe ')
    await userEvent.click(within(ny).getByRole('button', { name: 'Opprett gruppen' }))
    expect(api.opprettGruppe).toHaveBeenCalledWith('Ny gruppe', '', 'a')
    await waitFor(() => expect(window.location.hash).toBe(`#/grupper/${ANNEN}`))
  })

  it('viser ingen skjema for den som ikke kan opprette grupper', () => {
    vis(undefined, INGEN_GRUPPER)
    expect(screen.queryByRole('region', { name: 'Ny gruppe' })).toBeNull()
    expect(screen.getByText(/Du er ikke med i noen grupper ennå/)).toBeTruthy()
  })
})

describe('én gruppe', () => {
  it('viser medlemmene, de inviterte og hvem som er uten tilgang nå', async () => {
    vis(ID)
    const liste = await screen.findByRole('list', { name: 'Medlemmer i Lithiumgruppen' })
    expect(within(liste).getAllByRole('listitem')).toHaveLength(2)
    expect(within(liste).getByText('Uten tilgang nå')).toBeTruthy()
    expect(within(screen.getByRole('list', { name: 'Inviterte til Lithiumgruppen' })).getByText('Per X')).toBeTruthy()
    // Den siste ansvarlige kan ikke gå, og kan ikke endre sin egen rolle.
    expect(screen.getByRole('button', { name: 'Forlat gruppen' })).toHaveProperty('disabled', true)
    expect(screen.queryByLabelText('Rollen til Anne Ansvarlig')).toBeNull()
  })

  it('endrer rollen, og fjerner et medlem først etter bekreftelsen', async () => {
    vis(ID)
    await userEvent.selectOptions(await screen.findByLabelText('Rollen til Ola X'), 'moderator')
    expect(api.settGrupperolle).toHaveBeenCalledWith(ID, 'ola', 'moderator')

    await userEvent.click(screen.getByRole('button', { name: 'Fjern Ola X fra gruppen' }))
    expect(api.avsluttGruppemedlemskap).not.toHaveBeenCalled()
    const bekreft = screen.getByRole('group', { name: 'Fjerne Ola X fra Lithiumgruppen?' })
    expect(bekreft.textContent).toMatch(/mister med en gang tilgangen/)
    await userEvent.click(within(bekreft).getByRole('button', { name: 'Fjern fra gruppen' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'ola')
  })

  it('trekker tilbake en invitasjon og inviterer med brukernavnet', async () => {
    vis(ID)
    await userEvent.click(await screen.findByRole('button', { name: 'Trekk tilbake invitasjonen til Per X' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'per')

    const inviter = screen.getByRole('region', { name: 'Inviter' })
    await userEvent.type(within(inviter).getByLabelText('Brukernavn'), 'kari.k')
    await userEvent.click(within(inviter).getByRole('button', { name: 'Inviter' }))
    expect(api.inviterTilGruppe).toHaveBeenCalledWith(ID, 'kari.k')
    await waitFor(() => expect(within(inviter).getByLabelText('Brukernavn')).toHaveProperty('value', ''))
  })

  it('viser bare det vanlige medlemmer kan gjøre', async () => {
    api.oversikt = {
      ...OVERSIKT,
      rolle: 'medlem',
      kan_styre: false,
      kan_moderere: false,
      kan_forlate: true,
      medlemmer: OVERSIKT.medlemmer.map((m) => ({ ...m, kan_fjerne: false, kan_endre_rolle: false })),
    }
    vis(ID)
    await screen.findByRole('list', { name: 'Medlemmer i Lithiumgruppen' })
    expect(screen.queryByRole('region', { name: 'Inviter' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Arkiver gruppen' })).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()

    await userEvent.click(screen.getByRole('button', { name: 'Forlat gruppen' }))
    await userEvent.click(within(screen.getByRole('group', { name: 'Forlate Lithiumgruppen?' })).getByRole('button', { name: 'Forlat gruppen' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'meg')
    await waitFor(() => expect(window.location.hash).toBe('#/grupper'))
  })

  it('sier fra når gruppen ikke finnes eller ikke kan leses', async () => {
    api.hentGruppeoversikt.mockRejectedValueOnce(new Error('Gruppen finnes ikke, eller du har ikke tilgang til den.'))
    vis(ID)
    expect((await screen.findByRole('alert')).textContent).toBe('Gruppen finnes ikke, eller du har ikke tilgang til den.')
  })
})
