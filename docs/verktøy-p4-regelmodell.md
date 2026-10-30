# OUSFAR Verktøy – P4: regelmodellen

**Status 30.10.2026:** til faglig kontroll (P4.8), tredje runde. De to første uavhengige kontrollene fant feil i modellen og beregningen; de er rettet (§11). Pilotsettet har seks regler, alle sendt til kontroll på nytt: fire ble endret etter kontrollene av piloten, og tre fikk kildegrunnlaget for trinnlengden rettet etter kontrollen av P7. Escitalopram er flyttet til P7-reglene, og den hyperbolske citalopramregelen er etter fagkontrollen 30.10.2026 flyttet til sammenligningssettet i P7, som ikke brukes av verktøyet (§11). Ingen regel er klinisk godkjent. Fra P6 leser appen regelstatusen for å vise hva som kan beregnes, og får en plan bare gjennom `kliniskDoseplan`; med dagens regler viser den at faglig kontroll gjenstår.

Dette notatet beskriver hvordan OUSFAR skriver regler for nedtrapping og bytte av psykofarmaka, uavhengig av kilde, og hvorfor. Pilotsettet med alle regler, parametre, kilder og regneeksempler står i `docs/verktøy-p4-pilotsett.md`, som lages av koden (`npm run verktoy:regler -- rapport`) og derfor alltid stemmer med den. Koden ligger i `src/verktoy/regler/`.

## 1. Avgrensning

- En regel er **OUSFARs egen faglige vurdering**, formulert matematisk og bygget på kilder OUSFAR kan vise til: preparatomtaler (DMP, EMA), retningslinjer (NICE) og primær- og oversiktslitteratur. Fakta fra kildene gjengis kort med egne ord, med sted i kilden.
- **Psychiatrienet er én referanse blant flere, ikke grunnlag.** En regel kan vise til P3-kildeoppføringen den kan sammenlignes med (id-en, f.eks. `SwitchAntidepressants:Es>Stop`), men modellen har ikke felt for innholdet, og ingen regel gjengir anbefalingen, verken ordrett, oversatt eller omskrevet (`docs/verktøy-p3-rettigheter.md`). Kontrollene stopper en regel som har Psychiatrienet som grunnlag eller med innhold.
- **Tabellsettet overføres ikke systematisk** så lenge spørsmålet om databasevern er uavklart. Pilotsettet var åtte regler valgt for å prøve modellen på hver regelklasse, ikke et utdrag av tabellene. Seks er igjen: escitalopram er flyttet til P7-reglene, og den hyperbolske citalopramregelen til sammenligningssettet i P7.
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

**Justerbare verdier (regelmodell 4).** En parameter med område kan merkes `justerbar` med navnet forskriveren ser. Forskriveren kan da velge en annen verdi innenfor området (`Beregningsinndata.justert`, nøkkel er parameterens sti). Valget brukes etter godkjenningskontrollen, så godkjenningen gjelder området og ikke hvert valg; et valg utenfor området eller for en verdi som ikke er justerbar, stopper beregningen, og hvert valg står som kontroll i resultatet. Kontrollene krever navn og et område med to ulike grenser. Ingen pilotregel har justerbare verdier; P7-reglene bruker dem (`docs/verktøy-p7-nedtrapping.md` §5). Et inndatakrav med nedre grense 0 har bare en øvre grense. Er dosen ved starten av en nedtrapping med prosent av aktuell dose under sluttdosen, stopper beregningen: regelen har ingen trinn derfra, og dosen kalles ikke ugyldig.

**Spørsmål, krav om begrunnelse og individuell avslutning (regelmodell 5).** Etter fagvurderingen av P7 har modellen fire tillegg (`docs/verktøy-p7-nedtrapping.md` §5 og §7):

- `Regel.sporsmal`: ja/nei-spørsmål som må besvares før beregningen (`Beregningsinndata.svar`), f.eks. om behandlingstiden er lang. Ubesvart stopper; svaret står som kontroll i resultatet.
- `Parameter.begrunnelseskrav`: et valg over eller under en grense, eventuelt bare når et spørsmål er besvart med ja, krever en skriftlig begrunnelse (`Beregningsinndata.begrunnelse`). Uten den stopper beregningen; med den står valget, kravet og begrunnelsen som kontroll. Hvert krav har sitt eget grunnlag og kan avklares for seg.
- `Parameter.teknisk_maks`: øvre grense i et område som bare er teknisk; den vises som «av tekniske grunner høyst».
- `avslutning: 'individuell'` i en nedtrappingsfase: planen går ikke til null. Siste beregnede dose fortsetter, og resultatet sier hvorfor planen stopper der og at avslutningen må vurderes individuelt (`Forlopsresultat.avslutning`). Hvert forløp i en beregnbar ren seponeringsregel må slutte med den, kan ikke trappe ned før den og kan ikke seponere (`nulltrinnfeil`); både kontrollene og godkjenningen bruker kravet, så en regel som bryter det, aldri er klinisk godkjent. Bytter og tekstlige regler er unntatt. For en godkjent regel kontrollerer beregningen også planen: ingen dag uten dose og ingen slutt (`nulldagfeil`). Den kan ikke kombineres med `minste_varighet`.

Kontrollene krever at grensene i et krav er innenfor området, at `ved` er et spørsmål i regelen, og at id-ene for bekreftelser, unntak og spørsmål er unike.

**Planhorisont, praktisk grense og intervall (regelmodell 6).** Etter fagkontrollen 30.10.2026, som avviste en fast nedre grense (`docs/verktøy-p7-nedtrapping.md` §7):

- `horisont` (enhet trinn) i en nedtrappingsfase med individuell avslutning: høyst så mange reduksjoner i planen. En teknisk grense, ikke en klinisk; neste plan beregnes fra faktisk dose. Kontrollene krever en horisont ved individuell avslutning og ingen ellers.
- `sluttdose_mg` i prosent av aktuell dose er valgfri: en nedtrapping som går til 0 må ha en. Ved seponering har en nedtrapping med individuell avslutning ingen (ingen nedre grense er godkjent). Ved bytte kan den ha en med kilde: beregningen stopper da ved sluttdosen, og avslutningen derfra vurderes individuelt (kontrollrunden 30.10.2026).
- `dosevalg.min_mg` i et forløp er laveste dose formuleringen kan gi (en praktisk grense). En nedtrapping med individuell avslutning beregner ingen trinn under den. Beregningen viser heller ingen dose under 0,01 mg (`MINSTE_VISTE_MG`).
- Fasen `intervalldosering`: dosen (`aktuell` eller en dosekilde) gis hver `hver`. dag i minst `minstetid` dager, uten ny reduksjon og uten slutt. Den teller som slutt uten null i `nulltrinnfeil` (`fortsetterUtenNull`), og perioden får `hver` i resultatet.
- `Sporsmal.krever_begrunnelse`: et ja krever en skriftlig begrunnelse, f.eks. en dose utenfor rammen for indikasjon eller pasientgruppe.

**Betingede grenser, fordeling og avrunding (regelmodell 7, beregningsmotor 5).** Etter substanskontrollen 30.10.2026, runde 3 (`docs/verktøy-p7-nedtrapping.md` §4 og §7):

- `Inndatakrav.ved`: kravet gjelder bare når et spørsmål er besvart slik, f.eks. høyst 20 mg citalopram for eldre over 65 år. Kontrollene krever at spørsmålet finnes i regelen.
- `Inndatakrav.krever_begrunnelse`: en forsiktighetsgrense. En dose over den stopper ikke, men krever en skriftlig begrunnelse, og kravet og begrunnelsen står som kontroll. Bare for veiledende krav; en uttrykkelig høyeste dose (bindende) kan aldri begrunnes bort.
- `Sporsmal.nei`: teksten for nei-svaret når grensen gjelder ved nei, f.eks. paroksetin utenom tvangslidelse og panikklidelse.
- `Forlop.fordeling`: døgndosen gis fordelt på et av antallene i `antall` (hele tall, minst 2), over `over_mg` når den er satt, med eget grunnlag. Planen viser fordelingen, og doseplanmotoren gir bare doser som kan fordeles slik, med den jevneste fordelingen. `like_store` er et eget valg i regelen, med eget grunnlag, om at dosene skal være like store; det er ikke en felles regel for alle legemidler (kontrollrunden 30.10.2026).
- *Hold til et annet forløp er avsluttet*, når det andre forløpet avsluttes individuelt eller uten beregning: dosen holdes til da, og resten av forløpet planlegges også individuelt (`holdes til sertralin er avsluttet; videre dosering planlegges individuelt`).
- Med individuell avslutning avrundes hvert trinn til den viste dosen (to desimaler), og neste trinn regnes fra den. En reduksjon som forsvinner i avrundingen, er ikke et trinn (`avrundet_bort`); forsvinner allerede den første, stopper beregningen.

**Gyldige verdier.** Doser og varigheter er endelige tall over 0, prosenter over 0 og høyst 100, og dager, måneder og trinn hele tall (`parameterfeil`). En startdato må være en gyldig kalenderdato som `ÅÅÅÅ-MM-DD`; `2027-02-31` normaliseres ikke. Ugyldige verdier i regelen eller inndata gir en stopp med grunnen, og beregningen kaster aldri: også en feil i regelen selv blir en kontrollert stopp.

**Måneder.** Månedlige injeksjoner regnes fra forrige injeksjon. Med startdato er én måned senere samme dato, eller siste dag i måneden når den er kortere (31. januar → 28. februar); tidsvinduet i preparatomtalen gjelder rundt den datoen.

## 4. Bindende krav, preferanser og beregnbarhet

**Art (P4.3).** Hver parameter og hvert inndatakrav er enten et *bindende krav* (utvasking, minste varighet, doseområde regelen gjelder for, tidligste injeksjonsintervall) eller en *veiledende preferanse* (prosent, trinnlengde, overlapp). Et bindende krav som ikke er oppfylt, stopper beregningen; en veiledende grense gir en merknad.

**Grunnlag.** Hver verdi har et grunnlag: enten *kilde* (verdien står i kilden, med henvisning) eller *OUSFAR-vurdering* (med begrunnelse, og henvisning når det er et valg innenfor det kilden tillater, f.eks. 14 dager av RCPsychs «to til fire uker»). En verdi kan også mangle (`null`); da kan regelen ikke beregnes før den er avklart.

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

1. *Escitalopram (minstevarighet og prosentvis nedtrapping) er flyttet til P7 og vurdert i fagvurderingen 29.10.2026; se `docs/verktøy-p7-nedtrapping.md` §11.*
2. *Den hyperbolske strategien: fagkontrollen 30.10.2026 godkjente den ikke som valgbar klinisk strategi. Den står bare i sammenligningssettet i P7; se `docs/verktøy-p7-nedtrapping.md` §6.*
*Punkt 3–8 er vurdert i kontrollrunden 30.10.2026 (§11); det som gjenstår, står der.*

3. Sertralin → mirtazapin: er mirtazapin 15 mg fra dag 1 med overlapp til sertralin er seponert forsvarlig, og bør trinnene være kortere ved bytte (NICE åpner for raskere nedtrapping)?
4. Fluoksetin → fenelzin: kildene er uenige om nedtrapping av fluoksetin før utvasking (preparatomtalen: gradvis over minst én til to uker; NICE: annenhver dag ved 20 mg; Keks mfl.: seponering uten nedtrapping ved 40 mg eller mindre). Regelen følger preparatomtalen, med 28 dager per trinn fordi RCPsych anbefaler minst fire uker før neste reduksjon av fluoksetin. Er 35 dagers utvasking (minimum i preparatomtalen) nok, eller skal høye doser ha 42?
5. Olanzapin → kvetiapin: er det riktig å holde olanzapin til kvetiapin er på 300 mg (dag 4) og deretter trappe ned 25 % av startdosen per uke? Er det riktig å begrense regelen til måldoser 300–450 mg?
6. Rest AP → aripiprazol: hvilke medlemmer skal gruppen ha, kan zuklopentiksol valideres, og er én ukes overlapp før nedtrapping riktig for en partiell agonist?
7. Abilify Maintena: skal oppstart med to injeksjoner og 300 mg-regimene modelleres senere, eller bare vises som begrensning?
8. Xeplion: skal den perorale behandlingen alltid seponeres ved første injeksjon, eller skal gradvis seponering være et valg? Skal bytte fra peroral risperidon få en egen regel?
9. Er de kliniske forutsetningene og unntakene i hver regel dekkende for en pilot med syntetiske kasus?

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

Reglene for olanzapin → kvetiapin, Rest AP → aripiprazol, Abilify Maintena og Xeplion er versjon 2 (nye bekreftelser og unntakssvar, og dosevalget for Xeplion). Den faglige vurderingen av valgene i §9 er ikke endret av rettingen.

**Etter kontrollen av P7 (PR #286).** Trinnlengden i de fire antidepressivreglene viste til NICE 1.4.18 («én til to uker»), men det rådet står under fluoksetin. Kildegrunnlaget er rettet til RCPsychs to til fire uker mellom reduksjonene, og reglene er versjon 2. Escitalopram og den hyperbolske citalopramregelen har 14 dager med område 14–28. Sertralin → mirtazapin har fortsatt 14 dager med område 7–14, med NICEs åpning for raskere nedtrapping ved bytte. Fluoksetin → fenelzin har 28 dager per trinn etter RCPsych, så fenelzin tidligst kan startes dag 92 fra 40 mg og dag 64 fra 20 mg. Pilotsettet var da versjon 3.

**Etter fagvurderingen av P7 (29.10.2026).** Fagvurderingen avviste alle sluttdoser som automatisk trinn til null. Den hyperbolske citalopramregelen er versjon 3: den har individuell avslutning, står på 0,41 mg fra dag 85 og har ingen minste varighet. Escitalopram er flyttet til P7-reglene (versjon 4, i middelsgruppen), med historikken fra pilotsettet. Bytteregelene seponerer fortsatt, fordi bytte og utvasking krever det. Pilotsettet var da versjon 4 med sju regler, og regelmodellen versjon 5.

**Etter fagkontrollen av P7 (30.10.2026).** Den hyperbolske citalopramregelen er versjon 4 med teknisk planhorisont og status utkast, og er flyttet til sammenligningssettet i P7, fordi kontrolløren ikke godkjente den som valgbar klinisk strategi. Pilotsettet er versjon 5 med seks regler, og regelmodellen er versjon 6.

**Etter substanskontrollen av P7 (30.10.2026, runde 3).** Regelmodellen er versjon 7 og beregningsmotoren versjon 5 (§3). Pilotreglene er uendret i innhold; den hyperbolske citalopramregelen avrunder nå hvert trinn til den viste dosen.

**Etter kontrollrunden 30.10.2026 (P4.8).** Kontrolløren vurderte hver pilotregel mot kildene. P4.8 er gjennomgått, men ikke bestått, og ingen regel er klinisk godkjent. Pilotsettet er versjon 6:

| Regel | Vurdering | Endring |
| --- | --- | --- |
| Sertralin → mirtazapin (versjon 3) | En fast sekvens er ikke trygg for alle etter lang SSRI-bruk eller tidligere seponeringssymptomer; et bytte kan begrunne raskere nedtrapping, men ikke samme tempo for alle. | Tidligere seponeringssymptomer stopper regelen. Lang behandlingstid er et spørsmål der et ja krever skriftlig begrunnelse. Forskriveren må bekrefte at toleransen vurderes før hver reduksjon og at sedasjon og serotonerg belastning følges under overlappen. Om seponeringen fra 25 mg skal være et fast sluttpunkt, står åpent. |
| Fluoksetin → fenelzin (versjon 3) | 35 dagers utvasking, spesialistkravet og ingen automatisk fenelzindose er godtatt som minimum, ikke som et fast klinisk forløp. | Planen sier at fenelzin ikke startes automatisk: dagen er den tidligste, og senere oppstart kan være nødvendig. Produktinformasjon for fenelzin fra en godkjent utenlandsk kilde er ikke kontrollert ennå. |
| Olanzapin → kvetiapin (versjon 3) | Kvetiapinopptrappingen er et regime fra preparatomtalen; den faste nedtrappingen av olanzapin er ikke validert. Ikke godkjent. | Nedtrappingen av olanzapin beregnes ikke lenger; planen viser kvetiapinopptrappingen og at olanzapin deretter planlegges individuelt. Vurderingen av risiko og tempo i, eller med råd fra, spesialisthelsetjenesten må bekreftes. |
| Rest AP → aripiprazol (versjon 3) | Én felles algoritme er ikke validert for antipsykotika med ulik farmakologi. Ikke godkjent som gruppebasert klinisk doseplan. | Regelen sier at den ikke er en gruppebasert klinisk plan, og at zuklopentiksol alene er kandidat, helst som egen regel til ny kontroll. Samme bekreftelse om risiko og tempo som over. |
| Abilify Maintena (versjon 2) | Kildemessig akseptabel som avgrenset oppstart med én injeksjon. | Uendret. Registrert som kildemessig akseptabel, ikke klinisk godkjent; siste kontroll av preparatomtale, doser og regneeksempler gjenstår. |
| Xeplion (versjon 2) | Kildemessig akseptabel som avgrenset overgang fra perorale paliperidon-depottabletter med normal nyrefunksjon. | Uendret, og registrert på samme måte. Dosene er mg paliperidon, som styrkene i den europeiske preparatomtalen; det skal kontrolleres på nytt før en signert godkjenning. |

Beregningen viser nå et forløp som fortsetter uten beregning etter de første periodene, som «fra dag 5: videre dosering beregnes ikke; planlegges individuelt».

**Etter gjennomgangen av de rettede versjonene (30.10.2026).** Kontrolløren fant at to bytteregler fortsatt beregnet en del som ikke er kontrollert for hvert stoff. Begge er versjon 4, og pilotsettet er versjon 7:

| Regel | Vurdering | Endring |
| --- | --- | --- |
| Sertralin → mirtazapin (versjon 4) | Trinnet fra 25 mg til 0 var fortsatt et fast, ubesluttet sluttpunkt. | Beregningen stopper ved 25 mg sertralin, som fortsetter til avslutningen er vurdert individuelt. Mirtazapin holdes på 15 mg til da; måldosen beregnes ikke, og regelen spør ikke lenger etter den. |
| Rest AP → aripiprazol (versjon 4) | Regelen beregnet fortsatt 25 % av startdosen per uke til null, også for zuklopentiksol. | Bare første uke beregnes. Nedtrappingen av det gamle antipsykotikumet og måldosen for aripiprazol planlegges individuelt; aripiprazol holdes på 10 mg til da. En beregnet nedtrapping krever en egen regel for zuklopentiksol. |

Ingen pilotregel bruker lenger prosent av startdosen; strategien er fortsatt en del av modellen og testes for seg.
