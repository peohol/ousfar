/**
 * P2a: faginnholdet og fortolkningsressursene etter rekkevidden
 * (docs/fagmiljoer.md «Faginnholdet etter rekkevidden», rettighetsmatrisen i
 * docs/ousfar-nasjonal-p0-kartlegging.md §5.2).
 *
 * Databasen fylles med felles innhold (en fagside med et kort, en referanse),
 * dagens regelsett med kommentarene (lokale for A, OUS Klinisk farmakologi) og
 * et regelsett og en kommentar som er flyttet til B (OUS Rettstoksikologi).
 * Det som prøves:
 *
 * 1. At hver tabell i faginnholdet har reglene, og visningene arver dem.
 * 2. Hva hver person i persongalleriet ser i hver tabell, mot en fasit regnet
 *    uavhengig av reglene: det personen så før P2a (reglene fjernet i en
 *    transaksjon som rulles tilbake), med bare objektene personen kan lese, og
 *    utkastene bare med endringsrett. En vanlig bruker i A og
 *    systemarkitekten ser nøyaktig det samme som før.
 * 3. Skriveveiene: hvem som kan opprette, lagre, publisere, gjenopprette og
 *    slette, og at et fremmed objekt gir samme svar som et som ikke finnes.
 * 4. Lesefunksjonene: endringsloggen og kommentarene.
 */
import type { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { regelimportSql } from '../regler/import'
import { TABELLER } from './data/ressurskatalog'
import { DAGENS_IMPORT } from './hjelp/dagensregler'
import { byggPersongalleri, leggInnTestdata, PERSONER, type Person, type Persongalleri, type Testdata } from './hjelp/persongalleri'
import { faginnholdskall, feilFra, nyDatabase, opprettBruker, som, type Faginnholdskall } from './hjelp/testdatabase'

const PERSONENE = Object.keys(PERSONER) as Person[]

/** Tabellene i faginnholdet: objektene og delene deres (ressurskatalogen), og koblingene mellom dem. */
const FAGINNHOLD = [
  ...Object.entries(TABELLER)
    .filter(([, k]) => k.rekkevidde === 'objekt')
    .map(([navn]) => navn.replace(/^public\./, '')),
  'referansekoblinger',
]

let db: PGlite
let g: Persongalleri
let kall: Faginnholdskall
let td: Testdata

/** Objektene testene bruker, ut over persongalleriets testdata. */
const obj = { fagside: '', kort: '', referanse: '', kommentarB: '', kommentarutkastB: '', regelsettA: '', regelsettB: '', analyttB: '' }
/** Kommentarene regelsettet i B bruker, flyttet til B sammen med det. */
let kommentarerTilRegelsettB: string[] = []
const koder = { A: '', B: '' }

interface Tabell {
  navn: string
  /** Visning (arver reglene) eller tabell. */
  visning: boolean
  /** Kolonnen som peker på objektet: fra regelen `rekkevidde`, eller visningens egen. */
  kolonne: string | null
  /** Om raden er publisert, som SQL med raden som `x`. */
  publisert: string
}

let tabeller: Tabell[]

/**
 * Visningene (`security_invoker`) og tabellen de bygger på: en visning skal
 * vise nøyaktig de objektene personen ser i den tabellen.
 */
const VISNINGER: Record<string, { kolonne: string; kilde: string }> = {
  objektstatus: { kolonne: 'id', kilde: 'redigerbare_objekter' },
  objekthistorikk: { kolonne: 'objekt_id', kilde: 'objektrevisjoner' },
  objektutgaver: { kolonne: 'objekt_id', kilde: 'objekttilstander' },
}

const kommentar = (navn: string) => ({ navn, tekst: `Syntetisk tekst for ${navn}.`, plassholdere: [] })

/** Revisjonen utkastet står på nå. */
async function utkastet(objekt: string): Promise<number> {
  const { rows } = await db.query<{ revisjon: number }>(
    `select revisjon from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`,
    [objekt],
  )
  return rows[0]!.revisjon
}

/**
 * Flytter objektene til et annet fagmiljø, slik systemarkitektene gjør det, med
 * begrunnelse, i én oppdatering (et regelsett flyttes sammen med kommentarene sine).
 */
async function flyttTil(objekter: string | string[], fagmiljo: string) {
  await db.transaction(async (tx) => {
    await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Rekkeviddetest: lokalt for B (syntetisk)', true)`)
    await tx.query(`update public.ressursomfang set omfang = 'fagmiljo', fagmiljo_id = $2, regel = null where objekt_id = any ($1)`, [
      ([] as string[]).concat(objekter),
      fagmiljo,
    ])
  })
}

beforeAll(async () => {
  db = await nyDatabase()
  g = await byggPersongalleri(db)
  td = await leggInnTestdata(db, g)
  kall = faginnholdskall(db, g.id.systemarkitekt)
  await db.exec(regelimportSql(DAGENS_IMPORT, 'test.systemarkitekt'))

  // Felles: en fagside med et kort og en referanse, publisert og med et nytt utkast.
  const side = await kall.opprett('infoside', { navn: 'Rekkeviddemiddel' })
  obj.fagside = side.id
  const kort = await kall.opprett('innholdselement', {
    infoside: side.id,
    panel: 'viktige_data',
    posisjon: 0,
    elementtype: 'referanseomrade',
    data: { nedre: 1, ovre: 2, enhet: 'nmol/L', forbehold: '' },
    referanser: [],
  })
  obj.kort = kort.id
  const ref = await kall.opprett('referanse', { tittel: 'Kilde', forfattere: 'Nordmann O', aar: '2021', lenke: 'https://example.org/r' })
  obj.referanse = ref.id
  for (const id of [obj.fagside, obj.kort, obj.referanse]) await kall.publiser(id, await utkastet(id))
  await kall.lagre(obj.fagside, await utkastet(obj.fagside), { navn: 'Rekkeviddemiddel (utkast)' })

  // Lokalt for B: en publisert kommentar, en kommentar som bare er utkast og ett regelsett.
  obj.kommentarB = (await kall.opprett('kommentar', kommentar('Lokal for B'))).id
  await kall.publiser(obj.kommentarB, 1)
  obj.kommentarutkastB = (await kall.opprett('kommentar', kommentar('Utkast for B'))).id
  const regelsett = (
    await db.query<{ objekt_id: string; analyttkode: string }>(
      `select objekt_id, analyttkode from public.intervallregelsett where tilstand = 'publisert' order by analyttkode limit 2`,
    )
  ).rows
  const [a, b] = regelsett as [(typeof regelsett)[number], (typeof regelsett)[number]]
  obj.regelsettA = a.objekt_id
  obj.regelsettB = b.objekt_id
  koder.A = a.analyttkode
  koder.B = b.analyttkode
  // Og en egen laboratorieanalytt, publisert.
  obj.analyttB = (await kall.opprett('laboratorieanalytt', { kode: 'TESTB', hovedside: obj.fagside, komponenter: [obj.fagside] })).id
  await kall.publiser(obj.analyttB, 1)
  for (const id of [obj.kommentarB, obj.kommentarutkastB, obj.analyttB]) await flyttTil(id, g.fagmiljo.B)
  // Regelsettet sammen med kommentarene det bruker (ingen andre regelsett bruker dem).
  const kommentarerB = await db.query<{ id: string }>(
    `select kommentar_id as id from public.intervallregler where regelsett_id = $1
     union select unnest(array[cutoff_innledning_id, cutoff_kommentar_id]) from public.intervallregelsett where objekt_id = $1`,
    [obj.regelsettB],
  )
  kommentarerTilRegelsettB = kommentarerB.rows.map((r) => r.id).filter(Boolean)
  await flyttTil([obj.regelsettB, ...kommentarerTilRegelsettB], g.fagmiljo.B)

  // Kolonnen hver regel slår opp objektet med, og hvordan raden er publisert.
  const { rows } = await db.query<{ navn: string; visning: boolean; qual: string | null; tilstand: boolean }>(
    `select c.relname as navn, c.relkind = 'v' as visning,
            (select p.qual from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.policyname = 'rekkevidde') as qual,
            exists (select 1 from information_schema.columns k
                    where k.table_schema = 'public' and k.table_name = c.relname and k.column_name = 'tilstand') as tilstand
     from pg_class c
     where c.relnamespace = 'public'::regnamespace and c.relname = any ($1)`,
    [FAGINNHOLD],
  )
  const SAERSKILT: Record<string, string> = {
    redigerbare_objekter: `exists (select 1 from public.objekttilstander t where t.objekt_id = x.id and t.tilstand = 'publisert')`,
    objektrevisjoner: `exists (select 1 from public.objektpubliseringer p where p.objekt_id = x.objekt_id and p.revisjon = x.revisjon)`,
    objektpubliseringer: 'true',
  }
  tabeller = rows.map((r) => ({
    navn: r.navn,
    visning: r.visning,
    kolonne: r.visning ? (VISNINGER[r.navn]?.kolonne ?? null) : (r.qual?.match(/r\.objekt_id = \w+\.(\w+)/)?.[1] ?? null),
    publisert: SAERSKILT[r.navn] ?? (r.tilstand ? `x.tilstand = 'publisert'` : 'true'),
  }))
}, 180_000)

afterAll(async () => {
  await db.close()
})

/* --- 1. Reglene ----------------------------------------------------------- */

describe('reglene i faginnholdet', () => {
  it('finnes på hver tabell, begrensende og bare for lesing, og visningene arver dem', async () => {
    expect(tabeller.map((t) => t.navn).sort()).toEqual([...FAGINNHOLD].sort())
    const { rows } = await db.query<{ tabell: string; regel: string; permissive: string; cmd: string; roles: string[] }>(
      `select tablename as tabell, policyname as regel, permissive, cmd, roles::text[] as roles
       from pg_policies where schemaname = 'public' and policyname = 'rekkevidde'`,
    )
    for (const t of tabeller) {
      if (t.visning) {
        const { rows: v } = await db.query<{ invoker: boolean }>(
          `select coalesce('security_invoker=true' = any (reloptions), false) as invoker from pg_class where oid = $1::regclass`,
          [`public.${t.navn}`],
        )
        expect(v[0]!.invoker, t.navn).toBe(true)
        continue
      }
      expect(t.kolonne, t.navn).not.toBeNull()
      const egne = rows.filter((r) => r.tabell === t.navn)
      expect(egne.map((r) => r.regel), t.navn).toEqual(['rekkevidde'])
      for (const r of egne) expect(r, `${t.navn}.${r.regel}`).toMatchObject({ permissive: 'RESTRICTIVE', cmd: 'SELECT', roles: ['authenticated'] })
      // De tillatende slipper utkastene gjennom for den med endringsrett til objektet, ikke for den gamle adminrollen.
      const tillatende = await db.query<{ qual: string }>(
        `select qual from pg_policies where schemaname = 'public' and tablename = $1 and permissive = 'PERMISSIVE' and cmd = 'SELECT'`,
        [t.navn],
      )
      expect(tillatende.rows.some((r) => r.qual.includes('er_admin')), t.navn).toBe(false)
      if (t.navn !== 'objektpubliseringer')
        expect(
          // P5: også redaktørene, for fortolkningen i et fagmiljø og for objektene i ansvaret sitt.
          tillatende.rows.some(
            (r) => r.qual.includes('kan_se_utkast()') && r.qual.includes('mine_redigerbare_fagmiljoer()') && r.qual.includes('mine_redigerbare_objekter()'),
          ),
          t.navn,
        ).toBe(true)
    }
  })

  it('gir nettleseren rekkevidden bare til det den innloggede kan lese', async () => {
    const synlig = async (p: Person) =>
      (await som(db, g.id[p], async (tx) => (await tx.query<{ objekt_id: string }>('select objekt_id from public.ressursomfang')).rows)).map(
        (r) => r.objekt_id,
      )
    const iB = await synlig('vanligB')
    expect(iB).toContain(obj.fagside)
    expect(iB).toContain(obj.kommentarB)
    expect(iB).not.toContain(td.publisertKommentar)
    expect(iB).not.toContain(obj.regelsettA)
    const iA = await synlig('vanligA')
    expect(iA).toContain(td.publisertKommentar)
    expect(iA).not.toContain(obj.kommentarB)
    expect(await synlig('utenMedlemskap')).toEqual([])
    expect((await synlig('systemarkitekt')).length).toBe((await db.query('select 1 from public.ressursomfang')).rows.length)
  })
})

describe('snarveien når alt lokalt innhold kan leses', () => {
  it('gjelder bare den som kan lese hvert fagmiljø med lokalt innhold', async () => {
    const svar = async (p: Person) =>
      som(db, g.id[p], async (tx) => (await tx.query<{ ja: boolean }>('select public.leser_alt_lokale_innhold() as ja')).rows[0]!.ja)
    // Både A og B har lokalt innhold her.
    expect(Object.fromEntries(await Promise.all(PERSONENE.map(async (p) => [p, await svar(p)] as const)))).toEqual({
      systemarkitekt: true,
      arkitektB: true,
      vanligA: false,
      vanligB: false,
      adminA: false,
      adminB: false,
      dobbeltAB: true,
      avsluttetA: false,
      utenMedlemskap: false,
      tidligereAdmin: false,
      redaktorRessursA: false,
      redaktorFortolkningA: false,
      redaktorNasjonal: false,
    })
    // Uten lokalt innhold i B kan en vanlig bruker i A lese alt.
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Rekkeviddetest: tilbake til A (syntetisk)', true)`)
      await tx.query(`update public.ressursomfang set fagmiljo_id = $1 where fagmiljo_id = $2`, [g.fagmiljo.A, g.fagmiljo.B])
      await tx.query(`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: g.id.vanligA, role: 'authenticated' }),
      ])
      expect((await tx.query<{ ja: boolean }>('select public.leser_alt_lokale_innhold() as ja')).rows[0]!.ja).toBe(true)
      await tx.rollback()
    })
  })
})

describe('svaret appen viser redigeringen av fortolkningen etter', () => {
  it('er ja bare med endringsrett i arbeidskonteksten (P4b), også før den har lokalt innhold', async () => {
    const svar = async (p: Person) =>
      som(db, g.id[p], async (tx) => (await tx.query<{ ja: boolean }>('select public.kan_endre_lokalt_innhold() as ja')).rows[0]!.ja)
    const alle = async () => Object.fromEntries(await Promise.all(PERSONENE.map(async (p) => [p, await svar(p)] as const)))
    // Fortolkningen den innloggede ser, er arbeidskontekstens (primærmedlemskapet).
    const fasit = {
      systemarkitekt: true,
      arkitektB: true,
      vanligA: false,
      vanligB: false,
      adminA: true,
      adminB: true,
      dobbeltAB: false,
      avsluttetA: false,
      utenMedlemskap: false,
      tidligereAdmin: false,
      // P5: redaktøren for fortolkningen i arbeidskonteksten.
      redaktorRessursA: false,
      redaktorFortolkningA: true,
      redaktorNasjonal: false,
    }
    expect(await alle()).toEqual(fasit)
    // Uten lokalt innhold i B kan administratoren i B likevel lage B sine egne
    // regler; å administrere B gir ingenting i A.
    await db.transaction(async (tx) => {
      await tx.query(`select set_config('ousfar.tilgangsgrunn', 'Rekkeviddetest: tilbake til A (syntetisk)', true)`)
      await tx.query(`update public.ressursomfang set fagmiljo_id = $1 where fagmiljo_id = $2`, [g.fagmiljo.A, g.fagmiljo.B])
      await tx.query(`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: g.id.adminB, role: 'authenticated' }),
      ])
      expect((await tx.query<{ ja: boolean }>('select public.kan_endre_lokalt_innhold() as ja')).rows[0]!.ja).toBe(true)
      await tx.rollback()
    })
  })
})

/* --- 2. Hva hver person ser ---------------------------------------------- */

type Rader = Record<Person, Record<string, string[]>>

/** Radene (som tekst) hver person ser i hver tabell, med og uten reglene fra P2a. */
async function seRader(): Promise<{ for: Rader; na: Rader }> {
  const lesAlle = async (q: (sql: string) => Promise<{ rows: { rad: string }[] }>) => {
    const ut: Record<string, string[]> = {}
    for (const t of tabeller) {
      const rad = t.visning ? `distinct x.${t.kolonne}::text` : 'x::text'
      ut[t.navn] = (await q(`select ${rad} as rad from public.${t.navn} x`)).rows.map((r) => r.rad).sort()
    }
    return ut
  }
  const for_ = {} as Rader
  await db.transaction(async (tx) => {
    // Uten reglene fra P2a: ingen rekkevidde, og utkastene for alle med endringsrett til noe.
    for (const t of tabeller.filter((t) => !t.visning)) {
      await tx.exec(`drop policy rekkevidde on public.${t.navn}`)
      await tx.exec(`create policy for_p2a on public.${t.navn} for select to authenticated using ((select public.kan_se_utkast()))`)
    }
    for (const p of PERSONENE) {
      await tx.query(`select set_config('role', 'authenticated', true), set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: g.id[p], role: 'authenticated' }),
      ])
      for_[p] = await lesAlle((sql) => tx.query(sql))
      await tx.exec('reset role')
    }
    await tx.rollback()
  })
  const na = {} as Rader
  for (const p of PERSONENE) na[p] = await som(db, g.id[p], (tx) => lesAlle((sql) => tx.query(sql)))
  return { for: for_, na }
}

/** Det personen skal se: det den så før, med bare det den kan lese, og utkastene bare med endringsrett. */
async function fasit(t: Tabell, bruker: string, rader: string[]): Promise<string[]> {
  if (t.visning) throw new Error(`${t.navn} er en visning`)
  if (rader.length === 0) return rader
  const { rows } = await db.query<{ rad: string }>(
    `select x::text as rad from public.${t.navn} x
     where x::text = any ($1::text[])
       and intern.kan_lese_objekt(x.${t.kolonne}, $2)
       and (${t.publisert} or intern.kan_endre_objekt(x.${t.kolonne}, $2))`,
    [rader, bruker],
  )
  return rows.map((r) => r.rad).sort()
}

const INGEN_AVVIK = { antallForMange: 0, antallManglende: 0, forMange: [], manglende: [] }

/** Radene som er for mange og som mangler, med de tre første av hver, så en feil kan leses. */
function avvik(faktisk: string[], forventet: string[]) {
  const f = new Set(faktisk)
  const v = new Set(forventet)
  const forMange = faktisk.filter((r) => !v.has(r))
  const manglende = forventet.filter((r) => !f.has(r))
  return { antallForMange: forMange.length, antallManglende: manglende.length, forMange: forMange.slice(0, 3), manglende: manglende.slice(0, 3) }
}

describe('hva hver person ser i faginnholdet', () => {
  let rader: { for: Rader; na: Rader }
  beforeAll(async () => {
    rader = await seRader()
  }, 180_000)

  it('har data i tabellene som prøves', () => {
    const medRader = tabeller.filter((t) => rader.for.systemarkitekt[t.navn]!.length > 0).map((t) => t.navn)
    for (const t of ['redigerbare_objekter', 'objekttilstander', 'objektrevisjoner', 'objektpubliseringer', 'infosider', 'innholdselementer', 'referanser', 'intervallregelsett', 'intervallregler', 'kommentarer']) {
      expect(medRader, t).toContain(t)
    }
  })

  it.each(PERSONENE)('%s ser nøyaktig fasiten i hver tabell', async (p) => {
    for (const t of tabeller.filter((t) => !t.visning)) {
      expect(avvik(rader.na[p][t.navn]!, await fasit(t, g.id[p], rader.for[p][t.navn]!)), `${p} i ${t.navn}`).toEqual(INGEN_AVVIK)
    }
  })

  it.each(PERSONENE)('%s ser i visningene nøyaktig objektene i tabellene de bygger på', async (p) => {
    for (const t of tabeller.filter((t) => t.visning)) {
      const { kilde } = VISNINGER[t.navn]!
      const kolonne = tabeller.find((k) => k.navn === kilde)!.kolonne!
      const objekter = await som(db, g.id[p], async (tx) =>
        (await tx.query<{ rad: string }>(`select distinct x.${kolonne}::text as rad from public.${kilde} x`)).rows.map((r) => r.rad).sort(),
      )
      expect(avvik(rader.na[p][t.navn]!, objekter), `${p} i ${t.navn}`).toEqual(INGEN_AVVIK)
    }
  })

  it('en vanlig bruker i A og systemarkitekten ser det samme som før (OUS KF uendret)', () => {
    for (const p of ['vanligA', 'systemarkitekt'] as const) {
      for (const t of tabeller) {
        // Det som er flyttet til B, så den vanlige brukeren i A ikke før heller.
        const for_ = rader.for[p][t.navn]!
        const flyttet = [...Object.values(lokaleB()), ...kommentarerTilRegelsettB]
        const forventet = p === 'systemarkitekt' ? for_ : for_.filter((r) => !flyttet.some((id) => r.includes(id)))
        expect(avvik(rader.na[p][t.navn]!, forventet), `${p} i ${t.navn}`).toEqual(INGEN_AVVIK)
      }
    }
  })

  it('B ser ikke As lokale innhold, og A ser ikke Bs', () => {
    const ser = (p: Person, id: string) => rader.na[p].redigerbare_objekter!.some((r) => r.includes(id))
    for (const id of [td.publisertKommentar, obj.regelsettA]) {
      expect(ser('vanligB', id), id).toBe(false)
      expect(ser('adminB', id), id).toBe(false)
      expect(ser('vanligA', id), id).toBe(true)
      expect(ser('dobbeltAB', id), id).toBe(true)
    }
    for (const id of [obj.kommentarB, obj.regelsettB]) {
      expect(ser('vanligA', id), id).toBe(false)
      expect(ser('adminA', id), id).toBe(false)
      expect(ser('vanligB', id), id).toBe(true)
      expect(ser('avsluttetA', id), id).toBe(true)
    }
    for (const p of PERSONENE.filter((p) => PERSONER[p].primaer !== null)) expect(ser(p, obj.fagside), p).toBe(true)
    // Reglene i regelsettet følger det.
    const regler = (p: Person, id: string) => rader.na[p].intervallregler!.filter((r) => r.includes(id)).length
    expect(regler('vanligB', obj.regelsettA)).toBe(0)
    expect(regler('vanligA', obj.regelsettA)).toBeGreaterThan(0)
    expect(regler('vanligA', obj.regelsettB)).toBe(0)
    expect(regler('vanligB', obj.regelsettB)).toBeGreaterThan(0)
  })

  it('utkastene ser bare den som har endringsrett', () => {
    const utkast = (p: Person, id: string) =>
      rader.na[p].objekttilstander!.some((r) => r.includes(id) && r.includes('utkast')) ||
      rader.na[p].kommentarer!.some((r) => r.includes(id) && r.includes('utkast'))
    // Felles utkast: bare systemarkitektene, også uten den gamle adminrollen
    // (arkitektB); nasjonale redaktører er avslått til B2 slås på (P5).
    expect(PERSONENE.filter((p) => utkast(p, obj.fagside))).toEqual(['systemarkitekt', 'arkitektB'])
    // Lokale utkast: administratoren i fagmiljøet, systemarkitektene og
    // redaktøren for fortolkningen der (P5).
    expect(PERSONENE.filter((p) => utkast(p, td.kommentarutkast))).toEqual(['systemarkitekt', 'arkitektB', 'adminA', 'redaktorFortolkningA'])
    expect(PERSONENE.filter((p) => utkast(p, obj.kommentarutkastB))).toEqual(['systemarkitekt', 'arkitektB', 'adminB'])
  })

  it('uten aktivt medlemskap ses ingenting, heller ikke med den gamle adminrollen', () => {
    for (const p of ['utenMedlemskap', 'tidligereAdmin'] as const) {
      for (const t of tabeller) expect(rader.na[p][t.navn], `${p} i ${t.navn}`).toEqual([])
    }
  })
})

const lokaleB = () => ({ kommentar: obj.kommentarB, utkast: obj.kommentarutkastB, regelsett: obj.regelsettB, analytt: obj.analyttB })

/* --- 3. Skriveveiene ------------------------------------------------------ */

describe('hvem som kan endre faginnholdet', () => {
  const kode = async (kallet: () => Promise<unknown>) => (await feilFra(kallet))?.code ?? 'ok'

  it('felles innhold endres bare av systemarkitekten', async () => {
    const lagre = (p: Person) => kode(async () => kall.lagre(obj.fagside, await utkastet(obj.fagside), { navn: `Rekkeviddemiddel ${p}` }, g.id[p]))
    for (const p of ['adminA', 'adminB', 'dobbeltAB', 'vanligA', 'tidligereAdmin'] as const) expect(await lagre(p), p).toBe('42501')
    expect(await lagre('systemarkitekt')).toBe('ok')
    expect(await kode(() => kall.rpc(g.id.adminA, 'slett_referanse', { objekt: obj.referanse, forventet_revisjon: 1 }))).toBe('42501')
    expect(await kode(() => kall.publiser(obj.kort, 1, g.id.adminA))).toBe('42501')
  })

  it('lokalt innhold endres av administratorene i fagmiljøet og systemarkitekten', async () => {
    const lagre = (p: Person, id: string) =>
      kode(async () => kall.lagre(id, await utkastet(id), kommentar(`Endret av ${p}`), g.id[p]))
    expect(await lagre('adminA', td.kommentarutkast)).toBe('ok')
    expect(await lagre('adminB', obj.kommentarutkastB)).toBe('ok')
    expect(await lagre('systemarkitekt', obj.kommentarutkastB)).toBe('ok')
    // Et medlemskap gir ikke endringsrett.
    expect(await lagre('dobbeltAB', td.kommentarutkast)).toBe('42501')
    expect(await lagre('vanligB', obj.kommentarutkastB)).toBe('42501')
    expect(await kode(() => kall.publiser(td.kommentarutkast, 2, g.id.adminA))).toBe('ok')
  })

  it('følger rettighetene, ikke den gamle adminrollen', async () => {
    // En lokal administrator i A uten den gamle adminrollen, og en med bare den.
    const lokal = await opprettBruker(db, { brukernavn: 'lokal.uten.rolle', fornavn: 'Lise', etternavn: 'Lokal', rolle: 'user', lokalAdmin: true })
    const bareRollen = await opprettBruker(db, { brukernavn: 'bare.rollen', fornavn: 'Rolf', etternavn: 'Rolle', rolle: 'admin' })
    const som_ = (bruker: string) => ({
      lagre: (id: string, innhold: Parameters<Faginnholdskall['lagre']>[2]) => kode(async () => kall.lagre(id, await utkastet(id), innhold, bruker)),
      publiser: (id: string) => kode(async () => kall.publiser(id, await utkastet(id), bruker)),
      regelsett: (id: string) =>
        kode(async () =>
          kall.rpc(bruker, 'lagre_intervallregelsett', {
            objekt: id,
            forventet_revisjon: await utkastet(id),
            innhold: (await db.query<{ innhold: unknown }>(
              `select r.innhold from public.objektrevisjoner r join public.objekttilstander t
               on t.objekt_id = r.objekt_id and t.revisjon = r.revisjon and t.tilstand = 'utkast' where r.objekt_id = $1`,
              [id],
            )).rows[0]!.innhold,
            kommentarer: [],
          }),
        ),
      utkast: (id: string) =>
        som(db, bruker, async (tx) =>
          (await tx.query(`select 1 from public.objekttilstander where objekt_id = $1 and tilstand = 'utkast'`, [id])).rows.length,
        ),
      lokalt: () =>
        som(db, bruker, async (tx) => (await tx.query<{ ja: boolean }>('select public.kan_endre_lokalt_innhold() as ja')).rows[0]!.ja),
    })

    // Systemarkitekten uten den gamle adminrollen (som maxhag) endrer og publiserer felles innhold, og ser utkastene.
    const arkitekt = som_(g.id.arkitektB)
    expect(await arkitekt.lagre(obj.fagside, { navn: 'Rekkeviddemiddel (arkitektB)' })).toBe('ok')
    expect(await arkitekt.publiser(obj.fagside)).toBe('ok')
    expect(await arkitekt.utkast(obj.fagside)).toBe(1)
    expect(await arkitekt.regelsett(obj.regelsettA)).toBe('ok')

    // Den lokale administratoren uten rollen endrer sitt eget lokale innhold, ikke det felles og ikke Bs.
    const lokalA = som_(lokal)
    expect(await lokalA.lokalt()).toBe(true)
    expect(await lokalA.lagre(td.kommentarutkast, kommentar('Endret uten rollen'))).toBe('ok')
    expect(await lokalA.regelsett(obj.regelsettA)).toBe('ok')
    expect(await lokalA.utkast(td.kommentarutkast)).toBe(1)
    expect(await lokalA.lagre(obj.fagside, { navn: 'Forsøk' })).toBe('42501')
    expect(await lokalA.utkast(obj.fagside)).toBe(0)
    expect(await lokalA.regelsett(obj.regelsettB)).toBe('PT404')

    // Den gamle adminrollen alene gir ingenting, og ingen utkast.
    const rollen = som_(bareRollen)
    expect(await rollen.lokalt()).toBe(false)
    for (const id of [obj.fagside, td.kommentarutkast]) {
      expect(await rollen.lagre(id, { navn: 'Forsøk' }), id).toBe('42501')
      expect(await rollen.publiser(id), id).toBe('42501')
      expect(await rollen.utkast(id), id).toBe(0)
    }
    expect(await rollen.regelsett(obj.regelsettA)).toBe('42501')
    expect(await kode(() => kall.rpc(bareRollen, 'opprett_utkast', { objekttype: 'kommentar', innhold: kommentar('Fra rollen') }))).toBe('42501')
  })

  it('et annet fagmiljøs objekt gir samme svar som et som ikke finnes', async () => {
    const ukjent = crypto.randomUUID()
    const svar = async (p: Person, id: string) => {
      const feil = await feilFra(() => kall.lagre(id, 1, kommentar('Forsøk'), g.id[p]))
      return feil && { code: feil.code, message: feil.message }
    }
    const finnesIkke = await svar('adminB', ukjent)
    expect(finnesIkke).toEqual({ code: 'PT404', message: 'Fant ikke objektet.' })
    expect(await svar('adminB', td.publisertKommentar)).toEqual(finnesIkke)
    expect(await svar('adminA', obj.kommentarB)).toEqual(finnesIkke)
    // Gjenoppretting og publisering går samme vei.
    expect(await kode(() => kall.gjenopprett(td.publisertKommentar, 1, 1, g.id.adminB))).toBe('PT404')
    expect(await kode(() => kall.publiser(obj.kommentarutkastB, 1, g.id.adminA))).toBe('PT404')
    // Også når et regelsett lagres sammen med nye kommentarer.
    const regelsett = (p: Person, id: string) =>
      feilFra(() =>
        kall.rpc(g.id[p], 'lagre_intervallregelsett', {
          objekt: id,
          forventet_revisjon: 1,
          innhold: {},
          kommentarer: [{ id: crypto.randomUUID(), revisjon: null, innhold: kommentar('Ny') }],
        }),
      ).then((f) => f && { code: f.code, message: f.message })
    expect(await regelsett('adminB', obj.regelsettA)).toEqual(finnesIkke)
    expect(await regelsett('adminA', obj.regelsettB)).toEqual(finnesIkke)
  })

  it('nye objekter opprettes bare med endringsrett til rekkevidden de får', async () => {
    const opprett = (p: Person, type: 'kommentar' | 'infoside' | 'referanse', innhold: object) =>
      kode(() => kall.rpc(g.id[p], 'opprett_utkast', { objekttype: type, innhold }))
    // En kommentar blir lokal for fagmiljøet den lages i (arbeidskonteksten,
    // P4b): bare administratorene der og systemarkitekten kan lage den.
    expect(await opprett('adminA', 'kommentar', kommentar('Ny i A'))).toBe('ok')
    expect(await opprett('adminB', 'kommentar', kommentar('Ny i B'))).toBe('ok')
    expect(await opprett('vanligB', 'kommentar', kommentar('Ny fra B'))).toBe('42501')
    expect(await opprett('dobbeltAB', 'kommentar', kommentar('Ny fra B'))).toBe('42501')
    expect(await opprett('systemarkitekt', 'kommentar', kommentar('Ny av systemarkitekten'))).toBe('ok')
    const fagmiljoTil = async (navn: string) =>
      (await db.query<{ f: string }>(
        `select r.fagmiljo_id as f from public.kommentarer k join public.ressursomfang r on r.objekt_id = k.objekt_id where k.navn = $1`,
        [navn],
      )).rows.map((r) => r.f)
    expect(await fagmiljoTil('Ny i A')).toEqual([g.fagmiljo.A])
    expect(await fagmiljoTil('Ny i B')).toEqual([g.fagmiljo.B])
    // Fagsider og referanser er felles.
    expect(await opprett('adminA', 'infoside', { navn: 'Ny fagside fra A' })).toBe('42501')
    expect(await opprett('adminA', 'referanse', { tittel: 'T', forfattere: 'F', aar: '2020', lenke: 'https://example.org/n' })).toBe('42501')
    expect(await opprett('systemarkitekt', 'infoside', { navn: 'Ny fagside' })).toBe('ok')
    // Opprettelsen som ble avvist, er rullet tilbake.
    expect((await db.query(`select 1 from public.kommentarer where navn = 'Ny fra B'`)).rows).toEqual([])
  })
})

/* --- 4. Lesefunksjonene --------------------------------------------------- */

describe('lesefunksjonene', () => {
  it('endringsloggen viser bare det den innloggede kan lese', async () => {
    const logg = async (p: Person, kode_: string) =>
      (
        await kall.rpc<{ les_endringslogg: { endringer: unknown[] } }>(g.id[p], 'les_endringslogg', {
          side: { analyttkoder: [kode_] },
          med_utkast: true,
        })
      ).les_endringslogg.endringer.length
    expect(await logg('vanligA', koder.A)).toBeGreaterThan(0)
    expect(await logg('vanligB', koder.A)).toBe(0)
    expect(await logg('adminB', koder.A)).toBe(0)
    expect(await logg('vanligB', koder.B)).toBeGreaterThan(0)
    expect(await logg('vanligA', koder.B)).toBe(0)
  })

  it('kommentarene leses bare der de hører til, også med ID-ene oppgitt', async () => {
    const les = async (p: Person, ider: string[]) =>
      (await kall.rpc<{ les_kommentarer: { objekt_id: string }[] }>(g.id[p], 'les_kommentarer', { kommentartilstand: 'publisert', ider }))
        .les_kommentarer.length
    expect(await les('vanligA', [td.publisertKommentar])).toBe(1)
    expect(await les('vanligB', [td.publisertKommentar])).toBe(0)
    expect(await les('vanligB', [obj.kommentarB])).toBe(1)
    expect(await les('vanligA', [obj.kommentarB])).toBe(0)
  })
})
