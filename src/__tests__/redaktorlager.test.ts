/**
 * Redaktøransvaret slik appen leser og sender det (`src/redaktorer/ansvar.ts`),
 * mot databasen bygd av migrasjonene og persongalleriet: at svarene leses
 * riktig, at avslagene gir meldingene databasen skriver, og at kodene en
 * redaktør for ett regelsett får redigere, er regelsettets. Tilgangen
 * prøves i `redaktoransvar.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { lagRedaktorlager, redigerbareRegelsett, type Redaktorlager } from '../redaktorer/ansvar'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, nyDatabase, type Faginnholdskall } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall
let regelsett: string
const lager = (p: Person): Redaktorlager => lagRedaktorlager(() => kall.klientFor(g.id[p]))

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
  const kommentar = (await kall.opprett('kommentar', { navn: 'Lager', tekst: 'Syntetisk.', plassholdere: [] } as never, g.id.adminA)).id
  regelsett = (
    await kall.opprett(
      'intervallregelsett',
      {
        analyttkode: 'P5LAGER',
        enhet: 'nmol/L',
        desimaler: 0,
        skillepunkter: [],
        intervaller: [{ niva: 'innenfor', handling: null, kommentar }],
        ringegrense: null,
        cutoff: null,
      } as never,
      g.id.adminA,
    )
  ).id
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('redaktørlageret mot databasen', () => {
  it('gir ansvar for ett regelsett, viser det i oversikten og hos redaktøren, og tar det tilbake', async () => {
    const admin = lager('adminA')
    const id = await admin.tildel({ bruker: g.id.vanligA, omrade: 'ressurs', ressurs: regelsett, merknad: '  Under ferien  ' })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)

    const oversikt = await admin.oversikt()
    expect(oversikt.nasjonalt).toEqual({ vises: false, aktivert: false })
    expect(oversikt.fagmiljoer.map((f) => f.id)).toEqual([g.fagmiljo.A])
    const ansvar = oversikt.ansvar.find((a) => a.id === id)!
    expect(ansvar).toMatchObject({
      omrade: 'ressurs',
      nasjonalt: false,
      gjelder: true,
      bruker: { id: g.id.vanligA },
      ressurs: { id: regelsett, type: 'intervallregelsett', navn: 'P5LAGER', analyttkoder: ['P5LAGER'], fagmiljoId: g.fagmiljo.A },
      fagmiljo: { id: g.fagmiljo.A },
      tildeltAv: { id: g.id.adminA },
      merknad: 'Under ferien',
    })
    expect(oversikt.ressurser.find((r) => r.id === regelsett)).toMatchObject({ analyttkoder: ['P5LAGER'], harRedaktor: true })

    const mine = await lager('vanligA').mine()
    expect(mine.map((a) => a.id)).toEqual([id])
    const iA = redigerbareRegelsett(mine, g.fagmiljo.A)
    expect([...iA.koder]).toEqual(['P5LAGER'])
    expect([...iA.ider]).toEqual([regelsett])
    // I et annet fagmiljø gir det ingen.
    const iB = redigerbareRegelsett(mine, g.fagmiljo.B)
    expect([...iB.koder, ...iB.ider]).toEqual([])
    expect((await lager('adminA').forRessurs(regelsett)).map((a) => a.bruker.id)).toContain(g.id.vanligA)

    await admin.tilbakekall(id)
    expect(await lager('vanligA').mine()).toEqual([])
  })

  it('gir meldingene databasen skriver ved et avslag', async () => {
    await expect(lager('adminB').tildel({ bruker: g.id.vanligA, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A })).rejects.toThrow(/^Du administrerer ikke/)
    await expect(lager('vanligA').oversikt()).rejects.toThrow(/^Bare administratorene/)
    await expect(lager('adminB').forRessurs(regelsett)).rejects.toThrow(/^Fant ikke/)
  })

  it('leser systemarkitektens oversikt med det nasjonale avslått', async () => {
    const oversikt = await lager('systemarkitekt').oversikt()
    expect(oversikt.nasjonalt).toEqual({ vises: true, aktivert: false })
    expect(oversikt.fagmiljoer.length).toBeGreaterThanOrEqual(2)
    expect(typeof oversikt.fagsiderUtenRedaktor).toBe('number')
  })
})
