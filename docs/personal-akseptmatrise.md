# Akseptmatrise for personalkalenderen og vaktfordelingen

Sjekkliste for implementering (P2–P7) og produktaksept av personalkalenderen og vaktfordelingen i OUSFAR, laget 26.11.2026 fra kartleggingen av prototypen `peohol/vaktplan` på `main` = `10bc89fab8d8065140de1b41aa3721970f56b82e` (v0.11). Integrasjonsplanen, de tekniske akseptkriteriene (`K-…`) og rekkefølgen står i [personal.md](personal.md) §8. Bakgrunn, overføring av kode og tester og avvik mot integrasjonsplanen står i kartleggingen ([personal-prototypekartlegging.md](personal-prototypekartlegging.md)), som bruker de samme ID-ene.

**Kolonnene**

- **ID:** stabil. Endres aldri; utgår en rad, merkes den «utgått» i stedet for å fjernes.
- **Kilde:** `§` er `docs/personal.md` i OUSFAR, «spes.» er prototypens designspesifikasjon v0.11, `v0.N` er versjonen av spesifikasjonen der regelen kom inn, og `vaktplan#N` er PR i prototypen.
- **Vedtatt eller prototypens valg:** *Vedtatt* er Peders vedtak og må bevares. *Prototypens valg* er en startverdi eller et valg uten vedtak, som beholdes som justerbar standard med mindre Peder bestemmer noe annet. *Bestilt av Peder* står i bestillingen 26.11.2026 og må forankres i `docs/personal.md`. *Nytt forslag* krever godkjenning før det bygges.
- **I OUSFAR:** *Direkte* = prototypens domenekode og test kan overføres med små endringer. *Tilpasses* = regelen eller logikken beholdes, men koden eller visningen bygges om for OUSFAR. *Erstattes* = løses med OUSFARs egne mekanismer (server, radsikkerhet, medlemskap, komponenter). *Nytt* = finnes ikke i prototypen.
- **Prototypens tester:** `u:` enhetstester i `src/domain/`, `e:` nettlesertester i `tests/e2e/`. Testene skal portes eller erstattes av tilsvarende tester i OUSFAR, og fasitene (FAS) skal stå som egne, navngitte tester.

Alle eksempler bruker syntetiske medarbeidere. Revidert 27.11.2026 etter B1 og B17–B19; [personal-design.md](personal-design.md) er bindende detaljspesifikasjon. Nyere vedtak erstatter prototypens gamle valg. ID-er er bevart.


### STA – Grunnmodell og statuser

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-STA-01 | Høyst **én status per medarbeider per dag**, uansett klokkeslett. Ingen kombinasjons- eller eksklusjonsregler. Håndheves i datamodellen og i alle veier inn (enkeltcelle, flervalg, flytting, fordeling, innlesing). | §7.2, v0.9, vaktplan#13 | Vedtatt | Direkte: regelmotoren + unik begrensning i databasen | u: rules, guarantees, kontroll · e: status |
| A-STA-02 | Høyst **én medarbeider per dag for statuser som er «én per dag»**: Vakt 1, Vakt 2 og Referent i piloten, også ved flytting og fordeling. Referent er fortsatt manuell. En annen bemannet oppgave har **høyst det konfigurerte antallet** per dag (prototypen tillater et behov på opptil 20); en tredje avvises når behovet er to. Overskudd vises bare når behovet er senket etter at plassene ble fylt, og antallet kan da ikke økes. | §7.2, §8.7 | Vedtatt (Referent og grensen: Peder 27.11.2026); grensen 20 er prototypens valg | Direkte: regelmotoren + begrensning i databasen | u: guarantees, kontroll-p2a «én medarbeider per vakt og én referent», fagmiljo-kkon2, allocation «mange plasser samme dag» |
| A-STA-03 | **Ingen status = til stede** på ordinære arbeidsdager. Kalenderen viser planlagt tilstedeværelse, ikke registrert oppmøte. | §7.2 | Vedtatt | Direkte | u: rules |
| A-STA-04 | Tre konfigurerbare visningsgrupper: Til stede (Vakt 1/2, Referent, Opplæring og ingen status), Jobber et annet sted (Hjemmekontor, Forskning, Undervisning), Fraværende (Borte, Ferie, Avspasering, Ønske om fri). Ferie med solikon, Fri utgår som nytt valg; historikk bevarer tidligere betydning. | §7.2, §6.2, B17 | Vedtatt 27.11.2026 | Pilotkonfigurasjon | u: rules, exemption |
| A-STA-05 | Hver status har ikon fra **ett felles ikonbibliotek, ingen emojier**; samme ikon i boble, kalender, forklaring og regelside. | §7.2 | Vedtatt | Erstattes: OUSFARs ikonregister | e: status |
| A-STA-06 | Statuskatalogen er **data, ikke kode**, og skal kunne variere per fagmiljø. Det bygges ikke noe administrasjonsgrensesnitt for katalogen nå. | §7.2 | Vedtatt | Tilpasses: versjonert konfigurasjon per fagmiljø i databasen | u: rules |
| A-STA-07 | Tilstede-statuser krever arbeidsdag etter fagmiljøets arbeidskalender; helg/helligdag kan være arbeidsdag. Inaktiv/ikke registrert kan ikke få status som krever aktivitet. Filteret påvirker aldri dekning. | §7.2, B17, personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-STA-08 | Vakt krever **kvalifikasjon for akkurat den vakttypen**. | §7.2 | Vedtatt | Direkte | u: rules · e: status |
| A-STA-09 | Hard garanti: bemanningsoppgaver må regnes som fysisk til stede; fravær teller aldri som dekning. Status med vaktfritak kan ikke bemannes eller være én per dag. | §7.2, §6.2 | Vedtatt | Direkte + konfigurasjonsvalidering | u: guarantees, kontroll |
| A-STA-10 | Ønske om fri regnes som fravær i planleggingen, men vises annerledes enn registrert ferie/annet fravær. | §7.2, B17 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-STA-11 | Utgåtte statuser kan ikke velges, men gamle registreringer står og er gyldige. | v0.9 | Prototypens valg | Direkte | u: singleStatusMigration |
| A-STA-12 | **Borte registreres uten grunn.** | §3.2, §7.2 | Vedtatt | Direkte | u: privacy |

### KAL – Kalendervisninger og navigasjon

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-KAL-01 | Fire visninger: **dag, uke (standard), måned og helår**, med felles dato, navigasjon, filtre og redigeringsmodell. En endring vises straks i alle visninger og etter omlasting. | §7.2 dag/uke/måned; helår v0.4–v0.11 | Vedtatt | Tilpasses: valgt design; felles visningstilstand gjenbrukes | e: kalender |
| A-KAL-02 | Dag: full dato med år; ingen separate vaktkort, alle medarbeidere med status, merknad og tid. Kategorisering etter stilling eller tilstedeværelse, sortering etter de tillatte valgene; preferanse per bruker og fagmiljø. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-KAL-03 | Uke: medarbeidere i rader, datoer i kolonner, faste navn, klikkbare celler; tittel Uke N, kort månedsnavn på datocellene, korrekt ved årsskifte. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-KAL-04 | Måned: vaktdekning, alle statuser som standard, kompakt ikon/navn-kort per person også ved lik status. Dato/uke navigerer; egen plussknapp legger til status. Prøv to indre kolonner når plass. Kortklikk åpner personens statusboble. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-KAL-05 | Helår: kompakt matrise hele arbeidsåret, historikk beholdes, ISO-ukeceller over hele viste uker med venstrejustert nummer og tydelig grense; faste navn og overskrifter, vannrett rulling, hurtigvalg måneder og Gå til dato. Klikk måned/uke/dag navigerer. Månedsticky stanser ved navnekolonnen; korte unike navn, full identitet tilgjengelig. Avrundede statuskort og stiplet kladd. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-KAL-06 | Arbeidsåret starter i en konfigurerbar måned per fagmiljø (`workYearStartMonth`). | prototypen | Prototypens valg | Tilpasses: innstilling per fagmiljø | u: dates |
| A-KAL-07 | Årsskifte, helger og norske helligdager håndteres riktig (helligdager beregnes, ikke lagres). | spes. §5 A | Vedtatt | Direkte: dates.ts; helligdager som felles hjelper | u: dates, people · e: kalender |
| A-KAL-08 | Dager før en person ble registrert vises «Ikke registrert», dager etter deaktivering «Ikke aktiv», begge skravert. Rader og antall følger medarbeiderlisten **slik den gjaldt datoen**. | kontroll 3, vaktplan#3 | Vedtatt | Direkte: atDate/peopleInPeriod; datoene fra medlemskapet | u: kontroll · e: kontroll |
| A-KAL-09 | Hurtigtaster: D/U/M/H bytter visning, T = i dag, Alt+←/→ blar, Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) angre/gjør om; piltaster, PageUp/PageDown, Home/End i rutenettet; Enter åpner boblen; Escape lukker og gir fokus tilbake. | tastaturflyt er krav i AGENTS.md | Prototypens valg | Tilpasses: OUSFARs hurtigtastmønster | e: tastatur-mobil, flytting |

### DAG – Dagen i dag i kalenderen

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-DAG-01 | Dagens kolonne/felt og inneværende uke markeres tydelig med kontur/fyll og tilgjengelig tekst, også i helår, lyst/mørkt og skjulte helger. Udekkede behov markeres tydelig, ikke forvekslet med upublisert. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-DAG-02 | Skjermlesere får `aria-current="date"`; ikke «i dag» i etiketten. | vaktplan#11, kontroll | Vedtatt | Direkte | e: i-dag, kalender |
| A-DAG-03 | I dag (knapp og T) navigerer til selve datoen i alle visninger, ruller og fokuserer cellen, til høyre for navnekolonne i helår. Vis dagen også hvis filter ellers skjuler den. Bevar medarbeiderrad der mulig; ellers datohode. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |

### BOB – Statusboblen og direkte redigering

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-BOB-01 | Samme statusboble i kalenderens visninger. Pil alltid utenfor boblen, over/under ankeret uten overflow; begrens/rull indre innhold ved behov. Bunnark på små skjermer. Forsiden har kun informasjonsboble ved merknad. | personal-design.md §2–4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
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
| A-MRK-04 | Måned: én informasjonsboble per medarbeiderkort over både ikon, navn, merknadsikon og mellomrom. Flere med samme status har hvert sitt kort og hver sin boble. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
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
| A-FLY-01 | Én felles flyttemekanisme med eksplisitt person/dato-mål i rutenett og person med status til ny dato i måned. Klikk uten dra åpner boble; Til stede uten status er virtuell draggable. | personal-design.md §4, B18 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLY-02 | Tom målcelle: flytt. Opptatt: Bytt statusene, Flytt og erstatt eksisterende status eller Avbryt, bare gyldige valg med konsekvenser. Virtuell Til stede på statuscelle bytter den faktiske statusen tilbake til kilden, aldri skjult sletting; tom til tom ingen endring. | personal-design.md §4, B18 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLY-03 | Ingen flytting overtar tredjepersons vakt lydløst. Ved full vakttype tilbys eksplisitt bytte av vaktdager eller overtakelse med konkrete konsekvenser, likt i dag, uke, måned og helår (Peder 27.11.2026); slipp i en tredje persons tomme celle der vakten er tatt, avvises med årsak. | personal-design.md §4, B18 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLY-04 | Regler og kvalifikasjoner vurderes slik de gjelder **måldatoen**; valget vurderes på nytt mot gjeldende kalender rett før lagring, så et foreldet valg aldri overskriver nyere endringer. | spes. §2 | Vedtatt | Tilpasses: move.ts + serverens versjonskontroll | u: move |
| A-FLY-05 | Merknad, klokkeslett og lås følger statusen; **administrativt vaktfritak følger aldri med**. Én Angre angrer hele flyttingen eller byttet. | §7.2, §6.2 | Vedtatt | Direkte: move.ts | u: move, exemption · e: flytting |
| A-FLY-06 | Direkte flytting viser hvilke behov som blir udekket; behold tydelig varsel ved viktige konsekvenser. Vanlig vellykket endring trenger ikke toast; separat Angre/Gjør om. Under dra vises forklarende tekst bare når slippet ikke er mulig, som snakkeboble over målet med «Ikke mulig» og årsaken; ingen tekst følger pekeren (Peder 27.11.2026). En vaktplanansvarligs manuelle endring av en publisert vakt utenfor kladden gjelder operativt med en gang uten bekreftelsesdialog og kan angres (Peder 27.11.2026). | personal-design.md §2 og §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLY-07 | Måned: slipp på dato flytter samme person med status. Ved full vakttype: Bytt vaktdager, Overta vakten, Avbryt. Ingen mottaker-personvelger. For flere plasser kan konkret motpart velges når nødvendig. Valider alle berørte celler og bevar respektive merknader, tid og lås, aldri administrativt fritak. | personal-design.md §4, B18 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLY-08 | Tastaturalternativ («Flytt» i boblen, piltaster og Enter, også i valgboblen); berøring med langt trykk uten å ødelegge rulling; automatisk rulling nær kanten (også vannrett i helår); presist slipp under rulling; Escape avbryter. Hvem som kan flytte hva, følger A-NY-17 og A-NY-18. | spes. §2 | Vedtatt | Tilpasses | e: flytting, tastatur-mobil |
| A-FLY-09 | Retningsstyrt roterende markør fra vaktplan#5, på mobil synlig foran/over fingertuppen (prøv 30–40 px). Faktisk mål samsvarer med pilspiss, også ved rulling. Delvis gjennomsiktig kort med ca. 3 px backdrop-blur. Markering av mål med mer enn farge. | personal-design.md §4 | Vedtatt; eksakte designverdier justerbare | Tilpasses | Ny/regresjonstest |

### FLT – Flervalg, filtre og visningsvalg

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-FLT-01 | Flervalg («Velg flere», Shift/Ctrl+klikk) med **«Sett status»** og **«Fjern status»**, forhåndsvisning av statuser som forsvinner og vakter som blir udekket; én angre. En kollega bruker det på egne statuser (A-NY-17). | spes. §2, v0.9 | Vedtatt | Tilpasses: applyToCells som serverkommando | u: commands «flervalg» · e: flervalg |
| A-FLT-02 | Fremhev: avkrysning av flere statuser, Nullstill fast øverst i menyen, listen rulles separat. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLT-03 | Alle medarbeidere: Vis alle og Skjul alle fast øverst, listen rulles separat. Valg huskes; skjulte personer teller fortsatt i dekning. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-FLT-04 | Vis/skjul Helg og helligdager med åpent/lukket øye i alle fire visninger, og filter på stilling. Skjul hopper over dagene i navigasjon/perioder; I dag kan vise skjult dag. Fagmiljøets standard kan variere; ingen effekt på beregninger. Valg huskes. | personal-design.md §4 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |

### ANG – Angre og gjør om

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-ANG-01 | Alle ordinære kalender-/kladdendringer kan angres/gjøres om med knapp og tastatur innen rettigheter. Ingen toast-støy. Publisering trekkes tilbake med særskilt validert 24-timershandling (A-PUB-09), aldri generell snapshot-angre. | personal-design.md §2 og §5 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-ANG-02 | Overtakelse, flytting/bytte og flervalg er én angre-oppføring. Kladdens angre/gjør om påvirker ikke operativ plan. Publisering håndteres av A-PUB-09. | personal-design.md §5 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-ANG-03 | Angre og gjør om krever **samme rettighet** som endringen de gjelder, også fra hurtigtast og melding. | kontroll vaktplan#3, §6.2 for fritak | Vedtatt | Erstattes: tilgangskontroll på serveren | u: permissions, exemption · e: roller |
| A-ANG-04 | Angre/gjør om kan **ikke endre vaktandel for en dag før datoen det utføres** (også når siden står åpen over midnatt). | §6.2 | Vedtatt | Erstattes: serverregel + databasebegrensning | u: dutyShare, store.test |
| A-ANG-05 | Prototypen holder 60 steg per nettleser. | prototypen | Prototypens valg (utgår) | Erstattes: utgår |  |

### MED – Medarbeidere og gyldighet over tid

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-MED-01 | Per medarbeider: stilling (hentet fra brukermenyen, A-NY-19), kvalifikasjon per vakttype og vaktandel. Hvem som er med, følger medlemskapet i fagmiljøet (A-NY-04). | spes. §2, §7.4, Peder 26.11.2026 (prosjekttråden) | Vedtatt (endret av Peder 26.11.2026) | Erstattes for stilling og medlemskap; tilpasses for kvalifikasjon og vaktandel | u: people, commands |
| A-MED-02 | Ingen arbeidsmønster eller stillingsandel i første versjon. Aktive regnes til stede på fagmiljøets arbeidsdager; ordinære deltidsfridager registreres som Borte uten fritak. | §6.2, §7.2, B17 | Vedtatt 27.11.2026 | Tilpasses | u: people, exemption |
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
| A-FOR-01 | Automatisk fordeling er et forståelig, etterprøvbart og manuelt justerbart forslag. Lag forslag gir redigerbar kladd, tydelig skilt fra operativ plan; publisering er én handling. | §4, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
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
| A-FOR-14 | **Oppdater**: beholder fortid, låste, manuelle og gyldige tildelinger; fyller hull med færrest mulige endringer; ingen endringer når planen alt er gyldig; én ugyldig vakt med ledig erstatter endrer bare den plassen. | §6.1, spes. §4 | Vedtatt | Direkte | u: allocation «oppdatering av eksisterende plan» · e: vaktfordeling |
| A-FOR-15 | **Fordel på nytt**: omfordeler perioden med vekt på rettferdighet; ingen endring utenfor perioden; litt stabilitet mellom ellers like planer (0,5 per utbyttet gyldig tildeling). | spes. §4 | Vedtatt for modusen; 0,5 er prototypens valg | Direkte | u: allocation |
| A-FOR-16 | **Dager før i dag endres aldri**; en periode helt før i dag avvises i skjemaet med årsak. | spes. §4, Peders prøving vaktplan#15 | Vedtatt | Direkte | u: allocation · e: vaktfordeling |
| A-FOR-17 | En eksisterende vakt beholdes når den er gyldig etter vurderingen av eksisterende registreringer (lagret tid, også etter endret standardtid eller deaktivert status); nye vakter vurderes som nye registreringer. | kontroll vaktplan#6 | Vedtatt | Direkte | u: allocation «en gyldig vakt med fast tid beholdes …» |
| A-FOR-18 | Vaktbytte endrer ikke andre vakter; faktisk utført vakt teller for riktig person. | spes. §4 | Vedtatt | Direkte | u: allocation «et vaktbytte …» |
| A-FOR-19 | Startdata **uten vakter**: fordelingen kan startes fra blanke ark; ingen konstruert vaktgjeld. | §6.1, v0.10 | Vedtatt | Tilpasses: OUSFAR starter fra blanke ark | u: seed |

### PUB – Forslag, godkjenning, låsing og publisering

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-PUB-01 | Lag forslag oppretter én aktiv delt redigerbar kladd per fagmiljø. Planlegger ser den i kalenderen med stiplet ramme. Ingen endring i operativ plan før én atomisk Publiser forslag; ingen separat Godta. Manuell justering inngår i kladden. | §8.7, B19, personal-design.md §5 | Vedtatt 27.11.2026 | Erstattes: redigerbar kladd, serverkommando | Ny arbeidsflyttest |
| A-PUB-02 | Forslaget viser før/etter per endring med rolleavgrenset årsak, antall endringer og udekkede plasser. Publiser forslag eller Avbryt; faktiske udekkede behov krever tydelig advarsel/bekreftelse, ugyldig kandidat blokkerer. | §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-PUB-03 | Foreldet beregningsgrunnlag krever ny gyldig vurdering før publisering. Kandidat i konflikt blokkerer. Serveren validerer versjoner og avtrykk atomisk; ingen lekkasje av fritak eller stille overskriving. | §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | u: allocation + samtidighetstest |
| A-PUB-04 | **Låst vakt** (manuell avtale, hengelås i boblen) endres aldri av fordelingen. | spes. §4 | Vedtatt | Direkte | u: allocation · e: vaktfordeling |
| A-PUB-05 | Publisert omfang bevares. Uten uttrykkelig tillatelse endrer forslag ingenting i allerede publisert plan, heller ikke ledige plasser. Arbeidsperioden skal være tydelig. | §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-PUB-06 | Med uttrykkelig tillatelse til endringer i publisert plan vises endringene i kladden, men den operative planen står uendret helt til Publiser forslag. Ingen lekkasje til kolleger. | §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-PUB-07 | Forhåndsvisningen av belastning etter publisering er nøyaktig den manuelt justerte planen som ville blitt publisert nå. Samme tidsrom, ingen dobbelttelling; hold operativ statistikk separat. | §6.1, §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-PUB-08 | Generering, kladdredigering, publisering, avbryt og tilbaketrekking krever lokal planleggerrett på serveren. | §8.4, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-PUB-09 | Bare siste publisering kan trekkes tilbake innen 24 timer. Gjenopprett forrige operative plan atomisk etter validering, ikke avviklede dager eller nyere endringer/konflikter. Bevar revisjonsspor; revider varsler/påminnelser. | §8.7, B19 | Vedtatt 27.11.2026 | Nytt | Ny test: grense, samtidighet, rettighet, historikk |
| A-PUB-10 | Avbryt forkaster bare aktiv kladd inkl. manuelle vaktjusteringer; operativ plan, kollegers nye statuser og endringer utenfor kladden bevares. Avvis ved konflikt med annen planleggers nyere kladd. | §8.7, B19 | Vedtatt 27.11.2026 | Nytt | Ny arbeidsflyt- og samtidighetstest |

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
| A-BEL-03 | Med forslag også: antall i foreslått plan, samlet etter publisering, samlet forventet og avvik etter, **over nøyaktig samme tidsrom**. En vakt som flyttes, **telles én gang**. | §6.1 | Vedtatt | Direkte: workload.ts | u: allocation «omfordeling av eksisterende vakter …» (17/13 før, 15/15 etter) |
| A-BEL-04 | Liggende stolpediagram for avvik før/etter, null i midten, for få blått til venstre og for mange rødt til høyre, tall ved siden av; fargeparet kontrollert for fargesvakt syn og kontrast; skjermlesertekst per rad. | v0.10 | Prototypens valg | Tilpasses: valgt design | e: vaktbelastning |
| A-BEL-05 | Forventet, avvik og diagram bare for roller med fritaksmyndighet (A-FRI-04). | §6.2 | Vedtatt | Erstattes: serverstyrt lesemodell | e: vaktbelastning |

### TIL – Roller og tilgang

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-TIL-01 | Tre atskilte nivåer: **kollegers innsyn**, **vaktplanansvarliges redigering**, **administrativ myndighet**. | §3.3 | Vedtatt | Erstattes: medlemskap, lokale roller og radsikkerhet | u: permissions |
| A-TIL-02 | Roller: **Kollega** ser kalenderen og redigerer egne statuser (A-NY-17); **Vaktplanansvarlig** (én eller flere, utpekt av lokal administrator) tildeler vakter, redigerer kvalifikasjoner og vaktandel, lager og justerer forslag, låser og publiserer; **Lokal administrator** i tillegg regler og administrativt vaktfritak (gjelder også systemarkitekt med lokal myndighet); **Systemarkitekt uten lokal myndighet: ingenting**. | §6.2, §3.3, Peder 26.11.2026 (prosjekttråden) | Vedtatt for vaktandel, fritak, kollegers egne statuser og vaktplanansvarlige; resten er prototypens valg og vedtas etter §3.3 | Erstattes: medlemskap, lokale roller og radsikkerhet | u: permissions, exemption · e: roller |
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
| A-NY-08 | Bare planleggerne genererer, justerer og publiserer kladd; kolleger ser bare publiserte vakter. Endring av publisert plan varsles berørte etter eget opt-in (B10). | §8.4, §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-NY-09 | Forside B: ren leseflate for alle roller, symmetriske datopiler og knapp I kalenderen. Kompakte fremhevede oppgaver inkl. Referent; alfabetiske medarbeidere, avatarer, Til stede per stilling, Jobber et annet sted og Fraværende med status under navn. Ingen dobbelttelling, kladd, falske udekkede hull eller redigering; bare merknadsboble ved behov. | personal-design.md §3, B1 | Vedtatt 27.11.2026 | Tilpasses | Ny/regresjonstest |
| A-NY-10 | **Mine vakter**: egne kommende vakter og oppgaver med lenke til dagen i kalenderen. | Peders bestilling 26.11.2026, planforslaget i #561 §7 | Bestilt av Peder | Nytt | — |
| A-NY-11 | **Kalenderpåminnelser** opt-in per oppgavetype og tidspunkt; bare egne publiserte tildelinger, aldri kladd; endringer avbryter og planlegger på nytt; fagmiljøets tidssone og sommertid; låseskjermen kan vise egen oppgave og dag («Vakt 1 i morgen») hvis avklaringen i §3.4 tillater det, aldri navn, fravær, merknad eller fritak (B7); varsel ved endring i egen publisert plan er et eget valg, av som standard (B10); stopper ved utlogging, sperring og opphørt medlemskap. Gjenbruker OUSFARs web-push (Dev). | Peders bestilling 26.11.2026, planforslaget i #561 §5 | Bestilt av Peder; detaljene er nytt forslag | Nytt (avhenger av Dev) | — |
| A-NY-12 | **Samtidig redigering**: hver endring valideres på nytt og lagres atomisk; samtidige endringer overskriver aldri hverandre lydløst; angre er en ny validert endring. | planforslaget i #561 §3, Peders bestilling | Nytt forslag (teknisk krav) | Nytt | — |
| A-NY-13 | **Generell modell**: stillingskategorier, statuser (også statuskategorier og hva som regnes som til stede), bemanningsoppgaver, vekter og fordelingsregler er data per fagmiljø; ingen hardkodet LIS, overlege, vakt 1 eller vakt 2 utenfor pilotoppsettet. | Peders bestilling 26.11.2026, planforslaget i #561 §2 | Bestilt av Peder | Tilpasses (se kartleggingen §5) | u: allocation «rollevektene er konfigurasjon» |
| A-NY-14 | Et **andre syntetiske fagmiljø** med andre navn, tre kategorier, andre oppgavetyper, annen bemanningskalender og flere personer per oppgavetype og dag virker uten forgrening av motor eller grensesnitt. | planforslaget i #561 §2 | Nytt forslag (akseptkrav) | Nytt | u: allocation «mange plasser samme dag» (delvis) |
| A-NY-15 | **Enkelt grensesnitt**: minst mulig tekst, ingen tekniske metadata eller hjelpetekst om motor og regler i vanlig visning; bare relevante innstillinger for fagmiljø og rolle; avanserte valg skjult som standard. | Peders bestilling 26.11.2026, planforslaget i #561 §2 og §4 | Bestilt av Peder | Nytt | — |
| A-NY-16 | **Desktop og mobil, lyst og mørkt tema, tastatur og berøring** med OUSFARs komponenter; små skjermer får lesbar dagvisning og lett tilgjengelig redigering, ikke en komprimert desktop-matrise. | Peders bestilling 26.11.2026, AGENTS.md, planforslaget i #561 §4 | Bestilt av Peder | Tilpasses | e: tastatur-mobil |
| A-NY-17 | **Alle medarbeidere legger selv inn, endrer og fjerner egne statuser** (ferie, ønske om fri, borte, forskning osv.) fortløpende, som i dagens regneark. Vaktplanansvarlig tildeler vakter, men har ikke i oppgave å legge inn andres statuser. | Peder 26.11.2026 (prosjekttråden) | Vedtatt av Peder 26.11.2026 | Nytt (i prototypen redigerer bare vaktplanansvarlig) | u: permissions (må skrives om) |
| A-NY-18 | Grenser for egne registreringer. **Velger en medarbeider en status på en dag med egen publisert vakt, avvises det**, og vakten står; medarbeideren får beskjed om å ta det med vaktplanansvarlig (senere eventuelt forespørsel om vaktbytte). En kollega kan heller ikke fjerne eller endre en egen publisert vakt med slett, flytting, flervalg eller angre. En kollega kan ikke tildele seg selv vakt, låse eller endre administrativt vaktfritak, men kan sette alle statuser uten bemanningsbehov, også Ferie og Opplæring med automatisk vaktfritak; kolleger endrer egne statuser fra i dag og fremover, og tidligere dager rettes av vaktplanansvarlig, som fortsatt kan rette andres statuser. | Peder 26.11.2026 (beslutningskort i prosjekttråden; B15b og B16 i personal.md §8.12) | Vedtatt av Peder 26.11.2026 | Nytt | — |
| A-NY-19 | **1:1 mellom stillingene i brukermenyen og kalenderen:** kalenderens stillingskategorier er nøyaktig stillingene i OUSFARs stillingskatalog, importert automatisk, og medarbeiderens stilling hentes fra profilen. Rollevekter i bemanningsbehovet settes per stilling. Følger: et stillingsbytte må få gyldighetsdato, så tidligere forventet vaktbelastning ikke skrives om (A-MED-03); en medarbeider uten oppgitt stilling vises og teller med standard rollevekt 1; stillinger uten rollevekt teller 1; en endring som påvirker vaktbelastningen, krever lokal administrativ myndighet (B14 i personal.md §8.12). | Peder 26.11.2026 (prosjekttråden; B14) | Vedtatt av Peder 26.11.2026 | Erstattes: stillingskatalogen (Dev); datert stillingshistorikk kan kreve Dev-endring | u: allocation «rollevektene er konfigurasjon», «kategoribytte …» |
| A-NY-20 | Egen status på kladddag går foran kandidaten, som beholdes i konflikt uten å telle i dekningen. Endret grunnlag markeres; Oppdater reparerer med færrest endringer. Serveren validerer kladden og publiserer atomisk; ingen skjult lekkasje av fritak. Publiserte vakter vernes etter B15. | §8.7, B19 | Vedtatt 27.11.2026 | Tilpasses/nytt | u: allocation + server- og arbeidsflyttest |

### UX – Designvedtak 27.11.2026

| ID | Krav | Kilde | Vedtatt eller prototypens valg | I OUSFAR | Prototypens tester |
| --- | --- | --- | --- | --- | --- |
| A-UX-01 | Én samlet klikkbar prototype: B-forside, A for resten; alle detaljer i personal-design.md, syntetisk og beskyttet. | B1 | Vedtatt | Tilpasses | P1-produktaksept |
| A-UX-02 | Statusikonene animeres ikke; ordinære knapper ser ut som knapper; like forrige/neste-piler; felles OUSFAR-rullefelt. Ingen opphopning av toasts. | personal-design.md §2–4 | Vedtatt | Tilpasses | Visuell kontroll og arbeidsflyt |
| A-UX-03 | Ferie gir automatisk fritak (inkl. ulønnet ferie); Borte ved ordinære arbeidsfrie dager gir ikke fritak. Fri er ikke nytt valg. Historisk Fri får ikke tilbakevirkende fritak. Fasit A-FAS-03/04 står. | B17, §6.2 | Vedtatt | Tilpasses | u: exemption, historikk |
| A-UX-04 | Månedsdrag med A Vakt 1 mandag og B Vakt 1 torsdag: bytte gir B mandag/A torsdag; overtakelse gir udekket mandag/A torsdag; avbryt ingen endring. Respektive merknader følger sine vakter, ingen delvis endring. | B18, personal-design.md §4 | Vedtatt | Tilpasses | Ny u/e-fasit |
| A-UX-05 | Forsideavatarer: bare eksisterende tillatt profilbilde i eget fagmiljø, ellers initialer; syntetiske avatarer i test. Ingen ny bildelagring, ingen utvidelse av tilgang. | B1, personal-design.md §3, §3.4 | Vedtatt | Tilpasses | Negativ tilgangstest |
| A-UX-06 | Arbeids- og bemanningskalender, gruppe/fysisk tilstedeværelse og fremhevede oppgaver varierer per fagmiljø, uavhengig av visningsfilter. Prøv annet syntetisk fagmiljø med helgebemanning og annen oppgavekonfigurasjon. | B17, §8.6 | Vedtatt | Tilpasses | K-KON-2/K-KON-5 |

## Startverdier som ikke er vedtatt

Rollevekt (LIS 2 / overlege 1 for vakt 1, omvendt for vakt 2), belastning (1,5 / 1), vektene 20 / 1 / 6 / 2 / 0,5 / 3, kort vindu 42 dager, største ekstra utjevning 50 %, stabilitet 0,5, søkegrenser og periodegrenser. Se kartleggingen §3. Beholdes som justerbare standarder i pilotoppsettet; ingen av dem er vedtak.
