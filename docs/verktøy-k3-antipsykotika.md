# OUSFAR Verktøy – K3: bytte av antipsykotika

**Status 03.11.2026:** sju regelutkast, alle **til uavhengig faglig kontroll** og ingen klinisk godkjent. Appen viser derfor ingen klinisk plan for dem ennå. En godkjenning gjelder bare nøyaktig regelversjonen og fingeravtrykket i `docs/verktøy-k3-antipsykotikabytter.md`, som er laget av reglene i `src/verktoy/regler/antipsykotikabytter.ts` og viser hver regels kilder, forutsetninger, unntak og regneeksempler. Styrende plan: `docs/verktøy-klinisk-leveranseplan-2026-11.md` (K3). Etter kontrollørens første gjennomgang av #320 er tre av reglene i versjon 2 (se §6).

## 1. Hva som blir mulig

Før K3 kunne «Bytte antipsykotikum» bare beregne to snevre depotforløp: oppstart av Abilify Maintena fra peroral aripiprazol (v3) og Xeplion fra paliperidon depottablett (v3). Når en kontrollør har godkjent reglene, kan en kliniker også få en **komplett plan** (det gamle stoppes, og det nye står på et fast eller definert regime) for:

| Forløp | Sluttmål | Regel |
| --- | --- | --- |
| Peroral risperidon → Xeplion | Risperidon seponert; Xeplion 150 mg dag 1 og 100 mg dag 8 (±4 dager) i deltoideus; deretter valgt vedlikeholdsdose 50–150 mg hver måned (±7 dager), der en annen dose enn anbefalte 75 mg krever en skriftlig begrunnelse | `depot-risperidon-xeplion` (v2) |
| Risperdal Consta → Xeplion | Consta gis ikke mer; Xeplion i stedet for neste Consta-injeksjon i dosen fra tabellen (25 → 50, 37,5 → 75, 50 → 100 mg), deretter samme dose hver måned | `depot-consta-xeplion` |
| Aripiprazol → olanzapin (peroralt) | Aripiprazol stoppet; olanzapin 10 mg fra dag 1 og, etter en ny vurdering, den valgte måldosen 5–20 mg (forslag: fra dag 8) | `antipsykotikabytte-aripiprazol-olanzapin` (v2) |
| Aripiprazol → risperidon (peroralt) | Aripiprazol stoppet; risperidon 2 mg dag 1 og 4 mg fra dag 2 og, etter en ny vurdering, den valgte måldosen (høyst 16 mg; utenfor 4–6 mg med begrunnelse; forslag: fra dag 9) | `antipsykotikabytte-aripiprazol-risperidon` (v2) |
| Kariprazin → kvetiapin (peroralt) | Kariprazin stoppet; kvetiapin 50, 100 og 200 mg dag 1–3 og 300 mg daglig fra dag 4, fordelt på to doser | `antipsykotikabytte-kariprazin-kvetiapin` |
| Olanzapin → aripiprazol (peroralt, K0-07) | Kryss-titrering: aripiprazol 5 mg første uke, 10 mg andre uke og så valgt dose 10 eller 15 mg; olanzapin uendret i 28 dager, så ned 25 % av startdosen minst hver 14. dag til seponert | `antipsykotikabytte-olanzapin-aripiprazol` |
| Risperidon → aripiprazol (peroralt, K0-08) | Som over, med risperidon | `antipsykotikabytte-risperidon-aripiprazol` |

Dermed er kravet i K3 oppfylt med to depotrelaterte og fem perorale forløp. Videre doseringsjustering etter sluttmålet er en klinisk vurdering og beregnes ikke.

## 2. Hvorfor disse forløpene

Leveranseplanen krever at ingen regel bygger på udokumenterte antakelser og at Psychiatrienets tabeller ikke konverteres før rettighetene er avklart (`docs/verktøy-p3-rettigheter.md`). Reglene er derfor valgt fordi **kildene selv beskriver hele forløpet**, så verken dose, frist eller nedtrapping er OUSFARs eget påfunn:

- **Xeplion** (EMA, pkt. 4.2) beskriver oppstarten fra peroral risperidon og overgangen fra risperidon depotinjeksjon med en egen dosetabell.
- **Keks 2019** sier at et direkte bytte er mulig når det første antipsykotikumet er aripiprazol (svært lang halveringstid, ingen antikolinerg effekt), og at et opphold uten antipsykotikum ikke anbefales. Startdosene og opptrappingen av det nye stoffet er hentet fra preparatomtalene for olanzapin (Zyprexa) og risperidon (Risperdal).
- **Reagila** (EMA, pkt. 4.2) sier at ingen kryss-titrering trengs ved bytte fra kariprazin, og at det nye startes i laveste dose. Opptrappingen av kvetiapin er hentet fra preparatomtalen for Seroquel.
- **TARC 2018** (Veznedaroglu mfl., konsensusrapport med åpen tilgang) beskriver hele kryss-titreringen til aripiprazol hos stabile polikliniske pasienter: aripiprazol 2,5–5 mg første uke og 5–10 mg andre uke opp til 10–15 mg, minst 2 uker sammen med det gamle stoffet, og så nedtrapping av det gamle med 25 % minst hver 2. uke. Konsensusmøtet var finansiert av et legemiddelfirma (spørsmål 5). Doseområdet for aripiprazol er hentet fra Abilify.

Psychiatrienet står bare som referanse til kildeoppføringene (Rd>Dp, Dr>Dp, Pa>Ol, Pa>Rd, Pa>Qu, Ol>Pa, Rd>Pa); ingen tekst derfra er brukt.

## 3. Kilder

| Kilde | Versjon | Brukt til |
| --- | --- | --- |
| Xeplion, EMA-produktinformasjon (`ema-xeplion`) | Sist endret 08.10.2026 | Oppstart, vedlikehold 25–150 mg, vinduer ±4/±7 dager, bytte fra peroral risperidon og fra risperidon depotinjeksjon, nyrefunksjon, eldre |
| Risperdal tabletter, DMP (`dmp-risperdal`, ny) | Oppdatert 19.08.2022 | Startdose og opptrapping ved schizofreni, høyeste dose 16 mg, eldre, nyre/lever, CYP2D6/CYP3A4 |
| Risperdal Consta, DMP (`dmp-risperdal-consta`, ny) | Oppdatert 11.05.2021 | Dosene 25–50 mg hver 2. uke |
| Reagila, EMA-produktinformasjon (`ema-reagila`, ny) | PDF datert 11.12.2025 | Doseområde 1,5–6 mg, bytte fra kariprazin, halveringstid, indikasjon |
| Abilify, EMA-produktinformasjon (`ema-abilify`) | Sist endret 08.10.2026 | Doseområde 10–30 mg, interaksjoner (CYP3A4/CYP2D6), eldre |
| Zyprexa, EMA-produktinformasjon (`ema-zyprexa`) | Sist endret 08.10.2026 | Startdose 10 mg, lavere startdose ved alder, organfunksjon, langsom omsetning og CYP1A2-hemmere |
| Seroquel tabletter, DMP (`dmp-seroquel`) | Oppdatert 03.07.2024 | Opptrapping 50/100/200/300 mg, eldre, lever, CYP3A4-hemmere |
| Keks N mfl., Aust Prescr 2019;42:152–157 (`keks-2019`) | doi:10.18773/austprescr.2019.052 | Direkte bytte, bytte fra aripiprazol, depot til depot, ingen opphold, spesialistvurdering |
| Veznedaroglu B mfl., TARC, Ther Adv Psychopharmacol 2018;8(10):271–285 (`tarc-2018`, ny) | doi:10.1177/2045125318772712, PMC6130089 (CC BY-NC 3.0) | Kryss-titrering til aripiprazol hos stabile polikliniske pasienter (figur 1), andre pasientgrupper, oppfølging |

Alle kildene ligger med kontrollsum i `src/verktoy/regler/kilder.ts`; faktaene er gjengitt med egne ord.

## 4. Norske preparater (FEST)

Planene bruker bare preparater i FEST-kopien `src/data/verktoy/fest-antipsykotika.json` (hentet 03.11.2026, kontrollert mot FEST samme natt), med samme krav til ferskhet som ellers (høyst 48 timer i appen).

- **Paliperidon depotinjeksjon:** bare **Xeplion** er omfattet (50, 75, 100 og 150 mg; 25 mg er bare på godkjenningsfritak og stopper). Niapelf, Palmeux og Paliperidon Zentiva er ikke kontrollert mot regelen, og Trevicta (hver 3. måned) er ikke omfattet.
- **Risperidon:** peroral risperidon (Risperdal og generiske tabletter, mikstur) som utgangspunkt; i aripiprazolbyttet brukes bare tabletter. Depot: bare **Risperdal Consta** hver 2. uke; Okedi har et annet intervall og stopper (forskriveren må bekrefte at depotet er Consta).
- **Aripiprazol, olanzapin:** flere legemiddelformer finnes i FEST. Når aripiprazol bare stoppes, spørres det ikke om form; ellers velger forskriveren form (for eksempel tablett) før planen beregnes. Til aripiprazol gir tablettene 5, 10, 15 og 30 mg. Olanzapintablettene kan ikke deles, men risperidontablettene kan.
- **Kariprazin:** Reagila kapsler 1,5, 3, 4,5 og 6 mg; bare disse dosene godtas.
- **Kvetiapin:** bare vanlige tabletter (Seroquel og generiske). Depottabletter er ikke omfattet. FEST har ingen vanlig 50 mg-tablett, så 50 + 50 mg gis som 4 tabletter à 25 mg; 300 mg fordeles som 200 + 100 mg.

## 5. Forløp som fungerer og som stopper

Alle eksemplene er syntetiske. Testene i `src/__tests__/verktoyantipsykotika.test.ts` kjører dem gjennom samme vei som verktøysiden, med en **simulert** godkjenning av nøyaktig versjonen og fingeravtrykket.

**Komplette planer (med simulert godkjenning):**

- Risperidon 4 mg → Xeplion 75 mg, start 01.12.2026: risperidon seponert fra 01.12; 150 mg 01.12 og 100 mg 08.12 (±4 dager) i deltoideus; 75 mg hver måned fra 08.01.2027 (±7 dager), deltoideus eller setemuskel. Med skriftlig begrunnelse også 0,5 mg → 150 mg og 16 mg → 50 mg; begrunnelsen står i planen.
- Consta 37,5 mg, neste injeksjon 15.12.2026 → ingen flere Consta-injeksjoner; Xeplion 75 mg 15.12, deretter 75 mg hver måned fra 15.01.2027. Consta 25 → 50 mg og 50 → 100 mg.
- Aripiprazol 15 mg → olanzapin 10 mg dag 1–7, vurdering dag 8 og så den valgte måldosen (5, 15 eller 20 mg) fra dag 8. Med måldose 10 mg: 10 mg fra dag 1. Aripiprazol 10 og 30 mg gir også plan.
- Aripiprazol 15 mg → risperidon 2 mg dag 1, 4 mg dag 2–8 og den valgte måldosen fra dag 9 (for eksempel 6 mg), med vurdering før hver endring. Med måldose 4 mg: 4 mg fra dag 2.
- Kariprazin 4,5 mg (og 1,5 og 6 mg) → kvetiapin 50/100/200 mg dag 1–3, 300 mg fra dag 4.
- Olanzapin 20 mg → aripiprazol 15 mg, start 01.12.2026: aripiprazol 5 mg dag 1–7, 10 mg dag 8–14 og 15 mg fra dag 15; olanzapin 20 mg til dag 28, så 15, 10 og 5 mg i 14 dager hver og seponert fra dag 71 (09.02.2027). Også fra 10 mg (7,5, 5 og 2,5 mg).
- Risperidon 4 mg → aripiprazol 10 mg: risperidon 4 mg til dag 28, så 3, 2 og 1 mg og seponert fra dag 71. Risperidontablettene kan deles, så også 1–9, 12 og 16 mg gir plan.

**Stopper med forklaring:**

- Xeplion-vedlikehold 25 mg (ikke markedsført), over 150 mg eller uten valgt dose; en annen vedlikeholdsdose enn 75 mg uten skriftlig begrunnelse; manglende bekreftelse av dokumentert tidligere toleranse; risperidon over 16 mg; olanzapin-måldose utenfor 5–20 mg eller ikke valgt; risperidon-måldose over 16 mg, eller utenfor 4–6 mg uten begrunnelse; Consta-dose utenfor tabellen (for eksempel 62,5 mg); aripiprazol under 10 eller over 30 mg; kariprazin over 6 mg eller en dose kapslene ikke gir (2, 2,5 og 5 mg); aripiprazol-måldose utenfor 10–15 mg.
- Til aripiprazol: et nedtrappingstrinn på 25 % av startdosen som ikke kan gis nøyaktig med tablettene. Olanzapintablettene kan ikke deles, så bare 10 og 20 mg gir plan; 5, 7,5, 12,5, 15 og 17,5 mg stopper (for eksempel 15 mg → 11,25 mg). Risperidon 10, 13, 14 og 15 mg stopper (for eksempel 10 mg → 7,5 mg). Se spørsmål 6.
- Kreatininclearance under 80 ml/min eller alder over 65 år (Xeplion); 65 år eller eldre, nedsatt nyre- eller leverfunksjon, langsom omsetning eller CYP1A2-hemmer (olanzapin); interagerende CYP2D6-hemmer eller CYP3A4-induktor (risperidon); nedsatt leverfunksjon eller CYP3A4-hemmer (kvetiapin). Et ubesvart unntak stopper like mye som et ja.
- Manglende bekreftelse av indikasjon, peroral formulering, spesialistvurdering eller (fra Consta) at depotet er Consta og at dag 1 er dagen neste injeksjon skulle vært gitt.
- Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke), regelen er ikke godkjent, eller FEST-kopien er eldre enn 48 timer.
- Et preparat planen trenger, mangler i FEST (testet med Xeplion 150 mg fjernet): planen stopper og bytter ikke til et annet preparat.

**Ikke dekket (fortsatt ingen plan):**

- Bytte til aripiprazol ved gjentatte tilbakefall eller hos innlagte: TARC har egne, raskere opptrappinger som ikke er modellert.
- Bytte til aripiprazol fra andre stoffer enn olanzapin og risperidon.
- Okedi (hver 28. dag) og Xeplion → Trevicta: krever støtte i beregningsmotoren for andre intervaller og preparatvalg.
- Kryss-titrering som alternativ til direkte bytte, og alle andre kombinasjoner.

## 6. Åpne faglige spørsmål til kontrolløren

Kontrolløren gikk gjennom #320 03.11.2026. Svarene på spørsmål 1–3 er lagt inn som versjon 2 av tre regler; spørsmål 6 (valg c) og etiketten for Consta-dosen krever en endring i den felles motoren (#319) og er sendt dit.

1. **Vedlikeholdsdosen etter peroral risperidon (Xeplion), besvart i v2:** OUSFAR finner ikke på en omregning. Dokumentert tidligere toleranse er en egen bekreftelse, og en annen vedlikeholdsdose enn anbefalte 75 mg krever en skriftlig begrunnelse ut fra toleranse og effekt. Begrunnelsen står i planen sammen med risperidondosen. Gjenstår: er det nok kontroll av avvikende valg, eller trengs mer?
2. **Direkte bytte fra aripiprazol, besvart i v2:** startregimet og den valgte terapeutiske måldosen er atskilt (olanzapin 5–20 mg; risperidon høyst 16 mg, utenfor 4–6 mg med begrunnelse), med en ny klinisk vurdering før hver doseendring. Tiden på startregimet før måldosen er et åpent OUSFAR-valg (forslag: én uke, fordi aripiprazol virker i flere dager etter siste dose) og må avklares. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter og kan være tabletter, smeltetabletter eller mikstur. Indikasjonen er schizofreni; andre indikasjoner er ikke omfattet. Gjenstår: er direkte bytte, med spesialistvurdering og tett oppfølging som krav, akseptabelt som den eneste beregnede strategien?
3. **Sluttmålet for olanzapin og risperidon, besvart i v2:** sluttmålet er forskriverens valgte måldose, ikke en fast dose.
4. **Kvetiapin:** er fordelingen 200 + 100 mg og 4 × 25 mg på dag 2 akseptabel i en plan?
5. **Bytte til aripiprazol (TARC 2018):** er en industrifinansiert konsensusrapport godt nok grunnlag for en beregnet kryss-titrering? Er forslagene 5 mg uke 1 og 10 mg uke 2 (øverst i kildens områder, fordi 5 mg er laveste tablett) riktige? De to doseforslagene er OUSFARs valg og må avklares før en godkjenning.
6. **Avrunding av nedtrappingstrinnene til aripiprazol (QA 03.11.2026):** TARC sier bare «reduser dosen med 25 %» og gir eksemplene 20 → 15 → 10 → 5 og 4 → 3 → 2 → 1 mg. Kilden har ingen regel for doser der 25 % ikke går opp med tablettene. Derfor stopper vanlige olanzapindoser (5, 7,5, 15 og 17,5 mg) i stedet for å få en avrundet plan. En avrunding vil være en ny OUSFAR-regel, og verktøyet trenger støtte for den i beregningen. Mulige valg for kontrolløren:
   - a) Rund hvert trinn til nærmeste dose som kan gis (olanzapin i hele 2,5 mg), aldri over dosen før, og med samme antall trinn. For eksempel blir 15 mg til 10 (11,25), 7,5 og 2,5 (3,75) mg.
   - b) Faste trinn i mg i stedet for prosent, for eksempel 2,5 eller 5 mg per trinn for olanzapin.
   - c) Forskriveren velger nærmeste dose under eller over for hvert trinn som ikke går opp, slik nedtrappingsverktøyet allerede gjør (P7.5). Det finnes i dag bare for nedtrapping i prosent av den aktuelle dosen.
   - d) Behold stoppet: planen gjelder bare doser der hvert trinn kan gis nøyaktig.
   **Kontrolløren valgte c (03.11.2026):** et begrenset sett av doser som kan gis rundt det ideelle trinnet, valgt av forskriveren, med dokumentert faktisk reduksjon, et minstekrav til sikkerhet og ny beregning av resten av forløpet. Ingen automatisk avrunding. OUSFARs forslag til sikkerhetskrav, som følger kilden uten nye tall: aldri raskere enn 25 % av startdosen per 14 dager, så et større trinn får tilsvarende lengre tid (for eksempel 15 → 10 mg i 19 dager). Det krever støtte i den felles motoren (#319), som er bestilt. Inntil den finnes, gjelder d.

## 7. Visningen

Reglene bygger på regelmodell 12 og planvisningen fra motortråden. Hver av de sju planene er merket «Komplett plan til sluttmålet». Fra Consta viser planen «Seponert = ingen flere injeksjoner» på dag 1. Når det gamle stoffet bare stoppes, spør appen bare om formen for det nye.
