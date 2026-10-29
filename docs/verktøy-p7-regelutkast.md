# OUSFAR Verktøy – P7: regelutkast for nedtrapping av antidepressiva

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping` versjon 4, regelmodell 5, beregningsmotor 3. Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych. Hver plan er et startforslag med minstetider som forskriveren kan justere innenfor valgområdene fra fagvurderingen, og ingen plan går til null. Til faglig kontroll; ingen regel er klinisk godkjent.

**16 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md` og `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | seponering | amitriptylin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 5 |
| `seponering-bupropion` | seponering | bupropion → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-citalopram` | seponering | citalopram → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 10 |
| `seponering-duloksetin` | seponering | duloksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 4 |
| `seponering-escitalopram` | seponering | escitalopram → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 6 |
| `seponering-fluoksetin` | seponering | fluoksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 8 |
| `seponering-fluvoksamin` | seponering | fluvoksamin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-klomipramin` | seponering | klomipramin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-mirtazapin` | seponering | mirtazapin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 4 |
| `seponering-moklobemid` | seponering | moklobemid → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 4 |
| `seponering-nortriptylin` | seponering | nortriptylin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 6 |
| `seponering-paroksetin` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 5 |
| `seponering-sertralin` | seponering | sertralin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 10 |
| `seponering-venlafaksin` | seponering | venlafaksin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 5 |
| `seponering-vortioksetin` | seponering | vortioksetin → – | beregnbar etter faglig avklaring | 5 | til faglig kontroll | 6 |
| `seponering-agomelatin` | seponering | agomelatin → – | bare tekstlig veiledning | 0 | til faglig kontroll | 0 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf) | preparatomtale | Cipralex (escitalopram) tabletter, preparatomtale | Oppdatert 22.11.2024 | `a04d22200055055d…` |
| [dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf) | preparatomtale | Cipramil (citalopram) tabletter, preparatomtale | Oppdatert 16.05.2024 | `4bc8dfd2e647d273…` |
| [dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf) | preparatomtale | Zoloft (sertralin) tabletter, preparatomtale | Oppdatert 07.01.2026 | `4ac8f7305379de98…` |
| [dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf) | preparatomtale | Fluoxetine Vitabalans (fluoksetin) tabletter, preparatomtale | Oppdatert 12.11.2021 | `221a73511f81243a…` |
| [dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf) | preparatomtale | Remeron (mirtazapin) tabletter, preparatomtale | Oppdatert 01.09.2021 | `2bc89cecfe0b2a80…` |
| [dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf) | preparatomtale | Sarotex (amitriptylin) tabletter, preparatomtale | Oppdatert 29.01.2025 | `2ad8048952eddc49…` |
| [dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05467.pdf) | preparatomtale | Anafranil (klomipramin) tabletter, preparatomtale | Oppdatert 26.02.2026 | `13399bacfb980808…` |
| [dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf) | preparatomtale | Noritren (nortriptylin) tabletter, preparatomtale | Oppdatert 20.06.2024 | `1e72fa14b0c31b41…` |
| [dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf) | preparatomtale | Fevarin (fluvoksamin) tabletter, preparatomtale | Oppdatert 09.02.2022 | `657b31e95bc8e4a6…` |
| [dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf) | preparatomtale | Seroxat (paroksetin) tabletter, preparatomtale | Oppdatert 17.10.2025 | `feff7cc66006b17b…` |
| [dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf) | preparatomtale | Efexor Depot (venlafaksin) depotkapsler, preparatomtale | Oppdatert 07.01.2026 | `78b5773e061d193e…` |
| [dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf) | preparatomtale | Wellbutrin Retard (bupropion) tabletter med modifisert frisetting, preparatomtale | Oppdatert 23.07.2026 | `daf1073b4dddd933…` |
| [dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf) | preparatomtale | Aurorix (moklobemid) tabletter, preparatomtale | Oppdatert 13.10.2023 | `70238657f0f1c309…` |
| [ema-cymbalta](https://www.ema.europa.eu/en/documents/product-information/cymbalta-epar-product-information_en.pdf) | preparatomtale | Cymbalta (duloksetin), produktinformasjon | Sist endret 08.10.2026 | `a3b2a486f9b4069e…` |
| [ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf) | preparatomtale | Brintellix (vortioksetin), produktinformasjon | Sist endret 08.10.2026 | `39c9a9149ac76ca0…` |
| [ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf) | preparatomtale | Valdoxan (agomelatin), produktinformasjon | Sist endret 08.10.2026 | `33ae8627c3852425…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av amitriptylin, gjentatt prosentvis nedtrapping

`seponering-amitriptylin`, versjon 4, fingeravtrykk `1a1dbc9e87068bc47c749aea5224242c4bee0a443806f44947eef49659cfc316`. Seponering: amitriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.
  - Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2 og 4.8)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 10 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 2,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-sarotex pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-sarotex pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 150 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (150 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-sarotex pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.
- Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn kan derfor ikke gis nøyaktig, og P5 stopper.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg med standardvalgene, til neste dose ville vært under 2,5 mg.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 37,5 mg; dag 29–56: 28,13 mg; dag 57–84: 21,09 mg; dag 85–112: 15,82 mg; dag 113–140: 11,87 mg; dag 141–168: 8,9 mg; dag 169–196: 6,67 mg; dag 197–224: 5,01 mg; dag 225–252: 3,75 mg; fra dag 253: 2,82 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 150 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Planen går ikke til null. Fra dag 253 står pasienten på 2,82 mg av amitriptylin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 3 mg ville første trinn vært under 2,5 mg: ingen reduksjon, og ingen godkjent avslutning.* Inndata: startdose 3 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Fra 3 mg av amitriptylin har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:At>Stop`.

## Seponering av bupropion, gjentatt prosentvis nedtrapping

`seponering-bupropion`, versjon 4, fingeravtrykk `ef876b49f94a57a895df0c628ea372cf3d55f5587359a92c9575619ec69352ca`. Seponering: bupropion → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.
  - Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 150 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 37,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 150 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-wellbutrin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 37,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (150 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-wellbutrin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-wellbutrin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.
- Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles, knuses eller tygges.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.
- Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg med standardvalgene, til neste dose ville vært under 37,5 mg.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 225 mg; dag 29–56: 168,75 mg; dag 57–84: 126,56 mg; dag 85–112: 94,92 mg; dag 113–140: 71,19 mg; dag 141–168: 53,39 mg; fra dag 169: 40,05 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 300 mg (bindende) – oppfylt. 300 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 40,05 mg av bupropion til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 300 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Bu>Stop`.

## Seponering av citalopram, gjentatt prosentvis nedtrapping

`seponering-citalopram`, versjon 4, fingeravtrykk `54c61c09aa620a549082c2918259d93e197be4b6e1d113da85f7886c733f27c5`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 10 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 2,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-cipramil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-cipramil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 40 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (40 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-cipramil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 2,5 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 15 mg; dag 29–56: 11,25 mg; dag 57–84: 8,44 mg; dag 85–112: 6,33 mg; dag 113–140: 4,75 mg; dag 141–168: 3,56 mg; fra dag 169: 2,67 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 40 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 2,67 mg av citalopram til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 20 mg etter lang behandlingstid med 10 % per trinn: ingen begrunnelse trengs.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja; valgt: prosent 10.
  - **fra:** dag 1–28: 18 mg; dag 29–56: 16,2 mg; dag 57–84: 14,58 mg; dag 85–112: 13,12 mg; dag 113–140: 11,81 mg; dag 141–168: 10,63 mg; dag 169–196: 9,57 mg; dag 197–224: 8,61 mg; dag 225–252: 7,75 mg; dag 253–280: 6,97 mg; dag 281–308: 6,28 mg; dag 309–336: 5,65 mg; dag 337–364: 5,08 mg; dag 365–392: 4,58 mg; dag 393–420: 4,12 mg; dag 421–448: 3,71 mg; dag 449–476: 3,34 mg; dag 477–504: 3 mg; fra dag 505: 2,7 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 10 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Ja – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 40 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 505 står pasienten på 2,7 mg av citalopram til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Etter lang behandlingstid krever 25 % (over 10 %) en begrunnelse.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja.
  - **Stoppet:** Reduksjon per trinn (% av aktuell dose) 25 % krever en skriftlig begrunnelse fra forskriveren (over 10 % ved lang behandlingstid). Skriv begrunnelsen, eller velg en annen verdi.
- *Fra 20 mg med 50 % per trinn og begrunnelse: 10 mg, så høyst 25 % fra laveste døgndose.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: prosent 50; begrunnelse: «Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.».
  - **fra:** dag 1–28: 10 mg; dag 29–56: 7,5 mg; dag 57–84: 5,63 mg; dag 85–112: 4,22 mg; fra dag 113: 3,16 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 50 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Reduksjon per trinn (% av aktuell dose): 50 % krever begrunnelse (over 25 %) – oppfylt. Forskriverens begrunnelse: «Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.».
  - Kontroll: Startdosen er høyst 40 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 113 står pasienten på 3,16 mg av citalopram til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *50 % (over 25 %) uten begrunnelse stopper.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: prosent 50.
  - **Stoppet:** Reduksjon per trinn (% av aktuell dose) 50 % krever en skriftlig begrunnelse fra forskriveren (over 25 %). Skriv begrunnelsen, eller velg en annen verdi.
- *Fra 3 mg ville første trinn vært under 2,5 mg: ingen reduksjon, og ingen godkjent avslutning.* Inndata: startdose 3 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Fra 3 mg av citalopram har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt.
- *2 mg er under den nedre grensen: regelen har ingen trinn, og beregningen sier det.* Inndata: startdose 2 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Dosen 2 mg av citalopram er under regelens nedre grense (2,5 mg). Regelen har ingen trinn under den og ingen godkjent avslutning; videre nedtrapping og avslutning må vurderes individuelt.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Seponering av duloksetin, langsom prosentvis nedtrapping (høy risiko)

`seponering-duloksetin`, versjon 4, fingeravtrykk `1abe436ad060af5b5ef316f9ffb30a60a4dcd3468938219bfa108d1a68c878e9`. Seponering: duloksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([ema-cymbalta](https://www.ema.europa.eu/en/documents/product-information/cymbalta-epar-product-information_en.pdf), section 4.2)*
- Duloksetin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.
  - Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Appendix 1)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–10 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 7,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–10 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 7,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (30 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på ema-cymbalta section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose høyst 120 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (120 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på ema-cymbalta section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.
- Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene kan ikke gis med registrerte kapsler på 30 og 60 mg; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 30 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 7,5 mg.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 27 mg; dag 29–56: 24,3 mg; dag 57–84: 21,87 mg; dag 85–112: 19,68 mg; dag 113–140: 17,71 mg; dag 141–168: 15,94 mg; dag 169–196: 14,35 mg; dag 197–224: 12,91 mg; dag 225–252: 11,62 mg; dag 253–280: 10,46 mg; dag 281–308: 9,41 mg; dag 309–336: 8,47 mg; fra dag 337: 7,63 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 120 mg (bindende) – oppfylt. 30 mg.
  - Merknad: Planen går ikke til null. Fra dag 337 står pasienten på 7,63 mg av duloksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 30 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Du>Stop`.

## Seponering av escitalopram, gjentatt prosentvis nedtrapping

`seponering-escitalopram`, versjon 4, fingeravtrykk `d347a2facdea3137aed811e7388a85a320c75e7d4d74f9c51bd3b10e2aaa7c77`. Seponering: escitalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 1,25 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Pilotregelens sluttdose på 2,5 mg er erstattet av P7-prinsippet (en firedel av laveste døgndose, 1,25 mg); fagvurderingen 29.10.2026 avviste begge som automatisk sluttpunkt.
  - Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-cipralex pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 1,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (5 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-cipralex pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (20 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-cipralex pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Doser under 5 mg krever deling eller flytende form; om det finnes, avgjøres i P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 1,25 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 15 mg; dag 29–56: 11,25 mg; dag 57–84: 8,44 mg; dag 85–112: 6,33 mg; dag 113–140: 4,75 mg; dag 141–168: 3,56 mg; dag 169–196: 2,67 mg; dag 197–224: 2 mg; fra dag 225: 1,5 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 20 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 225 står pasienten på 1,5 mg av escitalopram til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 10 mg etter lang behandlingstid med 10 % per trinn.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja; valgt: prosent 10.
  - **fra:** dag 1–28: 9 mg; dag 29–56: 8,1 mg; dag 57–84: 7,29 mg; dag 85–112: 6,56 mg; dag 113–140: 5,9 mg; dag 141–168: 5,31 mg; dag 169–196: 4,78 mg; dag 197–224: 4,3 mg; dag 225–252: 3,87 mg; dag 253–280: 3,49 mg; dag 281–308: 3,14 mg; dag 309–336: 2,82 mg; dag 337–364: 2,54 mg; dag 365–392: 2,29 mg; dag 393–420: 2,06 mg; dag 421–448: 1,85 mg; dag 449–476: 1,67 mg; dag 477–504: 1,5 mg; fra dag 505: 1,35 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 10 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Ja – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 20 mg (bindende) – oppfylt. 10 mg.
  - Merknad: Planen går ikke til null. Fra dag 505 står pasienten på 1,35 mg av escitalopram til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *25 mg er over dosene regelen gjelder for.* Inndata: startdose 25 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Startdosen 25 mg er utenfor det regelen gjelder for (høyst 20 mg).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Es>Stop`.

## Seponering av fluoksetin, gjentatt prosentvis nedtrapping

`seponering-fluoksetin`, versjon 4, fingeravtrykk `6c1714411dfcc11791bccd6eb60da70e55cde6fc348f9ce2a90db5be18535cf9`. Seponering: fluoksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
- Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Seponeringssymptomer kan komme dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.
  - Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene med middels risiko: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Trinnene varer minst 28 dager og kan forlenges så lenge det trengs for å fange opp sene seponeringssymptomer, men ikke kortes ned.
  - Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som standard; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (20 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-fluoxetin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn, uten klinisk fastsatt øvre grense: fluoksetin og den aktive metabolitten virker lenge, og seponeringssymptomer kan komme sent. RCPsych anbefaler å vente minst fire uker før neste reduksjon; NICE nevner én til to uker for å vurdere virkningen. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.18 (om fluoksetin)) |

**Betingelser:**

- Startdose høyst 60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-fluoxetin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir lavere daglige doser i stedet, og doser under 10 mg krever flytende form eller deling i fire.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 5 mg.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 30 mg; dag 29–56: 22,5 mg; dag 57–84: 16,88 mg; dag 85–112: 12,66 mg; dag 113–140: 9,49 mg; dag 141–168: 7,12 mg; fra dag 169: 5,34 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 40 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 5,34 mg av fluoksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 20 mg med 42 dager per trinn, så sene seponeringssymptomer kan fanges opp før neste reduksjon.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: trinnlengde 42.
  - **fra:** dag 1–42: 15 mg; dag 43–84: 11,25 mg; dag 85–126: 8,44 mg; fra dag 127: 6,33 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Minste antall dager per trinn er valgt av forskriveren innenfor regelens område – oppfylt. 42 dager i stedet for regelens forslag 28 dager; regelen tillater minst 28 dager, av tekniske grunner høyst 365 dager.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 127 står pasienten på 6,33 mg av fluoksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 20 mg med 50 % per trinn og begrunnelse.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: prosent 50; begrunnelse: «Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.».
  - **fra:** dag 1–28: 10 mg; fra dag 29: 5 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 50 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Reduksjon per trinn (% av aktuell dose): 50 % krever begrunnelse (over 25 %) – oppfylt. Forskriverens begrunnelse: «Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.».
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 29 står pasienten på 5 mg av fluoksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Kortere trinn enn 28 dager er utenfor regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: trinnlengde 14.
  - **Stoppet:** Minste antall dager per trinn: 14 dager er utenfor det regelen tillater (minst 28 dager, av tekniske grunner høyst 365 dager).
- *Fra 6 mg ville første trinn vært under 5 mg: ingen reduksjon, og ingen godkjent avslutning.* Inndata: startdose 6 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Fra 6 mg av fluoksetin har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Stop`.

## Seponering av fluvoksamin, gjentatt prosentvis nedtrapping

`seponering-fluvoksamin`, versjon 4, fingeravtrykk `eefc37f315eb939fcaf25ae415a6ec6431ae9d493aad6d20693c075e5ca6f31d`. Seponering: fluvoksamin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 50 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 12,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 50 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-fevarin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 12,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (50 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-fevarin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-fevarin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg med standardvalgene, til neste dose ville vært under 12,5 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 75 mg; dag 29–56: 56,25 mg; dag 57–84: 42,19 mg; dag 85–112: 31,64 mg; dag 113–140: 23,73 mg; dag 141–168: 17,8 mg; fra dag 169: 13,35 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 300 mg (bindende) – oppfylt. 100 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 13,35 mg av fluvoksamin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fv>Stop`.

## Seponering av klomipramin, gjentatt prosentvis nedtrapping

`seponering-klomipramin`, versjon 4, fingeravtrykk `250f6fc802ad1f1a74fb1571bf774a786719470970fb99f1791b0ee4add43274`. Seponering: klomipramin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.
  - Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05467.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 10 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 2,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-anafranil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-anafranil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 250 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (250 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-anafranil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg med standardvalgene, til neste dose ville vært under 2,5 mg.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 37,5 mg; dag 29–56: 28,13 mg; dag 57–84: 21,09 mg; dag 85–112: 15,82 mg; dag 113–140: 11,87 mg; dag 141–168: 8,9 mg; dag 169–196: 6,67 mg; dag 197–224: 5,01 mg; dag 225–252: 3,75 mg; fra dag 253: 2,82 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 250 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Planen går ikke til null. Fra dag 253 står pasienten på 2,82 mg av klomipramin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Cl>Stop`.

## Seponering av mirtazapin, langsom prosentvis nedtrapping (høy risiko)

`seponering-mirtazapin`, versjon 4, fingeravtrykk `7002fdf4f0bc6065adfe7a3dda8e096027d52d9452082e55a78fc01f9f9468b7`. Seponering: mirtazapin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Behandlingen med mirtazapin avsluttes gradvis.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Mirtazapin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.
  - Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Appendix 1)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–10 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 3,75 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–10 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 3,75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (15 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-remeron pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose høyst 45 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (45 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-remeron pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 15 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 3,75 mg.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 13,5 mg; dag 29–56: 12,15 mg; dag 57–84: 10,94 mg; dag 85–112: 9,84 mg; dag 113–140: 8,86 mg; dag 141–168: 7,97 mg; dag 169–196: 7,17 mg; dag 197–224: 6,46 mg; dag 225–252: 5,81 mg; dag 253–280: 5,23 mg; dag 281–308: 4,71 mg; dag 309–336: 4,24 mg; fra dag 337: 3,81 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 45 mg (bindende) – oppfylt. 15 mg.
  - Merknad: Planen går ikke til null. Fra dag 337 står pasienten på 3,81 mg av mirtazapin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 15 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mz>Stop`.

## Seponering av moklobemid, langsom prosentvis nedtrapping (høy risiko)

`seponering-moklobemid`, versjon 4, fingeravtrykk `1d3ed86b65b3111b88c1715e64501f7cded8c78acd14f49ad77aa8940334f8c3`. Seponering: moklobemid → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.
  - Preparatomtalen gir ingen anvisning om nedtrapping; et annet antidepressiv kan startes dagen etter at moklobemid er avsluttet. *([dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf), pkt. 4.2)*
- Moklobemid er blant stoffene med høyest potensiell risiko for seponeringssymptomer.
  - Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Appendix 1)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–10 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 75 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–10 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (300 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-aurorix pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose høyst 600 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (600 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-aurorix pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Unntak (`nedsatt_leverfunksjon`): Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. (dmp-aurorix pkt. 4.2)
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko. Regelen følger RCPsych; det må avklares faglig.
- Trinnene krever doser som ikke kan settes sammen av tabletter på 150 og 300 mg; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 75 mg.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 270 mg; dag 29–56: 243 mg; dag 57–84: 218,7 mg; dag 85–112: 196,83 mg; dag 113–140: 177,15 mg; dag 141–168: 159,43 mg; dag 169–196: 143,49 mg; dag 197–224: 129,14 mg; dag 225–252: 116,23 mg; dag 253–280: 104,6 mg; dag 281–308: 94,14 mg; dag 309–336: 84,73 mg; fra dag 337: 76,26 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 600 mg (bindende) – oppfylt. 300 mg.
  - Merknad: Planen går ikke til null. Fra dag 337 står pasienten på 76,26 mg av moklobemid til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 300 mg; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja, nedsatt_leverfunksjon nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mo>Stop`.

## Seponering av nortriptylin, gjentatt prosentvis nedtrapping

`seponering-nortriptylin`, versjon 4, fingeravtrykk `69de67c45100bf55022cd881916f478272148b39bbe2031a732cd9fbf7a326f5`. Seponering: nortriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.
  - Brå seponering etter lang tids bruk kan gi abstinenssymptomer. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 25 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 6,25 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
  - Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-noritren pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-noritren pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-noritren pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE og RCPsych.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg med standardvalgene, til neste dose ville vært under 6,25 mg.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 37,5 mg; dag 29–56: 28,13 mg; dag 57–84: 21,09 mg; dag 85–112: 15,82 mg; dag 113–140: 11,87 mg; dag 141–168: 8,9 mg; fra dag 169: 6,67 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 6,67 mg av nortriptylin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 11,25 mg; dag 29–56: 8,44 mg; fra dag 57: 6,33 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 15 mg.
  - Merknad: Planen går ikke til null. Fra dag 57 står pasienten på 6,33 mg av nortriptylin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 8 mg ville første trinn vært under 6,25 mg: ingen reduksjon, og ingen godkjent avslutning.* Inndata: startdose 8 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Fra 8 mg av nortriptylin har regelen ingen reduksjon før avslutningen, og regelen har ingen godkjent avslutning; den må vurderes individuelt.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:No>Stop`.

## Seponering av paroksetin, langsom prosentvis nedtrapping (høy risiko)

`seponering-paroksetin`, versjon 4, fingeravtrykk `4f8f1e405e41f3e9979f821108f77c8ac348028dd6ba04d23aaf3ffe96a52f3e`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*
- Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.
  - Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Appendix 1)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–10 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 2,5 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) brukes ikke som regel; den ligger som rask studievariant i sammenligningssettet og er ikke en klinisk anbefaling ved langvarig behandling.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–10 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-seroxat pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose høyst 60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-seroxat pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- De fleste trinnene krever deling av tabletter eller flytende form (mikstur); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 2,5 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 18 mg; dag 29–56: 16,2 mg; dag 57–84: 14,58 mg; dag 85–112: 13,12 mg; dag 113–140: 11,81 mg; dag 141–168: 10,63 mg; dag 169–196: 9,57 mg; dag 197–224: 8,61 mg; dag 225–252: 7,75 mg; dag 253–280: 6,97 mg; dag 281–308: 6,28 mg; dag 309–336: 5,65 mg; dag 337–364: 5,08 mg; dag 365–392: 4,58 mg; dag 393–420: 4,12 mg; dag 421–448: 3,71 mg; dag 449–476: 3,34 mg; dag 477–504: 3 mg; fra dag 505: 2,7 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 505 står pasienten på 2,7 mg av paroksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Stresstest fra fagvurderingen: 5 % per trinn fra 20 mg gir 40 reduksjoner over mer enn tre år, og siste dose er fortsatt 2,57 mg. Planen går ikke til null; avslutningen vurderes individuelt.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: prosent 5.
  - **fra:** dag 1–28: 19 mg; dag 29–56: 18,05 mg; dag 57–84: 17,15 mg; dag 85–112: 16,29 mg; dag 113–140: 15,48 mg; dag 141–168: 14,7 mg; dag 169–196: 13,97 mg; dag 197–224: 13,27 mg; dag 225–252: 12,6 mg; dag 253–280: 11,97 mg; dag 281–308: 11,38 mg; dag 309–336: 10,81 mg; dag 337–364: 10,27 mg; dag 365–392: 9,75 mg; dag 393–420: 9,27 mg; dag 421–448: 8,8 mg; dag 449–476: 8,36 mg; dag 477–504: 7,94 mg; dag 505–532: 7,55 mg; dag 533–560: 7,17 mg; dag 561–588: 6,81 mg; dag 589–616: 6,47 mg; dag 617–644: 6,15 mg; dag 645–672: 5,84 mg; dag 673–700: 5,55 mg; dag 701–728: 5,27 mg; dag 729–756: 5,01 mg; dag 757–784: 4,76 mg; dag 785–812: 4,52 mg; dag 813–840: 4,29 mg; dag 841–868: 4,08 mg; dag 869–896: 3,87 mg; dag 897–924: 3,68 mg; dag 925–952: 3,5 mg; dag 953–980: 3,32 mg; dag 981–1008: 3,16 mg; dag 1009–1036: 3 mg; dag 1037–1064: 2,85 mg; dag 1065–1092: 2,71 mg; fra dag 1093: 2,57 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 5 % i stedet for regelens forslag 10 %; regelen tillater 5–10 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 1093 står pasienten på 2,57 mg av paroksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.

## Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 4, fingeravtrykk `4941cad2c70eef1c09d7db32d1f4bf484fa1355d686beac631f066ab7d5ffe48`. Seponering: sertralin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 25 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 6,25 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer))<br>Begrunnelse kreves over 10 % ved lang behandlingstid (**OUSFAR-vurdering, åpent forslag:** Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard. (bygger på rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-zoloft pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-zoloft pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-zoloft pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 6,25 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 75 mg; dag 29–56: 56,25 mg; dag 57–84: 42,19 mg; dag 85–112: 31,64 mg; dag 113–140: 23,73 mg; dag 141–168: 17,8 mg; dag 169–196: 13,35 mg; dag 197–224: 10,01 mg; fra dag 225: 7,51 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 100 mg.
  - Merknad: Planen går ikke til null. Fra dag 225 står pasienten på 7,51 mg av sertralin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 50 mg etter lang behandlingstid med 10 % per trinn og 28 dager.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja; valgt: prosent 10.
  - **fra:** dag 1–28: 45 mg; dag 29–56: 40,5 mg; dag 57–84: 36,45 mg; dag 85–112: 32,81 mg; dag 113–140: 29,52 mg; dag 141–168: 26,57 mg; dag 169–196: 23,91 mg; dag 197–224: 21,52 mg; dag 225–252: 19,37 mg; dag 253–280: 17,43 mg; dag 281–308: 15,69 mg; dag 309–336: 14,12 mg; dag 337–364: 12,71 mg; dag 365–392: 11,44 mg; dag 393–420: 10,29 mg; dag 421–448: 9,27 mg; dag 449–476: 8,34 mg; dag 477–504: 7,5 mg; fra dag 505: 6,75 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 10 % i stedet for regelens forslag 25 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Ja – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Planen går ikke til null. Fra dag 505 står pasienten på 6,75 mg av sertralin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Etter lang behandlingstid krever 14 dager per trinn (under 28) en begrunnelse.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja; valgt: prosent 10, trinnlengde 14.
  - **Stoppet:** Minste antall dager per trinn 14 dager krever en skriftlig begrunnelse fra forskriveren (under 28 dager ved lang behandlingstid). Skriv begrunnelsen, eller velg en annen verdi.
- *Fra 50 mg etter kort behandlingstid med 14 dager per trinn: ingen begrunnelse trengs.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: trinnlengde 14.
  - **fra:** dag 1–14: 37,5 mg; dag 15–28: 28,13 mg; dag 29–42: 21,09 mg; dag 43–56: 15,82 mg; dag 57–70: 11,87 mg; dag 71–84: 8,9 mg; fra dag 85: 6,67 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Minste antall dager per trinn er valgt av forskriveren innenfor regelens område – oppfylt. 14 dager i stedet for regelens forslag 28 dager; regelen tillater minst 14 dager, av tekniske grunner høyst 365 dager.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Planen går ikke til null. Fra dag 85 står pasienten på 6,67 mg av sertralin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 12,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 9,38 mg; fra dag 29: 7,03 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 12,5 mg.
  - Merknad: Planen går ikke til null. Fra dag 29 står pasienten på 7,03 mg av sertralin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *6 mg er under den nedre grensen: regelen har ingen trinn, og beregningen sier det.* Inndata: startdose 6 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Dosen 6 mg av sertralin er under regelens nedre grense (6,25 mg). Regelen har ingen trinn under den og ingen godkjent avslutning; videre nedtrapping og avslutning må vurderes individuelt.
- *250 mg er over dosene regelen gjelder for.* Inndata: startdose 250 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Stop`.

## Seponering av venlafaksin, langsom prosentvis nedtrapping (høy risiko)

`seponering-venlafaksin`, versjon 4, fingeravtrykk `213a27ab3e98f40b0ad10e89a11be073acd4edc301eddf6d955ff276378f5a6a`. Seponering: venlafaksin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker, for noen over måneder. Kapslene skal svelges hele. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*
- Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.
  - Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Appendix 1)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–10 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager), til neste dose ville vært under planens nedre grense 9,375 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–10 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 9,375 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (37,5 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på dmp-efexor-depot pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose høyst 375 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (375 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-efexor-depot pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.
- Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- De fleste trinnene kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra laveste døgndose: 10 % per trinn, minst 28 dager, til neste dose ville vært under 9,38 mg.* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 33,75 mg; dag 29–56: 30,38 mg; dag 57–84: 27,34 mg; dag 85–112: 24,6 mg; dag 113–140: 22,14 mg; dag 141–168: 19,93 mg; dag 169–196: 17,94 mg; dag 197–224: 16,14 mg; dag 225–252: 14,53 mg; dag 253–280: 13,08 mg; dag 281–308: 11,77 mg; dag 309–336: 10,59 mg; fra dag 337: 9,53 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 375 mg (bindende) – oppfylt. 37,5 mg.
  - Merknad: Planen går ikke til null. Fra dag 337 står pasienten på 9,53 mg av venlafaksin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Mer enn 10 % per trinn er utenfor regelen ved høyest risiko og krever en individuelt utarbeidet plan.* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei; valgt: prosent 25.
  - **Stoppet:** Reduksjon per trinn (% av aktuell dose): 25 % er utenfor det regelen tillater (5–10 %).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 37,5 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ve>Stop`.

## Seponering av vortioksetin, gjentatt prosentvis nedtrapping

`seponering-vortioksetin`, versjon 4, fingeravtrykk `c82100571fc1b1cde5ecb195d74d14a5e0713aea05fd25219a9e32b216f2c9e0`. Seponering: vortioksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code) → utkast (versjon 4, 29.10.2026, Claude Code) → til faglig kontroll (versjon 4, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 %), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid), til neste dose ville vært under planens nedre grense 1,25 mg. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % (forskriveren kan velge 5–50 %) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Lav potensiell risiko (RCPsych) og lang halveringstid: 25 % av aktuell dose per trinn som standard; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse. (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping How should I gradually reduce my dose?)<br>Begrunnelse kreves over 25 % (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Større reduksjoner enn 25 % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. (bygger på rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på ema-brintellix section 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 1,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (5 mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. (bygger på ema-brintellix section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse. (bygger på rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)<br>Begrunnelse kreves under 28 dager ved lang behandlingstid (**OUSFAR-vurdering, avklart 29.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 4): Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier:** Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping How should I gradually reduce my dose?)) |

**Betingelser:**

- Startdose høyst 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (20 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på ema-brintellix section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.
- Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.

**Usikkerhet:**

- Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.
- Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.
- Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.
- Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg med standardvalgene, til neste dose ville vært under 1,25 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–28: 15 mg; dag 29–56: 11,25 mg; dag 57–84: 8,44 mg; dag 85–112: 6,33 mg; dag 113–140: 4,75 mg; dag 141–168: 3,56 mg; dag 169–196: 2,67 mg; dag 197–224: 2 mg; fra dag 225: 1,5 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 20 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 225 står pasienten på 1,5 mg av vortioksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 10 mg etter lang behandlingstid med 25 % og 28 dager: ingen begrunnelse trengs ved lav risiko.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja.
  - **fra:** dag 1–28: 7,5 mg; dag 29–56: 5,63 mg; dag 57–84: 4,22 mg; dag 85–112: 3,16 mg; dag 113–140: 2,37 mg; dag 141–168: 1,78 mg; fra dag 169: 1,33 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Ja – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er høyst 20 mg (bindende) – oppfylt. 10 mg.
  - Merknad: Planen går ikke til null. Fra dag 169 står pasienten på 1,33 mg av vortioksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Etter lang behandlingstid krever 14 dager per trinn en begrunnelse.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja; valgt: trinnlengde 14.
  - **Stoppet:** Minste antall dager per trinn 14 dager krever en skriftlig begrunnelse fra forskriveren (under 28 dager ved lang behandlingstid). Skriv begrunnelsen, eller velg en annen verdi.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Vo>Stop`.

## Seponering av agomelatin

`seponering-agomelatin`, versjon 1, fingeravtrykk `6d42863f3573fb2e0d6dbffd27ff78a7f1c2b539c8dce2cfcd36ad417b61a2d1`. Seponering: agomelatin → –. **Bare tekstlig veiledning**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Agomelatin kan seponeres uten nedtrapping.
  - Ingen nedtrapping er nødvendig når behandlingen avsluttes. *([ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf), section 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR beregner ingen nedtrappingsplan for agomelatin. I Norge finnes agomelatin bare med godkjenningsfritak. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |

**Betingelser:**

- Startdose 25–50 mg (bindende; ema-valdoxan section 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Preparatomtalen er den sentralt godkjente fra EMA; det finnes ingen norsk preparatomtale fordi preparatet ikke er markedsført i Norge.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):



**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ag>Stop`.
