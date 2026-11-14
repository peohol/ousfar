/**
 * P4b: fortolkningsreglene per fagmiljø (docs/fagmiljoer.md, «Fortolkningen
 * per fagmiljø», og docs/ousfar-nasjonal-p0-kartlegging.md §2.6 og §6.4).
 *
 * Databasen fylles med dagens konsentrasjonsregelsett, rusmodulene og
 * THC-syreregelsettet med kommentarene deres (lokale for A, OUS Klinisk
 * farmakologi), og persongalleriet. Det som prøves:
 *
 * 1. Arbeidskonteksten: hvilket fagmiljø fortolkningen gjelder for hver person.
 * 2. Klinisk paritet: A får nøyaktig de samme regelsettene som før.
 * 3. Tydelig stopp: B, uten egne regler, får ingen, heller ikke
 *    systemarkitekten med B som arbeidskontekst, som kan lese A sine rader.
 * 4. Isolasjon: B sine egne regler, analytter og kommentarer når ikke A, og
 *    et regelsett kan ikke peke på kommentarer i et annet fagmiljø, heller
 *    ikke med en manipulert ID.
 * 5. Samme kode i begge: stoppes av de gamle globale nøklene så lenge de
 *    står; med den gamle nøkkelen fjernet (sist i fila, avsnitt 8) får hvert
 *    fagmiljø sitt, og en endring i B rører ikke A.
 * 6. Rekkevidden: nye objekter hører til fagmiljøet de lages i, kolonnen
 *    følger en flytting av regelsettet og kommentarene sammen, en flytting som
 *    ville gitt kommentarer på tvers stoppes uten å endre noe (et regelsett
 *    med intervall- og cut-off-kommentarer, og en brukt kommentar i et
 *    intervall, en cut-off, en rusmodul og THC-syreregelsettet), og en lokal
 *    regel kan ikke gjøres felles (D4).
 * 7. Endringsloggen og diskusjonene på fortolkningen følger konteksten.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Intervallregelsettinnhold } from '../regler/modell'
import { regelimportSql } from '../regler/import'
import { lesPubliserteRegelsett } from '../regler/kommentarer'
import { lagFaginnholdsleser } from '../faginnhold/lesing'
import { DAGENS_IMPORT } from './hjelp/dagensregler'
import { byggPersongalleri, PERSONER, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import {
  faginnholdskall,
  feilFra,
  kjorMigrasjoner,
  migrasjonsfiler,
  nyDatabase,
  opprettBruker,
  som,
  type Faginnholdskall,
} from './hjelp/testdatabase'

const PERSONENE = Object.keys(PERSONER) as Person[]

/** Fagmiljøet fortolkningen skal gjelde for hver person: det aktive primærmedlemskapet. */
const KONTEKST: Record<Person, Fagmiljo | null> = {
  systemarkitekt: 'A',
  arkitektB: 'B',
  vanligA: 'A',
  vanligB: 'B',
  adminA: 'A',
  adminB: 'B',
  dobbeltAB: 'A',
  avsluttetA: 'B',
  utenMedlemskap: null,
  tidligereAdmin: null,
}

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall
/** Koden og objektet til et av dagens regelsett i A. */
let kodeA = ''
let regelsettA = ''

interface Utgave<T> {
  id: string
  revisjon: number
  innhold: T
}

const kommentar = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })

/** Et enkelt, syntetisk regelsett med to intervaller. Ingen kliniske verdier. */
const regelsett = (kode: string, under: string, over: string): Intervallregelsettinnhold => ({
  analyttkode: kode,
  enhet: 'nmol/L',
  desimaler: 0,
  skillepunkter: [100],
  intervaller: [
    { niva: 'under', handling: null, kommentar: under },
    { niva: 'over', handling: null, kommentar: over },
  ],
  ringegrense: null,
  cutoff: null,
})

/** Kjører SQL som personen og gir første kolonne i første rad. */
async function forste<T>(p: Person, sql: string, parametre: unknown[] = []): Promise<T> {
  return som(db, g.id[p], async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0]!)[0] as T)
}

const intervallregelsettFor = (p: Person) =>
  forste<Utgave<Intervallregelsettinnhold>[]>(p, `select public.les_intervallregelsett('publisert')`)
const finnFor = (p: Person, kode: string) =>
  forste<Utgave<Intervallregelsettinnhold> | null>(p, `select public.finn_intervallregelsett($1, 'publisert')`, [kode])

/** Lager og publiserer et regelsett med to nye kommentarer som personen, og gir ID-ene. */
async function lagRegelsett(p: Person, kode: string, merke: string) {
  const under = (await kall.opprett('kommentar', kommentar(`${merke} under`), g.id[p])).id
  const over = (await kall.opprett('kommentar', kommentar(`${merke} over`), g.id[p])).id
  for (const k of [under, over]) await kall.publiser(k, 1, g.id[p])
  const objekt = (await kall.opprett('intervallregelsett', regelsett(kode, under, over), g.id[p])).id
  await kall.publiser(objekt, 1, g.id[p])
  return { objekt, under, over }
}

/** Rekkevidden et objekt har, som fagmiljøets bokstav. */
async function fagmiljoTil(objekt: string): Promise<Fagmiljo | 'felles'> {
  const { rows } = await db.query<{ omfang: string; fagmiljo_id: string | null }>(
    'select omfang, fagmiljo_id from public.ressursomfang where objekt_id = $1',
    [objekt],
  )
  const r = rows[0]!
  if (r.omfang === 'felles') return 'felles'
  return r.fagmiljo_id === g.fagmiljo.A ? 'A' : 'B'
}

/** Importen av THC-syreregelsettet, som bare kjøres når administratoren som bestilte den, finnes. */
const THC_IMPORT = migrasjonsfiler().find((f) => f.endsWith('_thc_regelsett_import.sql'))!

beforeAll(async () => {
  // Med THC-syreregelsettet og kommentarene det bruker, slik produksjonen har dem.
  db = await nyDatabase({ til: THC_IMPORT })
  await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Peder', etternavn: 'P', rolle: 'admin' })
  await kjorMigrasjoner(db, { fra: THC_IMPORT })
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
  await db.exec(regelimportSql(DAGENS_IMPORT, 'test.systemarkitekt'))
  const { rows } = await db.query<{ objekt_id: string; analyttkode: string }>(
    `select objekt_id, analyttkode from public.intervallregelsett where tilstand = 'publisert' order by analyttkode limit 1`,
  )
  kodeA = rows[0]!.analyttkode
  regelsettA = rows[0]!.objekt_id
}, 180_000)

afterAll(async () => {
  await db.close()
})

/* --- 1. Arbeidskonteksten ----------------------------------------------------- */

describe('arbeidskonteksten', () => {
  it('er det aktive primærmedlemskapet, og ingenting uten det', async () => {
    const fagmiljoFor = new Map(Object.entries(g.fagmiljo).map(([k, v]) => [v, k as Fagmiljo]))
    const svar = Object.fromEntries(
      await Promise.all(
        PERSONENE.map(async (p) => {
          const id = await forste<string | null>(p, 'select public.mitt_arbeidsfagmiljo()')
          return [p, id === null ? null : fagmiljoFor.get(id)] as const
        }),
      ),
    )
    expect(svar).toEqual(KONTEKST)
  })

  it('står i rettighetene appen henter, med navnet', async () => {
    for (const p of PERSONENE.filter((p) => KONTEKST[p] !== null)) {
      const r = await forste<{ arbeidsfagmiljo: { id: string; nokkel: string; navn: string } | null }>(
        p,
        'select public.mine_rettigheter()',
      )
      expect(r.arbeidsfagmiljo?.id, p).toBe(g.fagmiljo[KONTEKST[p]!])
      expect(r.arbeidsfagmiljo?.navn, p).toMatch(/^OUS /)
    }
  })
})

/* --- 2. Klinisk paritet --------------------------------------------------------- */

describe('fortolkningen i OUS Klinisk farmakologi', () => {
  it('får nøyaktig de samme regelsettene som før, for alle med A som arbeidskontekst', async () => {
    // Det den gamle lesingen ga: alle publiserte regelsett, uten radsikkerhet.
    const { rows } = await db.query<{ u: Utgave<Intervallregelsettinnhold>[] }>(
      `select coalesce(jsonb_agg(public.utgave_som_json(u) order by s.analyttkode), '[]'::jsonb) as u
       from public.intervallregelsett s
       join public.objektutgaver u on u.objekt_id = s.objekt_id and u.tilstand = s.tilstand
       where s.tilstand = 'publisert'`,
    )
    const for_ = rows[0]!.u
    expect(for_.length).toBe(DAGENS_IMPORT.length)
    for (const p of ['vanligA', 'adminA', 'systemarkitekt', 'dobbeltAB'] as const) {
      expect(await intervallregelsettFor(p), p).toEqual(for_)
    }
    expect((await finnFor('vanligA', kodeA))?.id).toBe(regelsettA)
  })

  it('har fagmiljøet på hver rad, lik rekkevidden', async () => {
    const { rows } = await db.query<{ avvik: number; antall: number }>(
      `select count(*) filter (where r.fagmiljo_id is distinct from s.fagmiljo_id)::int as avvik, count(*)::int as antall
       from public.intervallregelsett s join public.ressursomfang r on r.objekt_id = s.objekt_id`,
    )
    expect(rows[0]).toEqual({ avvik: 0, antall: DAGENS_IMPORT.length * 2 })
  })
})

/* --- 3. Tydelig stopp ---------------------------------------------------------- */

describe('et fagmiljø uten egne regler', () => {
  it('får ingen regler, aldri OUS Klinisk farmakologi sine, heller ikke en systemarkitekt som kan lese dem', async () => {
    for (const p of ['vanligB', 'adminB', 'arkitektB', 'avsluttetA'] as const) {
      expect(await intervallregelsettFor(p), p).toEqual([])
      expect(await finnFor(p, kodeA), p).toBeNull()
      expect(await forste(p, `select public.les_thc_regelsett('publisert')`), p).toBeNull()
      expect(await forste(p, `select public.les_scenarioregler('publisert')`), p).toEqual({ regelsett: [], kommentarer: [] })
      expect(await forste(p, `select public.les_referanseomrader('publisert')`), p).toEqual([])
    }
    // Systemarkitekten i B kan lese radene direkte, men fortolkningen gir dem ikke.
    expect(await forste<number>('arkitektB', 'select count(*)::int from public.intervallregelsett')).toBe(DAGENS_IMPORT.length * 2)
  })

  it('får ingen regler uten aktivt medlemskap', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect(await intervallregelsettFor(p), p).toEqual([])
      expect(await finnFor(p, kodeA), p).toBeNull()
    }
  })
})

/* --- 4. Isolasjon ------------------------------------------------------------- */

describe('egne regler i B', () => {
  let b: { objekt: string; under: string; over: string }
  beforeAll(async () => {
    b = await lagRegelsett('adminB', 'TESTB1', 'B1')
  })

  it('hører til B, med kommentarene, og leses bare med B som arbeidskontekst', async () => {
    for (const id of [b.objekt, b.under, b.over]) expect(await fagmiljoTil(id)).toBe('B')
    expect((await intervallregelsettFor('vanligB')).map((u) => u.id)).toEqual([b.objekt])
    expect((await finnFor('vanligB', 'TESTB1'))?.id).toBe(b.objekt)
    for (const p of ['vanligA', 'adminA', 'systemarkitekt', 'dobbeltAB'] as const) {
      expect(await finnFor(p, 'TESTB1'), p).toBeNull()
      expect((await intervallregelsettFor(p)).some((u) => u.id === b.objekt), p).toBe(false)
    }
    // Kommentarene: en vanlig bruker i A får dem ikke, heller ikke med ID-en.
    expect(await forste('vanligA', `select public.les_kommentarer('publisert', $1)`, [[b.under, b.over]])).toEqual([])
  })

  it('kan ikke peke på kommentarer i A, heller ikke med en manipulert ID eller som systemarkitekt', async () => {
    const fremmed = (await intervallregelsettFor('vanligA'))[0]!.innhold.intervaller[0]!.kommentar
    for (const p of ['adminB', 'arkitektB'] as const) {
      const feil = await feilFra(() => kall.opprett('intervallregelsett', regelsett('TESTB2', fremmed, b.over), g.id[p]))
      expect(feil, p).toMatchObject({ code: '42501', message: 'Regelsettet kan bare bruke kommentarer fra sitt eget fagmiljø.' })
    }
    // Og A kan ikke peke på B sine.
    const feil = await feilFra(() => kall.opprett('intervallregelsett', regelsett('TESTA2', b.under, b.over), g.id.adminA))
    expect(feil).toMatchObject({ code: '42501' })
  })

  it('og en egen laboratorieanalytt i B, som bare B sine oppslag ser', async () => {
    const side = (await kall.opprett('infoside', { navn: 'Syntetisk B-stoff' })).id
    await kall.publiser(side, 1)
    const analytt = (await kall.opprett('laboratorieanalytt', { kode: 'TESTB3', hovedside: side, komponenter: [side] }, g.id.adminB)).id
    await kall.publiser(analytt, 1, g.id.adminB)
    expect(await fagmiljoTil(analytt)).toBe('B')
    const analyttside = (p: Person) => forste<{ analytt: { id: string } } | null>(p, `select public.les_analyttside('TESTB3', 'publisert')`)
    expect((await analyttside('vanligB'))?.analytt.id).toBe(analytt)
    expect(await analyttside('vanligA')).toBeNull()
    expect(await analyttside('dobbeltAB')).toBeNull()
  })
})

/* --- 5. Samme kode i begge ------------------------------------------------------ */

describe('samme kode i to fagmiljøer', () => {
  it('stoppes av de gamle globale nøklene så lenge de står', async () => {
    const under = (await kall.opprett('kommentar', kommentar('B samme kode under'), g.id.adminB)).id
    const over = (await kall.opprett('kommentar', kommentar('B samme kode over'), g.id.adminB)).id
    const feil = await feilFra(() => kall.opprett('intervallregelsett', regelsett(kodeA, under, over), g.id.adminB))
    expect(feil).toMatchObject({ code: '23505' })
  })
})

/* --- 6. Rekkevidden -------------------------------------------------------------- */

/**
 * Endrer rekkevidden som en systemarkitekt gjør det, med begrunnelse, i én
 * oppdatering for alle objektene; feilen, eller null.
 */
const settRekkevidde = (objekter: string | string[], omfang: string, fagmiljo: string | null) =>
  feilFra(() =>
    db.transaction(async (tx: Transaction) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'P4b-test (syntetisk)', true)`)
      await tx.query('update public.ressursomfang set omfang = $2, fagmiljo_id = $3, regel = null where objekt_id = any ($1)', [
        ([] as string[]).concat(objekter),
        omfang,
        fagmiljo,
      ])
    }),
  )

const FLYTTING_PAA_TVERS = {
  code: '42501',
  message: 'Flyttingen ville latt et regelsett bruke kommentarer fra et annet fagmiljø. Flytt regelsettet og kommentarene sammen.',
}

describe('rekkevidden til fortolkningen', () => {
  it('gir et nytt lokalt objekt fagmiljøet det lages i', async () => {
    for (const p of ['adminA', 'adminB', 'arkitektB', 'systemarkitekt'] as const) {
      const id = (await kall.opprett('kommentar', kommentar(`Ny av ${p}`), g.id[p])).id
      expect(await fagmiljoTil(id), p).toBe(KONTEKST[p])
    }
  })

  it('kan ikke gjøre en lokal regel felles (D4)', async () => {
    expect(await settRekkevidde(regelsettA, 'felles', null)).toMatchObject({ code: '42501' })
    expect(await fagmiljoTil(regelsettA)).toBe('A')
  })

  it('stopper en flytting som ville latt et regelsett bruke et annet fagmiljøs kommentarer, uten å endre noe', async () => {
    // (a) Et regelsett med både intervall- og cut-off-kommentarer.
    const { rows: medCutoff } = await db.query<{ objekt_id: string; analyttkode: string; cutoff: string }>(
      `select objekt_id, analyttkode, coalesce(cutoff_kommentar_id, cutoff_innledning_id) as cutoff
       from public.intervallregelsett
       where tilstand = 'publisert' and coalesce(cutoff_kommentar_id, cutoff_innledning_id) is not null
       order by analyttkode limit 1`,
    )
    expect(medCutoff, 'et regelsett med cut-off-kommentar').toHaveLength(1)
    const regelsettMedCutoff = medCutoff[0]!
    const intervallkommentarer = (
      await db.query<{ id: string }>('select distinct kommentar_id as id from public.intervallregler where regelsett_id = $1', [
        regelsettMedCutoff.objekt_id,
      ])
    ).rows.map((r) => r.id)
    expect(intervallkommentarer.length).toBeGreaterThan(0)

    // (b) Kommentarer i bruk: i et intervall, som cut-off, i en rusmodul og i THC-regelsettet.
    const bruktIModul = await db.query<{ id: string }>('select kommentar_id as id from public.scenarioplasseringer limit 1')
    const bruktITHC = await db.query<{ id: string }>('select kommentar_id as id from public.thc_tekstbolker limit 1')
    expect(bruktIModul.rows, 'en kommentar i en rusmodul').toHaveLength(1)
    expect(bruktITHC.rows, 'en kommentar i THC-regelsettet').toHaveLength(1)
    const brukte = [intervallkommentarer[0]!, regelsettMedCutoff.cutoff, ...bruktIModul.rows.map((r) => r.id), ...bruktITHC.rows.map((r) => r.id)]

    const tilstand = async () => ({
      rekkevidde: (await db.query('select objekt_id, omfang, fagmiljo_id, regel from public.ressursomfang order by objekt_id')).rows,
      kolonner: (
        await db.query(
          `select objekt_id, tilstand, fagmiljo_id from public.intervallregelsett
           union all select objekt_id, tilstand, fagmiljo_id from public.scenarioregelsett
           union all select objekt_id, tilstand, fagmiljo_id from public.thc_regelsett
           order by 1, 2`,
        )
      ).rows,
      intervallA: await intervallregelsettFor('vanligA'),
      scenarioA: await forste<unknown>('vanligA', `select public.les_scenarioregler('publisert')`),
      thcA: await forste<unknown>('vanligA', `select public.les_thc_regelsett('publisert')`),
      intervallB: await intervallregelsettFor('vanligB'),
    })
    const for_ = await tilstand()

    const forsok: Array<[string, string[]]> = [
      ['regelsettet alene', [regelsettMedCutoff.objekt_id]],
      ['regelsettet med intervallkommentarene, uten cut-off', [regelsettMedCutoff.objekt_id, ...intervallkommentarer.filter((k) => k !== regelsettMedCutoff.cutoff)]],
      ...brukte.map((k, i): [string, string[]] => [`brukt kommentar ${i + 1} alene`, [k]]),
    ]
    for (const [hva, objekter] of forsok) {
      expect(await settRekkevidde(objekter, 'fagmiljo', g.fagmiljo.B), hva).toMatchObject(FLYTTING_PAA_TVERS)
    }
    expect(await tilstand()).toEqual(for_)

    // Fortolkningen leser fortsatt alle regelsettene med tekstene i A, og ingen i B.
    const iA = await lesPubliserteRegelsett(lagFaginnholdsleser(kall.klientFor(g.id.vanligA)))
    expect(iA.map((r) => r.analyttkode)).toContain(regelsettMedCutoff.analyttkode)
    expect((await finnFor('vanligA', regelsettMedCutoff.analyttkode))?.id).toBe(regelsettMedCutoff.objekt_id)
    expect(await finnFor('vanligB', regelsettMedCutoff.analyttkode)).toBeNull()
  })

  it('lar fagmiljøet på reglene følge en flytting av regelsettet og kommentarene sammen, og kan ikke settes for seg', async () => {
    const kode = 'TESTA1'
    const { objekt: id, under, over } = await lagRegelsett('adminA', kode, 'A flyttes')
    const sammen = [id, under, over]
    try {
      expect(await settRekkevidde(sammen, 'fagmiljo', g.fagmiljo.B)).toBeNull()
      const kolonne = await db.query<{ f: string }>('select distinct fagmiljo_id as f from public.intervallregelsett where objekt_id = $1', [id])
      expect(kolonne.rows).toEqual([{ f: g.fagmiljo.B }])
      // Kolonnen settes alltid fra rekkevidden.
      await db.query('update public.intervallregelsett set fagmiljo_id = $2 where objekt_id = $1', [id, g.fagmiljo.A])
      const etter = await db.query<{ f: string }>('select distinct fagmiljo_id as f from public.intervallregelsett where objekt_id = $1', [id])
      expect(etter.rows).toEqual([{ f: g.fagmiljo.B }])
      expect(await finnFor('vanligA', kode)).toBeNull()
      expect((await finnFor('vanligB', kode))?.id).toBe(id)
    } finally {
      expect(await settRekkevidde(sammen, 'fagmiljo', g.fagmiljo.A)).toBeNull()
    }
    expect((await finnFor('vanligA', kode))?.id).toBe(id)
  })
})

/* --- 7. Endringsloggen og diskusjonene ---------------------------------------- */

describe('endringsloggen og diskusjonene på fortolkningen', () => {
  it('gir endringsloggen for en kode bare arbeidskontekstens objekter', async () => {
    const rotter = (p: Person) =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: g.id[p], role: 'authenticated' })])
        const { rows } = await tx.query<{ r: string }>(`select intern.endringsrotter($1, false) as r`, [
          JSON.stringify({ analyttkoder: [kodeA, 'TESTB1'] }),
        ])
        return rows.map((r) => r.r)
      })
    const iA = await rotter('vanligA')
    const iB = await rotter('vanligB')
    expect(iA).toContain(regelsettA)
    expect(await Promise.all(iA.map(fagmiljoTil))).toEqual(iA.map(() => 'A'))
    expect(iB.length).toBeGreaterThan(0)
    expect(await Promise.all(iB.map(fagmiljoTil))).toEqual(iB.map(() => 'B'))
  })

  it('gir en tråd på fortolkningen fagmiljøet til den som starter den, og den andre ser den ikke', async () => {
    const side = `fortolkning:${kodeA.toLowerCase()}`
    const traad = async (p: Person) => {
      const kategori = await forste<string>(p, 'select public.opprett_diskusjonskategori($1, $2, $3)', [
        side,
        `Kategori ${p}`,
        p === 'vanligA' ? '🧪' : '🔬',
      ])
      return forste<string>(p, 'select public.opprett_diskusjon($1, $2, $3, $4)', [
        side,
        kategori,
        `Tråd av ${p}`,
        JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Syntetisk' }] }] }),
      ])
    }
    const iA = await traad('vanligA')
    const iB = await traad('vanligB')
    const { rows } = await db.query<{ id: string; fagmiljo_id: string }>('select id, fagmiljo_id from public.diskusjoner where id = any ($1)', [
      [iA, iB],
    ])
    expect(Object.fromEntries(rows.map((r) => [r.id, r.fagmiljo_id]))).toEqual({ [iA]: g.fagmiljo.A, [iB]: g.fagmiljo.B })
    const synlige = (p: Person) =>
      som(db, g.id[p], async (tx) => (await tx.query<{ id: string }>('select id from public.diskusjoner where side = $1', [side])).rows.map((r) => r.id))
    expect(await synlige('vanligA')).toEqual([iA])
    expect(await synlige('vanligB')).toEqual([iB])
  })
})

/* --- 8. Uten de gamle globale nøklene ------------------------------------------ */

describe('samme kode i to fagmiljøer, uten de gamle globale nøklene', () => {
  it('gir hvert fagmiljø sitt når de gamle nøklene er borte, og en endring i B rører ikke A', async () => {
    const a = await intervallregelsettFor('vanligA')
    // Det neste steget (egen migrasjon med Peders godkjenning). Testen kjøres
    // sist, så resten av fila prøves med de gamle nøklene på plass.
    await db.exec('alter table public.intervallregelsett drop constraint intervallregelsett_analyttkode_entydig')
    const b = await lagRegelsett('adminB', kodeA, 'B samme kode')
    expect((await finnFor('vanligB', kodeA))?.id).toBe(b.objekt)
    expect((await finnFor('vanligA', kodeA))?.id).toBe(regelsettA)
    expect(await intervallregelsettFor('vanligA')).toEqual(a)

    // En ny tekst i B sin kommentar endrer ikke A sin fortolkning.
    await kall.lagre(b.under, 1, { ...kommentar('B samme kode under'), tekst: 'Endret syntetisk tekst i B.' }, g.id.adminB)
    await kall.publiser(b.under, 2, g.id.adminB)
    expect(await intervallregelsettFor('vanligA')).toEqual(a)

    // To regelsett for samme kode i samme fagmiljø stoppes fortsatt.
    const under = (await kall.opprett('kommentar', kommentar('B dobbel under'), g.id.adminB)).id
    const feil = await feilFra(() => kall.opprett('intervallregelsett', regelsett(kodeA, under, under), g.id.adminB))
    expect(feil).toMatchObject({ code: '22023', message: `Analyttkoden ${kodeA} har alt et regelsett.` })
  })
})
