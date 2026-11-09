# Kurateringsprosjektet «OUSFAR Fag»

Leses av koordinatoren og trådene i prosjektet «OUSFAR Fag», og av den
som endrer hvordan kurateringen er organisert. Fra 2026-10-19 kurateres og
kontrolleres fagsidene der, ikke i «OUSFAR Dev»: fagansvarlig fant ChatGPT
for upålitelig som kontrollør av faginnholdet. Hva «OUSFAR Fag», «OUSFAR Dev»
og «OUSFAR Verktøy» eier, og hvordan PR-er merkes og kontrolleres, står i
`docs/prosjektansvar.md`. ChatGPT-prosjektet «OUSFAR Fag» kontrollerer og slår
sammen PR-ene med etiketten `ansvar:fag`; det erstatter ikke den uavhengige
kontrollen av faginnholdet under.

Det faglige står i `docs/kuratorprotokoll.md` (hva som kreves) og
`docs/kontrollorinstruks.md` (hvordan det kontrolleres), vaktmesterens arbeid
i skillen `vaktmester`, og grenene i `docs/kurateringsgrener.md`. Her står
hvordan prosjektet er satt opp.

## Rollene

| Hvem | Gjør | Agent og nøkkel |
| --- | --- | --- |
| Koordinatoren | Starter og holder trådene i gang, gir signalene mellom dem og svarer fagansvarlig i prosjektchatten. Gjør ikke fagarbeid. | Ingen |
| Kurator (én fast tråd) | Kuraterer etter skillen `monografikurator` og protokollen, retter og publiserer det som er godkjent | `claude-monografkurator`, `npm run kurator`, `/mnt/project-files/.hemmelig/kurator.nokkel` |
| Kontrollør (én fast tråd) | Kontrollerer uavhengig etter skillen `monografikontrollor` og kontrollørinstruksen | `claude-monografikontrollor`, `npm run kontrollor`, `/mnt/project-files/.hemmelig/kontrollor.nokkel` |
| Vaktmester (én fast tråd) | Retter feil og mangler på fagsider som er publisert, etter skillen `vaktmester`: språket, nesten-duplikater, overskrifter som mangler, og tekniske endringer fagansvarlig ber om. Ingen omfattende faglige endringer og ingen egne litteratursøk | Som kuratoren: grenene er kuratorgrener, og kontrolløren kontrollerer dem som andre |
| Fagansvarlig (Peder) | Avgjør det bare et menneske kan avgjøre, og gir ja før en PR slås sammen der dette dokumentet krever det (nøklene) | Administrator i appen |

Databasen håndhever rollene: kuratoren kan ikke godkjenne, kontrolløren kan
ikke skrive i grenen, og ingen godkjenner en gren de selv kuraterer. Den
tillater også bare én aktiv gren per fagside, så Kurator og Vaktmester
arbeider aldri på den samme siden samtidig.

## Uavhengigheten

Kontrollen skal ikke farges av kuratorens resonnementer (forankring og
bekreftelsesskjevhet). Derfor:

1. Kurator og Kontrollør har aldri direkte kontakt. Det eneste som går mellom
   dem, er trådene i grenen i OUSFAR, der alt er sporbart.
2. Koordinatoren gir bare nøytrale signaler (under). Aldri innhold, sitater,
   funn, vurderinger eller egen mening om kvaliteten, og aldri vedlagte
   meldinger fra den andre tråden.
3. Hver tråd har sin egen arbeidsmappe, `/mnt/project-files/kurator/`,
   `/mnt/project-files/vaktmester/` og `/mnt/project-files/kontrollor/`.
   Vaktmesteren står på kuratorens side: Kurator og Vaktmester leser aldri
   kontrollørens mappe, tråd eller brief, og Kontrollør leser aldri deres.
   Overleveringer fra kuratoren er for kuratoren.
4. Prosjektminnet har bare prosessfakta om arbeidsflyten, aldri faglige
   vurderinger av et stoff.
5. Hver tråd bruker bare sin egen nøkkel. Nøklene skrives aldri ut, verken i
   repoet, i minnet eller i en melding.
6. Kontrolløren slår opp de sentrale påstandene i kildene selv før den leser
   kuratorens evidensjournal og begrunnelser (`docs/kontrollorinstruks.md`,
   steg 3 og 4).
7. En hjelpeagent en tråd starter, får de samme reglene skrevet inn i
   oppgaven sin.

## Signalene

| Tråden skriver | Koordinatoren sier til den andre tråden |
| --- | --- |
| Kurator eller Vaktmester: «Sendt til kontroll: <stoff> (gren <id>, revisjon <n>).» | Til Kontrollør: «<stoff> (gren <id>) er sendt til kontroll.» |
| Kontrollør: «Vurdert: <stoff> (gren <id>, revisjon <n>): godkjent \| endringer.» | Til tråden som sendte grenen: «Kontrolløren har vurdert <stoff> (gren <id>).» Vaktmesterens grener har et formål som begynner med «Vaktmester:». |

Kurator og Kontrollør har hver sin timekjøring som ser etter i OUSFAR selv,
så ingenting står stille om et signal uteblir.

## Prosjektinstruksene

Teksten fagansvarlig limer inn som prosjektinstrukser for koordinatoren, står
under «Claude – OUSFAR Fag» i `docs/prosjektinstrukser.md`, sammen med
instruksene til de fem andre prosjektene. Den gjentar rollene,
uavhengighetsreglene og gangen over, så de alltid er i koordinatorens kontekst.
Endres reglene her, endres den teksten i samme PR.

## Oppsettet

Briefen til tråden «Oppsett»:

```text
Sett opp nøklene til Kurator og Kontrollør i kurateringsprosjektet etter «Oppsettet» i docs/kuratering-prosjekt.md.
```

1. På en ny gren fra `main`: `npm run kurator -- nye-nokler`. Kommandoen lager
   de nøklene som mangler i `/mnt/project-files/.hemmelig/` (lesbare bare for
   eieren, og aldri overskrevet) og skriver migrasjonen
   `supabase/migrations/<tidspunkt>_kurateringsnokler.sql` med bare
   kontrollsummene. Nøklene skrives aldri ut.
2. Commit bare migrasjonen, med føringen i endringsloggen
   (`docs/endringslogg.md`), og åpne en PR med etiketten `ansvar:fag`. Be
   fagansvarlig om ja med et valgkort. ChatGPT-prosjektet «OUSFAR Fag» slår den
   sammen først etter dette ja-et.
3. Når produksjonsmigreringen har kjørt, skal både
   `npm run kurator -- kall oversikt '{}'` og
   `npm run kontrollor -- kall oversikt '{}'` svare med en liste.

Nøkkelen til kuratoren i «OUSFAR Dev» slutter å virke når migrasjonen har
kjørt. Det er meningen.

Hva trådene kan gjøre uten å spørre fagansvarlig, står i
`.claude/settings.json` (fagansvarlig ville ha trådene så selvstendige som
mulig, 2026-10-19). Det gjelder bare så lenge prosjektet har ett repo.

## Ny nøkkel

Svarer OUSFAR `403` for en rolle, eller kan en nøkkel ha kommet på avveie:
flytt nøkkelfila til samme navn med `.gammel` etter, og gjør steg 1–3 i
«Oppsettet». Den andre rollens nøkkel er den samme, og migrasjonen setter
den uendret. Slett den gamle fila når den nye virker.

## Briefen til Kurator

```text
Du er Kurator i «OUSFAR Fag». Bruk skillen monografikurator, og les docs/kuratorprotokoll.md og docs/kuratering-prosjekt.md før du begynner.
- Arbeidsmappen din er /mnt/project-files/kurator/. Les aldri /mnt/project-files/kontrollor/, Kontrollør-tråden eller briefen dens.
- Bruk bare npm run kurator, aldri npm run kontrollor.
- Be Peder laste opp overleveringsfila fra «OUSFAR Dev» (overlevering-2026-10-19.md) her i tråden, og lagre den i arbeidsmappen din. Gjør først det den sier står igjen i grenene som er der, og send dem til kontroll.
- Når en gren er sendt til kontroll, skriv én linje: «Sendt til kontroll: <stoff> (gren <id>, revisjon <n>).» Ikke noe mer om innholdet.
- Opprett en timekjøring hver time i denne tråden med beskjeden: «Kjør en kuratorrunde i OUSFAR etter skillen monografikurator.»
- Spør Peder med valgkort om det bare han kan avgjøre.
```

## Briefen til Kontrollør

```text
Du er Kontrollør i «OUSFAR Fag». Bruk skillen monografikontrollor, og les docs/kontrollorinstruks.md, docs/kuratorprotokoll.md og docs/kuratering-prosjekt.md før du begynner.
- Arbeidsmappen din er /mnt/project-files/kontrollor/. Les aldri /mnt/project-files/kurator/, Kurator-tråden eller briefen dens, overleveringsfiler eller opplastinger til Kurator.
- Bruk bare npm run kontrollor, aldri npm run kurator.
- Slå opp de sentrale påstandene i kildene selv før du leser kuratorens evidensjournal og begrunnelser.
- Når du har vurdert en gren, skriv én linje: «Vurdert: <stoff> (gren <id>, revisjon <n>): godkjent | endringer.»
- Opprett en timekjøring hver time i denne tråden med beskjeden: «Kjør en kontrollrunde i OUSFAR etter skillen monografikontrollor.»
```

## Briefen til Vaktmester

```text
Du er Vaktmester i «OUSFAR Fag». Bruk skillen vaktmester, og les docs/kuratorprotokoll.md og docs/kuratering-prosjekt.md før du begynner.
- Arbeidsmappen din er /mnt/project-files/vaktmester/. Les aldri /mnt/project-files/kontrollor/, Kontrollør-tråden eller briefen dens.
- Bruk bare npm run kurator, aldri npm run kontrollor.
- Når en gren er sendt til kontroll, skriv én linje: «Sendt til kontroll: <stoff> (gren <id>, revisjon <n>).» Ikke noe mer om innholdet.
- Spør Peder med valgkort om det bare han kan avgjøre.
```

## Hva som hører hjemme hvor

- Kurateringen, kontrollen og avgjørelsene om faginnholdet hører hjemme her.
- Endringer i appen, API-et eller kurateringsverktøyenes kode gjøres i «OUSFAR
  Dev», og endringer i verktøyene i verktøymenyen i «OUSFAR Verktøy». Trenger
  arbeidet en, lager tråden et GitHub Issue med mottakerens etikett (hva og
  hvorfor, uten faglige vurderinger av stoffer) og sier det til fagansvarlig med
  én setning (`docs/prosjektansvar.md` §4).
- Kildene hentes på nytt her; filene fra den delte mappen i «OUSFAR Dev» følger
  ikke med. Kontrolløren henter sine egne kilder.
