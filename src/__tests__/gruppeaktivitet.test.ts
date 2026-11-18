/**
 * D3: «Siste aktivitet» på gruppesiden (`public.gruppeaktivitet`,
 * migrasjonen `*_gruppeaktivitet.sql`).
 *
 * Kaller databasen som den innloggede, med persongalleriet. «A-gruppen» i A
 * har `adminA` som ansvarlig og `vanligA` og `dobbeltAB` som medlemmer. Hver
 * test får sin egen kopi av databasen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

const DOK = (tekst: string) => JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: tekst }] }] })
const AVSLAG = { code: 'P0002', message: 'Gruppen finnes ikke, eller du har ikke tilgang til den.' }

let basis: PGlite
let db: PGlite
let galleri: Persongalleri
let agruppe: string

const id = (p: Person) => galleri.id[p]

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = [], i: PGlite = db): Promise<T> =>
  som(i, id(person), async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0]!)[0] as T)

interface Rad {
  slag: string
  tittel?: string
  ide?: string
  kommentar?: string
  oppgave?: string
  diskusjon?: string
  hva?: string
  tildelt_meg?: boolean
  uleste?: number
  aktor?: { username: string } | null
  tid: string
  ulest: boolean
}

const aktivitet = (person: Person, gruppe = agruppe) => verdi<Rad[]>(person, 'select public.gruppeaktivitet($1)', [gruppe])
const nyIde = (person: Person, tittel: string) =>
  verdi<string>(person, 'insert into public.ideer (gruppe_id, tittel, tekst) values ($1, $2, $3) returning id', [agruppe, tittel, DOK('Hemmelig beskrivelse')])
const kommenterIde = (person: Person, ide: string) =>
  verdi<string>(person, 'insert into public.idekommentarer (ide_id, tekst) values ($1, $2) returning id', [ide, DOK('Hemmelig kommentar')])
const nyOppgave = (person: Person, tittel: string, ansvarlig: Person | null = null) =>
  verdi<string>(person, `select public.opprett_gruppeoppgave($1, $2, null, $3, 'normal')`, [agruppe, tittel, ansvarlig && id(ansvarlig)])
async function nyTraad(person: Person, tittel: string) {
  const side = `gruppe:${agruppe}`
  const kategori = await verdi<string>(person, 'select public.opprett_diskusjonskategori($1, $2, $3)', [side, 'Tema', '💬'])
  return verdi<string>(person, 'select public.opprett_diskusjon($1, $2, $3, $4)', [side, kategori, tittel, DOK('Hemmelig innlegg')])
}
const skriv = (person: Person, tekst: string) =>
  verdi(person, 'select public.send_gruppemelding($1, gen_random_uuid(), $2)', [agruppe, tekst])

const avslag = async (person: Person, gruppe = agruppe) => {
  const feil = await feilFra(() => aktivitet(person, gruppe))
  return feil && { code: feil.code, message: feil.message }
}

async function medlem(aktor: Person, mal: Person, i: PGlite) {
  await verdi(aktor, 'select public.inviter_til_gruppe($1, $2)', [agruppe, `test.${mal.toLowerCase()}`], i)
  await verdi(mal, 'select public.svar_paa_gruppeinvitasjon($1, true)', [agruppe], i)
}

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
  agruppe = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['A-gruppen', 'Syntetisk', galleri.fagmiljo.A], basis)
  await medlem('adminA', 'vanligA', basis)
  await medlem('adminA', 'dobbeltAB', basis)
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

describe('siste aktivitet i en gruppe', () => {
  it('gir de tre nyeste hendelsene fra andre, uten det den innloggede selv har gjort', async () => {
    const ide = await nyIde('dobbeltAB', 'Felles mal')
    await nyIde('vanligA', 'Min egen idé')
    const kommentar = await kommenterIde('adminA', ide)
    const oppgave = await nyOppgave('adminA', 'Oppdatere rutinen', 'vanligA')
    const traad = await nyTraad('dobbeltAB', 'Hvordan bruker vi gruppen?')

    const rader = await aktivitet('vanligA')
    expect(rader.map((r) => r.slag)).toEqual(['diskusjon', 'oppgave', 'idekommentar'])
    expect(rader[0]).toMatchObject({ diskusjon: traad, tittel: 'Hvordan bruker vi gruppen?', aktor: { username: 'test.dobbeltab' }, ulest: true })
    expect(rader[1]).toMatchObject({ oppgave, tittel: 'Oppdatere rutinen', hva: 'opprettet', tildelt_meg: true, ulest: true })
    expect(rader[2]).toMatchObject({ ide, kommentar, tittel: 'Felles mal', aktor: { username: 'test.admina' }, ulest: true })
    // Aldri teksten i idéer, kommentarer eller innlegg.
    expect(JSON.stringify(rader)).not.toMatch(/Hemmelig/)

    // Den som skrev tråden og opprettet oppgaven, ser bare det andre har gjort.
    expect((await aktivitet('adminA')).map((r) => r.slag)).toEqual(['diskusjon', 'ide', 'ide'])
  })

  it('merker det som er åpnet, som lest', async () => {
    const ide = await nyIde('dobbeltAB', 'Felles mal')
    expect((await aktivitet('vanligA'))[0]).toMatchObject({ slag: 'ide', ulest: true })
    await verdi('vanligA', 'select public.merk_ide_sett($1, now())', [ide])
    expect((await aktivitet('vanligA'))[0]).toMatchObject({ slag: 'ide', ulest: false })
  })

  it('gir gruppechatten som én rad med tallet på uleste, uten tekst og uten avsender', async () => {
    await skriv('dobbeltAB', 'Hemmelig melding')
    await skriv('adminA', 'Hemmelig melding 2')
    await skriv('vanligA', 'Egen melding')
    const [chat] = await aktivitet('vanligA')
    expect(chat).toEqual({ slag: 'chat', uleste: 2, tid: expect.any(String), ulest: true })
    await verdi('vanligA', 'select public.merk_gruppechat_lest($1, 100)', [agruppe])
    expect((await aktivitet('vanligA'))[0]).toMatchObject({ slag: 'chat', uleste: 0, ulest: false })
  })

  it('er tom i en gruppe uten noe fra andre', async () => {
    await nyIde('vanligA', 'Bare min')
    expect(await aktivitet('vanligA')).toEqual([])
  })
})

describe('tilgangen', () => {
  it('gir det samme avslaget til den som ikke er med, et annet fagmiljø og en ukjent gruppe', async () => {
    await nyIde('dobbeltAB', 'Felles mal')
    for (const p of ['vanligB', 'adminB', 'avsluttetA', 'utenMedlemskap'] as const) {
      const svar = await avslag(p)
      // Uten aktivt medlemskap stopper det før gruppen slås opp.
      if (p === 'utenMedlemskap') expect(svar, p).not.toBeNull()
      else expect(svar, p).toEqual(AVSLAG)
    }
    expect(await avslag('vanligA', '00000000-0000-4000-8000-000000000000')).toEqual(AVSLAG)
    // En systemarkitekt leser alle gruppene.
    expect((await aktivitet('arkitektB')).map((r) => r.slag)).toEqual(['ide'])
  })

  it('stenger for et medlem som er fjernet, med en gang', async () => {
    await nyIde('dobbeltAB', 'Felles mal')
    expect(await aktivitet('vanligA')).toHaveLength(1)
    await verdi('adminA', 'select public.avslutt_gruppemedlemskap($1, $2)', [agruppe, id('vanligA')])
    expect(await avslag('vanligA')).toEqual(AVSLAG)
  })

  it('viser en arkivert gruppe bare for systemarkitektene, og uten de lukkede diskusjonene', async () => {
    await nyIde('dobbeltAB', 'Felles mal')
    await nyTraad('dobbeltAB', 'Tråd')
    await verdi('adminA', 'select public.arkiver_gruppe($1, true)', [agruppe])
    for (const p of ['vanligA', 'adminA'] as const) expect(await avslag(p), p).toEqual(AVSLAG)
    expect((await aktivitet('systemarkitekt')).map((r) => r.slag)).toEqual(['ide'])
  })
})
