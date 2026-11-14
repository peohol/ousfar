/**
 * Invariantene for fagmiljøene ved samtidige transaksjoner, på ekte Postgres
 * (docs/fagmiljoer.md, «Samtidige endringer»). PGlite har bare én forbindelse
 * og kan ikke vise dette, så testen kjører mot serveren i
 * `OUSFAR_POSTGRES_URL` (CI starter Postgres 17, som produksjonen) og hoppes
 * over uten den lokalt, men ikke i CI.
 *
 * To transaksjoner prøver samtidig å fjerne hver sin av de to siste
 * administratorene i et fagmiljø, eller hver sin av de to siste
 * systemarkitektene. Den andre skal vente på den første og så stoppes, og én
 * rettighet skal stå igjen, både i `read committed` og `repeatable read`.
 *
 * Testen lager egne, midlertidige databaser på serveren og sletter dem etterpå.
 */
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const SERVER = process.env.OUSFAR_POSTGRES_URL
const migrasjon = (fil: string) => readFileSync(resolve(__dirname, '../../supabase/migrations', fil), 'utf8')
const STRUKTUR = migrasjon('20261113140000_fagmiljoer.sql')
const KONTOMYNDIGHET = migrasjon('20261113203000_kontomyndighet.sql')

const ADMIN_EN = '00000000-0000-4000-8000-000000000001'
const ADMIN_TO = '00000000-0000-4000-8000-000000000002'
const ADMIN_TRE = '00000000-0000-4000-8000-000000000003'
const ADMIN_FIRE = '00000000-0000-4000-8000-000000000004'

/**
 * Det migrasjonen bygger på fra Supabase og fra tidligere migrasjoner, i den
 * minste formen den trenger: API-rollene, `auth.uid()`, skjemaet `intern` og
 * profilene. Rollene gjelder hele serveren og lages bare om de mangler.
 */
const GRUNNLAG = /* sql */ `
  do $$ begin
    if not exists (select from pg_roles where rolname = 'anon') then create role anon nologin noinherit; end if;
    if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated nologin noinherit; end if;
    if not exists (select from pg_roles where rolname = 'service_role') then create role service_role nologin noinherit bypassrls; end if;
  end $$;
  create schema auth;
  create table auth.users (id uuid primary key default gen_random_uuid(), email text);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub', '')::uuid
  $$;
  create schema intern;
  revoke all on schema intern from public;
  create type public.brukerrolle as enum ('user', 'admin');
  create table public.profiles (
    id uuid primary key references auth.users (id) on delete cascade,
    username text not null unique,
    role public.brukerrolle not null default 'user',
    must_change_password boolean not null default false,
    onboarding_completed boolean not null default true
  );
`

/**
 * To administratorer i OUS Klinisk farmakologi, som også er de to
 * systemarkitektene, og to med bare den gamle adminrollen.
 */
const KONTOER = /* sql */ `
  begin;
  insert into auth.users (id) values ('${ADMIN_EN}'), ('${ADMIN_TO}'), ('${ADMIN_TRE}'), ('${ADMIN_FIRE}');
  insert into public.profiles (id, username, role) values
    ('${ADMIN_EN}', 'admin.en', 'admin'), ('${ADMIN_TO}', 'admin.to', 'admin'),
    ('${ADMIN_TRE}', 'admin.tre', 'admin'), ('${ADMIN_FIRE}', 'admin.fire', 'admin');
  insert into public.systemroller (bruker_id, rolle) values ('${ADMIN_EN}', 'systemarkitekt'), ('${ADMIN_TO}', 'systemarkitekt');
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id)
    select p.id, f.id from public.profiles p cross join public.fagmiljoer f
    where f.nokkel = 'ous-klinisk-farmakologi' and p.id in ('${ADMIN_EN}', '${ADMIN_TO}');
  commit;
`

function url(database: string): string {
  const u = new URL(SERVER!)
  u.pathname = `/${database}`
  return u.toString()
}

/** Kjører SQL med psql og stopper ved første feil. */
function psql(database: string, sql: string): string {
  const r = spawnSync('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=1', url(database)], {
    input: sql,
    encoding: 'utf8',
  })
  if (r.status !== 0) throw new Error(`psql feilet: ${r.stderr || r.error?.message}`)
  return r.stdout.trim()
}

/**
 * Én forbindelse, styrt steg for steg. Hvert steg gir SQLSTATE for det siste
 * kallet (00000 når det gikk bra), lest av psql selv.
 */
class Okt {
  private readonly prosess: ChildProcessWithoutNullStreams
  private utdata = ''
  private teller = 0

  constructor(database: string) {
    this.prosess = spawn('psql', ['-X', '-q', '-A', '-t', '-v', 'ON_ERROR_STOP=0', url(database)])
    this.prosess.stdout.on('data', (d: Buffer) => (this.utdata += d.toString()))
    this.prosess.stderr.on('data', () => undefined)
  }

  /** Sender et steg uten å vente; svaret hentes med `svar()`. */
  send(sql: string): () => Promise<string> {
    const merke = `__steg_${++this.teller}__`
    this.prosess.stdin.write(`${sql}\n\\echo ${merke} :SQLSTATE\n`)
    return () => this.vent(merke)
  }

  async kjor(sql: string): Promise<string> {
    return this.send(sql)()
  }

  /** Om steget fortsatt venter (for eksempel på en lås) etter `ms`. */
  async venterFortsatt(svar: Promise<string>, ms: number): Promise<boolean> {
    return Promise.race([svar.then(() => false), new Promise<boolean>((r) => setTimeout(() => r(true), ms))])
  }

  private async vent(merke: string, frist = 20_000): Promise<string> {
    const slutt = Date.now() + frist
    for (;;) {
      const treff = new RegExp(`${merke} (\\w+)`).exec(this.utdata)
      if (treff) return treff[1]!
      if (Date.now() > slutt) throw new Error(`Ingen svar på ${merke}`)
      await new Promise((r) => setTimeout(r, 20))
    }
  }

  avslutt(): void {
    this.prosess.stdin.end('\\q\n')
  }
}

const SCENARIER = [
  {
    hva: 'de to siste administratorene i et fagmiljø',
    fjern: (bruker: string) =>
      `update public.fagmiljoadministratorer set til = now() where bruker_id = '${bruker}' and til is null;`,
    igjen: `select count(*) from public.fagmiljoadministratorer a
            join public.fagmiljoer f on f.id = a.fagmiljo_id
            where f.nokkel = 'ous-klinisk-farmakologi' and a.til is null`,
  },
  {
    hva: 'de to siste systemarkitektene',
    fjern: (bruker: string) =>
      `update public.systemroller set tilbakekalt_kl = now() where bruker_id = '${bruker}' and tilbakekalt_kl is null;`,
    igjen: `select count(*) from public.systemroller where rolle = 'systemarkitekt' and tilbakekalt_kl is null`,
  },
] as const

const ISOLASJON = ['read committed', 'repeatable read'] as const

// I CI skal testen aldri hoppes stille over.
it.runIf(process.env.CI && !SERVER)('har Postgres-serveren i CI (OUSFAR_POSTGRES_URL)', () => {
  expect(SERVER, 'OUSFAR_POSTGRES_URL mangler i CI').toBeTruthy()
})

describe.skipIf(!SERVER)('samtidige endringer av fagmiljørettigheter (ekte Postgres)', () => {
  const mal = `ousfar_samtidighet_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, GRUNNLAG)
    psql(mal, STRUKTUR)
    psql(mal, KONTOMYNDIGHET)
    psql(mal, KONTOER)
  }, 60_000)

  afterAll(() => {
    for (const db of databaser.reverse()) psql('postgres', `drop database if exists ${db} with (force);`)
  })

  it('kjører på Postgres 17 eller nyere, som produksjonen', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
  })

  describe.each(SCENARIER)('$hva', (scenario) => {
    it.each(ISOLASJON)('stopper den andre av to samtidige transaksjoner i %s', async (isolasjon) => {
      const db = `${mal}_${databaser.length}`
      psql('postgres', `create database ${db} template ${mal};`)
      databaser.push(db)
      expect(psql(db, scenario.igjen)).toBe('2')

      const en = new Okt(db)
      const to = new Okt(db)
      try {
        expect(await en.kjor(`begin isolation level ${isolasjon};`)).toBe('00000')
        expect(await to.kjor(`begin isolation level ${isolasjon};`)).toBe('00000')
        expect(await en.kjor(scenario.fjern(ADMIN_EN))).toBe('00000')

        // Den andre må vente på den første, ellers ser begge den andres rad som aktiv.
        const andreSteg = to.send(scenario.fjern(ADMIN_TO))()
        expect(await to.venterFortsatt(andreSteg, 500)).toBe(true)

        expect(await en.kjor('commit;')).toBe('00000')
        const etterVent = await andreSteg
        const commit = await to.kjor('commit;')
        const stoppet = [etterVent, commit].filter((s) => s !== '00000')
        // 23514: invarianten; 40001: serialiseringsfeil i repeatable read.
        expect(stoppet.length, `steg ${etterVent}, commit ${commit}`).toBeGreaterThan(0)
        expect(['23514', '40001']).toContain(stoppet[0])
      } finally {
        en.avslutt()
        to.avslutt()
      }

      expect(psql(db, scenario.igjen)).toBe('1')
    }, 30_000)
  })

  // To systemarkitekter fjerner samtidig adminrollen fra hver sin av de to
  // siste med den gamle rollen. Kontrollen i kontooperasjonen tas med låsen
  // holdt, så den andre venter og ser den første (docs/fagmiljoer.md,
  // «Myndighet over kontoer»).
  it('stopper den andre av to samtidige rollefjerninger av de to siste administratorene', async () => {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    psql(db, `update public.profiles set role = 'user' where id in ('${ADMIN_EN}', '${ADMIN_TO}');`)
    const igjen = `select count(*) from public.profiles where role = 'admin'`
    expect(psql(db, igjen)).toBe('2')

    const fjern = (aktor: string, mal: string) =>
      `select public.kontooperasjon_sett_rolle('${aktor}', '${mal}', 'user');`
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      expect(await en.kjor(fjern(ADMIN_EN, ADMIN_TRE))).toBe('00000')

      const andreSteg = to.send(fjern(ADMIN_TO, ADMIN_FIRE))()
      expect(await to.venterFortsatt(andreSteg, 500)).toBe(true)

      expect(await en.kjor('commit;')).toBe('00000')
      expect(await andreSteg).toBe('23514')
      await to.kjor('rollback;')
    } finally {
      en.avslutt()
      to.avslutt()
    }

    expect(psql(db, igjen)).toBe('1')
  }, 30_000)

  it('kjører ikke kontooperasjonene i repeatable read, der kontrollen ville sett et gammelt bilde', async () => {
    const okt = new Okt(mal)
    try {
      expect(await okt.kjor('begin isolation level repeatable read;')).toBe('00000')
      expect(await okt.kjor(`select public.kontooperasjon_sett_rolle('${ADMIN_EN}', '${ADMIN_TRE}', 'user');`)).toBe(
        '25001',
      )
      await okt.kjor('rollback;')
    } finally {
      okt.avslutt()
    }
  }, 30_000)
})
