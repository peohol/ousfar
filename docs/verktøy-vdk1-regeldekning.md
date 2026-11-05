# OUSFAR Verktøy – VDK-1: klinisk regeldekning i de tre verktøyene

<!-- Laget av `npm run verktoy:regler -- regeldekning` fra src/verktoy/regeldekning.ts, regelsettet, testmatrisen (P11) og FEST-uttrekket til aksepttesten. Ikke rediger for hånd. -->

Oversikten svarer på VDK-1 i `docs/verktøy-omlegging-2026-11.md`: hva de tre verktøyene faktisk kan beregne i dag, hva som bare gir fagtekst, og hvorfor de andre valgene stopper. Hver kombinasjon forskriveren kan velge, er kjørt gjennom den samme tilgjengelighetsvurderingen som verktøysiden (`src/verktoy/tilgjengelighet.ts`), så tallene er det appen gjør, ikke et anslag. «Vanlige valg som stopper» er de syntetiske kasusene i testmatrisen fra P11, ikke antakelser om bruk. Prioriteringen av hva som bør ferdigstilles først, står i `docs/verktøy-vdk2-prioritering.md`.

Kildetabellen fra Psychiatrienet er bare brukt som metadata som allerede ligger i repoet (om tabellen har en anbefaling for kombinasjonen), og bare i sum. Ingen tekst fra kilden er brukt, og at kilden har en anbefaling, gir aldri i seg selv en OUSFAR-regel (`docs/verktøy-p3-rettigheter.md`).

**Regelsettet har 14 klinisk godkjente regelversjoner** (`kryssnedtrapping-sertralin-mirtazapin` v10, `depot-aripiprazol-maintena` v3, `depot-paliperidon-xeplion` v3, `seponering-escitalopram` v13, `seponering-vortioksetin` v12, `seponering-bupropion` v5, `seponering-agomelatin` v1, `bytte-escitalopram-sertralin` v2, `bytte-citalopram-sertralin` v2, `depot-risperidon-xeplion` v8, `antipsykotikabytte-olanzapin-aripiprazol` v8, `antipsykotikabytte-risperidon-aripiprazol` v8, `tillegg-valproat-lamotrigin` v2, `tillegg-litium-lamotrigin` v2), 12 av dem med beregning, hver bare i omfanget kontrolløren godkjente.

## 1. Sammendrag

Antall kombinasjoner etter hva verktøyet gir. For seponering er en kombinasjon ett virkestoff i én formulering; for bytte et ordnet par av ulike valg (fra → til), også mellom formuleringer av samme virkestoff. En kombinasjon med «beregning» gir en plan bare for de startdosene, svarene og preparatene regelen er godkjent for (avsnitt 2); alt annet stopper med forklaring.

| Utfall | Trappe ned antidepressiv | Bytte antidepressiv | Bytte antipsykotikum | Kombinere stemningsstabiliserende |
| --- | --- | --- | --- | --- |
| Valgbart | 23 virkestoffer, 23 valg med formulering | 23 virkestoffer, 23 valg med formulering | 25 virkestoffer, 34 valg med formulering | 11 virkestoffer, 11 valg med formulering |
| Kombinasjoner | 23 | 506 | 1122 | 110 |
| Beregning med klinisk godkjent regel (i godkjent omfang) | 2 | 3 | 5 | 2 |
| Klinisk godkjent fagtekst, ingen beregning | 2 | 0 | 0 | 0 |
| Regel finnes, kontrollert og ikke godkjent | 6 | 1 | 1 | 0 |
| Regel finnes som fagtekst, ikke godkjent | 6 | 0 | 0 | 0 |
| Regel finnes, ikke ferdig kontrollert | 0 | 2 | 4 | 0 |
| Ingen OUSFAR-regel; kilden har en anbefaling | 0 | 500 | 885 | 108 |
| Ingen OUSFAR-regel; kilden har ingen anbefaling | 0 | 0 | 161 | 0 |
| Ingen OUSFAR-regel; begrenset av preparater eller kilde | 7 | 0 | 0 | 0 |
| Ikke støttet: middels langtidsvirkende injeksjon | 0 | 0 | 66 | 0 |

## 2. Hva kan beregnes i dag

Hver klinisk godkjente regel med beregning, kombinasjonen den gjelder, og omfanget slik kontrolløren avgrenset det. Siste kolonne teller kasusene i testmatrisen (`docs/verktøy-p11-testmatrise.md`) der bare forskriverens valg varierer (dose, svar, form, dato), ikke kasusene som endrer regelen, FEST, nødstoppen eller datakildene.

| Verktøy | Regel | Kombinasjon | Godkjent omfang (kontrollørens avgrensning) | Forskriverens valg i testmatrisen |
| --- | --- | --- | --- | --- |
| Trappe ned antidepressiv | `seponering-escitalopram` v13 | Escitalopram | Kontrollørens samlede kontroll av 255dd94 04.11.2026 (PR #323, kommentar 6622813839): faglig akseptert og klinisk godkjent bare for nøyaktig denne regelversjonen og dette fingeravtrykket, avgrenset til et symptomstyrt, pragmatisk komplett forløp fra 10 eller 20 mg hos voksne under 65 år med kort behandlingstid, ingen tidligere seponeringsplager og avklarte interaksjoner og kontraindikasjoner, med hele Cipralex-dråper (1 mg per dråpe), valgt gradvis reduksjon til 3 → 2 → 1 mg, siste dose holdt og vurdert individuelt før 1 → 0, og fleksible kontrollpunkter 7, 14 og 28 dager etter siste dose. Godkjenningen er ingen generell garanti mot seponeringsplager, ingen automatisk terskel for andre preparater eller pasientgrupper, og ingen fullført K1-dekning. 1 mg er en praktisk formuleringsterskel, ikke en dokumentert universell trygg seponeringsgrense. | 2 kasus, 0 gir plan |
| Trappe ned antidepressiv | `seponering-vortioksetin` v12 | Vortioksetin | Kontrollørens gjennomgang av a38fac14 03.11.2026 (rettelsen av RCPsych-faktumet, PR #309): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare én første reduksjon 20 → 15 mg/døgn, med minst 28 dager før ny symptomstyrt vurdering, hos voksne under 65 år, kort/ikke-langvarig behandling, uten tidligere seponeringsplager, etter alle opprinnelige vurderinger/stopp, med kontrollerte tabletter/styrker. Ingen påfølgende reduksjon, langsom variant eller utvidet pasientgruppe. Identisk klinisk omfang som v11. Godkjenningen gjelder bare dette eksakte fingeravtrykket og disse betingelsene. Den er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping. | 18 kasus, 0 gir plan |
| Bytte antidepressiv | `bytte-citalopram-sertralin` v2 | Citalopram → Sertralin | Kontrollørens gjennomgang av ce40b3a 05.11.2026 (PR #318, kommentar 6649961365): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare voksne 18–65 år med depresjon, henholdsvis escitalopram 10/20 mg eller citalopram 20/40 mg, høyst åtte ukers sammenhengende behandling som OUSFARs egen pilotgrense, ingen tidligere seponeringsplager, ingen kompliserende leverfunksjon/interaksjoner, og de dokumenterte norske tablettformene/-styrkene. Halvering hvert 14. døgn som minstetid, vurdering før trinn, siste 5/10 mg → 0 med sertralin 50 mg fra neste dag, valgt sertralinmål 50 eller 100 mg og reell klinisk vurdering av effekt/behov, toleranse og seponeringssymptomer før eventuell økning. Individuell pause/omlegging ved plager, kontroll den første uken og senere responskontroll er forutsetninger. Nulltrinnet er ikke en feil fordi det er «100 %» av siste ordinerte dose; konkret PK/PD og symptomrisiko avgjør. Dette godkjenner verken en generell SSRI-bytteprotokoll, andre startdoser, langvarig bruk eller de tre mirtazapinreglene. | 0 kasus, 0 gir plan |
| Bytte antidepressiv | `bytte-escitalopram-sertralin` v2 | Escitalopram → Sertralin | Kontrollørens gjennomgang av ce40b3a 05.11.2026 (PR #318, kommentar 6649961365): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare voksne 18–65 år med depresjon, henholdsvis escitalopram 10/20 mg eller citalopram 20/40 mg, høyst åtte ukers sammenhengende behandling som OUSFARs egen pilotgrense, ingen tidligere seponeringsplager, ingen kompliserende leverfunksjon/interaksjoner, og de dokumenterte norske tablettformene/-styrkene. Halvering hvert 14. døgn som minstetid, vurdering før trinn, siste 5/10 mg → 0 med sertralin 50 mg fra neste dag, valgt sertralinmål 50 eller 100 mg og reell klinisk vurdering av effekt/behov, toleranse og seponeringssymptomer før eventuell økning. Individuell pause/omlegging ved plager, kontroll den første uken og senere responskontroll er forutsetninger. Nulltrinnet er ikke en feil fordi det er «100 %» av siste ordinerte dose; konkret PK/PD og symptomrisiko avgjør. Dette godkjenner verken en generell SSRI-bytteprotokoll, andre startdoser, langvarig bruk eller de tre mirtazapinreglene. | 0 kasus, 0 gir plan |
| Bytte antidepressiv | `kryssnedtrapping-sertralin-mirtazapin` v10 | Sertralin → Mirtazapin | Kontrollørens gjennomgang av a38fac14 03.11.2026 (rettelsen av RCPsych-faktumet, PR #309): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare det tidligere godkjente startforløpet fra sertralin 50 eller 100 mg, kort/ikke-langvarig behandling, med kontrollerte tabletter og styrker, obligatoriske bekreftelser og tidligere seponeringsplager fraværende. Dette omfatter ikke videre 25 → 0, opptrapping av mirtazapin, andre doser, langtidsbehandling eller endret trinnlengde. Identisk klinisk omfang som v9. Godkjenningen gjelder bare dette eksakte fingeravtrykket og disse betingelsene. Den er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping. | 14 kasus, 0 gir plan |
| Bytte antipsykotikum | `depot-aripiprazol-maintena` v3 | Aripiprazol (peroral) → Aripiprazol (depotinjeksjon) | Kontrollørens gjennomgang av 62ebb21 30.10.2026 (P4.8): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: oppstart med én injeksjon Abilify Maintena 400 mg, peroral aripiprazol i 14 dager og deretter 400 mg månedlig, hos voksne med schizofreni som er stabilisert på og har tålt peroral aripiprazol. Gjelder ikke andre depottyper eller oppstartsvarianter, kjent langsom CYP2D6-omsetning, sterke CYP2D6- eller CYP3A4-hemmere, CYP3A4-induktorer eller ubekreftet stabilisering eller toleranse. | 13 kasus, 4 gir plan |
| Bytte antipsykotikum | `antipsykotikabytte-olanzapin-aripiprazol` v8 | Olanzapin (peroral) → Aripiprazol (peroral) | Kontrollørens ellevte gjennomgang av 63464bd 04.11.2026 (PR #320, kommentar 6626569802): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare stabil voksen poliklinisk pasient med schizofreni: olanzapin 20 → 15 → 10 → 5 → 0 mg, med aripiprazol etablert på forskriverens valgte og tolererte 10 eller 15 mg, minst to ukers overlapp før nedtrappingen, minst 14 dager per reduksjon, tett vurdering av symptomer og bivirkninger, stopp eller individuell omlegging ved plager, og uten tidligere seponeringsproblemer. Dette er en bevisst langsommere strategi etter TARC 2018, ikke en generell regel for seponering av olanzapin. | 0 kasus, 0 gir plan |
| Bytte antipsykotikum | `depot-paliperidon-xeplion` v3 | Paliperidon (peroral) → Paliperidon (depotinjeksjon (paliperidonpalmitat)) | Kontrollørens gjennomgang av 62ebb21 30.10.2026 (P4.8): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: overgang fra perorale paliperidon-depottabletter til Xeplion med 150 mg paliperidon dag 1 og 100 mg dag 8 i deltoideus, deretter månedlig fra én måned etter dag 8, hos voksne med schizofreni som er stabilisert, med kreatininclearance minst 80 ml/min og med deltoideus framhevet etter 9–12 mg peroralt. Gjelder ikke andre depottyper eller depotregimer, risperidon, nedsatt nyrefunksjon eller ubekreftet stabilisering eller toleranse. | 19 kasus, 9 gir plan |
| Bytte antipsykotikum | `antipsykotikabytte-risperidon-aripiprazol` v8 | Risperidon (peroral) → Aripiprazol (peroral) | Kontrollørens ellevte gjennomgang av 63464bd 04.11.2026 (PR #320, kommentar 6626569802): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare tilsvarende stabil voksen poliklinisk pasient med schizofreni: risperidon 4 → 3 → 2 → 1 → 0 mg, med aripiprazol på valgt og tolerert terapeutisk måldose før nedtrappingen, samme overlapp, intervaller, tette oppfølging og stoppkriterier. Ikke en generell regel om seponering av risperidon eller om at alle pasienter tåler 1 → 0 mg. | 0 kasus, 0 gir plan |
| Bytte antipsykotikum | `depot-risperidon-xeplion` v8 | Risperidon (peroral) → Paliperidon (depotinjeksjon (paliperidonpalmitat)) | Kontrollørens ellevte gjennomgang av 63464bd 04.11.2026 (PR #320, kommentar 6626569802): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare stabil voksen med schizofreni på 3 mg peroral risperidon daglig, med Xeplion 75 mg månedlig som faktisk valgt mål etter oppstart med 150 mg dag 1 og 100 mg dag 8, normal nyrefunksjon, dokumentert god effekt og toleranse og uten overvekt eller relevante interaksjoner, med vurdering før injeksjonene og vilkårene for individuell doseendring. Russu 2018 gir populasjonsfarmakokinetikk, ikke individuell doseekvivalens; 4–6 mg risperidon til 75 mg er fortsatt avvist. Godkjenningen gjelder en klinisk plausibel, begrenset oppstart, ikke garantert virkning hos alle. | 0 kasus, 0 gir plan |
| Kombinere stemningsstabiliserende | `tillegg-litium-lamotrigin` v2 | Litium → Lamotrigin | Uavhengig kilde- og regelkontroll av 3c76293 04.11.2026 (PR #322, kommentar 6620240499): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: lamotrigin lagt til eksisterende, uendret Lithionit 42 mg etter tabell 3 i Lamictal-preparatomtalen (25, 50 og 100 mg), til det pasientvalgte første stabiliserende målet 200 mg/dag fra uke 6, med Lamictal dispergerbare tabletter. Ingen generell godkjenning av litiumbehandling, andre litiumpreparater eller andre kombinasjoner. | 0 kasus, 0 gir plan |
| Kombinere stemningsstabiliserende | `tillegg-valproat-lamotrigin` v2 | Valproat → Lamotrigin | Uavhengig kilde- og regelkontroll av 3c76293 04.11.2026 (PR #322, kommentar 6620240499): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: lamotrigin lagt til eksisterende, uendret natriumvalproat etter tabell 3 i Lamictal-preparatomtalen (25 mg annenhver dag i to uker, 25 mg daglig i to uker, 50 mg daglig i uke 5), til det pasientvalgte første stabiliserende målet 100 mg/dag, med Lamictal dispergerbare tabletter. Ingen generell godkjenning av valproatbehandling, indikasjon, andre styrker eller formuleringer eller andre kombinasjoner. | 0 kasus, 0 gir plan |

## 3. Klinisk godkjent fagtekst uten beregning

| Verktøy | Regel | Kombinasjon | Godkjent omfang (kontrollørens avgrensning) | Forskriverens valg i testmatrisen |
| --- | --- | --- | --- | --- |
| Trappe ned antidepressiv | `seponering-agomelatin` v1 | Agomelatin | Substanskontrollen 30.10.2026, runde 3: Godkjent som egen beslutning (beslutning 9). Godkjenningen gjelder bare agomelatin og utsagnet om at nedtrapping ikke er nødvendig; den gjelder ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler. | 1 kasus |
| Trappe ned antidepressiv | `seponering-bupropion` v5 | Bupropion | Substanskontrollen 30.10.2026, runde 3: Godkjent som den står, bare som tekstregel: regelen beregner ingen doseplan og overlater avslutningen til forskriveren. | 2 kasus |

## 4. Vanlige valg som stopper innenfor de godkjente reglene

Valgene i testmatrisen som ikke gir en plan, selv om regelen er godkjent: dosen, svarene eller formen ligger utenfor det godkjente omfanget, et trinn kan ikke gis med preparatene, eller planen når ikke sluttmålet: en delplan vises aldri, heller ikke etter en tidligere godkjent regelversjon (Peders beslutning 03.11.2026).

**`seponering-escitalopram`** – 2 av 2 valg gir ingen plan:

- E01 (vanlig dose innenfor det godkjente omfanget): escitalopram dråper 10 mg: forskriveren må velge dosen ved første trinn, og ingen doser vises før planen er komplett, dose «10» → ingen plan
- E02 (utilgjengelige eller endrede preparater): escitalopram tablett 20 mg: når ikke sluttmålet uten dråper, dose «20» → ingen plan

**`seponering-vortioksetin`** – 18 av 18 valg gir ingen plan:

- V01 (vanlig dose innenfor det godkjente omfanget): 20 mg, kort behandlingstid, voksen under 65 år, dose «20» → ingen plan
- V02 (injeksjons- og startdatoer): 20 mg med startdato, dose «20» → ingen plan
- V03 (vanlig dose innenfor det godkjente omfanget): 20 mg med tablett valgt, dose «20» → ingen plan
- V04 (uvanlige doser og grenseverdier): 15 mg, neste reduksjon, dose «15» → ingen plan
- V05 (uvanlige doser og grenseverdier): 10 mg, dose «10» → ingen plan
- V06 (uvanlige doser og grenseverdier): 12,5 mg, skrevet med komma, dose «12,5» → ingen plan
- V07 (uvanlige doser og grenseverdier): 25 mg, over høyeste dose, dose «25» → ingen plan
- V08 (uvanlige doser og grenseverdier): 0 mg, dose «0» → skjemaet mangler noe
- V09 (uvanlige doser og grenseverdier): dosen skrevet med bokstaver, dose «tjue» → skjemaet mangler noe
- V10 (pasientforhold, også ubesvarte): 65 år eller eldre, dose «20» → ingen plan
- V11 (pasientforhold, også ubesvarte): lang behandlingstid, dose «20» → ingen plan
- V12 (pasientforhold, også ubesvarte): tidligere seponeringssymptomer, dose «20» → ingen plan
- V13 (pasientforhold, også ubesvarte): under 18 år, dose «20» → ingen plan
- V14 (pasientforhold, også ubesvarte): akutt situasjon står ubesvart, dose «20» → ingen plan
- V15 (pasientforhold, også ubesvarte): dose utenfor rammen, begrunnet, dose «20» → ingen plan
- V16 (interaksjonssperrer): organfunksjon og interaksjoner ikke vurdert, dose «20» → ingen plan
- V17 (uvanlige doser og grenseverdier): mindre trinn enn regelens forslag, dose «20» → ingen plan
- V18 (utilgjengelige eller endrede preparater): dråper i stedet for tabletter, dose «20» → ingen plan

**`bytte-citalopram-sertralin`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`bytte-escitalopram-sertralin`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`kryssnedtrapping-sertralin-mirtazapin`** – 14 av 14 valg gir ingen plan:

- S00 (utilgjengelige eller endrede preparater): sertralin 100 mg uten valgt legemiddelform: siden ber om valget, dose «100» → ber om legemiddelform
- S01 (vanlig dose innenfor det godkjente omfanget): sertralin 100 mg, dose «100» → ingen plan
- S02 (vanlig dose innenfor det godkjente omfanget): sertralin 50 mg, dose «50» → ingen plan
- S03 (injeksjons- og startdatoer): sertralin 100 mg med startdato, dose «100» → ingen plan
- S04 (uvanlige doser og grenseverdier): sertralin 75 mg, dose «75» → ingen plan
- S05 (uvanlige doser og grenseverdier): sertralin 150 mg, dose «150» → ingen plan
- S06 (uvanlige doser og grenseverdier): sertralin 200 mg, dose «200» → ingen plan
- S07 (uvanlige doser og grenseverdier): sertralin 25 mg, dose «25» → ingen plan
- S08 (pasientforhold, også ubesvarte): lang behandlingstid, dose «100» → ingen plan
- S09 (pasientforhold, også ubesvarte): tidligere seponeringssymptomer, dose «100» → ingen plan
- S10 (pasientforhold, også ubesvarte): tidligere seponeringssymptomer står ubesvart, dose «100» → ingen plan
- S11 (interaksjonssperrer): annen serotonerg legemiddelbruk ikke vurdert, dose «100» → ingen plan
- S12 (interaksjonssperrer): toleranse ved overlapp ikke vurdert, dose «100» → ingen plan
- S13 (utilgjengelige eller endrede preparater): mirtazapin som smeltetablett, dose «100» → ingen plan

**`depot-aripiprazol-maintena`** – 9 av 13 valg gir ingen plan:

- M04 (uvanlige doser og grenseverdier): aripiprazol 25 mg, dose «25» → ingen plan
- M05 (uvanlige doser og grenseverdier): aripiprazol 5 mg, dose «5» → ingen plan
- M06 (uvanlige doser og grenseverdier): aripiprazol 12,5 mg, dose «12,5» → ingen plan
- M08 (pasientforhold, også ubesvarte): kjent langsom CYP2D6-omsetter, dose «15» → ingen plan
- M09 (interaksjonssperrer): sterk CYP2D6- eller CYP3A4-hemmer, dose «15» → ingen plan
- M10 (interaksjonssperrer): CYP3A4-induktor, dose «15» → ingen plan
- M11 (interaksjonssperrer): hemmer står ubesvart, dose «15» → ingen plan
- M12 (pasientforhold, også ubesvarte): indikasjonen ikke bekreftet, dose «15» → ingen plan
- M13 (utilgjengelige eller endrede preparater): presentasjonen til injeksjon annenhver måned, dose «15» → ingen plan

**`antipsykotikabytte-olanzapin-aripiprazol`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`depot-paliperidon-xeplion`** – 10 av 19 valg gir ingen plan:

- X05 (injeksjons- og startdatoer): startdato som ikke finnes, dose «6» → ingen plan
- X08 (uvanlige doser og grenseverdier): paliperidon 3 mg uten måldose, dose «3» → skjemaet mangler noe
- X10 (uvanlige doser og grenseverdier): paliperidon 3 mg med måldose 75 mg, dose «3» → ingen plan
- X11 (uvanlige doser og grenseverdier): paliperidon 7 mg, dose «7» → ingen plan
- X12 (uvanlige doser og grenseverdier): paliperidon 15 mg, dose «15» → ingen plan
- X13 (pasientforhold, også ubesvarte): kreatininclearance under 80 ml/min, dose «6» → ingen plan
- X14 (pasientforhold, også ubesvarte): nyrefunksjonen står ubesvart, dose «6» → ingen plan
- X21 (uvanlige doser og grenseverdier): paliperidon 3 mg med måldose 25 mg, nedre grense i spennet, dose «3» → ingen plan
- X22 (uvanlige doser og grenseverdier): paliperidon 3 mg med måldose 24,99 mg, dose «3» → ingen plan
- X23 (uvanlige doser og grenseverdier): paliperidon 3 mg med måldose 50,01 mg, dose «3» → ingen plan

**`antipsykotikabytte-risperidon-aripiprazol`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`depot-risperidon-xeplion`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`tillegg-litium-lamotrigin`** – 0 av 0 valg gir ingen plan:

- Ingen.

**`tillegg-valproat-lamotrigin`** – 0 av 0 valg gir ingen plan:

- Ingen.

## 5. Regler som finnes, men ikke gir plan

Regelutkast som er kontrollert og ikke godkjent (eller bare fagtekst), og som derfor aldri gir en plan: verktøyet viser «kontrollert, ikke godkjent» eller «bare fagtekst, ikke beregnbar», eller, der en annen regel for samme kombinasjon er godkjent, stopper når valgene peker på denne regelen (som den langsomme varianten for vortioksetin etter tidligere seponeringsplager). Hvorfor hver av dem ikke er godkjent, står i `docs/verktøy-p7-nedtrapping.md` §11 og `docs/verktøy-p4-regelmodell.md` §11.

| Verktøy | Regel | Kombinasjon | Type | Kontrollutfall |
| --- | --- | --- | --- | --- |
| Trappe ned antidepressiv | `seponering-amitriptylin` v12 | Amitriptylin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-amitriptylin-langsom` v8 | Amitriptylin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-citalopram` v9 | Citalopram | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-duloksetin` v6 | Duloksetin | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-escitalopram-langsom` v8 | Escitalopram | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-fluoksetin` v12 | Fluoksetin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-fluoksetin-annenhver-dag` v5 | Fluoksetin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-fluoksetin-langsom` v8 | Fluoksetin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-fluvoksamin` v13 | Fluvoksamin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-fluvoksamin-langsom` v9 | Fluvoksamin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-klomipramin` v12 | Klomipramin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-klomipramin-langsom` v8 | Klomipramin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-mirtazapin` v8 | Mirtazapin | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-moklobemid` v9 | Moklobemid | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-nortriptylin` v12 | Nortriptylin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-nortriptylin-langsom` v8 | Nortriptylin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-paroksetin` v8 | Paroksetin | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-sertralin` v12 | Sertralin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-sertralin-langsom` v8 | Sertralin | beregnbar | ikke godkjent |
| Trappe ned antidepressiv | `seponering-venlafaksin` v6 | Venlafaksin | fagtekst | bare fagtekst |
| Trappe ned antidepressiv | `seponering-vortioksetin-langsom` v8 | Vortioksetin | beregnbar | ikke godkjent |
| Bytte antidepressiv | `bytte-citalopram-mirtazapin` v1 | Citalopram → Mirtazapin | beregnbar | til kontroll |
| Bytte antidepressiv | `bytte-escitalopram-mirtazapin` v1 | Escitalopram → Mirtazapin | beregnbar | til kontroll |
| Bytte antidepressiv | `bytte-sertralin-mirtazapin` v1 | Sertralin → Mirtazapin | beregnbar | til kontroll |
| Bytte antidepressiv | `mao-fluoksetin-fenelzin` v7 | Fluoksetin → Fenelzin | beregnbar | ikke godkjent |
| Bytte antipsykotikum | `antipsykotikabytte-aripiprazol-olanzapin` v2 | Aripiprazol (peroral) → Olanzapin (peroral) | beregnbar | til kontroll |
| Bytte antipsykotikum | `antipsykotikabytte-aripiprazol-risperidon` v5 | Aripiprazol (peroral) → Risperidon (peroral) | beregnbar | til kontroll |
| Bytte antipsykotikum | `antipsykotikabytte-kariprazin-kvetiapin` v2 | Kariprazin → Kvetiapin | beregnbar | til kontroll |
| Bytte antipsykotikum | `antipsykotikabytte-olanzapin-kvetiapin` v5 | Olanzapin (peroral) → Kvetiapin | beregnbar | ikke godkjent |
| Bytte antipsykotikum | `depot-consta-xeplion` v3 | Risperidon (depotinjeksjon) → Paliperidon (depotinjeksjon (paliperidonpalmitat)) | beregnbar | til kontroll |

## 6. Hvorfor de andre kombinasjonene stopper

### Trappe ned antidepressiv

| Virkestoff | Utfall | Status i P7-dekningen | Forklaringen verktøyet gir |
| --- | --- | --- | --- |
| Doksepin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | FEST lenker ikke til noen preparatomtale for doksepin, og kildens Stop-oppføring er hentet fra kildens egen side fordi lenken i tabellen ikke svarer. OUSFAR har derfor ingen regel for doksepin. |
| Dosulepin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | Dosulepin har ingen preparater i FEST. OUSFAR har derfor ingen regel for dosulepin. |
| Fenelzin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | mangler anbefaling | Fenelzin finnes i Norge bare med godkjenningsfritak og har ingen norsk preparatomtale, og kildens Stop-oppføring er ikke tilgjengelig. OUSFAR har derfor ingen regel for fenelzin. |
| Imipramin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | Imipramin finnes i Norge bare med godkjenningsfritak og har ingen norsk preparatomtale. OUSFAR har derfor ingen regel for imipramin. |
| Maprotilin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | Maprotilin har ingen preparater i FEST. OUSFAR har derfor ingen regel for maprotilin. |
| Tranylcypromin | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | Tranylcypromin finnes i Norge bare med godkjenningsfritak og har ingen norsk preparatomtale. OUSFAR har derfor ingen regel for tranylcypromin. |
| Trazodon | Ingen OUSFAR-regel; begrenset av preparater eller kilde | annen begrunnet begrensning | Trazodon finnes i Norge bare med godkjenningsfritak og har ingen norsk preparatomtale. OUSFAR har derfor ingen regel for trazodon. |

### Bytte antidepressiv

Per fra-valg: hvor mange til-valg som gir plan eller godkjent fagtekst, hvor mange som har en regel uten godkjenning, og hvor mange som ikke har noen OUSFAR-regel, delt etter om kildetabellen har en anbefaling for kombinasjonen. En anbefaling i kildetabellen er ikke en OUSFAR-regel; uten tillatelse fra utgiveren lages reglene som selvstendige vurderinger per kombinasjon, ikke som en systematisk overføring av tabellen.

| Fra | Til-valg | Plan eller godkjent fagtekst | Regel uten godkjenning | Ingen regel, kilden har anbefaling | Ingen regel, kilden har ingen | Middels langtidsvirkende |
| --- | --- | --- | --- | --- | --- | --- |
| Agomelatin | 22 | 0 | 0 | 22 | 0 | 0 |
| Amitriptylin | 22 | 0 | 0 | 22 | 0 | 0 |
| Bupropion | 22 | 0 | 0 | 22 | 0 | 0 |
| Citalopram | 22 | 1 | 1 | 20 | 0 | 0 |
| Doksepin | 22 | 0 | 0 | 22 | 0 | 0 |
| Dosulepin | 22 | 0 | 0 | 22 | 0 | 0 |
| Duloksetin | 22 | 0 | 0 | 22 | 0 | 0 |
| Escitalopram | 22 | 1 | 1 | 20 | 0 | 0 |
| Fenelzin | 22 | 0 | 0 | 22 | 0 | 0 |
| Fluoksetin | 22 | 0 | 1 | 21 | 0 | 0 |
| Fluvoksamin | 22 | 0 | 0 | 22 | 0 | 0 |
| Imipramin | 22 | 0 | 0 | 22 | 0 | 0 |
| Klomipramin | 22 | 0 | 0 | 22 | 0 | 0 |
| Maprotilin | 22 | 0 | 0 | 22 | 0 | 0 |
| Mirtazapin | 22 | 0 | 0 | 22 | 0 | 0 |
| Moklobemid | 22 | 0 | 0 | 22 | 0 | 0 |
| Nortriptylin | 22 | 0 | 0 | 22 | 0 | 0 |
| Paroksetin | 22 | 0 | 0 | 22 | 0 | 0 |
| Sertralin | 22 | 1 | 0 | 21 | 0 | 0 |
| Tranylcypromin | 22 | 0 | 0 | 22 | 0 | 0 |
| Trazodon | 22 | 0 | 0 | 22 | 0 | 0 |
| Venlafaksin | 22 | 0 | 0 | 22 | 0 | 0 |
| Vortioksetin | 22 | 0 | 0 | 22 | 0 | 0 |

### Bytte antipsykotikum

Per fra-valg: hvor mange til-valg som gir plan eller godkjent fagtekst, hvor mange som har en regel uten godkjenning, og hvor mange som ikke har noen OUSFAR-regel, delt etter om kildetabellen har en anbefaling for kombinasjonen. En anbefaling i kildetabellen er ikke en OUSFAR-regel; uten tillatelse fra utgiveren lages reglene som selvstendige vurderinger per kombinasjon, ikke som en systematisk overføring av tabellen.

| Fra | Til-valg | Plan eller godkjent fagtekst | Regel uten godkjenning | Ingen regel, kilden har anbefaling | Ingen regel, kilden har ingen | Middels langtidsvirkende |
| --- | --- | --- | --- | --- | --- | --- |
| Amisulprid | 33 | 0 | 0 | 24 | 8 | 1 |
| Aripiprazol (peroral) | 33 | 1 | 2 | 22 | 7 | 1 |
| Aripiprazol (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Brekspiprazol | 33 | 0 | 0 | 25 | 7 | 1 |
| Flufenazin (peroral) | 33 | 0 | 0 | 27 | 5 | 1 |
| Flufenazin (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Flupentiksol (peroral) | 33 | 0 | 0 | 27 | 5 | 1 |
| Flupentiksol (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Haloperidol (peroral) | 33 | 0 | 0 | 25 | 7 | 1 |
| Haloperidol (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Kariprazin | 33 | 0 | 1 | 24 | 7 | 1 |
| Klorprotiksen | 33 | 0 | 0 | 27 | 5 | 1 |
| Klozapin | 33 | 0 | 0 | 24 | 8 | 1 |
| Kvetiapin | 33 | 0 | 0 | 24 | 8 | 1 |
| Loksapin | 33 | 0 | 0 | 27 | 5 | 1 |
| Lurasidon | 33 | 0 | 0 | 24 | 8 | 1 |
| Olanzapin (peroral) | 33 | 1 | 1 | 23 | 7 | 1 |
| Olanzapin (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Paliperidon (peroral) | 33 | 1 | 0 | 25 | 6 | 1 |
| Paliperidon (depotinjeksjon (paliperidonpalmitat)) | 33 | 0 | 0 | 32 | 0 | 1 |
| Penfluridol | 33 | 0 | 0 | 24 | 8 | 1 |
| Perfenazin | 33 | 0 | 0 | 27 | 5 | 1 |
| Perisiazin | 33 | 0 | 0 | 27 | 5 | 1 |
| Pimozid | 33 | 0 | 0 | 24 | 8 | 1 |
| Promazin | 33 | 0 | 0 | 27 | 5 | 1 |
| Risperidon (peroral) | 33 | 2 | 0 | 24 | 6 | 1 |
| Risperidon (depotinjeksjon) | 33 | 0 | 1 | 31 | 0 | 1 |
| Sertindol | 33 | 0 | 0 | 24 | 8 | 1 |
| Sulpirid | 33 | 0 | 0 | 24 | 8 | 1 |
| Trifluoperazin | 33 | 0 | 0 | 27 | 5 | 1 |
| Ziprasidon | 33 | 0 | 0 | 27 | 5 | 1 |
| Zuklopentiksol (peroral) | 33 | 0 | 0 | 27 | 5 | 1 |
| Zuklopentiksol (depotinjeksjon) | 33 | 0 | 0 | 32 | 0 | 1 |
| Zuklopentiksol (middels langtidsvirkende injeksjon) | 33 | 0 | 0 | 0 | 0 | 33 |

## 7. Modellberegning: hvor langt nedtrappingsreglene kommer med norske styrker

**Dette er et beslutningsgrunnlag til faglig kontroll, ikke en regel, en anbefaling eller noe verktøyet bruker.** Hovedregelen for hvert beregnbare virkestoff er regnet med de markedsførte preparatene i FEST-uttrekket 2026-10-30 fra regelens vanlige dose (som i aksepttesten, `docs/verktøy-p7-aksepttest.md`). Ved hvert trinn som ikke kan gis nøyaktig, velges dosen nærmest regelens forslag blant dosene som tilbys (en simulering av forskriverens valg, som scenario (h) i aksepttesten). Det eneste som endres, er den øvre grensen for en faktisk reduksjon som kan tilbys uten begrunnelse; i dag er den 25 % ved kort og 10 % ved lang behandlingstid. Grensen på 25 % fra laveste døgndose, horisonten på 12 reduksjoner, toleransen (ingen), delingsreglene og alt annet er uendret. Ingen plan går til null.

Tabellene viser derfor hvor mye av begrensningen som skyldes trinngrensen, og hvor mye som skyldes styrkene og delingen. «Med delte tabletter» betyr at minst én dose deler en tablett FEST oppgir som delbar; for klomipramin er deling utenfor regelens kliniske omfang (kontrollørens gjennomgang av d6cc3dd). De sier ingenting om hvilken grense som er klinisk forsvarlig; det er spørsmålet i `docs/verktøy-vdk2-prioritering.md`.

### Kort behandlingstid (regelens forslag per trinn)

| Virkestoff | Form | Startdose | I dag: høyst 25 % | høyst 33⅓ % | høyst 50 % |
| --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | 50 mg | 50 → 40 → 30 → 25 → 20 mg (4 reduksjoner) | 50 → 40 → 30 → 25 → 20 mg (4 reduksjoner) | 50 → 40 → 30 → 25 → 20 → 10 mg (5 reduksjoner) |
| escitalopram | Tablett | 20 mg | 20 → 15 mg (1 reduksjon) | 20 → 15 → 10 mg (2 reduksjoner) | 20 → 15 → 10 → 5 mg (3 reduksjoner) |
| escitalopram | Dråper, oppløsning | 20 mg | 20 → 15 → 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg (10 reduksjoner) | 20 → 15 → 11 → 8 → 6 → 5 → 4 → 3 → 2 → 1 mg (9 reduksjoner) | 20 → 15 → 11 → 8 → 6 → 5 → 4 → 3 → 2 → 1 mg (9 reduksjoner) |
| fluoksetin | Dispergerbar tablett | 40 mg | 40 → 30 mg (1 reduksjon, med delte tabletter) | 40 → 30 → 20 mg (2 reduksjoner, med delte tabletter) | 40 → 30 → 20 → 10 mg (3 reduksjoner, med delte tabletter) |
| fluoksetin | Tablett | 40 mg | 40 → 30 mg (1 reduksjon, med delte tabletter) | 40 → 30 → 20 mg (2 reduksjoner, med delte tabletter) | 40 → 30 → 20 → 10 mg (3 reduksjoner, med delte tabletter) |
| fluvoksamin | eneste form | 100 mg | 100 → 75 mg (1 reduksjon, med delte tabletter) | 100 → 75 → 50 mg (2 reduksjoner, med delte tabletter) | 100 → 75 → 50 mg (2 reduksjoner, med delte tabletter) |
| klomipramin | eneste form | 50 mg | 50 → 37,5 → 30 → 22,5 → 17,5 → 15 → 12,5 → 10 mg (7 reduksjoner, med delte tabletter) | 50 → 37,5 → 27,5 → 20 → 15 → 12,5 → 10 mg (6 reduksjoner, med delte tabletter) | 50 → 37,5 → 27,5 → 20 → 15 → 12,5 → 10 mg (6 reduksjoner, med delte tabletter) |
| nortriptylin | eneste form | 50 mg | 50 → 40 → 30 → 25 → 20 mg (4 reduksjoner) | 50 → 40 → 30 → 25 → 20 mg (4 reduksjoner) | 50 → 40 → 30 → 25 → 20 mg (4 reduksjoner) |
| sertralin | eneste form | 100 mg | 100 → 75 mg (1 reduksjon) | 100 → 75 → 50 mg (2 reduksjoner) | 100 → 75 → 50 → 25 mg (3 reduksjoner) |
| vortioksetin | eneste form | 20 mg | 20 → 15 mg (1 reduksjon) | 20 → 15 → 10 mg (2 reduksjoner) | 20 → 15 → 10 → 5 mg (3 reduksjoner) |

### Lang behandlingstid (forslag 10 % per trinn)

| Virkestoff | Form | Startdose | I dag: høyst 10 % | høyst 25 % |
| --- | --- | --- | --- | --- |
| amitriptylin | eneste form | 50 mg | 50 → 45 mg (1 reduksjon) | 50 → 45 → 40 → 35 → 30 → 25 → 20 mg (6 reduksjoner) |
| escitalopram | Tablett | 20 mg | stopper før første reduksjon | 20 → 15 mg (1 reduksjon) |
| escitalopram | Dråper, oppløsning | 20 mg | 20 → 18 → 17 → 16 → 15 → 14 → 13 → 12 → 11 → 10 → 9 mg (10 reduksjoner) | 20 → 18 → 16 → 14 → 13 → 12 → 11 → 10 → 9 → 8 → 7 → 6 → 5 mg (12 reduksjoner) |
| fluoksetin | Dispergerbar tablett | 40 mg | stopper før første reduksjon | 40 → 30 mg (1 reduksjon, med delte tabletter) |
| fluoksetin | Tablett | 40 mg | stopper før første reduksjon | 40 → 30 mg (1 reduksjon, med delte tabletter) |
| fluvoksamin | eneste form | 100 mg | stopper før første reduksjon | 100 → 75 mg (1 reduksjon, med delte tabletter) |
| klomipramin | eneste form | 50 mg | 50 → 45 → 42,5 → 40 → 37,5 → 35 → 32,5 → 30 → 27,5 → 25 → 22,5 mg (10 reduksjoner, med delte tabletter) | 50 → 45 → 40 → 35 → 32,5 → 30 → 27,5 → 25 → 22,5 → 20 → 17,5 → 15 → 12,5 mg (12 reduksjoner, med delte tabletter) |
| nortriptylin | eneste form | 50 mg | 50 → 45 mg (1 reduksjon) | 50 → 45 → 40 → 35 → 30 → 25 → 20 mg (6 reduksjoner) |
| sertralin | eneste form | 100 mg | stopper før første reduksjon | 100 → 75 mg (1 reduksjon) |
| vortioksetin | eneste form | 20 mg | stopper før første reduksjon | 20 → 15 mg (1 reduksjon) |
