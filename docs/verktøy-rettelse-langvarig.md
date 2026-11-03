<!-- Laget av `npm run verktoy:regler -- rettelse`; rediger ikke for hånd. -->
# Rettelsen av faktumet om små reduksjoner fra starten (RCPsych): kontrollgrunnlag og registrering

Grunnlaget for kontrollørens vurdering av de nye regelversjonene etter rettelsen av `RCPSYCH.langvarig`, som kontrolløren ba om i vurderingen 03.11.2026 (`docs/verktøy-kildefunn-1-2.md` §8), og registreringen av vurderingen.

**Kontrollørens vurdering 03.11.2026 er registrert** (avsnitt 6). Appen bruker de nye versjonene. `kryssnedtrapping-sertralin-mirtazapin` versjon 10 og `seponering-vortioksetin` versjon 12 er klinisk godkjent med samme kliniske omfang som før. De 16 andre er kontrollert og ikke godkjent, som før rettelsen.

## 1. Rettelsen

**03.11.2026.** Før: «Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen.» (`rcpsych-stopping`, If you have been taking antidepressants for longer)

Etter: «Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen.» (`rcpsych-stopping`, If you have been taking antidepressants for longer)

«Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose.» (`rcpsych-stopping`, Examples of tapering plans)

Faktumet fra RCPsych om små reduksjoner fra starten er presisert etter kontrollørens vurdering 03.11.2026 (ChatGPT, `docs/verktøy-kildefunn-1-2.md` §8): kilden regner 5–10 % av den opprinnelige dosen, og andre deler av veiledningen beskriver proporsjonale reduksjoner fra sist brukte dose. Kontrollørens formulering er delt i to fakta med hvert sitt sted i kilden. Ingen verdi, betingelse, beregning eller annen tekst i regelen er endret; den nye versjonen må kontrolleres på nytt.

## 2. Slik er rettelsen gjort

- Reglene bygges fortsatt med faktumet slik det stod (`RCPSYCH_TIDLIGERE` i `src/verktoy/regler/bygg.ts`), så godkjenningene og disposisjonen 31.10.2026 kan etterprøves mot nøyaktig innholdet de gjaldt. Regelsettene slik de var før rettelsene, står som `PILOTSETT_FOR_RETTELSENE` og `NEDTRAPPINGSSETT_FOR_RETTELSENE`; appen bruker dem ikke.
- Rettelsen (`FAKTUMRETTELSER`, `src/verktoy/regler/rettelse.ts`) bytter faktumet i hver regel som viser til det, øker versjonen med én og gir historikken stegene utkast og til faglig kontroll for den nye versjonen. Ingenting annet i regelen endres, og de tidligere stegene står urørt.
- Kontrollørens vurdering står på rettelsen (`kontroll`). Godkjenningen (`godkjenn`) og disposisjonen (`disponer`) registreres bare for nøyaktig versjonen og fingeravtrykket kontrolløren så; er en regel endret, får den ikke steget og er ikke godkjent.
- En ny regel bruker det rettede faktumet direkte (`RCPSYCH.langvarig` og `RCPSYCH.proporsjonal`).

## 3. Regelversjonene

18 regler viser til faktumet og har fått en ny versjon. Ingen andre regler er endret.

| Regel | Regelsett | Før rettelsen | Nå | Steder som er endret |
| --- | --- | --- | --- | --- |
| `kryssnedtrapping-sertralin-mirtazapin` | `ousfar-verktoy-pilot` | kontrollert og godkjent i oppgitt omfang, 9 (`dc878aa9065c8330f3850567b226ab8d392bcad4cb1dd5cf5cebacda54277881`) | kontrollert og godkjent i oppgitt omfang, 10 (`12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a`) | 5 |
| `seponering-amitriptylin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`dcc526c4db9db4e5a77994b49d7e18890e1799a19c9f4fbc2bf63e31151c4eb7`) | kontrollert, ikke godkjent, 12 (`a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3`) | 8 |
| `seponering-amitriptylin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`0f4d32df4883fd056d1f1b19a4f8ba8b52ec1343f3e6b64653c311fbce727deb`) | kontrollert, ikke godkjent, 8 (`187bc1250baf2af7c3c969e73e0edee424d2fc1fd8a8874a08523d6730b679ce`) | 5 |
| `seponering-escitalopram` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`a2d959cae2780053d15188ae0e160292e06af5155dfacafcfa41b1d850b127db`) | kontrollert, ikke godkjent, 12 (`7710be648e96682c1c8a35a8e4d9c4428109b294f29b63ae9401ef29b41bd3c1`) | 8 |
| `seponering-escitalopram-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`8dcd4f992fe4f9fb55aebf1dc4eda04bc0399d2ef91ca90a14d699979cd53e3d`) | kontrollert, ikke godkjent, 8 (`4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095`) | 5 |
| `seponering-fluoksetin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`796b98a07017e16850df9f80e53b0fa33ded69a8729df91141dd64934da2caf8`) | kontrollert, ikke godkjent, 12 (`df89f2dadfc482e86a6dd8852966922d9834ec6ae728de8ffe2fd5e46cc2951a`) | 6 |
| `seponering-fluoksetin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`7c8691fc8d08a6fb1fd7423a0c2dec65855fac778c08706cf675290993124dbe`) | kontrollert, ikke godkjent, 8 (`e9946f1fcd42cb834677d9ef6751307fbbe0a9ec41b28d4d28687ac2efe29ddd`) | 5 |
| `seponering-fluvoksamin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 12 (`3f1d1e9523137bae72521bc2c7f396eff2aba59080a2af779f07970fa1f53e86`) | kontrollert, ikke godkjent, 13 (`778344f0ab04ad27d68cc588b868935a00456ae76674d48cbf51e384b5f4d5d0`) | 8 |
| `seponering-fluvoksamin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 8 (`98fe10b187901eec697df69aa4055f5a36ec6231f9d532c47e9a2a48c8d3b5f0`) | kontrollert, ikke godkjent, 9 (`95c2b4eeafb750464f998d390300634837372999a56c077f6bee053279bfa312`) | 5 |
| `seponering-klomipramin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`fdf267f7ee7efef2411424e28d78b29a5b98b87c6a0edeacbabb1f5dc2ddc58c`) | kontrollert, ikke godkjent, 12 (`786fef7ded5f248dce7de7479a76aa5713939ed5e939605a5c9da98a3e71a3b3`) | 8 |
| `seponering-klomipramin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`78f33b643775fbedd9218be27d5d27a3f4fbdf974451286cfbb1b0fce70bd7af`) | kontrollert, ikke godkjent, 8 (`11252e56fd5f8aa65f6d180621b259c7adee652cb0077c88a6cf634be6208a40`) | 5 |
| `seponering-nortriptylin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`c2594aabadd1c4ecb41776ab1bac5f2c7cc1b781027fa544726f96c210c25fcd`) | kontrollert, ikke godkjent, 12 (`300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c`) | 8 |
| `seponering-nortriptylin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`dfdb03c5334e9e9d921b3fcdb342b8f7784a398742624a85dff4934b70cce244`) | kontrollert, ikke godkjent, 8 (`6637a47e0a0b34b1a271dff2546845840df7c54ccdc428f342ee47fca9b93f69`) | 5 |
| `seponering-sertralin` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 11 (`ef83fd9ddbbdf92643ef766a0963a410e1afa5df4aea0db0c81cf6bc2b225953`) | kontrollert, ikke godkjent, 12 (`5be29652a2afc47a60cbd394a45bf5cdbad92dfe259e1fa263751e5476a8198e`) | 8 |
| `seponering-sertralin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`7de218da5d775e8785fc6700ca3468fae2bf813d83c68b5012402aa803fb2427`) | kontrollert, ikke godkjent, 8 (`cf874ff4a4e5dbe69da6da154240c70a9f1e0d56d5d80225bafe5901c0a0f642`) | 5 |
| `seponering-vortioksetin` | `ousfar-verktoy-nedtrapping` | kontrollert og godkjent i oppgitt omfang, 11 (`a6e488637de88c9bb109d42153a56a8e616935638c0536d1335076210dd1351e`) | kontrollert og godkjent i oppgitt omfang, 12 (`b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3`) | 9 |
| `seponering-vortioksetin-langsom` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 7 (`06955d6152fe1060b8f144b9a826d1af56df5a8c16586a471c2f6be45605c05d`) | kontrollert, ikke godkjent, 8 (`c191fcbc36fa91acdb6b46c3e9451c3b0d8272f0f2f79ffee1e351392c573d73`) | 5 |
| `seponering-fluoksetin-annenhver-dag` | `ousfar-verktoy-nedtrapping` | kontrollert, ikke godkjent, 4 (`cb1187568a3814434df286f6b9f89704956c8ab2d048055233532f3c35bd4f3f`) | kontrollert, ikke godkjent, 5 (`1d807d01fee557b739ce4a4a9f9badaba60aa1ed982c10715fd8b67fe1a70e9f`) | 2 |

De 2 som var klinisk godkjent før rettelsen, er godkjent på nytt:

| Regel | Før rettelsen | Nå | Godkjenningen nå |
| --- | --- | --- | --- |
| `kryssnedtrapping-sertralin-mirtazapin` | kontrollert og godkjent i oppgitt omfang, versjon 9 | kontrollert og godkjent i oppgitt omfang, versjon 10 | Kontrollørens gjennomgang av a38fac14 03.11.2026 (rettelsen av RCPsych-faktumet, PR #309): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare det tidligere godkjente startforløpet fra sertralin 50 eller 100 mg, kort/ikke-langvarig behandling, med kontrollerte tabletter og styrker, obligatoriske bekreftelser og tidligere seponeringsplager fraværende. Dette omfatter ikke videre 25 → 0, opptrapping av mirtazapin, andre doser, langtidsbehandling eller endret trinnlengde. Identisk klinisk omfang som v9. Godkjenningen gjelder bare dette eksakte fingeravtrykket og disse betingelsene. Den er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping. |
| `seponering-vortioksetin` | kontrollert og godkjent i oppgitt omfang, versjon 11 | kontrollert og godkjent i oppgitt omfang, versjon 12 | Kontrollørens gjennomgang av a38fac14 03.11.2026 (rettelsen av RCPsych-faktumet, PR #309): faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: bare én første reduksjon 20 → 15 mg/døgn, med minst 28 dager før ny symptomstyrt vurdering, hos voksne under 65 år, kort/ikke-langvarig behandling, uten tidligere seponeringsplager, etter alle opprinnelige vurderinger/stopp, med kontrollerte tabletter/styrker. Ingen påfølgende reduksjon, langsom variant eller utvidet pasientgruppe. Identisk klinisk omfang som v11. Godkjenningen gjelder bare dette eksakte fingeravtrykket og disse betingelsene. Den er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping. |

Regelsettene har fått en ny versjon:

| Regelsett | Før rettelsen | Nå |
| --- | --- | --- |
| `ousfar-verktoy-pilot` | 16 | 17 |
| `ousfar-verktoy-nedtrapping` | 14 | 15 |

## 4. Hva som er endret i hver regel

Stedene der den nye versjonen skiller seg fra versjonen før rettelsen, utenom versjonsnummeret og godkjenningshistorikken. Hvert sted er en liste over henvisninger der det gamle faktumet er byttet med de nye; ingen verdi, betingelse, beregning eller annen tekst er endret (testene kontrollerer det).

- `kryssnedtrapping-sertralin-mirtazapin`: `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[2].henvisninger`, `fortolkning.tilpasninger[3].henvisninger`, `klinisk_omfang.grunnlag.henvisninger`
- `seponering-amitriptylin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-amitriptylin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-escitalopram`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-escitalopram-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-fluoksetin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-fluoksetin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-fluvoksamin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-fluvoksamin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-klomipramin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-klomipramin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-nortriptylin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-nortriptylin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-sertralin`: `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-sertralin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-vortioksetin`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[0].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.begrunnelseskrav[1].grunnlag.henvisninger`, `plan.forlop[0].faser[0].strategi.prosent.standard_ved.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.begrunnelseskrav[0].grunnlag.henvisninger`, `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-vortioksetin-langsom`: `plan.forlop[0].faser[0].strategi.prosent.grunnlag.henvisninger`, `plan.forlop[0].faser[0].trinnlengde.grunnlag.henvisninger`, `bekreftelser[2].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`, `fortolkning.tilpasninger[1].henvisninger`
- `seponering-fluoksetin-annenhver-dag`: `unntak[0].grunnlag.henvisninger`, `sporsmal[0].grunnlag.henvisninger`

## 5. Testmatrisen før og etter

Alle 112 kasusene i testmatrisen fra P11 (`docs/verktøy-p11-testmatrise.md`) er kjørt to ganger: med regelsettene slik de var før rettelsene (appversjon 1.122.1), og med regelsettene appen bruker nå. Sammenligningen gjelder hele det brukeren ser: radene i planen og hele teksten som kopieres, med advarsler, avvik, antakelser, usikkerhet, preparater, kontroller, kilder og versjoner, og grunnene når planen stopper. Før sammenligningen er bare linjene i tabellen under ført tilbake: regelversjonen og regelsettets versjon under «Versjoner» og stedene i RCPsych under «Kilder». Hver av dem må stå nøyaktig som i tabellen for å bli ført tilbake. Godkjenningslinjen på skjermen står i avsnitt 3. 110 kasus gir nøyaktig det samme for brukeren. 2 gir noe annet, og bare fordi kasuset prøver neste versjonsnummer, som nå er ett høyere:

| Kasus | Hva | Før rettelsen | Nå |
| --- | --- | --- | --- |
| V34 | ny regelversjon uten ny godkjenning | stopp: Ingen klinisk doseplan kan vises. Godkjenningen gjelder regelversjon 11, ikke versjon 12. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. | stopp: Ingen klinisk doseplan kan vises. Godkjenningen gjelder regelversjon 12, ikke versjon 13. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| S18 | ny regelversjon uten ny godkjenning | stopp: Ingen klinisk doseplan kan vises. Godkjenningen gjelder regelversjon 9, ikke versjon 10. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. | stopp: Ingen klinisk doseplan kan vises. Godkjenningen gjelder regelversjon 10, ikke versjon 11. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |

Linjene som er ført tilbake:

| Regel | Nå | Før rettelsen | Hvorfor |
| --- | --- | --- | --- |
| `kryssnedtrapping-sertralin-mirtazapin` | Regel kryssnedtrapping-sertralin-mirtazapin, versjon 10, fingeravtrykk 12801aa22a0c | Regel kryssnedtrapping-sertralin-mirtazapin, versjon 9, fingeravtrykk dc878aa9065c | Den nye regelversjonen. |
| `kryssnedtrapping-sertralin-mirtazapin` | Regelsett ousfar-verktoy-pilot, versjon 17 | Regelsett ousfar-verktoy-pilot, versjon 16 | Ny versjon av regelsettet med de nye regelversjonene. |
| `kryssnedtrapping-sertralin-mirtazapin` | Stopping antidepressants (Royal College of Psychiatrists (RCPsych), Publisert mars 2024): https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants – Examples of tapering plans; If you have been taking antidepressants for longer | Stopping antidepressants (Royal College of Psychiatrists (RCPsych), Publisert mars 2024): https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants – If you have been taking antidepressants for longer | Stedene i kilden der de nye faktaene står. |
| `seponering-vortioksetin` | Regel seponering-vortioksetin, versjon 12, fingeravtrykk b28dec93f5ed | Regel seponering-vortioksetin, versjon 11, fingeravtrykk a6e488637de8 | Den nye regelversjonen. |
| `seponering-vortioksetin` | Regelsett ousfar-verktoy-nedtrapping, versjon 15 | Regelsett ousfar-verktoy-nedtrapping, versjon 14 | Ny versjon av regelsettet med de nye regelversjonene. |
| `seponering-vortioksetin` | Stopping antidepressants (Royal College of Psychiatrists (RCPsych), Publisert mars 2024): https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants – Examples of tapering plans; How should I gradually reduce my dose?; If you have been taking antidepressants for longer; When and how should I stop my antidepressants?; Which plan should I follow? | Stopping antidepressants (Royal College of Psychiatrists (RCPsych), Publisert mars 2024): https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants – How should I gradually reduce my dose?; If you have been taking antidepressants for longer; When and how should I stop my antidepressants?; Which plan should I follow? | Stedene i kilden der de nye faktaene står. |

## 6. Kontrollørens vurdering 03.11.2026

Spørsmålene i kontrollgrunnlaget og svarene fra ChatGPT (uavhengig kontrollør) i PR #309, gjennomgangen av `a38fac14`, kort gjengitt:

| # | Spørsmål | Svar |
| --- | --- | --- |
| R1 | Godkjenner du den nye versjonen av hver av de to godkjente reglene, for nøyaktig versjonen og fingeravtrykket og med samme avgrensning som den godkjente versjonen? | Ja, begrenset klinisk godkjenning av nøyaktig de to nye versjonene og fingeravtrykkene, med samme kliniske omfang som før. Avgrensningen står i avsnitt 3. Godkjenningen er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping. |
| R2 | Skal de andre nye versjonene få samme utfall som versjonen du vurderte 31.10.2026, «kontrollert, ikke godkjent», for nøyaktig den nye versjonen og fingeravtrykket? | Ja. Ingen av dem kan gi kliniske doseplaner som følge av dette, og den separate substanskontrollen som kreves før en senere aktivering, bortfaller ikke. |
| R3 | Er det akseptabelt at formuleringen din er delt i to fakta, med hvert sitt sted i kilden («If you have been taking antidepressants for longer» og «Examples of tapering plans»)? | Ja. Oppdelingen er presis og kildeforankret. |
| R4 | Kan godkjenningene og disposisjonen registreres i samme PR før den slås sammen, slik at appen bytter til de nye versjonene samtidig og ingen godkjent plan forsvinner underveis? | Ja, under sluttkontroll. Godkjenningene og disposisjonen registreres sammen med regelsettene, og den endelige endringen legges fram for en ny uavhengig kontroll før sammenslåing. |

## 7. Det som er registrert

- Godkjenningen av de to nye versjonene, med kontrollørens navn, dato og avgrensning, for nøyaktig versjonen og fingeravtrykket i avsnitt 3. Claude registrerer aldri en godkjenning kontrolløren ikke har gitt.
- Disposisjonen av de andre nye versjonene som kontrollert, ikke godkjent, for nøyaktig hver versjon og hvert fingeravtrykk.
- Regelsettene med de nye versjonene og nye settversjoner, i samme endring, så ingen godkjent plan forsvinner underveis. Testmatrisen, kontrollgrunnlaget for VDK-3, låsetestene og rapportene gjelder de nye versjonene.
- Den endelige endringen legges fram for en ny uavhengig kontroll før sammenslåing.
