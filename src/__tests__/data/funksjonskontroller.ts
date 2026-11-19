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
  /** Innlogget, men en administrator eller systemarkitekt får gjøre eller se mer (`er_admin()`, `er_systemarkitekt()`). */
  'admin-utvidet',
  /**
   * Krever rett til å endre stoffregisteret (`intern.krev_registerbruker`,
   * `intern.har_registerrett`): i dag systemarkitektene (P2d).
   */
  'stoffregister',
  /** `security definer` som viser den innloggedes egen myndighet over kontoer (`intern.kontoavslag`). */
  'kontomyndighet',
  /**
   * `security definer` som gir, avslutter eller viser medlemskap og lokale
   * administratorer etter den innloggedes myndighet i fagmiljøet
   * (`intern.medlemskapsavslag`, P3).
   */
  'medlemskapsmyndighet',
  /**
   * `security definer` som gir, tilbakekaller eller viser redaktøransvar
   * etter den innloggedes myndighet (`intern.kan_administrere_redaktoransvar`,
   * P5): lokal administrator i fagmiljøet eller systemarkitekt.
   */
  'redaktormyndighet',
  /** Krever administrator (`er_admin()`, `krev_admin()` e.l.) for alt. */
  'admin',
  /**
   * `security definer` som kontrollerer rekkevidden per fagmiljø og rettigheten
   * per objekt, gjennom de felles hjelperne (P2a–d, docs/fagmiljoer.md).
   */
  'rekkevidde',
  /**
   * `security definer` som oppretter, styrer eller viser grupper og
   * gruppemedlemskap etter den innloggedes myndighet i gruppen
   * (`intern.gruppeavslag`, `intern.gruppeopprettelsesavslag`, P6).
   */
  'gruppemyndighet',
  /**
   * `security definer` som krever en systemarkitekt med aktivt medlemskap
   * (`public.er_systemarkitekt()`, `intern.krev_systemarkitekt()`, eller porten
   * `intern.krev_idevalg_admin()` for idéene og oppgavene etter D8); den gamle
   * adminrollen gir ingenting (P2b, P2d).
   */
  'systemarkitekt',
  /**
   * `security definer` for direktemeldingene (D5): krever en innlogget med
   * aktivt medlemskap og bryteren på (`intern.krev_direktemeldinger`), og gir
   * bare det den innloggede selv eier eller er en av de to deltakerne i
   * (`intern.krev_direktesamtale`, `intern.krev_direktemelding`). Ingen gir
   * systemarkitektene eller administratorene noe ekstra.
   */
  'direktemelding',
  /**
   * `security definer` som setter eller viser stillingen til en bruker etter
   * den innloggedes myndighet (`intern.stillingsavslag`): egen, eller andres
   * for systemarkitekter og lokale administratorer (docs/stillinger.md).
   */
  'stillingsmyndighet',
] as const

export type Kontroll = (typeof KONTROLLER)[number]

/** Signaturen (`navn(argumenter)`, som `pg_get_function_identity_arguments`) og kontrollen. */
export const FUNKSJONSKONTROLLER: Readonly<Record<string, Kontroll>> = {
  'angre_oppgave_utfort(oppgave uuid)': 'systemarkitekt',
  'arkiver_diskusjon(diskusjon uuid, arkivert boolean)': 'rekkevidde',
  'arkiver_gruppe(gruppe uuid, arkivert boolean)': 'gruppemyndighet',
  'arkiver_ide(ide uuid)': 'rekkevidde',
  'arkiver_stoff(stoff text, arkivert boolean)': 'stoffregister',
  'arkiver_stoffkategori(kategori uuid, arkivert boolean)': 'stoffregister',
  'arkiver_varsler(varsler uuid[], til timestamp with time zone)': 'eier',
  'avslutt_gruppemedlemskap(gruppe uuid, bruker uuid)': 'gruppemyndighet',
  // P3: medlemskapene og de lokale administratorene, etter myndigheten i fagmiljøet.
  'avslutt_medlemskap(bruker uuid, fagmiljo uuid)': 'medlemskapsmyndighet',
  'avvis_forslag(forslag uuid, begrunnelse text)': 'rekkevidde',
  'be_om_presisering(forslag uuid, tekst text)': 'rekkevidde',
  'beslutt_fagsak(sak bigint, versjon integer, valg text, merknad text)': 'systemarkitekt',
  'brukernavn_er_gyldig(brukernavn text)': 'offentlig',
  'brukernavn_normalisert(raatekst text)': 'offentlig',
  'er_gruppesymbolsti(gruppe text, sti text)': 'offentlig',
  'clinpgx_status()': 'felles-lesing',
  'cpic_status()': 'felles-lesing',
  'datakilder_status(antall integer)': 'systemarkitekt',
  'direktelenke(slag text, id uuid, kommentar uuid)': 'rekkevidde',
  'diskusjon_er_apen(diskusjon uuid)': 'rekkevidde',
  'diskusjonsoversikt(side text)': 'radsikkerhet',
  // #395: den innloggedes rom på en diskusjonsside (arbeidskonteksten på fortolkningen).
  'diskusjonsrom(side text)': 'eier',
  'diskusjonstekster(side text)': 'radsikkerhet',
  'diskusjonstraad(diskusjon uuid)': 'radsikkerhet',
  'endre_diskusjonskategori(kategori uuid, navn text, emoji text)': 'rekkevidde',
  'endre_gruppe(gruppe uuid, navn text, beskrivelse text)': 'gruppemyndighet',
  'endre_gruppeoppgave(oppgave uuid, tittel text, beskrivelse jsonb, prioritet text)': 'rekkevidde',
  'endre_stoffkategori(kategori uuid, navn text)': 'stoffregister',
  // P2c: brukerlista i administrasjonen, bare kontoene den innloggede administrerer.
  'brukeroversikt()': 'rekkevidde',
  'er_admin()': 'felles-lesing',
  'er_systemarkitekt()': 'eier',
  'finn_infosider(navn text[], sidetilstand objekttilstand)': 'radsikkerhet',
  'finn_intervallregelsett(analyttkode text, sidetilstand objekttilstand)': 'radsikkerhet',
  'fjern_gruppeoppgave(oppgave uuid)': 'rekkevidde',
  'fjern_skjult_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
  'flytt_diskusjon(diskusjon uuid, kategori uuid, indeks integer)': 'rekkevidde',
  'flytt_diskusjon_til_side(diskusjon uuid, side text, kategori uuid, ny_kategori text, ny_emoji text)': 'rekkevidde',
  'flytt_diskusjonskategori(kategori uuid, indeks integer)': 'rekkevidde',
  'flytt_oppgave_tilbake(oppgave uuid)': 'systemarkitekt',
  'flytt_stoffkategori(kategori uuid, forelder uuid, indeks integer)': 'stoffregister',
  // P5 B: endringsforslagene (docs/redaktorer-og-forslag.md).
  'foresla_endring(ressurs uuid, element uuid, grunnrevisjon integer, sideversjon integer, sted text, utdrag text, forslag text, begrunnelse text, kilder jsonb)': 'rekkevidde',
  'frigi_oppgave(oppgave uuid)': 'systemarkitekt',
  'gi_medlemskap(bruker uuid, fagmiljo uuid)': 'medlemskapsmyndighet',
  'gjenopprett_ide(ide uuid)': 'rekkevidde',
  'gjenopprett_revisjon(objekt uuid, forventet_revisjon integer, fra_revisjon integer)': 'rekkevidde',
  'gjenopprett_stoff(stoff text)': 'stoffregister',
  'gjenopprett_varsler(varsler uuid[])': 'eier',
  'gjor_om_til_gruppeoppgave(ide uuid)': 'rekkevidde',
  'godkjenn_forslag(forslag uuid, begrunnelse text)': 'rekkevidde',
  // D3: «Siste aktivitet» på gruppesiden, lest som gruppen (samme avslag som gruppeoversikt).
  'gruppeaktivitet(gruppe uuid)': 'rekkevidde',
  'gruppeideer(gruppe uuid)': 'rekkevidde',
  'gruppeoppgave(oppgave uuid)': 'rekkevidde',
  'gruppeoppgaveoversikt(gruppe uuid)': 'rekkevidde',
  'gruppeoversikt(gruppe uuid)': 'gruppemyndighet',
  // P2.0: den innloggedes eget svar om aktivt medlemskap, og det eneste en
  // bruker uten aktivt medlemskap får (docs/fagmiljoer.md, «Aktivt medlemskap»).
  'har_aktivt_medlemskap()': 'eier',
  'inviter_til_gruppe(gruppe uuid, brukernavn text)': 'gruppemyndighet',
  'kan_behandle_ide(ide uuid)': 'rekkevidde',
  // #395: om den innloggede kan moderere tråden, i rommet den står i.
  'kan_moderere_diskusjon(diskusjon uuid)': 'eier',
  // P2b: om den innloggede kan moderere diskusjonene på en side, til knappene i appen.
  'kan_moderere_diskusjoner(side text)': 'eier',
  'ide_er_apen(ide uuid)': 'felles-lesing',
  'ideer_med_nytt()': 'radsikkerhet',
  'ideoversikt()': 'innlogget',
  'idetraad(ide uuid)': 'innlogget',
  'intern_auth_domene()': 'offentlig',
  // P2a: om appen skal vise redigeringen av fortolkningen; svarer bare om den innloggede.
  'kan_endre_lokalt_innhold()': 'rekkevidde',
  'kan_moderere_ide(ide uuid)': 'rekkevidde',
  // P2a: om de tillatende reglene skal slippe utkast gjennom; svarer bare om den innloggede.
  'kan_se_utkast()': 'rekkevidde',
  'kommenter_forslag(forslag uuid, tekst text)': 'rekkevidde',
  'kuratering_admin(handling text, data jsonb)': 'systemarkitekt',
  'lagre_intervallregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'rekkevidde',
  'lagre_oppgave(oppgave uuid, tittel text, prompt text)': 'systemarkitekt',
  'lagre_scenarioregelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'rekkevidde',
  'lagre_thc_regelsett(objekt uuid, forventet_revisjon integer, innhold jsonb, kommentarer jsonb)': 'rekkevidde',
  'lagre_utkast(objekt uuid, forventet_revisjon integer, innhold jsonb)': 'rekkevidde',
  'legemiddeldata_status()': 'felles-lesing',
  'legg_til_medlem(brukernavn text, fagmiljo uuid)': 'medlemskapsmyndighet',
  'les_analyttside(analyttkode text, sidetilstand objekttilstand)': 'radsikkerhet',
  'les_analyttsider(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_bivirkninger(stoff text)': 'felles-lesing',
  'les_cpic(clinpgx_ider text[])': 'felles-lesing',
  'les_cpic_diplotyper(gensymbol text)': 'felles-lesing',
  'les_cypinfo(fest_ider text[], cypinfo_ider text[])': 'systemarkitekt',
  'les_endringslogg(side jsonb, med_utkast boolean, med_rutiner boolean, etter jsonb, antall integer)': 'rekkevidde',
  'les_fagsaker()': 'systemarkitekt',
  'les_farmakogenetikk(kjemikalie_ider text[])': 'felles-lesing',
  'les_farmakogenetikk_sok(kjemikalie_ider text[])': 'felles-lesing',
  'les_forslag(forslag uuid)': 'rekkevidde',
  'les_forslagsko(filter text)': 'rekkevidde',
  'les_historikk(objekt uuid)': 'radsikkerhet',
  'les_interaksjoner(atc_koder text[], virkestoff_ider text[])': 'felles-lesing',
  'les_interaksjonssok(sider jsonb)': 'felles-lesing',
  // P4c: analyttkatalogen til den innloggedes arbeidskontekst (docs/fagmiljoer.md).
  'les_analyttkatalog()': 'rekkevidde',
  'les_intervallregelsett(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_kildeovervaking(historikk integer)': 'systemarkitekt',
  'les_kjemi(cider integer[])': 'felles-lesing',
  'les_kommentarer(kommentartilstand objekttilstand, ider uuid[])': 'radsikkerhet',
  'les_kurateringer()': 'felles-lesing',
  'les_laboratorieanalyser(komponenter text[])': 'felles-lesing',
  'les_laboratoriesok(komponenter text[])': 'felles-lesing',
  'les_legemidler(virkestoff_ider text[])': 'felles-lesing',
  'les_mine_forslag()': 'eier',
  'les_preparatsok(sider jsonb)': 'felles-lesing',
  'les_redaktoransvar(fagmiljo uuid)': 'redaktormyndighet',
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
  'les_stoffregister(sidetilstand objekttilstand)': 'admin-utvidet',
  'les_stoffside(sidenavn text, sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffsidenavn(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_stoffsider(sidetilstand objekttilstand)': 'radsikkerhet',
  'les_thc_regelsett(regelsettilstand objekttilstand)': 'radsikkerhet',
  'les_verktoysperrer()': 'innlogget',
  // P2a: snarveien for radsikkerhetsreglene i faginnholdet; svarer bare om den innloggede.
  'leser_alt_lokale_innhold()': 'eier',
  // P2a: stoffkoblingene til fortolkningens analytter, til P4b; svarer bare om den innloggede.
  'los_opp_diskusjonskategori(kategori uuid)': 'rekkevidde',
  'marker_forslag_innarbeidet(forslag uuid, objekt uuid, revisjon integer)': 'rekkevidde',
  'medlemsoversikt(fagmiljo uuid)': 'medlemskapsmyndighet',
  'merk_diskusjon_sett(diskusjon uuid, lest_kl timestamp with time zone)': 'eier',
  'merk_gruppeoppgave_sett(oppgave uuid, til timestamp with time zone)': 'eier',
  'merk_ide_sett(ide uuid, lest_kl timestamp with time zone)': 'eier',
  'merk_oppgave_utfort(oppgave uuid, endringslogg text)': 'systemarkitekt',
  'merk_varsler_lest(varsler uuid[], til timestamp with time zone)': 'eier',
  // P2.0: den innloggedes egen status for beskjeden i appen (docs/fagmiljoer.md).
  'min_medlemskapsstatus()': 'eier',
  'mine_administrerte_fagmiljoer()': 'eier',
  'mine_grupper()': 'gruppemyndighet',
  'mine_lesbare_fagmiljoer()': 'eier',
  // P2c: den innloggedes egen, hele profil (docs/fagmiljoer.md, «Profiler og profilbilder»).
  'min_profil()': 'eier',
  'mine_kontohandlinger()': 'kontomyndighet',
  'mine_lesbare_grupper()': 'eier',
  // Gruppesymbolene: gruppene den innloggede styrer, til radsikkerheten på bøtta (som mine_lesbare_grupper).
  'mine_styrte_grupper()': 'eier',
  'mine_gruppesymbolbilder()': 'eier',
  'mine_redaktoransvar()': 'eier',
  'mine_redigerbare_fagmiljoer()': 'eier',
  'mine_redigerbare_objekter()': 'eier',
  // P2d: den innloggedes egne rettigheter, som appen viser menyer og knapper etter.
  'mine_rettigheter()': 'eier',
  'mitt_arbeidsfagmiljo()': 'eier',
  'opprett_gruppeoppgave(gruppe uuid, tittel text, beskrivelse jsonb, ansvarlig uuid, prioritet text)': 'rekkevidde',
  'ressursens_redaktoransvar(ressurs uuid)': 'rekkevidde',
  'sett_gruppeoppgavestatus(oppgave uuid, status text)': 'rekkevidde',
  'tilbakekall_redaktoransvar(ansvar uuid)': 'redaktormyndighet',
  'tildel_gruppeoppgave(oppgave uuid, ansvarlig uuid)': 'rekkevidde',
  'tildel_redaktoransvar(bruker uuid, omrade text, ressurs uuid, fagmiljo uuid, merknad text)': 'redaktormyndighet',
  // Den innloggede velger selv arbeidsfagmiljøet blant egne aktive medlemskap.
  'ta_forslag(forslag uuid)': 'rekkevidde',
  'velg_arbeidsfagmiljo(fagmiljo uuid)': 'eier',
  // P2c: kontoene den innloggede ser profilkortet til; regelen på profiles og bildene bygger på den.
  'mine_synlige_profiler()': 'rekkevidde',
  'mine_varsler()': 'eier',
  // D2: forsidens paneler, etter arbeidsfagmiljøet og tilgangen til samhandlingen (docs/forside.md).
  'forsideoppsummering(modul text)': 'rekkevidde',
  'oppgave(oppgave uuid)': 'systemarkitekt',
  'oppgaveoversikt()': 'systemarkitekt',
  'opphev_verktoysperre(sperre uuid, grunn text)': 'systemarkitekt',
  'opprett_diskusjon(side text, kategori uuid, tittel text, tekst jsonb, ny_kategori text, ny_emoji text)': 'rekkevidde',
  'opprett_diskusjonskategori(side text, navn text, emoji text)': 'rekkevidde',
  // P3: et nytt, lukket fagmiljø.
  'opprett_fagmiljo(navn text)': 'systemarkitekt',
  'opprett_gruppe(navn text, beskrivelse text, fagmiljo uuid)': 'gruppemyndighet',
  'opprett_stoffkategori(navn text, forelder uuid)': 'stoffregister',
  'opprett_utkast(objekttype objekttype, innhold jsonb)': 'rekkevidde',
  'overfor_ide(ide uuid)': 'systemarkitekt',
  'plasser_stoff(stoff text, fra uuid, til uuid)': 'stoffregister',
  'profiles_beskytt_felter()': 'utloser',
  'publiser_utkast(objekt uuid, forventet_revisjon integer)': 'rekkevidde',
  'rydd_idearkiv()': 'systemarkitekt',
  'rydd_stoffpapirkurven()': 'stoffregister',
  'sett_diskusjonstekst(diskusjon uuid, tekst jsonb)': 'rekkevidde',
  'sett_diskusjonstittel(diskusjon uuid, tittel text)': 'rekkevidde',
  'sett_fagmiljoadministrator(bruker uuid, fagmiljo uuid, administrator boolean)': 'medlemskapsmyndighet',
  'sett_grupperolle(gruppe uuid, bruker uuid, rolle text)': 'gruppemyndighet',
  'sett_gruppesymbol(gruppe uuid, emoji text, bilde text)': 'gruppemyndighet',
  'sett_oppgave_klar(oppgave uuid, klar boolean)': 'systemarkitekt',
  'sett_stoffavoritt(stoff text, favoritt boolean)': 'radsikkerhet',
  // Stillingene (docs/stillinger.md): egen eller andres etter myndigheten, og lista for systemarkitektene.
  'sett_stilling(bruker uuid, stilling uuid)': 'stillingsmyndighet',
  'lagre_stillingskategori(kategori uuid, navn text)': 'systemarkitekt',
  'flytt_stillingskategori(kategori uuid, indeks integer)': 'systemarkitekt',
  'fjern_stillingskategori(kategori uuid)': 'systemarkitekt',
  'lagre_stilling(stilling uuid, kategori uuid, navn text)': 'systemarkitekt',
  'flytt_stilling(stilling uuid, indeks integer)': 'systemarkitekt',
  'fjern_stilling(stilling uuid, erstatning uuid)': 'systemarkitekt',
  'stillingsbruk()': 'systemarkitekt',
  'brukere_med_stilling(stilling uuid)': 'systemarkitekt',
  'sett_verktoysperre(omfang text, mal text, grunn text)': 'systemarkitekt',
  'skjul_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
  'slett_diskusjon(diskusjon uuid)': 'rekkevidde',
  'slett_referanse(objekt uuid, forventet_revisjon integer)': 'rekkevidde',
  'slett_stoff(stoff text)': 'stoffregister',
  'slett_stoff_for_godt(stoff text)': 'systemarkitekt',
  'slett_stoffkategori(kategori uuid)': 'stoffregister',
  'sok_virkestoff(sok text, antall integer)': 'felles-lesing',
  'sokedata_versjoner()': 'felles-lesing',
  'stoffsider_som_json(sider uuid[], sidetilstand objekttilstand)': 'radsikkerhet',
  'svar_pa_forslag(forslag uuid, tekst text)': 'rekkevidde',
  'svar_paa_gruppeinvitasjon(gruppe uuid, godta boolean)': 'eier',
  'tom_stoffpapirkurven()': 'systemarkitekt',
  'trekk_forslag(forslag uuid, begrunnelse text)': 'rekkevidde',
  'uleste_varsler()': 'radsikkerhet',
  'utgave_som_json(u objektutgaver)': 'radsikkerhet',
  'valider_scenarioregelsett(innhold jsonb)': 'rekkevidde',
  'verktoysperrehistorikk()': 'systemarkitekt',
  'vis_i_diskusjon(diskusjon uuid, kommentar uuid)': 'rekkevidde',
  // P7 tråd A: gruppechatten (supabase/migrations/*_gruppechat.sql).
  'endre_gruppemelding(melding uuid, tekst text)': 'rekkevidde',
  'gruppechat_endringer(gruppe uuid, etter bigint, antall integer)': 'rekkevidde',
  'les_gruppechat(gruppe uuid, for_nr bigint, antall integer)': 'rekkevidde',
  'merk_gruppechat_lest(gruppe uuid, til_nr bigint)': 'rekkevidde',
  'mine_lesbare_gruppechatter()': 'eier',
  'send_gruppemelding(gruppe uuid, klient_id uuid, tekst text)': 'rekkevidde',
  'slett_gruppemelding(melding uuid)': 'rekkevidde',
  // D4a: samtalelista i chatmenyen (supabase/migrations/*_chatmeny.sql).
  'mine_gruppesamtaler()': 'rekkevidde',
  // D5: direktemeldingene (supabase/migrations/*_direktemeldinger.sql).
  'aapne_direktesamtale(mottaker uuid)': 'direktemelding',
  'aktive_motparter()': 'direktemelding',
  'blokker_bruker(bruker uuid)': 'direktemelding',
  'demp_direktesamtale(samtale uuid, dempet boolean)': 'direktemelding',
  'direktesamtale_endringer(samtale uuid, etter bigint, antall integer)': 'direktemelding',
  'endre_direktemelding(melding uuid, tekst text)': 'direktemelding',
  'kan_bruke_direktemeldinger()': 'eier',
  'les_direktesamtale(samtale uuid, for_nr bigint, antall integer)': 'direktemelding',
  'marker_chataktivitet()': 'direktemelding',
  'merk_direktesamtale_lest(samtale uuid, til_nr bigint)': 'direktemelding',
  'mine_blokkeringer()': 'direktemelding',
  'mine_chatvalg()': 'direktemelding',
  'mine_direktesamtaler()': 'direktemelding',
  'opphev_blokkering(bruker uuid)': 'direktemelding',
  'send_direktemelding(samtale uuid, klient_id uuid, tekst text)': 'direktemelding',
  'sett_chatvalg(tillat boolean, vis_aktiv boolean)': 'direktemelding',
  'skjul_direktesamtale(samtale uuid)': 'direktemelding',
  'slett_direktemelding(melding uuid)': 'direktemelding',
  'sok_direktemottakere(sok text)': 'direktemelding',
  // Varslene om nye chatmeldinger på enheten (supabase/migrations/*_chatvarsler.sql).
  'lagre_pushabonnement(endepunkt text, p256dh text, auth text)': 'eier',
  'slett_pushabonnement(endepunkt text)': 'eier',
}
