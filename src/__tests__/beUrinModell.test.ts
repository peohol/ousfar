/**
 * Modellen for benzoylekgonin i urin i databasen (#562,
 * docs/benzoylekgonin-urin.md): én per fagmiljø, bare gjennom
 * `public.les_be_urin_modell()`, og bare arbeidskontekstens.
 *
 * Migrasjonene legger ikke inn noen modell eller katalogoppføring: modulen er
 * ikke aktivert for noen. Testene legger inn den syntetiske modellen selv.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { tilBeUrinModell } from '../domain/beUrinModell'
import { SYNTETISK_MODELL } from '../domain/__tests__/hjelp/beUrinTestmodell'
import { lesAnalyttkatalog } from '../katalog/Analyttkatalogkilde'
import { lesBeUrinModell } from '../katalog/beUrinModell'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, som, type Faginnholdskall } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

const modellFor = (p: Person) => lesBeUrinModell(kall.klientFor(g.id[p]))

const leggInn = (fagmiljo: string, modell: unknown, versjon = SYNTETISK_MODELL.versjon) =>
  db.query('insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values ($1, $2, $3)', [
    fagmiljo,
    versjon,
    JSON.stringify(modell),
  ])

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
}, 120_000)

describe('etter migrasjonene', () => {
  it('finnes ingen modell og ingen oppføring: modulen er ikke aktivert', async () => {
    const { rows } = await db.query<{ modeller: number; oppforinger: number }>(`
      select (select count(*)::int from public.be_urin_modeller) as modeller,
             (select count(*)::int from public.analyttkatalog_oppforinger where type = 'be_urin') as oppforinger`)
    expect(rows[0]).toEqual({ modeller: 0, oppforinger: 0 })
    expect(await modellFor('vanligA')).toEqual({ fagmiljo: { id: g.fagmiljo.A, navn: 'OUS Klinisk farmakologi' }, modell: null })
    expect(tilBeUrinModell((await modellFor('vanligA')).modell)).toBeNull()
  })
})

describe('med en modell i OUS Klinisk farmakologi', () => {
  beforeAll(async () => {
    await leggInn(g.fagmiljo.A, SYNTETISK_MODELL)
  })

  it('får alle med A som arbeidskontekst nøyaktig den, med alle sifrene', async () => {
    for (const p of ['vanligA', 'adminA', 'systemarkitekt', 'dobbeltAB'] as const) {
      const svar = await modellFor(p)
      expect(svar.modell, p).toEqual(SYNTETISK_MODELL)
      expect(tilBeUrinModell(svar.modell)?.ok, p).toBe(true)
    }
  })

  it.each(['vanligB', 'adminB', 'arkitektB', 'avsluttetA'] as const)('får %s i B ingen modell, ikke A sin', async (p) => {
    expect(await modellFor(p)).toEqual({ fagmiljo: { id: g.fagmiljo.B, navn: expect.any(String) }, modell: null })
  })

  it('stopper den som ikke har et aktivt medlemskap', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => modellFor(p)))?.message, p).toMatch(/ikke lenger et aktivt medlemskap/)
    }
  })

  it('lar ikke tabellen leses direkte, eller et annet fagmiljø bes om', async () => {
    for (const p of ['systemarkitekt', 'vanligA', 'vanligB'] as const) {
      const feil = await feilFra(() => som(db, g.id[p], (tx) => tx.query('select * from public.be_urin_modeller')))
      expect(feil?.code, p).toBe('42501')
    }
    const feil = await feilFra(() =>
      som(db, g.id.vanligB, (tx) => tx.query('select public.les_be_urin_modell($1::uuid)', [g.fagmiljo.A])),
    )
    expect(feil?.code).toBe('42883')
  })

  it('tar bare imot én modell per fagmiljø og bare med formen', async () => {
    expect((await feilFra(() => leggInn(g.fagmiljo.A, SYNTETISK_MODELL)))?.code).toBe('23505')
    expect((await feilFra(() => leggInn(g.fagmiljo.B, { versjon: 'x' }, 'x')))?.code).toBe('23514')
    expect((await feilFra(() => leggInn(g.fagmiljo.B, SYNTETISK_MODELL, 'annen versjon')))?.code).toBe('23514')
  })
})

describe('oppføringstypen i katalogen', () => {
  it('godtar en oppføring for modulen, bare i sitt fagmiljø', async () => {
    await db.query(
      `insert into public.analyttkatalog_oppforinger
         (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade, aliaser)
       values ($1, 'be-urin-test', 100000, 'be_urin', 'Benzoylekgonin', 'Benzoylekgonin i urin', 'Rusmiddelanalyse',
               'UCAK', '{"tekst":"","deler":[]}', '{kokain}')`,
      [g.fagmiljo.A],
    )
    await db.query(
      `insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn)
       values ($1, 'be-urin-test', 0, 'TESTBEU', 'Benzoylekgonin')`,
      [g.fagmiljo.A],
    )
    try {
      const a = await lesAnalyttkatalog(kall.klientFor(g.id.vanligA))
      expect(a.modulMedId('be-urin-test')?.modul?.type).toBe('be_urin')
      const b = await lesAnalyttkatalog(kall.klientFor(g.id.vanligB))
      expect(b.modulMedId('be-urin-test')).toBeUndefined()
    } finally {
      await db.query(`delete from public.analyttkatalog_oppforinger where nokkel = 'be-urin-test'`)
    }
  })

  it('avviser en ukjent type', async () => {
    const feil = await feilFra(() =>
      db.query(
        `insert into public.analyttkatalog_oppforinger
           (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade)
         values ($1, 'ukjent-test', 100001, 'ukjent', 'X', 'X', 'X', 'UCAK', '{"tekst":"","deler":[]}')`,
        [g.fagmiljo.A],
      ),
    )
    expect(feil?.code).toBe('23514')
  })
})
