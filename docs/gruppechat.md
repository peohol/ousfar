# Gruppechat (P7)

Leses før noe ved gruppechatten endres. Oppdraget er Peders bestilling av P7
(17.11.2026) under planen [#364](https://github.com/peohol/ousfar/issues/364)
(§10 P7), og fremdriften føres i [#369](https://github.com/peohol/ousfar/issues/369).
Gruppene chatten bygger på, står i `docs/fagmiljoer.md` («Gruppene», «Idéer og
oppgaver i gruppene»), varslene i `docs/varsler.md`, og den varige regelen om
pasientopplysninger i `docs/pasientopplysninger.md`.

Dokumentet er delplanen fra P7.0 og den felles kontrakten trådene A–E bygger
på: modellen, rettighetene, grensesnittene og filansvaret. Hver tråd fører sin
del inn i avsnittet sitt her når den er levert, og endrer ikke de andres
avsnitt eller kontrakten uten å avklare det med P7-tråden.

## Mål

- Hver gruppe har ett chatrom, som en fane på gruppesiden.
- Meldingene står i rekkefølge med avsender og tidspunkt, nye kommer uten at
  siden lastes på nytt, og historikken står når man kommer tilbake.
- Bare de som leser gruppen i dag, leser chatten. Tilgangen håndheves av
  databasen, både i funksjonene og i sanntidskanalen, og går tapt med en gang
  medlemskapet i gruppen eller fagmiljøet avsluttes.
- Ingen pasientopplysninger: regelen står ved skrivefeltet, og databasen
  avviser tekst som ser ut som et fødselsnummer.

Ikke med i første versjon: privatmeldinger, lyd og video, tråder i chatten,
reaksjoner, omtaler (@navn), filvedlegg (P8), søk i chatten og eksport.

## Peders rammer

- **Pasientopplysninger er forbudt i hele OUSFAR** (Peder 17.11.2026), også
  pseudonymiserte og kasuistikker som kan knyttes til enkeltpersoner
  (`docs/pasientopplysninger.md`).
- **D6/S5.** Personvernvurderingen for chatten står i
  `docs/gruppechat-personvern.md` (tråd D). Chatten er **avslått**
  (`intern.gruppechat_aktivert()` gir `false`) til Peder har godkjent at den
  slås på. Aktiveringen er en egen, liten migrasjon som viser til godkjenningen.
- **Lagringstid: 12 måneder** (Peder 17.11.2026, beslutningskort). En melding
  eldre enn 12 måneder slettes helt (raden fjernes) og kan ikke hentes
  tilbake. Det er Peders uttrykkelige ja til denne automatiske slettingen;
  den gjelder bare gruppemeldinger (tråd A, se «Lagringstiden»).

## Det som finnes og gjenbrukes

| Behov | Finnes i dag | Hvordan P7 bruker det |
| --- | --- | --- |
| Hvem leser og skriver i gruppen | `intern.kan_lese_gruppe`, `intern.kan_bidra_i_gruppe`, `intern.kan_moderere_gruppe`, `public.mine_lesbare_grupper()` | De samme, ingen ny tilgangsmodell. Arkivert gruppe: bare lesing for systemarkitektene |
| Gruppesiden og fanene | `Grupperside.tsx`, `GRUPPEFANER` i `src/domain/rute.ts`, `gruppeoversikt(gruppe).samhandling` | Ny fane `chat` med tallet på uleste |
| Varsler | `intern.varsle`, `varselkategori`, ett ulest varsel per nøkkel | Ny kategori `gruppechat`, ett ulest varsel per gruppe, uten meldingstekst |
| Profilkort | `Profilkort` (`@delt/profil`) | Avsenderen i hver melding |
| Lokalt testmiljø | `apneTestmiljo()` (`docs/qa-testmiljo.md`) | Sanntiden må slås på der (tråd C) |
| Sanntid | Ingen i dag (P0 §2.8) | Ny: én dørklokke-tabell i `supabase_realtime` |

## Rettighetene

| Hvem | Lese | Skrive | Endre og slette egne | Slette andres | Se hvem som leser |
| --- | --- | --- | --- | --- | --- |
| Medlem | ja | ja | ja | nei | ja |
| Moderator | ja | ja | ja | ja | ja |
| Ansvarlig | ja | ja | ja | ja | ja |
| Systemarkitekt | ja, alle grupper | ja, i aktive grupper | ja | ja, også i arkiverte | ja |
| Invitert, fjernet, utenfor gruppen | nei | nei | nei | nei | nei |

- *Lese* er `intern.kan_lese_gruppe`, *skrive* `intern.kan_bidra_i_gruppe`,
  *slette andres* `intern.kan_moderere_gruppe`. Alt krever aktivt medlemskap i
  OUSFAR og, for en gruppe i et fagmiljø, i fagmiljøet.
- **Arkivert gruppe:** ingen nye meldinger og ingen endringer, heller ikke for
  systemarkitektene; de kan lese den som før. **Unntak:** en systemarkitekt
  kan slette en melding også i en arkivert gruppe, så noe som ikke hører
  hjemme der (som pasientopplysninger), kan fjernes uten å åpne gruppen igjen
  (`docs/pasientopplysninger.md`, hendelser).
- **Endre:** forfatteren, så lenge gruppen er aktiv. Endringen erstatter
  teksten, merkes «redigert», og den gamle teksten lagres ikke.
- **Slette:** forfatteren og moderatorene. Teksten fjernes i databasen med en
  gang (settes til `null`); meldingen står som «Meldingen er slettet» eller
  «Fjernet av en moderator», med hvem og når, så samtalen henger sammen.
- **Utenfor gruppen** får verken meldinger, antall, tidspunkter, deltakere
  eller om chatten finnes. Funksjonene svarer som for en gruppe som ikke
  finnes (`42501` med samme tekst), og sanntidskanalen gir ingenting.
- Systemarkitektene beholder myndigheten fra P6: de leser alle gruppene og
  kan moderere. Lokale administratorer som ikke er med, ser ingenting.

## Modellen (tråd A)

Tre tabeller i `public`, med radsikkerhet og uten rettigheter for nettleseren
utenom det som står:

**`gruppemeldinger`** — én rad per melding.

| Kolonne | Type | Merknad |
| --- | --- | --- |
| `id` | uuid | primærnøkkel |
| `gruppe_id` | uuid | `grupper`, kan ikke endres |
| `nr` | bigint | løpenummer i gruppen, 1, 2, 3 …, satt under låsen; rekkefølgen |
| `forfatter_id` | uuid null | `profiles`, `on delete set null` (meldingen står) |
| `klient_id` | uuid | fra nettleseren; unik per (gruppe, forfatter) — dobbeltinnsending gir samme melding |
| `tekst` | text null | 1–`MAKS_TEGN` tegn etter trimming; `null` når slettet |
| `skrevet_kl` | timestamptz | serverens tid |
| `redigert_kl` | timestamptz null | siste endring av teksten |
| `slettet_kl`, `slettet_av` | timestamptz null, uuid null | hvem som slettet |
| `endring` | bigint | gruppens endringsteller da raden sist ble endret (se under) |

**`gruppechatter`** — én rad per gruppe som har en chat: `gruppe_id`
(primærnøkkel), `siste_nr`, `siste_endring`, `endret_kl`. Raden er **låsen**
alle skriveoperasjoner tar (`for update`), og **dørklokken** sanntiden lytter
på. Den inneholder ingen tekst og ingen avsender.

**`gruppechat_lest`** — (`gruppe_id`, `bruker_id`) → `lest_til_nr`. Tallet på
uleste og varslene bygger på den.

**Endringstelleren.** Hver skriving (ny melding, endring, sletting) øker
`gruppechatter.siste_endring` med én og setter den nye verdien i meldingens
`endring`. Alt som har skjedd siden et tidspunkt, er da meldingene med
`endring > x`. Det gir gjenoppkobling, oppdatering av redigerte og slettede
meldinger og rekkefølge uten egne hendelser. `nr` sier rekkefølgen meldingene
vises i; `endring` sier hva klienten har sett.

**Radsikkerhet.** `gruppemeldinger` og `gruppechat_lest` kan ikke leses
direkte; alt går gjennom funksjonene. `gruppechatter` kan leses (`select`) av
`authenticated` for grupper i `mine_lesbare_grupper()`, og bare når chatten er
aktivert — det er dette sanntiden sjekker for hver hendelse.

## Funksjonene (tråd A)

Alle er `security definer`, krever aktivt medlemskap, tar gruppens
chatrad med `for update` (eller `for share` der det holder) når de skriver,
og står i `funksjonskontroller.ts`. Mens chatten er avslått, svarer alle med
`42501` og teksten «Gruppechatten er ikke slått på.».

| Funksjon | Svarer |
| --- | --- |
| `les_gruppechat(gruppe uuid, for_nr bigint default null, antall int default 50)` | `Chatside`: de siste `antall` (høyst 100) meldingene før `for_nr` (uten: de nyeste), stigende etter `nr`; `flere_eldre`; `siste_endring`; `lest_til_nr`; `kan_skrive`; `kan_moderere`; `lesere`; `grenser` |
| `gruppechat_endringer(gruppe uuid, etter bigint, antall int default 200)` | `Chatendringer`: meldingene med `endring > etter`, stigende etter `endring`, høyst `antall`; `siste_endring`; `flere` (det er mer å hente) |
| `send_gruppemelding(gruppe uuid, klient_id uuid, tekst text)` | `Gruppemelding`. Samme `klient_id` på nytt gir den samme meldingen, ikke en ny |
| `endre_gruppemelding(melding uuid, tekst text)` | `Gruppemelding` |
| `slett_gruppemelding(melding uuid)` | `Gruppemelding` (slettet; idempotent) |
| `merk_gruppechat_lest(gruppe uuid, til_nr bigint)` | `void`. Flytter bare framover; kaller `intern.merk_gruppechat_varsler_lest` |

`gruppeoversikt(gruppe).samhandling` får `chat_uleste` (antall meldinger fra
andre etter `lest_til_nr`, `null` når chatten er avslått), til tallet på fanen.

**Vaktene i `send_gruppemelding` og `endre_gruppemelding`**, i denne
rekkefølgen, med norske feilmeldinger:

1. Tom tekst eller over `MAKS_TEGN` (4000) tegn: `22023`.
2. `intern.krev_uten_personnummer(tekst)` (grunnmuren): `22023` med
   `PASIENTREGEL.avvist`.
3. Takten: høyst `MAKS_PER_MINUTT` (20) nye meldinger per bruker og gruppe
   siste 60 sekunder: `54000` «Du sender meldinger for fort. Vent litt og
   prøv igjen.». En gjentatt `klient_id` teller ikke.

Grensene står i `GRUPPECHAT_GRENSER` (`src/gruppechat/modell.ts`) og i
`les_gruppechat(...).grenser`; databasen er fasit, appen viser dem.

**Lagringstiden.** Meldinger med `skrevet_kl` eldre enn 12 måneder
(`intern.gruppechat_lagringstid()`, `interval '12 months'`) slettes helt.
Ryddingen gjøres i databasen uten ekstern jobb: `send_gruppemelding` og
`les_gruppechat` sletter de utgåtte i gruppen de gjelder, under gruppens lås,
og en egen funksjon for alle grupper (`intern.rydd_gruppechat()`) kan kjøres
av utrullingen eller en planlagt jobb senere. Funksjonene leser heller aldri
ut en utgått melding, så den er borte for brukerne fra fristen selv om raden
ennå ikke er ryddet. `siste_nr` og `siste_endring` står, så rekkefølgen og
endringene ikke brytes. Varslene peker bare på ID-er og viser ikke en melding
som er borte.

**Logging.** Meldingsteksten skrives aldri i tilgangsloggen, i `raise`-tekster
eller i varsler. Slettingen lagrer hvem og når på meldingen selv.

## Formen på svarene

Typene står i `src/gruppechat/modell.ts` (grunnmuren) og leses med
`lesChatside`, `lesChatendringer` og `lesGruppemelding`, som gjør verdier uten
formen tomme i stedet for å velte visningen.

```ts
interface Gruppemelding {
  id: string
  nr: number
  endring: number
  forfatter: Profilkort | null // null når kontoen er slettet
  tekst: string | null         // null når meldingen er slettet
  skrevet_kl: string
  redigert_kl: string | null
  slettet: null | { av: 'forfatter' | 'moderator'; kl: string }
  egen: boolean
  klient_id: string | null     // bare på egne meldinger, ellers null
  kan_endre: boolean
  kan_slette: boolean
}

interface Chatside {
  meldinger: Gruppemelding[] // stigende etter nr
  flere_eldre: boolean
  siste_endring: number
  lest_til_nr: number
  kan_skrive: boolean
  kan_moderere: boolean
  lesere: { medlemmer: number; systemarkitekter: boolean }
  grenser: { maks_tegn: number; maks_per_minutt: number }
}

interface Chatendringer {
  meldinger: Gruppemelding[] // stigende etter endring
  siste_endring: number
  flere: boolean
}
```

## Sanntiden (tråd C)

**Dørklokke, ikke innhold.** Klienten abonnerer på `postgres_changes`
(`UPDATE`) på `public.gruppechatter` med filteret `gruppe_id=eq.<ID>`. Supabase
sjekker radsikkerheten for hver hendelse og hver abonnent, så den som har
mistet tilgangen, får ikke flere hendelser. Hendelsen sier bare at noe har
endret seg; klienten henter selv med `gruppechat_endringer(gruppe,
siste_endring)`, som kontrollerer tilgangen på nytt. Ingen meldingstekst går
gjennom sanntidstjenesten.

- **Gjenoppkobling:** ved ny tilkobling, når fanen blir synlig igjen og når
  nettleseren er på nett igjen, henter klienten endringene siden
  `siste_endring`. Er det mer enn `antall`, henter den til `flere` er usann.
- **Livstegn:** mens chatten står åpen, henter klienten endringene minst hvert
  60. sekund, også uten hendelser. Svarer databasen `42501`, viser chatten
  «Du har ikke lenger tilgang til denne gruppen.», tømmer meldingene og
  stopper abonnementet.
- **Rekkefølge og duplikater:** meldingene holdes i et kart etter `id`; en
  versjon med høyere `endring` erstatter en med lavere, og visningen sorteres
  etter `nr`. En sendt melding står som ventende (med `klient_id`) til svaret
  eller endringene har den, og flettes da sammen etter `klient_id`. Derfor har
  funksjonene `klient_id` på den innloggedes egne meldinger (og `null` på
  andres, så ingen andre ser den).
- **Feil ved sending:** den ventende meldingen står med «Ikke sendt», feilen
  fra databasen og «Prøv igjen» (samme `klient_id`) og «Forkast».

Publikasjonen: migrasjonen til tråd C legger `public.gruppechatter` i
`supabase_realtime`. Ingen andre tabeller.

## Varslene (tråd C)

Ny kategori `gruppechat` (gruppen «Grupper», kan slås av, på som standard).
Én ny melding gir de andre som leser gruppen ett varsel med nøkkelen
`gruppechat:<gruppe-ID>`, med `gruppe_id` satt, så den som mister tilgangen,
ikke ser det. Uleste legges i det samme varselet (bare antall og siste
tidspunkt, aldri tekst eller avsendere ut over ID-ene som lagres). Teksten i
varselet er «Nye meldinger i <gruppe>», og et trykk åpner chatfanen.
`merk_gruppechat_lest` merker varselet lest (gjennom
`intern.merk_gruppechat_varsler_lest`, som grunnmuren lager tom og tråd C
fyller). Endringer og slettinger varsler ingen.

## Brukerflaten (tråd B)

- Fanen **Chat** på gruppesiden (`#/grupper/<ID>/chat`), med tallet på uleste,
  vises bare når `samhandling.chat_uleste` ikke er `null`.
- Øverst: hvem som kan lese chatten («Leses av de N medlemmene i gruppen og
  av systemarkitektene i OUSFAR.»), og regelen om pasientopplysninger
  (`Pasientregel`).
- Meldingene i en liste (`role="log"`), gruppert etter dag, med avsender og
  klokkeslett; egne meldinger kan endres og slettes fra en liten meny.
- Står brukeren nederst, følger lista nye meldinger. Har hen rullet opp,
  står lista stille, og en knapp «N nye meldinger» tar hen ned. Eldre
  meldinger hentes når man ruller til toppen eller trykker «Vis eldre», og
  plasseringen i lista beholdes.
- Skrivefeltet: Enter sender, Shift+Enter gir ny linje; på berøringsskjerm
  gir Enter ny linje og Send-knappen sender. Utkastet bevares (`useBevart`).
  `Pasientvarsel` viser en advarsel mens teksten ligner et fødselsnummer.
- En arkivert gruppe viser historikken uten skrivefelt, med «Gruppen er
  arkivert».

`useGruppechat(gruppe)` (tråd C) gir det visningen trenger, med typen
`Gruppechat` i `src/gruppechat/modell.ts`. Tråd B bygger mot den og mot
testchatten i `src/__tests__/hjelp/testchat.ts`, uavhengig av A og C.

## Grunnmuren (P7.0)

`supabase/migrations/20261117125500_p7_grunnmur.sql`, prøvd i
`src/__tests__/p7grunnmur.test.ts`. Ingen atferdsendring og ingenting
nettleseren kan kalle.

| Del | Hva | Brukes av |
| --- | --- | --- |
| `intern.gruppechat_aktivert()` | `false` til Peder har godkjent aktiveringen | A, C |
| `intern.ligner_personnummer(tekst)` | Sant når teksten har et gyldig fødsels-, D- eller H-nummer (11 sifre med kontrollsifre, også med mellomrom eller punktum etter de seks første) | A, D |
| `intern.krev_uten_personnummer(tekst)` | Kaster `22023` med `PASIENTREGEL.avvist` | A |
| `intern.merk_gruppechat_varsler_lest(gruppe, bruker, til_nr)` | Tom; tråd C fyller den med samme signatur | A kaller, C fyller |
| `@delt/pasientopplysninger` | `PASIENTREGEL` (tekstene) og `lignerPersonnummer`, de samme reglene som SQL-en; en test holder dem like | B, D |
| `src/components/Pasientregel.tsx` | `Pasientregel` (den korte regelen) og `Pasientvarsel` (advarsel når teksten ligner et fødselsnummer) | B, D |
| `src/gruppechat/modell.ts` | Typene over, lesefunksjonene, `GRUPPECHAT_GRENSER`, `Gruppechat` | A, B, C |
| `src/gruppechat/api.ts` | Kallene til funksjonene over | C |
| `src/__tests__/hjelp/testchat.ts` | En `Gruppechat` i minnet med syntetiske meldinger | B |

Gjenkjenningen er et sikkerhetsnett for åpenbare feil, ikke en garanti: den
finner ikke navn, sjeldne diagnoser eller kasuistikker, og ingen tekst sendes
til eksterne tjenester for kontroll.

## Arbeidsdelingen

| Tråd | Leverer | Avhenger av | Filer bare den endrer |
| --- | --- | --- | --- |
| **P7.0** (denne) | Kontrakten og grunnmuren; koordinering, #369 og samlet rapport | — | Dette dokumentet utenom trådenes avsnitt, grunnmuren |
| **A** Database og tilgang | Tabellene, funksjonene, radsikkerheten på `gruppechatter`, `chat_uleste` i `gruppeoversikt`, negative tilgangstester, samtidighet mot ekte Postgres, lagringstiden (12 måneder) | Grunnmuren | Migrasjonene for chatten utenom varsler og publikasjon, `src/__tests__/gruppechat*.test.ts` utenom C og D sine, oppføringene i `funksjonskontroller.ts` |
| **B** Brukergrensesnittet | Chatfanen, meldingslista, skrivefeltet, historikken, tilgjengelighet, mobil, navigasjon | Grunnmuren (testchatten); kobles til `useGruppechat` når C er levert | `src/components/grupper/Gruppechat*.tsx`, `src/styles/gruppechat.css`, fanen i `Grupperside.tsx`, `GRUPPEFANER` i `src/domain/rute.ts`, lesingen av `chat_uleste` i `src/grupper/modell.ts` |
| **C** Sanntid og varsler | `useGruppechat`, sammenfletting og rekkefølge, sanntidsabonnementet, gjenoppkobling, livstegn, varselkategorien og -visningen, publikasjonen, sanntid i det lokale testmiljøet | Grunnmuren; As funksjoner for integrasjonstestene | `src/gruppechat/` utenom `modell.ts`, varselmigrasjonene og publikasjonen, `src/varsler/modell.ts`, `Varsler.tsx` (rutingen), `src/__tests__/qa/lokalmiljo.ts` (sanntiden) |
| **D** Personvern og kvalitet | `docs/pasientopplysninger.md` (den globale regelen og håndteringen av hendelser), `docs/gruppechat-personvern.md` (D6), regelen i `AGENTS.md` og `docs/prosjektansvar.md`, kartleggingen av fritekst- og filflatene (også fortolkningen), `Pasientregel` der brukerne skriver fritekst i dag, testmatrisen og sluttkontrollen i nettleseren | Grunnmuren; krysstestene og nettleserkontrollen etter A–C | Dokumentene over, `docs/p7-testplan.md`, egne testfiler (`src/__tests__/gruppechat.krysstest.test.ts`, QA-skriptene) |
| **E** Forberedelse av P8 | `docs/p8-fildeling-plan.md`: kartlegging og plan for fildeling i gruppene. Ingen kode | — | Bare plandokumentet |

**Regler for trådene:**

1. Hver tråd har egen gren og egne, små PR-er. En PR som bygger på en annen
   som ikke er slått sammen, sier det under «Avhengigheter».
2. Migrasjonene får tidspunktet i UTC når de skrives og må være nyere enn
   alle på `main` og i PR-ene de bygger på.
3. Felles lister som bare vokser (`funksjonskontroller.ts`,
   `REKKEVIDDEHJELPERE`, `VARSELKATEGORIER`) kan alle legge til i; en
   flettekonflikt der løses ved å beholde begge.
4. Ingen tråd lager en egen variant av grunnmuren eller en egen tabell for det
   en annen tråd eier. Trengs en endring i kontrakten, avklares den med
   P7-tråden først.
5. Hver PR har én føring i endringsloggen (`docs/endringslogg.md`),
   etiketten `ansvar:dev`, tittelen «Til ChatGPT-kontroll – ikke merge: …»,
   HEAD-SHA og kjørte kontroller.
6. Bare syntetiske testdata. Ingen automatiske tester mot produksjonen.
7. Ingen kliniske regler, fortolkningsresultater eller faglige tekster
   endres.

## Tester og akseptkriterier

Felles krav for hver PR: `npm test`, `npm run build`, negative tester for hver
ny inngang og samtidighet der to kan endre det samme. Akseptkriteriene fra
bestillingen, med tråden som prøver dem først:

| # | Kriterium | Prøves av |
| --- | --- | --- |
| 1 | To medlemmer utveksler meldinger i sanntid | C (integrasjon), D (nettleser) |
| 2 | Et medlem kan ikke lese en annen gruppes meldinger, heller ikke med direkte kall | A |
| 3 | Medlemmer fra ulike fagmiljøer chatter i en tverrfaglig gruppe uten tilgang til lokale data | A, D |
| 4 | Et medlem som fjernes mens chatten er åpen, mister tilgangen | A (database), C (åpen chat), D (nettleser) |
| 5 | Gyldig innlogging, avsluttet medlemskap: verken hente eller sende | A |
| 6 | En arkivert gruppe tar ikke imot nye meldinger | A |
| 7 | En frakoblet bruker får riktig historikk ved gjenoppkobling | C |
| 8 | Samtidige meldinger uten tap eller duplikater | A (ekte Postgres), C (fletting) |
| 9 | Redigering og moderering følger rettighetene | A, B |
| 10 | Tastatur, mobil og skjermleser | B, D |

## Leveransene

Fylles ut av trådene.

| Del | PR | Status |
| --- | --- | --- |
| P7.0 kontrakt og grunnmur | — | Under arbeid |
| E1 Plan for fildeling i gruppene (P8) | [#439](https://github.com/peohol/ousfar/pull/439) | Til kontroll |
| D1 Regelen om pasientopplysninger, D6 og testplanen | [#442](https://github.com/peohol/ousfar/pull/442) | Til kontroll |
| D2 Regelen og advarselen ved de eksisterende skrivefeltene | — | Under arbeid |
