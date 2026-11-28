/**
 * Varsler på enheten for flere formål, med utsending på et tidspunkt (#600,
 * docs/enhetsvarsler.md): formålene og valgene, planleggingen med utbytting
 * og avlysning, kontrollen rett før utsending, utsendingen fra
 * Edge-funksjonen ende til ende med en falsk push-tjeneste, og klokken.
 *
 * Oppsettet: et syntetisk testmiljø T der `arkitektB` er lokal administrator
 * og `vanligB` vanlig medlem, en syntetisk funksjon med bryteren på
 * `utprøving` (bare `arkitektB` har den), og et syntetisk formål `prove` som
 * hører til funksjonen, med en kontroll som slår opp et syntetisk grunnlag.
 * Chatten er slått på, så formålet `chat` finnes for alle med medlemskap.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { pushemne, VARSELSTI } from '@delt/enhetsvarsel'
import { lesEnhetsvarsler, sendEnhetsvarsler, type Varseldatabase } from '../../supabase/functions/_edge/enhetsvarsler'
import type { Bytes } from '../../supabase/functions/_edge/webpush'
import { LAGRINGSJOBBER, type Ryddesvar } from '../drift/gruppechatLagringstid'
import {
  avsluttMedlemskap,
  byggPersongalleri,
  opprettFagmiljo,
  opprettMedlem,
  type Person,
  type Persongalleri,
} from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'
import { dekrypter, nyeVapidnokler, nyttAbonnement, type Testabonnement } from './hjelp/webpush'

const FUNKSJON = 'testfunksjon'
const GRUNN = 'Syntetisk utprøving i testen'
const FORMAL = 'prove'
const STI = '#/prove'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let T: string
let enheter: Record<'arkitektB' | 'arkitektB2' | 'vanligB', Testabonnement>

const id = (p: Person) => galleri.id[p]

const kall = <R = unknown>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => {
    const rad = (await tx.query<Record<string, R>>(sql, parametre)).rows[0]
    return rad ? Object.values(rad)[0]! : (null as R)
  })
const feilkode = async (person: Person, sql: string, parametre: unknown[] = []) =>
  (await feilFra(() => kall(person, sql, parametre)))?.code ?? null

/** Som superbruker, med begrunnelsen tilgangsloggen krever. */
const somServer = <R>(arbeid: (tx: Transaction) => Promise<R>, i: PGlite = db) =>
  i.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: enhetsvarsler (syntetisk)', true)`)
    return arbeid(tx)
  })

/** Som Edge-funksjonen: med den hemmelige nøkkelen. */
const somTjeneste = <T>(arbeid: (tx: Transaction) => Promise<T>) =>
  db.transaction(async (tx) => {
    await tx.query(`select set_config('role', 'service_role', true)`)
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ role: 'service_role' })])
    return arbeid(tx)
  })

const tjenesteklient = (): Varseldatabase => ({
  rpc: async (navn, argumenter) => {
    const navnene = Object.keys(argumenter)
    const sql = `select public.${navn}(${navnene.map((n, k) => `${n} => $${k + 1}`).join(', ')}) as v`
    try {
      const svar = await somTjeneste((tx) =>
        tx.query<{ v: unknown }>(
          sql,
          Object.values(argumenter).map((a) => (typeof a === 'object' ? JSON.stringify(a) : a)),
        ),
      )
      return { data: svar.rows[0]!.v, error: null }
    } catch (error) {
      return { data: null, error }
    }
  },
})

const lagre = (p: Person, e: Testabonnement, i: PGlite = db) =>
  kall(p, 'select public.lagre_pushabonnement($1, $2, $3)', [e.abonnement.endepunkt, e.abonnement.p256dh, e.abonnement.auth], i)

interface Plan {
  bruker: string
  nokkel: string
  kl: string
  tittel?: string
  tekst?: string
  sti?: string
  fagmiljo?: string | null
  data?: Record<string, unknown>
  senest?: string
}

/** Et tidspunkt `sekunder` fra nå, som databasen ser det. */
const om = async (sekunder: number) =>
  (await db.query<{ t: string }>(`select (now() + make_interval(secs => $1))::text as t`, [sekunder])).rows[0]!.t

const varsel = (bruker: Person, nokkel: string, kl: string, ekstra: Partial<Plan> = {}): Plan => ({
  bruker: id(bruker),
  nokkel,
  kl,
  tittel: 'Prøve',
  tekst: 'Syntetisk påminnelse',
  sti: STI,
  fagmiljo: T,
  ...ekstra,
})

/** Som eierprosjektets funksjoner i databasen. */
const planlegg = async (varsler: Plan[], formal = FORMAL) =>
  (await db.query<{ n: number }>('select intern.planlegg_enhetsvarsler($1, $2) as n', [formal, JSON.stringify(varsler)])).rows[0]!.n
const avlys = async (nokler: string[], bruker: string | null = null) =>
  (await db.query<{ n: number }>('select intern.avlys_enhetsvarsler($1, $2, $3) as n', [FORMAL, nokler, bruker])).rows[0]!.n
const avlysPrefiks = async (prefiks: string) =>
  (await db.query<{ n: number }>('select intern.avlys_enhetsvarsler_med_prefiks($1, $2) as n', [FORMAL, prefiks])).rows[0]!.n
const erstatt = async (prefiks: string, varsler: Plan[]) =>
  (
    await db.query<{ v: { planlagt: number; avlyst: number } }>('select intern.erstatt_enhetsvarsler($1, $2, $3) as v', [
      FORMAL,
      prefiks,
      JSON.stringify(varsler),
    ])
  ).rows[0]!.v

const hent = async () =>
  (await somTjeneste((tx) => tx.query<{ v: Record<string, unknown>[] }>('select public.enhetsvarsel_hent() as v'))).rows[0]!.v
const kvitter = (utfall: unknown[]) => somTjeneste((tx) => tx.query('select public.enhetsvarsel_kvitter($1)', [JSON.stringify(utfall)]))
/** Hent og kvitter alt som sendt, som én vellykket utsending. */
const sendAlt = async () => {
  const v = await hent()
  await kvitter(
    v.map((x) => ({
      id: x.id,
      versjon: x.versjon,
      endepunkt: x.endepunkt,
      svar: 'sendt',
    })),
  )
  return v
}
const rader = async () =>
  (
    await db.query<{
      nokkel: string
      bruker_id: string
      versjon: number
      ferdig: boolean
      sendt_til: string[]
    }>('select nokkel, bruker_id, versjon, ferdig_kl is not null as ferdig, sendt_til from intern.enhetsvarsler order by nokkel, bruker_id')
  ).rows
/** Som om tiden har gått: alt som er planlagt og holdt, flyttes `sekunder` tilbake. */
const tidenGaar = (sekunder: number) =>
  db.query(
    `update intern.enhetsvarsler set kl = kl - make_interval(secs => $1), senest_kl = senest_kl - make_interval(secs => $1), neste_kl = neste_kl - make_interval(secs => $1)`,
    [sekunder],
  )
const mineFormal = (p: Person) => kall<{ formal: string; pa: boolean }[]>(p, 'select public.mine_enhetsvarselformal()')

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  for (const f of ['gruppechat_aktivert', 'direktemeldinger_aktivert']) {
    await basis.exec(`create or replace function intern.${f}() returns boolean language sql stable set search_path = '' as 'select true'`)
  }
  T = await opprettFagmiljo(basis, {
    nokkel: 'test-enhetsvarsler-t',
    navn: 'Testmiljø T',
    administrator: galleri.id.arkitektB,
  })
  await opprettMedlem(basis, galleri.id.vanligB, T)
  await somServer(async (tx) => {
    await tx.query(
      `insert into public.funksjoner (nokkel, navn, beskrivelse) values ($1, 'Testfunksjon', 'Syntetisk funksjon for testene.')`,
      [FUNKSJON],
    )
    // Grunnlaget kontrollen slår opp, og formålet: som eierprosjektet ville gjort i sin migrasjon.
    await tx.exec(`
      create table intern.provegrunnlag (nokkel text primary key);
      create function intern.prove_kontroll(bruker uuid, nokkel text, data jsonb, fagmiljo uuid)
      returns boolean language sql stable security definer set search_path = '' as $$
        select case when data ->> 'kast' = 'ja' then ('x' || (data ->> 'kast'))::integer > 0
          else exists (select 1 from intern.provegrunnlag g where g.nokkel = coalesce(data ->> 'grunnlag', prove_kontroll.nokkel)) end
      $$;
      insert into intern.enhetsvarselformal (formal, funksjon, kontroll, standard, frist, sti_monster, rekkefolge)
      values ('${FORMAL}', '${FUNKSJON}', 'intern.prove_kontroll(uuid, text, jsonb, uuid)'::regprocedure, false, interval '15 minutes', '^#/prove(/[a-z0-9-]+)?$', 20);
    `)
  }, basis)
  await kall('arkitektB', 'select public.sett_testmiljo($1, true, $2)', [T, GRUNN], basis)
  await kall('arkitektB', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'utprøving', GRUNN], basis)
  // Formålet er av som standard: arkitektB slår det på selv.
  await kall('arkitektB', 'select public.sett_enhetsvarselvalg($1, true)', [FORMAL], basis)
  enheter = {
    arkitektB: await nyttAbonnement(),
    arkitektB2: await nyttAbonnement(),
    vanligB: await nyttAbonnement(),
  }
}, 180_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
  await db.exec(`insert into intern.provegrunnlag values ('a'), ('b'), ('c')`)
})

afterEach(async () => {
  await db.close()
})

describe('formålene og valgene', () => {
  it('viser chatten for alle med medlemskap, og formålet bak en funksjon bare for den som har funksjonen', async () => {
    expect(await mineFormal('arkitektB')).toEqual([
      { formal: 'chat', pa: true },
      { formal: FORMAL, pa: true },
    ])
    for (const p of ['vanligB', 'vanligA', 'systemarkitekt'] as const)
      expect(await mineFormal(p), p).toEqual([{ formal: 'chat', pa: true }])
    expect(await feilkode('utenMedlemskap', 'select public.mine_enhetsvarselformal()')).toBe('42501')
  })

  it('svarer «finnes ikke» for et formål man ikke har, og lagrer valget for et man har', async () => {
    expect(await feilkode('vanligB', 'select public.sett_enhetsvarselvalg($1, true)', [FORMAL])).toBe('P0002')
    expect(await feilkode('vanligB', 'select public.sett_enhetsvarselvalg($1, true)', ['finnes_ikke'])).toBe('P0002')
    await kall('vanligB', 'select public.sett_enhetsvarselvalg($1, false)', ['chat'])
    expect(await mineFormal('vanligB')).toEqual([{ formal: 'chat', pa: false }])
  })

  it('kan ikke leses eller endres av nettleseren utenom funksjonene', async () => {
    expect(await feilkode('arkitektB', 'select * from public.enhetsvarselvalg')).toBe('42501')
    expect(await feilkode('arkitektB', 'select * from intern.enhetsvarsler')).toBe('42501')
    expect(await feilkode('arkitektB', 'select * from intern.enhetsvarselformal')).toBe('42501')
    for (const sql of [
      `select intern.planlegg_enhetsvarsler('${FORMAL}', '[]')`,
      `select intern.avlys_enhetsvarsler('${FORMAL}', array['a'])`,
      `select intern.erstatt_enhetsvarsler('${FORMAL}', 'a', '[]')`,
      'select public.enhetsvarsel_hent()',
      `select public.enhetsvarsel_kvitter('[]')`,
    ]) {
      expect(await feilkode('arkitektB', sql), sql).toBe('42501')
    }
  })

  it('avviser et formål med en kontroll eller tilgang som har feil form', async () => {
    const feil = await feilFra(() =>
      db.query(`insert into intern.enhetsvarselformal (formal, kontroll, standard, sti_monster, rekkefolge)
        values ('feil', 'intern.chat_har_enhetsvarsler(uuid)'::regprocedure, false, '^#/$', 99)`),
    )
    expect(feil?.code).toBe('23514')
    const tilgang = await feilFra(() =>
      db.query(`insert into intern.enhetsvarselformal (formal, tilgang, standard, sti_monster, rekkefolge)
        values ('feil', 'intern.prove_kontroll(uuid, text, jsonb, uuid)'::regprocedure, false, '^#/$', 99)`),
    )
    expect(tilgang?.code).toBe('23514')
  })
})

describe('planleggingen', () => {
  beforeEach(async () => {
    await lagre('arkitektB', enheter.arkitektB)
  })

  it('sender ikke før tidspunktet, og én gang når det er kommet', async () => {
    expect(await planlegg([varsel('arkitektB', 'a', await om(3600))])).toBe(1)
    expect(await hent()).toEqual([])
    await tidenGaar(3600)
    const [v, ...flere] = await sendAlt()
    expect(flere).toEqual([])
    expect(v).toMatchObject({
      endepunkt: enheter.arkitektB.abonnement.endepunkt,
      tittel: 'Prøve',
      tekst: 'Syntetisk påminnelse',
      sti: STI,
      merke: `${FORMAL}:a`,
      versjon: 1,
    })
    expect(await hent()).toEqual([])
    expect(await rader()).toMatchObject([{ nokkel: 'a', ferdig: true }])
  })

  it('sender ikke det samme varselet igjen når det planlegges på nytt etter at det er sendt', async () => {
    const kl = await om(-5)
    await planlegg([varsel('arkitektB', 'a', kl)])
    await sendAlt()
    expect(await planlegg([varsel('arkitektB', 'a', kl)])).toBe(0)
    expect(await planlegg([varsel('arkitektB', 'a', kl, { tekst: 'Ny tekst, samme tid' })])).toBe(0)
    expect(await hent()).toEqual([])
  })

  it('skriver ingenting for et uendret varsel som venter', async () => {
    const kl = await om(600)
    await planlegg([varsel('arkitektB', 'a', kl)])
    expect(await planlegg([varsel('arkitektB', 'a', kl)])).toBe(0)
    expect(await rader()).toMatchObject([{ nokkel: 'a', versjon: 1 }])
  })

  it('bytter ut et varsel med samme nøkkel, så bare det nye sendes, til det nye tidspunktet', async () => {
    await planlegg([varsel('arkitektB', 'a', await om(600))])
    await planlegg([varsel('arkitektB', 'a', await om(1200), { tekst: 'Flyttet' })])
    expect(await rader()).toMatchObject([{ nokkel: 'a', versjon: 2, ferdig: false }])
    await tidenGaar(600)
    expect(await hent()).toEqual([])
    await tidenGaar(600)
    const sendt = await sendAlt()
    expect(sendt.map((v) => v.tekst)).toEqual(['Flyttet'])
  })

  it('gjør et sendt varsel til et nytt når tidspunktet endres', async () => {
    await planlegg([varsel('arkitektB', 'a', await om(-5))])
    await sendAlt()
    await planlegg([varsel('arkitektB', 'a', await om(-1), { tekst: 'Ny vakt' })])
    expect((await sendAlt()).map((v) => v.tekst)).toEqual(['Ny vakt'])
  })

  it('avlyser med nøklene, for alle eller én mottaker, og med et prefiks mange i én operasjon', async () => {
    await kall('vanligB', 'select 1')
    const kl = await om(-5)
    const mange = Array.from({ length: 60 }, (_, i) => varsel('arkitektB', `plan:7:vakt-${i}`, kl, { data: { grunnlag: 'a' } }))
    await planlegg([...mange, varsel('arkitektB', 'a', kl), varsel('arkitektB', 'b', kl)])
    expect(await avlys(['a', 'finnes-ikke'], id('vanligB'))).toBe(0)
    expect(await avlys(['a'])).toBe(1)
    expect(await avlysPrefiks('plan:7:')).toBe(60)
    expect((await sendAlt()).map((v) => v.merke)).toEqual([`${FORMAL}:b`])
    // Et sendt varsel kan ikke avlyses; det blir stående, så det ikke sendes igjen.
    expect(await avlys(['b'])).toBe(0)
  })

  it('tar prefikset bokstavelig', async () => {
    const kl = await om(600)
    await planlegg([varsel('arkitektB', 'plan_7.a', kl), varsel('arkitektB', 'planX7.a', kl)])
    expect(await avlysPrefiks('plan_7')).toBe(1)
    expect((await rader()).map((r) => r.nokkel)).toEqual(['planX7.a'])
  })

  it('erstatter alle varslene med et prefiks i én operasjon: de som er borte, avlyses, resten byttes ut', async () => {
    await lagre('vanligB', enheter.vanligB)
    const kl = await om(600)
    await planlegg(['1', '2', '3'].map((n) => varsel('arkitektB', `pub:1:${n}`, kl)))
    await planlegg([varsel('arkitektB', 'pub:2:1', kl), varsel('arkitektB', 'annet', kl)])
    const svar = await erstatt('pub:1:', [
      varsel('arkitektB', 'pub:1:2', kl),
      varsel('arkitektB', 'pub:1:3', await om(900)),
      varsel('arkitektB', 'pub:1:4', kl),
    ])
    expect(svar).toEqual({ planlagt: 2, avlyst: 1 })
    expect((await rader()).map((r) => [r.nokkel, r.versjon])).toEqual([
      ['annet', 1],
      ['pub:1:2', 1],
      ['pub:1:3', 2],
      ['pub:1:4', 1],
      ['pub:2:1', 1],
    ])
    expect((await feilFra(() => erstatt('pub:1:', [varsel('arkitektB', 'pub:2:9', kl)])))?.code).toBe('22023')
    expect((await feilFra(() => erstatt('', [])))?.code).toBe('22023')
  })

  it('sender ikke etter fristen, og planlegger ikke et varsel med fristen passert', async () => {
    expect(await planlegg([varsel('arkitektB', 'gammel', await om(-16 * 60))])).toBe(0)
    await planlegg([varsel('arkitektB', 'a', await om(-60)), varsel('arkitektB', 'b', await om(-60), { senest: await om(30) })])
    await tidenGaar(60)
    expect((await sendAlt()).map((v) => v.merke)).toEqual([`${FORMAL}:a`])
    expect(await rader()).toMatchObject([
      { nokkel: 'a', ferdig: true },
      { nokkel: 'b', ferdig: true },
    ])
  })

  it('avviser varsler med feil form', async () => {
    const kl = await om(600)
    const feil = async (v: Partial<Plan>, formal = FORMAL) =>
      (await feilFra(() => planlegg([{ ...varsel('arkitektB', 'a', kl), ...v }], formal)))?.code
    expect(await feil({ sti: '#/chat' })).toBe('22023')
    expect(await feil({ sti: 'https://evil.example/#/prove' })).toBe('22023')
    expect(await feil({ fagmiljo: null })).toBe('22023')
    expect(await feil({ tekst: `Gjelder ${syntetiskPersonnummer(14, 3, 87)}` })).toBe('22023')
    expect(await feil({ tittel: '' })).toBe('23514')
    expect(await feil({ nokkel: 'med mellomrom' })).toBe('23514')
    expect(await feil({ data: { tekst: 'x'.repeat(3000) } })).toBe('23514')
    expect(await feil({ senest: await om(3 * 86_400) })).toBe('23514')
    expect(await feil({}, 'finnes_ikke')).toBe('22023')
    expect((await feilFra(() => planlegg([varsel('arkitektB', 'a', kl), varsel('arkitektB', 'a', kl)])))?.code).toBe('22023')
    expect(await rader()).toEqual([])
  })
})

describe('kontrollen rett før utsending', () => {
  beforeEach(async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await planlegg([varsel('arkitektB', 'a', await om(-5))])
  })

  const sendesIkke = async () => {
    expect(await hent()).toEqual([])
    expect(await rader()).toMatchObject([{ nokkel: 'a', ferdig: true, sendt_til: [] }])
  }

  it('stopper varselet når grunnlaget ikke gjelder lenger', async () => {
    await db.exec(`delete from intern.provegrunnlag where nokkel = 'a'`)
    await sendesIkke()
  })

  it('stopper varselet når formålets kontroll feiler', async () => {
    await planlegg([varsel('arkitektB', 'a', await om(-5), { data: { kast: 'ja' } })])
    await sendesIkke()
  })

  it('stopper varselet når funksjonen er slått av i fagmiljøet', async () => {
    await kall('arkitektB', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'av', GRUNN])
    await sendesIkke()
  })

  it('stopper varselet når medlemskapet i fagmiljøet er avsluttet', async () => {
    await somServer((tx) =>
      tx.query('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [id('vanligB'), T]),
    )
    await somServer((tx) =>
      tx.query('update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and fagmiljo_id = $2 and til is null', [
        id('arkitektB'),
        T,
      ]),
    )
    await avsluttMedlemskap(db, id('arkitektB'), T)
    await sendesIkke()
  })

  it('stopper varselet når mottakeren har slått av formålet', async () => {
    await kall('arkitektB', 'select public.sett_enhetsvarselvalg($1, false)', [FORMAL])
    await sendesIkke()
  })

  it('stopper varselet når mottakeren har logget ut (abonnementet er slettet)', async () => {
    await kall('arkitektB', 'select public.slett_pushabonnement($1)', [enheter.arkitektB.abonnement.endepunkt])
    await sendesIkke()
  })
})

describe('utsendingen fra Edge-funksjonen', () => {
  const pushtjeneste = (status: (url: string, n: number) => number = () => 201) => {
    const mottatt: {
      url: string
      hoder: Record<string, string>
      kropp: Bytes
      status: number
    }[] = []
    const hentPush = (async (url: string, init: RequestInit) => {
      const n = mottatt.filter((m) => m.url === url).length + 1
      const svar = status(url, n)
      mottatt.push({
        url,
        hoder: init.headers as Record<string, string>,
        kropp: init.body as Bytes,
        status: svar,
      })
      return new Response(null, { status: svar })
    }) as unknown as typeof fetch
    return { mottatt, hent: hentPush }
  }
  const vent = async () => void (await db.exec(`update intern.enhetsvarsler set neste_kl = now() where neste_kl > now()`))

  it('krypterer varselet til hver av mottakerens enheter, med innholdet fra databasen', async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await lagre('arkitektB', enheter.arkitektB2)
    await planlegg([varsel('arkitektB', 'a', await om(-5), { sti: '#/prove/dag-1' })])
    const nokler = await nyeVapidnokler()
    const push = pushtjeneste()
    expect(
      await sendEnhetsvarsler({
        db: tjenesteklient(),
        nokler,
        kontakt: 'https://ousfar.example',
        hent: push.hent,
        vent,
      }),
    ).toEqual({
      sendt: 2,
      borte: 0,
      feil: 0,
      hoppet: 0,
    })
    const [rad] = (await db.query<{ id: string }>('select id from intern.enhetsvarsler')).rows
    for (const e of [enheter.arkitektB, enheter.arkitektB2]) {
      const m = push.mottatt.find((x) => x.url === e.abonnement.endepunkt)!
      expect(m.hoder.Topic).toBe(pushemne(rad!.id))
      expect(JSON.parse(await dekrypter(m.kropp, e))).toEqual({
        tittel: 'Prøve',
        tekst: 'Syntetisk påminnelse',
        sti: '#/prove/dag-1',
        merke: `${FORMAL}:a`,
      })
    }
    expect(await rader()).toMatchObject([{ nokkel: 'a', ferdig: true }])
  })

  it('prøver igjen bare enheten som feilet, og sender til hver enhet én gang', async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await lagre('arkitektB', enheter.arkitektB2)
    await planlegg([varsel('arkitektB', 'a', await om(-5))])
    const push = pushtjeneste((url, n) => (url === enheter.arkitektB.abonnement.endepunkt && n <= 2 ? 503 : 201))
    const utfall = await sendEnhetsvarsler({
      db: tjenesteklient(),
      nokler: await nyeVapidnokler(),
      kontakt: 'https://ousfar.example',
      hent: push.hent,
      vent,
    })
    expect(utfall).toEqual({ sendt: 2, borte: 0, feil: 2, hoppet: 0 })
    expect(
      push.mottatt
        .filter((m) => m.status === 201)
        .map((m) => m.url)
        .sort(),
    ).toEqual([enheter.arkitektB.abonnement.endepunkt, enheter.arkitektB2.abonnement.endepunkt].sort())
    expect(await rader()).toMatchObject([{ nokkel: 'a', ferdig: true }])
  })

  it('sletter abonnementet push-tjenesten sier er borte, og gir opp etter fem forsøk', async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await lagre('vanligB', enheter.vanligB)
    await kall('arkitektB', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'på', GRUNN])
    await kall('vanligB', 'select public.sett_enhetsvarselvalg($1, true)', [FORMAL])
    await planlegg([varsel('arkitektB', 'a', await om(-5)), varsel('vanligB', 'a', await om(-5))])
    const push = pushtjeneste((url) => (url === enheter.vanligB.abonnement.endepunkt ? 410 : 503))
    const klient = tjenesteklient()
    const nokler = await nyeVapidnokler()
    const send = () => sendEnhetsvarsler({ db: klient, nokler, kontakt: 'https://ousfar.example', hent: push.hent, vent })
    await send()
    await vent()
    await send()
    expect(
      (await db.query('select 1 from public.pushabonnementer where endepunkt = $1', [enheter.vanligB.abonnement.endepunkt])).rows,
    ).toEqual([])
    expect(push.mottatt.filter((m) => m.url === enheter.arkitektB.abonnement.endepunkt)).toHaveLength(5)
    await db.exec('select intern.rydd_enhetsvarsler()')
    expect((await rader()).every((r) => r.ferdig)).toBe(true)
  })

  it('lar ikke et svar på en eldre versjon gjelde varselet som har byttet det ut', async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await planlegg([varsel('arkitektB', 'a', await om(-5))])
    const [gammel] = await hent()
    await planlegg([varsel('arkitektB', 'a', await om(-1), { tekst: 'Byttet underveis' })])
    await kvitter([
      {
        id: gammel!.id,
        versjon: gammel!.versjon,
        endepunkt: gammel!.endepunkt,
        svar: 'sendt',
      },
    ])
    expect(await rader()).toMatchObject([{ nokkel: 'a', versjon: 2, ferdig: false, sendt_til: [] }])
    expect((await sendAlt()).map((v) => v.tekst)).toEqual(['Byttet underveis'])
  })

  it('leser bare varsler med riktig form', () => {
    const god = {
      id: '0f8e3c1a-1111-4222-8333-944445555666',
      versjon: 1,
      endepunkt: 'https://fcm.googleapis.com/x',
      p256dh: 'p',
      auth: 'a',
      tittel: 't',
      tekst: 'x',
      sti: '#/prove',
      merke: 'prove:a',
    }
    expect(lesEnhetsvarsler([god])).toEqual([god])
    for (const feil of [
      { sti: 'javascript:alert(1)' },
      { sti: `#/${'a'.repeat(300)}` },
      { sti: 'https://evil.example/#/x' },
      { id: 'x' },
      { versjon: '1' },
      { merke: 'med mellomrom' },
    ]) {
      expect(lesEnhetsvarsler([{ ...god, ...feil }]), JSON.stringify(feil)).toEqual([])
    }
    expect(lesEnhetsvarsler(null)).toEqual([])
  })
})

describe('chatten som formål', () => {
  it('sender ikke chatvarsler til den som har slått av «Chatmeldinger», og som før til de andre', async () => {
    for (const p of ['vanligA', 'vanligB'] as const) await kall(p, 'select public.sett_chatvalg(true, null)')
    const K = await kall<string>('vanligA', 'select public.aapne_direktesamtale($1)', [id('vanligB')])
    await lagre('vanligB', enheter.vanligB)
    const send = () => kall('vanligA', 'select public.send_direktemelding($1, gen_random_uuid(), $2)', [K, 'Hei'])
    await send()
    expect((await db.query('select 1 from intern.chatvarselko')).rows).toHaveLength(1)
    await kall('vanligB', 'select public.sett_enhetsvarselvalg($1, false)', ['chat'])
    await send()
    expect((await db.query('select 1 from intern.chatvarselko')).rows).toHaveLength(1)
    // Også det som venter: når valget er av, sendes det ikke.
    await db.exec(`update intern.chatvarselko set kl = kl - interval '2 seconds'`)
    expect((await somTjeneste((tx) => tx.query<{ v: unknown[] }>('select public.chatvarsel_hent() as v'))).rows[0]!.v).toEqual([])
  })
})

describe('klokken', () => {
  const medPgNet = async () => {
    await db.exec(`
      create schema net;
      create table net.kall (url text);
      create function net.http_post(url text, body jsonb default '{}', params jsonb default '{}', headers jsonb default '{}', timeout_milliseconds integer default 5000)
      returns bigint language plpgsql as $$ begin insert into net.kall values (url); return 1; end $$;
      create schema vault;
      create table vault.decrypted_secrets (name text, decrypted_secret text);
      insert into vault.decrypted_secrets values ('chatvarsel_adresse', 'https://ref.supabase.co/functions/v1/chatvarsel-utsending'), ('chatvarsel_utloser', 'hemmelig');
    `)
  }
  const kallene = async () => (await db.query('select url from net.kall')).rows.length

  it('ber om utsendingen bare når et planlagt varsel skal sendes', async () => {
    await medPgNet()
    await db.exec('select intern.enhetsvarsel_klokke()')
    expect(await kallene()).toBe(0)
    await planlegg([varsel('arkitektB', 'a', await om(600))])
    await db.exec('select intern.enhetsvarsel_klokke()')
    expect(await kallene()).toBe(0)
    await tidenGaar(600)
    await db.exec('select intern.enhetsvarsel_klokke()')
    expect(await kallene()).toBe(1)
  })

  it('ber om utsendingen med en gang når et varsel planlegges til et tidspunkt som er passert', async () => {
    await medPgNet()
    await planlegg([varsel('arkitektB', 'a', await om(-5))])
    expect(await kallene()).toBe(1)
  })

  it('uten pg_cron (som her i testdatabasen) er ingen jobb lagt inn', async () => {
    expect((await db.query(`select to_regnamespace('cron') as c`)).rows).toEqual([{ c: null }])
  })
})

describe('nattjobben', () => {
  it('sletter varslene et døgn etter fristen, sendt eller ikke', async () => {
    await lagre('arkitektB', enheter.arkitektB)
    await planlegg([varsel('arkitektB', 'a', await om(-5)), varsel('arkitektB', 'b', await om(600))])
    await sendAlt()
    const jobb = LAGRINGSJOBBER.find((j) => j.navn === 'Planlagte varsler på enheten')!
    expect((await db.query<Ryddesvar>(jobb.rydd)).rows[0]!.slettet).toBe(0)
    await tidenGaar(2 * 86_400)
    expect((await db.query<Ryddesvar>(jobb.rydd)).rows[0]!.slettet).toBe(2)
    expect((await db.query<{ gjenstar: number }>(jobb.kontroll)).rows[0]!.gjenstar).toBe(0)
  })
})

describe('adressene', () => {
  it('har samme form i databasen og i appen', async () => {
    const [{ m }] = (await db.query<{ m: string }>('select intern.enhetsvarsler_sti() as m')).rows as [{ m: string }]
    expect(m).toBe(VARSELSTI.source.replace('\\/', '/'))
  })
})
