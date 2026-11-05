<!-- Laget av `npx vite-node src/__tests__/qa/appkontroll.ts`; rediger ikke for hånd. -->
# OUSFAR Verktøy – brukerforløpene i den publiserte appen

Kjørt 2026-11-05 09:59 UTC mot https://ousfar.vercel.app (v1.125.6) som administrator, med dagens FEST. Hvert forløp er det samme som i `docs/verktøy-qa-brukerforlop.md`: syntetiske doser, alle bekreftelser og nei på hvert unntak og spørsmål (ja der forløpet svarer ja), måldosen forløpet velger, tablett når siden ber om legemiddelform med mindre forløpet velger en annen form eller bytter form underveis. Siden lastes helt på nytt for hvert forløp. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene: hele kopien linje for linje, og den synlige tidslinjen (hver rad og celle) mot kopien.

Planer teknisk ende-til-ende-verifisert i appen (hele kopien lik den lokale kjøringen linje for linje, bortsett fra FEST-tidspunktet): **15** (K0-06, K0-08, K0-09, K0-11, K0-12, H-15, H-24, H-30, H-31, H-39, H-40, H-41, H-42, H-45, H-46). Dette er en teknisk verifikasjon med syntetiske data, ikke «klinisk prøveverifisert» (plan §8); det krever i tillegg en faglig gjennomgang av hele doseringsforløpet, kildene og de relevante risikoene.

## Kontroller som ikke er gjort

- Verktøyene er bare synlige for administratorer. Ingen kontroll her viser hva en kliniker ser, og ingen plan er tilgjengelig for klinikere.
- Kjøringen er en teknisk Playwright-kontroll med syntetiske pasienter, logget inn som administrator. Den er verken klinisk godkjenning eller klinisk prøving; reglenes godkjenning er kontrollørens og Peders, for nøyaktig versjon og fingeravtrykk.
- Klinisk prøving med reelle forløp (plan §8), bruk av kopien i journal eller resept og utskrift er ikke prøvd.
- Forløp med en endret FEST (avregistrert styrke) kan bare prøves mot de lagrede uttrekkene, ikke i appen.

| Id | Situasjon | Lokalt | I appen | Avvik |
| --- | --- | --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres | Regel finnes, men beregningen stopper | escitalopram dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig og ikke under 1 mg. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. | nei |
| K0-02 | Sertralin 100 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| K0-03 | Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| K0-04 | Sertralin 100 mg byttes til mirtazapin | Regel finnes, men beregningen stopper | Ingen plan | nei |
| K0-05 | Escitalopram 20 mg byttes til mirtazapin | Regel til kontroll | Beregning er ikke tilgjengelig | nei |
| K0-06 | Escitalopram 20 mg byttes til sertralin | Komplett plan til sluttmål | Plan | nei |
| K0-07 | Olanzapin 10 mg tablett byttes til aripiprazol tablett | Regel finnes, men beregningen stopper | Ingen plan | nei |
| K0-08 | Risperidon 4 mg tablett byttes til aripiprazol tablett | Komplett plan til sluttmål | Plan | nei |
| K0-09 | Aripiprazol 15 mg tablett til Abilify Maintena | Komplett plan til sluttmål | Plan | nei |
| K0-10 | Risperidon 4 mg tablett til paliperidonpalmitat månedlig | Regel finnes, men beregningen stopper | Ingen plan | nei |
| K0-11 | Står på litium (4 depottabletter à 42 mg); lamotrigin legges til | Komplett plan til sluttmål | Plan | nei |
| K0-12 | Står på valproat; lamotrigin legges til | Komplett plan til sluttmål | Plan | nei |
| H-01 | Vortioksetin 20 mg skal seponeres | Regel finnes, men beregningen stopper | Komplett plan ikke tilgjengelig: vortioksetin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | nei |
| H-02 | Vortioksetin 10 mg skal seponeres | Regel finnes, men beregningen stopper | vortioksetin dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Nærmeste doser som kan settes sammen: 5 mg (-33,33 %, faktisk reduksjon 50 % fra 10 mg) og 10 mg (+33,33 %). Den foretrukne reduksjonen til 7,5 mg (−25 % fra 10 mg) kan ikke gis med preparatene, og ingen dose som kan gis, har en faktisk reduksjon innenfor det foretrukne området 5–25 %. En større reduksjon er et avvik fra den foretrukne reduksjonen; verktøyet tilbyr eller beregner den ikke, og en annen plan må vurderes individuelt utenfor verktøyet. | nei |
| H-03 | Escitalopram 20 mg skal seponeres | Regel finnes, men beregningen stopper | Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg). | nei |
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
| H-14 | Sertralin 50 mg byttes til mirtazapin | Regel finnes, men beregningen stopper | Ingen plan | nei |
| H-15 | Citalopram 20 mg byttes til sertralin 100 mg | Komplett plan til sluttmål | Plan | nei |
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
| H-26 | Risperidon depot (37,5 mg) til Xeplion | Regel til kontroll | Beregning er ikke tilgjengelig | nei |
| H-27 | Haloperidol 5 mg peroralt til haloperidol depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-28 | Står på lamotrigin; litium legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-29 | Står på litium; valproat legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-30 | Escitalopram dråper 10 mg skal seponeres | Komplett plan til sluttmål | Plan | nei |
| H-31 | Escitalopram dråper 20 mg skal seponeres | Komplett plan til sluttmål | Plan | nei |
| H-32 | Escitalopram dråper 20 mg, lang behandlingstid | Regel finnes, men beregningen stopper | Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg). | nei |
| H-33 | Nortriptylin 50 mg, lang behandlingstid | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-34 | Nortriptylin 50 mg når 10 mg-tablettene er avregistrert | Ikke godkjent regel | – | – |
| H-35 | Sertralin 200 mg skal seponeres | Ikke godkjent regel | Beregning er ikke tilgjengelig | nei |
| H-36 | Vortioksetin 20 mg når 15 mg-tablettene er avregistrert | Regel finnes, men beregningen stopper | – | – |
| H-37 | Sertralin 100 mg byttes til mirtazapin når mirtazapin 15 mg er avregistrert | Regel finnes, men beregningen stopper | – | – |
| H-38 | Står på valproat; lamotrigin legges til uten at måldosen er valgt | Skjemaet krever mer | Ingen plan | nei |
| H-39 | Escitalopram 10 mg tablett, kort behandlingstid; forskriveren bytter til dråper etter at tablettvalget ikke ga plan | Komplett plan til sluttmål | Plan | nei |
| H-40 | Olanzapin 20 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål | Plan | nei |
| H-41 | Risperidon 4 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål | Plan | nei |
| H-42 | Risperidon 3 mg tablett til Xeplion månedlig | Komplett plan til sluttmål | Plan | nei |
| H-43 | Olanzapin 20 mg tablett byttes til aripiprazol med måldose 20 mg | Regel finnes, men beregningen stopper | Ingen plan | nei |
| H-44 | Risperidon 2 mg tablett til Xeplion månedlig | Regel finnes, men beregningen stopper | Ingen plan | nei |
| H-45 | Escitalopram 10 mg byttes til sertralin 100 mg | Komplett plan til sluttmål | Plan | nei |
| H-46 | Citalopram 40 mg byttes til sertralin 50 mg | Komplett plan til sluttmål | Plan | nei |
| H-47 | Escitalopram 20 mg byttes til sertralin med måldose 150 mg | Regel finnes, men beregningen stopper | Ingen plan | nei |
| H-48 | Escitalopram 15 mg byttes til sertralin 50 mg | Regel finnes, men beregningen stopper | Ingen plan | nei |
