# OUSFAR Verktøy – P11: kontroller, pilot, publisering og tilbakeføring

Status 31.10.2026: til uavhengig sluttkontroll (ChatGPT). Fasen er beskrevet i `docs/verktøy-utviklingsplan.md` (P11.1–P11.6). Dette notatet sier hva som er kontrollert, hva pilotgjennomgangen fant og rettet, hvilke risikoer som gjenstår, og hvordan de kliniske verktøyene publiseres, deaktiveres og føres tilbake ved en kritisk feil.

## 1. Avgrensning

- Bare de seks reglene som er klinisk godkjent i PR #286 (merget 31.10.2026), kan gi klinisk innhold, og bare i omfanget de er godkjent for: vortioksetin versjon 11 (én reduksjon 20 → 15 mg), sertralin → mirtazapin versjon 9 (startforløpet fra 50 eller 100 mg), Abilify Maintena versjon 3, Xeplion versjon 3, og fagtekst for bupropion versjon 5 og agomelatin versjon 1.
- Ingen regelversjon, dose, betingelse eller fingeravtrykk er endret i P11, og ingen regel er aktivert. Den frosne listen over de godkjente reglene og de 24 som er kontrollert og ikke godkjent, kontrolleres som før av `src/__tests__/verktoyklinisktilgang.test.ts`.
- Alle kasus er syntetiske. Ingen pasientopplysninger er brukt, og ingen kildetekst fra Psychiatrienet er lagret eller vist.

## 2. Kontrollene og resultatene

### 2.1 Ende-til-ende-testmatrisen (P11.1, P11.4)

`src/verktoy/regler/pilotmatrise.ts` har 112 syntetiske kasus. Hvert går den samme veien som verktøysiden: tilgjengeligheten for valgene, nødstoppen, det som mangler i skjemaet, valget av legemiddelform, beregningen med preparatene i de lagrede FEST-uttrekkene (`src/data/verktoy/fest-pilotsett.json`, `src/data/verktoy/fest-aksepttest.json`) og visningen. Forventningen er skrevet ut for hvert kasus: radene i planen slik de står på skjermen og i kopien, eller grunnene til at ingen plan vises. Utfallene står i `docs/verktøy-p11-testmatrise.md`.

| Det Peder ba om (P11.1) | Kasus |
|---|---|
| Normale og uvanlige doser, grenseverdier | V01–V09, V17, S01–S07, M01–M06, X01, X06–X12, X21–X24 |
| Pasientforhold, også ubesvarte | V10–V15, S08–S10, M08, M12, X13, X14 |
| Utilgjengelige eller endrede preparater | V18–V24, S00, S13–S16, M13–M16, X15–X17 |
| Foreldet FEST | V25 (47 timer: plan), V26, S17, M17, X18 (49 timer: ingen plan) |
| Injeksjons- og startdatoer | V02, S03, M07, X02–X05, X25 (månedsslutt, skuddår, en dato som ikke finnes) |
| Interaksjonssperrer | V16, S11, S12, M09–M11 |
| Feil fra datakildene | V27–V32 (tidsstempel fram i tid, ingen henting, ugyldig tidspunkt, kildedato etter kontrollen, annen kilde enn FEST, tomt svar) |
| Regler som ikke er godkjent, endret regel og nødstoppen | V33–V37, S18, S19, M18, X19, X20, F01–F05, I01–I07 |

Punktene i den opprinnelige P11.1-lista er dekket slik: delte tabletter (½ og ¼) og ikke-delbare tabletter brukes ikke av noen godkjent regel; sperren mot udokumentert deling testes i `verktoynedtrapping.test.ts` (klomipramin). Manglende, utgåtte og uregistrerte preparater er V19–V24, S14–S16, M14–M16 og X15–X17. Manglende kilde og MAO-utvasking gjelder bare regler som ikke er godkjent (fenelzin er I03; `mao-fluoksetin-fenelzin` er sperret i `verktoyklinisktilgang.test.ts`). Depotkasusene er M- og X-kasusene.

`npm run verktoy:regler -- kontroll` kjører nå også matrisen og feiler ved ett eneste avvik. `src/__tests__/verktoyp11.test.ts` kontrollerer hvert kasus, at hver godkjent regel og hver kategori er prøvd, at en plan bare kommer fra en godkjent regel med fersk FEST, at en plan som står, forsvinner når FEST blir eldre enn 48 timer eller dagen skifter, og at rapporten er oppdatert.

### 2.2 Ingen plan fra en regel som ikke er godkjent (P11.2)

| Situasjon | Kontroll |
|---|---|
| Hver regel som ikke er godkjent, med hver legemiddelform, startdose og endret styrke i FEST | `verktoyklinisktilgang.test.ts` (over 1 000 beregninger) |
| Regelen brakt direkte til beregningen, utenom verktøysiden | Matrisen V35, F05, I05, I06 |
| Endret regel eller ny regelversjon uten ny godkjenning, godkjenningen fjernet | Matrisen V33, V34, S18, X19, I07 |
| Etter en oppdatering av appen, med svarene som peker mot den langsomme varianten | `verktoyside.test.tsx`, «gir ingen plan etter en regel som ikke er godkjent …» |
| Navigering til et annet verktøy og tilbake | Samme test |
| Ny regelversjon mens planen står, og endrede preparater i FEST | `verktoyside.test.tsx`, «tar bort planen når regelversjonen endres …» |

### 2.3 Tekniske kontroller

`npm test`, `npm run build` (med kontrollen av koden som lastes før innlogging) og `npm run verktoy:regler -- kontroll` er grønne. Migrasjonen `20261031080000_verktoysperrer.sql` er ny og bare additiv: én tabell og fire funksjoner, ingen endring i eksisterende data. De eksisterende fortolkningsreglene er ikke berørt.

## 3. Pilotgjennomgangen (P11.4)

Gjennomgått med kasusene i matrisen, både som beregning og slik planen står på skjermen og i kopien.

### 3.1 Funn som er rettet

1. **Xeplion fra 3 mg kunne ikke beregnes i appen.** Regelen (versjon 3) krever at forskriveren velger vedlikeholdsdosen i spennet 25–50 mg som måldose, men siden spurte bare etter måldose når regelen har en egen måldose, så 3 mg stoppet alltid. Nå vises feltet når omregningstabellen gir et spenn for dosen som er skrevet inn, med spennet i hjelpeteksten; for 6, 9 og 12 mg vises det ikke, og en måldose som står igjen, brukes ikke (X08, X09, X21–X25). Regelen er uendret. **Til kontrolløren:** dette gjør 3 mg med måldose 50 mg tilgjengelig i appen, slik regelens eksempel `fra-3-mg-med-dato` beskriver. 25 mg finnes ikke som brukbar Xeplion-styrke i FEST nå, så den stopper (X21).
2. **Xeplion-planen viste ikke at tablettene seponeres.** Tabellen hadde bare injeksjonene, så planen kunne leses som om peroral paliperidon skulle fortsette. Nå står «Fra dag 1: Paliperidon peroralt: Seponert» først, på skjermen og i kopien (X01–X04, X09, X24, X25). Dette er visning; beregningen er uendret.
3. **Sertralin → mirtazapin så ut som et fullstendig bytte.** Planen stopper ved sertralin 25 mg og mirtazapin 15 mg, men tittelen sier «kryssnedtrapping». Nå har en plan der et forløp ikke er beregnet til ende, undertittelen «Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.» (`STARTFORLOP` i `src/verktoy/planvisning.ts`). Planer med bare én reduksjon har fortsatt kontrollørens undertittel. **Til kontrolløren:** P7-notatet sa at sertralinplanen ikke har noen undertittel; det er endret her.
4. **Måldosen for depot sto som «mg per døgn».** Den står nå som «mg per injeksjon».
5. **Formuleringer som kunne leses som fullstendige planer eller garantier:**
   - Ingressen i oversikten sa «Doseplaner for nedtrapping og bytte …». Nå sier den at det er beregnede forslag, bare etter regler som er klinisk godkjent og bare i omfanget de er godkjent for, og at et forslag ikke erstatter klinisk vurdering og ikke er en fullstendig behandlingsplan.
   - Verktøybeskrivelsene sa «Doseplan for nedtrapping til seponering …» og «… også til og fra depotinjeksjon». Nå sier de «Beregnet forslag til de første trinnene …», «… starten på et bytte …» og «… også til depotinjeksjon»; ingen regel fra depot er godkjent.
   - «Beregningen er tilgjengelig: regelen er klinisk godkjent» er nå «Beregning er tilgjengelig: regelen er klinisk godkjent, men bare for et avgrenset omfang. Utenfor det stopper beregningen og sier hvorfor.»

### 3.2 Observasjoner som ikke er endret, til kontrolløren

- **Godkjenningsfritak valgt av forskriveren (V24):** finnes et virkestoff bare med godkjenningsfritak og forskriveren krysser av for det, gir regelen en plan, og preparatlista sier «godkjenningsfritak». Uten avkrysning stopper den (V23). Det kliniske omfanget avgrenser form og styrker, ikke registreringsstatus; for Xeplion velger regelen selv bare registrerte preparater (X17).
- **Samme dose med andre tabletter:** er en styrke meldt avregistrert i planperioden, eller avregistrert når regelen ikke har et klinisk omfang med styrker, setter motoren sammen samme dose av andre styrker og sier det i advarslene: sertralin 50 mg som 2 × 25 mg (S16), aripiprazol 15 mg som 10 + 5 mg (M16).
- **Knappen «Beregn doseplan» og ordet «doseplan»** er beholdt. Undertitlene, advarslene og ingressen sier hva planen ikke er.

## 4. Nødstoppen (P11.6)

En administrator kan deaktivere alle verktøyene, ett verktøy eller én klinisk godkjent regel med en gang, uten en ny versjon av appen: Adminmeny → **Kliniske verktøy** → «Ny sperre» → velg hva → skriv grunnen → **Deaktiver nå**. Sperren oppheves samme sted med en grunn. Ingen sperre slettes; historikken viser hvem som satte og opphevet hver sperre, når og hvorfor.

- Sperrene står i `public.verktoysperrer` og leses og skrives bare gjennom funksjonene `les_verktoysperrer` (alle innloggede), `verktoysperrehistorikk`, `sett_verktoysperre` og `opphev_verktoysperre` (bare administratorer). Tabellen kan ikke leses eller skrives direkte.
- Verktøysidene leser sperrene før de viser en beregning eller fagtekst, hvert minutt, når fanen får fokus igjen, og på nytt når en plan er beregnet, etter at preparatene er hentet fra FEST og rett før planen vises (`src/verktoy/sperrer.ts`). En plan som står, forsvinner ved neste lesing.
- **Feiler lesingen, vises ingenting klinisk** («OUSFAR fikk ikke kontrollert om verktøyet er midlertidig deaktivert …»), med «Prøv igjen».
- Testet mot en ekte database bygd av migrasjonene (`verktoysperrer.test.ts`: tilganger, begrensninger, historikk og et helt tilbakerullingsscenario), i verktøysiden (`verktoyside.test.tsx`, «nødstoppen (P11.6)») og i administrasjonspanelet (`verktoysperrepanel.test.tsx`). I matrisen: V36, V37, S19, M18, X20, F03, F04.

## 5. Prosedyrer

### 5.1 Publisering

1. Alle kontroller i PR-en er grønne: `npm test`, `npm run build`, `npm run verktoy:regler -- kontroll` og migrasjonskontrollen.
2. Den uavhengige sluttkontrollen (ChatGPT) har godtatt PR-en, også funnene i avsnitt 3.1 som merkes «Til kontrolløren».
3. PR-en slås sammen. GitHub Actions ruller ut migrasjonen (`docs/migrasjoner.md`), og Vercel publiserer appen.
4. Etter publiseringen kontrolleres at migrasjonen `20261031080000_verktoysperrer` er registrert i produksjonen.
5. **Reell tilbakerullingsprøve (P11.6, gjenstår etter sammenslåing):** en administrator åpner Adminmeny → Kliniske verktøy og setter en sperre for én regel (for eksempel Xeplion) med grunnen «Prøve av nødstoppen». I et annet vindu, innlogget som vanlig bruker, skal «Bytte antipsykotikum» med paliperidon → paliperidon depot vise «Midlertidig deaktivert» og ingen beregning, mens Abilify Maintena fortsatt kan beregnes. Sperren oppheves med grunnen «Prøve fullført», og Xeplion kan beregnes igjen. Resultatet føres inn i fremdriftsloggen. Prøven gjøres utenom klinisk bruk og tar under fem minutter.

### 5.2 Ved en kritisk feil

1. **Stopp med en gang:** sett en sperre så snevert som mulig, men så vidt som nødvendig: regelen hvis feilen gjelder én regel, verktøyet hvis den gjelder flere regler i ett verktøy, alle verktøyene hvis feilen er i motoren eller visningen eller omfanget er uklart. Skriv hva som er galt i grunnen; den vises for brukerne.
2. **Varsle** bidragsyterne og kontrolløren, med kasuset som viser feilen (syntetisk).
3. **Rett feilen i en ny PR.** En endring av en regel gir en ny versjon og et nytt fingeravtrykk, og regelen kan ikke gi en plan før den er kontrollert og godkjent på nytt. Legg kasuset til i testmatrisen.
4. **Når feilen er i appen, ikke i en regel**, kan appen i tillegg føres tilbake: i Vercel-prosjektet for OUSFAR → Deployments → velg siste fungerende produksjonsversjon → **Instant Rollback**, eller med «Revert» på PR-en i GitHub, som gir en ny PR som slås sammen. Velg aldri en versjon eldre enn 1.116.0: de har ikke nødstoppen. En tilbakeføring av appen fører ikke databasen tilbake; tabellen for sperrene påvirker ikke eldre versjoner.
5. **Opphev sperren** først når rettelsen er publisert og kontrollert, med en grunn som viser til PR-en eller kontrollen.

## 6. Risikoer som gjenstår

| Risiko | Hva som begrenser den |
|---|---|
| En plan som allerede er kopiert eller skrevet ut, kan ikke trekkes tilbake | Planen har regelversjon, fingeravtrykk og FEST-tidspunkt; en sperre stopper nye planer med en gang |
| En plan som står åpen, kan stå til neste lesing av sperrene (høyst ett minutt, eller til fanen får fokus) | Ny lesing rett før en beregnet plan vises; planen forsvinner også når FEST blir eldre enn 48 timer eller dagen skifter |
| FEST viser registrering og markedsføring, ikke lagerstatus | Advarsel i hver plan |
| Stopper den nattlige FEST-synken, blir verktøyene utilgjengelige etter 48 timer | Feilen er trygg (ingen plan), og «Datakilder» i adminmenyen viser synken |
| Piloten er gjort med syntetiske kasus av utvikleren, ikke av klinikere i bruk | Den uavhengige sluttkontrollen; en klinisk pilot med brukere kan legges til før bred bruk |
| Endringene i 3.1 (særlig Xeplion 3 mg og undertittelen for sertralin) er ikke kontrollert ennå | Merket «Til kontrolløren»; kan stoppes med en regelsperre om kontrolløren ønsker det før en rettelse |

## 7. Akseptkriterier for PR-en

1. `npm test`, `npm run build` og `npm run verktoy:regler -- kontroll` er grønne, og `docs/verktøy-p11-testmatrise.md` er oppdatert (testen sier fra ellers).
2. Hvert av de 112 kasusene i matrisen gir nøyaktig forventet utfall, og hver godkjent regel og hver kategori i P11.1 er prøvd.
3. Ingen kasus med en regel som ikke er godkjent, en endret regel eller en ny regelversjon gir en plan; heller ikke etter en oppdatering, navigering, endret regelversjon eller endret FEST i verktøysiden.
4. De seks godkjente reglene har uendret versjon og fingeravtrykk, og ingen ny regel er godkjent (`verktoyklinisktilgang.test.ts`).
5. En sperre for alle, ett verktøy eller én regel tar bort beregning og fagtekst med en gang, også en plan som står og en beregning som pågår; kan sperrene ikke leses, vises ingenting klinisk; bare administratorer kan sette og oppheve sperrer, og ingen sperre slettes.
6. Rettelsene i avsnitt 3.1 står på skjermen og i kopien, og er testet.
7. Etter sammenslåing: tilbakerullingsprøven i 5.1 punkt 5 er gjennomført og ført inn i fremdriftsloggen.
