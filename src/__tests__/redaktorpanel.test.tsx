// @vitest-environment jsdom
/**
 * «Redaktører» i administrasjonen og «Mitt redaktøransvar» i kontomenyen
 * (P5 tråd A): en administrator gir en kollega ansvar for hele fortolkningen
 * eller ett regelsett, ser redaktørene og regelsettene uten redaktør, og tar
 * ansvaret tilbake etter en bekreftelse; det nasjonale valget står avslått
 * med en forklaring. Lageret er i minnet; databasen prøves i
 * `redaktoransvar.test.ts` og `redaktorlager.test.ts`.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Medlem } from '../auth/api'
import { MittRedaktoransvar } from '../components/konto/MittRedaktoransvar'
import { NASJONALT_AV, Redaktorer } from '../components/konto/Redaktorer'
import { Redigeringshandlinger, PUBLISERES_AV_ADMINISTRATOR } from '../components/stoffside/Redigeringslinje'
import { glemBildet } from '../oppdatering/bevaring'
import type { Redaktoransvar, Redaktorlager, Redaktoroversikt, Redaktorressurs } from '../redaktorer/ansvar'

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

const KF = { id: 'kf', nokkel: 'ous-klinisk-farmakologi', navn: 'OUS Klinisk farmakologi', standard: true, apent: true }
const ADA = { id: 'ada', fornavn: 'Ada', etternavn: 'Admin' }

const medlem = (id: string, fornavn: string, etternavn: string, status: Medlem['status'] = 'aktiv') =>
  ({ id, username: `${fornavn.toLowerCase()}.${etternavn.toLowerCase()}`, first_name: fornavn, last_name: etternavn, status }) as Medlem

const MEDLEMMER = [medlem('rita', 'Rita', 'Redaktør'), medlem('lars', 'Lars', 'Leser'), medlem('borte', 'Bo', 'Borte', 'avsluttet')]

const ressurs = (id: string, navn: string): Redaktorressurs => ({ id, type: 'intervallregelsett', navn, analyttkoder: [navn], fagmiljoId: KF.id })

/** Et lager i minnet med de samme reglene som databasen for det panelet viser. */
function minnelager(nasjonalt = { vises: false, aktivert: false }) {
  const ansvar: Redaktoransvar[] = []
  const ressurser = [ressurs('r1', 'SDIAZ'), ressurs('r2', 'UAMFE')]
  let n = 0
  const harRedaktor = (r: Redaktorressurs) => ansvar.some((a) => a.omrade === 'fortolkning' || a.ressurs?.id === r.id)
  const lager: Redaktorlager = {
    oversikt: async (): Promise<Redaktoroversikt> => ({
      nasjonalt,
      fagmiljoer: [KF],
      ansvar: [...ansvar],
      ressurser: ressurser.map((r) => ({ ...r, harRedaktor: harRedaktor(r) })),
      fagsiderUtenRedaktor: nasjonalt.vises ? 12 : null,
    }),
    tildel: vi.fn(async ({ bruker, omrade, ressurs: r, merknad }) => {
      const m = MEDLEMMER.find((x) => x.id === bruker)!
      const id = `a${++n}`
      ansvar.push({
        id,
        omrade,
        nasjonalt: omrade === 'fagsider',
        gjelder: true,
        bruker: { id: m.id, fornavn: m.first_name, etternavn: m.last_name },
        ressurs: ressurser.find((x) => x.id === r) ?? null,
        fagmiljo: omrade === 'fagsider' ? null : KF,
        tildeltAv: ADA,
        tildeltKl: '2026-11-16T10:00:00Z',
        merknad: merknad?.trim() || null,
      })
      return id
    }),
    tilbakekall: vi.fn(async (id) => {
      ansvar.splice(
        ansvar.findIndex((a) => a.id === id),
        1,
      )
    }),
    mine: async () => [...ansvar],
    forRessurs: async () => [],
  }
  return { lager, ansvar }
}

const hentMedlemmer = async () => MEDLEMMER

describe('«Redaktører» i administrasjonen', () => {
  it('gir ansvar for ett regelsett og for hele fortolkningen, og tar det tilbake etter en bekreftelse', async () => {
    const user = userEvent.setup()
    const { lager } = minnelager()
    render(<Redaktorer apen onLukk={() => {}} lager={lager} hentMedlemmer={hentMedlemmer} />)

    const redaktorene = await screen.findByRole('region', { name: 'Redaktørene i OUS Klinisk farmakologi' })
    expect(within(redaktorene).getByText('Ingen redaktører ennå. Administratorene har ansvaret for alt.')).toBeTruthy()
    const uten = screen.getByRole('region', { name: 'Uten redaktør' })
    expect(within(uten).getByText('Regelsettet SDIAZ')).toBeTruthy()

    // Bare aktive medlemmer kan velges, og uten valg gis ingenting.
    const hvem = screen.getByRole('combobox', { name: 'Hvem' })
    expect(within(hvem).queryByRole('option', { name: /Bo Borte/ })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Gi ansvaret' }))
    expect(screen.getByRole('alert').textContent).toBe('Velg hvem som skal få ansvaret.')

    await user.selectOptions(hvem, 'rita')
    await user.click(screen.getByRole('radio', { name: 'Ett regelsett' }))
    await user.click(screen.getByRole('button', { name: 'Gi ansvaret' }))
    expect(screen.getByRole('alert').textContent).toBe('Velg regelsettet.')
    await user.selectOptions(screen.getByRole('combobox', { name: 'Regelsettet' }), 'r1')
    await user.type(screen.getByRole('textbox', { name: 'Merknad (valgfri)' }), 'Under ferien')
    await user.click(screen.getByRole('button', { name: 'Gi ansvaret' }))
    expect(lager.tildel).toHaveBeenCalledWith({ bruker: 'rita', omrade: 'ressurs', ressurs: 'r1', merknad: 'Under ferien' })
    expect(await within(redaktorene).findByText('Rita Redaktør')).toBeTruthy()
    expect(within(redaktorene).getByText('Regelsettet SDIAZ')).toBeTruthy()
    expect(within(redaktorene).getByText('Under ferien')).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe('Rita Redaktør har fått redaktøransvaret.')
    expect(within(uten).queryByText('Regelsettet SDIAZ')).toBeNull()
    // Skjemaet er tømt.
    expect((screen.getByRole('combobox', { name: 'Hvem' }) as HTMLSelectElement).value).toBe('')

    await user.selectOptions(screen.getByRole('combobox', { name: 'Hvem' }), 'lars')
    await user.click(screen.getByRole('button', { name: 'Gi ansvaret' }))
    expect(lager.tildel).toHaveBeenLastCalledWith({ bruker: 'lars', omrade: 'fortolkning', fagmiljo: 'kf', merknad: '' })
    expect(await within(redaktorene).findByText('Hele fortolkningen i OUS Klinisk farmakologi')).toBeTruthy()
    expect(within(uten).getByText('Alle regelsettene i OUS Klinisk farmakologi har en redaktør.')).toBeTruthy()

    // Å ta tilbake krever en bekreftelse, og «Avbryt» har fokus.
    const rad = within(redaktorene).getByText('Rita Redaktør').closest('li')!
    await user.click(within(rad).getByRole('button', { name: 'Ta tilbake' }))
    const bekreft = within(rad).getByRole('group', { name: 'Ta tilbake ansvaret fra Rita Redaktør?' })
    expect(document.activeElement).toBe(within(bekreft).getByRole('button', { name: 'Avbryt' }))
    await user.click(within(bekreft).getByRole('button', { name: 'Ta tilbake' }))
    expect(lager.tilbakekall).toHaveBeenCalledWith('a1')
    expect(await screen.findByText('Rita Redaktør har ikke lenger ansvaret.')).toBeTruthy()
    expect(within(redaktorene).queryByText('Rita Redaktør')).toBeNull()
  })

  it('viser et avslag fra databasen', async () => {
    const user = userEvent.setup()
    const { lager } = minnelager()
    lager.tildel = vi.fn(async () => {
      throw new Error('Rita Redaktør er ikke aktivt medlem av fagmiljøet.')
    })
    render(<Redaktorer apen onLukk={() => {}} lager={lager} hentMedlemmer={hentMedlemmer} />)
    await user.selectOptions(await screen.findByRole('combobox', { name: 'Hvem' }), 'rita')
    await user.click(screen.getByRole('button', { name: 'Gi ansvaret' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Rita Redaktør er ikke aktivt medlem av fagmiljøet.')
  })

  it('viser systemarkitekten det nasjonale valget avslått, med forklaringen', async () => {
    const { lager } = minnelager({ vises: true, aktivert: false })
    render(<Redaktorer apen onLukk={() => {}} lager={lager} hentMedlemmer={hentMedlemmer} />)
    const nasjonalt = await screen.findByRole('region', { name: 'Nasjonale redaktører for fagsidene' })
    const knapp = within(nasjonalt).getByRole('button', { name: 'Gi ansvar for alle fagsidene' }) as HTMLButtonElement
    expect(knapp.disabled).toBe(true)
    expect(document.getElementById(knapp.getAttribute('aria-describedby')!)!.textContent).toBe(NASJONALT_AV)
    expect(within(nasjonalt).getByText('12 fagsider uten redaktør.')).toBeTruthy()
  })

  it('viser ikke det nasjonale for en lokal administrator', async () => {
    const { lager } = minnelager()
    render(<Redaktorer apen onLukk={() => {}} lager={lager} hentMedlemmer={hentMedlemmer} />)
    await screen.findByRole('region', { name: 'Redaktørene i OUS Klinisk farmakologi' })
    expect(screen.queryByRole('region', { name: 'Nasjonale redaktører for fagsidene' })).toBeNull()
  })
})

describe('«Mitt redaktøransvar»', () => {
  it('viser hva den innloggede er redaktør for, og hvem som ga ansvaret', async () => {
    const { lager, ansvar } = minnelager()
    await lager.tildel({ bruker: 'rita', omrade: 'ressurs', ressurs: 'r2' })
    ansvar.push({ ...ansvar[0]!, id: 'a9', omrade: 'fortolkning', ressurs: null, gjelder: false })
    render(<MittRedaktoransvar apen onLukk={() => {}} lager={lager} />)
    expect(await screen.findByText('Regelsettet UAMFE')).toBeTruthy()
    expect(screen.getByText('Hele fortolkningen i OUS Klinisk farmakologi')).toBeTruthy()
    expect(screen.getByText('Gjelder ikke nå.')).toBeTruthy()
    expect(screen.getAllByText(/av Ada Admin$/)).toHaveLength(2)
  })

  it('sier fra når det ikke er noe', async () => {
    const { lager } = minnelager()
    render(<MittRedaktoransvar apen onLukk={() => {}} lager={lager} />)
    expect(await screen.findByText('Du har ikke redaktøransvar for noe nå.')).toBeTruthy()
  })
})

describe('redigeringen for en redaktør', () => {
  it('har ingen «Publiser», bare at en administrator publiserer', async () => {
    const { container } = render(<Redigeringshandlinger plan={[]} laster={false} kanPublisere={false} onPubliser={async () => {}} onAvslutt={() => {}} />)
    expect(screen.queryByRole('button', { name: /Publiser/ })).toBeNull()
    expect(container.textContent).toContain(PUBLISERES_AV_ADMINISTRATOR)
  })
})
