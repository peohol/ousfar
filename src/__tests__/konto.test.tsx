// @vitest-environment jsdom
/**
 * Konto- og redigeringsflatene i Atlas: det modale laget, endringsloggen,
 * porten med innlogging og førstegangsoppsett, brukerlista med det
 * midlertidige passordet, og statusen for redigeringsmodusen.
 *
 * Økten og brukerdatabasen er erstattet; det er skjermbildene som prøves.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Rettigheter } from '../auth/rettigheter'
import type { Tilgang } from '../domain/tilgang'

const okt = vi.hoisted(() => ({
  tilgang: 'innlogging' as Tilgang,
  profil: null as Profil | null,
  // Det databasen svarer på `medlemsoversikt`, per fagmiljø.
  medlemmer: {} as Record<string, unknown[]>,
}))

vi.mock('../auth/okt', () => ({
  useOkt: () => ({
    tilgang: okt.tilgang,
    mangler: false,
    loggInn: vi.fn(async () => null),
    loggUt: vi.fn(async () => {}),
    settProfil: vi.fn(),
    forsokPaaNytt: vi.fn(),
  }),
  useProfil: () => okt.profil,
}))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({
  hentMedlemsoversikt: vi.fn(async (fagmiljo: string) => okt.medlemmer[fagmiljo] ?? []),
  avsluttMedlemskap: vi.fn(async () => ({ sperret: true })),
  giMedlemskap: vi.fn(async () => ({ sperret: false })),
  leggTilMedlem: vi.fn(async () => ({ sperret: false })),
  settFagmiljoadministrator: vi.fn(async () => ({ sperret: false })),
  opprettFagmiljo: vi.fn(async (navn: string) => ({ id: 'nytt', nokkel: 'nytt', navn })),
  nyttMidlertidigPassord: vi.fn(async () => ({ brukernavn: 'ola.s', midlertidigPassord: 'kvist-mose-47-lind' })),
  opprettBruker: vi.fn(),
  settRolle: vi.fn(),
  fullforOppsett: vi.fn(),
  lastOppAvatar: vi.fn(),
}))

const { Modallag } = await import('../components/Modallag')
const { Ikonknapp } = await import('../components/Ikonknapp')
const { Endringslogg } = await import('../components/Endringslogg')
const { ENDRINGSLOGG } = await import('../data/endringslogg')
const { Port } = await import('../components/konto/Port')
const { Brukerliste } = await import('../components/konto/Brukerliste')
const { INGEN_RETTIGHETER, RettigheterKilde } = await import('../auth/rettigheter')
const { INGENTING_A_PUBLISERE, Redigeringshandlinger, statustekst } = await import(
  '../components/stoffside/Redigeringslinje'
)
const { INGEN_REGLER } = await import('../faginnhold/lesing')
const { TipsLag } = await import('../components/Tips')
const { Versjonspille } = await import('../components/Versjonspille')
const { visEndringslogg } = await import('../components/endringsloggvisning')

function profil(id: string, fornavn: string, etternavn: string, ekstra: Partial<Profil> = {}): Profil {
  return {
    id,
    username: `${fornavn.toLowerCase()}.${etternavn[0]!.toLowerCase()}`,
    first_name: fornavn,
    last_name: etternavn,
    role: 'user',
    avatar_path: null,
    must_change_password: false,
    onboarding_completed: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
    ...ekstra,
  }
}

const MEG = profil('1', 'Anne', 'Admin', { role: 'admin' })

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Element.prototype.scrollIntoView ??= function () {}
  // jsdom har `<dialog>`, men ikke det modale laget.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(cleanup)

describe('det modale laget', () => {
  it('har tittelen som navn, ikonet foran og en lukkeknapp uten tooltip', async () => {
    const onLukk = vi.fn()
    render(
      <TipsLag>
        <Ikonknapp ikon="menu" etikett="Sidemeny" />
        <Modallag apen tittel="Kontoen din" ikon="user" onLukk={onLukk}>
          <p>Innhold</p>
        </Modallag>
      </TipsLag>,
    )
    const lag = screen.getByRole('dialog', { name: 'Kontoen din' })
    expect(lag.querySelector('.modallag__ikon .ikon')).toBeTruthy()

    // En vanlig ikonknapp får boblen; lukkeknappen ikke, for boblen ville
    // ligget under det modale laget.
    const vanlig = screen.getByRole('button', { name: 'Sidemeny' })
    await userEvent.hover(vanlig)
    expect(document.querySelector('.tipsboble')?.textContent).toBe('Sidemeny')
    await userEvent.unhover(vanlig)
    await waitFor(() => expect(document.querySelector('.tipsboble')).toBeNull())

    const lukk = within(lag).getByRole('button', { name: 'Lukk kontoen din' })
    await userEvent.hover(lukk)
    expect(document.querySelector('.tipsboble')).toBeNull()
    await userEvent.click(lukk)
    expect(onLukk).toHaveBeenCalledOnce()
  })

  it('lukkes av et trykk utenfor panelet, men ikke av en markering som slippes utenfor', async () => {
    const onLukk = vi.fn()
    render(
      <Modallag apen tittel="Idéer" onLukk={onLukk}>
        <p>Tekst som markeres</p>
      </Modallag>,
    )
    const lag = screen.getByRole('dialog', { name: 'Idéer' })
    const tekst = screen.getByText('Tekst som markeres')

    // Nettleseren sender klikket til den nærmeste felles forelderen for der
    // trykket begynte og sluttet — som er selve bakgrunnen, begge veier.
    const dra = (fra: Element, til: Element) => {
      fireEvent.pointerDown(fra)
      fireEvent.pointerUp(til)
      fireEvent.click(lag)
    }
    // Begynner i panelet og slipper utenfor.
    dra(tekst, lag)
    expect(onLukk).not.toHaveBeenCalled()
    // Begynner utenfor og slipper i panelet.
    dra(lag, tekst)
    expect(onLukk).not.toHaveBeenCalled()

    await userEvent.click(lag)
    expect(onLukk).toHaveBeenCalledOnce()
  })

  it('legger fokus der `autofokus` peker', () => {
    render(
      <Modallag apen tittel="Endringslogg" onLukk={() => {}} autofokus=".mal">
        <button type="button">Først</button>
        <button type="button" className="mal">
          Målet
        </button>
      </Modallag>,
    )
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Målet' }))
  })
})

describe('endringsloggen', () => {
  it('åpner med fokus på den nyeste føringen, og har bare én føring åpen om gangen', async () => {
    render(<Endringslogg apen onLukk={() => {}} />)
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    const [forste, andre] = within(lag).getAllByRole('button', { expanded: false })
    expect(document.activeElement).toBe(forste)
    expect(forste!.textContent).toContain(ENDRINGSLOGG[0]!.sammendrag)

    await userEvent.click(forste!)
    expect(forste!.getAttribute('aria-expanded')).toBe('true')
    await userEvent.click(andre!)
    expect(andre!.getAttribute('aria-expanded')).toBe('true')
    expect(forste!.getAttribute('aria-expanded')).toBe('false')
  })

  it('åpnes fra andre steder på en bestemt føring, utfoldet og med fokus', () => {
    render(
      <TipsLag>
        <Versjonspille />
      </TipsLag>,
    )
    expect(screen.queryByRole('dialog', { name: 'Endringslogg' })).toBeNull()
    const versjon = ENDRINGSLOGG[2]!
    act(() => visEndringslogg(versjon.versjon))
    const lag = screen.getByRole('dialog', { name: 'Endringslogg' })
    const foring = within(lag).getByRole('button', { name: new RegExp(versjon.versjon.replaceAll('.', '\\.')) })
    expect(foring.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement).toBe(foring)
  })
})

describe('porten', () => {
  it('viser merket, overskriften «Logg inn» og at kontoer opprettes av en administrator', () => {
    okt.tilgang = 'innlogging'
    render(<Port />)
    const kort = screen.getByRole('region', { name: 'Logg inn' })
    expect(within(kort).getByLabelText('Brukernavn')).toBeTruthy()
    expect(within(kort).getByLabelText('Passord')).toBeTruthy()
    expect(within(kort).getByRole('button', { name: 'Logg inn' })).toBeTruthy()
    expect(screen.getByText('OUSFAR')).toBeTruthy()
    expect(document.querySelector('.logomerke')?.getAttribute('aria-hidden')).toBe('true')
    expect(screen.getByText('OUSFAR er lukket. Kontoer opprettes av en administrator.')).toBeTruthy()
    // Temaknappen står alene, uten toppmeny.
    expect(screen.getByRole('button', { name: /Bytt til (lyst|mørkt) tema/ })).toBeTruthy()
  })

  it('ber om eget passord i førstegangsoppsettet', () => {
    okt.tilgang = 'oppsett'
    okt.profil = profil('3', 'Ola', 'Svendsen', { must_change_password: true })
    render(<Port />)
    const kort = screen.getByRole('region', { name: 'Velg ditt eget passord' })
    expect(within(kort).getByText(/logget inn med et midlertidig passord/)).toBeTruthy()
    expect(within(kort).getByRole('button', { name: 'Lagre og gå videre' })).toBeTruthy()
    expect(screen.queryByText(/Kontoer opprettes av en administrator/)).toBeNull()
  })

  it('gir en bruker uten aktivt medlemskap en beskjed og en vei ut, uten noe av appen', () => {
    okt.tilgang = 'avsluttet'
    okt.profil = null
    render(<Port />)
    const kort = screen.getByRole('region', { name: 'Ingen tilgang' })
    expect(within(kort).getByRole('alert').textContent).toMatch(/^Du har ikke lenger et aktivt medlemskap i OUSFAR\. Ta kontakt med administratoren/)
    expect(within(kort).getByRole('button', { name: 'Logg ut' })).toBeTruthy()
    expect(within(kort).queryByLabelText('Brukernavn')).toBeNull()
    expect(screen.queryByText(/Kontoer opprettes av en administrator/)).toBeNull()
  })
})

const KF = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true }
const RT = { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi', standard: false, apent: false }
// RT er lukket her, så nye brukere kan bare opprettes i KF (`opprett_bruker_i`).
const SYSTEMARKITEKT = { ...INGEN_RETTIGHETER, systemarkitekt: true, administrerer: [KF, RT], arbeidsfagmiljo: KF, stoffregister: true, opprettBrukerI: ['kf'] }
const LOKAL_I_KF = { ...INGEN_RETTIGHETER, administrerer: [KF], opprettBrukerI: ['kf'] }
const RT_APENT = { ...RT, apent: true }
const LOKAL_I_RT = { ...INGEN_RETTIGHETER, administrerer: [RT_APENT], arbeidsfagmiljo: RT_APENT, opprettBrukerI: ['rt'] }

/** Ingen handlinger; testene slår på det databasen ville tillatt. */
const INGEN = {
  kan_avslutte: false,
  kan_gi_tilgang: false,
  kan_gjore_til_administrator: false,
  kan_fjerne_som_administrator: false,
  nytt_passord: false,
  endre_rolle: false,
}

/** En rad i medlemsoversikten, slik databasen gir den. */
function medlem(p: Profil, ekstra: Record<string, unknown> = {}) {
  return {
    ...p,
    status: 'aktiv',
    fra: '2026-09-01T00:00:00Z',
    til: null,
    administrator: false,
    systemarkitekt: false,
    rolle: p.role,
    maa_bytte_passord: p.must_change_password,
    sperret: false,
    eneste_medlemskap: true,
    ...INGEN,
    ...ekstra,
  }
}

const KARI = profil('2', 'Kari', 'Nordmann')
const OLA = profil('3', 'Ola', 'Svendsen', { must_change_password: true })
const ALT = { kan_avslutte: true, nytt_passord: true, endre_rolle: true, kan_gjore_til_administrator: true }

/** Rendrer lista for `meg` med svarene databasen gir om medlemmene og rettighetene. */
async function brukerlista(meg: Profil, medlemmer: Record<string, unknown[]>, rettigheter: Rettigheter = LOKAL_I_KF) {
  okt.profil = meg
  okt.medlemmer = medlemmer
  render(
    <RettigheterKilde verdi={rettigheter}>
      <Brukerliste apen onLukk={() => {}} />
    </RettigheterKilde>,
  )
  const lag = screen.getByRole('dialog', { name: 'Brukere' })
  const rader = await within(lag).findAllByRole('listitem')
  return { lag, rader }
}

describe('brukerlista', () => {
  it('viser hvem som er administrator, hvem som må bytte passord, og handlinger med navnet i', async () => {
    const { lag, rader } = await brukerlista(MEG, {
      kf: [medlem(MEG, { administrator: true, ...ALT }), medlem(KARI, ALT), medlem(OLA, { nytt_passord: true })],
    })
    expect(rader.map((rad) => rad.querySelector('.brukerrad__merker')?.textContent)).toEqual([
      'AdministratorAdminrolle',
      'Bruker',
      'BrukerMå bytte passord',
    ])
    // Egen rad har ingen handlinger, selv om svaret skulle si noe annet.
    expect(within(rader[0]!).queryAllByRole('button')).toEqual([])
    expect(within(rader[1]!).getByRole('button', { name: 'Gi adminrollen: Kari Nordmann' })).toBeTruthy()
    expect(within(rader[1]!).getByRole('button', { name: 'Gjør Kari Nordmann til administrator i OUS Klinisk farmakologi' })).toBeTruthy()

    await userEvent.click(within(rader[2]!).getByRole('button', { name: 'Nytt passord for Ola Svendsen' }))
    const kvittering = await within(lag).findByRole('alert')
    expect(within(kvittering).getByText('kvist-mose-47-lind')).toBeTruthy()
    expect(within(kvittering).getByText(/vises bare nå/)).toBeTruthy()
    await userEvent.click(within(kvittering).getByRole('button', { name: 'Jeg har notert passordet' }))
    await waitFor(() => expect(within(lag).queryByRole('alert')).toBeNull())
  })

  it('viser bare handlingene databasen tillater på hver rad', async () => {
    const { rader } = await brukerlista(MEG, { kf: [medlem(KARI, { nytt_passord: true }), medlem(OLA)] })
    expect(within(rader[0]!).getAllByRole('button').map((b) => b.textContent)).toEqual(['Nytt passord'])
    expect(within(rader[1]!).queryAllByRole('button')).toEqual([])
  })

  it('ber om bekreftelse før et medlemskap avsluttes, og sier at kontoen sperres når det er det siste', async () => {
    const api = await import('../auth/api')
    const { lag, rader } = await brukerlista(MEG, { kf: [medlem(KARI, { kan_avslutte: true })] })
    await userEvent.click(within(rader[0]!).getByRole('button', { name: 'Avslutt medlemskapet til Kari Nordmann' }))
    const bekreft = within(lag).getByRole('group', { name: 'Avslutte medlemskapet til Kari Nordmann i OUS Klinisk farmakologi?' })
    expect(bekreft.textContent).toMatch(/kontoen sperres og logges ut på alle enheter/)
    // «Avbryt» har fokus, så et tastetrykk for mye ikke fjerner noe.
    expect(document.activeElement?.textContent).toBe('Avbryt')
    expect(api.avsluttMedlemskap).not.toHaveBeenCalled()

    await userEvent.click(within(bekreft).getByRole('button', { name: 'Avslutt medlemskapet' }))
    expect(api.avsluttMedlemskap).toHaveBeenCalledWith('2', 'kf')
    expect((await within(lag).findByRole('status')).textContent).toBe(
      'Kari Nordmann er ikke lenger medlem av OUS Klinisk farmakologi. Kontoen er sperret og logget ut.',
    )
  })

  it('sier at de andre medlemskapene står, og lar en avbrutt bekreftelse være uten følger', async () => {
    const api = await import('../auth/api')
    vi.mocked(api.avsluttMedlemskap).mockClear()
    const { lag, rader } = await brukerlista(MEG, {
      kf: [medlem(KARI, { kan_avslutte: true, eneste_medlemskap: false, administrator: true })],
    })
    await userEvent.click(within(rader[0]!).getByRole('button', { name: 'Avslutt medlemskapet til Kari Nordmann' }))
    const bekreft = within(lag).getByRole('group')
    expect(bekreft.textContent).toMatch(/også administrator her/)
    expect(bekreft.textContent).toMatch(/Medlemskapene i andre fagmiljøer står/)
    await userEvent.click(within(bekreft).getByRole('button', { name: 'Avbryt' }))
    expect(within(lag).queryByRole('group')).toBeNull()
    expect(api.avsluttMedlemskap).not.toHaveBeenCalled()
  })

  it('viser de tidligere medlemmene for seg, med «Gi tilgang igjen» der det er lov', async () => {
    const api = await import('../auth/api')
    const { lag } = await brukerlista(MEG, {
      kf: [medlem(MEG), medlem(KARI, { status: 'avsluttet', sperret: true, kan_gi_tilgang: true }), medlem(OLA, { status: 'avsluttet' })],
    })
    const tidligere = within(lag).getByRole('list', { name: 'Tidligere medlemmer i OUS Klinisk farmakologi' })
    const [kari, ola] = within(tidligere).getAllByRole('listitem')
    expect(kari!.querySelector('.brukerrad__merker')?.textContent).toBe('BrukerSperret')
    expect(within(ola!).queryAllByRole('button')).toEqual([])
    await userEvent.click(within(kari!).getByRole('button', { name: 'Gi Kari Nordmann tilgang igjen' }))
    expect(api.giMedlemskap).toHaveBeenCalledWith('2', 'kf')
  })

  it('legger til en eksisterende bruker med brukernavnet', async () => {
    const api = await import('../auth/api')
    const { lag } = await brukerlista(MEG, { kf: [medlem(MEG)] })
    await userEvent.click(within(lag).getByRole('button', { name: 'Legg til medlem' }))
    await userEvent.type(within(lag).getByLabelText('Brukernavn'), 'Kari.N')
    await userEvent.click(within(lag).getByRole('button', { name: 'Legg til' }))
    expect(api.leggTilMedlem).toHaveBeenCalledWith('kari.n', 'kf')
    expect((await within(lag).findByRole('status')).textContent).toBe('kari.n er medlem av OUS Klinisk farmakologi.')
  })

  it('lar en systemarkitekt velge fagmiljø, og sier fra når det ikke er åpnet for medlemmer', async () => {
    const { lag } = await brukerlista(MEG, { kf: [medlem(KARI)], rt: [medlem(OLA)] }, SYSTEMARKITEKT)
    expect(within(lag).getByRole('button', { name: 'Opprett bruker' })).toBeTruthy()
    expect(within(lag).getByRole('button', { name: 'Nytt fagmiljø' })).toBeTruthy()
    await userEvent.selectOptions(within(lag).getByLabelText('Fagmiljø'), 'rt')
    expect(await within(lag).findByText('Ola Svendsen')).toBeTruthy()
    expect(within(lag).getByText(/OUS Rettstoksikologi er ikke åpnet for medlemmer ennå/)).toBeTruthy()
    // Et lukket fagmiljø tar ikke imot nye brukere (startporten S2).
    expect(within(lag).queryByRole('button', { name: 'Opprett bruker' })).toBeNull()
  })

  it('viser og handler aldri på et fagmiljø som ikke er valgt, når svarene kommer i en annen rekkefølge', async () => {
    const api = await import('../auth/api')
    vi.mocked(api.avsluttMedlemskap).mockClear()
    // Svarene holdes tilbake og slippes i den rekkefølgen testen bestemmer.
    const ventende = new Map<string, (rader: unknown[]) => void>()
    vi.mocked(api.hentMedlemsoversikt).mockImplementation(
      (fagmiljo: string) => new Promise((svar) => ventende.set(fagmiljo, svar as (rader: unknown[]) => void)) as never,
    )
    const slipp = async (fagmiljo: string, rader: unknown[]) => {
      await waitFor(() => expect(ventende.has(fagmiljo)).toBe(true))
      const svar = ventende.get(fagmiljo)!
      ventende.delete(fagmiljo)
      await act(async () => svar(rader))
    }
    try {
      okt.profil = MEG
      render(
        <RettigheterKilde verdi={SYSTEMARKITEKT}>
          <Brukerliste apen onLukk={() => {}} />
        </RettigheterKilde>,
      )
      const lag = screen.getByRole('dialog', { name: 'Brukere' })
      // Kari er medlem begge steder; svaret fra KF er på vei når RT velges.
      const kariKf = medlem(KARI, { kan_avslutte: true })
      const kariRt = medlem(KARI, { kan_avslutte: true, eneste_medlemskap: false })
      await userEvent.selectOptions(within(lag).getByLabelText('Fagmiljø'), 'rt')
      await slipp('rt', [kariRt])
      await slipp('kf', [kariKf, medlem(OLA)])
      // Det sene svaret fra KF vises ikke under RT.
      const liste = within(lag).getByRole('list', { name: 'Medlemmer i OUS Rettstoksikologi' })
      expect(within(liste).getAllByRole('listitem')).toHaveLength(1)
      expect(within(lag).queryByText('Ola Svendsen')).toBeNull()
      expect(within(lag).queryByRole('list', { name: /OUS Klinisk farmakologi/ })).toBeNull()

      // Handlingen på raden gjelder fagmiljøet raden ble hentet fra.
      await userEvent.click(within(liste).getByRole('button', { name: 'Avslutt medlemskapet til Kari Nordmann' }))
      const bekreft = within(lag).getByRole('group', { name: 'Avslutte medlemskapet til Kari Nordmann i OUS Rettstoksikologi?' })
      await userEvent.click(within(bekreft).getByRole('button', { name: 'Avslutt medlemskapet' }))
      expect(api.avsluttMedlemskap).toHaveBeenCalledWith('2', 'rt')
      // Mens lista hentes på nytt etter handlingen, kan fagmiljøet ikke byttes.
      expect((within(lag).getByLabelText('Fagmiljø') as HTMLSelectElement).disabled).toBe(true)
      await slipp('rt', [])
      await waitFor(() => expect((within(lag).getByLabelText('Fagmiljø') as HTMLSelectElement).disabled).toBe(false))

      // Byttes det tilbake mens svaret fra RT er på vei, vises bare KF.
      await userEvent.selectOptions(within(lag).getByLabelText('Fagmiljø'), 'kf')
      await slipp('kf', [kariKf])
      expect(within(lag).getByRole('list', { name: 'Medlemmer i OUS Klinisk farmakologi' })).toBeTruthy()
      expect(api.avsluttMedlemskap).toHaveBeenCalledTimes(1)
    } finally {
      vi.mocked(api.hentMedlemsoversikt).mockImplementation(async (fagmiljo: string) => (okt.medlemmer[fagmiljo] ?? []) as never)
    }
  })

  it('gir en lokal administrator ingen fagmiljøvelger, men «Opprett bruker» i sitt fagmiljø', async () => {
    const { lag } = await brukerlista(MEG, { kf: [medlem(KARI)] })
    expect(within(lag).queryByLabelText('Fagmiljø')).toBeNull()
    expect(within(lag).queryByRole('button', { name: 'Nytt fagmiljø' })).toBeNull()
    expect(within(lag).getByRole('button', { name: 'Opprett bruker' })).toBeTruthy()
  })

  it('oppretter en bruker direkte i fagmiljøet en lokal administrator utenfor standarden administrerer', async () => {
    const api = await import('../auth/api')
    vi.mocked(api.opprettBruker).mockClear()
    vi.mocked(api.opprettBruker).mockResolvedValueOnce({
      brukernavn: 'ny.bruker',
      midlertidigPassord: 'eik-sten-12-fjell',
      fagmiljo: { id: 'rt', navn: 'OUS Rettstoksikologi' },
    })
    const { lag } = await brukerlista(MEG, { rt: [medlem(KARI)] }, LOKAL_I_RT)
    // Ingen valg å ta stilling til: bare fagmiljøet hen administrerer, og bare brukernavnet.
    expect(within(lag).queryByLabelText('Fagmiljø')).toBeNull()
    await userEvent.click(within(lag).getByRole('button', { name: 'Opprett bruker' }))
    const skjema = lag.querySelector<HTMLElement>('form.skjema')!
    expect(within(skjema).getAllByRole('textbox')).toEqual([within(skjema).getByLabelText('Brukernavn')])
    expect(within(skjema).queryByRole('combobox')).toBeNull()
    expect(skjema.textContent).toMatch(/Brukeren blir medlem av OUS Rettstoksikologi/)
    await userEvent.type(within(lag).getByLabelText('Brukernavn'), 'Ny.Bruker')
    await userEvent.click(within(lag).getByRole('button', { name: 'Opprett' }))
    expect(api.opprettBruker).toHaveBeenCalledWith('ny.bruker', 'rt')
    const kvittering = await within(lag).findByRole('alert')
    expect(within(kvittering).getByText('eik-sten-12-fjell')).toBeTruthy()
    expect(kvittering.textContent).toMatch(/Kontoen er opprettet som medlem av OUS Rettstoksikologi\./)
  })

  it('gir ikke «Opprett bruker» uten retten til det i fagmiljøet som vises', async () => {
    for (const rettigheter of [
      { ...LOKAL_I_KF, opprettBrukerI: [] },
      { ...INGEN_RETTIGHETER, administrerer: [RT], opprettBrukerI: ['kf'] },
    ]) {
      const { lag } = await brukerlista(MEG, { kf: [medlem(KARI)], rt: [medlem(KARI)] }, rettigheter)
      expect(within(lag).queryByRole('button', { name: 'Opprett bruker' })).toBeNull()
      cleanup()
    }
  })
})

describe('statusen for redigeringsmodusen', () => {
  it('teller det som ikke er publisert', () => {
    expect(statustekst(true, 3, false)).toBe('Henter utkastet …')
    expect(statustekst(false, 0, false)).toBe('Redigerer · ingen upubliserte endringer')
    expect(statustekst(false, 0, true)).toBe('Redigerer · alt er publisert')
    expect(statustekst(false, 1, false)).toBe('Redigerer · utkast med 1 endring')
    expect(statustekst(false, 3, false)).toBe('Redigerer · utkast med 3 endringer')
  })

  const handlinger = (antall: number, laster = false) => (
    <Redigeringshandlinger
      data={{ referanser: [], elementer: [] } as never}
      regler={INGEN_REGLER}
      publisert={INGEN_REGLER}
      plan={Array.from({ length: antall }, (_, i) => ({ slag: 'referanse' as const, id: `r${i}`, revisjon: 1 }))}
      laster={laster}
      onPubliser={async () => {}}
      onAvslutt={() => {}}
    />
  )

  it('viser statusen uten synlig tekst, med antallet i et merke', () => {
    const { container, rerender } = render(handlinger(0))
    const status = screen.getByRole('status')
    expect(within(status).getByText('Redigerer · ingen upubliserte endringer').className).toBe('kun-skjermleser')
    expect(container.querySelector('.varselmerke')).toBeNull()
    rerender(handlinger(3))
    expect(within(status).getByText('Redigerer · utkast med 3 endringer')).toBeTruthy()
    expect(container.querySelector('.varselmerke')?.textContent).toBe('3')
  })

  it('demper «Publiser» og sier hvorfor når ingenting er nytt', async () => {
    const { rerender } = render(handlinger(0))
    const knapp = screen.getByRole('button', { name: 'Publiser' })
    expect(knapp.getAttribute('aria-disabled')).toBe('true')
    expect(document.getElementById(knapp.getAttribute('aria-describedby')!)?.textContent).toBe(INGENTING_A_PUBLISERE)
    await userEvent.click(knapp)
    expect(screen.queryByRole('dialog', { name: 'Publiser endringene' })).toBeNull()

    rerender(handlinger(2, true))
    expect(document.getElementById(knapp.getAttribute('aria-describedby')!)?.textContent).toBe('Henter utkastet …')

    rerender(handlinger(2))
    expect(knapp.getAttribute('aria-disabled')).toBeNull()
    expect(knapp.getAttribute('aria-describedby')).toBeNull()
    await userEvent.click(knapp)
    expect(screen.getByRole('dialog', { name: 'Publiser endringene' })).toBeTruthy()
  })
})
