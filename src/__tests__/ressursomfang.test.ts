/**
 * Rekkevidden til ressursene (P4a, docs/fagmiljoer.md «Rekkevidde»,
 * docs/ousfar-nasjonal-p0-kartlegging.md §3).
 *
 * Objektene finnes før strukturen kommer, slik de gjør i produksjonen: en
 * fagside med kort, en referanse, og et objekt av hver lokal type. Så kjøres
 * strukturen og tilbakefyllingen. Det som prøves: at hvert objekt får nøyaktig
 * én rekkevidde etter klassifiseringen, at nye objekter får den av seg selv,
 * at referanseområdene er felles og THC-syreregelsettet lokalt (D4), at raden verken kan
 * fjernes eller flyttes, at nettleseren ikke når tabellen, og at hver tabell,
 * visning og statisk datafil har en erklært rekkevidde.
 */
import type { PGlite } from '@electric-sql/pglite'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import { STATISKE_RESSURSER, TABELLER } from './data/ressurskatalog'
import { faginnholdskall, feilFra, kjorMigrasjoner, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const STRUKTUR = '20261113210000_ressursomfang.sql'
const TILBAKEFYLLING = '20261113210100_ressursomfang_tilbakefylling.sql'
const ROT = resolve(__dirname, '../..')
const tilbakefyllingen = readFileSync(resolve(ROT, 'supabase/migrations', TILBAKEFYLLING), 'utf8')

type Omfang = 'felles' | 'fagmiljo'

/**
 * Klassifiseringen i P0 §3 med D4 (#374), per objekttype: fagsidene, alt
 * innholdet på dem (også referanseområdene) og referansene felles;
 * fortolkningen, også THC-syreregelsettet, lokal.
 */
const ETTER_TYPE: Record<string, Omfang> = {
  infoside: 'felles',
  referanse: 'felles',
  innholdselement: 'felles',
  laboratorieanalytt: 'fagmiljo',
  intervallregelsett: 'fagmiljo',
  scenarioregelsett: 'fagmiljo',
  kommentar: 'fagmiljo',
  thc_regelsett: 'fagmiljo',
}
const LOKALE_TYPER = Object.keys(ETTER_TYPE).filter((t) => ETTER_TYPE[t] === 'fagmiljo')

interface Rad {
  objekt_id: string
  omfang: string
  fagmiljo_id: string | null
  regel: string | null
  satt_kl: string
}

let db: PGlite
let lager: Faginnholdslager
let admin: string
let kf: string
const ider = { side: '', referanseomrade: '', toksisk: '', referanse: '' }
const lokale: Record<string, string> = {}

const kort = (infoside: string, elementtype: string, data: Record<string, unknown> = { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' }) =>
  lager.opprettUtkast('innholdselement', { infoside, panel: 'viktige_data', posisjon: 0, elementtype, data, referanser: [] })

async function rekkevidde(objekt: string): Promise<Rad | undefined> {
  const { rows } = await db.query<Rad>('select * from public.ressursomfang where objekt_id = $1', [objekt])
  return rows[0]
}

/** Rekkevidden regelen gir objektet, med typen som navn på regelen. */
async function forventRekkevidde(objekt: string, type: string) {
  const omfang = ETTER_TYPE[type]!
  expect(await rekkevidde(objekt)).toMatchObject({ omfang, fagmiljo_id: omfang === 'felles' ? null : kf, regel: type })
}

/** Et objekt registrert direkte, uten innhold: nok for rekkevidden. */
async function registrer(type: string): Promise<string> {
  const { rows } = await db.query<{ id: string }>('insert into public.redigerbare_objekter (type) values ($1) returning id', [type])
  return rows[0]!.id
}

beforeAll(async () => {
  db = await nyDatabase({ til: STRUKTUR })
  admin = await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin' })
  lager = lagFaginnholdslager(faginnholdskall(db, admin).klientFor(admin))

  // Objektene som finnes før P4a.
  const side = await lager.opprettUtkast('infoside', { navn: 'Testmiddel' })
  ider.side = side.id
  ider.referanseomrade = (await kort(side.id, 'referanseomrade')).id
  ider.toksisk = (await kort(side.id, 'toksisk_omrade')).id
  ider.referanse = (
    await lager.opprettUtkast('referanse', { tittel: 'Kilde', forfattere: 'Nordmann O', aar: '2021', lenke: 'https://example.org/a' })
  ).id
  for (const type of LOKALE_TYPER) lokale[type] = await registrer(type)

  await kjorMigrasjoner(db, { fra: STRUKTUR })
  kf = (await db.query<{ id: string }>(`select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi'`)).rows[0]!.id
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('tilbakefyllingen', () => {
  it('gir hvert objekt som fantes, nøyaktig én rekkevidde', async () => {
    const { rows } = await db.query<{ objekter: number; rader: number; uten: number }>(
      `select (select count(*)::int from public.redigerbare_objekter) as objekter,
              (select count(*)::int from public.ressursomfang) as rader,
              (select count(*)::int from public.redigerbare_objekter o
               where not exists (select 1 from public.ressursomfang r where r.objekt_id = o.id)) as uten`,
    )
    expect(rows[0]).toEqual({ objekter: 4 + LOKALE_TYPER.length, rader: 4 + LOKALE_TYPER.length, uten: 0 })
  })

  it('klassifiserer etter P0 §3: fagsider, kortene og referansene felles, fortolkningen lokal', async () => {
    await forventRekkevidde(ider.side, 'infoside')
    await forventRekkevidde(ider.toksisk, 'innholdselement')
    await forventRekkevidde(ider.referanse, 'referanse')
    for (const type of LOKALE_TYPER) await forventRekkevidde(lokale[type]!, type)
  })

  it('gjør referanseområdene felles og THC-syreregelsettet lokalt (D4)', async () => {
    await forventRekkevidde(ider.referanseomrade, 'innholdselement')
    expect(await rekkevidde(ider.referanseomrade)).toMatchObject({ omfang: 'felles' })
    expect(await rekkevidde(lokale.thc_regelsett!)).toMatchObject({ omfang: 'fagmiljo', fagmiljo_id: kf })
  })

  it('kan kjøres på nytt uten å endre noe', async () => {
    const for_ = (await db.query<Rad>('select * from public.ressursomfang order by objekt_id')).rows
    await db.exec(tilbakefyllingen)
    expect((await db.query<Rad>('select * from public.ressursomfang order by objekt_id')).rows).toEqual(for_)
  })

  it('stopper hvis et objekt har en annen rekkevidde enn regelen gir', async () => {
    await db.exec('begin')
    try {
      await db.exec(`update public.ressursomfang set omfang = 'felles', fagmiljo_id = null where objekt_id = '${lokale.kommentar}'`)
      await expect(db.exec(tilbakefyllingen)).rejects.toThrow(/1 objekter har en annen rekkevidde enn regelen gir/)
    } finally {
      await db.exec('rollback')
    }
  })
})

describe('nye objekter', () => {
  it('får rekkevidden etter typen, for hver objekttype som finnes', async () => {
    const { rows } = await db.query<{ type: string }>(`select unnest(enum_range(null::public.objekttype))::text as type`)
    expect(rows.map((r) => r.type).sort()).toEqual(Object.keys(ETTER_TYPE).sort())
    await db.exec('begin')
    try {
      for (const { type } of rows) await forventRekkevidde(await registrer(type), type)
    } finally {
      await db.exec('rollback')
    }
  })
  it('gir et kort samme rekkevidde uansett type, også når det blir et referanseområde', async () => {
    const side = (await lager.opprettUtkast('infoside', { navn: 'Andre testmiddel' })).id
    const toksisk = await kort(side, 'toksisk_omrade')
    await forventRekkevidde(toksisk.id, 'innholdselement')
    await lager.lagreUtkast(toksisk.id, toksisk.revisjon!, {
      infoside: side,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'referanseomrade',
      data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
      referanser: [],
    })
    await forventRekkevidde(toksisk.id, 'innholdselement')
  })
})

describe('vaktene', () => {
  /** Kjører arbeidet i én transaksjon, med de utsatte kontrollene; gir feilen eller `null`. */
  const prov = (sql: string) => feilFra(() => db.transaction(async (tx) => {
    await tx.exec(sql)
  }))

  it('lar ikke en rekkevidde fjernes, tømmes eller flyttes til et annet objekt', async () => {
    expect(await prov(`delete from public.ressursomfang where objekt_id = '${ider.side}'`)).toMatchObject({ code: '23514' })
    expect(await prov(`truncate public.ressursomfang`)).toMatchObject({ code: '42501' })
    expect(await prov(`update public.ressursomfang set objekt_id = '${ider.toksisk}' where objekt_id = '${ider.side}'`)).toMatchObject({
      code: '42501',
    })
    expect(await rekkevidde(ider.side)).toBeDefined()
  })

  it('godtar bare felt som passer omfanget, og ingen grupper ennå', async () => {
    const id = ider.side
    expect(await prov(`update public.ressursomfang set fagmiljo_id = '${kf}' where objekt_id = '${id}'`)).toMatchObject({ code: '23514' })
    expect(await prov(`update public.ressursomfang set omfang = 'gruppe', gruppe_id = gen_random_uuid() where objekt_id = '${id}'`)).toMatchObject({
      code: '23514',
    })
  })

  it('følger objektet når det slettes for godt', async () => {
    const ref = await lager.opprettUtkast('referanse', { tittel: 'Feil', forfattere: 'A', aar: '2020', lenke: 'https://example.org/b' })
    expect(await rekkevidde(ref.id)).toBeDefined()
    await lager.slettReferanse(ref.id, ref.revisjon!)
    expect(await rekkevidde(ref.id)).toBeUndefined()
  })

  it('fører hver endring av en rekkevidde i tilgangsloggen, med begrunnelsen', async () => {
    const element = await kort(ider.side, 'steady_state', { verdi: '2 d' })
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: lokal', true)`)
      await tx.query(`update public.ressursomfang set omfang = 'fagmiljo', fagmiljo_id = $2, regel = null where objekt_id = $1`, [
        element.id,
        kf,
      ])
    })
    const { rows } = await db.query<{ handling: string; fagmiljo_id: string; grunn: string; foer: Rad; etter: Rad }>(
      `select handling, fagmiljo_id, grunn, foer, etter from public.tilgangslogg where etter ->> 'objekt_id' = $1`,
      [element.id],
    )
    expect(rows).toMatchObject([
      { handling: 'ressursomfang.update', fagmiljo_id: kf, grunn: 'Test: lokal', foer: { omfang: 'felles' }, etter: { omfang: 'fagmiljo' } },
    ])
  })

  it('gir ikke nettleseren noen tilgang til tabellen', async () => {
    const { rows } = await db.query<{ rolle: string; tilgang: boolean }>(
      `select r as rolle, has_table_privilege(r, 'public.ressursomfang', 'select, insert, update, delete') as tilgang
       from unnest(array['anon', 'authenticated']) r`,
    )
    expect(rows).toEqual([
      { rolle: 'anon', tilgang: false },
      { rolle: 'authenticated', tilgang: false },
    ])
    expect(await feilFra(() => som(db, admin, (tx) => tx.query('select * from public.ressursomfang')))).toMatchObject({ code: '42501' })
  })
})

describe('ressurskatalogen', () => {
  it('har en rekkevidde for hver tabell og visning, og ingen til overs', async () => {
    const { rows } = await db.query<{ navn: string; skjema: string }>(
      `select n.nspname || '.' || c.relname as navn, n.nspname as skjema
       from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where c.relkind in ('r', 'p', 'v', 'm')
         and n.nspname not like 'pg\\_%'
         and n.nspname not in ('information_schema', 'auth', 'storage', 'supabase_migrations', 'extensions', 'graphql', 'realtime')
       order by 1`,
    )
    const erklart = (r: { navn: string; skjema: string }) => TABELLER[r.navn] ?? TABELLER[`${r.skjema}.*`]
    expect(rows.filter((r) => !erklart(r)).map((r) => r.navn)).toEqual([])
    const brukt = new Set(rows.flatMap((r) => [r.navn, `${r.skjema}.*`]))
    expect(Object.keys(TABELLER).filter((n) => !brukt.has(n))).toEqual([])
  })

  it('erklærer tabellene som peker på et objekt, som en del av det, avledet av det eller forvaltning av det', async () => {
    const { rows } = await db.query<{ navn: string }>(
      `select distinct c.conrelid::regclass::text as navn from pg_constraint c
       where c.contype = 'f' and c.confrelid in ('public.redigerbare_objekter'::regclass, 'public.objekttilstander'::regclass)`,
    )
    const feil = rows
      .map((r) => (r.navn.includes('.') ? r.navn : `public.${r.navn}`))
      .filter((n) => n !== 'public.ressursomfang')
      .filter((n) => {
        const rekkevidde = (TABELLER[n] ?? TABELLER[`${n.split('.')[0]}.*`])?.rekkevidde
        return !['objekt', 'avledet', 'forvaltning'].includes(rekkevidde ?? '')
      })
    expect(feil).toEqual([])
  })

  it('har en rekkevidde for hver statiske datafil, og bare for filer som finnes', () => {
    const filer = ['src/data', 'originaldata'].flatMap((mappe) => readdirSync(resolve(ROT, mappe)).map((f) => `${mappe}/${f}`))
    expect(filer.filter((f) => !STATISKE_RESSURSER[f])).toEqual([])
    expect(Object.keys(STATISKE_RESSURSER).filter((f) => !existsSync(resolve(ROT, f)))).toEqual([])
  })

  it('peker på lokale deler som finnes i filene', () => {
    for (const [fil, { lokaleDeler }] of Object.entries(STATISKE_RESSURSER)) {
      if (!lokaleDeler) continue
      const innhold = JSON.parse(readFileSync(resolve(ROT, fil), 'utf8')) as Record<string, unknown>
      for (const del of lokaleDeler) expect(innhold, `${fil}: ${del}`).toHaveProperty(del)
    }
  })

  it('lar ikke noe uavklart være felles', () => {
    const felles = Object.entries(STATISKE_RESSURSER).filter(([, k]) => k.uavklart && k.rekkevidde === 'felles')
    expect(felles).toEqual([])
  })
})
