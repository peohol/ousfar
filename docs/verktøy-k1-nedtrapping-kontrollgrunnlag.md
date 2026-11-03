<!-- Laget av `npm run verktoy:regler -- kontrollgrunnlag`; rediger ikke for hånd. -->
# K1: nedtrapping av antidepressiv til seponering – kontrollgrunnlag

**Krav om komplett plan for escitalopram, nortriptylin, amitriptylin og sertralin.** Grunnlag for uavhengig faglig kontroll av K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`, ny runde etter kontrollen av PR #323 03.11.2026.

**Ingen regel er godkjent eller aktivert.** Kontrollen avviste den forrige versjonen: seponering fra laveste døgndose i preparatomtalen og delplaner med doser som klinisk produkt. Peder trakk samtidig tilbake valget av den grensen, og den brukes ikke. De fire reglene har nå versjon 13, som krever en komplett plan helt til seponering. Med de dokumenterte metodene for norske preparater når ingen av dem en sluttdose, og ingen kilde eller faglig beslutning gir i dag en sluttdose. Verktøyet viser derfor «Komplett plan ikke tilgjengelig» og hvorfor, ikke doser. Versjonene er til faglig kontroll; verktøyet tilbyr ingen beregning for dem (kasus K1-19–K1-22), og sperrene og synligheten bare for administratorer er uendret. For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert godkjenning («Simulert kontrollør (bare i kontrollgrunnlaget, ingen godkjenning)»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet 30.10.2026. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

**Kontrollørens avgrensning 03.11.2026 (ChatGPT):** Kontrollen av PR #323 avviste seponering fra laveste døgndose i preparatomtalen og delplaner som klinisk produkt. Der en klinisk forsvarlig komplett plan ikke finnes, skal verktøyet si «komplett plan ikke tilgjengelig». Nedtrappingen skal bruke dokumenterte små relative trinn og praktiske metoder (mikstur eller dråper, dokumentert deling, validert apotektilberedning, formbytte med kjent ekvivalens), ikke uvaliderte oppmålinger. Fysisk minste dose skal skilles fra individuell sluttdose, og tempoet skal styres av symptomer. Ingen av de fire reglene er godkjent.

## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 9. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

| Regel | Versjon | Fingeravtrykk | Status i dag | Vurdert av kontrolløren | Tekniske hindringer for en godkjenning |
| --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | 13 | `95d2593c91f0275ce07615f37fee78fa5320e04f052f95452da93304bf58c71d` | ikke ferdig kontrollert | **nei** | ingen |
| `seponering-nortriptylin` | 13 | `7a1fa2239530052f075d43562c55625e1fb59664c491e1a2b5352f0bce3ebbe3` | ikke ferdig kontrollert | **nei** | ingen |
| `seponering-escitalopram` | 13 | `5ff620a04bcfd389b755c8ea97dee44d0ca0964b0d40ee276f5116865d663d28` | ikke ferdig kontrollert | **nei** | ingen |
| `seponering-sertralin` | 13 | `c77c7f3688ac1464f33f992eb1e0b46249ae981d867c4cb955c9776683c9688f` | ikke ferdig kontrollert | **nei** | ingen |

## 2. Før en godkjenning kan registreres

- Kontrollen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over. Reglene har ingen åpne valg.
- Grensen «laveste døgndose i preparatomtalen» fra forrige runde er trukket tilbake av Peder og avvist i kontrollen; den finnes ikke i reglene.
- En komplett plan krever en sluttdose med kildegrunnlag eller en dokumentert faglig beslutning, og en metode som kan gi små nok trinn ned til den (spørsmål K1.9–K1.15). Før det er på plass, gir reglene ingen plan.
- Godkjenningen registreres i en egen PR, med kontrollørens avgrensning. Endres en regel før det, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt.
- Sperrene for de kliniske verktøyene og synligheten bare for administratorer beholdes til verktøyene er klare for klinisk prøvebruk og Peder har godkjent åpning for vanlige brukere.

## 3. Spørsmål til kontrolløren

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| K1.9 | Hvilken sluttdose (siste dose før seponering) er klinisk forsvarlig for hvert av de fire stoffene, og med hvilket kildegrunnlag? Ingen av kildene som er registrert (NICE NG222, RCPsych, preparatomtalene) angir en. Uten en sluttdose gir reglene ingen komplett plan. | Avgjøres faglig, stoff for stoff, med kilde eller dokumentert begrunnelse. Sluttdosen skal skilles fra den fysisk minste dosen (avsnittet om lave doser). OUSFAR foreslår ingen dose. |
| K1.10 | Escitalopram dråper (20 mg/ml, én dråpe er 1 mg) kommer ned til 3 mg med trinn på høyst 25 %. Videre er 3 → 2 mg en reduksjon på 33 % og 2 → 1 mg 50 %. Er hele dråper under 3 mg akseptable som trinn når tempoet styres av symptomer og dosen holdes lenger ved behov? | Avgjøres faglig. Ja ville gjøre escitalopram dråper til det første stoffet med en mulig komplett plan, med sluttdosen fra K1.9. |
| K1.11 | Overgang fra escitalopram tablett til dråper (K0-01, svaret på K1.5): hvilken dokumentasjon av eksakt ekvivalens kreves? Preparatomtalen for dråpene er ikke registrert som kilde i OUSFAR. | Preparatomtalen for dråpene registreres som kilde, og ekvivalensen hentes derfra. Står den ikke der, tilbys ingen overgang. |
| K1.12 | Nortriptylin finnes bare som tabletter på 10, 25 og 50 mg, og FEST oppgir ikke at de kan deles. Planene stopper på 20 mg, fordi 15 mg ikke kan gis og 10 mg er en reduksjon på 50 %. Finnes dokumentert deling av 10 mg-tabletten, eller en annen dokumentert metode? | Bare med dokumentasjon i preparatomtalen eller FEST. Uten den forblir nortriptylin «komplett plan ikke tilgjengelig». |
| K1.13 | Amitriptylin mikstur 10 mg/5 ml finnes bare med godkjenningsfritak. Ifølge preparatomtalen følger det med en dobbel måleskje på 2,5 og 5 ml, det vil si 5 og 10 mg. Fra 20 mg gir det 15 (25 %), 10 (33 %) og 5 mg (50 %). Skal preparater med godkjenningsfritak kunne inngå i en plan? | Ikke nå. Godkjenningsfritak krever en søknad for hver pasient, og måleskjeen gir ikke mindre trinn enn tablettene under 20 mg. |
| K1.14 | Sertralin konsentrat til mikstur (Zoloft 20 mg/ml) er markedsført og har en gradert pipette i lokket, men preparatomtalen oppgir ikke graderingen, og konsentratet skal fortynnes før bruk. Kan konsentratet brukes til små trinn når graderingen er dokumentert? | Ja, når graderingen og den minste dosen som kan måles, er dokumentert fra produsenten eller pakningsvedlegget. Til da brukes konsentratet ikke. |
| K1.15 | Skal verktøyet kunne bruke en validert apotektilberedning (for eksempel en mikstur med lav styrke), og hva kreves som dokumentasjon? | Bare en navngitt tilberedning med dokumentert styrke, holdbarhet og måleutstyr. Ingen er dokumentert i dag. |

## 4. Kontrollørens svar på K1.1–K1.8 (03.11.2026)

| # | Spørsmålet i forrige runde | Svar | Hva det betyr nå |
| --- | --- | --- | --- |
| K1.1 | Seponering fra laveste døgndose i preparatomtalen | Nei | Ingen fast nedre grense fra preparatomtalen. Grensen er fjernet. |
| K1.2 | Seponering fra den siste dosen som kan gis (nortriptylin 20 mg) | Nei | At neste dose ikke finnes, er ingen grunn til å seponere. |
| K1.3 | Siste dose et helt trinn før seponering | Ja, som standard, med varighet styrt av symptomer | Krav til en senere avslutning. |
| K1.4 | Vurdering 28 dager etter siste dose | Ett oppfølgingspunkt, ikke det eneste | Krav til en senere avslutning. |
| K1.5 | Overgang fra escitalopram tablett til dråper | Dokumenter eksakt ekvivalens | Spørsmål K1.11. |
| K1.6 | Større siste trinn (om lag 50 %) | Nei, ikke generelt | Ingen generelt større siste trinn. |
| K1.7 | Delplaner ved lang behandlingstid | Nei, delplaner er ikke et klinisk produkt | Reglene viser «komplett plan ikke tilgjengelig». |
| K1.8 | Sertralin med grensen 25 mg | Nei | Ingen automatisk grense for sertralin. |

## 5. Hva verktøyet viser, og hvorfor ingen plan er komplett

Med en godkjenning av versjon 13 viser verktøyet ingen doser for de fire stoffene. Det står «Komplett plan ikke tilgjengelig» og grunnen, og forskriveren kan fortsatt velge dose der et trinn ikke kan gis nøyaktig. Det gjelder hvert tilfelle i det kliniske omfanget (alle planer i omfanget og kasus K1-01–K1-13).

Ingen plan er komplett fordi ingen regel har en sluttdose (K1.9), og fordi de dokumenterte metodene stopper nedtrappingen med trinn på høyst 25 % (10 % ved lang behandlingstid) ved disse dosene:

- Escitalopram dråper: 3 mg ved kort og 9 mg ved lang behandlingstid. Escitalopram tablett 20 mg: 15 mg etter én reduksjon.
- Nortriptylin og amitriptylin: 20 mg ved kort behandlingstid; ved lang behandlingstid én reduksjon (50 → 45 mg, amitriptylin 75 → 70 mg).
- Sertralin: 75 mg (tablettene er 25, 50 og 100 mg; FEST oppgir bare deling i to).

Avsnittet «Hvor nedtrappingen stopper med dagens metoder» viser dette for hvert tilfelle, regnet med versjon 12 (som ga en delplan) under en simulert godkjenning. Den er bare et grunnlag for spørsmålene og vises ikke i appen.

**K0-kasusene:**

| K0 | Situasjon | Resultat i K1 |
| --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort | Ingen plan: tablett 10 mg er utenfor omfanget (K1-14). Fra 10 mg dråper: «komplett plan ikke tilgjengelig» (K1-01). Overgang til dråper: spørsmål K1.11. |
| K0-02 | Sertralin 100 mg tablett, kort | «Komplett plan ikke tilgjengelig» (K1-10). Spørsmål K1.9 og K1.14. |
| K0-03 | Amitriptylin 25 mg tablett, kort | «Komplett plan ikke tilgjengelig» (K1-08). Spørsmål K1.9 og K1.13. |

## 6. Lave doser med norske preparater, og kildene

| Stoff | Hva som finnes | Hva som mangler for små trinn | Kilde |
| --- | --- | --- | --- |
| Escitalopram | Tabletter 5, 10 og 20 mg (10 og 20 mg kan deles i to). Dråper 20 mg/ml, én dråpe er 1 mg. | Under 1 mg krever fortynning, som ikke er dokumentert. Trinnene under 3 mg er over 25 % (K1.10). | FEST-uttrekket; dmp-cipralex |
| Nortriptylin | Tabletter 10, 25 og 50 mg. | Deling er ikke oppgitt i FEST. Ingen flytende form (K1.12). | FEST-uttrekket; dmp-noritren |
| Amitriptylin | Tabletter 10, 25 og 50 mg. Mikstur 10 mg/5 ml og 50 mg/5 ml bare med godkjenningsfritak. | Deling er ikke oppgitt i FEST. Måleskjeen til miksturen på 10 mg/5 ml gir 2,5 og 5 ml, det vil si 5 og 10 mg (K1.13). | FEST-uttrekket; dmp-sarotex; preparatomtalen for Amitriptyline 10 mg/5 ml oral solution (Syri Limited, revidert 09.12.2025, pkt. 6.5) |
| Sertralin | Tabletter 25, 50 og 100 mg (noen 50 og 100 mg kan deles i to). Konsentrat til mikstur 20 mg/ml. | Pipetten i lokket er gradert, men graderingen er ikke oppgitt, og konsentratet skal fortynnes (K1.14). | FEST-uttrekket; dmp-zoloft; svensk preparatomtale for Zoloft konsentrat pkt. 6.5 og 6.6 |

Ingen tabeller fra Psychiatrienet er brukt eller konvertert. Ingen validert apotektilberedning er dokumentert (K1.15).

## 7. Hva som er endret fra versjon 12

- Forløpet krever en komplett plan (`krever_komplett`): når planen ikke når seponering, viser verktøyet «komplett plan ikke tilgjengelig» og grunnen i stedet for en delplan med doser.
- Et nytt utsagn om kravet, med NICE og RCPsych som grunnlag, og en usikkerhet om lave doser med norske preparater.
- Ingen avslutning med seponering, ingen grense og ingen vurderingspunkter er lagt til. Omfang, trinnstørrelser, trinnlengder, spørsmål, unntak, bekreftelser og regneeksempler er uendret.
- Det kliniske omfanget er ikke utvidet: nortriptylin 75 og 100 mg og escitalopram dråper 15 mg fra forrige runde er tatt ut igjen.
- Den langsomme varianten for hvert stoff og alle andre regler er uendret; de godkjente reglene har samme fingeravtrykk som før.

## 8. Hvor nedtrappingen stopper med dagens metoder

Hver startdose i det kliniske omfanget, regnet med versjonene forslaget bygger på og den samme simulerte godkjenningen, med forskriverens valg der et trinn ikke kan gis nøyaktig. Planene vises ikke i appen; tabellen viser bare hvor langt de dokumenterte metodene rekker.

| Regel | Tilfelle | Valg forskriveren gjør | Siste dose | Planutfall |
| --- | --- | --- | --- | --- |
| `seponering-amitriptylin` v12 | tablett, 25 mg, kort behandlingstid | 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` v12 | tablett, 50 mg, kort behandlingstid | 40 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 75 mg, kort behandlingstid | 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 100 mg, kort behandlingstid | 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 150 mg, kort behandlingstid | 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 50 mg, lang behandlingstid | – | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` v12 | tablett, 75 mg, lang behandlingstid | 70 mg | 70 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-nortriptylin` v12 | tablett, 25 mg, kort behandlingstid | 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-nortriptylin` v12 | tablett, 50 mg, kort behandlingstid | 40 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-nortriptylin` v12 | tablett, 150 mg, kort behandlingstid | 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-nortriptylin` v12 | tablett, 50 mg, lang behandlingstid | – | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | tablett, 20 mg, kort behandlingstid | – | 15 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 10 mg, kort behandlingstid | 8 mg, 5 mg, 4 mg | 3 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 20 mg, kort behandlingstid | 12 mg, 7 mg, 6 mg, 5 mg, 4 mg | 3 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 10 mg, lang behandlingstid | – | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 20 mg, lang behandlingstid | 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-sertralin` v12 | tablett, 100 mg, kort behandlingstid | – | 75 mg | Delplan, ikke en komplett plan. Ikke dekket: Sertralin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-sertralin` v12 | tablett, 200 mg, kort behandlingstid | 125 mg, 100 mg | 75 mg | Delplan, ikke en komplett plan. Ikke dekket: Sertralin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |

## 9. Reglene

### Seponering av amitriptylin, gjentatt prosentvis nedtrapping

`seponering-amitriptylin`, versjon 13. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

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
- Verktøyet viser bare en komplett plan helt til seponering. Når planen ikke kan nå seponering med trinn som kan gis, står det «Komplett plan ikke tilgjengelig» og hvorfor, ikke en delplan med doser. Trinnene skal bli mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

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

`seponering-nortriptylin`, versjon 13. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

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
- Verktøyet viser bare en komplett plan helt til seponering. Når planen ikke kan nå seponering med trinn som kan gis, står det «Komplett plan ikke tilgjengelig» og hvorfor, ikke en delplan med doser. Trinnene skal bli mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

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

`seponering-escitalopram`, versjon 13. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

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
- Verktøyet viser bare en komplett plan helt til seponering. Når planen ikke kan nå seponering med trinn som kan gis, står det «Komplett plan ikke tilgjengelig» og hvorfor, ikke en delplan med doser. Trinnene skal bli mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

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

### Seponering av sertralin, gjentatt prosentvis nedtrapping

`seponering-sertralin`, versjon 13. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
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
- Verktøyet viser bare en komplett plan helt til seponering. Når planen ikke kan nå seponering med trinn som kan gis, står det «Komplett plan ikke tilgjengelig» og hvorfor, ikke en delplan med doser. Trinnene skal bli mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-zoloft pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 100 og 200 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 25, 50 og 100 mg

## 10. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. I alle 51 valgene tilbys nøyaktig én dose, så hver startdose gir én plan. Radene er slik verktøysiden og kopien av planen ville vist dem; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

| Regel | Tilfelle | Planer | Reduksjoner | Valg forskriveren gjør | Siste dose | Undertittel |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 0 | 1 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 0 | 3 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 75 mg, kort behandlingstid | 1 | 0 | 5 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 100 mg, kort behandlingstid | 1 | 0 | 5 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 0 | 7 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-amitriptylin` | tablett, 75 mg, lang behandlingstid | 1 | 0 | 1 | – | ingen plan |
| `seponering-nortriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 0 | 1 | – | ingen plan |
| `seponering-nortriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 0 | 3 | – | ingen plan |
| `seponering-nortriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 0 | 7 | – | ingen plan |
| `seponering-nortriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram` | tablett, 20 mg, kort behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, kort behandlingstid | 1 | 0 | 3 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 0 | 5 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, lang behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, lang behandlingstid | 1 | 0 | 8 | – | ingen plan |
| `seponering-sertralin` | tablett, 100 mg, kort behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-sertralin` | tablett, 200 mg, kort behandlingstid | 1 | 0 | 2 | – | ingen plan |

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 3 (dag 57, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 4 (dag 85, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 5 (dag 113, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 6 (dag 141, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 100 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 4 (dag 85, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 5 (dag 113, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 6 (dag 141, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 7 (dag 169, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 150 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 112,5 mg, fra 150 mg): 120 mg (−20 %). Valgt: 120 mg.
- Kan velges for trinn 2 (dag 29, beregnet 90 mg, fra 120 mg): 100 mg (−16,67 %). Valgt: 100 mg.
- Kan velges for trinn 4 (dag 85, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 6 (dag 141, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 7 (dag 169, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 8 (dag 197, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 9 (dag 225, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, lang behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 67,5 mg, fra 75 mg): 70 mg (−6,67 %). Valgt: 70 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 150 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 112,5 mg, fra 150 mg): 120 mg (−20 %). Valgt: 120 mg.
- Kan velges for trinn 2 (dag 29, beregnet 90 mg, fra 120 mg): 100 mg (−16,67 %). Valgt: 100 mg.
- Kan velges for trinn 4 (dag 85, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 6 (dag 141, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 7 (dag 169, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 8 (dag 197, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 9 (dag 225, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: tablett, 20 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, lang behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 17 mg (−5,56 %). Valgt: 17 mg.
- Kan velges for trinn 3 (dag 57, beregnet 15,3 mg, fra 17 mg): 16 mg (−5,88 %). Valgt: 16 mg.
- Kan velges for trinn 4 (dag 85, beregnet 14,4 mg, fra 16 mg): 15 mg (−6,25 %). Valgt: 15 mg.
- Kan velges for trinn 5 (dag 113, beregnet 13,5 mg, fra 15 mg): 14 mg (−6,67 %). Valgt: 14 mg.
- Kan velges for trinn 6 (dag 141, beregnet 12,6 mg, fra 14 mg): 13 mg (−7,14 %). Valgt: 13 mg.
- Kan velges for trinn 7 (dag 169, beregnet 11,7 mg, fra 13 mg): 12 mg (−7,69 %). Valgt: 12 mg.
- Kan velges for trinn 8 (dag 197, beregnet 10,8 mg, fra 12 mg): 11 mg (−8,33 %). Valgt: 11 mg.
- Kan velges for trinn 9 (dag 225, beregnet 9,9 mg, fra 11 mg): 10 mg (−9,09 %). Valgt: 10 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

#### Seponering av sertralin, gjentatt prosentvis nedtrapping: tablett, 100 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for sertralin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.

#### Seponering av sertralin, gjentatt prosentvis nedtrapping: tablett, 200 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 112,5 mg, fra 150 mg): 125 mg (−16,67 %). Valgt: 125 mg.
- Kan velges for trinn 3 (dag 57, beregnet 93,75 mg, fra 125 mg): 100 mg (−20 %). Valgt: 100 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig for sertralin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt.

## 11. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (`src/__tests__/verktoyk1.test.ts`). De viser at ingen plan i omfanget gir doser uten å være komplett, grensene for omfanget, at verktøyet i dag ikke tilbyr beregning, og at en endret regel etter godkjenningen stopper planen. Kolonnen K0 viser kasuset i leveranseplanen hvert kasus svarer på. Uten annen merknad er regelen den simulert godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

| ID | K0 | Hva | Regel | Forventet | Resultat |
| --- | --- | --- | --- | --- | --- |
| K1-01 | K0-01 | escitalopram dråper 10 mg, kort behandlingstid; forskriveren velger 8 mg, 5 mg, 4 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-02 | – | escitalopram dråper 20 mg, kort behandlingstid; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-03 | – | escitalopram tablett 20 mg, kort behandlingstid | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-04 | – | nortriptylin 25 mg, kort behandlingstid; forskriveren velger 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-05 | – | nortriptylin 50 mg, kort behandlingstid; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-06 | – | nortriptylin 150 mg, kort behandlingstid; forskriveren velger 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-07 | – | amitriptylin 50 mg, kort, før forskriveren har valgt | seponering-amitriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Tilbyr 40 mg for neste trinn. | som forventet |
| K1-08 | K0-03 | amitriptylin 25 mg, kort behandlingstid; forskriveren velger 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-09 | – | amitriptylin 50 mg, kort behandlingstid; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-10 | K0-02 | sertralin tablett 100 mg, kort behandlingstid | seponering-sertralin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for sertralin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-11 | – | sertralin tablett 200 mg, kort behandlingstid; forskriveren velger 125 mg, 100 mg | seponering-sertralin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for sertralin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-12 | – | escitalopram dråper 20 mg, lang behandlingstid; forskriveren velger 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-13 | – | nortriptylin 50 mg, lang behandlingstid | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig for nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-14 | K0-01 | escitalopram tablett 10 mg, kort behandlingstid (utenfor omfanget) | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-15 | – | nortriptylin 75 mg, kort behandlingstid (omfanget er ikke utvidet) | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 75 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-16 | – | escitalopram dråper 15 mg, kort behandlingstid (omfanget er ikke utvidet) | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-17 | – | sertralin tablett 25 mg, kort behandlingstid (ingen grense ved 25 mg) | seponering-sertralin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 25 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-18 | – | escitalopram dråper 20 mg, tidligere seponeringssymptomer | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. | som forventet |
| K1-19 | – | escitalopram slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-20 | – | nortriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-21 | K0-03 | amitriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-22 | K0-02 | sertralin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-23 | – | nortriptylin 50 mg, lang behandlingstid, med kravet om komplett plan fjernet etter godkjenningen | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi; deretter kravet om komplett plan fjernet) | Ingen plan: Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke). | som forventet |
| K1-24 | – | nortriptylin 50 mg, kort, 10 mg avregistrert | seponering-nortriptylin (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: nortriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert (utenfor omfanget). | som forventet |
