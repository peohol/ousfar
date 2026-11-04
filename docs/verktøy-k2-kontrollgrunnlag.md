# OUSFAR Verktøy – K2: kontrollgrunnlag for komplette antidepressivbytter

<!-- Laget av `npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport` fra reglene og FEST-uttrekket. Ikke rediger for hånd. -->

**Ingen av reglene er klinisk godkjent.** Bytte fra escitalopram til sertralin, nedtrapping og direkte overgang og Bytte fra citalopram til sertralin, nedtrapping og direkte overgang: sluttrinnet er OUSFARs konkrete forslag til kontroll, der SSRI-et seponeres fra laveste tablettdose og sertralin 50 mg startes dagen etter (direkte overgang, K2-2 og K2-4). Sertralin ventes å holde SERT-hemmingen oppe, men seponeringssymptomer kan komme likevel; de følges tett den første uken, og planen justeres individuelt ved plager. Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering, Bytte fra escitalopram til mirtazapin, kryssnedtrapping til seponering, Bytte fra citalopram til mirtazapin, kryssnedtrapping til seponering: sluttrinnet er ikke avgjort, så hver plan stopper før en delplan (kasusene «sluttrinnet ikke avgjort»), og planene for dem er regnet med sluttrinnet simulert som laveste tablettdose – et alternativ som ikke er avgjort. Planene under er regnet på en kopi der hvert åpent OUSFAR-valg er simulert avklart uendret og regelen er simulert godkjent, gjennom samme vei som verktøysiden, med preparatene i FEST-uttrekket 2026-11-03 (`src/data/verktoy/fest-antidepressivbytter.json`). Kopien lagres aldri og går aldri til verktøysiden. Fingeravtrykket ved hver regel er versjonen under kontroll; en virkelig godkjenning krever en ny versjon med kontrollørens avklaringer, og den får et nytt fingeravtrykk. Uten godkjenning sier verktøyet at faglig kontroll gjenstår. Det godkjente startforløpet fra sertralin til mirtazapin (versjon 10) er en delplan, som verktøyet ikke viser; det gir «Komplett plan ikke tilgjengelig». Bakgrunn og kilder: `docs/verktøy-k2-antidepressivbytter.md`; reglene i sin helhet: `docs/verktøy-k2-antidepressivbytter-regler.md`.

Kasusene er syntetiske. 130 kasus, alle med forventet utfall.

## Spørsmål til den faglige kontrollen

| Nr. | Spørsmål | OUSFARs anbefaling |
| --- | --- | --- |
| K2-1 | Er 14 dager per halveringstrinn, med 14 dager på laveste dose før seponering, forsvarlig ved bytte? Fra laveste startdose varer nedtrappingen da 2 uker; RCPsych og Keks mfl. beskriver omtrent 4 uker. | Godta 14 dager som minstetid ved bytte (NICE åpner for raskere nedtrapping ved bytte), med toleransevurdering før hvert trinn; lang behandlingstid og tidligere plager er allerede utenfor. |
| K2-2 | Sluttrinnet ved bytte. (a) Escitalopram eller citalopram → sertralin: kan escitalopram 5 mg eller citalopram 10 mg seponeres etter 14 dager når sertralin 50 mg startes dagen etter? Siste trinn er 100 % av den ordinerte dosen. Sertralin 50 mg (minste vanlige dose, SERT-binding nær platået) ventes å holde SERT-hemmingen oppe, og det gamle elimineres over flere døgn, men det er ikke garantert at seponeringssymptomer eller forverring uteblir. (b) Til mirtazapin, som ikke hemmer SERT: kan SSRI-et seponeres fra laveste tablettdose, eller trengs mindre trinn eller flytende formuleringer? Laveste dose i preparatomtalen er ingen seponeringsgrense i seg selv. | (a) Ja, i det avgrensede omfanget, med vurdering før seponeringen, tett oppfølging av seponeringssymptomer og forverring den første uken og individuell justering ved plager; dette er OUSFARs forslag i reglene. (b) Ikke avgjort: til mirtazapin seponerer ingen regel, og hver plan stopper uten delplan; planene «sluttrinnet simulert som laveste tablettdose» viser bare hva det alternativet ville gitt. |
| K2-3 | Mirtazapin: er 15 mg fra dag 1 og økning til valgt vedlikeholdsdose 30 mg dagen etter siste SSRI-dose forsvarlig, og skal 45 mg holdes utenfor planen? | Ja; økningen følger Keks mfl. (økes når det første er seponert), og 45 mg er en responsstyrt økning etter preparatomtalen. |
| K2-4 | (Es)citalopram → sertralin: er nedtrapping til laveste tablettdose og så direkte overgang (sertralin 50 mg dagen etter siste dose, ingen dager uten SSRI) riktig for dette omfanget (voksne 18–65 år, depresjon, høyst 8 ukers sammenhengende behandling, ingen tidligere seponeringsplager, normal leverfunksjon)? Keks mfl.: utvasking er ikke nødvendig mellom disse SSRI-ene når byttet gjøres forsiktig og under nær oppfølging, og direkte bytte passer fra ett SSRI med kort halveringstid til et annet, men interaksjonsrisikoen er betydelig. Alternativene var moderat bytte (2–4 dager uten SSRI: lavest interaksjonsrisiko, men seponeringssymptomer i dagene uten SSRI) og kryssnedtrapping (to SSRI-er i terapeutisk dose samtidig). | Direkte overgang etter nedtrapping til laveste tablettdose, med vurdering av seponeringssymptomer, serotonerg belastning og forverring en uke etter overgangen; moderat bytte og kryssnedtrapping er ikke valgt. |
| K2-5 | Sertralin: er 50 mg i minst 14 dager før en valgt økning til 100 mg riktig, med en vurdering før økningen av effekt og behov, toleranse og seponeringssymptomer etter det gamle SSRI-et, og skal høyere doser holdes utenfor planen? | Ja; Zoloft-preparatomtalen krever minst én uke mellom doseendringer og sier at effekten vanligvis trenger lengre observasjonstid enn én uke. Vedlikeholdsdosen er forskriverens valg: er effekten tilstrekkelig, beholdes 50 mg, og ved dårlig toleranse eller seponeringssymptomer venter økningen. |
| K2-6 | Er avgrensningen dekkende: depresjon hos voksne 18–65 år, kort behandlingstid, ingen tidligere seponeringsplager, normal lever- og (for mirtazapin) nyrefunksjon, tabletter, bekreftet kontroll av serotonerg sammedisinering? Er 8 ukers sammenhengende bruk riktig som kontrollerbar grense for kort behandlingstid? RCPsych skiller bare mellom «noen uker» (nedtrapping over omtrent en måned) og «mange måneder eller år» (langsommere), uten eksakt grense. | Ja for første leveranse, med 8 uker som OUSFARs forslag til grense (øvre del av «noen uker»); lengre bruk, eldre og andre former stopper og krever egne regler. |
| K2-7 | Er vurderingspunktene i planen riktige og nok: seponeringssymptomer og forverring før hver reduksjon og før seponeringen, effekt, toleranse og seponeringssymptomer før økningen av det nye legemidlet, og respons og bivirkninger fire uker etter oppstarten og etter hver doseendring av det? | Ja; for mirtazapin er fire uker slutten av de 2–4 ukene preparatomtalen oppgir før respons kan ventes, og for sertralin er det OUSFARs valg innenfor preparatomtalens «lengre observasjonstid» enn én uke. En tidligere kontroll kan legges til av forskriveren. |

## Reglene og planene

### Bytte fra sertralin til mirtazapin, kryssnedtrapping til seponering

`bytte-sertralin-mirtazapin`, versjon 1, fingeravtrykk `5d2567c0166e7e86e1ae173d385134d18665f0e65c58dd71dcb51cf99f163deb`. Status: til faglig kontroll.

**sertralin 50 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Sertralin peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**sertralin 50 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Sertralin peroralt: 25 mg = 1 tablett à 25 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Sertralin): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før sertralin reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter sertralin.
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
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter sertralin.
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
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter sertralin.
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
    Dag 43 (21.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter sertralin.
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
| Pasienten har brukt sertralin sammenhengende i mer enn 8 uker: ja | stopper: Regelen gjelder ikke: Pasienten har brukt sertralin sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten har brukt sertralin sammenhengende i mer enn 8 uker: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt sertralin sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
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
| uten godkjenning: verktøyet bruker fortsatt det godkjente startforløpet (kryssnedtrapping-sertralin-mirtazapin) og ber om formvalg for mirtazapin | formvalg |

### Bytte fra escitalopram til mirtazapin, kryssnedtrapping til seponering

`bytte-escitalopram-mirtazapin`, versjon 1, fingeravtrykk `476022f5c15430fd3314d64a0294139a735c91bb9882da8da2d23f452d93b3f1`. Status: til faglig kontroll.

**escitalopram 10 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**escitalopram 10 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
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
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**mirtazapin 45 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
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
| Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker: ja | stopper: Regelen gjelder ikke: Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
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

`bytte-citalopram-mirtazapin`, versjon 1, fingeravtrykk `b62c61d16ce48090d836ef0b19c7af7de25b2366abc4e240d6affd69753b5103`. Status: til faglig kontroll.

**citalopram 20 mg til mirtazapin 15 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**citalopram 20 mg til mirtazapin 30 mg, sluttrinnet simulert som laveste tablettdose** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15 (23.11.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter citalopram.
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
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter citalopram.
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Mirtazapin peroralt: 30 mg = 1 tablett à 30 mg
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.
    Dag 57 (04.01.2027): Vurdering (Mirtazapin): Vurder respons og bivirkninger av mirtazapin.

**mirtazapin 45 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg; Mirtazapin peroralt: 15 mg = 1 tablett à 15 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29 (07.12.2026): Vurdering (Mirtazapin): Før endringen: Vurder effekten av mirtazapin så langt og om økningen fortsatt trengs, hvordan mirtazapin tåles, og om pasienten har seponeringssymptomer etter citalopram.
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
| Pasienten har brukt citalopram sammenhengende i mer enn 8 uker: ja | stopper: Regelen gjelder ikke: Pasienten har brukt citalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten har brukt citalopram sammenhengende i mer enn 8 uker: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt citalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
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

### Bytte fra escitalopram til sertralin, nedtrapping og direkte overgang

`bytte-escitalopram-sertralin`, versjon 1, fingeravtrykk `0a939ae60063f19709ee2f21211ac06ecdd11e9c797f6b4af67580de2f1a2bd8`. Status: til faglig kontroll.

**escitalopram 10 mg til sertralin 50 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 21 (29.11.2026): Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 10 mg til sertralin 100 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 21 (29.11.2026): Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin.
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 43 (21.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 20 mg til sertralin 50 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 29 (fra 07.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin.
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**escitalopram 20 mg til sertralin 100 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 71 (18.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**sertralin 25 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Escitalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Escitalopram peroralt: 5 mg = 1 tablett à 5 mg
    Dag 29 (07.12.2026): Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 71 (18.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

| Kasus | Utfall |
| --- | --- |
| escitalopram 15 mg, en dose regelen ikke gjelder for | stopper: Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose sertralin 150 mg | stopper: Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere escitalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker: ja | stopper: Regelen gjelder ikke: Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt escitalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for escitalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av escitalopram, en uke etter overgangen til sertralin, før en eventuell økning av sertralin (effekt, toleranse og seponeringssymptomer) og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Den første uken etter overgangen følges seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra escitalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

### Bytte fra citalopram til sertralin, nedtrapping og direkte overgang

`bytte-citalopram-sertralin`, versjon 1, fingeravtrykk `5bbe56471b9c6931f32e03afac929a12f675aa0b93129bad95f484de902f1f27`. Status: til faglig kontroll.

**citalopram 20 mg til sertralin 50 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 15 (fra 23.11.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 21 (29.11.2026): Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 20 mg til sertralin 100 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 21 (29.11.2026): Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin.
    Dag 29 (07.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter citalopram.
    Fra dag 29 (fra 07.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 43 (21.12.2026): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 40 mg til sertralin 50 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Fra dag 29 (fra 07.12.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin.
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**citalopram 40 mg til sertralin 100 mg, med direkte overgang (OUSFARs forslag)** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter citalopram.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 71 (18.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

**sertralin 25 mg, som planene ikke bruker, avregistrert i FEST** (startdato 09.11.2026):

    Dag 1–14 (09.11.2026–22.11.2026): Citalopram peroralt: 20 mg = 1 tablett à 20 mg
    Dag 15 (23.11.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 15–28 (23.11.2026–06.12.2026): Citalopram peroralt: 10 mg = 1 tablett à 10 mg
    Dag 29 (07.12.2026): Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.
    Dag 29–42 (07.12.2026–20.12.2026): Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg
    Dag 35 (13.12.2026): Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin.
    Dag 43 (21.12.2026): Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter citalopram.
    Fra dag 43 (fra 21.12.2026): Sertralin peroralt: 100 mg = 1 tablett à 100 mg
    Dag 57 (04.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.
    Dag 71 (18.01.2027): Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin.

| Kasus | Utfall |
| --- | --- |
| citalopram 30 mg, en dose regelen ikke gjelder for | stopper: Startdosen 30 mg er utenfor det regelen gjelder for (20, 40 mg). Startdosen 30 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 og 40 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 20 og 40 mg, styrker (til) 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| vedlikeholdsdose sertralin 150 mg | stopper: Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg). |
| ingen vedlikeholdsdose valgt | mangler: Måldosen må fylles inn som et tall større enn 0. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ja | stopper: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes: ubesvart | stopper: Må avklares før beregning (ukjent): Et tidligere forsøk på å trappe ned eller seponere citalopram eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn. |
| Pasienten har brukt citalopram sammenhengende i mer enn 8 uker: ja | stopper: Regelen gjelder ikke: Pasienten har brukt citalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten har brukt citalopram sammenhengende i mer enn 8 uker: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har brukt citalopram sammenhengende i mer enn 8 uker. Planen gjelder bare kort behandlingstid; etter lengre bruk anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping, og byttet planlegges individuelt. |
| Pasienten er over 65 år: ja | stopper: Regelen gjelder ikke: Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten er over 65 år: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ja | stopper: Regelen gjelder ikke: Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| Pasienten har nedsatt leverfunksjon: ubesvart | stopper: Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon. Preparatomtalene for citalopram og sertralin krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt. |
| ikke bekreftet: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon | stopper: Må bekreftes før beregning: Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon. |
| ikke bekreftet: Pasienten følges opp ved vurderingspunktene i planen | stopper: Må bekreftes før beregning: Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av citalopram, en uke etter overgangen til sertralin, før en eventuell økning av sertralin (effekt, toleranse og seponeringssymptomer) og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Den første uken etter overgangen følges seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen. |
| ikke bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler | stopper: Må bekreftes før beregning: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra citalopram til sertralin mer risikofylt. |
| sertralin 100 mg avregistrert i FEST | stopper: sertralin (til): styrken 100 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. |
| FEST eldre enn 48 timer | stopper: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| regelen endret etter kontrollen (annet fingeravtrykk) | stopper: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| uten godkjenning (slik appen er nå): faglig kontroll gjenstår | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |

