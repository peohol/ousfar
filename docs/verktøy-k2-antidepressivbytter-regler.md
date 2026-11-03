# OUSFAR Verktøy – K2: komplette bytter mellom antidepressiva (til faglig kontroll)

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-antidepressivbytter` versjon 1, regelmodell 11, beregningsmotor 9. Komplette bytter mellom antidepressiva (K2): fra pasientens nåværende dose til seponering av det gamle legemidlet og en valgt vedlikeholdsdose av det nye. Fem regler i to familier, til uavhengig faglig kontroll; ingen er klinisk godkjent.

**5 regler, 0 klinisk godkjent.** Utfallet av kontrollen: 5 ikke ferdig kontrollert. Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-k2-antidepressivbytter.md` og `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `bytte-sertralin-mirtazapin` | kryssnedtrapping | sertralin → mirtazapin | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 7 |
| `bytte-escitalopram-mirtazapin` | kryssnedtrapping | escitalopram → mirtazapin | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 7 |
| `bytte-citalopram-mirtazapin` | kryssnedtrapping | citalopram → mirtazapin | beregnbar etter faglig avklaring | 6 | til faglig kontroll | 7 |
| `bytte-escitalopram-sertralin` | sekvensielt bytte | escitalopram → sertralin | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 6 |
| `bytte-citalopram-sertralin` | sekvensielt bytte | citalopram → sertralin | beregnbar etter faglig avklaring | 8 | til faglig kontroll | 6 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf) | preparatomtale | Cipralex (escitalopram) tabletter, preparatomtale | Oppdatert 22.11.2024 | `a04d22200055055d…` |
| [dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf) | preparatomtale | Cipramil (citalopram) tabletter, preparatomtale | Oppdatert 16.05.2024 | `4bc8dfd2e647d273…` |
| [dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf) | preparatomtale | Zoloft (sertralin) tabletter, preparatomtale | Oppdatert 07.01.2026 | `4ac8f7305379de98…` |
| [dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf) | preparatomtale | Remeron (mirtazapin) tabletter, preparatomtale | Oppdatert 01.09.2021 | `2bc89cecfe0b2a80…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/) | oversiktsartikkel | Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83 | doi:10.18773/austprescr.2016.039, PMC4919171 | `55c5b956f46b02f9…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering

`bytte-sertralin-mirtazapin`, versjon 1, fingeravtrykk `f830cb4505d15bbefe34476fb57b037caf6851a52ca3d959fecf057223803b7f`. Kryssnedtrapping: sertralin → mirtazapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis, over minst én til to uker.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Fra et SSRI til mirtazapin: SSRI-et trappes ned, og mirtazapin startes i lav dose; forsiktig kryssnedtrapping er et alternativ til utvasking.
  - Fra citalopram, escitalopram, paroksetin eller sertralin til mirtazapin: trapp ned SSRI-et og start mirtazapin i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3 (fra SSRI til mirtazapin))*
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
- Ved kryssnedtrapping økes det nye legemidlet til terapeutisk dose når det første er seponert.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
- Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.
  - Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.9.9)*
- Mirtazapin startes med 15 eller 30 mg; effektiv dose er vanligvis 15–45 mg, og responsen vurderes etter 2–4 uker.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer sertralin hver 14. dag ned til 25 mg, gir den dosen i 14 dager og seponerer etter den. Mirtazapin 15 mg gis fra dag 1 og holdes til siste dose sertralin.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Startdose 50 mg daglig (25 mg ved enkelte angstlidelser); økning i trinn på 50 mg til maksimalt 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Dagen etter siste dose av SSRI-et går mirtazapin til vedlikeholdsdosen forskriveren har valgt, 15 eller 30 mg. Planen er da fullført; en eventuell økning til 45 mg er en senere, responsstyrt vurdering.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal lever- og nyrefunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste dose i preparatomtalen (25 mg) er siste trinn; den gis like lenge som de andre trinnene, og sertralin seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST. (bygger på dmp-zoloft pkt. 4.2; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16; dmp-zoloft pkt. 4.2 og 4.4) |
| til: fase 1 (hold) | dose.mg | 15 mg | veiledende | dmp-remeron pkt. 4.2 |

**Betingelser:**

- Startdose 50, 100, 200 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Regelen gjelder bare sertralin 50, 100, 200 mg: dosene som kan halveres ned til 25 mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt. (bygger på dmp-zoloft pkt. 4.2))
- Måldose (må oppgis) 15, 30 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Forskriveren velger vedlikeholdsdosen 15 eller 30 mg, startdosene i preparatomtalen. Den gis fra dagen etter siste dose av SSRI-et. 45 mg er en senere, responsstyrt økning etter preparatomtalen og ingen del av planen. (bygger på dmp-remeron pkt. 4.2; keks-2016 tabell 2 (cross-taper switch); dmp-remeron pkt. 4.2))
- Må bekreftes (`indikasjon`): Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. (dmp-remeron pkt. 4.2; dmp-zoloft pkt. 4.2)
- Må bekreftes (`toleranse_overlapp`): Toleransen vurderes før hver reduksjon og før seponeringen av sertralin: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.9.9; dmp-remeron pkt. 4.2)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. (nice-ng222 anbefaling 1.9.9; keks-2016 note til tabell 3)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`lang_behandlingstid`): Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?)
- Unntak (`over_65`): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. (dmp-zoloft pkt. 4.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. (dmp-zoloft pkt. 4.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. (dmp-remeron pkt. 4.2)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, åpent forslag:** En klinisk godkjenning kan bare gjelde sertralin 50, 100, 200 mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. (bygger på dmp-zoloft pkt. 4.2; dmp-remeron pkt. 4.2)):

- 50, 100 og 200 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 25, 50 og 100 mg, styrker (til) 15, 30 og 45 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker sertralin i én av dosene 50, 100, 200 mg daglig, som tabletter.
- Dagene er minstetider. Kommer det plagsomme seponeringssymptomer, går pasienten tilbake til forrige dose og byttet planlegges på nytt med mindre trinn.

**Usikkerhet:**

- RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker, fordi NICE åpner for raskere nedtrapping ved bytte og mirtazapin startes samtidig. Om det er forsvarlig, er et spørsmål til faglig kontroll.
- Overlappens lengde og tidspunktet for økning av mirtazapin er OUSFARs valg innenfor kildene; serotonerge bivirkninger kan øke mens begge brukes.
- Mirtazapin hemmer ikke serotoninreopptaket, så seponeringssymptomer etter SSRI-et kan komme også under byttet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *sertralin 200 mg til mirtazapin 30 mg: halvering hver 14. dag til 25 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose sertralin.* Inndata: startdose 200 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 100 mg; dag 15–28: 50 mg; dag 29–42: 25 mg; fra dag 43: seponert
  - **til:** dag 1–42: 15 mg; fra dag 43: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av sertralin: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 50, 100, 200 mg (bindende) – oppfylt. 200 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *sertralin 50 mg til mirtazapin 15 mg: halvering hver 14. dag til 25 mg og seponering, mirtazapin 15 mg fra dag 1 som fortsetter.* Inndata: startdose 50 mg; måldose 15 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 25 mg; fra dag 15: seponert
  - **til:** fra dag 1: 15 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av sertralin: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 50, 100, 200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 15 mg.
- *sertralin 50 mg til mirtazapin 30 mg: halvering hver 14. dag til 25 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose sertralin.* Inndata: startdose 50 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 25 mg; fra dag 15: seponert
  - **til:** dag 1–14: 15 mg; fra dag 15: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av sertralin: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 50, 100, 200 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *En dose som ikke kan halveres med hele tabletter, stopper.* Inndata: startdose 75 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Startdosen 75 mg er utenfor det regelen gjelder for (50, 100, 200 mg).
- *Uten valgt vedlikeholdsdose for mirtazapin velger beregningen ikke selv.* Inndata: startdose 200 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *45 mg er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.* Inndata: startdose 200 mg; måldose 45 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg).
- *Etter lang behandlingstid gjelder ikke regelen.* Inndata: startdose 200 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid ja, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Mz`.

## Bytte fra escitalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-escitalopram-mirtazapin`, versjon 1, fingeravtrykk `52fa1d24bb22ce947e4bbc991d8cc29a15a97d6abc92022b5140b856f29fc6e0`. Kryssnedtrapping: escitalopram → mirtazapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis, over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Fra et SSRI til mirtazapin: SSRI-et trappes ned, og mirtazapin startes i lav dose; forsiktig kryssnedtrapping er et alternativ til utvasking.
  - Fra citalopram, escitalopram, paroksetin eller sertralin til mirtazapin: trapp ned SSRI-et og start mirtazapin i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3 (fra SSRI til mirtazapin))*
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
- Ved kryssnedtrapping økes det nye legemidlet til terapeutisk dose når det første er seponert.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
- Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.
  - Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.9.9)*
- Mirtazapin startes med 15 eller 30 mg; effektiv dose er vanligvis 15–45 mg, og responsen vurderes etter 2–4 uker.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer escitalopram hver 14. dag ned til 5 mg, gir den dosen i 14 dager og seponerer etter den. Mirtazapin 15 mg gis fra dag 1 og holdes til siste dose escitalopram.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Over 65 år startes det med 5 mg, høyst 10 mg; ved mild til moderat nedsatt leverfunksjon 5 mg de to første ukene, høyst 10 mg. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Dagen etter siste dose av SSRI-et går mirtazapin til vedlikeholdsdosen forskriveren har valgt, 15 eller 30 mg. Planen er da fullført; en eventuell økning til 45 mg er en senere, responsstyrt vurdering.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal lever- og nyrefunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste dose i preparatomtalen (5 mg) er siste trinn; den gis like lenge som de andre trinnene, og escitalopram seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST. (bygger på dmp-cipralex pkt. 4.2; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16; dmp-cipralex pkt. 4.2) |
| til: fase 1 (hold) | dose.mg | 15 mg | veiledende | dmp-remeron pkt. 4.2 |

**Betingelser:**

- Startdose 10, 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Regelen gjelder bare escitalopram 10, 20 mg: dosene som kan halveres ned til 5 mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt. (bygger på dmp-cipralex pkt. 4.2))
- Måldose (må oppgis) 15, 30 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Forskriveren velger vedlikeholdsdosen 15 eller 30 mg, startdosene i preparatomtalen. Den gis fra dagen etter siste dose av SSRI-et. 45 mg er en senere, responsstyrt økning etter preparatomtalen og ingen del av planen. (bygger på dmp-remeron pkt. 4.2; keks-2016 tabell 2 (cross-taper switch); dmp-remeron pkt. 4.2))
- Må bekreftes (`indikasjon`): Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. (dmp-remeron pkt. 4.2; dmp-cipralex pkt. 4.2)
- Må bekreftes (`toleranse_overlapp`): Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.9.9; dmp-remeron pkt. 4.2)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. (nice-ng222 anbefaling 1.9.9; keks-2016 note til tabell 3)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`lang_behandlingstid`): Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?)
- Unntak (`over_65`): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. (dmp-cipralex pkt. 4.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. (dmp-cipralex pkt. 4.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. (dmp-remeron pkt. 4.2)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, åpent forslag:** En klinisk godkjenning kan bare gjelde escitalopram 10, 20 mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. (bygger på dmp-cipralex pkt. 4.2; dmp-remeron pkt. 4.2)):

- 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 15, 30 og 45 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker escitalopram i én av dosene 10, 20 mg daglig, som tabletter.
- Dagene er minstetider. Kommer det plagsomme seponeringssymptomer, går pasienten tilbake til forrige dose og byttet planlegges på nytt med mindre trinn.

**Usikkerhet:**

- RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker, fordi NICE åpner for raskere nedtrapping ved bytte og mirtazapin startes samtidig. Om det er forsvarlig, er et spørsmål til faglig kontroll.
- Overlappens lengde og tidspunktet for økning av mirtazapin er OUSFARs valg innenfor kildene; serotonerge bivirkninger kan øke mens begge brukes.
- Mirtazapin hemmer ikke serotoninreopptaket, så seponeringssymptomer etter SSRI-et kan komme også under byttet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *escitalopram 20 mg til mirtazapin 30 mg: halvering hver 14. dag til 5 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose escitalopram.* Inndata: startdose 20 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; fra dag 29: seponert
  - **til:** dag 1–28: 15 mg; fra dag 29: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *escitalopram 10 mg til mirtazapin 15 mg: halvering hver 14. dag til 5 mg og seponering, mirtazapin 15 mg fra dag 1 som fortsetter.* Inndata: startdose 10 mg; måldose 15 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 5 mg; fra dag 15: seponert
  - **til:** fra dag 1: 15 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 15 mg.
- *escitalopram 10 mg til mirtazapin 30 mg: halvering hver 14. dag til 5 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose escitalopram.* Inndata: startdose 10 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 5 mg; fra dag 15: seponert
  - **til:** dag 1–14: 15 mg; fra dag 15: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *En dose som ikke kan halveres med hele tabletter, stopper.* Inndata: startdose 15 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg).
- *Uten valgt vedlikeholdsdose for mirtazapin velger beregningen ikke selv.* Inndata: startdose 20 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *45 mg er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.* Inndata: startdose 20 mg; måldose 45 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg).
- *Etter lang behandlingstid gjelder ikke regelen.* Inndata: startdose 20 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid ja, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Es>Mz`.

## Bytte fra citalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-citalopram-mirtazapin`, versjon 1, fingeravtrykk `9c71ed2ad402c577f845bb988888e1c0b48c984005a536f88314e3ca7d07b832`. Kryssnedtrapping: citalopram → mirtazapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis, over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Fra et SSRI til mirtazapin: SSRI-et trappes ned, og mirtazapin startes i lav dose; forsiktig kryssnedtrapping er et alternativ til utvasking.
  - Fra citalopram, escitalopram, paroksetin eller sertralin til mirtazapin: trapp ned SSRI-et og start mirtazapin i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3 (fra SSRI til mirtazapin))*
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
- Ved kryssnedtrapping økes det nye legemidlet til terapeutisk dose når det første er seponert.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
- Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.
  - Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.9.9)*
- Mirtazapin startes med 15 eller 30 mg; effektiv dose er vanligvis 15–45 mg, og responsen vurderes etter 2–4 uker.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer citalopram hver 14. dag ned til 10 mg, gir den dosen i 14 dager og seponerer etter den. Mirtazapin 15 mg gis fra dag 1 og holdes til siste dose citalopram.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved panikklidelse startes det med 10 mg; ved depresjon er anbefalt dose 20 mg, høyst 40 mg. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Dagen etter siste dose av SSRI-et går mirtazapin til vedlikeholdsdosen forskriveren har valgt, 15 eller 30 mg. Planen er da fullført; en eventuell økning til 45 mg er en senere, responsstyrt vurdering.
  - Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (cross-taper switch))*
  - Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal lever- og nyrefunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste dose i preparatomtalen (10 mg) er siste trinn; den gis like lenge som de andre trinnene, og citalopram seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST. (bygger på dmp-cipramil pkt. 4.2; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16; dmp-cipramil pkt. 4.2) |
| til: fase 1 (hold) | dose.mg | 15 mg | veiledende | dmp-remeron pkt. 4.2 |

**Betingelser:**

- Startdose 20, 40 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Regelen gjelder bare citalopram 20, 40 mg: dosene som kan halveres ned til 10 mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt. (bygger på dmp-cipramil pkt. 4.2))
- Måldose (må oppgis) 15, 30 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Forskriveren velger vedlikeholdsdosen 15 eller 30 mg, startdosene i preparatomtalen. Den gis fra dagen etter siste dose av SSRI-et. 45 mg er en senere, responsstyrt økning etter preparatomtalen og ingen del av planen. (bygger på dmp-remeron pkt. 4.2; keks-2016 tabell 2 (cross-taper switch); dmp-remeron pkt. 4.2))
- Må bekreftes (`indikasjon`): Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. (dmp-remeron pkt. 4.2; dmp-cipramil pkt. 4.2)
- Må bekreftes (`toleranse_overlapp`): Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.9.9; dmp-remeron pkt. 4.2)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. (nice-ng222 anbefaling 1.9.9; keks-2016 note til tabell 3)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`lang_behandlingstid`): Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?)
- Unntak (`over_65`): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. (dmp-cipramil pkt. 4.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. (dmp-cipramil pkt. 5.2; dmp-remeron pkt. 4.2)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. (dmp-remeron pkt. 4.2)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, åpent forslag:** En klinisk godkjenning kan bare gjelde citalopram 20, 40 mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. (bygger på dmp-cipramil pkt. 4.2; dmp-remeron pkt. 4.2)):

- 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 15, 30 og 45 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker citalopram i én av dosene 20, 40 mg daglig, som tabletter.
- Dagene er minstetider. Kommer det plagsomme seponeringssymptomer, går pasienten tilbake til forrige dose og byttet planlegges på nytt med mindre trinn.

**Usikkerhet:**

- RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker, fordi NICE åpner for raskere nedtrapping ved bytte og mirtazapin startes samtidig. Om det er forsvarlig, er et spørsmål til faglig kontroll.
- Overlappens lengde og tidspunktet for økning av mirtazapin er OUSFARs valg innenfor kildene; serotonerge bivirkninger kan øke mens begge brukes.
- Mirtazapin hemmer ikke serotoninreopptaket, så seponeringssymptomer etter SSRI-et kan komme også under byttet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *citalopram 40 mg til mirtazapin 30 mg: halvering hver 14. dag til 10 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose citalopram.* Inndata: startdose 40 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - **til:** dag 1–28: 15 mg; fra dag 29: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *citalopram 20 mg til mirtazapin 15 mg: halvering hver 14. dag til 10 mg og seponering, mirtazapin 15 mg fra dag 1 som fortsetter.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - **til:** fra dag 1: 15 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 15 mg.
- *citalopram 20 mg til mirtazapin 30 mg: halvering hver 14. dag til 10 mg og seponering, mirtazapin 15 mg fra dag 1 og 30 mg fra dagen etter siste dose citalopram.* Inndata: startdose 20 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - **til:** dag 1–14: 15 mg; fra dag 15: 30 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 15, 30 mg (bindende) – oppfylt. 30 mg.
- *En dose som ikke kan halveres med hele tabletter, stopper.* Inndata: startdose 30 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg).
- *Uten valgt vedlikeholdsdose for mirtazapin velger beregningen ikke selv.* Inndata: startdose 40 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *45 mg er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.* Inndata: startdose 40 mg; måldose 45 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg).
- *Etter lang behandlingstid gjelder ikke regelen.* Inndata: startdose 40 mg; måldose 30 mg; bekreftet: indikasjon, toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid ja, over_65 nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Mz`.

## Bytte fra escitalopram til sertralin, nedtrapping og kort utvasking

`bytte-escitalopram-sertralin`, versjon 1, fingeravtrykk `70545d3515dc32ff7e7ef225cf36c5e6326af11653d6bb676551cbc60975379c`. Sekvensielt bytte: escitalopram → sertralin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis, over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Fra et SSRI til et annet: det første trappes ned, og det nye startes i lav dose.
  - Fra citalopram, escitalopram, paroksetin eller sertralin til et annet av dem: trapp ned og start det nye SSRI-et i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3 (fra SSRI til annet SSRI))*
- Moderat bytte: nedtrapping til seponering, 2–4 dager uten legemiddel og oppstart i lav dose; interaksjonsrisikoen er lav.
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
- Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel før det nye startes.
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
  - Halveringstiden etter gjentatt dosering er omtrent 30 timer. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 5.2)*
- Sertralin startes med 50 mg ved depresjon og økes i trinn på 50 mg med minst én ukes mellomrom.
  - Ved depresjon startes sertralin med 50 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
  - Ved manglende respons på 50 mg kan dosen økes i trinn på 50 mg med minst én ukes mellomrom, høyst 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer escitalopram hver 14. dag ned til 5 mg, gir den dosen i 14 dager og seponerer etter den.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Over 65 år startes det med 5 mg, høyst 10 mg; ved mild til moderat nedsatt leverfunksjon 5 mg de to første ukene, høyst 10 mg. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Etter tre hele dager uten SSRI startes sertralin 50 mg. Har forskriveren valgt 100 mg, økes dosen etter 14 dager; planen er da fullført. Høyere doser er senere, responsstyrte vurderinger.
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
  - Halveringstiden etter gjentatt dosering er omtrent 30 timer. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 5.2)*
  - Ved manglende respons på 50 mg kan dosen økes i trinn på 50 mg med minst én ukes mellomrom, høyst 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
- OUSFAR har valgt et moderat bytte med utvasking, ikke direkte bytte eller kryssnedtrapping, fordi to SSRI-er samtidig gir høyere risiko for serotonerge bivirkninger.
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
- Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal leverfunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 5 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste dose i preparatomtalen (5 mg) er siste trinn; den gis like lenge som de andre trinnene, og escitalopram seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST. (bygger på dmp-cipralex pkt. 4.2; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16; dmp-cipralex pkt. 4.2) |
| til: start | utvasking | 3 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Tre hele dager uten SSRI: innenfor de 2–4 dagene ved et moderat bytte og minst to halveringstider for escitalopram (omtrent 30–36 timer). Et minimum, ikke en fast startdato. (bygger på keks-2016 tabell 2 (moderate switch); keks-2016 note * til tabell 3; dmp-cipralex pkt. 5.2) |
| til: fase 1 (hold) | dose.mg | 50 mg | veiledende | dmp-zoloft pkt. 4.2 |
| til: fase 1 (hold) | varighet.dager | 14 dager (område 7–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen krever minst én uke mellom doseendringer; OUSFAR foreslår 14 dager på 50 mg før en eventuell økning, så responsen kan vurderes. (bygger på dmp-zoloft pkt. 4.2; dmp-cipralex pkt. 4.2) |

**Betingelser:**

- Startdose 10, 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Regelen gjelder bare escitalopram 10 og 20 mg: dosene som kan halveres ned til 5 mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt. (bygger på dmp-cipralex pkt. 4.2))
- Måldose (må oppgis) 50, 100 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Forskriveren velger vedlikeholdsdosen 50 eller 100 mg. Sertralin startes med 50 mg, preparatomtalens startdose ved depresjon, og 100 mg er én økning på 50 mg. Høyere doser er senere, responsstyrte økninger og ingen del av planen. (bygger på dmp-zoloft pkt. 4.2; dmp-zoloft pkt. 4.2))
- Må bekreftes (`indikasjon`): Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. (dmp-zoloft pkt. 4.2; dmp-cipralex pkt. 4.2)
- Må bekreftes (`toleranse_bytte`): Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; keks-2016 tabell 2 (moderate switch); dmp-cipralex pkt. 4.2)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. (nice-ng222 anbefaling 1.9.9; keks-2016 note til tabell 3)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`lang_behandlingstid`): Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?)
- Unntak (`over_65`): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. (dmp-cipralex pkt. 4.2; dmp-zoloft pkt. 4.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. (dmp-cipralex pkt. 4.2; dmp-zoloft pkt. 4.2)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, åpent forslag:** En klinisk godkjenning kan bare gjelde escitalopram 10 og 20 mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. (bygger på dmp-cipralex pkt. 4.2; dmp-zoloft pkt. 4.2)):

- 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 25, 50 og 100 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker escitalopram i én av dosene 10 og 20 mg daglig, som tabletter.
- Dagene er minstetider. Kommer det plagsomme seponeringssymptomer eller forverring, går pasienten tilbake til forrige dose og byttet planlegges på nytt.

**Usikkerhet:**

- I dagene uten SSRI kan seponeringssymptomer og forverring av depresjonen komme; Keks mfl. nevner dette som ulempen ved et moderat bytte. Om direkte bytte eller kryssnedtrapping er bedre for noen, er et spørsmål til faglig kontroll.
- RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker. Om det er forsvarlig ved bytte, er et spørsmål til faglig kontroll.
- Tre dager er OUSFARs valg innenfor kildene, ikke en verdi preparatomtalene oppgir.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *escitalopram 20 mg til sertralin 100 mg: halvering hver 14. dag til 5 mg og seponering, tre dager uten SSRI, så sertralin 50 mg i 14 dager og deretter 100 mg.* Inndata: startdose 20 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 10 mg; dag 15–28: 5 mg; fra dag 29: seponert
  - **til:** dag 32–45: 50 mg; fra dag 46: 100 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Minst 3 dager uten escitalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 29–31 (3 dager); sertralin tidligst dag 32.
- *escitalopram 10 mg til sertralin 50 mg: halvering hver 14. dag til 5 mg og seponering, tre dager uten SSRI, så sertralin 50 mg som fortsetter.* Inndata: startdose 10 mg; måldose 50 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 5 mg; fra dag 15: seponert
  - **til:** fra dag 18: 50 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Minst 3 dager uten escitalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 15–17 (3 dager); sertralin tidligst dag 18.
- *escitalopram 10 mg til sertralin 100 mg: halvering hver 14. dag til 5 mg og seponering, tre dager uten SSRI, så sertralin 50 mg i 14 dager og deretter 100 mg.* Inndata: startdose 10 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 5 mg; fra dag 15: seponert
  - **til:** dag 18–31: 50 mg; fra dag 32: 100 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10, 20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Minst 3 dager uten escitalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 15–17 (3 dager); sertralin tidligst dag 18.
- *En dose som ikke kan halveres med hele tabletter, stopper.* Inndata: startdose 15 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg).
- *150 mg sertralin er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.* Inndata: startdose 20 mg; måldose 150 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg).
- *Over 65 år gjelder ikke regelen.* Inndata: startdose 20 mg; måldose 50 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 ja, nedsatt_leverfunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Es>Se`.

## Bytte fra citalopram til sertralin, nedtrapping og kort utvasking

`bytte-citalopram-sertralin`, versjon 1, fingeravtrykk `dfaa681b4a25de97ba9a110650756e657008b8f2750d5487377e9eb3804b3471`. Sekvensielt bytte: citalopram → sertralin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis, over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Fra et SSRI til et annet: det første trappes ned, og det nye startes i lav dose.
  - Fra citalopram, escitalopram, paroksetin eller sertralin til et annet av dem: trapp ned og start det nye SSRI-et i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3 (fra SSRI til annet SSRI))*
- Moderat bytte: nedtrapping til seponering, 2–4 dager uten legemiddel og oppstart i lav dose; interaksjonsrisikoen er lav.
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
- Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel før det nye startes.
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
  - Eliminasjonshalveringstiden er omtrent halvannet døgn; den er lengre hos eldre og ved nedsatt leverfunksjon. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 5.2)*
- Sertralin startes med 50 mg ved depresjon og økes i trinn på 50 mg med minst én ukes mellomrom.
  - Ved depresjon startes sertralin med 50 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
  - Ved manglende respons på 50 mg kan dosen økes i trinn på 50 mg med minst én ukes mellomrom, høyst 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer citalopram hver 14. dag ned til 10 mg, gir den dosen i 14 dager og seponerer etter den.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved panikklidelse startes det med 10 mg; ved depresjon er anbefalt dose 20 mg, høyst 40 mg. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- Etter tre hele dager uten SSRI startes sertralin 50 mg. Har forskriveren valgt 100 mg, økes dosen etter 14 dager; planen er da fullført. Høyere doser er senere, responsstyrte vurderinger.
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
  - Eliminasjonshalveringstiden er omtrent halvannet døgn; den er lengre hos eldre og ved nedsatt leverfunksjon. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 5.2)*
  - Ved manglende respons på 50 mg kan dosen økes i trinn på 50 mg med minst én ukes mellomrom, høyst 200 mg daglig. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2)*
- OUSFAR har valgt et moderat bytte med utvasking, ikke direkte bytte eller kryssnedtrapping, fordi to SSRI-er samtidig gir høyere risiko for serotonerge bivirkninger.
  - Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), note * til tabell 3)*
  - Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2 (moderate switch))*
- Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal leverfunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste dose i preparatomtalen (10 mg) er siste trinn; den gis like lenge som de andre trinnene, og citalopram seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST. (bygger på dmp-cipramil pkt. 4.2; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16; dmp-cipramil pkt. 4.2) |
| til: start | utvasking | 3 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** Tre hele dager uten SSRI: innenfor de 2–4 dagene ved et moderat bytte og minst to halveringstider for citalopram (omtrent 30–36 timer). Et minimum, ikke en fast startdato. (bygger på keks-2016 tabell 2 (moderate switch); keks-2016 note * til tabell 3; dmp-cipramil pkt. 5.2) |
| til: fase 1 (hold) | dose.mg | 50 mg | veiledende | dmp-zoloft pkt. 4.2 |
| til: fase 1 (hold) | varighet.dager | 14 dager (område 7–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Preparatomtalen krever minst én uke mellom doseendringer; OUSFAR foreslår 14 dager på 50 mg før en eventuell økning, så responsen kan vurderes. (bygger på dmp-zoloft pkt. 4.2; dmp-cipralex pkt. 4.2) |

**Betingelser:**

- Startdose 20, 40 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Regelen gjelder bare citalopram 20 og 40 mg: dosene som kan halveres ned til 10 mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt. (bygger på dmp-cipramil pkt. 4.2))
- Måldose (må oppgis) 50, 100 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Forskriveren velger vedlikeholdsdosen 50 eller 100 mg. Sertralin startes med 50 mg, preparatomtalens startdose ved depresjon, og 100 mg er én økning på 50 mg. Høyere doser er senere, responsstyrte økninger og ingen del av planen. (bygger på dmp-zoloft pkt. 4.2; dmp-zoloft pkt. 4.2))
- Må bekreftes (`indikasjon`): Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. (dmp-zoloft pkt. 4.2; dmp-cipramil pkt. 4.2)
- Må bekreftes (`toleranse_bytte`): Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; keks-2016 tabell 2 (moderate switch); dmp-cipralex pkt. 4.2)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. (nice-ng222 anbefaling 1.9.9; keks-2016 note til tabell 3)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Unntak (`lang_behandlingstid`): Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping When and how should I stop my antidepressants?)
- Unntak (`over_65`): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. (dmp-cipramil pkt. 4.2; dmp-zoloft pkt. 4.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. (dmp-cipramil pkt. 5.2; dmp-zoloft pkt. 4.2)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, åpent forslag:** En klinisk godkjenning kan bare gjelde citalopram 20 og 40 mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. (bygger på dmp-cipramil pkt. 4.2; dmp-zoloft pkt. 4.2)):

- 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 25, 50 og 100 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker citalopram i én av dosene 20 og 40 mg daglig, som tabletter.
- Dagene er minstetider. Kommer det plagsomme seponeringssymptomer eller forverring, går pasienten tilbake til forrige dose og byttet planlegges på nytt.

**Usikkerhet:**

- I dagene uten SSRI kan seponeringssymptomer og forverring av depresjonen komme; Keks mfl. nevner dette som ulempen ved et moderat bytte. Om direkte bytte eller kryssnedtrapping er bedre for noen, er et spørsmål til faglig kontroll.
- RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker. Om det er forsvarlig ved bytte, er et spørsmål til faglig kontroll.
- Tre dager er OUSFARs valg innenfor kildene, ikke en verdi preparatomtalene oppgir.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *citalopram 40 mg til sertralin 100 mg: halvering hver 14. dag til 10 mg og seponering, tre dager uten SSRI, så sertralin 50 mg i 14 dager og deretter 100 mg.* Inndata: startdose 40 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 20 mg; dag 15–28: 10 mg; fra dag 29: seponert
  - **til:** dag 32–45: 50 mg; fra dag 46: 100 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Minst 3 dager uten citalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 29–31 (3 dager); sertralin tidligst dag 32.
- *citalopram 20 mg til sertralin 50 mg: halvering hver 14. dag til 10 mg og seponering, tre dager uten SSRI, så sertralin 50 mg som fortsetter.* Inndata: startdose 20 mg; måldose 50 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - **til:** fra dag 18: 50 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 50 mg.
  - Kontroll: Minst 3 dager uten citalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 15–17 (3 dager); sertralin tidligst dag 18.
- *citalopram 20 mg til sertralin 100 mg: halvering hver 14. dag til 10 mg og seponering, tre dager uten SSRI, så sertralin 50 mg i 14 dager og deretter 100 mg.* Inndata: startdose 20 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **fra:** dag 1–14: 10 mg; fra dag 15: seponert
  - **til:** dag 18–31: 50 mg; fra dag 32: 100 mg
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20, 40 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 50, 100 mg (bindende) – oppfylt. 100 mg.
  - Kontroll: Minst 3 dager uten citalopram før sertralin (bindende) – oppfylt. Uten legemiddel dag 15–17 (3 dager); sertralin tidligst dag 18.
- *En dose som ikke kan halveres med hele tabletter, stopper.* Inndata: startdose 30 mg; måldose 100 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg).
- *150 mg sertralin er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.* Inndata: startdose 40 mg; måldose 150 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 nei, nedsatt_leverfunksjon nei.
  - **Stoppet:** Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg).
- *Over 65 år gjelder ikke regelen.* Inndata: startdose 40 mg; måldose 50 mg; bekreftet: indikasjon, toleranse_bytte, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei, lang_behandlingstid nei, over_65 ja, nedsatt_leverfunksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Se`.
