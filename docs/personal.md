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

**Status 24.11.2026:** ingen personalfunksjon er bygd. Dokumentet er rammen
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
fasit. Inntil videre gjelder bare produktpremissene i §7.2.

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

### 7.4 Issue-et for oppgaven

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
