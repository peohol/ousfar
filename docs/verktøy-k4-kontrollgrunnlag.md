# OUSFAR Verktøy – K4: kontrollgrunnlag for kombinasjon av stemningsstabiliserende

> Generert av `npm run verktoy:regler -- tilleggsgrunnlag` fra `src/verktoy/tilleggsgrunnlag.ts`. Ikke rediger for hånd; testene sier fra når rapporten ikke er oppdatert.

Kasusene går den samme veien som verktøysiden, med preparatene i det lagrede FEST-uttrekket. **Reglene er ikke godkjent.** Kasusene med «simulert godkjenning» viser hva verktøyet ville vist om nøyaktig versjonen og fingeravtrykket under ble godkjent; kopien lagres aldri og går aldri til appen. Kasusene er syntetiske, uten pasientopplysninger. Selve reglene, kildene og fakta står i `docs/verktøy-k4-tillegg.md`.

FEST-uttrekket: `src/data/verktoy/fest-tillegg.json` (hentet 2026-11-03T16:53:31.770Z, kontrollert 2026-11-03T04:15:06.046601+00:00).

## Versjonene under kontroll

| Regel | Versjon | Fingeravtrykk |
| --- | --- | --- |
| `tillegg-valproat-lamotrigin` | 2 | `ca32dfe6497ef150ea5ce0a09ea1f504274e7daa63fc3860ffe9f103de124467` |
| `tillegg-litium-lamotrigin` | 2 | `0957451ee2d5edf0954541712cb5ef272a3966c096828810643a72ebf6cf9922` |

## Kontrollspørsmål

| Nr. | Spørsmål | OUSFARs anbefaling |
| --- | --- | --- |
| K4.1 | Er opptrappingene og måldosene gjengitt riktig fra tabell 3 i Lamictal-preparatomtalen (valproat: 25 mg annenhver dag i 14 dager, 25 mg i 14 dager, 50 mg i 7 dager, 100 mg; uten valproat og induserende legemidler: 25, 50 og 100 mg, så 200 mg)? | Ja; dosene er hentet direkte fra tabellen, og planen går ikke over dem. |
| K4.2 | Forskriveren må nå velge måldosen, og regelen gjelder bare preparatomtalens vanlige første stabiliserende måldose (100 mg med valproat, 200 mg ellers); et annet mål stopper (K4-22, K4-40), og videre justering er et vurderingspunkt som ikke beregnes. Er planen da riktig betegnet som komplett til det valgte målet? | Ja; preparatomtalen kaller dem vanlige måldoser og sier at måldosen avhenger av klinisk respons. Etter kontrollen 03.11.2026 er målet gjort til et eksplisitt valg i stedet for en skjult forutsetning. |
| K4.3 | Skal planen bare bruke Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), siden vanlige lamotrigintabletter i FEST krever godkjenningsfritak? | Ja; alle dosene kan gis med hele dispergerbare tabletter. |
| K4.4 | Er unntakene (under 18 år, tidligere alvorlig reaksjon, lamotrigin i bruk eller nylig avsluttet, moderat/alvorlig leversvikt, betydelig nyresvikt, graviditet/amming, HLA-B*1502) og bekreftelsene riktige og tilstrekkelige som stopp? | Ja, som en forsiktig første avgrensning; hver av dem har en egen dosering eller vurdering i preparatomtalen som regelen ikke beregner. |
| K4.5 | Unntaket for nylig avsluttet lamotrigin oppgir ca. 7 og ca. 15 døgn (fem gjennomsnittlige halveringstider, alene og med valproat, fra pkt. 5.2). Er det forsvarlig å vise disse omtrentlige tallene? | Ja, som veiledning i teksten; regelen bruker dem ikke i beregningen. |
| K4.6 | Etter kontrollen 03.11.2026 må forskriveren svare på om pasienten kan bli gravid. Ved ja må fire vilkår i det graviditetsforebyggende programmet bekreftes hver for seg (indikasjon og årlig spesialistvurdering, informasjon og risikoskjema, sikker prevensjon, graviditetstest og kontakt ved graviditet); hvert som mangler, stopper (K4-14, K4-26–K4-29). Graviditet, planlagt graviditet og amming stopper uansett, også når vilkårene er bekreftet. Er vilkårene og formuleringene riktige og tilstrekkelige? | Ja; de følger vilkårene i pkt. 4.4 i Orfiril-preparatomtalen, gjelder ikke menn, og et ja løser aldri en graviditet. |
| K4.7 | Litiumdosen oppgis i mg litium (Li⁺) som på Lithionit 42 mg (6 mmol per tablett), og regelen gjelder bare hele Lithionit 42 mg-tabletter fra 1 til 10 tabletter daglig (den høyeste veiledende vedlikeholdsdosen); andre doser og andre litiumpreparater stopper (K4-36–K4-39). Er avgrensningen og enhetsangivelsen riktig? | Ja; den fjerner forvekslingen mellom mg Li⁺ og mg litiumsalt og hindrer en dose som ikke kan gis med Lithionit. |
| K4.8 | Opptrappingen er den samme ved østrogenholdig prevensjon eller behandling, men forskriveren må svare på det, og et ja krever en skriftlig vurdering av måldosen fordi vedlikeholdsdosen kan måtte bli opptil dobbelt så høy (K4-23–K4-25). I tillegg står det som vurderingspunkt ved måldosen. Er det tilstrekkelig? | Ja; preparatomtalen endrer ikke opptrappingen, men sier at vedlikeholdsdosen kan måtte økes. |

## Ikke dekket

- Karbamazepin → lamotrigin (og andre induserende legemidler): preparatomtalen har en egen opptrapping der døgndoser fra 100 mg skal fordeles på to doser; fordelingen per trinn er ikke modellert ennå.
- Aripiprazol, olanzapin, gabapentin og topiramat → lamotrigin: samme opptrapping som med litium etter tabell 6, men hvert par må vurderes for seg før det legges til.
- Kvetiapin, risperidon og ziprasidon → lamotrigin: interaksjonen er ikke beskrevet i tabell 6; preparatomtalen sier da at opptrappingen for samtidig valproat skal brukes. Ikke laget.
- Lamotrigin → valproat (motsatt retning): lamotrigindosen skal halveres når valproat legges til (tabell 5), men opptrappingen av valproat er ikke vurdert. Ikke laget.
- Valproatdosen kontrolleres ikke: Orfiril-preparatomtalen fastsetter den individuelt etter respons og gir ikke noe område, og valproatpreparatene har mange styrker og flytende former. Planen gjentar den innfylte dosen, og forskriveren bekrefter at det er pasientens aktuelle dose i mg slik styrken står på preparatet. Litiumdosen kontrolleres mot hele Lithionit 42 mg-tabletter (K4-36–K4-39).
- Andre litiumpreparater enn Lithionit 42 mg (Lithionit 83 mg, Carblit og preparater med godkjenningsfritak, der styrken kan være oppgitt som mg litiumsalt): utenfor regelen til enhet og styrke er vurdert for hvert preparat.
- En annen måldose enn preparatomtalens første stabiliserende måldose: videre opptrapping etter klinisk respons beregnes ikke (K4-22, K4-40).
- Alle andre par i Combining Moodstabilizers (110 i alt): ingen kildeforankret regel ennå.

## Kasusene

**36 kasus.** Alle utfallene er som forventet.

| Kasus | Regel | Kategori | Hva | Dose | Utfall |
| --- | --- | --- | --- | --- | --- |
| K4-01 | `tillegg-valproat-lamotrigin` | Regler som ikke er godkjent | regelen er til faglig kontroll; ingen plan i appen | «1000» | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |
| K4-02 | `tillegg-litium-lamotrigin` | Regler som ikke er godkjent | regelen er til faglig kontroll; ingen plan i appen | «168» | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |
| K4-10 | `tillegg-valproat-lamotrigin` | Vanlig dose innenfor det godkjente omfanget | hele opptrappingen med valproat | «1000» | plan (12 rader) |
| K4-11 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | pasienten er under 18 år | «1000» | stopp: Regelen gjelder ikke: Pasienten er under 18 år. |
| K4-12 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | tidligere utslett på lamotrigin | «1000» | stopp: Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. |
| K4-13 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | graviditet er ikke vurdert (ubesvart) | «1000» | stopp: Må avklares før beregning (ukjent): Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres. |
| K4-14 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | kan bli gravid, og alle vilkårene i det graviditetsforebyggende programmet er bekreftet hver for seg | «1000» | plan (12 rader) |
| K4-26 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | kan bli gravid, men sikker prevensjon er ikke bekreftet | «1000» | stopp: Må bekreftes før beregning: Pasienten bruker sikker prevensjon uten avbrudd: minst én sikker, helst brukeruavhengig metode (som spiral eller implantat), eller to komplementære metoder med en barrieremetode. |
| K4-27 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | det er ikke besvart om pasienten kan bli gravid | «1000» | stopp: Må besvares før beregning: Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. |
| K4-28 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | kan bli gravid og alle vilkårene er bekreftet, men pasienten planlegger graviditet: stopper, vilkårene løser ikke det | «1000» | stopp: Regelen gjelder ikke: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres. |
| K4-29 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | kan ikke bli gravid: vilkårene i programmet spørres ikke etter | «1000» | plan (12 rader) |
| K4-15 | `tillegg-valproat-lamotrigin` | Uvanlige doser og grenseverdier | ingen dose av valproat er fylt inn | «» | mangler: Aktuell døgndose må fylles inn som et tall større enn 0. |
| K4-16 | `tillegg-valproat-lamotrigin` | Foreldet FEST | FEST-kopien er 49 timer gammel | «1000» | stopp: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| K4-17 | `tillegg-valproat-lamotrigin` | Utilgjengelige eller endrede preparater | alle lamotriginpreparatene krever godkjenningsfritak | «1000» | stopp: Ingen av de perorale preparatene av lamotrigin i FEST kan brukes: Lamictal tyggetab/disperg tab 5 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 200 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 100 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 25 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 2 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 50 mg: krever godkjenningsfritak, som ikke er valgt. |
| K4-18 | `tillegg-valproat-lamotrigin` | Utilgjengelige eller endrede preparater | Lamictal 25 mg er midlertidig utgått: 25 mg annenhver dag kan ikke gis, og planen stopper i stedet for å velge en annen dose | «1000» | stopp: lamotrigin dag 1–14: den ideelle dosen 25 mg annenhver dag kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg. Nærmeste doser som kan settes sammen: 20 mg (-20 %) og 50 mg (+100 %). En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. |
| K4-19 | `tillegg-valproat-lamotrigin` | Endret regel eller regelversjon | regelen er endret etter godkjenningen (måldose 150 mg) | «1000» | stopp: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| K4-20 | `tillegg-valproat-lamotrigin` | Uvanlige doser og grenseverdier | høyeste dose sammen med valproat: en plan over 200 mg stopper (godkjenningen simulert for den endrede kopien) | «1000» | stopp: lamotrigin fra dag 36: den ideelle dosen 250 mg kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg. Nærmeste doser som kan settes sammen: 225 mg (-10 %) og 275 mg (+10 %). En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. |
| K4-22 | `tillegg-valproat-lamotrigin` | Uvanlige doser og grenseverdier | forskriveren velger 200 mg som mål: regelen trapper bare opp til den første stabiliserende måldosen | «1000» | stopp: Måldosen 200 mg er utenfor det regelen gjelder for (100 mg). |
| K4-23 | `tillegg-valproat-lamotrigin` | Interaksjonssperrer | østrogenholdig prevensjon uten skriftlig vurdering av måldosen | «1000» | stopp: Svaret ja (østrogenholdig prevensjon eller behandling, som kan kreve en høyere vedlikeholdsdose av lamotrigin enn måldosen; måldosen krever en særskilt vurdering) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer. |
| K4-24 | `tillegg-valproat-lamotrigin` | Interaksjonssperrer | østrogenholdig prevensjon med skriftlig vurdering av måldosen | «1000» | plan (12 rader) |
| K4-25 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | spørsmålet om østrogenholdig behandling er ubesvart | «1000» | stopp: Må besvares før beregning: Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? |
| K4-21 | `tillegg-valproat-lamotrigin` | Nødstoppen | verktøyet er deaktivert med nødstoppen | «1000» | deaktivert med nødstoppen |
| K4-30 | `tillegg-litium-lamotrigin` | Vanlig dose innenfor det godkjente omfanget | hele opptrappingen med litium | «168» | plan (12 rader) |
| K4-31 | `tillegg-litium-lamotrigin` | Interaksjonssperrer | pasienten bruker også karbamazepin | «168» | stopp: Regelen gjelder ikke: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping. |
| K4-32 | `tillegg-litium-lamotrigin` | Interaksjonssperrer | pasienten bruker et legemiddel med ukjent interaksjon med lamotrigin | «168» | stopp: Regelen gjelder ikke: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.) |
| K4-33 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | moderat nedsatt leverfunksjon | «168» | stopp: Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). |
| K4-34 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | bruker lamotrigin allerede (ikke en oppstart) | «168» | stopp: Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. |
| K4-35 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | det er ikke bekreftet at den innfylte litiumdosen er den pasienten bruker nå | «168» | stopp: Må bekreftes før beregning: Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen. |
| K4-36 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | en usannsynlig litiumdose (0,5 mg) stopper | «0,5» | stopp: Startdosen 0,5 mg er utenfor det regelen gjelder for (42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg). |
| K4-37 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | en dose som ikke er hele Lithionit-tabletter (170 mg, for eksempel mg litiumsalt), stopper | «170» | stopp: Startdosen 170 mg er utenfor det regelen gjelder for (42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg). |
| K4-38 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | grensen: 10 tabletter (420 mg Li⁺) er innenfor | «420» | plan (12 rader) |
| K4-39 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | grensen: 11 tabletter (462 mg Li⁺) er over den høyeste veiledende vedlikeholdsdosen og stopper | «462» | stopp: Startdosen 462 mg er utenfor det regelen gjelder for (42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg). |
| K4-40 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | forskriveren velger 300 mg som mål: regelen trapper bare opp til den første stabiliserende måldosen | «168» | stopp: Måldosen 300 mg er utenfor det regelen gjelder for (200 mg). |
| K4-50 | – | Regler som ikke er godkjent | karbamazepin → lamotrigin (induserende legemiddel) har ingen regel | «600» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |
| K4-51 | – | Regler som ikke er godkjent | motsatt retning: lamotrigin → valproat har ingen regel | «200» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |
| K4-52 | – | Regler som ikke er godkjent | kvetiapin → lamotrigin har ingen regel | «300» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |

## K4-10: hele opptrappingen med valproat

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til valproat
Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg; Lamotrigin fortsetter på 100 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå, i mg slik styrken står på pasientens valproatpreparat. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. Nei: oppfylt (Oppgitt av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei: oppfylt (Oppgitt av forskriveren.)
- Måldosen er 100 mg (bindende): oppfylt (100 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig og ikke over 200 mg: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Va>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6
- Orfiril (natriumvalproat) enterotabletter, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 03.09.2026): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf – pkt. 4.5, Lamotrigin

Versjoner:
- Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk ca32dfe6497e
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag 4bbfa22a9c44
```

## K4-14: kan bli gravid, og alle vilkårene i det graviditetsforebyggende programmet er bekreftet hver for seg

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til valproat
Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg; Lamotrigin fortsetter på 100 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Annen behandling har ikke effekt eller tolereres ikke, og spesialist i bipolar lidelse har ved siste årlige gjennomgang vurdert valproat som den mest egnede behandlingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten har fått pasientinformasjonsheftet, har forstått og anerkjent risikoen for misdannelser og nevrologiske utviklingsforstyrrelser hos barnet, og risikoskjemaet er gjennomgått ved siste årlige gjennomgang: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten bruker sikker prevensjon uten avbrudd: minst én sikker, helst brukeruavhengig metode (som spiral eller implantat), eller to komplementære metoder med en barrieremetode: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Graviditet er utelukket med graviditetstest når det er behov for det, og pasienten vet at hun straks skal kontakte lege ved planlagt eller mistenkt graviditet: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå, i mg slik styrken står på pasientens valproatpreparat. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. Ja: oppfylt (Oppgitt av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei: oppfylt (Oppgitt av forskriveren.)
- Måldosen er 100 mg (bindende): oppfylt (100 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig og ikke over 200 mg: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Va>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6
- Orfiril (natriumvalproat) enterotabletter, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 03.09.2026): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf – pkt. 4.5, Lamotrigin

Versjoner:
- Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk ca32dfe6497e
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag 4bbfa22a9c44
```

## K4-29: kan ikke bli gravid: vilkårene i programmet spørres ikke etter

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til valproat
Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg; Lamotrigin fortsetter på 100 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå, i mg slik styrken står på pasientens valproatpreparat. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. Nei: oppfylt (Oppgitt av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei: oppfylt (Oppgitt av forskriveren.)
- Måldosen er 100 mg (bindende): oppfylt (100 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig og ikke over 200 mg: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Va>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6
- Orfiril (natriumvalproat) enterotabletter, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 03.09.2026): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf – pkt. 4.5, Lamotrigin

Versjoner:
- Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk ca32dfe6497e
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag 4bbfa22a9c44
```

## K4-24: østrogenholdig prevensjon med skriftlig vurdering av måldosen

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til valproat
Komplett plan til sluttmålet: Valproat fortsetter uendret på 1000 mg; Lamotrigin fortsetter på 100 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (100 mg/dag), er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå, i mg slik styrken står på pasientens valproatpreparat. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. Nei: oppfylt (Oppgitt av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Ja: oppfylt (Oppgitt av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Ja: krever begrunnelse (østrogenholdig prevensjon eller behandling, som kan kreve en høyere vedlikeholdsdose av lamotrigin enn måldosen; måldosen krever en særskilt vurdering): oppfylt (Forskriverens begrunnelse: «Syntetisk: måldosen vurderes på nytt etter titreringen, med serumkonsentrasjon av lamotrigin.».)
- Måldosen er 100 mg (bindende): oppfylt (100 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig og ikke over 200 mg: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Va>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6
- Orfiril (natriumvalproat) enterotabletter, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 03.09.2026): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf – pkt. 4.5, Lamotrigin

Versjoner:
- Regel tillegg-valproat-lamotrigin, versjon 2, fingeravtrykk ca32dfe6497e
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag 4bbfa22a9c44
```

## K4-30: hele opptrappingen med litium

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til litium
Komplett plan til sluttmålet: Litium fortsetter uendret på 168 mg; Lamotrigin fortsetter på 200 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Litiumbehandlingen følges opp som før med serumlitium og nyre-, hjerte- og stoffskiftefunksjon; planen endrer ikke litiumdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 200 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.): oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei: oppfylt (Oppgitt av forskriveren.)
- Startdosen er 42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg (bindende): oppfylt (168 mg.)
- Måldosen er 200 mg (bindende): oppfylt (200 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Li>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6

Versjoner:
- Regel tillegg-litium-lamotrigin, versjon 2, fingeravtrykk 0957451ee2d5
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag e00fd6eec1a4
```

## K4-38: grensen: 10 tabletter (420 mg Li⁺) er innenfor

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til litium
Komplett plan til sluttmålet: Litium fortsetter uendret på 420 mg; Lamotrigin fortsetter på 200 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Litium peroralt: 420 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Litium peroralt: 420 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Litium peroralt: 420 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Litium peroralt: 420 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den første stabiliserende måldosen som er valgt (200 mg/dag), er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
- Lamotrigin, dag 36: Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Advarsler:
- Beregnet etter en klinisk godkjent regelversjon. Den erstatter ikke klinisk vurdering av den enkelte pasient.
- FEST viser hva som er registrert og markedsført, ikke hva apoteket har på lager.
- Dosene er døgndoser; fordelingen over døgnet er ikke en del av regelen, unntatt der planen viser den fordi preparatomtalen krever det.
- Lamotrigin: Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt

Antakelser:
- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Litiumbehandlingen følges opp som før med serumlitium og nyre-, hjerte- og stoffskiftefunksjon; planen endrer ikke litiumdosen.

Usikkerhet:
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

Preparater planen bygger på:
- Lamictal tyggetab/disperg tab 100 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 200 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 25 mg (FEST oppgir ikke deling; regnes som ikke delbar)
- Lamictal tyggetab/disperg tab 50 mg (FEST oppgir ikke deling; regnes som ikke delbar)

Kontroller:
- Avkreftet: Pasienten er under 18 år: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C): oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.): oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei: oppfylt (Oppgitt av forskriveren.)
- Startdosen er 42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg (bindende): oppfylt (420 mg.)
- Måldosen er 200 mg (bindende): oppfylt (200 mg.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Li>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6

Versjoner:
- Regel tillegg-litium-lamotrigin, versjon 2, fingeravtrykk 0957451ee2d5
- Regelsett ousfar-verktoy-tillegg, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag e00fd6eec1a4
```
