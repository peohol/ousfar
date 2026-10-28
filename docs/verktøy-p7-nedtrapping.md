# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`. Det ble skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5), og omarbeidet samme dag etter første kontroll (avsnitt 11) og andre kontroll (avsnitt 12). **Ingen regel er klinisk godkjent, og verktøyet viser ingen doseplan.** P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i tre rapporter:

- `docs/verktøy-p7-dekning.md` er kilde- og dekningsmatrisen. Den har én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke i FEST, sluttdosen i regelen, status, regel, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` viser hver regel med kildetro utsagn, OUSFARs tilpasninger og parametre med grunnlag og område forskriveren kan velge i. Den viser også bekreftelse, unntak, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.
- `docs/verktøy-p7-sammenligning.md` viser paroksetins raske studievariant. Den er bare til sammenligning og ligger ikke i verktøyet.

Alle lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 15 med beregnbar regel under faglig kontroll, 1 med bare fagtekst, 1 som mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | Regelsettet `ousfar-verktoy-nedtrapping` (versjon 3) har 14 nedtrappingsregler (versjon 3) og én tekstregel (agomelatin). Paroksetins studievariant ligger i sammenligningssettet `ousfar-verktoy-nedtrapping-sammenligning`. Escitalopram dekkes av pilotregelen fra P4. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts`, `src/components/verktoy/Verktoyside.tsx` | Appen bruker pilotsettet og P7-reglene sammen, men ikke sammenligningssettet. Et stoff uten regel får forklaringen fra dekningen. En plan oppgir regelsettet regelen hører til. Feltgruppen «Tilpasning av planen» lar forskriveren velge trinnstørrelse og trinnlengde innenfor regelens områder (avsnitt 5). |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts`, `verktoyside.test.tsx` | Testene dekker dekningen mot regelsettet, P3 og FEST, og reglene ved grenseverdier. De dekker risikogruppene, kildegrunnlaget for trinnlengden og forskriverens valg ved og rett utenfor grensene. Bekreftelse og unntak er med, og doseplaner med syntetiske preparater, også i de lave trinnene. Den kliniske sperren testes med fersk og foreldet FEST, og det testes at fortolkningen ikke bruker reglene. |

Reglene bruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5. Etter andre kontroll har modellen fått justerbare verdier (regelmodell 4, beregningsmotor 2; avsnitt 5). Et inndatakrav kan ha bare en øvre grense, og en prosentvis nedtrapping fra en dose under sluttdosen stopper med forklaring (avsnitt 4). Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

## 2. Kildegrunnlag

- **Preparatomtalene** er grunnlaget for doseområdet, kravene til varighet og det som er spesielt for stoffet.
  - Norske preparatomtaler er hentet fra lenken FEST oppgir, og sentrale EU-preparatomtaler fra EMA.
  - Duloksetin bruker Cymbalta, som generikaene i Norge viser til. Vortioksetin og agomelatin bruker Brintellix og Valdoxan, som er sentralt godkjent.
  - 11 nye preparatomtaler står i kilderegisteret (`src/verktoy/regler/kilder.ts`) med versjon, tidspunkt og SHA-256.
- **Royal College of Psychiatrists, «Stopping antidepressants»** (publisert mars 2024, hentet 28.10.2026 med SHA-256) er grunnlaget for tempo og risiko:
  - To til fire uker mellom reduksjonene, og tiden tilpasses symptomene.
  - Minst fire uker for fluoksetin før neste reduksjon.
  - Nedtrapping over minst fire uker i alt.
  - Om lag 50 % per trinn ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. Risikogruppene står per stoff i tillegg 1.
  - 5–10 % per trinn etter lang bruk.
  - Noen trenger svært lave doser før de slutter.
- **NICE NG222** er grunnlaget for trappeformen og for at planen er et startforslag:
  - Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose (1.4.16).
  - Halveringstid og behandlingstid skal tas med, og tempoet styres av pasientens symptomer (1.4.16).
  - Paroksetin og venlafaksin krever særlig varsomhet (1.4.18).
  - Tidligere seponeringssymptomer krever mer støtte og langsommere nedtrapping (1.4.15, 1.4.21).
  - Rådet om én til to uker for å vurdere en reduksjon står under fluoksetin i 1.4.18. Det brukes bare om fluoksetin, ikke som tempo for de andre stoffene (avsnitt 12).
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST** brukes til å sette sammen dosene (P5) og til matrisens laveste styrke, men bestemmer ikke sluttdosen.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i kilden.

## 3. Startforslag, ikke fast tidsplan

Hver beregnbar regel gir et **startforslag**. Det er bygd inn på tre måter:

- **Bekreftelse (`startforslag`).** Forskriveren må bekrefte at planen er et startforslag, og at hen har vurdert behandlingstiden, halveringstiden, tidligere seponeringssymptomer og pasientens ønsker og valgt trinnstørrelse og dager per trinn etter det. Etter lang bruk anbefaler RCPsych 5–10 % per trinn. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige (NICE 1.4.16, RCPsych). Trengs mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. Uten bekreftelse stopper beregningen.
- **Unntak (`tidligere_seponeringssymptomer`).** Har et tidligere forsøk med samme legemiddel gitt seponeringssymptomer eller mislyktes, gjelder ikke regelen. Da trengs en individuelt langsommere plan med mindre trinn (NICE 1.4.15, 1.4.21; RCPsych). Ubesvart stopper beregningen like mye som «ja». At regelen da stopper, er OUSFARs valg og står åpent.
- **Forskriverens valg (avsnitt 5).** Forskriveren kan velge mindre trinn og lengre tid innenfor regelens områder.

**Forlengelse og utsettelse er skilt fra den opprinnelige planen.** Regelen gir ingen låst tidsplan. Trenger pasienten mer tid, endres ikke den beregnede planen i ettertid. Forskriveren beregner en ny plan fra dosen pasienten bruker, eventuelt med lengre trinn eller mindre reduksjoner, og den nye planen oppgir sine egne valg.

**Det modellen kan avgjøre:**

- den ideelle dosekurven fra aktuell dose, etter en regel som er åpen for kontroll og forskriverens valg innenfor regelens områder;
- om hvert trinn kan gis med norske preparater;
- når planen ikke oppfyller et krav: startdose, varighet, bekreftelse, unntak eller et valg utenfor området.

**Det modellen ikke kan avgjøre:** hvor store trinnene og hvor lang tiden bør være for den enkelte. Modellen vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn. Det er forskriverens vurdering, og derfor må forslaget bekreftes og kan justeres. Med tidligere seponeringssymptomer beregner modellen ikke noe.

## 4. Det felles prinsippet

Hver del er merket med om den kommer fra kilden eller er OUSFARs valg. Alle OUSFAR-valgene er åpne forslag som må avklares.

| Del | Kilden | OUSFARs forslag |
| --- | --- | --- |
| Trinn | RCPsych: om lag 50 % ved middels eller lavere risiko, om lag 10 % ved høyest risiko; NICE: en andel av forrige dose | 50 % av aktuell dose, eller 10 % for stoffene RCPsych regner med høyest risiko. Forskriveren kan velge 5–50 %. |
| Mindre trinn ved lav dose | NICE: eksempel 25 % «når dosen blir lav»; RCPsych: trinnene blir mindre når dosen synker | 25 % fra laveste døgndose i preparatomtalen, bare når trinnet ellers er 50 %. Trinnet ved lav dose er aldri større enn det forskriveren har valgt. |
| Trinnlengde | RCPsych: to til fire uker; fluoksetin minst fire uker | 14 dager, og forskriveren kan velge 14–28. Fluoksetin har 28 dager uten valg. |
| Sluttdose | Ingen kilde oppgir en sluttdose; RCPsych: noen trenger svært lave doser | En firedel av laveste døgndose i preparatomtalen. Under den seponeres det. Dette er en **uavklart modellforutsetning** (avsnitt 7). |
| Minste varighet | RCPsych: minst fire uker i alt; preparatomtalene (avsnitt 8) | Minst 28 dager som bindende krav for alle. Er nedtrappingen kortere, stopper beregningen. |
| Startdose | Preparatomtalens høyeste døgndose for voksne | Enhver dose opp til høyeste døgndose. Lave restdoser under ordinært doseområde er med. Under sluttdosen stopper beregningen fordi regelen ikke har flere trinn, ikke fordi dosen er ugyldig. |
| Toleranse | – | Ingen. Et trinn som ikke kan gis nøyaktig, stopper beregningen. |

**Risikogruppene (RCPsych tillegg 1):**

| Gruppe | Stoffene med regel | Første trinn |
| --- | --- | --- |
| Høyest risiko | duloksetin, mirtazapin, moklobemid, paroksetin, venlafaksin | 10 % av aktuell dose, uten eget lavdosetrinn |
| Middels | amitriptylin, bupropion, citalopram, fluoksetin, fluvoksamin, klomipramin, nortriptylin, sertralin | 50 %, deretter 25 % fra laveste døgndose; fluoksetin 50 % hele veien |
| Lav | vortioksetin | Som middels |

Standardverdiene er forsvart slik:

- 50 % og 10 % er utgangspunktene RCPsych selv oppgir for de to gruppene.
- 14 dager er nedre del av RCPsychs to til fire uker. Det er ikke et tak: forskriveren kan velge opptil 28 dager.
- 5–10 % er RCPsychs råd etter lang bruk. Forskriveren kan velge det, men regelen kan ikke vite behandlingstiden og gjør det ikke selv.
- Kan pasienten ikke følge noe valg innenfor områdene, er regelen ikke svaret: da stopper forskriveren beregningen ved å svare ja på unntaket, eller lager en individuell plan.

**Sluttdosen avhenger ikke av styrkene.** Den er valgt så nedtrappingen fortsetter med små trinn under laveste ordinære dose. Om hvert trinn kan gis, avgjøres av doseplanmotoren (P5). Kan et trinn ikke gis nøyaktig, stopper beregningen med de nærmeste dosene og beskjed om at en annen formulering krever en ny faglig beslutning. Laveste styrke blir aldri en tilfredsstillende slutt i seg selv. Matrisen viser laveste styrke i FEST og sluttdosen i regelen i hver sin kolonne.

**Startdosen er skilt fra sluttdosen.** Regelen gjelder enhver aktuell dose opp til preparatomtalens høyeste døgndose. En lav aktuell dose beregnes og avvises ikke fordi den er under ordinært behandlingsområde; eksempler er sertralin 12,5 mg og nortriptylin 15 mg. Er planen fra en svært lav dose kortere enn 28 dager, stopper beregningen med den grunnen. Er dosen under sluttdosen, for eksempel sertralin 6 mg eller paroksetin 2 mg, stopper beregningen og sier at regelen ikke har noen godkjent videre nedtrapping eller seponering fra en så lav dose, og at det må vurderes individuelt. Dosen kalles ikke ugyldig.

Kildens Stop-anbefaling og OUSFARs regel er to ulike ting. Regelen er en selvstendig, etterprøvbar strategi bygd på preparatomtalen, NICE og RCPsych. Den er ikke en validert optimal nedtrapping og ikke en omskriving av Stop-oppføringen.

## 5. Forskriverens valg

Regelmodellen har fått **justerbare verdier** (regelmodell 4). En parameter kan ha `justerbar` (navnet forskriveren ser) og et område. Forskriveren kan da velge en annen verdi innenfor området.

- **Godkjenningen gjelder området, ikke hvert valg.** Hvilke verdier som er justerbare, og områdene, er en del av regelen og fingeravtrykket. En godkjenning dekker dermed ethvert valg innenfor området. Et valg utenfor området, eller for en verdi som ikke er justerbar, stopper beregningen.
- **Valget står i planen.** Hvert valg som avviker fra regelens forslag, står som kontroll i resultatet med regelens forslag og området.
- **I P7-reglene** er reduksjonen per trinn (5–50 %) og dager per trinn (14–28, hele dager) justerbare. Unntaket er fluoksetin, der bare reduksjonen kan velges. Sluttdosen, minstevarigheten og grensen for lav dose er ikke justerbare.
- **I verktøyet** står valgene i feltgruppen «Tilpasning av planen (valgfri)». Hvert felt viser regelens forslag og området, og et tomt felt bruker forslaget. Valgene tas vare på gjennom en oppdatering av appen som resten av skjemaet, og begynner på nytt når strategien skiftes.

## 6. Avvik fra prinsippet

- **Fluoksetin.** Regelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. Trinnene varer 28 dager uten valg. RCPsych anbefaler minst fire uker før neste reduksjon, og NICE nevner én til to uker for å vurdere virkningen; regelen bruker det strengeste. NICEs forslag om dosering annenhver dag ved 20 mg kan ikke uttrykkes i regelmodellen.
- **Paroksetin – rask studievariant til sammenligning.** Nedtrappingen fra studiene i preparatomtalen er skilt ut som `seponering-paroksetin-studievariant` i sammenligningssettet. Der blir dosen 10 mg mindre hver uke. Varianten er tydelig merket, ligger ikke i verktøyet og er ikke en klinisk anbefaling ved langvarig behandling. Samme preparatomtale, NICE og RCPsych råder til nedtrapping over flere uker eller måneder.
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping, mens RCPsych regner moklobemid med høyest risiko. Regelen følger RCPsych, og konflikten står i regelen. Ved alvorlig nedsatt leverfunksjon reduserer preparatomtalen dosen; det er et eget unntak.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram.** Pilotregelen fra P4 (`seponering-escitalopram`) er versjon 2. Bare kildegrunnlaget for trinnlengden er rettet: 14 dager, område 14–28 etter RCPsych. Ellers er den som før: sluttdose 2,5 mg (halvparten av laveste døgndose 5 mg), mindre trinn fra 5 mg, minst 14 dager og ingen justerbare verdier. Etter P7-prinsippet ville sluttdosen vært 1,25 mg og minstevarigheten 28 dager. Pilotregelen har heller ikke bekreftelsen og unntaket fra avsnitt 3. Forskjellen er ikke løst i koden; den må avgjøres faglig (beslutning 8).
- **Citalopram** har to regler: P7-regelen og den hyperbolske pilotregelen fra P4 (`seponering-citalopram-hyperbolsk`). Verktøyet lar klinikeren velge strategi når begge gjelder. Den hyperbolske regelen går helt til null (siste trinn 0,41 mg) og bruker ikke laveste styrke som slutt; med tabletter stopper motoren allerede ved første trinn. Den er en egen strategi etter B2, og bare kildegrunnlaget for trinnlengden er rettet (versjon 2).
- **Pilotreglene sertralin → mirtazapin og fluoksetin → fenelzin** (P4, versjon 2) har fått rettet kildegrunnlaget for trinnlengden på samme måte. Kryssnedtrappingen beholder 14 dager (område 7–14), fordi NICE åpner for raskere nedtrapping ved bytte. Fluoksetin før fenelzin trappes nå ned med 28 dager per trinn som i P7, så fenelzin kan tidligst startes dag 92 fra 40 mg og dag 64 fra 20 mg.

## 7. Sluttdosen: uavklart modellforutsetning og akseptkriterium

Sluttdosen er en firedel av laveste døgndose i preparatomtalen. Den er **ikke en validert klinisk terskel**:

- Ingen kilde oppgir en sluttdose.
- RCPsych sier at noen trenger svært lave doser, helt ned mot 2 % av opprinnelig dose, før de slutter.
- Den samme kvartregelen for alle stoffer tar ikke hensyn til hvert stoffs farmakologi.

Det står i hver regel, både i begrunnelsen for parameteren og under usikkerhet.

**Foreslått faglig akseptkriterium.** Algoritmen kan generere et avsluttende nulltrinn bare når alle tre punktene er oppfylt. Ellers stopper beregningen.

1. Neste trinn ville kommet under sluttdosen. Siste dose før null er altså lik eller over sluttdosen, men aldri mer enn ett trinn over. Eksempel: paroksetin har sluttdose 2,5 mg, og med 10 % per trinn fra 20 mg er siste dose 2,7 mg.
2. Sluttdosen er vurdert og avklart **for akkurat dette stoffet** av en uavhengig kontrollør. Vurderingen skal være mot stoffets farmakologi, særlig halveringstid og forholdet mellom dose og reseptorbinding, og mot kildegrunnlaget. Begrunnelsen skal stå i avklaringen.
3. Hvert trinn ned til sluttdosen kan gis med norske preparater uten toleranse, eller med en toleranse som er godkjent for regelversjonen.

Ingen regel kan seponere fra dag 1: står pasienten på sluttdosen, blir nedtrappingen 0 dager, kortere enn 28, og beregningen stopper. Testene viser det for alle stoffene, også med 5 % per trinn.

Punkt 1 og 3 håndheves av beregningen og doseplanmotoren. Punkt 2 håndheves av godkjenningen: sluttdosen er et åpent forslag i hver regel, og en regel med et åpent forslag kan ikke bli klinisk godkjent (`apneValg`, P4). Kvartregelen kan altså ikke godkjennes samlet for alle stoffene. Hvert stoff må få sin egen avklaring, som kan ende med en annen sluttdose for det stoffet.

## 8. Minste varighet per stoff

Alle P7-reglene har minst 28 dager som bindende krav, etter RCPsychs råd om å trappe ned over minst fire uker også uten seponeringssymptomer. Preparatomtalen er ved siden av, i begrunnelsen:

| Stoff | Preparatomtalen |
| --- | --- |
| Citalopram, sertralin, fluoksetin, fluvoksamin, venlafaksin, duloksetin | «Minst én til to uker» |
| Paroksetin | «Over flere uker eller måneder» (pkt. 4.4) |
| Amitriptylin | «Gradvis over flere uker» |
| Klomipramin, mirtazapin | «Gradvis» uten varighet |
| Nortriptylin | Bare at brå seponering kan gi abstinens |
| Vortioksetin, bupropion, moklobemid | Ikke noe krav |

28 dager er et nedre krav. Med standardverdiene varer planene fra vanlige doser fra 8 uker (fluoksetin 20 mg) til 52 uker (venlafaksin 150 mg). Paroksetin 20 mg, duloksetin 60 mg og mirtazapin 30 mg varer 38 uker, og moklobemid 300 mg 26 uker. Stoffene med middels risiko varer 10–14 uker fra vanlige doser.

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

Miksturer uten dokumentert dosering per ml brukes ikke. Sluttdosen avhenger ikke av styrkene, og ingen regel har toleranse. Derfor stopper de fleste planene i de lave trinnene, eller allerede ved første trinn på 10 %, med en forklaring og de nærmeste dosene. Eksempler fra testene:

- Sertralin 100 mg: 50 og 25 mg kan gis, men 18,75 mg kan ikke. Planen slutter ikke ved 25 mg.
- Duloksetin 60 mg: 54 mg kan ikke gis med kapsler på 30 og 60 mg.
- Venlafaksin 150 mg: 135 mg kan ikke gis. Med 50 % valgt kan 75 og 37,5 mg gis, men 18,75 mg kan ikke.
- Paroksetin 40 mg med delbare 20 mg-tabletter: 36 mg kan ikke gis. Med 25 % valgt kan 30 mg gis, men 22,5 mg kan ikke.
- Bupropion 150 mg: ingen dose under 150 mg kan gis.
- Klomipramin 150 mg: 18,75 mg kan ikke gis med halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg: hele planen (20, 10 og 5 mg, 28 dager hver) kan gis med tabletter som kan deles i fire. Fra 20 mg kan den også gis med dråper. Med tabletter som bare deles i to, stopper den ved 5 mg.

## 11. Faglige beslutninger før P4.8 og P7.5 kan godkjennes

1. **Startforslaget:** Er bekreftelsen og unntaket for tidligere seponeringssymptomer riktig avgrenset? Skal regelen heller ha en egen langsommere variant for disse pasientene?
2. **Risikogruppene og standardverdiene:** Godkjennes 50 % og 10 % som utgangspunkt for de to gruppene (avsnitt 4)? Er RCPsychs gruppering riktig å følge for hvert stoff, også moklobemid, der preparatomtalen er taus?
3. **Områdene forskriveren kan velge i:** En godkjenning dekker *hele* området, ikke bare standardverdien. I dag kan alle reglene, også de med høyest risiko, velges med 5–50 % og 14–28 dager, og verktøyet kontrollerer ikke behandlingstiden. Mulige valg per risikogruppe:
   - godkjenne hele området, fordi det er forskriverens vurdering;
   - snevre inn området for høyest risiko, f.eks. til 5–10 % (RCPsychs utgangspunkt);
   - beholde området, men kreve en egen bekreftelse eller begrunnelse for verdier utover standardverdien.

   Skal regelen også tillate lengre trinn enn 28 dager, eller er en ny plan fra aktuell dose riktig svar (avsnitt 3)? Valget er klinisk og er ikke tatt i koden.
4. **Sluttdosen:** Vurder akseptkriteriet i avsnitt 7, og avklar sluttdosen for hvert stoff for seg. Kontroller siste dose før null i relevante scenarioer. Eksempel: paroksetin 20 mg ender med 2,7 mg før seponering, mens RCPsych sier at noen trenger doser ned mot 2 % av opprinnelig dose.
5. **Toleranse eller annen formulering:** De fleste planer stopper (avsnitt 10). Skal enkelte regler få en begrunnet toleranse, skal flytende former eller andre styrker brukes, eller skal en forklart stopp være svaret? Toleranse må godkjennes per regelversjon.
6. **Minste varighet:** Er 28 dager i alt et forsvarlig minimum for alle stoffene, også de der preparatomtalen ikke har noe krav (avsnitt 8)?
7. **Paroksetins studievariant:** Skal den bli stående i sammenligningssettet, eller fjernes?
8. **Escitalopram og citalopram:** Skal pilotregelen for escitalopram harmoniseres med P7 (sluttdose, minstevarighet, bekreftelse, unntak og justerbare verdier)? Skal den hyperbolske citalopramregelen stå som valgbar strategi i verktøyet (B2)?
9. **Fluoksetin:** Er det riktig å droppe mindre trinn ved lav dose og låse trinnene til 28 dager? Skal dosering annenhver dag (NICE) støttes?
10. **Startdosen:** Reglene gjelder enhver dose opp til preparatomtalens høyeste døgndose, og stopper med forklaring under sluttdosen. Er det riktig også for eldre og andre indikasjoner, og er unntaket for moklobemid ved nedsatt leverfunksjon nok?
11. **Stoffene med begrensning:** Skal OUSFAR lage regler for imipramin, tranylcypromin, trazodon, doksepin og fenelzin fra andre kilder, og i så fall hvilke?
12. **Agomelatin:** Godkjennes tekstregelen om at nedtrapping ikke trengs?

## 12. Endret etter kontrollene

**Første kontroll** (av regelversjon 1, PR #286) krevde disse endringene. Reglene ble versjon 2:

| Kontrollpunkt | Endring |
| --- | --- |
| Fast 50 %/14-dagers regime | Planen er et startforslag som må bekreftes, med unntak ved tidligere seponeringssymptomer (avsnitt 3). |
| Sluttdosen var laveste styrke | Sluttdosen er en firedel av laveste døgndose, uavhengig av styrkene. Et trinn som ikke kan gis, stopper med begrunnelse. |
| Paroksetin | Den raske studievarianten er skilt ut i sammenligningssettet. |
| 14 dager som minimum overalt | SPC-krav og OUSFAR-forslag ble skilt per stoff. Etter andre kontroll gjelder 28 dager for alle (avsnitt 8). |
| Lave doser ble avvist | Startdosen gjelder fra sluttdosen, så lave restdoser beregnes. |

**Andre kontroll** (av regelversjon 2) krevde disse endringene. Reglene er nå versjon 3, sendt til kontroll på nytt:

| Kontrollpunkt | Endring |
| --- | --- |
| 14 dager og område 7–14 viste til NICE 1.4.18, som gjelder fluoksetin | Trinnlengden bygger på RCPsychs to til fire uker: 14 dager, område 14–28. NICE-henvisningen står bare i fluoksetinregelen, som har 28 dager etter RCPsych. Det samme er rettet i fire pilotregler fra P4 (versjon 2, avsnitt 6). Planen er et startforslag. Forlengelse gir en ny plan fra aktuell dose, skilt fra den opprinnelige (avsnitt 3). |
| De langsomme variantene var ikke begrunnet | Trinnstørrelsen følger RCPsychs risikogrupper per stoff (avsnitt 4). Duloksetin, mirtazapin og moklobemid er med blant stoffene med høyest risiko, og standardverdiene er begrunnet. Forskriveren kan velge trinnstørrelse og trinnlengde innenfor områder som er en del av regelen og godkjenningen (avsnitt 5). Det er grense- og variasjonstester ved 5 og 50 %, 14 og 28 dager, rett utenfor og for deler av dager. |
| Sluttdosen var ikke begrunnet som terskel | Sluttdosen er merket som uavklart modellforutsetning, og akseptkriteriet står i avsnitt 7. Kvartregelen kan ikke godkjennes samlet: hver regel har den som åpent forslag. |
| Minste varighet | Alle reglene har minst 28 dager i alt (RCPsych). |

**Tillegg til andre kontroll** (samme regelversjon):

| Kontrollpunkt | Endring |
| --- | --- |
| Sluttdosen var også nedre grense for startdosen | Startdosen har bare en øvre grense. Under sluttdosen stopper beregningen med forklaringen at regelen ikke har noen godkjent videre nedtrapping fra en så lav dose, ikke at dosen er ugyldig (avsnitt 4). Grensetester under sluttdosen, ved den og rett over høyeste dose. |
| Seponering fra dag 1 uten minstevarighet | Alle reglene har minst 28 dager, så ingen plan seponerer fra dag 1. Det er testet ved sluttdosen for alle stoffene (avsnitt 7). |
| En bekreftelse gjør ikke planen individuell | Bekreftelsen sier nå uttrykkelig hva forskriveren har vurdert (behandlingstid, halveringstid, tidligere symptomer, pasientens ønsker), og forskriveren kan velge trinnstørrelse og trinnlengde (avsnitt 5). Stoffene med høyest risiko starter med 10 %, ikke 25 % (avsnitt 4). |

Mindre trinn ved lav dose er aldri større enn reduksjonen forskriveren har valgt. Paroksetins studievariant er versjon 2, med de rettede tekstene.

## 13. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen fra P4 har bare fått rettet kildegrunnlaget for trinnlengden.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 14. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer alle regelsettene, også sammenligningssettet. Den sjekker kilder, påstandsnære henvisninger, grunnlag, godkjenning, justerbare verdier, og at hvert regneeksempel stemmer med beregningen, også med forskriverens valg.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene, forskriverens valg og doseplanene som beskrevet over.
- `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i appens regelsett. `verktoyside.test.tsx` tester også feltene for forskriverens valg.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og den nye testen kontrollerer at bare verktøyene bruker de nye reglene.
