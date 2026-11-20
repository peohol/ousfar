# Ytelsesmåling: utgangspunktet (P0)

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

Filene:

- `src/__tests__/qa/ytelse.ts`: scenariene, SQL-målingen og rapporten.
- `src/__tests__/qa/ytelsesmaler.js`: måleren i siden (merkene under).
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
| Personsøket | Fra siste tastetrykk til svaret står (treff, «Ingen treff.» eller feil), delt i pausen før kallet, kallet (nett og database) og visningen |

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
| `personsok` | Gruppeinvitasjon (systemarkitekt), «Legg til medlem» (systemarkitekt) og ny direktemelding (vanlig medlem), for hver personmengde: første søk, gjentatt søk, skrivefeil, aksenter og nordiske tegn, tomt treff, rask skriving, feil fra databasen, og et svar som kommer 2 s for sent mens et nytt søk er skrevet. Treffene sammenlignes med svaret databasen gir direkte |
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
- **Riktig i alle 144 radene:** treffene er de samme, i samme rekkefølge, som
  databasen gir direkte; en feil fra databasen gir en feilmelding; et svar
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
