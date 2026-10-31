# OUSFAR Verktøy – P12.2–P12.4: forvaltning av kliniske regler

**Status 31.10.2026:** arkitektur og trinnvis plan, til vurdering (arbeidspakke C). Rettet etter kontrollørens gjennomganger av `a090786` og `177e1de` (§11). Ingen kode, regel, regelversjon, godkjenning eller fingeravtrykk er endret. Planen gjelder P12.2–P12.4 i `docs/verktøy-utviklingsplan.md` og bygger på overvåkingen av kilder og FEST i P12.1/P12.5 (`src/verktoy/overvaking/`), som lages i en egen PR. Ingen omlegging gjøres før planen er vurdert av den uavhengige kontrolløren (ChatGPT) og bidragsyteren.

## 1. Mål og avgrensning

**Mål:** Kliniske regelversjoner, hele revisjonshistorikken og kildene skal kunne vedlikeholdes uten endringer i beregningsmotoren (`src/verktoy/regler/beregning.ts`, `src/verktoy/motor/`) eller grensesnittet (`src/components/verktoy/`, `src/verktoy/doseplan.ts`, `src/verktoy/planvisning.ts`). En ny eller endret regel, et kildeskifte eller en ny sammenligningskilde skal gå samme kontrollerte vei: import → tydelig tolkning → tester → uavhengig kontroll → publisering (P12.4).

**Faste rammer, uendret fra P4–P11:**

- En godkjenning gjelder nøyaktig én regelversjon og ett fingeravtrykk (`godkjenning.ts`). Ingenting godkjennes, aktiveres eller endres automatisk; heller ikke av overvåkingen.
- Claude Code registrerer aldri en godkjenning på eget initiativ. Kontrollørens beslutninger føres inn slik de er gitt, med lenke til kontrollen.
- Psychiatrienet er bare en referanse til en P3-kildeoppføring. Ingen tekst fra kilden lagres eller vises, verken ordrett, oversatt eller omskrevet (`docs/verktøy-p3-rettigheter.md`).
- Nødstoppen (`public.verktoysperrer`, P11.6) er den eneste kliniske bryteren i produksjonen, og den kan bare sperre, aldri aktivere.
- De seks godkjente regelversjonene og de 24 som er kontrollert og ikke godkjent, skal ha uendret versjon og fingeravtrykk gjennom hele omleggingen (`src/__tests__/verktoyklinisktilgang.test.ts`).

**Utenfor:** overvåkingen selv (P12.1/P12.5), nye kliniske regler, P12.6 og databasetabeller for regler.

## 2. Slik er det i dag

| Del | Hvor | Merknad |
| --- | --- | --- |
| Regelinnhold | `regler/pilotsett.ts` (1 245 linjer), `regler/nedtrapping.ts` (2 306 linjer), felles byggesteiner i `regler/bygg.ts` | TypeScript som bygger reglene, delvis programmatisk (én `Stoffregel` gir hovedregel og langsom variant). 32 regler, om lag 740 kB som JSON, den største 44 kB. |
| Godkjenning | `Regel.godkjenning` i samme objekt, bygget av hjelpefunksjoner (`avgrensetGodkjent`, `Stoffregel.godkjent`, `leveransen` + `disponer`) | Holdes utenfor fingeravtrykket, men skrives i samme fil som innholdet. |
| Kilder | `regler/kilder.ts` (`KILDER`) | Én versjon per kilde-id. Fingeravtrykket tar med `{id, versjon, sha256}` for hver kilde regelen viser til (`fingeravtrykk` via `kildeFor`). |
| Psychiatrienet | P3-arkivet `src/data/verktoy/psychiatrienet-kildearkiv.json` (`kildearkiv.ts`, bare metadata, bare tillegg) | Henvisningen `{kilde: 'psychiatrienet', kildeoppforing}`; `kontroll.ts` leser arkivet direkte for å kontrollere retning, virkestoff og formulering. |
| Motorene | `beregning.ts` (`MOTORVERSJON` 9), `motor/plan.ts` (`PLANMOTORVERSJON` 9) | Tar `Regel` og `Regelsett` som inndata og kjenner ingen bestemt regel. |
| Koblingen til appen | `tilgjengelighet.ts` (`REGELSETTENE`) | Det eneste stedet appen importerer bestemte regelsett. `planvisning.ts` viser kildene med `kildeFor` (gjeldende versjon). |
| Overvåking (P12.1/P12.5) | `src/verktoy/overvaking/` (`npm run verktoy:overvaking -- kontroll`, ukentlig arbeidsflyt) | Gir `Overvakingsfunn` med `niva` informativ eller krever vurdering og `berorte` (regelsett, regel, versjon, fingeravtrykk, hvorfor). Grunnlaget er det repoet har; endres bare med PR. |
| Kontroller | `verktoy:regler -- kontroll`, testmatrisen (112 kasus), aksepttesten, `verktoyklinisktilgang.test.ts` | Stopper alt som ikke stemmer. |

**Det som allerede er riktig:** en regel er data for motoren, ikke kode; godkjenningen er bundet til innholdet; og alt feiler lukket. Planen bygger videre på dette i stedet for å bytte det ut.

## 3. Hullene

1. **Bare siste versjon av en regel finnes som data.** Historikken har steg for eldre versjoner, med fingeravtrykk, men selve innholdet i for eksempel sertralin → mirtazapin versjon 8 finnes bare i git-historikken. En forskjell mellom to versjoner kan ikke vises uten git, og en godkjent eldre versjon kan ikke tas i bruk igjen.
2. **Innhold og godkjenning skrives sammen.** En kontrollørbeslutning føres inn ved å redigere TypeScript ved siden av regelinnholdet. En endring i en felles byggestein (for eksempel `FORUTSETNINGER_FELLES` eller et NICE-faktum i `bygg.ts`) endrer mange regler på en gang. Fingeravtrykket fanger det, men først som en feil i testene, ikke som en oversiktlig ny versjon.
3. **En kilde har bare én versjon.** Registreres en ny revisjon av en preparatomtale i `KILDER`, endres fingeravtrykket til hver regel som viser til den, og alle godkjenningene faller samtidig, uten at den godkjente versjonen kan stå mens den nye vurderes. Det er trygt, men det er en bieffekt av registeret, ikke en faglig beslutning (B8: en ny kilderevisjon endrer aldri en godkjent regel av seg selv).
4. **Psychiatrienet er den eneste sammenligningskatalogen,** skrevet inn i typen og i `kontroll.ts`. En annen katalog med oppføringer per kombinasjon krever endringer i kontrollkoden.
5. **Motoren og resten av den kliniske kjeden er ikke bundet til godkjenningen.** Fingeravtrykket dekker regelen og kildene, ikke koden som beregner, velger og viser planen. En endring der kan gi en annen plan for en godkjent regel, eller endre hva planen betyr, uten at godkjenningen faller. I dag fanges det av testmatrisen og aksepttesten, men forventningene der kan endres i samme PR som motoren.
6. **Veien for en ny regel er ikke én beskrevet kjede.** P4 og P7 brukte mange runder med kontroll; statusen for hver regel i kjeden må leses ut av notatene.

## 4. Anbefalt arkitektur

Reglene får en egen livssyklus som data i repoet, med fire deler. Motorene og grensesnittet leser dem gjennom én smal grenseflate og endres ikke.

```
kilderegister ──┐
                ├─► regelregister (låste versjoner) ──► regelsettmanifest ──► tilgjengelighet.ts ──► motor + grensesnitt
godkjenningslogg┘                                                                     ▲
overvåking (P12.1/P12.5) ── funn og berørte regler ──► PR med ny versjon             nødstopp (database, bare sperre)
```

### 4.1 Kilderegister med versjoner (P12.3)

`src/data/verktoy/kilderegister.json` erstatter listen i `kilder.ts`, som blir en leser av den. Registeret har to deler, og begge kan bare få tillegg:

- **Kildeversjonene.** Hver kilde-id har en liste med versjoner: kildens egen versjon, hentetidspunkt, kontrollsum og adresse. En registrert versjon endres eller slettes aldri, og den har ikke noe statusfelt.
- **Kildehendelsene** (`src/data/verktoy/kildehendelser.json`). Hver hendelse har kilde, versjon, art (`registrert`, `erstattet`, `trukket`, `gjenopprettet`, `rettighet`), dato, grunn og lenke. Statusen til en kildeversjon (gjeldende, erstattet eller trukket) og kildens **rettighetsklasse** **utledes** av den siste relevante hendelsen; de lagres ikke. Rettighetsklassen er `offentlig_fakta` (fakta med egne ord, høyst `MAKS_FAKTUM` tegn per henvisning) eller `bare_henvisning` (Psychiatrienet: bare id-en til oppføringen).

Når en ny revisjon kommer, legges den til som en ny versjon, sammen med en hendelse som sier at den forrige er erstattet. En tilbaketrekking og en gjenoppretting er nye hendelser, så historikken skrives aldri om. CI stopper en PR som endrer eller sletter en registrert kildeversjon eller en hendelse som finnes på `main`. Kontrollene håndhever rettighetsklassen for hver henvisning, ikke bare for Psychiatrienet.

En regelversjon **fester** kildeversjonene den bygger på (se 4.2). Fingeravtrykket regnes med de festede versjonene i stedet for den gjeldende, med nøyaktig samme formel: `{id, versjon, sha256}`. I dag er de festede og de gjeldende de samme, så ingen fingeravtrykk endres. Når overvåkingen finner en ny revisjon, registreres den som en ny versjon i en PR. De godkjente reglene står uendret, festet til versjonen som ble kontrollert, og overvåkingens `berorte` viser hvilke som må vurderes.

### 4.2 Regelregister: låste regelversjoner (P12.2)

Hver registrerte regelversjon lagres som en fil som aldri endres etter at den er slått sammen: `src/data/verktoy/regler/<regel-id>/v<versjon>.json`. Filen har

- **innholdet**: nøyaktig det fingeravtrykket regnes av (regelen uten `godkjenning`). Regulære uttrykk i regneeksemplene (`Regneeksempel.stopp`) lagres som `{regexp, flagg}`, slik `kanonisk` allerede skriver dem, så innholdet gir samme fingeravtrykk;
- **en konvolutt** utenfor fingeravtrykket: regel-id, versjon, fingeravtrykket, de festede kildeversjonene, regelmodellversjonen, registreringsdato, forrige versjon og en kort endringsgrunn.

TypeScript-byggerne (`pilotsett.ts`, `nedtrapping.ts`, `bygg.ts`) blir **arbeidsbenken** der regler skrives og endres. Et nytt skript, `npm run verktoy:regler -- registrer`, skriver en ny versjonsfil når byggerens innhold har et annet fingeravtrykk enn siste registrerte versjon, og krever da at versjonsnummeret er økt. **Appen og motorene leser bare registeret**, aldri byggerne. En endring i en felles byggestein kan dermed ikke endre en publisert regel; den gir bare et utkast til nye versjoner, som må registreres og kontrolleres hver for seg.

**Innlastingen må være tapsfri.** Ren JSON gir et vanlig objekt der koden venter et `RegExp` (`kontroll.ts` kaller `e.stopp.test(…)`). Leseren (`lesRegelversjon`) gjør derfor tre ting før en regel brukes: den gjenoppbygger `RegExp` fra `{regexp, flagg}`, men bare på de stiene typen har (`eksempler[].stopp`); den validerer filen mot en fast liste over tillatte felt og typer per objekt, som `kildefelt.ts` gjør for P3-dataene, og avviser et ukjent felt eller en feil type; og den regner ut fingeravtrykket av den innlastede regelen og sammenligner det med konvolutten. Feiler noe, lastes ikke regelen, og verktøyet viser den ikke (feiler lukket). Paritetstestene kjører på regler slik de faktisk er lastet inn fra registeret, ikke på byggerne (§8).

Appen importerer bare versjonene manifestet peker på (4.4). De eldre versjonene leses bare av skriptene, testene og rapportene, så de øker ikke størrelsen på appen.

### 4.3 Godkjenningslogg (P12.2)

Godkjenningsstegene flyttes ut av regelkoden til en logg som bare kan få tillegg, én fil per regel for å unngå konflikter mellom parallelle PR-er: `src/data/verktoy/godkjenningslogg/<regel-id>.json`. Hvert steg har regelversjon, fingeravtrykk, status, dato, hvem, rolle, merknad og lenke til kontrollen (PR-kommentaren eller commit-en kontrolløren vurderte). `Regel.godkjenning` settes sammen fra loggen når regelen lastes, med samme type og samme rekkefølge, så `godkjenningsfeil`, `kontrollutfall` og alt som bruker dem, er uendret. Fordi loggen har steg for alle versjonene av regelen, settes godkjenningen sammen **for den versjonen som lastes**: historikken til og med siste steg for den versjonen, uten steg for nyere versjoner. Ellers ville et steg for versjon 2 gjøre at versjon 1 aldri kunne være godkjent igjen, fordi `godkjenningsfeil` ser på siste steg. For dagens regler er det det samme som i dag, siden siste steg gjelder gjeldende versjon. En disposisjon som `leveransen` blir vanlige steg i loggen for hver regel den gjelder.

Avklaringene av OUSFARs egne vurderinger (`grunnlag.avklaring`) er en del av regelinnholdet og fingeravtrykket i dag, og blir der. De flyttes ikke til loggen.

### 4.4 Regelsettmanifest og koblingen til appen

`src/data/verktoy/regelsett.json` sier hvilken versjon av hvilke regler hvert regelsett har (pilotsettet, nedtrappingsreglene og sammenligningssettet), med regelsettets versjon. `REGELSETTENE` i `tilgjengelighet.ts` bygges av manifestet, registeret og loggen i stedet for byggerne. `planvisning.ts` viser kildeversjonen regelen er festet til, ikke den gjeldende. Det er de eneste endringene på appsiden; motorene og komponentene er uendret. Å publisere en ny regelversjon er å endre én linje i manifestet, i en PR. **Å reaktivere en eldre versjon krever et nytt kontrollørsteg** (kontrollørens beslutning, §11). En versjon kan ha blitt erstattet fordi den var feil, så en gammel godkjenning alene gir ikke rett til å ta den i bruk igjen. Når manifestet peker på en versjon som er eldre enn den nyeste registrerte versjonen av regelen, krever CI at det siste steget i hele loggen for regelen (ikke bare i visningen for versjonen) er en klinisk godkjenning fra en uavhengig kontrollør for nøyaktig den versjonen og det fingeravtrykket. Steget skal ha en begrunnelse og si at versjonen er kontrollert mot dagens kildehendelser og dagens kjedeavtrykk (§7). Uten et slikt steg stopper PR-en. At godkjenningen settes sammen per versjon (4.3), er fortsatt riktig: det er det som gjør at reaktiveringssteget gjelder den gamle versjonen.

### 4.5 Hvorfor i repoet og ikke i databasen

Fortolkningsreglene ligger i Supabase med utkast, publisering og revisjoner (`docs/fortolkningsregler.md`, `docs/faginnhold.md`), fordi klinikerne redigerer dem i appen. Verktøyreglene skrives av Claude Code og kontrolleres av en uavhengig kontrollør. Da gir repoet de viktigste garantiene uten ny kode:

| Krav | Repo (anbefalt) | Database |
| --- | --- | --- |
| Kontrolløren ser nøyaktig det som publiseres | Ja, som diff i PR-en | Krever egen visning og eksport |
| Hele kontrollkjeden (kontroll, 112-kasus-matrisen, aksepttest, frosne godkjenninger) kjører på det som publiseres | Ja, i CI før sammenslåing | Må kjøres mot en kopi og kan gå i utakt |
| Ingen kan aktivere en klinisk regel i produksjonen uten kontroll | Ja: bare via sammenslåing | Krever tilgangsregler og kontroll av fingeravtrykk og godkjenning i nettleseren |
| Tilbakeføring | Git og Vercel, i tillegg til nødstoppen | Egen mekanisme |
| Ny versjon uten ny utrulling | Nei (utrullingen er automatisk ved sammenslåing) | Ja |

Ulempen er bare at en ny regelversjon krever en sammenslåing, og det er nettopp kontrollporten. En lesbar kopi i databasen, for eksempel for en adminvisning av historikken, kan legges til senere, men aldri som det reglene leses fra.

## 5. Sammenligningskataloger og kildeskifte (P12.3)

En ny modul `src/verktoy/regler/kataloger.ts` definerer en **sammenligningskatalog**: en samling eksterne anbefalinger per kombinasjon som OUSFAR bare viser til. Hver katalog har en id, en rettighetsklasse (alltid `bare_henvisning` til noe annet er avklart) og en funksjon som slår opp en oppføring og gir type (seponering, bytte, tillegg), retning, virkestoffer og formulering, uten innhold. Psychiatrienet blir den første katalogen, som en tynn innpakning rundt det som finnes (`kildegrunnlag` over P3-arkivet). `kontroll.ts` slår opp katalogen etter `h.kilde` i stedet for å lese P3-arkivet direkte.

Formen på henvisningen er allerede generell (`{kilde, kildeoppforing}`), så dataene i reglene endres ikke, og fingeravtrykkene står. Å **legge til** en katalog er en ny innpakning, et nytt arkiv og en rettighetsvurdering, uten endringer i motorene eller grensesnittet. Å **erstatte** Psychiatrienet i en regel er en ny regelversjon uten referansen eller med en annen. Den får nytt fingeravtrykk og må kontrolleres, men versjonsdiffen (trinn 4) viser at bare referansen er endret.

Grunnlagskilder (preparatomtaler, retningslinjer, litteratur) er allerede generelle `Kilde`-oppføringer. En ny kildetype, for eksempel en nasjonal retningslinje, er en ny verdi i `Kildetype` og en ny oppføring i kilderegisteret; grensesnittet viser tittel, utgiver, adresse og versjon som før.

**Funn fra overvåkingen sperrer ikke av seg selv** (kontrollørens beslutning, §11). En endret kontrollsum er ikke en klinisk konklusjon. PR #291 viste for eksempel to nettsider med endret kontrollsum som ikke lot seg gjenskape, uten påvist endring i innholdet. En automatisk sperre ville reagert på falske alarmer og blitt en annen klinisk bryter enn nødstoppen. Et funn som krever vurdering, behandles derfor slik:

1. **Varsling til en navngitt ansvarlig.** Ansvarlig mottaker er bidragsyteren som faglig ansvarlig og administrator (Peder, GitHub `peohol`). Han setter nødstoppen og legger saken fram for kontrolløren; han skal ikke gjøre den tekniske vurderingen selv. En sak på GitHub aktiverer ikke Claude av seg selv, så koblingen er uttrykkelig (P12.1, `docs/verktøy-p12-overvaking.md`):
   - **Saken tildeles den ansvarlige.** Overvåkingen åpner eller oppdaterer én sak med merket «kildeovervaking» og tildeler den til den ansvarlige. Da varsler GitHub ham på e-post og i varslene sine. Den ansvarlige står i én konfigurasjonsverdi i arbeidsflyten, ikke i koden.
   - **Den ansvarlige ber Claude om den tekniske vurderingen** i prosjektet når en sak kommer. Claude vurderer om endringen kan gjenskapes, hvilken del av kilden den gjelder, og hvilke godkjente regler som bygger på akkurat den delen, og skriver det i saken som en kommentar med en fast første linje («Teknisk vurdering:»). Det er ingen planlagt Claude-rutine som leser sakene: kildene endres sjelden, og bidragsyteren har bestemt at en daglig rutine er unødvendig ofte (31.10.2026).

   Koblingen **kontrolleres** med en syntetisk prøvesak (merket «kildeovervaking-prove», startet for hånd etter at P12.1 er slått sammen) før P12.1 regnes som ferdig: prøvesaken har høy prioritet, og den skal være tildelt den ansvarlige og ha fått en «Teknisk vurdering:» innen 24 timer, så vakten ikke merker den da. Det skrives ingen «Faglig beslutning:», så vakten skal merke den «kildeovervaking-ubehandlet» etter 72 timer. Da er både varslingen og eskaleringen prøvd i samme sak. Resultatet føres inn i fremdriftsloggen, og prøvesaken lukkes etterpå.
2. **Ubehandlede funn eskaleres.** Overvåkingens arbeidsflyt har en daglig vaktjobb uten Claude og uten hemmeligheter (P12.1, PR #291). Den gjør ingenting når ingen sak er åpen. Ellers merker den en sak «kildeovervaking-ubehandlet» og nevner den ansvarlige når det har gått 24 timer uten en kommentar som begynner med «Teknisk vurdering:», eller 72 timer for en sak med høy prioritet (merket «kildeovervaking-hoy») uten en som begynner med «Faglig beslutning:». Tiden regnes fra siste endring av funnet, og bare kommentarer fra brukere med tilgang til repoet teller. Påminnelsen fra vakten er dermed det som sikrer at et funn ikke blir liggende; den gjentas ikke av en egen rutine. Fristene er prosessfrister, ikke kliniske verdier.
3. **Prioritet.** Høyest prioritet har det som kan være en reell sikkerhetsrisiko: en kilde eller et preparat som er trukket, en sikkerhetsmelding fra DMP eller EMA, en styrke eller form i et godkjent klinisk omfang som er fjernet eller endret, eller en endret anbefaling i kildedelen regelen viser til. Det legges fram for kontrolløren og bidragsyteren med en gang. En endret kontrollsum uten påvist innholdsendring, eller en kilde som ikke svarer, vurderes i vanlig rekkefølge.
4. **Nødstopp.** Er risikoen bekreftet eller troverdig og alvorlig, setter en administrator nødstoppen for de berørte reglene straks, mens det undersøkes (`docs/verktøy-p11-publisering.md` §5.2). Nødstoppen er fortsatt den eneste kliniske bryteren.
5. **Avslutning.** Saken lukkes først med en dokumentert konklusjon: ingen klinisk endring (kildeversjonen registreres, og reglene står), eller et kildeskifte som under.

**Kildeskifte steg for steg:** den nye kildeversjonen registreres → Claude lager nye regelversjoner festet til den, med tolkningen oppdatert der kilden faktisk sier noe annet → testene → kontrollen → manifestet peker på de nye versjonene. Inntil da står de godkjente versjonene festet til kilden som ble kontrollert, med mindre nødstoppen er satt.

## 6. Kjeden for en regelversjon (P12.4)

| Steg | Hva | Hvem | Kontroll |
| --- | --- | --- | --- |
| 1. Import | Kilden registreres i kilderegisteret med versjon, kontrollsum og rettighetsklasse; fra overvåkingen eller en ny henting | Claude | Rettighetsklassen; for `bare_henvisning` ingen tekst (`kildefelt.ts`) |
| 2. Tolkning | Regelen skrives eller endres i arbeidsbenken: kildetro utsagn, OUSFARs tilpasninger, forutsetninger og usikkerhet; egne valg som åpne forslag | Claude | `kontrollerRegelsett` |
| 3. Registrering | `verktoy:regler -- registrer` gir ny versjonsfil og logg-stegene utkast og til faglig kontroll; `-- diff <regel>` gir en lesbar forskjell mot forrige versjon til PR-en | Claude | Versjonen er økt; fingeravtrykket stemmer med filen |
| 4. Tester | Regneeksempler, ende-til-ende med lagret FEST, kasus i testmatrisen (positive og negative) og aksepttest | Claude | `npm test`, `npm run build`, `verktoy:regler -- kontroll` |
| 5. Uavhengig kontroll | Kontrolløren vurderer den eksakte versjonen og fingeravtrykket i PR-en; beslutningen føres inn som steg i loggen med lenke | ChatGPT; Claude fører inn | Steget gjelder registrert versjon og fingeravtrykk; rollen er ikke utvikler |
| 6. Publisering | Manifestet peker på versjonen; Peder slår sammen; Vercel publiserer | Peder | Hele CI-kjeden; nødstoppen kan sperre straks |
| 7. Trekking og reaktivering | Logg-steg `trukket`, og eventuelt manifestet tilbake til en eldre versjon med et nytt kontrollørsteg (4.4) | Kontrollør eller Peder; Claude fører inn | Som over; ved akutt feil settes nødstoppen først |

`verktoy:regler -- status` skal vise hvor hver regel står i kjeden og hva som mangler.

**Nye kontroller i CI:**

- En registrert versjonsfil og et logg-steg som finnes på `main`, endres eller slettes aldri (samme mønster som migrasjonshistorikken i `docs/migrasjoner.md`).
- Fingeravtrykket regnet av hver versjonsfil er lik det konvolutten oppgir.
- Byggerens innhold for en regel er likt siste registrerte versjon, eller versjonen er økt og registrert (ingen uregistrert endring).
- Et steg med rolle `uavhengig_kontrollor` gjelder en registrert versjon og har dens fingeravtrykk og en lenke til kontrollen.
- Manifestet peker bare på registrerte versjoner, og en versjon som er eldre enn den nyeste registrerte, bare med et reaktiveringssteg som beskrevet i 4.4.
- Kildeversjonene og kildehendelsene på `main` endres eller slettes aldri (4.1).
- Hver regel lastet fra registeret har gyldige felt og typer, og fingeravtrykket av den innlastede regelen er likt det konvolutten oppgir (4.2).

Hvem som faktisk skrev et kontrollørsteg, kan ikke bevises teknisk, verken i dag eller med denne planen. Vernet er det samme som nå: steget må ha lenke til kontrollørens kommentar, CI kontrollerer innholdet, og Peder slår sammen.

## 7. Den kliniske kjeden holdes uavhengig av godkjenningen

Det er ikke nok å binde godkjenningen til `MOTORVERSJON` og `PLANMOTORVERSJON` (kontrollørens gjennomgang av `a090786`, §11). Klinisk resultat og betydningen av det som vises, avhenger også av hjelpefunksjoner motorene importerer (for eksempel `forslagsverdi` i `regler/modell.ts`), og av koden som velger, tilrettelegger og viser planen: `doseplan.ts`, `festformuleringer.ts`, `tilgjengelighet.ts`, `planvisning.ts`, `sperrer.ts` og komponentene i `src/components/verktoy/`. Et endelig antall testkasus kan heller ikke være garantien. Hull 5 lukkes derfor slik:

1. **Den kliniske kjeden er en avgrenset, automatisk beregnet mengde filer.** Den består av inngangene (`kliniskDoseplan` i `motor/plan.ts`, `beregn` i `regler/beregning.ts`, `doseplan.ts`, `tilgjengelighet.ts`, `planvisning.ts`, `sperrer.ts` og verktøykomponentene) og alt de importerer, beregnet fra importgrafen i repoet. Kjeden følger også importer av npm-pakker, med versjonen fra låsefila. Testene, rapportene og regeldataene er ikke med; reglene har sitt eget fingeravtrykk. En test krever at listen er lik grafen, slik `src/faginnhold/migrasjonsavhengigheter.ts` gjør for migrasjonene. En ny fil som kjeden importerer, kommer dermed med av seg selv.

   **Visningen er også med, ikke bare koden verktøyene importerer.** I Vite gjelder et stilark for hele siden uansett hvilken fil som importerer det. Mange stilark lastes globalt fra `src/main.tsx` (blant andre `tokens.css`, `base.css` og `skjema.css`, og skriftene fra `@fontsource-variable`), og importeres ikke av noen av inngangene. En endring der kan skjule eller endre en advarsel i planen. Kjeden har derfor også med:
   - **Alle stilark og skrifter appen laster**, uansett hvem som importerer dem: hver `.css`-fil som importeres fra `src/` eller fra en npm-pakke, beregnet fra importgrafen fra `src/main.tsx`, og `index.html`.
   - **Veien fra appens inngang til verktøysiden**: filene på importstien fra `src/main.tsx` via `App.tsx` til `Verktoyside.tsx`, og rammen som omgir siden (toppmeny, sidemeny og innloggingsporten), men ikke resten av appen.

   En test kontrollerer at hver stilarkimport i grafen fra `src/main.tsx` og hver CSS-fil i det ferdige bygget (Vite-manifestet) finnes i kjeden. En ny eller endret global import blir dermed fanget. Resten av appen (fortolkningen, fagsidene og så videre) er ikke med, bortsett fra stilarkene. En endring i et hvilket som helst stilark krever derfor et nytt kontrollørsteg. Ønskes det mindre, kan verktøyvisningen senere isoleres fra de globale stilene, og kjeden snevres inn, men bare med en egen kontroll.
2. **Kjedeavtrykket** er SHA-256 av de sorterte parene (sti, SHA-256 av innholdet) for hver fil i kjeden, og av pakkeversjonene. Det regnes ut ved bygging og ligger i appen som en konstant. CI regner det ut på nytt.
3. **Godkjenningen bindes til kjedeavtrykket.** Hvert kontrollørsteg registrerer kjedeavtrykket kontrolløren kontrollerte, og motorversjonene til orientering. En godkjent regel gir klinisk resultat bare når appens kjedeavtrykk er likt det i regelens siste kontrollørsteg. Alt annet feiler lukket, uten unntak for små endringer eller endringer i ordlyd. Enhver endring i kjeden krever derfor et nytt uavhengig kontrollørsteg for hver godkjent regel. Steget registreres i samme PR, etter kontrollen og før sammenslåing. Mangler det, gir de godkjente reglene ingen plan etter utrullingen. CI sier fra om det i PR-en, så det ikke blir en overraskelse.
4. **Resultatavtrykket er bare et hjelpemiddel.** Det er SHA-256 av utfallene regelen gir i sine kasus i testmatrisen og aksepttesten (radene i planen, eller stoppgrunnene), og det registreres med steget. Er avtrykket uendret, viser det kontrolløren at kasusene gir det samme, slik at kontrollen kan konsentrere seg om diffen i kjeden. Er det endret, viser CI hvilke kasus og regler som gir noe annet. Avtrykket erstatter aldri kontrollørsteget.

Det gjør reglene og den kliniske kjeden uavhengige: reglene kan endres uten å røre kjeden, og kjeden kan forbedres, men en godkjent regel gir aldri klinisk resultat med kode kontrolløren ikke har sett.

## 8. Dagens godkjenninger og fingeravtrykk

Omleggingen er bare en endring av hvor reglene står, ikke av hva de er. For hvert trinn som flytter data, kreves det før sammenslåing:

- fingeravtrykket regnet av registeret er likt det byggeren gir, for alle 32 reglene;
- reglene slik de faktisk er lastet inn fra registeret er like byggerens, også `RegExp` i regneeksemplene, og `kontrollerRegelsett`, regneeksemplene, testmatrisen, aksepttesten og `verktoyklinisktilgang.test.ts` kjører på de innlastede reglene og gir samme resultat;
- de seks godkjente og de 24 kontrollerte reglene har uendret versjon og fingeravtrykk (`verktoyklinisktilgang.test.ts` endres ikke);
- `Regel.godkjenning` satt sammen fra loggen er lik den som bygges i dag, steg for steg;
- de genererte rapportene (`docs/verktøy-p4-pilotsett.md`, `docs/verktøy-p7-regelutkast.md`, `docs/verktøy-p7-aksepttest.md`, `docs/verktøy-p11-testmatrise.md`) blir byte for byte like;
- alle 112 kasus i testmatrisen gir samme utfall.

Avviker noe av dette, stoppes trinnet; ingenting rettes ved å endre en forventning.

## 9. Trinnvis plan

Hvert trinn er en egen, avgrenset PR som kan føres tilbake, med `npm test`, `npm run build` og `npm run verktoy:regler -- kontroll` grønne. Trinn 1–3 endrer ingen klinisk atferd og har ingen migrasjon.

| Trinn | Innhold | Akseptkriterier | Risiko og tilbakeføring |
| --- | --- | --- | --- |
| **0** (dette notatet) | Arkitektur og plan | Vurdert av kontrolløren; spørsmålene i §10 besvart eller utsatt | Ingen |
| **1** Kilderegister | `kilderegister.json` med én versjon per kilde (dagens) og `kildehendelser.json` med én `registrert`- og én `rettighet`-hendelse per kilde; status og rettighetsklasse utledes; CI-kontrollen av at begge bare får tillegg; `kilder.ts` leser det; `fingeravtrykk` tar de festede versjonene som argument, med samme formel; overvåkingens `overvaking/kilder.ts` leser samme register | Alle fingeravtrykk uendret (§8); overvåkingens grunnlag uendret | Lav. Revert av PR-en |
| **2** Godkjenningslogg | Stegene flyttes til `godkjenningslogg/`; `Regel.godkjenning` settes sammen; disposisjonene blir logg-steg; CI-kontrollen av at loggen bare får tillegg | §8; `disposisjonsfeil` tom; samme rapporter | Middels (mye data flyttes). Ekvivalenstestene stopper avvik |
| **3** Regelregister og manifest | Versjonsfil for hver av dagens 32 regelversjoner; `lesRegelversjon` med typegjenoppbygging og feltkontroll; `regelsett.json`; `tilgjengelighet.ts` leser registeret; `-- registrer`; CI-kontrollene i §6, også reaktiveringsporten | §8, med paritetstestene på innlastede regler; appen gir samme planer i matrisen; byggerne importeres ikke av appen | Middels. Revert gir dagens bygging tilbake; ingen data i produksjonen berøres |
| **4** Versjonsforskjell og historikk | `-- diff`, `-- status` og en generert historikk per regel (versjoner, fingeravtrykk, kildeversjoner, steg) | Diffen viser parametre, betingelser, kilder og eksempler med sti; rapporten er oppdatert (test) | Lav |
| **5** Sammenligningskataloger | `kataloger.ts`, Psychiatrienet som første katalog, `kontroll.ts` via katalogen; rettighetsklassen håndheves for alle kilder | Fingeravtrykk uendret; en syntetisk katalog bare i testene kan brukes av en syntetisk regel uten endring i motor eller grensesnitt; tekst i en `bare_henvisning`-kilde stopper | Lav |
| **6** Kjedebinding | Kjeden fra importgrafen med test, også alle stilark og skrifter og veien fra `src/main.tsx` til verktøysiden; kjedeavtrykket i appen og i CI, kjedeavtrykk og resultatavtrykk i hvert kontrollørsteg; en godkjent regel gir klinisk resultat bare med kjedeavtrykket i sitt siste kontrollørsteg (§7) | En endring i en hvilken som helst fil i kjeden, også en hjelpefunksjon eller visningskode, gir ingen plan for de godkjente reglene før et nytt kontrollørsteg; en ny fil kjeden importerer, kommer med i listen av seg selv; et endret utfall vises per kasus | Middels. Kjedeavtrykket for dagens seks godkjenninger må registreres av kontrolløren som en teknisk registrering, ikke en ny godkjenning, i samme PR |
| **7** Kildeskifte i praksis | Første reelle kildeskifte (det første funnet fra overvåkingen som krever vurdering) gjennomføres etter §5, som prøve av hele kjeden | Ny kildeversjon registrert; berørte regler i ny versjon, kontrollert og publisert; de gamle versjonene og godkjenningene står i historikken | Klinisk; kontrolløren sperrer etter behov |

Rekkefølgen er valgt slik at hvert trinn kan stå alene: trinn 1 og 5 kan gjøres uten 2–3, og 2 uten 3. Trinn 3 forutsetter 1 og 2, og trinn 6 forutsetter 2. Beslutningen om funn fra overvåkingen (§5) er tatt før trinn 1 og 6, slik kontrolløren krevde.

## 10. Spørsmålene til kontrolløren, besvart

Kontrollørens svar i gjennomgangen av `a090786` (§11). Bidragsyteren kan overstyre dem.

1. **Skal en godkjent regel sperres av seg selv ved et funn fra overvåkingen?** Nei. Funnet går raskt til en ansvarlig menneskelig vurdering, med varsling og oppfølging, og ved en bekreftet eller troverdig alvorlig risiko settes nødstoppen straks (§5). Planens første anbefaling (automatisk sperre) er forkastet.
2. **Krever reaktivering av en eldre, godkjent versjon et nytt kontrollørsteg?** Ja, for nøyaktig den versjonen og det fingeravtrykket, med begrunnelse og kontroll mot dagens kilder og kjede, og med en egen CI-kontroll (4.4).
3. **Skal en endring bare i sammenligningsreferansene få full kontroll?** Den gir alltid ny regelversjon og en uavhengig kontroll. Er beregningsinnholdet dokumentert identisk med versjonsdiffen, kan kontrollen være en målrettet kontroll av kilden og henvisningen.
4. **Skal eldre regelversjoner hentes inn fra git-historikken?** Ikke som klinisk aktive versjoner. Historikken begynner med dagens versjoner, og eldre versjoner vises med lenke til commit-en der de står.
5. **Skal registeret speiles i databasen?** Ikke nå.

## 11. Rettet etter kontrollen

| Gjennomgang | Funn | Rettelse |
| --- | --- | --- |
| Codex, `4d32d38` | En tilbakeføring i manifestet ville ikke virket, fordi `godkjenningsfeil` ser på siste steg i hele loggen | Godkjenningen settes sammen per versjon (4.3) |
| Codex, `4d32d38` | Et resultatavtrykk av et endelig antall kasus garanterer ikke at en plan er uendret | Godkjenningen bindes til koden, ikke til kasusene (§7) |
| Kontrolløren (ChatGPT), `a090786`, punkt 1 | Motorversjonene dekker ikke hjelpefunksjoner eller koden som velger og viser planen | Kjeden beregnes fra importgrafen, og godkjenningen bindes til kjedeavtrykket (§7, trinn 6) |
| Samme, punkt 2 | Automatisk sperre på funn er sårbar for falske alarmer og en ny klinisk bryter | Ingen automatisk sperre; varsling, prioritet, nødstopp ved alvorlig risiko og dokumentert avslutning (§5, §10.1) |
| Samme, punkt 3 | En gammel godkjenning gir ikke rett til reaktivering | Nytt kontrollørsteg for versjonen og CI-kontroll (4.4, §6, §10.2) |
| Samme, punkt 4 | Et statusfelt i kildeversjonene strider mot at de bare får tillegg | Status og rettighetsklasse utledes av en egen hendelseslogg som bare får tillegg; CI stopper endringer (4.1) |
| Samme, punkt 5 | `RegExp` overlever ikke JSON | Typene bygges opp igjen og valideres ved innlasting; paritetstestene kjører på innlastede regler (4.2, §8) |
| Kontrolløren (ChatGPT), `177e1de`, punkt 1 | Varslingen om kildefunn hadde ingen påviselig mottaker; en GitHub-sak aktiverer ikke Claude | Navngitt ansvarlig, tildeling av saken, prøvesak før P12.1 er ferdig og eskalering av ubehandlede funn med en daglig vakt (§5 punkt 1–2). Den daglige Claude-rutinen som først var foreslått, er tatt ut etter bidragsyterens beslutning 31.10.2026; den ansvarlige ber i stedet om den tekniske vurderingen |
| Samme, punkt 2 | Kjedeavtrykket utelot globale stilark fra `src/main.tsx` | Alle stilark og skrifter, `index.html` og veien til verktøysiden er med; test mot importgrafen og Vite-manifestet (§7, trinn 6) |
