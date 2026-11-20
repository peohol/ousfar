/**
 * Personsøket i databasen (docs/fagmiljoer.md, «Personsøket»): den felles
 * sammenligningen, og hvem søkene etter gruppekandidater og
 * medlemskandidater kan finne. Søket etter mottakere av direktemeldinger
 * prøves i `direktemeldinger.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lesPersontreff } from '../personsok/modell'
import { byggPersongalleri, type Fagmiljo, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'

let db: PGlite
let galleri: Persongalleri
let gruppeA: string

const id = (p: Person) => galleri.id[p]
const fm = (f: Fagmiljo) => galleri.fagmiljo[f]

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = []): Promise<T> =>
  som(db, id(person), async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0]!)[0] as T)

const feil = async (arbeid: () => Promise<unknown>) => {
  const f = await feilFra(arbeid)
  return f ? { kode: f.code, melding: f.message } : null
}

const gruppekandidater = async (p: Person, sok: string, gruppe = gruppeA) =>
  lesPersontreff(await verdi(p, 'select public.sok_gruppekandidater($1, $2)', [gruppe, sok]))
const medlemskandidater = async (p: Person, sok: string, f: Fagmiljo = 'A') =>
  lesPersontreff(await verdi(p, 'select public.sok_medlemskandidater($1, $2)', [fm(f), sok]))

/** Brukernavnene i treffene, i rekkefølgen de kom. */
const navn = (treff: { username: string }[]) => treff.map((t) => t.username)

/** Poengene for et søk mot et navn, rett fra sammenligningen. */
const poeng = async (sok: string, fornavn: string, etternavn: string, brukernavn: string) =>
  (
    await db.query<{ p: number | null }>(
      'select intern.personsokpoeng(intern.personsokord($1), intern.personsokdeler($2, $3, $4)) as p',
      [sok, fornavn, etternavn, brukernavn],
    )
  ).rows[0]!.p

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  // To med navn som ligner, i A (standardfagmiljøet nye kontoer får).
  for (const [brukernavn, fornavn, etternavn] of [
    ['kari.n', 'Kari', 'Nordmann'],
    ['karl.h', 'Karl', 'Hanssen'],
  ] as const) {
    await opprettBruker(db, { brukernavn, fornavn, etternavn, rolle: 'user' })
  }
  gruppeA = await verdi<string>('adminA', 'select public.opprett_gruppe($1, $2, $3)', ['Litiumgruppen', 'Syntetisk', fm('A')])
}, 180_000)

afterAll(async () => {
  await db.close()
})

describe('sammenligningen', () => {
  it('finner hele ord, starten av et ord og tekst inne i et, best først', async () => {
    expect(await poeng('kari', 'Kari', 'Nordmann', 'kari.n')).toBe(4)
    expect(await poeng('nord', 'Kari', 'Nordmann', 'kari.n')).toBe(3)
    expect(await poeng('mann', 'Kari', 'Nordmann', 'kari.n')).toBe(2)
    expect(await poeng('kari nord', 'Kari', 'Nordmann', 'kari.n')).toBe(7)
    // Brukernavnet, helt og i bolker.
    expect(await poeng('kari.n', 'Kari', 'Nordmann', 'kari.n')).toBe(4)
    expect(await poeng('kari.', 'Kari', 'Nordmann', 'kari.n')).toBe(3)
  })

  it('ser bort fra store bokstaver og aksenter, og leser æ, ø og å som a, o og a', async () => {
    expect(await poeng('BJORN', 'Bjørn', 'Ås', 'bjorn.a')).toBe(4)
    expect(await poeng('as', 'Bjørn', 'ÅS', 'bjorn.a')).toBe(4)
    expect(await poeng('rene', 'René', 'Müller', 'rene.m')).toBe(4)
    expect(await poeng('muller', 'René', 'Müller', 'rene.m')).toBe(4)
  })

  it('tåler en skrivefeil, men bare når ordet har minst fire tegn', async () => {
    expect(await poeng('hansen', 'Karl', 'Hanssen', 'karl.h')).toBe(1)
    expect(await poeng('nordman', 'Kari', 'Nordmann', 'kari.n')).toBe(3)
    expect(await poeng('normdann', 'Kari', 'Nordmann', 'kari.n')).toBe(1)
    expect(await poeng('karl', 'Kari', 'Nordmann', 'kari.n')).toBe(1)
    expect(await poeng('kar', 'Kari', 'Nordmann', 'kari.n')).toBe(3)
    expect(await poeng('ola', 'Ole', 'Hansen', 'ole.h')).toBeNull()
    expect(await poeng('xyzw', 'Kari', 'Nordmann', 'kari.n')).toBeNull()
  })

  // Triplene i en del slås opp i den (20261120090000) i stedet for å regnes
  // ut: poengene skal være de samme som med den første definisjonen.
  it('gir de samme poengene som når triplene i delen regnes ut', async () => {
    const ord = ['hansen', 'hanssen', 'nordman', 'normdann', 'karl', 'kari', 'mann', 'ole', 'an', 'xyzw', 'bjorn', 'aas', 'sen', 'jo', 'kari.n', 'olsen', 'nils']
    const deler = ['hanssen', 'hansen', 'nordmann', 'kari', 'karl', 'kari.n', 'ole', 'olsen', 'bjorn', 'as', 'aase', 'johansen', 'nilsen', 'jonas', 'n']
    const { rows } = await db.query<{ o: string; d: string; ny: number | null; gammel: number | null }>(
      `select o, d, intern.personsokpoeng(array[o], array[d]) as ny,
         case
           when d = o then 4
           when starts_with(d, o) then 3
           when strpos(d, o) > 0 then 2
           when char_length(o) >= 4
             and 2 * (select count(*) from unnest(intern.personsoktripler(o)) t where t = any(intern.personsoktripler(d)))
               >= cardinality(intern.personsoktripler(o))
           then 1
         end as gammel
       from unnest($1::text[]) o, unnest($2::text[]) d`,
      [ord, deler],
    )
    expect(rows).toHaveLength(ord.length * deler.length)
    expect(rows.filter((r) => r.ny !== r.gammel)).toEqual([])
    expect(rows.some((r) => r.ny === 1)).toBe(true)
  })

  it('krever at hvert ord i søket står i navnet', async () => {
    expect(await poeng('kari hansen', 'Kari', 'Nordmann', 'kari.n')).toBeNull()
  })

  it('krever minst to tegn, og leser bare de fem første ordene', async () => {
    expect(await feil(() => db.query(`select intern.personsokord(' k ')`))).toEqual({ kode: '22023', melding: 'Skriv minst to tegn.' })
    expect(await feil(() => db.query(`select intern.personsokord(null)`))).toEqual({ kode: '22023', melding: 'Skriv minst to tegn.' })
    const { rows } = await db.query<{ o: string[] }>(`select intern.personsokord('a b c d e f g Kari kari') as o`)
    expect(rows[0]!.o).toEqual(['a', 'b', 'c', 'd', 'e'])
    expect((await db.query<{ o: string[] }>(`select intern.personsokord('Kari  KARI nord') as o`)).rows[0]!.o).toEqual(['kari', 'nord'])
  })
})

describe('kandidatene til en gruppe', () => {
  it('gir dem den som styrer ser, som kan være med og ikke er med, med bilde, stilling og fagmiljø', async () => {
    const treff = await gruppekandidater('adminA', 'kari')
    expect(navn(treff)).toEqual(['kari.n', 'karl.h'])
    expect(treff[0]).toMatchObject({ first_name: 'Kari', last_name: 'Nordmann', avatar_path: null, stilling: null, fagmiljo: 'OUS Klinisk farmakologi' })
    // B-medlemmer kan ikke være med i en gruppe i A, og adminA selv er med.
    const alle = navn(await gruppekandidater('adminA', 'test'))
    expect(alle).toContain('test.vanliga')
    expect(alle).not.toContain('test.admina')
    expect(alle).not.toContain('test.vanligb')
    expect(alle).not.toContain('test.adminb')
    expect(alle).not.toContain('test.utenmedlemskap')
  })

  it('tar ikke med den som alt er invitert', async () => {
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [gruppeA, 'karl.h'])
    expect(navn(await gruppekandidater('adminA', 'kar'))).toEqual(['kari.n'])
  })

  it('gir de samme avslagene som invitasjonen', async () => {
    expect(await feil(() => gruppekandidater('vanligB', 'kari'))).toEqual({
      kode: '42501',
      melding: 'Gruppen finnes ikke, eller du har ikke tilgang til den.',
    })
    // Et vanlig medlem som ikke styrer gruppen.
    await verdi('adminA', 'select public.inviter_til_gruppe($1, $2)', [gruppeA, 'test.vanliga'])
    await verdi('vanligA', 'select public.svar_paa_gruppeinvitasjon($1, true)', [gruppeA])
    expect(await feil(() => gruppekandidater('vanligA', 'kari'))).toEqual({ kode: '42501', melding: 'Bare de ansvarlige i gruppen kan gjøre dette.' })
    expect(await feil(() => gruppekandidater('utenMedlemskap', 'kari'))).toMatchObject({ kode: '42501' })
    expect(await feil(() => gruppekandidater('adminA', 'k'))).toEqual({ kode: '22023', melding: 'Skriv minst to tegn.' })
  })
})

describe('kandidatene til et fagmiljø', () => {
  it('gir en lokal administrator bare dem hen alt ser, og ingen som er aktive medlemmer der', async () => {
    // adminA ser bare medlemmene i A, som alt er med.
    expect(await medlemskandidater('adminA', 'test')).toEqual([])
    // Systemarkitekten ser alle, og finner dem i B som ikke er i A.
    const treff = navn(await medlemskandidater('systemarkitekt', 'test'))
    expect(treff).toContain('test.vanligb')
    expect(treff).toContain('test.adminb')
    expect(treff).not.toContain('test.vanliga')
    expect(treff).not.toContain('test.systemarkitekt')
  })

  it('tilbyr bare dem medlemskapet kan gis til: ingen administratorer eller systemarkitekter for en lokal administrator', async () => {
    // adminA ser adminB, vanligB og arkitektB gjennom en gruppe på tvers.
    const tvers = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, $3)', ['Tvers', 'Syntetisk', null])
    for (const p of ['adminA', 'adminB', 'vanligB', 'arkitektB'] as const) {
      await verdi('systemarkitekt', 'select public.inviter_til_gruppe($1, $2)', [tvers, `test.${p.toLowerCase()}`])
      await verdi(p, 'select public.svar_paa_gruppeinvitasjon($1, true)', [tvers])
    }
    const treff = navn(await medlemskandidater('adminA', 'test'))
    expect(treff).toContain('test.vanligb')
    expect(treff).not.toContain('test.adminb')
    expect(treff).not.toContain('test.arkitektb')
    // Det samme som handlingen selv sier.
    expect(await feil(() => verdi('adminA', 'select public.legg_til_medlem($1, $2)', ['test.adminb', fm('A')]))).toMatchObject({ kode: '42501' })
  })

  it('gir de samme avslagene som når et medlem legges til', async () => {
    expect(await feil(() => medlemskandidater('vanligA', 'kari'))).toEqual({
      kode: '42501',
      melding: 'Du administrerer ikke OUS Klinisk farmakologi.',
    })
    expect(await feil(() => medlemskandidater('adminA', 'kari', 'B'))).toEqual({
      kode: '42501',
      melding: 'Du administrerer ikke OUS Rettstoksikologi.',
    })
    expect(
      await feil(() => verdi('systemarkitekt', 'select public.sok_medlemskandidater($1, $2)', ['00000000-0000-4000-8000-00000000dead', 'kari'])),
    ).toEqual({ kode: 'P0002', melding: 'Ukjent fagmiljø.' })
  })
})

// Søkene sammenligner først og avgjør så hvem som kan velges, i rangert
// rekkefølge (20261120090000): treffene skal være de 20 beste av dem som kan
// velges, ikke de 20 beste av alle som passer.
describe('de 20 beste av dem som kan velges', () => {
  let gruppe: string

  beforeAll(async () => {
    // «Aaron» kommer før «Bea» i rekkefølgen, men uten tilgang kan ingen av
    // dem være med i en gruppe. Systemarkitekten ser dem likevel.
    for (let i = 1; i <= 22; i++) {
      const nr = String(i).padStart(2, '0')
      const aaron = await opprettBruker(db, { brukernavn: `topp.a${nr}`, fornavn: 'Aaron', etternavn: 'Toppesen', rolle: 'user' })
      await db.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1 and status = 'aktiv'`, [aaron])
      if (i <= 21) await opprettBruker(db, { brukernavn: `topp.b${nr}`, fornavn: 'Bea', etternavn: 'Toppesen', rolle: 'user' })
    }
    gruppe = await verdi<string>('systemarkitekt', 'select public.opprett_gruppe($1, $2, $3)', ['Toppgruppen', 'Syntetisk', fm('A')])
  }, 180_000)

  it('hopper over dem som passer best, men ikke kan velges', async () => {
    const treff = navn(await gruppekandidater('systemarkitekt', 'toppesen', gruppe))
    expect(treff).toEqual(Array.from({ length: 20 }, (_, i) => `topp.b${String(i + 1).padStart(2, '0')}`))
    expect(navn(await gruppekandidater('systemarkitekt', 'aaron toppesen', gruppe))).toEqual([])
  })

  it('gir alle som kan velges når de er færre enn 20', async () => {
    await verdi('systemarkitekt', 'select public.inviter_til_gruppe($1, $2)', [gruppe, 'topp.b01'])
    await verdi('systemarkitekt', 'select public.inviter_til_gruppe($1, $2)', [gruppe, 'topp.b02'])
    const treff = navn(await gruppekandidater('systemarkitekt', 'bea toppesen', gruppe))
    expect(treff).toEqual(Array.from({ length: 19 }, (_, i) => `topp.b${String(i + 3).padStart(2, '0')}`))
  })
})
