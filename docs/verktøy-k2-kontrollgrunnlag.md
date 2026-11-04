# OUSFAR Verktøy – K2: kontrollgrunnlag for komplette antidepressivbytter

<!-- Laget av `npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport` fra reglene og FEST-uttrekket. Ikke rediger for hånd. -->

**Ingen av reglene er klinisk godkjent, og ingen av dem seponerer det gamle SSRI-et ennå:** sluttrinnet ved bytte (K2-2) er ikke avgjort, så hver plan stopper før en delplan (kasusene «sluttrinnet ikke avgjort»). Planene under er regnet på en kopi der sluttrinnet er simulert som laveste tablettdose – et alternativ som ikke er avgjort – hvert annet åpent OUSFAR-valg er simulert avklart uendret, og regelen er simulert godkjent, gjennom samme vei som verktøysiden, med preparatene i FEST-uttrekket 2026-11-03 (`src/data/verktoy/fest-antidepressivbytter.json`). Kopien lagres aldri og går aldri til verktøysiden. Fingeravtrykket ved hver regel er versjonen under kontroll; en virkelig godkjenning krever en ny versjon med kontrollørens avklaringer, og den får et nytt fingeravtrykk. Uten godkjenning sier verktøyet at faglig kontroll gjenstår. Det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) er en delplan, som verktøyet ikke viser; det gir «Komplett plan ikke tilgjengelig». Bakgrunn og kilder: `docs/verktøy-k2-antidepressivbytter.md`; reglene i sin helhet: `docs/verktøy-k2-antidepressivbytter-regler.md`.

Kasusene er syntetiske. 134 kasus, alle med forventet utfall.

## Spørsmål til den faglige kontrollen

| Nr. | Spørsmål | OUSFARs anbefaling |
| --- | --- | --- |
| K2-1 | Er 14 dager per halveringstrinn, med 14 dager på laveste dose før seponering, forsvarlig ved bytte? Fra laveste startdose varer nedtrappingen da 2 uker; RCPsych og Keks mfl. beskriver omtrent 4 uker. | Godta 14 dager som minstetid ved bytte (NICE åpner for raskere nedtrapping ved bytte), med toleransevurdering før hvert trinn; lang behandlingstid og tidligere plager er allerede utenfor. |
| K2-2 | Sluttrinnet ved bytte: kan det gamle SSRI-et seponeres fra laveste tablettdose (sertralin 25 mg, escitalopram 5 mg, citalopram 10 mg) etter 14 dager når det nye legemidlet er startet eller startes straks, eller trengs mindre trinn eller flytende formuleringer? Laveste dose i preparatomtalen er ingen seponeringsgrense, og ingen kilde i OUSFAR dokumenterer sluttrinnet ved bytte. | Ikke avgjort. Til det er avgjort faglig, seponerer ingen regel, og hver plan stopper uten delplan. Planene under «hvis sluttrinnet avgjøres som laveste tablettdose» viser bare hva det alternativet ville gitt. |
| K2-3 | Mirtazapin: er 15 mg fra dag 1 og økning til valgt vedlikeholdsdose 30 mg dagen etter siste SSRI-dose forsvarlig, og skal 45 mg holdes utenfor planen? | Ja; økningen følger Keks mfl. (økes når det første er seponert), og 45 mg er en responsstyrt økning etter preparatomtalen. |
| K2-4 | (Es)citalopram → sertralin: er et moderat bytte med tre hele dager uten SSRI riktig for dette omfanget (voksne 18–65 år, depresjon, kort behandlingstid, normal leverfunksjon)? Tre dager er omtrent 2,4 halveringstider for escitalopram og 2,0 for citalopram (preparatomtalene pkt. 5.2), innenfor Keks mfl.s 2–5 halveringstider og 2–4 dager. Direkte bytte og kryssnedtrapping er ikke vurdert. | Moderat bytte i dette omfanget, med vurdering av seponeringssymptomer og forverring i dagene uten SSRI; direkte bytte og kryssnedtrapping krever egne kilder og regler. |
| K2-5 | Sertralin: er 50 mg i minst 14 dager før valgt økning til 100 mg riktig, og skal høyere doser holdes utenfor planen? | Ja; preparatomtalen krever minst én uke, og 14 dager gir tid til å vurdere responsen. |
| K2-6 | Er avgrensningen dekkende: depresjon hos voksne 18–65 år, kort behandlingstid, ingen tidligere seponeringsplager, normal lever- og (for mirtazapin) nyrefunksjon, tabletter, bekreftet kontroll av serotonerg sammedisinering? | Ja for første leveranse; eldre, lang behandlingstid og andre former krever egne regler. |
| K2-7 | Er vurderingspunktene i planen riktige og nok: seponeringssymptomer og forverring før hver reduksjon og før seponeringen, toleransen før økningen av det nye legemidlet, og respons og bivirkninger fire uker etter oppstarten og etter hver doseendring av det? | Ja; fire uker er slutten av de 2–4 ukene preparatomtalene oppgir før respons kan ventes, og en tidligere kontroll kan legges til av forskriveren. |

## Reglene og planene

### Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering

`bytte-sertralin-mirtazapin`, versjon 1, fingeravtrykk `debeaab754dfd728ba59306d6ef921c3f446413f61d682c6aa0d87e988f07834`. Status: til faglig kontroll.

**sertralin 50 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**sertralin 50 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 15 (fra 23.11.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**sertralin 100 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**sertralin 100 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**sertralin 200 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg

**sertralin 200 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 71 (18.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**mirtazapin 45 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 71 (18.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

| Kasus | Utfall |
| --- | --- |
| sertralin 50 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| sertralin 100 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| sertralin 200 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| sertralin 75 mg, en dose regelen ikke gjelder for | stopper: Startdosen 75 mg er utenfor det regelen gjelder for (50, 100, 200 mg). Startdosen 75 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 50, 100 og 200 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 25, 50 og 100 mg, styrker (til) 15 og 30 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
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
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av sertralin, før økningen av mirtazapin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra sertralin til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning: verktøyet bruker fortsatt det godkjente startforløpet (kryssnedtrapping-sertralin-mirtazapin v10) og ber om formvalg for mirtazapin | formvalg |

### Bytte fra escitalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-escitalopram-mirtazapin`, versjon 1, fingeravtrykk `c2e2dc6116e01a65b60c7eb4a2cd91d1ccefff817f6447b1e6f87a0ca867080c`. Status: til faglig kontroll.

**escitalopram 10 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**escitalopram 10 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**escitalopram 20 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**escitalopram 20 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**mirtazapin 45 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

| Kasus | Utfall |
| --- | --- |
| escitalopram 10 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| escitalopram 20 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| escitalopram 15 mg, en dose regelen ikke gjelder for | stopper: Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 15 og 30 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
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
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av escitalopram, før økningen av mirtazapin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra citalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-citalopram-mirtazapin`, versjon 1, fingeravtrykk `27c1100cfb7fe25fc1a9f39860a627ca04ec8c62617e33746a53e71217c978b8`. Status: til faglig kontroll.

**citalopram 20 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**citalopram 20 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**citalopram 40 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**citalopram 40 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**mirtazapin 45 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder at dosen av mirtazapin så langt tåles.
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

| Kasus | Utfall |
| --- | --- |
| citalopram 20 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| citalopram 40 mg til mirtazapin 30 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| citalopram 30 mg, en dose regelen ikke gjelder for | stopper: Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg). Startdosen 30 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 15 og 30 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
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
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av citalopram, før økningen av mirtazapin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til mirtazapin mer risikofylt. |
| mirtazapin 30 mg avregistrert i FEST | stopper: mirtazapin (til): styrken 30 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra escitalopram til sertralin, nedtrapping og kort utvasking

`bytte-escitalopram-sertralin`, versjon 1, fingeravtrykk `216b06fb0580cb14d48b2ab7134e5a51f8d9ee87b911e78afbf35062ba46bc43`. Status: til faglig kontroll.

**escitalopram 10 mg til sertralin 50 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–17 (23.11.2026–25.11.2026): Escitalopram peroralt: Seponert
    Fra dag 18 (fra 26.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 10 mg til sertralin 100 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–17 (23.11.2026–25.11.2026): Escitalopram peroralt: Seponert
    Dag 18–31 (26.11.2026–09.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 32 (10.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 20 mg til sertralin 50 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 20 mg til sertralin 100 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 74 (21.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**sertralin 25 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Escitalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 74 (21.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

| Kasus | Utfall |
| --- | --- |
| escitalopram 10 mg til sertralin 100 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| escitalopram 20 mg til sertralin 100 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| escitalopram 15 mg, en dose regelen ikke gjelder for | stopper: Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
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
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av escitalopram, før økningen av sertralin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. I dagene uten SSRI følges seponeringssymptomer og forverring av depresjonen. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra citalopram til sertralin, nedtrapping og kort utvasking

`bytte-citalopram-sertralin`, versjon 1, fingeravtrykk `2b8cb1b487781872bfe87371dd54567c880ea0fc1d0b08e775ec766b9f7bd815`. Status: til faglig kontroll.

**citalopram 20 mg til sertralin 50 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–17 (23.11.2026–25.11.2026): Citalopram peroralt: Seponert
    Fra dag 18 (fra 26.11.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 20 mg til sertralin 100 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–17 (23.11.2026–25.11.2026): Citalopram peroralt: Seponert
    Dag 18–31 (26.11.2026–09.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 32 (10.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 40 mg til sertralin 50 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Citalopram peroralt: Seponert
    Fra dag 32 (fra 10.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 40 mg til sertralin 100 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Citalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 74 (21.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**sertralin 25 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–31 (07.12.2026–09.12.2026): Citalopram peroralt: Seponert
    Dag 32–45 (10.12.2026–23.12.2026): Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 46 (24.12.2026): Vurdering (Sertralin): Før endringen: Vurder at dosen av sertralin så langt tåles.
    Fra dag 46 (fra 24.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 60 (07.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 74 (21.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

| Kasus | Utfall |
| --- | --- |
| citalopram 20 mg til sertralin 100 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| citalopram 40 mg til sertralin 100 mg, sluttrinnet ikke avgjort, slik regelen er | stopper: Verdien fra.faser[0].avslutning.fra_hoyst_mg mangler og må avklares faglig. |
| citalopram 30 mg, en dose regelen ikke gjelder for | stopper: Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg). Startdosen 30 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
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
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av citalopram, før økningen av sertralin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. I dagene uten SSRI følges seponeringssymptomer og forverring av depresjonen. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

