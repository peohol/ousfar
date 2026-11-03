# OUSFAR Verktøy – P12.1 og P12.5: overvåking av kildegrunnlaget og FEST

> **Kildesaker (VDR-1, `docs/verktøy-omlegging-2026-11.md`):** Fra versjon 1.119.0 er hvert funn en sak som først undersøkes teknisk. Fristene på 24/72 timer, den tekniske vurderingen i fritekst og avslutningen med en fritekst er fjernet. Redaktørvisningen for faglige spørsmål (VDR-2, 1.120.0) og varslene i verktøyene (VDR-3, 1.121.0) bygger på datagrensesnittet i §5 og er i produksjon. Produksjonskontrollen og testen av hele saksgangen (VDR-5) står i `docs/verktøy-vdr5-produksjonskontroll.md`.

## 1. Avgrensning

Dette notatet gjelder P12.1 (endringer i kildene) og P12.5 (endringer i FEST) i `docs/verktøy-utviklingsplan.md`. Hvordan regelversjoner og kilder skal forvaltes uavhengig av beregningsmotoren (P12.2–P12.4), står i `docs/verktøy-p12-regelforvaltning.md`.

Overvåkingen **leser kildene** og endrer, godkjenner, aktiverer eller sperrer ingen regel. Den skriver ikke til grunnlaget i repoet eller til kildearkivet. Det eneste den skriver, er kjøringene og sakene i appens database (§4 og §5). En nødstopp settes bare av en administrator, også når den følger av en beslutning i en sak. En godkjenning gjelder fortsatt nøyaktig den regelversjonen og det fingeravtrykket som ble kontrollert. Overvåkingen sier bare at noe den bygger på, kan ha endret seg.

## 2. Hva som kontrolleres

| Del | Hva sammenlignes | Når | Kode |
|---|---|---|---|
| Kildedokumenter | Hvert dokument med kontrollsum i `KILDER` (preparatomtaler, retningslinjer, artikler) hentes, og kontrollsummen sammenlignes med grunnlaget | Hver uke | `src/verktoy/overvaking/dokumenter.ts` |
| Psychiatrienet | En ny innhenting av de tre tabellene og kildesidene, sammenlignet oppføring for oppføring med siste uttrekk i kildearkivet (P3) | Første kjøring i måneden, eller for hånd | `src/verktoy/overvaking/psychiatrienet.ts` |
| FEST | Dosebyggesteinene for virkestoffene de godkjente, beregnbare reglene bygger planer av, i FEST nå, sammenlignet med FEST-uttrekkene reglene og testene ble kontrollert mot (`fest-pilotsett.json`, `fest-aksepttest.json`) | Hver uke | `src/verktoy/overvaking/fest.ts` |

Hva hver godkjent regel bygger på, leses av regelen selv (`src/verktoy/overvaking/berorte.ts`): kildene den henviser til, Psychiatrienet-oppføringene den sammenlignes med, og preparatene som kan inngå i en plan i det godkjente omfanget. Det omfatter forløpets administrasjonsvei og avgrensninger, og, når regelen har et klinisk omfang, legemiddelformen og de kontrollerte styrkene. Tekstreglene (bupropion, agomelatin) bygger ingen plan av FEST, så for dem kontrolleres bare kildene.

Kildene uten kontrollsum overvåkes ikke her. Det gjelder kilder der OUSFAR bare har lest sammendraget, og Psychiatrienet, som har kontrollsum per oppføring i arkivet.

## 3. Hva som krever ny faglig vurdering

Hvert funn er enten **informativt** eller **krever ny faglig vurdering**. Et funn krever vurdering når begge disse er oppfylt (`nivaFor` i `modell.ts`):

1. Funnet treffer noe en klinisk godkjent regelversjon bygger på.
2. Funnet sier noe om innholdet.

En kilde som ikke svarte, er alltid informativ. Den kontrolleres igjen ved neste kjøring.

| Kilde | Krever ny faglig vurdering | Informativt |
|---|---|---|
| Kildedokument | Endret kontrollsum, eller adressen svarer 404 eller 410, for en kilde en godkjent regel henviser til | Det samme for en kilde ingen godkjent regel henviser til; en kilde som ikke svarer eller svarer med en annen feil |
| Psychiatrienet | For en oppføring en godkjent regel sammenlignes med: endret kontrollsum for anbefalingen, endret svarkode, tilgjengelighet eller kildeside, eller at oppføringen er borte | Endring bare i siden rundt anbefalingen (sidens kontrollsum, revisjonen); endringer i oppføringer ingen godkjent regel bruker; nye eller forsvunne tabeller |
| FEST | For et preparat i det godkjente omfanget: borte, eller endret styrke, doseenhet, form, formulering, administrasjonsvei, delbarhet, registrering, markedsstatus eller begrensninger. Også et **nytt** preparat med kontrollert form og styrke, fordi beregningen da kan bruke det | Endret varenavn, navn, varenummer eller dato for når markedsføringen opphører; nye preparater uten kontrollert form og styrke, som beregningen ikke bruker |

Et preparat som var i det godkjente omfanget før endringen, berører regelen selv om det ikke er det etter endringen. Det gjelder for eksempel en tablett som har fått en annen legemiddelform.

En nettside har ofte innhold som skifter fra gang til gang, som skript og engangsverdier. For en nettside godtas derfor både kontrollsummen av siden slik den kom og kontrollsummen av den **synlige teksten**: uten skript, stil, kommentarer og tagger, med mellomrom samlet. Et grunnlag som er fastsatt på nytt (§5), gjelder bare med metoden det ble fastsatt med.

Den synlige teksten omfatter også menyen og bunnteksten på nettstedet. Den treffsikre metoden er derfor **`avsnitt`**: grunnlaget er kontrollsummen av hvert avsnitt reglene bygger på, under sin overskrift (til neste overskrift på samme eller høyere nivå, med underavsnittene). Da gir en endring i menyen, oppsettet eller et annet avsnitt ingen sak, og en endring i et relevant avsnitt sier hvilket (`avsnittI` og `avsnittssummer` i `dokumenter.ts`). Bare kontrollsummene og overskriftene lagres. Et slikt grunnlag fastsettes etter §5 punkt 4, når avsnittene er sammenlignet med det regelen ble kontrollert mot.

## 4. Rapporten og varselet i appen

Hver kjøring gir en forskjellsrapport på norsk (`rapport.ts`). Rapporten har fire deler:

1. Det som krever vurdering, med prioritet og med regelversjonene og fingeravtrykkene det berører. Prioriteten er **høy** for det som kan være en reell sikkerhetsrisiko: en kilde eller et preparat som er borte, en endret styrke eller form i det godkjente omfanget, et nytt preparat beregningen kan bruke, eller en endret anbefaling i kildeoppføringen regelen sammenlignes med. Den er **vanlig** for en endret kontrollsum i et kildedokument, der det ikke er påvist hva som er endret (`prioritetFor` i `modell.ts`).
2. Det informative.
3. Det som ikke kunne kontrolleres.
4. Hva som ble sammenlignet.

Rapporten har aldri kildetekst, bare titler, id-er, svarkoder, revisjoner, FEST-felt og kontrollsummer.

Arbeidsflyten `.github/workflows/verktoy-overvaking.yml` kjører mandag kl. 06:20 UTC, etter den nattlige FEST-synkroniseringen. Den kan også startes for hånd, med eller uten Psychiatrienet. Kjøringen gjør dette:

- Rapporten står i sammendraget for kjøringen i GitHub Actions.
- Kjøringen meldes til appen (`/api/kildeovervaking`, `src/verktoy/overvaking/endepunkt.ts`) med et OIDC-token GitHub utsteder for arbeidsflyten på main, som de andre synkroniseringene. Ingen hemmelighet lagres, og endepunktet tar bare imot fra denne arbeidsflyten.
- Databasen (`public.kildefunn`, `public.kildeovervaking_kjoringer`) holder hvert funn som krever vurdering, med et **avtrykk** av innholdet uten tidspunktet kilden ble hentet (`funnavtrykk`). Det samme funnet med det samme avtrykket står som før, også når det er avsluttet: beslutningen om det gjelder da fortsatt. Et nytt avtrykk gir et nytt, åpent funn, som avløser et åpent funn med samme nøkkel. Et åpent funn i en del som ble kontrollert uten å finne det igjen, merkes «ikke funnet igjen», men står åpent. En del som ikke ble kontrollert (Psychiatrienet utenom den første uken i måneden, eller en del som stoppet), rører ingen funn. Ingen rad slettes.
- De informative funnene står i kjøringen, med id, kilde, art og etikett.
- Stopper en hel del av kontrollen, for eksempel fordi FEST ikke kan leses eller tilkoblingen til FEST mangler, blir kjøringen rød. Delen står da under «Ikke kontrollert» i rapporten og i appen.

**I appen** blir hvert funn som krever vurdering, en **kildesak** (§5). En sak for et funn med samme nøkkel og samme innhold som sist, står som før. For en nettside er innholdet den synlige teksten eller de relevante avsnittene (`tilstandsavtrykk`), ikke siden slik den kom, så engangsverdier ikke gir en ny sak hver uke. Et nytt innhold i en åpen sak oppdaterer saken i stedet for å lage en ny; det gamle innholdet står i sakens hendelser.

Adminmeny har en prikk bare når en faglig sak venter på redaktørens beslutning, når en agent har vurdert at en eksisterende plan kan være uforsvarlig, eller når sakene ikke kunne leses. Tekniske avvik, en kontroll som stoppet eller har uteblitt, og saker i det tekniske sporet gir ingen prikk; de står som én samlet teknisk tilstand (`normal`, `oppfolging` eller `ukjent`) og i vinduet «Kildeovervåking», med hva siste kontroll sammenlignet. Det finnes ingen frister. Prioriteten følger den kliniske risikoen agenten har vurdert, ikke tiden som har gått.

En **prøvesak** startes for hånd med oppgaven `provesak`. Den melder bare et syntetisk funn som ikke berører noen regel, kontrollerer ingen kilde og rører aldri de reelle sakene; i appen er den merket «Prøve», gir ingen prikk og kan ikke gi et varsel i verktøyene eller en nødstopp. Den avsluttes med testbeviset (`avslutt_prove`), aldri med en fiktiv faglig beslutning.

FEST leses med testbrukeren i miljøet `kuratortest`, som i kuratorjobbene (`docs/kuratorjobber.md`). Arbeidsflyten har bare lesetilgang til repoet.

For hånd:

```
npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--provesak] [--ut <mappe>]
```

Kommandoen skriver `rapport.md` og `funn.json` i mappen, som standard `overvaking-resultat/`. Mappen er ikke en del av repoet. Bare arbeidsflyten melder kjøringen til appen.

## 5. Kildesakene: teknisk oppfølging og faglige beslutninger

### 5.1 Tilstandene

Hver sak har én tilstand (`public.kildefunn.tilstand`, migrasjonen `20261102210000_kildesaker.sql`). Alt som skjer, står i `public.kildefunn_hendelser` med hvem og når, og ingen rad slettes.

| Tilstand | Spor | Hvem arbeider | Synlig for redaktøren |
|---|---|---|---|
| `teknisk_utredning` | teknisk | agent (Claude) | nei |
| `uavklart` | teknisk: undersøkt, men det kan ikke fastslås hva som er endret | agent | nei |
| `faglig_gjennomgang` | klinisk relevant innhold kan være endret; kilde- og konsekvensvurdering | agent, uavhengig kontroll ved behov | bare et mulig sikkerhetsproblem, straks |
| `beslutning` | et konkret faglig spørsmål | faglig redaktør | ja |
| `oppfolging` | beslutningen er tatt; tiltakene utføres | agent; databasen eller agenten kontrollerer | ja, «Oppfølging pågår» |
| `avsluttet` | med utfall | – | ja, når saken var en faglig sak |

Et nytt funn starter alltid i `teknisk_utredning`. En endret kontrollsum alene når aldri redaktøren, gir ingen varsel i verktøyene og sperrer ingenting. Ukjent eller uavklart er ikke det samme som «ingen endring».

**Nytt kildeinnhold i en åpen sak.** I det tekniske sporet gjelder en tidligere konklusjon ikke lenger, og saken undersøkes på nytt. Venter et spørsmål på beslutning, trekkes det tilbake til `faglig_gjennomgang`; spørsmålet og en eventuell utsettelse står i hendelsen, og redaktøren får ikke velge ut fra et spørsmål om eldre innhold før agenten har vurdert det siste innholdet og lagt frem spørsmålet på nytt. Under `oppfolging` står beslutningen, tiltakene og en eventuell nødstopp, men saken avsluttes ikke før det nye innholdet er vurdert: enten med en eksplisitt, dokumentert avgjørelse om at det er dekket av beslutningen (`teknisk_konklusjon` med `dekket_av_beslutning` og bevis på hvor vurderingen kan etterprøves; `faglig_relevant` alene er ikke nok), med et nytt spørsmål til redaktøren (`faglig_sporsmal`, de tidligere tiltakene står), eller ved at en kontroll finner kilden i samsvar med det kontrollerte grunnlaget igjen. Meldes et mulig sikkerhetsproblem (`mulig_alvorlig_risiko`) mens et spørsmål venter eller en beslutning følges opp, også uten nytt kildeinnhold, går saken tilbake til `faglig_gjennomgang` som sikkerhetsproblem under vurdering, med prikk: spørsmålet og anbefalingen ble formulert før risikovurderingen og trekkes tilbake (de står i hendelsen), en beslutning står i `tidligere`, og tiltakene står.

### 5.2 Hva som avslutter en sak

| Utfall | Når | Bevis |
|---|---|---|
| `teknisk_avklart` | Agentens konklusjon `uten_faglig_betydning`, bare for et endret kildedokument (aldri en prøve, en fjernet eller utilgjengelig kilde, FEST eller Psychiatrienet) | Metode (`avsnittsavtrykk`, `kildeversjon` eller `manuell_sammenligning`, aldri en kontrollsum alene), hva som ble sammenlignet, grunnlaget og hvor kontrollen kan etterprøves |
| `ikke_funnet_igjen` | En sak i det tekniske sporet, uten mulig sikkerhetsproblem, der en senere kontroll av delen ikke fant avviket igjen | Kjøringen. Delen må ha kontrollert noe, og nøkkelen må ikke stå som informativ (en kilde som ikke svarte, er ukjent, ikke uendret) |
| `tiltak_kontrollert` | Hvert tiltak redaktørens beslutning bestilte, er utført og kontrollert | Bevis per tiltak |
| `prove` | En syntetisk prøve | Testbeviset |
| `avlost`, `tidligere_beslutning` | Bare for prøver som ble avløst, og for funn fra før kildesakene | – |

Et avsluttet funn med samme innhold som siden står avsluttet når utfallet dekker innholdet (`teknisk_avklart`, `tiltak_kontrollert`, `tidligere_beslutning`). Kommer et avvik tilbake etter `ikke_funnet_igjen`, er det en ny sak.

### 5.3 Agentens arbeid

Claude (eller noen andre med tilgang til repoet) gjør arbeidet med oppgaven `agent` i arbeidsflyten, med feltet `melding` som JSON (`src/verktoy/overvaking/agentoppgaver.ts`). Hver oppgave tar sakens nummer og versjonen agenten leste, og avvises når saken er endret siden, så en utløst oppgave aldri overskriver en nyere vurdering.

| Oppgave | Hva | Fra tilstand |
|---|---|---|
| `teknisk_konklusjon` | `uten_faglig_betydning` (med bevis, avslutter), `uavklart`, `faglig_relevant` (til faglig gjennomgang) eller `mulig_alvorlig_risiko` (til faglig gjennomgang, og redaktøren ser saken straks som sikkerhetsproblem med begrunnelsen) | teknisk; i det faglige sporet bare `faglig_relevant`, `mulig_alvorlig_risiko` og, for nytt innhold under oppfølging, `dekket_av_beslutning` (med bevis) |
| `faglig_sporsmal` | Spørsmålet til redaktøren: tittel, hva som er endret, kilden, de berørte regelversjonene med hva som treffes, hvorfor det er relevant, anbefalt valg med begrunnelse og hvem som anbefaler, to til fire valg med hvordan verktøyet virker imens, og hvordan verktøyet virker nå. Ingen kontrollsummer | `faglig_gjennomgang`, `beslutning` for å erstatte spørsmålet, eller `oppfolging` når kilden har fått nytt innhold |
| `brukervarsel` | Et kort varsel (10–300 tegn) på akkurat de berørte regelversjonene i verktøyene, eller `null` for å fjerne det. Bare for en reell sak i det faglige sporet; forsvinner når saken avsluttes | faglig spor |
| `tiltak` | Et tiltak er påbegynt, utført, kontrollert eller stoppet, med bevis og eventuelt lenke. Tar tiltakets nummer og sakens versjon. Kontrollert kan bare følge utført | `oppfolging` |
| `avslutt_prove` | Avslutter en prøve med testbeviset | alle |

Eksempel: `{"oppgave":"teknisk_konklusjon","funn":12,"versjon":3,"konklusjon":"uavklart","begrunnelse":"Den opprinnelige siden kan ikke gjenskapes."}`. Hvem som gjorde arbeidet, settes av arbeidsflyten fra feltet `av` og den som startet den.

**Hva som starter arbeidet.** Det er ingen automatisk start av en agent når et funn registreres: GitHub Actions kan ikke starte Claude uten en ny API-nøkkel, og det er en ny betalt tjeneste. Det som er automatisk, er det som kan avgjøres maskinelt: samme innhold gir ingen ny sak, en kontroll som finner kilden i samsvar med grunnlaget igjen avslutter en teknisk sak, en endring bare utenfor de relevante avsnittene gir ingen sak, og et utført nytt grunnlag kontrolleres av neste kjøring. Resten er en sporbar **teknisk arbeidskø**: de åpne sakene i det tekniske sporet, med samlet tilstand `oppfolging` hos redaktøren. Teknisk ansvarlig (Claude i prosjektet) går gjennom køen når en kjøring har meldt nye saker, som en midlertidig, manuell start; det er ikke merket automatisk. Mislykkes en oppgave, er ingenting endret (svar 409 med årsaken), og den kan sendes på nytt med versjonen saken har nå.

### 5.4 Redaktørens beslutning

Redaktøren ser bare saker i `beslutning` og `oppfolging`, mulige sikkerhetsproblemer og de sist avsluttede faglige sakene (`les_fagsaker`, `src/verktoy/overvaking/fagsak.ts`). Beslutningen (`beslutt_fagsak`) gjelder versjonen redaktøren så; er saken endret siden, skjer ingenting, og appen viser den oppdaterte saken. Hva hvert valg gjør, lages av databasen, så teksten alltid er det som faktisk skjer:

| Valg | Straks | Deretter |
|---|---|---|
| Behold godkjent regel | – | Tiltaket «nytt kontrollert sammenligningsgrunnlag» (punkt 4 under). Neste kontroll som finner kilden i samsvar med det, kontrollerer tiltaket og avslutter saken |
| Be om revidert anbefaling | – | Tiltaket «ny regelversjon med uavhengig klinisk godkjenning» (punkt 5 under) |
| Deaktiver berørt regel | Nødstoppen for hver berørt regel, med den eksisterende nødstoppen, i samme transaksjon; tiltaket står som kontrollert, og saken avsluttes | Sperren oppheves i Adminmeny → Kliniske verktøy når regelen er vurdert på nytt |
| Utsett beslutningen | – | Saken venter fortsatt |

En registrert beslutning er ikke et utført tiltak: saken står som «Oppfølging pågår» til hvert tiltak er utført og kontrollert. Hvordan verktøyet virker nå, sier hvor mange av de berørte reglene nødstoppen gjelder (uten interne nøkler; hvilke står på hver regel), enten sperren er satt for regelen, for et verktøy regelen hører til, eller for alle verktøyene; hver berørt regel har også `sperret`, så en delvis nødstopp aldri ser ut som at alle er sperret. Hvilke verktøy en regel hører til, følger med funnet (`verktoy` på hver berørt regel, ikke med i avtrykket). Mangler det i et eldre funn mens en verktøysperre er aktiv, er `sperret` `null` (ukjent), og teksten sier at det ikke kan avgjøres om sperren gjelder reglene; neste kontroll fyller inn verktøyene. Tidligere beslutninger i saken, også en utsettelse eller en beslutning som ble fulgt av et nytt spørsmål, står i `tidligere`, eldste først.

**Vinduet (VDR-2).** Adminmeny → «Kildeovervåking» (`src/components/konto/Kildeovervaking.tsx`) viser de faglige sakene først (`Fagsaker.tsx`): hvordan verktøyet virker nå, hva som er endret med kildelenke, hvilke anbefalinger som berøres (med regelnavn og godkjent versjon, aldri regel-ID, og merket når regelen er sperret med nødstoppen, eller «kan være sperret» når omfanget er ukjent; det vises aldri som at regelen virker), hvorfor det er relevant, anbefalt beslutning, valgene med hva hvert betyr for klinikerne, og for valget som er tatt hva som skjer straks og hva som må gjøres og kontrolleres etterpå, før «Registrer beslutningen». En sikkerhetssak uten spørsmål ennå viser «Sikkerhetsproblem under vurdering» og en knapp til nødstoppen, uten valg; om noe virker som før, sier bare databasens sperrestatus, aldri vinduet selv. Saker i oppfølging viser beslutningen og tiltakene med status, og at kilden er endret igjen og vurderes når `nytt_innhold_kl` er satt (da avsluttes saken ikke selv om tiltakene er kontrollert), og får en sak et nytt spørsmål, står det som alt er besluttet og gjort, øverst i kortet; avsluttede saker ligger samlet og lukket. Det tekniske sporet (alle åpne saker med teknisk logg, og siste kontroll) står lukket nederst, merket for kontrollører. Valget og merknaden overlever en oppdatering av appen (`useBevart`).

### 5.5 Klinikervarsler

`les_regelvarsler()` gir varslene for alle innloggede (`src/verktoy/overvaking/regelvarsler.ts`): regel, versjon, tekst og når. Verktøyet viser et varsel bare når regel og versjon er lik regelversjonen det bruker. Et varsel sperrer ingenting, og en lesing som feiler, stopper ikke beregningen; sperrene leses for seg som før. Mens den første lesingen pågår, og når en lesing feiler, ikke svarer innen fristen for sperrene eller gir et svar med ukjent form, står det kort ved anbefalingen at merknadene hentes eller ikke kunne hentes (`Regelvarsler.tsx`), så «ingen merknad» aldri vises når det er ukjent.

### 5.6 Fremgangsmåten for agenten

**Etter innføringen.** Redaktørens vindu med valgene (VDR-2) og varslene i verktøyene (VDR-3) er i produksjon fra 1.121.0 (03.11.2026). Agenten kan derfor sende `faglig_sporsmal` og `brukervarsel`: spørsmålet vises med valg og virkning, og varselet vises ved den berørte anbefalingen. Et mulig alvorlig problem løftes straks (`mulig_alvorlig_risiko`): redaktøren ser det i Adminmeny → Kildeovervåking, og nødstoppen i Adminmeny → Kliniske verktøy er tilgjengelig.

1. **Teknisk utredning.** Kan endringen gjenskapes, hvilken del av kilden gjelder den, og hvilke godkjente regler bygger på akkurat den delen? Et uendret klinisk innhold kan ikke erklæres på grunnlag av en kontrollsum alene eller en eldre kilde som ikke kan sammenlignes.
2. **Mulig alvorlig risiko** løftes straks (`mulig_alvorlig_risiko`), og redaktøren kan sette nødstoppen (`docs/verktøy-p11-publisering.md` §5.2).
3. **Les kilden selv**, og legg kilde- og konsekvensvurderingen frem for uavhengig kontroll i en PR, med sakens nummer og avtrykk.
4. **Ingen endring i det regelen bygger på:** en PR fastsetter et nytt grunnlag uten å endre regelen:
   - For et kildedokument legges en føring til i `src/data/verktoy/kildekontroll-grunnlag.json` med kilde, metode (`dokument`, `synlig_tekst` eller `avsnitt` med overskriftene og kontrollsummene), kontrollsummen, tidspunktet og hvem som vurderte. Føringene legges bare til; den nyeste per kilde gjelder.
   - For FEST hentes uttrekkene på nytt med `npm run verktoy:regler -- hent-fest`, og testene og testmatrisen må være grønne med dem.
   - For Psychiatrienet gjøres et nytt uttrekk med `npm run verktoy:kildeimport -- hent`. Arkivet vokser bare.
5. **Endring i det regelen bygger på:** regelen endres i en egen PR. Det gir en ny versjon og et nytt fingeravtrykk, og den nye versjonen kan ikke gi en plan før den er kontrollert og godkjent på nytt (`docs/verktøy-p4-regelmodell.md`).
6. Saken avsluttes etter §5.2.

## 6. Sporbarhet og det som aldri skjer automatisk

- Ingen regel eller godkjenning endres av overvåkingen, og ingen sperre settes uten en administrators beslutning. En test kjører hele overvåkingen og kontrollerer at regelsettene og de godkjente fingeravtrykkene er uendret. Den kontrollerer også at modulene ikke skriver filer, og at de bare kaller databasefunksjonene for kjøringene og sakene.
- Sakene, konklusjonene, spørsmålene, beslutningene og tiltakene står i databasen med hvem og når, og hver endring står som en hendelse. Ingen rad slettes. Et nytt innhold i en åpen sak oppdaterer saken, og det gamle innholdet står i hendelsen.
- Grunnlaget endres bare i en PR med ny kontroll (§5). Kontrollsummen i `KILDER` står urørt, og en ny kontrollsum legges ved siden av, med hvem som vurderte. FEST-uttrekkene og kildearkivet er versjonert i git, og arkivet vokser bare.
- Hvert funn som krever vurdering, nevner regelversjonen og fingeravtrykket det gjelder. Det kan derfor alltid ses hvilken godkjenning funnet ble vurdert mot.

## 7. Rettigheter

Dokumentene hentes for å beregne en kontrollsum. Ingenting av dem lagres, skrives ut eller vises, og rapporten og funnene i appen har ingen kildetekst. For Psychiatrienet sammenlignes bare id-er, svarkoder, revisjoner og kontrollsummer, slik kildearkivet har dem (`docs/verktøy-p3-rettigheter.md`). Psychiatrienet hentes månedlig med samme pause mellom sidene som ved importen, for ikke å belaste kilden.

## 8. Første kjøring, 31.10.2026

| Del | Resultat |
|---|---|
| Kildedokumenter | 28 kontrollert. 25 stemmer med kontrollsummen fra da de ble lest. **Krever vurdering:** `rcpsych-stopping`, som berører sertralin → mirtazapin v9 og vortioksetin v11, og `keks-2016`, som berører sertralin → mirtazapin v9. **Informativt:** `emc-nardil`, som ingen godkjent regel henviser til. |
| FEST | Ingen endringer i byggesteinene mellom uttrekkene (kontrollert 30.10.2026) og FEST nå (kontrollert 31.10.2026). |
| Psychiatrienet | 994 kildesider og 3 tabeller hentet på om lag ni minutter, 1 044 oppføringer sammenlignet med uttrekk 1 (27.10.2026). Ingen endringer. |

De tre dokumentene er nettsider. Kontrollsummen fra 28.–30.10.2026 kunne ikke gjenskapes, verken for siden slik den kom eller for den synlige teksten:

- Australian Prescriber (PMC), RCPsych og emc har innhold i siden som skifter ved hentinger. Den synlige teksten var lik mellom kjøringene 31.10. og 2.11.2026, men den omfatter også menyen og bunnteksten.

Det kan være en reell revisjon, eller bare at siden rundt teksten er endret. Det avgjøres ikke av overvåkingen; kildeundersøkelsen står i `docs/verktøy-kildefunn-1-2.md`. Fordi avtrykket tok med kontrollsummen av siden slik den kom, ble funnene registrert på nytt som nr. 4 og 5 ved kjøringen 2.11.2026 (nr. 1 og 2 står som avløst). Fra kildesakene brukes den synlige teksten eller avsnittene, og et nytt innhold oppdaterer den åpne saken. Ved overgangen står nr. 4 og 5 i `teknisk_utredning` og avsluttes ikke før den uavhengige kontrollen er gjort. Kontrollen ble gjort 03.11.2026, og grunnlaget for begge kildene er fastsatt på nytt med metoden `avsnitt` (`docs/verktøy-kildefunn-1-2.md` §8). For PMC-artikler kan Europe PMCs XML-uttrekk være et mer stabilt grunnlag, slik `keks-2019` bruker; det er en endring i kildegrunnlaget og gjøres etter §5.6.

## 9. Akseptkriterier

1. Endrede, fjernede, nye og utilgjengelige kildedokumenter, Psychiatrienet-oppføringer og FEST-preparater oppdages. Det er testet med syntetiske endringer (`src/__tests__/verktoyovervaking.test.ts`).
2. Bare det som treffer en godkjent regelversjon og sier noe om innholdet, krever vurdering, og funnet nevner regelversjonen og fingeravtrykket.
3. Rapporten og funnene i appen har ingen kildetekst.
4. Overvåkingen endrer ingen regel, godkjenning, sperre, grunnlag eller arkiv. `verktoyklinisktilgang.test.ts` kontrollerer de seks regelversjonene og fingeravtrykkene som er godkjent nå. Nye regelversjoner godkjennes særskilt, slik som de to kildekorrigerte versjonene i PR #309; kildeovervåkingen utfører ikke denne godkjenningen.
5. Arbeidsflyten kjører bare fra main, har bare lesetilgang til repoet, og melder kjøringen til appen med et OIDC-token. Endepunktet tar bare imot fra den arbeidsflyten, og bare administratorer kan lese og vurdere funnene (`kildeovervaking.test.ts`).
6. Et nytt funn er en teknisk sak og når ikke redaktøren alene. Samme innhold gir ingen ny sak; nytt innhold oppdaterer den åpne saken uten å viske ut en beslutning; en del som ikke er kontrollert, rører ingen sak; ingen rad slettes (`kildeovervaking.test.ts`).
7. En teknisk sak avsluttes bare med bevis som ikke er en kontrollsum alene, eller når en kontroll av delen fant kilden i samsvar med grunnlaget; en kilde som ikke svarte, avslutter ingenting. Et mulig sikkerhetsproblem avsluttes aldri teknisk.
8. Redaktøren får en prikk bare for en faglig sak som venter på beslutning eller et mulig sikkerhetsproblem, med valg og virkning; en beslutning bestiller tiltak, og saken avsluttes først når de er kontrollert. Det finnes ingen frister.
9. Hele saksgangen er prøvd fra kjøringen til verktøysiden med kontrollert klokke og syntetiske funn: teknisk lukking, faglig spørsmål med kontrollert tiltak, og målrettet nødstopp som kan oppheves mens en annen godkjent regel virker (`kildesakflyt.test.tsx`). Overgangen er kontrollert i produksjonen ved lesing, og prøvefunn 3 er avsluttet som prøve (`docs/verktøy-vdr5-produksjonskontroll.md`).
