/**
 * P4c: analyttkatalogen per fagmiljø (docs/fagmiljoer.md, «Analyttkatalogen
 * per fagmiljø»).
 *
 * Migrasjonene legger katalogen til OUS Klinisk farmakologi (A) inn i
 * databasen, og fortolkningen av EtG og EtS som et scenarioregelsett. Det som
 * prøves:
 *
 * 1. Importene i migrasjonene er de grunnlaget gir.
 * 2. Klinisk paritet: A får nøyaktig katalogen, koblingene og EtG/EtS-
 *    tilfellene som sto i klientpakken før (frosne kontrollsummer, regnet av
 *    `main` før flyttingen), og fortolker EtG og EtS ordrett som før.
 * 3. Tydelig stopp: B, uten egen katalog, får en tom katalog og ingen
 *    EtG-regler, aldri A sine, heller ikke systemarkitekten med B som
 *    arbeidskontekst. En uten aktivt medlemskap stoppes med 42501.
 * 4. Isolasjon: tabellene kan ikke leses direkte av noen innlogget, så
 *    katalogen kan ikke hentes med en annen ID enn arbeidskonteksten.
 * 5. En ny kjøring av importene endrer ingenting.
 */
import type { PGlite } from '@electric-sql/pglite'
import { createHash } from 'node:crypto'
import { readdirSync, readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it } from 'vitest'
import { analyttkatalogImportSql } from '../../scripts/analyttkatalog-import'
import { etgImportSql } from '../../scripts/etg-import'
import type { Analyttkatalog } from '../domain/analyttkatalog'
import { etgTilfeller, type Etgtilfeller } from '../domain/etg'
import { OUS_KATALOGDATA } from '../domain/ouskatalog'
import { byggStoffregister, STOFFREGISTERDATA } from '../domain/stoffregister'
import { lesScenarioregler, reglerForModul, tilScenarioregler } from '../faginnhold/scenarioregler'
import { lesAnalyttkatalog } from '../katalog/Analyttkatalogkilde'
import { byggPersongalleri, type Person, type Persongalleri } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, som, type Faginnholdskall } from './hjelp/testdatabase'

const MIGRASJONER = new URL('../../supabase/migrations/', import.meta.url)

/**
 * Kontrollsummene av det som sto i klientpakken på `main` før flyttingen
 * (ce84965), med nøklene sortert: søkeoppføringene (`FORTOLKNINGSOPPFORINGER`),
 * analysemetodene, koblingene i stoffregisteret og EtG/EtS-tilfellene.
 */
const FOR_FLYTTINGEN = {
  fortolkninger: '890e76189c8e22d30e67a38187049a525a5a742d1502b545f7f86a0f1fca06cb',
  metoder: 'fa9c192ac17fd76cad46f675aca79a401d81e5e09f272e5521428a03ca04a707',
  koblinger: '48ca967ef48e5004fd1504de1a06c8b7bda953eef13d72523c927f5bc37b5147',
  etg: '6b228894db7f017e6d27199dc4b85faf768bdabdc5132f0e33193cc082959276',
}

function kanonisk(verdi: unknown): unknown {
  if (Array.isArray(verdi)) return verdi.map(kanonisk)
  if (verdi && typeof verdi === 'object') {
    return Object.fromEntries(
      Object.entries(verdi)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([k, v]) => [k, kanonisk(v)]),
    )
  }
  return verdi
}

const kontrollsum = (verdi: unknown) => createHash('sha256').update(JSON.stringify(kanonisk(verdi))).digest('hex')

/** Migrasjonen med navnet som slutter slik, og navnet. */
function migrasjon(slutt: string): { navn: string; sql: string } {
  const filer = readdirSync(MIGRASJONER).filter((f) => f.endsWith(slutt))
  expect(filer).toHaveLength(1)
  return { navn: filer[0]!, sql: readFileSync(new URL(filer[0]!, MIGRASJONER), 'utf8') }
}

const ETG = migrasjon('_etg_regler_import.sql')

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall

const katalogFor = (p: Person) => lesAnalyttkatalog(kall.klientFor(g.id[p]))

/** EtG/EtS-tilfellene personen får, slik appen setter dem sammen. */
async function etgFor(p: Person, katalog: Analyttkatalog): Promise<Etgtilfeller> {
  const etg = OUS_KATALOGDATA.oppforinger.find((o) => o.type === 'etg')!
  const analyte = katalog.modulMedId(etg.nokkel) ?? (await import('../domain/ouskatalog')).ETG_ANALYTT
  const tilstand = { status: 'klar' as const, regler: tilScenarioregler(await lesScenarioregler(kall.klientFor(g.id[p]))) }
  return etgTilfeller(analyte, reglerForModul(tilstand, { id: etg.nokkel, navn: etg.navn }, () => {}))
}

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  kall = faginnholdskall(db, g.id.systemarkitekt)
  // Testdatabasen har ikke administratoren importen bruker i produksjonen.
  await db.exec(etgImportSql('test.systemarkitekt', ETG.navn))
}, 120_000)

describe('importene', () => {
  it('ligger i migrasjonene slik grunnlaget gir dem', () => {
    expect(migrasjon('_analyttkatalog_ous_import.sql').sql).toBe(analyttkatalogImportSql())
    expect(ETG.sql).toBe(etgImportSql('peohol', ETG.navn))
  })

  it('endrer ingenting når de kjøres på nytt', async () => {
    const telling = async () =>
      (
        await db.query<{ n: number }>(`
          select (select count(*) from public.analyttkatalog_oppforinger)
               + (select count(*) from public.analyttkatalog_koder)
               + (select count(*) from public.analyttkatalog_koblinger)
               + (select count(*) from public.analyttkatalog_metoder)
               + (select count(*) from public.redigerbare_objekter) as n`)
      ).rows[0]!.n
    const for_ = await telling()
    await db.exec(analyttkatalogImportSql())
    await db.exec(etgImportSql('test.systemarkitekt', ETG.navn))
    expect(await telling()).toBe(for_)
  })

  it('kjøres ikke som en innlogget bruker', async () => {
    // Som en migrasjon som har satt en innlogget bruker: objektene ville ellers
    // fått arbeidskonteksten hans i stedet for det opprinnelige fagmiljøet.
    const feil = await feilFra(() =>
      db.transaction(async (tx) => {
        await tx.query(`select set_config('request.jwt.claims', $1, true)`, [JSON.stringify({ sub: g.id.arkitektB, role: 'authenticated' })])
        await tx.exec(etgImportSql('test.systemarkitekt', ETG.navn).replace(/^select intern\.endring_start.*$/m, ''))
      }),
    )
    expect(feil?.message).toMatch(/uten innlogget bruker/)
  })
})

describe('OUS Klinisk farmakologi', () => {
  it('får katalogen som sto i klientpakken, uendret', async () => {
    const katalog = await katalogFor('vanligA')
    expect(katalog.fagmiljo).toEqual({ id: g.fagmiljo.A, navn: 'OUS Klinisk farmakologi' })
    expect(kontrollsum(katalog.fortolkninger.map(({ modul: _, ...a }) => a))).toBe(FOR_FLYTTINGEN.fortolkninger)
    expect(kontrollsum(katalog.metoder)).toBe(FOR_FLYTTINGEN.metoder)
    const register = byggStoffregister(undefined, { ...STOFFREGISTERDATA, analyttkoblinger: katalog.koblinger })
    expect(kontrollsum(register.koblinger)).toBe(FOR_FLYTTINGEN.koblinger)
    expect({ ...katalog, fagmiljo: null, finn: null, modulMedId: null }).toEqual({
      ...(await import('../domain/ouskatalog')).OUS_KATALOG,
      finn: null,
      modulMedId: null,
    })
  })

  it('får den samme katalogen for alle med A som arbeidskontekst', async () => {
    const forventet = JSON.stringify(await katalogFor('vanligA'))
    for (const p of ['systemarkitekt', 'adminA', 'dobbeltAB'] as const) expect(JSON.stringify(await katalogFor(p)), p).toBe(forventet)
  })

  it('fortolker EtG og EtS ordrett som før', async () => {
    const tilfeller = await etgFor('vanligA', await katalogFor('vanligA'))
    expect(tilfeller.status).toBe('klar')
    if (tilfeller.status !== 'klar') return
    const somFor = tilfeller.alternativer.map((a) => ({
      ...a,
      plasseringer: a.plasseringer.map(({ rolle, merke, koder, tekst }) => ({ rolle, merke, koder, tekst })),
    }))
    expect(kontrollsum(somFor)).toBe(FOR_FLYTTINGEN.etg)
    expect(somFor.map((a) => [a.id, a.merke])).toEqual([
      ['begge', 'Begge påvist'],
      ['etg', 'EtG påvist'],
      ['ets', 'EtS påvist'],
    ])
  })

  it('har EtG-reglene og kommentarene i A', async () => {
    const { rows } = await db.query<{ fagmiljo_id: string }>(`
      select distinct r.fagmiljo_id
      from public.ressursomfang r
      where r.objekt_id in (
        select s.objekt_id from public.scenarioregelsett s where s.modul = 'etg'
        union
        select p.kommentar_id from public.scenarioplasseringer p
        join public.scenarioregelsett s on s.objekt_id = p.objekt_id and s.tilstand = p.tilstand
        where s.modul = 'etg'
      )`)
    expect(rows).toEqual([{ fagmiljo_id: g.fagmiljo.A }])
  })
})

describe('et fagmiljø uten egen katalog', () => {
  it.each(['vanligB', 'adminB', 'arkitektB', 'avsluttetA'] as const)('gir %s en tom katalog i B, ikke A sin', async (p) => {
    const katalog = await katalogFor(p)
    expect(katalog.fagmiljo).toEqual({ id: g.fagmiljo.B, navn: expect.any(String) })
    expect([katalog.metoder, katalog.fortolkninger, katalog.oppforinger, katalog.koblinger]).toEqual([[], [], [], []])
    expect(katalog.finn('AMTNORSUM')).toBeUndefined()
  })

  it('gir ingen EtG-regler i B', async () => {
    const tilfeller = await etgFor('vanligB', await katalogFor('vanligA'))
    expect(tilfeller.status).toBe('feil')
  })

  it('stopper den som ikke har et aktivt medlemskap, som de andre funksjonene', async () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      expect((await feilFra(() => katalogFor(p)))?.message, p).toMatch(/ikke lenger et aktivt medlemskap/)
    }
  })
})

describe('tabellene', () => {
  it.each(['analyttkatalog_metoder', 'analyttkatalog_oppforinger', 'analyttkatalog_koder', 'analyttkatalog_koblinger'])(
    'kan ikke leses direkte av noen innlogget: %s',
    async (tabell) => {
      for (const p of ['systemarkitekt', 'vanligA', 'vanligB'] as const) {
        const feil = await feilFra(() => som(db, g.id[p], (tx) => tx.query(`select * from public.${tabell}`)))
        expect(feil?.code, `${p}: ${tabell}`).toBe('42501')
      }
    },
  )

  it('lar ikke nettleseren be om et annet fagmiljø', async () => {
    const feil = await feilFra(() =>
      som(db, g.id.vanligB, (tx) => tx.query(`select public.les_analyttkatalog($1::uuid)`, [g.fagmiljo.A])),
    )
    expect(feil?.code).toBe('42883')
  })
})
