/**
 * D4a: samtalelista i chatmenyen i databasen, `mine_gruppesamtaler()`
 * (docs/gruppechat.md, «Chatmenyen»): bare grupper den innloggede selv er
 * aktivt medlem av, nyeste aktivitet først, med det samme tallet på uleste som
 * gruppesiden, og ingen meldingstekst. Negative tilfeller: ikke-medlem,
 * systemarkitekt som ikke er med, fjernet medlem, tapt fagmiljø, arkivert
 * gruppe og avslått chat.
 *
 * Oppsettet er det samme som i `gruppechat.test.ts`: «A-gruppen» i A med
 * `adminA` (ansvarlig), `vanligA` og `dobbeltAB`; «Tverrgruppen» på tvers med
 * systemarkitekten (ansvarlig), `vanligA` og `vanligB`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { lesGruppesamtaler, type Gruppesamtale } from '../gruppechat/samtaler'
import { byggPersongalleri, fjernAlleMedlemskap, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string
let tverrgruppe: string

const id = (p: Person) => galleri.id[p]
const SLA_PA = `create or replace function intern.gruppechat_aktivert() returns boolean language sql stable set search_path = '' as 'select true'`
const SLA_AV = SLA_PA.replace("'select true'", "'select false'")

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await som(i, id(person), async (tx) => (await tx.query<Record<string, T>>(sql, parametre)).rows))[0]!)[0] as T

async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe], i)
}

let teller = 0
const send = (person: Person, gruppe: string, tekst = 'Hei') =>
  verdi<{ nr: number; id: string }>(person, 'select public.send_gruppemelding($1, $2, $3)', [
    gruppe,
    `00000000-0000-4000-9000-${String(++teller).padStart(12, '0')}`,
    tekst,
  ])

const samtaler = async (person: Person): Promise<Gruppesamtale[]> => lesGruppesamtaler(await verdi(person, 'select public.mine_gruppesamtaler()'))
const ider = async (person: Person) => (await samtaler(person)).map((s) => s.gruppe.id)
const chatUleste = async (person: Person, gruppe: string) =>
  (await verdi<{ samhandling: { chat_uleste: number | null } }>(person, 'select public.gruppeoversikt($1)', [gruppe])).samhandling.chat_uleste

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  await basis.exec(SLA_PA)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  await medlem('adminA', agruppe, 'vanligA', basis)
  await medlem('adminA', agruppe, 'dobbeltAB', basis)
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

describe('mine_gruppesamtaler', () => {
  it('gir gruppene den innloggede er med i, nyeste aktivitet først, uten meldingstekst', async () => {
    // Uten meldinger: etter navnet, uten tidspunkt.
    expect(await samtaler('vanligA')).toEqual([
      expect.objectContaining({ gruppe: expect.objectContaining({ id: agruppe, navn: 'A-gruppen' }), siste_kl: null, uleste: 0 }),
      expect.objectContaining({ gruppe: expect.objectContaining({ id: tverrgruppe, navn: 'Tverrgruppen' }), siste_kl: null, uleste: 0 }),
    ])
    await send('vanligB', tverrgruppe, 'Hemmelig innhold')
    const lista = await samtaler('vanligA')
    expect(lista.map((s) => s.gruppe.id)).toEqual([tverrgruppe, agruppe])
    expect(lista[0]).toMatchObject({ uleste: 1 })
    expect(lista[0]!.siste_kl).not.toBeNull()
    const ra = await verdi<unknown>('vanligA', 'select public.mine_gruppesamtaler()')
    expect(JSON.stringify(ra)).not.toContain('Hemmelig innhold')
    expect(JSON.stringify(ra)).not.toContain(id('vanligB'))
  })

  it('teller uleste som gruppesiden: andres meldinger etter det som er lest, uten egne og slettede', async () => {
    await send('vanligA', agruppe)
    await send('adminA', agruppe)
    const andre = await send('dobbeltAB', agruppe)
    const slettes = await send('dobbeltAB', agruppe)
    await verdi('dobbeltAB', 'select public.slett_gruppemelding($1)', [slettes.id])
    const forA = (await samtaler('vanligA')).find((s) => s.gruppe.id === agruppe)!
    expect(forA.uleste).toBe(2)
    expect(forA.uleste).toBe(await chatUleste('vanligA', agruppe))
    await verdi('vanligA', 'select public.merk_gruppechat_lest($1, $2)', [agruppe, andre.nr])
    expect((await samtaler('vanligA')).find((s) => s.gruppe.id === agruppe)!.uleste).toBe(0)
    expect(await chatUleste('vanligA', agruppe)).toBe(0)
  })

  it('gir ikke grupper den innloggede ikke er med i, heller ikke til en systemarkitekt utenfor gruppen', async () => {
    await send('adminA', agruppe)
    expect(await ider('vanligB')).toEqual([tverrgruppe])
    expect(await ider('redaktorRessursA')).toEqual([])
    // Systemarkitekten leser A-gruppen, men er ikke med: bare Tverrgruppen, der hen er ansvarlig.
    expect(await ider('systemarkitekt')).toEqual([tverrgruppe])
    expect(await ider('arkitektB')).toEqual([])
  })

  it('tar bort gruppen med en gang for den som fjernes fra den eller fra fagmiljøet', async () => {
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('vanligA')])
    expect(await ider('vanligA')).toEqual([tverrgruppe])
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
    expect(await ider('dobbeltAB')).toEqual([])
  })

  it('avviser den som ikke har noe aktivt medlemskap i OUSFAR', async () => {
    await fjernAlleMedlemskap(db, id('vanligA'))
    const f = await feilFra(() => samtaler('vanligA'))
    expect(f?.code).toBe('42501')
  })

  it('gir ikke en arkivert gruppe, heller ikke til medlemmene', async () => {
    await send('vanligA', agruppe)
    await verdi('adminA', 'select public.arkiver_gruppe($1, true)', [agruppe])
    expect(await ider('vanligA')).toEqual([tverrgruppe])
    expect(await ider('adminA')).toEqual([])
    await verdi('systemarkitekt', 'select public.arkiver_gruppe($1, false)', [agruppe])
    expect(await ider('adminA')).toEqual([agruppe])
  })

  it('er tom mens chatten er slått av', async () => {
    await send('vanligA', agruppe)
    await db.exec(SLA_AV)
    expect(await samtaler('vanligA')).toEqual([])
    expect(await samtaler('systemarkitekt')).toEqual([])
  })

  it('kan ikke kalles uten innlogging, og hjelpefunksjonen kan ikke kalles fra nettleseren', async () => {
    const tilganger = await db.query<{ anon: boolean; innlogget: boolean; hjelper: boolean }>(
      `select has_function_privilege('anon', 'public.mine_gruppesamtaler()', 'execute') as anon,
              has_function_privilege('authenticated', 'public.mine_gruppesamtaler()', 'execute') as innlogget,
              has_function_privilege('authenticated', 'intern.gruppechat_uleste(uuid, uuid)', 'execute') as hjelper`,
    )
    expect(tilganger.rows[0]).toEqual({ anon: false, innlogget: true, hjelper: false })
  })
})
