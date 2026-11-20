// @vitest-environment jsdom
/**
 * Gruppene i appen: adressene, gruppesidene i diskusjonene, lesingen av det
 * databasen svarer, oversikten med invitasjonene, søket og modalen for en ny
 * gruppe, og gruppesiden uten faner med medlemmene og innstillingene i
 * modaler og bare handlingene databasen tillater. Kallene er erstattet; det
 * er skjermbildene og reglene i appen som prøves. Tilgangen selv prøves mot
 * databasen i `grupper.test.ts`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
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
  hentGruppeaktivitet: vi.fn(),
  svarPaaInvitasjon: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'aktiv', rolle: 'medlem' })),
  avsluttGruppemedlemskap: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'avsluttet', rolle: null })),
  settGrupperolle: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'aktiv', rolle: 'moderator' })),
  inviterTilGruppe: vi.fn(async () => ({ gruppe: '', bruker: '', status: 'invitert', rolle: 'medlem' })),
  opprettGruppe: vi.fn(async () => ANNEN),
  arkiverGruppe: vi.fn(async () => undefined),
  endreGruppe: vi.fn(async () => undefined),
  settGruppesymbol: vi.fn(async () => ({ emoji: '🧪' })),
}))

vi.mock('../auth/okt', () => ({ useProfil: () => MEG }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../grupper/api', () => api)
// Personsøket: hvem som kan inviteres, per gruppe.
const kandidater = vi.hoisted(() => ({
  sok: vi.fn(async (_sok: string) => [
    { id: 'kari', username: 'kari.k', first_name: 'Kari', last_name: 'Kandidat', avatar_path: null, stilling: 'Lege', fagmiljo: 'OUS Klinisk farmakologi' },
  ]),
}))
vi.mock('../personsok/api', () => ({ gruppekandidater: () => kandidater.sok }))

const { Grupperside, sokIGrupper } = await import('../components/grupper/Grupperside')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt, lesMineGrupper } = await import('../grupper/modell')
const { adresse, lesRute, sidesti } = await import('../domain/rute')
const { lesGruppeaktivitet, tilHendelse } = await import('../grupper/aktivitet')
const { lyttEtterChatbeskjed } = await import('../components/chat/chatstyring')
const { adresseForSide, diskusjonssideFor, diskusjonssider, lesDiskusjonsside, navnPaaSide, ruteForSide, siderekkevidde } =
  await import('../diskusjoner/modell')

const GRUPPE = { id: ID, navn: 'Lithiumgruppen', beskrivelse: 'Om litium.', art: 'tverrfaglig', status: 'aktiv', fagmiljo: null }

const ARKIVERT = '22222222-3333-4444-8555-666666666666'

const MINE: MineGrupper = lesMineGrupper({
  grupper: [
    { ...GRUPPE, rolle: 'ansvarlig', medlemmer: 2 },
    { ...GRUPPE, id: ARKIVERT, navn: 'Gammel gruppe', status: 'arkivert', rolle: null, medlemmer: 1 },
  ],
  invitasjoner: [
    {
      gruppe: { ...GRUPPE, id: ANNEN, navn: 'TDM-gruppen', art: 'fagmiljo', fagmiljo: { id: 'a', navn: 'OUS Klinisk farmakologi' }, symbol: { emoji: '💊' } },
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
  window.scrollTo = () => undefined
  window.history.replaceState(null, '', '#/')
  api.hentGruppeoversikt.mockImplementation(async () => lesGruppeoversikt(api.oversikt))
  api.hentGruppeaktivitet.mockImplementation(async () => [])
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
  it('viser invitasjonene øverst med hvem som inviterte, og godtar dem', async () => {
    const { oppdater } = vis(undefined)
    const invitasjoner = screen.getByRole('region', { name: 'Invitasjoner' })
    expect(invitasjoner.textContent).toMatch(/Kari Kollega har invitert deg til TDM-gruppen\./)
    expect(within(invitasjoner).getByText('OUS Klinisk farmakologi')).toBeTruthy()
    // Gruppens symbol står ved invitasjonen, som i gruppelista.
    expect(invitasjoner.querySelector('.gruppesymbol')?.textContent).toBe('💊')

    await userEvent.click(within(invitasjoner).getByRole('button', { name: 'Godta invitasjonen til TDM-gruppen' }))
    expect(api.svarPaaInvitasjon).toHaveBeenCalledWith(ANNEN, true)
    expect(oppdater).toHaveBeenCalled()
    expect(await screen.findByRole('status')).toHaveProperty('textContent', 'Du er med i TDM-gruppen.')
  })

  it('har en kompakt liste med lenker, rollen, de arkiverte for seg, og søk', async () => {
    vis(undefined)
    const aktive = screen.getByRole('region', { name: 'Gruppene dine' })
    const lenke = within(aktive).getByRole('link', { name: /Lithiumgruppen/ })
    expect(lenke.getAttribute('href')).toBe(`#/grupper/${ID}`)
    expect(lenke.textContent).toMatch(/På tvers av fagmiljøene · 2 medlemmer · Ansvarlig/)
    const arkiverte = screen.getByRole('region', { name: 'Arkiverte' })
    // Systemarkitekten som leser en gruppe uten å være med i den.
    expect(within(arkiverte).getByRole('link', { name: /Gammel gruppe/ }).textContent).toMatch(/Ikke medlem.*Arkivert/)

    await userEvent.type(screen.getByLabelText('Søk i gruppene'), 'lith')
    expect(within(aktive).getAllByRole('link')).toHaveLength(1)
    expect(screen.queryByRole('region', { name: 'Arkiverte' })).toBeNull()
    expect(sokIGrupper(MINE.grupper, 'farmakologi tvers').map((g) => g.navn)).toEqual([])
    expect(sokIGrupper(MINE.grupper, 'tvers gammel').map((g) => g.navn)).toEqual(['Gammel gruppe'])
  })

  it('oppretter en ny gruppe i en modal, ikke et skjema nederst på siden', async () => {
    vis(undefined)
    expect(screen.queryByLabelText('Navn')).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Opprett gruppe' }))
    const modal = screen.getByRole('dialog', { name: 'Opprett gruppe' })
    // Bare fagmiljøet hen administrerer; ikke «på tvers».
    expect(within(modal).getAllByRole('radio').map((r) => r.closest('label')?.textContent)).toEqual(['Bare OUS Klinisk farmakologiLokal gruppe'])
    await userEvent.type(within(modal).getByLabelText('Navn'), ' Ny gruppe ')
    await userEvent.click(within(modal).getByRole('button', { name: 'Opprett gruppe' }))
    expect(api.opprettGruppe).toHaveBeenCalledWith('Ny gruppe', '', 'a')
    await waitFor(() => expect(window.location.hash).toBe(`#/grupper/${ANNEN}`))
    expect(screen.queryByRole('dialog', { name: 'Opprett gruppe' })).toBeNull()
  })

  it('har ingen knapp for en ny gruppe for den som ikke kan opprette, og en rolig tomtilstand', () => {
    vis(undefined, INGEN_GRUPPER)
    expect(screen.queryByRole('button', { name: 'Opprett gruppe' })).toBeNull()
    expect(screen.getByText('Du er ikke med i noen grupper ennå.')).toBeTruthy()
    expect(screen.queryByLabelText('Søk i gruppene')).toBeNull()
  })
})

/** Åpner modalen med medlemmene og gir den. */
async function medlemmene() {
  await userEvent.click(await screen.findByRole('button', { name: /2 medlemmer · Vis medlemmer/ }))
  return screen.getByRole('dialog', { name: 'Medlemmer' })
}

/** Åpner gruppeinnstillingene og gir dem. */
async function innstillingene() {
  await userEvent.click(await screen.findByRole('button', { name: 'Gruppeinnstillinger' }))
  return screen.getByRole('dialog', { name: 'Gruppeinnstillinger' })
}

describe('én gruppe', () => {
  it('har ingen faner, men overskriften, beskrivelsen, medlemslinjen og panelene', async () => {
    api.oversikt = { ...OVERSIKT, samhandling: { nye_ideer: 1, venter: 3, mine_oppgaver: 2, chat_uleste: null } }
    vis(ID)
    expect(await screen.findByRole('heading', { level: 1, name: 'Lithiumgruppen' })).toBeTruthy()
    expect(screen.getByText('Om litium.')).toBeTruthy()
    expect(screen.queryByRole('navigation', { name: 'I gruppen' })).toBeNull()
    expect(screen.getByRole('button', { name: /2 medlemmer · Vis medlemmer/ })).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Idéer' }).textContent).toMatch(/3 åpne · 1 ny/)
    const oppgaver = screen.getByRole('region', { name: 'Oppgaver' })
    expect(oppgaver.textContent).toMatch(/2 tildelt deg/)
    expect(within(oppgaver).getByRole('link', { name: 'Åpne oppgaver' }).getAttribute('href')).toBe(`#/grupper/${ID}/oppgaver`)
    // Medlemslista og administrasjonen står ikke på siden, men i modalene.
    expect(screen.queryByRole('list', { name: 'Medlemmer i Lithiumgruppen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Arkiver gruppen' })).toBeNull()
  })

  it('viser medlemmene, de inviterte og hvem som er uten tilgang nå, i modalen', async () => {
    vis(ID)
    const modal = await medlemmene()
    const liste = within(modal).getByRole('list', { name: 'Medlemmer i Lithiumgruppen' })
    expect(within(liste).getAllByRole('listitem')).toHaveLength(2)
    expect(within(liste).getByText('Uten tilgang nå')).toBeTruthy()
    expect(within(within(modal).getByRole('list', { name: 'Inviterte til Lithiumgruppen' })).getByText('Per X')).toBeTruthy()
    // Den siste ansvarlige kan ikke endre sin egen rolle.
    expect(within(modal).queryByLabelText('Rollen til Anne Ansvarlig')).toBeNull()
  })

  it('endrer rollen, og fjerner et medlem først etter bekreftelsen', async () => {
    vis(ID)
    const modal = await medlemmene()
    await userEvent.selectOptions(within(modal).getByLabelText('Rollen til Ola X'), 'moderator')
    expect(api.settGrupperolle).toHaveBeenCalledWith(ID, 'ola', 'moderator')

    await userEvent.click(within(modal).getByRole('button', { name: 'Fjern Ola X fra gruppen' }))
    expect(api.avsluttGruppemedlemskap).not.toHaveBeenCalled()
    const bekreft = within(modal).getByRole('group', { name: 'Fjerne Ola X fra Lithiumgruppen?' })
    expect(bekreft.textContent).toMatch(/mister med en gang tilgangen/)
    await userEvent.click(within(bekreft).getByRole('button', { name: 'Fjern fra gruppen' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'ola')
  })

  it('trekker tilbake en invitasjon, og inviterer med personsøket eller det nøyaktige brukernavnet', async () => {
    vis(ID)
    const modal = await medlemmene()
    await userEvent.click(within(modal).getByRole('button', { name: 'Trekk tilbake invitasjonen til Per X' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'per')

    const inviter = within(modal).getByRole('region', { name: 'Inviter' })
    const felt = within(inviter).getByRole('combobox', { name: 'Inviter' })
    // Navnet, ikke brukernavnet; treffet viser brukernavnet, stillingen og fagmiljøet.
    await userEvent.type(felt, 'kari')
    const treff = await within(inviter).findByRole('option', { name: /Kari Kandidat/ })
    expect(kandidater.sok).toHaveBeenLastCalledWith('kari')
    expect(treff.textContent).toMatch('@kari.k · Lege · OUS Klinisk farmakologi')
    await userEvent.keyboard('{Enter}')
    expect(api.inviterTilGruppe).toHaveBeenLastCalledWith(ID, 'kari.k')
    expect(await within(modal).findByText('Kari Kandidat er invitert.')).toBeTruthy()
    await waitFor(() => expect(felt).toHaveProperty('value', ''))

    // En hen ikke ser, inviteres med det nøyaktige brukernavnet, som før.
    kandidater.sok.mockResolvedValueOnce([])
    await userEvent.type(felt, 'Ola.U')
    await userEvent.click(await within(inviter).findByRole('option', { name: /Bruk brukernavnet «ola\.u»/ }))
    expect(api.inviterTilGruppe).toHaveBeenLastCalledWith(ID, 'ola.u')
    expect(await within(modal).findByText('ola.u er invitert.')).toBeTruthy()
  })

  it('lar den siste ansvarlige endre og arkivere, men ikke forlate gruppen', async () => {
    vis(ID)
    const modal = await innstillingene()
    expect(within(modal).getByRole('button', { name: 'Forlat gruppen' })).toHaveProperty('disabled', true)
    expect(modal.textContent).toMatch(/Du er den siste ansvarlige/)
    const navn = within(modal).getByLabelText('Navn')
    await userEvent.clear(navn)
    await userEvent.type(navn, 'Litiumgruppen')
    await userEvent.click(within(modal).getByRole('button', { name: 'Lagre' }))
    expect(api.endreGruppe).toHaveBeenCalledWith(ID, 'Litiumgruppen', 'Om litium.')

    await userEvent.click(within(modal).getByRole('button', { name: 'Arkiver gruppen' }))
    expect(api.arkiverGruppe).not.toHaveBeenCalled()
    await userEvent.click(within(within(modal).getByRole('group', { name: 'Arkivere Lithiumgruppen?' })).getByRole('button', { name: 'Arkiver gruppen' }))
    expect(api.arkiverGruppe).toHaveBeenCalledWith(ID, true)
  })

  it('velger symbolet: tekst avvises, og feilen forsvinner når en emoji velges', async () => {
    vis(ID)
    const modal = await innstillingene()
    const symbol = within(modal).getByRole('region', { name: 'Symbol' })
    await userEvent.type(within(symbol).getByLabelText('Annen emoji'), 'abc')
    await userEvent.click(within(symbol).getByRole('button', { name: 'Bruk' }))
    expect(within(symbol).getByRole('alert').textContent).toBe('Skriv inn én emoji.')
    expect(api.settGruppesymbol).not.toHaveBeenCalled()
    await userEvent.click(within(symbol).getByRole('button', { name: '🧪' }))
    expect(api.settGruppesymbol).toHaveBeenCalledWith(ID, { emoji: '🧪' })
    expect(within(symbol).queryByRole('alert')).toBeNull()
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
    const modal = await medlemmene()
    expect(within(modal).queryByRole('form', { name: 'Inviter' })).toBeNull()
    expect(within(modal).queryByRole('combobox')).toBeNull()
    expect(within(modal).queryByRole('button', { name: /Fjern/ })).toBeNull()
    await userEvent.click(within(modal).getByRole('button', { name: 'Lukk medlemmene' }))

    const innstillinger = await innstillingene()
    expect(within(innstillinger).queryByLabelText('Navn')).toBeNull()
    expect(within(innstillinger).queryByRole('button', { name: 'Arkiver gruppen' })).toBeNull()
    await userEvent.click(within(innstillinger).getByRole('button', { name: 'Forlat gruppen' }))
    await userEvent.click(within(within(innstillinger).getByRole('group', { name: 'Forlate Lithiumgruppen?' })).getByRole('button', { name: 'Forlat gruppen' }))
    expect(api.avsluttGruppemedlemskap).toHaveBeenCalledWith(ID, 'meg')
    await waitFor(() => expect(window.location.hash).toBe('#/grupper'))
  })

  it('viser en arkivert gruppe i lesemodus for systemarkitekten, som kan åpne den igjen', async () => {
    api.oversikt = {
      ...OVERSIKT,
      status: 'arkivert',
      rolle: null,
      kan_styre: false,
      kan_moderere: false,
      kan_forlate: false,
      kan_gjenapne: true,
      medlemmer: OVERSIKT.medlemmer.map((m) => ({ ...m, kan_fjerne: false, kan_endre_rolle: false })),
    }
    vis(ID)
    expect((await screen.findByRole('note')).textContent).toMatch(/arkivert.*lesemodus/)
    expect(screen.getByText('Ikke medlem')).toBeTruthy()
    const modal = await innstillingene()
    expect(within(modal).queryByRole('button', { name: 'Forlat gruppen' })).toBeNull()
    await userEvent.click(within(modal).getByRole('button', { name: 'Åpne gruppen igjen' }))
    expect(api.arkiverGruppe).toHaveBeenCalledWith(ID, false)
  })

  it('har ingen gruppeinnstillinger for den som verken er med eller kan styre', async () => {
    api.oversikt = { ...OVERSIKT, rolle: null, kan_styre: false, kan_moderere: false, kan_forlate: false, kan_gjenapne: false }
    vis(ID)
    await screen.findByRole('heading', { level: 1, name: 'Lithiumgruppen' })
    expect(screen.queryByRole('button', { name: 'Gruppeinnstillinger' })).toBeNull()
  })

  it('sier det samme for en gruppe som ikke finnes og en som ikke kan leses, uten gruppens navn', async () => {
    api.hentGruppeoversikt.mockRejectedValueOnce(new Error('Gruppen finnes ikke, eller du har ikke tilgang til den.'))
    vis(ID)
    expect((await screen.findByRole('alert')).textContent).toBe('Gruppen finnes ikke, eller du har ikke tilgang til den.')
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Gruppe')
    expect(document.body.textContent).not.toMatch(/Lithiumgruppen/)
    expect(screen.queryByRole('region', { name: 'Idéer' })).toBeNull()
    // Aktiviteten hentes aldri for en gruppe som ikke kan leses.
    expect(api.hentGruppeaktivitet).not.toHaveBeenCalled()
    expect(screen.queryByRole('region', { name: 'Siste aktivitet' })).toBeNull()
  })
})

const IDE = '33333333-4444-4555-8666-777777777777'
const KOMMENTAR = '44444444-5555-4666-8777-888888888888'
const OPPGAVE = '55555555-6666-4777-8888-999999999999'
const TRAAD = '66666666-7777-4888-8999-aaaaaaaaaaaa'
const OLA = { username: 'ola.x', first_name: 'Ola', last_name: 'Nordmann' }

describe('siste aktivitet', () => {
  it('leser radene og hopper over dem uten formen', () => {
    expect(lesGruppeaktivitet(null)).toEqual([])
    expect(
      lesGruppeaktivitet([
        { slag: 'ide', ide: IDE, tittel: 'Felles mal', aktor: OLA, tid: '2026-11-18T10:00:00Z', ulest: true },
        { slag: 'ide', tittel: 'Uten ID', tid: '2026-11-18T10:00:00Z' },
        { slag: 'ukjent', tid: '2026-11-18T10:00:00Z' },
        { slag: 'chat', uleste: 2 },
      ]),
    ).toEqual([{ slag: 'ide', ide: IDE, tittel: 'Felles mal', aktor: OLA, tid: '2026-11-18T10:00:00Z', ulest: true }])
  })

  it('fører hver rad til selve hendelsen', () => {
    const tid = '2026-11-18T10:00:00Z'
    const rader = lesGruppeaktivitet([
      { slag: 'idekommentar', ide: IDE, kommentar: KOMMENTAR, tittel: 'Felles mal', aktor: OLA, tid, ulest: true },
      { slag: 'oppgave', oppgave: OPPGAVE, tittel: 'Rutinen', hva: 'fullfort', tildelt_meg: true, tid, ulest: false },
      { slag: 'diskusjonskommentar', diskusjon: TRAAD, kommentar: KOMMENTAR, tittel: 'Sandkassen', aktor: null, tid, ulest: false },
      { slag: 'diskusjon', diskusjon: TRAAD, tittel: 'Sandkassen', aktor: OLA, tid, ulest: false },
      { slag: 'ide', ide: IDE, tittel: 'Felles mal', aktor: OLA, tid, ulest: false },
      { slag: 'chat', uleste: 1, tid, ulest: true },
      { slag: 'chat', uleste: 0, tid, ulest: false },
    ]).map((r) => tilHendelse(ID, r))
    expect(rader.map(({ tittel, hvor, til, ulest }) => ({ tittel, hvor, til, ulest }))).toEqual([
      { tittel: 'Ola Nordmann kommenterte idéen «Felles mal»', hvor: 'Idé', til: `#/ide/${IDE}/${KOMMENTAR}`, ulest: true },
      { tittel: 'Oppgaven «Rutinen» er fullført', hvor: 'Oppgave · Tildelt deg', til: `#/grupper/${ID}/oppgaver/${OPPGAVE}`, ulest: undefined },
      { tittel: 'En tidligere bruker kommenterte tråden «Sandkassen»', hvor: 'Diskusjon', til: `#/diskusjon/${TRAAD}/${KOMMENTAR}`, ulest: undefined },
      { tittel: 'Ola Nordmann startet tråden «Sandkassen»', hvor: 'Diskusjon', til: `#/diskusjon/${TRAAD}`, ulest: undefined },
      { tittel: 'Ola Nordmann la inn idéen «Felles mal»', hvor: 'Idé', til: `#/grupper/${ID}/ideer/${IDE}`, ulest: undefined },
      { tittel: '1 ny melding i gruppechatten', hvor: 'Gruppechat', til: undefined, ulest: true },
      { tittel: 'Siste melding i gruppechatten', hvor: 'Gruppechat', til: undefined, ulest: undefined },
    ])
    // Chatten har ingen egen side ved siden av gruppen lenger (D4b): raden åpner samtalen i chatmenyen.
    const mottatt: unknown[] = []
    const slutt = lyttEtterChatbeskjed((b) => mottatt.push(b))
    rader.at(-1)!.ved!()
    slutt()
    expect(mottatt).toEqual([{ gruppe: ID }])
  })

  it('står øverst på gruppesiden, med hele raden som lenke, og henter på nytt etter en feil', async () => {
    api.hentGruppeaktivitet.mockRejectedValueOnce(new Error('nett')).mockImplementation(async () =>
      lesGruppeaktivitet([{ slag: 'ide', ide: IDE, tittel: 'Felles mal', aktor: OLA, tid: '2026-11-18T10:00:00Z', ulest: true }]),
    )
    vis(ID)
    const panel = await screen.findByRole('region', { name: 'Siste aktivitet' })
    await userEvent.click(await within(panel).findByRole('button', { name: 'Prøv igjen' }))
    const rad = await within(panel).findByRole('link', { name: /Ola Nordmann la inn idéen «Felles mal»/ })
    expect(rad.getAttribute('href')).toBe(`#/grupper/${ID}/ideer/${IDE}`)
    expect(rad.textContent).toMatch(/Ulest/)
    expect(api.hentGruppeaktivitet).toHaveBeenCalledWith(ID)
  })

  it('sier det rolig når det ikke er noe nytt', async () => {
    vis(ID)
    const panel = await screen.findByRole('region', { name: 'Siste aktivitet' })
    expect((await within(panel).findByText('Ingen ny aktivitet fra de andre i gruppen.')).tagName).toBe('P')
  })
})
