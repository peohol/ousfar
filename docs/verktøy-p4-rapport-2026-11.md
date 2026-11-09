# P4 – samlet test av psykofarmakaverktøyene etter A–D (08.11.2026)

Uavhengig test av det faktiske produktet etter at P1 (#343), P2-b (#344), P3 (#346) og P2-a (#345) er slått sammen. Grunnlaget er P4 i [produktrevisjonen](verktøy-produktrevisjon-2026-11.md). Forløpene bygger på [P0-rapporten](verktøy-p0-rapport-2026-11.md). Alle data er syntetiske. Verktøyene er fortsatt bare åpne for administratorer. Ingen regel, dose, godkjenning, nødstopp eller FEST-grense er endret i denne runden.

## 1. Hva som er kjørt, og hva det beviser

| Nivå | Hva | Grunnlag | Resultat |
| --- | --- | --- | --- |
| Motor uten nettleser | `src/__tests__/qa/fasit.test.ts`: de 13 positive P0-forløpene regnet mot appens faktiske godkjenninger og de lagrede FEST-uttrekkene, holdt mot fasiten dag for dag | main 952c0ee | Alle 13 gir komplett plan og nøyaktig fasitens doser, også de månedlige vedlikeholdsinjeksjonene |
| Lokal app i nettleser | `scripts/verktoy-p0-app.mjs`: 34 forløp (30 fra P0 og spor A, 4 på mobil). Skjermens tidslinje, kort kopi og utskrift av hver komplett plan holdes mot fasiten | Lokalt testmiljø med egen database (`docs/qa-testmiljo.md`), app 1.128.2 bygd fra main 952c0ee, FEST fra de lagrede uttrekkene. Kjørt på nytt 09.11.2026 med fasiten og driveren fra e62bc8f | 1587 kall, 0 feil. Se §2 |
| Lokal appkontroll | `src/__tests__/qa/appkontroll.ts`: 57 forløp mot den lokale motoren, med nødstopp og FEST kontrollert for 72 og 47 timer siden | Som over | Se §4 |
| Publisert admin-app | 6 forløp med `QA_PRODUKSJON=ja`, innenfor vernet (høyst 6 forløp og 400 kall) | https://ousfar.vercel.app, 1.128.2, 08.11.2026 20:58 UTC, dagens FEST | 175 kall, 0 feil, 18 bakgrunnskall blokkert av vernet. Se §3 |

**Fasiten** (`src/__tests__/qa/fasit.ts`) er skrevet for hånd fra kontrollgrunnlagene og preparatomtalene som er oppgitt per forløp. Den er ikke hentet fra motorens utdata. Den angir riktig utfall, alle dosepunktene dag for dag, de månedlige vedlikeholdsinjeksjonene i depotplanene, sluttmålet og hvilket forhold et stopp skal nevne. For hver komplett plan sammenlignes tre ting hver for seg med fasiten: skjermens tidslinje, den korte kopien og tidslinjen slik den skrives ut. Nettleseren emulerer utskrift, og det lages en PDF. Sammenligningen gjelder hver dag og hvert legemiddel, også alle dagene etter siste endring. Et hull inne i et intervall gir avvik, og det samme gjør en avkortet vedlikeholdsperiode, overlapp, et bytte på feil dag, et ekstra trinn, feil dose og et legemiddel som seponeres for tidlig. Det er rettelsen av ChatGPTs funn på #348, og hvert tilfelle har sin egen negative test.

**Depotplanene (C04–C06)** har i tillegg en egen fasit for den første månedlige vedlikeholdsinjeksjonen: hvilken dag den forankres til, dosen, at intervallet er månedlig og tidsvinduet. For Abilify Maintena er det 400 mg hver måned fra 1 måned etter dag 1, tidligst 26 dager etter forrige injeksjon (pilotsettets kontrolltilfelle K0-09 og preparatomtalen). For Xeplion er det 75 mg hver måned fra 1 måned etter dag 8, ±7 dager (K3-01 og preparatomtalen: første gang én måned etter andre dose). Dette kontrolleres på skjermen, i den korte kopien og i utskriften hver for seg. En vedlikeholdslinje som mangler, er forankret til en annen dag, har en annen dose, et annet intervall eller mangler tidsvinduet, gir avvik, og det samme gjør en ekstra vedlikeholdslinje. Den negative testen er Xeplion med riktig oppstart (150 mg dag 1, 100 mg dag 8) og riktig månedlig dose, men med første vedlikehold forankret til dag 1: den oppdages, selv om alle de andre dosepunktene stemmer. Fasiten bygger på det som allerede er klinisk godkjent. Ingen regel eller gyldighet er endret. Dette rettet ChatGPTs andre funn på #348.

**Hva dette ikke er:** en klinisk prøving eller en klinisk substanskontroll. Fasiten gjengir det som er klinisk godkjent i dag, og utvider ikke noe omfang. At skjerm, kopi og utskrift stemmer med fasiten, er en teknisk ende-til-ende-verifikasjon med syntetiske data.

## 2. Resultat lokalt (34 forløp, main 952c0ee, fasit e62bc8f)

**Positive forløp:** alle 21 gir komplett plan. Skjermen, den korte kopien og utskriften stemmer med fasiten i hver dose og hver dag, også på mobilbredde (390 punkter). I depotplanene (C04, C05, C06 og mobilvarianten av C05) stemmer også den første månedlige vedlikeholdsinjeksjonen på alle tre flatene: «Hver måned fra 1 måned etter dag 1: … 400 mg (tidligst 26 dager etter forrige)» for Abilify Maintena og «Hver måned fra 1 måned etter dag 8: … 75 mg (±7 dager …)» for Xeplion.

| Forløp | Regel (versjon, fingeravtrykk) | Handlinger før → nå | Kort kopi, tegn før → nå | Utskrift, sider før → nå |
| --- | --- | --- | --- | --- |
| A01 escitalopram 10 mg tablett | seponering-escitalopram-tabletter-og-draper v14, 01b2fb56 | 20 (5 enkeltvalg) → 17 (0) | 15 259 → 4 190 | 5 → 2 |
| A02 escitalopram 20 mg tablett | samme | 22 (7) → 17 (0) | 17 401 → 4 780 | – → 3 |
| A03/A04 dråper 10/20 mg | samme | 20/22 → 17/17 | 15 259/16 884 → 4 078/4 607 | – → 2/3 |
| N06/N07 «Tilpass planen» endret | samme | stopp uten grunn → standardplanen (feltene er låst til de godkjente verdiene) | – → 4 190 | – → 2 |
| B01 citalopram → sertralin | bytte-citalopram-sertralin v2, 2b64ff9e | 11 → 12 | 10 930 → 3 278 | 4 → 2 |
| B03 escitalopram → sertralin | bytte-escitalopram-sertralin v2, c0bf6c61 | 11 → 12 | 11 084 → 3 307 | – → 2 |
| B04 65 år | bytte-citalopram-sertralin v2 | ny → 13 | 3 278 | 2 |
| C01 olanzapin → aripiprazol | antipsykotikabytte-olanzapin-aripiprazol v8, f141a13a | 14 → 17 | 12 799 → 4 725 | – → 3 |
| C03 risperidon → aripiprazol | antipsykotikabytte-risperidon-aripiprazol v8, 866ac93c | 14 → 17 | 11 829 → 4 284 | – → 3 |
| C04 aripiprazol → Abilify Maintena | depot-aripiprazol-maintena v3, 04d1debe | 7 → 10 | 4 193 → 1 126 | – → 1 |
| C05 risperidon → Xeplion | depot-risperidon-xeplion v8, 1672334c | 10 → 11 | 8 290 → 2 137 | – → 1 |
| C06 paliperidon → Xeplion | depot-paliperidon-xeplion v3, 21a335ee | 4 → 6 | 4 694 → 1 227 | – → 1 |
| D01 valproat + lamotrigin | tillegg-valproat-lamotrigin v2, 0a9213f3 | 18 → 20 | 10 607 → 4 635 | – → 3 |
| D03 som D01, kan bli gravid, programmet oppfylt | samme | ny → 25 | 5 405 | 3 |
| D02 litium + lamotrigin | tillegg-litium-lamotrigin v2, 786436a0 | 19 → 22 | 10 491 → 4 310 | – → 2 |

«Før» er målingen på 1.127.0 lokalt (07.11.2026), der P0-funnene ble gjenskapt. Handlinger er trykk og utfylte felt fra verktøyet åpnes til planen eller stoppet står. Planene viser «Beregnet etter regelversjon … med FEST-uttrekk fra 27.10.2026». Spørsmålskatalogen for hver av disse reglene er semantisk kontrollert og registrert med eget fingeravtrykk (`src/verktoy/flyt/katalogkontroll.ts`), så ingen av dem bruker lenger reservevisningen.

**K2-strategien:** citalopram → sertralin er nedtrapping til 10 mg i 14 dager, så sertralin 50 mg fra dag 15 uten dager uten SSRI og uten to SSRI-er samtidig, så 100 mg fra dag 29. Planens tittel sier det («nedtrapping og direkte overgang»). Fasiten krever nøyaktig denne tidslinjen, så overlapp gir avvik. Peder avgjorde 07.11.2026 at direkte bytte er standard (P1, `docs/verktøy-p1-strategigrunnlag-2026-11.md`). Psychiatrienets overlapp er ikke tatt i bruk.

**Negative forløp:** alle 13 gir ingen plan og sier hva som stopper; for D04 se §5.2:

| Forløp | Det appen sier |
| --- | --- |
| N01/N09 lang behandlingstid (10/20 mg) | Den godkjente planen gjelder bare kort behandlingstid … |
| N02 tidligere seponeringsplager | «Verktøyet har foreløpig ingen godkjent standardplan ved tidligere seponeringsvansker. Nedtrappingen må tilpasses individuelt.» |
| N03 65 år eller eldre | stopp med alder, etter 4 handlinger (før: 10) |
| N04 15 mg, C02 olanzapin 10 mg | stopp på dosen i steg 2, uten spørsmål om pasienten |
| N05 nedsatt leverfunksjon | stopp med leverfunksjon |
| N08 «Vet ikke» om behandlingstid | ingen plan: «Ett svar er «Vet ikke». Må avklares før verktøyet kan lage en plan.» |
| B02 mer enn 8 uker | «Den godkjente planen gjelder bare de første 8 ukene med citalopram …» |
| B05 over 65 år | stopp med alder |
| C07 toleranse ikke dokumentert | «Den godkjente planen gjelder bare når det er dokumentert at pasienten har tålt peroral risperidon over tid …» |
| D04 kan bli gravid, uten sikker prevensjon | «Et vilkår i det graviditetsforebyggende programmet for valproat er ikke oppfylt …» |

«Da gjelder ikke regelen», «Gjelder/Gjelder ikke» og «Prøv igjen senere» står ikke noe sted. Ingen manglende regelstøtte er formulert som et medisinsk forbud. Ingen planer forespeiles.

## 3. Publisert admin-app (6 forløp, 1.128.2)

| Forløp | Utfall | Fasit (skjerm, kopi, utskrift) |
| --- | --- | --- |
| A01 escitalopram 10 mg tablett | komplett plan, 17 handlinger, kopi 4 190 tegn, 2 sider | i samsvar |
| B01 citalopram → sertralin | komplett plan, 12 handlinger, 3 278 tegn, 2 sider | i samsvar |
| C01 olanzapin → aripiprazol | komplett plan, 17 handlinger, 4 725 tegn, 3 sider | i samsvar |
| C05 risperidon → Xeplion | komplett plan, 11 handlinger, 2 137 tegn, 1 side | i samsvar |
| D01 valproat + lamotrigin | komplett plan, 20 handlinger, 4 635 tegn, 3 sider | i samsvar |
| N02 tidligere seponeringsplager | konkret stopp, som lokalt | i samsvar |

Kjøringen i den publiserte appen ble gjort før fasiten fikk egen kontroll av vedlikeholdsinjeksjonen. Den lagrede utskriften fra C05 viser den samme vedlikeholdslinjen som lokalt (75 mg hver måned fra 1 måned etter dag 8, ±7 dager) i kopien, på skjermen og i utskriften. Appen er ikke endret siden, så den ble ikke belastet med en ny kjøring. Den publiserte appen ga de samme tallene og tekstene som den lokale kjøringen, med regelversjonene i §2 og FEST-uttrekk fra 27.10.2026. Kjøringen holdt seg innenfor vernet: 175 kall, 0 svar med 5xx, tregeste kall 2,8 s, ingen sperre eller FEST-data lagret. Nødstopp og foreldet FEST er bare prøvd lokalt, fordi de ikke skal utløses i produksjonen.

## 4. Sikkerhetssperrer og FEST (lokalt)

Appkontrollen (`src/__tests__/qa/appkontroll.ts`) lager en syntetisk nødstopp og en FEST-kopi som oppgis kontrollert for 72 og 47 timer siden. Dette endres bare i nettleseren.

- **Nødstopp:** K0-01 (escitalopram) og K0-11 (litium + lamotrigin) gir ingen plan, og siden oppgir grunnen til nødstoppen.
- **FEST kontrollert for 72 timer siden** (grensen er 48): K0-01 og H-30 gir ingen plan, og siden sier at FEST ikke er kontrollert på lenge.
- **FEST kontrollert for 47 timer siden:** planen gis som vanlig.
- **Planene:** de 17 forløpene som skal gi plan, gir den. Den utvidede kopien («Kopier med faglig grunnlag») er lik den lokale kjøringen linje for linje. Tidslinjen på skjermen er lik den korte kopien celle for celle. 2723 kall, 0 feil.
- **Ett avvik i sammenligningen, ikke i produktet:** H-32 er escitalopram med lang behandlingstid og 10 % per trinn. Den lokale motoren stopper sent: neste trinn kan ikke gis med preparatene. Appen stopper tidligere og med riktig grunn: «Den godkjente planen gjelder bare kort behandlingstid …» Det er det tidlige stoppet spor B innførte. Ingen av dem gir plan, men appkontrollen venter motorens grunn. Den forventningen bør oppdateres i neste QA-runde.

Appkontrollen måtte tilpasses den nye arbeidsflyten. Den godtar dosevalg med bare ett alternativ med «Bruk disse dosene». Den sammenligner den utvidede kopien med motoren og den korte kopien med tidslinjen. Uten disse tilpasningene ville den meldt at escitalopram ikke ga plan.

## 5. Det som fortsatt ikke virker, eller som bør vurderes

1. **Flere trykk ved K3 og K4.** De sammensatte spørsmålene er delt opp i enkle Ja/Nei-spørsmål (spor A). Hvert svar er enklere, men det blir flere av dem: C01 går fra 14 til 17 handlinger og D01 fra 18 til 20. D03, der pasienten kan bli gravid, har 25. Ingen av disse spørsmålene kan tas bort uten å fjerne et sikkerhetsspørsmål. Det er en avveining for P5, ikke en feil.
2. **D04 nevner programmet, men ikke vilkåret.** Stoppet sier at et vilkår i det graviditetsforebyggende programmet ikke er oppfylt, men ikke at det er sikker prevensjon. Svaret står rett over i spørsmålslisten. Fasiten krever vilkåret, så det står som bruksavvik. **Rettet etter P4 (1.128.4):** stoppet navngir nå vilkåret, for eksempel «Det er ikke bekreftet at pasienten bruker sikker prevensjon uten avbrudd.», og det samme gjelder vilkårene om annen behandling og årlig spesialistvurdering. Planen stopper i de samme tilfellene som før.
3. **Smal dekning.** Uendret fra P0: K1 er escitalopram fra 10 eller 20 mg med kort behandlingstid. K2 er to SSRI-bytter innen 8 uker. Det er ikke bred klinisk praksisdekning (produktrevisjonen §1.6).
4. **Ikke prøvd:** skjermleser og tastaturflyt i hele forløpet (bare det som Playwright bruker), ekte journal- eller reseptbruk av kopien, og Peders korte aksepttest (P5).

## 6. Reproduksjon

```
npx vitest run src/__tests__/qa                         # motor og fasit, uten nettleser
npx vite-node scripts/verktoy-p0-app.mjs                # 34 forløp i lokal app (P4_STRENG=1: avvik gir feilstatus)
npx vite-node src/__tests__/qa/appkontroll.ts           # appkontroll med nødstopp og FEST, lokalt
QA_PRODUKSJON=ja npx vite-node scripts/verktoy-p0-app.mjs P0-A01 P0-B01 P0-C01 P0-C05 P0-D01 P0-N02   # begrenset, publisert app
```

Målingene ligger i prosjektmappen `verktoy-p2-p4/maling/`:
- `p4-lokal-main952c0ee.json`, `p4-lokal-vedlikehold.json` (ny kjøring med kontroll av vedlikeholdsinjeksjonene) og `p4-produksjon-1.128.2.json`
- PDF-ene av utskriftene i `p4-pdf/`
- målingen før endringene (`for-main-1.127.0.json`)
