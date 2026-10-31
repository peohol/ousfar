# OUSFAR Verktøy – P12.1 og P12.5: overvåking av kildegrunnlaget og FEST

## 1. Avgrensning

Dette notatet gjelder P12.1 (endringer i kildene) og P12.5 (endringer i FEST) i `docs/verktøy-utviklingsplan.md`. Hvordan regelversjoner og kilder skal forvaltes uavhengig av beregningsmotoren (P12.2–P12.4), står i `docs/verktøy-p12-regelforvaltning.md`.

Overvåkingen **bare leser**. Den endrer, godkjenner, aktiverer eller sperrer ingen regel. Den skriver heller ikke til databasen, til grunnlaget i repoet eller til kildearkivet. En godkjenning gjelder fortsatt nøyaktig den regelversjonen og det fingeravtrykket som ble kontrollert. Overvåkingen sier bare at noe den bygger på, kan ha endret seg.

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

## 4. Rapporten og saken

Hver kjøring gir en forskjellsrapport på norsk (`rapport.ts`). Rapporten har fire deler:

1. Det som krever vurdering, med regelversjonene og fingeravtrykkene det berører.
2. Det informative.
3. Det som ikke kunne kontrolleres.
4. Hva som ble sammenlignet.

Rapporten har aldri kildetekst, bare titler, id-er, svarkoder, revisjoner, FEST-felt og kontrollsummer. Til slutt står et **avtrykk** av funnene som krever vurdering. Avtrykket er det samme så lenge de samme funnene står med det samme innholdet.

Arbeidsflyten `.github/workflows/verktoy-overvaking.yml` kjører mandag kl. 06:20 UTC, etter den nattlige FEST-synkroniseringen. Den kan også startes for hånd, med eller uten Psychiatrienet. Kjøringen gjør dette:

- Rapporten står i sammendraget for kjøringen i GitHub Actions.
- Krever noe vurdering, åpnes én sak med merkelappen `kildeovervaking`. Saken oppdateres og får en kommentar bare når avtrykket endres.
- Funnene som krever vurdering, lagres i saken. Kontrolleres en del ikke på nytt i en kjøring, fordi Psychiatrienet bare kjøres første uke i måneden eller fordi delen stopper, står funnene fra den delen videre, merket med kjøringen de ble gjort i. En sak regnes derfor aldri som avklart før hver del med funn er kontrollert igjen.
- Krever ingenting vurdering lenger, får en åpen sak en kommentar. Saken **lukkes aldri av arbeidsflyten**, bare av den som har vurdert funnene.
- Stopper en hel del av kontrollen, for eksempel fordi FEST ikke kan leses, blir kjøringen rød. Delen står da under «Ikke kontrollert» i rapporten.

FEST leses med testbrukeren i miljøet `kuratortest`, som i kuratorjobbene (`docs/kuratorjobber.md`). Arbeidsflyten har bare lesetilgang til repoet.

For hånd:

```
npm run verktoy:overvaking -- kontroll [--psychiatrienet] [--uten-dokumenter] [--uten-fest] [--ut <mappe>]
```

Kommandoen skriver `rapport.md` og `funn.json` i mappen, som standard `overvaking-resultat/`. Mappen er ikke en del av repoet.

## 5. Fremgangsmåte ved et funn som krever vurdering

1. **Vurder om planene fortsatt er forsvarlige.** Kan endringen gjøre en plan uforsvarlig, settes en sperre for regelen med en gang (`docs/verktøy-p11-publisering.md` §5.2).
2. **Les kilden selv.** Overvåkingen sier bare at noe er endret, ikke hva. Sammenlign med det regelen bygger på (`henvisninger` i regelen, versjonen i `KILDER`).
3. **Legg vurderingen frem for uavhengig kontroll** i en PR, med funnets id og avtrykket fra saken.
4. **Ingen endring i det regelen bygger på:** den samme PR-en fastsetter et nytt grunnlag, uten å endre regelen:
   - For et kildedokument legges en føring til i `src/data/verktoy/kildekontroll-grunnlag.json` med kilde, metode (`dokument` eller `synlig_tekst`), kontrollsummen fra funnet («Nå (til et nytt grunnlag etter vurdering)»), tidspunktet og hvem som vurderte. Føringene legges bare til; den nyeste per kilde gjelder, så de tidligere står som spor.
   - For FEST hentes uttrekkene på nytt med `npm run verktoy:regler -- hent-fest`, og testene og testmatrisen må være grønne med dem.
   - For Psychiatrienet gjøres et nytt uttrekk med `npm run verktoy:kildeimport -- hent`. Arkivet vokser bare, så det tidligere uttrekket står.
5. **Endring i det regelen bygger på:** regelen endres i en egen PR. Det gir en ny versjon og et nytt fingeravtrykk, og den nye versjonen kan ikke gi en plan før den er kontrollert og godkjent på nytt (`docs/verktøy-p4-regelmodell.md`). Den tidligere godkjenningen står i historikken med sitt fingeravtrykk.
6. Saken lukkes med en lenke til PR-en.

## 6. Sporbarhet og det som aldri skjer automatisk

- Ingen regel, godkjenning eller sperre endres av overvåkingen. En test kjører hele overvåkingen og kontrollerer at regelsettene og de godkjente fingeravtrykkene er uendret. Den kontrollerer også at modulene ikke skriver filer eller til databasen.
- Grunnlaget endres bare i en PR med ny kontroll (§5). Kontrollsummen i `KILDER` står urørt, og en ny kontrollsum legges ved siden av, med hvem som vurderte. FEST-uttrekkene og kildearkivet er versjonert i git, og arkivet vokser bare.
- Hvert funn som krever vurdering, nevner regelversjonen og fingeravtrykket det gjelder. Det kan derfor alltid ses hvilken godkjenning funnet ble vurdert mot.

## 7. Rettigheter

Dokumentene hentes for å beregne en kontrollsum. Ingenting av dem lagres, skrives ut eller vises, og rapporten og saken har ingen kildetekst. For Psychiatrienet sammenlignes bare id-er, svarkoder, revisjoner og kontrollsummer, slik kildearkivet har dem (`docs/verktøy-p3-rettigheter.md`). Psychiatrienet hentes månedlig med samme pause mellom sidene som ved importen, for ikke å belaste kilden.

## 8. Første kjøring, 31.10.2026

| Del | Resultat |
|---|---|
| Kildedokumenter | 28 kontrollert. 25 stemmer med kontrollsummen fra da de ble lest. **Krever vurdering:** `rcpsych-stopping`, som berører sertralin → mirtazapin v9 og vortioksetin v11, og `keks-2016`, som berører sertralin → mirtazapin v9. **Informativt:** `emc-nardil`, som ingen godkjent regel henviser til. |
| FEST | Ingen endringer i byggesteinene mellom uttrekkene (kontrollert 30.10.2026) og FEST nå (kontrollert 31.10.2026). |
| Psychiatrienet | 994 kildesider og 3 tabeller hentet på om lag ni minutter, 1 044 oppføringer sammenlignet med uttrekk 1 (27.10.2026). Ingen endringer. |

De tre dokumentene er nettsider. Kontrollsummen fra 28.–30.10.2026 kunne ikke gjenskapes, verken for siden slik den kom eller for den synlige teksten:

- RCPsych-siden er lik fra gang til gang nå, men ulik den gang.
- Australian Prescriber og emc har innhold som skifter ved hver henting. Den synlige teksten er derimot stabil.

Det kan være en reell revisjon, eller bare at siden rundt teksten er endret. Det avgjøres ikke av overvåkingen. Funnene står til en faglig vurdering etter §5, som kan fastsette den synlige teksten som nytt grunnlag. Til det er gjort, melder hver kjøring de samme funnene, med samme avtrykk.

## 9. Akseptkriterier

1. Endrede, fjernede, nye og utilgjengelige kildedokumenter, Psychiatrienet-oppføringer og FEST-preparater oppdages. Det er testet med syntetiske endringer (`src/__tests__/verktoyovervaking.test.ts`).
2. Bare det som treffer en godkjent regelversjon og sier noe om innholdet, krever vurdering, og funnet nevner regelversjonen og fingeravtrykket.
3. Rapporten og saken har ingen kildetekst.
4. Overvåkingen endrer ingen regel, godkjenning, sperre, grunnlag eller arkiv. De seks godkjente reglene har uendret versjon og fingeravtrykk (`verktoyklinisktilgang.test.ts`).
5. Arbeidsflyten kjører bare fra main, har bare lesetilgang til repoet, åpner én sak og oppdaterer den bare når funnene endres, og lukker den aldri.
