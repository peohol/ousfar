/**
 * Måler fagsidelesingen (`les_stoff`, `les_stoffer`) før og etter
 * 20261106140000_stoffsider_som_json_nodvendige, i en isolert database i
 * minnet med syntetiske fagsider i produksjonens størrelse
 * (`PRODUKSJONSFORM`) og produksjonens arbeidsminne (`work_mem`).
 *
 * For hvert kall måles tiden og de midlertidige filene hele kallet skrev
 * (`EXPLAIN (ANALYZE, BUFFERS)` på kallet; arbeidet inne i funksjonene telles
 * med), og hvor mange objektutgaver det bygges JSON for (`bygdeUtgaver`).
 * Kjøres med
 * `MAAL_STOFFSIDELESING=1 npx vitest run src/__tests__/ytelse/stoffsidelesing.test.ts`,
 * og skriver en tabell til standard ut. Hoppes over i `npm test`, fordi den
 * tar noen minutter. Resultatene står i `docs/stoffsidelesing-ytelse.md`.
 *
 * `SKRIV_SQL=<fil>` skriver i tillegg SQL-en som lager de syntetiske sidene,
 * så de samme målingene kan gjentas i en vanlig Postgres-server.
 */
import { writeFileSync } from 'node:fs'
import type { Transaction } from '@electric-sql/pglite'
import { it } from 'vitest'
import { kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som } from '../hjelp/testdatabase'
import { PRODUKSJONSFORM, syntetiskeFagsiderSql } from '../hjelp/syntetiskeFagsider'

const ENDRINGEN = migrasjonsfiler().find((f) => f.endsWith('_stoffsider_som_json_nodvendige.sql'))!
/** Arbeidsminnet i produksjonen 06.11.2026. */
const WORK_MEM = '2184kB'
const GJENTAKELSER = Number(process.env.GJENTAKELSER ?? 3)
/** Blokkstørrelsen i Postgres. */
const BLOKK = 8192

interface Plan {
  Plan: Plannode
  'Execution Time': number
}
interface Plannode {
  /** Med arbeidet inne i funksjonene kallet gjør. */
  'Temp Written Blocks'?: number
}

interface Side {
  elementer: unknown[]
}

interface Maling {
  kall: string
  ms: number
  tempMB: number
  utgaver: number
}

const median = (tall: number[]) => [...tall].sort((a, b) => a - b)[Math.floor(tall.length / 2)]!

async function forklar(tx: Transaction, sql: string, parametre: unknown[] = []): Promise<Plan> {
  const { rows } = await tx.query<{ 'QUERY PLAN': Plan[] }>(`explain (analyze, buffers, format json) ${sql}`, parametre)
  return rows[0]!['QUERY PLAN'][0]!
}

async function main() {
  const db = await nyDatabase({ til: ENDRINGEN })
  const admin = await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin' })
  const bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
  const sql = syntetiskeFagsiderSql(PRODUKSJONSFORM)
  if (process.env.SKRIV_SQL) writeFileSync(process.env.SKRIV_SQL, sql)
  const start = Date.now()
  await som(db, admin, (tx) => tx.exec(sql))
  console.error(`Syntetiske sider laget på ${((Date.now() - start) / 1000).toFixed(0)} s`)
  await db.exec('analyze')

  const { rows: antall } = await db.query<{ tilstand: string; n: number }>(
    'select tilstand::text, count(*)::int as n from public.objekttilstander group by 1 order by 1',
  )
  console.log(`Objektutgaver: ${antall.map((a) => `${a.n} ${a.tilstand}`).join(', ')}`)
  const { rows: midt } = await db.query<{ slug: string }>(
    `select slug from public.infosider where tilstand = 'publisert' order by slug offset ${Math.floor(PRODUKSJONSFORM.sider / 2)} limit 1`,
  )
  const side = midt[0]!.slug

  const kall = [
    { navn: 'les_stoff, publisert, bruker', hvem: bruker, sql: 'select public.les_stoff($1, $2)', parametre: [side, 'publisert'] },
    { navn: 'les_stoff, utkast, admin', hvem: admin, sql: 'select public.les_stoff($1, $2)', parametre: [side, 'utkast'] },
    { navn: 'les_stoffer, publisert, bruker', hvem: bruker, sql: 'select public.les_stoffer($1)', parametre: ['publisert'] },
    { navn: 'les_stoffer, utkast, admin', hvem: admin, sql: 'select public.les_stoffer($1)', parametre: ['utkast'] },
  ]

  /**
   * Hvor mange utgaver funksjonen bygger JSON for. Før endringen er det alle
   * utgavene i tilstanden som den som kaller ser (mellomresultatet `utgaver`);
   * etter endringen bare de svaret inneholder, fordi JSON-en bygges der den
   * brukes.
   */
  async function bygdeUtgaver(k: (typeof kall)[number], gammel: boolean): Promise<number> {
    return som(db, k.hvem, async (tx) => {
      const tilstand = k.parametre.at(-1)
      if (gammel) {
        const { rows } = await tx.query<{ n: number }>('select count(*)::int as n from public.objektutgaver where tilstand = $1', [tilstand])
        return rows[0]!.n
      }
      const { rows } = await tx.query<{ svar: { sider?: Side[]; elementer?: unknown[]; referanser: unknown[] } | null }>(
        `${k.sql} as svar`,
        k.parametre,
      )
      const svar = rows[0]!.svar
      if (!svar) return 0
      const sider: Side[] = svar.sider ?? [svar as Side]
      return sider.reduce((sum, side) => sum + 1 + side.elementer.length, 0) + svar.referanser.length
    })
  }

  async function mal(gammel: boolean): Promise<Maling[]> {
    const ut: Maling[] = []
    for (const k of kall) {
      const malinger: { ms: number; temp: number }[] = []
      for (let i = 0; i < GJENTAKELSER; i++) {
        const plan = await som(db, k.hvem, async (tx) => {
          await tx.exec(`set local work_mem = '${WORK_MEM}'`)
          return forklar(tx, k.sql, k.parametre)
        })
        malinger.push({ ms: plan['Execution Time'], temp: plan.Plan['Temp Written Blocks'] ?? 0 })
      }
      ut.push({
        kall: k.navn,
        ms: median(malinger.map((m) => m.ms)),
        tempMB: (median(malinger.map((m) => m.temp)) * BLOKK) / 1024 / 1024,
        utgaver: await bygdeUtgaver(k, gammel),
      })
    }
    return ut
  }

  const for_ = await mal(true)
  await kjorMigrasjoner(db, { bare: [ENDRINGEN] })
  const etter = await mal(false)

  console.log(`\nwork_mem ${WORK_MEM}, median av ${GJENTAKELSER} kall, les_stoff for «${side}»\n`)
  console.log('| Kall | Tid før | Tid etter | Temp før | Temp etter | JSON bygd for, før | JSON bygd for, etter |')
  console.log('|---|---|---|---|---|---|---|')
  for (const [i, f] of for_.entries()) {
    const e = etter[i]!
    console.log(
      `| ${f.kall} | ${f.ms.toFixed(0)} ms | ${e.ms.toFixed(0)} ms | ${f.tempMB.toFixed(1)} MB | ${e.tempMB.toFixed(1)} MB | ${f.utgaver} | ${e.utgaver} |`,
    )
  }
  await db.close()
}

it.skipIf(!process.env.MAAL_STOFFSIDELESING)('måler fagsidelesingen før og etter endringen', main, 3_600_000)
