/**
 * P5 tråd A: redaktøransvaret (docs/redaktorer-og-forslag.md, «Redaktøransvar»;
 * supabase/migrations/20261116130500_redaktoransvar.sql), med persongalleriet
 * og syntetiske data.
 *
 * Prøver tildelingen og tilbakekallingen etter myndigheten, også de negative
 * (selvheving, fremmed fagmiljø, fremmed eller ugyldig ressurs, ikke-medlem,
 * avsluttet medlemskap, nasjonalt med bryteren av); at redaktøren leser og
 * endrer utkastene i området og ikke utenfor, ikke publiserer og ikke lager
 * fagsider eller referanser; at ansvaret faller bort med medlemskapet; at
 * oversiktene bare viser det den innloggede har myndighet over; og den
 * nasjonale ordningen med bryteren slått på i testen. Samtidige tildelinger:
 * `redaktoransvar.samtidighet.test.ts`.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  byggPersongalleri,
  giRedaktoransvar,
  opprettMedlem,
  settNasjonaleRedaktorer,
  type Person,
  type Persongalleri,
} from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

const KOMMENTAR = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })
const REGELSETT = (analyttkode: string, kommentar: string) => ({
  analyttkode,
  enhet: 'nmol/L',
  desimaler: 0,
  skillepunkter: [],
  intervaller: [{ niva: 'innenfor', handling: null, kommentar }],
  ringegrense: null,
  cutoff: null,
})

/** De syntetiske objektene testene prøver seg mot. */
const obj = {
  kommentar1: '',
  regelsett1: '',
  kommentar2: '',
  regelsett2: '',
  kommentarB: '',
  regelsettB: '',
  fagside: '',
  kort: '',
  referanse: '',
}
const UKJENT = '00000000-0000-4000-8000-0000000000ff'

const rpc = <T = unknown>(p: Person | string, funksjon: string, argumenter: Record<string, unknown> = {}) =>
  kall.rpc<Record<string, T>>(p in g.id ? g.id[p as Person] : p, funksjon, argumenter).then((rad) => Object.values(rad)[0] as T)

const kode = async (p: Person | string, funksjon: string, argumenter: Record<string, unknown> = {}) =>
  (await feilFra(() => rpc(p, funksjon, argumenter)))?.code ?? null

const gi = (p: Person, argumenter: Record<string, unknown>) => rpc<string>(p, 'tildel_redaktoransvar', argumenter)

/** Gjeldende revisjon av utkastet. */
const revisjon = async (id: string) =>
  (await db.query<{ r: number }>(`select revisjon as r from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`, [id])).rows[0]!.r

/** Det publiserte innholdet, uten radsikkerhet. */
const publisert = async (id: string) =>
  (await db.query<{ i: unknown }>(`select intern.les(o.type, o.id, 'publisert') as i from public.redigerbare_objekter o where o.id = $1`, [id])).rows[0]!.i

/** Om personen ser utkastet til objektet gjennom radsikkerheten. */
const serUtkastet = (p: Person, id: string) =>
  som(db, g.id[p], async (tx) => (await tx.query(`select 1 from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`, [id])).rows.length > 0)

/** Lagrer regelsettet med kommentarene som personen. */
const lagreRegelsett = async (p: Person, regelsett: string, innhold: object, kommentarer: object[] = []) =>
  rpc(p, 'lagre_intervallregelsett', { objekt: regelsett, forventet_revisjon: await revisjon(regelsett), innhold, kommentarer })

/** Lagrer kommentaren med ny tekst som personen. */
const lagreKommentar = async (p: Person, id: string, navn: string) =>
  rpc(p, 'lagre_utkast', { objekt: id, forventet_revisjon: await revisjon(id), innhold: KOMMENTAR(navn) })

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)

  // Lokalt i A, lagd og publisert av administratoren der (arbeidskonteksten A).
  const opprettPubliser = async (av: Person, type: string, innhold: object) => {
    const id = (await kall.opprett(type as never, innhold as never, g.id[av])).id
    await kall.publiser(id, 1, g.id[av])
    return id
  }
  obj.kommentar1 = await opprettPubliser('adminA', 'kommentar', KOMMENTAR('P5 kommentar 1'))
  obj.regelsett1 = await opprettPubliser('adminA', 'intervallregelsett', REGELSETT('P5TESTEN', obj.kommentar1))
  obj.kommentar2 = await opprettPubliser('adminA', 'kommentar', KOMMENTAR('P5 kommentar 2'))
  obj.regelsett2 = await opprettPubliser('adminA', 'intervallregelsett', REGELSETT('P5TESTTO', obj.kommentar2))
  // Lokalt i B.
  obj.kommentarB = await opprettPubliser('adminB', 'kommentar', KOMMENTAR('P5 kommentar B'))
  obj.regelsettB = await opprettPubliser('adminB', 'intervallregelsett', REGELSETT('P5TESTB', obj.kommentarB))
  // Felles: en fagside med et kort, og en referanse.
  obj.fagside = await opprettPubliser('systemarkitekt', 'infoside', { navn: 'Redaktørmiddel' })
  obj.kort = await opprettPubliser('systemarkitekt', 'innholdselement', {
    infoside: obj.fagside,
    panel: 'viktige_data',
    posisjon: 0,
    elementtype: 'referanseomrade',
    data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
    referanser: [],
  })
  obj.referanse = (await kall.opprett('referanse', { tittel: 'Kilde', forfattere: 'Nordmann O', aar: '2021', lenke: 'https://example.org/r' })).id

  // Redaktøren for ett regelsett i A.
  await giRedaktoransvar(db, g.id.redaktorRessursA, { omrade: 'ressurs', ressurs: obj.regelsett1 })
}, 120_000)

afterAll(async () => {
  await db.close()
})

describe('tildelingen', () => {
  it('lar en lokal administrator gi ansvar i eget fagmiljø, og kallet kan gjentas', async () => {
    const id = await gi('adminA', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.regelsett2, merknad: '  Tar seg av to  ' })
    expect(await gi('adminA', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.regelsett2 })).toBe(id)
    const { rows } = await db.query<{ tildelt_av: string; merknad: string }>('select tildelt_av, merknad from public.redaktoransvar where id = $1', [id])
    expect(rows[0]).toEqual({ tildelt_av: g.id.adminA, merknad: 'Tar seg av to' })
    // Føres i tilgangsloggen med aktøren og begrunnelsen.
    const logg = await db.query<{ aktor: string; grunn: string }>(
      `select aktor, grunn from public.tilgangslogg where handling = 'redaktoransvar.insert' and bruker_id = $1`,
      [g.id.vanligA],
    )
    expect(logg.rows).toEqual([{ aktor: g.id.adminA, grunn: 'Redaktøransvar gitt i administrasjonen' }])
    await rpc('adminA', 'tilbakekall_redaktoransvar', { ansvar: id })
  })

  it('lar en systemarkitekt gi lokalt ansvar i alle fagmiljøer', async () => {
    const id = await gi('systemarkitekt', { bruker: g.id.vanligB, omrade: 'fortolkning', fagmiljo: g.fagmiljo.B })
    expect(id).toMatch(/^[0-9a-f-]{36}$/)
    await rpc('systemarkitekt', 'tilbakekall_redaktoransvar', { ansvar: id })
  })

  it('avviser den uten myndighet, selvheving, fremmed fagmiljø og ugyldige mål', async () => {
    const tilfeller: [Person, Record<string, unknown>, string][] = [
      // Uten myndighet: en vanlig bruker og en redaktør.
      ['vanligA', { bruker: g.id.dobbeltAB, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '42501'],
      ['redaktorFortolkningA', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.regelsett1 }, '42501'],
      // Selvheving.
      ['adminA', { bruker: g.id.adminA, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '42501'],
      ['vanligA', { bruker: g.id.vanligA, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '42501'],
      // Fremmed fagmiljø: et regelsett den ikke kan lese, finnes ikke; fortolkningen der administreres ikke.
      ['adminB', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.regelsett1 }, 'PT404'],
      ['adminB', { bruker: g.id.dobbeltAB, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '42501'],
      ['adminA', { bruker: g.id.dobbeltAB, omrade: 'fortolkning', fagmiljo: g.fagmiljo.B }, '42501'],
      // Fremmed eller ugyldig ressurs.
      ['adminA', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: UKJENT }, 'PT404'],
      ['systemarkitekt', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.kort }, '22023'],
      ['systemarkitekt', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.referanse }, '22023'],
      ['systemarkitekt', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.kommentar1 }, '22023'],
      ['adminA', { bruker: g.id.vanligA, omrade: 'ressurs' }, '22023'],
      ['adminA', { bruker: g.id.vanligA, omrade: 'ressurs', ressurs: obj.regelsett1, fagmiljo: g.fagmiljo.A }, '22023'],
      ['adminA', { bruker: g.id.vanligA, omrade: 'alt' }, '22023'],
      ['adminA', { bruker: g.id.vanligA, omrade: 'fortolkning', fagmiljo: UKJENT }, 'P0002'],
      ['adminA', { bruker: UKJENT, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, 'P0002'],
      ['adminA', { bruker: g.id.vanligA, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A, merknad: 'x'.repeat(301) }, '22023'],
      // Ikke medlem, og avsluttet medlemskap.
      ['adminA', { bruker: g.id.vanligB, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '55000'],
      ['adminA', { bruker: g.id.avsluttetA, omrade: 'ressurs', ressurs: obj.regelsett1 }, '55000'],
      ['systemarkitekt', { bruker: g.id.utenMedlemskap, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '55000'],
      // Uten aktivt medlemskap selv.
      ['tidligereAdmin', { bruker: g.id.vanligA, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A }, '42501'],
    ]
    for (const [p, argumenter, forventet] of tilfeller) {
      expect(await kode(p, 'tildel_redaktoransvar', argumenter), `${p} ${JSON.stringify(argumenter)}`).toBe(forventet)
    }
    // Ingenting er gitt.
    const { rows } = await db.query<{ n: number }>('select count(*)::int as n from public.redaktoransvar where tilbakekalt_kl is null')
    expect(rows[0]!.n).toBe(2)
  })

  it('avviser nasjonalt ansvar mens bryteren er av, også direkte i tabellen', async () => {
    for (const [p, argumenter] of [
      ['systemarkitekt', { bruker: g.id.redaktorNasjonal, omrade: 'fagsider' }],
      ['systemarkitekt', { bruker: g.id.redaktorNasjonal, omrade: 'ressurs', ressurs: obj.fagside }],
      ['adminA', { bruker: g.id.redaktorNasjonal, omrade: 'fagsider' }],
    ] as const) {
      const feil = await feilFra(() => gi(p, argumenter))
      expect(feil?.code, p).toBe('42501')
    }
    expect((await feilFra(() => gi('systemarkitekt', { bruker: g.id.redaktorNasjonal, omrade: 'fagsider' })))?.message).toMatch(/ikke slått på/)
    expect((await feilFra(() => giRedaktoransvar(db, g.id.redaktorNasjonal, { omrade: 'fagsider' })))?.code).toBe('42501')
  })
})

describe('tilbakekallingen', () => {
  it('gjøres av den som kan gi ansvaret, en gang, og står i historikken', async () => {
    const id = await gi('adminA', { bruker: g.id.dobbeltAB, omrade: 'ressurs', ressurs: obj.regelsett2 })
    // Den uten myndighet over ansvaret får samme svar som for et som ikke finnes.
    expect(await kode('adminB', 'tilbakekall_redaktoransvar', { ansvar: id })).toBe('PT404')
    expect(await kode('vanligA', 'tilbakekall_redaktoransvar', { ansvar: id })).toBe('PT404')
    expect(await kode('adminA', 'tilbakekall_redaktoransvar', { ansvar: UKJENT })).toBe('PT404')
    // Redaktøren kan ikke tilbakekalle sitt eget.
    expect(await kode('dobbeltAB', 'tilbakekall_redaktoransvar', { ansvar: id })).toBe('42501')

    await rpc('adminA', 'tilbakekall_redaktoransvar', { ansvar: id })
    await rpc('adminA', 'tilbakekall_redaktoransvar', { ansvar: id })
    const { rows } = await db.query<{ av: string; kl: string | null }>('select tilbakekalt_av as av, tilbakekalt_kl as kl from public.redaktoransvar where id = $1', [id])
    expect(rows[0]!.av).toBe(g.id.adminA)
    expect(rows[0]!.kl).not.toBeNull()
    // Kan ikke gjenopprettes; et nytt gis i stedet.
    const gjenopprett = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test (syntetisk)', true)`)
        await tx.query('update public.redaktoransvar set tilbakekalt_kl = null, tilbakekalt_av = null where id = $1', [id])
      }),
    )
    expect(gjenopprett?.code).toBe('42501')
    const nytt = await gi('adminA', { bruker: g.id.dobbeltAB, omrade: 'ressurs', ressurs: obj.regelsett2 })
    expect(nytt).not.toBe(id)
    await rpc('adminA', 'tilbakekall_redaktoransvar', { ansvar: nytt })
  })
})

describe('redaktøren for ett regelsett', () => {
  it('leser og endrer utkastet til regelsettet og kommentarene det bruker, og ikke andre', async () => {
    expect(await serUtkastet('redaktorRessursA', obj.regelsett1)).toBe(true)
    expect(await serUtkastet('redaktorRessursA', obj.kommentar1)).toBe(true)
    expect(await serUtkastet('redaktorRessursA', obj.regelsett2)).toBe(false)
    expect(await serUtkastet('redaktorRessursA', obj.kommentar2)).toBe(false)
    expect(await serUtkastet('vanligA', obj.regelsett1)).toBe(false)

    const for_ = await publisert(obj.regelsett1)
    await lagreKommentar('redaktorRessursA', obj.kommentar1, 'P5 kommentar 1 endret')
    // Regelsettet med en ny kommentar det tar i bruk, i samme kall.
    const ny = '00000000-0000-4000-8000-00000000c001'
    await lagreRegelsett('redaktorRessursA', obj.regelsett1, { ...REGELSETT('P5TESTEN', ny) }, [
      { id: ny, revisjon: null, innhold: KOMMENTAR('P5 ny kommentar') },
    ])
    expect(await serUtkastet('redaktorRessursA', ny)).toBe(true)
    // Det publiserte er uendret.
    expect(await publisert(obj.regelsett1)).toEqual(for_)

    expect(await kode('redaktorRessursA', 'lagre_utkast', { objekt: obj.kommentar2, forventet_revisjon: 1, innhold: KOMMENTAR('Nei') })).toBe('42501')
    expect(
      await kode('redaktorRessursA', 'lagre_intervallregelsett', {
        objekt: obj.regelsett2,
        forventet_revisjon: 1,
        innhold: REGELSETT('P5TESTTO', obj.kommentar2),
        kommentarer: [],
      }),
    ).toBe('42501')
    // B sine finnes ikke for redaktøren.
    expect(await kode('redaktorRessursA', 'lagre_utkast', { objekt: obj.kommentarB, forventet_revisjon: 1, innhold: KOMMENTAR('Nei') })).toBe('PT404')
  })

  it('kan ikke lage en kommentar regelsettet ikke bruker, og lagringen rulles da tilbake', async () => {
    const for_ = await revisjon(obj.regelsett1)
    const ubrukt = '00000000-0000-4000-8000-00000000c002'
    const feil = await feilFra(() =>
      lagreRegelsett('redaktorRessursA', obj.regelsett1, REGELSETT('P5TESTEN', obj.kommentar1), [
        { id: ubrukt, revisjon: null, innhold: KOMMENTAR('P5 ubrukt') },
      ]),
    )
    expect(feil?.code).toBe('22023')
    expect(await revisjon(obj.regelsett1)).toBe(for_)
    expect((await db.query('select 1 from public.redigerbare_objekter where id = $1', [ubrukt])).rows).toEqual([])
    // Heller ikke alene, utenfor regelsettet.
    expect(await kode('redaktorRessursA', 'opprett_utkast', { objekttype: 'kommentar', innhold: KOMMENTAR('Alene') })).toBe('42501')
  })

  it('publiserer ikke, og lager ingen fagsider eller referanser', async () => {
    const feil = await feilFra(() => rpc('redaktorRessursA', 'publiser_utkast', { objekt: obj.regelsett1, forventet_revisjon: 1 }))
    expect(feil?.code).toBe('42501')
    expect(feil?.message).toMatch(/^Redaktører kan ikke publisere/)
    expect(await kode('redaktorRessursA', 'publiser_utkast', { objekt: obj.kommentar1, forventet_revisjon: 1 })).toBe('42501')
    expect(await kode('redaktorRessursA', 'opprett_utkast', { objekttype: 'infoside', innhold: { navn: 'Ny' } })).toBe('42501')
    expect(
      await kode('redaktorRessursA', 'opprett_utkast', { objekttype: 'referanse', innhold: { tittel: 'K', forfattere: 'N O', aar: '2020', lenke: 'https://example.org/k' } }),
    ).toBe('42501')
    expect(await kode('redaktorRessursA', 'slett_referanse', { objekt: obj.referanse, forventet_revisjon: 1 })).toBe('42501')
    // Administratoren publiserer det redaktøren har endret, den nye kommentaren først.
    for (const id of ['00000000-0000-4000-8000-00000000c001', obj.kommentar1, obj.regelsett1]) {
      await kall.publiser(id, await revisjon(id), g.id.adminA)
    }
  })

  it('endrer ikke en kommentar som et regelsett uten ansvar også bruker, men kan ta den i bruk uendret', async () => {
    // Et annet regelsett i A tar i bruk kommentaren (i utkastet).
    const delt = (await kall.opprett('intervallregelsett', REGELSETT('P5TESTDEL', obj.kommentar1) as never, g.id.adminA)).id
    const for_ = await revisjon(obj.kommentar1)
    expect(await kode('redaktorRessursA', 'lagre_utkast', { objekt: obj.kommentar1, forventet_revisjon: for_, innhold: KOMMENTAR('Nei') })).toBe('42501')
    expect(
      await feilFra(() =>
        lagreRegelsett('redaktorRessursA', obj.regelsett1, REGELSETT('P5TESTEN', obj.kommentar1), [
          { id: obj.kommentar1, revisjon: for_, innhold: KOMMENTAR('Nei') },
        ]),
      ).then((f) => f?.code),
    ).toBe('42501')
    expect(await revisjon(obj.kommentar1)).toBe(for_)
    // Uendret i bruk er lov.
    await lagreRegelsett('redaktorRessursA', obj.regelsett1, REGELSETT('P5TESTEN', obj.kommentar1))
    // Administratoren og fortolkningsredaktøren endrer den som før.
    await lagreKommentar('redaktorFortolkningA', obj.kommentar1, 'P5 kommentar 1 delt')

    // Med ansvar for begge regelsettene kan redaktøren endre den.
    const ansvar = await gi('adminA', { bruker: g.id.redaktorRessursA, omrade: 'ressurs', ressurs: delt })
    await lagreKommentar('redaktorRessursA', obj.kommentar1, 'P5 kommentar 1 delt og endret')
    await rpc('adminA', 'tilbakekall_redaktoransvar', { ansvar })
    expect(await kode('redaktorRessursA', 'lagre_utkast', { objekt: obj.kommentar1, forventet_revisjon: await revisjon(obj.kommentar1), innhold: KOMMENTAR('Nei') })).toBe(
      '42501',
    )
  })

  it('ser sitt eget ansvar, er redaktør i rettighetene og behandler forslag bare til regelsettet', async () => {
    const mine = await rpc<{ omrade: string; ressurs: { id: string; analyttkode: string }; nasjonalt: boolean; gjelder: boolean }[]>(
      'redaktorRessursA',
      'mine_redaktoransvar',
    )
    expect(mine).toMatchObject([{ omrade: 'ressurs', nasjonalt: false, gjelder: true, ressurs: { id: obj.regelsett1, analyttkode: 'P5TESTEN', analyttkoder: ['P5TESTEN'] } }])
    expect(await rpc('vanligA', 'mine_redaktoransvar')).toEqual([])
    expect((await rpc<{ redaktor: boolean; behandler_forslag: boolean }>('redaktorRessursA', 'mine_rettigheter'))).toMatchObject({
      redaktor: true,
      behandler_forslag: true,
    })
    const behandle = async (ressurs: string, p: Person) =>
      (await db.query<{ ja: boolean }>('select intern.kan_behandle_forslag($1, $2) as ja', [ressurs, g.id[p]])).rows[0]!.ja
    expect(await behandle(obj.regelsett1, 'redaktorRessursA')).toBe(true)
    expect(await behandle(obj.regelsett2, 'redaktorRessursA')).toBe(false)
    // Redaktørene får forslagene; administratoren bare når ingen har ansvaret (grunnmuren).
    const behandlere = async (ressurs: string) =>
      (await db.query<{ b: string }>('select b from intern.forslagsbehandlere($1) b', [ressurs])).rows.map((r) => r.b).sort()
    expect(await behandlere(obj.regelsett1)).toEqual([g.id.redaktorRessursA, g.id.redaktorFortolkningA].sort())
    expect(await behandlere(obj.regelsettB)).toEqual([g.id.arkitektB, g.id.adminB, g.id.systemarkitekt].sort())
  })

  it('vises ved ressursen for redaktørene og administratorene, og ikke for andre', async () => {
    const redaktorer = async (p: Person) =>
      (await rpc<{ bruker: { id: string } }[]>(p, 'ressursens_redaktoransvar', { ressurs: obj.regelsett1 })).map((a) => a.bruker.id).sort()
    const forventet = [g.id.redaktorRessursA, g.id.redaktorFortolkningA].sort()
    for (const p of ['redaktorRessursA', 'redaktorFortolkningA', 'adminA', 'systemarkitekt'] as const) expect(await redaktorer(p), p).toEqual(forventet)
    expect(await kode('vanligA', 'ressursens_redaktoransvar', { ressurs: obj.regelsett1 })).toBe('42501')
    // Et annet fagmiljøs ressurs, et element og noe som ikke finnes: som om den ikke fantes.
    expect(await kode('adminB', 'ressursens_redaktoransvar', { ressurs: obj.regelsett1 })).toBe('PT404')
    expect(await kode('adminA', 'ressursens_redaktoransvar', { ressurs: obj.kommentar1 })).toBe('PT404')
    expect(await kode('adminA', 'ressursens_redaktoransvar', { ressurs: UKJENT })).toBe('PT404')
  })
})

describe('redaktøren for fortolkningen', () => {
  it('leser og endrer alt lokalt innhold i fagmiljøet, også nye kommentarer, men ikke i et annet', async () => {
    expect(await serUtkastet('redaktorFortolkningA', obj.regelsett2)).toBe(true)
    expect(await serUtkastet('redaktorFortolkningA', obj.kommentar2)).toBe(true)
    expect(await serUtkastet('redaktorFortolkningA', obj.kommentarB)).toBe(false)
    expect(await serUtkastet('redaktorFortolkningA', obj.fagside)).toBe(false)

    await lagreKommentar('redaktorFortolkningA', obj.kommentar2, 'P5 kommentar 2 endret')
    await lagreRegelsett('redaktorFortolkningA', obj.regelsett2, REGELSETT('P5TESTTO', obj.kommentar2))
    const ny = (await kall.opprett('kommentar', KOMMENTAR('P5 fra redaktøren'), g.id.redaktorFortolkningA)).id
    const omfang = await db.query<{ fagmiljo_id: string }>('select fagmiljo_id from public.ressursomfang where objekt_id = $1', [ny])
    expect(omfang.rows[0]!.fagmiljo_id).toBe(g.fagmiljo.A)

    expect(await kode('redaktorFortolkningA', 'lagre_utkast', { objekt: obj.kommentarB, forventet_revisjon: 1, innhold: KOMMENTAR('Nei') })).toBe('PT404')
    expect(await kode('redaktorFortolkningA', 'lagre_utkast', { objekt: obj.fagside, forventet_revisjon: 1, innhold: { navn: 'Nei' } })).toBe('42501')
    expect(await kode('redaktorFortolkningA', 'publiser_utkast', { objekt: obj.kommentar2, forventet_revisjon: await revisjon(obj.kommentar2) })).toBe('42501')
    expect(await kode('redaktorFortolkningA', 'opprett_utkast', { objekttype: 'infoside', innhold: { navn: 'Ny' } })).toBe('42501')
    expect(await rpc('redaktorFortolkningA', 'kan_endre_lokalt_innhold')).toBe(true)
  })

  it('kan ikke gi eller se andres ansvar', async () => {
    expect(await kode('redaktorFortolkningA', 'les_redaktoransvar')).toBe('42501')
    expect(await kode('redaktorFortolkningA', 'les_redaktoransvar', { fagmiljo: g.fagmiljo.A })).toBe('42501')
  })
})

describe('oversikten for den som tildeler', () => {
  type Oversikt = {
    nasjonalt: { vises: boolean; aktivert: boolean }
    fagmiljoer: { id: string }[]
    ansvar: { bruker: { id: string }; omrade: string; fagmiljo: { id: string } | null; ressurs: { id: string } | null }[]
    ressurser: { id: string; type: string; analyttkoder: string[]; har_redaktor: boolean }[]
    fagsider_uten_redaktor: number | null
  }

  it('viser den lokale administratoren bare eget fagmiljø', async () => {
    const a = await rpc<Oversikt>('adminA', 'les_redaktoransvar')
    expect(a.nasjonalt).toEqual({ vises: false, aktivert: false })
    expect(a.fagmiljoer.map((f) => f.id)).toEqual([g.fagmiljo.A])
    expect(a.ansvar.map((x) => [x.bruker.id, x.omrade]).sort()).toEqual(
      [
        [g.id.redaktorRessursA, 'ressurs'],
        [g.id.redaktorFortolkningA, 'fortolkning'],
      ].sort(),
    )
    // Alle regelsettene i A, med kodene; fortolkningsredaktøren dekker dem alle.
    expect(a.ressurser.find((r) => r.id === obj.regelsett1)).toMatchObject({ type: 'intervallregelsett', analyttkoder: ['P5TESTEN'], har_redaktor: true })
    expect(a.ressurser.filter((r) => !r.har_redaktor)).toEqual([])
    expect(a.fagsider_uten_redaktor).toBeNull()

    const b = await rpc<Oversikt>('adminB', 'les_redaktoransvar')
    expect(b.ansvar).toEqual([])
    expect(b.ressurser.map((r) => [r.id, r.har_redaktor])).toEqual([[obj.regelsettB, false]])
    // Ingenting fra A.
    const tekst = JSON.stringify(b)
    for (const id of [obj.regelsett1, obj.regelsett2, obj.kommentar1, g.id.redaktorRessursA, g.id.redaktorFortolkningA]) expect(tekst).not.toContain(id)
    expect(await kode('adminB', 'les_redaktoransvar', { fagmiljo: g.fagmiljo.A })).toBe('42501')
    expect(await kode('vanligA', 'les_redaktoransvar')).toBe('42501')
  })

  it('viser systemarkitekten alle fagmiljøene og fagsidene uten redaktør', async () => {
    const s = await rpc<Oversikt>('systemarkitekt', 'les_redaktoransvar')
    expect(s.nasjonalt).toEqual({ vises: true, aktivert: false })
    expect(s.fagmiljoer.map((f) => f.id).sort()).toEqual([g.fagmiljo.A, g.fagmiljo.B].sort())
    expect(s.ressurser.filter((r) => !r.har_redaktor).map((r) => r.id)).toContain(obj.regelsettB)
    const infosider = await db.query<{ n: number }>(`select count(*)::int as n from public.redigerbare_objekter where type = 'infoside'`)
    expect(s.fagsider_uten_redaktor).toBe(infosider.rows[0]!.n)
    // Med ett fagmiljø: bare det, uten det nasjonale.
    const bareB = await rpc<Oversikt>('systemarkitekt', 'les_redaktoransvar', { fagmiljo: g.fagmiljo.B })
    expect(bareB.fagmiljoer.map((f) => f.id)).toEqual([g.fagmiljo.B])
    expect(bareB.nasjonalt.vises).toBe(false)
    expect(bareB.fagsider_uten_redaktor).toBeNull()
  })
})

describe('ansvaret følger medlemskapet', () => {
  it('tilbakekalles når medlemskapet avsluttes, og kommer ikke tilbake med et nytt', async () => {
    const ny = await opprettBruker(db, { brukernavn: 'test.p5redaktor', fornavn: 'Test', etternavn: 'P5', rolle: 'user' })
    const id = await gi('adminA', { bruker: ny, omrade: 'fortolkning', fagmiljo: g.fagmiljo.A })
    await lagreKommentar(ny as Person, obj.kommentar2, 'P5 fra ny redaktør')

    await rpc('systemarkitekt', 'avslutt_medlemskap', { bruker: ny, fagmiljo: g.fagmiljo.A })
    const { rows } = await db.query<{ av: string; kl: string | null }>('select tilbakekalt_av as av, tilbakekalt_kl as kl from public.redaktoransvar where id = $1', [id])
    expect(rows[0]!.kl).not.toBeNull()
    expect(rows[0]!.av).toBe(g.id.systemarkitekt)

    await rpc('systemarkitekt', 'gi_medlemskap', { bruker: ny, fagmiljo: g.fagmiljo.A })
    expect(await kode(ny, 'lagre_utkast', { objekt: obj.kommentar2, forventet_revisjon: await revisjon(obj.kommentar2), innhold: KOMMENTAR('Nei') })).toBe('42501')
    expect(await rpc(ny, 'mine_redaktoransvar')).toEqual([])
  })

  it('kommer ikke tilbake med et nytt medlemskap, selv om tilbakekallingen ikke skjedde', async () => {
    // Som når en direkte avslutning i repeatable read ikke så et ansvar gitt samtidig.
    const ny = await opprettBruker(db, { brukernavn: 'test.p5gjenoppstaar', fornavn: 'Test', etternavn: 'Gjen', rolle: 'user' })
    await giRedaktoransvar(db, ny, { omrade: 'fortolkning', fagmiljo: g.fagmiljo.A })
    await db.query('alter table public.medlemskap disable trigger medlemskap_redaktoransvar')
    try {
      await db.transaction(async (tx) => {
        await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test (syntetisk)', true)`)
        await tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1`, [ny])
      })
    } finally {
      await db.query('alter table public.medlemskap enable trigger medlemskap_redaktoransvar')
    }
    const ansvar = async () =>
      (
        await db.query<{ rader: number; gjelder: number }>(
          `select count(*)::int as rader, count(*) filter (where intern.redaktoransvar_gjelder(a))::int as gjelder
           from public.redaktoransvar a where a.bruker_id = $1 and a.tilbakekalt_kl is null`,
          [ny],
        )
      ).rows[0]
    expect(await ansvar()).toEqual({ rader: 1, gjelder: 0 })
    await rpc('adminA', 'gi_medlemskap', { bruker: ny, fagmiljo: g.fagmiljo.A })
    expect(await ansvar()).toEqual({ rader: 1, gjelder: 0 })
  })

  it('gjelder bare med aktivt medlemskap i fagmiljøet, også når raden står', async () => {
    // Medlem av både A og B; ansvaret i B gjelder bare så lenge medlemskapet der er aktivt.
    const ny = await opprettBruker(db, { brukernavn: 'test.p5dobbel', fornavn: 'Test', etternavn: 'Dobbel', rolle: 'user' })
    await opprettMedlem(db, ny, g.fagmiljo.B)
    await giRedaktoransvar(db, ny, { omrade: 'fortolkning', fagmiljo: g.fagmiljo.B })
    const gjelder = async () =>
      (await db.query<{ ja: boolean }>(`select intern.redaktoransvar_gjelder(a) as ja from public.redaktoransvar a where a.bruker_id = $1`, [ny])).rows[0]!.ja
    expect(await gjelder()).toBe(true)
    // Fagmiljøet arkiveres ikke her; et avsluttet medlemskap i tabellen tilbakekaller ansvaret.
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Test (syntetisk)', true)`)
      await tx.query(`update public.medlemskap set status = 'deaktivert', til = now() where bruker_id = $1 and fagmiljo_id = $2`, [ny, g.fagmiljo.B])
    })
    expect(await gjelder()).toBe(false)
    // Ansvaret i A ble ikke rørt, for det fantes ikke; medlemskapet i A gjelder fortsatt.
    expect((await db.query<{ n: number }>(`select count(*)::int as n from public.redaktoransvar where bruker_id = $1 and tilbakekalt_kl is null`, [ny])).rows[0]!.n).toBe(0)
  })
})

describe('nasjonale redaktører (B2), med bryteren slått på i testen', () => {
  let ansvar = ''

  beforeAll(async () => {
    await settNasjonaleRedaktorer(db, true)
  })

  afterAll(async () => {
    await settNasjonaleRedaktorer(db, false)
  })

  it('gis bare av en systemarkitekt', async () => {
    expect(await kode('adminA', 'tildel_redaktoransvar', { bruker: g.id.redaktorNasjonal, omrade: 'fagsider' })).toBe('42501')
    ansvar = await gi('systemarkitekt', { bruker: g.id.redaktorNasjonal, omrade: 'fagsider' })
    expect((await rpc<Record<string, unknown>[]>('redaktorNasjonal', 'mine_redaktoransvar'))[0]).toMatchObject({ omrade: 'fagsider', nasjonalt: true, gjelder: true })
  })

  it('leser og endrer fagsidene og kortene, lager kort, men ikke fagsider eller referanser, og publiserer ikke', async () => {
    expect(await serUtkastet('redaktorNasjonal', obj.fagside)).toBe(true)
    expect(await serUtkastet('redaktorNasjonal', obj.kort)).toBe(true)
    expect(await serUtkastet('redaktorNasjonal', obj.kommentar1)).toBe(false)
    expect(await serUtkastet('redaktorNasjonal', obj.referanse)).toBe(false)
    const for_ = await publisert(obj.fagside)
    await rpc('redaktorNasjonal', 'lagre_utkast', { objekt: obj.fagside, forventet_revisjon: await revisjon(obj.fagside), innhold: { navn: 'Redaktørmiddel endret' } })
    expect(await publisert(obj.fagside)).toEqual(for_)
    const kort = await kall.opprett(
      'innholdselement',
      { infoside: obj.fagside, panel: 'viktige_data', posisjon: 1, elementtype: 'toksisk_omrade', data: { nedre: 3, ovre: 4, enhet: 'nmol/L', forbehold: '' }, referanser: [] } as never,
      g.id.redaktorNasjonal,
    )
    expect(await serUtkastet('redaktorNasjonal', kort.id)).toBe(true)
    expect(await kode('redaktorNasjonal', 'opprett_utkast', { objekttype: 'infoside', innhold: { navn: 'Ny side' } })).toBe('42501')
    expect(
      await kode('redaktorNasjonal', 'opprett_utkast', { objekttype: 'referanse', innhold: { tittel: 'K', forfattere: 'N O', aar: '2020', lenke: 'https://example.org/k' } }),
    ).toBe('42501')
    expect(await kode('redaktorNasjonal', 'publiser_utkast', { objekt: obj.fagside, forventet_revisjon: await revisjon(obj.fagside) })).toBe('42501')
    expect(await kode('redaktorNasjonal', 'lagre_utkast', { objekt: obj.kommentar1, forventet_revisjon: await revisjon(obj.kommentar1), innhold: KOMMENTAR('Nei') })).toBe('42501')
    const behandlere = await db.query<{ b: string }>('select b from intern.forslagsbehandlere($1) b', [obj.fagside])
    expect(behandlere.rows.map((r) => r.b)).toEqual([g.id.redaktorNasjonal])
  })

  it('gjelder ikke når bryteren slås av igjen', async () => {
    await settNasjonaleRedaktorer(db, false)
    try {
      expect(await serUtkastet('redaktorNasjonal', obj.fagside)).toBe(false)
      expect(await kode('redaktorNasjonal', 'lagre_utkast', { objekt: obj.fagside, forventet_revisjon: await revisjon(obj.fagside), innhold: { navn: 'Nei' } })).toBe('42501')
      expect((await rpc<{ redaktor: boolean }>('redaktorNasjonal', 'mine_rettigheter')).redaktor).toBe(false)
      expect((await rpc<{ gjelder: boolean }[]>('redaktorNasjonal', 'mine_redaktoransvar'))[0]!.gjelder).toBe(false)
    } finally {
      await settNasjonaleRedaktorer(db, true)
    }
    await rpc('systemarkitekt', 'tilbakekall_redaktoransvar', { ansvar })
  })
})
