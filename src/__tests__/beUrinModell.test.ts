/**
 * Modellen for benzoylekgonin i urin i databasen (#562,
 * docs/benzoylekgonin-urin.md): én per fagmiljø, bare gjennom
 * `public.les_be_urin_modell()`, og bare arbeidskontekstens.
 *
 * Aktiveringen (20261124143000_be_urin_aktivering.sql) legger inn modellen
 * av form 1 og oppføringen i OUS Klinisk farmakologi (A), med
 * måleusikkerheten fra THC-syreregelsettet. 20261125121500_be_urin_fem_profiler.sql
 * bytter den ut med modellen av form 2 med fem profiler (#570). Testene av
 * tilgangen bytter den ut med den syntetiske modellen.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { tilBeUrinModell, type BeUrinProfilmodell } from '../domain/beUrinModell'
import {
  BESTILTE_KURVER,
  BESTILTE_PROFILER,
  FORM1_AKTIVERT,
  MARGINER,
  PROFILMODELL,
  SYNTETISK_MODELL,
} from '../domain/__tests__/hjelp/beUrinTestmodell'
import THC_REGELSETT from '../domain/__tests__/fasit/thc-regelsett.json'
import { lesAnalyttkatalog } from '../katalog/Analyttkatalogkilde'
import { lesBeUrinModell } from '../katalog/beUrinModell'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, som, type Faginnholdskall } from './hjelp/testdatabase'

const migrasjon = (fil: string) => readFileSync(resolve(__dirname, '../../supabase/migrations', fil), 'utf8')
const AKTIVERING_SQL = migrasjon('20261124143000_be_urin_aktivering.sql')
const FEM_PROFILER_SQL = migrasjon('20261125121500_be_urin_fem_profiler.sql')

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

const modellFor = (p: Person) => lesBeUrinModell(kall.klientFor(g.id[p]))

const leggInn = (fagmiljo: string, modell: unknown, versjon = SYNTETISK_MODELL.versjon) =>
  db.query('insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values ($1, $2, $3)', [
    fagmiljo,
    versjon,
    JSON.stringify(modell),
  ])

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
}, 120_000)

describe('etter aktiveringen', () => {
  it('har OUS Klinisk farmakologi den godkjente modellen med fem profiler, som består kontrollen', async () => {
    const svar = await modellFor('vanligA')
    expect(svar.fagmiljo).toEqual({ id: g.fagmiljo.A, navn: 'OUS Klinisk farmakologi' })
    const r = tilBeUrinModell(svar.modell)
    expect(r?.ok).toBe(true)
    if (!r?.ok) return
    // Nøyaktig modellen testene bruker, bortsett fra versjonen.
    expect({ ...r.modell, versjon: PROFILMODELL.versjon }).toEqual(PROFILMODELL)
    expect(r.modell.versjon).toBe('ous-kf-2026-11-25')
    expect((r.modell as BeUrinProfilmodell).form).toBe(2)
    expect(r.modell.enheter).toEqual({ benzoylekgonin: 'nmol/L', kreatinin: 'mmol/L', kvotient: 'nmol/mmol' })
    expect(r.modell.kvotientfaktor).toBe(1)
    // Profilene er bestillingens, med alle sifrene; marginene er THC-syrens.
    expect((r.modell as BeUrinProfilmodell).profiler).toEqual(BESTILTE_PROFILER)
    expect(r.modell.sikkerhetsmarginer).toEqual(MARGINER)
    expect(r.modell.standard_sikkerhetsmargin).toBe(0.9)
  })

  it('har de to bieksponentielle profilene fra form 1, matematisk uendret', async () => {
    const { profiler } = (await modellFor('vanligA')).modell as BeUrinProfilmodell
    for (const [i, id] of (['bi_a', 'bi_b'] as const).entries()) {
      const { navn: _navn, ...kurve } = BESTILTE_KURVER[i]!
      expect(profiler.find((p) => p.id === id)).toEqual({ id, type: 'bi', ...kurve })
    }
  })

  it('har måleusikkerheten fra THC-syreregelsettet, slik det ble importert', async () => {
    const modell = (await modellFor('vanligA')).modell as BeUrinProfilmodell
    expect(modell.maleusikkerhet).toEqual({
      cv_benzoylekgonin: THC_REGELSETT.maleusikkerhet.cv_thc,
      cv_kreatinin: THC_REGELSETT.maleusikkerhet.cv_kreatinin,
    })
  })

  it('stopper aktiveringen når THC-syreregelsettet har en annen måleusikkerhet', async () => {
    // Migrasjonen kjøres på nytt i en transaksjon som rulles tilbake, med et
    // publisert regelsett som avviker (som i en produksjon der noen har endret det).
    const sql = AKTIVERING_SQL
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query('delete from public.be_urin_modeller')
        await tx.query(`delete from public.analyttkatalog_oppforinger where nokkel = 'be-urin'`)
        await tx.query(`delete from public.analyttkatalog_metoder where kode = 'URUS'`)
        // Bare raden migrasjonen ser på; objektet bak den trengs ikke her.
        await tx.exec('set local session_replication_role = replica')
        await tx.query(
          `insert into public.thc_regelsett (objekt_id, tilstand, fagmiljo_id, konverteringsfaktor, cv_thc, cv_kreatinin,
             faktor_under_cutoff, standard_sikkerhetsmargin, varsel_dager_mellom)
           values (gen_random_uuid(), 'publisert', $1, 0.344451, 0.25, 0.05, 1.5, 0.9, 30)`,
          [g.fagmiljo.A],
        )
        await tx.exec('set local session_replication_role = origin')
        await tx.exec(sql)
      }),
    )
    expect(feil?.message).toMatch(/annen måleusikkerhet/)
    expect((await modellFor('vanligA')).modell).not.toBeNull()
  })

  /** Kjører byttet til form 2 på nytt i en transaksjon som rulles tilbake, etter `forbered`. */
  const byttPaaNytt = (forbered: (tx: Transaction) => Promise<void>) =>
    feilFra(() =>
      db.transaction(async (tx) => {
        await forbered(tx)
        await tx.exec(FEM_PROFILER_SQL)
        throw new Error('rulles tilbake')
      }),
    )
  const leggInnForm1 = async (tx: Transaction) => {
    await tx.query('delete from public.be_urin_modeller where fagmiljo_id = $1', [g.fagmiljo.A])
    await tx.query('insert into public.be_urin_modeller (fagmiljo_id, versjon, modell) values ($1, $2, $3)', [
      g.fagmiljo.A,
      FORM1_AKTIVERT.versjon,
      JSON.stringify(FORM1_AKTIVERT),
    ])
  }

  it('bytter bare form-1-modellen fra #562, og står når modellen er en annen', async () => {
    // Nå er modellen alt av form 2: en ny kjøring endrer ingenting.
    expect((await byttPaaNytt(async () => {}))?.message).toMatch(/ikke ous-kf-2026-11-24 \(form 1\); ingenting er endret/)
    // Fra form-1-modellen går byttet gjennom (og rulles tilbake her).
    expect((await byttPaaNytt(leggInnForm1))?.message).toBe('rulles tilbake')
    expect((await modellFor('vanligA')).modell).toMatchObject({ versjon: 'ous-kf-2026-11-25', form: 2 })
  })

  it('stopper byttet når THC-syreregelsettet har en annen måleusikkerhet', async () => {
    const feil = await byttPaaNytt(async (tx) => {
      await leggInnForm1(tx)
      await tx.exec('set local session_replication_role = replica')
      await tx.query(
        `insert into public.thc_regelsett (objekt_id, tilstand, fagmiljo_id, konverteringsfaktor, cv_thc, cv_kreatinin,
           faktor_under_cutoff, standard_sikkerhetsmargin, varsel_dager_mellom)
         values (gen_random_uuid(), 'publisert', $1, 0.344451, 0.2, 0.06, 1.5, 0.9, 30)`,
        [g.fagmiljo.A],
      )
      await tx.exec('set local session_replication_role = origin')
    })
    expect(feil?.message).toMatch(/annen måleusikkerhet/)
  })

  it('finnes i søket under URUS med koden UBEZ, bare i OUS Klinisk farmakologi', async () => {
    const a = await lesAnalyttkatalog(kall.klientFor(g.id.vanligA))
    const modul = a.modulMedId('be-urin')
    expect(modul?.modul?.type).toBe('be_urin')
    expect(modul?.visningsnavn).toBe('Benzoylekgonin i urin')
    expect(modul?.analysemetode).toBe('URUS')
    expect(modul?.modul?.analytter).toEqual([{ kode: 'UBEZ', navn: 'Benzoylekgonin' }])
    expect(a.metoder.map((m) => m.kode)).toContain('URUS')
    // Serumoppføringen BEZ1 er urørt.
    expect(a.modulMedId('benzoylekgonin')?.analysemetode).toBe('SRUS')
    const b = await lesAnalyttkatalog(kall.klientFor(g.id.vanligB))
    expect(b.modulMedId('be-urin')).toBeUndefined()
    expect(await modellFor('vanligB')).toEqual({ fagmiljo: { id: g.fagmiljo.B, navn: expect.any(String) }, modell: null })
  })
})

describe('med en annen modell i OUS Klinisk farmakologi', () => {
  beforeAll(async () => {
    await db.query('delete from public.be_urin_modeller where fagmiljo_id = $1', [g.fagmiljo.A])
    await leggInn(g.fagmiljo.A, SYNTETISK_MODELL)
  })

  it('får alle med A som arbeidskontekst nøyaktig den, med alle sifrene', async () => {
    for (const p of ['vanligA', 'adminA', 'systemarkitekt', 'dobbeltAB'] as const) {
      const svar = await modellFor(p)
      expect(svar.modell, p).toEqual(SYNTETISK_MODELL)
      expect(tilBeUrinModell(svar.modell)?.ok, p).toBe(true)
    }
  })

  it.each(['vanligB', 'adminB', 'arkitektB', 'avsluttetA'] as const)('får %s i B ingen modell, ikke A sin', async (p) => {
    expect(await modellFor(p)).toEqual({ fagmiljo: { id: g.fagmiljo.B, navn: expect.any(String) }, modell: null })
  })

  it('stopper den som ikke har et aktivt medlemskap', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => modellFor(p)))?.message, p).toMatch(/ikke lenger et aktivt medlemskap/)
    }
  })

  it('lar ikke tabellen leses direkte, eller et annet fagmiljø bes om', async () => {
    for (const p of ['systemarkitekt', 'vanligA', 'vanligB'] as const) {
      const feil = await feilFra(() => som(db, g.id[p], (tx) => tx.query('select * from public.be_urin_modeller')))
      expect(feil?.code, p).toBe('42501')
    }
    const feil = await feilFra(() =>
      som(db, g.id.vanligB, (tx) => tx.query('select public.les_be_urin_modell($1::uuid)', [g.fagmiljo.A])),
    )
    expect(feil?.code).toBe('42883')
  })

  it('tar bare imot én modell per fagmiljø og bare med formen', async () => {
    expect((await feilFra(() => leggInn(g.fagmiljo.A, SYNTETISK_MODELL)))?.code).toBe('23505')
    expect((await feilFra(() => leggInn(g.fagmiljo.B, { versjon: 'x' }, 'x')))?.code).toBe('23514')
    expect((await feilFra(() => leggInn(g.fagmiljo.B, SYNTETISK_MODELL, 'annen versjon')))?.code).toBe('23514')
  })
})

describe('oppføringstypen i katalogen', () => {
  it('godtar en oppføring for modulen, bare i sitt fagmiljø', async () => {
    await db.query(
      `insert into public.analyttkatalog_oppforinger
         (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade, aliaser)
       values ($1, 'be-urin-test', 100000, 'be_urin', 'Benzoylekgonin', 'Benzoylekgonin i urin', 'Rusmiddelanalyse',
               'UCAK', '{"tekst":"","deler":[]}', '{kokain}')`,
      [g.fagmiljo.A],
    )
    await db.query(
      `insert into public.analyttkatalog_koder (fagmiljo_id, nokkel, posisjon, kode, navn)
       values ($1, 'be-urin-test', 0, 'TESTBEU', 'Benzoylekgonin')`,
      [g.fagmiljo.A],
    )
    try {
      const a = await lesAnalyttkatalog(kall.klientFor(g.id.vanligA))
      expect(a.modulMedId('be-urin-test')?.modul?.type).toBe('be_urin')
      const b = await lesAnalyttkatalog(kall.klientFor(g.id.vanligB))
      expect(b.modulMedId('be-urin-test')).toBeUndefined()
    } finally {
      await db.query(`delete from public.analyttkatalog_oppforinger where nokkel = 'be-urin-test'`)
    }
  })

  it('avviser en ukjent type', async () => {
    const feil = await feilFra(() =>
      db.query(
        `insert into public.analyttkatalog_oppforinger
           (fagmiljo_id, nokkel, posisjon, type, navn, visningsnavn, gruppe, analysemetode, maleomrade)
         values ($1, 'ukjent-test', 100001, 'ukjent', 'X', 'X', 'X', 'UCAK', '{"tekst":"","deler":[]}')`,
        [g.fagmiljo.A],
      ),
    )
    expect(feil?.code).toBe('23514')
  })
})
