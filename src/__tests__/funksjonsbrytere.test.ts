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
 * fagmiljø som ikke er testmiljø, før eierprosjektet har godkjent den for
 * akkurat det fagmiljøet (K-SKJ-10).
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  aktiveI,
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

describe('vernet for fagmiljøene funksjonen ikke er godkjent for', () => {
  it('lar ingen funksjon prøves ut eller slås på i et fagmiljø som ikke er testmiljø eller godkjent', async () => {
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
      expect(await feilkode(p, 'select * from public.funksjonsgodkjenninger'), p).toBe('42501')
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
    const oversikt = await kall<{ funksjoner: { nokkel: string; godkjente_fagmiljoer: string[]; brytere: unknown[] }[]; fagmiljoer: { id: string; testmiljo: boolean }[] }>(
      'arkitektB',
      'select public.funksjonsoversikt()',
    )
    // Katalogen har også personalkalenderen (#616), uten godkjenning og uten bryter i en ny database.
    expect(oversikt.funksjoner).toEqual([
      expect.objectContaining({ nokkel: 'personal', godkjente_fagmiljoer: [], brytere: [] }),
      expect.objectContaining({ nokkel: FUNKSJON, navn: 'Testfunksjon', godkjente_fagmiljoer: [], brytere: [] }),
    ])
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

  it('oppretter og logger ingenting når en funksjon uten bryter slås av', async () => {
    const A = galleri.fagmiljo.A
    const logg = async () =>
      (await db.query(`select 1 from public.tilgangslogg where handling like 'funksjonsbrytere.%' and fagmiljo_id = $1`, [A])).rows.length
    const forut = await logg()
    expect(await settBryter('systemarkitekt', A, 'av')).toEqual({ funksjon: FUNKSJON, fagmiljo: A, tilstand: 'av' })
    expect(await logg()).toBe(forut)
    expect((await db.query('select 1 from public.funksjonsbrytere where fagmiljo_id = $1', [A])).rows).toEqual([])
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

describe('når eierprosjektet har godkjent funksjonen for ett fagmiljø', () => {
  const A = () => galleri.fagmiljo.A
  const B = () => galleri.fagmiljo.B
  const MIGRASJONSGRUNNLAG = 'Syntetisk godkjenning i testen'
  const godkjenn = (fagmiljo: string) =>
    somServer((tx) => tx.query('insert into public.funksjonsgodkjenninger (funksjon, fagmiljo_id, grunnlag) values ($1, $2, $3)', [FUNKSJON, fagmiljo, MIGRASJONSGRUNNLAG]))
  const trekk = (fagmiljo: string) =>
    somServer((tx) => tx.query('delete from public.funksjonsgodkjenninger where funksjon = $1 and fagmiljo_id = $2', [FUNKSJON, fagmiljo]))
  const egneMedlemmerI = (f: 'A' | 'B') => PERSONLISTE.filter((p) => aktiveI(p).includes(f)).sort()

  it('kan ingen gi eller lese godkjenningen fra nettleseren, heller ikke en systemarkitekt', async () => {
    for (const p of ['systemarkitekt', 'arkitektB', 'adminA', 'vanligA'] as const) {
      expect(await feilkode(p, 'select * from public.funksjonsgodkjenninger'), p).toBe('42501')
      expect(await feilkode(p, `insert into public.funksjonsgodkjenninger (funksjon, fagmiljo_id, grunnlag) values ($1, $2, 'Prøver uten myndighet')`, [FUNKSJON, A()]), p).toBe('42501')
    }
  })

  it('kan den prøves ut og slås på i det godkjente fagmiljøet, og bare der', async () => {
    await godkjenn(A())
    await settBryter('systemarkitekt', A(), 'utprøving')
    expect(await hvemHar(A())).toEqual(egneMedlemmerI('A').filter((p) => ['systemarkitekt', 'arkitektB'].includes(p)))
    await settBryter('systemarkitekt', A(), 'på')
    expect(await hvemHar(A())).toEqual(egneMedlemmerI('A'))

    // B er ikke godkjent: verken utprøving eller på, gjennom funksjonen eller direkte.
    for (const t of ['utprøving', 'på']) {
      expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, B(), t, GRUNN]), t).toBe('23514')
      expect((await feilFra(() => somServer((tx) => tx.query('insert into public.funksjonsbrytere (funksjon, fagmiljo_id, tilstand) values ($1, $2, $3)', [FUNKSJON, B(), t]))))?.code, t).toBe('23514')
    }
    expect(await tilstand(B())).toBe('av')
    expect(await hvemHar(B())).toEqual([])
    for (const p of egneMedlemmerI('B')) {
      expect(await mineFunksjoner(p), p).not.toContainEqual(expect.objectContaining({ fagmiljo: B() }))
      expect(await medFunksjon(p), p).not.toContain(B())
    }
    expect(await mineFunksjoner('vanligB')).toEqual([])

    // Oversikten viser godkjenningen, og panelet tilbyr bare det databasen tillater.
    const oversikt = await kall<{ funksjoner: { nokkel: string; godkjente_fagmiljoer: string[] }[] }>('systemarkitekt', 'select public.funksjonsoversikt()')
    expect(oversikt.funksjoner.find((f) => f.nokkel === FUNKSJON)!.godkjente_fagmiljoer).toEqual([A()])
  })

  it('kan godkjenningen ikke trekkes eller flyttes mens funksjonen prøves ut eller er på', async () => {
    expect((await feilFra(() => trekk(A())))?.code).toBe('23514')
    // Fagmiljøet en godkjenning gjelder, står fast.
    expect((await feilFra(() => somServer((tx) => tx.query('update public.funksjonsgodkjenninger set fagmiljo_id = $2 where funksjon = $1', [FUNKSJON, B()]))))?.code).toBe('42501')
    await settBryter('systemarkitekt', A(), 'utprøving')
    expect((await feilFra(() => trekk(A())))?.code).toBe('23514')
    expect(await tilstand(A())).toBe('utprøving')
  })

  it('kan godkjenningen trekkes når funksjonen er av, og da kan den ikke slås på igjen', async () => {
    await settBryter('systemarkitekt', A(), 'av')
    await trekk(A())
    expect(await feilkode('systemarkitekt', 'select public.sett_funksjonsbryter($1, $2, $3, $4)', [FUNKSJON, A(), 'på', GRUNN])).toBe('23514')
    expect(await hvemHar(A())).toEqual([])
    const { rows } = await db.query<{ handling: string }>(
      `select handling from public.tilgangslogg where handling like 'funksjonsgodkjenninger.%' and fagmiljo_id = $1 order by id`,
      [A()],
    )
    expect(rows.map((r) => r.handling)).toEqual(['funksjonsgodkjenninger.insert', 'funksjonsgodkjenninger.delete'])
  })
})
