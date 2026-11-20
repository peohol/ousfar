// @vitest-environment jsdom
/**
 * Den personlige forsiden (`Forside`, docs/forside.md):
 *
 * - «Åpne fortolkning» har fokus og virker før panelene er hentet.
 * - Hvert panel laster og feiler for seg: et panel som feiler, lar de andre
 *   vise sitt, og «Prøv igjen» henter bare det panelet på nytt.
 * - Når fagmiljøet byttes, vises aldri det forrige fagmiljøets innhold.
 * - Oppsettet tegnes med standarden med en gang, og byttes når det lagrede er
 *   hentet. «Tilpass forsiden» endrer og lagrer det med en gang.
 * - Pilen ved fagmiljønavnet står bare der når det er noe å velge.
 *
 * Databasen er erstattet: kallene forsiden gjør, svarer testen på selv.
 * Databasens side prøves i `forside.test.ts`.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Fagmiljoreferanse, Rettigheter } from '../auth/rettigheter'
import type { Databasemodul } from '../forside/api'
import type { Forsideoppsett } from '../forside/moduler'
import type { Oppsummering } from '../forside/oppsummering'

const tilstand = vi.hoisted(() => ({ bruker: 'leser' }))

vi.mock('../auth/okt', () => ({
  useProfil: () => ({ id: tilstand.bruker, role: 'user', first_name: 'Lars', last_name: 'Leser', username: 'leser' }),
}))
vi.mock('../auth/api', () => ({ hentProfilkort: () => Promise.resolve([]) }))
vi.mock('../forside/api', () => ({ hentOppsummering: vi.fn(), hentOppsett: vi.fn(), lagreOppsett: vi.fn() }))
vi.mock('../varsler/api', async (original) => ({
  ...(await original<typeof import('../varsler/api')>()),
  hentEndringsloggstatus: () => Promise.resolve(null),
  merkVarslerLest: () => Promise.resolve(),
}))

const api = await import('../forside/api')
const { Forside } = await import('../components/forside/Forside')
const { INGEN_RETTIGHETER, RettigheterKilde } = await import('../auth/rettigheter')
const { STANDARDOPPSETT, settSynlig } = await import('../forside/moduler')
const { lyttEtterLesteEndringer } = await import('../varsler/bjella')

const KF: Fagmiljoreferanse = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true, ikon: 'laboratorium' }
const RT: Fagmiljoreferanse = { id: 'rt', nokkel: 'ous-rettstoksikologi', navn: 'OUS Rettstoksikologi', standard: false, apent: true, ikon: 'laboratorium' }

const TOM: Oppsummering = { lest_kl: '2026-11-18T12:00:00Z', varsler: [], invitasjoner: [], grupper: [], fagsider: [], oppgaver: [] }

const gruppe = (navn: string) => ({
  id: `g-${navn}`,
  navn,
  beskrivelse: '',
  art: 'fagmiljo' as const,
  status: 'aktiv' as const,
  fagmiljo: KF,
  medlemmer: 2,
  samhandling: { nye_ideer: 1, venter: 0, mine_oppgaver: 0, chat_uleste: null },
})

/** Svar på hentingen, styrt av testen: hvert kall venter til testen svarer. */
function utsatt<T>() {
  let svar!: (verdi: T) => void
  let feil!: (grunn: unknown) => void
  const lovnad = new Promise<T>((ja, nei) => {
    svar = ja
    feil = nei
  })
  return { lovnad, svar, feil }
}

let teller = 0
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.scrollTo = () => undefined
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => {
  // Hver test er en ny bruker, så det appen husker fra forrige test ikke gjelder.
  tilstand.bruker = `leser-${(teller += 1)}`
  vi.mocked(api.hentOppsett).mockResolvedValue(STANDARDOPPSETT)
  vi.mocked(api.lagreOppsett).mockResolvedValue()
  vi.mocked(api.hentOppsummering).mockResolvedValue(TOM)
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function vis(rettigheter: Partial<Rettigheter> = {}, onApneFortolkning = vi.fn()) {
  const verdi: Rettigheter = { ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF], velgbareFagmiljoer: [KF], ...rettigheter }
  const tegn = (r: Rettigheter) => (
    <RettigheterKilde verdi={r} oppdater={vi.fn()}>
      <Forside onApneFortolkning={onApneFortolkning} />
    </RettigheterKilde>
  )
  const resultat = render(tegn(verdi))
  return { ...resultat, bytt: (r: Partial<Rettigheter>) => resultat.rerender(tegn({ ...verdi, ...r })), onApneFortolkning }
}

const panel = (tittel: string) => screen.getByRole('region', { name: tittel })

describe('Forsiden', () => {
  it('har fokus på «Åpne fortolkning», som virker før panelene er hentet', async () => {
    vi.mocked(api.hentOppsummering).mockReturnValue(new Promise(() => undefined))
    vi.mocked(api.hentOppsett).mockReturnValue(new Promise(() => undefined))
    const { onApneFortolkning } = vis()
    const knapp = screen.getByRole('button', { name: 'Åpne fortolkning' })
    expect(document.activeElement).toBe(knapp)
    expect(within(panel('Viktig nytt')).getByText(/Henter/)).toBeTruthy()
    await userEvent.keyboard('{Enter}')
    expect(onApneFortolkning).toHaveBeenCalledTimes(1)
  })

  it('viser de fire standardpanelene med fagmiljøet som overskrift, uten pil når det bare er ett valg', async () => {
    vis()
    expect(screen.getByRole('heading', { level: 1, name: 'OUS Klinisk farmakologi' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Bytt fagmiljø' })).toBeNull()
    for (const tittel of ['Viktig nytt', 'Aktuelt for deg', 'Mine grupper', 'Oppdaterte fagsider']) expect(panel(tittel)).toBeTruthy()
    expect(screen.queryByRole('region', { name: 'Mine oppgaver' })).toBeNull()
    await waitFor(() => expect(within(panel('Mine grupper')).getByText('Du er ikke med i noen grupper ennå.')).toBeTruthy())
    expect(within(panel('Oppdaterte fagsider')).getByText('Ingen nye hendelser.')).toBeTruthy()
  })

  it('har «Gå til gruppeoversikten» som en knapp under gruppene (issue #510)', async () => {
    const gruppe = {
      id: 'g1',
      navn: 'Sandkassegruppen',
      beskrivelse: '',
      art: 'tverrfaglig' as const,
      status: 'aktiv' as const,
      fagmiljo: null,
      medlemmer: 2,
      samhandling: { nye_ideer: 0, venter: 0, mine_oppgaver: 0, chat_uleste: null },
    }
    vi.mocked(api.hentOppsummering).mockImplementation((modul) => Promise.resolve(modul === 'grupper' ? { ...TOM, grupper: [gruppe] } : TOM))
    vis()
    const knapp = await within(panel('Mine grupper')).findByRole('link', { name: 'Gå til gruppeoversikten' })
    expect(knapp.getAttribute('href')).toBe('#/grupper')
    expect(knapp.classList).toContain('knapp--sekundar')
    expect(screen.queryByText('Alle grupper')).toBeNull()
  })

  it('lar en systemarkitekt bytte til et fagmiljø hen ikke er medlem av, merket «Ikke medlem»', async () => {
    vis({ systemarkitekt: true, velgbareFagmiljoer: [KF, RT] })
    await userEvent.click(screen.getByRole('button', { name: 'Bytt fagmiljø' }))
    expect(screen.getByRole('button', { name: 'OUS Rettstoksikologi Ikke medlem' })).toBeTruthy()
  })

  it('lar de andre panelene virke når ett feiler, og «Prøv igjen» henter bare det på nytt', async () => {
    vi.mocked(api.hentOppsummering).mockImplementation((modul: Databasemodul) =>
      modul === 'grupper' ? Promise.reject(new Error('nede')) : Promise.resolve(TOM),
    )
    vis()
    const grupper = panel('Mine grupper')
    await waitFor(() => expect(within(grupper).getByText('Kunne ikke hente dette nå.')).toBeTruthy())
    await waitFor(() => expect(within(panel('Oppdaterte fagsider')).getByText('Ingen nye hendelser.')).toBeTruthy())

    vi.mocked(api.hentOppsummering).mockClear()
    vi.mocked(api.hentOppsummering).mockResolvedValue({ ...TOM, grupper: [gruppe('Legemiddelgruppa')] })
    await userEvent.click(within(grupper).getByRole('button', { name: 'Prøv igjen' }))
    await waitFor(() => expect(within(grupper).getByRole('link', { name: /Legemiddelgruppa/ })).toBeTruthy())
    expect(vi.mocked(api.hentOppsummering).mock.calls).toEqual([['grupper']])
    expect(within(grupper).getByText('1 ny')).toBeTruthy()
  })

  it('viser symbolet gruppen har valgt i «Mine grupper», og invitasjonens gruppesymbol i «Aktuelt for deg»', async () => {
    const symbolgruppe = { ...gruppe('Emojigruppa'), symbol: { emoji: '🧪' } }
    vi.mocked(api.hentOppsummering).mockImplementation((modul: Databasemodul) =>
      Promise.resolve(
        modul === 'grupper'
          ? { ...TOM, grupper: [symbolgruppe] }
          : modul === 'aktuelt'
            ? { ...TOM, invitasjoner: [{ gruppe: { ...gruppe('Invitert gruppe'), symbol: { emoji: '💊' } }, invitert_kl: '2026-11-19T10:00:00Z', invitert_av: null }] }
            : TOM,
      ),
    )
    vis()
    const rad = await waitFor(() => within(panel('Mine grupper')).getByRole('link', { name: /Emojigruppa/ }))
    expect(rad.querySelector('.gruppesymbol')?.textContent).toBe('🧪')
    const invitasjon = await waitFor(() => within(panel('Aktuelt for deg')).getByRole('link', { name: /Invitasjon til Invitert gruppe/ }))
    expect(invitasjon.querySelector('.gruppesymbol')?.textContent).toBe('💊')
  })

  it('viser aldri det forrige fagmiljøets innhold etter et bytte', async () => {
    vi.mocked(api.hentOppsummering).mockImplementation((modul: Databasemodul) =>
      Promise.resolve(modul === 'grupper' ? { ...TOM, grupper: [gruppe('Gammel gruppe')] } : TOM),
    )
    const { bytt } = vis({ mineFagmiljoer: [KF, RT], velgbareFagmiljoer: [KF, RT] })
    await waitFor(() => expect(within(panel('Mine grupper')).getByText('Gammel gruppe')).toBeTruthy())

    const ny = utsatt<Oppsummering>()
    vi.mocked(api.hentOppsummering).mockImplementation((modul: Databasemodul) => (modul === 'grupper' ? ny.lovnad : Promise.resolve(TOM)))
    bytt({ arbeidsfagmiljo: RT })
    expect(screen.getByRole('heading', { level: 1, name: 'OUS Rettstoksikologi' })).toBeTruthy()
    expect(within(panel('Mine grupper')).queryByText('Gammel gruppe')).toBeNull()
    expect(within(panel('Mine grupper')).getByText(/Henter/)).toBeTruthy()

    await act(async () => ny.svar({ ...TOM, grupper: [gruppe('Ny gruppe')] }))
    expect(within(panel('Mine grupper')).getByText('Ny gruppe')).toBeTruthy()
  })

  it('henter ingenting før rettighetene er kjent, og så hvert panel én gang (D7)', async () => {
    const verdi: Rettigheter = { ...INGEN_RETTIGHETER, arbeidsfagmiljo: KF, mineFagmiljoer: [KF], velgbareFagmiljoer: [KF] }
    const tegn = (r: Rettigheter, kontekst: string | null) => (
      <RettigheterKilde verdi={r} oppdater={vi.fn()} arbeidskontekst={kontekst}>
        <Forside onApneFortolkning={vi.fn()} />
      </RettigheterKilde>
    )
    const { rerender } = render(tegn(INGEN_RETTIGHETER, null))
    expect(screen.getByRole('button', { name: 'Åpne fortolkning' })).toBeTruthy()
    expect(within(panel('Mine grupper')).getByText(/Henter/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 1 }).textContent).not.toBe('OUSFAR')
    expect(api.hentOppsummering).not.toHaveBeenCalled()

    rerender(tegn(verdi, KF.id))
    expect(screen.getByRole('heading', { level: 1, name: 'OUS Klinisk farmakologi' })).toBeTruthy()
    await waitFor(() => expect(within(panel('Oppdaterte fagsider')).getByText('Ingen nye hendelser.')).toBeTruthy())
    expect(vi.mocked(api.hentOppsummering).mock.calls.map(([m]) => m).sort()).toEqual(['aktuelt', 'fagsider', 'grupper', 'viktig_nytt'])
  })

  it('bytter til det lagrede oppsettet når det er hentet, uten å flytte fokus', async () => {
    const lagret = utsatt<Forsideoppsett>()
    vi.mocked(api.hentOppsett).mockReturnValue(lagret.lovnad)
    vis()
    expect(panel('Viktig nytt')).toBeTruthy()
    await act(async () => lagret.svar(settSynlig(settSynlig(STANDARDOPPSETT, 'viktig_nytt', false), 'oppgaver', true)))
    expect(screen.queryByRole('region', { name: 'Viktig nytt' })).toBeNull()
    expect(panel('Mine oppgaver')).toBeTruthy()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Åpne fortolkning' }))
  })

  it('endrer og lagrer oppsettet med en gang i «Tilpass forsiden», og gjenoppretter standarden', async () => {
    vis()
    await userEvent.click(screen.getByRole('button', { name: 'Tilpass forsiden' }))
    const dialog = screen.getByRole('dialog', { name: /Tilpass forsiden/ })
    const gjenopprett = within(dialog).getByRole('button', { name: 'Gjenopprett standard' })
    expect((gjenopprett as HTMLButtonElement).disabled).toBe(true)

    await userEvent.click(within(dialog).getByRole('switch', { name: 'Mine oppgaver' }))
    expect(api.lagreOppsett).toHaveBeenLastCalledWith(settSynlig(STANDARDOPPSETT, 'oppgaver', true))
    expect(panel('Mine oppgaver')).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('button', { name: 'Flytt Mine grupper opp' }))
    const paneler = document.querySelector<HTMLElement>('.forside__paneler')!
    const rekkefolge = within(paneler).getAllByRole('region').map((r) => r.getAttribute('aria-label') ?? within(r).getAllByText(/./)[0]!.textContent)
    expect(rekkefolge.slice(0, 3)).toEqual(['Viktig nytt', 'Mine grupper', 'Aktuelt for deg'])

    await userEvent.click(gjenopprett)
    expect(api.lagreOppsett).toHaveBeenLastCalledWith(STANDARDOPPSETT)
    expect(screen.queryByRole('region', { name: 'Mine oppgaver' })).toBeNull()
  })

  it('merker en føring i endringsloggen lest i bjella når den åpnes fra «Viktig nytt»', async () => {
    const leste: (readonly string[])[] = []
    const slutt = lyttEtterLesteEndringer((versjoner) => leste.push(versjoner))
    try {
      vis()
      const viktig = panel('Viktig nytt')
      const uleste = () => within(viktig).queryAllByRole('button', { name: /^Ulest: / })
      const forHand = await waitFor(() => {
        expect(uleste().length).toBeGreaterThan(0)
        return uleste().length
      })
      // Raden er den samme knappen etterpå, bare uten «Ulest».
      const rad = uleste()[0]!
      await userEvent.click(rad)
      expect(leste).toEqual([[expect.any(String)]])
      expect(rad.textContent).not.toMatch(/^Ulest/)
      expect(uleste()).toHaveLength(forHand - 1)
      // Allerede lest: ingen ny lagring.
      await userEvent.click(rad)
      expect(leste).toHaveLength(1)
    } finally {
      slutt()
    }
  })
})
