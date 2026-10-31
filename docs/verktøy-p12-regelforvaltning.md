# OUSFAR Verktøy – P12.2–P12.4: forvaltning av kliniske regler

**Status 31.10.2026:** arkitektur og trinnvis plan, til vurdering (arbeidspakke C). Ingen kode, regel, regelversjon, godkjenning eller fingeravtrykk er endret. Planen gjelder P12.2–P12.4 i `docs/verktøy-utviklingsplan.md` og bygger på overvåkingen av kilder og FEST i P12.1/P12.5 (`src/verktoy/overvaking/`), som lages i en egen PR. Ingen omlegging gjøres før planen er vurdert av den uavhengige kontrolløren (ChatGPT) og bidragsyteren.

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
5. **Motoren er ikke bundet til godkjenningen.** Fingeravtrykket dekker regelen og kildene, ikke motorversjonen. En endring i motoren kan gi en annen plan for en godkjent regel uten at godkjenningen faller. I dag fanges det av testmatrisen og aksepttesten, men forventningene der kan endres i samme PR som motoren.
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

`src/data/verktoy/kilderegister.json` erstatter listen i `kilder.ts`, som blir en leser av den. Hver kilde-id har en liste med versjoner som bare kan få tillegg: kildens egen versjon, hentetidspunkt, kontrollsum, adresse og status (`gjeldende`, `erstattet`, `trukket`). Hver kilde får en **rettighetsklasse**: `offentlig_fakta` (fakta med egne ord, høyst `MAKS_FAKTUM` tegn per henvisning) eller `bare_henvisning` (Psychiatrienet: bare id-en til oppføringen). Kontrollene håndhever klassen for hver henvisning, ikke bare for Psychiatrienet.

En regelversjon **fester** kildeversjonene den bygger på (se 4.2). Fingeravtrykket regnes med de festede versjonene i stedet for den gjeldende, med nøyaktig samme formel: `{id, versjon, sha256}`. I dag er de festede og de gjeldende de samme, så ingen fingeravtrykk endres. Når overvåkingen finner en ny revisjon, registreres den som en ny versjon i en PR. De godkjente reglene står uendret, festet til versjonen som ble kontrollert, og overvåkingens `berorte` viser hvilke som må vurderes.

### 4.2 Regelregister: låste regelversjoner (P12.2)

Hver registrerte regelversjon lagres som en fil som aldri endres etter at den er slått sammen: `src/data/verktoy/regler/<regel-id>/v<versjon>.json`. Filen har

- **innholdet**: nøyaktig det fingeravtrykket regnes av (regelen uten `godkjenning`). Regulære uttrykk i regneeksemplene lagres som `{regexp, flagg}`, slik `kanonisk` allerede skriver dem, så innholdet gir samme fingeravtrykk;
- **en konvolutt** utenfor fingeravtrykket: regel-id, versjon, fingeravtrykket, de festede kildeversjonene, regelmodellversjonen, registreringsdato, forrige versjon og en kort endringsgrunn.

TypeScript-byggerne (`pilotsett.ts`, `nedtrapping.ts`, `bygg.ts`) blir **arbeidsbenken** der regler skrives og endres. Et nytt skript, `npm run verktoy:regler -- registrer`, skriver en ny versjonsfil når byggerens innhold har et annet fingeravtrykk enn siste registrerte versjon, og krever da at versjonsnummeret er økt. **Appen og motorene leser bare registeret**, aldri byggerne. En endring i en felles byggestein kan dermed ikke endre en publisert regel; den gir bare et utkast til nye versjoner, som må registreres og kontrolleres hver for seg.

Appen importerer bare versjonene manifestet peker på (4.4). De eldre versjonene leses bare av skriptene, testene og rapportene, så de øker ikke størrelsen på appen.

### 4.3 Godkjenningslogg (P12.2)

Godkjenningsstegene flyttes ut av regelkoden til en logg som bare kan få tillegg, én fil per regel for å unngå konflikter mellom parallelle PR-er: `src/data/verktoy/godkjenningslogg/<regel-id>.json`. Hvert steg har regelversjon, fingeravtrykk, status, dato, hvem, rolle, merknad og lenke til kontrollen (PR-kommentaren eller commit-en kontrolløren vurderte). `Regel.godkjenning` settes sammen fra loggen når regelen lastes, med samme type og samme rekkefølge, så `godkjenningsfeil`, `kontrollutfall` og alt som bruker dem, er uendret. Fordi loggen har steg for alle versjonene av regelen, settes godkjenningen sammen **for den versjonen som lastes**: historikken til og med siste steg for den versjonen, uten steg for nyere versjoner. Ellers ville et steg for versjon 2 gjøre at versjon 1 aldri kunne være godkjent igjen, fordi `godkjenningsfeil` ser på siste steg. For dagens regler er det det samme som i dag, siden siste steg gjelder gjeldende versjon. En disposisjon som `leveransen` blir vanlige steg i loggen for hver regel den gjelder.

Avklaringene av OUSFARs egne vurderinger (`grunnlag.avklaring`) er en del av regelinnholdet og fingeravtrykket i dag, og blir der. De flyttes ikke til loggen.

### 4.4 Regelsettmanifest og koblingen til appen

`src/data/verktoy/regelsett.json` sier hvilken versjon av hvilke regler hvert regelsett har (pilotsettet, nedtrappingsreglene og sammenligningssettet), med regelsettets versjon. `REGELSETTENE` i `tilgjengelighet.ts` bygges av manifestet, registeret og loggen i stedet for byggerne. `planvisning.ts` viser kildeversjonen regelen er festet til, ikke den gjeldende. Det er de eneste endringene på appsiden; motorene og komponentene er uendret. Å publisere en ny regelversjon er å endre én linje i manifestet, i en PR. Å føre tilbake til en tidligere godkjent versjon er det samme, fordi den versjonen og godkjenningen av den fortsatt finnes og godkjenningen settes sammen for den versjonen (4.3); om det i tillegg skal kreves et nytt kontrollørsteg, er spørsmål 2 i §10.

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

**Kildeskifte steg for steg:** overvåkingen melder et funn (krever vurdering) med de berørte reglene → den nye kildeversjonen registreres → Claude lager nye regelversjoner festet til den, med tolkningen oppdatert der kilden faktisk sier noe annet → testene → kontrollen → manifestet peker på de nye versjonene. Inntil da står de godkjente versjonene festet til kilden som ble kontrollert.

## 6. Kjeden for en regelversjon (P12.4)

| Steg | Hva | Hvem | Kontroll |
| --- | --- | --- | --- |
| 1. Import | Kilden registreres i kilderegisteret med versjon, kontrollsum og rettighetsklasse; fra overvåkingen eller en ny henting | Claude | Rettighetsklassen; for `bare_henvisning` ingen tekst (`kildefelt.ts`) |
| 2. Tolkning | Regelen skrives eller endres i arbeidsbenken: kildetro utsagn, OUSFARs tilpasninger, forutsetninger og usikkerhet; egne valg som åpne forslag | Claude | `kontrollerRegelsett` |
| 3. Registrering | `verktoy:regler -- registrer` gir ny versjonsfil og logg-stegene utkast og til faglig kontroll; `-- diff <regel>` gir en lesbar forskjell mot forrige versjon til PR-en | Claude | Versjonen er økt; fingeravtrykket stemmer med filen |
| 4. Tester | Regneeksempler, ende-til-ende med lagret FEST, kasus i testmatrisen (positive og negative) og aksepttest | Claude | `npm test`, `npm run build`, `verktoy:regler -- kontroll` |
| 5. Uavhengig kontroll | Kontrolløren vurderer den eksakte versjonen og fingeravtrykket i PR-en; beslutningen føres inn som steg i loggen med lenke | ChatGPT; Claude fører inn | Steget gjelder registrert versjon og fingeravtrykk; rollen er ikke utvikler |
| 6. Publisering | Manifestet peker på versjonen; Peder slår sammen; Vercel publiserer | Peder | Hele CI-kjeden; nødstoppen kan sperre straks |
| 7. Trekking | Logg-steg `trukket` eller manifestet tilbake til forrige godkjente versjon | Kontrollør eller Peder; Claude fører inn | Som over |

`verktoy:regler -- status` skal vise hvor hver regel står i kjeden og hva som mangler.

**Nye kontroller i CI:**

- En registrert versjonsfil og et logg-steg som finnes på `main`, endres eller slettes aldri (samme mønster som migrasjonshistorikken i `docs/migrasjoner.md`).
- Fingeravtrykket regnet av hver versjonsfil er lik det konvolutten oppgir.
- Byggerens innhold for en regel er likt siste registrerte versjon, eller versjonen er økt og registrert (ingen uregistrert endring).
- Et steg med rolle `uavhengig_kontrollor` gjelder en registrert versjon og har dens fingeravtrykk og en lenke til kontrollen.
- Manifestet peker bare på registrerte versjoner.

Hvem som faktisk skrev et kontrollørsteg, kan ikke bevises teknisk, verken i dag eller med denne planen. Vernet er det samme som nå: steget må ha lenke til kontrollørens kommentar, CI kontrollerer innholdet, og Peder slår sammen.

## 7. Motoren holdes uavhengig av godkjenningen

Hull 5 lukkes i to deler:

1. **Godkjenningen bindes til motorversjonene.** Et godkjenningssteg registrerer `MOTORVERSJON` og `PLANMOTORVERSJON` kontrolløren så. CI krever at versjonen økes når koden i motorene endres, og en godkjent regel er bare klinisk tilgjengelig med motorversjonene i sitt siste kontrollørsteg. En ny motorversjon krever derfor et nytt kontrollørsteg for hver godkjent regel. Dette er garantien: testkasusene er et utvalg og dekker ikke hver mulig inndata i det kliniske omfanget (for eksempel hver startdato), så et uendret utfall i kasusene alene kan ikke bevise at ingen plan er endret.
2. **Et resultatavtrykk gjør den nye kontrollen rask.** Avtrykket er SHA-256 av utfallene regelen gir i sine kasus i testmatrisen og aksepttesten (radene i planen, eller stoppgrunnene), registrert med steget. Er avtrykket uendret med den nye motoren, kan kontrolløren bekrefte motorversjonen som en teknisk kontroll; er det endret, viser CI hvilke kasus og regler som gir andre planer, og steget krever en faglig vurdering. Forventningene kan ikke endres i samme PR uten et nytt kontrollørsteg.

Det gjør motoren og reglene uavhengige: reglene kan endres uten å røre motoren, og motoren kan forbedres uten at en godkjent regel noen gang beregnes med en motorversjon kontrolløren ikke har sett.

## 8. Dagens godkjenninger og fingeravtrykk

Omleggingen er bare en endring av hvor reglene står, ikke av hva de er. For hvert trinn som flytter data, kreves det før sammenslåing:

- fingeravtrykket regnet av registeret er likt det byggeren gir, for alle 32 reglene;
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
| **1** Kilderegister | `kilderegister.json` med én versjon per kilde (dagens), rettighetsklasse og status; `kilder.ts` leser det; `fingeravtrykk` tar de festede versjonene som argument, med samme formel; overvåkingens `overvaking/kilder.ts` leser samme register | Alle fingeravtrykk uendret (§8); overvåkingens grunnlag uendret | Lav. Revert av PR-en |
| **2** Godkjenningslogg | Stegene flyttes til `godkjenningslogg/`; `Regel.godkjenning` settes sammen; disposisjonene blir logg-steg; CI-kontrollen av at loggen bare får tillegg | §8; `disposisjonsfeil` tom; samme rapporter | Middels (mye data flyttes). Ekvivalenstestene stopper avvik |
| **3** Regelregister og manifest | Versjonsfil for hver av dagens 32 regelversjoner; `regelsett.json`; `tilgjengelighet.ts` leser registeret; `-- registrer`; CI-kontrollene i §6 | §8; appen gir samme planer i matrisen; byggerne importeres ikke av appen | Middels. Revert gir dagens bygging tilbake; ingen data i produksjonen berøres |
| **4** Versjonsforskjell og historikk | `-- diff`, `-- status` og en generert historikk per regel (versjoner, fingeravtrykk, kildeversjoner, steg) | Diffen viser parametre, betingelser, kilder og eksempler med sti; rapporten er oppdatert (test) | Lav |
| **5** Sammenligningskataloger | `kataloger.ts`, Psychiatrienet som første katalog, `kontroll.ts` via katalogen; rettighetsklassen håndheves for alle kilder | Fingeravtrykk uendret; en syntetisk katalog bare i testene kan brukes av en syntetisk regel uten endring i motor eller grensesnitt; tekst i en `bare_henvisning`-kilde stopper | Lav |
| **6** Motorbinding og resultatavtrykk | Motorversjonene og avtrykket i hvert kontrollørsteg; CI krever økt versjon ved endret motorkode; en godkjent regel er bare tilgjengelig med motorversjonene i sitt siste kontrollørsteg (§7) | En motorendring uten nytt kontrollørsteg gir ingen plan for de godkjente reglene; med uendret avtrykk kan steget være en teknisk bekreftelse; et endret utfall vises per kasus | Middels. Motorversjonene og avtrykkene for dagens seks godkjenninger må bekreftes av kontrolløren som en teknisk registrering, ikke en ny godkjenning |
| **7** Kildeskifte i praksis | Første reelle kildeskifte (det første funnet fra overvåkingen som krever vurdering) gjennomføres etter §5, som prøve av hele kjeden | Ny kildeversjon registrert; berørte regler i ny versjon, kontrollert og publisert; de gamle versjonene og godkjenningene står i historikken | Klinisk; kontrolløren sperrer etter behov |

Rekkefølgen er valgt slik at hvert trinn kan stå alene: trinn 1 og 5 kan gjøres uten 2–3, og 2 uten 3. Trinn 3 forutsetter 1 og 2.

## 10. Spørsmål til kontrolløren og bidragsyteren

1. **Skal en godkjent regel sperres av seg selv når en kilde den er festet til, er fjernet eller har et funn som krever vurdering?** I dag er den tilgjengelig til noen setter en sperre. Anbefaling: ja, regelen gir ingen plan før kontrolløren har registrert et steg (feiler lukket), men bare når funnet gjelder en kilde regelen faktisk er festet til. Det gir færre planer i en periode, så det er en klinisk avveining.
2. **Krever tilbakeføring til en eldre, godkjent versjon et nytt kontrollørsteg?** Anbefaling: ja, et kort steg med begrunnelse, fordi den nyere versjonen kan ha rettet noe.
3. **Skal en endring bare i sammenligningsreferansene få full kontroll?** Anbefaling: ja, som ny versjon, med diffen som viser at bare referansen er endret.
4. **Skal eldre regelversjoner hentes inn fra git-historikken?** Anbefaling: nei for klinisk bruk; historikken begynner med dagens versjoner, og eldre versjoner vises med lenke til commit-en der de står.
5. **Skal registeret speiles i databasen for en adminvisning?** Anbefaling: ikke nå; vurderes etter trinn 4.
