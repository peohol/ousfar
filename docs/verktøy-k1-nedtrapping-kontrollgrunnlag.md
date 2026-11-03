<!-- Laget av `npm run verktoy:regler -- kontrollgrunnlag`; rediger ikke for hånd. -->
# K1: nedtrapping av antidepressiv til seponering – kontrollgrunnlag

**Ny versjon med avslutning for escitalopram, nortriptylin og amitriptylin.** Grunnlag for uavhengig faglig kontroll av K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`, laget 03.11.2026.

**Ingen regel er godkjent eller aktivert.** De tre reglene har fått versjon 13 med en avslutning: når nedtrappingen stopper på laveste døgndose i preparatomtalen eller lavere, gis siste dose et helt trinn, og legemidlet seponeres etter en eksplisitt vurdering, med en ny vurdering 28 dager etter siste dose. Stopper den over grensen, er planen fortsatt en delplan som sier hva den ikke dekker. Versjonene er til faglig kontroll; verktøyet tilbyr ingen beregning for dem (kasus K1-15–K1-17), og sperrene og synligheten bare for administratorer er uendret. For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel der de åpne valgene er avklart som foreslått og regelen er godkjent, begge simulert («Simulert kontrollør (bare i kontrollgrunnlaget, ingen godkjenning)»), gjennom den samme veien som verktøysiden og med de norske preparatene i FEST-uttrekket hentet 30.10.2026. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 7. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

| Regel | Versjon | Fingeravtrykk | Status i dag | Vurdert av kontrolløren | Tekniske hindringer for en godkjenning |
| --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | 13 | `b2af54866d179898436bcd1a1cdbcfb680b40cdf863ca4b2733d9c191c8dd330` | ikke ferdig kontrollert | **nei** | Regelen har åpne valg som må avklares faglig: plan.forlop[0].vurderinger[1].nar.dager (åpent forslag), fra.vurderinger.etter_seponering (åpent forslag), fra.faser[0].avslutning (åpent forslag). |
| `seponering-nortriptylin` | 13 | `fde153d79fb2b69744facfb93a21b9e8621b554ec66b56206047f6acc07eebc2` | ikke ferdig kontrollert | **nei** | Regelen har åpne valg som må avklares faglig: plan.forlop[0].vurderinger[1].nar.dager (åpent forslag), fra.vurderinger.etter_seponering (åpent forslag), fra.faser[0].avslutning (åpent forslag). |
| `seponering-escitalopram` | 13 | `b43485f1c2501760125daaae82aa6b5ba256d00d0caa99785b65a6f1b7a8b264` | ikke ferdig kontrollert | **nei** | Regelen har åpne valg som må avklares faglig: plan.forlop[0].vurderinger[1].nar.dager (åpent forslag), fra.vurderinger.etter_seponering (åpent forslag), fra.faser[0].avslutning (åpent forslag). |

## 2. Før en godkjenning kan registreres

- Kontrollen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over. De tre åpne valgene i hver regel (avslutningens grunnlag, oppfølgingstiden etter siste dose og grunnlaget for vurderingen etter seponering) må avklares av kontrolløren. Grensen for når seponering kan planlegges, er valgt av Peder som faglig beslutningstaker (beslutningskortet i K1-tråden 03.11.2026) og står som avklaring av den; den er ikke uavhengig kontrollert.
- Fagkontrollene 29. og 30.10.2026 godkjente ingen avslutning og ingen fast nedre grense (beslutning 2–4). K1 endrer dette med Peders valg; kontrolløren må ta stilling til konflikten (spørsmål K1.1), ikke bare til beregningene.
- Godkjenningen registreres i en egen PR, med avklaringene som en ny regelversjon og kontrollørens avgrensning. Endres en regel før det, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt.
- Tråd F har avsluttet kildefunnene i RCPsych «Stopping antidepressants» (`rcpsych-stopping`, sak 4 og 5, 03.11.2026); faktumet om små reduksjoner fra starten er rettet (`docs/verktøy-rettelse-langvarig.md`). Avslutningen bygger i tillegg på to nye utdrag fra samme kilde (`RCPSYCH.heltSlutt` og `RCPSYCH.eksempel1`).
- Sperrene for de kliniske verktøyene og synligheten bare for administratorer beholdes til verktøyene er klare for klinisk prøvebruk og Peder har godkjent åpning for vanlige brukere.

## 3. Spørsmål til kontrolløren

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| K1.1 | Kan seponering planlegges når nedtrappingen stopper på laveste døgndose preparatomtalen oppgir for voksne, eller lavere (escitalopram 5 mg, nortriptylin 25 mg, amitriptylin 10 mg)? Ingen kilde angir en dose som er lav nok, og RCPsych viser eksempler som går mye lavere med flytende form før seponering. | Ja, som en avgrenset første avslutning: grensen er en dose preparatomtalen selv bruker, seponeringen skjer først etter en eksplisitt vurdering av symptomer, og planen følger opp etter siste dose. Peder har valgt grensen; den erstatter beslutning 2–4 fra 29. og 30.10.2026 bare for disse tre reglene. |
| K1.2 | Siste trinn er seponering fra den siste dosen som kan gis: escitalopram dråper fra 3 mg, nortriptylin fra 20 mg (15 mg kan ikke gis med hele tabletter, og 10 mg er 50 % reduksjon). For nortriptylin er det siste trinnet dermed større enn de andre. Er det akseptabelt? | Ja for escitalopram dråper. For nortriptylin anbefales en særskilt vurdering: alternativet er et mellomtrinn på 10 mg, som krever en reduksjon på 50 %, som verktøyet i dag ikke tilbyr. Uten et slikt valg er seponering fra 20 mg etter en vurdering det som kan gis. |
| K1.3 | Siste dose gis et helt trinn (minst 28 dager) før seponering, og seponeringen forutsetter at forskriveren har funnet dosen tolerert. Er det akseptabelt som avslutningens grunnlag (åpent valg)? | Ja. Det er samme minstetid og samme symptomstyrte vurdering som ved hver reduksjon (NICE, RCPsych). |
| K1.4 | Vurderingen etter siste dose er satt til 28 dager etter siste dose, samme minstetid som et trinn (åpent valg). Kildene angir ingen bestemt oppfølgingstid. Er det akseptabelt? | Ja, som en minstetid for en planlagt vurdering; seponeringssymptomer kan komme senere, og teksten sier hva som gjøres ved funn. |
| K1.5 | K0-01 (escitalopram 10 mg tablett) kan ikke fullføres med tabletter. Fra 10 mg dråper er forløpet komplett (K1-01). Skal verktøyet tilby overgang fra tablett til dråper med samme døgndose? | Ikke i K1. Overgangen krever at preparatomtalen for dråpene registreres som kilde og at mg-ekvivalensen er dokumentert; det bør være en egen, avgrenset kontroll. |
| K1.6 | K0-02 (sertralin 100 mg) og K0-03 (amitriptylin 25 mg) kan ikke fullføres: med de norske styrkene og høyst 25 % per trinn stopper planene over grensen (sertralin etter 100 → 75 mg, amitriptylin på 20 mg). RCPsychs eksempel 1 bruker om lag 50 % per trinn. Skal et større siste trinn tillates under en grense? | Ikke i K1. Planene er delplaner som sier hva de ikke dekker. Et større siste trinn er en ny faglig beslutning som bør vurderes samlet for alle stoffene, med kildegrunnlaget. |
| K1.7 | Ved lang behandlingstid (10 % per trinn) når ingen plan grensen innenfor planhorisonten eller med preparatene, så de forblir delplaner. Er det akseptabelt? | Ja. Planen sier at den ikke er komplett og hvorfor, og en ny plan beregnes fra dosen pasienten bruker. |

## 4. Hva klinikeren kan gjøre, og hvilke forløp som er komplette

Med godkjenning ville verktøyet planlegge en nedtrapping helt til seponering, med vurdering før hver reduksjon og 28 dager etter siste dose, i disse tilfellene i det kliniske omfanget:

- Nortriptylin tablett 25, 50 og 150 mg ved kort behandlingstid: seponert fra dag 29, 113 og 253 (kasus K1-03–K1-05). Siste dose er 20 mg.
- Escitalopram dråper 10 og 20 mg ved kort behandlingstid: seponert fra dag 141 og 225 (kasus K1-01 og K1-02). Siste dose er 3 mg.

Disse forløpene er fortsatt delplaner, og planen sier hva den ikke dekker:

- Amitriptylin ved kort behandlingstid stopper på 20 mg, over grensen på 10 mg, fordi 15 mg ikke kan gis med hele tabletter (K1-06 og K1-07).
- Escitalopram tablett 20 mg gir én reduksjon til 15 mg (K1-08).
- Lang behandlingstid stopper over grensen for alle tre (K1-09 og K1-10).

Tabellen i avsnitt 8 viser hvert tilfelle i omfanget med planutfallet.

**K0-kasusene:**

| K0 | Situasjon | Resultat i K1 |
| --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort | Ikke komplett. Tablett 10 mg er utenfor omfanget (K1-11). Fra 10 mg dråper er forløpet komplett til seponering (K1-01); overgang fra tablett er spørsmål K1.5. |
| K0-02 | Sertralin 100 mg tablett, kort | Ikke en del av K1; regelen er uendret og ikke godkjent (K1-18). Spørsmål K1.6. |
| K0-03 | Amitriptylin 25 mg tablett, kort | Delplan: én reduksjon til 20 mg, over grensen på 10 mg (K1-06). Spørsmål K1.6. |

## 5. Hva som er endret fra versjon 12

- Nedtrappingsfasen har fått en avslutning med seponering fra høyst laveste døgndose i preparatomtalen (`fra_hoyst_mg`), lest fra regelens egen grense for lav dose, så ingen ny dose er skrevet inn. Peders valg står som avklaring av grensen.
- Forløpet har to vurderingspunkter: før hver reduksjon og før seponering (kildegrunnlag NICE og RCPsych), og 28 dager etter siste dose (åpent valg).
- Teksten om at planen ikke går til null er erstattet av teksten om avslutningen, og et nytt kildetro utsagn sier at nedtrappingen går helt til null, og at seponeringssymptomer kan komme uansett hvor lav dosen er.
- Regneeksemplene viser planene til seponering; escitalopram har et nytt eksempel der planen stopper over grensen (fra 20 mg ved lang behandlingstid).
- Klinisk omfang, trinnstørrelser, trinnlengder, spørsmål, unntak og bekreftelser er uendret. Den langsomme varianten for hvert stoff er uendret og har ingen avslutning.
- Planene for de andre nedtrappingsreglene er uendret; de godkjente reglene (vortioksetin v12, bupropion v5, agomelatin v1) har samme fingeravtrykk som før.

## 6. Kjente mangler

- Vurderingspunktet 28 dager etter siste dose står også i delplaner, uten dag, fordi planen ikke seponerer.

## 7. Reglene

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
- Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
  - Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 10 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Stopper nedtrappingen på 10 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og amitriptylin seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 10 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Stopper nedtrappingen på 10 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og amitriptylin seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 10 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
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
- Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
  - Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 25 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Stopper nedtrappingen på 25 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og nortriptylin seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 25 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Stopper nedtrappingen på 25 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og nortriptylin seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 25 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
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
- Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
  - Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Stopper nedtrappingen på 5 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 5 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Stopper nedtrappingen på 5 mg eller lavere (laveste døgndose preparatomtalen oppgir for voksne), fordi neste trinn ikke kan gis med norske preparater innenfor valgområdet eller planhorisonten er nådd, gis siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Stopper den over 5 mg, er planen en delplan: pasienten fortsetter med dosen til forskriveren har vurdert videre nedtrapping. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
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

## 8. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. I alle 49 valgene tilbys nøyaktig én dose, så hver startdose gir én plan. Radene er slik verktøysiden og kopien av planen ville vist dem; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

| Regel | Tilfelle | Planer | Reduksjoner | Valg forskriveren gjør | Siste dose | Planutfall |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-amitriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 1 | 1 | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 4 | 3 | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg). |
| `seponering-amitriptylin` | tablett, 75 mg, kort behandlingstid | 1 | 6 | 5 | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg). |
| `seponering-amitriptylin` | tablett, 100 mg, kort behandlingstid | 1 | 7 | 5 | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg). |
| `seponering-amitriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 9 | 7 | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg). |
| `seponering-amitriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 1 | 0 | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` | tablett, 75 mg, lang behandlingstid | 1 | 1 | 1 | 70 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-nortriptylin` | tablett, 25 mg, kort behandlingstid | 1 | 1 | 1 | 20 mg | Komplett plan til sluttmålet: Nortriptylin seponert fra dag 29. |
| `seponering-nortriptylin` | tablett, 50 mg, kort behandlingstid | 1 | 4 | 3 | 20 mg | Komplett plan til sluttmålet: Nortriptylin seponert fra dag 113. |
| `seponering-nortriptylin` | tablett, 150 mg, kort behandlingstid | 1 | 9 | 7 | 20 mg | Komplett plan til sluttmålet: Nortriptylin seponert fra dag 253. |
| `seponering-nortriptylin` | tablett, 50 mg, lang behandlingstid | 1 | 1 | 0 | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` | tablett, 20 mg, kort behandlingstid | 1 | 1 | 0 | 15 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, kort behandlingstid | 1 | 5 | 3 | 3 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 141. |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 8 | 5 | 3 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 225. |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, lang behandlingstid | 1 | 1 | 0 | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, lang behandlingstid | 1 | 10 | 8 | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 5 mg eller lavere (planen står på 9 mg). |

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

- Fra dag 1: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg).**

- Dag 1–28: Amitriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))
- Dag 29: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg
- Dag 57: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 85: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 85: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 3 (dag 57, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 4 (dag 85, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 5 (dag 113, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 6 (dag 141, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg).**

- Dag 1–28: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 29: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 57: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 85: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 113: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 141: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 141: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 100 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 4 (dag 85, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 5 (dag 113, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 6 (dag 141, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 7 (dag 169, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

*Et startforløp med revurdering, ikke en fullstendig plan: avslutningen vurderes individuelt.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg).**

- Dag 1–28: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 29: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 57: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 85: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 113: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 141: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 169: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
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

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 10 mg eller lavere (planen står på 20 mg).**

- Dag 1–28: Amitriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))
- Dag 29: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Amitriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))
- Dag 57: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Amitriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 85: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Amitriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 113: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 141: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Amitriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 169: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Amitriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 197: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 197–224: Amitriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 225: Vurdering (Amitriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 225: Amitriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

- Fra dag 1: Amitriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg

#### Seponering av amitriptylin, gjentatt prosentvis nedtrapping: tablett, 75 mg, lang behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 67,5 mg, fra 75 mg): 70 mg (−6,67 %). Valgt: 70 mg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

- Fra dag 1: Amitriptylin peroralt: 70 mg = 2 tabletter à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 67,5 mg; −6,67 %))

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 25 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Komplett plan til sluttmålet: Nortriptylin seponert fra dag 29.**

- Dag 1–28: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))
- Dag 29: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 29: Nortriptylin peroralt: Seponert
- Dag 56: Vurdering (Nortriptylin): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 37,5 mg, fra 50 mg): 40 mg (−20 %). Valgt: 40 mg.
- Kan velges for trinn 3 (dag 57, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 4 (dag 85, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Komplett plan til sluttmålet: Nortriptylin seponert fra dag 113.**

- Dag 1–28: Nortriptylin peroralt: 40 mg = 4 tabletter à 10 mg (valgt av forskriveren (beregnet 37,5 mg; −20 %))
- Dag 29: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg
- Dag 57: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 85: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))
- Dag 113: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 113: Nortriptylin peroralt: Seponert
- Dag 140: Vurdering (Nortriptylin): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 150 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 112,5 mg, fra 150 mg): 120 mg (−20 %). Valgt: 120 mg.
- Kan velges for trinn 2 (dag 29, beregnet 90 mg, fra 120 mg): 100 mg (−16,67 %). Valgt: 100 mg.
- Kan velges for trinn 4 (dag 85, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %). Valgt: 60 mg.
- Kan velges for trinn 6 (dag 141, beregnet 33,75 mg, fra 45 mg): 35 mg (−22,22 %). Valgt: 35 mg.
- Kan velges for trinn 7 (dag 169, beregnet 26,25 mg, fra 35 mg): 30 mg (−14,29 %). Valgt: 30 mg.
- Kan velges for trinn 8 (dag 197, beregnet 22,5 mg, fra 30 mg): 25 mg (−16,67 %). Valgt: 25 mg.
- Kan velges for trinn 9 (dag 225, beregnet 18,75 mg, fra 25 mg): 20 mg (−20 %). Valgt: 20 mg.

**Komplett plan til sluttmålet: Nortriptylin seponert fra dag 253.**

- Dag 1–28: Nortriptylin peroralt: 120 mg = 2 tabletter à 10 mg + 2 tabletter à 50 mg (valgt av forskriveren (beregnet 112,5 mg; −20 %))
- Dag 29: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Nortriptylin peroralt: 100 mg = 2 tabletter à 50 mg (valgt av forskriveren (beregnet 90 mg; −16,67 %))
- Dag 57: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Nortriptylin peroralt: 75 mg = 1 tablett à 25 mg + 1 tablett à 50 mg
- Dag 85: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Nortriptylin peroralt: 60 mg = 1 tablett à 10 mg + 1 tablett à 50 mg (valgt av forskriveren (beregnet 56,25 mg; −20 %))
- Dag 113: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg
- Dag 141: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Nortriptylin peroralt: 35 mg = 1 tablett à 10 mg + 1 tablett à 25 mg (valgt av forskriveren (beregnet 33,75 mg; −22,22 %))
- Dag 169: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Nortriptylin peroralt: 30 mg = 3 tabletter à 10 mg (valgt av forskriveren (beregnet 26,25 mg; −14,29 %))
- Dag 197: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 197–224: Nortriptylin peroralt: 25 mg = 1 tablett à 25 mg (valgt av forskriveren (beregnet 22,5 mg; −16,67 %))
- Dag 225: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 225–252: Nortriptylin peroralt: 20 mg = 2 tabletter à 10 mg (valgt av forskriveren (beregnet 18,75 mg; −20 %))
- Dag 253: Vurdering (Nortriptylin): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 253: Nortriptylin peroralt: Seponert
- Dag 280: Vurdering (Nortriptylin): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av nortriptylin, gjentatt prosentvis nedtrapping: tablett, 50 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

- Fra dag 1: Nortriptylin peroralt: 45 mg = 2 tabletter à 10 mg + 1 tablett à 25 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: tablett, 20 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

- Fra dag 1: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 141.**

- Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))
- Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg
- Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 141: Escitalopram peroralt: Seponert
- Dag 168: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 225.**

- Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg
- Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))
- Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg
- Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))
- Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))
- Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 225: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 225: Escitalopram peroralt: Seponert
- Dag 252: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

*Én mulig første reduksjon med revurdering, ikke en validert fullstendig nedtrappingsplan.*

**Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene.**

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

**Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 5 mg eller lavere (planen står på 9 mg).**

- Dag 1–28: Escitalopram peroralt: 18 mg = 18 dråper à 1 mg
- Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Escitalopram peroralt: 17 mg = 17 dråper à 1 mg (valgt av forskriveren (beregnet 16,2 mg; −5,56 %))
- Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Escitalopram peroralt: 16 mg = 16 dråper à 1 mg (valgt av forskriveren (beregnet 15,3 mg; −5,88 %))
- Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg (valgt av forskriveren (beregnet 14,4 mg; −6,25 %))
- Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Escitalopram peroralt: 14 mg = 14 dråper à 1 mg (valgt av forskriveren (beregnet 13,5 mg; −6,67 %))
- Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Escitalopram peroralt: 13 mg = 13 dråper à 1 mg (valgt av forskriveren (beregnet 12,6 mg; −7,14 %))
- Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,7 mg; −7,69 %))
- Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 197–224: Escitalopram peroralt: 11 mg = 11 dråper à 1 mg (valgt av forskriveren (beregnet 10,8 mg; −8,33 %))
- Dag 225: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 225–252: Escitalopram peroralt: 10 mg = 10 dråper à 1 mg (valgt av forskriveren (beregnet 9,9 mg; −9,09 %))
- Dag 253: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 253: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg

## 9. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden og kjøres i testene (`src/__tests__/verktoyk1.test.ts`). De viser de komplette forløpene, delplanene, grensene for omfanget, at verktøyet i dag ikke tilbyr beregning, at en godkjenning uten avklaring av de åpne valgene ikke gir plan, og at en endret grense etter godkjenningen stopper planen. Kolonnen K0 viser kasuset i leveranseplanen hvert kasus svarer på. Uten annen merknad er regelen den simulert avklarte og godkjente kopien, organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

| ID | K0 | Hva | Regel | Forventet | Resultat |
| --- | --- | --- | --- | --- | --- |
| K1-01 | K0-01 | escitalopram dråper 10 mg, kort behandlingstid; forskriveren velger 8 mg, 5 mg, 4 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 8 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 6 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 5 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 4 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 3 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-02 | – | escitalopram dråper 20 mg, kort behandlingstid; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 15 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 12 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 9 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 7 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 6 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 5 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 4 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 3 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-03 | – | nortriptylin 25 mg, kort behandlingstid; forskriveren velger 20 mg | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 20 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-04 | – | nortriptylin 50 mg, kort behandlingstid; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 40 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 30 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 25 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 20 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-05 | – | nortriptylin 150 mg, kort behandlingstid; forskriveren velger 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 120 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 100 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 75 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 60 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 45 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 35 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 30 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 25 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 20 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-06 | K0-03 | amitriptylin 25 mg, kort behandlingstid; forskriveren velger 20 mg | seponering-amitriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 20 mg. | som forventet |
| K1-07 | – | amitriptylin 50 mg, kort behandlingstid; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-amitriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 40 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 30 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 25 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 20 mg. | som forventet |
| K1-08 | – | escitalopram tablett 20 mg, kort behandlingstid | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 15 mg. | som forventet |
| K1-09 | – | escitalopram dråper 20 mg, lang behandlingstid; forskriveren velger 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 18 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 17 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 16 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 15 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 14 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 13 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 12 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 11 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 10 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 9 mg. | som forventet |
| K1-10 | – | nortriptylin 50 mg, lang behandlingstid | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 45 mg. | som forventet |
| K1-11 | K0-01 | escitalopram tablett 10 mg, kort behandlingstid (utenfor omfanget) | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-12 | – | nortriptylin 75 mg, kort behandlingstid (utenfor omfanget) | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 75 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-13 | – | escitalopram dråper 20 mg, tidligere seponeringssymptomer | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. | som forventet |
| K1-14 | – | nortriptylin 50 mg, kort, 10 mg avregistrert | seponering-nortriptylin (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: nortriptylin (fra): styrken 10 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert (utenfor omfanget). | som forventet |
| K1-15 | – | escitalopram slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-16 | – | nortriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-17 | K0-03 | amitriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-18 | K0-02 | sertralin 100 mg slik verktøyet er i dag (ikke en del av K1) | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| K1-19 | – | escitalopram dråper 20 mg, godkjent uten at de åpne valgene er avklart | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Regelen har åpne valg som må avklares faglig. | som forventet |
| K1-20 | – | escitalopram dråper 20 mg med grensen for seponering endret etter godkjenningen | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi; deretter grensen for seponering 5 → 6 mg) | Ingen plan: Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke). | som forventet |
