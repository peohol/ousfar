# Testplan for P7: gruppechat

Tråd D i P7. Planen prøver det kontrakten i [gruppechat.md](gruppechat.md)
lover: at bare de som leser gruppen, leser chatten, også gjennom direkte kall
og sanntiden; at tilgangen går tapt med en gang; at samtidige meldinger
verken forsvinner eller kommer to ganger; at chatten tåler frakobling; at den
kan brukes med tastatur, skjermleser og på smal skjerm; og at
personvernvalgene i [gruppechat-personvern.md](gruppechat-personvern.md)
står i appen slik de er beskrevet.

Dokumentet har tre deler: planen (avsnitt 1–6), fordelingen mellom trådene
(avsnitt 7) og rapporten fra sluttkontrollen (avsnitt 8), som fylles ut når
A–C er slått sammen. Planen endrer ikke kontrakten.

## 1. Grunnlaget

### Personene

Persongalleriet (`src/__tests__/hjelp/persongalleri.ts`) med fagmiljø A (OUS
Klinisk farmakologi) og B (OUS Rettstoksikologi, åpnet i testdatabasen).
Gruppene og rollene i dem lages i testene med de vanlige funksjonene
(`opprett_gruppe`, `inviter_til_gruppe`, `svar_paa_gruppeinvitasjon`), som i
`grupper.test.ts`.

| Person | Står for |
| --- | --- |
| `vanligA` | Medlem av gruppen GA i A |
| `adminA` | Ansvarlig i GA (lager gruppen) |
| `dobbeltAB` | Moderator i GA; aktiv i både A og B |
| `vanligB` | Medlem av den tverrfaglige gruppen `GT` |
| `redaktorRessursA` | Invitert til `GA`, ikke svart (her bare en vanlig bruker i A) |
| `adminB` | Lokal administrator i B, ikke med i GT |
| `systemarkitekt` | Systemarkitekt, ikke medlem av gruppene |
| `avsluttetA` | Medlemskapet i A avsluttet; aktiv i B |
| `utenMedlemskap` | Gyldig innlogging, ingen aktive medlemskap |

### Gruppene

| Navn | Hva |
| --- | --- |
| `GA` | Gruppe i fagmiljø A |
| `GB` | Gruppe i fagmiljø B, uten noen fra A |
| `GT` | Tverrfaglig gruppe (uten fagmiljø) med `vanligA` og `vanligB` |
| `GX` | Arkivert gruppe med meldinger fra før arkiveringen |

Bryteren slås på i testdatabasen
(`create or replace function intern.gruppechat_aktivert() ... select true`),
unntatt i testene av den avslåtte chatten.

### Testdataene

Bare syntetiske meldinger («Testmelding 1» …). Fødselsnumre til testene av
kontrollen lages i testen med kontrollsifrene (som
`src/__tests__/p7grunnmur.test.ts`); ingen gyldige numre står i repoet.

### Utfallene

- **Ingen tilgang**: `42501` med **samme tekst** som for en gruppe eller
  melding som ikke finnes. Verken meldinger, antall, tidspunkter, deltakere
  eller om chatten finnes, lekker gjennom feilen.
- **Ugyldig innhold**: `22023` (tom, for lang, ligner fødselsnummer).
- **For fort**: `54000`.

## 2. Akseptkriteriene

Kriteriene 1–10 i kontrakten, med testene som prøver dem.

| # | Kriterium | Test | Tråd |
| --- | --- | --- | --- |
| 1 | To medlemmer utveksler meldinger i sanntid | Integrasjon i det lokale testmiljøet; nettleserkontroll N1 | C, D |
| 2 | Et medlem kan ikke lese en annen gruppes meldinger, heller ikke med direkte kall | `gruppechat.test.ts` (alle funksjonene med `GB` som `vanligA`); `gruppechat.krysstest.test.ts` (direkte mot tabellene og sanntidstabellen) | A, D |
| 3 | Ulike fagmiljøer chatter i en tverrfaglig gruppe uten tilgang til lokale data | `gruppechat.test.ts` (`GT`); `gruppechat.krysstest.test.ts` (`vanligB` når ikke As fortolkning, grupper, varsler eller profiler utenfor `GT`) | A, D |
| 4 | Et medlem som fjernes mens chatten er åpen, mister tilgangen | Databasen: `gruppechat.test.ts`; klienten: testene for `useGruppechat`; nettleseren: N3 | A, C, D |
| 5 | Gyldig innlogging, avsluttet medlemskap: verken hente eller sende | `gruppechat.test.ts`; `gruppechat.krysstest.test.ts` (gruppe, fagmiljø og OUSFAR, med samme token) | A, D |
| 6 | En arkivert gruppe tar ikke imot nye meldinger | `gruppechat.test.ts` (`GX`); nettleser N4 | A, D |
| 7 | En frakoblet bruker får riktig historikk ved gjenoppkobling | Testene for `useGruppechat` og `tilstand.ts`; nettleser N5 | C, D |
| 8 | Samtidige meldinger uten tap eller duplikater | `gruppechat.samtidighet.test.ts` (ekte Postgres); fletting i `tilstand.ts` | A, C |
| 9 | Redigering og moderering følger rettighetene | `gruppechat.test.ts`; komponenttestene | A, B |
| 10 | Tastatur, mobil og skjermleser | Komponenttestene; nettleser N6–N8 | B, D |

## 3. Den negative matrisen

Hver rad prøves for hver funksjon i kontrakten (`les_gruppechat`,
`gruppechat_endringer`, `send_gruppemelding`, `endre_gruppemelding`,
`slett_gruppemelding`, `merk_gruppechat_lest`) og for `gruppeoversikt(...)
.samhandling.chat_uleste`.

| Hvem | Gruppe | Ventet |
| --- | --- | --- |
| `vanligA` | `GB` | Ingen tilgang, samme svar som en gruppe som ikke finnes |
| `redaktorRessursA` (invitert) | `GA` | Ingen tilgang |
| `adminB` (lokal admin, ikke med) | `GT` | Ingen tilgang |
| `vanligA` etter at `adminA` har fjernet hen fra gruppen | `GA` | Ingen tilgang med samme token |
| `vanligA` etter at medlemskapet i A er avsluttet i testen (`avsluttMedlemskap`) | `GA` | Ingen tilgang med samme token; tilgangen kommer tilbake om medlemskapet blir aktivt igjen |
| `avsluttetA` | `GA` | Ingen tilgang; kan heller ikke inviteres |
| `utenMedlemskap` | alle | Ingen tilgang |
| `systemarkitekt` | `GA`, `GB`, `GT` | Leser og skriver i aktive grupper |
| `systemarkitekt` | `GX` | Leser og kan slette en melding; kan verken skrive eller endre |
| `adminA` (ansvarlig) og `dobbeltAB` (moderator) | `GX` | Kan verken skrive, endre eller slette |
| alle | med bryteren av | `42501` «Gruppechatten er ikke slått på.» |
| `vanligA` | melding-ID fra `GB` | Endre og slette gir samme svar som en melding som ikke finnes |
| `vanligA` | annen brukers melding i `GA` | Kan ikke endre eller slette |
| `dobbeltAB` (moderator) | annen brukers melding i `GA` | Kan slette, ikke endre |

### Direkte i tabellene (som `authenticated`, i krysstesten)

| Hva | Ventet |
| --- | --- |
| `select`, `insert`, `update`, `delete` på `gruppemeldinger` og `gruppechat_lest` | Ingen rader, avvist |
| `select` på `gruppechatter` for en gruppe man ikke leser, eller med bryteren av | Ingen rader |
| `insert`, `update`, `delete` på `gruppechatter` | Avvist |
| `select` på `varsler` med `gruppechat`-varsel fra en gruppe man er fjernet fra | Ingen rader |
| Kall til `intern.*` | Avvist |

### Sanntiden

| Hva | Ventet |
| --- | --- |
| Abonnement på `gruppechatter` for en gruppe man ikke leser | Ingen hendelser |
| Abonnent som fjernes fra gruppen | Ingen hendelser etter fjerningen |
| Innholdet i en hendelse | Bare `gruppe_id`, `siste_nr`, `siste_endring`, `endret_kl`; ingen tekst eller avsender |
| Publikasjonen `supabase_realtime` | Bare `gruppechatter` av chattabellene |

## 4. Personvernvalgene

Hvert valg i `gruppechat-personvern.md` som kan prøves, har en test.

| Valg | Prøves |
| --- | --- |
| Lagringstid 12 måneder | `gruppechat.test.ts`: en melding med `skrevet_kl` satt tilbake er borte fra lesingen og ryddet ved neste sending eller lesing, `siste_nr` står (A) |
| Endring lagrer ikke den gamle teksten | Ingen kolonne eller tabell med tidligere tekst; krysstesten sjekker at teksten bare finnes ett sted (D) |
| Sletting fjerner teksten med en gang | `tekst` er `null` etter `slett_gruppemelding`, både for forfatter og moderator (A) |
| Fødselsnummer avvises | Gyldig nummer, D- og H-nummer, med mellomrom og punktum: avvist; ugyldig kontrollsiffer: godtatt (A, grunnmuren) |
| Ingen tekst i varsler, logger og feil | Krysstesten: etter sending, endring og sletting finnes meldingsteksten ikke i `varsler`, `tilgangslogg` eller feilmeldingene (D) |
| Hvem som leser | `lesere` i `les_gruppechat` stemmer med de aktive medlemmene; teksten står øverst i chatten (A, B) |

## 5. Samtidighet

Mot ekte Postgres (`OUSFAR_POSTGRES_URL`, `src/__tests__/hjelp/ektepostgres.ts`).

| Hva | Ventet | Tråd |
| --- | --- | --- |
| Mange samtidige sendinger fra flere brukere | `nr` og `endring` uten hull eller duplikater | A |
| Samme `klient_id` sendt samtidig | Én melding | A |
| Sending samtidig med fjerning fra gruppen | Enten sendt før fjerningen, eller avvist; aldri sendt etter | A |
| Sending samtidig med arkivering | Enten sendt før arkiveringen, eller avvist | A |
| Sletting samtidig med endring | Meldingen ender slettet, uten tekst | D (krysstest), om A ikke dekker den |

## 6. Nettleserkontrollen (D3)

I det lokale testmiljøet (`apneTestmiljo()`, `docs/qa-testmiljo.md`), med
sanntiden slått på (tråd C) og bryteren slått på i den lokale databasen.
Aldri mot produksjonen. Syntetiske brukere fra persongalleriet.

| # | Hva | Ventet |
| --- | --- | --- |
| N1 | To brukere i hver sin nettleser skriver til hverandre | Meldingen kommer fram hos den andre uten omlasting |
| N2 | En bruker leser eldre meldinger mens den andre skriver | Lista står stille; «N nye meldinger» vises |
| N3 | Brukeren fjernes fra gruppen mens chatten står åpen | «Du har ikke lenger tilgang til denne gruppen.», meldingene borte, innen ett minutt |
| N4 | Gruppen arkiveres | Medlemmene mister tilgangen (en arkivert gruppe leses bare av systemarkitektene); systemarkitekten ser historikken uten skrivefelt, med «Gruppen er arkivert» |
| N5 | Nettverket av, den andre skriver, nettverket på | Meldingene fra mens man var borte kommer, i riktig rekkefølge og uten duplikater |
| N6 | Hele flyten med tastatur | Enter sender, Shift+Enter gir ny linje, menyen på egne meldinger nås med tastatur, fokus forsvinner ikke |
| N7 | Smal skjerm (390 × 844) med berøring | Ingen vannrett rulling; Enter gir ny linje, Send-knappen sender |
| N8 | Navnene skjermleseren leser | Lista er `role="log"`; feltet har navn og regelen som beskrivelse; avsender og tid leses for hver melding |
| N9 | Tekst med et syntetisk fødselsnummer | Advarselen vises mens man skriver; sendingen avvises med `PASIENTREGEL.avvist` |
| N10 | Varselet om nye meldinger | «Nye meldinger i <gruppe>», uten tekst; et trykk åpner chatfanen |

## 7. Fordelingen

| Tråd | Tester |
| --- | --- |
| A | `src/__tests__/gruppechat.test.ts`, `gruppechat.samtidighet.test.ts`; avsnitt 3 (funksjonene), 4 og 5 |
| B | Komponenttestene for `Gruppechat*.tsx` med testchatten; kriterium 9 og 10 i appen |
| C | Testene for `tilstand.ts` og `useGruppechat`; integrasjonen i det lokale testmiljøet (kriterium 1, 4, 7) |
| D | `src/__tests__/gruppechat.krysstest.test.ts` (avsnitt 3 direkte og sanntiden, 4 der det står D, 5 der A ikke dekker); nettleserkontrollen i avsnitt 6; rapporten i avsnitt 8 |

Felles for alle: `fortolkningUendret.test.ts` grønn (ingen kliniske regler
eller resultater endret), `npm test`, `npm run typecheck`, `npm run build`.

## 8. Rapport fra sluttkontrollen

**Forkontroll** 17.11.2026, mot C2-grenen (`1d8b5c3`: A1 og C1 slått sammen,
B1 og C2 til kontroll), i det lokale testmiljøet med sanntiden og bryteren
på. Den endelige kontrollen kjøres på nytt når B1 og C2 er slått sammen, og
denne rapporten oppdateres da.

### Krysstestene (`gruppechat.krysstest.test.ts`)

16 grønne. De dekker:

- Den negative matrisen samlet for alle inngangene (de seks funksjonene,
  `gruppeoversikt` og chatraden): medlem i A mot gruppe i B, lokale
  administratorer utenfor gruppen (også i den tverrfaglige), invitert,
  avsluttet i A, dobbeltmedlem utenfor gruppen i B. Alle får nøyaktig det samme
  svaret som for en gruppe og en melding som ikke finnes. En melding fra en
  annen gruppe kan verken endres eller slettes, heller ikke av en moderator.
  Den uten aktivt medlemskap stoppes i alle gruppene før gruppen slås opp.
  Systemarkitekten leser og skriver i gruppene i begge fagmiljøene og den
  tverrfaglige.
- Tabellene direkte: `select`, `insert`, `update` og `delete` på
  `gruppemeldinger` og `gruppechat_lest`, og skriving i `gruppechatter`, avvises
  for medlem, ansvarlig, moderator, systemarkitekt og et medlem fra B, og
  tabellene er uendret etterpå. Ingen funksjon i `intern` kan kjøres fra
  nettleseren. Uten innlogging: ingen tilgang.
- Teksten bare ett sted: et søk i hver tekst- og JSON-kolonne i hele databasen
  finner meldingsteksten bare i `gruppemeldinger.tekst` etter sending (også når
  varslene er laget), og ingen steder etter endring (den gamle teksten) eller
  sletting (av forfatter og moderator). En avvist melding (fødselsnummer, for
  lang) står ingen steder, og feilen gjentar ikke teksten.
- Tilgangen følger medlemskapet med den samme innloggingen: borte når
  medlemskapet i fagmiljøet avsluttes, tilbake når det blir aktivt igjen. Et
  medlem fra B i den tverrfaglige gruppen ser verken gruppene, oversikten eller
  varslene fra gruppene i A.
- Samtidighet (avsnitt 5) er dekket av A i `gruppechat.samtidighet.test.ts`,
  også sletting samtidig med endring.

### Nettleserkontrollen (`src/__tests__/qa/gruppechatnettleser.ts`)

| # | Utfall | Merknad |
| --- | --- | --- |
| N1 | OK | Fram hos den andre på 0,2–0,7 s, uten omlasting |
| N2 | OK | Lista står stille øverst; «2 nye meldinger» tar ned igjen |
| N3 | OK | Stengt hos den fjernede etter 56 s (livstegnet), meldingene borte |
| N4 | OK | Medlemmets åpne chat stengt etter 46 s; systemarkitekten ser historikken uten skrivefelt, med «Gruppen er arkivert» |
| N5 | OK | Meldingene fra mens nettet var av kom 0,2 s etter, i rekkefølge og uten duplikater |
| N6 | OK | Enter sender, Shift+Enter ny linje, fokus blir i feltet; menyen på egen melding nås med Shift+Tab, Escape gir fokus tilbake |
| N7 | OK | 390 × 844 med berøring: ingen vannrett rulling; Enter gir ny linje, Send sender |
| N8 | OK | `role="log"` med navn; feltet beskrives av regelen og tastehjelpen; avsender og tid ved hver melding |
| N9 | OK | Advarselen mens man skriver; sendingen avvises med `PASIENTREGEL.avvist` og når aldri den andre |
| N10 | OK | Varselet nevner bare gruppen, uten tekst og avsender; et trykk åpner chatfanen |

### Funn

- **Liten tekstfeil (B):** i en arkivert gruppe står det «Leses av de 0
  medlemmene i gruppen og av systemarkitektene i OUSFAR». Bedre: bare
  systemarkitektene når ingen medlemmer leser.
- Ellers ingen funn. Kontrakten sier at en arkivert gruppe bare leses av
  systemarkitektene; N4 er rettet til det (planen sa først at historikken står
  for alle).
