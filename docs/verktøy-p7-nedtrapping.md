# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`. Det ble skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5) og omarbeidet etter to kontroller og den uavhengige fagvurderingen 29.10.2026 (avsnitt 12). Reglene er nå versjon 4. **Ingen regel er klinisk godkjent, og verktøyet viser ingen doseplan.** Fagvurderingen er ikke en formell klinisk godkjenning. P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i tre rapporter:

- `docs/verktøy-p7-dekning.md` er kilde- og dekningsmatrisen. Den har én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke i FEST, den nedre grensen i regelen, status, regel, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` viser hver regel med kildetro utsagn, OUSFARs tilpasninger og parametre med grunnlag, område og krav om begrunnelse. Den viser også bekreftelse, spørsmål, unntak, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.
- `docs/verktøy-p7-sammenligning.md` viser paroksetins raske studievariant. Den er bare til sammenligning og ligger ikke i verktøyet.

Alle lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 15 med beregnbar regel under faglig kontroll, 1 med bare fagtekst, 1 som mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | Regelsettet `ousfar-verktoy-nedtrapping` (versjon 4) har 15 nedtrappingsregler (versjon 4), også escitalopram, som er flyttet hit fra pilotsettet, og én tekstregel (agomelatin). Paroksetins studievariant ligger i sammenligningssettet `ousfar-verktoy-nedtrapping-sammenligning`. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts`, `src/components/verktoy/Verktoyside.tsx` | Appen bruker pilotsettet og P7-reglene sammen, men ikke sammenligningssettet. Et stoff uten regel får forklaringen fra dekningen. En plan oppgir regelsettet regelen hører til. Skjemaet spør om behandlingstiden er lang (ja/nei), og feltgruppen «Tilpasning av planen» lar forskriveren velge trinnstørrelse og trinnlengde innenfor regelens områder, med et felt for begrunnelse (avsnitt 5). |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts`, `verktoyside.test.tsx` | Testene dekker dekningen mot regelsettet, P3 og FEST, og reglene ved grenseverdiene: risikogruppene, kravene om begrunnelse ved og rett ved grensene, 5 % per trinn til den nedre grensen, trinn lengre enn 28 dager, fluoksetin, og at ingen beregning går til null. Bekreftelse, spørsmål og unntak er med, og doseplaner med syntetiske preparater, også i de lave trinnene. Den kliniske sperren testes med fersk og foreldet FEST, og det testes at fortolkningen ikke bruker reglene. |

Reglene bruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5. Etter fagvurderingen har modellen fått spørsmål, krav om begrunnelse, tekniske grenser og individuell avslutning (regelmodell 5, beregningsmotor 3; avsnitt 5 og 7). Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

## 2. Kildegrunnlag

- **Preparatomtalene** er grunnlaget for doseområdet og det som er spesielt for stoffet.
  - Norske preparatomtaler er hentet fra lenken FEST oppgir, og sentrale EU-preparatomtaler fra EMA.
  - Duloksetin bruker Cymbalta, som generikaene i Norge viser til. Vortioksetin og agomelatin bruker Brintellix og Valdoxan, som er sentralt godkjent.
  - Preparatomtalene står i kilderegisteret (`src/verktoy/regler/kilder.ts`) med versjon, tidspunkt og SHA-256.
- **Royal College of Psychiatrists, «Stopping antidepressants»** (publisert mars 2024, hentet 28.10.2026 med SHA-256) er grunnlaget for tempo og risiko:
  - To til fire uker mellom reduksjonene, og tiden tilpasses symptomene.
  - Minst fire uker for fluoksetin før neste reduksjon.
  - Om lag 50 % per trinn ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. Risikogruppene står per stoff i tillegg 1.
  - 5–10 % per trinn etter lang bruk («mange måneder eller lenger»).
  - Noen trenger svært lave doser før de slutter.
- **NICE NG222** er grunnlaget for trappeformen og for at planen er et startforslag:
  - Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose (1.4.16).
  - Halveringstid og behandlingstid skal tas med, og tempoet styres av pasientens symptomer (1.4.16).
  - Paroksetin og venlafaksin krever særlig varsomhet (1.4.18).
  - Tidligere seponeringssymptomer krever mer støtte og langsommere nedtrapping (1.4.15, 1.4.21).
  - Rådet om én til to uker for å vurdere en reduksjon står under fluoksetin i 1.4.18. Det brukes bare om fluoksetin.
- **Den uavhengige fagvurderingen 29.10.2026** (beslutning 1 og 2, avsnitt 11) er grunnlaget for valgområdene, standardverdiene, kravene om begrunnelse og for at ingen plan går til null. Den står som avklaring på parametrene den gjelder, med dato og rolle.
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST** brukes til å sette sammen dosene (P5) og til matrisens laveste styrke, men bestemmer ikke den nedre grensen.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i kilden.

## 3. Startforslag, ikke fast tidsplan

Hver beregnbar regel gir et **startforslag**. Det er bygd inn på fire måter:

- **Bekreftelse (`startforslag`).** Forskriveren må bekrefte at planen er et startforslag og at dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige, og til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker (NICE 1.4.16, 1.4.21; RCPsych). Uten bekreftelse stopper beregningen.
- **Spørsmål (`lang_behandlingstid`).** Forskriveren må svare ja eller nei på om pasienten har brukt legemidlet i mange måneder eller lenger (RCPsychs formulering; ingen eksakt grense). Uten svar stopper beregningen. Svaret står i planen og avgjør om noen valg krever begrunnelse (avsnitt 4).
- **Unntak (`tidligere_seponeringssymptomer`).** Har et tidligere forsøk med samme legemiddel gitt seponeringssymptomer eller mislyktes, gjelder ikke regelen. Da trengs en individuelt langsommere plan med mindre trinn (NICE 1.4.15, 1.4.21; RCPsych). Ubesvart stopper beregningen like mye som «ja». At regelen da stopper, er OUSFARs valg og står åpent.
- **Forskriverens valg og begrunnelse (avsnitt 5).** Forskriveren kan velge mindre trinn og lengre tid innenfor regelens områder. Et raskere valg der fagvurderingen krever det, må begrunnes skriftlig.

**Planen tar aldri neste reduksjon automatisk.** Dagene per trinn er minstetider, og trinnet forlenges så lenge symptomene varer. Den beregnede planen endres ikke i ettertid; en ny dose, trinnstørrelse eller strategi gir en ny plan fra dosen pasienten da bruker, og den nye planen oppgir sine egne valg.

**Det modellen kan avgjøre:**

- den ideelle dosekurven fra aktuell dose, etter en regel som er åpen for kontroll og forskriverens valg innenfor regelens områder;
- om hvert trinn kan gis med norske preparater;
- når planen ikke oppfyller et krav: startdose, bekreftelse, svar, unntak, begrunnelse eller et valg utenfor området.

**Det modellen ikke kan avgjøre:** hvor store trinnene og hvor lang tiden bør være for den enkelte, og når og hvordan nedtrappingen skal avsluttes. Modellen vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn. Det er forskriverens vurdering, og derfor må forslaget bekreftes, kan justeres og går ikke til null.

## 4. Det felles prinsippet

Hver del er merket med om den kommer fra kilden, fra fagvurderingen eller er OUSFARs valg. OUSFAR-valgene som fagvurderingen ikke har avklart, er åpne forslag.

| Del | Grunnlag | I regelen |
| --- | --- | --- |
| Trinn | RCPsych; fagvurderingen, beslutning 1 | Prosent av aktuell dose per trinn etter risikogruppen (tabellen under). |
| Mindre trinn ved lav dose | NICE: eksempel 25 % «når dosen blir lav»; RCPsych | Høyst 25 % fra laveste døgndose i preparatomtalen, aldri større enn det forskriveren har valgt. Bare der en større reduksjon kan velges, ikke ved høyest risiko eller for fluoksetin. Åpent forslag. |
| Trinnlengde | RCPsych: to til fire uker; fluoksetin minst fire uker; fagvurderingen | Minstetid per trinn etter risikogruppen, standard 28 dager og uten klinisk øvre grense. En teknisk grense på 365 dager hindrer ikke forlengelse, fordi trinnet uansett forlenges ved symptomer. |
| Nedre grense | Ingen kilde oppgir en; RCPsych: noen trenger svært lave doser | En firedel av laveste døgndose i preparatomtalen. Planen beregner ingen trinn under den. **Uavklart modellforutsetning, ikke en sluttdose** (avsnitt 7). |
| Avslutning | Fagvurderingen, beslutning 2 | Ingen nulltrinn. Siste dose fortsetter til avslutningen er vurdert individuelt (avsnitt 7). |
| Startdose | Preparatomtalens høyeste døgndose for voksne | Enhver dose opp til høyeste døgndose. Lave restdoser under ordinært doseområde er med. Åpent forslag. |
| Toleranse | – | Ingen. Et trinn som ikke kan gis nøyaktig, stopper beregningen. |

**Risikogruppene (RCPsych tillegg 1) og valgområdene (fagvurderingen, beslutning 1):**

| Risikogruppe | Stoffene | Reduksjon per trinn | Dager per trinn | Begrunnelse kreves |
| --- | --- | --- | --- | --- |
| Høyest | duloksetin, mirtazapin, moklobemid, paroksetin, venlafaksin | 5–10 %, standard 10 %. Mer er utenfor regelen. | Minst 28, standard 28 | – |
| Middels | amitriptylin, bupropion, citalopram, escitalopram, fluvoksamin, klomipramin, nortriptylin, sertralin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid; over 10 % ved lang behandlingstid (åpent OUSFAR-forslag) |
| Middels, fluoksetin | fluoksetin | 5–50 %, standard 25 % | Minst 28, standard 28 | Over 25 % |
| Lav | vortioksetin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid |

Fagvurderingen sier at lang behandlingstid «bør vanligvis utløse 5–10 %» i middelsgruppen. OUSFAR har gjort det til et krav om begrunnelse over 10 % ved lang behandlingstid, ikke en sperre; kravet er et åpent forslag til neste kontroll. Valgområdene og standardverdiene er rammer for individuell planlegging, ikke dokumenterte optimale verdier.

**Den nedre grensen avhenger ikke av styrkene.** Om hvert trinn kan gis, avgjøres av doseplanmotoren (P5). Kan et trinn ikke gis nøyaktig, stopper beregningen med de nærmeste dosene og beskjed om at en annen formulering krever en ny faglig beslutning. Laveste styrke blir aldri en slutt i seg selv. Matrisen viser laveste styrke i FEST og den nedre grensen i hver sin kolonne.

**Startdosen er skilt fra den nedre grensen.** En lav aktuell dose beregnes og avvises ikke fordi den er under ordinært behandlingsområde; eksempler er sertralin 12,5 mg og nortriptylin 15 mg. Er dosen under den nedre grensen, eller ville første trinn kommet under den, stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt. Dosen kalles ikke ugyldig.

Kildens Stop-anbefaling og OUSFARs regel er to ulike ting. Regelen er en selvstendig, etterprøvbar strategi bygd på preparatomtalen, NICE, RCPsych og fagvurderingen. Den er ikke en validert optimal nedtrapping og ikke en omskriving av Stop-oppføringen.

## 5. Forskriverens valg

Regelmodell 5 har fire byggesteiner for dette:

- **Justerbare verdier.** En parameter kan ha `justerbar` (navnet forskriveren ser) og et område. Forskriveren kan velge en annen verdi innenfor området; et valg utenfor stopper beregningen.
- **Teknisk grense (`teknisk_maks`).** Øvre grense i et område som bare er teknisk, som 365 dager per trinn. Den vises som «av tekniske grunner høyst», ikke som en klinisk grense.
- **Krav om begrunnelse (`begrunnelseskrav`).** Et valg over eller under en grense, eventuelt bare når et spørsmål er besvart med ja, krever en skriftlig begrunnelse. Uten den stopper beregningen og ber om begrunnelsen eller en annen verdi. Med den står valget, kravet og begrunnelsen i planen. Hvert krav har sitt eget grunnlag og kan avklares og godkjennes for seg.
- **Spørsmål (`sporsmal`).** Et ja/nei-spørsmål som må besvares før beregningen, som om behandlingstiden er lang. Svaret står i planen.

**Godkjenningen gjelder området og kravene, ikke hvert valg.** Hvilke verdier som er justerbare, områdene, kravene om begrunnelse og spørsmålene er en del av regelen og fingeravtrykket. En godkjenning dekker dermed ethvert valg innenfor området når kravene er oppfylt.

**I verktøyet** står spørsmålet sammen med bekreftelsen og unntaket under «Forutsetninger for regelen». Valgene og feltet «Begrunnelse for valgene» står i feltgruppen «Tilpasning av planen». Hvert felt viser regelens forslag og området, og et tomt felt bruker forslaget. Hjelpeteksten sier når begrunnelse kreves, og at den ikke skal inneholde navn eller andre personopplysninger. Alt tas vare på gjennom en oppdatering av appen som resten av skjemaet, og begynner på nytt når strategien skiftes.

## 6. Avvik fra prinsippet

- **Fluoksetin.** Regelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. Hvert trinn varer minst 28 dager, fordi seponeringssymptomer kan komme sent; forskriveren kan velge lengre trinn, f.eks. 42 dager. NICEs forslag om dosering annenhver dag ved 20 mg kan ikke uttrykkes i regelmodellen.
- **Paroksetin – rask studievariant til sammenligning.** Nedtrappingen fra studiene i preparatomtalen er skilt ut som `seponering-paroksetin-studievariant` i sammenligningssettet (versjon 3). Der blir dosen 10 mg mindre hver uke, og heller ikke den går til null. Varianten ligger ikke i verktøyet og er ikke en klinisk anbefaling.
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping, mens RCPsych regner moklobemid med høyest risiko. Regelen følger RCPsych, og konflikten står i regelen. Ved alvorlig nedsatt leverfunksjon reduserer preparatomtalen dosen; det er et eget unntak.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram** er flyttet fra pilotsettet (P4) til P7-reglene og følger nå P7-prinsippet i middelsgruppen. Fagvurderingen avviste pilotregelens sluttdose på 2,5 mg som automatisk trinn til null. Regelen er versjon 4; historikken fra pilotsettet er beholdt.
- **Citalopram** har to regler: P7-regelen og den hyperbolske pilotregelen fra P4 (`seponering-citalopram-hyperbolsk`, versjon 3). Verktøyet lar klinikeren velge strategi når begge gjelder. Den hyperbolske regelen tar ikke lenger det siste trinnet til null; den står på 0,41 mg fra dag 85 til avslutningen er vurdert. Om den skal stå som valgbar strategi (B2), er ikke avgjort.
- **Pilotreglene sertralin → mirtazapin og fluoksetin → fenelzin** (P4, versjon 2) seponerer fortsatt det første legemidlet, fordi et bytte og en utvasking før en MAO-hemmer krever det. Kravet om individuell avslutning gjelder bare rene seponeringsregler.

## 7. Ingen nulltrinn: avslutningen vurderes individuelt

Fagvurderingen (beslutning 2) avviste alle de 15 sluttdosene som automatisk trinn til null. Derfor gjelder dette for alle seponeringsregler, også pilotregelen og studievarianten:

- **Planen går ikke til null.** Nedtrappingen stopper på siste dose over den nedre grensen, og den dosen fortsetter. Planen sier: «Planen går ikke til null. Fra dag N står pasienten på X mg av … til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).» Kortformen og planteksten slutter med «avslutning: vurderes individuelt (ingen nulltrinn)».
- **Ingen reduksjon før avslutningen:** ville første trinn kommet under den nedre grensen, stopper beregningen og sier at avslutningen må vurderes individuelt.
- **Under den nedre grensen:** stopper beregningen og sier at regelen ikke har trinn under den og ingen godkjent avslutning.
- **Kontrollen håndhever det.** En seponeringsregel må ha individuell avslutning, og individuell avslutning kan ikke kombineres med en minste varighet (`kontroll.ts`).

Den nedre grensen, en firedel av laveste døgndose i preparatomtalen, er **ikke en validert klinisk terskel**. Ingen kilde oppgir en, RCPsych sier at noen trenger doser ned mot 2 % av opprinnelig dose, og den samme kvartregelen tar ikke hensyn til hvert stoffs farmakologi. Den er et åpent forslag i hver regel, så ingen regel kan godkjennes før den er avklart.

**Før en avslutningsregel kan godkjennes** trengs en egen faglig beslutning per stoff: hvilken dose avslutningen kan skje fra, hvordan den gjøres (siste trinn, formulering, tid), og at hvert trinn ned dit kan gis med norske preparater uten toleranse, eller med en toleranse som er godkjent for regelversjonen. Til da står avslutningen åpen, og ingen beregning går direkte til «seponert». Testene kontrollerer det for alle reglene, også med 5 % per trinn.

## 8. Varighet

Reglene har ingen minste varighet for nedtrappingen lenger: hvert trinn er en minstetid, og planen går ikke til null, så en samlet varighet å måle til finnes ikke. Med standardvalgene står pasienten på siste dose fra for eksempel:

- citalopram 20 mg: dag 169, 2,67 mg (seks reduksjoner);
- klomipramin 150 mg: dag 365, 2,67 mg;
- paroksetin 20 mg: dag 505, 2,7 mg;
- paroksetin 20 mg med 5 % per trinn (stresstesten i fagvurderingen): dag 1093, 2,57 mg, etter 40 reduksjoner.

Preparatomtalenes egne formuleringer (f.eks. «minst én til to uker» for flere SSRI og «over flere uker eller måneder» for paroksetin) står i begrunnelsene.

## 9. Stoffer uten beregnbar regel, og hva som mangler

| Stoff | Status | Hva som mangler |
| --- | --- | --- |
| Agomelatin | Bare fagtekst | Preparatomtalen sier at nedtrapping ikke trengs. Det finnes bare preparater med godkjenningsfritak. Tekstregelen må kontrolleres. |
| Fenelzin | Mangler anbefaling | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. Stop-oppføringen er ikke tilgjengelig (P3). Seponering av en irreversibel MAO-hemmer bør dessuten skje med spesialist (NICE 1.9.5). |
| Imipramin, tranylcypromin, trazodon | Begrenset | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. En regel krever en annen godkjent kilde, for eksempel en utenlandsk preparatomtale, og et faglig valg om at den kan brukes. |
| Doksepin | Begrenset | Sinequan 25 mg er markedsført, men FEST lenker ikke til noen preparatomtale. Stop-oppføringen er hentet fra en annen adresse enn tabellen lenker til. |
| Dosulepin, maprotilin | Begrenset | Ingen preparater i FEST. |

## 10. Beregning med norske preparater

Reglene gir den ideelle dosekurven. Doseplanmotoren (P5) setter sammen hver dose av preparatene i FEST:

- hele tabletter og kapsler;
- halve og kvarte tabletter bare der FEST oppgir dem som delbare;
- hele dråper når dråper er valgt.

Miksturer uten dokumentert dosering per ml brukes ikke. Den nedre grensen avhenger ikke av styrkene, og ingen regel har toleranse. Derfor stopper mange planer i de lave trinnene, eller allerede ved første trinn, med en forklaring og de nærmeste dosene. Eksempler fra testene (syntetiske preparater):

- Sertralin 100 mg: 75 mg kan gis, men 56,25 mg kan ikke. Planen slutter ikke ved en styrke.
- Duloksetin 60 mg: 54 mg kan ikke gis med kapsler på 30 og 60 mg.
- Venlafaksin 150 mg: 135 mg kan ikke gis.
- Paroksetin 40 mg med delbare 20 mg-tabletter: 36 mg kan ikke gis.
- Bupropion 150 mg: 112,5 mg kan ikke gis.
- Klomipramin 100 mg: 75 mg kan gis, men 56,25 mg kan ikke med hele og halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg med 50 % valgt og begrunnet: 20, 10 og 5 mg kan gis med tabletter som kan deles i fire, og planen står på 5 mg til avslutningen er vurdert. Fra 20 mg kan den også gis med dråper.

## 11. Faglige beslutninger

**Avgjort i fagvurderingen 29.10.2026** (ikke en formell klinisk godkjenning):

- **Beslutning 1 – valgområdene:** risikogruppene, områdene, standardverdiene og kravene om begrunnelse i avsnitt 4, behandlingstiden som må oppgis, og at trinnene forlenges ved symptomer uten automatisk neste reduksjon. Avklaringen står på parametrene og kravene den gjelder.
- **Beslutning 2 – sluttdosene:** alle 15 er avvist som automatisk trinn til null. Algoritmen stopper før nulltrinnet, og avslutningen krever individuell vurdering (avsnitt 7).

**Gjenstår før P4.8 og P7.5 kan godkjennes:**

1. **Avslutningen:** Skal noen stoffer få en godkjent avslutningsregel (dose, siste trinn, formulering), eller skal avslutningen alltid vurderes individuelt (avsnitt 7)?
2. **Den nedre grensen:** Er en firedel av laveste døgndose riktig grense for beregnede trinn, stoff for stoff?
3. **Lang behandlingstid i middelsgruppen:** Skal reduksjoner over 10 % etter lang behandlingstid kreve begrunnelse, slik OUSFAR foreslår, eller være utenfor regelen?
4. **Mindre trinn ved lav dose:** Godkjennes høyst 25 % fra laveste døgndose når en større reduksjon er valgt?
5. **Startdosen:** Godkjennes enhver dose opp til preparatomtalens høyeste døgndose, også for eldre og andre indikasjoner?
6. **Unntaket for tidligere seponeringssymptomer:** Er det riktig at regelen ikke gjelder da, eller skal den ha en egen langsommere variant? Er unntaket for moklobemid ved nedsatt leverfunksjon nok?
7. **Toleranse eller annen formulering:** Skal enkelte regler få en begrunnet toleranse, skal flytende former eller andre styrker brukes, eller skal en forklart stopp være svaret (avsnitt 10)?
8. **Den hyperbolske citalopramregelen (B2):** Skal den stå som valgbar strategi i verktøyet?
9. **Paroksetins studievariant:** Skal den bli stående i sammenligningssettet, eller fjernes?
10. **Fluoksetin:** Skal dosering annenhver dag (NICE) støttes?
11. **Stoffene med begrensning og agomelatin:** Skal OUSFAR lage regler fra andre kilder, og godkjennes tekstregelen for agomelatin?

## 12. Endret etter kontrollene

**Første kontroll** (av regelversjon 1, PR #286), regelversjon 2:

| Kontrollpunkt | Endring |
| --- | --- |
| Fast 50 %/14-dagers regime | Planen ble et startforslag som må bekreftes, med unntak ved tidligere seponeringssymptomer. |
| Sluttdosen var laveste styrke | Grensen ble en firedel av laveste døgndose, uavhengig av styrkene. Et trinn som ikke kan gis, stopper med begrunnelse. |
| Paroksetin | Den raske studievarianten ble skilt ut i sammenligningssettet. |
| Lave doser ble avvist | Lave restdoser beregnes. |

**Andre kontroll** (av regelversjon 2), regelversjon 3:

| Kontrollpunkt | Endring |
| --- | --- |
| Trinnlengden viste til NICE 1.4.18, som gjelder fluoksetin | Trinnlengden bygger på RCPsychs to til fire uker; NICE-henvisningen står bare i fluoksetinregelen. Rettet også i fire pilotregler fra P4. |
| De langsomme variantene var ikke begrunnet | Trinnstørrelsen følger RCPsychs risikogrupper, og forskriveren kan velge innenfor områder som er en del av godkjenningen. |
| Sluttdosen var ikke begrunnet som terskel | Den ble merket som uavklart modellforutsetning, med et forslag til akseptkriterium. |
| Startdosen og seponering fra dag 1 | Startdosen fikk bare en øvre grense, og under grensen stopper beregningen med forklaring. |

**Fagvurderingen 29.10.2026** (av regelversjon 3), regelversjon 4:

| Kontrollpunkt | Endring |
| --- | --- |
| Beslutning 1: valgområder per risikogruppe | Områdene, standardverdiene og kravene om begrunnelse i avsnitt 4. Standard er 25 % (ikke 50 %) og 28 dager (ikke 14) utenom høyest risiko. Høyest risiko kan ikke velge mer enn 10 %. Ingen klinisk øvre grense for dager; 365 dager er en teknisk grense. |
| Behandlingstiden må registreres | Spørsmålet om lang behandlingstid må besvares, og svaret står i planen (avsnitt 3). |
| Felles håndteringsregel | Dagene er minstetider; neste reduksjon utsettes og trinnet forlenges så lenge symptomene varer; en endring gir en ny plan fra aktuell dose; planen tar aldri neste reduksjon automatisk. Står i bekreftelsen. |
| Beslutning 2: alle sluttdoser avvist | Ingen plan går til null; avslutningen vurderes individuelt (avsnitt 7). Gjelder også den hyperbolske pilotregelen og studievarianten. Minste varighet er fjernet. |
| Escitalopram | Flyttet fra pilotsettet til P7-reglene, i middelsgruppen. |
| Grensetester | 5 % per trinn til den nedre grensen, trinn lengre enn 28 dager, fluoksetin med 42 dager per trinn, begrunnelse ved og rett ved grensene, og at ingen beregning går direkte til «seponert». |

## 13. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen fra P4 er bare endret slik at den ikke går til null.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 14. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer alle regelsettene, også sammenligningssettet. Den sjekker kilder, påstandsnære henvisninger, grunnlag, godkjenning, justerbare verdier, spørsmål, krav om begrunnelse, individuell avslutning, og at hvert regneeksempel stemmer med beregningen, også med forskriverens valg, svar og begrunnelse.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene, forskriverens valg og doseplanene som beskrevet over.
- `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i appens regelsett. `verktoyside.test.tsx` tester også feltene for forskriverens valg, spørsmålet og begrunnelsen.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og en egen test kontrollerer at bare verktøyene bruker de nye reglene.
