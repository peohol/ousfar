/**
 * Profilkortet ved hovering (`supabase/migrations/20261119131000_profilkort.sql`,
 * docs/fagmiljoer.md «Profilkortet»): `public.profilkortdetaljer` gir
 * stillingen, fagmiljøene og chatknappen bare for profiler den innloggede ser,
 * og chatknappen bare når det kan sendes direktemeldinger til personen, med
 * samme svar uansett grunn. Til slutt hele veien fra stillingen i databasen
 * til teksten på kortet, med appens eget kall. Alt er syntetisk.
 */
import type { PGlite } from '@electric-sql/pglite'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { lesProfilkortdetaljer, type Profilkortdetaljer } from '../profilkort/modell'
import { byggPersongalleri, harTilgang, PERSONER, serProfilkortet, type Person, type Persongalleri } from './hjelp/persongalleri'
import { feilFra, nyDatabase, som } from './hjelp/testdatabase'

let basis: PGlite
let db: PGlite
let galleri: Persongalleri

const PERSONLISTE = Object.keys(PERSONER) as Person[]
const id = (p: Person) => galleri.id[p]
const INGEN = '00000000-0000-4000-8000-00000000dead'
const A = 'OUS Klinisk farmakologi'
const B = 'OUS Rettstoksikologi'

/** Den innloggede i appens kall (`klient().rpc`), som går til testdatabasen. */
const app = vi.hoisted(() => ({ innlogget: '' }))
vi.mock('../auth/klient', () => ({
  klient: () => ({
    rpc: async (navn: string, args: Record<string, unknown>) => {
      try {
        const verdier = Object.values(args)
        const plasser = verdier.map((_, i) => '$' + (i + 1)).join(', ')
        const svar = await som(db, app.innlogget, (tx) => tx.query<{ svar: unknown }>(`select public.${navn}(${plasser}) as svar`, verdier))
        return { data: svar.rows[0]!.svar, error: null }
      } catch (error) {
        return { data: null, error }
      }
    },
  }),
}))

const SLA_AV = `create or replace function intern.direktemeldinger_aktivert() returns boolean language sql stable set search_path = '' as 'select false'`

const verdi = async <T>(person: Person, sql: string, parametre: unknown[] = []): Promise<T> =>
  som(db, id(person), async (tx) => Object.values((await tx.query<Record<string, T>>(sql, parametre)).rows[0]!)[0] as T)

const detaljer = async (seer: Person, bruker: Person | string): Promise<Profilkortdetaljer | null> =>
  lesProfilkortdetaljer(
    await verdi(seer, 'select public.profilkortdetaljer($1)', [bruker in galleri.id ? id(bruker as Person) : bruker]),
  )

const kanChatte = async (seer: Person, bruker: Person) => (await detaljer(seer, bruker))?.kan_chatte

const settValg = (p: Person, tillat: boolean) => verdi(p, 'select public.sett_chatvalg($1, null)', [tillat])

beforeAll(async () => {
  basis = await nyDatabase()
  galleri = await byggPersongalleri(basis)
}, 180_000)

afterAll(async () => {
  await basis.close()
})

beforeEach(async () => {
  db = (await basis.clone()) as PGlite
})

describe('hvem som får svar', () => {
  it('følger regelen for profilkortet for hvert par i persongalleriet', async () => {
    for (const seer of PERSONLISTE.filter(harTilgang)) {
      for (const bruker of PERSONLISTE) {
        expect((await detaljer(seer, bruker)) !== null, `${seer} → ${bruker}`).toBe(serProfilkortet(seer, bruker))
      }
    }
  })

  it('stopper den som ikke har aktivt medlemskap', async () => {
    const feil = await feilFra(() => detaljer('utenMedlemskap', 'vanligA'))
    expect(feil?.code).toBe('42501')
  })

  it('svarer likt for en konto som ikke finnes, ingen ID og en profil man ikke ser', async () => {
    expect(await detaljer('vanligA', INGEN)).toBeNull()
    expect(await verdi('vanligA', 'select public.profilkortdetaljer(null)')).toBeNull()
    expect(await detaljer('vanligA', 'vanligB')).toBeNull()
  })

  it('gir svar for den andre i en direktesamtale, også i et annet fagmiljø', async () => {
    await settValg('vanligA', true)
    await settValg('vanligB', true)
    await verdi('vanligA', 'select public.aapne_direktesamtale($1)', [id('vanligB')])
    expect(await detaljer('vanligA', 'vanligB')).toEqual({ id: id('vanligB'), stilling: null, fagmiljoer: [B], kan_chatte: true })
    expect((await detaljer('vanligB', 'vanligA'))?.fagmiljoer).toEqual([A])
  })
})

describe('fagmiljøene', () => {
  it('er de aktive medlemskapene, primærfagmiljøet først', async () => {
    expect((await detaljer('vanligA', 'dobbeltAB'))?.fagmiljoer).toEqual([A, B])
    expect((await detaljer('vanligB', 'dobbeltAB'))?.fagmiljoer).toEqual([A, B])
    // Medlemskapet i A er avsluttet, og står ikke lenger.
    expect((await detaljer('vanligB', 'avsluttetA'))?.fagmiljoer).toEqual([B])
    expect((await detaljer('systemarkitekt', 'utenMedlemskap'))?.fagmiljoer).toEqual([])
  })
})

/** En stilling fra lista slik databasen har den, så testene ikke binder seg til navnene Peder ga. */
async function enStilling(): Promise<{ id: string; navn: string; kategori: string }> {
  const { rows } = await db.query<{ id: string; navn: string; kategori: string }>(
    `select s.id, s.navn, s.kategori_id as kategori
     from public.stillinger s join public.stillingskategorier k on k.id = s.kategori_id
     order by k.rekkefolge, s.rekkefolge limit 1`,
  )
  return rows[0]!
}

const settStilling = (aktor: Person, bruker: Person, stilling: string | null) =>
  verdi(aktor, 'select public.sett_stilling($1, $2)', [id(bruker), stilling])

describe('stillingen', () => {
  it('er navnet på stillingen personen har valgt, og null uten', async () => {
    expect((await detaljer('dobbeltAB', 'vanligA'))?.stilling).toBeNull()
    const stilling = await enStilling()
    await settStilling('vanligA', 'vanligA', stilling.id)
    expect((await detaljer('dobbeltAB', 'vanligA'))?.stilling).toBe(stilling.navn)
    expect((await detaljer('systemarkitekt', 'vanligA'))?.stilling).toBe(stilling.navn)
    await settStilling('vanligA', 'vanligA', null)
    expect((await detaljer('dobbeltAB', 'vanligA'))?.stilling).toBeNull()
  })

  it('følger navnet i lista når systemarkitekten endrer det', async () => {
    const stilling = await enStilling()
    await settStilling('vanligA', 'vanligA', stilling.id)
    const nytt = `${stilling.navn} syntetisk`
    await verdi('systemarkitekt', 'select public.lagre_stilling($1, $2, $3)', [stilling.id, stilling.kategori, nytt])
    expect((await detaljer('dobbeltAB', 'vanligA'))?.stilling).toBe(nytt)
  })

  it('gis ikke til den som ikke ser profilen', async () => {
    await settStilling('vanligB', 'vanligB', (await enStilling()).id)
    expect(await detaljer('vanligA', 'vanligB')).toBeNull()
  })
})

describe('chatknappen', () => {
  it('står av når direktemeldingene ikke er slått på i OUSFAR', async () => {
    await settValg('dobbeltAB', true)
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(true)
    await db.exec(SLA_AV)
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(false)
  })

  it('følger personens egen bryter, ikke den innloggedes', async () => {
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(false)
    await settValg('dobbeltAB', true)
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(true)
    await settValg('vanligA', true)
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(true)
    await settValg('dobbeltAB', false)
    expect(await kanChatte('vanligA', 'dobbeltAB')).toBe(false)
  })

  it('står av begge veier ved en blokkering, med samme svar for den blokkerte som for en som har slått av', async () => {
    await settValg('vanligA', true)
    await settValg('dobbeltAB', true)
    await verdi('vanligA', 'select public.aapne_direktesamtale($1)', [id('dobbeltAB')])
    await verdi('dobbeltAB', 'select public.blokker_bruker($1)', [id('vanligA')])
    expect(await detaljer('vanligA', 'dobbeltAB')).toEqual({ id: id('dobbeltAB'), stilling: null, fagmiljoer: [A, B], kan_chatte: false })
    expect(await kanChatte('dobbeltAB', 'vanligA')).toBe(false)
  })

  it('står av for en som har mistet tilgangen, og for en selv', async () => {
    await settValg('systemarkitekt', true)
    await settValg('vanligA', true)
    expect(await kanChatte('systemarkitekt', 'utenMedlemskap')).toBe(false)
    expect(await kanChatte('vanligA', 'vanligA')).toBe(false)
    expect(await kanChatte('systemarkitekt', 'vanligA')).toBe(true)
  })
})

describe('hele veien til kortet', () => {
  /** Kortet slik appen tegner det, med svaret appen selv henter fra databasen som `seer`. */
  async function kortet(seer: Person, bruker: Person): Promise<string> {
    const { hentProfilkortdetaljer, glemProfilkortene } = await import('../profilkort/api')
    const { Profilkortinnhold } = await import('../components/profilkort/Profilkort')
    glemProfilkortene()
    app.innlogget = id(seer)
    const detaljer = await hentProfilkortdetaljer(id(bruker))
    const { rows } = await db.query<{ id: string; username: string; first_name: string; last_name: string; avatar_path: string | null }>(
      'select id, username, first_name, last_name, avatar_path from public.profiles where id = $1',
      [id(bruker)],
    )
    return renderToStaticMarkup(
      createElement(Profilkortinnhold, { person: rows[0]!, lenke: null, tilstand: { status: 'klar', detaljer }, onApnet: () => {} }),
    )
  }

  const stillingPaKortet = (html: string) => /class="profilkort__stilling">([^<]*)</.exec(html)?.[1] ?? null

  it('viser stillingen fra databasen på kortet, og ingen stilling for den som står uten', async () => {
    expect(stillingPaKortet(await kortet('dobbeltAB', 'vanligA'))).toBeNull()
    const stilling = await enStilling()
    await settStilling('vanligA', 'vanligA', stilling.id)
    const html = await kortet('dobbeltAB', 'vanligA')
    expect(stillingPaKortet(html)).toBe(stilling.navn)
    expect(html).toContain(A)
    // Den som ikke ser profilen, får bare navnet og bildet.
    await settStilling('vanligB', 'vanligB', stilling.id)
    expect(stillingPaKortet(await kortet('vanligA', 'vanligB'))).toBeNull()
  })
})
