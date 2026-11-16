/**
 * Rekkevidden til hver ressurs i OUSFAR: P4a, klassifiseringen i
 * docs/ousfar-nasjonal-p0-kartlegging.md §3.
 *
 * Objektene (fagsider, kort, referanser, regelsett, kommentarer) har
 * rekkevidden sin per rad i `ressursomfang`, satt av regelen
 * `intern.ressursomfang_for`. Her står resten: hver tabell og visning i
 * databasen, og de statiske datafilene i klientpakken og repoet.
 * `ressursomfang.test.ts` krever at lista og databasen (og filene) stemmer
 * nøyaktig, slik at ingen ressurs står uten rekkevidde. En ny tabell stopper
 * testen til den står her.
 *
 * Lista beskriver hva ressursen er, ikke hvem som får lese den i dag: det
 * endres først i P2.
 */

export const REKKEVIDDER = {
  /** Rekkevidden står per objekt i `ressursomfang`; tabellen er objektet eller en del av det. */
  objekt: 'per objekt',
  /** Følger rekkevidden til objektet, fagsiden eller siden radene hører til. */
  avledet: 'avledet',
  /** Felles for alle fagmiljøer. */
  felles: 'felles',
  /** Hører til det opprinnelige fagmiljøet, OUS Klinisk farmakologi (D1). */
  lokal: 'lokal',
  /** Den enkelte brukerens egne rader. */
  personlig: 'personlig',
  /** Felles forvaltning: systemarkitektene, OUSFAR Fag eller OUSFAR Verktøy. */
  forvaltning: 'felles forvaltning',
  /** Tilgangsmodellen selv: kontoer, fagmiljøer, roller, rekkevidder og loggen. */
  tilgang: 'tilgang',
} as const

export type Rekkevidde = keyof typeof REKKEVIDDER

export interface Klassifisering {
  rekkevidde: Rekkevidde
  /** Hvorfor, med raden i P0 §3 eller det rekkevidden avledes av. */
  grunnlag: string
}

const k = (rekkevidde: Rekkevidde, grunnlag: string): Klassifisering => ({ rekkevidde, grunnlag })

const OBJEKT = (hva: string) => k('objekt', `Del av objektet ${hva}`)
const FAGSIDE = k('avledet', 'Fagsidene er felles (§3)')
const SIDENOKKEL = k(
  'avledet',
  'Fra sidenøkkelen: stoff:/register: felles, fortolkning: lokal (§3), gruppe: gruppen (P6); per rad siden P2b (omfang, fagmiljo_id, gruppe_id)',
)
const IDE = k('felles', 'Idéer og planlagte oppgaver er felles (§3)')
const OFFENTLIG_KILDE = k('felles', 'Offentlig kilde (§3)')

/**
 * Tabellene og visningene, som `skjema.tabell`. `skjema.*` gjelder alle i
 * skjemaet som ikke står for seg.
 */
export const TABELLER: Readonly<Record<string, Klassifisering>> = {
  // Objektene og historikken deres.
  'public.redigerbare_objekter': k('objekt', 'Registeret over objektene'),
  'public.objekttilstander': k('objekt', 'Utkast og publisert per objekt'),
  'public.objektrevisjoner': k('objekt', 'Revisjonene per objekt'),
  'public.objektpubliseringer': k('objekt', 'Publiseringene per objekt'),
  'public.objektstatus': k('objekt', 'Visning per objekt'),
  'public.objekthistorikk': k('objekt', 'Visning per objekt'),
  'public.objektutgaver': k('objekt', 'Visning per objekt'),
  'public.infosider': OBJEKT('infoside'),
  'public.innholdselementer': OBJEKT('innholdselement'),
  'public.referanser': OBJEKT('referanse'),
  'public.laboratorieanalytter': OBJEKT('laboratorieanalytt'),
  'public.analyttkomponenter': OBJEKT('laboratorieanalytt'),
  'public.intervallregelsett': OBJEKT('intervallregelsett'),
  'public.intervallregler': OBJEKT('intervallregelsett'),
  'public.kommentarer': OBJEKT('kommentar'),
  'public.scenarioregelsett': OBJEKT('scenarioregelsett'),
  'public.scenarier': OBJEKT('scenarioregelsett'),
  'public.scenarioanalytter': OBJEKT('scenarioregelsett'),
  'public.scenarioforhold': OBJEKT('scenarioregelsett'),
  'public.scenarioforholdsledd': OBJEKT('scenarioregelsett'),
  'public.scenarioparametere': OBJEKT('scenarioregelsett'),
  'public.scenariopavist': OBJEKT('scenarioregelsett'),
  'public.scenarioplasseringer': OBJEKT('scenarioregelsett'),
  'public.scenarioplasseringskoder': OBJEKT('scenarioregelsett'),
  'public.scenariotekster': OBJEKT('scenarioregelsett'),
  'public.scenariovilkar': OBJEKT('scenarioregelsett'),
  'public.thc_regelsett': OBJEKT('thc_regelsett'),
  'public.thc_bruksmonstre': OBJEKT('thc_regelsett'),
  'public.thc_konsentrasjonsnivaer': OBJEKT('thc_regelsett'),
  'public.thc_kurver': OBJEKT('thc_regelsett'),
  'public.thc_sikkerhetsmarginer': OBJEKT('thc_regelsett'),
  'public.thc_tekstbolker': OBJEKT('thc_regelsett'),

  // Det som hører til objektene eller fagsidene.
  'public.referansekoblinger': k('avledet', 'Objektet som siterer referansen'),
  'public.referansebruk': k('avledet', 'Objektet som siterer referansen'),
  'public.innholdsendringer': k('avledet', 'Objektene endringen gjelder'),
  'public.innholdshendelser': k('avledet', 'Objektene hendelsen gjelder'),
  'public.sideversjoner': FAGSIDE,
  'public.slettede_stoffsider': FAGSIDE,
  'public.slettede_referanser': k('felles', 'Referansebasen er felles (§3)'),
  'public.stoffsider_uten_kode': FAGSIDE,
  'bivirkninger.*': FAGSIDE,

  // Stoffregisteret og felles oppslag.
  'public.stoffkategorier': k('felles', 'Stoffregisteret er felles (§3)'),
  'public.stoffplasseringer': k('felles', 'Stoffregisteret er felles (§3)'),
  'public.stoffstatus': k('felles', 'Stoffregisteret er felles (§3)'),
  // P4c: analyttkatalogen per fagmiljø, med fagmiljøet per rad (fagmiljo_id). Bare
  // gjennom `les_analyttkatalog()`, for arbeidskonteksten (docs/fagmiljoer.md).
  'public.analyttkatalog_metoder': k('lokal', 'P4c: fagmiljøets analysemetoder, per rad'),
  'public.analyttkatalog_oppforinger': k('lokal', 'P4c: fagmiljøets analyttkatalog, per rad'),
  'public.analyttkatalog_koder': k('lokal', 'P4c: fagmiljøets analyttkoder, per rad'),
  'public.analyttkatalog_koblinger': k('lokal', 'P4c: fagmiljøets koblinger fra kodene til stoffene, per rad'),
  'public.analyttkoblede_stoffer': k('lokal', 'Speiler stoff–analytt-koblingene, som er lokale (§3)'),
  'public.maleenheter': k('felles', 'Felles oppslag (§2.7)'),
  'public.endringsagenter': k('felles', 'Felles oppslag (§2.7)'),
  'public.autoerstatt_regler': k('felles', 'Felles oppslag (§2.7)'),

  // Samhandling.
  'public.diskusjoner': SIDENOKKEL,
  'public.diskusjonskategorier': SIDENOKKEL,
  'public.diskusjonskommentarer': SIDENOKKEL,
  'public.diskusjonshjerter': SIDENOKKEL,
  'public.diskusjon_skjulte_tekster': SIDENOKKEL,
  'public.ideer': IDE,
  'public.idekommentarer': IDE,
  'public.idehjerter': IDE,
  'public.oppgaver': k('forvaltning', 'Planlagte oppgaver styres av systemarkitektene (§2.8, D8)'),

  // Personlig.
  'public.brukerinnstillinger': k('personlig', 'Innstillinger (§3)'),
  'public.stoffavoritter': k('personlig', 'Favoritter (§3)'),
  'public.varsler': k('personlig', 'Varsler (§3); avgrenset også til fagmiljøet (fagmiljo_id, P2b) eller gruppen (gruppe_id, P6) det gjelder'),
  'public.diskusjonsbesok': k('personlig', 'Hva brukeren har lest'),
  'public.idebesok': k('personlig', 'Hva brukeren har lest'),

  // Forvaltning.
  'public.agentprofiler': k('forvaltning', 'KI-agentene'),
  'public.kildefunn': k('forvaltning', 'Kildesaker (§3), OUSFAR Verktøy'),
  'public.kildefunn_hendelser': k('forvaltning', 'Kildesaker (§3), OUSFAR Verktøy'),
  'public.kildefunn_tiltak': k('forvaltning', 'Kildesaker (§3), OUSFAR Verktøy'),
  'public.kildeovervaking_kjoringer': k('forvaltning', 'Kildeovervåkingen, OUSFAR Verktøy'),
  'public.verktoysperrer': k('forvaltning', 'Verktøysperrer (§3), OUSFAR Verktøy'),
  'kuratering.*': k('forvaltning', 'Kurateringsgrenene (§3), OUSFAR Fag'),
  'datakilder.*': k('forvaltning', 'Styringen av datasynkene'),

  // Tilgangsmodellen.
  'public.profiles': k('tilgang', 'Kontoene'),
  'public.kontoreservasjoner': k('tilgang', 'Kontoene'),
  'public.fagmiljoer': k('tilgang', 'P1.1'),
  'public.medlemskap': k('tilgang', 'P1.1'),
  'public.systemroller': k('tilgang', 'P1.1'),
  'public.fagmiljoadministratorer': k('tilgang', 'P1.1'),
  'public.tilgangslogg': k('tilgang', 'P1.1'),
  'public.ressursomfang': k('tilgang', 'P4a: rekkevidden selv'),
  'intern.passordreservasjoner': k('tilgang', 'P1.2a: tilbakestillinger av passord som er i gang'),
  'public.grupper': k('tilgang', 'P6: gruppene, i ett fagmiljø eller på tvers; leses bare gjennom funksjonene'),
  'public.gruppemedlemskap': k('tilgang', 'P6: medlemmene og invitasjonene i gruppene; leses bare gjennom funksjonene'),
  'intern.kontosperrer': k('tilgang', 'P3: kontoene som er sperret i Auth fordi de står uten aktivt medlemskap'),

  // Offentlige kilder.
  'legemiddeldata.*': OFFENTLIG_KILDE,
  'farmakologiportalen.*': OFFENTLIG_KILDE,
  'clinpgx.*': OFFENTLIG_KILDE,
  'pubchem.*': OFFENTLIG_KILDE,
  'cpic.*': k('felles', 'Offentlig kilde (§3); stanset 06.11.2026'),
}

export interface StatiskKlassifisering extends Klassifisering {
  /** Nøklene på toppnivå i en JSON-fil som er lokale når resten er felles. */
  lokaleDeler?: readonly string[]
  /** Beslutningen klassifiseringen venter på; uavklart behandles som lokalt. */
  uavklart?: string
}

const s = (rekkevidde: Rekkevidde, grunnlag: string, mer: Partial<StatiskKlassifisering> = {}): StatiskKlassifisering => ({
  rekkevidde,
  grunnlag,
  ...mer,
})

const OUS_KILDE = s('lokal', 'OUS sitt kildedokument for fortolkningen (§2.5)')
const VERKTOY = s('lokal', 'Verktøyene i verktøymenyen (§3)', { uavklart: 'OUSFAR Verktøy (P0 §9)' })

/**
 * De statiske ressursene, som stier i repoet. Alle filer rett under
 * `src/data/` og `originaldata/` skal stå her; modulene under `src/domain/`
 * med klinisk innhold står i tillegg (P0 §2.5). Lokale filer flyttes til
 * databasen i P4c; et nytt fagmiljøs innhold skal aldri inn her.
 */
export const STATISKE_RESSURSER: Readonly<Record<string, StatiskKlassifisering>> = {
  'src/data/analytter.json': s('lokal', 'OUS sine analyttkoder, metoder og måleområder (§3)'),
  'src/data/antihypertensiver.json': s('lokal', 'OUS sine analyttkoder, metoder og måleområder (§3)'),
  'src/data/aliaser.json': s('lokal', 'Søkeord per analyttkode (§3)'),
  'src/data/analyttkoblinger.json': s('lokal', 'Koblingene fra OUS sine analyttkoder til stoffene (§3); importgrunnlag (P4c)'),
  'src/data/analyttforbindelser.json': s('lokal', 'Forbindelsen hver av OUS sine analyttkoder måler, og datakortene den bruker (#395); importgrunnlag'),
  'src/data/stoffregister.json': s('felles', 'Stoffene er felles (§3); koblingene står i analyttkatalogen (P4c)'),
  'src/data/forbindelser.ts': s('felles', 'Forbindelsesregisteret (§3)'),
  'src/data/endringslogg.ts': s('felles', 'Appens endringslogg (§3)'),
  'src/data/endringshistorikk.ts': s('felles', 'Appens endringslogg: det frosne arkivet med de eldre føringene (§3)'),
  'src/data/endringer': s('felles', 'Appens endringslogg: én fil per endring etter arkivet (§3)'),
  'src/data/verktoy': VERKTOY,
  'src/verktoy/regler': VERKTOY,
  'src/domain/analyttkatalog.ts': s('felles', 'Formen katalogen har; innholdet står per fagmiljø i databasen (P4c)'),
  'src/domain/ouskatalog.ts': s('lokal', 'Importgrunnlaget for OUS-katalogen (P4c); bare skript og tester, aldri i klientpakken'),
  'src/domain/analytes.ts': s('lokal', 'Leser OUS-filene til importgrunnlaget (P4c); aldri i klientpakken'),
  'src/domain/analysemetoder.ts': s('felles', 'Fargene og filteret; metodene står i katalogen (P4c)'),
  'src/domain/rus.ts': s('felles', 'Rusmodulene slik fortolkningen bruker dem; modulene står i katalogen (P4c)'),
  'src/domain/etg.ts': s('felles', 'Tilfellene av scenarioregelsettet; tekstene står i databasen (P4c)'),
  'src/domain/thc.ts': s('felles', 'Gjenkjenner THC-syremodulen; koden og metoden står i katalogen (P4c)'),
  'src/domain/thcMotor.ts': s('felles', 'Motoren er felles (§3)'),
  'src/domain/thcKurver.ts': s('lokal', 'THC-kurvene er lokale til deling er særskilt godkjent (D4, #374)'),
  'originaldata/kommentarer.pdf': OUS_KILDE,
  'originaldata/Psykofarmaka.pdf': OUS_KILDE,
  'originaldata/THC-COOH.xlsm': s('lokal', 'OUS sitt THC-regneark; lokalt etter D4 (#374)'),
  'originaldata/AHT.docx': OUS_KILDE,
  'originaldata/antihypertensiver.docx': OUS_KILDE,
  'originaldata/rusmidler.md': OUS_KILDE,
}
