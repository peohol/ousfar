/**
 * Migrasjonen som sletter CPIC og ClinPGx (#540, fase D i
 * docs/cypinfo-integrasjon.md): skjemaene og funksjonene forsvinner,
 * endringsloggen for begge kildene står, og migrasjonen stopper hvis noe er
 * hentet etter at arkivet ble tatt. Innholdet er syntetisk.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { destruktiveSetninger, DESTRUKTIV_GODKJENT } from '../faginnhold/migrasjonshistorikk'
import { feilFra, kjorMigrasjoner, nyDatabase } from './hjelp/testdatabase'

const MIGRASJON = '20261123230000_slett_cpic_og_clinpgx.sql'
const SQL = readFileSync(new URL(`../../supabase/migrations/${MIGRASJON}`, import.meta.url), 'utf8')
const PGX = '(clinpgx|cpic|farmakogenetikk)'

describe('migrasjonen som sletter CPIC og ClinPGx', () => {
  let db: PGlite
  let foer: { kilde: string; n: number }[]

  const funksjoner = async () =>
    (
      await db.query<{ f: string }>(
        `select p.oid::regprocedure::text f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname not in ('pg_catalog', 'information_schema') and (p.proname ~ $1 or n.nspname in ('cpic', 'clinpgx'))
         order by 1`,
        [PGX],
      )
    ).rows.map((r) => r.f)

  const endringer = async () =>
    (await db.query<{ kilde: string; n: number }>(`select kilde, count(*)::int n from datakilder.endringer group by 1 order by 1`)).rows

  beforeAll(async () => {
    db = await nyDatabase({ til: MIGRASJON })
    // Syntetiske rader fra før arkivet, rett i tabellene uten triggerne.
    await db.exec(`
      set session_replication_role = replica;
      insert into clinpgx.synkroniseringer (status, utlost_av, startet_kl, avsluttet_kl)
      values ('fullfort', 'cron', '2026-11-23 02:30:00+00', '2026-11-23 02:40:00+00');
      insert into clinpgx.kjemikalier (clinpgx_id, data, hash, forst_sett_kl, sist_endret_kl, sist_hentet_kl, sist_synk)
      values ('PA1', '{}', 'h', '2026-10-01 00:00:00+00', '2026-11-23 02:35:00+00', '2026-11-23 02:35:00+00', 1);
      insert into datakilder.endringer (kilde, type, objekt_id, art, niva, etikett)
      values ('clinpgx', 'kjemikalie', 'PA1', 'ny', 'klinisk', 'Syntetisk'),
             ('cpic', 'gen', 'CYP2D6', 'ny', 'klinisk', 'CYP2D6');
      set session_replication_role = origin;
    `)
    foer = await endringer()
  }, 120_000)

  it('er merket som godkjent, med det den sletter', () => {
    expect(SQL).toMatch(DESTRUKTIV_GODKJENT)
    expect(SQL.split('\n')[0]).toMatch(/Peder 2026-11-23.*#540/)
    expect(destruktiveSetninger(SQL).length).toBeGreaterThan(0)
  })

  it('stopper uten å slette noe når ClinPGx er hentet etter arkivet', async () => {
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.exec(`insert into clinpgx.synkroniseringer (status, utlost_av, startet_kl) values ('pagar', 'cron', '2026-11-24 02:30:00+00')`)
        await tx.exec(SQL)
      }),
    )
    expect(feil?.message).toMatch(/ClinPGx eller CPIC er hentet etter at arkivet ble tatt \(1 hentinger fra ClinPGx\)/)
    expect(await funksjoner()).toContain('clinpgx_status()')
  })

  describe('etter migrasjonen', () => {
    beforeAll(async () => {
      await kjorMigrasjoner(db, { bare: [MIGRASJON] })
    }, 120_000)

    it('er skjemaene og alle funksjonene for CPIC og ClinPGx borte', async () => {
      const { rows } = await db.query(`select nspname from pg_namespace where nspname in ('cpic', 'clinpgx')`)
      expect(rows).toEqual([])
      expect(await funksjoner()).toEqual([])
    })

    it('står endringsloggen for begge kildene uendret', async () => {
      expect(await endringer()).toEqual(foer)
      expect(foer.map((r) => r.kilde)).toEqual(['clinpgx', 'cpic'])
    })

    it('har feltreglene bare de aktive kildene', async () => {
      const { rows } = await db.query<{ kilde: string }>(`select distinct kilde from datakilder.feltregler order by 1`)
      expect(rows.map((r) => r.kilde)).not.toEqual(expect.arrayContaining(['clinpgx']))
      expect(rows.map((r) => r.kilde)).not.toContain('cpic')
      expect(await feilFra(() => db.query(`insert into datakilder.feltregler (kilde, type, felt, niva) values ('clinpgx', 'x', 'y', 'klinisk')`))).toMatchObject({
        code: '23514',
      })
    })

    it('virker funksjonene som leste skjemaene før', async () => {
      await expect(db.query(`select public.sokedata_versjoner()`)).resolves.toBeDefined()
      await expect(db.query(`select datakilder.etikett('clinpgx', 'kjemikalie', '{}', 'PA1')`)).resolves.toBeDefined()
    })
  })
})
