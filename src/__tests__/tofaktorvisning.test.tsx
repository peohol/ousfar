// @vitest-environment jsdom
/**
 * Skjermbildene for tofaktor (S4 tiltak 7): kodesteget i porten og
 * innmeldingen, lista og fjerningen under Konto. Kallene er erstattet; de
 * prøves i `tofaktor.test.tsx`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Faktor } from '../auth/tofaktor'

const okt = vi.hoisted(() => ({
  loggInnMedKode: vi.fn(async (_kode: string): Promise<string | null> => null),
  loggUt: vi.fn(async () => {}),
}))
vi.mock('../auth/okt', () => ({
  useOkt: () => ({ tilgang: 'kode', mangler: false, ...okt }),
}))

const tf = vi.hoisted(() => ({
  faktorer: [] as Faktor[],
}))
const api = vi.hoisted(() => ({
  hentFaktorer: vi.fn(async () => tf.faktorer),
  meldInn: vi.fn(async (_navn: string) => ({ id: 'ny', qr: 'data:image/svg+xml;utf-8,<svg/>', hemmelighet: 'ABCDEFGHIJKLMNOP' })),
  avbrytInnmelding: vi.fn(async (_id: string) => {}),
  bekreftInnmelding: vi.fn(async (_id: string, _kode: string): Promise<string | null> => null),
  fjernFaktor: vi.fn(async (_id: string) => {}),
}))
vi.mock('../auth/tofaktor', async (original) => ({ ...(await original<typeof import('../auth/tofaktor')>()), ...api }))

const { Port } = await import('../components/konto/Port')
const { Tofaktor } = await import('../components/konto/Tofaktor')

const TELEFON: Faktor = { id: 'a', navn: 'Jobbtelefon', laget: '2026-11-01T10:00:00Z' }

beforeEach(() => {
  tf.faktorer = []
  vi.clearAllMocks()
})
afterEach(cleanup)

describe('kodesteget i porten', () => {
  it('spør om koden med et felt for engangskoder, og sender den', async () => {
    render(<Port />)
    const kort = screen.getByRole('region', { name: 'Kode fra appen' })
    const felt = within(kort).getByLabelText('Kode')
    expect(felt.getAttribute('autocomplete')).toBe('one-time-code')
    expect(felt.getAttribute('inputmode')).toBe('numeric')
    expect(document.activeElement).toBe(felt)
    await userEvent.type(felt, '123456{Enter}')
    expect(okt.loggInnMedKode).toHaveBeenCalledWith('123456')
    expect(within(kort).queryByLabelText('Brukernavn')).toBeNull()
  })

  it('viser feilen og tømmer feltet når koden ikke stemmer, og har en vei ut', async () => {
    okt.loggInnMedKode.mockResolvedValueOnce('Koden stemmer ikke.')
    render(<Port />)
    const felt = screen.getByLabelText('Kode')
    await userEvent.type(felt, '000000{Enter}')
    expect((await screen.findByRole('alert')).textContent).toBe('Koden stemmer ikke.')
    expect((felt as HTMLInputElement).value).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Logg ut' }))
    expect(okt.loggUt).toHaveBeenCalled()
  })
})

describe('tofaktor under Konto', () => {
  it('melder inn en app med QR-kode, nøkkelen for hånd og den første koden', async () => {
    render(<Tofaktor />)
    expect(await screen.findByText('Du har ingen autentiseringsapp lagt til.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Legg til en autentiseringsapp' }))
    expect(api.meldInn).toHaveBeenCalledWith('Telefonen min')
    const qr = await screen.findByRole('img', { name: 'QR-kode for autentiseringsappen' })
    expect(qr.getAttribute('src')).toBe('data:image/svg+xml;utf-8,<svg/>')
    expect(screen.getByText('ABCD EFGH IJKL MNOP')).toBeTruthy()

    tf.faktorer = [{ id: 'ny', navn: 'Telefonen min', laget: '2026-11-15T12:00:00Z' }]
    await userEvent.type(screen.getByLabelText('Koden appen viser'), '654321')
    await userEvent.click(screen.getByRole('button', { name: 'Bekreft' }))
    expect(api.bekreftInnmelding).toHaveBeenCalledWith('ny', '654321')
    expect((await screen.findByRole('status')).textContent).toMatch(/^Appen er lagt til/)
    expect(screen.getByText('Telefonen min')).toBeTruthy()
    // Den bekreftede innmeldingen blir stående.
    expect(api.avbrytInnmelding).not.toHaveBeenCalled()
  })

  it('viser en feil kode og lar innmeldingen stå åpen', async () => {
    api.bekreftInnmelding.mockResolvedValueOnce('Koden stemmer ikke.')
    render(<Tofaktor />)
    await userEvent.click(await screen.findByRole('button', { name: 'Legg til en autentiseringsapp' }))
    await userEvent.type(await screen.findByLabelText('Koden appen viser'), '111111{Enter}')
    expect((await screen.findByRole('alert')).textContent).toBe('Koden stemmer ikke.')
    expect(screen.getByRole('img', { name: 'QR-kode for autentiseringsappen' })).toBeTruthy()
  })

  it('fjerner innmeldingen som avbrytes, og den som står åpen når panelet lukkes', async () => {
    const { unmount } = render(<Tofaktor />)
    await userEvent.click(await screen.findByRole('button', { name: 'Legg til en autentiseringsapp' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Avbryt' }))
    await waitFor(() => expect(api.avbrytInnmelding).toHaveBeenCalledWith('ny'))

    api.avbrytInnmelding.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'Legg til en autentiseringsapp' }))
    await screen.findByLabelText('Koden appen viser')
    unmount()
    expect(api.avbrytInnmelding).toHaveBeenCalledWith('ny')
  })

  it('fjerner en egen app etter en bekreftelse som sier hva som skjer', async () => {
    tf.faktorer = [TELEFON]
    render(<Tofaktor />)
    await userEvent.click(await screen.findByRole('button', { name: 'Fjern' }))
    const kort = screen.getByRole('group', { name: 'Fjerne «Jobbtelefon»?' })
    expect(kort.textContent).toMatch(/eneste appen din\. Etterpå logger du inn med passordet alene/)
    tf.faktorer = []
    await userEvent.click(within(kort).getByRole('button', { name: 'Fjern appen' }))
    expect(api.fjernFaktor).toHaveBeenCalledWith('a')
    expect((await screen.findByRole('status')).textContent).toBe('«Jobbtelefon» er fjernet.')
  })

  it('tilbyr ikke en tredje app', async () => {
    tf.faktorer = [TELEFON, { id: 'b', navn: 'Privat', laget: '2026-11-02T10:00:00Z' }]
    render(<Tofaktor />)
    await screen.findByText('Privat')
    expect(screen.queryByRole('button', { name: 'Legg til en autentiseringsapp' })).toBeNull()
  })
})
