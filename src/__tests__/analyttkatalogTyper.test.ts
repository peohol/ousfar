/**
 * Analyttkatalogen gir hver app bare de fortolkningstypene den kjenner
 * (`20261124140000_analyttkatalog_etter_klientens_typer.sql`, #562).
 *
 * En app avviser hele katalogen når den har en ukjent type. Det som prøves, er
 * utrullingen av en ny type (`be_urin`) i alle rekkefølger:
 *
 * 1. Gammel app mot ny database: en fane fra før overskriften får katalogen
 *    slik den var, uten den nye typen og uten metoden som bare har den, også
 *    etter et bytte av fagmiljø.
 * 2. Ny app mot ny database: alt, også den nye typen.
 * 3. Ny app mot gammel database: overskriften ses bort fra, og appen leser
 *    katalogen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { byggKatalog, FORTOLKNINGSTYPER, lesKatalogdata, TYPEOVERSKRIFT, type Katalogdata } from '../domain/analyttkatalog'
import { medOverskrifter } from '../endringslogg/operasjon'
import { katalogkall, lesAnalyttkatalog } from '../katalog/Analyttkatalogkilde'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, nyDatabase, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJONER = new URL('../../supabase/migrations/', import.meta.url)

/** Typene appen kjente før overskriften (main d132f12, `FORTOLKNINGSTYPER`). */
const GAMLE_TYPER = ['konsentrasjon', 'scenario', 'thc', 'etg']

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
}, 120_000)

/** Svaret slik data-API-et gir det, med overskriftene appen sender (eller ingen). */
async function svar(p: Person, overskrifter: Record<string, string> = {}): Promise<unknown> {
  const { data, error } = await medOverskrifter(kall.klientFor(g.id[p]).rpc('les_analyttkatalog'), overskrifter)
  if (error) throw error
  return data
}

/** Det en app fra før overskriften gjorde med svaret: avviste ukjente typer, ellers leste. */
function lesSomGammelApp(data: unknown): Katalogdata {
  const katalog = lesKatalogdata(data)
  for (const o of katalog.oppforinger) expect(GAMLE_TYPER, o.nokkel).toContain(o.type)
  byggKatalog(katalog)
  return katalog
}

const nokler = (k: Katalogdata) => k.oppforinger.map((o) => o.nokkel)
const metodekoder = (k: Katalogdata) => k.metoder.map((m) => m.kode)

describe('en app fra før overskriften', () => {
  it('får katalogen uten den nye typen og uten metoden som bare har den', async () => {
    const gammel = lesSomGammelApp(await svar('vanligA'))
    const ny = lesKatalogdata((await katalogkall(kall.klientFor(g.id.vanligA))).data)
    expect(nokler(ny)).toContain('be-urin')
    expect(metodekoder(ny)).toContain('URUS')
    // Alt annet er det samme, i samme rekkefølge.
    expect(gammel.oppforinger).toEqual(ny.oppforinger.filter((o) => GAMLE_TYPER.includes(o.type)))
    expect(gammel.metoder).toEqual(ny.metoder.filter((m) => m.kode !== 'URUS'))
    expect(gammel.oppforinger.length).toBeGreaterThan(0)
  })

  it('beholder katalogen når fagmiljøet byttes fram og tilbake', async () => {
    const velg = (fagmiljo: string) =>
      som(db, g.id.dobbeltAB, (tx) => tx.query('select public.velg_arbeidsfagmiljo($1)', [fagmiljo]))
    try {
      await velg(g.fagmiljo.B)
      expect(lesSomGammelApp(await svar('dobbeltAB')).fagmiljo?.id).toBe(g.fagmiljo.B)
      await velg(g.fagmiljo.A)
      const a = lesSomGammelApp(await svar('dobbeltAB'))
      expect(a.fagmiljo?.id).toBe(g.fagmiljo.A)
      expect(nokler(a)).not.toContain('be-urin')
      expect(a.oppforinger.length).toBeGreaterThan(0)
    } finally {
      await velg(g.fagmiljo.A)
    }
  })
})

describe('appen med overskriften', () => {
  it('sender alle typene den kjenner, og får den nye typen', async () => {
    expect(FORTOLKNINGSTYPER).toEqual(expect.arrayContaining([...GAMLE_TYPER, 'be_urin']))
    const a = await lesAnalyttkatalog(kall.klientFor(g.id.vanligA))
    expect(a.modulMedId('be-urin')?.modul?.type).toBe('be_urin')
    expect(a.metoder.map((m) => m.kode)).toContain('URUS')
  })

  it('får bare typene den oppgir, og ukjente navn ses bort fra', async () => {
    const k = lesKatalogdata(await svar('vanligA', { [TYPEOVERSKRIFT]: ' konsentrasjon , ukjent,' }))
    expect(k.oppforinger.length).toBeGreaterThan(0)
    expect(new Set(k.oppforinger.map((o) => o.type))).toEqual(new Set(['konsentrasjon']))
  })

  it('leser katalogen fra en database som ikke kjenner overskriften', async () => {
    const for_ = readFileSync(new URL('20261118120000_koblingene_fjernet.sql', MIGRASJONER), 'utf8')
    const gammelFunksjon = for_.match(/create or replace function public\.les_analyttkatalog\(\)[\s\S]*?\n\$\$;/)?.[0]
    expect(gammelFunksjon).toBeTruthy()
    const ny = readFileSync(new URL('20261124140000_analyttkatalog_etter_klientens_typer.sql', MIGRASJONER), 'utf8')
    try {
      await db.exec(gammelFunksjon!)
      const a = await lesAnalyttkatalog(kall.klientFor(g.id.vanligA))
      expect(a.modulMedId('be-urin')?.modul?.type).toBe('be_urin')
      expect(a.fortolkninger.length).toBeGreaterThan(0)
    } finally {
      await db.exec(ny)
    }
  })
})
