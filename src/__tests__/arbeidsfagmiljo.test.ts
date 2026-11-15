/**
 * Den som er medlem av flere fagmiljøer, velger selv hvilket hen arbeider i
 * (`public.velg_arbeidsfagmiljo`, `20261115020000_velg_arbeidsfagmiljo.sql`,
 * docs/fagmiljoer.md «Fortolkningen per fagmiljø»).
 *
 * Valget er primærmedlemskapet: det flytter fortolkningen, og ingenting annet.
 * Bare den innloggede selv, bare blant egne aktive medlemskap, og hvert bytte
 * står i tilgangsloggen med den innloggede som aktør.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
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

  it('gir ikke en systemarkitekt et fagmiljø hen ikke er medlem av', async () => {
    // Systemarkitekten ser alt, men fortolker bare der hen er medlem (P4b).
    expect((await feilFra(() => velg('systemarkitekt', 'B')))?.message).toMatch(/aktivt medlem/)
    expect(await arbeidsfagmiljo('systemarkitekt')).toBe(g.fagmiljo.A)
  })
})
