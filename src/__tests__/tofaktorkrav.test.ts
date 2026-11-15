/**
 * Tofaktorkravet for de privilegerte rollene (docs/s4-pilotplan.md §3.1,
 * tiltak 7), slått på i testdatabasen. I produksjonen er det av til D5a.
 *
 * Akseptkriteriet prøves for hver inngang nettleseren når, lest ut av
 * katalogen, slik at en ny funksjon eller tabell kommer med av seg selv:
 *
 * - En konto i en rolle som krever tofaktor, har på `aal1` nøyaktig
 *   rettighetene til et vanlig medlem: hvert svar er det samme som den samme
 *   personen ville fått med rollene tatt fra seg (`degradert`), både fra
 *   funksjonene og fra lesing, innsetting, oppdatering og sletting i
 *   tabellene.
 * - På `aal2` er alt som før kravet.
 * - Et vanlig medlem merker ikke kravet.
 * - Edge-funksjonene får det samme svaret om kravet.
 *
 * Svarene sammenlignes som feilkode eller antall rader, fordi tidspunkter og
 * nye ID-er er ulike fra kall til kall.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { byggPersongalleri, leggInnTestdata, type Person, type Persongalleri } from './hjelp/persongalleri'
import { nyDatabase } from './hjelp/testdatabase'
import { provargumenter } from './hjelp/provargumenter'
import { funksjonsinnganger, tabellinnganger, type Funksjonsinngang, type Tabellinngang } from './hjelp/tilgangsinnganger'

/** Personene i rollene som krever tofaktor: systemarkitekt med adminrollen, systemarkitekt og lokal administrator uten den, og lokal administrator. */
const PRIVILEGERTE = ['systemarkitekt', 'arkitektB', 'adminA'] as const satisfies readonly Person[]
const VANLIGE = ['vanligA', 'dobbeltAB'] as const satisfies readonly Person[]

interface Modus {
  krav: boolean
  aal?: 'aal1' | 'aal2'
  /** Rollene tatt fra personen i transaksjonen: systemarkitekt, adminrollen og lokal administrator. */
  degradert?: boolean
}

let db: PGlite
let galleri: Persongalleri
let funksjoner: Funksjonsinngang[]
let tabeller: Tabellinngang[]
let argumenter: Map<string, string[]>
const kolonne = new Map<string, string>()

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  await leggInnTestdata(db, galleri)
  funksjoner = (await funksjonsinnganger(db)).filter((f) => f.kontroll !== 'offentlig' && f.kontroll !== 'utloser')
  tabeller = await tabellinnganger(db)
  argumenter = await provargumenter(db)
  const { rows } = await db.query<{ tabell: string; navn: string }>(
    `select distinct on (attrelid) attrelid::regclass::text as tabell, quote_ident(attname) as navn
     from pg_attribute where attnum > 0 and not attisdropped and attrelid = any($1::regclass[]) order by attrelid, attnum`,
    [tabeller.filter((t) => !t.visning).map((t) => t.navn)],
  )
  for (const r of rows) kolonne.set(r.tabell.includes('.') ? r.tabell : `public.${r.tabell}`, r.navn)
}, 180_000)

afterAll(async () => {
  await db.close()
})

async function degrader(tx: Transaction, bruker: string) {
  // Utløserne (invariantene, loggen) gjelder ikke her; alt rulles tilbake.
  await tx.query(`set local session_replication_role = replica`)
  await tx.query(`update public.systemroller set tilbakekalt_kl = now() where bruker_id = $1 and tilbakekalt_kl is null`, [bruker])
  await tx.query(`update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and til is null`, [bruker])
  await tx.query(`update public.profiles set role = 'user' where id = $1`, [bruker])
  await tx.query(`set local session_replication_role = origin`)
}

/** Kjører `sql` som personen i modusen, i en transaksjon som rulles tilbake, og gir svaret som feilkode eller tall. */
async function kjor(person: Person, modus: Modus, sql: string, tall: (r: { rows: Record<string, unknown>[]; affectedRows?: number }) => number): Promise<string> {
  const bruker = galleri.id[person]
  try {
    return await db.transaction(async (tx) => {
      await tx.query(`create or replace function intern.tofaktorkrav_paa() returns boolean language sql stable set search_path = '' as $$ select ${modus.krav} $$`)
      if (modus.degradert) await degrader(tx, bruker)
      await tx.query(`select set_config('role', 'authenticated', true)`)
      await tx.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: bruker, role: 'authenticated', ...(modus.aal ? { aal: modus.aal } : {}) }),
      ])
      await tx.query(`select set_config('request.method', 'POST', true)`)
      await tx.query(`select set_config('request.headers', '{}', true)`)
      const svar = `ok:${tall(await tx.query<Record<string, unknown>>(sql))}`
      await tx.rollback()
      return svar
    })
  } catch (feil) {
    return `feil:${(feil as { code?: string }).code ?? String(feil)}`
  }
}

/** Hver inngang som SQL, med hvordan svaret telles. */
function innganger(): { navn: string; sql: string; tall: (r: { rows: Record<string, unknown>[]; affectedRows?: number }) => number }[] {
  const rader = (r: { rows: unknown[] }) => r.rows.length
  const berort = (r: { affectedRows?: number }) => r.affectedRows ?? 0
  return [
    ...funksjoner.map((f) => ({ navn: f.signatur, sql: `select * from public.${f.navn}(${argumenter.get(f.signatur)!.join(', ')})`, tall: rader })),
    ...tabeller
      .filter((t) => t.rettigheter.includes('authenticated:SELECT'))
      .map((t) => ({ navn: `SELECT ${t.navn}`, sql: `select count(*)::int as n from ${t.navn}`, tall: (r: { rows: Record<string, unknown>[] }) => Number(r.rows[0]!.n) })),
    ...tabeller
      .filter((t) => !t.visning && t.rettigheter.includes('authenticated:UPDATE'))
      .map((t) => ({ navn: `UPDATE ${t.navn}`, sql: `update ${t.navn} set ${kolonne.get(t.navn)} = ${kolonne.get(t.navn)}`, tall: berort })),
    ...tabeller
      .filter((t) => !t.visning && t.rettigheter.includes('authenticated:INSERT'))
      .map((t) => ({ navn: `INSERT ${t.navn}`, sql: `insert into ${t.navn} default values`, tall: berort })),
    ...tabeller
      .filter((t) => !t.visning && t.rettigheter.includes('authenticated:DELETE'))
      .map((t) => ({ navn: `DELETE ${t.navn}`, sql: `delete from ${t.navn}`, tall: berort })),
  ]
}

/** Inngangene der personen i `a` og `b` får ulike svar. */
async function forskjeller(person: Person, a: Modus, b: Modus): Promise<string[]> {
  const ulike: string[] = []
  for (const i of innganger()) {
    const [x, y] = [await kjor(person, a, i.sql, i.tall), await kjor(person, b, i.sql, i.tall)]
    if (x !== y) ulike.push(`${i.navn}: ${x} / ${y}`)
  }
  return ulike
}

describe('med tofaktorkravet slått på', () => {
  it('prøver alle inngangene fra katalogen', () => {
    const alle = innganger()
    expect(alle.filter((i) => !/^(SELECT|INSERT|UPDATE|DELETE) /.test(i.navn)).length).toBeGreaterThan(100)
    expect(alle.filter((i) => i.navn.startsWith('SELECT ')).length).toBeGreaterThan(60)
    expect(alle.filter((i) => /^(INSERT|UPDATE|DELETE) /.test(i.navn)).length).toBeGreaterThan(25)
  })

  it.each(PRIVILEGERTE)('har %s på aal1 nøyaktig rettighetene til et vanlig medlem', async (person) => {
    expect(await forskjeller(person, { krav: true, aal: 'aal1' }, { krav: true, aal: 'aal1', degradert: true })).toEqual([])
  }, 600_000)

  it.each(PRIVILEGERTE)('har %s på aal2 alt som før kravet', async (person) => {
    expect(await forskjeller(person, { krav: true, aal: 'aal2' }, { krav: false, aal: 'aal1' })).toEqual([])
  }, 600_000)

  it.each(VANLIGE)('merker ikke %s noe av kravet', async (person) => {
    expect(await forskjeller(person, { krav: true, aal: 'aal1' }, { krav: false, aal: 'aal1' })).toEqual([])
  }, 600_000)

  it('gjør en forskjell for de privilegerte, så sammenligningene over ikke er tomme', async () => {
    for (const person of PRIVILEGERTE) {
      const ulike = await forskjeller(person, { krav: true, aal: 'aal1' }, { krav: false, aal: 'aal1' })
      expect(ulike.length, person).toBeGreaterThan(5)
    }
  }, 600_000)

  it('gir Edge-funksjonene det samme svaret, med aal fra tokenet', async () => {
    const svar = async (krav: boolean, person: Person, aal: string | null) =>
      db.transaction(async (tx) => {
        await tx.query(`create or replace function intern.tofaktorkrav_paa() returns boolean language sql stable set search_path = '' as $$ select ${krav} $$`)
        const { rows } = await tx.query<{ ja: boolean }>('select public.kontooperasjon_privilegier_tilgjengelige($1, $2) as ja', [galleri.id[person], aal])
        await tx.rollback()
        return rows[0]!.ja
      })
    for (const person of PRIVILEGERTE) {
      expect(await svar(true, person, 'aal1'), person).toBe(false)
      expect(await svar(true, person, null), person).toBe(false)
      expect(await svar(true, person, 'aal2'), person).toBe(true)
      expect(await svar(false, person, 'aal1'), person).toBe(true)
    }
    for (const person of VANLIGE) expect(await svar(true, person, 'aal1'), person).toBe(true)
    const tilgang = await db.query<{ anon: boolean; innlogget: boolean; tjeneste: boolean }>(
      `select has_function_privilege('anon', 'public.kontooperasjon_privilegier_tilgjengelige(uuid, text)', 'execute') as anon,
              has_function_privilege('authenticated', 'public.kontooperasjon_privilegier_tilgjengelige(uuid, text)', 'execute') as innlogget,
              has_function_privilege('service_role', 'public.kontooperasjon_privilegier_tilgjengelige(uuid, text)', 'execute') as tjeneste`,
    )
    expect(tilgang.rows[0]).toEqual({ anon: false, innlogget: false, tjeneste: true })
  })

  it('krever det i den felles kontrollen Edge-funksjonene bygger på, før funksjonen får gjøre noe', () => {
    const funksjoner = resolve(__dirname, '../../supabase/functions')
    const kontekst = readFileSync(resolve(funksjoner, '_edge/kontekst.ts'), 'utf8')
    expect(kontekst).toContain(`rpc('kontooperasjon_privilegier_tilgjengelige'`)
    expect(kontekst).toContain('{ privilegert = true }')
    expect(kontekst.indexOf('await krevTofaktor(ctx')).toBeLessThan(kontekst.indexOf('await handling('))
    // Bare førstegangsoppsettet, som ikke bruker privilegier, slår kravet av.
    const unntak = readdirSync(funksjoner, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_'))
      .filter((d) => /privilegert:\s*false/.test(readFileSync(resolve(funksjoner, d.name, 'index.ts'), 'utf8')))
      .map((d) => d.name)
    expect(unntak).toEqual(['fullfor-oppsett'])
  })

  it('er av i migrasjonene, til det slås på i en egen migrasjon', async () => {
    const { rows } = await db.query<{ paa: boolean }>('select intern.tofaktorkrav_paa() as paa')
    expect(rows[0]!.paa).toBe(false)
  })
})
