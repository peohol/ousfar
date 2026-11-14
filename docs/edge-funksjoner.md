# Edge-funksjonene og utrullingen av dem

Leses når en Edge-funksjon i `supabase/functions/` endres, skal rulles ut, eller
når utrullingen har stoppet. Reglene for koden i funksjonene står i
`supabase/AGENTS.md`; migrasjonene har sin egen utrulling (`docs/migrasjoner.md`).

## Hva som rulles ut

Hver mappe i `supabase/functions/` som ikke begynner med `_`, er én funksjon,
med `index.ts` som inngang og en seksjon `[functions.<navn>]` med `verify_jwt`
i `supabase/config.toml`. Felles kode ligger i `_edge/` (bare serveren) og
`_delt/` (også appen).

En funksjon består av inngangsfila og alt den importerer, direkte eller via
andre filer, fra `_edge/` og `_delt/`. Rene typeimporter (`import type`) er
ikke med, fordi Supabase fjerner dem når funksjonen buntes. En endring i en
felles fil gjelder derfor nøyaktig de funksjonene som bruker den.

## Slik virker utrullingen

Arbeidsflyten `.github/workflows/edge-funksjoner.yml` kjører
`scripts/edgeutrulling.ts` (logikken i `src/drift/edgefunksjoner.ts`) i tre steg:

1. **Kontroll og plan.** Henter kildefilene hver funksjon i produksjonen faktisk
   kjører (Management API-et), og sammenligner dem fil for fil, og `verify_jwt`,
   med repoet. Planen står i sammendraget for kjøringen. Kontrollen endrer
   ingenting.
2. **Utrulling.** Bare funksjonene som avviker, rulles ut, én om gangen. Den
   første feilen stopper resten.
3. **Etterkontroll.** Henter alle funksjonene på nytt: hver funksjon i repoet
   skal kjøre nøyaktig det repoet har, med riktig `verify_jwt`, og avvise et
   kall uten innlogging (401).

Utrullingen er tilstandsbasert: den ser på hva produksjonen kjører, ikke på
hvilke filer en commit endret. Å kjøre den flere ganger gjør derfor ingen skade,
og den retter opp en funksjon som ble hengende etter.

Kjøringene står under *Actions → Edge-funksjoner* i GitHub. Den starter:

- ved en sammenslåing til `main` som endrer funksjonene, `config.toml` eller
  utrullingen selv;
- når *Produksjonsmigrering* er ferdig og vellykket;
- for hånd med *Run workflow* (bare på `main`), med modus `kontroll` eller
  `utrull`.

## Sikkerheten

- **Bare `main`.** Jobben krever `main` og bruker GitHub-miljøet `produksjon`,
  som bare `main` får bruke (`docs/migrasjoner.md`, «Oppsettet i GitHub»).
  PR-ene får ingen hemmeligheter: CI kjører bare testene, som kontrollerer at
  hver funksjon har oppsett og at alt den importerer, finnes.
- **Migrasjonene først.** Mangler databasen migrasjoner fra repoet, venter
  utrullingen: ved en sammenslåing rulles funksjonene ut av kjøringen som
  starter når produksjonsmigreringen er ferdig. Startet for hånd stopper den.
- **Ingen sletting.** En funksjon som bare finnes i produksjonen, røres aldri;
  den meldes som en advarsel.
- **Ingen overskriving av ukjent kode.** Kjører produksjonen kode som ikke
  finnes i noen versjon av funksjonen i repoets historikk (lagt ut for hånd),
  stopper utrullingen før noe er endret (under).
- **Én om gangen.** `concurrency: supabase-edge`. En egen gruppe, så en
  ventende kjøring her aldri erstatter en ventende produksjonsmigrering.
- **Tokenet** settes bare i stegene som trenger det, etter at avhengighetene er
  installert uten installasjonsskript, og skriptet skriver det aldri ut.
- **Ingen hånd-utrulling.** Funksjonene legges ikke lenger ut med Supabase-CLI
  eller MCP; det gir nettopp avvikene utrullingen stopper for.

## Bryteren: automatisk eller for hånd

`AUTOMATISK_UTRULLING` øverst i arbeidsflyten avgjør hva sammenslåingene gjør:

| Verdi | Ved sammenslåing og etter migrering | For hånd |
| --- | --- | --- |
| `nei` | Bare kontroll og plan | `kontroll` eller `utrull` |
| `ja` | Ruller ut det som avviker | `kontroll` eller `utrull` |

Den står på `ja`. Den ble slått på 2026-11-13, etter at automatikken var prøvd:

1. Den første kontrollen på `main` viste at produksjonen kjørte det repoet
   hadde: alle fire funksjonene var like repoet fil for fil.
2. Etter P1.2a (#377, ny myndighetsmodell i `nytt-passord` og `sett-rolle`)
   og migreringen planla kontrollen alle fire funksjonene, siden P1.2a også
   endret de felles filene i `_edge/`. Den første utrullingen ble startet for
   hånd (kjøring 43512866624): fire nye versjoner, og etterkontrollen var grønn.

Settes bryteren tilbake til `nei` (for eksempel mens noe undersøkes), går
utrullingen tilbake til bare kontroll ved sammenslåinger.

Går noe galt ved en utrulling, er rettingen å sette koden tilbake i en ny PR
(for eksempel en `git revert`): utrullingen legger da ut den forrige versjonen,
som finnes i historikken.

## Når utrullingen stopper eller advarer

| Melding | Hva den betyr, og hva som gjøres |
| --- | --- |
| *produksjonen kjører kode som ikke finnes i repoets historikk* | Noen har lagt ut funksjonen for hånd. Hent koden som kjører (Management API, `GET /v1/projects/<ref>/functions/<navn>/body`) og sammenlign. Hører endringen hjemme, legges den inn i repoet med en PR; da blir funksjonen `uendret`. Skal den forkastes, startes utrullingen for hånd med funksjonen i feltet *overskriv*. |
| *finnes bare i produksjonen* (advarsel) | En funksjon uten mappe i repoet. Den røres ikke. Finn ut hva den er; hører den til, legges koden i repoet; skal den bort, slettes den i Supabase etter en egen vurdering, og vurderingen skrives her. |
| *databasen mangler migrasjonene …* | Produksjonsmigreringen har ikke kjørt eller har stoppet (`docs/migrasjoner.md`). Funksjonene rulles ut når den er ferdig. |
| *finner ikke …* / *ligger utenfor supabase/functions/* | En import peker på en fil som ikke finnes, eller utenfor mappen. Rettes i repoet; CI fanger det. |
| *[functions.x] støtter bare verify_jwt* | `config.toml` har et felt utrullingen ikke kjenner (egen inngangsfil, import map). Utvid utrullingen først. |
| *svarte … på et kall uten innlogging* | Funksjonen svarer ikke, eller slipper gjennom kall uten innlogging. Undersøk straks. |

## `delt-test` i produksjonen

Produksjonen hadde funksjonen `delt-test`, som aldri har vært i repoet. Undersøkt
2026-11-13 ved å hente koden som kjører (versjon 2, lagt ut 2026-09-22): én fil,
`index.ts`, med sha256 `f342c70fc1c9576841f8f4a8a20411dde7547b1d51513e44ca7db2a493055842`:

```ts
// Ubrukt. Denne funksjonen ble laget for å prøve ut utrullingen, og hører
// ikke til OUSFAR. Den kan slettes fra Supabase-dashbordet.
Deno.serve(() => new Response('Gone', { status: 410 }))
```

Den svarte 410 på alle kall, leste ingen data, brukte ingen hemmeligheter og
var ikke nevnt noe sted i appen eller repoet. Den var derfor trygg å fjerne, og
ble slettet 2026-11-13 (P1.2b, etter Peders bestilling om å fjerne den hvis det
var dokumentert trygt). Etterpå svarer adressen 404, og produksjonen har bare de
fire funksjonene i repoet. Trengs den igjen, kan den gjenskapes fra teksten over.
