# Kartlegging av vaktplanprototypen før integrasjon i OUSFAR

Kartleggingen i P0 for [#561](https://github.com/peohol/ousfar/issues/561) (planforslaget i [kommentar 7201302691](https://github.com/peohol/ousfar/issues/561#issuecomment-7201302691)), laget 26.11.2026 av Claude (OUSFAR Personal). Bakgrunn for akseptmatrisen ([personal-akseptmatrise.md](personal-akseptmatrise.md)) og integrasjonsplanen ([personal.md](personal.md) §8): hva som skal bevares, hvilken kode og hvilke tester som kan overføres, og hva som må tilpasses.

**Historisk kartlegging:** Denne filen beskriver grunnlaget 26.11.2026, ikke nye produktvedtak. Vedtak 27.11.2026 i [personal-design.md](personal-design.md), [personal.md](personal.md) og den oppdaterte [akseptmatrisen](personal-akseptmatrise.md) går foran alle eldre krav her, særlig statuskatalog, månedsflytting og publisering. Eksisterende tester som uttrykker erstattede regler tilpasses.

**Grunnlag:** `peohol/vaktplan` på `main` = `10bc89fab8d8065140de1b41aa3721970f56b82e` (v0.11, sammenslåingen av #17): designspesifikasjonen v0.11, `docs/arkitektur.md`, `docs/testing.md`, README, LES-MEG, all kode i `src/` og alle tester, og beskrivelsene av PR #1, #3, #5, #6, #8, #11, #13, #15 og #17. I OUSFAR: `AGENTS.md`, `docs/personal.md` (på `1a812ed`) og integrasjonsplanen. Enhetstestene er kjørt på grunnlaget: 378 av 378 grønne.

**Ikke lest:** regneark, Git-historikk med tidligere innhold, Vercel-utrullinger og reelle personalopplysninger. Alle navn under er syntetiske.

---

## 0. Slik leses sjekklisten

Hver linje har en stabil ID, den samme som i akseptmatrisen ([personal-akseptmatrise.md](personal-akseptmatrise.md)), en status og en henvisning til prototypens tester.

| Status | Betydning |
| --- | --- |
| **V** | Vedtatt av Peder. Kilde i parentes (`personal.md`-paragraf, spesifikasjonsversjon eller PR). Må bevares; endring krever nytt vedtak. |
| **P** | Prototypens eget valg eller startverdi, ikke vedtatt. Beholdes som justerbar standard i OUSFAR med mindre Peder bestemmer noe annet. |
| **N** | Nytt i integrasjonen (fra integrasjonsplanen eller Peders bestilling 26.11.2026). Ikke vedtatt; krever godkjenning før implementering. |

Testhenvisninger: `u:` er enhetstester i `src/domain/` (Vitest), `e:` er nettlesertester i `tests/e2e/` (Playwright, desktop og Pixel 7).

---

## 1. Funksjonalitet og produktregler som skal bevares

### 1A. Grunnmodell og statuser

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-STA-01 | Høyst **én status per medarbeider per dag**, uansett klokkeslett. Ingen kombinasjons- eller eksklusjonsregler. Håndheves i datamodellen og i alle veier inn (enkeltcelle, flervalg, flytting, fordeling, innlesing). | V (§7.2, v0.9, PR #13) | u: rules, guarantees, kontroll · e: status |
| A-STA-02 | Høyst **én medarbeider per dag for statuser som er «én per dag»** (vakttypene). Andre statuser med bemanningsbehov kan ha flere (prototypen tillater opptil 20). | V for vaktene (§7.2), P for grensen 20 | u: guarantees, allocation «mange plasser samme dag» |
| A-STA-03 | **Ingen status = til stede** på ordinære arbeidsdager. Kalenderen viser planlagt tilstedeværelse, ikke registrert oppmøte. | V (§7.2) | u: rules |
| A-STA-04 | To kategorier: **«På kontoret»** (Vakt 1, Vakt 2, Referent, Opplæring) og **«Ikke på kontoret»** (Borte, Ferie, Hjemmekontor, Forskning, Undervisning, Avspasering, Fri, Ønske om fri). | V (§7.2, §6.2) | u: rules (katalogen) |
| A-STA-05 | Hver status har ikon fra **ett felles ikonbibliotek, ingen emojier**; samme ikon i boble, kalender, forklaring og regelside. | V (§7.2) | e: status |
| A-STA-06 | Statuskatalogen er **data, ikke kode**, og skal kunne variere per fagmiljø. Det bygges ikke noe administrasjonsgrensesnitt for katalogen nå. | V (§7.2) | u: rules |
| A-STA-07 | Statuser på kontoret krever **arbeidsdag** (ikke helg, helligdag eller dag personen ikke er aktiv). | V (§7.2) | u: rules «krav til statusen», people · e: kalender, status |
| A-STA-08 | Vakt krever **kvalifikasjon for akkurat den vakttypen**. | V (§7.2) | u: rules · e: status |
| A-STA-09 | Hard garanti: en vakt og et bemanningsbehov må høre til «På kontoret», så **fravær aldri kan telle som dekning**, heller ikke i manipulerte regler. En status med vaktfritak kan ikke bemannes eller være én per dag. | V (v0.9, kontroll PR #3) | u: guarantees, kontroll |
| A-STA-10 | **Ønske om fri** regnes som fravær i planleggingen, men vises annerledes enn innvilget fri (stiplet merke). | V (§7.2) | u: rules · e: status |
| A-STA-11 | Utgåtte statuser kan ikke velges, men gamle registreringer står og er gyldige. | P (v0.9) | u: singleStatusMigration |
| A-STA-12 | **Borte registreres uten grunn.** | V (§3.2, §7.2) | u: privacy |

### 1B. Kalendervisninger og navigasjon

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-KAL-01 | Fire visninger: **dag, uke (standard), måned og helår**, med felles dato, navigasjon, filtre og redigeringsmodell. En endring vises straks i alle visninger og etter omlasting. | V (§7.2 dag/uke/måned; helår v0.4–v0.11) | e: kalender |
| A-KAL-02 | **Dag:** bemanningskort (dekning og udekkede vakter) og alle medarbeidere med status, merknad og klokkeslett direkte. | V (spes. §2) | e: kalender, status |
| A-KAL-03 | **Uke:** medarbeidere i rader, datoer i kolonner, faste navn, klikkbare celler. | V (spes. §2) | e: kalender |
| A-KAL-04 | **Måned:** datooversikt med vaktdekning (rød stripe ved udekket) og **alle statuser som standard**, gruppert per status. En linje med én person åpner personens boble direkte (navn eller ikon); en linje med flere personer gir medarbeidervelger. Man blir stående på måneden. | V (§7.2, v0.9, PR #13) | e: status, kontroll |
| A-KAL-05 | **Helår:** kompakt matrise over hele arbeidsåret (fortid og fremtid, historikk skjules ikke), månedsgrupper, **ISO-ukenummer** over dato og ukedag (uke delt ved månedsskifte), faste navn og overskrifter, vannrett rulling, «Gå til dato», «+n» ved flere registreringer, effektiv tegning. | V (spes. §2, v0.8, PR #11) | e: i-dag, kontroll, kalender |
| A-KAL-06 | Arbeidsåret starter i en konfigurerbar måned per fagmiljø (`workYearStartMonth`). | P | u: dates |
| A-KAL-07 | Årsskifte, helger og norske helligdager håndteres riktig (helligdager beregnes, ikke lagres). | V (spes. §5 A) | u: dates, people · e: kalender |
| A-KAL-08 | Dager før en person ble registrert vises «Ikke registrert», dager etter deaktivering «Ikke aktiv», begge skravert. Rader og antall følger medarbeiderlisten **slik den gjaldt datoen**. | V (kontroll 3, PR #3) | u: kontroll · e: kontroll |
| A-KAL-09 | Hurtigtaster: D/U/M/H bytter visning, T = i dag, Alt+←/→ blar, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) angre/gjør om; piltaster, PageUp/PageDown, Home/End i rutenettet; Enter åpner boblen; Escape lukker og gir fokus tilbake. | P (tastaturflyt er krav i AGENTS.md) | e: tastatur-mobil, flytting |

### 1C. Dagen i dag

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-DAG-01 | Mørk, tykk kontur rundt dagens kolonne (uke, helår) eller felt (måned), fylt dagnummer; i helår også inneværende uke fremhevet i hele høyden og ukenummeret fylt. Farger og tykkelser som felles tokens. | V (v0.8, PR #11) | e: i-dag |
| A-DAG-02 | Skjermlesere får `aria-current="date"`; ikke «i dag» i etiketten. | V (PR #11, kontroll) | e: i-dag, kalender |
| A-DAG-03 | «I dag» (knapp og T) går til dagen i alle visninger, ruller den frem og **setter fokus** på dagens celle i samme rad som sist; slår på «Vis helg» ved behov; med ingen viste medarbeidere får datoens overskrift fokus. | V (v0.8, PR #11) | e: i-dag |

### 1D. Statusboblen og direkte redigering

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-BOB-01 | **Samme boble i alle visninger**, snakkeboble med pil mot elementet som åpnet den; elementet markeres. Ingen overskrift (navn, dato, dagtype), ingen regelversjon. Bunnark på små skjermer. | V (§7.2, v0.9) | e: status, tastatur-mobil |
| A-BOB-02 | Midtstilt verktøylinje øverst: flytt, merknad, slett, lås (vakter som fordeles), administrativt vaktfritak (bare «Borte» og bare med myndighet). | V (v0.9, v0.11) | e: status, roller |
| A-BOB-03 | Valgt status har bakgrunn og hake; de andre er dempet, men klikkbare. **Et valg lagres med en gang**, uten lagreknapp; en ny status erstatter den gamle. | V (§7.2) | u: commands «setStatus» · e: status |
| A-BOB-04 | Status fjernes med slett, med **nytt klikk på valgt status** eller med **dobbeltklikk på statusen direkte i kalenderen** (alle visninger). Alt kan angres. Leser kan ikke. | V (§7.2, PR #13) | e: status, tastatur-mobil |
| A-BOB-05 | Borte (eller annen status) på en som har vakt **erstatter vakten** og sier at vakten blir udekket; ingen bekreftelsesdialog. | V (§7.2 fasit, PR #13) | u: commands, rules «dagsdekning» · e: status |
| A-BOB-06 | Tastatur: Enter åpner, Tab mellom valgene, Mellomrom/Enter velger og fjerner, Escape lukker med fokus tilbake. | V (spes. §2) | e: tastatur-mobil |

### 1E. Merknad og klokkeslett

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-MRK-01 | Valgfri merknad på **alle statuser**, høyst 120 tegn, bare ikke-sensitiv planleggingsinformasjon. | V (§7.2, §3.2); 120 tegn P | u: privacy · e: status, kontroll |
| A-MRK-02 | Tekst som ligner fødselsnummer, avvises; en ordliste avviser typiske helse-/fraværsord. Ordlisten er et ekstra vern, ikke en garanti. | V (§3.2 fnr); ordlisten P | u: privacy · e: kontroll |
| A-MRK-03 | Dagsvisningen viser merknad og klokkeslett ved statusen; uke, måned og helår viser merknadsikon og en **infoboble** (mus, tastatur og berøring) over statusikonet, navnet, merknadsikonet og helårsfeltet. | V (§7.2) | e: status, tastatur-mobil |
| A-MRK-04 | I måned: **én felles infoboble for hele linjen** (ikon, navn, merknadsikon og mellomrommet), midtstilt over feltet de danner; med flere personer også én per navn. | V (Peders tilbakemelding, PR #13) | e: status |
| A-MRK-05 | Klokkeslett: «Hele dagen» avkrysset som standard, ellers Fra/Til. Ugyldig tidsrom kan ikke lagres. **Klokkeslett påvirker verken tilstedeværelse, dekning eller fordeling.** | V (§7.2) | u: rules, commands · e: status |
| A-MRK-06 | Merknad og klokkeslett **beholdes ved statusbytte** og følger statusen ved flytting. | V (§7.2) | u: commands, move · e: flytting |
| A-MRK-07 | Merknad/klokkeslett lagres bare når brukeren har endret dem; Angre mens boblen er åpen blir ikke omgjort når boblen lukkes. | V (kontroll PR #13) | e: status |

### 1F. Vaktovertakelse

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-OVT-01 | Velges en vakt som en annen har samme dag: «Vakt 1 er allerede tildelt [navn]. Vil du overta vakten?» med Avbryt og Overta vakten. Statusen mottakeren mister, og hva som blir udekket, vises først. | V (§7.2) | u: rules «vakter og overtakelse» · e: status |
| A-OVT-02 | Overtakelsen er **én atomisk endring** som angres med én Angre. Kvalifikasjonskravene gjelder. | V (§7.2) | u: commands «vaktovertakelse» |
| A-OVT-03 | Fasit: Jonas Vik Vakt 1 og Maja Holte Vakt 2 tirsdag; Maja overtar Vakt 1 → Maja Vakt 1, Jonas ingen status, Vakt 2 udekket. Borte for Jonas i stedet → Borte erstatter vakten, Vakt 1 udekket. | V (§7.2) | u: commands |

### 1G. Flytting (dra-og-slipp)

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-FLY-01 | Én felles mekanisme i alle fire visninger flytter én status mellom medarbeidere og datoer. Klikk uten dra åpner boblen. | V (§7.2, v0.6–v0.9) | u: move · e: flytting |
| A-FLY-02 | Tom målcelle: flyttes direkte. Opptatt: **«Bytt statusene»**, **«Flytt og erstatt eksisterende status»** og **«Avbryt»**, bare alternativer som gir gyldig plan, hver med vakter som blir udekket. | V (§7.2) | u: move · e: flytting |
| A-FLY-03 | En flytting **tar aldri over en vakt** fra en tredje person; avvises med årsak også når målcellen er tom. Overtakelse bare via boblen. | V (§7.2) | u: move |
| A-FLY-04 | Regler og kvalifikasjoner vurderes slik de gjelder **måldatoen**; valget vurderes på nytt mot gjeldende kalender rett før lagring, så et foreldet valg aldri overskriver nyere endringer. | V (spes. §2) | u: move |
| A-FLY-05 | Merknad, klokkeslett og lås følger statusen; **administrativt vaktfritak følger aldri med**. Én Angre angrer hele flyttingen eller byttet. | V (§7.2, §6.2) | u: move, exemption · e: flytting |
| A-FLY-06 | Direkte flytting viser vakter som blir udekket, ved slippet og i meldingen med Angre. | V (spes. §2) | e: flytting |
| A-FLY-07 | Måned: slipp på en dag gir medarbeidervelger med hvem som kan ta statusen. | V (spes. §2) | e: flytting |
| A-FLY-08 | Tastaturalternativ («Flytt» i boblen, piltaster og Enter, også i valgboblen); berøring med langt trykk uten å ødelegge rulling; automatisk rulling nær kanten (også vannrett i helår); presist slipp under rulling; Escape avbryter; leser kan ikke flytte. | V (spes. §2) | e: flytting, tastatur-mobil |
| A-FLY-09 | Utseende: løftet kort med halvgjennomsiktig bakgrunn, retningsstyrt presisjonsmarkør med spissen i pekeren, kortet henger etter; mål markert med ramme, symbol og tekst (ikke bare farge); redusert bevegelse respekteres. Verdiene er justerbare. | V for prinsippene, P for verdiene | u: pointer · e: flytting |

### 1H. Flervalg, filtre og visningsvalg

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-FLT-01 | Flervalg («Velg flere», Shift/Ctrl+klikk) med **«Sett status»** og **«Fjern status»**, forhåndsvisning av statuser som forsvinner og vakter som blir udekket; én angre. Bare for roller med redigeringsrett. | V (spes. §2, v0.9) | u: commands «flervalg» · e: flervalg |
| A-FLT-02 | «Fremhev»: avkrysning av flere statuser samtidig, «Nullstill» for ingen. | V (spes. §2, PR #5) | e: filtre |
| A-FLT-03 | «Vis medarbeidere»: hvem som vises, «Vis alle»/«Skjul alle», **valget huskes**. Skjulte medarbeidere teller fortsatt i vaktdekningen. | V (spes. §2, PR #5) | e: filtre |
| A-FLT-04 | «Vis helg» og filter på stillingskategori; valgt visning huskes. | P | e: filtre |

### 1I. Angre og gjør om

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-ANG-01 | Alle endringer kan angres og gjøres om (knapp med navn på endringen, Ctrl+Z, Ctrl+Y), også fra melding etter lagring. | V (§7.2) | e: status, flytting, vaktfordeling |
| A-ANG-02 | Sammensatte endringer (overtakelse, flytting/bytte, flervalg, godtatt forslag) er **én** angre-oppføring. | V (§7.2, spes. §4) | u: commands, move, allocation |
| A-ANG-03 | Angre og gjør om krever **samme rettighet** som endringen de gjelder, også fra hurtigtast og melding. | V (kontroll PR #3, §6.2 for fritak) | u: permissions, exemption · e: roller |
| A-ANG-04 | Angre/gjør om kan **ikke endre vaktandel for en dag før datoen det utføres** (også når siden står åpen over midnatt). | V (§6.2) | u: dutyShare, store.test |
| A-ANG-05 | Prototypen holder 60 steg per nettleser. | P (utgår, se §4) | |

### 1J. Medarbeidere og gyldighet over tid

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-MED-01 | Per medarbeider: stillingskategori, kvalifikasjon per vakttype, vaktandel og aktiv/inaktiv. | V (spes. §2, §7.4) | u: people, commands |
| A-MED-02 | **Ingen arbeidsmønster eller stillingsandel.** Alle aktive regnes som til stede på hverdager som ikke er helligdager; fravær, også ved deltid, registreres i kalenderen. | V (§7.2, PR #5) | u: people |
| A-MED-03 | Endringer i medarbeidere og regler **gjelder fra dagen de lagres**; tidligere dager vurderes etter det som gjaldt da (`atDate`), så historikk og tidligere vaktdekning aldri skrives om. | V (§7.4, kontroll PR #3) | u: kontroll, rules |
| A-MED-04 | En medarbeider lagt til i dag kan ikke få registreringer før i dag. Deaktivering i dag påvirker ikke tidligere vakter. | V (kontroll PR #3) | u: kontroll |
| A-MED-05 | Navn kan ikke inneholde tallrekker (vern mot fødselsnummer). | P | u: privacy |

### 1K. Regler, bemanningsbehov og regelversjoner

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-REG-01 | **Bare statuser eksplisitt konfigurert som bemanningsoppgave fordeles automatisk.** Bemanningsbehov per ukedag, med valg for helligdager. | V (spes. §4) | u: commands «regelendringer», allocation |
| A-REG-02 | Første fagmiljø: **én Vakt 1 og én Vakt 2 per vanlig arbeidsdag** (man–fre, ikke helligdager). Referent, Opplæring o.l. er manuelle statuser. | V (spes. §4); Referent manuell P/N | u: seed |
| A-REG-03 | Rollevekt per stillingskategori og belastning ligger på bemanningsbehovet (konfigurasjon), **ikke i motoren**. Ingen hardkodet LIS/overlege. | V (spes. §4) | u: allocation «rollevektene er konfigurasjon» |
| A-REG-04 | Regelendringer gjelder fra lagringsdagen, viser **virkning før lagring** (endret dekning, tilstedeværelse, registreringer som blir gyldige/ugyldige, minst 365 dager frem) og **omskriver aldri** lagrede registreringer, historikk eller publisert plan. | V (spes. §3) | u: commands, kontroll · e: regler |
| A-REG-05 | Alle regelversjoner beholdes, også flere samme dag; versjonsnummer gjenbrukes aldri, heller ikke etter angre. | P (intern teknikk, kontroll PR #3) | u: kontroll |
| A-REG-06 | Statuskatalogen vises skrivebeskyttet med kolonnen «Vaktfritak»; lokal administrator endrer bemanningsbehov og vektene i fordelingen. | V (§7.2, v0.11) | e: regler |

### 1L. Vaktandel

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-VAN-01 | Vaktandel er **individuell, relativ vaktbelastning, standard 100 %, ikke stillingsprosent**, lagres uten begrunnelse. | V (§6.2, §3.2) | u: dutyShare |
| A-VAN-02 | Ordinær vaktandel 0–100 % (hele tall) fra en dato på ubestemt tid, og midlertidige perioder (fra og til, begge med) **uten overlapp**; etter en periode gjelder den ordinære. | V (§6.2) | u: dutyShare · e: vaktandel |
| A-VAN-03 | Tidligere, gjeldende og fremtidige verdier vises. **Endringer bare fra i dag**; en pågående periode som fjernes, avsluttes i går; en avsluttet periode kan ikke fjernes. | V (§6.2) | u: dutyShare · e: vaktandel |
| A-VAN-04 | **0 % utelukker automatisk tildeling**; manuell tildeling er fortsatt mulig. Årsaken vises i «Vis vurdering». | V (§6.2) | u: allocation |

### 1M. Vaktfritak og skjerming

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-FRI-01 | Vaktfritak er en egenskap ved statusen i katalogen (alltid / administrativt / aldri), ikke hardkodet. **Ferie og Opplæring alltid; Borte bare med administrativt fritak.** | V (§6.2) | u: exemption, allocation «vaktfritak per status» |
| A-FRI-02 | Administrativt vaktfritak er bare **ja/nei uten grunn**; gis og fjernes av lokal administrator og systemarkitekt med lokal myndighet, også på egne registreringer. | V (§6.2, §3.2) | u: exemption · e: roller |
| A-FRI-03 | Fritaket **kan ikke gis indirekte**: følger aldri flytting, bytte, kopiering eller flervalg; en ny registrering får det aldri; angre/gjør om som gir eller fjerner det krever myndighet. Sletting eller erstatning av statusen er en vanlig kalenderendring. | V (§6.2); siste setning P (PR #17) | u: exemption, move |
| A-FRI-04 | **Lesemodell:** uten fritaksmyndighet vises bare «Borte», også i historikk og API-svar. Forventet antall, avvik, avviksdiagram, største avvik og tallene i vurderingen av hver kandidat vises bare med myndighet. Utvalget av medarbeidere i oversikter avhenger ikke av fritak. Tall som vises, er aldri bevisst feil. | V (§6.2, kontroll PR #17) | u: exemption «skjermet vaktfritak i lesemodellen» · e: vaktbelastning, roller |
| A-FRI-05 | **Samme kalender med og uten fritak gir likt svar** for roller uten myndighet (negativ test). Fasit: to likt stilte, én vakt 1, A Borte, B vakten: ½ og ½ uten fritak, 0 og 1 med. | V (§6.2) | u: exemption |
| A-FRI-06 | Meldinger og varsler om fritak går bare til dem med myndighet; meldinger fra forrige rolle fjernes ved rollebytte. | V (§6.2) | u: store.test · e: roller |

### 1N. Vaktfordeling: motor

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-FOR-01 | **Automatisk vaktfordeling er et forslag**: forståelig, etterprøvbart, manuelt justerbart, tydelig skilt fra godkjent og publisert plan. | V (§4) | u: allocation «forslag, godkjenning og forklaring» |
| A-FOR-02 | Harde krav: best mulig dekning, én status per dag (bare den **uten status** kan få ny vakt), kvalifikasjon, låser, vaktandel over 0 %. Ved umulig dekning vises udekkede plasser med årsak, gruppert; andre harde krav brytes aldri. | V (§6.1, §7.2, spes. §4) | u: allocation «harde krav og dekning», «dekningen er like høy som et uavhengig søk» |
| A-FOR-03 | Prioritet: (1) harde krav og dekning, (2) **historisk utjevning høy vekt**, (3) avstand og jevn belastning høy vekt, (4) rettferdighet i perioden lavere, (5) ukedagsvariasjon lavere. Historisk utjevning og periode har **hver sin vekt**. | V (§6.1) | u: allocation «rettferdighet over tid» |
| A-FOR-04 | **Vakt 1 og vakt 2 utjevnes hver for seg**; ingen samlet kvote, ingen motregning. Overleger færre vakt 1, ikke nødvendigvis færre totalt. Motsatte stillingsvekter for vakt 1 og vakt 2. | V (§7.2, §6.1) | u: allocation «fasit: rollevekter» |
| A-FOR-05 | **Forventet antall** per medarbeider, vakttype og dato: stillingsvekt × vaktandel × fritaksfaktor, blant aktive og kvalifiserte, fordelt forholdsmessig dag for dag, slik reglene gjaldt hver dag. **Tilgjengelighet avgjør bare plassering.** Én felles beregning for motor og oversikt. | V (§6.2) | u: allocation «vaktandel», workload |
| A-FOR-06 | Bakover teller bare **vakter som faktisk er registrert**; en dag uten registrert vakt gir ingen forventning, så manglende historikk gir ingen kunstig vaktgjeld (også ved første gangs bruk). Forventning først fra dagen personen ble aktiv. | V (§6.1) | u: allocation «uten historikk», «manglende registreringer» |
| A-FOR-07 | Tidshorisont for historisk utjevning kan stilles; **standard 365 dager** bakover fra periodens slutt (28–730). | V for standard 365 (§6.1); grensene P | u: allocation «tidshorisonten er konfigurerbar» |
| A-FOR-08 | Utjevning gir ikke urimelig tett plan: målet for den som tar igjen, er høyst en andel over rettferdig andel i perioden (**foreløpig standard 50 %**, justerbar, ikke arbeidstidsgrense); den som har hatt for mange, kan gå ned til null, aldri under. **Grensen begrenser ønsket kompensasjon, ikke faktisk antall**; dekning går foran, og planen viser overskridelsen. | V (§6.1, foreløpig standard) | u: allocation «taket begrenser målet …» · e: vaktfordeling |
| A-FOR-09 | Gyldig vaktfritak gir ingen senere kompensasjon; skjevhet fra vanlig redusert tilgjengelighet (f.eks. mye forskning) jevnes ut senere. | V (§6.2) | u: allocation «eksempel 3» |
| A-FOR-10 | Vakt to hverdager på rad er **lov, men unngås** (mykt mål via avstand), ingen fast minsteavstand. Dagvakter, hviletid ikke aktuelt. | V (Peder 25.11.2026, spes. v0.7) | u: allocation «ved like gode alternativer» |
| A-FOR-11 | Foretrekk **ulik stillingskategori** på vaktene samme dag; spre vakter i faktiske kalenderdager også over helger og periodegrenser; straff klumping på tvers av vakttyper; variasjon i ukedager (særlig vakt 1). | V (spes. §4) | u: allocation «ukedagene varierer», «ingen korttidsklumping» |
| A-FOR-12 | Vakt 1 er mer belastende enn vakt 2 (større betydning i spredning), uten å erstatte separate fordelingsmål. Ingen bestemt faktor vedtatt. | V for prinsippet (spes. §4), faktoren 1,5 P | |
| A-FOR-13 | Etterprøvbar matematisk metode, **ikke språkmodell** som motor; deterministisk; påstår ikke global optimalitet. Dag-for-dag-søk (best mulig dekning og færrest endringer) + lokalt søk (flytt én / bytt to innen kort vindu). Begrenset søk sier fra hvor mange dager det gjelder. | V for prinsippene (spes. §4); metoden P | u: allocation «søkets grenser og trekk» |
| A-FOR-14 | **Oppdater vaktplan**: beholder fortid, låste, manuelle og gyldige tildelinger; fyller hull med færrest mulige endringer; ingen endringer når planen alt er gyldig; én ugyldig vakt med ledig erstatter endrer bare den plassen. | V (§6.1, spes. §4) | u: allocation «oppdatering av eksisterende plan» · e: vaktfordeling |
| A-FOR-15 | **Lag ny vaktplan**: omfordeler perioden med vekt på rettferdighet; ingen endring utenfor perioden; litt stabilitet mellom ellers like planer (0,5 per utbyttet gyldig tildeling). | V for modusen, 0,5 P | u: allocation |
| A-FOR-16 | **Dager før i dag endres aldri**; en periode helt før i dag avvises i skjemaet med årsak. | V (spes. §4, Peders prøving PR #15) | u: allocation · e: vaktfordeling |
| A-FOR-17 | En eksisterende vakt beholdes når den er gyldig etter vurderingen av eksisterende registreringer (lagret tid, også etter endret standardtid eller deaktivert status); nye vakter vurderes som nye registreringer. | V (kontroll PR #6) | u: allocation «en gyldig vakt med fast tid beholdes …» |
| A-FOR-18 | Vaktbytte endrer ikke andre vakter; faktisk utført vakt teller for riktig person. | V (spes. §4) | u: allocation «et vaktbytte …» |
| A-FOR-19 | Startdata **uten vakter**: fordelingen kan startes fra blanke ark; ingen konstruert vaktgjeld. | V (§6.1, v0.10) | u: seed |

### 1O. Forslag, godkjenning, låsing og publisering

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-PUB-01 | **Forslag, godkjenning og publisering er atskilte tilstander.** Et forslag lagrer ingenting. «Godta forslaget» lagrer det som én endring (én angre). Publisering er et eget steg. | V (§4, spes. §4) | u: allocation · e: vaktfordeling |
| A-PUB-02 | Forslaget viser **før/etter per endring med årsak**, antall endringer, udekkede plasser med årsak gruppert, og merknader; forkast eller godta. | V (spes. §4) | e: vaktfordeling |
| A-PUB-03 | **Foreldet forslag avvises**: når noe beregningen bygger på er endret (regler, medarbeidere med historikk, publisering, registreringer fra start av tidshorisonten til litt etter perioden). | V (spes. §4, kontroll PR #6) | u: allocation «et foreldet forslag avvises» · e: vaktfordeling |
| A-PUB-04 | **Låst vakt** (manuell avtale, hengelås i boblen) endres aldri av fordelingen. | V (spes. §4) | u: allocation · e: vaktfordeling |
| A-PUB-05 | Publisering er en dato **«publisert til og med»**. Uten tillatelse endrer fordelingen **ingenting** på publiserte datoer, heller ikke ledige plasser (de telles og nevnes). | V (spes. §4, kontroll PR #6) | u: allocation «ledige plasser på publiserte datoer» |
| A-PUB-06 | Med avkrysningen **«Tillat endringer i publisert vaktplan»** (hjelpetekst med datoen) er endringene der merket i forslaget og **publisert straks forslaget godtas**. | V (v0.10, PR #15) | e: vaktfordeling |
| A-PUB-07 | Forhåndsvisningen av oversikten etter godkjenning er **nøyaktig kalenderen «Godta» ville lagret nå**, også etter angre utenfor forslaget. | V (kontroll PR #15) | u: workload · e: vaktbelastning |
| A-PUB-08 | Publisering og tilbaketrekking krever kalenderrett. | P | e: vaktfordeling |

### 1P. Forklaring

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-FKL-01 | «Vis vurdering» for en plass viser hver medarbeider som **valgt**, **mulig** (hvor mye dårligere planen blir, per ledd), **opptatt** eller **ikke mulig** (regelmotorens årsak). | V (§4, spes. §4) | u: allocation «forklaringen viser hvorfor» · e: vaktfordeling |
| A-FKL-02 | Uten fritaksmyndighet: «Mulig» uten tall og uten rekkefølge etter tall. | V (§6.2) | u: exemption · e: roller |

### 1Q. Oversikt over vaktbelastning

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-BEL-01 | Også uten forslag, oppdateres når kalenderen endres. Velg vakttype og tidsrom (hurtigvalg 91 og 365 dager, eller selvvalgt, høyst 731 dager), med tydelige datogrenser. | V for oversikten (§6.1); hurtigvalg og grense P | u: workload · e: vaktbelastning |
| A-BEL-02 | Per medarbeider: vaktandel (tall eller spenn, tidslinje som hjelpetekst), **ledige dager** (dager med vakt der personen var ledig, av dagene vedkommende kunne hatt vakten), antall, forventet, avvik. | V (§6.2) | u: workload · e: vaktbelastning |
| A-BEL-03 | Med forslag også: antall i foreslått plan, samlet etter godkjenning, samlet forventet og avvik etter, **over nøyaktig samme tidsrom**. En vakt som flyttes, **telles én gang**. | V (§6.1) | u: allocation «omfordeling av eksisterende vakter …» (17/13 før, 15/15 etter) |
| A-BEL-04 | Liggende stolpediagram for avvik før/etter, null i midten, for få blått til venstre og for mange rødt til høyre, tall ved siden av; fargeparet kontrollert for fargesvakt syn og kontrast; skjermlesertekst per rad. | P (v0.10) | e: vaktbelastning |
| A-BEL-05 | Forventet, avvik og diagram bare for roller med fritaksmyndighet (A-FRI-04). | V (§6.2) | e: vaktbelastning |

### 1R. Roller og tilgang

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-TIL-01 | Tre atskilte nivåer: **kollegers innsyn**, **vaktplanansvarliges redigering**, **administrativ myndighet**. | V (§3.3) | u: permissions |
| A-TIL-02 | Prototypens rolletabell: Leser ser; Vaktplanansvarlig redigerer kalender, medarbeidere, vaktandel, lager/godtar forslag, låser og publiserer; Lokal administrator i tillegg regler og administrativt fritak (gjelder også systemarkitekt med lokal myndighet); **Systemarkitekt uten lokal myndighet: ingenting**. | V for vaktandel og fritak (§6.2); resten P (vedtas før implementering etter §3.3) | u: permissions, exemption · e: roller |
| A-TIL-03 | Vaktplanansvarlig er en **egen rolle**, uavhengig av redaktørrollene. | V (§3.3) | |
| A-TIL-04 | Kommandoene avviser handlinger rollen ikke har lov til (ikke bare skjulte knapper); i OUSFAR **på serversiden**, avgrenset til eget fagmiljø, med negative tester. | V (§3.3) | u: permissions (demonstrert) |

### 1S. Personvern

| ID | Regel | Status | Tester |
| --- | --- | --- | --- |
| A-PER-01 | Bare syntetiske medarbeidere i utvikling, tester, skjermbilder og logger. | V (§3.1) | u: seed |
| A-PER-02 | Bare planleggingsrelevant status og tid; aldri fraværsgrunn, diagnose eller sensitiv fritekst. | V (§3.2) | u: privacy |
| A-PER-03 | Eldre data migreres **uten stille tap** (prinsippet: det viktigste beholdes, resten arkiveres og meldes). | V (§7.2) for prototypen; reell migrering krever egen beslutning | u: singleStatusMigration |

---

## 2. Uavhengige fasiter som skal følge med til OUSFAR

Alle er regnet for hånd fra reglene, ikke av motoren, og skal kjøres som egne tester i OUSFAR (også mot den portede motoren).

| ID | Fasit | Kilde | Prototypetest |
| --- | --- | --- | --- |
| A-FAS-01 | To LIS og to overleger, 12 plasser av hver vakttype: 4/4/2/2 vakt 1, omvendt for vakt 2. | spes. §5 B | «to like LIS og to like overleger …» |
| A-FAS-02 | A 12 og B 8 tidligere (forventet 10/10), 10 nye dager → **3 og 7**, 15/15 samlet. 11/9 → 4/6. Ingen historikk → 5/5. | §6.1 | «eksempelet: 12 og 8 …» |
| A-FAS-03 | Vaktandel A/B/C 100/60/100 %, ledige dager 100/60/60 %, 52 vakter → **20/12/20** (ingen dobbel reduksjon; andre oppgaver reduserer ikke). | §6.2 eks. 1 | «52 vakter gir 20, 12 og 20 …» |
| A-FAS-04 | To like, 10 vakter, A ferie 4 dager → **3 og 7** (likt for opplæring og innvilget fritak). | §6.2 eks. 2 | «vaktfritak per status …» |
| A-FAS-05 | Som A-FAS-04, men forskning → **5 og 5** forventet; skjevhet synlig og utjevnes senere. | §6.2 eks. 3 | «eksempel 3 …» |
| A-FAS-06 | To like, ti vakter, den ene opptatt alle dager uten fritak → forventet 5/5, faktisk 10/0, ingen udekket, overskridelsen vises. | §6.1 | «taket begrenser målet …» |
| A-FAS-07 | Skjermingen: A Borte, B vakt, én dag → ½/½ uten fritak, 0/1 med; likt svar for roller uten myndighet. | §6.2 | «skjermet vaktfritak i lesemodellen» |
| A-FAS-08 | Omfordeling uten dobbelttelling: 17/13 før, 15/15 etter, sum 30. | §6.1 | «omfordeling av eksisterende vakter …» |
| A-FAS-09 | Kategoribytte og regelendring i historikken: fasit 22 og 24 andeler, 12 og 14. | kontroll PR #6 | «kategoribytte …», «regelendring …» |
| A-FAS-10 | Overtakelse Jonas/Maja (A-OVT-03). | §7.2 | `commands.test.ts` |
| A-FAS-11 | Dekningen i en liten instans sammenlignes med et **uavhengig, uttømmende søk** som ikke bruker motoren. | spes. §5 B | «dekningen er like høy som et uavhengig søk» |

Integrasjonsplanen ber i tillegg om **et andre syntetiske fagmiljø** med andre navn, tre kategorier, andre oppgavetyper, annen bemanningskalender og flere personer per oppgavetype/dag (N, se §5).

---

## 3. Startverdier som ikke er vedtatt (P)

Beholdes som justerbare standarder i pilotoppsettet. Ingen av dem skal skrives inn som vedtak uten Peders ja.

| Innstilling | Verdi | Grenser i prototypen |
| --- | --- | --- |
| Rollevekt vakt 1 / vakt 2 | LIS 2, overlege 1 / omvendt (motsatt vekting er vedtatt, tallene veiledende) | 0–10 |
| Belastning vakt 1 / vakt 2 | 1,5 / 1 | 0,1–10 |
| Vekt historisk utjevning / periode | 20 / 1 (forholdet 20 : 1 gir 20/21 av full utjevning) | 0–100 |
| Vekt avstand / jevn belastning | 6 / 2 | 0–100 |
| Vekt ukedager / ulik kategori samme dag | 0,5 / 3 | 0–100 |
| Kort, glidende vindu | 42 dager | 7–120 |
| Største ekstra utjevning i én plan | 50 % (foreløpig standard i §6.1) | 0–200 |
| Stabilitet i ny plan | 0,5 per utbyttet gyldig tildeling (konstant i koden, ikke innstilling) | |
| Søkegrenser | 20 000 steg per dag, 30 runder lokalt søk | |
| Periode for forslag / oversikt | høyst 366 / 731 dager | |
| Merknad | høyst 120 tegn | |

---

## 4. Kode: hva kan overføres direkte, og hva må tilpasses

Domenet i `src/domain/` er ren TypeScript uten React, nettleser eller lagring (bare `storage.ts` og `todayIso()` berører miljøet). Nesten alle funksjoner tar `today` som parameter, så serveren kan gi fagmiljøets dato. Ingen fagmiljøspesifikke ID-er (vakt 1, LIS, overlege) brukes i motor eller UI; de finnes bare i `catalog.ts`, `seed.ts` og migreringene. Det gjør domenet godt egnet til å flyttes som én modul.

**Anbefalt grep:** behold de rene funksjonene og datamodellen tilnærmet uendret, og legg en tynn **adapter** rundt: serveren bygger en `PlannerState`-lignende lesemodell for ett fagmiljø og ett datovindu (perioden + tidshorisonten + avstandsmarginen, som `inputRange` alt beregner), kjører kommandoen eller fordelingen, og lagrer bare differansen. Da kan motoren og testene porteres med små endringer, mens lagring, tilgang og samtidighet bygges med OUSFARs mekanismer.

### 4A. Domene

| Fil(er) | Vurdering | Hva som må gjøres |
| --- | --- | --- |
| `allocation/expected.ts`, `cost.ts`, `search.ts`, `model.ts`, `proposal.ts`, `workload.ts` | **Direkte** | Flyttes som modul. Kjøres der fritaket kan leses (server), og bare tillatt resultat returneres (A-FRI-04). `proposalFingerprint` erstattes eller suppleres av serverens versjonsnummer på inndataene. Ytelse: et helt år tok ca. 4,5 s i testmiljøet (PR #15); må måles i OUSFARs serverfunksjoner og ha tidsgrense. `NEW_PLAN_CHANGE_WEIGHT` bør bli innstilling. |
| `rules.ts` (planSet, entryProblems, dayCoverage, coverageEffects, presenceOf, freeForNew, atDate, rulesForDate, peopleForDate, invariantErrors) | **Direkte** | Samme regelmotor brukes for validering på serveren og forhåndsvisning i klienten. `invariantErrors` speiles i tillegg som databasebegrensninger (unik person+dato, unik vakttype+dato for «én per dag»). |
| `move.ts` | **Direkte** | `commitMove` vurderer allerede på nytt mot gjeldende tilstand; på serveren blir det en transaksjon. |
| `dutyShare.ts` | **Direkte** | `changesPast` håndheves i tillegg i databasen (ingen endring før i dag, ingen overlapp, 0–100). |
| `commands.ts` | **Tilpasses** | Kommandoene blir serverkommandoer. `assertCan(role, …)` erstattes av fagmiljø-avgrenset tilgangssjekk fra medlemskap og lokal rolle. `newId` erstattes av databasens ID-er. `ruleImpact`, `validateRules`, `validatePerson` gjenbrukes. |
| `permissions.ts` | **Tilpasses** | Handlingene (`view`, `editCalendar`, `editPeople`, `editDutyShare`, `editRules`, `manageExemption`) og `requiredActions`/`exemptionsAdded`/`seesExemptionDetails` er gode som policytabell, men håndheves i radsikkerhet og serverfunksjoner. `outsideArchitect` blir en server-side avvisning, ikke en rolle. `resetDemo` utgår. |
| `types.ts` | **Tilpasses** | Legg til fagmiljø-ID og medlemskapsnøkkel; `Person` blir medlemskap + daterte planfelter (§7.4). `StatusGroup` er i dag fast `'office' \| 'away'` med faste etiketter, og `StatusIcon`/`StatusTone` er faste lister: må generaliseres (se §5). |
| `catalog.ts` | **Tilpasses** | Blir pilotoppsettet for OUS Klinisk farmakologi som versjonert konfigurasjon (data i databasen), ikke kode. `DEFAULT_ALLOCATION` og feltgrensene kan beholdes som generelle standarder. |
| `people.ts` (dayKind) | **Tilpasses** | Aktiv/ikke registrert hentes fra medlemskapets datoer og planfeltene i stedet for `peopleHistory`. |
| `dates.ts` | **Direkte**, med to tilpasninger | `todayIso()` bruker nettleserens klokke: erstattes av fagmiljøets tidssone (Europe/Oslo) på serveren. Norske helligdager er hardkodet og beregnet: flyttes til felles hjelper eller fagmiljøkonfigurasjon hvis andre land/kalendere blir aktuelle. |
| `privacy.ts` | **Tilpasses** | Fødselsnummerkontrollen bør bruke OUSFARs eksisterende (§3.2: «samme stille avvisning … som resten av appen»); ordlisten for helseord kan beholdes som tillegg og må også kjøres på serveren. |
| `history.ts` | **Erstattes** | Angre blir en ny, validert endring på serveren (planforslaget i #561 §3), ikke gjenoppretting av et øyeblikksbilde. Atferden A-ANG-01–04 skal bevares. |
| `storage.ts`, `validate.ts` (formkontroll av lagrede data) | **Utgår** | Erstattes av database, skjema og serverside validering. Prinsippet om at uleselige data aldri overskrives lydløst beholdes. |
| `singleStatusMigration.ts`, `dutyResetMigration.ts`, `dutyShareMigration.ts` | **Utgår** | Bare for prototypens lokale data. OUSFAR starter fra blanke ark (P7 i planen). Prinsippene (A-PER-03, A-STA-11) beholdes. |
| `seed.ts`, `src/test/fixtures.ts` | **Tilpasses** | Gjenbrukes som syntetiske fagmiljøer for tester og for systemarkitektenes forhåndsvisning (deterministisk, oppdiktede navn, `withSampleDuties`). |

### 4B. Brukergrensesnitt

Prototypens visuelle uttrykk skal **ikke** overføres som eget designsystem (planforslaget i #561 §1). Logikken bak mange av komponentene kan likevel gjenbrukes.

| Del | Vurdering | Merknad |
| --- | --- | --- |
| `components.tsx`, `styles.css`, `lucide-react`-ikoner | **Erstattes** | OUSFAR har egne komponenter og ikonregister (`src/components/ikon`). Statusikonene (skjold, penn, lyspære, kryss, fly, hus, mikroskop, lue, sol, spørsmålstegn) må finnes eller legges inn der. |
| `App.tsx` (navigasjon, demorolle, «Om prototypen») | **Erstattes** | Navigasjon og dashboard eies av Dev. Demorollevelgeren er nyttig som forbilde for **rollesimulering for systemarkitekter i et syntetisk fagmiljø** (N, Peders skjermingskrav). |
| `store.tsx` | **Erstattes** | Servertilstand, optimistisk oppdatering og samtidighet. Reglene den håndhever (midnattsregelen for vaktandel, meldinger tømmes ved rollebytte) flyttes til server og tester. |
| `view.tsx` (felles visningstilstand og preferanser) | **Tilpasses** | Preferanser og skjemaer via `useBevart` og OUSFARs mønstre (AGENTS.md). |
| `calendar/*View.tsx`, `CalendarScreen.tsx`, `shared.tsx` (`useGridNavigation`, `dayColumnClass`, `reducedMotion`) | **Tilpasses** | Byggestein for den valgte designretningen. Rutenettnavigasjonen og «I dag med fokus» kan gjenbrukes nesten direkte. |
| `CellPopover.tsx`, `bubble.ts`, `InfoTip` | **Tilpasses** | Plassering og festing bør bruke OUSFARs `tipsplassering`/`useFestbarBoble`/`Skuff` der de dekker behovet. Atferden A-BOB-01–06 og A-MRK-03–07 skal bevares. |
| `calendar/move/` (`MoveProvider`, `pointer.ts`, `MoveDialogs`) | **Direkte / tilpasses** | Pekermotoren og geometrien (`pointer.ts`, med egne tester) kan flyttes; utseendet tilpasses. |
| `pages/AllocationPage.tsx`, `allocation/ProposalView.tsx`, `WorkloadView.tsx` | **Tilpasses** | Innholdet og flyten (A-PUB-01–07, A-FKL-01–02, A-BEL-01–05) beholdes; utformes etter valgt design. |
| `pages/PeoplePage.tsx`, `admin/PersonForm.tsx`, `DutyShareEditor.tsx` | **Tilpasses** | Blir kalenderens «Medarbeidere» med OUSFAR-medlemmer automatisk koblet (Peder, Issue #572); ingen redigering av navn eller oppretting av personer. |
| `pages/RulesPage.tsx`, `StaffingEditor.tsx`, `AllocationWeightsEditor.tsx`, `RuleImpactModal.tsx` | **Tilpasses** | Avanserte valg under lokal administrasjon, skjult som standard (planforslaget i #561 §2). |
| `AboutPage.tsx`, `vaktplan-prototype.html` | **Utgår** | |

### 4C. Tester

| Tester | Vurdering | Merknad |
| --- | --- | --- |
| `allocation.test.ts` (54), `workload.test.ts` (11), `rules.test.ts` (22), `move.test.ts` (14), `dutyShare.test.ts` (20), `exemption.test.ts` (20), `guarantees.test.ts` (6), `dates.test.ts` (18), `people.test.ts` (3), `privacy.test.ts` (3), `commands.test.ts` (30), `pointer.test.ts` (6) | **Direkte** | Flyttes med domenet. OUSFAR bruker Vitest 5 (prototypen 3); forventet bare små justeringer. Fasitene i §2 skal stå som egne, navngitte tester. |
| `permissions.test.ts` (8), deler av `exemption.test.ts` og `kontroll.test.ts` | **Tilpasses** | Blir negative tilgangstester mot radsikkerhet og serverfunksjoner: andre fagmiljøer, kollega uten planleggerrolle, systemarkitekt uten tilknytning, forsøk på å gi seg selv fritak, API-svar med og uten fritak. |
| `store.test.tsx` (8) | **Tilpasses** | Midnattsregelen og rollebytte blir servertester. |
| `kontroll.test.ts` (26) | **Delvis** | Historikk-, dekning- og rolledelene beholdes; lagringsdelene utgår. |
| `storage.test.ts` (11), `singleStatusMigration.test.ts` (13), `dutyResetMigration.test.ts` (6), `seed.test.ts` (12) | **Utgår** (seed tilpasses) | Bare prototypens lokale data. |
| Nettlesertestene (16 spesifikasjoner, ca. 110 tester, desktop og Pixel 7) | **Tilpasses** | Scenarioene er regresjonsmatrisen for P3–P5; skrives om mot OUSFARs lokale testmiljø (`apneTestmiljo()`, `docs/qa-testmiljo.md`) og valgt design. `tests/e2e/helpers.ts` har fakta om eksempeldataene som kommentarer. |

---

## 5. Antakelser i prototypen som hindrer generalisering

Funnet i koden; må løses i P2 for at et annet fagmiljø skal kunne bruke kjernen uten forgrening (planforslaget i #561 §2).

1. **To faste statuskategorier.** `StatusGroup` er `'office' \| 'away'` med faste etiketter («På kontoret», «Ikke på kontoret»), og kategorien styrer både tilstedeværelse og om noe kan bemannes. Forslag: kategorier som data per fagmiljø med en egenskap «regnes som til stede».
2. **Faste ikon- og fargelister** (`StatusIcon`, `StatusTone`). Må knyttes til OUSFARs ikonregister og fargetokens.
3. **Norske helligdager hardkodet** i `dates.ts`; arbeidsdager er man–fre via `perWeekday`. Greit for piloten.
4. **Lokal klokke** (`todayIso()` uten tidssone). Serveren må bruke fagmiljøets tidssone, også for sommertid og midnattsregelen (A-ANG-04).
5. **Én samlet tilstand** (`PlannerState`) og angre med øyeblikksbilder. Må bli normaliserte tabeller, versjonerte kommandoer og angre som ny endring.
6. **Én global medarbeiderliste med øyeblikksbilder** (`peopleHistory`). Må bli medlemskap + daterte planfelter per fagmiljø.
7. **Roller som fast liste i nettleseren.** Må avledes fra medlemskap og lokal myndighet på serveren.
8. **Stabilitetsvekten 0,5** er konstant i koden, ikke innstilling.
9. **Ingen tidssone eller klokkeslett i fordelingen** (riktig etter vedtak); nattevakter eller samtidige oppgaver er bevisst utenfor (planforslaget i #561 §2).

Positivt: flere personer per oppgavetype og dag er alt støttet for statuser som ikke er «én per dag» (testet med fire referentplasser per dag), og ingen fagmiljø-ID-er brukes utenfor katalog og eksempeldata.

---

## 6. Avvik og åpne punkter mellom prototypen og integrasjonsplanen

Beslutningene står i [personal.md](personal.md) §8.12. Å1, Å2, Å3 og Å11 er avgjort (B3–B6 og B13); resten er åpne.

| Nr. | Prototypen i dag | Integrasjonsplanen / bestillingen | Status |
| --- | --- | --- | --- |
| Å1 | Alle med innsyn ser alle godkjente vakter, også fremtidige som ikke er publisert (publisering er bare en datogrense for fordelingen). | Anbefaler at kolleger ser publisert/operativ plan, og at planansvarlig redigerer kladd. | Avgjort av Peder 26.11.2026: kolleger ser bare publiserte vakter, og bare vaktplanansvarlige genererer og publiserer. Kladden må holdes riktig når kolleger endrer statuser (A-NY-08, A-NY-20) |
| Å2 | Vaktplanansvarlig redigerer medarbeiderfeltene (kategori, kvalifikasjon, aktiv). Lokal administrator utpeker ikke vaktplanansvarlige (demorolle). | Begge redigerer planfeltene; lokal administrator utpeker vaktplanansvarlige; feltene i kalenderens «Medarbeidere», ikke i administratorenes brukermeny (#572). | Avgjort av Peder 26.11.2026: lokal administrator utpeker vaktplanansvarlige, gjerne flere samtidig; alle redigerer egne statuser (A-NY-07, A-NY-17, A-NY-18) |
| Å3 | Medarbeidere opprettes og navngis i prototypen. | Medlemmer kobles automatisk; navn fra profilen; nye/ukonfigurerte vises for planansvarlig, men er ikke med i plan og fordeling før oppsettet er bekreftet; avsluttet medlemskap stopper tilgang og fremtidig planlegging. | Avgjort av Peder 26.11.2026: 1:1 mellom fagmiljøets medlemmer og kalenderen (A-NY-04) |
| Å4 | Ingen dashboardmodul. Dagsvisningen har et bemanningskort. | «Dagen i dag» øverst på dashboardet; bare publiserte/operative tildelinger, aldri uakseptert forslag; ingen status = planlagt til stede. | N |
| Å5 | Ingen varsler (utsatt i spes. §6). | Opt-in kalenderpåminnelser per oppgavetype og tid, bare egne publiserte tildelinger, konservativ låseskjermtekst; gjenbruk av OUSFARs web-push (Dev). | N |
| Å6 | Ingen «Min plan» / egne kommende vakter. | Foreslått prioritert tillegg. | N |
| Å7 | Rollebytte for alle i en demoboks. | Under utvikling bare synlig for systemarkitekter, håndhevet på serveren, med simulering av roller og bare syntetiske medarbeidere; aktivering per fagmiljø uten kodeendring. | N (Peder 26.11.2026) |
| Å8 | Statuskatalogen kan ikke redigeres. | Fortsatt ingen konfigurasjonsbygger i første leveranse; generell modell skal likevel støtte andre fagmiljøer (§5). | V/N |
| Å9 | Samtidighet finnes ikke (én nettleser). | Ingen lydløs overskriving; foreldede forslag avvises; angre som ny validert endring. | N (tekniske krav) |
| Å10 | Referent har ikke bemanningsbehov. | Referent vises på «Dagen i dag»; bare oppgaver med definert behov fordeles automatisk. | P, bekreftes |
| Å11 | Stillingskategori (LIS/overlege) i vaktplanens egen liste. OUSFAR har en egen stillingskatalog på profilkortet (`src/stillinger`). | Ikke gjett stillingskategori fra kontoer; planfeltet hører til kalenderen. Om profilens stilling kan brukes som **forslag** ved oppstart, er ikke avklart. | Avgjort av Peder 26.11.2026: 1:1 mellom stillingene i brukermenyen og kalenderen, importert automatisk (A-NY-19) |

---

## 7. Historikken i PR-ene: hva hver la til, og regresjonsvern fra kontrollene

| PR | Innhold | Viktigste kontrollfunn som nå er regler eller regresjonstester |
| --- | --- | --- |
| #1 | Designspesifikasjon, historisk HTML-skisse, fordelingsprinsippet 2:1 / 1:2 som veiledende mål. | Separate mål per vakttype, ingen motregning, ikke dobbelt trekk for fravær. |
| #3 | Delmål A: domenemodell, fire visninger, regelmotor, roller, lagring, angre. | Fravær kan aldri telle som vakt; roller gjelder også angre; historisk betydning av regler; datert medarbeidergrunnlag i alle visninger og tellinger. |
| #5 | Arbeidsmønster og stillingsandel fjernet; filtre; dra-og-slipp. | Ingen vei lagrer en foreløpig tilstand; tidsrom endres ikke stille ved flytting; udekket vakt vises ved direkte flytting. (Den eksklusive flytteøkten ble senere fjernet i #13.) |
| #6 | Delmål B: fordelingsmotor, forslag, forklaring, låsing, publisering. | Ingen endring på publiserte datoer uten tillatelse; fingeravtrykket dekker alt beregningen leser; kategori og vekt slik de gjaldt hver dag; gyldig vakt med eget tidsrom beholdes. |
| #8 | Utrulling fra `main`; regnearkene slettet; `.gitignore` stopper regneark. | Git-kloning tar med alle filer, så sensitive filer kan ikke bare holdes unna utrulling. |
| #11 | Tydelig i dag-markering, ukenummer i helår, «I dag» med fokus. | Fokus også med skjult helg og uten viste medarbeidere; `aria-current="date"`. |
| #13 | Én status per dag, statusboblen, merknad og klokkeslett, overtakelse, ny flytting. | Fravær rangeres foran vakt i migrering; eksisterende merknad kortes aldri; angre mens boblen er åpen blir ikke omgjort; statusikonet i måned åpner riktig persons boble. |
| #15 | Rettferdighet over tid, vaktbelastningsoversikt, engangsopprydding. | Etter-tallene er nøyaktig kalenderen «Godta» ville lagret nå; periode helt før i dag avvises; disjunkte tidsrom gir 0. |
| #17 | Vaktandel og vaktfritak, Ferie, nye roller. | Skjult fritak avsløres ikke gjennom tall eller utvalg; angre/gjør om over midnatt endrer ikke tidligere vaktandel; taket på utjevning er et mål, ikke en grense. |

---

## 8. Forslag til bruk i akseptmatrisen

- ID-ene over er de samme som i akseptmatrisen ([personal-akseptmatrise.md](personal-akseptmatrise.md)). Å1 … Å11 tilsvarer delvis A-NY-radene der.
- Hver PR i P2–P7 oppgir hvilke ID-er den oppfyller, og at prototypens tilsvarende tester er portet eller erstattet.
- Linjer merket N skal ikke implementeres før de er godkjent, og linjer merket P beholdes som justerbare standarder.
