/**
 * P7 tråd A: gruppechatten i databasen (docs/gruppechat.md, «Rettighetene»,
 * «Modellen», «Funksjonene», «Lagringstiden»).
 *
 * Testene bruker persongalleriet (syntetiske kontoer i A og B) og kaller
 * databasen slik nettleseren gjør det, som den innloggede. Hver test får sin
 * egen kopi av databasen. Chatten er avslått i migrasjonene; her slås den på
 * i testdatabasen, unntatt i testen av bryteren.
 *
 * Grunnoppsettet: «A-gruppen» i A har `adminA` som ansvarlig, `dobbeltAB` som
 * moderator, `vanligA` som medlem og en ubesvart invitasjon til
 * `redaktorRessursA`. «Tverrgruppen» på tvers har systemarkitekten som
 * ansvarlig og `vanligA` og `vanligB` som medlemmer. Samtidige skrivinger står
 * i `gruppechat.samtidighet.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { lesChatendringer, lesChatside, lesGruppemelding, type Gruppemelding } from '../gruppechat/modell'
import { byggPersongalleri, fjernAlleMedlemskap, type Person, type Persongalleri } from './hjelp/persongalleri'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string
let tverrgruppe: string

const id = (p: Person) => galleri.id[p]
const INGEN = '00000000-0000-4000-8000-00000000dead'
const GRUPPEAVSLAG = 'Gruppen finnes ikke, eller du har ikke tilgang til den.'
const MELDINGSAVSLAG = 'Meldingen finnes ikke, eller du har ikke tilgang til den.'

const SLA_PA = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`
const SLA_AV = SLA_PA.replace("'select true'", "'select false'")

const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await somPerson<Record<string, T>>(person, sql, parametre, i))[0]!)[0] as T

const feil = async (arbeid: () => Promise<unknown>) => {
  const f = await feilFra(arbeid)
  return f ? { kode: f.code, melding: f.message } : null
}

async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe], i)
}

let teller = 0
const nyKlientId = () => `00000000-0000-4000-9000-${String(++teller).padStart(12, '0')}`

const send = async (person: Person, gruppe: string, tekst = 'Hei', klientId = nyKlientId()) =>
  lesGruppemelding(await verdi(person, 'select public.send_gruppemelding($1, $2, $3)', [gruppe, klientId, tekst]))!
const les = async (person: Person, gruppe: string, forNr: number | null = null, antall?: number) =>
  lesChatside(
    await verdi(person, `select public.les_gruppechat($1, $2${antall === undefined ? '' : ', $3'})`, [gruppe, forNr, ...(antall === undefined ? [] : [antall])]),
  )!
const endringer = async (person: Person, gruppe: string, etter: number, antall = 200) =>
  lesChatendringer(await verdi(person, 'select public.gruppechat_endringer($1, $2, $3)', [gruppe, etter, antall]))!
const endre = async (person: Person, melding: string, tekst: string) =>
  lesGruppemelding(await verdi(person, 'select public.endre_gruppemelding($1, $2)', [melding, tekst]))!
const slett = async (person: Person, melding: string) =>
  lesGruppemelding(await verdi(person, 'select public.slett_gruppemelding($1)', [melding]))!
const merkLest = (person: Person, gruppe: string, tilNr: number) =>
  verdi(person, 'select public.merk_gruppechat_lest($1, $2)', [gruppe, tilNr])
const uleste = async (person: Person, gruppe: string) =>
  (await verdi<{ samhandling: { chat_uleste: number | null } }>(person, 'select public.gruppeoversikt($1)', [gruppe])).samhandling.chat_uleste

/** Rader direkte i databasen, forbi radsikkerheten. */
const rader = async <T>(sql: string, parametre: unknown[] = []) => (await db.query<T>(sql, parametre)).rows

/** Hver inngang til chatten i gruppen, med feilen den gir (null: gikk). */
async function innganger(person: Person, gruppe: string, melding: string) {
  return {
    les: await feil(() => les(person, gruppe)),
    endringer: await feil(() => endringer(person, gruppe, 0)),
    send: await feil(() => send(person, gruppe)),
    merk: await feil(() => merkLest(person, gruppe, 1)),
    endre: await feil(() => endre(person, melding, 'Endret')),
    slett: await feil(() => slett(person, melding)),
  }
}

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  await medlem('adminA', agruppe, 'vanligA', basis)
  await medlem('adminA', agruppe, 'dobbeltAB', basis)
  await verdi('adminA', `select public.sett_grupperolle($1, $2, 'moderator')`, [agruppe, galleri.id.dobbeltAB], basis)
  await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, 'test.redaktorressursa'], basis)
  tverrgruppe = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, null)', ['Tverrgruppen', 'Syntetisk'], basis)
  for (const p of ['vanligA', 'vanligB'] as const) await medlem('systemarkitekt', tverrgruppe, p, basis)
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

describe('bryteren', () => {
  it('stenger alle inngangene mens chatten er avslått, også for medlemmene', async () => {
    const melding = await send('vanligA', agruppe)
    await db.exec(SLA_AV)
    const av = { kode: '42501', melding: 'Gruppechatten er ikke slått på.' }
    expect(await innganger('vanligA', agruppe, melding.id)).toEqual({ les: av, endringer: av, send: av, merk: av, endre: av, slett: av })
    expect(await somPerson('vanligA', 'select * from public.gruppechatter')).toEqual([])
    expect(await uleste('vanligA', agruppe)).toBeNull()
  })
})

describe('rettighetene', () => {
  const LESER: readonly Person[] = ['vanligA', 'dobbeltAB', 'adminA', 'systemarkitekt', 'arkitektB']
  const UTENFOR: readonly Person[] = ['redaktorRessursA', 'vanligB', 'adminB', 'avsluttetA']

  it('lar medlemmene, moderatorene, de ansvarlige og systemarkitektene lese og skrive', async () => {
    for (const p of LESER) {
      const egen = await send(p, agruppe, `Fra ${p}`)
      expect(egen, p).toMatchObject({ egen: true, kan_endre: true, kan_slette: true, tekst: `Fra ${p}`, slettet: null })
      expect(egen.forfatter?.id, p).toBe(id(p))
    }
    const side = await les('vanligA', agruppe)
    expect(side.meldinger.map((m) => m.tekst)).toEqual(LESER.map((p) => `Fra ${p}`))
    expect(side.meldinger.map((m) => m.nr)).toEqual([1, 2, 3, 4, 5])
    expect(side).toMatchObject({ kan_skrive: true, kan_moderere: false, siste_endring: 5, flere_eldre: false })
    // Bare de aktive medlemmene med tilgang teller: ikke den inviterte og ikke systemarkitektene.
    expect(side.lesere).toEqual({ medlemmer: 3, systemarkitekter: true })
    expect(side.grenser).toEqual({ maks_tegn: 4000, maks_per_minutt: 20 })
    for (const p of ['dobbeltAB', 'adminA', 'systemarkitekt', 'arkitektB'] as const) {
      expect((await les(p, agruppe)).kan_moderere, p).toBe(true)
    }
  })

  it('gir dem utenfor gruppen det samme svaret som for en gruppe og en melding som ikke finnes', async () => {
    const melding = await send('vanligA', agruppe)
    const finnesIkke = await innganger('vanligB', INGEN, INGEN)
    expect(finnesIkke).toEqual({
      les: { kode: '42501', melding: GRUPPEAVSLAG },
      endringer: { kode: '42501', melding: GRUPPEAVSLAG },
      send: { kode: '42501', melding: GRUPPEAVSLAG },
      merk: { kode: '42501', melding: GRUPPEAVSLAG },
      endre: { kode: '42501', melding: MELDINGSAVSLAG },
      slett: { kode: '42501', melding: MELDINGSAVSLAG },
    })
    for (const p of UTENFOR) {
      expect(await innganger(p, agruppe, melding.id), p).toEqual(finnesIkke)
      expect(await somPerson(p, 'select gruppe_id from public.gruppechatter'), p).toEqual([])
    }
    // Den uten aktivt medlemskap stoppes før gruppen i det hele tatt slås opp.
    expect((await innganger('utenMedlemskap', agruppe, melding.id)).les?.kode).toBe('42501')
    expect(await rader('select tekst from public.gruppemeldinger')).toEqual([{ tekst: 'Hei' }])
  })

  it('lar ikke en lokal administrator som ikke er med, lese gruppene i fagmiljøet', async () => {
    await send('vanligA', tverrgruppe)
    expect(await feil(() => les('adminA', tverrgruppe))).toEqual({ kode: '42501', melding: GRUPPEAVSLAG })
    expect(await feil(() => les('adminB', tverrgruppe))).toEqual({ kode: '42501', melding: GRUPPEAVSLAG })
  })

  it('stenger tabellene for nettleseren: chatradene kan bare leses, og bare i egne grupper', async () => {
    await send('vanligA', agruppe)
    await send('vanligB', tverrgruppe)
    for (const tabell of ['gruppemeldinger', 'gruppechat_lest']) {
      expect((await feil(() => somPerson('vanligA', `select * from public.${tabell}`)))?.kode, tabell).toBe('42501')
    }
    const chatrader = async (p: Person) => (await somPerson<{ gruppe_id: string }>(p, 'select gruppe_id from public.gruppechatter')).map((r) => r.gruppe_id).sort()
    expect(await chatrader('vanligA')).toEqual([agruppe, tverrgruppe].sort())
    expect(await chatrader('vanligB')).toEqual([tverrgruppe])
    expect(await chatrader('systemarkitekt')).toEqual([agruppe, tverrgruppe].sort())
    for (const sql of [
      `update public.gruppechatter set siste_nr = 99`,
      `delete from public.gruppechatter`,
      `insert into public.gruppechatter (gruppe_id) values ('${INGEN}')`,
      `insert into public.gruppemeldinger (gruppe_id, nr, klient_id, tekst, endring) values ('${agruppe}', 9, '${INGEN}', 'x', 9)`,
    ]) {
      expect((await feil(() => somPerson('vanligA', sql)))?.kode, sql).toBe('42501')
    }
    // Chatraden har ingen tekst og ingen avsender.
    expect(Object.keys((await somPerson<Record<string, unknown>>('vanligA', 'select * from public.gruppechatter'))[0]!).sort()).toEqual(
      ['endret_kl', 'gruppe_id', 'siste_endring', 'siste_nr'],
    )
  })
})

describe('en tverrfaglig gruppe', () => {
  it('lar medlemmer fra ulike fagmiljøer chatte uten å gi tilgang til det andre fagmiljøet', async () => {
    const fagmiljoer = (p: Person) => verdi<string[]>(p, 'select public.mine_lesbare_fagmiljoer()')
    const forB = await fagmiljoer('vanligB')
    await send('vanligA', tverrgruppe, 'Fra A')
    await send('vanligB', tverrgruppe, 'Fra B')
    for (const p of ['vanligA', 'vanligB'] as const) {
      const side = await les(p, tverrgruppe)
      expect(side.meldinger.map((m) => [m.tekst, m.forfatter?.id]), p).toEqual([
        ['Fra A', id('vanligA')],
        ['Fra B', id('vanligB')],
      ])
    }
    // Gruppen gir ingenting i A: verken fagmiljøet eller A-gruppens chat.
    expect(await fagmiljoer('vanligB')).toEqual(forB)
    expect(forB).not.toContain(galleri.fagmiljo.A)
    expect((await feil(() => les('vanligB', agruppe)))?.kode).toBe('42501')
  })
})

describe('tapt tilgang', () => {
  it('stenger alt for den som fjernes fra gruppen, med en gang og med den samme innloggingen', async () => {
    const egen = await send('vanligA', agruppe)
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('vanligA')])
    const svar = await innganger('vanligA', agruppe, egen.id)
    expect(svar.les).toEqual({ kode: '42501', melding: GRUPPEAVSLAG })
    expect(svar.endre).toEqual({ kode: '42501', melding: MELDINGSAVSLAG })
    expect(Object.values(svar).every((f) => f?.kode === '42501')).toBe(true)
    expect(await somPerson('vanligA', 'select gruppe_id from public.gruppechatter where gruppe_id = $1', [agruppe])).toEqual([])
    // Tverrgruppen står som før.
    expect(await send('vanligA', tverrgruppe)).toMatchObject({ egen: true })
    // Meldingen står i A-gruppen, og forfatteren vises fortsatt for de andre.
    expect((await les('adminA', agruppe)).meldinger[0]).toMatchObject({ id: egen.id, egen: false, kan_slette: true })
  })

  it('stenger gruppen i et fagmiljø for den som mister medlemskapet der', async () => {
    await send('dobbeltAB', agruppe)
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
      await tx.query(`update public.medlemskap set primaer = false, status = 'deaktivert', til = now() where bruker_id = $1 and fagmiljo_id = $2`, [
        id('dobbeltAB'),
        galleri.fagmiljo.A,
      ])
      await tx.query(`update public.medlemskap set primaer = true where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`, [
        id('dobbeltAB'),
        galleri.fagmiljo.B,
      ])
    })
    expect(await feil(() => les('dobbeltAB', agruppe))).toEqual({ kode: '42501', melding: GRUPPEAVSLAG })
    expect((await feil(() => send('dobbeltAB', agruppe)))?.kode).toBe('42501')
  })

  it('stenger alt for den som ikke lenger har noe aktivt medlemskap i OUSFAR', async () => {
    const egen = await send('vanligA', tverrgruppe)
    await fjernAlleMedlemskap(db, id('vanligA'))
    const svar = await innganger('vanligA', tverrgruppe, egen.id)
    expect(Object.values(svar).map((f) => f?.kode)).toEqual(Array(6).fill('42501'))
    expect(svar.les?.melding).toBe('Du har ikke lenger et aktivt medlemskap i OUSFAR.')
    expect(await somPerson('vanligA', 'select * from public.gruppechatter')).toEqual([])
  })
})

describe('en arkivert gruppe', () => {
  it('tar ikke imot meldinger eller endringer, men systemarkitektene kan slette', async () => {
    const melding = await send('vanligA', agruppe)
    const egen = await send('systemarkitekt', agruppe)
    const blir = await send('vanligA', agruppe, 'Blir stående')
    await verdi('adminA', 'select public.arkiver_gruppe($1, true)', [agruppe])
    // Medlemmene leser ikke en arkivert gruppe (P6).
    expect((await feil(() => les('vanligA', agruppe)))?.kode).toBe('42501')
    const side = await les('systemarkitekt', agruppe)
    expect(side).toMatchObject({ kan_skrive: false, kan_moderere: true })
    expect(side.meldinger.map((m) => [m.kan_endre, m.kan_slette])).toEqual([
      [false, true],
      [false, true],
      [false, true],
    ])
    const arkivert = { kode: '55000', melding: 'Gruppen er arkivert. Det kan ikke skrives noe i chatten.' }
    expect(await feil(() => send('systemarkitekt', agruppe))).toEqual(arkivert)
    expect(await feil(() => endre('systemarkitekt', egen.id, 'Endret'))).toEqual(arkivert)
    // Slettingen går, også av andres meldinger, og registreres som moderering.
    expect(await slett('systemarkitekt', melding.id)).toMatchObject({ tekst: null, slettet: { av: 'moderator' } })
    expect(await slett('arkitektB', egen.id)).toMatchObject({ slettet: { av: 'moderator' } })
    // Åpnet igjen virker alt som før.
    await verdi('systemarkitekt', 'select public.arkiver_gruppe($1, false)', [agruppe])
    expect(await endre('vanligA', blir.id, 'Etter')).toMatchObject({ tekst: 'Etter' })
  })
})

describe('vaktene', () => {
  const NUMMER = syntetiskPersonnummer(14, 3, 87)

  it('avviser tom og for lang tekst, og lagrer teksten uten tomrom først og sist', async () => {
    for (const tekst of ['', '   \n\t ']) {
      expect(await feil(() => send('vanligA', agruppe, tekst))).toEqual({ kode: '22023', melding: 'Meldingen er tom.' })
    }
    const lang = { kode: '22023', melding: 'Meldingen er for lang. Den kan ha høyst 4000 tegn.' }
    expect(await feil(() => send('vanligA', agruppe, 'x'.repeat(4001)))).toEqual(lang)
    expect((await send('vanligA', agruppe, 'å'.repeat(4000))).tekst).toHaveLength(4000)
    expect((await send('vanligA', agruppe, '  \nTo linjer\nher  \n')).tekst).toBe('To linjer\nher')
    // Lengden kommer først, også når teksten har et fødselsnummer.
    expect(await feil(() => send('vanligA', agruppe, `${NUMMER} ${'x'.repeat(4000)}`))).toEqual(lang)
  })

  it('avviser et fødselsnummer ved sending og endring, uten å gjenta teksten', async () => {
    const avvist = { kode: '22023', melding: PASIENTREGEL.avvist }
    expect(await feil(() => send('vanligA', agruppe, `Prøve fra ${NUMMER}`))).toEqual(avvist)
    expect(await feil(() => send('vanligA', agruppe, `${NUMMER.slice(0, 6)} ${NUMMER.slice(6)}`))).toEqual(avvist)
    const melding = await send('vanligA', agruppe, 'Konsentrasjonen var 1250 nmol/L')
    expect(await feil(() => endre('vanligA', melding.id, NUMMER))).toEqual(avvist)
    expect(await rader('select tekst from public.gruppemeldinger')).toEqual([{ tekst: 'Konsentrasjonen var 1250 nmol/L' }])
  })

  it('stopper den som sender for fort, uten å telle en gjentatt sending', async () => {
    const forste = await send('vanligA', agruppe, 'Første', 'aaaaaaaa-0000-4000-8000-000000000001')
    for (let i = 2; i <= 20; i++) await send('vanligA', agruppe, `Nr ${i}`)
    const fort = { kode: '54000', melding: 'Du sender meldinger for fort. Vent litt og prøv igjen.' }
    expect(await feil(() => send('vanligA', agruppe))).toEqual(fort)
    // Den samme sendingen på nytt gir den samme meldingen, ikke en avvisning.
    expect(await send('vanligA', agruppe, 'Første', 'aaaaaaaa-0000-4000-8000-000000000001')).toMatchObject({ id: forste.id, nr: 1 })
    // Fødselsnummeret kommer før takten.
    expect((await feil(() => send('vanligA', agruppe, NUMMER)))?.kode).toBe('22023')
    // Takten gjelder per bruker og gruppe.
    expect(await send('dobbeltAB', agruppe)).toMatchObject({ nr: 21 })
    expect(await send('vanligA', tverrgruppe)).toMatchObject({ nr: 1 })
    await db.query(`update public.gruppemeldinger set skrevet_kl = skrevet_kl - interval '61 seconds'`)
    expect(await send('vanligA', agruppe)).toMatchObject({ nr: 22 })
  })
})

describe('dobbeltinnsending', () => {
  it('gir den samme meldingen for samme klient-ID, og klient-ID-en bare til forfatteren', async () => {
    const klient = nyKlientId()
    const forste = await send('vanligA', agruppe, 'Hei', klient)
    const andre = await send('vanligA', agruppe, 'Hei', klient)
    expect(andre).toEqual(forste)
    expect(forste.klient_id).toBe(klient)
    expect(await rader('select count(*)::int as n from public.gruppemeldinger')).toEqual([{ n: 1 }])
    // En annen bruker med den samme klient-ID-en får sin egen melding.
    expect((await send('dobbeltAB', agruppe, 'Hei', klient)).id).not.toBe(forste.id)
    const sett = (await les('dobbeltAB', agruppe)).meldinger
    expect(sett.map((m) => [m.egen, m.klient_id])).toEqual([
      [false, null],
      [true, klient],
    ])
    expect(await feil(() => verdi('vanligA', 'select public.send_gruppemelding($1, null, $2)', [agruppe, 'x']))).toEqual({
      kode: '22023',
      melding: 'Meldingen mangler klient-ID.',
    })
  })
})

describe('lesingen', () => {
  beforeEach(async () => {
    // Takten er ikke det som prøves her.
    await db.exec(`create or replace function intern.gruppechat_grenser() returns jsonb language sql immutable set search_path = ''
      as $$ select jsonb_build_object('maks_tegn', 4000, 'maks_per_minutt', 1000) $$`)
    for (let i = 1; i <= 120; i++) await send(i % 2 ? 'vanligA' : 'dobbeltAB', agruppe, `Melding ${i}`)
  })

  it('henter de nyeste først, og de eldre side for side', async () => {
    const forste = await les('adminA', agruppe)
    expect(forste.meldinger.map((m) => m.nr)).toEqual(Array.from({ length: 50 }, (_, i) => 71 + i))
    expect(forste).toMatchObject({ flere_eldre: true, siste_endring: 120 })
    const neste = await les('adminA', agruppe, 71, 500)
    expect(neste.meldinger.map((m) => m.nr)).toEqual(Array.from({ length: 70 }, (_, i) => 1 + i))
    expect(neste.flere_eldre).toBe(false)
    expect((await les('adminA', agruppe, 71, 10)).meldinger.map((m) => m.nr)).toEqual(Array.from({ length: 10 }, (_, i) => 61 + i))
    // Høyst 100 om gangen.
    expect((await les('adminA', agruppe, null, 1000)).meldinger).toHaveLength(100)
  })

  it('gir endringene siden et punkt, i biter, og så endringene og slettingene', async () => {
    const sett = new Map<string, Gruppemelding>()
    let etter = 0
    let runder = 0
    for (;;) {
      const svar = await endringer('adminA', agruppe, etter, 50)
      for (const m of svar.meldinger) sett.set(m.id, m)
      expect(svar.siste_endring).toBeGreaterThan(etter)
      etter = svar.siste_endring
      runder++
      if (!svar.flere) break
    }
    expect(runder).toBe(3)
    expect(sett.size).toBe(120)
    expect(etter).toBe(120)
    const [a, b] = [...sett.values()].filter((m) => m.egen === false && m.forfatter?.id === id('vanligA'))
    await endre('vanligA', a!.id, 'Endret')
    await slett('dobbeltAB', b!.id)
    const etterpa = await endringer('adminA', agruppe, etter)
    expect(etterpa.meldinger.map((m) => [m.id, m.endring, m.tekst, m.slettet?.av ?? null])).toEqual([
      [a!.id, 121, 'Endret', null],
      [b!.id, 122, null, 'moderator'],
    ])
    expect(etterpa).toMatchObject({ siste_endring: 122, flere: false })
    // Ingenting nytt: det samme punktet tilbake.
    expect(await endringer('adminA', agruppe, 122)).toEqual({ meldinger: [], siste_endring: 122, flere: false })
    // Løpenummeret og rekkefølgen er uendret.
    expect((await les('adminA', agruppe)).meldinger.at(-1)!.nr).toBe(120)
  })
})

describe('endring og sletting', () => {
  it('lar bare forfatteren endre, uten å lagre den gamle teksten', async () => {
    const m = await send('vanligA', agruppe, 'Før')
    for (const p of ['dobbeltAB', 'adminA', 'systemarkitekt'] as const) {
      expect(await feil(() => endre(p, m.id, 'Kapret')), p).toEqual({ kode: '42501', melding: 'Bare den som skrev meldingen, kan endre den.' })
    }
    const endret = await endre('vanligA', m.id, 'Etter')
    expect(endret).toMatchObject({ id: m.id, nr: m.nr, tekst: 'Etter', endring: 2 })
    expect(endret.redigert_kl).not.toBeNull()
    // Uendret tekst er ingen ny endring.
    expect((await endre('vanligA', m.id, ' Etter ')).endring).toBe(2)
    const lagret = JSON.stringify(await rader('select * from public.gruppemeldinger'))
    expect(lagret).not.toContain('Før')
  })

  it('lar forfatteren og moderatorene slette, fjerner teksten med en gang og er idempotent', async () => {
    const egen = await send('vanligA', agruppe, 'Egen')
    const andres = await send('dobbeltAB', agruppe, 'Andres')
    const tredje = await send('adminA', agruppe, 'Tredje')
    // Et medlem sletter ikke andres.
    expect(await feil(() => slett('vanligA', andres.id))).toEqual({
      kode: '42501',
      melding: 'Bare den som skrev meldingen, og moderatorene i gruppen, kan slette den.',
    })
    expect((await les('vanligA', agruppe)).meldinger.map((m) => [m.kan_endre, m.kan_slette])).toEqual([
      [true, true],
      [false, false],
      [false, false],
    ])
    const selv = await slett('vanligA', egen.id)
    expect(selv).toMatchObject({ tekst: null, slettet: { av: 'forfatter' }, kan_endre: false, kan_slette: false })
    const moderert = await slett('dobbeltAB', tredje.id)
    expect(moderert.slettet?.av).toBe('moderator')
    expect(await slett('dobbeltAB', tredje.id)).toEqual(moderert)
    // En systemarkitekt modererer også.
    expect((await slett('systemarkitekt', andres.id)).slettet?.av).toBe('moderator')
    expect(await feil(() => endre('vanligA', egen.id, 'Igjen'))).toEqual({ kode: '55000', melding: 'Meldingen er slettet og kan ikke endres.' })
    expect(await rader('select tekst, slettet_av is not null as av from public.gruppemeldinger order by nr')).toEqual([
      { tekst: null, av: true },
      { tekst: null, av: true },
      { tekst: null, av: true },
    ])
    // Den slettede meldingen står i rekkefølgen, uten tekst.
    expect((await les('adminA', agruppe)).meldinger.map((m) => [m.nr, m.tekst, m.slettet?.av])).toEqual([
      [1, null, 'forfatter'],
      [2, null, 'moderator'],
      [3, null, 'moderator'],
    ])
  })

  it('beholder meldingen uten avsender når kontoen slettes', async () => {
    await send('vanligB', tverrgruppe, 'Står igjen')
    await db.query('delete from auth.users where id = $1', [id('vanligB')])
    expect((await les('vanligA', tverrgruppe)).meldinger).toEqual([expect.objectContaining({ tekst: 'Står igjen', forfatter: null, egen: false })])
  })

  it('skriver ingen meldingstekst i tilgangsloggen', async () => {
    const m = await send('vanligA', agruppe, 'Hemmelig syntetisk tekst')
    await endre('vanligA', m.id, 'Annen syntetisk tekst')
    await slett('adminA', m.id)
    expect(JSON.stringify(await rader('select * from public.tilgangslogg'))).not.toMatch(/syntetisk tekst/)
  })
})

describe('uleste og lest', () => {
  it('teller meldingene fra andre etter det som er lest, og flytter bare framover', async () => {
    for (let i = 1; i <= 3; i++) await send('vanligA', agruppe, `Melding ${i}`)
    await send('dobbeltAB', agruppe, 'Egen')
    expect(await uleste('dobbeltAB', agruppe)).toBe(3)
    expect(await uleste('vanligA', agruppe)).toBe(1)
    expect(await uleste('adminA', agruppe)).toBe(4)
    await merkLest('dobbeltAB', agruppe, 2)
    expect(await uleste('dobbeltAB', agruppe)).toBe(1)
    await merkLest('dobbeltAB', agruppe, 1)
    expect((await les('dobbeltAB', agruppe)).lest_til_nr).toBe(2)
    // Aldri forbi den siste meldingen.
    await merkLest('dobbeltAB', agruppe, 999)
    expect((await les('dobbeltAB', agruppe)).lest_til_nr).toBe(4)
    expect(await uleste('dobbeltAB', agruppe)).toBe(0)
    // En slettet melding er ikke ulest.
    const ny = await send('vanligA', agruppe, 'Slettes')
    expect(await uleste('dobbeltAB', agruppe)).toBe(1)
    await slett('vanligA', ny.id)
    expect(await uleste('dobbeltAB', agruppe)).toBe(0)
  })

  it('merker ikke noe lest i en gruppe uten meldinger, og ikke for andre', async () => {
    await merkLest('vanligA', tverrgruppe, 5)
    expect(await rader('select * from public.gruppechat_lest')).toEqual([])
    expect(await uleste('vanligB', tverrgruppe)).toBe(0)
  })
})

describe('lagringstiden', () => {
  const eldes = (nr: number[]) =>
    db.query(`update public.gruppemeldinger set skrevet_kl = now() - interval '12 months 1 day' where nr = any($1::bigint[])`, [nr])

  it('leser aldri ut en melding eldre enn 12 måneder, og sletter den ved neste sending eller lesing', async () => {
    const meldinger: Gruppemelding[] = []
    for (let i = 1; i <= 4; i++) meldinger.push(await send('vanligA', agruppe, `Melding ${i}`))
    await db.query(`update public.gruppemeldinger set skrevet_kl = now() - interval '11 months 29 days' where nr = 3`)
    await eldes([1, 2])
    // Lesingen sletter de utgåtte i gruppen.
    expect((await endringer('adminA', agruppe, 0)).meldinger.map((m) => m.nr)).toEqual([3, 4])
    expect(await uleste('adminA', agruppe)).toBe(2)
    expect(await feil(() => endre('vanligA', meldinger[0]!.id, 'x'))).toEqual({ kode: '42501', melding: MELDINGSAVSLAG })
    expect((await les('adminA', agruppe)).meldinger.map((m) => m.nr)).toEqual([3, 4])
    expect(await rader('select nr from public.gruppemeldinger order by nr')).toEqual([{ nr: 3 }, { nr: 4 }])
    // Løpenummeret og endringstelleren står.
    await eldes([3])
    expect(await send('vanligA', agruppe)).toMatchObject({ nr: 5, endring: 5 })
    expect(await rader('select nr from public.gruppemeldinger order by nr')).toEqual([{ nr: 4 }, { nr: 5 }])
    expect(await rader('select siste_nr, siste_endring from public.gruppechatter where gruppe_id = $1', [agruppe])).toEqual([
      { siste_nr: 5, siste_endring: 5 },
    ])
  })

  it('rydder alle gruppene med intern.rydd_gruppechat', async () => {
    await send('vanligA', agruppe)
    await send('vanligA', tverrgruppe)
    await send('vanligB', tverrgruppe)
    await eldes([1])
    expect(await rader('select intern.rydd_gruppechat() as n')).toEqual([{ n: 2 }])
    expect(await rader('select gruppe_id, nr from public.gruppemeldinger')).toEqual([{ gruppe_id: tverrgruppe, nr: 2 }])
    expect(await rader('select intern.rydd_gruppechat() as n')).toEqual([{ n: 0 }])
  })
})
