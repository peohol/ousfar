# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`. Det ble skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5) og er omarbeidet etter to kontroller, fagvurderingen 29.10.2026, fagkontrollen 30.10.2026 og substanskontrollen 30.10.2026, runde 3 (avsnitt 12). Hovedreglene og tekstreglene for duloksetin og venlafaksin er nå versjon 6, de langsomme variantene og fluoksetin annenhver dag versjon 2. **Bare tekstreglene for bupropion (versjon 5) og agomelatin (versjon 1) er klinisk godkjent**, med kontrollørens fingeravtrykk; verktøyet viser fagteksten deres. **Ingen beregnbar regel er klinisk godkjent, og verktøyet viser ingen doseplan.** De beregnbare reglene ble godkjent med endring og er sendt til ny uavhengig kontroll. P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i tre rapporter:

- `docs/verktøy-p7-dekning.md` er kilde- og dekningsmatrisen. Den har én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke i FEST, en eventuell praktisk grense i regelen, status, regler, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` viser hver regel med kildetro utsagn, OUSFARs tilpasninger og parametre med grunnlag, område og krav om begrunnelse. Den viser også bekreftelser, spørsmål, unntak, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.
- `docs/verktøy-p7-sammenligning.md` er sammenlignings- og utviklingssettet. Det har bare den hyperbolske citalopramregelen, som ikke er en valgbar klinisk strategi og ikke ligger i verktøyet.

Alle lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 12 med beregnbare regler under faglig kontroll, 4 med bare fagtekst (agomelatin, bupropion, duloksetin og venlafaksin), 1 som mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | Regelsettet `ousfar-verktoy-nedtrapping` (versjon 6) har 29 regler: for hvert av de 12 stoffene en hovedregel (versjon 6) og en langsom variant etter tidligere seponeringssymptomer (versjon 2), fluoksetin 20 mg annenhver dag (versjon 2) og tekstreglene for bupropion (versjon 5, klinisk godkjent), agomelatin (versjon 1, klinisk godkjent), duloksetin og venlafaksin (versjon 6). Escitalopram er flyttet hit fra pilotsettet. Den hyperbolske citalopramregelen ligger i sammenligningssettet `ousfar-verktoy-nedtrapping-sammenligning`. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts`, `src/components/verktoy/Verktoyside.tsx` | Appen bruker pilotsettet og P7-reglene sammen, men ikke sammenligningssettet. Har et stoff flere regler, velger forskriveren strategi (hovedregel, langsom variant eller annenhver dag). Et stoff uten regel får forklaringen fra dekningen. For bupropion og agomelatin viser verktøyet den godkjente fagteksten med kildene, hvem som godkjente den, når, regelversjonen og avgrensningen. En plan oppgir regelsettet regelen hører til. Skjemaet ber om bekreftelsene og unntakene, spør om behandlingstiden, stoffets spørsmål om pasientgruppe og indikasjon og om dosen ellers er utenfor rammen, og lar forskriveren velge trinnstørrelse og trinnlengde innenfor regelens områder, med et felt for begrunnelse (avsnitt 5). |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts`, `verktoyside.test.tsx` | Testene dekker dekningen mot regelsettet, P3 og FEST, og reglene ved grenseverdiene: horisonten på akkurat 12 reduksjoner og 6 i de langsomme variantene, avrundingen til vist dose og reduksjoner som forsvinner i den, minste viste dose, startdosen ved og rett over høyeste voksendose og hver grense for pasientgruppe og indikasjon (med og uten begrunnelse), 0 mg og minste positive dose, stoppene for under 18 år, akutte forhold, ustabil dose og kontraindikasjoner, risikogruppene, den langsomme varianten ved 1, 5 og 5,01 %, kravene om begrunnelse, doserammen, organfunksjon, annenhver dag ved 19,99, 20 og 20,01 mg, deling av døgndosen, de to kliniske godkjenningene med fingeravtrykk, og at ingen beregning går til null. Doseplaner med syntetiske preparater viser at planen stopper ved trinnet før et trinn som ikke kan gis (også med dråper uten toleranse og når døgndosen ikke kan fordeles), og stopper med faktisk reduksjon når allerede første trinn ikke kan gis. Den kliniske sperren testes med fersk og foreldet FEST, og det testes at fortolkningen ikke bruker reglene. |

Reglene bruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5. Etter fagkontrollene har modellen fått spørsmål, krav om begrunnelse, tekniske grenser, individuell avslutning med teknisk planhorisont, dosering med intervall, betingede grenser for startdosen og fordeling av døgndosen (regelmodell 7, beregningsmotor 5, doseplanmotor 3; avsnitt 5, 7 og 10). Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

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
- **Fagvurderingen 29.10.2026** (beslutning 1 og 2), **fagkontrollen 30.10.2026** (beslutning 3–5) og **substanskontrollen 30.10.2026, runde 3** (beslutning 6–9, avsnitt 11) er grunnlaget for valgområdene, standardverdiene, kravene om begrunnelse, den langsomme varianten, doserammen, planhorisonten, startdosen og grensene for pasientgruppe og indikasjon, stoppene og for at ingen plan går til null. Hver avklaring står på parameteren, kravet, bekreftelsen eller unntaket den gjelder, med dato og rolle. Det preparatomtalen sier, står som kildetro utsagn med kildestedet; det som er OUSFARs modellvalg, står som tilpasning eller som OUSFARs vurdering med avklaringen.
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST** brukes til å sette sammen dosene (P5) og til matrisens laveste styrke.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i kilden.

## 3. Startforslag, ikke fast tidsplan

Hver beregnbar regel gir et **startforslag**. Det er bygd inn på disse måtene:

- **Bekreftelse (`startforslag`).** Forskriveren må bekrefte at planen er et startforslag og at dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige, og til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Planen er ingen forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker (NICE 1.4.16, 1.4.21; RCPsych; beslutning 6). Uten bekreftelse stopper beregningen.
- **Bekreftelse (`organfunksjon_interaksjoner`).** Forskriveren må bekrefte at lever- og nyrefunksjon og interaksjoner er vurdert, for alle stoffer (fagkontrollen, beslutning 5.6). Ved nedsatt organfunksjon eller interaksjoner må dosen og planen vurderes individuelt.
- **Spørsmål (`lang_behandlingstid`).** Har pasienten brukt legemidlet i mange måneder eller lenger (RCPsychs formulering; ingen eksakt grense)? Svaret står i planen og avgjør om noen valg krever begrunnelse (avsnitt 4).
- **Spørsmål om pasientgruppe, indikasjon og organfunksjon** (per stoff, avsnitt 4). For eksempel om pasienten er over 65 år, har nedsatt leverfunksjon eller bruker legemidlet mot en bestemt indikasjon. Svaret avgjør hvilken grense for startdosen som gjelder. Et ja på nedsatt leverfunksjon krever i tillegg en skriftlig begrunnelse.
- **Spørsmål (`utenfor_doseramme`).** Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, utover det spørsmålene over dekker? Høyeste døgndose for voksne er ingen automatisk godkjent ramme (beslutning 5.5). Et ja krever en skriftlig begrunnelse, en særskilt vurdering; uten den stopper beregningen.
- **Unntak som stopper ordinær planlegging** (alle beregnbare regler, beslutning 7): pasienten er under 18 år; en akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering; ustabil dose, uregelmessig inntak eller seponering som del av et bytte. Kontraindikasjonene i preparatomtalen er egne unntak der de gjelder (citalopram og escitalopram: QT-forlengelse; moklobemid: kontraindiserte legemidler; duloksetin: leversykdom og alvorlig nedsatt nyrefunksjon). Ingen av dem kan begrunnes bort.
- **Unntak (`tidligere_seponeringssymptomer`).** Har et tidligere forsøk med samme legemiddel gitt seponeringssymptomer eller mislyktes, gjelder ikke hovedregelen, men den langsomme varianten (avsnitt 6). Ubesvart stopper beregningen like mye som «ja». I den langsomme varianten bekrefter forskriveren i stedet at de tidligere symptomene var vurdert som seponeringssymptomer, ikke tilbakefall, bivirkninger eller andre årsaker.
- **Forskriverens valg og begrunnelse (avsnitt 5).** Forskriveren kan velge mindre trinn og lengre tid innenfor regelens områder. Et raskere valg der fagvurderingen krever det, må begrunnes skriftlig.

Ubesvarte spørsmål stopper beregningen.

**Planen tar aldri neste reduksjon automatisk.** Dagene per trinn er minstetider, og trinnet forlenges så lenge symptomene varer. Den beregnede planen endres ikke i ettertid; en ny dose, trinnstørrelse eller strategi gir en ny plan fra dosen pasienten da bruker, og den nye planen oppgir sine egne valg.

**Det modellen kan avgjøre:**

- den ideelle dosekurven fra aktuell dose, etter en regel som er åpen for kontroll og forskriverens valg innenfor regelens områder;
- om hvert trinn kan gis med norske preparater;
- når planen ikke oppfyller et krav: startdose, bekreftelse, svar, unntak, begrunnelse eller et valg utenfor området.

**Det modellen ikke kan avgjøre:** hvor store trinnene og hvor lang tiden bør være for den enkelte, og når og hvordan nedtrappingen skal avsluttes. Modellen vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn. Det er forskriverens vurdering, og derfor må forslaget bekreftes, kan justeres og går ikke til null.

## 4. Det felles prinsippet

Hver del er merket med om den kommer fra kilden, fra fagvurderingene eller er OUSFARs valg. OUSFAR-valgene som fagvurderingene ikke har avklart, er åpne forslag.

| Del | Grunnlag | I regelen |
| --- | --- | --- |
| Trinn | RCPsych; fagvurderingen, beslutning 1 | Prosent av aktuell dose per trinn etter risikogruppen (tabellen under). |
| Mindre trinn ved lav dose | NICE: eksempel 25 % «når dosen blir lav»; RCPsych; fagkontrollen, beslutning 5.4 | Høyst 25 % fra laveste døgndose i preparatomtalen, aldri større enn det forskriveren har valgt. En konservativ øvre ramme, ikke en anbefaling. Bare der en større reduksjon kan velges, ikke ved høyest risiko eller for fluoksetin. |
| Trinnlengde | RCPsych: to til fire uker; fluoksetin minst fire uker; fagvurderingen | Minstetid per trinn etter risikogruppen, standard 28 dager og uten klinisk øvre grense. En teknisk grense på 365 dager hindrer ikke forlengelse, fordi trinnet uansett forlenges ved symptomer. |
| Nedre grense | Fagkontrollen, beslutning 3 | **Ingen fast klinisk nedre grense.** Dosene er alltid over 0. Planen stopper ved den tekniske planhorisonten, når neste reduksjon forsvinner i avrundingen, ved 0,01 mg eller ved et trinn som ikke kan gis (avsnitt 7). |
| Planhorisont | Substanskontrollen, beslutning 6 | Høyst 12 reduksjoner per plan i hovedreglene (`PLANHORISONT_TRINN` i `bygg.ts`), høyst 6 i de langsomme variantene (`PLANHORISONT_LANGSOM`). En teknisk maksimalhorisont, ikke en klinisk grense; hvert trinn krever en ny vurdering av toleransen, og planen fortsetter fra faktisk dose. 6 er et konservativt systemvalg for tettere revurdering, ikke en validert klinisk grense. |
| Avrunding | Substanskontrollen, beslutning 6 | Hvert trinn avrundes til den viste dosen (to desimaler), og neste trinn regnes fra den, så beregnet, vist og gitt dose er den samme. En reduksjon som forsvinner i avrundingen, er ikke et trinn. |
| Praktisk grense | Fagkontrollen, beslutning 3 | Ingen regel har en praktisk grense lenger: duloksetin og venlafaksin er tekstregler (avsnitt 6). Modellen har fortsatt muligheten. |
| Avslutning | Fagvurderingen, beslutning 2; fagkontrollen, beslutning 4; substanskontrollen, beslutning 6 | Ingen nulltrinn og ingen automatisk avslutning. Siste dose fortsetter til forskriveren har vurdert videre nedtrapping (avsnitt 7). |
| Startdose | Preparatomtalens høyeste døgndose for voksne; fagkontrollen, beslutning 5.5; substanskontrollen, beslutning 7 | Enhver dose over 0 opp til høyeste døgndose for voksne, også lave restdoser. Over den stopper beregningen, uten overstyring med begrunnelse. Innenfor den gjelder grensene for pasientgruppe og indikasjon (tabellen under). En dose ellers utenfor rammen krever begrunnelse. |
| Toleranse | Fagkontrollen, beslutning 5.7 | Ingen, heller ikke med dråper. Et trinn som ikke kan gis nøyaktig, stopper planen med forklaring (avsnitt 10). |

**Risikogruppene (RCPsych tillegg 1) og valgområdene (fagvurderingen, beslutning 1; fagkontrollen, beslutning 5.3):**

| Risikogruppe | Stoffene | Reduksjon per trinn | Dager per trinn | Begrunnelse kreves |
| --- | --- | --- | --- | --- |
| Høyest | mirtazapin, moklobemid, paroksetin (duloksetin og venlafaksin er tekstregler) | 5–10 %, standard 10 %. Mer er utenfor regelen. | Minst 28, standard 28 | – |
| Middels | amitriptylin, citalopram, escitalopram, fluvoksamin, klomipramin, nortriptylin, sertralin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid; over 10 % ved lang behandlingstid |
| Middels, fluoksetin | fluoksetin | 5–50 %, standard 25 % | Minst 28, standard 28 | Over 25 %; over 10 % ved lang behandlingstid (beslutning 8) |
| Lav | vortioksetin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid |
| Langsom variant (alle 12) | etter tidligere seponeringssymptomer | 1–5 %, standard 5 %. Mer er utenfor regelen. Høyst 6 reduksjoner per plan. | Minst 28, standard 28; lengre kan velges | – |

Valgområdene og standardverdiene er rammer for individuell planlegging, ikke dokumenterte optimale verdier.

**Grensene for startdosen (substanskontrollen, beslutning 7).** Over høyeste voksendose stopper alle reglene. Innenfor den skiller reglene mellom en uttrykkelig høyeste dose i preparatomtalen, som stopper, og en forsiktighetsgrense, der en høyere dose krever en skriftlig begrunnelse. Grensene gjelder også den langsomme varianten. Der preparatomtalen sier «eldre» uten alder, spør regelen om det samme. Nedsatt leverfunksjon krever i tillegg alltid en begrunnelse.

| Stoff | Høyeste voksendose | Høyeste dose som stopper | Forsiktighetsgrense (begrunnelse) |
| --- | --- | --- | --- |
| Citalopram | 40 mg | 20 mg over 65 år og ved nedsatt leverfunksjon | – |
| Escitalopram | 20 mg | 10 mg over 65 år, ved nedsatt leverfunksjon og ved kjent langsom CYP2C19-omsetning | – |
| Paroksetin | 60 mg | 50 mg utenom tvangslidelse og panikklidelse; 40 mg hos eldre | – |
| Klomipramin | 250 mg | 150 mg ved panikklidelse og narkolepsi | Over 150 mg ved depresjon og tvangstilstander |
| Amitriptylin | 150 mg | – | Over 100 mg over 65 år eller ved hjerte- og karsykdom; over 75 mg ved smerte og migreneprofylakse |
| Nortriptylin | 200 mg | – | Over 150 mg; over 50 mg hos eldre (vedlikehold 25–50 mg i preparatomtalen; OUSFARs valg av grense) |
| Vortioksetin | 20 mg | – | Over 10 mg fra 65 år |
| Fluoksetin, fluvoksamin, mirtazapin, moklobemid, sertralin | etter preparatomtalen | – | – |

Fluvoksamin over 150 mg gis fordelt på 2 eller 3 doser, hver høyst 150 mg, og moklobemid alltid fordelt på 2 doser (preparatomtalene); planen viser fordelingen (avsnitt 10).

**Startdosen er skilt fra slutten.** En lav aktuell dose beregnes og avvises ikke fordi den er under ordinært behandlingsområde; eksempler er sertralin 12,5 mg, nortriptylin 15 mg og citalopram 2,5 mg. Forsvinner allerede første reduksjon i avrundingen (for eksempel 1 % fra 0,5 mg), eller ville første trinn kommet under 0,01 mg, stopper beregningen og sier at videre nedtrapping må vurderes individuelt. Dosen kalles ikke ugyldig. 0 mg er ingen dose og stopper.

Kildens Stop-anbefaling og OUSFARs regel er to ulike ting. Regelen er en selvstendig, etterprøvbar strategi bygd på preparatomtalen, NICE, RCPsych og fagvurderingene. Den er ikke en validert optimal nedtrapping og ikke en omskriving av Stop-oppføringen.

## 5. Forskriverens valg

Regelmodellen har disse byggesteinene for det:

- **Justerbare verdier.** En parameter kan ha `justerbar` (navnet forskriveren ser) og et område. Forskriveren kan velge en annen verdi innenfor området; et valg utenfor stopper beregningen.
- **Teknisk grense (`teknisk_maks`).** Øvre grense i et område som bare er teknisk, som 365 dager per trinn. Den vises som «av tekniske grunner høyst», ikke som en klinisk grense.
- **Krav om begrunnelse (`begrunnelseskrav`).** Et valg over eller under en grense, eventuelt bare når et spørsmål er besvart med ja, krever en skriftlig begrunnelse. Uten den stopper beregningen og ber om begrunnelsen eller en annen verdi. Med den står valget, kravet og begrunnelsen i planen. Hvert krav har sitt eget grunnlag og kan avklares og godkjennes for seg.
- **Spørsmål (`sporsmal`).** Et ja/nei-spørsmål som må besvares før beregningen. Svaret står i planen. Et spørsmål med `krever_begrunnelse` krever en skriftlig begrunnelse når svaret er ja, som doserammen.

**Godkjenningen gjelder området og kravene, ikke hvert valg.** Hvilke verdier som er justerbare, områdene, kravene om begrunnelse og spørsmålene er en del av regelen og fingeravtrykket. En godkjenning dekker dermed ethvert valg innenfor området når kravene er oppfylt.

**I verktøyet** står spørsmålene sammen med bekreftelsene og unntaket under «Forutsetninger for regelen». Valgene og feltet «Begrunnelse for valgene» står i feltgruppen «Tilpasning av planen». Hvert felt viser regelens forslag og området, og et tomt felt bruker forslaget. Hjelpeteksten sier når begrunnelse kreves, også ved en dose utenfor rammen, og at den ikke skal inneholde navn eller andre personopplysninger. Alt tas vare på gjennom en oppdatering av appen som resten av skjemaet, og begynner på nytt når strategien skiftes.

## 6. Varianter og avvik fra prinsippet

- **Langsom variant etter tidligere seponeringssymptomer** (`seponering-<stoff>-langsom`, alle 12 stoffene med beregnbar regel). 1–5 % per trinn, standard 5 %, minst 28 dager (fagkontrollen, beslutning 5.6), og høyst 6 reduksjoner per plan (substanskontrollen, beslutning 6). Forsvinner et trinn på 1 % i avrundingen, stopper planen ved dosen før. Forskriveren bekrefter at de tidligere symptomene var seponeringssymptomer. Hovedregelen viser hit når unntaket gjelder.
- **Fluoksetin.** Hovedregelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. Hvert trinn varer minst 28 dager, fordi seponeringssymptomer kan komme sent; forskriveren kan velge lengre trinn, f.eks. 42 dager. Etter lang behandlingstid krever mer enn 10 % per trinn en begrunnelse (beslutning 8). Fluoksetin 5 mg kan være et frivillig vurderingspunkt; det er ikke en grense i regelen.
- **Fluoksetin 20 mg annenhver dag** (`seponering-fluoksetin-annenhver-dag`). En egen, valgfri regel fra nøyaktig 20 mg daglig (fagkontrollen, beslutning 5.10; substanskontrollen, beslutning 7 og 8): 20 mg annenhver dag i minst 28 dager før revurdering, uten automatisk seponering og bare for fluoksetin. Symptomer kan kreve en vurdering før dag 28. Etter tidligere seponeringssymptomer gjelder den ikke. Forskriveren kan velge lengre tid. Regelen bruker fasen `intervalldosering` (avsnitt 7).
- **Fluvoksamin.** Døgndoser over 150 mg gis fordelt på 2 eller 3 doser, hver høyst 150 mg (preparatomtalen, beslutning 8). Planen viser fordelingen.
- **Mirtazapin.** Har tidligere seponeringssymptomer vært søvnrelaterte, styres senere reduksjoner av responsen (beslutning 8).
- **Paroksetin.** Studiene i preparatomtalen trappet ned 10 mg per uke. Det står bare som historisk bakgrunn i regelen, er ikke en anbefaling og beregnes ikke. Studievarianten er fjernet fra alle regelsett (beslutning 5.9).
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping, mens RCPsych regner moklobemid med høyest risiko. Regelen følger RCPsych, og konflikten står i regelen. Ved alvorlig nedsatt leverfunksjon reduserer preparatomtalen dosen; det er et eget unntak i begge variantene, i tillegg til bekreftelsen om organfunksjon. Kontraindiserte legemidler og akutte forvirringstilstander stopper planleggingen. Døgndosen gis fordelt på 2 doser, og planen viser det.
- **De trisykliske (amitriptylin, klomipramin, nortriptylin).** Kardiovaskulær risiko, antikolinerge effekter og interaksjoner står i forutsetningene og omfattes av bekreftelsen om organfunksjon og interaksjoner. Grensene for startdosen står i avsnitt 4. Andre indikasjoner, som smerte og migreneprofylakse for amitriptylin, er tillatt.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram** er flyttet fra pilotsettet (P4) til P7-reglene og følger P7-prinsippet i middelsgruppen. Historikken fra pilotsettet er beholdt.
- **Citalopram, hyperbolsk regel** (`seponering-citalopram-hyperbolsk`, versjon 4). Fagkontrollen (beslutning 5.8) godkjente den ikke som valgbar klinisk strategi. Den er flyttet til sammenlignings- og utviklingssettet, ligger ikke i verktøyet og har status utkast. Fra 2,5 mg tar 5 % per trinn om lag 18 reduksjoner ned til om lag 1 mg i hovedregelen, over to planer med horisonten på 12.
- **Bupropion** er bare fagtekst (versjon 5), **klinisk godkjent** i substanskontrollen 30.10.2026 som den står, bare som tekstregel. Norske preparater er depottabletter som ikke kan deles, så ingen døgndose under 150 mg kan gis, og den prosentvise regelen kan ikke beregnes. Avslutningen vurderes individuelt fra en dose som kan gis.
- **Agomelatin** er bare fagtekst (versjon 1), **klinisk godkjent** i substanskontrollen 30.10.2026 (beslutning 9). Godkjenningen gjelder bare utsagnet om at nedtrapping ikke er nødvendig (Valdoxan 4.2), ikke tilbakefallsrisiko, oppfølging av depresjon, leverskade eller overgang til andre legemidler. Avgrensningen står i godkjenningen og vises i verktøyet.
- **Duloksetin og venlafaksin** er tekstregler (versjon 6). Substanskontrollen godkjente ikke en beregnbar plan med dagens formuleringer, verken hovedregelen eller den langsomme varianten: trinnene kan ikke gis med hele enterokapsler (duloksetin 30 og 60 mg) eller depotkapsler (venlafaksin 37,5, 75 og 150 mg), og en praktisk grense løser ikke det. De langsomme variantene er fjernet. Reglene beholder kildegrunnlaget, kontraindikasjonene (duloksetin: leversykdom og alvorlig nedsatt nyrefunksjon) og grensen for indikasjon (venlafaksin: høyst 225 mg utenom depressive episoder, 375 mg ved dem), og står til faglig kontroll til en dokumentert metode for mindre doser foreligger.
- **Pilotreglene sertralin → mirtazapin og fluoksetin → fenelzin** (P4, versjon 2) seponerer fortsatt det første legemidlet, fordi et bytte og en utvasking før en MAO-hemmer krever det. Kravet om individuell avslutning gjelder bare rene seponeringsregler.

## 7. Ingen nulltrinn: avslutningen vurderes individuelt

Fagvurderingen (beslutning 2) avviste alle sluttdosene som automatisk trinn til null, fagkontrollen 30.10.2026 (beslutning 3 og 4) avviste også en fast nedre grense og en automatisk avslutning, og substanskontrollen (beslutning 6) ga teksten om siste dose. **Verktøyet skal aldri blande sammen siste dose algoritmen kan beregne med siste dose pasienten trenger før seponering.** Derfor gjelder dette for alle seponeringsregler, også den hyperbolske i sammenligningssettet:

- **Planen går ikke til null og foreslår ingen dato for siste dose.** Hver plan slutter med siste beregnede dose, som fortsetter til planen revurderes, og en forklaring på hvorfor planen stopper der. Den sier alltid, med kontrollørens ord: «Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose.» Deretter: planen går ikke til null og foreslår ingen dato for siste dose, og en ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, med tidligere symptomer, toleranse og utsettelser.
- **Dagene er tidligste tidspunkt.** Planen sier at dagene og datoene er tidligste mulige tidspunkt dersom alle tidligere reduksjoner gjennomføres som planlagt, og at et utsatt trinn forskyver alle senere.
- **Hvorfor planen stopper** (`trinnTilHorisont` i `beregning.ts`), med kortformens siste linje:
  - *Teknisk planhorisont:* etter 12 reduksjoner, 6 i de langsomme variantene. «teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt». Videre nedtrapping beregnes fra dosen pasienten da bruker.
  - *Reduksjonen forsvinner i avrundingen:* neste trinn ville vist samme dose som det forrige, så det er ikke et trinn. «neste reduksjon forsvinner i avrundingen; avslutning vurderes individuelt». Eksempel: 1 % fra 0,55 mg citalopram gir 0,54, 0,53, 0,52, 0,51 og 0,5 mg; 0,495 mg vises som 0,5 mg.
  - *Praktisk grense:* neste trinn ville vært under laveste dose formuleringen kan gi. Ingen regel bruker den nå.
  - *Teknisk grense:* neste trinn ville vært under 0,01 mg, den minste dosen beregningen viser, så ingen dose vises som «0 mg».
  - *Strategiens siste trinn før null* (bare den hyperbolske).
  - *Neste trinn kan ikke gis med preparatene* (P5, avsnitt 10).
  - *Annenhver dag:* «annenhver dag i minst 28 dager; avslutning vurderes individuelt». Planen gjør ingen ny reduksjon av seg selv, og symptomer kan kreve en vurdering tidligere. Pasienten fortsetter med doseringen til forskriveren har vurdert videre nedtrapping.
- **Ingen reduksjon i det hele tatt:** forsvinner allerede første reduksjon i avrundingen, eller ville første trinn kommet under 0,01 mg, stopper beregningen og sier at videre nedtrapping må vurderes individuelt.
- **Kontrollen og godkjenningen håndhever det** (`nulltrinnfeil` i `modell.ts`). Hvert forløp i en beregnbar seponeringsregel, også et gruppemedlems egne faser, må slutte med en nedtrapping med individuell avslutning eller en intervalldosering, kan ikke trappe ned før den og kan ikke ha en seponeringsfase, så ingen vei fører til null, heller ikke underveis. Bytter og regler som bare er tekstlige er unntatt. Regelkontrollen krever i tillegg en planhorisont ved individuell avslutning, ingen horisont ellers, ingen sluttdose ved individuell avslutning og en sluttdose i en prosentvis nedtrapping som skal gå til 0. Regelkontrollen avviser en regel som bryter dette, og godkjenningskontrollen regner den aldri som klinisk godkjent, selv om statusen og fingeravtrykket sier det. For en godkjent regel kontrollerer beregningen i tillegg selve planen (`nulldagfeil` i `beregning.ts`): hvert forløp må ha dose hver dag fra start og fortsette uten slutt, ellers stopper den.

**Fagkontrollen 30.10.2026 avgjorde at avslutningen alltid vurderes individuelt** (beslutning 4). Verktøyet viser dosen pasienten står på, reduksjonene så langt, at symptomresponsen må vurderes, og at forskriveren avgjør. Fluoksetin og vortioksetin kan ha enklere alternativer forskriveren velger; for fluoksetin er det regelen for annenhver dag. Bupropion avsluttes individuelt fra en depotdose som kan gis.

## 8. Varighet

Reglene har ingen minste varighet for nedtrappingen: hvert trinn er en minstetid, og planen går ikke til null, så en samlet varighet å måle til finnes ikke. Med standardvalgene står pasienten på siste dose fra for eksempel:

- citalopram 20 mg: dag 309, 0,64 mg (horisonten, 12 reduksjoner);
- citalopram 20 mg i den langsomme varianten: dag 141, 14,71 mg (horisonten, 6 reduksjoner);
- paroksetin 20 mg med 5 % per trinn (stresstesten i fagvurderingen): dag 309, 10,81 mg (horisonten); den neste planen beregnes fra den dosen;
- citalopram 2,5 mg med 5 % per trinn: 1,36 mg etter 12 reduksjoner, og 1 mg etter 6 til i den neste planen.

Preparatomtalenes egne formuleringer (f.eks. «minst én til to uker» for flere SSRI og «over flere uker eller måneder» for paroksetin) står i begrunnelsene.

## 9. Stoffer uten beregnbar regel, og hva som mangler

| Stoff | Status | Hva som mangler |
| --- | --- | --- |
| Agomelatin | Bare fagtekst, klinisk godkjent | Preparatomtalen sier at nedtrapping ikke trengs. Det finnes bare preparater med godkjenningsfritak. Godkjenningen gjelder bare det utsagnet (avsnitt 6). |
| Bupropion | Bare fagtekst, klinisk godkjent | Depottablettene kan ikke deles, så ingen trinn under 150 mg kan gis (avsnitt 6). |
| Duloksetin, venlafaksin | Bare fagtekst, til faglig kontroll | Trinnene kan ikke gis med kapslene; en dokumentert metode for mindre doser mangler (avsnitt 6). |
| Fenelzin, tranylcypromin | Mangler anbefaling / begrenset | Bare preparater med godkjenningsfritak og ingen norsk preparatomtale. Fagkontrollen: ingen regler nå. For fenelzin er Stop-oppføringen heller ikke tilgjengelig (P3), og seponering av en irreversibel MAO-hemmer bør skje med spesialist (NICE 1.9.5). |
| Doksepin, imipramin, trazodon | Begrenset | Ingen norsk preparatomtale (for doksepin lenker FEST ikke til noen). Fagkontrollen: kan senere få utkast fra utenlandske preparatomtaler. |
| Dosulepin, maprotilin | Begrenset | Ingen preparater i FEST. Fagkontrollen: venter. |

## 10. Beregning med norske preparater

Reglene gir den ideelle dosekurven. Doseplanmotoren (P5) setter sammen hver dose av preparatene i FEST:

- hele tabletter og kapsler;
- halve og kvarte tabletter bare der FEST oppgir dem som delbare; depottabletter og enterokapsler deles ikke;
- hele dråper når dråper er valgt;
- når regelen krever at døgndosen fordeles (fluvoksamin over 150 mg, moklobemid), bare doser som kan fordeles slik, med hver dose høyst grensen. Planen viser fordelingen, f.eks. «fordelt på 2 doser: 100 + 50 mg». Kan en nøyaktig dose gis, men ikke fordeles, stopper planen med den forklaringen.

Ingen regel har toleranse (beslutning 5.7), heller ikke med dråper: en dose som ikke er et helt antall dråper, kan ikke gis. Kan et trinn ikke gis nøyaktig, **stopper planen ved trinnet før** og står på siste dose som kan gis, med forklaringen: hvilket trinn som ikke kan gis, de nærmeste dosene og at planen stopper ved trinnet før. Kan allerede første trinn ikke gis, stopper beregningen med de nærmeste dosene og den **faktiske reduksjonen** hver av dem ville gitt. En annen dose, et større avvik eller en annen formulering er et nytt forslag med sin egen reduksjon og krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. Laveste styrke blir aldri en slutt i seg selv. Eksempler fra testene (syntetiske preparater):

- Sertralin 100 mg med 25, 50 og 100 mg-tabletter: 75 mg kan gis, men 56,25 mg kan ikke. Planen står på 75 mg.
- Paroksetin 40 mg med delbare 20 mg-tabletter: 36 mg kan ikke gis.
- Klomipramin 100 mg: 75 mg kan gis, men 56,25 mg kan ikke med hele og halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg med 50 % valgt og begrunnet: 20, 10 og 5 mg kan gis med tabletter som kan deles i fire, og planen står på 5 mg. Med dråper på 1 mg fra 20 mg: 10 og 5 mg.
- Fluoksetin 20 mg annenhver dag: én tablett eller kapsel hver gang.
- Testoksetin-dråper på 1 mg fra 20 mg med 10 %: 18 mg er 18 dråper, men 16,2 mg kan ikke gis; planen står på 18 mg (`docs/verktøy-p5-testtilfeller.md`).
- Testoksetin fra 40 mg med fordeling over 20 mg: 30 mg gis som 20 + 10 mg; med bare 30 mg-tabletter som ikke kan deles, stopper planen.

**Flytende former (beslutning 5.7).** Dråper med dokumentert mengde per dråpe brukes når de er valgt; Cipralex dråper har 1 mg per dråpe i FEST og kan dermed gi escitalopramdoser under 5 mg. Miksturer og konsentrater uten dokumentert doseringsoppløsning brukes ikke. Zoloft konsentrat (20 mg/ml) står i FEST uten oppløsning for oppmålingen, så det er fortsatt sperret; det trenger dokumentert dose per ml, oppmålingsoppløsning og nøyaktighet før P5 kan bruke det (avsnitt 11).

## 11. Faglige beslutninger

**Avgjort i fagvurderingen 29.10.2026 og fagkontrollen 30.10.2026** (ikke en formell klinisk godkjenning; hver avklaring står på det den gjelder):

- **Beslutning 1 – valgområdene:** risikogruppene, områdene, standardverdiene og kravene om begrunnelse i avsnitt 4, behandlingstiden som må oppgis, og at trinnene forlenges ved symptomer uten automatisk neste reduksjon.
- **Beslutning 2 – sluttdosene:** alle avvist som automatisk trinn til null.
- **Beslutning 3 – nedre grense:** ingen fast klinisk nedre grense. Planen har en teknisk planhorisont og fortsetter fra faktisk dose, med tre utfall: et trinn som kan gis, et trinn som ikke kan gis (stopp med forklaring), eller planen stopper ved horisonten. Praktiske grenser for venlafaksin (37,5 mg) og duloksetin (30 mg); bupropion kan ikke beregnes med depottabletter.
- **Beslutning 4 – avslutningen:** ingen automatisk avslutning; den vurderes alltid individuelt, og verktøyet foreslår aldri en dato for siste dose.
- **Beslutning 5:** begrunnelse over 10 % ved lang behandlingstid i middelsgruppen (5.3); høyst 25 % fra laveste døgndose som konservativ øvre ramme (5.4); doserammen for indikasjon og pasientgruppe (5.5); langsom variant og organfunksjon for alle stoffer (5.6); ingen toleranse, forklart stopp og dokumenterte flytende former (5.7); den hyperbolske citalopramregelen bare i sammenligningssettet (5.8); studievarianten fjernet (5.9); fluoksetin annenhver dag (5.10); stoffene med begrensning (5.11).

**Avgjort i substanskontrollen 30.10.2026, runde 3** (beslutning 6–9):

- **Beslutning 6 – planhorisonten:** 12 reduksjoner som teknisk maksimalhorisont i hovedreglene, 6 i de langsomme variantene. Hvert trinn krever en ny vurdering av toleransen, en ny plan beregnes fra dosen som faktisk brukes og er bekreftet, dagene er tidligste tidspunkt, og teksten om siste dose er kontrollørens. En reduksjon som forsvinner i avrundingen, er ikke et trinn; beregnet, vist og gitt dose er den samme.
- **Beslutning 7 – startdosen:** positiv dose opp til høyeste voksendose er den ytre rammen; over den stopper beregningen uten overstyring. Grensene for pasientgruppe og indikasjon skiller mellom høyeste dose (stopper) og forsiktighetsgrense (begrunnelse). Under 18 år, akutte alvorlige forhold, ustabil dose, uregelmessig inntak, bytte og kontraindikasjoner stopper. Annenhver dag bare fra nøyaktig 20 mg.
- **Beslutning 8 – substanskontrollen av regelversjon 5:** 25 regler godkjent med endring (endringene står i avsnitt 4 og 6), duloksetin og venlafaksin (hovedregel og langsom variant) ikke godkjent som beregnbare planer, og bupropions tekstregel godkjent som den står.
- **Beslutning 9 – agomelatin:** tekstregelen godkjent som egen beslutning, avgrenset til utsagnet om at nedtrapping ikke er nødvendig.

**Registrerte kliniske godkjenninger.** Bare de to uttrykkelige godkjenningene er registrert, av «ChatGPT (uavhengig fagkontrollør)» 30.10.2026, med fingeravtrykkene kontrolløren oppga: bupropion versjon 5 (`e7536668…b5f5f`) og agomelatin versjon 1 (`6d42863f…a2d1`). Fingeravtrykkene stemmer med reglene, og en test holder dem fast; endres en av reglene, faller godkjenningen bort. «Godkjent med endring» er ikke registrert som godkjenning: de 25 reglene er omarbeidet til versjon 6 (de langsomme variantene og annenhver dag versjon 2) og sendt til ny uavhengig kontroll. Ingen automatisk seponering.

**Kontrollrunden 30.10.2026 (P4.8 og P7.5, substans- og kildevurdering av HEAD `45fa29b`):** P4.8 og P7.5 er gjennomgått, men ikke bestått. Ingen nye regler er godkjent, og bupropion og agomelatin er uendret. Prinsippene i beslutning 2–7 er godtatt som modellprinsipper, ikke som endelig godkjenning: 12 og 6 trinn er en teknisk visningshorisont som ikke betyr fullført nedtrapping, risikogruppene er et forsiktig startområde og ikke en validert hastighet per pasient, og en begrunnelse alene er ikke evidens for at et raskt valg er forsvarlig. Alle tolv virkestoffene har betinget aksept av det farmakologiske prinsippet (ikke klinisk godkjenning), med forbehold som allerede står i reglene: lavdose og QT for citalopram, dråper for escitalopram, Zoloft konsentrat sperret, annenhver dag bare fra 20 mg for fluoksetin, fordeling for fluvoksamin og moklobemid, at prosentregimet for vortioksetin er OUSFARs forslag, forsiktighetsgrensene for amitriptylin, klomipramin og nortriptylin, og at paroksetins studievariant er ute. Oppfølgingen:

- **Aksepttest med norske preparater (E.2).** Hver hovedregel og langsom variant er regnet med de faktiske preparatene i et lagret FEST-uttrekk, for hver legemiddelform, ved vanlig dose, lang behandlingstid, tidligere seponeringssymptomer, lav dose og videreføring (`docs/verktøy-p7-aksepttest.md`). **Resultatet er at reglene sjelden gir mer enn én reduksjon:** i halvparten av kombinasjonene av virkestoff og form stopper planen allerede ved første trinn, fordi prosenttrinnene ikke kan gis nøyaktig med tablettstyrkene og delingen i FEST, og ingen toleranse er godkjent. Hvordan reglene eventuelt skal tilpasses tilgjengelige doser, er et faglig valg til neste kontroll; verktøyet viser ingen av planene.
- **Fordeling bare på like store doser.** Doseplanmotoren bruker ikke lenger ujevne fordelinger av døgndosen (som 20 + 10 mg), fordi ingen regel dokumenterer dem; en dose som bare kan fordeles ujevnt, stopper planen (doseplanmotor 4).
- **Pilotreglene (P4.8).** De fire byttereglene er rettet eller avgrenset (versjon 3), og depotreglene er registrert som kildemessig akseptable som avgrensede varianter, ikke klinisk godkjent (`docs/verktøy-p4-regelmodell.md`).
- **Klinisk ansvar.** Kontrollen sier at en signert klinisk godkjenning må knyttes til en navngitt fagansvarlig lege etter bestått uavhengig kontroll; en AI-kontroll alene overfører ikke klinisk ansvar. Bidragsyteren avgjorde 30.10.2026 at en klinisk godkjenning ikke skal kreve signatur fra en navngitt lege: godkjenninger registreres som før, med kontrollør, dato, regelversjon, omfang og fingeravtrykk, og godkjenningene av bupropion og agomelatin står. Dette avviker bevisst fra kontrollens anbefaling (E.3).

**Gjenstår før P4.8 og P7.5 kan godkjennes for de beregnbare reglene:**

1. **Ny uavhengig kontroll av regelversjon 6:** de 12 hovedreglene, de 12 langsomme variantene, fluoksetin annenhver dag og tekstreglene for duloksetin og venlafaksin. Særlig grensene for startdosen i avsnitt 4, der grensen for nortriptylin hos eldre (50 mg) og det at paroksetin og nortriptylin spør om «eldre» uten alder, er OUSFARs valg ut fra preparatomtalen.
2. **Klinisk nytte med norske preparater:** aksepttesten viser at de fleste planene stopper ved første eller andre trinn. Det må avgjøres faglig om reglene skal tilpasses dosene som kan gis, eller vises som forklarende tekst (kontrollrunden 30.10.2026, B.3).
3. **Zoloft konsentrat (P5):** dokumentert dose per ml, oppmålingsoppløsning og nøyaktighet før konsentratet kan brukes.
4. **Duloksetin og venlafaksin:** en dokumentert metode for mindre doser før en beregnbar regel kan vurderes på nytt.
5. **Senere, når det bestemmes:** utkast for doksepin, imipramin og trazodon fra utenlandske preparatomtaler. Fenelzin og tranylcypromin får ingen regler nå; dosulepin og maprotilin venter.

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
| Behandlingstiden må registreres | Spørsmålet om lang behandlingstid må besvares, og svaret står i planen. |
| Felles håndteringsregel | Dagene er minstetider; neste reduksjon utsettes og trinnet forlenges så lenge symptomene varer; en endring gir en ny plan fra aktuell dose. Står i bekreftelsen. |
| Beslutning 2: alle sluttdoser avvist | Ingen plan går til null; avslutningen vurderes individuelt. Minste varighet er fjernet. |
| Escitalopram | Flyttet fra pilotsettet til P7-reglene, i middelsgruppen. |

Kontrollene av regelversjon 4 (ChatGPT, 30.10.2026) fant to veier til null som kontrollen slapp gjennom: en direkte seponering, og en tidligere nedtrapping som gikk til 0 mg før en opptrapping. Kravet gjelder nå hele forløpet og godkjenningen, bare siste fase kan trappe ned, og beregningen av en godkjent regel stopper ved en dag uten dose eller en slutt (avsnitt 7).

**Fagkontrollen 30.10.2026** (av regelversjon 4), regelversjon 5:

| Kontrollpunkt | Endring |
| --- | --- |
| Beslutning 3: ingen fast nedre grense | Den nedre grensen (en firedel av laveste døgndose) er fjernet. Planen har en teknisk horisont på 12 reduksjoner og stopper ellers ved en praktisk grense, ved 0,01 mg eller ved et trinn som ikke kan gis, alltid med forklaring. Praktiske grenser for venlafaksin og duloksetin. |
| Beslutning 4: avslutningen alltid individuell | Hver plan sier at siste beregnede dose ikke er siste dose før seponering, og foreslår ingen dato for siste dose. |
| Beslutning 5.5: høyeste døgndose er ingen automatisk ramme | Spørsmålet om doserammen; et ja krever begrunnelse. |
| Beslutning 5.6: tidligere seponeringssymptomer og organfunksjon | En langsom variant per stoff (1–5 %, minst 28 dager) i stedet for at regelen ikke gjelder; bekreftelsen om organfunksjon og interaksjoner for alle stoffer. |
| Beslutning 5.7: ingen toleranse | Doseplanmotoren stopper ved trinnet før et trinn som ikke kan gis, og viser faktisk reduksjon når første trinn ikke kan gis. Dokumenterte dråper brukes; Zoloft konsentrat er fortsatt sperret. |
| Beslutning 5.8 og 5.9 | Den hyperbolske citalopramregelen er flyttet til sammenligningssettet; studievarianten er fjernet. |
| Beslutning 5.10 | Fluoksetin 20 mg annenhver dag som egen regel. |
| Bupropion | Bare fagtekst, fordi depottablettene ikke kan deles. |
| Grensetester | Horisonten på akkurat 12, de praktiske grensene like over og under, minste viste dose, den langsomme varianten ved 1, 5 og 5,01 %, doserammen med og uten begrunnelse, manglende organfunksjon, annenhver dag og stopp ved trinnet før. |

**Substanskontrollen 30.10.2026, runde 3** (av regelversjon 5), regelversjon 6 (langsomme varianter og annenhver dag versjon 2):

| Kontrollpunkt | Endring |
| --- | --- |
| Beslutning 6: planhorisonten | 12 reduksjoner i hovedreglene, 6 i de langsomme variantene, begge avklart. Hvert trinn avrundes til den viste dosen, og en reduksjon som forsvinner i avrundingen, stopper planen ved dosen før. Kontrollørens tekst om siste dose, og at dagene er tidligste tidspunkt. Startforslaget sier at hvert trinn krever en ny vurdering av toleransen. |
| Beslutning 7: startdosen | Den ytre rammen avklart. Grenser for eldre, indikasjoner og nedsatt leverfunksjon som stopper eller krever begrunnelse; spørsmålene står i regelen. Felles stopp for under 18 år, akutte forhold, ustabil dose og bytte; kontraindikasjoner som ikke kan begrunnes bort. Annenhver dag bare fra nøyaktig 20 mg. |
| Beslutning 8: per regel | Fluoksetin: begrunnelse over 10 % ved lang behandlingstid. Fluvoksamin og moklobemid: fordeling av døgndosen i planen. Mirtazapin: søvnrelaterte symptomer. De trisykliske: kardiovaskulær risiko, antikolinerge effekter og interaksjoner. Duloksetin og venlafaksin gjort om til tekstregler; de langsomme variantene fjernet. |
| Beslutning 8 og 9: bupropion og agomelatin | Klinisk godkjent med kontrollørens fingeravtrykk; verktøyet viser fagteksten med godkjenningen og avgrensningen. |
| Grensetester | Hver grense for startdosen ved og rett over, med og uten begrunnelse; citalopram 40/40,01 mg og de andre ytre rammene; 0 mg og minste positive dose; stoppene og kontraindikasjonene; annenhver dag ved 19,99, 20 og 20,01 mg; horisonten på 6; avrunding fra 0,55 og 0,5 mg med 1 %; deling av døgndosen; dråper uten toleranse. Alle forventede planer er regnet ut på nytt og kontrollert mot en uavhengig utregning. |

**Kontrollrunden 30.10.2026** (P4.8 og P7.5, av regelversjon 6; ingen nye godkjenninger):

| Kontrollpunkt | Endring |
| --- | --- |
| E.2: aksepttest per virkestoff | Ny rapport `docs/verktøy-p7-aksepttest.md` med scenariene (a)–(g), regnet med et lagret FEST-uttrekk (`src/data/verktoy/fest-aksepttest.json`, hentes med `npm run verktoy:regler -- hent-fest`). Testene holder rapporten oppdatert og kontrollerer at ingen plan er klinisk, går til null eller bruker deler av dråper. |
| Fluvoksamin: ingen ujevne fordelinger | Doseplanmotor 4 fordeler døgndosen bare på like store doser. |
| Nortriptylin: 50 mg hos eldre | Merket som OUSFARs forsiktighetsvalg, ikke kontrollens eller preparatomtalens grense. |
| Godkjenning bare av nøyaktig versjon | Uendret: fingeravtrykket, uavhengig kontrollør og ingen åpne valg kreves, og «godkjent med endring» er ikke registrert som godkjenning. |

## 13. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen står bare i sammenlignings- og utviklingssettet.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 14. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer alle regelsettene, også sammenligningssettet. Den sjekker kilder, påstandsnære henvisninger, grunnlag, godkjenning, justerbare verdier, spørsmål, krav om begrunnelse, individuell avslutning og planhorisont, og at hvert regneeksempel stemmer med beregningen, også med forskriverens valg, svar og begrunnelse.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene, forskriverens valg og doseplanene som beskrevet over, og at aksepttesten med norske preparater er oppdatert (`npm run verktoy:regler -- aksepttest`).
- `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i appens regelsett. `verktoyside.test.tsx` tester også feltene for forskriverens valg, spørsmålene og begrunnelsen.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og en egen test kontrollerer at bare verktøyene bruker de nye reglene.
