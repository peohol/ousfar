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
Integrasjonsplanen, akseptkriteriene og rekkefølgen står i §8, og
sjekklisten over prototypens funksjonalitet i
[personal-akseptmatrise.md](personal-akseptmatrise.md).

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
- **Vaktfritak** registreres bare som ja/nei på en registrering, aldri med
  grunn. Administrativt vaktfritak på «Borte» brukes for eksempel ved
  sykefravær, men systemet registrerer aldri sykdom eller hvorfor fritaket er
  gitt, og andre enn dem som kan gi det, ser bare «Borte» (§6.2).
- **Vaktandel** er en planleggingsstørrelse (relativ vaktbelastning), ikke
  stillingsprosent, og lagres uten begrunnelse.
- Behov for mer detaljerte personalopplysninger avklares før noe bygges (§3.4).

### 3.3 Tilgang

- Personalopplysninger avgrenses som hovedregel til **eget laboratorium eller
  fagmiljø**.
- Tre nivåer holdes atskilt: **kollegers innsyn** (se planen), **vaktplanansvarliges
  redigering** (lage, endre og publisere) og **administrativ myndighet** (hvem
  som er vaktplanansvarlig, regler og vaktfritak). Fordelingen av nivåene er
  vedtatt for vaktandel og vaktfritak (§6.2); ellers vedtas den før
  implementering.
- **Vaktplanansvarlig** er en egen rolle for vanlige brukere, uavhengig av
  redaktørrollene i OUSFAR.
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
  tydelig skilt fra den operative, publiserte planen. Godkjenning og publisering er én handling (B19).
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

6. **Akseptkriteriene:** hvilke ID-er i [personal-akseptmatrise.md](personal-akseptmatrise.md)
   (`A-…`) og §8 (`K-…`) PR-en oppfyller.

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
- **Forventet antall** regnes med modellen i §6.2: stillingsvekt ×
  vaktandel × fritaksfaktor, dag for dag, etter reglene som gjaldt hver dag.
  ~~Midlertidig beregningsregel (prototypen v0.10): vekten summert over dagene
  personen var til stede, og vaktene fordelt etter forholdet mellom summene.~~
  Erstattet 26.11.2026 av §6.2: tilstedeværelse i kalenderen reduserer ikke
  lenger forventet antall.
  For tidligere dager teller bare de
  vaktene som faktisk er registrert i kalenderen den dagen. **En dag uten
  registrert vakt av typen gir derfor ingen forventning til noen**, og
  manglende historikk gjør ikke i seg selv at noen ser ut til å ha for få
  vakter. Det gjelder også ved første gangs bruk, når ingen vakter er
  registrert bakover. En medarbeider får bare forventning fra og med dagen
  vedkommende ble aktiv. Mangler et fravær med vaktfritak (for eksempel
  ferie) for en dag med registrert vakt, får medarbeideren forventning den
  dagen. Slike feil rettes ved å registrere fraværet.
- **Utjevningen gir ikke en urimelig tett plan.** I én plan er målet for
  den som skal ta igjen, høyst en viss andel flere vakter enn sin
  rettferdige andel av perioden (foreløpig standard 50 %, justerbar i
  regelsettet; ikke en vedtatt arbeidstidsgrense). Målet for den som har
  hatt for mange, kan gå ned til ingen vakter i perioden, aldri lavere.
  Resten jevnes ut i senere planer. Grensen begrenser ønsket kompensasjon,
  ikke faktisk antall vakter: dekning, låste og publiserte vakter,
  tilgjengelighet og avrunding går foran, så faktisk antall kan bli høyere,
  og planen skal da vise det. Prioritetsrekkefølgen over gjelder uendret,
  og ingen ny hard regel ofrer dekning. Eksempel: to likt stilte, ti vakter,
  den ene opptatt alle dagene uten vaktfritak. Begge forventes å ha 5, men
  den ledige får 10 for å dekke behovet. I fasiten under er A og B innenfor
  grensen.
- **Vaktbelastningen skal kunne etterprøves.** En oversikt viser per
  medarbeider og vakttype antall, forventet antall og avvik over et valgt
  tidsrom. Med et forslag vises også antall i forslaget, samlet etter
  publisering og avviket etterpå, over det samme tidsrommet. En vakt som
  flyttes til en annen, telles bare én gang.

**Fasit (syntetiske medarbeidere A og B):**

Inndata:
- A og B har samme stillingskategori og samme vekt for vakt 1, begge er
  kvalifisert for vakt 1, og begge er aktive og til stede alle arbeidsdagene
  nedenfor, uten registrert fravær.
- Tidligere: 20 arbeidsdager med nøyaktig én registrert vakt 1 hver dag. A
  har 12 av dem og B 8.
- Ny periode: 10 arbeidsdager som hver trenger én vakt 1. Ingen vakter er
  låst eller publisert.
- Tidshorisonten dekker alle de 30 dagene. Vakt 2 er ikke med.

Forventet antall: hver dag fordeles likt på to, så tidligere er forventet
20 · ½ = 10 hver, i den nye perioden 10 · ½ = 5 hver, og samlet 15 hver.
Full historisk utjevning gir A 15 − 12 = 3 og B 15 − 8 = 7 nye vakter.

| | Tidligere vakter | Ny periode | Samlet | Forventet samlet |
| --- | --- | --- | --- | --- |
| A | 12 | 3 | 15 | 15 |
| B | 8 | 7 | 15 | 15 |

Fordelingen 3 og 7 er riktig resultat, selv om den er skjev sett isolert for
den nye perioden (forventet 5 og 5). Med de samme inndataene gir 11 og 9
tidligere vakter 4 og 6 nye, og uten tidligere vakter gir den 5 og 5.
Avstand mellom vaktene og jevn belastning velger hvilke dager vaktene
legges på, men endrer ikke antallene.

### 6.2 Vaktandel og vaktfritak i forventet vaktbelastning

Vedtatt av Peder 26.11.2026, i prototypen i `peohol/vaktplan`
([vaktplan#16](https://github.com/peohol/vaktplan/issues/16),
[#596](https://github.com/peohol/ousfar/issues/596)). Erstatter den
midlertidige beregningsregelen i §6.1 og premisset om prosent
tilstedeværelse i §7.2.

**Fire uavhengige størrelser.** Forventet vaktbelastning utledes ikke av
tilgjengeligheten i kalenderen:

| Størrelse | Hva den er |
| --- | --- |
| Stillingsvekt | Kategoriens vekt per vakttype (som før, f.eks. LIS og overlege motsatt for vakt 1 og vakt 2) |
| Vaktandel | Medarbeiderens individuelle, relative vaktbelastning. Standard 100 %, **ikke** det samme som stillingsprosent |
| Vaktfritak | Dager uten vaktgjeld |
| Tilgjengelighet | Hvilke dager medarbeideren faktisk kan få vakt |

Å fylle kalenderen med andre oppgaver skal ikke redusere forventet
vaktbelastning.

**Beregningen.** For hver medarbeider, vakttype og dato:

> vekt = stillingsvekt × vaktandel × fritaksfaktor

der fritaksfaktoren er 0 på en dag med vaktfritak og ellers 1. Bare aktive
medarbeidere som er kvalifisert for vakttypen, er med. Hver dags vakter
fordeles forholdsmessig etter vektene, og forventet antall er summen over
perioden. Statuser uten vaktfritak avgjør bare **hvor** vaktene kan legges,
ikke hvor mange en medarbeider skal ha. Statuser med vaktfritak (Ferie,
Opplæring og «Borte» med innvilget administrativt fritak) gir fritaksfaktor 0
de dagene og reduserer derfor forventet antall. Én felles beregning brukes av fordelingen
og oversikten; oversikten bygger på registrerte vakter, fordelingen i
tillegg på bemanningsbehovet for dagene som fordeles.

**Vaktandel.**

- Settes per medarbeider: en ordinær vaktandel (0–100 %) fra en gitt dato og
  på ubestemt tid, og en eller flere midlertidige perioder (fra og med, til
  og med) med en annen vaktandel. Periodene kan ikke overlappe. Etter en
  midlertidig periode gjelder den ordinære vaktandelen som gjelder da.
- Tidligere, gjeldende og fremtidige vaktandeler vises. Endringer gjelder
  bare fra i dag og fremover, så tidligere forventet belastning aldri skrives
  om.
- 0 % utelukker automatisk vakttildeling (manuell tildeling er fortsatt
  mulig).

**Status, tilgjengelighet og vaktfritak.** Fortsatt én status per
medarbeider per dag (§7.2). **Ferie** (solikon) omfatter faktisk ferie, også ulønnet ekstraferie.
Fra 27.11.2026 utgår Fri som nytt valg (B17). Ordinære arbeidsfrie dager
ved deltid registreres som Borte uten fritak, for å unngå dobbel
reduksjon. Historiske Fri-registreringer beholder sin tidligere betydning.

| Status | Tilgjengelig for ny vakt | Vaktfritak |
| --- | --- | --- |
| Ingen status | Ja | Nei |
| Vakt 1, Vakt 2, Referent | Nei | Nei |
| Opplæring | Nei | Ja |
| Ferie | Nei | Ja |
| Borte | Nei | Nei, med mindre administrativt vaktfritak er gitt |
| Hjemmekontor, Forskning, Undervisning, Avspasering, Ønske om fri | Nei | Nei |

- **Administrativt vaktfritak** på «Borte» kan gis av lokale administratorer
  og systemarkitekter med lokal myndighet i fagmiljøet. Det brukes for
  eksempel ved sykefravær, men systemet registrerer aldri sykdom eller grunn
  (§3.2). Andre ser bare «Borte» (se lesemodellen under).
- Fritaket kan **ikke gis indirekte** av noen uten myndighet: det følger
  aldri med når en status flyttes, byttes, kopieres eller settes på mange
  dager, og en angring eller gjentakelse som gir eller fjerner et fritak,
  krever samme myndighet.

**Utjevning over tid** (§6.1) gjelder med denne modellen, vakt 1 og vakt 2
hver for seg. Gyldig vaktfritak gir ingen senere kompensasjon. En skjevhet
som skyldes vanlig redusert tilgjengelighet (for eksempel mye forskning),
jevnes ut senere. Avstand mellom vakter og jevn belastning gjelder fortsatt,
og manglende historiske registreringer gir ingen kunstig vaktgjeld.

**Oversikten over vaktbelastning** viser per medarbeider vaktandel (ett tall,
eller spennet når den varierer i tidsrommet), praktisk tilgjengelighet
(dager med vakt der medarbeideren var ledig, av dagene vedkommende kunne hatt
vakten), forventet og faktisk antall, avvik, og hvordan et forslag endrer
avviket. Forventet antall og avvik vises bare for roller med
fritaksmyndighet (se lesemodellen under).

**Fasit (syntetiske medarbeidere):**

1. A, B og C er i samme stillingskategori (lik stillingsvekt), og ingen har
   vaktfritak. Vaktandel: A 100 %, B 60 %, C 100 %. Ledige arbeidsdager:
   A 100 %, B 60 % (registrert Borte uten vaktfritak), C 60 % (andre
   oppgaver). Hver dag er vektene 1 : 0,6 : 1, så 52 vakter gir
   52 · 1/2,6 = **20**, 52 · 0,6/2,6 = **12** og **20**. B reduseres ikke en
   gang til for fridagene, og C reduseres ikke for de andre oppgavene.
2. A og B er likt stilt. 10 vakter på 10 dager, og A har ferie 4 av dagene.
   De 4 dagene får B hele vekten, de 6 andre deles likt: A 6 · ½ = **3**,
   B 4 + 6 · ½ = **7**. Det samme gjelder opplæring og «Borte» med
   administrativt vaktfritak.
3. Som 2, men A har forskning de 4 dagene i stedet for ferie. Forskning gir
   ikke vaktfritak, så forventet er **5 og 5**. Kan A ikke få 5 fordi A er
   opptatt, er skjevheten synlig i oversikten og jevnes ut i senere planer.

**Tilgang til vaktandel og vaktfritak** (§3.3, gjelder også i OUSFAR):

| Rolle | Vaktandel | Administrativt vaktfritak |
| --- | --- | --- |
| Kollega (leser) | Ser | Ser bare «Borte» |
| Vaktplanansvarlig (egen rolle for vanlige brukere) | Endrer | Kan ikke gi eller fjerne |
| Lokal administrator i fagmiljøet | Endrer | Gir og fjerner |
| Systemarkitekt med lokal myndighet i fagmiljøet | Endrer | Gir og fjerner |
| Systemarkitekt uten lokal myndighet | Ingen tilgang | Ingen tilgang |

Systemarkitektrollen alene gir ingen tilgang på tvers av fagmiljøer.
Myndigheten håndheves på serversiden (radnivåsikkerhet og serverside
validering i kommandoene), ikke bare ved å skjule knapper, og testes
negativt, også for forsøk på å gi seg selv vaktfritak uten slik myndighet.
De som har myndighet etter tabellen, kan gi fritak, også på egne
registreringer.

**Lesemodell for administrativt vaktfritak.** Radnivåsikkerhet alene er
ikke nok: den avgjør hvilke rader en bruker ser, ikke hvilke felt i en
lesbar rad. Fritaket kan dessuten leses ut av eksakte tall. Syntetisk
eksempel: to likt stilte, én vakt 1 på én dato, A er Borte og B har vakten.
Uten fritak er forventet ½ og ½, med fritak 0 og 1. Derfor gjelder:

- En **serverstyrt lesemodell** (egne visninger eller funksjoner på
  serversiden) gir roller uten fritaksmyndighet kalenderregistreringen uten
  fritaksfeltet, også i endringshistorikk og i alle svar fra API-er.
- **Statistikk og forklaringer** som avhenger av fritaket (forventet antall,
  avvik, største avvik, vurderingen av hver kandidat og hvem som er over
  målet for utjevning), gis bare til roller med fritaksmyndighet. Andre får
  vanlig kalenderinnsyn og faktiske vakttall, og utvalget av medarbeidere i
  oversikter avhenger ikke av fritak. Tall som vises, er aldri bevisst feil.
- Meldinger og varsler om fritak går bare til dem med myndighet.
- Negative tilgangstester dekker også statistikk og API-svar: samme
  kalender med og uten fritak gir likt svar for roller uten myndighet.
- Dette hindrer direkte avsløring gjennom systemet. At noen kan trekke
  slutninger av en ferdig vaktplan (hvem som fikk vaktene), kan ikke
  utelukkes og er ikke en del av kravet.

Prototypen i `peohol/vaktplan` demonstrerer skjermingen (uten ekte
servertilgangskontroll). Ingen produksjonsimplementering nå.

**Fremtidig datamodell i OUSFAR** (ikke bygd; integrasjonen planlegges i
§8, særlig §8.7):

- En tabell for vaktandel per medlemskap i fagmiljøet: ordinære verdier med
  gyldig-fra-dato og midlertidige perioder med fra- og tildato og prosent,
  med databasebegrensninger for 0–100 og mot overlapp, og uten endring av
  dager før i dag.
- Et ja/nei-felt for administrativt vaktfritak på kalenderregistreringen,
  uten grunn eller fritekst, og som bare kan settes på statuser som tillater
  det. Hvem som satte det og når, hører til revisjonssporet (§3.4).
- Vaktfritak per status (alltid, administrativt eller aldri) som en egenskap
  i fagmiljøets statuskatalog, ikke hardkodet.
- Radsikkerhet: lesing for medlemmer av fagmiljøet; skriving av vaktandel
  for vaktplanansvarlig, lokal administrator og systemarkitekt med lokal
  myndighet; skriving av vaktfritak bare for de to siste. Ingen tilgang for
  andre fagmiljøer eller for systemarkitektrollen alene. Fritaksfeltet og
  fritaksavhengig statistikk leses bare gjennom lesemodellen over.
- Historikken for vaktandel beskyttes også ved angre, gjenoppretting og
  andre overganger: ingen operasjon endrer vaktandelen for en dag før
  datoen den utføres.

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
- Fordelingen tar hensyn til ~~**prosent tilstedeværelse** og~~
  **avstand mellom vakter**. Prosent tilstedeværelse er erstattet 26.11.2026 av
  vaktandel og vaktfritak (§6.2).
- **Overleger skal ha færre vakt 1**, men ikke nødvendigvis færre vakter totalt.
- Excel-arket er **ikke et krav om eksakt algoritme**; det viser hensikten.
- Kalender med **dag, uke og måned**, **enkle statuser**, **manuelle
  justeringer** og en planlagt **visning på dashboardet**.

Besluttet av Peder 25.11.2026, i prototypen i `peohol/vaktplan` (PR #5):

- **Ingen arbeidsmønster eller stillingsandel.** Mønstrene varierer, og noen
  i redusert stilling er til stede hver dag og kan ha vakt hver ukedag. Alle
  aktive medarbeidere regnes som til stede på hverdager som ikke er
  helligdager; fravær, også ved deltid, registreres i kalenderen.
  ~~Prosent tilstedeværelse i fordelingen regnes derfor ut fra kalenderen,
  ikke fra en stillingsandel.~~ Erstattet 26.11.2026: redusert
  vaktbelastning uttrykkes med vaktandel, og kalenderen avgjør bare
  plasseringen (§6.2).
- **Forskning, undervisning og ønske om fri regnes som borte** i
  planleggingen (de gjør medarbeideren opptatt, men gir ikke vaktfritak,
  §6.2).
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
  medarbeider og dato, og høyst det konfigurerte antallet medarbeidere
  per bemanningsoppgave og dato).
- **Standardoppsettet har tre visningsgrupper** (revidert 27.11.2026),
  hver status med et ikon fra ett felles ikonbibliotek (ingen emojier):
  - *Til stede:* Vakt 1, Vakt 2, Referent og Opplæring; også ingen status.
  - *Jobber et annet sted:* Hjemmekontor, Forskning og Undervisning.
  - *Fraværende:* Borte, Ferie (solikon), Avspasering og Ønske om fri.
  Gruppetilhørighet, fysisk tilstedeværelse og fremhevede oppgaver er
  konfigurasjon per fagmiljø, uavhengig av vaktfritak (§6.2).

  Statusene skal senere kunne konfigureres per fagmiljø, men det bygges
  ikke noe administrasjonsgrensesnitt for dem nå. Borte registreres uten
  grunn.
- **Samme redigeringsboble i alle visninger.** I dag-, uke- og
  månedsvisningen åpner et klikk på en status eller et navn boblen direkte
  for den medarbeideren og datoen, uten omvei om dagsvisningen. I månedsvisningen har hver medarbeider eget ikon og navn i ett kort;
  klikk på dato/uke navigerer, og plussknappen legger til status.
  Forsiden er alltid en leseflate, jf. personal-design.md.
- **Endringer lagres med en gang og kan angres.** En status settes ved å
  velge den og fjernes med slett, ved et nytt klikk på den valgte statusen
  eller ved dobbeltklikk på statusen direkte i kalenderen.
- **Statuser som krever tilstedeværelse gjelder arbeidsdager** etter
  fagmiljøets arbeids- og bemanningskalender, også helg/helligdag der
  dette er konfigurert. Visningsfilteret påvirker aldri reglene. Vakt
  krever kvalifikasjon for akkurat den vakttypen.
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
  og den siste endringen kan angres. Til stede uten status kan dras
  som en virtuell celle og byttes med en status. I månedsvisningen
  flyttes personen med statusen til ny dato; ved full vakttype tilbys
  eksplisitt bytte av vaktdager eller overtakelse, med alle konsekvenser
  og atomisk validering. Ingen flytting overtar en tredjepersons vakt
  lydløst. Se [personal-design.md](personal-design.md) §4.
- **Tilstedeværelse og tilgjengelighet er atskilt i vaktfordelingen:**
  - *Til stede* er den som er uten status eller har en status som regnes som fysisk til stede.
  - *Ledig for en ny vakt* er bare den som er uten status og oppfyller
    kravene til vakten.

  Ønske om fri regnes som fravær, men vises annerledes enn registrert ferie eller annet fravær.
  Motsatte stillingsvekter og avstand mellom vaktene gjelder uendret.
  Tilstedeværelse påvirker ikke lenger forventet antall vakter (§6.2).
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

Personal skulle gjennomgå `peohol/vaktplan`, kartlegge beslutningene og logikken
og lage en trinnvis integrasjonsplan ([#561](https://github.com/peohol/ousfar/issues/561)).
Planen står i §8. Detaljert vedtatt design og arbeidsflyt 27.11.2026
står i [personal-design.md](personal-design.md). Kartleggingen av regnearkene (det opprinnelige punkt 1) er
erstattet av vedtakene i §6 og §7.2 og av akseptmatrisen
([personal-akseptmatrise.md](personal-akseptmatrise.md)); regnearkene er
fjernet fra prototypen og rekonstrueres ikke (§8.2).
Ingen vaktplankode eller produksjonsmigrasjoner før planen er vedtatt.

### 7.4 Medarbeiderinnstillingene i kalenderen (planlagt)

Besluttet av Peder 25.11.2026 som retning og **revidert 26.11.2026**: feltene
redigeres i kalenderens eget grensesnitt (Medarbeidere), **ikke** i
fagmiljøets brukeroversikt eller administratorenes brukermeny. Den
opprinnelige planen om et utvidelsespunkt i brukeroversikten utgår
([#572](https://github.com/peohol/ousfar/issues/572), avgrenset på nytt).
**Ikke bygd ennå**; trinnet er P2c i §8.11.

**Én app, ikke en tilleggsfunksjon** (vedtatt av Peder 26.11.2026). Det er
et **1:1-forhold** mellom medlemmene av fagmiljøet og medarbeiderne i
kalenderen, og mellom stillingene i appen («Stillinger»,
[stillinger.md](stillinger.md)) og stillingskategoriene i kalenderen.
Kalenderen henter begge automatisk; ingen brukere eller stillinger legges inn
på nytt. Navn, stilling og eksisterende tillatt profilbilde (bare for
visning, med initialer som reserve) kommer fra profilen; ingen andre
profilfelt leses (§3.2 og B1). Testmiljøet bruker bare syntetiske
avatarer. Reell bruk krever §3.4. Det kalenderen selv eier per medarbeider:

| Felt | Verdier | Merknad |
| --- | --- | --- |
| Stillingskategori | Profilens stilling, hentet automatisk | Stillingsvekten per stilling står i fagmiljøets bemanningsoppgaver (§8.6). En endring av stillingen gjelder fra dagen den gjøres, og kalenderen husker hvilken stilling som gjaldt hver dag |
| Kvalifikasjoner | Per bemanningsoppgave i fagmiljøet (for det første fagmiljøet vakt 1 og/eller vakt 2) | Oppgavene er fagmiljøets bemanningsbehov, ikke faste navn. Ingen kvalifikasjon som standard, så ingen får vakter før det er satt |
| Vaktandel | Som i §6.2 | Personals eget felt, med tilgangen i §6.2 |

Aktiv i kalenderen er den som har aktivt medlemskap i fagmiljøet; det finnes
ikke noe eget felt for det.

**Regler.**

- En endring gjelder **fra dagen den lagres** og fremover. Tidligere dager
  vurderes etter det som gjaldt da, så historikk og tidligere vaktdekning
  ikke skrives om. Hver endring lagres derfor med gyldighetsdato.
- Feltene er planleggingsdata, ikke HR-data (§2).
- Kvalifikasjoner og vaktandel redigeres av vaktplanansvarlig og lokal
  administrator (vedtatt 26.11.2026, §8.4); kolleger ser bare det
  kalenderen viser. Stillingen endres der den alltid har vært endret, i
  profilen og i «Brukere», men i et fagmiljø med kalenderen på bare av den
  som har lokal administrativ myndighet (vedtatt, §8.12, B14).
- Radsikkerhet på serversiden, med negative tester på tvers av fagmiljøer og
  roller (§3.3).

**Arbeidsdeling.** Medlemskapene og den generelle tilgangsstyringen eies av
Dev; feltene, tabellene, migrasjonene, testene og redigeringen i kalenderen
eies av Personal (§2). Fra Dev trengs hjelperen for eget medlemskap uten
systemarkitektunntak ([#572](https://github.com/peohol/ousfar/issues/572))
og en datert historikk over stillingen ([#602](https://github.com/peohol/ousfar/issues/602)).

## 8. Integrasjonsplan: personalkalenderen i OUSFAR

Planen for å bygge personalkalenderen og vaktfordelingen fra prototypen inn i
OUSFAR ([#561](https://github.com/peohol/ousfar/issues/561)). Den bygger på
Peders bestilling 26.11.2026, ChatGPTs planforslag i
[#561](https://github.com/peohol/ousfar/issues/561#issuecomment-7201302691)
og kartleggingen av OUSFAR og prototypen. Implementering følger avhengighetene i §8.11. P2a kan bygges parallelt med P1; P2b/P2c følger sine tekniske avhengigheter, og kalenderens brukerflater (P3–P5) bygger på den aksepterte samlede prototypen. B1 er avgjort 27.11.2026.

**Status for innholdet.** Det som står som **vedtatt**, er avgjort av Peder
(§§3, 6, 7.2, bestillingen 26.11.2026, merket «bestilt», eller
beslutningene i §8.12). Det som står som **forslag**, er Personals
tekniske utforming eller anbefaling. Den gjelder som arbeidsgrunnlag, men
regnes ikke som vedtatt før den er ført inn i §6 eller §8.12.

### 8.1 Mål og avgrensning

Vedtatt (bestilt):

- Et **generelt, konfigurerbart planleggingssystem** som ikke er laget for
  leger eller ett fagmiljø. Første fagmiljø er **OUS Klinisk farmakologi**.
- **Svært enkelt grensesnitt** med minst mulig tekst og ingen tekniske
  detaljer, forankret i OUSFARs design, ikke en egen app.
- **All relevant funksjonalitet fra prototypen bevares** (§8.2), og
  domenekoden, beregningsmotoren og testene gjenbrukes der det passer.
- **Medlemmene av fagmiljøet knyttes automatisk til kalenderen**, og alle
  planleggingsinnstillinger for medarbeiderne håndteres i kalenderen, ikke i
  administratorenes brukermeny (§7.4).
- **Skjermet for andre enn systemarkitektene** til kalenderen er godkjent for
  ordinær bruk, per fagmiljø (§8.3).

Utenfor (som før, §2): HR-plattform, lønn, arbeidstidskontroll, faktisk
oppmøte, eksport av kollegers fravær, flere samtidige statuser per dag og
nattevakter. Behov for nye modeller avklares når et fagmiljø trenger dem.

### 8.2 Referanse og regresjonsvern

- **Referansen** er prototypen i `peohol/vaktplan` på v0.11 (commit
  `10bc89fab8d8065140de1b41aa3721970f56b82e`, PR #17), med
  designspesifikasjonen, `docs/arkitektur.md`, `docs/testing.md` og
  PR-ene #1, #3, #5, #6, #8, #11, #13, #15 og #17.
- **Akseptmatrisen** i [personal-akseptmatrise.md](personal-akseptmatrise.md)
  er sjekklisten over funksjonaliteten og produktreglene som skal bevares,
  med stabil ID per krav (`A-…`), kilden, om det er vedtatt eller
  prototypens valg, og om koden overføres direkte, tilpasses eller
  erstattes. Hver implementerings-PR sier hvilke ID-er den dekker, og
  produktaksepten (P7) går gjennom alle.
- **Nyere vedtak går foran eldre**; matrisen følger gjeldende vedtak, ikke
  historikken.
- **Regnearkene rekonstrueres ikke.** De ble fjernet fra prototypen i
  vaktplan#8, og prinsippene de uttrykte, er vedtatt i §6 og §7.2. Punkt 1 i
  den opprinnelige oppgaven (kartlegging av regnearkene) er derfor erstattet
  av §6 og akseptmatrisen. Regnearkene, prototypens Git-historikk og gamle
  utrullinger leses ikke.
- **Det som overføres:** den rene domenekoden (`src/domain/`, særlig
  `allocation/`) og testene, med fasitene i §6.1 og §6.2. Prototypens
  lokale lagring, migreringer av demodata, demoroller og eget visuelle
  uttrykk overføres ikke; prinsippene gjør. Prototypens tall for de myke
  målene (vektene) er startverdier, ikke vedtak.

### 8.3 Skjerming under utvikling

Vedtatt (bestilt 26.11.2026). Gjelder gjennom alle trinnene, også etter at
PR-ene er slått sammen og publisert:

| ID | Krav |
| --- | --- |
| K-SKJ-1 | Til kalenderen er godkjent for ordinær bruk i et fagmiljø, er personalfunksjonene der bare tilgjengelige for **systemarkitekter som selv er aktive medlemmer** av fagmiljøet |
| K-SKJ-2 | Andre ser **ingen spor**: ingen meny, ingen modul på forsiden eller i «Tilpass forsiden», ingen varselinnstilling, ingen føring i endringsloggen som røper funksjonen, og adressen gir «Siden finnes ikke», som en ukjent adresse |
| K-SKJ-3 | Begrensningen **håndheves på serversiden**: alle funksjoner svarer som om funksjonen ikke fantes, også ved direkte kall med gyldig token |
| K-SKJ-4 | Systemarkitektene kan prøve **hele** funksjonaliteten med **syntetiske medarbeidere**, også ulike roller (`Vis som`, K-SKJ-7) |
| K-SKJ-5 | Systemarkitektrollen gir **ikke i seg selv** tilgang til reelle personalopplysninger (§3.3) |
| K-SKJ-6 | **Aktiveringen** for ordinære brukere gjøres **per fagmiljø, uten kodeendring**, etter Peders uttrykkelige produktgodkjenning og avklaringen i §3.4 |
| K-SKJ-7 | **Vis som** (forslag): i et testmiljø kan en systemarkitekt se og bruke kalenderen som kollega, vaktplanansvarlig, lokal administrator eller én bestemt syntetisk medarbeider. Simuleringen kan bare redusere rettighetene, og serveren håndhever den |
| K-SKJ-8 | Koden for personalfunksjonene lastes bare for dem som har tilgang |
| K-SKJ-9 | I et testmiljø består kalenderen **bare av syntetiske medarbeidere**: ingen innlogget konto blir medarbeider der, og ingen navn eller stilling hentes fra profilene. Den innloggede handler med sin virkelige rolle i fagmiljøet, eventuelt redusert med `Vis som` |
| K-SKJ-10 | Et fagmiljø som ikke er testmiljø, kan ikke settes til `utprøving` eller `på` før §3.4 er avklart for det og Peder har sagt ja. Testmerkingen kan ikke fjernes mens det finnes syntetiske medarbeidere, og syntetiske medarbeidere, kalender og historikk overføres aldri til et virkelig fagmiljø |

**Mekanismen.** OUSFAR har i dag bare globale brytere som byttes med en
migrasjon, og en synlighetskonstant i klienten for verktøyene. Personal
bruker derfor en ny, felles mekanisme fra Dev:

- **Funksjonsbrytere per fagmiljø** ([#598](https://github.com/peohol/ousfar/issues/598)):
  `av` (standard), `utprøving` (bare systemarkitekter med eget medlemskap)
  og `på` (alle med eget medlemskap), endret i appen av en systemarkitekt
  med begrunnelse og logget i `tilgangslogg`. Personals funksjon heter
  `personal`.
- **Testmiljø** ([#598](https://github.com/peohol/ousfar/issues/598)):
  Sandkasse er merket som testmiljø. **Bare i et testmiljø kan det finnes
  syntetiske medarbeidere** uten konto, og bare der virker `Vis som`.
- **Syntetisk utprøving.** I et testmiljø består kalenderen bare av
  syntetiske medarbeidere. 1:1-regelen i §8.5 gjelder ordinær drift, ikke
  testmiljøet: systemarkitektene og testbrukerne i Sandkasse er vanlige
  kontoer med virkelige navn, og de blir ikke medarbeidere i kalenderen.
  Den innloggede er den som handler, med sin virkelige rolle i fagmiljøet
  (i Sandkasse lokal administrator), og kan med `Vis som` redusere rollen
  eller handle som én bestemt syntetisk medarbeider, for eksempel for å
  prøve egne statuser. Slik prøves de virkelige innloggingsrollene, mens
  alle medarbeiderne i kalenderen er syntetiske. 1:1-tilknytningen prøves
  med syntetiske kontoer i testdatabasen.
- **Bryteren og testmerkingen åpner aldri reelle opplysninger.** Et
  fagmiljø som ikke er testmiljø, kan bare stå på `av` til §3.4 er avklart
  for det og Peder har sagt ja. Testmerkingen kan ikke fjernes mens det
  finnes syntetiske medarbeidere. Ved aktivering av et virkelig fagmiljø
  overføres aldri syntetiske medarbeidere, kalender eller historikk; den
  første planen starter fra blanke ark (A-FOR-19).
- **Gangen:** Sandkasse står på `utprøving` under hele utviklingen, med
  syntetiske medarbeidere. OUS Klinisk farmakologi står på `av` til Peder
  har godkjent produktet og §3.4 er avklart. Da settes den til `på` uten ny
  kode (P7). Andre fagmiljøer står av.
- **Uten spor i endringsloggen** ([#601](https://github.com/peohol/ousfar/issues/601)):
  føringer for personalfunksjonene vises bare for systemarkitektene. Til det
  finnes, er føringene nøytrale og uten varsel.
- **Forsiden** ([#599](https://github.com/peohol/ousfar/issues/599)) og
  **varslene på enheten** ([#600](https://github.com/peohol/ousfar/issues/600))
  viser personalmodulene og -valgene bare for dem som har funksjonen.

### 8.4 Roller og tilgang

Rollene gjelder per fagmiljø og bygger på eget aktivt medlemskap. Den
felles hjelperen for eget medlemskap uten systemarkitektunntak kommer fra Dev
([#572](https://github.com/peohol/ousfar/issues/572)); lokal administrator
uten unntak finnes (`intern.administrerte_fagmiljoer`).

| Rolle | Hvem | Kan | Status |
| --- | --- | --- | --- |
| Medarbeider (kollega) | Aktivt medlem | Se kalenderen med den **publiserte** planen, Dagen i dag og egne vakter; **registrere og endre sine egne statuser** fortløpende (ikke vakter og ikke vaktfritak); ser bare «Borte» for administrativt fritak; faktiske vakttall | Vedtatt (§6.2; egne statuser og publisert plan 26.11.2026) |
| Vaktplanansvarlig | Utpekt av lokal administrator; **flere kan ha rollen samtidig** | I tillegg: tildele vakter, redigere hele kalenderen, kvalifikasjoner og vaktandel, lage vaktplankladd med automatisk fordeling, låse og publisere | Vedtatt (§6.2 og 26.11.2026) |
| Lokal administrator | Lokal administratortildeling i fagmiljøet | I tillegg: administrativt vaktfritak, utpeke og fjerne vaktplanansvarlige, regelsett, bemanningsbehov og vekter | Vedtatt (§6.2 og 26.11.2026; B3 og B3b) |
| Systemarkitekt med lokal myndighet | Systemarkitekt som også er aktivt medlem **og** lokal administrator i fagmiljøet | Som lokal administrator | Vedtatt 26.11.2026 (B2); den globale rollen gir ikke i seg selv tilgang |
| Systemarkitekt uten eget medlemskap | | Ingenting | Vedtatt (§3.3, §6.2) |

**Fritaket i forslag og kladd.** Fordelingen bruker fritaket (§6.2), så selve
planresultatet, altså hvem som får hvilken vakt i et forslag eller en kladd,
kan bli et annet med enn uten fritak. Det er tillatt, slik det er for en
ferdig plan i §6.2. Alt annet en planlegger uten fritaksmyndighet ser, skal
være likt med og uten fritak: kalenderen, historikken, statistikk,
forklaringer og årsaker, poeng og rangering av kandidater, avtrykket, hvorfor
et forslag er foreldet, konfliktmeldinger og varsler. Et forslag som blir
foreldet fordi et fritak er endret, får den samme generelle årsaken som ved
andre endringer i grunnlaget. Restrisikoen, at noen sammenligner forslag
eller ser at et forslag ble foreldet uten synlig endring og slutter seg til
fritaket, kan ikke utelukkes helt og vurderes i §3.4.

Krav:

| ID | Krav |
| --- | --- |
| K-TIL-1 | Alle opplysninger avgrenses til eget fagmiljø; valg av fagmiljø viser aldri tilgang til andre fagmiljøer |
| K-TIL-2 | Rollene håndheves i databasen (radsikkerhet og kontroll i hver kommando), aldri bare ved å skjule knapper |
| K-TIL-3 | Negative tester for hver rolle og hvert fagmiljø: annet fagmiljø, kollega uten planleggerrolle, vaktplanansvarlig som prøver å gi fritak (også seg selv), systemarkitekt uten medlemskap, avsluttet medlemskap, og bytte av fagmiljø |
| K-TIL-4 | Lesemodellen for fritak (§6.2) gjelder kalenderen, endringshistorikken, loggen og alle API-svar: samme kalender med og uten fritak gir likt svar for roller uten myndighet |
| K-TIL-5 | Vaktplanansvarlig er en egen rolle i Personal, uavhengig av redaktørrollene; flere kan ha den samtidig; utpekingen og fjerningen logges |
| K-TIL-6 | En medarbeider kan bare endre **sine egne** statuser, aldri en vakt eller et administrativt vaktfritak, og aldri andres. En status som selv gir vaktfritak etter §6.2, som Ferie, er tillatt. En status på en dag med egen publisert vakt avvises, og vakten står (B15). Egne endringer gjelder fra i dag og fremover; tidligere dager rettes av vaktplanansvarlig (B15b). En kollega kan aldri fjerne eller endre en egen publisert vakt, heller ikke med slett, flytting, flervalg eller angre, og kan ikke overta en vakt; overtakelse er planleggernes (A-OVT). Prøvd negativt på serveren |
| K-TIL-7 | I forslag og kladd er alt utenom selve planresultatet likt med og uten fritak for roller uten myndighet: statistikk, forklaringer, poeng og rangering, avtrykk, årsak til foreldelse og konfliktmeldinger. Negative API-tester også for forslag, konfliktmeldinger og historikk |

### 8.5 Medarbeidere og medlemskap

Utdyper §7.4 (vedtatt av Peder 26.11.2026: feltene i kalenderen, og 1:1 med
medlemmene og stillingene i appen).

- **Identiteten** er medlemskapet: paret (fagmiljø, bruker) og navnet fra
  profilen. Ingen egen konto og ingen dobbeltregistrering. Et testmiljø
  har i stedet bare syntetiske medarbeidere uten konto, og ingen medlemmer
  hentes inn der (§8.3).
- **Alle aktive medlemmer er med** i kalenderen i ordinær drift, automatisk og uten noen
  handling, med navnet og stillingen fra profilen. Det finnes ingen egen
  medarbeiderliste og ingen «ikke med». Systemet gjetter ikke
  kvalifikasjoner: uten kvalifikasjon får ingen vakter.
- **Planleggingsinnstillingene** per medarbeider: kvalifikasjoner per
  bemanningsoppgave og vaktandel med perioder (§6.2). Begge med
  gyldighetsdato; endringer gjelder fra i dag (§7.4).
- **Uten stilling** i profilen vises medarbeideren i kalenderen som andre, og
  regnes med stillingsvekt 1 i fordelingen (som en kategori uten vekt i
  prototypen); planleggeren ser at stillingen mangler (vedtatt, B14).
- **Avsluttet eller sperret medlemskap** stopper tilgang, varsler og
  fremtidig planlegging fra den dagen. Historikken bevares innenfor
  oppbevaringstiden (§3.4). Hva som skjer med historikken når en konto
  slettes, avgjøres med ansvarlig virksomhet før ordinær bruk (§3.4, B9).
  Ingen ordning for anonymisering eller sletting er valgt ennå.
- **Stillingen er felles** for hele profilen, mens vekten per stilling er
  fagmiljøets oppsett. En endring gjelder fra dagen den lagres, uansett
  hvilket fagmiljø den gjøres fra, og skriver aldri om tidligere dager. En
  stilling som slettes eller erstattes i katalogen, beholdes i historikken,
  så tidligere vekter står (#602). En endring som påvirker vaktbelastningen,
  krever lokal administrativ myndighet (§8.4, B2) i hvert fagmiljø med
  kalenderen på der personen er aktivt medlem, uansett hvilket fagmiljø
  endringen gjøres fra; personen selv kan ikke endre den der (vedtatt,
  B14). Ingen utvidelse av den globale systemarkitekttilgangen.
- Planleggingsinnstillingene er skilt fra HR-data og fra kontorollene.

| ID | Krav |
| --- | --- |
| K-MED-1 | Utenfor testmiljø vises et nytt aktivt medlem i kalenderen samme dag uten noen handling, med navnet og stillingen fra profilen; medlemmene i kalenderen er nøyaktig fagmiljøets aktive medlemmer. Prøves med syntetiske kontoer i testdatabasen |
| K-MED-2 | Innstillingene redigeres bare i kalenderen, av rollene i §8.4, og aldri bakover i tid |
| K-MED-3 | Avsluttet medlemskap fjerner personen fra fremtidig planlegging og stopper tilgang og varsler samme dag, uten å skrive om historikken |
| K-MED-4 | Syntetiske medarbeidere kan bare finnes i et testmiljø, og et testmiljø har bare syntetiske medarbeidere; databasen avviser begge brudd |
| K-MED-5 | Stillingskategoriene i kalenderen er nøyaktig stillingene i appen; en ny eller endret stilling i profilen vises uten handling i kalenderen |
| K-MED-6 | Forventet vaktbelastning bruker stillingen som gjaldt hver enkelt dag, så et stillingsbytte ikke skriver om tidligere dager, også når stillingen endres fra et annet fagmiljø eller stillingen arkiveres eller erstattes i katalogen; prøvd med medlemskap i flere fagmiljøer (#602) |

### 8.6 Generell modell og konfigurasjon

Motoren er generell; fagmiljøets oppsett er **data**, versjonert med
gyldighetsdato og validert på serveren (vedtatt i prinsippet, §7.2 og
bestillingen):

| Oppsett per fagmiljø | Pilot (OUS Klinisk farmakologi) |
| --- | --- |
| Stillingskategorier | Appens stillinger (1:1, §7.4); stillingsvekt settes for LIS og overlege |
| Statuskatalog: navn, ikon, visningsgruppe, regnes som fysisk til stede, fremhevet oppgave, vaktfritak (alltid / administrativt / aldri), om den er et ønske, om medarbeideren kan sette den selv, aktiv | §7.2 og §6.2; alle statuser uten bemanningsbehov kan settes av medarbeideren selv (vedtatt, B16) |
| Bemanningsoppgaver: hvilke statuser som bemannes, antall per ukedag og helligdag, kvalifikasjonskrav, stillingsvekt per stilling, belastning | Vakt 1 og vakt 2, én hver per arbeidsdag, motsatte stillingsvekter (startverdi 2 : 1) |
| Fordelingsvekter, tidshorisont og grensen for utjevning | §6.1 med prototypens startverdier |
| Tidssone, arbeidsdager, helligdagskalender og standard for helgefilter | Europe/Oslo, vanlige hverdager, norske helligdager |

- **Bare oppgaver med bemanningsbehov fordeles automatisk.** Referent,
  Opplæring og lignende kan være manuelle statuser.
- **Ingen hardkodede navn** (LIS, overlege, vakt 1, vakt 2) utenfor
  pilotoppsettet.
- **Generalitet bevises med test (K-KON-2), ikke loves.** Krever et
  fremtidig fagmiljø nattevakter, samtidige oppgaver eller flere statuser
  per dag, avklares det da.
- **Det som må gjøres generelt i P2a** (kartleggingen §5): statuskategoriene
  blir data med egenskapen «regnes som til stede», visningsgruppe og
  fremhevet oppgave, uavhengig av vaktfritak og bemanningsbehov; ikoner og fargetoner hentes fra OUSFARs ikonregister og
  fargetokens; helligdagskalenderen og tidssonen blir en del av oppsettet,
  og «i dag» regnes i fagmiljøets tidssone på serveren; rollene avledes på
  serveren; stabilitetsvekten i ny plan blir en innstilling.
- **Vanlige innstillinger står i kalenderen**; avanserte (regelsett, vekter)
  under lokal administrasjon i kalenderen, skjult som standard.
- **LLM-assistert oppsett** (forslag, senere): et fagmiljø beskriver behovet
  med syntetiske eksempler, en agent foreslår et deklarativt oppsett med
  tester, og en lokal ansvarlig godkjenner en forhåndsvisning før
  aktivering. Ingen LLM i den løpende fordelingen og ingen produksjonsdata i
  eksterne agenter. Ikke med i første leveranse.

| ID | Krav |
| --- | --- |
| K-KON-1 | Pilotoppsettet gir samme resultater som prototypen for fasitene i §6.1 og §6.2 |
| K-KON-2 | Et annet syntetisk fagmiljø med andre navn, tre kategorier, andre bemanningsoppgaver, en annen bemanningskalender og mer enn én person per oppgave og dag virker uten endring i motoren |
| K-KON-3 | En endring i oppsettet gjelder fra dagen den lagres; tidligere dager vurderes etter oppsettet som gjaldt da, og konsekvensen vises før lagring |
| K-KON-4 | Et ugyldig oppsett kan ikke lagres (serveren validerer) |
| K-KON-5 | Det samme fagmiljøet virker uten endring i grensesnittet |

### 8.7 Data, server og samtidighet

Forslag til teknisk utforming, innenfor vedtakene i §3 og §6.2:

**Lagring.** Tabellene ligger i et eget skjema, `personal`, uten direkte
rettigheter for nettleseren. Nettleseren når dem bare gjennom funksjoner i
`public` med prefikset `personal_`, som kontrollerer aktivt medlemskap,
funksjonsbryteren og rollen, og som gir lesemodellen for fritak (§6.2). Hver
ny tabell og funksjon følger katalogvaktene (rekkevidde i ressurskatalogen og
kontroll av aktivt medlemskap, `docs/fagmiljoer.md`).

| Del | Innhold |
| --- | --- |
| Oppsett | Fagmiljøets versjonerte oppsett (§8.6) med gyldighetsdato |
| Medarbeidere | Paret (fagmiljø, bruker) i ordinær drift; bare syntetiske navn i et testmiljø |
| Medarbeiderinnstillinger | Kvalifikasjoner med gyldighetsdato; stillingen per dag fra profilens daterte historikk (#602) |
| Vaktandel | Som i §6.2, med databasebegrensningene der |
| Roller | Vaktplanansvarlige med fra og til, og hvem som utpekte |
| Kalenderoppføringer | Én per medarbeider og dato: status, valgfritt tidsrom, merknad, lås, administrativt vaktfritak (ja/nei), regelversjon og en versjon for samtidighetskontrollen |
| Forslag / vaktplankladd | Én aktiv, delt kladd per fagmiljø med avtrykk, periode, manuelle vaktjusteringer og eventuelle uttrykkelig tillatte endringer i publisert plan; atskilt fra operativ kalender |
| Publisering | Publisert omfang, tidspunkt, revisjoner og nødvendige før-/etter-opplysninger for sikker tilbaketrekking av siste publisering innen 24 timer (§3.4, B19) |
| Endringslogg | Minimalt revisjonsspor (hvem, når, før og etter), fritaket bare for roller med myndighet |
| Dørklokke | Én rad per fagmiljø og periode for sanntid, uten innhold |
| Påminnelsesvalg | Per bruker, fagmiljø og oppgavetype |
| Visningsvalg | Valgt visning, dato, filtre, kategorisering og sortering per bruker og fagmiljø i de eksisterende brukerinnstillingene |

**Regler på serveren.** De harde invariantene (høyst én status per
medarbeider og dato, høyst det bemannede antallet per oppgave og dato) står
som begrensninger i databasen. Regelmotorens kontroller (aktiv medarbeider,
aktiv status, kvalifikasjon, arbeidsdag, gyldig tidsrom, merknaden og
overtakelse) gjøres i kommandoene på serveren. Den samme regelmotoren i delt
TypeScript gir umiddelbar tilbakemelding i grensesnittet, og en test kjører
de samme fasitene mot begge, slik OUSFAR alt gjør for brukernavn og
fødselsnummer.

**Delt kode.** Domenekoden fra prototypen flyttes til
`supabase/functions/_delt/personal/` (ren TypeScript uten avhengigheter),
som appen leser gjennom `@delt/...` og serveren bruker direkte.

**Fordelingen kjøres på serveren**, fordi den leser fritaket, som
vaktplanansvarlig ikke skal se. Et forslag for et helt år tok om lag
4,5 sekunder i prototypen, mer enn CPU-tiden en Edge-funksjon får. Standard
er derfor et serverendepunkt i Vercel med den samme delte koden, som
kontrollerer innloggingen og rollen i databasen før det leser noe, og som har
en fast tidsgrense. Plasseringen og grensen fastsettes etter måling i P4. Forslaget lagres med
avtrykket som redigerbar kladd. «Publiser forslag» validerer og godtar/
publiserer i én kommando. Endret grunnlag må vurderes på nytt.
Svaret til rollen følger lesemodellen.

**Vaktplankladden** (revidert 27.11.2026, B19). Detaljert arbeidsflyt
står i [personal-design.md](personal-design.md) §5:

- **To lag.** Operativ kalender med medarbeideres statuser og publiserte
  vakter (én status per person og dag), og én aktiv, delt redigerbar kladd
  per fagmiljø. Lag forslag oppretter kladden direkte; manuelle
  vaktjusteringer i forslaget inngår i kladden. Bare planleggerne ser den.
  En kandidat er ikke en operativ tildeling. Eksisterende publisert plan
  står uendret til publisering; endringer der må tillates uttrykkelig.
- **Medarbeiderens status går foran kladden.** En egen status på dag med
  kladdevakt lagres uten å røpe kladden; kandidaten markeres i konflikt,
  teller ikke i kladddekningen, og plassen regnes som udekket.
- **Kladden kontrolleres hele tiden** mot gjeldende statuser, regler,
  medlemskap og beregningsgrunnlag. Oppdater reparerer med færrest
  mulige endringer. Endret grunnlag må vurderes på nytt, uten å røpe
  administrativt fritak.
- **Publiser forslag** er én atomisk godkjenning og publisering. Ugyldige
  kandidater og samtidighetskonflikter blokkerer; faktiske udekkede
  behov kan publiseres med tydelig advarsel og bekreftelse. Før commit
  vises ingen foreslått tildeling i operativ kalender, Dagen i dag, Mine
  vakter eller varsler. Avbryt forkaster bare kladden, aldri nye
  medarbeiderstatuser eller operativ plan.
- **Etter publisering** står en publisert vakt. En kollega kan aldri
  endre den, heller ikke ved slett, flytting, flervalg eller angre
  (B15). VPA/admin kan korrigere manuelt utenfor kladdarbeidet som
  én validert operativ endring. I et aktivt forslag inngår vakter
  i forslagets tidsrom i kladden.
- **Trekk tilbake siste publisering** er en ny validert, atomisk
  gjenoppretting av forrige operative plan i berørt omfang innen 24
  timer, aldri av avviklede vaktdager. Avvis hvis senere relevante
  endringer eller konflikter hindrer sikker gjenoppretting; ingen
  overskriving av nye statuser eller nyere tildelinger. Varsler og
  påminnelser revideres etter B7/B10. Oppbevaring av revisjonsspor
  avgjøres etter §3.4.

**Samtidighet.**

- Hver endring er én kommando som lagres atomisk med en gang, med den
  versjonen av cellene klienten så. Har noen andre endret dem imens, avvises
  endringen med konflikt (som `forventet_revisjon` og `PT409` i
  redigeringen), og kalenderen hentes på nytt. Ingen endring overskriver en
  annen lydløst.
- **Angre og gjør om er nye, validerte endringer** mot gjeldende kalender,
  med samme rettighetskrav som endringen (fritaket, vaktandelen bakover i
  tid). De gjenoppretter aldri en gammel kalender.
- **Sanntid** med en dørklokke uten innhold, som i chatten og diskusjonene:
  den som har kalenderen åpen, henter det endrede tidsrommet på nytt. Ingen
  polling.

**Ytelse.** Kalenderen henter bare tidsrommet som vises (dag, uke, måned eller
helår), med indeks på fagmiljø og dato. Ingen henting av hele historikken.

| ID | Krav |
| --- | --- |
| K-DAT-1 | Klienten får aldri fritaksfeltet eller fritaksavhengige tall uten myndighet, heller ikke i underliggende data |
| K-DAT-2 | Hver kommando validerer på nytt på serveren og lagres atomisk; regelparitetstesten mellom server og klient er grønn |
| K-DAT-3 | Samtidige endringer av samme celle gir konflikt, aldri tap; prøvd med to forbindelser mot ekte Postgres 17 |
| K-DAT-4 | Angre og gjør om respekterer rettighetene og vaktandelens historikk, også over midnatt |
| K-DAT-5 | Et forslag med foreldet beregningsgrunnlag kan ikke publiseres uten ny gyldig vurdering |
| K-DAT-6 | Helårsvisningen for 30 medarbeidere hentes på under ett sekund i produksjonslik database |
| K-KLA-1 | Bare planleggerne ser kladden i eksplisitte planleggerflater; Dagen i dag, Mine vakter, ordinær statistikk og varsler viser operativ plan for alle roller; ingen kladd i kollegers API-svar |
| K-KLA-2 | En medarbeiders nye status på en dag med egen kladdevakt lagres, og kladdevakten markeres som i konflikt, teller ikke i dekningen og regnes som udekket; bare gyldige kladdevakter kan publiseres |
| K-KLA-3 | En kladd med konflikt kan ikke publiseres; serveren kontrollerer på nytt ved publisering, også når to planleggere publiserer samtidig |
| K-KLA-4 | Endret grunnlag uten konflikt vises før publisering, og «Oppdater» gir en gyldig kladd med færrest mulige endringer |
| K-KLA-5 | Endring i publisert plan (manuelt, overtakelse eller publisert forslag) er atomisk med versjonskontroll per celle; en samtidig egen statusendring gir konflikt for hele endringen, prøvd med to forbindelser mot ekte Postgres 17 |
| K-KLA-6 | Lag forslag oppretter delt kladd direkte, manuelle vaktendringer inngår, og Avbryt forkaster kun kladden; operativ plan og nye medarbeiderstatuser bevares, også ved samtidig redigering |
| K-KLA-7 | Publiser forslag godtar og publiserer atomisk; ingen separat Godta; faktisk udekket behov krever advarsel/bekreftelse; ved feil rulles hele transaksjonen tilbake |
| K-KLA-8 | Bare siste publisering kan trekkes tilbake innen 24 timer, med validert atomisk gjenoppretting av forrige plan; test grensen, avviklede dager, senere endringer, tilgang og varsler |

### 8.8 Brukerflatene

Vedtatt (bestilt): dag-, uke-, måneds- og helårsvisning, statusboblen og
direkte redigering, medarbeiderinnstillinger, vaktfordeling og
vaktbelastning, egne kommende vakter, påminnelser, Dagen i dag øverst på
forsiden, desktop og mobil, lyst og mørkt tema, tastatur og berøring.
Designretningen er valgt 27.11.2026 (B1): forsiden fra B, resten fra A,
med endringene i [personal-design.md](personal-design.md), som er
bindende detaljspesifikasjon.

- **Kalender** (`#/kalender`) under Personal i hovedmenyen (#606). Inne i den:
  kalenderen, og for planleggerne Vaktfordeling og Medarbeidere.
  Innstillinger etter myndighet.
- **Dagen i dag** øverst på forsiden i fagmiljøet man arbeider i: dato med
  symmetriske datopiler, kompakte fremhevede oppgaver (inkl. Referent),
  Til stede gruppert etter stilling, Jobber et annet sted og Fraværende
  med status under navnet; alfabetisk sortering, avatarer og ingen
  dobbelttelling. Ren leseflate for alle roller; kun merknadsboble ved
  behov. «I kalenderen» er en ordinær knapp til valgt dato. Ingen status
  betyr planlagt til stede, ikke registrert oppmøte. Bare operativ plan,
  aldri kladd; skill udekket fra upublisert.
- **Mine vakter**: egne kommende vakter og oppgaver, med lenke til dagen.
- Valgt visning, dato, filtre, kategorisering og sortering huskes per bruker; utkast og skjemaer bruker
  `useBevart`. Små skjermer får en lesbar dagsvisning med lett tilgjengelig
  redigering, ikke en sammenpresset tabell.
- Ingen tekniske opplysninger eller forklaringer av motoren i vanlig
  visning. Ikon og kort tekst, tilgjengelige navn, og hovering, fokus og
  berøring for informasjonsboblene.

| ID | Krav |
| --- | --- |
| K-UI-1 | A-kravene som trinnet dekker (§8.11), er oppfylt i den valgte designretningen; hele akseptmatrisen, også A-NY-radene, kontrolleres samlet i P7 |
| K-UI-2 | Hele arbeidsforløpet går med bare tastatur og med bare berøring |
| K-UI-3 | Lyst og mørkt tema og smal skjerm er kontrollert for alle flatene |
| K-UI-4 | Dagen i dag viser bare det rollen kan se, for fagmiljøet man arbeider i, og bare den publiserte planen |

### 8.9 Varsler

- **Påminnelser** om egne vakter og oppgaver, slått på av den enkelte per
  oppgavetype og tidspunkt (for eksempel Vakt 1 dagen før kl. 15, Referent
  samme dag kl. 08). Bare oppgavetypene som finnes i fagmiljøet, vises.
- Bare **egne, publiserte** tildelinger, aldri forslag eller kladd. En endring eller et bytte avlyser det gamle varselet og
  planlegger et nytt. Tilgangen og tildelingen kontrolleres på nytt rett før
  utsending. Fagmiljøets tidssone gjelder, også ved sommertid.
- **Varsel ved endring i egen publisert plan** er et eget valg, av som
  standard (vedtatt, B10).
- **Låseskjermen** viser aldri kollegers navn, fravær, merknader eller
  fritak. Den kan vise egen oppgave og dag («Vakt 1 i morgen»), forutsatt at
  avklaringen i §3.4 tillater det (vedtatt, B7).
- Utlogging, sperring og avsluttet medlemskap stopper varslene.
- Infrastrukturen er Devs felles varsler på enheten
  ([#600](https://github.com/peohol/ousfar/issues/600)); Personal lager
  ingen egen. Chatvalg styrer ikke kalendervalg.

| ID | Krav |
| --- | --- |
| K-VAR-1 | Et varsel sendes én gang, til rett tid, også ved sommertid, og ikke etter en endring som fjerner tildelingen |
| K-VAR-2 | Ingen varsler om forslag, upubliserte vakter, fritak eller andres opplysninger |
| K-VAR-3 | Varslene stopper ved utlogging, avsluttet medlemskap og når valget slås av; chatvarslene virker som før |
| K-VAR-4 | Virker med appen lukket på PC/Mac og Android, og på iPhone/iPad fra Hjem-skjermen |

### 8.10 Avhengigheter til OUSFAR Dev

| Issue | Hva | Trengs før |
| --- | --- | --- |
| [#572](https://github.com/peohol/ousfar/issues/572) | Hjelper for eget medlemskap uten systemarkitektunntak (avgrenset på nytt 26.11.2026; utvidelsespunktet i brukeroversikten utgår) | P2b |
| [#598](https://github.com/peohol/ousfar/issues/598) | Funksjonsbrytere per fagmiljø og testmiljø-markering | P2b |
| [#599](https://github.com/peohol/ousfar/issues/599) | Forsiden: paneler med tilgang, felt øverst og lasting ved behov | P5 |
| [#600](https://github.com/peohol/ousfar/issues/600) | Varsler på enheten for flere formål, med utsending på et tidspunkt | P6 |
| [#601](https://github.com/peohol/ousfar/issues/601) | Føringer i endringsloggen bare for systemarkitekter | P7 (til da er føringene nøytrale, så K-SKJ-2 holder uten) |
| [#602](https://github.com/peohol/ousfar/issues/602) | Datert stillingshistorikk på profilen, lesbar per dag på serveren | P4 |

Personal eier selv menyvalget, sidene, modulenes innhold, tabellene,
migrasjonene, rollene og reglene for kalenderen (§2). Sanntiden bruker det
eksisterende mønsteret med dørklokke og trenger ingen ny felles mekanisme.

### 8.11 Rekkefølge

Hvert trinn er én avgrenset PR med `ansvar:personal` (P2 kan deles), merket
«Til ChatGPT-kontroll – ikke merge», med A- og K-ID-ene den dekker, og med
arbeidsforløp og negative tilfeller med syntetiske ansatte (§5). Dev-trinnene
går parallelt.

| Trinn | Innhold | Avhenger av | Ferdig når |
| --- | --- | --- | --- |
| **P0** | Denne planen, akseptmatrisen, Dev-Issue-ene og produktbeslutningene | | Slått sammen |
| **P1** | Tre forslag er vurdert og B1 er avgjort. Revider prototype-PR vaktplan#18 til én samlet klikkbar design i beskyttet forhåndsvisning; syntetiske data. Ingen appkode i OUSFAR | | Samlet prototype akseptert mot personal-design.md |
| **P2a** | Domenekoden og testene fra prototypen til `_delt/personal/`, med pilotoppsettet og et syntetisk andre fagmiljø. Ingen database eller visning | P0 (B11) | K-KON-1, K-KON-2, fasitene i §6 grønne; oppdatert katalog og flytteregler (B17/B18) |
| **P2b** | Skjemaet `personal`: tabellene, lesemodellen, kommandoene med validering og samtidighet, funksjonsbryteren og testmiljøet, syntetiske medarbeidere i Sandkasse | P2a, #572, #598 | K-SKJ-1–6, K-SKJ-9–10, K-TIL-1–5, K-MED-4, K-DAT-1–3, K-KON-3–4 |
| **P2c** | Medarbeidere i kalenderen (automatisk tilknytning 1:1 med medlemmene og stillingene, kvalifikasjoner, vaktandel, vaktplanansvarlige) og `Vis som`, med menyvalget | P2b, B2 | K-MED-1–5, K-SKJ-7–8 |
| **P3** | Kalenderens fire visninger og manuell planlegging: statusboblen, flervalg, filtre, flytting og bytte, overtakelse, merknader og klokkeslett, angre, sanntid, og medarbeidernes egne statuser | P2c, P1, B15b, B16, B17, B18 | A-gruppene STA, KAL, DAG, BOB, MRK, OVT, FLY, FLT, ANG, MED, VAN, FRI, TIL og relevante A-UX; K-UI-1–3, K-KON-5, K-DAT-4, K-DAT-6, K-TIL-6 |
| **P4** | Vaktplankladden, vaktfordelingen på serveren, vaktbelastningen, lås, redigerbart forslag, samlet publisering og trygg tilbaketrekking (B19), kontrollert mot prototypen og fasiten | P3, #602 | A-gruppene REG, FOR, PUB, FKL og BEL; K-UI-1, K-MED-6, K-TIL-7, K-KLA-1–8, K-DAT-5 |
| **P5** | Dagen i dag og Mine vakter | P4, #599 | A-NY-09 og A-NY-10 og relevante A-UX; K-UI-1, K-UI-4 |
| **P6** | Påminnelser og varsel ved endring | P4, #600, B7, B10 | A-NY-11; K-UI-1, K-VAR-1–4 |
| **P7** | Samlet produktaksept med syntetiske data i Sandkasse og det lokale testmiljøet, negativ tilgangskontroll, ytelse og mobil. Deretter avklaringen i §3.4 og, etter Peders ja, `på` for OUS Klinisk farmakologi. Første plan starter fra blanke ark | P1–P6 | Hele akseptmatrisen; §3.4 ført inn; Peders ja |
| **P8** | Avvikling av prototypen, etter verifisert pilot og særskilt beslutning, med kontroll av gamle utrullinger og historikk uten å gjengi innhold | P7 | Peders beslutning |

Teknisk sammenslåing, produktaksept og godkjenning for reell bruk er
separate beslutninger (§5). Hvert trinn etter P2b kan slås sammen og
publiseres uten at noen andre enn systemarkitektene merker det.

### 8.12 Beslutninger for Peder

Vedtatt fra før og ikke til ny vurdering: §3, §6.1, §6.2, §7.2 og
bestillingen 26.11.2026 (§8.1 og §8.3).

**Avgjort av Peder 26.11.2026.** B3–B6, B13 og B15 i prosjektets samtale og
på beslutningskort; de øvrige bekreftet av Peder etter ChatGPT-kontrollen og
formidlet i PR #603. B7, B9 og aktiveringen for ordinære brukere krever
fortsatt avklaringen med ansvarlig virksomhet (§3.4, §8.13).

| Nr. | Spørsmål | Avgjørelse |
| --- | --- | --- |
| B2 | Hva er «systemarkitekt med lokal myndighet»? | En systemarkitekt som også er aktivt medlem og lokal administrator i fagmiljøet. Den globale rollen gir ikke i seg selv tilgang |
| B3 | Hvem utpeker vaktplanansvarlige? | Lokal administrator. Flere kan være vaktplanansvarlige samtidig |
| B3b | Hvem endrer regelsett, bemanningsbehov og vekter? | Lokal administrator (og B2) |
| B4 | Hvem endrer kvalifikasjoner og vaktandel? | Vaktplanansvarlig og lokal administrator |
| B5 | Hva ser de andre av plan som ikke er publisert? | Bare det som er publisert, aldri kladden. Bare planleggerne lager vakter automatisk, og systemet sikrer at kladden blir riktig når medarbeidere endrer statuser før publisering (§8.7) |
| B6 | Kan medarbeiderne selv registrere statuser? | Ja, fortløpende, som i dagens regneark. Vaktplanansvarlig tildeler vakter, men legger ikke inn andres ferieønsker og lignende |
| B7 | Hva kan stå på låseskjermen om egen oppgave? | Egen oppgave og dag («Vakt 1 i morgen»), forutsatt at avklaringen i §3.4 tillater det; aldri andres opplysninger |
| B8 | Hvem slår på kalenderen for et fagmiljø? | En systemarkitekt i appen, etter Peders uttrykkelige produktgodkjenning og avklaringen med ansvarlig virksomhet (§3.4) |
| B9 | Hva skjer med historikken når en konto slettes? | Avgjøres med ansvarlig virksomhet før ordinær bruk (§3.4). Ingen ordning for anonymisering eller sletting er godkjent nå |
| B10 | Varsel når egen publisert plan endres? | Eget valg, av som standard |
| B11 | Rekkefølgen i §8.11, og når kan P2a starte? | Rekkefølgen står. P2a (domenekoden uten database og visning) kan bygges parallelt med designarbeidet når P0 er godkjent, uten å vente på B1 eller Dev-leveranser den ikke trenger |
| B12 | Holde første versjon til én status per dag og dagbaserte oppgaver? | Ja; nye modeller avklares når et fagmiljø trenger dem |
| B13 | Stillingskategori og medarbeidere | 1:1 med stillingene i appen og med medlemmene i fagmiljøet, hentet automatisk; kalenderen er en integrert del av appen, ikke en tilleggsfunksjon (§7.4) |
| B14 | Hvem kan endre stillingen, som styrer forventet antall vakter? | En endring som påvirker vaktbelastningen, krever lokal administrativ myndighet i hvert fagmiljø med kalenderen på der personen er medlem (§8.5); endringen gjelder fra i dag; uten stilling regnes vekt 1, og planleggeren ser at den mangler. Ingen utvidelse av den globale systemarkitekttilgangen |
| B15 | Kan en medarbeider sette en status på en dag med egen publisert vakt? | Nei. Det avvises, vakten står, og medarbeideren får beskjed om å ta det med vaktplanansvarlig. Forespørsel om vaktbytte kan komme senere |
| B15b | Kan en medarbeider endre egne statuser bakover i tid? | Nei. Egne endringer gjelder fra i dag og fremover; vaktplanansvarlig kan rette tidligere dager |
| B16 | Hvilke statuser kan medarbeideren sette selv? | Alle uten bemanningsbehov, også Ferie og Opplæring med automatisk vaktfritak etter §6.2; aldri vakter, lås eller administrativt vaktfritak. Vernet av publiserte vakter (B15) står |

**Avgjort av Peder 27.11.2026** etter utprøving og drøfting med ChatGPT:

| Nr. | Spørsmål | Avgjørelse |
| --- | --- | --- |
| B1 | Hvilken designretning? | Forsiden fra B, resten fra A; én samlet prototype med alle endringene i personal-design.md. Designvalg er ikke endelig produktaksept. |
| B17 | Ferie/Fri og tilstedeværelse? | Slå sammen Ferie og Fri til Ferie med solikon. Ferie gir fritak, ordinær deltidsfri registreres som Borte uten fritak; historikk beholder betydning. Tre konfigurerbare visningsgrupper, jf. §6.2 og §7.2. |
| B18 | Flytting og navigasjon? | Virtuell Til stede-draggable; månedsdrag flytter person med status mellom datoer, med eksplisitt bytte/overtakelse. Alle fire visninger og detaljene i personal-design.md §4. |
| B19 | Fra forslag til publisering? | Ett aktivt, delt redigerbart forslag per fagmiljø; Lag forslag → Publiser forslag eller Avbryt. Tidligere publisert plan uendret til atomisk publisering. Sikker, validert tilbaketrekking av siste publisering i 24 timer, jf. §8.7 og personal-design.md §5. |

Avgjørelsene føres inn i §6 (regler) eller her, med dato.

### 8.13 Før bruk med reelle opplysninger

I tillegg til punktene i §3.4 avklares med ansvarlig virksomhet før `på` i et
virkelig fagmiljø: formålet og dataminimeringen, rollene i §8.4,
oppbevaringstid og sletting (også B9), revisjonssporet og hvem som ser det,
innholdet i varslene (B7), visning av eksisterende profilbilde innenfor
fagmiljøet, revisjonsspor for tilbaketrekking og hvem i virksomheten som er ansvarlig. Ingen
import av regneark eller syntetisk historikk; første plan starter fra blanke
ark. Prototypen arkiveres eller slettes først etter P8.
