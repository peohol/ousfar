/**
 * P6: gruppene, i ett fagmiljø og på tvers av fagmiljøene
 * (docs/fagmiljoer.md, «Gruppene»).
 *
 * Testene bruker persongalleriet (syntetiske kontoer i A og B) og kaller
 * funksjonene slik nettleseren gjør det, som den innloggede. Hver test får sin
 * egen kopi av databasen, så rekkefølgen ikke betyr noe.
 *
 * Grunnoppsettet: administratoren i A har gruppen «A-gruppen» i A med
 * `vanligA` og `dobbeltAB` som medlemmer. Systemarkitekten har gruppen
 * «Tverrgruppen» på tvers med `vanligA`, `vanligB` og `dobbeltAB`. Begge har
 * én tråd. Samtidige endringer står i `grupper.samtidighet.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
  byggPersongalleri,
  leggInnTestdata,
  type Fagmiljo,
  type Person,
  type Persongalleri,
  type Testdata,
} from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

interface Svar {
  gruppe: string
  bruker: string
  status: 'invitert' | 'aktiv' | 'avsluttet'
  rolle: string | null
}

interface Medlemsrad {
  id: string
  username: string
  rolle: string
  status: string
  har_tilgang: boolean
  kan_fjerne: boolean
  kan_endre_rolle: boolean
  siste_ansvarlige: boolean
}

interface Oversikt {
  id: string
  navn: string
  art: string
  status: string
  rolle: string | null
  kan_styre: boolean
  kan_moderere: boolean
  kan_forlate: boolean
  kan_gjenapne: boolean
  medlemmer: Medlemsrad[]
}

const DOK = (tekst: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let data: Testdata
let agruppe: string
let tverrgruppe: string
let agrupptraad: string
let tverrtraad: string

const id = (p: Person) => galleri.id[p]
const fm = (f: Fagmiljo) => galleri.fagmiljo[f]

/** Kjører SQL som personen og gir radene. */
const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)

/** Første kolonne i første rad, som personen. */
const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await somPerson<Record<string, T>>(person, sql, parametre, i))[0]!)[0] as T

const opprett = (person: Person, navn: string, fagmiljo: string | null, i: PGlite = db) =>
  verdi<string>(person, 'select public.opprett_gruppe($1, $2, $3)', [navn, 'Syntetisk gruppe', fagmiljo], i)
const inviter = (aktor: Person, gruppe: string, mal: Person | string, i: PGlite = db) =>
  verdi<Svar>(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, mal in galleri.id ? `test.${mal.toLowerCase()}` : mal], i)
const svar = (person: Person, gruppe: string, godta: boolean, i: PGlite = db) =>
  verdi<Svar>(person, 'select public.svar_paa_gruppeinvitasjon($1, $2)', [gruppe, godta], i)
const avslutt = (aktor: Person, gruppe: string, mal: Person) =>
  verdi<Svar>(aktor, 'select public.avslutt_gruppemedlemskap($1, $2)', [gruppe, id(mal)])
const settRolle = (aktor: Person, gruppe: string, mal: Person, rolle: string) =>
  verdi<Svar>(aktor, 'select public.sett_grupperolle($1, $2, $3)', [gruppe, id(mal), rolle])
const oversikt = (person: Person, gruppe: string) => verdi<Oversikt>(person, 'select public.gruppeoversikt($1)', [gruppe])
const mine = (person: Person) =>
  verdi<{
    grupper: { id: string; rolle: string | null; status: string }[]
    invitasjoner: { gruppe: { id: string }; invitert_av: { username: string } }[]
    kan_opprette: { tverrfaglig: boolean; fagmiljoer: { id: string }[] }
  }>(person, 'select public.mine_grupper()')

/** Inviterer og godtar. */
async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await inviter(aktor, gruppe, mal, i)
  await svar(mal, gruppe, true, i)
}

/** En tråd på siden, med en ny kategori. */
async function traad(person: Person, side: string, tittel: string, i: PGlite = db) {
  const kategori = await verdi<string>(person, 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, 'Tema', '💬'], i)
  return verdi<string>(person, 'select public.opprett_diskusjon($1, $2, $3, $4)', [side, kategori, tittel, DOK('Innlegg')], i)
}

const kommenter = (person: Person, diskusjon: string, forelder: string | null = null) =>
  verdi<string>(
    person,
    'insert into public.diskusjonskommentarer (diskusjon_id, forelder_id, tekst) values ($1, $2, $3) returning id',
    [diskusjon, forelder, DOK('Kommentar')],
  )

/** Alt personen ser av en tråd, gjennom hver inngang appen bruker. */
async function serTraad(person: Person, diskusjon: string, side: string) {
  return som(db, id(person), async (tx) => {
    const n = async (sql: string, p: unknown[] = []) => Number(Object.values((await tx.query<Record<string, unknown>>(sql, p)).rows[0]!)[0])
    const oversikten = (await tx.query<{ v: { diskusjoner: unknown[] } }>('select public.diskusjonsoversikt($1) as v', [side])).rows[0]!.v
    const tekstene = (await tx.query<{ v: unknown[] }>('select public.diskusjonstekster($1) as v', [side])).rows[0]!.v
    const traaden = (await tx.query<{ v: unknown }>('select public.diskusjonstraad($1) as v', [diskusjon])).rows[0]!.v
    const lenken = (await tx.query<{ v: unknown }>(`select public.direktelenke('diskusjon', $1) as v`, [diskusjon])).rows[0]!.v
    return {
      tabell: await n('select count(*) from public.diskusjoner where id = $1', [diskusjon]),
      kommentarer: await n('select count(*) from public.diskusjonskommentarer where diskusjon_id = $1', [diskusjon]),
      kategorier: await n('select count(*) from public.diskusjonskategorier where side = $1', [side]),
      oversikt: oversikten.diskusjoner.length,
      tekster: tekstene.length,
      traad: traaden !== null,
      lenke: lenken !== null,
      apen: Boolean((await tx.query<{ v: boolean }>('select public.diskusjon_er_apen($1) as v', [diskusjon])).rows[0]!.v),
    }
  })
}

const SER_ALT = { tabell: 1, kommentarer: 1, kategorier: 1, oversikt: 1, tekster: 1, traad: true, lenke: true, apen: true }
const SER_INGENTING = { tabell: 0, kommentarer: 0, kategorier: 0, oversikt: 0, tekster: 0, traad: false, lenke: false, apen: false }

/**
 * Avslutter medlemskapet til dobbeltAB i A. A er primærmedlemskapet, så B
 * blir primært i samme transaksjon.
 */
async function avsluttDobbeltIA() {
  await db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
    await tx.query(
      `update public.medlemskap set primaer = false, status = 'deaktivert', til = now()
        where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`,
      [id('dobbeltAB'), fm('A')],
    )
    await tx.query(`update public.medlemskap set primaer = true where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`, [
      id('dobbeltAB'),
      fm('B'),
    ])
  })
}

/** Varslene personen har om tråden: i lista appen viser, i tellingen og rett fra tabellen. */
async function varslerOm(person: Person, diskusjon: string) {
  return som(db, id(person), async (tx) => {
    const { rows } = await tx.query<{ v: { varsler: { diskusjon: { id: string } | null; lest_kl: string | null }[] }; u: Record<string, number> }>(
      'select public.mine_varsler() as v, public.uleste_varsler() as u',
    )
    const tabell = await tx.query<{ n: number }>('select count(*)::int as n from public.varsler where diskusjon_id = $1', [diskusjon])
    return {
      liste: rows[0]!.v.varsler.filter((v) => v.diskusjon?.id === diskusjon).length,
      uleste: Object.values(rows[0]!.u).reduce((a, b) => a + b, 0),
      tabell: tabell.rows[0]!.n,
    }
  })
}

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  data = await leggInnTestdata(basis, galleri)
  agruppe = await opprett('adminA', 'A-gruppen', galleri.fagmiljo.A, basis)
  await medlem('adminA', agruppe, 'vanligA', basis)
  await medlem('adminA', agruppe, 'dobbeltAB', basis)
  tverrgruppe = await opprett('systemarkitekt', 'Tverrgruppen', null, basis)
  for (const p of ['vanligA', 'vanligB', 'dobbeltAB'] as const) await medlem('systemarkitekt', tverrgruppe, p, basis)
  agrupptraad = await traad('adminA', `gruppe:${agruppe}`, 'Tråd i A-gruppen', basis)
  tverrtraad = await traad('systemarkitekt', `gruppe:${tverrgruppe}`, 'Tråd på tvers', basis)
  // Én kommentar i hver, så kommentarene kan telles.
  for (const [p, t] of [['vanligA', agrupptraad], ['vanligB', tverrtraad]] as const) {
    await somPerson(p, 'insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, $2)', [t, DOK('Hei')], basis)
  }
}, 180_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

afterEach(async () => {
  await db.close()
})

describe('opprettingen', () => {
  it('lar en lokal administrator opprette grupper i sitt fagmiljø og bare systemarkitektene på tvers', async () => {
    expect(await opprett('adminB', 'B-gruppen', fm('B'))).toMatch(/^[0-9a-f-]{36}$/)
    for (const [person, fagmiljo] of [
      ['adminA', fm('B')],
      ['adminA', null],
      ['vanligA', fm('A')],
      ['dobbeltAB', null],
    ] as const) {
      expect((await feilFra(() => opprett(person, 'Ikke lov', fagmiljo)))?.code, `${person} ${fagmiljo}`).toBe('42501')
    }
    // Den gamle adminrollen gir ingenting, og uten aktivt medlemskap stopper alt.
    expect((await feilFra(() => opprett('tidligereAdmin', 'Ikke lov', fm('A'))))?.code).toBe('42501')
    expect((await mine('adminA')).kan_opprette).toEqual({ tverrfaglig: false, fagmiljoer: [{ id: fm('A'), navn: 'OUS Klinisk farmakologi' }] })
    expect((await mine('vanligA')).kan_opprette).toEqual({ tverrfaglig: false, fagmiljoer: [] })
    expect((await mine('systemarkitekt')).kan_opprette.tverrfaglig).toBe(true)
  })

  it('gjør den som oppretter til ansvarlig og fører alt i tilgangsloggen', async () => {
    const g = await opprett('adminA', 'Loggruppen', fm('A'))
    await inviter('adminA', g, 'vanligA')
    const { rows } = await db.query<{ handling: string; aktor: string; grunn: string }>(
      `select handling, aktor, grunn from public.tilgangslogg
       where (handling like 'grupper.%' and etter ->> 'id' = $1) or (handling like 'gruppemedlemskap.%' and etter ->> 'gruppe_id' = $1)
       order by id`,
      [g],
    )
    expect(rows).toEqual([
      { handling: 'grupper.insert', aktor: id('adminA'), grunn: 'Gruppe opprettet' },
      { handling: 'gruppemedlemskap.insert', aktor: id('adminA'), grunn: 'Gruppe opprettet' },
      { handling: 'gruppemedlemskap.insert', aktor: id('adminA'), grunn: 'Invitert til gruppen' },
    ])
    expect((await oversikt('adminA', g)).medlemmer.map((m) => [m.username, m.rolle, m.status])).toEqual([
      ['test.admina', 'ansvarlig', 'aktiv'],
      ['test.vanliga', 'medlem', 'invitert'],
    ])
  })

  it('kan ikke skrives eller leses rett i tabellene fra nettleseren', async () => {
    for (const sql of [
      'select count(*) from public.grupper',
      'select count(*) from public.gruppemedlemskap',
      `insert into public.grupper (navn, art) values ('Snarvei', 'tverrfaglig')`,
    ]) {
      expect((await feilFra(() => somPerson('systemarkitekt', sql)))?.code, sql).toBe('42501')
    }
  })
})

describe('invitasjonene', () => {
  it('inviterer bare kontoer som kan være med, og svarer likt for ukjente og andre', async () => {
    const g = await opprett('adminA', 'Ny', fm('A'))
    // Vanlig bruker i B, medlemskapet i A avsluttet, ukjent brukernavn: samme svar.
    const svarene = await Promise.all(
      (['vanligB', 'avsluttetA', 'utenMedlemskap', 'test.finnes.ikke'] as const).map(async (mal) => feilFra(() => inviter('adminA', g, mal))),
    )
    expect(new Set(svarene.map((f) => `${f?.code} ${f?.message}`))).toEqual(
      new Set(['42501 Fant ingen som kan inviteres med det brukernavnet.']),
    )
    // Den som er med i A, kan inviteres, også med medlemskap i B i tillegg.
    expect(await inviter('adminA', g, 'dobbeltAB')).toMatchObject({ status: 'invitert', rolle: 'medlem' })
    // En gang til: samme svar, ingen ny rad.
    expect(await inviter('adminA', g, 'dobbeltAB')).toMatchObject({ status: 'invitert' })
    const { rows } = await db.query('select 1 from public.gruppemedlemskap where gruppe_id = $1 and bruker_id = $2', [g, id('dobbeltAB')])
    expect(rows).toHaveLength(1)
  })

  it('gir ingen tilgang før invitasjonen er godtatt, og lar den avslås', async () => {
    const g = await opprett('adminA', 'Venter', fm('A'))
    const t = await traad('adminA', `gruppe:${g}`, 'Før godtatt')
    await kommenter('adminA', t)
    await inviter('adminA', g, 'vanligA')
    expect((await mine('vanligA')).invitasjoner.map((i) => [i.gruppe.id, i.invitert_av.username])).toContainEqual([g, 'test.admina'])
    expect(await serTraad('vanligA', t, `gruppe:${g}`)).toEqual(SER_INGENTING)
    expect((await feilFra(() => oversikt('vanligA', g)))?.code).toBe('P0002')

    expect(await svar('vanligA', g, true)).toMatchObject({ status: 'aktiv', rolle: 'medlem' })
    expect(await svar('vanligA', g, true)).toMatchObject({ status: 'aktiv' })
    expect(await serTraad('vanligA', t, `gruppe:${g}`)).toEqual(SER_ALT)

    await inviter('adminA', g, 'dobbeltAB')
    expect(await svar('dobbeltAB', g, false)).toMatchObject({ status: 'avsluttet', rolle: null })
    expect(await svar('dobbeltAB', g, false)).toMatchObject({ status: 'avsluttet' })
    expect(await serTraad('dobbeltAB', t, `gruppe:${g}`)).toEqual(SER_INGENTING)
    // Uten invitasjon: samme svar om gruppen finnes eller ikke.
    for (const gruppe of [g, '00000000-0000-4000-8000-000000000000']) {
      expect((await feilFra(() => svar('vanligB', gruppe, true)))?.message).toBe('Du har ingen invitasjon til denne gruppen.')
    }
  })

  it('viser ingenting om en invitasjon til et fagmiljø den inviterte ikke lenger er medlem av', async () => {
    const g = await opprett('adminA', 'Privat i A', fm('A'))
    await inviter('adminA', g, 'dobbeltAB')
    const tverr = await opprett('systemarkitekt', 'Åpen på tvers', null)
    await inviter('systemarkitekt', tverr, 'dobbeltAB')
    expect((await mine('dobbeltAB')).invitasjoner.map((i) => i.gruppe.id).sort()).toEqual([g, tverr].sort())

    await avsluttDobbeltIA()
    // Invitasjonen til A-gruppen er borte, med navnet, beskrivelsen og hvem som inviterte;
    // den på tvers står og kan godtas.
    const etter = await mine('dobbeltAB')
    expect(etter.invitasjoner.map((i) => i.gruppe.id)).toEqual([tverr])
    expect(JSON.stringify(etter)).not.toContain('Privat i A')
    expect((await feilFra(() => oversikt('dobbeltAB', g)))?.code).toBe('P0002')
    expect((await feilFra(() => svar('dobbeltAB', g, true)))?.code).toBe('42501')
    expect(await serTraad('dobbeltAB', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
    expect(await svar('dobbeltAB', tverr, true)).toMatchObject({ status: 'aktiv' })
  })

  it('lar bare de ansvarlige og systemarkitektene invitere', async () => {
    for (const person of ['vanligA', 'dobbeltAB'] as const) {
      expect((await feilFra(() => inviter(person, agruppe, 'systemarkitekt')))?.message).toBe('Bare de ansvarlige i gruppen kan gjøre dette.')
    }
    // En moderator styrer ikke medlemmene.
    await settRolle('adminA', agruppe, 'vanligA', 'moderator')
    expect((await feilFra(() => inviter('vanligA', agruppe, 'systemarkitekt')))?.code).toBe('42501')
    // Utenfor gruppen: som om den ikke fantes. Også for en lokal administrator i et annet fagmiljø.
    expect((await feilFra(() => inviter('adminB', agruppe, 'vanligA')))?.code).toBe('P0002')
    // Systemarkitekten kan, uten å være med.
    expect(await inviter('arkitektB', agruppe, 'systemarkitekt')).toMatchObject({ status: 'invitert' })
  })
})

describe('lesingen', () => {
  it('gir medlemmene trådene i gruppen, og andre ingenting gjennom noen inngang', async () => {
    const lesere: [Person, string, string, boolean][] = [
      ['vanligA', agrupptraad, `gruppe:${agruppe}`, true],
      ['dobbeltAB', agrupptraad, `gruppe:${agruppe}`, true],
      ['adminA', agrupptraad, `gruppe:${agruppe}`, true],
      ['systemarkitekt', agrupptraad, `gruppe:${agruppe}`, true],
      ['vanligB', agrupptraad, `gruppe:${agruppe}`, false],
      // Lokal administrator i samme fagmiljø, men ikke med: leser ikke.
      ['adminB', agrupptraad, `gruppe:${agruppe}`, false],
      ['avsluttetA', agrupptraad, `gruppe:${agruppe}`, false],
      ['vanligB', tverrtraad, `gruppe:${tverrgruppe}`, true],
      ['vanligA', tverrtraad, `gruppe:${tverrgruppe}`, true],
      ['adminA', tverrtraad, `gruppe:${tverrgruppe}`, false],
      ['adminB', tverrtraad, `gruppe:${tverrgruppe}`, false],
    ]
    for (const [person, t, side, ser] of lesere) {
      expect(await serTraad(person, t, side), `${person} ${side}`).toEqual(ser ? SER_ALT : SER_INGENTING)
    }
    // Uten aktivt medlemskap stopper alt, også i en gruppe på tvers.
    for (const person of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => serTraad(person, tverrtraad, `gruppe:${tverrgruppe}`)))?.code, person).toBe('42501')
    }
  })

  it('lar ikke andre skrive i gruppen, verken tråder, kategorier, kommentarer eller hjerter', async () => {
    const side = `gruppe:${agruppe}`
    for (const [hva, sql, parametre] of [
      ['kategori', 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, 'Inn', '🚪']],
      ['tråd', 'select public.opprett_diskusjon($1, null, $2, $3, $4, $5)', [side, 'Inn', DOK('x'), 'Ny', '🆕']],
      ['kommentar', 'insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, $2)', [agrupptraad, DOK('x')]],
      ['hjerte', 'insert into public.diskusjonshjerter (diskusjon_id) values ($1)', [agrupptraad]],
      ['sett', 'select public.merk_diskusjon_sett($1, now()) is null', [agrupptraad]],
    ] as const) {
      const feil = await feilFra(() => somPerson('vanligB', sql, [...parametre]))
      if (hva === 'sett') {
        // Ingenting skjer, og ingen rad blir lagd.
        expect(feil).toBeNull()
        const { rows } = await db.query('select 1 from public.diskusjonsbesok where diskusjon_id = $1 and bruker_id = $2', [agrupptraad, id('vanligB')])
        expect(rows).toHaveLength(0)
      } else {
        expect(feil?.code, hva).toBe('42501')
      }
    }
  })

  it('gir aldri tilgang til et annet fagmiljøs lokale innhold', async () => {
    // vanligB er med i en gruppe sammen med vanligA, men leser fortsatt ikke
    // fortolkningen i A: verken tråden der eller kommentarene i den.
    expect(await serTraad('vanligB', data.fortolkningstraad, 'fortolkning:syntetisk-analytt')).toMatchObject({
      tabell: 0,
      traad: false,
      lenke: false,
    })
    const kommentarer = await verdi<number>('vanligB', `select count(*)::int from public.redigerbare_objekter where id = $1`, [data.publisertKommentar])
    expect(kommentarer).toBe(0)
  })

  it('flytter aldri en tråd inn i eller ut av en gruppe', async () => {
    const fagside = await traad('vanligA', 'stoff:annet-stoff', 'Felles')
    const flytt = (person: Person, t: string, side: string) =>
      feilFra(() => somPerson(person, 'select public.flytt_diskusjon_til_side($1, $2, null, $3, $4)', [t, side, 'Ny', '🧭']))
    for (const [t, side] of [
      [agrupptraad, 'stoff:annet-stoff'],
      [agrupptraad, 'fortolkning:syntetisk-analytt'],
      [agrupptraad, `gruppe:${tverrgruppe}`],
      [fagside, `gruppe:${agruppe}`],
    ] as const) {
      expect((await flytt('systemarkitekt', t, side))?.code, `${t} → ${side}`).toBe('42501')
    }
    expect((await flytt('vanligA', data.fortolkningstraad, `gruppe:${agruppe}`))?.code).toBe('42501')
    // Rett i tabellen, forbi funksjonene: utløseren stopper også.
    expect((await feilFra(() => db.query('update public.diskusjoner set side = $1 where id = $2', [`gruppe:${tverrgruppe}`, agrupptraad])))?.code).toBe('42501')
    expect((await feilFra(() => db.query('update public.diskusjoner set side = $1 where id = $2', ['stoff:annet-stoff', agrupptraad])))?.code).toBe('42501')
  })

  it('avviser en side for en gruppe som ikke finnes', async () => {
    const side = 'gruppe:00000000-0000-4000-8000-000000000000'
    expect((await feilFra(() => somPerson('systemarkitekt', 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, 'X', '❌'])))?.code).toBe('42501')
  })
})

describe('fjerningen', () => {
  it('tar alt fra den som fjernes, med en gang: tråden, kommentarene, varslene, søket og lenken', async () => {
    // adminA svarer på vanligA: vanligA får et varsel om tråden i gruppen.
    const egen = await kommenter('vanligA', agrupptraad)
    await kommenter('adminA', agrupptraad, egen)
    const { rows } = await db.query<{ gruppe_id: string; fagmiljo_id: string | null }>(
      `select gruppe_id, fagmiljo_id from public.varsler where mottaker_id = $1 and diskusjon_id = $2`,
      [id('vanligA'), agrupptraad],
    )
    expect(rows).toEqual([{ gruppe_id: agruppe, fagmiljo_id: null }])
    expect(await varslerOm('vanligA', agrupptraad)).toMatchObject({ liste: 1, tabell: 1 })
    const uleste = (await varslerOm('vanligA', agrupptraad)).uleste

    expect(await avslutt('adminA', agruppe, 'vanligA')).toEqual({ gruppe: agruppe, bruker: id('vanligA'), status: 'avsluttet', rolle: null })
    expect(await serTraad('vanligA', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
    expect(await varslerOm('vanligA', agrupptraad)).toEqual({ liste: 0, uleste: uleste - 1, tabell: 0 })
    expect((await mine('vanligA')).grupper.map((g) => g.id)).not.toContain(agruppe)

    // Nye kommentarer gir ingen nye varsler, og hen kan ikke skrive.
    await kommenter('adminA', agrupptraad, egen)
    const nye = await db.query('select 1 from public.varsler where mottaker_id = $1 and diskusjon_id = $2 and lest_kl is null', [id('vanligA'), agrupptraad])
    expect(nye.rows).toHaveLength(1)
    expect((await feilFra(() => kommenter('vanligA', agrupptraad)))?.code).toBe('42501')
    // Den andre gruppen står.
    expect(await serTraad('vanligA', tverrtraad, `gruppe:${tverrgruppe}`)).toEqual(SER_ALT)
  })

  it('stenger en gruppe i fagmiljøet når medlemskapet der avsluttes, og lar gruppen på tvers stå', async () => {
    await avsluttDobbeltIA()
    expect(await serTraad('dobbeltAB', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
    expect(await serTraad('dobbeltAB', tverrtraad, `gruppe:${tverrgruppe}`)).toEqual(SER_ALT)
    // Den ansvarlige ser at medlemmet ikke lenger har tilgang.
    const rad = (await oversikt('adminA', agruppe)).medlemmer.find((m) => m.id === id('dobbeltAB'))
    expect(rad).toMatchObject({ status: 'aktiv', har_tilgang: false })
  })

  it('lar et medlem gå selv, men ikke den siste ansvarlige', async () => {
    expect(await avslutt('vanligA', agruppe, 'vanligA')).toMatchObject({ status: 'avsluttet' })
    expect(await avslutt('vanligA', tverrgruppe, 'vanligA')).toMatchObject({ status: 'avsluttet' })
    // Gjentatt: samme svar? Nei, nå er hen utenfor og ser ikke gruppen.
    expect((await feilFra(() => avslutt('vanligA', agruppe, 'vanligA')))?.code).toBe('P0002')

    expect((await oversikt('adminA', agruppe)).kan_forlate).toBe(false)
    expect((await feilFra(() => avslutt('adminA', agruppe, 'adminA')))?.message).toBe(
      'Du er den siste ansvarlige i gruppen. Gjør en annen til ansvarlig først.',
    )
    expect((await feilFra(() => avslutt('systemarkitekt', agruppe, 'adminA')))?.code).toBe('42501')
    expect((await feilFra(() => settRolle('adminA', agruppe, 'adminA', 'medlem')))?.code).toBe('23514')

    await settRolle('adminA', agruppe, 'dobbeltAB', 'ansvarlig')
    expect(await avslutt('adminA', agruppe, 'adminA')).toMatchObject({ status: 'avsluttet' })
    expect(await serTraad('adminA', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
  })

  it('arkiverer gruppen når kontoen til den siste ansvarlige slettes, og lar resten stå', async () => {
    const g = await opprett('systemarkitekt', 'Slettegruppen', null)
    await medlem('systemarkitekt', g, 'vanligB')
    await medlem('systemarkitekt', g, 'vanligA')
    await settRolle('systemarkitekt', g, 'vanligB', 'ansvarlig')
    await avslutt('systemarkitekt', g, 'systemarkitekt')
    await inviter('vanligB', g, 'adminB')
    expect(await feilFra(() => db.query('delete from auth.users where id = $1', [id('vanligB')]))).toBeNull()

    const gruppe = await db.query<{ status: string }>('select status from public.grupper where id = $1', [g])
    expect(gruppe.rows).toEqual([{ status: 'arkivert' }])
    const { rows } = await db.query<{ bruker_id: string; status: string; invitert_av: string | null }>(
      `select bruker_id, status, invitert_av from public.gruppemedlemskap where gruppe_id = $1 and status <> 'avsluttet' order by status`,
      [g],
    )
    expect(rows).toEqual([
      { bruker_id: id('vanligA'), status: 'aktiv', invitert_av: id('systemarkitekt') },
      { bruker_id: id('adminB'), status: 'invitert', invitert_av: null },
    ])
    const logg = await db.query<{ grunn: string }>(
      `select grunn from public.tilgangslogg where handling = 'grupper.update' and etter ->> 'id' = $1 and etter ->> 'status' = 'arkivert'`,
      [g],
    )
    expect(logg.rows).toEqual([{ grunn: 'Arkivert: den siste ansvarlige ble slettet' }])
    // Medlemmet ser ikke lenger gruppen; en systemarkitekt kan åpne den igjen.
    expect((await feilFra(() => oversikt('vanligA', g)))?.code).toBe('P0002')
    expect(await oversikt('systemarkitekt', g)).toMatchObject({ status: 'arkivert', kan_gjenapne: true })
  })

  it('lar gruppen stå aktiv når en annen ansvarlig er igjen etter at en konto slettes', async () => {
    const g = await opprett('systemarkitekt', 'To ansvarlige', null)
    await medlem('systemarkitekt', g, 'vanligB')
    await medlem('systemarkitekt', g, 'vanligA')
    await settRolle('systemarkitekt', g, 'vanligB', 'ansvarlig')
    await settRolle('systemarkitekt', g, 'vanligA', 'ansvarlig')
    await avslutt('systemarkitekt', g, 'systemarkitekt')
    expect(await feilFra(() => db.query('delete from auth.users where id = $1', [id('vanligB')]))).toBeNull()
    expect((await db.query<{ status: string }>('select status from public.grupper where id = $1', [g])).rows).toEqual([{ status: 'aktiv' }])
    expect(await oversikt('vanligA', g)).toMatchObject({ status: 'aktiv', rolle: 'ansvarlig', kan_styre: true })
    // En vanlig medlemskonto som slettes, endrer heller ingenting.
    await medlem('vanligA', g, 'adminB')
    expect(await feilFra(() => db.query('delete from auth.users where id = $1', [id('adminB')]))).toBeNull()
    expect((await db.query<{ status: string }>('select status from public.grupper where id = $1', [g])).rows).toEqual([{ status: 'aktiv' }])
  })

  it('holder regelen om minst én ansvarlig også rett i tabellen', async () => {
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
        await tx.query(`update public.gruppemedlemskap set rolle = 'medlem' where gruppe_id = $1`, [agruppe])
      }),
    )
    expect(feil?.code).toBe('23514')
    // Sletting av en konto stoppes ikke av regelen.
    const ansvarlig = await db.query<{ n: number }>(
      `select count(*)::int as n from public.gruppemedlemskap where gruppe_id = $1 and rolle = 'ansvarlig' and status = 'aktiv'`,
      [agruppe],
    )
    expect(ansvarlig.rows[0]!.n).toBe(1)
  })
})

describe('rollene og modereringen', () => {
  it('lar moderatorene moderere, men ikke styre medlemmene; vanlige medlemmer ingen av delene', async () => {
    const dobbelt = await kommenter('dobbeltAB', agrupptraad)
    const skjul = (person: Person) =>
      feilFra(() => somPerson(person, 'select public.skjul_i_diskusjon($1, $2)', [agrupptraad, dobbelt]))
    expect((await skjul('vanligA'))?.code).toBe('42501')
    expect((await oversikt('vanligA', agruppe)).kan_moderere).toBe(false)

    expect(await settRolle('adminA', agruppe, 'vanligA', 'moderator')).toMatchObject({ rolle: 'moderator' })
    const vanligA = await oversikt('vanligA', agruppe)
    expect(vanligA).toMatchObject({ rolle: 'moderator', kan_moderere: true, kan_styre: false })
    expect(vanligA.medlemmer.every((m) => !m.kan_fjerne && !m.kan_endre_rolle)).toBe(true)
    expect(await skjul('vanligA')).toBeNull()
    expect((await feilFra(() => avslutt('vanligA', agruppe, 'dobbeltAB')))?.code).toBe('42501')
    expect((await feilFra(() => settRolle('vanligA', agruppe, 'dobbeltAB', 'ansvarlig')))?.code).toBe('42501')
    // Modereringen gjelder bare egen gruppe: ikke tråden på tvers, der hen er medlem.
    const paaTvers = await kommenter('vanligB', tverrtraad)
    expect((await feilFra(() => somPerson('vanligA', 'select public.skjul_i_diskusjon($1, $2)', [tverrtraad, paaTvers])))?.code).toBe('42501')
    // Og ikke de felles fagsidene eller fortolkningen.
    expect(await verdi<boolean>('vanligA', 'select public.kan_moderere_diskusjoner($1)', ['stoff:syntetisk-stoff'])).toBe(false)
    expect(await verdi<boolean>('vanligA', 'select public.kan_moderere_diskusjoner($1)', [`gruppe:${agruppe}`])).toBe(true)
  })

  it('viser de ansvarlige knappene som stemmer med operasjonene', async () => {
    const rader = Object.fromEntries((await oversikt('adminA', agruppe)).medlemmer.map((m) => [m.username, m]))
    expect(rader['test.admina']).toMatchObject({ rolle: 'ansvarlig', kan_fjerne: false, siste_ansvarlige: true })
    expect(rader['test.vanliga']).toMatchObject({ rolle: 'medlem', kan_fjerne: true, kan_endre_rolle: true, siste_ansvarlige: false })
    expect(await oversikt('adminA', agruppe)).toMatchObject({ kan_styre: true, kan_moderere: true, kan_forlate: false })
  })
})

describe('arkiveringen', () => {
  it('stenger gruppen for medlemmene, og bare systemarkitektene åpner den igjen', async () => {
    await somPerson('adminA', 'select public.arkiver_gruppe($1, true)', [agruppe])
    expect(await serTraad('vanligA', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
    expect(await serTraad('adminA', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_INGENTING)
    expect((await feilFra(() => somPerson('adminA', 'select public.arkiver_gruppe($1, false)', [agruppe])))?.code).toBe('P0002')
    expect(await oversikt('systemarkitekt', agruppe)).toMatchObject({ status: 'arkivert', kan_gjenapne: true })
    // Ingen nye medlemmer i en arkivert gruppe.
    expect((await feilFra(() => inviter('systemarkitekt', agruppe, 'adminB')))?.message).toBe('Gruppen er arkivert.')

    await somPerson('systemarkitekt', 'select public.arkiver_gruppe($1, false)', [agruppe])
    expect(await serTraad('vanligA', agrupptraad, `gruppe:${agruppe}`)).toEqual(SER_ALT)
  })

  it('lar ingen slette en gruppe eller et medlemskap', async () => {
    for (const sql of ['delete from public.grupper where id = $1', 'delete from public.gruppemedlemskap where gruppe_id = $1']) {
      expect((await feilFra(() => db.query(sql, [agruppe])))?.code, sql).toBe('42501')
    }
  })
})

describe('profilene og idéene', () => {
  it('lar medlemmene se hverandres profilkort, og bare dem', async () => {
    const ser = (person: Person, mal: Person) =>
      verdi<number>(person, 'select count(*)::int from public.profiles where id = $1', [id(mal)])
    // adminA og vanligB har ingenting felles før gruppen. Det vanligB skriver
    // i en gruppe, viser navnet til dem som fortsatt leser gruppen; derfor en
    // ny gruppe der hen ikke har skrevet noe.
    expect(await ser('adminA', 'vanligB')).toBe(0)
    const g = await opprett('systemarkitekt', 'Profilgruppen', null)
    await inviter('systemarkitekt', g, 'adminA')
    // Den inviterte ser medlemmene først når invitasjonen er godtatt.
    expect(await ser('adminA', 'vanligB')).toBe(0)
    await svar('adminA', g, true)
    await inviter('systemarkitekt', g, 'vanligB')
    // Medlemmene ser den inviterte, så medlemslista har navnet.
    expect(await ser('adminA', 'vanligB')).toBe(1)
    await svar('vanligB', g, true)
    expect(await ser('adminA', 'vanligB')).toBe(1)
    await avslutt('systemarkitekt', g, 'vanligB')
    expect(await ser('adminA', 'vanligB')).toBe(0)
    expect(await ser('vanligB', 'adminA')).toBe(0)
  })

  it('lar idéene være felles for alle med aktivt medlemskap (D8)', async () => {
    expect(await verdi<number>('adminB', 'select count(*)::int from public.ideer where id = $1', [data.ide])).toBe(1)
  })
})
