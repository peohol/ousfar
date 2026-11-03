# OUSFAR Verktøy – VDR-5: produksjonskontroll av kildesakene

**Oppgave:** VDR-5 i `docs/verktøy-omlegging-2026-11.md` §6. Notatet samler testbeviset for hele saksgangen, det som er kontrollert i produksjonen, og det som gjenstår. Ingen regel, dose, terskel, godkjenning eller sperre er endret, og ingenting er skrevet til produksjonsdatabasen.

## 1. Hele saksgangen med kontrollert klokke og testdata

`src/__tests__/kildesakflyt.test.tsx` går hele veien fra en kjøring av overvåkingen til det klinikeren ser på verktøysiden. Databasen er bygd av migrasjonene. Reglene er de klinisk godkjente. FEST-dataene er det lagrede uttrekket fra pilot- og aksepttesten. Kildefunnene er syntetiske. Tiden styres av kjøringene og uttrekket, så ingenting venter på 24 eller 72 timer. Sakene går gjennom de samme funksjonene som arbeidsflyten (`registrer`, `utforAgentoppgave`) og redaktørens vindu (`lagFagsaklager`). Verktøysiden leser sperrene og varslene som den innloggede legen.

| Flyt | Det som prøves |
| --- | --- |
| **1. Ingen klinisk konsekvens** | Et endret kildedokument blir en teknisk sak. Redaktøren får ingen sak og ingen prikk, og ingen klinikervarsel lagres. Sertralin → mirtazapin beregnes som før, uten merknad. Agentens `uten_faglig_betydning` med avsnittsbevis avslutter saken som `teknisk_avklart`. En ny kjøring med samme innhold gir ingen ny sak. |
| **2. Klinisk spørsmål** | Saken blir `faglig_relevant`, og klinikervarselet står bare ved den berørte anbefalingen (sertralin → mirtazapin). Nedtrapping av vortioksetin har ingen merknad. Redaktøren får spørsmålet med en prikk og velger «revider». Da bestilles et tiltak, og saken står i oppfølging til tiltaket er både utført og kontrollert. Først da avsluttes saken som `tiltak_kontrollert`. Etterpå har verken redaktøren eller verktøyet noen merknad. |
| **3. Reell alvorlig risiko** | `mulig_alvorlig_risiko` gir redaktøren et sikkerhetsproblem med prikk straks. Valget «deaktiver» setter nødstoppen for akkurat den regelen og lukker saken etter kontroll. På verktøysiden tilbys ikke sertralin som snarvalg. Byttet viser «Midlertidig deaktivert» med kildesakens nummer og har ingen beregningsknapp. Vortioksetin-nedtrappingen, som er en annen godkjent regel, beregnes som før. Når en administrator opphever nødstoppen, beregnes sertralin → mirtazapin igjen, og den opphevede sperren står i historikken med begrunnelsen. |

Disse testene finnes fra før og dekker resten av kravene: `kildeovervaking.test.ts` (tilstander, roller, optimistisk lås, ingen sletting, prøvesak), `fagsakkjede.test.tsx` (redaktørvinduet mot databasen, ny kildeendring under oppfølging, sperrestatus), `verktoyside.test.tsx` (varsel og sperre i verktøyene), `verktoysperrer.test.ts` og `verktoyovervaking.test.ts`.

## 2. Kontrollert i produksjonen 03.11.2026

Kontrollen ble gjort med lesing alene (`GET` mot data-API-et). Appen i produksjonen viser 1.121.0, altså med VDR-1, VDR-2 og VDR-3.

| Krav | Funn |
| --- | --- |
| Tekniske funn vises ikke som kliniske oppgaver | Sak 4 (`keks-2016`) og 5 (`rcpsych-stopping`) står i `teknisk_utredning`, versjon 1, uten spørsmål og uten klinikervarsel. De gir ingen prikk og ingen redaktørsak. Ingen rad har klinikervarsel, og `kildefunn_tiltak` er tom. |
| Funn 1 og 2 | Begge står som `avsluttet` / `avlost` 02.11.2026 06:50, avløst av sak 4 og 5 ved kjøring 3. Kildeundersøkelsen står i `docs/verktøy-kildefunn-1-2.md`. Kontrolløren har sagt at lukkingen er teknisk, ikke en redaktørbeslutning. Nytt grunnlag kommer i PR #306. Etter at den er slått sammen, avslutter agenten sak 4 og 5 med avsnittsbevis, og en ny kontroll bekrefter at det ikke kommer nye saker. Det gjøres i tråd F, ikke her. |
| Syntetisk funn 3 | `prove`, `avsluttet` 03.11.2026 04:11:57 UTC med utfallet `prove` (`avslutt_prove`) av agenten fra arbeidsflyten. Hendelsen har testbeviset: registrert i kjøring [41241943343](https://github.com/peohol/ousfar/actions/runs/41241943343), vist som «Prøve», teknisk vurdering fra kjøring 41242060747, migrert ved VDR-1, ingen prikk, og den gamle 72-timersprøven ble ikke kjørt fordi den er utgått. |
| Historikk | `kildefunn_hendelser` har én `migrert`-hendelse for hver av sakene 1–5 fra overgangen (03.11.2026 03:34) og hendelsen som avsluttet sak 3. Ingen rad er slettet. Kjøringene 1–3 står i `kildeovervaking_kjoringer`. |
| Tilgangskontroll | Uten innlogging avvises lesing av `kildefunn`, `kildefunn_tiltak` og `verktoysperrer` og kall til `les_kildeovervaking`, `les_fagsaker`, `les_regelvarsler`, `les_verktoysperrer` og `verktoysperrehistorikk` (401, «permission denied»). Rollene for innloggede (lege eller administrator) er prøvd mot migrasjonene i testene. |
| Målrettet sperre virker og kan oppheves | En regelsperre for `depot-paliperidon-xeplion` («Prøve av nødstoppen») ble satt 31.10.2026 10:39:20 og opphevet 10:43:57 («Prøve fullført»). Den står i historikken, og ingen sperre er aktiv nå. Mekanismen (`verktoysperrer`, `les_verktoysperrer`, `opphev_verktoysperre`) er uendret siden. «Deaktiver» i en kildesak setter den samme sperren, prøvd i flyt 3. |

**Ikke gjort i produksjonen:** en ny sperre og en ny prøvesak gjennom hele den nye saksgangen. Begge krever skriving i produksjonen, og den gjøres av en administrator. Om det trengs i tillegg til prøven 31.10 og flyt 3, avgjør kontrolløren (§4).

## 3. Den gamle påminnelsen 03.11.2026

Fremdriftsloggen for 31.10.2026 (`docs/verktøy-utviklingsplan.md`) sier at prøvefunn 3 skulle stå over fristen for faglig beslutning etter 72 timer (fra 03.11.2026 kl. 21:05 UTC), og at en administrator så skulle avslutte det med en faglig beslutning. Det er utgått:

- Fristene finnes ikke lenger (VDR-1, 1.119.0), og en prøve kan ikke avsluttes med en faglig beslutning (§5.2 i `docs/verktøy-p12-overvaking.md`).
- Funn 3 er avsluttet som prøve med testbeviset (§2).
- Det finnes ingen planlagt oppgave i prosjektet for 03.11.2026. Den gamle testen kan ikke slå til, og ingen trenger å gjøre noe.

P12.1 krysses ikke av fordi 72 timer har gått.

## 4. Til kontrolløren

1. Godta flyt 1–3 (§1) som bevis for hele saksgangen, sammen med lesingen i §2?
2. Er prøven av nødstoppen 31.10.2026, med uendret mekanisme og flyt 3, nok for «målrettet sperre virker og kan oppheves»? Eller skal en administrator sette og oppheve en regelsperre i produksjonen på nytt?
3. P12.1 bør tidligst krysses av når sak 4 og 5 er avsluttet teknisk etter PR #306, og en ordinær kontroll etter det ikke har gitt nye saker for de to kildene.
