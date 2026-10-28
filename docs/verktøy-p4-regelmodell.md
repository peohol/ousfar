# OUSFAR Verktøy – P4: regelmodellen

**Status 28.10.2026:** til faglig kontroll (P4.8). Ingen regel er klinisk godkjent, og ingenting her brukes av appen.

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
| Godkjenning | `Godkjenning` | Status (utkast, til faglig kontroll, klinisk godkjent, avvist, trukket) med historikk, rolle og dato, per regelversjon | Godkjenning uten et steg fra en uavhengig kontrollør |
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
- *injeksjoner* – startinjeksjoner på bestemte dager (med tidsvindu og injeksjonssted) og månedlig vedlikehold (med tidsvindu, tidligste intervall og dose fra en omregningstabell). Depot har sin egen tidsmodell, ikke daglige doser (P5.7);
- *uten beregning* – forløpet kan starte, men doseringen beregnes ikke (f.eks. fenelzin, som mangler norsk preparatomtale).

**Strategier for nedtrapping** (B1: «prosent» er alltid enten av startdosen eller av aktuell dose, aldri uspesifisert):

| Strategi | Neste dose | Kurve |
| --- | --- | --- |
| Prosent av aktuell dose (gjentatt prosentvis) | *D*ₖ₊₁ = *D*ₖ · (1 − *p*), med en mindre *p* når *D*ₖ er lik eller under en grense; under sluttdosen seponeres | Avtagende trinn, eksponentiell |
| Prosent av startdosen (lineær) | *D*ₖ₊₁ = *D*ₖ − *D*₀ · *p* | Like trinn |
| Absolutt (lineær) | *D*ₖ₊₁ = *D*ₖ − *m* mg | Like trinn |
| Hyperbolsk | Beregnet binding *f* = *D* / (ED50 + *D*) senkes i *n* like trinn fra *f*₀ til 0: *f*ₖ = *f*₀ · (1 − *k*/*n*), *D*ₖ = ED50 · *f*ₖ / (1 − *f*ₖ) | Stadig mindre trinn mot null |

*D*₀ for «prosent av startdosen» er dosen når nedtrappingsfasen starter. I den hyperbolske strategien går maksimal binding (Emax) ut av regnestykket, så bare ED50 trengs.

**Avrunding.** Beregningen bruker uavrundede doser; de vises med to desimaler. Det er den ideelle dosekurven. Hvilke doser som faktisk kan gis (styrker, delbarhet, flytende form) og valget mellom oppnåelige doser hører til P5 (B3, B5).

**Måneder.** Månedlige injeksjoner regnes fra forrige injeksjon. Med startdato er én måned senere samme dato, eller siste dag i måneden når den er kortere (31. januar → 28. februar); tidsvinduet i preparatomtalen gjelder rundt den datoen.

## 4. Bindende krav, preferanser og beregnbarhet

**Art (P4.3).** Hver parameter og hvert inndatakrav er enten et *bindende krav* (utvasking, minste varighet, doseområde regelen gjelder for, tidligste injeksjonsintervall) eller en *veiledende preferanse* (prosent, trinnlengde, overlapp). Et bindende krav som ikke er oppfylt, stopper beregningen; en veiledende grense gir en merknad.

**Grunnlag.** Hver verdi har et grunnlag: enten *kilde* (verdien står i kilden, med henvisning) eller *OUSFAR-forslag* (med begrunnelse, og henvisning når det er et valg innenfor det kilden tillater, f.eks. 14 dager av NICEs «én til to uker»). En verdi kan også mangle (`null`); da kan regelen ikke beregnes før den er avklart.

**Beregnbarhet (P4.4):**

- *entydig beregnbar* – alle verdier står i kildene; ingen OUSFAR-forslag eller manglende verdier (kontrollert);
- *beregnbar etter avklaring* – planen er beregnbar, men har OUSFAR-forslag som må avklares faglig før regelen kan godkjennes;
- *bare tekstlig veiledning* og *mangler anbefaling* – ingen plan; beregningen stopper alltid.

Ved tvetydighet lages ingen automatisk regel: valget skrives ut som forslag, og regelen kan ikke bli klinisk godkjent mens den har forslag som ikke er avklart (kontrollert).

## 5. Godkjenning og beregningsresultat

En regel godkjennes per versjon. Statusen er siste steg i historikken. *Klinisk godkjent* krever et steg fra en uavhengig kontrollør som ikke er den samme som utvikleren (kontrollert). En faglig endring gir ny versjon og ny kontroll; en ny kilderevisjon endrer aldri en godkjent regel av seg selv (B8, P12).

Beregningen (`beregn`) stopper og sier alle grunnene når regelen bare er tekstlig, avvist eller trukket; når et unntak gjelder eller pasientforholdet er ukjent for regelen; når en bekreftelse mangler; når start- eller måldosen mangler eller er utenfor et bindende område; når gruppemedlemmet ikke er vurdert eller ikke er med i gruppen; når en verdi mangler; eller når resultatet bryter et bindende krav. Den gjetter aldri og utvider aldri en regel lydløst (P5.8).

Et resultat har status *modellberegning* og et forbehold. `klinisk_godkjent` er bare sann når regelversjonen er klinisk godkjent, og heller ikke da er beregningen en vurdering av den enkelte pasient. Resultatet bærer regel-, regelsett-, modell- og motorversjon; like inndata og like versjoner gir samme resultat (P5.9).

## 6. Strategiene vurdert (P4.6)

- **Gjentatt prosentvis** (prosent av aktuell dose) er det NICE beskriver: hvert trinn en andel av forrige dose, mindre trinn når dosen er lav, og tempo styrt av symptomene. Trinnene blir mindre i mg, men kurven går aldri helt til null; den trenger en sluttdose der legemidlet seponeres. Foreslått som **standard** for antidepressiva i piloten.
- **Lineær** (prosent av startdosen eller faste mg) gir like store trinn. Den passer når kilden beskriver et fast antall like trinn, og ved kryss-titrering av antipsykotika der overlappen skal ha en kjent lengde. For antidepressiva blir de siste trinnene relativt sett store (fra en fjerdedel av startdosen rett til null), mens NICE råder til mindre trinn ved lave doser.
- **Hyperbolsk** tar hensyn til at reseptorbindingen flater ut ved vanlige doser, så like trinn i binding blir stadig mindre trinn i dose. Det er farmakologisk begrunnet, men bygger på få og små PET-studier, og det er ikke vist i kontrollerte studier at slike planer gir færre seponeringssymptomer. Planen blir lang (14 uker for citalopram 20 mg med åtte trinn) og krever doser under laveste tablettstyrke. Foreslått som **alternativ strategi**, ikke standard (B2).

**Flere trinn er ikke automatisk bedre.** Hvert trinn gir en ny overgang, mer kompleksitet og lengre behandling. Grensene i piloten (sluttdose, antall trinn, minste varighet) er forslag som må vurderes faglig, og planen er et utgangspunkt som må justeres etter pasientens symptomer (NICE 1.4.16).

## 7. Kliniske forutsetninger og pasientforhold (B7)

Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen. Regelmodellen håndterer dette på tre måter:

- *unntak* – pasientforhold der regelen ikke gjelder, når kilden sier det (f.eks. langsom CYP2D6-omsetter for Abilify Maintena, nedsatt nyrefunksjon for Xeplion). Et pasientforhold regelen ikke kjenner, stopper også beregningen;
- *bekreftelser* – det forskriveren må bekrefte (f.eks. at peroral aripiprazol er tolerert, at byttet til en MAO-hemmer skjer med spesialisthelsetjenesten);
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

- Ingen faglig kontroll ennå (P4.8); ingen regel er klinisk godkjent.
- Ingen FEST-tilpasning: doser er ideelle, ikke preparater (P5).
- Ingen visning i appen (P6–P10).
- Ingen regel for kombinasjoner utenfor pilotsettet.
