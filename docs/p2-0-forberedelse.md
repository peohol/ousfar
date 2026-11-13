# P2.0-forberedelse: datainngangene, persongalleriet og de negative testene

Leses før P2.0 («aktivt medlemskap i alle datainnganger») og P2(a–d)
planlegges eller bygges. Planen og begrunnelsene står i
`docs/ousfar-nasjonal-p0-kartlegging.md` (§4–6), grunnmuren fra P1.1 i
`docs/fagmiljoer.md`.

## Status

Bare forberedelse. **Ingen tilgangsregel, funksjon, Edge-funksjon eller
migrasjon er endret**, og ingen bruker merker noe. Det som er lagt inn, er
tester og testhjelpere som:

1. kartlegger alle inngangene nettleseren når, og stopper en ny inngang som
   ikke er plassert i en del av P2;
2. bygger et fast, syntetisk persongalleri i to fagmiljøer;
3. viser med en prototype, som rulles tilbake i testen, at P2.0 kan gjøres med
   én begrensende regel per tabell og kontrollen i fire portfunksjoner, og
   gir restlisten av funksjoner som må endres én for én;
4. beskriver de negative scenarioene fra P0 §4 og §6.4 med utfallet i dag og
   målet, slik at hver etappe kan bevise at den har lukket sine hull.

Sikkerhetsport S1 (P0 §6.3) gjelder fortsatt: P2 aktiveres ikke før P1.2 og
P4a er ferdige, produksjonsstatus er verifisert og D3 er avklart.

## Filene

| Fil | Hva |
| --- | --- |
| `src/__tests__/hjelp/persongalleri.ts` | Personene, fagmiljøene og de syntetiske testdataene, og hjelperne `opprettFagmiljo`, `opprettMedlem`, `avsluttMedlemskap` og `fjernAlleMedlemskap` |
| `src/__tests__/hjelp/tilgangsinnganger.ts` | Kartleggingen fra Postgres-katalogen (`tabellinnganger`, `funksjonsinnganger`, `lesetilgang`) og `medlemskapsdekning`, som gir inngangene uten kontroll av aktivt medlemskap |
| `src/__tests__/data/tilgangsomrader.ts` | Hvilken del av P2 (a–d) hver inngang hører til, som regler på navnet |
| `src/__tests__/tilgangsinnganger.test.ts` | Kartleggingen, at P2.0 ikke er aktivert, og prototypen |
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

### Tabeller og visninger (59 tabeller og 5 visninger)

Alle har radsikkerhet, og visningene kjører som den innloggede
(katalogvaktene fra P1.1). Ingen er tilgjengelige for `anon`.

| Lesetilgang i dag | Antall | Tabeller |
| --- | --- | --- |
| Publisert for alle, alt for admin | 28 | Faginnholdet og de kliniske reglene: `infosider`, `innholdselementer`, `referanser`, `referansekoblinger`, `kommentarer`, `intervallregelsett`/`intervallregler`, `scenario*`, `thc_*`, `laboratorieanalytter`, `analyttkomponenter`, `objekttilstander`, `redigerbare_objekter` |
| Alle innloggede | 18 | `profiles`, `diskusjoner`, `diskusjonskommentarer`, `diskusjonshjerter`, `diskusjonskategorier`, `ideer`, `idekommentarer`, `idehjerter`, `oppgaver`, `objektpubliseringer`, `sideversjoner`, `stoffkategorier`, `stoffplasseringer`, `stoffstatus`, `analyttkoblede_stoffer`, `maleenheter`, `endringsagenter`, `autoerstatt_regler` |
| Egne rader | 7 | `varsler`, `diskusjonsbesok`, `idebesok`, `brukerinnstillinger`, `stoffavoritter`, `medlemskap`, `fagmiljoer` (de man er medlem av) |
| Bare admin | 5 | `innholdsendringer`, `innholdshendelser`, `slettede_referanser`, `slettede_stoffsider`, `diskusjon_skjulte_tekster` |
| Annet | 1 | `objektrevisjoner` (publiserte revisjoner for alle, alt for admin) |

I tillegg `storage.objects`: alle innloggede leser alle profilbilder i bøtta
`avatarer`, eieren skriver sitt eget. Testgrunnlaget gir nettleserrollene de samme rettighetene på tabellen som Supabase gjør (`migrasjonskjoring.ts`), slik at den er med i kartleggingen og prototypen.

Fordelt på P2: (a) 37 tabeller og de 5 visningene, (b) 12, (c) 3 og
`storage.objects`, (d) 7.

### Funksjonene nettleseren kan kalle (123, hvorav 92 `security definer`)

Kontrollen hver har i dag, står i `src/__tests__/data/funksjonskontroller.ts`
(31 `admin`, 27 `radsikkerhet`, 25 `innlogget`, 24 `felles-lesing`, 6 `eier`,
6 `admin-utvidet`, 3 `offentlig`, 1 `utloser`). Fordelt på P2: (a) 47,
(b) 43, (c) 3, (d) 30. De 27 som kjøres som den innloggede, arver
tabellenes regler; de 92 andre leser forbi radsikkerheten og må kontrollere
selv.

### Utenfor databasekatalogen

| Inngang | Hvor | Til P2.0 |
| --- | --- | --- |
| Edge-funksjonen `fullfor-oppsett` | `supabase/functions/fullfor-oppsett` | Gjelder bare den innloggede selv. Bør kreve aktivt medlemskap, slik at en avsluttet konto ikke kan fullføre oppsettet |
| Edge-funksjonene `opprett-bruker`, `nytt-passord`, `sett-rolle` | `supabase/functions/*`, felles kode i `_edge/kontekst.ts` | Herdes i P1.2a (tråd A eier koden og den felles myndighetsfunksjonen). P2.0 legger kravet om aktivt medlemskap i den felles innloggingskontrollen (`hentInnlogget`), etter at P1.2a er slått sammen |
| Edge-funksjonen `delt-test` (bare i produksjonen) | — | Undersøkes i P1.2b |
| Vercel-funksjonene for synker, kildeovervåking og kuratering | `api/*.ts`, `src/server/tilgang.ts` | Slipper inn innloggede via `er_admin()`, og dekkes derfor når `er_admin()` krever aktivt medlemskap. Cron, GitHub OIDC og kurateringsagentenes nøkler er ingen brukere og berøres ikke |
| Varslene som lages av utløsere | `intern.varsle_publisering`, `intern.varsle_ny_ide` | Sender til **alle** profiler, også dem uten aktivt medlemskap. Etter P2.0 kan de ikke lese varslene, men mottakerlistene bør filtreres (P2b) |
| Innloggingsveggen i kanten | `middleware.ts` | Sjekker bare at tokenet er gyldig. Ingen datagrense; uendret |
| Mellomlageret i nettleseren | `src/auth/mellomlager.ts` | Tømmes ved utlogging. En avsluttet bruker kan se det som alt er lagret lokalt til det tømmes; vurderes i P3 |

## Anbefalt utforming av P2.0, prøvd i prototypen

Prototypen i `tilgangsinnganger.test.ts` innfører dette i en transaksjon som
rulles tilbake, og viser at det virker:

1. `public.har_aktivt_medlemskap()` (`stable security definer`, kan kalles av
   innloggede): sann når den innloggede har et aktivt medlemskap i et aktivt
   fagmiljø, eller er systemarkitekt. Klienten kan bruke den til å vise
   «medlemskapet ditt er avsluttet» i stedet for tomme sider.
2. `intern.krev_aktivt_medlemskap()`: stopper med `42501` ellers.
3. **Én begrensende regel per tabell** (`as restrictive for all to
   authenticated using ((select public.har_aktivt_medlemskap()))`) på alle 59
   tabellene og `storage.objects`. Begrensende regler gjelder i tillegg til de
   tillatende, så ingen av dagens 85 regler må skrives om, og visningene og de
   27 funksjonene som kjøres som den innloggede, følger med.
4. Kontrollen i de fire portene P0 §2.2 peker ut: `intern.krev_innlogget`,
   `intern.krev_registerbruker`, `intern.krev_admin` og `public.er_admin()`.
   Det dekker 53 av de 92 `security definer`-funksjonene, også
   `intern.krev_idevalg_admin` og alt bak `opprett_objekt`/`admin_aktor`.

Prototypen viser at:

- en bruker uten aktivt medlemskap (og en tidligere administrator) ser **null
  rader** i alle tabeller, får `42501` ved skriving, og `er_admin()` blir usann;
- de syv aktive personene ser **nøyaktig de samme radene** som før, tabell for
  tabell.

**Restlisten (39 funksjoner) som må få kontrollen én for én**, fordi de leser
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

Når P2.0 bygges, byttes testen «ingen tabell og ingen security
definer-funksjon kontrollerer aktivt medlemskap ennå» ut med at
`medlemskapsdekning` er tom (med eventuelle unntak begrunnet her), og
prototypen fjernes. Navnene i prototypen er forslag; mønsteret `KONTROLL` i
testen følger det P2.0 velger.

**Til avklaring i P2.0 (tekniske valg, ikke Peders):**

- Om `har_aktivt_medlemskap()` skal være eneste inngang for en avsluttet
  bruker (anbefalt), eller om egne `medlemskap`-rader også skal kunne leses.
- Ytelse: den begrensende regelen evalueres én gang per spørring
  (`(select …)`), men måles med `npm run db:maling` i testmiljøet før og etter
  (P0 §6.2 punkt 6).
- Rekkefølgen med P1.2a: Edge-kravet legges i den felles kontrollen tråd A
  innfører, ikke i en parallell kopi.

## Tilgangsmatrisen

`tilgangsmatrise.test.ts` har 44 scenarioer. Hvert har person, etappe,
utfallet i dag (`idag`) og målet (`mal`) etter rettighetsmatrisen i P0 §5.2:

| Etappe | Hull i dag | Eksempler |
| --- | --- | --- |
| P2.0 | 23 | Uten aktivt medlemskap: lese kommentar, tråd, direktelenke, idéoversikt, profiler, profilbilder, egne varsler, stoffregisteret; opprette tråd og kategori. Tidligere admin: lese og lagre utkast, lese datakildestatus |
| P2a | 5 | B-bruker og avsluttet A-medlem leser A sin lokale fortolkningskommentar; lokal admin i B leser, lagrer og publiserer A sitt utkast. Forutsetter `ressursomfang` (P4a) og D3 |
| P2b | 6 | B-bruker får varsel om A sin publisering, leser og slår opp A sin fortolkningstråd, gir nytt navn til andres tråd, flytter en lokal tråd til en fagside; vanlig bruker rydder idéarkivet |
| P2c | 1 | B-bruker leser rollen til en administrator i A |
| P2d | 2 | Vanlig bruker endrer stoffregisteret; lokal admin leser datakildestatus |
| P1.1 (holder alt) | 0 av 7 | Lese andres medlemskap, gjøre seg selv til systemarkitekt eller lokal admin, utkast for vanlig bruker; og at systemarkitekt, lokal admin i eget fagmiljø og dobbeltmedlem fortsatt har tilgangen sin |

Testen krever at utfallet i dag er det som står. Lukker en etappe et hull,
feiler scenarioet med «Hullet er lukket: sett idag til …»; da settes `idag`
lik `mal` i samme PR, som bevis. En etappe er ferdig når ingen av scenarioene
dens har `idag` ulik `mal`. Nye scenarioer (fra P0 §4) legges til i lista;
kontoglobale operasjoner (nytt passord, rolle) testes i P1.2a.

## Avhengigheter til de parallelle oppgavene

- **P1.2a (adminoperasjonene):** ingen felles filer. Ny funksjon i `public`
  må, som før, føres i `funksjonskontroller.ts`, og her plasseres av en regel
  i `tilgangsomrader.ts` (reglene for (d) dekker alt med `fagmiljo`,
  `medlemskap`, `systemrolle`, `tilgang`, `administrator`, `passord` og `rolle` i
  navnet). Persongalleriet kan brukes i P1.2a sine databasetester.
- **P1.2b (utrulling av Edge-funksjonene):** ingen felles filer. En ny
  Edge-funksjon må nevnes i dette dokumentet (testen krever det).
- **P4a (`ressursomfang`):** ingen felles filer. Får tabellen rettigheter for
  nettleseren, må den plasseres i `tilgangsomrader.ts`. Når rekkevidden finnes,
  kan P2a-scenarioene bruke den direkte.
