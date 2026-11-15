/**
 * De felles datakortene koblet til forbindelsen analysen måler, ikke til en
 * analyttkode (#395 punkt 3, docs/fagmiljoer.md, «Analyttkatalogen per
 * fagmiljø», og docs/faginnhold.md, «Datakortene per forbindelse»).
 *
 * Det som prøves:
 *
 * 1. Grunnlaget: hver forbindelse finnes i forbindelsesregisteret og hører til
 *    et stoff koden er koblet til; bare primære koder bruker datakort, og en
 *    kode bruker kortene for en forbindelse bare når den måler en.
 * 2. Klinisk paritet: OUS Klinisk farmakologi får de samme referanseområdene
 *    som med den gamle regelen (koden i `gjelder`, den første primære koden
 *    får sidens egne kort), for alle sider og koder, med de tre
 *    urinanalysene som eneste, uttrykkelige unntak — de bruker ingen av
 *    kortene, som gjelder serum, og ingen av dem fikk noe i produksjonen. Og
 *    nøyaktig det samme som før så lenge databasen ikke har migrasjonen
 *    (appen kan være ute først), og så lenge kortene har koden i `gjelder`.
 * 3. Migrasjonen: fila er den grunnlaget gir; den setter verdiene og lar
 *    katalogen gi dem i samme transaksjon, uten å endre faginnholdet; og
 *    fortolkningen får de samme referanseområdene før og etter den. Appen fra
 *    før finner altså kortene som før, og den nye fungerer i begge tilstander.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analyttforbindelserSql } from '../../scripts/analyttforbindelser'
import { referanseomraderPerAnalytt, type Stoffreferanseomrade } from '../domain/koblinger'
import { byggKatalog, lesKatalogdata } from '../domain/analyttkatalog'
import { OUS_ANALYTTFORBINDELSER, OUS_KATALOG, OUS_KATALOGDATA } from '../domain/ouskatalog'
import { FORBINDELSER } from '../kjemi/forbindelser'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import { lagFaginnholdsleser } from '../faginnhold/lesing'
import type { Objektstatus } from '../faginnhold/modell'
import { faginnholdskall, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJON = migrasjonsfiler().find((f) => f.endsWith('_analyttforbindelser_ous.sql'))!
const SQL = readFileSync(new URL(`../../supabase/migrations/${MIGRASJON}`, import.meta.url), 'utf8')

/** Urinanalysene, som ikke bruker datakortene (de gjelder serum). */
const URINANALYSER = ['IRCAK', 'UETGS', 'UETS']

describe('grunnlaget', () => {
  const primare = new Map(OUS_KATALOG.koblinger.filter((k) => k.primar).map((k) => [k.kode, k.stoff]))

  it('har bare koder katalogen kjenner, og forbindelser registeret kjenner, koblet til stoffet', () => {
    for (const [kode, { forbindelse }] of OUS_ANALYTTFORBINDELSER) {
      expect(OUS_KATALOG.finn(kode), kode).toBeDefined()
      if (!forbindelse) continue
      const stoffene = FORBINDELSER.finn(forbindelse)?.stoffer.map((s) => s.stoff)
      expect(stoffene, `${kode}: ${forbindelse}`).toBeDefined()
      const koblet = OUS_KATALOG.koblinger.filter((k) => k.kode === kode).map((k) => k.stoff)
      expect(koblet.some((s) => stoffene!.includes(s)), `${kode}: ${forbindelse} hører ikke til ${koblet.join(', ')}`).toBe(true)
    }
  })

  it('lar bare primære koder bruke datakort, og bare dem som måler én forbindelse bruke kortene for den', () => {
    for (const a of OUS_KATALOG.oppforinger) {
      if (a.datakort) expect(primare.has(a.kode), a.kode).toBe(true)
      if (a.datakort === 'forbindelse') expect(a.forbindelse, a.kode).not.toBeNull()
    }
    // Sumanalysene måler ikke én forbindelse, men bruker sidens egne kort.
    expect(OUS_KATALOG.finn('AMTNORSUM')).toMatchObject({ forbindelse: null, datakort: 'egne' })
    expect(OUS_KATALOG.finn('OTRAM')).toMatchObject({ forbindelse: 'o-desmetyltramadol', datakort: 'forbindelse' })
    expect(OUS_KATALOG.finn('HBUP')).toMatchObject({ forbindelse: 'hydroksybupropion', datakort: 'egne' })
    for (const kode of URINANALYSER) expect(OUS_KATALOG.finn(kode)?.datakort, kode).toBeNull()
  })
})

describe('klinisk paritet for OUS Klinisk farmakologi', () => {
  /** Regelen fra før: koden i `gjelder`, og den første primære koden for stoffet fikk sidens egne kort. */
  function somFor(kort: readonly Stoffreferanseomrade[]): Map<string, unknown> {
    const svar = new Map<string, unknown>()
    const primare = OUS_KATALOG.koblinger.filter((k) => k.primar)
    for (const { kode, stoff } of primare) {
      const hovedanalytt = primare.find((k) => k.stoff === stoff)?.kode === kode
      const treff =
        kort.find((k) => k.stoff === stoff && k.gjelder === kode) ??
        (hovedanalytt ? kort.find((k) => k.stoff === stoff && k.gjelder === null) : undefined)
      if (treff) svar.set(kode, treff.verdi)
    }
    return svar
  }

  it('gir hver kode det samme kortet som før, med alle kortene på plass', () => {
    // Hver side med sine egne kort, og et eget for hver annen primær kode enn
    // den første — før med koden i `gjelder`, nå med forbindelsen den måler.
    const stoffer = [...new Set(OUS_KATALOG.koblinger.map((k) => k.stoff))]
    const primare = OUS_KATALOG.koblinger.filter((k) => k.primar)
    const andre = primare.filter(
      (k) => OUS_KATALOG.finn(k.kode)?.forbindelse && primare.find((p) => p.stoff === k.stoff)!.kode !== k.kode,
    )
    expect(andre.map((k) => k.kode).sort()).toEqual(['DMI', 'IRCAK', 'OTRAM', 'UETS'])
    const egne = stoffer.map((stoff) => ({ stoff, gjelder: null, verdi: `${stoff}` }))
    const gamle = [...egne, ...andre.map((k) => ({ stoff: k.stoff, gjelder: k.kode, verdi: `${k.stoff}/${k.kode}` }))]
    const nye = [
      ...egne,
      ...andre.map((k) => ({ stoff: k.stoff, gjelder: OUS_KATALOG.finn(k.kode)!.forbindelse, verdi: `${k.stoff}/${k.kode}` })),
    ]
    const for_ = somFor(gamle)
    const na = referanseomraderPerAnalytt(nye, OUS_KATALOG)
    for (const kode of URINANALYSER) for_.delete(kode)
    expect([...na].sort()).toEqual([...for_].sort())
    expect(na.size).toBeGreaterThan(70)
    expect(na.get('OTRAM')).toBe('tramadol/OTRAM')
    expect(na.get('TRAM')).toBe('tramadol')
    expect(na.get('HBUP')).toBe('bupropion')
    expect(na.get('AMTNORSUM')).toBe('amitriptylin')
  })

  /** Svaret fra databasen med eller uten de nye feltene på kodene. */
  function katalogsvar(felt: 'uten' | 'tomme') {
    const svar = structuredClone(OUS_KATALOGDATA) as unknown as { oppforinger: { koder: Record<string, unknown>[] }[] }
    for (const o of svar.oppforinger) {
      for (const k of o.koder) {
        delete k.forbindelse
        delete k.datakort
        if (felt === 'tomme') Object.assign(k, { forbindelse: null, datakort: null })
      }
    }
    return byggKatalog(lesKatalogdata(svar))
  }

  it('gir det samme som før så lenge databasen ikke har migrasjonen', () => {
    // Appen og databasen rulles ut hver for seg. Til migrasjonen er kjørt, gir
    // katalogen ikke feltene, og kortene har fortsatt koden i `gjelder`.
    const katalog = katalogsvar('uten')
    const stoffer = [...new Set(katalog.koblinger.map((k) => k.stoff))]
    const primare = katalog.koblinger.filter((k) => k.primar)
    const andre = primare.filter((k) => primare.find((p) => p.stoff === k.stoff)!.kode !== k.kode)
    const gamle = [
      ...stoffer.map((stoff) => ({ stoff, gjelder: null, verdi: `${stoff}` })),
      ...andre.map((k) => ({ stoff: k.stoff, gjelder: k.kode, verdi: `${k.stoff}/${k.kode}` })),
    ]
    const na = referanseomraderPerAnalytt(gamle, katalog)
    expect([...na].sort()).toEqual([...somFor(gamle)].sort())
    expect(na.get('OTRAM')).toBe('tramadol/OTRAM')
    expect(na.get('TRAM')).toBe('tramadol')
  })

  it('gir det samme som før når katalogen har feltene og kortene fortsatt har koden', () => {
    // Etter migrasjonen, før kortene er skrevet om: et kort med koden i
    // `gjelder` er kortet for forbindelsen koden måler (`kortetsForbindelse`).
    const primare = OUS_KATALOG.koblinger.filter((k) => k.primar)
    const andre = primare.filter((k) => primare.find((p) => p.stoff === k.stoff)!.kode !== k.kode)
    const stoffer = [...new Set(OUS_KATALOG.koblinger.map((k) => k.stoff))]
    const gamle = [
      ...stoffer.map((stoff) => ({ stoff, gjelder: null, verdi: `${stoff}` })),
      ...andre.map((k) => ({ stoff: k.stoff, gjelder: k.kode, verdi: `${k.stoff}/${k.kode}` })),
    ]
    const for_ = somFor(gamle)
    for (const kode of URINANALYSER) for_.delete(kode)
    const na = referanseomraderPerAnalytt(gamle, OUS_KATALOG)
    expect([...na].sort()).toEqual([...for_].sort())
    expect(na.get('OTRAM')).toBe('tramadol/OTRAM')
  })

  it('bruker ikke den gamle koblingen når katalogen har feltene, også tomme', () => {
    const kort = [
      { stoff: 'tramadol', gjelder: null, verdi: 'tramadol' },
      { stoff: 'tramadol', gjelder: 'OTRAM', verdi: 'OTRAM' },
    ]
    expect(referanseomraderPerAnalytt(kort, katalogsvar('tomme')).size).toBe(0)
  })

  it('gir urinanalysene ingenting, slik ingen av dem fikk noe i produksjonen', () => {
    // I produksjonen har verken THC- eller etanolsiden et referanseområde.
    const kort = [
      { stoff: 'thc', gjelder: null, verdi: 'thc' },
      { stoff: 'thc', gjelder: 'thc-cooh', verdi: 'thc-cooh' },
      { stoff: 'etanol', gjelder: null, verdi: 'etanol' },
      { stoff: 'etanol', gjelder: 'etylsulfat', verdi: 'ets' },
    ]
    const na = referanseomraderPerAnalytt(kort, OUS_KATALOG)
    expect(URINANALYSER.filter((k) => na.has(k))).toEqual([])
    expect(na.get('THC')).toBe('thc')
  })
})

describe('migrasjonen', () => {
  let db: PGlite
  let kall: Faginnholdskall
  let leser: ReturnType<typeof lagFaginnholdsleser>
  let bruker: string
  let otram: Objektstatus
  let dmi: Objektstatus
  let for_: { katalog: unknown; innhold: unknown; revisjoner: number }

  const omrade = (ovre: number, gjelder?: string) => ({ nedre: null, ovre, enhet: 'nmol/L', forbehold: '', ...(gjelder && { gjelder }) })
  const innhold = () => kall.fasit('select objekt_id, tilstand::text, data from public.innholdselementer order by 1, 2')
  const revisjoner = async () => (await kall.fasit<{ n: number }>('select count(*)::int as n from public.objektrevisjoner'))[0]!.n
  /** Katalogen slik et medlem av OUS Klinisk farmakologi får den. */
  const katalogsvaret = () =>
    som(db, bruker, async (tx) => (await tx.query<{ k: unknown }>('select public.les_analyttkatalog() as k')).rows[0]!.k)

  beforeAll(async () => {
    // Som i produksjonen: kortet for O-desmetyltramadol har OUS sin kode i `gjelder`.
    db = await nyDatabase({ til: MIGRASJON })
    const admin = await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Peder', etternavn: 'Test', rolle: 'admin', systemarkitekt: true })
    bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
    kall = faginnholdskall(db, admin)
    const lager: Faginnholdslager = lagFaginnholdslager(kall.klientFor(admin))
    leser = lagFaginnholdsleser(kall.klientFor(bruker))
    const kort = (infoside: string, elementtype: string, data: Record<string, unknown>) =>
      lager.opprettUtkast('innholdselement', { infoside, panel: 'viktige_data', posisjon: 0, elementtype, data, referanser: [] })

    const tramadol = await lager.opprettUtkast('infoside', { navn: 'Tramadol' })
    const diazepam = await lager.opprettUtkast('infoside', { navn: 'Diazepam' })
    const tram = await kort(tramadol.id, 'referanseomrade', omrade(3000))
    otram = await kort(tramadol.id, 'referanseomrade', omrade(400, 'OTRAM'))
    const diaz = await kort(diazepam.id, 'referanseomrade', omrade(3500))
    dmi = await kort(diazepam.id, 'referanseomrade', omrade(5000, 'DMI'))
    for (const o of [tramadol, diazepam, tram, otram, diaz, dmi]) await lager.publiserUtkast(o.id, o.revisjon!)
    for_ = { katalog: await katalogsvaret(), innhold: await innhold(), revisjoner: await revisjoner() }
    await kjorMigrasjoner(db, { fra: MIGRASJON })
  }, 120_000)

  it('ligger i migrasjonene slik grunnlaget gir den', () => {
    expect(SQL).toBe(analyttforbindelserSql(MIGRASJON))
  })

  it('setter forbindelsen og datakortene på kodene til OUS Klinisk farmakologi', async () => {
    const rader = await kall.fasit<{ kode: string; forbindelse: string | null; datakort: string | null }>(
      `select kode, forbindelse, datakort from public.analyttkatalog_koder where fagmiljo_id = intern.opprinnelig_fagmiljo()`,
    )
    expect(rader.filter((r) => r.forbindelse || r.datakort)).toHaveLength(OUS_ANALYTTFORBINDELSER.size)
    expect(rader.find((r) => r.kode === 'OTRAM')).toEqual({ kode: 'OTRAM', forbindelse: 'o-desmetyltramadol', datakort: 'forbindelse' })
  })

  it('lar katalogen gi feltene først når verdiene er satt, i samme transaksjon', async () => {
    // Før den er kjørt, får appen katalogen uten feltene, og bruker den gamle koblingen.
    const koderFor = byggKatalog(lesKatalogdata(for_.katalog)).oppforinger
    expect(koderFor.find((a) => a.kode === 'OTRAM')).toMatchObject({ forbindelse: 'OTRAM', datakort: 'forbindelse' })
    expect(JSON.stringify(for_.katalog)).not.toContain('"datakort"')
    expect(byggKatalog(lesKatalogdata(await katalogsvaret())).finn('OTRAM')).toMatchObject({
      forbindelse: 'o-desmetyltramadol',
      datakort: 'forbindelse',
    })
  })

  it('endrer ikke faginnholdet, så appen fra før finner kortene som før', async () => {
    expect(await innhold()).toEqual(for_.innhold)
    expect(await revisjoner()).toBe(for_.revisjoner)
  })

  it('gir fortolkningen de samme referanseområdene før og etter migrasjonen', async () => {
    const katalogFor = byggKatalog(lesKatalogdata(for_.katalog))
    const katalogEtter = byggKatalog(lesKatalogdata(await katalogsvaret()))
    const forventet = [
      ['DIAZ', omrade(3500)],
      ['DMI', omrade(5000)],
      ['OTRAM', omrade(400)],
      ['TRAM', omrade(3000)],
    ]
    const sortert = (m: ReadonlyMap<string, unknown>) => [...m].sort(([a], [b]) => a.localeCompare(b))
    expect(sortert(await leser.lesReferanseomrader('publisert', katalogFor))).toEqual(forventet)
    expect(sortert(await leser.lesReferanseomrader('publisert', katalogEtter))).toEqual(forventet)
  })

  it('endrer ingenting når den kjøres på nytt', async () => {
    const katalog = await katalogsvaret()
    await db.exec(SQL)
    expect(await katalogsvaret()).toEqual(katalog)
    expect(await innhold()).toEqual(for_.innhold)
  })
})
