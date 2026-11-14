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
([Rekkevidden](#rekkevidden-ressursomfang)), men ingenting leser den ennå.
P2.0 krever **aktivt medlemskap** for alt
([Aktivt medlemskap](#aktivt-medlemskap)). Ellers bygger ingen rettigheter
på fagmiljøene: hvem som får se og endre hva, er som før for alle med et
aktivt medlemskap. Rettighetene per fagmiljø kommer i P2a–d.

## Fagmiljøene

| Nøkkel | Navn | Standard | Åpent for medlemmer |
| --- | --- | --- | --- |
| `ous-klinisk-farmakologi` | OUS Klinisk farmakologi | Ja | Ja |
| `ous-rettstoksikologi` | OUS Rettstoksikologi | Nei | Nei, til startporten S2 |

Alle nåværende fortolkningssystemer hører til OUS Klinisk farmakologi
(beslutning D1). OUS Rettstoksikologi har ingen fortolkningsregler.

- **Standard** er fagmiljøet en ny konto får som primærmedlemskap. Nøyaktig
  ett fagmiljø er standard, og det må være aktivt og åpent.
- **Åpent for medlemmer** (`apent_for_medlemmer`) avgjør om andre enn
  systemarkitektene kan få et gjeldende medlemskap. Bare standarden er åpen
  inntil startporten S2 er passert (§6.3 i P0-rapporten); da åpnes et
  fagmiljø i en egen, godkjent migrasjon.

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

1. Hver konto har nøyaktig ett aktivt primærmedlemskap. En ny konto får det
   i standardfagmiljøet med en gang (utløseren
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
administrator i sitt primære fagmiljø (P1.2a, over). Utpeking av lokale
administratorer for seg kommer i P3.

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
5. Nettleseren har ingen tilgang til tabellen. P2 leser den gjennom egne
   funksjoner.

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
Diskusjonene får rekkevidde per tråd først i P2b, avledet av sidenøkkelen;
de lokale statiske filene flyttes til databasen i P4c.

**Tilbakeføring.** Ingenting leser tabellen, så den kan stå. Utløserne kan
tas bort i en ny migrasjon uten at noe annet endres.

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

To funksjoner svarer i stedet for å stoppe: `er_admin()` svarer nei, og
`har_aktivt_medlemskap()` svarer på om den innloggede selv har et aktivt
medlemskap. Det siste er den eneste opplysningen en bruker uten medlemskap
får, og appen bruker den til beskjeden under.

**Serverprosesser.** `intern.krev_aktivt_medlemskap()` slipper gjennom et
kall uten innlogget bruker når rollen er `service_role` eller det ikke finnes
noen JWT (migrasjoner, `pg_cron`-jobber, synkene med den hemmelige nøkkelen).
Et kall med en bruker-ID i JWT-en prøves alltid, også om rollen er
`service_role`, og et anonymt kall stoppes. Den begrensende regelen gjelder
bare `authenticated`; `service_role` går forbi radsikkerheten som før.

**I appen.** Når profilen ikke kommer, spør økten (`src/auth/okt.tsx`)
`har_aktivt_medlemskap()`. Er svaret nei, tømmes mellomlageret i
nettleseren, og porten viser «Ingen tilgang» med beskjeden og en
utloggingsknapp (`src/components/konto/Port.tsx`), uten å vise noe annet.
Er svaret ja, er kontoen fjernet, og brukeren logges ut som før. Spørsmålet
stilles bare når profilen lastes: en fane som står åpen, beholder det den
allerede har hentet til siden lastes på nytt, men får ingenting nytt fra
databasen.

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
som en bruker uten aktivt medlemskap og som en tidligere administrator;
`tilgangsinnganger.test.ts` krever at hver tabell og funksjon har kontrollen;
`tilgangsmatrise.test.ts` har scenarioene for direkte tabell- og
funksjonskall med gyldig token; `avsluttetmedlemskap.test.tsx` prøver
beskjeden i appen.

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
| `admin-utvidet` | Innlogget, men en administrator får gjøre eller se mer |
| `admin` | Krever administrator for alt |

En ny funksjon nettleseren kan kalle, må føres opp med kontrollen den faktisk
har. Alle kategoriene unntatt `offentlig` og `utloser` krever i tillegg aktivt
medlemskap (P2.0), og `tilgangsinnganger.test.ts` stopper en tabell eller
`security definer`-funksjon uten den kontrollen. P2a–d bytter `admin`,
`innlogget` og `felles-lesing` ut med rettigheter per fagmiljø.

Kartleggingen av alle datainngangene, persongalleriet til tilgangstestene og
de negative scenarioene for P2 står i `docs/p2-0-forberedelse.md`.
