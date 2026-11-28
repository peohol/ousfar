// @vitest-environment jsdom
/**
 * Rammeverket for paneler på forsiden som et eierprosjekt registrerer, og som
 * bare finnes for dem som har funksjonen (issue #599, docs/forside.md,
 * «Paneler fra et eierprosjekt»):
 *
 * - Uten funksjonen i fagmiljøet brukeren arbeider i finnes panelet verken i
 *   oppsettet brukeren ser, i «Tilpass forsiden» eller på forsiden, og koden
 *   hentes ikke. Valget brukeren har lagret for det, står urørt.
 * - Det lagrede oppsettet tåler at tilgangen forsvinner og kommer tilbake.
 * - Feltet øverst står under fortolkningen og over panelene, og kan skjules.
 * - Hvert panel henter, feiler og prøves igjen for seg, også når koden ikke
 *   lot seg hente; fagmiljøbyttet viser aldri det forrige fagmiljøets innhold.
 *
 * Panelene og funksjonene er oppdiktet; ingen personalopplysninger.
 */
import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Fagmiljoreferanse, Rettigheter } from '../auth/rettigheter'
import type { Forsidemodul, Forsideoppsett, Modulinnholdprops } from '../forside/moduler'
import type { Oppsummering } from '../forside/oppsummering'

const tilstand = vi.hoisted(() => ({ bruker: 'leser' }))

/** Koden og hentingene til de oppdiktede panelene, styrt av testene. */
const kode = vi.hoisted(() => ({
  /** Koden som er hentet, i rekkefølge. */
  hentet: [] as string[],
  /** Koden som feiler å hentes, til testen sier noe annet. */
  feiler: new Set<string>(),
  komponenter: {} as Record<string, unknown>,
  hent: (async (hva: string, fagmiljo: string, dag: number) => `${hva} ${fagmiljo} ${dag}`) as (hva: string, fagmiljo: string, dag: number) => Promise<string>,
}))

vi.mock('../forside/registrerte', async () => {
  const { senere } = await import('../oppdatering/senere')
  const last = (navn: string) =>
    senere(async () => {
      kode.hentet.push(navn)
      if (kode.feiler.has(navn)) throw new Error('nede')
      return { [navn]: kode.komponenter[navn] } as Record<string, (p: Modulinnholdprops) => JSX.Element>
    }, navn)
  return {
    REGISTRERTE_MODULER: {
      syntetisk_topp: { tittel: 'Syntetisk dag', ikon: 'kalender', standard: true, funksjon: 'syntetisk', plass: 'topp', innhold: last('Toppinnhold') },
      syntetisk_panel: { tittel: 'Syntetisk panel', ikon: 'oppgaver', standard: true, funksjon: 'syntetisk', innhold: last('Panelinnhold') },
      syntetisk_feil: { tittel: 'Ustabilt panel', ikon: 'oppgaver', standard: true, funksjon: 'ustabil', innhold: last('Feilinnhold') },
      syntetisk_aldri: { tittel: 'Aldri sett', ikon: 'kalender', standard: true, funksjon: 'aldri', plass: 'topp', innhold: last('Aldriinnhold') },
    },
  }
})
vi.mock('../auth/okt', () => ({
  useProfil: () => ({ id: tilstand.bruker, role: 'user', first_name: 'Lars', last_name: 'Leser', username: 'leser' }),
}))
vi.mock('../auth/api', () => ({ hentProfilkort: () => Promise.resolve([]) }))
vi.mock('../forside/api', () => ({ hentOppsummering: vi.fn(), hentOppsett: vi.fn(), lagreOppsett: vi.fn() }))
vi.mock('../varsler/api', async (original) => ({
  ...(await original<typeof import('../varsler/api')>()),
  hentEndringsloggstatus: () => Promise.resolve(null),
  merkVarslerLest: () => Promise.resolve(),
}))

const api = await import('../forside/api')
const { Forside } = await import('../components/forside/Forside')
const { INGEN_RETTIGHETER, RettigheterKilde } = await import('../auth/rettigheter')
const moduler = await import('../forside/moduler')
const { Oppsummeringskort, Panelstatus } = await import('../components/oppsummering/Oppsummeringskort')
const { forhentPaneler, usePanelhenting } = await import('../components/forside/usePanelhenting')
const { paneltilgang, useGlemPanelerUtenTilgang } = await import('../components/forside/useForsideoppsett')
const { ALLE, STANDARDOPPSETT, erStandard, flytt, gjenopprettStandard, lesOppsett, settSynlig, synligeModuler, tilgangFor, tilgjengeligeValg } = moduler

const TOPP = 'syntetisk_topp' as Forsidemodul
const PANEL = 'syntetisk_panel' as Forsidemodul
const FEIL = 'syntetisk_feil' as Forsidemodul
const ALDRI = 'syntetisk_aldri' as Forsidemodul

/** Feltet øverst: blar mellom dager og holder dagen selv, og henter hver dag for seg. */
function Toppinnhold({ fagmiljo }: Modulinnholdprops) {
  const [dag, setDag] = useState(0)
  const henting = usePanelhenting('syntetisk_topp', (f) => kode.hent('topp', f, dag), String(dag))
  return (
    <div>
      <p>
        {fagmiljo.navn}, dag {dag}
      </p>
      <button type="button" onClick={() => setDag((d) => d + 1)}>
        Neste dag
      </button>
      {henting.status === 'klar' ? <p>{henting.svar}</p> : <Panelstatus innhold={henting} />}
    </div>
  )
}

/** Et vanlig panel, som forsidens egne. */
function Panelinnhold({ tittel, ikon }: Modulinnholdprops) {
  const henting = usePanelhenting('syntetisk_panel', (f) => kode.hent('panel', f, 0))
  return (
    <Oppsummeringskort
      tittel={tittel}
      ikon={ikon}
      innhold={henting.status === 'klar' ? { status: 'klar', hendelser: [] } : henting}
      tomtekst={henting.status === 'klar' ? henting.svar : undefined}
    />
  )
}

const Feilinnhold = ({ tittel, ikon }: Modulinnholdprops) => <Oppsummeringskort tittel={tittel} ikon={ikon} innhold={{ status: 'klar', hendelser: [] }} tomtekst="Hentet likevel" />
const Aldriinnhold = () => <p>Skulle aldri vises</p>

Object.assign(kode.komponenter, { Toppinnhold, Panelinnhold, Feilinnhold, Aldriinnhold })

const KF: Fagmiljoreferanse = { id: 'kf', nokkel: 'syntetisk-kf', navn: 'Syntetisk farmakologi', standard: true, apent: true, ikon: 'laboratorium' }
const RT: Fagmiljoreferanse = { id: 'rt', nokkel: 'syntetisk-rt', navn: 'Syntetisk toksikologi', standard: false, apent: true, ikon: 'laboratorium' }
const TOM: Oppsummering = { lest_kl: '2026-11-28T12:00:00Z', varsler: [], invitasjoner: [], grupper: [], fagsider: [], oppgaver: [] }

function utsatt<T>() {
  let svar!: (verdi: T) => void
  const lovnad = new Promise<T>((ja) => {
    svar = ja
  })
  return { lovnad, svar }
}

/** Rettighetene til en bruker som arbeider i `arbeid`, med funksjonene i parene. */
const rettigheter = (arbeid: Fagmiljoreferanse | null, funksjoner: [string, string][] = []): Rettigheter => ({
  ...INGEN_RETTIGHETER,
  arbeidsfagmiljo: arbeid,
  mineFagmiljoer: [KF, RT],
  velgbareFagmiljoer: [KF, RT],
  funksjoner: funksjoner.map(([funksjon, fagmiljo]) => ({ funksjon, fagmiljo })),
})

const MED_SYNTETISK = rettigheter(KF, [['syntetisk', 'kf']])

/** Som i `App`: det som er hentet til et panel brukeren mister, glemmes når rettighetene endres. */
function Glemmer({ rettigheter: r }: { rettigheter: Rettigheter }) {
  useGlemPanelerUtenTilgang(r)
  return null
}

function vis(verdi: Rettigheter) {
  const tegn = (r: Rettigheter) => (
    <RettigheterKilde verdi={r} oppdater={vi.fn()}>
      <Glemmer rettigheter={r} />
      <Forside onApneFortolkning={vi.fn()} />
    </RettigheterKilde>
  )
  const resultat = render(tegn(verdi))
  return { ...resultat, bytt: (r: Rettigheter) => resultat.rerender(tegn(r)) }
}

const omrade = (navn: string) => screen.queryByRole('region', { name: navn })
const apneTilpass = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Tilpass forsiden' }))
  return screen.getByRole('dialog', { name: /Tilpass forsiden/ })
}

let teller = 0
beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  window.scrollTo = () => undefined
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})
beforeEach(() => {
  tilstand.bruker = `rammeverk-${(teller += 1)}`
  vi.mocked(api.hentOppsett).mockResolvedValue(STANDARDOPPSETT)
  vi.mocked(api.lagreOppsett).mockResolvedValue()
  vi.mocked(api.hentOppsummering).mockResolvedValue(TOM)
  kode.hent = async (hva, fagmiljo, dag) => `${hva} ${fagmiljo} ${dag}`
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('oppsettet med paneler som hører til en funksjon', () => {
  const tilgangMed = (...funksjoner: string[]) => tilgangFor(KF, (f, fagmiljo) => fagmiljo === 'kf' && funksjoner.includes(f))
  const uten = tilgangMed()

  it('gir panelene bare den som har funksjonen i fagmiljøet hen arbeider i', () => {
    const med = tilgangMed('syntetisk')
    expect([TOPP, PANEL, FEIL, ALDRI].map(med)).toEqual([true, true, false, false])
    expect([TOPP, PANEL].map(uten)).toEqual([false, false])
    // Funksjonen i et annet fagmiljø gir ingenting her, og uten fagmiljø finnes ingen registrerte paneler.
    expect(tilgangFor(RT, (f, fagmiljo) => fagmiljo === 'kf' && f === 'syntetisk')(TOPP)).toBe(false)
    expect(tilgangFor(null, () => true)(TOPP)).toBe(false)
    // Forsidens egne paneler har alle.
    expect(moduler.MODULREKKEFOLGE.filter((m) => moduler.erInnebygd(m)).every(uten)).toBe(true)
  })

  it('viser ikke panelene uten funksjonen, verken på forsiden eller i valgene', () => {
    expect(synligeModuler(STANDARDOPPSETT, uten)).toEqual(['viktig_nytt', 'aktuelt', 'grupper', 'fagsider'])
    expect(tilgjengeligeValg(STANDARDOPPSETT, uten).map((v) => v.modul)).toEqual(moduler.MODULREKKEFOLGE.filter((m) => moduler.erInnebygd(m)))
    const med = tilgangMed('syntetisk')
    expect(synligeModuler(STANDARDOPPSETT, med, 'topp')).toEqual([TOPP])
    expect(synligeModuler(STANDARDOPPSETT, med, 'paneler')).toEqual(['viktig_nytt', 'aktuelt', 'grupper', 'fagsider', PANEL])
  })

  it('gir et panel med en funksjon standardvalget når det mangler i det lagrede, og et vanlig nytt panel skjult', () => {
    const oppsett = lesOppsett([{ modul: 'grupper', synlig: true }])
    const valg = (modul: Forsidemodul) => oppsett.find((v) => v.modul === modul)?.synlig
    expect(valg(TOPP)).toBe(true)
    expect(valg(PANEL)).toBe(true)
    expect(valg('viktig_nytt')).toBe(false)
  })

  it('flytter blant panelene brukeren har, og lar de andre stå der de sto', () => {
    const oppsett: Forsideoppsett = [
      { modul: 'viktig_nytt', synlig: true },
      { modul: FEIL, synlig: true },
      { modul: TOPP, synlig: true },
      { modul: 'grupper', synlig: true },
    ]
    const med = tilgangMed('syntetisk')
    const ned = flytt(oppsett, 'viktig_nytt', 1, med)
    expect(ned.map((v) => v.modul)).toEqual(['grupper', FEIL, TOPP, 'viktig_nytt'])
    expect(flytt(ned, 'grupper', -1, med)).toBe(ned)
    // Uten tilgangen flyttes alt, som før.
    expect(flytt(oppsett, 'viktig_nytt', 1, ALLE).map((v) => v.modul)).toEqual([FEIL, 'viktig_nytt', TOPP, 'grupper'])
  })

  it('regner standarden og gjenoppretter den bare for panelene brukeren har', () => {
    const skjult = settSynlig(STANDARDOPPSETT, PANEL, false)
    // Panelet brukeren ikke har, røper seg ikke i «Gjenopprett standard».
    expect(erStandard(skjult, uten)).toBe(true)
    expect(erStandard(skjult, tilgangMed('syntetisk'))).toBe(false)
    const endret = settSynlig(skjult, 'grupper', false)
    const gjenopprettet = gjenopprettStandard(endret, uten)
    expect(gjenopprettet.find((v) => v.modul === 'grupper')?.synlig).toBe(true)
    expect(gjenopprettet.find((v) => v.modul === PANEL)?.synlig).toBe(false)
    expect(gjenopprettStandard(endret, tilgangMed('syntetisk'))).toBe(STANDARDOPPSETT)
  })

  it('lar panelene brukeren ikke har, stå på plassen sin når standarden gjenopprettes', () => {
    // Panelet er flyttet øverst og skjult, og brukeren har ikke funksjonen nå.
    const oppsett = [1, 2, 3, 4, 5, 6, 7, 8, 9].reduce((o) => flytt(o, PANEL, -1), settSynlig(settSynlig(STANDARDOPPSETT, PANEL, false), 'grupper', false))
    expect(oppsett[0]!.modul).toBe(PANEL)
    const gjenopprettet = gjenopprettStandard(oppsett, uten)
    expect(gjenopprettet[0]).toEqual({ modul: PANEL, synlig: false })
    expect(tilgjengeligeValg(gjenopprettet, uten)).toEqual(tilgjengeligeValg(STANDARDOPPSETT, uten))
    expect(gjenopprettet).toHaveLength(STANDARDOPPSETT.length)
  })
})

describe('forsiden med paneler som hører til en funksjon', () => {
  it('har ingen spor av panelene uten funksjonen, henter ikke koden og beholder det lagrede valget', async () => {
    const lagret = settSynlig(settSynlig(STANDARDOPPSETT, TOPP, false), PANEL, true)
    vi.mocked(api.hentOppsett).mockResolvedValue(lagret)
    vis(rettigheter(KF, [['syntetisk', 'rt']]))
    await waitFor(() => expect(api.hentOppsett).toHaveBeenCalled())
    await waitFor(() => expect(within(omrade('Oppdaterte fagsider')!).getByText('Ingen nye hendelser.')).toBeTruthy())
    expect(omrade('Syntetisk dag')).toBeNull()
    expect(omrade('Syntetisk panel')).toBeNull()
    expect(document.querySelector('.forside__topp')).toBeNull()

    const dialog = await apneTilpass()
    expect(within(dialog).queryByText(/Syntetisk/)).toBeNull()
    expect(within(dialog).queryByText('Øverst')).toBeNull()
    expect((within(dialog).getByRole('button', { name: 'Gjenopprett standard' }) as HTMLButtonElement).disabled).toBe(true)

    // En endring her lar valget for panelene brukeren ikke har, stå.
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Mine oppgaver' }))
    expect(api.lagreOppsett).toHaveBeenLastCalledWith(settSynlig(lagret, 'oppgaver', true))
    expect(kode.hentet).not.toContain('Toppinnhold')
    expect(kode.hentet).not.toContain('Panelinnhold')
    expect(kode.hentet).not.toContain('Aldriinnhold')
  })

  it('viser feltet øverst under fortolkningen og panelet blant panelene for den som har funksjonen', async () => {
    vis(MED_SYNTETISK)
    const topp = await screen.findByRole('region', { name: 'Syntetisk dag' })
    expect(await within(topp).findByText('topp kf 0')).toBeTruthy()
    const forside = document.querySelector('.forside')!
    const deler = [...forside.children].slice(0, 4).map((d) => d.className)
    expect(deler).toEqual(['forside__hode', 'forside__hovedhandling', 'forside__topp', 'forside__paneler'])
    const panel = await screen.findByRole('region', { name: 'Syntetisk panel' })
    expect(document.querySelector('.forside__paneler')!.contains(panel)).toBe(true)
    expect(await within(panel).findByText('panel kf 0')).toBeTruthy()
    expect(omrade('Aldri sett')).toBeNull()
    expect(kode.hentet).not.toContain('Aldriinnhold')
  })

  it('lar brukeren skjule feltet øverst i «Tilpass forsiden», uten opp og ned for det', async () => {
    vis(MED_SYNTETISK)
    await screen.findByRole('region', { name: 'Syntetisk dag' })
    const dialog = await apneTilpass()
    const rad = within(dialog).getByRole('switch', { name: 'Syntetisk dag' }).closest('li')!
    expect(within(rad).getByText('Øverst')).toBeTruthy()
    expect(within(rad).queryByRole('button', { name: /Flytt/ })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Flytt Syntetisk panel opp' })).toBeTruthy()

    await userEvent.click(within(dialog).getByRole('switch', { name: 'Syntetisk dag' }))
    expect(api.lagreOppsett).toHaveBeenLastCalledWith(settSynlig(STANDARDOPPSETT, TOPP, false))
    expect(omrade('Syntetisk dag')).toBeNull()
  })

  it('tåler at tilgangen forsvinner og kommer tilbake, med valgene brukeren hadde', async () => {
    // Panelet står over «Oppdaterte fagsider», og feltet øverst er skjult.
    const lagret = [1, 2, 3, 4, 5].reduce((o) => flytt(o, PANEL, -1), settSynlig(STANDARDOPPSETT, TOPP, false))
    vi.mocked(api.hentOppsett).mockResolvedValue(lagret)
    const { bytt } = vis(MED_SYNTETISK)
    await screen.findByRole('region', { name: 'Syntetisk panel' })
    expect(omrade('Syntetisk dag')).toBeNull()

    bytt(rettigheter(KF))
    expect(omrade('Syntetisk panel')).toBeNull()
    const dialog = await apneTilpass()
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Mine oppgaver' }))
    expect(api.lagreOppsett).toHaveBeenLastCalledWith(settSynlig(lagret, 'oppgaver', true))
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ferdig' }))

    bytt(MED_SYNTETISK)
    const paneler = [...document.querySelectorAll('.forside__paneler > *')].map((p) => p.querySelector('h2')?.textContent)
    expect(paneler.slice(-3)).toEqual(['Syntetisk panel', 'Oppdaterte fagsider', 'Mine oppgaver'])
    expect(omrade('Syntetisk dag')).toBeNull()
  })

  it('holder panelets egen tilstand når forsiden tegnes på nytt, og begynner på nytt i et nytt fagmiljø uten det forrige innholdet', async () => {
    const begge = rettigheter(KF, [
      ['syntetisk', 'kf'],
      ['syntetisk', 'rt'],
    ])
    const { bytt } = vis(begge)
    const topp = await screen.findByRole('region', { name: 'Syntetisk dag' })
    await userEvent.click(within(topp).getByRole('button', { name: 'Neste dag' }))
    expect(await within(topp).findByText('topp kf 1')).toBeTruthy()

    // Forsiden tegnes på nytt (et annet panel slås på): dagen står.
    const dialog = await apneTilpass()
    await userEvent.click(within(dialog).getByRole('switch', { name: 'Mine oppgaver' }))
    expect(within(omrade('Syntetisk dag')!).getByText('Syntetisk farmakologi, dag 1')).toBeTruthy()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Ferdig' }))

    const ny = utsatt<string>()
    kode.hent = (hva, fagmiljo, dag) => (fagmiljo === 'rt' ? ny.lovnad : Promise.resolve(`${hva} ${fagmiljo} ${dag}`))
    bytt({ ...begge, arbeidsfagmiljo: RT })
    const etter = omrade('Syntetisk dag')!
    expect(within(etter).getByText('Syntetisk toksikologi, dag 0')).toBeTruthy()
    expect(within(etter).queryByText(/topp kf/)).toBeNull()
    expect(within(etter).getByText(/Henter/)).toBeTruthy()
    await act(async () => ny.svar('topp rt 0'))
    expect(within(etter).getByText('topp rt 0')).toBeTruthy()
  })

  it('lar panelet feile for seg når koden ikke lot seg hente, og «Prøv igjen» henter den', async () => {
    kode.feiler.add('Feilinnhold')
    vis(rettigheter(KF, [['ustabil', 'kf']]))
    const panel = () => omrade('Ustabilt panel')!
    await waitFor(() => expect(within(panel()).getByText('Kunne ikke hente dette nå.')).toBeTruthy())
    await waitFor(() => expect(within(omrade('Oppdaterte fagsider')!).getByText('Ingen nye hendelser.')).toBeTruthy())

    kode.feiler.delete('Feilinnhold')
    const forsok = kode.hentet.length
    await userEvent.click(within(panel()).getByRole('button', { name: 'Prøv igjen' }))
    expect(await within(panel()).findByText('Hentet likevel')).toBeTruthy()
    expect(kode.hentet.slice(forsok)).toEqual(['Feilinnhold'])
  })

  it('lar hentingen i et panel feile for seg, og «Prøv igjen» henter bare det på nytt', async () => {
    const kall: string[] = []
    kode.hent = (hva, fagmiljo, dag) => {
      kall.push(hva)
      return hva === 'panel' ? Promise.reject(new Error('nede')) : Promise.resolve(`${hva} ${fagmiljo} ${dag}`)
    }
    vis(MED_SYNTETISK)
    const panel = await screen.findByRole('region', { name: 'Syntetisk panel' })
    await waitFor(() => expect(within(panel).getByText('Kunne ikke hente dette nå.')).toBeTruthy())
    expect(await within(omrade('Syntetisk dag')!).findByText('topp kf 0')).toBeTruthy()

    kall.length = 0
    kode.hent = (hva, fagmiljo, dag) => {
      kall.push(hva)
      return Promise.resolve(`${hva} ${fagmiljo} ${dag}`)
    }
    await userEvent.click(within(panel).getByRole('button', { name: 'Prøv igjen' }))
    expect(await within(panel).findByText('panel kf 0')).toBeTruthy()
    expect(kall).toEqual(['panel'])
  })

  it('henter på forhånd under et fagmiljøbytte bare panelene de nye rettighetene gir', async () => {
    const kall: string[] = []
    kode.hent = (hva, fagmiljo, dag) => {
      kall.push(`${hva} ${fagmiljo}`)
      return Promise.resolve(`${hva} ${fagmiljo} ${dag}`)
    }
    vis(MED_SYNTETISK)
    expect(await within(await screen.findByRole('region', { name: 'Syntetisk panel' })).findByText('panel kf 0')).toBeTruthy()
    vi.mocked(api.hentOppsummering).mockClear()

    // Til et fagmiljø uten funksjonen: forsidens egne paneler hentes, de med funksjonen ikke.
    forhentPaneler('rt', paneltilgang(rettigheter(RT)))
    expect(kall.filter((k) => k.endsWith(' rt'))).toEqual([])
    expect(vi.mocked(api.hentOppsummering).mock.calls.map(([m]) => m).sort()).toEqual(['aktuelt', 'fagsider', 'grupper', 'viktig_nytt'])

    // Med funksjonen der, hentes de også.
    forhentPaneler('rt', paneltilgang(rettigheter(RT, [['syntetisk', 'rt']])))
    expect(kall.filter((k) => k.endsWith(' rt')).sort()).toEqual(['panel rt', 'topp rt'])
    forhentPaneler(null, () => true)
  })

  it('viser feilen, ikke det som var hentet før, når en ny henting avvises', async () => {
    const { unmount } = vis(MED_SYNTETISK)
    expect(await within(await screen.findByRole('region', { name: 'Syntetisk panel' })).findByText('panel kf 0')).toBeTruthy()
    unmount()

    // Forsiden åpnes igjen, og serveren avviser nå hentingen (som når tilgangen er borte).
    let avvis!: (grunn: Error) => void
    const avslag = new Promise<string>((_, nei) => {
      avvis = nei
    })
    kode.hent = (hva, fagmiljo, dag) => (hva === 'panel' ? avslag : Promise.resolve(`${hva} ${fagmiljo} ${dag}`))
    vis(MED_SYNTETISK)
    const panel = () => omrade('Syntetisk panel')!
    // Det hentede står mens den nye hentingen er ute, så forsiden ikke blinker.
    expect(within(panel()).getByText('panel kf 0')).toBeTruthy()
    await act(async () => avvis(new Error('Finnes ikke.')))
    await waitFor(() => expect(within(panel()).getByText('Kunne ikke hente dette nå.')).toBeTruthy())
    expect(within(panel()).queryByText('panel kf 0')).toBeNull()
    expect(within(panel()).getByRole('button', { name: 'Prøv igjen' })).toBeTruthy()

    // Heller ikke neste gang forsiden åpnes.
    cleanup()
    kode.hent = () => new Promise(() => undefined)
    vis(MED_SYNTETISK)
    expect(within(omrade('Syntetisk panel')!).queryByText('panel kf 0')).toBeNull()
    expect(within(omrade('Syntetisk panel')!).getByText(/Henter/)).toBeTruthy()
  })

  it('glemmer det som er hentet når tilgangen forsvinner, så det ikke vises når den kommer tilbake', async () => {
    const { bytt } = vis(MED_SYNTETISK)
    expect(await within(await screen.findByRole('region', { name: 'Syntetisk panel' })).findByText('panel kf 0')).toBeTruthy()

    bytt(rettigheter(KF))
    expect(omrade('Syntetisk panel')).toBeNull()

    kode.hent = () => new Promise(() => undefined)
    bytt(MED_SYNTETISK)
    const panel = await screen.findByRole('region', { name: 'Syntetisk panel' })
    expect(within(panel).queryByText('panel kf 0')).toBeNull()
    expect(within(panel).getByText(/Henter/)).toBeTruthy()
  })
})
