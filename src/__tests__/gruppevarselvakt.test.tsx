// @vitest-environment jsdom
/**
 * P6b: et varsel om en gruppeoppgave mens et skjema i en arbeidsflate har
 * endringer som ikke er lagret. Varselvinduet og gruppesiden står sammen, med
 * den virkelige skjemavakten (`gruppevisning.ts`) mellom dem: blir brukeren i
 * skjemaet, står varselet ulest; forkastes endringene, åpnes oppgaven og
 * varselet merkes lest først da. Kallene mot databasen er erstattet.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, expect, it, vi } from 'vitest'
import type { Profil } from '@delt/profil'
import type { Varselliste } from '../varsler/modell'

const GRUPPE = '0f1e2d3c-4b5a-4968-8776-655443322110'
const OPPGAVE = '22222222-3333-4444-8555-666666666666'

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
      id: 'v-tildelt',
      kategori: 'gruppeoppgaver',
      ide: null,
      hendelser: [
        {
          kl: '2026-11-17T09:30:00Z',
          av: 'ola',
          art: 'tildelt',
          gruppeoppgave: { id: OPPGAVE, tittel: 'Skriv sjekklisten', gruppe: { id: GRUPPE, navn: 'Lithiumgruppen' } },
        },
      ],
      oppdatert_kl: '2026-11-17T09:30:00Z',
      lest: false,
      arkivert: false,
    },
  ] as Varselliste['varsler'],
}

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
  samhandling: { nye_ideer: 0, venter: 0, mine_oppgaver: 1 },
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

const grupperApi = vi.hoisted(() => ({ hentGruppeoversikt: vi.fn() }))

const ideApi = vi.hoisted(() => ({
  hentGruppeideer: vi.fn(),
  hentIdetraad: vi.fn(),
  opprettIde: vi.fn(async () => 'ny-ide'),
  merkIdeSett: vi.fn(async () => {}),
}))

vi.mock('../varsler/api', () => varselApi)
vi.mock('../auth/okt', () => ({ useProfil: () => MEG, useOkt: () => ({}) }))
vi.mock('../auth/avatarer', () => ({ useAvatarlenker: () => new Map() }))
vi.mock('../auth/api', () => ({ hentProfilkort: vi.fn(async () => [MEG, OLA]) }))
vi.mock('../grupper/api', async (original) => ({ ...(await original<object>()), ...grupperApi }))
vi.mock('../ideer/api', async (original) => ({ ...(await original<object>()), ...ideApi }))
vi.mock('../data/endringslogg', () => ({ ENDRINGSLOGG: [] }))

const { Varselknapp } = await import('../components/varsler/Varselknapp')
const { Gruppeflate } = await import('../components/grupper/Gruppeflate')
const { GruppekildeProvider } = await import('../grupper/kilde')
const { INGEN_GRUPPER, lesGruppeoversikt } = await import('../grupper/modell')
const { lesGruppeideer } = await import('../ideer/modell')

beforeAll(() => {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
  Element.prototype.scrollIntoView ??= function () {}
  document.elementFromPoint ??= () => null
  Range.prototype.getClientRects ??= () => ({ length: 0, item: () => null, [Symbol.iterator]: [][Symbol.iterator] }) as unknown as DOMRectList
  Range.prototype.getBoundingClientRect ??= () => new DOMRect()
})

beforeEach(() => {
  window.scrollTo = () => undefined
  window.history.replaceState(null, '', IDEADRESSE)
  varselApi.hentVarsler.mockResolvedValue(VARSLER)
  varselApi.hentUleste.mockResolvedValue({ gruppeoppgaver: 1 })
  grupperApi.hentGruppeoversikt.mockImplementation(async () => lesGruppeoversikt(OVERSIKT))
  ideApi.hentGruppeideer.mockImplementation(async () => lesGruppeideer({ kan_skrive: true, kan_behandle: false, ideer: [] }))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const IDEADRESSE = `#/grupper/${GRUPPE}/ideer`
const bjella = () => screen.getByRole('button', { name: /^Varsler/ })
const VARSELTEKST = 'Ola Nordmann ga deg en oppgave'

it('lar et gruppevarsel stå ulest når brukeren blir i et ulagret skjema, og merker det lest når oppgaven åpnes', async () => {
  const bruker = userEvent.setup()
  render(
    <GruppekildeProvider verdi={{ ...INGEN_GRUPPER, oppdater: () => undefined }}>
      <Varselknapp />
      <Gruppeflate gruppe={GRUPPE} fane="ideer" />
    </GruppekildeProvider>,
  )
  // Lista er tom, så «Ny idé» står både øverst og i den tomme lista.
  await bruker.click((await screen.findAllByRole('button', { name: 'Ny idé' }))[0]!)
  await bruker.type(screen.getByLabelText('Overskrift'), 'Halvferdig')

  // Varselet åpnes, men brukeren blir i skjemaet.
  await bruker.click(bjella())
  let vindu = await screen.findByRole('dialog', { name: 'Varsler' })
  await bruker.click(await within(vindu).findByRole('button', { name: VARSELTEKST }))
  expect(await screen.findByText('Du har endringer som ikke er lagret.')).toBeTruthy()
  await bruker.click(screen.getByRole('button', { name: 'Fortsett å redigere' }))
  expect((screen.getByLabelText('Overskrift') as HTMLInputElement).value).toBe('Halvferdig')
  expect(window.location.hash).toBe(IDEADRESSE)
  expect(varselApi.merkVarslerLest).not.toHaveBeenCalled()

  // Varselet står fortsatt blant de nye.
  await bruker.click(bjella())
  vindu = await screen.findByRole('dialog', { name: 'Varsler' })
  const nye = within(vindu).getByRole('region', { name: 'Nye' })
  const varsel = within(nye).getByRole('button', { name: VARSELTEKST })
  expect(varsel.closest('li')!.hasAttribute('data-ulest')).toBe(true)

  // Nå forkastes endringene: oppgaven åpnes, og først da er varselet lest.
  await bruker.click(varsel)
  await bruker.click(await screen.findByRole('button', { name: 'Forkast endringene' }))
  expect(window.location.hash).toBe(`#/grupper/${GRUPPE}/oppgaver/${OPPGAVE}`)
  await waitFor(() => expect(varselApi.merkVarslerLest).toHaveBeenCalledWith(['v-tildelt'], VARSLER.lest_kl))
  expect(varselApi.merkVarslerLest).toHaveBeenCalledTimes(1)
})
