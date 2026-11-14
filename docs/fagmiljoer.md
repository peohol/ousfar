# Fagmiljøer, medlemskap og systemroller

Leses når noe som har med fagmiljøer, medlemskap, systemarkitekter, lokale
administratorer eller tilgangsloggen skal endres. Planen og begrunnelsene står
i `docs/ousfar-nasjonal-p0-kartlegging.md` (§5–8); brukersystemet ellers i
`docs/brukere.md`.

## Status

P1.1 har lagt grunnmuren: tabellene, vaktene og dagens kontoer fordelt på to
fagmiljøer. P1.2a bruker dem for det første: **myndigheten over andres
kontoer** (nytt passord og adminrolle, under). Ellers bygger ingen rettigheter
på dem ennå: `er_admin()`, `profiles.role`, alle radsikkerhetsregler og
funksjonene er som før. Rettighetene per fagmiljø kommer i P2, etter
`ressursomfang` i P4a.

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
| `tilgangslogg` | Hver endring i de fire tabellene over, med aktør, før og etter og begrunnelse |

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
har. P2 bytter `admin`, `innlogget` og `felles-lesing` ut med rettigheter per
fagmiljø.

Kartleggingen av alle datainngangene, persongalleriet til tilgangstestene og
de negative scenarioene for P2 står i `docs/p2-0-forberedelse.md`.
