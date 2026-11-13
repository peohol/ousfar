# Brukersystemet i OUSFAR

Leses når noe som har med innlogging, brukere, roller eller profilbilder å
gjøre skal endres. Den kliniske delen av appen berøres ikke av noe her.

## Kort fortalt

OUSFAR er lukket. Det finnes ingen registrering, ingen «glemt passord»-lenke
og ingen e-post i det hele tatt. En administrator oppretter kontoen og gir
brukeren et midlertidig passord. Brukeren logger inn med **brukernavn og
passord**, velger sitt eget passord med én gang, og er inne.

Hver konto tilhører et fagmiljø, og noen få er systemarkitekter. Det avgjør
foreløpig bare hvem som kan gi nytt passord og endre adminrollen til hvem;
ellers avgjøres rettighetene fortsatt av rollen `user`/`admin` alene. Se
«Fagmiljø og systemroller» under og `docs/fagmiljoer.md`.

## Delene det består av

| Hvor | Hva |
| --- | --- |
| `supabase/migrations/` | Tabellene, radsikkerheten og lagringsreglene |
| `supabase/functions/` | Operasjonene som krever forhøyede rettigheter |
| `supabase/functions/_delt/` | Reglene appen og serveren deler |
| `src/auth/` | Økten, kallene mot Supabase og bildebehandlingen |
| `src/components/konto/` | Innlogging, førstegangsoppsett, konto og brukerliste |
| `src/domain/tilgang.ts` | Hva som vises: innlogging, oppsett eller appen |

## Brukernavn og den interne Auth-adressen

Supabase Auth krever en e-postadresse for passordinnlogging. OUSFAR samler
ikke inn e-post, så adressen utledes av brukernavnet på et domene som aldri
kan eksistere: `peohol` → `peohol@auth.ousfar.invalid`.

Adressen er en teknisk nøkkel. Den vises ikke noe sted, kan ikke endres, og
det sendes aldri e-post fra systemet.

Reglene for brukernavn står i `supabase/functions/_delt/brukernavn.ts` og er
speilet i databasen i `public.brukernavn_er_gyldig()`. **Endres de ett sted,
må de endres begge steder** — testen `src/__tests__/brukersystem.test.ts`
sier fra hvis de kommer i utakt.

## Hvorfor registrering er umulig

Prosjektinnstillingene har registrering slått av, men det er ikke der
sperren ligger. Triggeren `paa_ny_auth_bruker` på `auth.users` krever en
kortlivet rad i `public.kontoreservasjoner` for brukernavnet. Den tabellen
har ingen rettigheter for `anon` eller `authenticated`, så en reservasjon kan
bare legges inn av noe som har den hemmelige nøkkelen — altså adminveien vår.
Uten reservasjon blir kontoen aldri til, uansett hva som står i
innstillingene.

Supabase fyller ut `app_metadata` og bekrefter adressen *etter* at raden er
lagt inn, så en trigger kan ikke kjenne igjen adminveien på kontoen selv.
Det er grunnen til at reservasjonen finnes.

## Hva den innloggede kan gjøre selv

Radsikkerheten lar alle innloggede lese alle profiler, og skrive bare i sin
egen rad. Kolonnerettighetene smalner det ytterligere inn: nettleseren har
skriverett på `first_name`, `last_name` og `avatar_path`, og ingenting annet.
En trigger avviser i tillegg endringer i `username`, `role`,
`must_change_password` og `onboarding_completed` når det er `authenticated`
som skriver. Rollen kan altså ikke settes fra nettleseren i det hele tatt.

## Adminoperasjonene

Alle går gjennom en Edge-funksjon, og alle følger samme rekkefølge:
autentiser, les bruker-ID fra JWT-en, slå opp rollen server-side i
profiltabellen, valider det som er sendt inn — og først da bruk den
privilegerte klienten. Fellesdelen ligger i `functions/_edge/kontekst.ts`.
`nytt-passord` og `sett-rolle` gjelder andres kontoer: der avgjør databasen
myndigheten, med den innloggedes ID, i samme transaksjon som endringen
(«Myndighet over kontoer» i `docs/fagmiljoer.md`).

| Funksjon | Hva den gjør |
| --- | --- |
| `opprett-bruker` | Oppretter konto og returnerer et midlertidig passord |
| `nytt-passord` | Gir en bruker et nytt midlertidig passord: systemarkitekten til alle utenom systemarkitekter, en lokal administrator bare til vanlige brukere i egne fagmiljøer |
| `sett-rolle` | Gir eller fjerner adminstatus hos en annen; bare systemarkitekter |
| `fullfor-oppsett` | Fullfører førstegangsoppsettet for den innloggede |

Det midlertidige passordet vises én gang, til administratoren som ba om det.
Det lagres ingen steder, logges ikke, og kan ikke hentes fram igjen. Mistes
det, lages et nytt.

`sett-rolle` gir den nye administratoren også lokal administratortildeling i
sitt primære fagmiljø, og den som mister rollen, slutter som lokal
administrator. Den gjør ikke en konto med midlertidig passord til
administrator, og fjerner ikke den siste. Administrasjonen av medlemskap og
lokale administratorer for seg kommer i P3.

## Fagmiljø og systemroller

Fra P1.1 (`supabase/migrations/20261113140000_fagmiljoer.sql`) har databasen
fagmiljøer, medlemskap, systemroller, lokale administratorer og en
uforanderlig tilgangslogg. Modellen, reglene og hvem som har hva står i
`docs/fagmiljoer.md`. For brukersystemet betyr det:

- En ny konto får automatisk aktivt primærmedlemskap i standardfagmiljøet,
  OUS Klinisk farmakologi, i samme transaksjon som profilen. Ellers er
  kontoopprettelsen uendret.
- En konto kan slettes som før. Medlemskapene og rollene følger med i
  kaskaden, men loggen står. Unntaket er den siste lokale administratoren i
  et aktivt fagmiljø, og den siste systemarkitekten: den kontoen må først
  avløses av en annen.
- Nettleseren kan bare lese egne medlemskap og navnet på egne fagmiljøer.
  Bare `nytt-passord` og `sett-rolle` bruker tabellene ennå (P1.2a);
  `er_admin()` og alle andre regler betyr det samme som før.

## Førstegangsoppsettet

`must_change_password` eller `onboarding_completed` avgjør om brukeren sendes
dit; se `src/domain/tilgang.ts`. Passordet settes server-side, og Supabase
kaster da den gjeldende økten — derfor logger appen inn på nytt med det
passordet brukeren nettopp valgte. Uten det ville brukeren falt ut av appen
en time senere.

## Profilbilder

Privat bøtte `avatarer`, én fast sti per bruker: `<bruker-id>/avatar.webp`.
Alle innloggede kan se bildene gjennom signerte lenker; bare eieren kan
skrive i sin egen mappe. Bildet beskjæres, roteres og komprimeres i
nettleseren til 512 × 512 WebP før det lastes opp.

## Innloggingsveggen

Innloggingen i nettleseren avgjør bare hva som tegnes opp. Uten noe foran seg
ville hele appen — analysedata, kommentartekster og fortolkningsregler — kunne
lastes ned av hvem som helst som kjenner adressen, siden OUSFAR er en statisk
app som serveres i sin helhet.

Veggen legger den grensen på Vercels kant, i `middleware.ts`. Den kliniske
delen av pakken utleveres bare til forespørsler som bærer en gyldig
OUSFAR-økt. Innloggingssiden og det den trenger står åpent; alt annet er
innenfor.

Tre ting henger sammen og må holdes i takt:

1. **Økten ligger i en informasjonskapsel**, ikke i nettleserens lokale lager.
   Det er det som gjør at kanten kan se den. Derfor bygges klienten med
   `createBrowserClient` fra `@supabase/ssr`.
2. **Den kliniske delen er en egen fil.** `Port` henter `App` først når noen
   er logget inn, og byggeoppsettet gir filen et fast navn. Rollup avgjør selv
   hva som følger med: det innloggingssiden også bruker, blir liggende utenfor.
3. **Kanten kontrollerer økten** mot prosjektets offentlige nøkler. Supabase
   signerer asymmetrisk, så ingen hemmelighet er involvert, og det går ingen
   forespørsel ut per fil.

`npm run build` avslutter med `scripts/kontroller-vegg.mjs`. Den leser av
byggingens kildekart hvilke moduler som faktisk havnet utenfor veggen, og
krever at hver av dem står oppført i skriptet med en grunn. Alt annet feiler
byggingen — også en helt ny modul ingen har rukket å tenke på. En modul er
dermed beskyttet fra den blir til, og det er bare veien ut som krever et
bevisst valg. Kontrollen kjøres også av Vercel, slik at en slik feil stanser
utleggingen i stedet for å legge appen ut åpen.

Veggen stenger appen, ikke dataene i Supabase. Det som ligger i databasen, er
fortsatt beskyttet av radsikkerhet og Edge-funksjoner, uavhengig av dette.

## Oppsett og drift

Migrasjonene rulles ut til produksjonen av GitHub Actions når en PR slås
sammen (`docs/migrasjoner.md`). Filnavnene følger versjonene i prosjektets
historikk, så de skal ikke endres i ettertid.

Edge-funksjonene ligger i repoet, men har **ingen** automatisk utrulling: de
legges ut for hånd med Supabase CLI eller MCP, og det finnes ingen kontroll av
at den kjørende koden er lik repoet. Produksjonen har i tillegg funksjonen
`delt-test`, som ikke finnes i repoet. Begge deler ryddes i P1.2
(`docs/ousfar-nasjonal-p0-kartlegging.md` §8).

Serverfunksjonene i `api/` kjører i Vercels region Stockholm (`arn1`), samme
sted som databasen (Supabase `eu-north-1`). Regionen settes ett sted, med
`regions` i `vercel.json`, og gjelder alle funksjonene; ingen av dem skal ha
en egen region. Veggen i `middleware.ts` kjører på kanten nær brukeren og er
ikke bundet til regionen.

Appen trenger to innstillinger i Vercel, begge offentlige:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Hemmelige nøkler skal aldri ligge i `VITE_`-variabler — de blir med i bygget.

Den nattlige synkroniseringen av legemiddeldata trenger i tillegg to hemmelige
innstillinger; se `docs/legemiddeldata.md`.

### Den første administratoren

`npm run bootstrap:admin` oppretter den, idempotent. Den leser
`BOOTSTRAP_ADMIN_USERNAME`, `BOOTSTRAP_ADMIN_PASSWORD`, `SUPABASE_URL` og
`SUPABASE_SECRET_KEY` fra miljøet. Finnes brukeren fra før, blir passordet
stående urørt og skriptet sørger bare for at adminrollen er på plass. Rollen
følges av lokal administratortildeling i brukerens primære fagmiljø, og i et
prosjekt uten systemarkitekt blir kontoen den første
(`docs/fagmiljoer.md`, «Myndighet over kontoer»).

### Om alle administratorene blir borte

Ingen kan gi seg selv adminstatus, og bare en systemarkitekt kan gi den til
andre, så da må rollen settes utenfra: kjør bootstrap-skriptet på nytt for en
konto som finnes, eller sett `role = 'admin'` i `public.profiles` med den
hemmelige nøkkelen. Det samme gjelder en systemarkitekt som har mistet
passordet sitt, siden ingen kan gi en systemarkitekt nytt passord gjennom
appen: passordet settes da med den hemmelige nøkkelen (Supabase Auth).
