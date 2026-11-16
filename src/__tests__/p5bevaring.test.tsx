// @vitest-environment jsdom
/**
 * P5 tråd D: det som skal overleve en oppdatering til en ny versjon av appen
 * (testplanen, BF-V6 og avsnitt 5). Et halvskrevet forslag står der det stod,
 * og køen «Til behandling» har samme utvalg og filter etterpå. En vanlig
 * omlasting av siden bevarer ingenting (`docs/oppdatering.md`).
 *
 * «Oppdateringen» er den samme som i appen: `oppdaterOgTaVare` legger bildet i
 * fanen, alt tas ned, og komponentene monteres på nytt.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const REGELSETT = '44444444-0000-4000-8000-000000000004'
const KOMMENTAR = '55555555-0000-4000-8000-000000000005'

const api = vi.hoisted(() => ({
  kall: vi.fn(async (): Promise<unknown> => null),
  sendForslag: vi.fn(),
  hentMineForslag: vi.fn(async (): Promise<unknown[]> => []),
  hentForslag: vi.fn(async (): Promise<unknown> => null),
  trekkForslag: vi.fn(),
  svarPaForslag: vi.fn(),
  hentSideversjon: vi.fn(async (): Promise<number | null> => null),
}))
vi.mock('../forslag/api', () => api)

const { RettigheterKilde, INGEN_RETTIGHETER } = await import('../auth/rettigheter')
const { glemBildet, oppdaterOgTaVare } = await import('../oppdatering/bevaring')
const { ForslagskildeProvider, useForeslaEndring } = await import('../components/forslag/Forslagskilde')
const { Forslagsside } = await import('../components/forslag/Forslagsside')

beforeAll(() => {
  window.scrollTo = () => undefined
  // jsdom har `<dialog>`, men ikke det modale laget.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => {
  vi.clearAllMocks()
  sessionStorage.clear()
  glemBildet()
  window.location.hash = ''
})
afterEach(cleanup)

/** «Oppdater nå»: bildet legges i fanen, appen tas ned, og den nye versjonen starter. */
function oppdater(): void {
  const lastInn = vi.fn()
  oppdaterOgTaVare(lastInn)
  expect(lastInn).toHaveBeenCalledOnce()
  cleanup()
  glemBildet()
}

/** En vanlig omlasting: alt tas ned uten bildet. */
function lastPaNytt(): void {
  cleanup()
  glemBildet()
}

/* --- Det halvskrevne forslaget (BF-V6) ------------------------------------ */

const APNING = {
  tittel: 'Bupropion',
  valg: [
    { ressurs: REGELSETT, element: null, grunnrevisjon: 1, sted: 'Reglene for HBUP', etikett: 'Reglene for HBUP' },
    {
      ressurs: REGELSETT,
      element: KOMMENTAR,
      grunnrevisjon: 2,
      sted: 'Reglene for HBUP · Syntetisk kommentar',
      etikett: 'Reglene for HBUP · Syntetisk kommentar',
      utdrag: 'Syntetisk kommentartekst.',
    },
  ],
}

function Apner() {
  const apne = useForeslaEndring()
  return (
    <button type="button" onClick={() => apne?.(APNING)}>
      Åpne skjemaet
    </button>
  )
}

const visFortolkning = () =>
  render(
    <ForslagskildeProvider>
      <Apner />
    </ForslagskildeProvider>,
  )

async function skrivHalvveis() {
  const bruker = userEvent.setup()
  visFortolkning()
  await bruker.click(screen.getByRole('button', { name: 'Åpne skjemaet' }))
  const vindu = await screen.findByRole('dialog', { name: /Foreslå endring/ })
  await bruker.selectOptions(within(vindu).getByLabelText('Hva gjelder forslaget?'), '1')
  await bruker.type(within(vindu).getByLabelText('Hva foreslår du?'), 'Syntetisk forslag, halvveis')
  await bruker.type(within(vindu).getByLabelText('Hvorfor?'), 'Syntetisk begrunnelse')
}

describe('det halvskrevne forslaget', () => {
  it('står der det stod etter en oppdatering til en ny versjon: skjemaet, valget og teksten', async () => {
    await skrivHalvveis()
    oppdater()

    visFortolkning()
    const vindu = await screen.findByRole('dialog', { name: /Foreslå endring/ })
    expect(within(vindu).getByLabelText<HTMLSelectElement>('Hva gjelder forslaget?').value).toBe('1')
    expect(within(vindu).getByLabelText<HTMLTextAreaElement>('Hva foreslår du?').value).toBe('Syntetisk forslag, halvveis')
    expect(within(vindu).getByLabelText<HTMLTextAreaElement>('Hvorfor?').value).toBe('Syntetisk begrunnelse')
    expect(within(vindu).getByText('Syntetisk kommentartekst.', { selector: 'blockquote' })).toBeTruthy()
    expect(api.sendForslag).not.toHaveBeenCalled()
  })

  it('kommer ikke tilbake etter en vanlig omlasting av siden', async () => {
    await skrivHalvveis()
    lastPaNytt()

    visFortolkning()
    expect(screen.queryByRole('dialog', { name: /Foreslå endring/ })).toBeNull()
  })
})

/* --- Køen «Til behandling» (avsnitt 5) ------------------------------------ */

const korad = (id: string, status: string, ekstra: Record<string, unknown> = {}) => ({
  id,
  status,
  ressurs: { id: REGELSETT, type: 'intervallregelsett', navn: 'HBUP', stoff: null, analyttkode: 'HBUP', omfang: 'lokal' },
  element_id: null,
  sted: 'Reglene for HBUP',
  sammendrag: 'Syntetisk forslag.',
  stilt_av: { er_meg: false, navn: 'Vera Syntetisk' },
  opprettet_kl: '2026-11-16T10:00:00Z',
  oppdatert_kl: '2026-11-16T10:00:00Z',
  behandler_er_meg: false,
  har_behandler: false,
  uten_redaktor: false,
  endret_siden: false,
  ...ekstra,
})

const KO = {
  antall: { nye: 1, pagaende: 2, uten_redaktor: 1, mine: 0 },
  nye: [korad('a', 'ny')],
  pagaende: [
    korad('b', 'under_behandling', { har_behandler: true, behandler_er_meg: true }),
    korad('c', 'under_behandling', { har_behandler: true, uten_redaktor: true }),
  ],
  ferdige: [],
}

const visKoen = (innhold: ReactNode = <Forslagsside fane="behandling" onLukk={() => {}} />) =>
  render(<RettigheterKilde verdi={{ ...INGEN_RETTIGHETER, behandlerForslag: true }}>{innhold}</RettigheterKilde>)

describe('køen «Til behandling»', () => {
  it('har samme utvalg og filter etter en oppdatering til en ny versjon', async () => {
    const bruker = userEvent.setup()
    api.kall.mockResolvedValue(KO)
    visKoen()
    await screen.findByRole('list', { name: 'Nye forslag' })
    await bruker.click(screen.getByRole('button', { name: /Pågående/ }))
    await bruker.click(screen.getByRole('switch', { name: 'Bare uten redaktør' }))
    expect(within(screen.getByRole('list', { name: 'Pågående forslag' })).getAllByRole('link')).toHaveLength(1)
    oppdater()

    visKoen()
    const liste = await screen.findByRole('list', { name: 'Pågående forslag' })
    expect(screen.getByRole('button', { name: /Pågående/ }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByRole<HTMLInputElement>('switch', { name: 'Bare uten redaktør' }).checked).toBe(true)
    expect(within(liste).getAllByRole('link')).toHaveLength(1)
  })

  it('begynner på «Nye» uten filter etter en vanlig omlasting av siden', async () => {
    const bruker = userEvent.setup()
    api.kall.mockResolvedValue(KO)
    visKoen()
    await screen.findByRole('list', { name: 'Nye forslag' })
    await bruker.click(screen.getByRole('button', { name: /Pågående/ }))
    lastPaNytt()

    visKoen()
    await screen.findByRole('list', { name: 'Nye forslag' })
    await waitFor(() => expect(screen.getByRole('button', { name: /Nye/ }).getAttribute('aria-pressed')).toBe('true'))
    expect(screen.getByRole<HTMLInputElement>('switch', { name: 'Bare uten redaktør' }).checked).toBe(false)
  })
})
