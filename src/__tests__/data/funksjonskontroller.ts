/**
 * Kontrollen hver funksjon i `public` som en innlogget kan kalle, har i dag:
 * katalogtest 2 i docs/ousfar-nasjonal-p0-kartlegging.md §6.4, innført i P1.1.
 *
 * `tilgangskatalog.test.ts` krever at lista og databasen stemmer nøyaktig.
 * En ny funksjon som nettleseren kan kalle, stopper testen til den står her
 * med kontrollen den faktisk har, og en funksjon som er borte, må tas ut.
 * Kategoriene er forklart i docs/fagmiljoer.md, «Katalogvaktene». Lista
 * beskriver tilstanden slik den er, ikke slik den skal bli: P2 bytter
 * `admin`, `innlogget` og `felles-lesing` ut med rettigheter per fagmiljø.
 *
 * Siden P2.0 krever alle utenom `offentlig` og `utloser` i tillegg et aktivt
 * medlemskap; det prøves for hver funksjon i `aktivtmedlemskap.test.ts`.
 */

export const KONTROLLER = [
  /** Ren hjelper uten data; kan kalles også uten innlogging. */
  'offentlig',
  /** Utløserfunksjon; kan ikke kalles direkte gjennom API-et. */
  'utloser',
  /** Kjøres som den innloggede (ikke `security definer`): radsikkerheten avgjør. */
  'radsikkerhet',
  /** `security definer` som leser felles data uten egen kontroll ut over innlogging. */
  'felles-lesing',
  /** `security definer` som bare krever innlogging, også for skriving i felles data. */
  'innlogget',
  /** `security definer` som bare rører den innloggedes egne rader. */
  'eier',
  /** Innlogget, men en administrator får gjøre eller se mer (`er_admin()`). */
  'admin-utvidet',
  /** `security definer` som viser den innloggedes egen myndighet over kontoer (`intern.kontoavslag`). */
  'kontomyndighet',
  /** Krever administrator (`er_admin()`, `krev_admin()` e.l.) for alt. */
  'admin',
  /**
   * `security definer` som kontrollerer rekkevidden per fagmiljø og rettigheten
   * per objekt, gjennom de felles hjelperne (P2a–d, docs/fagmiljoer.md).
   */
  'rekkevidde',
  /**
   * `security definer` som krever en systemarkitekt med aktivt medlemskap
   * (`public.er_systemarkitekt()`, eller porten `intern.krev_idevalg_admin()`
   * for idéene og oppgavene etter D8).
   */
  'systemarkitekt',
] as const

export type Kontroll = (typeof KONTROLLER)[number]

/** Signaturen (`navn(argumenter)`, som `pg_get_function_identity_arguments`) og kontrollen. */
export const FUNKSJONSKONTROLLER: Readonly<Record<string, Kontroll>> = {
  'angre_oppgave_utfort(oppgave uuid)': 'systemarkitekt',
  'arkiver_diskusjon(diskusjon uuid, arkivert boolean)': 'rekkevidde',
  'arkiver_ide(ide uuid)': 'systemarkitekt',
  'arkiver_stoff(stoff text, arkivert boolean)': 'innlogget',
  'arkiver_stoffkategori(kategori uuid, arkivert boolean)': 'innlogget',
  'arkiver_varsler(varsler uuid[], til timestamp with time zone)': 'eier',
  'beslutt_fagsak(sak bigint, versjon integer, valg text, merknad text)': 'admin',
  'brukernavn_er_gyldig(brukernavn text)': 'offentlig',
  'brukernavn_normalisert(raatekst text)': 'offentlig',
  'clinpgx_status()': 'felles-lesing',
  'cpic_status()': 'felles-lesing',
  'datakilder_status(antall integer)': 'admin',
  'direktelenke(slag text, id uuid, kommentar uuid)': 'rekkevidde',
  'diskusjon_er_apen(diskusjon uuid)': 'rekkevidde',
  'diskusjonsoversikt(side text)': 'radsikkerhet',
  'diskusjonstekster(side text)': 'radsikkerhet',
  'diskusjonstraad(diskusjon uuid)': 'radsikkerhet',
  'endre_diskusjonskategori(kategori uuid, navn text, emoji text)': 'rekkevidde',
  'endre_stoffkategori(kategori uuid, navn text)': 'innlogget',
  'er_admin()': 'felles-lesing',
  'er_systemarkitekt()': 'eier',
  'finn_infosider(navn text[], sidetilstand objekttilstand)': 'radsikkerhet',
  'finn_intervallregelsett(analyttkode text, sidetilstand objekttilstand)': 'radsikkerhet',
  'fjern_skjult_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
  'flytt_diskusjon(diskusjon uuid, kategori uuid, indeks integer)': 'rekkevidde',
  'flytt_diskusjon_til_side(diskusjon uuid, side text, kategori uuid, ny_kategori text, ny_emoji text)': 'rekkevidde',
  'flytt_diskusjonskategori(kategori uuid, indeks integer)': 'rekkevidde',
  'flytt_oppgave_tilbake(oppgave uuid)': 'systemarkitekt',
  'flytt_stoffkategori(kategori uuid, forelder uuid, indeks integer)': 'innlogget',
  'frigi_oppgave(oppgave uuid)': 'systemarkitekt',
  'gjenopprett_ide(ide uuid)': 'systemarkitekt',
  'gjenopprett_revisjon(objekt uuid, forventet_revisjon integer, fra_revisjon integer)': 'admin',
  'gjenopprett_stoff(stoff text)': 'admin-utvidet',
  'gjenopprett_varsler(varsler uuid[])': 'eier',
  // P2.0: den innloggedes eget svar om aktivt medlemskap, og det eneste en
  // bruker uten aktivt medlemskap får (docs/fagmiljoer.md, «Aktivt medlemskap»).
  'har_aktivt_medlemskap()': 'eier',
  // P2b: om den innloggede kan moderere diskusjonene på en side, til knappene i appen.
  'kan_moderere_diskusjoner(side text)': 'eier',
  'ide_er_apen(ide uuid)': 'felles-lesing',
  'ideer_med_nytt()': 'radsikkerhet',
  'ideoversikt()': 'innlogget',
  'idetraad(ide uuid)': 'innlogget',
  'intern_auth_domene()': 'offentlig',
  'kuratering_admin(handling text, data jsonb)': 'admin',
  'lagre_intervallregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'admin',
  'lagre_oppgave(oppgave uuid, tittel text, prompt text)': 'systemarkitekt',
  'lagre_scenarioregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'admin',
  'lagre_thc_regelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'admin',
  'lagre_utkast(objekt uuid, forventet_revisjon integer, innhold jsonb)': 'admin',
  'legemiddeldata_status()': 'felles-lesing',
  'les_analyttside(analyttkode text, sidetilstand objekttilstand)': 'radsikkerhet',
  'les_analyttsider(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_bivirkninger(stoff text)': 'felles-lesing',
  'les_cpic(clinpgx_ider text[])': 'felles-lesing',
  'les_cpic_diplotyper(gensymbol text)': 'felles-lesing',
  'les_endringslogg(side jsonb, med_utkast boolean, med_rutiner boolean, etter jsonb, antall integer)': 'admin-utvidet',
  'les_fagsaker()': 'admin',
  'les_farmakogenetikk(kjemikalie_ider text[])': 'felles-lesing',
  'les_farmakogenetikk_sok(kjemikalie_ider text[])': 'felles-lesing',
  'les_historikk(objekt uuid)': 'radsikkerhet',
  'les_interaksjoner(atc_koder text[], virkestoff_ider text[])': 'felles-lesing',
  'les_interaksjonssok(sider jsonb)': 'felles-lesing',
  'les_intervallregelsett(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_kildeovervaking(historikk integer)': 'admin',
  'les_kjemi(cider integer[])': 'felles-lesing',
  'les_kommentarer(kommentartilstand objekttilstand, ider uuid[])': 'radsikkerhet',
  'les_kurateringer()': 'felles-lesing',
  'les_laboratorieanalyser(komponenter text[])': 'felles-lesing',
  'les_laboratoriesok(komponenter text[])': 'felles-lesing',
  'les_legemidler(virkestoff_ider text[])': 'felles-lesing',
  'les_preparatsok(sider jsonb)': 'felles-lesing',
  'les_referanseomrader(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_referanser(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_regelvarsler()': 'innlogget',
  'les_scenarioregler(regeltilstand objekttilstand)': 'radsikkerhet',
  'les_sideversjon(stoff text, nr integer)': 'felles-lesing',
  'les_sideversjon_bivirkninger(stoff text, nr integer)': 'felles-lesing',
  'les_sideversjoner(stoff text)': 'felles-lesing',
  'les_stoff(stoff text, sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffavoritter()': 'radsikkerhet',
  'les_stoffer(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffliste(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffreferanseomrader(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffregister(sidetilstand objekttilstand)': 'admin-utvidet',
  'les_stoffside(sidenavn text, sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffsidenavn(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffsider(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_thc_regelsett(regelsettilstand objekttilstand)': 'radsikkerhet',
  'les_verktoysperrer()': 'innlogget',
  'los_opp_diskusjonskategori(kategori uuid)': 'rekkevidde',
  'merk_diskusjon_sett(diskusjon uuid, lest_kl timestamp with time zone)': 'eier',
  'merk_ide_sett(ide uuid, lest_kl timestamp with time zone)': 'eier',
  'merk_oppgave_utfort(oppgave uuid, endringslogg text)': 'systemarkitekt',
  'merk_varsler_lest(varsler uuid[], til timestamp with time zone)': 'eier',
  // P2.0: den innloggedes egen status for beskjeden i appen (docs/fagmiljoer.md).
  'min_medlemskapsstatus()': 'eier',
  'mine_administrerte_fagmiljoer()': 'eier',
  'mine_lesbare_fagmiljoer()': 'eier',
  'mine_kontohandlinger()': 'kontomyndighet',
  'mine_varsler()': 'eier',
  'oppgave(oppgave uuid)': 'systemarkitekt',
  'oppgaveoversikt()': 'systemarkitekt',
  'opphev_verktoysperre(sperre uuid, grunn text)': 'admin',
  'opprett_diskusjon(side text, kategori uuid, tittel text, tekst jsonb, ny_kategori text, ny_emoji text)': 'rekkevidde',
  'opprett_diskusjonskategori(side text, navn text, emoji text)': 'rekkevidde',
  'opprett_stoffkategori(navn text, forelder uuid)': 'innlogget',
  'opprett_utkast(objekttype objekttype, innhold jsonb)': 'admin',
  'overfor_ide(ide uuid)': 'systemarkitekt',
  'plasser_stoff(stoff text, fra uuid, til uuid)': 'innlogget',
  'profiles_beskytt_felter()': 'utloser',
  'publiser_utkast(objekt uuid, forventet_revisjon integer)': 'admin',
  'rydd_idearkiv()': 'systemarkitekt',
  'rydd_stoffpapirkurven()': 'innlogget',
  'sett_diskusjonstekst(diskusjon uuid, tekst jsonb)': 'rekkevidde',
  'sett_diskusjonstittel(diskusjon uuid, tittel text)': 'rekkevidde',
  'sett_oppgave_klar(oppgave uuid, klar boolean)': 'systemarkitekt',
  'sett_stoffavoritt(stoff text, favoritt boolean)': 'radsikkerhet',
  'sett_verktoysperre(omfang text, mal text, grunn text)': 'admin',
  'skjul_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
  'slett_diskusjon(diskusjon uuid)': 'rekkevidde',
  'slett_referanse(objekt uuid, forventet_revisjon integer)': 'admin',
  'slett_stoff(stoff text)': 'admin-utvidet',
  'slett_stoff_for_godt(stoff text)': 'admin',
  'slett_stoffkategori(kategori uuid)': 'admin-utvidet',
  'sok_virkestoff(sok text, antall integer)': 'felles-lesing',
  'sokedata_versjoner()': 'felles-lesing',
  'stoffsider_som_json(sider uuid[], sidetilstand objekttilstand)': 'radsikkerhet',
  'tom_stoffpapirkurven()': 'admin',
  'uleste_varsler()': 'radsikkerhet',
  'utgave_som_json(u objektutgaver)': 'radsikkerhet',
  'valider_scenarioregelsett(innhold jsonb)': 'admin',
  'verktoysperrehistorikk()': 'admin',
  'vis_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
}
