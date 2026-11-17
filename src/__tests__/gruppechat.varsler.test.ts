/**
 * P7 tråd C: varslene om gruppechatten og dørklokken i publikasjonen
 * (docs/gruppechat.md, «Varslene» og «Sanntiden»; docs/varsler.md).
 *
 * Persongalleriet (syntetiske kontoer), med chatten slått på i testdatabasen.
 * «A-gruppen» i A har `adminA` som ansvarlig, `vanligA` og `dobbeltAB` som
 * medlemmer og en ubesvart invitasjon til `redaktorRessursA`. Systemarkitekten
 * er ikke med i gruppen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { lesVarselliste, varselgruppechat, chatantall } from '../varsler/modell'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { nyDatabase, som } from './hjelp/testdatabase'

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

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  for (const p of ['vanligA', 'dobbeltAB'] as const) {
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, `test.${p.toLowerCase()}`], basis)
    await verdi(p, 'select public.svar_paa_gruppeinvitasjon($1, true)', [agruppe], basis)
  }
  await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [agruppe, 'test.redaktorressursa'], basis)
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

describe('varslene om nye meldinger', () => {
  it('gir de andre aktive medlemmene ett varsel, uten tekst og avsender', async () => {
    await send('vanligA', 'Syntetisk tekst som ikke skal i varselet')
    for (const p of ['adminA', 'dobbeltAB'] as const) {
      const [rad, ...flere] = await rader(p)
      expect(flere, p).toEqual([])
      expect(rad, p).toMatchObject({ lest_kl: null, gruppe_id: agruppe })
      expect(Object.keys(rad!.hendelser[0]!).sort(), p).toEqual(['antall', 'gruppechat', 'kl', 'til_nr'])
      expect(JSON.stringify(rad), p).not.toContain('Syntetisk tekst')
      expect(JSON.stringify(rad), p).not.toContain(id('vanligA'))
    }
    // Ikke den som skrev, ikke den inviterte, og ikke systemarkitekten som ikke er med.
    for (const p of ['vanligA', 'redaktorRessursA', 'systemarkitekt'] as const) expect(await rader(p), p).toEqual([])
  })

  it('samler de uleste i ett varsel med antallet, og viser gruppen ved navn', async () => {
    for (let i = 0; i < 3; i++) await send('vanligA')
    const siste = await send('dobbeltAB')
    const [varsel, ...flere] = await chatvarsler('adminA')
    expect(flere).toEqual([])
    expect(varselgruppechat(varsel!)).toEqual({ id: agruppe, navn: 'A-gruppen' })
    expect(chatantall(varsel!)).toBe(4)
    expect((await rader('adminA'))[0]!.hendelser[0]!.til_nr).toBe(siste.nr)
    expect(await verdi('adminA', 'select public.uleste_varsler()')).toMatchObject({ gruppechat: 1 })
    // Den som skrev de tre første, har bare den fra dobbeltAB.
    expect(chatantall((await chatvarsler('vanligA'))[0]!)).toBe(1)
  })

  it('merkes lest av chatten bare når meldingen det gjelder er lest, og neste melding gir et nytt', async () => {
    await send('vanligA')
    const andre = await send('vanligA')
    await merkLest('adminA', andre.nr - 1)
    expect((await rader('adminA'))[0]!.lest_kl).toBeNull()
    await merkLest('adminA', andre.nr)
    expect((await rader('adminA'))[0]!.lest_kl).not.toBeNull()
    expect((await chatvarsler('adminA')).every((v) => v.lest)).toBe(true)

    await send('vanligA')
    const alle = await rader('adminA')
    expect(alle).toHaveLength(2)
    expect(alle[1]).toMatchObject({ lest_kl: null })
    expect(alle[1]!.hendelser[0]!.antall).toBe(1)
    // De andres varsler røres ikke.
    expect((await rader('dobbeltAB')).map((r) => r.lest_kl)).toEqual([null])
  })

  it('endringer og slettinger varsler ingen', async () => {
    const m = await send('vanligA')
    await merkLest('adminA', m.nr)
    await verdi('vanligA', 'select public.endre_gruppemelding($1, $2)', [m.id, 'Endret'])
    await verdi('vanligA', 'select public.slett_gruppemelding($1)', [m.id])
    expect((await rader('adminA')).map((r) => r.lest_kl === null)).toEqual([false])
  })

  it('den som fjernes, ser ikke varslene og får ingen nye', async () => {
    await send('vanligA')
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('dobbeltAB')])
    expect(await chatvarsler('dobbeltAB')).toEqual([])
    await send('vanligA')
    const [rad, ...flere] = await rader('dobbeltAB')
    expect(flere).toEqual([])
    expect(rad!.hendelser[0]!.antall).toBe(1)
  })

  it('vises ikke mens chatten er avslått', async () => {
    await send('vanligA')
    await db.exec(SLA_AV)
    expect(await chatvarsler('adminA')).toEqual([])
    expect(await verdi('adminA', 'select public.uleste_varsler()')).not.toHaveProperty('gruppechat')
  })

  it('mine_grupper sier om chatten er slått på, så innstillingen kan skjules til da', async () => {
    const chatAktivert = async () => (await verdi<{ chat_aktivert: boolean }>('vanligA', 'select public.mine_grupper()')).chat_aktivert
    expect(await chatAktivert()).toBe(true)
    await db.exec(SLA_AV)
    expect(await chatAktivert()).toBe(false)
  })
})

describe('dørklokken', () => {
  it('bare chatradene, uten tekst og avsender, er i publikasjonen sanntiden lytter på', async () => {
    const tabeller = (await db.query<{ tabell: string }>(
      `select schemaname || '.' || tablename as tabell from pg_publication_tables where pubname = 'supabase_realtime'`,
    )).rows
    expect(tabeller).toEqual([{ tabell: 'public.gruppechatter' }])
    const kolonner = (await db.query<{ column_name: string }>(
      `select column_name from information_schema.columns where table_schema = 'public' and table_name = 'gruppechatter' order by ordinal_position`,
    )).rows.map((r) => r.column_name)
    expect(kolonner).toEqual(['gruppe_id', 'siste_nr', 'siste_endring', 'endret_kl'])
  })
})
