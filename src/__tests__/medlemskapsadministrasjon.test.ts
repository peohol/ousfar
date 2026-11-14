/**
 * P3: administrasjonen av medlemskapene og sperren i Auth
 * (docs/fagmiljoer.md, «Medlemskap og kontosperring»).
 *
 * Testene bruker persongalleriet (syntetiske kontoer i A og B) og kaller
 * operasjonene slik nettleseren gjør det, som den innloggede. Hver test får
 * sin egen kopi av databasen, så rekkefølgen ikke betyr noe.
 *
 * Det som bare kan vises med flere forbindelser samtidig, står i
 * `medlemskap.samtidighet.test.ts` (ekte Postgres 17).
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { AVSLUTTET_MEDLEMSKAP } from '@delt/profil'
import { byggPersongalleri, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

interface Svar {
  bruker: string
  fagmiljo: string
  status: 'aktiv' | 'invitert' | 'avsluttet' | 'ingen'
  administrator: boolean
  sperret: boolean
}

interface Oversiktsrad {
  bruker_id: string
  username: string
  status: 'aktiv' | 'invitert' | 'avsluttet'
  administrator: boolean
  systemarkitekt: boolean
  sperret: boolean
  eneste_medlemskap: boolean
  kan_avslutte: boolean
  kan_gi_tilgang: boolean
  kan_gjore_til_administrator: boolean
  kan_fjerne_som_administrator: boolean
}

let basis: PGlite
let db: PGlite
let galleri: Persongalleri

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
}, 120_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

afterEach(async () => {
  await db.close()
})

const id = (p: Person) => galleri.id[p]
const fm = (f: Fagmiljo) => galleri.fagmiljo[f]

/** Kjører SQL som personen og gir radene. */
const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = []) =>
  som(db, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)

/** Én operasjon som personen, i sin egen transaksjon (som et kall fra appen). */
const operasjon = async (person: Person, kall: string, parametre: unknown[]): Promise<Svar> =>
  (await somPerson<{ svar: Svar }>(person, `select public.${kall} as svar`, parametre))[0]!.svar

const avslutt = (aktor: Person, mal: Person, f: Fagmiljo) =>
  operasjon(aktor, 'avslutt_medlemskap($1, $2)', [id(mal), fm(f)])
const gi = (aktor: Person, mal: Person, f: Fagmiljo) => operasjon(aktor, 'gi_medlemskap($1, $2)', [id(mal), fm(f)])
const settAdmin = (aktor: Person, mal: Person, f: Fagmiljo, administrator: boolean) =>
  operasjon(aktor, 'sett_fagmiljoadministrator($1, $2, $3)', [id(mal), fm(f), administrator])

/** Medlemskapene til personen, eldste først. */
async function medlemskap(person: Person) {
  const { rows } = await db.query<{ fagmiljo: Fagmiljo; status: string; primaer: boolean; til: string | null }>(
    `select case m.fagmiljo_id when $2 then 'A' when $3 then 'B' else 'annet' end as fagmiljo,
            m.status, m.primaer, m.til
     from public.medlemskap m where m.bruker_id = $1 order by m.fra, m.id`,
    [id(person), fm('A'), fm('B')],
  )
  return rows
}

const aktive = async (person: Person) =>
  (await medlemskap(person))
    .filter((m) => m.status === 'aktiv')
    .map((m) => `${m.fagmiljo}${m.primaer ? '*' : ''}`)
    .sort()

/** Sperren i Auth og hos oss, og øktene som står igjen. */
async function sperre(person: Person) {
  const { rows } = await db.query<{ banned_until: Date | null; sperret_til: Date | null; okter: number; nokler: number }>(
    `select u.banned_until,
            (select k.sperret_til from intern.kontosperrer k where k.bruker_id = u.id) as sperret_til,
            (select count(*)::int from auth.sessions s where s.user_id = u.id) as okter,
            (select count(*)::int from auth.refresh_tokens r where r.user_id = u.id::text) as nokler
     from auth.users u where u.id = $1`,
    [id(person)],
  )
  return rows[0]!
}

/** Gir personen en innlogget økt med en fornyingsnøkkel, slik Auth gjør det. */
async function loggInn(person: Person): Promise<void> {
  const { rows } = await db.query<{ id: string }>('insert into auth.sessions (user_id) values ($1) returning id', [id(person)])
  await db.query(`insert into auth.refresh_tokens (token, user_id, session_id) values ('syntetisk', $1, $2)`, [
    id(person),
    rows[0]!.id,
  ])
}

const tilgangslogg = async (etter: number) =>
  (
    await db.query<{ handling: string; aktor: string | null; bruker_id: string; grunn: string | null }>(
      'select handling, aktor, bruker_id, grunn from public.tilgangslogg where id > $1 order by id',
      [etter],
    )
  ).rows
const sisteLogg = async () =>
  (await db.query<{ n: number }>('select coalesce(max(id), 0)::int as n from public.tilgangslogg')).rows[0]!.n

describe('medlemskap i flere fagmiljøer', () => {
  it('A→B: en administrator i B gir et medlem av A medlemskap; når A avsluttes, står B og blir primært', async () => {
    expect(await gi('adminB', 'vanligA', 'B')).toMatchObject({ status: 'aktiv', sperret: false })
    expect(await aktive('vanligA')).toEqual(['A*', 'B'])

    expect(await avslutt('adminA', 'vanligA', 'A')).toMatchObject({ status: 'avsluttet', sperret: false })
    expect(await aktive('vanligA')).toEqual(['B*'])
    expect((await sperre('vanligA')).banned_until).toBeNull()
    expect(await somPerson('vanligA', 'select public.har_aktivt_medlemskap() as ja')).toEqual([{ ja: true }])
  })

  it('B→A: en administrator i A gir et medlem av B medlemskap; når B avsluttes, står A', async () => {
    await gi('adminA', 'vanligB', 'A')
    expect(await aktive('vanligB')).toEqual(['A', 'B*'])
    await avslutt('adminB', 'vanligB', 'B')
    expect(await aktive('vanligB')).toEqual(['A*'])
    expect((await sperre('vanligB')).banned_until).toBeNull()
  })

  it('avslutter bare medlemskapet i det ene fagmiljøet for den som er med i begge', async () => {
    await avslutt('adminB', 'dobbeltAB', 'B')
    expect(await aktive('dobbeltAB')).toEqual(['A*'])
    await gi('adminB', 'dobbeltAB', 'B')
    expect(await aktive('dobbeltAB')).toEqual(['A*', 'B'])
    // Historikken står: det avsluttede medlemskapet i B er ikke slettet.
    expect((await medlemskap('dobbeltAB')).filter((m) => m.fagmiljo === 'B').map((m) => m.status)).toEqual([
      'deaktivert',
      'aktiv',
    ])
  })

  it('legger til en eksisterende konto med brukernavnet, uansett store og små bokstaver', async () => {
    const { svar } = (
      await somPerson<{ svar: Svar }>('adminB', 'select public.legg_til_medlem($1, $2) as svar', [' TEST.VanligA ', fm('B')])
    )[0]!
    expect(svar).toMatchObject({ bruker: id('vanligA'), status: 'aktiv' })
  })

  it('sier ikke hvem som finnes til den som ikke administrerer fagmiljøet', async () => {
    const leggTil = (person: Person, brukernavn: string) =>
      feilFra(() => somPerson(person, 'select public.legg_til_medlem($1, $2)', [brukernavn, fm('B')]))
    expect(await leggTil('adminB', 'finnes.ikke')).toMatchObject({ code: 'P0002' })
    expect(await leggTil('vanligB', 'finnes.ikke')).toMatchObject({ code: '42501' })
    expect(await leggTil('vanligB', 'test.vanliga')).toMatchObject({ code: '42501' })
    expect(await leggTil('adminA', 'test.vanliga')).toMatchObject({ code: '42501', message: /administrerer ikke/ })
  })
})

describe('den lokale administratorens grenser', () => {
  const avslag = (kall: () => Promise<unknown>) => feilFra(kall)

  it('handler ikke i et annet fagmiljø', async () => {
    expect(await avslag(() => avslutt('adminA', 'vanligB', 'B'))).toMatchObject({ code: '42501', message: /administrerer ikke/ })
    expect(await avslag(() => gi('adminA', 'vanligA', 'B'))).toMatchObject({ code: '42501', message: /administrerer ikke/ })
  })

  it('endrer ikke medlemskapet til systemarkitekter og andre administratorer', async () => {
    expect(await avslag(() => avslutt('adminA', 'systemarkitekt', 'A'))).toMatchObject({ code: '42501' })
    expect(await avslag(() => avslutt('adminB', 'arkitektB', 'B'))).toMatchObject({ code: '42501' })
    // adminA har den gamle adminrollen og er dermed administrator.
    await gi('systemarkitekt', 'adminA', 'B')
    expect(await avslag(() => avslutt('adminB', 'adminA', 'B'))).toMatchObject({ code: '42501' })
  })

  it('utpeker eller fjerner ikke administratorer, og endrer ikke sitt eget medlemskap', async () => {
    expect(await avslag(() => settAdmin('adminA', 'vanligA', 'A', true))).toMatchObject({ code: '42501' })
    expect(await avslag(() => settAdmin('adminB', 'arkitektB', 'B', false))).toMatchObject({ code: '42501' })
    expect(await avslag(() => avslutt('adminA', 'adminA', 'A'))).toMatchObject({ code: '42501', message: /ditt eget/ })
  })

  it('kan ikke gi en sperret konto tilgang til et fagmiljø den aldri har vært medlem av; det kan en systemarkitekt', async () => {
    expect(await avslag(() => gi('adminB', 'utenMedlemskap', 'B'))).toMatchObject({ code: '42501', message: /sperret/ })
    expect(await gi('arkitektB', 'utenMedlemskap', 'B')).toMatchObject({ status: 'aktiv', sperret: false })
  })

  it('mister myndigheten med en gang den tilbakekalles', async () => {
    await settAdmin('systemarkitekt', 'vanligB', 'B', true)
    expect(await gi('vanligB', 'vanligA', 'B')).toMatchObject({ status: 'aktiv' })
    await settAdmin('systemarkitekt', 'vanligB', 'B', false)
    expect(await avslag(() => avslutt('vanligB', 'vanligA', 'B'))).toMatchObject({ code: '42501', message: /administrerer ikke/ })
    expect(await avslag(() => somPerson('vanligB', 'select * from public.medlemsoversikt($1)', [fm('B')]))).toMatchObject({
      code: '42501',
    })
  })

  it('mister myndigheten når medlemskapet avsluttes, og administratortildelingen avsluttes med det', async () => {
    await gi('systemarkitekt', 'adminB', 'A')
    await avslutt('arkitektB', 'adminB', 'B')
    const { rows } = await db.query<{ til: string | null }>(
      'select til from public.fagmiljoadministratorer where bruker_id = $1 and fagmiljo_id = $2',
      [id('adminB'), fm('B')],
    )
    expect(rows.every((r) => r.til !== null)).toBe(true)
    expect(await avslag(() => gi('adminB', 'vanligA', 'B'))).toMatchObject({ code: '42501' })
  })
})

describe('vernet av administratorer og systemarkitekter', () => {
  it('verken avslutter medlemskapet til eller fjerner den eneste administratoren', async () => {
    expect(await feilFra(() => avslutt('systemarkitekt', 'adminA', 'A'))).toMatchObject({ code: '23514' })
    expect(await feilFra(() => settAdmin('systemarkitekt', 'adminA', 'A', false))).toMatchObject({ code: '23514' })
    await settAdmin('systemarkitekt', 'vanligA', 'A', true)
    expect(await avslutt('systemarkitekt', 'adminA', 'A')).toMatchObject({ administrator: false, sperret: true })
  })

  it('lar en systemarkitekt aldri stå uten medlemskap, og sperrer aldri en systemarkitekt', async () => {
    expect(await feilFra(() => avslutt('arkitektB', 'systemarkitekt', 'A'))).toMatchObject({
      code: '42501',
      message: /beholde minst ett/,
    })
    await gi('arkitektB', 'systemarkitekt', 'B')
    expect(await avslutt('arkitektB', 'systemarkitekt', 'A')).toMatchObject({ sperret: false })
    expect(await aktive('systemarkitekt')).toEqual(['B*'])
  })

  it('gjør bare et aktivt medlem som har valgt sitt eget passord, til administrator', async () => {
    expect(await feilFra(() => settAdmin('systemarkitekt', 'vanligB', 'A', true))).toMatchObject({ code: '55000' })
    await db.query('update public.profiles set must_change_password = true where id = $1', [id('vanligA')])
    expect(await feilFra(() => settAdmin('systemarkitekt', 'vanligA', 'A', true))).toMatchObject({ code: '55000' })
  })
})

describe('det siste medlemskapet', () => {
  it('sperrer kontoen i Auth, sletter øktene og fører alt i tilgangsloggen', async () => {
    await loggInn('vanligA')
    await loggInn('vanligB')
    const for_ = await sisteLogg()

    expect(await avslutt('adminA', 'vanligA', 'A')).toMatchObject({ status: 'avsluttet', sperret: true })

    const s = await sperre('vanligA')
    expect(s.banned_until).not.toBeNull()
    expect(s.banned_until!.getTime()).toBe(s.sperret_til!.getTime())
    expect(s.banned_until!.getUTCFullYear()).toBeGreaterThan(new Date().getUTCFullYear() + 90)
    expect(s).toMatchObject({ okter: 0, nokler: 0 })
    // Andres økter står.
    expect(await sperre('vanligB')).toMatchObject({ banned_until: null, okter: 1, nokler: 1 })

    const logg = await tilgangslogg(for_)
    expect(logg.map((l) => l.handling)).toEqual(['medlemskap.update', 'kontosperrer.insert'])
    expect(logg.every((l) => l.aktor === id('adminA') && l.bruker_id === id('vanligA') && l.grunn)).toBe(true)

    // Historikken står.
    expect(await medlemskap('vanligA')).toEqual([expect.objectContaining({ fagmiljo: 'A', status: 'deaktivert', til: expect.anything() })])
  })

  it('stenger alle datainngangene for det samme, fortsatt gyldige tokenet', async () => {
    await avslutt('adminA', 'vanligA', 'A')
    expect(await somPerson('vanligA', 'select public.min_medlemskapsstatus() as s')).toEqual([{ s: 'avsluttet' }])
    expect(await somPerson('vanligA', 'select count(*)::int as n from public.profiles')).toEqual([{ n: 0 }])
    expect(await somPerson('vanligA', 'select count(*)::int as n from public.diskusjoner')).toEqual([{ n: 0 }])
    expect(await feilFra(() => somPerson('vanligA', 'select public.mine_rettigheter()'))).toMatchObject({
      code: '42501',
      message: AVSLUTTET_MEDLEMSKAP,
    })
    // `aktivtmedlemskap.test.ts` prøver hver inngang med en konto som har
    // havnet her på samme måte (persongalleriet avslutter medlemskapene).
  })

  it('sperrer også når medlemskapet avsluttes utenom operasjonene', async () => {
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
      await tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1`, [id('vanligB')])
    })
    expect((await sperre('vanligB')).banned_until).not.toBeNull()
  })

  it('sperrer medlemmene når fagmiljøet arkiveres, og opphever sperren når det åpnes igjen', async () => {
    const tx = async (sql: string) =>
      db.transaction(async (t: Transaction) => {
        await t.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
        await t.query(sql, [fm('B')])
      })
    await tx(`update public.fagmiljoer set status = 'arkivert' where id = $1`)
    expect((await sperre('vanligB')).banned_until).not.toBeNull()
    expect((await sperre('dobbeltAB')).banned_until).toBeNull()
    expect((await sperre('arkitektB')).banned_until).toBeNull()
    await tx(`update public.fagmiljoer set status = 'aktiv' where id = $1`)
    expect((await sperre('vanligB')).banned_until).toBeNull()
  })
})

describe('reaktivering', () => {
  it('gir et tidligere medlem tilgang igjen med et nytt medlemskap og opphever sperren', async () => {
    await avslutt('adminA', 'vanligA', 'A')
    const for_ = await sisteLogg()
    expect(await gi('adminA', 'vanligA', 'A')).toMatchObject({ status: 'aktiv', sperret: false })
    expect(await sperre('vanligA')).toMatchObject({ banned_until: null, sperret_til: null })
    expect((await medlemskap('vanligA')).map((m) => `${m.status}${m.primaer ? '*' : ''}`)).toEqual(['deaktivert*', 'aktiv*'])
    expect((await tilgangslogg(for_)).map((l) => l.handling)).toEqual(['medlemskap.insert', 'kontosperrer.delete'])
    expect(await somPerson('vanligA', 'select public.min_medlemskapsstatus() as s')).toEqual([{ s: 'aktiv' }])
  })

  it('lar en sperre noen andre har satt i Auth, stå', async () => {
    await avslutt('adminA', 'vanligA', 'A')
    await db.query(`update auth.users set banned_until = 'infinity' where id = $1`, [id('vanligA')])
    await gi('adminA', 'vanligA', 'A')
    expect((await sperre('vanligA')).banned_until).not.toBeNull()
  })
})

describe('gjentakelse og feil', () => {
  it('gir det samme svaret uten å endre noe når en handling gjentas, for eksempel etter brutt nett', async () => {
    const forste = await avslutt('adminA', 'vanligA', 'A')
    const for_ = await sisteLogg()
    expect(await avslutt('adminA', 'vanligA', 'A')).toEqual(forste)
    expect(await tilgangslogg(for_)).toEqual([])

    const gitt = await gi('adminB', 'dobbeltAB', 'B')
    expect(await gi('adminB', 'dobbeltAB', 'B')).toEqual(gitt)
    expect((await medlemskap('dobbeltAB')).length).toBe(2)
  })

  it('ruller tilbake hele avslutningen når sperren i Auth feiler, og lykkes når den prøves igjen', async () => {
    await db.exec(`
      create function auth.feil_for_test() returns trigger language plpgsql as $$
      begin raise exception 'Auth er nede (syntetisk)'; end $$;
      create trigger feil_for_test before update on auth.users for each row execute function auth.feil_for_test();
    `)
    const for_ = await sisteLogg()
    expect(await feilFra(() => avslutt('adminA', 'vanligA', 'A'))).toMatchObject({ message: /Auth er nede/ })
    expect(await aktive('vanligA')).toEqual(['A*'])
    expect(await sperre('vanligA')).toMatchObject({ banned_until: null, sperret_til: null })
    expect(await tilgangslogg(for_)).toEqual([])

    await db.exec('drop trigger feil_for_test on auth.users')
    expect(await avslutt('adminA', 'vanligA', 'A')).toMatchObject({ sperret: true })
    expect((await sperre('vanligA')).banned_until).not.toBeNull()
  })
})

describe('nye fagmiljøer og startporten', () => {
  const opprett = (person: Person, navn: string) =>
    somPerson<{ f: { id: string; nokkel: string; navn: string } }>(person, 'select public.opprett_fagmiljo($1) as f', [navn])

  it('lar bare systemarkitektene opprette et fagmiljø, som er lukket og ikke standard', async () => {
    expect(await feilFra(() => opprett('adminA', 'OUS Testmiljø'))).toMatchObject({ code: '42501' })
    const { f } = (await opprett('systemarkitekt', '  OUS   Testmiljø '))[0]!
    expect(f).toMatchObject({ navn: 'OUS Testmiljø', nokkel: 'ous-testmiljo' })
    const { rows } = await db.query('select standard, apent_for_medlemmer, status from public.fagmiljoer where id = $1', [f.id])
    expect(rows).toEqual([{ standard: false, apent_for_medlemmer: false, status: 'aktiv' }])
    expect(await feilFra(() => opprett('arkitektB', 'ous testmiljø'))).toMatchObject({ code: '23505' })
    expect(await feilFra(() => opprett('arkitektB', '!'))).toMatchObject({ code: '22023' })

    // Ingen ordinær bruker slipper inn før startporten er godkjent; en systemarkitekt kan.
    const giHer = (mal: Person) =>
      somPerson('systemarkitekt', 'select public.gi_medlemskap($1, $2)', [id(mal), f.id])
    expect(await feilFra(() => giHer('vanligA'))).toMatchObject({ code: '42501', message: /startport S2/ })
    expect(await feilFra(() => giHer('arkitektB'))).toBeNull()
  })

  it('slipper ingen ordinær bruker inn i et fagmiljø som ikke er åpnet', async () => {
    await db.query('update public.fagmiljoer set apent_for_medlemmer = false where id = $1', [fm('B')])
    expect(await feilFra(() => gi('adminB', 'vanligA', 'B'))).toMatchObject({ code: '42501', message: /startport S2/ })
    expect(await feilFra(() => gi('arkitektB', 'vanligA', 'B'))).toMatchObject({ code: '42501', message: /startport S2/ })
  })
})

describe('medlemsoversikten', () => {
  const oversikt = (person: Person, f: Fagmiljo) =>
    somPerson<Oversiktsrad>(person, 'select * from public.medlemsoversikt($1)', [fm(f)])

  it('vises bare for den som administrerer fagmiljøet', async () => {
    expect(await feilFra(() => oversikt('vanligA', 'A'))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => oversikt('adminA', 'B'))).toMatchObject({ code: '42501' })
    expect(await feilFra(() => oversikt('systemarkitekt', 'B'))).toBeNull()
  })

  it('viser de gjeldende og de tidligere medlemmene', async () => {
    const rader = await oversikt('adminA', 'A')
    const status = Object.fromEntries(rader.map((r) => [r.username, r.status]))
    expect(status).toMatchObject({
      'test.vanliga': 'aktiv',
      'test.dobbeltab': 'aktiv',
      'test.avslutteta': 'avsluttet',
      'test.utenmedlemskap': 'avsluttet',
    })
    expect(status['test.vanligb']).toBeUndefined()
    const rad = (navn: string) => rader.find((r) => r.username === navn)!
    expect(rad('test.vanliga')).toMatchObject({ eneste_medlemskap: true, sperret: false })
    expect(rad('test.dobbeltab')).toMatchObject({ eneste_medlemskap: false })
    expect(rad('test.utenmedlemskap')).toMatchObject({ sperret: true })
  })

  // Knappene appen viser, skal stemme med det operasjonene faktisk tillater.
  it.each([
    ['adminA', 'A'],
    ['adminB', 'B'],
    ['systemarkitekt', 'A'],
    ['arkitektB', 'B'],
  ] as const)('gir %s i %s nøyaktig de handlingene operasjonene tillater', async (aktor, f) => {
    const rader = await oversikt(aktor, f)
    const handlinger = [
      ['kan_avslutte', 'avslutt_medlemskap($1, $2)'],
      ['kan_gi_tilgang', 'gi_medlemskap($1, $2)'],
      ['kan_gjore_til_administrator', 'sett_fagmiljoadministrator($1, $2, true)'],
      ['kan_fjerne_som_administrator', 'sett_fagmiljoadministrator($1, $2, false)'],
    ] as const
    for (const rad of rader) {
      for (const [flagg, kall] of handlinger) {
        // Lov og en endring (en handling som alt er gjort, gir ingen knapp),
        // prøvd i en transaksjon som rulles tilbake etter at også de utsatte
        // kontrollene og sperren har kjørt.
        let endret = false
        const avslag = await feilFra(() =>
          som(db, id(aktor), async (tx) => {
            const { rows } = await tx.query<{ svar: Svar }>(`select public.${kall} as svar`, [rad.bruker_id, fm(f)])
            const svar = rows[0]!.svar
            endret = svar.status !== rad.status || svar.administrator !== rad.administrator
            await tx.exec('set constraints all immediate')
            await tx.rollback()
          }),
        )
        expect(avslag === null && endret, `${aktor} → ${rad.username}: ${flagg} (${avslag?.message ?? 'lov'})`).toBe(
          rad[flagg],
        )
      }
    }
  })
})
