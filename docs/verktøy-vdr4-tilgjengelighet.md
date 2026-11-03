# VDR-4: Stoppmekanismene i de kliniske verktøyene – vurdering av tilgjengelighet og sikkerhet

**Status:** utredning 02.11.2026. Den uavhengige kontrolløren (ChatGPT) har tatt stilling 03.11.2026, og beslutningene står i §9. Notatet er oppdatert etter dem: 48 timer beholdes, F4, N1 og K6 er godtatt, mens F2 og den automatiske nyberegningen (S2) er avvist. Ingen sikkerhetsmekanisme er endret i denne PR-en. Hver implementasjon kommer i en egen PR med egen kontroll. Godkjenningen gjelder bare det avgrensede designgrunnlaget.

**Knyttet til:** VDR-4 i `docs/verktøy-omlegging-2026-11.md` §6, P5.1 og §9 i `docs/verktøy-p5-beregningsmotor.md` (FEST-ferskhet), P11.6 og §4/§6/§7 i `docs/verktøy-p11-publisering.md` (nødstoppen), testmatrisen i `docs/verktøy-p11-testmatrise.md`.

## 1. Kort svar

| Mekanisme | Er den uforholdsmessig streng? | Anbefaling |
| --- | --- | --- |
| FEST-kopien må være kontrollert de siste 48 timene | **Nei, ikke påvist.** Den stopper først etter to mislykkede netter på rad; alle de 20 siste nattlige kjøringene har gått bra. Men appen kan i dag ikke skille «vi vet at det finnes en nyere FEST-fil vi ikke fikk lest» fra «vi fikk ikke kontakt med FEST». Den daglige tekniske vakten for FEST ser i tillegg ikke ut til å ha kjørt siden 29.09.2026 (§3 pkt. 6). | **Behold 48 timer som hard grense.** Gjør feilsituasjonen etterprøvbar og vakten virksom, med ende-til-ende-test av at varselet når fram (F4, §4.3). Et gradert vindu (F2) er avvist av kontrolløren. |
| Sperrene leses hvert minutt, en lesing gjelder i to minutter, og en lesing som feiler, viser ingenting klinisk | **Regelen er riktig, men følgen er unødvendig hard.** Én enkelt mislykket lesing, eller at fanen står skjult i over to minutter (f.eks. mens planen skrives inn i journalen), sletter den beregnede planen for godt. Den kommer ikke tilbake når neste lesing går bra; forskriveren må beregne på nytt. | **Behold regelen** (ingenting klinisk uten en gyldig, fersk lesing). **Gjør følgen forståelig:** når en ny lesing er vellykket etter et avbrudd uten faktisk sperre, sier siden at planen ble tatt bort fordi sikkerhetskontrollen ikke svarte, og knappen for å beregne på nytt er aktiv (S6, §5.2). Ingen automatisk ny plan. |
| Kortvarig svikt i nettverk eller datakilder | **Delvis.** Teksten skiller allerede «midlertidig deaktivert» fra «fikk ikke kontrollert», men siden prøver ikke igjen når forbindelsen kommer tilbake, og den sier ikke at årsaken er manglende forbindelse. | Kort automatisk nytt forsøk, ny lesing når nettleseren melder at forbindelsen er tilbake, og en egen tekst for manglende forbindelse (N1, §6). Ingen hurtiglagring av sperrer. |

Samlet: ingen av endringene som er godtatt, lar noe klinisk vises uten den samme positive kontrollen som i dag. De gjør avbrudd forståelige og kortere, og en ny plan kommer bare når forskriveren selv ber om den.

## 2. Hva som stopper verktøyene i dag

| # | Mekanisme | Hvor | Hva den gjør | Gjelder |
| --- | --- | --- | --- | --- |
| K1 | FEST-ferskhet | `festFerskhet` i `src/verktoy/motor/plan.ts`, grensen `FEST_FORELDET_ETTER_TIMER = 48` i `src/legemiddeldata/referanser.ts` | En plan er ikke klinisk når siste vellykkede FEST-kjøring (`kontrollert_kl` = siste `avsluttet_kl` med status `fullfort` eller `uendret`) er mer enn 48 timer gammel. Da vises «Ingen doseplan» med grunnen. | De fire beregningsreglene (Maintena v3, Xeplion v3, sertralin → mirtazapin v9, vortioksetin v11). Ikke fagtekstreglene (bupropion v5, agomelatin v1), som ikke bruker FEST. |
| K2 | Gyldige tidsstempler | samme sted | Kontrolltidspunktet må kunne tolkes og ligge høyst 5 minutter fram i tid; kildedatoen må være en gyldig dato og ikke senere enn kalenderdatoen (UTC) for kontrolltidspunktet + 24 timer. Den ene dagens slingring er der fordi kontrolltidspunktet kan være skrevet i en annen tidssone enn kildedatoen; en kildedato dagen etter kontrollen godtas altså. | Som K1 |
| K3 | Plan som står | `gjelderFortsatt` i `src/verktoy/doseplan.ts`, kontrollert hvert minutt | En vist plan tas bort når K1 slår ut eller dagen i Norge skifter (markedsstatusen gjelder én dato). | Som K1 |
| K4 | Sperrelesing | `src/verktoy/sperrer.ts`, `useSperrer` i `src/components/verktoy/Verktoyside.tsx` | Sperrene leses ved åpning, hvert minutt mens fanen er synlig, og når fanen får fokus. En lesing som ikke svarer innen 15 s, har feilet. En vellykket lesing gjelder i 2 min; etter det, eller når en lesing feiler, vises verken beregning eller fagtekst. | Alle seks godkjente regler, også fagtekst |
| K5 | Ny lesing før plan | `beregn` i `Beregningsdel` | Sperrene leses på nytt etter at FEST er hentet og rett før en plan vises. | Beregningsreglene |
| K6 | FEST-lesing ved beregning | `beregn` → `les_legemidler` | Feiler hentingen, står «Fikk ikke hentet preparatene fra FEST» til forskriveren trykker «Beregn doseplan» igjen. | Beregningsreglene |

Disse er i tillegg til de kliniske sperrene som ikke vurderes her: godkjenning med fingeravtrykk, klinisk omfang, syntetiske regler og preparater, og selve nødstoppen (sperrene en administrator setter). De skal ikke endres i VDR-4.

## 3. Hva som faktisk er observert

1. **FEST-synkroniseringen er stabil.** De 20 siste kjøringene (alt `legemiddeldata_status` gir; 14.10.–02.11.2026) gikk alle bra, hver natt kl. 04:15:05–04:15:07 UTC. To av dem lastet inn et nytt uttrekk (kildedato 08.10. lastet 14.10., kildedato 27.10. lastet 30.10.); de øvrige 18 var `uendret`. Lengre historikk er ikke lest i denne utredningen (ingen lesetilgang til tabellen herfra). Det er altså **ikke observert** noen gang at K1 har stoppet verktøyene.
2. **Hva 48 timer betyr i praksis.** Kjøringen går hver natt, så grensen tåler én mislykket natt og slår ut i løpet av den andre. Feiler både fredag og lørdag natt, er beregningene utilgjengelige fra natt til søndag til noen retter feilen. Et ubetydelig grensetilfelle: er siste vellykkede kjøring `uendret` (ferdig ca. 04:15:06) og neste etter en mislykket natt `fullfort` (ferdig ca. 04:15:57), er kopien i underkant av ett minutt over grensen midt på natten.
3. **48 timer måler når kopien sist ble bekreftet, ikke hvor gammelt innholdet er.** FEST publiseres omtrent to ganger i måneden. Når synken feiler, er kopien bare utdatert hvis FEST har publisert noe nytt i mellomtiden. Ved en feil lagres i dag hverken ETag eller kontrollsum (`lager.avbryt` i `src/legemiddeldata/synk.ts` får bare feilteksten), så appen kan ikke se om feilen skjedde *etter* at en ny fil var oppdaget (da vet vi at kopien er utdatert) eller *før* (da vet vi ikke).
4. **Ingen klinisk bruk ennå.** Verktøyene er bare synlige for administratorer fra 1.117.4. Det finnes ingen innmeldte avbrudd og ingen måling i nettleseren av hvor ofte sperrelesingen feiler. Vurderingen av K4 bygger derfor på koden og på en prøvekjøring, ikke på bruksdata.
5. **Prøvekjøring av verktøysiden** (jsdom, samme oppsett som `src/__tests__/verktoyside.test.tsx`, med en regel godkjent bare i testen; testen ble ikke lagt inn):
   - *Fanen skjult i over to minutter, alle lesinger vellykkede, hver lesing tar 300 ms:* ved utløpet viser siden «Kontrollerer om verktøyet er tilgjengelig …», planen forsvinner, og når lesingen er vellykket, står skjemaet der med alt som var fylt inn, **men uten plan**. Forskriveren må trykke «Beregn doseplan» igjen.
   - *Én lesing feiler, neste ett minutt senere er vellykket:* planen forsvinner ved feilen og kommer **ikke** tilbake etter den vellykkede lesingen; knappen «Beregn doseplan» er tilbake.
   - Årsaken er at hele beregningsdelen fjernes mens sperrene er ukontrollert eller hentes, og planen bare lever i den. Fagtekst kommer tilbake av seg selv, fordi den ikke er en beregning.
6. **Den tekniske vakten for FEST virker trolig ikke.** `docs/legemiddeldata.md` sier at en daglig Claude-rutine sier fra når siste kjøring feilet. Den planlagte oppgaven («FEST-synk: daglig vakt», kl. 06:07 UTC) står som aktiv, men har ifølge planleggeren sist kjørt 29.09.2026. Den leser kjøringene med Supabase `execute_sql`, som ble avvist med manglende tillatelse i denne utredningen. I dag er det altså sannsynligvis bare «Datakilder» i adminmenyen som viser en mislykket natt, og bare om noen ser der. Dette er ikke endret her, men er en del av F4 (§4.2).
7. **Realistiske utløsere** i en lukket app på sykehus- eller hjemmenett: bytte til journalsystemet for å skrive inn planen i mer enn to minutter, maskinen går i dvale, bytte av trådløst nett, et kort avbrudd hos Supabase, eller at innloggingen fornyes. Ingen av dem er en sikkerhetshendelse, men alle sletter planen.

## 4. FEST-ferskhet (K1)

### 4.1 Hva som kan bli utdatert, og hvilken vei feilen går

| Endring i FEST som en eldre kopi kan mangle | Mulig følge i en plan | Retning | Hva begrenser det i dag |
| --- | --- | --- | --- |
| Nytt preparat eller ny styrke | Færre valg; en plan kan stoppe eller bruke flere tabletter enn nødvendig | Trygg | – |
| Nylig meldt avregistrering eller midlertidig utgått | Planen kan foreslå et preparat som ikke lenger markedsføres | Praktisk, ikke dosering | Hver plan sier at FEST ikke er lagerstatus. Avregistreringer som allerede står med dato i kopien, vurderes mot dagens dato (`statusdato`), uansett kopiens alder. |
| Endret delbarhet for et preparat | Planen kan foreslå å dele en tablett som ikke lenger skal deles | Dosering | Sjelden; ikke kvantifisert her |
| Endret godkjenningsfritak eller registreringsstatus | Feil grunnlag for valget av preparat | Praktisk | Fritak brukes bare etter uttrykkelig valg |
| Endret styrke eller legemiddelform for samme merkevare-ID | Feil mg per enhet | Dosering | Ikke undersøkt hvor ofte dette skjer; antas sjeldent, men er ikke dokumentert |

Den alvorligste feiltypen (feil mg eller deling) forutsetter både en ny FEST-publisering i perioden kopien er gammel *og* en endring akkurat i de få preparatene de fire beregningsreglene bruker (sertralin, mirtazapin, vortioksetin, aripiprazol depot og paliperidon depot).

### 4.2 Alternativer

| | Alternativ | Gevinst | Risiko | Vurdering |
| --- | --- | --- | --- | --- |
| **F0** | Behold 48 timer (i dag) | Ingen ny risiko | Verktøyene stopper etter to mislykkede netter, også i helger | **Godtatt av kontrolløren** sammen med F4 |
| F1 | Hev grensen flatt (f.eks. 96 eller 120 timer) | Tåler en helg uten retting | Bruker en kopi vi kan *vite* er utdatert (ny fil oppdaget, men avvist), uten å si det | Frarådes |
| F2 | Gradert vindu: ≤ 48 t som i dag; 48–96 t bare når ingen nyere FEST-fil er kjent, med et synlig forbehold i planen og i kopien; > 96 t, eller kjent nyere fil, stopper | Tåler en helg der FEST ikke svarer | At ingen nyere fil er *kjent*, dokumenterer ikke at ingen nyere fil *finnes*; restrisikoen i 4.1 i opptil fire døgn | **Avvist av kontrolløren** (§9 pkt. 2) |
| F3 | Administrator kan forlenge grensen manuelt | Fleksibelt | Gir redaktøren en teknisk beslutning, i strid med VDR-prinsippene | Frarådes |
| **F4** | Gjør feilen etterprøvbar og synlig for teknisk ansvarlig: lagre ETag/kontrollsum og hvor langt kjøringen kom også når den feiler, og få en teknisk vakt som faktisk kjører (§3 pkt. 6) til å si fra etter **første** mislykkede natt, uten å lage en sak for redaktøren | Feil rettes normalt før 48 t på hverdager; driftsdata om feilene | Ingen klinisk; ingen ny tjeneste (GitHub Actions eller eksisterende planlagt oppgave) | **Godtatt**, med ende-til-ende-test av at varselet når mottakeren |

### 4.3 Anbefaling for FEST

Behold 48 timer som hard grense (F0) og innfør F4. Begrunnelse: ingen avbrudd er observert, verktøyene er ikke akuttverktøy (å stå uten beregning er en trygg feil), og VDR-planen sier at dagens stoppbetingelser beholdes når en trygg forbedring ikke kan begrunnes. Kontrolløren har godtatt dette (§9 pkt. 1).

### 4.4 F2 er avvist

Kontrolløren avviste F2 både for innføring og som forhåndsgodkjent unntak: at ingen nyere FEST-fil er *kjent*, er ikke dokumentasjon for at ingen nyere fil finnes. Vurderingen kan bare gjenåpnes dersom driftsdata og kildekontroll viser en sikker metode, og da som en ny sak til kontroll. Inntil da gjelder 48 timer. F4 lagrer om en nyere fil er kjent som driftsdata, ikke som grunnlag for å la en eldre kopi gi en plan.

## 5. Sperrelesingen (K4 og K5)

### 5.1 Hva regelen beskytter

En administrator som setter en sperre, skal kunne regne med at ingen ny plan vises etter at sperren er satt, og at en plan som står, tas bort innen rundt ett minutt (`docs/verktøy-p11-publisering.md` §6). Uten en fersk, vellykket lesing kan appen ikke vite at det ikke finnes en sperre. Det er riktig å vise ingenting klinisk da. Det skal ikke endres.

### 5.2 Alternativer

| | Alternativ | Gevinst | Risiko | Vurdering |
| --- | --- | --- | --- | --- |
| S0 | Som i dag | – | Planen slettes ved hvert avbrudd (§3 pkt. 5) | – |
| S1 | La en mislykket lesing stå uten følger så lenge forrige vellykkede er under 2 min gammel | Kortvarige feil merkes ikke | En plan kan stå opptil 2 min uten bekreftelse; strider mot akseptkriterium 5 i P11 | Frarådes |
| S2 | Beregn planen automatisk på nytt, gjennom den vanlige veien, når en ny lesing er vellykket etter et avbrudd uten sperre | Forskriveren får en plan uten å gjøre noe | En ny plan kan avvike fra den forskriveren så før avbruddet (f.eks. ny FEST-kopi), og den kommer uten et nytt brukerinitiativ; mindre forutsigbart i en klinisk arbeidsflyt | **Avvist av kontrolløren** (§9 pkt. 3–4) |
| **S6** | Når planen er tatt bort fordi sperrene ikke kunne leses eller lesingen var for gammel, og en ny lesing så er vellykket uten sperre for regelen eller verktøyet: vis «Planen ble tatt bort fordi sikkerhetskontrollen ikke svarte. Beregn på nytt.» ved den aktive knappen «Beregn doseplan». Feltene står som før | Forskriveren forstår hva som skjedde og kan beregne med ett trykk | Ingen ny; ingen plan vises uten nytt trykk og full ny kontroll | **Godtatt av kontrolløren** (§9 pkt. 4) |
| S3 | Lengre gyldighet eller sjeldnere lesing (f.eks. 5–10 min) | Litt færre kall | Lengre tid før en sperre virker på en åpen side | Frarådes; lesingen er billig |
| S4 | Lagre siste kjente sperrer i nettleseren og bruk dem uten forbindelse | Virker uten nett | Kan ikke bevise at ingen ny sperre er satt; vil gjenåpne uten positivt grunnlag | **Frarådes klart** |
| S5 | Sanntidsabonnement på sperrene i tillegg til lesingen | Sperrer virker på sekunder | Mer kompleksitet; må uansett falle tilbake til lesing | Ikke nødvendig nå |

Avgrensninger for S6:

- Meldingen gjelder bare avbrudd fordi sperrene ikke kunne leses eller lesingen var for gammel. Finner en lesing en sperre for regelen eller verktøyet, vises sperremeldingen som i dag, ikke denne.
- Meldingen vises først når en ny lesing er vellykket. Mens avbruddet varer, vises dagens tekst (eller teksten for manglende forbindelse, §6), uten plan og uten knapp.
- Meldingen forsvinner når forskriveren beregner på nytt eller endrer et felt. Den lagres ikke og står ikke etter en ny innlasting av appen.
- Ingen beregning starter av seg selv.

Skal en automatisk løsning utredes senere, må den etter kontrollørens krav skille en uendret plan fra en endret plan og aldri gjenbruke gamle sperredata. Det er ikke en del av denne planen.

## 6. Kortvarig svikt i nettverk og datakilder (N1)

1. **Kort automatisk nytt forsøk.** Når en lesing av sperrene feiler, prøv igjen etter ca. 5 og 15 sekunder før det neste vanlige minuttet. Til en av dem lykkes, vises ingenting klinisk, som i dag.
2. **Les med en gang når forbindelsen kommer tilbake** (nettleserens `online`-hendelse), i tillegg til fokus og synlighet.
3. **Egen tekst for manglende forbindelse.** Når nettleseren melder at den er uten nett, eller kallet ikke nådde serveren: «Ingen forbindelse. Verktøyet viser ingen doseplan eller fagtekst før forbindelsen er tilbake.» Ellers står dagens tekst. Teksten om en faktisk sperre («Midlertidig deaktivert …», med hvem, når og hvorfor) brukes bare når en vellykket lesing har funnet en sperre, som i dag.
4. **FEST-hentingen ved beregning (K6)** får ett automatisk nytt forsøk etter et par sekunder før feilen vises. Forsøket er en del av beregningen forskriveren selv startet, og en plan vises aldri på data som ikke er verifisert (ferskhet, godkjenning og ny sperrelesing kontrolleres som før). Ingenting annet endres.

Ingen av punktene viser noe klinisk før en fersk sperrelesing er vellykket, og ingen av dem gjenåpner en sperret regel. Kontrolløren har godtatt N1 og K6 (§9 pkt. 5 og 7).

## 7. Det som ikke foreslås endret

- 15 s frist per lesing, 60 s lesefrekvens og 2 min gyldighet.
- 48 timer som hard grense for FEST (F1 og F2 er avvist).
- Akseptkriterium 5 i P11: en plan står aldri uten fersk sperrelesing (§9 pkt. 8).
- At fagtekst også skjules når sperrene ikke kan leses (en sperre kan settes nettopp fordi fagteksten er feil, se F03/F04 i testmatrisen).
- At en plan forsvinner når dagen skifter i Norge (K3), og kravene til gyldige tidsstempler (K2).
- At en faktisk sperre tar bort planen med en gang, og at planen må beregnes på nytt etter at en sperre er opphevet.
- Nødstoppens database, rettigheter og historikk.

## 8. Testtilfeller

Alle med syntetiske data og kontrollert klokke, i `verktoyside.test.tsx`, `verktoyregister.test.ts` og testmatrisen. Eksisterende tester for nødstoppen (V36, V37, S19, M18, X20, F03, F04 og «nødstoppen (P11.6)») skal stå uendret og fortsatt bestå.

**K1 / F0 (uendret atferd, låses fast før F4):**

| ID | Tilstand | Forventet |
| --- | --- | --- |
| T-F1 | Kontrollert for 47 t 59 min 59 s siden | Plan |
| T-F2 | Nøyaktig 48 t | Plan (grensen er «mer enn 48 timer») |
| T-F3 | 48 t + 1 s | Ingen plan, med grunnen om FEST |
| T-F4 | Plan står, klokken passerer 48 t | Planen tas bort innen ett minutt |
| T-F5 | Kontrollert 5 min + 1 s fram i tid | Ingen plan |
| T-F6 | Kontrollert 2026-11-02T00:00:00Z, kildedato 2026-11-03 | Plan (innenfor dagens slingring) |
| T-F7 | Kontrollert 2026-11-02T00:00:00Z, kildedato 2026-11-04 | Ingen plan, kildedatoen ligger etter kontrollen |

**F4:** en kjøring som feiler etter at ny ETag er sett, lagrer ETag og «ny fil kjent»; en som feiler før svar, lagrer «ukjent»; ingen av dem endrer `kontrollert_kl` eller 48-timersgrensen; den tekniske vakten melder etter første mislykkede natt; ingenting av dette vises for forskriveren eller redaktøren. **Ende-til-ende (krav fra kontrolløren):** en kontrollert, syntetisk mislykket kjøring utenom klinisk bruk skal gi et varsel som dokumentert når mottakeren, og resultatet føres i fremdriftsloggen. Uten bestått ende-til-ende-prøve omtales vakten ikke som virksom.

**S6:**

| ID | Hendelsesforløp | Forventet |
| --- | --- | --- |
| T-S1 | Plan → én lesing feiler → neste lesing vellykket uten sperrer | Mens lesingen er feilet: dagens tekst, ingen plan, ingen knapp. Deretter «Planen ble tatt bort fordi sikkerhetskontrollen ikke svarte. Beregn på nytt.», aktiv knapp, **ingen plan** og ingen henting fra FEST før knappen trykkes |
| T-S2 | Plan → fanen skjult > 2 min → synlig, lesing vellykket | Som T-S1 |
| T-S3 | Plan → lesing feiler → neste lesing finner en sperre for regelen | «Midlertidig deaktivert», ingen plan og ikke meldingen fra T-S1 |
| T-S4 | Plan → sperre satt → sperre opphevet | Som i dag: ingen plan, knappen må trykkes; ikke meldingen fra T-S1 |
| T-S5 | T-S1, så trykk på «Beregn doseplan» | Full ny beregning (FEST, sperrelesing rett før visning, ferskhet, godkjenning); meldingen forsvinner |
| T-S6 | T-S1, så endrer forskriveren et felt | Meldingen forsvinner; ingen beregning |
| T-S7 | T-S1, så ny innlasting av appen | Feltene står; ingen plan og ingen melding |
| T-S8 | Ingen plan beregnet → lesing feiler → vellykket | Ingen melding (det var ingen plan å ta bort) |
| T-S9 | Plan → lesing henger i 15 s → vellykket | Ingen plan etter fristen; så som T-S1 |

**N1 og K6:** `online`-hendelse gir en lesing med en gang; nye forsøk etter 5 og 15 s, og ingenting klinisk før ett av dem lykkes; uten nett vises teksten om manglende forbindelse og aldri «Midlertidig deaktivert»; en vellykket lesing med en sperre viser alltid sperreteksten, også rett etter et avbrudd; FEST-hentingen prøves én gang til før feilen vises, og en plan etter det nye forsøket kontrolleres for ferskhet, godkjenning og sperrer som alle andre (med FEST eldre enn 48 t gir det nye forsøket «Ingen doseplan»).

## 9. Kontrollørens beslutninger (ChatGPT, 03.11.2026)

Beslutningene ble gitt på spørsmålene i den første versjonen av dette notatet og er ført inn i §1–8 over.

| # | Spørsmål | Beslutning |
| --- | --- | --- |
| 1 | K1/F0/F4: behold 48 t og innfør F4 | **Godtatt.** 48 t er hard grense. F4 må ha en ende-til-ende-test av at varselet når mottakeren. |
| 2 | F2: gradert vindu på høyst 96 t | **Ikke godtatt**, verken for innføring eller som forhåndsgodkjent sikkerhetsunntak. At ingen nyere fil er kjent, er ikke dokumentasjon for at ingen nyere fil finnes. Kan gjenåpnes bare dersom driftsdata og kildekontroll viser en sikker metode. |
| 3–4 | S2: automatisk ny beregning etter avbrudd, eller bare en melding | **S2 ikke godtatt.** Valgt: tydelig «Planen ble tatt bort fordi sikkerhetskontrollen ikke svarte. Beregn på nytt» med aktiv knapp (S6). En automatisk løsning må, om den utredes senere, skille uendret fra endret plan og aldri gjenbruke gamle sperredata. |
| 5 | N1: nye forsøk etter 5/15 s, lesing ved gjenopprettet forbindelse, egen feilmelding | **Godtatt.** Ingen klinisk informasjon før en vellykket fersk sperrelesing. |
| 6 | S1, S3, S4 (bufrede sperrer) | **Avvist**, som anbefalt. |
| 7 | K6: ett automatisk nytt forsøk på FEST-hentingen | **Godtatt**, men aldri visning av plan på uverifiserte data. |
| 8 | Akseptkriterium 5 i P11 | **Uendret.** En plan står aldri uten fersk sperrelesing. |

## 10. Videre gang

Hver del gjennomføres i en egen PR med egen kontroll, og ingen PR slås sammen uten kontrollørens godkjenning:

1. **S6, N1 og K6** (verktøysiden og testene i §8, og oppdatering av §4 og §7 i `docs/verktøy-p11-publisering.md`).
2. **F4** (FEST-synkroniseringen, «Datakilder», en teknisk vakt som faktisk kjører, og ende-til-ende-prøven).

F2 og S2 gjennomføres ikke. Ingen endring i godkjenninger, regelversjoner, fingeravtrykk, 48-timersgrensen eller nødstoppens database.
