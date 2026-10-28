# OUSFAR Verktøy – P7: regelutkast for nedtrapping av antidepressiva

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping` versjon 3, regelmodell 4, beregningsmotor 2. Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych. Hver plan er et startforslag som forskriveren kan justere innenfor regelens områder. Til faglig kontroll; ingen regel er klinisk godkjent.

**15 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md` og `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | seponering | amitriptylin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 4 |
| `seponering-bupropion` | seponering | bupropion → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 3 |
| `seponering-citalopram` | seponering | citalopram → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 6 |
| `seponering-duloksetin` | seponering | duloksetin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 3 |
| `seponering-fluoksetin` | seponering | fluoksetin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 5 |
| `seponering-fluvoksamin` | seponering | fluvoksamin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 3 |
| `seponering-klomipramin` | seponering | klomipramin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 3 |
| `seponering-mirtazapin` | seponering | mirtazapin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 3 |
| `seponering-moklobemid` | seponering | moklobemid → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 3 |
| `seponering-nortriptylin` | seponering | nortriptylin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 5 |
| `seponering-paroksetin` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-sertralin` | seponering | sertralin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 7 |
| `seponering-venlafaksin` | seponering | venlafaksin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-vortioksetin` | seponering | vortioksetin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 4 |
| `seponering-agomelatin` | seponering | agomelatin → – | bare tekstlig veiledning | 0 | til faglig kontroll | 0 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
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

`seponering-amitriptylin`, versjon 3, fingeravtrykk `e98f5e23b15ddb27a3a2712f7a1a9687508eb795fbecb40d8d1e5394b360d95b`. Seponering: amitriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.
  - Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2 og 4.8)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 10 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-sarotex pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-sarotex pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis over flere uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-sarotex pkt. 4.2 og 4.8; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 150 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (150 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-sarotex pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.
- Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 mg og alt under 10 mg) kan derfor ikke gis nøyaktig, og P5 stopper.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: halvering ned til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 25 mg; dag 29–42: 12,5 mg; dag 43–56: 6,25 mg; dag 57–70: 4,69 mg; dag 71–84: 3,52 mg; dag 85–98: 2,64 mg; fra dag 99: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 150 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av amitriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–98 (98 dager).
- *Fra 4 mg blir nedtrappingen 14 dager, kortere enn 28 dager.* Inndata: startdose 4 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av amitriptylin blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:At>Stop`.

## Seponering av bupropion, gjentatt prosentvis nedtrapping

`seponering-bupropion`, versjon 3, fingeravtrykk `52d02b91b9b693e24df758ea6ea496d493962336dbbb263cf62e654884e0ea9a`. Seponering: bupropion → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.
  - Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 150 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 37,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 150 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-wellbutrin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 37,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (150 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-wellbutrin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen krever ingen minste varighet. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-wellbutrin pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-wellbutrin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.
- Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.
- Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg: 150 mg, så 25 % per trinn til neste dose er under 37,5 mg.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 150 mg; dag 15–28: 112,5 mg; dag 29–42: 84,38 mg; dag 43–56: 63,28 mg; dag 57–70: 47,46 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 300 mg (bindende) – oppfylt. 300 mg.
  - Kontroll: Nedtrappingen av bupropion varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 300 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Bu>Stop`.

## Seponering av citalopram, gjentatt prosentvis nedtrapping

`seponering-citalopram`, versjon 3, fingeravtrykk `e964531b0548817df0482e9528187449a5dbd40831697b014e1f0ee28a342b8d`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 10 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-cipramil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-cipramil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-cipramil pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 40 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (40 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-cipramil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: ett halveringstrinn til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 7,5 mg; dag 29–42: 5,63 mg; dag 43–56: 4,22 mg; dag 57–70: 3,16 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Fra 10 mg, på grensen: 25 % fra første trinn.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 7,5 mg; dag 15–28: 5,63 mg; dag 29–42: 4,22 mg; dag 43–56: 3,16 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 40 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Fra 3,34 mg blir nedtrappingen 14 dager, kortere enn 28 dager, så beregningen stopper.* Inndata: startdose 3,34 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av citalopram blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *2 mg er under sluttdosen: regelen har ingen videre nedtrapping, og beregningen sier det.* Inndata: startdose 2 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Dosen 2 mg av citalopram er under regelens sluttdose (2,5 mg), der regelen går over til seponering. Regelen har ingen godkjent videre nedtrapping eller seponering fra en så lav dose; det må vurderes individuelt.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Seponering av duloksetin, langsom prosentvis nedtrapping (høy risiko)

`seponering-duloksetin`, versjon 3, fingeravtrykk `7235c55a2feee3a874b2b8b702abf597f88bfc164b3c438c1e70ee0164860b88`. Seponering: duloksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–50), med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 7,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 7,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (30 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på ema-cymbalta section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på ema-cymbalta section 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 120 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (120 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på ema-cymbalta section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.
- Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene kan ikke gis med registrerte kapsler på 30 og 60 mg; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 30 mg: 10 % per trinn til neste dose er under 7,5 mg.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 27 mg; dag 15–28: 24,3 mg; dag 29–42: 21,87 mg; dag 43–56: 19,68 mg; dag 57–70: 17,71 mg; dag 71–84: 15,94 mg; dag 85–98: 14,35 mg; dag 99–112: 12,91 mg; dag 113–126: 11,62 mg; dag 127–140: 10,46 mg; dag 141–154: 9,41 mg; dag 155–168: 8,47 mg; dag 169–182: 7,63 mg; fra dag 183: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 120 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–182 (182 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 30 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Du>Stop`.

## Seponering av fluoksetin, gjentatt prosentvis nedtrapping

`seponering-fluoksetin`, versjon 3, fingeravtrykk `bd29d75166ea6d20455cef5e509abb3986e54e8eae7f28408ff511a8efb1c956`. Seponering: fluoksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50), med 28 dager per trinn, og seponerer når neste dose blir under 5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Trinnene varer 28 dager og kan ikke kortes ned.
  - Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (20 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-fluoxetin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych anbefaler minst fire uker før neste reduksjon av langtidsvirkende fluoksetin, fordi symptomene kan komme sent; NICE nevner én til to uker for å vurdere virkningen. OUSFAR bruker det strengeste. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.18 (om fluoksetin)) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-fluoxetin pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-fluoxetin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halve doser i stedet, og 5 mg krever flytende form eller deling i fire.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 20, 10 og 5 mg med 28 dager per trinn.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–28: 20 mg; dag 29–56: 10 mg; dag 57–84: 5 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra 20 mg: 10 og 5 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–28: 10 mg; dag 29–56: 5 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Fra 7 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 28 dager.* Inndata: startdose 7 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av fluoksetin blir 0 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Stop`.

## Seponering av fluvoksamin, gjentatt prosentvis nedtrapping

`seponering-fluvoksamin`, versjon 3, fingeravtrykk `a742673a88f35e597d04c05a4dac36d2366ac215e76a7445907d79eca92e0624`. Seponering: fluvoksamin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 50 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 12,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 50 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-fevarin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 12,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (50 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-fevarin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-fevarin pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-fevarin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 12,5 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 37,5 mg; dag 29–42: 28,13 mg; dag 43–56: 21,09 mg; dag 57–70: 15,82 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 300 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fv>Stop`.

## Seponering av klomipramin, gjentatt prosentvis nedtrapping

`seponering-klomipramin`, versjon 3, fingeravtrykk `a29414badd25e2b235a568f49b6a49ebdbc2a16d43c7fd74a6ce1faffa5ec288`. Seponering: klomipramin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.
  - Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05467.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 10 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-anafranil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-anafranil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-anafranil pkt. 4.2 og 4.4; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 250 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (250 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-anafranil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg: 25 og 12,5 mg kan gis med halve tabletter; de lavere trinnene må P5 kunne gi.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 12,5 mg; dag 29–42: 6,25 mg; dag 43–56: 4,69 mg; dag 57–70: 3,52 mg; dag 71–84: 2,64 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 250 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av klomipramin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Cl>Stop`.

## Seponering av mirtazapin, langsom prosentvis nedtrapping (høy risiko)

`seponering-mirtazapin`, versjon 3, fingeravtrykk `09d784e7bc21c8edc94fed550ff985e86e4810e51fbf56bad9567445b5511848`. Seponering: mirtazapin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–50), med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 3,75 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 3,75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (15 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-remeron pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-remeron pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 45 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (45 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-remeron pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 15 mg: 10 % per trinn til neste dose er under 3,75 mg.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 13,5 mg; dag 15–28: 12,15 mg; dag 29–42: 10,94 mg; dag 43–56: 9,84 mg; dag 57–70: 8,86 mg; dag 71–84: 7,97 mg; dag 85–98: 7,17 mg; dag 99–112: 6,46 mg; dag 113–126: 5,81 mg; dag 127–140: 5,23 mg; dag 141–154: 4,71 mg; dag 155–168: 4,24 mg; dag 169–182: 3,81 mg; fra dag 183: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 45 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–182 (182 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 15 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mz>Stop`.

## Seponering av moklobemid, langsom prosentvis nedtrapping (høy risiko)

`seponering-moklobemid`, versjon 3, fingeravtrykk `51275958ec1933a4135fb4d7b09529413a7136c5e0db4866d5dd902bec8f5662`. Seponering: moklobemid → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–50), med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 75 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (300 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-aurorix pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen krever ingen minste varighet. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-aurorix pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 600 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (600 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-aurorix pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))
- Unntak (`nedsatt_leverfunksjon`): Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. (dmp-aurorix pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko. Regelen følger RCPsych; det må avklares faglig.
- Trinnene krever doser som ikke kan settes sammen av tabletter på 150 og 300 mg; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg: 10 % per trinn til neste dose er under 75 mg.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 270 mg; dag 15–28: 243 mg; dag 29–42: 218,7 mg; dag 43–56: 196,83 mg; dag 57–70: 177,15 mg; dag 71–84: 159,43 mg; dag 85–98: 143,49 mg; dag 99–112: 129,14 mg; dag 113–126: 116,23 mg; dag 127–140: 104,6 mg; dag 141–154: 94,14 mg; dag 155–168: 84,73 mg; dag 169–182: 76,26 mg; fra dag 183: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 600 mg (bindende) – oppfylt. 300 mg.
  - Kontroll: Nedtrappingen av moklobemid varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–182 (182 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 300 mg; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja, nedsatt_leverfunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mo>Stop`.

## Seponering av nortriptylin, gjentatt prosentvis nedtrapping

`seponering-nortriptylin`, versjon 3, fingeravtrykk `bbcf662ed45eea87ad7fb12188b8046a9e2661e22ec3e341876854e744945662`. Seponering: nortriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.
  - Brå seponering etter lang tids bruk kan gi abstinenssymptomer. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 25 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 6,25 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
  - Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-noritren pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-noritren pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier bare at brå seponering etter lang bruk kan gi abstinenssymptomer. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-noritren pkt. 4.4; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-noritren pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE og RCPsych.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 18,75 mg; dag 29–42: 14,06 mg; dag 43–56: 10,55 mg; dag 57–70: 7,91 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av nortriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 11,25 mg; dag 15–28: 8,44 mg; dag 29–42: 6,33 mg; fra dag 43: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Nedtrappingen av nortriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 10 mg blir nedtrappingen 14 dager, kortere enn 28 dager.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av nortriptylin blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:No>Stop`.

## Seponering av paroksetin, langsom prosentvis nedtrapping (høy risiko)

`seponering-paroksetin`, versjon 3, fingeravtrykk `771148860d422d5b555a10bdc038431efe7dba014cb2a54f2739cbf3d08b0304`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–50), med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) brukes ikke som regel; den ligger som rask studievariant i sammenligningssettet og er ikke en klinisk anbefaling ved langvarig behandling.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-seroxat pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier over flere uker eller måneder. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-seroxat pkt. 4.4; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-seroxat pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- De fleste trinnene krever deling av tabletter eller flytende form (mikstur); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 10 mg: 10 % per trinn til neste dose er under 2,5 mg (seks måneder).* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 9 mg; dag 15–28: 8,1 mg; dag 29–42: 7,29 mg; dag 43–56: 6,56 mg; dag 57–70: 5,9 mg; dag 71–84: 5,31 mg; dag 85–98: 4,78 mg; dag 99–112: 4,3 mg; dag 113–126: 3,87 mg; dag 127–140: 3,49 mg; dag 141–154: 3,14 mg; dag 155–168: 2,82 mg; dag 169–182: 2,54 mg; fra dag 183: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–182 (182 dager).
- *Fra 20 mg med forskriverens valg av 25 % per trinn.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 15 mg; dag 15–28: 11,25 mg; dag 29–42: 8,44 mg; dag 43–56: 6,33 mg; dag 57–70: 4,75 mg; dag 71–84: 3,56 mg; dag 85–98: 2,67 mg; fra dag 99: seponert
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 25 % i stedet for regelens forslag 10 %; regelen tillater 5–50 %.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–98 (98 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 10 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.

## Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 3, fingeravtrykk `aa9a1cae8936307f40da10787906d7deeca9f4c692345825f36995f4ec8c2fbf`. Seponering: sertralin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 25 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 6,25 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-zoloft pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-zoloft pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-zoloft pkt. 4.2 og 4.4; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-zoloft pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: halvering til 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 25 mg; dag 29–42: 18,75 mg; dag 43–56: 14,06 mg; dag 57–70: 10,55 mg; dag 71–84: 7,91 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra 200 mg med forskriverens valg av 25 % og 28 dager per trinn, f.eks. etter lang behandlingstid.* Inndata: startdose 200 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–28: 150 mg; dag 29–56: 112,5 mg; dag 57–84: 84,38 mg; dag 85–112: 63,28 mg; dag 113–140: 47,46 mg; dag 141–168: 35,6 mg; dag 169–196: 26,7 mg; dag 197–224: 20,02 mg; dag 225–252: 15,02 mg; dag 253–280: 11,26 mg; dag 281–308: 8,45 mg; dag 309–336: 6,34 mg; fra dag 337: seponert
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 25 % i stedet for regelens forslag 50 %; regelen tillater 5–50 %.
  - Kontroll: Dager per trinn er valgt av forskriveren innenfor regelens område – oppfylt. 28 dager i stedet for regelens forslag 14 dager; regelen tillater 14–28 dager.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 200 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–336 (336 dager).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 12,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 9,38 mg; dag 15–28: 7,03 mg; fra dag 29: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 200 mg (bindende) – oppfylt. 12,5 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *6 mg er under sluttdosen: regelen har ingen videre nedtrapping, og beregningen sier det.* Inndata: startdose 6 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Dosen 6 mg av sertralin er under regelens sluttdose (6,25 mg), der regelen går over til seponering. Regelen har ingen godkjent videre nedtrapping eller seponering fra en så lav dose; det må vurderes individuelt.
- *250 mg er over dosene regelen gjelder for.* Inndata: startdose 250 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Startdosen 250 mg er utenfor det regelen gjelder for (høyst 200 mg).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Stop`.

## Seponering av venlafaksin, langsom prosentvis nedtrapping (høy risiko)

`seponering-venlafaksin`, versjon 3, fingeravtrykk `6a45d59da41e0b3cbbbfec7d30966a921016dafcdb4bb9c0e6609b28e8b38f0d`. Seponering: venlafaksin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

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

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 10 % av aktuell dose (forskriveren kan velge 5–50), med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 9,375 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 10 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 9,375 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (37,5 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på dmp-efexor-depot pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier minst én til to uker. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på dmp-efexor-depot pkt. 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 375 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (375 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på dmp-efexor-depot pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.
- Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- De fleste trinnene kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra laveste døgndose: 10 % per trinn til neste dose er under 9,38 mg (seks måneder).* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 33,75 mg; dag 15–28: 30,38 mg; dag 29–42: 27,34 mg; dag 43–56: 24,6 mg; dag 57–70: 22,14 mg; dag 71–84: 19,93 mg; dag 85–98: 17,94 mg; dag 99–112: 16,14 mg; dag 113–126: 14,53 mg; dag 127–140: 13,08 mg; dag 141–154: 11,77 mg; dag 155–168: 10,59 mg; dag 169–182: 9,53 mg; fra dag 183: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 375 mg (bindende) – oppfylt. 37,5 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–182 (182 dager).
- *Fra 150 mg med forskriverens valg av 25 % og 28 dager per trinn.* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–28: 112,5 mg; dag 29–56: 84,38 mg; dag 57–84: 63,28 mg; dag 85–112: 47,46 mg; dag 113–140: 35,6 mg; dag 141–168: 26,7 mg; dag 169–196: 20,02 mg; dag 197–224: 15,02 mg; dag 225–252: 11,26 mg; fra dag 253: seponert
  - Kontroll: Reduksjon per trinn (% av aktuell dose) er valgt av forskriveren innenfor regelens område – oppfylt. 25 % i stedet for regelens forslag 10 %; regelen tillater 5–50 %.
  - Kontroll: Dager per trinn er valgt av forskriveren innenfor regelens område – oppfylt. 28 dager i stedet for regelens forslag 14 dager; regelen tillater 14–28 dager.
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 375 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–252 (252 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 37,5 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ve>Stop`.

## Seponering av vortioksetin, gjentatt prosentvis nedtrapping

`seponering-vortioksetin`, versjon 3, fingeravtrykk `5af17af9c4bacb590c1cf050fad2bb2674b97cb5d184594ee78494a6842180d7`. Seponering: vortioksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 28.10.2026, Claude Code) → til faglig kontroll (versjon 3, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose (forskriveren kan velge 5–50) ned til 5 mg og deretter 25 %, med 14 dager per trinn (forskriveren kan velge 14–28), og seponerer når neste dose blir under 1,25 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % (forskriveren kan velge 5–50) | veiledende | **OUSFAR-vurdering, åpent forslag:** Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel. Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych). (bygger på rcpsych-stopping Appendix 1; rcpsych-stopping Which plan should I follow?; nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på ema-brintellix section 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 1,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (5 mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning. (bygger på ema-brintellix section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping When and how should I stop my antidepressants?) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen krever ingen minste varighet. RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig. (bygger på ema-brintellix section 4.2; rcpsych-stopping When and how should I stop my antidepressants?) |

**Betingelser:**

- Startdose høyst 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Høyst den høyeste døgndosen preparatomtalen oppgir (20 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig. (bygger på ema-brintellix section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16; rcpsych-stopping Which plan should I follow?; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.

**Usikkerhet:**

- Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.
- Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: 10 og 5 mg, så 25 % per trinn til neste dose er under 1,25 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; dag 29–42: 3,75 mg; dag 43–56: 2,81 mg; dag 57–70: 2,11 mg; dag 71–84: 1,58 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av vortioksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra sluttdosen blir nedtrappingen kortere enn 28 dager.* Inndata: startdose 1,25 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av vortioksetin blir 0 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

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
