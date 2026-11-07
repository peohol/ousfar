/**
 * Fagsidelesingen gir det samme etter at `stoffsider_som_json` sluttet å
 * bygge JSON for alle objektutgavene (20261106140000_stoffsider_som_json_nodvendige).
 *
 * Databasen bygges av migrasjonene før endringen og fylles med syntetiske
 * fagsider: publisert, endret igjen i utkastet, og med mange objektutgaver
 * lesingen ikke skal ta med (de andre sidene, elementene og referansene deres,
 * og referanser ingen siterer). Svarene fra `les_stoff` og `les_stoffer`
 * leses i begge tilstandene, som administrator og som vanlig bruker, før og
 * etter migrasjonen, og skal være like tegn for tegn. Rettighetene,
 * kommentarene og at funksjonene kjører som den som kaller dem, skal også stå.
 *
 * Navnene og tekstene er syntetiske. Ingen kliniske verdier inngår.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som } from './hjelp/testdatabase'
import { syntetiskeFagsiderSql } from './hjelp/syntetiskeFagsider'

const ENDRINGEN = migrasjonsfiler().find((f) => f.endsWith('_stoffsider_som_json_nodvendige.sql'))!
const TILSTANDER = ['publisert', 'utkast'] as const
const FORM = { sider: 6, elementerPerSide: 8, referanserPerSide: 5, uvedkommendeReferanser: 200, tekstlengde: 80 }

interface Svar {
  /** `les_stoff` per bruker, tilstand og nøkkel, som tekst. */
  stoff: Record<string, string | null>
  /** `les_stoffer` per bruker og tilstand, som tekst. */
  stoffer: Record<string, string>
  /** `stoffsider_som_json` for noen av sidene, ingen og en ukjent ID. */
  utvalg: Record<string, string>
}

let db: PGlite
let brukere: Record<'admin' | 'bruker', string>
let slugger: string[]
let for_: Svar
let etter: Svar

async function les<T>(bruker: string, sql: string, parametre: unknown[] = []): Promise<T[]> {
  return som(db, bruker, async (tx) => (await tx.query<T>(sql, parametre)).rows)
}

async function lesAlt(): Promise<Svar> {
  const svar: Svar = { stoff: {}, stoffer: {}, utvalg: {} }
  for (const [hvem, id] of Object.entries(brukere)) {
    for (const tilstand of TILSTANDER) {
      for (const slug of [...slugger, 'finnes-ikke']) {
        const [rad] = await les<{ j: string | null }>(id, 'select public.les_stoff($1, $2)::text as j', [slug, tilstand])
        svar.stoff[`${hvem}/${tilstand}/${slug}`] = rad!.j
      }
      const [alle] = await les<{ j: string }>(id, 'select public.les_stoffer($1)::text as j', [tilstand])
      svar.stoffer[`${hvem}/${tilstand}`] = alle!.j
      const utvalg = await les<{ navn: string; j: string }>(
        id,
        `select x.navn, public.stoffsider_som_json(x.ider, $1)::text as j
         from (
           select 'to sider' as navn, (select array_agg(objekt_id order by slug) from public.infosider where tilstand = $1 and slug = any ($2)) as ider
           union all select 'ingen', '{}'::uuid[]
           union all select 'ukjent', array[gen_random_uuid()]
         ) x`,
        [tilstand, slugger.slice(1, 3)],
      )
      for (const { navn, j } of utvalg) svar.utvalg[`${hvem}/${tilstand}/${navn}`] = j
    }
  }
  return svar
}

/** Det som skal stå ved funksjonene: rettighetene, kommentaren, innstillingene og at de kjører som den som kaller dem. */
async function funksjonsfakta() {
  const { rows } = await db.query<Record<string, unknown>>(
    `select p.oid::regprocedure::text as funksjon, p.prosecdef, p.provolatile, p.proacl::text as acl, p.proconfig,
            obj_description(p.oid, 'pg_proc') as kommentar
     from pg_proc p
     where p.oid in (
       'public.stoffsider_som_json(uuid[], public.objekttilstand)'::regprocedure,
       'public.les_stoff(text, public.objekttilstand)'::regprocedure,
       'public.les_stoffer(public.objekttilstand)'::regprocedure
     )
     order by 1`,
  )
  expect(rows).toHaveLength(3)
  return rows
}

beforeAll(async () => {
  db = await nyDatabase({ til: ENDRINGEN })
  brukere = {
    admin: await opprettBruker(db, { brukernavn: 'redaktor', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin' }),
    bruker: await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' }),
  }
  await som(db, brukere.admin, (tx) => tx.exec(syntetiskeFagsiderSql(FORM)))
  slugger = (await db.query<{ slug: string }>(`select slug from public.infosider where tilstand = 'utkast' order by slug`)).rows.map(
    (r) => r.slug,
  )
  const fakta = await funksjonsfakta()
  for_ = await lesAlt()
  await kjorMigrasjoner(db, { bare: [ENDRINGEN] })
  expect(await funksjonsfakta()).toEqual(fakta)
  etter = await lesAlt()
}, 180_000)

describe('stoffsider_som_json etter at den bare bygger det som trengs', () => {
  it('har syntetiske sider med mye annet innhold i databasen', async () => {
    expect(slugger).toHaveLength(FORM.sider)
    const [n] = (
      await db.query<{ utgaver: number; utkast: number }>(
        `select count(*) filter (where tilstand = 'publisert')::int as utgaver, count(*) filter (where tilstand = 'utkast')::int as utkast
         from public.objekttilstander`,
      )
    ).rows
    // Én side med elementer og referanser er en liten del av utgavene.
    const perSide = 1 + FORM.elementerPerSide + FORM.referanserPerSide
    expect(n!.utgaver).toBeGreaterThan(10 * perSide)
    expect(n!.utkast).toBeGreaterThan(n!.utgaver)
  })

  it('gir les_stoff det samme som før, tegn for tegn, i begge tilstandene', () => {
    expect(Object.keys(etter.stoff)).toEqual(Object.keys(for_.stoff))
    for (const [nokkel, svar] of Object.entries(for_.stoff)) expect(etter.stoff[nokkel], nokkel).toBe(svar)
  })

  it('gir les_stoffer det samme som før, tegn for tegn, i begge tilstandene', () => {
    for (const [nokkel, svar] of Object.entries(for_.stoffer)) expect(etter.stoffer[nokkel], nokkel).toBe(svar)
  })

  it('gir det samme for et utvalg av sider, for ingen sider og for en ukjent ID', () => {
    expect(Object.keys(etter.utvalg)).toHaveLength(2 * TILSTANDER.length * 3)
    for (const [nokkel, svar] of Object.entries(for_.utvalg)) expect(etter.utvalg[nokkel], nokkel).toBe(svar)
    expect(JSON.parse(etter.utvalg['admin/utkast/ingen']!)).toEqual({ sider: [], referanser: [] })
    expect(JSON.parse(etter.utvalg['admin/utkast/ukjent']!)).toEqual({ sider: [], referanser: [] })
    expect(JSON.parse(etter.utvalg['admin/utkast/to sider']!).sider).toHaveLength(2)
  })

  it('gir hele sider med elementene og bare referansene sidene siterer', () => {
    const alle = JSON.parse(etter.stoffer['admin/utkast']!) as {
      sider: { stoff: { slug: string }; elementer: unknown[]; referanser: string[] }[]
      referanser: { id: string }[]
    }
    expect(alle.sider).toHaveLength(FORM.sider)
    for (const side of alle.sider) expect(side.elementer.length, side.stoff.slug).toBeGreaterThanOrEqual(FORM.elementerPerSide)
    const sitert = new Set(alle.sider.flatMap((s) => s.referanser))
    expect(alle.referanser.map((r) => r.id).sort()).toEqual([...sitert].sort())

    const en = JSON.parse(etter.stoff[`admin/utkast/${slugger[0]}`]!) as { elementer: unknown[]; referanser: { id: string }[] }
    expect(en.elementer.length).toBeGreaterThanOrEqual(FORM.elementerPerSide)
    expect(en.referanser.length).toBeGreaterThan(0)
    expect(en.referanser.length).toBeLessThanOrEqual(FORM.referanserPerSide + 1)
  })

  it('skiller utkastet fra det publiserte, og gir en vanlig bruker bare det publiserte', () => {
    expect(etter.stoffer['admin/utkast']).not.toBe(etter.stoffer['admin/publisert'])
    expect(etter.stoffer['bruker/publisert']).toBe(etter.stoffer['admin/publisert'])
    expect(JSON.parse(etter.stoffer['bruker/utkast']!)).toEqual({ sider: [], referanser: [] })
    for (const slug of slugger) {
      expect(etter.stoff[`bruker/utkast/${slug}`], slug).toBeNull()
      expect(etter.stoff[`bruker/publisert/${slug}`], slug).toBe(etter.stoff[`admin/publisert/${slug}`])
    }
    expect(etter.stoff['admin/utkast/finnes-ikke']).toBeNull()
  })
})
