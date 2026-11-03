<!-- Laget av `npm run verktoy:regler -- kontrollgrunnlag`; rediger ikke for hånd. -->
# VDK-3, forslag 1: kontrollgrunnlag

**Kontroll av eksisterende nedtrappingsregler i eksisterende omfang.** Grunnlag for uavhengig faglig kontroll av forslag 1 i `docs/verktøy-vdk2-prioritering.md`, laget 03.11.2026.

**Ingen regel er godkjent eller aktivert, og denne PR-en endrer ingen regel.** Verktøyet tilbyr i dag ingen beregning for disse reglene (kasus F1-35, F1-36, F1-37). For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert godkjenning («Simulert kontrollør (bare i kontrollgrunnlaget, ingen godkjenning)»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet 30.10.2026. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

**Kontrollørens avgrensning 03.11.2026 (ChatGPT):** At dette kontrollgrunnlaget slås sammen, er ingen klinisk godkjenning av forslag 1 eller av spørsmålene 1.1–1.7. RCPsych og NICE støtter prinsippene om trinnvis og individuelt tilpasset nedtrapping, men ikke alene en automatisk godkjenning av hele beregnede kjeder, særlig de ti reduksjonene for escitalopram dråper over 252 dager. `rcpsych-stopping` må avklares som forutsatt, og hver regelversjon og hvert klinisk omfang må få en egen, eksplisitt og kildeforankret klinisk kontroll før aktivering.

## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 4. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

| Regel | Versjon | Fingeravtrykk | Status i dag | Vurdert av kontrolløren | Tekniske hindringer for en godkjenning |
| --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | 12 | `a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3` | kontrollert, ikke godkjent | ja, 03.11.2026 | ingen |
| `seponering-nortriptylin` | 12 | `300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c` | kontrollert, ikke godkjent | ja, 03.11.2026 | ingen |
| `seponering-escitalopram` | 12 | `7710be648e96682c1c8a35a8e4d9c4428109b294f29b63ae9401ef29b41bd3c1` | kontrollert, ikke godkjent | ja, 03.11.2026 | ingen |
| `seponering-escitalopram-langsom` | 8 | `4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095` | kontrollert, ikke godkjent | ja, 03.11.2026 | ingen |

## 2. Før en godkjenning kan registreres

- Tråd F har slått fast at delene av RCPsych «Stopping antidepressants» (`rcpsych-stopping`) reglene bygger på, tempo og risikogrupper, er uendret etter kildefunnet (`docs/verktøy-kildefunn-1-2.md`). Kontrollen kan gjøres nå, men en godkjenning bør først registreres etterpå.
- Godkjenningen registreres i en egen PR, for nøyaktig versjonen og fingeravtrykket i tabellen over og med kontrollørens avgrensning, slik den godkjente vortioksetinregelen. Registreringen (`godkjent` i `src/verktoy/regler/nedtrapping.ts`) gjelder i dag bare hovedreglene og viser til kontrollørens gjennomgang av f77e1a9; den må få navnet og datoen for den nye kontrollen og kunne dekke den langsomme varianten. Det er en teknisk endring som ikke endrer fingeravtrykkene.
- Ingen regel endres i denne PR-en, og ingen godkjenning registreres. Endres en regel før kontrollen, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt for den nye versjonen.
- Etter kontrollørens vurdering 03.11.2026 er faktumet fra RCPsych om små reduksjoner fra starten presisert (`RCPSYCH.langvarig`, `docs/verktøy-rettelse-langvarig.md`). De fire reglene viser til det og har derfor fått en ny versjon som bare skiller seg i dette faktumet fra versjonen som ble vurdert 31.10.2026. Kontrolløren har vurdert de nye versjonene som kontrollert, ikke godkjent, som før. Tabellen over gjelder de nye versjonene, og planene og kasusene er uendret.

## 3. Spørsmål til kontrolløren

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 1.1 | Gjelder en godkjenning hele kjeden av reduksjoner der forskriveren velger dosen som tilbys ved hvert trinn som ikke kan gis nøyaktig, eller bare første reduksjon? | Hele kjeden innenfor det foretrukne området. Hvert valg er eksplisitt og merket i planen, hver reduksjon krever ny vurdering av toleransen, og prinsippet er alt akseptert i P7-A. Ved hvert valg i omfanget tilbys nøyaktig én dose (avsnitt 5), så kjeden er bestemt av startdosen. |
| 1.2 | Er en delplan som stopper ved 20 mg (amitriptylin og nortriptylin), 3 mg (escitalopram dråper, kort behandlingstid) eller 9 mg (escitalopram dråper, lang behandlingstid) akseptabel når planen sier at avslutningen vurderes individuelt? | Ja. Det er samme utfall som for vortioksetin, planen går aldri til null, og undertittelen sier at den ikke er en fullstendig plan. |
| 1.3 | Skal amitriptylin og nortriptylin godkjennes for alle startdosene i omfanget, eller bare der første reduksjon kan gis nøyaktig? | Alle startdosene i omfanget. Der første reduksjon ikke kan gis nøyaktig, tilbys én dose innenfor 5–25 %, og planen vises først når forskriveren har valgt den. |
| 1.4 | Escitalopram dråper fra 20 mg ved lang behandlingstid gir ti reduksjoner over 252 dager ned til 9 mg, der åtte trinn på 1 mg er valgt av forskriveren (−5,56 % til −9,09 %). Skal godkjenningen ved lang behandlingstid gjelde hele kjeden, eller bare første reduksjon? | Hele kjeden. Hvert trinn er innenfor 5–10 % per trinn, som kontrolløren valgte for lang behandlingstid i P7-B, og hvert trinn har minst 28 dager og ny vurdering. |
| 1.5 | Skal den langsomme varianten for escitalopram (dråper 20 mg, én reduksjon til 19 mg, −5 %) godkjennes? Med både hovedregelen og den langsomme varianten godkjent må forskriveren velge strategien; hovedregelen stopper ved tidligere seponeringssymptomer, og den langsomme varianten krever at de er vurdert. | Ja, som én mulig reduksjon med revurdering, avgrenset slik som vortioksetin. Registreringen trenger den tekniske endringen i avsnitt 2. |
| 1.6 | Planene for amitriptylin og nortriptylin bruker bare hele tabletter, men noen trinn trenger flere tabletter (for eksempel 40 mg som 4 × 10 mg og 120 mg som 2 × 10 mg + 2 × 50 mg). Er det akseptabelt? | Ja. Det er hele tabletter i de kontrollerte styrkene uten deling, og sammensetningen står i planen. Verktøyet foreslår ingen pakning. |
| 1.7 | Skal godkjenningen registreres før tråd F har avklart kildefunnet i `rcpsych-stopping`? | Nei. Kontrollen kan gjøres nå, men registreringen bør vente til tråd F har slått fast at tempo og risikogrupper er uendret. |

## 4. Reglene

### Seponering av amitriptylin, gjentatt prosentvis nedtrapping

`seponering-amitriptylin`, versjon 12. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.
  - Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2 og 4.8)*
- Ved depresjon hos eldre over 65 år og ved hjerte- og karsykdom brukes doser over 100 mg med forsiktighet.
  - Depresjon hos eldre over 65 år og ved hjerte- og karsykdom: opptil 100–150 mg fordelt på to doser; doser over 100 mg brukes med forsiktighet. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2)*
- Ved nevropatisk smerte, kronisk spenningshodepine og migreneprofylakse er anbefalt dose 25–75 mg daglig.
  - Nevropatisk smerte, kronisk spenningshodepine og migreneprofylakse hos voksne: anbefalt 25–75 mg daglig; over 100 mg med forsiktighet, og hos eldre over 75 mg. *([dmp-sarotex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04328.pdf), pkt. 4.2)*
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

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 10 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Planen viser høyst 12 reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til forskriveren har vurdert videre nedtrapping, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst 12 reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis, med mindre forskriveren velger en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet. Der stopper planen av tekniske grunner: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping, og dosen er ikke nødvendigvis en sluttdose. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre_hjerte`): Er pasienten over 65 år eller har hjerte- og karsykdom? (dmp-sarotex pkt. 4.2)
- Må besvares (`smerte_migrene`): Brukes amitriptylin mot nevropatisk smerte, kronisk spenningshodepine eller migreneprofylakse? (dmp-sarotex pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-sarotex pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 25, 50, 75, 100 og 150 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 25 og 50 mg
- 50 og 75 mg, FEST-legemiddelform 53, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 10, 25 og 50 mg

### Seponering av nortriptylin, gjentatt prosentvis nedtrapping

`seponering-nortriptylin`, versjon 12. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.
  - Brå seponering etter lang tids bruk kan gi abstinenssymptomer. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.4)*
- Dosen økes om nødvendig til 150 mg daglig og bare i sjeldne tilfeller til 200 mg; hos eldre er vanlig vedlikeholdsdose 25–50 mg.
  - Voksne: vanligvis 50–75 mg daglig i starten (25–30 mg ved lettere tilfeller), opptil 150 mg og sjelden 200 mg. Eldre: start 25–30 mg, vedlikehold 25–50 mg. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*
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

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 25 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Planen viser høyst 12 reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til forskriveren har vurdert videre nedtrapping, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst 12 reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis, med mindre forskriveren velger en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet. Der stopper planen av tekniske grunner: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping, og dosen er ikke nødvendigvis en sluttdose. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*
- Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
  - Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*
- 200 mg er ikke et ordinært maksimum: over 150 mg krever en begrunnelse (substanskontrollen 30.10.2026).
  - Voksne: vanligvis 50–75 mg daglig i starten (25–30 mg ved lettere tilfeller), opptil 150 mg og sjelden 200 mg. Eldre: start 25–30 mg, vedlikehold 25–50 mg. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*
- Hos eldre krever over 50 mg en begrunnelse. Grensen er OUSFARs valg ut fra vedlikeholdsdosen i preparatomtalen, ikke en grense preparatomtalen setter, og «eldre» har ingen bestemt alder der. Den er til uavhengig kontroll.
  - Voksne: vanligvis 50–75 mg daglig i starten (25–30 mg ved lettere tilfeller), opptil 150 mg og sjelden 200 mg. Eldre: start 25–30 mg, vedlikehold 25–50 mg. *([dmp-noritren](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-04958.pdf), pkt. 4.2)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre`): Er pasienten eldre? Preparatomtalen angir ingen bestemt aldersgrense. (dmp-noritren pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-noritren pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 25, 50 og 150 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 10, 25 og 50 mg
- 50 mg, FEST-legemiddelform 53, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 10, 25 og 50 mg

### Seponering av escitalopram, gjentatt prosentvis nedtrapping

`seponering-escitalopram`, versjon 12. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Hos eldre over 65 år, ved mild eller moderat nedsatt leverfunksjon og hos kjente langsomme CYP2C19-metaboliserere er høyeste dose 10 mg daglig.
  - Eldre over 65 år: start 5 mg; kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Mild eller moderat nedsatt leverfunksjon: start 5 mg, kan økes til 10 mg daglig. Alvorlig nedsatt: forsiktighet og ekstra omhyggelig dosetitrering. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Kjent langsom CYP2C19-metaboliserer: start 5 mg, kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
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

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Planen viser høyst 12 reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til forskriveren har vurdert videre nedtrapping, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst 12 reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis, med mindre forskriveren velger en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet. Der stopper planen av tekniske grunner: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping, og dosen er ikke nødvendigvis en sluttdose. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*
- Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.
  - Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Unntak (`qt_forlengelse`): Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet. Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den, og nedtrappingen må planlegges individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7 og 8: kontraindikasjoner kan ikke overstyres med en generell begrunnelse:** Preparatomtalen oppgir forholdet som en kontraindikasjon; ordinær planlegging stoppes i stedet for å kreve en begrunnelse. (bygger på dmp-cipralex pkt. 4.3))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre`): Er pasienten over 65 år? (dmp-cipralex pkt. 4.2)
- Må besvares (`nedsatt_leverfunksjon`): Har pasienten nedsatt leverfunksjon? Et ja krever en skriftlig begrunnelse. (dmp-cipralex pkt. 4.2)
- Må besvares (`langsom_cyp2c19`): Er pasienten kjent langsom metaboliserer av CYP2C19? (dmp-cipralex pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-cipralex pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg
- 10 og 20 mg, FEST-legemiddelform 748, med nei på alle spørsmålene, styrker (fra) 1 mg
- 10 og 20 mg, FEST-legemiddelform 748, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 1 mg

### Seponering av escitalopram, langsom variant etter tidligere seponeringssymptomer

`seponering-escitalopram-langsom`, versjon 8. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Hos eldre over 65 år, ved mild eller moderat nedsatt leverfunksjon og hos kjente langsomme CYP2C19-metaboliserere er høyeste dose 10 mg daglig.
  - Eldre over 65 år: start 5 mg; kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Mild eller moderat nedsatt leverfunksjon: start 5 mg, kan økes til 10 mg daglig. Alvorlig nedsatt: forsiktighet og ekstra omhyggelig dosetitrering. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Kjent langsom CYP2C19-metaboliserer: start 5 mg, kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
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

- OUSFAR trapper ned med 5 % av aktuell dose (forskriveren kan velge 1–5 %), med minst 28 dager per trinn (forskriveren kan velge minst 28 dager, av tekniske grunner høyst 365 dager). Planen viser høyst 6 reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til forskriveren har vurdert videre nedtrapping, og avslutningen vurderes individuelt.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Varianten gjelder når et tidligere forsøk har gitt seponeringssymptomer: 1–5 % per trinn (standard 5 %) og minst 28 dager, og dosene må kunne gis. Forskriveren må vurdere og bekrefte at de tidligere symptomene virkelig var seponeringssymptomer.
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst 6 reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis, med mindre forskriveren velger en av de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet. Der stopper planen av tekniske grunner: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping, og dosen er ikke nødvendigvis en sluttdose. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*
- Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.
  - Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Må bekreftes (`tidligere_seponeringssymptomer_vurdert`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt symptomer som forskriveren har vurdert som seponeringssymptomer, ikke tilbakefall, bivirkninger eller andre årsaker. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** Den langsomme varianten gjelder bare når de tidligere symptomene virkelig var seponeringssymptomer; det kan ikke utledes av dosen. (bygger på nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Unntak (`qt_forlengelse`): Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet. Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den, og nedtrappingen må planlegges individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Substanskontrollen 30.10.2026, Beslutning 7 og 8: kontraindikasjoner kan ikke overstyres med en generell begrunnelse:** Preparatomtalen oppgir forholdet som en kontraindikasjon; ordinær planlegging stoppes i stedet for å kreve en begrunnelse. (bygger på dmp-cipralex pkt. 4.3))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre`): Er pasienten over 65 år? (dmp-cipralex pkt. 4.2)
- Må besvares (`nedsatt_leverfunksjon`): Har pasienten nedsatt leverfunksjon? Et ja krever en skriftlig begrunnelse. (dmp-cipralex pkt. 4.2)
- Må besvares (`langsom_cyp2c19`): Er pasienten kjent langsom metaboliserer av CYP2C19? (dmp-cipralex pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 7): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-cipralex pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 20 mg, FEST-legemiddelform 748, med nei på alle spørsmålene, styrker (fra) 1 mg

## 5. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. I alle 49 valgene tilbys nøyaktig én dose, så hver startdose gir én plan. Radene er slik verktøysiden og kopien av planen ville vist dem; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

| Regel | Tilfelle | Planer | Reduksjoner | Valg forskriveren gjør | Siste dose | Undertittel |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 1 | 1 | 20 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-amitriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 4 | 3 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-amitriptylin` | tablett, 75 mg, kort behandlingstid | 1 | 6 | 5 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-amitriptylin` | tablett, 100 mg, kort behandlingstid | 1 | 7 | 5 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-amitriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 9 | 7 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-amitriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 1 | 0 | 45 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-amitriptylin` | tablett, 75 mg, lang behandlingstid | 1 | 1 | 1 | 70 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-nortriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 1 | 1 | 20 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-nortriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 4 | 3 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-nortriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 9 | 7 | 20 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-nortriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 1 | 0 | 45 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-escitalopram` | tablett, 20 mg, kort behandlingstid | 1 | 1 | 0 | 15 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, kort behandlingstid | 1 | 5 | 3 | 3 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 8 | 5 | 3 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, lang behandlingstid | 1 | 1 | 0 | 9 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, lang behandlingstid | 1 | 10 | 8 | 9 mg | Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt. |
| `seponering-escitalopram-langsom` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 1 | 0 | 19 mg | Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan. |

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))
- Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg
- Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 3 (dag 57, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 4 (dag 85, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 5 (dag 113, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 6 (dag 141, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 29–56: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 57–84: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 85–112: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 113–140: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 141: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 100 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 4 (dag 85, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 5 (dag 113, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 6 (dag 141, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 7 (dag 169, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 29–56: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 57–84: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 85–112: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 113–140: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 141–168: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 169: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 150 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 112,5 mg, fra 150 mg): 120 mg (−20 %). Valgt: 120 mg.
- Kan velges for trinn 2 (dag 29, beregnet 90 mg, fra 120 mg): 100 mg (−16,67 %). Valgt: 100 mg.
- Kan velges for trinn 4 (dag 85, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 6 (dag 141, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 7 (dag 169, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 8 (dag 197, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 9 (dag 225, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Amitriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))
- Dag 29–56: Amitriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))
- Dag 57–84: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 85–112: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 113–140: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 141–168: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 169–196: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 197–224: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 225: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, lang behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 67,5 mg, fra 75 mg): 70 mg (−6,67 %). Valgt: 70 mg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Amitriptylin peroralt: 70 mg = 2 tabletter à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 67,5 mg; −6,67 %))

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))
- Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg
- Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 85: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 150 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 112,5 mg, fra 150 mg): 120 mg (−20 %). Valgt: 120 mg.
- Kan velges for trinn 2 (dag 29, beregnet 90 mg, fra 120 mg): 100 mg (−16,67 %). Valgt: 100 mg.
- Kan velges for trinn 4 (dag 85, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 6 (dag 141, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 7 (dag 169, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 8 (dag 197, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 9 (dag 225, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))
- Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))
- Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Fra dag 225: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: tablett, 20 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))
- Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg
- Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Fra dag 113: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg
- Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))
- Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg
- Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))
- Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))
- Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Fra dag 197: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, lang behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 17 mg (−5,56 %). Valgt: 17 mg.
- Kan velges for trinn 3 (dag 57, beregnet 15,3 mg, fra 17 mg): 16 mg (−5,88 %). Valgt: 16 mg.
- Kan velges for trinn 4 (dag 85, beregnet 14,4 mg, fra 16 mg): 15 mg (−6,25 %). Valgt: 15 mg.
- Kan velges for trinn 5 (dag 113, beregnet 13,5 mg, fra 15 mg): 14 mg (−6,67 %). Valgt: 14 mg.
- Kan velges for trinn 6 (dag 141, beregnet 12,6 mg, fra 14 mg): 13 mg (−7,14 %). Valgt: 13 mg.
- Kan velges for trinn 7 (dag 169, beregnet 11,7 mg, fra 13 mg): 12 mg (−7,69 %). Valgt: 12 mg.
- Kan velges for trinn 8 (dag 197, beregnet 10,8 mg, fra 12 mg): 11 mg (−8,33 %). Valgt: 11 mg.
- Kan velges for trinn 9 (dag 225, beregnet 9,9 mg, fra 11 mg): 10 mg (−9,09 %). Valgt: 10 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

- Dag 1–28: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg
- Dag 29–56: Escitalopram peroralt: 17 mg = 17 dråper à 1 mg (valgt av forskriveren (beregnet 16,2 mg; −5,56 %))
- Dag 57–84: Escitalopram peroralt: 16 mg = 16 dråper à 1 mg (valgt av forskriveren (beregnet 15,3 mg; −5,88 %))
- Dag 85–112: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg (valgt av forskriveren (beregnet 14,4 mg; −6,25 %))
- Dag 113–140: Escitalopram peroralt: 14 mg = 14 dråper à 1 mg (valgt av forskriveren (beregnet 13,5 mg; −6,67 %))
- Dag 141–168: Escitalopram peroralt: 13 mg = 13 dråper à 1 mg (valgt av forskriveren (beregnet 12,6 mg; −7,14 %))
- Dag 169–196: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,7 mg; −7,69 %))
- Dag 197–224: Escitalopram peroralt: 11 mg = 11 dråper à 1 mg (valgt av forskriveren (beregnet 10,8 mg; −8,33 %))
- Dag 225–252: Escitalopram peroralt: 10 mg = 10 dråper à 1 mg (valgt av forskriveren (beregnet 9,9 mg; −9,09 %))
- Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg

#### Seponering av escitalopram, langsom variant etter tidligere seponeringssymptomer: dråper, oppløsning, 20 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

- Fra dag 1: Escitalopram peroralt: 19 mg = 19 dråper à 1 mg

## 6. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (`src/__tests__/verktoyvdk3.test.ts`). De prøver grensene for omfanget: startdoser like utenfor, lang behandlingstid, pasientgruppe, unntak, endret trinnstørrelse, den langsomme varianten, en endret regel og endrede preparater. Kolonnen VDK-2 viser testkasuset i planen hvert kasus gjør til en test; F1-numrene erstatter K1-numrene. Uten annen merknad er regelen den simulert godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

| ID | VDK-2 | Hva | Regel | Forventet | Resultat |
| --- | --- | --- | --- | --- | --- |
| F1-01 | K1-01 | amitriptylin 50 mg, kort behandlingstid, før forskriveren har valgt | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Tilbyr 40 mg for neste trinn. | som forventet |
| F1-02 | K1-02 | amitriptylin 50 mg, kort, forskriveren velger dosen som tilbys ved hvert trinn; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 40 mg → 30 mg → 25 mg → 20 mg. | som forventet |
| F1-03 | – | amitriptylin 25 mg, kort, laveste startdose i omfanget; forskriveren velger 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 20 mg. | som forventet |
| F1-04 | – | amitriptylin 150 mg, kort, høyeste startdose i omfanget; forskriveren velger 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 120 mg → 100 mg → 75 mg → 60 mg → 45 mg → 35 mg → 30 mg → 25 mg → 20 mg. | som forventet |
| F1-05 | K1-03 | amitriptylin 50 mg, lang behandlingstid | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 45 mg. | som forventet |
| F1-06 | – | amitriptylin 75 mg, lang behandlingstid; forskriveren velger 70 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 70 mg. | som forventet |
| F1-07 | – | amitriptylin 100 mg, lang behandlingstid (utenfor omfanget) | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 100 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-08 | K1-06 | amitriptylin 60 mg, kort (startdose utenfor omfanget) | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 60 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for. | som forventet |
| F1-09 | K1-05 | amitriptylin 10 mg, kort (laveste styrke) | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-10 | – | amitriptylin 50 mg, kort, trinnstørrelsen endret til 20 % | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Reduksjon per trinn (% av aktuell dose) 20 % er ikke verdien som er kontrollert (25 %), heller ikke med begrunnelse (utenfor omfanget). | som forventet |
| F1-11 | – | amitriptylin 50 mg, eldre eller hjerte- og karsykdom | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 50 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-12 | – | amitriptylin 50 mg, tidligere seponeringssymptomer | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. | som forventet |
| F1-13 | K1-04 | amitriptylin 50 mg, den langsomme varianten (ikke i forslaget) | seponering-amitriptylin-langsom | Ingen plan: ikke et tilfelle godkjenningen kan gjelde for; ingen tilfeller er kontrollert (utenfor omfanget). | som forventet |
| F1-14 | – | amitriptylin 50 mg, organfunksjon og interaksjoner ikke vurdert | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert. | som forventet |
| F1-15 | K1-07 | nortriptylin 50 mg, kort, forskriveren velger ved hvert trinn; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 40 mg → 30 mg → 25 mg → 20 mg. | som forventet |
| F1-16 | – | nortriptylin 150 mg, kort; forskriveren velger 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 120 mg → 100 mg → 75 mg → 60 mg → 45 mg → 35 mg → 30 mg → 25 mg → 20 mg. | som forventet |
| F1-17 | – | nortriptylin 50 mg, lang behandlingstid | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 45 mg. | som forventet |
| F1-18 | K1-08 | nortriptylin 75 mg, kort (startdose utenfor omfanget) | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 75 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-19 | – | nortriptylin 50 mg, eldre | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 50 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-20 | K1-12 | escitalopram tablett 20 mg, kort | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 15 mg. | som forventet |
| F1-21 | K1-13 | escitalopram tablett 10 mg, kort (utenfor omfanget) | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-22 | – | escitalopram tablett 20 mg, lang behandlingstid (utenfor omfanget) | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 20 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-23 | K1-09 | escitalopram dråper 20 mg, kort, forskriveren velger ved hvert trinn; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 15 mg → 12 mg → 9 mg → 7 mg → 6 mg → 5 mg → 4 mg → 3 mg. | som forventet |
| F1-24 | – | escitalopram dråper 10 mg, kort, forskriveren velger ved hvert trinn; forskriveren velger 8 mg, 5 mg, 4 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 8 mg → 6 mg → 5 mg → 4 mg → 3 mg. | som forventet |
| F1-25 | K1-10 | escitalopram dråper 20 mg, lang behandlingstid, før forskriveren har valgt | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 18 mg. Tilbyr 17 mg for neste trinn. | som forventet |
| F1-26 | – | escitalopram dråper 20 mg, lang behandlingstid, forskriveren velger ved hvert trinn; forskriveren velger 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 18 mg → 17 mg → 16 mg → 15 mg → 14 mg → 13 mg → 12 mg → 11 mg → 10 mg → 9 mg. | som forventet |
| F1-27 | – | escitalopram dråper 10 mg, lang behandlingstid | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 9 mg. | som forventet |
| F1-28 | – | escitalopram dråper 15 mg, kort (startdose utenfor omfanget) | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-29 | K1-15 | escitalopram dråper 1 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 1 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-30 | K1-14 | escitalopram dråper 20 mg, 65 år eller eldre | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år) (utenfor omfanget). | som forventet |
| F1-31 | – | escitalopram dråper 20 mg, QT-forlengelse | seponering-escitalopram (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Regelen gjelder ikke: Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet. | som forventet |
| F1-32 | K1-11 | escitalopram dråper 20 mg, tidligere seponeringssymptomer (langsom variant) | seponering-escitalopram-langsom (simulert klinisk godkjenning av versjon 8, bare på en kopi) | Plan: 19 mg. | som forventet |
| F1-33 | – | escitalopram dråper 10 mg, langsom variant (utenfor omfanget) | seponering-escitalopram-langsom (simulert klinisk godkjenning av versjon 8, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-34 | – | escitalopram tablett 20 mg, langsom variant (utenfor omfanget) | seponering-escitalopram-langsom (simulert klinisk godkjenning av versjon 8, bare på en kopi) | Ingen plan: Startdosen 20 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| F1-35 | – | amitriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| F1-36 | – | nortriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| F1-37 | – | escitalopram slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| F1-38 | – | amitriptylin 100 mg med trinnlengden endret etter godkjenningen | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi; deretter trinnlengden 28 → 21 dager) | Ingen plan: Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke). | som forventet |
| F1-39 | – | amitriptylin 50 mg, kort, 10 mg avregistrert | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: amitriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert (utenfor omfanget). | som forventet |
| F1-40 | – | amitriptylin 50 mg, kort, ny styrke 20 mg i FEST; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Plan: 40 mg → 30 mg → 25 mg → 20 mg. | som forventet |
