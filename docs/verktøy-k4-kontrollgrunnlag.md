# OUSFAR Verktøy – K4: kontrollgrunnlag for kombinasjon av stemningsstabiliserende

> Generert av `npm run verktoy:regler -- tilleggsgrunnlag` fra `src/verktoy/tilleggsgrunnlag.ts`. Ikke rediger for hånd; testene sier fra når rapporten ikke er oppdatert.

Kasusene går den samme veien som verktøysiden, med preparatene i det lagrede FEST-uttrekket. **Reglene er ikke godkjent.** Kasusene med «simulert godkjenning» viser hva verktøyet ville vist om nøyaktig versjonen og fingeravtrykket under ble godkjent; kopien lagres aldri og går aldri til appen. Kasusene er syntetiske, uten pasientopplysninger. Selve reglene, kildene og fakta står i `docs/verktøy-k4-tillegg.md`.

FEST-uttrekket: `src/data/verktoy/fest-tillegg.json` (hentet 2026-11-03T16:53:31.770Z, kontrollert 2026-11-03T04:15:06.046601+00:00).

## Versjonene under kontroll

| Regel | Versjon | Fingeravtrykk |
| --- | --- | --- |
| `tillegg-valproat-lamotrigin` | 1 | `3123e0c2b65a53269ad35bff3001a595ff1f8451cbcb813d6230b3f7a8ca70b5` |
| `tillegg-litium-lamotrigin` | 1 | `7ea4ca3f7419d69c8516528cdc323ea786e7a5be2cdcd8a7b3a427f06de6bb20` |

## Kontrollspørsmål

| Nr. | Spørsmål | OUSFARs anbefaling |
| --- | --- | --- |
| K4.1 | Er opptrappingene og måldosene gjengitt riktig fra tabell 3 i Lamictal-preparatomtalen (valproat: 25 mg annenhver dag i 14 dager, 25 mg i 14 dager, 50 mg i 7 dager, 100 mg; uten valproat og induserende legemidler: 25, 50 og 100 mg, så 200 mg)? | Ja; dosene er hentet direkte fra tabellen, og planen går ikke over dem. |
| K4.2 | Er det riktig å regne den vanlige stabiliserende måldosen (100 mg med valproat, 200 mg ellers) som planens sluttmål, med videre justering som et vurderingspunkt som ikke beregnes? | Ja; preparatomtalen kaller dem vanlige måldoser og sier at måldosen avhenger av klinisk respons. |
| K4.3 | Skal planen bare bruke Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), siden vanlige lamotrigintabletter i FEST krever godkjenningsfritak? | Ja; alle dosene kan gis med hele dispergerbare tabletter. |
| K4.4 | Er unntakene (under 18 år, tidligere alvorlig reaksjon, lamotrigin i bruk eller nylig avsluttet, moderat/alvorlig leversvikt, betydelig nyresvikt, graviditet/amming, HLA-B*1502) og bekreftelsene riktige og tilstrekkelige som stopp? | Ja, som en forsiktig første avgrensning; hver av dem har en egen dosering eller vurdering i preparatomtalen som regelen ikke beregner. |
| K4.5 | Unntaket for nylig avsluttet lamotrigin oppgir ca. 7 og ca. 15 døgn (fem gjennomsnittlige halveringstider, alene og med valproat, fra pkt. 5.2). Er det forsvarlig å vise disse omtrentlige tallene? | Ja, som veiledning i teksten; regelen bruker dem ikke i beregningen. |
| K4.6 | Er en obligatorisk bekreftelse av at valproat er vurdert etter det graviditetsforebyggende programmet nok som stoppunkt, eller skal kvinner i fertil alder alltid stoppe? | Bekreftelsen er nok: uten den beregnes ingen plan, og graviditet stopper uansett. |
| K4.7 | Litium oppgis i mg (som FEST og Lithionit oppgir styrken), ikke i mmol. Er det akseptabelt når planen bare viser dosen som uendret? | Ja for første leveranse; litiumdosen beregnes ikke. |
| K4.8 | Er hormonell prevensjon riktig behandlet som et vurderingspunkt ved måldosen (ikke et unntak), siden preparatomtalen sier at opptrappingen ikke endres? | Ja. |

## Ikke dekket

- Karbamazepin → lamotrigin (og andre induserende legemidler): preparatomtalen har en egen opptrapping der døgndoser fra 100 mg skal fordeles på to doser; fordelingen per trinn er ikke modellert ennå.
- Aripiprazol, olanzapin, gabapentin og topiramat → lamotrigin: samme opptrapping som med litium etter tabell 6, men hvert par må vurderes for seg før det legges til.
- Kvetiapin, risperidon og ziprasidon → lamotrigin: interaksjonen er ikke beskrevet i tabell 6; preparatomtalen sier da at opptrappingen for samtidig valproat skal brukes. Ikke laget.
- Lamotrigin → valproat (motsatt retning): lamotrigindosen skal halveres når valproat legges til (tabell 5), men opptrappingen av valproat er ikke vurdert. Ikke laget.
- Dosen av valproat eller litium kontrolleres ikke: preparatomtalene fastsetter den individuelt (etter respons og serumkonsentrasjon) og gir ikke noe område den kan kontrolleres mot. Planen gjentar den innfylte dosen, og forskriveren må bekrefte at det er pasientens aktuelle dose (K4-35, K4-36).
- Alle andre par i Combining Moodstabilizers (110 i alt): ingen kildeforankret regel ennå.

## Kasusene

**24 kasus.** Alle utfallene er som forventet.

| Kasus | Regel | Kategori | Hva | Dose | Utfall |
| --- | --- | --- | --- | --- | --- |
| K4-01 | `tillegg-valproat-lamotrigin` | Regler som ikke er godkjent | regelen er til faglig kontroll; ingen plan i appen | «1000» | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |
| K4-02 | `tillegg-litium-lamotrigin` | Regler som ikke er godkjent | regelen er til faglig kontroll; ingen plan i appen | «168» | ingen plan (til_kontroll): Beregning er ikke tilgjengelig fordi faglig kontroll av regelen gjenstår. |
| K4-10 | `tillegg-valproat-lamotrigin` | Vanlig dose innenfor det godkjente omfanget | hele opptrappingen med valproat | «1000» | plan (12 rader) |
| K4-11 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | pasienten er under 18 år | «1000» | stopp: Regelen gjelder ikke: Pasienten er under 18 år. |
| K4-12 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | tidligere utslett på lamotrigin | «1000» | stopp: Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. |
| K4-13 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | graviditet er ikke vurdert (ubesvart) | «1000» | stopp: Må avklares før beregning (ukjent): Pasienten er gravid, planlegger graviditet eller ammer. |
| K4-14 | `tillegg-valproat-lamotrigin` | Pasientforhold, også ubesvarte | valproat er ikke bekreftet vurdert etter det graviditetsforebyggende programmet | «1000» | stopp: Må bekreftes før beregning: Valproatbehandlingen er vurdert som fortsatt riktig, også etter kravene for jenter og kvinner i fertil alder (det graviditetsforebyggende programmet). |
| K4-15 | `tillegg-valproat-lamotrigin` | Uvanlige doser og grenseverdier | ingen dose av valproat er fylt inn | «» | mangler: Aktuell døgndose må fylles inn som et tall større enn 0. |
| K4-16 | `tillegg-valproat-lamotrigin` | Foreldet FEST | FEST-kopien er 49 timer gammel | «1000» | stopp: Ingen klinisk doseplan kan vises. Legemiddeldataene ble sist kontrollert mot FEST 3. november 2026. Den nattlige oppdateringen har ikke gått siden, så nyere endringer i FEST kan mangle. |
| K4-17 | `tillegg-valproat-lamotrigin` | Utilgjengelige eller endrede preparater | alle lamotriginpreparatene krever godkjenningsfritak | «1000» | stopp: Ingen av de perorale preparatene av lamotrigin i FEST kan brukes: Lamictal tyggetab/disperg tab 5 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 25 mg: er midlertidig utgått i FEST fra 12.08.2026; krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 200 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 100 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 25 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 2 mg: krever godkjenningsfritak, som ikke er valgt · Lamictal tyggetab/disperg tab 50 mg: krever godkjenningsfritak, som ikke er valgt. |
| K4-18 | `tillegg-valproat-lamotrigin` | Utilgjengelige eller endrede preparater | Lamictal 25 mg er midlertidig utgått: 25 mg annenhver dag kan ikke gis, og planen stopper i stedet for å velge en annen dose | «1000» | stopp: lamotrigin dag 1–14: den ideelle dosen 25 mg annenhver dag kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg. Nærmeste doser som kan settes sammen: 20 mg (-20 %) og 50 mg (+100 %). En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. |
| K4-19 | `tillegg-valproat-lamotrigin` | Endret regel eller regelversjon | regelen er endret etter godkjenningen (måldose 150 mg) | «1000» | stopp: Ingen klinisk doseplan kan vises. Regelen er endret etter godkjenningen (fingeravtrykket stemmer ikke); den må kontrolleres på nytt. |
| K4-20 | `tillegg-valproat-lamotrigin` | Uvanlige doser og grenseverdier | høyeste dose sammen med valproat: en plan over 200 mg stopper (godkjenningen simulert for den endrede kopien) | «1000» | stopp: lamotrigin fra dag 36: den ideelle dosen 250 mg kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg. Nærmeste doser som kan settes sammen: 225 mg (-10 %) og 275 mg (+10 %). En annen dose, et større avvik eller en annen formulering er et nytt forslag som krever en egen faglig vurdering og godkjenning; beregningen gjør det ikke selv. |
| K4-21 | `tillegg-valproat-lamotrigin` | Nødstoppen | verktøyet er deaktivert med nødstoppen | «1000» | deaktivert med nødstoppen |
| K4-30 | `tillegg-litium-lamotrigin` | Vanlig dose innenfor det godkjente omfanget | hele opptrappingen med litium | «168» | plan (12 rader) |
| K4-31 | `tillegg-litium-lamotrigin` | Interaksjonssperrer | pasienten bruker også karbamazepin | «168» | stopp: Regelen gjelder ikke: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping. |
| K4-32 | `tillegg-litium-lamotrigin` | Interaksjonssperrer | pasienten bruker et legemiddel med ukjent interaksjon med lamotrigin | «168» | stopp: Regelen gjelder ikke: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.) |
| K4-33 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | moderat nedsatt leverfunksjon | «168» | stopp: Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). |
| K4-34 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | bruker lamotrigin allerede (ikke en oppstart) | «168» | stopp: Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. |
| K4-35 | `tillegg-litium-lamotrigin` | Pasientforhold, også ubesvarte | det er ikke bekreftet at den innfylte litiumdosen er den pasienten bruker nå | «168» | stopp: Må bekreftes før beregning: Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare. |
| K4-36 | `tillegg-litium-lamotrigin` | Uvanlige doser og grenseverdier | en usannsynlig litiumdose (0,5 mg) kontrolleres ikke; planen gjentar den og er bygd på forskriverens bekreftelse | «0,5» | plan (12 rader) |
| K4-40 | – | Regler som ikke er godkjent | karbamazepin → lamotrigin (induserende legemiddel) har ingen regel | «600» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |
| K4-41 | – | Regler som ikke er godkjent | motsatt retning: lamotrigin → valproat har ingen regel | «200» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |
| K4-42 | – | Regler som ikke er godkjent | kvetiapin → lamotrigin har ingen regel | «300» | ingen plan (ikke_stottet): OUSFAR har ingen regel for denne kombinasjonen. |

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
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den stabiliserende måldosen (100 mg/dag) er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den stabiliserende måldosen (100 mg/dag) er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
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
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen viser bare den vanlige måldosen.
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
- Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer: oppfylt (Vurdert og avkreftet av forskriveren.)
- Avkreftet: Pasienten er kjent positiv for HLA-B*1502: oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Valproatbehandlingen er vurdert som fortsatt riktig, også etter kravene for jenter og kvinner i fertil alder (det graviditetsforebyggende programmet): oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig og ikke over 200 mg: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Va>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6
- Orfiril (natriumvalproat) enterotabletter, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 03.09.2026): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf – pkt. 4.5, Lamotrigin

Versjoner:
- Regel tillegg-valproat-lamotrigin, versjon 1, fingeravtrykk 3123e0c2b65a
- Regelsett ousfar-verktoy, versjon 1
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
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den stabiliserende måldosen (200 mg/dag) er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den stabiliserende måldosen (200 mg/dag) er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
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
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen viser bare den vanlige måldosen.
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
- Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.): oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Li>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6

Versjoner:
- Regel tillegg-litium-lamotrigin, versjon 1, fingeravtrykk 7ea4ca3f7419
- Regelsett ousfar-verktoy, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag e00fd6eec1a4
```

## K4-36: en usannsynlig litiumdose (0,5 mg) kontrolleres ikke; planen gjentar den og er bygd på forskriverens bekreftelse

Planutfall: Komplett plan til sluttmålet.

```text
Kombinere stemningsstabiliserende
Legge lamotrigin til litium
Komplett plan til sluttmålet: Litium fortsetter uendret på 0,5 mg; Lamotrigin fortsetter på 200 mg fra dag 36.

Dag 1–14 (09.11.2026–22.11.2026): Litium peroralt: 0,5 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 15–28 (23.11.2026–06.12.2026): Litium peroralt: 0,5 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Dag 29–35 (07.12.2026–13.12.2026): Litium peroralt: 0,5 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.
Fra dag 36 (fra 14.12.2026): Litium peroralt: 0,5 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den stabiliserende måldosen (200 mg/dag) er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.

Vurderingspunkter:
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn. Ved funn: Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.
- Lamotrigin, før hver doseendring (dag 15, 29, 36): Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring. Ved funn: Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.
- Lamotrigin, dag 36: Den stabiliserende måldosen (200 mg/dag) er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.
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
- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen viser bare den vanlige måldosen.
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
- Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.): oppfylt (Vurdert og avkreftet av forskriveren.)
- Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare: oppfylt (Bekreftet av forskriveren.)
- Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter: oppfylt (Bekreftet av forskriveren.)
- Hver døgndose av lamotrigin kan gis med preparater i FEST, nøyaktig: oppfylt (4 perioder; største avvik 0 %.)

Kilder:
- Psychiatrienet, switchtabellene (kildearkivet fra P3) (De Tijdstroom, Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json): https://www.psychiatrienet.nl/switchtabel – kildeoppføring CombiningMoodstabilizers:Li>La
- Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale (Direktoratet for medisinske produkter (DMP), Oppdatert 30.06.2025): https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf – pkt. 4.2, Bipolar lidelse; pkt. 4.2, Bipolar lidelse, tabell 3; pkt. 4.2, Dosering; pkt. 4.4, Hudutslett; pkt. 4.5, tabell 6

Versjoner:
- Regel tillegg-litium-lamotrigin, versjon 1, fingeravtrykk 7ea4ca3f7419
- Regelsett ousfar-verktoy, versjon 1
- Regelmodell 12, beregningsmotor 10, doseplanmotor 10
- FEST-uttrekk 2026-10-27T12:25:20, kontrollert 2026-11-03T04:15:06.046601+00:00, preparatstatus per 03.11.2026
- Preparatgrunnlag e00fd6eec1a4
```
