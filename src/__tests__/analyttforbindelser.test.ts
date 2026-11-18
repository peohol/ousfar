/**
 * Migrasjonen som ga kodene i analyttkatalogen til OUS Klinisk farmakologi
 * forbindelsen de måler og datakortene de brukte (#395 punkt 3,
 * `20261115*_analyttforbindelser_ous.sql`).
 *
 * Fortolkningen leser ikke lenger datakortene på fagsidene: referanseområdet
 * hver kode viser, står i katalogen (`docs/domener.md`, prøvd i
 * `referanseomrader.test.ts`). Feltene står i databasen til overgangen er over
 * (#405), så her prøves bare at grunnlaget og migrasjonen henger sammen: hver
 * forbindelse finnes i forbindelsesregisteret og hører til et stoff koden var
 * koblet til; fila er den grunnlaget gir; den setter verdiene uten å endre
 * faginnholdet, og endrer ingenting kjørt på nytt.
 */
import type { PGlite } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analyttforbindelserSql } from '../../scripts/analyttforbindelser'
import { ELDRE_DATAKORTKODER } from '../faginnhold/datakortplasser'
import { OUS_ANALYTTFORBINDELSER, OUS_ANALYTTKOBLINGER, OUS_KATALOG } from '../domain/ouskatalog'
import { FORBINDELSER } from '../kjemi/forbindelser'
import { lagFaginnholdslager, type Faginnholdslager } from '../faginnhold/lagring'
import { faginnholdskall, kjorMigrasjoner, migrasjonsfiler, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJON = migrasjonsfiler().find((f) => f.endsWith('_analyttforbindelser_ous.sql'))!
const SQL = readFileSync(new URL(`../../supabase/migrations/${MIGRASJON}`, import.meta.url), 'utf8')

/** Urinanalysene, som ikke bruker datakortene (de gjelder serum). */
const URINANALYSER = ['IRCAK', 'UETGS', 'UETS']

describe('grunnlaget', () => {
  const primare = new Map(OUS_ANALYTTKOBLINGER.filter((k) => k.primar).map((k) => [k.kode, k.stoff]))

  it('har bare koder katalogen kjenner, og forbindelser registeret kjenner, koblet til stoffet', () => {
    for (const [kode, { forbindelse }] of OUS_ANALYTTFORBINDELSER) {
      expect(OUS_KATALOG.finn(kode), kode).toBeDefined()
      if (!forbindelse) continue
      const stoffene = FORBINDELSER.finn(forbindelse)?.stoffer.map((s) => s.stoff)
      expect(stoffene, `${kode}: ${forbindelse}`).toBeDefined()
      const koblet = OUS_ANALYTTKOBLINGER.filter((k) => k.kode === kode).map((k) => k.stoff)
      expect(koblet.some((s) => stoffene!.includes(s)), `${kode}: ${forbindelse} hører ikke til ${koblet.join(', ')}`).toBe(true)
    }
  })

  it('lar bare primære koder bruke datakort, og bare dem som måler én forbindelse bruke kortene for den', () => {
    for (const [kode, a] of OUS_ANALYTTFORBINDELSER) {
      if (a.datakort) expect(primare.has(kode), kode).toBe(true)
      if (a.datakort === 'forbindelse') expect(a.forbindelse, kode).not.toBeNull()
    }
    // Sumanalysene måler ikke én forbindelse, men bruker sidens egne kort.
    expect(OUS_ANALYTTFORBINDELSER.get('AMTNORSUM')).toEqual({ forbindelse: null, datakort: 'egne' })
    expect(OUS_ANALYTTFORBINDELSER.get('OTRAM')).toEqual({ forbindelse: 'o-desmetyltramadol', datakort: 'forbindelse' })
    expect(OUS_ANALYTTFORBINDELSER.get('HBUP')).toEqual({ forbindelse: 'hydroksybupropion', datakort: 'egne' })
    for (const kode of URINANALYSER) expect(OUS_ANALYTTFORBINDELSER.get(kode)?.datakort ?? null, kode).toBeNull()
  })
})

describe('kodene fra før i gjelder', () => {
  it('leser hver kode slik migrasjonen gjorde det, og bare koder for en metabolitt med egne kort', () => {
    for (const [kode, forbindelse] of ELDRE_DATAKORTKODER) {
      expect(OUS_ANALYTTFORBINDELSER.get(kode), kode).toEqual({ forbindelse, datakort: 'forbindelse' })
    }
    expect([...ELDRE_DATAKORTKODER.keys()]).toContain('OTRAM')
  })
})

describe('migrasjonen', () => {
  let db: PGlite
  let kall: Faginnholdskall
  let bruker: string
  let for_: { katalog: unknown; innhold: unknown; revisjoner: number }
  let lager: Faginnholdslager

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
    lager = lagFaginnholdslager(kall.klientFor(admin))
    const kort = (infoside: string, elementtype: string, data: Record<string, unknown>) =>
      lager.opprettUtkast('innholdselement', { infoside, panel: 'viktige_data', posisjon: 0, elementtype, data, referanser: [] })

    const tramadol = await lager.opprettUtkast('infoside', { navn: 'Tramadol' })
    const diazepam = await lager.opprettUtkast('infoside', { navn: 'Diazepam' })
    const tram = await kort(tramadol.id, 'referanseomrade', omrade(3000))
    const otram = await kort(tramadol.id, 'referanseomrade', omrade(400, 'OTRAM'))
    const diaz = await kort(diazepam.id, 'referanseomrade', omrade(3500))
    const dmi = await kort(diazepam.id, 'referanseomrade', omrade(5000, 'DMI'))
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
    expect(JSON.stringify(for_.katalog)).not.toContain('"datakort"')
    expect(JSON.stringify(await katalogsvaret())).toContain('"kode":"OTRAM","navn":')
    expect(JSON.stringify(await katalogsvaret())).toMatch(/"forbindelse":"o-desmetyltramadol"/)
  })

  it('endrer ikke faginnholdet, så appen fra før finner kortene som før', async () => {
    expect(await innhold()).toEqual(for_.innhold)
    expect(await revisjoner()).toBe(for_.revisjoner)
  })

  it('endrer ingen verdier når den kjøres på nytt', async () => {
    // Bare verdiene: funksjonen katalogen leses med, er erstattet av senere migrasjoner.
    const koder = () => kall.fasit('select fagmiljo_id, kode, forbindelse, datakort from public.analyttkatalog_koder order by 1, 2')
    const for_kjoring = await koder()
    await db.exec(SQL)
    expect(await koder()).toEqual(for_kjoring)
    expect(await innhold()).toEqual(for_.innhold)
  })
})
