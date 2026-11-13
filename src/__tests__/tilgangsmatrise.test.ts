/**
 * De negative tilgangstestene fra P0 §4 og §6.4, forberedt for P2
 * (docs/p2-0-forberedelse.md): hvert scenario står med utfallet i dag og
 * målet etter etappen som skal lukke det.
 *
 * Testen krever at utfallet i dag er det som står. Når en etappe lukker et
 * hull, feiler scenarioet til `idag` settes lik `mal`; da er hullet bevist
 * lukket. En etappe er ferdig når ingen av scenarioene dens har `idag` ulik
 * `mal` (se `apneHull`). Ingen tilgangsregel endres her.
 *
 * Målene er rettighetsmatrisen i P0 §5.2. Scenarioene for P2a forutsetter
 * rekkevidden fra P4a (`ressursomfang`) og at D3 er avklart.
 */
import type { PGlite, Transaction } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  avsluttMedlemskap,
  byggPersongalleri,
  leggInnTestdata,
  medlemskapI,
  opprettFagmiljo,
  PERSONER,
  type Person,
  type Persongalleri,
  type Testdata,
} from './hjelp/persongalleri'
import { nyDatabase, som } from './hjelp/testdatabase'

type Utfall = 'tilgang' | 'avvist'

/** Etappen som skal gi målet (P0 §6.1); `P1.1` er kontroller som alt holder. */
type Etappe = 'P1.1' | 'P2.0' | 'P2a' | 'P2b' | 'P2c' | 'P2d'

interface Kontekst {
  tx: Transaction
  d: Testdata
  g: Persongalleri
}

interface Scenario {
  navn: string
  person: Person
  etappe: Etappe
  idag: Utfall
  mal: Utfall
  /** Gir `true` når personen fikk tilgang (lest noe eller fått skrive). En nektet tilgang (42501) gir `avvist`. */
  prov: (k: Kontekst) => Promise<boolean>
}

const KOMMENTAR = { navn: 'Tilgangstest publisert', tekst: 'Endret syntetisk tekst.', plassholdere: [] }

const rader = async (k: Kontekst, sql: string, parametre: unknown[] = []) => (await k.tx.query(sql, parametre)).rows.length > 0
const verdi = async (k: Kontekst, sql: string, parametre: unknown[] = []) => {
  const rad = (await k.tx.query<Record<string, unknown>>(sql, parametre)).rows[0]
  const v = rad && Object.values(rad)[0]
  return v !== null && v !== undefined && v !== false
}
const lykkes = async (k: Kontekst, sql: string, parametre: unknown[] = []) => {
  await k.tx.query(sql, parametre)
  return true
}

/** Om svaret fra en funksjon som gir JSON, nevner ID-en. */
const nevner = (k: Kontekst, kall: string, id: string, parametre: unknown[] = []) =>
  verdi(k, `select strpos((${kall})::text, $${parametre.length + 1}) > 0`, [...parametre, id])

const lesKommentar = (tilstand: 'publisert' | 'utkast', hvilken: keyof Testdata) => (k: Kontekst) =>
  nevner(k, `public.les_kommentarer($1, array[$2]::uuid[])`, k.d[hvilken], [tilstand, k.d[hvilken]])

const SCENARIOER: readonly Scenario[] = [
  // --- P2.0: gyldig token, men ingen aktive medlemskap ---------------------
  ...(['utenMedlemskap', 'tidligereAdmin'] as const).flatMap((person): Scenario[] => [
    { navn: 'leser en publisert kommentar', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
    { navn: 'leser en tråd i tabellen', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fagsidetraad]) },
    { navn: 'slår opp en tråd med direktelenke', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, `select public.direktelenke('diskusjon', $1)`, [k.d.fagsidetraad]) },
    { navn: 'leser idéoversikten', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => nevner(k, 'public.ideoversikt()', k.d.ide) },
    { navn: 'leser andres profil', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.vanligA]) },
    { navn: 'leser egne varsler', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, `select jsonb_array_length(public.mine_varsler() -> 'varsler') > 0`) },
    { navn: 'leser stoffregisterets kategorier', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => rader(k, 'select id from public.stoffkategorier') },
    { navn: 'oppretter en tråd', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_diskusjonskategori('stoff:proeve', 'Prøve', '🧪')`) },
    { navn: 'oppretter en kategori i stoffregisteret', person, etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
  ]),
  { navn: 'leser et utkast med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer et utkast med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'leser datakildestatusen med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },

  // --- P2a: faginnhold og regler (lokalt for A etter P0 §3) ---------------
  { navn: 'leser A sin publiserte fortolkningskommentar', person: 'vanligB', etappe: 'P2a', idag: 'tilgang', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser A sin publiserte fortolkningskommentar etter avsluttet medlemskap i A', person: 'avsluttetA', etappe: 'P2a', idag: 'tilgang', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'tilgang', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'publiserer A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, 'select public.publiser_utkast($1, 1)', [k.d.kommentarutkast]) },
  { navn: 'leser A sin publiserte kommentar med aktivt medlemskap i A', person: 'dobbeltAB', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser et utkast som vanlig bruker', person: 'vanligA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'leser et utkast som systemarkitekt', person: 'systemarkitekt', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer et utkast som lokal admin i eget fagmiljø', person: 'adminA', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },

  // --- P2b: samhandling og varsler ----------------------------------------
  { navn: 'får varsel om publisering av A sin fortolkning', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => rader(k, `select id from public.varsler where kategori = 'fortolkning'`) },
  { navn: 'leser en tråd på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fortolkningstraad]) },
  { navn: 'slår opp en tråd på A sin fortolkningsside med direktelenke', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, `select public.direktelenke('diskusjon', $1)`, [k.d.fortolkningstraad]) },
  { navn: 'gir nytt navn til en annens tråd', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, 'select public.sett_diskusjonstittel($1, $2)', [k.d.fagsidetraad, 'Nytt navn']) },
  { navn: 'flytter en lokal tråd til en felles fagside', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, `select public.flytt_diskusjon_til_side($1, 'stoff:syntetisk-stoff', null, 'Flyttet', '📦')`, [k.d.fortolkningstraad]) },
  { navn: 'rydder idéarkivet', person: 'vanligA', etappe: 'P2b', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, 'select public.rydd_idearkiv()') },

  // --- P2c: profiler og bilder --------------------------------------------
  { navn: 'leser rollen til en administrator i et annet fagmiljø', person: 'vanligB', etappe: 'P2c', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, 'select role from public.profiles where id = $1', [k.g.id.adminA]) },

  // --- P2d: stoffregister og administrasjon -------------------------------
  { navn: 'oppretter en kategori i stoffregisteret uten redaktøransvar', person: 'vanligA', etappe: 'P2d', idag: 'tilgang', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
  { navn: 'leser datakildestatusen som lokal admin', person: 'adminB', etappe: 'P2d', idag: 'tilgang', mal: 'avvist', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },

  // --- Kontroller fra P1.1 som alt holder ---------------------------------
  { navn: 'leser andres medlemskap', person: 'vanligB', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.medlemskap where bruker_id = $1', [k.g.id.vanligA]) },
  { navn: 'gjør seg selv til systemarkitekt', person: 'adminA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `insert into public.systemroller (bruker_id, rolle) values ($1, 'systemarkitekt')`, [k.g.id.adminA]) },
  { navn: 'gjør seg selv til lokal admin', person: 'vanligA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [k.g.id.vanligA, k.g.fagmiljo.A]) },
]

/** Scenarioene der målet ikke er nådd ennå, per etappe. */
function apneHull(scenarioer: readonly Scenario[] = SCENARIOER): Partial<Record<Etappe, string[]>> {
  const hull: Partial<Record<Etappe, string[]>> = {}
  for (const s of scenarioer.filter((s) => s.idag !== s.mal)) (hull[s.etappe] ??= []).push(`${s.person}: ${s.navn}`)
  return hull
}

let db: PGlite
let galleri: Persongalleri
let data: Testdata

beforeAll(async () => {
  db = await nyDatabase()
  galleri = await byggPersongalleri(db)
  data = await leggInnTestdata(db, galleri)
}, 120_000)

afterAll(async () => {
  await db.close()
})

/** Prøver scenarioet som personen, i en transaksjon som alltid rulles tilbake. */
async function utfall(s: Scenario): Promise<Utfall> {
  try {
    return await som(db, galleri.id[s.person], async (tx) => {
      try {
        return (await s.prov({ tx, d: data, g: galleri })) ? 'tilgang' : 'avvist'
      } finally {
        await tx.rollback()
      }
    })
  } catch (feil) {
    if ((feil as { code?: string }).code === '42501') return 'avvist'
    throw feil
  }
}

describe('persongalleriet', () => {
  it('har medlemskapene og rollene galleriet beskriver', async () => {
    const faktisk = await medlemskapI(db, galleri)
    for (const [p, def] of Object.entries(PERSONER) as [Person, (typeof PERSONER)[Person]][]) {
      const ogsa = 'ogsaAktivI' in def ? def.ogsaAktivI : []
      const avsluttet = 'avsluttetI' in def ? [def.avsluttetI] : []
      expect(faktisk[p], p).toEqual({
        primaer: def.primaer,
        aktive: [...(def.primaer ? [def.primaer] : []), ...ogsa].sort(),
        avsluttet,
      })
    }
    const { rows } = await db.query<{ bruker_id: string }>(
      'select bruker_id from public.fagmiljoadministratorer where til is null union all select bruker_id from public.systemroller where tilbakekalt_kl is null',
    )
    expect(rows.map((r) => r.bruker_id).sort()).toEqual(
      [galleri.id.adminA, galleri.id.adminB, galleri.id.systemarkitekt].sort(),
    )
  })

  it('følger invariantene fra P1.1 for alle med aktivt medlemskap', async () => {
    // Kontrollene er utsatte; `set constraints all immediate` kjører dem nå
    // for hver rad som røres.
    const feil = await db
      .transaction(async (tx) => {
        await tx.exec('set constraints all immediate')
        await tx.exec(`update public.medlemskap set primaer = primaer where status = 'aktiv'`)
        await tx.exec('update public.fagmiljoadministratorer set fra = fra')
        await tx.rollback()
      })
      .then(() => null, (f: Error) => f.message)
    expect(feil).toBeNull()
  })
})

describe('tilgangsmatrisen', () => {
  it.each(SCENARIOER.map((s) => [`${s.etappe} – ${s.person} ${s.navn}`, s] as const))('%s', async (_, s) => {
    const faktisk = await utfall(s)
    expect(faktisk, faktisk === s.mal ? `Hullet er lukket: sett idag til «${s.mal}».` : 'Utfallet har endret seg.').toBe(s.idag)
  })

  it('har et mål for hver etappe som ikke er nådd, og kontroller som alt holder', () => {
    const hull = apneHull()
    expect(Object.keys(hull).sort()).toEqual(['P2.0', 'P2a', 'P2b', 'P2c', 'P2d'])
    expect(SCENARIOER.filter((s) => s.etappe === 'P1.1' && s.idag !== s.mal)).toEqual([])
    expect(new Set(SCENARIOER.map((s) => `${s.person}|${s.navn}`)).size).toBe(SCENARIOER.length)
  })
})

// Sist, fordi den endrer galleriet.
describe('hjelperne for nye fagmiljøer og medlemskap', () => {
  it('oppretter et fagmiljø med administrator, og avslutter ett medlemskap uten å røre de andre', async () => {
    const nytt = await opprettFagmiljo(db, { nokkel: 'test-miljo-c', navn: 'Testmiljø C', administrator: galleri.id.adminA })
    const { rows } = await db.query<{ n: number }>(
      'select count(*)::int as n from public.fagmiljoadministratorer where fagmiljo_id = $1 and bruker_id = $2 and til is null',
      [nytt, galleri.id.adminA],
    )
    expect(rows[0]!.n).toBe(1)

    await avsluttMedlemskap(db, galleri.id.dobbeltAB, galleri.fagmiljo.B)
    expect((await medlemskapI(db, galleri)).dobbeltAB).toEqual({ aktive: ['A'], primaer: 'A', avsluttet: ['B'] })
  })
})
