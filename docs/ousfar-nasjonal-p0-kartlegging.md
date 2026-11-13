# OUSFAR nasjonal – P0: teknisk kartlegging

**Status:** P0-rapport, 13.11.2026. Bare dokumentasjon: ingen kode, ingen
migrasjoner, ingen endring i produksjonen, og ingen start på P1.
**Grunnlag:** visjonen [#363](https://github.com/peohol/ousfar/issues/363),
planen [#364](https://github.com/peohol/ousfar/issues/364) og oppdraget
[#365](https://github.com/peohol/ousfar/issues/365). **Eier:** OUSFAR Dev
(`ansvar:dev`).

Rapporten kontrollerer forutsetningene i plan #364 mot koden og databasen
slik de faktisk er, og gir grunnlaget for å velge og spesifisere første
implementeringsoppgave. Hver påstand er merket:

- **(F)** funn, dokumentert fra kode, migrasjoner eller databasekatalog, med sti
  eller navn;
- **(A)** teknisk anbefaling;
- **(U)** organisatorisk eller faglig antakelse som må avklares.

---

## 0. Sammendrag

**Gjennomførbarhet.** Utvidelsen er gjennomførbar på dagens grunnmur, men ikke
ved å legge til metadata alene. Faginnholdet har allerede en god felles
objektmodell (utkast, publisering, revisjoner og en uforanderlig hendelseslogg)
som kan bære rekkevidde og redaktøransvar. Tilgangsmodellen er derimot bygget
for ett laboratorium med to roller: databasen spør bare «er du innlogget?» eller
«er du administrator?» (`public.er_admin()`, `intern.krev_admin()`), 39 av 83
radsikkerhetsregler og 39 funksjoner bygger på dette, og 18 tabeller kan leses
av alle innloggede uten noen begrensning (F).

**Kritisk teknisk hovedrisiko.** Fortolkningen velger regler **bare etter
analyttkoden**, og databasen tillater **ett regelsett per kode og tilstand**
(`intervallregelsett_analyttkode_entydig`, `scenarioanalytter_kode_idx`,
`scenarioregelsett_modul_idx`, `thc_regelsett_ett_idx`,
`laboratorieanalytter_kode_entydig`). I tillegg ligger analyttkatalogen,
måleområdene, rusmodulene, EtG/EtS-tekstene og stoff–analytt-koblingene som
statiske filer i klientpakken og i det offentlige repoet (F). Et nytt
laboratorium med samme kode som OUS ville i dag stille fått OUS-reglene – det
planen kaller «stille reserve» er altså dagens standardoppførsel. Dette er
den største kliniske risikoen og den største ombyggingen (P4).

Den største sikkerhetsrisikoen er at dagens adminrolle er **flat og global**:
en administrator kan gi nytt passord til og fjerne adminrollen fra enhver annen
administrator (`supabase/functions/nytt-passord`, `sett-rolle`), publisere
faginnhold direkte uten kurateringsløpet (`public.publiser_utkast`), og opptre
som både kurator-administrator og kontrollør i kurateringsgrenene
(`kuratering.krev_rolle` slipper `admin` gjennom). Rollen kan derfor ikke
gjenbrukes for lokale administratorer (F, A).

Positivt: det finnes ingen sanntidskanaler og bare én lagringsbøtte
(profilbilder), produksjonen stemmer strukturelt med migrasjonene, alle 64
tabeller i `public` har radsikkerhet, og lesefunksjonene for de kliniske
reglene kjører som den innloggede (ikke `security definer`), slik at strammere
radsikkerhet slår gjennom der uten omskriving (F).

**Én database.** Planens anbefaling om én Supabase-database holder teknisk for
en pilot (A), forutsatt tre ting: alle 92 `security definer`-funksjoner som
innloggede kan kalle, får eksplisitt tilgangskontroll; en katalogtest stopper
nye uten; og sikkerhetskopi/gjenoppretting og kapasitet avklares før eksterne
brukere (prosjektet står på gratisplanen).

**Anbefalt første kodeetappe.** «P1.1 Rollegrunnlag uten atferdsendring»
(§8): additive tabeller for fagmiljø, medlemskap, systemrolle og en
uforanderlig tilgangslogg; de to første fagmiljøene, «OUS Klinisk
farmakologi» og «OUS Rettstoksikologi», med dagens brukere fordelt slik Peder
har bestemt; og to katalogtester (radsikkerhet på alle tabeller og
en erklært tilgangskontroll for hver funksjon innloggede kan kalle). Ingen
eksisterende regel endres. Peder har svart på D1 og D2 (§7.2), så den kan
bestilles. Rett etter følger en liten sikkerhetsherding (P1.2) av adminoperasjonene.

---

## 1. Metode, grunnlag og ukjente områder

**Grunnlag.** `main` på `0b89aad` (AGENTS.md-blob `532d477`), 235
migrasjoner (siste `20261107210000_utsatt_sikkerhetsfilter.sql`).

**Skjemaet er lest fra katalogen, ikke fra teksten (F).** Alle migrasjonene er
kjørt i den samme Postgres-i-minnet som testene bruker
(`src/__tests__/hjelp/migrasjonskjoring.ts`, `nyDatabase()`), og tabeller,
radsikkerhet, regler, rettigheter, funksjoner, utløsere, fremmednøkler og unike
nøkler er lest ut av `pg_catalog`/`information_schema`. Det gir 131 tabeller og
views i ti skjemaer, 83 radsikkerhetsregler og 487 funksjoner. Fremgangsmåten
kan gjentas i en vite-node-fil som kaller `nyDatabase()` og spør katalogen.

**Produksjonen er kontrollert med én skrivebeskyttet katalogspørring (F).**
Bare aggregater og strukturell informasjon, ingen persondata i rapporten:
235 migrasjoner kjørt (siste `20261107210000`), 83 radsikkerhetsregler, 64
tabeller i `public` (alle med radsikkerhet), 123 funksjoner i `public` som
innloggede kan kalle (92 av dem `security definer`), 4 som `anon` kan kalle,
5 views (alle `security_invoker`), én lagringsbøtte (`avatarer`, privat), 0
tabeller i sanntidspublikasjonen, Postgres 17.6. Alt stemmer med skjemaet bygd
av migrasjonene. Brukergrunnlaget er 14 profiler, hvorav 2 administratorer;
begge brukernavnene `peohol` og `maxhag` finnes som kontoer. Edge-funksjonene i
produksjonen er listet med Management-API-et (se §2.11).

**Ukjente områder (eksplisitt):**

1. Om koden som kjører i Edge-funksjonene i produksjonen er identisk med
   repoet. De rulles ikke ut automatisk, og produksjonen har en funksjon
   (`delt-test`) som ikke finnes i repoet (§2.11).
2. Auth-innstillinger som bare finnes i Supabase-prosjektet (passordregler,
   øktlengde i produksjonen, MFA). `supabase/config.toml` sier tilgangstoken i
   3600 s, rotasjon av fornyingstoken og ingen registrering; ingen MFA er satt
   opp.
3. Vercel-innstillinger utover `vercel.json` (miljøvariabler, beskyttelse av
   forhåndsvisninger).
4. Hva som faktisk er laboratoriespesifikt faglig sett (krever Fag/Peder,
   §3).
5. Sikkerhetskopiering og gjenoppretting i dagens plan (ikke undersøkt i
   prosjektet; se D7).

---

## 2. Kontrollert status i dagens app

### 2.1 Innlogging, økt og konto

| Del | Hvor | Funn (F) |
| --- | --- | --- |
| Roller | enum `public.brukerrolle` (`user`, `admin`), kolonnen `profiles.role`; `supabase/functions/_delt/profil.ts` (`ROLLER`) | Én global rolle per bruker. Ingen begrep for laboratorium, gruppe eller ressursansvar |
| Kontoopprettelse | `supabase/functions/opprett-bruker`, utløseren `paa_ny_auth_bruker` og `public.kontoreservasjoner` (`20260922092042_profiler_og_roller.sql`) | Bare via admin; selvregistrering sperret i databasen, ikke bare i innstillingene |
| Nytt passord | `supabase/functions/nytt-passord` | Enhver admin kan gi **enhver** bruker, også en annen admin, nytt midlertidig passord og dermed overta kontoen |
| Rolleendring | `supabase/functions/sett-rolle` | Enhver admin kan gi eller fjerne adminrollen hos alle andre enn seg selv. Ingen sperre mot å fjerne siste admin eller en «høyere» bruker |
| Førstegangsoppsett | `supabase/functions/fullfor-oppsett`, `src/domain/tilgang.ts` | Bra mønster; uberørt av utvidelsen |
| Rolleoppslag i Edge | `supabase/functions/_edge/kontekst.ts` (`endepunkt`, `hentInnlogget`) | Rollen slås opp i `profiles` for hvert kall, aldri i JWT-en. Godt grunnlag for en felles rettighetssjekk |
| Profilfelter | kolonnerettigheter og utløseren `profiles_beskytt_felter` | Nettleseren kan bare skrive navn og bildesti; rollen kan ikke settes fra nettleseren |
| Profillesing | regelen `profiles` SELECT `true` | Alle innloggede leser alle profiler, også `role` |
| Økt i nettleseren | `src/auth/klient.ts` (`createBrowserClient`), `src/auth/okt.tsx` | Økten ligger i en informasjonskapsel slik at kanten kan se den |
| Innloggingsveggen | `middleware.ts`, `src/auth/vegg.ts`, `scripts/kontroller-vegg.mjs` | Kanten kontrollerer bare at JWT-en er gyldig signert. Den vet ikke hvem brukeren er medlem av, og er ingen laboratoriegrense |
| Deaktivering | — | **Finnes ikke.** Ingen status på profilen, ingen sperring i Auth fra appen. Eneste vei ut er å slette brukeren i Supabase (§2.3) |
| Utlogging | `src/auth/api.ts` (`signOut`), `src/auth/mellomlager.ts` (`tomMellomlageret`) | Tømmer det lokale mellomlageret ved utlogging |
| MFA | — | Ikke i bruk |
| Første admin | `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin`) | Setter `role = 'admin'` med hemmelig nøkkel; eneste vei når alle admin er borte |

### 2.2 Alle innganger som vurderer «admin» eller antar at alle innloggede kan alt

**Databasen (F).** Tallene er fra katalogen:

| Mønster | Antall | Hvor |
| --- | --- | --- |
| Radsikkerhetsregler med `er_admin()` | 39 av 83 | Alt faginnhold (`tilstand = 'publisert' or er_admin()`), `innholdsendringer`, `innholdshendelser`, `slettede_*`, `diskusjon_skjulte_tekster`, `autoerstatt_regler` (skriving), `ideer`/`idekommentarer` (sletting) |
| SELECT-regler som er `true` (alle innloggede) | 18 | `profiles`, `diskusjoner`, `diskusjonskommentarer`, `diskusjonshjerter`, `diskusjonskategorier`, `ideer`, `idekommentarer`, `idehjerter`, `oppgaver`, `objektpubliseringer`, `sideversjoner`, `stoffkategorier`, `stoffplasseringer`, `stoffstatus`, `analyttkoblede_stoffer`, `maleenheter`, `endringsagenter`, `autoerstatt_regler` |
| Funksjoner som kaller `public.er_admin()` | 17 | bl.a. `les_stoffregister`, `les_endringslogg`, `slett_diskusjon`, `skjul_i_diskusjon`/`vis_i_diskusjon`/`fjern_skjult_i_diskusjon`, `slett_stoff`, `gjenopprett_stoff`, `slett_stoffkategori`, `datakilder_status`, `les_fagsaker`, `beslutt_fagsak`, `les_kildeovervaking`, `sett_verktoysperre`, `opphev_verktoysperre`, `verktoysperrehistorikk`, `intern.krev_idevalg_admin` |
| Funksjoner som kaller `intern.krev_admin()` | 12 | All skriving av faginnhold: `lagre_utkast`, `publiser_utkast`, `gjenopprett_revisjon`, `slett_referanse`, `lagre_intervallregelsett`, `lagre_scenarioregelsett`, `lagre_thc_regelsett`, `valider_scenarioregelsett`, `slett_stoff_for_godt`, `tom_stoffpapirkurven`, `intern.opprett_objekt` (bak `opprett_utkast`) og `kuratering.admin_aktor` (bak `kuratering_admin`) |
| Funksjoner som kaller `intern.krev_idevalg_admin()` | 9 | Planlagte oppgaver og arkivering av idéer |
| Funksjoner som bare krever innlogging (`intern.krev_innlogget`) | 11 | Diskusjonene: opprette, gi nytt navn, flytte, arkivere, endre kategorier – på **alle** tråder og kategorier, ikke bare egne |
| Funksjoner som bare krever innlogging (`intern.krev_registerbruker`) | 10 | Stoffregisteret: opprette, endre, flytte og arkivere kategorier og plassere stoffer, for alle innloggede |
| `security definer`-funksjoner uten egen kontroll ut over innlogging | bl.a. `les_bivirkninger`, `les_sideversjon(er)`, `les_laboratorieanalyser`, `les_laboratoriesok`, `les_preparatsok`, `les_interaksjon(s)sok`, `les_kjemi`, `les_cpic*`, `les_farmakogenetikk*`, `les_kurateringer`, `sokedata_versjoner`, `direktelenke`, `ideoversikt`, `idetraad`, `oppgave`, `oppgaveoversikt`, `rydd_idearkiv`, `rydd_stoffpapirkurven` | Leser forbi radsikkerheten. Uproblematisk for felles data, men hver av dem må få rekkeviddekontroll så snart den kan returnere lokalt eller gruppeinternt innhold |

Lesingen av de kliniske reglene og fagsidene (`les_intervallregelsett`,
`finn_intervallregelsett`, `les_scenarioregler`, `les_thc_regelsett`,
`les_kommentarer`, `les_stoffer`, `les_stoffside`, `les_referanser`,
`les_referanseomrader`, `les_historikk`) er **ikke** `security definer`: de
arver radsikkerheten til den innloggede (F). Endres reglene på tabellene,
følger disse med.

**Edge-funksjonene (F).** `opprett-bruker`, `nytt-passord` og `sett-rolle`
krever `role = 'admin'` (`endepunkt({ krevAdmin: true })`); `fullfor-oppsett`
gjelder bare den innloggede selv.

**Serverfunksjonene i Vercel (F).** `src/server/tilgang.ts` (`hvem`, `erAdmin`)
slipper inn Vercels cron (`CRON_SECRET`), et OIDC-token fra GitHub Actions for
en navngitt arbeidsflyt på `main`, eller en innlogget som `er_admin()` svarer ja
for. Brukt av alle synkene (`api/*-synk.ts`), `api/clinpgx-sok.ts`,
`api/kildeovervaking.ts` og `api/kuratering-ko.ts`. Kurateringsagentene
(`api/kuratering.ts`, `api/kuratering-mcp.ts`) bruker egne agentnøkler
(`kuratering.agenter`, SHA-256-lagret). Ingen av disse ser på laboratorium.

**Klienten (F).** 15 komponent-/hook-filer viser eller skjuler ting etter
`role === 'admin'` (bl.a. `src/components/konto/Adminmeny.tsx`,
`Brukerliste.tsx`, `Kontomeny.tsx`, `src/components/traad/Forfatterkontekst.tsx`).
Dette er visning, ikke sikkerhet, men må følge den nye modellen.

### 2.3 Hva skjer når en bruker eller rolle fjernes

| Tabell | Ved sletting av Auth-brukeren (`profiles` slettes i kaskade) | Konsekvens (F) |
| --- | --- | --- |
| `ideer`, `idekommentarer` | `on delete cascade` | Idéene og kommentarene **forsvinner**, også svar andre har skrevet i trådene |
| `idehjerter`, `idebesok`, `diskusjonsbesok`, `diskusjonshjerter`, `stoffavoritter`, `varsler`, `brukerinnstillinger` | `cascade` | Personlige data går, som forventet |
| `diskusjoner`, `diskusjonskommentarer`, `diskusjonskategorier.opprettet_av`, `diskusjon_skjulte_tekster.skjult_av` | `set null` | Innholdet står uten forfatter |
| `kildefunn`, `kildefunn_hendelser`, `kildefunn_tiltak`, `verktoysperrer` | uten `on delete` | **Slettingen stoppes** for brukere som har tatt verktøybeslutninger |
| `objektrevisjoner`, `objektpubliseringer`, `innholdsendringer` | ingen fremmednøkkel; navnet er kopiert inn (`utfort_av_fornavn`, `utfort_av_etternavn`) | Revisjonshistorikken overlever, også med navn |
| `kuratering.grener` | `opprettet_av_navn` kopiert | Overlever |

Rolleendring (`sett-rolle`) virker umiddelbart i databasen, fordi
`er_admin()` slår opp profilen for hvert kall. En aktiv økt beholdes, men
mister adminrettighetene ved neste kall (F). Det finnes ingen måte å stenge en
bruker ute på: tilgangstokenet gjelder i inntil en time, fornyingstokenet
lenger, og radsikkerheten sjekker bare at `auth.uid()` finnes (F).

### 2.4 Systemarkitekter knyttet til verifiserte ID-er

(F) Begge brukernavnene finnes. Brukernavnet er bare en avledet Auth-adresse
(`<navn>@auth.ousfar.invalid`, `supabase/functions/_delt/brukernavn.ts`); den
stabile identiteten er `auth.users.id` = `profiles.id` (uuid).
(A) Systemarkitektrollen lagres i en egen tabell med bruker-ID-en som
fremmednøkkel, aldri med brukernavnet som nøkkel. Tildelingen gjøres i P1 med
en migrasjon som slår opp ID-en, krever at den finnes og stopper ellers – og
først etter at Peder har bekreftet hvem kontoene tilhører (D2). Senere
tildelinger går bare gjennom en funksjon som krever at den som tildeler, selv
er systemarkitekt, og som skriver til tilgangsloggen. Ingen tildeling nå.

### 2.5 Faginnhold og fortolkning: hvor de kliniske dataene ligger

**I databasen, som redigerbare objekter (F).** `public.redigerbare_objekter`
(uforanderlig register med `type`), `objekttilstander` (utkast/publisert),
`objektrevisjoner` og `objektpubliseringer` (uforanderlige),
`innholdsendringer`/`innholdshendelser` (uforanderlig logg). Objekttypene
(`public.objekttype`): `infoside`, `innholdselement`, `referanse`,
`laboratorieanalytt`, `kommentar`, `intervallregelsett`,
`scenarioregelsett`, `thc_regelsett`. I tillegg fagsideversjoner
(`sideversjoner`), kurateringsgrenene (`kuratering.*`), bivirkningene
(`bivirkninger.*`) og stoffregisterets kategorier (`stoffkategorier`,
`stoffplasseringer`, `stoffstatus`).

**Statisk i klientpakken og i det offentlige repoet (F):**

| Fil | Innhold | Klinisk betydning |
| --- | --- | --- |
| `src/data/analytter.json` (kilde `originaldata/kommentarer.pdf`) | 35 analytter: kode, navn, gruppe, **analysemetodekode** (f.eks. `SPFA`), enhet, **måleområde**, aliaser | Laboratoriespesifikt: OUS-koder og -måleområder |
| `src/data/antihypertensiver.json` (kilde `originaldata/AHT.docx`) | 25 analytter, samme form | Laboratoriespesifikt |
| `src/data/stoffregister.json` | Stoffene (felles) **og** `analyttkoblinger` kode→stoff (laboratoriespesifikt) | Blandet |
| `src/data/aliaser.json` | Søkeord per analyttkode | Laboratoriespesifikt |
| `src/data/forbindelser.ts` | Forbindelsesregisteret (kjemisk identitet) | Felles |
| `src/domain/rus.ts` (`RUS_MODULER`) | Hvilke rusmoduler som finnes, kodene og analysemetoden `SRUS` | Laboratoriespesifikt; reglene og tekstene ligger i databasen |
| `src/domain/etg.ts` | EtG/EtS-modulen **med kommentartekstene i koden** (`BEGGE_PAVIST`, `SE_ETS`, `EN_AV_DEM`) og kodene `UETGS`/`UETS` | Klinisk output i statisk kode |
| `src/domain/thc.ts`, `thcMotor.ts`, `thcKurver.ts` | Koden `IRCAK`, metoden `UCAK` og motoren; regelsettet og tekstene i databasen | Motor felles, regelsett lokalt |
| `src/domain/analyttkatalog.ts`, `analysemetoder.ts` | Fortolkningskatalogen satt sammen av filene over | Laboratoriespesifikt |
| `src/verktoy/regler/`, `src/data/verktoy/` | Verktøyenes regler og kildegrunnlag | Eies av OUSFAR Verktøy (§9) |
| `src/data/endringslogg.ts` | Appens endringslogg | Felles |
| `originaldata/` | OUS sine kildedokumenter (`kommentarer.pdf`, `Psykofarmaka.pdf`, `THC-COOH.xlsm`, `AHT.docx`, `antihypertensiver.docx`, `rusmidler.md`) | Offentlig i repoet |

(F) Repoet er offentlig. Alt over er derfor allerede offentlig kjent,
uavhengig av innloggingsveggen.
(A) «Lokalt» må bety *rekkevidde* (gjelder bare fagmiljø A), ikke
*hemmelighold*, for alt som ligger i repoet. Nye laboratoriers regler,
koder og tekster skal aldri inn i repoet eller klientpakken; de skal bare
finnes i databasen bak radsikkerhet.

### 2.6 Én global regel per analytt eller kode

**Unike nøkler i databasen (F):**

| Nøkkel | Tabell | Betyr |
| --- | --- | --- |
| `laboratorieanalytter_kode_entydig` `(tilstand, kode)` | `laboratorieanalytter` | Én analytt per kode |
| `intervallregelsett_analyttkode_entydig` `(tilstand, analyttkode)` | `intervallregelsett` | Ett konsentrasjonsregelsett per kode |
| `scenarioanalytter_kode_idx` `(tilstand, kode)` | `scenarioanalytter` | En kode kan bare høre til én rusmodul |
| `scenarioregelsett_modul_idx` `(tilstand, modul)` | `scenarioregelsett` | Ett regelsett per modulnøkkel |
| `thc_regelsett_ett_idx` `(tilstand)` | `thc_regelsett` | **Ett** THC-regelsett i hele databasen |
| `infosider_slug_idx`, `infosider_navn_idx` | `infosider` | Én fagside per stoff (riktig for felles innhold) |

**Funksjoner som slår opp etter kode alene (F):** `finn_intervallregelsett(analyttkode, …)`,
`les_analyttside(analyttkode, …)`, `les_referanseomrader` (kobler kode via
`laboratorieanalytter.hovedside_id` til referanseområdet på fagsiden),
`les_intervallregelsett`/`les_scenarioregler`/`les_thc_regelsett` (returnerer
alle). Validering i `intern.skriv_intervallregelsett` («en analyttkode kan bare
ha ett regelsett») og `intern.skriv_scenarioregelsett`.

**Klienten (F):** `src/regler/publiserte.ts` og `src/hooks/usePubliserteRegler.ts`
henter alle publiserte regelsett og slår opp etter kode; `src/domain/analytes.ts`
(`findByCode`), `src/domain/rus.ts` (`rusModulFor`, `modulMedId`),
`src/domain/piller.ts` (tallene over knappene: referanseområdet fra fagsiden,
ringegrensen fra regelsettet, resten fra den statiske katalogen).
Diskusjonene på fortolkningen har siden `fortolkning:<kode>`
(`docs/diskusjoner.md`).

**Konsekvens ved flere fagmiljøer (A):** De unike nøklene må få fagmiljøet
med, `finn_*`/`les_*` må ta fagmiljøet fra én entydig **arbeidskontekst**
(under), og klienten må slutte å anta at en kode har én betydning. Ett regelsett for to laboratorier
må være et eksplisitt delingsvalg, ikke en følge av at kodene er like. Den
eksisterende «mangler»-tilstanden på steg 2 (`src/components/BandStep.tsx`)
er rett sted for den tydelige stoppen når et fagmiljø ikke har godkjente
regler.

**Entydig arbeidskontekst (A).** Har en bruker aktive medlemskap i både A og B
(som B1 tillater i modellen), kan fagmiljøet ikke utledes av «de aktive
medlemskapene»: med samme kode i begge ville oppslaget gi to regelsett eller et
tilfeldig valgt. Regelen er derfor:

1. Fortolkningen bruker alltid nøyaktig **ett** fagmiljø, arbeidskonteksten.
   I første versjon er det brukerens aktive primærmedlemskap, og ingenting
   annet.
2. Når bytte av fagmiljø innføres, lagres valgt kontekst på serveren (egen
   rad per bruker), og hver lesing og skriving validerer den mot et aktivt
   medlemskap. Klienten kan be om bytte, men et fagmiljø-ID i et kall brukes
   aldri uten den valideringen. Mangler gyldig kontekst, stopper fortolkningen
   tydelig.
3. Fortolkningen viser hvilket fagmiljø og hvilken regelversjon resultatet
   gjelder, og et bytte tømmer reglene og mellomlageret i nettleseren før noe
   nytt vises.
4. Testene dekker en bruker med medlemskap i A og B, samme kode i begge:
   resultatet følger konteksten, bytte gir den andres regler, og et kall med
   B-kontekst etter at B-medlemskapet er deaktivert, avvises.

### 2.7 Delte objekter

| Objekt | Deles av | Risiko ved flere fagmiljøer (F/A) |
| --- | --- | --- |
| Kommentarobjekter (`kommentarer`) | Flere regler, regelsett og typer (intervall, scenario, THC) | En lokal redaktør som endrer en kommentar, endrer alle regelsett som peker på den. Må få samme rekkevidde som regelsettene som bruker den; deling mellom fagmiljøer skal kreve kopi |
| Referanser (`referanser`, `referansekoblinger`) | Alle fagsider (global referansebase) | Felles og bør forbli felles; endring kan bare gjøres av felles redaktør |
| Referanseområdet på fagsiden (`innholdselementer`, `viktige_data`/`referanseomrade`) | Fagsiden (felles) **og** fortolkningens tallpiller (lokal) via `les_referanseomrader` | En felles fagsideendring endrer lokal fortolkningsvisning. Avhengigheten må vises og testes, eller kobles via lokal analytt |
| `maleenheter`, `endringsagenter`, `autoerstatt_regler` | Alle | Felles oppslag; skriving bare for systemarkitekt |
| Stoffregisterets kategorier | Alle | I dag kan alle innloggede omstrukturere; må bli redaktøransvar |
| Diskusjonskategorier per side | Alle | Alle kan endre alle; må følge sidens rekkevidde |
| Endringsloggen for innhold (`les_endringslogg`) | Alle | Viser revisjoner og publiseringer per side; må filtreres på rekkevidde |

### 2.8 Samhandling

| Funksjon | Hvor | Dagens tilgang (F) | Gjenbruk (A) |
| --- | --- | --- | --- |
| Diskusjoner | `20260930115512_diskusjoner.sql`, `src/diskusjoner/`, `src/components/diskusjoner/`, `src/traad/` | Alle leser alt; alle oppretter, gir nytt navn, flytter og arkiverer **alle** tråder og kategorier; forfatteren endrer egne innlegg; admin skjuler, viser igjen og sletter. Siden er en tekstnøkkel (`stoff:`, `fortolkning:`, `register:`) uten fremmednøkkel | Trådmodell, kommentartre, hjerter, skjuling og varsler kan gjenbrukes. Tilgangen må få rekkevidde (`felles`/`fagmiljø`/`gruppe`) per tråd, arvet fra siden, og de vide skriverettene må begrenses |
| Idéer | `20260927184435_ideer.sql`, `src/ideer/` | Alle leser alt; forfatter endrer egen; admin arkiverer; alle varsles om nye idéer | Idéflyten (idé → planlagt oppgave) gjelder appens utvikling og bør forbli felles. Gruppeidéer: samme tabeller med `gruppe_id` |
| Planlagte oppgaver | `20260929103534_ideer_arkiv_og_oppgaver.sql`, skillen `utfor-oppgaver` | Alle leser (også prompten); admin styrer | Bare systemarkitekter skal styre; lesing kan begrenses til dem |
| Varsler | `20260929122549_varsler.sql`, `intern.varsle*`, `docs/varsler.md` | Hver ser bare sine egne. Men `varsle_publisering` sender varsel til **alle profiler** ved hver publisering av kommentar/regelsett, og `varsle_ny_ide` til alle | Mottakerlistene må filtreres på hvem som kan lese objektet; ellers lekker eksistensen av lokale regelsett |
| Direktelenker | `public.direktelenke`, `docs/direktelenker.md` | `security definer`; gir tråd/idé/kommentar til alle innloggede | Må kontrollere rekkevidde før den svarer, og svare likt for «finnes ikke» og «ingen tilgang» |
| Favoritter | `stoffavoritter`, `sett_stoffavoritt` | Egne | Gjelder felles fagsider; trygg |
| Profiler og bilder | `profiles`, bøtta `avatarer` | Alle ser alle, med rolle | Dataminimering: vis navn der man samhandler; ikke en nasjonal katalog med roller |
| Filer | Bare profilbilder | — | Ingen gjenbrukbar filmodell; P8 er nybygg |
| Sanntid | — | Ingen tabell i publikasjonen, ingen kanal i klienten | P7 innfører en helt ny flate |
| Moderering | `skjul_i_diskusjon`, `vis_i_diskusjon`, `fjern_skjult_i_diskusjon`, `diskusjon_skjulte_tekster` | Bare admin, globalt | Kan gjenbrukes for gruppeansvarlige med rekkevidde |

### 2.9 Søk og mellomlager

(F) Søket i kunnskapsbasen (`src/faginnhold/globaltSok.ts`, `src/domain/search.ts`)
leser **alle** publiserte fagsider og tilhørende data i én omgang og indekserer
i nettleseren. Resultatet lagres i IndexedDB (`src/auth/mellomlager.ts`,
`ousfar-mellomlager`) med en nøkkel per kilde, ikke per bruker eller
fagmiljø, og tømmes ved utlogging. Fortolkningssøket bygger på den statiske
katalogen (`FORTOLKNINGSOPPFORINGER`).
(A) Så lenge søket bare indekserer felles innhold, er dette trygt. Lokalt
innhold i søket krever at databasen filtrerer, at mellomlagernøkkelen
inneholder bruker og fagmiljø, og at bytte av fagmiljø tømmer lageret.

### 2.10 Datasynker

(F) FEST/legemiddeldata, Farmakologiportalen, ClinPGx, PubChem og CPIC (stanset)
ligger i egne skjemaer uten rettigheter for nettleseren og leses bare gjennom
`security definer`-funksjoner. Dataene er offentlige og felles.
Farmakologiportalen har allerede en modell for laboratorier og institusjoner
(`farmakologiportalen.laboratorium`, `institusjon`, `analyse`), men det er
portalens laboratorier, ikke OUSFAR-fagmiljøer.
(A) Synkene trenger ingen endring utover at «admin» i `src/server/tilgang.ts`
skal bety systemarkitekt. FP-laboratoriene kan senere kobles til fagmiljøer
som et valgfritt felt, ikke som identitet.

### 2.11 Dokumentasjon og plan som ikke stemmer med koden

| Påstand | Hvor | Faktisk (F) |
| --- | --- | --- |
| Migrasjoner og Edge-funksjoner «rulles ut mot prosjektet med Supabase CLI eller MCP» | `docs/brukere.md`, «Oppsett og drift» | Migrasjonene rulles ut av GitHub Actions (`docs/migrasjoner.md`, `.github/workflows/produksjonsmigrering.yml`). Edge-funksjonene har **ingen** automatisk utrulling |
| De fire Edge-funksjonene | `docs/brukere.md` | Produksjonen har i tillegg `delt-test`, som ikke finnes i repoet. Om den kjørende koden for de fire er lik repoet, kan ikke bekreftes |
| Tabellene `laboratorieanalytter`/`analyttkomponenter` «står med sin historikk, men appen bruker dem ikke lenger til å finne eller lage sider» | `docs/faginnhold.md`, «Domenet» | Riktig for sidene, men fortolkningens referanseområder leses fortsatt gjennom dem (`les_referanseomrader`). De er en levende klinisk avhengighet |
| Plan #364 §6: realtime/sanntidskanaler må godkjennes | plan | Det finnes ingen sanntid i dag; kravet gjelder bare P7 |
| Plan #364 §3.4/§7: uavhengig faglig kontroll skal ikke kunne omgås | plan | Kontrollen er håndhevet i kurateringsgrenene for agenter, men en admin kan publisere direkte (`publiser_utkast`) og har alle kurateringsroller (`kuratering.krev_rolle`, `krev_leser`). Den er altså prosedyre, ikke teknisk sperre, for administratorer |
| Plan #364 §2: «Alle innloggede kan i dag lese alle profiler», «administratorer kan lese utkast» | plan | Stemmer |
| Plan #364 §6: labinterne data skal ikke ligge i statiske filer | plan | Dagens OUS-katalog gjør det (§2.5); kravet kan bare gjelde nytt innhold og en senere flytting |

(A) Rettingene av `docs/brukere.md` og `docs/faginnhold.md` gjøres i P1.1, der
dokumentene uansett må oppdateres; denne PR-en endrer bare rapportfilen.

---

## 3. Klassifisering av dagens innhold

| Ressurs | Forslag | Grunnlag | Krever faglig eiervurdering? |
| --- | --- | --- | --- |
| Fagsider/monografier (`infosider`, `innholdselementer`, `sideversjoner`, bivirkninger) | **Felles** | Stoffkunnskap uavhengig av laboratorium | Nei, men nasjonal redaksjonsmodell (Fag) |
| Referansebasen (`referanser`, `referansekoblinger`) | **Felles** | Global per definisjon | Nei |
| Stoffregisteret: stoffer, aliaser, kategorier | **Felles** | Identitet | Nei |
| Forbindelsesregisteret, legemiddeldata, FP, ClinPGx, PubChem | **Felles** | Offentlige kilder | Nei |
| Referanseområder på fagsiden (TDM) | **Felles**, men brukt lokalt | Står på fagsiden; leses av fortolkningen | **Ja**: om et laboratorium skal kunne ha eget referanseområde |
| Laboratorieanalytter: koder, analysemetoder, måleområder, aliaser (`analytter.json`, `antihypertensiver.json`, `aliaser.json`) | **Lokalt (opprinnelig fagmiljø)** | OUS-spesifikke koder og metoder | Nei for klassifiseringen; ja for deling senere |
| Stoff–analytt-koblinger (`stoffregister.json`, `analyttkoblinger`) | **Lokalt** | Koden er lokal; stoffet felles | Nei |
| Konsentrasjonsregelsett (`intervallregelsett`) og kommentarene de bruker | **Lokalt** | Laboratoriets fortolkning | Nei |
| Rusmoduler og scenarioregelsett | **Lokalt** | Samme | Nei |
| THC-syre: regelsett og tekster | **Lokalt**; motoren felles | Bygget fra OUS-regneark | **Uavklart**: kurvene og marginene kan være felles fagkunnskap, tekstene lokale |
| EtG/EtS: tekstene i koden | **Lokalt** (og må flyttes ut av koden før et nytt fagmiljø får modulen) | Klinisk output i statisk kode | Nei |
| Verktøyene i verktøymenyen | **Uavklart** | Eies av OUSFAR Verktøy | **Ja**, i Verktøy (§9) |
| Diskusjoner på fagsider | **Felles** | Fagsidene er felles | Nei |
| Diskusjoner på fortolkningssider | **Lokalt** | Gjelder lokale regler | Nei |
| Diskusjoner på stoffregisteret | **Felles** | | Nei |
| Idéer og planlagte oppgaver | **Felles** (appens utvikling) | | Nei |
| Endringslogg for appen | **Felles** | | Nei |
| Varsler, favoritter, innstillinger | **Personlig** | | Nei |
| Kurateringsgrener, kildesaker, verktøysperrer | **Felles forvaltning** (systemarkitekt/Fag/Verktøy) | | Nei |

«Lokalt» og «det opprinnelige fagmiljøet» betyr her **OUS Klinisk
farmakologi**: Peder har bestemt at alle nåværende fortolkningssystemer gjelder
bare det fagmiljøet (D1). Uavklart innhold behandles som utilgjengelig for
andre fagmiljøer, også OUS Rettstoksikologi (deny by default), men fortsetter å
virke for OUS Klinisk farmakologi.

---

## 4. Tilgangs- og angrepsflatematrise

Kolonnene: **Ressurs/handling → Inngang → Gjeldende tilgang → Ønsket tilgang →
Nødvendig endring → Risiko → Hvor det testes.** «Kant» betyr Vercel-veggen,
som bare beskytter selve apppakken; alle dataganger går direkte mot Supabase.
«DB-test» betyr en test med `som()` i `src/__tests__/hjelp/testdatabase.ts`.

| Ressurs/handling | Inngang | Gjeldende | Ønsket | Nødvendig endring | Risiko | Testes |
| --- | --- | --- | --- | --- | --- | --- |
| Les publisert fagside | `les_stoffer`, `les_stoffside`, tabellene, regel `tilstand='publisert'` | Alle innloggede | Alle aktive brukere | Legg til «aktiv bruker» | Lav | DB-test |
| Les utkast av fagside | samme | `er_admin()` | Felles redaktør for siden, systemarkitekt | Erstatt `er_admin()` med rettighetssjekk per objekt | Middels | DB-test |
| Lagre/publisere fagside | `lagre_utkast`, `publiser_utkast`, `kuratering_*` | Admin, eller kuratoragent | Tildelt felles redaktør etter kurateringsløpet; systemarkitekt | `intern.krev_rett(objekt, handling)`; publisering fortsatt via Fags kontroll | **Høy** (nasjonal publisering) | DB-test |
| Les regelsett/kommentar (lokal) | `les_intervallregelsett`, `finn_intervallregelsett`, `les_scenarioregler`, `les_thc_regelsett`, `les_kommentarer`, regel `tilstand='publisert' or er_admin()` | Alle innloggede ser alle | Medlemmer av eierfagmiljøet | Rekkevidde per objekt; regelen sjekker medlemskap | **Høy** (lekkasje og feil fortolkning) | DB-test A↔B |
| Lagre/publisere regelsett | `lagre_intervallregelsett`, `lagre_scenarioregelsett`, `lagre_thc_regelsett`, `publiser_utkast` | Admin | Lokal redaktør for ressursen, lokal admin i eget fagmiljø | Rettighetssjekk; rekkevidde kan ikke endres i samme kall | **Høy** | DB-test, også med fremmed objekt-ID |
| Velge regelsett i fortolkningen | klient (`usePubliserteRegler`), statisk katalog | Etter kode, globalt | Etter kode **og** aktivt fagmiljø; stopp ved mangel | Unike nøkler med fagmiljø; lesing fra databasen filtrert | **Høy** (klinisk) | Paritetstester + «ny lab får stopp» |
| Historikk og revisjoner | `les_historikk`, `objekthistorikk`, `objektrevisjoner` (regel), `les_endringslogg` | Publiserte revisjoner for alle; alt for admin | Som lesing av objektet | Gjenbruk rettighetssjekken i reglene | Middels (historikk lekker) | DB-test |
| Publiseringsoversikt | `objektpubliseringer` (SELECT `true`) | Alle ser alle publiseringer, med navn | Som lesing av objektet | Ny regel | Middels (metadata) | DB-test |
| Sideversjoner | `sideversjoner` (SELECT `true`), `les_sideversjon*` | Alle | Felles: alle | Ingen så lenge bare felles | Lav | — |
| Søk i kunnskapsbasen | `les_stoffer`, `les_*sok`, IndexedDB | Alt publisert | Felles + eget lokalt | Filtrering i DB; mellomlagernøkkel med fagmiljø | Middels | DB-test + enhetstest av nøkkel |
| Fortolkningssøk | statisk katalog | Alle koder | Eget fagmiljøs analytter | Katalogen fra DB per fagmiljø (P4) | Middels | Komponenttest |
| Varsel om publisering | utløser `objektpubliseringer_varsle` → `intern.varsle_publisering` | Alle profiler | Bare de som kan lese objektet | Mottakerliste filtrert på rettighet | Middels (eksistens lekker) | DB-test |
| Favorittvarsler | `intern.varsle_favoritter` | Etter favoritt | Uendret for felles sider | Ingen | Lav | — |
| Diskusjon: lese | `diskusjoner`, `diskusjonskommentarer` (SELECT `true`), `diskusjonsoversikt`, `diskusjonstraad` | Alle | Etter sidens/gruppens rekkevidde | Rekkevidde på tråden; regler | **Høy** for grupper | DB-test A/B/C |
| Diskusjon: endre andres tråd (tittel, flytte, arkivere) | `sett_diskusjonstittel`, `flytt_diskusjon*`, `arkiver_diskusjon` | Alle innloggede | Forfatter, moderator/ansvarlig, systemarkitekt | Rettighetssjekk i funksjonene | Middels | DB-test |
| Diskusjon: flytte til annen side | `flytt_diskusjon_til_side` | Alle | Bare innen samme rekkevidde | Kontroll av kilde- og målrekkevidde | **Høy** (kan flytte lokal tråd til felles side) | DB-test |
| Moderering | `skjul_i_diskusjon`, `vis_i_diskusjon`, `fjern_skjult_i_diskusjon`, `slett_diskusjon` | Admin globalt | Gruppeansvarlig i gruppen, lokal admin lokalt, systemarkitekt | Rettighetssjekk med rekkevidde | Middels | DB-test |
| Direktelenke | `direktelenke` (`security definer`) | Alle | Som lesing av målet | Sjekk før svar; samme svar for «finnes ikke»/«ingen tilgang» | **Høy** (forbi radsikkerheten) | DB-test |
| Idéer og oppgaver | `ideer`, `ideoversikt`, `idetraad`, `oppgave*` | Alle leser; admin styrer | Felles idéer: alle; gruppeidéer: medlemmer; oppgaver: systemarkitekt | `gruppe_id`; admin → systemarkitekt | Lav–middels | DB-test |
| Rydding av idéarkiv | `rydd_idearkiv` (`security definer`, ingen sjekk) | Alle kan utløse sletting av utgåtte arkiverte idéer | Bare systemarkitekt/jobb | Legg til sjekk | Lav | DB-test |
| Stoffregisteret: endre struktur | `opprett/endre/flytt/arkiver_stoffkategori`, `plasser_stoff`, `slett_stoff` | Alle innloggede | Redaktør for registeret, systemarkitekt | Rettighetssjekk | Middels (felles struktur) | DB-test |
| Profil: lese | `profiles` (SELECT `true`), `Forfatterkontekst` | Alle ser alle, med rolle | Eget fagmiljø og felles samhandlingspartnere; ikke rolle | Ny regel eller lesefunksjon med utvalgte felt | Middels (personvern) | DB-test |
| Profil: skrive egen | kolonnerettigheter, utløser | Egen rad, tre felt | Uendret | Ingen | Lav | Finnes (`brukersystem.test.ts`) |
| Profilbilde | bøtta `avatarer` | Alle leser alle; eier skriver | Som profil | Lesepolicy med rekkevidde | Lav | DB-test |
| Opprette bruker | Edge `opprett-bruker` | Admin | Lokal admin (i eget fagmiljø), systemarkitekt | Medlemskap opprettes i samme operasjon; fagmiljø fra den innloggedes myndighet | **Høy** | Edge-enhetstest + DB-test |
| Nytt passord | Edge `nytt-passord` | Admin på alle | Systemarkitekt. Lokal admin bare for en bruker hvis **eneste** aktive medlemskap er i eget fagmiljø, og som ikke er admin, redaktør med felles ansvar eller systemarkitekt | Kontoen er global i Auth: et passord gir tilgang til alle brukerens fagmiljøer. Sjekk av alle medlemskap og roller, ikke bare hierarkiet i eget fagmiljø | **Kritisk** (kontoovertakelse, også på tvers av fagmiljøer) | Edge-test, også med bruker i A og B |
| Rolle/administrator | Edge `sett-rolle` | Admin på alle andre | Systemarkitekt utpeker lokale admin; ingen fjerner siste admin | Erstattes av medlemskaps-/administratorfunksjoner | **Kritisk** (privilegieheving) | Edge-test + DB-test |
| Avslutte medlemskap | — (finnes ikke) | — | Lokal admin i eget fagmiljø | Status på medlemskapet i A; radsikkerheten sjekker aktivt medlemskap per fagmiljø. Berører ikke brukerens medlemskap i B | **Høy** (avsluttede beholder tilgang) | DB-test, også med bruker i A og B |
| Sperre kontoen (Auth) | — (finnes ikke) | — | Systemarkitekt; automatisk når siste aktive medlemskap avsluttes | Sperring i Auth og ugyldiggjøring av økter er kontoglobal og skal aldri utløses av en lokal admin mens brukeren har andre aktive medlemskap | **Høy** (lokal admin stenger ute fra B) | DB-test + Edge-test + manuell |
| Synker og kildeovervåking | `api/*`, `src/server/tilgang.ts` | Cron, GitHub OIDC, admin | Cron, OIDC, systemarkitekt | `er_admin()` → systemarkitekt | Lav | Eksisterende tester |
| Kuratering | `kuratering_agent`, `kuratering_admin`, `api/kuratering*.ts` | Agentnøkkel med roller; admin = alle roller | Agentnøkkel; systemarkitekt for administrasjon; felles redaktør får ikke kontrollørrollen automatisk | Skill administrasjon fra faglige roller | Middels | DB-test |
| Verktøysperrer og kildesaker | `sett_verktoysperre`, `beslutt_fagsak` m.fl. | Admin | Systemarkitekt (og etter Verktøys behov) | `er_admin()` → systemarkitekt | Lav | Eksisterende |
| Apppakken | `middleware.ts` | Gyldig JWT | Uendret; ikke en datagrense | Ingen. Lokale data aldri i pakken | Middels | `kontroller-vegg.mjs` |
| Mellomlager i nettleseren | IndexedDB | Per nettleser, tømmes ved utlogging | Per bruker og fagmiljø | Nøkkel og tømming | Lav | Enhetstest |
| Sanntid | — | Ingen | Privat kanal med medlemskap (P7) | Nybygg | — | P7 |
| Filer | — (bare avatarer) | — | Privat bøtte per gruppe (P8) | Nybygg | — | P8 |

**Negative scenarier som skal stå i testene (A):** A leser B sitt regelsett
direkte i tabellen, via `les_*`, via `direktelenke`, via historikk og via
varsel; A-admin gir nytt passord til en B-bruker, til en systemarkitekt og til
en annen A-admin; A-admin gjør seg selv eller en annen til systemarkitekt eller
nasjonal redaktør; lokal admin fjerner siste admin; en fjernet gruppedeltaker
leser tråden, kommentarene, varselet og direktelenken; en tråd flyttes fra en
lokal fortolkningsside til en felles fagside; en redaktør lagrer et objekt med
en annen rekkevidde enn det har; en deaktivert bruker med gyldig token
leser og skriver.

---

## 5. Datamodell og rettigheter

### 5.1 Logisk datamodell (A)

Tabellnavnene er forslag. Alt nytt er additivt; ingenting eksisterende
endrer betydning før P2.

| Objekt | Felt (hovedtrekk) | Integritet |
| --- | --- | --- |
| `fagmiljoer` | `id` uuid, `nokkel` (unik, maskinlesbar), `navn`, `status` (aktiv/arkivert), `opprettet_kl`, `opprettet_av` | Bare systemarkitekt oppretter/arkiverer |
| `medlemskap` | `bruker_id` → `profiles`, `fagmiljo_id`, `status` (aktiv/invitert/deaktivert), `primaer`, `fra`, `til`, `tildelt_av` | Høyst ett aktivt primærmedlemskap per bruker (delvis unik indeks); ingen sletting, bare status |
| `systemroller` | `bruker_id`, `rolle` (`systemarkitekt`), `tildelt_av`, `tildelt_kl`, `tilbakekalt_kl` | Bare systemarkitekt tildeler; ingen kan tilbakekalle siste |
| `fagmiljoadministratorer` | `bruker_id`, `fagmiljo_id`, `tildelt_av`, `fra`, `til` | Krever aktivt medlemskap; minst én aktiv per aktivt fagmiljø (utsatt kontroll i transaksjonen) |
| `ressursomfang` | `objekt_id` → `redigerbare_objekter`, `omfang` (`felles`/`fagmiljo`/`gruppe`), `fagmiljo_id`, `gruppe_id` | Nøyaktig én rad per objekt; `check` på at feltene passer omfanget. Egen tabell fordi `redigerbare_objekter` er uforanderlig (utløser `redigerbare_objekter_uforanderlig`) |
| `redaktortildelinger` | `bruker_id`, enten `objekt_id` eller et `omrade` (f.eks. alle fagsider, ett fagmiljøs fortolkning), `rettigheter` (rediger/godkjenn forslag), `tildelt_av`, `fra`, `til`, `tilbakekalt_kl` | Den som tildeler, må ha myndighet over målet (kontroll i funksjonen) |
| `endringsforslag` (P5) | `objekt_id`, `grunnrevisjon`, `forslag` (jsonb), `begrunnelse`, `kilder`, `status`, `stilt_av`, `vurdert_av`, `revisjon` (lenke til utkast/publisering) | Godkjent forslag lager et utkast, aldri publisering. Konflikt hvis objektets revisjon er endret |
| `grupper` (P6) | `id`, `navn`, `beskrivelse`, `art` (intern/tverrfaglig), `fagmiljo_id` for intern, `opprettet_av`, `status` | |
| `gruppemedlemskap` (P6) | `gruppe_id`, `bruker_id`, `rolle` (medlem/moderator/ansvarlig), `status`, datoer | Minst én ansvarlig per aktiv gruppe |
| `tilgangslogg` | `id`, `kl`, `aktor`, `handling`, `mal`, `data` | Uforanderlig, samme mønster som `innholdshendelser` (`intern.avvis_endring`) |

**Gjenbruk i stedet for parallelle lagre (A):**
`redigerbare_objekter`/`objektrevisjoner`/`objektpubliseringer` er fortsatt
eneste innholdshistorikk (ingen kopi). Diskusjonene og idéene får rekkevidde
(`omfang`, `fagmiljo_id`, `gruppe_id`) som kolonner i de eksisterende tabellene
i stedet for nye gruppefora. `intern.varsle()` beholdes; bare
mottakerlistene filtreres. `kuratering.*` beholdes som Fags løp for felles
fagsider.

**Den felles rettighetsfunksjonen (A).** Én funksjon i `intern`, for eksempel
`intern.har_rett(handling, objekt_id)` og `intern.kan_lese_omfang(omfang,
fagmiljo_id, gruppe_id)`, `stable security definer`, som alle regler og
skrivefunksjoner kaller. Radsikkerheten blir da
`(tilstand = 'publisert' and (select intern.kan_lese(objekt_id))) or (select intern.har_rett('rediger', objekt_id))`.
Ytelse: kallene pakkes i `(select …)` slik dagens regler gjør med `er_admin()`,
og `ressursomfang(objekt_id)` og `medlemskap(bruker_id) where status = 'aktiv'`
indekseres.

**Hvor metadata eller radsikkerhet alene ikke er nok (F/A):**

1. De unike nøklene per kode (§2.6) må endres: krever ny nøkkel med
   fagmiljø, ikke bare en ny kolonne.
2. Den statiske katalogen og EtG-tekstene må flyttes til databasen før et
   nytt fagmiljø får egne analytter; radsikkerhet beskytter ikke en JSON-fil.
3. `security definer`-funksjonene leser forbi radsikkerheten og må endres én
   for én.
4. Edge-funksjonene må få ny myndighetsmodell (hierarki), ikke bare ny rolle.
5. Varslene lages i utløsere som kjører med forhøyede rettigheter og må selv
   filtrere mottakere.

### 5.2 Rettighetsmatrise (A)

«Eget» = eget fagmiljø; «tildelt» = eksplisitt redaktøransvar. Systemarkitekten
kan alt, alltid loggført, og publisering av felles fagsider går fortsatt
gjennom Fags kontroll.

| Handling | Vanlig bruker | Lokal redaktør | Felles redaktør | Lokal admin | Gruppeansvarlig | Systemarkitekt |
| --- | --- | --- | --- | --- | --- | --- |
| Lese publisert felles innhold | Ja | Ja | Ja | Ja | Ja | Ja |
| Lese eget publisert lokalt innhold | Ja | Ja | Ja (som medlem) | Ja | Ja (som medlem) | Ja |
| Lese et annet fagmiljøs lokale innhold | Nei | Nei | Nei | Nei | Nei | Ja |
| Lese utkast | Nei | Tildelt | Tildelt | Eget lokalt | Nei | Ja |
| Foreslå endring | Det man kan lese | Ja | Ja | Ja | Ja | Ja |
| Redigere utkast | Nei | Tildelt lokalt | Tildelt felles | Eget lokalt | Nei | Ja |
| Godkjenne forslag | Nei | Tildelt | Tildelt | Eget lokalt | Nei | Ja |
| Publisere | Nei | Tildelt lokalt, etter påkrevd kontroll | Tildelt felles, etter Fags kontroll | Eget lokalt, etter påkrevd kontroll | Nei | Etter samme kontroll |
| Endre rekkevidde (lokalt → felles) | Nei | Nei | Nei | Nei | Nei | Ja, loggført, med forhåndsvisning |
| Tildele lokal redaktør | Nei | Nei | Nei | Eget | Nei | Ja |
| Tildele felles redaktør | Nei | Nei | Nei | Nei | Nei | Ja |
| Legge til/avslutte medlemskap | Nei | Nei | Nei | Eget fagmiljø (ikke admin/systemarkitekt) | Nei | Ja |
| Nytt passord (kontoglobalt) | Nei | Nei | Nei | Bare brukere med eneste aktive medlemskap i eget fagmiljø, uten admin- eller felles roller | Nei | Ja |
| Sperre konto i Auth (kontoglobalt) | Nei | Nei | Nei | Nei (skjer automatisk når siste medlemskap avsluttes) | Nei | Ja |
| Utpeke/fjerne lokal admin | Nei | Nei | Nei | Nei | Nei | Ja (ikke siste) |
| Opprette/arkivere fagmiljø | Nei | Nei | Nei | Nei | Nei | Ja |
| Tildele systemarkitekt | Nei | Nei | Nei | Nei | Nei | Ja (ikke seg selv bort som siste) |
| Opprette lokal gruppe | Nei | Nei | Nei | Eget | — | Ja |
| Opprette tverrfaglig gruppe | Nei | Nei | Nei | Nei | — | Ja (kan delegeres senere) |
| Lese gruppeinnhold | Som medlem | Som medlem | Som medlem | Som medlem | Ja | Ja |
| Invitere/fjerne gruppemedlem | Nei | Nei | Nei | Nei | Egen gruppe | Ja |
| Moderere | Nei | Nei | Nei | Eget fagmiljøs lokale sider | Egen gruppe | Ja |
| Endre stoffregisterets struktur | Nei | Nei | Tildelt (registeret) | Nei | Nei | Ja |
| Starte synk, verktøysperre, kildesak | Nei | Nei | Nei | Nei | Nei | Ja |

Avvik fra plan #364 §4 (A): redaktøren får egen kolonne for lokalt og felles,
og stoffregisteret og nytt passord er lagt til, fordi de i dag er vide
innganger.

---

## 6. Revidert rekkefølge, migrering, sikkerhetsporter og tester

### 6.1 Kommentarer til P1–P9

| Etappe | Tekniske forutsetninger og avhengigheter (F/A) | Forslag |
| --- | --- | --- |
| **P1** Fagmiljø, medlemskap, rollegrunnlag | Additivt mulig uten atferdsendring. `er_admin()` beholder betydningen til P2 | Del i **P1.1** (tabeller, tilbakefylling, katalogtester; §8) og **P1.2** (herding av adminoperasjonene: hierarki for nytt passord og rolle, ingen fjerning av siste admin, deaktivering i stedet for sletting, `delt-test` fjernet eller forklart, automatisk utrulling av Edge-funksjonene) |
| **P2** Rettighetsmotor | 39 regler, 92 `security definer`-funksjoner og 3 Edge-funksjoner. Størst i volum | Del per område: (a) faginnhold og regler, (b) samhandling og varsler, (c) profiler og bilder, (d) register og administrasjon. Hver del med negative tester. `er_admin()` blir «systemarkitekt eller (overgang) dagens admin» til alle kall er byttet |
| **P3** Administrasjon og livssyklus | Krever P1.2s hierarki | Uendret; deaktivering bør ligge i P1.2 fordi den mangler i dag |
| **P4** Felles/lokal ressursmodell | **Undervurdert i planen.** Unike nøkler per kode, statisk katalog, EtG i koden, referanseområder via fagsiden | Del i **P4a** (rekkevidde på alle eksisterende objekter, alt lokalt til opprinnelig fagmiljø, uten atferdsendring), **P4b** (nøkler og lesing med fagmiljø, stopp uten regler, paritet), **P4c** (katalog og EtG-tekster flyttet fra klienten til databasen, uendrede verdier). P4 må være ferdig før noe eksternt fagmiljø får fortolkning |
| **P5** Delegert redigering og forslag | Avhenger av Fags faglige godkjenningsmodell for felles fagsider (§9) | Kan starte med lokale ressurser før felles |
| **P6** Grupper, forum og idéer | Avhenger bare av P2(b) og P3 | Kan gå **foran P4/P5** hvis samarbeid er prioritet; det berører ikke klinisk output |
| **P7** Chat | Ny sanntidsflate (ingen i dag) | Uendret |
| **P8** Filer | Ny bøtte og policy | Uendret; avhenger av D6 |
| **P9** Drift og pilot | Gratisplanen; ingen egen gjenopprettingsprøve | Sikkerhetskopi og gjenoppretting prøves før første eksterne bruker (D7) |

**Revidert rekkefølge (A):** P1.1 → P1.2 → P2(a–d) → P3 → P4a → P6 → P4b → P4c
→ P5 → P9 (pilot uten chat/filer) → P7 → P8. Ingen eksterne brukere før P2,
P3 og P4b er ferdige.

### 6.2 Migrering og kompatibilitet (A)

1. **Additivt først.** Nye tabeller, deretter tilbakefylling i egne
   datamigrasjoner med telling før og etter (antall profiler = antall
   medlemskap; antall redigerbare objekter = antall rader i
   `ressursomfang`).
2. **Ingen endret betydning i samme PR som ny struktur.** Regler og funksjoner
   byttes i egne PR-er etter at strukturen og dataene er på plass.
3. **Overgangsfunksjon.** `er_admin()` beholdes som navn, men defineres som
   `har systemrolle eller (overgang) role = 'admin'` til siste kall er byttet,
   og fjernes så i en egen, godkjent migrasjon.
4. **Unike nøkler (P4b).** Ny nøkkel med fagmiljø legges til før den gamle
   fjernes; den gamle fjernes først når alle data har fagmiljø og testene viser
   paritet. Fjerningen er en endring i sikkerhet/integritet og krever Peders ja
   etter `supabase/AGENTS.md`.
5. **Tilbakeføring.** Hver etappe kan tilbakeføres ved å sette funksjonene og
   reglene tilbake; de nye tabellene får stå. Ingen datatap i noen etappe før
   P4b. Migrasjonene rulles ut automatisk ved sammenslåing, så hver PR må være
   trygg alene.
6. **Kapasitet.** Nye regler måles mot dagens grunnlinje (`docs/db-maling.md`,
   `npm run db:maling`) før og etter P2, i testmiljøet.

### 6.3 Sikkerhetsporter (A)

| Port | Før | Krav |
| --- | --- | --- |
| S1 | P2 starter | P1.1 og P1.2 ferdige; katalogtestene grønne |
| S2 | Første medlem av et nytt fagmiljø får konto | P2 og P3 ferdige; full negativ matrise A↔B grønn; ingen `security definer`-funksjon uten erklært kontroll |
| S3 | Første fortolkning for et nytt fagmiljø | P4b ferdig; paritet for opprinnelig fagmiljø; stopp uten regler; ingen statiske lokale data for det nye fagmiljøet |
| S4 | Pilot med eksternt laboratorium | D5 (MFA), D7 (sikkerhetskopi/drift) og B9 avklart; uavhengig sikkerhetsgjennomgang |
| S5 | Chat / filer | Egen personvernvurdering (D6) |

### 6.4 Testspesifikasjon (A)

**Testgrunnlag.** Utvid `src/__tests__/hjelp/testdatabase.ts` med
`opprettFagmiljo`, `opprettMedlem` og en fast persongalleri-fabrikk: fagmiljø
A og B; vanlig bruker A og B; lokal admin A og B; lokal redaktør A (én
ressurs); felles redaktør; gruppeansvarlig G (tverrfaglig gruppe med A og B);
bruker C uten gruppe; deaktivert bruker A; systemarkitekt. Alt syntetisk.

**Katalogtester (vakt mot nye hull, fra P1.1):**

1. Alle tabeller i skjemaer nettleseren har tilgang til, har radsikkerhet.
2. Hver funksjon `authenticated` kan kalle, står i en liste med erklært
   kontroll (`innlogget`, `eier`, `rett:<handling>`, `systemarkitekt`,
   `felles-lesing`). En ny funksjon uten oppføring stopper testen.
3. Ingen regel bruker `role = 'admin'` direkte etter P2.

**Negative tilgangstester (P2–P8):** én test per rad i matrisen i §4, kjørt
for A mot B og B mot A, direkte i tabellen, gjennom hver funksjon, med fremmed
objekt-ID og med manipulert fagmiljø-ID. Selvheving: ingen kan gi seg selv eller
andre mer enn egen myndighet. Siste admin og siste systemarkitekt.
Deaktivering: deaktivert bruker med gyldig token får ingen data. Kontoglobale
operasjoner: lokal admin A kan verken gi nytt passord til eller sperre en
bruker som også er aktiv i B; avsluttet medlemskap i A lar tilgangen til B stå.

**Klinisk paritet (P4):** de eksisterende fasitene gjelder uendret og skal
kjøres for det opprinnelige fagmiljøet: `src/__tests__/fortolkningUendret.test.ts`,
`steg2regler.test.tsx`, `intervallregelsett.test.ts` (med
`src/__tests__/data/dagensgrenser.json`), `referanseomrader.test.ts`, THC-
og scenariotestene. Nye: (1) et nytt fagmiljø med samme kode får tydelig stopp,
ikke OUS-svaret; (2) to fagmiljøer med samme kode og ulike regler får hver sine;
(3) endring av en kommentar i A endrer ikke B; (4) endring av referanseområdet
på en felles fagside vises i A sin fortolkning bare slik det er besluttet.

**Grupper og varsler (P6–P8):** C ser verken tråd, kommentar, varsel, telling,
søketreff eller direktelenke; et fjernet medlem mister alt med én gang; varsel
om publisering går bare til dem som kan lese objektet.

**UX og drift:** de eksisterende komponenttestene og det lokale
testmiljøet (`docs/qa-testmiljo.md`, `apneTestmiljo()`), aldri omfattende
kjøringer mot produksjonen. Tastatur, smale skjermer og skjermleser for hver
ny flate. Hver PR: `npm test`, `npm run build`, kontrollen «Prosjektansvar» og
ChatGPT-kontroll.

---

## 7. B1–B9 og beslutningsliste for Peder

### 7.1 Planens beslutningspunkter

| Punkt | Hvem avgjør | Anbefaling |
| --- | --- | --- |
| **B1** Én primærtilknytning, flere teknisk mulig | Teknisk | Godta. Modellen i §5.1 gjør det |
| **B2** Bare systemarkitekter tildeler felles redaktører og lokale admin | Peder | Godta |
| **B3** Lokale regler til opprinnelig fagmiljø, monografier felles | Peder (og Fag for tvilstilfeller) | Godta, med klassifiseringen i §3; THC-kurvene og referanseområdene behandles som tvilstilfeller (D4) |
| **B4** «Åpent» = alle autoriserte; ingen pasientdata i samarbeid | Peder | Godta |
| **B5** Første pilot uten chat og filer | Peder | Godta; grupper med forum kan komme før redaktørflyten (§6.1) |
| **B6** Én database | Teknisk, med kostnad til Peder | Godta for pilot, under portene i §6.3 og D7 |
| **B7** Sletting = deaktivering | Teknisk | Godta; nødvendig fordi sletting i dag sletter idéer og kommentarer i kaskade og stoppes av verktøybeslutninger (§2.3). Rutine for endelig sletting av persondata avklares separat |
| **B8** `peohol` og `maxhag` som systemarkitekter | Peder | Se D2 |
| **B9** Organisasjon, drift, avtaler, autentisering, finansiering før eksterne | Peder/organisasjon | Obligatorisk pilotport (S4) |

### 7.2 Det som bare Peder kan avgjøre

Hvert punkt har et anbefalt standardvalg. D1 og D2 er besvart av Peder
13.11.2026 (i prosjekttråden); resten er ikke besluttet.

| Nr. | Spørsmål | Anbefalt standardvalg | Trengs før |
| --- | --- | --- | --- |
| **D1** | Hva skal det opprinnelige fagmiljøet hete i appen? | **Besluttet:** «OUS Klinisk farmakologi». Alle nåværende fortolkningssystemer gjelder bare dette fagmiljøet. I tillegg opprettes «OUS Rettstoksikologi». Alle nåværende medlemmer unntatt `maxhag` tilhører OUS Klinisk farmakologi; `maxhag` tilhører OUS Rettstoksikologi | P1.1 |
| **D2** | Bekreft at kontoene `peohol` og `maxhag` tilhører de tiltenkte personene, og si ja til at begge blir systemarkitekter | **Besluttet:** Peder bekrefter at `peohol` er hans konto og `maxhag` Max sin. Begge blir systemarkitekter, som i visjonen #363; tildelingen gjøres på konto-ID, ikke brukernavn | P1.1 (registrering), P1.2 (rettighetene tas i bruk) |
| **D3** | Hva skjer med dagens øvrige administrator(er)? | De blir lokale administratorer i det opprinnelige fagmiljøet, ikke systemarkitekter, etter gjennomgang med Peder | P2 |
| **D4** | Er THC-kurvene/marginene og TDM-referanseområdene felles fagkunnskap eller laboratoriets valg? | Behandles som lokale til Fag har vurdert dem | P4b |
| **D5** | Skal systemarkitekter og administratorer ha tofaktorinnlogging før eksterne brukere? | Ja | S4 |
| **D6** | Regler for filer og chat (pasientdata, lagringstid, moderering) | Utsettes; filer og chat av til avklart | P7/P8 |
| **D7** | Drift før pilot: sikkerhetskopi/gjenoppretting og kapasitet (prosjektet står på gratisplanen, og Peder har sagt nei til oppgradering nå) | Oppgradering eller annen dokumentert gjenoppretting vurderes før S4, ikke før | S4 |
| **D8** | Skal idéene om appen og de planlagte oppgavene fortsatt være felles for alle brukere? | Ja for idéene; oppgavene bare for systemarkitekter | P2(b) |

Det som kan avgjøres teknisk (B1, B6, B7, modellen i §5, rekkefølgen i §6)
er anbefalt, men ikke gjennomført.

---

## 8. Første implementerings-PR: P1.1 «Rollegrunnlag uten atferdsendring»

**Ikke utført.** Beskrevet her slik at den kan bestilles uten ny strategirunde.

**Formål.** Legge grunnmuren for fagmiljø og systemroller uten at noen bruker
merker noe, og sette opp vaktene som hindrer nye hull.

**Innhold (minstekrav):**

1. Migrasjon: tabellene `fagmiljoer`, `medlemskap`, `systemroller`,
   `fagmiljoadministratorer` og `tilgangslogg` (§5.1), med radsikkerhet på, uten
   rettigheter for nettleseren ut over lesing av egne medlemskap, og med
   integritetskravene som `check`/unike indekser/utløsere.
2. Datamigrasjon (D1, D2):
   - fagmiljøene «OUS Klinisk farmakologi» (nøkkel `ous-klinisk-farmakologi`)
     og «OUS Rettstoksikologi» (`ous-rettstoksikologi`);
   - aktivt primærmedlemskap i OUS Klinisk farmakologi for alle profiler
     unntatt `maxhag`, og i OUS Rettstoksikologi for `maxhag`;
   - dagens administratorer som fagmiljøadministratorer i OUS Klinisk
     farmakologi, og `maxhag` som fagmiljøadministrator i OUS Rettstoksikologi,
     fordi et aktivt fagmiljø aldri kan stå uten administrator;
   - systemarkitektrollen for `peohol` og `maxhag`.

   Kontoene slås opp på ID, og migrasjonen stopper hvis de ikke finnes.
   Telling før og etter står i rapporten.
3. En ny konto får automatisk medlemskap i OUS Klinisk farmakologi
   (utvidelse av `paa_ny_auth_bruker`) frem til P3. En ny bruker i OUS
   Rettstoksikologi flyttes dit av en systemarkitekt med en kontrollert
   datamigrasjon, inntil P3 gir en brukerflate for det.
4. Katalogtestene 1 og 2 i §6.4, med dagens 123 funksjoner erklært slik de er.
5. Tester for invariantene: ingen bruker uten aktivt primærmedlemskap, ingen
   aktivt fagmiljø uten admin, ingen systemarkitekt uten konto, loggen kan ikke
   endres eller slettes.
6. Dokumentasjon: `docs/brukere.md` (ny modell og rettingene i §2.11) og en
   kort `docs/fagmiljoer.md`.

**Avgrensning.** Ingen endring i `er_admin()`, `krev_admin()`, noen
eksisterende regel, Edge-funksjon eller klientkode ut over typer. Ingen ny
brukerflate. Ingen klinisk data berøres.

**Akseptkriterier.**

- `npm test` og `npm run build` grønne; alle eksisterende tester uendret.
- Migrasjonen kjører i testdatabasen og er additiv (ingen destruktiv setning).
- Etter migrasjonen: antall aktive primærmedlemskap = antall profiler; alle
  unntatt `maxhag` er i OUS Klinisk farmakologi; antall
  fagmiljøadministratorer = antall administratorer + 1 (`maxhag` i OUS
  Rettstoksikologi); systemroller bare for `peohol` og `maxhag`.
- Katalogtestene feiler hvis en tabell uten radsikkerhet eller en ny funksjon
  uten erklært kontroll legges til (bevist med en negativ test).
- Ingen synlig endring i appen; ingen føring som varsles.

**Avhengigheter.** D1 og D2 er besvart. Det som gjenstår, er Peders bestilling av
etappen etter kontrollen av P0. Ingen avhengighet til Fag eller Verktøy.

**Merk om OUS Rettstoksikologi (F/A).** Fagmiljøet får ingen fortolkningsregler,
fordi alle nåværende gjelder OUS Klinisk farmakologi. Frem til P2/P4b håndhever
appen ikke rekkevidde, så medlemmer der ser og bruker fortsatt det samme som i
dag. Etter P4b får de tydelig stopp i fortolkningen, inntil de har egne regler
eller noe er delt eksplisitt med dem. `maxhag` er systemarkitekt og har tilgang
til alt uansett.

**Neste PR (P1.2, også før P2):** hierarki i `nytt-passord` og `sett-rolle`
(ingen kan gi nytt passord til eller endre rollen til noen med like høy eller
høyere myndighet, ingen fjerner siste admin; så lenge ingen har medlemskap i
mer enn ett fagmiljø, er regelen fra §4 om kontoglobale operasjoner oppfylt), avslutning
av medlemskap, sperring i Auth når siste medlemskap avsluttes, og sjekk av
aktiv bruker i `er_admin()`/`krev_admin()`,
automatisk utrulling av Edge-funksjonene, og opprydding av `delt-test`.

---

## 9. Behov hos OUSFAR Fag og OUSFAR Verktøy

Ingen Issues er opprettet; behovene er ikke modne som selvstendige oppgaver
før Peder har tatt stilling til §7. Når de blir det, overleveres de etter
`docs/prosjektansvar.md` §4.

**OUSFAR Fag (`ansvar:fag`):**

1. Faglig godkjenningsmodell for felles fagsider når redaktører fra flere
   fagmiljøer kan foreslå og redigere: hvem som er felles redaktør, og
   hvordan kurateringsløpet og den uavhengige kontrollen (`docs/kuratering-prosjekt.md`,
   `docs/kontrollorinstruks.md`) gjelder for forslag fra mennesker. Avhenger av
   P5s tekniske flyt. Dev bygger flyten, men definerer ikke kravene.
2. Vurdering av tvilstilfellene i §3: TDM-referanseområder og THC-kurver
   (D4).

**OUSFAR Verktøy (`ansvar:verktoy`):**

1. Om verktøyene i verktøymenyen skal være felles for alle fagmiljøer eller
   kunne tilpasses lokalt. Reglene og kildegrunnlaget ligger i dag statisk i
   klienten (`src/verktoy/regler/`, `src/data/verktoy/`) og i repoet. Avhenger
   av P2 og P4a; Dev bygger bare rettighets- og rekkeviddegrunnlaget.
2. Verktøysperrene og kildesakene (`sett_verktoysperre`, `beslutt_fagsak`)
   bruker i dag `er_admin()`; i P2 blir det «systemarkitekt». Verktøy avgjør om
   andre roller skal kunne sperre.
