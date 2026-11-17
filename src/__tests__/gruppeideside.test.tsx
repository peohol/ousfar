// @vitest-environment jsdom
/**
 * P6b: idéene på gruppesiden (`#/grupper/<ID>/ideer`): fanene med tallene,
 * lista med de nye først og skuffene, søket, en ny idé uten kategori, og at
 * behandlingen bare vises for dem databasen sier kan behandle. Kallene er
 * erstattet; reglene selv prøves mot databasen i `gruppesamhandling.test.ts`.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Idetraad } from '../ideer/modell'

const GRUPPE = '0f1e2d3c-4b5a-4968-8776-655443322110'
const IDE = '11111111-2222-4333-8444-555555555555'
const OPPGAVE = '22222222-3333-4444-8555-666666666666'

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

const DOK = (tekst: string) => ({ type: 'doc' as const, content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

const ide = (id: string, tittel: string, ekstra: Record<string, unknown> = {}) => ({
  id,
  forfatter_id: 'ola',
  kategori: null,
  gruppe_id: GRUPPE,
  tittel,
  opprettet_kl: '2026-11-17T08:00:00Z',
  endret_kl: null,
  hjerter: 0,
  mitt_hjerte: false,
  arkivert_kl: null,
  oppgave: null,
  gruppeoppgave: null,
  kommentarer: 0,
  nye_kommentarer: 0,
  sett: true,
  ...ekstra,
})

const IDEER = [
  ide('a', 'Gammel idé', { opprettet_kl: '2026-11-10T08:00:00Z' }),
  ide(IDE, 'Ny sjekkliste', { sett: false }),
  ide('c', 'Ble en oppgave', { gruppeoppgave: { id: OPPGAVE, status: 'paagaar', tittel: 'Ble en oppgave' } }),
  ide('d', 'Ikke aktuell', { arkivert_kl: '2026-11-16T08:00:00Z' }),
]

const traad = (ekstra: Partial<Idetraad> = {}): Idetraad => ({
  ...(ide(IDE, 'Ny sjekkliste') as unknown as Idetraad),
  tekst: DOK('Beskrivelsen'),
  sist_sett: null,
  lest_kl: '2026-11-17T09:00:00Z',
  kommentarer: [],
  kan_behandle: false,
  kan_moderere: false,
  kan_kommentere: true,
  ...ekstra,
})

const OVERSIKT = {
  id: GRUPPE,
  navn: 'Lithiumgruppen',
  beskrivelse: 'Om litium.',
  art: 'tverrfaglig',
  status: 'aktiv',
  fagmiljo: null,
  opprettet_kl: '2026-11-01T00:00:00Z',
  rolle: 'medlem',
  kan_styre: false,
  kan_moderere: false,
  kan_forlate: true,
  kan_gjenapne: false,
  medlemmer: [],
  samhandling: { nye_ideer: 1, venter: 2, mine_oppgaver: 0 },
}

const tilstand = vi.hoisted(() => ({ oversikt: null as unknown, kanSkrive: true, kanBehandle: false }))

const grupperApi = vi.hoisted(() => ({
  hentGruppeoversikt: vi.fn(),
  gjorOmTilGruppeoppgave: vi.fn(async () => OPPGAVE),
}))

const ideApi = vi.hoisted(() => ({
  hentGruppeideer: vi.fn(),
  hentIdetraad: vi.fn(),
  opprettIde: vi.fn(async () => 'ny-ide'),
  endreIde: vi.fn(async () => {}),
  slettIde: vi.fn(async () => {}),
  merkIdeSett: vi.fn(async () => {}),
  arkiverIde: vi.fn(async () => {}),
  gjenopprettIde: vi.fn(async () => {}),
  overforIde: vi.fn(async () => 'o'),
  opprettKommentar: vi.fn(async () => {}),
  endreKommentar: vi.fn(async () => {}),
  slettKommentar: vi.fn(async () => {}),
  settHjerte: vi.fn(async () => {}),
}))

const visDiskusjonene = vi.hoisted(() => vi.fn())

vi.mock('../auth/okt', () => ({ useProfil: () => MEG, useOkt: () => ({}) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [MEG, OLA]) }))
vi.mock('../grupper/api', async (original) => ({ ...(await original<object>()), ...grupperApi }))
vi.mock('../ideer/api', () => ideApi)
vi.mock('../components/diskusjoner/diskusjonsvisning', async (original) => ({ ...(await original<object>()), visDiskusjonene }))

const { Grupperside } = await import('../components/grupper/Grupperside')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt } = await import('../grupper/modell')
const { lesGruppeideer } = await import('../ideer/modell')
const { sokIGruppeideer } = await import('../components/grupper/Gruppeideer')
const { visGruppeoppgave } = await import('../components/grupper/gruppevisning')

beforeAll(() => {
  Element.prototype.scrollIntoView ??= function () {}
  document.elementFromPoint ??= () => null
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

const lukket = vi.hoisted(() => vi.fn())

function vis(fane?: 'ideer', element?: string) {
  return render(
    <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
      <Grupperside gruppe={GRUPPE} fane={fane} element={element} onLukk={lukket} />
    </GruppekildeProvider>,
  )
}

beforeEach(() => {
  window.scrollTo = () => undefined
  window.location.hash = ''
  tilstand.oversikt = OVERSIKT
  tilstand.kanSkrive = true
  tilstand.kanBehandle = false
  grupperApi.hentGruppeoversikt.mockImplementation(async () => lesGruppeoversikt(tilstand.oversikt))
  ideApi.hentGruppeideer.mockImplementation(async () =>
    lesGruppeideer({ kan_skrive: tilstand.kanSkrive, kan_behandle: tilstand.kanBehandle, ideer: IDEER }),
  )
  ideApi.hentIdetraad.mockImplementation(async () => traad({ kan_behandle: tilstand.kanBehandle }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('fanene', () => {
  it('har oversikten, idéene med det som er nytt, og diskusjonene', async () => {
    vis()
    const faner = await screen.findByRole('navigation', { name: 'I gruppen' })
    expect(within(faner).getByRole('link', { name: 'Oversikt' }).getAttribute('aria-current')).toBe('page')
    const ideer = within(faner).getByRole('link', { name: /Idéer/ })
    expect(ideer.getAttribute('href')).toBe(`#/grupper/${GRUPPE}/ideer`)
    // Et vanlig medlem ser hvor mange idéer som har noe nytt.
    expect(within(ideer).getByLabelText('1 med noe nytt').textContent).toBe('1')
    await userEvent.click(within(faner).getByRole('button', { name: 'Diskusjoner' }))
    expect(visDiskusjonene).toHaveBeenCalledWith(`gruppe:${GRUPPE}`)
  })

  it('viser de ansvarlige hvor mange som venter på behandling, og skjuler diskusjonene i en arkivert gruppe', async () => {
    tilstand.oversikt = { ...OVERSIKT, rolle: 'ansvarlig', kan_styre: true, status: 'arkivert' }
    vis('ideer')
    const faner = await screen.findByRole('navigation', { name: 'I gruppen' })
    expect(within(faner).getByRole('link', { name: /Idéer/ }).getAttribute('aria-current')).toBe('page')
    expect(within(faner).getByLabelText('2 venter på behandling')).toBeTruthy()
    expect(within(faner).queryByRole('button', { name: 'Diskusjoner' })).toBeNull()
  })
})

describe('lista', () => {
  it('har de åpne idéene med de nye først, og skuffene for oppgavene og det som ikke er aktuelt', async () => {
    vis('ideer')
    const apne = await screen.findByRole('region', { name: /Åpne idéer/ })
    await waitFor(() => expect(within(apne).getAllByRole('button').map((b) => b.querySelector('.idekort__tittel')?.textContent)).toEqual(['NyNy sjekkliste', 'Gammel idé']))
    expect(within(apne).getByText('Ny')).toBeTruthy()
    expect(screen.getByRole('button', { name: /Gjort om til oppgaver/ })).toBeTruthy()
    expect(screen.getByRole('button', { name: /Ikke aktuelt/ })).toBeTruthy()
    // Ingen kategorier og ingen frist for sletting i en gruppe.
    expect(screen.queryByText(/Slettes/)).toBeNull()

    await userEvent.click(within(apne).getByRole('button', { name: /Gammel idé/ }))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/ideer/a`)
  })

  it('søker i overskriftene', async () => {
    expect(sokIGruppeideer(lesGruppeideer({ ideer: IDEER }).ideer, 'SJEKK').map((i) => i.tittel)).toEqual(['Ny sjekkliste'])
    vis('ideer')
    const apne = await screen.findByRole('region', { name: /Åpne idéer/ })
    await userEvent.type(screen.getByLabelText('Søk i idéene'), 'gammel')
    await waitFor(() => expect(within(apne).getAllByRole('button')).toHaveLength(1))
    await userEvent.clear(screen.getByLabelText('Søk i idéene'))
    await userEvent.type(screen.getByLabelText('Søk i idéene'), 'finnes ikke')
    expect(await within(apne).findByText('Ingen åpne idéer passer med søket.')).toBeTruthy()
  })

  it('skriver en ny idé i gruppen, uten kategori', async () => {
    vis('ideer')
    await userEvent.click(await screen.findByRole('button', { name: 'Ny idé' }))
    const skjema = screen.getByRole('form', { name: 'Ny idé' })
    expect(within(skjema).queryByText('Kategori')).toBeNull()
    await userEvent.type(within(skjema).getByLabelText('Overskrift'), 'Felles rutine')
    await userEvent.click(within(skjema).getByRole('button', { name: 'Publiser' }))
    expect(ideApi.opprettIde).toHaveBeenCalledWith({ kategori: null, tittel: 'Felles rutine', tekst: null }, GRUPPE)
    await waitFor(() => expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/ideer/ny-ide`))
  })

  it('har ingen knapp for en ny idé for den som bare leser', async () => {
    tilstand.kanSkrive = false
    vis('ideer')
    await screen.findByRole('region', { name: /Åpne idéer/ })
    await waitFor(() => expect(ideApi.hentGruppeideer).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Ny idé' })).toBeNull()
  })
})

describe('én idé', () => {
  it('viser ikke behandlingen for et vanlig medlem', async () => {
    vis('ideer', IDE)
    expect(await screen.findByRole('heading', { level: 2, name: 'Ny sjekkliste' })).toBeTruthy()
    expect(screen.queryByRole('group', { name: 'Hva skjer med idéen' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Gjør om til oppgave' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Tilbake til idéene' }))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/ideer`)
  })

  it('lar de ansvarlige gjøre idéen om til en oppgave, og viser at den er gjort om', async () => {
    tilstand.kanBehandle = true
    vis('ideer', IDE)
    const valg = await screen.findByRole('group', { name: 'Hva skjer med idéen' })
    expect(within(valg).queryByRole('button', { name: /planlagte oppgaver/ })).toBeNull()
    ideApi.hentIdetraad.mockImplementation(async () =>
      traad({ kan_behandle: true, gruppeoppgave: { id: OPPGAVE, status: 'ikke_paabegynt', tittel: 'Ny sjekkliste' } }),
    )
    await waitFor(() => expect(ideApi.merkIdeSett).toHaveBeenCalled())
    await waitFor(() => expect(grupperApi.hentGruppeoversikt).toHaveBeenCalledTimes(2))
    const for_ = grupperApi.hentGruppeoversikt.mock.calls.length
    await userEvent.click(within(valg).getByRole('button', { name: 'Gjør om til oppgave' }))
    expect(grupperApi.gjorOmTilGruppeoppgave).toHaveBeenCalledWith(IDE)
    const merknad = await screen.findByRole('note')
    expect(merknad.textContent).toMatch(/Gjort om til en oppgave i gruppen/)
    expect(merknad.textContent).toMatch(/Ikke påbegynt/)
    // Tråden er fortsatt åpen, og tallene på fanene hentes på nytt.
    expect(screen.queryByRole('group', { name: 'Hva skjer med idéen' })).toBeNull()
    expect(grupperApi.hentGruppeoversikt.mock.calls.length).toBeGreaterThan(for_)
  })

  it('viser en idé som ikke er aktuell uten frist, og lar de ansvarlige åpne den igjen', async () => {
    tilstand.kanBehandle = true
    ideApi.hentIdetraad.mockImplementation(async () => traad({ kan_behandle: true, kan_kommentere: false, arkivert_kl: '2026-11-16T08:00:00Z' }))
    vis('ideer', IDE)
    const merknad = await screen.findByRole('note')
    expect(merknad.textContent).toMatch(/står her til en ansvarlig i gruppen åpner den igjen/)
    // Tallene på fanene hentes på nytt når idéen er sett, og når den er åpnet igjen.
    await waitFor(() => expect(grupperApi.hentGruppeoversikt).toHaveBeenCalledTimes(2))
    await userEvent.click(within(merknad).getByRole('button', { name: 'Åpne igjen' }))
    expect(ideApi.gjenopprettIde).toHaveBeenCalledWith(IDE)
    await waitFor(() => expect(grupperApi.hentGruppeoversikt.mock.calls.length).toBeGreaterThan(2))
  })

  it('viser ikke en idé fra en annen gruppe under gruppens navn', async () => {
    ideApi.hentIdetraad.mockImplementation(async () => traad({ gruppe_id: 'en-annen-gruppe' }))
    vis('ideer', IDE)
    expect(await screen.findByText('Idéen finnes ikke lenger.')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Ny sjekkliste' })).toBeNull()
    expect(ideApi.merkIdeSett).not.toHaveBeenCalled()
  })
})

describe('skjemaet', () => {
  it('spør før en ny idé med endringer forlates gjennom fanene', async () => {
    vis('ideer')
    await userEvent.click(await screen.findByRole('button', { name: 'Ny idé' }))
    await userEvent.type(screen.getByLabelText('Overskrift'), 'Halvferdig')
    const faner = screen.getByRole('navigation', { name: 'I gruppen' })
    await userEvent.click(within(faner).getByRole('link', { name: 'Oversikt' }))
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    expect(window.location.hash).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett å redigere' }))
    expect((screen.getByLabelText('Overskrift') as HTMLInputElement).value).toBe('Halvferdig')
    await userEvent.click(within(faner).getByRole('link', { name: 'Oversikt' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Forkast endringene' }))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}`)
  })

  it('spør før siden lukkes med Escape mens en ny idé har endringer', async () => {
    vis('ideer')
    await userEvent.click(await screen.findByRole('button', { name: 'Ny idé' }))
    await userEvent.type(screen.getByLabelText('Overskrift'), 'Halvferdig')
    ;(document.activeElement as HTMLElement | null)?.blur()
    await userEvent.keyboard('{Escape}')
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    expect(lukket).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Forkast endringene' }))
    expect(lukket).toHaveBeenCalled()
  })

  it('spør før et varsel eller en lenke utenfra fører bort fra en ny idé med endringer', async () => {
    vis('ideer')
    await userEvent.click(await screen.findByRole('button', { name: 'Ny idé' }))
    await userEvent.type(screen.getByLabelText('Overskrift'), 'Halvferdig')
    act(() => visGruppeoppgave(GRUPPE, OPPGAVE))
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    expect(window.location.hash).toBe('')
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett å redigere' }))
    expect((screen.getByLabelText('Overskrift') as HTMLInputElement).value).toBe('Halvferdig')
    act(() => visGruppeoppgave(GRUPPE, OPPGAVE))
    await userEvent.click(await screen.findByRole('button', { name: 'Forkast endringene' }))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/${OPPGAVE}`)
  })

  it('går rett videre fra gruppesiden når ingen skjemaer har endringer', async () => {
    vis('ideer')
    await screen.findByRole('button', { name: 'Ny idé' })
    act(() => visGruppeoppgave(GRUPPE, OPPGAVE))
    expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/${OPPGAVE}`)
    expect(screen.queryByText('Du har endringer som ikke er lagret.')).toBeNull()
  })
})
