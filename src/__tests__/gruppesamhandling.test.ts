/**
 * P6b (#430): idéene og oppgavene i gruppene (docs/fagmiljoer.md, «Idéer og
 * oppgaver i gruppene»).
 *
 * Testene bruker persongalleriet (syntetiske kontoer i A og B) og kaller
 * databasen slik nettleseren gjør det, som den innloggede. Hver test får sin
 * egen kopi av databasen, så rekkefølgen ikke betyr noe.
 *
 * Grunnoppsettet: «A-gruppen» i A har `adminA` som ansvarlig og `vanligA` og
 * `dobbeltAB` som medlemmer. «Tverrgruppen» på tvers har systemarkitekten som
 * ansvarlig, `vanligB` som moderator og `vanligA` og `dobbeltAB` som
 * medlemmer. Samtidige endringer står i `gruppesamhandling.samtidighet.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

const DOK = (tekst: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string
let tverrgruppe: string

const id = (p: Person) => galleri.id[p]

const somPerson = <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db) =>
  som(i, id(person), async (tx) => (await tx.query<T>(sql, parametre)).rows)

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  Object.values((await somPerson<Record<string, T>>(person, sql, parametre, i))[0]!)[0] as T

const kode = async (arbeid: () => Promise<unknown>) => (await feilFra(arbeid))?.code ?? null

async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe], i)
}

const nyGruppeide = (person: Person, gruppe: string, tittel = 'En gruppeidé', i: PGlite = db) =>
  verdi<string>(person, 'insert into public.ideer (gruppe_id, tittel, tekst) values ($1, $2, $3) returning id', [gruppe, tittel, DOK('Beskrivelse')], i)
const nyFellesIde = (person: Person, tittel = 'En felles idé') =>
  verdi<string>(person, `insert into public.ideer (kategori, tittel) values ('fag', $1) returning id`, [tittel])
const kommenter = (person: Person, ide: string, forelder: string | null = null) =>
  verdi<string>(person, 'insert into public.idekommentarer (ide_id, forelder_id, tekst) values ($1, $2, $3) returning id', [ide, forelder, DOK('Kommentar')])

interface Gruppeidesvar {
  kan_skrive: boolean
  kan_behandle: boolean
  ideer: { id: string; tittel: string; kategori: string | null; gruppe_id: string; sett: boolean; nye_kommentarer: number; gruppeoppgave: { id: string; status: string } | null; arkivert_kl: string | null }[]
}
const gruppeideer = (person: Person, gruppe: string) => verdi<Gruppeidesvar>(person, 'select public.gruppeideer($1)', [gruppe])
const ideoversikt = (person: Person) => verdi<{ id: string }[]>(person, 'select public.ideoversikt()')

interface Oppgave {
  id: string
  tittel: string
  beskrivelse: unknown
  ansvarlig_id: string | null
  ansvarlig_har_tilgang: boolean
  prioritet: string
  status: string
  foreslatt_av: string | null
  opprettet_av: string | null
  fullfort_kl: string | null
  ide: { id: string; tittel: string; kommentarer: number } | null
  kan_endre: boolean
  kan_sette_status: boolean
}
const oppgaveoversikt = (person: Person, gruppe: string) =>
  verdi<{ kan_opprette: boolean; oppgaver: Oppgave[] }>(person, 'select public.gruppeoppgaveoversikt($1)', [gruppe])
const oppgave = (person: Person, oppgave: string) => verdi<Oppgave | null>(person, 'select public.gruppeoppgave($1)', [oppgave])
const opprettOppgave = (person: Person, gruppe: string, tittel: string, ansvarlig: Person | null = null, prioritet = 'normal') =>
  verdi<string>(person, 'select public.opprett_gruppeoppgave($1, $2, null, $3, $4)', [gruppe, tittel, ansvarlig && id(ansvarlig), prioritet])
const gjorOm = (person: Person, ide: string) => verdi<string>(person, 'select public.gjor_om_til_gruppeoppgave($1)', [ide])
const settStatus = (person: Person, oppgave: string, status: string) =>
  verdi(person, 'select public.sett_gruppeoppgavestatus($1, $2)', [oppgave, status])
const tildel = (person: Person, oppgave: string, ansvarlig: Person | null) =>
  verdi(person, 'select public.tildel_gruppeoppgave($1, $2)', [oppgave, ansvarlig && id(ansvarlig)])

interface Varsel {
  kategori: string
  ide: { id: string; gruppe: { id: string; navn: string } | null } | null
  hendelser: { art?: string; gruppeoppgave?: { id: string; tittel: string; gruppe: { id: string } } | null }[]
}
const varsler = async (person: Person) => (await verdi<{ varsler: Varsel[] }>(person, 'select public.mine_varsler()')).varsler

/** Alt personen ser av en gruppeidé, gjennom hver inngang appen bruker. */
async function serIde(person: Person, ide: string, gruppe: string) {
  return som(db, id(person), async (tx) => {
    const n = async (sql: string, p: unknown[] = []) => Number(Object.values((await tx.query<Record<string, unknown>>(sql, p)).rows[0]!)[0])
    const v = async (sql: string, p: unknown[] = []) => Object.values((await tx.query<Record<string, unknown>>(sql, p)).rows[0]!)[0]
    const liste = await tx.query('savepoint s').then(async () => {
      try {
        return ((await v('select public.gruppeideer($1)', [gruppe])) as Gruppeidesvar).ideer.length
      } catch {
        await tx.query('rollback to savepoint s')
        return null
      }
    })
    return {
      tabell: await n('select count(*) from public.ideer where id = $1', [ide]),
      kommentarer: await n('select count(*) from public.idekommentarer where ide_id = $1', [ide]),
      hjerter: await n('select count(*) from public.idehjerter where ide_id = $1', [ide]),
      liste,
      traad: (await v('select public.idetraad($1)', [ide])) !== null,
      lenke: (await v(`select public.direktelenke('ide', $1)`, [ide])) !== null,
      apen: Boolean(await v('select public.ide_er_apen($1)', [ide])),
    }
  })
}

const SER_ALT = { tabell: 1, kommentarer: 1, hjerter: 1, liste: 1, traad: true, lenke: true, apen: true }
const SER_INGENTING = { tabell: 0, kommentarer: 0, hjerter: 0, liste: null, traad: false, lenke: false, apen: false }

async function fjern(aktor: Person, gruppe: string, mal: Person) {
  await verdi(aktor, 'select public.avslutt_gruppemedlemskap($1, $2)', [gruppe, id(mal)])
}

/** Avslutter medlemskapet til dobbeltAB i A, så B blir primært. */
async function avsluttDobbeltIA() {
  await db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Syntetisk test', true)`)
    await tx.query(
      `update public.medlemskap set primaer = false, status = 'deaktivert', til = now()
        where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`,
      [id('dobbeltAB'), galleri.fagmiljo.A],
    )
    await tx.query(`update public.medlemskap set primaer = true where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`, [
      id('dobbeltAB'),
      galleri.fagmiljo.B,
    ])
  })
}

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  await medlem('adminA', agruppe, 'vanligA', basis)
  await medlem('adminA', agruppe, 'dobbeltAB', basis)
  tverrgruppe = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, null)', ['Tverrgruppen', 'Syntetisk'], basis)
  for (const p of ['vanligA', 'vanligB', 'dobbeltAB'] as const) await medlem('systemarkitekt', tverrgruppe, p, basis)
  await verdi('systemarkitekt', `select public.sett_grupperolle($1, $2, 'moderator')`, [tverrgruppe, galleri.id.vanligB], basis)
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

describe('idéene i en gruppe', () => {
  it('skrives av medlemmene, uten kategori, og står bare i gruppens liste', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    const svar = await gruppeideer('dobbeltAB', agruppe)
    expect(svar).toMatchObject({ kan_skrive: true, kan_behandle: false })
    expect(svar.ideer).toEqual([expect.objectContaining({ id: ide, kategori: null, gruppe_id: agruppe, sett: false, gruppeoppgave: null })])
    expect((await gruppeideer('vanligA', agruppe)).ideer[0]!.sett).toBe(true)
    expect((await gruppeideer('adminA', agruppe)).kan_behandle).toBe(true)
    // Den felles idélista er uendret: gruppeidéene står aldri der.
    const felles = await nyFellesIde('vanligB')
    for (const p of ['vanligA', 'systemarkitekt', 'vanligB'] as const) {
      expect((await ideoversikt(p)).map((i) => i.id), p).toEqual([felles])
    }
  })

  it('kan ikke skrives av andre enn medlemmene, og har aldri kategori', async () => {
    for (const p of ['vanligB', 'adminB', 'avsluttetA'] as const) {
      expect(await kode(() => nyGruppeide(p, agruppe)), p).toBe('42501')
    }
    // En systemarkitekt leser og skriver i alle de aktive gruppene.
    expect(await nyGruppeide('arkitektB', agruppe)).toMatch(/^[0-9a-f-]{36}$/)
    expect(
      await kode(() => verdi('vanligA', `insert into public.ideer (gruppe_id, kategori, tittel) values ($1, 'fag', 'x') returning id`, [agruppe])),
    ).toBe('23514')
    // Gruppen kan ikke byttes etterpå.
    const ide = await nyGruppeide('vanligA', agruppe)
    expect(await kode(() => verdi('vanligA', 'update public.ideer set gruppe_id = $2 where id = $1 returning id', [ide, tverrgruppe]))).toBe('42501')
  })

  it('er usynlig for dem som ikke er med, gjennom hver inngang', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    await kommenter('dobbeltAB', ide)
    await somPerson('vanligA', 'insert into public.idehjerter (ide_id) values ($1)', [ide])
    expect(await serIde('dobbeltAB', ide, agruppe)).toEqual(SER_ALT)
    expect(await serIde('systemarkitekt', ide, agruppe)).toEqual(SER_ALT)
    for (const p of ['vanligB', 'adminB', 'arkitektB', 'avsluttetA'] as const) {
      // arkitektB er systemarkitekt og leser alle gruppene.
      expect(await serIde(p, ide, agruppe), p).toEqual(p === 'arkitektB' ? SER_ALT : SER_INGENTING)
    }
    expect(await kode(() => gruppeideer('vanligB', agruppe))).toBe('P0002')
    expect(await kode(() => kommenter('vanligB', ide))).toBe('42501')
    expect(await kode(() => somPerson('vanligB', 'insert into public.idehjerter (ide_id) values ($1)', [ide]))).toBe('42501')
    // Å merke en idé som sett er stille, men gjør ingenting.
    await somPerson('vanligB', 'select public.merk_ide_sett($1, now())', [ide])
    expect(await somPerson('vanligB', 'select * from public.idebesok where ide_id = $1', [ide])).toEqual([])
  })

  it('lar forfatteren endre sin egen idé, og moderatorene slette andres', async () => {
    const ide = await nyGruppeide('vanligA', tverrgruppe, 'Før')
    expect(await somPerson('dobbeltAB', `update public.ideer set tittel = 'Kapret' where id = $1 returning id`, [ide])).toEqual([])
    expect(await somPerson('vanligA', `update public.ideer set tittel = 'Etter' where id = $1 returning tittel`, [ide])).toEqual([{ tittel: 'Etter' }])
    const kommentar = await kommenter('dobbeltAB', ide)
    expect(await somPerson('vanligA', 'delete from public.idekommentarer where id = $1 returning id', [kommentar])).toEqual([])
    // vanligB er moderator i Tverrgruppen.
    expect(await somPerson('vanligB', 'delete from public.idekommentarer where id = $1 returning id', [kommentar])).toEqual([{ id: kommentar }])
    expect(await somPerson('dobbeltAB', 'delete from public.ideer where id = $1 returning id', [ide])).toEqual([])
    expect(await somPerson('vanligB', 'delete from public.ideer where id = $1 returning id', [ide])).toEqual([{ id: ide }])
    // En moderator i en gruppe modererer ikke de felles idéene.
    const felles = await nyFellesIde('vanligA')
    expect(await somPerson('vanligB', 'delete from public.ideer where id = $1 returning id', [felles])).toEqual([])
    expect(await verdi('vanligB', 'select public.kan_moderere_ide($1)', [felles])).toBe(false)
  })

  it('viser det nye: idéer som ikke er åpnet og nye kommentarer', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    const tall = async (p: Person) => (await verdi<{ samhandling: Record<string, number> }>(p, 'select public.gruppeoversikt($1)', [agruppe])).samhandling
    expect(await tall('dobbeltAB')).toEqual({ nye_ideer: 1, venter: 1, mine_oppgaver: 0 })
    expect(await tall('vanligA')).toEqual({ nye_ideer: 0, venter: 1, mine_oppgaver: 0 })
    const lest = await verdi<{ lest_kl: string }>('dobbeltAB', 'select public.idetraad($1)', [ide])
    await somPerson('dobbeltAB', 'select public.merk_ide_sett($1, $2)', [ide, lest.lest_kl])
    expect((await tall('dobbeltAB')).nye_ideer).toBe(0)
    await kommenter('vanligA', ide)
    expect((await tall('dobbeltAB')).nye_ideer).toBe(1)
    expect((await gruppeideer('dobbeltAB', agruppe)).ideer[0]!.nye_kommentarer).toBe(1)
  })
})

describe('varslene om gruppeidéene', () => {
  it('går til medlemmene som leser gruppen, i egne kategorier, og ikke til de felles', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    for (const p of ['adminA', 'dobbeltAB'] as const) {
      expect((await varsler(p)).filter((v) => v.ide?.id === ide), p).toEqual([
        expect.objectContaining({ kategori: 'gruppeideer', ide: expect.objectContaining({ gruppe: expect.objectContaining({ id: agruppe }) }) }),
      ])
    }
    // Ingen andre får noe om den, heller ikke systemarkitektene som ikke er med.
    for (const p of ['vanligA', 'vanligB', 'systemarkitekt', 'arkitektB'] as const) {
      expect((await varsler(p)).filter((v) => v.ide?.id === ide), p).toEqual([])
    }
    expect(await verdi<number>('vanligB', 'select count(*)::int from public.varsler where ide_id = $1', [ide])).toBe(0)
    // Kommentarene varsler som for de felles idéene.
    await kommenter('dobbeltAB', ide)
    expect((await varsler('vanligA')).filter((v) => v.ide?.id === ide).map((v) => v.kategori)).toEqual(['mine_ideer'])
  })

  it('forsvinner når medlemmet mister tilgangen til gruppen', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    await kommenter('vanligA', ide)
    expect((await varsler('dobbeltAB')).filter((v) => v.ide?.id === ide)).toHaveLength(1)
    await avsluttDobbeltIA()
    expect((await varsler('dobbeltAB')).filter((v) => v.ide?.id === ide)).toEqual([])
    expect(await verdi<number>('dobbeltAB', 'select count(*)::int from public.varsler where ide_id = $1', [ide])).toBe(0)
    expect(await serIde('dobbeltAB', ide, agruppe)).toEqual({ ...SER_INGENTING, kommentarer: 0 })
  })
})

describe('behandlingen av gruppeidéene', () => {
  it('gjøres av de ansvarlige: ikke aktuelt, åpne igjen, uten frist og uten automatisk sletting', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    expect(await kode(() => verdi('dobbeltAB', 'select public.arkiver_ide($1)', [ide]))).toBe('42501')
    expect(await kode(() => verdi('vanligB', 'select public.arkiver_ide($1)', [ide]))).toBe('42501')
    await verdi('adminA', 'select public.arkiver_ide($1)', [ide])
    expect((await serIde('vanligA', ide, agruppe)).apen).toBe(false)
    expect(await kode(() => kommenter('vanligA', ide))).toBe('42501')
    const varsel = (await varsler('vanligA')).find((v) => v.kategori === 'gruppeoppgaver')
    expect(varsel?.hendelser.at(-1)).toMatchObject({ art: 'ikke_aktuell' })

    // Lenger enn fristen for de felles idéene: den står, og kan åpnes igjen.
    await db.query(`update public.ideer set arkivert_kl = now() - interval '200 days' where id = $1`, [ide])
    expect(await verdi<number>('systemarkitekt', 'select public.rydd_idearkiv()')).toBe(0)
    expect((await gruppeideer('vanligA', agruppe)).ideer).toHaveLength(1)
    await verdi('adminA', 'select public.gjenopprett_ide($1)', [ide])
    expect((await serIde('vanligA', ide, agruppe)).apen).toBe(true)

    // En arkivert gruppeidé kan slettes av de ansvarlige, ikke av medlemmene.
    await verdi('adminA', 'select public.arkiver_ide($1)', [ide])
    expect(await somPerson('dobbeltAB', 'delete from public.ideer where id = $1 returning id', [ide])).toEqual([])
    expect(await somPerson('adminA', 'delete from public.ideer where id = $1 returning id', [ide])).toEqual([{ id: ide }])
  })

  it('lar ikke en lokal administrator i fagmiljøet behandle uten å være ansvarlig i gruppen', async () => {
    const ide = await nyGruppeide('vanligA', tverrgruppe)
    // adminA er lokal administrator i A, men ikke med i Tverrgruppen.
    expect(await kode(() => verdi('adminA', 'select public.arkiver_ide($1)', [ide]))).toBe('42501')
    expect(await kode(() => gjorOm('adminA', ide))).toBe('P0002')
    // vanligB er moderator, ikke ansvarlig.
    expect(await kode(() => gjorOm('vanligB', ide))).toBe('42501')
    expect(await gjorOm('systemarkitekt', ide)).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('lar de felles idéene være behandlet som før, bare av systemarkitektene', async () => {
    const felles = await nyFellesIde('vanligA')
    expect(await kode(() => verdi('adminA', 'select public.arkiver_ide($1)', [felles]))).toBe('42501')
    await verdi('systemarkitekt', 'select public.arkiver_ide($1)', [felles])
    await verdi('systemarkitekt', 'select public.gjenopprett_ide($1)', [felles])
    expect(await kode(() => gjorOm('systemarkitekt', felles))).toBe('P0002')
    const opg = await verdi<string>('systemarkitekt', 'select public.overfor_ide($1)', [felles])
    expect((await verdi<{ id: string }[]>('systemarkitekt', 'select public.oppgaveoversikt()')).map((o) => o.id)).toContain(opg)
    // Fristen gjelder fortsatt de felles idéene.
    const gammel = await nyFellesIde('vanligA', 'Gammel')
    await verdi('systemarkitekt', 'select public.arkiver_ide($1)', [gammel])
    await db.query(`update public.ideer set arkivert_kl = now() - interval '61 days' where id = $1`, [gammel])
    expect(await kode(() => verdi('systemarkitekt', 'select public.gjenopprett_ide($1)', [gammel]))).toBe('55000')
    expect(await verdi<number>('systemarkitekt', 'select public.rydd_idearkiv()')).toBe(1)
  })
})

describe('omgjøringen til en gruppeoppgave', () => {
  it('lager en oppgave med idéens innhold og opphav, og tråden kan fortsette', async () => {
    const ide = await nyGruppeide('vanligA', agruppe, 'Bedre vaktliste')
    await kommenter('dobbeltAB', ide)
    const nummer = await db.query<{ v: string }>(`select last_value::text as v from intern.oppgavenummer`)
    const opg = await gjorOm('adminA', ide)
    // Samme svar når den alt er gjort om.
    expect(await gjorOm('adminA', ide)).toBe(opg)
    expect(await oppgave('vanligA', opg)).toMatchObject({
      tittel: 'Bedre vaktliste',
      beskrivelse: JSON.parse(DOK('Beskrivelse')),
      status: 'ikke_paabegynt',
      prioritet: 'normal',
      ansvarlig_id: null,
      foreslatt_av: id('vanligA'),
      opprettet_av: id('adminA'),
      ide: { id: ide, tittel: 'Bedre vaktliste', kommentarer: 1 },
      kan_endre: false,
      kan_sette_status: false,
    })
    // Idéen er ikke åpen for endringer lenger, men tråden kan fortsette.
    const traad = await verdi<{ gruppeoppgave: { id: string }; kan_kommentere: boolean }>('vanligA', 'select public.idetraad($1)', [ide])
    expect(traad).toMatchObject({ gruppeoppgave: { id: opg }, kan_kommentere: true })
    expect(await somPerson('vanligA', `update public.ideer set tittel = 'Endret' where id = $1 returning id`, [ide])).toEqual([])
    expect(await somPerson('vanligA', 'delete from public.ideer where id = $1 returning id', [ide])).toEqual([])
    expect(await kommenter('dobbeltAB', ide)).toMatch(/^[0-9a-f-]{36}$/)
    expect(await kode(() => verdi('adminA', 'select public.arkiver_ide($1)', [ide]))).toBe('55000')
    // Den som skrev idéen, får vite det.
    expect((await varsler('vanligA')).find((v) => v.kategori === 'gruppeoppgaver')?.hendelser.at(-1)).toMatchObject({
      art: 'gjort_om',
      gruppeoppgave: { id: opg, tittel: 'Bedre vaktliste', gruppe: { id: agruppe } },
    })

    // Ingenting havner i de planlagte oppgavene, og ingen OPG-nummer brukes.
    expect(await verdi('systemarkitekt', 'select public.oppgaveoversikt()')).toEqual([])
    expect((await db.query<{ v: string }>(`select last_value::text as v from intern.oppgavenummer`)).rows[0]!.v).toBe(nummer.rows[0]!.v)
    expect(await kode(() => verdi('systemarkitekt', 'select public.overfor_ide($1)', [ide]))).toBe('42501')
  })

  it('kan angres: idéen er åpen igjen, med kommentarene, og varslet om oppgaven forsvinner', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    await kommenter('dobbeltAB', ide)
    const opg = await gjorOm('adminA', ide)
    expect(await kode(() => verdi('vanligA', 'select public.fjern_gruppeoppgave($1)', [opg]))).toBe('42501')
    await verdi('adminA', 'select public.fjern_gruppeoppgave($1)', [opg])
    await verdi('adminA', 'select public.fjern_gruppeoppgave($1)', [opg])
    expect(await serIde('vanligA', ide, agruppe)).toEqual({ ...SER_ALT, hjerter: 0 })
    expect((await varsler('vanligA')).filter((v) => v.kategori === 'gruppeoppgaver')).toEqual([])
    expect((await oppgaveoversikt('adminA', agruppe)).oppgaver).toEqual([])
  })

  it('står igjen med overskriften når kontoen til den som skrev idéen slettes', async () => {
    const ide = await nyGruppeide('vanligA', agruppe, 'Varig')
    const opg = await gjorOm('adminA', ide)
    await db.query('delete from auth.users where id = $1', [id('vanligA')])
    expect(await oppgave('adminA', opg)).toMatchObject({ tittel: 'Varig', ide: null, foreslatt_av: null })
  })
})

describe('gruppeoppgavene', () => {
  it('opprettes, endres og tildeles bare av de ansvarlige, og bare til aktive medlemmer', async () => {
    expect((await oppgaveoversikt('adminA', agruppe)).kan_opprette).toBe(true)
    expect((await oppgaveoversikt('vanligA', agruppe)).kan_opprette).toBe(false)
    expect(await kode(() => opprettOppgave('vanligA', agruppe, 'Ikke lov'))).toBe('42501')
    expect(await kode(() => opprettOppgave('adminB', agruppe, 'Ikke lov'))).toBe('P0002')
    expect(await kode(() => opprettOppgave('adminA', agruppe, ' '))).toBe('22023')
    expect(await kode(() => opprettOppgave('adminA', agruppe, 'Ukjent', null, 'kritisk'))).toBe('22023')
    // vanligB er ikke med i A-gruppen og kan ikke få oppgaver der.
    expect(await kode(() => opprettOppgave('adminA', agruppe, 'Utenfor', 'vanligB'))).toBe('22023')

    const opg = await opprettOppgave('adminA', agruppe, 'Rydde', 'vanligA', 'hoy')
    expect(await oppgave('vanligA', opg)).toMatchObject({ ansvarlig_id: id('vanligA'), ansvarlig_har_tilgang: true, prioritet: 'hoy', ide: null, foreslatt_av: null })
    expect((await varsler('vanligA')).find((v) => v.kategori === 'gruppeoppgaver')?.hendelser.at(-1)).toMatchObject({
      art: 'tildelt',
      gruppeoppgave: { id: opg },
    })
    await somPerson('vanligA', 'select public.merk_gruppeoppgave_sett($1)', [opg])
    expect((await varsler('vanligA')).filter((v) => v.kategori === 'gruppeoppgaver' && !('lest_kl' in v && v.lest_kl))).toHaveLength(0)

    expect(await kode(() => verdi('vanligA', 'select public.endre_gruppeoppgave($1, $2, null, $3)', [opg, 'Kapret', 'lav']))).toBe('42501')
    await verdi('adminA', 'select public.endre_gruppeoppgave($1, $2, $3, $4)', [opg, 'Rydde lageret', DOK('Hele'), 'lav'])
    expect(await oppgave('dobbeltAB', opg)).toMatchObject({ tittel: 'Rydde lageret', prioritet: 'lav' })

    expect(await kode(() => tildel('vanligA', opg, 'dobbeltAB'))).toBe('42501')
    expect(await kode(() => tildel('adminA', opg, 'vanligB'))).toBe('22023')
    await tildel('adminA', opg, 'dobbeltAB')
    await tildel('adminA', opg, 'dobbeltAB')
    await tildel('adminA', opg, null)
    expect((await oppgave('vanligA', opg))?.ansvarlig_id).toBeNull()
    // En oppgave uten ansvarlig er lov.
    expect(await opprettOppgave('adminA', agruppe, 'Ingen har den')).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('får fremdrift fra den som har den og de ansvarlige, ingen andre', async () => {
    const ide = await nyGruppeide('dobbeltAB', agruppe)
    const opg = await gjorOm('adminA', ide)
    await tildel('adminA', opg, 'vanligA')
    expect(await oppgave('vanligA', opg)).toMatchObject({ kan_sette_status: true, kan_endre: false })
    expect(await oppgave('dobbeltAB', opg)).toMatchObject({ kan_sette_status: false })
    expect(await kode(() => settStatus('dobbeltAB', opg, 'paagaar'))).toBe('42501')
    await settStatus('vanligA', opg, 'paagaar')
    await settStatus('vanligA', opg, 'paagaar')
    expect(await kode(() => settStatus('vanligA', opg, 'klar'))).toBe('22023')
    await settStatus('vanligA', opg, 'fullfort')
    expect((await oppgave('adminA', opg))?.fullfort_kl).not.toBeNull()
    // Den som skrev idéen, får vite at den er fullført.
    expect((await varsler('dobbeltAB')).find((v) => v.kategori === 'gruppeoppgaver')?.hendelser.at(-1)).toMatchObject({ art: 'fullfort' })
    await settStatus('adminA', opg, 'paagaar')
    expect(await oppgave('adminA', opg)).toMatchObject({ status: 'paagaar', fullfort_kl: null })
  })

  it('står i oversikten etter status og prioritet', async () => {
    const lav = await opprettOppgave('adminA', agruppe, 'Lav', null, 'lav')
    const hoy = await opprettOppgave('adminA', agruppe, 'Høy', null, 'hoy')
    const normal = await opprettOppgave('adminA', agruppe, 'Normal')
    const ferdig = await opprettOppgave('adminA', agruppe, 'Ferdig', null, 'hoy')
    await settStatus('adminA', ferdig, 'fullfort')
    expect((await oppgaveoversikt('vanligA', agruppe)).oppgaver.map((o) => o.id)).toEqual([hoy, normal, lav, ferdig])
  })

  it('mister den som fjernes fra gruppen, også oppgavene hen har', async () => {
    const opg = await opprettOppgave('adminA', agruppe, 'Min', 'vanligA')
    await fjern('adminA', agruppe, 'vanligA')
    expect(await oppgave('vanligA', opg)).toBeNull()
    expect(await kode(() => oppgaveoversikt('vanligA', agruppe))).toBe('P0002')
    expect(await kode(() => settStatus('vanligA', opg, 'fullfort'))).toBe('P0002')
    expect((await varsler('vanligA')).filter((v) => v.kategori === 'gruppeoppgaver')).toEqual([])
    // De ansvarlige ser at den som har oppgaven, ikke har tilgang nå.
    expect(await oppgave('adminA', opg)).toMatchObject({ ansvarlig_id: id('vanligA'), ansvarlig_har_tilgang: false })
  })

  it('fryses når gruppen arkiveres; systemarkitektene leser den fortsatt', async () => {
    const ide = await nyGruppeide('vanligA', agruppe)
    const opg = await opprettOppgave('adminA', agruppe, 'Før arkivet', 'vanligA')
    await verdi('adminA', 'select public.arkiver_gruppe($1, true)', [agruppe])
    expect((await oppgave('systemarkitekt', opg))?.kan_endre).toBe(false)
    expect(await serIde('systemarkitekt', ide, agruppe)).toMatchObject({ tabell: 1, liste: 1, traad: true, apen: false })
    expect(await kode(() => settStatus('systemarkitekt', opg, 'fullfort'))).toBe('55000')
    expect(await kode(() => opprettOppgave('systemarkitekt', agruppe, 'Etter'))).toBe('55000')
    expect(await kode(() => nyGruppeide('systemarkitekt', agruppe))).toBe('42501')
    expect(await kode(() => kommenter('systemarkitekt', ide))).toBe('42501')
    expect(await kode(() => oppgaveoversikt('vanligA', agruppe))).toBe('P0002')
  })
})

describe('på tvers av fagmiljøene', () => {
  it('lar B samarbeide med A i gruppen uten å få noe av A sitt lokale', async () => {
    const ide = await nyGruppeide('vanligA', tverrgruppe)
    await kommenter('vanligB', ide)
    const opg = await opprettOppgave('systemarkitekt', tverrgruppe, 'Felles arbeid', 'vanligB')
    await settStatus('vanligB', opg, 'paagaar')
    expect((await gruppeideer('vanligB', tverrgruppe)).ideer.map((i) => i.id)).toEqual([ide])
    // A-gruppens idéer og oppgaver er fortsatt utenfor rekkevidde for B.
    const aide = await nyGruppeide('vanligA', agruppe)
    expect(await serIde('vanligB', aide, agruppe)).toEqual(SER_INGENTING)
    const aopg = await opprettOppgave('adminA', agruppe, 'Bare A')
    expect(await oppgave('vanligB', aopg)).toBeNull()
  })

  it('beholder gruppen på tvers når et medlemskap i ett fagmiljø avsluttes, men mister gruppen i det fagmiljøet', async () => {
    const tverr = await nyGruppeide('vanligA', tverrgruppe)
    const aide = await nyGruppeide('vanligA', agruppe)
    await kommenter('vanligA', tverr)
    await kommenter('vanligA', aide)
    await somPerson('vanligA', 'insert into public.idehjerter (ide_id) values ($1), ($2)', [tverr, aide])
    await avsluttDobbeltIA()
    expect(await serIde('dobbeltAB', tverr, tverrgruppe)).toEqual(SER_ALT)
    expect(await serIde('dobbeltAB', aide, agruppe)).toEqual(SER_INGENTING)
  })
})
