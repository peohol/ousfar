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
type Etappe = (typeof HOLDER)[number]

/** Etappene som er slått sammen: kontrollene deres skal alt holde. */
const HOLDER = ['P1.1', 'P1.2a', 'P2.0', 'P2a', 'P2b', 'P2c', 'P2d', 'P4b', 'P5', '#572', '#598'] as const

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
  /** Gir `true` når personen fikk tilgang (lest noe eller fått skrive). En nektet tilgang (42501, eller PT404 for et objekt personen ikke kan lese) gir `avvist`. */
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

/** Om fagmiljøet er blant den innloggedes egne (#572). */
const egetFagmiljo = (f: 'A' | 'B') => (k: Kontekst) => verdi(k, 'select $1 = any (public.mine_egne_fagmiljoer())', [k.g.fagmiljo[f]])

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
  { navn: 'leser A sin publiserte fortolkningskommentar', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser A sin publiserte fortolkningskommentar etter avsluttet medlemskap i A', person: 'avsluttetA', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'publiserer A sitt utkast som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.publiser_utkast($1, 1)', [k.d.kommentarutkast]) },
  { navn: 'leser A sin publiserte kommentar direkte i tabellen', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.kommentarer where objekt_id = $1', [k.d.publisertKommentar]) },
  { navn: 'leser A sitt publiserte objekt i objektregisteret', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.redigerbare_objekter where id = $1', [k.d.publisertKommentar]) },
  { navn: 'leser revisjonene og publiseringene til A sin kommentar', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.objektrevisjoner where objekt_id = $1 union all select 1 from public.objektpubliseringer where objekt_id = $1', [k.d.publisertKommentar]) },
  { navn: 'leser historikken til A sin kommentar', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select jsonb_array_length(public.les_historikk($1) -> 'hendelser') > 0`, [k.d.publisertKommentar]) },
  { navn: 'leser rekkevidden til A sin kommentar', person: 'vanligB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.ressursomfang where objekt_id = $1', [k.d.publisertKommentar]) },
  { navn: 'leser rekkevidden til A sin kommentar som medlem i A', person: 'vanligA', etappe: 'P2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select 1 from public.ressursomfang where objekt_id = $1', [k.d.publisertKommentar]) },
  { navn: 'gjenoppretter en revisjon av A sin kommentar som lokal admin i B', person: 'adminB', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.gjenopprett_revisjon($1, 1, 1)', [k.d.publisertKommentar]) },
  { navn: 'leser A sitt utkast etter avsluttet medlemskap i A med den gamle adminrollen', person: 'tidligereAdmin', etappe: 'P2a', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'oppretter en fortolkningskommentar som lokal admin i eget fagmiljø', person: 'adminA', etappe: 'P2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, `select public.opprett_utkast('kommentar', $1)`, [JSON.stringify(KOMMENTAR)]) },
  { navn: 'publiserer et utkast som lokal admin i eget fagmiljø', person: 'adminA', etappe: 'P2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.publiser_utkast($1, 1)', [k.d.kommentarutkast]) },
  { navn: 'lagrer A sitt utkast som systemarkitekt', person: 'systemarkitekt', etappe: 'P2a', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'leser A sin publiserte kommentar med aktivt medlemskap i A', person: 'dobbeltAB', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: lesKommentar('publisert', 'publisertKommentar') },
  { navn: 'leser et utkast som vanlig bruker', person: 'vanligA', etappe: 'P1.1', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'leser et utkast som systemarkitekt', person: 'systemarkitekt', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer et utkast som lokal admin i eget fagmiljø', person: 'adminA', etappe: 'P1.1', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },

  // --- P4b: fortolkningen per fagmiljø (arbeidskonteksten) ----------------
  // Et nytt lokalt objekt hører til fagmiljøet det lages i, så en lokal admin
  // i B lager B sitt, aldri A sitt; og B sin fortolkningsside for en kode er
  // B sin egen, ved siden av A sin.
  { navn: 'oppretter en fortolkningskommentar som lokal admin i B, som hører til B', person: 'adminB', etappe: 'P4b', idag: 'tilgang', mal: 'tilgang', prov: async (k) => {
    const { rows } = await k.tx.query<{ id: string }>(`select (public.opprett_utkast('kommentar', $1)).id`, [JSON.stringify(KOMMENTAR)])
    return verdi(k, 'select fagmiljo_id = $2 from public.ressursomfang where objekt_id = $1', [rows[0]!.id, k.g.fagmiljo.B])
  } },
  { navn: 'starter en tråd på fortolkningssiden til samme kode, som hører til B', person: 'vanligB', etappe: 'P4b', idag: 'tilgang', mal: 'tilgang', prov: async (k) => {
    const { rows } = await k.tx.query<{ id: string }>(`select public.opprett_diskusjon('fortolkning:syntetisk-analytt', null, 'B sin egen', null, 'Ny', '🚪') as id`)
    return verdi(k, 'select fagmiljo_id = $2 from public.diskusjoner where id = $1', [rows[0]!.id, k.g.fagmiljo.B])
  } },
  ...(['adminB', 'arkitektB'] as const).map((person): Scenario => ({
    navn: 'lager et regelsett i B som peker på A sin kommentar (manipulert ID)',
    person,
    etappe: 'P4b',
    idag: 'avvist',
    mal: 'avvist',
    prov: (k) =>
      lykkes(k, `select public.opprett_utkast('intervallregelsett', $1)`, [
        JSON.stringify({
          analyttkode: 'TESTB',
          enhet: 'nmol/L',
          desimaler: 0,
          skillepunkter: [],
          intervaller: [{ niva: 'innenfor', handling: null, kommentar: k.d.publisertKommentar }],
          ringegrense: null,
          cutoff: null,
        }),
      ]),
  })),

  // --- P2b: samhandling og varsler ----------------------------------------
  { navn: 'får varsel om publisering av A sin fortolkning', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, `select id from public.varsler where kategori = 'fortolkning'`) },
  { navn: 'leser en tråd på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fortolkningstraad]) },
  { navn: 'slår opp en tråd på A sin fortolkningsside med direktelenke', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select public.direktelenke('diskusjon', $1)`, [k.d.fortolkningstraad]) },
  { navn: 'gir nytt navn til en annens tråd', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.sett_diskusjonstittel($1, $2)', [k.d.fagsidetraad, 'Nytt navn']) },
  { navn: 'flytter en lokal tråd til en felles fagside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.flytt_diskusjon_til_side($1, 'stoff:syntetisk-stoff', null, 'Flyttet', '📦')`, [k.d.fortolkningstraad]) },
  { navn: 'flytter sin egen lokale tråd til en felles fagside', person: 'vanligA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.flytt_diskusjon_til_side($1, 'stoff:syntetisk-stoff', null, 'Flyttet', '📦')`, [k.d.fortolkningstraad]) },
  { navn: 'leser en tråd på A sin fortolkningsside etter avsluttet medlemskap i A', person: 'avsluttetA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fortolkningstraad]) },
  { navn: 'leser kommentarene i en tråd på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select public.diskusjonstraad($1)`, [k.d.fortolkningstraad]) },
  { navn: 'leser kategoriene på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, `select id from public.diskusjonskategorier where side = 'fortolkning:syntetisk-analytt'`) },
  { navn: 'kommenterer en tråd på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `insert into public.diskusjonskommentarer (diskusjon_id, tekst) values ($1, '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hei"}]}]}')`, [k.d.fortolkningstraad]) },
  { navn: 'gir et hjerte i en tråd på A sin fortolkningsside', person: 'vanligB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'insert into public.diskusjonshjerter (diskusjon_id) values ($1)', [k.d.fortolkningstraad]) },
  { navn: 'skjuler innlegget i en tråd på A sin fortolkningsside som lokal admin i B', person: 'adminB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.skjul_i_diskusjon($1, null)', [k.d.fortolkningstraad]) },
  { navn: 'skjuler innlegget i en tråd på en felles fagside med den gamle adminrollen', person: 'adminA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.skjul_i_diskusjon($1, null)', [k.d.fagsidetraad]) },
  { navn: 'leser en tråd på A sin fortolkningsside med aktivt medlemskap i både A og B', person: 'dobbeltAB', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fortolkningstraad]) },
  { navn: 'leser en tråd på en felles fagside', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => nevner(k, `public.direktelenke('diskusjon', $1)`, k.d.fagsidetraad, [k.d.fagsidetraad]) },
  { navn: 'skjuler innlegget i en tråd på eget fagmiljøs fortolkningsside som lokal admin', person: 'adminA', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.skjul_i_diskusjon($1, null)', [k.d.fortolkningstraad]) },
  { navn: 'skjuler innlegget i en tråd på en felles fagside', person: 'systemarkitekt', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.skjul_i_diskusjon($1, null)', [k.d.fagsidetraad]) },
  { navn: 'leser en tråd på A sin fortolkningsside', person: 'systemarkitekt', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.diskusjoner where id = $1', [k.d.fortolkningstraad]) },
  // D8 (Peder 2026-11-14): idéene deles av alle aktive medlemmer; oppgavene og
  // administrasjonen av idéene er forbeholdt systemarkitektene.
  { navn: 'rydder idéarkivet', person: 'vanligA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.rydd_idearkiv()') },
  { navn: 'legger en idé i arkivet med den gamle adminrollen', person: 'adminA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.arkiver_ide($1)', [k.d.ide]) },
  { navn: 'leser de planlagte oppgavene', person: 'vanligA', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.oppgaveoversikt()') },
  { navn: 'leser de planlagte oppgavene som lokal administrator', person: 'adminB', etappe: 'P2b', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.oppgaveoversikt()') },
  { navn: 'legger en idé i arkivet som systemarkitekt', person: 'systemarkitekt', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.arkiver_ide($1)', [k.d.ide]) },
  { navn: 'leser de planlagte oppgavene som systemarkitekt', person: 'systemarkitekt', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.oppgaveoversikt()') },
  { navn: 'leser en idé fra en bruker i A', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => nevner(k, 'public.ideoversikt()', k.d.ide) },
  { navn: 'kommenterer en idé fra en bruker i A', person: 'vanligB', etappe: 'P2b', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, `insert into public.idekommentarer (ide_id, tekst) values ($1, '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hei"}]}]}')`, [k.d.ide]) },

  // --- P2c: profiler og bilder --------------------------------------------
  // Andre leser bare profilkortet, og bare til dem de samhandler med
  // (docs/fagmiljoer.md, «Profiler og profilbilder»).
  { navn: 'leser rollen til en administrator i et annet fagmiljø', person: 'vanligB', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select role from public.profiles where id = $1', [k.g.id.adminA]) },
  { navn: 'leser om en kollega må bytte passord', person: 'vanligA', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select must_change_password is not null from public.profiles where id = $1', [k.g.id.adminA]) },
  { navn: 'leser profilkortet til en i et annet fagmiljø uten samhandling', person: 'vanligA', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.adminB]) },
  { navn: 'leser profilkortet til en i et annet fagmiljø som lokal admin', person: 'adminA', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.vanligB]) },
  { navn: 'leser profilkortet til en i eget fagmiljø', person: 'vanligA', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.adminA]) },
  { navn: 'leser profilkortet til en i det andre av sine fagmiljøer', person: 'dobbeltAB', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.adminB]) },
  { navn: 'leser profilkortet til forfatteren av en tråd den kan lese', person: 'vanligB', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.vanligA]) },
  { navn: 'ser profilbildet til forfatteren av en tråd den kan lese', person: 'vanligB', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from storage.objects where id = $1', [k.d.profilbilde]) },
  { navn: 'leser profilkortet til alle', person: 'systemarkitekt', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.vanligB]) },
  { navn: 'leser sin egen hele profil med rollen', person: 'vanligA', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select role is not null from public.min_profil()') },
  { navn: 'ser kontoene i brukerlista uten å administrere noen', person: 'vanligA', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.brukeroversikt()') },
  { navn: 'ser en konto i et annet fagmiljø i brukerlista', person: 'adminB', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.brukeroversikt() where id = $1', [k.g.id.vanligA]) },
  { navn: 'ser rollen til et medlem i eget fagmiljø i brukerlista', person: 'adminA', etappe: 'P2c', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select role is not null from public.brukeroversikt() where id = $1', [k.g.id.vanligA]) },
  // Den som står bak et varsel, er synlig bare så lenge varselet kan leses:
  // varselet om A sin lokale publisering når ikke B (P2b).
  { navn: 'leser profilkortet til en i et annet fagmiljø gjennom et varsel om lokalt innhold', person: 'vanligB', etappe: 'P2c', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select id from public.profiles where id = $1', [k.g.id.adminA]) },

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

  // --- P5: redaktøransvaret (docs/redaktorer-og-forslag.md) ----------------
  // Redaktøren for fortolkningen i A leser og endrer utkastene der, men publiserer ikke og gir ikke ansvar.
  { navn: 'leser A sitt utkast som redaktør for fortolkningen i A', person: 'redaktorFortolkningA', etappe: 'P5', idag: 'tilgang', mal: 'tilgang', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'lagrer A sitt utkast som redaktør for fortolkningen i A', person: 'redaktorFortolkningA', etappe: 'P5', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, 'select public.lagre_utkast($1, 1, $2)', [k.d.kommentarutkast, JSON.stringify(KOMMENTAR)]) },
  { navn: 'publiserer A sitt utkast som redaktør for fortolkningen i A', person: 'redaktorFortolkningA', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, 'select public.publiser_utkast($1, 1)', [k.d.kommentarutkast]) },
  { navn: 'gir redaktøransvar som redaktør', person: 'redaktorFortolkningA', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.tildel_redaktoransvar($1, 'fortolkning', null, $2)`, [k.g.id.vanligA, k.g.fagmiljo.A]) },
  // Uten ansvar gir galleriets andre redaktører ingenting.
  { navn: 'leser A sitt utkast uten redaktøransvar', person: 'redaktorNasjonal', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: lesKommentar('utkast', 'kommentarutkast') },
  { navn: 'gir seg selv redaktøransvar', person: 'vanligA', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.tildel_redaktoransvar($1, 'fortolkning', null, $2)`, [k.g.id.vanligA, k.g.fagmiljo.A]) },
  { navn: 'gir redaktøransvar i A som lokal admin i B', person: 'adminB', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.tildel_redaktoransvar($1, 'fortolkning', null, $2)`, [k.g.id.dobbeltAB, k.g.fagmiljo.A]) },
  { navn: 'gir redaktøransvar i eget fagmiljø som lokal admin', person: 'adminA', etappe: 'P5', idag: 'tilgang', mal: 'tilgang', prov: (k) => lykkes(k, `select public.tildel_redaktoransvar($1, 'fortolkning', null, $2)`, [k.g.id.vanligA, k.g.fagmiljo.A]) },
  { navn: 'gir nasjonalt redaktøransvar før B2 er slått på', person: 'systemarkitekt', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.tildel_redaktoransvar($1, 'fagsider')`, [k.g.id.redaktorNasjonal]) },
  { navn: 'leser redaktøroversikten for A som lokal admin i B', person: 'adminB', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select public.les_redaktoransvar($1)', [k.g.fagmiljo.A]) },
  { navn: 'leser redaktøransvarene direkte i tabellen', person: 'adminA', etappe: 'P5', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.redaktoransvar') },

  // --- #572: eget medlemskap, uten systemarkitektunntak (docs/fagmiljoer.md) ---
  { navn: 'har A blant egne fagmiljøer som medlem', person: 'systemarkitekt', etappe: '#572', idag: 'tilgang', mal: 'tilgang', prov: egetFagmiljo('A') },
  { navn: 'har B blant egne fagmiljøer uten medlemskap', person: 'systemarkitekt', etappe: '#572', idag: 'avvist', mal: 'avvist', prov: egetFagmiljo('B') },
  { navn: 'har A blant egne fagmiljøer som lokal admin bare i B', person: 'arkitektB', etappe: '#572', idag: 'avvist', mal: 'avvist', prov: egetFagmiljo('A') },
  { navn: 'har B blant egne fagmiljøer', person: 'vanligA', etappe: '#572', idag: 'avvist', mal: 'avvist', prov: egetFagmiljo('B') },
  { navn: 'har A blant egne fagmiljøer etter avsluttet medlemskap', person: 'avsluttetA', etappe: '#572', idag: 'avvist', mal: 'avvist', prov: egetFagmiljo('A') },
  { navn: 'har B blant egne fagmiljøer som medlem', person: 'avsluttetA', etappe: '#572', idag: 'tilgang', mal: 'tilgang', prov: egetFagmiljo('B') },
  ...(['utenMedlemskap', 'tidligereAdmin'] as const).map((person): Scenario => (
    { navn: 'har noe blant egne fagmiljøer', person, etappe: '#572', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select cardinality(public.mine_egne_fagmiljoer()) > 0') }
  )),

  // --- #598: funksjonsbryterne per fagmiljø (docs/fagmiljoer.md); resten i funksjonsbrytere.test.ts ---
  ...(['vanligA', 'adminA', 'adminB', 'utenMedlemskap'] as const).flatMap((person): Scenario[] => [
    { navn: 'leser funksjonsoversikten', person, etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, 'select public.funksjonsoversikt()') },
    { navn: 'slår av en funksjon i eget fagmiljø', person, etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.sett_funksjonsbryter('personal', $1, 'av', 'Prøver uten myndighet')`, [k.g.fagmiljo.A]) },
    { navn: 'merker eget fagmiljø som testmiljø', person, etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => lykkes(k, `select public.sett_testmiljo($1, true, 'Prøver uten myndighet')`, [k.g.fagmiljo.B]) },
    { navn: 'leser funksjonsbryterne i tabellen', person, etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.funksjonsbrytere') },
  ]),
  { navn: 'leser funksjonsoversikten', person: 'arkitektB', etappe: '#598', idag: 'tilgang', mal: 'tilgang', prov: (k) => verdi(k, 'select public.funksjonsoversikt()') },
  { navn: 'leser funksjonskatalogen i tabellen', person: 'systemarkitekt', etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => rader(k, 'select 1 from public.funksjoner') },
  { navn: 'har en funksjon uten at noen er slått på', person: 'systemarkitekt', etappe: '#598', idag: 'avvist', mal: 'avvist', prov: (k) => verdi(k, `select jsonb_array_length(public.mine_funksjoner()) > 0`) },
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
    // 42501 er nektet; PT404 er svaret P2a gir for et objekt personen ikke kan lese, likt som for et som ikke finnes.
    if (['42501', 'PT404'].includes((feil as { code?: string }).code ?? '')) return 'avvist'
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
    expect(Object.keys(hull).sort()).toEqual([])
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
