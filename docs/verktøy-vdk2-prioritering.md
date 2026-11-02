# OUSFAR Verktøy – VDK-2: prioritert plan for klinisk regeldekning

**Status: til uavhengig kontroll (ChatGPT). Ingenting her er aktivert eller klinisk godkjent.** Dokumentet svarer på VDK-2 i `docs/verktøy-omlegging-2026-11.md`. Det bygger på kartleggingen i VDK-1 (`docs/verktøy-vdk1-regeldekning.md`), som er generert fra regelsettet og viser hva verktøyene faktisk gjør i dag.

Planen endrer ingen regel, ingen regelversjon og ingen godkjenning. Regelutkastene og testkasusene nedenfor er **spesifikasjoner til kontroll**, ikke kode, og ingen av dem ligger i regelsettet (`REGELSETTENE` i `src/verktoy/tilgjengelighet.ts`). Hvert forslag som blir godtatt, lages senere som en egen, avgrenset PR (VDK-3) med regel, norske preparater, positive og negative tester og uavhengig kontroll av nøyaktig den regelversjonen.

Rammer for alt i dokumentet:

- Testkasusene er syntetiske, uten pasientopplysninger.
- Psychiatrienet er bare brukt som metadata som allerede ligger i repoet, og bare i sum: om kildetabellen har en anbefaling for en kombinasjon. Ingen tekst derfra er lest inn, sitert, oversatt eller omskrevet, og at kilden har en anbefaling, gjør aldri i seg selv et forslag til en OUSFAR-regel (`docs/verktøy-p3-rettigheter.md`).
- Doseverdier kommer fra preparatomtalene (pkt. 4.2 og tabellene der), NICE NG222, RCPsych og kontrollørens tidligere beslutninger. Der kildene ikke gir en verdi, står det som et åpent spørsmål, aldri som en utfylt verdi.

## 1. Kort fortalt

- **I dag gir verktøyene en plan for 4 av over 1 600 kombinasjoner**, og hver av dem bare i et smalt omfang (VDK-1, avsnitt 1–2).
- **Den raskeste gevinsten krever ingen ny regel:** fire nedtrappingsregler som allerede er kontrollert (amitriptylin, nortriptylin, escitalopram og escitalopram langsom), gir flere reduksjoner med norske preparater innenfor omfanget kontrolløren allerede har avgrenset. De trenger bare en kontroll av den eksisterende versjonen (forslag 1).
- **Den viktigste prinsippbeslutningen er trinnstørrelsen ved kort behandlingstid.** I dag tilbys høyst 25 % per reduksjon. Det gir én reduksjon for sertralin, escitalopram (tabletter), fluoksetin, fluvoksamin og vortioksetin. Med inntil 50 % som valg, slik RCPsych beskriver ved middels og lav risiko, gir de samme reglene to til tre reduksjoner (forslag 2).
- **For antipsykotika gir depotovergangene mest nytte per regel.** Preparatomtalene har eksakte doseringstabeller, så reglene kan spesifiseres og testes uten å finne på verdier. Den godkjente Xeplion-regelen starter fra peroral paliperidon, som i Norge bare finnes på godkjenningsfritak. Overgangen fra peroral risperidon til Xeplion er den vanlige veien, og preparatomtalen gir den samme oppstarten (forslag 3).
- **Bytte mellom antidepressiver** utvides best én kombinasjon om gangen. Først kommer escitalopram og citalopram til mirtazapin, laget etter mønsteret fra den godkjente sertralinregelen (forslag 5). Kildefunnene i tråd F og rettighetsavklaringen avgjør tempoet.

## 2. Hvorfor kombinasjonene stopper i dag (fra VDK-1)

| Hindring | Virkning | Hvem kan løse den |
| --- | --- | --- |
| Prosenttrinn uten toleranse, høyst 25 % (10 % ved lang behandlingstid), med norske tablettstyrker | De fleste nedtrappingsreglene gir høyst én reduksjon (VDK-1, avsnitt 7). | Kontrolløren: prinsippbeslutning (forslag 2). |
| Godkjenning bare per regelversjon og innenfor et klinisk omfang per celle | Selv en godkjent regel stopper utenfor omfanget (VDK-1, avsnitt 4). | Kontrolløren: utvidet omfang per regel. |
| Ingen OUSFAR-regel for byttekombinasjonene utenom pilotreglene | 504 av 506 antidepressivbytter og 892 av 1 122 antipsykotikabytter har en anbefaling i kildetabellen, men ingen OUSFAR-regel. | Én selvstendig regel per kombinasjon (P8–P10); en systematisk overføring krever rettighetsavklaring. |
| Mangler dokumentert flytende form | Zoloft konsentrat er sperret uten dokumentert oppmåling. Cipralex dråper (1 mg per dråpe) er dokumentert og brukes. | Dokumentasjon av oppmålingen (P5). |
| Depot til depot innenfor samme valg | Xeplion → Trevicta og Abilify Maintena 400 → 960 mg er «samme legemiddel og formulering» og regnes som ikke støttet. | Preparatvalg i verktøyet (P10.2–P10.3, tråd C) og i regelmodellen. |
| Kildefunn under vurdering | `rcpsych-stopping` (tempo for alle P7-regler og sertralinbyttet) og `keks-2016` (sertralinbyttet) har endret dokumentavtrykk. | Tråd F: om endringene gjelder delene reglene bygger på. |

## 3. Slik er forslagene prioritert

Hvert forslag er vurdert på fem punkter:

1. **Nytte:** hvor mange vanlige valg det åpner, og hvor ofte situasjonen oppstår i norsk praksis. Preparatene er fra FEST-uttrekkene i repoet (pilotsettet 30.10.2026 og formuleringene 08.10.2026).
2. **Kildegrunnlag:** om preparatomtalen, NICE eller RCPsych gir verdiene direkte, uten Psychiatrienet og uten antatte ekvivalenser.
3. **Spesifiserbarhet:** om regelen kan uttrykkes med dagens regelmodell og testes ved grenseverdiene.
4. **Risiko:** hva som skjer hvis regelen er feil, og om feilen kan oppdages ved neste vurdering.
5. **Avhengigheter:** tråd F (kildefunn), tråd C (verktøyets brukerflate og preparatvalg) og rettighetsavklaringen.

## 4. Prioritert liste

| # | Forslag | Verktøy | Type endring | Nytte | Viktigste hindring |
| --- | --- | --- | --- | --- | --- |
| 1 | Kontroll av fire eksisterende nedtrappingsregler i eksisterende omfang | Trappe ned AD | Bare kontroll, ingen regelendring | 3 nye virkestoffer med flertrinnsplan | Tråd F (`rcpsych-stopping`) |
| 2 | Trinnstørrelse inntil 50 % ved kort behandlingstid | Trappe ned AD | Prinsippbeslutning, deretter nye regelversjoner | 5 virkestoffer går fra 1 til 2–3 reduksjoner | Endrer en tidligere fagbeslutning; tråd F |
| 3 | Peroral risperidon → Xeplion, og generisk paliperidonpalmitat | Bytte AP | Ny regel og utvidet preparatliste | Den vanlige veien til månedlig paliperidondepot | Måldosen (ingen tabell i preparatomtalen) |
| 4 | Abilify Maintena: to-injeksjonsstart og 960 mg fra peroral aripiprazol | Bytte AP | Nye regler ved siden av den godkjente | Flere oppstartsvarianter for samme kombinasjon | Verktøyet må vise alternative regimer (tråd C) |
| 5 | Escitalopram og citalopram → mirtazapin | Bytte AD | Nye regler etter sertralinmønsteret | De vanligste SSRI-ene til mirtazapin | Tråd F (`keks-2016`); én vurdering per kombinasjon |
| 6 | Risperdal Consta → Xeplion | Bytte AP | Ny regel | Eksakt doseringstabell i preparatomtalen | Okedi og Consta er samme valg i verktøyet |
| 7 | Peroral risperidon eller Consta → Okedi | Bytte AP | Ny regel | Eksakt tabell, ingen peroral overlapp | Samme valg som Consta; mangler i FEST-uttrekket |
| 8 | Peroral olanzapin → Zypadhera | Bytte AP | Ny regel | Eksakt tabell | Observasjon etter injeksjon; 150 mg finnes ikke i FEST |
| 9 | Depot til depot: Xeplion ↔ Trevicta, Maintena 400 → 960 mg | Bytte AP | Ny regel og preparatvalg | Eksakte tabeller | Krever preparatvalg (P10.2–P10.3, tråd C) |
| 10 | Opptitrering av kvetiapin som egen regel | Bytte AP | Ny regel (P4-oppfølging) | Første steg mot perorale antipsykotikabytter (P9) | Gjelder mange fra-stoffer; hvert må vurderes |

Forslag 1 og 2 kan kontrolleres straks. Forslag 3–8 kan lages som regler med dagens modell, ett om gangen. Forslag 9 venter på preparatvalget i P10. Forslag 10 er et lite første steg mot P9.

## 5. Forslagene i detalj

### Forslag 1 – Kontroll av eksisterende nedtrappingsregler i eksisterende omfang

**Hva:** Kontrolløren vurderer fire regelversjoner som allerede står i regelsettet med et klinisk omfang kontrolløren selv valgte ut (`docs/verktøy-p7-nedtrapping.md` §10), men med utfallet «kontrollert, ikke godkjent» fra disposisjonen 31.10.2026. Ingen regel endres, så fingeravtrykkene står fast:

| Regel | Versjon | Fingeravtrykk | Klinisk omfang i dag |
| --- | --- | --- | --- |
| `seponering-amitriptylin` | 11 | `dcc526c4db9db4e5a77994b49d7e18890e1799a19c9f4fbc2bf63e31151c4eb7` | kort: tablett 25, 50, 75, 100 og 150 mg; lang: 50 og 75 mg; styrker 10, 25 og 50 mg |
| `seponering-nortriptylin` | 11 | `c2594aabadd1c4ecb41776ab1bac5f2c7cc1b781027fa544726f96c210c25fcd` | kort: tablett 25, 50 og 150 mg; lang: 50 mg; styrker 10, 25 og 50 mg |
| `seponering-escitalopram` | 11 | `a2d959cae2780053d15188ae0e160292e06af5155dfacafcfa41b1d850b127db` | kort: tablett 20 mg, dråper 10 og 20 mg; lang: dråper 10 og 20 mg; tablett 5, 10 og 20 mg, dråper 1 mg |
| `seponering-escitalopram-langsom` | 7 | `8dcd4f992fe4f9fb55aebf1dc4eda04bc0399d2ef91ca90a14d699979cd53e3d` | dråper 20 mg |

**Kildegrunnlag:** det samme som for den godkjente vortioksetinregelen: preparatomtalene (Sarotex, Noritren, Cipralex tabletter og dråper), RCPsych «Stopping antidepressants» (tempo og risikogrupper), NICE NG222 1.4.15–1.4.21 og kontrollørens beslutninger P7-A til P7-C.

**Norske preparater (FEST):** amitriptylin (Sarotex) 10, 25 og 50 mg; nortriptylin (Noritren) 10, 25 og 50 mg; escitalopram tabletter 5, 10 og 20 mg (Cipralex, Escitalopram Actavis, Escitalopram Grindeks); Cipralex dråper 20 mg/ml med 1 mg per dråpe.

**Forventet nytte:** «Trappe ned antidepressiv» får tre nye virkestoffer med plan. Med forskriverens valg ved hvert trinn som ikke kan gis nøyaktig, gir amitriptylin og nortriptylin fra 50 mg fire reduksjoner (50 → 40 → 30 → 25 → 20 mg). Escitalopram dråper gir åtte reduksjoner fra 20 mg (aksepttesten, scenario h). Til sammenligning gir den godkjente vortioksetinregelen én.

**Hindringer:**

- Reglene bygger på `rcpsych-stopping`, som har et kildefunn under vurdering i tråd F. Kontrollen kan gjøres parallelt, men en godkjenning bør først registreres når tråd F har slått fast at delene om tempo og risikogrupper er uendret.
- Escitalopram har et unntak for QT-forlengelse og en høyeste dose på 10 mg over 65 år. Begge stopper beregningen og er allerede testet.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 1.1 | Gjelder en godkjenning hele kjeden av reduksjoner der forskriveren velger en dose ved hvert trinn som ikke kan gis (scenario h), eller bare første reduksjon? | Hele kjeden innenfor det foretrukne området. Hvert valg er eksplisitt, hver reduksjon krever ny vurdering av toleransen, og prinsippet er alt akseptert i P7-A. |
| 1.2 | Er en delplan som stopper ved 20 mg (amitriptylin og nortriptylin) eller 3 mg (escitalopram dråper) akseptabel når planen sier at videre nedtrapping vurderes individuelt? | Ja. Det er samme utfall som for vortioksetin, og planen går aldri til null. |
| 1.3 | Skal amitriptylin og nortriptylin godkjennes for alle startdosene i omfanget, eller bare der første reduksjon kan gis nøyaktig eller med et valg? | Alle startdosene i omfanget. Der første reduksjon ikke kan gis, stopper planen allerede med forklaring. |

**Syntetiske testkasus** (forventet utfall fra aksepttesten, `docs/verktøy-p7-aksepttest.md`; alle med svaret nei på pasientgruppe og indikasjon, bekreftet organfunksjon og interaksjoner, og ingen tidligere seponeringsplager der ikke annet står):

| ID | Inndata | Forventet |
| --- | --- | --- |
| K1-01 | Amitriptylin 50 mg, kort | Trinn 1 stopper og tilbyr bare 40 mg (−20 %); 35 mg (−30 %) tilbys ikke. |
| K1-02 | Som K1-01, valg 40, 25 og 20 mg | 40 → 30 → 25 → 20 mg, hvert valgte trinn merket «valgt av forskriveren»; stopper ved 20 mg. |
| K1-03 | Amitriptylin 50 mg, lang | 45 mg; én mulig reduksjon med revurdering. |
| K1-04 | Amitriptylin 50 mg, tidligere seponeringsplager | Langsom variant: stopper, 45 mg er −10 % og utenfor 1–5 %. |
| K1-05 | Amitriptylin 10 mg, kort | Stopper: 7,5 mg kan ikke gis, og ingen dose innenfor 5–25 %. |
| K1-06 | Amitriptylin 60 mg, kort | Ingen klinisk plan: startdosen er utenfor omfanget. |
| K1-07 | Nortriptylin 50 mg, kort, med valg | 40 → 30 → 25 → 20 mg; stopper ved 20 mg. |
| K1-08 | Nortriptylin 75 mg, kort | Ingen klinisk plan: utenfor omfanget. |
| K1-09 | Escitalopram dråper 20 mg, kort, med valg | 15 → 12 → 9 → 7 → 6 → 5 → 4 → 3 mg; stopper ved 3 mg. |
| K1-10 | Escitalopram dråper 20 mg, lang | 18 mg; neste valg 17 mg (−5,56 %). |
| K1-11 | Escitalopram dråper 20 mg, tidligere seponeringsplager | Langsom variant: 19 mg; én mulig reduksjon med revurdering. |
| K1-12 | Escitalopram tablett 20 mg, kort | 15 mg; én mulig reduksjon (10 mg er −33 % og tilbys ikke). |
| K1-13 | Escitalopram tablett 10 mg, kort | Ingen klinisk plan: tablett 10 mg er utenfor omfanget. |
| K1-14 | Escitalopram 20 mg, over 65 år | Stopper: høyeste dose over 65 år er 10 mg. |
| K1-15 | Escitalopram dråper 1 mg | Stopper: 0,75 mg kan ikke gis. |

### Forslag 2 – Trinnstørrelse inntil 50 % ved kort behandlingstid

**Hva:** En prinsippbeslutning, deretter nye regelversjoner. I middels- og lavrisikogruppen ved kort behandlingstid skal en dose som kan gis, med faktisk reduksjon over 25 % og høyst 50 %, kunne **tilbys som valg** når regelens forslag (25 %) ikke kan gis nøyaktig. Den skal ikke kreve begrunnelse og ikke regnes som avvik. Forslaget per trinn er fortsatt 25 %. Uendret er:

- høyst 25 % fra laveste døgndose, men ikke for fluoksetin;
- 10 % ved lang behandlingstid, der mer fortsatt er et avvik som ikke tilbys;
- 1–5 % i de langsomme variantene;
- høyrisikogruppen, ingen toleranse og ingen nulltrinn.

**Kildegrunnlag:**

- RCPsych «Stopping antidepressants» beskriver om lag 50 % per trinn ved middels eller lavere risiko (`docs/verktøy-p7-nedtrapping.md` §2).
- NICE NG222 1.4.16 beskriver hvert trinn som en andel av forrige dose, med 50 % som eksempel og mindre trinn, for eksempel 25 %, når dosen blir lav.
- Fagvurderingen 29.10.2026 (beslutning 1) satte valgområdet til 5–50 % med begrunnelse over 25 %. Kontrollørens gjennomgang av 9cb420b gjorde en dose som krever begrunnelse til et avvik som ikke tilbys. Forslaget endrer altså ikke området, bare om delen 25–50 % kan tilbys.
- Den godkjente sertralinregelen bruker alt 50 % per trinn (100 → 50 → 25 mg) i en kryssnedtrapping.

**Norske preparater:** som i aksepttesten (FEST 30.10.2026).

**Forventet nytte** (modellberegningen i VDK-1, avsnitt 7, med valget nærmest 25 % ved hvert trinn):

| Virkestoff | I dag (høyst 25 %) | Med inntil 50 % som valg |
| --- | --- | --- |
| Sertralin 100 mg | 100 → 75 mg | 100 → 75 → 50 → 25 mg |
| Escitalopram tablett 20 mg | 20 → 15 mg | 20 → 15 → 10 → 5 mg |
| Fluoksetin tablett 40 mg | 40 → 30 mg (delte) | 40 → 30 → 20 → 10 mg (delte) |
| Vortioksetin 20 mg | 20 → 15 mg | 20 → 15 → 10 → 5 mg |
| Fluvoksamin 100 mg | 100 → 75 mg (delte) | 100 → 75 → 50 mg (delte) |
| Amitriptylin 50 mg | 4 reduksjoner til 20 mg | 5 reduksjoner til 10 mg |

Ved lang behandlingstid endres ingenting: sertralin, escitalopram (tabletter), fluoksetin, fluvoksamin og vortioksetin stopper før første reduksjon, fordi 10 % ikke kan gis.

**Hindringer:**

- Forslaget endrer en fagbeslutning (beslutning 1 og gjennomgangen av 9cb420b) og må vurderes som et eget prinsipp.
- Kildegrunnlaget er RCPsych, som er under vurdering i tråd F (`rcpsych-stopping`).
- **En ny regelversjon fjerner den gjeldende godkjenningen.** Endres `seponering-vortioksetin` v11, faller godkjenningen bort med en gang, fordi den er bundet til fingeravtrykket. Ny versjon og ny godkjenning må derfor komme i samme PR. Vortioksetin bør endres sist, eller holdes utenfor til de andre er godkjent.
- Store trinn gir høyere risiko for seponeringssymptomer. Det dempes av at hvert trinn krever ny vurdering, at trinnet forlenges ved symptomer, og at lang behandlingstid og tidligere seponeringsplager ikke berøres.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 2.1 | Kan en dose som kan gis med reduksjon over 25 % og høyst 50 % tilbys uten begrunnelse ved kort behandlingstid i middels- og lavrisikogruppen? | Ja, som valg når 25 % ikke kan gis, med faktisk prosent vist. Forslaget forblir 25 %. |
| 2.2 | Skal øvre grense være 50 % eller 33⅓ %? | 50 %, som RCPsych og NICE bruker som eksempel. 33⅓ % gir bare ett ekstra trinn for sertralin, escitalopram, fluoksetin og vortioksetin (for fluvoksamin like mye som 50 %) og har ikke eget kildegrunnlag. |
| 2.3 | Skal grensen gjelde i lavrisikogruppen (vortioksetin)? | Ja, men vortioksetin endres sist, slik at den godkjente versjonen ikke faller bort før den nye er godkjent. |
| 2.4 | Skal grensen på 25 % fra laveste døgndose fortsatt gjelde? | Ja, uendret (beslutning 5.4). |
| 2.5 | Skal fluoksetin, som ikke har 25 %-grensen ved lav dose, få samme endring? | Ja, på samme vilkår. Omfanget, i dag 40 og 60 mg med 20 mg-tabletter, avgjøres på nytt av kontrolløren, også om delte tabletter er med (modellberegningen deler dem). |

**Utkast til spesifikasjon:** I `nedtrapping.ts` endres bare begrunnelseskravet uten vilkår i gruppene MIDDELS og LAV, fra «over 25 %» til «over 50 %». Kravet ved lang behandlingstid (over 10 %) endres ikke. Gruppen FLUOKSETIN får samme endring bare hvis kontrolløren godtar det (spørsmål 2.5). Hver berørt regel får ny versjon og nytt fingeravtrykk. Omfanget per regel utvides ikke av seg selv. Kontrolløren velger på nytt hvilke startdoser og former som er med, med dagens omfang som utgangspunkt. `medTrinngrense` i `src/verktoy/regeldekning.ts` viser nøyaktig denne endringen på en kopi av reglene.

**Syntetiske testkasus** (forventet etter beslutningen; fra modellberegningen):

| ID | Inndata | Forventet |
| --- | --- | --- |
| K2-01 | Sertralin 100 mg, kort | 75 mg; neste trinn tilbyr 50 mg (−33,33 %); så 25 mg (−50 %); stopper ved 25 mg. |
| K2-02 | Sertralin 50 mg, kort | 37,5 mg kan ikke gis; tilbyr 25 mg (−50 %). |
| K2-03 | Sertralin 25 mg, kort | Uendret: stopper. 18,75 mg kan ikke gis, og fra laveste døgndose gjelder fortsatt høyst 25 %. |
| K2-04 | Sertralin 100 mg, lang | Uendret: stopper før første reduksjon (90 mg kan ikke gis, 75 mg er −25 % og over 10 %). |
| K2-05 | Escitalopram tablett 20 mg, kort | 15 → 10 → 5 mg, med valg ved 10 og 5 mg. |
| K2-06 | Vortioksetin 20 mg, kort | 15 → 10 → 5 mg. Bare etter at versjonen med ny grense er godkjent; før det gjelder v11 (bare 20 → 15 mg). |
| K2-07 | Fluoksetin tablett 40 mg, kort | 30 → 20 → 10 mg, med delte tabletter. |
| K2-08 | Fluvoksamin 100 mg, kort | 75 → 50 mg; stopper ved 50 mg. |
| K2-09 | Sertralin 100 mg, tidligere seponeringsplager | Uendret: langsom variant, 1–5 %. |
| K2-10 | Forskriveren velger 60 % | Ikke mulig: over 50 % tilbys ikke. |

### Forslag 3 – Peroral risperidon → Xeplion, og generisk paliperidonpalmitat

**Hva:** En ny regel, `depot-risperidon-xeplion`, for overgang fra peroral risperidon til månedlig paliperidonpalmitat. Den bruker samme oppstart som den godkjente regelen `depot-paliperidon-xeplion` v3. I tillegg tas de generiske preparatene med paliperidonpalmitat inn i preparatlisten, i en ny versjon av den godkjente regelen eller i en ny regel, etter kontrollørens valg.

**Hvorfor dette først blant antipsykotika:** I FEST finnes peroral paliperidon (Invega depottabletter 3 og 6 mg) bare med godkjenningsfritak. Den godkjente regelen starter derfor fra et preparat som sjelden brukes i Norge. Risperidon er markedsført i mange styrker, og preparatomtalen for Xeplion behandler overgang fra peroral paliperidon og fra peroral risperidon likt.

**Kildegrunnlag** (Xeplion, EMA-produktinformasjon, registrert som `ema-xeplion`; samme SHA-256 hentet på nytt 02.11.2026):

- Pkt. 4.1: vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.
- Pkt. 4.2:
  - Oppstart 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus.
  - Tredje dose én måned etter andre.
  - Anbefalt vedlikehold 75 mg månedlig (±7 dager), med et område på 25–150 mg.
  - Peroral risperidon kan seponeres ved oppstart; noen kan ha nytte av gradvis seponering.
- Pkt. 4.2, nedsatt nyrefunksjon: ved CrCl 50–79 ml/min gjelder et eget regime (100 og 75 mg, vedlikehold 50 mg). Under 50 ml/min anbefales ikke Xeplion.
- Preparatomtalen gir en tabell fra paliperidon depottabletter til Xeplion, men **ingen tabell fra risperidondose til Xeplion-dose**.

**Norske preparater (FEST):**

- Risperidon tabletter 0,5–4 mg (Risperdal, Risperidon Sandoz, Risperidone Grindeks) og Risperdal mikstur 1 mg/ml.
- Paliperidonpalmitat: Xeplion 50, 75, 100 og 150 mg (markedsført; 25 mg bare på godkjenningsfritak), Paliperidon Zentiva og Palmeux 50, 75, 100 og 150 mg.

**Forventet nytte:** Kombinasjonen «Risperidon (peroral) → Paliperidon (depotinjeksjon)» går fra «ingen regel» til en plan. Det er trolig den vanligste veien til månedlig paliperidondepot.

**Hindringer:**

- Måldosen kan ikke utledes av risperidondosen fra preparatomtalen. OUSFAR må ikke finne på en ekvivalens.
- Generikaenes preparatomtaler må kontrolleres mot pkt. 4.2 i Xeplion før de tas inn.
- Valget av måldose må kunne gjøres i verktøyet. Feltet finnes alt i den godkjente regelen, så tråd C trenger ingen ny flate.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 3.1 | Hvordan settes vedlikeholdsdosen når pasienten kommer fra risperidon? | Forskriveren velger 25–150 mg, med 75 mg som standard (pkt. 4.2). Verktøyet foreslår ingen ekvivalens med risperidondosen. |
| 3.2 | Skal regelen kreve at risperidondosen oppgis? | Ja, som dokumentasjon av stabilisering, men dosen brukes ikke i beregningen. |
| 3.3 | Gjelder regelen både tabletter og mikstur? | Ja. Risperidon seponeres ved oppstart, og ingen risperidondose beregnes. |
| 3.4 | Nedsatt nyrefunksjon? | Som i den godkjente regelen: CrCl under 80 ml/min stopper. Et regime for mild nedsatt funksjon kan vurderes som egen variant senere. |
| 3.5 | Generika: ny versjon av den godkjente regelen, eller egen regel? | Egen regel. En ny versjon av `depot-paliperidon-xeplion` fjerner den gjeldende godkjenningen til den nye er godkjent. |

**Utkast til spesifikasjon:**

- `depot-risperidon-xeplion`, klasse depot.
- Fra: risperidon (peroral). Til: paliperidon (depotinjeksjon), preparater Xeplion (og generika etter 3.5).
- Inndata:
  - risperidondose (positiv, dokumentasjon);
  - måldose 25–150 mg, standard 75;
  - startdato.
- Bekreftelser: voksen med schizofreni; stabilisert på og har tålt risperidon; CrCl minst 80 ml/min.
- Plan:
  - dag 1: 150 mg i deltoideus;
  - dag 8 (vindu dag 4–12): 100 mg i deltoideus;
  - deretter måldosen månedlig fra én måned etter dag 8 (±7 dager), i deltoideus eller setemuskel;
  - risperidon seponeres ved oppstart.
- Stopper ved:
  - under 18 år;
  - CrCl under 80 ml/min eller ubesvart;
  - ubekreftet stabilisering eller toleranse;
  - måldose utenfor 25–150 mg eller ikke en styrke i FEST (i tillegg til de markedsførte styrkene er bare 25 mg mulig, og den finnes bare på godkjenningsfritak);
  - en startdato som ikke finnes.
- Klinisk omfang: tabletter og mikstur; måldose 50, 75, 100 og 150 mg (markedsført); CrCl minst 80.

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K3-01 | Risperidon 4 mg, måldose 75, start 01.12.2026 | 150 mg 01.12 og 100 mg 08.12 i deltoideus, deretter 75 mg fra 08.01.2027 og månedlig. |
| K3-02 | Risperidon 2 mg, måldose 50 | Som K3-01 med 50 mg vedlikehold. |
| K3-03 | Risperidon mikstur 3 mg, måldose 100 | Plan som K3-01 med 100 mg. |
| K3-04 | Måldose 175 mg | Stopper: over 150 mg. |
| K3-05 | Måldose 25 mg | Stopper: utenfor omfanget, 25 mg finnes bare på godkjenningsfritak. |
| K3-06 | CrCl 60 ml/min | Stopper (mild nedsatt nyrefunksjon er en egen variant). |
| K3-07 | CrCl ubesvart | Stopper. |
| K3-08 | Stabilisering ikke bekreftet | Stopper. |
| K3-09 | 17 år | Stopper. |
| K3-10 | Startdato 31.02.2027 | Stopper: datoen finnes ikke. |
| K3-11 | Måldose ikke oppgitt | Skjemaet mangler noe. |

### Forslag 4 – Abilify Maintena: to-injeksjonsstart og 960 mg fra peroral aripiprazol

**Hva:** Nye regler ved siden av den godkjente `depot-aripiprazol-maintena` v3 (én injeksjon 400 mg og 14 dager peroralt), som står uendret:

- 4a: **to-injeksjonsstart med 400 mg**;
- 4b: **960 mg med én injeksjon**;
- 4c: **960 mg med to injeksjoner**.

**Kildegrunnlag** (Abilify Maintena, EMA-produktinformasjon, `ema-abilify-maintena`; samme SHA-256 hentet på nytt 02.11.2026):

- **400 mg, pkt. 4.2:**
  - To-injeksjonsstart: to injeksjoner à 400 mg på to ulike steder samme dag, sammen med én peroral dose aripiprazol 20 mg.
  - Deretter 400 mg månedlig, tidligst 26 dager etter forrige.
  - Kjent langsom CYP2D6-omsetning: to-injeksjonsstart skal ikke brukes.
- **960 mg, pkt. 4.2:**
  - Én injeksjon: 960 mg dag 1, sammen med peroral aripiprazol 10–20 mg daglig i 14 dager.
  - To injeksjoner: 960 mg og 400 mg på to ulike steder dag 1, sammen med én peroral dose 20 mg.
  - Deretter 960 mg hver 2. måned (56 dager, ±2 uker), og 720 mg ved bivirkninger.
  - Fra 65 år er effekt og sikkerhet ikke fastslått.

**Norske preparater (FEST):** Abilify Maintena 400 mg (pulver og væske), 720 mg og 960 mg (depotinjeksjonsvæske). **300 mg finnes ikke i FEST**, så regimene for langsom CYP2D6-omsetning og hemmere kan ikke planlegges.

**Forventet nytte:** Forskriveren får de andre oppstartene preparatomtalen beskriver for samme kombinasjon. To-injeksjonsstarten slipper 14 dager med peroral overlapp.

**Hindringer:**

- Verktøyet må kunne vise flere regler for samme kombinasjon som alternativer (tråd C). Regelmodellen tillater det alt (`reglerFor` gir en liste).
- 960 mg er det samme valget i verktøyet som 400 mg (aripiprazol depotinjeksjon). Uten preparatvalg (P10) må forskriveren velge regime i regelen.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 4.1 | Samme vilkår som v3 (stabilisert, tålt aripiprazol, ingen sterke CYP2D6- eller CYP3A4-hemmere, ingen CYP3A4-induktorer, ikke kjent langsom CYP2D6-omsetning)? | Ja, for alle tre. |
| 4.2 | 960 mg fra 65 år? | Stopper (ikke fastslått i preparatomtalen). |
| 4.3 | Peroral dose i 14 dager ved 960 mg med én injeksjon? | Forskriverens nåværende dose, avgrenset til 10–20 mg; utenfor stopper. |

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K4-01 | 4a, aripiprazol 15 mg, start 01.12.2026 | 2 × 400 mg på ulike steder og 20 mg peroralt 01.12; 400 mg tidligst 27.12, deretter månedlig. |
| K4-02 | 4a, kjent langsom CYP2D6-omsetning | Stopper. |
| K4-03 | 4b, aripiprazol 15 mg | 960 mg 01.12; peroral 15 mg daglig 01.12–14.12; neste 960 mg 26.01.2027 (vindu 12.01–09.02). |
| K4-04 | 4b, aripiprazol 25 mg | Stopper: peroral dose utenfor 10–20 mg. |
| K4-05 | 4c | 960 mg og 400 mg på ulike steder og 20 mg peroralt dag 1; neste 960 mg etter 56 dager. |
| K4-06 | 4b eller 4c, 66 år | Stopper. |
| K4-07 | Sterk CYP3A4-hemmer | Stopper. |
| K4-08 | v3 uendret | Fingeravtrykket `04d1debe…7f20` og godkjenningen står. |

### Forslag 5 – Escitalopram og citalopram → mirtazapin

**Hva:** To nye regler etter mønsteret i den godkjente `kryssnedtrapping-sertralin-mirtazapin` v9: et avgrenset startforløp der SSRI-en halveres, med minst 14 dager per trinn, mens mirtazapin 15 mg startes dag 1. Avslutningen av SSRI-en og opptrappingen av mirtazapin planlegges individuelt.

- Escitalopram: 20 → 10 mg (minst 14 dager) → 5 mg, eller 10 → 5 mg.
- Citalopram: 40 → 20 mg (minst 14 dager) → 10 mg, eller 20 → 10 mg.

**Kildegrunnlag:**

- Preparatomtalene for Cipralex, Cipramil og Remeron, pkt. 4.2, 4.3 og 4.5. De gir doseområder, QT-kontraindikasjonen, maksdose hos eldre og serotonerge interaksjoner.
- NICE NG222 1.4.16 (raskere nedtrapping kan passe ved bytte) og 1.9.9 (overvåking ved bytte).
- RCPsych (tempo).
- `keks-2016` tabell 2 (kryssnedtrapping som strategi).
- Psychiatrienet bare som metadata: tabellen har en anbefaling for begge kombinasjonene, men den er ikke brukt.

**Norske preparater (FEST):**

- Escitalopram tabletter 5, 10 og 20 mg.
- Citalopram tabletter 10, 20 og 40 mg (Cipramil 10 og 20 mg, Citalopram Orion 10, 20 og 40 mg).
- Mirtazapin tabletter 15, 30 og 45 mg (Mirtazapin Orion; Remeron 30 mg). Smeltetabletter holdes utenfor, som i sertralinregelen.

**Forventet nytte:** De to mest brukte SSRI-ene får samme startforløp til mirtazapin som sertralin har. Alle trinn kan gis nøyaktig med hele tabletter.

**Hindringer:**

- `keks-2016` og `rcpsych-stopping` har kildefunn under vurdering i tråd F. De berører også den godkjente sertralinregelen.
- Hver kombinasjon må vurderes selvstendig, ikke som en overføring av kildetabellen (rettighetsnotatet).
- Citalopram har QT-risiko og høyeste dose 20 mg over 65 år og ved nedsatt leverfunksjon. Escitalopram har 10 mg over 65 år. Begge stopper.
- NICE CKS om bytte av antidepressiver kunne ikke hentes (HTTP 403) og er ikke brukt. Kontrolløren må verifisere eventuelle henvisninger dit selv.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 5.1 | Er halvering per trinn (50 %) akseptabel i en kryssnedtrapping med escitalopram og citalopram, slik den er for sertralin? | Ja, ved kort behandlingstid, med samme vilkår som sertralinregelen. |
| 5.2 | Startdoser i omfanget? | Escitalopram nøyaktig 10 eller 20 mg, citalopram nøyaktig 20 eller 40 mg. Alt annet stopper. |
| 5.3 | Pasienter over 65 år? | Stopper for citalopram 40 mg og escitalopram 20 mg (over maksdosen). For lavere doser stopper regelen også, for å følge sertralinregelen og fordi alder ikke er vurdert. |

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K5-01 | Escitalopram 20 mg, kort, bekreftelser gitt | Escitalopram 10 mg dag 1–14, så 5 mg; mirtazapin 15 mg fra dag 1; ingen 5 → 0 mg. |
| K5-02 | Escitalopram 10 mg | Escitalopram 5 mg; mirtazapin 15 mg. |
| K5-03 | Escitalopram 15 mg | Stopper: startdose utenfor omfanget. |
| K5-04 | Citalopram 40 mg | Citalopram 20 mg dag 1–14, så 10 mg; mirtazapin 15 mg. |
| K5-05 | Citalopram 30 mg | Stopper. |
| K5-06 | Kjent QT-forlengelse | Stopper (kontraindikasjon). |
| K5-07 | Lang behandlingstid | Stopper, også med begrunnelse. |
| K5-08 | Tidligere seponeringsplager | Stopper. |
| K5-09 | Serotonerg sammedisinering ikke kontrollert | Stopper. |
| K5-10 | Mirtazapin smeltetablett | Stopper. |

### Forslag 6 – Risperdal Consta → Xeplion

**Hva:** En ny regel for overgang fra risperidon langtidsvirkende injeksjon hver 2. uke til Xeplion.

**Kildegrunnlag** (Xeplion pkt. 4.2):

- Xeplion gis i stedet for neste planlagte Consta-injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og 8.
- Dosetabell: Consta 25 mg → Xeplion 50 mg; 37,5 mg → 75 mg; 50 mg → 100 mg.

**Norske preparater (FEST 08.10.2026):** Risperdal Consta 25, 37,5 og 50 mg (markedsført) og Xeplion som i forslag 3. Consta er ikke med i FEST-uttrekket for pilotsettet og må legges til.

**Hindringer:** I verktøyet er Consta og Okedi samme valg («Risperidon (depotinjeksjon)»). Regelen må derfor be forskriveren bekrefte at pasienten bruker Consta hver 2. uke, til preparatvalget i P10 finnes.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 6.1 | Er en bekreftelse av preparatet godt nok, eller må regelen vente på P10? | En bekreftelse er godt nok for en første versjon. Okedi stopper. |

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K6-01 | Consta 37,5 mg, siste injeksjon 01.12.2026 | Xeplion 75 mg 15.12.2026, deretter månedlig; ingen dag 1/dag 8-doser. |
| K6-02 | Consta 25 mg | Xeplion 50 mg. |
| K6-03 | Consta 50 mg | Xeplion 100 mg. |
| K6-04 | Consta 62,5 mg | Stopper: ingen tabellverdi. |
| K6-05 | Okedi i stedet for Consta | Stopper. |
| K6-06 | CrCl under 80 ml/min | Stopper (som i forslag 3). |

### Forslag 7 – Peroral risperidon eller Consta → Okedi

**Kildegrunnlag** (Okedi, EMA-produktinformasjon pkt. 4.2, hentet 02.11.2026, SHA-256 `ac8b37b5f8372560baaff47a527f53c8609dd1479d84555b9228335503334046`, ikke registrert ennå):

- Okedi gis hver 28. dag, eventuelt inntil 3 dager før.
- Fra peroral risperidon: 3 mg daglig → 75 mg; 4 mg daglig eller mer → 100 mg. Okedi startes om lag 24 timer etter siste perorale dose, uten startdose og uten peroralt tillegg.
- Fra Consta: Okedi gis i stedet for neste injeksjon (2 uker etter siste). 37,5 mg → 75 mg; 50 mg → 100 mg. Det finnes ingen tabellverdi for 25 mg.
- Pasienter på andre perorale antipsykotika titreres først med peroral risperidon i minst 6 dager. Pasienter som ikke har brukt risperidon, titreres i minst 14 dager.
- Okedi anbefales ikke ved CrCl under 60 ml/min. Over 65 år skal den brukes med forsiktighet. Ved nedsatt leverfunksjon kreves egen titrering.

**Norske preparater:** Okedi 75 og 100 mg (markedsført i FEST 08.10.2026; ikke i pilotuttrekket).

**Hindringer:** Okedi er samme valg som Consta (som i forslag 6). Kilden må registreres i kilderegisteret.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 7.1 | Risperidon under 3 mg daglig? | Stopper: preparatomtalen har ingen tabellverdi. |
| 7.2 | Over 65 år og nedsatt leverfunksjon? | Stopper i første versjon. |
| 7.3 | Pasienter som ikke bruker risperidon nå? | Stopper. Titreringen planlegges individuelt. |

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K7-01 | Risperidon 3 mg, siste dose 01.12.2026 kl. 20 | Okedi 75 mg om lag 24 timer senere (02.12), deretter hver 28. dag (30.12, 27.01 …). |
| K7-02 | Risperidon 6 mg | Okedi 100 mg. |
| K7-03 | Risperidon 2 mg | Stopper. |
| K7-04 | Consta 50 mg, siste injeksjon 01.12 | Okedi 100 mg 15.12, deretter hver 28. dag. |
| K7-05 | Consta 25 mg | Stopper. |
| K7-06 | CrCl 55 ml/min | Stopper. |
| K7-07 | 70 år | Stopper. |

### Forslag 8 – Peroral olanzapin → Zypadhera

**Kildegrunnlag** (Zypadhera, EMA-produktinformasjon, hentet 02.11.2026, SHA-256 `5eee4543487d58354518319e0b1b7414c5442797ce74794c52c9bfc9f51dcbf7`, ikke registrert ennå):

- Pkt. 4.2, tabell 1, startdose og vedlikehold etter 2 måneder:

  | Peroral olanzapin | Startdose | Vedlikehold etter 2 måneder |
  | --- | --- | --- |
  | 10 mg daglig | 210 mg hver 2. uke eller 405 mg hver 4. uke | 150 mg hver 2. uke eller 300 mg hver 4. uke |
  | 15 mg daglig | 300 mg hver 2. uke | 210 mg hver 2. uke eller 405 mg hver 4. uke |
  | 20 mg daglig | 300 mg hver 2. uke | 300 mg hver 2. uke |

- Etter hver injeksjon skal pasienten observeres i minst 3 timer i helseinstitusjon.
- Zypadhera skal ikke startes over 75 år. Ved nedsatt nyre- eller leverfunksjon bør startdosen være 150 mg hver 4. uke.

**Norske preparater:** Zypadhera 210, 300 og 405 mg (markedsført, og også på godkjenningsfritak). **150 mg finnes ikke i FEST.**

**Hindringer:**

- Observasjonen må bekreftes ved hver injeksjon. Det er en tydelig sikkerhetsbetingelse.
- Vedlikehold 150 mg hver 2. uke kan ikke gis med norske preparater.
- Nedsatt nyre- eller leverfunksjon kan ikke planlegges.

**Spørsmål til kontrolløren:**

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| 8.1 | Skal regelen planlegge vedlikeholdet etter 2 måneder? | Nei. Bare startdosen og intervallet, med revurdering etter 2 måneder. |
| 8.2 | Over 65 år? | Stopper i første versjon. |

**Syntetiske testkasus:**

| ID | Inndata | Forventet |
| --- | --- | --- |
| K8-01 | Olanzapin 10 mg, valg hver 4. uke | 405 mg hver 4. uke; 3 timers observasjon bekreftet ved hver injeksjon; revurdering etter 2 måneder. |
| K8-02 | Olanzapin 10 mg, valg hver 2. uke | 210 mg hver 2. uke. |
| K8-03 | Olanzapin 15 mg | 300 mg hver 2. uke. |
| K8-04 | Olanzapin 20 mg | 300 mg hver 2. uke. |
| K8-05 | Olanzapin 12,5 mg | Stopper: ingen tabellverdi. |
| K8-06 | 76 år | Stopper. |
| K8-07 | Nedsatt nyrefunksjon | Stopper. |
| K8-08 | Observasjon ikke bekreftet | Stopper. |

### Forslag 9 – Depot til depot innenfor samme valg (venter på P10)

**Kildegrunnlag:** Trevicta og Abilify Maintena, pkt. 4.2.

- **Xeplion → Trevicta:**
  - Bare når pasienten er tilstrekkelig behandlet med månedlig paliperidonpalmitat (helst i minst 4 måneder) og ikke trenger dosejustering.
  - Trevicta gis i stedet for neste månedlige dose (±7 dager), i 3,5 ganger dosen: 50 → 175, 75 → 263, 100 → 350, 150 → 525 mg. 25 mg har ingen tilsvarende dose.
  - Deretter hver 3. måned (±2 uker). Ikke direkte fra andre antipsykotika.
- **Trevicta → månedlig paliperidonpalmitat:** når neste Trevicta-dose skulle vært gitt, uten oppstartsdoser: 175 → 50, 263 → 75, 350 → 100, 525 → 150 mg.
- **Abilify Maintena 400 → 960 mg:** 960 mg tidligst 26 dager etter siste 400 mg, deretter hver 56. dag.

**Norske preparater:** Trevicta 175, 263, 350 og 525 mg; Abilify Maintena 400, 720 og 960 mg (FEST).

**Hindringer:** Kombinasjonene er i dag «samme legemiddel og formulering» og regnes som ikke støttet. De krever preparatvalg i verktøyet og i regelmodellen (P10.2–P10.3). Det er brukerflate- og modellarbeid som tråd C eier. Reglene kan spesifiseres nå, men bør vente til preparatvalget finnes.

**Syntetiske testkasus** (til senere):

| ID | Inndata | Forventet |
| --- | --- | --- |
| K9-01 | Xeplion 100 mg i 5 måneder, neste dose 10.12.2026 | Trevicta 350 mg 10.12 (vindu 03.12–17.12), deretter hver 3. måned. |
| K9-02 | Xeplion 25 mg | Stopper: ingen tilsvarende dose. |
| K9-03 | Xeplion i 2 måneder | Stopper: ikke tilstrekkelig behandlet. |
| K9-04 | Trevicta 263 mg, neste dose ville vært 01.03.2027 | Xeplion 75 mg 01.03.2027, deretter månedlig. |
| K9-05 | Maintena 400 mg, siste 01.12.2026 | 960 mg tidligst 27.12.2026, deretter hver 56. dag. |

### Forslag 10 – Opptitrering av kvetiapin som egen regel

**Hva:** Oppfølgingspunkt 4 i `docs/verktøy-p7-nedtrapping.md` §11. Opptitreringen av kvetiapin med vanlig frisetting, som kontrolløren aksepterte som del av `antipsykotikabytte-olanzapin-kvetiapin` v5, skilles ut som egen regel. Den beregner bare kvetiapinstarten, mens nedtrappingen av det gamle legemidlet planlegges individuelt.

**Hindringer:**

- En slik regel passer i verktøyet bare som del av en kombinasjon. Hvert fra-stoff må derfor vurderes for seg, ikke som én generell regel for alle.
- Preparatomtalen for kvetiapin med vanlig frisetting er ikke hentet på nytt i denne runden.

Forslaget er tatt med for å vise neste steg mot P9, ikke for å lages nå.

## 6. Ikke prioritert nå

- **Nedtrapping som bare er fagtekst** (citalopram, duloksetin, venlafaksin, mirtazapin, moklobemid, paroksetin) og fluoksetin harde kapsler: krever en dokumentert form eller metode for mindre doser (`docs/verktøy-p7-nedtrapping.md` §11, punkt 3).
- **Zoloft konsentrat:** krever dokumentert dose per ml og oppmåling (P5).
- **MAO-hemmere og stoffer bare på godkjenningsfritak** (fenelzin, tranylcypromin, imipramin, trazodon, doksepin): ingen norsk preparatomtale. Dosulepin og maprotilin har ingen preparater i FEST.
- **Bytte mellom SSRI-er og andre antidepressivbytter (P8):** gjøres som selvstendige vurderinger per kombinasjon, først når forslag 5 er kontrollert, og etter rettighetsavklaringen hvis mange kombinasjoner skal dekkes.
- **Perorale antipsykotikabytter (P9):** etter forslag 10. Keks 2019 (`keks-2019`) sier at bytte av antipsykotika ofte bør skje med spesialist, og at kryssnedtrapping er vanlig. Unntaket er bytte fra aripiprazol eller brekspiprazol, der et direkte bytte kan være mulig.
- **Zuklopentiksol middels langtidsvirkende injeksjon:** ikke støttet etter vedtak.

## 7. Avhengigheter

| Avhenger av | Gjelder forslag | Hva som trengs |
| --- | --- | --- |
| Tråd F, `rcpsych-stopping` | 1, 2, 5 | Om endringen gjelder tempo, risikogrupper eller lang behandlingstid. Til det er avklart, registreres ingen godkjenning som bygger på RCPsych. |
| Tråd F, `keks-2016` | 5 | Om endringen gjelder tabellene om bytte. |
| Tråd C, brukerflaten | 4, 6, 7, 9 | Flere regler for samme kombinasjon som alternativer, og preparatvalg (P10.2–P10.3). |
| Kilderegisteret | 7, 8, 9 | Trevicta, Okedi og Zypadhera registreres med versjon, tidspunkt og SHA-256. |
| FEST-uttrekket for pilotsettet | 6, 7 | Risperidon, Risperdal Consta og Okedi legges til. |
| Rettighetsavklaringen | P8 og P9 i bredde | Bare nødvendig hvis mange kombinasjoner skal dekkes etter kildetabellen. |

## 8. Fra forslag til aktiv regel (VDK-3)

Hvert forslag kontrolløren godtar, lages i en egen PR:

1. Registrer nye kilder med versjon, tidspunkt og SHA-256 i `src/verktoy/regler/kilder.ts`, og oppdater FEST-uttrekket hvis nye preparater trengs.
2. Lag regelen eller den nye regelversjonen med klinisk omfang, bekreftelser og stopp, og med henvisning til kildepunktet for hver verdi.
3. Gjør testkasusene over til tester, med positive og negative tilfeller ved grenseverdiene.
4. Kjør regelkontrollen (`npm run verktoy:regler -- kontroll`), aksepttesten og VDK-1-rapporten på nytt, slik at endringen i dekningen kan ses.
5. Send nøyaktig regelversjon og fingeravtrykk til ChatGPT. Godkjenningen registreres i samme PR, og ingen PR slås sammen uten ChatGPTs godkjenning.

Endres en godkjent regel, faller godkjenningen bort. Godkjente regler får derfor heller en ny regel ved siden av seg enn en ny versjon, med mindre kontrolløren godkjenner den nye versjonen i samme PR.
