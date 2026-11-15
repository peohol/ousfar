// @vitest-environment jsdom
/**
 * Tofaktor med autentiseringsapp (`src/auth/tofaktor.ts`, S4 tiltak 7):
 * kallene mot Supabase Auth, og at økten spør om koden før noe annet når
 * kontoen har en app. Supabase Auth er erstattet her; selve innmeldingen og
 * kodene mot en ekte Auth prøves i `scripts/sikkerhetskopi-prove.ts` og i det
 * lokale testmiljøet.
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'

interface Faktorrad {
  id: string
  friendly_name: string
  factor_type: 'totp'
  status: 'verified' | 'unverified'
  created_at: string
  updated_at: string
}

const auth = vi.hoisted(() => ({
  faktorer: [] as Faktorrad[],
  /** Koden hver faktor godtar. */
  koder: {} as Record<string, string>,
  naa: 'aal1' as 'aal1' | 'aal2',
  lytter: null as null | ((hendelse: string, okt: unknown) => void),
}))

const mfa = vi.hoisted(() => ({
  listFactors: vi.fn(async () => ({ data: { all: auth.faktorer, totp: auth.faktorer.filter((f) => f.status === 'verified') }, error: null })),
  enroll: vi.fn(async ({ friendlyName }: { friendlyName: string }) => {
    const id = `ny-${auth.faktorer.length}`
    auth.faktorer.push({ id, friendly_name: friendlyName, factor_type: 'totp', status: 'unverified', created_at: '2026-11-15T12:00:00Z', updated_at: '' })
    return { data: { id, totp: { qr_code: '<svg/>', secret: 'ABCDEFGHIJKL', uri: '' } }, error: null }
  }),
  unenroll: vi.fn(async ({ factorId }: { factorId: string }) => {
    auth.faktorer = auth.faktorer.filter((f) => f.id !== factorId)
    return { data: { id: factorId }, error: null }
  }),
  challengeAndVerify: vi.fn(async ({ factorId, code }: { factorId: string; code: string }) => {
    if (auth.koder[factorId] !== code) return { data: null, error: new Error('Invalid TOTP code') }
    auth.faktorer = auth.faktorer.map((f) => (f.id === factorId ? { ...f, status: 'verified' } : f))
    auth.naa = 'aal2'
    auth.lytter?.('MFA_CHALLENGE_VERIFIED', { user: { id: 'bruker-1' }, access_token: 'aal2' })
    return { data: {}, error: null }
  }),
  getAuthenticatorAssuranceLevel: vi.fn(async () => ({
    data: { currentLevel: auth.naa, nextLevel: auth.faktorer.some((f) => f.status === 'verified') ? 'aal2' : 'aal1' },
    error: null,
  })),
}))

vi.mock('../auth/klient', () => ({
  erKonfigurert: () => true,
  klient: () => ({
    auth: {
      mfa,
      onAuthStateChange: (lytter: (hendelse: string, okt: unknown) => void) => {
        auth.lytter = lytter
        return { data: { subscription: { unsubscribe() {} } } }
      },
      getSession: async () => ({ data: { session: { user: { id: 'bruker-1' }, access_token: 'aal1' } } }),
    },
  }),
}))

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

vi.mock('../auth/api', () => ({
  hentProfil: vi.fn(async () => PROFIL),
  hentMedlemskapsstatus: vi.fn(async () => 'aktiv'),
  loggUt: vi.fn(async () => {}),
  loggInn: vi.fn(async () => null),
}))
vi.mock('../auth/mellomlager', () => ({ tomMellomlageret: vi.fn(async () => {}) }))
vi.mock('../auth/oktskifte', () => ({ meldOktskifte: vi.fn() }))

const tofaktor = await import('../auth/tofaktor')
const { OktProvider, useOkt } = await import('../auth/okt')

const faktor = (id: string, navn: string, status: Faktorrad['status'] = 'verified', laget = '2026-11-01T00:00:00Z'): Faktorrad => ({
  id,
  friendly_name: navn,
  factor_type: 'totp',
  status,
  created_at: laget,
  updated_at: laget,
})

beforeEach(() => {
  auth.faktorer = []
  auth.koder = {}
  auth.naa = 'aal1'
  auth.lytter = null
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('koden', () => {
  it('godtar seks sifre, også med mellomrom, og ingenting annet', () => {
    expect(tofaktor.lesKode(' 123 456 ')).toEqual({ kode: '123456' })
    for (const feil of ['12345', '1234567', '12345a', '']) expect(tofaktor.lesKode(feil)).toEqual({ feil: 'Koden har 6 sifre.' })
  })
})

describe('innmeldingen', () => {
  it('gir QR-koden som bildeadresse og hemmeligheten, med OUSFAR som utsteder', async () => {
    const ny = await tofaktor.meldInn('  Telefonen min ')
    expect(ny).toEqual({ id: 'ny-0', qr: 'data:image/svg+xml;utf-8,<svg/>', hemmelighet: 'ABCDEFGHIJKL' })
    expect(mfa.enroll).toHaveBeenCalledWith({ factorType: 'totp', friendlyName: 'Telefonen min', issuer: 'OUSFAR' })
  })

  it('rydder bort en innmelding som aldri ble bekreftet, før en ny begynner', async () => {
    auth.faktorer = [faktor('gammel', 'Telefonen min', 'unverified')]
    await tofaktor.meldInn('Telefonen min')
    expect(mfa.unenroll).toHaveBeenCalledWith({ factorId: 'gammel' })
    expect(auth.faktorer.map((f) => f.id)).toEqual(['ny-0'])
  })

  it('stopper ved to apper, ved et navn som er tatt og uten navn', async () => {
    auth.faktorer = [faktor('a', 'Jobbtelefon'), faktor('b', 'Privat')]
    await expect(tofaktor.meldInn('Ny')).rejects.toThrow('Du kan ha 2 apper.')
    auth.faktorer = [faktor('a', 'Jobbtelefon')]
    await expect(tofaktor.meldInn('jobbtelefon')).rejects.toThrow('Du har alt en app med det navnet.')
    await expect(tofaktor.meldInn('  ')).rejects.toThrow('Gi appen et navn')
    expect(mfa.enroll).not.toHaveBeenCalled()
  })

  it('bekreftes med den første koden, og sier fra om en feil kode', async () => {
    const { id } = await tofaktor.meldInn('Telefonen min')
    auth.koder[id] = '654321'
    expect(await tofaktor.bekreftInnmelding(id, '111111')).toMatch(/^Koden stemmer ikke/)
    expect(await tofaktor.bekreftInnmelding(id, '12')).toBe('Koden har 6 sifre.')
    expect(await tofaktor.bekreftInnmelding(id, '654 321')).toBeNull()
    expect(await tofaktor.hentFaktorer()).toEqual([{ id, navn: 'Telefonen min', laget: '2026-11-15T12:00:00Z' }])
  })

  it('viser bare bekreftede apper, eldst først', async () => {
    auth.faktorer = [faktor('b', 'Ny', 'verified', '2026-11-10T00:00:00Z'), faktor('u', 'Halv', 'unverified'), faktor('a', 'Gammel', 'verified', '2026-10-01T00:00:00Z')]
    expect((await tofaktor.hentFaktorer()).map((f) => f.navn)).toEqual(['Gammel', 'Ny'])
  })
})

describe('innloggingen', () => {
  it('trenger koden bare når kontoen har en bekreftet app og økten mangler den', async () => {
    expect(await tofaktor.trengerKode()).toBe(false)
    auth.faktorer = [faktor('u', 'Halv', 'unverified')]
    expect(await tofaktor.trengerKode()).toBe(false)
    auth.faktorer = [faktor('a', 'Telefonen')]
    expect(await tofaktor.trengerKode()).toBe(true)
    auth.naa = 'aal2'
    expect(await tofaktor.trengerKode()).toBe(false)
  })

  it('prøver koden mot begge appene, så det ikke betyr noe hvilken telefon den kom fra', async () => {
    auth.faktorer = [faktor('a', 'Gammel'), faktor('b', 'Ny')]
    auth.koder = { a: '111111', b: '222222' }
    expect(await tofaktor.loggInnMedKode('222222')).toBeNull()
    expect(mfa.challengeAndVerify).toHaveBeenCalledTimes(2)
    expect(await tofaktor.loggInnMedKode('333333')).toMatch(/^Koden stemmer ikke/)
  })
})

function Vis() {
  const { tilgang } = useOkt()
  return <p data-testid="tilgang">{tilgang}</p>
}

describe('økten', () => {
  it('slipper inn en konto uten app med passordet alene, som før', async () => {
    render(
      <OktProvider>
        <Vis />
      </OktProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('tilgang').textContent).toBe('app'))
  })

  it('viser kodesteget for en konto med app, og appen først når koden er godtatt', async () => {
    auth.faktorer = [faktor('a', 'Telefonen')]
    auth.koder = { a: '123456' }
    let loggInnMedKode: ((kode: string) => Promise<string | null>) | null = null
    function MedKode() {
      loggInnMedKode = useOkt().loggInnMedKode
      return <Vis />
    }
    render(
      <OktProvider>
        <MedKode />
      </OktProvider>,
    )
    await waitFor(() => expect(screen.getByTestId('tilgang').textContent).toBe('kode'))
    expect(await loggInnMedKode!('000000')).toMatch(/^Koden stemmer ikke/)
    expect(screen.getByTestId('tilgang').textContent).toBe('kode')
    expect(await loggInnMedKode!('123456')).toBeNull()
    await waitFor(() => expect(screen.getByTestId('tilgang').textContent).toBe('app'))
  })
})
