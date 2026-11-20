# Ytelsesmåling: utgangspunktet (P0) og sluttkontrollen (P5)

Måleverktøyet og før-tallene for ytelsesplanen
([docs/ytelse-synlig-innlasting.md](ytelse-synlig-innlasting.md), Issue
[#500](https://github.com/peohol/ousfar/issues/500)). Leveransene A–C og
bakgrunnsarbeidet (#501–#504) sammenligner med tallene her, og
sluttkontrollen (#505) kjører den samme målingen på nytt med de samme dataene
og innstillingene.

Målet er tiden til brukeren **ser relevant innhold og kan bruke siden**, ikke
hvor lenge en lasteindikator står.

## Slik kjøres den

```
npx vite-node src/__tests__/qa/ytelse.ts
```

Bare i det lokale testmiljøet ([docs/qa-testmiljo.md](qa-testmiljo.md)):
appen bygges som produksjonsbygg mot en egen Supabase i Docker, og
produksjonsdatabasen stoppes av nettleseren. Ingenting kjøres mot
produksjonen. Hele kjøringen tar omtrent to timer på testmaskinen; bruk
`YTELSE_SCENARIER` for å måle bare det en endring gjelder.

| Miljøvariabel | Standard | Hva |
| --- | --- | --- |
| `YTELSE_UT` | midlertidig mappe | Rapporten (`ytelse-rapport.md`) og rådataene (`ytelse-malinger.json`) |
| `YTELSE_GJENTAKELSER` | 5 | Gjentakelser per scenario og profil |
| `YTELSE_PROFILER` | `rask,treg` | Profilene under |
| `YTELSE_SCENARIER` | alle | `kald,varm,fagside,direkte,fortolkning,fagmiljobytte,brukere,personsok,sql` |
| `YTELSE_PERSONER` | `50,500,5000` | Personmengdene for personsøket, «Brukere» og SQL-en; de andre scenariene bruker den midterste |
| `YTELSE_SQL_GJENTAKELSER` | 5 | Gjentakelser per SQL-kall (etter én oppvarming) |
| `YTELSE_FORTSETT` | av | Fortsetter en avbrutt kjøring i den samme `YTELSE_UT` |
| `YTELSE_BARE_RAPPORT` | av | Skriver bare rapporten på nytt fra rådataene i `YTELSE_UT` |
| `YTELSE_FOR` | av | Rådataene fra en tidligere måling (`ytelse-malinger.json`): rapporten får før og etter for hvert merke, personsøk og SQL-kall |

Filene:

- `src/__tests__/qa/ytelse.ts`: scenariene, SQL-målingen og rapporten.
- `src/__tests__/qa/ytelsesmaler.js`: måleren i siden (merkene under).
- `src/__tests__/qa/ytelsesside.ts`: siden med måleren og profilen, felles
  for målingen og etterkontrollen.
- `src/__tests__/qa/ytelseskontroll.ts`: etterkontrollen (P5) av det som ble
  raskere, under «Sluttkontrollen» nedenfor.
- `src/__tests__/qa/ytelsesdata.ts`: det syntetiske datagrunnlaget.
- `src/__tests__/qa/ytelsesmal.ts`: utregningene (prøvd i
  `src/__tests__/ytelsesmal.test.ts`).
- `maleside()` i `src/__tests__/qa/testmiljo.ts`: en nettleserkontekst med
  hurtigbufferen (HTTP-cache) på. Avskjæringen de andre kontrollene bruker,
  slår den av, og da ville en varm oppstart lastet all koden på nytt.

## Hva som måles

### Merkene

Måleren legges inn i siden før appen starter. Den noterer, ved første tegnede
bilde etter en endring, når en kjent del av siden først står ferdig. Tiden
regnes fra handlingen: trykket på «Logg inn», åpningen av adressen, eller
klikket/tastetrykket som starter overgangen. Den lagrer ingen brukerdata og
sender ingenting.

| Merke | Betyr |
| --- | --- |
| `skall` | Toppmenyen med fagsøket står (brukbar navigasjon) |
| `forside` | «Åpne fortolkning» står (første meningsfulle innhold) |
| `forside_tittel` | Fagmiljøets navn står over forsiden |
| `forside_paneler` | Alle panelene på forsiden er hentet |
| `fagsok_svar` | Første treff i fagsøket (Ctrl + K og et stoffnavn, skrevet så snart toppmenyen står), eller feilmeldingen: første vellykkede handling |
| `fagside_navn` / `fagside_innhold` / `fagside_komplett` | Fagsidens navn; panelene hentet; ingen «Henter …» igjen (FEST, bivirkninger, kjemi og de andre kildene) |
| `fortolkning` / `fortolkning_treff` | Søkefeltet i fortolkningen; første treff i analyttsøket |
| `brukere` | Medlemslisten under Administrasjon → Brukere |
| Personsøket | Fra siste tastetrykk til det første svaret etter det (treff, «Ingen treff.» eller feil), delt i pausen før kallet, kallet (nett og database) og visningen |

For hvert merke føres også antall API-kall startet før det, koden som var
hentet (overført og utpakket), og summen av lange oppgaver (over 50 ms, da
siden ikke svarer på tastene).

### Scenariene

| Scenario | Hva |
| --- | --- |
| `kald` | Tom nettleser: innlogging, forsiden, og fagsøket |
| `varm` | Innlogget, med det appen har lagret og nettleserens hurtigbuffer: appen åpnes på nytt |
| `fagside` | Fra forsiden til en fagside koblet til FEST |
| `direkte` | Direkte lenke til en fagside i en ny innlasting (varm) |
| `fortolkning` | Fra forsiden til fortolkningen, og første treff i analyttsøket |
| `fagmiljobytte` | Bytte arbeidsfagmiljø i kontomenyen (annenhver vei), til navnet og panelene står |
| `brukere` | Administrasjon → Brukere, for hver personmengde |
| `personsok` | Gruppeinvitasjon (systemarkitekt), «Legg til medlem» (systemarkitekt) og ny direktemelding (vanlig medlem), for hver personmengde: første søk, gjentatt søk, skrivefeil, aksenter og nordiske tegn, tomt treff, rask skriving, feil fra databasen, og et svar som kommer 2 s for sent mens et nytt søk er skrevet. Treffene sammenlignes, ved brukernavnet og i rekkefølge, med svaret databasen gir direkte, og et foreldet treff teller som feil selv om det bare står et øyeblikk |
| `sql` | Personsøkene i databasen med `EXPLAIN (ANALYZE, BUFFERS)`, som systemarkitekt, lokal administrator og vanlig medlem |

I tillegg leses serverens tid per kall (`pg_stat_statements`) for hvert
scenario, og for fagsiden føres referanselisten hver gang den endres: hvor
mange referanser som får et nytt nummer mens kildene kommer.

### Profilene

| Profil | Nett | Maskin |
| --- | --- | --- |
| `rask` | Lokalt, uten begrensning | Testmaskinen |
| `treg` | 80 ms ekstra per forespørsel, 10 Mbit/s ned, 5 Mbit/s opp | Fire ganger tregere (Chromiums CPU-struping) |

`rask` er det beste tilfellet og viser hva koden selv koster. `treg` ligger
nærmere en eldre arbeidsstasjon på sykehusnettet eller en mobil; den lokale
databasen har ingen nettforsinkelse, så alle tall uten profilens forsinkelse
er lavere enn i produksjonen.

## Datagrunnlaget

Syntetisk og deterministisk (`ytelsesdata.ts`): det samme antallet gir de
samme personene og sidene.

- **Personer** (`ys<nr>.<initialer>`): 50, 500 og 5 000. Fordelt mellom de to
  fagmiljøene migrasjonene lager, med aktive, avsluttede og inviterte
  medlemskap, lokale administratorer, stillinger, direktemeldinger slått på
  for to av fem og blokkeringer. Navnene har æ, ø, å, aksenter, bindestrek og
  to fornavn. Kontoene lages gjennom de samme utløserne som ekte kontoer.
- **Måleboerne**: `qa-admin` (systemarkitekt, ser alle), `qa-ytelse-lokal`
  (lokal administrator) og `qa-ytelse-medlem` (vanlig medlem).
- **Fagsider**: 128 sider i produksjonens form (`PRODUKSJONSFORM` i
  `src/__tests__/hjelp/syntetiskeFagsider.ts`: 33 elementer og 31
  referanser per side, utkast som avviker fra det publiserte, ~17 600
  objektutgaver). De første 12 er koblet til et virkestoff i FEST-uttrekkene,
  så preparat- og interaksjonspanelene henter som på en ekte side.
- **Analyttkatalogen**: den migrasjonene gir (79 oppføringer i
  standardfagmiljøet).

Størrelsene står i rapporten for hver kjøring.

## Begrensninger

- Den lokale databasen er ikke Supabase Free i skyen: ingen nettforsinkelse,
  `work_mem` 4 MB (produksjonen 2 MB), og en annen maskin. Tallene er til
  sammenligning før og etter, ikke anslag for produksjonen.
- FEST kommer fra de lagrede uttrekkene gjennom mellomtjeneren, og den lokale
  databasen har ingen ClinPGx-, CPIC-, kjemi- eller laboratoriedata. Kallene
  gjøres, men svarer tomt og raskt.
- Med fem gjentakelser er p95 i praksis den største verdien.
- Testmaskinen: se miljølinjen øverst i rapporten.

## Utgangspunktet

Kjøringen 20.11.2026 med uendret app (koden lik `main` utenfor
`src/__tests__`), 500 personer der ikke annet står, fem gjentakelser.
Tallene er median (p95). Hele rapporten:
[docs/ytelse-maling-utgangspunkt.md](ytelse-maling-utgangspunkt.md).

### Oppstart og første handling

| Merke | Kald, rask | Varm, rask | Kald, treg | Varm, treg |
| --- | --- | --- | --- | --- |
| `skall` = `forside` | 679 ms (748) | 454 ms (515) | 2,80 s (2,92) | 1,92 s (2,03) |
| `forside_tittel` | 801 ms (878) | 588 ms (684) | 2,80 s (2,92) | 1,92 s (2,03) |
| `forside_paneler` | 1,05 s (1,34) | 1,02 s (1,12) | 3,64 s (3,83) | 2,89 s (2,99) |
| `fagsok_svar` | 1,79 s (1,90) | 1,06 s (1,17) | 13,3 s (13,6) | 12,3 s (12,5) |

- **Alt venter på det samme.** `skall`, `forside` og (på treg profil)
  `forside_tittel` kommer i samme bilde: hele grensesnittet står tomt til
  analyttkatalogen og de andre oppstartskallene er ferdige.
- **Kode før skallet:** 733 kB overført (2,46 MB utpakket) i kald oppstart,
  869 kB / 2,92 MB før panelene står, fordelt på fire filer. Den største
  (den kliniske pakken) er 2,1 MB utpakket. Lange oppgaver før skallet: 332
  ms (rask) og 1,5 s (treg), da siden ikke svarer på tastene.
- **Kall før skallet:** 27 (rask) til 39 (treg), blant dem
  `brukerinnstillinger` ×10 og `forsideoppsummering` ×4.
- **Fagsøket** svarer først når hele innholdet til alle fagsidene er hentet
  (`les_stoffer`, ~9 MB JSON ukomprimert for de 128 sidene, ~0,5 s i
  databasen) og
  søkeindeksen er bygget: 12–13 s på treg profil, mens forsiden har stått i
  ~10 s.

### Fagsider

| Merke | Fra forsiden, rask | Fra forsiden, treg | Direkte lenke, rask | Direkte lenke, treg |
| --- | --- | --- | --- | --- |
| `fagside_navn` | 55 ms (73) | 577 ms (843) | 679 ms (708) | 2,68 s (2,81) |
| `fagside_innhold` = `fagside_komplett` | 139 ms (157) | 866 ms (1,14 s) | 708 ms (716) | 2,94 s (2,97) |

- **Referansene renummereres:** referanselisten vises to ganger, og 31 av 32
  referanser får et nytt nummer når FEST-referansen kommer (alle
  gjentakelser, begge profiler, begge veier inn).
- En direkte lenke venter på hele appskallet (`skall` 442 ms / 2,1 s) før
  siden starter.

### Andre overganger

| Overgang | Rask | Treg |
| --- | --- | --- |
| Forsiden → fortolkningen (søkefeltet / første treff) | 85 ms (107) / 119 ms | 725 ms (941) / 893 ms |
| Bytte fagmiljø (navnet / panelene) | 112 ms (132) / 398 ms (409) | 412 ms (1,07 s) / 1,01 s (1,07) |
| Administrasjon → Brukere, 50 personer | 216 ms (281) | 619 ms (741) |
| Administrasjon → Brukere, 500 personer | 715 ms (789) | 1,68 s (1,81) |
| Administrasjon → Brukere, 5 000 personer | 5,0 s (5,5) | 7,6 s (7,8) |

«Brukere» vokser med antall personer fordi `medlemsoversikt` gjør det: 49 ms
ved 50, 469 ms ved 500 og 4,7 s ved 5 000 personer i databasen.

### Personsøket

Fra siste tastetrykk til svaret står, median (p95). Personsøket venter 250 ms
etter siste tastetrykk før det spør databasen; resten er kallet.

| Søket | 50, rask | 500, rask | 5 000, rask | 5 000, treg |
| --- | --- | --- | --- | --- |
| Gruppeinvitasjon (systemarkitekt), første søk | 319 ms (325) | 666 ms (720) | 4,12 s (4,31) | 4,35 s (4,42) |
| Gruppeinvitasjon, tomt treff | 317 ms (328) | 742 ms (794) | 5,00 s (5,15) | 5,06 s (5,18) |
| «Legg til medlem» (systemarkitekt), første søk | 298 ms (303) | 497 ms (504) | 2,70 s (2,94) | 2,88 s (3,49) |
| «Legg til medlem», tomt treff | 293 ms (310) | 534 ms (635) | 2,82 s (2,86) | 3,14 s (3,37) |
| Ny direktemelding (vanlig medlem), første søk | 287 ms (307) | 436 ms (444) | 2,00 s (2,02) | 2,20 s (2,51) |
| Ny direktemelding, tomt treff | 290 ms (296) | 476 ms (508) | 2,29 s (2,41) | 2,42 s (2,99) |

- **Kallet er nesten hele ventetiden** ved 500 og 5 000 personer (ved 5 000:
  3,8 s, 2,4 s og 1,7 s). Visningen etter svaret tar 5–35 ms.
- Et **gjentatt søk** svarer på 5–90 ms (komponenten husker svaret), og
  **rask skriving** gir ett kall per pause.
- **Riktig i alle 144 radene:** treffene er de samme personene, i samme
  rekkefølge, som databasen gir direkte (sammenlignet ved brukernavnet, fordi
  navnene går igjen ved 5 000 personer; kontrollert på nytt slik for alle
  søkene ved 5 000 på rask profil); en feil fra databasen gir en feilmelding; et svar
  som kommer 2 s for sent på et gammelt søk, vises aldri over det nye.

### Personsøket i databasen

`EXPLAIN (ANALYZE, BUFFERS)`, median av fem, søket «johanssen» (skrivefeil):

| Funksjon | Hvem | 50 | 500 | 5 000 |
| --- | --- | --- | --- | --- |
| `sok_gruppekandidater` | systemarkitekt | 62 ms | 600 ms | 6,2 s |
| `sok_medlemskandidater` | systemarkitekt | 40 ms | 318 ms | 3,2 s |
| `sok_medlemskandidater` | lokal administrator | 25 ms | 160 ms | 1,8 s |
| `sok_direktemottakere` | vanlig medlem | 26 ms | 236 ms | 2,7 s |

Tiden vokser rett med antall personer (om lag ti ganger fra 500 til 5 000)
og er like stor når søket ikke har noen treff: hele kandidatmengden
sammenlignes ord for ord før de 20 beste velges. `sok_medlemskandidater` leser
~237 000 blokker ved 5 000 personer.

### Hva leveransene måles mot

Arbeidsmålet i planen er minst 25 % kortere median der ventetiden er
dokumentert. Konkret, med de samme dataene og innstillingene:

| Leveranse | Måles på | Utgangspunkt (median) | Mål |
| --- | --- | --- | --- |
| A (#501) appskall | `skall`/`forside`, kald og varm, treg | 2,80 s / 1,92 s | ≤ 2,1 s / ≤ 1,45 s, og mindre kode før skallet enn 733 kB |
| A (#501) første handling | `fagsok_svar`, kald og varm, treg | 13,3 s / 12,3 s | ≤ 10 s / ≤ 9,2 s, uten feil treff |
| B (#502) personsøk | svaret og p95, 500 og 5 000 personer | tabellen over | ≥ 25 % lavere median og p95 ved 5 000; samme treff og rekkefølge |
| B (#502) Brukere | `brukere`, 500 og 5 000, rask | 715 ms / 5,0 s | ≤ 540 ms / ≤ 3,75 s |
| C (#503) fagside | `fagside_innhold`, direkte lenke, treg | 2,94 s | ≤ 2,2 s (sammen med A) |
| C (#503) referanser | referanser som får nytt nummer | 31 av 32 | 0 |
| #504 bakgrunn | kall før `skall`, kald, rask | 27 (39 treg) | færre, uten at varsler eller tilgang blir senere |

Overgangene som alt er raske (fortolkning, fagside fra forsiden og
fagmiljøbytte på rask profil), skal ikke bli tregere.

## Etter leveransene

Hver leveranse måles før og etter på samme maskin, med de samme dataene og
innstillingene som over. Rådataene ligger i prosjektmappa, ikke i repoet.

### B (#502) personsøk og Brukere

`20261120090000_personsok_ytelse.sql`, målt 20.11.2026 (før: kode lik `main`,
etter: med migrasjonen; `YTELSE_SCENARIER=personsok,brukere,sql`). Median
(p95), fra siste tastetrykk til svaret står:

| Søket, 5 000 personer | Rask: før → etter | Treg: før → etter |
| --- | --- | --- |
| Gruppeinvitasjon, første søk | 4,07 s (4,30) → 693 ms (747) | 3,83 s (4,03) → 730 ms (923) |
| Gruppeinvitasjon, skrivefeil | 4,83 s (6,52) → 757 ms (776) | 4,71 s (4,98) → 809 ms (838) |
| Gruppeinvitasjon, tomt treff | 4,26 s (6,50) → 735 ms (808) | 4,52 s (4,68) → 715 ms (986) |
| «Legg til medlem», første søk | 2,44 s (2,60) → 358 ms (600) | 2,51 s (2,92) → 425 ms (455) |
| «Legg til medlem», skrivefeil | 2,65 s (2,92) → 387 ms (431) | 2,99 s (3,37) → 552 ms (569) |
| «Legg til medlem», tomt treff | 2,62 s (2,87) → 378 ms (407) | 2,81 s (3,27) → 526 ms (542) |
| Ny direktemelding, første søk | 1,72 s (2,04) → 423 ms (450) | 1,89 s (2,06) → 472 ms (557) |
| Ny direktemelding, skrivefeil | 2,24 s (2,58) → 462 ms (529) | 2,34 s (3,32) → 523 ms (553) |
| Ny direktemelding, tomt treff | 1,93 s (2,01) → 437 ms (506) | 2,11 s (2,25) → 496 ms (513) |

- **75–86 % kortere median og p95** ved 5 000 personer; ved 500 personer
  34–55 % (rask) og 11–51 % (treg). Av det som er igjen, er 250 ms pausen
  etter siste tastetrykk.
- **«Brukere»** (systemarkitekt): 5 000 personer 4,92 s → 2,54 s (rask) og
  6,63 s → 4,45 s (treg); 500 personer 707 → 502 ms (rask). Ved 50 personer
  er forskjellen innenfor støyen (229–746 ms).
- **I databasen**, ved 5 000 personer: `sok_gruppekandidater` 1,6–5,4 s →
  0,39–0,54 s, `sok_medlemskandidater` 2,1–2,8 s → 0,1 s (systemarkitekt) og
  1,4–1,7 s → 21–25 ms (lokal administrator), `sok_direktemottakere`
  0,86–2,5 s → 0,16–0,22 s; blokkene som leses, fra 47 000–237 000 til
  under 3 400. Medlemslista: 4,8 s → 2,4 s (systemarkitekt) og 7,2 s → 3,3 s
  (lokal administrator).
- **De samme svarene:** alle søkene er riktige i alle radene før og etter, og
  140 søk (tre søk, fire roller, 20 søketekster, også æ, ø, å, aksenter og
  skrivefeil) og medlemslista for systemarkitekt og lokal administrator ga
  byte-identiske svar før og etter.

Hva som kostet: sammenligningen regnet ut bokstavtriplene i hver del av hvert
navn; søkene avgjorde for hver synlig person om hen kunne velges før de
sammenlignet; og `intern.administrerte_fagmiljoer`, som de fleste
tilgangsavgjørelsene bruker, ble planlagt på nytt ved hvert kall (en
SQL-funksjon som gir en mengde, kalt fra en annen funksjon, i Postgres 17).
Detaljene står i migrasjonen og i [fagmiljoer.md](fagmiljoer.md),
«Personsøket».

## Sluttkontrollen (#505)

Hele målingen kjørt på nytt 20.11.2026 med koden på `main` etter alle
leveransene (`91e23444`: A #516, B #515, C #513, #504 #514 og #525, og
diskusjonstrådene live #522, som ikke hører til planen), på samme maskin, med
de samme syntetiske dataene, profilene og fem gjentakelser. Hele rapporten,
med før og etter for hvert merke (`YTELSE_FOR`):
[docs/ytelse-maling-etter.md](ytelse-maling-etter.md). Median (p95), 500
personer der ikke annet står.

### Oppstart og første handling

| Merke | Kald, rask | Varm, rask | Kald, treg | Varm, treg |
| --- | --- | --- | --- | --- |
| `skall` = `forside` | 679 → 408 ms (−40 %) | 454 → 175 ms (−61 %) | 2,80 → 1,51 s (−46 %) | 1,92 → 1,01 s (−47 %) |
| `forside_tittel` | 801 → 544 ms (−32 %) | 588 → 206 ms (−65 %) | 2,80 → 1,51 s (−46 %) | 1,92 → 1,01 s (−47 %) |
| `forside_paneler` | 1,05 → 0,82 s (−22 %) | 1,02 → 0,50 s (−51 %) | 3,64 → 2,56 s (−30 %) | 2,89 → 2,08 s (−28 %) |
| `fagsok_svar` | 1,79 → 0,69 s (−62 %) | 1,06 → 0,95 s (−10 %) | 13,3 → 3,0 s (−77 %) | 12,3 → 3,8 s (−69 %) |

- **Kode før skallet:** 733 → 304 kB overført (2,46 → 1,02 MB utpakket) i
  kald oppstart; før panelene står 869 → 440 kB (2,92 → 1,47 MB).
- **Kall før skallet:** 27 → 24 (rask) og 39 → 27 (treg).
- p95 er like mye lavere: kald, treg 2,92 → 1,64 s for skallet og 13,6 →
  3,6 s for fagsøket.

### Fagsider

| Merke | Fra forsiden, rask | Fra forsiden, treg | Direkte lenke, rask | Direkte lenke, treg |
| --- | --- | --- | --- | --- |
| `fagside_navn` | 55 → 64 ms | 577 → 323 ms (−44 %) | 679 → 373 ms (−45 %) | 2,68 → 1,68 s (−37 %) |
| `fagside_innhold` | 139 → 162 ms | 866 → 616 ms (−29 %) | 708 → 450 ms (−36 %) | 2,94 → 1,93 s (−35 %) |
| `fagside_komplett` | (139) → 290 ms | (866) → 1,63 s | (708) → 632 ms | (2,94) → 3,06 s |

- **Referansene:** 31 av 32 fikk nytt nummer før; nå 0, i alle gjentakelser,
  begge profiler og begge veier inn. Listen vises én gang.
- **`fagside_komplett` er ikke sammenlignbar:** før kom merket før kallene
  til FEST og interaksjonene var startet; nå venter det på at alt er hentet.
  Det som er igjen, er rekkefølgen `les_stoff` → `les_legemidler` →
  `les_interaksjoner` (hver venter på den forrige), om lag 1 s på treg profil
  etter at innholdet står.
- Fra forsiden på rask profil er navnet og innholdet 9 og 23 ms senere: koden
  til fagsiden hentes nå når den trengs (45 kB) hvis appen ikke rakk å hente
  den mens den var ledig. På treg profil veier det mindre enn at appen ellers
  har mindre å gjøre.

### Andre overganger

| Overgang | Rask | Treg |
| --- | --- | --- |
| Forsiden → fortolkningen (søkefeltet / første treff) | 85 → 129 ms / 119 → 204 ms | 725 → 320 ms (−56 %) / 893 → 447 ms (−50 %) |
| Bytte fagmiljø: panelene | 398 → 339 ms (−15 %) | 1,01 → 1,04 s (+4 %) |
| Bytte fagmiljø: navnet | 112 → 288 ms | 412 → 904 ms |

- **Fortolkningen på rask profil** er 45–85 ms senere, fordi fagsøket nå
  gjøres klart i bakgrunnen i de samme sekundene (A, #501). Det er under det
  man merker, og på treg profil er den halvert.
- **Navnet ved fagmiljøbytte** var et feilsyn i målingen før: det nye navnet
  sto ett bilde over det forrige fagmiljøets katalog, og så ble siden tom
  til den nye katalogen var hentet (rettet i #525, fordi fortolkningen aldri
  skal vises med et annet fagmiljøs katalog). Nå står navnet og panelene
  sammen, og panelene, som er det brukeren kan bruke, kommer like tidlig
  eller tidligere.

### Personsøket og «Brukere»

Ved 5 000 personer er svaret 78–87 % raskere i alle tre søkene og begge
profiler (median og p95; gruppeinvitasjon 4,1 → 0,64 s, «Legg til medlem»
2,7 → 0,41 s, ny direktemelding 2,0 → 0,43 s, rask profil). Ved 500 personer
15–54 %. Treffene er de samme personene i samme rekkefølge som databasen gir
direkte i alle radene, også feil, sene svar og rask skriving. I databasen
(«johanssen», 5 000 personer): 1,8–6,2 s → 18–454 ms.

«Brukere»: 5 000 personer 5,0 → 2,5 s (rask) og 7,6 → 4,0 s (treg); 500
personer 715 → 542 ms (rask).
Ved 50 personer ble «Brukere» 216 → 322 ms (rask) og 619 → 796 ms (treg)
etter leveransene. Koden til vinduet hentes nå når den trengs (14 kB); for
dem som kan åpne det, hentes den derfor nå når appen er ledig (denne PR-en).
Det tok koden ut av klikket (286 og 757 ms, målt på nytt), men resten av
forskjellen er der fortsatt, og den har ingen lange oppgaver eller ekstra
kall: målingen åpner «Brukere» rett etter oppstarten, mens fagsøket hentes og
gjøres klart i bakgrunnen, og trolig er det det vinduet venter bak. Den som
åpner det noen sekunder etter innloggingen, venter ikke på det.

### Kontrollen av det som ble raskere

`npx vite-node src/__tests__/qa/ytelseskontroll.ts`, i det lokale testmiljøet
med de samme syntetiske dataene, treg profil der ikke annet står. Alle
punktene besto 20.11.2026:

| Punkt | Resultat |
| --- | --- |
| K1 Utlogging mens en fagside og FEST-svaret (3 s for sent) laster | Innloggingssiden; ingenting av fagsiden eller toppmenyen etter at de sene svarene kom |
| K2 Medlemskapet avsluttes mens appen laster | Appen stenger med beskjeden om avsluttet medlemskap etter 1,1 s; ingen fagside eller forside bak |
| K3 FEST svarer 3 s for sent | Referanselisten vises én gang, 0 referanser får nytt nummer, «Henter …» står til svaret kommer |
| K4 FEST feiler | 0 nye numre, og siden sier «Fikk ikke hentet preparatene» |
| K5 Direkte lenke til en seksjon (`#/stoff/…/interaksjoner`) | Seksjonen står åpen og i synsfeltet |
| K6 Koden til en side lar seg ikke hente (som etter en oppdatering) | Appen henter den på nytt, og gruppesiden vises i stedet for en tom side |
| K7 Fagsøket med tastaturet rett etter innlogging | Ctrl + K, navnet, pil ned og Enter åpner riktig fagside |
| K8 Mobil (412 px) | Ingen vannrett rulling på forsiden eller fagsiden |
| K9 Navnene på forsiden ved 5 000 personer | 1 000 av 5 004 profiler hentes; resten får navnet «Noen» (fantes før planen, #530) |

Ellers:

- **Innloggingsveggen:** byggingen kontrollerer at all kode som ikke er
  ført opp som åpen, ligger bak veggen (`scripts/kontroller-vegg.mjs`), og
  `veggkontroll.test.ts` prøver at den svarer 401 uten gyldig økt.
- **Fagmiljøbytte:** hvert bytte i målingen venter på det nye fagmiljøets
  navn og paneler (20 bytter, annenhver vei), og `fagmiljobytte.test.tsx`
  prøver at arbeidsflaten aldri vises med det forrige fagmiljøets katalog.
- **Kliniske verdier og omregninger:** fortolkningen er med fra start og ble
  ikke endret av leveransene; reglene og omregningene prøves i `npm test`.
  Referansenumrene: K3, K4 og målingen (0 nye numre).
- **Raske søk:** personsøket ga riktige treff i alle radene, også ved rask
  skriving og sene svar på et gammelt søk.
- De eksisterende nettleserkontrollene ble kjørt på nytt (listen står i
  PR-en).

### Uendret, tregere og videre arbeid

- **Ingen tiltak er fjernet:** hvert tiltak har en målbar gevinst der det
  var ment. Kostnadene er små og står over: fortolkningen på rask profil
  (+45–85 ms), fagsiden fra forsiden på rask profil (+9 og +23 ms) og
  «Brukere» ved 50 personer.
- **Målene i planen** er nådd, med ett unntak: «Brukere» ved 500 personer
  på rask profil ble 715 → 542 ms (−24 %), så vidt over målet på 540 ms.
- **Uendret:** fagmiljøbytte på treg profil (panelene 1,01 → 1,04 s, innenfor
  støyen), og fagsøket i varm oppstart på rask profil (−10 %, p95 uendret).
- **Videre arbeid:** rekkefølgen `les_stoff` → `les_legemidler` →
  `les_interaksjoner` på fagsidene (om lag 1 s av `fagside_komplett` på treg
  profil), og navnene ved over 1 000 synlige profiler (#530).
