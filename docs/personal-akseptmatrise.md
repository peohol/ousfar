# Akseptmatrise for personalkalenderen og vaktfordelingen

Sjekkliste for implementering (P2–P7) og produktaksept av personalkalenderen og vaktfordelingen i OUSFAR, laget 26.11.2026 fra kartleggingen av prototypen `peohol/vaktplan` på `main` = `10bc89fab8d8065140de1b41aa3721970f56b82e` (v0.11). Integrasjonsplanen, de tekniske akseptkriteriene (`K-…`) og rekkefølgen står i [personal.md](personal.md) §8. Bakgrunn, overføring av kode og tester og avvik mot integrasjonsplanen står i kartleggingen ([personal-prototypekartlegging.md](personal-prototypekartlegging.md)), som bruker de samme ID-ene.

**Kolonnene**

- **ID:** stabil. Endres aldri; utgår en rad, merkes den «utgått» i stedet for å fjernes.
- **Kilde:** `§` er `docs/personal.md` i OUSFAR, «spes.» er prototypens designspesifikasjon v0.11, `v0.N` er versjonen av spesifikasjonen der regelen kom inn, og `vaktplan#N` er PR i prototypen.
- **Vedtatt eller prototypens valg:** *Vedtatt* er Peders vedtak og må bevares. *Prototypens valg* er en startverdi eller et valg uten vedtak, som beholdes som justerbar standard med mindre Peder bestemmer noe annet. *Bestilt av Peder* står i bestillingen 26.11.2026 og må forankres i `docs/personal.md`. *Nytt forslag* krever godkjenning før det bygges.
- **I OUSFAR:** *Direkte* = prototypens domenekode og test kan overføres med små endringer. *Tilpasses* = regelen eller logikken beholdes, men koden eller visningen bygges om for OUSFAR. *Erstattes* = løses med OUSFARs egne mekanismer (server, radsikkerhet, medlemskap, komponenter). *Nytt* = finnes ikke i prototypen.
- **Prototypens tester:** `u:` enhetstester i `src/domain/`, `e:` nettlesertester i `tests/e2e/`. Testene skal portes eller erstattes av tilsvarende tester i OUSFAR, og fasitene (FAS) skal stå som egne, navngitte tester.

Alle eksempler bruker syntetiske medarbeidere.


### STA – Grunnmodell og statuser

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-STA-01 | Høyst **én status per medarbeider per dag**, uansett klokkeslett. Ingen kombinasjons- eller eksklusjonsregler. Håndheves i datamodellen og i alle veier inn (enkeltcelle, flervalg, flytting, fordeling, innlesing). | §7.2, v0.9, vaktplan#13 | Vedtatt | Direkte: regelmotoren + unik begrensning i databasen | u: rules, guarantees, kontroll · e: status |
| A-STA-02 | Høyst **én medarbeider per dag for statuser som er «én per dag»** (vakttypene). Andre statuser med bemanningsbehov kan ha flere (prototypen tillater opptil 20). | §7.2 | Vedtatt for vaktene; grensen 20 er prototypens valg | Direkte: regelmotoren + unik begrensning i databasen | u: guarantees, allocation «mange plasser samme dag» |
| A-STA-03 | **Ingen status = til stede** på ordinære arbeidsdager. Kalenderen viser planlagt tilstedeværelse, ikke registrert oppmøte. | §7.2 | Vedtatt | Direkte | u: rules |
| A-STA-04 | To kategorier: **«På kontoret»** (Vakt 1, Vakt 2, Referent, Opplæring) og **«Ikke på kontoret»** (Borte, Ferie, Hjemmekontor, Forskning, Undervisning, Avspasering, Fri, Ønske om fri). | §7.2, §6.2 | Vedtatt | Tilpasses: pilotoppsett som fagmiljøkonfigurasjon | u: rules (katalogen) |
| A-STA-05 | Hver status har ikon fra **ett felles ikonbibliotek, ingen emojier**; samme ikon i boble, kalender, forklaring og regelside. | §7.2 | Vedtatt | Erstattes: OUSFARs ikonregister | e: status |
| A-STA-06 | Statuskatalogen er **data, ikke kode**, og skal kunne variere per fagmiljø. Det bygges ikke noe administrasjonsgrensesnitt for katalogen nå. | §7.2 | Vedtatt | Tilpasses: versjonert konfigurasjon per fagmiljø i databasen | u: rules |
| A-STA-07 | Statuser på kontoret krever **arbeidsdag** (ikke helg, helligdag eller dag personen ikke er aktiv). | §7.2 | Vedtatt | Direkte | u: rules «krav til statusen», people · e: kalender, status |
| A-STA-08 | Vakt krever **kvalifikasjon for akkurat den vakttypen**. | §7.2 | Vedtatt | Direkte | u: rules · e: status |
| A-STA-09 | Hard garanti: en vakt og et bemanningsbehov må høre til «På kontoret», så **fravær aldri kan telle som dekning**, heller ikke i manipulerte regler. En status med vaktfritak kan ikke bemannes eller være én per dag. | v0.9, kontroll vaktplan#3 | Vedtatt | Direkte: + serverside validering av konfigurasjonen | u: guarantees, kontroll |
| A-STA-10 | **Ønske om fri** regnes som fravær i planleggingen, men vises annerledes enn innvilget fri (stiplet merke). | §7.2 | Vedtatt | Direkte: regelen; visningen tilpasses | u: rules · e: status |
| A-STA-11 | Utgåtte statuser kan ikke velges, men gamle registreringer står og er gyldige. | v0.9 | Prototypens valg | Direkte | u: singleStatusMigration |
| A-STA-12 | **Borte registreres uten grunn.** | §3.2, §7.2 | Vedtatt | Direkte | u: privacy |

### KAL – Kalendervisninger og navigasjon

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-KAL-01 | Fire visninger: **dag, uke (standard), måned og helår**, med felles dato, navigasjon, filtre og redigeringsmodell. En endring vises straks i alle visninger og etter omlasting. | §7.2 dag/uke/måned; helår v0.4–v0.11 | Vedtatt | Tilpasses: valgt design; felles visningstilstand gjenbrukes | e: kalender |
| A-KAL-02 | **Dag:** bemanningskort (dekning og udekkede vakter) og alle medarbeidere med status, merknad og klokkeslett direkte. | spes. §2 | Vedtatt | Tilpasses: valgt design | e: kalender, status |
| A-KAL-03 | **Uke:** medarbeidere i rader, datoer i kolonner, faste navn, klikkbare celler. | spes. §2 | Vedtatt | Tilpasses: valgt design | e: kalender |
| A-KAL-04 | **Måned:** datooversikt med vaktdekning (rød stripe ved udekket) og **alle statuser som standard**, gruppert per status. En linje med én person åpner personens boble direkte (navn eller ikon); en linje med flere personer gir medarbeidervelger. Man blir stående på måneden. | §7.2, v0.9, vaktplan#13 | Vedtatt | Tilpasses: valgt design | e: status, kontroll |
| A-KAL-05 | **Helår:** kompakt matrise over hele arbeidsåret (fortid og fremtid, historikk skjules ikke), månedsgrupper, **ISO-ukenummer** over dato og ukedag (uke delt ved månedsskifte), faste navn og overskrifter, vannrett rulling, «Gå til dato», «+n» ved flere registreringer, effektiv tegning. | spes. §2, v0.8, vaktplan#11 | Vedtatt | Tilpasses: valgt design; tegning må være effektiv | e: i-dag, kontroll, kalender |
| A-KAL-06 | Arbeidsåret starter i en konfigurerbar måned per fagmiljø (`workYearStartMonth`). | prototypen | Prototypens valg | Tilpasses: innstilling per fagmiljø | u: dates |
| A-KAL-07 | Årsskifte, helger og norske helligdager håndteres riktig (helligdager beregnes, ikke lagres). | spes. §5 A | Vedtatt | Direkte: dates.ts; helligdager som felles hjelper | u: dates, people · e: kalender |
| A-KAL-08 | Dager før en person ble registrert vises «Ikke registrert», dager etter deaktivering «Ikke aktiv», begge skravert. Rader og antall følger medarbeiderlisten **slik den gjaldt datoen**. | kontroll 3, vaktplan#3 | Vedtatt | Direkte: atDate/peopleInPeriod; datoene fra medlemskapet | u: kontroll · e: kontroll |
| A-KAL-09 | Hurtigtaster: D/U/M/H bytter visning, T = i dag, Alt+←/→ blar, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) angre/gjør om; piltaster, PageUp/PageDown, Home/End i rutenettet; Enter åpner boblen; Escape lukker og gir fokus tilbake. | tastaturflyt er krav i AGENTS.md | Prototypens valg | Tilpasses: OUSFARs hurtigtastmønster | e: tastatur-mobil, flytting |

### DAG – Dagen i dag i kalenderen

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-DAG-01 | Mørk, tykk kontur rundt dagens kolonne (uke, helår) eller felt (måned), fylt dagnummer; i helår også inneværende uke fremhevet i hele høyden og ukenummeret fylt. Farger og tykkelser som felles tokens. | v0.8, vaktplan#11 | Vedtatt | Tilpasses: OUSFARs fargetokens | e: i-dag |
| A-DAG-02 | Skjermlesere får `aria-current="date"`; ikke «i dag» i etiketten. | vaktplan#11, kontroll | Vedtatt | Direkte | e: i-dag, kalender |
| A-DAG-03 | «I dag» (knapp og T) går til dagen i alle visninger, ruller den frem og **setter fokus** på dagens celle i samme rad som sist; slår på «Vis helg» ved behov; med ingen viste medarbeidere får datoens overskrift fokus. | v0.8, vaktplan#11 | Vedtatt | Tilpasses: useGridNavigation gjenbrukes | e: i-dag |

### BOB – Statusboblen og direkte redigering

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-BOB-01 | **Samme boble i alle visninger**, snakkeboble med pil mot elementet som åpnet den; elementet markeres. Ingen overskrift (navn, dato, dagtype), ingen regelversjon. Bunnark på små skjermer. | §7.2, v0.9 | Vedtatt | Tilpasses: valgt design; OUSFARs boble/skuff | e: status, tastatur-mobil |
| A-BOB-02 | Midtstilt verktøylinje øverst: flytt, merknad, slett, lås (vakter som fordeles), administrativt vaktfritak (bare «Borte» og bare med myndighet). | v0.9, v0.11 | Vedtatt | Tilpasses: valgt design | e: status, roller |
| A-BOB-03 | Valgt status har bakgrunn og hake; de andre er dempet, men klikkbare. **Et valg lagres med en gang**, uten lagreknapp; en ny status erstatter den gamle. | §7.2 | Vedtatt | Tilpasses: serverkommando med straks synlig resultat | u: commands «setStatus» · e: status |
| A-BOB-04 | Status fjernes med slett, med **nytt klikk på valgt status** eller med **dobbeltklikk på statusen direkte i kalenderen** (alle visninger). Alt kan angres. Hvem som kan fjerne hva, følger A-NY-17 og A-NY-18. | §7.2, vaktplan#13 | Vedtatt | Tilpasses: valgt design | e: status, tastatur-mobil |
| A-BOB-05 | Borte (eller annen status) på en som har vakt **erstatter vakten** og sier at vakten blir udekket; ingen bekreftelsesdialog. | §7.2 fasit, vaktplan#13 | Vedtatt | Direkte: coverageEffects | u: commands, rules «dagsdekning» · e: status |
| A-BOB-06 | Tastatur: Enter åpner, Tab mellom valgene, Mellomrom/Enter velger og fjerner, Escape lukker med fokus tilbake. | spes. §2 | Vedtatt | Tilpasses | e: tastatur-mobil |

### MRK – Merknad og klokkeslett

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-MRK-01 | Valgfri merknad på **alle statuser**, høyst 120 tegn, bare ikke-sensitiv planleggingsinformasjon. | §7.2, §3.2 | Vedtatt; 120 tegn er prototypens valg | Direkte: + kontroll på serveren | u: privacy · e: status, kontroll |
| A-MRK-02 | Tekst som ligner fødselsnummer, avvises; en ordliste avviser typiske helse-/fraværsord. Ordlisten er et ekstra vern, ikke en garanti. | §3.2 | Vedtatt for fødselsnummer; ordlisten er prototypens valg | Tilpasses: OUSFARs fødselsnummerkontroll + ordlisten, også på serveren | u: privacy · e: kontroll |
| A-MRK-03 | Dagsvisningen viser merknad og klokkeslett ved statusen; uke, måned og helår viser merknadsikon og en **infoboble** (mus, tastatur og berøring) over statusikonet, navnet, merknadsikonet og helårsfeltet. | §7.2 | Vedtatt | Tilpasses: OUSFARs tooltip | e: status, tastatur-mobil |
| A-MRK-04 | I måned: **én felles infoboble for hele linjen** (ikon, navn, merknadsikon og mellomrommet), midtstilt over feltet de danner; med flere personer også én per navn. | Peders tilbakemelding, vaktplan#13 | Vedtatt | Tilpasses: OUSFARs tooltip | e: status |
| A-MRK-05 | Klokkeslett: «Hele dagen» avkrysset som standard, ellers Fra/Til. Ugyldig tidsrom kan ikke lagres. **Klokkeslett påvirker verken tilstedeværelse, dekning eller fordeling.** | §7.2 | Vedtatt | Direkte | u: rules, commands · e: status |
| A-MRK-06 | Merknad og klokkeslett **beholdes ved statusbytte** og følger statusen ved flytting. | §7.2 | Vedtatt | Direkte | u: commands, move · e: flytting |
| A-MRK-07 | Merknad/klokkeslett lagres bare når brukeren har endret dem; Angre mens boblen er åpen blir ikke omgjort når boblen lukkes. | kontroll vaktplan#13 | Vedtatt | Tilpasses | e: status |

### OVT – Vaktovertakelse

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-OVT-01 | Velges en vakt som en annen har samme dag: «Vakt 1 er allerede tildelt [navn]. Vil du overta vakten?» med Avbryt og Overta vakten. Statusen mottakeren mister, og hva som blir udekket, vises først. | §7.2 | Vedtatt | Tilpasses: planSet direkte; dialogen tilpasses | u: rules «vakter og overtakelse» · e: status |
| A-OVT-02 | Overtakelsen er **én atomisk endring** som angres med én Angre. Kvalifikasjonskravene gjelder. | §7.2 | Vedtatt | Tilpasses: serverkommando i én transaksjon | u: commands «vaktovertakelse» |
| A-OVT-03 | Fasit: Jonas Vik Vakt 1 og Maja Holte Vakt 2 tirsdag; Maja overtar Vakt 1 → Maja Vakt 1, Jonas ingen status, Vakt 2 udekket. Borte for Jonas i stedet → Borte erstatter vakten, Vakt 1 udekket. | §7.2 | Vedtatt | Direkte: testen portes | u: commands |

### FLY – Flytting (dra-og-slipp)

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FLY-01 | Én felles mekanisme i alle fire visninger flytter én status mellom medarbeidere og datoer. Klikk uten dra åpner boblen. | §7.2, v0.6–v0.9 | Vedtatt | Tilpasses: pekermotoren gjenbrukes; utseendet tilpasses | u: move · e: flytting |
| A-FLY-02 | Tom målcelle: flyttes direkte. Opptatt: **«Bytt statusene»**, **«Flytt og erstatt eksisterende status»** og **«Avbryt»**, bare alternativer som gir gyldig plan, hver med vakter som blir udekket. | §7.2 | Vedtatt | Direkte: move.ts | u: move · e: flytting |
| A-FLY-03 | En flytting **tar aldri over en vakt** fra en tredje person; avvises med årsak også når målcellen er tom. Overtakelse bare via boblen. | §7.2 | Vedtatt | Direkte: move.ts | u: move |
| A-FLY-04 | Regler og kvalifikasjoner vurderes slik de gjelder **måldatoen**; valget vurderes på nytt mot gjeldende kalender rett før lagring, så et foreldet valg aldri overskriver nyere endringer. | spes. §2 | Vedtatt | Tilpasses: move.ts + serverens versjonskontroll | u: move |
| A-FLY-05 | Merknad, klokkeslett og lås følger statusen; **administrativt vaktfritak følger aldri med**. Én Angre angrer hele flyttingen eller byttet. | §7.2, §6.2 | Vedtatt | Direkte: move.ts | u: move, exemption · e: flytting |
| A-FLY-06 | Direkte flytting viser vakter som blir udekket, ved slippet og i meldingen med Angre. | spes. §2 | Vedtatt | Tilpasses | e: flytting |
| A-FLY-07 | Måned: slipp på en dag gir medarbeidervelger med hvem som kan ta statusen. | spes. §2 | Vedtatt | Tilpasses | e: flytting |
| A-FLY-08 | Tastaturalternativ («Flytt» i boblen, piltaster og Enter, også i valgboblen); berøring med langt trykk uten å ødelegge rulling; automatisk rulling nær kanten (også vannrett i helår); presist slipp under rulling; Escape avbryter. Hvem som kan flytte hva, følger A-NY-17 og A-NY-18. | spes. §2 | Vedtatt | Tilpasses | e: flytting, tastatur-mobil |
| A-FLY-09 | Utseende: løftet kort med halvgjennomsiktig bakgrunn, retningsstyrt presisjonsmarkør med spissen i pekeren, kortet henger etter; mål markert med ramme, symbol og tekst (ikke bare farge); redusert bevegelse respekteres. Verdiene er justerbare. | spes. §2 | Vedtatt for prinsippene; verdiene er prototypens valg | Tilpasses: pointer.ts direkte; utseendet tilpasses | u: pointer · e: flytting |

### FLT – Flervalg, filtre og visningsvalg

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FLT-01 | Flervalg («Velg flere», Shift/Ctrl+klikk) med **«Sett status»** og **«Fjern status»**, forhåndsvisning av statuser som forsvinner og vakter som blir udekket; én angre. En kollega bruker det på egne statuser (A-NY-17). | spes. §2, v0.9 | Vedtatt | Tilpasses: applyToCells som serverkommando | u: commands «flervalg» · e: flervalg |
| A-FLT-02 | «Fremhev»: avkrysning av flere statuser samtidig, «Nullstill» for ingen. | spes. §2, vaktplan#5 | Vedtatt | Tilpasses | e: filtre |
| A-FLT-03 | «Vis medarbeidere»: hvem som vises, «Vis alle»/«Skjul alle», **valget huskes**. Skjulte medarbeidere teller fortsatt i vaktdekningen. | spes. §2, vaktplan#5 | Vedtatt | Tilpasses: useBevart | e: filtre |
| A-FLT-04 | «Vis helg» og filter på stillingskategori; valgt visning huskes. | prototypen | Prototypens valg | Tilpasses: useBevart | e: filtre |

### ANG – Angre og gjør om

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-ANG-01 | Alle endringer kan angres og gjøres om (knapp med navn på endringen, Ctrl+Z, Ctrl+Y), også fra melding etter lagring. | §7.2 | Vedtatt | Erstattes: angre som ny validert endring på serveren | e: status, flytting, vaktfordeling |
| A-ANG-02 | Sammensatte endringer (overtakelse, flytting/bytte, flervalg, godtatt forslag) er **én** angre-oppføring. | §7.2, spes. §4 | Vedtatt | Erstattes: angre som ny validert endring på serveren | u: commands, move, allocation |
| A-ANG-03 | Angre og gjør om krever **samme rettighet** som endringen de gjelder, også fra hurtigtast og melding. | kontroll vaktplan#3, §6.2 for fritak | Vedtatt | Erstattes: tilgangskontroll på serveren | u: permissions, exemption · e: roller |
| A-ANG-04 | Angre/gjør om kan **ikke endre vaktandel for en dag før datoen det utføres** (også når siden står åpen over midnatt). | §6.2 | Vedtatt | Erstattes: serverregel + databasebegrensning | u: dutyShare, store.test |
| A-ANG-05 | Prototypen holder 60 steg per nettleser. | prototypen | Prototypens valg (utgår) | Erstattes: utgår |  |

### MED – Medarbeidere og gyldighet over tid

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-MED-01 | Per medarbeider: stilling (hentet fra brukermenyen, A-NY-19), kvalifikasjon per vakttype og vaktandel. Hvem som er med, følger medlemskapet i fagmiljøet (A-NY-04). | spes. §2, §7.4, Peder 26.11.2026 (prosjekttråden) | Vedtatt (endret av Peder 26.11.2026) | Erstattes for stilling og medlemskap; tilpasses for kvalifikasjon og vaktandel | u: people, commands |
| A-MED-02 | **Ingen arbeidsmønster eller stillingsandel.** Alle aktive regnes som til stede på hverdager som ikke er helligdager; fravær, også ved deltid, registreres i kalenderen. | §7.2, vaktplan#5 | Vedtatt | Direkte | u: people |
| A-MED-03 | Endringer i medarbeidere og regler **gjelder fra dagen de lagres**; tidligere dager vurderes etter det som gjaldt da (`atDate`), så historikk og tidligere vaktdekning aldri skrives om. | §7.4, kontroll vaktplan#3 | Vedtatt | Tilpasses: gyldighetsdato i tabellene | u: kontroll, rules |
| A-MED-04 | En medarbeider lagt til i dag kan ikke få registreringer før i dag. Deaktivering i dag påvirker ikke tidligere vakter. | kontroll vaktplan#3 | Vedtatt | Tilpasses: medlemskapets datoer | u: kontroll |
| A-MED-05 | Navn kan ikke inneholde tallrekker (vern mot fødselsnummer). | prototypen | Prototypens valg | Erstattes: navn fra profilen | u: privacy |

### REG – Regler, bemanningsbehov og regelversjoner

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-REG-01 | **Bare statuser eksplisitt konfigurert som bemanningsoppgave fordeles automatisk.** Bemanningsbehov per ukedag, med valg for helligdager. | spes. §4 | Vedtatt | Direkte | u: commands «regelendringer», allocation |
| A-REG-02 | Første fagmiljø: **én Vakt 1 og én Vakt 2 per vanlig arbeidsdag** (man–fre, ikke helligdager). Referent, Opplæring o.l. er manuelle statuser. | spes. §4 | Vedtatt; Referent som manuell status er prototypens valg | Tilpasses: pilotkonfigurasjon | u: seed |
| A-REG-03 | Rollevekt per stillingskategori og belastning ligger på bemanningsbehovet (konfigurasjon), **ikke i motoren**. Ingen hardkodet LIS/overlege. | spes. §4 | Vedtatt | Direkte | u: allocation «rollevektene er konfigurasjon» |
| A-REG-04 | Regelendringer gjelder fra lagringsdagen, viser **virkning før lagring** (endret dekning, tilstedeværelse, registreringer som blir gyldige/ugyldige, minst 365 dager frem) og **omskriver aldri** lagrede registreringer, historikk eller publisert plan. | spes. §3 | Vedtatt | Direkte: ruleImpact | u: commands, kontroll · e: regler |
| A-REG-05 | Alle regelversjoner beholdes, også flere samme dag; versjonsnummer gjenbrukes aldri, heller ikke etter angre. | intern teknikk, kontroll vaktplan#3 | Prototypens valg | Tilpasses: versjonert konfigurasjon i databasen | u: kontroll |
| A-REG-06 | Statuskatalogen vises skrivebeskyttet med kolonnen «Vaktfritak»; lokal administrator endrer bemanningsbehov og vektene i fordelingen. | §7.2, v0.11 | Vedtatt | Tilpasses: avanserte valg, skjult som standard | e: regler |

### VAN – Vaktandel

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-VAN-01 | Vaktandel er **individuell, relativ vaktbelastning, standard 100 %, ikke stillingsprosent**, lagres uten begrunnelse. | §6.2, §3.2 | Vedtatt | Direkte | u: dutyShare |
| A-VAN-02 | Ordinær vaktandel 0–100 % (hele tall) fra en dato på ubestemt tid, og midlertidige perioder (fra og til, begge med) **uten overlapp**; etter en periode gjelder den ordinære. | §6.2 | Vedtatt | Direkte: + databasebegrensninger (0–100, ingen overlapp) | u: dutyShare · e: vaktandel |
| A-VAN-03 | Tidligere, gjeldende og fremtidige verdier vises. **Endringer bare fra i dag**; en pågående periode som fjernes, avsluttes i går; en avsluttet periode kan ikke fjernes. | §6.2 | Vedtatt | Direkte: + ingen endring før i dag i databasen | u: dutyShare · e: vaktandel |
| A-VAN-04 | **0 % utelukker automatisk tildeling**; manuell tildeling er fortsatt mulig. Årsaken vises i «Vis vurdering». | §6.2 | Vedtatt | Direkte | u: allocation |

### FRI – Vaktfritak og skjerming

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FRI-01 | Vaktfritak er en egenskap ved statusen i katalogen (alltid / administrativt / aldri), ikke hardkodet. **Ferie og Opplæring alltid; Borte bare med administrativt fritak.** | §6.2 | Vedtatt | Tilpasses: statusegenskap i fagmiljøkonfigurasjonen | u: exemption, allocation «vaktfritak per status» |
| A-FRI-02 | Administrativt vaktfritak er bare **ja/nei uten grunn**; gis og fjernes av lokal administrator og systemarkitekt med lokal myndighet, også på egne registreringer. | §6.2, §3.2 | Vedtatt | Tilpasses: myndighet fra lokal rolle på serveren | u: exemption · e: roller |
| A-FRI-03 | Fritaket **kan ikke gis indirekte**: følger aldri flytting, bytte, kopiering eller flervalg; en ny registrering får det aldri; angre/gjør om som gir eller fjerner det krever myndighet. Sletting eller erstatning av statusen er en vanlig kalenderendring. | §6.2, vaktplan#17 | Vedtatt; siste setning er prototypens valg | Direkte: + kontroll på serveren | u: exemption, move |
| A-FRI-04 | **Lesemodell:** uten fritaksmyndighet vises bare «Borte», også i historikk og API-svar. Forventet antall, avvik, avviksdiagram, største avvik og tallene i vurderingen av hver kandidat vises bare med myndighet. Utvalget av medarbeidere i oversikter avhenger ikke av fritak. Tall som vises, er aldri bevisst feil. | §6.2, kontroll vaktplan#17 | Vedtatt | Erstattes: serverstyrt lesemodell | u: exemption «skjermet vaktfritak i lesemodellen» · e: vaktbelastning, roller |
| A-FRI-05 | **Samme kalender med og uten fritak gir likt svar** for roller uten myndighet (negativ test). Fasit: to likt stilte, én vakt 1, A Borte, B vakten: ½ og ½ uten fritak, 0 og 1 med. Selve planresultatet i et forslag kan avhenge av fritaket; alt annet i forslaget er likt (personal.md §8.4, K-TIL-7). | §6.2 | Vedtatt | Tilpasses: negativ test mot API-svar | u: exemption |
| A-FRI-06 | Meldinger og varsler om fritak går bare til dem med myndighet; meldinger fra forrige rolle fjernes ved rollebytte. | §6.2 | Vedtatt | Tilpasses: varsler og meldinger fra serveren | u: store.test · e: roller |

### FOR – Vaktfordeling: motor

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FOR-01 | **Automatisk vaktfordeling er et forslag**: forståelig, etterprøvbart, manuelt justerbart, tydelig skilt fra godkjent og publisert plan. | §4 | Vedtatt | Direkte | u: allocation «forslag, godkjenning og forklaring» |
| A-FOR-02 | Harde krav: best mulig dekning, én status per dag (bare den **uten status** kan få ny vakt), kvalifikasjon, låser, vaktandel over 0 %. Ved umulig dekning vises udekkede plasser med årsak, gruppert; andre harde krav brytes aldri. | §6.1, §7.2, spes. §4 | Vedtatt | Direkte | u: allocation «harde krav og dekning», «dekningen er like høy som et uavhengig søk» |
| A-FOR-03 | Prioritet: (1) harde krav og dekning, (2) **historisk utjevning høy vekt**, (3) avstand og jevn belastning høy vekt, (4) rettferdighet i perioden lavere, (5) ukedagsvariasjon lavere. Historisk utjevning og periode har **hver sin vekt**. | §6.1 | Vedtatt | Direkte | u: allocation «rettferdighet over tid» |
| A-FOR-04 | **Vakt 1 og vakt 2 utjevnes hver for seg**; ingen samlet kvote, ingen motregning. Overleger færre vakt 1, ikke nødvendigvis færre totalt. Motsatte stillingsvekter for vakt 1 og vakt 2. | §7.2, §6.1 | Vedtatt | Direkte | u: allocation «fasit: rollevekter» |
| A-FOR-05 | **Forventet antall** per medarbeider, vakttype og dato: stillingsvekt × vaktandel × fritaksfaktor, blant aktive og kvalifiserte, fordelt forholdsmessig dag for dag, slik reglene gjaldt hver dag. **Tilgjengelighet avgjør bare plassering.** Én felles beregning for motor og oversikt. | §6.2 | Vedtatt | Direkte: expected.ts, kjøres på serveren | u: allocation «vaktandel», workload |
| A-FOR-06 | Bakover teller bare **vakter som faktisk er registrert**; en dag uten registrert vakt gir ingen forventning, så manglende historikk gir ingen kunstig vaktgjeld (også ved første gangs bruk). Forventning først fra dagen personen ble aktiv. | §6.1 | Vedtatt | Direkte | u: allocation «uten historikk», «manglende registreringer» |
| A-FOR-07 | Tidshorisont for historisk utjevning kan stilles; **standard 365 dager** bakover fra periodens slutt (28–730). | §6.1 | Vedtatt for standard 365; grensene er prototypens valg | Direkte | u: allocation «tidshorisonten er konfigurerbar» |
| A-FOR-08 | Utjevning gir ikke urimelig tett plan: målet for den som tar igjen, er høyst en andel over rettferdig andel i perioden (**foreløpig standard 50 %**, justerbar, ikke arbeidstidsgrense); den som har hatt for mange, kan gå ned til null, aldri under. **Grensen begrenser ønsket kompensasjon, ikke faktisk antall**; dekning går foran, og planen viser overskridelsen. | §6.1 | Vedtatt (foreløpig standard 50 %) | Direkte | u: allocation «taket begrenser målet …» · e: vaktfordeling |
| A-FOR-09 | Gyldig vaktfritak gir ingen senere kompensasjon; skjevhet fra vanlig redusert tilgjengelighet (f.eks. mye forskning) jevnes ut senere. | §6.2 | Vedtatt | Direkte | u: allocation «eksempel 3» |
| A-FOR-10 | Vakt to hverdager på rad er **lov, men unngås** (mykt mål via avstand), ingen fast minsteavstand. Dagvakter, hviletid ikke aktuelt. | Peder 25.11.2026, spes. v0.7 | Vedtatt | Direkte | u: allocation «ved like gode alternativer» |
| A-FOR-11 | Foretrekk **ulik stillingskategori** på vaktene samme dag; spre vakter i faktiske kalenderdager også over helger og periodegrenser; straff klumping på tvers av vakttyper; variasjon i ukedager (særlig vakt 1). | spes. §4 | Vedtatt | Direkte | u: allocation «ukedagene varierer», «ingen korttidsklumping» |
| A-FOR-12 | Vakt 1 er mer belastende enn vakt 2 (større betydning i spredning), uten å erstatte separate fordelingsmål. Ingen bestemt faktor vedtatt. | spes. §4 | Vedtatt for prinsippet; faktoren 1,5 er prototypens valg | Direkte |  |
| A-FOR-13 | Etterprøvbar matematisk metode, **ikke språkmodell** som motor; deterministisk; påstår ikke global optimalitet. Dag-for-dag-søk (best mulig dekning og færrest endringer) + lokalt søk (flytt én / bytt to innen kort vindu). Begrenset søk sier fra hvor mange dager det gjelder. | spes. §4 | Vedtatt for prinsippene; metoden er prototypens valg | Direkte: ytelse og tidsgrense måles på serveren | u: allocation «søkets grenser og trekk» |
| A-FOR-14 | **Oppdater vaktplan**: beholder fortid, låste, manuelle og gyldige tildelinger; fyller hull med færrest mulige endringer; ingen endringer når planen alt er gyldig; én ugyldig vakt med ledig erstatter endrer bare den plassen. | §6.1, spes. §4 | Vedtatt | Direkte | u: allocation «oppdatering av eksisterende plan» · e: vaktfordeling |
| A-FOR-15 | **Lag ny vaktplan**: omfordeler perioden med vekt på rettferdighet; ingen endring utenfor perioden; litt stabilitet mellom ellers like planer (0,5 per utbyttet gyldig tildeling). | spes. §4 | Vedtatt for modusen; 0,5 er prototypens valg | Direkte | u: allocation |
| A-FOR-16 | **Dager før i dag endres aldri**; en periode helt før i dag avvises i skjemaet med årsak. | spes. §4, Peders prøving vaktplan#15 | Vedtatt | Direkte | u: allocation · e: vaktfordeling |
| A-FOR-17 | En eksisterende vakt beholdes når den er gyldig etter vurderingen av eksisterende registreringer (lagret tid, også etter endret standardtid eller deaktivert status); nye vakter vurderes som nye registreringer. | kontroll vaktplan#6 | Vedtatt | Direkte | u: allocation «en gyldig vakt med fast tid beholdes …» |
| A-FOR-18 | Vaktbytte endrer ikke andre vakter; faktisk utført vakt teller for riktig person. | spes. §4 | Vedtatt | Direkte | u: allocation «et vaktbytte …» |
| A-FOR-19 | Startdata **uten vakter**: fordelingen kan startes fra blanke ark; ingen konstruert vaktgjeld. | §6.1, v0.10 | Vedtatt | Tilpasses: OUSFAR starter fra blanke ark | u: seed |

### PUB – Forslag, godkjenning, låsing og publisering

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-PUB-01 | **Forslag, godkjenning og publisering er atskilte tilstander.** Et forslag lagrer ingenting. «Godta forslaget» lagrer det som én endring (én angre). Publisering er et eget steg. | §4, spes. §4 | Vedtatt | Tilpasses: proposal.ts som serverkommandoer | u: allocation · e: vaktfordeling |
| A-PUB-02 | Forslaget viser **før/etter per endring med årsak**, antall endringer, udekkede plasser med årsak gruppert, og merknader; forkast eller godta. | spes. §4 | Vedtatt | Tilpasses: valgt design | e: vaktfordeling |
| A-PUB-03 | **Foreldet forslag avvises**: når noe beregningen bygger på er endret (regler, medarbeidere med historikk, publisering, registreringer fra start av tidshorisonten til litt etter perioden). | spes. §4, kontroll vaktplan#6 | Vedtatt | Tilpasses: versjon på inndataene i databasen | u: allocation «et foreldet forslag avvises» · e: vaktfordeling |
| A-PUB-04 | **Låst vakt** (manuell avtale, hengelås i boblen) endres aldri av fordelingen. | spes. §4 | Vedtatt | Direkte | u: allocation · e: vaktfordeling |
| A-PUB-05 | Publisering er en dato **«publisert til og med»**. Uten tillatelse endrer fordelingen **ingenting** på publiserte datoer, heller ikke ledige plasser (de telles og nevnes). | spes. §4, kontroll vaktplan#6 | Vedtatt | Direkte | u: allocation «ledige plasser på publiserte datoer» |
| A-PUB-06 | Med avkrysningen **«Tillat endringer i publisert vaktplan»** (hjelpetekst med datoen) er endringene der merket i forslaget og **publisert straks forslaget godtas**. | v0.10, vaktplan#15 | Vedtatt | Tilpasses: valgt design | e: vaktfordeling |
| A-PUB-07 | Forhåndsvisningen av oversikten etter godkjenning er **nøyaktig kalenderen «Godta» ville lagret nå**, også etter angre utenfor forslaget. | kontroll vaktplan#15 | Vedtatt | Direkte: previewAcceptance | u: workload · e: vaktbelastning |
| A-PUB-08 | Publisering og tilbaketrekking krever kalenderrett. | prototypen | Prototypens valg | Tilpasses: tilgang på serveren | e: vaktfordeling |

### FKL – Forklaring

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FKL-01 | «Vis vurdering» for en plass viser hver medarbeider som **valgt**, **mulig** (hvor mye dårligere planen blir, per ledd), **opptatt** eller **ikke mulig** (regelmotorens årsak). | §4, spes. §4 | Vedtatt | Direkte: explainSlot; visningen tilpasses | u: allocation «forklaringen viser hvorfor» · e: vaktfordeling |
| A-FKL-02 | Uten fritaksmyndighet: «Mulig» uten tall og uten rekkefølge etter tall. | §6.2 | Vedtatt | Erstattes: serverstyrt lesemodell | u: exemption · e: roller |

### BEL – Oversikt over vaktbelastning

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-BEL-01 | Også uten forslag, oppdateres når kalenderen endres. Velg vakttype og tidsrom (hurtigvalg 91 og 365 dager, eller selvvalgt, høyst 731 dager), med tydelige datogrenser. | §6.1 | Vedtatt for oversikten; hurtigvalg og grense er prototypens valg | Tilpasses: valgt design | u: workload · e: vaktbelastning |
| A-BEL-02 | Per medarbeider: vaktandel (tall eller spenn, tidslinje som hjelpetekst), **ledige dager** (dager med vakt der personen var ledig, av dagene vedkommende kunne hatt vakten), antall, forventet, avvik. | §6.2 | Vedtatt | Direkte: workload.ts | u: workload · e: vaktbelastning |
| A-BEL-03 | Med forslag også: antall i foreslått plan, samlet etter godkjenning, samlet forventet og avvik etter, **over nøyaktig samme tidsrom**. En vakt som flyttes, **telles én gang**. | §6.1 | Vedtatt | Direkte: workload.ts | u: allocation «omfordeling av eksisterende vakter …» (17/13 før, 15/15 etter) |
| A-BEL-04 | Liggende stolpediagram for avvik før/etter, null i midten, for få blått til venstre og for mange rødt til høyre, tall ved siden av; fargeparet kontrollert for fargesvakt syn og kontrast; skjermlesertekst per rad. | v0.10 | Prototypens valg | Tilpasses: valgt design | e: vaktbelastning |
| A-BEL-05 | Forventet, avvik og diagram bare for roller med fritaksmyndighet (A-FRI-04). | §6.2 | Vedtatt | Erstattes: serverstyrt lesemodell | e: vaktbelastning |

### TIL – Roller og tilgang

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-TIL-01 | Tre atskilte nivåer: **kollegers innsyn**, **vaktplanansvarliges redigering**, **administrativ myndighet**. | §3.3 | Vedtatt | Erstattes: medlemskap, lokale roller og radsikkerhet | u: permissions |
| A-TIL-02 | Roller: **Kollega** ser kalenderen og redigerer egne statuser (A-NY-17); **Vaktplanansvarlig** (én eller flere, utpekt av lokal administrator) tildeler vakter, redigerer kvalifikasjoner og vaktandel, lager og godtar forslag, låser og publiserer; **Lokal administrator** i tillegg regler og administrativt vaktfritak (gjelder også systemarkitekt med lokal myndighet); **Systemarkitekt uten lokal myndighet: ingenting**. | §6.2, §3.3, Peder 26.11.2026 (prosjekttråden) | Vedtatt for vaktandel, fritak, kollegers egne statuser og vaktplanansvarlige; resten er prototypens valg og vedtas etter §3.3 | Erstattes: medlemskap, lokale roller og radsikkerhet | u: permissions, exemption · e: roller |
| A-TIL-03 | Vaktplanansvarlig er en **egen rolle**, uavhengig av redaktørrollene. | §3.3 | Vedtatt | Erstattes: egen lokal rolle |  |
| A-TIL-04 | Kommandoene avviser handlinger rollen ikke har lov til (ikke bare skjulte knapper); i OUSFAR **på serversiden**, avgrenset til eget fagmiljø, med negative tester. | §3.3 | Vedtatt | Erstattes: radsikkerhet og serverfunksjoner | u: permissions (demonstrert) |

### PER – Personvern

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-PER-01 | Bare syntetiske medarbeidere i utvikling, tester, skjermbilder og logger. | §3.1 | Vedtatt | Tilpasses: syntetiske fagmiljøer fra seed.ts | u: seed |
| A-PER-02 | Bare planleggingsrelevant status og tid; aldri fraværsgrunn, diagnose eller sensitiv fritekst. | §3.2 | Vedtatt | Direkte | u: privacy |
| A-PER-03 | Eldre data migreres **uten stille tap** (prinsippet: det viktigste beholdes, resten arkiveres og meldes). | §7.2 | Vedtatt for prototypen; reell migrering krever egen beslutning | Erstattes: ikke aktuelt; ingen import | u: singleStatusMigration |

### FAS – Uavhengige fasiter

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FAS-01 | To LIS og to overleger, 12 plasser av hver vakttype: 4/4/2/2 vakt 1, omvendt for vakt 2. | spes. §5 B | Vedtatt | Direkte: testen portes | «to like LIS og to like overleger …» |
| A-FAS-02 | A 12 og B 8 tidligere (forventet 10/10), 10 nye dager → **3 og 7**, 15/15 samlet. 11/9 → 4/6. Ingen historikk → 5/5. | §6.1 | Vedtatt | Direkte: testen portes | «eksempelet: 12 og 8 …» |
| A-FAS-03 | Vaktandel A/B/C 100/60/100 %, ledige dager 100/60/60 %, 52 vakter → **20/12/20** (ingen dobbel reduksjon; andre oppgaver reduserer ikke). | §6.2 eks. 1 | Vedtatt | Direkte: testen portes | «52 vakter gir 20, 12 og 20 …» |
| A-FAS-04 | To like, 10 vakter, A ferie 4 dager → **3 og 7** (likt for opplæring og innvilget fritak). | §6.2 eks. 2 | Vedtatt | Direkte: testen portes | «vaktfritak per status …» |
| A-FAS-05 | Som A-FAS-04, men forskning → **5 og 5** forventet; skjevhet synlig og utjevnes senere. | §6.2 eks. 3 | Vedtatt | Direkte: testen portes | «eksempel 3 …» |
| A-FAS-06 | To like, ti vakter, den ene opptatt alle dager uten fritak → forventet 5/5, faktisk 10/0, ingen udekket, overskridelsen vises. | §6.1 | Vedtatt | Direkte: testen portes | «taket begrenser målet …» |
| A-FAS-07 | Skjermingen: A Borte, B vakt, én dag → ½/½ uten fritak, 0/1 med; likt svar for roller uten myndighet. | §6.2 | Vedtatt | Direkte: testen portes | «skjermet vaktfritak i lesemodellen» |
| A-FAS-08 | Omfordeling uten dobbelttelling: 17/13 før, 15/15 etter, sum 30. | §6.1 | Vedtatt | Direkte: testen portes | «omfordeling av eksisterende vakter …» |
| A-FAS-09 | Kategoribytte og regelendring i historikken: fasit 22 og 24 andeler, 12 og 14. | kontroll vaktplan#6 | Prototypens valg (regresjonsfasit fra kontroll) | Direkte: testen portes | «kategoribytte …», «regelendring …» |
| A-FAS-10 | Overtakelse Jonas/Maja (A-OVT-03). | §7.2 | Vedtatt | Direkte: testen portes | `commands.test.ts` |
| A-FAS-11 | Dekningen i en liten instans sammenlignes med et **uavhengig, uttømmende søk** som ikke bruker motoren. | spes. §5 B | Vedtatt | Direkte: testen portes | «dekningen er like høy som et uavhengig søk» |

### NY – Nye krav i integrasjonen (finnes ikke i prototypen)

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-NY-01 | Personalfunksjonene er under utvikling **bare tilgjengelige for systemarkitekter**: andre ser ingen kalender, meny, dashboardmodul, varselinnstilling eller andre spor; håndhevet på serveren; gjelder også etter sammenslåing og publisering. | Peders bestilling 26.11.2026 | Bestilt av Peder | Nytt | — |
| A-NY-02 | Aktivering for ordinære brukere kan gjøres **separat per fagmiljø, uten kodeendring**, etter produktgodkjenning og personvernavklaring (§3.4). | Peders bestilling 26.11.2026, planforslaget i #561 §6 P7 | Bestilt av Peder | Nytt | — |
| A-NY-03 | Systemarkitekter kan prøve hele funksjonaliteten med **syntetiske medarbeidere** og **simulere roller**; simuleringen kan bare redusere rettigheter, og rollen gir ikke i seg selv tilgang til reelle personalopplysninger. | Peders bestilling 26.11.2026, §3.3 | Bestilt av Peder | Nytt (prototypens demorolle er forbilde) | e: roller |
| A-NY-04 | **1:1 mellom fagmiljøet og kalenderen** (ordinær drift; et testmiljø har bare syntetiske medarbeidere, personal.md §8.3)**:** alle aktive medlemmer av fagmiljøet vises i kalenderen, og bare de, med navn fra profilen. Kalenderen er en integrert del av appen: ingen egen registrering av personer eller stillinger. Om en medarbeider kan få vakt, styres av kvalifikasjonene i kalenderen (ingen kvalifikasjon = ingen vakt). | Peder 26.11.2026 (prosjekttråden), #572 | Vedtatt av Peder 26.11.2026 | Erstattes: fagmiljøets medlemskap (Dev) | — |
| A-NY-05 | **Avsluttet eller sperret medlemskap** stopper tilgang, varsler og fremtidig planlegging; nødvendig datert historikk beholdes innen vedtatt oppbevaringstid. | planforslaget i #561 §3, §7.4 | Nytt forslag | Nytt | — |
| A-NY-06 | Planleggingsspesifikke innstillinger (kvalifikasjoner, vaktandel med perioder) i **kalenderens eget grensesnitt**, ikke i administratorenes brukermeny. Stilling og medlemskap hentes fra brukermenyen og fagmiljøet og redigeres ikke i kalenderen. | Peders bestilling 26.11.2026, Peder 26.11.2026 (prosjekttråden), #572 | Vedtatt av Peder 26.11.2026 | Tilpasses (prototypens Medarbeidere) | e: vaktandel |
| A-NY-07 | **Lokal administrator utpeker vaktplanansvarlige**, og det kan være **flere samtidig**. Fritak og regler bare med lokal administrativ myndighet. | Peder 26.11.2026 (prosjekttråden), §3.3 | Vedtatt av Peder 26.11.2026 | Nytt | — |
| A-NY-08 | **Automatisk generering, godkjenning og publisering gjøres bare av vaktplanansvarlige.** Kolleger ser bare vakter som er **publisert**, aldri kladden. Endringer i publisert plan er tydelige og varsles berørte. | Peder 26.11.2026 (prosjekttråden), planforslaget i #561 §4 | Vedtatt av Peder 26.11.2026 (varsling: nytt forslag) | Nytt (prototypen viser alle godkjente vakter) | — |
| A-NY-09 | **«Dagen i dag» øverst på forsiden** i fagmiljøet man arbeider i: vakter og evt. referent tydelig, de andre gruppert etter faktisk status uten dobbelttelling, udekket nødvendig oppgave synlig, klikk åpner dagen i kalenderen. Bare publiserte/operative tildelinger, aldri uakseptert forslag. Ingen status = planlagt til stede, ikke oppmøte. | Peders bestilling 26.11.2026, planforslaget i #561 §4 | Bestilt av Peder; innholdet er nytt forslag | Nytt (bruker dayCoverage og presenceOf) | — |
| A-NY-10 | **Mine vakter**: egne kommende vakter og oppgaver med lenke til dagen i kalenderen. | Peders bestilling 26.11.2026, planforslaget i #561 §7 | Bestilt av Peder | Nytt | — |
| A-NY-11 | **Kalenderpåminnelser** opt-in per oppgavetype og tidspunkt; bare egne publiserte tildelinger, aldri kladd; endringer avbryter og planlegger på nytt; fagmiljøets tidssone og sommertid; konservativ låseskjermtekst uten navn, fravær, merknad eller fritak; stopper ved utlogging, sperring og opphørt medlemskap. Gjenbruker OUSFARs web-push (Dev). | Peders bestilling 26.11.2026, planforslaget i #561 §5 | Bestilt av Peder; detaljene er nytt forslag | Nytt (avhenger av Dev) | — |
| A-NY-12 | **Samtidig redigering**: hver endring valideres på nytt og lagres atomisk; samtidige endringer overskriver aldri hverandre lydløst; angre er en ny validert endring. | planforslaget i #561 §3, Peders bestilling | Nytt forslag (teknisk krav) | Nytt | — |
| A-NY-13 | **Generell modell**: stillingskategorier, statuser (også statuskategorier og hva som regnes som til stede), bemanningsoppgaver, vekter og fordelingsregler er data per fagmiljø; ingen hardkodet LIS, overlege, vakt 1 eller vakt 2 utenfor pilotoppsettet. | Peders bestilling 26.11.2026, planforslaget i #561 §2 | Bestilt av Peder | Tilpasses (se kartleggingen §5) | u: allocation «rollevektene er konfigurasjon» |
| A-NY-14 | Et **andre syntetiske fagmiljø** med andre navn, tre kategorier, andre oppgavetyper, annen bemanningskalender og flere personer per oppgavetype og dag virker uten forgrening av motor eller grensesnitt. | planforslaget i #561 §2 | Nytt forslag (akseptkrav) | Nytt | u: allocation «mange plasser samme dag» (delvis) |
| A-NY-15 | **Enkelt grensesnitt**: minst mulig tekst, ingen tekniske metadata eller hjelpetekst om motor og regler i vanlig visning; bare relevante innstillinger for fagmiljø og rolle; avanserte valg skjult som standard. | Peders bestilling 26.11.2026, planforslaget i #561 §2 og §4 | Bestilt av Peder | Nytt | — |
| A-NY-16 | **Desktop og mobil, lyst og mørkt tema, tastatur og berøring** med OUSFARs komponenter; små skjermer får lesbar dagvisning og lett tilgjengelig redigering, ikke en komprimert desktop-matrise. | Peders bestilling 26.11.2026, AGENTS.md, planforslaget i #561 §4 | Bestilt av Peder | Tilpasses | e: tastatur-mobil |
| A-NY-17 | **Alle medarbeidere legger selv inn, endrer og fjerner egne statuser** (ferie, ønske om fri, borte, forskning osv.) fortløpende, som i dagens regneark. Vaktplanansvarlig tildeler vakter, men har ikke i oppgave å legge inn andres statuser. | Peder 26.11.2026 (prosjekttråden) | Vedtatt av Peder 26.11.2026 | Nytt (i prototypen redigerer bare vaktplanansvarlig) | u: permissions (må skrives om) |
| A-NY-18 | Grenser for egne registreringer. **Velger en medarbeider en status på en dag med egen publisert vakt, avvises det**, og vakten står; medarbeideren får beskjed om å ta det med vaktplanansvarlig (senere eventuelt forespørsel om vaktbytte). En kollega kan heller ikke fjerne eller endre en egen publisert vakt med slett, flytting, flervalg eller angre. I tillegg foreslått: en kollega kan ikke tildele seg selv vakt, gi vaktfritak eller låse; kolleger endrer egne statuser fra i dag og fremover, og tidligere dager rettes av vaktplanansvarlig, som fortsatt kan rette andres statuser. | Peder 26.11.2026 (beslutningskort i prosjekttråden); resten Claudes forslag | Vedtatt av Peder 26.11.2026 for publisert vakt; resten er nytt forslag | Nytt | — |
| A-NY-19 | **1:1 mellom stillingene i brukermenyen og kalenderen:** kalenderens stillingskategorier er nøyaktig stillingene i OUSFARs stillingskatalog, importert automatisk, og medarbeiderens stilling hentes fra profilen. Rollevekter i bemanningsbehovet settes per stilling. Følger: et stillingsbytte må få gyldighetsdato, så tidligere forventet vaktbelastning ikke skrives om (A-MED-03); en medarbeider uten oppgitt stilling vises og teller med standard rollevekt 1 (forslag); stillinger uten rollevekt teller 1. | Peder 26.11.2026 (prosjekttråden) | Vedtatt av Peder 26.11.2026 (følgene er nytt forslag) | Erstattes: stillingskatalogen (Dev); datert stillingshistorikk kan kreve Dev-endring | u: allocation «rollevektene er konfigurasjon», «kategoribytte …» |
| A-NY-20 | **Kladden holdes riktig når kolleger endrer statuser før publisering.** Kladdevakter (godtatt forslag og manuelle vakttildelinger som ikke er publisert) lagres atskilt fra kollegenes statuser til de publiseres, så én status per dag ikke brytes. Kladden kontrolleres hele tiden mot gjeldende statuser: setter en kollega en status på en dag der kladden gir vedkommende vakt, går kollegaens status foran, og kladdevakten markeres som ugyldig. Endringer som påvirker forventet antall (f.eks. ferie med vaktfritak) markerer kladden som berørt. Vaktplanansvarlig ser hvilke vakter og hvorfor, og «Oppdater vaktplan» retter med færrest mulige endringer. **Publisering er bare mulig når kladden er gyldig**, og alt kontrolleres på nytt i samme øyeblikk. | Peder 26.11.2026 (prosjekttråden) (kravet), Claudes forslag (mekanismen) | Bestilt av Peder 26.11.2026; mekanismen er nytt forslag | Nytt; bygger på A-PUB-03 (foreldet forslag), A-FOR-14 («Oppdater vaktplan») og A-PUB-07 (`previewAcceptance`) | u: allocation «et foreldet forslag avvises», «en allerede gyldig plan endres ikke» |

## Startverdier som ikke er vedtatt

Rollevekt (LIS 2 / overlege 1 for vakt 1, omvendt for vakt 2), belastning (1,5 / 1), vektene 20 / 1 / 6 / 2 / 0,5 / 3, kort vindu 42 dager, største ekstra utjevning 50 %, stabilitet 0,5, søkegrenser og periodegrenser. Se kartleggingen §3. Beholdes som justerbare standarder i pilotoppsettet; ingen av dem er vedtak.
