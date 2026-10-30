# OUSFAR Verktøy – P5: doseplanmotoren med FEST

**Status 30.10.2026:** til faglig kontroll. Motoren er ferdig og testet med syntetiske regler og preparater; doseplanmotoren er versjon 3 etter substanskontrollen av P7 30.10.2026, runde 3 (§5). Ingen beregnbar pilotregel eller P7-regel er klinisk godkjent (P4.8 er åpen), så motoren kan ikke gi en klinisk doseplan i appen. De eneste klinisk godkjente reglene, bupropion og agomelatin, er tekstregler uten beregning.

Notatet beskriver hvordan OUSFAR går fra den ideelle dosekurven i P4 til en doseplan med preparater som faktisk finnes i Norge, og hvorfor. Testtilfellene står i `docs/verktøy-p5-testtilfeller.md`, som lages av koden (`npm run verktoy:regler -- motorrapport`) og derfor alltid stemmer med den. Koden ligger i `src/verktoy/motor/`.

## 1. Avgrensning

- **Samme motor for alle tre verktøyene.** `beregnDoseplan` tar en regel (P4), inndata, preparatene i FEST og dagen statusen gjelder. Appen skal bare bruke `kliniskDoseplan`, som stopper alt som ikke er klinisk (§9).
- **Ingen ny FEST-importør (P5.1).** Motoren leser legemiddeldataene i den formen `les_legemidler` gir dem (`Legemiddelutvalg`), altså OUSFARs kopi fra den nattlige synkroniseringen og «Hent nå» (`docs/legemiddeldata.md`). Koblingen fra virkestoff til FEST-ID-er er P1-kartleggingen, og formuleringen bruker P1-overstyringene (f.eks. Haldol Depot).
- **Ingen klinisk innhold i P5.** Motoren regner bare med reglenes verdier. Hvor langt en dose kan avvike fra den ideelle, er en del av regelen (§4), ikke av motoren. Kildeteksten vises aldri.
- **Syntetiske data i testene.** Virkestoffene, preparatene og reglene i `syntetisk.ts` finnes ikke og har ingen klinisk betydning. Reglene har id som begynner med `syntetisk-`, og preparatene kilden «Syntetiske testdata», så sperren (§9) slår alltid ut for dem.

## 2. Slik en plan beregnes

1. **Kildedataene (P5.1).** Uten en vellykket henting av FEST (`kontrollert_kl` og `kildedato`) stopper beregningen. Er kopien ikke kontrollert de siste 48 timene (`festForeldet`, samme grense som fagsidene), er planen ikke klinisk.
2. **Den ideelle kurven (P5.5).** `beregn` fra P4 gir dosene per periode, uavrundet, med alle stoppene og kontrollene derfra.
3. **Byggesteinene (P5.2–P5.4).** For hvert forløp leses preparatene for virkestoffet (§3), avgrenset av regelen (administrasjon, `klasser`, `preparater`) og forskriverens valg (formulering, legemiddelform, preparater, godkjenningsfritak).
4. **Entydighet.** Spenner preparatene over flere formuleringer (f.eks. vanlig og modifisert frisetting) eller flere legemiddelformer uten at forskriveren har valgt, stopper beregningen. Motoren blander ikke tabletter og dråper, eller vanlig og modifisert frisetting, av seg selv.
5. **Dosene (P5.5–P5.6).** For hver periode finnes døgndosene som kan settes sammen og oppfyller de harde kravene, og én dose velges per periode for hele forløpet samlet (§5).
6. **Depot (P5.7).** Hver injeksjon må gis med nøyaktig én hel injeksjon av et preparat regelen nevner.
7. **Kontroller.** Utvaskingen kontrolleres på nytt i den praktiske planen, og planen får versjoner, kontrollsum og forbehold (§8).

## 3. Byggesteinene (`byggesteiner.ts`)

En byggestein er ett preparat i én form og styrke (FESTs merkevare). Den kan brukes bare når listen over begrensninger er tom.

| Hva | Regel | Ellers |
| --- | --- | --- |
| Virkestoff | Bare preparater med det ene virkestoffet (moderstoffet eller et salt av det) | Kombinasjonspreparat: brukes ikke |
| Styrke | Én entydig verdi («Lik»), i mg, oppgitt for moderstoffet | Intervall, «mindre/større enn», mmol: brukes ikke |
| Saltforhold | Styrken på moderstoffet («terapeutisk del», som FEST nesten alltid oppgir) | Styrke oppgitt for et salt: brukes ikke, siden FEST ikke oppgir omregningen. Ingen molmasser legges inn for hånd |
| Doseenhet | Tablett, kapsel, injeksjon (per sprøyte eller per enhet), dråpe når FEST oppgir mg per dråpe (alternativ styrke) | Flytende form per ml uten dråpe (mikstur, oppløsning): brukes ikke, fordi doseringsoppløsningen ikke er dokumentert |
| Deling (P5.3) | Bare tabletter, og bare når FEST sier «Delbar i 2» (halve) eller «Delbar i 4» (halve og kvarte) for akkurat dette preparatet | «Ikke delbar», «Ikke spesifisert» og manglende felt: hele tabletter. Kapsler deles eller åpnes aldri, uansett hva som står. Injeksjoner og dråper deles aldri |
| Modifisert frisetting | Deles bare når FEST oppgir deling for preparatet; det står i sporet | – |
| Preparattype (P5.4) | «Legemiddel» (registrert). «Krever godkj. fritak» bare når forskriveren har valgt godkjenningsfritak | Sykehuspreparat, magistrell o.l.: brukes ikke |
| Markedsstatus (P5.4) | Markedsført på statusdagen | Midlertidig utgått, avregistrert, ikke markedsført ennå, uten pakning: brukes ikke |
| Meldt endring | En meldt avregistrering eller midlertidig utgang brukes bare i perioder som slutter før den. Uten startdato, og for et vedlikehold uten slutt, kan det ikke vises at preparatet finnes hele perioden, så da brukes det ikke | – |

Preparater med samme formulering, form, doseenhet, styrke og registrering gir de samme dosene og samles i et *styrkevalg*. Delbarheten gjelder fortsatt hvert preparat: en halv tablett sporer bare til preparatene i styrken som faktisk er delbare («En delestrek i ett produkt ≠ samme delbarhet i alle produkter med styrken»).

FEST sier hva som er registrert og markedsført, ikke hva apoteket har på lager. Hver plan har det som forbehold, og preparatene som ikke kan brukes står som begrensninger ved forløpet, med grunnen. Finnes ingen brukbare preparater, sier stoppen at det ikke finnes en bekreftet norsk løsning (B5).

## 4. Hva regelen bestemmer (regelmodell 3)

P4-modellen har fått tre valgfrie felt per forløp. Ingen av pilotreglene har dem, så fingeravtrykkene deres er uendret. Regelmodell 4 har i tillegg justerbare verdier, som forskriveren kan velge innenfor regelens område før den ideelle kurven beregnes (`docs/verktøy-p4-regelmodell.md` §3); motoren får kurven slik den da blir. Regelmodell 5 og 6 (beregningsmotor 3 og 4 i P4) har spørsmål, krav om begrunnelse, individuell avslutning med teknisk planhorisont og dosering med intervall: en seponering går da ikke til null, og siste dose fortsetter til avslutningen er vurdert. Motoren setter sammen dosene til og med den siste dosen og tar med merknaden om avslutningen i planen (`docs/verktøy-p7-nedtrapping.md` §7). En periode med intervall (annenhver dag) settes sammen som en vanlig dose per gang og vises med «annenhver dag».

- **`dosevalg`**: `avvik_prosent` (største avvik fra den ideelle døgndosen, begge veier), `maks_mg` og `min_mg`. Hver er en parameter med art og grunnlag, som andre verdier i en regel. **Uten `avvik_prosent` godtas bare doser som kan gis nøyaktig**; motoren velger aldri en toleranse selv.
- **`klasser`**: formuleringsklassene (P1) forløpet gjelder, f.eks. bare vanlig frisetting.
- **`preparater`**: varenavnene forløpet gjelder. Påkrevd for depot, fordi FEST ikke skiller f.eks. månedlig og tremånedlig paliperidon i formen. Pilotreglene for Abilify Maintena og Xeplion har det ikke ennå, så motoren stopper for dem (§10).

Kontrollene i P4 sjekker at `klasser` passer administrasjonen og at `preparater` ikke er tomme.

## 5. Valget av doser (`dosevalg.ts`, B3)

**Harde krav.** Hver døgndose med dose er over 0, innenfor regelens avvik fra den ideelle dosen (uten toleranse nøyaktig), og innenfor `maks_mg` og `min_mg`. Dosen går aldri motsatt vei av kurven: synker den ideelle dosen fra én periode til neste, øker ikke den praktiske, og omvendt. Det gjelder også første periode, målt fra dosen forløpet starter med: pasientens aktuelle dose (`utgangsdose: 'startdose'`), eller 0 for et nytt legemiddel. En nedtrapping kan altså aldri begynne med å øke dosen, og en opptrapping aldri med å senke den; finnes ingen første dose som oppfyller både toleransen og retningen, stopper beregningen. Et trinn kan bli likt det forrige; da står det som avvik.

**Så, i denne rekkefølgen:**

1. minst sum av relative avvik over periodene;
2. færrest preparater med godkjenningsfritak;
3. færrest delinger (en kvart teller som to halve);
4. færrest tabletter, kapsler eller målinger;
5. færrest styrker;
6. avrunding mot forrige dose: summen over periodene av det relative avviket regnet mot kurvens retning, så en nedtrapping rundes heller opp og en opptrapping heller ned, i hvert trinn og ikke bare det første;
7. fast rekkefølge (lavest dose først), så like inndata alltid gir samme plan.

Punkt 1–5 er en eksplisitt teknisk prioritering innenfor de harde kravene, ikke dokumentasjon for et klinisk optimum. Punkt 6 skiller bare kandidater som ellers er like gode. Det betyr ikke at hele forløpet blir mildere: runder ett trinn opp, blir neste reduksjon tilsvarende større (testtilfellet `avrunding-mellomtrinn`: 15 → 12,5 → 7,5 mg i stedet for 15 → 10 → 7,5 mg). Godkjenningsfritak teller som kompleksitet (punkt 2), så et registrert preparat foretrekkes når avviket er det samme, men ikke foran et mindre avvik.

Valget gjøres for hele forløpet samlet (dynamisk programmering), ikke periode for periode, så et valg tidlig aldri gjør et senere trinn umulig når en annen rekke finnes.

**Praktiske rammer.** En døgndose settes sammen av høyst 2 styrker og til sammen høyst 4 tabletter eller kapsler eller 60 dråper, talt over alle styrkene i dosen. Det er en ramme for søket, ikke en klinisk grense. Finnes ingen dose innenfor den, stopper beregningen og sier det.

**Stopp (P5.8).** Kan en periode ikke gis innenfor rammene, stopper beregningen med perioden, den ideelle dosen, toleransen, de nærmeste dosene som kan settes sammen med avviket, og preparater som er utelatt fordi de ikke er markedsført hele perioden. Motoren utvider aldri toleransen, bytter formulering eller endrer trinnene selv; det er en ny faglig beslutning.

**Planer uten nulltrinn (doseplanmotor 2).** Etter fagkontrollen 30.10.2026 (beslutning 3 og 7) stopper en plan med individuell avslutning eller intervall ved trinnet før det første trinnet som ikke kan gis, eller som ville gått mot kurvens retning. Siste periode som kan gis, fortsetter uten slutt, med forklaringen om hvilket trinn som ikke kan gis, de nærmeste dosene, at planen stopper ved trinnet før og at siste beregnede dose ikke er siste dose før seponering. Forklaringen erstatter den ideelle planens merknad om hvor planen stopper. Kan allerede første trinn ikke gis, stopper beregningen som før. Ved hver nærmeste dose under dosen pasienten bruker, oppgir stoppen den faktiske reduksjonen («faktisk reduksjon 50 % fra 60 mg»), og den sier at en annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning. Testtilfellene `uten-nulltrinn-stopper-ved-trinnet-for`, `uten-nulltrinn-forste-trinn-kan-ikke-gis` og `annenhver-dag` viser det.

**Avrunding og fordeling (doseplanmotor 3).** Etter substanskontrollen 30.10.2026 (beslutning 6–8) regner P4-motoren hvert trinn fra den avrundede dosen, så den ideelle, viste og gitte dosen er den samme, og en reduksjon som forsvinner i avrundingen, gir ingen periode (`uten-nulltrinn-avrundet-bort`). Dråper gir ingen toleranse: en dose som ikke er et helt antall dråper, stopper planen ved trinnet før (`uten-nulltrinn-draper-uten-toleranse`). Når regelen krever at døgndosen fordeles (`Forlop.fordeling`), velges bare doser der tablettene og delene kan fordeles på et av de tillatte antallene doser, hver høyst grensen; planen viser fordelingen («fordelt på 2 doser: 20 + 10 mg»). Kan en nøyaktig dose gis, men ikke fordeles, er det fordelingen som stopper planen, med den forklaringen (`fordeling-over-grense`, `fordeling-kan-ikke-fordeles`).

**Flytende former.** Dråper med dokumentert mg per dråpe i FEST kan brukes når de er valgt; Cipralex dråper har 1 mg per dråpe. Miksturer og konsentrater uten dokumentert oppløsning for oppmålingen brukes ikke. Zoloft konsentrat (20 mg/ml) står i FEST uten slik oppløsning, så det er fortsatt sperret til dose per ml, oppmålingsoppløsning og nøyaktighet er dokumentert (`docs/verktøy-p7-nedtrapping.md` §10).

**Avrunding og enheter (P5.6).** Alle doser regnes i mg moderstoff per døgn. Den ideelle dosen bevares uavrundet ved siden av den praktiske, og avviket i prosent av den ideelle. Delte tabletter vises som brøk (½, ¼, 1¾). Tall vises med to desimaler.

## 6. Samtidige forløp, utvasking og depot (P5.7)

- Hvert forløp får sine egne preparater og sitt eget dosevalg. Trinnene og dagene er de samme som i den ideelle kurven, så utvaskingen fra P4 bevares. Den kontrolleres likevel på nytt i den praktiske planen: siste dag med dose i forrige forløp, og første dag med dose i neste.
- Depot har tidsmodellen fra P4: startinjeksjoner på bestemte dager med tidsvindu, og vedlikehold hver *n*. måned regnet med kalendermåneder. Første vedlikeholdsdose gis *n* måneder etter siste startinjeksjon, og planen skriver det slik («hver måned fra 1 måned etter dag 8», med første dato når startdatoen er kjent). Hver injeksjon er nøyaktig én hel injeksjon med dosen. Motoren setter aldri sammen flere sprøyter og bruker aldri en del av en sprøyte. Registrerte preparater foretrekkes framfor godkjenningsfritak.
- Med startdato får hver periode og injeksjon kalenderdatoer, også over årsskifter og i korte måneder.

## 7. Datoer og dag 1

Dag 1 er planens første dag. Statusdagen (`idag`) bestemmer markedsstatusen og må oppgis, så beregningen er deterministisk. Er en startdato oppgitt, avgjør periodens siste dato om et preparat med meldt avregistrering kan brukes.

## 8. Sporbarhet og determinisme (P5.9)

Hver plan og hver stopp har:

- regelens id, versjon, fingeravtrykk og godkjenningsstatus;
- regelsettets id og versjon;
- versjonene til regelmodellen, P4-motoren og doseplanmotoren;
- FEST-kilden, datoen for uttrekket, når kopien sist ble kontrollert, og statusdagen;
- SHA-256 av preparatene planen bruker, slik FEST beskrev dem.

Hver dose har elementer med styrke, antall og hvert preparat (FESTs ID, navn med form og styrke, registrering, deling og grunnlaget for den). Like inndata og like versjoner gir samme resultat, uansett rekkefølgen dataene kommer i. Motoren kaster aldri; en feil gir en kontrollert stopp.

## 9. Sperren mot klinisk bruk

En plan er **klinisk** bare når alt dette gjelder (`kliniskSperre`):

- regelversjonen er gyldig klinisk godkjent (`godkjenningsfeil` fra P4: riktig versjon og fingeravtrykk, uavhengig kontrollør, ingen åpne valg);
- regelen er ikke en syntetisk testregel;
- preparatene er fra FEST;
- FEST-kopien er bekreftet fersk. Kravet er positivt: kontrolltidspunktet må være et gyldig tidspunkt med tidssone, høyst 48 timer gammelt og høyst 5 minutter fram i tid (klokkeavvik), og kildedatoen en gyldig dato, med eller uten klokkeslett slik FEST-synken lagrer den, som ikke ligger etter kontrollen (ett døgns slingring for tidssonen). Kalenderdatoen kontrolleres før tidspunktet tolkes, så en dag som ikke finnes (30. februar) avvises i stedet for å flyttes til neste måned. Kildedatoen beholdes uendret i sporet. 48 timer og 5 minutter er tekniske driftsregler for datagrunnlaget, ikke medisinske terskler. Mangler et tidsstempel eller kan det ikke tolkes, stopper beregningen helt (P5.1).

Ellers er planen en modellberegning med forbeholdet at den ikke skal vises i appen, og grunnene står i `sperre`. `kliniskDoseplan`, som appen skal bruke, gjør en slik plan om til en stopp. Ved en stopp vises bare publisert OUSFAR-fagtekst, aldri en kildes tekst (P5.8).

Testene kontrollerer at ingen av de sju pilotreglene kan gi en klinisk plan, heller ikke med preparatdata merket som FEST, og at en syntetisk regel med en syntetisk godkjenning heller ikke kan det. En integrasjonstest fører svaret fra `les_legemidler` i en database bygd av migrasjonene helt inn i motoren. Kravene til FEST-kopien prøves med en positiv kontroll: en regel som bare finnes i testen, med en godkjenning laget der, gir en klinisk plan med fersk FEST, og så varieres tidsstemplene ved grensene. Ingen virkelig regel er godkjent for å få testene til å passere.

## 10. Prøvekjøring mot FEST

Motoren ble kjørt på pilotreglenes regneeksempler med FEST-filen lastet ned 28.10.2026 (uttrekk 08.10.2026). Dette var en modellberegning for å kontrollere byggesteinene på virkelige data. Ingenting er lagret, og ingenting er klinisk.

- Escitalopram, sertralin, mirtazapin, paliperidon og aripiprazol ble lest som forventet. Delbarheten følger FEST per preparat (f.eks. Cipralex 10 og 20 mg delbar i 2, 5 mg ikke spesifisert). Preparater med godkjenningsfritak er skilt ut.
- **Seponering av escitalopram og citalopram** stoppet, fordi pilotreglene ikke hadde toleranse og 3,75 mg og 10,08 mg ikke kan gis nøyaktig. Fagkontrollen av P7 30.10.2026 avgjorde at ingen regel skal ha toleranse, og at et trinn som ikke kan gis, gir en forklart stopp (§5).
- **Sertralin → mirtazapin, fluoksetin → fenelzin og olanzapin → kvetiapin** gir planer med registrerte tabletter.
- **Zuklopentiksol i gruppen Rest AP** stopper på 15 mg, som ikke kan gis nøyaktig.
- **Abilify Maintena og Xeplion** stopper, fordi depotforløpene ikke sier hvilket preparat de gjelder (§4).

## 11. Spørsmål til faglig kontroll

1. **B3, rekkefølgen i §5.** Er minst sum av relative avvik riktig første mål, før kompleksitet? Er det riktig å runde en nedtrapping opp ved likt avvik?
2. **Toleranse.** Hvilke regler skal ha `avvik_prosent`, og hvor stor, med hvilket grunnlag? Uten toleranse stopper de fleste nedtrappinger på et trinn som ikke kan gis nøyaktig.
3. **Deling av modifisert frisetting.** Er FESTs «Delbar i 2» for en depottablett nok grunnlag for halve tabletter, eller skal motoren aldri dele modifisert frisetting?
4. **Dråper.** Er dosering i hele dråper etter FESTs «mg per dråpe» akseptabelt, og er 60 dråper en rimelig ramme?
5. **Godkjenningsfritak.** Er det riktig at preparater med godkjenningsfritak bare brukes etter et uttrykkelig valg, og at registrerte foretrekkes?
6. **Meldte avregistreringer.** Er det riktig at et preparat med meldt avregistrering ikke brukes i et vedlikehold uten slutt, eller uten startdato?
7. **Foreldet FEST.** Er det riktig at en kopi som ikke er kontrollert på 48 timer gjør planen ikke-klinisk, slik at verktøyet stopper når synkroniseringen har feilet to netter?
8. **Pilotreglene.** Depotreglene trenger `preparater` (Abilify Maintena 400 mg månedlig, Xeplion) og eventuelt `klasser`, og nedtrappingsreglene en toleranse. Det er en endring av reglene, så det hører til en ny regelversjon og kontroll (P4.8).

**Svar fra første kontroll (ChatGPT, 28.10.2026).** Ingen pilotregel ble godkjent, og P4.8 står åpen.

- *B3:* kan brukes som teknisk prioritering innenfor godkjente harde krav, men er ikke dokumentasjon for et universelt klinisk optimum. Retningen skal gjelde fra startdosen og avrundingen ved likhet virke i hvert trinn; begge er rettet (§5).
- *Toleranse:* eksakt dose og kontrollert stopp er standard. Motoren skal ikke ha én generell klinisk toleranse; en toleranse begrunnes og godkjennes i den enkelte regelversjonen.
- *Modifisert frisetting:* et uttrykkelig, preparatspesifikt FEST-felt for deling er forsvarlig. Delbarhet utledes aldri av virkestoff, en annen merkevare eller en delestrek. Motoren deler derfor en depottablett bare når FEST sier det for akkurat det preparatet.
- *Dråper:* hele dråper med oppgitt mg per dråpe kan brukes. 60 er en søkegrense, ikke en klinisk maksimumsdose, og gjelder nå hele døgndosen.
- *Godkjenningsfritak, avregistrering og 48 timer:* kan beholdes som beskrevet; ferskheten er nå et positivt krav (§9).
- *Pilotreglene:* depotpreparat og toleranser krever nye, sporbare regelversjoner og egen P4.8-kontroll. At P5 stopper for dagens regler, er riktig.

## 12. Hva som ikke er gjort

- Brukerflaten kom i P6: appen bruker motoren bare gjennom `kliniskDoseplan` i `src/verktoy/doseplan.ts`, og `src/__tests__/verktoyapp.test.ts` håndhever at modellberegningene og de syntetiske testdataene ikke når appen. De enkelte verktøyene (P7–P10) gjenstår.
- Ingen regel er klinisk godkjent.
- **Fordeling over døgnet** er ikke en del av reglene; dosene er døgndoser.
- **Deler av en sprøyte** brukes ikke, selv om en preparatomtale kan beskrive det (f.eks. lavere dose fra et sett). Det krever en egen, kildebasert byggestein.
- **Flytende former per ml** og **styrke oppgitt for et salt** brukes ikke før doseringsoppløsningen eller omregningen er dokumentert.
- Den nattlige synkroniseringen ble ikke lest i produksjon fra denne økten (databasetilgangen ble avvist). Motoren kontrollerer hentingen selv ved hver beregning (§2).
