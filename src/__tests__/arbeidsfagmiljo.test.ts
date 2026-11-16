/**
 * Den som er medlem av flere fagmiljøer, velger selv hvilket hen arbeider i
 * (`public.velg_arbeidsfagmiljo`, `20261115020000_velg_arbeidsfagmiljo.sql`,
 * docs/fagmiljoer.md «Fortolkningen per fagmiljø»).
 *
 * Valget er primærmedlemskapet: det flytter fortolkningen, og ingenting annet.
 * Bare den innloggede selv, bare blant egne aktive medlemskap, og hvert bytte
 * står i tilgangsloggen med den innloggede som aktør. En systemarkitekt kan i
 * tillegg se fortolkningen i et hvilket som helst aktivt fagmiljø, uten å bli
 * medlem (`20261116100000_arkitektens_visningsfagmiljo.sql`).
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, gjorTilSystemarkitekt, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

const velg = (person: Person, f: Fagmiljo | string) =>
  som(db, g.id[person], async (tx) => {
    const fagmiljo = f === 'A' || f === 'B' ? g.fagmiljo[f] : f
    const { rows } = await tx.query<{ r: { arbeidsfagmiljo: { id: string } | null } }>(
      'select public.velg_arbeidsfagmiljo($1) as r',
      [fagmiljo],
    )
    return rows[0]!.r
  })

const forste = <T>(person: Person, sql: string) =>
  som(db, g.id[person], async (tx) => Object.values((await tx.query<Record<string, T>>(sql)).rows[0]!)[0] as T)

const arbeidsfagmiljo = (person: Person) => forste<string | null>(person, 'select public.mitt_arbeidsfagmiljo()')
const lesbare = (person: Person) =>
  forste<string[]>(person, 'select array(select unnest(public.mine_lesbare_fagmiljoer()) order by 1)')

async function byttelogg(person: Person) {
  const { rows } = await db.query<{ aktor: string; grunn: string; fagmiljo_id: string; primaer: boolean }>(
    `select aktor, grunn, fagmiljo_id, (etter ->> 'primaer')::boolean as primaer from public.tilgangslogg
     where handling = 'medlemskap.update' and bruker_id = $1 order by id`,
    [g.id[person]],
  )
  return rows
}

describe('velg_arbeidsfagmiljo', () => {
  it('lar den som er med i to fagmiljøer, flytte fortolkningen mellom dem og tilbake', async () => {
    const lesbareFor = await lesbare('dobbeltAB')
    expect(await arbeidsfagmiljo('dobbeltAB')).toBe(g.fagmiljo.A)

    const svar = await velg('dobbeltAB', 'B')
    expect(svar.arbeidsfagmiljo?.id).toBe(g.fagmiljo.B)
    expect(await arbeidsfagmiljo('dobbeltAB')).toBe(g.fagmiljo.B)
    // Lesingen følger alle aktive medlemskap som før; bare fortolkningen flyttes.
    expect(await lesbare('dobbeltAB')).toEqual(lesbareFor)

    // Hvert bytte står i loggen med personen selv som aktør og en begrunnelse.
    const logg = await byttelogg('dobbeltAB')
    expect(logg).toHaveLength(2)
    for (const rad of logg) {
      expect(rad.aktor).toBe(g.id.dobbeltAB)
      expect(rad.grunn).toBe('Arbeidsfagmiljø valgt av brukeren selv')
    }
    expect(logg.map((r) => [r.fagmiljo_id, r.primaer])).toEqual(
      expect.arrayContaining([
        [g.fagmiljo.A, false],
        [g.fagmiljo.B, true],
      ]),
    )

    // Det samme valget igjen endrer ingenting.
    await velg('dobbeltAB', 'B')
    expect(await byttelogg('dobbeltAB')).toHaveLength(2)

    await velg('dobbeltAB', 'A')
    expect(await arbeidsfagmiljo('dobbeltAB')).toBe(g.fagmiljo.A)
    expect(await byttelogg('dobbeltAB')).toHaveLength(4)
  })

  it('lar ingen velge et fagmiljø de ikke er aktivt medlem av', async () => {
    for (const [person, f] of [
      ['vanligA', 'B'],
      ['vanligB', 'A'],
      // Medlemskapet i A er avsluttet.
      ['avsluttetA', 'A'],
      ['adminA', 'B'],
    ] as const) {
      const for_ = await arbeidsfagmiljo(person)
      expect((await feilFra(() => velg(person, f)))?.message, `${person} → ${f}`).toMatch(/bare arbeide i et fagmiljø du er aktivt medlem av/)
      expect(await arbeidsfagmiljo(person), person).toBe(for_)
    }
    // Heller ikke et fagmiljø som ikke finnes.
    expect((await feilFra(() => velg('vanligA', '00000000-0000-4000-8000-000000000000')))?.code).toBe('42501')
  })

  it('stopper den uten aktivt medlemskap og den som ikke er innlogget', async () => {
    for (const person of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => velg(person, 'A')))?.code, person).toBe('42501')
    }
    const anonym = await feilFra(() => som(db, null, (tx) => tx.query('select public.velg_arbeidsfagmiljo($1)', [g.fagmiljo.A])))
    expect(anonym?.code).toBe('42501')
  })

  describe('en systemarkitekt', () => {
    const medlemskapene = async (person: Person) =>
      (
        await db.query<{ fagmiljo_id: string; status: string; primaer: boolean }>(
          'select fagmiljo_id, status, primaer from public.medlemskap where bruker_id = $1 order by fagmiljo_id',
          [g.id[person]],
        )
      ).rows
    const loggrader = async (person: Person) =>
      (await db.query<{ n: number }>('select count(*)::int as n from public.tilgangslogg where bruker_id = $1', [g.id[person]])).rows[0]!.n
    const rettigheter = (person: Person) =>
      forste<{ arbeidsfagmiljo: { id: string } | null; mine_fagmiljoer: { id: string }[]; velgbare_fagmiljoer: { id: string }[] }>(
        person,
        'select public.mine_rettigheter()',
      )

    it('ser fortolkningen i et fagmiljø hen ikke er medlem av, uten å bli medlem', async () => {
      // Som maxhag: medlem og lokal administrator bare i B.
      const medlemskapFor = await medlemskapene('arkitektB')
      const loggFor = await loggrader('arkitektB')
      const lesbareFor = await lesbare('arkitektB')
      expect(await arbeidsfagmiljo('arkitektB')).toBe(g.fagmiljo.B)

      const svar = await velg('arkitektB', 'A')
      expect(svar.arbeidsfagmiljo?.id).toBe(g.fagmiljo.A)
      expect(await arbeidsfagmiljo('arkitektB')).toBe(g.fagmiljo.A)
      // Medlemskapene, tilgangsloggen og lesingen er som før.
      expect(await medlemskapene('arkitektB')).toEqual(medlemskapFor)
      expect(await loggrader('arkitektB')).toBe(loggFor)
      expect(await lesbare('arkitektB')).toEqual(lesbareFor)
      expect(await rettigheter('arkitektB')).toMatchObject({
        arbeidsfagmiljo: { id: g.fagmiljo.A },
        mine_fagmiljoer: [{ id: g.fagmiljo.B }],
      })

      // Tilbake til sitt eget fagmiljø fjerner visningsvalget.
      expect((await velg('arkitektB', 'B')).arbeidsfagmiljo?.id).toBe(g.fagmiljo.B)
      expect(await medlemskapene('arkitektB')).toEqual(medlemskapFor)
      const { rows } = await db.query('select 1 from public.visningsfagmiljoer where bruker_id = $1', [g.id.arkitektB])
      expect(rows).toHaveLength(0)
    })

    it('får alle de aktive fagmiljøene å velge blant; de andre bare sine egne', async () => {
      const aktive = (await db.query<{ id: string }>(`select id from public.fagmiljoer where status = 'aktiv' order by navn`)).rows
      for (const person of ['systemarkitekt', 'arkitektB'] as const) {
        expect((await rettigheter(person)).velgbare_fagmiljoer.map((f) => f.id), person).toEqual(aktive.map((f) => f.id))
      }
      for (const person of ['vanligA', 'adminB', 'dobbeltAB'] as const) {
        const r = await rettigheter(person)
        expect(r.velgbare_fagmiljoer, person).toEqual(r.mine_fagmiljoer)
      }
    })

    it('mister visningsvalget når hen ikke lenger er systemarkitekt', async () => {
      await velg('arkitektB', 'A')
      expect(await arbeidsfagmiljo('arkitektB')).toBe(g.fagmiljo.A)
      await db.exec(`
        begin;
        select set_config('ousfar.tilgangsgrunn', 'Test: systemrollen tilbakekalles', true);
        update public.systemroller set tilbakekalt_kl = now() where bruker_id = '${g.id.arkitektB}' and tilbakekalt_kl is null;
        commit;`)
      try {
        // Tilbake til primærmedlemskapet, og A kan ikke velges igjen.
        expect(await arbeidsfagmiljo('arkitektB')).toBe(g.fagmiljo.B)
        expect((await feilFra(() => velg('arkitektB', 'A')))?.code).toBe('42501')
      } finally {
        await gjorTilSystemarkitekt(db, g.id.arkitektB)
        await velg('arkitektB', 'B')
      }
    })

    it('kan ikke lese eller skrive visningsvalgene direkte', async () => {
      for (const sql of [
        'select * from public.visningsfagmiljoer',
        `insert into public.visningsfagmiljoer (bruker_id, fagmiljo_id) values ('${g.id.vanligA}', '${g.fagmiljo.B}')`,
      ]) {
        for (const person of ['vanligA', 'systemarkitekt'] as const) {
          expect((await feilFra(() => som(db, g.id[person], (tx) => tx.query(sql))))?.code, `${person}: ${sql}`).toBe('42501')
        }
      }
    })
  })

  // Sist, fordi den arkiverer B for resten av fila.
  it('lar den som arbeidet i et fagmiljø som er arkivert, velge et av de andre', async () => {
    await velg('dobbeltAB', 'B')
    // En systemarkitekt som så på B, er tilbake i sitt eget når B arkiveres.
    await velg('systemarkitekt', 'B')
    expect(await arbeidsfagmiljo('systemarkitekt')).toBe(g.fagmiljo.B)
    await db.exec(`
      begin;
      select set_config('ousfar.tilgangsgrunn', 'Test: B arkiveres', true);
      update public.fagmiljoer set status = 'arkivert' where id = '${g.fagmiljo.B}';
      commit;`)
    const rettigheter = () =>
      forste<{ arbeidsfagmiljo: { id: string } | null; mine_fagmiljoer: { id: string }[] }>(
        'dobbeltAB',
        'select public.mine_rettigheter()',
      )
    // Uten arbeidsfagmiljø, men med A å velge (appen viser da valget, `kanVelgeArbeidsfagmiljo`).
    expect(await rettigheter()).toMatchObject({ arbeidsfagmiljo: null, mine_fagmiljoer: [{ id: g.fagmiljo.A }] })
    // Det arkiverte kan ikke velges igjen.
    expect((await feilFra(() => velg('dobbeltAB', 'B')))?.code).toBe('42501')
    expect((await velg('dobbeltAB', 'A')).arbeidsfagmiljo?.id).toBe(g.fagmiljo.A)
    expect(await arbeidsfagmiljo('dobbeltAB')).toBe(g.fagmiljo.A)
    expect(await arbeidsfagmiljo('systemarkitekt')).toBe(g.fagmiljo.A)
    expect((await feilFra(() => velg('systemarkitekt', 'B')))?.code).toBe('42501')
  })
})
