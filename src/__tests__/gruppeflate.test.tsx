// @vitest-environment jsdom
/**
 * Arbeidsflatene i en gruppe (idéene og oppgavene) og veiene ut av dem, med
 * den virkelige ruten (`useRute`): flaten legger seg over siden den ble åpnet
 * fra og lukkes dit, eller til gruppen når den ble åpnet utenfra; et valg i
 * lista legger ingenting i historikken; ulagret tekst gir vakt også ved
 * nettleserens tilbake; og en gruppe den innloggede ikke leser, gir det samme
 * avslaget som en som ikke finnes, uten navn og uten idéer.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'

const GRUPPE = '0f1e2d3c-4b5a-4968-8776-655443322110'
const ANNEN = '33333333-4444-4555-8666-777777777777'
const IDE = '11111111-2222-4333-8444-555555555555'

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
  medlemmer: [],
  samhandling: { nye_ideer: 0, venter: 1, mine_oppgaver: 0 },
}

const IDEEN = {
  id: IDE,
  forfatter_id: 'meg',
  kategori: null,
  gruppe_id: GRUPPE,
  tittel: 'Felles mal',
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
}

const grupperApi = vi.hoisted(() => ({ hentGruppeoversikt: vi.fn() }))
const ideApi = vi.hoisted(() => ({
  hentGruppeideer: vi.fn(),
  hentIdetraad: vi.fn(async () => null),
  merkIdeSett: vi.fn(async () => {}),
  opprettIde: vi.fn(async () => 'ny'),
}))

vi.mock('../auth/okt', () => ({ useProfil: () => MEG, useOkt: () => ({}) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [MEG]) }))
vi.mock('../grupper/api', async (original) => ({ ...(await original<object>()), ...grupperApi }))
vi.mock('../ideer/api', async (original) => ({ ...(await original<object>()), ...ideApi }))

const { useRute } = await import('../hooks/useRute')
const { adresse } = await import('../domain/rute')
const { arbeidsflate, flatebakgrunn } = await import('../components/grupper/arbeidsflate')
const { Gruppeflate } = await import('../components/grupper/Gruppeflate')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt } = await import('../grupper/modell')
const { lesGruppeideer } = await import('../ideer/modell')

const IDEER = `#/grupper/${GRUPPE}/ideer`
const GRUPPESIDE = `#/grupper/${GRUPPE}`

/** Appen i smått: siden som står (bak flaten), og flaten når adressen er en. */
function Appen() {
  const [rute] = useRute()
  const flate = arbeidsflate(rute)
  const side = flatebakgrunn(rute)
  return (
    <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
      <p data-testid="side">{adresse(side)}</p>
      {flate && <Gruppeflate key={flate.gruppe} {...flate} />}
    </GruppekildeProvider>
  )
}

/** Går til adressen som en lenke i appen gjør, og venter til appen har fulgt med. */
async function lenke(til: string) {
  window.location.hash = til
  await waitFor(() => expect(window.location.hash).toBe(til))
  await new Promise((r) => setTimeout(r, 0))
}

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

beforeEach(() => {
  window.scrollTo = () => undefined
  grupperApi.hentGruppeoversikt.mockImplementation(async (id: string) => {
    if (id !== GRUPPE) throw new Error('Gruppen finnes ikke, eller du har ikke tilgang til den.')
    return lesGruppeoversikt(OVERSIKT)
  })
  ideApi.hentGruppeideer.mockImplementation(async () => lesGruppeideer({ kan_skrive: true, kan_behandle: false, ideer: [IDEEN] }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('siden bak flaten', () => {
  it('er siden flaten ble åpnet fra, ellers gruppen', () => {
    const flate = { side: 'grupper', gruppe: GRUPPE, fane: 'ideer', element: IDE } as const
    expect(flatebakgrunn(flate, '#/')).toEqual({ side: 'forside' })
    expect(flatebakgrunn(flate, GRUPPESIDE)).toEqual({ side: 'grupper', gruppe: GRUPPE })
    expect(flatebakgrunn(flate, '#/grupper')).toEqual({ side: 'grupper' })
    // Utenfra, fra en annen flate eller fra noe ukjent: gruppen, aldri to flater over hverandre.
    expect(flatebakgrunn(flate, null)).toEqual({ side: 'grupper', gruppe: GRUPPE })
    expect(flatebakgrunn(flate, `#/grupper/${ANNEN}/oppgaver`)).toEqual({ side: 'grupper', gruppe: ANNEN })
    expect(flatebakgrunn(flate, '#/noe-rart')).toEqual({ side: 'grupper', gruppe: GRUPPE })
    // En vanlig side, også chatten, er seg selv.
    const chat = { side: 'grupper', gruppe: GRUPPE, fane: 'chat' } as const
    expect(arbeidsflate(chat)).toBeNull()
    expect(flatebakgrunn(chat, '#/')).toBe(chat)
  })
})

describe('lukkingen etter inngangsveien', () => {
  it('går tilbake til forsiden når flaten ble åpnet derfra', async () => {
    window.history.replaceState(null, '', '#/')
    render(<Appen />)
    await lenke(`${IDEER}/${IDE}`)
    expect(screen.getByTestId('side').textContent).toBe('#/')
    await userEvent.click(await screen.findByRole('button', { name: 'Lukk idéer' }))
    await waitFor(() => expect(window.location.hash).toBe('#/'))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('går tilbake til gruppen når flaten ble åpnet derfra, også etter at en annen idé er valgt', async () => {
    window.history.replaceState(null, '', GRUPPESIDE)
    render(<Appen />)
    await lenke(IDEER)
    expect(screen.getByTestId('side').textContent).toBe(GRUPPESIDE)
    const lengde = window.history.length
    await userEvent.click(await screen.findByRole('button', { name: /Felles mal/ }))
    await waitFor(() => expect(window.location.hash).toBe(`${IDEER}/${IDE}`))
    expect(window.history.length).toBe(lengde)
    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(window.location.hash).toBe(GRUPPESIDE))
  })

  it('går til gruppen, uten å gå ut av appen, når flaten ble åpnet fra en lenke utenfra', async () => {
    window.history.replaceState(null, '', `${IDEER}/${IDE}`)
    render(<Appen />)
    expect(screen.getByTestId('side').textContent).toBe(GRUPPESIDE)
    const lengde = window.history.length
    await userEvent.click(await screen.findByRole('button', { name: 'Lukk idéer' }))
    await waitFor(() => expect(window.location.hash).toBe(GRUPPESIDE))
    expect(window.history.length).toBe(lengde)
  })
})

describe('ulagret tekst', () => {
  it('stopper nettleserens tilbake og spør; forkastes teksten, går appen dit', async () => {
    window.history.replaceState(null, '', GRUPPESIDE)
    render(<Appen />)
    await lenke(IDEER)
    await userEvent.click(await screen.findByRole('button', { name: 'Ny idé' }))
    await userEvent.type(screen.getByLabelText('Overskrift'), 'Halvferdig')

    window.history.back()
    expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
    await waitFor(() => expect(window.location.hash).toBe(IDEER))
    await userEvent.click(screen.getByRole('button', { name: 'Fortsett å redigere' }))
    expect((screen.getByLabelText('Overskrift') as HTMLInputElement).value).toBe('Halvferdig')

    window.history.back()
    await userEvent.click(await screen.findByRole('button', { name: 'Forkast endringene' }))
    await waitFor(() => expect(window.location.hash).toBe(GRUPPESIDE))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('lar nettleserens tilbake gå rett ut av flaten når ingenting er endret', async () => {
    window.history.replaceState(null, '', GRUPPESIDE)
    render(<Appen />)
    await lenke(IDEER)
    await screen.findByRole('button', { name: 'Ny idé' })
    window.history.back()
    await waitFor(() => expect(window.location.hash).toBe(GRUPPESIDE))
    expect(screen.queryByText('Du har endringer som ikke er lagret.')).toBeNull()
  })
})

describe('tilgangen', () => {
  it('gir det samme avslaget for en gruppe den innloggede ikke leser, uten navn og uten idéer', async () => {
    window.history.replaceState(null, '', `#/grupper/${ANNEN}/ideer/${IDE}`)
    render(<Appen />)
    expect((await screen.findByRole('alert')).textContent).toBe('Gruppen finnes ikke, eller du har ikke tilgang til den.')
    const flate = screen.getByRole('dialog')
    expect(within(flate).getByRole('heading', { level: 2 }).textContent).toBe('Idéer')
    expect(document.body.textContent).not.toMatch(/Lithiumgruppen|Felles mal/)
    expect(ideApi.hentGruppeideer).not.toHaveBeenCalled()
    expect(ideApi.hentIdetraad).not.toHaveBeenCalled()
  })
})
