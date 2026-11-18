/**
 * Varslene om gruppechatten og dørklokken i publikasjonen (docs/gruppechat.md,
 * «Uleste» og «Sanntiden»; docs/varsler.md).
 *
 * P7 ga ett varsel per gruppe i bjella. Fra D4b står uleste chatmeldinger bare
 * på chatknappen og i samtalelista (`gruppechat_lest`): en ny melding lager
 * ingen varsler, og de som sto uleste da D4b ble rullet ut, er merket lest uten
 * at noe er slettet. Testen bygger databasen fram til D4b-migrasjonen, lager
 * et ulest chatvarsel slik P7 gjorde, og kjører så resten.
 *
 * Persongalleriet (syntetiske kontoer), med chatten slått på i testdatabasen.
 * «A-gruppen» i A har `adminA` som ansvarlig, `vanligA` og `dobbeltAB` som
 * medlemmer og en ubesvart invitasjon til `redaktorRessursA`. Systemarkitekten
 * er ikke med i gruppen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { lesGruppesamtaler } from '../gruppechat/samtaler'
import { lesVarselliste } from '../varsler/modell'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { kjorMigrasjoner, nyDatabase, som } from './hjelp/testdatabase'

/** Migrasjonen som tok chatten ut av bjella (D4b). */
const UT_AV_BJELLA = '20261118224500_chatvarsler_ut_av_bjella.sql'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string

const id = (p: Person) => galleri.id[p]
const SLA_PA = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`
const SLA_AV = SLA_PA.replace("'select true'", "'select false'")

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await som(i, id(person), async (tx) => (await tx.query<Record<string, T>>(sql, parametre)).rows))[0]!)[0] as T

let teller = 0
const nyKlientId = () => `00000000-0000-4000-9100-${String(++teller).padStart(12, '0')}`
const send = async (person: Person, tekst = 'Syntetisk melding') =>
  verdi<{ id: string; nr: number }>(person, 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), tekst])
const merkLest = (person: Person, tilNr: number) => verdi(person, 'select public.merk_gruppechat_lest($1, $2)', [agruppe, tilNr])
const uleste = async (person: Person) =>
  lesGruppesamtaler(await verdi(person, 'select public.mine_gruppesamtaler()')).find((s) => s.gruppe.id === agruppe)?.uleste ?? null

/** Varslene om chatten slik appen leser dem. */
const chatvarsler = async (person: Person) =>
  lesVarselliste(await verdi(person, 'select public.mine_varsler()')).varsler.filter((v) => v.kategori === 'gruppechat')
/** Radene direkte, forbi radsikkerheten. */
const rader = async (person: Person) =>
  (
    await db.query<{ lest_kl: string | null; gruppe_id: string; hendelser: Record<string, unknown>[] }>(
      `select lest_kl, gruppe_id, hendelser from public.varsler where mottaker_id = $1 and kategori = 'gruppechat' order by opprettet_kl`,
      [id(person)],
    )
  ).rows

/** Det varselet P7 lagde for meldingen: før D4b-migrasjonen står det ulest. */
let ulestFor: { lest_kl: string | null }[]

beforeAll(async () => {
  basis = await nyDatabase({ til: UT_AV_BJELLA })
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  for (const p of ['vanligA', 'dobbeltAB'] as const) {
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, `test.${p.toLowerCase()}`], basis)
    await verdi(p, 'select public.svar_paa_gruppeinvitasjon($1, true)', [agruppe], basis)
  }
  await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, 'test.redaktorressursa'], basis)
  // Som før D4b: meldingen gir adminA og dobbeltAB et ulest varsel i bjella.
  await verdi('vanligA', 'select public.send_gruppemelding($1, $2, $3)', [agruppe, nyKlientId(), 'Fra før D4b'], basis)
  ulestFor = (await basis.query<{ lest_kl: string | null }>(
    `select lest_kl from public.varsler where kategori = 'gruppechat' and mottaker_id = $1`, [galleri.id.adminA],
  )).rows
  await kjorMigrasjoner(basis, { fra: UT_AV_BJELLA })
  await basis.exec(SLA_PA)
}, 300_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

afterEach(async () => {
  await db.close()
})

describe('chatten er ute av bjella (D4b)', () => {
  it('varselet som sto ulest før D4b, er merket lest og står, men telles ikke', async () => {
    expect(ulestFor).toEqual([{ lest_kl: null }])
    for (const p of ['adminA', 'dobbeltAB'] as const) {
      const [rad, ...flere] = await rader(p)
      expect(flere, p).toEqual([])
      expect(rad?.lest_kl, p).not.toBeNull()
      expect(await verdi(p, 'select public.uleste_varsler()'), p).not.toHaveProperty('gruppechat')
    }
    // Meldingen og tallet på uleste i chatten er de samme som før.
    expect(await uleste('adminA')).toBe(1)
    expect(await uleste('dobbeltAB')).toBe(1)
    expect(await uleste('vanligA')).toBe(0)
  })

  it('en ny melding gir ingen varsler, bare tallet i chatten', async () => {
    await send('vanligA', 'Syntetisk tekst')
    await send('dobbeltAB')
    for (const p of ['adminA', 'dobbeltAB', 'vanligA', 'redaktorRessursA', 'systemarkitekt'] as const) {
      expect((await rader(p)).filter((r) => r.lest_kl === null), p).toEqual([])
      expect(await verdi(p, 'select public.uleste_varsler()'), p).not.toHaveProperty('gruppechat')
    }
    expect(await uleste('adminA')).toBe(3)
    expect(await uleste('dobbeltAB')).toBe(2)
    expect(await uleste('vanligA')).toBe(1)
    // Den inviterte og systemarkitekten som ikke er med, har ingen samtale og ingen uleste.
    expect(await uleste('redaktorRessursA')).toBeNull()
    expect(await uleste('systemarkitekt')).toBeNull()
  })

  it('lest i chatten er lest, uten noen kvittering i bjella', async () => {
    const m = await send('vanligA')
    await merkLest('adminA', m.nr)
    expect(await uleste('adminA')).toBe(0)
    expect((await rader('adminA')).every((r) => r.lest_kl !== null)).toBe(true)
  })

  it('den som fjernes, har verken uleste eller varsler fra chatten', async () => {
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('dobbeltAB')])
    await send('vanligA')
    expect(await uleste('dobbeltAB')).toBeNull()
    expect(await chatvarsler('dobbeltAB')).toEqual([])
    expect((await rader('dobbeltAB')).filter((r) => r.lest_kl === null)).toEqual([])
  })

  it('utløseren som lagde varslene, er borte', async () => {
    const utlosere = (await db.query<{ tgname: string }>(
      `select tgname from pg_trigger where tgrelid = 'public.gruppemeldinger'::regclass and not tgisinternal`,
    )).rows.map((r) => r.tgname)
    expect(utlosere).not.toContain('gruppemeldinger_varsle')
    expect((await db.query(`select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'intern' and p.proname = 'varsle_gruppechat'`)).rows).toEqual([])
  })

  it('mine_grupper sier fortsatt om chatten er slått på, til chatknappen', async () => {
    const chatAktivert = async () => (await verdi<{ chat_aktivert: boolean }>('vanligA', 'select public.mine_grupper()')).chat_aktivert
    expect(await chatAktivert()).toBe(true)
    await db.exec(SLA_AV)
    expect(await chatAktivert()).toBe(false)
  })
})

describe('dørklokken', () => {
  it('bare chatradene, uten tekst og avsender, er i publikasjonen sanntiden lytter på', async () => {
    // Direktesamtalenes dørklokke står der også (D5); kolonnene den viser, prøves i direktemeldinger.test.ts.
    const tabeller = (await db.query<{ tabell: string }>(
      `select schemaname || '.' || tablename as tabell from pg_publication_tables where pubname = 'supabase_realtime' order by 1`,
    )).rows
    expect(tabeller).toEqual([{ tabell: 'public.direktesamtaler' }, { tabell: 'public.gruppechatter' }])
    const kolonner = (await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'gruppechatter' order by ordinal_position`,
    )).rows.map((r) => r.column_name)
    expect(kolonner).toEqual(['gruppe_id', 'siste_nr', 'siste_endring', 'endret_kl'])
  })
})
