// @vitest-environment jsdom
/**
 * Profilkortet ved hovering (docs/designsystem.md, «Profilkortet»), prøvd i
 * en nettleser i minnet med kallene erstattet. Tilgangen og svaret selv
 * prøves i databasen (`profilkort.test.ts`). Bare syntetiske personer.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil, Profilkort } from '@delt/profil'
import type { Direktemeldinger } from '../direktemeldinger/useDirekte'
import type { Profilkortdetaljer } from '../profilkort/modell'

const MEG: Profil = {
  id: '00000000-0000-4000-8000-0000000000a1',
  username: 'test.ada',
  first_name: 'Ada',
  last_name: 'Testesen',
  role: 'user',
  avatar_path: null,
  must_change_password: false,
  onboarding_completed: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

const BO: Profilkort = {
  id: '00000000-0000-4000-8000-0000000000b2',
  username: 'test.bo',
  first_name: 'Bo',
  last_name: 'Prøvesen',
  avatar_path: null,
  updated_at: '2026-09-01T00:00:00Z',
}

const kall = vi.hoisted(() => ({
  rpc: vi.fn(),
  aapneDirektesamtale: vi.fn(),
}))

vi.mock('../auth/okt', () => ({ useProfil: () => MEG }))
vi.mock('../auth/klient', () => ({ klient: () => ({ rpc: kall.rpc }) }))
vi.mock('../direktemeldinger/api', () => ({ direkteapi: { aapneDirektesamtale: kall.aapneDirektesamtale }, abonnerPaDirektesamtale: () => () => {} }))

const { Profilutlos, PROFILKORT_VISES_ETTER } = await import('../components/profilkort/Profilkort')
const { glemProfilkortene, hentProfilkortdetaljer, HUSKES_MS } = await import('../profilkort/api')
const { lesProfilkortdetaljer } = await import('../profilkort/modell')
const { direktemeldingene } = await import('../direktemeldinger/useDirekte')
const { lyttEtterChatbeskjed } = await import('../components/chat/chatstyring')
const { TipsLag } = await import('../components/Tips')

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const svar = (detaljer: Partial<Profilkortdetaljer> | null) =>
  kall.rpc.mockResolvedValue({ data: detaljer && { id: BO.id, fagmiljoer: ['OUS Klinisk farmakologi'], kan_chatte: false, ...detaljer }, error: null })

function direkte(over: Partial<Direktemeldinger> = {}): Direktemeldinger {
  return {
    pa: true,
    kjent: true,
    samtaler: [],
    valg: { tillat_direktemeldinger: true, vis_aktiv: false },
    aktive: new Set(),
    settValg: vi.fn(async () => {}),
    oppdater: vi.fn(),
    ...over,
  }
}

beforeEach(() => {
  glemProfilkortene()
  kall.rpc.mockReset()
  kall.aapneDirektesamtale.mockReset()
  direktemeldingene.sett(null)
})

afterEach(cleanup)

function Vis({ person = BO as Profilkort | null }: { person?: Profilkort | null }) {
  return (
    <TipsLag>
      <p>
        <Profilutlos person={person} variant="peker">
          <span data-testid="bilde">BP</span>
        </Profilutlos>{' '}
        <Profilutlos person={person}>{person ? `${person.first_name} ${person.last_name}` : 'Ukjent'}</Profilutlos>
      </p>
      <button type="button">Etter</button>
    </TipsLag>
  )
}

const navneknapp = () => screen.getByRole('button', { name: 'Bo Prøvesen, vis profilkortet' })
const kortet = () => screen.queryByRole('dialog', { name: 'Profilkortet til Bo Prøvesen' })

describe('utløseren', () => {
  it('er navnet som knapp for tastaturet, og bildet utenfor tabulatorrekkefølgen', () => {
    svar({})
    render(<Vis />)
    expect(navneknapp()).toHaveProperty('tabIndex', 0)
    const bildeknapp = screen.getByTestId('bilde').closest('button')!
    expect(bildeknapp.tabIndex).toBe(-1)
    expect(bildeknapp.getAttribute('aria-hidden')).toBe('true')
  })

  it('gir ikke noe kort for en selv eller en konto som er borte', () => {
    const { unmount } = render(<Vis person={{ ...BO, ...MEG }} />)
    expect(screen.queryAllByRole('button', { hidden: true }).map((b) => b.textContent)).toEqual(['Etter'])
    unmount()
    render(<Vis person={null} />)
    expect(screen.queryAllByRole('button', { hidden: true }).map((b) => b.textContent)).toEqual(['Etter'])
  })

  it('åpner kortet først når pekeren har hvilt, og lukker det når pekeren går', async () => {
    svar({})
    render(<Vis />)
    await userEvent.hover(navneknapp())
    expect(kortet()).toBeNull()
    await waitFor(() => expect(kortet()).not.toBeNull(), { timeout: PROFILKORT_VISES_ETTER + 1000 })
    await userEvent.unhover(navneknapp())
    await waitFor(() => expect(kortet()).toBeNull())
  })
})

describe('kortet', () => {
  it('viser hele navnet, fagmiljøene og stillingen når den finnes, uten chatknapp', async () => {
    svar({ fagmiljoer: ['OUS Klinisk farmakologi', 'OUS Rettstoksikologi'], stilling: 'Overlege' })
    render(<Vis />)
    await userEvent.click(navneknapp())
    const kort = kortet()!
    expect(kort.textContent).toContain('Bo Prøvesen')
    await waitFor(() => expect(kort.textContent).toContain('OUS Klinisk farmakologi · OUS Rettstoksikologi'))
    expect(kort.textContent).toContain('Overlege')
    expect(screen.queryByRole('button', { name: /^Chat med/ })).toBeNull()
    expect(kall.rpc).toHaveBeenCalledWith('profilkortdetaljer', { bruker: BO.id })
  })

  it('viser bare navnet og bildet når databasen ikke gir mer', async () => {
    svar(null)
    render(<Vis />)
    await userEvent.click(navneknapp())
    await waitFor(() => expect(kortet()!.textContent).not.toContain('Henter'))
    expect(kortet()!.textContent).toBe('BPBo Prøvesen')
  })

  it('lukkes med Escape, med fokus tilbake på navnet', async () => {
    svar({})
    render(<Vis />)
    await userEvent.click(navneknapp())
    expect(kortet()).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    expect(kortet()).toBeNull()
    expect(document.activeElement).toBe(navneknapp())
  })
})

describe('chatknappen', () => {
  it('åpner samtalen som finnes, uten et nytt kall', async () => {
    svar({ kan_chatte: true })
    direktemeldingene.sett(direkte({ samtaler: [{ id: 'samtale-1', motpart: BO } as never] }))
    const mottatt: unknown[] = []
    const slutt = lyttEtterChatbeskjed((b) => mottatt.push(b))
    render(<Vis />)
    await userEvent.click(navneknapp())
    await userEvent.click(await screen.findByRole('button', { name: 'Chat med Bo' }))
    expect(mottatt).toEqual([{ direkte: 'samtale-1' }])
    expect(kall.aapneDirektesamtale).not.toHaveBeenCalled()
    expect(kortet()).toBeNull()
    slutt()
  })

  it('starter en ny samtale når ingen finnes', async () => {
    svar({ kan_chatte: true })
    direktemeldingene.sett(direkte())
    kall.aapneDirektesamtale.mockResolvedValue('samtale-ny')
    const mottatt: unknown[] = []
    const slutt = lyttEtterChatbeskjed((b) => mottatt.push(b))
    render(<Vis />)
    await userEvent.click(navneknapp())
    await userEvent.click(await screen.findByRole('button', { name: 'Chat med Bo' }))
    await waitFor(() => expect(mottatt).toEqual([{ direkte: 'samtale-ny' }]))
    expect(kall.aapneDirektesamtale).toHaveBeenCalledWith(BO.id)
    slutt()
  })

  it('spør før den slår på egne direktemeldinger, og endrer ingenting uten trykket', async () => {
    svar({ kan_chatte: true })
    const d = direkte({ valg: { tillat_direktemeldinger: false, vis_aktiv: false } })
    direktemeldingene.sett(d)
    kall.aapneDirektesamtale.mockResolvedValue('samtale-ny')
    render(<Vis />)
    await userEvent.click(navneknapp())
    await userEvent.click(await screen.findByRole('button', { name: 'Chat med Bo' }))
    expect(screen.getByText('Slå på «Tillat direktemeldinger» for å starte en samtale.')).toBeTruthy()
    expect(d.settValg).not.toHaveBeenCalled()
    expect(kall.aapneDirektesamtale).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Slå på og start' }))
    await waitFor(() => expect(kall.aapneDirektesamtale).toHaveBeenCalledWith(BO.id))
    expect(d.settValg).toHaveBeenCalledWith({ tillat_direktemeldinger: true })
  })

  it('viser avslaget når samtalen ikke kan åpnes', async () => {
    svar({ kan_chatte: true })
    direktemeldingene.sett(direkte())
    kall.aapneDirektesamtale.mockRejectedValue(new Error('Personen finnes ikke, eller kan ikke motta direktemeldinger.'))
    render(<Vis />)
    await userEvent.click(navneknapp())
    await userEvent.click(await screen.findByRole('button', { name: 'Chat med Bo' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Personen finnes ikke, eller kan ikke motta direktemeldinger.')
  })
})

describe('svarene', () => {
  it('huskes et minutt, deles mellom samtidige kall og glemmes på forespørsel', async () => {
    svar({})
    const a = hentProfilkortdetaljer(BO.id, 1_000)
    const b = hentProfilkortdetaljer(BO.id, 1_000 + HUSKES_MS - 1)
    expect(a).toBe(b)
    await a
    expect(kall.rpc).toHaveBeenCalledTimes(1)
    await hentProfilkortdetaljer(BO.id, 1_000 + HUSKES_MS)
    expect(kall.rpc).toHaveBeenCalledTimes(2)
    glemProfilkortene()
    await hentProfilkortdetaljer(BO.id, 1_000 + HUSKES_MS)
    expect(kall.rpc).toHaveBeenCalledTimes(3)
  })

  it('leser bare det som er gyldig', () => {
    expect(lesProfilkortdetaljer(null)).toBeNull()
    expect(lesProfilkortdetaljer({ fagmiljoer: [] })).toBeNull()
    expect(lesProfilkortdetaljer({ id: 'x', fagmiljoer: ['A', 3], kan_chatte: 'ja' })).toEqual({ id: 'x', fagmiljoer: ['A'], kan_chatte: false })
    expect(lesProfilkortdetaljer({ id: 'x', fagmiljoer: [], stilling: ' ', kan_chatte: true })).toEqual({
      id: 'x',
      fagmiljoer: [],
      stilling: null,
      kan_chatte: true,
    })
  })
})
