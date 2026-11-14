# P2.0-forberedelse: datainngangene, persongalleriet og de negative testene

Leses før P2.0 («aktivt medlemskap i alle datainnganger») og P2(a–d)
planlegges eller bygges. Planen og begrunnelsene står i
`docs/ousfar-nasjonal-p0-kartlegging.md` (§4–6), grunnmuren fra P1.1 i
`docs/fagmiljoer.md`.

## Status

Forberedelsen er brukt: **P2.0 er bygd** (migrasjonen
`20261114103000_aktivt_medlemskap.sql`). Utformingen og reglene står i
`docs/fagmiljoer.md`, «Aktivt medlemskap». Prototypen er fjernet fra testene,
og testene krever nå at hver inngang har kontrollen
(`tilgangsinnganger.test.ts`) og prøver hver inngang som en bruker uten
aktivt medlemskap (`aktivtmedlemskap.test.ts`). Dokumentet står som
grunnlag for P2(a–d): kartleggingen, persongalleriet og tilgangsmatrisen
gjelder videre.

Sikkerhetsport S1 (P0 §6.3) ble kontrollert som bestått 14.11.2026 før P2.0
ble bygd ([#369](https://github.com/peohol/ousfar/issues/369)).

## Filene

| Fil | Hva |
| --- | --- |
| `src/__tests__/hjelp/persongalleri.ts` | Personene, fagmiljøene og de syntetiske testdataene, og hjelperne `opprettFagmiljo`, `opprettMedlem`, `avsluttMedlemskap` og `fjernAlleMedlemskap` |
| `src/__tests__/hjelp/tilgangsinnganger.ts` | Kartleggingen fra Postgres-katalogen (`tabellinnganger`, `funksjonsinnganger`, `lesetilgang`) og `medlemskapsdekning`, som gir inngangene uten kontroll av aktivt medlemskap |
| `src/__tests__/data/tilgangsomrader.ts` | Hvilken del av P2 (a–d) hver inngang hører til, som regler på navnet |
| `src/__tests__/tilgangsinnganger.test.ts` | Kartleggingen, at hver inngang har kontrollen fra P2.0, og at den begrensende regelen ikke endrer hva aktive brukere ser |
| `src/__tests__/aktivtmedlemskap.test.ts` | Hver inngang prøvd som en bruker uten aktivt medlemskap (P2.0) |
| `src/__tests__/tilgangsmatrise.test.ts` | Persongalleriet og de negative scenarioene |

## Persongalleriet

Fagmiljø A er OUS Klinisk farmakologi (standarden), B er OUS
Rettstoksikologi. B åpnes for medlemmer i testdatabasen, som etter startporten
S2; i produksjonen er det fortsatt lukket.

| Person | Medlemskap | Rolle |
| --- | --- | --- |
| `systemarkitekt` | A (primær) | Systemarkitekt, og den gamle adminrollen |
| `vanligA` | A | Vanlig bruker |
| `vanligB` | B | Vanlig bruker |
| `adminA` | A | Lokal administrator i A, og den gamle adminrollen (D3) |
| `adminB` | B | Lokal administrator i B, og den gamle adminrollen |
| `dobbeltAB` | A (primær) og B | Vanlig bruker |
| `avsluttetA` | B; avsluttet i A | Vanlig bruker |
| `utenMedlemskap` | Ingen aktive; avsluttet i A | Vanlig bruker med fortsatt gyldig token |
| `tidligereAdmin` | Ingen aktive; avsluttet i A | Den gamle adminrollen står igjen |

Personene er data (`PERSONER`) og bygges av én funksjon. Lokal redaktør,
felles redaktør, gruppeansvarlig og bruker uten gruppe (P0 §6.4) legges til
som nye oppføringer når tabellene deres kommer (P5, P6).

`leggInnTestdata` lager, gjennom appens egne funksjoner, en publisert
fortolkningskommentar og et kommentarutkast (av `adminA`), en tråd på en
fortolkningsside og en på en fagside, en idé og et profilbilde (av `vanligA`). Alt er
syntetisk; ingen kliniske verdier.

**Funn: en konto uten aktivt medlemskap kan ikke finnes i dag.** Regel 1 i
`docs/fagmiljoer.md` krever nøyaktig ett aktivt primærmedlemskap per konto.
P3 må løse opp regelen for kontoer som avsluttes (sammen med sperring i
Auth). Galleriet lager tilstanden utenom invariantene
(`fjernAlleMedlemskap`, `session_replication_role = replica` i én
transaksjon), fordi P2.0 skal være bevist for den før P3 tar den i bruk
(port S3).

## Kartleggingen

Tallene er fra databasen bygd av migrasjonene på `main` etter P1.1. Testene
leser katalogen på nytt hver gang, så tallene her er et øyeblikksbilde.

### Tabeller og visninger (59 tabeller og 5 visninger i `public`, 2 tabeller i `storage`)

Alle har radsikkerhet, og visningene kjører som den innloggede
(katalogvaktene fra P1.1). Ingen er tilgjengelige for `anon`.

| Lesetilgang i dag | Antall | Tabeller |
| --- | --- | --- |
| Publisert for alle, alt for admin | 28 | Faginnholdet og de kliniske reglene: `infosider`, `innholdselementer`, `referanser`, `referansekoblinger`, `kommentarer`, `intervallregelsett`/`intervallregler`, `scenario*`, `thc_*`, `laboratorieanalytter`, `analyttkomponenter`, `objekttilstander`, `redigerbare_objekter` |
| Alle innloggede | 18 | `profiles`, `diskusjoner`, `diskusjonskommentarer`, `diskusjonshjerter`, `diskusjonskategorier`, `ideer`, `idekommentarer`, `idehjerter`, `oppgaver`, `objektpubliseringer`, `sideversjoner`, `stoffkategorier`, `stoffplasseringer`, `stoffstatus`, `analyttkoblede_stoffer`, `maleenheter`, `endringsagenter`, `autoerstatt_regler` |
| Egne rader | 7 | `varsler`, `diskusjonsbesok`, `idebesok`, `brukerinnstillinger`, `stoffavoritter`, `medlemskap`, `fagmiljoer` (de man er medlem av) |
| Bare admin | 5 | `innholdsendringer`, `innholdshendelser`, `slettede_referanser`, `slettede_stoffsider`, `diskusjon_skjulte_tekster` |
| Annet | 1 | `objektrevisjoner` (publiserte revisjoner for alle, alt for admin) |

I tillegg Supabase sine tabeller for filer, som nettleseren når gjennom
Storage-API-et: `storage.objects`, der alle innloggede leser alle profilbilder
i bøtta `avatarer` og eieren laster opp, bytter og fjerner sitt eget, og
`storage.buckets`, som har radsikkerhet uten leseregel og derfor ikke gir noe.
Testgrunnlaget (`migrasjonskjoring.ts`) gir nettleserrollene de samme
rettighetene og radsikkerheten på dem som Supabase gjør.

Kartleggingen tar med **alle** skjemaer utenom Postgres sine egne og
migrasjonshistorikken, ikke en fast liste. En ny tabell nettleseren får
rettigheter på, også i `storage`, kommer dermed med av seg selv: testen krever
at den har radsikkerhet, et P2-område og (når P2.0 er aktivert) kontrollen av
aktivt medlemskap. Det er vist med en tabell som lages med vilje og rulles
tilbake. Katalogvakten fra P1.1 (`tilgangskatalog.test.ts`) gjelder fortsatt
bare prosjektets egne skjemaer.

Fordelt på P2: (a) 37 tabeller og de 5 visningene, (b) 12, (c) 3 og de 2 i
`storage`, (d) 7.

### Funksjonene nettleseren kan kalle (124, hvorav 93 `security definer`)

Kontrollen hver har i dag, står i `src/__tests__/data/funksjonskontroller.ts`
(31 `admin`, 27 `radsikkerhet`, 25 `innlogget`, 24 `felles-lesing`, 6 `eier`,
6 `admin-utvidet`, 3 `offentlig`, 1 `utloser`, 1 `kontomyndighet`). Fordelt på P2: (a) 47,
(b) 43, (c) 3, (d) 31. De 27 som kjøres som den innloggede, arver
tabellenes regler; de 93 andre leser forbi radsikkerheten og må kontrollere
selv.

### Utenfor databasekatalogen

| Inngang | Hvor | Til P2.0 |
| --- | --- | --- |
| Edge-funksjonen `fullfor-oppsett` | `supabase/functions/fullfor-oppsett` | Gjelder bare den innloggede selv. Krever aktivt medlemskap fra P2.0, slik at en avsluttet konto ikke kan fullføre oppsettet |
| Edge-funksjonene `opprett-bruker`, `nytt-passord`, `sett-rolle` | `supabase/functions/*`, felles kode i `_edge/kontekst.ts` | Herdet i P1.2a (slått sammen): `nytt-passord` og `sett-rolle` avgjøres i databasen av `intern.kontoavslag`, som alt krever systemarkitekt eller aktivt adminskap i et aktivt fagmiljø. `opprett-bruker` og `fullfor-oppsett` slår bare opp profilen. P2.0 la kravet om aktivt medlemskap i den felles innloggingskontrollen (`hentInnlogget` i `endepunkt`), så det gjelder alle fire |
| Edge-funksjonen `delt-test` (tidligere bare i produksjonen) | — | Undersøkt og fjernet i P1.2b; leste ingen data (`docs/edge-funksjoner.md`) |
| Vercel-funksjonene for synker, kildeovervåking og kuratering | `api/*.ts`, `src/server/tilgang.ts` | Slipper inn innloggede via `er_admin()`, som krever aktivt medlemskap fra P2.0. Cron, GitHub OIDC og kurateringsagentenes nøkler er ingen brukere og berøres ikke |
| Varslene som lages av utløsere | `intern.varsle_publisering`, `intern.varsle_ny_ide` | Sender til **alle** profiler, også dem uten aktivt medlemskap. Etter P2.0 kan de ikke lese varslene, men mottakerlistene bør filtreres (P2b) |
| Innloggingsveggen i kanten | `middleware.ts` | Sjekker bare at tokenet er gyldig. Ingen datagrense; uendret |
| Mellomlageret i nettleseren | `src/auth/mellomlager.ts` | Tømmes ved utlogging, og fra P2.0 også når appen finner at medlemskapet er avsluttet (da hentes ikke den kliniske appen). En fane som alt står åpen, ser det den har hentet til den lastes på nytt; vurderes i P3 |

## Utformingen av P2.0, prøvd i prototypen og bygd

Prototypen (fjernet etter at P2.0 ble bygd) innførte dette i en transaksjon
som ble rullet tilbake, og viste at det virker. P2.0 bygde det slik, med
regelen i én funksjon, `intern.har_aktivt_medlemskap(bruker)`:

1. `public.har_aktivt_medlemskap()` (`stable security definer`, kan kalles av
   innloggede): sann når den innloggede har et aktivt medlemskap i et aktivt
   fagmiljø, eller er systemarkitekt. Klienten kan bruke den til å vise
   «medlemskapet ditt er avsluttet» i stedet for tomme sider.
2. `intern.krev_aktivt_medlemskap()`: stopper med `42501` ellers.
3. **Én begrensende regel per tabell** (`as restrictive for all to
   authenticated using ((select public.har_aktivt_medlemskap()))`) på alle 59
   tabellene i `public` og de 2 i `storage`. Begrensende regler gjelder i tillegg til de
   tillatende, så ingen av dagens 85 regler må skrives om, og visningene og de
   27 funksjonene som kjøres som den innloggede, følger med.
4. Kontrollen i de fire portene P0 §2.2 peker ut: `intern.krev_innlogget`,
   `intern.krev_registerbruker`, `intern.krev_admin` og `public.er_admin()`.
   Det dekker 53 av de 93 `security definer`-funksjonene, også
   `intern.krev_idevalg_admin` og alt bak `opprett_objekt`/`admin_aktor`.

Prototypen viser at:

- en bruker uten aktivt medlemskap (og en tidligere administrator) ser **null
  rader** i alle tabeller, får `42501` ved skriving, og `er_admin()` blir usann;
- det gjelder også profilbildene: uten prototypen leser de andres bilde og
  laster opp sitt eget, med den avvises begge deler, mens aktive brukere
  fortsatt leser bildene, bytter og laster opp sitt eget, og fortsatt ikke kan
  laste opp i en annens navn;
- de syv aktive personene ser **nøyaktig de samme radene** som før, tabell for
  tabell.

**Restlisten (40 funksjoner) som må få kontrollen én for én**, fordi de leser
forbi radsikkerheten uten å gå gjennom en port. Testen krever at hver av dem
står her, så lista holdes oppdatert:

| Gruppe | Funksjoner |
| --- | --- |
| Felles kildedata og fagsideversjoner (a), `felles-lesing` | `les_bivirkninger`, `les_cpic`, `les_cpic_diplotyper`, `les_farmakogenetikk`, `les_farmakogenetikk_sok`, `les_interaksjoner`, `les_interaksjonssok`, `les_kjemi`, `les_laboratorieanalyser`, `les_laboratoriesok`, `les_legemidler`, `les_preparatsok`, `les_sideversjon`, `les_sideversjon_bivirkninger`, `les_sideversjoner`, `sok_virkestoff`, `sokedata_versjoner` |
| Status og forvaltning (d) | `clinpgx_status`, `cpic_status`, `legemiddeldata_status`, `les_kurateringer`, `les_verktoysperrer` |
| Innlogget, admin får mer | `les_endringslogg` (a), `les_stoffregister` (d) |
| Samhandling (b), bare innlogging | `direktelenke`, `ideoversikt`, `idetraad`, `oppgave`, `oppgaveoversikt`, `les_regelvarsler`, `rydd_idearkiv` |
| Egne varsler og besøk (b) | `mine_varsler`, `arkiver_varsler`, `gjenopprett_varsler`, `merk_varsler_lest`, `merk_diskusjon_sett`, `merk_ide_sett` |
| Hjelpere i reglene (b) | `diskusjon_er_apen`, `ide_er_apen` (svarer bare ja/nei, men kan kalles direkte) |
| Myndighet over kontoer (d), fra P1.2a | `mine_kontohandlinger`. Holder alt: gir bare svar til en systemarkitekt eller en med aktivt adminskap i et aktivt fagmiljø (`intern.administrerte_fagmiljoer`), og operasjonene kontrollerer på nytt selv (tilgangsmatrisen viser det). Får likevel `krev_aktivt_medlemskap()` i P2.0, slik at alle innganger har samme kontroll og lista blir tom uten unntak |

Når P2.0 ble bygd, fikk hver av dem `intern.krev_aktivt_medlemskap()` som
første setning, og testen «ingen tabell og ingen security definer-funksjon
kontrollerer aktivt medlemskap ennå» ble byttet ut med at `medlemskapsdekning`
er tom, uten unntak. `tilgangsinnganger.test.ts` krever at hver funksjon i
listen over har kontrollen først.

**Avklart i P2.0 (tekniske valg):**

- `har_aktivt_medlemskap()` og `min_medlemskapsstatus()` er eneste innganger
  for en bruker uten aktivt medlemskap, og svarer bare om vedkommende selv;
  egne `medlemskap`-rader er heller ikke synlige. Statusen skiller en konto
  uten aktivt medlemskap (beskjeden) fra en slettet konto (utlogging).
- Ytelsen er målt før og etter (`docs/fagmiljoer.md`, «Ytelse»).
- Edge-kravet ligger i den felles innloggingskontrollen (`hentInnlogget` i
  `_edge/kontekst.ts`), ikke i en kopi per funksjon.

## Tilgangsmatrisen

`tilgangsmatrise.test.ts` har scenarioer for hver etappe. Hvert har person, etappe,
utfallet i dag (`idag`) og målet (`mal`) etter rettighetsmatrisen i P0 §5.2:

| Etappe | Hull i dag | Eksempler |
| --- | --- | --- |
| P2.0 (holder alt) | 0 av 38 | Uten aktivt medlemskap: lese kommentar, tråd, direktelenke, idéoversikt, profiler, profilbilder, egne varsler, eget medlemskap, kildedata, endringsloggen, stoffregisteret; laste opp eget profilbilde, endre egen profil, gi hjerte, opprette tråd og kategori. Tidligere admin: lese og lagre utkast, lese datakildestatus. Og at medlem bare i B, dobbeltmedlem og systemarkitekt beholder tilgangen |
| P2a | 5 | B-bruker og avsluttet A-medlem leser A sin lokale fortolkningskommentar; lokal admin i B leser, lagrer og publiserer A sitt utkast. Forutsetter `ressursomfang` (P4a) og D3 |
| P2b | 6 | B-bruker får varsel om A sin publisering, leser og slår opp A sin fortolkningstråd, gir nytt navn til andres tråd, flytter en lokal tråd til en fagside; vanlig bruker rydder idéarkivet |
| P2c | 1 | B-bruker leser rollen til en administrator i A |
| P2d | 2 | Vanlig bruker endrer stoffregisteret; lokal admin leser datakildestatus |
| P1.1 (holder alt) | 0 av 7 | Lese andres medlemskap, gjøre seg selv til systemarkitekt eller lokal admin, utkast for vanlig bruker; og at systemarkitekt, lokal admin i eget fagmiljø og dobbeltmedlem fortsatt har tilgangen sin |
| P1.2a (holder alt) | 0 av 6 | Uten aktivt medlemskap, tidligere admin og vanlig bruker får ingen kontohandlinger; lokal admin får nytt passord for en vanlig bruker i A, men ikke for et medlem som også hører til B; systemarkitekt kan endre rollen til en lokal admin |

Testen krever at utfallet i dag er det som står. Lukker en etappe et hull,
feiler scenarioet med «Hullet er lukket: sett idag til …»; da settes `idag`
lik `mal` i samme PR, som bevis. En etappe er ferdig når ingen av scenarioene
dens har `idag` ulik `mal`. Nye scenarioer (fra P0 §4) legges til i lista.
Etappene som er slått sammen (`HOLDER` i testen), skal ha scenarioer, og
alle må holde. Kontooperasjonene selv (nytt passord, rolle) testes grundig i
`kontomyndighet.test.ts` fra P1.2a.

## Avhengigheter til de parallelle oppgavene

- **P1.2a (adminoperasjonene, slått sammen):** ga nettleseren én ny funksjon,
  `mine_kontohandlinger()`. Den er plassert i (d) og står i restlisten over.
  Reglene for (d) i `tilgangsomrader.ts` dekker alt med `fagmiljo`,
  `medlemskap`, `systemrolle`, `systemarkitekt`, `tilgang`, `administrator`, `passord`, `konto`
  og `rolle` i navnet; en ny funksjon i `public` som ingen regel treffer,
  stopper testen.
- **P1.2b (utrulling av Edge-funksjonene, slått sammen):** ingen felles filer. En ny
  Edge-funksjon må nevnes i dette dokumentet (testen krever det).
- **P4a (`ressursomfang`):** ingen felles filer. Får tabellen rettigheter for
  nettleseren, må den plasseres i `tilgangsomrader.ts`. Når rekkevidden finnes,
  kan P2a-scenarioene bruke den direkte.
