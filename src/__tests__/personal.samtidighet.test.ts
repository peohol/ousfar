/**
 * Personalkalenderen ved samtidige transaksjoner, på ekte Postgres med hele
 * databasestrukturen (#616, docs/personal-database.md, «Samtidighet»; K-DAT-3).
 * Se `fagmiljoer.samtidighet.test.ts` for oppsettet.
 *
 * To planleggere endrer den samme cellen, eller gir den samme vakten til hver
 * sin medarbeider samme dag, samtidig. Den andre venter på låsen for datoen og
 * avvises når den første er ferdig: med konflikt (`PT409`) eller med
 * regelbruddet. Ingen endring går tapt, og grensene holder også rett i
 * tabellen. Fritaket mot en samtidig statusendring, to lagringer av
 * oppsettet, og oppsettet mot kalenderen gir det samme. En kommando som kjøres
 * mens en annen fjerner tilgangen til den som handler, venter på
 * tilgangsendringen og kontrolleres etter den. I `repeatable read` stoppes
 * endringene (`25001`). Bare syntetiske medarbeidere i et syntetisk Sandkasse.
 */
import { INTERN_AUTH_DOMENE } from '@delt/brukernavn'
import { addDays, holidaysForYear, todayIn, weekdayIndex } from '@delt/personal/dates'
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

/** En tirsdag minst to uker frem, i en uke uten helligdager. */
function tirsdag(): string {
  const iDag = todayIn('Europe/Oslo')
  let d = addDays(iDag, 15 - weekdayIndex(iDag))
  while ([0, 1, 2, 3, 4].some((i) => holidaysForYear(Number(addDays(d, i).slice(0, 4))).has(addDays(d, i)))) d = addDays(d, 7)
  return d
}

describe.skipIf(!SERVER)('samtidige endringer i personalkalenderen (ekte Postgres)', () => {
  const mal = `ousfar_personalkalender_${process.pid}_${Date.now()}`
  const databaser: string[] = []
  let ider: Record<string, string> = {}
  const dato = tirsdag()

  beforeAll(() => {
    psql('postgres', `create database ${mal};`)
    databaser.push(mal)
    psql(mal, strukturskript())
    psql(mal, OPPSETT)
    ider = JSON.parse(psql(mal, 'select json_object_agg(syntetisk_navn, id) from personal.medarbeidere'))
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

  const endre = (bruker: string, endringer: { navn: string; revisjon?: number | null; status: string | null; merknad?: string }[]) =>
    `${som(bruker)} select public.personal_endre_kalender(${S}, '${JSON.stringify(
      endringer.map(({ navn, revisjon, ...rest }) => ({ medarbeider: ider[navn], dato, revisjon: revisjon ?? null, ...rest })),
    )}');`
  const celler = (db: string) =>
    JSON.parse(
      psql(
        db,
        `select coalesce(json_agg(json_build_object('navn', m.syntetisk_navn, 'status', o.status_id, 'revisjon', o.revisjon, 'fritak', o.fritak, 'fritak_revisjon', o.fritak_revisjon) order by m.syntetisk_navn), '[]')
         from personal.oppforinger o join personal.medarbeidere m on m.id = o.medarbeider_id where o.dato = '${dato}'`,
      ),
    ) as { navn: string; status: string; revisjon: number; fritak: boolean; fritak_revisjon: number }[]

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
  /** Det `avslutt_medlemskap` gjør: tar tilgangslåsen og avslutter brukerens medlemskap i Sandkasse. */
  const avsluttMedlemskap = (bruker: string) =>
    `select intern.las_tilgang(null, 'Syntetisk test: medlemskap avsluttet');
     update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = '${bruker}' and fagmiljo_id = ${S} and status <> 'deaktivert';`
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

    it('gir konflikt, ikke tap, når to legger inn en status i den samme tomme cellen', async () => {
      const db = nyDatabase()
      const r = await samtidig(db, 'read committed', endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'borte' }]), endre(KONTO.planlegger2, [{ navn: 'Alma Berg', status: 'ferie' }]))
      expect(r.steg).toBe('PT409')
      expect(celler(db).map((c) => [c.navn, c.status])).toEqual([['Alma Berg', 'borte']])
    }, 30_000)

    it('gir konflikt når to endrer den samme cellen fra den samme revisjonen', async () => {
      const db = nyDatabase()
      psql(db, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'borte' }])} commit;`)
      const revisjon = celler(db)[0]!.revisjon
      const r = await samtidig(
        db,
        'read committed',
        endre(KONTO.planlegger1, [{ navn: 'Alma Berg', revisjon, status: 'ferie' }]),
        endre(KONTO.planlegger2, [{ navn: 'Alma Berg', revisjon, status: 'hjemmekontor' }]),
      )
      expect(r.steg).toBe('PT409')
      expect(celler(db).map((c) => c.status)).toEqual(['ferie'])
    }, 30_000)

    it('gir vakten til bare én når to tildeler den til hver sin samme dag', async () => {
      const db = nyDatabase()
      const r = await samtidig(db, 'read committed', endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'vakt1' }]), endre(KONTO.planlegger2, [{ navn: 'Tobias Lunde', status: 'vakt1' }]))
      // Regelbruddet: «Vakt 1 er alt tildelt samme dag.»
      expect(r.steg).toBe('22023')
      expect(celler(db).filter((c) => c.status === 'vakt1').map((c) => c.navn)).toEqual(['Alma Berg'])
    }, 30_000)

    it('holder grensen rett i tabellen, forbi kommandoene', async () => {
      const db = nyDatabase()
      const ny = (navn: string) =>
        `insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values (${S}, '${ider[navn]}', '${dato}', 'vakt1', 1);`
      const r = await samtidig(db, 'read committed', ny('Alma Berg'), ny('Tobias Lunde'))
      // Den andre venter på datoen, og stoppes av grensen ved commit.
      expect([r.steg, r.commit]).toEqual(['00000', '23514'])
      expect(celler(db).filter((c) => c.status === 'vakt1').map((c) => c.navn)).toEqual(['Alma Berg'])
    }, 30_000)

    it('gir konflikt når fritaket settes mens statusen endres', async () => {
      const db = nyDatabase()
      psql(db, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', status: 'borte' }])} commit;`)
      const o = celler(db)[0]!
      const r = await samtidig(
        db,
        'read committed',
        endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', revisjon: o.revisjon, status: 'hjemmekontor' }]),
        `${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Noor Aasen']}', '${dato}', true, ${o.revisjon}, ${o.fritak_revisjon});`,
      )
      expect(r.steg).toBe('PT409')
      expect(celler(db).map((c) => [c.status, c.fritak])).toEqual([['hjemmekontor', false]])
    }, 30_000)

    it('gir en vanlig konflikt eller en lagret endring, ingen vranglås, når fritaket og flere celler samme dag endres samtidig', async () => {
      const db = nyDatabase()
      psql(db, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', status: 'borte' }])} commit;`)
      const o = celler(db)[0]!
      const fritak = `${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Noor Aasen']}', '${dato}', true, ${o.revisjon}, ${o.fritak_revisjon});`
      const merknad = endre(KONTO.planlegger1, [
        { navn: 'Tobias Lunde', status: 'ferie' },
        { navn: 'Noor Aasen', revisjon: o.revisjon, status: 'borte', merknad: 'Rom 2' },
      ])
      // Fritaket først: merknaden har den samme revisjonen og lagres etterpå.
      expect(await samtidig(db, 'read committed', fritak, merknad)).toEqual({ steg: '00000', commit: '00000' })
      // Merknaden først: fritaket mot den gamle revisjonen er en vanlig konflikt.
      const db2 = nyDatabase()
      psql(db2, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', status: 'borte' }])} commit;`)
      const o2 = celler(db2)[0]!
      const r = await samtidig(
        db2,
        'read committed',
        endre(KONTO.planlegger1, [
          { navn: 'Tobias Lunde', status: 'ferie' },
          { navn: 'Noor Aasen', revisjon: o2.revisjon, status: 'borte', merknad: 'Rom 2' },
        ]),
        `${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Noor Aasen']}', '${dato}', true, ${o2.revisjon}, ${o2.fritak_revisjon});`,
      )
      expect(r.steg).toBe('PT409')
      // Begge rekkefølgene lagrer hele merknadsendringen; fritaket bare når det kom først.
      expect(celler(db).map((c) => [c.navn, c.status, c.fritak])).toEqual([['Noor Aasen', 'borte', true], ['Tobias Lunde', 'ferie', false]])
      expect(celler(db2).map((c) => [c.navn, c.status, c.fritak])).toEqual([['Noor Aasen', 'borte', false], ['Tobias Lunde', 'ferie', false]])
    }, 30_000)

    it('tar datoen før raden også for fritaket, så ingen venter i ring', async () => {
      const db = nyDatabase()
      psql(db, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', status: 'borte' }])} commit;`)
      const o = celler(db)[0]!
      const [en, to, tre] = [new Okt(db), new Okt(db), new Okt(db)]
      try {
        expect(await en.kjor(`begin; ${endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'ferie' }])}`)).toBe('00000')
        const fritak = to.send(`begin; ${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Noor Aasen']}', '${dato}', true, ${o.revisjon}, ${o.fritak_revisjon});`)()
        expect(await to.venterFortsatt(fritak, 500)).toBe(true)
        // Fritaket venter på datoen uten å holde raden: en tredje får raden straks.
        expect(await tre.kjor(`begin; select 1 from personal.oppforinger where medarbeider_id = '${ider['Noor Aasen']}' and dato = '${dato}' for update nowait; rollback;`)).toBe('00000')
        expect(await en.kjor('commit;')).toBe('00000')
        expect(await fritak).toBe('00000')
        expect(await to.kjor('commit;')).toBe('00000')
      } finally {
        en.avslutt()
        to.avslutt()
        tre.avslutt()
      }
    }, 30_000)

    describe('når oppsettet fjerner en status samtidig som den tas i bruk', () => {
      const utenHjemmekontor = (db: string) => {
        const regler = JSON.parse(psql(db, `select regler from personal.oppsett where fagmiljo_id = ${S} and versjon = 1`))
        regler.statuses = regler.statuses.filter((x: { id: string }) => x.id !== 'hjemmekontor')
        return `${som(KONTO.admin)} select public.personal_lagre_oppsett(${S}, '${JSON.stringify({
          enhet: { timeZone: 'Europe/Oslo', workYearStartMonth: 1, hideWeekendsByDefault: false },
          regler,
        })}', 1);`
      }
      const direkte = `insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) select ${S}, id, '${dato}', 'hjemmekontor', 1 from personal.medarbeidere where syntetisk_navn = 'Alma Berg';`

      it('avviser registreringen når oppsettet lagres først, også rett i tabellen', async () => {
        for (const [hva, registrering, feil] of [
          ['kommandoen', endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'hjemmekontor' }]), '22023'],
          ['tabellen', direkte, '23514'],
        ] as const) {
          const db = nyDatabase()
          const r = await samtidig(db, 'read committed', utenHjemmekontor(db), registrering)
          expect(r.steg, hva).toBe(feil)
          expect(versjoner(db), hva).toBe('1,2')
          expect(celler(db), hva).toEqual([])
        }
      }, 60_000)

      it('avviser oppsettet når registreringen lagres først', async () => {
        for (const [hva, registrering] of [
          ['kommandoen', endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'hjemmekontor' }])],
          ['tabellen', direkte],
        ] as const) {
          const db = nyDatabase()
          const r = await samtidig(db, 'read committed', registrering, utenHjemmekontor(db))
          expect(r.steg, hva).toBe('22023')
          expect(versjoner(db), hva).toBe('1')
          expect(celler(db).map((c) => c.status), hva).toEqual(['hjemmekontor'])
        }
      }, 60_000)
    })
  })

  // Kontrollene etter en lås ville sett tilstanden fra før ventingen (`personal.krev_ferske_data`).
  describe('i repeatable read', () => {
    /** Det som endrer kalenderen eller oppsettet, med navnet i testen. */
    const endringer = (db: string): [string, string][] => [
      ['lagring av oppsettet', lagre(db)(KONTO.admin)],
      ['utpeking', `${som(KONTO.admin)} select public.personal_sett_vaktplanansvarlig(${S}, '${KONTO.planlegger1}', true);`],
      ['kvalifikasjon rett i tabellen', `insert into personal.kvalifikasjoner (medarbeider_id, status_id, fra) select id, 'vakt1', '2099-01-01' from personal.medarbeidere limit 1;`],
      ['endring i kalenderen', endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'borte' }])],
      ['fritak', `${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Alma Berg']}', '${dato}', true, 1, 1);`],
      ['oppføring rett i tabellen', `insert into personal.oppforinger (fagmiljo_id, medarbeider_id, dato, status_id, regelversjon) values (${S}, '${ider['Alma Berg']}', '${dato}', 'borte', 1);`],
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
      expect(celler(db)).toEqual([])
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

    it('venter med endringen i kalenderen, og skjuler funksjonen når medlemskapet er avsluttet', async () => {
      const db = nyDatabase()
      const r = await samtidig(db, 'read committed', avsluttMedlemskap(KONTO.planlegger1), endre(KONTO.planlegger1, [{ navn: 'Alma Berg', status: 'borte' }]))
      // Uten medlemskap finnes ikke funksjonen for brukeren (K-SKJ-3).
      expect(r.steg).toBe('P0002')
      expect(celler(db)).toEqual([])
    }, 30_000)

    it('venter med fritaket, og avviser det når administratorrollen er fjernet', async () => {
      const db = nyDatabase()
      giAdmin(db, KONTO.planlegger1)
      psql(db, `begin; ${endre(KONTO.planlegger1, [{ navn: 'Noor Aasen', status: 'borte' }])} commit;`)
      const o = celler(db)[0]!
      const r = await samtidig(
        db,
        'read committed',
        fjernAdmin(KONTO.admin),
        `${som(KONTO.admin)} select public.personal_sett_fritak(${S}, '${ider['Noor Aasen']}', '${dato}', true, ${o.revisjon}, ${o.fritak_revisjon});`,
      )
      expect(r.steg).toBe('42501')
      expect(celler(db).map((c) => c.fritak)).toEqual([false])
    }, 30_000)
  })
})
