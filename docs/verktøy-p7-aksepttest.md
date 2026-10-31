<!-- Laget av `npm run verktoy:regler -- aksepttest` fra src/data/verktoy/fest-aksepttest.json; rediger ikke for hånd. -->
# P7: aksepttest med norske preparater

Aksepttesten etter kontrollrunden 30.10.2026 (P7.5, del E.2). Hver hovedregel og langsom variant i `ousfar-verktoy-nedtrapping` versjon 13 er regnet med de faktiske preparatene i FEST, ikke syntetiske, for hver legemiddelform forskriveren kan velge. FEST-uttrekket er hentet 30.10.2026 (kildedato 27.10.2026); bare preparater med markedsføringstillatelse som er markedsført, brukes, ikke godkjenningsfritak.

**Dette er modellberegninger til faglig kontroll, ikke kliniske planer.** Av de beregnbare P7-reglene er bare `seponering-vortioksetin` klinisk godkjent, og bare for cellene i det kliniske omfanget (**[klinisk omfang]** under); verktøyet viser ingen andre av planene. Pasientopplysninger inngår ikke.

Scenariene er:

- (a) Vanlig dose, kort behandlingstid, standardvalgene.
- (b) Lang behandlingstid, 10 % per trinn.
- (c) Tidligere seponeringssymptomer (langsom variant).
- (d) Lav dose: laveste styrke i formen.
- (f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg.
- (h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag).
- (e) Alle scenariene bruker de norske preparatene i FEST.
- (g) Oversikten viser om planen stopper allerede ved første trinn.

Stoffene som bare har fagtekst, er ikke med: bupropion, agomelatin, duloksetin, venlafaksin, citalopram, mirtazapin, moklobemid, paroksetin. Mirtazapin, moklobemid og paroksetin ble fagtekst etter kontrollørens beslutning P7-A fordi ingen dose innenfor valgområdet for første trinn kunne gis med de norske formene. Citalopram ble fagtekst etter gjennomgangen av 9cb420b, fordi den eneste dosen som kunne gis ved første trinn fra vanlig dose, var en halvering, og fluoksetinregelen gjelder ikke lenger de harde kapslene, av samme grunn.

Svarene er de samme i alle scenariene: startforslaget og organfunksjon er bekreftet, ingen unntak gjelder, dosen er innenfor rammen, og svaret er nei på stoffets spørsmål om pasientgruppe og indikasjon. Den vanlige dosen er startdosen i regelens første regneeksempel. Under hver plan som stopper ved et trinn forskriveren kan velge dosen for, står dosene som kan velges, med faktisk reduksjon.

## Oversikt (g)

I (a) stopper 2 av 10 kombinasjoner av virkestoff og form allerede ved første trinn: amitriptylin (eneste form), nortriptylin (eneste form).

Der et trinn ikke kan gis nøyaktig, kan forskriveren velge blant de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet for risikogruppen (bidragsyterens valg 30.10.2026, akseptert som prinsipp i kontrollørens beslutning P7-A). I (a) tilbyr 4 av 10 kombinasjoner et slikt valg. Med et valg ved hvert slikt trinn (h) stopper 0 av 10 ved første trinn.

| Virkestoff | Form | (a) | (b) | (c) | (d) | (f) | (h) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | stopper ved første trinn | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 1 reduksjon | 4 reduksjoner |
| escitalopram | Tablett [53] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |
| escitalopram | Dråper, oppløsning [748] | 1 reduksjon | 1 reduksjon | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 8 reduksjoner |
| fluoksetin | Dispergerbar tablett [5] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |
| fluoksetin | Tablett [53] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |
| fluvoksamin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |
| klomipramin | eneste form | 1 reduksjon | 1 reduksjon | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 7 reduksjoner |
| nortriptylin | eneste form | stopper ved første trinn | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 1 reduksjon | 4 reduksjoner |
| sertralin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |
| vortioksetin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 1 reduksjon |

## Klinisk omfang per virkestoff og form (P7.5)

Til kontrollørens regel- og formspesifikke kontroll (gjennomgangen av 62ebb21 og 9cb420b): for hver kombinasjon og hvert klinisk scenario, om en oppnåelig delplan kan brukes, eller om bare et forklarende stopp er riktig. Tabellen er en teknisk matrise regnet ut av planene, ikke en klinisk godkjenning. Ingen delplan er en fullstendig seponering. Et avvik som krever begrunnelse, tilbys ikke: der det er det eneste som kan gis, er planen et forklarende stopp, og en annen plan vurderes individuelt utenfor verktøyet. Scenario (h) er en simulering og er ikke med.

- **delplan:** delplan med den foretrukne reduksjonen, som stopper ved trinnet før det første som ikke kan gis; med én reduksjon er den én mulig reduksjon med revurdering, ikke en fullstendig nedtrappingsplan.
- **valgt dose:** første trinn bare med en dose forskriveren velger, innenfor det foretrukne området uten krav om begrunnelse.
- **stopp:** bare forklarende stopp; ingen dose med reduksjon innenfor det foretrukne området kan gis, og et avvik tilbys ikke.

| Virkestoff | Form | (a) | (b) | (c) | (d) | (f) |
| --- | --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | valgt dose | én reduksjon med revurdering | stopp | stopp | én reduksjon med revurdering |
| escitalopram | Tablett [53] | én reduksjon med revurdering | stopp | stopp | stopp | stopp |
| escitalopram | Dråper, oppløsning [748] | én reduksjon med revurdering | én reduksjon med revurdering | én reduksjon med revurdering | stopp | valgt dose |
| fluoksetin | Dispergerbar tablett [5] | én reduksjon med revurdering | stopp | stopp | stopp | stopp |
| fluoksetin | Tablett [53] | én reduksjon med revurdering | stopp | stopp | stopp | stopp |
| fluvoksamin | eneste form | én reduksjon med revurdering | stopp | stopp | stopp | stopp |
| klomipramin | eneste form | én reduksjon med revurdering | én reduksjon med revurdering | én reduksjon med revurdering | stopp | valgt dose |
| nortriptylin | eneste form | valgt dose | én reduksjon med revurdering | stopp | stopp | én reduksjon med revurdering |
| sertralin | eneste form | én reduksjon med revurdering | stopp | stopp | stopp | stopp |
| vortioksetin | eneste form | én reduksjon med revurdering | stopp | stopp | stopp | stopp |

Ingen av lavdoseeksemplene (d) gir et ordinært første trinn: fra laveste styrke i formen er planen et forklarende stopp i alle kombinasjonene.

### Per startdose

Omfanget for hver markedsført styrke i formen, regelens vanlige dose og grensene for startdosen, så doseområdets grenser og andre faktiske startdoser er med, opp til den høyeste startdosen svarene over tillater uten begrunnelse; en høyere dose krever et ja eller en begrunnelse og er ikke med. Videreføringen (f) regnes fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg (den tilbudte dosen med reduksjon nærmest standardvalget, en simulering).

**[klinisk omfang]** markerer cellene som er innenfor regelens kliniske omfang etter kontrollørens gjennomgang av 0ae6d07 (legemiddelform, startdose, behandlingstid, tidligere seponeringssymptomer og trinnstørrelse som kontrollert, og for klomipramin uten delte tabletter). Merkingen er ingen godkjenning: en klinisk godkjenning kan bare gjelde disse tilfellene, og alle andre celler stopper med forklaring i verktøyet, også om regelen blir godkjent. En videreføring er bare med når dosen den regnes fra, selv er et kontrollert tilfelle.

| Virkestoff | Form | Startdose | (a) | (b) | (c) | (f) |
| --- | --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | 10 mg | stopp | stopp | stopp | – |
| amitriptylin | eneste form | 25 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 20 mg: stopp |
| amitriptylin | eneste form | 50 mg | valgt dose **[klinisk omfang]** | én reduksjon med revurdering **[klinisk omfang]** | stopp | fra 40 mg: én reduksjon med revurdering |
| amitriptylin | eneste form | 75 mg | valgt dose **[klinisk omfang]** | valgt dose **[klinisk omfang]** | stopp | fra 60 mg: én reduksjon med revurdering |
| amitriptylin | eneste form | 100 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 75 mg: valgt dose **[klinisk omfang]** |
| amitriptylin | eneste form | 150 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 120 mg: valgt dose |
| escitalopram | Tablett [53] | 5 mg | stopp | stopp | stopp | – |
| escitalopram | Tablett [53] | 10 mg | stopp | stopp | stopp | – |
| escitalopram | Tablett [53] | 20 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 15 mg: stopp |
| escitalopram | Dråper, oppløsning [748] | 1 mg | stopp | stopp | stopp | – |
| escitalopram | Dråper, oppløsning [748] | 10 mg | valgt dose **[klinisk omfang]** | én reduksjon med revurdering **[klinisk omfang]** | stopp | fra 8 mg: én reduksjon med revurdering |
| escitalopram | Dråper, oppløsning [748] | 20 mg | én reduksjon med revurdering **[klinisk omfang]** | én reduksjon med revurdering **[klinisk omfang]** | én reduksjon med revurdering **[klinisk omfang]** | fra 15 mg: valgt dose |
| fluoksetin | Dispergerbar tablett [5] | 20 mg | stopp | stopp | stopp | – |
| fluoksetin | Dispergerbar tablett [5] | 40 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 30 mg: stopp |
| fluoksetin | Dispergerbar tablett [5] | 60 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 50 mg: valgt dose |
| fluoksetin | Tablett [53] | 20 mg | stopp | stopp | stopp | – |
| fluoksetin | Tablett [53] | 40 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 30 mg: stopp |
| fluoksetin | Tablett [53] | 60 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 50 mg: valgt dose |
| fluvoksamin | eneste form | 50 mg | stopp | stopp | stopp | – |
| fluvoksamin | eneste form | 100 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 75 mg: stopp |
| fluvoksamin | eneste form | 300 mg | én reduksjon med revurdering **[klinisk omfang]** | valgt dose | stopp | fra 225 mg: valgt dose |
| klomipramin | eneste form | 10 mg | stopp | stopp | stopp | – |
| klomipramin | eneste form | 25 mg | valgt dose | én reduksjon med revurdering | stopp | fra 20 mg: én reduksjon med revurdering |
| klomipramin | eneste form | 50 mg | én reduksjon med revurdering | én reduksjon med revurdering **[klinisk omfang]** | én reduksjon med revurdering | fra 37,5 mg: valgt dose |
| klomipramin | eneste form | 150 mg | stopp | stopp | stopp | – |
| nortriptylin | eneste form | 10 mg | stopp | stopp | stopp | – |
| nortriptylin | eneste form | 25 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 20 mg: stopp |
| nortriptylin | eneste form | 50 mg | valgt dose **[klinisk omfang]** | én reduksjon med revurdering **[klinisk omfang]** | stopp | fra 40 mg: én reduksjon med revurdering |
| nortriptylin | eneste form | 150 mg | valgt dose **[klinisk omfang]** | stopp | stopp | fra 120 mg: valgt dose |
| sertralin | eneste form | 25 mg | stopp | stopp | stopp | – |
| sertralin | eneste form | 50 mg | stopp | stopp | stopp | – |
| sertralin | eneste form | 100 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 75 mg: stopp |
| sertralin | eneste form | 200 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 150 mg: valgt dose |
| vortioksetin | eneste form | 5 mg | stopp | stopp | stopp | – |
| vortioksetin | eneste form | 10 mg | stopp | stopp | stopp | – |
| vortioksetin | eneste form | 15 mg | stopp | stopp | stopp | – |
| vortioksetin | eneste form | 20 mg | én reduksjon med revurdering **[klinisk omfang]** | stopp | stopp | fra 15 mg: stopp |

## Per virkestoff

### amitriptylin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 35 mg (-6,67 %, faktisk reduksjon 30 % fra 50 mg) og 40 mg (+6,67 %, faktisk reduksjon 20 % fra 50 mg). Den foretrukne reduksjonen til 37,5 mg (−25 % fra 50 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 50 mg innenfor det foretrukne området 5–25 %: 40 mg (−20 %). Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 47,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 45 mg (-5,26 %, faktisk reduksjon 10 % fra 50 mg) og 50 mg (+5,26 %). Den foretrukne reduksjonen til 47,5 mg (−5 % fra 50 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 40 mg.**

- fra dag 1: 30 mg = 3 tabletter à 10 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 40 mg = 4 tabletter à 10 mg, valgt av forskriveren (beregnet 37,5 mg; −20 %)
- dag 29–56: 30 mg = 3 tabletter à 10 mg
- dag 57–84: 25 mg = 1 tablett à 25 mg, valgt av forskriveren (beregnet 22,5 mg; −16,67 %)
- fra dag 85: 20 mg = 2 tabletter à 10 mg, valgt av forskriveren (beregnet 18,75 mg; −20 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### escitalopram, Tablett [53]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-16,67 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+11,11 %). Den foretrukne reduksjonen til 18 mg (−10 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-21,05 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+5,26 %). Den foretrukne reduksjonen til 19 mg (−5 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 5 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 3,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (+33,33 %). Den foretrukne reduksjonen til 3,75 mg (−25 % fra 5 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 15 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-11,11 %, faktisk reduksjon 33,33 % fra 15 mg) og 15 mg (+33,33 %). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

### escitalopram, Dråper, oppløsning [748]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 15 dråper à 1 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

- fra dag 1: 18 mg = 18 dråper à 1 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 17 mg (−5,56 %).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

- fra dag 1: 19 mg = 19 dråper à 1 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(d) Lav dose: laveste styrke i formen, fra 1 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 0,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 1 mg (+33,33 %). Den foretrukne reduksjonen til 0,75 mg (−25 % fra 1 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 15 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 11 mg (-2,22 %, faktisk reduksjon 26,67 % fra 15 mg) og 12 mg (+6,67 %, faktisk reduksjon 20 % fra 15 mg). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 15 mg innenfor det foretrukne området 5–25 %: 12 mg (−20 %). Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- dag 1–28: 15 mg = 15 dråper à 1 mg
- dag 29–56: 12 mg = 12 dråper à 1 mg, valgt av forskriveren (beregnet 11,25 mg; −20 %)
- dag 57–84: 9 mg = 9 dråper à 1 mg
- dag 85–112: 7 mg = 7 dråper à 1 mg, valgt av forskriveren (beregnet 6,75 mg; −22,22 %)
- dag 113–140: 6 mg = 6 dråper à 1 mg, valgt av forskriveren (beregnet 5,25 mg; −14,29 %)
- dag 141–168: 5 mg = 5 dråper à 1 mg, valgt av forskriveren (beregnet 4,5 mg; −16,67 %)
- dag 169–196: 4 mg = 4 dråper à 1 mg, valgt av forskriveren (beregnet 3,75 mg; −20 %)
- fra dag 197: 3 mg = 3 dråper à 1 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### fluoksetin, Dispergerbar tablett [5]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 36 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-16,67 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+11,11 %). Den foretrukne reduksjonen til 36 mg (−10 % fra 40 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 38 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-21,05 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+5,26 %). Den foretrukne reduksjonen til 38 mg (−5 % fra 40 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 20 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-33,33 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+33,33 %). Den foretrukne reduksjonen til 15 mg (−25 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 30 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 22,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-11,11 %, faktisk reduksjon 33,33 % fra 30 mg) og 30 mg (+33,33 %). Den foretrukne reduksjonen til 22,5 mg (−25 % fra 30 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

### fluoksetin, Tablett [53]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 36 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-16,67 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+11,11 %). Den foretrukne reduksjonen til 36 mg (−10 % fra 40 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 38 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-21,05 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+5,26 %). Den foretrukne reduksjonen til 38 mg (−5 % fra 40 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 20 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-33,33 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+33,33 %). Den foretrukne reduksjonen til 15 mg (−25 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 30 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 22,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-11,11 %, faktisk reduksjon 33,33 % fra 30 mg) og 30 mg (+33,33 %). Den foretrukne reduksjonen til 22,5 mg (−25 % fra 30 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

### fluvoksamin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 100 mg.**

- fra dag 1: 75 mg = 1½ tabletter à 50 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 100 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 90 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-16,67 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+11,11 %). Den foretrukne reduksjonen til 90 mg (−10 % fra 100 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 100 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 95 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-21,05 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+5,26 %). Den foretrukne reduksjonen til 95 mg (−5 % fra 100 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 50 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 25 mg (-33,33 %, faktisk reduksjon 50 % fra 50 mg) og 50 mg (+33,33 %). Den foretrukne reduksjonen til 37,5 mg (−25 % fra 50 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 75 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 56,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 50 mg (-11,11 %, faktisk reduksjon 33,33 % fra 75 mg) og 75 mg (+33,33 %). Den foretrukne reduksjonen til 56,25 mg (−25 % fra 75 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 100 mg.**

- fra dag 1: 75 mg = 1½ tabletter à 50 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

### klomipramin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

- fra dag 1: 37,5 mg = 1½ tabletter à 25 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 28,13 mg, fra 37,5 mg): 30 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 40,5 mg, fra 45 mg): 42,5 mg (−5,56 %).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

- fra dag 1: 47,5 mg = 1 tablett à 10 mg + 1½ tabletter à 25 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- klomipramin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 37,5 mg.**

Stopper:

- klomipramin dag 1–28: den ideelle dosen 28,13 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 27,5 mg (-2,24 %, faktisk reduksjon 26,67 % fra 37,5 mg) og 30 mg (+6,65 %, faktisk reduksjon 20 % fra 37,5 mg). Den foretrukne reduksjonen til 28,13 mg (−24,99 % fra 37,5 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 37,5 mg innenfor det foretrukne området 5–25 %: 30 mg (−20 %). Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 28,13 mg, fra 37,5 mg): 30 mg (−20 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 37,5 mg = 1½ tabletter à 25 mg
- dag 29–56: 30 mg = 3 tabletter à 10 mg, valgt av forskriveren (beregnet 28,13 mg; −20 %)
- dag 57–84: 22,5 mg = 1 tablett à 10 mg + ½ tablett à 25 mg
- dag 85–112: 17,5 mg = ½ tablett à 10 mg + ½ tablett à 25 mg, valgt av forskriveren (beregnet 16,88 mg; −22,22 %)
- dag 113–140: 15 mg = 1½ tabletter à 10 mg, valgt av forskriveren (beregnet 13,13 mg; −14,29 %)
- dag 141–168: 12,5 mg = ½ tablett à 25 mg, valgt av forskriveren (beregnet 11,25 mg; −16,67 %)
- fra dag 169: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 9,38 mg; −20 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### nortriptylin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 35 mg (-6,67 %, faktisk reduksjon 30 % fra 50 mg) og 40 mg (+6,67 %, faktisk reduksjon 20 % fra 50 mg). Den foretrukne reduksjonen til 37,5 mg (−25 % fra 50 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 50 mg innenfor det foretrukne området 5–25 %: 40 mg (−20 %). Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 47,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 45 mg (-5,26 %, faktisk reduksjon 10 % fra 50 mg) og 50 mg (+5,26 %). Den foretrukne reduksjonen til 47,5 mg (−5 % fra 50 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 40 mg.**

- fra dag 1: 30 mg = 3 tabletter à 10 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

- Kan velges for trinn 2 (dag 29, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 40 mg = 4 tabletter à 10 mg, valgt av forskriveren (beregnet 37,5 mg; −20 %)
- dag 29–56: 30 mg = 3 tabletter à 10 mg
- dag 57–84: 25 mg = 1 tablett à 25 mg, valgt av forskriveren (beregnet 22,5 mg; −16,67 %)
- fra dag 85: 20 mg = 2 tabletter à 10 mg, valgt av forskriveren (beregnet 18,75 mg; −20 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### sertralin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 100 mg.**

- fra dag 1: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 100 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 90 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-16,67 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+11,11 %). Den foretrukne reduksjonen til 90 mg (−10 % fra 100 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 100 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 95 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-21,05 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+5,26 %). Den foretrukne reduksjonen til 95 mg (−5 % fra 100 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 25 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 18,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 25 mg (+33,33 %). Den foretrukne reduksjonen til 18,75 mg (−25 % fra 25 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 75 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 56,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 50 mg (-11,11 %, faktisk reduksjon 33,33 % fra 75 mg) og 75 mg (+33,33 %). Den foretrukne reduksjonen til 56,25 mg (−25 % fra 75 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 100 mg.**

- fra dag 1: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

### vortioksetin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 15 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-16,67 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+11,11 %). Den foretrukne reduksjonen til 18 mg (−10 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–10 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-21,05 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+5,26 %). Den foretrukne reduksjonen til 19 mg (−5 % fra 20 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 1–5 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(d) Lav dose: laveste styrke i formen, fra 5 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 3,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (+33,33 %). Den foretrukne reduksjonen til 3,75 mg (−25 % fra 5 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(f) Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg, fra 15 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-11,11 %, faktisk reduksjon 33,33 % fra 15 mg) og 15 mg (+33,33 %). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 15 mg
- én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene

## Fluoksetin 20 mg annenhver dag

**Dispergerbar tablett [5].**

- fra dag 1: 20 mg annenhver dag = 1 tablett à 20 mg
- annenhver dag i minst 28 dager; avslutning vurderes individuelt

**Tablett [53].**

- fra dag 1: 20 mg annenhver dag = 1 tablett à 20 mg
- annenhver dag i minst 28 dager; avslutning vurderes individuelt

**Kapsel, hard [891].**

- fra dag 1: 20 mg annenhver dag = 1 kapsel à 20 mg
- annenhver dag i minst 28 dager; avslutning vurderes individuelt
