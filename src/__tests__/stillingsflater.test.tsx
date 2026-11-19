// @vitest-environment jsdom
/**
 * Stillingene i grensesnittet (docs/stillinger.md): valget i kontoen,
 * stillingen og «Endre stilling» i brukerlista, og systemarkitektenes side
 * for lista, med fjerningen av en stilling noen har. Databasen er erstattet;
 * reglene den håndhever, prøves i `stillinger.test.ts`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Fagmiljoreferanse } from '../auth/rettigheter'
import type { Stillingsinnehaver, Stillingskatalog } from '../stillinger/katalog'

const KATALOG: Stillingskatalog = [
  {
    id: 'leger',
    navn: 'Leger',
    rekkefolge: 0,
    stillinger: [
      { id: 'lis', kategori_id: 'leger', navn: 'LIS', rekkefolge: 0 },
      { id: 'overlege', kategori_id: 'leger', navn: 'Overlege', rekkefolge: 1 },
    ],
  },
  {
    id: 'lab',
    navn: 'Laboratorieansatte',
    rekkefolge: 1,
    stillinger: [{ id: 'kjemiker', kategori_id: 'lab', navn: 'Kjemiker', rekkefolge: 0 }],
  },
]

const db = vi.hoisted(() => ({
  profil: null as Profil | null,
  medlemmer: [] as unknown[],
  bruk: new Map<string, number>(),
  innehavere: [] as Stillingsinnehaver[],
}))

const settProfil = vi.fn()
vi.mock('../auth/okt', () => ({
  useOkt: () => ({ settProfil, loggUt: vi.fn() }),
  useProfil: () => db.profil,
}))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({
  hentMedlemsoversikt: vi.fn(async () => db.medlemmer),
  lagreEgenProfil: vi.fn(async (p: Profil, endring: Partial<Profil>) => ({
    ...p,
    ...endring,
  })),
  byttPassord: vi.fn(),
  lastOppAvatar: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('../stillinger/katalog', async (original) => ({
  ...(await original<typeof import('../stillinger/katalog')>()),
  useStillinger: () => KATALOG,
  oppfriskStillinger: vi.fn(async () => {}),
  settStilling: vi.fn(async (_bruker: string, stilling: string | null) => stilling),
  fjernStilling: vi.fn(async () => 2),
  hentStillingsbruk: vi.fn(async () => db.bruk),
  hentBrukereMedStilling: vi.fn(async () => db.innehavere),
}))

const katalog = await import('../stillinger/katalog')
const { Kontopanel } = await import('../components/konto/Kontopanel')
const { Brukerliste } = await import('../components/konto/Brukerliste')
const { Stillinger } = await import('../components/konto/Stillinger')
const { INGEN_RETTIGHETER, RettigheterKilde } = await import('../auth/rettigheter')

function profil(id: string, fornavn: string, etternavn: string, ekstra: Partial<Profil> = {}): Profil {
  return {
    id,
    username: `${fornavn.toLowerCase()}.${etternavn[0]!.toLowerCase()}`,
    first_name: fornavn,
    last_name: etternavn,
    role: 'user',
    avatar_path: null,
    stilling_id: null,
    must_change_password: false,
    onboarding_completed: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...ekstra,
  }
}

const KF: Fagmiljoreferanse = {
  id: 'kf',
  nokkel: 'ous-klinisk-farmakologi',
  navn: 'OUS Klinisk farmakologi',
  standard: true,
  apent: true,
  ikon: 'laboratorium',
}

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe('kontoen', () => {
  it('lar brukeren velge stilling fra lista, gruppert etter kategori, eller ingen', async () => {
    db.profil = profil('1', 'Kari', 'Nordmann')
    render(<Kontopanel apen onLukk={() => {}} />)
    const valg = screen.getByLabelText('Stilling') as HTMLSelectElement
    expect(valg.value).toBe('')
    expect([...valg.querySelectorAll('optgroup')].map((g) => g.label)).toEqual(['Leger', 'Laboratorieansatte'])
    expect([...valg.options].map((o) => o.text)).toEqual(['Ingen stilling', 'LIS', 'Overlege', 'Kjemiker'])

    await userEvent.selectOptions(valg, 'Overlege')
    await userEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(katalog.settStilling).toHaveBeenCalledWith('1', 'overlege'))
  })

  it('setter ikke stillingen på nytt når den ikke er endret', async () => {
    db.profil = profil('1', 'Kari', 'Nordmann', { stilling_id: 'lis' })
    render(<Kontopanel apen onLukk={() => {}} />)
    expect((screen.getByLabelText('Stilling') as HTMLSelectElement).value).toBe('lis')
    await userEvent.click(screen.getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(settProfil).toHaveBeenCalled())
    expect(katalog.settStilling).not.toHaveBeenCalled()
  })
})

describe('brukerlista', () => {
  const medlem = (p: Profil, endre_stilling: boolean) => ({
    ...p,
    status: 'aktiv',
    fra: '2026-09-01T00:00:00Z',
    til: null,
    administrator: false,
    systemarkitekt: false,
    rolle: p.role,
    maa_bytte_passord: false,
    sperret: false,
    eneste_medlemskap: true,
    kan_avslutte: false,
    kan_gi_tilgang: false,
    kan_gjore_til_administrator: false,
    kan_fjerne_som_administrator: false,
    nytt_passord: false,
    endre_rolle: false,
    endre_stilling,
  })

  it('viser stillingen og lar administratoren endre den der databasen tillater det', async () => {
    db.profil = profil('1', 'Anne', 'Admin')
    const kari = profil('2', 'Kari', 'Nordmann', { stilling_id: 'kjemiker' })
    const ola = profil('3', 'Ola', 'Svendsen')
    db.medlemmer = [medlem(kari, true), medlem(ola, false)]
    render(
      <RettigheterKilde verdi={{ ...INGEN_RETTIGHETER, administrerer: [KF] }}>
        <Brukerliste apen onLukk={() => {}} />
      </RettigheterKilde>,
    )
    const lag = screen.getByRole('dialog', { name: 'Brukere' })
    const [radKari, radOla] = await within(lag).findAllByRole('listitem')
    expect(radKari!.textContent).toContain('kari.n · Kjemiker')
    // Ingen handlinger databasen tillater på Ola: ingen meny.
    expect(within(radOla!).queryByRole('button', { name: /Handlinger for/ })).toBeNull()

    await userEvent.click(
      within(radKari!).getByRole('button', {
        name: 'Handlinger for Kari Nordmann',
      }),
    )
    await userEvent.click(screen.getByRole('button', { name: 'Endre stilling' }))
    const skjema = screen.getByRole('form', {
      name: 'Stillingen til Kari Nordmann',
    })
    const lagre = within(skjema).getByRole('button', {
      name: 'Lagre',
    }) as HTMLButtonElement
    expect(lagre.disabled).toBe(true)
    await userEvent.selectOptions(within(skjema).getByLabelText('Stilling'), 'LIS')
    await userEvent.click(lagre)
    await waitFor(() => expect(katalog.settStilling).toHaveBeenCalledWith('2', 'lis'))
    expect(await within(lag).findByRole('status')).toHaveProperty('textContent', 'Kari Nordmann har nå stillingen LIS.')
  })
})

describe('stillingslista for systemarkitektene', () => {
  it('viser kategoriene og stillingene i rekkefølge, med hvor mange som har hver', async () => {
    db.bruk = new Map([['overlege', 2]])
    render(<Stillinger apen onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Stillinger' })
    expect(
      within(lag)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Leger', 'Laboratorieansatte'])
    const leger = within(lag).getByRole('list', {
      name: 'Stillingene i Leger',
    })
    await waitFor(() => expect(leger.textContent).toContain('2 brukere'))
    // Første kan ikke flyttes opp, siste ikke ned.
    expect(
      (
        within(leger).getByRole('button', {
          name: 'Flytt LIS opp',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(
      (
        within(leger).getByRole('button', {
          name: 'Flytt Overlege ned',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
  })

  it('viser hvem som berøres når en stilling i bruk fjernes, og gir alle en annen på én gang', async () => {
    db.bruk = new Map([['overlege', 2]])
    db.innehavere = [
      {
        ...profil('2', 'Kari', 'Nordmann', { stilling_id: 'overlege' }),
        fagmiljoer: ['OUS Klinisk farmakologi'],
      },
      {
        ...profil('3', 'Ola', 'Svendsen', { stilling_id: 'overlege' }),
        fagmiljoer: ['OUS Rettstoksikologi'],
      },
    ]
    const onLukk = vi.fn()
    render(<Stillinger apen onLukk={onLukk} />)
    const lag = screen.getByRole('dialog', { name: 'Stillinger' })
    // Til tallene er hentet, er knappen den vanlige fjerningen i to trykk.
    await within(lag).findByText('2 brukere')
    await userEvent.click(within(lag).getByRole('button', { name: 'Fjern stillingen Overlege' }))

    expect(within(lag).getByRole('heading', { name: 'Fjerne stillingen Overlege' })).toBeTruthy()
    const berorte = await within(lag).findByRole('list', {
      name: 'Brukerne med stillingen Overlege',
    })
    expect(
      within(berorte)
        .getAllByRole('listitem')
        .map((r) => r.textContent),
    ).toEqual([
      expect.stringContaining('kari.n · OUS Klinisk farmakologi'),
      expect.stringContaining('ola.s · OUS Rettstoksikologi'),
    ])
    // Stillingen som fjernes, kan ikke velges som erstatning.
    const alle = within(lag).getByLabelText('Ny stilling for alle') as HTMLSelectElement
    expect([...alle.options].map((o) => o.text)).toEqual(['Velg stilling', 'LIS', 'Kjemiker'])

    await userEvent.selectOptions(alle, 'LIS')
    await userEvent.click(
      within(lag).getByRole('button', {
        name: 'Gi alle LIS og fjern Overlege',
      }),
    )
    await waitFor(() => expect(katalog.fjernStilling).toHaveBeenCalledWith('overlege', 'lis'))
    expect((await within(lag).findByRole('status')).textContent).toBe(
      'Stillingen Overlege er fjernet. 2 brukere har fått stillingen LIS.',
    )
  })

  it('gir én og én en annen stilling, og lar stillingen fjernes når ingen har den lenger', async () => {
    db.bruk = new Map([['kjemiker', 1]])
    db.innehavere = [
      {
        ...profil('2', 'Kari', 'Nordmann', { stilling_id: 'kjemiker' }),
        fagmiljoer: ['OUS Klinisk farmakologi'],
      },
    ]
    render(<Stillinger apen onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Stillinger' })
    await within(lag).findByText('1 bruker')
    await userEvent.click(within(lag).getByRole('button', { name: 'Fjern stillingen Kjemiker' }))
    const rad = within(
      await within(lag).findByRole('list', {
        name: 'Brukerne med stillingen Kjemiker',
      }),
    ).getByRole('listitem')

    await userEvent.selectOptions(within(rad).getByLabelText('Ny stilling for Kari Nordmann'), 'Overlege')
    db.innehavere = []
    await userEvent.click(
      within(rad).getByRole('button', {
        name: 'Lagre ny stilling for Kari Nordmann',
      }),
    )
    await waitFor(() => expect(katalog.settStilling).toHaveBeenCalledWith('2', 'overlege'))
    expect(await within(lag).findByText('Ingen har stillingen lenger, så den kan fjernes.')).toBeTruthy()
    await userEvent.click(within(lag).getByRole('button', { name: 'Fjern Kjemiker' }))
    await waitFor(() => expect(katalog.fjernStilling).toHaveBeenCalledWith('kjemiker'))
  })
})
