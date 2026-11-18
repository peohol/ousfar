// @vitest-environment jsdom
/**
 * P6b: oppgavene på gruppesiden (`#/grupper/<ID>/oppgaver`): lista med mine
 * oppgaver øverst og de fullførte i en skuff, en ny oppgave, og at det å
 * tildele, endre og fjerne bare vises for de ansvarlige, mens den som har
 * oppgaven, setter statusen. Kallene er erstattet; reglene selv prøves mot
 * databasen i `gruppesamhandling.test.ts`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'

const GRUPPE = '0f1e2d3c-4b5a-4968-8776-655443322110'
const O1 = '11111111-2222-4333-8444-555555555555'
const O2 = '22222222-3333-4444-8555-666666666666'
const IDE = '33333333-4444-4555-8666-777777777777'

const MEG: Profil = {
  id: 'meg',
  username: 'mona.m',
  first_name: 'Mona',
  last_name: 'Medlem',
  role: 'user',
  avatar_path: null,
  must_change_password: false,
  onboarding_completed: true,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
}
const OLA = { ...MEG, id: 'ola', username: 'ola.o', first_name: 'Ola', last_name: 'Olsen' }

const medlem = (p: Profil, ekstra: Record<string, unknown> = {}) => ({
  ...p,
  rolle: 'medlem',
  status: 'aktiv',
  fra: '2026-11-01T00:00:00Z',
  aktiv_fra: '2026-11-01T00:00:00Z',
  har_tilgang: true,
  kan_fjerne: false,
  kan_endre_rolle: false,
  siste_ansvarlige: false,
  ...ekstra,
})

const oppgave = (id: string, tittel: string, ekstra: Record<string, unknown> = {}) => ({
  id,
  gruppe_id: GRUPPE,
  tittel,
  beskrivelse: null,
  ansvarlig_id: null,
  ansvarlig_har_tilgang: false,
  prioritet: 'normal',
  status: 'ikke_paabegynt',
  foreslatt_av: null,
  opprettet_av: 'ola',
  opprettet_kl: '2026-11-17T08:00:00Z',
  endret_kl: null,
  status_kl: '2026-11-17T08:00:00Z',
  fullfort_kl: null,
  ide: null,
  kan_endre: false,
  kan_sette_status: false,
  lest_kl: '2026-11-17T12:00:00Z',
  ...ekstra,
})

const OPPGAVER = [
  oppgave(O1, 'Skriv sjekklisten', { ansvarlig_id: 'meg', ansvarlig_har_tilgang: true, prioritet: 'hoy', status: 'paagaar', kan_sette_status: true }),
  oppgave(O2, 'Les gjennom rutinen', { ide: { id: IDE, tittel: 'Rutine', kommentarer: 2 }, foreslatt_av: 'ola' }),
  oppgave('o3', 'Ferdig sak', { status: 'fullfort', fullfort_kl: '2026-11-17T09:00:00Z' }),
]

const OVERSIKT = {
  id: GRUPPE,
  navn: 'Lithiumgruppen',
  beskrivelse: '',
  art: 'tverrfaglig',
  status: 'aktiv',
  fagmiljo: null,
  opprettet_kl: '2026-11-01T00:00:00Z',
  rolle: 'medlem',
  kan_styre: false,
  kan_moderere: false,
  kan_forlate: true,
  kan_gjenapne: false,
  medlemmer: [medlem(MEG), medlem(OLA, { rolle: 'ansvarlig' }), medlem({ ...OLA, id: 'borte', first_name: 'Borte' }, { har_tilgang: false })],
  samhandling: { nye_ideer: 0, venter: 0, mine_oppgaver: 1 },
}

const tilstand = vi.hoisted(() => ({ ansvarlig: false }))

const grupperApi = vi.hoisted(() => ({
  hentGruppeoversikt: vi.fn(),
  hentGruppeoppgaver: vi.fn(),
  hentGruppeoppgave: vi.fn(),
  opprettGruppeoppgave: vi.fn(async () => 'ny-oppgave'),
  endreGruppeoppgave: vi.fn(async () => {}),
  tildelGruppeoppgave: vi.fn(async () => {}),
  settGruppeoppgavestatus: vi.fn(async () => {}),
  fjernGruppeoppgave: vi.fn(async () => {}),
  merkGruppeoppgaveSett: vi.fn(async () => {}),
  gjorOmTilGruppeoppgave: vi.fn(async () => O1),
}))

vi.mock('../auth/okt', () => ({ useProfil: () => MEG, useOkt: () => ({}) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [MEG, OLA]) }))
vi.mock('../grupper/api', async (original) => ({ ...(await original<object>()), ...grupperApi }))
vi.mock('../ideer/api', () => ({
  hentIdetraad: vi.fn(async () => null),
  merkIdeSett: vi.fn(async () => {}),
  hentGruppeideer: vi.fn(async () => ({ kan_skrive: false, kan_behandle: false, ideer: [] })),
}))

const { Gruppeflate } = await import('../components/grupper/Gruppeflate')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt } = await import('../grupper/modell')
const { lesGruppeoppgave, lesGruppeoppgaveliste } = await import('../grupper/oppgaver')

beforeAll(() => {
  Element.prototype.scrollIntoView ??= function () {}
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  document.elementFromPoint ??= () => null
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

/** Det databasen svarer: de ansvarlige kan endre alt. */
const somDatabasen = <T extends { kan_endre: boolean; kan_sette_status: boolean }>(o: T): T =>
  tilstand.ansvarlig ? { ...o, kan_endre: true, kan_sette_status: true } : o

/** Arbeidsflaten med oppgavene i gruppen. */
const flate = (element?: string) => (
  <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
    <Gruppeflate gruppe={GRUPPE} fane="oppgaver" element={element} />
  </GruppekildeProvider>
)

function vis(element?: string) {
  window.history.replaceState(null, '', `#/grupper/${GRUPPE}/oppgaver${element ? `/${element}` : ''}`)
  return render(flate(element))
}

beforeEach(() => {
  window.scrollTo = () => undefined
  window.history.replaceState(null, '', '#/')
  tilstand.ansvarlig = false
  grupperApi.hentGruppeoversikt.mockImplementation(async () =>
    lesGruppeoversikt(tilstand.ansvarlig ? { ...OVERSIKT, rolle: 'ansvarlig', kan_styre: true } : OVERSIKT),
  )
  grupperApi.hentGruppeoppgaver.mockImplementation(async () =>
    lesGruppeoppgaveliste({ kan_opprette: tilstand.ansvarlig, oppgaver: OPPGAVER.map(somDatabasen) }),
  )
  grupperApi.hentGruppeoppgave.mockImplementation(async (id: string) => lesGruppeoppgave(somDatabasen(OPPGAVER.find((o) => o.id === id)!)))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('lista', () => {
  it('har mine oppgaver øverst, de andre under og de fullførte i en skuff', async () => {
    vis()
    expect(await screen.findByRole('heading', { level: 2, name: 'Oppgaver for Lithiumgruppen' })).toBeTruthy()
    const mine = await screen.findByRole('region', { name: /Mine oppgaver/ })
    expect(within(mine).getByRole('button', { name: /Skriv sjekklisten/ }).textContent).toMatch(/Pågår.*Høy prioritet/)
    const andre = screen.getByRole('region', { name: /De andre oppgavene/ })
    expect(within(andre).getByRole('button').textContent).toMatch(/Ingen har oppgaven.*Ikke påbegynt.*Fra en idé/)
    expect(screen.getByRole('button', { name: /Fullført/ })).toBeTruthy()
    // Et vanlig medlem oppretter ikke oppgaver.
    expect(screen.queryByRole('button', { name: 'Ny oppgave' })).toBeNull()
    await userEvent.click(within(andre).getByRole('button'))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/${O2}`)
  })

  it('lar de ansvarlige opprette en oppgave og gi den til et aktivt medlem', async () => {
    tilstand.ansvarlig = true
    vis()
    await userEvent.click(await screen.findByRole('button', { name: 'Ny oppgave' }))
    const skjema = screen.getByRole('form', { name: 'Ny oppgave' })
    // Bare de aktive medlemmene med tilgang kan få oppgaven.
    expect(within(skjema).getAllByRole('option').map((o) => o.textContent)).toEqual(['Ingen ennå', 'Mona Medlem', 'Ola Olsen'])
    await userEvent.type(within(skjema).getByLabelText('Overskrift'), 'Bestill kurs')
    await userEvent.click(within(skjema).getByRole('button', { name: 'Lav' }))
    await userEvent.selectOptions(within(skjema).getByLabelText('Hvem har oppgaven'), 'ola')
    await userEvent.click(within(skjema).getByRole('button', { name: 'Opprett oppgaven' }))
    expect(grupperApi.opprettGruppeoppgave).toHaveBeenCalledWith(GRUPPE, { tittel: 'Bestill kurs', beskrivelse: null, prioritet: 'lav' }, 'ola')
    await waitFor(() => expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/ny-oppgave`))
  })
})

describe('én oppgave', () => {
  it('lar den som har oppgaven sette statusen, men ikke tildele, endre eller fjerne den', async () => {
    vis(O1)
    const overskrift = await screen.findByRole('heading', { level: 2, name: 'Skriv sjekklisten' })
    // Fokus står på overskriften, og varslene fram til lesingen merkes lest.
    await waitFor(() => expect(document.activeElement).toBe(overskrift))
    await waitFor(() => expect(grupperApi.merkGruppeoppgaveSett).toHaveBeenCalledWith(O1, '2026-11-17T12:00:00Z'))
    const status = screen.getByRole('group', { name: 'Status' })
    expect(within(status).getByRole('button', { name: 'Pågår' }).getAttribute('aria-pressed')).toBe('true')
    await userEvent.click(within(status).getByRole('button', { name: 'Fullført' }))
    expect(grupperApi.settGruppeoppgavestatus).toHaveBeenCalledWith(O1, 'fullfort')
    expect(screen.queryByLabelText('Hvem har oppgaven')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Fjern oppgaven' })).toBeNull()
  })

  it('viser ingen styring for et medlem som ikke har oppgaven, men opphavet og idéen', async () => {
    vis(O2)
    await screen.findByRole('heading', { level: 2, name: 'Les gjennom rutinen' })
    expect(screen.queryByRole('group', { name: 'Status' })).toBeNull()
    const lenke = screen.getByRole('link', { name: '«Rutine»' })
    expect(lenke.getAttribute('href')).toBe(`#/grupper/${GRUPPE}/ideer/${IDE}`)
    expect(screen.getByText(/av Ola Olsen, gjort om av Ola Olsen/)).toBeTruthy()
    expect(screen.getByRole('heading', { level: 3, name: 'Idéen oppgaven kom fra' })).toBeTruthy()
  })

  it('lar de ansvarlige tildele og fjerne, med bekreftelse og beskjed om at idéen åpnes igjen', async () => {
    tilstand.ansvarlig = true
    vis(O2)
    await screen.findByRole('heading', { level: 2, name: 'Les gjennom rutinen' })
    await userEvent.selectOptions(screen.getByLabelText('Hvem har oppgaven'), 'meg')
    expect(grupperApi.tildelGruppeoppgave).toHaveBeenCalledWith(O2, 'meg')
    await userEvent.click(screen.getByRole('button', { name: 'Fjern oppgaven' }))
    const bekreft = screen.getByRole('group', { name: 'Fjerne «Les gjennom rutinen»?' })
    expect(bekreft.textContent).toMatch(/står åpen i idéene igjen/)
    await userEvent.click(within(bekreft).getByRole('button', { name: 'Fjern oppgaven' }))
    expect(grupperApi.fjernGruppeoppgave).toHaveBeenCalledWith(O2)
    await waitFor(() => expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver`))
  })

  it('sier fra når den som har oppgaven, ikke lenger er med', async () => {
    grupperApi.hentGruppeoppgave.mockImplementation(async () =>
      lesGruppeoppgave(oppgave(O1, 'Gammel', { ansvarlig_id: 'borte', ansvarlig_har_tilgang: false })),
    )
    vis(O1)
    expect((await screen.findByRole('note')).textContent).toMatch(/ikke lenger med i gruppen/)
  })

  it('viser ikke en oppgave fra en annen gruppe under gruppens navn', async () => {
    grupperApi.hentGruppeoppgave.mockImplementation(async () => lesGruppeoppgave(oppgave(O1, 'Fra en annen gruppe', { gruppe_id: 'en-annen-gruppe' })))
    vis(O1)
    expect(await screen.findByText(/Oppgaven finnes ikke lenger/)).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Fra en annen gruppe' })).toBeNull()
    expect(grupperApi.merkGruppeoppgaveSett).not.toHaveBeenCalled()
  })

  it('setter fokus tilbake på kortet man kom fra', async () => {
    const { rerender } = vis()
    const kort = await screen.findByRole('button', { name: /Les gjennom rutinen/ })
    await userEvent.click(kort)
    rerender(flate(O2))
    await screen.findByRole('heading', { level: 2, name: 'Les gjennom rutinen' })
    rerender(flate())
    await waitFor(() => expect(document.activeElement?.textContent).toMatch(/Les gjennom rutinen/))
  })
})

describe('skjemaet', () => {
  it('spør før en ny oppgave med endringer forlates, også når en annen oppgave velges', async () => {
    tilstand.ansvarlig = true
    vis()
    await userEvent.click(await screen.findByRole('button', { name: 'Ny oppgave' }))
    await userEvent.type(screen.getByLabelText('Overskrift'), 'Halvferdig')
    await userEvent.click(screen.getByRole('button', { name: 'Tilbake til oppgavene' }))
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett å redigere' }))
    await userEvent.click(screen.getByRole('button', { name: /Les gjennom rutinen/ }))
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver`)
    await userEvent.click(screen.getByRole('button', { name: 'Forkast endringene' }))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/${O2}`)
  })
})
