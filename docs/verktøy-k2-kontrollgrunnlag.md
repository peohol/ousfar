# OUSFAR Verktøy – K2: kontrollgrunnlag for komplette antidepressivbytter

<!-- Laget av `npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport` fra reglene og FEST-uttrekket. Ikke rediger for hånd. -->

**Ingen av reglene er klinisk godkjent.** Planene under er regnet på en kopi der hvert åpne OUSFAR-valg er simulert avklart uendret og regelen simulert godkjent, gjennom samme vei som verktøysiden, med preparatene i FEST-uttrekket 2026-11-03 (`src/data/verktoy/fest-antidepressivbytter.json`). Kopien lagres aldri og går aldri til verktøysiden. Fingeravtrykket ved hver regel er versjonen under kontroll; en virkelig godkjenning krever en ny versjon med kontrollørens avklaringer, og den får et nytt fingeravtrykk. Uten godkjenning sier verktøyet at faglig kontroll gjenstår; det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) brukes fortsatt i appen. Bakgrunn og kilder: `docs/verktøy-k2-antidepressivbytter.md`; reglene i sin helhet: `docs/verktøy-k2-antidepressivbytter-regler.md`.

Kasusene er syntetiske. 118 kasus, alle med forventet utfall.

## Spørsmål til den faglige kontrollen

| Nr. | Spørsmål | OUSFARs anbefaling |
| --- | --- | --- |
| K2-1 | Er 14 dager per halveringstrinn, med 14 dager på laveste dose før seponering, forsvarlig ved bytte? Fra laveste startdose varer nedtrappingen da 2 uker; RCPsych og Keks mfl. beskriver omtrent 4 uker. | Godta 14 dager som minstetid ved bytte (NICE åpner for raskere nedtrapping ved bytte), med toleransevurdering før hvert trinn; lang behandlingstid og tidligere plager er allerede utenfor. |
| K2-2 | Kan seponeringen fra laveste dose (sertralin 25 mg, escitalopram 5 mg, citalopram 10 mg) etter 14 dager være en del av planen ved bytte, når toleransen er vurdert? | Ja ved bytte: det nye antidepressivet er startet eller startes straks, og planen sier at seponeringen bare gjøres når toleransen er vurdert. |
| K2-3 | Mirtazapin: er 15 mg fra dag 1 og økning til valgt vedlikeholdsdose 30 mg dagen etter siste SSRI-dose forsvarlig, og skal 45 mg holdes utenfor planen? | Ja; økningen følger Keks mfl. (økes når det første er seponert), og 45 mg er en responsstyrt økning etter preparatomtalen. |
| K2-4 | (Es)citalopram → sertralin: er et moderat bytte med tre hele dager uten SSRI riktig standard, eller bør det være direkte bytte eller kryssnedtrapping? | Moderat bytte som standard (lav interaksjonsrisiko); direkte bytte og kryssnedtrapping kan bli egne regler senere. |
| K2-5 | Sertralin: er 50 mg i minst 14 dager før valgt økning til 100 mg riktig, og skal høyere doser holdes utenfor planen? | Ja; preparatomtalen krever minst én uke, og 14 dager gir tid til å vurdere responsen. |
| K2-6 | Er avgrensningen dekkende: depresjon hos voksne 18–65 år, kort behandlingstid, ingen tidligere seponeringsplager, normal lever- og (for mirtazapin) nyrefunksjon, tabletter, bekreftet kontroll av serotonerg sammedisinering? | Ja for første leveranse; eldre, lang behandlingstid og andre former krever egne regler. |

## Reglene og planene

### Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering

`bytte-sertralin-mirtazapin`, versjon 1, fingeravtrykk `f830cb4505d15bbefe34476fb57b037caf6851a52ca3d959fecf057223803b7f`. Status: til faglig kontroll.

**sertralin 50 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**sertralin 50 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

**sertralin 100 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**sertralin 100 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

**sertralin 200 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29–42 (07.12.2026–20.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**sertralin 200 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29–42 (07.12.2026–20.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

| Kasus | Utfall |
| --- | --- |
| sertralin 75 mg, en dose regelen ikke gjelder for | stopper: Startdosen 75 mg er utenfor det regelen gjelder for (50, 100, 200 mg). Startdosen 75 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 50, 100 og 200 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 25, 50 og 100 mg, styrker (til) 15, 30 og 45 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose mirtazapin 45 mg | stopper: Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere sertralin eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt sertralin i mange måneder eller lenger: ja | stopper: Regelen gjelder ikke: Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten har brukt sertralin i mange måneder eller lenger: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt sertralin i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for sertralin og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ja | stopper: Regelen gjelder ikke: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av sertralin | stopper: Må bekreftes før beregning: Toleransen vurderes før hver reduksjon og før seponeringen av sertralin: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning: verktøyet bruker fortsatt det godkjente startforløpet (kryssnedtrapping-sertralin-mirtazapin v10) og ber om formvalg for mirtazapin | formvalg |

### Bytte fra escitalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-escitalopram-mirtazapin`, versjon 1, fingeravtrykk `52fa1d24bb22ce947e4bbc991d8cc29a15a97d6abc92022b5140b856f29fc6e0`. Status: til faglig kontroll.

**escitalopram 10 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**escitalopram 10 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

**escitalopram 20 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**escitalopram 20 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

| Kasus | Utfall |
| --- | --- |
| escitalopram 15 mg, en dose regelen ikke gjelder for | stopper: Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 15, 30 og 45 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose mirtazapin 45 mg | stopper: Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt escitalopram i mange måneder eller lenger: ja | stopper: Regelen gjelder ikke: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten har brukt escitalopram i mange måneder eller lenger: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ja | stopper: Regelen gjelder ikke: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram | stopper: Må bekreftes før beregning: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra citalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-citalopram-mirtazapin`, versjon 1, fingeravtrykk `9c71ed2ad402c577f845bb988888e1c0b48c984005a536f88314e3ca7d07b832`. Status: til faglig kontroll.

**citalopram 20 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**citalopram 20 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

**citalopram 40 mg til mirtazapin 15 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**citalopram 40 mg til mirtazapin 30 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg

| Kasus | Utfall |
| --- | --- |
| citalopram 30 mg, en dose regelen ikke gjelder for | stopper: Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg). Startdosen 30 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 15, 30 og 45 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose mirtazapin 45 mg | stopper: Måldosen 45 mg er utenfor det regelen gjelder for (15, 30 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt citalopram i mange måneder eller lenger: ja | stopper: Regelen gjelder ikke: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten har brukt citalopram i mange måneder eller lenger: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og mirtazapin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ja | stopper: Regelen gjelder ikke: Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| Pasienten har kreatininclearance under 40 ml/min: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram | stopper: Må bekreftes før beregning: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. Responsen på mirtazapin vurderes 2–4 uker etter at vedlikeholdsdosen er nådd. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra escitalopram til sertralin, nedtrapping og kort utvasking

`bytte-escitalopram-sertralin`, versjon 1, fingeravtrykk `70545d3515dc32ff7e7ef225cf36c5e6326af11653d6bb676551cbc60975379c`. Status: til faglig kontroll.

**escitalopram 10 mg til sertralin 50 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15–17 (23.11.2026–25.11.2026): Escitalopram peroralt: Seponert
    Fra dag 18 (fra 26.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg

**escitalopram 10 mg til sertralin 100 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15–17 (23.11.2026–25.11.2026): Escitalopram peroralt: Seponert
    Dag 18–31 (26.11.2026–09.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg

**escitalopram 20 mg til sertralin 50 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg

**escitalopram 20 mg til sertralin 100 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg

| Kasus | Utfall |
| --- | --- |
| escitalopram 15 mg, en dose regelen ikke gjelder for | stopper: Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 25, 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose sertralin 150 mg | stopper: Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt escitalopram i mange måneder eller lenger: ja | stopper: Regelen gjelder ikke: Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten har brukt escitalopram i mange måneder eller lenger: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt escitalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram | stopper: Må bekreftes før beregning: Toleransen vurderes før hver reduksjon og før seponeringen av escitalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra citalopram til sertralin, nedtrapping og kort utvasking

`bytte-citalopram-sertralin`, versjon 1, fingeravtrykk `dfaa681b4a25de97ba9a110650756e657008b8f2750d5487377e9eb3804b3471`. Status: til faglig kontroll.

**citalopram 20 mg til sertralin 50 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15–17 (23.11.2026–25.11.2026): Citalopram peroralt: Seponert
    Fra dag 18 (fra 26.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg

**citalopram 20 mg til sertralin 100 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15–17 (23.11.2026–25.11.2026): Citalopram peroralt: Seponert
    Dag 18–31 (26.11.2026–09.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg

**citalopram 40 mg til sertralin 50 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29–31 (07.12.2026–09.12.2026): Citalopram peroralt: Seponert
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg

**citalopram 40 mg til sertralin 100 mg** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29–31 (07.12.2026–09.12.2026): Citalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg

| Kasus | Utfall |
| --- | --- |
| citalopram 30 mg, en dose regelen ikke gjelder for | stopper: Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg). Startdosen 30 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 25, 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose sertralin 150 mg | stopper: Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt citalopram i mange måneder eller lenger: ja | stopper: Regelen gjelder ikke: Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten har brukt citalopram i mange måneder eller lenger: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt citalopram i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram | stopper: Må bekreftes før beregning: Toleransen vurderes før hver reduksjon og før seponeringen av citalopram: dagene er minstetider, og neste trinn tas først når eventuelle seponeringssymptomer er borte eller tålelige. I dagene uten SSRI og etter oppstart av sertralin følges seponeringssymptomer, forverring av depresjonen og bivirkninger. Responsen vurderes før økning og 2–4 uker etter at vedlikeholdsdosen er nådd. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

