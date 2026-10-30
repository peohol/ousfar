# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`. Det ble skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5) og er omarbeidet etter to kontroller, fagvurderingen 29.10.2026 og fagkontrollen 30.10.2026 (avsnitt 12). Reglene er nå versjon 5; reglene som kom til etter fagkontrollen 30.10.2026, er versjon 1. **Ingen regel er klinisk godkjent, og verktøyet viser ingen doseplan.** Fagvurderingene er ikke en formell klinisk godkjenning. P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i tre rapporter:

- `docs/verktøy-p7-dekning.md` er kilde- og dekningsmatrisen. Den har én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke i FEST, en eventuell praktisk grense i regelen, status, regler, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` viser hver regel med kildetro utsagn, OUSFARs tilpasninger og parametre med grunnlag, område og krav om begrunnelse. Den viser også bekreftelser, spørsmål, unntak, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.
- `docs/verktøy-p7-sammenligning.md` er sammenlignings- og utviklingssettet. Det har bare den hyperbolske citalopramregelen, som ikke er en valgbar klinisk strategi og ikke ligger i verktøyet.

Alle lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 14 med beregnbare regler under faglig kontroll, 2 med bare fagtekst (agomelatin og bupropion), 1 som mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | Regelsettet `ousfar-verktoy-nedtrapping` (versjon 5) har 31 regler: for hvert av de 14 stoffene en hovedregel (versjon 5) og en langsom variant etter tidligere seponeringssymptomer (versjon 1), fluoksetin 20 mg annenhver dag (versjon 1) og tekstreglene for bupropion (versjon 5) og agomelatin (versjon 1). Escitalopram er flyttet hit fra pilotsettet. Den hyperbolske citalopramregelen ligger i sammenligningssettet `ousfar-verktoy-nedtrapping-sammenligning`. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts`, `src/components/verktoy/Verktoyside.tsx` | Appen bruker pilotsettet og P7-reglene sammen, men ikke sammenligningssettet. Har et stoff flere regler, velger forskriveren strategi (hovedregel, langsom variant eller annenhver dag). Et stoff uten regel får forklaringen fra dekningen. En plan oppgir regelsettet regelen hører til. Skjemaet ber om bekreftelsene, spør om behandlingstiden og om dosen er utenfor rammen for indikasjon eller pasientgruppe, og lar forskriveren velge trinnstørrelse og trinnlengde innenfor regelens områder, med et felt for begrunnelse (avsnitt 5). |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts`, `verktoyside.test.tsx` | Testene dekker dekningen mot regelsettet, P3 og FEST, og reglene ved grenseverdiene: horisonten på akkurat 12 reduksjoner, de praktiske grensene like over og under, minste viste dose, risikogruppene, den langsomme varianten ved 1, 5 og 5,01 %, kravene om begrunnelse, doserammen med og uten begrunnelse, organfunksjon, annenhver dag, og at ingen beregning går til null. Doseplaner med syntetiske preparater viser at planen stopper ved trinnet før et trinn som ikke kan gis, og stopper med faktisk reduksjon når allerede første trinn ikke kan gis. Den kliniske sperren testes med fersk og foreldet FEST, og det testes at fortolkningen ikke bruker reglene. |

Reglene bruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5. Etter fagkontrollene har modellen fått spørsmål, krav om begrunnelse, tekniske grenser, individuell avslutning med teknisk planhorisont og dosering med intervall (regelmodell 6, beregningsmotor 4, doseplanmotor 2; avsnitt 5 og 7). Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

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
- **Fagvurderingen 29.10.2026** (beslutning 1 og 2) og **fagkontrollen 30.10.2026** (beslutning 3–5, avsnitt 11) er grunnlaget for valgområdene, standardverdiene, kravene om begrunnelse, den langsomme varianten, doserammen, de praktiske grensene og for at ingen plan går til null. Hver avklaring står på parameteren, kravet, bekreftelsen eller unntaket den gjelder, med dato og rolle.
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST** brukes til å sette sammen dosene (P5) og til matrisens laveste styrke.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i kilden.

## 3. Startforslag, ikke fast tidsplan

Hver beregnbar regel gir et **startforslag**. Det er bygd inn på disse måtene:

- **Bekreftelse (`startforslag`).** Forskriveren må bekrefte at planen er et startforslag og at dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige, og til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker (NICE 1.4.16, 1.4.21; RCPsych). Uten bekreftelse stopper beregningen.
- **Bekreftelse (`organfunksjon_interaksjoner`).** Forskriveren må bekrefte at lever- og nyrefunksjon og interaksjoner er vurdert, for alle stoffer (fagkontrollen, beslutning 5.6). Ved nedsatt organfunksjon eller interaksjoner må dosen og planen vurderes individuelt.
- **Spørsmål (`lang_behandlingstid`).** Har pasienten brukt legemidlet i mange måneder eller lenger (RCPsychs formulering; ingen eksakt grense)? Svaret står i planen og avgjør om noen valg krever begrunnelse (avsnitt 4).
- **Spørsmål (`utenfor_doseramme`).** Er dosen utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel eldre eller nedsatt organfunksjon? Høyeste døgndose for voksne er ingen automatisk godkjent ramme (beslutning 5.5). Et ja krever en skriftlig begrunnelse, en særskilt vurdering; uten den stopper beregningen.
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
| Nedre grense | Fagkontrollen, beslutning 3 | **Ingen fast klinisk nedre grense.** Dosene er alltid over 0. Planen stopper ved den tekniske planhorisonten, ved formuleringens praktiske grense eller ved et trinn som ikke kan gis (avsnitt 7). |
| Planhorisont | OUSFARs tekniske valg | Høyst 12 reduksjoner per plan (`PLANHORISONT_TRINN` i `bygg.ts`). En teknisk grense, ikke en klinisk; planen fortsetter fra faktisk dose. Åpent forslag. |
| Praktisk grense | Fagkontrollen, beslutning 3 | Bare der formuleringen setter den: venlafaksin 37,5 mg (laveste kapsel) og duloksetin 30 mg (hele enterokapsler). Ingen beregnede trinn under den; lavere doser krever en annen dokumentert formulering. |
| Avslutning | Fagvurderingen, beslutning 2; fagkontrollen, beslutning 4 | Ingen nulltrinn og ingen automatisk avslutning. Siste dose fortsetter til avslutningen er vurdert individuelt (avsnitt 7). |
| Startdose | Preparatomtalens høyeste døgndose for voksne; fagkontrollen, beslutning 5.5 | Enhver dose over 0 opp til høyeste døgndose, også lave restdoser. En dose utenfor rammen for indikasjon eller pasientgruppe krever begrunnelse. Over høyeste døgndose stopper beregningen. Åpent forslag. |
| Toleranse | Fagkontrollen, beslutning 5.7 | Ingen. Et trinn som ikke kan gis nøyaktig, stopper planen med forklaring (avsnitt 10). |

**Risikogruppene (RCPsych tillegg 1) og valgområdene (fagvurderingen, beslutning 1; fagkontrollen, beslutning 5.3):**

| Risikogruppe | Stoffene | Reduksjon per trinn | Dager per trinn | Begrunnelse kreves |
| --- | --- | --- | --- | --- |
| Høyest | duloksetin, mirtazapin, moklobemid, paroksetin, venlafaksin | 5–10 %, standard 10 %. Mer er utenfor regelen. | Minst 28, standard 28 | – |
| Middels | amitriptylin, citalopram, escitalopram, fluvoksamin, klomipramin, nortriptylin, sertralin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid; over 10 % ved lang behandlingstid |
| Middels, fluoksetin | fluoksetin | 5–50 %, standard 25 % | Minst 28, standard 28 | Over 25 % |
| Lav | vortioksetin | 5–50 %, standard 25 % | Minst 14, standard 28 | Over 25 %; under 28 dager ved lang behandlingstid |
| Langsom variant (alle 14) | etter tidligere seponeringssymptomer | 1–5 %, standard 5 %. Mer er utenfor regelen. | Minst 28, standard 28 | – |

Valgområdene og standardverdiene er rammer for individuell planlegging, ikke dokumenterte optimale verdier.

**Startdosen er skilt fra slutten.** En lav aktuell dose beregnes og avvises ikke fordi den er under ordinært behandlingsområde; eksempler er sertralin 12,5 mg, nortriptylin 15 mg og citalopram 2,5 mg. Ville allerede første trinn kommet under den praktiske grensen eller den minste dosen beregningen viser (0,01 mg), stopper beregningen og sier at videre nedtrapping eller avslutning må vurderes individuelt. Dosen kalles ikke ugyldig.

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

- **Langsom variant etter tidligere seponeringssymptomer** (`seponering-<stoff>-langsom`, alle 14 stoffene). 1–5 % per trinn, standard 5 %, minst 28 dager (fagkontrollen, beslutning 5.6). Forskriveren bekrefter at de tidligere symptomene var seponeringssymptomer. Hovedregelen viser hit når unntaket gjelder.
- **Fluoksetin.** Hovedregelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. Hvert trinn varer minst 28 dager, fordi seponeringssymptomer kan komme sent; forskriveren kan velge lengre trinn, f.eks. 42 dager. Fluoksetin 5 mg kan være et frivillig vurderingspunkt; det er ikke en grense i regelen.
- **Fluoksetin 20 mg annenhver dag** (`seponering-fluoksetin-annenhver-dag`). En egen, valgfri regel fra 20 mg daglig (fagkontrollen, beslutning 5.10): 20 mg annenhver dag i minst 28 dager før revurdering, uten automatisk seponering og bare for fluoksetin. Forskriveren kan velge lengre tid. Regelen bruker fasen `intervalldosering` (avsnitt 7).
- **Paroksetin.** Studiene i preparatomtalen trappet ned 10 mg per uke. Det står bare som historisk bakgrunn i regelen, er ikke en anbefaling og beregnes ikke. Studievarianten er fjernet fra alle regelsett (beslutning 5.9).
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping, mens RCPsych regner moklobemid med høyest risiko. Regelen følger RCPsych, og konflikten står i regelen. Ved alvorlig nedsatt leverfunksjon reduserer preparatomtalen dosen; det er et eget unntak i begge variantene, i tillegg til bekreftelsen om organfunksjon.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram** er flyttet fra pilotsettet (P4) til P7-reglene og følger P7-prinsippet i middelsgruppen. Historikken fra pilotsettet er beholdt.
- **Citalopram, hyperbolsk regel** (`seponering-citalopram-hyperbolsk`, versjon 4). Fagkontrollen (beslutning 5.8) godkjente den ikke som valgbar klinisk strategi. Den er flyttet til sammenlignings- og utviklingssettet, ligger ikke i verktøyet og har status utkast. Fra 2,5 mg tar 5 % per trinn om lag 18 reduksjoner ned til om lag 1 mg i hovedregelen, over to planer med horisonten på 12.
- **Bupropion** er bare fagtekst (versjon 5). Norske preparater er depottabletter som ikke kan deles, så ingen døgndose under 150 mg kan gis, og den prosentvise regelen kan ikke beregnes. Avslutningen vurderes individuelt fra en dose som kan gis.
- **Pilotreglene sertralin → mirtazapin og fluoksetin → fenelzin** (P4, versjon 2) seponerer fortsatt det første legemidlet, fordi et bytte og en utvasking før en MAO-hemmer krever det. Kravet om individuell avslutning gjelder bare rene seponeringsregler.

## 7. Ingen nulltrinn: avslutningen vurderes individuelt

Fagvurderingen (beslutning 2) avviste alle sluttdosene som automatisk trinn til null, og fagkontrollen 30.10.2026 (beslutning 3 og 4) avviste også en fast nedre grense og en automatisk avslutning. **Verktøyet skal aldri blande sammen siste dose algoritmen kan beregne med siste dose pasienten trenger før seponering.** Derfor gjelder dette for alle seponeringsregler, også den hyperbolske i sammenligningssettet:

- **Planen går ikke til null og foreslår ingen dato for siste dose.** Hver plan slutter med siste beregnede dose, som fortsetter til planen revurderes, og en forklaring på hvorfor planen stopper der. Den sier alltid: «Siste beregnede dose er ikke nødvendigvis den siste dosen pasienten trenger før seponering. Planen går ikke til null og foreslår ingen dato for siste dose: avslutningen vurderes individuelt ut fra dosen pasienten da bruker, reduksjonene så langt og hvordan pasienten har reagert på dem, og videre seponering krever forskriverens beslutning.»
- **Hvorfor planen stopper** (`trinnTilHorisont` i `beregning.ts`), med kortformens siste linje:
  - *Teknisk planhorisont:* etter 12 reduksjoner. «teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt». Videre nedtrapping beregnes fra dosen pasienten da bruker.
  - *Praktisk grense:* neste trinn ville vært under laveste dose formuleringen kan gi. «praktisk grense: ingen trinn under 37,5 mg; avslutning vurderes individuelt».
  - *Teknisk grense:* neste trinn ville vært under 0,01 mg, den minste dosen beregningen viser, så ingen dose vises som «0 mg».
  - *Strategiens siste trinn før null* (bare den hyperbolske).
  - *Neste trinn kan ikke gis med preparatene* (P5, avsnitt 10).
  - *Annenhver dag:* «annenhver dag i minst 28 dager; avslutning vurderes individuelt». Planen gjør ingen ny reduksjon av seg selv.
- **Ingen reduksjon i det hele tatt:** ville allerede første trinn kommet under den praktiske grensen eller 0,01 mg, stopper beregningen og sier at videre nedtrapping eller avslutning må vurderes individuelt.
- **Kontrollen og godkjenningen håndhever det** (`nulltrinnfeil` i `modell.ts`). Hvert forløp i en beregnbar seponeringsregel, også et gruppemedlems egne faser, må slutte med en nedtrapping med individuell avslutning eller en intervalldosering, kan ikke trappe ned før den og kan ikke ha en seponeringsfase, så ingen vei fører til null, heller ikke underveis. Bytter og regler som bare er tekstlige er unntatt. Regelkontrollen krever i tillegg en planhorisont ved individuell avslutning, ingen horisont ellers, ingen sluttdose ved individuell avslutning og en sluttdose i en prosentvis nedtrapping som skal gå til 0. Regelkontrollen avviser en regel som bryter dette, og godkjenningskontrollen regner den aldri som klinisk godkjent, selv om statusen og fingeravtrykket sier det. For en godkjent regel kontrollerer beregningen i tillegg selve planen (`nulldagfeil` i `beregning.ts`): hvert forløp må ha dose hver dag fra start og fortsette uten slutt, ellers stopper den.

**Fagkontrollen 30.10.2026 avgjorde at avslutningen alltid vurderes individuelt** (beslutning 4). Verktøyet viser dosen pasienten står på, reduksjonene så langt, at symptomresponsen må vurderes, og at forskriveren avgjør. Fluoksetin og vortioksetin kan ha enklere alternativer forskriveren velger; for fluoksetin er det regelen for annenhver dag. Bupropion avsluttes individuelt fra en depotdose som kan gis.

## 8. Varighet

Reglene har ingen minste varighet for nedtrappingen: hvert trinn er en minstetid, og planen går ikke til null, så en samlet varighet å måle til finnes ikke. Med standardvalgene står pasienten på siste dose fra for eksempel:

- citalopram 20 mg: dag 309, 0,63 mg (horisonten, 12 reduksjoner);
- duloksetin 60 mg: dag 141, 31,89 mg (praktisk grense 30 mg, seks reduksjoner);
- venlafaksin 75 mg: dag 141, 39,86 mg (praktisk grense 37,5 mg);
- paroksetin 20 mg med 5 % per trinn (stresstesten i fagvurderingen): dag 309, 10,81 mg (horisonten); den neste planen beregnes fra den dosen.

Preparatomtalenes egne formuleringer (f.eks. «minst én til to uker» for flere SSRI og «over flere uker eller måneder» for paroksetin) står i begrunnelsene.

## 9. Stoffer uten beregnbar regel, og hva som mangler

| Stoff | Status | Hva som mangler |
| --- | --- | --- |
| Agomelatin | Bare fagtekst | Preparatomtalen sier at nedtrapping ikke trengs. Det finnes bare preparater med godkjenningsfritak. Fagkontrollen 30.10.2026 sa at tekstregelen kan godkjennes faglig (se avsnitt 11). |
| Bupropion | Bare fagtekst | Depottablettene kan ikke deles, så ingen trinn under 150 mg kan gis (avsnitt 6). |
| Fenelzin, tranylcypromin | Mangler anbefaling / begrenset | Bare preparater med godkjenningsfritak og ingen norsk preparatomtale. Fagkontrollen: ingen regler nå. For fenelzin er Stop-oppføringen heller ikke tilgjengelig (P3), og seponering av en irreversibel MAO-hemmer bør skje med spesialist (NICE 1.9.5). |
| Doksepin, imipramin, trazodon | Begrenset | Ingen norsk preparatomtale (for doksepin lenker FEST ikke til noen). Fagkontrollen: kan senere få utkast fra utenlandske preparatomtaler. |
| Dosulepin, maprotilin | Begrenset | Ingen preparater i FEST. Fagkontrollen: venter. |

## 10. Beregning med norske preparater

Reglene gir den ideelle dosekurven. Doseplanmotoren (P5) setter sammen hver dose av preparatene i FEST:

- hele tabletter og kapsler;
- halve og kvarte tabletter bare der FEST oppgir dem som delbare; depottabletter og enterokapsler deles ikke;
- hele dråper når dråper er valgt.

Ingen regel har toleranse (beslutning 5.7). Kan et trinn ikke gis nøyaktig, **stopper planen ved trinnet før** og står på siste dose som kan gis, med forklaringen: hvilket trinn som ikke kan gis, de nærmeste dosene og at planen stopper ved trinnet før. Kan allerede første trinn ikke gis, stopper beregningen med de nærmeste dosene og den **faktiske reduksjonen** hver av dem ville gitt. En annen dose, et større avvik eller en annen formulering er et nytt forslag med sin egen reduksjon og krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. Laveste styrke blir aldri en slutt i seg selv. Eksempler fra testene (syntetiske preparater):

- Sertralin 100 mg med 25, 50 og 100 mg-tabletter: 75 mg kan gis, men 56,25 mg kan ikke. Planen står på 75 mg.
- Duloksetin 60 mg: 54 mg kan ikke gis med kapsler på 30 og 60 mg; 30 mg ville vært en faktisk reduksjon på 50 %.
- Venlafaksin 150 mg: 135 mg kan ikke gis; 112,5 mg ville vært en faktisk reduksjon på 25 %.
- Paroksetin 40 mg med delbare 20 mg-tabletter: 36 mg kan ikke gis.
- Klomipramin 100 mg: 75 mg kan gis, men 56,25 mg kan ikke med hele og halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg med 50 % valgt og begrunnet: 20, 10 og 5 mg kan gis med tabletter som kan deles i fire, og planen står på 5 mg. Med dråper på 1 mg fra 20 mg: 10 og 5 mg.
- Fluoksetin 20 mg annenhver dag: én tablett eller kapsel hver gang.

**Flytende former (beslutning 5.7).** Dråper med dokumentert mengde per dråpe brukes når de er valgt; Cipralex dråper har 1 mg per dråpe i FEST og kan dermed gi escitalopramdoser under 5 mg. Miksturer og konsentrater uten dokumentert doseringsoppløsning brukes ikke. Zoloft konsentrat (20 mg/ml) står i FEST uten oppløsning for oppmålingen, så det er fortsatt sperret; det trenger dokumentert dose per ml, oppmålingsoppløsning og nøyaktighet før P5 kan bruke det (avsnitt 11).

## 11. Faglige beslutninger

**Avgjort i fagvurderingen 29.10.2026 og fagkontrollen 30.10.2026** (ikke en formell klinisk godkjenning; hver avklaring står på det den gjelder):

- **Beslutning 1 – valgområdene:** risikogruppene, områdene, standardverdiene og kravene om begrunnelse i avsnitt 4, behandlingstiden som må oppgis, og at trinnene forlenges ved symptomer uten automatisk neste reduksjon.
- **Beslutning 2 – sluttdosene:** alle avvist som automatisk trinn til null.
- **Beslutning 3 – nedre grense:** ingen fast klinisk nedre grense. Planen har en teknisk planhorisont og fortsetter fra faktisk dose, med tre utfall: et trinn som kan gis, et trinn som ikke kan gis (stopp med forklaring), eller planen stopper ved horisonten. Praktiske grenser for venlafaksin (37,5 mg) og duloksetin (30 mg); bupropion kan ikke beregnes med depottabletter.
- **Beslutning 4 – avslutningen:** ingen automatisk avslutning; den vurderes alltid individuelt, og verktøyet foreslår aldri en dato for siste dose.
- **Beslutning 5:** begrunnelse over 10 % ved lang behandlingstid i middelsgruppen (5.3); høyst 25 % fra laveste døgndose som konservativ øvre ramme (5.4); doserammen for indikasjon og pasientgruppe (5.5); langsom variant og organfunksjon for alle stoffer (5.6); ingen toleranse, forklart stopp og dokumenterte flytende former (5.7); den hyperbolske citalopramregelen bare i sammenligningssettet (5.8); studievarianten fjernet (5.9); fluoksetin annenhver dag (5.10); stoffene med begrensning (5.11).

**Kontrolløren godkjente ikke de beregnbare reglene som klinisk ferdige.** Alle regler har status «til faglig kontroll».

**Konflikt som er gjort synlig: agomelatin.** Fagkontrollen 30.10.2026 sa at agomelatins tekstregel «kan godkjennes faglig». En klinisk godkjenning i repoet krever en uavhengig kontrollør med navn, dato og fingeravtrykk for regelversjonen (P4.8), og OUSFAR Dev setter aldri den statusen selv. Tekstregelen står derfor fortsatt «til faglig kontroll» til godkjenningen gis på den måten.

**Gjenstår før P4.8 og P7.5 kan godkjennes:**

1. **Planhorisonten:** Er 12 reduksjoner en passende teknisk horisont? Den står som åpent forslag i hver regel.
2. **Startdosen:** Godkjennes enhver dose over 0 opp til preparatomtalens høyeste døgndose for voksne, med begrunnelse når dosen er utenfor rammen for indikasjon eller pasientgruppe? En dose over høyeste døgndose stopper fortsatt; det er OUSFARs konservative valg og må bekreftes.
3. **Zoloft konsentrat (P5):** Dokumentert dose per ml, oppmålingsoppløsning og nøyaktighet før konsentratet kan brukes.
4. **Ny kontroll av regelversjon 5:** de 14 hovedreglene, de 14 langsomme variantene, fluoksetin annenhver dag og bupropions tekstregel.
5. **Agomelatin:** formell klinisk godkjenning av tekstregelen, med fingeravtrykk.
6. **Senere, når det bestemmes:** utkast for doksepin, imipramin og trazodon fra utenlandske preparatomtaler. Fenelzin og tranylcypromin får ingen regler nå; dosulepin og maprotilin venter.

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

## 13. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen står bare i sammenlignings- og utviklingssettet.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 14. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer alle regelsettene, også sammenligningssettet. Den sjekker kilder, påstandsnære henvisninger, grunnlag, godkjenning, justerbare verdier, spørsmål, krav om begrunnelse, individuell avslutning og planhorisont, og at hvert regneeksempel stemmer med beregningen, også med forskriverens valg, svar og begrunnelse.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene, forskriverens valg og doseplanene som beskrevet over.
- `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i appens regelsett. `verktoyside.test.tsx` tester også feltene for forskriverens valg, spørsmålene og begrunnelsen.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og en egen test kontrollerer at bare verktøyene bruker de nye reglene.
