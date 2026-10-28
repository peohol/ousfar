/**
 * Fagsidene for kokain, MDMA og etanol i databasen: migrasjonene som lager dem
 * uten faginnhold (`kokain_mdma_etanol_fagsider`) og kobler kokain og etanol
 * til FEST (`kokain_etanol_fest_kobling`). At sidene blir publisert, ikke
 * kuratert og uten annet enn koblingen til FEST; at MDMA, som ikke finnes i
 * FEST, ikke kobles; at et stoff som alt står i en kategori i
 * stoffregisteret, beholder plasseringen sin, mens et som ikke står i noen,
 * legges i kategorien fra grunninndelingen; at alt som fantes, står urørt; og
 * at de ikke gjør noe når de kjøres igjen. FEST-radene er syntetiske, med
 * ID-ene og navnene fra FEST.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { stoffslug } from '../domain/stoffregister'
import { erklaringsfeil } from '../faginnhold/endringserklaering'
import { FESTKOBLINGSIMPORTER, festkoblingSql, KOKAIN_ETANOL_FESTKOBLINGER } from '../faginnhold/festkoblinger'
import { lagFaginnholdsleser, type Faginnholdsleser } from '../faginnhold/lesing'
import {
  FAGSIDEIMPORTER,
  KOKAIN_MDMA_ETANOL_FAGSIDEKILDE,
  KOKAIN_MDMA_ETANOL_FAGSIDER,
  nyeFagsiderSql,
} from '../faginnhold/nyefagsider'
import { ELEMENTTYPER, lesLegemiddelkobling } from '../faginnhold/paneler'
import { byggSidemodell, harFaginnhold } from '../faginnhold/stoffside'
import { PREPARATPANEL } from '../legemiddeldata/stoffside'
import STOFFREGISTERFIL from '../data/stoffregister.json'
import { GRUNNINNDELING } from './hjelp/registerstruktur'
import { faginnholdskall, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJONER = migrasjonsfiler()
const migrasjonsfil = (navn: string) => MIGRASJONER.find((f) => f.endsWith(`_${navn}.sql`))!
const SIDER = migrasjonsfil('kokain_mdma_etanol_fagsider')
const KOBLING = migrasjonsfil('kokain_etanol_fest_kobling')
const tekst = (fil: string) => readFileSync(new URL(`../../supabase/migrations/${fil}`, import.meta.url), 'utf8')
const utenErklaring = (sql: string) => sql.replace(/^select intern\.endring_start\(.*\);\n/m, '')

const NOKLER = ['kokain', 'mdma', 'etanol']
const NAVN: Record<string, string> = { kokain: 'Kokain', mdma: 'MDMA', etanol: 'Etanol' }
/** FESTs navn på virkestoffene sidene kobles til. */
const FESTNAVN: Record<string, string> = {
  'ID_05E35980-D626-4A37-94CB-EB16E8E80921': 'Kokain',
  'ID_3A955613-130E-40CC-8841-24E7B2A32E6D': 'Etanol',
}
/** Flyttet til en annen kategori før migrasjonen: skal bli stående der. */
const FLYTTET = 'kokain'
const FLYTTET_TIL = 'Hallusinogene stoffer'
/** Tatt ut av stoffregisteret før migrasjonen: skal få kategorien fra grunninndelingen. */
const UPLASSERT = 'etanol'

const kategoriI = (nokkel: string) => GRUNNINNDELING.filter((k) => k.stoffer?.includes(nokkel)).map((k) => k.navn)

describe('sidene og koblingene', () => {
  it('gjelder kokain, MDMA og etanol, med navnet og nøkkelen fra stoffregisterfilen', () => {
    expect(KOKAIN_MDMA_ETANOL_FAGSIDER.map((s) => stoffslug(s.navn))).toEqual(NOKLER)
    for (const s of KOKAIN_MDMA_ETANOL_FAGSIDER) {
      const stoff = STOFFREGISTERFIL.stoffer.find((x) => x.slug === stoffslug(s.navn))
      expect(stoff?.navn, s.navn).toBe(s.navn)
    }
  })

  it('legger sidene der grunninndelingen har stoffene: kokain og MDMA med amfetamin, etanol med GHB', () => {
    for (const s of KOKAIN_MDMA_ETANOL_FAGSIDER) expect([...s.kategori], s.navn).toEqual(kategoriI(stoffslug(s.navn)))
    expect(kategoriI('amfetamin')).toEqual(['Stimulanter'])
    expect(kategoriI('ghb')).toEqual(['Alkohol og GHB'])
    expect(KOKAIN_MDMA_ETANOL_FAGSIDER.map((s) => s.kategori[0])).toEqual(['Stimulanter', 'Stimulanter', 'Alkohol og GHB'])
  })

  it('kobler kokain og etanol til moderstoffet i FEST, og ikke MDMA, som ikke finnes der', () => {
    expect(KOKAIN_ETANOL_FESTKOBLINGER.map((k) => [k.side, FESTNAVN[k.fest_id]])).toEqual([
      ['Kokain', 'Kokain'],
      ['Etanol', 'Etanol'],
    ])
    const alle = FESTKOBLINGSIMPORTER.flatMap((i) => i.koblinger.map((k) => k.side))
    expect(alle).not.toContain('MDMA')
  })
})

describe('migrasjonene', () => {
  it('er de samme som sidene og koblingene gir, kommer etter P2, og oppgir agenten', () => {
    const import_ = FAGSIDEIMPORTER.find((i) => i.migrasjon === 'kokain_mdma_etanol_fagsider')!
    expect(import_.beholdPlassering).toBe(true)
    expect(utenErklaring(tekst(SIDER))).toBe(
      nyeFagsiderSql(KOKAIN_MDMA_ETANOL_FAGSIDER, 'peohol', KOKAIN_MDMA_ETANOL_FAGSIDEKILDE, { beholdPlassering: true }),
    )
    expect(utenErklaring(tekst(KOBLING))).toBe(festkoblingSql(KOKAIN_ETANOL_FESTKOBLINGER, 'peohol'))
    for (const fil of [SIDER, KOBLING]) expect(erklaringsfeil(fil, tekst(fil)), fil).toEqual([])
    expect(SIDER < KOBLING).toBe(true)
    expect(migrasjonsfil('verktoy_fest_kobling') < SIDER).toBe(true)
  })

  it('lager uten valget den samme SQL-en som før, så P2-migrasjonen står', () => {
    const [verktoy] = FAGSIDEIMPORTER
    const sql = nyeFagsiderSql(verktoy!.sider, 'peohol', verktoy!.kilde)
    expect(sql).not.toContain('står alt i stoffregisteret')
    expect(nyeFagsiderSql(verktoy!.sider, 'peohol', verktoy!.kilde, { beholdPlassering: false })).toBe(sql)
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
  const plasseringer = async () =>
    kall.fasit<{ stoff: string; sti: string }>(
      `select p.stoff, coalesce(f.navn || '/', '') || k.navn as sti
       from public.stoffplasseringer p
       join public.stoffkategorier k on k.id = p.kategori_id
       left join public.stoffkategorier f on f.id = k.forelder_id
       where p.stoff = any($1) order by p.stoff, sti`,
      [NOKLER],
    )

  beforeAll(async () => {
    db = await nyDatabase({ til: SIDER })
    const admin = await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Rita', etternavn: 'Redaktør', rolle: 'admin' })
    bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
    kall = faginnholdskall(db, admin)
    leser = lagFaginnholdsleser(kall.klientFor(bruker))

    // En side med innhold som skal stå urørt.
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

    // Ett stoff flyttet til en annen kategori, og ett tatt ut av stoffregisteret.
    await db.query(
      `update public.stoffplasseringer set kategori_id = (select id from public.stoffkategorier where navn = $2 and forelder_id is null)
       where stoff = $1`,
      [FLYTTET, FLYTTET_TIL],
    )
    await db.query('delete from public.stoffplasseringer where stoff = $1', [UPLASSERT])

    const synk = (
      await db.query<{ id: number }>(
        "insert into legemiddeldata.synkroniseringer (kilde, status, avsluttet_kl) values ('FEST', 'fullfort', now()) returning id",
      )
    ).rows[0]!.id
    for (const { fest_id } of KOKAIN_ETANOL_FESTKOBLINGER) {
      await db.query(
        `insert into legemiddeldata.virkestoff (fest_id, data, hash, forst_sett_kl, sist_endret_kl, sist_sett_synk)
         values ($1, $2, 'x', now(), now(), $3)`,
        [fest_id, { navn: FESTNAVN[fest_id], salter: [] }, synk],
      )
    }
    foran = await bilde()
    await kjorMigrasjoner(db, { bare: [SIDER, KOBLING] })
  }, 240_000)

  it('lager hver side publisert, med navnet og nøkkelen fra stoffregisteret og ingenting annet', async () => {
    for (const nokkel of NOKLER) {
      const sider = await kall.fasit<{ tilstand: string; navn: string; slug: string }>(
        'select tilstand, navn, slug from public.infosider where slug = $1 order by tilstand::text',
        [nokkel],
      )
      expect(sider, nokkel).toEqual([
        { tilstand: 'publisert', navn: NAVN[nokkel], slug: nokkel },
        { tilstand: 'utkast', navn: NAVN[nokkel], slug: nokkel },
      ])
      const side = await leser.lesStoffside(nokkel, 'publisert')
      expect(side.infoside?.innhold, nokkel).toEqual({ navn: NAVN[nokkel] })
      expect(side.stoff, nokkel).toMatchObject({ slug: nokkel, navn: NAVN[nokkel] })
      expect(side.infoside?.kilde, nokkel).toBe(KOKAIN_MDMA_ETANOL_FAGSIDEKILDE)
      expect(side.referanser, nokkel).toEqual([])
      expect(harFaginnhold(byggSidemodell(side)), nokkel).toBe(false)
    }
  })

  it('kobler kokain og etanol til FEST, og gir MDMA ingen kobling og ikke noe annet', async () => {
    for (const { side: navn, fest_id } of KOKAIN_ETANOL_FESTKOBLINGER) {
      const side = await leser.lesStoffside(stoffslug(navn), 'publisert')
      expect(side.elementer.map((e) => [e.innhold.panel, e.innhold.elementtype]), navn).toEqual([[PREPARATPANEL, ELEMENTTYPER.legemiddelkobling]])
      expect(lesLegemiddelkobling(side.elementer[0]!.innhold.data), navn).toEqual({ virkestoff: [{ fest_id, navn: FESTNAVN[fest_id] }] })
    }
    expect((await leser.lesStoffside('mdma', 'publisert')).elementer).toEqual([])
  })

  it('er ikke kuratert', async () => {
    const kurateringer = await kall.rpc<{ les_kurateringer: { stoff: string }[] }>(bruker, 'les_kurateringer', {})
    expect(kurateringer.les_kurateringer.filter((k) => NOKLER.includes(k.stoff))).toEqual([])
  })

  it('lar en plassering som står, stå, og legger et stoff uten plassering i kategorien sin', async () => {
    expect(await plasseringer()).toEqual([
      { stoff: 'etanol', sti: 'Alkohol og GHB' },
      { stoff: 'kokain', sti: FLYTTET_TIL },
      { stoff: 'mdma', sti: 'Stimulanter' },
    ])
  })

  it('lar alt som fantes, stå urørt: revisjonene, publiseringene, plasseringene og den andre siden', async () => {
    const etter = await bilde()
    expect(etter.revisjoner.filter((r) => foran.revisjoner.includes(r))).toEqual(foran.revisjoner)
    expect(etter.tilstander.filter((r) => foran.tilstander.includes(r))).toEqual(foran.tilstander)
    expect(etter.plasseringer.filter((r) => foran.plasseringer.includes(r))).toEqual(foran.plasseringer)
    // Den eneste nye plasseringen er etanols.
    expect(etter.plasseringer.filter((r) => !foran.plasseringer.includes(r)).map((r) => r.split('/')[0])).toEqual([UPLASSERT])
    // Alt som er nytt, hører til de nye sidene.
    const nye = await kall.fasit<{ objekt_id: string }>(
      `select distinct o.objekt_id from public.objektrevisjoner o
       where not exists (select 1 from public.infosider i where i.objekt_id = o.objekt_id and i.slug = any($1))
         and not exists (
           select 1 from public.innholdselementer e join public.infosider i on i.objekt_id = e.infoside_id
           where e.objekt_id = o.objekt_id and i.slug = any($1)
         )`,
      [NOKLER],
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
