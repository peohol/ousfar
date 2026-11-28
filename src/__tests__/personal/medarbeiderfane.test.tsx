// @vitest-environment jsdom
/**
 * Medarbeidere-fanen og «Vis som» i appen (P2c, #620, docs/personal.md §7.4,
 * §8.5 og K-SKJ-7), med databasen erstattet og bare syntetiske medarbeidere:
 *
 * - tabellen viser dem som er med fremover, de nye først, stillingen fra
 *   profilen («Mangler stilling» uten), vaktene og vaktandelen i dag;
 * - vaktene lagres som hele lista med revisjonen som ble vist, og vaktandelen
 *   som hele planen, regnet med domenefunksjonene, så en dag før i dag
 *   avvises før noe sendes; tidligere, gjeldende og fremtidige ordinære
 *   vaktandeler vises, og bare de fremtidige kan fjernes;
 * - serverens avvisning (en konflikt) vises, og grunnlaget hentes på nytt;
 * - en kollega ser medarbeiderne og vaktandelen, men ikke vaktene og ingen
 *   knapper, og bare den lokale administratoren velger de vaktplanansvarlige;
 * - «Vis som» finnes bare med en simulering fra databasen, og gir bare
 *   rollene til og med den virkelige.
 *
 * Serveren håndhever alt dette selv (src/__tests__/personal/medarbeidere.test.ts).
 */
import { PAST_CHANGE_MESSAGE } from '@delt/personal/dutyShare'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Personalgrunnlag } from '../../personal/grunnlag'

const db = vi.hoisted(() => ({
  kall: [] as { funksjon: string; argumenter: Record<string, unknown> }[],
  /** Svaret per funksjon: data, eller en feil med kode og melding. */
  svar: {} as Record<string, { data?: unknown; feil?: { code: string; message: string } }>,
}))

vi.mock('../../auth/klient', () => ({
  klient: () => ({
    rpc: async (funksjon: string, argumenter: Record<string, unknown> = {}) => {
      db.kall.push({ funksjon, argumenter })
      const s = db.svar[funksjon]
      return s?.feil ? { data: null, error: s.feil } : { data: s?.data ?? null, error: null }
    },
  }),
}))

const { Medarbeidere } = await import('../../personal/medarbeidere/Medarbeidere')
const { VisSom } = await import('../../personal/VisSom')

const I_DAG = '2026-12-01'
const FAGMILJO = { id: 'f1', nokkel: 'sandkasse', navn: 'Sandkasse', standard: false, apent: true, ikon: 'sandkasse' } as const
const STATUSER = [
  { id: 'vakt1', name: 'Vakt 1', requiresQualification: true, active: true },
  { id: 'vakt2', name: 'Vakt 2', requiresQualification: true, active: true },
  { id: 'gammel', name: 'Gammel vakt', requiresQualification: true, active: false },
  { id: 'ferie', name: 'Ferie', requiresQualification: false, active: true },
]
const medarbeider = (id: string, navn: string, ekstra: Record<string, unknown> = {}) => ({
  id,
  navn,
  stilling: 'lis',
  syntetisk: true,
  aktiv_fra: '2026-01-01',
  aktiv_til: null,
  perioder: [],
  revisjon: 3,
  vaktandel: { ordinary: [], temporary: [] },
  kvalifikasjoner: [{ status: 'vakt1', fra: '2026-01-01', til: null }],
  ...ekstra,
})

function grunnlag(rolle: 'reader' | 'planner' | 'localAdmin', ekstra: Record<string, unknown> = {}): Personalgrunnlag {
  return {
    rolle,
    svar: {
      rolle,
      i_dag: I_DAG,
      regelsett: [{ statuses: [] }, { statuses: STATUSER }],
      kategorier: [{ id: 'lis', name: 'LIS', short: 'LIS' }],
      medarbeidere: [
        medarbeider('alma', 'Alma Berg', { vaktandel: { ordinary: [{ from: '2026-06-01', percent: 80 }], temporary: [] } }),
        medarbeider('ny', 'Nora Ny', { kvalifikasjoner: [], stilling: null }),
        medarbeider('borte', 'Bent Borte', { aktiv_til: '2026-11-15' }),
        medarbeider('siste', 'Siri Siste', { aktiv_til: I_DAG }),
      ],
      ...ekstra,
    },
  }
}

beforeAll(() => {
  // jsdom har ikke `<dialog>` sine metoder.
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

beforeEach(() => {
  db.kall = []
  db.svar = {
    personal_sett_kvalifikasjoner: { data: { id: 'alma', revisjon: 4, kvalifikasjoner: [], vaktandel: { ordinary: [], temporary: [] } } },
    personal_lagre_vaktandel: { data: { id: 'alma', revisjon: 4, kvalifikasjoner: [], vaktandel: { ordinary: [], temporary: [] } } },
    personal_medlemmer: { data: [{ bruker: 'b1', navn: 'Pia Plan', vaktplanansvarlig: true }, { bruker: 'b2', navn: 'Kari Kollega', vaktplanansvarlig: false }] },
  }
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
})

const kallTil = (funksjon: string) => db.kall.filter((k) => k.funksjon === funksjon).map((k) => k.argumenter)

describe('Medarbeidere-fanen', () => {
  it('viser dem som er med fremover, de nye først, med stillingen, vaktene og vaktandelen i dag', () => {
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={() => {}} />)
    const tabell = screen.getByRole('table')
    const kolonner = within(tabell).getAllByRole('columnheader').map((c) => c.textContent)
    // Bare oppgavene som krever kvalifikasjon og er aktive i dagens oppsett.
    expect(kolonner).toEqual(['Medarbeider', 'Stilling', 'Vakt 1', 'Vakt 2', 'Vaktandel', 'Endre'])
    const rader = within(tabell).getAllByRole('row').slice(1)
    expect(rader.map((r) => within(r).getByRole('rowheader').textContent)).toEqual(['Nora NyNy', 'Alma Berg'])
    const [nora, alma] = rader as [HTMLElement, HTMLElement]
    expect(within(nora).getByText('Mangler stilling')).toBeTruthy()
    expect(within(nora).getByRole('button', { name: 'Velg vakter for Nora Ny' })).toBeTruthy()
    expect(within(alma).getByRole('img', { name: 'Ja' })).toBeTruthy()
    expect(within(alma).getByText('Nei')).toBeTruthy()
    expect(within(alma).getByText('80 %')).toBeTruthy()
    expect(within(alma).getByText('LIS')).toBeTruthy()
    // Ingen valg av vaktplanansvarlige for en vaktplanansvarlig.
    expect(screen.queryByRole('heading', { name: 'Vaktplanansvarlige' })).toBeNull()
    expect(kallTil('personal_medlemmer')).toEqual([])
  })

  it('lagrer vaktene som hele lista med revisjonen som ble vist, og henter grunnlaget på nytt', async () => {
    const hentPaNytt = vi.fn()
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={hentPaNytt} />)
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('LIS')).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Vakt 2' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(kallTil('personal_sett_kvalifikasjoner')).toEqual([{ fagmiljo: 'f1', medarbeider: 'alma', statuser: ['vakt1', 'vakt2'], forventet_revisjon: 3 }])
    expect(hentPaNytt).toHaveBeenCalled()
  })

  it('viser serverens avvisning i redigeringen, og henter grunnlaget på nytt', async () => {
    const hentPaNytt = vi.fn()
    const melding = 'Medarbeideren er endret av en annen siden den ble hentet. Hent den på nytt.'
    db.svar.personal_sett_kvalifikasjoner = { feil: { code: 'PT409', message: melding } }
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={hentPaNytt} />)
    await userEvent.click(screen.getByRole('button', { name: 'Velg vakter for Nora Ny' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('Mangler stilling')).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Vakt 1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(melding)
    expect(screen.getByRole('dialog')).toBeTruthy()
    expect(hentPaNytt).toHaveBeenCalled()
  })

  it('lagrer vaktandelen som hele planen, og avviser en dag før i dag før noe sendes', async () => {
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByRole('heading', { name: 'Vaktandel nå 80 %' })).toBeTruthy()
    const ordinaer = within(dialog).getByRole('form', { name: 'Ordinær vaktandel' }) as HTMLFormElement
    const fra = within(ordinaer).getByLabelText('Ordinær fra')
    const prosent = within(ordinaer).getByLabelText('Prosent')

    await userEvent.clear(fra)
    await userEvent.type(fra, '2026-11-30')
    await userEvent.clear(prosent)
    await userEvent.type(prosent, '60')
    // Nettleserens egen kontroll av datoen står ikke i jsdom; domenet stopper den.
    ordinaer.noValidate = true
    await userEvent.click(within(ordinaer).getByRole('button', { name: 'Sett' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(PAST_CHANGE_MESSAGE)
    expect(kallTil('personal_lagre_vaktandel')).toEqual([])

    await userEvent.clear(fra)
    await userEvent.type(fra, '2027-01-01')
    await userEvent.click(within(ordinaer).getByRole('button', { name: 'Sett' }))
    await waitFor(() => expect(kallTil('personal_lagre_vaktandel')).toHaveLength(1))
    expect(kallTil('personal_lagre_vaktandel')[0]).toEqual({
      fagmiljo: 'f1',
      medarbeider: 'alma',
      vaktandel: { ordinary: [{ from: '2026-06-01', percent: 80 }, { from: '2027-01-01', percent: 60 }], temporary: [] },
      forventet_revisjon: 3,
    })

    // Den neste endringen bruker revisjonen serveren ga tilbake.
    const periode = within(dialog).getByRole('form', { name: 'Ny midlertidig periode' })
    await userEvent.clear(within(periode).getByLabelText('Fra'))
    await userEvent.type(within(periode).getByLabelText('Fra'), '2027-02-01')
    await userEvent.clear(within(periode).getByLabelText('Til'))
    await userEvent.type(within(periode).getByLabelText('Til'), '2027-02-28')
    await userEvent.click(within(periode).getByRole('button', { name: 'Legg til' }))
    await waitFor(() => expect(kallTil('personal_lagre_vaktandel')).toHaveLength(2))
    const andre = kallTil('personal_lagre_vaktandel')[1] as { vaktandel: { temporary: { from: string; to: string; percent: number; id: string }[] }; forventet_revisjon: number }
    expect(andre.forventet_revisjon).toBe(4)
    expect(andre.vaktandel.temporary).toEqual([{ id: expect.any(String), from: '2027-02-01', to: '2027-02-28', percent: 50 }])
  })

  it('viser tidligere, gjeldende og fremtidige ordinære vaktandeler, og lar bare de fremtidige fjernes', async () => {
    const vaktandel = {
      ordinary: [
        { from: '2027-03-01', percent: 50 },
        { from: '2026-01-01', percent: 100 },
        { from: '2026-06-01', percent: 80 },
      ],
      temporary: [],
    }
    const g = grunnlag('planner')
    const medarbeidere = (g.svar.medarbeidere as Record<string, unknown>[]).map((m) => (m.id === 'alma' ? { ...m, vaktandel } : m))
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={{ ...g, svar: { ...g.svar, medarbeidere } }} hentPaNytt={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    const liste = within(screen.getByRole('dialog')).getByRole('list', { name: 'Ordinær vaktandel' })
    const rader = within(liste).getAllByRole('listitem')
    expect(rader.map((r) => r.textContent)).toEqual(['1. jan. 2026–31. mai 2026100 %Tidligere', '1. juni 2026–28. feb. 202780 %Gjelder nå', 'Fra 1. mars 202750 %Fjern'])
    expect(within(liste).getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(['Fjern vaktandelen fra 1. mars 2027'])
    await userEvent.click(within(liste).getByRole('button'))
    await waitFor(() => expect(kallTil('personal_lagre_vaktandel')).toHaveLength(1))
    expect((kallTil('personal_lagre_vaktandel')[0] as { vaktandel: { ordinary: { from: string }[] } }).vaktandel.ordinary.map((o) => o.from).sort()).toEqual(['2026-01-01', '2026-06-01'])
  })

  it('viser en kollega medarbeiderne og vaktandelen, men ikke vaktene og ingen knapper', () => {
    // Lesemodellen gir ikke en kollega kvalifikasjonene, så ingen står som nye.
    const uten = grunnlag('reader')
    const medarbeidere = (uten.svar.medarbeidere as Record<string, unknown>[]).map((m) => ({ ...m, kvalifikasjoner: [] }))
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={{ ...uten, svar: { ...uten.svar, medarbeidere } }} hentPaNytt={() => {}} />)
    const tabell = screen.getByRole('table')
    expect(within(tabell).getAllByRole('columnheader').map((c) => c.textContent)).toEqual(['Medarbeider', 'Stilling', 'Vaktandel'])
    expect(within(tabell).getAllByRole('rowheader').map((r) => r.textContent)).toEqual(['Alma Berg', 'Nora Ny'])
    expect(screen.queryAllByRole('button')).toEqual([])
    expect(screen.queryByText(/Her velges/)).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Vaktplanansvarlige' })).toBeNull()
  })

  it('lar bare den lokale administratoren velge de vaktplanansvarlige blant medlemmene', async () => {
    const hentPaNytt = vi.fn()
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('localAdmin')} hentPaNytt={hentPaNytt} />)
    expect(await screen.findByRole('heading', { name: 'Vaktplanansvarlige' })).toBeTruthy()
    const kari = await screen.findByRole('checkbox', { name: 'Kari Kollega' })
    expect((screen.getByRole('checkbox', { name: 'Pia Plan' }) as HTMLInputElement).checked).toBe(true)
    await userEvent.click(kari)
    await waitFor(() => expect(kallTil('personal_sett_vaktplanansvarlig')).toEqual([{ fagmiljo: 'f1', bruker: 'b2', ansvarlig: true }]))
    expect(hentPaNytt).toHaveBeenCalled()
  })
})

describe('«Vis som»', () => {
  const simulering = (reell: string, vis: Record<string, unknown> | null = null) => ({
    simulering: { rolle: (vis?.rolle as string) ?? reell, reell_rolle: reell, vis_som: vis, meg: null },
  })

  it('finnes ikke uten en simulering fra databasen, som utenfor et testmiljø', () => {
    const { container } = render(<VisSom fagmiljo="f1" grunnlag={grunnlag('localAdmin', { simulering: null })} onEndret={() => {}} />)
    expect(container.textContent).toBe('')
  })

  it('gir bare rollene til og med den virkelige, og lagrer valget på serveren', async () => {
    const onEndret = vi.fn()
    render(<VisSom fagmiljo="f1" grunnlag={grunnlag('planner', simulering('planner'))} onEndret={onEndret} />)
    const rolle = screen.getByLabelText('Rolle')
    expect(within(rolle).getAllByRole('option').map((o) => o.textContent)).toEqual(['Kollega', 'Vaktplanansvarlig (din rolle)'])
    await userEvent.selectOptions(rolle, 'reader')
    await waitFor(() => expect(kallTil('personal_vis_som')).toEqual([{ fagmiljo: 'f1', rolle: 'reader', medarbeider: null }]))
    expect(onEndret).toHaveBeenCalled()
  })

  it('velger en syntetisk medarbeider, og avslutter med begge tomme', async () => {
    render(<VisSom fagmiljo="f1" grunnlag={grunnlag('localAdmin', simulering('localAdmin', { rolle: 'reader', medarbeider: null }))} onEndret={() => {}} />)
    const som = screen.getByLabelText('Som medarbeider')
    expect(within(som).getAllByRole('option').map((o) => o.textContent)).toEqual(['Ikke som medarbeider', 'Alma Berg', 'Nora Ny', 'Bent Borte', 'Siri Siste'])
    await userEvent.selectOptions(som, 'alma')
    await userEvent.click(screen.getByRole('button', { name: 'Avslutt' }))
    await waitFor(() =>
      expect(kallTil('personal_vis_som')).toEqual([
        { fagmiljo: 'f1', rolle: 'reader', medarbeider: 'alma' },
        { fagmiljo: 'f1', rolle: null, medarbeider: null },
      ]),
    )
  })

  it('viser serverens avvisning', async () => {
    db.svar.personal_vis_som = { feil: { code: '42501', message: 'Med «Vis som» kan du bare få færre rettigheter enn du har.' } }
    render(<VisSom fagmiljo="f1" grunnlag={grunnlag('localAdmin', simulering('localAdmin'))} onEndret={() => {}} />)
    await userEvent.selectOptions(screen.getByLabelText('Rolle'), 'planner')
    expect((await screen.findByRole('alert')).textContent).toBe('Med «Vis som» kan du bare få færre rettigheter enn du har.')
  })
})

describe('modellen', () => {
  it('følger periodene for en virkelig medarbeider, som databasen (`personal.aktiv_fremover`)', async () => {
    const { erMedFremover, iFanen, lesMedarbeidergrunnlag } = await import('../../personal/medarbeidere/modell')
    const g = lesMedarbeidergrunnlag(
      grunnlag('planner', {
        medarbeidere: [
          medarbeider('aapen', 'Åse Åpen', { syntetisk: false, perioder: [{ fra: '2026-01-01', til: null }] }),
          medarbeider('slutter', 'Sara Slutter', { syntetisk: false, perioder: [{ fra: '2026-01-01', til: '2026-12-02' }] }),
          medarbeider('sluttet', 'Siv Sluttet', { syntetisk: false, perioder: [{ fra: '2026-01-01', til: I_DAG }] }),
          medarbeider('igjen', 'Ida Igjen', { syntetisk: false, perioder: [{ fra: '2026-01-01', til: '2026-03-01' }, { fra: I_DAG, til: null }] }),
        ],
      }),
    )
    expect(g.medarbeidere.map((m) => [m.id, erMedFremover(m, I_DAG)])).toEqual([
      ['aapen', true],
      ['slutter', true],
      ['sluttet', false],
      ['igjen', true],
    ])
    expect(iFanen(g).map((m) => m.id)).toEqual(['aapen', 'slutter', 'igjen'])
    expect(g.oppgaver.map((s) => s.id)).toEqual(['vakt1', 'vakt2'])
  })
})
