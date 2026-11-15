# Fagmiljøer, medlemskap og systemroller

Leses når noe som har med fagmiljøer, medlemskap, systemarkitekter, lokale
administratorer eller tilgangsloggen skal endres. Planen og begrunnelsene står
i `docs/ousfar-nasjonal-p0-kartlegging.md` (§5–8); brukersystemet ellers i
`docs/brukere.md`.

## Status

P1.1 har lagt grunnmuren: tabellene, vaktene og dagens kontoer fordelt på to
fagmiljøer. P1.2a bruker dem for det første: **myndigheten over andres
kontoer** (nytt passord og adminrolle, under). P4a har gitt hvert objekt i
faginnholdet en rekkevidde, felles eller lokal
([Rekkevidden](#rekkevidden-ressursomfang)). P2.0 krever **aktivt
medlemskap** for alt ([Aktivt medlemskap](#aktivt-medlemskap)). P2a lar
rekkevidden styre **faginnholdet og fortolkningsressursene**: lokalt innhold
leses bare i fagmiljøet det hører til, og utkast og endringer krever
endringsrett til objektet
([Faginnholdet etter rekkevidden](#faginnholdet-etter-rekkevidden)). P2b
avgrenser diskusjonene, varslene og lenkene per fagmiljø
([Samhandlingen](#samhandlingen)). P2c har gjort det for profilene og
profilbildene ([Profiler og profilbilder](#profiler-og-profilbilder)). P2d har
gjort stoffregisteret, administrasjonen og datakildene til
**systemrettigheter**: den gamle adminrollen gir dem ikke lenger
([Systemrettighetene](#systemrettighetene)). P4b gir **fortolkningen nøkler
og oppslag per fagmiljø**: hvert fagmiljø får bare sine egne regler, og et
fagmiljø uten egne regler får en tydelig stopp
([Fortolkningen per fagmiljø](#fortolkningen-per-fagmiljø)). P3 lar
systemarkitektene og de lokale administratorene **administrere
medlemskapene**, og sperrer en konto i Auth når det siste aktive medlemskapet
avsluttes ([Medlemskap og kontosperring](#medlemskap-og-kontosperring)). P4c
har flyttet **analyttkatalogen** — kodene, metodene, måleområdene,
søkeordene, modulene og koblingene til stoffene — og EtG/EtS-tekstene fra
klientpakken til databasen per fagmiljø
([Analyttkatalogen per fagmiljø](#analyttkatalogen-per-fagmiljø)). P6 gir
**gruppene**: grupper i ett fagmiljø og på tvers, med egne diskusjoner bare
medlemmene ser ([Gruppene](#gruppene)). Alle bygger på de felles hjelperne
([Hjelperne](#hjelperne-for-tilgang-per-fagmiljø)).

## Fagmiljøene

| Nøkkel | Navn | Standard | Åpent for medlemmer |
| --- | --- | --- | --- |
| `ous-klinisk-farmakologi` | OUS Klinisk farmakologi | Ja | Ja |
| `ous-rettstoksikologi` | OUS Rettstoksikologi | Nei | Ja, fra startporten S2 (`20261115040000_s2_apne_rettstoksikologi.sql`, etter Peders godkjenning) |

Alle nåværende fortolkningssystemer hører til OUS Klinisk farmakologi
(beslutning D1). OUS Rettstoksikologi har ingen fortolkningsregler.

- **Standard** er fagmiljøet en ny konto får som primærmedlemskap. Nøyaktig
  ett fagmiljø er standard, og det må være aktivt og åpent.
- **Åpent for medlemmer** (`apent_for_medlemmer`) avgjør om andre enn
  systemarkitektene kan få et gjeldende medlemskap. Bare standarden var åpen
  inntil startporten S2 var passert (§6.3 i P0-rapporten); et fagmiljø åpnes
  bare i en egen, godkjent migrasjon, slik OUS Rettstoksikologi ble åpnet. Kontrollen før S2 står i
  `docs/s2-kontrollrapport.md`, med den samlede tilgangsmatrisen A↔B
  (`src/__tests__/s2tilgang.test.ts`). Databasen nekter å åpne et fagmiljø uten
  at innstillingen `ousfar.startport` i samme transaksjon navngir det
  (`20261115003000_startportvern.sql`; i testene `apneFagmiljo` og
  `startportSql`), og en migrasjon som gir slippet eller endrer vernet, stoppes
  i CI og før utrullingen til den har Peders godkjenningsmerke
  (`docs/migrasjoner.md`).

## Tabellene

| Tabell | Hva |
| --- | --- |
| `fagmiljoer` | Fagmiljøene. Arkiveres (`status`), slettes aldri. `nokkel` står fast |
| `medlemskap` | Hvem som tilhører hvor: `status` (`aktiv`, `invitert`, `deaktivert`), `primaer`, `fra`/`til`. Høyst ett aktivt primærmedlemskap per konto og ett gjeldende per fagmiljø |
| `systemroller` | Systemarkitektene, knyttet til konto-ID-en. Tilbakekalles med `tilbakekalt_kl` |
| `fagmiljoadministratorer` | Lokale administratorer. Aktiv så lenge `til` står tom |
| `tilgangslogg` | Hver endring i de fire tabellene over og i `ressursomfang`, med aktør, før og etter og begrunnelse |
| `ressursomfang` | Rekkevidden til hvert redigerbare objekt (P4a, under) |

Alle ligger i `public` med radsikkerhet på. Nettleseren kan bare lese sine
egne medlemskap og navnet på fagmiljøene den er aktivt medlem av; resten har
ingen rettigheter for `anon` eller `authenticated`. Det som skal skrive, går
server-side.

## Reglene databasen håndhever

1. En konto med aktive medlemskap har nøyaktig ett av dem som primært, og
   en konto uten har ingen (P3: da er den sperret, under). En ny konto får
   primærmedlemskapet i standardfagmiljøet med en gang (utløseren
   `profiles_standardmedlemskap`).
2. En aktiv lokal administrator har aktivt medlemskap i samme fagmiljø.
3. Et aktivt fagmiljø mister aldri sin siste aktive administrator, og et
   fagmiljø som opprettes eller gjenåpnes, må få en i samme transaksjon.
4. Den siste systemarkitekten kan ikke tilbakekalles.
5. Nøyaktig ett fagmiljø er standard. Standarden kan byttes i én
   transaksjon, men aldri mangle, slik at nye kontoer alltid får medlemskap.
6. Et gjeldende medlemskap krever et aktivt fagmiljø som er åpent for
   medlemmer, eller at brukeren er systemarkitekt (startporten S2).
7. Rader avsluttes, de slettes ikke. De forsvinner bare i kaskaden når selve
   kontoen slettes, slik at sletting av brukere virker som før; regel 3 og 4
   gjelder også da. Feltene som identifiserer en rad (bruker, fagmiljø,
   rolle, starttidspunkt, fagmiljøets nøkkel) kan ikke endres.
8. Tilgangsloggen kan verken endres, slettes eller tømmes.

Regel 1–5 kontrolleres når transaksjonen avsluttes (utsatte utløsere), slik at
en endring kan gjøres i flere steg. Regel 6–8 gjelder med en gang.

### Samtidige endringer

To transaksjoner som hver fjerner én av de to siste administratorene i et
fagmiljø, eller hver én av de to siste systemarkitektene, kunne begge ha sett
den andres rad som aktiv og sluppet gjennom. Derfor tar hver setning som endrer
`fagmiljoer`, `medlemskap`, `systemroller` eller `fagmiljoadministratorer`,
først én felles transaksjonslås (`intern.serialiser_tilgang()`, en
`pg_advisory_xact_lock`), og holder den til transaksjonen er ferdig. Endringer
i tilgangene skjer derfor én transaksjon om gangen; de er sjeldne, så ventingen
merkes ikke. Låsen tas før radene, slik at to transaksjoner ikke kan vente på
hverandre i ring.

Kontrollen av regel 1, 3 og 4 teller radene med `for share`:

- i `read committed` (standarden) ser den ventende transaksjonen den andres
  endring og stoppes av regelen (SQLSTATE `23514`);
- i `repeatable read` og strengere stoppes den med serialiseringsfeil
  (`40001`).

`src/__tests__/fagmiljoer.samtidighet.test.ts` viser dette med to egne
forbindelser mot ekte Postgres 17, i begge isolasjonsnivåene. Den kjører i CI
(Postgres 17 som tjeneste) og lokalt når `OUSFAR_POSTGRES_URL` er satt.

Hver endring føres i `tilgangslogg` av databasen selv. `aktor` er den
innloggede, eller tom for migrasjoner og server. En migrasjon eller et
serverkall oppgir begrunnelsen med
`set_config('ousfar.tilgangsgrunn', '<grunn>', true)`.

## Tilbakefyllingen av dagens kontoer

`supabase/migrations/20261113140100_fagmiljoer_tilbakefylling.sql` fordelte
kontoene som fantes, etter beslutningene D1 og D2:

- `maxhag` fikk primærmedlemskap i OUS Rettstoksikologi, alle andre i OUS
  Klinisk farmakologi;
- `peohol` og `maxhag` ble systemarkitekter;
- hver tidligere administrator ble lokal administrator i sitt eget fagmiljø,
  og `maxhag` lokal administrator i OUS Rettstoksikologi uansett tidligere
  rolle.

Den kjøres bare i produksjonen, siden den stopper uten kontoene `peohol` og
`maxhag`. Den kontrollerer sluttilstanden selv og skriver bare antall i
loggen. `src/__tests__/fagmiljoer.test.ts` kjører den mot syntetiske kontoer,
med `maxhag` både som tidligere administrator og som vanlig bruker.

En administrator som får `role = 'admin'` gjennom `sett-rolle`, blir lokal
administrator i sitt primære fagmiljø (P1.2a, over). Siden P3 utpeker
systemarkitektene lokale administratorer for seg
([Medlemskap og kontosperring](#medlemskap-og-kontosperring)).

## Myndighet over kontoer

`supabase/migrations/20261113203000_kontomyndighet.sql` (P1.2a) avgjør hvem som
kan gi nytt passord til og endre adminrollen til hvem. Edge-funksjonene
`nytt-passord` og `sett-rolle` kaller kontooperasjonene der med den innloggedes
ID fra JWT-en; nettleseren kan ikke kalle dem.

**Myndighetsnivået** til den det gjelder (`intern.myndighetsniva`): 3 for en
systemarkitekt, 2 for en administrator (lokal administrator hvor som helst,
eller den gamle rollen `admin`), 1 for alle andre. Alt som kan gi myndighet,
teller, så en konto aldri regnes lavere enn den er; en systemarkitekt er
beskyttet uansett `profiles.role`.

**Den som handler**, har myndighet som systemarkitekt, eller i fagmiljøene
vedkommende administrerer nå (`intern.administrerte_fagmiljoer`: aktiv
tildeling, aktivt medlemskap og aktivt fagmiljø). Den gamle rollen alene gir
ingen myndighet over andres kontoer, og den kreves heller ikke: den nye
modellen avgjør.

| | Nytt passord | Gi eller ta adminrollen |
| --- | --- | --- |
| Systemarkitekt | Alle unntatt systemarkitekter | Alle unntatt systemarkitekter |
| Lokal administrator | Vanlige brukere (nivå 1) som bare hører til fagmiljøer vedkommende administrerer, også inviterte medlemskap | Ingen |
| Andre | Ingen | Ingen |

I tillegg:

- Ingen kan gjøre noe av dette med sin egen konto.
- Den som gjøres til administrator, blir også lokal administrator i sitt
  primære fagmiljø, slik tilbakefyllingen gjorde med dem som var det. Den som
  mister rollen, slutter som lokal administrator overalt.
- En konto med midlertidig passord (ikke ferdig førstegangsoppsett) kan ikke
  gjøres til administrator. Passordet kan være kjent av den som laget det. (`55000`)
- Den siste med adminrollen, og den eneste lokale administratoren i et aktivt
  fagmiljø, kan ikke fjernes.
- To systemarkitekter kan ikke gi hverandre nytt passord. Har en
  systemarkitekt mistet passordet, settes det utenfra, som når alle
  administratorene er borte (`docs/brukere.md`).

**Det appen viser.** `public.mine_kontohandlinger()` gir den innloggede
kontoene vedkommende har myndighet over, med hvilke av de to handlingene
databasen tillater. Den bygger på den samme avgjørelsen som operasjonene
(`intern.kontoavslag`), så knappene stemmer med det som går gjennom. En
systemarkitekt eller lokal administrator uten den gamle rollen får
adminmenyen med bare «Brukere», og en lokal administrator får aldri
rolleknappen. Knappene er et grensesnitt: operasjonene kontrollerer på nytt.
«Opprett bruker» og de andre adminpanelene krever fortsatt den gamle rollen
til P2.

**Den første administratoren.** `npm run bootstrap:admin` og det lokale
testmiljøet bruker `kontooperasjon_forste_administrator`: adminrollen og lokal
tildeling i det primære fagmiljøet, og systemarkitekt hvis det ikke finnes
noen (en ny, tom database). I produksjonen finnes systemarkitektene, og ingen
blir det på den måten.

**Samtidighet.** Hver operasjon tar den felles låsen (`intern.las_tilgang`)
før kontrollen og holder den til endringen er gjort, og endringer av
`profiles.role` venter også på den. Operasjonene kjøres bare i `read
committed` (som data-API-et bruker), slik at kontrollen etter låsen ser det en
annen transaksjon nettopp lagret; i strengere isolasjon stoppes de (`25001`).

**Nytt passord** byttes i Auth, utenfor databasen, og går derfor i tre steg:
`kontooperasjon_klarer_passord` kontrollerer og reserverer kontoen
(`intern.passordreservasjoner`, med et merke for tilgangene til kontoen, siste
rad om den i tilgangsloggen, og en nøkkel), Edge-funksjonen bytter passordet,
og `kontooperasjon_fullfor_passord` kontrollerer på nytt og krever den samme
reservasjonen og uendret merke. Først da settes kontoen i førstegangsoppsett
og passordet gis ut. Er noe endret underveis, også om det er endret tilbake,
gis passordet ikke ut (`40001`), og kontoen står med et passord ingen kjenner
til noen med myndighet gir et nytt. Ingen uten myndighet kommer forbi første
steg.

Bare én tilbakestilling av en konto kan være i gang om gangen (`55P03` for
den andre); ellers kunne to administratorer skrevet hvert sitt passord til
Auth, og den ene fått utlevert et som alt var overskrevet. Feiler byttet eller
siste kontroll, frigir Edge-funksjonen reservasjonen
(`kontooperasjon_frigi_passord`); ellers er den ute etter ti minutter, lenger
enn en Edge-funksjon kan kjøre, og den gamle kan da ikke fullføres.

**Loggen.** Endringer av `profiles.role` føres i tilgangsloggen
(`profiles.update`), og hvert nytt passord som `passord.update`. Aktøren er
den innloggede, eller den et serverkall oppgir med
`set_config('ousfar.tilgangsaktor', …, true)`; den innloggede går alltid
foran.

`src/__tests__/kontomyndighet.test.ts` prøver tilfellene med et persongalleri
i begge fagmiljøene, og `fagmiljoer.samtidighet.test.ts` to samtidige
rollefjerninger mot ekte Postgres.

## Rekkevidden (`ressursomfang`)

Hvert objekt i `redigerbare_objekter` har nøyaktig én rad i `ressursomfang`:
`felles`, eller `fagmiljo` med fagmiljøet det hører til. (`gruppe` er
forberedt for P6, men avvist til gruppene finnes.) Klassifiseringen følger
P0-rapporten §3 og beslutningen D4 fra OUSFAR Fag
([#374](https://github.com/peohol/ousfar/issues/374)), etter objekttypen, og
står i én regel, `intern.ressursomfang_for(objekt)`, som både
tilbakefyllingen og nye objekter bruker. Regelen har typens navn.

| Objekt | Rekkevidde |
| --- | --- |
| Fagside (`infoside`) | Felles |
| Kort og tekst på en fagside (`innholdselement`), også referanseområdene, TDM-kortene og tabellene over serumkonsentrasjoner | Felles |
| Referanse | Felles |
| Laboratorieanalytt | OUS Klinisk farmakologi |
| Intervallregelsett | OUS Klinisk farmakologi |
| Scenarioregelsett (rusmodulene) | OUS Klinisk farmakologi |
| Fortolkningskommentar, også THC-syretekstene | OUS Klinisk farmakologi |
| THC-syreregelsettet: kurvene, måleusikkerheten, sikkerhetsmarginene og grensene | OUS Klinisk farmakologi |

**D4 (#374).** Referanseområdene i «Viktige data» er felles og like for alle
fagmiljøer, uten lokal overstyring på fagsiden. Et fagmiljøs egne
vurderings- eller beslutningsgrenser hører hjemme i dets lokale
fortolkningsdata og skal aldri erstatte det felles referanseområdet; skillet
mellom dem lages i P4b, uten å endre dagens kliniske output. THC-syrens kurver
og regelsett er lokale til en deling er særskilt og kildeforankret godkjent;
motoren er felles. TDM-kortene og tabellene over serumkonsentrasjoner er
felles, men kontrolleres for laboratoriespesifikke opplysninger før noe
fagmiljø utenom OUS får tilgang (startporten S2).

Reglene databasen håndhever:

1. Et nytt objekt får rekkevidden etter regelen i samme transaksjon
   (utløseren `redigerbare_objekter_ressursomfang`). En objekttype uten regel
   stopper; en ny type må få en regel her først.
2. Ingenting endres av seg selv etterpå: et lokalt objekt blir bare felles ved
   at noen endrer raden. En rad satt for hånd har tom `regel`, og
   tilbakefyllingen godtar den.
3. Raden kan endres, men ikke fjernes, tømmes eller flyttes til et annet
   objekt. Den forsvinner bare sammen med objektet, når det slettes for godt
   (kontrollert ved slutten av transaksjonen).
4. Hver endring føres i `tilgangslogg` (`ressursomfang.update`), med
   begrunnelsen fra `ousfar.tilgangsgrunn`. Nye rader føres ikke; de følger av
   regelen.
5. Nettleseren kan bare lese, og bare rekkevidden til det den innloggede kan
   lese (P2a): felles, og lokalt for fagmiljøene i
   `public.mine_lesbare_fagmiljoer()`. Ingen kan skrive i tabellen fra
   nettleseren.

`supabase/migrations/20261113210100_ressursomfang_tilbakefylling.sql` ga
objektene som fantes, rekkevidden etter regelen. Den tåler å kjøres på nytt,
kontrollerer selv at hvert objekt har nøyaktig én rekkevidde lik regelens
(utenom dem som er satt for hånd), og
skriver antall per regel i loggen. Den kjøres også i testene
(`src/__tests__/ressursomfang.test.ts`), mot objekter som finnes før
strukturen.

**Resten av ressursene.** Tabellene som ikke er objekter, og de statiske
datafilene i klientpakken og repoet, har rekkevidden sin erklært i
`src/__tests__/data/ressurskatalog.ts`: per objekt, avledet (av objektet,
fagsiden eller sidenøkkelen), felles, lokal, personlig, felles forvaltning
eller tilgang. Testen stopper en tabell, visning eller fil under `src/data/`
og `originaldata/` uten erklæring, og en erklæring for noe som ikke finnes.
Diskusjonene har fått rekkevidde per tråd i P2b, avledet av sidenøkkelen
([Samhandlingen](#samhandlingen)). De lokale datafilene for analyttkatalogen
er flyttet til databasen i P4c og er nå bare importgrunnlag, som aldri skal i
klientpakken ([Analyttkatalogen per fagmiljø](#analyttkatalogen-per-fagmiljø)).

**Tilbakeføring.** Reglene i faginnholdet (P2a) slår opp i tabellen; den må
stå så lenge de gjør. Utløserne kan tas bort i en ny migrasjon uten at noe
annet endres.

## Samhandlingen

P2b avgrenser diskusjonene, kommentarene, varslene og lenkene til fagmiljøene
den innloggede kan lese (`docs/diskusjoner.md`, «Hvem som ser diskusjonene»,
og `docs/varsler.md`). Rekkevidden til en tråd følger siden: fagsidene og
stoffregisteret er felles, fortolkningen hører til fagmiljøet sitt. Den står
på tråden og kategorien (`omfang`, `fagmiljo_id`) og på varselet
(`fagmiljo_id`), satt av databasen, og radsikkerheten `rekkevidde` (restriktiv,
som `aktivt_medlemskap`) og funksjonene leser den. Moderering følger
rettighetsmatrisen (P0 §5.2): de lokale administratorene på fagmiljøets egne
sider, systemarkitektene på de felles; den gamle adminrollen gir ingenting her.
Å styre en tråd (overskrift, flytting, arkiv) kan den som startet den, og en
moderator. På en fortolkningsside har hvert fagmiljø sitt eget rom med egne
kategorier, unike bare der, og modereringen følger trådens rom
(`docs/diskusjoner.md`, «Rommene»; #395).

**Idéene og de planlagte oppgavene** følger Peders beslutning D8
(2026-11-14): idéene deles av alle med et aktivt medlemskap, uansett
fagmiljø, og varslene om dem går bare til dem. De planlagte oppgavene, og det
å arkivere, overføre, gjenopprette og rydde idéer, er forbeholdt
systemarkitektene (`intern.krev_idevalg_admin()`, radsikkerheten på
`oppgaver`, og slettingen av idéer og kommentarer). Den gamle adminrollen gir
ingenting her; appen spør databasen (`er_systemarkitekt()`) og viser
Planlagte oppgaver og handlingene bare for systemarkitektene.

**Tilbakeføring.** Radsikkerheten `rekkevidde` kan tas bort og funksjonene
settes tilbake til forrige versjon i en ny migrasjon; kolonnene kan stå.
Varslene om fortolkningen har fått gruppen per fagmiljø og beholder den.

## Gruppene

P6 (`supabase/migrations/20261114232000_grupper.sql`) gir grupper med egne
diskusjoner. En gruppe hører til **ett fagmiljø** (`art = 'fagmiljo'`) eller
går **på tvers** av fagmiljøene (`art = 'tverrfaglig'`). Det er ingen chat og
ingen fildeling i gruppene (krever D6 og S5).

**Tabellene.** `grupper` (navn, beskrivelse, art, fagmiljø, status `aktiv`
eller `arkivert`) og `gruppemedlemskap` (rolle `medlem`, `moderator` eller
`ansvarlig`; status `invitert`, `aktiv` eller `avsluttet`; høyst én gjeldende
rad per gruppe og bruker). Som de andre tilgangstabellene: radsikkerhet uten
regler og ingen rettigheter for nettleseren, alt føres i tilgangsloggen med
grunnen, faste felter kan ikke endres, og ingenting slettes. Et medlemskap
som avsluttes, får status `avsluttet` og står.

**Hvem som er med.** Én definisjon, `intern.grupperolle(gruppe, bruker)`: et
aktivt medlemskap i en aktiv gruppe, **og** at brukeren kan være med i
gruppen nå (`intern.kan_vaere_med_i_gruppe`): aktivt medlemskap i gruppens
fagmiljø for en gruppe i et fagmiljø, aktivt medlemskap i OUSFAR for en
gruppe på tvers. Tilgangen regnes ut hver gang. Avsluttes medlemskapet i
fagmiljøet, ser brukeren straks ingenting i gruppene der, uten at noe må
ryddes; får hen medlemskapet igjen, er gruppene tilbake. De ansvarlige ser
det som «Uten tilgang nå» i medlemslista.

| Hvem | Lese gruppen | Moderere diskusjonene | Styre gruppen |
| --- | --- | --- | --- |
| Medlem | ja | nei | nei |
| Moderator | ja | ja | nei |
| Ansvarlig | ja | ja | ja |
| Systemarkitekt | ja, alle | ja, alle | ja, alle |
| Lokal administrator som ikke er med | nei | nei | nei |

*Styre* er å invitere, endre roller, fjerne medlemmer, endre navnet og
beskrivelsen og arkivere. En gruppe i et fagmiljø opprettes av en lokal
administrator der; en gruppe på tvers bare av en systemarkitekt
(`intern.gruppeopprettelsesavslag`). Den som oppretter, blir ansvarlig.

**Ingen tilgang til et annet fagmiljø.** Gruppene gir bare tilgang til
gruppens egne sider. Rekkevidden til alt annet er uendret: en bruker i B som
er med i en gruppe sammen med A, leser fortsatt ingenting lokalt i A,
verken faginnhold, fortolkning, tråder, kommentarer eller varsler derfra.

**Diskusjonene.** Hver gruppe har én diskusjonsside, `gruppe:<ID>`, med de
vanlige trådene, kategoriene, kommentarene, hjertene, varslene og lenkene
(`docs/diskusjoner.md`). Databasen setter `omfang = 'gruppe'` og `gruppe_id`
på tråden og kategorien, og radsikkerheten `rekkevidde` og funksjonene leser
dem gjennom `intern.kan_lese_samhandling(fagmiljo, gruppe)`. En tråd kan
aldri flyttes inn i eller ut av en gruppe. Varslene om en tråd i en gruppe
har `gruppe_id` og går bare til dem som leser gruppen. Fjernes et medlem, mister hen med en
gang trådene, kommentarene, varslene, søket og direktelenkene i gruppen; det
hen har skrevet, blir stående.

**Invitasjonene.** En ansvarlig inviterer med brukernavnet. Svaret er det
samme for et brukernavn som ikke finnes og for en konto som ikke kan være med
(`Fant ingen som kan inviteres med det brukernavnet.`), så skjemaet ikke kan
brukes til å finne ut hvem som har konto. Den inviterte ser invitasjonen
under «Grupper» i kontomenyen, med en prikk, og har ingen tilgang før den er
godtatt. En invitasjon vises bare så lenge den inviterte kan være med:
mister hen medlemskapet i gruppens fagmiljø, ser hen verken invitasjonen,
navnet eller beskrivelsen, og den kan ikke godtas. Medlemmene ser
profilkortet til de inviterte.

**Minst én ansvarlig.** En aktiv gruppe har alltid minst én aktiv ansvarlig.
Operasjonene sier fra før noe skjer (`intern.gruppeavslag`, også grunnlaget
for knappene), og en utsatt regel på tabellene stopper resten (23514). Den
slår bare til når status eller rolle endres, så å slette en konto stoppes
aldri av den. Slettes kontoen til den siste aktive ansvarlige, arkiveres
gruppen ved commit (`intern.arkiver_gruppe_uten_ansvarlig`, grunnen
«Arkivert: den siste ansvarlige ble slettet» i tilgangsloggen); resten av
medlemskapene står, og en systemarkitekt kan åpne gruppen igjen og gi den en
ny ansvarlig.

**Arkiv.** En ansvarlig kan arkivere gruppen. Da leser bare
systemarkitektene den, og bare de kan åpne den igjen.

**Operasjonene** (alle krever aktivt medlemskap, låser gruppens rad og gir
samme svar når de alt er utført): `opprett_gruppe`, `endre_gruppe`,
`arkiver_gruppe`, `inviter_til_gruppe`, `svar_paa_gruppeinvitasjon`,
`sett_grupperolle` og `avslutt_gruppemedlemskap` (for seg selv: forlate
gruppen eller avslå invitasjonen). Lesingen: `mine_grupper()` (gruppene,
invitasjonene og hvor nye grupper kan opprettes), `gruppeoversikt(gruppe)`
(medlemmene og handlingene) og `mine_lesbare_grupper()` (for
radsikkerheten).

**Idéene** er uendret (D8): felles for alle med aktivt medlemskap. Gruppene
har ingen egne idéer.

**Tilbakeføring.** Tabellene, kolonnene og funksjonene kan stå. En ny
migrasjon kan ta grenen for grupper ut av `rekkevidde`-reglene og funksjonene
(som da ser alt med `omfang = 'gruppe'` som ulesbart), eller arkivere alle
gruppene.

## Aktivt medlemskap

P2.0 (`supabase/migrations/20261114103000_aktivt_medlemskap.sql`): en
innlogget bruker med fortsatt gyldig tilgangstoken, men uten et aktivt
medlemskap, får verken lese eller skrive noe, verken gjennom tabellene,
funksjonene, profilbildene eller Edge-funksjonene. Ingen medlemskap avsluttes
av dette, og Auth sperres ikke (P3).

**Regelen.** `intern.har_aktivt_medlemskap(bruker)` er den eneste
definisjonen: et medlemskap med status `aktiv` i et fagmiljø med status
`aktiv`, eller systemarkitekt (`intern.er_systemarkitekt`). Et invitert,
suspendert eller avsluttet medlemskap teller ikke, og heller ikke et aktivt
medlemskap i et arkivert fagmiljø. Om fagmiljøet er åpent for ordinære
brukere (`apent`), spiller ingen rolle her. Den gamle adminrollen
(`profiles.role`) gir ingenting alene: `er_admin()` krever nå også aktivt
medlemskap. En systemarkitekt uten adminrollen blir ikke administrator av
dette.

**Der den håndheves.**

| Inngang | Hvordan |
| --- | --- |
| Tabellene i `public` nettleseren når, og `storage.objects` (profilbildene) | Den begrensende regelen `aktivt_medlemskap` for `authenticated`, for alle kommandoer, i tillegg til de tillatende reglene, som ikke er skrevet om. Den legges på alle tabellene en innlogget har en rettighet på, så en tabell som får en ny rettighet, må få regelen (katalogvakten under) |
| `storage.buckets` og Supabase sine andre tabeller | Radsikkerhet uten noen tillatende regel for nettleseren; gir ingen rader til noen |
| Visningene | Kjøres som den innloggede (`security_invoker`) og arver tabellenes regler |
| Portfunksjonene `intern.krev_innlogget`, `intern.krev_registerbruker`, `intern.krev_admin` og `public.er_admin` | Kontrollen er bygd inn, og dekker funksjonene som går gjennom dem |
| De andre 40 `security definer`-funksjonene nettleseren kan kalle | `intern.krev_aktivt_medlemskap()` som første setning; listen står i `docs/p2-0-forberedelse.md` («Restlisten») |
| Edge-funksjonene | `hentInnlogget` (`supabase/functions/_edge/kontekst.ts`) spør `kontooperasjon_aktivt_medlemskap` og avviser med 403 |
| Vercel-endepunktene (`api/*.ts`) | Slipper inn en innlogget bare når `er_admin()` svarer ja for vedkommende (`src/server/tilgang.ts`), og det krever nå aktivt medlemskap. Cron, GitHub OIDC og kurateringsagentenes nøkler er ingen brukere og berøres ikke |

Tre funksjoner svarer i stedet for å stoppe, og bare om den innloggede selv:
`er_admin()` svarer nei, `har_aktivt_medlemskap()` (som reglene bruker)
svarer nei, og `min_medlemskapsstatus()` svarer `avsluttet`. Det er de eneste
opplysningene en bruker uten medlemskap får.

**Serverprosesser.** `intern.krev_aktivt_medlemskap()` slipper gjennom et
kall uten innlogget bruker når rollen er `service_role` eller det ikke finnes
noen JWT (migrasjoner, `pg_cron`-jobber, synkene med den hemmelige nøkkelen).
Et kall med en bruker-ID i JWT-en prøves alltid, også om rollen er
`service_role`, og et anonymt kall stoppes. Den begrensende regelen gjelder
bare `authenticated`; `service_role` går forbi radsikkerheten som før.

**I appen.** Når profilen ikke kommer, spør økten (`src/auth/okt.tsx`)
`min_medlemskapsstatus()`. Er svaret `avsluttet` (kontoen finnes, men uten
aktivt medlemskap), tømmes mellomlageret i nettleseren, og porten viser
«Ingen tilgang» med beskjeden og en utloggingsknapp
(`src/components/konto/Port.tsx`), uten å vise noe annet. Er svaret
`ingen_konto`, er kontoen slettet mens tokenet fortsatt gjelder, og brukeren
logges ut som før; det samme ved `aktiv`. Spørsmålet stilles når profilen
lastes, og siden P3 også i en fane som står åpen, så snart et svar fra
databasen eller en Edge-funksjon sier at medlemskapet er avsluttet
([Medlemskap og kontosperring](#medlemskap-og-kontosperring)).

**Ytelse.** Regelen er én oppslagsspørring på indeksen
`medlemskap_bruker_idx`, og databasen regner den ut én gang per spørring
(planen viser én `InitPlan`), ikke per rad. Målt i produksjonen 14.11.2026
(bare lesing): om lag 0,2 ms og seks blokker fra hurtigminnet, ingen
disklesing. I testdatabasen (`ytelse` før og etter, medianer) økte de
vanligste spørringene med 0,0–1,0 ms. Produksjonen hadde om lag 54 600 kall
fra innloggede brukere fra 5. til 14.11.2026, i snitt 139 ms hvert; det
regelen legger til, er godt under én prosent.

**Tilbakeføring.** En ny migrasjon som setter funksjonene tilbake til
definisjonene i migrasjonene før, og fjerner reglene `aktivt_medlemskap`.
Ingen data endres av P2.0.

**Testene.** `src/__tests__/aktivtmedlemskap.test.ts` prøver hver inngang
som en bruker uten aktivt medlemskap og som en tidligere administrator, og
sikkerhetsport S3 med én og samme innlogging før og etter at medlemskapet
avsluttes: tabellene, egen profil, diskusjonene, søket, varslene, skrivingen
og Edge-svaret virker før og stenger etter;
`tilgangsinnganger.test.ts` krever at hver tabell og funksjon har kontrollen;
`tilgangsmatrise.test.ts` har scenarioene for direkte tabell- og
funksjonskall med gyldig token; `avsluttetmedlemskap.test.tsx` prøver
beskjeden i appen.

## Medlemskap og kontosperring

P3 (`supabase/migrations/20261114221500_medlemskapsadministrasjon.sql`).
Systemarkitektene administrerer fagmiljøene og medlemskapene; en lokal
administrator legger til og avslutter medlemskap i sitt eget fagmiljø. Når en
konto mister sitt siste aktive medlemskap, sperres den i Supabase Auth.

**Hvem kan hva.** Den ene avgjørelsen er `intern.medlemskapsavslag(aktor,
mal, fagmiljo, handling)`: operasjonene stopper med den, og medlemslista i
appen viser knappene etter den. Den som handler, må administrere fagmiljøet
nå (`intern.er_lokal_admin_i`: aktiv tildeling, aktivt medlemskap og aktivt
fagmiljø, eller systemarkitekt), og ingen kan handle på sin egen konto.

| Handling | Systemarkitekt | Lokal administrator i fagmiljøet |
| --- | --- | --- |
| Gi medlemskap (`gi_medlemskap`, `legg_til_medlem` med brukernavnet) | Alle kontoer | Vanlige brukere (`intern.myndighetsniva` 1). En sperret konto bare i et fagmiljø den har vært medlem av før |
| Avslutte medlemskap (`avslutt_medlemskap`) | Alle, unntatt den siste administratoren i fagmiljøet og det siste medlemskapet til en systemarkitekt | Vanlige brukere |
| Utpeke og fjerne lokale administratorer (`sett_fagmiljoadministrator`) | Ja, aldri den siste; den nye må være aktivt medlem og ha valgt sitt eget passord | Nei |
| Opprette et fagmiljø (`opprett_fagmiljo`) | Ja: lukket, ikke standard, med seg selv som medlem og administrator | Nei |

En lokal administrator endrer aldri en systemarkitekt, en annen
administrator (eller en med den gamle adminrollen) eller noen utenfor sitt
fagmiljø. Den som ikke administrerer fagmiljøet, får vite det før noe om
brukeren (ukjent brukernavn gir samme avslag). **Startporten S2 står:** et
lukket fagmiljø tar bare imot systemarkitekter, både i avgjørelsen og i regel
6. Et fagmiljø åpnes fortsatt bare i en egen, godkjent migrasjon.

**Flere fagmiljøer.** En konto kan være medlem av flere. Å avslutte
medlemskapet i A rører ikke B; var A primært, blir det eldste av de andre
aktive primært (regel 1). Er brukeren lokal administrator i A, avsluttes det
samtidig. Historikken står: en rad avsluttes med `status = 'deaktivert'` og
`til`, og et nytt medlemskap er en ny rad.

**Sperren i Auth.** `intern.synkroniser_kontosperre(bruker)` lar sperren
følge `intern.har_aktivt_medlemskap`. Uten aktivt medlemskap settes
`auth.users.banned_until` om lag hundre år fram, som Supabase gjør for
«alltid», og øktene og fornyingsnøklene (`auth.sessions`,
`auth.refresh_tokens`) slettes. Auth avviser da innlogging og fornying av
økten. Et tilgangstoken som alt er utstedt, gjelder til det går ut (høyst en
time), men databasen og Edge-funksjonene gir det ingenting (P2.0). Sperren
står i `intern.kontosperrer`; når kontoen får et aktivt medlemskap igjen,
oppheves den, men bare om `banned_until` fortsatt er vår verdi, så en sperre
noen andre har satt i Auth, står. Hadde kontoen alt en sperre da vi sperret
den, også en tidsbegrenset, settes den tilbake (`forrige_sperre`), så den
aldri forkortes. En systemarkitekt sperres aldri.

Synkroniseringen kjøres av utsatte utløsere på `medlemskap`, `systemroller`
og statusen til `fagmiljoer`, når transaksjonen avsluttes. Den følger derfor
tilgangen uansett hvem som endret den: operasjonene, en migrasjon eller en
systemarkitekt i Supabase. Sperren skrives i samme transaksjon som
medlemskapet: feiler den, rulles alt tilbake, og ingenting er halvveis.
Migrasjonen sperret kontoene som alt sto uten aktivt medlemskap (ingen i
produksjonen 14.11.2026).

**Samtidige endringer.** Operasjonene tar den felles låsen
(`intern.las_tilgang`, bare i `read committed`) før de kontrollerer, og
synkroniseringen leser medlemskapene `for share`. To administratorer som
samtidig avslutter de to siste medlemskapene til samme konto, gjør det én
etter én, og kontoen ender sperret. Endres medlemskapene direkte i
`repeatable read`, stoppes den andre med serialiseringsfeil (`40001`) i
stedet for å la kontoen stå usperret.

**Gjentakelse.** En handling som alt er gjort, gir det samme svaret uten å
endre noe, så et kall som ble brutt av nettet, kan sendes igjen. Svaret er
`{bruker, fagmiljo, status, administrator, sperret}`.

**Loggen.** Hver endring føres i `tilgangslogg` med den innloggede som
aktør og en begrunnelse: medlemskapene, administratorene og sperrene
(`kontosperrer.insert` og `.delete`).

**I appen.** «Brukere» i adminmenyen viser medlemmene i ett fagmiljø om
gangen (`public.medlemsoversikt`, med handlingene databasen tillater på hver
rad), og de tidligere medlemmene for seg med «Gi tilgang igjen». En
systemarkitekt velger blant alle fagmiljøene og kan opprette nye. Det som
fjerner tilgang, må bekreftes, og bekreftelsen sier at kontoen sperres og
logges ut når det er det siste medlemskapet. Nye brukere opprettes i
standardfagmiljøet som før. I en fane som står åpen, ser
`src/auth/tilgangsstans.ts` etter avslaget om avsluttet medlemskap i hvert
svar klienten får; da spør økten `min_medlemskapsstatus()`, og er svaret
`avsluttet`, tømmes mellomlageret og det som er husket om kontoen, og porten
viser «Ingen tilgang». Et brudd i nettet endrer ingenting.

**Ikke med.** Arkivering og navnebytte av fagmiljøer, og invitasjoner, kommer
når de trengs. Innloggingssiden sier det samme til en sperret konto som ved
feil passord, så den ikke røper hvem som har konto.

**Tilbakeføring.** En ny migrasjon som fjerner de tre utløserne, funksjonene
og `intern.kontosperrer`, setter regel 1 og `mine_rettigheter()` tilbake, og
opphever sperrene som står i tabellen (`banned_until = forrige_sperre` der
den er vår verdi). Ingen medlemskap endres av tilbakeføringen.

**Testene.** `src/__tests__/medlemskapsadministrasjon.test.ts`: A→B og B→A,
flere medlemskap, det siste medlemskapet (sperren, øktene, loggen), det samme
gyldige tokenet etterpå, tilbakekalt administrator, vernet av administratorer
og systemarkitekter, reaktivering, gjentakelse, feil i Auth, startporten og at
knappene i medlemslista stemmer med operasjonene.
`src/__tests__/medlemskap.samtidighet.test.ts`: samtidige avslutninger på ekte
Postgres 17, i begge rekkefølger og isolasjonsnivåer.
`avsluttetmedlemskap.test.tsx`: den åpne fanen; `konto.test.tsx`:
medlemslista.

## Hjelperne for tilgang per fagmiljø

`supabase/migrations/20261114113500_rettighetshjelpere.sql` gir P2a–d de
samme svarene på de spørsmålene alle delene stiller, slik at ingen lager sin
egen variant. Bygg nye regler og funksjoner på disse:

| Funksjon | Svarer |
| --- | --- |
| `intern.er_medlem_i(fagmiljo, bruker default auth.uid())` | Aktivt medlemskap i det aktive fagmiljøet, eller systemarkitekt. Nei for et tomt fagmiljø eller en tom bruker |
| `intern.kan_lese_omfang(omfang, fagmiljo, bruker default auth.uid())` | `felles`: aktivt medlemskap (`intern.har_aktivt_medlemskap`). `fagmiljo`: `intern.er_medlem_i`. `gruppe`: bare systemarkitekter til gruppene finnes (P6). Alt annet: nei |
| `intern.er_lokal_admin_i(fagmiljo, bruker default auth.uid())` | Administrerer fagmiljøet nå (`intern.administrerte_fagmiljoer`: aktiv tildeling, aktivt medlemskap, aktivt fagmiljø), eller systemarkitekt. Den gamle adminrollen teller ikke |
| `public.mine_lesbare_fagmiljoer()` | Fagmiljøene den innloggede kan lese lokalt innhold i: de aktive medlemskapene i aktive fagmiljøer, alle for en systemarkitekt, ingen uten aktivt medlemskap |
| `public.mine_administrerte_fagmiljoer()` | Fagmiljøene den innloggede administrerer nå (`intern.er_lokal_admin_i`), alle for en systemarkitekt, ingen uten aktivt medlemskap |
| `public.er_systemarkitekt()` | Om den innloggede er systemarkitekt; nei uten aktivt medlemskap |
| `intern.arbeidsfagmiljo(bruker)` | Arbeidskonteksten (P4b, [under](#fortolkningen-per-fagmiljø)): det aktive primærmedlemskapet i et aktivt fagmiljø, null uten det, også for en systemarkitekt |

Funksjonene i `intern` er `stable security definer` uten rettigheter for
nettleseren, og brukes i `security definer`-funksjoner og utløsere.
Radsikkerhetsreglene kjøres som den innloggede og kan ikke kalle `intern`;
de bruker de tre i `public` som `(select public.mine_lesbare_fagmiljoer())`,
som regnes ut én gang per spørring, slik `har_aktivt_medlemskap()` gjør. De
svarer bare om den innloggede selv, og appen bruker dem til å vise det
brukeren får gjøre.

Systemarkitekten er «medlem» av alle fagmiljøer her, fordi rettighetsmatrisen
(P0 §5.2) lar systemarkitekten lese alt. Ingenting er tatt i bruk av
migrasjonen selv; rettighetene endres i P2a–d (faginnholdet: under). Testene står i
`src/__tests__/rettighetshjelpere.test.ts`.

## Profiler og profilbilder

P2c (`supabase/migrations/20261114130000_profiler_dataminimering.sql`) gir
dataminimering i brukeropplysningene (P0 §2.8, §4): man ser navnet og bildet
til dem man samhandler med, ikke en nasjonal katalog med roller.

**Hva andre får lese.** Andres profil er et *profilkort*: ID, brukernavn,
fornavn, etternavn, bildesti og når profilen sist ble endret (`PROFILKORT` i
`supabase/functions/_delt/profil.ts`, samme liste som kolonnerettighetene).
Rollen (`role`), `must_change_password`, `onboarding_completed` og
`created_at` kan ikke leses fra tabellen av noen i nettleseren, heller ikke
for egen rad. Skriveretten er uendret: navn og bildesti på egen rad.

**Hvem man ser.** Den tillatende leseregelen på `profiles` gir profilkortet
til:

| Hvem | Hvorfor |
| --- | --- |
| Seg selv | Egen konto |
| Alle, for en systemarkitekt | Systemarkitekten kan lese alt (P0 §5.2) |
| De aktive medlemmene i fagmiljøene man selv er aktivt medlem av | Eget fagmiljø (`intern.er_medlem_i`) |
| Medlemmene, også de inviterte, i fagmiljøene man administrerer | De samme kontoene administrasjonen kan handle på (`intern.er_lokal_admin_i`) |
| Medlemmene og de inviterte i gruppene man selv er med i nå | Medlemslista i gruppen ([Gruppene](#gruppene)) |
| Den som står bak en hendelse i et av egne varsler man fortsatt kan lese | Varselet sier «Ada kommenterte …» |
| Forfatteren av en tråd, kommentar eller idé man selv kan lese | Felles samhandlingspartnere |

De fire første radene regnes ut én gang per spørring av
`intern.synlige_profiler(seer)` (den eneste definisjonen, gjennom
`public.mine_synlige_profiler()` i regelen). Varslene og forfatterne leses
derimot i regelen selv, som den innloggede: aktørene i egne varsler som én
mengde per spørring, forfatterne med `exists` mot `diskusjoner`,
`diskusjonskommentarer`, `ideer` og `idekommentarer`. Et varsel eller en rad
man ikke kan lese, gjør derfor ingen synlig. Varsler fra et fagmiljø man ikke
lenger er medlem av (regelen `rekkevidde` på `varsler`, P2b), gir altså ikke
innsyn i profilen eller bildet til den som står bak. Når radsikkerheten på
varslene, trådene eller idéene strammes inn, følger profilene etter av seg
selv. Reglene på `varsler` og de fire tabellene må derfor aldri lese
`public.profiles` direkte (det ville gått i ring); bruk `security
definer`-hjelpere. En ny tabell med `forfatter_id` som nettleseren leser,
må med i regelen (`profiler.test.ts` stopper den).

Navn som `security definer`-funksjoner selv slår opp og gir sammen med
innholdet (endringsloggen, direktelenkene, stoffregisteret), følger
innholdet de står i, og hører til P2a, P2b og P2d.

**Profilbildene.** Leseregelen på `storage.objects` i bøtta `avatarer` gir
et bilde når den innloggede ser profilen som peker på det (oppslaget går
gjennom `profiles` som den innloggede), og eieren ser alltid sin egen fil,
også før profilen peker på den (opplastingen i førstegangsoppsettet). Et
bilde ingen profil peker på, er usynlig for andre. Skrivereglene er uendret.

**Egen profil og brukerlista.**

- `public.min_profil()` gir den innloggedes egen profil med alle feltene, som
  appen trenger for førstegangsoppsettet og visningen. Den er tom uten aktivt
  medlemskap, som tabellen var; appen spør da `min_medlemskapsstatus()`.
- `public.brukeroversikt()` gir brukerlista i administrasjonen profilkortet,
  rollen og kontostatusen, bare for kontoene den innloggede administrerer:
  alle for en systemarkitekt, medlemmene (også inviterte) i egne fagmiljøer
  for en lokal administrator, ingen for andre. Knappene på hver rad avgjøres
  fortsatt av `mine_kontohandlinger()`.

**Ytelse.** Systemarkitekten og mengden regnes ut én gang per spørring, og
forfatterne og bildene slås opp med indeks (`*_forfatter_idx`,
`profiles_avatar_path_idx`). Målt i testdatabasen med 1 000 syntetiske
brukere og 300 tråder: om lag 10 ms for alle profilkortene mot 6 ms før,
og 5 ms for en bruker som bare ser forfatterne. Med dagens 14 profiler er
forskjellen umerkelig.

**Tilbakeføring.** En ny migrasjon som gir tilbake `select` på hele
`profiles`, setter de to lesereglene tilbake til `true` og `bucket_id =
'avatarer'`, og fjerner funksjonene og indeksene. Ingen data endres.

**Testene.** `src/__tests__/profiler.test.ts` prøver regelen for hvert par i
persongalleriet, forfatterne og varslene, at rollen ikke kan leses, egen
profil, brukerlista og bildene; `tilgangsmatrise.test.ts` har scenarioene for
P2c.

## Systemrettighetene

`supabase/migrations/20261114131500_systemrettigheter.sql` (P2d) gir det som
gjelder hele OUSFAR, bare til systemarkitektene (P0 §5.2). Den gamle
adminrollen (`profiles.role = 'admin'`) gir ingen av dem; `er_admin()` og
`krev_admin()` står urørt for det P2a–c bytter ut.

| Rettighet | Hvem | Kontroll |
| --- | --- | --- |
| Endre stoffregisteret (kategorier, plasseringer, arkiv, papirkurv, utkast) | Systemarkitektene; P5 legger til tildelte redaktører | `intern.har_registerrett`, `intern.krev_registerbruker` |
| Slette for godt og tømme papirkurven, se utkast i registeret | Systemarkitektene | `intern.krev_systemarkitekt`, `intern.er_systemarkitekt` |
| Datakildestatus, kildeovervåking og kildesaker, verktøysperrene, styring av kurateringene, autoerstatt-reglene | Systemarkitektene | `intern.krev_systemarkitekt`, `public.er_systemarkitekt()` i reglene |
| Opprette brukere | Systemarkitektene og de lokale administratorene i standardfagmiljøet, der nye kontoer blir medlemmer | `intern.opprettelsesavslag`, kontrollert av `public.kontooperasjon_klarer_konto` under låsen (`intern.las_tilgang`) før Edge-funksjonen gjør noe, og på nytt under låsen i utløseren på `auth.users` når kontoen opprettes (klareringen husker aktøren i `kontoreservasjoner.aktor`) |
| Serverendepunktene i Vercel for en innlogget (synker, kjemi, kurateringer) | Systemarkitektene | `erSystemarkitekt` i `src/server/tilgang.ts`; jobbene uten bruker (cron, GitHub OIDC, agentnøklene) er som før |

`intern.krev_systemarkitekt(melding)` krever aktivt medlemskap og
systemarkitekt, og gir profilen tilbake; alle funksjonene i tabellen bruker
den eller `intern.er_systemarkitekt` direkte. Edge-funksjonene slår ikke opp
noen rolle (`endepunkt` i `supabase/functions/_edge/kontekst.ts`):
myndigheten avgjøres i databasen i samme kall som handlingen.

Appen viser menyer og knapper etter `public.mine_rettigheter()`
(`{systemarkitekt, administrerer, arbeidsfagmiljo, stoffregister,
opprett_bruker}`; hvert fagmiljø i samme form, `intern.fagmiljoreferanse`:
`{id, nokkel, navn, standard, apent}`), som
bygger på de samme avgjørelsene som funksjonene og hjelperne, og leses med
`useRettigheter()` (`src/auth/rettigheter.tsx`). Det er et grensesnitt, ikke
en kontroll; hver funksjon kontrollerer på nytt. Testene står i
`src/__tests__/systemrettigheter.test.ts` og i P2d-radene i
`tilgangsmatrise.test.ts`.

## Faginnholdet etter rekkevidden

`supabase/migrations/20261114133000_rekkevidde_faginnhold.sql` (P2a) lar
rekkevidden i `ressursomfang` styre hvem som leser og endrer objektene i
faginnholdet: fagsidene med kortene og referansene (felles), og
laboratorieanalyttene, regelsettene og kommentarene fortolkningen bruker
(lokale). Det følger rettighetsmatrisen i P0-rapporten §5.2, med rollene som
finnes i dag:

| Hvem | Felles publisert | Eget lokalt publisert | Et annet fagmiljøs lokale | Utkast | Endre og publisere |
| --- | --- | --- | --- | --- | --- |
| Vanlig bruker | Ja | Ja | Nei | Nei | Nei |
| Lokal administrator | Ja | Ja | Nei | Eget lokalt | Eget lokalt |
| Systemarkitekt | Ja | Ja | Ja | Alt | Alt |
| Uten aktivt medlemskap | Nei | Nei | Nei | Nei | Nei |

Felles innhold endres bare av systemarkitektene til felles redaktører finnes
(P5); lokale redaktører kommer også i P5. Den gamle adminrollen kreves ikke
for faginnholdet og gir ingenting alene: en systemarkitekt eller lokal
administrator uten den (som `maxhag`) har sine rettigheter, og en med bare
rollen har ingen (`er_admin()` og `krev_admin()` står urørt for resten av
appen). Kliniske regler, verdier og tekster er ikke endret, og ingen data
er flyttet.

**Rettigheten per objekt.** Tre hjelpere bygger på
[hjelperne for tilgang per fagmiljø](#hjelperne-for-tilgang-per-fagmiljø):

| Funksjon | Svarer |
| --- | --- |
| `intern.kan_lese_objekt(objekt, bruker)` | Rekkevidden kan leses (`intern.kan_lese_omfang`). Nei uten rekkevidde |
| `intern.kan_endre_objekt(objekt, bruker)` | Lokalt: `intern.er_lokal_admin_i` i fagmiljøet. Felles (og grupper): systemarkitekt |
| `public.leser_alt_lokale_innhold()` | Om den innloggede kan lese hvert fagmiljø som har lokalt innhold (`intern.er_medlem_i`). Snarvei for radsikkerhetsreglene; svarer bare om den innloggede |
| `public.kan_endre_lokalt_innhold()` | Om den innloggede har endringsrett til noe av det lokale innholdet, i fagmiljøet det hører til (`intern.kan_endre_omfang`, ett oppslag per rekkevidde). Appen viser redigeringen av fortolkningen etter den; svarer bare om den innloggede |
| `intern.krev_endringsrett(objekt, ny)` | Stopper en innlogget uten endringsrett: PT404 «Fant ikke objektet.» når objektet ikke kan leses (samme svar som for et objekt som ikke finnes), ellers 42501. Serverprosessene uten innlogget bruker (migrasjonene, kurateringsagentene, jobbene) berøres ikke |

**Skriveveien.** Porten er `intern.krev_redaktor()` i stedet for
`intern.krev_admin()`: et aktivt medlemskap og endringsrett til noe
(`intern.har_endringsrett_noe`: systemarkitekt eller lokal administrator).
Den gjelder `lagre_utkast`, `publiser_utkast`, `gjenopprett_revisjon`,
`slett_referanse`, `opprett_utkast`, `valider_scenarioregelsett` og de tre
`lagre_*regelsett`, og gir forfatteren som før. All lagring, publisering, gjenoppretting og sletting låser
utkastet gjennom `intern.laas_utkast`, også publiseringen fra en
kurateringsgren; der kontrolleres endringsretten først, så et fremmed objekt
heller ikke gir en konflikt (PT409) som røper at det finnes. Et nytt objekt
kontrolleres i `intern.opprett_objekt_som`, etter at det har fått
rekkevidden etter regelen: en administrator i B kan ikke lage et objekt som
hører til A, og en lokal administrator kan ikke lage en fagside eller en
referanse. Regelsettene som lagres sammen med kommentarene
(`lagre_intervallregelsett`, `lagre_scenarioregelsett`,
`lagre_thc_regelsett`), kontrollerer regelsettet før kommentarene.

**Lesingen.** Hver tabell i faginnholdet (ressurskatalogens tabeller per
objekt, og `referansekoblinger`) har to endringer:

- Den begrensende regelen `rekkevidde` for `authenticated`: raden hører til
  et objekt den innloggede kan lese.
- De tillatende reglene som slapp utkastene (og revisjoner som aldri er
  publisert) gjennom for den gamle adminrollen (`er_admin()`), slipper dem nå
  gjennom bare med endringsrett til objektet: `public.kan_se_utkast()`
  (systemarkitekt eller lokal administrator, med eller uten rollen) og
  endringsretten til objektet raden hører til. Ellers er de som før.
  (`objektpubliseringer` har ingen utkast.) Kravet står i den tillatende
  regelen og ikke i en egen begrensende, så planleggeren ser det samme som
  før for dem uten endringsrett.

Reglene slår opp rekkevidden på primærnøkkelen i `ressursomfang`, utenom
snarveiene under «Ytelse», og bruker
`public.mine_lesbare_fagmiljoer()`, `public.mine_administrerte_fagmiljoer()`
og `public.er_systemarkitekt()`, som regnes ut én gang per spørring.
Visningene (`objektstatus`, `objekthistorikk`, `objektutgaver`,
`referansebruk`) er `security_invoker` og arver dem. `innholdsendringer`
leses direkte bare av systemarkitektene, `innholdshendelser` bare for objekter
den innloggede kan lese (systemarkitektene ser disse to og
`slettede_referanser` også uten den gamle adminrollen), og
`analyttkoblede_stoffer` bare av medlemmene i fagmiljøet dagens fortolkning
hører til (`public.leser_analyttkoblingene()`: OUS Klinisk farmakologi, D1)
og systemarkitektene. Tabellen har bare stoffet; koblingene får fagmiljøet
sitt i analyttkatalogen (P4c); tabellen står som vernet for stoffregisteret,
og et annet fagmiljø ser den ikke, heller ikke med egne analytter. `public.les_endringslogg` (`security definer`)
viser bare objektene den innloggede kan lese, og utkastene bare med
endringsrett til alle sidens objekter. De andre lesefunksjonene for
faginnholdet (`les_stoff`, `les_kommentarer`, `les_intervallregelsett` og de
andre) kjøres som den innloggede, så reglene gjelder. Fagsidefunksjonene som
går forbi radsikkerheten (`les_sideversjon`, `les_sideversjoner`,
`les_bivirkninger`), leser bare publisert felles innhold; stoffregisterets
utkast (`les_stoffregister`) er bare for systemarkitektene
([Systemrettighetene](#systemrettighetene)).

**Appen** viser redigeringen av fagsidene bare for systemarkitektene, og
redigeringen av fortolkningen for administratorene som har endringsrett i
fagmiljøet den hører til (`public.kan_endre_lokalt_innhold()`: lokal
administrator der eller systemarkitekt). Å administrere et annet fagmiljø
gir den ikke. Databasen avgjør; appen viser bare det brukeren får gjøre.
Siden P4b gjelder svaret fortolkningen i arbeidskonteksten
([Fortolkningen per fagmiljø](#fortolkningen-per-fagmiljø)), også før den har
egne regler.

**Ytelse.** Målt i testdatabasen i minnet med syntetiske fagsider i
produksjonens størrelse, dagens regelsett og produksjonens arbeidsminne
(`src/__tests__/ytelse/rekkeviddeytelse.test.ts`, median av 5 kall, 14.11.2026).
Testdatabasen kjører Postgres i WebAssembly med én tråd, så tidene er
lengre enn i produksjonen; det er forholdet som teller:

| Kall | Før P2a | Etter P2a |
| --- | --- | --- |
| `les_stoff`, publisert, vanlig bruker | 10 ms | 19 ms |
| `les_stoff`, utkast, systemarkitekt | 10 ms | 18 ms |
| `les_stoffer`, publisert, vanlig bruker | 555 ms | 568 ms |
| `les_referanser`, publisert, vanlig bruker | 166 ms | 203 ms |
| `les_intervallregelsett`, publisert, vanlig bruker | 4 ms | 7 ms |
| `les_intervallregelsett`, utkast, lokal administrator | 3 ms | 8 ms |
| `les_kommentarer`, publisert, vanlig bruker | 76 ms | 120 ms |
| `les_scenarioregler`, publisert, vanlig bruker | 67 ms | 118 ms |
| `les_endringslogg`, en analytt, vanlig bruker | 134 ms | 127 ms |
| `les_endringslogg`, en fagside, systemarkitekt | 1870 ms | 1738 ms |

Tidene varierer med 20–40 % mellom kjøringene. Reglene koster noen
millisekunder per kall, og kommentarene og scenarioreglene (som leses én gang
når fortolkningen åpnes) tar rundt 1,6 ganger så lang tid. Det kommer av at
planleggeren ikke kjenner svarene fra hjelperne på forhånd og velger en
annen rekkefølge for sammenføyningene, ikke av oppslag per rad. To snarveier
holder kostnaden nede: den som kan lese alt lokalt innhold som finnes
(`public.leser_alt_lokale_innhold()`: systemarkitektene, og i dag alle i OUS
Klinisk farmakologi), slipper oppslaget per rad, og uten endringsrett til noe
(`public.kan_se_utkast()`) slås endringsretten ikke opp. Den første målingen,
uten snarveiene, ga 2–6 ganger lengre tid for kommentarene, scenarioreglene og
referansene, og en egen begrensende regel for utkastene ga rundt 2 ganger
for kommentarene og scenarioreglene. En lokal administrator som ikke er
systemarkitekt, får ikke lenger utkastene av fagsidene (`les_stoffer` med
utkast: 543 ms før, 2 ms etter), fordi felles utkast bare er for
systemarkitektene.

**Tester.** `src/__tests__/rekkevidde.test.ts` bygger persongalleriet med
felles innhold, dagens regelsett og et regelsett og to kommentarer flyttet til
B, og prøver: at hver tabell har reglene; at hver person ser nøyaktig fasiten
i hver tabell (det personen så før P2a, regnet med reglene fjernet i en
transaksjon som rulles tilbake og med utkastene for alle med endringsrett til
noe, deretter med bare det personen kan lese og utkastene bare med
endringsrett), og at en vanlig bruker i A og systemarkitekten ser det
samme som før; skriveveiene for hver rolle, også med et annet fagmiljøs ID og
en ID som ikke finnes; og endringsloggen og kommentarlesingen. Matrisen i
`tilgangsmatrise.test.ts` har P2a-scenarioene som `avvist` i dag.

**Tilbakeføring.** En ny migrasjon som fjerner reglene `rekkevidde`, setter
de tillatende reglene i faginnholdet tilbake til `er_admin()`, fjerner
regelen på `ressursomfang` og rettigheten nettleseren fikk der, og setter `intern.laas_utkast`,
`intern.opprett_objekt_som`, `public.les_endringslogg` og de tre
`lagre_*regelsett` tilbake til definisjonene i migrasjonene før. Hjelperne
per objekt, `public.leser_alt_lokale_innhold()` og
`public.kan_endre_lokalt_innhold()` fjernes til slutt (appen leser da ingen
rett til å redigere fortolkningen, og viser ingen redigering).

## Fortolkningen per fagmiljø

P4b lar flere fagmiljøer ha samme analyttkode med hver sine regler og
kommentarer, uten at de blandes
(`supabase/migrations/20261114202000_fortolkning_per_fagmiljo.sql`, P0 §2.6 og
§6.2).

**Arbeidskonteksten.** Fortolkningen bruker alltid nøyaktig ett fagmiljø:
den innloggedes aktive primærmedlemskap i et aktivt fagmiljø
(`intern.arbeidsfagmiljo(bruker)`, for oppslagene
`public.mitt_arbeidsfagmiljo()`). Uten det finnes ingen regler å bruke, heller
ikke for en systemarkitekt: ingen får et annet fagmiljøs regler som reserve.
Appen får fagmiljøet med navnet i `mine_rettigheter().arbeidsfagmiljo` og
viser det i meldingen når regler mangler. Byttes det, tømmer appen reglene
den har, før de nye hentes (`useKontekstbytte`).

**Å velge arbeidsfagmiljø.** Den som er aktivt medlem av flere fagmiljøer,
velger selv hvilket hen arbeider i (Peders valg 15.11.2026), under «Fagmiljø» i
kontomenyen (`Arbeidsfagmiljovalg`). Valget er primærmedlemskapet og lagres på
serveren: `public.velg_arbeidsfagmiljo(fagmiljo)`
(`20261115020000_velg_arbeidsfagmiljo.sql`) gjør det valgte medlemskapet
primært, bare for den innloggede selv og bare blant egne aktive medlemskap i
aktive fagmiljøer, med begrunnelsen og den innloggede som aktør i
tilgangsloggen (P0 §2.6). Det flytter fortolkningen og ingenting annet:
lesing og deltakelse følger alle aktive medlemskap som før. Uten dette ble
alle stående i det første fagmiljøet, fordi et nytt medlemskap ikke blir
primært når kontoen alt har et (`intern.gi_medlemskap`).
`mine_rettigheter().mine_fagmiljoer` er fagmiljøene det kan velges blant;
med ett vises ikke valget, med mindre det ikke er det hen arbeider i (som når
det hen arbeidet i, er arkivert; da arbeider hen ikke i noe til hen velger).
Appen tar i bruk rettighetene byttet gir, og et eldre svar fra
`mine_rettigheter()` overskriver aldri et nyere (`useKontoensSvarMedSjekk`).
Det som hentes for arbeidskonteksten, følger `arbeidskontekst` i
`src/auth/rettigheter.tsx`: å miste arbeidsfagmiljøet er et bytte som det
andre, så katalogen og reglene fra det forrige tømmes og fortolkningen
stopper til et nytt er valgt. Prøvd i `src/__tests__/arbeidsfagmiljo.test.ts`,
`arbeidsfagmiljovalg.test.tsx` og `arbeidskontekst.test.tsx`.

**Fagmiljøet på reglene.** `laboratorieanalytter`, `intervallregelsett`,
`scenarioregelsett`, `scenarioanalytter` og `thc_regelsett` har kolonnen
`fagmiljo_id`. Den settes av databasen fra rekkevidden objektet har
(`intern.gi_fortolkningsfagmiljo`, ved hver innsetting og endring) og kan
ikke settes fra nettleseren. Flytter en systemarkitekt et objekt til et
annet fagmiljø (`ressursomfang`, loggført), følger kolonnen med. En flytting
som ville latt et regelsett bruke kommentarer i et annet fagmiljø, stoppes
(`intern.kommentarer_paa_tvers`), enten det er regelsettet eller en kommentar
det bruker som flyttes; regelsettet og kommentarene flyttes derfor sammen, i
én oppdatering. De nye unike
nøklene har fagmiljøet med: én analytt, ett regelsett og ett
THC-syreregelsett per kode eller modul i hvert fagmiljø, kontrollert også av
lagringsfunksjonene med de samme meldingene som før.

**Reglene databasen håndhever:**

1. Alle oppslag etter kode eller modul gir bare arbeidskontekstens:
   `finn_intervallregelsett`, `les_intervallregelsett`, `les_scenarioregler`
   (også kommentarene), `les_thc_regelsett`, `les_referanseomrader`,
   `les_analyttside`, `les_analyttsider`, `les_stoffside`, visningen
   `stoffsider_uten_kode` og endringsloggen for en analytt eller modul
   (`intern.endringsrotter`). Radsikkerheten fra P2a står i tillegg: en
   bruker som bare er medlem i A, får aldri B sine rader, heller ikke direkte
   i tabellene eller med en manipulert ID.
2. Et fagmiljø uten egne regler får ingen. Appen viser den tydelige stoppen
   som fantes fra før («Det finnes ingen publiserte fortolkningsregler for …
   i <fagmiljø>»), aldri svaret fra OUS Klinisk farmakologi.
3. Et nytt lokalt objekt hører til arbeidskonteksten til den som lager det
   (`intern.nytt_lokalt_fagmiljo`, brukt av `intern.ressursomfang_for`); en
   innlogget uten arbeidskontekst får ikke lage noe lokalt. Migrasjonene og
   importene, uten innlogget, lager det i OUS Klinisk farmakologi som før.
4. Et regelsett kan bare peke på kommentarer i sitt eget fagmiljø
   (`intern.krev_kommentarer_i_fagmiljoet` på `intervallregler`, cut-off i
   `intervallregelsett`, `scenarioplasseringer` og `thc_tekstbolker`).
5. Fortolkningsregler, laboratorieanalytter og kommentarer kan ikke gjøres
   felles (D4): `intern.fortolkningsfagmiljo` stopper det. Deling krever en
   egen, særskilt godkjent endring.
6. En diskusjon på fortolkningen (`fortolkning:<kode>`) hører til
   arbeidskonteksten til den som starter den, og beholder rekkevidden sin
   ([Samhandlingen](#samhandlingen)). En bruker med medlemskap i to
   fagmiljøer ser trådene fra begge på samme side; det rettes når bytte av
   fagmiljø kommer.
7. Redigeringen av fortolkningen vises for den som har endringsrett i
   arbeidskonteksten (`public.kan_endre_lokalt_innhold()`): lokal
   administrator der, eller systemarkitekt.

Referanseområdene på fagsidene er felles (D4) og kobles til koden gjennom
laboratorieanalytten i arbeidskonteksten; de overstyres ikke lokalt.
Analyttkatalogen, analyttkoblingene til stoffene og EtG/EtS-tekstene står i
databasen per fagmiljø siden P4c
([Analyttkatalogen per fagmiljø](#analyttkatalogen-per-fagmiljø)).

**De gamle nøklene.** De globale unike nøklene (én per kode i hele
databasen: `laboratorieanalytter_kode_entydig`,
`intervallregelsett_analyttkode_entydig`, `scenarioregelsett_modul_idx`,
`scenarioanalytter_kode_idx`, `thc_regelsett_ett_idx`) er fjernet i
`20261115050000_fjern_globale_fortolkningsnokler.sql`, etter Peders
godkjenning (P0 §6.2, `supabase/AGENTS.md`). Migrasjonen stopper hvis en rad
mangler fagmiljø eller en av nøklene per fagmiljø mangler. Nå kan to
fagmiljøer ha samme kode og modul med hver sine regler og kommentarer; innenfor
ett fagmiljø er det fortsatt ett regelsett per kode og modul. Tilbakeføringen
(nøklene inn igjen) står i migrasjonen og går så lenge ingen kode finnes i to
fagmiljøer.

**Tester.** `src/__tests__/fortolkningPerFagmiljo.test.ts` prøver
arbeidskonteksten for hver person i persongalleriet; at A får nøyaktig de
samme regelsettene som den gamle lesingen ga; den tydelige stoppen i B, også
for systemarkitekten med B som arbeidskontekst; at B sine egne regler,
analytter og kommentarer ikke når A; at et regelsett ikke kan peke på et annet
fagmiljøs kommentarer; at bare nøklene per fagmiljø står, og at samme kode
gir hvert fagmiljø sitt uten at en endring i B rører A; rekkevidden til nye og
flyttede objekter; og endringsloggen og diskusjonene. De kliniske fasitene
(`fortolkningUendret.test.ts`, `steg2regler.test.tsx`,
`intervallregelsett.test.ts`, THC- og scenariotestene) kjøres uendret for OUS
Klinisk farmakologi.

**Tilbakeføring.** En ny migrasjon som setter funksjonene og visningen tilbake
til definisjonene i migrasjonene før, fjerner utløserne og de nye nøklene, og
tar bort kolonnene. Ingen data endres.

## Analyttkatalogen per fagmiljø

P4c flytter det som er laboratoriets eget, ut av klientpakken og inn i
databasen per fagmiljø (P0 §2.5 og §3):
`supabase/migrations/20261114230000_analyttkatalog_per_fagmiljo.sql`
(tabellene og lesingen), `…230100_analyttkatalog_ous_import.sql` (katalogen
til OUS Klinisk farmakologi) og `…230200_etg_regler_import.sql` (EtG og EtS).

**Katalogen.** Fire tabeller, alle med `fagmiljo_id`:
`analyttkatalog_metoder` (analysemetodene i filterets rekkefølge, som også gir
fargen og hurtigtasten), `analyttkatalog_oppforinger` (oppføringene i søket:
navn, gruppe, metode, kategori, enhet, måleområde, grensene for
antihypertensivene, søkeord og hvordan oppføringen fortolkes — med
konsentrasjonsbånd, som scenariomodul, THC-syre eller EtG/EtS),
`analyttkatalog_koder` (analyttkodene hver oppføring dekker, hver kode høyst
én gang per fagmiljø) og `analyttkatalog_koblinger` (koblingene fra kodene
til stoffene i stoffregisteret, høyst ett primært stoff per kode). Tabellene
har radsikkerhet uten regler og ingen rettigheter for nettleseren. Den eneste
veien inn er `public.les_analyttkatalog()`, som gir katalogen til
arbeidskonteksten ([Fortolkningen per fagmiljø](#fortolkningen-per-fagmiljø))
med fagmiljøets navn, og ingenting annet. Funksjonen tar ingen argumenter, så
et annet fagmiljø kan ikke bes om. Katalogen endres med en ny migrasjon; appen
skriver ikke til den.

**Appen.** Katalogen hentes når appen åpnes, før noe tegnes opp
(`src/katalog/Analyttkatalogkilde.tsx`, `App.tsx`), og settes opp på nytt når
arbeidskonteksten byttes, så ingenting fra det forrige fagmiljøet blir
stående. Den lagres ikke i nettleseren. Søket i fortolkningen, filteret med
metodene, fortolkningsmodulene, kodepillene, lenkene mellom koder og
fagsider, stoffregisteret, fagsøket og endringsloggen bruker den hentede
katalogen. Klientpakken har ingen katalog: `src/domain/analyttkatalog.ts`
har bare formen, og `lesKatalogdata` avviser et svar som ikke har den.

**Tydelig stopp.** Et fagmiljø uten egen katalog får en tom en, og
fortolkningen viser «Analyttkatalogen mangler: Fortolkningen er ikke satt opp
for <fagmiljø> ennå» i stedet for søket. Kunne katalogen ikke hentes, står
feilen med «Prøv igjen». Det finnes ingen reserve: aldri katalogen til OUS
Klinisk farmakologi, verken fra klientpakken, fra søkeindeksen eller fra
nettleserens lager.

**EtG og EtS.** Tilfellene og kommentartekstene sto i `src/domain/etg.ts`. De
er nå scenarioregelsettet for modulen `etg` med tre kommentarobjekter, i OUS
Klinisk farmakologi, ordrett slik de sto (grunnlaget:
`src/domain/__tests__/fasit/etg-import.json`, `scripts/etg-import.ts`).
Modulen viser ett valg per scenario, i regelsettets rekkefølge, med «Begge
påvist» når alle kodene er påvist; et regelsett med forholdstall eller
manuell vurdering kan den ikke vise, og da sier den fra. Redigeringen av
reglene i appen er ikke laget for modulen ennå; til da endres de med en
migrasjon.

**De felles datakortene.** Datakortene i «Viktige data» på fagsidene er
felles for alle fagmiljøer, og vet ingenting om laboratorienes koder. Et kort
for en metabolitt sier hvilken forbindelse det gjelder, med nøkkelen i
forbindelsesregisteret (`data.gjelder = 'o-desmetyltramadol'`, etter
overgangen under; se
`docs/faginnhold.md`, «Datakortene per forbindelse»), og vises for alle,
også i et fagmiljø uten egen katalog. Katalogen sier for hver kode hvilken
forbindelse analysen måler (`analyttkatalog_koder.forbindelse`, `null` for
sumanalysene) og uttrykkelig hvilke kort på siden til kodens primære stoff den
bruker (`analyttkatalog_koder.datakort`): sidens egne (`egne`), dem for
forbindelsen (`forbindelse`), eller ingen (`null`). Det er dette
referanseområdet fortolkningen viser under analyttnavnet
(`datakortnokkel`/`referanseomraderPerAnalytt` i `src/domain/koblinger.ts`).
Ingen kode får et kort av rekkefølgen i katalogen, og en ny katalog får ingen
før det er sagt (#395 punkt 3:
`20261115112000_datakort_per_forbindelse.sql` og
`…112100_analyttforbindelser_ous.sql`, laget med
`scripts/analyttforbindelser.ts` av `src/data/analyttforbindelser.json`).
For OUS Klinisk farmakologi er verdiene de appen brukte før: sidens egne for
den første primære koden for hvert stoff, og dem for forbindelsen for de
andre (OTRAM, DMI). Urinanalysene (THC-syre, EtG og EtS) bruker ingen, siden
kortene gjelder serum; ingen av dem fikk noe referanseområde i produksjonen.
Sidens egne kort sier ikke selv hvilken forbindelse de gjelder: på noen sider
er det metabolitten eller summen laboratoriet måler (bupropion, enalapril,
spironolakton, sumanalysene). Derfor må et nytt fagmiljøs katalog si
uttrykkelig for hver kode at den bruker dem. Hvilket prøvemateriale en
analyse gjelder, er ikke en del av katalogen ennå.

**Overgangen.** Appen og databasen rulles ut hver for seg, og en fane som
står åpen, kjører appen den ble lastet med. Derfor i to trinn, så ingen
rekkefølge gjør at et referanseområde forsvinner:

1. *Trinn 1 (1.133.3)* endrer ikke faginnholdet: kortet for
   O-desmetyltramadol har fortsatt `OTRAM` i `gjelder`, så appen fra før
   finner det. Migrasjonen setter verdiene og lar `les_analyttkatalog()` gi
   dem, i én transaksjon. Den nye appen leser et kort med en kode i `gjelder`
   som kortet for forbindelsen koden måler, etter katalogen
   (`kortetsForbindelse` i `src/domain/koblinger.ts`), og et svar uten feltene
   (før migrasjonen, eller om den stopper) med den gamle koblingen
   (`medEldreDatakort` i `src/domain/analyttkatalog.ts`).
2. *Trinn 2 (#405)*, tidligst sju dager etter at trinn 1 er ute: kortet skrives
   om til `o-desmetyltramadol`, databasen stenger for analyttkoder i `gjelder`,
   og overgangen fjernes fra appen. Først da kobles kortet også til et annet
   fagmiljøs kode for O-desmetyltramadol; til da bare til OUS-koden.

**Importgrunnlaget.** Katalogen til OUS Klinisk farmakologi ble importert fra
filene som sto i klientpakken (`src/domain/ouskatalog.ts`, som leser
`src/data/analytter.json`, `antihypertensiver.json`, `aliaser.json` og
`analyttkoblinger.json`). De står igjen for skriptene og testene;
byggekontrollen (`scripts/kontroller-vegg.mjs`, `LABORATORIEDATA`) stopper en
pakke, også bak innloggingsveggen, som drar dem inn. THC-kurvene
(`src/domain/thcKurver.ts`) er ikke en del av katalogen og står der de sto
(D4, #374).

**Tester.** `src/__tests__/analyttkatalogPerFagmiljo.test.ts` prøver at
importene er de grunnlaget gir; at A får nøyaktig katalogen, metodene,
koblingene og EtG/EtS-tilfellene som sto i klientpakken før (kontrollsummer
regnet av `main` før flyttingen), og EtG/EtS-tekstene ordrett; at B, også
systemarkitekten med B som arbeidskontekst, og en uten aktivt medlemskap får
en tom katalog og ingen EtG-regler; at tabellene ikke kan leses direkte; og
at en ny kjøring av importene ikke endrer noe. De kliniske fasitene kjøres
uendret med katalogen til OUS Klinisk farmakologi. `src/__tests__/analyttforbindelser.test.ts` prøver
forbindelsene og datakortene: at grunnlaget stemmer med forbindelsesregisteret
og koblingene, at OUS Klinisk farmakologi får de samme referanseområdene som
med regelen fra før for alle sider og koder, og at migrasjonen skriver om
kortet med OUS-koden i det publiserte og i et upublisert utkast hver for seg,
uten å endre noe annet. `referanseomrader.test.ts` og `stoffside.test.tsx`
prøver et annet fagmiljø med egne koder og et uten katalog.

**Tilbakeføring.** En ny migrasjon som fjerner funksjonen og tabellene, og
regelsettet og kommentarene for `etg`; appen før P4c bruker dem ikke.

## Katalogvaktene

`src/__tests__/tilgangskatalog.test.ts` kontrollerer databasen bygd av alle
migrasjonene, og stopper:

- en tabell i et skjema nettleseren når (i dag bare `public`) uten
  radsikkerhet, og en visning uten `security_invoker`;
- en funksjon nettleseren kan kalle uten erklært kontroll i
  `src/__tests__/data/funksjonskontroller.ts`, en erklæring for en funksjon
  som ikke finnes, og en erklæring som ikke kan stemme med funksjonen.

Kategoriene beskriver kontrollen funksjonen har i dag:

| Kontroll | Betyr |
| --- | --- |
| `offentlig` | Ren hjelper uten data; også uten innlogging |
| `utloser` | Utløserfunksjon; kan ikke kalles gjennom API-et |
| `radsikkerhet` | Kjøres som den innloggede; radsikkerheten avgjør |
| `felles-lesing` | `security definer` som leser felles data uten egen kontroll |
| `innlogget` | `security definer` som bare krever innlogging, også for skriving |
| `eier` | `security definer` som bare rører den innloggedes egne rader |
| `kontomyndighet` | `security definer` som svarer etter den innloggedes myndighet over kontoer (`intern.kontoavslag`) |
| `medlemskapsmyndighet` | `security definer` som endrer eller viser medlemskap etter den innloggedes myndighet i fagmiljøet (`intern.medlemskapsavslag`, P3) |
| `admin-utvidet` | Innlogget, men en administrator får gjøre eller se mer |
| `admin` | Krever administrator for alt |
| `stoffregister` | Krever rett til å endre stoffregisteret (`intern.krev_registerbruker`) |
| `systemarkitekt` | Krever systemarkitekt for alt (`intern.krev_systemarkitekt` eller `kuratering.admin_aktor`); den gamle adminrollen gir ingenting |
| `rekkevidde` | `security definer` som kontrollerer rekkevidden per fagmiljø og rettigheten per objekt, og kaller selv minst én av hjelperne for tilgang per fagmiljø (`REKKEVIDDEHJELPERE` i `src/__tests__/hjelp/tilgangskatalog.ts`, eller `mine_lesbare_fagmiljoer()`) |
| `systemarkitekt` | `security definer` som krever en systemarkitekt med aktivt medlemskap (`public.er_systemarkitekt()`, eller porten `intern.krev_idevalg_admin()` for idéene og oppgavene) |

En ny funksjon nettleseren kan kalle, må føres opp med kontrollen den faktisk
har. Alle kategoriene unntatt `offentlig` og `utloser` krever i tillegg aktivt
medlemskap (P2.0), og `tilgangsinnganger.test.ts` stopper en tabell eller
`security definer`-funksjon uten den kontrollen. P2a–d bytter `admin`,
`innlogget` og `felles-lesing` ut med rettigheter per fagmiljø.

Kartleggingen av alle datainngangene, persongalleriet til tilgangstestene og
de negative scenarioene for P2 står i `docs/p2-0-forberedelse.md`.
