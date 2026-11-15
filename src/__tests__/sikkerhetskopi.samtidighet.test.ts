/**
 * Kopipunktet i sikkerhetskopien ved samtidig skriving, på ekte Postgres
 * (`docs/drift-gjenoppretting.md`, «Ett kopipunkt»). PGlite har bare én
 * forbindelse, så testen kjører mot serveren i `OUSFAR_POSTGRES_URL` (CI
 * starter Postgres 17, som produksjonen) og hoppes over uten den lokalt.
 *
 * En egen forbindelse skriver hele tiden til to tabeller i samme transaksjon.
 * Kopien holder et øyeblikksbilde, leser radtallene og tar `pg_dump` i det.
 * Det gjenopprettede skal ha nøyaktig radtallene fra øyeblikksbildet, like
 * mange i begge tabellene, og færre enn kilden fikk mens kopien ble tatt.
 *
 * `pg_dump` må ha minst serverens hovedversjon. Har maskinen en eldre, kjøres
 * den i Postgres-bildet med serverens versjon (`KOPI_PG_BILDE`), slik verktøyet
 * gjør.
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Stopp, holdOyeblikksbilde, kjorDumpskript, medOyeblikksbilde, sporring } from '../drift/sikkerhetskopi/kopi'
import { psql, SERVER, url } from './hjelp/ektepostgres'

const vent = (ms: number) => new Promise((ok) => setTimeout(ok, ms))
const tall = (db: string, sql: string) => Number(psql(db, sql))

describe('dumpskriptet tar i bruk øyeblikksbildet', () => {
  const SKRIPT = 'set -euo pipefail\npg_dump \\\n    --data-only \\\n | sed -E "s/x/y/"\npg_dump \\\n    --schema-only\n'

  it('legger --snapshot på hver pg_dump', () => {
    const ut = medOyeblikksbilde(SKRIPT, '00000003-0000001B-1')
    expect(ut.match(/^pg_dump --snapshot "00000003-0000001B-1" \\$/gm)).toHaveLength(2)
    expect(ut).not.toMatch(/^pg_dump \\$/m)
  })

  it('stopper når skriptet ikke har noen pg_dump eller bildet er ugyldig', () => {
    expect(() => medOyeblikksbilde('echo hei\n', '00000003-0000001B-1')).toThrow(Stopp)
    expect(() => medOyeblikksbilde(SKRIPT, `x'; drop table a; --`)).toThrow(Stopp)
  })
})

describe.skipIf(!SERVER)('kopipunktet ved samtidig skriving (ekte Postgres)', () => {
  const kilde = `ousfar_kopipunkt_${process.pid}_${Date.now()}`
  const mal = `${kilde}_mal`
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-kopipunkt-'))
  const forrigeBilde = process.env.KOPI_PG_BILDE

  beforeAll(() => {
    psql('postgres', `create database ${kilde};`)
    psql('postgres', `create database ${mal};`)
    const struktur = 'create table a (n int primary key); create table b (n int primary key);'
    psql(kilde, struktur)
    psql(mal, struktur)
    const server = Math.floor(tall(kilde, 'show server_version_num;') / 10000)
    const lokal = Number(/(\d+)/.exec(execFileSync('pg_dump', ['--version'], { encoding: 'utf8' }))?.[1] ?? 0)
    if (lokal < server) process.env.KOPI_PG_BILDE = `postgres:${server}`
  }, 60_000)

  afterAll(() => {
    if (forrigeBilde === undefined) delete process.env.KOPI_PG_BILDE
    else process.env.KOPI_PG_BILDE = forrigeBilde
    rmSync(mappe, { recursive: true, force: true })
    for (const db of [kilde, mal]) psql('postgres', `drop database if exists ${db} with (force);`)
  })

  it('gir nøyaktig radene i øyeblikksbildet, selv om skrivingen fortsetter under kopien', async () => {
    const skriver = spawn('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', url(kilde)], { stdio: ['pipe', 'ignore', 'pipe'] })
    let n = 0
    const tikk = setInterval(() => {
      n++
      skriver.stdin.write(`begin; insert into a values (${n}); select pg_sleep(0.005); insert into b values (${n}); commit;\n`)
    }, 5)
    try {
      await vent(500)
      const bilde = await holdOyeblikksbilde(url(kilde))
      let iBildet: { a: number; b: number }
      try {
        ;[iBildet] = sporring<{ a: number; b: number }>(url(kilde), 'select (select count(*) from a)::int as a, (select count(*) from b)::int as b', bilde.navn) as [{ a: number; b: number }]
        await vent(500)
        const fil = join(mappe, 'data.sql')
        await kjorDumpskript(medOyeblikksbilde(`set -euo pipefail\npg_dump \\\n  --data-only --dbname "${url(kilde)}"\n`, bilde.navn), fil)
        await vent(300)
        psql(mal, readFileSync(fil, 'utf8'))
      } finally {
        await bilde.slipp()
      }
      expect(iBildet.a).toBeGreaterThan(0)
      expect(iBildet.a).toBe(iBildet.b)
      expect(tall(mal, 'select count(*) from a')).toBe(iBildet.a)
      expect(tall(mal, 'select count(*) from b')).toBe(iBildet.a)
      expect(tall(mal, 'select coalesce(max(n), 0) from a')).toBe(iBildet.a)
      expect(tall(mal, 'select count(*) from a full join b using (n) where a.n is null or b.n is null')).toBe(0)
      // Skrivingen fortsatte under kopien, men kom ikke med i den.
      expect(tall(kilde, 'select count(*) from a')).toBeGreaterThan(iBildet.a)
    } finally {
      clearInterval(tikk)
      skriver.stdin.end()
      await new Promise((ok) => skriver.once('exit', ok))
    }
  }, 120_000)

  it('stopper når øyeblikksbildet ikke lenger holdes', async () => {
    const bilde = await holdOyeblikksbilde(url(kilde))
    const navn = bilde.navn
    await bilde.slipp()
    expect(() => sporring(url(kilde), 'select 1 as x', navn)).toThrow(/snapshot/i)
    await expect(kjorDumpskript(medOyeblikksbilde(`pg_dump \\\n  --data-only --dbname "${url(kilde)}"\n`, navn), join(mappe, 'ugyldig.sql'))).rejects.toBeInstanceOf(Stopp)
  }, 60_000)
})
