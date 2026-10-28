# OUSFAR Verktøy – P7: nedtrapping av antidepressiva

**Status 28.10.2026:** P7.1–P7.4 er levert og venter på uavhengig faglig kontroll (P7.5). Ingen regel er klinisk godkjent, og P4.8 er fortsatt åpen. Verktøyet «Trappe ned antidepressiv» viser derfor ingen doseplan for noe virkestoff ennå.

Notatet beskriver hvordan OUSFAR har vurdert nedtrapping til seponering for hvert antidepressivum i kildetabellen, hvilke regler som er skrevet, hva som er OUSFARs egne valg, og hvilke faglige beslutninger som gjenstår. Kilde- og dekningsmatrisen og hver regel med kilder, parametre og regneeksempler står i `docs/verktøy-p7-regelsett.md`, som lages av koden (`npm run verktoy:regler -- rapport`) og derfor alltid stemmer med den. Koden ligger i `src/verktoy/regler/`: `nedtrapping.ts` (reglene), `dekning.ts` (statusen per virkestoff) og `felles.ts` (det pilotsettet og nedtrappingsreglene deler).

## 1. Avgrensning

- **Seponering, ikke bytte.** Reglene gjelder nedtrapping til null for en pasient som skal slutte med legemidlet. Bytte er P8.
- **Kildens Stop-anbefaling er ikke en OUSFAR-regel.** Psychiatrienet står bare som referanse til Stop-oppføringen i P3-arkivet (oppføringens id); ingen regel bygger på eller gjengir teksten der, og ingen samling omskrevne regler er importert (`docs/verktøy-p3-rettigheter.md`). Reglene bygger på norske preparatomtaler fra DMP, EU-preparatomtaler fra EMA der Norge bare har preparater med godkjenningsfritak eller ingen norsk omtale finnes (vortioksetin, agomelatin), og NICE NG222. Fakta er gjengitt med egne ord, med sted i kilden og kontrollsum for dokumentet.
- **Ingen klinisk godkjenning.** Alle regler har status «til faglig kontroll». OUSFARs egne valg er merket som åpne forslag, skilt fra det kildene sier.
- **Hyperbolsk nedtrapping holdes utenfor.** P7 lager ingen nye hyperbolske eller forlengede regler. Den hyperbolske pilotregelen for citalopram fra P4 er uendret. Spørsmålet om optimal hyperbolsk nedtrapping er et eget forskningsspørsmål (B2) og ikke en del av denne leveransen.
- **Johannesurt** er utelatt og kontrolleres bort.
- **Ingen pasientopplysninger.** Testene bruker syntetiske preparater og doser.

## 2. Status for hvert virkestoff (P7.1)

Hvert av de 23 antidepressivene i kildetabellen har nøyaktig én status i `dekning.ts`, med grunnen og de faglige spørsmålene som står åpne. Kontrollen (`kontrollerDekning`) krever at statusen stemmer med reglene, at hvert virkestoff har en Stop-oppføring i P3 å skille statusen fra, og at fakta i dekningen kommer fra registrerte kilder, aldri Psychiatrienet.

| Status | Betydning | Virkestoffer |
| --- | --- | --- |
| Beregnbar regel til faglig kontroll | Preparatomtalen gir grunnlag for en beregnet nedtrapping; regelen venter på kontroll | citalopram, duloksetin, escitalopram, fluoksetin, fluvoksamin, mirtazapin, paroksetin, sertralin, venlafaksin (9) |
| Bare fagtekst | Kildene gir grunnlag for tekst, ikke for en beregning | agomelatin, bupropion, vortioksetin (3) |
| Annen begrunnet begrensning | Preparatomtalen sier at dosen skal trappes ned, men ikke hvordan; en regel krever en faglig beslutning om strategien først | amitriptylin, klomipramin, nortriptylin (3) |
| Mangler anbefaling | Ingen norsk preparatomtale eller registrert preparat å bygge på, eller omtalen sier ingenting om nedtrapping | doksepin, dosulepin, fenelzin, imipramin, maprotilin, moklobemid, tranylcypromin, trazodon (8) |

Når et virkestoff ikke har en regel, viser verktøyet statusen og grunnen i stedet for bare «ingen regel».

## 3. Regelutkastene (P7.2)

### Standardregelen: halvering til laveste dose

Preparatomtalene for citalopram, sertralin, fluvoksamin, fluoksetin, venlafaksin og duloksetin sier at brå seponering bør unngås og at dosen trappes gradvis ned over minst én til to uker, og de oppgir doseområdet. NICE 1.4.16 beskriver trinnvis nedtrapping der hvert trinn er en andel av forrige dose, med 50 % som eksempel og mindre trinn ved lav dose, og 1.4.18 én til to uker mellom reduksjonene.

OUSFARs forslag, merket som åpne valg i hver regel:

- **Halvering** av aktuell dose (50 %, eksempelet i NICE).
- **14 dager per trinn** (NICE-område 7–14 dager).
- **Sluttdose** lik laveste dose i preparatomtalen; blir neste dose lavere, seponeres det.
- **Minst 14 dager nedtrapping, bindende:** «minst én til to uker» er lest konservativt. Blir planen kortere, stopper beregningen i stedet for å forlenge den.

| Virkestoff | Startdoser (preparatomtalen, bindende) | Sluttdose | Hvorfor |
| --- | --- | --- | --- |
| citalopram | 10–40 mg | 10 mg | Startdosen ved panikklidelse |
| sertralin | 25–200 mg | 25 mg | Startdosen ved enkelte angstlidelser |
| fluvoksamin | 50–300 mg | 50 mg | Startdosen ved depresjon |
| fluoksetin | 20–60 mg | 10 mg | Halvparten av laveste dose, i stedet for 20 mg annenhver dag, som modellen ikke har |
| venlafaksin | 37,5–375 mg | 37,5 mg | Første uke ved panikklidelse |
| duloksetin | 30–120 mg | 30 mg | Startdosen ved generalisert angstlidelse |
| mirtazapin | 15–45 mg | 15 mg | Startdosen |

### Særregler

- **Paroksetin** følger nedtrappingsregimet fra de kliniske studiene i preparatomtalen: 10 mg lavere hver uke til null, minst én uke. At regimet brukes som plan, er OUSFARs valg.
- **Mirtazapin:** preparatomtalen sier bare «gradvis». OUSFAR leser det som minst ett trinn på 14 dager.
- **Fluoksetin:** kildene er ikke enige om hvor mye nedtrapping som trengs (preparatomtalen, NICE og Keks mfl. 2016). Regelen følger preparatomtalen.
- **Venlafaksin:** preparatomtalen sier at noen trenger nedtrapping over flere måneder; planen er den korteste som oppfyller minimumet.

### Fagtekst uten beregning

- **Vortioksetin:** preparatomtalen (EMA) sier at gradvis nedtrapping kan vurderes, men at det ikke finnes nok data til en anbefalt plan.
- **Agomelatin:** preparatomtalen (EMA) sier at nedtrapping ikke trengs. I Norge finnes bare preparater med godkjenningsfritak.
- **Bupropion:** preparatomtalen sier at en nedtrappingsperiode bør vurderes, men gir ingen plan, og tablettene med modifisert frisetting kan ikke deles.

Fagteksten vises først når regelen er klinisk godkjent (P6.8).

### Pilotreglene

Escitalopram (gjentatt prosentvis, 25 % trinn ved lav dose, til 2,5 mg) og den hyperbolske regelen for citalopram er fra pilotsettet (P4) og uendret. De telles med i dekningen.

## 4. Verktøyet og motoren (P7.3)

- **Ingen ny brukerflate.** Verktøyet bruker skjemaet og planvisningen fra P6 og doseplanmotoren fra P5. Regelsettet appen bruker (`REGELSETT` i `src/verktoy/tilgjengelighet.ts`) er pilotsettet og nedtrappingsreglene.
- **Aktuell døgndose oppgis uttrykkelig.** Formulering og legemiddelform spørres etter når FEST har flere, og velges aldri for brukeren. Startdato er valgfri.
- **Planen ender med seponering.** Kontrollen krever at en seponeringsregel ender med nedtrapping til null eller seponering, og beregningen stopper hvis en plan likevel ikke gjør det.
- **Bare nøyaktige doser.** Ingen av reglene har en godkjent toleranse. En dose som ikke kan settes sammen av norske preparater (styrke, deling, flytende form med dose per dråpe), stopper beregningen med de nærmeste dosene som finnes. Verktøyet avrunder ikke av seg selv.
- **Godkjenningsfritak** brukes bare når forskriveren uttrykkelig velger det.

## 5. Kontroller (P7.4)

`src/__tests__/verktoynedtrapping.test.ts` kontrollerer:

- at dekningen har nøyaktig én status for hvert antidepressivum, uten johannesurt, at statusen stemmer med reglene, at den er skilt fra Stop-oppføringen, og at kontrollen slår ut på manglende, doble og feil statuser og på fakta fra Psychiatrienet;
- at reglene er kontrollert, til faglig kontroll og ikke klinisk godkjent, at OUSFARs valg er åpne, og at strategi, sluttdose, trinnlengde, minste varighet og doseområde er som beskrevet over;
- at hvert regneeksempel stemmer, at hver plan ender med seponering, og at en seponering som ikke ender i seponering slås ut;
- grenseverdiene: dose lik sluttdosen beholdes, like under seponeres; startdose lik laveste dose stopper i stedet for brå seponering; doseområdet er bindende; paroksetin fra 10 mg stopper;
- doseplanen med syntetiske preparater: vanlige og uvanlige startdoser, rask nedtrapping (paroksetin 20 mg) og lang (sertralin 200 mg, venlafaksin 300 mg), delbare, udelbare og tabletter uten oppgitt deling, kapsler som aldri deles, dråper med dose per dråpe og en mikstur uten, valg av form, manglende preparater og styrker, og godkjenningsfritak;
- at bare en godkjenning laget i testen og en fersk FEST-kopi gir en klinisk plan, at en foreldet, manglende eller syntetisk FEST-kopi stopper, og at ingen nedtrappingsregel gir en plan i appen;
- at rapporten er oppdatert.

`verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer at verktøyet sier at faglig kontroll gjenstår for hver regel, og viser grunnen fra dekningen når det ikke finnes en regel. Fortolkningen er ikke endret, og alle eksisterende tester er grønne.

## 6. Prøvekjøring mot FEST

Reglene er kjørt mot OUSFARs FEST-uttrekk fra 08.10.2026 (registrerte, markedsførte preparater, uten godkjenningsfritak), for de vanligste startdosene. ✓ betyr at motoren fant nøyaktige doser hele veien; ✗ at den stoppet ved dosen i parentes.

| Virkestoff | Form | Resultat |
| --- | --- | --- |
| citalopram | tablett 10, 20, 40 mg | 20 ✓, 40 ✓; 30 ✗ (15 mg) |
| sertralin | tablett 25, 50, 100 mg | 50 ✓, 100 ✓, 200 ✓; 75 ✗ og 150 ✗ (37,5 mg). Konsentratet kan ikke doseres (ingen dose per dråpe) |
| paroksetin | tablett 20 mg, delbar | 20–60 ✓ i hele 10 mg; 10 stopper (ingen nedtrapping) |
| fluoksetin | tablett og dispergerbar tablett 20 mg, delbar | 20 ✓, 40 ✓; 60 ✗ (15 mg) |
| fluoksetin | kapsel 20 mg | 20, 40 og 60 ✗ (10 og 30 mg) |
| fluvoksamin | tablett 50, 100 mg, delbare | 100, 150, 200, 300 ✓ |
| venlafaksin | depotkapsel 37,5, 75, 150 mg | 75, 150, 300 ✓; 225 ✗ (56,25 mg), 375 ✗ (93,75 mg) |
| venlafaksin | depottablett 75–300 mg, ikke delbar | alle ✗ (37,5 mg og doser mellom styrkene) |
| duloksetin | enterokapsel 30, 60 mg | 60 ✓, 120 ✓; 90 ✗ (45 mg) |
| mirtazapin | tablett 15, 30, 45 mg | 30 ✓, 45 ✓ (1½ × 15 mg) |
| mirtazapin | smeltetablett | 30 ✓; 45 ✗ (22,5 mg) |
| escitalopram (P4) | tablett og dråper | ✗ ved 3,75 mg |
| citalopram, hyperbolsk (P4) | tablett | ✗ i første trinn (10,08–14,17 mg) |

Den laveste dosen i preparatomtalen gir alltid stopp (nedtrappingen blir 0 dager), for eksempel citalopram 10 mg og mirtazapin 15 mg.

## 7. Faglige beslutninger før P4.8 og P7.5 kan godkjennes

Disse valgene er OUSFARs forslag og må avgjøres av uavhengig faglig kontroll, eventuelt av faglig beslutningstaker:

1. **P4.8 først.** Pilotsettets åpne valg (`docs/verktøy-p4-regelmodell.md` avsnitt 9) må avgjøres. P7 bruker samme regelmodell og de samme NICE-faktaene, og escitalopram og den hyperbolske citalopramregelen er pilotregler.
2. **Standardstrategien:** halvering av aktuell dose med 14 dager per trinn for SSRI, SNRI og mirtazapin, eller noe annet (for eksempel 7 dager, eller 25 % trinn ved lav dose som i escitalopramregelen).
3. **Sluttdosen:** laveste dose i preparatomtalen og så seponering, eller lavere. Å gå under laveste dose er B2 og holdes utenfor P7. Escitalopramregelen går til 2,5 mg; om sluttdosene skal samordnes.
4. **Minste varighet og lave startdoser:** «minst én til to uker» lest som bindende 14 dager. Følgen er at en pasient på laveste dose (citalopram 10, sertralin 25, fluvoksamin 50, venlafaksin 37,5, duloksetin 30, mirtazapin 15, paroksetin 10 mg) får stopp, ikke en plan. Alternativene er en egen regel for lav dose (for eksempel et trinn på samme dose eller annenhver dag) eller at stoppen står.
5. **Doser som ikke kan gis:** i dag stopper beregningen (se avsnitt 6). Skal en regel få en godkjent toleranse eller en avrundingsregel, eller skal stoppen stå? Ingen avvik brukes uten et slikt vedtak.
6. **Paroksetin:** studieregimet (10 mg hver uke) eller halvering som de andre; én uke per trinn; om startdoser som ikke er hele 10 mg skal avvises (i dag gir 11 mg et siste trinn på 1 mg, som FEST stopper).
7. **Mirtazapin:** om «gradvis» kan leses som minst ett trinn på 14 dager.
8. **Fluoksetin:** om nedtrapping trengs (kildene er uenige), sluttdose 10 mg daglig i stedet for 20 mg annenhver dag, og at kapslene ikke kan gi 10 mg.
9. **Venlafaksin:** om 14 dager per trinn er for raskt.
10. **Citalopram:** om halvering eller den hyperbolske pilotregelen skal være standard (B2).
11. **Fagtekst:** om teksten for vortioksetin, agomelatin og bupropion kan publiseres; hvordan agomelatin (ingen nedtrapping) skal forholde seg til NICEs generelle råd; om bupropion 300 → 150 mg skal kunne beregnes.
12. **Trisykliske antidepressiva** (amitriptylin, nortriptylin, klomipramin): strategi (andel av dosen eller faste mg-trinn), trinnlengde, sluttdose og minste varighet, eller fortsatt ingen regel. For amitriptylin også om verktøyet skal gjelde lavdose ved smerte og hodepine.
13. **Uten anbefaling:** bekrefte at de åtte virkestoffene står som «ikke tilgjengelig»; særlig om NICEs generelle prinsipp er nok for moklobemid, og om en norsk preparatomtale for Sinequan (doksepin) finnes.
14. **Godkjenningsfritak:** om reglene kan brukes med preparater med godkjenningsfritak når forskriveren velger det.

## 8. Virkestoffer uten tilstrekkelig grunnlag

- **Ingen regel fordi kildene ikke gir et grunnlag:** dosulepin og maprotilin (ingen preparater i FEST), fenelzin, imipramin, tranylcypromin og trazodon (bare godkjenningsfritak, ingen norsk preparatomtale), doksepin (FEST lenker ikke til en preparatomtale) og moklobemid (omtalen sier ingenting om nedtrapping).
- **Ingen regel før en faglig beslutning:** amitriptylin, nortriptylin og klomipramin.
- **Fagtekst uten beregning:** vortioksetin, agomelatin og bupropion.

## 9. Hva som ikke er gjort

- Ingen regel er klinisk godkjent, og ingen doseplan vises i appen.
- Ingen hyperbolske eller forlengede regler, og ingen regel under laveste dose i preparatomtalen.
- Ingen regel for virkestoffer uten kildegrunnlag, og ingen avrunding eller toleranse uten faglig vedtak.
