/**
 * P2 i `docs/verktøy-utviklingsplan.md` i databasen: migrasjonene som lager
 * fagsidene virkestoffene i kartleggingen manglet (`verktoy_fagsider`) og
 * kobler dem til FEST (`verktoy_fest_kobling`). At sidene blir publisert uten
 * faginnhold og ikke kuratert, med bare kartleggingens moderstoffer, i
 * kategorien sin i stoffregisteret; at de aldri lager en side som finnes fra
 * før eller er slettet for godt; at alt som fantes, står urørt; og at de ikke
 * gjør noe når de kjøres igjen. FEST-radene er syntetiske, med ID-ene og
 * navnene fra FEST.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { stoffslug } from '../domain/stoffregister'
import { erklaringsfeil } from '../faginnhold/endringserklaering'
import { FAGSIDEIMPORTER, nyeFagsiderSql } from '../faginnhold/nyefagsider'
import { lagFaginnholdsleser, type Faginnholdsleser } from '../faginnhold/lesing'
import { ELEMENTTYPER, lesLegemiddelkobling } from '../faginnhold/paneler'
import { byggSidemodell, harFaginnhold } from '../faginnhold/stoffside'
import { PREPARATPANEL } from '../legemiddeldata/stoffside'
import { lesKartdata } from '../verktoy/kartdata'
import { VERKTOY_FAGSIDEKILDE, VERKTOY_FAGSIDER, VERKTOY_FESTKOBLINGER, VERKTOY_KATEGORIER } from '../verktoy/fagsider'
import { faginnholdskall, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJONER = migrasjonsfiler()
const migrasjonsfil = (navn: string) => MIGRASJONER.find((f) => f.endsWith(`_${navn}.sql`))!
const SIDER = migrasjonsfil('verktoy_fagsider')
const KOBLING = migrasjonsfil('verktoy_fest_kobling')
const tekst = (fil: string) => readFileSync(new URL(`../../supabase/migrations/${fil}`, import.meta.url), 'utf8')

const DATA = lesKartdata()
const FESTNAVN = new Map(DATA.fest.virkestoffer.map((f) => [f.id, f.navn!]))
const NOKLER = Object.keys(VERKTOY_KATEGORIER)
/** Har en upublisert side fra før: den skal ikke få en til. */
const FINNES = 'trazodon'
/** Er slettet for godt: den skal ikke komme tilbake. */
const SLETTET = 'pimozid'
const NYE = NOKLER.filter((n) => n !== FINNES && n !== SLETTET)
const navnFor = (nokkel: string) => VERKTOY_FAGSIDER.find((s) => stoffslug(s.navn) === nokkel)!.navn

describe('migrasjonene', () => {
  it('er de samme som sidene og koblingene gir, og oppgir agenten', () => {
    const [import_] = FAGSIDEIMPORTER
    expect(import_!.migrasjon).toBe('verktoy_fagsider')
    expect(tekst(SIDER).replace(/^select intern\.endring_start\(.*\);\n/m, '')).toBe(nyeFagsiderSql(VERKTOY_FAGSIDER, 'peohol', VERKTOY_FAGSIDEKILDE))
    for (const fil of [SIDER, KOBLING]) expect(erklaringsfeil(fil, tekst(fil)), fil).toEqual([])
    expect(SIDER < KOBLING).toBe(true)
  })
})

describe('i databasen', () => {
  let db: PGlite
  let kall: Faginnholdskall
  let leser: Faginnholdsleser
  let bruker: string
  let gammel: string
  let foran: { revisjoner: string[]; tilstander: string[]; plasseringer: string[] }

  const rader = async (sql: string) => (await db.query<{ r: string }>(sql)).rows.map((x) => x.r)
  const bilde = async () => ({
    revisjoner: await rader("select o.objekt_id || '/' || o.revisjon || '/' || o.innhold::text as r from public.objektrevisjoner o order by 1"),
    tilstander: await rader("select t.objekt_id || '/' || t.tilstand || '/' || t.revisjon as r from public.objekttilstander t order by 1"),
    plasseringer: await rader("select p.stoff || '/' || p.kategori_id as r from public.stoffplasseringer p order by 1"),
  })
  const antall = async (sql: string) => (await db.query<{ n: number }>(sql)).rows[0]!.n

  beforeAll(async () => {
    db = await nyDatabase({ til: SIDER })
    const admin = await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin' })
    bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
    kall = faginnholdskall(db, admin)
    leser = lagFaginnholdsleser(kall.klientFor(bruker))

    // En side med innhold som skal stå urørt, en upublisert side for et av
    // virkestoffene, og et virkestoff som er slettet for godt.
    const side = await kall.opprett('infoside', { navn: 'Haloperidol' })
    await kall.publiser(side.id, 1)
    gammel = side.id
    const kort = await kall.opprett('innholdselement', {
      infoside: side.id,
      panel: 'dosering',
      posisjon: 0,
      elementtype: 'riktekst',
      data: { dokument: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Syntetisk tekst' }] }] } },
      referanser: [],
    })
    await kall.publiser(kort.id, 1)
    await kall.opprett('infoside', { navn: navnFor(FINNES) })
    await db.query("insert into public.stoffstatus (stoff, status, endret_av) values ($1, 'fjernet', $2)", [SLETTET, admin])

    const synk = (
      await db.query<{ id: number }>(
        "insert into legemiddeldata.synkroniseringer (kilde, status, avsluttet_kl) values ('FEST', 'fullfort', now()) returning id",
      )
    ).rows[0]!.id
    for (const { fest_id } of VERKTOY_FESTKOBLINGER) {
      await db.query(
        `insert into legemiddeldata.virkestoff (fest_id, data, hash, forst_sett_kl, sist_endret_kl, sist_sett_synk)
         values ($1, $2, 'x', now(), now(), $3)`,
        [fest_id, { navn: FESTNAVN.get(fest_id), salter: [] }, synk],
      )
    }
    foran = await bilde()
    // Bare disse to: senere fagsideimporter lager sider for andre stoffer.
    await kjorMigrasjoner(db, { bare: [SIDER, KOBLING] })
  }, 240_000)

  it('lager hver side publisert, med kartleggingens navn og nøkkel og ingenting annet', async () => {
    for (const nokkel of NYE) {
      const sider = await kall.fasit<{ tilstand: string; navn: string; slug: string }>(
        'select tilstand, navn, slug from public.infosider where slug = $1 order by tilstand::text',
        [nokkel],
      )
      expect(sider, nokkel).toEqual([
        { tilstand: 'publisert', navn: navnFor(nokkel), slug: nokkel },
        { tilstand: 'utkast', navn: navnFor(nokkel), slug: nokkel },
      ])
      const side = await leser.lesStoffside(nokkel, 'publisert')
      expect(side.infoside?.innhold, nokkel).toEqual({ navn: navnFor(nokkel) })
      expect(side.stoff, nokkel).toMatchObject({ slug: nokkel, navn: navnFor(nokkel) })
      expect(side.infoside?.kilde, nokkel).toBe(VERKTOY_FAGSIDEKILDE)
    }
  })

  it('kobler hver side til kartleggingens moderstoff i FEST, og gir den ikke noe faginnhold', async () => {
    for (const nokkel of NYE) {
      const side = await leser.lesStoffside(nokkel, 'publisert')
      expect(side.elementer.map((e) => [e.innhold.panel, e.innhold.elementtype]), nokkel).toEqual([[PREPARATPANEL, ELEMENTTYPER.legemiddelkobling]])
      const ider = DATA.kartlegging.virkestoffer.find((v) => v.nokkel === nokkel)!.fest
      expect(lesLegemiddelkobling(side.elementer[0]!.innhold.data), nokkel).toEqual({
        virkestoff: ider.map((fest_id) => ({ fest_id, navn: FESTNAVN.get(fest_id) })),
      })
      expect(side.referanser, nokkel).toEqual([])
      expect(harFaginnhold(byggSidemodell(side)), nokkel).toBe(false)
    }
  })

  it('er ikke kuratert', async () => {
    const kurateringer = await kall.rpc<{ les_kurateringer: { stoff: string }[] }>(bruker, 'les_kurateringer', {})
    expect(kurateringer.les_kurateringer.filter((k) => NOKLER.includes(k.stoff))).toEqual([])
  })

  it('legger sidene i kategoriene sine, og lager MAO-hemmere én gang', async () => {
    const plassert = await kall.fasit<{ stoff: string; sti: string }>(
      `select p.stoff, coalesce(f.navn || '/', '') || k.navn as sti
       from public.stoffplasseringer p
       join public.stoffkategorier k on k.id = p.kategori_id
       left join public.stoffkategorier f on f.id = k.forelder_id
       where p.stoff = any($1) order by p.stoff`,
      [NOKLER],
    )
    expect(plassert).toEqual(NYE.map((stoff) => ({ stoff, sti: VERKTOY_KATEGORIER[stoff]!.join('/') })))
    expect(await antall("select count(*)::int as n from public.stoffkategorier where navn = 'MAO-hemmere'")).toBe(1)
  })

  it('lager ingen side for et virkestoff som har en fra før, eller er slettet for godt', async () => {
    expect(await antall(`select count(distinct objekt_id)::int as n from public.infosider where slug = '${FINNES}'`)).toBe(1)
    expect(await antall(`select count(*)::int as n from public.infosider where slug = '${FINNES}' and tilstand = 'publisert'`)).toBe(0)
    expect(await antall(`select count(*)::int as n from public.infosider where slug = '${SLETTET}'`)).toBe(0)
    expect(await antall(`select count(*)::int as n from public.stoffstatus where stoff = '${SLETTET}' and status = 'fjernet'`)).toBe(1)
  })

  it('lar alt som fantes, stå urørt: revisjonene, publiseringene, plasseringene og den andre siden', async () => {
    const etter = await bilde()
    expect(etter.revisjoner.filter((r) => foran.revisjoner.includes(r))).toEqual(foran.revisjoner)
    expect(etter.tilstander.filter((r) => foran.tilstander.includes(r))).toEqual(foran.tilstander)
    expect(etter.plasseringer.filter((r) => foran.plasseringer.includes(r))).toEqual(foran.plasseringer)
    // Alt som er nytt, hører til de nye sidene.
    const nye = await kall.fasit<{ objekt_id: string }>(
      `select distinct o.objekt_id from public.objektrevisjoner o
       where not exists (select 1 from public.infosider i where i.objekt_id = o.objekt_id and i.slug = any($1))
         and not exists (
           select 1 from public.innholdselementer e join public.infosider i on i.objekt_id = e.infoside_id
           where e.objekt_id = o.objekt_id and i.slug = any($1)
         )`,
      [NYE],
    )
    expect(nye.map((r) => r.objekt_id).filter((id) => !foran.revisjoner.some((r) => r.startsWith(`${id}/`)))).toEqual([])
    const side = await leser.lesStoffside('haloperidol', 'publisert')
    expect(side.infoside?.id).toBe(gammel)
    expect(side.elementer.map((e) => e.innhold.panel)).toEqual(['dosering'])
  })

  it('fører sidene og koblingene i endringsloggen på Claude Code, med migrasjonen', async () => {
    const endringer = await kall.fasit<{ agent: string; migrasjon: string }>(
      'select agent, migrasjon from public.innholdsendringer where migrasjon = any($1) order by migrasjon',
      [[SIDER, KOBLING]],
    )
    expect(endringer).toEqual([
      { agent: 'claude-code', migrasjon: SIDER },
      { agent: 'claude-code', migrasjon: KOBLING },
    ])
  })

  it('gjør ingenting når de kjøres en gang til', async () => {
    const for_ = await bilde()
    await kjorMigrasjoner(db, { bare: [SIDER, KOBLING] })
    expect(await bilde()).toEqual(for_)
  })
})
