// @vitest-environment jsdom
/**
 * P7 tråd C: et varsel om gruppechatten i bjella (docs/gruppechat.md,
 * «Varslene»). Det viser bare gruppen og antallet, åpner chatfanen gjennom
 * skjemavaktene (`visGruppechat`) og merkes lest først når brukeren er gått
 * dit. Innstillingen for chatvarslene vises bare når chatten er slått på
 * (`chat_aktivert` fra `mine_grupper`). Kallene mot databasen er erstattet;
 * skjemavakten selv prøves for gruppene i `gruppevarselvakt.test.tsx`.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Varselliste } from '../varsler/modell'

const GRUPPE = '0f1e2d3c-4b5a-4968-8776-655443322110'

function profil(id: string, fornavn: string): Profil {
  return {
    id,
    username: fornavn.toLowerCase(),
    first_name: fornavn,
    last_name: 'Nordmann',
    role: 'user',
    avatar_path: null,
    must_change_password: false,
    onboarding_completed: true,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z',
  }
}

const MEG = profil('meg', 'Mona')
const OLA = profil('ola', 'Ola')

const VARSLER: Varselliste = {
  lest_kl: '2026-11-17T10:00:00Z',
  varsler: [
    {
      kilde: 'database',
      id: 'v-chat',
      kategori: 'gruppechat',
      ide: null,
      hendelser: [{ kl: '2026-11-17T09:30:00Z', av: null, gruppechat: { id: GRUPPE, navn: 'Lithiumgruppen' }, antall: 3 }],
      oppdatert_kl: '2026-11-17T09:30:00Z',
      lest: false,
      arkivert: false,
    },
  ] as Varselliste['varsler'],
}

const varselApi = vi.hoisted(() => ({
  hentVarsler: vi.fn(),
  hentUleste: vi.fn(),
  merkVarslerLest: vi.fn(async (_ider: readonly string[] | null, _til: string) => {}),
  arkiverVarsler: vi.fn(async (ider: readonly string[], _til: string) => [...ider]),
  gjenopprettVarsler: vi.fn(async (_ider: readonly string[]) => {}),
  hentVarselvalg: vi.fn(async () => ({})),
  lagreVarselvalg: vi.fn(async () => {}),
  hentEndringsloggstatus: vi.fn(async () => null),
  lagreEndringsloggstatus: vi.fn(async () => {}),
  lyttEtterOppfrisking: vi.fn(() => () => {}),
  oppfriskVarsler: vi.fn(),
}))

vi.mock('../varsler/api', () => varselApi)
vi.mock('../auth/okt', () => ({ useProfil: () => MEG, useOkt: () => ({}) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [MEG, OLA]) }))
vi.mock('../data/endringslogg', () => ({ ENDRINGSLOGG: [] }))

const { Varselknapp } = await import('../components/varsler/Varselknapp')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER } = await import('../grupper/modell')

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  Element.prototype.scrollIntoView ??= function () {}
})

beforeEach(() => {
  window.location.hash = ''
  varselApi.hentVarsler.mockResolvedValue(VARSLER)
  varselApi.hentUleste.mockResolvedValue({ gruppechat: 1 })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('viser gruppen og antallet, åpner chatfanen og merker varselet lest', async () => {
  const bruker = userEvent.setup()
  render(<Varselknapp />)
  await bruker.click(await screen.findByRole('button', { name: /^Varsler/ }))
  const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
  const varsel = await within(vindu).findByRole('button', { name: '3 nye meldinger i Lithiumgruppen' })
  expect(varsel.closest('li')!.textContent).toContain('Gruppechat')
  expect(varselApi.merkVarslerLest).not.toHaveBeenCalled()
  await bruker.click(varsel)
  expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/chat`)
  await waitFor(() => expect(varselApi.merkVarslerLest).toHaveBeenCalledWith(['v-chat'], VARSLER.lest_kl))
})

it.each([
  [true, ['Nye idéer i gruppene mine', 'Oppgaver og idéene mine i gruppene', 'Nye meldinger i gruppechattene']],
  [false, ['Nye idéer i gruppene mine', 'Oppgaver og idéene mine i gruppene']],
])('viser innstillingen for chatvarslene bare når chatten er slått på (%s)', async (chat_aktivert, titler) => {
  const bruker = userEvent.setup()
  render(
    <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, chat_aktivert, oppdater: () => undefined }}>
      <Varselknapp />
    </GruppekildeProvider>,
  )
  await bruker.click(await screen.findByRole('button', { name: /^Varsler/ }))
  const vindu = await screen.findByRole('dialog', { name: 'Varsler' })
  await bruker.click(within(vindu).getByRole('button', { name: 'Varselinnstillinger' }))
  const innstillinger = await screen.findByRole('dialog', { name: 'Varselinnstillinger' })
  const grupper = within(innstillinger).getByRole('region', { name: 'Grupper' })
  expect([...grupper.querySelectorAll('.varselinnstilling__tittel')].map((t) => t.textContent)).toEqual(titler)
})
