# OUSFAR Verktøy – måling av brukervennligheten (tråd D)

Grunnlag for akseptansekriteriene i `docs/verktøy-brukervennlighet-2026-11.md` §11. Dokumentet har én del per måling: **før-målingen** (dagens verktøy, før forenklingen) og senere **etter-målingen** (når A1, B2 og C1 er publisert). Invariantene S1–S9 håndheves av `src/__tests__/verktoyflyt-invarianter.test.ts` (§3 under).

Alt er syntetiske forløp, kjørt som administrator. Ingenting her er klinisk prøving eller godkjenning, og ingenting er lagret i appen.

## 1. Slik er det målt

- **Hvor:** den publiserte appen (https://ousfar.vercel.app), **v1.125.5** (main etter #320), 04.11.2026 kl. 10.35–11.15 UTC, med dagens FEST.
- **Hvordan:** et Playwright-skript gjør det en kliniker må gjøre, og teller hver handling: velge legemiddel eller formulering (_valg_), skrive en dose (_tekst_), svare på et spørsmål eller unntak (_svar_), krysse av en bekreftelse (_avkrysning_), trykke «Beregn doseplan» (_beregn_), velge legemiddelform når siden ber om det (_form_) og velge dose for et trinn (_dosevalg_). Valgfrie felt (startdato, «Tilpass planen», godkjenningsfritak) telles ikke, og heller ikke «Kopier planen».
- **Svarene:** «Nei» eller «Gjelder ikke» på alt, alle bekreftelser krysset av, måldosen regelen tilbyr, tablett når siden ber om form, og den første dosen siden tilbyr ved dosevalg. Det er det korteste forløpet til en plan; en pasient med et «ja» får flere eller like mange handlinger.
- **Antall** er det samme på mobil (390 px, berøring) og stor skjerm (1440 px). Med snarvalg («Kan beregnes nå») blir valgene av legemiddel og formulering ett trykk; tallet står i egen kolonne.
- **Nødstopp** er prøvd ved at nettleseren fikk en syntetisk sperre som svar på lesingen av sperrene; ingen sperre ble satt.
- Skriptet og alle skjermbildene ligger i prosjektmappen `verktoy-brukervennlighet/maling/for/` (skriptet som `maling.ts`, tallene som `maling-resultater.json`) (ikke i repoet, fordi bildene er store og viser administratorkontoen). Etter at #321 er slått sammen, flyttes skriptet inn i `src/__tests__/qa/`, så etter-målingen kjøres på samme måte.

## 2. Før-målingen (v1.125.5)

### 2.1 Forløp som skal gi en plan

| Kasus          | Verktøy og situasjon                                                | Utfall         | Handlinger | Med snarvalg | Fordeling                                                                  |
| -------------- | ------------------------------------------------------------------- | -------------- | ---------- | ------------ | -------------------------------------------------------------------------- |
| K0-01          | Trappe ned: escitalopram 10 mg, pasienten bruker **tabletter**      | **ingen plan** | 17         | 17           | 1 valg, 1 tekst, 10 svar, 2 avkrysninger, 2 beregn, 1 form                 |
| K0-01 → dråper | Samme, men forskriveren bytter til dråper etter «ingen plan» (H-39) | plan           | **24**     | 24           | 1 valg, 1 tekst, 10 svar, 2 avkrysninger, 3 beregn, 2 form, **5 dosevalg** |
| K0-07\*        | Bytte antipsykotikum: olanzapin 20 mg → aripiprazol, mål 10 mg      | plan           | 18         | 15           | 4 valg, 2 tekst, 4 svar, 4 avkrysninger, 2 beregn, 2 form                  |
| K0-08          | Bytte antipsykotikum: risperidon 4 mg → aripiprazol, mål 10 mg      | plan           | 17         | 14           | 4 valg, 2 tekst, 4 svar, 4 avkrysninger, 2 beregn, 1 form                  |
| K0-09          | Bytte antipsykotikum: aripiprazol 15 mg → Abilify Maintena          | plan           | 12         | 9            | 4 valg, 1 tekst, 3 svar, 1 avkrysning, 2 beregn, 1 form                    |
| K0-10\*        | Bytte antipsykotikum: risperidon 3 mg → Xeplion, mål 75 mg          | plan           | 14         | 11           | 4 valg, 2 tekst, 4 svar, 3 avkrysninger, 1 beregn                          |
| K0-11          | Kombinere: Lithionit 4 × 42 mg (168 mg Li⁺), lamotrigin legges til  | plan           | 19         | 18           | 2 valg, 2 tekst, 10 svar, 4 avkrysninger, 1 beregn                         |
| K0-12          | Kombinere: valproat 1000 mg, lamotrigin legges til                  | plan           | 19         | 18           | 2 valg, 2 tekst, 10 svar, 4 avkrysninger, 1 beregn                         |

\* K0-07 og K0-10 i leveranseplanen bruker olanzapin 10 mg og risperidon 4 mg. De godkjente reglene gjelder bare olanzapin 20 mg og risperidon 3 mg, så de dosene er brukt her for å måle veien til en plan; K0-07 og K0-10 med leveranseplanens doser står som negative forløp i 2.2.

**Målet etter forenklingen (kriterium 1, minst halvert, regnet fra tallet med snarvalg):** K0-01 høyst 12 (i dag 24 via dråper, og ingen plan fra tablett), K0-09 høyst 4, K0-11 og K0-12 høyst 9. For K3-forløpene høyst 7–8.

### 2.2 Forløp som skal stoppe – når får klinikeren beskjed?

| Kasus | Situasjon                                                                   | Handlinger før beskjeden | Når                                   | Hva står det (forkortet)                                                                                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------- | ------------------------ | ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N-1   | Escitalopram 15 mg (utenfor godkjente startdoser)                           | 17                       | etter hele skjemaet og to beregninger | «den ideelle dosen 11,25 mg kan ikke gis med preparatene i FEST nøyaktig …»                                                                                                                                                                          |
| K0-01 | Escitalopram 10 mg tablett                                                  | 17                       | etter hele skjemaet og to beregninger | «den ideelle dosen 7,5 mg kan ikke gis … ikke under 1 mg»                                                                                                                                                                                            |
| N-2   | Sertralin 100 mg (ingen godkjent regel)                                     | 1                        | straks                                | «Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent …»                                                                                                                                                                        |
| N-3   | Sertralin 100 mg → mirtazapin (regel godkjent, men gir aldri komplett plan) | 10                       | etter hele skjemaet og to beregninger | «Komplett plan ikke tilgjengelig: sertralin: siste trinn før null; avslutning vurderes individuelt; mirtazapin: …». Med smeltetablett valgt: «… ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 50 og 100 mg, FEST-legemiddelform 53 …)» |
| N-6   | Kvetiapin 400 mg → aripiprazol (ingen regel)                                | 3                        | straks                                | «Ikke støttet. OUSFAR har ingen regel for denne kombinasjonen.»                                                                                                                                                                                      |
| K0-07 | Olanzapin 10 mg → aripiprazol                                               | 18                       | etter hele skjemaet og to beregninger | «Startdosen 10 mg er utenfor det regelen gjelder for (20 mg).»                                                                                                                                                                                       |
| K0-10 | Risperidon 4 mg → Xeplion                                                   | 14                       | etter hele skjemaet                   | «Startdosen 4 mg er utenfor det regelen gjelder for (3 mg).»                                                                                                                                                                                         |
| N-4   | Lithionit 83 mg (83 mg Li⁺) + lamotrigin                                    | 19                       | etter hele skjemaet                   | «Startdosen 83 mg er utenfor det regelen gjelder for (42, 84, 126 … mg).»                                                                                                                                                                            |
| N-5   | Nødstopp for alle verktøyene                                                | 0                        | straks, når verktøyet åpnes           | «Midlertidig deaktivert …», med grunn og hvem                                                                                                                                                                                                        |

**Målet (kriterium 4):** i N-1, N-3, K0-07, K0-10 og N-4 skal beskjeden komme rett etter at legemiddel og dose er oppgitt (steg 2), før ett eneste pasientspørsmål: høyst 2–5 handlinger i stedet for 10–19.

### 2.3 Hvor mye klinikeren må lese

| Skjema (utfylt, før planen) | Spørsmål med to svar                      | Avkrysninger | Ord i skjemaet | Lengde på mobil             |
| --------------------------- | ----------------------------------------- | ------------ | -------------- | --------------------------- |
| Escitalopram                | 10 (5 «Ja/Nei», 5 «Gjelder/Gjelder ikke») | 3            | 400            | 3 165 px ≈ 3,7 skjermhøyder |
| Litium + lamotrigin         | 10                                        | 5            | 427            | 3 465 px ≈ 4,1 skjermhøyder |
| Valproat + lamotrigin       | 10                                        | 5            | 440            | 3 440 px ≈ 4,1 skjermhøyder |
| Olanzapin → aripiprazol     | 6                                         | 5            | 329            | 2 738 px ≈ 3,2 skjermhøyder |
| Aripiprazol → Maintena      | 5                                         | 2            | 128            | 1 938 px ≈ 2,3 skjermhøyder |

Planen for escitalopram via dråper er 8 162 px lang på mobil (≈ 9,7 skjermhøyder), litium + lamotrigin 7 161 px.

### 2.4 Funn som ikke synes i tallene

1. **Feil legemiddelform gir stopp uten forklaring på hva som ville virket.** For aripiprazol står «Smeltetablett» før «Tablett» i formvalget. Velges smeltetablett i K0-07\* og K0-08, stopper planen med «den ideelle dosen 5 mg kan ikke gis med preparatene i FEST nøyaktig»; med tablett blir det en plan. For mirtazapin (N-3) gir smeltetablett en annen og mer teknisk stoppmelding enn tablett. Klinikeren må gjette hvilken form som virker (P6, B4).
2. **Et bytte som aldri kan gi plan, viser hele skjemaet** (sertralin → mirtazapin, N-3), selv om oversikten ikke tilbyr det som «kan beregnes» (P11).
3. **Startdoser utenfor regelen avsløres først etter hele skjemaet** (N-1, K0-07, K0-10, N-4), og teksten nevner «tilfelle godkjenningen kan gjelde for», «FEST-legemiddelform 53» og styrkelister (P5, P9).
4. **Fra tablett gir escitalopram ingen plan** (K0-01), og veien videre (bytte til dråper) står ikke i meldingen. Med dråper kreves fem dosevalg, hvert med ny beregning (P8).
5. **«Gjelder»/«Gjelder ikke»** står ved hvert unntak i alle verktøy med beregning (8 av 8 valg), og siden for en regel uten godkjenning viser kontrollutfallet («kontrollert, ikke godkjent») (P1, P9). Testen i §3 viser det samme.
6. **Lange bekreftelser.** Escitalopram har to avkrysninger på til sammen om lag 100 ord. Den lengste (74 ord) er et forbehold ved hvordan planen brukes, ikke et forhold ved pasienten (P3, B1).
7. **Begrunnelsesfeltet** med nesten 70 ords hjelpetekst står i escitalopramskjemaet også når ingen svar krever begrunnelse.
8. **Datofeltet** følger nettleserens språk; i en engelskspråklig nettleser står det «mm/dd/yyyy».

### 2.5 Skjermbilder

I `verktoy-brukervennlighet/maling/for/` i prosjektmappen, navngitt `<kasus>-<bredde>-<tilstand>.png` (tilstand: `tomt-skjema`, `utfylt`, `resultat`, `stopp`), lyst tema i begge bredder, og mørkt tema for K0-01 → dråper, K0-09, K0-11 og N-3 i `mork/`:

| Verktøy                           | Positivt forløp                | Negativt forløp      |
| --------------------------------- | ------------------------------ | -------------------- |
| Trappe ned antidepressiv          | K0-01 → dråper                 | K0-01 (tablett), N-1 |
| Bytte antidepressiv               | – (ingen bytte gir plan i dag) | N-3                  |
| Bytte antipsykotikum              | K0-07\*, K0-09                 | K0-07, N-6           |
| Kombinere stemningsstabiliserende | K0-11                          | N-4                  |

## 3. Invariantene S1–S9 (`verktoyflyt-invarianter.test.ts`)

Testen prøver hver godkjent regel med beregning som verktøyene tilbyr, i hver startdose, legemiddelform og svarkombinasjon regelens kliniske omfang er kontrollert med (uten omfang hvert av regelens regneeksempler slik det står, med svar, måldose, pasientforhold og bekreftelser), og hver måldose regelen tilbyr der tilfellet ikke har sin egen: 65 kasus, 14 av dem med plan på main. S3 prøver i tillegg P11-matrisen (115 kasus), K4-kasusene (43) og kontrollkasusene sammen med hver vei gjennom det kliniske omfanget i kontrollgrunnlagene (91), til sammen 314 utfall i ett øyeblikksbilde. For hvert utfall lagres også hvilke dosevalg verktøyet tilbyr underveis.

| Invariant   | Hva testen kontrollerer                                                                                                                                                                     | Status før forenklingen                                                                                                                            |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1          | Hver plan er klinisk og komplett til sluttmålet, vurdert av planens egne forløp; ingen plan i P11-matrisen er en delplan                                                                    | grønn, men **ikke uavhengig nok**: kontrollerer ikke valgt måldose og uendret eksisterende dose; rettes med `komplett` fra #321 og negative tester |
| S2          | De 12 godkjente regelversjonene har nøyaktig de fingeravtrykkene godkjenningen gjelder                                                                                                      | grønn                                                                                                                                              |
| S3          | Øyeblikksbilde av dosene, preparatene, vurderingspunktene, forbeholdene og stoppgrunnene for alle kasusene; endres bare med en ny, godkjent regelversjon                                    | grønn                                                                                                                                              |
| S4          | Hver betingelse uten svar gir ingen plan; hvert unntak som gjelder, gir ingen plan                                                                                                          | grønn; «Ukjent» venter på C1                                                                                                                       |
| S5          | Skjemaet krever svar på hvert spørsmål og unntak og hver bekreftelse som gjelder, også de betingede                                                                                         | grønn; katalogen venter på C1                                                                                                                      |
| S6          | Avledninger ved grenseverdier                                                                                                                                                               | venter på C1                                                                                                                                       |
| S7          | Nødstopp (alle, verktøy, regel), FEST over 48 timer eller fram i tid, ingen vellykket henting, bare preparater med godkjenningsfritak, og en ny dag tar planen bort                         | grønn                                                                                                                                              |
| S8          | Kopien inneholder hver dag, dose, preparatstyrke og antall, hvert vurderingspunkt og forbehold, preparatene, kildene, regelversjonen og fingeravtrykket (formen kan endres, innholdet ikke) | grønn, men **bare delstreng**: «dag 1» finnes i «dag 10»; rettes med `tidslinjeavvik` fra #321 (celle for celle) og negative tester                |
| S9          | Hvert valg som tilbys som «kan beregnes», gir en plan i minst ett kontrollert tilfelle                                                                                                      | grønn; forhåndskontrollen venter på C1                                                                                                             |
| Kriterium 2 | Ingen regel-ID, «fingeravtrykk», «omfang», «strategi», kontrollutfall eller svaret «Gjelder» i det klinikeren ser før planen                                                                | **feiler i dag** (merket `it.fails`); A1 endrer det til `it`                                                                                       |

En test merket «venter på» er en `it.todo`: den er beskrevet, men ikke skrevet, og regnes ikke som bestått.

## 4. Etter-målingen

Gjøres når A1, C1 og helst B2 er publisert, med det samme skriptet tilpasset den nye flyten, og med kopien kontrollert for minst ett positivt og ett negativt forløp per verktøy, skjermbilder av alle fire verktøy i begge bredder og temaer, og tastatur- og skjermleserkontroll.
