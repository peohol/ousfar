<!-- Laget av `npm run verktoy:regler -- kontrollgrunnlag`; rediger ikke for hånd. -->
# B2: escitalopram med tabletter og dråper – kontrollgrunnlag

**Escitalopram fra tabletter (10 eller 20 mg): tabletter så lenge hele tabletter gir dosen i trinnet, så dråper mg for mg til seponering.** Grunnlag for uavhengig faglig kontroll av B2 i `docs/verktøy-brukervennlighet-2026-11.md` (§6) og `docs/verktøy-praktisk-dosering.md`. Versjon 14 er en egen regel (`seponering-escitalopram-tabletter-og-draper`) som bygger på den godkjente versjon 13 og erstatter den i det øyeblikket den selv er klinisk godkjent; til da gjaldt versjon 13 uendret.

**Versjon 14 er klinisk godkjent av kontrolløren 05.11.2026, bare i et snevert omfang, og har erstattet versjon 13 i appen.** Godkjenningen av versjon 13 gjaldt ikke versjon 14; den har sin egen godkjenning for nøyaktig versjonen og fingeravtrykket (avsnittet «Kontrollørens godkjenning av versjon 14»). Overgangen fra tabletter til dråper og dråpepreferansen var nye valg; kontrolløren avklarte dem (B2.1–B2.3) og svarte nei på tabletter og dråper i samme dose (B2.6) før den samlede kontrollen. Startdosene, trinnene, sluttdosen, seponeringen og oppfølgingen er de samme som i versjon 13. Aldersspørsmålet er rettet til «Er pasienten 65 år eller eldre?», så pasientgruppen er nøyaktig Peders avgrensning (under 65 år); det retter et avvik i versjon 13, som spør «Er pasienten over 65 år?» (B2.4).

Hva som er nytt for klinikeren: med versjon 13 må en pasient på 20 mg tabletter gå over til 15 dråper første dag, og verktøyet stopper hvis tablett er valgt (kasus K1-08 og K1-09). Med versjon 14 gis første trinn (15 mg) med hele tabletter, og planen går over til dråper fra andre trinn. Fra 10 mg tabletter kan ingen hel tablett gi 8 mg, så planen går over til dråper fra første trinn, som i versjon 13. Pasienter som allerede bruker dråper, får nøyaktig den samme planen som i versjon 13.

Kasusene går uten simulert godkjenning, gjennom verktøyets egen tilgjengelighet og den samme veien som verktøysiden, som aldri viser en delplan, med de norske preparatene i FEST-uttrekket hentet 30.10.2026. Bare kasusene som prøver en endret regel eller en godkjenning uten avklaring (B2-13, B2-14, B2-20 og B2-21), bruker en kopi, og B2-15 viser verktøyet slik det var før godkjenningen. Kopiene lagres ikke og brukes ikke av appen. Visningen og kopien på den virkelige verktøysiden er prøvd i `src/__tests__/verktoyb2side.test.tsx`. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 8. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

| Regel | Versjon | Fingeravtrykk | Status i dag | Vurdert av kontrolløren | Tekniske hindringer for en godkjenning |
| --- | --- | --- | --- | --- | --- |
| `seponering-escitalopram-tabletter-og-draper` | 14 | `01b2fb560a8defe0114f9552d619bc6bf15e27b07fa6352d6331d9beb500721f` | kontrollert og godkjent i oppgitt omfang | ja, godkjent 05.11.2026 | ingen |

## 2. Før en godkjenning kan registreres

- Godkjenningen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over, og bare det kliniske omfanget i avsnittet «Reglene». Avklaringene av overgangen (B2.1) og dråpepreferansen (B2.2) er registrert på valgene i regelen (Kontrollørens gjennomgang av 55d97d0 04.11.2026 (PR #330, kommentar 6632221212)); det endret fingeravtrykket, så den samlede kontrollen gjaldt det nye. Kontrolløren godkjente nøyaktig dette fingeravtrykket 05.11.2026; endres regelen, kreves en ny faglig kontroll.
- Peders avgjørelse på K1.9 (seponering fra 1 mg) gjelder bare når omfanget er uendret eller snevrere. Vurderingen står i B2.4; mener kontrolløren at omfanget er utvidet, må Peder spørres på nytt før en godkjenning.
- Versjon 13 trekkes i det øyeblikket versjon 14 er gyldig klinisk godkjent (`Regel.erstatter`), og det er den nå. Blir godkjenningen av versjon 14 ugyldig (for eksempel fordi regelen endres), gjelder versjon 13 igjen uendret.
- Sperrene for de kliniske verktøyene og synligheten bare for administratorer er uendret.
- Holdbarheten etter anbrudd for dråpene (8 uker, preparatomtalen pkt. 6.3) er oppgitt av kontrolløren 04.11.2026 og brukes bare i regnestykket for pakninger (B2.3 og B2.6); den er ikke en del av regelen.

## 3. Spørsmål til kontrolløren

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| B2.1 | Overgangen: En pasient som bruker tabletter, fortsetter med hele tabletter så lenge de gir dosen i trinnet nøyaktig, og går over til dråper med samme døgndose i mg (mg for mg, som K1.11) når tablettene ikke lenger gjør det; planen går aldri tilbake til tabletter, og hver dose gis med én form. Én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Tidspunktet for overgangen er OUSFARs valg: det sparer pasienten for mange dråper ved høye doser, uten å kombinere to preparater i samme dose. Grunnlaget for mg for mg er det samme som i K1.11 (preparatomtalen for Cipralex dråper pkt. 2 og 5.2). Er det riktig at overgangen skjer når hele tabletter ikke lenger gir dosen, og ikke allerede ved start? | **Kontrolløren 04.11.2026: ja.** Ja. Det sparer pasienten for mange dråper ved høye doser, krever ingen deling og blander ikke to preparater i samme dose (kasus B2-01 og B2-02). |
| B2.2 | Dråpepreferansen (B6): Blant dosene som følger kurven like godt, velges den som gir færrest dråper over 5 per administrasjon, så delte tabletter, så færrest tabletter eller målinger og færrest styrker. 5 dråper er en preferanse for enkel administrasjon (B6), ikke en grense og ikke en kilde: flere dråper gis når ingenting enklere gir dosen. Verdien er OUSFARs valg og avgjøres i kontrollen. Er 5 riktig verdi? | **Kontrolløren 04.11.2026: ja, som praktisk preferanse.** Ja, som preferanse. Den avgjør bare om 15 mg gis som tabletter eller 15 dråper (kasus B2-01 og B2-16); 12 dråper og færre gis med dråper fordi ingen hel tablett gir dosen. |
| B2.3 | Første trinn fra 20 mg er 15 mg i 28 dager. Med tabletter er det én tablett à 10 mg og én à 5 mg daglig (to styrker, ingen deling): én pakning à 28 stk av hver styrke, i alt 2. Med dråper er det 15 dråper daglig, 420 dråper eller 21 ml, altså 2 flasker à 15 ml (300 dråper). Flaskene er regnet dag for dag: en åpnet flaske brukes til den er tom eller 8 uker etter åpning (holdbarheten etter anbrudd, preparatomtalen pkt. 6.3), og resten kastes. Hele forløpet fra 20 mg trenger da med tabletter først 2 tablettpakninger og 6 flasker (1372 dråper fra dag 29), i alt 8 pakninger, og med dråper fra start 8 flasker (1792 dråper). Uten holdbarheten ville det vært 5 og 6 flasker: ved de laveste dosene kastes det meste av hver flaske. Antallet pakninger avgjør altså ikke valget; tablettene sparer pasienten for å telle 15 dråper daglig i 28 dager. Er tablettene det mest praktiske for pasienten i første trinn? | **Kontrolløren 04.11.2026: ja, som praktisk valg.** Ja, som en praktisk preferanse uten klinisk kilde (B6). Det avgjørende er to hele tabletter mot 15 dråper per administrasjon: pakningene er like mange i første trinn (2 mot 2) og i hele forløpet (8 mot 8). Velger kontrolløren dråper fra start, kan dråpepreferansen tas ut, og regelen gir da planen i versjon 13 for alle (kasus B2-16). |
| B2.4 | Omfanget for Peders avgjørelse på K1.9 («Gjelder voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager. Gir første komplette nedtrapping (fra 10 eller 20 mg), etter ChatGPTs kontroll av resten.»): versjon 14 har de samme startdosene (10 og 20 mg), de samme trinnene fra 12 mg og den samme sluttdosen med dråper (1 mg → 0), og pasientgruppen er voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager, og nei på nedsatt leverfunksjon og langsom CYP2C19-metabolisme. Versjon 13 spør «Er pasienten over 65 år?», så en pasient på nøyaktig 65 år kan svare nei og få planen, selv om avgjørelsen gjelder under 65 år. Versjon 14 spør «Er pasienten 65 år eller eldre?», så 65 år regnes med og stopper (kasus B2-17–B2-19 ved 64, 65 og 66 år); det retter avviket i versjon 13 og gjør omfanget snevrere, aldri bredere. Tablettpasienter var allerede med i versjon 13 gjennom overgangen mg for mg ved start (K1.11), og ellers er bare tidspunktet for overgangen endret. Er omfanget uendret eller snevrere, slik at avgjørelsen kan brukes uten å spørre Peder på nytt? | **Kontrolløren 04.11.2026: ja.** Ja, snevrere på ett punkt og ellers uendret. Ingen ny pasientgruppe, startdose eller sluttdose; 65 år er nå utenfor, som avgjørelsen sier, og alle utenfor får et sikkert stopp (kasus B2-05–B2-09 og B2-17–B2-19). |
| B2.5 | Erstatningen: versjon 14 er en egen regel som erstatter versjon 13 (`seponering-escitalopram`) når den er godkjent, så det aldri finnes to godkjente regler for samme nedtrapping. Den gir dråpepasienter nøyaktig den samme planen som versjon 13 (kasus B2-03 og B2-04). Er det riktig at versjon 13 trekkes når versjon 14 godkjennes? | **Kontrolløren 04.11.2026: ja.** Ja. Versjon 14 gir det samme som versjon 13 for alle tilfellene versjon 13 er godkjent for, og i tillegg en komplett plan fra tabletter. |
| B2.6 | Tabletter og dråper i samme dose: versjon 14 gir hver dose med én form, så fra 20 mg tabletter gis 12 dråper daglig i andre trinn og 9, 7 og 6 dråper i de neste. Med begge formene i samme dose i overgangen (`samtidig`, som motoren alt støtter) blir 12 mg 1 tablett à 10 mg + 2 dråper à 1 mg, 9 mg 1 tablett à 5 mg + 4 dråper à 1 mg, 7 mg 1 tablett à 5 mg + 2 dråper à 1 mg og 6 mg 1 tablett à 5 mg + 1 dråpe à 1 mg, så over til dråper alene fra 5 mg; planen går fortsatt aldri tilbake. Det gir høyst 5 dråper per administrasjon gjennom hele forløpet, mot 12, men to preparater i samme dose i fire trinn og flere pakninger: 56 tabletter à 10 mg, 112 à 5 mg og 5 flasker (i alt 11 pakninger: tablettpakninger à 28 stk og flasker), mot 8 i versjon 14. Fra 10 mg blir 8 mg 1 tablett à 5 mg + 3 dråper à 1 mg og 6 mg 1 tablett à 5 mg + 1 dråpe à 1 mg: høyst 5 dråper mot 8, 6 pakninger mot 4. Kasus B2-20 og B2-21 viser planene på en kopi; de er ikke i forslaget. Skal versjon 14 gi tabletter og dråper i samme dose? | **Kontrolløren 04.11.2026: nei, ikke som standard i versjon 14.** Kontrollørens avveining. OUSFARs forslag er ja, dersom kontrolløren godtar to preparater i samme dose: det følger dråpepreferansen (B6) i hele forløpet uten deling og uten oppmåling, og bioekvivalensen mg for mg (pkt. 5.2) er den samme som for overgangen i B2.1. Prisen er flere pakninger og to preparater å holde orden på i fire trinn. Ja endrer regelen (`samtidig` på overgangen), så versjon 14 får et nytt fingeravtrykk og et nytt kontrollgrunnlag; nei lar versjon 14 stå som den er. |

## 4. Kontrollørens avklaring av B2.1–B2.6

Kontrollørens gjennomgang av 55d97d0 04.11.2026 (PR #330, kommentar 6632221212) svarte på spørsmålene i avsnitt 3. Avklaringene av B2.1 og B2.2 er registrert på valgene i regelen (rollen uavhengig kontrollør, regelversjon 14). De er ingen klinisk godkjenning av regelen: den kommer først etter den samlede kontrollen av nøyaktig versjonen og fingeravtrykket i tabellen. Svaret nei på B2.6 betyr at versjon 14 gir hver dose med én form; tabletter og dråper i samme dose kan eventuelt vurderes senere som et valgfritt alternativ med egen versjon og kontroll. Den detaljerte kurven med 28 dager per trinn er et startforslag med minstetider, ikke en universelt optimal plan.

- Kontrollørens gjennomgang av 55d97d0 04.11.2026 (B2.1): ja. Fra 20 mg tabletter er 15 mg som hele tabletter à 10 og 5 mg og så dråper fra neste trinn en rasjonell administrasjonsstrategi; fra 10 mg tabletter går første reduksjon til dråper. Overgangen mg for mg mellom Cipralex tabletter og dråper har farmakokinetisk grunnlag, uten utvaskingsperiode.
- Kontrollørens gjennomgang av 55d97d0 04.11.2026 (B2.2 og B2.3): ja, som praktisk preferanse og ikke som klinisk terskel. 5 dråper er en myk prioritering mellom ellers lovlige doser og ikke et tak på antall dråper; verdien er OUSFARs valg uten kildepåstand. To hele tabletter i første trinn på 15 mg er et praktisk valg for å slippe å telle 15 dråper, ikke en dokumentert klinisk fordel.

## 5. Kontrollørens godkjenning av versjon 14

Kontrollørens uavhengige kliniske substanskontroll av cd28050 05.11.2026 (PR #330, kommentar 6665304397) kom til en positiv, uavhengig faglig konklusjon for nøyaktig versjon 14 og godkjente den klinisk. Godkjenningen er registrert i regelen som siste steg i historikken, med rollen uavhengig kontrollør, regelversjon 14 og fingeravtrykket `01b2fb560a8defe0114f9552d619bc6bf15e27b07fa6352d6331d9beb500721f`. Verktøyet gir planen bare så lenge regelen har nøyaktig dette fingeravtrykket, og versjon 13 er trukket fra appen i samme øyeblikk.

- Avgrensning: start på 10 eller 20 mg escitalopram hos voksne under 65 år med kort behandlingstid, uten tidligere seponeringsplager og uten de øvrige eksklusjonsforholdene i regelen. Fra 20 mg tabletter gis første reduksjon til 15 mg som hele 10 + 5 mg tabletter og deretter 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg som dråper før null; fra 10 mg tabletter brukes dråper fra første reduksjon (8 → 6 → 5 → 4 → 3 → 2 → 1 mg før null); dråpepasientenes doseforløp er uendret fra godkjent versjon 13. Overgang mg for mg, fem dråper som myk praktisk preferanse (ikke terskel) og ingen tabletter og dråper samtidig i én dose er akseptert. Trinntidene er individuelle minstetider og startforslag, ikke en dokumentert optimal standard. Godkjenningen gjelder den eksakte regelversjonen, ikke vilkårlige startdoser, lengre behandling eller tilsvarende nedtrappingsstrategier.
- Kontrolløren kontrollerte de 21 positive og negative kasusene, planene i omfanget, testen av den atomiske erstatningen og FEST-uttrekket fra 30.10.2026, og de norske preparatopplysningene for Cipralex (1 mg per dråpe, 15 ml per flaske, åtte ukers holdbarhet etter anbrudd) og NICE NG222 anbefaling 1.4.16–1.4.17.
- Kasusene B2-01–B2-04 viser de komplette planene uten simulert godkjenning; de negative kasusene viser at alle utenfor omfanget stopper uten doser.

## 6. Hva som er endret fra versjon 13

- Egen regel `seponering-escitalopram-tabletter-og-draper` med `erstatter: ['seponering-escitalopram']`: versjon 13 gjaldt til versjon 14 ble godkjent 05.11.2026.
- Formovergang tablett (FEST-form 53) → dråper (FEST-form 748) i forløpet, aldri tilbake, én form per dose (B2.1).
- Praktisk dosering med høyst 5 dråper per administrasjon som preferanse (B2.2, B6).
- Klinisk omfang: tilfellet «tablett 20 mg» (som aldri ga en komplett plan) er erstattet av «tabletter så dråper, 10 og 20 mg», med styrkene 5, 10, 20 mg (form 53) og 1 mg (form 748). Tilfellene med dråper er uendret.
- Fortolkningen: teksten om overgangen fra tabletter til dråper sier nå at tablettene brukes så lenge de gir dosen.
- Aldersspørsmålet er rettet fra «Er pasienten over 65 år?» til «Er pasienten 65 år eller eldre?» (B2.4): Peders avgjørelse på K1.9 gjelder voksne under 65 år, men versjon 13 spør «Er pasienten over 65 år?», så en pasient på nøyaktig 65 år kan svare nei og få en plan utenfor avgrensningen. Versjon 14 spør om 65 år eller eldre, så 65 år regnes med og stopper (ChatGPTs kontroll av planen for brukervennlighet, 04.11.2026). Svaret ja stopper som før; versjon 13, med avviket, er trukket nå som versjon 14 er godkjent.
- Alt annet er uendret: trinnene, valgområdene, det minste trinnet, sluttdosen, seponeringen, vurderingspunktene, de andre spørsmålene, unntakene og regneeksemplene.

## 7. Hvilke forløp som er komplette

| Tilfelle | Versjon 13 (til 05.11.2026) | Versjon 14 | Kasus |
| --- | --- | --- | --- |
| Tablett 20 mg, kort behandlingstid | «Komplett plan ikke tilgjengelig» (stopper på 15 mg tabletter); med dråper valgt: 15 dråper fra dag 1 | Komplett: 15 mg som tabletter (10 + 5 mg), så dråper 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 281 | B2-01, B2-15 |
| Tablett 10 mg, kort behandlingstid | Utenfor omfanget; med dråper valgt: komplett | Komplett, dråper fra første trinn: 8 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 197 | B2-02 (K0-01) |
| Dråper 20 og 10 mg, kort behandlingstid | Komplett | Nøyaktig den samme planen | B2-03, B2-04 |
| Lang behandlingstid, andre startdoser, eldre enn 65 år, tidligere seponeringsplager | Stopp | Stopp | B2-05–B2-09 |
| Nøyaktig 65 år | Plan, fordi 65 år svarer nei på «over 65 år» (avviket fra K1.9) | Stopp | B2-18, B2-19 |
| 64 år | Komplett | Komplett | B2-17 |

## 8. Reglene

### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping

`seponering-escitalopram-tabletter-og-draper`, versjon 14. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

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
- Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i måneder.
  - Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare to til tre måneder eller mer. Legemidlet bør trappes gradvis ned over uker eller måneder etter pasientens behov. *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 4.4)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Med dråper på 1 mg per dråpe kan forskriveren fra 3 mg velge et minste trinn på høyst 50 % når ingen dose innenfor valgområdet kan gis, ned til 1 mg. Når planen har nådd 1 mg eller lavere, holdes siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Når planen ikke når dit, er den ikke komplett, og verktøyet viser ingen doser. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Med dråper på 1 mg per dråpe kan forskriveren fra 3 mg velge et minste trinn på høyst 50 % når ingen dose innenfor valgområdet kan gis, ned til 1 mg. Når planen har nådd 1 mg eller lavere, holdes siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Når planen ikke når dit, er den ikke komplett, og verktøyet viser ingen doser. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*
- Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.
  - Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- En pasient som bruker escitalopram tabletter, fortsetter med hele tabletter så lenge de gir dosen i trinnet, og går så over til dråper med samme døgndose i mg: én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Planen går ikke tilbake til tabletter, og hver dose gis med én form. Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene.
  - Hver dråpe inneholder 1 mg escitalopram (20 mg/ml). *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 2)*
  - Dråpene er bioekvivalente med Cipralex tabletter. *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 5.2)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Unntak (`qt_forlengelse`): Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet. Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den, og nedtrappingen må planlegges individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7 og 8: kontraindikasjoner kan ikke overstyres med en generell begrunnelse:** Preparatomtalen oppgir forholdet som en kontraindikasjon; ordinær planlegging stoppes i stedet for å kreve en begrunnelse. (bygger på dmp-cipralex pkt. 4.3))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre`): Er pasienten 65 år eller eldre? (dmp-cipralex pkt. 4.2)
- Må besvares (`nedsatt_leverfunksjon`): Har pasienten nedsatt leverfunksjon? Et ja krever en skriftlig begrunnelse. (dmp-cipralex pkt. 4.2)
- Må besvares (`langsom_cyp2c19`): Er pasienten kjent langsom metaboliserer av CYP2C19? (dmp-cipralex pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-cipralex pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 10 og 20 mg, FEST-legemiddelform 748, med nei på alle spørsmålene, styrker (fra) 1 mg
- 10 og 20 mg, FEST-legemiddelform 748, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 1 mg
- 10 og 20 mg, FEST-legemiddelformer 53 → 748, med nei på alle spørsmålene, styrker (fra) 1, 5, 10 og 20 mg

## 9. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. I alle 32 valgene tilbys nøyaktig én dose, så hver startdose gir én plan. Radene er slik planen og kopien av den ville stått om delplaner ble vist; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

| Regel | Tilfelle | Planer | Reduksjoner | Valg forskriveren gjør | Siste dose | Planutfall |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-escitalopram-tabletter-og-draper` | dråper, oppløsning, 10 mg, kort behandlingstid | 1 | 7 | 5 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 197. |
| `seponering-escitalopram-tabletter-og-draper` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 10 | 7 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 281. |
| `seponering-escitalopram-tabletter-og-draper` | dråper, oppløsning, 10 mg, lang behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram-tabletter-og-draper` | dråper, oppløsning, 20 mg, lang behandlingstid | 1 | 0 | 8 | – | ingen plan |
| `seponering-escitalopram-tabletter-og-draper` | tablett, 10 mg, kort behandlingstid | 1 | 7 | 5 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 197. |
| `seponering-escitalopram-tabletter-og-draper` | tablett, 20 mg, kort behandlingstid | 1 | 10 | 7 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 281. |

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 6 (dag 141, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 7 (dag 169, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 197.**

- Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))
- Dag 29: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg
- Dag 57: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 85: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 113: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 141: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 141–168: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 169: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 169–196: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 197: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Fra dag 197: Escitalopram peroralt: Seponert
- Dag 203: Vurdering (Escitalopram): Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 210: Vurdering (Escitalopram): Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 224: Vurdering (Escitalopram): Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 9 (dag 225, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 10 (dag 253, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 281.**

- Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg
- Dag 29: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))
- Dag 57: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg
- Dag 85: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))
- Dag 113: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))
- Dag 141: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 169: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 197: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 225: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 225–252: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 253: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 253–280: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 281: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Fra dag 281: Escitalopram peroralt: Seponert
- Dag 287: Vurdering (Escitalopram): Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 294: Vurdering (Escitalopram): Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 308: Vurdering (Escitalopram): Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg).

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, lang behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 17 mg (−5,56 %). Valgt: 17 mg.
- Kan velges for trinn 3 (dag 57, beregnet 15,3 mg, fra 17 mg): 16 mg (−5,88 %). Valgt: 16 mg.
- Kan velges for trinn 4 (dag 85, beregnet 14,4 mg, fra 16 mg): 15 mg (−6,25 %). Valgt: 15 mg.
- Kan velges for trinn 5 (dag 113, beregnet 13,5 mg, fra 15 mg): 14 mg (−6,67 %). Valgt: 14 mg.
- Kan velges for trinn 6 (dag 141, beregnet 12,6 mg, fra 14 mg): 13 mg (−7,14 %). Valgt: 13 mg.
- Kan velges for trinn 7 (dag 169, beregnet 11,7 mg, fra 13 mg): 12 mg (−7,69 %). Valgt: 12 mg.
- Kan velges for trinn 8 (dag 197, beregnet 10,8 mg, fra 12 mg): 11 mg (−8,33 %). Valgt: 11 mg.
- Kan velges for trinn 9 (dag 225, beregnet 9,9 mg, fra 11 mg): 10 mg (−9,09 %). Valgt: 10 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg).

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: tablett, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 6 (dag 141, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 7 (dag 169, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 197.**

- Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))
- Dag 29: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg
- Dag 57: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 85: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 113: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 141: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 141–168: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 169: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 169–196: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 197: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Fra dag 197: Escitalopram peroralt: Seponert
- Dag 203: Vurdering (Escitalopram): Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 210: Vurdering (Escitalopram): Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 224: Vurdering (Escitalopram): Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram med tabletter og dråper, gjentatt prosentvis nedtrapping: tablett, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 9 (dag 225, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 10 (dag 253, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 281.**

- Dag 1–28: Escitalopram peroralt: 15 mg = 1 tablett à 10 mg + 1 tablett à 5 mg
- Dag 29: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))
- Dag 57: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg
- Dag 85: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))
- Dag 113: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))
- Dag 141: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 169: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 197: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 225: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 225–252: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 253: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Dag 253–280: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 281: Vurdering (Escitalopram): Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall.
- Fra dag 281: Escitalopram peroralt: Seponert
- Dag 287: Vurdering (Escitalopram): Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 294: Vurdering (Escitalopram): Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 308: Vurdering (Escitalopram): Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

## 10. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden, som aldri viser en delplan, og kjøres i testene (`src/__tests__/verktoyb2.test.ts`). Uten annen merknad er regelen den godkjente versjon 14, slik verktøyet har den. Organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

| ID | K0 | Hva | Regel | Forventet | Resultat |
| --- | --- | --- | --- | --- | --- |
| B2-01 | – | escitalopram tablett 20 mg, kort behandlingstid: 15 mg med tabletter, så dråper; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg, 2 mg, 1 mg | den verktøyet tilbyr i dag | Plan: 15 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 12 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 9 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 7 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-02 | K0-01 | escitalopram tablett 10 mg, kort behandlingstid: dråper fra første trinn; forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg, 1 mg | den verktøyet tilbyr i dag | Plan: 8 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-03 | – | escitalopram dråper 20 mg, kort behandlingstid: som versjon 13 (K1-02); forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg, 2 mg, 1 mg | den verktøyet tilbyr i dag | Plan: 15 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 12 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 9 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 7 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-04 | – | escitalopram dråper 10 mg, kort behandlingstid: som versjon 13 (K1-01); forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg, 1 mg | den verktøyet tilbyr i dag | Plan: 8 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-05 | – | escitalopram tablett 15 mg (omfanget er ikke utvidet) | den verktøyet tilbyr i dag | Ingen plan: Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| B2-06 | – | escitalopram tablett 5 mg (omfanget er ikke utvidet) | den verktøyet tilbyr i dag | Ingen plan: Startdosen 5 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| B2-07 | – | escitalopram tablett 20 mg, lang behandlingstid | den verktøyet tilbyr i dag | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 18 mg). Tilbyr 17 mg for neste trinn. | som forventet |
| B2-08 | – | escitalopram tablett 20 mg, 66 år (ja på «65 år eller eldre») | den verktøyet tilbyr i dag | Ingen plan: Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved 65 år eller eldre) (utenfor omfanget). | som forventet |
| B2-09 | – | escitalopram tablett 20 mg, tidligere seponeringssymptomer | den verktøyet tilbyr i dag | Ingen plan: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. | som forventet |
| B2-10 | – | escitalopram tablett 20 mg, før forskriveren har valgt dosen i andre trinn: ingen doser vises, 12 mg tilbys | den verktøyet tilbyr i dag | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg). Tilbyr 12 mg for neste trinn. | som forventet |
| B2-11 | – | escitalopram tablett 20 mg, dråpene avregistrert | den verktøyet tilbyr i dag | Ingen plan: styrken 1 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST (utenfor omfanget). | som forventet |
| B2-12 | – | escitalopram tablett 20 mg, 5 mg-tablettene avregistrert | den verktøyet tilbyr i dag | Ingen plan: styrken 5 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST (utenfor omfanget). | som forventet |
| B2-13 | – | escitalopram tablett 20 mg med dråpepreferansen endret til 3 etter godkjenningen | seponering-escitalopram-tabletter-og-draper (den registrerte godkjenningen av versjon 14; deretter dråpepreferansen 5 → 3 på en kopi) | Ingen plan: Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke). | som forventet |
| B2-14 | – | escitalopram tablett 20 mg, godkjent med overgangen uten avklaring (B2.1) | seponering-escitalopram-tabletter-og-draper (overgangen uten avklaring, deretter simulert klinisk godkjenning av kopien) | Ingen plan: Regelen har åpne valg som må avklares faglig. | som forventet |
| B2-15 | – | escitalopram tablett 20 mg slik verktøyet var før godkjenningen: med versjon 14 til faglig kontroll brukte verktøyet versjon 13 (som K1-08) | den verktøyet tilbyr i dag | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg). | som forventet |
| B2-16 | – | escitalopram tablett 20 mg uten dråpepreferansen: 15 dråper fra første trinn; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg, 2 mg, 1 mg | seponering-escitalopram-tabletter-og-draper (den registrerte godkjenningen av versjon 14; deretter uten dråpepreferansen, deretter simulert godkjenning av kopien på en kopi) | Plan: 15 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 12 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 9 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 7 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-17 | – | escitalopram tablett 10 mg, 64 år (nei på «65 år eller eldre»): komplett; forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg, 1 mg | den verktøyet tilbyr i dag | Plan: 8 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-18 | – | escitalopram tablett 10 mg, nøyaktig 65 år (ja på «65 år eller eldre»): stopp | den verktøyet tilbyr i dag | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| B2-19 | – | escitalopram tablett 20 mg, nøyaktig 65 år (ja på «65 år eller eldre»): stopp | den verktøyet tilbyr i dag | Ingen plan: Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved 65 år eller eldre) (utenfor omfanget). | som forventet |
| B2-20 | – | escitalopram tablett 20 mg med tabletter og dråper i samme dose (B2.6, ikke i forslaget); forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg, 2 mg, 1 mg | seponering-escitalopram-tabletter-og-draper (den registrerte godkjenningen av versjon 14; deretter tabletter og dråper i samme dose i overgangen, deretter simulert godkjenning av kopien på en kopi) | Plan: 15 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 12 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 9 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 7 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| B2-21 | – | escitalopram tablett 10 mg med tabletter og dråper i samme dose (B2.6, ikke i forslaget); forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg, 1 mg | seponering-escitalopram-tabletter-og-draper (den registrerte godkjenningen av versjon 14; deretter tabletter og dråper i samme dose i overgangen, deretter simulert godkjenning av kopien på en kopi) | Plan: 8 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 6 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 5 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 4 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 3 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 2 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → 1 mg → Før endringen, punkt 1: Vurder seponeringssymptomer og tegn på tilbakefall. → Seponert → Punkt 2: Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Punkt 3: Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Punkt 4: Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
