# Sikkerhetskopi og gjenoppretting

Rutinen for sikkerhetskopi av databasen etter Peders valg 15.11.2026 (D7a):
egne, krypterte kopier på gratisplanen (`docs/s4-pilotplan.md` §3.2 valg b).
Denne fila beskriver verktøyet (tiltak 2) og prøven av det. Kopien er
**ikke** satt i drift ennå. Det er tiltak 3, og der bestemmer Peder hvor
kopiene lagres og hvem som har nøkkelen.

## Mål

| | Mål |
| --- | --- |
| Tap av data (RPO) | Høyst ett døgn, med én kopi i døgnet |
| Tid til appen virker igjen (RTO) | Innen én arbeidsdag |

## Hva en kopi inneholder

Én fil, `ousfar-kopi-<tid>.tar.age`, kryptert med [age](https://age-encryption.org)
til én eller flere offentlige nøkler. Uten den private nøkkelen kan den ikke
leses. Kopien inneholder passordhasher og tofaktornøkler, så den lagres aldri
i repoet og aldri ukryptert.

| Del | Hvordan |
| --- | --- |
| Roller, struktur og data | Supabases tredelte CLI-kopi: `db dump --role-only`, `db dump` og `db dump --data-only --use-copy`. Dataene i `auth`, også `auth.users`, `auth.identities` og `auth.mfa_factors`, er med. Tabellene i `auth` og `storage` innloggingsrollen ikke kan skrive i (som `storage.buckets_vectors`), fylles av plattformen selv og er ikke med. Rollefila har bare Supabases egne innstillinger og kjøres ikke ved gjenoppretting; OUSFARs endringer på rollene er blant tilpasningene |
| Migrasjonshistorikken | `supabase_migrations` for seg, og gjenopprettet som data, slik den står i kilden |
| OUSFARs tilpasninger i `auth` og `storage` | `tilpasninger.sql`, se under |
| Filene i Storage (profilbildene) | Hentet med Storage-API-et, med sjekksum per fil |
| Auth-innstillingene | Fra Management API-et, uten felt som kan være hemmelige (bare med `--prosjekt`) |
| Navnene på Edge-hemmelighetene | Bare navnene, aldri verdiene (bare med `--prosjekt`) |
| `manifest.json` | Radtall og kontrollsum per tabell, filene, versjonene av Auth og Storage, referansen og tilpasningene |

## Ett kopipunkt, også når appen er i bruk

Kopien kan tas mens noen skriver i appen, uten at den blir en blanding av
før og etter:

- En egen tilkobling holder et øyeblikksbilde av databasen åpent
  (`pg_export_snapshot()`) mens kopien tas. Alle dumpene leses i det
  (`pg_dump --snapshot`, lagt til i skriptene Supabase-CLI-en lager), og det
  samme gjør fingeravtrykket, radtallene og kontrollsummene i manifestet og
  listen over filer. Det som skrives underveis, kommer verken med i dumpene
  eller i manifestet.
- Filene i Storage ligger utenfor databasen. Hver fil sammenlignes med
  størrelsen og md5-summen øyeblikksbildet har for den. Er en fil byttet eller
  fjernet underveis, forkastes forsøket og kopien tas på nytt i et nytt
  øyeblikksbilde, høyst tre ganger; går det ikke, stopper kopien uten å lagre
  noe.
- Kopipunktet holdes i én åpen transaksjon, så `--db-url` må være en direkte
  tilkobling eller en tilkobling i sesjonsmodus, ikke i transaksjonsmodus.

`src/__tests__/sikkerhetskopi.samtidighet.test.ts` prøver kopipunktet med
samtidig skriving på Postgres 17 ved hver CI-kjøring, og prøven under gjør
det samme med hele verktøyet.

## Strømmet, uten grense i minnet

Pakkingen, krypteringen, dekrypteringen og utpakkingen går rett fra prosess
til prosess (`tar | age` og `age -d | tar`), og dumpene skrives rett til fil.
Ingenting av kopien går gjennom Node, så størrelsen begrenses bare av disken.
Feiler ett av leddene, stopper kopien, og en halvferdig fil slettes.
Med `--kontrollnokkel` pakkes den krypterte kopien ut igjen før den godtas,
og hver fil sammenlignes med det som ble pakket.
`src/__tests__/sikkerhetskopi-pakking.test.ts` strømmer en fil på 192 MiB
gjennom kryptering og tilbake og krever at minnet ikke vokser med den.

Det som ikke er med, og som gjenskapes på andre måter: Edge-funksjonene
rulles ut fra `main` (`docs/edge-funksjoner.md`); hemmelighetene og
nøklene i Vercel og GitHub settes på nytt av eieren, fordi et nytt prosjekt
får nye nøkler; alle må logge inn på nytt.

## Tilpasningene i `auth` og `storage`, og på rollene

Strukturen i `auth` og `storage` eies av Supabase og er ikke med i
`db dump`, og det er heller ikke rollene, som gjelder hele serveren. OUSFAR
har lagt til utløseren `paa_ny_auth_bruker` på `auth.users`, reglene for
profilbildene på `storage.objects` (også den begrensende regelen
`aktivt_medlemskap`, som ble laget med dynamisk SQL) og tidsgrensen for
`service_role`. Uten dem virker verken kontoopprettelsen eller profilbildene
etter en gjenoppretting.

Verktøyet (`src/drift/sikkerhetskopi/tilpasninger.ts`) lager et
fingeravtrykk av utløsere, regler, radsikkerhet og tilganger i de to
skjemaene, og av rollene, medlemskapene i dem og innstillingene på dem, både i kilden og i en **referanse**: en ren Supabase med de samme
versjonene av Auth og Storage, uten OUSFARs migrasjoner. Tilpasningene er
forskjellen. Kopien stopper hvis

- et objekt finnes i begge med ulik definisjon, eller bare i referansen
  (et plattformobjekt er endret, eller versjonene stemmer ikke);
- versjonene av Auth eller Storage er ulike;
- en utløser eller regel OUSFARs migrasjoner har laget på `auth` eller
  `storage`, mangler blant tilpasningene.

`tilpasninger.sql` kjøres i én transaksjon uten `or replace` og `drop`, så
den kan ikke overskrive et plattformobjekt. Etter gjenopprettingen skal målet
være nøyaktig referansen pluss tilpasningene. `src/__tests__/sikkerhetskopi.test.ts`
prøver dette i testdatabasen ved hver CI-kjøring.

## Bruk

Nøklene leses fra miljøet: `KOPI_SECRET_KEY` er den hemmelige nøkkelen for
Storage i prosjektet kommandoen gjelder. `pg_dump` må ha minst serverens
hovedversjon (17); har maskinen en eldre, settes `KOPI_PG_BILDE` til et
Postgres-bilde med den (for eksempel `postgres:17`), og dumpene kjøres i Docker.

```
# 1. Referansen: et nytt, tomt Supabase-prosjekt (eller det lokale miljøet uten migrasjoner)
npm run sikkerhetskopi -- referanse --db-url <ren> --ut referanse.json

# 2. Kopien
KOPI_SECRET_KEY=… npm run sikkerhetskopi -- ta --db-url <kilde> --api-url <kilde> \
  --referanse referanse.json --mottaker <offentlig age-nøkkel> --ut <mappe> [--prosjekt <ref>] \
  [--kontrollnokkel <privat age-nøkkel>]

# 3. Gjenopprettingen, alltid til et nytt, tomt prosjekt
KOPI_SECRET_KEY=… npm run sikkerhetskopi -- gjenopprett --kopi <fil.tar.age> \
  --identitet <privat age-nøkkel> --db-url <mål> --api-url <mål>
```

Rekkefølgen ved gjenoppretting: roller, struktur og data i én transaksjon
(dataene med `session_replication_role = replica`, så utløserne ikke slår til),
deretter tilpasningene, deretter migrasjonshistorikken, deretter filene.
Verktøyet nekter produksjonsprosjektet og et mål som ikke er tomt. Til slutt
sammenligner det radtall, kontrollsummer, filer og tilpasninger med kilden, og
stopper med avvikene hvis noe er ulikt.

Ved et reelt tap: lag et nytt prosjekt i samme region, gjenopprett dit, sett
Auth-innstillingene fra `auth-innstillinger.json`, sett hemmelighetene i
manifestet på nytt, rull ut Edge-funksjonene og pek Vercel og GitHub til det
nye prosjektet. Hvem som kan sette i gang dette, avgjøres sammen med tiltak 3.

## Prøven i det lokale testmiljøet

```
npm run sikkerhetskopi:prove
```

Prøven bruker bare syntetiske brukere i Docker og sletter alt etterpå. Den
lager referansen fra en ren Supabase, bygger kilden med migrasjonene, en
syntetisk administrator og en bruker med profilbilde, tar en kryptert kopi
mens en egen tilkobling hele tiden skriver til to tabeller i samme transaksjon
og profilbildet byttes i første forsøk,
sletter databasen, gjenoppretter i en ny, ren Supabase og kontrollerer
punktene i planens §3.2:

1. radtall og kontrollsummer per tabell, også i `auth`;
2. migrasjonshistorikken;
3. filene;
4. at administratoren logger inn med sitt gamle passord;
5. at målet er nøyaktig referansen pluss tilpasningene;
6. at en ny bruker opprettes gjennom `opprett-bruker`, får profil og
   medlemskap og kan logge inn, og at en bruker uten myndighet avvises;
7. at profilbildereglene holder: egne bilder kan legges inn, byttes og
   fjernes, en annens kan ikke;
8. tiden gjenopprettingen tok;

og dessuten at skrivingen underveis ga ett sammenhengende kopipunkt (like
mange rader i begge tabellene, uten hull, og færre enn kilden fikk), og at
første forsøk ble forkastet fordi profilbildet ble byttet, og kopien tatt på
nytt med det nye bildet.

### Resultater

| Dato | Miljø | Resultat | Tid |
| --- | --- | --- | --- |
| 15.11.2026, etter kontrollen | Som over, med samtidig skriving og et byttet profilbilde | Alle punktene 1–8 i orden: 147 tabeller og 1 fil like kilden, 199 skrivinger i kopien og 346 i kilden da skrivingen stoppet (ett sammenhengende punkt), første forsøk forkastet og kopien tatt på nytt med det nye bildet, kopien pakket ut og prøvd før den ble godtatt. Punkt 6 som over | 12 s for gjenopprettingen |
| 15.11.2026 | Det lokale testmiljøet (Supabase-CLI 2.120.0), syntetiske brukere | Alle punktene 1–8 i orden: 145 tabeller og 1 fil like kilden, 7 tilpasninger på plass og ingen ekstra, gammel innlogging virker, ny bruker får profil og medlemskap, uten myndighet avvist, profilbildereglene holder. Punkt 6 brukte databasekallene `opprett-bruker` gjør, fordi Edge-kjøretøyet i skymiljøet ikke når npm-registeret; prøven bruker selve funksjonen der den kan starte | 14 s for gjenopprettingen |

Prøven med en ekte kopi av produksjonen (tiltak 4) er ikke gjort; den krever
Peders ja (D7b) og at kopien er i drift (tiltak 3).
