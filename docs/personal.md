# OUSFAR Personal

**Styringsdokumentet for prosjektområdet OUSFAR Personal**: formålet,
avgrensningen, personvernet, produktaksepten og det første arbeidsløpet for
personalfunksjonene i OUSFAR. Eies av OUSFAR Personal (`ansvar:personal`);
endringer gjøres i PR-er derfra. Opprettet av OUSFAR Dev 24.11.2026 i
etableringen av prosjektet ([#558](https://github.com/peohol/ousfar/issues/558)).

Hvem som eier hva, hvem som er ansvarlig, overlevering og PR-kontroll står i
[prosjektansvar.md](prosjektansvar.md), som er felles fasit og går foran dette
dokumentet der de overlapper. Prosjektinstruksene står i
[prosjektinstrukser.md](prosjektinstrukser.md), og ChatGPTs kontroll følger
[PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md) med avsnitt 3.5 om
ikke-kliniske personalfunksjoner.

**Status 26.11.2026:** ingen personalfunksjon er bygd i OUSFAR; prototypen i `peohol/vaktplan` er referanse (§7.1). Dokumentet er rammen
den bygges innenfor; konkrete regler legges til her når de er vedtatt (§6).

## 1. Formål

Laboratoriene skal kunne planlegge arbeidet og organisere seg internt i OUSFAR:
hvem som har vakt, hvem som er til stede, og hvordan arbeidsoppgavene og
belastningen er fordelt. Målet er en praktisk, forståelig og etterprøvbar
arbeidsplan, ikke et HR-system.

## 2. Ansvarsområdet

**Personal eier** arbeidsplanlegging og intern organisering, både
funksjonalitet, regler, kode, UI og UX, tester og de styrende planene:

- vaktplaner, vaktfordeling og vaktbytter
- tilstedeværelse og fravær, som planleggingsstatus (§3)
- personalkalenderen
- intern fordeling av arbeidsoppgaver
- statistikk over arbeidsbelastning
- personalspesifikke moduler på dashboardet, som vaktplanens modul
- tilgangsreglene som er særegne for personalfunksjonene, som hvem som ser og
  redigerer vaktplanen
- migrasjoner som bare gjelder personalfunksjonene

**Personal eier ikke:**

| Hva | Eier |
| --- | --- |
| Appens felles UI, designsystemet, navigasjonen og det felles modulrammeverket for dashboardet | OUSFAR Dev |
| Brukerkontoene, innloggingen og de generelle mekanismene for tilgang og roller | OUSFAR Dev |
| Felles teknisk infrastruktur, CI og de felles styringsdokumentene | OUSFAR Dev |
| Faginnholdet på fagsidene og kurateringen | OUSFAR Fag |
| Verktøyene i verktøymenyen | OUSFAR Verktøy |

Eierskapet følger formålet, ikke filene ([prosjektansvar.md](prosjektansvar.md)
§2). En personalfunksjon blir ikke Verktøys fordi den har en beregningsmotor
eller ligger i en meny. Trenger en personalfunksjon en **selvstendig** endring
av noe felles, som modulrammeverket eller tilgangsmodellen, skilles den ut som
et Issue til Dev med avhengigheten skrevet ned i begge.

**Ingen generell HR-plattform.** Lønn, personalmapper, ansettelser,
medarbeidersamtaler, kompetanseregister og lignende er ikke bestilt og innføres
ikke uten særskilt bestilling fra Peder.

## 3. Personvern

Personalopplysninger er opplysninger om identifiserbare ansatte. Reglene under
gjelder alle personalfunksjoner, i tillegg til forbudet mot pasientopplysninger
([pasientopplysninger.md](pasientopplysninger.md)), som gjelder uendret, også
fritekst, logger, eksport og integrasjoner.

### 3.1 Ingen reelle personalopplysninger i utviklingen

Repoet og GitHub er offentlige. Det skal **aldri** ligge reelle ansattlister,
vaktplaner, fraværsopplysninger eller andre personalopplysninger i:

- repoet, Issues, PR-er, kommentarer eller commit-meldinger
- testdata, fixtures, skjermbilder, logger eller rapporter
- prosjektminnet, prosjektfilene eller agentkonteksten under utvikling

Utvikling og tester bygger bare på **syntetiske ansatte** med oppdiktede navn.
Oppdages reelle personalopplysninger, fjernes de uten å gjentas, og den som
kontrollerer, omtaler funnet uten å sitere dem.

### 3.2 Hva som registreres

- Som utgangspunkt bare planleggingsrelevant **status og tid**: til stede,
  borte, vakt, fri og tilsvarende, med tidsrom.
- **Ikke** fraværsgrunn, diagnoser, helseopplysninger eller annen sensitiv
  fritekst. Et eventuelt kommentarfelt avgrenses til ikke-sensitive
  planleggingsopplysninger og har samme stille avvisning av fødselsnummerlignende
  tekst som resten av appen.
- Behov for mer detaljerte personalopplysninger avklares før noe bygges (§3.4).

### 3.3 Tilgang

- Personalopplysninger avgrenses som hovedregel til **eget laboratorium eller
  fagmiljø**.
- Tre nivåer holdes atskilt: **kollegers innsyn** (se planen), **vaktplanleggerens
  redigering** (lage, endre og publisere) og **administrativ myndighet** (hvem
  som er vaktplanlegger). Hvem som har hvilket nivå, vedtas før implementering.
- Appens globale systemarkitektrolle gir **ikke i seg selv** innsyn i ansattes
  opplysninger.
- Minste nødvendige tilgang, **håndhevet på serversiden** (radnivåsikkerhet i
  databasen), aldri bare i grensesnittet.
- Hver tilgangsregel testes også negativt: en bruker i et annet laboratorium,
  en kollega uten planleggerrolle og en systemarkitekt uten egen tilknytning
  skal ikke se eller endre det de ikke skal.

### 3.4 Før bruk med reelle opplysninger

En teknisk sammenslåing er **ingen personvern- eller arbeidstidsrettslig
godkjenning** ([prosjektansvar.md](prosjektansvar.md) §7). Før en personalfunksjon
tas i bruk med reelle opplysninger, må dette være avklart med ansvarlig
virksomhet og ført inn her:

- hvilke opplysninger som trengs, og hvorfor
- hvem som har innsyn og redigering (§3.3)
- oppbevaringstid og sletting
- revisjonsspor: hva som logges om endringer, og hvem som ser det
- reell bruk og hvem som er ansvarlig i virksomheten

Til det er avklart, står funksjonen av i produksjon eller er bare tilgjengelig
med syntetiske data.

## 4. Produktprinsipper

- **Automatisk vaktfordeling er et forslag.** Den skal være forståelig og
  etterprøvbar (det skal gå an å se hvorfor en vakt havnet der den gjorde),
  støtte manuelle justeringer og vaktbytter, og et beregnet forslag skal være
  tydelig skilt fra en godkjent og publisert plan.
- **Reglene vedtas før de bygges.** Konkrete fordelings- og arbeidstidsregler
  forankres i §6 før implementering, med eksempler som gir en uavhengig fasit.
- **Enkelt først.** Kalender med dag, uke og måned, enkle statuser og manuelle
  justeringer, og en planlagt visning på dashboardet.
- Samme krav til tastatur, tilgjengelighet, mobil og `useBevart` som resten av
  appen ([AGENTS.md](../AGENTS.md)).

## 5. Produktaksept og kontroll

PR-er fra Personal kontrolleres av ChatGPT-prosjektet OUSFAR Personal etter
[PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md), særlig avsnitt 3.5.
Hver PR som endrer en personalfunksjon, viser i beskrivelsen:

1. **Formålet:** hvilket vedtak i dette dokumentet den oppfyller.
2. **Arbeidsforløp med syntetiske ansatte:** minst ett representativt forløp
   (lage plan, fordele, bytte, justere, registrere fravær, publisere) og de
   negative tilfellene (konflikter, manglende bemanning, ugyldige bytter,
   deltid, lange fravær).
3. **Beregningsreglene:** testet mot den uavhengige fasiten i §6, ikke bare mot
   hverandre.
4. **Tilgangen:** positive og negative tester på tvers av laboratorier og
   roller (§3.3).
5. **Virkninger utenfor Personal:** felles komponenter, dashboardet,
   tilgangsmodellen og databasen.

Teknisk PR-godkjenning, produktaksept og godkjenning for bruk med reelle
opplysninger (§3.4) er separate beslutninger.

## 6. Vedtatte regler

Konkrete regler for vaktfordeling, arbeidstid og tilgang føres inn her når de er
vedtatt, med dato, hvem som vedtok og eksempler med syntetiske ansatte som
fasit. Ellers gjelder produktpremissene i §7.2.

### 6.1 Rettferdig vaktfordeling over tid

Vedtatt av Peder 26.11.2026, i prototypen i `peohol/vaktplan`
([vaktplan#14](https://github.com/peohol/vaktplan/issues/14),
[#594](https://github.com/peohol/ousfar/issues/594)).

- **Historisk utjevning går foran rettferdighet i perioden isolert sett.**
  Fordelingen jevner ut skjevheter fra tidligere vakter, og vurderer ikke
  bare den nye perioden alene. Rekkefølgen er:
  1. Harde krav (kvalifikasjon, fravær, høyst én status per dag) og best
     mulig dekning.
  2. Historisk utjevning: høy vekt.
  3. Avstand mellom vakter og jevn belastning over tid: høy vekt.
  4. Rettferdighet i den nye perioden isolert sett: lavere vekt.
  5. Variasjon i ukedager: lavere vekt.
- **Historisk utjevning og rettferdighet i perioden har hver sin vekt**, og
  begge kan justeres i regelsettet.
- **Tidshorisonten for historisk utjevning kan stilles.** Standard er
  365 dager bakover fra slutten av perioden som fordeles.
- **Vakt 1 og vakt 2 utjevnes hver for seg.** En oppdatering av vaktplanen
  beholder tildelinger som fortsatt er gyldige.
- **Forventet antall** regnes ut fra stillingskategori, vekter,
  kvalifikasjoner og tilstedeværelse, etter reglene som gjaldt hver dag. For
  tidligere dager bygger det på vaktene som faktisk står i kalenderen.
  **Manglende historikk gjør derfor ikke i seg selv at noen ser ut til å ha
  for få vakter**, for eksempel en nyansatt eller en periode uten
  registreringer.
- **Vaktbelastningen skal kunne etterprøves.** En oversikt viser per
  medarbeider og vakttype antall, forventet antall og avvik over et valgt
  tidsrom. Med et forslag vises også antall i forslaget, samlet etter
  godkjenning og avviket etterpå, over det samme tidsrommet. En vakt som
  flyttes til en annen, telles bare én gang.

**Fasit (syntetiske medarbeidere A og B):**

| | Tidligere vakter | Ny periode | Samlet | Forventet samlet |
| --- | --- | --- | --- | --- |
| A | 12 | 3 | 15 | 15 |
| B | 8 | 7 | 15 | 15 |

Begge har forventet 10 tidligere vakter og 5 i den nye perioden. Fordelingen
3 og 7 er et godt resultat, selv om den er skjev sett isolert for den nye
perioden.

## 7. Første arbeidsløp: vaktplanen

### 7.1 Utgangspunktet

Repoet [`peohol/vaktplan`](https://github.com/peohol/vaktplan) (privat) er
referanse og prototype. Det skal beholdes som det er til integrasjonen i
OUSFAR er verifisert, og arkiveres ikke nå. Ved etableringen 24.11.2026 hadde
det tre filer: en tom `README.md` og to regneark, `Vaktfordeling.xlsx` (ett ark
med formler, som ser ut til å være fordelingsberegningen) og `vaktplan.xlsx`
(ett ark med en planoversikt uten formler).

Regnearkene må **regnes som å inneholde reelle personalopplysninger**. Innholdet
kopieres derfor aldri inn i OUSFAR, GitHub eller agentkonteksten (§3.1). Til
kartleggingen holder det å lese strukturen: arkoppsettet, formlene med
tekstkonstanter og cellereferanser til navn maskert, og tallmønstrene uten
navn. Det Personal trenger ut over det, beskrives med syntetiske eksempler, og
reglene bak avklares med Peder i prosjekttråden.

### 7.2 Produktpremisser som er besluttet

- **Motsatte stillingsvekter for vakt 1 og vakt 2.**
- Fordelingen tar hensyn til **prosent tilstedeværelse** og **avstand mellom
  vakter**.
- **Overleger skal ha færre vakt 1**, men ikke nødvendigvis færre vakter totalt.
- Excel-arket er **ikke et krav om eksakt algoritme**; det viser hensikten.
- Kalender med **dag, uke og måned**, **enkle statuser**, **manuelle
  justeringer** og en planlagt **visning på dashboardet**.

Besluttet av Peder 25.11.2026, i prototypen i `peohol/vaktplan` (PR #5):

- **Ingen arbeidsmønster eller stillingsandel.** Mønstrene varierer, og noen
  i redusert stilling er til stede hver dag og kan ha vakt hver ukedag. Alle
  aktive medarbeidere regnes som til stede på hverdager som ikke er
  helligdager; fravær, også ved deltid, registreres i kalenderen. Prosent
  tilstedeværelse i fordelingen regnes derfor ut fra kalenderen, ikke fra en
  stillingsandel.
- **Forskning, undervisning og ønske om fri regnes som borte** i
  planleggingen.
- ~~Hjemmekontor, forskning, undervisning, annen oppgave og ønske om fri
  utelukker vakt 1 og vakt 2 samme dag.~~ Erstattet 26.11.2026 av regelen om
  én status per dag nedenfor, som gjør egne eksklusjonsregler unødvendige.

Besluttet av Peder 26.11.2026, i prototypen i `peohol/vaktplan`
([vaktplan#12](https://github.com/peohol/vaktplan/issues/12),
[#590](https://github.com/peohol/ousfar/issues/590)):

- **Én status per medarbeider per dag.** Statusene utelukker hverandre,
  uansett klokkeslett. Det finnes derfor ingen kombinasjons- eller
  eksklusjonsregler. **Ingen status betyr til stede** på ordinære
  arbeidsdager. Datamodellen håndhever regelen (høyst én status per
  medarbeider og dato, og høyst én medarbeider per vakttype og dato).
- **Standardoppsettet har to kategorier**, hver status med et ikon fra ett
  felles ikonbibliotek (ingen emojier):
  - *På kontoret:* Vakt 1, Vakt 2, Referent og Opplæring.
  - *Ikke på kontoret:* Borte, Hjemmekontor, Forskning, Undervisning,
    Avspasering, Fri og Ønske om fri.

  Statusene skal senere kunne konfigureres per fagmiljø, men det bygges
  ikke noe administrasjonsgrensesnitt for dem nå. Borte registreres uten
  grunn.
- **Samme redigeringsboble i alle visninger.** I dag-, uke- og
  månedsvisningen åpner et klikk på en status eller et navn boblen direkte
  for den medarbeideren og datoen, uten omvei om dagsvisningen. Viser en
  linje i månedsvisningen flere medarbeidere, velger man først hvem.
- **Endringer lagres med en gang og kan angres.** En status settes ved å
  velge den og fjernes med slett, ved et nytt klikk på den valgte statusen
  eller ved dobbeltklikk på statusen direkte i kalenderen.
- **Statuser på kontoret gjelder arbeidsdager.** Vakt krever kvalifikasjon
  for akkurat den vakttypen.
- **Merknad er valgfritt på alle statuser** og skal bare inneholde
  ikke-sensitive planleggingsopplysninger (§3.2). Merknaden og klokkeslettet
  beholdes når statusen byttes.
- **Merknad og klokkeslett vises ved statusen.** Dagsvisningen viser dem
  direkte. Uke-, måneds- og helårsvisningen viser et merknadsikon og
  opplysningene i en informasjonsboble, som også kan nås med tastatur og
  berøring.
- **Klokkeslett er bare tilleggsinformasjon.** Standard er «hele dagen». Et
  tidsrom kan oppgis, men påvirker verken tilstedeværelse eller
  vaktfordeling. Et ugyldig tidsrom kan ikke lagres.
- **Overtakelse av vakt.** Velger man en vakt som en annen har samme dag,
  spørres det: «Vakt 1 er allerede tildelt [navn]. Vil du overta vakten?»
  med valgene Avbryt og Overta vakten. Statusen som blir erstattet, vises
  før bekreftelsen. Overtakelsen er én samlet endring som kan angres.
- **Flytting.** En status flyttes direkte til en celle uten status. Har
  målet en status, velger man mellom «Bytt statusene», «Flytt og erstatt
  eksisterende status» og «Avbryt». Merknad og klokkeslett følger statusen,
  og den siste endringen kan angres. En flytting tar aldri over en vakt:
  har en annen medarbeider allerede samme vakt på måldatoen, avvises
  flyttingen med årsak, også når målcellen er tom. Overtakelse skjer bare
  ved å velge vakten i cellen (punktet over).
- **Tilstedeværelse og tilgjengelighet er atskilt i vaktfordelingen:**
  - *Til stede* (grunnlaget for prosent tilstedeværelse) er den som er uten
    status eller har en status på kontoret.
  - *Ledig for en ny vakt* er bare den som er uten status og oppfyller
    kravene til vakten.

  Ønske om fri regnes som fravær, men vises annerledes enn innvilget fri.
  Motsatte stillingsvekter, prosent tilstedeværelse og avstand mellom
  vaktene gjelder uendret.
- **Eldre data migreres uten stille tap.** Hadde en medarbeider flere
  statuser samme dag, beholdes den viktigste (fravær før vakt før andre
  oppgaver). En eksisterende merknad beholdes uavkortet. De andre statusene
  kan oppsummeres i merknaden innenfor lengdegrensen, og alle oppføringer
  som tas ut, bevares uendret. Brukeren får beskjed om hva som er endret.
  Dette er praksisen i prototypen med syntetiske data. Det er ikke en
  godkjenning av migrering av reelle personalopplysninger, som krever egen
  beslutning etter §3.4.

Syntetisk eksempel (fasit): Jonas Vik har Vakt 1 tirsdag og Maja Holte har
Vakt 2. Planleggeren velger Vakt 1 for Maja og bekrefter overtakelsen. Da
har Maja Vakt 1, Jonas har ingen status (til stede og ledig), og Vakt 2 er
udekket. Velger planleggeren i stedet Borte for Jonas, erstatter Borte
vakten. Jonas regnes som borte, og Vakt 1 er udekket.

### 7.3 Oppgaven

Personal skal gjennomgå `peohol/vaktplan`, kartlegge eksisterende beslutninger
og logikk, og lage en konkret, trinnvis integrasjonsplan for OUSFAR, som
føres inn her. Planen skal minst ha:

1. Kartleggingen av regnearkene (strukturen, ikke innholdet) og hvilke regler
   de uttrykker, med syntetiske eksempler.
2. Fordelingsreglene formulert som vedtak for §6, med premissene i §7.2 og en
   uavhengig fasit.
3. Datamodellen og tilgangsmodellen etter §3, med hva som trengs fra Dev
   (modulrammeverket, rollene) som egne Issues.
4. Trinnene, hver som én avgrenset PR med `ansvar:personal`, fra kalender og
   manuell plan til automatisk forslag og dashboardmodul.
5. Hva som må avklares med ansvarlig virksomhet før bruk med reelle
   opplysninger (§3.4).
6. Når vaktplanrepoet kan arkiveres: først etter verifisert integrasjon.

Ingen vaktplankode eller produksjonsmigrasjoner før planen er vedtatt.

### 7.4 Medarbeiderdata fra brukeroversikten (planlagt)

Besluttet av Peder 25.11.2026 som retning; **ikke bygd ennå**, og ingenting
bygges før integrasjonsplanen (§7.3) er vedtatt. Prototypen har sin egen
medarbeiderliste med syntetiske ansatte til da.

**Hva som hentes.** Tre felt per medlem av et fagmiljø skal komme fra
fagmiljøets brukeroversikt i OUSFAR (`public.brukeroversikt()`,
[fagmiljoer.md](fagmiljoer.md)), i stedet for å vedlikeholdes i vaktplanen:

| Felt | Verdier | Merknad |
| --- | --- | --- |
| Stillingskategori | En liste per fagmiljø, for det første fagmiljøet LIS og overlege | Ikke hardkodet i den generelle motoren (§7.2) |
| Aktiv i vaktplanen | Ja/nei | Et avsluttet eller sperret medlemskap gir alltid nei |
| Kan ha vakt | Vakt 1 og/eller vakt 2, per vakttype i fagmiljøet | Vakttypene er fagmiljøets bemanningsbehov, ikke faste navn |

Navnet kommer fra profilen. Ingen andre profilfelt leses (§3.2).

**Regler.**

- En endring gjelder **fra dagen den lagres** og fremover. Tidligere dager
  vurderes etter det som gjaldt da, så historikk og tidligere vaktdekning
  ikke skrives om (samme modell som i prototypen). Hver endring lagres derfor
  med gyldighetsdato.
- Feltene er planleggingsdata, ikke HR-data (§2).
- Hvem som kan se og redigere feltene, følger §3.3 og vedtas før
  implementering. Forslag: lokal administrator og vaktplanlegger i eget
  fagmiljø redigerer, kolleger ser bare det vaktplanen viser.
- Radsikkerhet på serversiden, med negative tester på tvers av fagmiljøer og
  roller (§3.3).

**Arbeidsdeling.** Brukeroversikten, medlemskapene og den generelle
tilgangsstyringen eies av Dev; feltene og reglene for dem eies av Personal
(§2).

- **Dev** ([#572](https://github.com/peohol/ousfar/issues/572)): et
  gjenbrukbart utvidelsespunkt i brukeroversikten der et prosjekt kan vise og
  redigere egne felt per medlem, en stabil nøkkel per medlemskap og en
  hjelper for tilgang som Personals radsikkerhet kan bruke, og at et avsluttet
  medlemskap er synlig for Personal.
- **Personal**: en egen tabell for feltene med gyldighetsdato, listen over
  kategorier per fagmiljø, migrasjonene og testene, redigeringsfeltene i
  utvidelsespunktet og vaktplanens bruk av dem.

Personal venter på #572 før feltene bygges inn i OUSFAR. Trinnet blir en egen
PR med `ansvar:personal` i integrasjonsplanen (§7.3 punkt 4).

### 7.5 Issue-et for oppgaven

Etter at etableringen er slått sammen og etiketten `ansvar:personal` finnes,
opprettes (eller gjenbrukes) ett avgrenset planleggings-Issue med etiketten
`ansvar:personal`, med henvisning til
[#558](https://github.com/peohol/ousfar/issues/558) og `peohol/vaktplan`, og
med assignee etter de vanlige reglene ([prosjektansvar.md](prosjektansvar.md)
§3; ingen automatisk overføring). Teksten kan være:

```text
Tittel: OUSFAR Personal: integrasjonsplan for vaktplanen fra peohol/vaktplan

Hva og hvorfor
Lag en konkret, trinnvis plan for å bygge vaktplanen inn i OUSFAR, etter docs/personal.md §7. Gjennomgå peohol/vaktplan som referanse, kartlegg beslutningene og logikken i regnearkene (bare strukturen, aldri innholdet, som må regnes som reelle personalopplysninger), og før planen og de foreslåtte reglene inn i docs/personal.md. Ingen vaktplankode eller produksjonsmigrasjoner i denne oppgaven.

Avhengigheter
Bygger på #558. Selvstendige behov i felles infrastruktur (modulrammeverket, rollene) skilles ut som egne Issues til ansvar:dev.

Må et menneske avgjøre noe?
Ja: fordelingsreglene og tilgangsnivåene vedtas før implementering, og bruk med reelle opplysninger krever avklaring med ansvarlig virksomhet (docs/personal.md §3.4).
```
