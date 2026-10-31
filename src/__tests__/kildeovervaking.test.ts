/**
 * Kildeovervåkingen i appen (P12.1, `docs/verktøy-p12-overvaking.md` §5): mot
 * en ekte database bygd av migrasjonene melder kjøringene seg gjennom
 * serverendepunktet, funnene står åpne til en administrator har skrevet en
 * faglig beslutning, et funn med nytt innhold avløser det gamle, en del som
 * ikke ble kontrollert, rører ingen funn, og ingen rad slettes. Til slutt
 * fristene og det Adminmeny viser. Alle data er syntetiske.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import type { Databasekall } from '../legemiddeldata/lager'
import type { Utlost } from '../server/tilgang'
import { behandleKildeovervaking, OVERVAKING_ARBEIDSFLYT } from '../verktoy/overvaking/endepunkt'
import { PROVEFUNN } from '../verktoy/overvaking/kjoring'
import type { Funnkilde, Overvakingsfunn, Overvakingsrapport } from '../verktoy/overvaking/modell'
import { funnavtrykk } from '../verktoy/overvaking/rapport'
import { lesRapport, melding, registrer, tekniskFraAgent } from '../verktoy/overvaking/registrering'
import { FRISTER, fristene, kontrollstatus, lagKildeovervakingslager, oppmerksomhet, type Kildefunn, type Kildeovervaking } from '../verktoy/overvaking/varsling'
import { kallSom } from './hjelp/fest'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const funn = (over: Partial<Overvakingsfunn>): Overvakingsfunn => ({
  id: 'dokument:syntetisk',
  kilde: 'dokument',
  art: 'endret',
  niva: 'krever_vurdering',
  objekt: 'syntetisk',
  etikett: 'Syntetisk kilde',
  detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-02T06:00:00Z).'],
  berorte: [{ regelsett: 's', regel: 'r', versjon: 1, fingeravtrykk: 'f'.repeat(64), hvorfor: 'henviser til kilden' }],
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

/* --- Databasen ------------------------------------------------------------------- */

describe('kildeovervåkingen i databasen', () => {
  let db: PGlite
  let admin: string
  let bruker: string
  let tjener: Databasekall

  /** Et kall som den innloggede `hvem`, som data-API-et gjør det. */
  const kallFor =
    (hvem: string): Databasekall =>
    async (funksjon, argumenter) => {
      const navn = Object.keys(argumenter)
      const rader = await som(db, hvem, async (tx) => (await tx.query<{ r: unknown }>(`select public.${funksjon}(${navn.map((n, i) => `${n} => $${i + 1}`).join(', ')}) as r`, navn.map((n) => argumenter[n]))).rows)
      return rader[0]!.r
    }
  const lager = (hvem: string) => lagKildeovervakingslager(kallFor(hvem))
  const meld = (r: Overvakingsrapport, utlost: Utlost = 'cron') => registrer(tjener, r, utlost, 'https://github.com/eier/repo/actions/runs/1')
  const apne = async () => (await lager(admin).les()).funn.filter((f) => !f.beslutning_kl && !f.erstattet_kl)

  beforeAll(async () => {
    db = await nyDatabase()
    admin = await opprettBruker(db, { brukernavn: 'admin', fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin' })
    bruker = await opprettBruker(db, { brukernavn: 'bo.lege', fornavn: 'Bo', etternavn: 'Lege', rolle: 'user' })
    tjener = kallSom(db, 'service_role')
  }, 60_000)

  it('tar bare imot kjøringer fra serveren, og lar bare administratorer lese og vurdere funnene', async () => {
    const r = melding(rapport('2026-11-02T06:20:00Z', []), 'cron', null)
    for (const hvem of [admin, bruker]) {
      expect(await feilFra(() => kallFor(hvem)('registrer_kildeovervaking', { melding: JSON.stringify(r) }))).toMatchObject({ code: '42501' })
      expect(await feilFra(() => kallFor(hvem)('kildefunn_teknisk_fra_agent', { funn: 'x', vurdering: 'Syntetisk.', agent: 'Claude' }))).toMatchObject({ code: '42501' })
      for (const tabell of ['kildefunn', 'kildeovervaking_kjoringer']) {
        expect(await feilFra(() => som(db, hvem, (tx) => tx.query(`select * from public.${tabell}`)))).toMatchObject({ code: '42501' })
        expect(await feilFra(() => som(db, hvem, (tx) => tx.query(`delete from public.${tabell}`)))).toMatchObject({ code: '42501' })
      }
    }
    expect(await feilFra(() => lager(bruker).les())).toMatchObject({ code: '42501' })
    expect(await feilFra(() => lager(bruker).vurder(1, 'Syntetisk vurdering.'))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => lager(bruker).beslutt(1, 'Syntetisk beslutning.'))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => som(db, null, (tx) => tx.query('select public.les_kildeovervaking()')))).toMatchObject({ code: '42501' })
  })

  it('holder et funn åpent til beslutningen, avløser det når innholdet endres, og rører ikke en del som ikke ble kontrollert', async () => {
    const dok = funn({ id: 'dokument:a', objekt: 'a' })
    const fest = funn({ id: 'fest:sertralin:ID_X', kilde: 'fest', art: 'fjernet', objekt: 'ID_X', prioritet: 'hoy' })
    const psy = funn({ id: 'psychiatrienet:x', kilde: 'psychiatrienet', objekt: 'x', prioritet: 'hoy' })
    expect(await meld(rapport('2026-11-02T06:20:00Z', [dok, fest, psy]))).toMatchObject({ nye: 3, borte: 0, apne: 3 })

    // Samme funn, bare hentet på nytt: ingenting nytt. FEST-funnet er borte; Psychiatrienet ble ikke kontrollert, så det står urørt.
    const igjen = funn({ ...dok, detaljer: ['Nå: dokumentet abc (text/html, hentet 2026-11-09T06:00:00Z).'] })
    expect(await meld(rapport('2026-11-09T06:20:00Z', [igjen], ['dokument', 'fest']))).toMatchObject({ nye: 0, borte: 1, apne: 3 })
    const etter = await apne()
    expect(etter.map((f) => [f.funn, f.sist_sett_kl, f.borte_kl])).toEqual([
      ['psychiatrienet:x', '2026-11-02T06:20:00+00:00', null],
      ['fest:sertralin:ID_X', '2026-11-02T06:20:00+00:00', '2026-11-09T06:20:00+00:00'],
      ['dokument:a', '2026-11-09T06:20:00+00:00', null],
    ])
    expect(etter.find((f) => f.funn === 'dokument:a')!.detaljer).toEqual(igjen.detaljer)

    // Nytt innhold: en ny åpen rad som avløser den gamle, som står i historikken.
    const endret = funn({ ...dok, detaljer: ['Nå: dokumentet def.'] })
    expect(await meld(rapport('2026-11-16T06:20:00Z', [endret], ['dokument']))).toMatchObject({ nye: 1, borte: 0, apne: 3 })
    const alle = (await lager(admin).les()).funn.filter((f) => f.funn === 'dokument:a')
    expect(alle.map((f) => [f.detaljer[0], f.erstattet_kl !== null, f.erstatter])).toEqual([
      ['Nå: dokumentet def.', false, alle[1]!.id],
      [igjen.detaljer[0], true, null],
    ])
    // Dokumentdelen kontrolleres uten funnet, så det merkes borte; FEST stoppet (ikke kjørt) og rører ingen funn.
    expect(await meld(rapport('2026-11-23T06:20:00Z', [], ['dokument'], { feil: ['FEST: innlogging avvist'] }))).toMatchObject({ borte: 1, apne: 3 })
    expect((await apne()).find((f) => f.funn === 'dokument:a')!.borte_kl).toBe('2026-11-23T06:20:00+00:00')
  })

  it('skriver den tekniske vurderingen og den faglige beslutningen én gang, med hvem og når, og en beslutning om et uendret funn står', async () => {
    const [f] = (await apne()).filter((x) => x.funn === 'psychiatrienet:x')
    expect(await feilFra(() => lager(admin).vurder(f!.id, 'kort'))).toMatchObject({ code: '23514' })
    await lager(admin).vurder(f!.id, '  Syntetisk: bare en ny overskrift.  ')
    expect(await feilFra(() => lager(admin).vurder(f!.id, 'En gang til.'))).toMatchObject({ code: '55000' })
    expect(await feilFra(() => lager(admin).beslutt(f!.id, '    '))).toMatchObject({ code: '23514' })
    await lager(admin).beslutt(f!.id, 'Regelen står uendret.')
    expect(await feilFra(() => lager(admin).beslutt(f!.id, 'En gang til.'))).toMatchObject({ code: '55000' })
    const lest = (await lager(admin).les()).funn.find((x) => x.id === f!.id)!
    expect(lest).toMatchObject({ teknisk_vurdering: 'Syntetisk: bare en ny overskrift.', teknisk_av: 'Ada Admin', beslutning: 'Regelen står uendret.', beslutning_av: 'Ada Admin' })

    // Det samme funnet igjen: beslutningen står, og ingen ny rad. Nytt innhold er et nytt, åpent funn.
    const psy = funn({ id: 'psychiatrienet:x', kilde: 'psychiatrienet', objekt: 'x', prioritet: 'hoy' })
    expect(await meld(rapport('2026-11-30T06:20:00Z', [psy], ['psychiatrienet']))).toMatchObject({ nye: 0 })
    expect(await meld(rapport('2026-12-07T06:20:00Z', [{ ...psy, detaljer: ['Ny anbefaling.'] }], ['psychiatrienet']))).toMatchObject({ nye: 1 })
    const ny = (await apne()).find((x) => x.funn === 'psychiatrienet:x')!
    expect(ny).toMatchObject({ erstatter: null, teknisk_vurdering: null, beslutning: null })

    // Claude skriver den tekniske vurderingen gjennom arbeidsflyten, for funnet med nøkkelen.
    expect(await tekniskFraAgent(tjener, 'psychiatrienet:x', 'Syntetisk: anbefalingen er endret, se detaljene.', 'Claude (startet av syntetisk)')).toBe(ny.id)
    expect((await apne()).find((x) => x.id === ny.id)).toMatchObject({ teknisk_av: 'Claude (startet av syntetisk)' })
    expect(await feilFra(() => tekniskFraAgent(tjener, 'psychiatrienet:x', 'En gang til.', 'Claude'))).toMatchObject({ message: expect.stringMatching(/Ingen åpent funn/) })
    expect(await feilFra(() => tekniskFraAgent(tjener, 'finnes:ikke', 'Syntetisk vurdering.', 'Claude'))).toMatchObject({ message: expect.stringMatching(/Ingen åpent funn/) })
    // Ingen rad slettes: alle står i historikken.
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.kildefunn')
    expect(rows[0]!.n).toBe(5)
  })

  it('holder en prøvekjøring for seg, med en ny prøverad hver gang, og viser den siste reelle kjøringen', async () => {
    const prove = rapport('2026-12-08T10:00:00Z', [PROVEFUNN], [], { provesak: true })
    expect(await meld(prove, 'manuell')).toMatchObject({ nye: 1, borte: 0 })
    expect(await meld(prove, 'manuell')).toMatchObject({ nye: 1, borte: 0 })
    const proverader = (await lager(admin).les()).funn.filter((f) => f.prove)
    expect(proverader.map((f) => [f.erstattet_kl !== null, f.erstatter])).toEqual([
      [false, proverader[1]!.id],
      [true, null],
    ])
    // En reell kjøring der dokumentdelen ble kontrollert, merker ikke prøven som borte.
    await meld(rapport('2026-12-14T06:20:00Z', [], ['dokument']))
    expect((await apne()).find((f) => f.prove)!.borte_kl).toBeNull()
    const lest = await lager(admin).les(1)
    expect(lest.siste).toMatchObject({ kjort_kl: '2026-12-14T06:20:00+00:00', prove: false, utlost: 'cron', lenke: 'https://github.com/eier/repo/actions/runs/1' })
    expect(lest.kjoringer).toHaveLength(1)
    // Med historikk 0 får Adminmeny bare de åpne funnene.
    expect((await lager(admin).les(0)).funn.every((f) => !f.beslutning_kl && !f.erstattet_kl)).toBe(true)
  })
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
  const behandle = async (f: Request, kall: Databasekall = vi.fn(async () => ({ kjoring: 1, nye: 0, borte: 0, apne: 0 }))) => {
    const svar = await behandleKildeovervaking(f, MILJO, { githubsjekk, kall })
    return { status: svar.status, innhold: (await svar.json()) as Record<string, unknown>, kall }
  }
  const r = rapport('2026-11-02T06:20:00Z', [funn({}), funn({ id: 'fest:y', kilde: 'fest', niva: 'informativ', prioritet: undefined, berorte: [] })])
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

  it('avviser en rapport, lenke eller prøve med en annen form, uten å røre databasen', async () => {
    for (const innhold of [
      'ikke json',
      { oppgave: 'noe annet' },
      { oppgave: 'registrer', rapport: { ...r, versjon: 2 } },
      { oppgave: 'registrer', rapport: { ...r, funn: [{ ...r.funn[0], prioritet: undefined }] } },
      { oppgave: 'registrer', rapport: { ...r, funn: [{ ...r.funn[0], id: 'med mellomrom' }] } },
      { oppgave: 'registrer', rapport: r, lenke: 'https://example.invalid/kjoring' },
      { oppgave: 'registrer', rapport: { ...r, provesak: true } },
      { oppgave: 'registrer', rapport: { ...r, funn: [PROVEFUNN] } },
      { oppgave: 'teknisk_vurdering', funn: 'dokument:a', vurdering: 'kort', av: 'Claude' },
    ]) {
      const svar = await behandle(forespor(innhold))
      expect(svar.status, JSON.stringify(innhold)).toBe(400)
      expect(svar.kall).not.toHaveBeenCalled()
    }
    expect(lesRapport(rapport('x', []))).toBeNull()
    expect(lesRapport(rapport('2026-11-02T06:20:00Z', [PROVEFUNN], [], { provesak: true }))).toMatchObject({ provesak: true })
  })

  it('skriver en teknisk vurdering for funnet med nøkkelen, og sier fra når det ikke går', async () => {
    const kall = vi.fn(async () => 7)
    const ok = await behandle(forespor({ oppgave: 'teknisk_vurdering', funn: ' dokument:a ', vurdering: 'Syntetisk vurdering.', av: 'Claude' }), kall)
    expect(ok).toMatchObject({ status: 200, innhold: { funn: 7 } })
    expect(kall).toHaveBeenCalledWith('kildefunn_teknisk_fra_agent', { funn: 'dokument:a', vurdering: 'Syntetisk vurdering.', agent: 'Claude' })
    const feil = await behandle(
      forespor({ oppgave: 'teknisk_vurdering', funn: 'dokument:a', vurdering: 'Syntetisk vurdering.', av: 'Claude' }),
      vi.fn(async () => {
        throw new Error('Ingen åpent funn uten teknisk vurdering har nøkkelen dokument:a.')
      }),
    )
    expect(feil).toMatchObject({ status: 409, innhold: { feil: expect.stringMatching(/Ingen åpent funn/) } })
  })
})

/* --- Fristene og prikken ------------------------------------------------------------ */

describe('fristene og det Adminmeny viser', () => {
  const NA = Date.parse('2026-11-10T08:00:00Z')
  const timerFor = (t: number) => new Date(NA - t * 3_600_000).toISOString()
  const rad = (over: Partial<Kildefunn>): Kildefunn => ({
    id: 1, funn: 'dokument:a', kilde: 'dokument', art: 'endret', prioritet: 'vanlig', prove: false, etikett: 'Syntetisk', detaljer: [], berorte: [],
    opprettet_kl: timerFor(1), sist_sett_kl: null, borte_kl: null, erstatter: null, erstattet_kl: null,
    teknisk_vurdering: null, teknisk_av: null, teknisk_kl: null, beslutning: null, beslutning_av: null, beslutning_kl: null, ...over,
  })
  const kjoring = (timer: number, feil: string[] = []) => ({ id: 1, kjort_kl: timerFor(timer), utlost: 'cron' as const, prove: false, grunnlag: [], feil, informative: [], lenke: null })
  const o = (funn: Kildefunn[], siste: Kildeovervaking['siste'] = kjoring(1)): Kildeovervaking => ({ funn, kjoringer: [], siste })

  it('krever den tekniske vurderingen innen et døgn, og den faglige beslutningen innen tre døgn ved høy prioritet', () => {
    expect(FRISTER).toEqual({ teknisk: 24, faglig: 72 })
    expect(fristene(rad({ opprettet_kl: timerFor(23.9) }), NA)).toEqual({ teknisk: 'venter', faglig: 'venter' })
    expect(fristene(rad({ opprettet_kl: timerFor(24) }), NA)).toEqual({ teknisk: 'over_fristen', faglig: 'venter' })
    expect(fristene(rad({ opprettet_kl: timerFor(100), teknisk_kl: timerFor(90) }), NA)).toEqual({ teknisk: 'gjort', faglig: 'venter' })
    expect(fristene(rad({ opprettet_kl: timerFor(71.9), prioritet: 'hoy', teknisk_kl: timerFor(60) }), NA)).toEqual({ teknisk: 'gjort', faglig: 'venter' })
    expect(fristene(rad({ opprettet_kl: timerFor(72), prioritet: 'hoy', teknisk_kl: timerFor(60) }), NA)).toEqual({ teknisk: 'gjort', faglig: 'over_fristen' })
  })

  it('har en prikk når et funn venter, når kontrollen stoppet, eller når den ikke har kjørt på over en uke', () => {
    expect(oppmerksomhet(o([]), NA)).toEqual([])
    expect(oppmerksomhet(o([rad({ beslutning_kl: timerFor(1) }), rad({ erstattet_kl: timerFor(1) })]), NA)).toEqual([])
    expect(oppmerksomhet(o([rad({}), rad({ opprettet_kl: timerFor(30) })]), NA)).toEqual(['2 funn venter på faglig beslutning, 1 over fristen'])
    expect(kontrollstatus(o([], null), NA)).toBe('kildeovervåkingen har ikke kjørt ennå')
    expect(kontrollstatus(o([], kjoring(8 * 24)), NA)).toBeNull()
    expect(kontrollstatus(o([], kjoring(8 * 24 + 1)), NA)).toBe('kildeovervåkingen har ikke kjørt på over en uke')
    expect(kontrollstatus(o([], kjoring(1, ['FEST: stoppet'])), NA)).toBe('siste kildekontroll stoppet')
  })
})
