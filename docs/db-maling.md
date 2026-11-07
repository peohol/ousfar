# Databasemåling

Skånsomme, sammenlignbare målinger av produksjonsdatabasen (Supabase-prosjektet
`jfzqowsmjtthpbipnxnf`). De skal vise om svartid, feilrate, swap, disk-I/O og
midlertidige filer blir bedre, og skille effekten av tre ting som ellers lett
blandes: mindre QA-trafikk mot produksjon, SQL-endringer og en eventuell
oppgradering av kapasiteten. Bakgrunnen er Supabase-varselet om disk-I/O-budsjettet
6.11.2026.

Ingen belastningstest: målingen kaller ikke appen, og den endrer ingenting.

## Slik kjører den

- Arbeidsflyten `.github/workflows/db-maling.yml` måler hver tredje time (og
  kan startes for hånd), bare fra `main`, med `SUPABASE_ACCESS_TOKEN` fra miljøet
  `produksjon`.
- Hver måling legges som én JSON-linje i `db-malinger.jsonl`, som lagres som
  artefaktet `db-malinger` i kjøringen (beholdes i 90 dager). Hver kjøring henter
  artefaktet fra forrige vellykkede kjøring, legger målingen til og lagrer hele
  historikken på nytt, så det nyeste artefaktet har alt. Ingenting pushes til
  Git, så målingene utløser verken CI eller noen utrulling i Vercel (Vercel
  bygger hver gren som pushes, også en gren uten appen). Har ingen kjøring lyktes
  på 90 dager, begynner historikken på nytt.
- Rapporten står i sammendraget for kjøringen. Den kan også lages fra en
  hvilken som helst økt med tilgangstokenet, med historikken lastet ned fra den
  nyeste kjøringen (*Actions → Databasemåling → Artifacts*):

  ```
  npm run -s db:maling -- rapport --historikk db-malinger.jsonl
  ```

  `--historikk` kan gis flere ganger; filene slås sammen. Målingene fra før
  arbeidsflyten kom på plass (fra 6.11.2026) ligger i prosjektets delte mappe,
  `database/db-malinger.jsonl`.
- `npm run -s db:maling -- maling --historikk <fil>` tar én måling for hånd.

## Hva en måling inneholder

Koden står i `scripts/db-maling.ts` (innhenting) og `src/drift/dbmaling.ts`
(utregning og rapport).

| Del | Kilde | Kostnad |
|---|---|---|
| Swap inn/ut, store sidefeil, disk-operasjoner og -MB (alle disker), ledig minne, swap i bruk, oppstartstid | Maskinens Prometheus-metrikker (`/customer/v1/privileged/metrics`) | Ett HTTP-kall |
| Midlertidige filer (temp) | Samme metrikker (`pg_stat_database`) | – |
| Databasestørrelse (summen Supabase måler mot kvoten), siste migrering, kall/tid/temp per RPC-funksjon | Én skrivebeskyttet spørring mot katalogen og `pg_stat_statements` | Leser ingen tabeller |
| Kall, 5xx, automatisert trafikk (HeadlessChrome/Playwright), p50/p95 per RPC, tidsavbrudd | Loggene (ClickHouse via Management API) | Går ikke mot databasen |
| Kapasitet (nano, micro, …) | `billing/addons` | – |

Tellerne vokser fra maskinen startet. Rapporten regner forskjellen mellom to
målinger på rad og hopper over et par der maskinen har startet på nytt mellom
dem. Trafikken telles fra der forrige måling sluttet og fram til ti minutter
før nå, fordi loggene kommer fram med litt forsinkelse.

## Slik leses rapporten

- **Fase** er kapasitet × siste migrering. En oppgradering eller en ny
  migrering (for eksempel SQL-optimaliseringen) starter en ny fase, så hver
  endring får sine egne snitt.
- **Rolig drift** er perioder med under 100 API-kall i timen. Swap, sidefeil og
  IOPS i rolig drift viser grunnlasten uavhengig av trafikk; det er der en
  oppgradering skal synes.
- **QA-trafikk** synes i *Kall/t* og *Automatisert* (andelen kall fra
  automatiserte nettlesere). Sammenlign perioder med og uten slik trafikk innen
  samme fase.
- **SQL-endringer** synes i *ms · MB/kall* for `les_stoff` og `les_stoffer`
  (snittid og midlertidige filer per vellykket kall). De er normalisert per
  kall, så de påvirkes lite av hvor mye trafikk det var.

## Begrensninger

- Spørringer som avbrytes på tidsgrense, mangler i `pg_stat_statements`. De
  synes bare som *5xx*, *p95* og *Tidsavbrudd*.
- `pg_stat_statements` og tellerne nullstilles ved omstart; den første perioden
  etter en omstart (også etter en oppgradering) mangler derfor.
- Supabase viser ikke selve I/O-budsjettet i API-et; IOPS og MB/s er det
  nærmeste. Nano har en grunnkvote på om lag 250 IOPS og 43 Mbit/s, Micro om
  lag det dobbelte (`billing/addons` viser `baseline_disk_io_mbs`).
- Loggspørringene kan ikke se mer enn 24 timer tilbake per måling. Har
  arbeidsflyten stått stille lenger, begynner neste måling et nytt vindu på tre
  timer.
