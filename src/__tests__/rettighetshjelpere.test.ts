/**
 * De felles hjelperne for tilgang per fagmiljø (P2a–d,
 * `supabase/migrations/20261114113500_rettighetshjelpere.sql`,
 * docs/fagmiljoer.md «Hjelperne for tilgang per fagmiljø»), prøvd for hver
 * person i persongalleriet mot begge fagmiljøene.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, opprettFagmiljo, PERSONER, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import { nyDatabase, som } from './hjelp/testdatabase'

let db: PGlite
let galleri: Persongalleri

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

const PERSONLISTE = Object.keys(PERSONER) as Person[]

/** Fagmiljøene personen er aktivt medlem av etter definisjonen i galleriet, eller begge for en systemarkitekt. */
function medlemI(p: Person): Fagmiljo[] {
  const def = PERSONER[p] as (typeof PERSONER)[Person] & { systemarkitekt?: boolean; ogsaAktivI?: readonly Fagmiljo[] }
  if (def.systemarkitekt) return ['A', 'B']
  return [...(def.primaer ? [def.primaer] : []), ...(def.ogsaAktivI ?? [])].sort()
}

/** Fagmiljøene personen administrerer, eller begge for en systemarkitekt. */
function adminI(p: Person): Fagmiljo[] {
  const def = PERSONER[p] as (typeof PERSONER)[Person] & { systemarkitekt?: boolean; lokalAdminI?: readonly Fagmiljo[] }
  if (def.systemarkitekt) return ['A', 'B']
  return [...(def.lokalAdminI ?? [])]
}

const svar = async (sql: string, parametre: unknown[]): Promise<unknown> =>
  Object.values((await db.query<Record<string, unknown>>(sql, parametre)).rows[0]!)[0]

describe('intern.er_medlem_i og intern.er_lokal_admin_i', () => {
  it('svarer etter aktive medlemskap og tildelinger, med systemarkitekten overalt', async () => {
    for (const p of PERSONLISTE) {
      for (const f of ['A', 'B'] as const) {
        const args = [galleri.fagmiljo[f], galleri.id[p]]
        expect(await svar('select intern.er_medlem_i($1, $2)', args), `${p} medlem i ${f}`).toBe(medlemI(p).includes(f))
        expect(await svar('select intern.er_lokal_admin_i($1, $2)', args), `${p} admin i ${f}`).toBe(adminI(p).includes(f))
      }
    }
  })

  it('bruker den innloggede når brukeren ikke er oppgitt, og gir nei uten fagmiljø eller bruker', async () => {
    const { adminA, vanligB } = galleri.id
    const sporsmal = `select intern.er_medlem_i($1) as m, intern.er_lokal_admin_i($1) as a`
    // Kallet gjøres som superbruker med JWT-kravene satt, siden `intern` ikke kan kalles fra nettleseren.
    const somInnlogget = (bruker: string, fagmiljo: string) =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: bruker, role: 'authenticated' })])
        return (await tx.query<{ m: boolean; a: boolean }>(sporsmal, [fagmiljo])).rows[0]!
      })
    expect(await somInnlogget(adminA, galleri.fagmiljo.A)).toEqual({ m: true, a: true })
    expect(await somInnlogget(adminA, galleri.fagmiljo.B)).toEqual({ m: false, a: false })
    expect(await somInnlogget(vanligB, galleri.fagmiljo.B)).toEqual({ m: true, a: false })
    expect(await svar('select intern.er_medlem_i(null, $1)', [adminA])).toBe(false)
    expect(await svar('select intern.er_medlem_i($1, null)', [galleri.fagmiljo.A])).toBe(false)
    expect(await svar('select intern.er_lokal_admin_i(null, $1)', [adminA])).toBe(false)
    expect(await svar('select intern.er_lokal_admin_i($1)', [galleri.fagmiljo.A])).toBe(false)
  })

  it('teller ikke den gamle adminrollen alene', async () => {
    // tidligereAdmin har rollen, men ingen aktive medlemskap eller tildelinger.
    for (const f of ['A', 'B'] as const) {
      const args = [galleri.fagmiljo[f], galleri.id.tidligereAdmin]
      expect(await svar('select intern.er_lokal_admin_i($1, $2)', args)).toBe(false)
      expect(await svar('select intern.er_medlem_i($1, $2)', args)).toBe(false)
    }
  })
})

describe('intern.kan_lese_omfang', () => {
  it('gir felles til alle med aktivt medlemskap og et fagmiljø bare til medlemmene', async () => {
    for (const p of PERSONLISTE) {
      const aktiv = medlemI(p).length > 0
      expect(await svar(`select intern.kan_lese_omfang('felles', null, $1)`, [galleri.id[p]]), `${p} felles`).toBe(aktiv)
      for (const f of ['A', 'B'] as const) {
        expect(
          await svar(`select intern.kan_lese_omfang('fagmiljo', $1, $2)`, [galleri.fagmiljo[f], galleri.id[p]]),
          `${p} lokalt i ${f}`,
        ).toBe(medlemI(p).includes(f))
      }
    }
  })

  it('gir grupper bare til systemarkitekten, og nei for alt den ikke kjenner', async () => {
    for (const p of PERSONLISTE) {
      const forventet = p === 'systemarkitekt'
      expect(await svar(`select intern.kan_lese_omfang('gruppe', null, $1)`, [galleri.id[p]]), p).toBe(forventet)
      expect(await svar(`select intern.kan_lese_omfang('ukjent', $1, $2)`, [galleri.fagmiljo.A, galleri.id[p]]), p).toBe(false)
      expect(await svar(`select intern.kan_lese_omfang(null, $1, $2)`, [galleri.fagmiljo.A, galleri.id[p]]), p).toBe(false)
      expect(await svar(`select intern.kan_lese_omfang('fagmiljo', null, $1)`, [galleri.id[p]]), p).toBe(false)
    }
  })
})

describe('funksjonene radsikkerhetsreglene og appen bruker', () => {
  it('gir fagmiljøene den innloggede er aktivt medlem av, alle for en systemarkitekt og ingen uten medlemskap', async () => {
    for (const p of PERSONLISTE) {
      const lesbare = await som(db, galleri.id[p], async (tx) =>
        (await tx.query<{ f: string[] }>('select public.mine_lesbare_fagmiljoer() as f')).rows[0]!.f,
      )
      expect([...lesbare].sort(), p).toEqual(medlemI(p).map((f) => galleri.fagmiljo[f]).sort())
    }
  })

  it('gir sammen med public.mine_administrerte_fagmiljoer og public.er_systemarkitekt den innloggedes egne svar', async () => {
    for (const p of PERSONLISTE) {
      const { adm, sa } = await som(db, galleri.id[p], async (tx) =>
        (await tx.query<{ adm: string[]; sa: boolean }>('select public.mine_administrerte_fagmiljoer() as adm, public.er_systemarkitekt() as sa')).rows[0]!,
      )
      expect([...adm].sort(), p).toEqual(adminI(p).map((f) => galleri.fagmiljo[f]).sort())
      expect(sa, p).toBe(p === 'systemarkitekt')
    }
  })

  it('tar med et nytt fagmiljø bare for medlemmene og systemarkitekten, og ikke når det er arkivert', async () => {
    const nytt = await opprettFagmiljo(db, { nokkel: 'test-hjelpere-c', navn: 'Testmiljø C', administrator: galleri.id.vanligB })
    const lesbare = (p: Person) =>
      som(db, galleri.id[p], async (tx) => (await tx.query<{ f: string[] }>('select public.mine_lesbare_fagmiljoer() as f')).rows[0]!.f)
    expect(await lesbare('vanligB')).toContain(nytt)
    expect(await lesbare('systemarkitekt')).toContain(nytt)
    expect(await lesbare('vanligA')).not.toContain(nytt)
    expect(await svar('select intern.er_lokal_admin_i($1, $2)', [nytt, galleri.id.vanligB])).toBe(true)

    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: arkivert fagmiljø (syntetisk)', true)`)
      await tx.query(`update public.fagmiljoer set status = 'arkivert' where id = $1`, [nytt])
    })
    expect(await lesbare('vanligB')).not.toContain(nytt)
    expect(await lesbare('vanligB')).toContain(galleri.fagmiljo.B)
    expect(await svar('select intern.er_medlem_i($1, $2)', [nytt, galleri.id.vanligB])).toBe(false)
    expect(await svar('select intern.er_lokal_admin_i($1, $2)', [nytt, galleri.id.vanligB])).toBe(false)
    // Systemarkitekten ser også det arkiverte (kan lese alt).
    expect(await lesbare('systemarkitekt')).toContain(nytt)
  })

  it('kan ikke kalles uten innlogging, og hjelperne i intern kan ikke kalles fra nettleseren', async () => {
    const feil = async (bruker: string | null, sql: string) =>
      som(db, bruker, (tx) => tx.query(sql)).then(
        () => null,
        (e: { code?: string }) => e.code,
      )
    expect(await feil(null, 'select public.mine_lesbare_fagmiljoer()')).toBe('42501')
    expect(await feil(null, 'select public.mine_administrerte_fagmiljoer()')).toBe('42501')
    expect(await feil(null, 'select public.er_systemarkitekt()')).toBe('42501')
    for (const sql of [
      `select intern.er_medlem_i(gen_random_uuid())`,
      `select intern.kan_lese_omfang('felles', null)`,
      `select intern.er_lokal_admin_i(gen_random_uuid())`,
    ]) {
      expect(await feil(galleri.id.systemarkitekt, sql), sql).toBe('42501')
    }
  })
})
