/**
 * Opprettelse av brukere i et fagmiljø ved samtidige transaksjoner, på ekte
 * Postgres 17 med hele databasestrukturen (docs/fagmiljoer.md, «Opprettelse
 * av brukere»). Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * - Den lokale administratoren i B oppretter en konto mens en systemarkitekt
 *   tilbakekaller adminskapet hennes. Den andre venter på den første (den
 *   felles låsen): kom opprettelsen først, finnes kontoen i B; kom
 *   tilbakekallingen først, blir det ingen konto, profil eller medlemskap.
 * - Administratorene i A og B klarerer det samme brukernavnet samtidig. Den
 *   andre venter og stoppes (`55P03`), så ingen kan få ut passordet til en
 *   konto den andre bestilte i sitt fagmiljø.
 * - Den samme administratoren prøver igjen mens det første forsøket rydder
 *   opp etter en feil. Oppryddingen, med nøkkelen fra det første forsøket,
 *   fjerner ikke det nye forsøkets reservasjon, og det nye forsøket får
 *   kontoen.
 * - Auth oppretter én konto mens en klarering med den felles låsen overtar en
 *   utløpt reservasjon for et annet brukernavn. Utløseren tar låsen før den
 *   rydder bort utløpte reservasjoner, så begge blir ferdige uten vranglås,
 *   også når den nye kontoen er uten aktør (oppstartsskriptet).
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { Okt, psql, SERVER } from './hjelp/ektepostgres'
import { startportSql } from '../faginnhold/migrasjonshistorikk'
import { strukturskript } from './hjelp/migrasjonskjoring'

const KONTO = {
  arkitekt: '00000000-0000-4000-8000-0000000000b1',
  adminA: '00000000-0000-4000-8000-0000000000b2',
  adminB: '00000000-0000-4000-8000-0000000000b3',
} as const

const A = `(select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi')`
const B = `(select id from public.fagmiljoer where nokkel = 'ous-rettstoksikologi')`

/**
 * Kontoene, opprettet slik oppstartsskriptet gjør det (standardfagmiljøet A).
 * Systemarkitekten er også administrator i B, så B har en til når adminB
 * tilbakekalles (regel 3).
 */
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
  update public.medlemskap set primaer = false where bruker_id = '${KONTO.adminB}';
  insert into public.medlemskap (bruker_id, fagmiljo_id, primaer) values ('${KONTO.adminB}', ${B}, true), ('${KONTO.arkitekt}', ${B}, false);
  update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = '${KONTO.adminB}' and fagmiljo_id = ${A};
  insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id)
    values ('${KONTO.adminA}', ${A}), ('${KONTO.adminB}', ${B}), ('${KONTO.arkitekt}', ${B})
    on conflict do nothing;
  commit;
`

/** Som Edge-funksjonen: den hemmelige nøkkelen, resten av transaksjonen. */
const SOM_SERVER = `select set_config('role', 'service_role', true), set_config('request.jwt.claims', '{"role":"service_role"}', true);`

/** Klareringen, med den innloggedes ID som aktør, som én setning (psql gir SQLSTATE for den siste). */
const klarering = (aktor: string, brukernavn: string, fagmiljo: string) =>
  `select public.kontooperasjon_klarer_konto('${aktor}', '${brukernavn}', ${fagmiljo});`

/** Klareringen i en egen transaksjon, slik Edge-funksjonen gjør den før Auth-brukeren opprettes. */
const klarer = (aktor: string, brukernavn: string, fagmiljo: string) =>
  `begin; ${SOM_SERVER} ${klarering(aktor, brukernavn, fagmiljo)} commit;`

/** Som Supabase Auth når kontoen opprettes. */
const authBruker = (brukernavn: string) => `insert into auth.users (email) values ('${brukernavn}@${INTERN_AUTH_DOMENE}');`

/** Som en systemarkitekt i Supabase: adminB er ikke lenger administrator i B. */
const TILBAKEKALL = `do $$ begin
  perform set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true);
  update public.fagmiljoadministratorer set til = now() where bruker_id = '${KONTO.adminB}' and til is null;
end $$;`

const tilstand = (db: string, brukernavn: string) =>
  JSON.parse(
    psql(
      db,
      `select json_build_object(
         'konto', exists (select 1 from public.profiles where username = '${brukernavn}'),
         'medlemskap', coalesce((select json_agg(f.nokkel order by f.nokkel) from public.medlemskap m
                                 join public.profiles p on p.id = m.bruker_id join public.fagmiljoer f on f.id = m.fagmiljo_id
                                 where p.username = '${brukernavn}'), '[]'),
         'adminB', exists (select 1 from public.fagmiljoadministratorer where bruker_id = '${KONTO.adminB}' and til is null),
         'reservert_av', (select aktor from public.kontoreservasjoner where username = '${brukernavn}')
       )`,
    ),
  ) as { konto: boolean; medlemskap: string[]; adminB: boolean; reservert_av: string | null }

describe.skipIf(!SERVER)('samtidig opprettelse av brukere i et fagmiljø (ekte Postgres)', () => {
  const mal = `ousfar_opprettelse_${process.pid}_${Date.now()}`
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

  /** En ny database fra malen, for ett tilfelle. */
  const nyDb = () => {
    const db = `${mal}_${databaser.length}`
    psql('postgres', `create database ${db} template ${mal};`)
    databaser.push(db)
    return db
  }

  it('kjører på Postgres 17 eller nyere, med adminB som administrator i B', () => {
    expect(Number(psql(mal, 'show server_version_num;'))).toBeGreaterThanOrEqual(170000)
    expect(tilstand(mal, 'test.adminb')).toEqual({ konto: true, medlemskap: ['ous-klinisk-farmakologi', 'ous-rettstoksikologi'], adminB: true, reservert_av: null })
  })

  it.each([
    ['opprettelsen', 'tilbakekallingen'],
    ['tilbakekallingen', 'opprettelsen'],
  ] as const)('lar %s og %s skje én etter én, og gir aldri en konto uten myndighet', async (forst, _deretter) => {
    const db = nyDb()
    psql(db, klarer(KONTO.adminB, 'ny.rt', B))
    const opprettelse = new Okt(db)
    const tilbakekalling = new Okt(db)
    const [en, to] = forst === 'opprettelsen' ? [opprettelse, tilbakekalling] : [tilbakekalling, opprettelse]
    const steg = (okt: Okt) => (okt === opprettelse ? authBruker('ny.rt') : TILBAKEKALL)
    let opprettet = false
    try {
      expect(await en.kjor('begin;')).toBe('00000')
      expect(await to.kjor('begin;')).toBe('00000')
      expect(await en.kjor(steg(en))).toBe('00000')

      // Den andre må vente på den første (den felles låsen).
      const andre = to.send(steg(to))()
      expect(await to.venterFortsatt(andre, 500)).toBe(true)
      expect(await en.kjor('commit;')).toBe('00000')

      const svar = await andre
      if (forst === 'opprettelsen') {
        expect(svar).toBe('00000')
        opprettet = true
      } else {
        // Myndigheten kontrolleres på nytt under låsen og er borte.
        expect(svar).toBe('42501')
      }
      expect(await to.kjor(svar === '00000' ? 'commit;' : 'rollback;')).toBe('00000')
    } finally {
      opprettelse.avslutt()
      tilbakekalling.avslutt()
    }

    const etter = tilstand(db, 'ny.rt')
    expect(etter.adminB).toBe(false)
    if (opprettet) expect(etter).toMatchObject({ konto: true, medlemskap: ['ous-rettstoksikologi'], reservert_av: null })
    // Reservasjonen står til Edge-funksjonen trekker den tilbake.
    else expect(etter).toEqual({ konto: false, medlemskap: [], adminB: false, reservert_av: KONTO.adminB })
  }, 30_000)

  it('lar oppryddingen etter et gammelt forsøk stå urørt når den samme administratoren alt har prøvd igjen', async () => {
    const db = nyDb()
    const gammelt = new Okt(db)
    const nytt = new Okt(db)
    /** Nøkkelen fra klareringen (`reservasjon`), som Edge-funksjonen bruker for å trekke den tilbake. */
    const nokkel = (sql: string) => /([0-9a-f-]{36})\s*$/.exec(psql(db, sql))![1]!
    const klareringMedNokkel = `begin; ${SOM_SERVER}
      select public.kontooperasjon_klarer_konto('${KONTO.adminB}', 'nytt.forsok', ${B}) ->> 'reservasjon'; commit;`
    /** Som `frigiBrukernavn`: bare reservasjonen med nøkkelen. */
    const frigi = (n: string) => `delete from public.kontoreservasjoner where username = 'nytt.forsok' and nokkel = '${n}';`
    try {
      // Det første forsøket klarerer, og feiler så (for eksempel hos Auth).
      const forste = nokkel(klareringMedNokkel)
      // Det nye forsøket klarerer på nytt og er i gang med å opprette kontoen.
      const andre = nokkel(klareringMedNokkel)
      expect(andre).not.toBe(forste)
      expect(await nytt.kjor('begin;')).toBe('00000')
      // Det første forsøket rydder opp mens det nye venter på Auth.
      expect(await gammelt.kjor(frigi(forste))).toBe('00000')
      expect(await nytt.kjor(authBruker('nytt.forsok'))).toBe('00000')
      expect(await nytt.kjor('commit;')).toBe('00000')
    } finally {
      gammelt.avslutt()
      nytt.avslutt()
    }
    expect(tilstand(db, 'nytt.forsok')).toMatchObject({ konto: true, medlemskap: ['ous-rettstoksikologi'], reservert_av: null })
  }, 30_000)

  it.each([
    ['en administrator', `'${KONTO.adminB}'`],
    ['oppstartsskriptet (uten aktør)', 'null'],
  ] as const)(
    'gir ingen vranglås når Auth oppretter én konto mens en klarering overtar en utløpt reservasjon (ny konto bestilt av %s)',
    async (_bestiller, aktor) => {
      const db = nyDb()
      // En utløpt reservasjon for X, og en fersk for Y som Auth skal opprette nå.
      psql(
        db,
        `insert into public.kontoreservasjoner (username, reservert_kl, aktor, fagmiljo_id)
           values ('utlopt.x', now() - interval '1 hour', '${KONTO.adminB}', ${B}),
                  ('ny.y', now(), ${aktor}, ${aktor === 'null' ? 'null' : B});`,
      )
      const auth = new Okt(db)
      const overtakelse = new Okt(db)
      try {
        // Klareringen av X har tatt den felles låsen og skal til å overta raden.
        expect(await overtakelse.kjor('begin;')).toBe('00000')
        expect(await overtakelse.kjor(SOM_SERVER)).toBe('00000')
        expect(await overtakelse.kjor(`select pg_advisory_xact_lock(hashtextextended('ousfar.tilgang', 0));`)).toBe('00000')

        // Auth oppretter Y og venter på låsen uten å ha rørt X.
        expect(await auth.kjor('begin;')).toBe('00000')
        const opprettelse = auth.send(authBruker('ny.y'))()
        expect(await auth.venterFortsatt(opprettelse, 500)).toBe(true)

        // Klareringen får X og blir ferdig; så blir Auth ferdig.
        expect(await overtakelse.kjor(klarering(KONTO.adminA, 'utlopt.x', A))).toBe('00000')
        expect(await overtakelse.kjor('commit;')).toBe('00000')
        expect(await opprettelse).toBe('00000')
        expect(await auth.kjor('commit;')).toBe('00000')
      } finally {
        auth.avslutt()
        overtakelse.avslutt()
      }
      expect(tilstand(db, 'utlopt.x')).toMatchObject({ konto: false, reservert_av: KONTO.adminA })
      expect(tilstand(db, 'ny.y')).toMatchObject({
        konto: true,
        medlemskap: [aktor === 'null' ? 'ous-klinisk-farmakologi' : 'ous-rettstoksikologi'],
        reservert_av: null,
      })
    },
    30_000,
  )

  it.each([
    ['adminA', 'adminB'],
    ['adminB', 'adminA'],
  ] as const)('stopper %s sin rival %s når begge klarerer samme brukernavn samtidig', async (forst, sist) => {
    const db = nyDb()
    const fagmiljo = { adminA: A, adminB: B } as const
    const en = new Okt(db)
    const to = new Okt(db)
    try {
      for (const okt of [en, to]) {
        expect(await okt.kjor('begin;')).toBe('00000')
        expect(await okt.kjor(SOM_SERVER)).toBe('00000')
      }
      expect(await en.kjor(klarering(KONTO[forst], 'omstridt', fagmiljo[forst]))).toBe('00000')

      const andre = to.send(klarering(KONTO[sist], 'omstridt', fagmiljo[sist]))()
      expect(await to.venterFortsatt(andre, 500)).toBe(true)
      expect(await en.kjor('commit;')).toBe('00000')
      expect(await andre).toBe('55P03')
      expect(await to.kjor('rollback;')).toBe('00000')
    } finally {
      en.avslutt()
      to.avslutt()
    }
    expect(tilstand(db, 'omstridt')).toMatchObject({ konto: false, reservert_av: KONTO[forst] })
  }, 30_000)
})
