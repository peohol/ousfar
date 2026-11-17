/**
 * P6b: samtidige behandlinger av en gruppeidé, på ekte Postgres med hele
 * databasestrukturen (docs/fagmiljoer.md, «Idéer og oppgaver i gruppene»). Se
 * `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * To ansvarlige i samme gruppe behandler den samme idéen samtidig. Gjør begge
 * den om til en oppgave, får begge den samme oppgaven, og det finnes bare én.
 * Gjør den ene den om mens den andre merker den «Ikke aktuelt», lykkes den ene
 * og den andre får beskjed om at idéen alt er behandlet: idéen blir aldri
 * både en oppgave og ikke aktuell.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  en: '00000000-0000-4000-8000-0000000000c1',
  to: '00000000-0000-4000-8000-0000000000c2',
} as const
const GRUPPE = '00000000-0000-4000-8000-0000000000c9'
const IDE = '00000000-0000-4000-8000-0000000000ca'
const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`

/** To kontoer i A, begge ansvarlige i en gruppe der, og en idé i gruppen. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.idegruppe${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.idegruppe${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  insert into public.grupper (id, navn, art, fagmiljo_id, opprettet_av) values ('${GRUPPE}', 'Samtidig', 'fagmiljo', ${A}, '${KONTO.en}');
  insert into public.gruppemedlemskap (gruppe_id, bruker_id, rolle, status, aktiv_fra)
    values ('${GRUPPE}', '${KONTO.en}', 'ansvarlig', 'aktiv', now()), ('${GRUPPE}', '${KONTO.to}', 'ansvarlig', 'aktiv', now());
  insert into public.ideer (id, gruppe_id, forfatter_id, tittel) values ('${IDE}', '${GRUPPE}', '${KONTO.en}', 'Samtidig idé');
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

type Hvem = keyof typeof KONTO

const GJOR_OM = (hvem: Hvem) => `${som(KONTO[hvem])} select public.gjor_om_til_gruppeoppgave('${IDE}');`
const ARKIVER = (hvem: Hvem) => `${som(KONTO[hvem])} select public.arkiver_ide('${IDE}');`

describe.skipIf(!SERVER)('samtidige behandlinger av en gruppeidé (ekte Postgres)', () => {
  const mal = `ousfar_gruppeideer_${process.pid}_${Date.now()}`
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

  /** Kjører de to stegene samtidig i hver sin transaksjon og gir SQLSTATE for hver, etter commit. */
  async function samtidig(forste: string, andre: string): Promise<[string, string, string]> {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      const forsteSteg = await en.kjor(forste)
      const andreSteg = to.send(andre)()
      const forsteCommit = forsteSteg === '00000' ? en.send('commit;')() : (await en.kjor('rollback;'), Promise.resolve(forsteSteg))
      const etter = await andreSteg
      const andreCommit = etter === '00000' ? await to.kjor('commit;') : (await to.kjor('rollback;'), etter)
      return [await forsteCommit, andreCommit, db]
    } finally {
      en.avslutt()
      to.avslutt()
    }
  }

  it.each([
    ['en', 'to'],
    ['to', 'en'],
  ] as const)('gir én oppgave når %s og %s gjør idéen om samtidig', async (forst, sist) => {
    const [a, b, db] = await samtidig(GJOR_OM(forst), GJOR_OM(sist))
    expect([a, b]).toEqual(['00000', '00000'])
    expect(psql(db, `select count(*) from public.gruppeoppgaver where ide_id = '${IDE}'`)).toBe('1')
  }, 60_000)

  it.each([
    ['gjør om først', GJOR_OM('en'), ARKIVER('to')],
    ['merker ikke aktuelt først', ARKIVER('en'), GJOR_OM('to')],
  ] as const)('lar bare den ene lykkes når den ene %s og den andre gjør det motsatte', async (_hva, forste, andre) => {
    const [a, b, db] = await samtidig(forste, andre)
    expect([a, b].filter((s) => s === '00000'), JSON.stringify([a, b])).toHaveLength(1)
    expect(['55000', '40001', '40P01']).toContain([a, b].find((s) => s !== '00000'))
    const tilstand = psql(
      db,
      `select (arkivert_kl is not null)::text || ',' || exists (select 1 from public.gruppeoppgaver o where o.ide_id = i.id)::text
       from public.ideer i where i.id = '${IDE}'`,
    )
    expect(['true,false', 'false,true']).toContain(tilstand)
  }, 60_000)
})
