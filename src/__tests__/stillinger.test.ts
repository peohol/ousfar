/**
 * Stillingene (`supabase/migrations/20261119125000_stillinger.sql`,
 * docs/stillinger.md): lista Peder ga, hvem som kan sette stillingen til hvem,
 * at stillingen står på profilkortet, systemarkitektenes endringer av lista,
 * og at en stilling noen har, bare kan fjernes når de får en annen. Alt er
 * syntetisk.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { navnFeil, normaliserNavn } from '@delt/profil'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let db: PGlite
let galleri: Persongalleri

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
}, 120_000)

afterAll(async () => {
  await db.close()
})

/** Kjører arbeidet som personen og lagrer det. */
const somPerson = <T>(person: Person, arbeid: (tx: Transaction) => Promise<T>) => som(db, galleri.id[person], arbeid)

/** Kaller en funksjon som personen og gir svaret. */
async function kall<T>(person: Person, sql: string, parametre: unknown[] = []): Promise<T> {
  return somPerson(
    person,
    async (tx) => (await tx.query<{ svar: T }>(`select ${sql} as svar`, parametre)).rows[0]!.svar,
  )
}

/** Lista slik databasen har den, som navn per kategori i rekkefølge. */
async function lista(): Promise<Record<string, string[]>> {
  const { rows } = await db.query<{ kategori: string; stillinger: string[] }>(`
    select k.navn as kategori,
      coalesce(array_agg(s.navn order by s.rekkefolge, s.navn) filter (where s.id is not null), '{}') as stillinger
    from public.stillingskategorier k
    left join public.stillinger s on s.kategori_id = k.id
    group by k.id
    order by k.rekkefolge, k.navn
  `)
  return Object.fromEntries(rows.map((r) => [r.kategori, r.stillinger]))
}

const stillingId = async (navn: string) =>
  (await db.query<{ id: string }>('select id from public.stillinger where navn = $1', [navn])).rows[0]!.id
const kategoriId = async (navn: string) =>
  (await db.query<{ id: string }>('select id from public.stillingskategorier where navn = $1', [navn])).rows[0]!.id
const stillingTil = async (person: Person) =>
  (
    await db.query<{ navn: string | null }>(
      'select s.navn from public.profiles p left join public.stillinger s on s.id = p.stilling_id where p.id = $1',
      [galleri.id[person]],
    )
  ).rows[0]!.navn

beforeEach(async () => {
  await db.exec('update public.profiles set stilling_id = null where stilling_id is not null')
})

describe('lista', () => {
  it('er fylt med lista Peder ga, i rekkefølgen han ga den', async () => {
    expect(await lista()).toEqual({
      Leger: ['LIS', 'Overlege'],
      Laboratorieansatte: ['Bioingeniør', 'Kjemiker', 'Overingeniør'],
      Annet: ['Fortolkningsrådgiver', 'Administrasjonskonsulent'],
    })
  })

  it('leses av alle med aktivt medlemskap, og ikke av andre', async () => {
    const antall = (person: Person) =>
      somPerson(person, async (tx) => (await tx.query('select id from public.stillinger')).rows.length)
    expect(await antall('vanligA')).toBe(7)
    expect(await antall('vanligB')).toBe(7)
    expect(await antall('utenMedlemskap')).toBe(0)
  })

  it('kan ikke endres direkte fra nettleseren, heller ikke av en systemarkitekt', async () => {
    const feil = await feilFra(() =>
      somPerson('systemarkitekt', (tx) => tx.query(`update public.stillinger set navn = 'Hacket'`)),
    )
    expect(feil?.code).toBe('42501')
  })
})

describe('brukerens stilling', () => {
  it('står på profilkortet, for dem som ser profilen', async () => {
    const lis = await stillingId('LIS')
    await kall('vanligA', 'public.sett_stilling($1, $2)', [galleri.id.vanligA, lis])
    const sett = (person: Person) =>
      somPerson(
        person,
        async (tx) =>
          (
            await tx.query<{ stilling_id: string }>('select stilling_id from public.profiles where id = $1', [
              galleri.id.vanligA,
            ])
          ).rows[0]?.stilling_id,
      )
    expect(await sett('adminA')).toBe(lis)
    // Ingen felles fagmiljø: profilen, og dermed stillingen, er skjult.
    expect(await sett('vanligB')).toBeUndefined()
  })

  it('settes og fjernes av brukeren selv', async () => {
    await kall('vanligA', 'public.sett_stilling($1, $2)', [galleri.id.vanligA, await stillingId('Kjemiker')])
    expect(await stillingTil('vanligA')).toBe('Kjemiker')
    await kall('vanligA', 'public.sett_stilling($1, null)', [galleri.id.vanligA])
    expect(await stillingTil('vanligA')).toBeNull()
  })

  it('settes av en systemarkitekt for alle, og av en lokal administrator for medlemmene i egne fagmiljøer', async () => {
    const overlege = await stillingId('Overlege')
    const prov = async (aktor: Person, mal: Person) =>
      (await feilFra(() => kall(aktor, 'public.sett_stilling($1, $2)', [galleri.id[mal], overlege])))?.code ?? 'ok'

    expect(await prov('systemarkitekt', 'vanligB')).toBe('ok')
    expect(await prov('adminA', 'vanligA')).toBe('ok')
    expect(await prov('adminA', 'dobbeltAB')).toBe('ok')
    // Ikke medlem av et fagmiljø adminA administrerer.
    expect(await prov('adminA', 'vanligB')).toBe('42501')
    // En systemarkitekt endres bare av en systemarkitekt.
    expect(await prov('adminB', 'arkitektB')).toBe('42501')
    expect(await prov('vanligA', 'dobbeltAB')).toBe('42501')
    expect(await prov('utenMedlemskap', 'utenMedlemskap')).toBe('42501')
  })

  it('kan ikke settes til en stilling som ikke finnes', async () => {
    const feil = await feilFra(() =>
      kall('vanligA', 'public.sett_stilling($1, gen_random_uuid())', [galleri.id.vanligA]),
    )
    expect(feil?.code).toBe('P0002')
  })

  it('viser i medlemslista om administratoren kan endre stillingen', async () => {
    const fagmiljoA = (
      await db.query<{ id: string }>(`select id from public.fagmiljoer where nokkel = 'ous-klinisk-farmakologi'`)
    ).rows[0]!.id
    const rader = await somPerson(
      'adminA',
      async (tx) =>
        (
          await tx.query<{
            bruker_id: string
            endre_stilling: boolean
            stilling_id: string | null
          }>('select bruker_id, endre_stilling, stilling_id from public.medlemsoversikt($1)', [fagmiljoA])
        ).rows,
    )
    const rad = (p: Person) => rader.find((r) => r.bruker_id === galleri.id[p])
    expect(rad('vanligA')?.endre_stilling).toBe(true)
    expect(rad('adminA')?.endre_stilling).toBe(true)
    expect(rad('systemarkitekt')?.endre_stilling).toBe(false)
    // Tidligere medlemmer får ingen ny stilling herfra.
    expect(rad('avsluttetA')?.endre_stilling).toBe(false)
    expect(rad('vanligA')).toHaveProperty('stilling_id', null)
  })
})

describe('systemarkitektenes endringer av lista', () => {
  /** Hver test her endrer lista; den legges tilbake etterpå. */
  async function medLista(prov: () => Promise<void>) {
    const { rows: kategorier } = await db.query('select * from public.stillingskategorier')
    const { rows: stillinger } = await db.query('select * from public.stillinger')
    try {
      await prov()
    } finally {
      await db.exec(
        'update public.profiles set stilling_id = null; delete from public.stillinger; delete from public.stillingskategorier;',
      )
      for (const k of kategorier as {
        id: string
        navn: string
        rekkefolge: number
      }[]) {
        await db.query('insert into public.stillingskategorier (id, navn, rekkefolge) values ($1, $2, $3)', [
          k.id,
          k.navn,
          k.rekkefolge,
        ])
      }
      for (const s of stillinger as {
        id: string
        kategori_id: string
        navn: string
        rekkefolge: number
      }[]) {
        await db.query('insert into public.stillinger (id, kategori_id, navn, rekkefolge) values ($1, $2, $3, $4)', [
          s.id,
          s.kategori_id,
          s.navn,
          s.rekkefolge,
        ])
      }
    }
  }

  it('er bare for systemarkitektene', async () => {
    for (const person of ['adminA', 'vanligA'] as const) {
      expect((await feilFra(() => kall(person, `public.lagre_stillingskategori(null, 'Nytt')`)))?.code, person).toBe(
        '42501',
      )
      expect((await feilFra(() => kall(person, 'public.stillingsbruk()')))?.code, person).toBe('42501')
    }
  })

  it('legger til, gir nytt navn, flytter og fjerner kategorier og stillinger', async () => {
    await medLista(async () => {
      const ny = await kall<string>('systemarkitekt', `public.lagre_stillingskategori(null, '  Forskere ')`)
      await kall('systemarkitekt', `public.lagre_stilling(null, $1, 'Postdoktor')`, [ny])
      await kall('systemarkitekt', `public.lagre_stilling(null, $1, 'Stipendiat')`, [ny])
      await kall('systemarkitekt', `public.lagre_stilling($1, $2, 'Lege i spesialisering')`, [
        await stillingId('LIS'),
        await kategoriId('Leger'),
      ])
      await kall('systemarkitekt', 'public.flytt_stillingskategori($1, 0)', [ny])
      await kall('systemarkitekt', 'public.flytt_stilling($1, 0)', [await stillingId('Stipendiat')])
      // Ny kategori: står sist i den nye.
      await kall('systemarkitekt', 'public.lagre_stilling($1, $2, $3)', [
        await stillingId('Kjemiker'),
        await kategoriId('Annet'),
        'Kjemiker',
      ])
      await kall('systemarkitekt', 'public.fjern_stilling($1)', [await stillingId('Overingeniør')])
      expect(await lista()).toEqual({
        Forskere: ['Stipendiat', 'Postdoktor'],
        Leger: ['Lege i spesialisering', 'Overlege'],
        Laboratorieansatte: ['Bioingeniør'],
        Annet: ['Fortolkningsrådgiver', 'Administrasjonskonsulent', 'Kjemiker'],
      })
      // En kategori med stillinger i kan ikke fjernes; en tom kan.
      expect((await feilFra(() => kall('systemarkitekt', 'public.fjern_stillingskategori($1)', [ny])))?.code).toBe(
        '55000',
      )
      const tom = await kall<string>('systemarkitekt', `public.lagre_stillingskategori(null, 'Tom')`)
      await kall('systemarkitekt', 'public.fjern_stillingskategori($1)', [tom])
      expect(Object.keys(await lista())).not.toContain('Tom')
    })
  })

  it('avviser like navn, tomme og for lange navn, og navn med fødselsnummer', async () => {
    const leger = await kategoriId('Leger')
    const kode = async (sql: string, parametre: unknown[]) =>
      (await feilFra(() => kall('systemarkitekt', sql, parametre)))?.code
    expect(await kode(`public.lagre_stilling(null, $1, 'overlege')`, [leger])).toBe('23505')
    expect(await kode(`public.lagre_stillingskategori(null, 'LEGER')`, [])).toBe('23505')
    expect(await kode(`public.lagre_stilling(null, $1, '   ')`, [leger])).toBe('22023')
    expect(await kode(`public.lagre_stilling(null, $1, $2)`, [leger, 'x'.repeat(61)])).toBe('22023')
  })

  it('normaliserer og avgrenser navnene som appen gjør det', async () => {
    for (const raatekst of ['  To   ord ', 'x'.repeat(60), 'x'.repeat(61), ' ', 'Tab\there']) {
      const appen = normaliserNavn(raatekst)
      const godtatt = navnFeil(appen, 'Navnet') === null
      const { rows } = await db.query<{ ok: boolean }>('select intern.er_stillingsnavn($1) as ok', [appen])
      expect(rows[0]!.ok, JSON.stringify(raatekst)).toBe(godtatt)
    }
  })

  it('fjerner en stilling noen har bare med en erstatning, og gir den til alle', async () => {
    await medLista(async () => {
      const kjemiker = await stillingId('Kjemiker')
      const bioingenior = await stillingId('Bioingeniør')
      for (const p of ['vanligA', 'vanligB', 'adminA'] as const) {
        await kall('systemarkitekt', 'public.sett_stilling($1, $2)', [galleri.id[p], kjemiker])
      }
      expect(
        await kall<{ stilling_id: string; antall: number }[]>(
          'systemarkitekt',
          'array(select row_to_json(b) from public.stillingsbruk() b)',
        ),
      ).toEqual([{ stilling_id: kjemiker, antall: 3 }])
      const berorte = await kall<{ username: string; fagmiljoer: string[] }[]>(
        'systemarkitekt',
        'array(select row_to_json(b) from public.brukere_med_stilling($1) b)',
        [kjemiker],
      )
      expect(berorte).toHaveLength(3)
      expect(berorte.every((b) => b.fagmiljoer.length > 0)).toBe(true)

      const uten = await feilFra(() => kall('systemarkitekt', 'public.fjern_stilling($1)', [kjemiker]))
      expect(uten?.code).toBe('55000')
      expect(uten?.message).toBe('3 brukere har denne stillingen. Velg hvilken stilling de skal ha i stedet.')
      expect((await feilFra(() => kall('systemarkitekt', 'public.fjern_stilling($1, $1)', [kjemiker])))?.code).toBe(
        '22023',
      )

      expect(await kall('systemarkitekt', 'public.fjern_stilling($1, $2)', [kjemiker, bioingenior])).toBe(3)
      expect(await stillingTil('vanligB')).toBe('Bioingeniør')
      expect((await lista()).Laboratorieansatte).toEqual(['Bioingeniør', 'Overingeniør'])
    })
  })

  it('fjerner en stilling når de som hadde den, har fått en annen én og én', async () => {
    await medLista(async () => {
      const lis = await stillingId('LIS')
      await kall('systemarkitekt', 'public.sett_stilling($1, $2)', [galleri.id.vanligA, lis])
      await kall('systemarkitekt', 'public.sett_stilling($1, $2)', [galleri.id.vanligA, await stillingId('Overlege')])
      expect(await kall('systemarkitekt', 'public.fjern_stilling($1)', [lis])).toBe(0)
      expect((await lista()).Leger).toEqual(['Overlege'])
    })
  })

  it('lar ikke en stilling noen har, forsvinne utenom funksjonene', async () => {
    // Fremmednøkkelen stopper slettingen av en stilling noen har (on delete restrict).
    await medLista(async () => {
      const lis = await stillingId('LIS')
      await db.query('update public.profiles set stilling_id = $1 where id = $2', [lis, galleri.id.vanligA])
      expect((await feilFra(() => db.query('delete from public.stillinger where id = $1', [lis])))?.code).toBe('23001')
    })
  })
})
