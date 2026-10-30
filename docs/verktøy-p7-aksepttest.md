<!-- Laget av `npm run verktoy:regler -- aksepttest` fra src/data/verktoy/fest-aksepttest.json; rediger ikke for hånd. -->
# P7: aksepttest med norske preparater

Aksepttesten etter kontrollrunden 30.10.2026 (P7.5, del E.2). Hver hovedregel og langsom variant i `ousfar-verktoy-nedtrapping` versjon 9 er regnet med de faktiske preparatene i FEST, ikke syntetiske, for hver legemiddelform forskriveren kan velge. FEST-uttrekket er hentet 30.10.2026 (kildedato 27.10.2026); bare preparater med markedsføringstillatelse som er markedsført, brukes, ikke godkjenningsfritak.

**Dette er modellberegninger til faglig kontroll, ikke kliniske planer.** Ingen beregnbar P7-regel er klinisk godkjent, og verktøyet viser ingen av planene. Pasientopplysninger inngår ikke.

Scenariene er:

- (a) Vanlig dose, kort behandlingstid, standardvalgene.
- (b) Lang behandlingstid, 10 % per trinn.
- (c) Tidligere seponeringssymptomer (langsom variant).
- (d) Lav dose: laveste styrke i formen.
- (f) Videreføring: ny plan fra siste dose i (a).
- (h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag).
- (e) Alle scenariene bruker de norske preparatene i FEST.
- (g) Oversikten viser om planen stopper allerede ved første trinn.

Stoffene som bare har fagtekst, er ikke med: bupropion, agomelatin, duloksetin, venlafaksin, mirtazapin, moklobemid, paroksetin. Mirtazapin, moklobemid og paroksetin ble fagtekst etter kontrollørens beslutning P7-A fordi ingen dose innenfor valgområdet for første trinn kunne gis med de norske formene.

Svarene er de samme i alle scenariene: startforslaget og organfunksjon er bekreftet, ingen unntak gjelder, dosen er innenfor rammen, og svaret er nei på stoffets spørsmål om pasientgruppe og indikasjon. Den vanlige dosen er startdosen i regelens første regneeksempel. Under hver plan som stopper ved et trinn forskriveren kan velge dosen for, står dosene som kan velges, med faktisk reduksjon.

## Oversikt (g)

I (a) stopper 4 av 12 kombinasjoner av virkestoff og form allerede ved første trinn: amitriptylin (eneste form), citalopram (eneste form), fluoksetin (Kapsel, hard [891]), nortriptylin (eneste form).

Der et trinn ikke kan gis nøyaktig, kan forskriveren velge blant de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet for risikogruppen (bidragsyterens valg 30.10.2026, akseptert som prinsipp i kontrollørens beslutning P7-A). I (a) tilbyr 12 av 12 kombinasjoner et slikt valg. Med et valg ved hvert slikt trinn (h) stopper 0 av 12 ved første trinn.

| Virkestoff | Form | (a) | (b) | (c) | (d) | (f) | (h) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | stopper ved første trinn | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | – | 5 reduksjoner |
| citalopram | eneste form | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | – | 1 reduksjon |
| escitalopram | Tablett [53] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 3 reduksjoner |
| escitalopram | Dråper, oppløsning [748] | 1 reduksjon | 1 reduksjon | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 7 reduksjoner |
| fluoksetin | Dispergerbar tablett [5] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 3 reduksjoner |
| fluoksetin | Tablett [53] | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 3 reduksjoner |
| fluoksetin | Kapsel, hard [891] | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | – | 1 reduksjon |
| fluvoksamin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 2 reduksjoner |
| klomipramin | eneste form | 1 reduksjon | 1 reduksjon | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | 6 reduksjoner |
| nortriptylin | eneste form | stopper ved første trinn | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | – | 4 reduksjoner |
| sertralin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 3 reduksjoner |
| vortioksetin | eneste form | 1 reduksjon | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | stopper ved første trinn | 3 reduksjoner |

## Klinisk omfang per virkestoff og form (P7.5)

Til kontrollørens regel- og formspesifikke kontroll (gjennomgangen av 62ebb21): for hver kombinasjon og hvert klinisk scenario, om en oppnåelig delplan kan brukes, eller om bare et forklarende stopp er riktig. Ingen delplan er en fullstendig seponering, og en dose som krever begrunnelse, er aldri et anbefalt eller rutinemessig trinn. Scenario (h) er en simulering og er ikke med.

- **delplan:** delplan med den foretrukne reduksjonen, som stopper ved trinnet før det første som ikke kan gis.
- **valgt dose:** første trinn bare med en dose forskriveren velger, innenfor det foretrukne området.
- **bare avvik:** bare forklarende stopp; de eneste dosene som kan gis, er avvik som krever begrunnelse og kan bare velges etter uttrykkelig individuell vurdering.
- **stopp:** bare forklarende stopp; ingen dose i valgområdet kan gis.

| Virkestoff | Form | (a) | (b) | (c) | (d) | (f) |
| --- | --- | --- | --- | --- | --- | --- |
| amitriptylin | eneste form | valgt dose | delplan (1) | stopp | stopp | – |
| citalopram | eneste form | bare avvik | bare avvik | stopp | stopp | – |
| escitalopram | Tablett [53] | delplan (1) | bare avvik | stopp | stopp | bare avvik |
| escitalopram | Dråper, oppløsning [748] | delplan (1) | delplan (1) | delplan (1) | stopp | valgt dose |
| fluoksetin | Dispergerbar tablett [5] | delplan (1) | bare avvik | stopp | bare avvik | bare avvik |
| fluoksetin | Tablett [53] | delplan (1) | bare avvik | stopp | bare avvik | bare avvik |
| fluoksetin | Kapsel, hard [891] | bare avvik | bare avvik | stopp | stopp | – |
| fluvoksamin | eneste form | delplan (1) | bare avvik | stopp | stopp | bare avvik |
| klomipramin | eneste form | delplan (1) | delplan (1) | delplan (1) | stopp | valgt dose |
| nortriptylin | eneste form | valgt dose | delplan (1) | stopp | stopp | – |
| sertralin | eneste form | delplan (1) | bare avvik | stopp | stopp | bare avvik |
| vortioksetin | eneste form | delplan (1) | valgt dose | stopp | stopp | bare avvik |

## Per virkestoff

### amitriptylin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 35 mg (-6,67 %, faktisk reduksjon 30 % fra 50 mg) og 40 mg (+6,67 %, faktisk reduksjon 20 % fra 50 mg). Den foretrukne reduksjonen til 37,5 mg (−25 % fra 50 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 50 mg innenfor valgområdet 5–50 %: 35 mg (−30 %, avvik som krever begrunnelse) eller 40 mg (−20 %). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 35 mg (−30 %, avvik som krever begrunnelse) eller 40 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 40,5 mg, fra 45 mg): 40 mg (−11,11 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 47,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 45 mg (-5,26 %, faktisk reduksjon 10 % fra 50 mg) og 50 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- amitriptylin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a).**

(a) gir ingen dose å videreføre fra.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 40 mg = 4 tabletter à 10 mg, valgt av forskriveren (beregnet 37,5 mg; −20 %)
- dag 29–56: 30 mg = 3 tabletter à 10 mg
- dag 57–84: 25 mg = 1 tablett à 25 mg, valgt av forskriveren (beregnet 22,5 mg; −16,67 %)
- dag 85–112: 20 mg = 2 tabletter à 10 mg, valgt av forskriveren (beregnet 18,75 mg; −20 %)
- fra dag 113: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 15 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### citalopram, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

Stopper:

- citalopram dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-33,33 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+33,33 %). Den foretrukne reduksjonen til 15 mg (−25 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 10 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 15 mg, fra 20 mg): 10 mg (−50 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

Stopper:

- citalopram dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-44,44 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+11,11 %). Den foretrukne reduksjonen til 18 mg (−10 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 10 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 18 mg, fra 20 mg): 10 mg (−50 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

Stopper:

- citalopram dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-47,37 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- citalopram dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a).**

(a) gir ingen dose å videreføre fra.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- fra dag 1: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 15 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### escitalopram, Tablett [53]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 10 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-16,67 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+11,11 %). Den foretrukne reduksjonen til 18 mg (−10 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 15 mg (−25 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 18 mg, fra 20 mg): 15 mg (−25 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-21,05 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 5 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 3,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 15 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-11,11 %, faktisk reduksjon 33,33 % fra 15 mg) og 15 mg (+33,33 %). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 15 mg innenfor valgområdet 5–50 %: 10 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 11,25 mg, fra 15 mg): 10 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- dag 1–28: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- dag 29–56: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 11,25 mg; −33,33 %)
- fra dag 57: 5 mg = 1 tablett à 5 mg, valgt av forskriveren (beregnet 7,5 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### escitalopram, Dråper, oppløsning [748]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 15 dråper à 1 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 11 mg (−26,67 %, avvik som krever begrunnelse) eller 12 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

- fra dag 1: 18 mg = 18 dråper à 1 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 16 mg (−11,11 %, avvik som krever begrunnelse) eller 17 mg (−5,56 %).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

- fra dag 1: 19 mg = 19 dråper à 1 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

**(d) Lav dose: laveste styrke i formen, fra 1 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 0,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 1 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 15 mg.**

Stopper:

- escitalopram dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 11 mg (-2,22 %, faktisk reduksjon 26,67 % fra 15 mg) og 12 mg (+6,67 %, faktisk reduksjon 20 % fra 15 mg). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 15 mg innenfor valgområdet 5–50 %: 11 mg (−26,67 %, avvik som krever begrunnelse) eller 12 mg (−20 %). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 11,25 mg, fra 15 mg): 11 mg (−26,67 %, avvik som krever begrunnelse) eller 12 mg (−20 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- dag 1–28: 15 mg = 15 dråper à 1 mg
- dag 29–56: 11 mg = 11 dråper à 1 mg, valgt av forskriveren (beregnet 11,25 mg; −26,67 %)
- dag 57–84: 8 mg = 8 dråper à 1 mg, valgt av forskriveren (beregnet 8,25 mg; −27,27 %)
- dag 85–112: 6 mg = 6 dråper à 1 mg
- dag 113–140: 5 mg = 5 dråper à 1 mg, valgt av forskriveren (beregnet 4,5 mg; −16,67 %)
- dag 141–168: 4 mg = 4 dråper à 1 mg, valgt av forskriveren (beregnet 3,75 mg; −20 %)
- fra dag 169: 3 mg = 3 dråper à 1 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### fluoksetin, Dispergerbar tablett [5]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 22,5 mg, fra 30 mg): 20 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 36 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-16,67 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+11,11 %). Den foretrukne reduksjonen til 36 mg (−10 % fra 40 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 40 mg innenfor valgområdet 5–50 %: 30 mg (−25 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 36 mg, fra 40 mg): 30 mg (−25 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 38 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-21,05 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 20 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-33,33 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+33,33 %). Den foretrukne reduksjonen til 15 mg (−25 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 10 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 15 mg, fra 20 mg): 10 mg (−50 %, avvik som krever begrunnelse).

**(f) Videreføring: ny plan fra siste dose i (a), fra 30 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 22,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-11,11 %, faktisk reduksjon 33,33 % fra 30 mg) og 30 mg (+33,33 %). Den foretrukne reduksjonen til 22,5 mg (−25 % fra 30 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 30 mg innenfor valgområdet 5–50 %: 20 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 22,5 mg, fra 30 mg): 20 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 40 mg.**

- dag 1–28: 30 mg = 1½ tabletter à 20 mg
- dag 29–56: 20 mg = 1 tablett à 20 mg, valgt av forskriveren (beregnet 22,5 mg; −33,33 %)
- fra dag 57: 10 mg = ½ tablett à 20 mg, valgt av forskriveren (beregnet 15 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### fluoksetin, Tablett [53]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 40 mg.**

- fra dag 1: 30 mg = 1½ tabletter à 20 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 22,5 mg, fra 30 mg): 20 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 36 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-16,67 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+11,11 %). Den foretrukne reduksjonen til 36 mg (−10 % fra 40 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 40 mg innenfor valgområdet 5–50 %: 30 mg (−25 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 36 mg, fra 40 mg): 30 mg (−25 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 38 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 30 mg (-21,05 %, faktisk reduksjon 25 % fra 40 mg) og 40 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 20 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-33,33 %, faktisk reduksjon 50 % fra 20 mg) og 20 mg (+33,33 %). Den foretrukne reduksjonen til 15 mg (−25 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 10 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 15 mg, fra 20 mg): 10 mg (−50 %, avvik som krever begrunnelse).

**(f) Videreføring: ny plan fra siste dose i (a), fra 30 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 22,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-11,11 %, faktisk reduksjon 33,33 % fra 30 mg) og 30 mg (+33,33 %). Den foretrukne reduksjonen til 22,5 mg (−25 % fra 30 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 30 mg innenfor valgområdet 5–50 %: 20 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 22,5 mg, fra 30 mg): 20 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 40 mg.**

- dag 1–28: 30 mg = 1½ tabletter à 20 mg
- dag 29–56: 20 mg = 1 tablett à 20 mg, valgt av forskriveren (beregnet 22,5 mg; −33,33 %)
- fra dag 57: 10 mg = ½ tablett à 20 mg, valgt av forskriveren (beregnet 15 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### fluoksetin, Kapsel, hard [891]

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 30 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-33,33 %, faktisk reduksjon 50 % fra 40 mg) og 40 mg (+33,33 %). Den foretrukne reduksjonen til 30 mg (−25 % fra 40 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 40 mg innenfor valgområdet 5–50 %: 20 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 30 mg, fra 40 mg): 20 mg (−50 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 36 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-44,44 %, faktisk reduksjon 50 % fra 40 mg) og 40 mg (+11,11 %). Den foretrukne reduksjonen til 36 mg (−10 % fra 40 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 40 mg innenfor valgområdet 5–50 %: 20 mg (−50 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 36 mg, fra 40 mg): 20 mg (−50 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 40 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 38 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (-47,37 %, faktisk reduksjon 50 % fra 40 mg) og 40 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 20 mg.**

Stopper:

- fluoksetin dag 1–28: den ideelle dosen 15 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 20 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a).**

(a) gir ingen dose å videreføre fra.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 40 mg.**

- fra dag 1: 20 mg = 1 kapsel à 20 mg, valgt av forskriveren (beregnet 30 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### fluvoksamin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 100 mg.**

- fra dag 1: 75 mg = 1½ tabletter à 50 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 50 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 100 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 90 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-16,67 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+11,11 %). Den foretrukne reduksjonen til 90 mg (−10 % fra 100 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 100 mg innenfor valgområdet 5–50 %: 75 mg (−25 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 90 mg, fra 100 mg): 75 mg (−25 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 100 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 95 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-21,05 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 50 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 25 mg (-33,33 %, faktisk reduksjon 50 % fra 50 mg) og 50 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 75 mg.**

Stopper:

- fluvoksamin dag 1–28: den ideelle dosen 56,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 50 mg (-11,11 %, faktisk reduksjon 33,33 % fra 75 mg) og 75 mg (+33,33 %). Den foretrukne reduksjonen til 56,25 mg (−25 % fra 75 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 75 mg innenfor valgområdet 5–50 %: 50 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 56,25 mg, fra 75 mg): 50 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 100 mg.**

- dag 1–28: 75 mg = 1½ tabletter à 50 mg
- fra dag 29: 50 mg = 1 tablett à 50 mg, valgt av forskriveren (beregnet 56,25 mg; −33,33 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### klomipramin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

- fra dag 1: 37,5 mg = 1½ tabletter à 25 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 28,13 mg, fra 37,5 mg): 27,5 mg (−26,67 %, avvik som krever begrunnelse) eller 30 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 40,5 mg, fra 45 mg): 40 mg (−11,11 %, avvik som krever begrunnelse) eller 42,5 mg (−5,56 %).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

- fra dag 1: 47,5 mg = 1 tablett à 10 mg + 1½ tabletter à 25 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- klomipramin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 37,5 mg.**

Stopper:

- klomipramin dag 1–28: den ideelle dosen 28,13 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 27,5 mg (-2,24 %, faktisk reduksjon 26,67 % fra 37,5 mg) og 30 mg (+6,65 %, faktisk reduksjon 20 % fra 37,5 mg). Den foretrukne reduksjonen til 28,13 mg (−24,99 % fra 37,5 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 37,5 mg innenfor valgområdet 5–50 %: 27,5 mg (−26,67 %, avvik som krever begrunnelse) eller 30 mg (−20 %). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 28,13 mg, fra 37,5 mg): 27,5 mg (−26,67 %, avvik som krever begrunnelse) eller 30 mg (−20 %).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 37,5 mg = 1½ tabletter à 25 mg
- dag 29–56: 27,5 mg = 1½ tabletter à 10 mg + ½ tablett à 25 mg, valgt av forskriveren (beregnet 28,13 mg; −26,67 %)
- dag 57–84: 20 mg = 2 tabletter à 10 mg, valgt av forskriveren (beregnet 20,63 mg; −27,27 %)
- dag 85–112: 15 mg = 1½ tabletter à 10 mg
- dag 113–140: 12,5 mg = ½ tablett à 25 mg, valgt av forskriveren (beregnet 11,25 mg; −16,67 %)
- fra dag 141: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 9,38 mg; −20 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### nortriptylin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 50 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 35 mg (-6,67 %, faktisk reduksjon 30 % fra 50 mg) og 40 mg (+6,67 %, faktisk reduksjon 20 % fra 50 mg). Den foretrukne reduksjonen til 37,5 mg (−25 % fra 50 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 50 mg innenfor valgområdet 5–50 %: 35 mg (−30 %, avvik som krever begrunnelse) eller 40 mg (−20 %). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 35 mg (−30 %, avvik som krever begrunnelse) eller 40 mg (−20 %).

**(b) Lang behandlingstid, 10 % per trinn, fra 50 mg.**

- fra dag 1: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 40,5 mg, fra 45 mg): 40 mg (−11,11 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 50 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 47,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 45 mg (-5,26 %, faktisk reduksjon 10 % fra 50 mg) og 50 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 10 mg.**

Stopper:

- nortriptylin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a).**

(a) gir ingen dose å videreføre fra.

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 50 mg.**

- dag 1–28: 40 mg = 4 tabletter à 10 mg, valgt av forskriveren (beregnet 37,5 mg; −20 %)
- dag 29–56: 30 mg = 3 tabletter à 10 mg
- dag 57–84: 25 mg = 1 tablett à 25 mg, valgt av forskriveren (beregnet 22,5 mg; −16,67 %)
- fra dag 85: 20 mg = 2 tabletter à 10 mg, valgt av forskriveren (beregnet 18,75 mg; −20 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### sertralin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 100 mg.**

- fra dag 1: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 50 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 100 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 90 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-16,67 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+11,11 %). Den foretrukne reduksjonen til 90 mg (−10 % fra 100 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 100 mg innenfor valgområdet 5–50 %: 75 mg (−25 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 90 mg, fra 100 mg): 75 mg (−25 %, avvik som krever begrunnelse).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 100 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 95 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 75 mg (-21,05 %, faktisk reduksjon 25 % fra 100 mg) og 100 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 25 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 18,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 25 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 75 mg.**

Stopper:

- sertralin dag 1–28: den ideelle dosen 56,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 50 mg (-11,11 %, faktisk reduksjon 33,33 % fra 75 mg) og 75 mg (+33,33 %). Den foretrukne reduksjonen til 56,25 mg (−25 % fra 75 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 75 mg innenfor valgområdet 5–50 %: 50 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 56,25 mg, fra 75 mg): 50 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 100 mg.**

- dag 1–28: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- dag 29–56: 50 mg = 1 tablett à 50 mg, valgt av forskriveren (beregnet 56,25 mg; −33,33 %)
- fra dag 57: 25 mg = 1 tablett à 25 mg, valgt av forskriveren (beregnet 37,5 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

### vortioksetin, eneste form

**(a) Vanlig dose, kort behandlingstid, standardvalgene, fra 20 mg.**

- fra dag 1: 15 mg = 1 tablett à 15 mg
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 10 mg (−33,33 %, avvik som krever begrunnelse).

**(b) Lang behandlingstid, 10 % per trinn, fra 20 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 18 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-16,67 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+11,11 %). Den foretrukne reduksjonen til 18 mg (−10 % fra 20 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 20 mg innenfor valgområdet 5–50 %: 15 mg (−25 %). Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 18 mg, fra 20 mg): 15 mg (−25 %).

**(c) Tidligere seponeringssymptomer (langsom variant), fra 20 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 19 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 15 mg (-21,05 %, faktisk reduksjon 25 % fra 20 mg) og 20 mg (+5,26 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(d) Lav dose: laveste styrke i formen, fra 5 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 3,75 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (+33,33 %). Regelen lar forskriveren velge en dose som kan gis, men ingen gir en faktisk reduksjon innenfor valgområdet for trinnet. En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv.

**(f) Videreføring: ny plan fra siste dose i (a), fra 15 mg.**

Stopper:

- vortioksetin dag 1–28: den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 10 mg (-11,11 %, faktisk reduksjon 33,33 % fra 15 mg) og 15 mg (+33,33 %). Den foretrukne reduksjonen til 11,25 mg (−25 % fra 15 mg) kan ikke gis med preparatene. Regelen lar forskriveren velge en dose som kan gis, med faktisk reduksjon fra 15 mg innenfor valgområdet 5–50 %: 10 mg (−33,33 %, avvik som krever begrunnelse). En dose som krever begrunnelse, er et avvik fra den foretrukne reduksjonen og ikke et anbefalt trinn; den kan bare velges etter uttrykkelig individuell vurdering. Beregningen velger ikke selv.

- Kan velges for trinn 1 (dag 1, beregnet 11,25 mg, fra 15 mg): 10 mg (−33,33 %, avvik som krever begrunnelse).

**(h) Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag), fra 20 mg.**

- dag 1–28: 15 mg = 1 tablett à 15 mg
- dag 29–56: 10 mg = 1 tablett à 10 mg, valgt av forskriveren (beregnet 11,25 mg; −33,33 %)
- fra dag 57: 5 mg = 1 tablett à 5 mg, valgt av forskriveren (beregnet 7,5 mg; −50 %)
- neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt

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
