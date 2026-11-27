/**
 * Kopien i deler (`src/drift/sikkerhetskopi/deler.ts`), på ekte Postgres:
 * bitene deles på databasens side, hentes med `COPY` i øyeblikksbildet og
 * legges tilbake slik at tabellene blir like kilden, med identitetskolonner,
 * genererte kolonner og sekvenser. En ny eller endret rad endrer bare biten
 * den ligger i, og en utelatt tabell deles ikke. Hoppes over uten
 * `OUSFAR_POSTGRES_URL` (CI starter Postgres 17, som produksjonen).
 */
import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { holdOyeblikksbilde, sporring, utelattReferanseSql } from '../drift/sikkerhetskopi/kopi'
import { DELMAL, delplanSql, delteTabellerSql, henteskript, nyeBiter, sekvensSql, tilbakeskript, type Bit, type DeltTabell, type Sekvens } from '../drift/sikkerhetskopi/deler'
import { EGNE_SKJEMAER_SQL, UTELATTE_TABELLER } from '../drift/sikkerhetskopi/manifest'
import { psql, SERVER, slettDatabaser, url } from './hjelp/ektepostgres'
import { nyDatabase } from './hjelp/migrasjonskjoring'

const STRUKTUR = /* sql */ `
  create table public.revisjoner (
    id bigint generated always as identity primary key,
    tekst text not null,
    lengde int generated always as (length(tekst)) stored,
    laget timestamptz not null default now()
  );
  create table public.par (a int, b text, verdi jsonb, primary key (a, b));
  create table public.direktemeldinger (id bigserial primary key, tekst text not null);
  create table public.uten_nokkel (x int);
`

/** Radene og innholdet i en tabell, som én sum, for å sammenligne kilde og kopi. */
const sum = (db: string, tabell: string) => psql(db, `select count(*) || ':' || coalesce(md5(string_agg(t::text, '|' order by t::text)), '') from ${tabell} t`)

function kjorPsql(db: string, skript: string) {
  const r = spawnSync('psql', ['-X', '-q', '-v', 'ON_ERROR_STOP=1', '--single-transaction', url(db)], { input: skript, encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr)
}

describe.skipIf(!SERVER)('kopien i deler (ekte Postgres)', () => {
  const kilde = `ousfar_deler_${process.pid}_${Date.now()}`
  const mal = `${kilde}_mal`
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-deler-test-'))
  const utelatt = ['public.direktemeldinger']

  /** Planen for alle delte tabeller i ett øyeblikksbilde, og bitene hentet til filer. */
  async function ta(hent: boolean) {
    const bilde = await holdOyeblikksbilde(url(kilde))
    try {
      const delte = sporring<DeltTabell>(url(kilde), delteTabellerSql(EGNE_SKJEMAER_SQL, utelatt), bilde.navn)
      const plan = delte.flatMap((t) => sporring<Bit>(url(kilde), delplanSql(t), bilde.navn).map((b) => ({ t, b })))
      const sekvenser = sporring<Sekvens>(url(kilde), delte.flatMap((t) => t.sekvenser).map(sekvensSql).join(' union all '), bilde.navn)
      const filer = plan.map((p, i) => ({ ...p, fil: join(mappe, `${Date.now()}-${i}.copy`) }))
      if (hent) kjorPsql(kilde, henteskript(bilde.navn, filer))
      return { delte, plan, filer, sekvenser }
    } finally {
      await bilde.slipp()
    }
  }

  beforeAll(() => {
    psql('postgres', `create database ${kilde};`)
    psql('postgres', `create database ${mal};`)
    psql(kilde, STRUKTUR)
    psql(mal, STRUKTUR)
    // Om lag fem ganger DELMAL tekst, med noen brede rader.
    psql(
      kilde,
      `insert into public.revisjoner (tekst, laget)
         select repeat(md5(g::text), case when g % 500 = 0 then 2000 else 16 end), timestamptz '2026-11-01' + g * interval '1 minute'
         from generate_series(1, ${Math.ceil((5 * DELMAL) / 600)}) g;
       insert into public.par select g, 'b' || g, jsonb_build_object('g', g, 'x', 1.1) from generate_series(1, 300) g;
       insert into public.direktemeldinger (tekst) values ('HEMMELIG-DM-TEKST');
       insert into public.uten_nokkel values (1);`,
    )
  }, 120_000)

  afterAll(() => {
    rmSync(mappe, { recursive: true, force: true })
    slettDatabaser([mal, kilde])
  })

  it('deler bare tabellene med primærnøkkel som ikke er utelatt, med sekvensene og uten de genererte kolonnene', async () => {
    const { delte, plan } = await ta(false)
    expect(delte.map((t) => t.tabell)).toEqual(['public.par', 'public.revisjoner'])
    const rev = delte.find((t) => t.tabell === 'public.revisjoner')!
    expect(rev.kolonner).toEqual(['id', 'tekst', 'laget'])
    expect(rev.sekvenser).toEqual(['public.revisjoner_id_seq'])
    expect(delte.find((t) => t.tabell === 'public.par')!.nokkel).toEqual([
      { navn: 'a', type: 'integer' },
      { navn: 'b', type: 'text' },
    ])
    const biter = plan.filter((p) => p.t.tabell === 'public.revisjoner').map((p) => p.b)
    expect(biter.length).toBeGreaterThanOrEqual(2)
    expect(biter.reduce((s, b) => s + Number(b.rader), 0)).toBe(Number(psql(kilde, 'select count(*) from public.revisjoner')))
    expect(new Set(plan.map((p) => p.b.identitet)).size).toBe(plan.length)
  }, 60_000)

  it('legger bitene tilbake slik at tabellene, de genererte kolonnene og sekvensene blir like kilden', async () => {
    const { filer, sekvenser } = await ta(true)
    kjorPsql(
      mal,
      tilbakeskript(
        filer.map((f) => ({ tabell: f.t.tabell, kolonner: f.t.kolonner, fil: f.fil })),
        sekvenser,
      ),
    )
    for (const t of ['public.revisjoner', 'public.par']) expect(sum(mal, t)).toBe(sum(kilde, t))
    expect(psql(mal, 'select count(*) from public.direktemeldinger')).toBe('0')
    // Neste rad får neste nummer, som i kilden.
    const neste = (db: string) => psql(db, "insert into public.revisjoner (tekst) values ('ny') returning id, lengde")
    expect(neste(mal)).toBe(neste(kilde))
  }, 60_000)

  it('endrer bare biten en ny, endret eller slettet rad ligger i', async () => {
    const for_ = (await ta(false)).plan.map((p) => p.b.identitet)
    const midt = Number(psql(kilde, 'select id from public.revisjoner order by id offset (select count(*) / 2 from public.revisjoner) limit 1'))
    psql(kilde, `update public.revisjoner set tekst = tekst || 'x' where id = ${midt}; delete from public.par where a = 7;`)
    const etter = (await ta(false)).plan.map((p) => p.b.identitet)
    const nye = nyeBiter(
      etter.map((identitet) => ({ identitet })),
      new Set(for_),
    )
    // Én bit i hver tabell (den endrede raden kan flytte en grense og slå sammen to).
    expect(nye.length).toBeGreaterThanOrEqual(2)
    expect(nye.length).toBeLessThanOrEqual(3)
    expect(etter.filter((i) => for_.includes(i)).length).toBeGreaterThanOrEqual(for_.length - 3)
  }, 60_000)

})

describe('det som ikke tas med, i databasen migrasjonene bygger', () => {
  const liste = `array[${Object.keys(UTELATTE_TABELLER).map((t) => `'${t}'`).join(', ')}]::text[]`

  it('finner alle de utelatte tabellene, ingen tabell i kopien viser til dem, og ingen tekst fra direktemeldingene er med', async () => {
    const db = await nyDatabase()
    try {
      const rader = async <T>(sql: string) => (await db.query<T>(sql)).rows
      for (const t of Object.keys(UTELATTE_TABELLER)) expect((await rader<{ r: string | null }>(`select to_regclass('${t}')::text as r`))[0]!.r, t).not.toBeNull()
      expect(await rader(utelattReferanseSql(liste))).toEqual([])
      // Hver tabell om direktemeldinger med en tekstkolonne er utelatt (beslutning 3).
      const tekst = await rader<{ tabell: string }>(`
        select distinct table_schema || '.' || table_name as tabell from information_schema.columns
        where table_name like 'direkte%' and data_type in ('text', 'character varying', 'jsonb', 'json')`)
      for (const { tabell } of tekst) expect(Object.keys(UTELATTE_TABELLER), tabell).toContain(tabell)
      expect(tekst.map((r) => r.tabell)).toContain('public.direktemeldinger')
      // Delingen kan planlegges for hver tabell som deles.
      const delte = (await rader<{ tabell: string; nokkel: { navn: string; type: string }[] }>(delteTabellerSql(EGNE_SKJEMAER_SQL, Object.keys(UTELATTE_TABELLER)))).map((r) => r.tabell)
      expect(delte).toContain('kuratering.grenrevisjoner')
      expect(delte).toContain('public.direktemelding_blokkeringer')
      expect(delte).toContain('public.chatvalg')
      for (const t of Object.keys(UTELATTE_TABELLER)) expect(delte).not.toContain(t)
    } finally {
      await db.close()
    }
  }, 120_000)
})
