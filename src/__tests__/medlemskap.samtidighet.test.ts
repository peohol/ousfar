/**
 * P3: avslutning av medlemskap ved samtidige transaksjoner, på ekte Postgres
 * 17 med hele databasestrukturen (docs/fagmiljoer.md, «Medlemskap og
 * kontosperring»). Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * En konto er medlem av A og B. Administratorene i A og B avslutter hvert
 * sitt medlemskap samtidig. Den andre skal vente på den første, og når begge
 * er ferdige, står kontoen uten medlemskap og er sperret i Auth, uansett hvem
 * som kom først. Det samme når medlemskapene endres direkte i tabellen
 * (som en systemarkitekt i Supabase), også i `repeatable read`, der den andre
 * stoppes i stedet for å la kontoen stå usperret.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER } from './hjelp/ektepostgres'
import { startportSql } from '../faginnhold/migrasjonshistorikk'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  arkitekt: '00000000-0000-4000-8000-0000000000a1',
  adminA: '00000000-0000-4000-8000-0000000000a2',
  adminB: '00000000-0000-4000-8000-0000000000a3',
  medlem: '00000000-0000-4000-8000-0000000000a4',
} as const

const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`
const B = `(select id from public.fagmiljoer where nokkel = 'ous-rettstoksikologi')`

/** Kontoene, opprettet slik adminveien gjør det; alle får primærmedlemskap i A (standard). */
const KONTOER = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.${navn.toLowerCase()}');
        insert into auth.users (id, email) values ('${id}', 'test.${navn.toLowerCase()}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.systemroller (bruker_id, rolle)
    select '${KONTO.arkitekt}', 'systemarkitekt'
    where not exists (select 1 from public.systemroller where bruker_id = '${KONTO.arkitekt}');
  ${startportSql('ous-rettstoksikologi')}
  update public.fagmiljoer set apent_for_medlemmer = true where id = ${B};
  insert into public.medlemskap (bruker_id, fagmiljo_id) values ('${KONTO.adminB}', ${B}), ('${KONTO.medlem}', ${B});
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${KONTO.adminA}', ${A}), ('${KONTO.adminB}', ${B})
    on conflict do nothing;
  commit;
  insert into auth.sessions (user_id) values ('${KONTO.medlem}');
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

const TILSTAND = `
  select json_build_object(
    'aktive', (select count(*) from public.medlemskap where bruker_id = '${KONTO.medlem}' and status = 'aktiv'),
    'sperret', (select banned_until is not null from auth.users where id = '${KONTO.medlem}'),
    'okter', (select count(*) from auth.sessions where user_id = '${KONTO.medlem}')
  )`

const MAATER = [
  {
    hva: 'med operasjonene, som administratorene i A og B',
    isolasjon: 'read committed',
    avslutt: (f: 'A' | 'B') =>
      `${som(f === 'A' ? KONTO.adminA : KONTO.adminB)} select public.avslutt_medlemskap('${KONTO.medlem}', ${f === 'A' ? A : B});`,
  },
  ...(['read committed', 'repeatable read'] as const).map((isolasjon) => ({
    hva: `direkte i tabellen, i ${isolasjon}`,
    isolasjon,
    avslutt: (f: 'A' | 'B') =>
      // Én setning, så svaret er feilen fra den (psql gir SQLSTATE for den siste).
      `do $$ begin
         perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
         update public.medlemskap set status = 'deaktivert', til = now(), primaer = false
         where bruker_id = '${KONTO.medlem}' and fagmiljo_id = ${f === 'A' ? A : B} and status = 'aktiv';
         update public.medlemskap set primaer = true
         where bruker_id = '${KONTO.medlem}' and fagmiljo_id <> ${f === 'A' ? A : B} and status = 'aktiv';
       end $$;`,
  })),
] as const

describe.skipIf(!SERVER)('samtidige avslutninger av medlemskap (ekte Postgres)', () => {
  const mal = `ousfar_medlemskap_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, KONTOER)
  }, 120_000)

  afterAll(() => {
    for (const db of databaser.reverse()) psql('postgres', `drop database if exists ${db} with (force);`)
  })

  it('kjører på Postgres 17 eller nyere, med kontoen aktiv i begge og innlogget', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
    expect(JSON.parse(psql(mal, TILSTAND))).toEqual({ aktive: 2, sperret: false, okter: 1 })
  })

  it('kjører ikke operasjonene i repeatable read, der kontrollen ville sett et gammelt bilde', async () => {
    const okt = new Okt(mal)
    try {
      expect(await okt.kjor('begin isolation level repeatable read;')).toBe('00000')
      expect(await okt.kjor(MAATER[0].avslutt('A'))).toBe('25001')
      await okt.kjor('rollback;')
    } finally {
      okt.avslutt()
    }
  }, 30_000)

  describe.each(MAATER)('$hva', (maate) => {
    it.each([
      ['A', 'B'],
      ['B', 'A'],
    ] as const)('sperrer kontoen når %s og %s avsluttes samtidig, eller stopper den andre', async (forst, sist) => {
      const db = `${mal}_${databaser.length}`
      psql('postgres', `create database ${db} template ${mal};`)
      databaser.push(db)

      const en = new Okt(db)
      const to = new Okt(db)
      let andreLagret = false
      try {
        expect(await en.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await to.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await en.kjor(maate.avslutt(forst))).toBe('00000')

        // Den andre må vente på den første (den felles låsen).
        const andreSteg = to.send(maate.avslutt(sist))()
        expect(await to.venterFortsatt(andreSteg, 500)).toBe(true)

        expect(await en.kjor('commit;')).toBe('00000')
        const etterVent = await andreSteg
        const commit = await to.kjor(etterVent === '00000' ? 'commit;' : 'rollback;')
        andreLagret = etterVent === '00000' && commit === '00000'
        // I repeatable read ser den andre et gammelt bilde og stoppes (40001).
        if (!andreLagret) expect(['40001', '23514']).toContain(etterVent === '00000' ? commit : etterVent)
      } finally {
        en.avslutt()
        to.avslutt()
      }

      const tilstand = JSON.parse(psql(db, TILSTAND))
      if (andreLagret) expect(tilstand).toEqual({ aktive: 0, sperret: true, okter: 0 })
      else expect(tilstand).toEqual({ aktive: 1, sperret: false, okter: 1 })
      if (maate.isolasjon === 'read committed') expect(andreLagret).toBe(true)
    }, 30_000)
  })
})
