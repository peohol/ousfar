# OUSFAR Verktøy – P7: nedtrapping av antidepressiva

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene eller dekningen og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping` versjon 1, regelmodell 3, beregningsmotor 1. Regelutkast for nedtrapping til seponering av antidepressiva (P7): halvering etter NICE der preparatomtalen gir grunnlag, paroksetin etter preparatomtalens regime, og fagtekst der kildene ikke gir grunnlag for en beregning. Til faglig kontroll; ingen regel er klinisk godkjent. Bakgrunnen, valgene og de åpne faglige beslutningene står i `docs/verktøy-p7-nedtrapping.md`.

**11 nye regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. Hvilke doser som kan gis med norske preparater, avgjøres av doseplanmotoren (P5) med FEST; en dose som ikke kan gis nøyaktig, stopper beregningen.

## Kilde- og dekningsmatrise

Alle 23 antidepressiva i kildetabellen (johannesurt er utelatt): 9 med beregnbar regel til faglig kontroll, 3 med bare fagtekst, 8 der anbefaling mangler og 3 med en annen begrunnet begrensning. Ingen regel er klinisk godkjent, så verktøyet viser ingen doseplan for noen av dem ennå.

Statusen er OUSFARs og skilt fra kildens Stop-anbefaling: kolonnen for Stop-oppføringen sier bare om kilden finnes i P3-arkivet. Ingen regel bygger på teksten der, og den vises ikke. Regler fra pilotsettet (P4) er tatt med for citalopram og escitalopram. Preparatkolonnen viser registrerte, markedsførte preparater og, for seg, dem som bare finnes med godkjenningsfritak; kombinasjonspreparater er utelatt.

| Virkestoff | OUSFAR-status | Regler | Kildens Stop-oppføring (P3) | Norske preparater i FEST (08.10.2026) | Grunn | Åpne faglige spørsmål |
| --- | --- | --- | --- | --- | --- | --- |
| agomelatin | Bare fagtekst | `seponering-agomelatin` | `SwitchAntidepressants:Ag>Stop` (hentet) | bare godkjenningsfritak: tab 25 mg | Preparatomtalen sier at nedtrapping ikke trengs, så det er ingenting å beregne. I Norge finnes bare preparater med godkjenningsfritak. | Om fagteksten kan publiseres, og hvordan den skal forholde seg til NICEs generelle råd om trinnvis nedtrapping. |
| amitriptylin | Annen begrunnet begrensning | – | `SwitchAntidepressants:At>Stop` (hentet) | tab 10 mg, tab 25 mg, tab 50 mg; også godkjenningsfritak: depotkaps, hard 50 mg, mikst oppl 10 mg/5 ml, mikst oppl 50 mg/5 ml | Preparatomtalen sier at dosen skal trappes gradvis ned over flere uker, men oppgir verken trinn eller sluttdose, og FEST oppgir ikke delbarhet for tablettene på 10, 25 og 50 mg. En regel krever en faglig beslutning om strategien først. | Hvilken strategi trisykliske antidepressiva skal ha (andel av dosen eller faste mg-trinn), trinnlengde, sluttdose og minste varighet. Amitriptylin brukes også i lave doser mot smerter og hodepine; om verktøyet skal gjelde de indikasjonene. |
| bupropion | Bare fagtekst | `seponering-bupropion` | `SwitchAntidepressants:Bu>Stop` (hentet) | tab modif frisetting 150 mg, tab modif frisetting 300 mg | Preparatomtalen sier at en nedtrappingsperiode bør vurderes, men gir ingen plan, og tablettene med modifisert frisetting kan ikke deles. | Om fagteksten kan publiseres, og om en reduksjon fra 300 til 150 mg før seponering skal kunne beregnes. |
| citalopram | Beregnbar regel til faglig kontroll | `seponering-citalopram-hyperbolsk`, `seponering-citalopram` | `SwitchAntidepressants:Ci>Stop` (hentet) | tab 10 mg, tab 20 mg, tab 40 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. To regler: halvering (standard) og hyperbolsk (alternativ fra pilotsettet). | Hvilken av de to strategiene som skal være standard i verktøyet (B2). |
| doksepin | Mangler anbefaling | – | `SwitchAntidepressants:Dx>Stop` (hentet fra kildens egen side) | kaps 25 mg; også godkjenningsfritak: kaps 10 mg | FEST lenker ikke til en norsk preparatomtale for Sinequan, og OUSFAR har ikke en preparatomtale å bygge en regel på. Kapslene kan ikke deles. | Om en norsk preparatomtale for Sinequan finnes og kan hentes. |
| dosulepin | Mangler anbefaling | – | `SwitchAntidepressants:Ds>Stop` (hentet) | ingen | FEST har ingen preparater, og det finnes ingen norsk preparatomtale å bygge en regel på. | – |
| duloksetin | Beregnbar regel til faglig kontroll | `seponering-duloksetin` | `SwitchAntidepressants:Du>Stop` (hentet) | enterokaps 30 mg, enterokaps 60 mg; også godkjenningsfritak: enterokaps 20 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. | – |
| escitalopram | Beregnbar regel til faglig kontroll | `seponering-escitalopram` | `SwitchAntidepressants:Es>Stop` (hentet) | dråper, oppl 20 mg/ml, tab 5 mg, tab 10 mg, tab 20 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. Regelen er fra pilotsettet (P4). | Pilotregelen går lenger ned (25 % trinn til 2,5 mg) enn P7-reglene, som slutter ved laveste dose i preparatomtalen; om sluttdosene skal samordnes. |
| fenelzin | Mangler anbefaling | – | `SwitchAntidepressants:Fe>Stop` (ikke tilgjengelig) | bare godkjenningsfritak: tab 15 mg | FEST har bare preparater med godkjenningsfritak og ingen norsk preparatomtale å bygge en regel på. Psychiatrienets Stop-oppføring er heller ikke tilgjengelig. | – |
| fluoksetin | Beregnbar regel til faglig kontroll | `seponering-fluoksetin` | `SwitchAntidepressants:Fo>Stop` (hentet) | disperg tab 20 mg, kaps 20 mg, tab 20 mg; også godkjenningsfritak: smeltetab 20 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. | Om fluoksetin, med lang halveringstid, trenger nedtrapping; kildene er ikke enige. |
| fluvoksamin | Beregnbar regel til faglig kontroll | `seponering-fluvoksamin` | `SwitchAntidepressants:Fv>Stop` (hentet) | tab 50 mg, tab 100 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. | – |
| imipramin | Mangler anbefaling | – | `SwitchAntidepressants:Im>Stop` (hentet) | bare godkjenningsfritak: tab 25 mg | FEST har bare preparater med godkjenningsfritak og ingen norsk preparatomtale å bygge en regel på. | – |
| klomipramin | Annen begrunnet begrensning | – | `SwitchAntidepressants:Cl>Stop` (hentet) | tab 10 mg, tab 25 mg | Preparatomtalen sier at dosen trappes gradvis ned etter langvarig bruk, men også så raskt som mulig, uten trinn eller varighet. En regel krever en faglig beslutning om strategien først. | Hvilken strategi trisykliske antidepressiva skal ha (andel av dosen eller faste mg-trinn), trinnlengde, sluttdose og minste varighet. |
| maprotilin | Mangler anbefaling | – | `SwitchAntidepressants:Ma>Stop` (hentet) | ingen | FEST har ingen preparater, og det finnes ingen norsk preparatomtale å bygge en regel på. | – |
| mirtazapin | Beregnbar regel til faglig kontroll | `seponering-mirtazapin` | `SwitchAntidepressants:Mz>Stop` (hentet) | smeltetab 15 mg, smeltetab 30 mg, smeltetab 45 mg, tab 15 mg, tab 30 mg, tab 45 mg; også godkjenningsfritak: mikst oppl 15 mg/ml | Preparatomtalen sier at behandlingen avsluttes gradvis, og oppgir doseområdet; varigheten er OUSFARs tolkning. | Om «gradvis» kan leses som minst ett trinn på 14 dager. |
| moklobemid | Mangler anbefaling | – | `SwitchAntidepressants:Mo>Stop` (hentet) | tab 150 mg, tab 300 mg | Preparatomtalen omtaler ikke nedtrapping ved seponering, og FEST oppgir ikke delbarhet for tablettene på 150 og 300 mg. | Om NICEs generelle prinsipp alene er nok grunnlag for en regel for en reversibel MAO-hemmer. |
| nortriptylin | Annen begrunnet begrensning | – | `SwitchAntidepressants:No>Stop` (hentet) | tab 10 mg, tab 25 mg, tab 50 mg | Preparatomtalen sier at brå seponering etter lang tids bruk kan gi abstinenssymptomer, men gir ingen nedtrappingsplan; dosereduksjonen den beskriver gjelder vedlikeholdsdosen. En regel krever en faglig beslutning om strategien først. | Hvilken strategi trisykliske antidepressiva skal ha (andel av dosen eller faste mg-trinn), trinnlengde, sluttdose og minste varighet. |
| paroksetin | Beregnbar regel til faglig kontroll | `seponering-paroksetin` | `SwitchAntidepressants:Pa>Stop` (hentet) | tab 20 mg | Preparatomtalen beskriver nedtrappingsregimet fra de kliniske studiene (10 mg lavere hver uke), og regelen følger det. | Om studieregimet (like store mg-trinn) skal brukes, eller halvering som for de andre. |
| sertralin | Beregnbar regel til faglig kontroll | `seponering-sertralin` | `SwitchAntidepressants:Se>Stop` (hentet) | kons til mikst 20 mg/ml, tab 25 mg, tab 50 mg, tab 100 mg; også godkjenningsfritak: kaps 25 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. | – |
| tranylcypromin | Mangler anbefaling | – | `SwitchAntidepressants:Tc>Stop` (hentet) | bare godkjenningsfritak: tab 10 mg | FEST har bare preparater med godkjenningsfritak og ingen norsk preparatomtale å bygge en regel på. | – |
| trazodon | Mangler anbefaling | – | `SwitchAntidepressants:Td>Stop` (hentet) | bare godkjenningsfritak: kaps 50 mg, kaps 100 mg, tab 50 mg, tab 100 mg | FEST har bare preparater med godkjenningsfritak og ingen norsk preparatomtale å bygge en regel på. | – |
| venlafaksin | Beregnbar regel til faglig kontroll | `seponering-venlafaksin` | `SwitchAntidepressants:Ve>Stop` (hentet) | depotkaps, hard 37,5 mg, depotkaps, hard 75 mg, depotkaps, hard 150 mg, depottab 75 mg, depottab 150 mg, depottab 225 mg, depottab 300 mg | Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. | Om 14 dager per trinn er for raskt; preparatomtalen sier at noen trenger flere måneder. |
| vortioksetin | Bare fagtekst | `seponering-vortioksetin` | `SwitchAntidepressants:Vo>Stop` (hentet fra kildens egen side) | tab 5 mg, tab 10 mg, tab 15 mg, tab 20 mg | Preparatomtalen sier at gradvis nedtrapping kan vurderes, men at det ikke finnes nok data til å anbefale en nedtrappingsplan. | Om fagteksten kan publiseres, eller om en generell nedtrapping etter NICE skal kunne beregnes likevel. |

**Kildegrunnlaget for virkestoffene uten beregnbar regel:**

- **agomelatin:** Dosen trenger ikke trappes ned når behandlingen avsluttes. *([ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf), section 4.2)*
- **amitriptylin:** Når behandlingen avsluttes, skal dosen trappes gradvis ned over flere uker; trinn oppgis ikke. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04327.pdf), pkt. 4.2)* Plutselig seponering etter langvarig bruk kan gi abstinenssymptomer som hodepine, uvelhet, søvnløshet og irritabilitet. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04327.pdf), pkt. 4.4)*
- **bupropion:** Seponeringsreaksjoner ble ikke sett i de kliniske studiene, men en nedtrappingsperiode bør vurderes; rebound eller seponeringsreaksjoner kan ikke utelukkes. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)* Tablettene skal svelges hele og må ikke deles, knuses eller tygges, fordi det kan øke risikoen for bivirkninger, også krampeanfall. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- **klomipramin:** Brå seponering bør unngås; etter jevnlig bruk over lang tid trappes dosen gradvis ned, og pasienten følges nøye. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05757.pdf), pkt. 4.2)* Skal behandlingen avsluttes, trappes legemidlet ned så raskt som mulig, men med hensyn til at brå seponering kan gi symptomer. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05757.pdf), pkt. 4.4)*
- **moklobemid:** Anbefalt startdose er 300 mg daglig, eventuelt økt til 600 mg; avsnittet omtaler ikke nedtrapping ved seponering. *([dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf), pkt. 4.2)*
- **nortriptylin:** Brå seponering etter lang tids behandling kan gi abstinenssymptomer som hodepine, uvelhet, søvnløshet og irritabilitet. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04957.pdf), pkt. 4.4)* Etter effekt reduseres dosen gradvis, for eksempel 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene nede; det gjelder vedlikehold, ikke seponering. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04957.pdf), pkt. 4.2)*
- **vortioksetin:** Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men det finnes ikke nok data til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*

## Oversikt over de nye reglene

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-agomelatin` | seponering | agomelatin → – | bare tekstlig veiledning | 0 | til faglig kontroll | 0 |
| `seponering-bupropion` | seponering | bupropion → – | bare tekstlig veiledning | 0 | til faglig kontroll | 0 |
| `seponering-citalopram` | seponering | citalopram → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 5 |
| `seponering-duloksetin` | seponering | duloksetin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `seponering-fluoksetin` | seponering | fluoksetin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `seponering-fluvoksamin` | seponering | fluvoksamin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-mirtazapin` | seponering | mirtazapin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-paroksetin` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 4 |
| `seponering-sertralin` | seponering | sertralin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `seponering-venlafaksin` | seponering | venlafaksin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `seponering-vortioksetin` | seponering | vortioksetin → – | bare tekstlig veiledning | 0 | til faglig kontroll | 0 |

## Kilder

Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet 28.10.2026.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf) | preparatomtale | Cipramil (citalopram) tabletter, preparatomtale | Oppdatert 16.05.2024 | `4bc8dfd2e647d273…` |
| [dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf) | preparatomtale | Zoloft (sertralin) tabletter, preparatomtale | Oppdatert 07.01.2026 | `4ac8f7305379de98…` |
| [dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf) | preparatomtale | Fluoxetine Vitabalans (fluoksetin) tabletter, preparatomtale | Oppdatert 12.11.2021 | `221a73511f81243a…` |
| [dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf) | preparatomtale | Remeron (mirtazapin) tabletter, preparatomtale | Oppdatert 01.09.2021 | `2bc89cecfe0b2a80…` |
| [dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf) | preparatomtale | Seroxat (paroksetin) tabletter, preparatomtale | Oppdatert 17.10.2025 | `feff7cc66006b17b…` |
| [dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf) | preparatomtale | Fevarin (fluvoksamin) tabletter, preparatomtale | Oppdatert 09.02.2022 | `657b31e95bc8e4a6…` |
| [dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf) | preparatomtale | Efexor Depot (venlafaksin) depotkapsler, preparatomtale | Oppdatert 07.01.2026 | `78b5773e061d193e…` |
| [dmp-duloxetin-pensa](https://produktinformasjon.legemiddelsok.no/preparatomtaler/14-10274.pdf) | preparatomtale | Duloxetin Pensa (duloksetin) enterokapsler, preparatomtale | Oppdatert 27.04.2026 | `64adb9f81b3c6119…` |
| [dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04327.pdf) | preparatomtale | Sarotex (amitriptylin) tabletter, preparatomtale | Oppdatert 29.01.2025 | `2ad8048952eddc49…` |
| [dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04957.pdf) | preparatomtale | Noritren (nortriptylin) tabletter, preparatomtale | Oppdatert 20.06.2024 | `1e72fa14b0c31b41…` |
| [dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05757.pdf) | preparatomtale | Anafranil (klomipramin) tabletter, preparatomtale | Oppdatert 26.02.2026 | `13399bacfb980808…` |
| [dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf) | preparatomtale | Aurorix (moklobemid) tabletter, preparatomtale | Oppdatert 13.10.2023 | `70238657f0f1c309…` |
| [dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf) | preparatomtale | Wellbutrin Retard (bupropion) tabletter med modifisert frisetting, preparatomtale | Oppdatert 23.07.2026 | `daf1073b4dddd933…` |
| [ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf) | preparatomtale | Brintellix (vortioksetin), produktinformasjon | Dokumentet sist endret 08.01.2026 | `39c9a9149ac76ca0…` |
| [ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf) | preparatomtale | Valdoxan (agomelatin), produktinformasjon | Dokumentet sist endret 14.04.2025 | `33ae8627c3852425…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av agomelatin, fagtekst uten beregning

`seponering-agomelatin`, versjon 1, fingeravtrykk `5d61d762fbf9168c75ced79b9974afa34de489838c68b9837e118ba776557d21`. Seponering: agomelatin → –. **Bare tekstlig veiledning**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Agomelatin seponeres uten nedtrapping.
  - Dosen trenger ikke trappes ned når behandlingen avsluttes. *([ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf), section 4.2)*
- Anbefalt dose er 25 mg ved sengetid, eventuelt 50 mg.
  - Anbefalt dose er 25 mg ved sengetid; etter to uker uten bedring kan dosen økes til 50 mg. *([ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf), section 4.2)*
- NICE beskriver trinnvis nedtrapping av antidepressiva generelt, med tempo etter pasientens seponeringssymptomer.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR beregner ingen plan for agomelatin, fordi preparatomtalen sier at nedtrapping ikke trengs.
  - Dosen trenger ikke trappes ned når behandlingen avsluttes. *([ema-valdoxan](https://www.ema.europa.eu/en/documents/product-information/valdoxan-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

Ingen; regelen har ingen beregning.

**Betingelser:**

- Ingen.

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- NICE beskriver trinnvis nedtrapping av antidepressiva generelt, mens preparatomtalen sier at agomelatin ikke trenger nedtrapping; hvordan fagteksten skal forholde seg til begge, må avklares faglig.
- Preparatomtalen er EU-preparatomtalen for Valdoxan; i Norge finnes agomelatin bare som preparat med godkjenningsfritak (FEST 08.10.2026).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

Ingen; regelen har ingen beregning.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ag>Stop`.

## Seponering av bupropion, fagtekst uten beregning

`seponering-bupropion`, versjon 1, fingeravtrykk `d6a472fcad4fbcfa99001f0555eb27cab90d585a3749764d1d2476cfcc7af975`. Seponering: bupropion → –. **Bare tekstlig veiledning**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- En nedtrappingsperiode bør vurderes, men preparatomtalen gir ingen plan.
  - Seponeringsreaksjoner ble ikke sett i de kliniske studiene, men en nedtrappingsperiode bør vurderes; rebound eller seponeringsreaksjoner kan ikke utelukkes. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Tablettene kan ikke deles.
  - Tablettene skal svelges hele og må ikke deles, knuses eller tygges, fordi det kan øke risikoen for bivirkninger, også krampeanfall. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Dosen er 150 eller 300 mg én gang daglig.
  - Startdosen er 150 mg én gang daglig; den kan økes til 300 mg. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR beregner ingen plan for bupropion: preparatomtalen gir ingen nedtrappingsplan, og fordi tablettene ikke kan deles, er den eneste mulige reduksjonen fra 300 til 150 mg før seponering. Nedtrappingen vurderes individuelt.
  - Seponeringsreaksjoner ble ikke sett i de kliniske studiene, men en nedtrappingsperiode bør vurderes; rebound eller seponeringsreaksjoner kan ikke utelukkes. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
  - Tablettene skal svelges hele og må ikke deles, knuses eller tygges, fordi det kan øke risikoen for bivirkninger, også krampeanfall. *([dmp-wellbutrin-retard](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

Ingen; regelen har ingen beregning.

**Betingelser:**

- Ingen.

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Om en reduksjon fra 300 til 150 mg før seponering skal kunne beregnes, er et åpent faglig spørsmål.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

Ingen; regelen har ingen beregning.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Bu>Stop`.

## Seponering av citalopram, gjentatt prosentvis nedtrapping

`seponering-citalopram`, versjon 1, fingeravtrykk `d967ef0e50fd26847ff923428d2969ccf94919126e20a1939819c341ae2e9fc0`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 10 mg. Sluttdosen er laveste dose i preparatomtalen (startdosen ved panikklidelse). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Anbefalt dose er 20 mg daglig, maksimalt 40 mg; ved panikklidelse startes det med 10 mg. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (startdosen ved panikklidelse). Under den seponeres. (bygger på dmp-cipramil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-cipramil pkt. 4.2) |

**Betingelser:**

- Startdose 10–40 mg (bindende; dmp-cipramil pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.
- Regelen er standardstrategien ved siden av den hyperbolske pilotregelen for citalopram; hvilken som skal være standard i verktøyet, avgjøres faglig (B2).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg, høyeste dose: to halveringer, så seponering.* Inndata: startdose 40 mg.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 20 mg, vanlig dose: ett trinn på 14 dager, som akkurat oppfyller minimumet.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 30 mg, uvanlig dose: halvparten er 15 mg; neste halvering er under 10 mg.* Inndata: startdose 30 mg.
  - **fra:** dag 1–14: 15 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 10 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 10 mg.
  - **Stoppet:** Nedtrappingen av citalopram blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.
- *60 mg er over dosene regelen gjelder for, så beregningen stopper.* Inndata: startdose 60 mg.
  - **Stoppet:** Startdosen 60 mg er utenfor det regelen gjelder for (10–40 mg).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Seponering av duloksetin, gjentatt prosentvis nedtrapping

`seponering-duloksetin`, versjon 1, fingeravtrykk `81242db7468756e7cc13b32f92aaabbbada6f0a674b69f0cf558570214fa5d3f`. Seponering: duloksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved uakseptable symptomer kan forrige dose gjenopptas og nedtrappingen fortsette over lengre tid. *([dmp-duloxetin-pensa](https://produktinformasjon.legemiddelsok.no/preparatomtaler/14-10274.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 30 mg. Sluttdosen er laveste dose i preparatomtalen (startdosen ved generalisert angstlidelse). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Ved depresjon er start- og vedlikeholdsdosen 60 mg daglig, høyst 120 mg; ved generalisert angstlidelse er startdosen 30 mg. *([dmp-duloxetin-pensa](https://produktinformasjon.legemiddelsok.no/preparatomtaler/14-10274.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved uakseptable symptomer kan forrige dose gjenopptas og nedtrappingen fortsette over lengre tid. *([dmp-duloxetin-pensa](https://produktinformasjon.legemiddelsok.no/preparatomtaler/14-10274.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 30 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (startdosen ved generalisert angstlidelse). Under den seponeres. (bygger på dmp-duloxetin-pensa pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-duloxetin-pensa pkt. 4.2) |

**Betingelser:**

- Startdose 30–120 mg (bindende; dmp-duloxetin-pensa pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 120 mg, høyeste dose.* Inndata: startdose 120 mg.
  - **fra:** dag 1–14: 60 mg; dag 15–28: 30 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 30–120 mg (bindende) – oppfylt. 120 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 60 mg, vanlig dose.* Inndata: startdose 60 mg.
  - **fra:** dag 1–14: 30 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 30–120 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 90 mg: 45 mg, som ikke er en sum av hele kapsler på 30 og 60 mg.* Inndata: startdose 90 mg.
  - **fra:** dag 1–14: 45 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 30–120 mg (bindende) – oppfylt. 90 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 30 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 30 mg.
  - **Stoppet:** Nedtrappingen av duloksetin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Du>Stop`.

## Seponering av fluoksetin, gjentatt prosentvis nedtrapping

`seponering-fluoksetin`, versjon 1, fingeravtrykk `4fd0b76218397ed9b8a9af710478652b0c5a0625f10d51a714459244eee86b63`. Seponering: fluoksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluoksetin trappes ned gradvis over minst én til to uker; virkestoffet finnes i kroppen i flere uker etter seponering.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping.
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 10 mg. Sluttdosen er halvparten av laveste dose i preparatomtalen: daglig 10 mg i stedet for 20 mg annenhver dag, som modellen ikke har. Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Anbefalt dose ved depresjon er 20 mg daglig, maksimalt 60 mg. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er halvparten av laveste dose i preparatomtalen: daglig 10 mg i stedet for 20 mg annenhver dag, som modellen ikke har. Under den seponeres. (bygger på dmp-fluoxetin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-fluoxetin pkt. 4.2) |

**Betingelser:**

- Startdose 20–60 mg (bindende; dmp-fluoxetin pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.
- Kildene er ikke enige om hvor mye fluoksetin må trappes ned: preparatomtalen sier gradvis over minst én til to uker, NICE nevner dosering annenhver dag ved 20 mg, og Keks mfl. (2016) seponerer uten nedtrapping ved 40 mg daglig eller mindre. Regelen følger preparatomtalen; valget må avklares faglig.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg.* Inndata: startdose 40 mg.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 20 mg, vanlig dose.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 60 mg, høyeste dose: 30 og 15 mg; neste halvering er under 10 mg.* Inndata: startdose 60 mg.
  - **fra:** dag 1–14: 30 mg; dag 15–28: 15 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *80 mg er over dosene regelen gjelder for, så beregningen stopper.* Inndata: startdose 80 mg.
  - **Stoppet:** Startdosen 80 mg er utenfor det regelen gjelder for (20–60 mg).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Stop`.

## Seponering av fluvoksamin, gjentatt prosentvis nedtrapping

`seponering-fluvoksamin`, versjon 1, fingeravtrykk `9d3fbe633718030ab2d4ebec78594380ab87392ef6ad8aa2bf301d4e03b76104`. Seponering: fluvoksamin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 50 mg. Sluttdosen er laveste dose i preparatomtalen (startdosen ved depresjon). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Ved depresjon er anbefalt dose 100 mg daglig, med start på 50 eller 100 mg; dosen kan økes til høyst 300 mg daglig. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 50 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (startdosen ved depresjon). Under den seponeres. (bygger på dmp-fevarin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-fevarin pkt. 4.2) |

**Betingelser:**

- Startdose 50–300 mg (bindende; dmp-fevarin pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg, høyeste dose: 150 og 75 mg; neste halvering er under 50 mg.* Inndata: startdose 300 mg.
  - **fra:** dag 1–14: 150 mg; dag 15–28: 75 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 50–300 mg (bindende) – oppfylt. 300 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 100 mg, anbefalt dose.* Inndata: startdose 100 mg.
  - **fra:** dag 1–14: 50 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 50–300 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 50 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 50 mg.
  - **Stoppet:** Nedtrappingen av fluvoksamin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fv>Stop`.

## Seponering av mirtazapin, gjentatt prosentvis nedtrapping

`seponering-mirtazapin`, versjon 1, fingeravtrykk `b9ead642c61ed895852b5a5cd5e1c8405de408bdc020ed33ea7600173f647dfd`. Seponering: mirtazapin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Mirtazapin avsluttes gradvis; preparatomtalen oppgir ingen varighet.
  - Behandlingen bør avsluttes gradvis for å unngå seponeringssymptomer; varighet oppgis ikke. Brå seponering etter lang tids bruk kan gi seponeringssymptomer, som oftest milde. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 15 mg. Sluttdosen er laveste dose i preparatomtalen (startdosen). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- «Gradvis» er lest som minst ett trinn på 14 dager; blir planen kortere, stopper beregningen.
  - Behandlingen bør avsluttes gradvis for å unngå seponeringssymptomer; varighet oppgis ikke. Brå seponering etter lang tids bruk kan gi seponeringssymptomer, som oftest milde. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2 og 4.4)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 15 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (startdosen). Under den seponeres. (bygger på dmp-remeron pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier «gradvis» uten varighet; minst ett trinn på 14 dager. (bygger på dmp-remeron pkt. 4.2 og 4.4; nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 15–45 mg (bindende; dmp-remeron pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.
- Minimumet på 14 dager er OUSFARs tolkning av «gradvis»; preparatomtalen oppgir ingen varighet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 45 mg, høyeste dose: 22,5 mg; neste halvering er under 15 mg.* Inndata: startdose 45 mg.
  - **fra:** dag 1–14: 22,5 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 15–45 mg (bindende) – oppfylt. 45 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 30 mg.* Inndata: startdose 30 mg.
  - **fra:** dag 1–14: 15 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 15–45 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 15 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 15 mg.
  - **Stoppet:** Nedtrappingen av mirtazapin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mz>Stop`.

## Seponering av paroksetin, nedtrapping etter preparatomtalen

`seponering-paroksetin`, versjon 1, fingeravtrykk `61af70bc5dd78a3a1678428a700bf940514a76c552e9c264bd75ef1869ce6736`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Paroksetin seponeres ikke brått. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke.
  - Brå seponering bør unngås. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR bruker regimet fra de kliniske studiene i preparatomtalen som plan: døgndosen senkes med 10 mg hver uke til null. Trinnet og trinnlengden er kildens, men at regimet brukes som plan, er OUSFARs valg.
  - Brå seponering bør unngås. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Planen må ha minst ett trinn på én uke; fra 10 mg ville regimet gi seponering uten nedtrapping, så da stopper beregningen.
  - Brå seponering bør unngås. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Trinnet fra nedtrappingsregimet i de kliniske studiene; at regimet brukes som plan, er OUSFARs valg. (bygger på dmp-seroxat pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 7 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Én uke per trinn, som i studieregimet; innenfor NICEs én til to uker. (bygger på dmp-seroxat pkt. 4.2; nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 7 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Brå seponering bør unngås; minst ett trinn på én uke. (bygger på dmp-seroxat pkt. 4.2) |

**Betingelser:**

- Startdose 10–60 mg (bindende; dmp-seroxat pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.
- Trinnene er like store i mg, ikke en andel av dosen som NICE beskriver; siste trinn (fra 10 mg til null) er derfor relativt størst. Om det passer pasienten, er et åpent faglig spørsmål.
- Én uke per trinn er nedre del av NICEs vurderingstid; preparatomtalen sier at noen trenger langsommere nedtrapping.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 60 mg, høyeste dose: fem ukentlige trinn.* Inndata: startdose 60 mg.
  - **fra:** dag 1–7: 50 mg; dag 8–14: 40 mg; dag 15–21: 30 mg; dag 22–28: 20 mg; dag 29–35: 10 mg; fra dag 36: seponert
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 7 dager (bindende) – oppfylt. Nedtrapping dag 1–35 (35 dager).
- *Fra 20 mg, vanlig dose: rask nedtrapping på én uke.* Inndata: startdose 20 mg.
  - **fra:** dag 1–7: 10 mg; fra dag 8: seponert
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 7 dager (bindende) – oppfylt. Nedtrapping dag 1–7 (7 dager).
- *Fra 25 mg, uvanlig dose: 15 og 5 mg, som ikke er hele eller halve 20 mg-tabletter.* Inndata: startdose 25 mg.
  - **fra:** dag 1–7: 15 mg; dag 8–14: 5 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 25 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 7 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 10 mg: regimet går rett til null, så nedtrappingen blir 0 dager og beregningen stopper.* Inndata: startdose 10 mg.
  - **Stoppet:** Nedtrappingen av paroksetin blir 0 dager, kortere enn 7 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.

## Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 1, fingeravtrykk `fd1938cc78eaecf4a615ac4f934fa68ebbd0c7bca7b151c9c192aa60a742a547`. Seponering: sertralin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 25 mg. Sluttdosen er laveste dose i preparatomtalen (startdosen ved enkelte angstlidelser). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Startdose 50 mg daglig (25 mg ved enkelte angstlidelser); økning i trinn på 50 mg til maksimalt 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (startdosen ved enkelte angstlidelser). Under den seponeres. (bygger på dmp-zoloft pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-zoloft pkt. 4.2 og 4.4) |

**Betingelser:**

- Startdose 25–200 mg (bindende; dmp-zoloft pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 200 mg, høyeste dose: langvarig nedtrapping med tre halveringer.* Inndata: startdose 200 mg.
  - **fra:** dag 1–14: 100 mg; dag 15–28: 50 mg; dag 29–42: 25 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 200 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 100 mg.* Inndata: startdose 100 mg.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 25 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 150 mg: 75 og 37,5 mg, som ikke er hele tabletter.* Inndata: startdose 150 mg.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 25 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 25 mg.
  - **Stoppet:** Nedtrappingen av sertralin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Stop`.

## Seponering av venlafaksin, gjentatt prosentvis nedtrapping

`seponering-venlafaksin`, versjon 1, fingeravtrykk `57bec5f5983180a0789d3403de837e39ba9396abdb64417536fb981643ae16ee`. Seponering: venlafaksin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Venlafaksin trappes ned gradvis over minst én til to uker; noen trenger nedtrapping over flere måneder.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Tiden som trengs avhenger av dose, behandlingstid og pasient; noen trenger nedtrapping over flere måneder. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Depotkapslene kan ikke deles.
  - Depotkapslene skal svelges hele og ikke deles, knuses, tygges eller løses opp. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under 37,5 mg. Sluttdosen er laveste dose i preparatomtalen (første uke ved panikklidelse). Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
  - Startdosen er 75 mg daglig (37,5 mg i 7 dager ved panikklidelse); høyeste dose er 375 mg daglig ved depresjon og 225 mg ved angstlidelser. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*
- «Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Tiden som trengs avhenger av dose, behandlingstid og pasient; noen trenger nedtrapping over flere måneder. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 37,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Sluttdosen er laveste dose i preparatomtalen (første uke ved panikklidelse). Under den seponeres. (bygger på dmp-efexor-depot pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-efexor-depot pkt. 4.2) |

**Betingelser:**

- Startdose 37,5–375 mg (bindende; dmp-efexor-depot pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.
- Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.
- Preparatomtalen sier at noen trenger nedtrapping over flere måneder; planen er den korteste som oppfyller minimumet, og kan være for rask for noen.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 375 mg, høyeste dose: langvarig nedtrapping med tre trinn.* Inndata: startdose 375 mg.
  - **fra:** dag 1–14: 187,5 mg; dag 15–28: 93,75 mg; dag 29–42: 46,88 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 37,5–375 mg (bindende) – oppfylt. 375 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 150 mg.* Inndata: startdose 150 mg.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 37,5–375 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 225 mg: 112,5 og 56,25 mg; den siste er ikke en sum av hele kapsler.* Inndata: startdose 225 mg.
  - **fra:** dag 1–14: 112,5 mg; dag 15–28: 56,25 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 37,5–375 mg (bindende) – oppfylt. 225 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 37,5 mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.* Inndata: startdose 37,5 mg.
  - **Stoppet:** Nedtrappingen av venlafaksin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ve>Stop`.

## Seponering av vortioksetin, fagtekst uten beregning

`seponering-vortioksetin`, versjon 1, fingeravtrykk `fc36e04bd868e3ccd5dfc3a7f6586570464f3471a5d7d4857e2c7bc682ea2b27`. Seponering: vortioksetin → –. **Bare tekstlig veiledning**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Vortioksetin kan trappes gradvis ned, men preparatomtalen gir ingen nedtrappingsplan.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men det finnes ikke nok data til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- Dosen er 5–20 mg daglig; 10 mg er start- og anbefalt dose hos voksne under 65 år.
  - Start- og anbefalt dose er 10 mg daglig hos voksne under 65 år; dosen kan økes til høyst 20 mg eller senkes til minst 5 mg. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- NICE beskriver trinnvis nedtrapping av antidepressiva generelt, med tempo etter pasientens seponeringssymptomer.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR beregner ingen plan for vortioksetin, fordi preparatomtalen sier at datagrunnlaget ikke er stort nok til en anbefalt nedtrappingsplan. Nedtrappingen vurderes individuelt.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men det finnes ikke nok data til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

Ingen; regelen har ingen beregning.

**Betingelser:**

- Ingen.

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Om en generell prosentvis nedtrapping etter NICE likevel skal kunne beregnes for vortioksetin, er et åpent faglig spørsmål.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

Ingen; regelen har ingen beregning.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Vo>Stop`.
