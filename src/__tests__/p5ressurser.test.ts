/**
 * P5.0: den felles grunnmuren for redaktøransvaret og endringsforslagene
 * (docs/redaktorer-og-forslag.md, «Grunnmuren»). Prøver hvilke ressurser et
 * objekt hører til, beskrivelsen av en ressurs, og hvem som kan behandle og
 * får beskjed om forslag, med persongalleriet og syntetiske data.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { regelimportSql } from '../regler/import'
import { DAGENS_IMPORT } from './hjelp/dagensregler'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, nyDatabase } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
const obj = { fagside: '', kort: '', referanse: '', regelsettA: '', regelsettB: '', kommentarA: '' }

const ressurser = async (objekt: string) =>
  (await db.query<{ r: string }>('select r from intern.ressurser_for($1) r order by r', [objekt])).rows.map((x) => x.r)

const kanBehandle = async (ressurs: string, person: Person) =>
  (await db.query<{ ja: boolean }>('select intern.kan_behandle_forslag($1, $2) as ja', [ressurs, g.id[person]])).rows[0]!.ja

const behandlere = async (ressurs: string) =>
  (await db.query<{ b: string }>('select b from intern.forslagsbehandlere($1) b', [ressurs])).rows.map((x) => x.b).sort()

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  await db.exec(regelimportSql(DAGENS_IMPORT, 'test.systemarkitekt'))
  const kall = faginnholdskall(db, g.id.systemarkitekt)

  const side = await kall.opprett('infoside', { navn: 'Ressursmiddel' })
  obj.fagside = side.id
  obj.kort = (
    await kall.opprett('innholdselement', {
      infoside: side.id,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'referanseomrade',
      data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
      referanser: [],
    })
  ).id
  obj.referanse = (await kall.opprett('referanse', { tittel: 'Kilde', forfattere: 'Nordmann O', aar: '2021', lenke: 'https://example.org/r' })).id
  for (const id of [obj.fagside, obj.kort]) await kall.publiser(id, 1)

  const { rows } = await db.query<{ objekt_id: string }>(
    `select objekt_id from public.intervallregelsett where tilstand = 'publisert' order by analyttkode limit 2`,
  )
  obj.regelsettA = rows[0]!.objekt_id
  obj.regelsettB = rows[1]!.objekt_id
  obj.kommentarA = (
    await db.query<{ k: string }>(`select kommentar_id as k from public.intervallregler where regelsett_id = $1 limit 1`, [obj.regelsettA])
  ).rows[0]!.k
  // Regelsett B, med kommentarene det bruker, flyttes til fagmiljø B.
  const kommentarerB = (
    await db.query<{ id: string }>(
      `select kommentar_id as id from public.intervallregler where regelsett_id = $1
       union select unnest(array[cutoff_innledning_id, cutoff_kommentar_id]) from public.intervallregelsett where objekt_id = $1`,
      [obj.regelsettB],
    )
  ).rows.map((r) => r.id).filter(Boolean)
  await db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'P5-test: lokalt for B (syntetisk)', true)`)
    await tx.query(`update public.ressursomfang set omfang = 'fagmiljo', fagmiljo_id = $2, regel = null where objekt_id = any ($1)`, [
      [obj.regelsettB, ...kommentarerB],
      g.fagmiljo.B,
    ])
  })
})

describe('ressursene et objekt hører til', () => {
  it('en fagside og et regelsett er sin egen ressurs', async () => {
    expect(await ressurser(obj.fagside)).toEqual([obj.fagside])
    expect(await ressurser(obj.regelsettA)).toEqual([obj.regelsettA])
  })

  it('et kort hører til fagsiden sin', async () => {
    expect(await ressurser(obj.kort)).toEqual([obj.fagside])
    const { rows } = await db.query<{ ja: boolean; nei: boolean }>(
      'select intern.tilhorer_ressurs($1, $2) as ja, intern.tilhorer_ressurs($1, $3) as nei',
      [obj.kort, obj.fagside, obj.regelsettA],
    )
    expect(rows[0]).toEqual({ ja: true, nei: false })
  })

  it('en kommentar hører til regelsettene som bruker den', async () => {
    expect(await ressurser(obj.kommentarA)).toContain(obj.regelsettA)
  })

  it('en referanse og et objekt som ikke finnes, hører ikke til noen ressurs', async () => {
    expect(await ressurser(obj.referanse)).toEqual([])
    expect(await ressurser('00000000-0000-4000-8000-000000000000')).toEqual([])
  })
})

describe('beskrivelsen av en ressurs', () => {
  it('gir navnet, rekkevidden og den publiserte revisjonen for en fagside', async () => {
    const { rows } = await db.query<{ b: Record<string, unknown> }>('select intern.ressursbeskrivelse($1) as b', [obj.fagside])
    expect(rows[0]!.b).toMatchObject({ id: obj.fagside, type: 'infoside', navn: 'Ressursmiddel', omfang: 'felles', fagmiljo_id: null, publisert_revisjon: 1 })
    expect(rows[0]!.b).not.toHaveProperty('utkast_revisjon')
  })

  it('gir analyttkoden og fagmiljøet for et lokalt regelsett', async () => {
    const { rows } = await db.query<{ b: Record<string, unknown>; kode: string }>(
      `select intern.ressursbeskrivelse($1) as b, (select analyttkode from public.intervallregelsett where objekt_id = $1 and tilstand = 'publisert') as kode`,
      [obj.regelsettB],
    )
    expect(rows[0]!.b).toMatchObject({ type: 'intervallregelsett', analyttkode: rows[0]!.kode, omfang: 'fagmiljo', fagmiljo_id: g.fagmiljo.B })
  })

  it('gir ingenting for noe som ikke er en ressurs', async () => {
    const { rows } = await db.query<{ b: unknown }>('select intern.ressursbeskrivelse($1) as b', [obj.kort])
    expect(rows[0]!.b).toBeNull()
  })
})

describe('hvem som behandler forslag', () => {
  it('felles fagsider: bare systemarkitektene, før redaktøransvaret finnes', async () => {
    expect(await kanBehandle(obj.fagside, 'systemarkitekt')).toBe(true)
    expect(await kanBehandle(obj.fagside, 'arkitektB')).toBe(true)
    for (const p of ['adminA', 'adminB', 'vanligA', 'dobbeltAB'] as const) expect(await kanBehandle(obj.fagside, p)).toBe(false)
  })

  it('lokalt regelsett: de lokale administratorene i fagmiljøet og systemarkitektene', async () => {
    expect(await kanBehandle(obj.regelsettA, 'adminA')).toBe(true)
    expect(await kanBehandle(obj.regelsettA, 'adminB')).toBe(false)
    expect(await kanBehandle(obj.regelsettB, 'adminB')).toBe(true)
    expect(await kanBehandle(obj.regelsettB, 'adminA')).toBe(false)
    expect(await kanBehandle(obj.regelsettA, 'vanligA')).toBe(false)
    expect(await kanBehandle(obj.regelsettA, 'systemarkitekt')).toBe(true)
  })

  it('et element er ingen ressurs, og uten aktivt medlemskap behandles ingenting', async () => {
    expect(await kanBehandle(obj.kort, 'systemarkitekt')).toBe(false)
    expect(await kanBehandle(obj.regelsettA, 'avsluttetA')).toBe(false)
  })

  it('beskjed går til dem med myndighet når ingen redaktør har ansvaret', async () => {
    expect(await behandlere(obj.fagside)).toEqual([g.id.systemarkitekt, g.id.arkitektB].sort())
    expect(await behandlere(obj.regelsettB)).toEqual([g.id.adminB, g.id.arkitektB, g.id.systemarkitekt].sort())
  })

  it('ingen av funksjonene kan kalles fra nettleseren', async () => {
    const { rows } = await db.query<{ navn: string; kan: boolean }>(
      `select p.proname as navn,
              has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') as kan
       from pg_proc p
       where p.pronamespace = 'intern'::regnamespace
         and p.proname in ('er_ressurstype', 'ressurser_for', 'tilhorer_ressurs', 'ressursbeskrivelse', 'har_ressursmyndighet',
                           'ressursens_redaktorer', 'kan_behandle_forslag', 'forslagsbehandlere')`,
    )
    expect(rows).toHaveLength(8)
    expect(rows.filter((r) => r.kan)).toEqual([])
  })
})
