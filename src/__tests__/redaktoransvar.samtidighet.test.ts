/**
 * P5 tråd A: redaktøransvar ved samtidige transaksjoner, på ekte Postgres med
 * hele databasestrukturen (docs/redaktorer-og-forslag.md, «Redaktøransvar»).
 * Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * To administratorer gir det samme ansvaret samtidig: den andre venter på den
 * felles låsen og får det samme ansvaret tilbake, så det blir bare én rad.
 * Og et ansvar som gis mens medlemskapet i fagmiljøet avsluttes, gjelder ikke
 * når begge er ferdige, uansett hvem som kom først.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  arkitekt: '00000000-0000-4000-8000-0000000000c1',
  admin: '00000000-0000-4000-8000-0000000000c2',
  admin2: '00000000-0000-4000-8000-0000000000c3',
  medlem: '00000000-0000-4000-8000-0000000000c4',
} as const

const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`

/** Kontoene, alle med primærmedlemskap i A (standard); to lokale administratorer der. */
const KONTOER = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.red${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.red${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.systemroller (bruker_id, rolle)
    select '${KONTO.arkitekt}', 'systemarkitekt'
    where not exists (select 1 from public.systemroller where bruker_id = '${KONTO.arkitekt}');
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${KONTO.admin}', ${A}), ('${KONTO.admin2}', ${A})
    on conflict do nothing;
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

const gi = (admin: string) =>
  `${som(admin)} select public.tildel_redaktoransvar('${KONTO.medlem}', 'fortolkning', null, ${A});`

/** Ansvarene til medlemmet: hvor mange rader som står, og hvor mange som gjelder. */
const ANSVAR = `
  select json_build_object(
    'rader', (select count(*) from public.redaktoransvar where bruker_id = '${KONTO.medlem}' and tilbakekalt_kl is null),
    'gjelder', (select count(*) from intern.aktive_redaktoransvar('${KONTO.medlem}'))
  )`

const AVSLUTT = {
  operasjonen: `${som(KONTO.arkitekt)} select public.avslutt_medlemskap('${KONTO.medlem}', ${A});`,
  tabellen: `do $$ begin
      perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
      update public.medlemskap set status = 'deaktivert', til = now(), primaer = false
      where bruker_id = '${KONTO.medlem}' and fagmiljo_id = ${A} and status = 'aktiv';
    end $$;`,
} as const

describe.skipIf(!SERVER)('samtidige endringer av redaktøransvar (ekte Postgres)', () => {
  const mal = `ousfar_redaktoransvar_${process.pid}_${Date.now()}`
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

  function nyDatabase(): string {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    return db
  }

  it('gir én rad når to administratorer gir det samme ansvaret samtidig', async () => {
    const db = nyDatabase()
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      expect(await en.kjor(gi(KONTO.admin))).toBe('00000')

      // Den andre venter på den felles låsen for tilgangene.
      const andre = to.send(gi(KONTO.admin2))()
      expect(await to.venterFortsatt(andre, 500)).toBe(true)

      expect(await en.kjor('commit;')).toBe('00000')
      expect(await andre).toBe('00000')
      expect(await to.kjor('commit;')).toBe('00000')
    } finally {
      en.avslutt()
      to.avslutt()
    }
    expect(JSON.parse(psql(db, ANSVAR))).toEqual({ rader: 1, gjelder: 1 })
  }, 30_000)

  describe.each(Object.entries(AVSLUTT))('når medlemskapet avsluttes med %s', (_, avslutt) => {
    it.each([
      ['ansvaret gis først', true],
      ['medlemskapet avsluttes først', false],
    ] as const)('gjelder ikke ansvaret etterpå, når %s', async (_, ansvarForst) => {
      const db = nyDatabase()
      const en = new Okt(db)
      const to = new Okt(db)
      try {
        expect(await en.kjor('begin;')).toBe('00000')
        expect(await to.kjor('begin;')).toBe('00000')
        expect(await en.kjor(ansvarForst ? gi(KONTO.admin) : avslutt)).toBe('00000')

        const andre = to.send(ansvarForst ? avslutt : gi(KONTO.admin))()
        expect(await to.venterFortsatt(andre, 500)).toBe(true)

        expect(await en.kjor('commit;')).toBe('00000')
        const svar = await andre
        // Er medlemskapet avsluttet først, stoppes tildelingen (55000).
        expect(svar).toBe(ansvarForst ? '00000' : '55000')
        expect(await to.kjor(svar === '00000' ? 'commit;' : 'rollback;')).toBe('00000')
      } finally {
        en.avslutt()
        to.avslutt()
      }
      expect(JSON.parse(psql(db, ANSVAR))).toEqual({ rader: 0, gjelder: 0 })
    }, 30_000)
  })
})
