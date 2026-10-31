// @vitest-environment jsdom
/**
 * Nødstoppen i administrasjonsmenyen (P11.6): en administrator deaktiverer
 * alle verktøyene, ett verktøy eller én klinisk godkjent regel med en grunn,
 * ser de aktive sperrene og historikken, og opphever en sperre med en grunn.
 * Tilgangen avgjøres i databasen (`verktoysperrer.test.ts`).
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Verktoysperrer } from '../components/konto/Verktoysperrer'
import { glemBildet } from '../oppdatering/bevaring'
import type { Sperrehistorikk, Verktoysperrelager } from '../verktoy/sperrer'

beforeEach(() => {
  sessionStorage.clear()
  glemBildet()
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.open = true
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.open = false
  }
})
afterEach(cleanup)

/** Et lager i minnet med de samme reglene som databasen: én aktiv sperre per mål. */
function minnelager(): Verktoysperrelager & { rader: Sperrehistorikk[] } {
  const rader: Sperrehistorikk[] = []
  let n = 0
  return {
    rader,
    les: async () => rader.filter((r) => !r.opphevet_kl),
    historikk: async () => [...rader].reverse(),
    sett: vi.fn(async (omfang, mal, grunn) => {
      if (rader.some((r) => !r.opphevet_kl && r.omfang === omfang && r.mal === mal)) throw new Error('Det er allerede en aktiv sperre for dette.')
      const id = `s${++n}`
      rader.push({ id, omfang, mal, grunn, satt_kl: '2026-11-01T08:00:00Z', satt_av: 'Ada Admin', opphevet_kl: null, opphevet_av: null, opphevet_grunn: null })
      return id
    }),
    opphev: vi.fn(async (id, grunn) => {
      Object.assign(rader.find((r) => r.id === id)!, { opphevet_kl: '2026-11-01T09:00:00Z', opphevet_av: 'Ada Admin', opphevet_grunn: grunn })
    }),
  }
}

describe('nødstoppen i administrasjonsmenyen', () => {
  it('deaktiverer ett verktøy med en grunn, viser sperren og opphever den med en grunn', async () => {
    const user = userEvent.setup()
    const lager = minnelager()
    render(<Verktoysperrer apen onLukk={() => {}} lager={lager} />)
    expect(await screen.findByText('Ingen sperrer. Verktøyene er tilgjengelige.')).toBeTruthy()

    // Uten mål eller grunn settes ingen sperre.
    await user.click(screen.getByRole('button', { name: 'Deaktiver nå' }))
    expect(screen.getByRole('alert').textContent).toBe('Velg verktøyet som skal deaktiveres.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Verktøyet' }), 'bytte-antipsykotikum')
    await user.click(screen.getByRole('button', { name: 'Deaktiver nå' }))
    expect(screen.getByRole('alert').textContent).toBe('Skriv grunnen til sperren, minst fem tegn.')
    expect(lager.sett).not.toHaveBeenCalled()

    await user.type(screen.getByRole('textbox', { name: 'Grunn' }), 'Syntetisk feil i pilot.')
    await user.click(screen.getByRole('button', { name: 'Deaktiver nå' }))
    expect(lager.sett).toHaveBeenCalledWith('verktoy', 'bytte-antipsykotikum', 'Syntetisk feil i pilot.')
    const aktive = screen.getByRole('region', { name: 'Aktive sperrer' })
    expect(await within(aktive).findByText('Verktøyet «Bytte antipsykotikum»')).toBeTruthy()
    expect(within(aktive).getByText('Syntetisk feil i pilot.')).toBeTruthy()
    // Skjemaet er tømt.
    expect((screen.getByRole('textbox', { name: 'Grunn' }) as HTMLInputElement).value).toBe('')

    // Én aktiv sperre per mål: databasens svar vises.
    await user.selectOptions(screen.getByRole('combobox', { name: 'Verktøyet' }), 'bytte-antipsykotikum')
    await user.type(screen.getByRole('textbox', { name: 'Grunn' }), 'En gang til.')
    await user.click(screen.getByRole('button', { name: 'Deaktiver nå' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Det er allerede en aktiv sperre for dette.')

    // Opphevingen krever en grunn.
    await user.click(within(aktive).getByRole('button', { name: 'Opphev sperren' }))
    expect(screen.getByRole('alert').textContent).toBe('Skriv hvorfor sperren kan oppheves, minst fem tegn.')
    await user.type(within(aktive).getByRole('textbox', { name: 'Hvorfor kan sperren oppheves?' }), 'Rettet og kontrollert.')
    await user.click(within(aktive).getByRole('button', { name: 'Opphev sperren' }))
    expect(lager.opphev).toHaveBeenCalledWith('s1', 'Rettet og kontrollert.')
    expect(await screen.findByText('Ingen sperrer. Verktøyene er tilgjengelige.')).toBeTruthy()
    const historikk = screen.getByRole('region', { name: 'Opphevede sperrer' })
    expect(historikk.textContent).toMatch(/Verktøyet «Bytte antipsykotikum»Syntetisk feil i pilot\.Satt 01\.11\.2026.*av Ada Admin\. Opphevet 01\.11\.2026.*av Ada Admin: Rettet og kontrollert\./)
  })

  it('tilbyr bare de klinisk godkjente reglene, og kan deaktivere alle verktøyene uten mål', async () => {
    const user = userEvent.setup()
    const lager = minnelager()
    render(<Verktoysperrer apen onLukk={() => {}} lager={lager} />)
    await screen.findByText('Ingen sperrer. Verktøyene er tilgjengelige.')
    await user.click(screen.getByRole('radio', { name: 'Én klinisk godkjent regel' }))
    const regler = within(screen.getByRole('combobox', { name: 'Regelen' })).getAllByRole('option').slice(1).map((o) => o.getAttribute('value'))
    expect(regler.sort()).toEqual(['depot-aripiprazol-maintena', 'depot-paliperidon-xeplion', 'kryssnedtrapping-sertralin-mirtazapin', 'seponering-agomelatin', 'seponering-bupropion', 'seponering-vortioksetin'])
    await user.click(screen.getByRole('radio', { name: 'Alle verktøyene' }))
    expect(screen.queryByRole('combobox')).toBeNull()
    await user.type(screen.getByRole('textbox', { name: 'Grunn' }), 'Kritisk feil i motoren.')
    await user.click(screen.getByRole('button', { name: 'Deaktiver nå' }))
    expect(lager.sett).toHaveBeenCalledWith('alle', null, 'Kritisk feil i motoren.')
    expect(await within(screen.getByRole('region', { name: 'Aktive sperrer' })).findByText('Alle verktøyene')).toBeTruthy()
  })
})
