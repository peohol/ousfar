# Fagsidelesingen: ytelse og midlertidige filer

Leses når `les_stoff`, `les_stoffer` eller `stoffsider_som_json` skal endres,
eller når databasen bruker mye disk eller tid på å lese fagsidene.

## Bakgrunn (06.11.2026)

Produksjonen (Nano, 453 MB RAM, `work_mem` 2184 kB) holdt på å bruke opp
Disk IO-budsjettet. Målingen i produksjonen viste at fagsidelesingen skrev
mye midlertidig til disk: ~12 MB per `les_stoff` og ~80 MB per `les_stoffer`,
og at `les_stoffer` ofte ble avbrutt av tidsgrensen under en automatisert
QA-kjøring mot produksjonen.

Årsaken var `stoffsider_som_json` fra `20260929111940_stoffidentitet`: den
bygde JSON for **alle** objektutgavene i tilstanden (~8 800: sider, elementer,
referanser, kommentarer og regelsett) i et felles mellomresultat, også når én
fagside med ~35 elementer og ~50 referanser skulle leses. I tillegg gikk tre
ting til disk fordi de var større enn arbeidsminnet: mellomresultatet,
sorteringene som bar med seg alt innholdet, og svaret selv, som en
SQL-funksjon legger i et mellomlager.

## Endringen (`20261106140000_stoffsider_som_json_nodvendige`)

- JSON-en bygges bare for de valgte sidene, elementene deres og referansene de
  siterer, der de brukes.
- Elementene på hver side bygges etter at sidene er sortert, så sorteringen
  ikke bærer med seg alt innholdet.
- `stoffsider_som_json` og `les_stoffer` er PL/pgSQL, så svaret ikke går
  gjennom en SQL-funksjons mellomlager.

Svaret er det samme tegn for tegn, og radsikkerheten, rettighetene og
kommentarene står (`src/__tests__/stoffsider-som-json.test.ts`, som leser alle
sidene i begge tilstandene, som administrator og som vanlig bruker, før og
etter migrasjonen).

## Målingene

Begge målingene er gjort i isolerte databaser, ikke i produksjonen. Databasen
er bygd av migrasjonene og fylt med syntetiske fagsider i produksjonens
størrelse (`PRODUKSJONSFORM` i `src/__tests__/hjelp/syntetiskeFagsider.ts`):
128 sider à 33 elementer, 31 referanser per side og 460 referanser ingen
siterer, i alt **8 780 publiserte og 8 830 utkastutgaver** (produksjonen hadde
8 784). En femtedel av sidene og en tredjedel av elementene er endret i
utkastet etter publiseringen. Arbeidsminnet er produksjonens (`work_mem`
2184 kB). `les_stoff` leser en side midt i alfabetet. Tiden og de midlertidige
filene er fra `EXPLAIN (ANALYZE, BUFFERS)` på hele kallet, som tar med arbeidet
inne i funksjonene. «JSON bygd for» er antall utgaver funksjonen bygger JSON
for: før endringen alle utgavene i tilstanden den som leser ser, etter
endringen bare dem svaret inneholder.

### Postgres 16-server (median av 5 kall)

En vanlig Postgres-server med `shared_buffers` 224 MB og de andre
innstillingene fra produksjonen. Dette er den mest representative målingen
av de midlertidige filene, som her går til en ekte disk.

| Kall | Tid før | Tid etter | Midlertidig før | Midlertidig etter |
|---|---|---|---|---|
| `les_stoff`, publisert, vanlig bruker | 109 ms | 17 ms | 9,4 MB | 0 MB |
| `les_stoff`, utkast, administrator | 122 ms | 17 ms | 7,9 MB | 0 MB |
| `les_stoffer`, publisert, vanlig bruker | 364 ms | 394 ms | 52,4 MB | 0 MB |
| `les_stoffer`, utkast, administrator | 361 ms | 340 ms | 43,3 MB | 0 MB |

### PGlite, Postgres 18 i minnet (median av 3 kall)

Samme database og arbeidsminne i den samme Postgres i minnet som testene
bruker. Gjentas med
`MAAL_STOFFSIDELESING=1 npx vitest run src/__tests__/ytelse/stoffsidelesing.test.ts`.

| Kall | Tid før | Tid etter | Midlertidig før | Midlertidig etter | JSON bygd for, før | JSON bygd for, etter |
|---|---|---|---|---|---|---|
| `les_stoff`, publisert, vanlig bruker | 234 ms | 11 ms | 9,5 MB | 0 MB | 8 780 | 65 |
| `les_stoff`, utkast, administrator | 175 ms | 13 ms | 8,0 MB | 0 MB | 8 830 | 67 |
| `les_stoffer`, publisert, vanlig bruker | 506 ms | 449 ms | 28,8 MB | 0 MB | 8 780 | 8 320 |
| `les_stoffer`, utkast, administrator | 447 ms | 363 ms | 27,6 MB | 0 MB | 8 830 | 8 370 |

### Hva tallene betyr

- **`les_stoff`** (én fagside) bygger nå JSON for ~65 utgaver i stedet for
  ~8 800, skriver ingenting midlertidig og er 6–20 ganger raskere.
- **`les_stoffer`** (alle fagsidene, til søket) trenger nesten alle utgavene
  uansett, så antallet går bare litt ned. Den skriver ikke lenger noe
  midlertidig (før 28–52 MB per kall). Tiden er omtrent den samme i en
  maskin med god plass i minnet, fordi arbeidet der er å bygge JSON-en; i
  produksjonen, der de midlertidige filene gikk til en disk som allerede var
  presset, bør gevinsten være større, men det er ikke målt.
- Før-tallene for de midlertidige filene ligger nær det som ble målt i
  produksjonen (9,4 mot ~12 MB og 52 mot ~80 MB), så den syntetiske databasen
  er representativ for dette.

## Begrensninger

- Ingen belastningstest mot produksjonen, etter avtale. Effekten der skal
  måles skånsomt etter utrullingen, adskilt fra effekten av mindre QA-trafikk
  og eventuell oppgradering av databasen.
- Tidene i en isolert database sier lite om tidene på Nano-instansen, som
  swapper; de midlertidige filene og antallet utgaver er det som kan
  sammenlignes.
- Postgres-serveren var versjon 16 og PGlite versjon 18; produksjonen kjører 17.
