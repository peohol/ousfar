/**
 * Personalkalenderen ved samtidige transaksjoner, på ekte Postgres med hele
 * databasestrukturen (#616, docs/personal-database.md, «Samtidighet»; K-DAT-3).
 * Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * To som lagrer oppsettet fra den samme versjonen samtidig: den andre venter
 * og får konflikt (`PT409`), og ingen versjon går tapt. En kommando som kjøres
 * mens en annen fjerner tilgangen til den som handler, venter på
 * tilgangsendringen og kontrolleres etter den. I `repeatable read` stoppes
 * endringene (`25001`). Bare syntetiske medarbeidere i et syntetisk Sandkasse.
 */
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startportSql } from '../faginnhold/migrasjonshistorikk'
import { Okt, psql, SERVER, slettDatabaser } from './hjelp/ektepostgres'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  admin: '00000000-0000-4000-8000-0000000000e1',
  planlegger1: '00000000-0000-4000-8000-0000000000e2',
  planlegger2: '00000000-0000-4000-8000-0000000000e3',
} as const

const S = `(select id from public.fagmiljoer where nokkel = 'sandkasse')`
const UTPROVING = (() => {
  const mappe = resolve(__dirname, '../../supabase/migrations')
  return readFileSync(resolve(mappe, readdirSync(mappe).find((f) => f.endsWith('_personal_utproving.sql'))!), 'utf8')
})()

/** Kontoene og et syntetisk Sandkasse med funksjonen på: en lokal administrator og to vaktplanansvarlige. */
const OPPSETT = /* sql */ `
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Syntetiske kontoer og Sandkasse for samtidighetstesten', true);
  ${Object.entries(KONTO)
    .map(
      ([navn, id]) => `
        insert into public.kontoreservasjoner (username) values ('test.pk${navn}');
        insert into auth.users (id, email) values ('${id}', 'test.pk${navn}@${INTERN_AUTH_DOMENE}');`,
    )
    .join('\n')}
  update public.profiles set must_change_password = false, onboarding_completed = true;
  ${startportSql('sandkasse')}
  insert into public.fagmiljoer (nokkel, navn, apent_for_medlemmer) values ('sandkasse', 'Sandkasse', true);
  update public.fagmiljoer set testmiljo = true where nokkel = 'sandkasse';
  insert into public.medlemskap (bruker_id, fagmiljo_id) select id, ${S} from auth.users where id in (${Object.values(KONTO).map((k) => `'${k}'`).join(', ')});
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${KONTO.admin}', ${S});
  commit;
  begin;
  ${UTPROVING}
  commit;
  begin;
  select set_config('ousfar.tilgangsgrunn', 'Funksjonen på i testmiljøet for samtidighetstesten', true);
  update public.funksjonsbrytere set tilstand = 'på' where funksjon = 'personal' and fagmiljo_id = ${S};
  select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${KONTO.admin}","role":"authenticated"}', true);
  select public.personal_sett_vaktplanansvarlig(${S}, '${KONTO.planlegger1}', true);
  select public.personal_sett_vaktplanansvarlig(${S}, '${KONTO.planlegger2}', true);
  commit;
`

/** Setter den innloggede slik data-API-et gjør det. */
const som = (bruker: string) =>
  `select set_config('role', 'authenticated', true), set_config('request.jwt.claims', '{"sub":"${bruker}","role":"authenticated"}', true);`

describe.skipIf(!SERVER)('samtidige endringer i personalkalenderen (ekte Postgres)', () => {
  const mal = `ousfar_personalkalender_${process.pid}_${Date.now()}`
  const databaser: string[] = []

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, OPPSETT)
  }, 180_000)

  afterAll(() => {
    slettDatabaser(databaser)
  })

  function nyDatabase(): string {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    return db
  }

  /**
   * Første transaksjon kjører `forst`, den andre sender `andre` og venter på
   * låsen til den første er ferdig. Gir svaret på det andre steget og på
   * commit (rollback når steget feilet).
   */
  async function samtidig(db: string, isolasjon: string, forst: string, andre: string): Promise<{ steg: string; commit: string }> {
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      expect(await en.kjor(`begin isolation level ${isolasjon};`)).toBe('00000')
      expect(await to.kjor(`begin isolation level ${isolasjon};`)).toBe('00000')
      expect(await en.kjor(forst)).toBe('00000')
      const svar = to.send(andre)()
      expect(await to.venterFortsatt(svar, 500)).toBe(true)
      expect(await en.kjor('commit;')).toBe('00000')
      const steg = await svar
      const commit = await to.kjor(steg === '00000' ? 'commit;' : 'rollback;')
      return { steg, commit }
    } finally {
      en.avslutt()
      to.avslutt()
    }
  }

  /** Gjør brukeren til lokal administrator i Sandkasse, i tillegg til den som er der. */
  const giAdmin = (db: string, bruker: string) =>
    psql(db, `begin; select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true); insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ('${bruker}', ${S}); commit;`)
  /** Det en administrasjonsfunksjon gjør: tar tilgangslåsen og fjerner brukerens lokale administratorrolle. */
  const fjernAdmin = (bruker: string) =>
    `select intern.las_tilgang(null, 'Syntetisk test: lokal administrator fjernet');
     update public.fagmiljoadministratorer set til = now() where bruker_id = '${bruker}' and fagmiljo_id = ${S} and til is null;`
  const lagre = (db: string) => {
    const regler = psql(db, `select regler from personal.oppsett where fagmiljo_id = ${S} and versjon = 1`)
    return (bruker: string) =>
      `${som(bruker)} select public.personal_lagre_oppsett(${S}, '${JSON.stringify({
        enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false },
        regler: JSON.parse(regler),
      })}', 1);`
  }
  const versjoner = (db: string) => psql(db, `select string_agg(versjon::text, ',' order by versjon) from personal.oppsett where fagmiljo_id = ${S}`)

  describe('i read committed, som data-API-et bruker', () => {
    it('gir konflikt når to lagrer oppsettet fra den samme versjonen', async () => {
      const db = nyDatabase()
      giAdmin(db, KONTO.planlegger1)
      const r = await samtidig(db, 'read committed', lagre(db)(KONTO.admin), lagre(db)(KONTO.planlegger1))
      expect(r.steg).toBe('PT409')
      expect(versjoner(db)).toBe('1,2')
    }, 30_000)
  })

  // Kontrollene etter en lås ville sett tilstanden fra før ventingen (`personal.krev_ferske_data`).
  describe('i repeatable read', () => {
    /** Det som endrer kalenderen eller oppsettet, med navnet i testen. */
    const endringer = (db: string): [string, string][] => [
      ['lagring av oppsettet', lagre(db)(KONTO.admin)],
      ['utpeking', `${som(KONTO.admin)} select public.personal_sett_vaktplanansvarlig(${S}, '${KONTO.planlegger1}', true);`],
      ['kvalifikasjon rett i tabellen', `insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra) select id, 'vakt1', '2099-01-01' from personal.medarbeidere limit 1;`],
    ]

    it('stopper endringene heller enn å avgjøre dem på gamle data', async () => {
      const db = nyDatabase()
      for (const [hva, sql] of endringer(db)) {
        const okt = new Okt(db)
        try {
          expect(await okt.kjor('begin isolation level repeatable read;')).toBe('00000')
          expect(await okt.kjor(sql), hva).toBe('25001')
        } finally {
          okt.avslutt()
        }
      }
      expect(versjoner(db)).toBe('1')
    }, 30_000)
  })

  // Data-API-et kjører hver forespørsel i read committed, og tilgangsendringene krever det (`intern.las_tilgang`).
  describe('når tilgangen fjernes samtidig', () => {
    it('venter med utpekingen av en vaktplanansvarlig, og avviser den når administratorrollen er fjernet', async () => {
      const db = nyDatabase()
      giAdmin(db, KONTO.planlegger1)
      const r = await samtidig(db, 'read committed', fjernAdmin(KONTO.admin), `${som(KONTO.admin)} select public.personal_sett_vaktplanansvarlig(${S}, '${KONTO.planlegger2}', false);`)
      expect(r.steg).toBe('42501')
      expect(psql(db, `select count(*) from personal.vaktplanansvarlige where bruker_id = '${KONTO.planlegger2}' and til is null`)).toBe('1')
    }, 30_000)

    it('venter med lagringen av oppsettet, og avviser den når administratorrollen er fjernet', async () => {
      const db = nyDatabase()
      giAdmin(db, KONTO.planlegger1)
      const r = await samtidig(db, 'read committed', fjernAdmin(KONTO.planlegger1), lagre(db)(KONTO.planlegger1))
      expect(r.steg).toBe('42501')
      expect(versjoner(db)).toBe('1')
    }, 30_000)
  })
})
