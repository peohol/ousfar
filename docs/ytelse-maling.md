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
produksjonen. Hele kjøringen tar omtrent en time på testmaskinen.

| Miljøvariabel | Standard | Hva |
| --- | --- | --- |
| `YTELSE_UT` | midlertidig mappe | Rapporten (`ytelse-rapport.md`) og rådataene (`ytelse-malinger.json`) |
| `YTELSE_GJENTAKELSER` | 5 | Gjentakelser per scenario og profil |
| `YTELSE_PROFILER` | `rask,treg` | Profilene under |
| `YTELSE_SCENARIER` | alle | `kald,varm,fagside,direkte,fortolkning,fagmiljobytte,brukere,personsok,sql` |
| `YTELSE_PERSONER` | `50,500,5000` | Personmengdene for personsøket, «Brukere» og SQL-en; de andre scenariene bruker den midterste |
| `YTELSE_SQL_GJENTAKELSER` | 5 | Gjentakelser per SQL-kall (etter én oppvarming) |
| `YTELSE_FORTSETT` | av | Fortsetter en avbrutt kjøring i den samme `YTELSE_UT` |

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

Kjøringen 20.11.2026 med uendret app (resultatene følger).
