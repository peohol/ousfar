# OUSFAR – P0: hvordan verktøyene faktisk virker i den publiserte appen

**Dato:** 06.11.2026  
**Status:** P0-rapport etter [produktrevisjonsplanen](verktøy-produktrevisjon-2026-11.md). Ingen regel, dose, godkjenning, sperre eller skjerm er endret. Rapporten er **ikke** en klinisk godkjenning; de kliniske vurderingene i §6 er forslag til uavhengig kontroll.  
**Testet:** https://ousfar.vercel.app, versjon **1.126.3** (main `ffe0785`), innlogget som administrator, i Chromium med Playwright, 06.11.2026 ca. 09:05–10:00 UTC. FEST-uttrekk 27.10.2026, kontrollert av appen 06.11.2026 04:15 UTC. Bare syntetiske pasienter, og ingenting er lagret i appen.  
**Reproduksjon:** `node scripts/verktoy-p0-app.mjs [id …]` kjører forløpene i [`scripts/verktoy-p0-forlop.json`](../scripts/verktoy-p0-forlop.json) i appen og skriver handlinger, sidetekst, kopi, skjermbilder og utskrift. `src/__tests__/verktoyp0.test.ts` reproduserer kjernefunnene uten nettleser mot appens faktiske godkjenninger (ingen simulering). Skjermbildene i [`verktøy-p0/`](verktøy-p0/) er fra appen.

## 1. Kort svar

**1. Hvorfor Peder ikke får en escitalopramplan.** En plan finnes, men bare i en svært smal korridor, og grensesnittet skjuler korridoren:

- **Godkjenningen gjelder bare kort behandlingstid.** Den som svarer «Ja» på «Har pasienten brukt legemidlet i mange måneder eller lenger?», som gjelder de fleste som skal trappe ned, får ingen plan. Meldingen sier bare at «verktøyet ikke kan lage en komplett plan» og aldri hvorfor (P0-N01, [bilde](verktøy-p0/p0-n01-lang-behandlingstid.png)). Godkjenningen (v14, fingeravtrykk `01b2fb56…`) gjelder voksne under 65 år med kort behandlingstid og startdose 10 eller 20 mg.
- **«Tilpass planen» tilbyr innstillinger som alltid gir «ingen plan».** Panelet sier at regelen tillater 5–50 % reduksjon og minst 14 dager, men hver endring fra standardverdiene gir «Ingen plan for dette tilfellet», i ett tilfelle med «Prøv igjen senere» som om det var en teknisk feil (P0-N06, P0-N07). Dette passer med «uansett hvilke innstillinger jeg prøver».
- **Selv i korridoren kommer planen først etter 5–7 ekstra klikk.** Etter 12 svar viser panelet «Planen er ikke komplett ennå», et avsnitt med prosentregning og én knapp, for eksempel «8 mg (−20 %)». Hvert trykk viser et nytt valg med bare ett alternativ: fem fra 10 mg og sju fra 20 mg ([bilde mobil](verktøy-p0/p0-a05-dosevalg-mobil.png)). Den som ikke forstår at knappen må trykkes gjentatte ganger, tror at verktøyet ikke kan lage plan.
- **Andre startdoser enn 10 og 20 mg** (5, 15 mg) gir ingen plan. Her sier verktøyet heldigvis tidlig og tydelig hvorfor.

Med «kort behandlingstid», alle unntak avkreftet, standardinnstillinger og alle dosevalg trykket, gir 10 mg og 20 mg komplette planer fra både tablett og dråper (seponert dag 197 og 281). **Den automatiske QA-kontrollen svarer akkurat slik og trykker dosevalgene i det skjulte. Derfor er den grønn mens en kliniker ikke får plan** (§7).

**2. Hvorfor de gamle, uforståelige spørsmålene fortsatt vises.** Fem regler som brukes i appen, har ingen *kontrollert* spørsmålskatalog. Det gjelder escitalopram v14, citalopram → sertralin v2, escitalopram → sertralin v2, sertralin → mirtazapin v10 og vortioksetin v12. De vises derfor i reservevisningen, som med vilje viser regelens egne unntakstekster med «Gjelder/Gjelder ikke» og standardmeldingen «Da gjelder ikke regelen» (src/verktoy/flyt/flyt.ts, `UNNTAK_STANDARD`). Katalogtekster for alle fem finnes allerede i src/verktoy/flyt/sporsmal.ts, men katalogavtrykket er aldri lagt fram og ført som kontrollert i src/verktoy/flyt/katalogkontroll.ts. Der er bare sju K3- og K4-regler ført (kontroll 04.11). Escitalopram v13 ble holdt utenfor med vilje på grunn av aldersgrensen, men da v14 rettet den, ble katalogen ikke sendt til kontroll. Peders eksempel er reprodusert nøyaktig (P0-N02, [bilde](verktøy-p0/p0-n02-gjelder.png)).

**3. Kliniske strategiavvik fra bestillingen.** Citalopram → sertralin og escitalopram → sertralin er nå **nedtrapping og deretter direkte overgang**. Det gamle SSRI-et halveres hver 14. dag ned til laveste tablett, og sertralin 50 mg startes dagen etter siste dose, uten overlapp og uten pause. Psychiatrienet beskriver for begge byttene en **overgang med overlapp**. OUSFARs strategi er faglig forsvarlig og støttes av uavhengige kilder for SSRI → SSRI (direkte bytte), men den er en annen strategitype enn den bestilte, og nedtrappingen før overgangen har ingen særskilt kildestøtte (§6). K3- og K4-forløpene har samme strategitype som referansen; avvikene der gjelder omfanget, altså hvilke startdoser og situasjoner som dekkes.

**4. Hva som må endres for at verktøyene skal bli praktisk anvendelige** (detaljer i §8):

- Kontrollerte spørsmålskataloger for de fem reglene, med Ja/Nei/Vet ikke og konkrete stoppmeldinger (P2).
- Fjern eller lås «Tilpass planen»-feltene som alltid gir «ingen plan», og si fra før klinikeren svarer, hva den godkjente planen dekker.
- Dosevalg med bare ett alternativ bør ikke kreve klikk; det krever en ny regelversjon og ny godkjenning (beslutning B3).
- Kortere standardvisning og kopi (P3).
- **Klinisk:** et bredere godkjent omfang, særlig *lang behandlingstid*. Uten det dekker K1 og K2 ikke den vanligste kliniske situasjonen (P1 og K5).

**5. Hva som kan gjøres parallelt i neste fase:** se §9. Det er fire uavhengige spor: katalog og stoppmeldinger, flyt og «Tilpass planen», planvisning og kopi, og klinisk strategi. Hvert spor har eget filansvar.

## 2. Feil- og friksjonsmatrise

«Handlinger» er antall klikk og inntastinger fra tomt verktøy til endelig utfall, uten innlogging. I forløp som stopper, telles handlingene til planpanelet første gang viser stoppet; spørsmålene etter det besvares ikke. Tegn i kopien gjelder knappen «Kopier planen». Kategoriene for første hindring: **F** = feil, **K** = korrekt og forklart stopp, **K?** = stopp uten konkret grunn, **O** = utenfor godkjent omfang (manglende støtte), **U** = unødvendig brukerarbeid.

| Id | Situasjon (syntetisk) | Regel, fingeravtrykk | Handlinger | Utfall i appen | Første hindring og ordlyd | Kat. | Kopi, tegn |
| --- | --- | --- | --- | --- | --- | --- | --- |
| P0-A01 | Escitalopram 10 mg tablett, kort behandlingstid, ingen unntak | seponering-escitalopram-tabletter-og-draper v14, `01b2fb560a8d` | 20 (15 + 5 dosevalg) | Komplett plan, seponert dag 197 (dråper fra dag 1: 8 → 6 → 5 → 4 → 3 → 2 → 1 mg) | Etter 12 svar: «Planen er ikke komplett ennå» + én knapp «8 mg (−20 %)», deretter fire nye valg med ett alternativ hvert | U | 15 267 |
| P0-A02 | Escitalopram 20 mg tablett, som over | v14 | 22 (15 + 7) | Komplett plan, seponert dag 281 (15 mg som tabletter, så dråper) | Som A01, sju dosevalg | U | 17 409 |
| P0-A03 | Escitalopram 10 mg dråper, som over | v14 | 20 | Komplett plan, dag 197 | Som A01 | U | 15 267 |
| P0-A04 | Escitalopram 20 mg dråper, som over | v14 | 22 | Komplett plan, dag 281 | Som A02 | U | 16 892 |
| P0-A05 | Som A01 på mobil (390 punkter) | v14 | 20 | Komplett plan | Dosevalget ligger nederst, etter ca. 3 000 punkter med spørsmål ([bilde](verktøy-p0/p0-a05-dosevalg-mobil.png)) | U | – |
| P0-N01 | Escitalopram 10 mg tablett, **brukt i mange måneder** | v14 | 9 | Ingen plan | «Med dette svaret kan verktøyet ikke lage en komplett plan helt til sluttmålet. Verktøyet lager ingen plan …», og nesten samme setning en gang til. Stoppet kommer i planpanelet straks «Ja» er valgt; ingenting ved spørsmålet; sier ikke at godkjenningen bare gjelder kort behandlingstid | K? / O | – |
| P0-N02 | Escitalopram 10 mg tablett, tidligere seponeringsplager («Gjelder») | v14 | 4 | Ingen plan | «Da gjelder ikke regelen. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.» | F (språk) | – |
| P0-N03 | Escitalopram 10 mg tablett, 65 år eller eldre | v14 | 10 | Ingen plan | «Verktøyet har ingen godkjent plan ved 65 år eller eldre …» | K | – |
| P0-N04 | Escitalopram 15 mg tablett | v14 | 3 | Ingen plan | Allerede i steg 2: «Den godkjente planen gjelder bare startdosene 10 og 20 mg …». Alle 12 spørsmålene vises likevel | K (U) | – |
| P0-N05 | Escitalopram 10 mg tablett, nedsatt leverfunksjon | v14 | 11 | Ingen plan | «Verktøyet har ingen godkjent plan ved nedsatt leverfunksjon …» | K | – |
| P0-N06 | Escitalopram 10 mg tablett, kort behandlingstid, «Reduksjon per trinn» 50 % (feltet sier «Regelen tillater 5–50 %») | v14 | 16 | Ingen plan | «Verktøyet kan ikke vise en klinisk plan nå. Prøv igjen senere.» + «Det finnes ingen godkjent plan for denne kombinasjonen …» (10 % gir det samme) | F | – |
| P0-N07 | Som N06, «Minste antall dager per trinn» 14 («Regelen tillater minst 14 dager») | v14 | 16 | Ingen plan | «Det finnes ingen godkjent plan for denne kombinasjonen av dose, legemiddelform og svar …» | F | – |
| P0-B01 | Citalopram 20 mg → sertralin 100 mg, under 8 uker, ingen unntak | bytte-citalopram-sertralin v2, `2b64ff9e383e` | 11 | Komplett plan: citalopram 10 mg dag 1–14, seponert dag 15; sertralin 50 mg dag 15–28, 100 mg fra dag 29 | Fire «Gjelder/Gjelder ikke»-utsagn og tre lange bekreftelser (reservevisning) | U | 10 938 |
| P0-B02 | Som B01, citalopram brukt **i mer enn 8 uker** | v2 | 6 | Ingen plan | «Da gjelder ikke regelen …» | F (språk) / O | – |
| P0-B03 | Escitalopram 10 mg → sertralin 100 mg, under 8 uker | bytte-escitalopram-sertralin v2, `c0bf6c61e38c` | 11 | Komplett plan (escitalopram 5 mg dag 1–14, sertralin fra dag 15) | Som B01 | U | 11 092 |
| P0-C01 | Olanzapin 20 mg tablett → aripiprazol 15 mg | antipsykotikabytte-olanzapin-aripiprazol v8, `f141a13a9e93` | 14 | Komplett plan, kryss-titrering, olanzapin seponert dag 71 | Spørsmålet «Bruker pasienten peroral olanzapin … ikke depotinjeksjon?» etter at «Peroral» og «Tablett» alt er valgt | U | 12 807 |
| P0-C02 | Olanzapin **10 mg** → aripiprazol 15 mg | v8 | 4 | Ingen plan | «Regelen gjelder bare startdoser på 20 mg. Verktøyet lager ingen plan …» | O | – |
| P0-C03 | Risperidon 4 mg tablett → aripiprazol 10 mg | antipsykotikabytte-risperidon-aripiprazol v8, `866ac93c58fb` | 14 | Komplett plan, risperidon seponert dag 71 | Som C01 | U | 11 837 |
| P0-C04 | Aripiprazol 15 mg tablett → Abilify Maintena | depot-aripiprazol-maintena v3, `04d1debe48f0` | 7 | Komplett plan: 400 mg dag 1, peroral aripiprazol til dag 14, 400 mg månedlig | – | – | 4 201 |
| P0-C05 | Risperidon 3 mg tablett → Xeplion 75 mg | depot-risperidon-xeplion v8, `1672334c468f` | 10 | Komplett plan: 150 mg dag 1, 100 mg dag 8, 75 mg månedlig | – | – | 8 298 |
| P0-C06 | Paliperidon 6 mg depottablett → Xeplion | depot-paliperidon-xeplion v3, `21a335eec8c3` | 4 | Komplett plan | «Viktig for denne planen» lister fire pakninger med godkjenningsfritak som ikke brukes | U | 4 702 |
| P0-C07 | Som C05, toleranse for risperidon **ikke** dokumentert i journalen | v8 | 6 | Ingen plan | Bare «Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.», uten grunn | K? | – |
| P0-D01 | Valproat 1000 mg + lamotrigin til 100 mg | tillegg-valproat-lamotrigin v2, `0a9213f31b5f` | 18 | Komplett plan: 25 mg annenhver dag uke 1–2, 25 mg uke 3–4, 50 mg uke 5, 100 mg fra dag 36 | Inklusjonsspørsmål der «Nei» stopper, blandet med eksklusjonsspørsmål der «Ja» stopper | U | 10 615 |
| P0-D02 | Litium 168 mg Li⁺ (4 × Lithionit 42 mg) + lamotrigin til 200 mg | tillegg-litium-lamotrigin v2, `786436a0ea8d` | 19 | Komplett plan: 25 → 50 → 100 → 200 mg fra dag 36 | Som D01 | U | 10 499 |

Tallene er fra én samlet kjøring av alle 24 forløp mot den publiserte appen 1.126.3 den 06.11.2026, uten feil i noe forløp. Kopien av hver plan, sideteksten og alle handlinger står i én fil per forløp.

**Hva som virker:** Alle de godkjente forløpene gir komplette, korrekte og like planer på skjerm, i kopi og i utskrift når svarene ligger innenfor omfanget. Dosene i K3- og K4-planene stemmer med preparatomtalene ved stikkprøve. Det gjelder Lamictal pkt. 4.2 (tillegg til valproat og uten interagerende legemidler), Xeplion pkt. 4.2 (150 mg dag 1 og 100 mg dag 8 i deltoideus) og Abilify Maintena pkt. 4.2 (oppstart med én injeksjon og 14 dager peroral aripiprazol). De korrekte stoppene for alder, lever, dose utenfor omfanget og pasientgruppe i K3 er konkrete og forståelige.

## 3. Escitalopram i detalj (P0-A01, reproduserbart)

1. **Steg 1:** Skriv «Escitalopram» (1 handling).
2. **Steg 2:** Skriv dosen 10 (1) og velg «Tablett» (1). Svar: «En komplett plan kan lages hvis svarene under tillater det. 12 spørsmål igjen.» Verktøyet sier ikke her at planen bare gjelder kort behandlingstid, under 65 år og ingen tidligere plager.
3. **Steg 3:** Fem «Gjelder/Gjelder ikke»-utsagn (reservevisning), fem Ja/Nei-spørsmål og to lange avkrysninger, til sammen ca. 1 900 tegn (12 handlinger). Utsagnet om tidligere seponeringsforsøk slutter med «… da gjelder den langsomme varianten av regelen», men en langsom variant tilbys ikke; svaret «Gjelder» gir «Da gjelder ikke regelen».
4. **Steg 4:** «Planen er ikke komplett ennå», et avsnitt om at den ideelle dosen 7,5 mg ikke kan gis, med prosentregning, og knappen «8 mg (−20 %)» ([bilde PC](verktøy-p0/p0-a01-forste-dosevalg.png)). Hvert trykk gir et nytt valg med ett alternativ: 8 mg, 5 mg, 4 mg, 2 mg og 1 mg (5 handlinger). Først da kommer «Komplett plan til sluttmålet: Escitalopram seponert fra dag 197».

**Rotårsakene, i rekkefølge etter hvor mange klinikere de rammer:**

| # | Årsak | Hvor | Type |
| --- | --- | --- | --- |
| 1 | Den godkjente planen gjelder bare kort behandlingstid. «Ja» på «mange måneder» stopper uten forklaring. I flyten markeres ikke svaret som stoppende ved spørsmålet, fordi regelens kliniske omfang har et tilfelle med lang behandlingstid for dråper (et stopp-kasus). `iOmfang` ser ikke på legemiddelformen, så stoppet kommer først i beregningen, som en generell melding. | `klinisk_omfang` i regelen; src/verktoy/flyt/flyt.ts `iOmfang` | O + F (forklaring) |
| 2 | «Tilpass planen» viser valgområder (5–50 %, minst 14 dager) fra regelens modell, men det godkjente omfanget gjelder bare standardverdiene. Hver endring gir «ingen plan», én gang med «Prøv igjen senere». | src/components/verktoy/Arbeidsflyt.tsx (Tilpass planen), src/verktoy/doseplan.ts `justeringsfelt` | F |
| 3 | Dosevalg med bare ett alternativ må trykkes ett og ett: 5 eller 7 ganger, med teknisk tekst. Etter B3 kan valget bare gjøres automatisk i en ny regelversjon med nytt fingeravtrykk. | Motoren (trinnvalg), regel v14 | U (krever klinisk godkjenning å fjerne) |
| 4 | Reservevisningen: utsagn i stedet for spørsmål, «Gjelder/Gjelder ikke», og «Da gjelder ikke regelen». | src/verktoy/flyt/katalogkontroll.ts (v14 er ikke ført) | F (språk) |
| 5 | Steg 2 lover «En komplett plan kan lages hvis svarene under tillater det», men nevner ikke de få svarene som tillater det. | Forhåndskontrollen | U |
| 6 | Undertittelen «Beregnet forslag til de første trinnene …» (K1) og «… til starten på et bytte …» (K2) strider mot regelen om at bare komplette planer vises. | src/verktoy/register.ts | F (språk) |

`src/__tests__/verktoyp0.test.ts` reproduserer nr. 1, 3 og 4 og har «kjent feil»-tester for nr. 1 og 4.

## 4. Spørsmål og stoppmeldinger i alle fire verktøyene (spor B)

**Reservevisning:** Tabellen viser reglene som brukes, med spørsmål slik de vises ved første svar (målt i koden med appens godkjenninger).

| Regel | Visning | Synlige spørsmål | «Gjelder»-utsagn | Avkrysninger | Spørsmålstekst, tegn |
| --- | --- | --- | --- | --- | --- |
| Escitalopram v14 (K1) | **Reserve** | 12 | 5 | 2 | 1 875 |
| Vortioksetin v12 (K1, gir ingen komplett plan) | **Reserve** | 9 | 4 | 2 | 1 520 |
| Citalopram → sertralin v2 (K2) | **Reserve** | 7 | 4 | 3 | 1 471 |
| Escitalopram → sertralin v2 (K2) | **Reserve** | 7 | 4 | 3 | 1 481 |
| Sertralin → mirtazapin v10 (K2, gir ingen komplett plan) | **Reserve** | 4 | 1 | 2 | 702 |
| Olanzapin/risperidon → aripiprazol v8 (K3) | Katalog | 10 | 0 | 0 | ca. 1 040 |
| Risperidon → Xeplion v8 (K3) | Katalog | 7 | 0 | 0 | 541 |
| Aripiprazol → Maintena v3, paliperidon → Xeplion v3 | Katalog | 4 / 2 | 0 | 0 | 224 / 141 |
| Valproat/litium + lamotrigin v2 (K4) | Katalog | 14 / 15 | 0 | 0 | 1 315 / 1 429 |

**Funn:**

1. **«Da gjelder ikke regelen» og generiske stopp:** 28 svar som stopper planen, fordelt på åtte regler, gir bare «Da gjelder ikke regelen …» eller «Verktøyet lager ingen plan …», uten å si hvilket forhold som stopper eller hvorfor (test P0-3). Det gjelder også katalogregler: K3-risperidon → Xeplion («tålt risperidon» = Nei) og K4 (tidligere hudreaksjon på lamotrigin, HLA-B\*1502, lever, nyre, graviditet). Ved slike kontraindikasjoner er stoppet riktig, men klinikeren får ikke vite grunnen.
2. **Blandet polaritet:** I K3 og K4 står inklusjonsspørsmål der «Nei» stopper («Er pasienten voksen, har schizofreni, er stabil …?», «Bruker pasienten valproat fast, og skal valproat fortsette uendret …?», «Bruker pasienten Lithionit 42 mg …?», «Er det dokumentert … at pasienten har tålt peroral risperidon …?») side om side med eksklusjonsspørsmål der «Ja» stopper. Den som svarer raskt, vil ofte svare feil. Testkjøringen i denne rapporten gjorde selv denne feilen tre ganger før svarene ble rettet.
3. **Sammensatte spørsmål:** «Er pasienten voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra olanzapin på grunn av bivirkninger eller utilstrekkelig effekt?» er fem forhold i ett ja/nei-spørsmål.
4. **Spørsmål som allerede er besvart:** «Bruker pasienten peroral olanzapin … ikke depotinjeksjon?» kommer etter at «Peroral» og «Tablett» er valgt. «Hvor gammel er pasienten?» følges av «Er pasienten voksen …?».
5. **Spørsmål etter tidlig stopp:** Ved en startdose utenfor omfanget (P0-N04) sier steg 2 straks at det ikke blir plan, men alle 12 spørsmålene står fortsatt åpne.
6. **Reservevisningen tar ikke med «Vet ikke».** Katalogene har «Ukjent», og den gir riktig «Må avklares før verktøyet kan lage en plan.».
7. **Lange avkrysninger** (K1: 560 og 190 tegn, K2: ca. 400 tegn) er forbehold som etter beslutning B1 kunne stått i planen i stedet for som avkrysning. Det krever katalogkontroll.

**Katalogene finnes allerede, men er ikke kontrollert.** Med katalogen ville escitalopram v14 få 11 spørsmål og K2-reglene 7. Spørsmålene ville være Ja/Nei/Ukjent med konkrete stoppmeldinger, for eksempel «Har et tidligere forsøk på å trappe ned eller seponere legemidlet gitt seponeringssymptomer eller mislyktes?». **To ting må likevel rettes før katalogene sendes til kontroll:** (a) I v14-katalogen markeres «mange måneder» heller ikke som stoppende (samme årsak som §3 nr. 1). (b) I K2-katalogen stopper «Hvor gammel er pasienten?» bare ved «Under 18 år». Regelens unntak «over 65 år» avledes ikke av svaret «65 år eller eldre», som ifølge beslutning B2 aldri kan bety «over 65». Det må avklares hvordan 65-åringer skal håndteres, så planen ikke blir stående på «må avklares».

## 5. Informasjonsmengde: skjerm, kopi og utskrift (spor B)

| Forløp | Kopi, tegn | Av dette tidslinjen | Av dette doselinjene | Seksjoner i kopien | Utskrift |
| --- | --- | --- | --- | --- | --- |
| Escitalopram 10 mg (A01) | 15 267 | 2 521 | 702 | 9 | 5 A4-sider |
| Escitalopram 20 mg (A02) | 17 409 | 3 466 | 1 011 | 9 | – |
| Citalopram → sertralin (B01) | 10 938 | 955 | 205 | 8 | 4 A4-sider |
| Olanzapin → aripiprazol (C01) | 12 807 | 2 515 | 728 | 8 | – |
| Aripiprazol → Maintena (C04) | 4 201 | 292 | 292 | 7 | – |
| Valproat + lamotrigin (D01) | 10 615 | 2 589 | 964 | 9 | – |

**Under 5–10 % av kopien er selve doseringen.** Resten er vurderingspunkter som gjentas, advarsler, antakelser, usikkerhet, rå preparatlister, kontroller som gjentar svarene, kilder og versjoner. Konkrete eksempler:

- **Utviklertekst i den kliniske kopien:** «… avgjøres i P5», «(B7)», «fagvurderingen 29.10.2026», «bidragsyterens valg, kontrollørens beslutning P7-A 30.10.2026 og gjennomgangen av 9cb420b 31.10.2026» (escitalopram, «Antakelser» og «Usikkerhet»).
- **Gjentakelser:** Samme vurderingstekst står ved hver dato i tidslinjen og igjen under «Oppfølging»/«Vurderingspunkter». Tidslinjen for K4 har to vurderingsrader per dato (utslett og stemningsleie).
- **«Viktig for denne planen»** (citalopram → sertralin, Xeplion, olanzapin) lister pakninger som *ikke* brukes, fordi de krever godkjenningsfritak eller har en styrke utenfor omfanget. Det er ikke viktig for klinikeren.
- **Kontrollene** gjentar hvert svar og hver bekreftelse ordrett, for escitalopram 18 linjer.
- **Mangler i det praktiske:** Escitalopramplanen fra tablett går til dråper fra dag 1 (8 dråper), men tidslinjen sier ikke at tablettene skal stoppes og at det trengs resept på dråper. Det står bare i en lang tilpasningstekst. Utskriften av en plan med ett legemiddel viser ikke legemiddelnavnet i radene, bare overskriften.
- **Det som er bra:** Dosene, antall tabletter og dråper, datoer og sluttmål er entydige og like på skjerm, i kopi og i utskrift. Maintena- og Xeplion-planene er korte og lette å lese.

## 6. Kliniske strategiforskjeller som krever uavhengig vurdering (spor C)

Rettighetsregelen er fulgt (`docs/verktøy-p3-rettigheter.md`). For Psychiatrienet er bare *strategitypen* oppgitt (overlapp eller ikke, pause eller ikke). Ingen doser, dager, trinn eller tekst er gjengitt. Typen ble lest av sidene 06.11.2026 og må bekreftes av kontrolløren selv.

**Citalopram 20 mg → sertralin 100 mg:**

| | Strategitype | Forløp |
| --- | --- | --- |
| 1. Opprinnelig bestilt verktøy (utviklingsplanen §1, P4.2) | Interaktivt bytteverktøy etter Psychiatrienets bytteanbefalinger, med «beregnede samtidige/separate doseforløp»; modellen skulle støtte overlapp, sekvensielt bytte og utvasking | Strategien skulle velges for hver kombinasjon ut fra kildegrunnlaget |
| 2. Gjeldende OUSFAR-plan (v2, klinisk godkjent 05.11) | **Nedtrapping, så direkte overgang** (sekvensielt uten pause) | Citalopram 10 mg dag 1–14, siste dose dag 14; sertralin 50 mg fra dag 15, 100 mg fra dag 29 |
| 3. Psychiatrienets type | **Overgang med overlapp** (begge legemidler en periode), ingen pause | Ikke gjengitt |
| 4. Uavhengige kilder | NHS SPS (2024): **direkte bytte** er normalt mulig mellom SSRI-er unntatt fluoksetin; kryssnedtrapping beskrives ikke for SSRI → SSRI. Keks mfl. 2016 (Aust Prescr): nedtrapping og så lav startdose; utvasking er ikke nødvendig; forsiktig kryssnedtrapping kan brukes, særlig ved høy tilbakefallsrisiko. NICE NG222 1.4.16: raskere nedtrapping kan passe ved bytte. Zoloft pkt. 4.4: begrenset erfaring med optimalt tidspunkt for bytte fra et annet SSRI | – |

**Vurdering:** OUSFAR-planen er en faglig forsvarlig, men **annen** strategi enn den bestilte. Dette er en uavklart substitusjon, ikke en sikkerhetsfeil. Den har lav risiko for serotonerg belastning. Til gjengjeld får pasienten først 14 dager (fra 20 mg) eller 28 dager (fra citalopram 40 mg eller escitalopram 20 mg) på redusert dose av et legemiddel som oftest byttes fordi det ikke virker eller ikke tåles. Ingen kilde begrunner nettopp en slik nedtrapping *før* overgangen ved SSRI → SSRI. Grensen på 8 uker for behandlingstid (OUSFARs egen pilotgrense, uten kilde) gjør at verktøyet sjelden kan brukes. Escitalopram → sertralin har samme mønster.

**Øvrige bytter:** SSRI → mirtazapin har samme strategitype som referansen (kryssnedtrapping), men gir ingen komplett plan, fordi siste trinn (K2-2b) ikke er avgjort. K3 (olanzapin/risperidon → aripiprazol, Maintena, Xeplion) og K4 har samme strategitype som referansen. Avvikene gjelder **omfanget**: bare olanzapin 20 mg, risperidon 4 mg (→ aripiprazol) og 3 mg (→ Xeplion), paliperidon 3/6/9/12 mg, Lithionit 42 mg og natriumvalproat. Kontrolløren bør selv bekrefte at Xeplion-oppstarten etter risperidon og håndteringen av valproat ved tillegg av lamotrigin svarer til preparatomtalene.

**Beslutningsspørsmål til P1** (ChatGPT kontrollerer kildene, Peder avgjør produktmålet):

- **P1-1** Standardstrategi for SSRI → SSRI med kort halveringstid. Alternativene er A) beholde dagens forløp med tydelig merket strategitype, B) direkte bytte, C) kort, forsiktig kryssnedtrapping utledet selvstendig fra kildene, eller D) at klinikeren velger mellom to eller tre godkjente strategier, med en kort forklaring av hvem hver passer for.
- **P1-2** Krever bestillingen at verktøyet kan gi en overlappende overgang for SSRI → SSRI, eller holder det med en kildebasert, tydelig merket alternativ strategitype?
- **P1-3** Skal det gamle SSRI-et trappes ned før overgangen? Alternativene er dagens halvering hver 14. dag, ett kort trinn, ingen nedtrapping, eller nedtrapping bare ved bivirkninger.
- **P1-4** Behandlingstiden: beholde grensen på 8 uker i K2 og «kort behandlingstid» i K1, eller godkjenne egne forløp for lang behandlingstid? Dette avgjør om K1 og K2 kan brukes i vanlig praksis.
- **P1-5** Siste trinn i SSRI → mirtazapin (K2-2b).
- **P1-6** Skal planen vise strategitypen (overlapp, direkte eller pause) og at andre forsvarlige typer finnes?
- **P1-7** K3-omfanget: vanlige startdoser som olanzapin 10–15 mg og risperidon 2–6 mg.

Hele sammenligningen med kildetabell (SPS, Keks 2016, NICE NG222, RCPsych, DMP-preparatomtaler for Zoloft, Cipramil og Cipralex) er gjengitt i vedlegg A.

## 7. Hvorfor tusenvis av grønne tester ikke fanget dette

1. **QA svarer som en ideell testperson, ikke som en kliniker.** Appkontrollen (`src/__tests__/qa/appkontroll.ts`, PR #336) og brukerforløpene svarer «Gjelder ikke»/«Nei» på alt, bekrefter alt, bruker standardinnstillingene og velger dosene i hvert trinnvalg automatisk. Kasusene er dessuten valgt innenfor godkjenningen (kort behandlingstid, nøyaktig 10 eller 20 mg). De beviser at korridoren finnes, ikke at en kliniker finner den.
2. **Testene sammenligner appen med seg selv.** Skjerm, kopi og lokal kjøring er like, men ingen test spør om svaret er brukbart: hvor mange handlinger det krever, hvor mye tekst det gir, eller om stoppmeldingen forklarer noe.
3. **Reservevisningen er definert som riktig.** Den ble laget som en trygg standard (S5b) og testes for å vise regelens tekst ordrett. Når ingen fører katalogavtrykket, blir den permanent uten at noen test feiler.
4. **Omfanget er testet regel for regel, ikke mot vanlig praksis.** Ingen test måler hvor stor andel av vanlige pasienter som får plan (for eksempel lang behandlingstid eller olanzapin 10 mg).
5. **«Tilpass planen» er testet for at feltene finnes og validerer,** ikke for at verdiene de tillater, gir en godkjent plan.

`src/__tests__/verktoyp0.test.ts` legger til de første testene av denne typen: antall påkrevde dosevalg, reservevisningen, generiske stopp og lang behandlingstid, med `it.fails` for ønsket oppførsel.

## 8. Prioriterte forslag

**Feil (rettes uten ny klinisk godkjenning av doseringen, men katalogtekster krever semantisk katalogkontroll):**

| # | Tiltak | Krever |
| --- | --- | --- |
| F1 | «Tilpass planen»: vis bare valg som ligger innenfor det godkjente omfanget, eller lås feltene med forklaringen «Den godkjente planen bruker 25 % og 28 dager». Fjern «Prøv igjen senere» når årsaken er at planen er utenfor omfanget. | UI og motor, ingen ny regel |
| F2 | Kontrollerte kataloger for escitalopram v14 og begge K2 v2-reglene, i tillegg for vortioksetin v12 og sertralin → mirtazapin v10. Først må de to punktene i §4 rettes (lang behandlingstid og over 65 år). | Katalogkontroll av ChatGPT (ikke klinisk signoff) |
| F3 | En konkret stoppforklaring for hvert stoppende svar: hvilket forhold, hvorfor, hva klinikeren kan gjøre. Gjelder de 28 svarene i §4. | Katalogkontroll |
| F4 | «Mange måneder» = Ja ved escitalopram skal stoppe ved spørsmålet med «Den godkjente planen gjelder bare kort behandlingstid …». `iOmfang` må ta hensyn til legemiddelformen. | Flyt (src/verktoy/flyt) |
| F5 | Fjern utviklertekst fra planen og kopien (P5, B7, P7-A, datoer for interne kontroller, commit-referanser). Rett undertitlene «de første trinnene» og «starten på et bytte». | Tekst; tekst som er del av regelens fingeravtrykk, krever ny regelversjon |

**Manglende støtte (krever klinisk beslutning og ny godkjent regelversjon):**

| # | Tiltak |
| --- | --- |
| M1 | Escitalopram ved lang behandlingstid, som er den vanligste nedtrappingssituasjonen. I dag gis ingen plan. |
| M2 | K2: avklare P1-1 til P1-4 (strategitype, nedtrapping før overgangen, 8-ukersgrensen). |
| M3 | Escitalopram 5 og 15 mg, olanzapin 10–15 mg, risperidon 2–6 mg, andre litium- og valproatpreparater (K5-D). |
| M4 | Automatisk valg når et trinn har bare én mulig dose (B3: ny regelversjon og godkjenning). Dette fjerner 5–7 klikk per escitalopramplan. |

**Mulige forbedringer (brukeropplevelse, ingen endring i klinisk innhold):**

| # | Tiltak |
| --- | --- |
| U1 | Si allerede i steg 2 hva den godkjente planen dekker (for eksempel «Planen gjelder voksne under 65 år med kort behandlingstid og 10 eller 20 mg»), og skjul steg 3 når steg 2 allerede har gitt et nei. |
| U2 | Snu inklusjonsspørsmålene til konkrete alternativer eller del dem opp, og ta bort spørsmål som allerede er besvart (peroral, voksen). |
| U3 | Kort standardkopi med dosering, datoer, administrasjon, vurderingspunkter og vesentlige advarsler. Antakelser, usikkerhet, preparatlister, kontroller, kilder og versjoner flyttes til en egen «Kopier med faglig grunnlag». Ta bort «Viktig for denne planen» når den bare lister pakninger som ikke brukes. |
| U4 | Si eksplisitt i tidslinjen når pasienten skal bytte fra tabletter til dråper, og at det trengs resept. Vis legemiddelnavnet i hver rad i utskriften. |
| U5 | Slå sammen vurderingsrader på samme dato, og la være å gjenta samme vurderingstekst både i tidslinjen og i «Oppfølging». |

## 9. Neste fase: oppgaver som kan gå parallelt

| Spor | Innhold | Filer (eneansvar) | Avhenger av |
| --- | --- | --- | --- |
| P2-a Kataloger og stoppmeldinger | F2, F3 og U2 for alle regler i bruk; katalogavtrykk til ChatGPTs kontroll | src/verktoy/flyt/sporsmal.ts, katalogkontroll.ts, docs/verktøy-sporsmalskatalog.md | – |
| P2-b Flyt og tilpasning | F1, F4 og U1 (forhåndskontroll, `iOmfang`, «Tilpass planen», skjule steg 3 etter tidlig nei) | src/verktoy/flyt/flyt.ts, forhandskontroll.ts, stopp.ts, src/verktoy/doseplan.ts (justeringsfelt), Arbeidsflyt.tsx (Tilpass planen) | Koordineres med P2-a om `flyt.ts` |
| P3 Planvisning og kopi | U3, U4, U5 og tekstdelen av F5 som ikke er i reglene | src/verktoy/planvisning.ts, Doseplanvisning.tsx, Tidslinje.tsx, verktoy.css | – |
| P1 Klinisk strategi og omfang | M1, M2, M4 og P1-1 til P1-7: kontrollgrunnlag og nye regelversjoner, først etter beslutning | src/verktoy/regler/** (k1.ts, antidepressivbytter.ts), docs/verktøy-k*-kontrollgrunnlag.md | Peders og ChatGPTs beslutninger |
| P4 QA som kliniker | Utvide appkontrollen med klinikerrealistiske svar og målinger (handlinger, tegn, stopp uten grunn), og kjøre P0-forløpene på nytt etter hver leveranse | src/__tests__/qa/**, scripts/verktoy-p0-* | Etter P2/P3 |

K5-D bør ikke åpnes før P2 og P3 er levert og P4 er kjørt på nytt i publisert app (produktrevisjonsplanen §3, utgangsport).

## 10. Hva som ikke er testet

- Bare administratorvisningen er testet. Verktøyene er ikke åpne for klinikere.
- Ingen reell bruker er observert; Peders erfaring er reprodusert med syntetiske svar. P5 (kort brukertest) gjenstår.
- Tastaturbruk og skjermleser er ikke testet i P0. Utskrift er testet som PDF fra Chromium, ikke på papir.
- FEST-endringer (avregistrerte styrker) er ikke testet i appen; QA-PR #336 dekker et funn om gammel FEST.
- Psychiatrienets strategitype er klassifisert fra sidene uten at innhold er lagret, og må bekreftes av kontrolløren. NICE CKS (svarte 403), Maudsley og UpToDate er ikke lest.

## Vedlegg A: Kildegrunnlag for spor C

| Påstand | Kilde |
| --- | --- |
| Direkte bytte er normalt mulig fra alle SSRI-er unntatt fluoksetin; kryssnedtrapping beskrives ikke for SSRI → SSRI; SSRI → mirtazapin kan kryssnedtrappes forsiktig over 2–4 uker | NHS Specialist Pharmacy Service, «SSRIs to other antidepressants: switching in adults» (oppdatert 2024): https://www.sps.nhs.uk/articles/ssris-to-other-antidepressants-switching-in-adults/ |
| Fire strategier (konservativ, moderat, direkte, kryssnedtrapping) med risiko; SSRI → SSRI: trapp ned, start nytt SSRI i lav dose, utvasking ikke nødvendig, forsiktig kryssnedtrapping der det er hensiktsmessig | Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83, tabell 2 og 3: https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/ |
| Bytte innen samme klasse er et alternativ; raskere nedtrapping kan passe ved bytte; følg opp seponeringssymptomer | NICE NG222, anbefaling 1.9.5, 1.4.16 og 1.4.17: https://www.nice.org.uk/guidance/ng222 |
| Begrenset erfaring med optimalt tidspunkt for bytte fra et annet SSRI; serotonergt syndrom; seponering over minst 1–2 uker | Zoloft, preparatomtale pkt. 4.2 og 4.4 (DMP): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf |
| Halveringstid ca. 1,5 døgn; QT-forlengelse; seponering over minst 1–2 uker | Cipramil, preparatomtale pkt. 4.2–4.5 og 5.2: https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf |
| Halveringstid ca. 30 t; QT; serotonerge legemidler | Cipralex, preparatomtale pkt. 4.4 og 5.2: https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf |
| Seponeringssymptomer også etter kort bruk; nedtrapping over uker til måneder | RCPsych, Stopping antidepressants: https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants |
