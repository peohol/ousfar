/**
 * Funksjonsbryterne per fagmiljø og testmiljøene (#598,
 * `supabase/migrations/20261127193000_funksjonsbrytere.sql`,
 * docs/fagmiljoer.md «Funksjonsbrytere per fagmiljø»), prøvd med
 * persongalleriet, et syntetisk testmiljø T og en syntetisk funksjon.
 *
 * Kravene fra docs/personal.md §8.3 som mekanismen skal bære: av som
 * standard; utprøving bare for systemarkitekter med eget aktivt medlemskap;
 * på for alle egne medlemmer; aldri for systemarkitektrollen alene; håndhevet
 * på serveren; ingen spor for dem uten funksjonen; og ingen funksjon på i et
 * virkelig fagmiljø før eierprosjektet har godkjent det.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  avsluttMedlemskap,
  byggPersongalleri,
  opprettFagmiljo,
  opprettMedlem,
  PERSONER,
  type Person,
  type Persongalleri,
} from './hjelp/persongalleri'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

const FUNKSJON = 'testfunksjon'
const GRUNN = 'Syntetisk utprøving i testen'

let db: PGlite
let galleri: Persongalleri
/** Testmiljøet: arkitektB er medlem og lokal administrator, vanligB vanlig medlem. */
let T: string

const PERSONLISTE = Object.keys(PERSONER) as Person[]

/** Som superbruker, med begrunnelsen tilgangsloggen krever. */
const somServer = <R>(arbeid: (tx: Transaction) => Promise<R>) =>
  db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test: funksjonsbrytere (syntetisk)', true)`)
    return arbeid(tx)
  })

const kall = <R = unknown>(person: Person | string, sql: string, parametre: unknown[] = []) =>
  som(db, person in galleri.id ? galleri.id[person as Person] : person, async (tx) => {
    const rad = (await tx.query<Record<string, R>>(sql, parametre)).rows[0]
    return rad ? Object.values(rad)[0]! : (null as R)
  })

const feilkode = async (person: Person | string | null, sql: string, parametre: unknown[] = []) =>
  (await feilFra(() => (person === null ? som(db, null, (tx) => tx.query(sql, parametre)) : kall(person, sql, parametre))))?.code ?? null

const settBryter = (person: Person, fagmiljo: string, tilstand: string, funksjon = FUNKSJON, grunn = GRUNN) =>
  kall(person, 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [funksjon, fagmiljo, tilstand, grunn])

const settTestmiljo = (person: Person, fagmiljo: string, testmiljo: boolean, grunn = GRUNN) =>
  kall(person, 'select public.sett_testmiljo($1, $2, $3)', [fagmiljo, testmiljo, grunn])

const tilgjengelig = async (person: Person | string, fagmiljo: string, funksjon = FUNKSJON) =>
  (await db.query<{ t: boolean }>('select intern.funksjon_tilgjengelig($1, $2, $3) as t', [
    funksjon,
    fagmiljo,
    person in galleri.id ? galleri.id[person as Person] : person,
  ])).rows[0]!.t

const mineFunksjoner = (person: Person | string) => kall<{ funksjon: string; fagmiljo: string }[]>(person, 'select public.mine_funksjoner()')
const medFunksjon = (person: Person | string, funksjon = FUNKSJON) =>
  kall<string[]>(person, 'select public.mine_fagmiljoer_med_funksjon($1)', [funksjon])
const tilstand = async (fagmiljo: string, funksjon = FUNKSJON) =>
  (await db.query<{ t: string }>('select intern.funksjonstilstand($1, $2) as t', [funksjon, fagmiljo])).rows[0]!.t

/** Hvem i galleriet og blant de ekstra som har funksjonen i fagmiljøet. */
async function hvemHar(fagmiljo: string, ekstra: Record<string, string> = {}): Promise<string[]> {
  const alle = { ...galleri.id, ...ekstra }
  const har: string[] = []
  for (const [navn, id] of Object.entries(alle)) if (await tilgjengelig(id, fagmiljo)) har.push(navn)
  return har.sort()
}

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  T = await opprettFagmiljo(db, { nokkel: 'test-funksjoner-t', navn: 'Testmiljø T', administrator: galleri.id.arkitektB })
  await opprettMedlem(db, galleri.id.vanligB, T)
  await somServer((tx) =>
    tx.query(`insert into public.funksjoner (nokkel, navn, beskrivelse) values ($1, 'Testfunksjon', 'Syntetisk funksjon for testene.')`, [FUNKSJON]),
  )
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('uten bryter', () => {
  it('er funksjonen av overalt og for alle, også for en ukjent funksjon', async () => {
    for (const f of [galleri.fagmiljo.A, galleri.fagmiljo.B, T]) {
      expect(await tilstand(f)).toBe('av')
      expect(await tilstand(f, 'finnes-ikke')).toBe('av')
      expect(await hvemHar(f)).toEqual([])
    }
    for (const p of PERSONLISTE) {
      if (!['utenMedlemskap', 'tidligereAdmin'].includes(p)) {
        expect(await mineFunksjoner(p), p).toEqual([])
        expect(await medFunksjon(p), p).toEqual([])
      }
    }
  })

  it('svarer med det samme «finnes ikke» for en funksjon som er av og for en som ikke finnes', async () => {
    // Porten i `intern` kan ikke kalles fra nettleseren.
    expect(await feilkode('arkitektB', 'select intern.krev_funksjon($1, $2)', [FUNKSJON, T])).toBe('42501')
    for (const funksjon of [FUNKSJON, 'finnes-ikke']) {
      const somServerfeil = await feilFra(() =>
        db.transaction(async (tx) => {
          await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: galleri.id.arkitektB, role: 'authenticated' })])
          await tx.query('select intern.krev_funksjon($1, $2)', [funksjon, T])
        }),
      )
      expect(somServerfeil, funksjon).toMatchObject({ code: 'P0002', message: 'Finnes ikke.' })
    }
  })
})

describe('vernet for virkelige fagmiljøer', () => {
  it('lar ingen funksjon prøves ut eller slås på i et fagmiljø som ikke er testmiljø', async () => {
    for (const f of [galleri.fagmiljo.A, galleri.fagmiljo.B]) {
      for (const t of ['utprøving', 'på']) {
        expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, f, t, GRUNN])).toBe('23514')
        // Også direkte i tabellen, forbi funksjonen.
        expect((await feilFra(() => somServer((tx) => tx.query('insert into public.funksjonsbrytere (funksjon, fagmiljo_id, tilstand) values ($1, $2, $3)', [FUNKSJON, f, t]))))?.code).toBe('23514')
      }
      // Av er alltid lov.
      expect(await settBryter('systemarkitekt', f, 'av')).toMatchObject({ tilstand: 'av' })
      expect(await tilstand(f)).toBe('av')
    }
  })

  it('lar ikke standardfagmiljøet bli testmiljø', async () => {
    expect(await feilkode('systemarkitekt', 'select public.sett_testmiljo($1, true, $2)', [galleri.fagmiljo.A, GRUNN])).toBe('22023')
    expect((await feilFra(() => somServer((tx) => tx.query('update public.fagmiljoer set testmiljo = true where id = $1', [galleri.fagmiljo.A]))))?.code).toBe('23514')
  })
})

describe('administrasjonen', () => {
  it('er bare for systemarkitektene, også oversikten, og tabellene kan ikke leses direkte', async () => {
    for (const p of ['vanligA', 'vanligB', 'adminA', 'adminB', 'dobbeltAB', 'avsluttetA', 'utenMedlemskap', 'tidligereAdmin'] as const) {
      expect(await feilkode(p, 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'utprøving', GRUNN]), p).toBe('42501')
      expect(await feilkode(p, 'select public.sett_testmiljo($1, true, $2)', [T, GRUNN]), p).toBe('42501')
      expect(await feilkode(p, 'select public.funksjonsoversikt()'), p).toBe('42501')
      expect(await feilkode(p, 'select * from public.funksjonsbrytere'), p).toBe('42501')
      expect(await feilkode(p, 'select * from public.funksjoner'), p).toBe('42501')
    }
    expect(await feilkode(null, 'select public.mine_funksjoner()')).toBe('42501')
    expect(await feilkode(null, 'select public.funksjonsoversikt()')).toBe('42501')
    expect(await feilkode('arkitektB', 'select * from public.funksjonsbrytere')).toBe('42501')
  })

  it('krever en begrunnelse, en kjent tilstand, funksjon og fagmiljø', async () => {
    expect(await feilkode('systemarkitekt', 'select public.sett_testmiljo($1, true, $2)', [T, '  ok '])).toBe('22023')
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'utprøving', null])).toBe('22023')
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'halvveis', GRUNN])).toBe('22023')
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', ['finnes-ikke', T, 'av', GRUNN])).toBe('P0002')
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, gen_random_uuid(), $2, $3)', [FUNKSJON, 'av', GRUNN])).toBe('P0002')
  })

  it('merker et testmiljø og fører det i tilgangsloggen med aktøren og begrunnelsen, én gang ved gjentakelse', async () => {
    expect(await settTestmiljo('systemarkitekt', T, true, 'Testmiljø for   syntetisk utprøving')).toEqual({ fagmiljo: T, testmiljo: true })
    expect(await settTestmiljo('systemarkitekt', T, true)).toEqual({ fagmiljo: T, testmiljo: true })
    const { rows } = await db.query<{ aktor: string; grunn: string; foer: boolean; etter: boolean }>(
      `select aktor, grunn, (foer ->> 'testmiljo')::boolean as foer, (etter ->> 'testmiljo')::boolean as etter
       from public.tilgangslogg where handling = 'fagmiljoer.update' and fagmiljo_id = $1 and foer ->> 'testmiljo' <> etter ->> 'testmiljo'`,
      [T],
    )
    expect(rows).toEqual([{ aktor: galleri.id.systemarkitekt, grunn: 'Testmiljø for syntetisk utprøving', foer: false, etter: true }])
  })

  it('viser systemarkitekten katalogen, bryterne og testmerkingen', async () => {
    const oversikt = await kall<{ funksjoner: { nokkel: string; virkelige_fagmiljoer: boolean; brytere: unknown[] }[]; fagmiljoer: { id: string; testmiljo: boolean }[] }>(
      'arkitektB',
      'select public.funksjonsoversikt()',
    )
    expect(oversikt.funksjoner).toEqual([expect.objectContaining({ nokkel: FUNKSJON, navn: 'Testfunksjon', virkelige_fagmiljoer: false, brytere: [] })])
    expect(oversikt.fagmiljoer.find((f) => f.id === T)).toMatchObject({ testmiljo: true, navn: 'Testmiljø T' })
    expect(oversikt.fagmiljoer.find((f) => f.id === galleri.fagmiljo.A)).toMatchObject({ testmiljo: false })
  })
})

describe('i testmiljøet', () => {
  it('gir utprøving bare systemarkitekter som selv er aktive medlemmer', async () => {
    expect(await settBryter('systemarkitekt', T, 'utprøving')).toEqual({ funksjon: FUNKSJON, fagmiljo: T, tilstand: 'utprøving' })
    expect(await tilstand(T)).toBe('utprøving')
    // systemarkitekt er ikke medlem av T; vanligB er medlem, men ikke systemarkitekt.
    expect(await hvemHar(T)).toEqual(['arkitektB'])
    expect(await mineFunksjoner('arkitektB')).toEqual([{ funksjon: FUNKSJON, fagmiljo: T }])
    expect(await medFunksjon('arkitektB')).toEqual([T])
    for (const p of ['systemarkitekt', 'vanligB', 'adminB', 'vanligA'] as const) {
      expect(await mineFunksjoner(p), p).toEqual([])
      expect(await medFunksjon(p), p).toEqual([])
    }
    // Ingenting ellers: de andre fagmiljøene og en ukjent funksjon.
    expect(await hvemHar(galleri.fagmiljo.B)).toEqual([])
    expect(await medFunksjon('arkitektB', 'finnes-ikke')).toEqual([])
  })

  it('gir appen funksjonene gjennom rettighetene, og ingenting til de andre', async () => {
    expect(await kall('arkitektB', `select public.mine_rettigheter() -> 'funksjoner'`)).toEqual([{ funksjon: FUNKSJON, fagmiljo: T }])
    for (const p of ['systemarkitekt', 'vanligB'] as const) {
      const rettigheter = await kall<Record<string, unknown>>(p, 'select public.mine_rettigheter()')
      expect(rettigheter.funksjoner, p).toEqual([])
      expect(JSON.stringify(rettigheter), p).not.toContain(FUNKSJON)
    }
  })

  it('slipper inn i en funksjon som bygger på porten bare den som har den', async () => {
    const port = (person: Person) =>
      feilFra(() =>
        db.transaction(async (tx) => {
          await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: galleri.id[person], role: 'authenticated' })])
          await tx.query('select intern.krev_funksjon($1, $2)', [FUNKSJON, T])
        }),
      )
    expect(await port('arkitektB')).toBeNull()
    for (const p of ['systemarkitekt', 'vanligB', 'vanligA'] as const) expect(await port(p), p).toMatchObject({ code: 'P0002', message: 'Finnes ikke.' })
    expect(await port('utenMedlemskap')).toMatchObject({ code: '42501' })
  })

  it('gir på alle egne aktive medlemmer, og aldri systemarkitektrollen alene', async () => {
    const invitert = await opprettBruker(db, { brukernavn: 'test.invitert598', fornavn: 'Ivar', etternavn: 'Invitert', rolle: 'user' })
    await somServer((tx) => tx.query(`insert into public.medlemskap (bruker_id, fagmiljo_id, status) values ($1, $2, 'invitert')`, [invitert, T]))
    await settBryter('arkitektB', T, 'på')
    expect(await hvemHar(T, { invitert })).toEqual(['arkitektB', 'vanligB'])
    expect(await mineFunksjoner('vanligB')).toEqual([{ funksjon: FUNKSJON, fagmiljo: T }])
    expect(await mineFunksjoner('systemarkitekt')).toEqual([])

    // Et avsluttet medlemskap gir ingenting lenger.
    await avsluttMedlemskap(db, galleri.id.vanligB, T)
    expect(await hvemHar(T, { invitert })).toEqual(['arkitektB'])
    expect(await mineFunksjoner('vanligB')).toEqual([])
  })

  it('lar ikke testmerkingen fjernes mens en funksjon prøves ut eller er på', async () => {
    expect(await feilkode('systemarkitekt', 'select public.sett_testmiljo($1, false, $2)', [T, GRUNN])).toBe('23514')
    expect((await feilFra(() => somServer((tx) => tx.query('update public.fagmiljoer set testmiljo = false where id = $1', [T]))))?.code).toBe('23514')
    expect(await tilstand(T)).toBe('på')
  })

  it('fører hver endring av en bryter i tilgangsloggen, én gang ved gjentakelse', async () => {
    await settBryter('arkitektB', T, 'på')
    const { rows } = await db.query<{ handling: string; aktor: string; grunn: string; tilstand: string }>(
      `select handling, aktor, grunn, etter ->> 'tilstand' as tilstand from public.tilgangslogg
       where handling like 'funksjonsbrytere.%' and fagmiljo_id = $1 order by id`,
      [T],
    )
    expect(rows).toEqual([
      { handling: 'funksjonsbrytere.insert', aktor: galleri.id.systemarkitekt, grunn: GRUNN, tilstand: 'utprøving' },
      { handling: 'funksjonsbrytere.update', aktor: galleri.id.arkitektB, grunn: GRUNN, tilstand: 'på' },
    ])
  })

  it('slår av igjen, og da kan testmerkingen fjernes', async () => {
    await settBryter('systemarkitekt', T, 'av')
    expect(await hvemHar(T)).toEqual([])
    expect(await mineFunksjoner('arkitektB')).toEqual([])
    expect(await settTestmiljo('systemarkitekt', T, false)).toEqual({ fagmiljo: T, testmiljo: false })
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, T, 'utprøving', GRUNN])).toBe('23514')
    expect(await settTestmiljo('systemarkitekt', T, true)).toEqual({ fagmiljo: T, testmiljo: true })
  })

  it('gjelder ikke i et arkivert fagmiljø, som kan arkiveres som før', async () => {
    const U = await opprettFagmiljo(db, { nokkel: 'test-funksjoner-u', navn: 'Testmiljø U', administrator: galleri.id.arkitektB })
    await settTestmiljo('systemarkitekt', U, true)
    await settBryter('systemarkitekt', U, 'utprøving')
    expect(await hvemHar(U)).toEqual(['arkitektB'])
    await somServer((tx) => tx.query(`update public.fagmiljoer set status = 'arkivert' where id = $1`, [U]))
    expect(await tilstand(U)).toBe('av')
    expect(await hvemHar(U)).toEqual([])
    expect(await mineFunksjoner('arkitektB')).toEqual([])
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, U, 'på', GRUNN])).toBe('23514')
  })
})

describe('når eierprosjektet har godkjent funksjonen for virkelige fagmiljøer', () => {
  it('kan den slås på der, og godkjenningen kan ikke trekkes mens den er på', async () => {
    await somServer((tx) => tx.query('update public.funksjoner set virkelige_fagmiljoer = true where nokkel = $1', [FUNKSJON]))
    await settBryter('systemarkitekt', galleri.fagmiljo.B, 'på')
    expect(await hvemHar(galleri.fagmiljo.B)).toEqual(['adminB', 'arkitektB', 'avsluttetA', 'dobbeltAB', 'vanligB'].sort())
    expect(await hvemHar(galleri.fagmiljo.A)).toEqual([])
    expect((await feilFra(() => somServer((tx) => tx.query('update public.funksjoner set virkelige_fagmiljoer = false where nokkel = $1', [FUNKSJON]))))?.code).toBe('23514')

    await settBryter('systemarkitekt', galleri.fagmiljo.B, 'av')
    await somServer((tx) => tx.query('update public.funksjoner set virkelige_fagmiljoer = false where nokkel = $1', [FUNKSJON]))
    expect(await hvemHar(galleri.fagmiljo.B)).toEqual([])
  })
})
