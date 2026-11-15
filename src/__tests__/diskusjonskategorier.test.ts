/**
 * Diskusjonskategoriene per fagmiljø (#395 punkt 1, docs/diskusjoner.md,
 * «Rommene»). På en fortolkningsside har hvert fagmiljø sitt eget rom: like
 * navn og emojier i A og B, ingenting som røper hva det andre har, ingen tråd
 * i et annet roms kategori, og modereringen etter trådens rom. Felles sider
 * og grupper er som før. Samtidige endringer prøves på ekte Postgres i
 * `diskusjonskategorier.samtidighet.test.ts`.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, opprettMedlem, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

const SIDE = 'fortolkning:syntetisk-rom'
const FELLES = 'stoff:syntetisk-rom'
const DOK = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Innlegg' }] }] })
const UKJENT = '00000000-0000-4000-8000-00000000dead'

interface Oversikt {
  kategorier: { id: string; navn: string; emoji: string; posisjon: number }[]
  diskusjoner: { id: string; kategori_id: string | null; posisjon: number }[]
  kan_moderere: boolean
}

let db: PGlite
let g: Persongalleri

/** Første verdi i første rad, som personen. */
const kall = <T>(person: Person, sql: string, p: unknown[] = []): Promise<T> =>
  som(db, g.id[person], async (tx: Transaction) => Object.values((await tx.query<Record<string, T>>(sql, p)).rows[0] ?? {})[0] as T)

const nyKategori = (person: Person, navn: string, emoji: string, side = SIDE) =>
  kall<string>(person, 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, navn, emoji])
const nyTraad = (person: Person, kategori: string, side = SIDE) =>
  kall<string>(person, 'select public.opprett_diskusjon($1, $2, $3, $4::jsonb)', [side, kategori, 'Tråd', DOK])
const oversikt = (person: Person, side = SIDE) => kall<Oversikt>(person, 'select public.diskusjonsoversikt($1)', [side])
const feil = (f: () => Promise<unknown>) => feilFra(f).then((e) => (e ? { code: e.code, message: e.message } : null))

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
}, 180_000)

afterAll(async () => {
  await db.close()
})

describe('like kategorier i hvert sitt fagmiljø på samme fortolkningsside', () => {
  let a: string
  let b: string

  beforeAll(async () => {
    a = await nyKategori('vanligA', 'Generelt', '💬')
    await nyKategori('vanligA', 'Metode', '🧪')
    b = await nyKategori('vanligB', 'Generelt', '💬')
  })

  it('lar A og B ha samme navn og emoji', async () => {
    expect(a).not.toBe(b)
    expect((await oversikt('vanligA')).kategorier.map((k) => [k.navn, k.emoji])).toEqual([
      ['Generelt', '💬'],
      ['Metode', '🧪'],
    ])
    expect((await oversikt('vanligB')).kategorier.map((k) => [k.navn, k.emoji])).toEqual([['Generelt', '💬']])
  })

  it('gir plassene i rommet, så B ikke kan lese av sine hvor mange A har', async () => {
    expect((await oversikt('vanligB')).kategorier.map((k) => k.posisjon)).toEqual([0])
    expect((await oversikt('vanligA')).kategorier.map((k) => k.posisjon)).toEqual([0, 1])
  })

  it('stopper like navn (uansett store og små bokstaver) og emojier i samme rom, med appens melding', async () => {
    for (const person of ['vanligA', 'vanligB'] as const) {
      const navn = await feilFra(() => nyKategori(person, 'GENERELT', '🆕'))
      expect(navn?.code).toBe('23505')
      expect(navn?.message).toContain('diskusjonskategorier_navn_idx')
      const emoji = await feilFra(() => nyKategori(person, 'Annet', '💬'))
      expect(emoji?.code).toBe('23505')
      expect(emoji?.message).toContain('diskusjonskategorier_emoji_idx')
    }
  })

  it('svarer B likt om et navn A har og et ingen har', async () => {
    // A har «Metode» og 🧪; B har dem ikke. Begge kan lages i B, og
    // endres til i B, uten at svaret skiller seg fra et navn ingen har.
    expect(await feil(() => som(db, g.id.vanligB, async (tx) => {
      await tx.query('select public.opprett_diskusjonskategori($1, $2, $3)', [SIDE, 'Metode', '🧪'])
      await tx.query('select public.opprett_diskusjonskategori($1, $2, $3)', [SIDE, 'Ingen har denne', '🦉'])
      await tx.rollback()
    }))).toBeNull()
    expect(await feil(() => som(db, g.id.vanligB, async (tx) => {
      await tx.query('select public.endre_diskusjonskategori($1, $2, $3)', [b, 'Metode', '🧪'])
      await tx.rollback()
    }))).toBeNull()
  })

  it('viser hverken As kategorier eller tråder til B, heller ikke i tabellen', async () => {
    await nyTraad('vanligA', a)
    const synlige = await som(db, g.id.vanligB, async (tx) =>
      (await tx.query<{ id: string }>('select id from public.diskusjonskategorier where side = $1', [SIDE])).rows.map((r) => r.id),
    )
    expect(synlige).toEqual([b])
    expect((await oversikt('vanligB')).diskusjoner).toEqual([])
    expect(await kall('vanligB', 'select public.diskusjonstekster($1)', [SIDE])).toEqual([])
  })

  it('lar ikke B endre, flytte eller løse opp As kategori, og svarer som om den ikke fantes', async () => {
    for (const [sql, p] of [
      ['select public.endre_diskusjonskategori($1, $2, $3)', ['Nytt', '🆕']],
      ['select public.flytt_diskusjonskategori($1, $2)', [0]],
      ['select public.los_opp_diskusjonskategori($1)', []],
    ] as const) {
      const mot = async (id: string) => feil(() => kall('vanligB', sql, [id, ...p]))
      const fremmed = await mot(a)
      expect(fremmed?.code).toBe('P0002')
      expect(fremmed).toEqual(await mot(UKJENT))
    }
  })

  it('setter ikke en tråd i en kategori fra et annet rom, og svarer likt som for en ukjent kategori', async () => {
    const fremmed = await feil(() => nyTraad('vanligB', a))
    expect(fremmed?.code).toBe('23503')
    expect(fremmed).toEqual(await feil(() => nyTraad('vanligB', UKJENT)))

    const egen = await nyTraad('vanligB', b)
    const flytt = (k: string) => feil(() => kall('vanligB', 'select public.flytt_diskusjon($1, $2, 0)', [egen, k]))
    expect((await flytt(a))?.code).toBe('23503')
    expect(await flytt(a)).toEqual(await flytt(UKJENT))
  })

  it('stopper en tråd i et annet roms kategori også rett i tabellen', async () => {
    const traad = (await oversikt('vanligB')).diskusjoner[0]!.id
    const e = await feilFra(() => db.query('update public.diskusjoner set kategori_id = $1 where id = $2', [a, traad]))
    expect(e?.code).toBe('23503')
  })

  it('gir den som er med i begge, rommet i arbeidskonteksten', async () => {
    // dobbeltAB arbeider i A (primær), og ser As kategorier.
    expect((await oversikt('dobbeltAB')).kategorier.map((k) => k.id).sort()).toEqual(
      (await oversikt('vanligA')).kategorier.map((k) => k.id).sort(),
    )
    // Bs kategori kan ikke brukes til en ny tråd i A.
    expect((await feil(() => nyTraad('dobbeltAB', b)))?.code).toBe('23503')
    // En ny kategori havner i A, og kan ha samme navn som en i B.
    const ny = await nyKategori('dobbeltAB', 'Bare i A', '🅰️')
    expect(await kall('vanligA', 'select count(*)::int from public.diskusjonskategorier where id = $1', [ny])).toBe(1)
    expect(await kall('vanligB', 'select count(*)::int from public.diskusjonskategorier where id = $1', [ny])).toBe(0)

    // Bytter arbeidskonteksten til B: ser Bs rom.
    await kall('dobbeltAB', 'select public.velg_arbeidsfagmiljo($1)', [g.fagmiljo.B])
    expect((await oversikt('dobbeltAB')).kategorier.map((k) => k.id)).toEqual((await oversikt('vanligB')).kategorier.map((k) => k.id))
    await kall('dobbeltAB', 'select public.velg_arbeidsfagmiljo($1)', [g.fagmiljo.A])
  })

  it('ordner bare rommet når B flytter og løser opp, og lar As plasser stå', async () => {
    const for_ = (await oversikt('vanligA')).kategorier.map((k) => [k.id, k.posisjon])
    const c = await nyKategori('vanligB', 'Til oppløsning', '🧹')
    await kall('vanligB', 'select public.flytt_diskusjonskategori($1, 0)', [c])
    expect((await oversikt('vanligB')).kategorier.map((k) => k.posisjon)).toEqual([0, 1])
    await kall('vanligB', 'select public.los_opp_diskusjonskategori($1)', [c])
    expect((await oversikt('vanligB')).kategorier.map((k) => [k.id, k.posisjon])).toEqual([[b, 0]])
    expect((await oversikt('vanligA')).kategorier.map((k) => [k.id, k.posisjon])).toEqual(for_)
  })
})

describe('modereringen følger trådens rom', () => {
  it('lar ikke en lokal administrator i B, som også er vanlig medlem i A, moderere As tråd', async () => {
    await opprettMedlem(db, g.id.adminB, g.fagmiljo.A)
    const kategori = await nyKategori('vanligA', 'Moderering', '🛡️')
    const traadA = await nyTraad('vanligA', kategori)
    const kategoriB = (await oversikt('adminB')).kategorier[0]!.id
    const traadB = await nyTraad('vanligB', kategoriB)

    // adminB kan lese As tråd (medlem i A), men ikke moderere den.
    expect(await kall('adminB', 'select public.diskusjon_er_apen($1)', [traadA])).toBe(true)
    expect(await kall('adminB', 'select public.kan_moderere_diskusjon($1)', [traadA])).toBe(false)
    expect(await kall<{ kan_moderere: boolean }>('adminB', 'select public.diskusjonstraad($1)', [traadA])).toMatchObject({ kan_moderere: false })
    for (const sql of ['select public.skjul_i_diskusjon($1, null)', 'select public.arkiver_diskusjon($1, true)', 'select public.slett_diskusjon($1)']) {
      expect((await feil(() => kall('adminB', sql, [traadA])))?.code, sql).toBe('42501')
    }

    // I sitt eget fagmiljø modererer hen som før.
    expect(await kall('adminB', 'select public.kan_moderere_diskusjon($1)', [traadB])).toBe(true)
    expect(await feil(() => som(db, g.id.adminB, async (tx) => {
      await tx.query('select public.skjul_i_diskusjon($1, null)', [traadB])
      await tx.rollback()
    }))).toBeNull()

    // Den lokale administratoren i A modererer As tråd.
    expect(await kall('adminA', 'select public.kan_moderere_diskusjon($1)', [traadA])).toBe(true)
    // Og ingen får svar om en tråd de ikke kan lese.
    expect(await kall('adminA', 'select public.kan_moderere_diskusjon($1)', [traadB])).toBe(false)
  })
})

describe('de felles sidene er som før', () => {
  it('holder navn og emoji unike på siden, på tvers av fagmiljøene', async () => {
    const k = await nyKategori('vanligA', 'Generelt', '💬', FELLES)
    const navn = await feilFra(() => nyKategori('vanligB', 'generelt', '🆕', FELLES))
    expect(navn?.code).toBe('23505')
    expect(navn?.message).toContain('diskusjonskategorier_navn_idx')
    expect((await feilFra(() => nyKategori('vanligB', 'Annet', '💬', FELLES)))?.code).toBe('23505')

    // Begge ser kategorien og trådene i den, og kan bruke den.
    const traad = await nyTraad('vanligB', k, FELLES)
    for (const person of ['vanligA', 'vanligB', 'dobbeltAB'] as const) {
      const o = await oversikt(person, FELLES)
      expect(o.kategorier.map((x) => x.id)).toEqual([k])
      expect(o.diskusjoner.map((x) => x.id)).toEqual([traad])
    }
  })
})
