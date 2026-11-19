/**
 * D5: direktemeldingene i databasen (docs/direktemeldinger-personvern.md,
 * «De negative testene», T1–T24). Samtidige skrivinger (S1–S7) står i
 * `direktemeldinger.samtidighet.test.ts`.
 *
 * Testene bruker persongalleriet og kaller databasen slik nettleseren gjør
 * det, som den innloggede. Hver test får sin egen kopi av databasen.
 * Direktemeldingene er avslått i migrasjonene; her slås de på, unntatt i
 * testen av bryteren. Samtalen `K` er mellom `vanligA` og `vanligB` (to
 * fagmiljøer), begge med `Tillat direktemeldinger` på.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { PASIENTREGEL } from '@delt/pasientopplysninger'
import { DIREKTE_KONTROLL_SQL, DIREKTE_RYDD_SQL } from '../drift/gruppechatLagringstid'
import { lesChatendringer, lesChatside, lesGruppemelding, type Gruppemelding } from '../gruppechat/modell'
import { lesChatvalg, lesDirektemottakere, lesDirektesamtaler } from '../direktemeldinger/modell'
import { byggPersongalleri, fjernAlleMedlemskap, opprettMedlem, type Person, type Persongalleri } from './hjelp/persongalleri'
import { syntetiskPersonnummer } from './hjelp/syntetiskPersonnummer'
import { hvorStaar } from './hjelp/tekstsok'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
/** Samtalen mellom `vanligA` og `vanligB`. */
let K: string

const id = (p: Person) => galleri.id[p]
const INGEN = '00000000-0000-4000-8000-00000000dead'
const SAMTALEAVSLAG = { kode: '42501', melding: 'Samtalen finnes ikke, eller du har ikke tilgang til den.' }
const MELDINGSAVSLAG = { kode: '42501', melding: 'Meldingen finnes ikke, eller du har ikke tilgang til den.' }
const PERSONAVSLAG = { kode: '42501', melding: 'Personen finnes ikke, eller kan ikke motta direktemeldinger.' }
const KAN_IKKE_MOTTA = { kode: 'PT409', melding: 'Kan ikke motta nye direktemeldinger.' }

const SLA_PA = `create or replace function intern.direktemeldinger_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`
const SLA_AV = SLA_PA.replace("'select true'", "'select false'")

const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await somPerson<Record<string, T>>(person, sql, parametre, i))[0]!)[0] as T

const feil = async (arbeid: () => Promise<unknown>) => {
  const f = await feilFra(arbeid)
  return f ? { kode: f.code, melding: f.message } : null
}

let teller = 0
const nyKlientId = () => `00000000-0000-4000-9000-${String(++teller).padStart(12, '0')}`

const settValg = (p: Person, tillat: boolean | null, visAktiv: boolean | null = null, i: PGlite = db) =>
  verdi(p, 'select public.sett_chatvalg($1, $2)', [tillat, visAktiv], i).then(lesChatvalg)
const valg = async (p: Person) => lesChatvalg(await verdi(p, 'select public.mine_chatvalg()'))
const aapne = (p: Person, mottaker: Person | string, i: PGlite = db) =>
  verdi<string>(p, 'select public.aapne_direktesamtale($1)', [mottaker in galleri.id ? id(mottaker as Person) : mottaker], i)
const send = async (p: Person, samtale = K, tekst = 'Hei', klientId = nyKlientId()) =>
  lesGruppemelding(await verdi(p, 'select public.send_direktemelding($1, $2, $3)', [samtale, klientId, tekst]))!
const les = async (p: Person, samtale = K, forNr: number | null = null) =>
  lesChatside(await verdi(p, 'select public.les_direktesamtale($1, $2)', [samtale, forNr]))!
const endringer = async (p: Person, samtale = K, etter = 0) =>
  lesChatendringer(await verdi(p, 'select public.direktesamtale_endringer($1, $2)', [samtale, etter]))!
const endre = async (p: Person, melding: string, tekst: string) =>
  lesGruppemelding(await verdi(p, 'select public.endre_direktemelding($1, $2)', [melding, tekst]))!
const slett = async (p: Person, melding: string) => lesGruppemelding(await verdi(p, 'select public.slett_direktemelding($1)', [melding]))!
const merkLest = (p: Person, samtale: string, tilNr: number) => verdi(p, 'select public.merk_direktesamtale_lest($1, $2)', [samtale, tilNr])
const samtaler = async (p: Person) => lesDirektesamtaler(await verdi(p, 'select public.mine_direktesamtaler()'))
const sok = async (p: Person, tekst: string) => lesDirektemottakere(await verdi(p, 'select public.sok_direktemottakere($1)', [tekst]))
const blokker = (p: Person, mal: Person | string) =>
  verdi(p, 'select public.blokker_bruker($1)', [mal in galleri.id ? id(mal as Person) : mal])
const opphev = (p: Person, mal: Person) => verdi(p, 'select public.opphev_blokkering($1)', [id(mal)])
const aktive = (p: Person) => verdi<string[]>(p, 'select public.aktive_motparter()')
const marker = (p: Person) => verdi(p, 'select public.marker_chataktivitet()')

/** Rader direkte i databasen, forbi radsikkerheten. */
const rader = async <T>(sql: string, parametre: unknown[] = []) => (await db.query<T>(sql, parametre)).rows

/** Hver inngang til samtalen og meldingen, med feilen den gir (null: gikk). */
async function innganger(p: Person, samtale: string, melding: string) {
  return {
    les: await feil(() => les(p, samtale)),
    endringer: await feil(() => endringer(p, samtale)),
    send: await feil(() => send(p, samtale)),
    merk: await feil(() => merkLest(p, samtale, 1)),
    demp: await feil(() => verdi(p, 'select public.demp_direktesamtale($1, true)', [samtale])),
    skjul: await feil(() => verdi(p, 'select public.skjul_direktesamtale($1)', [samtale])),
    endre: await feil(() => endre(p, melding, 'Endret')),
    slett: await feil(() => slett(p, melding)),
  }
}

const ALLE_UTEN_TILGANG = {
  les: SAMTALEAVSLAG,
  endringer: SAMTALEAVSLAG,
  send: SAMTALEAVSLAG,
  merk: SAMTALEAVSLAG,
  demp: SAMTALEAVSLAG,
  skjul: SAMTALEAVSLAG,
  endre: MELDINGSAVSLAG,
  slett: MELDINGSAVSLAG,
}

const PERSONER_PA: readonly Person[] = ['vanligA', 'vanligB', 'dobbeltAB', 'avsluttetA', 'adminA', 'systemarkitekt', 'arkitektB', 'adminB']

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  for (const p of PERSONER_PA) await settValg(p, true, null, basis)
  K = await aapne('vanligA', 'vanligB', basis)
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

describe('bryteren for hele funksjonen (T22)', () => {
  it('stenger alle inngangene mens direktemeldingene er avslått, også for deltakerne', async () => {
    const melding = await send('vanligA')
    await db.exec(SLA_AV)
    const av = { kode: '42501', melding: 'Direktemeldingene er ikke slått på.' }
    expect(await innganger('vanligA', K, melding.id)).toEqual(Object.fromEntries(Object.keys(ALLE_UTEN_TILGANG).map((k) => [k, av])))
    for (const sql of [
      'select public.mine_chatvalg()',
      'select public.sett_chatvalg(true, true)',
      `select public.sok_direktemottakere('test')`,
      'select public.mine_direktesamtaler()',
      'select public.mine_blokkeringer()',
      'select public.marker_chataktivitet()',
      'select public.aktive_motparter()',
    ]) {
      expect(await feil(() => somPerson('vanligA', sql)), sql).toEqual(av)
    }
    expect(await feil(() => aapne('vanligA', 'dobbeltAB'))).toEqual(av)
    expect(await feil(() => blokker('vanligA', 'vanligB'))).toEqual(av)
    expect(await somPerson('vanligA', 'select id from public.direktesamtaler')).toEqual([])
    expect(await verdi('vanligA', 'select public.kan_bruke_direktemeldinger()')).toBe(false)
    // Profilen til den andre er ikke lenger synlig gjennom samtalen.
    expect(await somPerson('vanligA', 'select id from public.profiles where id = $1', [id('vanligB')])).toEqual([])
  })

  it('er slått på etter Peders beslutning 4 (migrasjonen *_direktemeldinger_aktivering.sql)', async () => {
    const ny = await nyDatabase()
    try {
      expect((await ny.query<{ pa: boolean }>('select intern.direktemeldinger_aktivert() as pa')).rows[0]?.pa).toBe(true)
    } finally {
      await ny.close()
    }
  })
})

describe('de to deltakerne', () => {
  it('sender, leser, endrer og sletter, med samme form som gruppechatten', async () => {
    const a = await send('vanligA', K, 'Første')
    expect(a).toMatchObject({ nr: 1, endring: 1, egen: true, kan_endre: true, kan_slette: true, tekst: 'Første', slettet: null })
    expect(a.forfatter?.id).toBe(id('vanligA'))
    await send('vanligB', K, 'Svar')
    const side = await les('vanligA')
    expect(side.meldinger.map((m) => [m.tekst, m.egen, m.kan_endre, m.kan_slette])).toEqual([
      ['Første', true, true, true],
      ['Svar', false, false, true],
    ])
    expect(side).toMatchObject({ kan_skrive: true, kan_moderere: false, siste_endring: 2, lesere: { medlemmer: 2, systemarkitekter: false } })
    expect(side.grenser).toEqual({ maks_tegn: 4000, maks_per_minutt: 20 })
    expect(side.direkte).toEqual({ motpart: expect.objectContaining({ id: id('vanligB'), username: 'test.vanligb' }), sperre: null, dempet: false })
    const endret = await endre('vanligA', a.id, 'Første, endret')
    expect(endret).toMatchObject({ tekst: 'Første, endret', endring: 3 })
    expect(endret.redigert_kl).not.toBeNull()
    expect((await endringer('vanligB', K, 2)).meldinger.map((m) => m.tekst)).toEqual(['Første, endret'])
    // Samme klient-ID gir den samme meldingen.
    const klient = nyKlientId()
    const en = await send('vanligB', K, 'Én gang', klient)
    expect((await send('vanligB', K, 'Én gang', klient)).id).toBe(en.id)
    expect((await les('vanligB')).meldinger).toHaveLength(3)
  })

  it('gir samme samtale for samme par, uansett hvem som åpner (T6)', async () => {
    expect(await aapne('vanligB', 'vanligA')).toBe(K)
    expect(await aapne('vanligA', 'vanligB')).toBe(K)
    expect(await rader('select count(*)::int as n from public.direktesamtaler')).toEqual([{ n: 1 }])
  })

  it('lister samtalen med den andre, siste aktivitet og uleste, uten tekst', async () => {
    // En tom samtale står bare hos den som startet den.
    expect((await samtaler('vanligA')).map((s) => s.id)).toEqual([K])
    expect(await samtaler('vanligB')).toEqual([])
    await send('vanligA', K, 'Syntetisk hemmelig')
    await send('vanligA', K, 'To')
    const [s] = await samtaler('vanligB')
    expect(s).toMatchObject({ id: K, uleste: 2, dempet: false, kan_skrive: true })
    expect(s?.motpart?.id).toBe(id('vanligA'))
    expect(s?.siste_kl).not.toBeNull()
    expect(JSON.stringify(await verdi('vanligB', 'select public.mine_direktesamtaler()'))).not.toContain('hemmelig')
    await merkLest('vanligB', K, 1)
    expect((await samtaler('vanligB'))[0]?.uleste).toBe(1)
    await merkLest('vanligB', K, 99)
    expect((await samtaler('vanligB'))[0]?.uleste).toBe(0)
    expect((await les('vanligB')).lest_til_nr).toBe(2)
  })

  it('gjør profilen til den andre synlig for dem to, også på tvers av fagmiljøene', async () => {
    const synlig = async (p: Person, mal: Person) => (await somPerson(p, 'select id from public.profiles where id = $1', [id(mal)])).length === 1
    expect(await synlig('vanligA', 'vanligB')).toBe(true)
    expect(await synlig('vanligB', 'vanligA')).toBe(true)
    // Ikke for andre i B, og ikke gjennom søket alene.
    expect(await synlig('adminB', 'vanligA')).toBe(false)
    await sok('adminB', 'vanliga')
    expect(await synlig('adminB', 'vanligA')).toBe(false)
  })

  it('avviser tom og for lang tekst og fødselsnumre, uten teksten i feilen', async () => {
    expect(await feil(() => send('vanligA', K, '   '))).toEqual({ kode: '22023', melding: 'Meldingen er tom.' })
    expect((await feil(() => send('vanligA', K, 'x'.repeat(4001))))?.kode).toBe('22023')
    const nummer = syntetiskPersonnummer(14, 3, 87)
    expect(await feil(() => send('vanligA', K, `Syntetisk merketekst ${nummer}`))).toEqual({ kode: '22023', melding: PASIENTREGEL.avvist })
    const m = await send('vanligA', K, 'Ok')
    expect(await feil(() => endre('vanligA', m.id, `Syntetisk ${nummer}`))).toEqual({ kode: '22023', melding: PASIENTREGEL.avvist })
    expect(await hvorStaar(db, 'merketekst')).toEqual([])
  })
})

describe('tilgangen (T1–T4)', () => {
  const UTENFOR: readonly Person[] = ['systemarkitekt', 'arkitektB', 'adminA', 'adminB', 'dobbeltAB']

  it('gir tredjepersoner, også systemarkitektene og administratorene, det samme svaret som for en samtale som ikke finnes', async () => {
    const melding = await send('vanligA', K, 'Syntetisk privat')
    // T2: en tilfeldig ID gir det samme svaret.
    expect(await innganger('dobbeltAB', INGEN, INGEN)).toEqual(ALLE_UTEN_TILGANG)
    for (const p of UTENFOR) {
      expect(await innganger(p, K, melding.id), p).toEqual(ALLE_UTEN_TILGANG)
      expect(await somPerson(p, 'select id from public.direktesamtaler'), p).toEqual([])
      expect(await samtaler(p), p).toEqual([])
      expect(await aktive(p), p).toEqual([])
    }
    // Ingenting er endret av forsøkene.
    expect(await rader('select tekst from public.direktemeldinger')).toEqual([{ tekst: 'Syntetisk privat' }])
    expect(await rader('select count(*)::int as n from public.direktesamtale_status')).toEqual([{ n: 0 }])
  })

  it('stenger tabellene for nettleseren; samtaleraden kan bare leses av de to, og uten hvem som startet (T3)', async () => {
    await send('vanligA')
    for (const tabell of ['direktemeldinger', 'direktesamtale_status', 'direktemelding_blokkeringer', 'chatvalg', 'chataktivitet']) {
      expect((await feil(() => somPerson('vanligA', `select * from public.${tabell}`)))?.kode, tabell).toBe('42501')
    }
    expect((await feil(() => somPerson('vanligA', 'select * from public.direktesamtaler')))?.kode).toBe('42501')
    const kolonner = 'id, bruker_lav, bruker_hoy, siste_nr, siste_endring, endret_kl'
    expect((await somPerson<{ id: string }>('vanligA', `select ${kolonner} from public.direktesamtaler`)).map((r) => r.id)).toEqual([K])
    expect((await somPerson<{ id: string }>('vanligB', `select ${kolonner} from public.direktesamtaler`)).map((r) => r.id)).toEqual([K])
    expect((await feil(() => somPerson('vanligA', 'select opprettet_av from public.direktesamtaler')))?.kode).toBe('42501')
    for (const sql of [
      'update public.direktesamtaler set siste_nr = 99',
      'delete from public.direktesamtaler',
      `insert into public.direktesamtaler (bruker_lav, bruker_hoy) values ('${INGEN}', '${INGEN.replace('dead', 'deae')}')`,
      `insert into public.direktemeldinger (samtale_id, nr, klient_id, tekst, endring) values ('${K}', 9, '${INGEN}', 'x', 9)`,
      `insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ('${id('vanligA')}', true)`,
      `insert into public.direktemelding_blokkeringer (blokkerer, blokkert) values ('${id('vanligA')}', '${id('vanligB')}')`,
    ]) {
      expect((await feil(() => somPerson('vanligA', sql)))?.kode, sql).toBe('42501')
    }
  })

  it('legger bare samtaleraden i sanntiden, uten tekst og avsender (T4)', async () => {
    const tabeller = await rader<{ tablename: string }>(
      `select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename in
        ('direktesamtaler', 'direktemeldinger', 'direktesamtale_status', 'direktemelding_blokkeringer', 'chatvalg', 'chataktivitet')`,
    )
    expect(tabeller.map((t) => t.tablename)).toEqual(['direktesamtaler'])
    const kolonner = await rader<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'direktesamtaler' order by column_name`,
    )
    expect(kolonner.map((k) => k.column_name).some((k) => /tekst|forfatter/.test(k))).toBe(false)
  })
})

describe('bryteren for den enkelte (T5–T7, T11, T15, T16)', () => {
  it('står av for alle fra starten', async () => {
    expect(await valg('vanligA')).toEqual({ tillat_direktemeldinger: true, vis_aktiv: false })
    expect(await valg('redaktorRessursA')).toEqual({ tillat_direktemeldinger: false, vis_aktiv: false })
    expect(await rader(`select count(*)::int as n from public.chatvalg where bruker_id = $1`, [id('redaktorRessursA')])).toEqual([{ n: 0 }])
  })

  it('gjør den som slår av, usøkbar og ute av stand til å motta, uten å slette noe (T5, T6)', async () => {
    await send('vanligA', K, 'Før')
    await send('vanligB', K, 'Svar før')
    await settValg('vanligB', false)
    expect(await sok('vanligA', 'vanligb')).toEqual([])
    expect(await feil(() => send('vanligA', K, 'Etter'))).toEqual(KAN_IKKE_MOTTA)
    expect((await les('vanligA')).direkte?.sperre).toBe('mottaker')
    expect((await les('vanligA')).kan_skrive).toBe(false)
    expect((await samtaler('vanligA'))[0]?.kan_skrive).toBe(false)
    // Historikken står for begge.
    expect((await les('vanligA')).meldinger.map((m) => m.tekst)).toEqual(['Før', 'Svar før'])
    expect((await les('vanligB')).meldinger.map((m) => m.tekst)).toEqual(['Før', 'Svar før'])
    await settValg('vanligB', true)
    expect(await aapne('vanligA', 'vanligB')).toBe(K)
    expect((await send('vanligA', K, 'Igjen')).nr).toBe(3)
  })

  it('lar den som selv har slått av, lese og slette, men ikke søke, starte eller sende (T7)', async () => {
    const egen = await send('vanligA', K, 'Egen')
    const annen = await send('vanligB', K, 'Annen')
    await settValg('vanligA', false)
    expect(await feil(() => sok('vanligA', 'test'))).toEqual({ kode: 'PT409', melding: 'Slå på «Tillat direktemeldinger» for å finne andre.' })
    expect(await feil(() => aapne('vanligA', 'dobbeltAB'))).toEqual({
      kode: 'PT409',
      melding: 'Slå på «Tillat direktemeldinger» for å starte en samtale.',
    })
    expect(await feil(() => send('vanligA'))).toEqual({ kode: 'PT409', melding: 'Du har slått av direktemeldinger. Slå dem på for å skrive.' })
    expect((await les('vanligA')).direkte?.sperre).toBe('selv_av')
    // Den andre ser den felles teksten, ikke grunnen.
    expect(await feil(() => send('vanligB'))).toEqual(KAN_IKKE_MOTTA)
    expect((await les('vanligB')).direkte?.sperre).toBe('mottaker')
    expect((await les('vanligA')).meldinger).toHaveLength(2)
    expect((await slett('vanligA', egen.id)).slettet?.av).toBe('forfatter')
    expect((await slett('vanligA', annen.id)).slettet?.av).toBe('motpart')
  })

  it('søker bare blant aktive andre som har slått på, uten blokkerte, høyst 20, med bare fire felt (T11, T16)', async () => {
    const treff = await sok('vanligA', 'test.')
    const ider = treff.map((t) => t.id)
    expect(ider).not.toContain(id('vanligA'))
    expect(ider).toContain(id('vanligB'))
    expect(ider).not.toContain(id('redaktorRessursA'))
    expect(ider).not.toContain(id('utenMedlemskap'))
    const svar = await verdi<Record<string, unknown>[]>('vanligA', 'select public.sok_direktemottakere($1)', ['vanligb'])
    expect(svar).toHaveLength(1)
    expect(Object.keys(svar[0]!).sort()).toEqual(['first_name', 'id', 'last_name', 'username'])
    expect(await feil(() => sok('vanligA', ' x '))).toEqual({ kode: '22023', melding: 'Skriv minst to tegn.' })
    // Søk på navn og et prosenttegn som bokstav.
    expect((await sok('vanligA', 'test vanligb')).map((t) => t.id)).toEqual([id('vanligB')])
    expect(await sok('vanligA', '%%')).toEqual([])
    // Høyst 20 treff.
    for (let i = 0; i < 25; i++) {
      await db.query(`insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ($1, true) on conflict (bruker_id) do update set tillat_direktemeldinger = true`, [
        id(Object.keys(galleri.id)[i % Object.keys(galleri.id).length] as Person),
      ])
    }
    expect((await sok('vanligA', 'test')).length).toBeLessThanOrEqual(20)
    // Uten aktivt medlemskap: aldri i søket, og ingen tilgang.
    await db.query(`insert into public.chatvalg (bruker_id, tillat_direktemeldinger) values ($1, true) on conflict (bruker_id) do update set tillat_direktemeldinger = true`, [
      id('utenMedlemskap'),
    ])
    expect((await sok('vanligA', 'utenmedlemskap')).map((t) => t.id)).toEqual([])
    expect((await feil(() => sok('utenMedlemskap', 'vanliga')))?.kode).toBe('42501')
  })

  it('avviser sending til seg selv, og gir samme svar for en som ikke finnes og en som ikke kan finnes (T15)', async () => {
    expect(await feil(() => aapne('vanligA', 'vanligA'))).toEqual({ kode: '22023', melding: 'Du kan ikke sende direktemeldinger til deg selv.' })
    expect(await feil(() => aapne('vanligA', INGEN))).toEqual(PERSONAVSLAG)
    expect(await feil(() => aapne('vanligA', 'redaktorRessursA'))).toEqual(PERSONAVSLAG)
    expect(await feil(() => aapne('vanligA', 'utenMedlemskap'))).toEqual(PERSONAVSLAG)
    expect(await rader('select count(*)::int as n from public.direktesamtaler')).toEqual([{ n: 1 }])
  })
})

describe('blokkeringen (T8, T9)', () => {
  it('virker begge veier for sending, søk og aktivitet, sletter ingenting og kan oppheves (T8)', async () => {
    await settValg('vanligA', null, true)
    await settValg('vanligB', null, true)
    await send('vanligA', K, 'Før')
    await marker('vanligA')
    await marker('vanligB')
    expect(await aktive('vanligB')).toEqual([id('vanligA')])
    await blokker('vanligB', 'vanligA')
    // Den blokkerte får den felles teksten, ikke grunnen.
    expect(await feil(() => send('vanligA'))).toEqual(KAN_IKKE_MOTTA)
    expect((await les('vanligA')).direkte?.sperre).toBe('mottaker')
    expect(await feil(() => send('vanligB'))).toEqual({ kode: 'PT409', melding: 'Du har blokkert denne personen. Opphev blokkeringen for å skrive.' })
    expect((await les('vanligB')).direkte?.sperre).toBe('selv_blokkert')
    expect(await sok('vanligA', 'vanligb')).toEqual([])
    expect(await sok('vanligB', 'vanliga')).toEqual([])
    expect(await aktive('vanligA')).toEqual([])
    expect(await aktive('vanligB')).toEqual([])
    expect((await les('vanligA')).meldinger.map((m) => m.tekst)).toEqual(['Før'])
    // Den som blokkerte, ser det i lista si; den blokkerte ser ingenting.
    expect((await verdi<{ id: string }[]>('vanligB', 'select public.mine_blokkeringer()')).map((p) => p.id)).toEqual([id('vanligA')])
    expect(await verdi('vanligA', 'select public.mine_blokkeringer()')).toEqual([])
    await opphev('vanligB', 'vanligA')
    expect((await send('vanligA', K, 'Etter')).nr).toBe(2)
    expect((await sok('vanligA', 'vanligb')).map((t) => t.id)).toEqual([id('vanligB')])
    expect(await aktive('vanligB')).toEqual([id('vanligA')])
  })

  it('lar ikke den blokkerte endre tekst den andre har lest, men slette sin egen (T9)', async () => {
    const m = await send('vanligA', K, 'Lest')
    await blokker('vanligB', 'vanligA')
    expect(await feil(() => endre('vanligA', m.id, 'Endret etterpå'))).toEqual(KAN_IKKE_MOTTA)
    expect((await les('vanligA')).meldinger[0]).toMatchObject({ kan_endre: false, kan_slette: true })
    expect((await slett('vanligA', m.id)).tekst).toBeNull()
  })

  it('kan bare ramme noen man har en samtale med eller finner i søket', async () => {
    expect(await feil(() => blokker('vanligA', 'redaktorRessursA'))).toEqual(PERSONAVSLAG)
    expect(await feil(() => blokker('vanligA', INGEN))).toEqual(PERSONAVSLAG)
    expect(await feil(() => blokker('vanligA', 'vanligA'))).toEqual({ kode: '22023', melding: 'Du kan ikke blokkere deg selv.' })
    await blokker('vanligA', 'dobbeltAB')
    await blokker('vanligA', 'dobbeltAB')
    expect(await rader('select count(*)::int as n from public.direktemelding_blokkeringer')).toEqual([{ n: 1 }])
    // En blokkering kan bare oppheves av den som blokkerte.
    await opphev('dobbeltAB', 'vanligA')
    expect(await rader('select count(*)::int as n from public.direktemelding_blokkeringer')).toEqual([{ n: 1 }])
  })
})

describe('medlemskapet (T10–T14)', () => {
  it('stenger alt med en gang når medlemskapet avsluttes, og åpner igjen når det kommer tilbake (T10)', async () => {
    const m = await send('vanligB', K, 'Hei A')
    await fjernAlleMedlemskap(db, id('vanligA'))
    const ute = await innganger('vanligA', K, m.id)
    for (const [inngang, svar] of Object.entries(ute)) expect(svar?.kode, inngang).toBe('42501')
    expect(await somPerson('vanligA', 'select id from public.direktesamtaler')).toEqual([])
    expect(await feil(() => send('vanligB', K))).toEqual(KAN_IKKE_MOTTA)
    expect(await sok('vanligB', 'vanliga')).toEqual([])
    expect((await samtaler('vanligB'))[0]?.kan_skrive).toBe(false)
    await opprettMedlem(db, id('vanligA'), galleri.fagmiljo.A, { primaer: true })
    expect((await les('vanligA')).meldinger.map((x) => x.tekst)).toEqual(['Hei A'])
    expect((await send('vanligB', K, 'Velkommen tilbake')).nr).toBe(2)
    expect(await valg('vanligA')).toEqual({ tillat_direktemeldinger: true, vis_aktiv: false })
  })

  it('lar en som er avsluttet i ett fagmiljø og aktiv i et annet, bruke direktemeldinger (T12)', async () => {
    const s = await aapne('avsluttetA', 'vanligA')
    expect((await send('avsluttetA', s, 'Hei')).nr).toBe(1)
    expect((await les('vanligA', s)).meldinger).toHaveLength(1)
  })

  it('endres ikke når arbeidsfagmiljøet byttes (T13)', async () => {
    const s = await aapne('dobbeltAB', 'vanligB')
    await send('dobbeltAB', s, 'Fra A')
    const for_ = { samtaler: await samtaler('dobbeltAB'), sok: await sok('dobbeltAB', 'vanlig') }
    await verdi('dobbeltAB', 'select public.velg_arbeidsfagmiljo($1)', [galleri.fagmiljo.B])
    expect({ samtaler: await samtaler('dobbeltAB'), sok: await sok('dobbeltAB', 'vanlig') }).toEqual(for_)
    expect((await send('dobbeltAB', s, 'Fra B')).nr).toBe(2)
  })

  it('lar den andre lese og slette, men ikke sende, når kontoen er slettet (T14)', async () => {
    const egen = await send('vanligA', K, 'Til B')
    const fraB = await send('vanligB', K, 'Fra B')
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk sletting i testen', true)`)
      await tx.query('delete from auth.users where id = $1', [id('vanligB')])
    })
    const side = await les('vanligA')
    expect(side.direkte).toMatchObject({ motpart: null, sperre: 'mottaker' })
    expect(side.meldinger.map((m) => [m.tekst, m.forfatter?.id ?? null])).toEqual([
      ['Til B', id('vanligA')],
      ['Fra B', null],
    ])
    expect(await feil(() => send('vanligA'))).toEqual(KAN_IKKE_MOTTA)
    expect((await samtaler('vanligA'))[0]).toMatchObject({ id: K, motpart: null, kan_skrive: false })
    expect((await slett('vanligA', fraB.id)).slettet?.av).toBe('motpart')
    expect((await slett('vanligA', egen.id)).slettet?.av).toBe('forfatter')
    // Valgene og blokkeringene til den slettede kontoen er borte med den.
    expect(await rader('select count(*)::int as n from public.chatvalg where bruker_id = $1', [id('vanligB')])).toEqual([{ n: 0 }])
  })
})

describe('slettingen og teksten (T17, T18)', () => {
  it('lar begge slette alle meldinger og en utenforstående ingen, uten at teksten står igjen noe sted (T17)', async () => {
    const a = await send('vanligA', K, 'Syntetisk merketekst alfa')
    const b = await send('vanligB', K, 'Syntetisk merketekst beta')
    await endre('vanligA', a.id, 'Syntetisk merketekst gamma')
    expect(await hvorStaar(db, 'merketekst alfa')).toEqual([])
    expect(await hvorStaar(db, 'merketekst gamma')).toEqual(['public.direktemeldinger.tekst'])
    expect(await feil(() => slett('dobbeltAB', a.id))).toEqual(MELDINGSAVSLAG)
    const slettetAvB = await slett('vanligB', a.id)
    expect(slettetAvB).toMatchObject({ tekst: null, slettet: { av: 'motpart' }, kan_slette: false })
    expect((await slett('vanligB', b.id)).slettet?.av).toBe('forfatter')
    // Idempotent.
    expect((await slett('vanligA', a.id)).slettet?.av).toBe('motpart')
    for (const t of ['merketekst alfa', 'merketekst beta', 'merketekst gamma']) expect(await hvorStaar(db, t), t).toEqual([])
    const side = await les('vanligA')
    expect(side.meldinger.map((m) => [m.tekst, m.slettet?.av])).toEqual([
      [null, 'motpart'],
      [null, 'forfatter'],
    ])
    expect(await rader('select tekst from public.direktemeldinger')).toEqual([{ tekst: null }, { tekst: null }])
  })

  it('gir ingen varsler i bjella og ingen tekst i tilgangsloggen eller feilmeldingene (T18)', async () => {
    const for_ = await rader<{ n: number }>('select count(*)::int as n from public.varsler')
    await send('vanligA', K, 'Syntetisk merketekst delta')
    expect(await rader<{ n: number }>('select count(*)::int as n from public.varsler')).toEqual(for_)
    expect(await hvorStaar(db, 'merketekst delta')).toEqual(['public.direktemeldinger.tekst'])
    await settValg('vanligB', false)
    const avslag = await feil(() => send('vanligA', K, 'Syntetisk merketekst epsilon'))
    expect(avslag).toEqual(KAN_IKKE_MOTTA)
    expect(await hvorStaar(db, 'merketekst epsilon')).toEqual([])
  })
})

describe('lagringstiden (T19)', () => {
  it('leser aldri ut en melding eldre enn 12 måneder, og rydder den og tomme, gamle samtaler', async () => {
    const gammel = await send('vanligA', K, 'Gammel')
    await send('vanligB', K, 'Ny')
    await db.query(`update public.direktemeldinger set skrevet_kl = now() - interval '12 months 1 day' where id = $1`, [gammel.id])
    const side = await les('vanligB')
    expect(side.meldinger.map((m) => m.tekst)).toEqual(['Ny'])
    expect(await rader('select tekst from public.direktemeldinger')).toEqual([{ tekst: 'Ny' }])
    expect(await feil(() => slett('vanligA', gammel.id))).toEqual(MELDINGSAVSLAG)
    // Nattjobben: alle samtaler, og tomme samtaler uten aktivitet på 12 måneder.
    const tom = await aapne('vanligA', 'dobbeltAB')
    const annen = await aapne('vanligB', 'adminB')
    const glemt = await send('vanligB', annen, 'Glemt')
    await db.query(`update public.direktemeldinger set skrevet_kl = now() - interval '13 months' where id = $1`, [glemt.id])
    await db.query(`update public.direktesamtaler set endret_kl = now() - interval '13 months' where id in ($1, $2)`, [tom, annen])
    expect((await db.query<{ slettet: number }>(DIREKTE_RYDD_SQL)).rows[0]?.slettet).toBe(1)
    expect((await rader<{ id: string }>('select id from public.direktesamtaler order by id')).map((r) => r.id)).toEqual([K])
    expect((await db.query<{ gjenstar: number }>(DIREKTE_KONTROLL_SQL)).rows[0]?.gjenstar).toBe(0)
  })
})

describe('lagringstiden under bruk (T19)', () => {
  it('gir aldri ut en utgått melding på nytt, heller ikke for den samme klient-ID-en', async () => {
    const klient = nyKlientId()
    const gammel = await send('vanligA', K, 'Syntetisk utgått', klient)
    await db.query(`update public.direktemeldinger set skrevet_kl = now() - interval '12 months 1 day' where id = $1`, [gammel.id])
    // Nattjobben har ikke kjørt: den samme klient-ID-en gir en ny melding, og den gamle er borte.
    const ny = await send('vanligA', K, 'Syntetisk ny', klient)
    expect(ny.id).not.toBe(gammel.id)
    expect(ny.tekst).toBe('Syntetisk ny')
    expect(await rader('select tekst from public.direktemeldinger where samtale_id = $1', [K])).toEqual([{ tekst: 'Syntetisk ny' }])
  })

  it('sier i endringene hvor fristen går, så en åpen samtale kan fjerne det som har utgått', async () => {
    const e = await endringer('vanligB')
    // Spørringen etterpå er noen millisekunder senere enn svaret.
    const [rad] = await rader<{ forventet: string }>(
      `select to_jsonb(now() - intern.direktemelding_lagringstid()) #>> '{}' as forventet`,
    )
    const avstand = Date.parse(rad!.forventet) - Date.parse(e.frist!)
    expect(avstand).toBeGreaterThanOrEqual(0)
    expect(avstand).toBeLessThan(60_000)
  })
})

describe('aktivitetsstatusen (T20)', () => {
  it('er usynlig når den er av, uten samtale og ved blokkering, og gir aldri et tidspunkt', async () => {
    await marker('vanligA')
    expect(await aktive('vanligB')).toEqual([])
    expect(await rader('select count(*)::int as n from public.chataktivitet')).toEqual([{ n: 0 }])
    await settValg('vanligA', null, true)
    await settValg('dobbeltAB', null, true)
    await marker('vanligA')
    await marker('dobbeltAB')
    expect(await aktive('vanligB')).toEqual([id('vanligA')])
    // Uten samtale: usynlig.
    expect(await aktive('adminA')).toEqual([])
    expect(await aktive('vanligA')).toEqual([])
    // Raden har bare en frist, høyst to minutter fram.
    const [rad] = await rader<{ kolonner: string[]; sekunder: number }>(
      `select array(select column_name::text from information_schema.columns where table_name = 'chataktivitet' order by 1) as kolonner,
              extract(epoch from aktiv_til - now())::int as sekunder from public.chataktivitet where bruker_id = $1`,
      [id('vanligA')],
    )
    expect(rad?.kolonner).toEqual(['aktiv_til', 'bruker_id'])
    expect(rad?.sekunder).toBeLessThanOrEqual(120)
    // Etter fristen: borte, også raden.
    await db.query(`update public.chataktivitet set aktiv_til = now() - interval '1 second'`)
    expect(await aktive('vanligB')).toEqual([])
    expect(await rader('select count(*)::int as n from public.chataktivitet')).toEqual([{ n: 0 }])
    // Slås bryteren av, er raden borte med en gang.
    await marker('vanligA')
    await settValg('vanligA', null, false)
    expect(await rader('select count(*)::int as n from public.chataktivitet where bruker_id = $1', [id('vanligA')])).toEqual([{ n: 0 }])
    expect(await aktive('vanligB')).toEqual([])
  })
})

describe('demping og skjuling (T21)', () => {
  it('lar en dempet samtale stå uten å telle, og en skjult komme tilbake ved ny melding; den andre merker ingenting', async () => {
    await send('vanligA', K, 'En')
    await verdi('vanligB', 'select public.demp_direktesamtale($1, true)', [K])
    expect((await samtaler('vanligB'))[0]).toMatchObject({ dempet: true, uleste: 1 })
    expect((await les('vanligB')).direkte?.dempet).toBe(true)
    expect((await les('vanligA')).direkte?.dempet).toBe(false)
    await verdi('vanligB', 'select public.skjul_direktesamtale($1)', [K])
    expect(await samtaler('vanligB')).toEqual([])
    expect((await samtaler('vanligA')).map((s) => s.id)).toEqual([K])
    await send('vanligA', K, 'To')
    expect((await samtaler('vanligB')).map((s) => s.id)).toEqual([K])
    expect(await rader('select count(*)::int as n from public.direktemeldinger')).toEqual([{ n: 2 }])
  })
})

describe('gruppechatten (T23)', () => {
  it('påvirkes ikke av bryterne og blokkeringene', async () => {
    await db.exec(`create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`)
    const gruppe = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, null)', ['Tverrgruppen', 'Syntetisk'])
    for (const p of ['vanligA', 'vanligB'] as const) {
      await verdi('systemarkitekt', 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${p.toLowerCase()}`])
      await verdi(p, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe])
    }
    await settValg('vanligB', false)
    await blokker('vanligA', 'vanligB')
    const m = lesGruppemelding(await verdi('vanligB', 'select public.send_gruppemelding($1, $2, $3)', [gruppe, nyKlientId(), 'Til gruppen'])) as Gruppemelding
    expect(m.tekst).toBe('Til gruppen')
    const side = lesChatside(await verdi('vanligA', 'select public.les_gruppechat($1)', [gruppe]))!
    expect(side.meldinger.map((x) => x.tekst)).toEqual(['Til gruppen'])
    expect(side.direkte).toBeNull()
  })
})

describe('takten og grensene (T24)', () => {
  it('avviser mer enn 20 i minuttet per samtale og 60 til sammen', async () => {
    for (let i = 0; i < 20; i++) await send('vanligA', K, `M${i}`)
    const for_fort = { kode: 'PT429', melding: 'Du sender meldinger for fort. Vent litt og prøv igjen.' }
    expect(await feil(() => send('vanligA'))).toEqual(for_fort)
    // Den andre i samtalen har sin egen takt.
    expect((await send('vanligB')).nr).toBe(21)
    for (const mal of ['dobbeltAB', 'avsluttetA'] as const) {
      const s = await aapne('vanligA', mal)
      for (let i = 0; i < 20; i++) await send('vanligA', s, `M${i}`)
    }
    const fjerde = await aapne('vanligA', 'adminA')
    expect(await feil(() => send('vanligA', fjerde))).toEqual(for_fort)
    // Etter et minutt går det igjen.
    await db.query(`update public.direktemeldinger set skrevet_kl = skrevet_kl - interval '61 seconds'`)
    expect((await send('vanligA', fjerde)).nr).toBe(1)
  })

  it('avviser mer enn 10 nye samtaler i timen', async () => {
    // Syntetiske kontoer som har slått på, så det finnes nok å starte samtaler med.
    const andre: string[] = []
    for (let i = 0; i < 11; i++) {
      andre.push(await opprettBruker(db, { brukernavn: `test.takt${i}`, fornavn: 'Takt', etternavn: `Nr${i}`, rolle: 'user' }))
    }
    await db.query(`insert into public.chatvalg (bruker_id, tillat_direktemeldinger) select unnest($1::uuid[]), true`, [andre])
    // Samtalen K, som `vanligA` startet i oppsettet, teller med: ni nye til, så er grensen nådd.
    const aapnede: string[] = []
    for (const mal of andre.slice(0, 9)) aapnede.push(await aapne('vanligA', mal))
    expect(new Set([K, ...aapnede]).size).toBe(10)
    expect(await feil(() => aapne('vanligA', andre[9]!))).toEqual({
      kode: 'PT429',
      melding: 'Du har startet mange nye samtaler. Vent litt og prøv igjen.',
    })
    // Etter en time går det igjen.
    await db.query(`update public.direktesamtaler set opprettet_kl = opprettet_kl - interval '61 minutes'`)
    expect(typeof (await aapne('vanligA', andre[10]!))).toBe('string')
    // En samtale som finnes, åpnes uansett.
    expect(await aapne('vanligA', andre[0]!)).toBe(aapnede[0])
  })
})
