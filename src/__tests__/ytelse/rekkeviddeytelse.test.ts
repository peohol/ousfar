/**
 * Måler lesingen av faginnholdet før og etter P2a
 * (20261114133000_rekkevidde_faginnhold: reglene for rekkevidde og utkast),
 * i en isolert database i minnet med syntetiske fagsider i produksjonens
 * størrelse (`PRODUKSJONSFORM`), dagens regelsett med kommentarene og
 * produksjonens arbeidsminne (`work_mem`).
 *
 * Hvert kall måles med `EXPLAIN (ANALYZE)` som den innloggede (en vanlig
 * bruker, en administrator som er systemarkitekt og en lokal administrator), og medianen av
 * `GJENTAKELSER` kall skrives som en tabell til standard ut. Kjøres med
 * `MAAL_REKKEVIDDE=1 npx vitest run src/__tests__/ytelse/rekkeviddeytelse.test.ts`;
 * hoppes over i `npm test`. Resultatene står i docs/fagmiljoer.md
 * («Faginnholdet etter rekkevidden»).
 *
 * En senere endring av reglene måles på samme måte med `MAAL_ENDRING` satt
 * til slutten av navnet på migrasjonen, for eksempel `_redaktoransvar.sql`
 * (P5 tråd A, docs/redaktorer-og-forslag.md). «Før» er da alle migrasjonene
 * før den.
 */
import type { Transaction } from '@electric-sql/pglite'
import { it } from 'vitest'
import { regelimportSql } from '../../regler/import'
import { DAGENS_IMPORT } from '../hjelp/dagensregler'
import { PRODUKSJONSFORM, syntetiskeFagsiderSql } from '../hjelp/syntetiskeFagsider'
import { kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som } from '../hjelp/testdatabase'

const MAALT = process.env.MAAL_ENDRING ?? '_rekkevidde_faginnhold.sql'
const ENDRINGEN = migrasjonsfiler().find((f) => f.endsWith(MAALT))!
const NAVN = MAALT === '_rekkevidde_faginnhold.sql' ? 'P2a' : MAALT.replace(/^_|\.sql$/g, '')
/** Arbeidsminnet i produksjonen 06.11.2026. */
const WORK_MEM = '2184kB'
const GJENTAKELSER = Number(process.env.GJENTAKELSER ?? 5)

const median = (tall: number[]) => [...tall].sort((a, b) => a - b)[Math.floor(tall.length / 2)]!

async function tid(tx: Transaction, sql: string, parametre: unknown[]): Promise<number> {
  const { rows } = await tx.query<{ 'QUERY PLAN': { 'Execution Time': number }[] }>(`explain (analyze, format json) ${sql}`, parametre)
  return rows[0]!['QUERY PLAN'][0]!['Execution Time']
}

async function main() {
  const db = await nyDatabase({ til: ENDRINGEN })
  const admin = await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin', systemarkitekt: true })
  const bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
  // En lokal administrator som ikke er systemarkitekt: utkastene slås opp per rad.
  const lokal = await opprettBruker(db, { brukernavn: 'lokal', fornavn: 'Lise', etternavn: 'Lokal', rolle: 'admin', lokalAdmin: true })
  await som(db, admin, (tx) => tx.exec(syntetiskeFagsiderSql(PRODUKSJONSFORM)))
  await db.exec(regelimportSql(DAGENS_IMPORT, 'redaktor'))
  await db.exec('analyze')

  const { rows: midt } = await db.query<{ slug: string }>(
    `select slug from public.infosider where tilstand = 'publisert' order by slug offset ${Math.floor(PRODUKSJONSFORM.sider / 2)} limit 1`,
  )
  const side = midt[0]!.slug
  const { rows: kode } = await db.query<{ k: string }>(`select analyttkode as k from public.intervallregelsett order by 1 limit 1`)

  const kall = [
    { navn: 'les_stoff, publisert, bruker', hvem: bruker, sql: 'select public.les_stoff($1, $2)', p: [side, 'publisert'] },
    { navn: 'les_stoff, utkast, admin', hvem: admin, sql: 'select public.les_stoff($1, $2)', p: [side, 'utkast'] },
    { navn: 'les_stoff, utkast, lokal admin', hvem: lokal, sql: 'select public.les_stoff($1, $2)', p: [side, 'utkast'] },
    { navn: 'les_stoffer, publisert, bruker', hvem: bruker, sql: 'select public.les_stoffer($1)', p: ['publisert'] },
    { navn: 'les_referanser, publisert, bruker', hvem: bruker, sql: 'select public.les_referanser($1)', p: ['publisert'] },
    { navn: 'les_intervallregelsett, publisert, bruker', hvem: bruker, sql: 'select public.les_intervallregelsett($1)', p: ['publisert'] },
    { navn: 'les_intervallregelsett, utkast, admin', hvem: admin, sql: 'select public.les_intervallregelsett($1)', p: ['utkast'] },
    { navn: 'les_intervallregelsett, utkast, lokal admin', hvem: lokal, sql: 'select public.les_intervallregelsett($1)', p: ['utkast'] },
    { navn: 'les_stoffer, utkast, lokal admin', hvem: lokal, sql: 'select public.les_stoffer($1)', p: ['utkast'] },
    { navn: 'les_kommentarer, publisert, bruker', hvem: bruker, sql: 'select public.les_kommentarer($1)', p: ['publisert'] },
    { navn: 'les_scenarioregler, publisert, bruker', hvem: bruker, sql: 'select public.les_scenarioregler($1)', p: ['publisert'] },
    {
      navn: 'les_endringslogg, en analytt, bruker',
      hvem: bruker,
      sql: 'select public.les_endringslogg($1::jsonb)',
      p: [JSON.stringify({ analyttkoder: [kode[0]!.k] })],
    },
    { navn: 'les_endringslogg, en fagside, admin', hvem: admin, sql: 'select public.les_endringslogg($1::jsonb, true)', p: [JSON.stringify({ stoff: side })] },
  ]

  async function mal(): Promise<number[]> {
    const ut: number[] = []
    for (const k of kall) {
      const ms: number[] = []
      for (let i = 0; i < GJENTAKELSER; i++) {
        ms.push(
          await som(db, k.hvem, async (tx) => {
            await tx.exec(`set local work_mem = '${WORK_MEM}'`)
            return tid(tx, k.sql, k.p)
          }),
        )
      }
      ut.push(median(ms))
    }
    return ut
  }

  const for_ = await mal()
  await kjorMigrasjoner(db, { bare: [ENDRINGEN] })
  await db.exec('analyze')
  const etter = await mal()

  console.log(`\nwork_mem ${WORK_MEM}, median av ${GJENTAKELSER} kall\n`)
  console.log(`| Kall | Før ${NAVN} | Etter ${NAVN} |`)
  console.log('|---|---|---|')
  for (const [i, k] of kall.entries()) console.log(`| ${k.navn} | ${for_[i]!.toFixed(0)} ms | ${etter[i]!.toFixed(0)} ms |`)
  await db.close()
}

it.skipIf(!process.env.MAAL_REKKEVIDDE)(`måler lesingen av faginnholdet før og etter ${NAVN}`, main, 3_600_000)
