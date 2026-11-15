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
 *    kortene, som gjelder serum, og ingen av dem fikk noe i produksjonen.
 * 3. Migrasjonen: fila er den grunnlaget gir; den skriver om et kort med en
 *    kode i `gjelder` til forbindelsen, i det publiserte og i et upublisert
 *    utkast hver for seg, uten å endre noe annet, som en endring fra Claude
 *    Code; en ny kjøring endrer ingenting; og en kode kommer ikke inn igjen.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analyttforbindelserSql } from '../../scripts/analyttforbindelser'
import { referanseomraderPerAnalytt, type Stoffreferanseomrade } from '../domain/koblinger'
import { OUS_ANALYTTFORBINDELSER, OUS_KATALOG } from '../domain/ouskatalog'
import { FORBINDELSER } from '../kjemi/forbindelser'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import { lagFaginnholdsleser } from '../faginnhold/lesing'
import type { Objektstatus } from '../faginnhold/modell'
import { DATAKORT } from '../faginnhold/paneler'
import { faginnholdskall, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, type Faginnholdskall } from './hjelp/testdatabase'

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
  let lager: Faginnholdslager
  let leser: ReturnType<typeof lagFaginnholdsleser>
  let otram: Objektstatus
  let dmi: Objektstatus
  let utenKode: Objektstatus

  const omrade = (ovre: number, gjelder?: string) => ({ nedre: null, ovre, enhet: 'nmol/L', forbehold: '', ...(gjelder && { gjelder }) })
  const kort = (infoside: string, elementtype: string, data: Record<string, unknown>) =>
    lager.opprettUtkast('innholdselement', { infoside, panel: 'viktige_data', posisjon: 0, elementtype, data, referanser: [] })
  const tilstander = (id: string) =>
    kall.fasit<{ tilstand: string; data: Record<string, unknown> }>(
      `select tilstand::text, data from public.innholdselementer where objekt_id = $1 order by tilstand::text desc`,
      [id],
    )
  const revisjoner = async () => (await kall.fasit<{ n: number }>('select count(*)::int as n from public.objektrevisjoner'))[0]!.n

  beforeAll(async () => {
    // Som i produksjonen før migrasjonen: kortet for O-desmetyltramadol har
    // OUS sin kode i `gjelder`.
    db = await nyDatabase({ til: MIGRASJON })
    const admin = await opprettBruker(db, { brukernavn: 'peohol', fornavn: 'Peder', etternavn: 'Test', rolle: 'admin', systemarkitekt: true })
    const bruker = await opprettBruker(db, { brukernavn: 'leser', fornavn: 'Lars', etternavn: 'Leser', rolle: 'user' })
    kall = faginnholdskall(db, admin)
    lager = lagFaginnholdslager(kall.klientFor(admin))
    leser = lagFaginnholdsleser(kall.klientFor(bruker))

    const tramadol = await lager.opprettUtkast('infoside', { navn: 'Tramadol' })
    const diazepam = await lager.opprettUtkast('infoside', { navn: 'Diazepam' })
    const tram = await kort(tramadol.id, 'referanseomrade', omrade(3000))
    otram = await kort(tramadol.id, 'referanseomrade', omrade(400, 'OTRAM'))
    const diaz = await kort(diazepam.id, 'referanseomrade', omrade(3500))
    dmi = await kort(diazepam.id, 'toksisk_omrade', omrade(5000, 'DMI'))
    utenKode = await kort(diazepam.id, 'halveringstid', { former: [] })
    for (const o of [tramadol, diazepam, tram, otram, diaz, dmi, utenKode]) await lager.publiserUtkast(o.id, o.revisjon!)
    // Et upublisert utkast med en annen verdi står på DMI-kortet.
    dmi = await lager.lagreUtkast(dmi.id, dmi.revisjon!, {
      infoside: diazepam.id,
      panel: 'viktige_data',
      posisjon: 0,
      elementtype: 'toksisk_omrade',
      data: omrade(6000, 'DMI'),
      referanser: [],
    })
    await kjorMigrasjoner(db, { fra: MIGRASJON })
  }, 120_000)

  it('ligger i migrasjonene slik grunnlaget gir den', () => {
    expect(SQL).toBe(analyttforbindelserSql('peohol', MIGRASJON))
    for (const k of DATAKORT) expect(SQL).toContain(`'${k.type}'`)
  })

  it('setter forbindelsen og datakortene på kodene til OUS Klinisk farmakologi', async () => {
    const rader = await kall.fasit<{ kode: string; forbindelse: string | null; datakort: string | null }>(
      `select kode, forbindelse, datakort from public.analyttkatalog_koder where fagmiljo_id = intern.opprinnelig_fagmiljo()`,
    )
    expect(rader.filter((r) => r.forbindelse || r.datakort)).toHaveLength(OUS_ANALYTTFORBINDELSER.size)
    expect(rader.find((r) => r.kode === 'OTRAM')).toEqual({ kode: 'OTRAM', forbindelse: 'o-desmetyltramadol', datakort: 'forbindelse' })
  })

  it('skriver om koden i gjelder til forbindelsen, og ingenting annet', async () => {
    expect(await tilstander(otram.id)).toEqual([
      { tilstand: 'utkast', data: omrade(400, 'o-desmetyltramadol') },
      { tilstand: 'publisert', data: omrade(400, 'o-desmetyltramadol') },
    ])
    // Det publiserte og utkastet hver for seg: utkastet beholder sin egen verdi.
    expect(await tilstander(dmi.id)).toEqual([
      { tilstand: 'utkast', data: omrade(6000, 'nordiazepam') },
      { tilstand: 'publisert', data: omrade(5000, 'nordiazepam') },
    ])
    expect((await tilstander(utenKode.id)).map((t) => t.data)).toEqual([{ former: [] }, { former: [] }])
  })

  it('fører endringen som Claude Codes, med nye revisjoner i historikken', async () => {
    const endringer = await kall.fasit<{ agent: string; migrasjon: string }>(
      `select e.agent, e.migrasjon from public.innholdsendringer e
       join public.objektrevisjoner r on r.endring_id = e.id
       where r.objekt_id = $1 and r.revisjon > 1`,
      [otram.id],
    )
    expect(endringer).toEqual([{ agent: 'claude-code', migrasjon: MIGRASJON }])
  })

  it('gir fortolkningen det samme referanseområdet for OTRAM som før', async () => {
    const omrader = await leser.lesReferanseomrader('publisert', OUS_KATALOG)
    expect(omrader.get('OTRAM')).toEqual(omrade(400))
    expect(omrader.get('TRAM')).toEqual(omrade(3000))
    expect(omrader.get('DIAZ')).toEqual(omrade(3500))
  })

  it('endrer ingenting når den kjøres på nytt', async () => {
    const for_ = await revisjoner()
    await db.exec(SQL.slice(0, SQL.indexOf('-- Et datakort for en metabolitt')))
    expect(await revisjoner()).toBe(for_)
  })

  it('slipper ikke en analyttkode inn i gjelder igjen', async () => {
    const side = (await kall.fasit<{ infoside_id: string }>('select infoside_id from public.innholdselementer where objekt_id = $1', [otram.id]))[0]!
    await expect(kort(side.infoside_id, 'toksisk_omrade', omrade(900, 'OTRAM'))).rejects.toThrow(/ikke godtatt/)
    await expect(kort(side.infoside_id, 'toksisk_omrade', omrade(900, 'o-desmetyltramadol'))).resolves.toBeDefined()
  })
})
