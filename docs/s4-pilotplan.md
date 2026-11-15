# S4: sikker drift og ekstern pilot – gjennomføringsplan

**Status:** plan, 15.11.2026. Ingen migrasjoner, ingen endring i appen og
ingen endring i produksjonen; det eneste som er gjennomført, er tiltak 10 i
testoppsettet. Ingen ekstern pilot er åpnet.
**Grunnlag:** plan [#364](https://github.com/peohol/ousfar/issues/364) (§6,
§10 P9, §12, §15 B9), P0-rapporten
([ousfar-nasjonal-p0-kartlegging.md](ousfar-nasjonal-p0-kartlegging.md), §6.3
og §7), S2-rapporten ([s2-kontrollrapport.md](s2-kontrollrapport.md), §8.3 og
§9) og fremdriften i [#369](https://github.com/peohol/ousfar/issues/369).
**Eier:** OUSFAR Dev (`ansvar:dev`).

Merkingen følger P0-rapporten: **(F)** funn, kontrollert i kode eller
produksjon; **(A)** teknisk anbefaling; **(U)** antakelse som må avklares.

---

## 0. Sammendrag

Sikkerhetsporten **S4** står mellom dagens drift (to fagmiljøer i OUS) og den
første brukeren fra et laboratorium utenfor OUS. P0 satte tre krav: tofaktor
for de privilegerte (D5), sikkerhetskopi og drift (D7), og organisasjon,
avtaler og en uavhengig sikkerhetsgjennomgang (B9).

Kontrollen 15.11.2026 viser fire ting som betyr mest:

1. **Det finnes ingen sikkerhetskopi av produksjonsdatabasen (F).** Prosjektet
   står på Supabases gratisplan, som ikke tar daglige kopier; listen over
   kopier er tom og gjenoppretting til et tidspunkt er av. Kuratert
   faginnhold, revisjoner, kurateringsgrener, brukere, medlemskap og
   diskusjoner finnes bare der (§2.3). Dette gjelder allerede i dag, ikke
   bare for piloten, og er planens første prioritet. Peder har valgt egne
   krypterte kopier på gratisplanen (D7a, §3.2 valg b).
2. **Tofaktor er slått på i Supabase, men ikke tatt i bruk i appen (F).**
   Ingen av de 14 kontoene har en faktor, og ingen operasjon krever den.
   Teknisk kan alt bygges uten kostnad på dagens plan (§3.1).
3. **Innloggingen er svakere enn resten av tilgangsmodellen (F):** minst 6
   tegn i passordet, ingen kontroll mot lekkede passord, passordet kan byttes
   uten å oppgi det gamle, og appen sender ingen sikkerhetshoder som demper
   skriptinjeksjon, selv om økten ligger i en informasjonskapsel som skript
   kan lese (§2.1).
4. **Organisatorisk er alt knyttet til én person (F/U).** Supabase-, Vercel-
   og GitHub-kontoene står på Peders personlige kontoer, uten avtaler,
   behandlingsansvar eller supportordning beskrevet. Det må på plass før
   andre virksomheter inviteres (B9).

Planen i §4 deler tiltakene i **ti som Claude gjennomfører uten nye
beslutninger** og **tolv som krever Peders uttrykkelige ja**. Beslutningene står
samlet i §5 med anbefalt standardvalg. Porten S4 er passert når
akseptlisten i §6 er oppfylt og Peder har godkjent åpningen av det første
eksterne fagmiljøet gjennom startporten (S2-rapporten §8.4).

---

## 1. Hva «ekstern pilot» betyr

- Et **eksternt fagmiljø** er et fagmiljø der medlemmene arbeider i en annen
  virksomhet enn OUS. OUS Klinisk farmakologi og OUS Rettstoksikologi er
  interne.
- Piloten er **ett** eksternt laboratorium med et lite antall navngitte
  brukere (U: 3–10), uten pasientopplysninger (B4), uten chat og filer (B5),
  med felles fagsider, egne diskusjoner og grupper, og egne
  fortolkningsregler bare når de er lagt inn og godkjent for fagmiljøet.
- Det tekniske slippet er det samme som for S2: et fagmiljø åpnes bare med en
  egen migrasjon med Peders godkjenningsmerke (S2-rapporten §8.4). S4 legger
  ikke til et nytt automatisk vern; godkjenningen av åpningen skal vise til
  at listen i §6 er oppfylt.
- Før piloten må også de gjenstående Dev-punktene i
  [#395](https://github.com/peohol/ousfar/issues/395) være levert (kategorier
  per fagmiljø, kontoer opprettet direkte i riktig fagmiljø, datakort uten
  OUS-kode), og Fag- og Verktøy-punktene i #393 og #394 være avklart. De
  arbeides med i egne tråder og PR-er.

---

## 2. Kontrollert status 15.11.2026

Lest skrivebeskyttet fra Supabase Management API, Vercel-API-et, én
HEAD-forespørsel mot `ousfar.vercel.app` og repoet på `main` `7fdadf9`. Bare
aggregater og innstillinger; ingen persondata er hentet ut.

### 2.1 Innlogging og økt (F)

| Del | Status | Kilde |
| --- | --- | --- |
| Registrering | Av, og i tillegg sperret i databasen (`paa_ny_auth_bruker`, `kontoreservasjoner`) | Auth-innstillinger, `docs/brukere.md` |
| Innlogging | Brukernavn og passord; ingen e-post, ingen «glemt passord»; anonym innlogging av | Auth-innstillinger |
| Tofaktor | TOTP (autentiseringsapp) slått på i Supabase; telefon og WebAuthn av. **0 faktorer** registrert, og ingen kontroll av innloggingsnivå (`aal`) i databasen eller Edge-funksjonene | Auth-innstillinger, `auth.mfa_factors`, søk i `supabase/` |
| Passordregel | Minst **6** tegn i både app (`_delt/passord.ts`, `PASSORD_MINST`) og Supabase; ingen krav til tegn; kontroll mot lekkede passord **av** (krever betalt plan) | Auth-innstillinger, security-advisor |
| Passordbytte | Krever verken gjeldende passord eller ny innlogging (`security_update_password_require_current_password` og `…_reauthentication` av); appen kaller `updateUser` direkte | Auth-innstillinger, `src/auth/api.ts` |
| Økt | Tilgangstoken 3600 s, rotasjon av fornyingstoken på; ingen maksimal øktlengde eller utlogging ved inaktivitet (krever betalt plan) | Auth-innstillinger |
| Midlertidig passord | 16 tegn, gis bare av den som har myndighet (P1.2a) | `_delt/passord.ts`, `docs/fagmiljoer.md` |
| Sikkerhetshoder | Bare `Strict-Transport-Security`. Ingen `Content-Security-Policy`, `frame-ancestors`/`X-Frame-Options`, `X-Content-Type-Options` eller `Referrer-Policy`. Økten ligger i en informasjonskapsel som skript kan lese (`createBrowserClient`), så en skriptinjeksjon ville kunne lese tokenet | HEAD mot produksjonen, `vercel.json`, `src/auth/klient.ts` |
| Innloggingsveggen | Kanten slipper bare inn med gyldig signert token; ingen laboratoriegrense (uendret siden P0) | `middleware.ts` |
| Forhåndsvisninger i Vercel | Beskyttet med Vercel-innlogging for alt unntatt egne domener | Vercel-prosjektet |
| Revisjonslogg for Auth | Lagres ikke i databasen (`audit_log_disable_postgres`), bare i Supabases logger med kort oppbevaring på gratisplanen. Appens egen `tilgangslogg` dekker medlemskap, roller og kontooperasjoner | Auth-innstillinger |

### 2.2 Database og tilkoblinger (F)

| Del | Status |
| --- | --- |
| Plan og maskin | Gratisplan, Nano (0,5 GB minne), ingen tillegg; Postgres 17.6; region eu-north-1 (Stockholm) |
| Kvote | **437,6 MB av 500 MB** (sum av databasene, slik Supabase måler); stabil siden 7.11 (438,2 MB). Disken 2 GB, 1,3 GB ledig |
| Største områder | `kuratering` 142 MB, `legemiddeldata` 125 MB, `public` 68 MB, `datakilder` 32 MB |
| Sikkerhetskopi | `backups: []`, gjenoppretting til tidspunkt av; gratisplanen tar ingen daglige kopier (Supabase anbefaler egne kopier med `db dump`) |
| Direkte tilkoblinger | Åpne fra alle adresser (`0.0.0.0/0`); SSL er ikke påkrevd. Utrullingen av migrasjonene bruker direkte tilkobling fra GitHub Actions med databasepassordet, så en adressebegrensning ville stoppet den |
| Sikkerhetsråd (advisor) | 126 varsler om `security definer`-funksjoner innloggede kan kalle (alle står med erklært kontroll i `funksjonskontroller.ts` og testes, P1.1/P2.0), 1 om lekkede passord, 23 informasjonsmerknader om tabeller med radsikkerhet uten regler (bevisst lukkede) |
| Ytelsesråd | 3 varsler om flere tillatende regler på samme tabell; øvrige er informasjon (ubrukte indekser, fremmednøkler uten indeks) |
| Helse | Auth, database, REST og lagring friske; én gjentakende feil uten innlogging, `permission denied for table brukerinnstillinger` (~40 i timen siden 8.11, S2-rapporten §8.2; årsaken står i §2.4) |
| Lagring | Én privat bøtte (profilbilder), 4 filer, 105 kB. Filene er ikke med i en databasekopi |

### 2.3 Data som bare finnes i produksjonen (F)

En gjenoppretting må dekke det som ikke kan bygges opp igjen fra repoet eller
fra de offentlige kildene. Radtall er Postgres' estimater.

| Gruppe | Eksempler (rader) | Kan bygges opp igjen? |
| --- | --- | --- |
| Brukere og tilgang | `auth.users` 14, `profiles` 14, `medlemskap`, `fagmiljoadministratorer`, `systemroller`, `tilgangslogg` | **Nei** |
| Kuratert faginnhold | `objektrevisjoner` 11 308, `innholdselementer` 9 076, `referanser` 8 243, `referansekoblinger` 63 780, `sideversjoner` 398, `ressursomfang` 9 620 | **Nei** (bare den første importen ligger i migrasjonene) |
| Kurateringsgrener | `kuratering.grenrevisjoner` 748, `dokumenter` 1 808, `kommentarer` 5 402, `hendelser` 9 189 | **Nei** |
| Fortolkningsregler | `intervallregelsett` 120, `scenarioregelsett` 34, `thc_*`, analyttkatalogen | Delvis (importert fra repoet, deretter redigert i appen) |
| Samhandling | `diskusjoner`, `ideer` 15, `varsler` 79, grupper | **Nei** |
| Legemiddeldata og kildesynker | `legemiddeldata`, `farmakologiportalen`, `clinpgx`, `pubchem`, `bivirkninger` | Ja, fra kildene (synkene) |
| Profilbilder | 4 filer i Storage | Nei, men små og ikke kritiske |

### 2.4 Drift og organisasjon (F/U)

| Del | Status |
| --- | --- |
| Eierskap | Supabase-organisasjonen og Vercel-teamet («peohol's projects») og repoet `peohol/ousfar` står på Peders personlige kontoer (F). Om Max eller andre er medeiere, er ikke kontrollert (tokenet i miljøet kan ikke lese organisasjonen) (U) |
| Vercel-plan | Ikke kontrollert. Er det Hobby-planen, er den etter Vercels vilkår for personlig, ikke-kommersiell bruk (U) |
| Overvåking | Databasemålingen hver tredje time (`docs/db-maling.md`) og varsler fra GitHub Actions ved feil. Ingen oppetidsvarsling, ingen vaktordning |
| Tilbakeføring | Appen: tidligere Vercel-utrulling kan settes tilbake. Database: ny migrasjon (hver etappe har beskrevet tilbakeføring). Uten sikkerhetskopi finnes ingen vei tilbake etter tap eller ødeleggelse av data |
| Avhengigheter | Ingen kjente sårbarheter i pakkene som sendes til nettleseren; 12 i utviklingsverktøyene (`npm audit`, bl.a. vitest og vite) |
| Hemmeligheter | Produksjonsnøklene ligger som GitHub-miljøhemmeligheter (`produksjon`). Claude-miljøet har i tillegg den hemmelige nøkkelen, databasepassordet, et tilgangstoken til Supabase-kontoen og produksjonsadressen som miljøvariabler, altså full teknisk tilgang til produksjonen (F) |
| Tester mot produksjonen | Fordi produksjonsadressen står i Claude-miljøet, kontakter komponenttestene (`npm test`) den ekte databasen uten innlogging. Det er hele årsaken til den gjentakende feilen `permission denied for table brukerinnstillinger`: alle forespørslene har brukeragent `node` og klienten `createBrowserClient`, og spør etter innstillingen `redigering.teksthoyde` (Supabase-loggene 14.–15.11). I CI er adressen ikke satt, så der skjer det ikke (F). Rettet i denne PR-en (tiltak 10) |
| Personvern | Ingen behandlingsoversikt, personvernerklæring, databehandleravtaler eller avviksrutine er dokumentert i repoet (F). Appen behandler navn, brukernavn, profilbilder, fritekst i diskusjoner og idéer, tilgangslogg og øktdata (IP og nettleser i Auth); ingen pasientdata etter B4, men fritekst kan få det ved et uhell |

---

## 3. Vurdering per område

### 3.1 Tofaktorinnlogging (D5)

**Mål (A):** de som kan endre andres tilgang eller faginnhold, logger inn med
passord og en kode fra en autentiseringsapp. Det kan bygges på gratisplanen.

**Hvem (A):**

| Rolle | Krav før ekstern pilot | Begrunnelse |
| --- | --- | --- |
| Systemarkitekt | **Påkrevd** | Full myndighet overalt |
| Adminrollen (`role = 'admin'`) | **Påkrevd** | Skriver og publiserer faginnhold (`krev_admin`) |
| Lokal administrator | **Påkrevd** | Oppretter kontoer, gir passord og medlemskap |
| Redaktør (P5) | Påkrevd når rollen kommer | Endrer faginnhold |
| Gruppeansvarlig | Frivillig | Myndighet bare i egen gruppe, ingen kliniske ressurser |
| Vanlig bruker | Frivillig | Leser og deltar; kravet ville gitt mye støtte for lite gevinst |
| Testbrukeren for kuratorjobbene | Ikke aktuelt | Vanlig bruker uten myndighet, brukes av maskiner (`docs/kuratorjobber.md`) |

**Teknisk løsning (A):**

1. Innmelding under Konto: QR-kode og bekreftelseskode (Supabase `mfa.enroll`,
   `challenge`, `verify`), med mulighet for to faktorer per person (ny
   telefon).
2. Ved innlogging spør appen om koden når kontoen har en faktor, før noe
   annet vises.
3. **Serverkravet: privilegiene krever koden, medlemskapet gjør det ikke.**
   De samme predikatene brukes i dag både til lesing og til skriving, også i
   radsikkerheten: `public.er_admin()` i lesingen av stoffregisteret og i
   SELECT-regler, `public.er_systemarkitekt()` både i SELECT-regler
   (`20261114133000_rekkevidde_faginnhold.sql`) og i direkte
   INSERT/UPDATE/DELETE-regler (`20261114131500_systemrettigheter.sql`, for
   eksempel `autoerstatt_regler`). Et krav som bare ligger i RPC-ene og
   Edge-funksjonene, ville latt direkte tabellskriving gå på `aal1`. Kravet
   legges derfor i **den privilegerte grenen av hvert slikt predikat**, ikke i
   medlemskapskontrollen:
   - En felles kontroll `intern.privilegier_tilgjengelige()` er sann når
     tokenets `aal` er `aal2`, når kontoen ikke er i en rolle som krever
     tofaktor (tabellen over), eller når kravet ikke er slått på. Kall uten
     innlogget bruker (tjenestenøkkelen) behandles som i
     `intern.krev_aktivt_medlemskap()`.
   - Hvert predikat som gir mer enn vanlig medlemskap, kaller den i sin
     privilegerte gren: systemarkitekt (`er_systemarkitekt`,
     `krev_systemarkitekt`), adminrollen (`er_admin`, `krev_admin`), lokal
     administrator (`er_lokal_admin_i`, `krev_medlemskapsmyndighet`,
     `krev_myndighet_over`), redaktør- og registerrettene (`krev_redaktor`,
     `har_registerrett`, `krev_endringsrett`, `kan_endre_*`), moderering
     (`kan_moderere_diskusjonsside`, `krev_moderering`), idé- og
     gruppemyndighet (`krev_idevalg_admin`, `krev_gruppemyndighet`) og
     kuratering (`kuratering.krev_rolle`). Listen fastsettes fra katalogen,
     ikke for hånd (punkt 6).
   - Virkningen: en konto som krever tofaktor, har på `aal1` nøyaktig
     rettighetene til et vanlig medlem. Lesing som medlem (fagsider,
     fortolkning, diskusjoner, egne grupper) er uendret. Privilegert lesing
     (utkast, medlemslister, tilgangslogg, stoffregister) og all privilegert
     skriving, gjennom RPC, Edge og direkte i tabellene, krever `aal2`.
     Edge-funksjonene bruker tjenestenøkkelen etter at databasen har avgjort
     myndigheten med den innloggedes ID; de må derfor sende tokenets `aal`
     med til myndighetskontrollen (`hentInnlogget`, `kontooperasjon_*`), så
     den ikke ser et tjenestekall.
4. **Tapt telefon før D5b:** inntil Peder har bestemt hvem som kan nullstille
   en annens faktor (D5b), kan bare personen selv fjerne sin egen faktor, og
   bare på `aal2`. Nullstilling av andres faktor og nødveien for den siste
   systemarkitekten er et eget tiltak etter D5b (tiltak 7b). Anbefalt i D5b:
   den som etter hierarkiet kan gi nytt passord (P1.2a), loggført i
   `tilgangslogg`, og for den siste systemarkitekten en nødvei med den
   hemmelige nøkkelen, som `npm run bootstrap:admin`.
5. **Påslag:** kravet slås på i en egen migrasjon etter Peders ja (D5a),
   først når alle som omfattes har meldt inn en faktor, slik at ingen stenges
   ute. Før det er `intern.privilegier_tilgjengelige()` alltid sann.
6. **Dekning fra katalogen:** testene henter listen over privilegerte
   innganger fra den eksisterende katalogen (`funksjonskontroller.ts`,
   `tilgangsinnganger.ts`) og fra `pg_policies` for hver regel som bruker et
   av predikatene i punkt 3. En ny privilegert funksjon eller regel uten
   negativ `aal1`-test stopper testen, slik katalogtestene i P1.1 gjør.

**Akseptkriterier:** med kravet slått på gir et gyldig token på `aal1` for
en konto som krever tofaktor avslag på hver privilegert inngang: hver
privilegert RPC, hver Edge-funksjon for kontooperasjoner, og direkte
INSERT, UPDATE og DELETE i hver tabell der en skriveregel bruker et
privilegert predikat; privilegert lesing gir ingen rader. Det samme tokenet
leser fortsatt det et vanlig medlem kan lese. `aal2` slipper gjennom.
Dekningen kommer fra katalogen (punkt 6). Innlogging uten faktor er uendret
for vanlige brukere; innmelding og kodesteg fungerer med tastatur og
skjermleser; alle privilegerte kontoer har faktor før kravet slås på; etter
tiltak 7b følger nullstilling hierarkiet og loggføres.

### 3.2 Sikkerhetskopi og gjenoppretting (D7)

**Mål (A):** et tap av databasen skal ikke koste mer enn ett døgns arbeid
(RPO ≤ 24 t), og appen skal kunne være i drift igjen innen én arbeidsdag (RTO
≤ 8 t), bevist med en dokumentert gjenopprettingsprøve.

**Hva en fullstendig kopi må inneholde (F, etter Supabases dokumentasjon):**
databasen i `public`, `intern`, `kuratering` og de andre egne skjemaene;
**Auth-dataene** (`auth.users` med passordhashene, `auth.identities`,
`auth.mfa_factors`), uten dem kan ingen logge inn etter gjenopprettingen;
migrasjonshistorikken (`supabase_migrations`); **profilbildene i Storage**,
som aldri er med i en databasekopi; **OUSFARs egne tilpasninger i `auth` og
`storage`** (se under); og Auth-innstillingene i §2.1, som står i prosjektet
og ikke i databasen. Hemmelighetene (JWT-nøkkel, API-nøkler) følger ikke med;
et nytt prosjekt får nye, og alle må logge inn på nytt.

**Tilpasningene i `auth` og `storage` (F, A):** strukturen i disse skjemaene
eies av Supabase og er ikke med i `supabase db dump`, og Supabases veiledning
sier at egne endringer der må gjenopprettes for seg. OUSFAR har slike:
utløseren `paa_ny_auth_bruker` på `auth.users`
(`20260922092042_profiler_og_roller.sql`), som lager profilen og kontrollerer
myndigheten når en konto opprettes, og reglene for profilbildene på
`storage.objects` (`20260922101921_profilbilder.sql`, endret i
`20260922115504` og `20261114130000`). Uten dem slutter kontoopprettelsen og
profilbildene å virke, selv om alle data er på plass. Metoden:

1. **Hentes fra katalogen, ikke fra migrasjonene.** Kopiverktøyet leser ved
   hver kopi alle egne utløsere (`pg_trigger` uten `tgisinternal`) og alle
   regler (`pg_policy`) på tabeller i `auth` og `storage`, og tilganger
   (`GRANT`) som appens roller har fått der, og skriver dem som en fjerde
   fil, `tilpasninger.sql`, med `pg_get_triggerdef` og reglenes uttrykk fra
   `pg_get_expr`. Funksjonene utløserne kaller (som
   `public.handter_ny_auth_bruker`), ligger i egne skjemaer og er alt med i
   strukturfila. Slik følger det med som faktisk står i produksjonen, også
   det som er endret av senere migrasjoner, og ingen migrasjon kjøres to
   ganger.
2. **Rekkefølgen ved gjenoppretting:** roller, struktur, data (med
   `session_replication_role = replica`, så utløserne ikke slår til under
   innlastingen), deretter `tilpasninger.sql`, deretter
   migrasjonshistorikken. Historikken legges tilbake **som data, slik den
   står i kilden** (`supabase_migrations.schema_migrations`); den skrives
   aldri for hånd, og migrasjonene kjøres ikke på nytt.
3. **Det som ikke ligger i databasen** gjenskapes fra repoet og
   manifestet: Edge-funksjonene rulles ut fra `main` med den vanlige
   arbeidsflyten mot det nye prosjektet; Storage-bøttene følger med som rader
   i `storage.buckets`, filene kopieres for seg; Auth-innstillingene settes
   fra JSON-fila; **navnene** på Edge-hemmelighetene og Vercel-variablene
   står i manifestet (aldri verdiene), og verdiene settes på nytt av eieren.
4. **Kontrollen er generell:** etter gjenopprettingen sammenlignes listen
   over egne utløsere, regler og tilganger i `auth` og `storage` med
   manifestet fra kilden. Avvik i noen retning stopper prøven, så en ny
   tilpasning i en senere migrasjon blir med uten at verktøyet må endres.

| Valg | Kopiering | Gjenoppretting og prøve | Ulemper |
| --- | --- | --- | --- |
| a. Supabase Pro | Supabases daglige fysiske kopi av hele databasen, også `auth` og migrasjonshistorikken, i 7 dager. Profilbildene kopieres i tillegg med et skript mot Storage-API-et (4 filer i dag), og Auth-innstillingene lagres som JSON fra Management API-et (ingen hemmeligheter) | Prøven gjøres ved å gjenopprette en daglig kopi til **et nytt, midlertidig prosjekt** (Supabases «restore to new project»), aldri over produksjonen. Ved et reelt tap gjenopprettes produksjonen fra dashbordet, med nedetid så lenge det tar | Om lag 25 USD i måneden (inkluderer 10 USD til maskinen, som dekker Micro), og en kort ekstra kostnad for det midlertidige prosjektet under prøven. Gir også 8 GB, kontroll mot lekkede passord, øktgrenser og 7 dagers logger |
| **b. Gratisplan og egen kopi (valgt av Peder 15.11.2026)** | Supabases dokumenterte CLI-metode i tre deler: `supabase db dump --role-only`, `supabase db dump` (struktur) og `supabase db dump --data-only --use-copy` (data, også for `auth`; strukturen til `auth` og `storage` er Supabases egen og tas ikke med), migrasjonshistorikken for seg, profilbildene og Auth-innstillingene som i a. Alt pakkes og krypteres før det lagres utenfor Supabase | Gjenopprettes i **et Supabase-miljø**, ikke i en ren Postgres, fordi `auth` og `storage` må finnes fra før: det lokale testmiljøet i Docker (`docs/qa-testmiljo.md`) for prøven, et nytt Supabase-prosjekt ved et reelt tap. `psql --single-transaction` med `session_replication_role = replica` under dataene, slik veiledningen sier, og tilpasningene i `auth` og `storage` etter dataene (over) | Ny automatisk jobb; repoet er offentlig, så kopien (med passordhasher og tofaktornøkler) må krypteres sterkt og nøkkelen ligge utenfor GitHub; noen må eie nøkkelen; løser ikke kvoten |
| c. Begge | a, og i tillegg en månedlig kryptert kopi etter b utenfor Supabase | Som a og b | Mest arbeid; vern også mot at Supabase-kontoen går tapt |

**Gjenopprettingsprøven (A):** kopien gjenopprettes i det midlertidige
miljøet for valget over, og det kontrolleres at

1. radtall og kontrollsummer stemmer med kilden for tabellene i §2.3,
   **også `auth.users`, `auth.identities` og `auth.mfa_factors`**;
2. migrasjonshistorikken er lik `main`;
3. profilbildene finnes og kan hentes;
4. **testbrukeren for kuratorjobbene logger inn** med sitt vanlige passord
   mot det gjenopprettede miljøet, og en fagside og en fortolkning kan vises
   (det beviser at passordhashene og Auth fulgte med);
5. listen over egne utløsere, regler og tilganger i `auth` og `storage` er
   lik manifestet fra kilden (metoden over, punkt 4);
6. **en ny, syntetisk bruker opprettes gjennom adminflyten** (Edge-funksjonen
   `opprett-bruker`, utrullet fra `main` til det gjenopprettede miljøet), får
   profil og riktig medlemskap av utløseren, og kan logge inn; et forsøk uten
   myndighet avvises som i produksjonen;
7. **rettighetene til profilbildene virker:** den syntetiske brukeren kan
   laste opp, bytte og fjerne sitt eget profilbilde, men ikke en annens, og
   ser bare profilbildene reglene tillater; et eksisterende profilbilde kan
   hentes;
8. tiden fra start til innlogging er målt.

Den syntetiske brukeren lages bare i det midlertidige miljøet og slettes med
det.

Kopien inneholder persondata og slettes sammen med miljøet etter prøven. Tid
og resultat føres i `docs/drift-gjenoppretting.md`.

**Akseptkriterier:** valgt løsning i drift; verktøyet og rutinen er prøvd med
syntetiske brukere i det lokale testmiljøet (tiltak 2); én vellykket,
dokumentert prøve med en ekte kopi etter punkt 1–8 (tiltak 4); rutinen
beskriver hvem som kan sette i gang en gjenoppretting.

### 3.3 Uavhengig sikkerhetsgjennomgang (B9)

Plan #364 §6 krever uavhengig kontroll ved milepæler. ChatGPT og Codex har
kontrollert hver PR, men ingen har gått gjennom helheten utenfra.

1. **Intern, adversarial gjennomgang først (A, uten beslutning):** en egen
   agent som ikke har implementert, går gjennom løsningen mot de relevante
   delene av OWASP ASVS nivå 2 (autentisering, økt, tilgangskontroll,
   validering, konfigurasjon, logging) og Supabase-spesifikke punkter
   (radsikkerhet, `security definer`, Edge-funksjoner, lagring, nøkler,
   CI/CD-hemmeligheter, agenttilgang), og prøver A↔B-isolasjonen i det lokale
   testmiljøet. Funn blir Issues; rapporten blir
   `docs/s4-sikkerhetsgjennomgang.md`.
2. **Menneskelig, uavhengig gjennomgang (krever ja):** av noen utenfor
   prosjektet, etter at tiltakene i §4 er ute, slik at den kontrollerer det
   som faktisk skal i pilot. Anbefalt: OUS' informasjonssikkerhetsfunksjon
   (eventuelt sammen med pilotlaboratoriets), og en avgrenset ekstern
   penetrasjonstest hvis det finnes midler. Agentene kan forberede
   arkitekturbeskrivelse, tilgangsmatrise og testbrukere.

**Akseptkriterier:** begge gjennomganger er gjort; ingen åpne funn med høy
eller kritisk alvorlighet; funn med middels alvorlighet har en plan og en
eier.

### 3.4 Personvern og datalagring (B9)

- **Behandlingsansvar (U):** hvem som er behandlingsansvarlig for
  brukerdataene (OUS ved avdelingen, eller Peder personlig), og om
  personvernombudet ved OUS skal involveres. Ved en ekstern pilot behandles
  personopplysninger om ansatte i en annen virksomhet.
- **Databehandlere:** Supabase (database, innlogging; EU-region), Vercel
  (appen og kanten), GitHub (kode og hemmeligheter, ingen persondata etter
  regelen i `AGENTS.md`) og KI-tjenestene som agentene kjører på, i den grad
  de leser produksjonsdata. Avtalene (DPA) må være inngått på riktig konto.
- **Dataminimering:** ingen e-post; profilene vises bare for dem man
  samhandler med (P2c); diskusjonene og idéene er fritekst.
- **Lagringstid (A):** medlemskap avsluttes og kontoer sperres, men slettes
  ikke (B7). Det trengs en regel for endelig sletting, for eksempel
  sletting av profil og bilde etter en fastsatt tid, med bidragene beholdt
  under «tidligere bruker».
- **Pasientdata:** forbudt i samhandlingen (B4). Skrivefeltene bør minne om
  det, og en administrator kan alt skjule en kommentar
  (`Diskusjonsside.tsx`). En avviksrutine må si hva som gjøres hvis det skjer.
- **DPIA (U):** vurderes av behandlingsansvarlig. Uten pasientdata og med få
  brukere er det trolig ikke påkrevd, men vurderingen bør dokumenteres.

**Akseptkriterier:** behandlingsansvar avklart skriftlig; databehandleravtaler
inngått eller bekreftet; behandlingsoversikt og personvernerklæring godkjent
og tilgjengelig i appen; regel for lagringstid og avviksrutine vedtatt.

### 3.5 Kapasitet og driftsstabilitet (D7)

- **Kvoten er det trange punktet (F):** 437,6 av 500 MB. Et nytt fagmiljø
  med egne regler, diskusjoner og grupper tar lite plass, men kurateringen
  vokser, og når kvoten er nådd, settes databasen i skrivebeskyttet modus.
  Pro (8 GB) ville fjernet problemet, men etter D7a blir vi på gratisplanen,
  så det trengs en grense for tiltak (A: 460 MB) og en plan for hva som ryddes (P0-rapporten og
  databasemålingen har kandidatene).
- **Last (F):** 6 kontoer har logget inn de siste 30 dagene; dagens Nano-maskin har
  minnepress, men normal svartid (`docs/db-maling.md`, #342). En pilot med
  under ti brukere endrer dette lite; målingen fortsetter som i dag.
- **Feil og oppfølging (A):** en driftshåndbok med hvem som følger med, hva
  som gjøres ved feil (tilbakeføring i Vercel, ny migrasjon, stenge
  fagmiljøet med `apent_for_medlemmer = false`), og hvordan pilotbrukerne
  får beskjed. Ingen ny automatisk overvåking uten at Peder ber om det.
- **Gratisplanens begrensninger:** ingen tjenestenivåavtale, korte logger og
  pause av prosjektet ved lang inaktivitet (ikke aktuelt med daglige synker).

**Akseptkriterier:** valgt plan og kapasitet; kvoten under grensen med
plass til pilotens forventede vekst; driftshåndboken finnes; den gjentakende
feilen i loggen er rettet.

### 3.6 Organisasjon, avtaler, support og finansiering (B9)

Dette er det plan #364 kaller en obligatorisk pilotport som ikke kan hoppes
over fordi tekniske tester er grønne:

- **Eierskap og kontinuitet:** minst to personer med eiertilgang og tofaktor
  på Supabase, Vercel og GitHub (A: Peder og Max), helst flyttet til en
  organisasjonskonto, slik at driften ikke står og faller på én person.
- **Avtale med pilotlaboratoriet:** formål, hvilke brukere, at appen er et
  støtteverktøy og at klinisk ansvar for fortolkningen ligger hos
  laboratoriet, ingen pasientdata, kontaktpunkt og responstid,
  avslutningsregler.
- **Kostnader og finansiering:** eventuelt Vercel Pro og en ekstern
  sikkerhetstest (Supabase Pro er valgt bort i D7a).
- **Agentenes tilgang:** når andre virksomheters data ligger i databasen,
  bør det avgjøres om KI-agentene fortsatt skal ha full teknisk tilgang til
  produksjonen, eller bare lesetilgang mens endringer går gjennom PR og
  GitHub Actions (A).

---

## 4. Gjennomføringsplan

Rekkefølgen er prioritet, ikke tid. **U** = Claude gjennomfører uten nye
beslutninger, hver som egen PR med `ansvar:dev` og ChatGPT-kontroll. **J** =
krever Peders uttrykkelige ja (§5). Ingen av U-tiltakene endrer noe i
produksjonen utover vanlig utrulling av en kontrollert PR.

| # | Tiltak | Type | Avhenger av | Akseptkriterium |
| --- | --- | --- | --- | --- |
| 1 | **Velg løsning for sikkerhetskopi** (Pro, egen kopi eller begge). **Besluttet 15.11.2026: b, egne krypterte kopier på gratisplanen** | J (D7) | – | Valget skrevet i planen (gjort) |
| 2 | Gjenopprettingsverktøy og rutine: skript som tar en fullstendig kopi etter §3.2 (database med Auth-data, tilpasningene i `auth` og `storage` hentet fra katalogen, migrasjonshistorikk, profilbilder, Auth-innstillinger, navnene på hemmelighetene) og gjenoppretter den i et Supabase-miljø i riktig rekkefølge, med en manifestfil som sammenligner radtall og kontrollsummer per tabell i §2.3 og `auth`, og tilpasningene; `docs/drift-gjenoppretting.md` med mål (RPO 24 t, RTO 8 t) | U | – | Prøvd i det lokale testmiljøet med syntetiske brukere: kopi → gjenoppretting i et nytt lokalt miljø → identiske tall og tilpasninger, en eksisterende syntetisk bruker logger inn, en ny bruker opprettes gjennom adminflyten og får profil og medlemskap, og profilbildereglene holder (§3.2 punkt 4–7). Ingen produksjonsdata eller hemmeligheter i repoet |
| 3 | Sikkerhetskopien i drift etter valget i 1: en planlagt, kryptert kopi etter §3.2 b, lagret utenfor Supabase og utenfor det offentlige repoet, med nøkkelen hos en navngitt eier | J (gjennomføring: lagringssted og nøkkeleier) | 1, 2 | Første kopi finnes, kan dekrypteres av nøkkeleieren og er lesbar |
| 4 | **Gjenopprettingsprøve** med en ekte kopi i et eget, midlertidig miljø; kopien slettes etterpå | J (D7b) | 2, 3 | Dokumentert prøve etter §3.2 punkt 1–8 med målt tid: innlogging med testbrukeren, ny bruker gjennom adminflyten og profilbilderettighetene |
| 5 | Sikkerhetshoder i nettleseren: `Content-Security-Policy` (bare egne og Supabase-adresser), `frame-ancestors 'none'`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` | U | – | Hodene står på svarene i forhåndsvisningen; appen virker i det lokale testmiljøet uten brudd på reglene; test i repoet holder dem på plass |
| 6 | Strengere passordregel for **nye** passord: minst 12 tegn, ikke lik brukernavnet, avvis de vanligste passordene; eksisterende passord gjelder til de byttes | U | – | Felles regel i `_delt/passord.ts` for app og server; tester ved grensene |
| 7 | Tofaktor som **frivillig** valg: innmelding, kodesteg ved innlogging og at personen selv kan fjerne egen faktor på `aal2`; `intern.privilegier_tilgjengelige()` i de privilegerte grenene og katalogtestene (§3.1 punkt 3 og 6) bygget og testet, men kravet ikke slått på. **Ingen nullstilling av andres faktor** | U | – | Kriteriene i §3.1 utenom selve kravet og nullstillingen; med kravet slått på i testene er alle negative `aal1`-tester grønne |
| 7b | **Nullstilling av en annens faktor** og nødveien for den siste systemarkitekten, slik Peder bestemmer i D5b | J (D5b) | 7 | Nullstillingen følger det besluttede hierarkiet, loggføres, og har negative tester for den som ikke har myndigheten |
| 8 | **Krav om tofaktor** for systemarkitekter, adminrollen og lokale administratorer | J (D5a) | 7, 7b, alle omfattede har faktor | Negative `aal1`-tester grønne i produksjonsmigrasjonen; ingen privilegert konto uten faktor |
| 9 | Innloggingsinnstillinger i produksjonen: minstelengde 12 også i Supabase, krav om gjeldende passord ved bytte, SSL påkrevd på databasetilkoblinger. Kontroll mot lekkede passord og utlogging etter inaktivitet finnes bare på Pro og faller bort etter D7a; listen over vanlige passord i tiltak 6 og tofaktor for de privilegerte er vernet i stedet | J | 6 | Innstillingene lest tilbake; appens passordbytte sender gjeldende passord; migrasjonsutrullingen virker med SSL |
| 10 | Rette den gjentakende feilen `permission denied for table brukerinnstillinger`: testene skal aldri kunne nå en ekte Supabase, uansett hva miljøet inneholder. **Gjort i denne PR-en** (`vite.config.ts`, `testisolasjon.test.ts`) | U | – | Testen for isolasjonen er grønn; ingen forespørsler med brukeragent `node` mot `brukerinnstillinger` i loggen et døgn etter sammenslåingen |
| 11 | Oppdatere utviklingsverktøyene med kjente sårbarheter (vitest, vite m.fl.) | U | – | `npm audit` uten høye og kritiske funn; alle tester grønne |
| 12 | Påminnelse om at pasientopplysninger ikke skal skrives, i skrivefeltene for diskusjoner, idéer og grupper (B4 er besluttet) | U | – | Teksten vises i alle skrivefelt for samhandling; komponenttest |
| 13 | Utkast til **personvern- og driftsdokumenter**: behandlingsoversikt, personvernerklæring for appen, databehandleroversikt, avviksrutine, regel for lagringstid og driftshåndbok med kapasitetsgrense | U (utkast) | – | Dokumentene ligger i `docs/`; ikke vist i appen før 14 |
| 14 | **Behandlingsansvar, avtaler og godkjenning av dokumentene i 13**, avtale med pilotlaboratoriet | J (B9) | 13 | Skriftlig avklart; erklæringen kan vises i appen |
| 15 | **Eierskap og kontinuitet**: minst to eiere med tofaktor på Supabase, Vercel og GitHub; Vercel-planen kontrollert mot vilkårene | J (B9) | – | Bekreftet av Peder |
| 16 | **Agentenes tilgang** til produksjonen under piloten | J (B9) | – | Valget dokumentert og miljøene satt opp etter det |
| 17 | Intern, adversarial sikkerhetsgjennomgang etter §3.3 punkt 1, med funn som Issues | U | 5–7, 10–12 | Rapport i `docs/s4-sikkerhetsgjennomgang.md`; ingen åpne høye eller kritiske funn |
| 18 | **Menneskelig, uavhengig sikkerhetsgjennomgang** | J (B9) | 17, helst 8 og 9 | Rapport mottatt; ingen åpne høye eller kritiske funn |
| 19 | **Kostnader, finansiering og supportansvar** for piloten | J (B9) | 1, 18 | Avklart |
| 20 | S4-kontrollrapport: hele listen i §6 kontrollert, med lesing fra produksjonen | U | alle over | Rapport som S2-rapporten |
| 21 | **Valg av pilotlaboratorium og åpning** gjennom startporten | J | 20 og #395 1–3 | Peders uttrykkelige ja i åpnings-PR-en |

**Rekkefølgen i praksis (A):** 2, 5, 6, 7, 10, 11, 12 og 13 kan starte nå og
gå parallelt i små PR-er, fordi de ikke rører de samme filene som #395-trådene
(unntatt endringsloggen og versjonsnummeret, som tas ved rebase). 1, 14, 15 og
19 har lengst ledetid hos Peder og organisasjonen og bør avgjøres tidlig.
17 gjøres når de tekniske tiltakene er ute, og 18 til slutt, slik at
gjennomgangen ser det som faktisk skal i pilot.

---

## 5. Beslutninger som gjenstår fra D5, D7 og B9

Hver har et anbefalt standardvalg. D7a er tatt; de andre gjenstår.

| Nr. | Spørsmål i vanlig språk | Anbefalt | Tiltak |
| --- | --- | --- | --- |
| **D7a** | Skal vi betale for Supabase Pro (om lag 25 USD i måneden) for å få daglige sikkerhetskopier og mer plass, eller ta egne krypterte kopier på gratisplanen? | **Besluttet av Peder 15.11.2026: egne krypterte kopier på gratisplanen** (anbefalt var Pro) | 1, 3, 9 |
| **D7b** | Kan en kopi av produksjonsdataene (med brukerdata) gjenopprettes i et midlertidig miljø for å prøve at gjenopprettingen virker, og slettes etterpå? | Ja | 4 |
| **D5a** | Skal systemarkitekter, alle med adminrollen og lokale administratorer måtte bruke tofaktor (kode fra en app på telefonen) før en ekstern pilot? | Ja, og frivillig for andre | 8 |
| **D5b** | Hvem kan nullstille tofaktor for den som mister telefonen? | Den som i dag kan gi nytt passord, med logg | 7b, 8 |
| **D5c** | Kan Claude endre innloggingsinnstillingene i Supabase (passordlengde, gjeldende passord ved bytte, kryptert databasetilkobling)? | Ja | 9 |
| **B9a** | Hvem er ansvarlig for brukerdataene: OUS ved avdelingen, eller du personlig? Skal personvernombudet involveres? | OUS ved avdelingen, med personvernombudet | 14 |
| **B9b** | Hvem skal gjøre den uavhengige sikkerhetsgjennomgangen? | OUS' informasjonssikkerhet, ekstern test hvis det finnes midler | 18 |
| **B9c** | Hvem skal være medeier av kontoene (Supabase, Vercel, GitHub), og skal de flyttes til en organisasjonskonto? | Max som medeier nå; organisasjonskonto før bredere utrulling | 15 |
| **B9d** | Skal KI-agentene ha full teknisk tilgang til produksjonen under piloten, eller bare lesetilgang? | Bare lesetilgang; endringer gjennom PR | 16 |
| **B9e** | Hvem betaler, og hvem svarer pilotlaboratoriet når noe ikke virker? | Avklares med avdelingen | 19 |
| **B9f** | Hvilket laboratorium blir piloten, og når? | Avgjøres når 1–20 er ferdige | 21 |

D6 (chat og filer) hører til S5 og er ikke med her.

---

## 6. Akseptliste for S4

S4 er passert når alt under er oppfylt og kontrollert i S4-rapporten (tiltak
20):

1. Sikkerhetskopi i drift, og én dokumentert, vellykket gjenopprettingsprøve
   med målt tid (§3.2).
2. Tofaktor påkrevd og registrert for alle systemarkitekter, alle med
   adminrollen og alle lokale administratorer; negative tester med
   `aal1`-token grønne for hver privilegert inngang, også direkte skriving i
   tabellene, med dekningen hentet fra katalogen; nullstilling etter D5b
   (§3.1).
3. Innloggingen herdet: passordregel, gjeldende passord ved bytte og
   sikkerhetshoder (tiltak 5, 6, 9).
4. Intern og uavhengig sikkerhetsgjennomgang gjort, uten åpne høye eller
   kritiske funn (§3.3).
5. Behandlingsansvar, databehandleravtaler, personvernerklæring,
   lagringsregel og avviksrutine avklart og godkjent (§3.4).
6. Kapasitet valgt og kvoten under grensen; driftshåndbok finnes; den
   kjente loggfeilen rettet (§3.5).
7. Minst to eiere med tofaktor på driftskontoene; agenttilgangen avgjort;
   avtale med pilotlaboratoriet; finansiering og support avklart (§3.6).
8. Dev-punktene 1–3 i #395 levert, og #393 og #394 avklart av Fag og
   Verktøy.
9. Peders uttrykkelige ja til åpningen av det eksterne fagmiljøet, i
   åpnings-PR-en.

---

## 7. Utenfor denne planen

- Ingen ekstern pilot åpnes, og ingen fagmiljøer opprettes, før punkt 9 i §6.
- Ingen nye automatiske jobber eller kontrollordninger uten Peders ja; en
  planlagt kopijobb etter D7a valg b er en slik og settes i drift i tiltak 3.
- Chat og filer (P7, P8, S5) og delegert redigering (P5) er egne etapper.
