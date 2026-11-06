<!-- Laget av `npx vite-node src/__tests__/qa/appkontroll.ts`; rediger ikke for hånd. -->
# OUSFAR Verktøy – brukerforløpene i den publiserte appen

Kjørt 2026-11-06 08:59 UTC mot https://ousfar.vercel.app (v1.126.3) som administrator, med dagens FEST. Hvert forløp er det samme som i `docs/verktøy-qa-brukerforlop.md`, gjennomført i firestegsflyten uten «Beregn»-knapp: syntetiske doser, måldosen forløpet velger, legemiddelformen forløpet velger (ellers den siden har valgt selv, eller tablett), i steg 3 det svaret i flyten som gir forløpets ja, nei på hvert annet forhold, ja der siden sier at nei stopper planen, og kryss ved hver bekreftelse. Planen leses når steg 4 har stått i ro. Siden lastes helt på nytt for hvert forløp. Bare lesing; ingenting er lagret. «Avvik» sammenligner med den lokale kjøringen mot de lagrede FEST-uttrekkene: hele kopien linje for linje, og den synlige tidslinjen (hver rad og celle) mot kopien. Kopien i appen har i tillegg en «Forutsatt»-del med forbeholdene flyten har lagt til grunn; hver linje i den må være ordrett en bekreftelse i regelen som den lokale kjøringen også har gitt, og delen holdes ellers utenfor sammenligningen. Uten plan sammenlignes grunnen i steg 4 (med «Vis detaljer» åpnet) med den lokale: motorens tekst når beregningen er kjørt, ellers forhåndskontrollens korte forklaring med de samme tillatte startdosene, eller at ingen komplett plan kan lages når planen lokalt ikke når sluttmålet.

Planer teknisk ende-til-ende-verifisert i appen (hele kopien lik den lokale kjøringen linje for linje, bortsett fra FEST-tidspunktet): **17** (K0-01, K0-06, K0-08, K0-09, K0-11, K0-12, H-03, H-15, H-24, H-30, H-31, H-39, H-40, H-41, H-42, H-45, H-46). Dette er en teknisk verifikasjon med syntetiske data, ikke «klinisk prøveverifisert» (plan §8); det krever i tillegg en faglig gjennomgang av hele doseringsforløpet, kildene og de relevante risikoene.

## Kontroller som ikke er gjort

- Verktøyene er bare synlige for administratorer. Ingen kontroll her viser hva en kliniker ser, og ingen plan er tilgjengelig for klinikere.
- Kjøringen er en teknisk Playwright-kontroll med syntetiske pasienter, logget inn som administrator. Den er verken klinisk godkjenning eller klinisk prøving; reglenes godkjenning er kontrollørens og Peders, for nøyaktig versjon og fingeravtrykk.
- Klinisk prøving med reelle forløp (plan §8), bruk av kopien i journal eller resept og utskrift er ikke prøvd.
- Forløp med en endret FEST (avregistrert styrke) kan bare prøves mot de lagrede uttrekkene, ikke i appen.

| Id | Situasjon | Lokalt | I appen | Avvik |
| --- | --- | --- | --- | --- |
| K0-01 | Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres | Komplett plan til sluttmål | Plan | nei |
| K0-02 | Sertralin 100 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| K0-03 | Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| K0-04 | Sertralin 100 mg byttes til mirtazapin | Regel finnes, men beregningen stopper | Ingen godkjent regel gir en komplett plan for dette valget ennå. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| K0-05 | Escitalopram 20 mg byttes til mirtazapin | Regel til kontroll | Verktøyet kan ikke lage en plan for dette ennå | nei |
| K0-06 | Escitalopram 20 mg byttes til sertralin | Komplett plan til sluttmål | Plan | nei |
| K0-07 | Olanzapin 10 mg tablett byttes til aripiprazol tablett | Regel finnes, men beregningen stopper | Regelen gjelder bare startdoser på 20 mg. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| K0-08 | Risperidon 4 mg tablett byttes til aripiprazol tablett | Komplett plan til sluttmål | Plan | nei |
| K0-09 | Aripiprazol 15 mg tablett til Abilify Maintena | Komplett plan til sluttmål | Plan | nei |
| K0-10 | Risperidon 4 mg tablett til paliperidonpalmitat månedlig | Regel finnes, men beregningen stopper | Regelen gjelder bare startdoser på 3 mg. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| K0-11 | Står på litium (4 depottabletter à 42 mg); lamotrigin legges til | Komplett plan til sluttmål | Plan | nei |
| K0-12 | Står på valproat; lamotrigin legges til | Komplett plan til sluttmål | Plan | nei |
| H-01 | Vortioksetin 20 mg skal seponeres | Regel finnes, men beregningen stopper | Ingen godkjent regel gir en komplett plan for dette valget ennå. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| H-02 | Vortioksetin 10 mg skal seponeres | Regel finnes, men beregningen stopper | Ingen godkjent regel gir en komplett plan for dette valget ennå. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| H-03 | Escitalopram 20 mg skal seponeres | Komplett plan til sluttmål | Plan | nei |
| H-04 | Sertralin 50 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-05 | Citalopram 20 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-06 | Nortriptylin 50 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-07 | Mirtazapin 30 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-08 | Venlafaksin 75 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-09 | Paroksetin 20 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-10 | Fluoksetin 20 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-11 | Duloksetin 60 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-12 | Bupropion 300 mg skal seponeres | Godkjent fagtekst | En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes. | nei |
| H-13 | Agomelatin 25 mg skal seponeres | Godkjent fagtekst | Agomelatin kan seponeres uten nedtrapping. | nei |
| H-14 | Sertralin 50 mg byttes til mirtazapin | Regel finnes, men beregningen stopper | Ingen godkjent regel gir en komplett plan for dette valget ennå. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| H-15 | Citalopram 20 mg byttes til sertralin 100 mg | Komplett plan til sluttmål | Plan | nei |
| H-16 | Sertralin 100 mg byttes til escitalopram | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-17 | Escitalopram 20 mg byttes til vortioksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-18 | Fluoksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-19 | Paroksetin 20 mg byttes til sertralin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-20 | Venlafaksin 150 mg byttes til duloksetin | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-21 | Sertralin 100 mg byttes til bupropion | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-22 | Kvetiapin 400 mg byttes til aripiprazol (peroralt) | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-23 | Olanzapin 15 mg byttes til kvetiapin (peroralt) | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-24 | Paliperidon 6 mg peroralt til Xeplion | Komplett plan til sluttmål | Plan | nei |
| H-25 | Olanzapin 10 mg peroralt til olanzapin depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-26 | Risperidon depot (37,5 mg) til Xeplion | Regel til kontroll | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-27 | Haloperidol 5 mg peroralt til haloperidol depot | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-28 | Står på lamotrigin; litium legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-29 | Står på litium; valproat legges til | Ikke støttet | OUSFAR har ingen regel for denne kombinasjonen. | nei |
| H-30 | Escitalopram dråper 10 mg skal seponeres | Komplett plan til sluttmål | Plan | nei |
| H-31 | Escitalopram dråper 20 mg skal seponeres | Komplett plan til sluttmål | Plan | nei |
| H-32 | Escitalopram dråper 20 mg, lang behandlingstid | Regel finnes, men beregningen stopper | Med dette svaret kan verktøyet ikke lage en komplett plan helt til sluttmålet. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| H-33 | Nortriptylin 50 mg, lang behandlingstid | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-34 | Nortriptylin 50 mg når 10 mg-tablettene er avregistrert | Ikke godkjent regel | – | – |
| H-35 | Sertralin 200 mg skal seponeres | Ikke godkjent regel | Verktøyet kan ikke lage en plan for dette ennå | nei |
| H-36 | Vortioksetin 20 mg når 15 mg-tablettene er avregistrert | Regel finnes, men beregningen stopper | – | – |
| H-37 | Sertralin 100 mg byttes til mirtazapin når mirtazapin 15 mg er avregistrert | Regel finnes, men beregningen stopper | – | – |
| H-38 | Står på valproat; lamotrigin legges til uten at måldosen er valgt | Skjemaet krever mer | Ingen plan | nei |
| H-39 | Escitalopram 10 mg tablett, kort behandlingstid; forskriveren bytter fra tablett til dråper i skjemaet | Komplett plan til sluttmål | Plan | nei |
| H-40 | Olanzapin 20 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål | Plan | nei |
| H-41 | Risperidon 4 mg tablett byttes til aripiprazol 15 mg | Komplett plan til sluttmål | Plan | nei |
| H-42 | Risperidon 3 mg tablett til Xeplion månedlig | Komplett plan til sluttmål | Plan | nei |
| H-43 | Olanzapin 20 mg tablett byttes til aripiprazol med måldose 20 mg | Regel finnes, men beregningen stopper | Dosen er utenfor det regelen gjelder for. Kontroller dosen. | nei |
| H-44 | Risperidon 2 mg tablett til Xeplion månedlig | Regel finnes, men beregningen stopper | Regelen gjelder bare startdoser på 3 mg. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |
| H-45 | Escitalopram 10 mg byttes til sertralin 100 mg | Komplett plan til sluttmål | Plan | nei |
| H-46 | Citalopram 40 mg byttes til sertralin 50 mg | Komplett plan til sluttmål | Plan | nei |
| H-47 | Escitalopram 20 mg byttes til sertralin med måldose 150 mg | Regel finnes, men beregningen stopper | Dosen er utenfor det regelen gjelder for. Kontroller dosen. | nei |
| H-48 | Escitalopram 15 mg byttes til sertralin 50 mg | Regel finnes, men beregningen stopper | Regelen gjelder bare startdoser på 10 og 20 mg. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt. | nei |

## Nødstopp og FEST-kontroll

Forløp som ellers gir en komplett plan, med en syntetisk nødstopp («Syntetisk nødstopp i QA-kontrollen (ikke lagret).») eller en FEST-kopi som oppgis kontrollert for 72 eller 47 timer siden (grensen er 48 timer). Svaret fra databasen endres bare i nettleseren; ingen sperre eller FEST-data lagres.

«Grunnen nevnt» er om siden sier hvorfor det ikke er noen plan (nødstoppens grunn, eller at FEST-kopien ikke er kontrollert på lenge). For nødstoppen er det et krav; for FEST-kopien er det bare registrert, fordi kravet er at ingen plan vises.

| Id | Situasjon | Ventet | I appen | Grunnen nevnt | Avvik |
| --- | --- | --- | --- | --- | --- |
| N-K0-01 | Nødstopp for alle verktøy (K0-01) | Ingen plan | Ingen plan | ja: «Alle verktøyene: Syntetisk nødstopp i QA-kontrollen (ikke lagret).QA, 06.11.2026 kl. 09:58» | nei |
| N-K0-11 | Nødstopp for alle verktøy (K0-11) | Ingen plan | Ingen plan | ja: «Alle verktøyene: Syntetisk nødstopp i QA-kontrollen (ikke lagret).QA, 06.11.2026 kl. 09:58» | nei |
| F-K0-01 | FEST-kopien kontrollert for 72 timer siden (K0-01) | Ingen plan | Ingen plan | nei; steg 4 sier «Verktøyet kan ikke lage en komplett plan for dette tilfellet. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.» | nei |
| F-H-30 | FEST-kopien kontrollert for 72 timer siden (H-30) | Ingen plan | Ingen plan | nei; steg 4 sier «Verktøyet kan ikke lage en komplett plan for dette tilfellet. Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.» | nei |
| F-K0-01-47 | FEST-kopien kontrollert for 47 timer siden (under grensen på 48) (K0-01) | Plan | Plan | – | nei |
