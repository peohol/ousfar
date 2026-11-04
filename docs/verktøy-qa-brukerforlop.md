<!-- Laget av `QA_SKRIV=1 npx vitest run src/__tests__/qa`; rediger ikke for hånd. -->
# OUSFAR Verktøy – uavhengig QA av brukerforløp

Spor H i `docs/verktøy-klinisk-leveranseplan-2026-11.md`. Hvert forløp er en syntetisk, vanlig situasjon kjørt gjennom den samme veien som verktøysiden, mot de lagrede FEST-uttrekkene. Klassen er QA-testens egen vurdering av planens forløp (komplett = når sluttmålet), ikke regelens selvbeskrivelse. Dette er en måling, ikke en klinisk godkjenning.

## Måltall per leveranse

| Leveranse | Komplett plan til sluttmål | Delplan | Godkjent fagtekst | Regel finnes, men beregningen stopper | Ikke godkjent regel | Regel til kontroll | Ikke støttet | Sperret | Skjemaet krever mer | Verktøyet finnes ikke |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| K1 Trappe ned antidepressiv |  |  | 2 | 3 | 18 |  |  |  |  |  |
| K2 Bytte antidepressiv |  |  |  | 3 |  |  | 9 |  |  |  |
| K3 Bytte antipsykotikum | 2 |  |  |  | 1 |  | 7 |  |  |  |
| K4 Kombinere stemningsstabiliserende |  |  |  |  |  |  | 5 |  |  |  |

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
| K0-11 | Står på litium (4 depottabletter à 42 mg); lamotrigin legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
| K0-12 | Står på valproat; lamotrigin legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |
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
| H-38 | Står på valproat; lamotrigin legges til uten at måldosen er valgt | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | – |

## Delplan vises som klinisk doseplan

Klinikerflaten skal aldri tilby en delplan som klinisk doseplan, heller ikke for tidligere godkjente regelversjoner (Peders beslutning). Hvert forløp som gjør det, er et QA-avvik som får testen til å feile: ingen.

## Minstekrav for første nyttige leveranse (målt på katalogen)

| Krav | Komplette i katalogen | Minst | Oppfylt |
| --- | ---: | ---: | --- |
| K1 komplette nedtrappinger | 0 | 2 | nei |
| K2 komplette antidepressivbytter | 0 | 3 | nei |
| K3 komplette perorale antipsykotikabytter | 0 | 2 | nei |
| K3 komplette depotrelaterte antipsykotikabytter | 2 | 2 | ja |
| K4 komplette tilleggsscenarier | 0 | 2 | nei |

Oppfylt her betyr bare at QA-testen finner så mange komplette planer i katalogen; klinisk godkjenning og prøve i appen kreves i tillegg (plan §8).

## Dekningsnevnere (alle valg i verktøyene)

| Verktøy | Valg | Beregning | Fagtekst | Ikke godkjent | Til kontroll | Ikke støttet |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Trappe ned antidepressiv | 23 | 1 | 2 | 13 | 0 | 7 |
| Bytte antidepressiv | 506 | 1 | 0 | 1 | 0 | 504 |
| Bytte antipsykotikum | 1122 | 2 | 0 | 1 | 0 | 1119 |
| Kombinere stemningsstabiliserende | 110 | 0 | 0 | 0 | 0 | 110 |

## Omfangssveip for regler som gir beregning

Startdosene 0,5–400 mg (halve mg opp til 40 mg, så trinn på 5 mg), hver legemiddelform siden kan be om og hver hele måldose rundt tabellens spenn, med alle bekreftelser og nei på hvert unntak og spørsmål. Deretter, ved første dose med plan: ja på ett unntak eller spørsmål om gangen, og én bekreftelse om gangen tatt bort.

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

