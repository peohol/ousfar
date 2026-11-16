/**
 * P5 tråd C2: behandlingen av endringsforslagene (docs/redaktorer-og-forslag.md,
 * «Behandling» og «Varsler»). Prøver arbeidskøen, hver handling for hver rolle,
 * A mot B, en status som er endret underveis, konflikten, varslenes mottakere,
 * og at ingenting publiseres eller endres i innholdet. Persongalleriet og
 * syntetiske data.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, describe, expect, it } from 'vitest'
import { regelimportSql } from '../regler/import'
import { DAGENS_IMPORT } from './hjelp/dagensregler'
import { byggPersongalleri, opprettMedlem, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, opprettBruker, type Faginnholdskall } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall
const obj = { fagside: '', kort: '', annetKort: '', regelsettA: '', regelsettB: '' }

const INGEN = '00000000-0000-4000-8000-000000000000'
const KORTINNHOLD = (ovre: number) => ({
  infoside: '',
  panel: 'viktige_data',
  posisjon: 0,
  elementtype: 'referanseomrade',
  data: { nedre: 1, ovre, enhet: 'nmol/L', forbehold: '' },
  referanser: [],
})

const rpc = <T>(bruker: string | null, funksjon: string, argumenter: Record<string, unknown> = {}) =>
  kall.rpc<Record<string, T>>(bruker, funksjon, argumenter).then((rad) => rad[funksjon] as T)
const kode = async (p: () => Promise<unknown>) => (await feilFra(p))?.code ?? null

const foreslaa = (bruker: string, ressurs: string, element: string | null = null) =>
  rpc<string>(bruker, 'foresla_endring', {
    ressurs,
    element,
    grunnrevisjon: 1,
    sideversjon: null,
    sted: null,
    utdrag: null,
    forslag: 'Syntetisk forslag.',
    begrunnelse: 'Syntetisk begrunnelse.',
    kilder: [],
  })

type Ko = { antall: { nye: number; pagaende: number; uten_redaktor: number; mine: number }; nye: any[]; pagaende: any[]; ferdige: any[] }
const ko = (bruker: string, filter = 'aktive') => rpc<Ko>(bruker, 'les_forslagsko', { filter })
const iKo = async (bruker: string, forslag: string, filter = 'alle') => {
  const k = await ko(bruker, filter)
  return [...k.nye, ...k.pagaende, ...k.ferdige].find((f) => f.id === forslag) ?? null
}
const les = (bruker: string, forslag: string) => rpc<Record<string, any>>(bruker, 'les_forslag', { forslag })
const ta = (bruker: string, forslag: string) => rpc(bruker, 'ta_forslag', { forslag })
const kommenter = (bruker: string, forslag: string, tekst = 'Syntetisk kommentar.') => rpc(bruker, 'kommenter_forslag', { forslag, tekst })
const presisering = (bruker: string, forslag: string, tekst = 'Hvilken kilde?') => rpc(bruker, 'be_om_presisering', { forslag, tekst })
const godkjenn = (bruker: string, forslag: string, begrunnelse: string | null = null) => rpc(bruker, 'godkjenn_forslag', { forslag, begrunnelse })
const avvis = (bruker: string, forslag: string, begrunnelse: string | null = 'Syntetisk avslag.') =>
  rpc(bruker, 'avvis_forslag', { forslag, begrunnelse })
const innarbeid = (bruker: string, forslag: string, objekt?: string, revisjon?: number) =>
  rpc(bruker, 'marker_forslag_innarbeidet', { forslag, ...(objekt && { objekt }), ...(revisjon && { revisjon }) })
const svar = (bruker: string, forslag: string, tekst = 'Syntetisk svar.') => rpc(bruker, 'svar_pa_forslag', { forslag, tekst })
const trekk = (bruker: string, forslag: string) => rpc(bruker, 'trekk_forslag', { forslag, begrunnelse: null })

const status = async (forslag: string) =>
  (await db.query<{ status: string }>('select status from public.endringsforslag where id = $1', [forslag])).rows[0]!.status
const arter = async (forslag: string) =>
  (await db.query<{ art: string }>('select art from public.endringsforslag_hendelser where forslag_id = $1 order by id', [forslag])).rows.map((r) => r.art)

/** Varslene om ett forslag, per mottaker og kategori, slik databasen har lagret dem. */
const varslerOm = async (forslag: string) =>
  (
    await db.query<{ mottaker_id: string; kategori: string; fagmiljo_id: string | null; arter: string[] }>(
      `select mottaker_id, kategori::text, fagmiljo_id, array(select h ->> 'art' from jsonb_array_elements(hendelser) h) as arter
       from public.varsler where hendelser @> jsonb_build_array(jsonb_build_object('forslag', $1::text))
       order by mottaker_id, kategori`,
      [forslag],
    )
  ).rows

/**
 * Mottakerne av et nytt forslag til ressursen: redaktørene med ansvar, ellers
 * de med myndighet. Hvem som er redaktør, avgjøres av tråd A og persongalleriet,
 * så testene her spør databasen i stedet for å anta at ingen er det.
 */
const forslagsbehandlere = async (ressurs: string) =>
  new Set((await db.query<{ id: string }>('select intern.forslagsbehandlere($1) as id', [ressurs])).rows.map((r) => r.id))

/** Alt i faginnholdet som kan endres, slik det står. */
const innholdsfasit = () =>
  db
    .query(
      `select (select jsonb_agg(t order by t.objekt_id, t.tilstand) from public.objekttilstander t) as tilstander,
              (select count(*) from public.objektrevisjoner) as revisjoner,
              (select count(*) from public.objektpubliseringer) as publiseringer,
              (select count(*) from public.sideversjoner) as sideversjoner`,
    )
    .then((r) => r.rows[0])

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  await db.exec(regelimportSql(DAGENS_IMPORT, 'test.systemarkitekt'))
  kall = faginnholdskall(db, g.id.systemarkitekt)

  const side = await kall.opprett('infoside', { navn: 'Behandlingsmiddel' })
  obj.fagside = side.id
  obj.kort = (await kall.opprett('innholdselement', { ...KORTINNHOLD(2), infoside: side.id })).id
  for (const id of [obj.fagside, obj.kort]) await kall.publiser(id, 1)
  const annen = await kall.opprett('infoside', { navn: 'Annet behandlingsmiddel' })
  obj.annetKort = (await kall.opprett('innholdselement', { ...KORTINNHOLD(2), infoside: annen.id })).id
  for (const id of [annen.id, obj.annetKort]) await kall.publiser(id, 1)

  const { rows } = await db.query<{ objekt_id: string }>(
    `select objekt_id from public.intervallregelsett where tilstand = 'publisert' order by analyttkode limit 2`,
  )
  obj.regelsettA = rows[0]!.objekt_id
  obj.regelsettB = rows[1]!.objekt_id
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
}, 120_000)

describe('arbeidskøen', () => {
  let felles = ''
  let lokaltA = ''
  let lokaltB = ''

  beforeAll(async () => {
    felles = await foreslaa(g.id.vanligA, obj.fagside, obj.kort)
    lokaltA = await foreslaa(g.id.vanligA, obj.regelsettA)
    lokaltB = await foreslaa(g.id.vanligB, obj.regelsettB)
  })

  it('systemarkitektene ser alle forslagene, som nye og uten redaktør', async () => {
    const k = await ko(g.id.systemarkitekt)
    const ider = k.nye.map((f) => f.id)
    expect(ider).toEqual(expect.arrayContaining([felles, lokaltA, lokaltB]))
    const f = k.nye.find((x) => x.id === felles)
    expect(f).toMatchObject({ status: 'ny', uten_redaktor: true, endret_siden: false, har_behandler: false, sammendrag: 'Syntetisk forslag.' })
    expect(f.ressurs).toMatchObject({ id: obj.fagside, type: 'infoside', navn: 'Behandlingsmiddel' })
    expect(f.stilt_av).toMatchObject({ er_meg: false, navn: expect.any(String) })
    expect(k.antall.nye).toBeGreaterThanOrEqual(3)
    // Tallet stemmer med merkene; hvem som har redaktør, avgjør tråd A.
    expect(k.antall.uten_redaktor).toBe([...k.nye, ...k.pagaende].filter((x) => x.uten_redaktor).length)
  })

  it('en lokal administrator ser bare forslagene til det lokale innholdet i eget fagmiljø', async () => {
    const a = (await ko(g.id.adminA)).nye.map((f) => f.id)
    expect(a).toContain(lokaltA)
    expect(a).not.toContain(lokaltB)
    expect(a).not.toContain(felles)
    const b = (await ko(g.id.adminB)).nye.map((f) => f.id)
    expect(b).toEqual([lokaltB])
  })

  it('en vanlig bruker har ingen kø, heller ikke for egne forslag', async () => {
    const k = await ko(g.id.vanligA)
    expect(k).toEqual({ antall: { nye: 0, pagaende: 0, uten_redaktor: 0, mine: 0 }, nye: [], pagaende: [], ferdige: [] })
  })

  it('«antall» gir bare tallene, og et ukjent utvalg avvises', async () => {
    const k = await ko(g.id.adminB, 'antall')
    expect(k).toEqual({ antall: { nye: 1, pagaende: 0, uten_redaktor: 1, mine: 0 }, nye: [], pagaende: [], ferdige: [] })
    expect(await kode(() => ko(g.id.adminB, 'hemmelig'))).toBe('22023')
  })

  it('uten aktivt medlemskap, også med gyldig token, er det ingen kø', async () => {
    expect(await kode(() => ko(g.id.utenMedlemskap))).not.toBeNull()
    expect(await kode(() => ko(g.id.tidligereAdmin))).not.toBeNull()
  })

  it('et forslag som er tatt, står som pågående; et avgjort som ferdig når det bes om', async () => {
    await ta(g.id.adminB, lokaltB)
    let k = await ko(g.id.adminB)
    expect(k.pagaende.map((f) => f.id)).toEqual([lokaltB])
    expect(k.pagaende[0]).toMatchObject({ status: 'under_behandling', har_behandler: true, behandler_er_meg: true })
    expect(k.antall).toMatchObject({ nye: 0, pagaende: 1, mine: 1 })
    await avvis(g.id.adminB, lokaltB)
    k = await ko(g.id.adminB)
    expect(k.pagaende).toEqual([])
    expect(k.ferdige).toEqual([])
    expect((await ko(g.id.adminB, 'ferdige')).ferdige.map((f) => f.id)).toEqual([lokaltB])
  })

  it('køen viser når innholdet er endret siden forslaget ble skrevet', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside)
    expect((await iKo(g.id.systemarkitekt, id))!.endret_siden).toBe(false)
    const forslagKort = await foreslaa(g.id.vanligA, obj.fagside, obj.kort)
    await kall.lagre(obj.kort, 1, { ...KORTINNHOLD(3), infoside: obj.fagside })
    await kall.publiser(obj.kort, 2)
    expect((await iKo(g.id.systemarkitekt, forslagKort))!.endret_siden).toBe(true)
    // Et forslag til hele siden ser også at et kort er publisert på nytt (sideversjonen).
    expect((await iKo(g.id.systemarkitekt, id))!.endret_siden).toBe(true)
  })
})

describe('behandlingen', () => {
  it('å ta et forslag gjør den innloggede til behandler; en annen kan ta det over', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    await ta(g.id.adminA, id)
    expect(await status(id)).toBe('under_behandling')
    expect((await les(g.id.vanligA, id)).behandler).toMatchObject({ er_meg: false })
    await ta(g.id.adminA, id) // Samme behandler: ingenting skjer.
    await ta(g.id.systemarkitekt, id)
    expect(await arter(id)).toEqual(['opprettet', 'tatt', 'tatt'])
    expect((await les(g.id.systemarkitekt, id)).behandler).toMatchObject({ er_meg: true })
  })

  it('A mot B: en lokal administrator kan ikke se eller behandle forslag til et annet fagmiljø', async () => {
    const id = await foreslaa(g.id.vanligB, obj.regelsettB)
    for (const handling of [
      () => ta(g.id.adminA, id),
      () => kommenter(g.id.adminA, id),
      () => presisering(g.id.adminA, id),
      () => godkjenn(g.id.adminA, id),
      () => avvis(g.id.adminA, id),
      () => innarbeid(g.id.adminA, id, obj.regelsettB, 1),
    ]) {
      expect(await kode(handling)).toBe('PT404')
    }
    // Og samme svar for et forslag som ikke finnes.
    expect(await kode(() => ta(g.id.adminA, INGEN))).toBe('PT404')
    expect(await status(id)).toBe('ny')
  })

  it('forslagsstilleren og andre vanlige brukere kan ikke behandle', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside)
    expect(await kode(() => ta(g.id.vanligA, id))).toBe('42501')
    expect(await kode(() => godkjenn(g.id.vanligA, id))).toBe('42501')
    expect(await kode(() => ta(g.id.dobbeltAB, id))).toBe('PT404')
    expect(await kode(() => ta(g.id.adminA, id))).toBe('PT404')
    expect(await kode(() => ta(g.id.utenMedlemskap, id))).not.toBeNull()
    expect(await status(id)).toBe('ny')
  })

  it('en behandler kan behandle sitt eget forslag', async () => {
    const id = await foreslaa(g.id.adminA, obj.regelsettA)
    await godkjenn(g.id.adminA, id)
    expect(await status(id)).toBe('godkjent')
  })

  it('presisering: forslaget venter på forslagsstilleren, og svaret sender det tilbake', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    expect(await kode(() => presisering(g.id.adminA, id, '  '))).toBe('22023')
    await presisering(g.id.adminA, id)
    expect(await status(id)).toBe('venter_pa_forslagsstiller')
    expect(await kode(() => godkjenn(g.id.adminA, id))).toBe('PT409')
    expect(await kode(() => presisering(g.id.adminA, id))).toBe('PT409')
    await svar(g.id.vanligA, id)
    expect(await status(id)).toBe('under_behandling')
    expect(await arter(id)).toEqual(['opprettet', 'tatt', 'presisering_bedt', 'presisering'])
  })

  it('en kommentar tar et nytt forslag, og står i tidslinjen', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    expect(await kode(() => kommenter(g.id.adminA, id, ''))).toBe('22023')
    expect(await kode(() => kommenter(g.id.adminA, id, 'x'.repeat(4001)))).toBe('22023')
    await kommenter(g.id.adminA, id, 'Takk, vi ser på det.')
    expect(await status(id)).toBe('under_behandling')
    const f = await les(g.id.vanligA, id)
    expect(f.hendelser.map((h: any) => [h.art, h.tekst])).toEqual([
      ['opprettet', null],
      ['tatt', null],
      ['kommentar', 'Takk, vi ser på det.'],
    ])
  })

  it('godkjenning: setter vedtaket, men publiserer og endrer ingenting', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    const for_ = await innholdsfasit()
    await godkjenn(g.id.adminA, id, 'Godt forslag.')
    expect(await innholdsfasit()).toEqual(for_)
    const f = await les(g.id.vanligA, id)
    expect(f.status).toBe('godkjent')
    expect(f.vedtak).toMatchObject({ begrunnelse: 'Godt forslag.', kl: expect.any(String) })
    expect(await arter(id)).toEqual(['opprettet', 'tatt', 'godkjent'])
    // Et godkjent forslag kan ikke trekkes, avvises eller godkjennes igjen.
    expect(await kode(() => trekk(g.id.vanligA, id))).toBe('PT409')
    expect(await kode(() => avvis(g.id.adminA, id))).toBe('PT409')
    expect(await kode(() => godkjenn(g.id.adminA, id))).toBe('PT409')
  })

  it('avvisning krever begrunnelse, og kan gjøres mens forslaget venter på svar', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    expect(await kode(() => avvis(g.id.adminA, id, null))).toBe('22023')
    expect(await kode(() => avvis(g.id.adminA, id, '   '))).toBe('22023')
    expect(await status(id)).toBe('ny')
    await presisering(g.id.adminA, id)
    await avvis(g.id.adminA, id, 'Kilden mangler.')
    const f = await les(g.id.vanligA, id)
    expect(f).toMatchObject({ status: 'avvist', vedtak: { begrunnelse: 'Kilden mangler.' } })
    // En kommentar etter vedtaket går fortsatt, men ingen ny handling.
    await kommenter(g.id.adminA, id, 'Send gjerne et nytt forslag med kilde.')
    expect(await kode(() => ta(g.id.adminA, id))).toBe('PT409')
    expect(await kode(() => svar(g.id.vanligA, id))).toBe('PT409')
  })

  it('et trukket forslag kan ikke behandles', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    await trekk(g.id.vanligA, id)
    for (const handling of [() => ta(g.id.adminA, id), () => kommenter(g.id.adminA, id), () => godkjenn(g.id.adminA, id), () => avvis(g.id.adminA, id)]) {
      expect(await kode(handling)).toBe('PT409')
    }
  })

  it('en status som er endret underveis, avviser det andre vedtaket', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    await ta(g.id.adminA, id)
    await godkjenn(g.id.systemarkitekt, id)
    expect(await kode(() => avvis(g.id.adminA, id))).toBe('PT409')
    expect(await status(id)).toBe('godkjent')
  })

  it('samtidige vedtak: bare det første går gjennom', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    await ta(g.id.adminA, id)
    const resultater = await Promise.allSettled([godkjenn(g.id.adminA, id), avvis(g.id.systemarkitekt, id)])
    expect(resultater.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(['godkjent', 'avvist']).toContain(await status(id))
    expect((await arter(id)).filter((a) => a === 'godkjent' || a === 'avvist')).toHaveLength(1)
  })

  it('godkjenning når innholdet er endret siden: konflikten står i tidslinjen', async () => {
    const annenSide = (await db.query<{ s: string }>('select infoside_id as s from public.innholdselementer where objekt_id = $1 limit 1', [obj.annetKort]))
      .rows[0]!.s
    const id = await foreslaa(g.id.vanligA, annenSide, obj.annetKort)
    await kall.lagre(obj.annetKort, 1, { ...KORTINNHOLD(5), infoside: annenSide })
    await kall.publiser(obj.annetKort, 2)
    await godkjenn(g.id.systemarkitekt, id)
    const hendelser = (await les(g.id.systemarkitekt, id)).hendelser
    expect(hendelser.map((h: any) => h.art)).toEqual(['opprettet', 'tatt', 'konflikt_sett', 'godkjent'])
    expect(hendelser[2].data).toMatchObject({ grunnrevisjon: 1, publisert_revisjon: 2, endret_siden: true })
  })
})

describe('innarbeidingen', () => {
  it('kobler et godkjent forslag til en revisjon av et objekt i ressursen', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside, obj.kort)
    expect(await kode(() => innarbeid(g.id.systemarkitekt, id, obj.kort, 1))).toBe('PT409')
    await godkjenn(g.id.systemarkitekt, id)
    expect(await kode(() => innarbeid(g.id.systemarkitekt, id, obj.annetKort, 1))).toBe('22023')
    expect(await kode(() => innarbeid(g.id.systemarkitekt, id, obj.kort, 999))).toBe('22023')
    expect(await kode(() => innarbeid(g.id.vanligA, id, obj.kort, 1))).toBe('42501')
    const for_ = await innholdsfasit()
    await innarbeid(g.id.systemarkitekt, id, obj.kort, 1)
    expect(await innholdsfasit()).toEqual(for_)
    const f = await les(g.id.vanligA, id)
    expect(f).toMatchObject({ status: 'innarbeidet', innarbeidet: { objekt: obj.kort, revisjon: 1 } })
    expect(f.hendelser.at(-1)).toMatchObject({ art: 'innarbeidet', data: { objekt: obj.kort, revisjon: 1 } })
    expect(await kode(() => innarbeid(g.id.systemarkitekt, id, obj.kort, 1))).toBe('PT409')
  })

  it('uten objekt og revisjon gjelder det elementet forslaget gjelder, på revisjonen utkastet står på', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside, obj.kort)
    await godkjenn(g.id.systemarkitekt, id)
    const utkast = (
      await db.query<{ revisjon: number }>("select revisjon from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'", [obj.kort])
    ).rows[0]!.revisjon
    await innarbeid(g.id.systemarkitekt, id)
    expect((await les(g.id.vanligA, id)).innarbeidet).toEqual({ objekt: obj.kort, revisjon: utkast })
    const helside = await foreslaa(g.id.vanligA, obj.fagside)
    await godkjenn(g.id.systemarkitekt, helside)
    await innarbeid(g.id.systemarkitekt, helside)
    expect((await les(g.id.vanligA, helside)).innarbeidet).toMatchObject({ objekt: obj.fagside })
  })

  it('fagsiden selv kan også være revisjonen', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside)
    await godkjenn(g.id.systemarkitekt, id)
    await innarbeid(g.id.systemarkitekt, id, obj.fagside, 1)
    expect(await status(id)).toBe('innarbeidet')
  })
})

describe('varslene', () => {
  it('et nytt forslag til felles innhold går til systemarkitektene, ikke til andre', async () => {
    const id = await foreslaa(g.id.vanligA, obj.fagside)
    const v = await varslerOm(id)
    expect(v.map((x) => [x.mottaker_id, x.kategori, x.fagmiljo_id, x.arter])).toEqual(
      [
        [g.id.systemarkitekt, 'forslag_til_behandling', null, ['opprettet']],
        [g.id.arkitektB, 'forslag_til_behandling', null, ['opprettet']],
      ].sort((a, b) => String(a[0]).localeCompare(String(b[0]))),
    )
  })

  it('et nytt forslag til lokalt innhold går til fagmiljøets administratorer og arkitektene, med fagmiljøet', async () => {
    const id = await foreslaa(g.id.vanligB, obj.regelsettB)
    const v = await varslerOm(id)
    expect(v.map((x) => x.mottaker_id).sort()).toEqual([g.id.adminB, g.id.arkitektB, g.id.systemarkitekt].sort())
    expect(v.every((x) => x.fagmiljo_id === g.fagmiljo.B && x.kategori === 'forslag_til_behandling')).toBe(true)
    expect(v.map((x) => x.mottaker_id)).not.toContain(g.id.adminA)
  })

  it('behandlerens handlinger går til forslagsstilleren, og svaret til behandleren', async () => {
    const id = await foreslaa(g.id.vanligA, obj.regelsettA)
    await presisering(g.id.adminA, id)
    let mine = (await varslerOm(id)).filter((x) => x.mottaker_id === g.id.vanligA)
    expect(mine.map((x) => [x.kategori, x.arter])).toEqual([['mine_forslag', ['tatt', 'presisering_bedt']]])
    await svar(g.id.vanligA, id)
    // Det nye forslaget gikk til mottakerne av nye forslag; svaret bare til
    // behandleren som har tatt det, samlet med det nye i ett ulest varsel
    // når behandleren også fikk det.
    const mottakere = await forslagsbehandlere(obj.regelsettA)
    const tilBehandling = (await varslerOm(id)).filter((x) => x.kategori === 'forslag_til_behandling')
    expect(tilBehandling.length).toBeGreaterThan(0)
    for (const v of tilBehandling) {
      const nytt = mottakere.has(v.mottaker_id) ? ['opprettet'] : []
      expect([v.mottaker_id, v.arter]).toEqual([v.mottaker_id, v.mottaker_id === g.id.adminA ? [...nytt, 'presisering'] : ['opprettet']])
    }
    expect(new Set(tilBehandling.map((v) => v.mottaker_id).filter((m) => m !== g.id.adminA))).toEqual(
      new Set([...mottakere].filter((m) => m !== g.id.adminA && m !== g.id.vanligA)),
    )
    await godkjenn(g.id.adminA, id)
    mine = (await varslerOm(id)).filter((x) => x.mottaker_id === g.id.vanligA)
    expect(mine.map((x) => x.arter)).toEqual([['tatt', 'presisering_bedt', 'godkjent']])
  })

  it('den som gjorde det, varsles ikke; heller ikke en behandler med sitt eget forslag', async () => {
    const id = await foreslaa(g.id.adminA, obj.regelsettA)
    await godkjenn(g.id.adminA, id)
    expect((await varslerOm(id)).filter((x) => x.mottaker_id === g.id.adminA)).toEqual([])
  })

  it('varselet vises med forslaget og ressursen, og forsvinner når mottakeren ikke lenger kan se forslaget', async () => {
    const person = await opprettBruker(db, { brukernavn: 'test.forslagsvarsel', fornavn: 'Test', etternavn: 'Varsel', rolle: 'user' })
    // Fagmiljø B og regelsettet der, som ingen redaktør i persongalleriet har
    // ansvaret for; da får de lokale administratorene nye forslag.
    const { rows: m } = await db.query(`select 1 from public.medlemskap where bruker_id = $1 and fagmiljo_id = $2 and status = 'aktiv'`, [
      person,
      g.fagmiljo.B,
    ])
    if (m.length === 0) await opprettMedlem(db, person, g.fagmiljo.B)
    const medGrunn = (sql: string) =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('ousfar.tilgangsgrunn', 'P5-test: lokal administrator (syntetisk)', true)`)
        await tx.query(sql, [person, g.fagmiljo.B])
      })
    await medGrunn('insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)')
    expect(await forslagsbehandlere(obj.regelsettB)).toContain(person)
    const id = await foreslaa(g.id.vanligB, obj.regelsettB)
    const varsler = async () =>
      (await rpc<{ varsler: any[] }>(person, 'mine_varsler')).varsler.filter((v) => v.kategori === 'forslag_til_behandling')
    const [v] = await varsler()
    expect(v.hendelser).toEqual([
      expect.objectContaining({
        art: 'opprettet',
        av: g.id.vanligB,
        forslag: expect.objectContaining({ id, ressurs: expect.objectContaining({ id: obj.regelsettB }) }),
      }),
    ])
    expect((await rpc<Record<string, number>>(person, 'uleste_varsler')).forslag_til_behandling).toBe(1)
    // Fortsatt medlem i fagmiljøet, men ikke lenger administrator: forslaget kan ikke ses, og varselet heller ikke.
    await medGrunn('update public.fagmiljoadministratorer set til = now() where bruker_id = $1 and fagmiljo_id = $2 and til is null')
    expect(await varsler()).toEqual([])
    expect((await rpc<Record<string, number>>(person, 'uleste_varsler')).forslag_til_behandling).toBeUndefined()
  })
})

describe('katalogen', () => {
  it('hjelperne kan ikke kalles fra nettleseren, og alle behandlingsfunksjonene krever innlogging', async () => {
    const { rows } = await db.query<{ navn: string; skjema: string; auth: boolean; anon: boolean }>(
      `select p.proname as navn, p.pronamespace::regnamespace::text as skjema,
              has_function_privilege('authenticated', p.oid, 'execute') as auth,
              has_function_privilege('anon', p.oid, 'execute') as anon
       from pg_proc p
       where p.proname in ('krev_forslag_til_behandling', 'behandlertekst', 'ta_hvis_nytt', 'forslag_i_ko', 'varselforslag',
                           'endringsforslag_hendelser_varsle', 'les_forslagsko', 'ta_forslag', 'kommenter_forslag',
                           'be_om_presisering', 'godkjenn_forslag', 'avvis_forslag', 'marker_forslag_innarbeidet')
       order by 1`,
    )
    expect(rows.filter((r) => r.anon)).toEqual([])
    expect(rows.filter((r) => r.skjema === 'intern' && r.auth)).toEqual([])
    expect(rows.filter((r) => r.skjema === 'public').every((r) => r.auth)).toBe(true)
  })
})
