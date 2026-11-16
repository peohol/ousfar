/**
 * P5 tråd B1: endringsforslagene (docs/redaktorer-og-forslag.md, «Datamodellen»,
 * «Grensesnittene» og «Hvem ser et forslag»). Prøver at et aktivt medlem kan
 * foreslå, følge og trekke sitt eget forslag, at alt annet avvises med riktig
 * kode, at ingenting fra et annet fagmiljøs lokale innhold kan ses, at
 * forslagsstilleren aldri får noen endringsrett, og at publisert innhold er
 * uendret. Persongalleriet og syntetiske data.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { regelimportSql } from '../regler/import'
import { DAGENS_IMPORT } from './hjelp/dagensregler'
import { avsluttMedlemskap, byggPersongalleri, opprettMedlem, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall
/** En ekstra konto, aktiv i A og B, som mister medlemskapet i A underveis. */
let flyttet = ''
const obj = { fagside: '', kort: '', annetKort: '', referanse: '', utkastside: '', regelsettA: '', regelsettB: '', kommentarA: '' }
let sideversjon = 0

interface Forslagsdata {
  ressurs: string
  element?: string | null
  grunnrevisjon?: number
  sideversjon?: number | null
  sted?: string | null
  utdrag?: string | null
  forslag?: string
  begrunnelse?: string
  kilder?: unknown
}

const INGEN = '00000000-0000-4000-8000-000000000000'

const rpc = <T>(bruker: string | null, funksjon: string, argumenter: Record<string, unknown>) =>
  kall.rpc<Record<string, T>>(bruker, funksjon, argumenter).then((rad) => rad[funksjon] as T)

function foreslaa(bruker: string | null, d: Forslagsdata) {
  return rpc<string>(bruker, 'foresla_endring', {
    ressurs: d.ressurs,
    element: d.element ?? null,
    grunnrevisjon: d.grunnrevisjon ?? 1,
    sideversjon: d.sideversjon ?? null,
    sted: d.sted ?? null,
    utdrag: d.utdrag ?? null,
    forslag: d.forslag ?? 'Syntetisk forslag: skriv øvre grense som 3.',
    begrunnelse: d.begrunnelse ?? 'Syntetisk begrunnelse.',
    kilder: d.kilder ?? [],
  })
}

const lesForslag = (bruker: string | null, forslag: string) => rpc<Record<string, any>>(bruker, 'les_forslag', { forslag })
const mine = (bruker: string) => rpc<Array<Record<string, any>>>(bruker, 'les_mine_forslag', {})
const trekk = (bruker: string, forslag: string, begrunnelse: string | null = null) =>
  rpc(bruker, 'trekk_forslag', { forslag, begrunnelse })
const svar = (bruker: string, forslag: string, tekst: string) => rpc(bruker, 'svar_pa_forslag', { forslag, tekst })

const kode = async (p: () => Promise<unknown>) => (await feilFra(p))?.code ?? null

/** Alt i faginnholdet som kan endres, slik det står: tilstandene, revisjonene og publiseringene. */
const innholdsfasit = () =>
  db
    .query(
      `select (select jsonb_agg(t order by t.objekt_id, t.tilstand) from public.objekttilstander t) as tilstander,
              (select count(*) from public.objektrevisjoner) as revisjoner,
              (select count(*) from public.objektpubliseringer) as publiseringer,
              (select count(*) from public.sideversjoner) as sideversjoner`,
    )
    .then((r) => r.rows[0])

/** Flytter statusen slik behandlingen (tråd C) gjør, med den felles overgangen. */
const overgang = (forslag: string, fra: string[], til: string | null, art: string, bruker: string = g.id.systemarkitekt) =>
  db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: bruker, role: 'authenticated' })])
    return tx.query('select intern.forslagsovergang($1, $2, $3, $4) as f', [forslag, fra, til, art])
  })

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  await db.exec(regelimportSql(DAGENS_IMPORT, 'test.systemarkitekt'))
  kall = faginnholdskall(db, g.id.systemarkitekt)

  const side = await kall.opprett('infoside', { navn: 'Forslagsmiddel' })
  obj.fagside = side.id
  const kort = (posisjon: number, infoside = side.id) =>
    kall.opprett('innholdselement', {
      infoside,
      panel: 'viktige_data',
      posisjon,
      elementtype: 'referanseomrade',
      data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
      referanser: [],
    })
  obj.kort = (await kort(0)).id
  obj.referanse = (await kall.opprett('referanse', { tittel: 'Syntetisk kilde', forfattere: 'Nordmann O', aar: '2021', lenke: 'https://example.org/r' })).id
  for (const id of [obj.fagside, obj.kort, obj.referanse]) await kall.publiser(id, 1)
  const annen = await kall.opprett('infoside', { navn: 'Annet middel' })
  obj.annetKort = (await kort(0, annen.id)).id
  for (const id of [annen.id, obj.annetKort]) await kall.publiser(id, 1)
  obj.utkastside = (await kall.opprett('infoside', { navn: 'Bare utkast' })).id
  sideversjon = (await db.query<{ nr: number }>('select max(nr) as nr from public.sideversjoner where infoside = $1', [obj.fagside])).rows[0]!.nr

  const { rows } = await db.query<{ objekt_id: string }>(
    `select objekt_id from public.intervallregelsett where tilstand = 'publisert' order by analyttkode limit 2`,
  )
  obj.regelsettA = rows[0]!.objekt_id
  obj.regelsettB = rows[1]!.objekt_id
  obj.kommentarA = (
    await db.query<{ k: string }>(`select kommentar_id as k from public.intervallregler where regelsett_id = $1 limit 1`, [obj.regelsettA])
  ).rows[0]!.k
  // Regelsett B, med kommentarene det bruker, flyttes til fagmiljø B.
  const kommentarerB = (
    await db.query<{ id: string }>(
      `select kommentar_id as id from public.intervallregler where regelsett_id = $1
       union select unnest(array[cutoff_innledning_id, cutoff_kommentar_id]) from public.intervallregelsett where objekt_id = $1`,
      [obj.regelsettB],
    )
  ).rows.map((r) => r.id).filter(Boolean)
  await db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'P5-test: lokalt for B (syntetisk)', true)`)
    await tx.query(`update public.ressursomfang set omfang = 'fagmiljo', fagmiljo_id = $2, regel = null where objekt_id = any ($1)`, [
      [obj.regelsettB, ...kommentarerB],
      g.fagmiljo.B,
    ])
  })

  flyttet = await opprettBruker(db, { brukernavn: 'test.flyttet', fornavn: 'Test', etternavn: 'Flyttet', rolle: 'user' })
  for (const f of [g.fagmiljo.A, g.fagmiljo.B]) {
    const { rows: m } = await db.query(`select 1 from public.medlemskap where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`, [flyttet, f])
    if (m.length === 0) await opprettMedlem(db, flyttet, f)
  }
}, 120_000)

describe('å foreslå en endring', () => {
  it('et aktivt medlem foreslår en endring i et kort på en fagside, med kilder og stedet', async () => {
    const id = await foreslaa(g.id.vanligA, {
      ressurs: obj.fagside,
      element: obj.kort,
      sideversjon,
      sted: '  Viktige data · Referanseområde ',
      utdrag: '1–2 nmol/L',
      forslag: '  Øvre grense bør være 3 nmol/L. ',
      kilder: [
        { tekst: 'Syntetisk studie', lenke: 'https://example.org/studie', ukjent: 'tas bort' },
        { referanse: obj.referanse },
      ],
    })
    const { rows } = await db.query<Record<string, any>>('select * from public.endringsforslag where id = $1', [id])
    expect(rows[0]).toMatchObject({
      ressurs_id: obj.fagside,
      element_id: obj.kort,
      grunnrevisjon: 1,
      sideversjon,
      sted: 'Viktige data · Referanseområde',
      forslag: 'Øvre grense bør være 3 nmol/L.',
      status: 'ny',
      stilt_av: g.id.vanligA,
      behandler_id: null,
      kilder: [{ tekst: 'Syntetisk studie', lenke: 'https://example.org/studie' }, { referanse: obj.referanse }],
    })
    const hendelser = await db.query<{ art: string; utfort_av: string }>(
      'select art, utfort_av from public.endringsforslag_hendelser where forslag_id = $1',
      [id],
    )
    expect(hendelser.rows).toEqual([{ art: 'opprettet', utfort_av: g.id.vanligA }])
  })

  it('alle med aktivt medlemskap kan foreslå for felles innhold, og for det lokale innholdet i eget fagmiljø', async () => {
    await foreslaa(g.id.vanligB, { ressurs: obj.fagside })
    await foreslaa(g.id.vanligA, { ressurs: obj.regelsettA, element: obj.kommentarA })
    await foreslaa(g.id.vanligB, { ressurs: obj.regelsettB })
    await foreslaa(g.id.adminA, { ressurs: obj.regelsettA })
  })

  it('et lokalt regelsett i et annet fagmiljø gir samme svar som et som ikke finnes', async () => {
    const fremmed = await feilFra(() => foreslaa(g.id.vanligA, { ressurs: obj.regelsettB }))
    const finnesIkke = await feilFra(() => foreslaa(g.id.vanligA, { ressurs: INGEN }))
    expect(fremmed).toMatchObject({ code: 'PT404' })
    expect(fremmed?.message).toBe(finnesIkke?.message)
    expect(finnesIkke?.code).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligB, { ressurs: obj.regelsettA }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.adminB, { ressurs: obj.regelsettA }))).toBe('PT404')
  })

  it('bare en publisert fagside eller et publisert regelsett kan få forslag', async () => {
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.utkastside }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.kort }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.referanse }))).toBe('PT404')
  })

  it('elementet må høre til ressursen', async () => {
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.annetKort }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.referanse }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.regelsettA, element: obj.kort }))).toBe('PT404')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: INGEN }))).toBe('PT404')
  })

  it('uten sideversjon gjelder et forslag til en fagside den nyeste versjonen; et regelsett har ingen', async () => {
    const side = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
    const regelsett = await foreslaa(g.id.vanligA, { ressurs: obj.regelsettA })
    const { rows } = await db.query<{ id: string; sideversjon: number | null }>(
      'select id, sideversjon from public.endringsforslag where id = any ($1)',
      [[side, regelsett]],
    )
    expect(Object.fromEntries(rows.map((r) => [r.id, r.sideversjon]))).toEqual({ [side]: sideversjon, [regelsett]: null })
  })

  it('ressursen selv som element lagres som forslag til hele ressursen', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.fagside })
    const { rows } = await db.query('select element_id from public.endringsforslag where id = $1', [id])
    expect(rows[0]).toEqual({ element_id: null })
  })

  it('versjonen forslaget bygger på, må være publisert', async () => {
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort, grunnrevisjon: 7 }))).toBe('22023')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, sideversjon: 999 }))).toBe('22023')
    expect(await kode(() => foreslaa(g.id.vanligA, { ressurs: obj.regelsettA, sideversjon }))).toBe('22023')
  })

  it('tekstene og kildene kontrolleres, med meldinger som kan vises', async () => {
    const ugyldige: Array<[Partial<Forslagsdata>, RegExp]> = [
      [{ forslag: '   ' }, /Skriv hva du foreslår/],
      [{ forslag: 'x'.repeat(8001) }, /8000/],
      [{ begrunnelse: '' }, /hvorfor/],
      [{ begrunnelse: 'x'.repeat(4001) }, /4000/],
      [{ sted: 'x'.repeat(201) }, /200/],
      [{ utdrag: 'x'.repeat(2001) }, /2000/],
      [{ kilder: [{ lenke: 'http://example.org' }] }, /https:\/\//],
      [{ kilder: [{ lenke: 'javascript:alert(1)' }] }, /https:\/\//],
      [{ kilder: [{ tekst: '  ' }] }, /tekst, en lenke eller en referanse/],
      [{ kilder: Array.from({ length: 11 }, () => ({ tekst: 'Kilde' })) }, /ti kilder/],
      [{ kilder: [{ referanse: INGEN }] }, /referansen/],
      [{ kilder: [{ referanse: 'ikke-en-id' }] }, /referansen/],
      [{ kilder: [{ referanse: obj.kort }] }, /referansen/],
      [{ kilder: { tekst: 'ikke en liste' } }, /liste/],
    ]
    for (const [data, melding] of ugyldige) {
      const feil = await feilFra(() => foreslaa(g.id.vanligA, { ressurs: obj.fagside, ...data }))
      expect(feil?.code, JSON.stringify(data).slice(0, 80)).toBe('22023')
      expect(feil?.message).toMatch(melding)
    }
  })

  it('uten aktivt medlemskap, også med gyldig token, foreslås ingenting', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect(await kode(() => foreslaa(g.id[p], { ressurs: obj.fagside }))).toBe('42501')
    }
    expect(await kode(() => foreslaa(null, { ressurs: obj.fagside }))).not.toBeNull()
  })

  it('en person kan ha et begrenset antall åpne forslag', async () => {
    const { rows } = await db.query<{ n: number }>('select intern.maks_apne_forslag() as n')
    const maks = rows[0]!.n
    const forste = await foreslaa(g.id.dobbeltAB, { ressurs: obj.fagside })
    for (let i = 1; i < maks; i++) await foreslaa(g.id.dobbeltAB, { ressurs: obj.fagside })
    const feil = await feilFra(() => foreslaa(g.id.dobbeltAB, { ressurs: obj.fagside }))
    expect(feil?.code).toBe('22023')
    expect(feil?.message).toMatch(/ikke er avgjort/)
    await trekk(g.id.dobbeltAB, forste)
    await foreslaa(g.id.dobbeltAB, { ressurs: obj.fagside })
  })
})

describe('forslaget gir ingen endringsrett og endrer ikke innholdet', () => {
  it('publisert innhold, utkastene og historikken er uendret av forslag', async () => {
    const for_ = await innholdsfasit()
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort })
    await svar(g.id.vanligA, id, 'Et tillegg.')
    await trekk(g.id.vanligA, id)
    expect(await innholdsfasit()).toEqual(for_)
  })

  it('forslagsstilleren kan fortsatt ikke endre eller publisere innholdet', async () => {
    await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort })
    const innhold = { infoside: obj.fagside, panel: 'viktige_data', posisjon: 0, elementtype: 'referanseomrade', data: { nedre: 1, ovre: 3, enhet: 'nmol/L', forbehold: '' }, referanser: [] }
    expect(await kode(() => kall.lagre(obj.kort, 1, innhold, g.id.vanligA))).toBe('42501')
    expect(await kode(() => kall.publiser(obj.kort, 1, g.id.vanligA))).toBe('42501')
    const { rows } = await db.query<{ a: boolean; b: boolean; c: boolean }>(
      'select intern.kan_endre_objekt($1, $3) as a, intern.kan_endre_objekt($2, $3) as b, intern.kan_behandle_forslag($2, $3) as c',
      [obj.kort, obj.fagside, g.id.vanligA],
    )
    expect(rows[0]).toEqual({ a: false, b: false, c: false })
  })

  it('nettleseren kan verken lese eller skrive tabellene direkte', async () => {
    for (const tabell of ['endringsforslag', 'endringsforslag_hendelser']) {
      expect(await kode(() => som(db, g.id.systemarkitekt, (tx) => tx.query(`select * from public.${tabell}`)))).toBe('42501')
    }
    expect(
      await kode(() =>
        som(db, g.id.vanligA, (tx) =>
          tx.query(
            `insert into public.endringsforslag (ressurs_id, grunnrevisjon, forslag, begrunnelse, stilt_av, status)
             values ($1, 1, 'x', 'x', $2, 'godkjent')`,
            [obj.fagside, g.id.vanligA],
          ),
        ),
      ),
    ).toBe('42501')
  })

  it('det forslagsstilleren skrev, kan ikke endres i ettertid', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
    expect(await kode(() => db.query(`update public.endringsforslag set forslag = 'endret' where id = $1`, [id]))).toBe('42501')
    expect(await kode(() => db.query(`update public.endringsforslag_hendelser set tekst = 'endret' where forslag_id = $1`, [id]))).toBe('42501')
  })
})

describe('hvem som ser et forslag', () => {
  let fagsideforslag = ''
  let lokaltA = ''
  let lokaltB = ''

  beforeAll(async () => {
    fagsideforslag = await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort, sideversjon, utdrag: 'Sitat', kilder: [{ referanse: obj.referanse }] })
    lokaltA = await foreslaa(g.id.vanligA, { ressurs: obj.regelsettA, element: obj.kommentarA })
    lokaltB = await foreslaa(g.id.vanligB, { ressurs: obj.regelsettB })
  })

  it('forslagsstilleren ser sitt eget, med tidslinjen og kildene', async () => {
    const f = await lesForslag(g.id.vanligA, fagsideforslag)
    expect(f).toMatchObject({
      id: fagsideforslag,
      status: 'ny',
      utdrag: 'Sitat',
      er_mitt: true,
      kan_behandle: false,
      kan_trekke: true,
      kan_svare: true,
      ressurs: { id: obj.fagside, type: 'infoside', navn: 'Forslagsmiddel', omfang: 'felles' },
      element: { id: obj.kort, type: 'innholdselement' },
      stilt_av: { er_meg: true, navn: 'Test vanligA' },
      kilder: [{ referanse: obj.referanse, referansetittel: 'Syntetisk kilde' }],
      konflikt: { grunnrevisjon: 1, publisert_revisjon: 1, endret_siden: false, utkast_endret: null, side_endret_siden: false },
    })
    expect(f.hendelser).toHaveLength(1)
    expect(f.hendelser[0]).toMatchObject({ art: 'opprettet', utfort_av: { er_meg: true } })
  })

  it('de som kan behandle forslag til ressursen, ser det; ingen andre', async () => {
    const f = await lesForslag(g.id.systemarkitekt, fagsideforslag)
    expect(f).toMatchObject({ er_mitt: false, kan_behandle: true, kan_trekke: false, stilt_av: { er_meg: false, navn: 'Test vanligA' } })
    expect(f.konflikt.utkast_endret).toBe(false)
    expect((await lesForslag(g.id.adminA, lokaltA)).kan_behandle).toBe(true)
    expect((await lesForslag(g.id.adminB, lokaltB)).kan_behandle).toBe(true)

    // Felles fagsider behandles av systemarkitektene; lokale administratorer og andre medlemmer ser dem ikke.
    for (const p of ['adminA', 'adminB', 'vanligB', 'dobbeltAB'] as const) {
      expect(await kode(() => lesForslag(g.id[p], fagsideforslag)), p).toBe('PT404')
    }
    // A mot B og B mot A.
    for (const [p, f] of [['adminB', lokaltA], ['vanligB', lokaltA], ['adminA', lokaltB], ['vanligA', lokaltB], ['dobbeltAB', lokaltA]] as const) {
      expect(await kode(() => lesForslag(g.id[p as Person], f)), `${p}`).toBe('PT404')
    }
  })

  it('et fremmed forslag gir samme svar som et som ikke finnes, også for trekk og svar', async () => {
    const svaret = async (p: () => Promise<unknown>) => {
      const feil = await feilFra(p)
      return { code: feil?.code, message: feil?.message, detail: feil?.detail }
    }
    for (const [fremmed, finnesIkke] of [
      [() => lesForslag(g.id.vanligA, lokaltB), () => lesForslag(g.id.vanligA, INGEN)],
      [() => trekk(g.id.vanligA, lokaltB), () => trekk(g.id.vanligA, INGEN)],
      [() => svar(g.id.vanligA, lokaltB, 'x'), () => svar(g.id.vanligA, INGEN, 'x')],
    ] as const) {
      const a = await svaret(fremmed)
      expect(a.code).toBe('PT404')
      expect(a).toEqual(await svaret(finnesIkke))
    }
  })

  it('«Mine forslag» har bare den innloggedes egne, nyeste først', async () => {
    const egne = await mine(g.id.vanligA)
    expect(egne.length).toBeGreaterThan(1)
    expect(egne.every((f) => f.ressurs.id !== obj.regelsettB)).toBe(true)
    expect(egne.map((f) => f.id)).toContain(lokaltA)
    const tider = egne.map((f) => f.opprettet_kl)
    expect([...tider].sort().reverse()).toEqual(tider)
    expect((await mine(g.id.vanligB)).map((f) => f.id)).not.toContain(fagsideforslag)
    expect(await mine(g.id.vanligB)).toEqual(expect.arrayContaining([expect.objectContaining({ id: lokaltB, status: 'ny', venter_pa_meg: false })]))
  })

  it('uten aktivt medlemskap leses ingenting', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect(await kode(() => mine(g.id[p]))).toBe('42501')
      expect(await kode(() => lesForslag(g.id[p], fagsideforslag))).toBe('42501')
    }
  })

  it('den som mister medlemskapet i fagmiljøet, ser ikke lenger sitt forslag til det lokale innholdet der', async () => {
    const lokalt = await foreslaa(flyttet, { ressurs: obj.regelsettB })
    const felles = await foreslaa(flyttet, { ressurs: obj.fagside })
    await avsluttMedlemskap(db, flyttet, g.fagmiljo.B)
    expect(await kode(() => lesForslag(flyttet, lokalt))).toBe('PT404')
    expect(await kode(() => trekk(flyttet, lokalt))).toBe('PT404')
    expect((await mine(flyttet)).map((f) => f.id)).toEqual([felles])
    // Behandlerne i B ser det fortsatt.
    expect((await lesForslag(g.id.adminB, lokalt)).stilt_av.er_meg).toBe(false)
  })
})

describe('å følge og trekke forslaget', () => {
  it('bare forslagsstilleren kan trekke, og bare mens forslaget er åpent', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
    expect(await kode(() => trekk(g.id.systemarkitekt, id))).toBe('42501')
    expect(await kode(() => trekk(g.id.vanligB, id))).toBe('PT404')
    await trekk(g.id.vanligA, id, 'Feil side.')
    const f = await lesForslag(g.id.vanligA, id)
    expect(f).toMatchObject({ status: 'trukket', kan_trekke: false, kan_svare: false })
    expect(f.hendelser.at(-1)).toMatchObject({ art: 'trukket', tekst: 'Feil side.' })
    expect(await kode(() => trekk(g.id.vanligA, id))).toBe('PT409')
    expect(await kode(() => svar(g.id.vanligA, id, 'Likevel'))).toBe('PT409')
  })

  it('et godkjent eller avvist forslag kan ikke trekkes', async () => {
    for (const til of ['godkjent', 'avvist'] as const) {
      const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
      await overgang(id, ['ny'], til, til)
      expect(await kode(() => trekk(g.id.vanligA, id))).toBe('PT409')
      expect((await lesForslag(g.id.vanligA, id)).kan_trekke).toBe(false)
    }
  })

  it('svaret på en presisering sender forslaget tilbake til behandling; ellers er det en kommentar', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
    await svar(g.id.vanligA, id, '  Et tillegg. ')
    expect((await lesForslag(g.id.vanligA, id)).status).toBe('ny')
    await overgang(id, ['ny'], 'venter_pa_forslagsstiller', 'presisering_bedt')
    expect((await mine(g.id.vanligA)).find((f) => f.id === id)).toMatchObject({ venter_pa_meg: true })
    expect(await kode(() => svar(g.id.vanligA, id, '   '))).toBe('22023')
    expect(await kode(() => svar(g.id.systemarkitekt, id, 'Jeg svarer'))).toBe('42501')
    await svar(g.id.vanligA, id, 'Presiseringen.')
    const f = await lesForslag(g.id.systemarkitekt, id)
    expect(f.status).toBe('under_behandling')
    expect(f.hendelser.map((h: { art: string }) => h.art)).toEqual(['opprettet', 'kommentar', 'presisering_bedt', 'presisering'])
    expect(f.hendelser[1]).toMatchObject({ tekst: 'Et tillegg.', utfort_av: { er_meg: false, navn: 'Test vanligA' } })
    expect(f.hendelser[2].utfort_av).toEqual({ er_meg: true, navn: 'Test systemarkitekt' })
  })

  it('overgangen avviser en status som er endret i mellomtiden', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside })
    await overgang(id, ['ny'], 'under_behandling', 'tatt')
    expect(await kode(() => overgang(id, ['ny'], 'under_behandling', 'tatt'))).toBe('PT409')
    expect(await kode(() => overgang(INGEN, ['ny'], 'under_behandling', 'tatt'))).toBe('PT404')
  })

  it('konflikten vises når innholdet er publisert på nytt etter at forslaget ble skrevet', async () => {
    const id = await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort, sideversjon })
    const innhold = { infoside: obj.fagside, panel: 'viktige_data', posisjon: 0, elementtype: 'referanseomrade', data: { nedre: 1, ovre: 4, enhet: 'nmol/L', forbehold: '' }, referanser: [] }
    await kall.lagre(obj.kort, 1, innhold)
    expect((await lesForslag(g.id.systemarkitekt, id)).konflikt).toMatchObject({ endret_siden: false, utkast_endret: true })
    expect((await lesForslag(g.id.vanligA, id)).konflikt.utkast_endret).toBeNull()
    await kall.publiser(obj.kort, 2)
    const f = await lesForslag(g.id.vanligA, id)
    expect(f.konflikt).toMatchObject({ grunnrevisjon: 1, publisert_revisjon: 2, endret_siden: true, side_endret_siden: true })
    expect(f.konflikt.publisert_sideversjon).toBeGreaterThan(sideversjon)
    // Et nytt forslag kan fortsatt bygge på den forrige publiserte versjonen.
    await foreslaa(g.id.vanligA, { ressurs: obj.fagside, element: obj.kort, grunnrevisjon: 1, sideversjon })
  })
})

describe('katalogen', () => {
  it('hjelperne kan ikke kalles fra nettleseren', async () => {
    const { rows } = await db.query<{ navn: string; kan: boolean }>(
      `select p.proname as navn,
              has_function_privilege('authenticated', p.oid, 'execute') or has_function_privilege('anon', p.oid, 'execute') as kan
       from pg_proc p
       where p.pronamespace = 'intern'::regnamespace
         and p.proname in ('apne_forslagsstatuser', 'maks_apne_forslag', 'kan_se_forslag', 'forslagsovergang',
                           'forslagskilder', 'forslagsperson', 'eget_forslag', 'forslagskonflikt')`,
    )
    expect(rows).toHaveLength(8)
    expect(rows.filter((r) => r.kan)).toEqual([])
  })
})
