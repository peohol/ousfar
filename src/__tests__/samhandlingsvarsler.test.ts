/**
 * Varslene per fagmiljø (P2b): et varsel går bare til dem som kan lese det
 * det gjelder, og forsvinner fra lista når medlemskapet i fagmiljøet det
 * hører til, er avsluttet. Prøvd med persongalleriet mot en database bygd av
 * migrasjonene, og tilbakefyllingen mot varsler som fantes før migrasjonen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  FAGMILJOER,
  avsluttMedlemskap,
  byggPersongalleri,
  fagmiljoId,
  leggInnTestdata,
  opprettMedlem,
  type Person,
  type Persongalleri,
  type Testdata,
} from './hjelp/persongalleri'
import { faginnholdskall, kjorMigrasjoner, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const MIGRASJONEN = '20261114121000'
const DOK = JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hei' }] }] })

interface Varselrad {
  mottaker_id: string
  kategori: string
  gruppe: string
  fagmiljo_id: string | null
}

/** Varslene i tabellen, forbi radsikkerheten, slik databasen selv ser dem. */
async function alleVarsler(db: PGlite, kategori: string): Promise<Varselrad[]> {
  const { rows } = await db.query<Varselrad>(
    'select mottaker_id, kategori::text, gruppe, fagmiljo_id from public.varsler where kategori = $1::public.varselkategori',
    [kategori],
  )
  return rows
}

const kommenter = (db: PGlite, bruker: string, diskusjon: string) =>
  som(db, bruker, (tx) => tx.query('insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, $2)', [diskusjon, DOK]))

describe('varslene per fagmiljø', () => {
  let db: PGlite
  let galleri: Persongalleri
  let data: Testdata

  const mottakere = async (kategori: string) => {
    const navn = new Map(Object.entries(galleri.id).map(([p, id]) => [id, p as Person]))
    return [...new Set((await alleVarsler(db, kategori)).map((v) => navn.get(v.mottaker_id)).filter(Boolean))].sort()
  }
  /** Det appen viser den innloggede: `mine_varsler` og tellingen av uleste. */
  const synlige = (bruker: string, kategori: string) =>
    som(db, bruker, async (tx) => {
      const { rows } = await tx.query<{ v: { varsler: { kategori: string }[] }; u: Record<string, number> }>(
        'select public.mine_varsler() as v, public.uleste_varsler() as u',
      )
      return { liste: rows[0]!.v.varsler.filter((v) => v.kategori === kategori).length, uleste: rows[0]!.u[kategori] ?? 0 }
    })

  beforeAll(async () => {
    db = await nyDatabase()
    galleri = await byggPersongalleri(db)
    // Administratoren i A publiserer en kommentar i fortolkningen, og en
    // vanlig bruker i A legger inn en idé og to tråder.
    data = await leggInnTestdata(db, galleri)
  }, 120_000)

  it('varsler om fortolkningen bare medlemmene i fagmiljøet den hører til', async () => {
    expect(await mottakere('fortolkning')).toEqual(['dobbeltAB', 'systemarkitekt', 'vanligA'])
    for (const v of await alleVarsler(db, 'fortolkning')) {
      expect(v).toMatchObject({ fagmiljo_id: galleri.fagmiljo.A, gruppe: `fortolkning:${galleri.fagmiljo.A}` })
    }
  })

  it('varsler om en idé alle med et aktivt medlemskap, men ingen uten', async () => {
    expect(await mottakere('nye_ideer')).toEqual(
      ['adminA', 'adminB', 'avsluttetA', 'dobbeltAB', 'systemarkitekt', 'vanligB'].sort(),
    )
    expect((await alleVarsler(db, 'nye_ideer')).every((v) => v.fagmiljo_id === null)).toBe(true)
  })

  it('gir et varsel om en tråd rekkevidden til tråden', async () => {
    await kommenter(db, galleri.id.dobbeltAB, data.fortolkningstraad)
    await kommenter(db, galleri.id.vanligB, data.fagsidetraad)
    const egne = (await alleVarsler(db, 'mine_diskusjoner')).filter((v) => v.mottaker_id === galleri.id.vanligA)
    expect(egne.map((v) => v.fagmiljo_id).sort()).toEqual([galleri.fagmiljo.A, null].sort())
  })

  it('skjuler varslene fra et fagmiljø når medlemskapet der er avsluttet, og lar dem fra andre stå', async () => {
    // Primærmedlem i B, og også aktiv i A.
    const ny = await opprettBruker(db, { brukernavn: 'test.flytter', fornavn: 'Test', etternavn: 'Flytter', rolle: 'user' })
    await opprettMedlem(db, ny, galleri.fagmiljo.B, { primaer: true })
    await opprettMedlem(db, ny, galleri.fagmiljo.A)
    const kall = faginnholdskall(db, galleri.id.adminA)
    const tekst = await kall.opprett('kommentar', { navn: 'Varseltest', tekst: 'Syntetisk.', plassholdere: [] })
    await kall.publiser(tekst.id, 1)
    await som(db, galleri.id.vanligB, (tx) => tx.query('insert into public.ideer (kategori, tittel) values ($1, $2)', ['fag', 'Felles idé']))
    expect(await synlige(ny, 'fortolkning')).toEqual({ liste: 1, uleste: 1 })
    expect(await synlige(ny, 'nye_ideer')).toEqual({ liste: 1, uleste: 1 })

    await avsluttMedlemskap(db, ny, galleri.fagmiljo.A)
    expect(await synlige(ny, 'fortolkning')).toEqual({ liste: 0, uleste: 0 })
    expect(await synlige(ny, 'nye_ideer')).toEqual({ liste: 1, uleste: 1 })
    // Heller ikke rett fra tabellen, eller ved å merke det lest.
    const direkte = await som(db, ny, async (tx) => {
      const { rows } = await tx.query<{ n: number }>(
        `select count(*)::int as n from public.varsler where kategori = 'fortolkning'`,
      )
      return rows[0]!.n
    })
    expect(direkte).toBe(0)
    // Og nye varsler fra fortolkningen kommer ikke.
    const enTil = await kall.opprett('kommentar', { navn: 'Varseltest 2', tekst: 'Syntetisk.', plassholdere: [] })
    await kall.publiser(enTil.id, 1)
    expect((await alleVarsler(db, 'fortolkning')).filter((v) => v.mottaker_id === ny)).toHaveLength(1)
  })
})

describe('tilbakefyllingen av varslene', () => {
  it('gir varslene som fantes, fagmiljøet det de gjelder hører til, og fortolkningen en gruppe per fagmiljø', async () => {
    const db = await nyDatabase({ til: MIGRASJONEN })
    const a = await fagmiljoId(db, FAGMILJOER.A)
    const admin = await opprettBruker(db, { brukernavn: 'test.admin', fornavn: 'Test', etternavn: 'Admin', rolle: 'admin' })
    const ola = await opprettBruker(db, { brukernavn: 'test.ola', fornavn: 'Test', etternavn: 'Ola', rolle: 'user' })
    const kari = await opprettBruker(db, { brukernavn: 'test.kari', fornavn: 'Test', etternavn: 'Kari', rolle: 'user' })

    // Varsler om fortolkningen (Ola og Kari), et om et objekt som er slettet
    // siden (til administratoren, som publiserte og ikke fikk noe), og et om
    // en tråd i fortolkningen.
    const kall = faginnholdskall(db, admin)
    const tekst = await kall.opprett('kommentar', { navn: 'Gammel', tekst: 'Syntetisk.', plassholdere: [] })
    await kall.publiser(tekst.id, 1)
    await db.query(
      `insert into public.varsler (mottaker_id, kategori, gruppe, hendelser)
       values ($1, 'fortolkning', 'fortolkning', jsonb_build_array(jsonb_build_object('kl', now(), 'av', null, 'objekt', gen_random_uuid())))`,
      [admin],
    )
    const traad = await som(db, ola, async (tx) => {
      const side = 'fortolkning:syntetisk-analytt'
      const kategori = (await tx.query<{ id: string }>(`select public.opprett_diskusjonskategori($1, 'Gammel', '🗂️') as id`, [side])).rows[0]!.id
      const { rows } = await tx.query<{ id: string }>('select public.opprett_diskusjon($1, $2, $3, $4) as id', [side, kategori, 'Gammel tråd', DOK])
      return rows[0]!.id
    })
    await kommenter(db, kari, traad)
    await som(db, ola, (tx) => tx.query(`insert into public.ideer (kategori, tittel) values ('fag', 'Gammel idé')`))

    await kjorMigrasjoner(db, { fra: MIGRASJONEN })
    const { rows } = await db.query<Varselrad>(
      'select mottaker_id, kategori::text, gruppe, fagmiljo_id from public.varsler order by kategori, mottaker_id',
    )
    const fortolkning = rows.filter((r) => r.kategori === 'fortolkning')
    expect(fortolkning.length).toBeGreaterThanOrEqual(3)
    for (const r of fortolkning) expect(r).toMatchObject({ fagmiljo_id: a, gruppe: `fortolkning:${a}` })
    expect(rows.find((r) => r.kategori === 'mine_diskusjoner')).toMatchObject({ mottaker_id: ola, fagmiljo_id: a })
    expect(rows.filter((r) => r.kategori === 'nye_ideer').every((r) => r.fagmiljo_id === null)).toBe(true)
  }, 120_000)
})
