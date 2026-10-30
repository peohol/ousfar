# OUSFAR Verktøy – P7: sammenlignings- og utviklingssett (ikke i verktøyet, ikke klinisk)

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping-sammenligning` versjon 4, regelmodell 6, beregningsmotor 4. Sammenlignings- og utviklingssett for nedtrappingsreglene (P7.5): strategier som ikke er godkjent som valgbare kliniske strategier. Ikke i verktøyet og ikke kliniske anbefalinger.

**1 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p7-nedtrapping.md` og `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-citalopram-hyperbolsk` | seponering | citalopram → – | beregnbar etter faglig avklaring | 3 | utkast | 1 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf) | preparatomtale | Cipramil (citalopram) tabletter, preparatomtale | Oppdatert 16.05.2024 | `4bc8dfd2e647d273…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [horowitz-2019](https://doi.org/10.1016/S2215-0366(19)30032-X) | primærlitteratur | Horowitz MA, Taylor D. Tapering of SSRI treatment to mitigate withdrawal symptoms. Lancet Psychiatry 2019;6:538–546 | doi:10.1016/S2215-0366(19)30032-X, PMID 30850328 | – |
| [sorensen-2022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML) | primærlitteratur | Sørensen A, Ruhé HG, Munkholm K. The relationship between dose and serotonin transporter occupancy of antidepressants – a systematic review. Mol Psychiatry 2022;27:192–201 | doi:10.1038/s41380-021-01285-w, PMC8960396 | `2b243d8f800a9c27…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Seponering av citalopram, hyperbolsk nedtrapping (alternativ strategi)

`seponering-citalopram-hyperbolsk`, versjon 4, fingeravtrykk `386fedfa94406ae98941d9cd82e81bfd420877d5693a20a0617af303ca8471f7`. Seponering: citalopram → –. **Beregnbar etter faglig avklaring**; status **utkast**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 29.10.2026, Claude Code) → til faglig kontroll (versjon 3, 29.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Citalopram trappes ned gradvis over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere. *([dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf), pkt. 4.2)*
- SERT-bindingen øker hyperbolsk med dosen; ED50 for citalopram er 3,4 mg.
  - Dosen som gir halvparten av maksimal SERT-binding (ED50) er 3,4 mg for citalopram. *([sorensen-2022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML), Results (dose og SERT-binding))*
  - SERT-bindingen øker hyperbolsk med dosen og flater ut ved omtrent 80 % rundt minste vanlige dose; studiene er små og metodene ulike. *([sorensen-2022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML), Results og Discussion)*
- Like store trinn i binding gir stadig mindre dosetrinn ned mot null.
  - Nedtrapping i like store trinn i SERT-binding gir stadig mindre dosetrinn og kan gå til doser godt under minste terapeutiske dose. *([horowitz-2019](https://doi.org/10.1016/S2215-0366(19)30032-X), sammendrag)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Beregnet binding relativt til maksimum, f = D / (3,4 + D), senkes i åtte like store trinn fra startdosen mot null, og dosen er D = 3,4 · f / (1 − f). Maksimal binding går ut av regnestykket. Antall trinn og 14 dager per trinn er OUSFARs forslag.
  - Dosen som gir halvparten av maksimal SERT-binding (ED50) er 3,4 mg for citalopram. *([sorensen-2022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML), Results (dose og SERT-binding))*
  - Nedtrapping i like store trinn i SERT-binding gir stadig mindre dosetrinn og kan gå til doser godt under minste terapeutiske dose. *([horowitz-2019](https://doi.org/10.1016/S2215-0366(19)30032-X), sammendrag)*
- Strategien er ikke en valgbar klinisk strategi (fagkontrollen 30.10.2026); den regnes bare ut til sammenligning med gjentatt prosentvis nedtrapping (B2). *(OUSFARs vurdering)*
- Planen tar ikke det åttende trinnet til null: ingen avslutning er godkjent etter fagvurderingen av P7, så siste dose fortsetter til avslutningen er vurdert individuelt. Trinnlengden er en minstetid. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.ed50_mg | 3,4 mg | veiledende | sorensen-2022 Results (dose og SERT-binding) |
| fra: fase 1 (nedtrapping) | strategi.trinn | 8 trinn | veiledende | **OUSFAR-vurdering, åpent forslag:** Åtte like store trinn i beregnet binding; et antall som må vurderes faglig mot pasientens toleranse. (bygger på horowitz-2019 sammendrag) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 14–28) | veiledende | **OUSFAR-vurdering, åpent forslag:** Nedre del av RCPsychs to til fire uker mellom reduksjonene; en minstetid. (bygger på rcpsych-stopping How should I gradually reduce my dose?) |
| fra: fase 1 (nedtrapping) | horisont | 12 trinn | veiledende | **OUSFAR-vurdering, åpent forslag:** Teknisk planhorisont, ikke en klinisk grense: planen viser høyst 12 reduksjoner frem i tid, omtrent ett år med 28 dager per trinn. Ved revurdering beregnes en ny plan fra dosen pasienten da bruker. At planen skal ha en slik horisont i stedet for en nedre grense, bestemte fagkontrollen 30.10.2026 (beslutning 3); antallet er OUSFARs tekniske valg. |

**Betingelser:**

- Startdose 10–40 mg (bindende; dmp-cipramil pkt. 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- ED50 fra PET-studier av SERT-binding gjelder pasienten tilnærmet.

**Usikkerhet:**

- Bindingskurven bygger på få og små studier med ulike metoder; at like trinn i binding gir mindre seponeringssymptomer, er ikke vist i kontrollerte studier av denne planen.
- De siste dosene (under 1 mg) krever flytende form; om det finnes, avgjøres i P5.
- Flere trinn er ikke automatisk bedre (P4.6): fra 20 mg tar de sju trinnene før null 12 uker.
- Fagkontrollen 30.10.2026 godkjente ikke strategien som valgbar i verktøyet (B2). Om den senere skal vurderes klinisk, er et eget utviklingsspørsmål, adskilt fra P7.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fra 20 mg: like trinn i beregnet binding (85,5 % av maksimum ved 20 mg), uten det åttende trinnet til null.* Inndata: startdose 20 mg.
  - **fra:** dag 1–14: 10,08 mg; dag 15–28: 6,07 mg; dag 29–42: 3,9 mg; dag 43–56: 2,54 mg; dag 57–70: 1,6 mg; dag 71–84: 0,92 mg; fra dag 85: 0,41 mg; siste trinn før null; avslutning vurderes individuelt
  - Kontroll: Startdosen er 10–40 mg (bindende) – oppfylt. 20 mg.
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 85 står pasienten på 0,41 mg av citalopram til planen revurderes. Siste beregnede dose er ikke nødvendigvis den siste dosen pasienten trenger før seponering. Planen går ikke til null og foreslår ingen dato for siste dose: avslutningen vurderes individuelt ut fra dosen pasienten da bruker, reduksjonene så langt og hvordan pasienten har reagert på dem, og videre seponering krever forskriverens beslutning.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.
