/**
 * D2: den personlige forsiden i databasen (docs/forside.md). Kallet
 * `forsideoppsummering` gir inntil tre rader per panel, og bare det den
 * innloggede kan lese: ikke andres varsler, ikke grupper hen ikke er med i,
 * ikke arkiverte grupper og ikke det lokale fra et annet fagmiljø enn det hen
 * arbeider i nå. Valgene for forsiden ligger i brukerinnstillingene, der hver
 * bare leser og skriver sine egne.
 *
 * Personene er persongalleriets syntetiske kontoer; hver test får sin egen
 * kopi av databasen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, som } from './hjelp/testdatabase'

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

interface Svar {
  varsler?: { id: string; kategori: string; lest_kl: string | null }[]
  invitasjoner?: { gruppe: { id: string } }[]
  grupper?: { id: string; navn: string; medlemmer: number; samhandling: Record<string, number | null> }[]
  fagsider?: { side: { id: string; navn: string; stoff: string }; deler: string[]; kl: string }[]
  oppgaver?: { id: string; tittel: string; gruppe: { id: string } }[]
}

const oppsummering = (person: Person, modul: string) => verdi<Svar>(person, 'select public.forsideoppsummering($1)', [modul])

async function medlem(aktor: Person, gruppe: string, mal: Person, i: PGlite = db) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [gruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppe], i)
}

/** Et varsel lagt rett i tabellen, slik utløserne lager dem. */
async function varsel(
  mottaker: Person,
  kategori: string,
  { fagmiljo = null, gruppe = null, lest = false, minutterSiden = 0 }: { fagmiljo?: string | null; gruppe?: string | null; lest?: boolean; minutterSiden?: number } = {},
): Promise<string> {
  const kl = new Date(Date.now() - minutterSiden * 60_000).toISOString()
  const { rows } = await db.query<{ id: string }>(
    `insert into public.varsler (mottaker_id, kategori, gruppe, hendelser, fagmiljo_id, gruppe_id, oppdatert_kl, lest_kl)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
    [id(mottaker), kategori, `${kategori}:${crypto.randomUUID()}`, JSON.stringify([{ kl, av: null }]), fagmiljo, gruppe, kl, lest ? kl : null],
  )
  return rows[0]!.id
}

const ider = (svar: Svar) => (svar.varsler ?? []).map((v) => v.id)

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
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

describe('valgene for forsiden', () => {
  it('leses og skrives bare av eieren', async () => {
    const valg = [{ modul: 'grupper', synlig: true }]
    await somPerson('vanligA', `insert into public.brukerinnstillinger (nokkel, verdi) values ('forside.moduler', $1)`, [JSON.stringify(valg)])
    expect(await somPerson('vanligA', `select verdi from public.brukerinnstillinger where nokkel = 'forside.moduler'`)).toEqual([{ verdi: valg }])
    // En annen ser ingenting, og kan verken endre, slette eller skrive i den andres navn.
    expect(await somPerson('vanligB', `select verdi from public.brukerinnstillinger where nokkel = 'forside.moduler'`)).toEqual([])
    expect(await somPerson('vanligB', `update public.brukerinnstillinger set verdi = '[]' where bruker_id = $1 returning 1`, [id('vanligA')])).toEqual([])
    expect(await somPerson('vanligB', `delete from public.brukerinnstillinger where bruker_id = $1 returning 1`, [id('vanligA')])).toEqual([])
    expect(
      await kode(() => somPerson('vanligB', `insert into public.brukerinnstillinger (bruker_id, nokkel, verdi) values ($1, 'forside.moduler', '[]')`, [id('vanligA')])),
    ).toBe('42501')
    expect(await db.query(`select verdi from public.brukerinnstillinger where bruker_id = $1`, [id('vanligA')])).toMatchObject({ rows: [{ verdi: valg }] })
    // Uten innlogging: ingenting.
    expect(await kode(() => som(db, null, (tx) => tx.query(`select * from public.brukerinnstillinger`)))).toBe('42501')
  })
})

describe('oppsummeringen', () => {
  it('krever et aktivt medlemskap og en kjent modul', async () => {
    expect(await kode(() => oppsummering('utenMedlemskap', 'grupper'))).not.toBeNull()
    expect(await kode(() => oppsummering('tidligereAdmin', 'aktuelt'))).not.toBeNull()
    expect(await kode(() => oppsummering('vanligA', 'noe_annet'))).toBe('22023')
    expect(await kode(() => som(db, null, (tx) => tx.query(`select public.forsideoppsummering('grupper')`)))).toBe('42501')
  })

  it('gir aldri andres varsler, og høyst tre', async () => {
    for (let i = 0; i < 5; i++) await varsel('vanligA', 'mine_ideer', { minutterSiden: i })
    const andres = await varsel('vanligB', 'mine_ideer')
    const svar = await oppsummering('vanligA', 'aktuelt')
    expect(svar.varsler).toHaveLength(3)
    expect(ider(svar)).not.toContain(andres)
    expect(ider(await oppsummering('vanligB', 'aktuelt'))).toEqual([andres])
  })

  it('setter det som krever handling først i «Aktuelt for deg», og bare det uleste', async () => {
    const svar_ = await varsel('vanligA', 'mine_ideer', { minutterSiden: 1 })
    const forslag = await varsel('vanligA', 'forslag_til_behandling', { minutterSiden: 30 })
    await varsel('vanligA', 'mine_forslag', { lest: true })
    // Kategorier som ikke hører hit, står ikke her.
    await varsel('vanligA', 'nye_ideer')
    expect(ider(await oppsummering('vanligA', 'aktuelt'))).toEqual([forslag, svar_])
  })

  it('lar kategorier brukeren har slått av i varselinnstillingene, stå utenfor', async () => {
    const forslag = await varsel('vanligA', 'forslag_til_behandling')
    const svar_ = await varsel('vanligA', 'mine_ideer')
    await somPerson('vanligA', `insert into public.brukerinnstillinger (nokkel, verdi) values ('varsler.valg', '{"forslag_til_behandling": false}')`)
    expect(ider(await oppsummering('vanligA', 'aktuelt'))).toEqual([svar_])
    expect(ider(await oppsummering('vanligA', 'aktuelt'))).not.toContain(forslag)
  })

  it('viser invitasjoner til grupper bare for den inviterte', async () => {
    await verdi('systemarkitekt', 'select public.inviter_til_gruppe($1, $2)', [tverrgruppe, 'test.adminb'])
    expect((await oppsummering('adminB', 'aktuelt')).invitasjoner?.map((i) => i.gruppe.id)).toEqual([tverrgruppe])
    expect((await oppsummering('vanligB', 'aktuelt')).invitasjoner).toEqual([])
    expect((await oppsummering('vanligA', 'aktuelt')).invitasjoner).toEqual([])
  })
})

describe('fagmiljøet', () => {
  it('tar bare med det lokale fra fagmiljøet brukeren arbeider i nå', async () => {
    const iA = await varsel('dobbeltAB', 'fortolkning', { fagmiljo: galleri.fagmiljo.A })
    const iB = await varsel('dobbeltAB', 'fortolkning', { fagmiljo: galleri.fagmiljo.B })
    expect(ider(await oppsummering('dobbeltAB', 'viktig_nytt'))).toEqual([iA])
    await verdi('dobbeltAB', 'select public.velg_arbeidsfagmiljo($1)', [galleri.fagmiljo.B])
    expect(ider(await oppsummering('dobbeltAB', 'viktig_nytt'))).toEqual([iB])
  })

  it('viser ikke et varsel fra et fagmiljø brukeren ikke lenger er med i', async () => {
    await varsel('avsluttetA', 'fortolkning', { fagmiljo: galleri.fagmiljo.A })
    const iB = await varsel('vanligB', 'fortolkning', { fagmiljo: galleri.fagmiljo.B })
    // vanligB har et varsel fra A som ikke skulle vært der: det vises ikke.
    await varsel('vanligB', 'fortolkning', { fagmiljo: galleri.fagmiljo.A })
    expect(ider(await oppsummering('vanligB', 'viktig_nytt'))).toEqual([iB])
  })

  it('lar systemarkitekten se et annet fagmiljø uten å få det forrige med seg', async () => {
    const iA = await varsel('systemarkitekt', 'fortolkning', { fagmiljo: galleri.fagmiljo.A })
    expect(ider(await oppsummering('systemarkitekt', 'viktig_nytt'))).toEqual([iA])
    await verdi('systemarkitekt', 'select public.velg_arbeidsfagmiljo($1)', [galleri.fagmiljo.B])
    expect(ider(await oppsummering('systemarkitekt', 'viktig_nytt'))).toEqual([])
  })
})

describe('gruppene', () => {
  it('viser bare gruppene brukeren er aktivt medlem av', async () => {
    expect((await oppsummering('vanligA', 'grupper')).grupper?.map((g) => g.id).sort()).toEqual([agruppe, tverrgruppe].sort())
    expect((await oppsummering('vanligB', 'grupper')).grupper?.map((g) => g.id)).toEqual([tverrgruppe])
    expect((await oppsummering('adminB', 'grupper')).grupper).toEqual([])
    // Systemarkitekten leser alle gruppene, men forsiden viser bare dem hen er med i.
    expect((await oppsummering('arkitektB', 'grupper')).grupper).toEqual([])
  })

  it('viser ikke en arkivert gruppe, heller ikke for systemarkitekten', async () => {
    await verdi('systemarkitekt', 'select public.arkiver_gruppe($1, true)', [tverrgruppe])
    expect((await oppsummering('vanligA', 'grupper')).grupper?.map((g) => g.id)).toEqual([agruppe])
    expect((await oppsummering('systemarkitekt', 'grupper')).grupper).toEqual([])
  })

  it('setter gruppen med ny aktivitet først', async () => {
    await verdi<string>('adminA', 'insert into public.ideer (gruppe_id, tittel) values ($1, $2) returning id', [agruppe, 'Ny gruppeidé'])
    const [forst] = (await oppsummering('vanligA', 'grupper')).grupper ?? []
    expect(forst).toMatchObject({ id: agruppe, medlemmer: 3, samhandling: { nye_ideer: 1 } })
  })

  it('viser ikke varsler fra en gruppe brukeren er fjernet fra', async () => {
    const fra = await varsel('vanligA', 'gruppeoppgaver', { gruppe: agruppe })
    expect(ider(await oppsummering('vanligA', 'aktuelt'))).toEqual([fra])
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('vanligA')])
    expect(ider(await oppsummering('vanligA', 'aktuelt'))).toEqual([])
  })

  it('viser oppgavene brukeren har, ikke de fullførte og ikke fra arkiverte grupper', async () => {
    const ny = (gruppe: string, tittel: string, aktor: Person, ansvarlig: Person, prioritet = 'normal') =>
      verdi<string>(aktor, 'select public.opprett_gruppeoppgave($1, $2, null, $3, $4)', [gruppe, tittel, id(ansvarlig), prioritet])
    const vanlig = await ny(agruppe, 'Vanlig', 'adminA', 'vanligA')
    const viktig = await ny(agruppe, 'Viktig', 'adminA', 'vanligA', 'hoy')
    const ferdig = await ny(agruppe, 'Ferdig', 'adminA', 'vanligA')
    await verdi('adminA', `select public.sett_gruppeoppgavestatus($1, 'fullfort')`, [ferdig])
    await ny(agruppe, 'Andres', 'adminA', 'dobbeltAB')
    await ny(tverrgruppe, 'I arkivert gruppe', 'systemarkitekt', 'vanligA')
    await verdi('systemarkitekt', 'select public.arkiver_gruppe($1, true)', [tverrgruppe])
    expect((await oppsummering('vanligA', 'oppgaver')).oppgaver?.map((o) => o.id)).toEqual([viktig, vanlig])
    expect((await oppsummering('vanligB', 'oppgaver')).oppgaver).toEqual([])
  })
})

describe('fagsidene', () => {
  it('viser publiserte endringer med delene, ikke utkast', async () => {
    const kall = faginnholdskall(db, id('systemarkitekt'))
    const side = (await kall.opprett('infoside', { navn: 'Teststoff' })).id
    await kall.publiser(side, 1)
    const utkast = (await kall.opprett('infoside', { navn: 'Bare utkast' })).id
    const element = (
      await kall.opprett('innholdselement', { infoside: side, panel: 'dosering', posisjon: 0, elementtype: 'tekst', data: { tekst: 'Syntetisk' } })
    ).id
    await kall.publiser(element, 1)
    await kall.opprett('innholdselement', { infoside: utkast, panel: 'dosering', posisjon: 0, elementtype: 'tekst', data: { tekst: 'Syntetisk' } })
    const svar = await oppsummering('vanligB', 'fagsider')
    expect(svar.fagsider).toEqual([expect.objectContaining({ side: { id: side, navn: 'Teststoff', stoff: 'teststoff' }, deler: ['dosering'] })])
  })
})
