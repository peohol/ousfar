# OUSFAR Verktøy – P4: regelmodellen

**Status 28.10.2026:** til faglig kontroll (P4.8), tredje runde. De to første uavhengige kontrollene fant feil i modellen og beregningen; de er rettet (§11). De fire reglene som ble endret faglig, er versjon 2 og sendt til kontroll på nytt. Ingen regel er klinisk godkjent, og ingenting her brukes av appen.

Dette notatet beskriver hvordan OUSFAR skriver regler for nedtrapping og bytte av psykofarmaka, uavhengig av kilde, og hvorfor. Pilotsettet med alle regler, parametre, kilder og regneeksempler står i `docs/verktøy-p4-pilotsett.md`, som lages av koden (`npm run verktoy:regler -- rapport`) og derfor alltid stemmer med den. Koden ligger i `src/verktoy/regler/`.

## 1. Avgrensning

- En regel er **OUSFARs egen faglige vurdering**, formulert matematisk og bygget på kilder OUSFAR kan vise til: preparatomtaler (DMP, EMA), retningslinjer (NICE) og primær- og oversiktslitteratur. Fakta fra kildene gjengis kort med egne ord, med sted i kilden.
- **Psychiatrienet er én referanse blant flere, ikke grunnlag.** En regel kan vise til P3-kildeoppføringen den kan sammenlignes med (id-en, f.eks. `SwitchAntidepressants:Es>Stop`), men modellen har ikke felt for innholdet, og ingen regel gjengir anbefalingen, verken ordrett, oversatt eller omskrevet (`docs/verktøy-p3-rettigheter.md`). Kontrollene stopper en regel som har Psychiatrienet som grunnlag eller med innhold.
- **Tabellsettet overføres ikke systematisk** så lenge spørsmålet om databasevern er uavklart. Pilotsettet er åtte regler valgt for å prøve modellen på hver regelklasse, ikke et utdrag av tabellene.
- **En modellberegning er ikke en klinisk anbefaling.** Den viser dosekurven en regel gir for syntetiske inndata. Den er ikke empirisk validert som plan, og den blir ikke klinisk godkjent fordi koden er riktig.

## 2. Seks ting som holdes fra hverandre

| Del | I koden | Inneholder | Inneholder aldri |
| --- | --- | --- | --- |
| Kildeoppføring og kilde | `Kilde`, `Kildehenvisning` (`modell.ts`, `kilder.ts`) | Hvilket dokument, hvilken versjon, når det ble hentet, kontrollsum; for hver henvisning sted og et kort faktum med egne ord | Kildetekst; innhold fra Psychiatrienet (bare id-en til P3-oppføringen) |
| Faglig fortolkning | `Fortolkning` | Det som følger direkte av kildene (*kildetro*, hvert utsagn med kilde), OUSFARs *tilpasninger*, kliniske *forutsetninger* og *usikkerhet* | Valg som ikke er merket som OUSFARs |
| Matematisk regel | `Plan`, `Forlop`, `Fase`, `Nedtrappingsstrategi`, `Parameter` | Doseforløp, faser, strategier og tidsrelasjoner; hver verdi med art (bindende eller veiledende) og grunnlag (kilde eller OUSFAR-forslag) | Doser som ikke har et grunnlag |
| Betingelser | `Inndatakrav`, `Bekreftelse`, `Unntak`, `Gruppemedlem` | Hvilke doser regelen gjelder for, hva forskriveren må bekrefte, pasientforhold der regelen ikke gjelder, hvilke gruppemedlemmer som er vurdert | Standardverdier (ingen skjult måldose, P6.8) |
| Godkjenning | `Godkjenning` (`godkjenning.ts`) | Status (utkast, til faglig kontroll, klinisk godkjent, avvist, trukket) med historikk, rolle, dato, regelversjon og fingeravtrykk | Godkjenning uten et steg fra en uavhengig kontrollør, eller for en annen versjon eller et annet innhold |
| Beregningsresultat | `Beregningsresultat` (`beregning.ts`) | Status (*modellberegning* eller *stoppet* med grunner), forløpene, kontrollene av bindende krav, merknader, regel-, regelsett-, modell- og motorversjon, `klinisk_godkjent` | En plan når noe mangler; `klinisk_godkjent` for en regel som ikke er godkjent |

Et regelsett (`Regelsett`) har id, versjon og regelmodellversjon, og kan inneholde regler fra hvilken som helst kilde (P4.1, P12.3). En regel har sin egen versjon; en godkjenning gjelder én versjon.

## 3. Den matematiske regelen

**Dag 1** er planens første dag. Med startdato får hver dag en kalenderdato; uten startdato regnes det i dager.

**Forløp.** En plan har ett forløp per legemiddel og administrasjonsform. Et forløp starter på en fast dag, eller *etter utvasking*: når et tidligere forløp er avsluttet, etter minst *n* hele dager uten legemiddel (første mulige dag = siste dosedag + *n* + 1). Et forløp kan holde en dose *til et annet forløp er avsluttet* (overlapp i kryssnedtrapping). Et forløp som er pasientens nåværende legemiddel, har utgangsdose = startdosen.

**Faser:**

- *hold* – en dose i et antall dager eller til et annet forløp er avsluttet;
- *nedtrapping* – fra aktuell dose til null, med en strategi og en trinnlengde; første trinn er allerede redusert. Et minimum for varigheten kan være et bindende krav: blir nedtrappingen kortere, **stopper beregningen** i stedet for å forlenge den;
- *opptrapping* – faste doser i faste dager (f.eks. kvetiapin dag 1–4);
- *vedlikehold* – dosen planen ender med;
- *seponer* – legemidlet stoppes når fasen starter;
- *injeksjoner* – startinjeksjoner på bestemte dager (med tidsvindu og injeksjonssted) og månedlig vedlikehold (med tidsvindu, tidligste intervall og dose fra en omregningstabell). Depot har sin egen tidsmodell, ikke daglige doser (P5.7). Gir tabellen et **spenn** (Xeplion 25–50 mg ved 3 mg peroralt), er dosen i spennet et klinisk valg: forskriveren må oppgi den som måldose, ellers stopper beregningen. En oppgitt måldose ved en entydig rad må være lik tabellens;
- *uten beregning* – forløpet kan starte, men doseringen beregnes ikke (f.eks. fenelzin, som mangler norsk preparatomtale).

**Strategier for nedtrapping** (B1: «prosent» er alltid enten av startdosen eller av aktuell dose, aldri uspesifisert):

| Strategi | Neste dose | Kurve |
| --- | --- | --- |
| Prosent av aktuell dose (gjentatt prosentvis) | *D*ₖ₊₁ = *D*ₖ · (1 − *p*), med en mindre *p* når *D*ₖ er lik eller under en grense; under sluttdosen seponeres | Avtagende trinn, eksponentiell |
| Prosent av startdosen (lineær) | *D*ₖ₊₁ = *D*ₖ − *D*₀ · *p* | Like trinn |
| Absolutt (lineær) | *D*ₖ₊₁ = *D*ₖ − *m* mg | Like trinn |
| Hyperbolsk | Beregnet binding *f* = *D* / (ED50 + *D*) senkes i *n* like trinn fra *f*₀ til 0: *f*ₖ = *f*₀ · (1 − *k*/*n*), *D*ₖ = ED50 · *f*ₖ / (1 − *f*ₖ) | Stadig mindre trinn mot null |

*D*₀ for «prosent av startdosen» er dosen når nedtrappingsfasen starter. I den hyperbolske strategien går maksimal binding (Emax) ut av regnestykket, så bare ED50 trengs.

**Avrunding.** Beregningen bruker uavrundede doser; de vises med to desimaler. Det er den ideelle dosekurven. Hvilke doser som faktisk kan gis (styrker, delbarhet, flytende form) og valget mellom oppnåelige doser gjør doseplanmotoren i P5 (B3, B5; `docs/verktøy-p5-beregningsmotor.md`). Regelmodell 3 har tre valgfrie felt per forløp for det: tillatt avvik og dosegrenser (`dosevalg`), formuleringsklasser (`klasser`) og varenavn (`preparater`).

**Gyldige verdier.** Doser og varigheter er endelige tall over 0, prosenter over 0 og høyst 100, og dager, måneder og trinn hele tall (`parameterfeil`). En startdato må være en gyldig kalenderdato som `ÅÅÅÅ-MM-DD`; `2027-02-31` normaliseres ikke. Ugyldige verdier i regelen eller inndata gir en stopp med grunnen, og beregningen kaster aldri: også en feil i regelen selv blir en kontrollert stopp.

**Måneder.** Månedlige injeksjoner regnes fra forrige injeksjon. Med startdato er én måned senere samme dato, eller siste dag i måneden når den er kortere (31. januar → 28. februar); tidsvinduet i preparatomtalen gjelder rundt den datoen.

## 4. Bindende krav, preferanser og beregnbarhet

**Art (P4.3).** Hver parameter og hvert inndatakrav er enten et *bindende krav* (utvasking, minste varighet, doseområde regelen gjelder for, tidligste injeksjonsintervall) eller en *veiledende preferanse* (prosent, trinnlengde, overlapp). Et bindende krav som ikke er oppfylt, stopper beregningen; en veiledende grense gir en merknad.

**Grunnlag.** Hver verdi har et grunnlag: enten *kilde* (verdien står i kilden, med henvisning) eller *OUSFAR-vurdering* (med begrunnelse, og henvisning når det er et valg innenfor det kilden tillater, f.eks. 14 dager av NICEs «én til to uker»). En verdi kan også mangle (`null`); da kan regelen ikke beregnes før den er avklart.

**Opprinnelse og avklaring er to ting.** En OUSFAR-vurdering er alltid OUSFARs, også etter at den er godtatt. Statusen står i `avklaring`: `null` er et *åpent forslag*; ellers dato, navn, rolle (uavhengig kontrollør eller faglig beslutningstaker), regelversjon og merknad for den eksplisitte avklaringen. En avklaring må komme fra en som aldri har vært utvikler av regelen (kontrollert). Åpne forslag, manglende verdier og gruppemedlemmer som bare er foreslått, er regelens *åpne valg* (`apneValg`); en regel kan bli klinisk godkjent først når listen er tom, og avklaringene inngår i fingeravtrykket som godkjenningen gjelder.

**Enheter.** Hvert parameterfelt har en fast enhet (`FELTENHET`): trinnlengde, utvasking, minste varighet og vinduer i dager, startdager i dag, intervaller i måneder, antall trinn i trinn, prosenter i prosent og doser i mg. En parameter med en annen enhet enn feltet krever, er ugyldig, også når verdien er gyldig i sin egen enhet. Tall som ikke er parametre (et forløps startdag, rader i omregningstabeller, grenser i inndatakrav) kontrolleres for seg (`tallfeil`), og før en plan returneres, kontrolleres det at alle dager er hele tall fra 1 og alle doser positive.

**Beregnbarhet (P4.4):**

- *entydig beregnbar* – alle verdier står i kildene; ingen OUSFAR-vurderinger, manglende verdier eller foreslåtte medlemmer (kontrollert);
- *beregnbar etter avklaring* – planen bygger på OUSFAR-vurderinger (eller har manglende verdier eller foreslåtte medlemmer) som må avklares faglig før regelen kan godkjennes. Klassifiseringen beskriver kildegrunnlaget og endres ikke når valgene er avklart; det som endres, er at regelen ikke lenger har åpne valg;
- *bare tekstlig veiledning* og *mangler anbefaling* – ingen plan; beregningen stopper alltid.

Ved tvetydighet lages ingen automatisk regel: valget skrives ut som et åpent forslag, og regelen kan ikke bli klinisk godkjent før hvert forslag er eksplisitt avklart (kontrollert). Det gjør at også en regel som bygger på OUSFARs egne valg, kan godkjennes sannferdig: valget forblir merket som OUSFARs, med avklaringen ved siden av.

## 5. Godkjenning og beregningsresultat

En regel godkjennes per versjon og per innhold. Statusen er siste steg i historikken, og hvert steg sier hvilken regelversjon det gjelder. **Fingeravtrykket** er SHA-256 av regelen i kanonisk form (alt unntatt godkjenningen: plan, verdier, betingelser, fortolkning, referanser og eksempler) sammen med versjonen og kontrollsummen til kildene den viser til; rapporten viser det for hver regel. En klinisk godkjenning er bare gyldig når siste steg er *klinisk godkjent* fra en uavhengig kontrollør som aldri har vært utvikler av regelen, for regelens gjeldende versjon og nøyaktig dette fingeravtrykket, og regelen ikke har åpne valg (`godkjenningsfeil`). Endres noe faglig etter godkjenningen – selv bare en verdi, en forutsetning eller en kildes versjon – er regelen ikke lenger godkjent før den er kontrollert på nytt. En faglig endring gir ny versjon, og kontrollene slår ut når siste steg gjelder en eldre versjon; en ny kilderevisjon endrer aldri en godkjent regel av seg selv (B8, P12).

Beregningen (`beregn`) stopper og sier alle grunnene når regelen bare er tekstlig, avvist eller trukket; når et unntak gjelder **eller ikke er besvart**, eller et pasientforhold er ukjent for regelen; når en bekreftelse mangler; når start- eller måldosen mangler, er ugyldig eller er utenfor et bindende område; når et dosespenn ikke er avklart; når startdatoen ikke er en gyldig dato; når gruppemedlemmet ikke er vurdert eller ikke er med i gruppen; når en verdi mangler eller er ugyldig; eller når resultatet bryter et bindende krav. Den gjetter aldri og utvider aldri en regel lydløst (P5.8).

Et resultat har status *modellberegning* og et forbehold. `klinisk_godkjent` er bare sann når godkjenningen er gyldig for nøyaktig denne regelversjonen; er regelen merket godkjent uten at godkjenningen gjelder, får resultatet en merknad og behandles som ikke godkjent. Heller ikke en gyldig godkjenning gjør beregningen til en vurdering av den enkelte pasient. Resultatet bærer regel-, regelsett-, modell- og motorversjon; like inndata og like versjoner gir samme resultat (P5.9).

## 6. Strategiene vurdert (P4.6)

- **Gjentatt prosentvis** (prosent av aktuell dose) er det NICE beskriver: hvert trinn en andel av forrige dose, mindre trinn når dosen er lav, og tempo styrt av symptomene. Trinnene blir mindre i mg, men kurven går aldri helt til null; den trenger en sluttdose der legemidlet seponeres. Foreslått som **standard** for antidepressiva i piloten.
- **Lineær** (prosent av startdosen eller faste mg) gir like store trinn. Den passer når kilden beskriver et fast antall like trinn, og ved kryss-titrering av antipsykotika der overlappen skal ha en kjent lengde. For antidepressiva blir de siste trinnene relativt sett store (fra en fjerdedel av startdosen rett til null), mens NICE råder til mindre trinn ved lave doser.
- **Hyperbolsk** tar hensyn til at reseptorbindingen flater ut ved vanlige doser, så like trinn i binding blir stadig mindre trinn i dose. Det er farmakologisk begrunnet, men bygger på få og små PET-studier, og det er ikke vist i kontrollerte studier at slike planer gir færre seponeringssymptomer. Planen blir lang (14 uker for citalopram 20 mg med åtte trinn) og krever doser under laveste tablettstyrke. Foreslått som **alternativ strategi**, ikke standard (B2).

**Flere trinn er ikke automatisk bedre.** Hvert trinn gir en ny overgang, mer kompleksitet og lengre behandling. Grensene i piloten (sluttdose, antall trinn, minste varighet) er forslag som må vurderes faglig, og planen er et utgangspunkt som må justeres etter pasientens symptomer (NICE 1.4.16).

## 7. Kliniske forutsetninger og pasientforhold (B7)

Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen. Regelmodellen håndterer dette på tre måter:

- *unntak* – pasientforhold der regelen ikke gjelder, når kilden sier det (f.eks. kjent langsom CYP2D6-omsetter, sterke hemmere og induktorer for Abilify Maintena; kreatininclearance under 80 ml/min for Xeplion). **Hvert unntak må besvares** med ja eller nei. At et forhold ikke er nevnt, beviser ikke at det er vurdert: ubesvart (ukjent) stopper beregningen like mye som ja, og bare et eksplisitt nei slipper gjennom og vises som en oppfylt kontroll. «Nei» betyr at forholdet er vurdert og ikke foreligger etter det forskriveren vet (f.eks. ikke *kjent* langsom omsetter). Et pasientforhold regelen ikke kjenner, stopper også beregningen når det er ja;
- *bekreftelser* – det forskriveren må bekrefte, også indikasjon og formulering når de endrer doseringen (f.eks. schizofreni hos voksen stabilisert på peroral behandling for depotene, schizofreni for opptrappingen av kvetiapin, peroral og ikke depot for olanzapin og Rest AP, og at byttet til en MAO-hemmer skjer med spesialisthelsetjenesten). Det som ikke er bekreftet, regnes som ikke bekreftet;
- *forutsetninger* – skrevet ut i hver regel, så det er tydelig hva beregningen ikke vurderer.

## 8. Svar på spørsmålene fra P3

- **Tillatelse fra De Tijdstroom:** ikke avklart. Reglene er laget som selvstendige vurderinger per kombinasjon fra andre kilder; ingen systematisk overføring.
- **Ingen felt for kildetekst:** gjennomført; kontrollene og testene slår ut på innhold fra Psychiatrienet.
- **Fenelzin uten Stop-anbefaling:** ingen regel for nedtrapping av fenelzin i piloten. Fenelzin har heller ingen norsk preparatomtale, så også startdosen etter et bytte til fenelzin er uten beregning.
- **Rest AP:** regelen følger P1 (tabellens medlemmer, med flufenazin, promazin og ziprasidon; uten paliperidon). Bare zuklopentiksol er foreslått vurdert; de andre stopper. Hvilke medlemmer gruppen skal ha, er fortsatt et spørsmål til faglig kontroll.
- **Paliperidone_ER:** piloten gjelder bare Xeplion (månedlig). Tremånedersdepotene har egne regler og er ikke omfattet.
- **Kombinasjonssidene med motsatt retning, Haloperidol_LA → Zuclopenthixol_MA og Stop-sidene for vortioksetin og doksepin:** ikke en del av piloten; de vurderes når reglene for disse kombinasjonene lages.

## 9. Spørsmål til faglig kontroll (P4.8)

1. Er «minst én til to uker» i preparatomtalene riktig lest som et bindende minimum på 14 dager?
2. Er gjentatt prosentvis nedtrapping (50 %, så 25 % fra 5 mg, sluttdose 2,5 mg for escitalopram; 14 dager per trinn) et forsvarlig utgangspunkt?
3. Skal den hyperbolske strategien være et valg i P7, og er ED50 fra PET-studier og åtte trinn rimelige verdier?
4. Sertralin → mirtazapin: er mirtazapin 15 mg fra dag 1 med overlapp til sertralin er seponert forsvarlig, og bør trinnene være kortere ved bytte (NICE åpner for raskere nedtrapping)?
5. Fluoksetin → fenelzin: kildene er uenige om nedtrapping av fluoksetin før utvasking (preparatomtalen: gradvis over minst én til to uker; NICE: annenhver dag ved 20 mg; Keks mfl.: seponering uten nedtrapping ved 40 mg eller mindre). Regelen følger preparatomtalen. Er 35 dagers utvasking (minimum i preparatomtalen) nok, eller skal høye doser ha 42?
6. Olanzapin → kvetiapin: er det riktig å holde olanzapin til kvetiapin er på 300 mg (dag 4) og deretter trappe ned 25 % av startdosen per uke? Er det riktig å begrense regelen til måldoser 300–450 mg?
7. Rest AP → aripiprazol: hvilke medlemmer skal gruppen ha, kan zuklopentiksol valideres, og er én ukes overlapp før nedtrapping riktig for en partiell agonist?
8. Abilify Maintena: skal oppstart med to injeksjoner og 300 mg-regimene modelleres senere, eller bare vises som begrensning?
9. Xeplion: skal den perorale behandlingen alltid seponeres ved første injeksjon, eller skal gradvis seponering være et valg? Skal bytte fra peroral risperidon få en egen regel?
10. Er de kliniske forutsetningene og unntakene i hver regel dekkende for en pilot med syntetiske kasus?

## 10. Hva som ikke er gjort

- Faglig kontroll pågår (P4.8): første runde fant feil som er rettet (§11); ingen regel er klinisk godkjent, og de eksplisitt uavklarte valgene i §9 er fortsatt uavklarte.
- Reglene gir ideelle doser; preparatene i FEST velges av doseplanmotoren i P5. Pilotreglene har ennå ikke tillatt avvik eller depotpreparat, så motoren stopper for flere av dem (`docs/verktøy-p5-beregningsmotor.md` §10–11).
- Ingen visning i appen (P6–P10).
- Ingen regel for kombinasjoner utenfor pilotsettet.

## 11. Rettet etter de uavhengige kontrollene (28.10.2026)

| Funn | Rettelse | Testet med |
| --- | --- | --- |
| Godkjenningen var ikke bundet til regelversjonen; en endret regel kunne beholde «klinisk godkjent» | Godkjenningssteg har regelversjon og fingeravtrykk; `beregn` setter `klinisk_godkjent` bare når godkjenningen er gyldig (§5) | Regresjonstest som endrer en godkjent regel (verdi, fortolkning, eksempel, kildeversjon), øker versjonen, eller godkjenner som utvikler |
| Et unntak som ikke var nevnt, ble tolket som avkreftet | Hvert unntak må besvares ja/nei; ukjent stopper. Indikasjon og formulering må bekreftes der de endrer doseringen (§7) | Ukjent og avkreftet testet hver for seg for hvert unntak; eksempler på ukjent nyrefunksjon og ukjente interaksjoner |
| Xeplion 3 mg ga spennet 25–50 mg som en ferdig plan | Dosen i spennet må velges av klinikeren og oppgis; ellers stopp (§3) | Grenseverdiene 25 og 50 mg, 24,99 og 50,01 mg, og uten valg |
| Ugyldige datoer og parametre ble normalisert eller ga et unntak | Streng dato- og parameterkontroll; beregningen kaster aldri (§3) | 2027-02-31, 2027-02-29, ugyldige strenger, 0 mg, 0 %, over 100 %, ikke-heltall, NaN og en regel som aldri når null |
| Psychiatrienet-referansen ble bare kontrollert på id | Kontrollen sjekker type, retning, virkestoff eller gruppe og formulering mot regelen | Mutasjoner med motsatt retning, feil virkestoff, feil type, feil formulering og feil gruppe |
| Rapporten sa at ingen regler var kontrollert, uansett status | Teksten følger antallet regler med gyldig godkjenning | Rapporten med 0, 1 av 2 og alle godkjent, og med en ugyldig godkjenning |
| *Andre runde:* En regel med OUSFARs egne valg kunne aldri godkjennes uten å ommerke valgene som kildefakta | OUSFAR-vurderinger har opprinnelse og avklaring hver for seg; godkjenning krever at alle åpne valg er avklart uavhengig (§4). Regelmodellen er versjon 2 | Regresjonstest som først blokkerer, så godkjenner samme regel etter uavhengig avklaring, med uendret opprinnelse; avklaring fra utvikler avvises |
| *Andre runde:* Enheten ble ikke kontrollert mot feltet, og et forløps startdag ble ikke kontrollert | Fast enhet per felt (`FELTENHET`), kontroll av startdager, tabellrader og inndatagrenser (`tallfeil`), og kontroll av planen før den returneres (§4) | Trinnlengde i mg, prosent i mg, dose i dager, sluttdose i prosent, startdag 0, −1, 1,5, NaN og uendelig |

Reglene for olanzapin → kvetiapin, Rest AP → aripiprazol, Abilify Maintena og Xeplion er versjon 2 (nye bekreftelser og unntakssvar, og dosevalget for Xeplion). De fire andre er uendret i versjon 1. Den faglige vurderingen av valgene i §9 er ikke endret av rettingen.
