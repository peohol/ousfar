# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`, skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5) og omarbeidet samme dag etter første kontroll (avsnitt 10). **Ingen regel er klinisk godkjent, og verktøyet viser ingen doseplan.** P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i tre rapporter:

- `docs/verktøy-p7-dekning.md` – kilde- og dekningsmatrisen: én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke i FEST, sluttdosen i regelen, status, regel, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` – hver regel med kildetro utsagn, OUSFARs tilpasninger, parametre med grunnlag, bekreftelse, unntak, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.
- `docs/verktøy-p7-sammenligning.md` – paroksetins raske studievariant, som bare er til sammenligning og ikke ligger i verktøyet.

Alle lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 15 med beregnbar regel under faglig kontroll, 1 bare fagtekst, 1 mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | 14 nedtrappingsregler og én tekstregel (agomelatin) i regelsettet `ousfar-verktoy-nedtrapping`, og paroksetins studievariant i sammenligningssettet `ousfar-verktoy-nedtrapping-sammenligning`. Escitalopram dekkes av pilotregelen fra P4. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts` | Appen bruker pilotsettet og P7-reglene sammen, ikke sammenligningssettet. Et stoff uten regel får forklaringen fra dekningen. En plan oppgir regelsettet regelen hører til. |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts` | Dekningen mot regelsettet, P3 og FEST; reglene ved grenseverdier; bekreftelse og unntak; doseplaner med syntetiske preparater, også i de lave trinnene; klinisk sperre med fersk og foreldet FEST; at fortolkningen ikke bruker reglene. |

Reglene gjenbruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5 uten endringer. Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

## 2. Kildegrunnlag

- **Preparatomtalene** er grunnlaget for doseområdet, kravene til varighet og det som er spesielt for stoffet. Norske preparatomtaler er hentet fra lenken FEST oppgir, og sentrale EU-preparatomtaler fra EMA. Duloksetin bruker Cymbalta, som generikaene i Norge viser til. Vortioksetin og agomelatin bruker Brintellix og Valdoxan, som er sentralt godkjent. 11 nye preparatomtaler står i kilderegisteret (`src/verktoy/regler/kilder.ts`) med versjon, tidspunkt og SHA-256.
- **NICE NG222** er grunnlaget for trappeformen og for at planen er et startforslag: hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose (1.4.16); halveringstid og behandlingstid skal tas med, og tempoet styres av pasientens symptomer (1.4.16); paroksetin og venlafaksin krever særlig varsomhet, og det bør gå én til to uker mellom reduksjonene (1.4.18); tidligere seponeringssymptomer krever mer støtte og langsommere nedtrapping (1.4.15, 1.4.21).
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST** brukes til å sette sammen dosene (P5) og til matrisens laveste styrke, men bestemmer ikke sluttdosen.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i kilden.

## 3. Startforslag, ikke fast tidsplan

Hver beregnbar regel gir et **startforslag**. Det er bygd inn på to måter:

- **Bekreftelse (`startforslag`).** Forskriveren må bekrefte at planen er et startforslag der trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og at neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige (NICE 1.4.16). Uten bekreftelse stopper beregningen.
- **Unntak (`tidligere_seponeringssymptomer`).** Har et tidligere forsøk med samme legemiddel gitt seponeringssymptomer eller mislyktes, gjelder ikke regelen; da trengs en individuelt langsommere plan med mindre trinn (NICE 1.4.15, 1.4.21). Ubesvart stopper beregningen like mye som «ja». At regelen da stopper, er OUSFARs valg og står åpent.

**Det modellen kan avgjøre:** den ideelle dosekurven fra aktuell dose etter en regel som er åpen for kontroll, om hvert trinn kan gis med norske preparater, og når planen ikke oppfyller et krav (startdose, varighet, bekreftelse, unntak).

**Det modellen ikke kan avgjøre:** hvor store trinnene og hvor lang tiden bør være for den enkelte. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og justerer ikke planen for lang behandlingstid eller kort halveringstid. Det er forskriverens vurdering, og derfor må forslaget bekreftes. Med tidligere seponeringssymptomer beregner modellen ikke noe.

## 4. Det felles prinsippet

Hver del er merket med om den kommer fra kilden eller er OUSFARs valg. Alle OUSFAR-valgene er åpne forslag som må avklares.

| Del | Kilden | OUSFARs forslag |
| --- | --- | --- |
| Trinn | NICE: en andel av forrige dose, eksempel 50 % | 50 % av aktuell dose; langsom variant 25 % fra første trinn (avsnitt 5) |
| Mindre trinn ved lav dose | NICE: eksempel 25 % «når dosen blir lav» | 25 % fra laveste døgndose preparatomtalen oppgir for voksne |
| Trinnlengde | NICE: én til to uker for å vurdere hver reduksjon | 14 dager (område 7–14) |
| Sluttdose | Ingen kilde oppgir en sluttdose | En firedel av laveste døgndose i preparatomtalen. Under den seponeres det. |
| Minste varighet | Preparatomtalen (avsnitt 6) | 14 eller 28 dager som bindende krav, eller ingen. Er nedtrappingen kortere, stopper beregningen. |
| Startdose | Preparatomtalens høyeste døgndose for voksne | Fra sluttdosen til høyeste døgndose. Lave restdoser under ordinært doseområde er med. |
| Toleranse | – | Ingen. Et trinn som ikke kan gis nøyaktig, stopper beregningen. |

**Sluttdosen er klinisk, ikke praktisk.** Den er valgt så nedtrappingen fortsetter med små trinn under laveste ordinære dose, og avhenger ikke av hvilke styrker som finnes. Om hvert trinn kan gis, avgjøres av doseplanmotoren (P5). Kan et trinn ikke gis nøyaktig, stopper beregningen med de nærmeste dosene og beskjed om at en annen formulering krever en ny faglig beslutning. Laveste styrke blir aldri en tilfredsstillende slutt i seg selv. Matrisen viser laveste styrke i FEST og sluttdosen i regelen i hver sin kolonne.

**Startdosen skiller doseområde fra restdose.** Regelen gjelder fra sluttdosen til preparatomtalens høyeste døgndose. En lav aktuell dose, for eksempel sertralin 12,5 mg eller nortriptylin 15 mg, beregnes; den avvises ikke fordi den er under ordinært behandlingsområde. Er planen fra en svært lav dose kortere enn minstevarigheten, stopper beregningen med den grunnen.

Kildens Stop-anbefaling og OUSFARs regel er to ulike ting: regelen er en selvstendig, etterprøvbar strategi bygd på preparatomtalen og NICE, ikke en validert optimal nedtrapping og ikke en omskriving av Stop-oppføringen.

## 5. Avvik fra prinsippet

- **Paroksetin og venlafaksin – langsom variant.** NICE nevner dem blant stoffene som oftere gir seponeringssymptomer og krever særlig varsomhet (1.4.18). Reglene bruker derfor 25 % av aktuell dose fra første trinn. Paroksetin 20 mg varer 14 uker, venlafaksin 150 mg 18 uker.
- **Paroksetin – rask studievariant til sammenligning.** Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) er skilt ut som `seponering-paroksetin-studievariant` i sammenligningssettet. Den er tydelig merket, ligger ikke i verktøyet og er ikke en klinisk anbefaling ved langvarig behandling; samme preparatomtale og NICE råder til nedtrapping over flere uker eller måneder.
- **Fluoksetin.** Regelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. NICEs forslag om dosering annenhver dag ved 20 mg kan ikke uttrykkes i regelmodellen.
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping, og regelen bygger bare på NICE. Ved alvorlig nedsatt leverfunksjon reduserer preparatomtalen dosen; det er et eget unntak.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram.** Pilotregelen fra P4 (`seponering-escitalopram`) er beholdt uendret: sluttdose 2,5 mg (halvparten av laveste døgndose 5 mg) og mindre trinn fra 5 mg. Etter P7-prinsippet ville sluttdosen vært 1,25 mg. Pilotregelen har heller ikke bekreftelsen og unntaket fra avsnitt 3. Forskjellen er ikke løst i koden; den må avgjøres faglig (beslutning 8).
- **Citalopram** har to regler: P7-regelen og den hyperbolske pilotregelen fra P4 (`seponering-citalopram-hyperbolsk`). Verktøyet lar klinikeren velge strategi når begge gjelder. Den hyperbolske regelen går helt til null (siste trinn 0,41 mg) og bruker ikke laveste styrke som slutt; med tabletter stopper motoren allerede ved første trinn. Den er en egen strategi etter B2 og er ikke endret.

## 6. Minste varighet per stoff

| Stoff | Preparatomtalen | Regelen |
| --- | --- | --- |
| Citalopram, sertralin, fluoksetin, fluvoksamin, venlafaksin, duloksetin | «Minst én til to uker» | Minst 14 dager: kildens krav, lest konservativt. |
| Paroksetin | «Over flere uker eller måneder» (pkt. 4.4) | Minst 28 dager: OUSFARs forslag, ikke et tall i kilden. |
| Amitriptylin | «Gradvis over flere uker» | Minst 28 dager: OUSFARs forslag, ikke et tall i kilden. |
| Klomipramin, mirtazapin | «Gradvis» uten varighet | Minst 28 dager: OUSFARs forslag, ikke et tall i kilden. |
| Nortriptylin | Bare at brå seponering kan gi abstinens | Minst 28 dager: OUSFARs forslag, ikke et tall i kilden. |
| Vortioksetin, bupropion, moklobemid | Ikke noe krav | Ingen minstevarighet; ved sluttdosen seponeres stoffet fra dag 1. |

28 dager er et nedre krav. Med prinsippet over varer planene fra vanlige doser fra 4 uker (fluoksetin 20 mg) til 18 uker (paroksetin 40 mg og venlafaksin 150 mg).

## 7. Stoffer uten beregnbar regel, og hva som mangler

| Stoff | Status | Hva som mangler |
| --- | --- | --- |
| Agomelatin | Bare fagtekst | Preparatomtalen sier at nedtrapping ikke trengs. Det finnes bare preparater med godkjenningsfritak. Tekstregelen må kontrolleres. |
| Fenelzin | Mangler anbefaling | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. Stop-oppføringen er ikke tilgjengelig (P3). Seponering av en irreversibel MAO-hemmer bør dessuten skje med spesialist (NICE 1.9.5). |
| Imipramin, tranylcypromin, trazodon | Begrenset | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. En regel krever en annen godkjent kilde, for eksempel en utenlandsk preparatomtale, og et faglig valg om at den kan brukes. |
| Doksepin | Begrenset | Sinequan 25 mg er markedsført, men FEST lenker ikke til noen preparatomtale. Stop-oppføringen er hentet fra en annen adresse enn tabellen lenker til. |
| Dosulepin, maprotilin | Begrenset | Ingen preparater i FEST. |

## 8. Beregning med norske preparater

Reglene gir den ideelle dosekurven. Doseplanmotoren (P5) setter sammen hver dose av preparatene i FEST: hele tabletter og kapsler, halve og kvarte tabletter bare der FEST oppgir dem som delbare, og hele dråper når dråper er valgt. Miksturer uten dokumentert dosering per ml brukes ikke. Fordi sluttdosen er klinisk og ingen regel har toleranse, stopper de fleste planene i de lave trinnene med en forklaring og de nærmeste dosene. Eksempler fra testene:

- Sertralin 100 mg: 50 og 25 mg kan gis, men 18,75 mg ikke. Planen slutter ikke ved 25 mg.
- Duloksetin 60 mg: 30 mg kan gis, men ingenting under; kapslene deles ikke.
- Venlafaksin 150 mg (langsom): 112,5 mg kan gis som 75 + 37,5 mg, men 84,38 mg ikke.
- Bupropion 150 mg: ingen dose under 150 mg kan gis.
- Klomipramin 150 mg: 18,75 mg kan ikke gis med halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg: hele planen (20, 10 og 5 mg) kan gis med tabletter som kan deles i fire, eller fra 20 mg med dråper; med tabletter som bare deles i to stopper den ved 5 mg.

## 9. Faglige beslutninger før P4.8 og P7.5 kan godkjennes

1. **Startforslaget:** Er bekreftelsen og unntaket for tidligere seponeringssymptomer riktig avgrenset? Skal regelen heller ha en egen langsommere variant for disse pasientene?
2. **Det felles prinsippet:** 50 % per trinn, 25 % fra laveste døgndose, 14 dager per trinn. Godkjennes det, justeres det per stoff, eller erstattes det?
3. **Sluttdosen:** Er en firedel av laveste døgndose en forsvarlig klinisk sluttdose for alle stoffene?
4. **Toleranse eller annen formulering:** De fleste planer stopper i de lave trinnene (avsnitt 8). Skal enkelte regler få en begrunnet toleranse, skal flytende former eller andre styrker brukes, eller skal en forklart stopp være svaret? Toleranse må godkjennes per regelversjon.
5. **Minste varighet:** Er 14 dager riktig lesing av «minst én til to uker», og er 28 dager et forsvarlig minimum for paroksetin, TCA-ene og mirtazapin (avsnitt 6)? Er det forsvarlig at vortioksetin, bupropion og moklobemid ikke har noe minimum?
6. **Langsom variant:** Er 25 % fra første trinn riktig for paroksetin og venlafaksin? Bør flere stoffer ha en langsom variant, for eksempel duloksetin?
7. **Paroksetins studievariant:** Skal den bli stående i sammenligningssettet, eller fjernes?
8. **Escitalopram og citalopram:** Skal pilotregelen for escitalopram harmoniseres med P7 (sluttdose, bekreftelse og unntak), og skal den hyperbolske citalopramregelen stå som valgbar strategi i verktøyet (B2)?
9. **Fluoksetin:** Er det riktig å droppe mindre trinn ved lav dose? Skal dosering annenhver dag (NICE) støttes?
10. **Startdosen:** Reglene gjelder fra sluttdosen til preparatomtalens høyeste døgndose. Er det riktig også for eldre og andre indikasjoner, og er unntaket for moklobemid ved nedsatt leverfunksjon nok?
11. **Stoffene med begrensning:** Skal OUSFAR lage regler for imipramin, tranylcypromin, trazodon, doksepin og fenelzin fra andre kilder, og i så fall hvilke?
12. **Agomelatin:** Godkjennes tekstregelen om at nedtrapping ikke trengs?

## 10. Endret etter første kontroll

Første uavhengige kontroll (av regelversjon 1, PR #286) krevde endringer før klinisk godkjenning. De beregnbare reglene er nå versjon 2, sendt til kontroll på nytt:

| Kontrollpunkt | Endring |
| --- | --- |
| Fast 50 %/14-dagers regime | Planen er et startforslag som må bekreftes, med unntak ved tidligere seponeringssymptomer; det modellen kan og ikke kan avgjøre står i avsnitt 3. Paroksetin og venlafaksin har langsom variant. |
| Sluttdosen var laveste styrke | Sluttdosen er en firedel av laveste døgndose, uavhengig av styrkene. Et trinn som ikke kan gis, stopper med begrunnelse; testene viser det for sertralin, duloksetin, venlafaksin, bupropion og den hyperbolske citalopramregelen. |
| Paroksetin | Den raske studievarianten er skilt ut i sammenligningssettet; regelen i verktøyet er langsom med minst 28 dager. |
| 14 dager som minimum overalt | SPC-krav og OUSFAR-forslag er skilt per stoff (avsnitt 6); 28 dager der kilden sier «flere uker» eller bare «gradvis». |
| Lave doser ble avvist | Startdosen gjelder fra sluttdosen, så lave restdoser beregnes; grensetester for sertralin, nortriptylin og venlafaksin. |

## 11. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen fra P4 er uendret.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 12. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer alle regelsettene, også sammenligningssettet: kilder, påstandsnære henvisninger, grunnlag, godkjenning og at hvert regneeksempel stemmer med beregningen.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene og doseplanene som beskrevet over. `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i appens regelsett.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og den nye testen kontrollerer at bare verktøyene bruker de nye reglene.
