# Fagmiljøer, medlemskap og systemroller

Leses når noe som har med fagmiljøer, medlemskap, systemarkitekter, lokale
administratorer eller tilgangsloggen skal endres. Planen og begrunnelsene står
i `docs/ousfar-nasjonal-p0-kartlegging.md` (§5–8); brukersystemet ellers i
`docs/brukere.md`.

## Status

P1.1 har lagt grunnmuren: tabellene, vaktene og dagens kontoer fordelt på to
fagmiljøer. **Ingen rettigheter bygger på dem ennå.** `er_admin()`,
`profiles.role`, alle radsikkerhetsregler, funksjoner og Edge-funksjoner er
som før, og ingen bruker merker noe. Rettighetene per fagmiljø kommer i P2,
etter herdingen av adminoperasjonene i P1.2 og `ressursomfang` i P4a.

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

En administrator som får `role = 'admin'` etter dette, blir **ikke**
automatisk lokal administrator; det kommer med P1.2 og P3.

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
| `admin-utvidet` | Innlogget, men en administrator får gjøre eller se mer |
| `admin` | Krever administrator for alt |

En ny funksjon nettleseren kan kalle, må føres opp med kontrollen den faktisk
har. P2 bytter `admin`, `innlogget` og `felles-lesing` ut med rettigheter per
fagmiljø.
