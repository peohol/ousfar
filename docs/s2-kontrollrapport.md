# Kontrollrapport før startporten S2

**Status:** kontrollrapport, 15.11.2026. **S2 er ikke passert og ikke
aktivert.** Rapporten legger fram grunnlaget for Peders avgjørelse; åpningen
av et nytt fagmiljø er en egen migrasjon i en egen PR som ikke slås sammen før
han har godkjent den (§10).
**Grunnlag:** P0-rapporten (`docs/ousfar-nasjonal-p0-kartlegging.md`, §§3–7),
`docs/fagmiljoer.md`, `docs/p2-0-forberedelse.md`, koordineringen i
[#369](https://github.com/peohol/ousfar/issues/369). Kontrollert på `main`
`53da258` (1.131.1) og i produksjonen med bare lesing.
**Eier:** OUSFAR Dev (`ansvar:dev`).

## 0. Kort fortalt

- **Det tekniske grunnlaget for S2 er på plass og kontrollert.** Alle
  etappene S2 krever (P2.0, P2a–d, P3, P4a, P4b og P4c) er slått sammen og
  rullet ut. En ny, samlet test prøver hver person i persongalleriet mot de
  samme lokale dataene i begge fagmiljøene, i begge retninger: 422 tilfeller,
  alle som forventet. Ingen fra det andre fagmiljøet får lese, endre,
  moderere, administrere eller fortolke med OUS sine lokale data, og
  omvendt.
- **Klinisk paritet holder også i produksjonen:** analyttkatalogen og
  EtG/EtS-tekstene i produksjonen er identiske med det migrasjonene la inn,
  som igjen er identisk med det som sto i appen før flyttingen. Ingen
  fortolkningsregel er endret siden 14.11.2026 klokka 12, utenom selve
  EtG-importen.
- **Kontrollen fant ingen feil som gir tilgang på tvers**, men noen forhold
  som bør ordnes før et nytt fagmiljø åpnes (§9): fem OUS-spesifikke
  opplysninger i felles fagsidekort (til OUSFAR Fag,
  [#393](https://github.com/peohol/ousfar/issues/393)), om verktøymenyen skal
  vises for andre fagmiljøer (til OUSFAR Verktøy,
  [#394](https://github.com/peohol/ousfar/issues/394)), fire Dev-forhold
  ([#395](https://github.com/peohol/ousfar/issues/395)), der ett må løses før
  vanlige brukere kan arbeide i det nye fagmiljøet, og de gamle
  globale nøklene ([#389](https://github.com/peohol/ousfar/pull/389)), som
  venter på Peders ja.
- **Et nytt vern:** databasen nekter nå selv å åpne et fagmiljø for medlemmer
  uten et uttrykkelig slipp for nettopp det fagmiljøet, og en migrasjon som gir
  slippet eller rokker ved vernet, stoppes både i kontrollen av PR-en og før
  utrullingen, til den har merket med Peders godkjenning (§8.4).
- **S4 gjelder fortsatt** før et eksternt laboratorium: tofaktorinnlogging,
  sikkerhetskopi og gjenoppretting, og en uavhengig sikkerhetsvurdering.
  Prosjektet står på gratisplanen.

## 1. Metode

| Kilde | Hva |
| --- | --- |
| Testene | Hele testsuiten på `main` `53da258` (238 testfiler, 6049 tester grønne); de nye testene i denne PR-en; samtidighetstestene mot ekte Postgres (§8.1) |
| Produksjonen | Lesende spørringer gjennom Supabase Management API (`/database/query/read-only`) og loggene (`/analytics/endpoints/logs`), 15.11.2026 00:20–00:50 UTC. Ingen skriving, ingen nettleserkjøring mot den publiserte appen |
| Sammenligning | Kontrollsummer (md5) av katalogtabellene og EtG/EtS-revisjonene, regnet med samme spørring i produksjonen og i en testdatabase bygd av migrasjonene |
| Faginnholdet | Alle publiserte kort i panelene «TDM», «Serumkonsentrasjoner» og «Viktige data» (796 elementer) hentet og søkt gjennom (§7) |

«Fagmiljø A» er OUS Klinisk farmakologi, «B» OUS Rettstoksikologi.
Persongalleriet (`src/__tests__/hjelp/persongalleri.ts`) åpner B i
testdatabasen, slik den blir etter S2; i produksjonen er B lukket.

## 2. Status for etappene S2 bygger på

| Etappe | Hva | PR | Status |
| --- | --- | --- | --- |
| P1.1, P1.2a, P1.2b | Fagmiljøer, medlemskap, systemroller, kontomyndighet, Edge-utrulling | #367, #377, #376/#379 | Produksjonsverifisert |
| P4a | Rekkevidde for hvert objekt | #375 | Produksjonsverifisert |
| P2.0 | Aktivt medlemskap i alle datainnganger | #381 | Produksjonsverifisert |
| P2a–d | Faginnhold, samhandling, profiler, systemrettigheter per fagmiljø | #387, #384, #385, #386 | Produksjonsverifisert |
| S3 (port) | Gyldig token etter avsluttet medlemskap gir ingenting | #382, #390 | Passert da P3 ble rullet ut |
| P3 | Medlemskapsadministrasjon og sperring i Auth | #390 | Produksjonsverifisert |
| P4b | Fortolkningsregler per fagmiljø | #388 | Produksjonsverifisert |
| P4b, siste steg | Fjerne de gamle globale nøklene | #389 | **Venter på Peders ja** (§9) |
| P4c | Analyttkatalogen og EtG/EtS-tekstene i databasen per fagmiljø | #391 | Utrullet; produksjonen kontrollert her (§6) |
| P6 | Grupper | #392 | Slått sammen 15.11.2026 (`4175bfd`), etter at denne kontrollen ble gjort. Ikke et krav for S2 |

Produksjonen har 252 migrasjoner, den siste `20261114230200`
(EtG-importen), og ingen migrasjon uten fil.

## 3. S2-kravene punkt for punkt (P0 §6.3)

| Krav | Status | Bevis |
| --- | --- | --- |
| P2.0, P2(a–d), P3, P4a, P4b og P4c ferdige og testet | Oppfylt, med unntak av fjerningen av de gamle nøklene (#389) | §2 |
| TDM-kortene og serumtabellene kontrollert for laboratoriespesifikke opplysninger (D4) | Kontrollert; fem funn til Fag | §7, #393 |
| Full negativ matrise A↔B grønn, også med gyldig token etter avsluttet medlemskap | Oppfylt | §4 |
| Ingen `security definer`-funksjon uten erklært kontroll | Oppfylt, også i produksjonen | §5 |
| Paritet for OUS Klinisk farmakologi | Oppfylt, også i produksjonen | §6 |
| Tydelig stopp uten egne regler | Oppfylt | §4, §5 |
| Ingen lokale koder eller regler fra OUS i katalogen eller søket et annet fagmiljø ser | Oppfylt | §5 |

## 4. Tilgangsmatrisen på tvers av fagmiljøene

### 4.1 Den samlede testen

`src/__tests__/s2tilgang.test.ts` legger de samme lokale dataene inn i begge
fagmiljøene, gjennom de samme funksjonene appen bruker: en publisert
fortolkningskommentar og et utkast (lagd av den lokale administratoren), et
konsentrasjonsregelsett, en tråd på fortolkningssiden (lagd av en vanlig
bruker) og en oppføring i analyttkatalogen. Så prøver hver av de ti personene
i galleriet hver av 21 handlinger mot dataene til A og til B. Hva personen
skal få, regnes ut av rollene i galleriet etter rettighetsmatrisen (P0 §5.2),
ikke skrevet for hånd per tilfelle:

| Rett | Hvem får den | Handlingene |
| --- | --- | --- |
| Lese | Aktivt medlem av fagmiljøet, eller systemarkitekt | Kommentaren gjennom `les_kommentarer` og direkte i tabellen, revisjonene, historikken, rekkevidden, regelsettet i tabellen; tråden i tabellen, innleggene, direktelenken, å skrive i tråden |
| Endre og moderere | Lokal administrator der, eller systemarkitekt | Lese og lagre utkastet, publisere det, skjule tråden |
| Administrere medlemskap | Lokal administrator der, eller systemarkitekt | Se medlemslista, gi en bruker fra det andre fagmiljøet medlemskap, avslutte en vanlig brukers medlemskap, nytt passord til en vanlig bruker |
| Fortolke | Bare arbeidskonteksten (det aktive primærmedlemskapet), også for en systemarkitekt | Regelsettet i oppslaget (`finn_intervallregelsett`), blant alle regelsettene (`les_intervallregelsett`), koden i analyttkatalogen (`les_analyttkatalog`) |

Resultat: **422 av 422** som forventet. Testen krever i tillegg at hver
handling gir både tilgang og avslag mot hvert fagmiljø (så ingen handling
prøves tomt), at ingen fra det andre fagmiljøet får varsel om publiseringen,
og at medlemmene får det.

| Person (galleriet) | Mot A | Mot B |
| --- | --- | --- |
| Vanlig bruker i A | Lese, fortolke | Ingenting |
| Vanlig bruker i B | Ingenting | Lese, fortolke |
| Lokal admin i A | Alt, fortolke | Ingenting |
| Lokal admin i B | Ingenting | Alt, fortolke |
| Aktiv i A (primær) og B | Lese, fortolke | Lese |
| Medlemskapet i A avsluttet, aktiv i B | Ingenting | Lese, fortolke |
| Systemarkitekt, primær i A | Alt, fortolke | Alt unntatt fortolke |
| Systemarkitekt og lokal admin i B | Alt unntatt fortolke | Alt, fortolke |
| Uten aktivt medlemskap, gyldig token | Ingenting | Ingenting |
| Tidligere admin uten medlemskap, rollen står igjen | Ingenting | Ingenting |

### 4.2 Misbrukstilfellene i P0 §4

| Misbrukstilfelle | Hvor det prøves | Utfall |
| --- | --- | --- |
| A leser B sitt regelsett direkte i tabellen, gjennom `les_*`, direktelenke, historikk og varsel (og B mot A) | `s2tilgang.test.ts`, `tilgangsmatrise.test.ts` (P2a, P2b), `fortolkningPerFagmiljo.test.ts` | Avvist |
| Manipulert ID: et regelsett i B som peker på A sin kommentar | `tilgangsmatrise.test.ts` (P4b), `fortolkningPerFagmiljo.test.ts` | Avvist |
| A-admin gir nytt passord til en B-bruker, en systemarkitekt eller en annen A-admin | `s2tilgang.test.ts`, `kontomyndighet.test.ts` | Avvist |
| A-admin gir medlemskap i eller avslutter medlemskap i B | `s2tilgang.test.ts`, `medlemskapsadministrasjon.test.ts` | Avvist |
| Lokal admin gjør seg selv eller andre til systemarkitekt eller administrator | `tilgangsmatrise.test.ts` (P1.1), `medlemskapsadministrasjon.test.ts` | Avvist |
| Den siste administratoren eller systemarkitekten fjernes | `kontomyndighet.test.ts`, `medlemskapsadministrasjon.test.ts`, samtidighetstestene | Avvist, også ved samtidige endringer |
| En lokal tråd flyttes til en felles fagside | `tilgangsmatrise.test.ts` (P2b) | Avvist |
| Et lokalt objekt gjøres felles, eller flyttes uten kommentarene sine | `fortolkningPerFagmiljo.test.ts` | Avvist |
| Avsluttet medlemskap med gyldig token leser eller skriver (S3) | `aktivtmedlemskap.test.ts`, `s2tilgang.test.ts` | Avvist |
| Avsluttet medlemskap i A rører tilgangen i B | `medlemskapsadministrasjon.test.ts`, `s2tilgang.test.ts` | Tilgangen i B står |
| En åpen fane etter avsluttet medlemskap | `avsluttetmedlemskap.test.tsx` | Stengt, mellomlageret tømt |
| En fjernet gruppedeltaker | P6 (#392, slått sammen etter kontrollen) | Prøvd i P6s egne tester |

### 4.3 Kjent begrensning

En bruker med medlemskap i to fagmiljøer fortolker alltid med det primære;
bytte av fagmiljø i appen finnes ikke ennå, og på samme fortolkningsside ser
brukeren trådene fra begge (docs/fagmiljoer.md, «Fortolkningen per
fagmiljø»). Det gir ingen tilgang utover medlemskapene, men det betyr at en
bruker som alt er med i A og får medlemskap i B, fortsatt arbeider i A: et nytt
medlemskap blir bare primært når brukeren ikke har et annet aktivt primært
(`intern.gi_medlemskap`), og alle vanlige kontoer har A som primært. Bare en
systemarkitekt kan i dag flytte arbeidskonteksten, ved å avslutte medlemskapet
i A; en lokal administrator i B kan det ikke. Se §9 og
[#395](https://github.com/peohol/ousfar/issues/395) punkt 4. Peder valgte
15.11.2026 at personen selv skal velge blant egne aktive medlemskap; det er
levert i [#398](https://github.com/peohol/ousfar/pull/398).

## 5. Ingen lokale OUS-regler brukes av andre fagmiljøer

**I databasen (produksjonen, lest 15.11.2026).** Alle radene i de lokale
tabellene hører til A: 106 laboratorieanalytter, 120 intervallregelsett, 36
scenarioregelsett, 48 scenarioanalytter, 2 THC-regelsett, 79 oppføringer, 85
koder, 5 metoder og 87 koblinger i analyttkatalogen, og 404 lokale objekter i
`ressursomfang` (9 220 felles). Ingen rad hører til B. Oppslagene etter kode
eller modul filtrerer på arbeidskonteksten (`mitt_arbeidsfagmiljo()`),
katalogen leses bare gjennom `les_analyttkatalog()` (tabellene har ingen
rettigheter for nettleseren), og `analyttkoblede_stoffer` leses bare av
medlemmer i A. Et fagmiljø uten egne regler eller egen katalog får den
tydelige stoppen (`fortolkningPerFagmiljo.test.ts`,
`analyttkatalogPerFagmiljo.test.ts`, og «fortolke» i §4).

**Funksjonene og radsikkerheten (produksjonen).** De 146 funksjonene
`authenticated` kan kalle i `public` (115 `security definer`) er nøyaktig de
146 som er erklært i `src/__tests__/data/funksjonskontroller.ts`. Alle 74
tabellene i `public` har radsikkerhet, alle visningene kjøres som den
innloggede, og hver tabell nettleseren har en rettighet på, har regelen
`aktivt_medlemskap` (61 regler med `storage`; 40 regler `rekkevidde`).

**I appen.** Klientpakken har ingen analyttkatalog; byggekontrollen
(`scripts/kontroller-vegg.mjs`, `LABORATORIEDATA`) stopper en pakke som drar
inn OUS-filene. THC-filen i pakken (`src/domain/thcKurver.ts`) er bare
regnemotoren; kurvene, marginene og grensene ligger i det lokale regelsettet
i databasen. Søkets mellomlager i nettleseren inneholder bare felles data
(fagsidene, legemiddeldataene, farmakogenetikken og laboratoriesøket fra
Farmakologiportalen); katalogen lagres ikke, og lageret tømmes ved utlogging
og ved avsluttet tilgang.

**Verktøyene** i verktøymenyen har uavklart rekkevidde og vises i dag bare for
dem med den gamle adminrollen, uavhengig av fagmiljø. Det er sendt til
OUSFAR Verktøy ([#394](https://github.com/peohol/ousfar/issues/394)).

## 6. Klinisk paritet for OUS Klinisk farmakologi

- **Testene.** De kliniske fasitene kjøres uendret for A:
  `fortolkningUendret.test.ts`, `steg2regler.test.tsx`,
  `intervallregelsett.test.ts` (med `dagensgrenser.json`),
  `referanseomrader.test.ts`, THC-testene (`thcParitet`, `thcMotor`,
  `thcregler`, `thcseksjonsparitet`) og scenario- og rustestene
  (`rusparitet`, `scenarioregler`). `analyttkatalogPerFagmiljo.test.ts`
  sammenligner katalogen, metodene, koblingene og EtG/EtS-tilfellene med
  kontrollsummer regnet på `main` før flyttingen, og EtG/EtS-tekstene
  ordrett.
- **Produksjonen.** Kontrollsummene av katalogtabellene (metodene,
  oppføringene, kodene og koblingene) og av de fire EtG/EtS-revisjonene er
  like i produksjonen og i testdatabasen bygd av migrasjonene. Produksjonen
  har altså nøyaktig det testene viser er det samme som før flyttingen.
- **Ingen endring i reglene.** De eneste revisjonene av lokale objekter etter
  14.11.2026 kl. 12 UTC er de fire fra EtG-importen. Konsentrasjonsgrensene,
  kommentarene og THC-regelsettet er uendret gjennom P2a, P4b og P4c.

## 7. Laboratoriespesifikke opplysninger i felles kort (D4)

D4 ([#374](https://github.com/peohol/ousfar/issues/374)): referanseområdene,
TDM-kortene og tabellene over serumkonsentrasjoner er felles, men skal
kontrolleres for laboratoriespesifikke opplysninger før S2.

**Gjennomgangen.** Alle publiserte elementer i «TDM» (417),
«Serumkonsentrasjoner» (60) og «Viktige data» (319) ble søkt gjennom etter
OUS og andre sykehus, avdelinger og seksjoner, «vårt laboratorium» og
lignende, metode-, analyse- og rekvisisjonsord og alle analyttkodene i OUS
sin katalog. De fleste treffene er kildehenvisninger til norske studier
(Diakonhjemmet, St. Olavs, Nasjonalt senter for epilepsi), som er felles
fagkunnskap, og generelle råd som at dose og tidspunkt skal stå på
rekvisisjonen.

**Funn** (lagt fram for OUSFAR Fag i
[#393](https://github.com/peohol/ousfar/issues/393), som avgjør om og hvordan
de endres):

| Fagside | Kort | Hva |
| --- | --- | --- |
| pimozid | TDM | Sier at OUS ikke har analysen «i OUSFARs analyseliste» |
| thc | TDM | Viser til «OUS metodebok» |
| paliperidon | TDM | Sier at kilden er fortolkningskommentarene fra Seksjon for klinisk farmakologi ved OUS |
| psilocybin | TDM | Beskriver hva OUS screener for i straffesaker (grensetilfelle) |
| tramadol | Viktige data | Referanseområdet for O-desmetyltramadol er knyttet til OUS sin analyttkode `OTRAM` (teknisk kobling; Dev, #395) |

Ingen av tabellene over serumkonsentrasjoner har slike opplysninger, og ingen
referanseområder overstyres lokalt.

## 8. Test, produksjon og drift

### 8.1 Testene

| Kontroll | Resultat |
| --- | --- |
| `npm test` på `main` `53da258` | 238 filer, 6049 tester grønne (18 hoppet over: de 16 samtidighetstestene uten Postgres-tjener og de 2 ytelsesmålingene) |
| `npm test` på denne grenen | Se PR-en |
| `s2tilgang.test.ts` (ny) | 422 av 422 |
| Samtidighetstestene mot ekte Postgres (`fagmiljoer.samtidighet`, `medlemskap.samtidighet`) | Grønne lokalt mot Postgres 16 (13 bestått, 1 hoppet over), bortsett fra de to som krever Postgres 17 slik produksjonen har; CI kjører dem på 17 |
| `migrasjonshistorikk.test.ts` og `fagmiljoer.test.ts` med det nye vernet | Grønne |

### 8.2 Produksjonen (lest 15.11.2026)

| Måling | Verdi |
| --- | --- |
| Fagmiljøene | A: aktiv, standard, åpen; B: aktiv, lukket |
| Medlemskap | A: 13 aktive, 2 lokale administratorer; B: 1 aktiv (systemarkitekt), 1 lokal administrator |
| Ordinære medlemskap i et lukket fagmiljø | 0 |
| Kontoer uten aktivt medlemskap / sperret i Auth | 0 av 14 / 0 |
| Systemarkitekter | 2 |
| De gamle globale nøklene | Står (5 av 5) |
| Databasestørrelse | 437 MB av 500 MB på gratisplanen (far: 423 MB); største tabeller er kurateringsgrenene og legemiddeldataene |
| Hurtigminne | 99,9 % treff, 14 forbindelser |
| Feil i Postgres-loggen siste døgn | Ingen knyttet til fagmiljøene. Én gjentakende feil uten tilknytning til S2: `permission denied for table brukerinnstillinger` (om lag 40 i timen, sett også 08.11), trolig et kall uten innlogging; 13 tidsavbrudd |

### 8.3 Gjenopprettingsmuligheter

- **Hver etappe** har en beskrevet tilbakeføring i `docs/fagmiljoer.md`: en
  ny migrasjon som setter funksjonene og reglene tilbake. Ingen etappe har
  slettet data; medlemskap og tilgangslogg avsluttes, de slettes ikke.
- **Åpningen av B** (§10) er én verdi i én rad og loggføres i
  `tilgangslogg`. Den lukkes igjen med en ny migrasjon
  (`apent_for_medlemmer = false`). Lukking stopper nye medlemskap, men
  avslutter ikke dem som er gitt; de avsluttes i medlemslista (og kontoer uten
  andre medlemskap sperres automatisk).
- **Sikkerhetskopi.** Prosjektet står på gratisplanen, uten egen
  sikkerhetskopi eller gjenoppretting til et tidspunkt. Det er D7 og hører
  til S4, før et eksternt laboratorium, ikke til S2.

### 8.4 Nytt vern i utrullingen

Vernet har to lag, slik at det ikke avhenger av å kjenne igjen hver SQL-form:

1. **I databasen** (`20261115003000_startportvern.sql`): en trigger på
   `fagmiljoer` nekter at et fagmiljø blir åpent for medlemmer, ved innsetting
   eller endring og uansett hvordan setningen er skrevet, med mindre
   innstillingen `ousfar.startport` i samme transaksjon navngir nettopp det
   fagmiljøets nøkkel. Å lukke et fagmiljø og alle andre endringer er uendret.
   `fagmiljoer.test.ts` prøver vanlig og tuppel-`update`, `not`, innsetting uten
   kolonneliste og slipp for feil fagmiljø.
2. **I utrullingen** (`src/faginnhold/migrasjonshistorikk.ts`,
   `docs/migrasjoner.md`): en migrasjon som setter innstillingen, eller som
   fjerner, erstatter eller kobler ut triggeren (`drop`/`alter trigger`,
   `create or replace`/`drop function`, `disable trigger` på `fagmiljoer`,
   `session_replication_role`), stoppes både i kontrollen av PR-en og før
   utrullingen, til den har merket `-- destruktiv-godkjent: <hvem, når, hva>`.
   Merket skrives bare etter Peders uttrykkelige ja.

En migrasjon som prøver å åpne et fagmiljø uten slippet, feiler dermed i testene
i CI og, fordi migrasjonene kjøres i én transaksjon, uten virkning i
produksjonen. Endringer i selve opptaksreglene (`intern.kontroller_opptak`,
`intern.medlemskapsavslag`) dekkes av testene for lukkede fagmiljøer i
`fagmiljoer.test.ts` og `s2tilgang.test.ts`.

## 9. Hva som gjenstår før et nytt fagmiljø kan åpnes

| Hva | Eier | Må eller bør | Hvorfor |
| --- | --- | --- | --- |
| Peders godkjenning av åpningen | Peder | **Må** | Startporten åpnes aldri automatisk |
| De fem opplysningene i felles kort ([#393](https://github.com/peohol/ousfar/issues/393)) | OUSFAR Fag | Bør | D4: felles kort uten laboratoriets egne opplysninger |
| Verktøymenyen for andre fagmiljøer ([#394](https://github.com/peohol/ousfar/issues/394)) | OUSFAR Verktøy | Bør | Uavklart rekkevidde; i dag styrt av den gamle adminrollen |
| De gamle globale nøklene ([#389](https://github.com/peohol/ousfar/pull/389)) | Peder, så Dev | Bør, og må før B lager regler for koder A har | Så lenge de står, kan B ikke lage et regelsett for en kode A har, og feilen røper at A har koden |
| Kategorier i diskusjonene per fagmiljø ([#395](https://github.com/peohol/ousfar/issues/395) punkt 1) | Dev | Bør | B kan ikke bruke et kategorinavn A har på samme fortolkningsside, og feilen røper det |
| Opprette kontoer direkte i et annet fagmiljø (#395 punkt 2) | Dev | Bør | I dag går en ny konto via OUS Klinisk farmakologi; trygt bare når en systemarkitekt gjør alle stegene før passordet gis ut |
| Datakort knyttet til OUS-kode (#395 punkt 3) | Dev | Bør | Ett kort (tramadol) |
| Velge arbeidsfagmiljø for den som er med i flere (#395 punkt 4) | Dev: [#398](https://github.com/peohol/ousfar/pull/398), etter Peders valg (personen selv) | **Må** før vanlige brukere skal arbeide i B | Et medlemskap i B blir ikke primært når brukeren alt er primær i A, så fortolkningen bruker fortsatt As regler; i dag kan bare en systemarkitekt flytte det ved å avslutte medlemskapet i A (§4.3) |
| P6, grupper (#392) | Dev | Nei (slått sammen) | Ikke et krav for S2; testet for seg |
| S4: tofaktorinnlogging, sikkerhetskopi, uavhengig sikkerhetsvurdering | Peder (D5, D7, B9) | Må før eksternt laboratorium | Ikke før S2 |

Det nye fagmiljøet har ingen fortolkningsregler og ingen analyttkatalog. Etter
åpningen får medlemmene der fagsidene, søket i fagstoffet, diskusjonene og
idéene. Den som har B som primært fagmiljø, får en tydelig stopp i
fortolkningen til egne regler er lagt inn; den som også er med i A og har A som
primært, fortolker fortsatt med As regler (§4.3) til punktet om
arbeidsfagmiljø over er løst.

## 10. Åpningen (egen PR)

Åpningen av OUS Rettstoksikologi er en egen migrasjon i en egen PR, merket
«venter på Peders godkjenning». Den setter `apent_for_medlemmer = true` for
det ene fagmiljøet gjennom slippet i §8.4, med begrunnelsen i tilgangsloggen, stopper hvis
fagmiljøet ikke finnes eller er arkivert, og gjør ingenting om det alt er
åpent. Den gir ingen medlemskap selv. Den stoppes av vernet i §8.4 til merket
med Peders godkjenning er skrevet, så den kan verken slås sammen med grønn
kontroll eller rulles ut uten det.
