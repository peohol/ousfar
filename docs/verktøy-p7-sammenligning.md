# OUSFAR Verktøy – P7: varianter til sammenligning (ikke i verktøyet)

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping-sammenligning` versjon 3, regelmodell 5, beregningsmotor 3. Varianter til sammenligning med nedtrappingsreglene (P7.5). Ikke i verktøyet og ikke kliniske anbefalinger; til faglig kontroll.

**1 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p7-nedtrapping.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-paroksetin-studievariant` | seponering | paroksetin → – | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 5 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf) | preparatomtale | Seroxat (paroksetin) tabletter, preparatomtale | Oppdatert 17.10.2025 | `feff7cc66006b17b…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av paroksetin, rask studievariant til sammenligning (ikke klinisk anbefaling)

`seponering-paroksetin-studievariant`, versjon 3, fingeravtrykk `09be0b93688cf90e38b48deb11a815e02d5616ae5a550a3c330653d4636738fe`. Seponering: paroksetin → –. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 29.10.2026, Claude Code) → til faglig kontroll (versjon 3, 29.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- I de kliniske studiene ble døgndosen av paroksetin redusert med 10 mg hver uke.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*
- Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.
  - Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.4)*
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

- Døgndosen reduseres med 10 mg, minst 7 dager per trinn. Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Varianten er bare til sammenligning med regelen i verktøyet og vises ikke der.
  - I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere. *([dmp-seroxat](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-07840.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.mg | 10 mg | veiledende | dmp-seroxat pkt. 4.2 |
| fra: fase 1 (nedtrapping) | trinnlengde | 7 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** Ukentlige trinn som i studiene i preparatomtalen; at studienedtrappingen regnes ut til sammenligning, er OUSFARs valg. (bygger på dmp-seroxat pkt. 4.2) |

**Betingelser:**

- Startdose 10–60 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Fra 10 mg til høyeste døgndose preparatomtalen oppgir (60 mg). (bygger på dmp-seroxat pkt. 4.2))
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
- Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder), NICE og RCPsych, og er ikke en klinisk anbefaling ved langvarig behandling.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 40 mg: 10 mg mindre hver uke, uten nulltrinnet.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–7: 30 mg; dag 8–14: 20 mg; fra dag 15: 10 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 40 mg.
  - Merknad: Planen går ikke til null. Fra dag 15 står pasienten på 10 mg av paroksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Fra 20 mg: én uke på 10 mg (rask), uten nulltrinnet.* Inndata: startdose 20 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** fra dag 1: 10 mg; avslutning: vurderes individuelt (ingen nulltrinn)
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt legemidlet i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 10–60 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Planen går ikke til null. Fra dag 1 står pasienten på 10 mg av paroksetin til avslutningen er vurdert individuelt; regelen har ingen godkjent avslutning (nulltrinn).
- *Uten bekreftelse av at planen er et startforslag, stopper beregningen.* Inndata: startdose 40 mg; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **Stoppet:** Må bekreftes før beregning: Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.
- *Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.
- *Uten svar på om behandlingstiden er lang, stopper beregningen.* Inndata: startdose 40 mg; bekreftet: startforslag; pasientforhold: tidligere_seponeringssymptomer nei.
  - **Stoppet:** Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger?

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Pa>Stop`.
