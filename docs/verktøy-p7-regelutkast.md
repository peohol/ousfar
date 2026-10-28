# OUSFAR Verktøy – P7: regelutkast for nedtrapping av antidepressiva

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping` versjon 1, regelmodell 3, beregningsmotor 1. Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen og NICE. Til faglig kontroll; ingen regel er klinisk godkjent.

**15 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md` og `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | seponering | amitriptylin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-bupropion` | seponering | bupropion → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 2 |
| `seponering-citalopram` | seponering | citalopram → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-duloksetin` | seponering | duloksetin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-fluoksetin` | seponering | fluoksetin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-fluvoksamin` | seponering | fluvoksamin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 2 |
| `seponering-klomipramin` | seponering | klomipramin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 2 |
| `seponering-mirtazapin` | seponering | mirtazapin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 2 |
| `seponering-moklobemid` | seponering | moklobemid → – | beregnbar etter faglig avklaring | 5 | til faglig kontroll | 2 |
| `seponering-nortriptylin` | seponering | nortriptylin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 1 |
| `seponering-paroksetin` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 1 | til faglig kontroll | 2 |
| `seponering-sertralin` | seponering | sertralin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `seponering-venlafaksin` | seponering | venlafaksin → – | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `seponering-vortioksetin` | seponering | vortioksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 2 |
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
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av amitriptylin, gjentatt prosentvis nedtrapping

`seponering-amitriptylin`, versjon 1, fingeravtrykk `234fca8384fe83d06c82e804223ee60cec5ea5b3996a26f9173d828d4b66becd`. Seponering: amitriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.
  - Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2 og 4.8)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 10 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (10 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; OUSFAR foreslår minst 14 dager, som for preparatene der den sier minst én til to uker. (bygger på dmp-sarotex pkt. 4.2 og 4.8) |

**Betingelser:**

- Startdose 10–150 mg (bindende; dmp-sarotex pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- «Over flere uker» er ikke et tall; 14 dager som minimum er OUSFARs forslag og kan være for kort.
- Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 og 37,5 mg) kan derfor ikke gis nøyaktig.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: halvering til neste dose er under 10 mg (langvarig).* Inndata: startdose 100 mg.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 25 mg; dag 29–42: 12,5 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 10–150 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av amitriptylin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 20 mg: ett trinn på 10 mg.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 10–150 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av amitriptylin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 10 mg blir nedtrappingen kortere enn 14 dager.* Inndata: startdose 10 mg.
  - **Stoppet:** Nedtrappingen av amitriptylin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:At>Stop`.

## Seponering av bupropion, gjentatt prosentvis nedtrapping

`seponering-bupropion`, versjon 1, fingeravtrykk `9af028d58675224edaa18a8175304a294d34489462f2be07d3d6d4d4d2aee99b`. Seponering: bupropion → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.
  - Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 150 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Med 150 og 300 mg som ikke kan deles, er eneste mulige nedtrapping 300 → 150 mg; fra 150 mg seponeres bupropion uten nedtrapping.
  - Start 150 mg daglig; kan økes til 300 mg. Tablettene skal ikke deles, knuses eller tygges. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 150 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (150 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 150–300 mg (bindende; dmp-wellbutrin pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg: 150 mg i 14 dager, så seponering.* Inndata: startdose 300 mg.
  - **fra:** dag 1–14: 150 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 150–300 mg (bindende) – oppfylt. 300 mg.
- *Fra 150 mg seponeres bupropion fra dag 1.* Inndata: startdose 150 mg.
  - **fra:** fra dag 1: seponert
  - Kontroll: Startdosen er 150–300 mg (bindende) – oppfylt. 150 mg.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Bu>Stop`.

## Seponering av citalopram, gjentatt prosentvis nedtrapping

`seponering-citalopram`, versjon 1, fingeravtrykk `d2c3b56c616914b575162a059bbcee1acbc83bec7cdff2b2465fc4036f19efb0`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

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

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 10 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (10 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
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

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Laveste dose preparatomtalen oppgir (10 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose; doser under 10 mg krever deling av 10 mg, som FEST ikke oppgir, eller flytende form.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: halvering til 10 mg, så seponering.* Inndata: startdose 40 mg.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 20 mg: ett trinn på 10 mg.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 10 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 14 dager, så beregningen stopper.* Inndata: startdose 10 mg.
  - **Stoppet:** Nedtrappingen av citalopram blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Seponering av duloksetin, gjentatt prosentvis nedtrapping

`seponering-duloksetin`, versjon 1, fingeravtrykk `ffc858dff199b4654e161cd2925f454d95308f8866c269bdd14b7dee0da4723c`. Seponering: duloksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([ema-cymbalta](https://www.ema.europa.eu/en/documents/product-information/cymbalta-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 30 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 30 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (30 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på ema-cymbalta section 4.2) |

**Betingelser:**

- Startdose 30–120 mg (bindende; ema-cymbalta section 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Fra 30 mg kan ingen nedtrapping gis med registrerte kapsler; da stopper beregningen.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 120 mg: 60 mg og 30 mg, så seponering.* Inndata: startdose 120 mg.
  - **fra:** dag 1–14: 60 mg; dag 15–28: 30 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 30–120 mg (bindende) – oppfylt. 120 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 60 mg: ett trinn på 30 mg.* Inndata: startdose 60 mg.
  - **fra:** dag 1–14: 30 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 30–120 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 30 mg blir nedtrappingen kortere enn 14 dager (manglende lavere styrke).* Inndata: startdose 30 mg.
  - **Stoppet:** Nedtrappingen av duloksetin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Du>Stop`.

## Seponering av fluoksetin, gjentatt prosentvis nedtrapping

`seponering-fluoksetin`, versjon 1, fingeravtrykk `788cc82e7a0c1ffe1587bc03d3af24bceb062490cfed4e5983234ec6012d232c`. Seponering: fluoksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
- Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 10 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Halvparten av laveste registrerte styrke (20 mg), som FEST oppgir som delbar i 2 for minst ett preparat (uttrekk 08.10.2026); under den seponeres. |
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

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halv tablett (10 mg) i stedet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 20 mg og 10 mg (halv tablett), så seponering.* Inndata: startdose 40 mg.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 20 mg: ett trinn på 10 mg.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–14 (14 dager).
- *Fra 60 mg: 15 mg er et ideelt trinn som må kunne gis med preparatene (P5).* Inndata: startdose 60 mg.
  - **fra:** dag 1–14: 30 mg; dag 15–28: 15 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Stop`.

## Seponering av fluvoksamin, gjentatt prosentvis nedtrapping

`seponering-fluvoksamin`, versjon 1, fingeravtrykk `730fbf8be003d14e24b85a1f3e790e5efed34cbae80967bc27812082b9b640df`. Seponering: fluvoksamin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 50 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 25 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 50 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-fevarin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Halvparten av laveste registrerte styrke (50 mg), som FEST oppgir som delbar i 2 for minst ett preparat (uttrekk 08.10.2026); under den seponeres. |
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

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 25 mg.* Inndata: startdose 100 mg.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 37,5 mg; dag 29–42: 28,13 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 50–300 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 300 mg (høyeste dose): langvarig nedtrapping.* Inndata: startdose 300 mg.
  - **fra:** dag 1–14: 150 mg; dag 15–28: 75 mg; dag 29–42: 37,5 mg; dag 43–56: 28,13 mg; fra dag 57: seponert
  - Kontroll: Startdosen er 50–300 mg (bindende) – oppfylt. 300 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fv>Stop`.

## Seponering av klomipramin, gjentatt prosentvis nedtrapping

`seponering-klomipramin`, versjon 1, fingeravtrykk `525127bbb17c118d858cf8f92f9f5b60978169b26daab1a88bc8b2e8680b45ab`. Seponering: klomipramin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.
  - Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05467.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 10 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-anafranil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Halvparten av laveste registrerte styrke (10 mg), som FEST oppgir som delbar i 2 for minst ett preparat (uttrekk 08.10.2026); under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; OUSFAR foreslår minst 14 dager, som for preparatene der den sier minst én til to uker. (bygger på dmp-anafranil pkt. 4.2 og 4.4) |

**Betingelser:**

- Startdose 10–250 mg (bindende; dmp-anafranil pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Fra høye doser blir planen lang (12 uker fra 150 mg); flere trinn er ikke automatisk bedre (P4.6).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 150 mg: halvering ned til 10 mg, så 25 % til neste dose er under 5 mg (langvarig).* Inndata: startdose 150 mg.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; dag 29–42: 18,75 mg; dag 43–56: 9,38 mg; dag 57–70: 7,03 mg; dag 71–84: 5,27 mg; fra dag 85: seponert
  - Kontroll: Startdosen er 10–250 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av klomipramin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra 50 mg: 25 og 12,5 mg kan gis med halve tabletter; 6,25 mg er et ideelt trinn P5 må kunne gi.* Inndata: startdose 50 mg.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 12,5 mg; dag 29–42: 6,25 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 10–250 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av klomipramin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Cl>Stop`.

## Seponering av mirtazapin, gjentatt prosentvis nedtrapping

`seponering-mirtazapin`, versjon 1, fingeravtrykk `14cab5d101cc52a5b77902669b50afcfa60581676714bf8e08a754b2caa58957`. Seponering: mirtazapin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Behandlingen med mirtazapin avsluttes gradvis.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 15 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 7,5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 15 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-remeron pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 7,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Halvparten av laveste registrerte styrke (15 mg), som FEST oppgir som delbar i 2 for minst ett preparat (uttrekk 08.10.2026); under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; OUSFAR foreslår minst 14 dager, som for preparatene der den sier minst én til to uker. (bygger på dmp-remeron pkt. 4.2) |

**Betingelser:**

- Startdose 15–45 mg (bindende; dmp-remeron pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Smeltetablettene deles ikke; halve doser krever tabletter som FEST oppgir som delbare.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 30 mg: 15 mg, så 25 % per trinn til neste dose er under 7,5 mg.* Inndata: startdose 30 mg.
  - **fra:** dag 1–14: 15 mg; dag 15–28: 11,25 mg; dag 29–42: 8,44 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 15–45 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 15 mg, på grensen: 25 % fra første trinn.* Inndata: startdose 15 mg.
  - **fra:** dag 1–14: 11,25 mg; dag 15–28: 8,44 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 15–45 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mz>Stop`.

## Seponering av moklobemid, gjentatt prosentvis nedtrapping

`seponering-moklobemid`, versjon 1, fingeravtrykk `de0ccbba6cbdbed4d545ec5920f90f78033458f851e465e635db8603d3092ca2`. Seponering: moklobemid → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.
  - Preparatomtalen gir ingen anvisning om nedtrapping; et annet antidepressiv kan startes dagen etter at moklobemid er avsluttet. *([dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 300 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 150 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Regelen bygger på NICEs generelle råd om gradvis nedtrapping av antidepressiva; preparatomtalen krever ingen minste varighet, så regelen har ingen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 300 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-aurorix pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 150 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (150 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 300–600 mg (bindende; dmp-aurorix pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Doser under 300 mg ved nedsatt leverfunksjon omfattes ikke av regelen.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Det er ikke avklart om moklobemid, som er en reversibel MAO-hemmer med kort virketid, trenger nedtrapping.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 600 mg: 300 mg, så 25 % per trinn til neste dose er under 150 mg.* Inndata: startdose 600 mg.
  - **fra:** dag 1–14: 300 mg; dag 15–28: 225 mg; dag 29–42: 168,75 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 300–600 mg (bindende) – oppfylt. 600 mg.
- *Fra 300 mg: 25 % per trinn fra første trinn.* Inndata: startdose 300 mg.
  - **fra:** dag 1–14: 225 mg; dag 15–28: 168,75 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 300–600 mg (bindende) – oppfylt. 300 mg.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mo>Stop`.

## Seponering av nortriptylin, gjentatt prosentvis nedtrapping

`seponering-nortriptylin`, versjon 1, fingeravtrykk `601d7ab5bee37e657a9fc8eedee56b28a1aa472e20dd6781a0ba946914b79f0b`. Seponering: nortriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.
  - Brå seponering etter lang tids bruk kan gi abstinenssymptomer. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 25 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 10 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
  - Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-noritren pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (10 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; OUSFAR foreslår minst 14 dager, som for preparatene der den sier minst én til to uker. (bygger på dmp-noritren pkt. 4.4) |

**Betingelser:**

- Startdose 25–200 mg (bindende; dmp-noritren pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 10 mg.* Inndata: startdose 50 mg.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 18,75 mg; dag 29–42: 14,06 mg; dag 43–56: 10,55 mg; fra dag 57: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av nortriptylin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:No>Stop`.

## Seponering av paroksetin, nedtrapping i faste trinn

`seponering-paroksetin`, versjon 1, fingeravtrykk `81af69ca8726e8b7944377dc0d5104c26577cc3ca4b83dcf2e82b6ac3c9f9470`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- I de kliniske studiene ble døgndosen av paroksetin redusert med 10 mg hver uke.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Døgndosen reduseres med 10 mg hver 7. dag til null.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Regelen følger nedtrappingen fra studiene i preparatomtalen (10 mg per uke) i stedet for det felles prinsippet. Den er en rask kildevariant: fra 20 mg er planen én uke.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.mg | 10 mg | veiledende | dmp-seroxat pkt. 4.2 |
| fra: fase 1 (nedtrapping) | trinnlengde | 7 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** Ukentlige trinn som i studiene i preparatomtalen; at studienedtrappingen brukes som regel, er OUSFARs valg. (bygger på dmp-seroxat pkt. 4.2) |

**Betingelser:**

- Startdose 10–60 mg (bindende; dmp-seroxat pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder) og enn NICE; om regelen skal ha lengre trinn eller mindre trinn ved lav dose, må avgjøres faglig.
- Fra 10 mg seponeres paroksetin fra dag 1, fordi 10 mg er ett trinn.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 10 mg mindre hver uke.* Inndata: startdose 40 mg.
  - **fra:** dag 1–7: 30 mg; dag 8–14: 20 mg; dag 15–21: 10 mg; fra dag 22: seponert
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 40 mg.
- *Fra 20 mg: én uke på 10 mg (rask).* Inndata: startdose 20 mg.
  - **fra:** dag 1–7: 10 mg; fra dag 8: seponert
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 20 mg.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.

## Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 1, fingeravtrykk `1c822cf650bd836ada681c64d35f4c04fd78d49c700e97688addea604db2a63d`. Seponering: sertralin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

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

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 25 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (25 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
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

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Laveste dose preparatomtalen oppgir (25 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 200 mg: halvering til 25 mg, så seponering (langvarig).* Inndata: startdose 200 mg.
  - **fra:** dag 1–14: 100 mg; dag 15–28: 50 mg; dag 29–42: 25 mg; fra dag 43: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 200 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 150 mg: 37,5 mg er et ideelt trinn som må kunne gis med preparatene (P5).* Inndata: startdose 150 mg.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 25–200 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 25 mg blir nedtrappingen kortere enn 14 dager, så beregningen stopper.* Inndata: startdose 25 mg.
  - **Stoppet:** Nedtrappingen av sertralin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.
- *250 mg er over dosene regelen gjelder for.* Inndata: startdose 250 mg.
  - **Stoppet:** Startdosen 250 mg er utenfor det regelen gjelder for (25–200 mg).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Stop`.

## Seponering av venlafaksin, gjentatt prosentvis nedtrapping

`seponering-venlafaksin`, versjon 1, fingeravtrykk `dcbcf554f8b5b3672cc6025664667bdad5485796b9a2128b71646df388da6b95`. Seponering: venlafaksin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker, for noen over måneder. Kapslene skal svelges hele. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 37,5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 37,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (37,5 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-efexor-depot pkt. 4.2) |

**Betingelser:**

- Startdose 37,5–375 mg (bindende; dmp-efexor-depot pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Laveste dose preparatomtalen oppgir (37,5 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose. Venlafaksin har kort halveringstid og er kjent for seponeringssymptomer; om trinnet fra 37,5 mg til null er forsvarlig, må vurderes faglig.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 150 mg: 75 mg og 37,5 mg, så seponering.* Inndata: startdose 150 mg.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 37,5–375 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 225 mg: 56,25 mg er et ideelt trinn som ikke kan gis med kapsler på 37,5, 75 og 150 mg (P5 stopper).* Inndata: startdose 225 mg.
  - **fra:** dag 1–14: 112,5 mg; dag 15–28: 56,25 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 37,5–375 mg (bindende) – oppfylt. 225 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 37,5 mg blir nedtrappingen kortere enn 14 dager.* Inndata: startdose 37,5 mg.
  - **Stoppet:** Nedtrappingen av venlafaksin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ve>Stop`.

## Seponering av vortioksetin, gjentatt prosentvis nedtrapping

`seponering-vortioksetin`, versjon 1, fingeravtrykk `787d2808bbf7d7e5737ac3ee7e8e548e1ad783c9f863b70ffd63719ca6118482`. Seponering: vortioksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 5 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Preparatomtalen krever ingen minste varighet, så regelen har ingen; fra 5 mg seponeres vortioksetin uten nedtrapping.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste registrerte styrke (5 mg) i FEST (uttrekk 08.10.2026), som ikke er oppgitt som delbar; under den seponeres. |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 5–20 mg (bindende; ema-brintellix section 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.

**Usikkerhet:**

- Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.
- Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.
- Nedtrappingen bygger på NICEs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: 10 mg og 5 mg, så seponering.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; fra dag 29: seponert
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 20 mg.
- *Fra laveste dose seponeres vortioksetin fra dag 1.* Inndata: startdose 5 mg.
  - **fra:** fra dag 1: seponert
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 5 mg.

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
