/**
 * P5 tråd A: redaktøransvar ved samtidige transaksjoner, på ekte Postgres med
 * hele databasestrukturen (docs/redaktorer-og-forslag.md, «Redaktøransvar»).
 * Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * To administratorer gir det samme ansvaret samtidig: den andre venter på den
 * felles låsen og får det samme ansvaret tilbake, så det blir bare én rad.
 * Og et ansvar som gis mens medlemskapet i fagmiljøet avsluttes, gjelder ikke
 * når begge er ferdige, uansett hvem som kom først, gjennom operasjonene og
 * rett i tabellene (som en systemarkitekt i Supabase), også i
 * `repeatable read`; og det kommer ikke tilbake når medlemskapet gis på nytt.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
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

/** Ansvaret og avslutningen av medlemskapet, gjennom operasjonene eller rett i tabellene. */
const MAATER = [
  {
    hva: 'gjennom operasjonene',
    isolasjon: 'read committed',
    gi: gi(KONTO.admin),
    avslutt: `${som(KONTO.arkitekt)} select public.avslutt_medlemskap('${KONTO.medlem}', ${A});`,
  },
  ...(['read committed', 'repeatable read'] as const).map((isolasjon) => ({
    hva: `rett i tabellene, i ${isolasjon}`,
    isolasjon,
    // Én setning hver, så svaret er feilen fra den (psql gir SQLSTATE for den siste).
    gi: `do $$ begin
        perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
        insert into public.redaktoransvar (bruker_id, omrade, fagmiljo_id, tildelt_av)
        values ('${KONTO.medlem}', 'fortolkning', ${A}, '${KONTO.arkitekt}');
      end $$;`,
    avslutt: `do $$ begin
        perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
        update public.medlemskap set status = 'deaktivert', til = now(), primaer = false
        where bruker_id = '${KONTO.medlem}' and fagmiljo_id = ${A} and status = 'aktiv';
      end $$;`,
  })),
] as const

/** Gir medlemskapet på nytt, som en administrator gjør det. */
const GI_MEDLEMSKAP = `begin; ${som(KONTO.admin)} select public.gi_medlemskap('${KONTO.medlem}', ${A}); commit;`

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
    slettDatabaser(databaser)
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

  describe.each(MAATER)('$hva', (maate) => {
    it.each([
      ['ansvaret gis først', true],
      ['medlemskapet avsluttes først', false],
    ] as const)('gjelder ikke ansvaret etterpå, heller ikke med et nytt medlemskap, når %s', async (_, ansvarForst) => {
      const db = nyDatabase()
      const en = new Okt(db)
      const to = new Okt(db)
      let andre = ''
      try {
        expect(await en.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await to.kjor(`begin isolation level ${maate.isolasjon};`)).toBe('00000')
        expect(await en.kjor(ansvarForst ? maate.gi : maate.avslutt)).toBe('00000')

        // Den andre venter på den felles låsen for tilgangene.
        const steg = to.send(ansvarForst ? maate.avslutt : maate.gi)()
        expect(await to.venterFortsatt(steg, 500)).toBe(true)

        expect(await en.kjor('commit;')).toBe('00000')
        andre = await steg
        const commit = await to.kjor(andre === '00000' ? 'commit;' : 'rollback;')
        expect(commit).toBe('00000')
      } finally {
        en.avslutt()
        to.avslutt()
      }
      // Avsluttes medlemskapet først, stoppes tildelingen (55000, eller 40001 i
      // repeatable read). Gis ansvaret først, går avslutningen gjennom.
      if (ansvarForst) expect(andre).toBe('00000')
      else expect(['55000', '40001']).toContain(andre)
      if (maate.isolasjon === 'read committed') expect(JSON.parse(psql(db, ANSVAR))).toEqual({ rader: 0, gjelder: 0 })
      else expect(JSON.parse(psql(db, ANSVAR))).toMatchObject({ gjelder: 0 })

      psql(db, GI_MEDLEMSKAP)
      expect(JSON.parse(psql(db, ANSVAR))).toMatchObject({ gjelder: 0 })
    }, 30_000)
  })
})
