# VDR-4: Stoppmekanismene i de kliniske verktøyene – vurdering av tilgjengelighet og sikkerhet

**Status:** utredning 02.11.2026, **til uavhengig kontroll (ChatGPT)**. Ingen sikkerhetsmekanisme er endret. Ingenting i dette notatet skal implementeres før kontrolløren har tatt stilling til spørsmålene i §9, og hver implementasjon kommer i en egen PR med egen kontroll.

**Knyttet til:** VDR-4 i `docs/verktøy-omlegging-2026-11.md` §6, P5.1 og §9 i `docs/verktøy-p5-beregningsmotor.md` (FEST-ferskhet), P11.6 og §4/§6/§7 i `docs/verktøy-p11-publisering.md` (nødstoppen), testmatrisen i `docs/verktøy-p11-testmatrise.md`.

## 1. Kort svar

| Mekanisme | Er den uforholdsmessig streng? | Anbefaling |
| --- | --- | --- |
| FEST-kopien må være kontrollert de siste 48 timene | **Nei, ikke påvist.** Den stopper først etter to mislykkede netter på rad; alle de 20 siste nattlige kjøringene har gått bra. Men appen kan i dag ikke skille «vi vet at det finnes en nyere FEST-fil vi ikke fikk lest» fra «vi fikk ikke kontakt med FEST». Den daglige tekniske vakten for FEST ser i tillegg ikke ut til å ha kjørt siden 29.09.2026 (§3 pkt. 6). | **Behold 48 timer.** Gjør først feilsituasjonen etterprøvbar og vakten virksom (F4, §4.3). Et gradert vindu med synlig forbehold (F2) legges klart som et mulig senere steg, men anbefales ikke før det finnes data som viser behovet. |
| Sperrene leses hvert minutt, en lesing gjelder i to minutter, og en lesing som feiler, viser ingenting klinisk | **Regelen er riktig, men følgen er unødvendig hard.** Én enkelt mislykket lesing, eller at fanen står skjult i over to minutter (f.eks. mens planen skrives inn i journalen), sletter den beregnede planen for godt. Den kommer ikke tilbake når neste lesing går bra; forskriveren må beregne på nytt. | **Behold regelen** (ingenting klinisk uten en gyldig, fersk lesing). **Endre følgen:** etter et avbrudd uten faktisk sperre beregnes planen automatisk på nytt gjennom den vanlige veien straks en ny lesing er vellykket (S2, §5.3). |
| Kortvarig svikt i nettverk eller datakilder | **Delvis.** Teksten skiller allerede «midlertidig deaktivert» fra «fikk ikke kontrollert», men siden prøver ikke igjen når forbindelsen kommer tilbake, og den sier ikke at årsaken er manglende forbindelse. | Kort automatisk nytt forsøk, ny lesing når nettleseren melder at forbindelsen er tilbake, og en egen tekst for manglende forbindelse (N1, §6). Ingen hurtiglagring av sperrer. |

Samlet: ingen av endringene som anbefales, lar noe klinisk vises uten den samme positive kontrollen som i dag. De gjør bare at en kontroll som lykkes igjen, faktisk gir forskriveren tilbake det hen hadde.

## 2. Hva som stopper verktøyene i dag

| # | Mekanisme | Hvor | Hva den gjør | Gjelder |
| --- | --- | --- | --- | --- |
| K1 | FEST-ferskhet | `festFerskhet` i `src/verktoy/motor/plan.ts`, grensen `FEST_FORELDET_ETTER_TIMER = 48` i `src/legemiddeldata/referanser.ts` | En plan er ikke klinisk når siste vellykkede FEST-kjøring (`kontrollert_kl` = siste `avsluttet_kl` med status `fullfort` eller `uendret`) er mer enn 48 timer gammel. Da vises «Ingen doseplan» med grunnen. | De fire beregningsreglene (Maintena v3, Xeplion v3, sertralin → mirtazapin v9, vortioksetin v11). Ikke fagtekstreglene (bupropion v5, agomelatin v1), som ikke bruker FEST. |
| K2 | Gyldige tidsstempler | samme sted | Kontrolltidspunktet må kunne tolkes og ligge høyst 5 minutter fram i tid; kildedatoen må være gyldig og ikke etter kontrollen. | Som K1 |
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
| **F0** | Behold 48 timer (i dag) | Ingen ny risiko | Verktøyene stopper etter to mislykkede netter, også i helger | **Anbefales nå** sammen med F4 |
| F1 | Hev grensen flatt (f.eks. 96 eller 120 timer) | Tåler en helg uten retting | Bruker en kopi vi kan *vite* er utdatert (ny fil oppdaget, men avvist), uten å si det | Frarådes |
| F2 | Gradert vindu: ≤ 48 t som i dag; 48–96 t bare når ingen nyere FEST-fil er kjent, med et synlig forbehold i planen og i kopien («FEST sist kontrollert …; nyere endringer kan mangle»); > 96 t, eller kjent nyere fil, stopper | Tåler en helg der FEST ikke svarer, uten å skjule usikkerheten | Restrisikoen i 4.1 for en periode på opptil fire døgn; avhenger av F4 for å vite om en nyere fil finnes | **Mulig senere steg**, se 4.4 |
| F3 | Administrator kan forlenge grensen manuelt | Fleksibelt | Gir redaktøren en teknisk beslutning, i strid med VDR-prinsippene | Frarådes |
| **F4** | Gjør feilen etterprøvbar og synlig for teknisk ansvarlig: lagre ETag/kontrollsum og hvor langt kjøringen kom også når den feiler, og få en teknisk vakt som faktisk kjører (§3 pkt. 6) til å si fra etter **første** mislykkede natt, uten å lage en sak for redaktøren | Feil rettes normalt før 48 t på hverdager; grunnlag for å vurdere F2 med data | Ingen klinisk; ingen ny tjeneste (GitHub Actions eller eksisterende planlagt oppgave) | **Anbefales** |

### 4.3 Anbefaling for FEST

Behold 48 timer (F0) og innfør F4. Begrunnelse: ingen avbrudd er observert, verktøyene er ikke akuttverktøy (å stå uten beregning er en trygg feil), og uten F4 kan vi ikke skille en kopi som trolig er gyldig fra en vi vet er utdatert. VDR-planen sier at dagens stoppbetingelser beholdes når en trygg forbedring ikke kan begrunnes.

### 4.4 Når F2 bør vurderes på nytt

Når F4 har gått i minst tre måneder, eller ved første reelle avbrudd der K1 har stoppet en klinisk bruker. F2 forutsetter da at kontrolløren godtar grensen (96 t er foreslått: dekker fredag–mandag), at forbeholdet står i planen, i kopien og i utskriften, og at kjent nyere fil alltid stopper ved 48 t.

## 5. Sperrelesingen (K4 og K5)

### 5.1 Hva regelen beskytter

En administrator som setter en sperre, skal kunne regne med at ingen ny plan vises etter at sperren er satt, og at en plan som står, tas bort innen rundt ett minutt (`docs/verktøy-p11-publisering.md` §6). Uten en fersk, vellykket lesing kan appen ikke vite at det ikke finnes en sperre. Det er riktig å vise ingenting klinisk da. Det skal ikke endres.

### 5.2 Alternativer

| | Alternativ | Gevinst | Risiko | Vurdering |
| --- | --- | --- | --- | --- |
| S0 | Som i dag | – | Planen slettes ved hvert avbrudd (§3 pkt. 5) | – |
| S1 | La en mislykket lesing stå uten følger så lenge forrige vellykkede er under 2 min gammel | Kortvarige feil merkes ikke | En plan kan stå opptil 2 min uten bekreftelse; strider mot akseptkriterium 5 i P11 | Frarådes |
| **S2** | Når planen tas bort på grunn av en feilet eller utløpt lesing, husk at forskriveren hadde beregnet (ikke planen selv). Når en ny lesing er vellykket og ingen sperre for regelen, verktøyet eller alle er sett i mellomtiden, kjøres den vanlige beregningen automatisk på nytt med det samme skjemaet: ny henting fra FEST, ny lesing av sperrene rett før visning, ny kontroll av godkjenning og ferskhet | Forskriveren får planen tilbake uten å gjøre noe; ingen ny sikkerhetslogikk, bare den vanlige veien | Planen kan ha endret seg (f.eks. ny FEST-kopi i mellomtiden), akkurat som ved et nytt trykk på knappen | **Anbefales** |
| S3 | Lengre gyldighet eller sjeldnere lesing (f.eks. 5–10 min) | Litt færre kall | Lengre tid før en sperre virker på en åpen side | Frarådes; lesingen er billig |
| S4 | Lagre siste kjente sperrer i nettleseren og bruk dem uten forbindelse | Virker uten nett | Kan ikke bevise at ingen ny sperre er satt; vil gjenåpne uten positivt grunnlag | **Frarådes klart** |
| S5 | Sanntidsabonnement på sperrene i tillegg til lesingen | Sperrer virker på sekunder | Mer kompleksitet; må uansett falle tilbake til lesing | Ikke nødvendig nå |

Avgrensninger for S2:

- Gjelder bare avbrudd fordi sperrene ikke kunne leses eller lesingen var for gammel. Har en sperre som gjelder regelen eller verktøyet vært aktiv, også om den er opphevet senere, kreves et nytt trykk på knappen, som i dag.
- Gjelder bare så lenge siden står åpen. Etter en oppdatering av appen eller en ny innlasting må planen beregnes på nytt, som i dag; planen og «hadde beregnet» lagres aldri.
- Gjelder bare når skjemaet er uendret siden beregningen.
- Mens avbruddet varer, er det ingen plan på skjermen og ingen beregning i gang.

## 6. Kortvarig svikt i nettverk og datakilder (N1)

1. **Kort automatisk nytt forsøk.** Når en lesing av sperrene feiler, prøv igjen etter ca. 5 og 15 sekunder før det neste vanlige minuttet. Til en av dem lykkes, vises ingenting klinisk, som i dag.
2. **Les med en gang når forbindelsen kommer tilbake** (nettleserens `online`-hendelse), i tillegg til fokus og synlighet.
3. **Egen tekst for manglende forbindelse.** Når nettleseren melder at den er uten nett, eller kallet ikke nådde serveren: «Ingen forbindelse. Verktøyet viser ingen doseplan eller fagtekst før forbindelsen er tilbake.» Ellers står dagens tekst. Teksten om en faktisk sperre («Midlertidig deaktivert …», med hvem, når og hvorfor) brukes bare når en vellykket lesing har funnet en sperre, som i dag.
4. **FEST-hentingen ved beregning (K6)** får ett automatisk nytt forsøk etter et par sekunder før feilen vises. Ingenting annet endres.

Ingen av punktene viser noe klinisk uten en vellykket lesing, og ingen av dem gjenåpner en sperret regel.

## 7. Det som ikke foreslås endret

- 15 s frist per lesing, 60 s lesefrekvens og 2 min gyldighet.
- At fagtekst også skjules når sperrene ikke kan leses (en sperre kan settes nettopp fordi fagteksten er feil, se F03/F04 i testmatrisen).
- At en plan forsvinner når dagen skifter i Norge (K3), og kravene til gyldige tidsstempler (K2).
- At en faktisk sperre tar bort planen med en gang, og at planen må beregnes på nytt etter at en sperre er opphevet.
- Nødstoppens database, rettigheter og historikk.

## 8. Testtilfeller

Alle med syntetiske data og kontrollert klokke, i `verktoyside.test.tsx`, `verktoyregister.test.ts` og testmatrisen. Eksisterende tester for nødstoppen (V36, V37, S19, M18, X20, F03, F04 og «nødstoppen (P11.6)») skal stå uendret og fortsatt bestå.

**K1 / F0 (uendret atferd, låses fast før F4/F2):**

| ID | Tilstand | Forventet |
| --- | --- | --- |
| T-F1 | Kontrollert for 47 t 59 min 59 s siden | Plan |
| T-F2 | Nøyaktig 48 t | Plan (grensen er «mer enn 48 timer») |
| T-F3 | 48 t + 1 s | Ingen plan, med grunnen om FEST |
| T-F4 | Plan står, klokken passerer 48 t | Planen tas bort innen ett minutt |
| T-F5 | Kontrollert 5 min + 1 s fram i tid | Ingen plan |

**F4:** en kjøring som feiler etter at ny ETag er sett, lagrer ETag og «ny fil kjent»; en som feiler før svar, lagrer «ukjent»; den tekniske vakten melder etter første mislykkede natt, og en ende-til-ende-prøve viser at den faktisk kjører og når fram; ingenting av dette vises for forskriveren eller redaktøren.

**F2 (bare om kontrolløren godtar det senere):** 48 t + 1 s med «ny fil kjent» → ingen plan; 48 t + 1 s med «ukjent» → plan med forbehold i skjerm, kopi og utskrift; 96 t + 1 s → ingen plan; forbeholdet forsvinner når en ny kjøring er vellykket.

**S2:**

| ID | Hendelsesforløp | Forventet |
| --- | --- | --- |
| T-S1 | Plan → én lesing feiler → neste lesing vellykket uten sperrer | Ingen plan mens lesingen er feilet; deretter ny henting fra FEST, ny sperrelesing og planen vises igjen |
| T-S2 | Plan → fanen skjult > 2 min → synlig, lesing vellykket | Som T-S1 |
| T-S3 | Plan → lesing feiler → neste lesing finner en sperre for regelen | Ingen plan; «Midlertidig deaktivert» |
| T-S4 | Plan → sperre satt → sperre opphevet | Ingen automatisk ny plan; knappen må trykkes (som i dag) |
| T-S5 | Plan → lesing feiler → en sperre for regelen settes og oppheves før neste vellykkede lesing | Den automatiske beregningen leser sperrene på nytt rett før visning og ser sperren hvis den fortsatt er aktiv; er den opphevet, er dette det samme som et trykk på knappen etter opphevingen (kan ikke skilles, se spørsmål 3) |
| T-S6 | Plan → lesing feiler → forskriveren endrer et felt → lesing vellykket | Ingen automatisk beregning |
| T-S7 | Plan → lesing feiler → ny innlasting av appen | Ingen plan og ingen automatisk beregning; feltene står |
| T-S8 | Plan → lesing feiler → FEST er blitt eldre enn 48 t før lesingen lykkes | Ny beregning gir «Ingen doseplan» med grunnen om FEST |
| T-S9 | Plan → lesing feiler → dagen skifter → lesing vellykket | Ny beregning med dagens dato |
| T-S10 | Plan → lesing feiler → lesing henger i 15 s → vellykket | Ingen plan før den vellykkede; så som T-S1 |

**N1:** `online`-hendelse gir en lesing med en gang; nye forsøk etter 5 og 15 s, og ingen plan før ett av dem lykkes; uten nett vises teksten om manglende forbindelse og aldri «Midlertidig deaktivert»; en vellykket lesing med en sperre viser alltid sperreteksten, også rett etter et avbrudd; FEST-hentingen prøves én gang til før feilen vises.

## 9. Spørsmål til kontrolløren

Svar gjerne per punkt: *godtatt*, *godtatt med endring* eller *ikke godtatt*.

1. **K1/F0/F4.** Er det riktig å beholde 48 timer som hard grense nå, og å innføre F4 (lagre om en nyere FEST-fil er kjent ved feil, og teknisk melding etter første mislykkede natt) før en eventuell gradering?
2. **F2.** Er et gradert vindu på høyst 96 timer, bare når ingen nyere fil er kjent og med synlig forbehold, prinsipielt akseptabelt å vurdere senere, gitt risikoene i §4.1? Eller skal 48 timer være endelig?
3. **S2.** Er det akseptabelt at planen beregnes automatisk på nytt, gjennom den vanlige veien, etter et avbrudd i sperrelesingen, med avgrensningene i §5.2? Er T-S5 akseptabel som beskrevet: appen kan ikke se en sperre som ble satt og opphevet mens den var uten forbindelse, akkurat som i dag?
4. **S2, alternativ.** Foretrekker du i stedet at planen ikke kommer tilbake av seg selv, men at siden bare sier «Planen ble tatt bort fordi kontrollen ikke svarte. Beregn på nytt.»?
5. **N1.** Er nye forsøk etter 5 og 15 s, lesing ved `online` og en egen tekst for manglende forbindelse akseptabelt?
6. **S1, S3, S4.** Er du enig i at disse ikke skal innføres?
7. **K6.** Er ett automatisk nytt forsøk på FEST-hentingen akseptabelt?
8. **Akseptkriterium 5 i P11.** Bør kriteriet få et tillegg om at en plan kan beregnes automatisk på nytt etter et avbrudd uten sperre (S2), eller skal S2 behandles som en egen akseptert endring?

## 10. Videre gang

Etter kontrollørens svar: én PR for S2 og N1 (verktøysiden, testene over og oppdatering av §4 og §7 i `docs/verktøy-p11-publisering.md`), og én PR for F4 (FEST-synkroniseringen, «Datakilder» og den tekniske vakten). F2 bare etter et nytt, særskilt ja. Ingen endring i godkjenninger, regelversjoner, fingeravtrykk eller nødstoppens database.
