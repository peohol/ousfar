# OUSFAR Verktøy – P12.1 og P12.5: overvåking av kildegrunnlaget og FEST

> **Ny produktbeslutning 01.11.2026 – ikke implementert:** Den eksisterende løsningen nedenfor beskriver dagens tekniske atferd, men fristene på 24/72 timer, tekniske vurderinger i admin-UI og varsling ved bare endrede kontrollsummer skal ikke videreføres som krav. Ny målmodell, sikkerhetsgrenser, arbeidsdeling og sjekklister står i **docs/verktøy-omlegging-2026-11.md**. Fram til endrings-PR-ene er publisert, gjelder dagens faktisk implementerte grensesnitt og adgangskontroll; ingen regel eller godkjenning er endret.

## 1. Avgrensning

Dette notatet gjelder P12.1 (endringer i kildene) og P12.5 (endringer i FEST) i `docs/verktøy-utviklingsplan.md`. Hvordan regelversjoner og kilder skal forvaltes uavhengig av beregningsmotoren (P12.2–P12.4), står i `docs/verktøy-p12-regelforvaltning.md`.

Overvåkingen **leser kildene** og endrer, godkjenner, aktiverer eller sperrer ingen regel. Den skriver ikke til grunnlaget i repoet eller til kildearkivet. Det eneste den skriver, er kjøringene og funnene i appens database, der administratorene ser dem (§4). En godkjenning gjelder fortsatt nøyaktig den regelversjonen og det fingeravtrykket som ble kontrollert. Overvåkingen sier bare at noe den bygger på, kan ha endret seg.

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

**I appen** har Adminmeny en prikk, og valget **Kildeovervåking** en prikk med en kort tekst, når noe av dette gjelder (`varsling.ts`): et funn venter på faglig beslutning, siste kontroll stoppet, kontrollen har ikke meldt seg på over åtte døgn, eller kildeovervåkingen kunne ikke leses. Det siste står som en egen tekst, så «ukjent» aldri ser ut som «ingen funn»; appen prøver igjen jevnlig, og vinduet har «Prøv igjen». Vinduet «Kildeovervåking» viser hvert åpent funn med prioritet, detaljer, de godkjente regelversjonene det kan berøre, når det ble funnet og sist sett, og fristene. Der skrives den tekniske vurderingen og den faglige beslutningen, med hvem og når. Vinduet viser også hva siste kontroll sammenlignet, det som stoppet, de informative endringene og de sist avsluttede funnene.

Fristene er prosessfrister, ikke kliniske verdier (`FRISTER`): den tekniske vurderingen innen ett døgn etter at funnet kom, og for høy prioritet den faglige beslutningen innen tre døgn. Et funn over fristen står som det i vinduet og i teksten ved prikken. Et funn avsluttes bare av den faglige beslutningen, aldri av arbeidsflyten.

Det er ingen daglig Claude-rutine (bidragsyterens beslutning 31.10.2026: kildene endres sjelden, og en daglig rutine er unødvendig ofte). Den ansvarlige ser prikken i appen og ber Claude om den tekniske vurderingen. Claude skriver den i appen med oppgaven `teknisk-vurdering` i arbeidsflyten, med funnets nummer (står i vinduet), vurderingen og hvem som har vurdert. Nummeret gjelder nøyaktig det innholdet som ble vurdert: er funnet avløst av et nyere med endret innhold i mellomtiden, avvises vurderingen, så den aldri festes til det nye. Den kan også skrives i vinduet, med samme kontroll.

En **prøvesak** startes for hånd med oppgaven `provesak`. Den melder bare et syntetisk funn med høy prioritet, som ikke berører noen regel, kontrollerer ingen kilde og rører aldri de reelle funnene; i appen er den merket «Prøve». Prøven går i denne rekkefølgen. Funnet skal gi prikken i Adminmeny. Det får en teknisk vurdering innen ett døgn, så den fristen ikke passeres. Det får ingen faglig beslutning, så det står som over fristen etter tre døgn. Til slutt avsluttes det med en faglig beslutning om at det var en prøve. P12.1 regnes som ferdig først når prøven er gjort og ført i fremdriftsloggen.

FEST leses med testbrukeren i miljøet `kuratortest`, som i kuratorjobbene (`docs/kuratorjobber.md`). Arbeidsflyten har bare lesetilgang til repoet.

For hånd:

```
npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--provesak] [--ut <mappe>]
```

Kommandoen skriver `rapport.md` og `funn.json` i mappen, som standard `overvaking-resultat/`. Mappen er ikke en del av repoet. Bare arbeidsflyten melder kjøringen til appen.

## 5. Fremgangsmåte ved et funn som krever vurdering

0. **Teknisk vurdering**, i vinduet «Kildeovervåking» eller av Claude gjennom arbeidsflyten: kan endringen gjenskapes, hvilken del av kilden gjelder den, og hvilke godkjente regler bygger på akkurat den delen.
1. **Vurder om planene fortsatt er forsvarlige.** For et funn med høy prioritet skrives den faglige beslutningen innen fristen, eller først en foreløpig vurdering der. Kan endringen gjøre en plan uforsvarlig, settes en sperre for regelen med en gang (`docs/verktøy-p11-publisering.md` §5.2).
2. **Les kilden selv.** Overvåkingen sier bare at noe er endret, ikke hva. Sammenlign med det regelen bygger på (`henvisninger` i regelen, versjonen i `KILDER`).
3. **Legg vurderingen frem for uavhengig kontroll** i en PR, med funnets nøkkel og avtrykk.
4. **Ingen endring i det regelen bygger på:** den samme PR-en fastsetter et nytt grunnlag, uten å endre regelen:
   - For et kildedokument legges en føring til i `src/data/verktoy/kildekontroll-grunnlag.json` med kilde, metode (`dokument` eller `synlig_tekst`), kontrollsummen fra funnet («Nå (til et nytt grunnlag etter vurdering)»), tidspunktet og hvem som vurderte. Føringene legges bare til; den nyeste per kilde gjelder, så de tidligere står som spor.
   - For FEST hentes uttrekkene på nytt med `npm run verktoy:regler -- hent-fest`, og testene og testmatrisen må være grønne med dem.
   - For Psychiatrienet gjøres et nytt uttrekk med `npm run verktoy:kildeimport -- hent`. Arkivet vokser bare, så det tidligere uttrekket står.
5. **Endring i det regelen bygger på:** regelen endres i en egen PR. Det gir en ny versjon og et nytt fingeravtrykk, og den nye versjonen kan ikke gi en plan før den er kontrollert og godkjent på nytt (`docs/verktøy-p4-regelmodell.md`). Den tidligere godkjenningen står i historikken med sitt fingeravtrykk.
6. Funnet avsluttes med den faglige beslutningen i vinduet, med en lenke til PR-en når det er en.

## 6. Sporbarhet og det som aldri skjer automatisk

- Ingen regel, godkjenning eller sperre endres av overvåkingen. En test kjører hele overvåkingen og kontrollerer at regelsettene og de godkjente fingeravtrykkene er uendret. Den kontrollerer også at modulene ikke skriver filer, og at de bare kaller databasefunksjonene for kjøringene, funnene og vurderingene.
- Funnene, vurderingene og beslutningene står i databasen med hvem og når, og ingen rad slettes. Et funn med nytt innhold avløser det gamle, som står med vurderingene sine.
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

- RCPsych-siden er lik fra gang til gang nå, men ulik den gang.
- Australian Prescriber og emc har innhold som skifter ved hver henting. Den synlige teksten er derimot stabil.

Det kan være en reell revisjon, eller bare at siden rundt teksten er endret. Det avgjøres ikke av overvåkingen. Funnene står til en faglig vurdering etter §5, som kan fastsette den synlige teksten som nytt grunnlag. Til det er gjort, melder hver kjøring de samme funnene. Har en nettside innhold som skifter ved hver henting, kan avtrykket skifte også, og funnet kommer da på nytt i appen til grunnlaget er fastsatt.

## 9. Akseptkriterier

1. Endrede, fjernede, nye og utilgjengelige kildedokumenter, Psychiatrienet-oppføringer og FEST-preparater oppdages. Det er testet med syntetiske endringer (`src/__tests__/verktoyovervaking.test.ts`).
2. Bare det som treffer en godkjent regelversjon og sier noe om innholdet, krever vurdering, og funnet nevner regelversjonen og fingeravtrykket.
3. Rapporten og funnene i appen har ingen kildetekst.
4. Overvåkingen endrer ingen regel, godkjenning, sperre, grunnlag eller arkiv. De seks godkjente reglene har uendret versjon og fingeravtrykk (`verktoyklinisktilgang.test.ts`).
5. Arbeidsflyten kjører bare fra main, har bare lesetilgang til repoet, og melder kjøringen til appen med et OIDC-token. Endepunktet tar bare imot fra den arbeidsflyten, og bare administratorer kan lese og vurdere funnene (`kildeovervaking.test.ts`).
6. Et funn står åpent til den faglige beslutningen; en del som ikke er kontrollert på nytt, rører ingen funn, og et funn med nytt innhold avløser det gamle uten at noe slettes.
7. Adminmeny har en prikk når et funn venter, når kontrollen stoppet eller har uteblitt, og vinduet viser fristene for teknisk vurdering og faglig beslutning, uten Claude.
8. Etter sammenslåing: et prøvefunn gir prikken i Adminmeny, har fått en teknisk vurdering innen ett døgn, står som over fristen etter tre døgn uten faglig beslutning, er avsluttet, og resultatet er ført i fremdriftsloggen.
