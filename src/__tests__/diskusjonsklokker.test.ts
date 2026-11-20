/**
 * Dørklokken for diskusjonene i sanntid (#517, docs/diskusjoner.md,
 * «Sanntiden»): én rad per rom, uten tekst og avsender, som ringer ved hver
 * endring i rommet og sier hvilken tråd den gjaldt — og bare for dem som ser
 * diskusjonene i rommet. Mot en ekte database bygd av migrasjonene, som
 * nettleseren kaller den.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

const DOK = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Innlegg' }] }] })

interface Klokke {
  fagmiljo_id: string | null
  siste_endring: number
  diskusjon_id: string | null
}

let db: PGlite
let g: Persongalleri
let sideteller = 0

const rader = <T>(person: Person, sql: string, p: unknown[] = []) => som(db, g.id[person], async (tx) => (await tx.query<T>(sql, p)).rows)
const verdi = async <T>(person: Person, sql: string, p: unknown[] = []) =>
  Object.values((await rader<Record<string, T>>(person, sql, p))[0] ?? {})[0] as T

const nySide = (type = 'stoff') => `${type}:klokke-${++sideteller}`
const nyKategori = (person: Person, side: string, navn = 'Generelt', emoji = '💬') =>
  verdi<string>(person, 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, navn, emoji])
const nyTraad = (person: Person, side: string, kategori: string) =>
  verdi<string>(person, 'select public.opprett_diskusjon($1, $2, $3, $4::jsonb)', [side, kategori, 'Tråd', DOK])
const kommenter = (person: Person, traad: string) =>
  verdi<string>(person, 'insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, $2::jsonb) returning id', [traad, DOK])

/** Dørklokkene personen ser på siden, med tellerne som tall. */
const klokker = async (person: Person, side: string) =>
  (
    await rader<Klokke>(
      person,
      'select fagmiljo_id, siste_endring, diskusjon_id from public.diskusjonsklokker where side = $1 order by fagmiljo_id nulls first',
      [side],
    )
  ).map((k) => ({ ...k, siste_endring: Number(k.siste_endring) }))
const klokke = async (person: Person, side: string) => (await klokker(person, side))[0] ?? null

/** Gjør handlingen og gir det dørklokken på siden sier etterpå; telleren skal ha økt. */
async function ringer(side: string, handling: () => Promise<unknown>) {
  const for_ = (await klokke('vanligA', side))?.siste_endring ?? 0
  await handling()
  const etter = await klokke('vanligA', side)
  expect(etter?.siste_endring ?? 0).toBeGreaterThan(for_)
  return { fagmiljo_id: etter!.fagmiljo_id, diskusjon_id: etter!.diskusjon_id }
}

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
}, 180_000)

afterAll(async () => {
  await db.close()
})

describe('dørklokken', () => {
  it('har ingen tekst, overskrift eller avsender', async () => {
    const kolonner = (
      await db.query<{ column_name: string }>(
        `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'diskusjonsklokker' order by ordinal_position`,
      )
    ).rows.map((r) => r.column_name)
    expect(kolonner).toEqual(['id', 'side', 'fagmiljo_id', 'omfang', 'gruppe_id', 'siste_endring', 'diskusjon_id', 'endret_kl'])
  })

  it('ringer for kategorien, tråden, kommentarene og hjertene, og sier hvilken tråd', async () => {
    const side = nySide()
    expect(await klokke('vanligA', side)).toBeNull()
    let kategori = ''
    expect(await ringer(side, async () => (kategori = await nyKategori('vanligA', side)))).toEqual({ fagmiljo_id: null, diskusjon_id: null })

    let traad = ''
    expect(await ringer(side, async () => (traad = await nyTraad('vanligA', side, kategori)))).toEqual({ fagmiljo_id: null, diskusjon_id: traad })
    let kommentar = ''
    for (const handling of [
      async () => (kommentar = await kommenter('vanligB', traad)),
      () => rader('vanligB', 'update public.diskusjonskommentarer set tekst = $2::jsonb where id = $1', [kommentar, DOK]),
      () => rader('vanligA', 'insert into public.diskusjonshjerter (diskusjon_id) values ($1)', [traad]),
      () => rader('vanligA', 'delete from public.diskusjonshjerter where diskusjon_id = $1', [traad]),
      () => rader('vanligB', 'delete from public.diskusjonskommentarer where id = $1', [kommentar]),
      () => verdi('vanligA', 'select public.sett_diskusjonstittel($1, $2)', [traad, 'Ny overskrift']),
      () => verdi('vanligA', 'select public.arkiver_diskusjon($1, true)', [traad]),
    ]) {
      expect(await ringer(side, handling)).toEqual({ fagmiljo_id: null, diskusjon_id: traad })
    }
  })

  it('ringer med tråden null når en setning endrer flere tråder, og med tråden når den slettes', async () => {
    const side = nySide()
    const a = await nyKategori('vanligA', side, 'A', '🍎')
    const t1 = await nyTraad('vanligA', side, a)
    await nyTraad('vanligA', side, a)
    // Én setning over begge trådene (som når kategorien løses opp og trådene mister den).
    expect(await ringer(side, () => db.query('update public.diskusjoner set posisjon = posisjon where side = $1', [side]))).toMatchObject({
      diskusjon_id: null,
    })
    expect(await ringer(side, () => verdi('vanligA', 'select public.los_opp_diskusjonskategori($1)', [a]))).toBeTruthy()
    // Slettingen ringer med tråden (`slett_diskusjon` ordner de andre etterpå, og ringer igjen for dem).
    expect(await ringer(side, () => db.query('delete from public.diskusjoner where id = $1', [t1]))).toMatchObject({ diskusjon_id: t1 })
  })

  it('ringer i begge rommene når en tråd flyttes til en annen side', async () => {
    const fra = nySide()
    const til = nySide()
    const traad = await nyTraad('vanligA', fra, await nyKategori('vanligA', fra))
    const tilKategori = await nyKategori('vanligA', til)
    const forFra = (await klokke('vanligA', fra))!.siste_endring

    expect(await ringer(til, () => verdi('vanligA', 'select public.flytt_diskusjon_til_side($1, $2, $3)', [traad, til, tilKategori]))).toMatchObject({
      diskusjon_id: traad,
    })
    expect((await klokke('vanligA', fra))!.siste_endring).toBeGreaterThan(forFra)
    expect(await klokke('vanligA', fra)).toMatchObject({ diskusjon_id: traad })
  })

  it('kan ikke skrives fra nettleseren', async () => {
    const side = nySide()
    await nyKategori('vanligA', side)
    const for_ = await klokke('vanligA', side)
    for (const sql of [
      `insert into public.diskusjonsklokker (side, omfang) values ('${nySide()}', 'felles')`,
      `update public.diskusjonsklokker set siste_endring = 99 where side = '${side}'`,
      `delete from public.diskusjonsklokker where side = '${side}'`,
    ]) {
      expect((await feilFra(() => rader('systemarkitekt', sql)))?.code, sql).toBe('42501')
    }
    expect(await klokke('vanligA', side)).toEqual(for_)
  })
})

describe('hvem som hører dørklokken', () => {
  it('en felles side: alle med et aktivt medlemskap, ingen uten', async () => {
    const side = nySide()
    await nyKategori('vanligA', side)
    for (const p of ['vanligA', 'vanligB', 'adminB', 'avsluttetA', 'systemarkitekt'] as const) expect(await klokker(p, side), p).toHaveLength(1)
    expect(await klokker('utenMedlemskap', side)).toEqual([])
  })

  it('en fortolkningsside: hvert fagmiljø bare sitt eget rom', async () => {
    const side = nySide('fortolkning')
    await nyKategori('vanligA', side)
    await nyKategori('vanligB', side)
    expect(await klokker('vanligA', side)).toEqual([expect.objectContaining({ fagmiljo_id: g.fagmiljo.A })])
    expect(await klokker('vanligB', side)).toEqual([expect.objectContaining({ fagmiljo_id: g.fagmiljo.B })])
    expect(await klokker('dobbeltAB', side)).toHaveLength(2)
    // Medlemskapet i A er avsluttet: bare rommet i B.
    expect(await klokker('avsluttetA', side)).toEqual([expect.objectContaining({ fagmiljo_id: g.fagmiljo.B })])
    expect(await klokker('utenMedlemskap', side)).toEqual([])
  })

  it('en gruppe: bare de som er med i gruppen nå, og systemarkitektene', async () => {
    const gruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['Klokkegruppen', 'Syntetisk', g.fagmiljo.A])
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [gruppe, 'test.vanliga'])
    await verdi('vanligA', 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe])
    const side = `gruppe:${gruppe}`
    await nyTraad('vanligA', side, await nyKategori('vanligA', side))

    for (const p of ['adminA', 'vanligA', 'systemarkitekt'] as const) expect(await klokker(p, side), p).toHaveLength(1)
    for (const p of ['vanligB', 'dobbeltAB', 'adminB'] as const) expect(await klokker(p, side), p).toEqual([])

    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [gruppe, g.id.vanligA])
    expect(await klokker('vanligA', side)).toEqual([])
  })
})
