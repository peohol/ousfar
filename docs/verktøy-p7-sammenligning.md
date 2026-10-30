# OUSFAR Verktøy – P7: sammenlignings- og utviklingssett (ikke i verktøyet, ikke klinisk)

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-nedtrapping-sammenligning` versjon 5, regelmodell 9, beregningsmotor 9. Sammenlignings- og utviklingssett for reglene (P4.8 og P7.5): strategier som ikke er godkjent som valgbare kliniske strategier, og gruppebyttet til aripiprazol som modelleringsdemonstrasjon av gruppebaserte regler. Ikke i verktøyet og ikke kliniske anbefalinger.

**2 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p7-nedtrapping.md` og `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `seponering-citalopram-hyperbolsk` | seponering | citalopram → – | beregnbar etter faglig avklaring | 3 | utkast | 1 |
| `gruppe-rest-ap-aripiprazol` | kryssnedtrapping | gruppen rest-ap → aripiprazol | beregnbar etter faglig avklaring | 3 | utkast | 2 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-cipramil](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08151.pdf) | preparatomtale | Cipramil (citalopram) tabletter, preparatomtale | Oppdatert 16.05.2024 | `4bc8dfd2e647d273…` |
| [dmp-cisordinol](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06778.pdf) | preparatomtale | Cisordinol (zuklopentiksol) tabletter, preparatomtale | Oppdatert 16.02.2026 | `e34ae0834fb63bb8…` |
| [ema-abilify](https://www.ema.europa.eu/en/documents/product-information/abilify-epar-product-information_en.pdf) | preparatomtale | Abilify (aripiprazol), produktinformasjon | Sist endret 08.10.2026 | `48ec4699460ea38c…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [horowitz-2019](https://doi.org/10.1016/S2215-0366(19)30032-X) | primærlitteratur | Horowitz MA, Taylor D. Tapering of SSRI treatment to mitigate withdrawal symptoms. Lancet Psychiatry 2019;6:538–546 | doi:10.1016/S2215-0366(19)30032-X, PMID 30850328 | – |
| [sorensen-2022](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC8960396/fullTextXML) | primærlitteratur | Sørensen A, Ruhé HG, Munkholm K. The relationship between dose and serotonin transporter occupancy of antidepressants – a systematic review. Mol Psychiatry 2022;27:192–201 | doi:10.1038/s41380-021-01285-w, PMC8960396 | `2b243d8f800a9c27…` |
| [keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML) | oversiktsartikkel | Keks N, Schwartz D, Hope J. Stopping and switching antipsychotic drugs. Aust Prescr 2019;42:152–157 | doi:10.18773/austprescr.2019.052, PMC6787301 | `26102eb58a504876…` |
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
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 85 står pasienten på 0,41 mg av citalopram til planen revurderes. Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose. Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.
  - Merknad: Dagene og datoene er tidligste mulige tidspunkt dersom alle tidligere reduksjoner gjennomføres som planlagt; utsettes et trinn, forskyves alle senere tidspunkter tilsvarende.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Ci>Stop`.

## Bytte fra et antipsykotikum i gruppen «øvrige antipsykotika» til aripiprazol, kryss-titrering

`gruppe-rest-ap-aripiprazol`, versjon 5, fingeravtrykk `256d49b824af879d9b813b8a65c30e0b7f4e318615b7b60d5df17b3802a26e1c`. Kryssnedtrapping: gruppen rest-ap → aripiprazol. **Beregnbar etter faglig avklaring**; status **utkast**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code) → utkast (versjon 5, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Aripiprazol startes med 10 eller 15 mg ved schizofreni; doseområdet er 10–30 mg.
  - Schizofreni: startdose 10 eller 15 mg daglig, vedlikehold 15 mg; effektivt doseområde 10–30 mg daglig. *([ema-abilify](https://www.ema.europa.eu/en/documents/product-information/abilify-epar-product-information_en.pdf), section 4.2)*
- Brå seponering av zuklopentiksol kan gi seponeringssymptomer innen 1–4 dager.
  - Brå seponering kan gi seponeringssymptomer, vanligvis innen 1–4 dager, som avtar innen 7–14 dager. *([dmp-cisordinol](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06778.pdf), pkt. 4.8)*
- Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres, uten opphold.
  - Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres. Et opphold uten antipsykotikum anbefales ikke. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om byttestrategier)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR starter aripiprazol 10 mg dag 1 og holder det gamle antipsykotikumet uendret i én uke. Nedtrappingen av det gamle og økningen av aripiprazol til måldosen beregnes ikke, men planlegges individuelt (kontrollrunden 30.10.2026); aripiprazol holdes på 10 mg til da.
  - Schizofreni: startdose 10 eller 15 mg daglig, vedlikehold 15 mg; effektivt doseområde 10–30 mg daglig. *([ema-abilify](https://www.ema.europa.eu/en/documents/product-information/abilify-epar-product-information_en.pdf), section 4.2)*
  - Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres. Et opphold uten antipsykotikum anbefales ikke. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om byttestrategier)*
- Gruppen følger P1-kartleggingen (tabellens medlemmer). Bare medlemmer som er vurdert hver for seg, kan beregnes (B4); i piloten gjelder det bare zuklopentiksol, som forslag. *(OUSFARs vurdering)*
- Regelen er ikke godkjent som klinisk beregnbar gruppebytteregel, heller ikke den første uken med aripiprazol 10 mg (kontrollørens beslutning P4-A 30.10.2026); den er tatt ut av verktøyet og står bare som modelleringsdemonstrasjon. *(OUSFARs vurdering)*
- Regelen er ikke en gruppebasert klinisk doseplan (kontrollrunden 30.10.2026): én felles algoritme er ikke validert for antipsykotika med ulik farmakologi. Gruppen viser bare hvordan modellen håndterer medlemmer; det kliniske kandidatforslaget er zuklopentiksol alene, helst som en egen regel til ny kontroll. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (hold) | varighet.dager | 7 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** Første uke med aripiprazol før nedtrappingen starter. |
| til: fase 1 (hold) | dose.mg | 10 mg | veiledende | ema-abilify section 4.2 |

**Betingelser:**

- Startdose 20–40 mg for zuklopentiksol (veiledende; dmp-cisordinol pkt. 4.2)
- Må bekreftes (`indikasjon`): Indikasjonen er schizofreni. (ema-abilify section 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker en peroral formulering, ikke depotinjeksjon eller korttidsvirkende injeksjon. (keks-2019 avsnittet om byttestrategier)
- Må bekreftes (`spesialist_risiko`): Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. (**OUSFAR-vurdering, åpent forslag:** Kontrollrunden 30.10.2026 fant at ingen fast byttemodell er validert for alle pasienter: redusert antipsykotisk dekning kan gi tilbakefall, og overlapp kan gi sedasjon og ortostase. (bygger på keks-2019 tabell 4 og avsnittet om byttestrategier))

**Gruppemedlemmer (B4).** Bare medlemmer som er foreslått eller validert, kan beregnes.

| Virkestoff | Vurdering | Begrunnelse |
| --- | --- | --- |
| klorprotiksen | ikke vurdert | Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4). |
| flupentiksol | ikke vurdert | Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4). |
| flufenazin | ikke vurdert | Bare godkjenningsfritak i Norge (P2.5), og mangler i gruppens faktaboks på kildesidene (P3); ikke vurdert individuelt. |
| loksapin | ikke vurdert | Har ingen preparater i FEST (P2.5); ikke vurdert individuelt. |
| perisiazin | ikke vurdert | Har ingen preparater i FEST (P2.5); ikke vurdert individuelt. |
| perfenazin | ikke vurdert | Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4). |
| promazin | ikke vurdert | Har ingen preparater i FEST (P2.5); ikke vurdert individuelt. Mangler også i gruppens faktaboks på kildesidene (P3). |
| trifluoperazin | ikke vurdert | Har ingen preparater i FEST (P2.5); ikke vurdert individuelt. |
| ziprasidon | ikke vurdert | Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4). Mangler i gruppens faktaboks på en del kildesider (P3). |
| zuklopentiksol | foreslatt | Vurdert mot preparatomtalen: seponeringssymptomer kommer innen 1–4 dager etter brå seponering, så gradvis nedtrapping med overlapp er rimelig. Foreslått, ikke validert. |

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.

**Usikkerhet:**

- Kildesidene og tabellen er ikke enige om hvem som er med i gruppen (P3); gruppens sammensetning må avklares faglig.
- Medlemmene har ulik halveringstid og ulike doser; samme plan passer ikke nødvendigvis alle.
- Aripiprazol er en partiell agonist og kan gi forverring eller akatisi ved bytte fra en full antagonist; overlappens lengde er OUSFARs valg.
- Den faste nedtrappingen med 25 % av startdosen per uke i versjon 3 var OUSFARs valg og er tatt ut. En beregnet nedtrapping krever en egen regel for zuklopentiksol med et substansspesifikt, kontrollert forløp.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Zuklopentiksol 20 mg til aripiprazol: første uke beregnes; nedtrappingen og måldosen planlegges individuelt.* Inndata: startdose 20 mg; virkestoff zuklopentiksol; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **fra:** dag 1–7: 20 mg; fra dag 8: videre dosering beregnes ikke; planlegges individuelt
  - **til:** fra dag 1: 10 mg; holdes til zuklopentiksol er avsluttet; videre dosering planlegges individuelt
  - Kontroll: Bekreftet: Indikasjonen er schizofreni. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker en peroral formulering, ikke depotinjeksjon eller korttidsvirkende injeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20–40 mg (veiledende) – oppfylt. 20 mg.
  - Merknad: zuklopentiksol: Nedtrappingen av det gamle antipsykotikumet beregnes ikke: ingen felles algoritme er validert for gruppen, og ingen substansspesifikk plan er kontrollert (kontrollrunden 30.10.2026). Den planlegges i, eller med råd fra, spesialisthelsetjenesten og tilpasses toleransen og symptomene; legemidlet seponeres ikke brått.
  - Merknad: Dosen av aripiprazol holdes på 10 mg til zuklopentiksol er avsluttet. Avslutningen av zuklopentiksol vurderes individuelt, og videre dosering av aripiprazol beregnes ikke, men planlegges individuelt sammen med den.
- *Flupentiksol er medlem av gruppen, men ikke vurdert individuelt, så beregningen stopper.* Inndata: startdose 6 mg; virkestoff flupentiksol; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **Stoppet:** flupentiksol er ikke vurdert individuelt for gruppeanbefalingen: Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:RA>Pa`.
