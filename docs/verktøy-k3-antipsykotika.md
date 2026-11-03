# OUSFAR Verktøy – K3: bytte av antipsykotika

**Status 03.11.2026:** fem regelutkast, alle **til uavhengig faglig kontroll** og ingen klinisk godkjent. Appen viser derfor ingen klinisk plan for dem ennå. En godkjenning gjelder bare nøyaktig regelversjonen og fingeravtrykket i `docs/verktøy-k3-antipsykotikabytter.md`, som er laget av reglene i `src/verktoy/regler/antipsykotikabytter.ts` og viser hver regels kilder, forutsetninger, unntak og regneeksempler. Styrende plan: `docs/verktøy-klinisk-leveranseplan-2026-11.md` (K3).

## 1. Hva som blir mulig

Før K3 kunne «Bytte antipsykotikum» bare beregne to snevre depotforløp: oppstart av Abilify Maintena fra peroral aripiprazol (v3) og Xeplion fra paliperidon depottablett (v3). Når en kontrollør har godkjent reglene, kan en kliniker også få en **komplett plan** (det gamle stoppes, og det nye står på et fast eller definert regime) for:

| Forløp | Sluttmål | Regel |
| --- | --- | --- |
| Peroral risperidon → Xeplion | Risperidon seponert; Xeplion 150 mg dag 1 og 100 mg dag 8 (±4 dager) i deltoideus; deretter valgt vedlikeholdsdose 50–150 mg hver måned (±7 dager) | `depot-risperidon-xeplion` |
| Risperdal Consta → Xeplion | Consta gis ikke mer; Xeplion i stedet for neste Consta-injeksjon i dosen fra tabellen (25 → 50, 37,5 → 75, 50 → 100 mg), deretter samme dose hver måned | `depot-consta-xeplion` |
| Aripiprazol → olanzapin (peroralt) | Aripiprazol stoppet; olanzapin 10 mg daglig fra dag 1 | `antipsykotikabytte-aripiprazol-olanzapin` |
| Aripiprazol → risperidon (peroralt) | Aripiprazol stoppet; risperidon 2 mg dag 1 og 4 mg daglig fra dag 2 | `antipsykotikabytte-aripiprazol-risperidon` |
| Kariprazin → kvetiapin (peroralt) | Kariprazin stoppet; kvetiapin 50, 100 og 200 mg dag 1–3 og 300 mg daglig fra dag 4, fordelt på to doser | `antipsykotikabytte-kariprazin-kvetiapin` |

Dermed er kravet i K3 oppfylt med to depotrelaterte og tre perorale forløp. Videre doseringsjustering etter sluttmålet er en klinisk vurdering og beregnes ikke.

## 2. Hvorfor disse forløpene

Leveranseplanen krever at ingen regel bygger på udokumenterte antakelser og at Psychiatrienets tabeller ikke konverteres før rettighetene er avklart (`docs/verktøy-p3-rettigheter.md`). Reglene er derfor valgt fordi **kildene selv beskriver hele forløpet**, så verken dose, frist eller nedtrapping er OUSFARs eget påfunn:

- **Xeplion** (EMA, pkt. 4.2) beskriver oppstarten fra peroral risperidon og overgangen fra risperidon depotinjeksjon med en egen dosetabell.
- **Keks 2019** sier at et direkte bytte er mulig når det første antipsykotikumet er aripiprazol (svært lang halveringstid, ingen antikolinerg effekt), og at et opphold uten antipsykotikum ikke anbefales. Startdosene og opptrappingen av det nye stoffet er hentet fra preparatomtalene for olanzapin (Zyprexa) og risperidon (Risperdal).
- **Reagila** (EMA, pkt. 4.2) sier at ingen kryss-titrering trengs ved bytte fra kariprazin, og at det nye startes i laveste dose. Opptrappingen av kvetiapin er hentet fra preparatomtalen for Seroquel.

Psychiatrienet står bare som referanse til kildeoppføringene (Rd>Dp, Dr>Dp, Pa>Ol, Pa>Rd, Pa>Qu); ingen tekst derfra er brukt.

## 3. Kilder

| Kilde | Versjon | Brukt til |
| --- | --- | --- |
| Xeplion, EMA-produktinformasjon (`ema-xeplion`) | Sist endret 08.10.2026 | Oppstart, vedlikehold 25–150 mg, vinduer ±4/±7 dager, bytte fra peroral risperidon og fra risperidon depotinjeksjon, nyrefunksjon, eldre |
| Risperdal tabletter, DMP (`dmp-risperdal`, ny) | Oppdatert 19.08.2022 | Startdose og opptrapping ved schizofreni, høyeste dose 16 mg, eldre, nyre/lever, CYP2D6/CYP3A4 |
| Risperdal Consta, DMP (`dmp-risperdal-consta`, ny) | Oppdatert 11.05.2021 | Dosene 25–50 mg hver 2. uke |
| Reagila, EMA-produktinformasjon (`ema-reagila`, ny) | PDF datert 11.12.2025 | Doseområde 1,5–6 mg, bytte fra kariprazin, halveringstid, indikasjon |
| Abilify, EMA-produktinformasjon (`ema-abilify`) | Sist endret 08.10.2026 | Doseområde 10–30 mg |
| Zyprexa, EMA-produktinformasjon (`ema-zyprexa`) | Sist endret 08.10.2026 | Startdose 10 mg, lavere startdose ved alder, organfunksjon, langsom omsetning og CYP1A2-hemmere |
| Seroquel tabletter, DMP (`dmp-seroquel`) | Oppdatert 03.07.2024 | Opptrapping 50/100/200/300 mg, eldre, lever, CYP3A4-hemmere |
| Keks N mfl., Aust Prescr 2019;42:152–157 (`keks-2019`) | doi:10.18773/austprescr.2019.052 | Direkte bytte, bytte fra aripiprazol, depot til depot, ingen opphold, spesialistvurdering |

Alle kildene ligger med kontrollsum i `src/verktoy/regler/kilder.ts`; faktaene er gjengitt med egne ord.

## 4. Norske preparater (FEST)

Planene bruker bare preparater i FEST-kopien `src/data/verktoy/fest-antipsykotika.json` (hentet 03.11.2026, kontrollert mot FEST samme natt), med samme krav til ferskhet som ellers (høyst 48 timer i appen).

- **Paliperidon depotinjeksjon:** bare **Xeplion** er omfattet (50, 75, 100 og 150 mg; 25 mg er bare på godkjenningsfritak og stopper). Niapelf, Palmeux og Paliperidon Zentiva er ikke kontrollert mot regelen, og Trevicta (hver 3. måned) er ikke omfattet.
- **Risperidon:** peroral risperidon (Risperdal og generiske tabletter, mikstur) som utgangspunkt; i aripiprazolbyttet brukes bare tabletter. Depot: bare **Risperdal Consta** hver 2. uke; Okedi har et annet intervall og stopper (forskriveren må bekrefte at depotet er Consta).
- **Aripiprazol, olanzapin:** flere legemiddelformer finnes i FEST. Aripiprazol bare stoppes, så formen spørres ikke om; for olanzapin velger forskriveren form (for eksempel tablett) før planen beregnes.
- **Kariprazin:** Reagila kapsler 1,5–6 mg.
- **Kvetiapin:** bare vanlige tabletter (Seroquel og generiske). Depottabletter er ikke omfattet. FEST har ingen vanlig 50 mg-tablett, så 50 + 50 mg gis som 4 tabletter à 25 mg; 300 mg fordeles som 200 + 100 mg.

## 5. Forløp som fungerer og som stopper

Alle eksemplene er syntetiske. Testene i `src/__tests__/verktoyantipsykotika.test.ts` kjører dem gjennom samme vei som verktøysiden, med en **simulert** godkjenning av nøyaktig versjonen og fingeravtrykket.

**Komplette planer (med simulert godkjenning):**

- Risperidon 4 mg → Xeplion 75 mg, start 01.12.2026: risperidon seponert fra 01.12; 150 mg 01.12 og 100 mg 08.12 (±4 dager) i deltoideus; 75 mg hver måned fra 08.01.2027 (±7 dager), deltoideus eller setemuskel. Også 16 mg → 150 mg.
- Consta 37,5 mg, neste injeksjon 15.12.2026 → ingen flere Consta-injeksjoner; Xeplion 75 mg 15.12, deretter 75 mg hver måned fra 15.01.2027. Consta 25 → 50 mg og 50 → 100 mg.
- Aripiprazol 15 mg (og 30 mg) → olanzapin 10 mg daglig fra dag 1.
- Aripiprazol 15 mg → risperidon 2 mg dag 1, 4 mg fra dag 2.
- Kariprazin 4,5 mg (og 1,5 og 6 mg) → kvetiapin 50/100/200 mg dag 1–3, 300 mg fra dag 4.

**Stopper med forklaring:**

- Xeplion-vedlikehold 25 mg (ikke markedsført), over 150 mg eller uten valgt dose; risperidon over 16 mg; Consta-dose utenfor tabellen (for eksempel 62,5 mg); aripiprazol under 10 eller over 30 mg; kariprazin over 6 mg.
- Kreatininclearance under 80 ml/min eller alder over 65 år (Xeplion); 65 år eller eldre, nedsatt nyre- eller leverfunksjon, langsom omsetning eller CYP1A2-hemmer (olanzapin); interagerende CYP2D6-hemmer eller CYP3A4-induktor (risperidon); nedsatt leverfunksjon eller CYP3A4-hemmer (kvetiapin). Et ubesvart unntak stopper like mye som et ja.
- Manglende bekreftelse av indikasjon, peroral formulering, spesialistvurdering eller (fra Consta) at depotet er Consta og at dag 1 er dagen neste injeksjon skulle vært gitt.
- Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke), regelen er ikke godkjent, eller FEST-kopien er eldre enn 48 timer.

**Ikke dekket (fortsatt ingen plan):**

- Bytte til aripiprazol ved gjentatte tilbakefall eller hos innlagte: TARC har egne, raskere opptrappinger som ikke er modellert.
- Bytte til aripiprazol fra andre stoffer enn olanzapin og risperidon.
- Okedi (hver 28. dag) og Xeplion → Trevicta: krever støtte i beregningsmotoren for andre intervaller og preparatvalg.
- Kryss-titrering som alternativ til direkte bytte, og alle andre kombinasjoner.

## 6. Åpne faglige spørsmål til kontrolløren

1. **Vedlikeholdsdosen etter peroral risperidon (Xeplion):** preparatomtalen har ingen omregning fra risperidondose, så regelen binder ikke vedlikeholdsdosen til den (risperidon 0,5 mg kan gå til 150 mg og 16 mg til 50 mg). Forskriveren velger 50–150 mg (75 mg anbefalt). Er det en forsvarlig avgrensning, eller skal regelen kreve en begrunnelse for kombinasjoner langt fra hverandre? OUSFAR vil ikke finne på en ekvivalens.
2. **Direkte bytte fra aripiprazol:** Keks beskriver det som *mulig*, ikke som eneste strategi. Er direkte bytte, med spesialistvurdering og tett oppfølging som krav, akseptabelt som det eneste beregnede alternativet? Aripiprazoldosen (10–30 mg) dokumenterer bare stabiliseringen. Aripiprazol bare stoppes, og mikstur gjør enhver dose mulig, så dosen begrenses ikke til tablettstyrker. Måldosen for det nye stoffet er preparatomtalens start- og vedlikeholdsdose og er den samme uansett aripiprazoldose. Bør den avhenge av aripiprazoldosen?
3. **Sluttmålet for olanzapin og risperidon** er startdosen og vedlikeholdsdosen preparatomtalen oppgir (10 mg og 4 mg). Bør planen heller stoppe ved startdosen og overlate resten til klinikeren?
4. **Kvetiapin:** er fordelingen 200 + 100 mg og 4 × 25 mg på dag 2 akseptabel i en plan?
5. **Bytte til aripiprazol (TARC 2018):** er en industrifinansiert konsensusrapport godt nok grunnlag for en beregnet kryss-titrering? Er forslagene 5 mg uke 1 og 10 mg uke 2 (øverst i kildens områder, fordi 5 mg er laveste tablett) riktige? Er det riktig å stoppe når et trinn på 25 % ikke kan gis (for eksempel olanzapin 15 mg), i stedet for å runde av? De to doseforslagene er OUSFARs valg og må avklares før en godkjenning.

## 7. Visningen

Reglene bygger på regelmodell 12 og planvisningen fra motortråden. Hver av de fem planene er merket «Komplett plan til sluttmålet». Fra Consta viser planen «Seponert = ingen flere injeksjoner» på dag 1. Når det gamle stoffet bare stoppes, spør appen bare om formen for det nye.
