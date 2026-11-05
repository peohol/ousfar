<!-- Laget av `QA_SKRIV=1 npx vitest run src/__tests__/qa`; rediger ikke for hånd. -->
# OUSFAR Verktøy – uavhengig QA av brukerforløp

Spor H i `docs/verktøy-klinisk-leveranseplan-2026-11.md`. Hvert forløp er en syntetisk, vanlig situasjon kjørt gjennom den samme veien som verktøysiden, mot de lagrede FEST-uttrekkene. Klassen er QA-testens egen vurdering av planens forløp (komplett = når sluttmålet), ikke regelens selvbeskrivelse. Dette er en måling, ikke en klinisk godkjenning. Verktøyene er bare synlige for administratorer; ingen plan her er tilgjengelig for klinikere. K0-01 slik den står (tablett valgt i skjemaet) gir ingen komplett plan og regnes ikke som levert: regelen godtar faglig overgang fra tabletter til dråper mg for mg, men appens automatiske brukerflyt fra tablettvalget gir ingen plan. Når forskriveren selv bytter til dråper (H-39), gir dråper fra 10 og 20 mg ved kort behandlingstid komplett plan i et snevert omfang.

## Måltall per leveranse

| Leveranse | Komplett plan til sluttmål | Delplan | Godkjent fagtekst | Regel finnes, men beregningen stopper | Ikke godkjent regel | Regel til kontroll | Ikke støttet | Sperret | Skjemaet krever mer | Verktøyet finnes ikke |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| K1 Trappe ned antidepressiv | 3 |  | 2 | 6 | 13 |  |  |  |  |  |
| K2 Bytte antidepressiv | 4 |  |  | 5 |  | 1 | 6 |  |  |  |
| K3 Bytte antipsykotikum | 6 |  |  | 4 | 1 | 1 | 3 |  |  |  |
| K4 Kombinere stemningsstabiliserende | 2 |  |  |  |  |  | 2 |  | 1 |  |

## Forløpene

| Id | Situasjon | Utfall | Det brukeren ser | Avvik |
| --- | --- | --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres | Regel finnes, men beregningen stopper (seponering-escitalopram v13) | [formvalg fra: Tablett] / escitalopram dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig og ikke under 1 mg. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. / Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg; 10 og 20 mg, FEST-legemiddelform 748, med nei på alle spørsmålene, styrker (fra) 1 mg; 10 og 20 mg, FEST-legemiddelform 748, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 1 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| K0-02 | Sertralin 100 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| K0-03 | Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| K0-04 | Sertralin 100 mg byttes til mirtazapin | Regel finnes, men beregningen stopper (kryssnedtrapping-sertralin-mirtazapin v10) | [måldose 15 mg] / [formvalg til: Tablett] / Komplett plan ikke tilgjengelig: sertralin: siste trinn før null; avslutning vurderes individuelt; mirtazapin: holdes til sertralin er avsluttet; videre dosering planlegges individuelt. | – |
| K0-05 | Escitalopram 20 mg byttes til mirtazapin | Regel til kontroll | [måldose 15 mg] / Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. | – |
| K0-06 | Escitalopram 20 mg byttes til sertralin | Komplett plan til sluttmål (bytte-escitalopram-sertralin v2) | [måldose 50 mg] / Dag 1–14: Escitalopram peroralt: 10 mg = 1 tablett à 10 mg / Dag 15: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Dag 15–28: Escitalopram peroralt: 5 mg = 1 tablett à 5 mg / Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Fra dag 29: Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg / Dag 35: Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin. / Dag 57: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. | – |
| K0-07 | Olanzapin 10 mg tablett byttes til aripiprazol tablett | Regel finnes, men beregningen stopper (antipsykotikabytte-olanzapin-aripiprazol v8) | [måldose 10 mg] / [formvalg fra: Tablett] / [formvalg til: Tablett] / Startdosen 10 mg er utenfor det regelen gjelder for (20 mg). | – |
| K0-08 | Risperidon 4 mg tablett byttes til aripiprazol tablett | Komplett plan til sluttmål (antipsykotikabytte-risperidon-aripiprazol v8) | [måldose 10 mg] / [formvalg til: Tablett] / Dag 1–7: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg / Dag 8: Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker). / Dag 8–28: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 29: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 29–42: Risperidon peroralt: 3 mg = 1 tablett à 3 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 43: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 43–56: Risperidon peroralt: 2 mg = 1 tablett à 2 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 57: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 57–70: Risperidon peroralt: 1 mg = 1 tablett à 1 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 71: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Fra dag 71: Risperidon peroralt: Seponert; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 84: Vurdering (Risperidon): Risperidon er seponert: tilstanden vurderes på nytt (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi). | – |
| K0-09 | Aripiprazol 15 mg tablett til Abilify Maintena | Komplett plan til sluttmål (depot-aripiprazol-maintena v3) | [formvalg fra: Tablett] / Dag 1–14: Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg / Fra dag 15: Aripiprazol peroralt: Seponert / Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige) | – |
| K0-10 | Risperidon 4 mg tablett til paliperidonpalmitat månedlig | Regel finnes, men beregningen stopper (depot-risperidon-xeplion v8) | [måldose 75 mg] / Startdosen 4 mg er utenfor det regelen gjelder for (3 mg). | – |
| K0-11 | Står på litium (4 depottabletter à 42 mg); lamotrigin legges til | Komplett plan til sluttmål (tillegg-litium-lamotrigin v2) | [måldose 200 mg] / Dag 1–14: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg / Dag 15: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 15: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 15–28: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg / Dag 29: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 29: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 29–35: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg / Dag 36: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 36: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Fra dag 36: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg / Dag 36: Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater. / Dag 36: Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke. | – |
| K0-12 | Står på valproat; lamotrigin legges til | Komplett plan til sluttmål (tillegg-valproat-lamotrigin v2) | [måldose 100 mg] / Dag 1–14: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg / Dag 15: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 15: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 15–28: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg / Dag 29: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 29: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 29–35: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg / Dag 36: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 36: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Fra dag 36: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg / Dag 36: Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater. / Dag 36: Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke. | – |
| H-01 | Vortioksetin 20 mg skal seponeres | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | Komplett plan ikke tilgjengelig: vortioksetin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | – |
| H-02 | Vortioksetin 10 mg skal seponeres | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | vortioksetin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. / Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10, 15 og 20 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-03 | Escitalopram 20 mg skal seponeres | Regel finnes, men beregningen stopper (seponering-escitalopram v13) | [formvalg fra: Tablett] / Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg). | – |
| H-04 | Sertralin 50 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-05 | Citalopram 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent. | – |
| H-06 | Nortriptylin 50 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-07 | Mirtazapin 30 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent. | – |
| H-08 | Venlafaksin 75 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent. | – |
| H-09 | Paroksetin 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent. | – |
| H-10 | Fluoksetin 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-11 | Duloksetin 60 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er bare fagtekst, fordi det ikke finnes en dokumentert måte å gi trinnene med dagens norske preparater. Fagteksten er ikke klinisk godkjent. | – |
| H-12 | Bupropion 300 mg skal seponeres | Godkjent fagtekst | seponering-bupropion v5 | – |
| H-13 | Agomelatin 25 mg skal seponeres | Godkjent fagtekst | seponering-agomelatin v1 | – |
| H-14 | Sertralin 50 mg byttes til mirtazapin | Regel finnes, men beregningen stopper (kryssnedtrapping-sertralin-mirtazapin v10) | [formvalg til: Tablett] / Komplett plan ikke tilgjengelig: sertralin: siste trinn før null; avslutning vurderes individuelt; mirtazapin: holdes til sertralin er avsluttet; videre dosering planlegges individuelt. | – |
| H-15 | Citalopram 20 mg byttes til sertralin 100 mg | Komplett plan til sluttmål (bytte-citalopram-sertralin v2) | [måldose 100 mg] / Dag 1–14: Citalopram peroralt: 10 mg = 1 tablett à 10 mg / Dag 15: Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Dag 15–28: Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg / Dag 21: Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin. / Dag 29: Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter citalopram. / Fra dag 29: Sertralin peroralt: 100 mg = 1 tablett à 100 mg / Dag 43: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. / Dag 57: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. | – |
| H-16 | Sertralin 100 mg byttes til escitalopram | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-17 | Escitalopram 20 mg byttes til vortioksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-18 | Fluoksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-19 | Paroksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-20 | Venlafaksin 150 mg byttes til duloksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-21 | Sertralin 100 mg byttes til bupropion | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-22 | Kvetiapin 400 mg byttes til aripiprazol (peroralt) | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-23 | Olanzapin 15 mg byttes til kvetiapin (peroralt) | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-24 | Paliperidon 6 mg peroralt til Xeplion | Komplett plan til sluttmål (depot-paliperidon-xeplion v3) | Fra dag 1: Paliperidon peroralt: Seponert / Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus) / Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus) / Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel) | – |
| H-25 | Olanzapin 10 mg peroralt til olanzapin depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-26 | Risperidon depot (37,5 mg) til Xeplion | Regel til kontroll | Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. | – |
| H-27 | Haloperidol 5 mg peroralt til haloperidol depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-28 | Står på lamotrigin; litium legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-29 | Står på litium; valproat legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-30 | Escitalopram dråper 10 mg skal seponeres | Komplett plan til sluttmål (seponering-escitalopram v13) | [valgt dose escitalopram trinn 1: 8 mg] / [valgt dose escitalopram trinn 3: 5 mg] / [valgt dose escitalopram trinn 4: 4 mg] / [valgt dose escitalopram trinn 6: 2 mg] / [valgt dose escitalopram trinn 7: 1 mg] / Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %)) / Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg / Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %)) / Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %)) / Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg / Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 141–168: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %)) / Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 169–196: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %)) / Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Fra dag 197: Escitalopram peroralt: Seponert / Dag 203: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. / Dag 210: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. / Dag 224: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose. | – |
| H-31 | Escitalopram dråper 20 mg skal seponeres | Komplett plan til sluttmål (seponering-escitalopram v13) | [valgt dose escitalopram trinn 2: 12 mg] / [valgt dose escitalopram trinn 4: 7 mg] / [valgt dose escitalopram trinn 5: 6 mg] / [valgt dose escitalopram trinn 6: 5 mg] / [valgt dose escitalopram trinn 7: 4 mg] / [valgt dose escitalopram trinn 9: 2 mg] / [valgt dose escitalopram trinn 10: 1 mg] / Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg / Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %)) / Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg / Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %)) / Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %)) / Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %)) / Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %)) / Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg / Dag 225: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 225–252: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %)) / Dag 253: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 253–280: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %)) / Dag 281: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Fra dag 281: Escitalopram peroralt: Seponert / Dag 287: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. / Dag 294: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. / Dag 308: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose. | – |
| H-32 | Escitalopram dråper 20 mg, lang behandlingstid | Regel finnes, men beregningen stopper (seponering-escitalopram v13) | [valgt dose escitalopram trinn 2: 17 mg] / [valgt dose escitalopram trinn 3: 16 mg] / [valgt dose escitalopram trinn 4: 15 mg] / [valgt dose escitalopram trinn 5: 14 mg] / [valgt dose escitalopram trinn 6: 13 mg] / [valgt dose escitalopram trinn 7: 12 mg] / [valgt dose escitalopram trinn 8: 11 mg] / [valgt dose escitalopram trinn 9: 10 mg] / Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg). | – |
| H-33 | Nortriptylin 50 mg, lang behandlingstid | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-34 | Nortriptylin 50 mg når 10 mg-tablettene er avregistrert | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-35 | Sertralin 200 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-36 | Vortioksetin 20 mg når 15 mg-tablettene er avregistrert | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | vortioksetin (fra): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-37 | Sertralin 100 mg byttes til mirtazapin når mirtazapin 15 mg er avregistrert | Regel finnes, men beregningen stopper (kryssnedtrapping-sertralin-mirtazapin v10) | [formvalg til: Tablett] / mirtazapin (til): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-38 | Står på valproat; lamotrigin legges til uten at måldosen er valgt | Skjemaet krever mer | Måldosen må fylles inn som et tall større enn 0. | – |
| H-39 | Escitalopram 10 mg tablett, kort behandlingstid; forskriveren bytter til dråper etter at tablettvalget ikke ga plan | Komplett plan til sluttmål (seponering-escitalopram v13) | [formvalg først fra: Tablett: Regel finnes, men beregningen stopper] / [formvalg byttet til legemiddelform 748] / [valgt dose escitalopram trinn 1: 8 mg] / [valgt dose escitalopram trinn 3: 5 mg] / [valgt dose escitalopram trinn 4: 4 mg] / [valgt dose escitalopram trinn 6: 2 mg] / [valgt dose escitalopram trinn 7: 1 mg] / Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %)) / Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg / Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %)) / Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %)) / Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg / Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 141–168: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %)) / Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Dag 169–196: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %)) / Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. / Fra dag 197: Escitalopram peroralt: Seponert / Dag 203: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. / Dag 210: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. / Dag 224: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose. | – |
| H-40 | Olanzapin 20 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål (antipsykotikabytte-olanzapin-aripiprazol v8) | [måldose 15 mg] / [formvalg fra: Tablett] / [formvalg til: Tablett] / Dag 1–7: Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg / Dag 8: Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker). / Dag 8–14: Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 15: Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker). / Dag 15–28: Olanzapin peroralt: 20 mg = 2 tabletter à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 29: Vurdering (Olanzapin): Før endringen: Før hver reduksjon av olanzapin, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 29–42: Olanzapin peroralt: 15 mg = 2 tabletter à 7,5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 43: Vurdering (Olanzapin): Før endringen: Før hver reduksjon av olanzapin, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 43–56: Olanzapin peroralt: 10 mg = 1 tablett à 10 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 57: Vurdering (Olanzapin): Før endringen: Før hver reduksjon av olanzapin, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 57–70: Olanzapin peroralt: 5 mg = 1 tablett à 5 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 71: Vurdering (Olanzapin): Før endringen: Før hver reduksjon av olanzapin, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Fra dag 71: Olanzapin peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 84: Vurdering (Olanzapin): Olanzapin er seponert: tilstanden vurderes på nytt (forverring av psykosen og seponeringsplager: kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi). | – |
| H-41 | Risperidon 4 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål (antipsykotikabytte-risperidon-aripiprazol v8) | [måldose 15 mg] / [formvalg til: Tablett] / Dag 1–7: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 5 mg = 1 tablett à 5 mg / Dag 8: Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker). / Dag 8–14: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 10 mg = 1 tablett à 10 mg / Dag 15: Vurdering (Aripiprazol): Før endringen: Før hver økning av aripiprazol: toleransen vurderes (akatisi, uro, aktivering og søvnvansker). / Dag 15–28: Risperidon peroralt: 4 mg = 1 tablett à 4 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 29: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 29–42: Risperidon peroralt: 3 mg = 1 tablett à 3 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 43: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 43–56: Risperidon peroralt: 2 mg = 1 tablett à 2 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 57: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Dag 57–70: Risperidon peroralt: 1 mg = 1 tablett à 1 mg; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 71: Vurdering (Risperidon): Før endringen: Før hver reduksjon av risperidon, også det siste trinnet til 0: tilstanden vurderes (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi), og pasienten følges tett gjennom hele byttet. / Fra dag 71: Risperidon peroralt: Seponert; Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 84: Vurdering (Risperidon): Risperidon er seponert: tilstanden vurderes på nytt (forverring av psykosen og seponeringsplager: kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi). | – |
| H-42 | Risperidon 3 mg tablett til Xeplion månedlig | Komplett plan til sluttmål (depot-risperidon-xeplion v8) | [måldose 75 mg] / Fra dag 1: Risperidon peroralt: Seponert / Dag 1: Paliperidon depotinjeksjon 150 mg = 1 injeksjon à 150 mg (deltoideus) / Dag 8: Vurdering (Paliperidon): Før endringen: Før injeksjonen dag 8 og før hver månedlige vedlikeholdsinjeksjon: psykotiske symptomer, ekstrapyramidale og andre bivirkninger og reaksjoner etter forrige injeksjon vurderes, og pasienten følges tett gjennom byttet. / Dag 8: Paliperidon depotinjeksjon 100 mg = 1 injeksjon à 100 mg (±4 dager, deltoideus) / Hver måned fra 1 måned etter dag 8: Paliperidon depotinjeksjon 75 mg = 1 injeksjon à 75 mg (±7 dager, deltoideus eller setemuskel) | – |
| H-43 | Olanzapin 20 mg tablett byttes til aripiprazol med måldose 20 mg | Regel finnes, men beregningen stopper (antipsykotikabytte-olanzapin-aripiprazol v8) | [måldose 20 mg] / [formvalg fra: Tablett] / [formvalg til: Tablett] / Måldosen 20 mg er utenfor det regelen gjelder for (10, 15 mg). | – |
| H-44 | Risperidon 2 mg tablett til Xeplion månedlig | Regel finnes, men beregningen stopper (depot-risperidon-xeplion v8) | [måldose 75 mg] / Startdosen 2 mg er utenfor det regelen gjelder for (3 mg). | – |
| H-45 | Escitalopram 10 mg byttes til sertralin 100 mg | Komplett plan til sluttmål (bytte-escitalopram-sertralin v2) | [måldose 100 mg] / Dag 1–14: Escitalopram peroralt: 5 mg = 1 tablett à 5 mg / Dag 15: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før escitalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Dag 15–28: Escitalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg / Dag 21: Vurdering (Escitalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra escitalopram til sertralin. / Dag 29: Vurdering (Sertralin): Før endringen: Vurder effekten av sertralin så langt og om økningen fortsatt trengs, hvordan sertralin tåles, og om pasienten har seponeringssymptomer etter escitalopram. / Fra dag 29: Sertralin peroralt: 100 mg = 1 tablett à 100 mg / Dag 43: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. / Dag 57: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. | – |
| H-46 | Citalopram 40 mg byttes til sertralin 50 mg | Komplett plan til sluttmål (bytte-citalopram-sertralin v2) | [måldose 50 mg] / Dag 1–14: Citalopram peroralt: 20 mg = 1 tablett à 20 mg / Dag 15: Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Dag 15–28: Citalopram peroralt: 10 mg = 1 tablett à 10 mg / Dag 29: Vurdering (Citalopram): Før endringen: Vurder seponeringssymptomer og forverring av depresjonen før citalopram reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider. / Fra dag 29: Citalopram peroralt: Seponert; Sertralin peroralt: 50 mg = 1 tablett à 50 mg / Dag 35: Vurdering (Citalopram): Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra citalopram til sertralin. / Dag 57: Vurdering (Sertralin): Vurder respons og bivirkninger av sertralin. | – |
| H-47 | Escitalopram 20 mg byttes til sertralin med måldose 150 mg | Regel finnes, men beregningen stopper (bytte-escitalopram-sertralin v2) | [måldose 150 mg] / Måldosen 150 mg er utenfor det regelen gjelder for (50, 100 mg). | – |
| H-48 | Escitalopram 15 mg byttes til sertralin 50 mg | Regel finnes, men beregningen stopper (bytte-escitalopram-sertralin v2) | [måldose 50 mg] / Startdosen 15 mg er utenfor det regelen gjelder for (10, 20 mg). / Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 10 og 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg, styrker (til) 50 og 100 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |

## Delplan vises som klinisk doseplan

Klinikerflaten skal aldri tilby en delplan som klinisk doseplan, heller ikke for tidligere godkjente regelversjoner (Peders beslutning). Hvert forløp som gjør det, er et QA-avvik som får testen til å feile: ingen.

## Minstekrav for første nyttige leveranse (målt på katalogen)

| Krav | Ulike godkjente forløp med komplett plan | Positive kasus | Minst | Oppfylt | Regler |
| --- | ---: | ---: | ---: | --- | --- |
| K1 komplette nedtrappinger | 1 | 3 | 2 | nei | seponering-escitalopram v13 |
| K2 komplette antidepressivbytter | 2 | 4 | 3 | nei | bytte-citalopram-sertralin v2, bytte-escitalopram-sertralin v2 |
| K3 komplette perorale antipsykotikabytter (peroral → peroral) | 2 | 3 | 2 | ja | antipsykotikabytte-olanzapin-aripiprazol v8, antipsykotikabytte-risperidon-aripiprazol v8 |
| K3 komplette depotrelaterte antipsykotikabytter fra et markedsført startlegemiddel | 2 | 2 | 2 | ja | depot-aripiprazol-maintena v3, depot-risperidon-xeplion v8 |
| K3 depotrelaterte der startlegemidlet bare finnes med godkjenningsfritak (telles for seg) | 1 | 1 | – | telles ikke | depot-paliperidon-xeplion v3 |
| K4 komplette tilleggsscenarier | 2 | 2 | 2 | ja | tillegg-litium-lamotrigin v2, tillegg-valproat-lamotrigin v2 |

Kravet telles i ulike klinisk godkjente forløp (regler), ikke i positive kasus: to startdoser eller to legemiddelformer i samme regel er ett forløp. Oppfylt her betyr bare at QA-testen finner så mange; klinisk godkjenning og prøve i appen kreves i tillegg (plan §8). K3 telles for seg som peroral → peroral og depotrelatert (leveranseplanen §10.4). Et depotforløp der pasientens startlegemiddel i FEST bare finnes med godkjenningsfritak (Xeplion v3 fra peroral paliperidon), vises på egen rad og teller ikke mot kravet. Alle de godkjente K3-forløpene gjelder bare avgrensede grupper og doser (se forløpene og omfanget nedenfor).

## Dekningsnevnere (alle valg i verktøyene)

| Verktøy | Valg | Beregning | Fagtekst | Ikke godkjent | Til kontroll | Ikke støttet |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trappe ned antidepressiv | 23 | 2 | 2 | 12 | 0 | 7 |
| Bytte antidepressiv | 506 | 3 | 0 | 1 | 2 | 500 |
| Bytte antipsykotikum | 1122 | 5 | 0 | 1 | 4 | 1112 |
| Kombinere stemningsstabiliserende | 110 | 2 | 0 | 0 | 0 | 108 |

## Omfangssveip for regler som gir beregning

Startdosene 0,5–400 mg (halve mg opp til 40 mg, så trinn på 5 mg), hver legemiddelform siden kan be om og hver hele måldose rundt tabellens spenn, med alle bekreftelser og nei på hvert unntak og spørsmål. Deretter, ved første dose med plan: ja på ett unntak eller spørsmål om gangen, og én bekreftelse om gangen tatt bort (en bekreftelse som bare gjelder ved et bestemt svar, med det svaret og en begrunnelse). Til slutt kontrollprøven: det svaret med begrunnelse og alle bekreftelser.

### Trappe ned antidepressiv: seponering-escitalopram v13

- Startdoser med plan: 10, 20
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak tidligere_seponeringssymptomer = ja: Regel finnes, men beregningen stopper
- unntak under_18 = ja: Regel finnes, men beregningen stopper
- unntak akutt_situasjon = ja: Regel finnes, men beregningen stopper
- unntak ustabil_dose_eller_bytte = ja: Regel finnes, men beregningen stopper
- unntak qt_forlengelse = ja: Regel finnes, men beregningen stopper
- spørsmål lang_behandlingstid = ja: Regel finnes, men beregningen stopper
- spørsmål eldre = ja: Regel finnes, men beregningen stopper
- spørsmål nedsatt_leverfunksjon = ja: Regel finnes, men beregningen stopper
- spørsmål langsom_cyp2c19 = ja: Regel finnes, men beregningen stopper
- spørsmål utenfor_doseramme = ja: Regel finnes, men beregningen stopper
- bekreftelse startforslag mangler: Regel finnes, men beregningen stopper
- bekreftelse organfunksjon_interaksjoner mangler: Regel finnes, men beregningen stopper

### Trappe ned antidepressiv: seponering-vortioksetin v12

- Startdoser med plan: ingen
- Klasse: –
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 0 planer

### Bytte antidepressiv: bytte-citalopram-sertralin v2

- Startdoser med plan: 20, 40
- Måldoser med plan: 20 → 50; 20 → 100; 40 → 50; 40 → 100
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak tidligere_seponeringssymptomer = ja: Regel finnes, men beregningen stopper
- unntak lang_behandlingstid = ja: Regel finnes, men beregningen stopper
- unntak over_65 = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_leverfunksjon = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper
- bekreftelse toleranse_bytte mangler: Regel finnes, men beregningen stopper
- bekreftelse serotonerg_sammedisinering mangler: Regel finnes, men beregningen stopper

### Bytte antidepressiv: bytte-escitalopram-sertralin v2

- Startdoser med plan: 10, 20
- Måldoser med plan: 10 → 50; 10 → 100; 20 → 50; 20 → 100
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak tidligere_seponeringssymptomer = ja: Regel finnes, men beregningen stopper
- unntak lang_behandlingstid = ja: Regel finnes, men beregningen stopper
- unntak over_65 = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_leverfunksjon = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper
- bekreftelse toleranse_bytte mangler: Regel finnes, men beregningen stopper
- bekreftelse serotonerg_sammedisinering mangler: Regel finnes, men beregningen stopper

### Bytte antidepressiv: kryssnedtrapping-sertralin-mirtazapin v10

- Startdoser med plan: ingen
- Klasse: –
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 0 planer

### Bytte antipsykotikum: depot-aripiprazol-maintena v3

- Startdoser med plan: 10, 15, 20
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 6 planer
- unntak cyp2d6_langsom = ja: Regel finnes, men beregningen stopper
- unntak sterk_cyp_hemmer = ja: Regel finnes, men beregningen stopper
- unntak cyp3a4_induktor = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper

### Bytte antipsykotikum: antipsykotikabytte-olanzapin-aripiprazol v8

- Startdoser med plan: 20
- Måldoser med plan: 20 → 10; 20 → 15
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak tilbakefall_innlagt = ja: Regel finnes, men beregningen stopper
- unntak alder_65 = ja: Regel finnes, men beregningen stopper
- unntak cyp_aripiprazol = ja: Regel finnes, men beregningen stopper
- unntak seponeringsplager = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper
- bekreftelse peroral_formulering mangler: Regel finnes, men beregningen stopper
- bekreftelse spesialist_risiko mangler: Regel finnes, men beregningen stopper
- bekreftelse siste_trinn mangler: Regel finnes, men beregningen stopper

### Bytte antipsykotikum: depot-paliperidon-xeplion v3

- Startdoser med plan: 3, 6, 9, 12
- Måldoser med plan: 3 → 50; 6 → –; 9 → –; 12 → –
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak nedsatt_nyrefunksjon = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper

### Bytte antipsykotikum: antipsykotikabytte-risperidon-aripiprazol v8

- Startdoser med plan: 4
- Måldoser med plan: 4 → 10; 4 → 15
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 2 planer
- unntak tilbakefall_innlagt = ja: Regel finnes, men beregningen stopper
- unntak alder_65 = ja: Regel finnes, men beregningen stopper
- unntak cyp_aripiprazol = ja: Regel finnes, men beregningen stopper
- unntak seponeringsplager = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper
- bekreftelse peroral_formulering mangler: Regel finnes, men beregningen stopper
- bekreftelse spesialist_risiko mangler: Regel finnes, men beregningen stopper
- bekreftelse siste_trinn mangler: Regel finnes, men beregningen stopper

### Bytte antipsykotikum: depot-risperidon-xeplion v8

- Startdoser med plan: 3
- Måldoser med plan: 3 → 75
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 1 planer
- unntak nedsatt_nyrefunksjon = ja: Regel finnes, men beregningen stopper
- unntak over_65 = ja: Regel finnes, men beregningen stopper
- unntak overvekt = ja: Regel finnes, men beregningen stopper
- unntak risperidon_interaksjon = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper
- bekreftelse tidligere_toleranse mangler: Regel finnes, men beregningen stopper
- bekreftelse effekt_toleranse mangler: Regel finnes, men beregningen stopper

### Kombinere stemningsstabiliserende: tillegg-litium-lamotrigin v2

- Startdoser med plan: 210
- Måldoser med plan: 210 → 200
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 1 planer
- unntak under_18 = ja: Regel finnes, men beregningen stopper
- unntak tidligere_reaksjon = ja: Regel finnes, men beregningen stopper
- unntak bruker_lamotrigin = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_leverfunksjon = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_nyrefunksjon = ja: Regel finnes, men beregningen stopper
- unntak graviditet = ja: Regel finnes, men beregningen stopper
- unntak hla_b1502 = ja: Regel finnes, men beregningen stopper
- unntak valproat_eller_induserende = ja: Regel finnes, men beregningen stopper
- unntak ukjent_interaksjon = ja: Regel finnes, men beregningen stopper
- spørsmål ostrogen = ja: Regel finnes, men beregningen stopper
- bekreftelse fortsetter_litium mangler: Regel finnes, men beregningen stopper
- bekreftelse aktuell_dose mangler: Regel finnes, men beregningen stopper
- bekreftelse maldose_valgt mangler: Regel finnes, men beregningen stopper
- bekreftelse ostrogen_maldose mangler (ved ostrogen = ja): Regel finnes, men beregningen stopper
- bekreftelse utslett_informert mangler: Regel finnes, men beregningen stopper
- spørsmål ostrogen = ja med begrunnelse og alle bekreftelser: Komplett plan til sluttmål

### Kombinere stemningsstabiliserende: tillegg-valproat-lamotrigin v2

- Startdoser med plan: 0,5, 1, 1,5, 2, 2,5, 3, 3,5, 4, 4,5, 5, 5,5, 6, 6,5, 7, 7,5, 8, 8,5, 9, 9,5, 10, 10,5, 11, 11,5, 12, 12,5, 13, 13,5, 14, 14,5, 15, 15,5, 16, 16,5, 17, 17,5, 18, 18,5, 19, 19,5, 20, 20,5, 21, 21,5, 22, 22,5, 23, 23,5, 24, 24,5, 25, 25,5, 26, 26,5, 27, 27,5, 28, 28,5, 29, 29,5, 30, 30,5, 31, 31,5, 32, 32,5, 33, 33,5, 34, 34,5, 35, 35,5, 36, 36,5, 37, 37,5, 38, 38,5, 39, 39,5, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110, 115, 120, 125, 130, 135, 140, 145, 150, 155, 160, 165, 170, 175, 180, 185, 190, 195, 200, 205, 210, 215, 220, 225, 230, 235, 240, 245, 250, 255, 260, 265, 270, 275, 280, 285, 290, 295, 300, 305, 310, 315, 320, 325, 330, 335, 340, 345, 350, 355, 360, 365, 370, 375, 380, 385, 390, 395, 400
- Måldoser med plan: 0,5 → 100; 1 → 100; 1,5 → 100; 2 → 100; 2,5 → 100; 3 → 100; 3,5 → 100; 4 → 100; 4,5 → 100; 5 → 100; 5,5 → 100; 6 → 100; 6,5 → 100; 7 → 100; 7,5 → 100; 8 → 100; 8,5 → 100; 9 → 100; 9,5 → 100; 10 → 100; 10,5 → 100; 11 → 100; 11,5 → 100; 12 → 100; 12,5 → 100; 13 → 100; 13,5 → 100; 14 → 100; 14,5 → 100; 15 → 100; 15,5 → 100; 16 → 100; 16,5 → 100; 17 → 100; 17,5 → 100; 18 → 100; 18,5 → 100; 19 → 100; 19,5 → 100; 20 → 100; 20,5 → 100; 21 → 100; 21,5 → 100; 22 → 100; 22,5 → 100; 23 → 100; 23,5 → 100; 24 → 100; 24,5 → 100; 25 → 100; 25,5 → 100; 26 → 100; 26,5 → 100; 27 → 100; 27,5 → 100; 28 → 100; 28,5 → 100; 29 → 100; 29,5 → 100; 30 → 100; 30,5 → 100; 31 → 100; 31,5 → 100; 32 → 100; 32,5 → 100; 33 → 100; 33,5 → 100; 34 → 100; 34,5 → 100; 35 → 100; 35,5 → 100; 36 → 100; 36,5 → 100; 37 → 100; 37,5 → 100; 38 → 100; 38,5 → 100; 39 → 100; 39,5 → 100; 40 → 100; 45 → 100; 50 → 100; 55 → 100; 60 → 100; 65 → 100; 70 → 100; 75 → 100; 80 → 100; 85 → 100; 90 → 100; 95 → 100; 100 → 100; 105 → 100; 110 → 100; 115 → 100; 120 → 100; 125 → 100; 130 → 100; 135 → 100; 140 → 100; 145 → 100; 150 → 100; 155 → 100; 160 → 100; 165 → 100; 170 → 100; 175 → 100; 180 → 100; 185 → 100; 190 → 100; 195 → 100; 200 → 100; 205 → 100; 210 → 100; 215 → 100; 220 → 100; 225 → 100; 230 → 100; 235 → 100; 240 → 100; 245 → 100; 250 → 100; 255 → 100; 260 → 100; 265 → 100; 270 → 100; 275 → 100; 280 → 100; 285 → 100; 290 → 100; 295 → 100; 300 → 100; 305 → 100; 310 → 100; 315 → 100; 320 → 100; 325 → 100; 330 → 100; 335 → 100; 340 → 100; 345 → 100; 350 → 100; 355 → 100; 360 → 100; 365 → 100; 370 → 100; 375 → 100; 380 → 100; 385 → 100; 390 → 100; 395 → 100; 400 → 100
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 152 planer
- unntak under_18 = ja: Regel finnes, men beregningen stopper
- unntak tidligere_reaksjon = ja: Regel finnes, men beregningen stopper
- unntak bruker_lamotrigin = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_leverfunksjon = ja: Regel finnes, men beregningen stopper
- unntak nedsatt_nyrefunksjon = ja: Regel finnes, men beregningen stopper
- unntak graviditet = ja: Regel finnes, men beregningen stopper
- unntak hla_b1502 = ja: Regel finnes, men beregningen stopper
- spørsmål kan_bli_gravid = ja: Komplett plan til sluttmål
- spørsmål kan_bli_far = ja: Komplett plan til sluttmål
- spørsmål ostrogen = ja: Regel finnes, men beregningen stopper
- bekreftelse fortsetter_valproat mangler: Regel finnes, men beregningen stopper
- bekreftelse ppp_indikasjon mangler (ved kan_bli_gravid = ja): Regel finnes, men beregningen stopper
- bekreftelse ppp_informasjon mangler (ved kan_bli_gravid = ja): Regel finnes, men beregningen stopper
- bekreftelse ppp_prevensjon mangler (ved kan_bli_gravid = ja): Regel finnes, men beregningen stopper
- bekreftelse ppp_graviditet mangler (ved kan_bli_gravid = ja): Regel finnes, men beregningen stopper
- bekreftelse far_informasjon mangler (ved kan_bli_far = ja): Regel finnes, men beregningen stopper
- bekreftelse far_vurdering mangler (ved kan_bli_far = ja): Regel finnes, men beregningen stopper
- bekreftelse aktuell_dose mangler: Regel finnes, men beregningen stopper
- bekreftelse maldose_valgt mangler: Regel finnes, men beregningen stopper
- bekreftelse ostrogen_maldose mangler (ved ostrogen = ja): Regel finnes, men beregningen stopper
- bekreftelse utslett_informert mangler: Regel finnes, men beregningen stopper
- spørsmål kan_bli_gravid = ja med begrunnelse og alle bekreftelser: Komplett plan til sluttmål
- spørsmål kan_bli_far = ja med begrunnelse og alle bekreftelser: Komplett plan til sluttmål
- spørsmål ostrogen = ja med begrunnelse og alle bekreftelser: Komplett plan til sluttmål

