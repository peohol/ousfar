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
 * rekkevidden fra P4a (`ressursomfang`) og at D3 er avklart. P2.0 er slått
 * sammen og holder; hver inngang prøves i tillegg for seg i
 * `aktivtmedlemskap.test.ts`.
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

/** Etappen som skal gi målet (P0 §6.1). */
type Etappe = (typeof HOLDER)[number] | 'P2a' | 'P2b' | 'P2c'

/** Etappene som er slått sammen: kontrollene deres skal alt holde. */
const HOLDER = ['P1.1', 'P1.2a', 'P2.0', 'P2d'] as const

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
    { navn: 'leser en publisert kommentar', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
    { navn: 'leser en tråd i tabellen', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fagsidetraad]) },
    { navn: 'slår opp en tråd med direktelenke', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select public.direktelenke('diskusjon', $1)`, [k.d.fagsidetraad]) },
    { navn: 'leser idéoversikten', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => nevner(k, 'public.ideoversikt()', k.d.ide) },
    { navn: 'leser andres profil', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.vanligA]) },
    { navn: 'leser andres profilbilde', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from storage.objects where id = $1', [k.d.profilbilde]) },
    { navn: 'laster opp eget profilbilde', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `insert into storage.objects (bucket_id, name) values ('avatarer', $1)`, [`${k.g.id[person]}/avatar.webp`]) },
    { navn: 'leser egne varsler', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select jsonb_array_length(public.mine_varsler() -> 'varsler') > 0`) },
    { navn: 'leser stoffregisterets kategorier', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.stoffkategorier') },
    { navn: 'oppretter en tråd', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_diskusjonskategori('stoff:proeve', 'Prøve', '🧪')`) },
    { navn: 'oppretter en kategori i stoffregisteret', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
    { navn: 'endrer egen profil direkte i tabellen', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, `update public.profiles set first_name = 'Endret' where id = $1 returning id`, [k.g.id[person]]) },
    { navn: 'gir et hjerte til en idé direkte i tabellen', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'insert into public.idehjerter (ide_id, bruker_id) values ($1, $2)', [k.d.ide, k.g.id[person]]) },
    { navn: 'leser sitt eget medlemskap', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.medlemskap where bruker_id = $1', [k.g.id[person]]) },
    { navn: 'leser de felles kildedataene', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select public.les_kurateringer() <> '[]'::jsonb`) },
    { navn: 'leser endringsloggen', person, etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select jsonb_array_length(public.les_endringslogg('{}'::jsonb, false, false, null, 30) -> 'endringer') > 0`) },
  ]),
  // Fortsatt aktive: medlemskapet i B holder, og et dobbeltmedlem beholder begge.
  { navn: 'leser en tråd med aktivt medlemskap bare i B', person: 'avsluttetA', etappe: 'P2.0', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fagsidetraad]) },
  { navn: 'leser idéoversikten med aktivt medlemskap i både A og B', person: 'dobbeltAB', etappe: 'P2.0', idag: 'tilgang', mal: 'tilgang', prov: (k) => nevner(k, 'public.ideoversikt()', k.d.ide) },
  { navn: 'leser datakildestatusen som systemarkitekt med den gamle adminrollen', person: 'systemarkitekt', etappe: 'P2.0', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },
  { navn: 'leser et utkast med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer et utkast med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'leser datakildestatusen med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2.0', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },

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

  // --- P2d: stoffregister og administrasjon (holder) ----------------------
  // Den gamle adminrollen gir ingenting her: det som gjelder hele OUSFAR,
  // krever systemarkitekt, og stoffregisteret rett til å endre det
  // (docs/fagmiljoer.md, «Systemrettigheter»). Utfallene prøves også for
  // hver funksjon for seg i `systemrettigheter.test.ts`.
  { navn: 'oppretter en kategori i stoffregisteret uten redaktøransvar', person: 'vanligA', etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
  { navn: 'plasserer et stoff i stoffregisteret', person: 'vanligB', etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.plasser_stoff('syntetisk-stoff', null, null)`) },
  { navn: 'leser datakildestatusen som lokal admin', person: 'adminB', etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },
  ...(['adminA', 'adminB'] as const).flatMap((person): Scenario[] => [
    { navn: 'oppretter en kategori i stoffregisteret med den gamle adminrollen', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
    { navn: 'tømmer papirkurven for fagsider', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.tom_stoffpapirkurven()') },
    { navn: 'deaktiverer et klinisk verktøy', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.sett_verktoysperre('alle', null, 'Prøve')`) },
    { navn: 'leser kildesakene', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select public.les_fagsaker()') },
    { navn: 'styrer kurateringene', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select public.kuratering_admin('les', '{}')`) },
    { navn: 'legger inn en autoerstatt-regel', person, etappe: 'P2d', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, `insert into public.autoerstatt_regler (finn, erstatt) values ('prøve', 'Prøve') returning id`) },
  ]),
  // Systemarkitektene beholder alt, også uten den gamle adminrollen (maxhag).
  ...(['systemarkitekt', 'arkitektB'] as const).flatMap((person): Scenario[] => [
    { navn: 'oppretter en kategori i stoffregisteret som systemarkitekt', person, etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, `select public.opprett_stoffkategori('Prøve', null)`) },
    { navn: 'leser datakildestatusen som systemarkitekt', person, etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select public.datakilder_status(1)') },
    { navn: 'deaktiverer et klinisk verktøy som systemarkitekt', person, etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, `select public.sett_verktoysperre('alle', null, 'Prøve')`) },
    { navn: 'legger inn en autoerstatt-regel som systemarkitekt', person, etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, `insert into public.autoerstatt_regler (finn, erstatt) values ('prøve', 'Prøve') returning id`) },
  ]),
  // Det felles registeret og nødstoppen leses fortsatt av alle aktive medlemmer.
  { navn: 'leser stoffregisteret', person: 'vanligB', etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, `select jsonb_array_length(public.les_stoffregister('publisert') -> 'sider') >= 0`) },
  { navn: 'leser de aktive verktøysperrene', person: 'vanligA', etappe: 'P2d', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, `select public.les_verktoysperrer() is not null`) },

  // --- Kontroller fra P1.1 som alt holder ---------------------------------
  { navn: 'leser andres medlemskap', person: 'vanligB', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.medlemskap where bruker_id = $1', [k.g.id.vanligA]) },
  { navn: 'gjør seg selv til systemarkitekt', person: 'adminA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `insert into public.systemroller (bruker_id, rolle) values ($1, 'systemarkitekt')`, [k.g.id.adminA]) },
  { navn: 'gjør seg selv til lokal admin', person: 'vanligA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'insert into public.fagmiljoadministratorer (bruker_id, fagmiljo_id) values ($1, $2)', [k.g.id.vanligA, k.g.fagmiljo.A]) },

  // --- Kontroller fra P1.2a som alt holder (myndighet over kontoer) -------
  // `mine_kontohandlinger()` krever selv et aktivt adminskap i et aktivt
  // fagmiljø, eller systemarkitekt, før den gir noe.
  ...(['utenMedlemskap', 'tidligereAdmin', 'vanligA'] as const).map((person): Scenario => (
    { navn: 'ser kontoer den kan gi nytt passord eller ny rolle', person, etappe: 'P1.2a', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select bruker_id from public.mine_kontohandlinger()') }
  )),
  { navn: 'kan gi nytt passord til en vanlig bruker i eget fagmiljø', person: 'adminA', etappe: 'P1.2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select nytt_passord from public.mine_kontohandlinger() where bruker_id = $1', [k.g.id.vanligA]) },
  { navn: 'kan gi nytt passord til et medlem som også hører til B', person: 'adminA', etappe: 'P1.2a', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select nytt_passord from public.mine_kontohandlinger() where bruker_id = $1', [k.g.id.dobbeltAB]) },
  { navn: 'kan endre rollen til en lokal admin', person: 'systemarkitekt', etappe: 'P1.2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select endre_rolle from public.mine_kontohandlinger() where bruker_id = $1', [k.g.id.adminA]) },
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
      [galleri.id.adminA, galleri.id.adminB, galleri.id.arkitektB, galleri.id.arkitektB, galleri.id.systemarkitekt].sort(),
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
    expect(Object.keys(hull).sort()).toEqual(['P2a', 'P2b', 'P2c'])
    for (const etappe of HOLDER) {
      expect(SCENARIOER.some((s) => s.etappe === etappe), etappe).toBe(true)
      expect(SCENARIOER.filter((s) => s.etappe === etappe && s.idag !== s.mal), etappe).toEqual([])
    }
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
