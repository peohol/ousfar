# OUSFAR Verktøy – K3: regler for bytte av antipsykotikum

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-antipsykotikabytter` versjon 1, regelmodell 12, beregningsmotor 10. Byttereglene for antipsykotika i K3: komplette forløp til et definert sluttmål, bygget på preparatomtaler og Keks 2019. To depotrelaterte (Xeplion fra peroral risperidon og fra Risperdal Consta) og tre perorale direkte bytter (aripiprazol til olanzapin og til risperidon, kariprazin til kvetiapin). Alle står til uavhengig faglig kontroll; ingen er klinisk godkjent.

**5 regler, 0 klinisk godkjent.** Utfallet av kontrollen: 5 ikke ferdig kontrollert. Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-k3-antipsykotika.md` og `docs/verktøy-klinisk-leveranseplan-2026-11.md` og `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `depot-risperidon-xeplion` | oppstart av depot | risperidon → paliperidon | entydig beregnbar | 0 | til faglig kontroll | 8 |
| `depot-consta-xeplion` | direkte bytte | risperidon → paliperidon | entydig beregnbar | 0 | til faglig kontroll | 7 |
| `antipsykotikabytte-aripiprazol-olanzapin` | direkte bytte | aripiprazol → olanzapin | entydig beregnbar | 0 | til faglig kontroll | 6 |
| `antipsykotikabytte-aripiprazol-risperidon` | direkte bytte | aripiprazol → risperidon | entydig beregnbar | 0 | til faglig kontroll | 5 |
| `antipsykotikabytte-kariprazin-kvetiapin` | direkte bytte | kariprazin → kvetiapin | entydig beregnbar | 0 | til faglig kontroll | 5 |

## Kilder

Hentet og lest 28.10.2026 og 03.11.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf) | preparatomtale | Seroquel (kvetiapin) tabletter, preparatomtale | Oppdatert 03.07.2024 | `87e197ef056358d0…` |
| [ema-abilify](https://www.ema.europa.eu/en/documents/product-information/abilify-epar-product-information_en.pdf) | preparatomtale | Abilify (aripiprazol), produktinformasjon | Sist endret 08.10.2026 | `48ec4699460ea38c…` |
| [ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf) | preparatomtale | Xeplion (paliperidonpalmitat depotinjeksjon), produktinformasjon | Sist endret 08.10.2026 | `2d38bdc767adb9ed…` |
| [dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf) | preparatomtale | Risperdal (risperidon) tabletter, preparatomtale | Oppdatert 19.08.2022 | `dd2ce96c875c8f82…` |
| [dmp-risperdal-consta](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2001-09858.pdf) | preparatomtale | Risperdal Consta (risperidon depotinjeksjon), preparatomtale | Oppdatert 11.05.2021 | `f8083addc64cc295…` |
| [ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf) | preparatomtale | Reagila (kariprazin), produktinformasjon | PDF datert 11.12.2025 | `9d13d908e239f636…` |
| [ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf) | preparatomtale | Zyprexa (olanzapin), produktinformasjon | Sist endret 08.10.2026 | `d7a60e6f4908c9e7…` |
| [keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML) | oversiktsartikkel | Keks N, Schwartz D, Hope J. Stopping and switching antipsychotic drugs. Aust Prescr 2019;42:152–157 | doi:10.18773/austprescr.2019.052, PMC6787301 | `26102eb58a504876…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Fra peroral risperidon til Xeplion

`depot-risperidon-xeplion`, versjon 1, fingeravtrykk `fa0ea68b98054eee2b8533e7702b0df447dd604b520f8198565b3280adfe6469`. Oppstart av depot: risperidon → paliperidon. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.
  - Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.1)*
- Fra peroral risperidon startes Xeplion med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.
  - Ved bytte fra peroral paliperidon eller peroral risperidon startes Xeplion med den vanlige oppstarten: 150 mg dag 1 og 100 mg dag 8. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Andre oppstartsdose kan gis inntil 4 dager før eller etter dag 8; vedlikeholdsdosene inntil 7 dager før eller etter månedsdatoen. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (glemte doser))*
- Anbefalt vedlikeholdsdose er 75 mg månedlig, innenfor 25–150 mg etter toleranse og effekt, i deltoideus eller setemuskel.
  - Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Peroral risperidon kan seponeres når Xeplion startes.
  - Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Preparatomtalen har ingen tabell fra peroral risperidondose til Xeplion-dose; tabellen gjelder paliperidon depottabletter.
  - Peroral paliperidon depottablett 3, 6, 9 og 12 mg daglig tilsvarer ved vedlikehold 25–50, 75, 100 og 150 mg Xeplion månedlig. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.
  - Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (nedsatt nyrefunksjon))*
  - Effekt og sikkerhet hos eldre over 65 år er ikke fastslått; eldre kan ha nedsatt nyrefunksjon som krever andre doser. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (eldre))*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR seponerer peroral risperidon dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.
  - Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Vedlikeholdsdosen regnes ikke ut fra risperidondosen. Forskriveren velger den innenfor 25–150 mg; preparatomtalen anbefaler 75 mg. Planen bruker bare styrker av Xeplion som finnes i FEST.
  - Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Risperidondosen oppgis som dokumentasjon av stabiliseringen og må være innenfor det preparatomtalen anbefaler (høyst 16 mg daglig); den brukes ikke i beregningen.
  - Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (injeksjoner) | start[0].dag | 1 (dag) | bindende krav | ema-xeplion section 4.2 (bytte fra peroral) |
| til: fase 1 (injeksjoner) | start[0].dose.mg | 150 mg | bindende krav | ema-xeplion section 4.2; ema-xeplion section 4.2 (bytte fra peroral) |
| til: fase 1 (injeksjoner) | start[1].dag | 8 (dag) | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | start[1].dose.mg | 100 mg | bindende krav | ema-xeplion section 4.2; ema-xeplion section 4.2 (bytte fra peroral) |
| til: fase 1 (injeksjoner) | start[1].vindu_dager | 4 dager | bindende krav | ema-xeplion section 4.2 (glemte doser) |
| til: fase 1 (injeksjoner) | vedlikehold.maaneder | 1 måned(er) | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | vedlikehold.vindu_dager | 7 dager | bindende krav | ema-xeplion section 4.2 (glemte doser) |

**Betingelser:**

- Startdose høyst 16 mg (bindende; dmp-risperdal pkt. 4.2)
- Måldose (må oppgis) 25–150 mg (bindende; ema-xeplion section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral risperidon. (ema-xeplion section 4.1; ema-xeplion section 4.2 (bytte fra peroral))
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. (ema-xeplion section 4.2 (nedsatt nyrefunksjon))
- Unntak (`over_65`): Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. (ema-xeplion section 4.2 (eldre))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral risperidon (tabletter eller mikstur) daglig.
- Forskriveren har vurdert nyrefunksjonen og alderen og svart at kreatininclearance ikke er under 80 ml/min og at pasienten ikke er over 65 år; ubesvart stopper beregningen.

**Usikkerhet:**

- Hvilken vedlikeholdsdose som gir samme effekt som pasientens risperidondose, sier preparatomtalen ikke; valget er klinisk, og full effekt av en dose kan først sees etter flere måneder.
- Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotene er ikke kontrollert mot regelen og er ikke omfattet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Risperidon 4 mg, vedlikehold 75 mg, startdato 1. desember 2026.* Inndata: startdose 4 mg; måldose 75 mg; startdato 01.12.2026; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **fra:** fra dag 1 (01.12.2026): seponert
  - **til:** dag 1 (01.12.2026): 150 mg injeksjon, deltoideus; dag 8 (08.12.2026, ±4 dager): 100 mg injeksjon, deltoideus; hver måned fra 1 måned etter dag 8 (08.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral risperidon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 16 mg (bindende) – oppfylt. 4 mg.
  - Kontroll: Måldosen er 25–150 mg (bindende) – oppfylt. 75 mg.
- *Risperidon 2 mg, vedlikehold 50 mg.* Inndata: startdose 2 mg; måldose 50 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 150 mg injeksjon, deltoideus; dag 8 (±4 dager): 100 mg injeksjon, deltoideus; hver måned fra 1 måned etter dag 8 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral risperidon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er høyst 16 mg (bindende) – oppfylt. 2 mg.
  - Kontroll: Måldosen er 25–150 mg (bindende) – oppfylt. 50 mg.
- *Uten valgt vedlikeholdsdose: beregningen velger ikke selv.* Inndata: startdose 4 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *Vedlikehold 175 mg er over området i preparatomtalen.* Inndata: startdose 6 mg; måldose 175 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Måldosen 175 mg er utenfor det regelen gjelder for (25–150 mg).
- *Risperidon 20 mg er over det preparatomtalen anbefaler.* Inndata: startdose 20 mg; måldose 150 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Startdosen 20 mg er utenfor det regelen gjelder for (høyst 16 mg).
- *Kreatininclearance under 80 ml/min: regelen gjelder ikke.* Inndata: startdose 4 mg; måldose 75 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon ja, over_65 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.
- *Alderen er ikke vurdert: ukjent stopper like mye som over 65 år.* Inndata: startdose 4 mg; måldose 75 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen.
- *Uten bekreftet stabilisering og toleranse stopper beregningen.* Inndata: startdose 4 mg; måldose 75 mg; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral risperidon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Rd>Dp`.

## Fra Risperdal Consta til Xeplion

`depot-consta-xeplion`, versjon 1, fingeravtrykk `e6d28c4aa7eca635f2cb20e8de16862470ab8010e967b252d953743b999daafc`. Direkte bytte: risperidon → paliperidon. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8.
  - Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra risperidon depotinjeksjon))*
- Consta 25, 37,5 og 50 mg hver 2. uke tilsvarer Xeplion 50, 75 og 100 mg månedlig.
  - Risperidon depotinjeksjon 25, 37,5 og 50 mg hver 2. uke tilsvarer ved vedlikehold Xeplion 50, 75 og 100 mg månedlig. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra risperidon depotinjeksjon))*
- Månedlige injeksjoner kan gis inntil 7 dager før eller etter månedsdatoen, i deltoideus eller setemuskel.
  - Andre oppstartsdose kan gis inntil 4 dager før eller etter dag 8; vedlikeholdsdosene inntil 7 dager før eller etter månedsdatoen. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (glemte doser))*
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet blir i praksis en kryss-titrering.
  - Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet gjøres oftest direkte og blir på grunn av de lange halveringstidene i praksis en kryss-titrering. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (depot til depot))*
- Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.
  - Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (nedsatt nyrefunksjon))*
  - Effekt og sikkerhet hos eldre over 65 år er ikke fastslått; eldre kan ha nedsatt nyrefunksjon som krever andre doser. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (eldre))*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Første Xeplion-dose regnes som injeksjonen dag 1, med samme dose som vedlikeholdet etter tabellen; den neste kommer én måned senere.
  - Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra risperidon depotinjeksjon))*
  - Risperidon depotinjeksjon 25, 37,5 og 50 mg hver 2. uke tilsvarer ved vedlikehold Xeplion 50, 75 og 100 mg månedlig. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra risperidon depotinjeksjon))*
- I verktøyet er Consta og Okedi samme valg («risperidon, depotinjeksjon»); forskriveren må derfor bekrefte at depotet er Consta hver 2. uke.
  - Risperdal Consta gis intramuskulært annenhver uke, vanligvis 25 mg; noen trenger 37,5 eller 50 mg. Høyere doser enn 50 mg anbefales ikke. *([dmp-risperdal-consta](https://produktinformasjon.legemiddelsok.no/preparatomtaler/2001-09858.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (injeksjoner) | start[0].dag | 1 (dag) | bindende krav | ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon) |
| til: fase 1 (injeksjoner) | vedlikehold.maaneder | 1 måned(er) | bindende krav | ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon) |
| til: fase 1 (injeksjoner) | vedlikehold.vindu_dager | 7 dager | bindende krav | ema-xeplion section 4.2 (glemte doser) |
| til: vedlikeholdsdose | omregningstabell | 25 → 50 mg, 37,5 → 75 mg, 50 → 100 mg | bindende krav | ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon) |

**Betingelser:**

- Startdose 25, 37,5, 50 mg (bindende; ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon); dmp-risperdal-consta pkt. 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke. (ema-xeplion section 4.1; ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon))
- Må bekreftes (`preparat_consta`): Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet. (ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon); dmp-risperdal-consta pkt. 4.2)
- Må bekreftes (`neste_injeksjon`): Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer. (ema-xeplion section 4.2 (bytte fra risperidon depotinjeksjon))
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. (ema-xeplion section 4.2 (nedsatt nyrefunksjon))
- Unntak (`over_65`): Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. (ema-xeplion section 4.2 (eldre))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten har fått Risperdal Consta hver 2. uke i den oppgitte dosen lenge nok til at dosen er stabil.
- Forskriveren har vurdert nyrefunksjonen og alderen og svart at kreatininclearance ikke er under 80 ml/min og at pasienten ikke er over 65 år; ubesvart stopper beregningen.

**Usikkerhet:**

- Preparatomtalen oppgir intet vindu for første Xeplion-injeksjon; den gis på dagen neste Consta-injeksjon skulle vært gitt.
- Consta-doser som ikke står i tabellen (for eksempel høyere doser), og andre risperidondepoter, er ikke omfattet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Consta 37,5 mg; neste injeksjon skulle vært gitt 15. desember 2026.* Inndata: startdose 37,5 mg; startdato 15.12.2026; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **fra:** fra dag 1 (15.12.2026): seponert
  - **til:** dag 1 (15.12.2026): 75 mg injeksjon, deltoideus eller setemuskel; hver måned fra 1 måned etter dag 1 (15.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 25, 37,5, 50 mg (bindende) – oppfylt. 37,5 mg.
- *Consta 25 mg gir Xeplion 50 mg.* Inndata: startdose 25 mg; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 50 mg injeksjon, deltoideus eller setemuskel; hver måned fra 1 måned etter dag 1 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 25, 37,5, 50 mg (bindende) – oppfylt. 25 mg.
- *Consta 50 mg gir Xeplion 100 mg.* Inndata: startdose 50 mg; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 100 mg injeksjon, deltoideus eller setemuskel; hver måned fra 1 måned etter dag 1 (±7 dager): 100 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 25, 37,5, 50 mg (bindende) – oppfylt. 50 mg.
- *Consta 62,5 mg står ikke i tabellen.* Inndata: startdose 62,5 mg; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Startdosen 62,5 mg er utenfor det regelen gjelder for (25, 37,5, 50 mg).
- *Uten bekreftelse av at depotet er Consta (for eksempel Okedi) stopper beregningen.* Inndata: startdose 50 mg; bekreftet: indikasjon, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei.
  - **Stoppet:** Må bekreftes før beregning: Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet.
- *Kreatininclearance under 80 ml/min: regelen gjelder ikke.* Inndata: startdose 37,5 mg; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon ja, over_65 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.
- *Over 65 år: regelen gjelder ikke.* Inndata: startdose 37,5 mg; bekreftet: indikasjon, preparat_consta, neste_injeksjon; pasientforhold: nedsatt_nyrefunksjon nei, over_65 ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Dr>Dp`.

## Fra aripiprazol til olanzapin, direkte bytte

`antipsykotikabytte-aripiprazol-olanzapin`, versjon 1, fingeravtrykk `cc4314805648deab66ab40555eecf88e9ff181515e762997ba3b8a56e9d38825`. Direkte bytte: aripiprazol → olanzapin. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Når det første antipsykotikumet er aripiprazol, kan byttet gjøres direkte: aripiprazol stoppes, og det nye startes dagen etter. Aripiprazol har svært lang halveringstid og ingen antikolinerg effekt.
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om direkte bytte)*
  - Halveringstiden til aripiprazol er om lag 75 timer, og 95 timer for den aktive metabolitten. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 1)*
- Et opphold uten antipsykotikum anbefales ikke.
  - I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om byttestrategier)*
- Et direkte bytte krever erfaring, gjøres helst der pasienten kan følges tett, og bør vurderes av psykiater.
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om bytte)*
- Ved schizofreni er anbefalt startdose av olanzapin 10 mg daglig; dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.
  - Schizofreni: anbefalt startdose er 10 mg daglig. Dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*
- Lavere startdose bør vurderes fra 65 år, ved nedsatt nyre- eller leverfunksjon, ved flere faktorer for langsom omsetning og sammen med CYP1A2-hemmere.
  - Lavere startdose (5 mg) bør vurderes fra 65 år når kliniske forhold tilsier det, ved nedsatt nyre- eller leverfunksjon og ved flere faktorer for langsommere omsetning (kvinne, høy alder, ikke-røyker). *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*
  - Ved samtidig bruk av fluvoksamin eller andre CYP1A2-hemmere, som ciprofloksacin, bør lavere startdose av olanzapin vurderes. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.5)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Aripiprazol seponeres uten nedtrapping dagen før olanzapin startes (siste dose dagen før dag 1).
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om direkte bytte)*
- Planen slutter med olanzapin 10 mg daglig fra dag 1. Videre justering innenfor 5–20 mg er en klinisk vurdering og beregnes ikke.
  - Schizofreni: anbefalt startdose er 10 mg daglig. Dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (vedlikehold) | dose.mg | 10 mg | bindende krav | ema-zyprexa section 4.2 |

**Betingelser:**

- Startdose 10–30 mg (bindende; ema-abilify section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. (ema-abilify section 4.2; ema-zyprexa section 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`nedsatt_nyre_lever`): Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`langsom_omsetning`): Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`cyp1a2_hemmer`): Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. (ema-zyprexa section 4.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral aripiprazol 10–30 mg daglig, det doseområdet preparatomtalen oppgir ved schizofreni.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.
- Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.
- Sedasjon, vektøkning og metabolske bivirkninger av olanzapin må følges; de er ikke en del av beregningen.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Aripiprazol 15 mg til olanzapin, startdato 7. desember 2026.* Inndata: startdose 15 mg; startdato 07.12.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** fra dag 1 (07.12.2026): 10 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 15 mg.
- *Aripiprazol 30 mg (høyeste dose) til olanzapin.* Inndata: startdose 30 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **fra:** fra dag 1: seponert
  - **til:** fra dag 1: 10 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 30 mg.
- *Aripiprazol 5 mg er under doseområdet ved schizofreni; regelen gjelder ikke.* Inndata: startdose 5 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Startdosen 5 mg er utenfor det regelen gjelder for (10–30 mg).
- *Fluvoksamin samtidig: regelen gjelder ikke.* Inndata: startdose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da.
- *Uten bekreftet spesialistvurdering og tett oppfølging stopper beregningen.* Inndata: startdose 15 mg; bekreftet: indikasjon, peroral_formulering; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.
- *Faktorene for langsom omsetning er ikke vurdert: ukjent stopper.* Inndata: startdose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, cyp1a2_hemmer nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Ol`.

## Fra aripiprazol til risperidon, direkte bytte

`antipsykotikabytte-aripiprazol-risperidon`, versjon 1, fingeravtrykk `e58d6781ad1de614911ac1fcc2bf8a72fedc7880e59f0d72503efc09eb2e2eed`. Direkte bytte: aripiprazol → risperidon. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Når det første antipsykotikumet er aripiprazol, kan byttet gjøres direkte: aripiprazol stoppes, og det nye startes dagen etter. Aripiprazol har svært lang halveringstid og ingen antikolinerg effekt.
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om direkte bytte)*
  - Halveringstiden til aripiprazol er om lag 75 timer, og 95 timer for den aktive metabolitten. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 1)*
- Et opphold uten antipsykotikum anbefales ikke.
  - I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om byttestrategier)*
- Et direkte bytte krever erfaring, gjøres helst der pasienten kan følges tett, og bør vurderes av psykiater.
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om bytte)*
- Ved schizofreni startes risperidon med 2 mg daglig og kan økes til 4 mg dag 2; deretter holdes dosen eller tilpasses. De fleste har effekt av 4–6 mg daglig.
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Risperidon kan gis én eller to ganger daglig.
  - Risperidon kan gis én eller to ganger daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Eldre, nedsatt nyre- eller leverfunksjon og sterke CYP2D6-hemmere eller CYP3A4-induktorer krever andre doser eller en ny vurdering av doseringen.
  - Eldre: anbefalt startdose er 0,5 mg to ganger daglig, med langsom økning til 1–2 mg to ganger daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
  - Ved nedsatt nyre- eller leverfunksjon bør start- og vedlikeholdsdosen halveres og opptrappingen gå langsommere. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2 og 4.4)*
  - Når en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin) startes eller seponeres, bør doseringen vurderes på nytt. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.5)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Aripiprazol seponeres uten nedtrapping dagen før risperidon startes (siste dose dagen før dag 1).
  - Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (direkte bytte))*
  - Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om direkte bytte)*
- Planen følger opptrappingen i preparatomtalen, 2 mg dag 1 og 4 mg fra dag 2, og slutter med 4 mg daglig. En langsommere opptrapping eller en annen dose innenfor 4–6 mg er en klinisk vurdering og beregnes ikke.
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Planen bruker bare risperidontabletter; miksturen har ingen dokumentert oppmåling i verktøyet. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (opptrapping) | trinn[0].mg | 2 mg | bindende krav | dmp-risperdal pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[0].dager | 1 dager | veiledende | dmp-risperdal pkt. 4.2 |
| til: fase 2 (vedlikehold) | dose.mg | 4 mg | veiledende | dmp-risperdal pkt. 4.2 |

**Betingelser:**

- Startdose 10–30 mg (bindende; ema-abilify section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. (ema-abilify section 4.2; dmp-risperdal pkt. 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. (dmp-risperdal pkt. 4.2)
- Unntak (`nedsatt_nyre_lever`): Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. (dmp-risperdal pkt. 4.2 og 4.4)
- Unntak (`risperidon_interaksjon`): Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. (dmp-risperdal pkt. 4.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral aripiprazol 10–30 mg daglig, det doseområdet preparatomtalen oppgir ved schizofreni.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.
- Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.
- Preparatomtalen sier at en langsommere opptrapping og lavere startdose kan være riktig for noen; det avgjøres klinisk.
- Ortostatisk blodtrykksfall tidlig i behandlingen, ekstrapyramidale bivirkninger og prolaktinøkning må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Aripiprazol 15 mg til risperidon, startdato 7. desember 2026.* Inndata: startdose 15 mg; startdato 07.12.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** dag 1 (07.12.2026): 2 mg; fra dag 2 (08.12.2026): 4 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 15 mg.
- *Aripiprazol 10 mg (laveste dose i området) til risperidon.* Inndata: startdose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 2 mg; fra dag 2: 4 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 10 mg.
- *Aripiprazol 40 mg er over høyeste dose; regelen gjelder ikke.* Inndata: startdose 40 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 40 mg er utenfor det regelen gjelder for (10–30 mg).
- *65 år eller eldre: regelen gjelder ikke.* Inndata: startdose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 ja, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre.
- *Uten bekreftelse av at aripiprazol er peroral (ikke Abilify Maintena) stopper beregningen.* Inndata: startdose 15 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker peroral aripiprazol, ikke depotinjeksjon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Rd`.

## Fra kariprazin til kvetiapin, direkte bytte

`antipsykotikabytte-kariprazin-kvetiapin`, versjon 1, fingeravtrykk `fa9ab3ddbb7e0f27e95a07c1400946b878c76e8066f8636a9472ce7132cc72ed`. Direkte bytte: kariprazin → kvetiapin. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres.
  - Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres. *([ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf), section 4.2 (bytte fra kariprazin))*
- Kariprazin og de aktive metabolittene faller med om lag 50 % på én uke, så virkningen avtar gradvis etter seponering.
  - Plasmakonsentrasjonen av kariprazin og de aktive metabolittene faller med om lag 50 % på én uke etter seponering; effekten avtar gradvis. *([ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf), section 4.2 og 5.2)*
- Kvetiapin med vanlig frisetting trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg.
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
- Tablettene med vanlig frisetting tas to ganger daglig.
  - Tablettene med vanlig frisetting tas to ganger daglig; ved schizofreni gjelder døgndosene dag 1–4 og vedlikeholdsdosen fordelt på to doser. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
- Et opphold uten antipsykotikum anbefales ikke.
  - I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om byttestrategier)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Kariprazin seponeres uten nedtrapping dagen før kvetiapin startes (siste dose dagen før dag 1).
  - Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres. *([ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf), section 4.2 (bytte fra kariprazin))*
  - Plasmakonsentrasjonen av kariprazin og de aktive metabolittene faller med om lag 50 % på én uke etter seponering; effekten avtar gradvis. *([ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf), section 4.2 og 5.2)*
- Planen følger opptrappingen ved schizofreni og slutter med 300 mg daglig fra dag 4, laveste anbefalte vedlikeholdsdose. Økning mot 450 mg eller en annen dose er en klinisk vurdering og beregnes ikke.
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
- Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter. Hver døgndose gis fordelt på to doser; kan den ikke fordeles med tablettene, stopper planen.
  - Tablettene med vanlig frisetting tas to ganger daglig; ved schizofreni gjelder døgndosene dag 1–4 og vedlikeholdsdosen fordelt på to doser. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (opptrapping) | trinn[0].mg | 50 mg | bindende krav | dmp-seroquel pkt. 4.2; ema-reagila section 4.2 (bytte fra kariprazin) |
| til: fase 1 (opptrapping) | trinn[0].dager | 1 dager | bindende krav | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[1].mg | 100 mg | bindende krav | dmp-seroquel pkt. 4.2; ema-reagila section 4.2 (bytte fra kariprazin) |
| til: fase 1 (opptrapping) | trinn[1].dager | 1 dager | bindende krav | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[2].mg | 200 mg | bindende krav | dmp-seroquel pkt. 4.2; ema-reagila section 4.2 (bytte fra kariprazin) |
| til: fase 1 (opptrapping) | trinn[2].dager | 1 dager | bindende krav | dmp-seroquel pkt. 4.2 |
| til: fase 2 (vedlikehold) | dose.mg | 300 mg | veiledende | dmp-seroquel pkt. 4.2 |

**Betingelser:**

- Startdose 1,5–6 mg (bindende; ema-reagila section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. (ema-reagila section 4.1; dmp-seroquel pkt. 4.2)
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. (dmp-seroquel pkt. 4.2 (eldre))
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. (dmp-seroquel pkt. 4.2 (nedsatt leverfunksjon))
- Unntak (`cyp3a4_hemmer`): Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. (dmp-seroquel pkt. 4.3)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker kariprazin 1,5–6 mg daglig.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Virkningen av kariprazin avtar over uker, så bivirkninger og effekt av kvetiapin kan først vurderes etter noen uker.
- Sedasjon og ortostatisk blodtrykksfall kan komme i opptrappingen av kvetiapin og må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Kariprazin 4,5 mg til kvetiapin, startdato 7. desember 2026.* Inndata: startdose 4,5 mg; startdato 07.12.2026; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** dag 1 (07.12.2026): 50 mg, fordelt på 2 doser; dag 2 (08.12.2026): 100 mg, fordelt på 2 doser; dag 3 (09.12.2026): 200 mg, fordelt på 2 doser; fra dag 4 (10.12.2026): 300 mg, fordelt på 2 doser
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,5–6 mg (bindende) – oppfylt. 4,5 mg.
- *Kariprazin 1,5 mg (laveste dose) til kvetiapin.* Inndata: startdose 1,5 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 50 mg, fordelt på 2 doser; dag 2: 100 mg, fordelt på 2 doser; dag 3: 200 mg, fordelt på 2 doser; fra dag 4: 300 mg, fordelt på 2 doser
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,5–6 mg (bindende) – oppfylt. 1,5 mg.
- *Kariprazin 9 mg er over høyeste dose; regelen gjelder ikke.* Inndata: startdose 9 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **Stoppet:** Startdosen 9 mg er utenfor det regelen gjelder for (1,5–6 mg).
- *Klaritromycin samtidig: kvetiapin er kontraindisert, og regelen gjelder ikke.* Inndata: startdose 3 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert.
- *Leverfunksjonen er ikke vurdert: ukjent stopper.* Inndata: startdose 3 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, cyp3a4_hemmer nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Qu`.
