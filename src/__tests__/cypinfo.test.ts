/**
 * CYPinfo-katalogen (`docs/cypinfo-integrasjon.md`, etappe B): lesingen og
 * normaliseringen, strukturkontrollen, utledningen av genene per legemiddel,
 * synkroniseringen inn i en ekte database bygd av migrasjonene, endringsloggen,
 * vernet, lesefunksjonen og endepunktet. CYPinfo etterlignes
 * (`hjelp/cypinfo.ts`); ingen test kaller CYPinfo.
 */
import type { PGlite } from '@electric-sql/pglite'
import { beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { behandleCypinfo, CYPINFO_ARBEIDSFLYT } from '../cypinfo/endepunkt'
import { lagCypinfolager } from '../cypinfo/lager'
import { lesCypinfoutvalg } from '../cypinfo/lesing'
import {
  avsnitt,
  ENTITETNAVN,
  erNiva,
  lesAtc,
  lesGenresultat,
  lesLegemiddel,
  lesRapport,
  PARSERVERSJON,
  type Legemiddeldata,
} from '../cypinfo/modell'
import { byggCypinfovisning } from '../cypinfo/stoffside'
import { listeavvik } from '../cypinfo/struktur'
import { genene, gruppekall, parvisDekning, planlagteKall, produktet, synkroniserCypinfo } from '../cypinfo/synk'
import { KILDEOPPSETT, lesDatakildestatus, vurderKilder } from '../datakilder/status'
import { CYPINFOKOBLINGER } from '../faginnhold/cypinfokoblinger'
import type { Githubsjekk } from '../server/tilgang'
import { CYPINFO, falskCypinfoApi, legemiddelId, rapportFra } from './hjelp/cypinfo'
import { kallSom } from './hjelp/fest'
import { faginnholdskall, nyDatabase, opprettBruker } from './hjelp/testdatabase'

type Rad = Record<string, unknown>

const GENRESULTATER = CYPINFO.gentabell.map((r) => lesGenresultat(r)!.data)
const GENER = genene(GENRESULTATER)
const ALLE = CYPINFO.legemidler.map((l) => String(l._id))
/** Anbefalingene som avhenger av et resultat; de andre er tekstene uten relevante gener. */
const MED_GENER = CYPINFO.anbefalinger.filter((a) => a.combinations)
/** Kallene med alle genene samtidig, før gengruppene er kjent. */
const DEKNING = parvisDekning(GENER).length

/* --- Lesingen ------------------------------------------------------------- */

describe('lesingen', () => {
  it('leser hele katalogen og gentabellen, med en unik ID for hver rad', () => {
    const legemidler = CYPINFO.legemidler.map((r) => lesLegemiddel(r))
    expect(legemidler.every(Boolean)).toBe(true)
    expect(new Set(legemidler.map((l) => l!.id)).size).toBe(CYPINFO.legemidler.length)
    const gener = CYPINFO.gentabell.map((r) => lesGenresultat(r))
    expect(gener.every(Boolean)).toBe(true)
    expect(new Set(gener.map((g) => g!.id)).size).toBe(CYPINFO.gentabell.length)
    // CYP2D6 *1/*1 er to rader: med og uten duplikasjon.
    expect(gener.filter((g) => g!.data.gen_slug === 'cyp2d6' && g!.data.allel1 === '*1' && g!.data.allel2 === '*1').map((g) => g!.data.fenotype).sort()).toEqual([
      'Normal enzymaktivitet',
      'Økt enzymaktivitet',
    ])
  })

  it('normaliserer ATC-kodene, også med harde mellomrom, og skiller ut det som ikke er en kode', () => {
    expect(lesAtc(['N06AA 09', 'n06aa 10', ' N05AX12 ', 'N05AX12', 'XYZ'])).toEqual({ koder: ['N06AA09', 'N06AA10', 'N05AX12'], ugyldige: ['XYZ'] })
    expect(lesAtc('B01AA03, N06A')).toEqual({ koder: ['B01AA03', 'N06A'], ugyldige: [] })
    // Utdraget har koder med mellomrom; ingen blir borte.
    for (const rad of CYPINFO.legemidler) {
      const lest = lesLegemiddel(rad)!
      expect(lest.ugyldigeAtc, String(rad.name)).toEqual([])
      expect(lest.data.atc.length, String(rad.name)).toBe((rad.atcCodes as string[]).length)
    }
  })

  it('leser FEST-ID-ene fra katalogen (festCodes) og fra rapporten og enkeltoppslaget (festCode)', () => {
    const id = 'ID_4596EE8B-CD03-43E0-AEA8-CDB60778EA43'
    const rad = { _id: 'x', name: 'aripiprazol', atcCodes: ['N05AX12'] }
    expect(lesLegemiddel({ ...rad, festCodes: [id] })!.data.fest).toEqual([id])
    expect(lesLegemiddel({ ...rad, festCode: [id.toLowerCase()] })!.data.fest).toEqual([id])
    expect(lesLegemiddel({ ...rad, festCode: `${id}, ikke-en-id` })!.data.fest).toEqual([id])
    expect(lesLegemiddel({ ...rad, festCodes: [] })!.data.fest).toEqual([])
    expect(lesLegemiddel({ ...rad, name: ' ' })).toBeNull()
  })

  it('deler teksten i avsnitt, uten tomme avsnitt og mellomrom i kantene', () => {
    expect(avsnitt('Første.\n\n  Andre avsnitt. \r\n')).toEqual(['Første.', 'Andre avsnitt.'])
    expect(avsnitt(' A. \nB.')).toEqual(avsnitt('A.\n\nB.'))
    expect(avsnitt(null)).toEqual([])
  })

  it('leser rapporten strengt: en anbefaling som ikke kan leses helt, er en ny form', () => {
    const svar = rapportFra(CYPINFO.anbefalinger, CYPINFO.legemidler, [], ALLE)
    const lest = lesRapport(svar)
    expect(lest.length).toBe(CYPINFO.anbefalinger.filter((a) => a.noRelavantGenes).length)
    expect(lest.every((a) => a.uten_relevante_gener && a.kombinasjoner.length === 0 && a.avsnitt.length > 0)).toBe(true)
    expect(lesRapport({})).toEqual([])

    const en = (endre: (a: Rad) => Rad) => {
      const [kategori, liste] = Object.entries(structuredClone(svar))[0]!
      return { [kategori]: [endre(liste[0]!)] }
    }
    expect(() => lesRapport(en((a) => ({ ...a, severity: 'kritisk' })))).toThrow('ukjent nivå')
    expect(() => lesRapport(en(({ drug: _, ...a }) => a))).toThrow('mangler legemiddelet')
    expect(() => lesRapport(en((a) => ({ ...a, noRelavantGenes: null })))).toThrow('verken kombinasjoner')
    expect(() => lesRapport(en((a) => ({ ...a, combinations: [{ gene: { slug: 'cyp2d6' } }] })))).toThrow('ny form')
    expect(() => lesRapport({ Antipsykotika: {} })).toThrow('ikke en liste')
    expect(() => lesRapport([])).toThrow('ikke et objekt')
  })
})

/* --- Strukturkontrollen ------------------------------------------------------ */

describe('strukturkontrollen', () => {
  it('godtar utdraget', () => {
    expect(listeavvik('legemiddel', CYPINFO.legemidler)).toBeNull()
    expect(listeavvik('genresultat', CYPINFO.gentabell)).toBeNull()
  })

  it('avviser en tom liste, og en der et felt har fått nytt navn eller ny form i mange rader', () => {
    expect(listeavvik('legemiddel', [])).toContain('er tom')
    expect(listeavvik('legemiddel', CYPINFO.legemidler.map(({ festCodes, ...r }) => ({ ...r, festCode: festCodes })))).toContain('festCodes mangler')
    expect(listeavvik('genresultat', CYPINFO.gentabell.map((r) => ({ ...r, phenotypeId: { id: r.phenotypeId } })))).toContain('phenotypeId er objekt')
    // Én rad med avvik er under grensen.
    expect(listeavvik('legemiddel', [{ _id: 'x' }, ...CYPINFO.legemidler])).toBeNull()
  })
})

/* --- Utledningen av genene ---------------------------------------------------- */

describe('utledningen av genene', () => {
  it('kaller ett per gen og fenotype, og en parvis dekning med alle genene samtidig', () => {
    expect(GENER.map((g) => g.slug).sort()).toEqual(['VKORC1', 'cyp2b6', 'cyp2c19', 'cyp2c9', 'cyp2d6', 'cyp3a5', 'dpyd', 'slco1b1', 'tpmt', 'ugt1a1'])
    const kall = planlagteKall(GENER, ALLE)
    const par = GENER.reduce((n, g) => n + g.fenotyper.length, 0)
    expect(par).toBe(38)
    expect(kall).toHaveLength(par + DEKNING)
    expect(kall.every((k) => k.alle && k.legemidler.length === ALLE.length)).toBe(true)
    // Hvert par av fenotyper for to ulike gener er sendt sammen i minst ett kall,
    // så en anbefaling for to gener kommer uansett hvilke fenotyper den gjelder.
    const samtidig = kall.filter((k) => k.kombinasjoner.length === GENER.length).map((k) => new Set(k.kombinasjoner))
    expect(samtidig).toHaveLength(DEKNING)
    for (const [i, a] of GENER.entries())
      for (const b of GENER.slice(i + 1))
        for (const f of a.fenotyper)
          for (const g of b.fenotyper) expect(samtidig.some((k) => k.has(`${a.slug}:${f}`) && k.has(`${b.slug}:${g}`)), `${a.slug}:${f} ${b.slug}:${g}`).toBe(true)
    // Det største produktet for to gener (5 × 5) er nedre grense; dekningen holder seg nær den.
    expect(DEKNING).toBeGreaterThanOrEqual(25)
    expect(DEKNING).toBeLessThanOrEqual(35)
    expect(parvisDekning([{ slug: 'a', fenotyper: ['1', '2'] }])).toEqual([])
    // Rekkefølgen CYPinfo gir genene og fenotypene i, endrer ikke kallene.
    const snudd = [...GENER].reverse().map((g) => ({ ...g, fenotyper: [...g.fenotyper].reverse() }))
    expect(parvisDekning(snudd)).toEqual(parvisDekning(GENER))
  })

  it('kaller hele produktet av fenotyper for hver gengruppe, med legemidlene i gruppen', () => {
    const fraUtdraget = lesRapport(Object.fromEntries([['alle', MED_GENER.map((a) => ({ ...a, drug: { _id: a.drug._id } }))]]))
    const kall = gruppekall(GENER, fraUtdraget)
    const perGruppe = new Map<string, number>()
    for (const k of kall) {
      const nokkel = k.kombinasjoner.map((x) => x.split(':')[0]).join('+')
      perGruppe.set(nokkel, (perGruppe.get(nokkel) ?? 0) + 1)
    }
    expect(Object.fromEntries(perGruppe)).toEqual({ 'VKORC1+cyp2c9': 9, 'cyp2b6+cyp2c19': 20, 'cyp2c19+cyp2d6': 25 })
    const tca = kall.find((k) => k.kombinasjoner[0]!.startsWith('cyp2c19'))!
    expect(tca.legemidler.sort()).toEqual(['amitriptylin', 'doksepin', 'klomipramin', 'trimipramin'].map(legemiddelId).sort())
    expect(produktet([{ slug: 'a', fenotyper: ['1', '2'] }, { slug: 'b', fenotyper: ['3'] }])).toEqual([['a:1', 'b:3'], ['a:2', 'b:3']])
  })
})

/* --- Synkroniseringen --------------------------------------------------------- */

describe('synkroniseringen', () => {
  let db: PGlite
  const lager = () => lagCypinfolager(kallSom(db, 'service_role'))
  const synk = (api = falskCypinfoApi(), utlostAv: 'cron' | 'manuell' = 'cron') => synkroniserCypinfo({ lager: lager(), api, utlostAv })
  type Endring = { type: string; art: string; niva: string; objekt_id: string; felt: string[]; etikett: string }
  const endringer = async () =>
    (await db.query<Endring>(`select type, art, niva, objekt_id, felt, etikett from datakilder.endringer where kilde = 'cypinfo' order by id`)).rows
  const antallAktive = async (tabell: string) =>
    (await db.query<{ n: number }>(`select count(*)::int as n from cypinfo.${tabell} where utgatt_kl is null`)).rows[0]!.n
  const legemiddel = async (navn: string) =>
    (await db.query<{ data: Legemiddeldata }>(`select data from cypinfo.legemiddel where data ->> 'navn' = $1`, [navn])).rows[0]!.data

  beforeAll(async () => {
    db = await nyDatabase()
  }, 60_000)

  beforeEach(async () => {
    await db.exec(`
      truncate ${ENTITETNAVN.map((e) => `cypinfo.${e}`).join(', ')}, cypinfo.synkroniseringer cascade;
      truncate datakilder.endringer`)
  })

  it('har en tabell for hver type modellen leser', async () => {
    const { rows } = await db.query<{ navn: string }>('select navn from cypinfo.entiteter order by navn')
    expect(rows.map((r) => r.navn)).toEqual([...ENTITETNAVN].sort())
  })

  it('henter katalogen, utleder genene, bytter alt inn og logger første henting som grunnlag', async () => {
    const api = falskCypinfoApi()
    const resultat = await synk(api)
    expect(resultat).toMatchObject({ status: 'fullfort' })
    expect(api.kall).toEqual({ lister: ['/legemiddel', '/gene'], rapport: 38 + DEKNING + 25 + 9 + 20 })
    expect(await antallAktive('legemiddel')).toBe(CYPINFO.legemidler.length)
    expect(await antallAktive('genresultat')).toBe(CYPINFO.gentabell.length)
    expect(await antallAktive('anbefaling')).toBe(MED_GENER.length)
    expect((await endringer()).map((e) => [e.type, e.art])).toEqual([
      ['anbefaling', 'grunnlag'],
      ['genresultat', 'grunnlag'],
      ['legemiddel', 'grunnlag'],
    ])
    expect('antall' in resultat && resultat.antall).toMatchObject({ kall: 38 + DEKNING + 54, uavklarte: [], merknader: [] })
  })

  it('finner en gengruppe der CYPinfo bare har anbefaling for én kombinasjon av fenotyper', async () => {
    // To gener som ellers ikke hører sammen, med en anbefaling bare for den første
    // fenotypen for CYP3A5 og den tredje for TPMT.
    const gen = (slug: string, k: number) => {
      const rad = CYPINFO.gentabell.find((r) => r.geneId === slug && r.phenotypeId === GENER.find((g) => g.slug === slug)!.fenotyper[k])!
      return { gene: { name: String(rad.gene), slug }, result: { _id: String(rad.phenotypeId), title: { _type: 'slug', current: 'x' } } }
    }
    const ny = {
      _id: 'syntetisk-gruppe',
      combinations: [gen('cyp3a5', 0), gen('tpmt', 2)],
      drug: { _id: legemiddelId('aripiprazol') },
      noRelavantGenes: false,
      severity: 'medium',
      text: 'Syntetisk anbefaling for en ny gengruppe.',
    }
    const api = falskCypinfoApi({ anbefalinger: (a) => [...a, ny] })
    expect(await synk(api)).toMatchObject({ status: 'fullfort' })
    expect((await legemiddel('aripiprazol')).gensett).toContainEqual(['cyp3a5', 'tpmt'])
    expect((await db.query(`select 1 from cypinfo.anbefaling where cypinfo_id = 'syntetisk-gruppe' and utgatt_kl is null`)).rows).toHaveLength(1)
    // Hele produktet for den nye gruppen (3 × 4) hentes også.
    expect(api.kall.rapport).toBe(38 + DEKNING + 54 + 12)
  })

  it('finner genene hvert legemiddel slås opp på, også dem som må sendes sammen', async () => {
    await synk()
    expect((await legemiddel('aripiprazol')).gensett).toEqual([['cyp2d6']])
    for (const tca of ['amitriptylin', 'doksepin', 'klomipramin', 'trimipramin']) {
      expect((await legemiddel(tca)).gensett, tca).toEqual([['cyp2c19', 'cyp2d6']])
    }
    // Warfarin: VKORC1 alene gir én anbefaling («Noe økt følsomhet»), ellers begge sammen.
    expect((await legemiddel('warfarin')).gensett).toEqual([['VKORC1'], ['VKORC1', 'cyp2c9']])
    expect((await legemiddel('sertralin')).gensett).toEqual([['cyp2b6'], ['cyp2b6', 'cyp2c19'], ['cyp2c19']])
    expect((await legemiddel('sertralin')).gener).toEqual(['cyp2b6', 'cyp2c19'])
    const klozapin = await legemiddel('klozapin')
    expect(klozapin).toMatchObject({ gener: [], gensett: [], uten_relevante_gener: { niva: 'standard' } })
    expect(klozapin.uten_relevante_gener!.avsnitt[0]).toContain('ikke relevant gen-legemiddelinteraksjon')
    // Alle 25 felles anbefalinger for TCA-ene, per legemiddel.
    const { rows } = await db.query<{ n: number }>(
      `select count(*)::int as n from cypinfo.anbefaling where legemiddel_id = $1 and jsonb_array_length(data -> 'kombinasjoner') = 2`,
      [legemiddelId('amitriptylin')],
    )
    expect(rows[0]!.n).toBe(25)
  })

  it('lagrer CYPinfos tekst for hver anbefaling, uendret og delt i avsnitt, men ikke i rådataene', async () => {
    await synk()
    const forste = MED_GENER[0]!
    const { rows } = await db.query<{ data: { avsnitt: string[]; niva: string }; raa: Rad }>(
      `select data, raa from cypinfo.anbefaling where cypinfo_id = $1`,
      [forste._id],
    )
    expect(rows[0]!.data.avsnitt).toEqual(avsnitt(forste.text))
    expect(rows[0]!.data.niva).toBe(forste.severity)
    expect(Object.keys(rows[0]!.raa).sort()).toEqual(['_id', 'combinations', 'severity'])
    const { rows: alle } = await db.query<{ n: number }>(`select count(*)::int as n from cypinfo.anbefaling where jsonb_array_length(data -> 'avsnitt') > 0`)
    expect(alle[0]!.n).toBe(MED_GENER.length)
  })

  it('logger en ny lesing av det samme svaret som metadata, ikke som endring hos CYPinfo', async () => {
    await synk()
    // Slik parserversjon 1 lagret anbefalingene: med en hash av teksten i stedet for teksten.
    await db.exec(`update cypinfo.anbefaling set data = (data - 'avsnitt') || '{"tekst_sha256": "x"}', parserversjon = 1, hash = 'gammel'`)
    await db.exec(`truncate datakilder.endringer`)
    expect(await synk()).toMatchObject({ status: 'fullfort' })
    const nye = await endringer()
    expect(nye).toHaveLength(MED_GENER.length)
    expect(new Set(nye.map((e) => `${e.art} ${e.niva} ${e.felt.join(',')}`))).toEqual(new Set(['endret metadata avsnitt,tekst_sha256']))
  })

  it('er idempotent: en ny kjøring med de samme svarene endrer og logger ingenting', async () => {
    await synk()
    const logget = (await endringer()).length
    expect(await synk()).toMatchObject({ status: 'uendret' })
    expect(await endringer()).toHaveLength(logget)
  })

  it('logger en endret anbefalingstekst og et endret nivå som kliniske endringer', async () => {
    await synk()
    const aripiprazol = MED_GENER.filter((a) => a.drug._id === legemiddelId('aripiprazol'))
    const forste = aripiprazol[0]
    const andre = aripiprazol.find((a) => a !== forste && a.severity !== 'high')
    const resultat = await synk(
      falskCypinfoApi({
        anbefalinger: (liste) =>
          liste.map((a) =>
            a._id === forste!._id ? { ...a, text: `${a.text}\nEt nytt avsnitt.` } : a._id === andre!._id ? { ...a, severity: 'high' } : a,
          ),
      }),
    )
    expect(resultat).toMatchObject({ status: 'fullfort' })
    const nye = (await endringer()).filter((e) => e.art !== 'grunnlag')
    expect(nye.map((e) => [e.objekt_id, e.art, e.niva, e.felt])).toEqual(
      expect.arrayContaining([
        [forste!._id, 'endret', 'klinisk', ['avsnitt']],
        [andre!._id, 'endret', 'klinisk', ['niva']],
      ]),
    )
    expect(nye.find((e) => e.objekt_id === forste!._id)!.etikett).toMatch(/^aripiprazol · CYP2D6 /)
  })

  it('merker det som er borte som utgått, uten å slette det', async () => {
    await synk()
    const borte = MED_GENER.find((a) => a.drug._id === legemiddelId('kodein') && a.combinations![0]!.result.title.current.startsWith('Økt'))!
    await synk(falskCypinfoApi({ anbefalinger: (liste) => liste.filter((a) => a._id !== borte._id) }))
    const { rows } = await db.query<{ utgatt_kl: string | null }>(`select utgatt_kl from cypinfo.anbefaling where cypinfo_id = $1`, [borte._id])
    expect(rows[0]!.utgatt_kl).not.toBeNull()
    expect((await endringer()).filter((e) => e.art === 'fjernet').map((e) => [e.objekt_id, e.niva])).toEqual([[borte._id, 'klinisk']])
  })

  it('avviser en katalog der mye er borte, og beholder den fra før', async () => {
    await synk()
    const resultat = await synk(falskCypinfoApi({ legemidler: (r) => r.slice(0, 30) }))
    expect(resultat).toMatchObject({ status: 'feilet' })
    expect('feil' in resultat && resultat.feil).toContain('ser ufullstendig ut')
    expect(await antallAktive('legemiddel')).toBe(CYPINFO.legemidler.length)
  })

  it('stanser når et legemiddel har fått færre gener, men godtar det ved «Hent nå»', async () => {
    await synk()
    const utenCyp2b6 = falskCypinfoApi({
      anbefalinger: (liste) => liste.filter((a) => !(a.drug._id === legemiddelId('sertralin') && a.combinations?.some((k) => k.gene.slug === 'cyp2b6'))),
    })
    const planlagt = await synk(utenCyp2b6)
    expect(planlagt).toMatchObject({ status: 'feilet' })
    expect('feil' in planlagt && planlagt.feil).toContain('Færre gener enn sist for sertralin (cyp2b6)')
    expect((await legemiddel('sertralin')).gener).toEqual(['cyp2b6', 'cyp2c19'])

    const manuell = await synk(utenCyp2b6, 'manuell')
    expect(manuell).toMatchObject({ status: 'fullfort' })
    expect('antall' in manuell && manuell.antall.merknader![0]).toContain('Godtatt ved «Hent nå»')
    expect((await legemiddel('sertralin')).gener).toEqual(['cyp2c19'])
  })

  it('avviser et tomt svar, et svar for noe det ikke ble spurt om, og en ny form, uten å endre noe', async () => {
    await synk()
    const tomt = await synk(falskCypinfoApi({ rapport: (svar, k) => (k.length === 1 && k[0]!.startsWith('cyp2d6') ? {} : svar) }))
    expect(tomt).toMatchObject({ status: 'feilet' })
    expect('feil' in tomt && tomt.feil).toContain('tomt svar')

    const fremmed = await synk(
      falskCypinfoApi({ rapport: (svar, k) => (k.length === 1 && k[0]!.startsWith('dpyd') ? rapportFra(CYPINFO.anbefalinger, CYPINFO.legemidler, [`cyp2d6:${GENER.find((g) => g.slug === 'cyp2d6')!.fenotyper[0]}`], ALLE) : svar) }),
    )
    expect('feil' in fremmed && fremmed.feil).toContain('ikke ble spurt om')

    const ny = await synk(falskCypinfoApi({ anbefalinger: (liste) => liste.map((a) => ({ ...a, severity: a.severity === 'high' ? 'høy' : a.severity })) }))
    expect('feil' in ny && ny.feil).toContain('ukjent nivå')

    const nede = await synk({
      ...falskCypinfoApi(),
      gentabell: async () => {
        throw new Error('CYPinfo svarte 503 for /gene.')
      },
    })
    expect(nede).toMatchObject({ status: 'feilet', feil: 'CYPinfo svarte 503 for /gene.' })
    expect(await antallAktive('anbefaling')).toBe(MED_GENER.length)
    expect((await endringer()).filter((e) => e.art !== 'grunnlag')).toEqual([])
  })

  it('melder legemidler uten FEST-ID og uten kobling, og FEST-ID-er som ikke er aktive i FEST', async () => {
    const nytt = { ...CYPINFO.legemidler.find((l) => l.name === 'klozapin')!, _id: 'nytt-legemiddel', name: 'nyttmiddel', festCodes: [] }
    const aripiprazol = 'ID_4596EE8B-CD03-43E0-AEA8-CDB60778EA43'
    await db.exec(`
      insert into legemiddeldata.synkroniseringer (kilde, status) values ('FEST', 'fullfort');
      insert into legemiddeldata.virkestoff (fest_id, data, hash, forst_sett_kl, sist_endret_kl, sist_sett_synk)
      select '${aripiprazol}', '{"navn": "Aripiprazol"}', 'x', now(), now(), max(id) from legemiddeldata.synkroniseringer`)
    try {
      const resultat = await synk(
        falskCypinfoApi({
          legemidler: (r) => [...r, nytt],
          anbefalinger: (a) => [
            ...a,
            { _id: 'ny-anbefaling', combinations: null, drug: { _id: nytt._id }, noRelavantGenes: true, severity: 'standard', text: 'Standard dosering.' },
          ],
        }),
      )
      expect(resultat).toMatchObject({ status: 'fullfort' })
      const antall = 'antall' in resultat ? resultat.antall : {}
      expect(antall.uavklarte).toEqual(['nyttmiddel'])
      expect(antall.merknader).toEqual(expect.arrayContaining([expect.stringContaining('Uten FEST-ID og uten kobling til en fagside: nyttmiddel.')]))
      // Bare aripiprazol er et aktivt virkestoff i FEST-kopien her; alle de andre meldes.
      const fest = antall.merknader!.filter((m) => m.startsWith('FEST-ID-en'))
      expect(fest.some((m) => m.includes('«aripiprazol»'))).toBe(false)
      expect(fest.some((m) => m.includes('«citalopram»'))).toBe(true)
    } finally {
      await db.exec('truncate legemiddeldata.virkestoff, legemiddeldata.synkroniseringer cascade')
    }
  })

  it('kjører bare én synkronisering om gangen, og bare serveren kan skrive', async () => {
    const forste = await lager().start('cron')
    await expect(lager().start('cron')).rejects.toThrow('pågår allerede')
    await lager().avbryt(forste, 'test')
    await expect(kallSom(db, 'authenticated')('cypinfo_start_synk', { utlost_av: 'cron' })).rejects.toThrow()
    await expect(kallSom(db, 'authenticated')('cypinfo_forrige_synk', {})).rejects.toThrow()
    await expect(kallSom(db, 'anon')('les_cypinfo', { fest_ider: [] })).rejects.toThrow()
  })

  it('gir fagsidene legemidlene, anbefalingene med nivå og tekst, og gentabellen', async () => {
    await synk()
    const admin = await opprettBruker(db, { brukernavn: `admin${Date.now()}`, fornavn: 'Ada', etternavn: 'Admin', rolle: 'admin', systemarkitekt: true })
    const bruker = await opprettBruker(db, { brukernavn: `leser${Date.now()}`, fornavn: 'Lea', etternavn: 'Leser', rolle: 'user' })
    const klient = faginnholdskall(db, admin).klientFor(bruker)
    const kariprazin = CYPINFOKOBLINGER.find((k) => k.side === 'Kariprazin')!
    const { data, error } = await klient.rpc('les_cypinfo', {
      fest_ider: ['ID_4596EE8B-CD03-43E0-AEA8-CDB60778EA43'],
      cypinfo_ider: [kariprazin.cypinfo_id],
    })
    expect(error).toBeNull()
    const svar = data as {
      kilde: Rad
      legemidler: { id: string; data: Legemiddeldata }[]
      anbefalinger: { legemiddel_id: string; kombinasjoner: Rad[]; niva: string; avsnitt: string[] }[]
      genresultater: { data: { gen_slug: string } }[]
    }
    expect(svar.legemidler.map((l) => l.data.navn).sort()).toEqual(['aripiprazol', 'kariprazin'])
    expect(svar.anbefalinger.length).toBe(MED_GENER.filter((a) => a.drug._id === legemiddelId('aripiprazol')).length)
    expect(Object.keys(svar.anbefalinger[0]!.kombinasjoner[0]!).sort()).toEqual(['fenotype', 'fenotype_id', 'gen', 'gen_slug'])
    expect(svar.anbefalinger.every((a) => erNiva(a.niva) && a.avsnitt.length > 0)).toBe(true)
    // Leses slik appen gjør det, gir det et kort for hvert legemiddel.
    const visning = byggCypinfovisning(lesCypinfoutvalg(data))
    expect(visning.legemidler.map((l) => l.navn)).toEqual(['aripiprazol', 'kariprazin'])
    expect(visning.legemidler[0]!.gensett.map((s) => s.gener)).toEqual([['CYP2D6']])
    expect(new Set(svar.genresultater.map((g) => g.data.gen_slug))).toEqual(new Set(['cyp2d6']))
    expect(svar.kilde).toMatchObject({ navn: 'CYPinfo', endret_kl: expect.any(String) })

    const status = lesDatakildestatus((await faginnholdskall(db, admin).klientFor(admin).rpc('datakilder_status', {})).data)
    const vurdering = vurderKilder(status).find((v) => v.kilde === 'cypinfo')!
    expect(vurdering).toMatchObject({ tilstand: 'ok', intervall: 7, versjon: String(PARSERVERSJON) })
    expect(status.endringer.filter((e) => e.kilde === 'cypinfo').map((e) => e.art)).toEqual(['grunnlag', 'grunnlag', 'grunnlag'])
  })
})

/* --- Endepunktet ---------------------------------------------------------- */

describe('endepunktet', () => {
  const miljo = { CRON_SECRET: 'hemmelig', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_SECRET_KEY: 'k' }
  const github: Githubsjekk = async (token, arbeidsflyt) =>
    arbeidsflyt === CYPINFO_ARBEIDSFLYT && token === 'github-planlagt' ? 'cron' : token === 'github-hand' ? 'manuell' : null
  const kall = (metode: string, token?: string) =>
    new Request(`https://ousfar.vercel.app${KILDEOPPSETT.cypinfo.synk}`, { method: metode, headers: token ? { authorization: `Bearer ${token}` } : {} })

  it('tar imot jobben i GitHub Actions og systemarkitekter, og avviser alle andre', async () => {
    const utlost: string[] = []
    const synkroniser = async ({ utlostAv }: { utlostAv?: string }) => {
      utlost.push(utlostAv!)
      return { status: 'uendret' as const, synk: 1, antall: {} }
    }
    const behandle = (req: Request, arkitekt = false) =>
      behandleCypinfo(req, miljo, { synkroniser, arkitektsjekk: async () => arkitekt, githubsjekk: github })
    expect((await behandle(kall('POST'))).status).toBe(401)
    expect((await behandle(kall('POST', 'noe annet'))).status).toBe(401)
    expect((await behandle(kall('PUT', 'hemmelig'))).status).toBe(405)
    expect((await behandle(kall('POST', 'github-planlagt'))).status).toBe(200)
    expect((await behandle(kall('POST', 'github-hand'))).status).toBe(200)
    expect((await behandle(kall('POST', 'arkitekt'), true)).status).toBe(200)
    expect(utlost).toEqual(['cron', 'manuell', 'manuell'])
  })

  it('svarer 502 når kjøringen feilet, så den synes i GitHub og Vercel', async () => {
    const res = await behandleCypinfo(kall('POST', 'github-planlagt'), miljo, {
      synkroniser: async () => ({ status: 'feilet', synk: 2, feil: 'CYPinfo svarte 503.' }),
      githubsjekk: github,
    })
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ status: 'feilet', synk: 2, feil: 'CYPinfo svarte 503.' })
  })
})
