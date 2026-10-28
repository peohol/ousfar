# OUSFAR Verktøy – P7: regelutkast for nedtrapping av antidepressiva

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping` versjon 2, regelmodell 3, beregningsmotor 1. Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen og NICE. Hver plan er et startforslag. Til faglig kontroll; ingen regel er klinisk godkjent.

**15 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md` og `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | seponering | amitriptylin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 5 |
| `seponering-bupropion` | seponering | bupropion → – | beregnbar etter faglig avklaring | 7 | til faglig kontroll | 4 |
| `seponering-citalopram` | seponering | citalopram → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 7 |
| `seponering-duloksetin` | seponering | duloksetin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 4 |
| `seponering-fluoksetin` | seponering | fluoksetin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 6 |
| `seponering-fluvoksamin` | seponering | fluvoksamin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 4 |
| `seponering-klomipramin` | seponering | klomipramin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 4 |
| `seponering-mirtazapin` | seponering | mirtazapin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 5 |
| `seponering-moklobemid` | seponering | moklobemid → – | beregnbar etter faglig avklaring | 7 | til faglig kontroll | 4 |
| `seponering-nortriptylin` | seponering | nortriptylin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 5 |
| `seponering-paroksetin` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 5 |
| `seponering-sertralin` | seponering | sertralin → – | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 7 |
| `seponering-venlafaksin` | seponering | venlafaksin → – | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 4 |
| `seponering-vortioksetin` | seponering | vortioksetin → – | beregnbar etter faglig avklaring | 7 | til faglig kontroll | 4 |
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

`seponering-amitriptylin`, versjon 2, fingeravtrykk `e8dcd5ba4e825239cd49d367c3ffe0aa55c4389fb10541a3b918863b27954172`. Seponering: amitriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.
  - Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2 og 4.8)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 10 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-sarotex pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-sarotex pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Over flere uker» er lest som minst fire uker. 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig. (bygger på dmp-sarotex pkt. 4.2 og 4.8; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose 2,5–150 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 2,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (150 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-sarotex pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.
- Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 mg og alt under 10 mg) kan derfor ikke gis nøyaktig, og P5 stopper.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: halvering ned til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg (langvarig).* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 25 mg; dag 29–42: 12,5 mg; dag 43–56: 6,25 mg; dag 57–70: 4,69 mg; dag 71–84: 3,52 mg; dag 85–98: 2,64 mg; fra dag 99: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–150 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av amitriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–98 (98 dager).
- *Fra 10 mg: 25 % fra første trinn.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 7,5 mg; dag 15–28: 5,63 mg; dag 29–42: 4,22 mg; dag 43–56: 3,16 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–150 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Nedtrappingen av amitriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Fra 4 mg blir nedtrappingen 14 dager, kortere enn 28 dager.* Inndata: startdose 4 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av amitriptylin blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:At>Stop`.

## Seponering av bupropion, gjentatt prosentvis nedtrapping

`seponering-bupropion`, versjon 2, fingeravtrykk `016f9fdfb218840adf1aa5bc87db9c89a8b20ce72585bfee0f5d160605f5dffb`. Seponering: bupropion → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.
  - Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 150 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 37,5 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Preparatomtalen krever ingen minste varighet, så regelen har ingen.
  - Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes. *([dmp-wellbutrin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/06-3990.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 150 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-wellbutrin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 37,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (150 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-wellbutrin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 37,5–300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 37,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-wellbutrin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.
- Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.
- Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 300 mg: 150 mg, så 25 % per trinn til neste dose er under 37,5 mg.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 150 mg; dag 15–28: 112,5 mg; dag 29–42: 84,38 mg; dag 43–56: 63,28 mg; dag 57–70: 47,46 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 37,5–300 mg (bindende) – oppfylt. 300 mg.
- *Fra 150 mg: 25 % per trinn.* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 112,5 mg; dag 15–28: 84,38 mg; dag 29–42: 63,28 mg; dag 43–56: 47,46 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 37,5–300 mg (bindende) – oppfylt. 150 mg.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 300 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Bu>Stop`.

## Seponering av citalopram, gjentatt prosentvis nedtrapping

`seponering-citalopram`, versjon 2, fingeravtrykk `7dfb6bda76a65aac6386d755fd3a85e0fc868ebca93f957411b8698dd363da11`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 10 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-cipramil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-cipramil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-cipramil pkt. 4.2) |

**Betingelser:**

- Startdose 2,5–40 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 2,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (40 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-cipramil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: halvering til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg (langvarig).* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; dag 29–42: 7,5 mg; dag 43–56: 5,63 mg; dag 57–70: 4,22 mg; dag 71–84: 3,16 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–40 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra 20 mg: ett halveringstrinn, så 25 % per trinn.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 7,5 mg; dag 29–42: 5,63 mg; dag 43–56: 4,22 mg; dag 57–70: 3,16 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Fra 10 mg, på grensen: 25 % fra første trinn.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 7,5 mg; dag 15–28: 5,63 mg; dag 29–42: 4,22 mg; dag 43–56: 3,16 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–40 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Nedtrappingen av citalopram varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Fra sluttdosen (2,5 mg) blir nedtrappingen kortere enn 14 dager, så beregningen stopper.* Inndata: startdose 2,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av citalopram blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.
- *2 mg er under sluttdosen, der regelen ikke gir noen nedtrapping.* Inndata: startdose 2 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Startdosen 2 mg er utenfor det regelen gjelder for (2,5–40 mg).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Seponering av duloksetin, gjentatt prosentvis nedtrapping

`seponering-duloksetin`, versjon 2, fingeravtrykk `5a5e8c3a7bf3973defb8e40c8d66a905b09b6e934cfac34b48047e6c32862dec`. Seponering: duloksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([ema-cymbalta](https://www.ema.europa.eu/en/documents/product-information/cymbalta-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 30 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 7,5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 30 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på ema-cymbalta section 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 7,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (30 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på ema-cymbalta section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på ema-cymbalta section 4.2) |

**Betingelser:**

- Startdose 7,5–120 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 7,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (120 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på ema-cymbalta section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.
- Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 30 mg kan ikke gis med registrerte kapsler; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 120 mg: 60 og 30 mg, så 25 % per trinn til neste dose er under 7,5 mg.* Inndata: startdose 120 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 60 mg; dag 15–28: 30 mg; dag 29–42: 22,5 mg; dag 43–56: 16,88 mg; dag 57–70: 12,66 mg; dag 71–84: 9,49 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 7,5–120 mg (bindende) – oppfylt. 120 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Fra 30 mg fortsetter nedtrappingen under laveste styrke.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 22,5 mg; dag 15–28: 16,88 mg; dag 29–42: 12,66 mg; dag 43–56: 9,49 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 7,5–120 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av duloksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 120 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 120 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Du>Stop`.

## Seponering av fluoksetin, gjentatt prosentvis nedtrapping

`seponering-fluoksetin`, versjon 2, fingeravtrykk `6c1e935569ed87955ac3bb3a4dc44df4e5727c0db2a3acc805c52e8f21971a30`. Seponering: fluoksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

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

- OUSFAR trapper ned med 50 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
  - Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (20 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-fluoxetin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-fluoxetin pkt. 4.2) |

**Betingelser:**

- Startdose 5–60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-fluoxetin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halve doser i stedet, og 5 mg krever flytende form eller deling i fire.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 60 mg: halvering til neste dose er under 5 mg.* Inndata: startdose 60 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 30 mg; dag 15–28: 15 mg; dag 29–42: 7,5 mg; fra dag 43: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–60 mg (bindende) – oppfylt. 60 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 40 mg: 20, 10 og 5 mg, så seponering.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; dag 29–42: 5 mg; fra dag 43: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 20 mg: 10 og 5 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; fra dag 29: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *Fra 7 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 14 dager.* Inndata: startdose 7 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av fluoksetin blir 0 dager, kortere enn 14 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 60 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 60 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Stop`.

## Seponering av fluvoksamin, gjentatt prosentvis nedtrapping

`seponering-fluvoksamin`, versjon 2, fingeravtrykk `6151576486e44c96271e9507c93a58da052a07828046bf3ea0a89cbc189ed583`. Seponering: fluvoksamin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-fevarin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07544.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 50 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 12,5 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 50 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-fevarin pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 12,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (50 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-fevarin pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-fevarin pkt. 4.2) |

**Betingelser:**

- Startdose 12,5–300 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 12,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (300 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-fevarin pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 12,5 mg.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 50 mg; dag 15–28: 37,5 mg; dag 29–42: 28,13 mg; dag 43–56: 21,09 mg; dag 57–70: 15,82 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 12,5–300 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Fra 300 mg (høyeste dose): langvarig nedtrapping.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 150 mg; dag 15–28: 75 mg; dag 29–42: 37,5 mg; dag 43–56: 28,13 mg; dag 57–70: 21,09 mg; dag 71–84: 15,82 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 12,5–300 mg (bindende) – oppfylt. 300 mg.
  - Kontroll: Nedtrappingen av fluvoksamin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 100 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 100 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fv>Stop`.

## Seponering av klomipramin, gjentatt prosentvis nedtrapping

`seponering-klomipramin`, versjon 2, fingeravtrykk `bac412e7156716231a17f4734ae7c54654351be8e3d767f9f23db737875042a7`. Seponering: klomipramin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.
  - Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye. *([dmp-anafranil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05467.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 10 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-anafranil pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-anafranil pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; NICE sier at nedtrapping kan ta uker til måneder. 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig. (bygger på dmp-anafranil pkt. 4.2 og 4.4; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose 2,5–250 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 2,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (250 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-anafranil pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Fra høye doser blir planen lang (16 uker fra 150 mg); flere trinn er ikke automatisk bedre (P4.6).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 150 mg: halvering ned til 10 mg, så 25 % til neste dose er under 2,5 mg (langvarig).* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 75 mg; dag 15–28: 37,5 mg; dag 29–42: 18,75 mg; dag 43–56: 9,38 mg; dag 57–70: 7,03 mg; dag 71–84: 5,27 mg; dag 85–98: 3,96 mg; dag 99–112: 2,97 mg; fra dag 113: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–250 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av klomipramin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–112 (112 dager).
- *Fra 50 mg: 25 og 12,5 mg kan gis med halve tabletter; de lavere trinnene må P5 kunne gi.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 12,5 mg; dag 29–42: 6,25 mg; dag 43–56: 4,69 mg; dag 57–70: 3,52 mg; dag 71–84: 2,64 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–250 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av klomipramin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–84 (84 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 150 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Cl>Stop`.

## Seponering av mirtazapin, gjentatt prosentvis nedtrapping

`seponering-mirtazapin`, versjon 2, fingeravtrykk `326b59c4f3895b33ba20f82c8afc667f095f8f95b21cfc327250c5ebce56f75c`. Seponering: mirtazapin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Behandlingen med mirtazapin avsluttes gradvis.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 15 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 3,75 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 15 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-remeron pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 3,75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (15 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-remeron pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier gradvis nedtrapping uten varighet; NICE sier at nedtrapping kan ta uker til måneder. 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig. (bygger på dmp-remeron pkt. 4.2; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose 3,75–45 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 3,75 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (45 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-remeron pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Smeltetablettene deles ikke; halve doser krever tabletter som FEST oppgir som delbare, og mindre doser flytende form.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 30 mg: 15 mg, så 25 % per trinn til neste dose er under 3,75 mg.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 15 mg; dag 15–28: 11,25 mg; dag 29–42: 8,44 mg; dag 43–56: 6,33 mg; dag 57–70: 4,75 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 3,75–45 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Fra 15 mg, på grensen: 25 % fra første trinn.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 11,25 mg; dag 15–28: 8,44 mg; dag 29–42: 6,33 mg; dag 43–56: 4,75 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 3,75–45 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Nedtrappingen av mirtazapin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Fra 5 mg blir nedtrappingen 14 dager, kortere enn 28 dager.* Inndata: startdose 5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av mirtazapin blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 30 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 30 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mz>Stop`.

## Seponering av moklobemid, gjentatt prosentvis nedtrapping

`seponering-moklobemid`, versjon 2, fingeravtrykk `75dadd6afab4c82b5bc2b449c2e4d8303635e26f946afca4f69ee9f48c81db4d`. Seponering: moklobemid → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.
  - Preparatomtalen gir ingen anvisning om nedtrapping; et annet antidepressiv kan startes dagen etter at moklobemid er avsluttet. *([dmp-aurorix](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07547.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 300 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 75 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Regelen bygger på NICEs generelle råd om gradvis nedtrapping av antidepressiva; preparatomtalen krever ingen minste varighet, så regelen har ingen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 300 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-aurorix pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 75 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (300 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-aurorix pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 75–600 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 75 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (600 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-aurorix pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))
- Unntak (`nedsatt_leverfunksjon`): Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. (dmp-aurorix pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Det er ikke avklart om moklobemid, som er en reversibel MAO-hemmer med kort virketid, trenger nedtrapping.
- Trinn som 225 mg krever deling av 150 mg, som FEST ikke oppgir; uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 600 mg: 300 mg, så 25 % per trinn til neste dose er under 75 mg.* Inndata: startdose 600 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 300 mg; dag 15–28: 225 mg; dag 29–42: 168,75 mg; dag 43–56: 126,56 mg; dag 57–70: 94,92 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 75–600 mg (bindende) – oppfylt. 600 mg.
- *Fra 300 mg: 25 % per trinn fra første trinn.* Inndata: startdose 300 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 225 mg; dag 15–28: 168,75 mg; dag 29–42: 126,56 mg; dag 43–56: 94,92 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 75–600 mg (bindende) – oppfylt. 300 mg.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 600 mg; pasientforhold: tidligere_seponeringssymptomer nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 600 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja, nedsatt_leverfunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Mo>Stop`.

## Seponering av nortriptylin, gjentatt prosentvis nedtrapping

`seponering-nortriptylin`, versjon 2, fingeravtrykk `71001bc92c2df1fb79e87803df2fed33aee5ab7646a4599f01cdf38b520c6e59`. Seponering: nortriptylin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.
  - Brå seponering etter lang tids bruk kan gi abstinenssymptomer. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 25 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 6,25 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
  - Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-noritren pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-noritren pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen sier ikke hvordan nortriptylin trappes ned ved seponering, bare at brå seponering kan gi abstinenssymptomer; NICE sier at nedtrapping kan ta uker til måneder. 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig. (bygger på dmp-noritren pkt. 4.4; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose 6,25–200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 6,25 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-noritren pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 18,75 mg; dag 29–42: 14,06 mg; dag 43–56: 10,55 mg; dag 57–70: 7,91 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 6,25–200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av nortriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 15 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 11,25 mg; dag 15–28: 8,44 mg; dag 29–42: 6,33 mg; fra dag 43: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 6,25–200 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Nedtrappingen av nortriptylin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–42 (42 dager).
- *Fra 10 mg blir nedtrappingen 14 dager, kortere enn 28 dager.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Nedtrappingen av nortriptylin blir 14 dager, kortere enn 28 dager. Beregningen forlenger den ikke av seg selv.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 50 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:No>Stop`.

## Seponering av paroksetin, langsom prosentvis nedtrapping

`seponering-paroksetin`, versjon 2, fingeravtrykk `e6b0b27a46d128e5860e24bd3d0b8d0ed4938039c9e28de3031be9d8f619a7f6`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*
- Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.
  - Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 2,5 mg. Nedtrappingen skal vare minst 28 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) brukes ikke som regel; den ligger som rask studievariant i sammenligningssettet og er ikke en klinisk anbefaling ved langvarig behandling.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Langsom variant: NICEs eksempel på mindre trinn (25 %) brukes fra første trinn, fordi NICE nevner stoffet blant dem som oftere gir seponeringssymptomer og krever særlig varsomhet. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 2,5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (10 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-seroxat pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 28 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Flere uker eller måneder» er lest som minst fire uker. 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig. (bygger på dmp-seroxat pkt. 4.4; nice-ng222 anbefaling 1.4.16) |

**Betingelser:**

- Startdose 2,5–60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 2,5 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-seroxat pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 10 mg krever deling av 10 mg eller flytende form (mikstur); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 25 % per trinn til neste dose er under 2,5 mg (langvarig).* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 30 mg; dag 15–28: 22,5 mg; dag 29–42: 16,88 mg; dag 43–56: 12,66 mg; dag 57–70: 9,49 mg; dag 71–84: 7,12 mg; dag 85–98: 5,34 mg; dag 99–112: 4 mg; dag 113–126: 3 mg; fra dag 127: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–126 (126 dager).
- *Fra 20 mg: 25 % per trinn.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 15 mg; dag 15–28: 11,25 mg; dag 29–42: 8,44 mg; dag 43–56: 6,33 mg; dag 57–70: 4,75 mg; dag 71–84: 3,56 mg; dag 85–98: 2,67 mg; fra dag 99: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–98 (98 dager).
- *Fra 10 mg fortsetter nedtrappingen under laveste døgndose.* Inndata: startdose 10 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 7,5 mg; dag 15–28: 5,63 mg; dag 29–42: 4,22 mg; dag 43–56: 3,16 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 2,5–60 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Nedtrappingen av paroksetin varer minst 28 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.

## Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 2, fingeravtrykk `51c002b99d49427bf3084e3fe23bb69156bd50c08384d1df4c6866f3b22539df`. Seponering: sertralin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 25 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 6,25 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på dmp-zoloft pkt. 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 6,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (25 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-zoloft pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-zoloft pkt. 4.2 og 4.4) |

**Betingelser:**

- Startdose 6,25–200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 6,25 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (200 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-zoloft pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 200 mg: halvering til 25 mg, så 25 % per trinn til neste dose er under 6,25 mg (langvarig).* Inndata: startdose 200 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 100 mg; dag 15–28: 50 mg; dag 29–42: 25 mg; dag 43–56: 18,75 mg; dag 57–70: 14,06 mg; dag 71–84: 10,55 mg; dag 85–98: 7,91 mg; fra dag 99: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 6,25–200 mg (bindende) – oppfylt. 200 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–98 (98 dager).
- *Fra 50 mg: 25 mg, så 25 % per trinn.* Inndata: startdose 50 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 25 mg; dag 15–28: 18,75 mg; dag 29–42: 14,06 mg; dag 43–56: 10,55 mg; dag 57–70: 7,91 mg; fra dag 71: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 6,25–200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–70 (70 dager).
- *Lav restdose under ordinært doseområde: 25 % per trinn.* Inndata: startdose 12,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 9,38 mg; dag 15–28: 7,03 mg; fra dag 29: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 6,25–200 mg (bindende) – oppfylt. 12,5 mg.
  - Kontroll: Nedtrappingen av sertralin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
- *6 mg er under sluttdosen, der regelen ikke gir noen nedtrapping.* Inndata: startdose 6 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Startdosen 6 mg er utenfor det regelen gjelder for (6,25–200 mg).
- *250 mg er over dosene regelen gjelder for.* Inndata: startdose 250 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Startdosen 250 mg er utenfor det regelen gjelder for (6,25–200 mg).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 200 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 200 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Stop`.

## Seponering av venlafaksin, langsom prosentvis nedtrapping

`seponering-venlafaksin`, versjon 2, fingeravtrykk `e22e2065938149dc4583812a9a4e6dbfd45ab5097d79f4c8ad54cdeeb595eb3d`. Seponering: venlafaksin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker, for noen over måneder. Kapslene skal svelges hele. *([dmp-efexor-depot](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-04782.pdf), pkt. 4.2)*
- Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.
  - Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose, med 14 dager per trinn, og seponerer når neste dose blir under 9,375 mg. Nedtrappingen skal vare minst 14 dager; blir den kortere, stopper beregningen.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Langsom variant: NICEs eksempel på mindre trinn (25 %) brukes fra første trinn, fordi NICE nevner stoffet blant dem som oftere gir seponeringssymptomer og krever særlig varsomhet. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 9,375 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (37,5 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på dmp-efexor-depot pkt. 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-efexor-depot pkt. 4.2) |

**Betingelser:**

- Startdose 9,375–375 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 9,375 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (375 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-efexor-depot pkt. 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.
- Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- De fleste trinnene i den langsomme varianten kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.
- Om 25 % fra første trinn er langsomt nok, eller unødvendig langsomt ved høye doser, er ikke avklart.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 150 mg: 25 % per trinn til neste dose er under 9,38 mg (langvarig).* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 112,5 mg; dag 15–28: 84,38 mg; dag 29–42: 63,28 mg; dag 43–56: 47,46 mg; dag 57–70: 35,6 mg; dag 71–84: 26,7 mg; dag 85–98: 20,02 mg; dag 99–112: 15,02 mg; dag 113–126: 11,26 mg; fra dag 127: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 9,38–375 mg (bindende) – oppfylt. 150 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–126 (126 dager).
- *Fra laveste døgndose fortsetter nedtrappingen under den.* Inndata: startdose 37,5 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 28,13 mg; dag 15–28: 21,09 mg; dag 29–42: 15,82 mg; dag 43–56: 11,87 mg; fra dag 57: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 9,38–375 mg (bindende) – oppfylt. 37,5 mg.
  - Kontroll: Nedtrappingen av venlafaksin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 150 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 150 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ve>Stop`.

## Seponering av vortioksetin, gjentatt prosentvis nedtrapping

`seponering-vortioksetin`, versjon 2, fingeravtrykk `0c2a8d719ad7feb026d2b7e1fa9865a986e0b5f2fa5ed8679330f5a2ede5e0ab`. Seponering: vortioksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- Det bør gå én til to uker mellom reduksjonene.
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 50 % av aktuell dose ned til 5 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 1,25 mg.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Det bør gå én til to uker for å vurdere virkningen av en dosereduksjon før neste. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.18)*
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Preparatomtalen krever ingen minste varighet, så regelen har ingen.
  - Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan. *([ema-brintellix](https://www.ema.europa.eu/en/documents/product-information/brintellix-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_prosent | 25 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE på mindre trinn ved lav dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.lav_grense_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav. (bygger på ema-brintellix section 4.2) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 1,25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** En firedel av laveste døgndose preparatomtalen oppgir for voksne (5 mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5. (bygger på ema-brintellix section 4.2; nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste. (bygger på nice-ng222 anbefaling 1.4.18) |

**Betingelser:**

- Startdose 1,25–20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 1,25 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (20 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på ema-brintellix section 4.2))
- Må bekreftes (`startforslag`): Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. (**OUSFAR-vurdering, åpent forslag:** NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Planen gjelder seponering, ikke bytte til et annet antidepressiv.
- Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.

**Usikkerhet:**

- Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.
- Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.
- Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.
- Nedtrappingen bygger på NICEs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.
- Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: 10 og 5 mg, så 25 % per trinn til neste dose er under 1,25 mg.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; dag 29–42: 3,75 mg; dag 43–56: 2,81 mg; dag 57–70: 2,11 mg; dag 71–84: 1,58 mg; fra dag 85: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,25–20 mg (bindende) – oppfylt. 20 mg.
- *Fra sluttdosen seponeres vortioksetin fra dag 1, fordi regelen ikke har noen minste varighet.* Inndata: startdose 1,25 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** fra dag 1: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,25–20 mg (bindende) – oppfylt. 1,25 mg.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 20 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
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
