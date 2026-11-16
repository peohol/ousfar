/**
 * P5: de syntetiske dataene i testplanen (docs/p5-testplan.md, avsnitt 1,
 * «Testdataene»), lagt inn gjennom de samme funksjonene appen bruker. Ingen
 * kliniske verdier: regelsettene har ett skillepunkt og syntetiske
 * kommentarer.
 */
import type { PGlite } from '@electric-sql/pglite'
import { giRedaktoransvar, type Person, type Persongalleri } from './persongalleri'
import { faginnholdskall } from './testdatabase'

export interface P5data {
  /** En publisert fagside (felles) med kortet `kort`. */
  F: string
  Fkort: string
  /** To publiserte regelsett i A. `RA1kommentar` brukes bare av `RA1`, `deltKommentar` av begge. */
  RA1: string
  RA2: string
  RA1kommentar: string
  RA2kommentar: string
  deltKommentar: string
  /** En publisert kommentar i A som ingen av regelsettene bruker. */
  loesKommentarA: string
  /** Et publisert regelsett i B med kommentaren `RBkommentar`. */
  RB: string
  RBkommentar: string
  /** Et regelsett i A som bare finnes som utkast. */
  Rutkast: string
  /** Forslagene: fra `vanligA` til `RA1kommentar` og til `RA2`, fra `vanligB` til `RB` og til `Fkort`. */
  FA1: string
  FA2: string
  FB: string
  FF: string
  /** Ansvaret `redaktorRessursA` har for `RA1`. */
  ansvarRA1: string
}

const KOMMENTAR = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })

/** Et syntetisk regelsett med to intervaller. */
export const P5REGELSETT = (analyttkode: string, under: string, over: string) => ({
  analyttkode,
  enhet: 'nmol/L',
  desimaler: 0,
  skillepunkter: [100],
  intervaller: [
    { niva: 'under', handling: null, kommentar: under },
    { niva: 'over', handling: null, kommentar: over },
  ],
  ringegrense: null,
  cutoff: null,
})

/** Argumentene til `foresla_endring`, med syntetiske standardverdier. */
export const forslagsargumenter = (ressurs: string, element: string | null = null, tillegg: Record<string, unknown> = {}) => ({
  ressurs,
  element,
  grunnrevisjon: 1,
  sideversjon: null,
  sted: null,
  utdrag: null,
  forslag: 'Syntetisk forslag til testen.',
  begrunnelse: 'Syntetisk begrunnelse.',
  kilder: [],
  ...tillegg,
})

export async function leggInnP5data(db: PGlite, g: Persongalleri): Promise<P5data> {
  const kall = faginnholdskall(db, g.id.systemarkitekt)
  const publisert = async (av: Person, type: string, innhold: object) => {
    const id = (await kall.opprett(type as never, innhold as never, g.id[av])).id
    await kall.publiser(id, 1, g.id[av])
    return id
  }

  const F = await publisert('systemarkitekt', 'infoside', { navn: 'P5 testmiddel' })
  const Fkort = await publisert('systemarkitekt', 'innholdselement', {
    infoside: F,
    panel: 'viktige_data',
    posisjon: 0,
    elementtype: 'referanseomrade',
    data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
    referanser: [],
  })

  const RA1kommentar = await publisert('adminA', 'kommentar', KOMMENTAR('P5 RA1'))
  const RA2kommentar = await publisert('adminA', 'kommentar', KOMMENTAR('P5 RA2'))
  const deltKommentar = await publisert('adminA', 'kommentar', KOMMENTAR('P5 delt'))
  const loesKommentarA = await publisert('adminA', 'kommentar', KOMMENTAR('P5 løs i A'))
  const RA1 = await publisert('adminA', 'intervallregelsett', P5REGELSETT('P5RAEN', RA1kommentar, deltKommentar))
  const RA2 = await publisert('adminA', 'intervallregelsett', P5REGELSETT('P5RATO', RA2kommentar, deltKommentar))
  const RBkommentar = await publisert('adminB', 'kommentar', KOMMENTAR('P5 RB'))
  const RB = await publisert('adminB', 'intervallregelsett', P5REGELSETT('P5RB', RBkommentar, RBkommentar))
  const utkastkommentar = await publisert('adminA', 'kommentar', KOMMENTAR('P5 utkast'))
  const Rutkast = (await kall.opprett('intervallregelsett' as never, P5REGELSETT('P5UTKAST', utkastkommentar, utkastkommentar) as never, g.id.adminA)).id

  const ansvarRA1 = await giRedaktoransvar(db, g.id.redaktorRessursA, { omrade: 'ressurs', ressurs: RA1 })

  const foreslaa = async (av: Person, ressurs: string, element: string | null) =>
    Object.values(await kall.rpc<Record<string, string>>(g.id[av], 'foresla_endring', forslagsargumenter(ressurs, element)))[0]!
  const FA1 = await foreslaa('vanligA', RA1, RA1kommentar)
  const FA2 = await foreslaa('vanligA', RA2, null)
  const FB = await foreslaa('vanligB', RB, null)
  const FF = await foreslaa('vanligB', F, Fkort)

  return { F, Fkort, RA1, RA2, RA1kommentar, RA2kommentar, deltKommentar, loesKommentarA, RB, RBkommentar, Rutkast, FA1, FA2, FB, FF, ansvarRA1 }
}
