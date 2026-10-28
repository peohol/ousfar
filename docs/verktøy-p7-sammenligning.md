# OUSFAR Verktøy – P7: varianter til sammenligning (ikke i verktøyet)

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping-sammenligning` versjon 1, regelmodell 3, beregningsmotor 1. Varianter til sammenligning med nedtrappingsreglene (P7.5). Ikke i verktøyet og ikke kliniske anbefalinger; til faglig kontroll.

**1 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-paroksetin-studievariant` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 4 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf) | preparatomtale | Seroxat (paroksetin) tabletter, preparatomtale | Oppdatert 17.10.2025 | `feff7cc66006b17b…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av paroksetin, rask studievariant til sammenligning (ikke klinisk anbefaling)

`seponering-paroksetin-studievariant`, versjon 1, fingeravtrykk `3bf0c16aa64b68242b96c4209329ecaef994bfbed313f5dc99cc367b337c779c`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

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
- Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Varianten er bare til sammenligning med den langsomme regelen og vises ikke i verktøyet.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.mg | 10 mg | veiledende | dmp-seroxat pkt. 4.2 |
| fra: fase 1 (nedtrapping) | trinnlengde | 7 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** Ukentlige trinn som i studiene i preparatomtalen; at studienedtrappingen regnes ut til sammenligning, er OUSFARs valg. (bygger på dmp-seroxat pkt. 4.2) |

**Betingelser:**

- Startdose 10–60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 10 mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (60 mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. (bygger på dmp-seroxat pkt. 4.2))
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
- Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder) og enn NICE, og er ikke en klinisk anbefaling ved langvarig behandling.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 10 mg mindre hver uke.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–7: 30 mg; dag 8–14: 20 mg; dag 15–21: 10 mg; fra dag 22: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 40 mg.
- *Fra 20 mg: én uke på 10 mg (rask).* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **fra:** dag 1–7: 10 mg; fra dag 8: seponert
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 20 mg.
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.
