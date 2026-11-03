# OUSFAR Verktøy – K3: regler for bytte av antipsykotikum

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-antipsykotikabytter` versjon 1, regelmodell 12, beregningsmotor 10. Byttereglene for antipsykotika i K3: komplette forløp til et definert sluttmål, bygget på preparatomtaler, Keks 2019 og TARC 2018. To depotrelaterte (Xeplion fra peroral risperidon og fra Risperdal Consta), tre perorale direkte bytter (aripiprazol til olanzapin og til risperidon, kariprazin til kvetiapin) og to kryss-titreringer til aripiprazol (fra olanzapin og fra risperidon, TARC 2018). Alle står til uavhengig faglig kontroll; ingen er klinisk godkjent.

**7 regler, 0 klinisk godkjent.** Utfallet av kontrollen: 7 ikke ferdig kontrollert. Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-k3-antipsykotika.md` og `docs/verktøy-klinisk-leveranseplan-2026-11.md` og `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `depot-risperidon-xeplion` | oppstart av depot | risperidon → paliperidon | beregnbar etter faglig avklaring | 1 | til faglig kontroll | 19 |
| `depot-consta-xeplion` | direkte bytte | risperidon → paliperidon | entydig beregnbar | 0 | til faglig kontroll | 7 |
| `antipsykotikabytte-aripiprazol-olanzapin` | direkte bytte | aripiprazol → olanzapin | beregnbar etter faglig avklaring | 1 | til faglig kontroll | 9 |
| `antipsykotikabytte-aripiprazol-risperidon` | direkte bytte | aripiprazol → risperidon | beregnbar etter faglig avklaring | 1 | til faglig kontroll | 8 |
| `antipsykotikabytte-kariprazin-kvetiapin` | direkte bytte | kariprazin → kvetiapin | entydig beregnbar | 0 | til faglig kontroll | 7 |
| `antipsykotikabytte-olanzapin-aripiprazol` | kryssnedtrapping | olanzapin → aripiprazol | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 11 |
| `antipsykotikabytte-risperidon-aripiprazol` | kryssnedtrapping | risperidon → aripiprazol | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 7 |

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
| [tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML) | oversiktsartikkel | Veznedaroglu B, Dilbaz N, Uzun O, Isik E. TARC: Turkish aripiprazole consensus report – aripiprazole use and switching from other antipsychotics to aripiprazole. Ther Adv Psychopharmacol 2018;8(10):271–285 | doi:10.1177/2045125318772712, PMC6130089 | `092efa4908d0d036…` |
| [russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML) | primærlitteratur | Russu A, Kern Sliwa J, Ravenstijn P, et al. Maintenance dose conversion between oral risperidone and paliperidone palmitate 1 month: practical guidance based on pharmacokinetic simulations. Int J Clin Pract 2018;72(6):e13089 | doi:10.1111/ijcp.13089, PMC6175146 | `c8999978cbd3f95f…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Fra peroral risperidon til Xeplion

`depot-risperidon-xeplion`, versjon 7, fingeravtrykk `53a7d2f4983b52bff4de0a596c51210e0c7aa7b3708bb7d1b6823e136fe18bfa`. Oppstart av depot: risperidon → paliperidon. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code) → utkast (versjon 3, 03.11.2026, Claude Code) → til faglig kontroll (versjon 3, 03.11.2026, Claude Code) → utkast (versjon 4, 03.11.2026, Claude Code) → til faglig kontroll (versjon 4, 03.11.2026, Claude Code) → utkast (versjon 5, 03.11.2026, Claude Code) → til faglig kontroll (versjon 5, 03.11.2026, Claude Code) → utkast (versjon 6, 03.11.2026, Claude Code) → til faglig kontroll (versjon 6, 03.11.2026, Claude Code) → utkast (versjon 7, 03.11.2026, Claude Code) → til faglig kontroll (versjon 7, 03.11.2026, Claude Code).

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
- Farmakokinetiske simuleringer fra produsenten gir omtrent samme eksponering ved 1, 2, 3, 4 og 6 mg risperidon daglig som ved 25, 50, 75, 100 og 150 mg Xeplion månedlig; de tar ikke hensyn til CYP2D6-hemmere eller CYP3A-induktorer.
  - Simuleringer: risperidon 1, 2, 3, 4 og 6 mg daglig gir omtrent samme eksponering ved steady state som Xeplion 25, 50, 75, 100 og 150 mg månedlig, også når døgndosen deles på to. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Results, tabell 1)*
  - Omregningen tar ikke hensyn til CYP2D6-hemmere (f.eks. paroksetin, sertralin, fluoksetin) eller CYP3A- og P-gp-induktorer (f.eks. karbamazepin). *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Discussion)*
- Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.
  - Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (nedsatt nyrefunksjon))*
  - Effekt og sikkerhet hos eldre over 65 år er ikke fastslått; eldre kan ha nedsatt nyrefunksjon som krever andre doser. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (eldre))*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR seponerer peroral risperidon dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.
  - Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Regelen gir bare en komplett plan med den anbefalte vedlikeholdsdosen 75 mg. Preparatomtalen har ingen omregning fra risperidondosen, og OUSFAR finner ikke på en, så regelen kan ikke stå for at en annen dose passer til pasientens risperidondose. En annen vedlikeholdsdose (25–150 mg etter toleranse og effekt, for eksempel høyere ved overvekt) stopper med beskjed om individuell planlegging, også med begrunnelse. Planen bruker bare styrker av Xeplion som finnes i FEST.
  - Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Pasienter med overvekt eller fedme kan trenge doser i den øvre delen av området. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Planen gjelder bare 3 mg risperidon daglig, der anbefalte 75 mg og simuleringene er enige (åpent OUSFAR-valg til kontrolløren). Ved 4–6 mg kan 75 mg gi for lav vedlikeholdseksponering, og de høyere dosene fra simuleringene (100 og 150 mg) tas ikke i bruk uten klinisk grunnlag; de stopper med beskjed om individuell planlegging. Lavere risperidondose, utilstrekkelig effekt, bivirkninger som har begrenset dosen, overvekt eller fedme og legemidler som endrer omsetningen av risperidon stopper også. Risperidondosen brukes ikke i beregningen.
  - Simuleringer: risperidon 1, 2, 3, 4 og 6 mg daglig gir omtrent samme eksponering ved steady state som Xeplion 25, 50, 75, 100 og 150 mg månedlig, også når døgndosen deles på to. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Results, tabell 1)*
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
  - Pasienter med overvekt eller fedme kan trenge doser i den øvre delen av området. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Omregningen tar ikke hensyn til CYP2D6-hemmere (f.eks. paroksetin, sertralin, fluoksetin) eller CYP3A- og P-gp-induktorer (f.eks. karbamazepin). *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Discussion)*
  - Studien er sponset av Janssen, og alle forfatterne er ansatt der og aksjonærer i morselskapet. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Disclosures)*
- Før injeksjonen dag 8 og før hver vedlikeholdsinjeksjon står et vurderingspunkt for symptomer, bivirkninger og reaksjoner etter injeksjonen.
  - Kliniske symptomer skal alltid vurderes ved bytte, og pasienten skal følges tett før og etter byttet. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Conclusion)*
  - Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om bytte)*
  - Vedlikeholdsdosen kan justeres månedlig; full effekt av en endret dose kan først sees etter flere måneder. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Positivt tilfelle, alle vilkår samtidig (åpent OUSFAR-valg til kontrolløren): voksen med schizofreni, stabil på 3 mg peroral risperidon daglig, tatt regelmessig, med god effekt og uten dosebegrensende bivirkninger, dokumentert tidligere toleranse, kreatininclearance minst 80 ml/min, ikke over 65 år, uten overvekt eller fedme og uten legemidler som endrer omsetningen av risperidon. Samme eksponering i gjennomsnitt er ikke en klinisk validering for den enkelte; derfor er vurderingen før hver injeksjon en del av planen.
  - Simuleringer: risperidon 1, 2, 3, 4 og 6 mg daglig gir omtrent samme eksponering ved steady state som Xeplion 25, 50, 75, 100 og 150 mg månedlig, også når døgndosen deles på to. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Results, tabell 1)*
  - Etterlevelse, effekt og toleranse er avgjørende når vedlikeholdsdosen velges. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Discussion)*
  - Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Når en individuell vurdering overstyrer planen: Planens 75 mg gjelder ikke lenger, og vedlikeholdsdosen vurderes individuelt, ved forverring eller tilbakefall av psykotiske symptomer, dosebegrensende eller ekstrapyramidale bivirkninger, overfølsomhet, nedsatt nyrefunksjon eller utviklet overvekt eller fedme. Dosen kan justeres månedlig, men full effekt av en endret dose kan først sees etter flere måneder.
  - Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Vedlikeholdsdosen kan justeres månedlig; full effekt av en endret dose kan først sees etter flere måneder. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Pasienter med overvekt eller fedme kan trenge doser i den øvre delen av området. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (nedsatt nyrefunksjon))*
  - Etterlevelse, effekt og toleranse er avgjørende når vedlikeholdsdosen velges. *([russu-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6175146/fullTextXML), Discussion)*

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

- Startdose 3 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Planen gjelder bare pasienter på 3 mg risperidon daglig, den eneste dosen der preparatomtalens anbefalte vedlikeholdsdose 75 mg og Russu 2018 er enige (3 mg risperidon gir omtrent samme eksponering som 75 mg Xeplion). Ved 4–6 mg tilsvarer 75 mg etter simuleringen en lavere eksponering enn dagens (4 mg ≈ 100 mg, 6 mg ≈ 150 mg), så 75 mg kan gi for lav vedlikeholdseksponering. OUSFAR tar ikke i bruk de høyere dosene fra simuleringen, fordi den er farmakokinetisk, sponset av produsenten og ikke prøvd ut på pasienter; de planlegges individuelt. Avgrensningen er OUSFARs og må avklares av kontrolløren. (bygger på russu-2018 Results, tabell 1; russu-2018 Disclosures; ema-xeplion section 4.2; dmp-risperdal pkt. 4.2; ema-xeplion section 4.2 (bytte fra peroral)))
- Måldose (må oppgis) 75 mg (bindende; ema-xeplion section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni og er stabilisert på peroral risperidon. (ema-xeplion section 4.1; ema-xeplion section 4.2 (bytte fra peroral))
- Må bekreftes (`tidligere_toleranse`): Det er dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet. Anafylaksi er likevel mulig etter injeksjon. (ema-xeplion section 4.1; ema-xeplion section 4.3 og 4.4)
- Må bekreftes (`effekt_toleranse`): Forskriveren har vurdert det konkrete forløpet: dagens risperidondose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den, og pasienten har tatt den regelmessig. Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt. (ema-xeplion section 4.2; ema-xeplion section 4.2; ema-xeplion section 4.2 (bytte fra peroral); russu-2018 Discussion)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. (ema-xeplion section 4.2 (nedsatt nyrefunksjon))
- Unntak (`over_65`): Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. (ema-xeplion section 4.2 (eldre))
- Unntak (`overvekt`): Pasienten har overvekt eller fedme; preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig. (ema-xeplion section 4.2)
- Unntak (`risperidon_interaksjon`): Pasienten bruker en CYP2D6-hemmer (f.eks. paroksetin, sertralin, fluoksetin) eller en CYP3A4-induktor (f.eks. karbamazepin); da sier risperidondosen ikke hvilken eksponering Xeplion må gi. (russu-2018 Discussion; dmp-risperdal pkt. 4.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral risperidon (tabletter eller mikstur) daglig.
- Forskriveren har vurdert nyrefunksjonen, alderen, vekten og de andre legemidlene og svart at kreatininclearance ikke er under 80 ml/min, at pasienten ikke er over 65 år, ikke har overvekt eller fedme og ikke bruker legemidler som endrer omsetningen av risperidon; ubesvart stopper beregningen.

**Usikkerhet:**

- Hvilken vedlikeholdsdose som gir samme effekt som pasientens risperidondose, sier preparatomtalen ikke. Russu 2018 sammenligner bare eksponering i simuleringer, er sponset av produsenten og er ikke prøvd ut på pasienter. At 75 mg passer ved 3 mg risperidon med god effekt og toleranse, er en avgrensning der kildene er enige, ikke en validert omregning; full effekt av en dose kan først sees etter flere måneder.
- Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotene er ikke kontrollert mot regelen og er ikke omfattet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Risperidon 3 mg, vedlikehold 75 mg, startdato 1. desember 2026.* Inndata: startdose 3 mg; måldose 75 mg; startdato 01.12.2026; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **fra:** fra dag 1 (01.12.2026): seponert
  - **til:** dag 1 (01.12.2026): 150 mg injeksjon, deltoideus; dag 8 (08.12.2026, ±4 dager): 100 mg injeksjon, deltoideus; hver måned fra 1 måned etter dag 8 (08.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har overvekt eller fedme; preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP2D6-hemmer (f.eks. paroksetin, sertralin, fluoksetin) eller en CYP3A4-induktor (f.eks. karbamazepin); da sier risperidondosen ikke hvilken eksponering Xeplion må gi. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på peroral risperidon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Det er dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet. Anafylaksi er likevel mulig etter injeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har vurdert det konkrete forløpet: dagens risperidondose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den, og pasienten har tatt den regelmessig. Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 3 mg (bindende) – oppfylt. 3 mg.
  - Kontroll: Måldosen er 75 mg (bindende) – oppfylt. 75 mg.
- *Risperidon 4 mg og vedlikehold 75 mg: etter simuleringene gir 75 mg lavere eksponering enn dagens dose (4 mg ≈ 100 mg), så ingen komplett plan.* Inndata: startdose 4 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 4 mg er utenfor det regelen gjelder for (3 mg).
- *Risperidon 6 mg og vedlikehold 75 mg: etter simuleringene tilsvarer 6 mg omtrent 150 mg, så 75 mg kan gi for lav eksponering og ingen komplett plan.* Inndata: startdose 6 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 6 mg er utenfor det regelen gjelder for (3 mg).
- *Risperidon 6 mg og vedlikehold 150 mg med begrunnelse: simuleringens dose tas ikke i bruk, så ingen komplett plan.* Inndata: startdose 6 mg; måldose 150 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei; begrunnelse: «Syntetisk eksempel.».
  - **Stoppet:** Startdosen 6 mg er utenfor det regelen gjelder for (3 mg).; Måldosen 150 mg er utenfor det regelen gjelder for (75 mg).
- *Risperidon 3 mg og vedlikehold 50 mg med begrunnelse: en annen dose enn 75 mg planlegges individuelt.* Inndata: startdose 3 mg; måldose 50 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei; begrunnelse: «Syntetisk eksempel.».
  - **Stoppet:** Måldosen 50 mg er utenfor det regelen gjelder for (75 mg).
- *Risperidon 0,5 mg: 75 mg kan ikke antas å passe ved en så lav dose, så ingen komplett plan.* Inndata: startdose 0,5 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 0,5 mg er utenfor det regelen gjelder for (3 mg).
- *Risperidon 2,5 mg, rett under avgrensningen: 75 mg kan gi høyere eksponering enn dagens dose, så ingen komplett plan.* Inndata: startdose 2,5 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 2,5 mg er utenfor det regelen gjelder for (3 mg).
- *Risperidon 3,5 mg, rett over avgrensningen: ingen komplett plan.* Inndata: startdose 3,5 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 3,5 mg er utenfor det regelen gjelder for (3 mg).
- *Risperidon 16 mg (høyeste dose preparatomtalen vurderer): 75 mg kan ikke antas å passe, så ingen komplett plan.* Inndata: startdose 16 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 16 mg er utenfor det regelen gjelder for (3 mg).
- *Uten bekreftet god effekt og toleranse av dagens dose stopper beregningen.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Forskriveren har vurdert det konkrete forløpet: dagens risperidondose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den, og pasienten har tatt den regelmessig. Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt.
- *Overvekt eller fedme: høyere dose kan trengs, så regelen gjelder ikke.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt ja, risperidon_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har overvekt eller fedme; preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig.
- *CYP2D6-hemmer eller CYP3A4-induktor: risperidondosen sier ikke hvilken eksponering Xeplion må gi, så regelen gjelder ikke.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker en CYP2D6-hemmer (f.eks. paroksetin, sertralin, fluoksetin) eller en CYP3A4-induktor (f.eks. karbamazepin); da sier risperidondosen ikke hvilken eksponering Xeplion må gi.
- *Uten dokumentert tidligere toleranse stopper beregningen.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Det er dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet. Anafylaksi er likevel mulig etter injeksjon.
- *Uten valgt vedlikeholdsdose: beregningen velger ikke selv.* Inndata: startdose 3 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *Vedlikehold 175 mg er over området i preparatomtalen.* Inndata: startdose 3 mg; måldose 175 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Måldosen 175 mg er utenfor det regelen gjelder for (75 mg).
- *Risperidon 20 mg er over det preparatomtalen anbefaler.* Inndata: startdose 20 mg; måldose 150 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 20 mg er utenfor det regelen gjelder for (3 mg).; Måldosen 150 mg er utenfor det regelen gjelder for (75 mg).
- *Kreatininclearance under 80 ml/min: regelen gjelder ikke.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon ja, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.
- *Alderen er ikke vurdert: ukjent stopper like mye som over 65 år.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: indikasjon, tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen.
- *Uten bekreftet stabilisering og toleranse stopper beregningen.* Inndata: startdose 3 mg; måldose 75 mg; bekreftet: tidligere_toleranse, effekt_toleranse; pasientforhold: nedsatt_nyrefunksjon nei, over_65 nei, overvekt nei, risperidon_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på peroral risperidon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Rd>Dp`.

## Fra Risperdal Consta til Xeplion

`depot-consta-xeplion`, versjon 2, fingeravtrykk `50331d718d099015b067807385c0ca26b34922f6cfafda4223f986f663a9670d`. Direkte bytte: risperidon → paliperidon. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code).

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

`antipsykotikabytte-aripiprazol-olanzapin`, versjon 2, fingeravtrykk `b7c629b29ef0c22249954bb9d26917e445189f60d97be1cbfa8e08fcc7ba72d7`. Direkte bytte: aripiprazol → olanzapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code).

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
- Startdosen (10 mg fra dag 1) og den terapeutiske måldosen er atskilt. Forskriveren velger måldosen innenfor 5–20 mg ut fra klinisk vurdering; planen holder 10 mg til en ny vurdering og slutter på måldosen. Hvor lenge startdosen holdes, er et åpent OUSFAR-valg (forslag: én uke).
  - Schizofreni: anbefalt startdose er 10 mg daglig. Dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (opptrapping) | trinn[0].mg | 10 mg | bindende krav | ema-zyprexa section 4.2 |
| til: fase 1 (opptrapping) | trinn[0].dager | 7 dager (forskriveren kan velge minst 1 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, åpent forslag:** OUSFARs valg: én uke på startregimet før olanzapin endres til den valgte måldosen, slik at effekt og bivirkninger kan vurderes etter at aripiprazol er stoppet (aripiprazol virker i flere dager etter siste dose). Preparatomtalen gir ingen fast tid, bare en ny klinisk vurdering. (bygger på ema-zyprexa section 4.2; keks-2019 tabell 1) |

**Betingelser:**

- Startdose 10–30 mg (bindende; ema-abilify section 4.2)
- Måldose (må oppgis) 5–20 mg (bindende; ema-zyprexa section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. (ema-abilify section 4.2; ema-zyprexa section 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`nedsatt_nyre_lever`): Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`langsom_omsetning`): Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. (ema-zyprexa section 4.2)
- Unntak (`cyp1a2_hemmer`): Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. (ema-zyprexa section 4.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.
- Indikasjonen er schizofreni; ved andre indikasjoner (for eksempel mani) gjelder andre startdoser, og regelen passer ikke.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.
- Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.
- Sedasjon, vektøkning og metabolske bivirkninger av olanzapin må følges; de er ikke en del av beregningen.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Aripiprazol 15 mg til olanzapin, startdato 7. desember 2026.* Inndata: startdose 15 mg; måldose 15 mg; startdato 07.12.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** dag 1–7 (07.12.2026–13.12.2026): 10 mg; fra dag 8 (14.12.2026): 15 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Måldosen er 5–20 mg (bindende) – oppfylt. 15 mg.
- *Aripiprazol 30 mg (høyeste dose) til olanzapin, måldose 20 mg.* Inndata: startdose 30 mg; måldose 20 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1–7: 10 mg; fra dag 8: 20 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Måldosen er 5–20 mg (bindende) – oppfylt. 20 mg.
- *Måldosen er startdosen, 10 mg.* Inndata: startdose 10 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **fra:** fra dag 1: seponert
  - **til:** fra dag 1: 10 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 5–20 mg (bindende) – oppfylt. 10 mg.
- *Uten valgt måldose: beregningen velger ikke selv.* Inndata: startdose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.
- *Måldose 25 mg er over preparatomtalens område.* Inndata: startdose 15 mg; måldose 25 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Måldosen 25 mg er utenfor det regelen gjelder for (5–20 mg).
- *Aripiprazol 5 mg er under doseområdet ved schizofreni; regelen gjelder ikke.* Inndata: startdose 5 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Startdosen 5 mg er utenfor det regelen gjelder for (10–30 mg).
- *Fluvoksamin samtidig: regelen gjelder ikke.* Inndata: startdose 15 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da.
- *Uten bekreftet spesialistvurdering og tett oppfølging stopper beregningen.* Inndata: startdose 15 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, langsom_omsetning nei, cyp1a2_hemmer nei.
  - **Stoppet:** Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.
- *Faktorene for langsom omsetning er ikke vurdert: ukjent stopper.* Inndata: startdose 15 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, cyp1a2_hemmer nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Ol`.

## Fra aripiprazol til risperidon, direkte bytte

`antipsykotikabytte-aripiprazol-risperidon`, versjon 2, fingeravtrykk `a9c3da419c224d6326e4af5bdfbfc4df76b829358a237f4cd0a947b9d60e6384`. Direkte bytte: aripiprazol → risperidon. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code).

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
- Planen følger opptrappingen i preparatomtalen, 2 mg dag 1 og 4 mg fra dag 2. Startregimet og den terapeutiske måldosen er atskilt: forskriveren velger måldosen (høyst 16 mg), og en måldose utenfor 4–6 mg krever en skriftlig begrunnelse. Planen holder 4 mg til en ny vurdering og slutter på måldosen. Hvor lenge 4 mg holdes, er et åpent OUSFAR-valg (forslag: én uke). En langsommere opptrapping er en klinisk vurdering og beregnes ikke.
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
  - Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Planen bruker risperidontabletter eller smeltetabletter; miksturen har ingen dokumentert oppmåling i verktøyet. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (opptrapping) | trinn[0].mg | 2 mg | bindende krav | dmp-risperdal pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[0].dager | 1 dager | veiledende | dmp-risperdal pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[1].mg | 4 mg | veiledende | dmp-risperdal pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[1].dager | 7 dager (forskriveren kan velge minst 1 dager, av tekniske grunner høyst 365 dager) | veiledende | **OUSFAR-vurdering, åpent forslag:** OUSFARs valg: én uke på startregimet før risperidon endres til den valgte måldosen, slik at effekt og bivirkninger kan vurderes etter at aripiprazol er stoppet (aripiprazol virker i flere dager etter siste dose). Preparatomtalen gir ingen fast tid, bare en ny klinisk vurdering. (bygger på dmp-risperdal pkt. 4.2; keks-2019 tabell 1) |

**Betingelser:**

- Startdose 10–30 mg (bindende; ema-abilify section 4.2)
- Måldose (må oppgis) høyst 16 mg (bindende; dmp-risperdal pkt. 4.2)
- Måldose (må oppgis) 4–6 mg (forsiktighetsgrense: utenfor krever begrunnelse; dmp-risperdal pkt. 4.2; dmp-risperdal pkt. 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. (ema-abilify section 4.2; dmp-risperdal pkt. 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. (dmp-risperdal pkt. 4.2)
- Unntak (`nedsatt_nyre_lever`): Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. (dmp-risperdal pkt. 4.2 og 4.4)
- Unntak (`risperidon_interaksjon`): Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. (dmp-risperdal pkt. 4.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.
- Indikasjonen er schizofreni; ved mani gjelder en annen dosering, og regelen passer ikke.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.
- Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.
- Preparatomtalen sier at en langsommere opptrapping og lavere startdose kan være riktig for noen; det avgjøres klinisk.
- Ortostatisk blodtrykksfall tidlig i behandlingen, ekstrapyramidale bivirkninger og prolaktinøkning må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Aripiprazol 15 mg til risperidon, startdato 7. desember 2026.* Inndata: startdose 15 mg; måldose 6 mg; startdato 07.12.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** dag 1 (07.12.2026): 2 mg; dag 2–8 (08.12.2026–14.12.2026): 4 mg; fra dag 9 (15.12.2026): 6 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 15 mg.
  - Kontroll: Måldosen er høyst 16 mg (bindende) – oppfylt. 6 mg.
  - Kontroll: Måldosen er 4–6 mg (forsiktighetsgrense) – oppfylt. 6 mg.
- *Aripiprazol 10 mg (laveste dose i området) til risperidon.* Inndata: startdose 10 mg; måldose 4 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 2 mg; fra dag 2: 4 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er høyst 16 mg (bindende) – oppfylt. 4 mg.
  - Kontroll: Måldosen er 4–6 mg (forsiktighetsgrense) – oppfylt. 4 mg.
- *Måldose 8 mg med skriftlig begrunnelse.* Inndata: startdose 30 mg; måldose 8 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei; begrunnelse: «Syntetisk eksempel: tidligere god effekt av 8 mg uten bivirkninger.».
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 2 mg; dag 2–8: 4 mg; fra dag 9: 8 mg
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–30 mg (bindende) – oppfylt. 30 mg.
  - Kontroll: Måldosen er høyst 16 mg (bindende) – oppfylt. 8 mg.
  - Kontroll: Måldosen er 4–6 mg (forsiktighetsgrense) – oppfylt. 8 mg; forskriverens begrunnelse: «Syntetisk eksempel: tidligere god effekt av 8 mg uten bivirkninger.».
- *Måldose 8 mg uten begrunnelse stopper.* Inndata: startdose 30 mg; måldose 8 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Måldosen 8 mg er over forsiktighetsgrensen (4–6 mg) og krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.
- *Måldose 20 mg er over det preparatomtalen anbefaler, også med begrunnelse.* Inndata: startdose 15 mg; måldose 20 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei; begrunnelse: «Syntetisk eksempel.».
  - **Stoppet:** Måldosen 20 mg er utenfor det regelen gjelder for (høyst 16 mg).
- *Aripiprazol 40 mg er over høyeste dose; regelen gjelder ikke.* Inndata: startdose 40 mg; måldose 4 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Startdosen 40 mg er utenfor det regelen gjelder for (10–30 mg).
- *65 år eller eldre: regelen gjelder ikke.* Inndata: startdose 15 mg; måldose 4 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: alder_65 ja, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre.
- *Uten bekreftelse av at aripiprazol er peroral (ikke Abilify Maintena) stopper beregningen.* Inndata: startdose 15 mg; måldose 4 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_nyre_lever nei, risperidon_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker peroral aripiprazol (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Rd`.

## Fra kariprazin til kvetiapin, direkte bytte

`antipsykotikabytte-kariprazin-kvetiapin`, versjon 2, fingeravtrykk `09114419f8a12518ce597baba4388eccc821d3eff0472fd07a9d92f0b154dc71`. Direkte bytte: kariprazin → kvetiapin. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code).

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
- Dagens dose må være en dose kapslene gir og opptrappingen i trinn på 1,5 mg når: 1,5, 3, 4,5 eller 6 mg. Andre doser stopper.
  - Anbefalt startdose er 1,5 mg én gang daglig, med langsom økning i trinn på 1,5 mg til høyst 6 mg daglig. *([ema-reagila](https://www.ema.europa.eu/en/documents/product-information/reagila-epar-product-information_en.pdf), section 4.2)*
- Planen følger opptrappingen ved schizofreni og slutter med 300 mg daglig fra dag 4, den laveste dosen i det vanlige effektive området. Sluttmålet er et definert mål som forskriveren bekrefter er forsvarlig for pasienten; økning mot 450 mg eller en annen dose innenfor 150–750 mg er en ny klinisk vurdering og beregnes ikke, fordi preparatomtalen ikke gir trinn eller tid for den.
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

- Startdose 1,5, 3, 4,5, 6 mg (bindende; ema-reagila section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. (ema-reagila section 4.1; dmp-seroquel pkt. 4.2)
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Må bekreftes (`sluttmal_300`): Sluttmålet er 300 mg kvetiapin daglig fra dag 4, den laveste dosen i det vanlige effektive området ved schizofreni (300–450 mg), og det er vurdert som forsvarlig for denne pasienten. En annen vedlikeholdsdose (150–750 mg) etter effekt og toleranse er en ny klinisk vurdering som planen ikke beregner, og pasienten følges tett mens virkningen av kariprazin avtar over uker. (dmp-seroquel pkt. 4.2; ema-reagila section 4.2 og 5.2)
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. (dmp-seroquel pkt. 4.2 (eldre))
- Unntak (`nedsatt_leverfunksjon`): Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. (dmp-seroquel pkt. 4.2 (nedsatt leverfunksjon))
- Unntak (`cyp3a4_hemmer`): Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. (dmp-seroquel pkt. 4.3)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker kariprazin 1,5, 3, 4,5 eller 6 mg daglig.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Virkningen av kariprazin avtar over uker, så bivirkninger og effekt av kvetiapin kan først vurderes etter noen uker.
- Sedasjon og ortostatisk blodtrykksfall kan komme i opptrappingen av kvetiapin og må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Kariprazin 4,5 mg til kvetiapin, startdato 7. desember 2026.* Inndata: startdose 4,5 mg; startdato 07.12.2026; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **fra:** fra dag 1 (07.12.2026): seponert
  - **til:** dag 1 (07.12.2026): 50 mg, fordelt på 2 doser; dag 2 (08.12.2026): 100 mg, fordelt på 2 doser; dag 3 (09.12.2026): 200 mg, fordelt på 2 doser; fra dag 4 (10.12.2026): 300 mg, fordelt på 2 doser
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Sluttmålet er 300 mg kvetiapin daglig fra dag 4, den laveste dosen i det vanlige effektive området ved schizofreni (300–450 mg), og det er vurdert som forsvarlig for denne pasienten. En annen vedlikeholdsdose (150–750 mg) etter effekt og toleranse er en ny klinisk vurdering som planen ikke beregner, og pasienten følges tett mens virkningen av kariprazin avtar over uker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,5, 3, 4,5, 6 mg (bindende) – oppfylt. 4,5 mg.
- *Kariprazin 1,5 mg (laveste dose) til kvetiapin.* Inndata: startdose 1,5 mg; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 50 mg, fordelt på 2 doser; dag 2: 100 mg, fordelt på 2 doser; dag 3: 200 mg, fordelt på 2 doser; fra dag 4: 300 mg, fordelt på 2 doser
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Sluttmålet er 300 mg kvetiapin daglig fra dag 4, den laveste dosen i det vanlige effektive området ved schizofreni (300–450 mg), og det er vurdert som forsvarlig for denne pasienten. En annen vedlikeholdsdose (150–750 mg) etter effekt og toleranse er en ny klinisk vurdering som planen ikke beregner, og pasienten følges tett mens virkningen av kariprazin avtar over uker. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 1,5, 3, 4,5, 6 mg (bindende) – oppfylt. 1,5 mg.
- *Kariprazin 2 mg er ingen dose kapslene gir (1,5, 3, 4,5 eller 6 mg).* Inndata: startdose 2 mg; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **Stoppet:** Startdosen 2 mg er utenfor det regelen gjelder for (1,5, 3, 4,5, 6 mg).
- *Kariprazin 9 mg er over høyeste dose; regelen gjelder ikke.* Inndata: startdose 9 mg; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **Stoppet:** Startdosen 9 mg er utenfor det regelen gjelder for (1,5, 3, 4,5, 6 mg).
- *Uten bekreftelse av at 300 mg er et forsvarlig sluttmål for pasienten stopper beregningen.* Inndata: startdose 3 mg; bekreftet: indikasjon, spesialist_risiko; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer nei.
  - **Stoppet:** Må bekreftes før beregning: Sluttmålet er 300 mg kvetiapin daglig fra dag 4, den laveste dosen i det vanlige effektive området ved schizofreni (300–450 mg), og det er vurdert som forsvarlig for denne pasienten. En annen vedlikeholdsdose (150–750 mg) etter effekt og toleranse er en ny klinisk vurdering som planen ikke beregner, og pasienten følges tett mens virkningen av kariprazin avtar over uker.
- *Klaritromycin samtidig: kvetiapin er kontraindisert, og regelen gjelder ikke.* Inndata: startdose 3 mg; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, nedsatt_leverfunksjon nei, cyp3a4_hemmer ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert.
- *Leverfunksjonen er ikke vurdert: ukjent stopper.* Inndata: startdose 3 mg; bekreftet: indikasjon, spesialist_risiko, sluttmal_300; pasientforhold: alder_65 nei, cyp3a4_hemmer nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Qu`.

## Fra olanzapin til aripiprazol, kryss-titrering

`antipsykotikabytte-olanzapin-aripiprazol`, versjon 6, fingeravtrykk `d034ac11db3851828f7e31fcf74256cb89b8caffa74889fbc9f6539641ac3116`. Kryssnedtrapping: olanzapin → aripiprazol. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code) → utkast (versjon 3, 03.11.2026, Claude Code) → til faglig kontroll (versjon 3, 03.11.2026, Claude Code) → utkast (versjon 4, 03.11.2026, Claude Code) → til faglig kontroll (versjon 4, 03.11.2026, Claude Code) → utkast (versjon 5, 03.11.2026, Claude Code) → til faglig kontroll (versjon 5, 03.11.2026, Claude Code) → utkast (versjon 6, 03.11.2026, Claude Code) → til faglig kontroll (versjon 6, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Aripiprazol legges til dagens behandling med 2,5–5 mg daglig første uke, 5–10 mg andre uke og 10–15 mg fra slutten av andre uke.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Når måldosen er nådd, brukes begge i minst 2 uker; deretter trappes olanzapin ned med 25 % av dosen minst hver 2. uke til det er stoppet.
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt; ved gjentatte tilbakefall og hos innlagte anbefales en annen.
  - Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt av dagens behandling. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Ved tidligere gjentatte psykotiske tilbakefall og hos innlagte anbefales en annen opptrapping, med høyere startdose og måldose. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3))*
- Under kryss-titrering trappes det første antipsykotikumet ned mens det neste innføres; de fleste psykiatere bruker denne strategien.
  - De fleste psykiatere bruker kryss-titrering: det første antipsykotikumet trappes ned mens det neste innføres. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om kryss-titrering)*
- Overlappet (det forrige holdes uendret til aripiprazol er på måldosen, og trappes så ned) tilsvarer den mest forsiktige strategien i Keks 2019, egnet ved høy risiko for tilbakefall.
  - Den mest forsiktige strategien, egnet ved høy risiko for tilbakefall: det første holdes i vanlig dose mens det neste trappes opp nær terapeutisk dose, så trappes det første ned og stoppes. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (fortsettelse med langsommere opptrapping))*
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Seponering av olanzapin: Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne. Kolinergt seponeringssyndrom (blant annet ved olanzapin): kvalme, oppkast, hodepine, uro, angst, søvnløshet, tretthet, muskelsmerter, svetting og løs avføring.
  - Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2 og 4.4)*
  - Kolinergt seponeringssyndrom (blant annet ved olanzapin): kvalme, oppkast, hodepine, uro, angst, søvnløshet, tretthet, muskelsmerter, svetting og løs avføring. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 2)*
- Får pasienten plager under byttet, kan nedtrappingen av det forrige antipsykotikumet gå langsommere.
  - Uønskede symptomer under byttet kan komme fra seponeringen av det forrige antipsykotikumet eller fra aripiprazol; ved noen av dem anbefales det å trappe ned det forrige langsommere. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet og tabellen om plager under byttet)*
- Pasienten følges tett under byttet, som bør vurderes av psykiater.
  - Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om vurdering før bytte)*
  - Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om bytte)*
- Doseområdet er 5–20 mg daglig.
  - Doseområdet er 5–20 mg daglig. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*
- Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne.
  - Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2 og 4.4)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Aripiprazol foreslås som 5 mg den første uken og 10 mg den andre, øverst i kildens områder, fordi den laveste tablettstyrken i FEST er 5 mg og ikke er delbar; forskriveren kan velge 2,5 mg (mikstur) og 5–10 mg. Måldosen 10 eller 15 mg velges av forskriveren.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Olanzapin holdes uendret i 28 dager: 14 dagers opptrapping og 14 dager sammen med aripiprazol på måldosen. Første reduksjon er dag 29, og hver reduksjon står i minst 14 dager.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Planen gjelder bare startdosen i kildens eget eksempel, 20 mg (åpent OUSFAR-valg til kontrolløren), så hvert trinn, også siste dose før seponering, er kildens: 20 → 15 → 10 → 5 mg og så stopp, hvert trinn i minst 14 dager. Andre startdoser stopper, fordi kilden ikke viser hvordan de skal trappes ned når trinnene ikke kan gis med tablettene, og OUSFAR legger ikke inn egne lavdosetrinn som ikke er validert.
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Doseområdet er 5–20 mg daglig. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2)*
- Siste trinn til 0 er hele dosen som gjenstår. Det krever en egen vurdering av pasienten, stopper ved tidligere seponeringsplager, og pasienten vurderes før hver reduksjon, før siste trinn og etter seponeringen (forslag: 14 dager etter).
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om vurdering før bytte)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (hold) | varighet.dager | 28 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| fra: fase 2 (nedtrapping) | strategi.prosent | 25 % | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| fra: fase 2 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| til: fase 1 (opptrapping) | trinn[0].mg | 5 mg (forskriveren kan velge 2,5–5 mg) | veiledende | **OUSFAR-vurdering, åpent forslag:** Valgt innenfor TARC-området 2,5–5 mg første uke; forskriveren kan velge en annen dose i området. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)) |
| til: fase 1 (opptrapping) | trinn[0].dager | 7 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| til: fase 1 (opptrapping) | trinn[1].mg | 10 mg (forskriveren kan velge 5–10 mg) | veiledende | **OUSFAR-vurdering, åpent forslag:** Valgt innenfor TARC-området 5–10 mg andre uke; forskriveren kan velge en annen dose i området. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)) |
| til: fase 1 (opptrapping) | trinn[1].dager | 7 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |

**Betingelser:**

- Startdose 20 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Planen gjelder bare 20 mg olanzapin daglig, startdosen i kildens eget eksempel (20 → 15 → 10 → 5 mg og så stopp), slik at hvert trinn og siste dose før seponering står i kilden. Kilden knytter ikke eksemplene til et bestemt stoff; at dosen gjelder olanzapin, er OUSFARs avgrensning innenfor preparatomtalens doseområde og må avklares av kontrolløren. Andre startdoser og egne lavdosetrinn er ikke validert og stopper. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); ema-zyprexa section 4.2))
- Måldose (må oppgis) 10, 15 mg (bindende; tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); ema-abilify section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra olanzapin på grunn av bivirkninger eller utilstrekkelig effekt. (tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); ema-abilify section 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral olanzapin (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Må bekreftes (`siste_trinn`): Siste trinn er vurdert for denne pasienten: olanzapin seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. (tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om vurdering før bytte; keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 2; ema-zyprexa section 4.2 og 4.4; keks-2019 tabell 2)
- Unntak (`tilbakefall_innlagt`): Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. (tarc-2018 avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. (ema-abilify section 4.2 (eldre))
- Unntak (`cyp_aripiprazol`): Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. (ema-abilify section 4.2 og 4.5)
- Unntak (`seponeringsplager`): Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av olanzapin; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. (tarc-2018 avsnittet om vurdering før bytte; ema-zyprexa section 4.2 og 4.4; keks-2019 tabell 2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral olanzapin som eneste antipsykotikum, i en stabil dose.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Opptrappingen bygger på en konsensusrapport fra et ekspertpanel (lavt evidensnivå), og konsensusmøtet var finansiert av et legemiddelfirma. Rapporten nevner selv at raske bytter også er brukt i studier.
- Hvor lenge hvert trinn skal vare ut over minstetiden, og om nedtrappingen skal stoppes eller reverseres ved forverring, er en klinisk vurdering som ikke beregnes.
- Aripiprazol kan gi uro og akatisi tidlig; når dopaminblokkeringen fra det forrige stoffet avtar, kan symptomer komme tilbake, og det må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Olanzapin 20 mg, aripiprazol til 15 mg, startdato 1. desember 2026.* Inndata: startdose 20 mg; måldose 15 mg; startdato 01.12.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **fra:** dag 1–28 (01.12.2026–28.12.2026): 20 mg; dag 29–42 (29.12.2026–11.01.2027): 15 mg; dag 43–56 (12.01.2027–25.01.2027): 10 mg; dag 57–70 (26.01.2027–08.02.2027): 5 mg; fra dag 71 (09.02.2027): seponert
  - **til:** dag 1–7 (01.12.2026–07.12.2026): 5 mg; dag 8–14 (08.12.2026–14.12.2026): 10 mg; fra dag 15 (15.12.2026): 15 mg
  - Kontroll: Avkreftet: Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av olanzapin; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra olanzapin på grunn av bivirkninger eller utilstrekkelig effekt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Siste trinn er vurdert for denne pasienten: olanzapin seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 10, 15 mg (bindende) – oppfylt. 15 mg.
- *Olanzapin 20 mg, aripiprazol til 10 mg.* Inndata: startdose 20 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **fra:** dag 1–28: 20 mg; dag 29–42: 15 mg; dag 43–56: 10 mg; dag 57–70: 5 mg; fra dag 71: seponert
  - **til:** dag 1–7: 5 mg; fra dag 8: 10 mg
  - Kontroll: Avkreftet: Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av olanzapin; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra olanzapin på grunn av bivirkninger eller utilstrekkelig effekt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Siste trinn er vurdert for denne pasienten: olanzapin seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 10, 15 mg (bindende) – oppfylt. 10 mg.
- *Olanzapin 10 mg: kilden viser ikke forløpet fra denne dosen, og siste trinn (2,5 mg til 0) er ikke validert, så ingen komplett plan.* Inndata: startdose 10 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 10 mg er utenfor det regelen gjelder for (20 mg).
- *Tidligere seponeringsplager eller forverring ved dosereduksjon av olanzapin: regelen kan ikke stå for siste trinn til 0, og planen stopper.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av olanzapin; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt.
- *Uten bekreftet vurdering av siste trinn til 0 stopper beregningen.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Må bekreftes før beregning: Siste trinn er vurdert for denne pasienten: olanzapin seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt.
- *Olanzapin 15 mg: 11,25 mg kan ikke gis med tablettene, og kilden viser ikke hvordan det skal trappes ned, så ingen komplett plan.* Inndata: startdose 15 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 15 mg er utenfor det regelen gjelder for (20 mg).
- *Måldose 20 mg er over kildens område for dette bytte (10–15 mg).* Inndata: startdose 20 mg; måldose 20 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Måldosen 20 mg er utenfor det regelen gjelder for (10, 15 mg).
- *Olanzapin 25 mg er over preparatomtalens doseområde.* Inndata: startdose 25 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 25 mg er utenfor det regelen gjelder for (20 mg).
- *Gjentatte tilbakefall eller innlagt: en annen opptrapping, ikke omfattet.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt ja, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet.
- *CYP-hemmere og -induktorer er ikke vurdert: ukjent stopper.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres.; Må avklares før beregning (ukjent): Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av olanzapin; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt.
- *Uten bekreftet spesialistvurdering stopper beregningen.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.; Må bekreftes før beregning: Siste trinn er vurdert for denne pasienten: olanzapin seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Ol>Pa`.

## Fra risperidon til aripiprazol, kryss-titrering

`antipsykotikabytte-risperidon-aripiprazol`, versjon 6, fingeravtrykk `a2a1dbbed279609cf8ab0d027e4b2afd1c66c62908bf64936d6be43d960c407a`. Kryssnedtrapping: risperidon → aripiprazol. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code) → utkast (versjon 3, 03.11.2026, Claude Code) → til faglig kontroll (versjon 3, 03.11.2026, Claude Code) → utkast (versjon 4, 03.11.2026, Claude Code) → til faglig kontroll (versjon 4, 03.11.2026, Claude Code) → utkast (versjon 5, 03.11.2026, Claude Code) → til faglig kontroll (versjon 5, 03.11.2026, Claude Code) → utkast (versjon 6, 03.11.2026, Claude Code) → til faglig kontroll (versjon 6, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Aripiprazol legges til dagens behandling med 2,5–5 mg daglig første uke, 5–10 mg andre uke og 10–15 mg fra slutten av andre uke.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Når måldosen er nådd, brukes begge i minst 2 uker; deretter trappes risperidon ned med 25 % av dosen minst hver 2. uke til det er stoppet.
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt; ved gjentatte tilbakefall og hos innlagte anbefales en annen.
  - Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt av dagens behandling. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Ved tidligere gjentatte psykotiske tilbakefall og hos innlagte anbefales en annen opptrapping, med høyere startdose og måldose. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3))*
- Under kryss-titrering trappes det første antipsykotikumet ned mens det neste innføres; de fleste psykiatere bruker denne strategien.
  - De fleste psykiatere bruker kryss-titrering: det første antipsykotikumet trappes ned mens det neste innføres. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om kryss-titrering)*
- Overlappet (det forrige holdes uendret til aripiprazol er på måldosen, og trappes så ned) tilsvarer den mest forsiktige strategien i Keks 2019, egnet ved høy risiko for tilbakefall.
  - Den mest forsiktige strategien, egnet ved høy risiko for tilbakefall: det første holdes i vanlig dose mens det neste trappes opp nær terapeutisk dose, så trappes det første ned og stoppes. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 (fortsettelse med langsommere opptrapping))*
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Seponering av risperidon: Ved seponering anbefales gradvis nedtrapping. Akutt abstinens (kvalme, oppkast, svette, søvnløshet) er svært sjelden etter brå stans av høye doser; tilbakefall av psykose og akatisi, dystoni og dyskinesi er rapportert.
  - Ved seponering anbefales gradvis nedtrapping. Akutt abstinens (kvalme, oppkast, svette, søvnløshet) er svært sjelden etter brå stans av høye doser; tilbakefall av psykose og akatisi, dystoni og dyskinesi er rapportert. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Får pasienten plager under byttet, kan nedtrappingen av det forrige antipsykotikumet gå langsommere.
  - Uønskede symptomer under byttet kan komme fra seponeringen av det forrige antipsykotikumet eller fra aripiprazol; ved noen av dem anbefales det å trappe ned det forrige langsommere. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet og tabellen om plager under byttet)*
- Pasienten følges tett under byttet, som bør vurderes av psykiater.
  - Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om vurdering før bytte)*
  - Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om bytte)*
- Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig.
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke.
  - Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Aripiprazol foreslås som 5 mg den første uken og 10 mg den andre, øverst i kildens områder, fordi den laveste tablettstyrken i FEST er 5 mg og ikke er delbar; forskriveren kan velge 2,5 mg (mikstur) og 5–10 mg. Måldosen 10 eller 15 mg velges av forskriveren.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Risperidon holdes uendret i 28 dager: 14 dagers opptrapping og 14 dager sammen med aripiprazol på måldosen. Første reduksjon er dag 29, og hver reduksjon står i minst 14 dager.
  - Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
- Planen gjelder bare startdosen i kildens eget eksempel, 4 mg (åpent OUSFAR-valg til kontrolløren), så hvert trinn, også siste dose før seponering, er kildens: 4 → 3 → 2 → 1 mg og så stopp, hvert trinn i minst 14 dager. Andre startdoser stopper, fordi kilden ikke viser hvordan de skal trappes ned når trinnene ikke kan gis med tablettene, og OUSFAR legger ikke inn egne lavdosetrinn som ikke er validert.
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
  - Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke. *([dmp-risperdal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08037.pdf), pkt. 4.2)*
- Siste trinn til 0 er hele dosen som gjenstår. Det krever en egen vurdering av pasienten, stopper ved tidligere seponeringsplager, og pasienten vurderes før hver reduksjon, før siste trinn og etter seponeringen (forslag: 14 dager etter).
  - Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1))*
  - Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall. *([tarc-2018](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6130089/fullTextXML), avsnittet om vurdering før bytte)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (hold) | varighet.dager | 28 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| fra: fase 2 (nedtrapping) | strategi.prosent | 25 % | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| fra: fase 2 (nedtrapping) | trinnlengde | 14 dager (forskriveren kan velge minst 14 dager, av tekniske grunner høyst 365 dager) | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| til: fase 1 (opptrapping) | trinn[0].mg | 5 mg (forskriveren kan velge 2,5–5 mg) | veiledende | **OUSFAR-vurdering, åpent forslag:** Valgt innenfor TARC-området 2,5–5 mg første uke; forskriveren kan velge en annen dose i området. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)) |
| til: fase 1 (opptrapping) | trinn[0].dager | 7 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |
| til: fase 1 (opptrapping) | trinn[1].mg | 10 mg (forskriveren kan velge 5–10 mg) | veiledende | **OUSFAR-vurdering, åpent forslag:** Valgt innenfor TARC-området 5–10 mg andre uke; forskriveren kan velge en annen dose i området. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)) |
| til: fase 1 (opptrapping) | trinn[1].dager | 7 dager | bindende krav | tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1) |

**Betingelser:**

- Startdose 4 mg (bindende; **OUSFAR-vurdering, åpent forslag:** Planen gjelder bare 4 mg risperidon daglig, startdosen i kildens eget eksempel (4 → 3 → 2 → 1 mg og så stopp), slik at hvert trinn og siste dose før seponering står i kilden. Kilden knytter ikke eksemplene til et bestemt stoff; at dosen gjelder risperidon, er OUSFARs avgrensning innenfor preparatomtalens doseområde og må avklares av kontrolløren. Andre startdoser og egne lavdosetrinn er ikke validert og stopper. (bygger på tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); dmp-risperdal pkt. 4.2; dmp-risperdal pkt. 4.2))
- Måldose (må oppgis) 10, 15 mg (bindende; tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); ema-abilify section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra risperidon på grunn av bivirkninger eller utilstrekkelig effekt. (tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); ema-abilify section 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral risperidon (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. (keks-2019 tabell 4 (depot til depot))
- Må bekreftes (`spesialist_risiko`): Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. (keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 4 (direkte bytte))
- Må bekreftes (`siste_trinn`): Siste trinn er vurdert for denne pasienten: risperidon seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. (tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1); tarc-2018 avsnittet om vurdering før bytte; keks-2019 tabell 4 og avsnittet om bytte; keks-2019 tabell 2; dmp-risperdal pkt. 4.2)
- Unntak (`tilbakefall_innlagt`): Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. (tarc-2018 avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3))
- Unntak (`alder_65`): Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. (ema-abilify section 4.2 (eldre))
- Unntak (`cyp_aripiprazol`): Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. (ema-abilify section 4.2 og 4.5)
- Unntak (`seponeringsplager`): Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av risperidon; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. (tarc-2018 avsnittet om vurdering før bytte; dmp-risperdal pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral risperidon som eneste antipsykotikum, i en stabil dose.
- Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.

**Usikkerhet:**

- Opptrappingen bygger på en konsensusrapport fra et ekspertpanel (lavt evidensnivå), og konsensusmøtet var finansiert av et legemiddelfirma. Rapporten nevner selv at raske bytter også er brukt i studier.
- Hvor lenge hvert trinn skal vare ut over minstetiden, og om nedtrappingen skal stoppes eller reverseres ved forverring, er en klinisk vurdering som ikke beregnes.
- Aripiprazol kan gi uro og akatisi tidlig; når dopaminblokkeringen fra det forrige stoffet avtar, kan symptomer komme tilbake, og det må følges.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Risperidon 4 mg, aripiprazol til 15 mg.* Inndata: startdose 4 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **fra:** dag 1–28: 4 mg; dag 29–42: 3 mg; dag 43–56: 2 mg; dag 57–70: 1 mg; fra dag 71: seponert
  - **til:** dag 1–7: 5 mg; dag 8–14: 10 mg; fra dag 15: 15 mg
  - Kontroll: Avkreftet: Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av risperidon; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra risperidon på grunn av bivirkninger eller utilstrekkelig effekt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral risperidon (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Siste trinn er vurdert for denne pasienten: risperidon seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 4 mg (bindende) – oppfylt. 4 mg.
  - Kontroll: Måldosen er 10, 15 mg (bindende) – oppfylt. 15 mg.
- *Risperidon 4 mg, aripiprazol til 10 mg.* Inndata: startdose 4 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **fra:** dag 1–28: 4 mg; dag 29–42: 3 mg; dag 43–56: 2 mg; dag 57–70: 1 mg; fra dag 71: seponert
  - **til:** dag 1–7: 5 mg; fra dag 8: 10 mg
  - Kontroll: Avkreftet: Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av risperidon; regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra risperidon på grunn av bivirkninger eller utilstrekkelig effekt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral risperidon (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Siste trinn er vurdert for denne pasienten: risperidon seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker. Pasienten vet at seponeringsplager kan være kvalme, oppkast, svette og søvnløshet, og akatisi, dystoni og dyskinesi. Pasienten vet hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og vurderes før siste trinn og etter seponeringen. Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 4 mg (bindende) – oppfylt. 4 mg.
  - Kontroll: Måldosen er 10, 15 mg (bindende) – oppfylt. 10 mg.
- *Risperidon 6 mg: kilden viser ikke forløpet fra denne dosen (siste trinn 1,5 mg til 0), så ingen komplett plan.* Inndata: startdose 6 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 6 mg er utenfor det regelen gjelder for (4 mg).
- *Risperidon 2 mg: kilden viser ikke forløpet fra denne dosen (siste trinn 0,5 mg til 0), så ingen komplett plan.* Inndata: startdose 2 mg; måldose 10 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 2 mg er utenfor det regelen gjelder for (4 mg).
- *Risperidon 20 mg er over det preparatomtalen anbefaler.* Inndata: startdose 20 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Startdosen 20 mg er utenfor det regelen gjelder for (4 mg).
- *65 år eller eldre: regelen gjelder ikke.* Inndata: startdose 4 mg; måldose 15 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 ja, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen.
- *Uten valgt måldose (10 eller 15 mg) velger beregningen ikke selv.* Inndata: startdose 4 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko, siste_trinn; pasientforhold: tilbakefall_innlagt nei, alder_65 nei, cyp_aripiprazol nei, seponeringsplager nei.
  - **Stoppet:** Måldosen må oppgis; regelen har ingen standard måldose.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Rd>Pa`.
