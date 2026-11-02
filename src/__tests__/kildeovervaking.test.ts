/**
 * Kildesakene (VDR-1, `docs/verktøy-p12-overvaking.md` §5): mot en ekte
 * database bygd av migrasjonene melder kjøringene seg gjennom
 * serverendepunktet, og hvert funn blir en sak som først undersøkes teknisk.
 * En endret kontrollsum alene når aldri redaktøren, og det finnes ingen
 * tidsfrister. En teknisk avslutning krever bevis eller at en senere kontroll
 * fant kilden i samsvar med grunnlaget; en beslutning bestiller tiltak, og
 * saken avsluttes først når de er utført og kontrollert. Et nytt avtrykk
 * oppdaterer en åpen sak i stedet for å avløse den, og ingen rad slettes.
 * Alle data er syntetiske.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Databasekall } from '../legemiddeldata/lager'
import type { Utlost } from '../server/tilgang'
import { agentargumenter, utforAgentoppgave, type Agentoppgave } from '../verktoy/overvaking/agentoppgaver'
import { behandleKildeovervaking, OVERVAKING_ARBEIDSFLYT } from '../verktoy/overvaking/endepunkt'
import { lagFagsaklager, lesRedaktoroversikt, redaktorvarsel, type Fagsak } from '../verktoy/overvaking/fagsak'
import { PROVEFUNN } from '../verktoy/overvaking/kjoring'
import type { Funnkilde, Overvakingsfunn, Overvakingsrapport } from '../verktoy/overvaking/modell'
import { funnavtrykk } from '../verktoy/overvaking/rapport'
import { lagRegelvarsellager, varslerFor } from '../verktoy/overvaking/regelvarsler'
import { lesRapport, melding, registrer } from '../verktoy/overvaking/registrering'
import { kontrollstatus, lagKildeovervakingslager, type Kildeovervaking } from '../verktoy/overvaking/varsling'
import { kallSom } from './hjelp/fest'
import { feilFra, kjorMigrasjoner, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const REGEL = { regelsett: 's', regel: 'syntetisk-regel', versjon: 3, fingeravtrykk: 'f'.repeat(64), hvorfor: 'henviser til kilden' }

const funn = (over: Partial<Overvakingsfunn>): Overvakingsfunn => ({
  id: 'dokument:syntetisk',
  kilde: 'dokument',
  art: 'endret',
  niva: 'krever_vurdering',
  objekt: 'syntetisk',
  etikett: 'Syntetisk kilde',
  detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-02T06:00:00Z).'],
  berorte: [REGEL],
  prioritet: 'vanlig',
  ...over,
})

const ALLE: Funnkilde[] = ['dokument', 'psychiatrienet', 'fest']

/** En rapport der delene i `kjort` ble kontrollert. */
const rapport = (kjort_kl: string, funnene: Overvakingsfunn[], kjort: Funnkilde[] = ALLE, over: Partial<Overvakingsrapport> = {}): Overvakingsrapport => ({
  versjon: 1,
  kjort_kl,
  grunnlag: ALLE.map((kilde) => ({ kilde, kjort: kjort.includes(kilde), kontrollert: kjort.includes(kilde) ? 3 : 0, beskrivelse: 'Syntetisk' })),
  funn: funnene,
  feil: [],
  ...over,
})

/** Et fullstendig faglig spørsmål til redaktøren. */
const sporsmal = (over: Record<string, unknown> = {}) => ({
  tittel: 'Kilden for nedtrappingstakten er revidert',
  endring: 'Kilden anbefaler nå en langsommere nedtrapping de siste ukene.',
  kilde: { navn: 'Syntetisk kilde', lenke: 'https://example.invalid/kilde', sammenlignet_kl: '2026-11-02T06:20:00Z' },
  berorte: [{ regel: REGEL.regel, versjon: REGEL.versjon, hva: 'takten de siste ukene' }],
  relevans: 'Planen kan bli for rask for pasienter med seponeringssymptomer.',
  anbefaling: { valg: 'revider', begrunnelse: 'Den reviderte kilden er godt begrunnet og gjelder akkurat denne delen av planen.', av: 'Claude, kontrollert av ChatGPT' },
  valg: [
    { valg: 'behold', verktoyet: 'Planen brukes som før.' },
    { valg: 'revider', verktoyet: 'Planen brukes som før til den nye versjonen er godkjent.' },
    { valg: 'deaktiver', verktoyet: 'Regelen gir ingen plan før den er vurdert på nytt.' },
    { valg: 'utsett', verktoyet: 'Planen brukes som før.' },
  ],
  status_na: 'Planen er fortsatt godkjent og brukes som før.',
  ...over,
})

const BEVIS = {
  metode: 'manuell_sammenligning',
  sammenlignet: 'Avsnittene om nedtrappingstakt og symptomer, mot kildearkivets kopi fra regelens kontroll.',
  grunnlag: 'Kildearkivet, utgave 2026-10-28',
  kontroll: 'https://github.com/eier/repo/pull/1',
}

/* --- Databasen ------------------------------------------------------------------- */

describe('kildesakene i databasen', () => {
  let db: PGlite
  let admin: string
  let bruker: string
  let tjener: Databasekall

  /** Et kall som den innloggede `hvem`, som data-API-et gjør det. */
  const kallFor =
    (hvem: string | null): Databasekall =>
    async (funksjon, argumenter) => {
      const navn = Object.keys(argumenter)
      const rader = await som(db, hvem, async (tx) => (await tx.query<{ r: unknown }>(`select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, navn.map((n) => argumenter[n]))).rows)
      return rader[0]!.r
    }
  const logg = () => lagKildeovervakingslager(kallFor(admin)).les()
  const redaktor = () => lagFagsaklager(kallFor(admin))
  const meld = (r: Overvakingsrapport, utlost: Utlost = 'cron') => registrer(tjener, r, utlost, 'https://github.com/eier/repo/actions/runs/1')
  const sak = async (nokkel: string) => (await logg()).funn.find((f) => f.funn === nokkel && f.tilstand !== 'avsluttet')!
  const agent = (oppgave: Agentoppgave, felt: Record<string, unknown>) => utforAgentoppgave(tjener, oppgave, agentargumenter(oppgave, { ...felt, av: 'Claude (syntetisk)' })!)
  const rader = async (tabell: string) => (await db.query<{ n: number }>(`select count(*)::int as n from public.${tabell}`)).rows[0]!.n

  beforeAll(async () => {
    db = await nyDatabase()
    admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    bruker = await opprettBruker(db, { brukernavn: 'bo.lege', fornavn: 'Bo', etternavn: 'Lege', rolle: 'user' })
    tjener = kallSom(db, 'service_role')
  }, 60_000)

  it('tar bare imot kjøringer og agentarbeid fra serveren, og lar bare administratorer se og avgjøre sakene', async () => {
    const r = melding(rapport('2026-11-02T06:20:00Z', []), 'cron', null)
    for (const hvem of [admin, bruker]) {
      expect(await feilFra(() => kallFor(hvem)('registrer_kildeovervaking', { melding: JSON.stringify(r) }))).toMatchObject({ code: '42501' })
      expect(await feilFra(() => kallFor(hvem)('kildesak_avslutt_prove', { funn: 1, versjon: 1, bevis: 'Syntetisk bevis.', agent: 'Claude' }))).toMatchObject({ code: '42501' })
      for (const tabell of ['kildefunn', 'kildeovervaking_kjoringer', 'kildefunn_hendelser', 'kildefunn_tiltak']) {
        expect(await feilFra(() => som(db, hvem, (tx) => tx.query(`select * from public.${tabell}`)))).toMatchObject({ code: '42501' })
        expect(await feilFra(() => som(db, hvem, (tx) => tx.query(`delete from public.${tabell}`)))).toMatchObject({ code: '42501' })
      }
    }
    expect(await feilFra(() => lagFagsaklager(kallFor(bruker)).les())).toMatchObject({ code: '42501' })
    expect(await feilFra(() => lagFagsaklager(kallFor(bruker)).beslutt('1', 1, 'behold', null))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => lagKildeovervakingslager(kallFor(bruker)).les())).toMatchObject({ code: '42501' })
    // Fritekstvurderingen og fritekstavslutningen fra P12.1 finnes ikke lenger.
    for (const gammel of ['vurder_kildefunn', 'beslutt_kildefunn', 'kildefunn_teknisk_fra_agent']) {
      expect((await db.query(`select 1 from pg_proc where proname = $1`, [gammel])).rows).toHaveLength(0)
    }
    // Klinikervarslene kan leses av alle innloggede, ikke uten innlogging.
    expect(await lagRegelvarsellager(kallFor(bruker)).les()).toEqual([])
    expect(await feilFra(() => som(db, null, (tx) => tx.query('select public.les_regelvarsler()')))).toMatchObject({ code: '42501' })
  })

  it('holder et nytt funn i det tekniske sporet, uten sak for redaktøren, og oppdaterer det ved nytt innhold i stedet for å lage en ny sak', async () => {
    const dok = funn({ id: 'dokument:a', objekt: 'a', tilstandsavtrykk: 'a'.repeat(64) })
    const fest = funn({ id: 'fest:sertralin:ID_X', kilde: 'fest', art: 'fjernet', objekt: 'ID_X', prioritet: 'hoy' })
    const psy = funn({ id: 'psychiatrienet:x', kilde: 'psychiatrienet', objekt: 'x', prioritet: 'hoy' })
    expect(await meld(rapport('2026-11-02T06:20:00Z', [dok, fest, psy]))).toMatchObject({ nye: 3, endrede: 0, borte: 0, apne: 3 })
    expect((await logg()).funn.map((f) => f.tilstand)).toEqual(['teknisk_utredning', 'teknisk_utredning', 'teknisk_utredning'])
    // Ingen sak for redaktøren, ingen prikk; det tekniske sporet følges opp.
    const oversikt = lesRedaktoroversikt(await kallFor(admin)('les_fagsaker', {}))
    expect(oversikt).toMatchObject({ saker: [], teknisk: 'oppfolging', sist_kontrollert_kl: '2026-11-02T06:20:00+00:00' })
    expect(redaktorvarsel(oversikt)).toEqual([])

    // Den samme siden med nye engangsverdier: detaljene er nye, men tilstandsavtrykket er det samme, så ingenting er endret.
    const igjen = { ...dok, detaljer: ['Nå: dokumentet def (text/html, hentet 2026-11-09T06:00:00Z).'] }
    expect(funnavtrykk(igjen)).toBe(funnavtrykk(dok))
    expect(await meld(rapport('2026-11-09T06:20:00Z', [igjen, fest], ['dokument', 'fest']))).toMatchObject({ nye: 0, endrede: 0, borte: 0, apne: 3 })
    const a = await sak('dokument:a')
    expect(a).toMatchObject({ versjon: 1, detaljer: igjen.detaljer, sist_sett_kl: '2026-11-09T06:20:00+00:00' })

    // Nytt innhold: samme sak, ny versjon, det gamle innholdet i hendelsen. Psychiatrienet ble ikke kontrollert og står urørt.
    expect(await meld(rapport('2026-11-16T06:20:00Z', [{ ...dok, tilstandsavtrykk: 'b'.repeat(64) }, fest], ['dokument', 'fest']))).toMatchObject({ nye: 0, endrede: 1, apne: 3 })
    const etter = await sak('dokument:a')
    expect(etter).toMatchObject({ id: a.id, versjon: 2, tilstand: 'teknisk_utredning' })
    expect(etter.hendelser.map((h) => h.art)).toEqual(['opprettet', 'nytt_innhold'])
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.kildefunn where funn = 'dokument:a'`)).rows[0]!.n).toBe(1)
    expect((await sak('psychiatrienet:x')).sist_sett_kl).toBe('2026-11-02T06:20:00+00:00')
  })

  it('avslutter en teknisk sak automatisk bare når en del som faktisk ble kontrollert, fant kilden i samsvar med grunnlaget', async () => {
    const fest = await sak('fest:sertralin:ID_X')
    // FEST stoppet (ikke kjørt), og dokumentdelen kontrollerte ingenting: ingen sak røres.
    expect(await meld(rapport('2026-11-23T06:20:00Z', [], ['dokument'], { feil: ['FEST: innlogging avvist'], grunnlag: [{ kilde: 'dokument', kjort: true, kontrollert: 0, beskrivelse: 'Ingen' }] }))).toMatchObject({ borte: 0, avsluttede: 0 })
    // Kilden svarte ikke: nøkkelen står som informativ, så det er ukjent, ikke «uendret».
    const ukjent = rapport('2026-11-30T06:20:00Z', [funn({ id: 'fest:sertralin:ID_X', kilde: 'fest', art: 'utilgjengelig', niva: 'informativ', prioritet: undefined })], ['fest'])
    expect(await meld(ukjent)).toMatchObject({ borte: 0, avsluttede: 0 })
    // FEST kontrollert uten avvik for preparatet: tilbake i samsvar med grunnlaget, avsluttet med kjøringen som bevis.
    expect(await meld(rapport('2026-12-07T06:20:00Z', [], ['fest']))).toMatchObject({ borte: 1, avsluttede: 1 })
    const lukket = (await logg()).funn.find((f) => f.id === fest.id)!
    expect(lukket).toMatchObject({ tilstand: 'avsluttet', utfall: 'ikke_funnet_igjen', borte_kl: '2026-12-07T06:20:00+00:00' })
    expect(lukket.hendelser.at(-1)).toMatchObject({ art: 'avsluttet', fra: 'teknisk_utredning', til: 'avsluttet' })
    // Kommer avviket tilbake, er det en ny sak, ikke dekket av den gamle.
    expect(await meld(rapport('2026-12-14T06:20:00Z', [funn({ id: 'fest:sertralin:ID_X', kilde: 'fest', art: 'fjernet', objekt: 'ID_X', prioritet: 'hoy' })], ['fest']))).toMatchObject({ nye: 1 })
    expect(await sak('fest:sertralin:ID_X')).toMatchObject({ erstatter: fest.id, tilstand: 'teknisk_utredning' })
  })

  it('krever bevis med sammenlignbart grunnlag før en teknisk avslutning, aldri en kontrollsum alene, og bare for et endret kildedokument', async () => {
    const a = await sak('dokument:a')
    const konkluder = (over: Record<string, unknown>) => agent('teknisk_konklusjon', { funn: a.id, versjon: a.versjon, konklusjon: 'uten_faglig_betydning', begrunnelse: 'Bare menyen og oppsettet er endret.', bevis: BEVIS, ...over })
    expect(await feilFra(() => konkluder({ versjon: a.versjon - 1 }))).toMatchObject({ code: '55000', message: expect.stringMatching(/endret siden versjon/) })
    expect(await feilFra(() => konkluder({ bevis: null }))).toMatchObject({ code: '22023' })
    expect(await feilFra(() => konkluder({ bevis: { ...BEVIS, metode: 'kontrollsum' } }))).toMatchObject({ code: '22023', message: expect.stringMatching(/aldri en kontrollsum alene/) })
    expect(await feilFra(() => konkluder({ bevis: { ...BEVIS, kontroll: '' } }))).toMatchObject({ code: '22023' })
    const fest = await sak('fest:sertralin:ID_X')
    expect(await feilFra(() => agent('teknisk_konklusjon', { funn: fest.id, versjon: fest.versjon, konklusjon: 'uten_faglig_betydning', begrunnelse: 'Syntetisk begrunnelse.', bevis: BEVIS }))).toMatchObject({ code: '55000', message: expect.stringMatching(/Bare et endret kildedokument/) })
    // Ingen av forsøkene endret saken.
    expect(await sak('dokument:a')).toMatchObject({ versjon: a.versjon, konklusjon: null })

    // Uavklart først: saken står i det tekniske sporet.
    expect(await agent('teknisk_konklusjon', { funn: a.id, versjon: a.versjon, konklusjon: 'uavklart', begrunnelse: 'Den opprinnelige siden kan ikke gjenskapes.' })).toBe(a.versjon + 1)
    expect(await sak('dokument:a')).toMatchObject({ tilstand: 'uavklart', konklusjon: 'uavklart' })
    // Så med bevis: avsluttet teknisk, og samme innhold senere står avsluttet.
    expect(await konkluder({ versjon: a.versjon + 1 })).toBe(a.versjon + 3)
    const lukket = (await logg()).funn.find((f) => f.id === a.id)!
    expect(lukket).toMatchObject({ tilstand: 'avsluttet', utfall: 'teknisk_avklart', konklusjon: 'uten_faglig_betydning' })
    expect(await meld(rapport('2026-12-21T06:20:00Z', [funn({ id: 'dokument:a', objekt: 'a', tilstandsavtrykk: 'b'.repeat(64) })], ['dokument']))).toMatchObject({ nye: 0, endrede: 0 })
    expect((await logg()).funn.find((f) => f.id === a.id)).toMatchObject({ tilstand: 'avsluttet', sist_sett_kl: '2026-12-21T06:20:00+00:00' })
  })

  it('legger et faglig spørsmål frem for redaktøren med valg og virkning, og en beslutning bestiller tiltak i stedet for å lukke saken', async () => {
    const psy = await sak('psychiatrienet:x')
    // Et spørsmål krever faglig relevans først.
    expect(await feilFra(() => agent('faglig_sporsmal', { funn: psy.id, versjon: psy.versjon, sporsmal: sporsmal() }))).toMatchObject({ code: '55000' })
    const v1 = (await agent('teknisk_konklusjon', { funn: psy.id, versjon: psy.versjon, konklusjon: 'faglig_relevant', begrunnelse: 'Anbefalingen for takten er endret.' })) as number
    expect((lesRedaktoroversikt(await kallFor(admin)('les_fagsaker', {}))).saker).toEqual([])

    // Klinikervarselet gjelder bare de berørte regelversjonene.
    expect(await feilFra(() => agent('brukervarsel', { funn: psy.id, versjon: v1, tekst: 'Under faglig gjennomgang.', regler: [{ regel: 'annen-regel', versjon: 1 }] }))).toMatchObject({ code: '22023' })
    expect(await feilFra(() => agent('brukervarsel', { funn: psy.id, versjon: v1, tekst: `Under gjennomgang ${'a'.repeat(64)}`, regler: [{ regel: REGEL.regel, versjon: REGEL.versjon }] }))).toMatchObject({ code: '22023' })
    const v2 = (await agent('brukervarsel', { funn: psy.id, versjon: v1, tekst: 'Under faglig gjennomgang: kilden for takten er revidert.', regler: [{ regel: REGEL.regel, versjon: REGEL.versjon }] })) as number
    const varsler = await lagRegelvarsellager(kallFor(bruker)).les()
    expect(varslerFor(varsler, REGEL.regel, REGEL.versjon)).toEqual([{ regel: REGEL.regel, versjon: REGEL.versjon, tekst: 'Under faglig gjennomgang: kilden for takten er revidert.', siden: expect.any(String) }])
    expect(varslerFor(varsler, REGEL.regel, REGEL.versjon + 1)).toEqual([])

    // Spørsmålet må være fullstendig, gjelde berørte regler og ha anbefalingen blant valgene; ingen kontrollsummer.
    for (const feil of [
      sporsmal({ endring: `Kontrollsummen er nå ${'c'.repeat(64)}.` }),
      sporsmal({ berorte: [{ regel: 'annen-regel', versjon: 1, hva: 'noe' }] }),
      sporsmal({ anbefaling: { valg: 'annet', begrunnelse: 'Syntetisk begrunnelse her.', av: 'Claude' } }),
      sporsmal({ valg: [{ valg: 'behold', verktoyet: 'Som før.' }] }),
      sporsmal({ valg: [{ valg: 'behold', verktoyet: 'Som før.' }, { valg: 'behold', verktoyet: 'Som før.' }] }),
    ]) {
      expect(await feilFra(() => agent('faglig_sporsmal', { funn: psy.id, versjon: v2, sporsmal: feil })), JSON.stringify(feil).slice(0, 80)).toMatchObject({ code: '22023' })
    }
    const v3 = (await agent('faglig_sporsmal', { funn: psy.id, versjon: v2, sporsmal: sporsmal() })) as number

    const oversikt = lesRedaktoroversikt(await kallFor(admin)('les_fagsaker', {}))
    expect(redaktorvarsel(oversikt)).toHaveLength(1)
    const fagsak = oversikt.saker.find((s) => s.id === String(psy.id))!
    expect(fagsak).toMatchObject({ fase: 'beslutning', alvor: 'faglig', versjon: v3, tittel: 'Kilden for nedtrappingstakten er revidert', beslutning: null, tiltak: [], avsluttet: null })
    // Det som skjer ved hvert valg, kommer fra databasen, ikke fra agenten.
    expect(fagsak.valg.find((v) => v.valg === 'deaktiver')!.na).toEqual(['De berørte reglene sperres straks med nødstoppen, så de ikke gir noen plan.'])
    expect(fagsak.valg.find((v) => v.valg === 'revider')).toMatchObject({ na: [], deretter: [expect.stringMatching(/ny versjon av regelen/), expect.stringMatching(/uavhengig klinisk kontroll/)] })
    // Ingen kontrollsum eller intern nøkkel i det redaktøren ser.
    expect(JSON.stringify(fagsak)).not.toMatch(/[0-9a-f]{32}|psychiatrienet:x/)

    // En eldre versjon: ingenting skjer. Et valg som ikke tilbys: avvist.
    expect(await redaktor().beslutt(fagsak.id, fagsak.versjon - 1, 'behold', null)).toBe('endret')
    // Utsett: saken venter fortsatt.
    expect(await redaktor().beslutt(fagsak.id, fagsak.versjon, 'utsett', 'Vil lese kilden selv først.')).toBe('registrert')
    const utsatt = (await redaktor().les()).saker.find((s) => s.id === fagsak.id)!
    expect(utsatt).toMatchObject({ fase: 'beslutning', beslutning: { valg: 'utsett', merknad: 'Vil lese kilden selv først.', av: 'Ada Admin' } })

    expect(await redaktor().beslutt(utsatt.id, utsatt.versjon, 'revider', null)).toBe('registrert')
    const fulgt = (await redaktor().les()).saker.find((s) => s.id === fagsak.id)!
    expect(fulgt).toMatchObject({ fase: 'oppfolging', avsluttet: null, beslutning: { valg: 'revider' }, tiltak: [{ tekst: 'Ny regelversjon med uavhengig klinisk godkjenning', status: 'bestilt' }] })
    expect(redaktorvarsel(await redaktor().les())).toEqual([])
    expect(await redaktor().beslutt(fulgt.id, fulgt.versjon, 'behold', null).catch((e: { code: string }) => e.code)).toBe('55000')

    // Tiltaket utføres og kontrolleres av agenten, med bevis; kontrollert kan bare følge utført.
    const t = (await logg()).funn.find((f) => f.id === psy.id)!.tiltak[0]!
    expect(await feilFra(() => agent('tiltak', { tiltak: t.id, status: 'kontrollert', bevis: 'For tidlig.' }))).toMatchObject({ code: '55000' })
    expect(await feilFra(() => agent('tiltak', { tiltak: t.id, status: 'utfort' }))).toMatchObject({ code: '23514' })
    expect(await agent('tiltak', { tiltak: t.id, status: 'utfort', bevis: 'Ny versjon 4 i PR, godkjent av kontrollør.', lenke: 'https://github.com/eier/repo/pull/2' })).toBe('utfort')
    expect((await redaktor().les()).saker.find((s) => s.id === fagsak.id)).toMatchObject({ fase: 'oppfolging' })
    // Varselet står så lenge saken følges opp.
    expect(await lagRegelvarsellager(kallFor(bruker)).les()).toHaveLength(1)
    expect(await agent('tiltak', { tiltak: t.id, status: 'kontrollert', bevis: 'Versjon 4 er publisert og gir planen i produksjonen.' })).toBe('kontrollert')
    const ferdig = (await redaktor().les()).saker.find((s) => s.id === fagsak.id)!
    expect(ferdig).toMatchObject({ fase: 'avsluttet', avsluttet: { utfall: 'tiltak_kontrollert' }, tiltak: [{ status: 'kontrollert', lenke: 'https://github.com/eier/repo/pull/2' }] })
    expect(await lagRegelvarsellager(kallFor(bruker)).les()).toEqual([])
  })

  it('bekrefter et utført nytt grunnlag med neste kontroll, og merker nytt innhold i en sak i det faglige sporet uten å viske ut beslutningen', async () => {
    const dok = funn({ id: 'dokument:b', objekt: 'b', tilstandsavtrykk: 'd'.repeat(64) })
    await meld(rapport('2027-01-04T06:20:00Z', [dok], ['dokument']))
    let s = await sak('dokument:b')
    s = { ...s, versjon: (await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'faglig_relevant', begrunnelse: 'Et relevant avsnitt er endret.' })) as number }
    s = { ...s, versjon: (await agent('faglig_sporsmal', { funn: s.id, versjon: s.versjon, sporsmal: sporsmal({ anbefaling: { valg: 'behold', begrunnelse: 'Endringen gjelder ikke det regelen bygger på.', av: 'Claude' } }) })) as number }
    expect(await redaktor().beslutt(String(s.id), s.versjon, 'behold', null)).toBe('registrert')

    // Kilden endres igjen mens tiltaket pågår: samme sak, merket med nytt innhold, beslutningen står.
    expect(await meld(rapport('2027-01-11T06:20:00Z', [{ ...dok, tilstandsavtrykk: 'e'.repeat(64) }], ['dokument']))).toMatchObject({ nye: 0, endrede: 1 })
    const merket = await sak('dokument:b')
    expect(merket).toMatchObject({ id: s.id, tilstand: 'oppfolging', nytt_innhold_kl: expect.any(String), konklusjon: 'faglig_relevant' })
    expect((await redaktor().les()).teknisk).toBe('oppfolging')
    expect((await redaktor().les()).saker.find((x) => x.id === String(s.id))).toMatchObject({ beslutning: { valg: 'behold' } })

    // Grunnlaget er lagt inn (utført); en kontroll uten avvik bekrefter det og avslutter saken.
    await agent('tiltak', { tiltak: merket.tiltak[0]!.id, status: 'utfort', bevis: 'Nytt grunnlag i kildekontroll-grunnlag.json.' })
    expect(await meld(rapport('2027-01-18T06:20:00Z', [], ['dokument']))).toMatchObject({ borte: 1, avsluttede: 1 })
    const lukket = (await logg()).funn.find((f) => f.id === s.id)!
    expect(lukket).toMatchObject({ tilstand: 'avsluttet', utfall: 'tiltak_kontrollert', tiltak: [{ status: 'kontrollert', bevis: expect.stringMatching(/i samsvar med det nye grunnlaget/) }] })
  })

  it('setter nødstoppen for de berørte reglene i samme transaksjon som beslutningen om å deaktivere', async () => {
    await meld(rapport('2027-02-01T06:20:00Z', [funn({ id: 'psychiatrienet:y', kilde: 'psychiatrienet', objekt: 'y', prioritet: 'hoy' })], ['psychiatrienet']))
    let s = await sak('psychiatrienet:y')
    s = { ...s, versjon: (await agent('teknisk_konklusjon', { funn: s.id, versjon: s.versjon, konklusjon: 'mulig_alvorlig_risiko', begrunnelse: 'Kilden fraråder nå planen for en vanlig pasientgruppe.' })) as number }
    // Sikkerhetsproblemet når redaktøren straks, uten valg, og gir prikk.
    const straks = await redaktor().les()
    const sikker = straks.saker.find((x) => x.id === String(s.id))!
    expect(sikker).toMatchObject({ alvor: 'sikkerhet', fase: 'beslutning', anbefaling: null, valg: [], endring: 'Kilden fraråder nå planen for en vanlig pasientgruppe.' })
    expect(redaktorvarsel(straks)).not.toEqual([])
    // En kontroll uten avvik avslutter ikke et sikkerhetsproblem.
    expect(await meld(rapport('2027-02-08T06:20:00Z', [], ['psychiatrienet']))).toMatchObject({ avsluttede: 0 })

    s = { ...s, versjon: (await agent('faglig_sporsmal', { funn: s.id, versjon: s.versjon, sporsmal: sporsmal() })) as number }
    expect(await redaktor().beslutt(String(s.id), s.versjon, 'deaktiver', 'Sperres til ny versjon finnes.')).toBe('registrert')
    const sperrer = (await kallFor(bruker)('les_verktoysperrer', {})) as { omfang: string; mal: string; grunn: string }[]
    expect(sperrer).toEqual([expect.objectContaining({ omfang: 'regel', mal: REGEL.regel, grunn: `Kildesak nr. ${s.id}: Kilden for nedtrappingstakten er revidert` })])
    const lukket = (await redaktor().les()).saker.find((x) => x.id === String(s.id))!
    expect(lukket).toMatchObject({ fase: 'avsluttet', avsluttet: { utfall: 'tiltak_kontrollert' }, tiltak: [{ tekst: 'Nødstopp for den berørte regelen', status: 'kontrollert', regel: REGEL.regel }] })
  })

  it('holder prøver for seg, lar dem ikke sperre noe, og avslutter dem bare med testbevis', async () => {
    const prove = rapport('2027-03-01T10:00:00Z', [PROVEFUNN], [], { provesak: true })
    expect(await meld(prove, 'manuell')).toMatchObject({ nye: 1, borte: 0 })
    const forste = await sak('provesak:syntetisk')
    expect(await meld(prove, 'manuell')).toMatchObject({ nye: 1 })
    expect((await logg()).funn.find((f) => f.id === forste.id)).toMatchObject({ tilstand: 'avsluttet', utfall: 'avlost' })
    let p = await sak('provesak:syntetisk')
    expect(p).toMatchObject({ erstatter: forste.id, prove: true })
    // En reell kjøring med dokumentdelen kontrollert rører ikke prøven.
    await meld(rapport('2027-03-08T06:20:00Z', [], ['dokument']))
    expect((await sak('provesak:syntetisk')).tilstand).toBe('teknisk_utredning')

    p = { ...p, versjon: (await agent('teknisk_konklusjon', { funn: p.id, versjon: p.versjon, konklusjon: 'faglig_relevant', begrunnelse: 'Prøve av saksgangen.' })) as number }
    expect(await feilFra(() => agent('brukervarsel', { funn: p.id, versjon: p.versjon, tekst: 'Prøvevarsel som ikke skal vises.', regler: [] }))).toMatchObject({ code: '55000' })
    expect(await feilFra(() => agent('faglig_sporsmal', { funn: p.id, versjon: p.versjon, sporsmal: sporsmal({ berorte: [] }) }))).toMatchObject({ message: expect.stringMatching(/deaktiver kan bare tilbys/) })
    const utenSperre = sporsmal({ berorte: [], valg: [{ valg: 'behold', verktoyet: 'Ingen klinisk betydning.' }, { valg: 'utsett', verktoyet: 'Ingen klinisk betydning.' }], anbefaling: { valg: 'behold', begrunnelse: 'Prøven har ingen klinisk betydning.', av: 'Claude' } })
    p = { ...p, versjon: (await agent('faglig_sporsmal', { funn: p.id, versjon: p.versjon, sporsmal: utenSperre })) as number }
    // Prøven vises som prøve, uten prikk.
    const oversikt = await redaktor().les()
    expect(oversikt.saker.find((x) => x.id === String(p.id))).toMatchObject({ prove: true, fase: 'beslutning' })
    expect(redaktorvarsel({ saker: oversikt.saker.filter((x: Fagsak) => x.prove) })).toEqual([])

    const reell = (await logg()).funn.find((f) => !f.prove && f.tilstand !== 'avsluttet')!
    expect(await feilFra(() => agent('avslutt_prove', { funn: reell.id, versjon: reell.versjon, bevis: 'Ikke en prøve, avvises.' }))).toMatchObject({ code: '55000' })
    expect(await agent('avslutt_prove', { funn: p.id, versjon: p.versjon, bevis: 'Saksgangen er prøvd fra teknisk utredning til beslutning.' })).toBe(p.versjon + 1)
    expect((await redaktor().les()).saker.find((x) => x.id === String(p.id))).toMatchObject({ fase: 'avsluttet', avsluttet: { utfall: 'prove' } })
  })

  it('sletter ingen rad, og skriver hver hendelse med hvem', async () => {
    const { rows } = await db.query<{ n: number }>(`select count(*)::int as n from public.kildefunn_hendelser where agent is null and av is null and art in ('teknisk_konklusjon', 'faglig_sporsmal', 'beslutning')`)
    expect(rows[0]!.n).toBe(0)
    expect(await rader('kildefunn')).toBeGreaterThanOrEqual(8)
    expect(await rader('kildefunn_hendelser')).toBeGreaterThan(await rader('kildefunn'))
  })
})

/* --- Overgangen fra P12.1-modellen ------------------------------------------------------ */

describe('overgangen fra funn med frister til kildesaker', () => {
  it('overfører hver rad uten tap: avløste og besluttede avsluttes, en fritekstvurdering blir uavklart, resten venter på teknisk utredning', async () => {
    const MIGRASJON = '20261102210000_kildesaker'
    const db = await nyDatabase({ til: MIGRASJON })
    const admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    const tjener = kallSom(db, 'service_role')
    const reg = (kl: string, funnene: Overvakingsfunn[]) => registrer(tjener, rapport(kl, funnene, ['dokument']), 'cron', null)
    await reg('2026-10-31T21:00:00Z', [funn({ id: 'dokument:keks', detaljer: ['A'] }), funn({ id: 'dokument:rcpsych', detaljer: ['A'] }), funn({ id: 'dokument:c', detaljer: ['A'] })])
    await reg('2026-11-02T06:50:00Z', [funn({ id: 'dokument:keks', detaljer: ['B'] }), funn({ id: 'dokument:rcpsych', detaljer: ['A'] }), funn({ id: 'dokument:c', detaljer: ['A'] })])
    await som(db, admin, (tx) => tx.query(`select public.beslutt_kildefunn(3, 'Syntetisk beslutning.')`))
    await tjener('kildefunn_teknisk_fra_agent', { funn: 2, vurdering: 'Syntetisk teknisk vurdering.', agent: 'Claude' })
    await kjorMigrasjoner(db, { fra: MIGRASJON })

    const { rows } = await db.query<{ id: number; tilstand: string; utfall: string | null; konklusjon: string | null; teknisk_vurdering: string | null; beslutning: string | null }>(
      'select id, tilstand, utfall, konklusjon, teknisk_vurdering, beslutning from public.kildefunn order by id',
    )
    expect(rows).toEqual([
      { id: 1, tilstand: 'avsluttet', utfall: 'avlost', konklusjon: null, teknisk_vurdering: null, beslutning: null },
      { id: 2, tilstand: 'uavklart', utfall: null, konklusjon: 'uavklart', teknisk_vurdering: 'Syntetisk teknisk vurdering.', beslutning: null },
      { id: 3, tilstand: 'avsluttet', utfall: 'tidligere_beslutning', konklusjon: null, teknisk_vurdering: null, beslutning: 'Syntetisk beslutning.' },
      { id: 4, tilstand: 'teknisk_utredning', utfall: null, konklusjon: null, teknisk_vurdering: null, beslutning: null },
    ])
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.kildefunn_hendelser where art = 'migrert'`)).rows[0]!.n).toBe(4)
    // Det samme innholdet som den besluttede saken: beslutningen gjelder fortsatt, ingen ny sak.
    expect(await reg('2026-11-09T06:20:00Z', [funn({ id: 'dokument:keks', detaljer: ['B'] }), funn({ id: 'dokument:rcpsych', detaljer: ['A'] }), funn({ id: 'dokument:c', detaljer: ['A'] })])).toMatchObject({ nye: 0, endrede: 0 })
  }, 60_000)
})

/* --- Serverendepunktet ------------------------------------------------------------- */

describe('serverendepunktet /api/kildeovervaking', () => {
  const MILJO = {}
  const forespor = (innhold: unknown, { metode = 'POST', token = 'gyldig' }: { metode?: string; token?: string | null } = {}) =>
    new Request('https://ousfar.invalid/api/kildeovervaking', {
      method: metode,
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: metode === 'POST' ? (typeof innhold === 'string' ? innhold : JSON.stringify(innhold)) : undefined,
    })
  const githubsjekk = vi.fn(async (token: string, arbeidsflyt: string) => (token === 'gyldig' && arbeidsflyt === OVERVAKING_ARBEIDSFLYT ? ('cron' as const) : null))
  const behandle = async (f: Request, kall: Databasekall = vi.fn(async () => ({ kjoring: 1, nye: 0, endrede: 0, borte: 0, avsluttede: 0, apne: 0 }))) => {
    const svar = await behandleKildeovervaking(f, MILJO, { githubsjekk, kall })
    return { status: svar.status, innhold: (await svar.json()) as Record<string, unknown>, kall }
  }
  const r = rapport('2026-11-02T06:20:00Z', [funn({ tilstandsavtrykk: '0'.repeat(64) }), funn({ id: 'fest:y', kilde: 'fest', niva: 'informativ', prioritet: undefined, berorte: [] })])
  const LENKE = 'https://github.com/peohol/ousfar/actions/runs/123'

  it('slipper bare inn arbeidsflyten med POST, aldri en administrator eller cron', async () => {
    expect((await behandle(forespor(null, { metode: 'GET' }))).status).toBe(405)
    expect((await behandle(forespor({ oppgave: 'registrer', rapport: r }, { token: null }))).status).toBe(401)
    expect((await behandle(forespor({ oppgave: 'registrer', rapport: r }, { token: 'administratorens-token' }))).status).toBe(401)
  })

  it('melder en kjøring med et avtrykk per funn som krever vurdering, og de informative bare i kjøringen', async () => {
    const { status, kall } = await behandle(forespor({ oppgave: 'registrer', rapport: r, lenke: LENKE }))
    expect(status).toBe(200)
    expect(kall).toHaveBeenCalledWith('registrer_kildeovervaking', {
      melding: {
        kjort_kl: r.kjort_kl,
        utlost: 'cron',
        prove: false,
        lenke: LENKE,
        grunnlag: r.grunnlag,
        feil: [],
        informative: [{ id: 'fest:y', kilde: 'fest', art: 'endret', etikett: 'Syntetisk kilde' }],
        funn: [{ avtrykk: funnavtrykk(r.funn[0]!), innhold: r.funn[0] }],
      },
    })
  })

  it('avviser en rapport, lenke, prøve eller agentoppgave med en annen form, uten å røre databasen', async () => {
    for (const innhold of [
      'ikke json',
      { oppgave: 'noe annet' },
      { oppgave: 'teknisk_vurdering', funn: 7, vurdering: 'Den gamle oppgaven finnes ikke lenger.', av: 'Claude' },
      { oppgave: 'registrer', rapport: { ...r, versjon: 2 } },
      { oppgave: 'registrer', rapport: { ...r, funn: [{ ...r.funn[0], prioritet: undefined }] } },
      { oppgave: 'registrer', rapport: { ...r, funn: [{ ...r.funn[0], id: 'med mellomrom' }] } },
      { oppgave: 'registrer', rapport: { ...r, funn: [{ ...r.funn[0], tilstandsavtrykk: 'ikke-hex' }] } },
      { oppgave: 'registrer', rapport: r, lenke: 'https://example.invalid/kjoring' },
      { oppgave: 'registrer', rapport: { ...r, provesak: true } },
      { oppgave: 'registrer', rapport: { ...r, funn: [PROVEFUNN] } },
      { oppgave: 'teknisk_konklusjon', funn: 7, versjon: 1, konklusjon: 'uendret', begrunnelse: 'Syntetisk begrunnelse.', av: 'Claude' },
      { oppgave: 'teknisk_konklusjon', funn: 7, konklusjon: 'uavklart', begrunnelse: 'Syntetisk begrunnelse.', av: 'Claude' },
      { oppgave: 'teknisk_konklusjon', funn: 0, versjon: 1, konklusjon: 'uavklart', begrunnelse: 'Syntetisk begrunnelse.', av: 'Claude' },
      { oppgave: 'teknisk_konklusjon', funn: 7, versjon: 1, konklusjon: 'uavklart', begrunnelse: 'Syntetisk begrunnelse.' },
      { oppgave: 'faglig_sporsmal', funn: 7, versjon: 1, sporsmal: 'tekst', av: 'Claude' },
      { oppgave: 'tiltak', tiltak: 3, status: 'bestilt', av: 'Claude' },
      { oppgave: 'avslutt_prove', funn: 7, versjon: 1, bevis: 'kort', av: 'Claude' },
    ]) {
      const svar = await behandle(forespor(innhold))
      expect(svar.status, JSON.stringify(innhold).slice(0, 120)).toBe(400)
      expect(svar.kall).not.toHaveBeenCalled()
    }
    expect(lesRapport(rapport('x', []))).toBeNull()
    expect(lesRapport(rapport('2026-11-02T06:20:00Z', [PROVEFUNN], [], { provesak: true }))).toMatchObject({ provesak: true })
  })

  it('sender agentoppgaven til databasefunksjonen med hvem som gjorde den, og sier fra når saken er endret siden', async () => {
    const kall = vi.fn(async () => 5)
    // Arbeidsflyten sender tallene som tekst.
    const ok = await behandle(forespor({ oppgave: 'teknisk_konklusjon', funn: ' 7 ', versjon: '4', konklusjon: 'uavklart', begrunnelse: 'Siden kan ikke gjenskapes.', av: 'Claude' }), kall)
    expect(ok).toMatchObject({ status: 200, innhold: { oppgave: 'teknisk_konklusjon', svar: 5 } })
    expect(kall).toHaveBeenCalledWith('kildesak_teknisk_konklusjon', { funn: 7, versjon: 4, konklusjon: 'uavklart', begrunnelse: 'Siden kan ikke gjenskapes.', bevis: null, agent: 'Claude' })
    const feil = await behandle(
      forespor({ oppgave: 'avslutt_prove', funn: 7, versjon: 1, bevis: 'Syntetisk testbevis.', av: 'Claude' }),
      vi.fn(async () => {
        throw new Error('Sak nr. 7 er endret siden versjon 1 (nå 2); les den på nytt. Ingenting er endret.')
      }),
    )
    expect(feil).toMatchObject({ status: 409, innhold: { feil: expect.stringMatching(/endret siden/) } })
  })
})

/* --- Driften ---------------------------------------------------------------------- */

describe('driftsstatusen for kontrollen', () => {
  const NA = Date.parse('2026-11-10T08:00:00Z')
  const timerFor = (t: number) => new Date(NA - t * 3_600_000).toISOString()
  const kjoring = (timer: number, feil: string[] = []) => ({ id: 1, kjort_kl: timerFor(timer), utlost: 'cron' as const, prove: false, grunnlag: [], feil, informative: [], lenke: null })
  const o = (siste: Kildeovervaking['siste']): Kildeovervaking => ({ funn: [], kjoringer: [], siste })

  it('sier fra når kontrollen ikke har kjørt, har uteblitt over en uke eller stoppet, uten noen tidsfrist for sakene', () => {
    expect(kontrollstatus(o(null), NA)).toBe('kildeovervåkingen har ikke kjørt ennå')
    expect(kontrollstatus(o(kjoring(8 * 24)), NA)).toBeNull()
    expect(kontrollstatus(o(kjoring(8 * 24 + 1)), NA)).toBe('kildeovervåkingen har ikke kjørt på over en uke')
    expect(kontrollstatus(o(kjoring(1, ['FEST: stoppet'])), NA)).toBe('siste kildekontroll stoppet')
  })
})
