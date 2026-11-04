<!-- Laget av `QA_SKRIV=1 npx vitest run src/__tests__/qa`; rediger ikke for hånd. -->
# OUSFAR Verktøy – uavhengig QA av brukerforløp

Spor H i `docs/verktøy-klinisk-leveranseplan-2026-11.md`. Hvert forløp er en syntetisk, vanlig situasjon kjørt gjennom den samme veien som verktøysiden, mot de lagrede FEST-uttrekkene. Klassen er QA-testens egen vurdering av planens forløp (komplett = når sluttmålet), ikke regelens selvbeskrivelse. Dette er en måling, ikke en klinisk godkjenning.

## Måltall per leveranse

| Leveranse | Komplett plan til sluttmål | Delplan | Godkjent fagtekst | Regel finnes, men beregningen stopper | Ikke godkjent regel | Regel til kontroll | Ikke støttet | Sperret | Skjemaet krever mer | Verktøyet finnes ikke |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| K1 Trappe ned antidepressiv |  |  | 2 | 3 | 18 |  |  |  |  |  |
| K2 Bytte antidepressiv |  |  |  | 3 |  |  | 9 |  |  |  |
| K3 Bytte antipsykotikum | 2 |  |  |  | 1 |  | 7 |  |  |  |
| K4 Kombinere stemningsstabiliserende | 2 |  |  |  |  |  | 2 |  | 1 |  |

## Forløpene

| Id | Situasjon | Utfall | Det brukeren ser | Avvik |
| --- | --- | --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| K0-02 | Sertralin 100 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| K0-03 | Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| K0-04 | Sertralin 100 mg byttes til mirtazapin | Regel finnes, men beregningen stopper (kryssnedtrapping-sertralin-mirtazapin v10) | [formvalg til: Tablett] / Komplett plan ikke tilgjengelig: sertralin: siste trinn før null; avslutning vurderes individuelt; mirtazapin: holdes til sertralin er avsluttet; videre dosering planlegges individuelt. | – |
| K0-05 | Escitalopram 20 mg byttes til mirtazapin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-06 | Escitalopram 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-07 | Olanzapin 10 mg tablett byttes til aripiprazol tablett | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-08 | Risperidon 4 mg tablett byttes til aripiprazol tablett | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-09 | Aripiprazol 15 mg tablett til Abilify Maintena | Komplett plan til sluttmål (depot-aripiprazol-maintena v3) | [formvalg fra: Tablett] / Dag 1–14: Aripiprazol peroralt: 15 mg = 1 tablett à 15 mg / Dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg / Fra dag 15: Aripiprazol peroralt: Seponert / Hver måned fra 1 måned etter dag 1: Aripiprazol depotinjeksjon 400 mg = 1 injeksjon à 400 mg (tidligst 26 dager etter forrige) | – |
| K0-10 | Risperidon 4 mg tablett til paliperidonpalmitat månedlig | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-11 | Står på litium (4 depottabletter à 42 mg); lamotrigin legges til | Komplett plan til sluttmål (tillegg-litium-lamotrigin v2) | Dag 1–14: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg / Dag 15: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 15: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 15–28: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg / Dag 29: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 29: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 29–35: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg / Dag 36: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 36: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Fra dag 36: Litium peroralt: 168 mg Li⁺ (24 mmol) = 4 tabletter Lithionit 42 mg depottablett; uendret dose, bekreftet av forskriveren som aktuell behandling og kontrollert mot regelens tillatte doser, ikke mot FEST; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg / Dag 36: Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater. / Dag 36: Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke. | – |
| K0-12 | Står på valproat; lamotrigin legges til | Komplett plan til sluttmål (tillegg-valproat-lamotrigin v2) | Dag 1–14: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg / Dag 15: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 15: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 15–28: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg / Dag 29: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 29: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Dag 29–35: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg / Dag 36: Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. / Dag 36: Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. / Fra dag 36: Valproat peroralt: 1000 mg natriumvalproat (preparat og fordeling som i legemiddellisten) = uendret dose, bekreftet av forskriveren og ikke kontrollert; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg / Dag 36: Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater. / Dag 36: Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke. | – |
| H-01 | Vortioksetin 20 mg skal seponeres | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | Komplett plan ikke tilgjengelig: vortioksetin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | – |
| H-02 | Vortioksetin 10 mg skal seponeres | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | vortioksetin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. / Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (kontrollert: 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10, 15 og 20 mg). Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-03 | Escitalopram 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
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
| H-15 | Citalopram 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
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
| H-26 | Risperidon depot (37,5 mg) til Xeplion | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-27 | Haloperidol 5 mg peroralt til haloperidol depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-28 | Står på lamotrigin; litium legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-29 | Står på litium; valproat legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| H-30 | Escitalopram dråper 10 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-31 | Escitalopram dråper 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-32 | Escitalopram dråper 20 mg, lang behandlingstid | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-33 | Nortriptylin 50 mg, lang behandlingstid | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-34 | Nortriptylin 50 mg når 10 mg-tablettene er avregistrert | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-35 | Sertralin 200 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig: regelen er kontrollert, men ikke godkjent for klinisk beregning. | – |
| H-36 | Vortioksetin 20 mg når 15 mg-tablettene er avregistrert | Regel finnes, men beregningen stopper (seponering-vortioksetin v12) | vortioksetin (fra): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-37 | Sertralin 100 mg byttes til mirtazapin når mirtazapin 15 mg er avregistrert | Regel finnes, men beregningen stopper (kryssnedtrapping-sertralin-mirtazapin v10) | [formvalg til: Tablett] / mirtazapin (til): styrken 15 mg som det kliniske omfanget er kontrollert med, finnes ikke lenger i FEST, så planen ville blitt satt sammen annerledes enn den som er kontrollert. Planen er utenfor det kliniske omfanget regelen er kontrollert for, og må vurderes individuelt utenfor verktøyet. | – |
| H-38 | Står på valproat; lamotrigin legges til uten at måldosen er valgt | Skjemaet krever mer | Måldosen må fylles inn som et tall større enn 0. | – |

## Delplan vises som klinisk doseplan

Klinikerflaten skal aldri tilby en delplan som klinisk doseplan, heller ikke for tidligere godkjente regelversjoner (Peders beslutning). Hvert forløp som gjør det, er et QA-avvik som får testen til å feile: ingen.

## Minstekrav for første nyttige leveranse (målt på katalogen)

| Krav | Komplette i katalogen | Minst | Oppfylt |
| --- | ---: | ---: | --- |
| K1 komplette nedtrappinger | 0 | 2 | nei |
| K2 komplette antidepressivbytter | 0 | 3 | nei |
| K3 komplette perorale antipsykotikabytter | 0 | 2 | nei |
| K3 komplette depotrelaterte antipsykotikabytter | 2 | 2 | ja |
| K4 komplette tilleggsscenarier | 2 | 2 | ja |

Oppfylt her betyr bare at QA-testen finner så mange komplette planer i katalogen; klinisk godkjenning og prøve i appen kreves i tillegg (plan §8).

## Dekningsnevnere (alle valg i verktøyene)

| Verktøy | Valg | Beregning | Fagtekst | Ikke godkjent | Til kontroll | Ikke støttet |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trappe ned antidepressiv | 23 | 1 | 2 | 13 | 0 | 7 |
| Bytte antidepressiv | 506 | 1 | 0 | 1 | 0 | 504 |
| Bytte antipsykotikum | 1122 | 2 | 0 | 1 | 0 | 1119 |
| Kombinere stemningsstabiliserende | 110 | 2 | 0 | 0 | 0 | 108 |

## Omfangssveip for regler som gir beregning

Startdosene 0,5–400 mg (halve mg opp til 40 mg, så trinn på 5 mg), hver legemiddelform siden kan be om og hver hele måldose rundt tabellens spenn, med alle bekreftelser og nei på hvert unntak og spørsmål. Deretter, ved første dose med plan: ja på ett unntak eller spørsmål om gangen, og én bekreftelse om gangen tatt bort (en bekreftelse som bare gjelder ved et bestemt svar, med det svaret og en begrunnelse). Til slutt kontrollprøven: det svaret med begrunnelse og alle bekreftelser.

### Trappe ned antidepressiv: seponering-vortioksetin v12

- Startdoser med plan: ingen
- Klasse: –
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 0 planer

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

### Bytte antipsykotikum: depot-paliperidon-xeplion v3

- Startdoser med plan: 3, 6, 9, 12
- Måldoser med plan: 3 → 50; 6 → –; 9 → –; 12 → –
- Klasse: Komplett plan til sluttmål
- QA-avvik i planene: 0
- Delplan vises som klinisk doseplan: 0 av 4 planer
- unntak nedsatt_nyrefunksjon = ja: Regel finnes, men beregningen stopper
- bekreftelse indikasjon mangler: Regel finnes, men beregningen stopper

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

