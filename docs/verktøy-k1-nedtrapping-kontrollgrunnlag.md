<!-- Laget av `npm run verktoy:regler -- kontrollgrunnlag`; rediger ikke for hånd. -->
# K1: nedtrapping av antidepressiv til seponering – kontrollgrunnlag

**Escitalopram med dråper helt til seponering (3 → 2 → 1 mg), og ellers «Komplett plan ikke tilgjengelig».** Grunnlag for uavhengig faglig kontroll av K1 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`, ny runde etter kontrollen av PR #323 03.11.2026.

**Ingen regel er godkjent eller aktivert.** Escitalopramregelen har fått versjon 13 som forslag: med dråper (1 mg per dråpe) kan forskriveren fra 3 mg velge et minste trinn på én dråpe, 3 → 2 → 1 mg, og fra 1 mg holdes dosen et helt trinn før seponering, med vurdering før hver endring og 7, 14 og 28 dager etter siste dose. Sluttdosen 1 mg, det minste trinnet og oppfølgingsdagene er OUSFARs forslag og åpne spørsmål til kontrolløren (K1.9, K1.10 og K1.12); de er ikke avklart eller godkjent av noen. Alle andre regler, også nortriptylin, amitriptylin og sertralin, er uendret. Motoren (#319) viser aldri en delplan: når en plan ikke når sluttmålet, står det «Komplett plan ikke tilgjengelig» og grunnen, uten doser. Sperrene og synligheten bare for administratorer er uendret, og verktøyet tilbyr i dag ingen beregning for reglene (kasus K1-19–K1-21).

For å vise hva verktøyet ville vist om nøyaktig disse versjonene ble godkjent, er planene under regnet på en kopi av hver regel med en simulert avklaring av de åpne valgene som foreslått og en simulert godkjenning («Simulert kontrollør (bare i kontrollgrunnlaget, ingen godkjenning)»), gjennom den samme veien som verktøysiden, som aldri viser en delplan, og med de norske preparatene i FEST-uttrekket hentet 30.10.2026. Kopien lagres ikke og brukes ikke av appen. Kasusene er syntetiske; pasientopplysninger inngår ikke, og ingen tekst fra Psychiatrienet vises.

**Kontrollørens avgrensning 03.11.2026 (ChatGPT):** Den sikre stoppen godtas, men K1 er ikke godtatt som produkt. Lag minst ett avgrenset, kildeforankret positivt klinisk forløp der det faktisk kan forsvares: definert startdose og behandlingshistorikk, små relative lavdosetrinn, dokumentert presisjon og administrasjon (også tablett ↔ dråper når aktuelt), symptomstyrt lengde og en særskilt vurdert siste dose → null. Laveste dose i preparatomtalen er ikke sluttgrensen, og algoritmen skal aldri finne opp oppmåling eller seponeringsgrense. Uten faglig og praktisk forsvarlig komplett plan: full stopp uten kopierbar delplan. Den globale sperren mot delplaner hører hjemme i motoren (#319). Lag positive og negative ende-til-ende-tester med faktiske norske preparater, og verifiser regelversjon og fingeravtrykk separat. Ingen av de fire K1-reglene er godkjent.

## 1. Regelversjonene til kontroll

Kontrolløren bes vurdere hver regel for nøyaktig versjonen og fingeravtrykket i tabellen, i det kliniske omfanget i avsnitt 10. «Tekniske hindringer» er det som ville stoppet en registrert godkjenning utenom selve kontrollen, som åpne valg uten avklaring.

| Regel | Versjon | Fingeravtrykk | Status i dag | Vurdert av kontrolløren | Tekniske hindringer for en godkjenning |
| --- | --- | --- | --- | --- | --- |
| `seponering-escitalopram` | 13 | `90d84e985c8fcbb98e1cd01f03a10b93ce3a3de0168e8c4401a168df2c69aa6d` | ikke ferdig kontrollert | **nei** | Regelen har åpne valg som må avklares faglig: plan.forlop[0].faser[0].strategi.minste_trinn.fra_mg (åpent forslag), plan.forlop[0].faser[0].strategi.minste_trinn.maks_prosent (åpent forslag), plan.forlop[0].faser[0].avslutning.fra_hoyst_mg (åpent forslag), plan.forlop[0].vurderinger[1].nar.dager (åpent forslag), plan.forlop[0].vurderinger[2].nar.dager (åpent forslag), plan.forlop[0].vurderinger[3].nar.dager (åpent forslag), fra.faser[0].avslutning (åpent forslag). |

## 2. Før en godkjenning kan registreres

- Kontrollen gjelder nøyaktig versjonen og fingeravtrykket i tabellen over. Regelen har åpne valg: sluttdosen, det minste trinnet (fra 3 mg, høyst 50 %) og dagene for oppfølging etter siste dose. De må avklares av kontrolløren før en godkjenning kan registreres; planene her er regnet som om de ble godtatt som foreslått.
- Peder har bedt om at kontrolløren avgjør sluttdosen. Ingen har godkjent 1 mg eller noen annen sluttdose på forhånd, og grensen «laveste døgndose i preparatomtalen» fra en tidligere runde brukes ikke.
- Avklaringene og godkjenningen registreres i en egen PR, med kontrollørens avgrensning. Endres regelen før det, stemmer ikke fingeravtrykket, og kontrollen må gjøres på nytt.
- Motoren (#319) har en global sperre: verktøysiden viser aldri en delplan, for noen regel. Nortriptylin, amitriptylin og sertralin trenger derfor ingen ny versjon for å gi «komplett plan ikke tilgjengelig».
- Sperrene for de kliniske verktøyene og synligheten bare for administratorer beholdes til verktøyene er klare for klinisk prøvebruk og Peder har godkjent åpning for vanlige brukere.

## 3. Spørsmål til kontrolløren

| # | Spørsmål | Anbefalt svar |
| --- | --- | --- |
| K1.9 | Sluttdose for escitalopram: er 1 mg (én dråpe), holdt et helt trinn (minst 28 dager som standard, lenger ved symptomer), en forsvarlig siste dose før seponering? Ingen registrert kilde angir en sluttdose. 1 mg er 5 % av 20 mg og 10 % av 10 mg; RCPsych beskriver at noen trenger å gå ned mot 2 % av opprinnelig dose, og at seponeringssymptomer kan komme uansett hvor lav dosen er. Doser under 1 mg krever fortynning, som ikke er dokumentert. | Kontrolløren avgjør. OUSFAR foreslår 1 mg fordi det er den laveste dosen dråpene gir uten fortynning, ikke fordi den er vist å være lav nok. Svarer kontrolløren nei, endres sluttdosen eller fjernes avslutningen, og escitalopram gir også «komplett plan ikke tilgjengelig». |
| K1.10 | Minste trinn: fra 3 mg er 3 → 2 mg en reduksjon på 33 % og 2 → 1 mg 50 %. Trinnene er større enn NICE-eksempelet på 25 % ved lav dose, og svaret på K1.6 var nei til et generelt større siste trinn på om lag 50 % som snarvei. Er ett minste trinn på én dråpe akseptabelt her, når det bare gjelder escitalopram dråper fra 3 mg eller lavere (der ingen mindre dose kan gis), forskriveren velger det aktivt, og tempoet styres av symptomer? | Ja, avgrenset slik. Det er ikke en snarvei: alle trinn over 3 mg er høyst 25 %, hvert minste trinn holdes minst like lenge som de andre og forlenges ved symptomer, og RCPsych bruker om lag 50 % per trinn som utgangspunkt ved middels risiko. Svarer kontrolløren nei, stopper planen på 3 mg med «komplett plan ikke tilgjengelig». |
| K1.11 | Overgang fra escitalopram tablett til dråper (K0-01): regelen sier nå at en pasient som bruker tabletter, kan gå over til dråper med samme døgndose i mg når planen starter. Grunnlaget er preparatomtalen for Cipralex 20 mg/ml dråper (DMP 07-4892, oppdatert 02.05.2024), registrert som kilden `dmp-cipralex-draper`: pkt. 2 (én dråpe er 1 mg) og pkt. 5.2 (dråpene er bioekvivalente med Cipralex tabletter). Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene. Er dette tilstrekkelig? | Ja, mg for mg, slik regelen sier det. Planen starter da med dråper fra døgndosen pasienten bruker (kasus K1-01). |
| K1.12 | Oppfølging etter siste dose: vurdering 7, 14 og 28 dager etter siste dose, i tillegg til vurderingen før hver endring. 7 og 14 dager bygger på preparatomtalen (symptomene kommer vanligvis de første dagene og går vanligvis over innen to uker); 28 dager er OUSFARs valg, fordi symptomene kan vare lenger og tilbakefall må vurderes. Er punktene riktige? | Ja, som minimum. Svaret på K1.4 var at 28 dager kan være ett oppfølgingspunkt, men ikke det eneste. |
| K1.13 | Escitalopram etter lang behandlingstid (10 % per trinn): dråpene gir hele milligram, så planen stopper på 9 mg (9 → 8 mg er 11 %), og verktøyet viser «komplett plan ikke tilgjengelig». Skal det være slik til en metode for mindre trinn er dokumentert? | Ja. Det minste trinnet gjelder bare fra 3 mg, og ingen dokumentert metode gir trinn på høyst 10 % under 10 mg. |
| K1.14 | Nortriptylin og amitriptylin (K0-03): tablettene er 10, 25 og 50 mg, og verken FEST eller preparatomtalene for 10 mg-tablettene (Noritren, DMP 0000-04957, oppdatert 20.06.2024; Sarotex, 0000-04327; Amitriptylin Orifarm, 17-11692; Amitriptylin Abcur, 16-11418) oppgir deling. Amitriptylin mikstur 10 mg/5 ml finnes bare med godkjenningsfritak, og måleskjeen gir 5 og 10 mg. Planene stopper derfor på 20 mg med «komplett plan ikke tilgjengelig». Finnes en dokumentert metode? | Nei, ikke i dag. Reglene er uendret (versjon 12), og verktøyet gir «komplett plan ikke tilgjengelig». |
| K1.15 | Sertralin (K0-02): tablettene er 25, 50 og 100 mg. Konsentratet til mikstur (Zoloft 20 mg/ml) har en gradert pipette, men preparatomtalen oppgir ikke graderingen, og konsentratet skal fortynnes. Kan konsentratet brukes når graderingen er dokumentert, og skal verktøyet kunne bruke en validert apotektilberedning? | Bare når graderingen og den minste dosen som kan måles, er dokumentert, eller en navngitt tilberedning har dokumentert styrke, holdbarhet og måleutstyr. Ingen av delene er dokumentert i dag, så sertralin gir «komplett plan ikke tilgjengelig». |

## 4. Kontrollørens krav 03.11.2026, og hva som er gjort

| Krav | Hva er gjort |
| --- | --- |
| Minst ett avgrenset, kildeforankret positivt forløp med små relative lavdosetrinn, dokumentert presisjon og administrasjon, symptomstyrt lengde og en særskilt vurdert siste dose → 0 | Escitalopram dråper fra 10 og 20 mg ved kort behandlingstid (kasus K1-01 og K1-02, avsnitt 5): trinn på høyst 25 % til 3 mg, så 3 → 2 → 1 mg med dråper på 1 mg, 1 mg et helt trinn og seponering. Vurdering før hver endring og 7, 14 og 28 dager etter siste dose. Sluttdosen og det minste trinnet er spørsmål K1.9 og K1.10. |
| Tablett ↔ dråper med eksakt ekvivalens og administrasjon | Preparatomtalen for dråpene er registrert som kilde (`dmp-cipralex-draper`); overgangen er mg for mg (K1.11, kasus K1-01). |
| Ingen oppfunnet oppmåling eller seponeringsgrense | Bare hele dråper; ingen fortynning, oppmåling eller apotektilberedning. Sluttdosen er et åpent forslag uten avklaring, ikke en grense noen har godkjent. |
| Ellers full stopp uten kopierbar delplan | Motorens globale sperre (#319). Lang behandlingstid, escitalopram tablett, nortriptylin, amitriptylin og sertralin gir «komplett plan ikke tilgjengelig» (kasus K1-06–K1-08 og K1-14–K1-18). |
| Positive og negative ende-til-ende-tester med norske preparater; versjon og fingeravtrykk separat | `src/__tests__/verktoyk1.test.ts`: kasusene her, alle planer i omfanget, og egne tester av versjon og fingeravtrykk. |

## 5. Kontrollørens svar på K1.1–K1.8 (03.11.2026)

| # | Spørsmålet | Svar | Hva det betyr nå |
| --- | --- | --- | --- |
| K1.1 | Seponering fra laveste døgndose i preparatomtalen | Nei | Brukes ikke. Sluttdosen er et eget, åpent spørsmål (K1.9). |
| K1.2 | Seponering fra den siste dosen som kan gis (nortriptylin 20 mg) | Nei | Nortriptylin og amitriptylin gir «komplett plan ikke tilgjengelig». |
| K1.3 | Siste dose et helt trinn før seponering | Ja, som standard, med varighet styrt av symptomer | 1 mg holdes et helt trinn og forlenges ved symptomer. |
| K1.4 | Vurdering 28 dager etter siste dose | Ett oppfølgingspunkt, ikke det eneste | Vurdering 7, 14 og 28 dager etter siste dose (K1.12). |
| K1.5 | Overgang fra escitalopram tablett til dråper | Dokumenter eksakt ekvivalens | Dokumentert mg for mg (K1.11). |
| K1.6 | Større siste trinn (om lag 50 %) | Nei, ikke generelt | Bare ett minste trinn på én dråpe fra 3 mg for escitalopram (K1.10). |
| K1.7 | Delplaner ved lang behandlingstid | Nei, delplaner er ikke et klinisk produkt | «Komplett plan ikke tilgjengelig» (K1.13). |
| K1.8 | Sertralin med grensen 25 mg | Nei | Ingen grense; sertralin gir «komplett plan ikke tilgjengelig» (K1.15). |

## 6. Hvilke forløp som er komplette

| Tilfelle | Resultat med versjon 13 | Kasus |
| --- | --- | --- |
| Escitalopram dråper 10 mg, kort behandlingstid (også pasient på 10 mg tabletter, overgang mg for mg) | Komplett: 8 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 197 | K1-01 (K0-01) |
| Escitalopram dråper 20 mg, kort behandlingstid | Komplett: 15 → 12 → 9 → 7 → 6 → 5 → 4 → 3 → 2 → 1 mg, seponert fra dag 281 | K1-02 |
| Escitalopram dråper 10 og 20 mg, lang behandlingstid | «Komplett plan ikke tilgjengelig»: stopper på 9 mg | K1-06, K1-07 |
| Escitalopram tablett 20 mg, kort behandlingstid | «Komplett plan ikke tilgjengelig»: stopper på 15 mg; dråper gir en komplett plan | K1-08 |
| Nortriptylin, amitriptylin (versjon 12) | «Komplett plan ikke tilgjengelig»: stopper på 20 mg | K1-14–K1-16 (K0-03) |
| Sertralin (versjon 12) | «Komplett plan ikke tilgjengelig»: stopper på 75 mg | K1-17, K1-18 (K0-02) |

Ved hvert trinn som ikke kan gis nøyaktig, tilbyr verktøyet nøyaktig én dose, så de to komplette planene er bestemt av startdosen. Den siste dosen over 0 er alltid 1 mg, og planen viser seponeringen og oppfølgingen etter siste dose.

## 7. Lave doser med norske preparater, og kildene

| Stoff | Hva som finnes | Hva som mangler for små trinn | Kilde |
| --- | --- | --- | --- |
| Escitalopram | Tabletter 5, 10 og 20 mg (10 og 20 mg kan deles i to). Dråper 20 mg/ml, én dråpe er 1 mg, bioekvivalente med Cipralex tabletter. | Under 1 mg krever fortynning, som ikke er dokumentert. Under 3 mg er trinnene over 25 % (K1.10). | FEST-uttrekket; dmp-cipralex; dmp-cipralex-draper (pkt. 2, 4.2, 4.4 og 5.2) |
| Nortriptylin | Tabletter 10, 25 og 50 mg. | Deling er ikke oppgitt i FEST eller preparatomtalen. Ingen flytende form (K1.14). | FEST-uttrekket; dmp-noritren |
| Amitriptylin | Tabletter 10, 25 og 50 mg. Mikstur 10 mg/5 ml og 50 mg/5 ml bare med godkjenningsfritak. | Deling er ikke oppgitt. Måleskjeen til miksturen på 10 mg/5 ml gir 2,5 og 5 ml, det vil si 5 og 10 mg (K1.14). | FEST-uttrekket; dmp-sarotex; preparatomtalen for Amitriptyline 10 mg/5 ml oral solution (Syri Limited, revidert 09.12.2025, pkt. 6.5) |
| Sertralin | Tabletter 25, 50 og 100 mg (noen 50 og 100 mg kan deles i to). Konsentrat til mikstur 20 mg/ml. | Pipetten er gradert, men graderingen er ikke oppgitt, og konsentratet skal fortynnes (K1.15). | FEST-uttrekket; dmp-zoloft; svensk preparatomtale for Zoloft konsentrat pkt. 6.5 og 6.6 |

Ingen tabeller fra Psychiatrienet er brukt eller konvertert. Ingen validert apotektilberedning er dokumentert.

## 8. Hva som er endret fra versjon 12 av escitalopramregelen

- Minste trinn (`strategi.minste_trinn`): fra 3 mg, når ingen dose innenfor valgområdet kan gis, kan forskriveren velge den nærmeste lavere dosen, med faktisk reduksjon høyst 50 %. Åpent forslag (K1.10).
- Avslutning (`avslutning`): fra 1 mg eller lavere holdes siste dose et helt trinn, og escitalopram seponeres etter en vurdering. Åpent forslag (K1.9).
- Laveste dose (`dosevalg.min_mg`): 1 mg, én dråpe (preparatomtalen pkt. 2).
- Vurderingspunkter: før hver doseendring, med preparatomtalen pkt. 4.2 som grunnlag, og 7, 14 og 28 dager etter siste dose (åpne forslag, K1.12).
- Fortolkningen: overgangen fra tablett til dråper mg for mg (K1.11), at nedtrappingen går til null og at symptomer kan komme uansett hvor lav dosen er, og usikkerheten om sluttdosen. Teksten om at planen ikke går til null er erstattet.
- Regneeksemplene er regnet på nytt: uten preparater stopper planen fra 20 mg på 1,13 mg, over sluttdosen, så den seponerer ikke; fra 10 mg ved lang behandlingstid på 2,82 mg.
- Det kliniske omfanget, trinnstørrelsene, trinnlengdene, spørsmålene og unntakene er uendret. Den langsomme varianten og alle andre regler er uendret; de godkjente reglene har samme fingeravtrykk som før.

## 9. Hvor nedtrappingen stopper med versjon 12

Hver startdose i det kliniske omfanget, regnet med versjonene forslaget bygger på og den samme simulerte godkjenningen, med forskriverens valg der et trinn ikke kan gis nøyaktig. Planene vises ikke i appen; tabellen viser bare hvor langt de dokumenterte metodene rekker.

| Regel | Tilfelle | Valg forskriveren gjør | Siste dose | Planutfall |
| --- | --- | --- | --- | --- |
| `seponering-amitriptylin` v12 | tablett, 25 mg, kort behandlingstid | 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` v12 | tablett, 50 mg, kort behandlingstid | 40 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 75 mg, kort behandlingstid | 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 100 mg, kort behandlingstid | 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 150 mg, kort behandlingstid | 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-amitriptylin` v12 | tablett, 50 mg, lang behandlingstid | – | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-amitriptylin` v12 | tablett, 75 mg, lang behandlingstid | 70 mg | 70 mg | Delplan, ikke en komplett plan. Ikke dekket: Amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-nortriptylin` v12 | tablett, 25 mg, kort behandlingstid | 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-nortriptylin` v12 | tablett, 50 mg, kort behandlingstid | 40 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-nortriptylin` v12 | tablett, 150 mg, kort behandlingstid | 120 mg, 100 mg, 60 mg, 35 mg, 30 mg, 25 mg, 20 mg | 20 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-nortriptylin` v12 | tablett, 50 mg, lang behandlingstid | – | 45 mg | Delplan, ikke en komplett plan. Ikke dekket: Nortriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | tablett, 20 mg, kort behandlingstid | – | 15 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 10 mg, kort behandlingstid | 8 mg, 5 mg, 4 mg | 3 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 20 mg, kort behandlingstid | 12 mg, 7 mg, 6 mg, 5 mg, 4 mg | 3 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 10 mg, lang behandlingstid | – | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-escitalopram` v12 | dråper, oppløsning, 20 mg, lang behandlingstid | 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | 9 mg | Delplan, ikke en komplett plan. Ikke dekket: Escitalopram: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |
| `seponering-sertralin` v12 | tablett, 100 mg, kort behandlingstid | – | 75 mg | Delplan, ikke en komplett plan. Ikke dekket: Sertralin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. |
| `seponering-sertralin` v12 | tablett, 200 mg, kort behandlingstid | 125 mg, 100 mg | 75 mg | Delplan, ikke en komplett plan. Ikke dekket: Sertralin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. |

## 10. Reglene

### Seponering av escitalopram, gjentatt prosentvis nedtrapping

`seponering-escitalopram`, versjon 13. Hele regelen med parametre og regneeksempler står i `docs/verktøy-p7-regelutkast.md`.

**Det som følger direkte av kildene:**

- Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Hos eldre over 65 år, ved mild eller moderat nedsatt leverfunksjon og hos kjente langsomme CYP2C19-metaboliserere er høyeste dose 10 mg daglig.
  - Eldre over 65 år: start 5 mg; kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Mild eller moderat nedsatt leverfunksjon: start 5 mg, kan økes til 10 mg daglig. Alvorlig nedsatt: forsiktighet og ekstra omhyggelig dosetitrering. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
  - Kjent langsom CYP2C19-metaboliserer: start 5 mg, kan økes til 10 mg daglig. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
- To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
  - Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Which plan should I follow?)*
- Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.21)*
- Nedtrappingen går trinnvis helt til null; noen trenger svært lave doser før de slutter, og seponeringssymptomer kan komme når legemidlet stoppes, uansett hvor lav dosen er.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
  - Uansett hvor lav dosen er blitt, kan seponeringssymptomer komme når legemidlet stoppes helt; da kan det være nødvendig å starte igjen med en lav dose en tid før nedtrappingen fortsetter. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i måneder.
  - Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare to til tre måneder eller mer. Legemidlet bør trappes gradvis ned over uker eller måneder etter pasientens behov. *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 4.4)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR trapper ned med 25 % av aktuell dose (10 % etter lang behandlingstid) (forskriveren kan velge 5–50 %; begrunnelse kreves over 25 % og over 10 % ved lang behandlingstid), høyst 25 % fra 5 mg, med minst 28 dager per trinn (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager; begrunnelse kreves under 28 dager ved lang behandlingstid). Med dråper på 1 mg per dråpe kan forskriveren fra 3 mg velge et minste trinn på høyst 50 % når ingen dose innenfor valgområdet kan gis, ned til 1 mg. Når planen har nådd 1 mg eller lavere, holdes siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Når planen ikke når dit, er den ikke komplett, og verktøyet viser ingen doser. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), How should I gradually reduce my dose?)*
- Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
  - Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), Examples of tapering plans)*
- Med dråper på 1 mg per dråpe kan forskriveren fra 3 mg velge et minste trinn på høyst 50 % når ingen dose innenfor valgområdet kan gis, ned til 1 mg. Når planen har nådd 1 mg eller lavere, holdes siste dose et helt trinn, og escitalopram seponeres deretter, først når forskriveren ved vurderingen har funnet at dosen er tolerert uten plagsomme seponeringssymptomer. Når planen ikke når dit, er den ikke komplett, og verktøyet viser ingen doser. Dagene er tidligste tidspunkt; utsettes et trinn, forskyves resten.
  - Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), When and how should I stop my antidepressants?)*
- Regelen gjelder fra dosen pasienten faktisk bruker, opp til høyeste døgndose for voksne i preparatomtalen; over den stopper beregningen, og en begrunnelse kan ikke overstyre det. Innenfor den gjelder preparatomtalens grenser for eldre, indikasjoner og nedsatt organfunksjon: en uttrykkelig høyeste dose stopper, en forsiktighetsgrense krever begrunnelse. En dose ellers utenfor rammen krever et ja og en begrunnelse, og organfunksjon og interaksjoner må være vurdert for alle stoffer. *(OUSFARs vurdering)*
- Under 18 år, ved akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller behov for rask seponering, ved ustabil dose, uregelmessig inntak eller bytte, og ved kontraindikasjoner stopper den ordinære planleggingen; nedtrappingen må da planlegges individuelt. *(OUSFARs vurdering)*
- Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.
  - Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist. *([dmp-cipralex](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2002-00713.pdf), pkt. 4.2)*
- En pasient som bruker escitalopram tabletter, kan gå over til dråper med samme døgndose i mg når planen starter: én dråpe er 1 mg, og dråpene er bioekvivalente med Cipralex tabletter. Planen med dråper regnes da fra døgndosen pasienten bruker. Generiske tabletter er godkjent mot Cipralex tabletter, men ikke sammenlignet direkte med dråpene.
  - Hver dråpe inneholder 1 mg escitalopram (20 mg/ml). *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 2)*
  - Dråpene er bioekvivalente med Cipralex tabletter. *([dmp-cipralex-draper](https://produktinformasjon.legemiddelsok.no/preparatomtaler/07-4892.pdf), pkt. 5.2)*

**Betingelser:**

- Må bekreftes (`startforslag`): Planen er et startforslag, ikke en forhåndsgodkjenning av alle reduksjonene: hvert trinn forutsetter en ny vurdering av toleransen, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Ved revurdering, eller når dosen, trinnstørrelsen eller strategien endres, beregnes en ny plan fra dosen pasienten faktisk bruker. (nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21; rcpsych-stopping How should I gradually reduce my dose?; rcpsych-stopping How should I gradually reduce my dose?)
- Må bekreftes (`organfunksjon_interaksjoner`): Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok:** Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff. (bygger på nice-ng222 anbefaling 1.4.16))
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene:** NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager. (bygger på nice-ng222 anbefaling 1.4.15; nice-ng222 anbefaling 1.4.21; rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans))
- Unntak (`under_18`): Pasienten er under 18 år. Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** NICE NG222 og preparatomtalene reglene bygger på, gjelder voksne; pediatrisk bruk må vurderes for seg. (bygger på nice-ng222 tittel og omfang))
- Unntak (`akutt_situasjon`): Pasienten har en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trenger av andre grunner rask seponering. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Ved alvorlige medisinske forhold kan raskere eller umiddelbar seponering være nødvendig; da er en langsom standardplan ikke nødvendigvis riktig. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.21))
- Unntak (`ustabil_dose_eller_bytte`): Dosen er ikke stabil, pasienten tar legemidlet uregelmessig, eller seponeringen er del av et bytte til et annet legemiddel. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7: under 18 år, akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon, behov for rask seponering, ustabil dose, uregelmessig inntak og legemiddelbytte stopper ordinær planlegging:** Beregningen forutsetter et kjent, stabilt daglig doseringsregime; bytte og uregelmessig eksponering kan kreve egne modeller. (bygger på nice-ng222 anbefaling 1.4.16; nice-ng222 anbefaling 1.4.16))
- Unntak (`qt_forlengelse`): Pasienten har kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker et annet legemiddel som forlenger QT-intervallet. Det er en kontraindikasjon i preparatomtalen; en generell begrunnelse kan ikke overstyre den, og nedtrappingen må planlegges individuelt. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Substanskontrollen 30.10.2026, Beslutning 7 og 8: kontraindikasjoner kan ikke overstyres med en generell begrunnelse:** Preparatomtalen oppgir forholdet som en kontraindikasjon; ordinær planlegging stoppes i stedet for å kreve en begrunnelse. (bygger på dmp-cipralex pkt. 4.3))
- Må besvares (`lang_behandlingstid`): Har pasienten brukt legemidlet i mange måneder eller lenger? (rcpsych-stopping If you have been taking antidepressants for longer; rcpsych-stopping Examples of tapering plans; rcpsych-stopping When and how should I stop my antidepressants?; nice-ng222 anbefaling 1.4.16)
- Må besvares (`eldre`): Er pasienten over 65 år? (dmp-cipralex pkt. 4.2)
- Må besvares (`nedsatt_leverfunksjon`): Har pasienten nedsatt leverfunksjon? Et ja krever en skriftlig begrunnelse. (dmp-cipralex pkt. 4.2)
- Må besvares (`langsom_cyp2c19`): Er pasienten kjent langsom metaboliserer av CYP2C19? (dmp-cipralex pkt. 4.2)
- Må besvares (`utenfor_doseramme`): Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel ved nedsatt organfunksjon, utover det spørsmålene om pasientgruppe og indikasjon dekker? Et ja krever en skriftlig begrunnelse. (**OUSFAR-vurdering, avklart 30.10.2026 av ChatGPT (uavhengig kontrollør) (versjon 11): Fagkontrollen 30.10.2026, Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering:** Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent. (bygger på dmp-cipralex pkt. 4.2))

**Klinisk omfang** (en godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring):

- 20 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 5, 10 og 20 mg
- 10 og 20 mg, FEST-legemiddelform 748, med nei på alle spørsmålene, styrker (fra) 1 mg
- 10 og 20 mg, FEST-legemiddelform 748, ved lang behandlingstid og nei på de andre spørsmålene, reduksjon per trinn (% av aktuell dose) 10 %, styrker (fra) 1 mg

## 11. Alle planer i det kliniske omfanget

Hver startdose i hvert tilfelle i reglenes kliniske omfang, med hver plan forskriverens valg kan gi: ved hvert trinn som ikke kan gis nøyaktig, er hver dose som tilbys, fulgt. I alle 20 valgene tilbys nøyaktig én dose, så hver startdose gir én plan. Radene er slik planen og kopien av den ville stått om delplaner ble vist; dagene er minstetider, og hvert trinn forutsetter en ny vurdering.

| Regel | Tilfelle | Planer | Reduksjoner | Valg forskriveren gjør | Siste dose | Planutfall |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-escitalopram` | tablett, 20 mg, kort behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, kort behandlingstid | 1 | 7 | 5 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 197. |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, kort behandlingstid | 1 | 10 | 7 | 1 mg | Komplett plan til sluttmålet: Escitalopram seponert fra dag 281. |
| `seponering-escitalopram` | dråper, oppløsning, 10 mg, lang behandlingstid | 1 | 0 | 0 | – | ingen plan |
| `seponering-escitalopram` | dråper, oppløsning, 20 mg, lang behandlingstid | 1 | 0 | 8 | – | ingen plan |

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: tablett, 20 mg, kort behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg).

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, kort behandlingstid

- Kan velges for trinn 1 (dag 1, beregnet 7,5 mg, fra 10 mg): 8 mg (−20 %). Valgt: 8 mg.
- Kan velges for trinn 3 (dag 57, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 4 (dag 85, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 6 (dag 141, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 7 (dag 169, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 197.**

- Dag 1–28: Escitalopram peroralt: 8 mg = 8 dråper à 1 mg (valgt av forskriveren (beregnet 7,5 mg; −20 %))
- Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg
- Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 197: Escitalopram peroralt: Seponert
- Dag 203: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 210: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 224: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, kort behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 11,25 mg, fra 15 mg): 12 mg (−20 %). Valgt: 12 mg.
- Kan velges for trinn 4 (dag 85, beregnet 6,75 mg, fra 9 mg): 7 mg (−22,22 %). Valgt: 7 mg.
- Kan velges for trinn 5 (dag 113, beregnet 5,25 mg, fra 7 mg): 6 mg (−14,29 %). Valgt: 6 mg.
- Kan velges for trinn 6 (dag 141, beregnet 4,5 mg, fra 6 mg): 5 mg (−16,67 %). Valgt: 5 mg.
- Kan velges for trinn 7 (dag 169, beregnet 3,75 mg, fra 5 mg): 4 mg (−20 %). Valgt: 4 mg.
- Kan velges for trinn 9 (dag 225, beregnet 2,25 mg, fra 3 mg): 2 mg (−33,33 %). Valgt: 2 mg.
- Kan velges for trinn 10 (dag 253, beregnet 1,5 mg, fra 2 mg): 1 mg (−50 %). Valgt: 1 mg.

**Komplett plan til sluttmålet: Escitalopram seponert fra dag 281.**

- Dag 1–28: Escitalopram peroralt: 15 mg = 15 dråper à 1 mg
- Dag 29: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 29–56: Escitalopram peroralt: 12 mg = 12 dråper à 1 mg (valgt av forskriveren (beregnet 11,25 mg; −20 %))
- Dag 57: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 57–84: Escitalopram peroralt: 9 mg = 9 dråper à 1 mg
- Dag 85: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 85–112: Escitalopram peroralt: 7 mg = 7 dråper à 1 mg (valgt av forskriveren (beregnet 6,75 mg; −22,22 %))
- Dag 113: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 113–140: Escitalopram peroralt: 6 mg = 6 dråper à 1 mg (valgt av forskriveren (beregnet 5,25 mg; −14,29 %))
- Dag 141: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 141–168: Escitalopram peroralt: 5 mg = 5 dråper à 1 mg (valgt av forskriveren (beregnet 4,5 mg; −16,67 %))
- Dag 169: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 169–196: Escitalopram peroralt: 4 mg = 4 dråper à 1 mg (valgt av forskriveren (beregnet 3,75 mg; −20 %))
- Dag 197: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 197–224: Escitalopram peroralt: 3 mg = 3 dråper à 1 mg
- Dag 225: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 225–252: Escitalopram peroralt: 2 mg = 2 dråper à 1 mg (valgt av forskriveren (beregnet 2,25 mg; −33,33 %))
- Dag 253: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Dag 253–280: Escitalopram peroralt: 1 mg = 1 dråpe à 1 mg (valgt av forskriveren (beregnet 1,5 mg; −50 %))
- Dag 281: Vurdering (Escitalopram): Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet.
- Fra dag 281: Escitalopram peroralt: Seponert
- Dag 287: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose.
- Dag 294: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose.
- Dag 308: Vurdering (Escitalopram): Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 10 mg, lang behandlingstid

Ingen trinn krever forskriverens valg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg).

#### Seponering av escitalopram, gjentatt prosentvis nedtrapping: dråper, oppløsning, 20 mg, lang behandlingstid

- Kan velges for trinn 2 (dag 29, beregnet 16,2 mg, fra 18 mg): 17 mg (−5,56 %). Valgt: 17 mg.
- Kan velges for trinn 3 (dag 57, beregnet 15,3 mg, fra 17 mg): 16 mg (−5,88 %). Valgt: 16 mg.
- Kan velges for trinn 4 (dag 85, beregnet 14,4 mg, fra 16 mg): 15 mg (−6,25 %). Valgt: 15 mg.
- Kan velges for trinn 5 (dag 113, beregnet 13,5 mg, fra 15 mg): 14 mg (−6,67 %). Valgt: 14 mg.
- Kan velges for trinn 6 (dag 141, beregnet 12,6 mg, fra 14 mg): 13 mg (−7,14 %). Valgt: 13 mg.
- Kan velges for trinn 7 (dag 169, beregnet 11,7 mg, fra 13 mg): 12 mg (−7,69 %). Valgt: 12 mg.
- Kan velges for trinn 8 (dag 197, beregnet 10,8 mg, fra 12 mg): 11 mg (−8,33 %). Valgt: 11 mg.
- Kan velges for trinn 9 (dag 225, beregnet 9,9 mg, fra 11 mg): 10 mg (−9,09 %). Valgt: 10 mg.

**Ingen plan vises** (stopp):

- Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg).

## 12. Syntetiske testkasus

Kasusene går gjennom den samme veien som verktøysiden, som aldri viser en delplan, og kjøres i testene (`src/__tests__/verktoyk1.test.ts`). De viser de komplette planene, at hver plan som ikke når seponering, stopper uten doser, grensene for omfanget, at verktøyet i dag ikke tilbyr beregning, og at en endret regel eller et endret preparat stopper planen. Kolonnen K0 viser kasuset i leveranseplanen hvert kasus svarer på. Uten annen merknad er regelen den simulert godkjente kopien (for escitalopram versjon 13 med de åpne valgene simulert avklart som foreslått), organfunksjon og interaksjoner er bekreftet, og svaret er nei på alle unntak og spørsmål.

| ID | K0 | Hva | Regel | Forventet | Resultat |
| --- | --- | --- | --- | --- | --- |
| K1-01 | K0-01 | escitalopram 10 mg, kort behandlingstid; pasienten bruker tabletter og går over til dråper med samme døgndose; forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg, 1 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 8 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 6 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 5 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 4 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 3 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 2 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 1 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-02 | – | escitalopram dråper 20 mg, kort behandlingstid; forskriveren velger 12 mg, 7 mg, 6 mg, 5 mg, 4 mg, 2 mg, 1 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Plan: 15 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 12 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 9 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 7 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 6 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 5 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 4 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 3 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 2 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → 1 mg → Før endringen: Vurder seponeringssymptomer og tegn på tilbakefall. Reduser dosen eller seponer først når eventuelle symptomer er borte eller tålelige; til da forlenges trinnet. → Seponert → Vurder seponeringssymptomer og tegn på tilbakefall 7 dager etter siste dose. → Vurder seponeringssymptomer og tegn på tilbakefall 14 dager etter siste dose. → Vurder seponeringssymptomer og tegn på tilbakefall 28 dager etter siste dose.. | som forventet |
| K1-03 | – | escitalopram dråper 10 mg, før forskriveren har valgt | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: escitalopram dag 1–28: den ideelle dosen 7,5 mg kan ikke gis med preparatene i FEST nøyaktig. Tilbyr 8 mg for neste trinn. | som forventet |
| K1-04 | – | escitalopram dråper 10 mg, valgt ned til 3 mg: minste trinn til 2 mg tilbys; forskriveren velger 8 mg, 5 mg, 4 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 3 mg). Tilbyr 2 mg for neste trinn. | som forventet |
| K1-05 | – | escitalopram dråper 10 mg, valgt ned til 2 mg: minste trinn til 1 mg tilbys; forskriveren velger 8 mg, 5 mg, 4 mg, 2 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 2 mg). Tilbyr 1 mg for neste trinn. | som forventet |
| K1-06 | – | escitalopram dråper 20 mg, lang behandlingstid; forskriveren velger 17 mg, 16 mg, 15 mg, 14 mg, 13 mg, 12 mg, 11 mg, 10 mg | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg). | som forventet |
| K1-07 | – | escitalopram dråper 10 mg, lang behandlingstid | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 9 mg). | som forventet |
| K1-08 | – | escitalopram tablett 20 mg, kort behandlingstid | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: escitalopram: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene, og regelens avslutning gjelder bare fra 1 mg eller lavere (planen står på 15 mg). | som forventet |
| K1-09 | K0-01 | escitalopram tablett 10 mg, kort behandlingstid (utenfor omfanget; dråper i K1-01) | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 10 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-10 | – | escitalopram dråper 15 mg, kort behandlingstid (omfanget er ikke utvidet) | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 15 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-11 | – | escitalopram dråper 3 mg som startdose (det minste trinnet gir ingen nye startdoser) | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 3 mg med disse svarene og denne legemiddelformen er ikke et tilfelle godkjenningen kan gjelde for (utenfor omfanget). | som forventet |
| K1-12 | – | escitalopram dråper 20 mg, 65 år eller eldre | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Startdosen 20 mg er utenfor det regelen gjelder for (høyst 10 mg ved eldre over 65 år) (utenfor omfanget). | som forventet |
| K1-13 | – | escitalopram dråper 20 mg, tidligere seponeringssymptomer | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen. | som forventet |
| K1-14 | – | nortriptylin 50 mg, kort behandlingstid; forskriveren velger 40 mg, 25 mg, 20 mg | seponering-nortriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: nortriptylin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-15 | K0-03 | amitriptylin 25 mg, kort behandlingstid; forskriveren velger 20 mg | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: amitriptylin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-16 | – | amitriptylin 50 mg, kort, før forskriveren har valgt | seponering-amitriptylin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: amitriptylin dag 1–28: den ideelle dosen 37,5 mg kan ikke gis med preparatene i FEST nøyaktig. Tilbyr 40 mg for neste trinn. | som forventet |
| K1-17 | K0-02 | sertralin tablett 100 mg, kort behandlingstid | seponering-sertralin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: sertralin: én mulig reduksjon med revurdering; neste trinn kan ikke gis med preparatene. | som forventet |
| K1-18 | – | sertralin tablett 200 mg, kort behandlingstid; forskriveren velger 125 mg, 100 mg | seponering-sertralin (simulert klinisk godkjenning av versjon 12, bare på en kopi) | Ingen plan: Komplett plan ikke tilgjengelig: sertralin: neste trinn kan ikke gis med preparatene; avslutning vurderes individuelt. | som forventet |
| K1-19 | K0-01 | escitalopram slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (til kontroll). | som forventet |
| K1-20 | K0-03 | amitriptylin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| K1-21 | K0-02 | sertralin slik verktøyet er i dag | den verktøyet tilbyr i dag | Verktøyet tilbyr ingen beregning (ikke godkjent). | som forventet |
| K1-22 | – | escitalopram dråper 10 mg, godkjent uten at de åpne valgene er avklart, med valgene fra K1-01 | seponering-escitalopram (simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Regelen har åpne valg som må avklares faglig. | som forventet |
| K1-23 | – | escitalopram dråper 10 mg med sluttdosen endret til 2 mg etter godkjenningen, med valgene fra K1-01 | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi; deretter sluttdosen 1 → 2 mg) | Ingen plan: Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke). | som forventet |
| K1-24 | – | escitalopram dråper 10 mg, dråpene avregistrert | seponering-escitalopram (simulert avklaring av de åpne valgene og simulert klinisk godkjenning av versjon 13, bare på en kopi) | Ingen plan: Ingen av de perorale preparatene av escitalopram i FEST kan brukes med valgene som er gjort er avregistrert i FEST. | som forventet |
