/**
 * P5 tråd B1: samtidige endringer av ett endringsforslag, på ekte Postgres 17
 * med hele databasestrukturen (docs/redaktorer-og-forslag.md, «Konflikter og
 * samtidighet»). Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * - Forslagsstilleren trekker forslaget mens en behandler godkjenner det
 *   (med den felles overgangen tråd C bruker): nøyaktig én lykkes, og den
 *   andre får PT409, uansett rekkefølge.
 * - To innsendinger samtidig når personen har plass til bare ett åpent
 *   forslag til: nøyaktig én kommer forbi grensen.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  stiller: '00000000-0000-4000-8000-0000000000c1',
  arkitekt: '00000000-0000-4000-8000-0000000000c2',
} as const
/** Forslaget fra oppsettet, det eldste. */
const FORSLAG = `(select id from public.endringsforslag order by opprettet_kl, id limit 1)`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

/** Som den innloggede, men med rettighetene til databasen, slik en funksjon i `public` kaller `intern`. */
const somIntern = (bruker: string) => `select set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

/**
 * To kontoer i standardfagmiljøet: forslagsstilleren og en systemarkitekt.
 * Systemarkitekten lager og publiserer en fagside gjennom de vanlige
 * funksjonene, og forslagsstilleren sender ett forslag til den.
 */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.forslag${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.forslag${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.systemroller (bruker_id, rolle) values ('${KONTO.arkitekt}', 'systemarkitekt');
  commit;
  begin;
  ${som(KONTO.arkitekt)}
  select (public.opprett_utkast('infoside', '{"navn": "Samtidig middel"}'::jsonb)).id as side \\gset
  select public.publiser_utkast(:'side', 1) is not null;
  commit;
  begin;
  ${som(KONTO.stiller)}
  select public.foresla_endring(:'side', null, 1, null, null, null, 'Syntetisk forslag', 'Syntetisk begrunnelse', '[]'::jsonb) is not null;
  commit;
`

const STATUS = `select status from public.endringsforslag where id = ${FORSLAG}`

describe.skipIf(!SERVER)('samtidige endringer av et forslag (ekte Postgres)', () => {
  const mal = `ousfar_forslag_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, OPPSETT)
  }, 120_000)

  afterAll(() => {
    slettDatabaser(databaser)
  })

  const nyDatabase = () => {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    return db
  }

  it('kjører på Postgres 17 eller nyere, med ett nytt forslag', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
    expect(psql(mal, STATUS)).toBe('ny')
  })

  const HANDLINGER = {
    trekk: (id: string) => `${som(KONTO.stiller)} select public.trekk_forslag('${id}');`,
    godkjenn: (id: string) =>
      `${somIntern(KONTO.arkitekt)} select intern.forslagsovergang('${id}', array['ny', 'under_behandling'], 'godkjent', 'godkjent');`,
  } as const
  type Handling = keyof typeof HANDLINGER

  it.each([
    ['trekk', 'godkjenn'],
    ['godkjenn', 'trekk'],
  ] as const)('%s først: den andre venter på låsen og får PT409', async (forst: Handling, sist: Handling) => {
    const db = nyDatabase()
    const id = psql(db, `select ${FORSLAG}`)
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      expect(await en.kjor(HANDLINGER[forst](id))).toBe('00000')
      const andre = to.send(HANDLINGER[sist](id))()
      expect(await to.venterFortsatt(andre, 300)).toBe(true)
      expect(await en.kjor('commit;')).toBe('00000')
      expect(await andre).toBe('PT409')
      await to.kjor('rollback;')
    } finally {
      en.avslutt()
      to.avslutt()
    }
    expect(psql(db, STATUS)).toBe(forst === 'trekk' ? 'trukket' : 'godkjent')
    expect(psql(db, `select string_agg(art, ',' order by id) from public.endringsforslag_hendelser where forslag_id = ${FORSLAG}`)).toBe(
      `opprettet,${forst === 'trekk' ? 'trukket' : 'godkjent'}`,
    )
  }, 60_000)

  it('to samtidige innsendinger kommer ikke begge forbi grensen for åpne forslag', async () => {
    const db = nyDatabase()
    const side = psql(db, `select ressurs_id from public.endringsforslag where id = ${FORSLAG}`)
    const maks = Number(psql(db, 'select intern.maks_apne_forslag();'))
    // Fyller opp til én plass er igjen (forslaget fra oppsettet er det første).
    psql(
      db,
      `begin; ${som(KONTO.stiller)}
       select public.foresla_endring('${side}', null, 1, null, null, null, 'Fyll', 'Fyll', '[]'::jsonb) from generate_series(1, ${maks - 2});
       commit;`,
    )
    const send = `${som(KONTO.stiller)} select public.foresla_endring('${side}', null, 1, null, null, null, 'Samtidig', 'Samtidig', '[]'::jsonb);`
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      expect(await en.kjor(send)).toBe('00000')
      const andre = to.send(send)()
      expect(await to.venterFortsatt(andre, 300)).toBe(true)
      expect(await en.kjor('commit;')).toBe('00000')
      expect(await andre).toBe('22023')
      await to.kjor('rollback;')
    } finally {
      en.avslutt()
      to.avslutt()
    }
    expect(Number(psql(db, `select count(*) from public.endringsforslag where stilt_av = '${KONTO.stiller}' and status = 'ny'`))).toBe(maks)
  }, 60_000)
})
