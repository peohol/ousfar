# Nettleserkontroller: lokalt testmiljø og vern for produksjonen

Gjelder skript som starter appen i en automatisert nettleser (Playwright):
`src/__tests__/qa/appkontroll.ts`, målingen `src/__tests__/qa/maling.ts`,
ytelsesmålingen `src/__tests__/qa/ytelse.ts`,
P0-driveren `scripts/verktoy-p0-app.mjs` og nye skript av samme slag. Vanlige
`npm test` berøres ikke.

## Regelen

- **Omfattende kontroller kjøres lokalt**, mot en egen database. Det er
  standard: skriptene starter det lokale testmiljøet selv.
- **Produksjonen** (den publiserte appen) brukes bare til en kort, begrenset
  kontroll, og bare når den velges uttrykkelig med `QA_PRODUKSJON=ja`.
  Forhåndsvisninger på Vercel bruker den samme databasen og kontrolleres ikke
  automatisert.
- Nye skript bruker `apneTestmiljo()` i `src/__tests__/qa/testmiljo.ts` i
  stedet for å starte Playwright og logge inn selv. Da gjelder vernet
  nedenfor av seg selv.
- **Håndheves i `npm test`** (`src/__tests__/qa/nettleservern.test.ts`): bare
  `testmiljo.ts` får laste Playwright (eller Puppeteer) eller starte Chromium,
  og de navngitte skriptene over, også P0-driveren, må finnes og bruke
  `apneTestmiljo()`. Et skript som styrer nettleseren selv, gjør CI rød
  og kan ikke slås sammen.

## Kjøring

```
npx vite-node src/__tests__/qa/appkontroll.ts                 # lokalt (standard)
npx vite-node scripts/verktoy-p0-app.mjs                      # lokalt (standard)
QA_PRODUKSJON=ja npx vite-node src/__tests__/qa/appkontroll.ts  # begrenset, mot APP_URL
npm run qa:lokal                                              # bare miljøet, til Ctrl+C
npm run qa:lokal -- stopp                                     # stopper den lokale databasen
```

`APP_URL` alene velger ikke produksjonen: skymiljøet har den satt til den
publiserte appen for andre formål.

Med `QA_PRODUKSJON=ja` godtas bare adressene i `PRODUKSJONSVERTER`
(`trafikkvakt.ts`), i dag `https://ousfar.vercel.app`: HTTPS, uten port eller
brukernavn i adressen. Alt annet, også `http://`, fremmede domener og
forhåndsvisninger på Vercel (mønsteret i adressene deres kan etterlignes),
avvises før nettleseren åpnes og før administratorpassordet brukes. Sender
siden nettleseren videre til en annen adresse før innloggingen, stopper
kjøringen uten at passordet skrives inn.

## Det lokale testmiljøet (`lokalmiljo.ts`)

- Supabase i Docker (CLI-en i fast versjon), bygd av de samme migrasjonene som
  testdatabasen kjører (`src/__tests__/hjelp/migrasjonskjoring.ts`): uten dem
  som bare kan kjøres i produksjonen og uten bivirkningsimportene for fagsider
  en ny database ikke har. Databasen gjenbrukes til migrasjonene endres.
- En syntetisk administrator, `qa-admin`, med et tilfeldig passord som bare
  ligger i miljømappen (`$TMPDIR/ousfar-qa-lokal`). Den er også lokal
  administrator og, i den tomme databasen, systemarkitekt
  (`docs/fagmiljoer.md`, «Myndighet over kontoer»).
- Appen bygges hver gang mot den lokale databasen og serveres på
  `127.0.0.1:4173`, som produksjonsbygg (`NODE_ENV=production`, ellers arver
  den `development` fra `vite-node`). Innloggingsveggen på Vercels kant finnes
  ikke lokalt.
- Den lokale databasen har ingen FEST-kopi og ikke fagsidene fra produksjonen.
  En mellomtjener foran Supabase (`127.0.0.1:4174`) svarer på `les_legemidler`
  fra de lagrede FEST-uttrekkene (`src/data/verktoy/fest-*.json`), de samme som
  den lokale kjøringen av forløpene bruker, med kontrolltidspunktet satt til nå.
  Alt annet går til den lokale databasen.
- **Sanntiden (Realtime) står på** (gruppechatten, `docs/gruppechat.md`).
  Mellomtjeneren sender WebSocket-oppgraderingene rett videre, så appen når
  den gjennom samme adresse som resten.
- `npx vite-node src/__tests__/qa/gruppechatsanntid.ts` kontrollerer sanntiden
  i gruppechatten uten nettleser: to syntetiske medlemmer (`qa-chat-ada`,
  `qa-chat-bo`, nye tilfeldige passord hver gang) utveksler meldinger gjennom
  dørklokken, samtalelista teller de uleste til de er lest (bjella får ingen
  chatvarsler, D4b), og den som fjernes fra gruppen, får ingen flere
  hendelser, mister samtalen fra lista og stenges ute. Bryteren for chatten slås på i den lokale databasen mens den
  går, og settes etterpå tilbake slik migrasjonene satte den
  (`slaPaFunksjoner()` i `lokalmiljo.ts`, som alle chatkontrollene bruker).
- `npx vite-node src/__tests__/qa/gruppechatnettleser.ts` er
  nettleserkontrollen av gruppechatten (`docs/p7-testplan.md`, N1–N10): Ada og
  Bo i hver sin nettleserkontekst, med de samme syntetiske kontoene og
  bryteren på mens den går. `QA_SKJERMBILDER=<mappe>` lagrer skjermbildene.
  Flere brukere samtidig går gjennom `brukerside()` i `testmiljo.ts`, som bare
  finnes lokalt.
- `npx vite-node src/__tests__/qa/chatmenynettleser.ts` er nettleserkontrollen
  av chatmenyen (`docs/gruppechat.md`, «Chatmenyen»): boblen og de uleste,
  at det å åpne menyen ikke merker noe som lest, utkast som følger med til
  `#/chat`, Escape, parkering under hovedmenyen, plassen sammen med
  diskusjonsmenyen, mobil og mørk modus, og at den som fjernes, stenges ute.
  Samme kontoer og bryter som over, og `QA_SKJERMBILDER=<mappe>`.
- `npx vite-node src/__tests__/qa/direktemeldingnettleser.ts` er
  nettleserkontrollen av direktemeldingene
  (`docs/direktemeldinger-personvern.md`): bryterne av fra starten, «Ny chat»
  og søket, sanntid begge veier, låst linje når mottakeren slår av,
  blokkering i en åpen fane, aktivitetsprikken, tap av tilgangen til OUSFAR,
  mobil og mørk modus, og fanen Chat i Innstillinger. Samme kontoer; bryterne for chatten og
  direktemeldingene står på i den lokale databasen mens den går, og valgene,
  blokkeringene og samtalen mellom de to fra før slettes først.
- `npx vite-node src/__tests__/qa/gruppesymbolnettleser.ts` er
  nettleserkontrollen av gruppesymbolene (`docs/fagmiljoer.md`,
  «Gruppesymbolet»): Ada som ansvarlig velger en emoji og laster opp et bilde
  i gruppeinnstillingene, tekst avvises, Bo ser symbolene i chatmenyen, i
  hodet på gruppechatten og i gruppeoversikten (også mobil og mørk modus), og
  å fjerne bildet gjør at medlemmet ikke når det lenger. Samme kontoer og bryter som chatmenyen.
- `npx vite-node src/__tests__/qa/menynettleser.ts` er nettleserkontrollen av
  menyene (D6): toppmenyen uten idéer og administrasjon, hovedmenyen med
  navigasjonen og «For hele appen» for en systemarkitekt og for en vanlig
  bruker (`qa-meny-vanlig`), administrasjonens vinduer, Escape og fokus,
  kontomenyen og Innstillinger, oversikten over endringsforslag, dokken og
  hovedmenyen på mobil, og mørkt tema. `QA_SKJERMBILDER=<mappe>` lagrer
  skjermbildene.
- `npx vite-node src/__tests__/qa/helhetnettleser.ts` er den helhetlige
  kontrollen fra D7 (`docs/d7-kontroll.md`): forsiden (panelene, «Tilpass
  forsiden» på to maskiner, feil i ett panel, fagmiljøbytte uten gamle data,
  bjella), at «Åpne fortolkning» virker før panelene har svart,
  navigasjonen (Escape i fortolkningen og over den, nettleserens tilbake og
  fram, inngangsveien, de gamle adressene), gruppene (invitasjoner, siste
  aktivitet, arbeidsflaten med ulagret tekst, arkivert gruppe), at en som
  ikke er med, ikke ser noe, og nettbrett og mobil i lyst og mørkt tema uten
  siderulling. Syntetiske kontoer `qa-d7-ada`, `qa-d7-bo` og `qa-d7-cy`;
  bryterne for chatten og direktemeldingene står på mens den går
  (`slaPaFunksjoner()`).
- `npx vite-node src/__tests__/qa/ytelse.ts` er ytelsesmålingen
  (`docs/ytelse-maling.md`): kald og varm oppstart, fagsider, fortolkningen,
  «Brukere», fagmiljøbytte og personsøket, med syntetiske personer i flere
  mengder og syntetiske fagsider (`ytelsesdata.ts`). Den bruker
  `maleside()` i `testmiljo.ts`, som bare finnes lokalt: en kontekst med
  nettleserens hurtigbuffer på, der produksjonsdatabasen stoppes av
  nettleseren (`Network.setBlockedURLs`) i stedet for av avskjæringen, som
  ellers slår av hurtigbufferen.
- Det nettleserkontrollene kan dele (punktene og rapporten, skjermbildene,
  ventingen, de innloggede klientene, å lukke chatmenyen, å telle
  abonnementene i Realtime og å arkivere gamle syntetiske grupper), står i
  `src/__tests__/qa/kontroll.ts`; SQL og bryterne står i `lokalmiljo.ts`.
  `QA_PUNKTER=N2,N4` kjører bare de punktene i en kontroll som bruker
  `lagKontroll()`.
- `[auth.email] enable_signup = false` i `supabase/config.toml` slår av
  innlogging med e-post i CLI-en; linjen tas bort i miljøets kopi.

## Vernet (`trafikkvakt.ts`)

Lokalt: ingen tak, og høyst to nye forsøk når en side ikke lastet.

I produksjon:

| Grense | Verdi | Miljøvariabel (kan bare senke) |
| --- | --- | --- |
| Forløp per kjøring | 6 | `QA_MAKS_FORLOP` |
| Kall mot databasen per kjøring | 400 | `QA_MAKS_KALL` |
| Nye forsøk etter tidsavbrudd | 0 | `QA_MAKS_NYE_FORSOK` |
| Pause mellom forløp | 15 s (kan bare økes) | `QA_PAUSE_MS` |
| Et kall som venter lenger enn | 5 s | `QA_TREGT_KALL_MS` |
| Hele kjøringen | 15 min | `QA_MAKS_VARIGHET_MS` |

- **Én om gangen**: én nettleserkontekst åpen om gangen, og en lås hindrer to
  kjøringer mot produksjonen fra samme maskin samtidig.
- **Én innlogging**: senere forløp får innloggingen og det appen har lagret i
  nettleseren (også fagsøket) fra den første, i stedet for å logge inn på nytt.
- **Fagsøkets bakgrunnslesinger blokkeres** (`les_stoffer`, `les_preparatsok`,
  `les_interaksjonssok`, `les_farmakogenetikk_sok`, `les_cpic`,
  `les_laboratoriesok`). Verktøyene bruker dem ikke, og `les_stoffer` er det
  tyngste kallet appen gjør.
- **Overbelastning stopper kjøringen**: første svar med 5xx, et kall som venter
  over grensen, eller for mange kall. Konteksten lukkes med én gang, alle nye
  kall avbrytes, rapporten sier at kjøringen ble stoppet og hvorfor, og
  skriptet avslutter med feilstatus. Det prøves ikke på nytt.

## Hendelsen 6.11.2026

Kartlagt fra Supabase-loggene (kanten). Kl. 07:58–10:40 UTC kom 17 484 kall fra
en automatisert nettleser mot ousfar.vercel.app, logget inn som
administratorkontoen skriptene deler. Øktene er fordelt på skriptene etter
mønsteret (mange innlastinger per innlogging, eller én):

| Kilde | Økter | Kall | Innlastinger av appen | `les_stoffer` |
| --- | --- | --- | --- | --- |
| QA-appkontrollen: én innlogging, appen lastet på nytt per forløp | 12 | 10 547 | 373 | 339 |
| P0-driveren: ny nettleser og innlogging per forløp, 09:03–10:05; seks økter startet innen samme minutt kl. 09:24 | 101 | 3 194 | 100 | 225 |
| Uten økt: innlogging og CORS-forespørsler før kallene | – | 3 743 | – | 111 (bare CORS) |

Av de 564 egentlige kallene til `les_stoffer` feilet 549 med 5xx etter i
snitt 11 s; 15 lyktes.

**Hvorfor `les_stoffer` ble kalt så ofte, trass versjonsbasert lagring**
(`src/faginnhold/globaltSok.ts`):

1. Hver innlasting av appen, også på verktøysidene, henter fagsøkets indeks i
   bakgrunnen når siden er ledig (`useNaarLedig` → `sokeindeks.krev`).
2. Indeksen lagres i nettleseren (IndexedDB) bare etter en vellykket lesing.
   Når nesten alle lesingene feilet, var ingenting lagret, og neste innlasting
   leste på nytt.
3. En lesing som feiler, prøves to ganger til (etter 1 og 4 s). Under
   overbelastningen ga det om lag to til tre kall per innlasting.
4. P0-driveren startet hvert forløp i en ny nettleser, uten noe lagret, og leste
   derfor minst én gang per forløp også når databasen var frisk.

Lagringen virker når lesingen lykkes: QA-kjøringen 08:48–08:59 hadde 62
innlastinger og bare 3 kall til `les_stoffer`. Årsaken var altså
belastningen, forsterket av nye forsøk; ikke en feil i lagringen. Vernet over
fjerner alle fire forholdene fra testkjøringer. Om appen selv bør la være å
prøve `les_stoffer` på nytt ved 5xx eller tidsavbrudd, er et eget valg, best
tatt sammen med optimaliseringen av `stoffsider_som_json`.
