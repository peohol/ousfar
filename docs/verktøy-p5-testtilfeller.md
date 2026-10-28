# OUSFAR Verktøy – P5: testtilfeller for doseplanmotoren

**Laget av `src/verktoy/motor/rapport.ts`; ikke rediger for hånd.** Lag den på nytt med `npm run verktoy:regler -- motorrapport`. Doseplanmotor 1. Bakgrunnen står i `docs/verktøy-p5-beregningsmotor.md`.

**Alt her er syntetisk.** Virkestoffene (testoksetin, testazapin, testperidon), preparatene og reglene finnes ikke og har ingen klinisk betydning. De er laget for å prøve motoren ved grenseverdiene: deling, formuleringer og former, godkjenningsfritak, avregistrering, toleranse, dosegrenser, utvasking, depot og datoer. Ingen av P4s pilotregler er brukt eller godkjent, og ingen plan her er klinisk. Hvert tilfelle kontrolleres av `src/__tests__/verktoymotor.test.ts`.

Søket bruker høyst 2 styrker og 4 tabletter eller kapsler eller 60 dråper per døgndose (en praktisk ramme, ikke en klinisk grense).

## Testpreparatene

Slik motoren leser dem (`byggesteiner.ts`), med status 2026-11-01.

| Virkestoff | Preparat | Formulering | Styrke | Deling | Registrering | Marked | Begrensninger |
| --- | --- | --- | --- | --- | --- | --- | --- |
| testoksetin | Testoksetin Depot depottablett 15 mg | Peroral, modifisert frisetting | 15 mg per tablett | FEST: «Delbar i 2» (modifisert frisetting; delingen er oppgitt for dette preparatet) | registrert | markedsført | – |
| testoksetin | Testoksetin Syntetisk dråper, oppløsning 20 mg/ml | Peroral, vanlig frisetting | 1 mg per dråpe | Hele dråper | registrert | markedsført | – |
| testoksetin | Testoksetin Syntetisk kapsel, hard 20 mg | Peroral, vanlig frisetting | 20 mg per kapsel | Kapsel: deles eller åpnes aldri i beregningen | registrert | markedsført | – |
| testoksetin | Testoksetin Syntetisk mikstur, oppløsning 4 mg/ml | Peroral, vanlig frisetting | – | – | registrert | markedsført | er flytende (4 mg/ml) uten dokumentert doseringsoppløsning |
| testoksetin | Testoksetin Avregistrert tablett 1 mg | Peroral, vanlig frisetting | 1 mg per tablett | FEST oppgir ikke deling; regnes som ikke delbar | registrert | avregistrert | er avregistrert i FEST |
| testoksetin | Testoksetin Syntetisk tablett 10 mg | Peroral, vanlig frisetting | 10 mg per tablett | FEST: «Delbar i 2» | registrert | markedsført | – |
| testoksetin | Testoksetin Fritak tablett 2 mg | Peroral, vanlig frisetting | 2 mg per tablett | FEST: «Ikke delbar» | godkjenningsfritak | markedsført | – |
| testoksetin | Testoksetin Syntetisk tablett 20 mg | Peroral, vanlig frisetting | 20 mg per tablett | FEST: «Delbar i 4» | registrert | markedsført | – |
| testoksetin | Testoksetin Sykehus tablett 3 mg | Peroral, vanlig frisetting | 3 mg per tablett | FEST oppgir ikke deling; regnes som ikke delbar | Sykehuspreparat | markedsført | har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner |
| testoksetin | Testoksetin Salt tablett 4 mg | Peroral, vanlig frisetting | – | – | registrert | markedsført | har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST |
| testoksetin | Testoksetin Syntetisk tablett 5 mg | Peroral, vanlig frisetting | 5 mg per tablett | FEST oppgir ikke deling; regnes som ikke delbar | registrert | markedsført | – |
| testoksetin | Testoksetin Annen tablett 5 mg | Peroral, vanlig frisetting | 5 mg per tablett | FEST: «Delbar i 4» | registrert | markedsført | – |
| testoksetin | Testoksetin Kombi tablett 6 mg | Peroral, vanlig frisetting | – | – | registrert | markedsført | er et kombinasjonspreparat |
| testoksetin | Testoksetin Utgått tablett 7,5 mg | Peroral, vanlig frisetting | 7,5 mg per tablett | FEST: «Delbar i 2» | registrert | midlertidig utgått | er midlertidig utgått i FEST fra 01.09.2026 |
| testazapin | Testazapin Syntetisk tablett 15 mg | Peroral, vanlig frisetting | 15 mg per tablett | FEST: «Ikke delbar» | registrert | markedsført | – |
| testazapin | Testazapin Syntetisk tablett 30 mg | Peroral, vanlig frisetting | 30 mg per tablett | FEST: «Delbar i 2» | registrert | markedsført | – |
| testazapin | Testazapin Syntetisk tablett 45 mg | Peroral, vanlig frisetting | 45 mg per tablett | FEST: «Ikke delbar» | registrert | markedsført, til 01.12.2026 | – |
| testazapin | Testoksetin Kombi tablett 6 mg | Peroral, vanlig frisetting | – | – | registrert | markedsført | er et kombinasjonspreparat |
| testperidon | Testdepot Tremånedlig depotinjeksjonsvæske, suspensjon 75 mg | Depotinjeksjon (LA) | 75 mg per injeksjon | Én hel injeksjon; deler av en sprøyte brukes ikke | registrert | markedsført | – |
| testperidon | Testperidon Syntetisk depottablett 6 mg | Peroral, modifisert frisetting | 6 mg per tablett | FEST: «Ikke delbar» | registrert | markedsført | – |
| testperidon | Testdepot Månedlig depotinjeksjonsvæske, suspensjon 100 mg/sprøyte | Depotinjeksjon (LA) | 100 mg per injeksjon | Én hel injeksjon; deler av en sprøyte brukes ikke | registrert | markedsført | – |
| testperidon | Testdepot Månedlig depotinjeksjonsvæske, suspensjon 150 mg/sprøyte | Depotinjeksjon (LA) | 150 mg per injeksjon | Én hel injeksjon; deler av en sprøyte brukes ikke | registrert | markedsført | – |
| testperidon | Testdepot Månedlig depotinjeksjonsvæske, suspensjon 75 mg/sprøyte | Depotinjeksjon (LA) | 75 mg per injeksjon | Én hel injeksjon; deler av en sprøyte brukes ikke | godkjenningsfritak | markedsført | – |

## Tilfellene

### prosent-av-startdose-noyaktig

Testoksetin 20 mg trappes ned med 25 % av startdosen (5 mg) per trinn. Uten toleranse må hver dose gis nøyaktig.

*Kontrollerer:* P5.5 prosent av startdosen; P5.3 deling bare der FEST sier det; P5.4 utelatte preparater. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 10 mg
- dag 29–42: 5 mg
- fra dag 43: seponert

**Doseplan:**

*fra:*

- dag 1–14: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- dag 15–28: 10 mg = 1 tablett à 10 mg
- dag 29–42: 5 mg = 1 tablett à 5 mg
- fra dag 43: seponert

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testoksetin Annen tablett 5 mg (FEST: «Delbar i 4»)
- Testoksetin Syntetisk tablett 10 mg (FEST: «Delbar i 2»)
- Testoksetin Syntetisk tablett 5 mg (FEST oppgir ikke deling; regnes som ikke delbar)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Fritak tablett 2 mg: krever godkjenningsfritak, som ikke er valgt
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### prosent-av-aktuell-toleranse-10

Testoksetin 20 mg trappes ned med 25 % av aktuell dose til under 2,5 mg, med høyst 10 % avvik, og forskriveren har valgt bare 10 og 20 mg-tablettene. 11,25 mg kan ikke gis innenfor 10 %: nærmeste doser er 10 mg (−11,1 %) og 15 mg; 12,5 mg krever en kvart 10 mg-tablett, som ikke er delbar i 4.

*Kontrollerer:* P5.5 prosent av aktuell dose; valgte preparater; P5.8 stopp uten gjennomførbar dose, med de nærmeste dosene. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-TAB, OKS-TAB10, OKS-TAB20. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 11,25 mg
- dag 29–42: 8,44 mg
- dag 43–56: 6,33 mg
- dag 57–70: 4,75 mg
- dag 71–84: 3,56 mg
- dag 85–98: 2,67 mg
- fra dag 99: seponert

**Doseplan:**

*Stopper:*

- testoksetin dag 15–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST innenfor ±10 %. Nærmeste doser som kan settes sammen: 10 mg (-11,11 %) og 15 mg (+33,33 %). Et større avvik eller en annen formulering krever en ny faglig beslutning; beregningen gjør det ikke selv.

### prosent-av-aktuell-toleranse-15

Som over med alle tablettene og høyst 15 % avvik: kvarte 5 mg-tabletter (delbar i 4) gir doser i trinn på 1,25 mg.

*Kontrollerer:* P5.5 valg mellom oppnåelige doser (B3); P5.3 kvarte tabletter bare der FEST sier delbar i 4; P5.6 avvik dokumentert. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 11,25 mg
- dag 29–42: 8,44 mg
- dag 43–56: 6,33 mg
- dag 57–70: 4,75 mg
- dag 71–84: 3,56 mg
- dag 85–98: 2,67 mg
- fra dag 99: seponert

**Doseplan:**

*fra:*

- dag 1–14: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- dag 15–28: 11,25 mg = 1 tablett à 10 mg + ¼ tablett à 5 mg
- dag 29–42: 8,75 mg = 1¾ tabletter à 5 mg (ideelt 8,44 mg, +3,7 %)
- dag 43–56: 6,25 mg = 1¼ tabletter à 5 mg (ideelt 6,33 mg, -1,23 %)
- dag 57–70: 5 mg = 1 tablett à 5 mg (ideelt 4,75 mg, +5,35 %)
- dag 71–84: 3,75 mg = ¾ tablett à 5 mg (ideelt 3,56 mg, +5,35 %)
- dag 85–98: 2,5 mg = ½ tablett à 5 mg (ideelt 2,67 mg, -6,36 %)
- fra dag 99: seponert

**Avvik fra den ideelle kurven:**

- testoksetin dag 29–42: 8,75 mg i stedet for 8,44 mg (+3,7 %).
- testoksetin dag 43–56: 6,25 mg i stedet for 6,33 mg (-1,23 %).
- testoksetin dag 57–70: 5 mg i stedet for 4,75 mg (+5,35 %).
- testoksetin dag 71–84: 3,75 mg i stedet for 3,56 mg (+5,35 %).
- testoksetin dag 85–98: 2,5 mg i stedet for 2,67 mg (-6,36 %).

**Preparater (FESTs navn, deling):**

- Testoksetin Annen tablett 5 mg (FEST: «Delbar i 4»)
- Testoksetin Syntetisk tablett 10 mg (FEST: «Delbar i 2»)
- Testoksetin Syntetisk tablett 5 mg (FEST oppgir ikke deling; regnes som ikke delbar)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Fritak tablett 2 mg: krever godkjenningsfritak, som ikke er valgt
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### godkjenningsfritak-valgt

Testoksetin 4 mg trappes ned med 2 mg per trinn. 2 mg finnes bare som preparat med godkjenningsfritak; det brukes bare når forskriveren har valgt det.

*Kontrollerer:* P5.4 godkjenningsfritak brukes bare etter uttrykkelig valg. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 4 mg, godkjenningsfritak valgt, valg: fra peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 2 mg
- fra dag 15: seponert

**Doseplan:**

*fra:*

- dag 1–14: 2 mg = 1 tablett à 2 mg
- fra dag 15: seponert

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testoksetin Fritak tablett 2 mg (godkjenningsfritak; FEST: «Ikke delbar»)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### godkjenningsfritak-ikke-valgt

Som over, uten valget: 2 mg kan ikke gis, og beregningen stopper.

*Kontrollerer:* P5.4; P5.8. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 4 mg, valg: fra peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 2 mg
- fra dag 15: seponert

**Doseplan:**

*Stopper:*

- testoksetin dag 1–14: den ideelle dosen 2 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 1,25 mg (-37,5 %) og 2,5 mg (+25 %). Et større avvik eller en annen formulering krever en ny faglig beslutning; beregningen gjør det ikke selv.

### flere-former-uten-valg

Testoksetin finnes som tablett, kapsel og dråper. Uten valg av form stopper beregningen i stedet for å blande formene.

*Kontrollerer:* P5.2; P5.8 ingen gjetning om form. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 10 mg
- dag 29–42: 5 mg
- fra dag 43: seponert

**Doseplan:**

*Stopper:*

- testoksetin (fra) finnes i flere legemiddelformer (Dråper, oppløsning [SYN-DRAP], Kapsel, hard [SYN-KAPS] og Tablett [SYN-TAB]); formen må velges, beregningen blander dem ikke av seg selv.

### flere-formuleringer-uten-valg

Testoksetin finnes både med vanlig og modifisert frisetting. Uten valg stopper beregningen.

*Kontrollerer:* P5.3 modifisert frisetting blandes ikke med vanlig; P5.8. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 10 mg
- dag 29–42: 5 mg
- fra dag 43: seponert

**Doseplan:**

*Stopper:*

- testoksetin (fra) finnes i flere formuleringer (peroral, vanlig frisetting [peroral] og peroral, modifisert frisetting [peroral_modifisert]); formuleringen må velges, beregningen velger ikke selv.

### draper

Testoksetin-dråper (1 mg per dråpe etter FEST) med 25 % av aktuell dose til under 2,5 mg, høyst 15 % avvik: hele dråper.

*Kontrollerer:* P5.2 dose per dråpe fra FEST; P5.6 avrunding til hele dråper. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-DRAP. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 11,25 mg
- dag 29–42: 8,44 mg
- dag 43–56: 6,33 mg
- dag 57–70: 4,75 mg
- dag 71–84: 3,56 mg
- dag 85–98: 2,67 mg
- fra dag 99: seponert

**Doseplan:**

*fra:*

- dag 1–14: 15 mg = 15 dråper à 1 mg
- dag 15–28: 11 mg = 11 dråper à 1 mg (ideelt 11,25 mg, -2,22 %)
- dag 29–42: 8 mg = 8 dråper à 1 mg (ideelt 8,44 mg, -5,19 %)
- dag 43–56: 6 mg = 6 dråper à 1 mg (ideelt 6,33 mg, -5,19 %)
- dag 57–70: 5 mg = 5 dråper à 1 mg (ideelt 4,75 mg, +5,35 %)
- dag 71–84: 4 mg = 4 dråper à 1 mg (ideelt 3,56 mg, +12,37 %)
- dag 85–98: 3 mg = 3 dråper à 1 mg (ideelt 2,67 mg, +12,37 %)
- fra dag 99: seponert

**Avvik fra den ideelle kurven:**

- testoksetin dag 15–28: 11 mg i stedet for 11,25 mg (-2,22 %).
- testoksetin dag 29–42: 8 mg i stedet for 8,44 mg (-5,19 %).
- testoksetin dag 43–56: 6 mg i stedet for 6,33 mg (-5,19 %).
- testoksetin dag 57–70: 5 mg i stedet for 4,75 mg (+5,35 %).
- testoksetin dag 71–84: 4 mg i stedet for 3,56 mg (+12,37 %).
- testoksetin dag 85–98: 3 mg i stedet for 2,67 mg (+12,37 %).

**Preparater (FESTs navn, deling):**

- Testoksetin Syntetisk dråper, oppløsning 20 mg/ml (Hele dråper)

**Begrensninger (preparater som ikke brukes):**

- Ingen.

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### kapsel-deles-ikke

Bare kapsler à 20 mg: 15 mg kan ikke gis, siden kapsler aldri deles eller åpnes.

*Kontrollerer:* P5.3 kapsler deles ikke. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-KAPS. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 10 mg
- dag 29–42: 5 mg
- fra dag 43: seponert

**Doseplan:**

*Stopper:*

- testoksetin dag 1–14: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (+33,33 %). Et større avvik eller en annen formulering krever en ny faglig beslutning; beregningen gjør det ikke selv.

### depottablett-delbar-i-fest

Testoksetin depottablett 15 mg som FEST oppgir som delbar i 2: 15 → 7,5 mg (halvering av aktuell dose, 50 %).

*Kontrollerer:* P5.3 modifisert frisetting deles bare når FEST oppgir det for preparatet. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 15 mg, valg: fra peroral_modifisert. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 7,5 mg
- fra dag 15: seponert

**Doseplan:**

*fra:*

- dag 1–14: 7,5 mg = ½ tablett à 15 mg
- fra dag 15: seponert

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testoksetin Depot depottablett 15 mg (FEST: «Delbar i 2» (modifisert frisetting; delingen er oppgitt for dette preparatet))

**Begrensninger (preparater som ikke brukes):**

- Ingen.

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### kryss-med-maldose-og-dato

Kryssnedtrapping testoksetin 20 mg → testazapin 30 mg fra 30.12.2026: testoksetin 10 mg i 7 dager; testazapin 15 mg i 7 dager og så 30 mg.

*Kontrollerer:* P5.7 samtidige forløp; P5.6 kalenderdatoer over årsskiftet; dosegrense. *Regel:* SYNTETISK TESTREGEL: kryssnedtrapping testoksetin → testazapin. *Inndata:* startdose 20 mg, måldose 30 mg, startdato 2026-12-30, valg: fra peroral, SYN-TAB; til peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–7 (30.12.2026–05.01.2027): 10 mg
- fra dag 8 (06.01.2027): seponert

*til:*

- dag 1–7 (30.12.2026–05.01.2027): 15 mg
- fra dag 8 (06.01.2027): 30 mg

**Doseplan:**

*fra:*

- dag 1–7 [30.12.2026–05.01.2027]: 10 mg = 1 tablett à 10 mg
- fra dag 8 [06.01.2027]: seponert

*til:*

- dag 1–7 [30.12.2026–05.01.2027]: 15 mg = 1 tablett à 15 mg
- fra dag 8 [06.01.2027]: 30 mg = 1 tablett à 30 mg

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testazapin Syntetisk tablett 15 mg (FEST: «Ikke delbar»)
- Testazapin Syntetisk tablett 30 mg (FEST: «Delbar i 2»)
- Testoksetin Syntetisk tablett 10 mg (FEST: «Delbar i 2»)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Fritak tablett 2 mg: krever godkjenningsfritak, som ikke er valgt
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026
- Testazapin Syntetisk tablett 45 mg: FEST melder at det ikke er markedsført fra 01.12.2026; brukes bare i perioder som slutter før

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### kryss-over-dosegrense

Som over med måldose 60 mg: over regelens høyeste døgndose 45 mg.

*Kontrollerer:* P5.6 maksimum. *Regel:* SYNTETISK TESTREGEL: kryssnedtrapping testoksetin → testazapin. *Inndata:* startdose 20 mg, måldose 60 mg, valg: fra peroral, SYN-TAB; til peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–7: 10 mg
- fra dag 8: seponert

*til:*

- dag 1–7: 15 mg
- fra dag 8: 60 mg

**Doseplan:**

*Stopper:*

- testazapin fra dag 8: den ideelle dosen 60 mg kan ikke gis med preparatene i FEST nøyaktig og ikke over 45 mg. Nærmeste doser som kan settes sammen: 45 mg (-25 %) og 75 mg (+25 %). Testazapin Syntetisk tablett 45 mg brukes ikke her, fordi FEST melder at det ikke er markedsført hele perioden. Et større avvik eller en annen formulering krever en ny faglig beslutning; beregningen gjør det ikke selv.

### avregistrering-i-planperioden

Testazapin 45 mg er avregistrert fra 01.12.2026. Med start 01.11.2026 kan ikke 45 mg-tabletten brukes etter det; vedlikehold 45 mg gis da med 30 + 15 mg.

*Kontrollerer:* P5.4 meldt avregistrering; P5.6 datoer. *Regel:* SYNTETISK TESTREGEL: kryssnedtrapping testoksetin → testazapin. *Inndata:* startdose 20 mg, måldose 45 mg, startdato 2026-11-01, valg: fra peroral, SYN-TAB; til peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–7 (01.11.2026–07.11.2026): 10 mg
- fra dag 8 (08.11.2026): seponert

*til:*

- dag 1–7 (01.11.2026–07.11.2026): 15 mg
- fra dag 8 (08.11.2026): 45 mg

**Doseplan:**

*fra:*

- dag 1–7 [01.11.2026–07.11.2026]: 10 mg = 1 tablett à 10 mg
- fra dag 8 [08.11.2026]: seponert

*til:*

- dag 1–7 [01.11.2026–07.11.2026]: 15 mg = 1 tablett à 15 mg
- fra dag 8 [08.11.2026]: 45 mg = 1 tablett à 15 mg + 1 tablett à 30 mg

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testazapin Syntetisk tablett 15 mg (FEST: «Ikke delbar»)
- Testazapin Syntetisk tablett 30 mg (FEST: «Delbar i 2»)
- Testoksetin Syntetisk tablett 10 mg (FEST: «Delbar i 2»)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Fritak tablett 2 mg: krever godkjenningsfritak, som ikke er valgt
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026
- Testazapin Syntetisk tablett 45 mg: FEST melder at det ikke er markedsført fra 01.12.2026; brukes bare i perioder som slutter før

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### sekvensielt-utvasking

Testoksetin 10 mg trappes ned med 5 mg per uke, så 14 dager uten legemiddel før testazapin 15 mg.

*Kontrollerer:* P5.7 utvasking bevares i den praktiske planen. *Regel:* SYNTETISK TESTREGEL: sekvensielt bytte testoksetin → testazapin med utvasking. *Inndata:* startdose 10 mg, valg: fra peroral, SYN-TAB; til peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–7: 5 mg
- fra dag 8: seponert

*til:*

- fra dag 22: 15 mg

**Doseplan:**

*fra:*

- dag 1–7: 5 mg = 1 tablett à 5 mg
- fra dag 8: seponert

*til:*

- fra dag 22: 15 mg = 1 tablett à 15 mg

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testazapin Syntetisk tablett 15 mg (FEST: «Ikke delbar»)
- Testoksetin Annen tablett 5 mg (FEST: «Delbar i 4»)
- Testoksetin Syntetisk tablett 5 mg (FEST oppgir ikke deling; regnes som ikke delbar)

**Begrensninger (preparater som ikke brukes):**

- Testoksetin Avregistrert tablett 1 mg: er avregistrert i FEST
- Testoksetin Fritak tablett 2 mg: krever godkjenningsfritak, som ikke er valgt
- Testoksetin Kombi tablett 6 mg: er et kombinasjonspreparat
- Testoksetin Salt tablett 4 mg: har styrken oppgitt for saltet Testoksetinsalt; omregning til moderstoffet er ikke dokumentert i FEST
- Testoksetin Sykehus tablett 3 mg: har preparattypen «Sykehuspreparat», som ikke brukes i automatiske doseplaner
- Testoksetin Utgått tablett 7,5 mg: er midlertidig utgått i FEST fra 01.09.2026
- Testazapin Syntetisk tablett 45 mg: FEST melder at det ikke er markedsført fra 01.12.2026; brukes bare i perioder som slutter før

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### depot-manedlig

Fra testperidon depottabletter til månedlig depot fra 31.01.2027: 150 mg dag 1, 100 mg dag 8, så 100 mg hver måned. Bare det månedlige preparatet regelen nevner brukes, aldri det tremånedlige.

*Kontrollerer:* P5.7 depot som egen tidsmodell; hele injeksjoner; kalendermåned i februar. *Regel:* SYNTETISK TESTREGEL: oppstart av månedlig testperidon-depot. *Inndata:* startdose 6 mg, startdato 2027-01-31. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- fra dag 1 (31.01.2027): seponert

*til:*

- dag 1 (31.01.2027): 150 mg injeksjon
- dag 8 (07.02.2027, ±4 dager): 100 mg injeksjon
- hver måned fra 1 måned etter dag 8 (07.03.2027): 100 mg injeksjon

**Doseplan:**

*fra:*

- fra dag 1 [31.01.2027]: seponert

*til:*

- dag 1 [31.01.2027]: 150 mg = 1 injeksjon à 150 mg
- dag 8 [07.02.2027]: 100 mg = 1 injeksjon à 100 mg
- vedlikehold hver 1. måned fra dag 8 [07.03.2027]: 100 mg = 1 injeksjon à 100 mg

**Avvik fra den ideelle kurven:**

- Ingen.

**Preparater (FESTs navn, deling):**

- Testdepot Månedlig depotinjeksjonsvæske, suspensjon 100 mg/sprøyte (Én hel injeksjon; deler av en sprøyte brukes ikke)
- Testdepot Månedlig depotinjeksjonsvæske, suspensjon 150 mg/sprøyte (Én hel injeksjon; deler av en sprøyte brukes ikke)

**Begrensninger (preparater som ikke brukes):**

- Testdepot Månedlig depotinjeksjonsvæske, suspensjon 75 mg/sprøyte: krever godkjenningsfritak, som ikke er valgt

**Klinisk:** nei. Regelen er en syntetisk testregel. Regelversjonen er utkast, ikke klinisk godkjent. Preparatene er fra «Syntetiske testdata», ikke fra FEST.

### depot-uten-preparat-i-regelen

Samme regel uten varenavn for depotet: beregningen velger ikke depotpreparat selv.

*Kontrollerer:* P5.7; P5.8. *Regel:* SYNTETISK TESTREGEL: oppstart av månedlig testperidon-depot. *Inndata:* startdose 6 mg. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- fra dag 1: seponert

*til:*

- dag 1: 150 mg injeksjon
- dag 8 (±4 dager): 100 mg injeksjon
- hver måned fra 1 måned etter dag 8: 100 mg injeksjon

**Doseplan:**

*Stopper:*

- Regelen sier ikke hvilket depotpreparat testperidon (til) gjelder; FEST skiller ikke depotformuleringer med ulike intervaller i formen, så beregningen velger ikke selv.

### depot-dose-som-ikke-finnes

Vedlikehold 75 mg: det månedlige preparatet har 75 mg bare med godkjenningsfritak (ikke valgt), og det tremånedlige brukes ikke. Ingen sprøyter settes sammen.

*Kontrollerer:* P5.3 ikke-delbart depot; P5.4; P5.8. *Regel:* SYNTETISK TESTREGEL: oppstart av månedlig testperidon-depot. *Inndata:* startdose 6 mg. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- fra dag 1: seponert

*til:*

- dag 1: 150 mg injeksjon
- dag 8 (±4 dager): 100 mg injeksjon
- hver måned fra 1 måned etter dag 8: 75 mg injeksjon

**Doseplan:**

*Stopper:*

- testperidon (til): vedlikeholdet er 75 mg, men FEST har ingen brukbar injeksjon med den styrken (brukbare styrker: 100, 150 mg). Deler av eller flere injeksjoner settes ikke sammen.

### fest-aldri-hentet

Uten en vellykket henting av FEST kan ingen plan beregnes.

*Kontrollerer:* P5.1. *Regel:* SYNTETISK TESTREGEL: seponering av testoksetin. *Inndata:* startdose 20 mg, valg: fra peroral, SYN-TAB. *Preparatstatus:* 2026-11-01.

**Ideell kurve (P4):**

*fra:*

- dag 1–14: 15 mg
- dag 15–28: 10 mg
- dag 29–42: 5 mg
- fra dag 43: seponert

**Doseplan:**

*Stopper:*

- Det finnes ingen vellykket henting av FEST å regne med; preparatene kan ikke bekreftes.
