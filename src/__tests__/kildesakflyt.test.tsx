// @vitest-environment jsdom
/**
 * Produksjonsflyten for kildesakene (VDR-5 i `docs/verktøy-omlegging-2026-11.md`):
 * hele veien fra en kjøring av overvåkingen til det klinikeren ser på
 * verktøysiden, mot en database bygd av migrasjonene, med de klinisk godkjente
 * reglene og det lagrede FEST-uttrekket. Tiden styres av kjøringene og
 * uttrekket, ikke av klokken, så ingenting venter på 24 eller 72 timer.
 *
 * 1. Ingen klinisk konsekvens: en teknisk sak, ingen sak for redaktøren, intet
 *    varsel, planen beregnes som før, og saken avsluttes teknisk med bevis.
 * 2. Klinisk spørsmål: varsel bare ved den berørte anbefalingen, et valg for
 *    redaktøren, et tiltak som må utføres og kontrolleres, og så lukking.
 * 3. Reell alvorlig risiko: sikkerhetsproblem til redaktøren straks, målrettet
 *    nødstopp for akkurat den regelen, mens en annen godkjent regel virker;
 *    når nødstoppen oppheves, virker regelen igjen.
 *
 * Alle data er syntetiske; ingen regel, godkjenning eller grense endres.
 */
import type { PGlite } from '@electric-sql/pglite'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { TILGJENGELIGHET_UKONTROLLERT, Verktoyside } from '../components/verktoy/Verktoyside'
import type { Databasekall } from '../legemiddeldata/lager'
import { glemBildet } from '../oppdatering/bevaring'
import { agentargumenter, utforAgentoppgave, type Agentoppgave } from '../verktoy/overvaking/agentoppgaver'
import { godkjenteRegler } from '../verktoy/overvaking/berorte'
import { lagFagsaklager, redaktorvarsel } from '../verktoy/overvaking/fagsak'
import type { Berort, Overvakingsfunn, Overvakingsrapport } from '../verktoy/overvaking/modell'
import { lagRegelvarsellager } from '../verktoy/overvaking/regelvarsler'
import { registrer } from '../verktoy/overvaking/registrering'
import { lagKildeovervakingslager } from '../verktoy/overvaking/varsling'
import { FEST_PILOT } from '../verktoy/regler/aksepttest'
import { lesVerktoysperrer } from '../verktoy/sperrer'
import { kallSom } from './hjelp/fest'
import { pilotklokke, pilotlesing, pilotuttrekk } from './hjelp/pilotside'
import { besvarAlt, planen, planpanel, stoppet, tidslinje } from './hjelp/verktoyflyt'
import { nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

// PGlite leser sine egne pakker som `Blob`; jsdom sin `Blob` mangler `arrayBuffer`.
Blob.prototype.arrayBuffer ??= function (this: Blob) {
  return new Promise<ArrayBuffer>((ok, feil) => {
    const leser = new FileReader()
    leser.onload = () => ok(leser.result as ArrayBuffer)
    leser.onerror = () => feil(leser.error)
    leser.readAsArrayBuffer(this)
  })
}

// Pilotuttrekket har sertralin, mirtazapin og paliperidon.
const PILOT = pilotuttrekk(FEST_PILOT)

/** En godkjent regel slik overvåkingen melder den berørt. */
function berort(id: string, verktoy: string): Berort {
  const g = godkjenteRegler().find((x) => x.regel.id === id)!
  return { regelsett: g.regelsett, regel: id, versjon: g.regel.versjon, fingeravtrykk: g.fingeravtrykk, hvorfor: 'henviser til kilden', verktoy: [verktoy] }
}
const SERTRALIN = berort('kryssnedtrapping-sertralin-mirtazapin', 'bytte-antidepressiv')

/** Et endret kildedokument som `regler` bygger på. */
const funn = (objekt: string, avtrykk: string, regler: Berort[] = [SERTRALIN]): Overvakingsfunn => ({
  id: `dokument:${objekt}`,
  kilde: 'dokument',
  art: 'endret',
  niva: 'krever_vurdering',
  objekt,
  etikett: `Syntetisk kilde ${objekt}`,
  detaljer: ['Nå: syntetisk innhold.'],
  berorte: regler,
  prioritet: 'vanlig',
  tilstandsavtrykk: avtrykk.repeat(64),
})

const rapport = (kjort_kl: string, funnene: Overvakingsfunn[]): Overvakingsrapport => ({
  versjon: 1,
  kjort_kl,
  grunnlag: [{ kilde: 'dokument', kjort: true, kontrollert: 2, beskrivelse: 'Syntetisk' }],
  funn: funnene,
  feil: [],
})

/** Et fullstendig faglig spørsmål om sertralin → mirtazapin. */
const sporsmal = (anbefalt: string) => ({
  tittel: 'Kilden for byttet er revidert',
  endring: 'Kilden anbefaler nå en annen takt for byttet.',
  kilde: { navn: 'Syntetisk kilde', lenke: 'https://example.invalid/kilde', sammenlignet_kl: '2027-05-03T06:20:00Z' },
  berorte: [{ regel: SERTRALIN.regel, versjon: SERTRALIN.versjon, hva: 'takten i byttet' }],
  relevans: 'Planen kan bli for rask for noen pasienter.',
  anbefaling: { valg: anbefalt, begrunnelse: 'Den reviderte kilden gjelder akkurat denne delen av planen.', av: 'Claude, kontrollert av ChatGPT' },
  valg: [
    { valg: 'behold', verktoyet: 'Planen brukes som før.' },
    { valg: 'revider', verktoyet: 'Planen brukes som før til den nye versjonen er godkjent.' },
    { valg: 'deaktiver', verktoyet: 'Regelen gir ingen plan før den er vurdert på nytt.' },
    { valg: 'utsett', verktoyet: 'Planen brukes som før.' },
  ],
  status_na: 'Planen er fortsatt godkjent og brukes som før.',
})

const BEVIS = {
  metode: 'avsnittsavtrykk',
  sammenlignet: 'Avsnittene regelen henviser til, mot det kontrollerte grunnlaget.',
  grunnlag: 'Syntetisk grunnlag, utgave 2027-05-01',
  kontroll: 'https://github.com/eier/repo/pull/1',
}

beforeEach(() => {
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView ??= function () {}
  sessionStorage.clear()
  glemBildet()
})
afterEach(cleanup)

describe('produksjonsflyten fra kildesak til verktøysiden (VDR-5)', () => {
  let db: PGlite
  let admin: string
  let lege: string
  let tjener: Databasekall

  /** Et kall som den innloggede `hvem`, som data-API-et gjør det. */
  const kallFor =
    (hvem: string): Databasekall =>
    async (funksjon, argumenter) => {
      const navn = Object.keys(argumenter)
      const rader = await som(
        db,
        hvem,
        async (tx) =>
          (
            await tx.query<{ r: unknown }>(
              `select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`,
              navn.map((n) => argumenter[n]),
            )
          ).rows,
      )
      return rader[0]!.r
    }
  const meld = (r: Overvakingsrapport) => registrer(tjener, r, 'cron', 'https://github.com/eier/repo/actions/runs/1')
  const agent = (oppgave: Agentoppgave, felt: Record<string, unknown>) => utforAgentoppgave(tjener, oppgave, agentargumenter(oppgave, { ...felt, av: 'Claude (syntetisk)' })!) as Promise<number>
  const saker = async () => (await lagKildeovervakingslager(kallFor(admin)).les()).funn
  const sak = async (objekt: string) => (await saker()).find((f) => f.funn === `dokument:${objekt}` && f.tilstand !== 'avsluttet')!
  const redaktor = () => lagFagsaklager(kallFor(admin))

  /** Verktøysiden slik legen ser den nå: sperrene og varslene fra databasen, preparatene fra uttrekket. */
  function verktoyside(verktoy: string, uttrekk = PILOT) {
    cleanup()
    glemBildet()
    render(
      <Verktoyside
        verktoy={verktoy}
        legemidler={pilotlesing(uttrekk)}
        sperrer={{ les: async () => lesVerktoysperrer(await kallFor(lege)('les_verktoysperrer', {})) }}
        regelvarsler={lagRegelvarsellager(kallFor(lege))}
        onLukk={vi.fn()}
        klokke={pilotklokke(uttrekk)}
      />,
    )
    return userEvent.setup()
  }

  /**
   * Bytte fra sertralin til mirtazapin; gir siden når valget er gjort. Startforløpet når ikke sluttmålet, så klinikeren får
   * ingen delplan, bare at en komplett plan ikke er tilgjengelig (Peders beslutning 03.11.2026), og det med en gang, før
   * dosen og spørsmålene om pasienten. Byttet står derfor ikke blant snarvalgene og skrives inn.
   */
  async function sertralinTilMirtazapin() {
    const user = verktoyside('bytte-antidepressiv')
    await waitFor(() => expect(screen.queryByText(TILGJENGELIGHET_UKONTROLLERT.henter)).toBeNull())
    expect(screen.queryByRole('button', { name: 'Sertralin → mirtazapin' })).toBeNull()
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Sertralin')
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Mirtazapin')
    await stoppet(/Ingen plan for dette valgetIngen godkjent regel gir en komplett plan for dette valget ennå\./)
    expect(screen.queryByRole('textbox', { name: /Aktuell døgndose av sertralin/ })).toBeNull()
    return planpanel().closest('.verktoyside') as HTMLElement
  }

  beforeAll(async () => {
    db = await nyDatabase()
    admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    lege = await opprettBruker(db, { brukernavn: 'bo.lege', fornavn: 'Bo', etternavn: 'Lege', rolle: 'user' })
    tjener = kallSom(db, 'service_role')
  }, 60_000)

  it('1. ingen klinisk konsekvens: teknisk sak uten redaktørsak eller varsel, planen som før, avsluttet teknisk med bevis', async () => {
    expect(await meld(rapport('2027-05-03T06:20:00Z', [funn('oppsett', 'a')]))).toMatchObject({ nye: 1 })
    const s = await sak('oppsett')
    expect(s).toMatchObject({ tilstand: 'teknisk_utredning', prove: false })
    // Redaktøren får ingen sak og ingen prikk, og legen intet varsel.
    expect((await redaktor().les()).saker).toEqual([])
    expect(redaktorvarsel(await redaktor().les())).toEqual([])
    expect(await lagRegelvarsellager(kallFor(lege)).les()).toEqual([])

    const plan = await sertralinTilMirtazapin()
    expect(within(plan).queryByRole('note')).toBeNull()

    // Agenten har sammenlignet avsnittene: avsluttet teknisk, og samme innhold senere gir ingen ny sak.
    expect(await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'uten_faglig_betydning', begrunnelse: 'Bare oppsettet rundt teksten er endret.', bevis: BEVIS })).toBe(
      s.versjon + 2,
    )
    expect((await saker()).find((f) => f.id === s.id)).toMatchObject({ tilstand: 'avsluttet', utfall: 'teknisk_avklart' })
    expect(await meld(rapport('2027-05-10T06:20:00Z', [funn('oppsett', 'a')]))).toMatchObject({ nye: 0, endrede: 0 })
    expect((await redaktor().les()).saker).toEqual([])
  })

  it('2. klinisk spørsmål: varsel bare ved den berørte anbefalingen, redaktørens valg, kontrollert tiltak, så lukking', async () => {
    await meld(rapport('2027-05-17T06:20:00Z', [funn('takt', 'b')]))
    let s = await sak('takt')
    let v = await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'faglig_relevant', begrunnelse: 'Avsnittet om takten er endret.' })
    v = await agent('brukervarsel', { funn: s.id, versjon: v, tekst: 'Under faglig gjennomgang: kilden for takten er revidert.', regler: [{ regel: SERTRALIN.regel, versjon: SERTRALIN.versjon }] })
    v = await agent('faglig_sporsmal', { funn: s.id, versjon: v, sporsmal: sporsmal('revider') })

    // Legen ser varselet ved sertralin → mirtazapin, og beregningen gjøres som før.
    const plan = await sertralinTilMirtazapin()
    expect(within(plan).getByRole('note').textContent).toMatch(/^Under faglig gjennomgang: kilden for takten er revidert\./)
    // Ved vortioksetin, som ikke er berørt, står det ingenting.
    const user = verktoyside('trappe-ned-antidepressiv')
    await waitFor(() => expect(screen.queryByText(TILGJENGELIGHET_UKONTROLLERT.henter)).toBeNull())
    await user.type(screen.getByRole('combobox', { name: 'Virkestoff pasienten bruker' }), 'Vortioksetin')
    await stoppet(/Ingen plan for dette valget/)
    expect(screen.queryByRole('note')).toBeNull()

    // Redaktøren får spørsmålet med valg og virkning, og en prikk.
    const oversikt = await redaktor().les()
    const fagsak = oversikt.saker.find((x) => x.id === String(s.id))!
    expect(fagsak).toMatchObject({ fase: 'beslutning', alvor: 'faglig', versjon: v })
    expect(redaktorvarsel(oversikt)).toHaveLength(1)
    expect(await redaktor().beslutt(fagsak.id, fagsak.versjon, 'revider', null)).toBe('registrert')

    // Beslutningen lukker ikke saken; tiltaket må utføres og kontrolleres.
    s = await sak('takt')
    expect(s).toMatchObject({ tilstand: 'oppfolging', tiltak: [{ status: 'bestilt' }] })
    expect(redaktorvarsel(await redaktor().les())).toEqual([])
    const t = s.tiltak[0]!
    await agent('tiltak', { tiltak: t.id, versjon: s.versjon, status: 'utfort', bevis: 'Ny regelversjon i PR, godkjent av kontrollør.', lenke: 'https://github.com/eier/repo/pull/2' })
    expect(await sak('takt')).toMatchObject({ tilstand: 'oppfolging' })
    await agent('tiltak', { tiltak: t.id, versjon: (await sak('takt')).versjon, status: 'kontrollert', bevis: 'Den nye versjonen er publisert og gir planen i produksjonen.' })
    expect((await redaktor().les()).saker.find((x) => x.id === String(s.id))).toMatchObject({ fase: 'avsluttet', avsluttet: { utfall: 'tiltak_kontrollert' } })

    // Varselet er borte når saken er avsluttet.
    expect(await lagRegelvarsellager(kallFor(lege)).les()).toEqual([])
    expect(within(await sertralinTilMirtazapin()).queryByRole('note')).toBeNull()
  })

  it('3. reell alvorlig risiko: målrettet nødstopp for akkurat den regelen, en annen godkjent regel virker, og opphevet virker regelen igjen', async () => {
    await meld(rapport('2027-05-24T06:20:00Z', [funn('fare', 'c')]))
    let s = await sak('fare')
    let v = await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'mulig_alvorlig_risiko', begrunnelse: 'Kilden fraråder nå byttet for en vanlig pasientgruppe.' })
    // Sikkerhetsproblemet når redaktøren straks, med prikk, før noe spørsmål er formulert.
    const straks = await redaktor().les()
    expect(straks.saker.find((x) => x.id === String(s.id))).toMatchObject({ alvor: 'sikkerhet', fase: 'beslutning', valg: [] })
    expect(redaktorvarsel(straks)).not.toEqual([])

    v = await agent('faglig_sporsmal', { funn: s.id, versjon: v, sporsmal: sporsmal('deaktiver') })
    expect(await redaktor().beslutt(String(s.id), v, 'deaktiver', 'Sperres til en ny versjon er vurdert.')).toBe('registrert')
    const sperrer = lesVerktoysperrer(await kallFor(lege)('les_verktoysperrer', {}))
    expect(sperrer).toEqual([expect.objectContaining({ omfang: 'regel', mal: SERTRALIN.regel })])

    // Sertralin → mirtazapin gir ingen beregning og sier hvorfor; Xeplion, en annen godkjent regel, gir en plan som før.
    let user = verktoyside('bytte-antidepressiv')
    await waitFor(() => expect(screen.queryByText(TILGJENGELIGHET_UKONTROLLERT.henter)).toBeNull())
    expect(screen.queryByRole('button', { name: 'Sertralin → mirtazapin' })).toBeNull()
    await user.type(screen.getByRole('combobox', { name: 'Bytte fra' }), 'Sertralin')
    await user.type(screen.getByRole('combobox', { name: 'Bytte til' }), 'Mirtazapin')
    expect((await screen.findByRole('alert', { name: 'Midlertidig deaktivert' })).textContent).toMatch(/Kildesak nr\. \d+: Kilden for byttet er revidert/)
    expect(screen.queryByRole('heading', { name: /^Steg 2/ })).toBeNull()
    expect(tidslinje()).toBeNull()

    user = verktoyside('bytte-antipsykotikum')
    await user.click(await screen.findByRole('button', { name: 'Paliperidon: peroral → depotinjeksjon (paliperidonpalmitat)' }))
    await user.type(await screen.findByRole('textbox', { name: /Aktuell døgndose av paliperidon/ }), '6')
    await besvarAlt(user)
    expect(within(await planen(/Xeplion/)).getByRole('list', { name: 'Planen dag for dag' })).toBeTruthy()

    // Saken er avsluttet med nødstoppen som kontrollert tiltak; historikken står.
    const lukket = (await saker()).find((f) => f.id === s.id)!
    expect(lukket).toMatchObject({ tilstand: 'avsluttet', utfall: 'tiltak_kontrollert', tiltak: [{ status: 'kontrollert', regel: SERTRALIN.regel }] })
    expect(lukket.hendelser.map((h) => h.art)).toEqual(expect.arrayContaining(['teknisk_konklusjon', 'faglig_sporsmal', 'beslutning']))

    // Administratoren opphever nødstoppen med en grunn: regelen beregnes igjen, og sperren står i historikken.
    await kallFor(admin)('opphev_verktoysperre', { sperre: sperrer[0]!.id, grunn: 'Ny versjon vurdert; syntetisk.' })
    expect(lesVerktoysperrer(await kallFor(lege)('les_verktoysperrer', {}))).toEqual([])
    expect(await sertralinTilMirtazapin()).toBeTruthy()
    const historikk = (await kallFor(admin)('verktoysperrehistorikk', {})) as { mal: string; opphevet_kl: string | null; opphevet_grunn: string | null }[]
    expect(historikk).toEqual([expect.objectContaining({ mal: SERTRALIN.regel, opphevet_kl: expect.any(String), opphevet_grunn: 'Ny versjon vurdert; syntetisk.' })])
    s = await sak('fare')
    expect(s).toBeUndefined()
  })
})
