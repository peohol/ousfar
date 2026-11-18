/**
 * Fagmiljøet Sandkasse (docs/fagmiljoer.md, «Sandkassen»): opprettet av en
 * migrasjon som bare kjøres i produksjonen, der kontoene `peohol` og `maxhag`
 * finnes. Her kjøres den mot syntetiske kontoer med de navnene, og en vanlig
 * bruker i standardfagmiljøet viser at ingenting fra sandkassen synes utenfor.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { lesRettigheter } from '../auth/rettigheter'
import { IKONER } from '../components/ikon/register'
import { feilFra, grunnlagsdatabase, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const FIL = '20261118073100_sandkasse.sql'
const migrasjonen = readFileSync(resolve(__dirname, '../../supabase/migrations', FIL), 'utf8')

type Konto = 'peohol' | 'maxhag' | 'vanlig'

let basis: PGlite
let db: PGlite
let id: Record<Konto, string>

beforeAll(async () => {
  basis = await nyDatabase()
  const konto = (brukernavn: string, systemarkitekt: boolean) =>
    opprettBruker(basis, { brukernavn, fornavn: 'Test', etternavn: brukernavn, rolle: 'user', systemarkitekt })
  id = { peohol: await konto('peohol', true), maxhag: await konto('maxhag', true), vanlig: await konto('vanlig.bruker', false) }
}, 120_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

afterEach(async () => {
  await db.close()
})

interface Tilstand {
  fagmiljo: { nokkel: string; navn: string; ikon: string; standard: boolean; apent_for_medlemmer: boolean; status: string }[]
  medlemmer: { username: string; primaer: boolean }[]
  administratorer: string[]
  primaer: Record<string, string>
}

async function tilstand(): Promise<Tilstand> {
  const { rows: fagmiljo } = await db.query<Tilstand['fagmiljo'][number]>(
    `select nokkel, navn, ikon, standard, apent_for_medlemmer, status from public.fagmiljoer where nokkel = 'sandkasse'`,
  )
  const { rows: medlemmer } = await db.query<Tilstand['medlemmer'][number]>(
    `select p.username, m.primaer from public.medlemskap m
     join public.profiles p on p.id = m.bruker_id join public.fagmiljoer f on f.id = m.fagmiljo_id
     where f.nokkel = 'sandkasse' and m.status = 'aktiv' order by 1`,
  )
  const { rows: administratorer } = await db.query<{ username: string }>(
    `select p.username from public.fagmiljoadministratorer a
     join public.profiles p on p.id = a.bruker_id join public.fagmiljoer f on f.id = a.fagmiljo_id
     where f.nokkel = 'sandkasse' and a.til is null order by 1`,
  )
  const { rows: primaer } = await db.query<{ username: string; nokkel: string }>(
    `select p.username, f.nokkel from public.medlemskap m
     join public.profiles p on p.id = m.bruker_id join public.fagmiljoer f on f.id = m.fagmiljo_id
     where m.primaer and m.status = 'aktiv' order by 1`,
  )
  return {
    fagmiljo,
    medlemmer,
    administratorer: administratorer.map((r) => r.username),
    primaer: Object.fromEntries(primaer.map((r) => [r.username, r.nokkel])),
  }
}

const rettigheterFor = async (konto: Konto) =>
  lesRettigheter((await som(db, id[konto], (tx) => tx.query<{ r: unknown }>('select public.mine_rettigheter() as r'))).rows[0]!.r)

it('holder migrasjonen utenfor nye databaser og testdatabasen', async () => {
  expect(migrasjonsfiler()).toContain(FIL)
  const kjort: string[] = []
  const tom = await grunnlagsdatabase()
  await kjorMigrasjoner(tom, { bare: [FIL], kjort: (fil) => kjort.push(fil) })
  await tom.close()
  expect(kjort).toEqual([])
  expect((await db.query(`select 1 from public.fagmiljoer where nokkel = 'sandkasse'`)).rows).toEqual([])
})

it('tegner sandkassen i ikonregisteret, som fagmiljøet bruker', () => {
  expect(IKONER.sandkasse.vb).toBe(48)
  expect(migrasjonen).toContain("'sandkasse', 'Sandkasse', 'sandkasse'")
})

describe('migrasjonen', () => {
  it('oppretter Sandkasse åpent for testbrukere, ikke standard, med peohol og maxhag som medlemmer og administratorer', async () => {
    await db.exec(migrasjonen)
    expect(await tilstand()).toEqual({
      fagmiljo: [
        { nokkel: 'sandkasse', navn: 'Sandkasse', ikon: 'sandkasse', standard: false, apent_for_medlemmer: true, status: 'aktiv' },
      ],
      medlemmer: [
        { username: 'maxhag', primaer: false },
        { username: 'peohol', primaer: false },
      ],
      administratorer: ['maxhag', 'peohol'],
      // Primærmedlemskapene, og dermed fortolkningen de arbeider med, er som før.
      primaer: { maxhag: 'ous-klinisk-farmakologi', peohol: 'ous-klinisk-farmakologi', 'vanlig.bruker': 'ous-klinisk-farmakologi' },
    })
    const { rows } = await db.query<{ grunn: string }>(
      `select distinct grunn from public.tilgangslogg
       where fagmiljo_id = (select id from public.fagmiljoer where nokkel = 'sandkasse')`,
    )
    expect(rows.map((r) => r.grunn)).toEqual(['Sandkasse: fagmiljø for utprøving, opprettet etter Peders ønske 18.11.2026'])
  })

  it('tåler å kjøres på nytt uten å endre noe', async () => {
    await db.exec(migrasjonen)
    const for_ = await tilstand()
    await db.exec(migrasjonen)
    expect(await tilstand()).toEqual(for_)
  })

  it('tar over et Sandkasse som alt er opprettet i appen, og gir det ikonet og maxhag', async () => {
    await som(db, id.peohol, (tx) => tx.query(`select public.opprett_fagmiljo('Sandkasse')`))
    expect((await tilstand()).fagmiljo[0]!.ikon).toBe('laboratorium')
    await db.exec(migrasjonen)
    const etter = await tilstand()
    expect(etter.fagmiljo[0]!.ikon).toBe('sandkasse')
    expect(etter.administratorer).toEqual(['maxhag', 'peohol'])
    expect(etter.medlemmer.map((m) => m.username)).toEqual(['maxhag', 'peohol'])
  })

  it('stopper uten at begge er systemarkitekter, og endrer da ingenting', async () => {
    await db.exec(`
      select set_config('ousfar.tilgangsgrunn', 'Test', false);
      update public.systemroller set tilbakekalt_kl = now() where bruker_id = '${id.maxhag}';
    `)
    expect((await feilFra(() => db.exec(migrasjonen)))?.message).toMatch(/må begge være systemarkitekter/)
    expect((await tilstand()).fagmiljo).toEqual([])
  })
})

describe('etter migrasjonen', () => {
  beforeEach(async () => {
    await db.exec(migrasjonen)
  })

  it('gir systemarkitektene Sandkasse med ikonet, men ikke som arbeidsfagmiljø', async () => {
    const r = await rettigheterFor('peohol')
    const sandkasse = r.mineFagmiljoer.find((f) => f.nokkel === 'sandkasse')
    expect(sandkasse).toMatchObject({ navn: 'Sandkasse', ikon: 'sandkasse', standard: false, apent: true })
    // Nye testbrukere kan opprettes rett i Sandkasse.
    expect(r.opprettBrukerI).toContain(sandkasse!.id)
    expect(r.administrerer.map((f) => f.nokkel)).toContain('sandkasse')
    expect(r.velgbareFagmiljoer.map((f) => f.nokkel)).toContain('sandkasse')
    expect(r.arbeidsfagmiljo).toMatchObject({ nokkel: 'ous-klinisk-farmakologi', ikon: 'laboratorium' })
  })

  it('viser ingenting av Sandkasse for en vanlig bruker i et annet fagmiljø', async () => {
    const gruppe = (
      await som(db, id.peohol, (tx) =>
        tx.query<{ id: string }>(
          `select public.opprett_gruppe('Prøvegruppe', 'Bare i sandkassen', (select id from public.fagmiljoer where nokkel = 'sandkasse')) as id`,
        ),
      )
    ).rows[0]!.id
    const r = await rettigheterFor('vanlig')
    expect([...r.mineFagmiljoer, ...r.velgbareFagmiljoer, ...r.administrerer].map((f) => f.nokkel)).not.toContain('sandkasse')
    const sett = await som(db, id.vanlig, async (tx) => ({
      fagmiljoer: (await tx.query<{ nokkel: string }>('select nokkel from public.fagmiljoer')).rows.map((f) => f.nokkel),
      grupper: JSON.stringify((await tx.query('select public.mine_grupper() as g')).rows),
    }))
    expect(sett.fagmiljoer).not.toContain('sandkasse')
    expect(sett.grupper).not.toContain(gruppe)
    expect(sett.grupper).not.toContain('Prøvegruppe')
  })

  it('lar administratorene legge til en testbruker, som da ser Sandkasse uten at det blir primærfagmiljøet', async () => {
    await som(db, id.peohol, (tx) =>
      tx.query(`select public.legg_til_medlem('vanlig.bruker', (select id from public.fagmiljoer where nokkel = 'sandkasse'))`),
    )
    const r = await rettigheterFor('vanlig')
    expect(r.mineFagmiljoer.map((f) => f.nokkel)).toContain('sandkasse')
    expect(r.arbeidsfagmiljo?.nokkel).toBe('ous-klinisk-farmakologi')
    expect(r.administrerer).toEqual([])
  })

  it('åpner bare Sandkasse, ingen andre fagmiljøer', async () => {
    const { rows } = await db.query<{ nokkel: string; apent_for_medlemmer: boolean }>(
      'select nokkel, apent_for_medlemmer from public.fagmiljoer order by nokkel',
    )
    const for_ = await basis.query<{ nokkel: string; apent_for_medlemmer: boolean }>(
      'select nokkel, apent_for_medlemmer from public.fagmiljoer order by nokkel',
    )
    expect(rows.filter((r) => r.nokkel !== 'sandkasse')).toEqual(for_.rows)
  })
})
