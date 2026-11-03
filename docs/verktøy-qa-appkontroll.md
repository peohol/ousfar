<!-- Laget av `npx vite-node src/__tests__/qa/appkontroll.ts`; rediger ikke for hånd. -->
# OUSFAR Verktøy – brukerforløpene i den publiserte appen

Kjørt 2026-11-03 18:14 UTC mot https://ousfar.vercel.app (v1.124.4) som administrator, med dagens FEST. Hvert forløp er det samme som i `docs/verktøy-qa-brukerforlop.md`: syntetiske doser, alle bekreftelser og nei på hvert unntak og spørsmål, tablett når siden ber om legemiddelform. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene.

Planer prøvd i appen uten avvik (hele kopien lik linje for linje, bortsett fra FEST-tidspunktet; «klinisk prøveverifisert» i plan §8): **5**.

| Id | Situasjon | Lokalt | I appen | Avvik |
| --- | --- | --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| K0-02 | Sertralin 100 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| K0-03 | Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| K0-04 | Sertralin 100 mg byttes til mirtazapin | Delplan | Plan | nei |
| K0-05 | Escitalopram 20 mg byttes til mirtazapin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| K0-06 | Escitalopram 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| K0-07 | Olanzapin 10 mg tablett byttes til aripiprazol tablett | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| K0-08 | Risperidon 4 mg tablett byttes til aripiprazol tablett | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| K0-09 | Aripiprazol 15 mg tablett til Abilify Maintena | Komplett plan til sluttmål | Plan | nei |
| K0-10 | Risperidon 4 mg tablett til paliperidonpalmitat månedlig | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| K0-11 | Står på litium; lamotrigin legges til | Verktøyet finnes ikke | – | – |
| K0-12 | Står på valproat; lamotrigin legges til | Verktøyet finnes ikke | – | – |
| H-01 | Vortioksetin 20 mg skal seponeres | Delplan | Plan | nei |
| H-02 | Vortioksetin 10 mg skal seponeres | Regel finnes, men beregningen stopper | vortioksetin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. | nei |
| H-03 | Escitalopram 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-04 | Sertralin 50 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-05 | Citalopram 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-06 | Nortriptylin 50 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-07 | Mirtazapin 30 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-08 | Venlafaksin 75 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-09 | Paroksetin 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-10 | Fluoksetin 20 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-11 | Duloksetin 60 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-12 | Bupropion 300 mg skal seponeres | Godkjent fagtekst | En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes. | nei |
| H-13 | Agomelatin 25 mg skal seponeres | Godkjent fagtekst | Agomelatin kan seponeres uten nedtrapping. | nei |
| H-14 | Sertralin 50 mg byttes til mirtazapin | Delplan | Plan | nei |
| H-15 | Citalopram 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-16 | Sertralin 100 mg byttes til escitalopram | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-17 | Escitalopram 20 mg byttes til vortioksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-18 | Fluoksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-19 | Paroksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-20 | Venlafaksin 150 mg byttes til duloksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-21 | Sertralin 100 mg byttes til bupropion | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-22 | Kvetiapin 400 mg byttes til aripiprazol (peroralt) | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-23 | Olanzapin 15 mg byttes til kvetiapin (peroralt) | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-24 | Paliperidon 6 mg peroralt til Xeplion | Komplett plan til sluttmål | Plan | nei |
| H-25 | Olanzapin 10 mg peroralt til olanzapin depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-26 | Risperidon depot (37,5 mg) til Xeplion | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-27 | Haloperidol 5 mg peroralt til haloperidol depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-28 | Står på lamotrigin; litium legges til | Verktøyet finnes ikke | – | – |
| H-29 | Står på litium; valproat legges til | Verktøyet finnes ikke | – | – |
