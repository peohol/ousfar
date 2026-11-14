// @vitest-environment jsdom
/**
 * En innlogget uten aktivt medlemskap (P2.0): databasen gir ingen profil, og
 * økten skal da spørre om medlemskapet og vise beskjeden i stedet for å logge
 * ut eller vise tomme sider. Det som er lagret i nettleseren, tømmes.
 *
 * Databasen er erstattet; reglene den håndhever, prøves i
 * `aktivtmedlemskap.test.ts`.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Medlemskapsstatus } from '../auth/api'
import { tilgangFor } from '../domain/tilgang'

const db = vi.hoisted(() => ({
  profil: null as Profil | null,
  status: 'avsluttet' as Medlemskapsstatus,
  medlemskapsfeil: false,
}))

const api = vi.hoisted(() => ({
  hentProfil: vi.fn(async () => db.profil),
  hentMedlemskapsstatus: vi.fn(async () => {
    if (db.medlemskapsfeil) throw new Error('nede')
    return db.status
  }),
  loggUt: vi.fn(async () => {}),
  loggInn: vi.fn(async () => null),
}))
const tom = vi.hoisted(() => vi.fn(async () => {}))

vi.mock('../auth/api', () => api)
vi.mock('../auth/mellomlager', () => ({ tomMellomlageret: tom }))
vi.mock('../auth/klient', () => ({
  erKonfigurert: () => true,
  klient: () => ({
    auth: {
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      getSession: async () => ({ data: { session: { user: { id: 'bruker-1' } } } }),
    },
  }),
}))

const { OktProvider, useOkt } = await import('../auth/okt')

function Vis() {
  return <p data-testid="tilgang">{useOkt().tilgang}</p>
}

const PROFIL: Profil = {
  id: 'bruker-1',
  username: 'kari.n',
  first_name: 'Kari',
  last_name: 'Nordmann',
  role: 'user',
  avatar_path: null,
  must_change_password: false,
  onboarding_completed: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}

beforeEach(() => {
  db.profil = null
  db.status = 'avsluttet'
  db.medlemskapsfeil = false
  vi.clearAllMocks()
})
afterEach(cleanup)

async function tilgang() {
  render(
    <OktProvider>
      <Vis />
    </OktProvider>,
  )
  await waitFor(() => expect(screen.getByTestId('tilgang').textContent).not.toBe('venter'))
  return screen.getByTestId('tilgang').textContent
}

describe('økten uten aktivt medlemskap', () => {
  it('viser beskjeden, tømmer mellomlageret og logger ikke ut av seg selv', async () => {
    expect(await tilgang()).toBe('avsluttet')
    expect(api.hentMedlemskapsstatus).toHaveBeenCalledTimes(1)
    expect(tom).toHaveBeenCalled()
    expect(api.loggUt).not.toHaveBeenCalled()
  })

  it.each(['ingen_konto', 'aktiv'] as const)(
    'logger ut som før, uten beskjeden og uten å tømme noe selv, når statusen er %s',
    async (status) => {
      // `ingen_konto`: kontoen er slettet mens tokenet fortsatt gjelder.
      db.status = status
      render(
        <OktProvider>
          <Vis />
        </OktProvider>,
      )
      await waitFor(() => expect(api.loggUt).toHaveBeenCalled())
      expect(screen.getByTestId('tilgang').textContent).not.toBe('avsluttet')
      expect(tom).not.toHaveBeenCalled()
    },
  )

  it('viser kontaktfeilen når spørsmålet om medlemskapet ikke får svar', async () => {
    db.medlemskapsfeil = true
    expect(await tilgang()).toBe('feil')
  })

  it('spør ikke om medlemskapet når profilen kommer', async () => {
    db.profil = PROFIL
    expect(await tilgang()).toBe('app')
    expect(api.hentMedlemskapsstatus).not.toHaveBeenCalled()
  })
})

describe('regelen for hva porten viser', () => {
  const grunn = { klar: true, harOkt: true, profil: null, profilfeil: false }
  it('viser beskjeden om avsluttet medlemskap bare for en innlogget, og kontaktfeilen foran den', () => {
    expect(tilgangFor({ ...grunn, avsluttet: true })).toBe('avsluttet')
    expect(tilgangFor({ ...grunn, harOkt: false, avsluttet: true })).toBe('innlogging')
    expect(tilgangFor({ ...grunn, profilfeil: true, avsluttet: true })).toBe('feil')
    expect(tilgangFor({ ...grunn, klar: false, avsluttet: true })).toBe('venter')
    expect(tilgangFor(grunn)).toBe('venter')
  })
})
