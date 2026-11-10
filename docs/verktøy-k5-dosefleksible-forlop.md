# K5-D: Dosefleksible, komplette psykofarmakaforløp

**Status: PLANLAGT – IKKE STARTET (04.11.2026).** Denne planen skal gjennomføres **etter** de pågående kliniske leveransene og arbeidstrådene for brukeropplevelse. Den er en videreføring av [klinisk leveranseplan K0–K5](verktøy-klinisk-leveranseplan-2026-11.md), særlig K5, og **erstatter ikke** den pågående [brukervennlighetsplanen](verktøy-brukervennlighet-2026-11.md) på dens arbeidsgren.

**Beslutning:** Prioriter klinisk validerte **doseområder** fremfor flere regler som bare fungerer ved én forhåndsdefinert startdose. Gjenbruk etablert regelmotor, FEST, visning, kopiering, nødstopper, kilde- og godkjenningssystem. Bygg ikke enda et separat verktøy eller en parallell klinisk motor.

## 1. Når arbeidet kan starte

- [ ] De pågående PR-/arbeidstrådene for kliniske forløp og ny brukerflyt er **integrert eller eksplisitt avsluttet**. Ved opprettelsen omfatter dette #318 (K2), #321 (slutt-QA), #326 (UX-plan), #327 (motor), #328 (sikkerhetstester), #329 (forhåndskontroll), #330 (escitalopram tablett/dråpe) og #331 (brukerflate). Ikke krev at PR-numrene er de siste; kontroller også nye oppfølgings-PR-er som inngår i samme leveranse.
- [ ] Samlet kode på `main` har bestått relevant bygg, tester, klinisk regel-/FEST-kontroll og oppdatert syntetisk brukerflyt mot publisert administrator-app, inklusive skjermvisning og kopi. Håndter en PR som lukkes uten merge som et **uoppfylt behov**, ikke som levert funksjon.
- [ ] Koordinatoren oppdaterer den kliniske fremdriftsplanen og lager et nytt, datert nullpunkt. Dokumenter eventuelle gjenstående K1–K4-mangler; disse skal inngå i prioriteringen, ikke skjules. Ikke gjør oppfyllelse av alle senere K5-mål til en forutsetning for å begynne på dem.
- [ ] Ikke endre `VERKTOYENE_VISES_FOR='admin'` som følge av denne planen. Bred tilgang krever egen produkt-/klinisk beslutning og dokumentert produksjonstest.

**Ingen implementering av K5-D før disse portene er kontrollert.** Denne dokument-PR-en endrer ingen klinisk regel, godkjenning, dosering, beregning, brukerflate eller publisering. Ingen ny automasjon opprettes.

## 2. Det konkrete problemet

Dagens komplette regler er ofte knyttet til ett eller to eksempler: escitalopram 10/20 mg med dråper; olanzapin 20 mg eller risperidon 4 mg til aripiprazol; risperidon 3 mg til Xeplion 75 mg/måned. En ellers sammenlignbar pasient med eksempelvis escitalopram 15 mg eller olanzapin 10 mg får ikke automatisk en komplett plan. **At en vanlig startdose ikke er lik et godkjent regneeksempel, er ikke i seg selv et klinisk argument for å stoppe.**

Målet er **ikke** at enhver tenkelig dose, kombinasjon eller pasient får en automatisk plan. Målet er at en kliniker innenfor et **eksplisitt, uavhengig klinisk godkjent område** kan oppgi faktisk dose, ønsket sluttmål, behandlingssituasjon og nødvendige forhold og få et helt, praktisk gjennomførbart planforslag. Utenfor dette området skal systemet stoppe med presis grunn, ikke improvisere.

Tre utfall må alltid holdes adskilt: (a) komplett klinisk godkjent forløp til valgt mål; (b) ingen godkjent komplett plan, med konkret årsak; (c) teknisk eller klinisk **uavklart** fordi grunnlaget/søket er ufullstendig. Et søk som når sin ressursgrense, skal aldri feilaktig bli «umulig».

## 3. Klinisk og teknisk løsningsprinsipp

### 3.1 Klinisk regel med et kontrollert gyldighetsområde

En generalisert regel skal dokumentere og versjonere:

- hvilke virkestoffer, formuleringer, behandlingsretninger og strategier den gjelder for, og **hvilke faktiske start- og måldoseområder** som er vurdert;
- hvilke pasientgrupper, behandlingsvarigheter, kliniske forutsetninger, doseintervaller, samtidige legemidler og kontraindikasjoner som inngår/ikke inngår;
- hvordan dosetrinn, overlapp, seponering, opptrapping, utvasking, depotoppstart, vedlikehold og vurderingspunkter bestemmes **ut fra faktisk dose og valgt sluttmål**, ikke ved å skalere et eksempel mekanisk;
- hvordan ulike doser innen samme godkjente område håndteres, inklusive nedre grense, doseavhengige særregler og kliniske avbrudd;
- kildegrunnlag med identifiserbare punkt/avsnitt, eksplisitte egne faglige vurderinger, regelversjon og **fingeravtrykk som også omfatter gyldighetsområdet og parameterne**.

**Faglig godkjenning av én startdose godkjenner ikke automatisk et helt intervall.** For hver utvidelse skal det foreligge egen uavhengig vurdering av strategien, doseområdet, grenseverdiene, regneeksemplene og risikoene. En endring som utvider området eller endrer utfall krever ny versjon/fingeravtrykk og godkjenning, med atomisk utskifting av gammel regel.

### 3.2 Praktisk dosering er et eget problem

- Bruk ferske og kontrollerte norske FEST-preparater/styrker sammen med SPC for delbarhet, administrasjonsform, frigjøring, holdbarhet etter anbrudd og faktisk enhetsdose. FEST er ikke lagerstatus.
- Velg gjennomførbare kombinasjoner av tabletter, dokumentert delte tabletter, dråper, mikstur eller depot **bare innenfor godkjente former og tillatte bytter**. Muligheten til å skifte form mellom trinn skal brukes der den er klinisk godkjent; ingen automatisk kombinasjon av tabletter og dråper i samme administrasjon uten egen godkjenning.
- Vis antall enheter **per administrasjon**, antall administrasjoner per dag, faktisk mg-dose, nødvendige pakninger og eventuelt svinn ved begrenset holdbarhet. Unngå upraktisk mange dråper når en enklere, godkjent form finnes; en dråpepreferanse er ikke en klinisk stoppgrense.
- Dersom eksakt foreslått dose ikke kan gis, kan bare på forhånd faglig godkjente alternative trinn tilbys, med synlig faktisk dose, prosentavvik, virkningen på videre forløp og forskriverens valg. Ikke skjul avrunding eller lov urealistisk nøyaktighet.
- Alle nye dosevalg skal føre til en **ny fullstendig beregning helt til målet**, ikke en delplan som stanser ved manglende neste styrke.

### 3.3 Klinisk pragmatisme uten automatiske snarveier

- Et siste trinn fra positiv dose til null er nødvendig ved full seponering. Det er 100 % stopp i **ny tilførsel**, ikke øyeblikkelig 100 % tap av eksponering/virkning. Ikke bruk «100 % av gjenværende dose» som selvstendig avslagskriterium.
- Begrunn siste trinn ut fra absolutt dose, foregående forløp, effektiv halveringstid, aktive metabolitter, vev/depot, reseptor-/virkningsforhold, behandlingsvarighet, tidligere seponeringssymptomer, tilbakefallsrisiko og eventuell dekning av ny etablert behandling. Ikke krev uendelig mikrodosering; ikke anta at lang halveringstid betyr null risiko.
- Lengre doseringsintervall (for eksempel annenhver dag) kan bare tilbys i **konkret kildebegrunnede** tilfeller med hensiktsmessig effektiv PK/PD, enkel dosekalender og forsvarlig etterlevelse; ikke generell erstatning for mindre daglige doser.
- Et planforslag kan ha individuelle **pause-, forlengelses-, tilbakegangs- og revurderingspunkter**. Disse må være forståelige uten at planen later som den kan forutsi pasientrespons. Der nødvendig stopper videre automatisk beregning til en ny faglig beslutning.
- Ved bytte skal **begge** kurvene og eksakt valgt sluttmål kontrolleres: gammel behandling avsluttet og ny dose/depotskjema etablert. Ved tillegg skal eksisterende dose forbli uendret gjennom hele tidslinjen med mindre en særskilt godkjent regel sier noe annet.
- Bevar sikre stopp ved usikker diagnose/indikasjon, kontraindikasjoner, risikoforhold, ukjent svar, utdatert FEST og manglende faglig godkjenning.

## 4. Arbeidspakker og konkrete akseptansekriterier

### K5-D0 – Nytt nullpunkt og prioritering (først, koordinator + QA)

- [ ] Les faktisk `main`, dekningsrapport, K0-01–K0-12, ferdige K1–K4-regler, brukerflate og oppdaterte QA-rapporter. Mål **komplette** planer, ikke antall oppføringer eller grønne tester.
- [ ] Lag en datert matrise for prioriterte, vanlige norske forløp: startvirkestoff, **faktisk startdose**, form, ønsket mål, indikasjon/risikoprofil, plan tilgjengelig ja/nei/ukjent, presis stoppårsak, klinisk kilde og markedsførte norske alternativer. Skill mellom teknisk gjennomførbarhet og klinisk godkjenning.
- [ ] Prioriter etter sannsynlig nytte og dokumenter grunnlaget. Ikke hev at eksempelmengden måler andel pasienter i praksis uten bruksdata. Behold separat full nevner (stoffer/ordnede par) og dose- og pasientvarianter.
- [ ] Definer hvilke **doseintervaller det er faglig realistisk å undersøke først**. Ikke gi dem automatisk godkjent status.

### K5-D1 – Ett felles rammeverk for doseområder (motor, sikkerhet, QA)

- [ ] Kartlegg hva eksisterende regelmodell og beregner allerede støtter. Gjenbruk framfor ny motor. Innfør bare nødvendige egenskaper for klinisk godkjent doseområde, grensetilfeller, stoffspesifikke strategier, behandlingsvarighet og valgbare intervaller.
- [ ] En plan skal deterministisk kunne beregnes fra eksplisitte inndata og godkjent klinisk regel. Hvert dosetrinn og avvik skal kunne forklares. Ingen «automatisk læring» fra allerede godkjente enkeltpasienter.
- [ ] Utvid dose-/preparatberegningen for flere praktiske startdoser, formoverganger, delbarhet, enheter, pakninger, holdbarhet og depotregimer. Unngå generelt skjult avrunding, dag-hopping eller extrapolasjon.
- [ ] Bevar gamle godkjente fingeravtrykk/utfall uendret til eventuell ny regel er særskilt godkjent; sikre atomisk erstatning og nødstopp. Forsøk på utilstrekkelig søk gir `ukjent`, aldri `kan_ikke`.

### K5-D2 – Kliniske utvidelser (fire uavhengige fagspor, etter D1-kontrakt)

Følgende er **undersøkelses- og testkandidater, ikke forhåndsgodkjente doser**. Kildene avgjør hvilke områder som faktisk kan godkjennes.

- [ ] **Nedtrapping (K1):** utvid escitalopram til klinisk forsvarlige vanlige startdoser mellom eksisterende eksempler og vurder sertralin, amitriptylin og senere vortioksetin/paroksetin/venlafaksin der full metode og norske former kan dokumenteres. Evaluer både kort og lang behandlingstid separat, ikke kopier korttidsregelen ukritisk.
- [ ] **Bytte antidepressiv (K2):** generaliser først avgrensede escitalopram/citalopram → sertralin og undersøk sertralin → mirtazapin. Startdoser, måldoser, washout/kryssbytte, symptomer og opptrapping må vurderes per retning. Ikke gi en generell SSRI→SSRI-lisens.
- [ ] **Bytte antipsykotikum (K3):** undersøk flere vanlige olanzapin- og risperidon-startdoser til aripiprazol, og flere forsvarlige peroral→depot-overganger. Depotlikevekt, loading, injeksjonsintervall, tidligere toleranse og interaksjoner må vurderes særskilt; populasjons-PK er ikke individuell doseekvivalens. Ikke anta at oral↔depot eller depot↔depot kan interpoleres lineært.
- [ ] **Kombinere stemningsstabiliserende (K4):** undersøk flere eksisterende norske litium-/valproatformer og doser der tillegg av lamotrigin allerede har et godkjent mønster. Skill praktisk representasjon av **uendret** eksisterende dose fra en reell klinisk endring. Nye kombinasjoner krever egen kildebasert vurdering.
- [ ] For hvert fagspor: minst én **klinisk sammenhengende dosefamilie** (flere reelle startdoser i definert område), eksplisitte eksklusjoner, komplett sluttdose/vedlikehold, positive og negative testkasus og selvstendig klinisk godkjenning av eksakt avtrykk.

### K5-D3 – Uavhengig kvalitetssikring og publisering (etter kliniske PR-er)

- [ ] Automatiske **uavhengige** tester sammenligner hele tidslinjen mot valgt start og sluttmål, på riktig legemiddel, dose, dato, administrasjon og form – ikke bare motorens eget «komplett»-flagg.
- [ ] Test alle relevante markedsførte styrker og utvalgte mellomdoser, nedre/øvre grenser, en dose like utenfor grensene, alder 64/65/66 der dette er klinisk relevant, lang/kort behandling, tidligere symptomer, ukjente svar, interaksjoner, manglende form, utdatert FEST, endret fingeravtrykk, ugyldig tablettdeling og depotfeil.
- [ ] Negative tester må **feile** ved feil måldose, endret eksisterende dose under tillegg, 2,5 ↔ 25 mg, dag 1 ↔ 10, ombyttede stoffkolonner, feil dråpetall eller utløpt åpnet flaske. Test både tabell, kopiert plan og utskrift med to samtidige legemidler.
- [ ] Ingen delplan presenteres som ferdig. En kasus innen godkjent område skal enten ende i verifisert komplett plan eller en presis, dokumentert og faglig korrekt stopp/ukjent-grunn.
- [ ] Kjør syntetiske forløp **i den faktisk deployerte appen**, både større skjerm og mobil, og kontrollér faktisk valgbare former, skjermvisning, kopiering, tilgjengelighet og forbehold. Ikke regn simulert godkjenning som produksjonsbevis.
- [ ] Rapporter dekningsmål før/etter: (i) klinisk godkjente komplette dosefamilier; (ii) antall godkjente startdose-/måldosekasus som gir komplett plan; (iii) spesifikke restgap/årsaker; (iv) dokumentert tilgjengelighet for administratorer versus vanlige klinikere. Manglende tilgang kan ikke markeres ferdig.
- [ ] Kliniker-tilgang utvides bare etter uttrykkelig produktbeslutning og samlet faglig, teknisk og syntetisk produksjonskontroll. Ikke endre synlighetsbryteren som en sideeffekt.

## 5. Arbeidsform og merge-rekkefølge

1. **Koordinatoren** eier startporten, nullpunkt, prioritering, felles avtale mellom fagregler/motor og versjoner/endringslogg. Registrer én samlet fremdriftstavle i denne planen når fasen faktisk starter.
2. **Motor og QA** kan utarbeide kontrakt og uavhengige tester parallelt. Kliniske kildespor K1–K4 kan undersøke og dokumentere doseområder samtidig, men ikke innføre eller godkjenne nye aktive regler uten kontroll.
3. **Fagsporene** skriver i separate avgrensede filer/grener. Ingen parallelle skrivere i felles motor, regelregister, versjonslogg eller denne planen.
4. Lever **få klinisk sammenhengende PR-er**: D0 (grunnlag), D1 (nødvendig felles støtte), én per faglig godkjent dosefamilie eller sammenhengende klinisk pakke, til sist uavhengig integrert QA. Grensesnittforbedringer gjøres bare der konkrete observerte problemer tilsier det; ikke start enda en UX-overhaling.
5. For hver ny klinisk PR: ChatGPT kontrollerer kilder, klinisk logikk, avgrensninger, siste trinn, faktisk FEST-doserbarhet, komplette mål, regresjon og tester. Uten eksakt avtrykk og dokumentert godkjenning skal regelen stoppe. Squash-merge bare etter kontroll, bestått CI og reelle avhengigheter.
6. Etter hver leveranse: oppdater dekningsmatrisen og dokumenterte produksjonskasus. Ikke erklær bred bestilling ferdig bare fordi én første milepæl eller PR-køen er lukket.

## 6. Ferdigkriterium og beslutninger

**Første dosefleksible leveranse:** Minst én klinisk godkjent, generelt beregnbar og komplett dosefamilie i hvert relevant fagspor (K1–K4), med flere vanlige faktiske startdoser innenfor dokumentert område, testede grenseverdier og markedsførte norske preparater. For kombinasjon betyr «dosefamilie» flere forsvarlige representasjoner av eksisterende dose og korrekt nytt vedlikehold, ikke at gammel dose må titreres.

**Opprinnelig bred bestilling:** De vanligste prioriterte norske dose-/byttesituasjonene er vesentlig bedre dekket, med målbar rapport for både hele kombinasjonsrommet og forhåndsdefinerte vanlige kliniske kasus; klinisk begrunnede unntak er synlige; alle fire tjenester er syntetisk verifisert i deployert app med korrekt kopi; det foreligger egen beslutning om ordinær klinikertilgang. Antall PR-er, testgrønnhet eller tilfeldig godkjente eksempelstartdoser er aldri tilstrekkelig alene.

**Prinsipielle avklaringer for Peder:** Be bare om avgjørelser der dokumentasjon og klinisk risiko åpner for reelt forskjellige strategier (for eksempel bredere pasientgruppe, stoppgrense eller doseintervall som ikke kan avgjøres kildebasert), og om utvidet tilgang. Rutinemessig kode, dokumentasjon, tester, preparatvalg innen allerede godkjente rammer og PR-koordinering gjøres av utviklingstrådene.

## 7. Første ordre til Claude Code Projects – brukes først etter startporten

> Les denne planen og gjeldende klinisk leveranseplan, aktuell `main`, ferdige PR-er, dekningsrapport og brukerflyt. Bekreft først at startporten i §1 er oppfylt. Dersom ikke, **ikke start K5-D**; oppgi nøyaktig hva som gjenstår i pågående arbeid. Dersom ja: utfør K5-D0 og legg opp konkrete parallelle, konfliktfrie arbeidsoppgaver for D1 og de fire kliniske sporene. Prioriter generalisering av allerede godkjente strategier fra enkelte eksempelstartdoser til dokumentert forsvarlige doseområder; ingen ny aktiv klinisk regel uten uavhengig signoff for eksakt gyldighetsområde/fingeravtrykk. Registrer status her, opprett avgrensede PR-er, gjennomfør tester og be ChatGPT kontrollere dem før merge. Bevar nødstopper, norske FEST-krav, sluttmål og kopierbar tidslinje. Utfør rutinemessige tekniske valg selv.

**Ikke igangsatt:** Alle sjekklister står åpne. Planen kan og bør revideres mot faktiske resultater fra de pågående arbeidstrådene **når** startporten er nådd; den er ikke en forhåndsgodkjenning av kliniske doseområder.

## 8. Merknader før start (10.11.2026)

Gjennomgang av planen mot det som faktisk er levert på `main` 0b89aad (1.129.2). Endrer ingen sjekkliste over; startporten er vurdert i [leveranseplanen §10.5](verktøy-klinisk-leveranseplan-2026-11.md).

1. **D1 er trolig mest data og klinisk kontroll, lite motor.** Regelmodellen har alt bindende startdosekrav som liste eller intervall og et klinisk omfang per legemiddelform (`klinisk_omfang.tilfeller`), og forhåndskontrollen sier hvilke startdoser som er godkjent. Litium + lamotrigin dekker allerede 1–10 tabletter Lithionit, og paliperidon → Xeplion 3–12 mg. Escitalopram 15 mg stopper i dag fordi omfanget bare har 10 og 20 mg, ikke fordi motoren mangler noe. D1 bør derfor starte som en kort kartlegging i D0 og bli en egen motor-PR bare der en konkret dose ikke kan beregnes eller vises riktig.
2. **D0 gjenbruker det som finnes.** Forløpene i appkontrollen (K0-01–K0-12, H-01–H-48) og P4-fasiten har allerede startdose, form, mål, utfall og stoppgrunn. Nullpunktet bør bygges som et utvalg av omkring 24 prioriterte forløp i samme format, med nye dosevarianter (for eksempel escitalopram 5 og 15 mg, sertralin 50 og 150 mg, olanzapin 10 og 15 mg, risperidon 2 og 6 mg, flere valproatformer), ikke som et nytt verktøy. Utvalget dekker i dag mest K1 og K2; K3 og K4 må få like mange.
3. **Lang behandlingstid er det største kliniske gapet.** Den godkjente escitalopramplanen gjelder bare kort behandlingstid, mens de fleste som trapper ned, har brukt legemidlet i mange måneder eller år. Flere startdoser øker dekningen lite så lenge disse pasientene stopper. Kildearbeidet for en langsommere variant (det finnes et utkast, `seponering-escitalopram-langsom`, som ikke er godkjent) bør derfor gå parallelt med første dosefamilie, og D0 bør vise hvor mange av de prioriterte forløpene som stopper på behandlingstid.
4. **Praktisk form.** Escitalopramplanen fra tablett går over til dråper fra første reduksjon. P5 bør vise om det er akseptabelt i praksis før samme mønster brukes for flere doser.
5. **Måltall.** Dekningen rapporteres både for hele kombinasjonsrommet og for de prioriterte forløpene, og aldri som andel pasienter.

**Anbefalt første kliniske leveranse etter D0:** escitalopram til seponering som dosefamilie 5–20 mg (5, 10, 15 og 20 mg; tablett og dråper), kort behandlingstid, med samme strategi som den godkjente regelen og ny versjon med eget fingeravtrykk og uavhengig klinisk kontroll av hvert nytt trinn. Den gjenbruker godkjente kilder og motor, har lav risiko, og 15 mg er en vanlig dose som stopper i dag. Escitalopram 15 mg → sertralin er den naturlige neste leveransen i K2 med de samme kildene.
