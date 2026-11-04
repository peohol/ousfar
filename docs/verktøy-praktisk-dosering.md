# OUSFAR Verktøy – praktisk dosering, formovergang og stoppkoder (B1)

Tråd B i `docs/verktøy-brukervennlighet-2026-11.md` (§6, §9). Dette er den tekniske delen (B1). Den endrer ingen godkjent plan (S2, S3): alt nytt er valgfrie felt i regelmodellen som ingen regel har ennå. Den kliniske bruken kommer i egne regelversjoner med egen kontroll, først escitalopram v14 (B2).

## 1. Hva som er nytt i regelmodellen

Alle feltene er valgfrie. En regel uten dem har samme fingeravtrykk og gir samme plan som før.

| Felt | Hva det gjør |
| --- | --- |
| `Forlop.formoverganger` | Dokumenterte overganger mellom to FEST-legemiddelformer i samme forløp, for eksempel tablett (53) → dråper (748). Forløpet starter i formen pasienten bruker og går videre langs kjeden, aldri tilbake. `samtidig` tillater at én dose i overgangen settes sammen av begge formene. `grunnlag` må dokumentere at formene kan byttes mg for mg. |
| `Dosevalg.praktisk` | Praktisk dosering: `draper` er preferansegrensen for dråper per administrasjon (B6), med `grunnlag`. Det er en preferanse, ikke en grense. |
| `Klinisktilfelle.legemiddelformer`, `formstyrker` | Klinisk omfang for et tilfelle med formovergang: formene i rekkefølge (planen må starte i den første) og styrkene som er kontrollert per form. |
| Nedtrappingsfase `automatisk_trinnvalg` | B3, se §4. |

`formovergangsfeil` stopper en regel der overgangene forgrener seg, går i sløyfe, ikke er perorale, eller der et tilfelle ikke følger kjeden. Dråpepreferansen må være et helt tall over 0. Feilene vises som «Regelen er ugyldig: …» (stoppkode `regelfeil`).

## 2. Valget av dose med praktisk dosering

De harde kravene og minst avvik fra kurven kommer alltid først (`docs/verktøy-p5-beregningsmotor.md` §5). Blant dosene som er like gode der, velger motoren den enkleste, i denne rekkefølgen:

1. færrest preparater med godkjenningsfritak (som før);
2. færrest dråper over preferansegrensen (bare med `praktisk`);
3. færrest delinger (som før);
4. færrest tabletter eller målinger, der en dråpedose teller som én (som før);
5. færrest styrker (som før);
6. færrest formskifter, og så lengst tid i den første formen (bare med `formoverganger`);
7. avrunding mot kurvens retning, så laveste dose (som før).

Hver dose i en overgang har et *stadium*: første form alene, begge formene samtidig (bare med `samtidig`), neste form alene, og så videre. Stadiet går aldri tilbake. Etter en dose med dråper gis altså ikke tabletter alene igjen.

## 3. Hvilke godkjente planer prinsippet ville endret

Kontrollert 04.11.2026 mot alle regler som er klinisk godkjent på main:

- kryssnedtrapping sertralin → mirtazapin v10
- Abilify Maintena v3
- Xeplion v3
- escitalopram v13
- vortioksetin v12
- bupropion v5
- agomelatin v1
- valproat + lamotrigin v2
- litium + lamotrigin v2

**Praktisk dosering alene endrer ingen godkjent plan.** Hver regel fikk `praktisk` med 5 dråper og en simulert godkjenning, og alle 158 pilot- og tilleggskasus ble kjørt på nytt. Ingen plan, ingen stopp og ingen tilbudte trinnvalg ble annerledes. Det eneste avviket var teksten om godkjenning i én kasus, som kommer av selve simuleringen. Grunnen er at ingen godkjent regel blander dråper og tabletter i dag, så det finnes ingen dose der prinsippet kan velge noe annet.

**Forskjellen kommer først med en formovergang.** Dette er grunnlaget for escitalopram v14 (B2). Doseplanmotoren gir disse planene med escitalopram v13 utvidet med overgangen tablett → dråper og en preferanse på 5 dråper (eksemplene er testet i `src/__tests__/verktoypraktisk.test.ts`). De er ikke klinisk kontrollert.

| Start | Overgang | Døgndoser (mg) |
| --- | --- | --- |
| 20 mg tablett | uten `samtidig` | 15 (tablett 10 + 5), så dråper 12, 9, 7, 6, 5, 4, 3, 2, 1 |
| 20 mg tablett | med `samtidig` | 15 (tablett 10 + 5), 12 (tablett 10 + 2 dråper), 9 (tablett 5 + 4 dråper), 7 (tablett 5 + 2), 6 (tablett 5 + 1), så dråper 5, 4, 3, 2, 1 |
| 10 mg tablett | uten `samtidig` | dråper fra første trinn: 8, 6, 5, 4, 3, 2, 1 |
| 10 mg tablett | med `samtidig` | 8 (tablett 5 + 3 dråper), 6 (tablett 5 + 1 dråpe), så dråper |
| dråper | – | bare dråper, som i v13 |

To ting er verdt å merke seg for B2-kontrollen:

- Uten preferansen ville motoren gått rett til 15 dråper. Med den gis første trinn som tabletter.
- Preferansen er ikke en grense. Uten `samtidig` gis 12 dråper, fordi ingen enklere dose treffer trinnet.

## 4. Det verktøyet kan avgjøre selv (B3, B4)

Dette er forberedt i `src/verktoy/motor/automatikk.ts`, men ingenting er i bruk.

- **B4, legemiddelform.** Når ett forløp mangler formvalg og bare én form kan gi en komplett plan med svarene som er gitt, kan verktøyet velge den. Planen sier da: «Bare <form> gir en komplett plan innenfor det som er godkjent, så verktøyet har valgt den.» Funksjonen er slått av (`BESLUTNINGER.B4 = false`) til ChatGPT har akseptert beslutningen.
- **B3, dose per trinn.** Bare i forløp der regelen har `automatisk_trinnvalg` velger verktøyet den foretrukne dosen: nærmest den beregnede, og ved likt den høyeste, så reduksjonen aldri blir større enn nødvendig. Et mindre siste trinn velges aldri automatisk. Valget og alternativene følger med, så forskriveren kan endre dem. Feltet er bundet til fingeravtrykket og godkjenningen, og ingen regel har det.
- **Tidlig kontroll av om en komplett plan kan lages.** `kanBliKomplett` svarer `ja` (med valgene som gir planen), `nei` eller `ukjent` når søket blir for stort. Den viser aldri en plan selv (S9).

Begge bruker bare `kliniskDoseplan`, så en plan vises fortsatt bare når motoren har beregnet den komplett (S1, S9).

## 5. Stoppkoder

Hver stoppgrunn i `Doseplanresultat` har en kode ved siden av teksten (`stoppkoder`, og `sperrekoder` for sperrene på en vist plan). Kodene står i samme rekkefølge som tekstene, og tekstene er uendret. `ref` peker på det stoppet gjelder: unntaket, bekreftelsen, spørsmålet eller forløpet. Navnene er avtalt med spørsmålsflyten (`Stoppkodenavn` i `src/verktoy/flyt/typer.ts`, tråd C), og betydningen står i `STOPPKODER` i `src/verktoy/motor/stoppkoder.ts`.

| Kode | Når |
| --- | --- |
| `unntak_gjelder`, `unntak_ukjent` | Et unntak er besvart ja, eller er ikke besvart |
| `sporsmal_ubesvart` | Et spørsmål er ikke besvart |
| `bekreftelse_mangler` | En bekreftelse er ikke gitt |
| `begrunnelse_trengs` | Et svar, en dose eller en verdi krever skriftlig begrunnelse |
| `dose_utenfor` | Startdosen eller måldosen er utenfor et bindende krav |
| `utenfor_omfang` | Planen er utenfor det kliniske omfanget |
| `formvalg_trengs` | Formulering eller legemiddelform må velges (et valg, ikke et stopp) |
| `trinnvalg_trengs` | Forskriveren kan velge en av dosene for et trinn (et valg, ikke et stopp) |
| `valg_ugyldig` | Et valg som er gjort, gjelder ikke |
| `ingen_preparater`, `godkjenningsfritak_trengs` | FEST har ingen brukbare preparater, eller bare preparater som krever godkjenningsfritak |
| `ingen_dose` | En dose kan ikke gis med preparatene i FEST. Denne koden er lagt til i B1 og meldt til tråd C. |
| `ikke_komplett` | Planen når ikke sluttmålet |
| `ikke_klinisk` | Regelen er ikke gyldig klinisk godkjent, eller FEST-kopien er ikke bekreftet fersk |
| `sperret` | En nødstopp gjelder. Den settes av appen, aldri av motoren. |
| `regelfeil`, `annet` | Regelen er ugyldig, og alt annet |

Stoppene fra regelmotoren (`beregn`) er fri tekst. Unntak, bekreftelser og spørsmål kjennes igjen på nøyaktig den teksten motoren lager av regelens egen tekst, så de får id-en sin. De andre kjennes igjen på innledningen. En ny stopptekst i regelmotoren må derfor få et mønster i `stoppkoder.ts`, ellers blir koden `annet`. En ny kode legges til i `STOPPKODER`, i spørsmålsflytens kodeliste og her.

## 6. Bevis for at ingen godkjent plan endres (S3)

`src/__tests__/__snapshots__/verktoy-s3-planer.json` ble laget på main før B1 og lagt inn som egen commit. Den inneholder utfallet av:

- alle pilotkasus;
- alle tilleggskasus;
- alle kasus i kontrollforslagene;
- omfangsplanene.

For hver kasus står planlinjene eller stoppgrunnene og dosene som tilbys i trinnvalg. Testen i `verktoypraktisk.test.ts` krever at motoren gir nøyaktig det samme etter B1. Skal fasiten endres, må det være en tilsiktet klinisk endring med egen kontroll.

Regelmodellversjonen (12) og doseplanmotorversjonen (10) er ikke økt. Feltene er valgfrie og endrer ingen plan, og en økning ville endret genererte kontrollgrunnlag som andre tråder eier. Økningen kan gjøres sammen med den første regelen som tar feltene i bruk (B2) hvis ChatGPT ønsker det.
