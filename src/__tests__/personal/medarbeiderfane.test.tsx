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
 *   rollene til og med den virkelige; til kalenderen er hentet med den nye
 *   rollen, er valgene låst og fanene fra den forrige skjult, også når
 *   hentingen feiler, og den kan prøves igjen.
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
  /** Et svar som kommer når testen sier det, per funksjon. */
  senere: {} as Record<string, () => Promise<{ data?: unknown; feil?: { code: string; message: string } }>>,
}))

vi.mock('../../auth/klient', () => ({
  klient: () => ({
    rpc: async (funksjon: string, argumenter: Record<string, unknown> = {}) => {
      db.kall.push({ funksjon, argumenter })
      const s = db.senere[funksjon] ? await db.senere[funksjon]() : db.svar[funksjon]
      return s?.feil ? { data: null, error: s.feil } : { data: s?.data ?? null, error: null }
    },
  }),
}))

const { Medarbeidere } = await import('../../personal/medarbeidere/Medarbeidere')
const { Personalside } = await import('../../personal/Personalside')

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
  ny: false,
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
        medarbeider('ny', 'Nora Ny', { kvalifikasjoner: [], ny: true, stilling: null }),
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
  db.senere = {}
  sessionStorage.clear()
})

afterEach(() => {
  cleanup()
})

/** Teksten slik en skjermleser får den: uten det som er skjult for den. */
function lest(el: HTMLElement): string {
  const kopi = el.cloneNode(true) as HTMLElement
  kopi.querySelectorAll('[aria-hidden="true"]').forEach((n) => n.remove())
  return kopi.textContent ?? ''
}

const kallTil = (funksjon: string) => db.kall.filter((k) => k.funksjon === funksjon).map((k) => k.argumenter)

describe('Medarbeidere-fanen', () => {
  it('viser dem som er med fremover, de nye først, med stillingen, vaktene og vaktandelen i dag', () => {
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={() => {}} />)
    const tabell = screen.getByRole('table')
    const kolonner = within(tabell).getAllByRole('columnheader').map((c) => c.textContent)
    // Bare oppgavene som krever kvalifikasjon og er aktive i dagens oppsett.
    expect(kolonner).toEqual(['Medarbeider', 'Stilling', 'Vakt 1', 'Vakt 2', 'Vaktandel', 'Endre'])
    const rader = within(tabell).getAllByRole('row').slice(1)
    expect(rader.map((r) => lest(within(r).getByRole('rowheader')))).toEqual(['Nora NyNy', 'Alma Berg'])
    // Forbokstavene står ved navnet, for øyet.
    expect(rader.map((r) => r.querySelector('.avatar')?.textContent)).toEqual(['NN', 'AB'])
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

  it('kvitterer «Ny» også når ingen vakter velges, med revisjonen som ble vist', async () => {
    const hentPaNytt = vi.fn()
    db.svar.personal_sett_kvalifikasjoner = { data: { id: 'ny', revisjon: 4, ny: false, kvalifikasjoner: [], vaktandel: { ordinary: [], temporary: [] } } }
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={hentPaNytt} />)
    await userEvent.click(screen.getByRole('button', { name: 'Velg vakter for Nora Ny' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(kallTil('personal_sett_kvalifikasjoner')).toEqual([{ fagmiljo: 'f1', medarbeider: 'ny', statuser: [], forventet_revisjon: 3 }])
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

  it('forkaster et utkast til vakter når noen andre har endret dem, også etter en konflikt, men ikke etter en egen vaktandel', async () => {
    const melding = 'Medarbeideren er endret av en annen siden den ble hentet. Hent den på nytt.'
    db.svar.personal_sett_kvalifikasjoner = { feil: { code: 'PT409', message: melding } }
    // Grunnlaget slik serveren gir det etter at en annen har gitt Alma bare Vakt 2.
    const endret = (g: Personalgrunnlag): Personalgrunnlag => ({
      ...g,
      svar: {
        ...g.svar,
        medarbeidere: (g.svar.medarbeidere as Record<string, unknown>[]).map((m) => (m.id === 'alma' ? { ...m, revisjon: 5, kvalifikasjoner: [{ status: 'vakt2', fra: I_DAG, til: null }] } : m)),
      },
    })
    const forst = grunnlag('planner')
    let gjeldende = forst
    const hentPaNytt = vi.fn(() => {
      gjeldende = endret(forst)
    })
    const { rerender } = render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={gjeldende} hentPaNytt={hentPaNytt} />)
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    let dialog = screen.getByRole('dialog')
    // A velger Vakt 2 i tillegg, ut fra Vakt 1.
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Vakt 2' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    expect((await within(dialog).findByRole('alert')).textContent).toBe(melding)
    expect(hentPaNytt).toHaveBeenCalledTimes(1)
    rerender(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={gjeldende} hentPaNytt={hentPaNytt} />)
    dialog = screen.getByRole('dialog')
    // Utkastet er forkastet: de nye vaktene vises, med en melding.
    expect(within(dialog).getByRole('status').textContent).toMatch(/endret av noen andre/)
    expect((within(dialog).getByRole('checkbox', { name: 'Vakt 1' }) as HTMLInputElement).checked).toBe(false)
    expect((within(dialog).getByRole('checkbox', { name: 'Vakt 2' }) as HTMLInputElement).checked).toBe(true)
    // «Lagre» uten et nytt valg sender ingenting som kunne overskrive endringen.
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(kallTil('personal_sett_kvalifikasjoner')).toHaveLength(1)

    // Et nytt valg ut fra de nye vaktene sendes med den nye revisjonen.
    db.svar.personal_sett_kvalifikasjoner = { data: { id: 'alma', revisjon: 6, kvalifikasjoner: [], vaktandel: { ordinary: [], temporary: [] } } }
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    dialog = screen.getByRole('dialog')
    expect(within(dialog).queryByRole('status')).toBeNull()
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Vakt 1' }))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(kallTil('personal_sett_kvalifikasjoner')).toHaveLength(2))
    expect(kallTil('personal_sett_kvalifikasjoner')[1]).toEqual({ fagmiljo: 'f1', medarbeider: 'alma', statuser: ['vakt2', 'vakt1'], forventet_revisjon: 5 })
  })

  it('lar utkastet til vakter stå når en egen vaktandel lagres imens', async () => {
    db.svar.personal_lagre_vaktandel = {
      data: { id: 'alma', revisjon: 4, kvalifikasjoner: [{ status: 'vakt1', fra: '2026-01-01', til: null }], vaktandel: { ordinary: [{ from: '2026-06-01', percent: 80 }, { from: '2027-01-01', percent: 60 }], temporary: [] } },
    }
    render(<Medarbeidere fagmiljo={FAGMILJO} grunnlag={grunnlag('planner')} hentPaNytt={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Endre Alma Berg' }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('checkbox', { name: 'Vakt 2' }))
    const ordinaer = within(dialog).getByRole('form', { name: 'Ordinær vaktandel' })
    await userEvent.clear(within(ordinaer).getByLabelText('Ordinær fra'))
    await userEvent.type(within(ordinaer).getByLabelText('Ordinær fra'), '2027-01-01')
    await userEvent.clear(within(ordinaer).getByLabelText('Prosent'))
    await userEvent.type(within(ordinaer).getByLabelText('Prosent'), '60')
    await userEvent.click(within(ordinaer).getByRole('button', { name: 'Sett' }))
    await waitFor(() => expect(kallTil('personal_lagre_vaktandel')).toHaveLength(1))
    expect(within(dialog).queryByRole('status')).toBeNull()
    expect((within(dialog).getByRole('checkbox', { name: 'Vakt 2' }) as HTMLInputElement).checked).toBe(true)
    await userEvent.click(within(dialog).getByRole('button', { name: 'Lagre' }))
    await waitFor(() => expect(kallTil('personal_sett_kvalifikasjoner')).toHaveLength(1))
    expect(kallTil('personal_sett_kvalifikasjoner')[0]).toEqual({ fagmiljo: 'f1', medarbeider: 'alma', statuser: ['vakt1', 'vakt2'], forventet_revisjon: 4 })
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
    expect(within(tabell).getAllByRole('rowheader').map(lest)).toEqual(['Alma Berg', 'Nora Ny'])
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
  /** Grunnlaget slik serveren gir det, med rollen «Vis som» gir. */
  const svar = (reell: 'reader' | 'planner' | 'localAdmin', vis: Record<string, unknown> | null = null) => {
    const rolle = (vis?.rolle as 'reader' | 'planner' | 'localAdmin' | undefined) ?? reell
    return grunnlag(rolle, simulering(reell, vis)).svar
  }
  /** Et svar på `personal_grunnlag` som kommer når testen sier det. */
  function ventende() {
    let slipp: (s: { data?: unknown; feil?: { code: string; message: string } }) => void = () => {}
    db.senere.personal_grunnlag = () => new Promise((ok) => (slipp = ok))
    return (s: { data?: unknown; feil?: { code: string; message: string } }) => {
      delete db.senere.personal_grunnlag
      db.svar.personal_grunnlag = s
      slipp(s)
    }
  }
  const side = (fane?: 'medarbeidere') => render(<Personalside fagmiljo={FAGMILJO} fane={fane} onGaaTil={() => {}} onLukk={() => {}} onFinnesIkke={() => {}} />)
  const fanene = () => screen.queryAllByRole('link').map((a) => a.textContent)

  it('finnes ikke uten en simulering fra databasen, som utenfor et testmiljø', async () => {
    db.svar.personal_grunnlag = { data: grunnlag('localAdmin', { simulering: null }).svar }
    side()
    await screen.findByRole('link', { name: 'Medarbeidere' })
    expect(screen.queryByRole('group', { name: 'Vis som' })).toBeNull()
  })

  it('gir bare rollene til og med den virkelige, og lagrer valget på serveren', async () => {
    db.svar.personal_grunnlag = { data: svar('planner') }
    side()
    const rolle = await screen.findByLabelText('Rolle')
    expect(within(rolle).getAllByRole('option').map((o) => o.textContent)).toEqual(['Kollega', 'Vaktplanansvarlig (din rolle)'])
    db.svar.personal_vis_som = { data: simulering('planner', { rolle: 'reader', medarbeider: null }).simulering }
    db.svar.personal_grunnlag = { data: svar('planner', { rolle: 'reader', medarbeider: null }) }
    await userEvent.selectOptions(rolle, 'reader')
    await waitFor(() => expect(fanene()).toEqual([]))
    expect(kallTil('personal_vis_som')).toEqual([{ fagmiljo: 'f1', rolle: 'reader', medarbeider: null }])
  })

  it('låser valgene og skjuler fanene fra den forrige rollen til kalenderen er hentet med den nye', async () => {
    db.svar.personal_grunnlag = { data: svar('localAdmin') }
    side('medarbeidere')
    await screen.findByRole('table')
    expect(fanene()).toEqual(['Kalender', 'Medarbeidere'])
    db.svar.personal_vis_som = { data: simulering('localAdmin', { rolle: 'reader', medarbeider: null }).simulering }
    const slipp = ventende()
    await userEvent.selectOptions(screen.getByLabelText('Rolle'), 'reader')
    // Serveren har bekreftet kollega, men kalenderen er ikke hentet ennå.
    await screen.findByText(/Kalenderen hentes med valget/)
    expect(screen.queryByRole('table')).toBeNull()
    expect(fanene()).toEqual([])
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).value).toBe('reader')
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByLabelText('Som medarbeider') as HTMLSelectElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: 'Avslutt' }) as HTMLButtonElement).disabled).toBe(true)
    slipp({ data: svar('localAdmin', { rolle: 'reader', medarbeider: null }) })
    await waitFor(() => expect(screen.queryByText(/Kalenderen hentes med valget/)).toBeNull())
    // Som kollega finnes ikke Medarbeidere.
    expect(fanene()).toEqual([])
    expect(screen.queryByRole('table')).toBeNull()
    expect((screen.getByLabelText('Som medarbeider') as HTMLSelectElement).disabled).toBe(false)

    // Et valg av medarbeider bygger på kollega, ikke på den forrige rollen.
    db.svar.personal_vis_som = { data: simulering('localAdmin', { rolle: 'reader', medarbeider: 'alma' }).simulering }
    db.svar.personal_grunnlag = { data: svar('localAdmin', { rolle: 'reader', medarbeider: 'alma' }) }
    await userEvent.selectOptions(screen.getByLabelText('Som medarbeider'), 'alma')
    await waitFor(() => expect((screen.getByLabelText('Som medarbeider') as HTMLSelectElement).disabled).toBe(false))
    db.svar.personal_vis_som = { data: simulering('localAdmin').simulering }
    db.svar.personal_grunnlag = { data: svar('localAdmin') }
    await userEvent.click(screen.getByRole('button', { name: 'Avslutt' }))
    await waitFor(() => expect(fanene()).toEqual(['Kalender', 'Medarbeidere']))
    expect(kallTil('personal_vis_som')).toEqual([
      { fagmiljo: 'f1', rolle: 'reader', medarbeider: null },
      { fagmiljo: 'f1', rolle: 'reader', medarbeider: 'alma' },
      { fagmiljo: 'f1', rolle: null, medarbeider: null },
    ])
  })

  it('viser ingenting fra den forrige rollen når kalenderen ikke kan hentes, og lar hentingen prøves igjen', async () => {
    db.svar.personal_grunnlag = { data: svar('localAdmin') }
    side('medarbeidere')
    await screen.findByRole('table')
    db.svar.personal_vis_som = { data: simulering('localAdmin', { rolle: 'reader', medarbeider: null }).simulering }
    db.svar.personal_grunnlag = { feil: { code: '08006', message: 'Forbindelsen ble brutt.' } }
    await userEvent.selectOptions(screen.getByLabelText('Rolle'), 'reader')
    expect((await screen.findByRole('alert')).textContent).toBe('Kalenderen kunne ikke hentes med valget i «Vis som».')
    expect(screen.queryByRole('table')).toBeNull()
    expect(fanene()).toEqual([])
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).disabled).toBe(true)
    db.svar.personal_grunnlag = { data: svar('localAdmin', { rolle: 'reader', medarbeider: null }) }
    await userEvent.click(screen.getByRole('button', { name: 'Prøv igjen' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(fanene()).toEqual([])
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).value).toBe('reader')
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).disabled).toBe(false)
  })

  it('viser serverens avvisning, og henter kalenderen på nytt', async () => {
    db.svar.personal_grunnlag = { data: svar('localAdmin') }
    side()
    await screen.findByLabelText('Rolle')
    db.svar.personal_vis_som = { feil: { code: '42501', message: 'Med «Vis som» kan du bare få færre rettigheter enn du har.' } }
    const for_ = kallTil('personal_grunnlag').length
    await userEvent.selectOptions(screen.getByLabelText('Rolle'), 'planner')
    expect((await screen.findByRole('alert')).textContent).toBe('Med «Vis som» kan du bare få færre rettigheter enn du har.')
    expect(kallTil('personal_grunnlag').length).toBe(for_ + 1)
    await waitFor(() => expect((screen.getByLabelText('Rolle') as HTMLSelectElement).disabled).toBe(false))
    expect((screen.getByLabelText('Rolle') as HTMLSelectElement).value).toBe('localAdmin')
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
