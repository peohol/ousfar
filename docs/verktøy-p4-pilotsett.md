# OUSFAR Verktøy – P4: pilotsettet

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-pilot` versjon 7, regelmodell 7, beregningsmotor 5. Pilotsett for regelmodellen i P4: én regel per regelklasse planen prioriterer. Etter kontrollrunden 30.10.2026 er de fire byttereglene rettet eller avgrenset og sendt til ny kontroll, og de to depotreglene er funnet kildemessig akseptable som avgrensede varianter. Ved gjennomgangen samme dag ble de beregnede sluttdelene av sertralin→mirtazapin og gruppebyttet til aripiprazol tatt ut; de planlegges individuelt. Til faglig kontroll; ingen regel er klinisk godkjent eller skal brukes i appen.

**6 regler, 0 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `kryssnedtrapping-sertralin-mirtazapin` | kryssnedtrapping | sertralin → mirtazapin | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `mao-fluoksetin-fenelzin` | sekvensielt bytte | fluoksetin → fenelzin | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `antipsykotikabytte-olanzapin-kvetiapin` | kryssnedtrapping | olanzapin → kvetiapin | beregnbar etter faglig avklaring | 2 | til faglig kontroll | 4 |
| `gruppe-rest-ap-aripiprazol` | kryssnedtrapping | gruppen rest-ap → aripiprazol | beregnbar etter faglig avklaring | 3 | til faglig kontroll | 2 |
| `depot-aripiprazol-maintena` | oppstart av depot | aripiprazol → aripiprazol | entydig beregnbar | 0 | til faglig kontroll | 4 |
| `depot-paliperidon-xeplion` | oppstart av depot | paliperidon → paliperidon | entydig beregnbar | 0 | til faglig kontroll | 6 |

## Kilder

Hentet og lest 28.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf) | preparatomtale | Zoloft (sertralin) tabletter, preparatomtale | Oppdatert 07.01.2026 | `4ac8f7305379de98…` |
| [dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf) | preparatomtale | Fluoxetine Vitabalans (fluoksetin) tabletter, preparatomtale | Oppdatert 12.11.2021 | `221a73511f81243a…` |
| [dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf) | preparatomtale | Remeron (mirtazapin) tabletter, preparatomtale | Oppdatert 01.09.2021 | `2bc89cecfe0b2a80…` |
| [dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf) | preparatomtale | Seroquel (kvetiapin) tabletter, preparatomtale | Oppdatert 03.07.2024 | `87e197ef056358d0…` |
| [dmp-cisordinol](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06778.pdf) | preparatomtale | Cisordinol (zuklopentiksol) tabletter, preparatomtale | Oppdatert 16.02.2026 | `e34ae0834fb63bb8…` |
| [ema-abilify](https://www.ema.europa.eu/en/documents/product-information/abilify-epar-product-information_en.pdf) | preparatomtale | Abilify (aripiprazol), produktinformasjon | Sist endret 08.10.2026 | `48ec4699460ea38c…` |
| [ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf) | preparatomtale | Abilify Maintena (aripiprazol depotinjeksjon), produktinformasjon | Sist endret 08.10.2026 | `41ea025269b746fe…` |
| [ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf) | preparatomtale | Xeplion (paliperidonpalmitat depotinjeksjon), produktinformasjon | Sist endret 08.10.2026 | `2d38bdc767adb9ed…` |
| [ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf) | preparatomtale | Zyprexa (olanzapin), produktinformasjon | Sist endret 08.10.2026 | `d7a60e6f4908c9e7…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/) | oversiktsartikkel | Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83 | doi:10.18773/austprescr.2016.039, PMC4919171 | `55c5b956f46b02f9…` |
| [keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML) | oversiktsartikkel | Keks N, Schwartz D, Hope J. Stopping and switching antipsychotic drugs. Aust Prescr 2019;42:152–157 | doi:10.18773/austprescr.2019.052, PMC6787301 | `26102eb58a504876…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Bytte fra sertralin til mirtazapin, kryssnedtrapping

`kryssnedtrapping-sertralin-mirtazapin`, versjon 4, fingeravtrykk `e9043380fa21ed7c59cab20a75d88de5c9c6a8a3e9f570896064bc60af73b6f9`. Kryssnedtrapping: sertralin → mirtazapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Sertralin trappes ned gradvis over minst én til to uker.
  - Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder. *([dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf), pkt. 4.2 og 4.4)*
- Ved kryssnedtrapping startes det nye antidepressivet mens det første trappes ned.
  - Bytte kan gjøres konservativt (nedtrapping, utvasking, så oppstart), moderat, direkte eller med kryssnedtrapping, der det nye startes mens det første trappes ned. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 2)*
- Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.
  - Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.9.9)*
- Mirtazapin startes med 15 eller 30 mg; effektiv dose er 15–45 mg.
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer sertralin hver 14. dag ned til 25 mg og starter mirtazapin 15 mg dag 1.
  - Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- Seponeringen av sertralin fra 25 mg beregnes ikke, og heller ikke økningen av mirtazapin til måldosen: begge planlegges individuelt ut fra toleransen (kontrollrunden 30.10.2026). Mirtazapin holdes på 15 mg til da.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis. *([dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf), pkt. 4.2)*
- At dette er et bytte, kan begrunne raskere nedtrapping enn ved seponering, men ikke samme tempo for alle (kontrollrunden 30.10.2026). Etter tidligere seponeringssymptomer stopper regelen; ved lang behandlingstid krever halvering hver 14. dag en skriftlig begrunnelse, ellers planlegges byttet individuelt.
  - Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
  - Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.15)*
  - Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 25 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Laveste startdose i preparatomtalen; her stopper beregningen, og seponeringen derfra planlegges individuelt. (bygger på dmp-zoloft pkt. 4.2) |
| fra: fase 1 (nedtrapping) | trinnlengde | 14 dager (område 7–14) | veiledende | **OUSFAR-vurdering, åpent forslag:** NICE åpner for raskere nedtrapping ved bytte; OUSFAR foreslår likevel 14 dager. (bygger på rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | horisont | 3 trinn | veiledende | **OUSFAR-vurdering, åpent forslag:** Teknisk planhorisont: halvering fra høyeste startdose (200 mg) når 25 mg på tre reduksjoner; beregningen stopper uansett ved 25 mg. |
| til: fase 1 (hold) | dose.mg | 15 mg | veiledende | dmp-remeron pkt. 4.2 |

**Betingelser:**

- Startdose 50–200 mg (bindende; dmp-zoloft pkt. 4.2)
- Må bekreftes (`toleranse_overlapp`): Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.9.9)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Må besvares (`lang_behandlingstid`): Har pasienten brukt sertralin i mange måneder eller lenger? Et ja krever en skriftlig begrunnelse. (rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten har ikke andre serotonerge legemidler som gjør overlappen mer risikofylt.

**Usikkerhet:**

- Ved samtidig bruk kan serotonerge bivirkninger øke; overlappens lengde er OUSFARs valg.
- NICE åpner for raskere nedtrapping ved bytte; 14 dager per trinn kan være lengre enn nødvendig.
- Om seponeringen fra 25 mg kan bli et fast sluttpunkt i byttet, og for hvilke pasienter, er ikke avklart (kontrollrunden 30.10.2026); til da beregnes den ikke.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Sertralin 100 mg til mirtazapin: halvering til 25 mg; seponeringen derfra og måldosen for mirtazapin planlegges individuelt.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–14: 50 mg; fra dag 15: 25 mg; siste trinn før null; avslutning vurderes individuelt
  - **til:** fra dag 1: 15 mg; holdes til sertralin er avsluttet; videre dosering planlegges individuelt
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt sertralin i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 50–200 mg (bindende) – oppfylt. 100 mg.
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 15 står pasienten på 25 mg av sertralin til planen revurderes. Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose. Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.
  - Merknad: Dosen av mirtazapin holdes på 15 mg til sertralin er avsluttet. Avslutningen av sertralin vurderes individuelt, og videre dosering av mirtazapin beregnes ikke, men planlegges individuelt sammen med den.
  - Merknad: Dagene og datoene er tidligste mulige tidspunkt dersom alle tidligere reduksjoner gjennomføres som planlagt; utsettes et trinn, forskyves alle senere tidspunkter tilsvarende.
- *Sertralin 50 mg til mirtazapin: én reduksjon til 25 mg, som fortsetter til avslutningen er vurdert.* Inndata: startdose 50 mg; bekreftet: toleranse_overlapp; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** fra dag 1: 25 mg; siste trinn før null; avslutning vurderes individuelt
  - **til:** fra dag 1: 15 mg; holdes til sertralin er avsluttet; videre dosering planlegges individuelt
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt sertralin i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 50–200 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 1 står pasienten på 25 mg av sertralin til planen revurderes. Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose. Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.
  - Merknad: Dosen av mirtazapin holdes på 15 mg til sertralin er avsluttet. Avslutningen av sertralin vurderes individuelt, og videre dosering av mirtazapin beregnes ikke, men planlegges individuelt sammen med den.
- *Etter seponeringssymptomer ved et tidligere forsøk gjelder ikke regelen; byttet planlegges individuelt.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn.
- *Ved lang behandlingstid krever den faste halveringen en skriftlig begrunnelse.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja.
  - **Stoppet:** Svaret ja (lang behandlingstid) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Mz`.

## Bytte fra fluoksetin til fenelzin, sekvensielt med utvasking

`mao-fluoksetin-fenelzin`, versjon 3, fingeravtrykk `c179f388d87f3cbc3a3467f84d2653b7b3961b65dd18f0e2d0f12ebebd0ecab1`. Sekvensielt bytte: fluoksetin → fenelzin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Fluoksetin og en irreversibel, ikke-selektiv MAO-hemmer skal ikke brukes samtidig; det skal gå minst 5 uker fra fluoksetin er seponert til MAO-hemmeren startes.
  - Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.3 og 4.5)*
- Litteraturen anbefaler 5–6 ukers utvasking, og at MAO-hemmeren startes forsiktig i lav dose.
  - Fra fluoksetin til MAO-hemmer: fluoksetin seponeres (trappes ned over 40 mg daglig), så 5–6 ukers utvasking før MAO-hemmeren startes forsiktig i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3)*
- Fluoksetin trappes ned gradvis over minst én til to uker.
  - Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.2)*
- Seponeringssymptomer kan komme dager til uker etter en reduksjon av fluoksetin; det er best å vente minst fire uker før neste.
  - Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste. *([rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants), If you have been taking antidepressants for longer)*
- Bytte til en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten.
  - Bytte til eller fra en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten. Bytte kan kreve kryssnedtrapping. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.9.5)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR halverer fluoksetin hver 28. dag ned til 10 mg og seponerer deretter. Utvaskingen på 35 dager regnes fra første dag uten fluoksetin; fenelzin kan tidligst startes dagen etter.
  - Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.3 og 4.5)*
- Startdosen for fenelzin beregnes ikke, fordi det ikke finnes en norsk preparatomtale å bygge den på. *(OUSFARs vurdering)*
- Utvaskingen på 35 dager er et minimum, ikke en fast tidsplan: fenelzin startes ikke automatisk på dagen planen viser (kontrollrunden 30.10.2026). Nedtrappingen av fluoksetin er godtatt bare som minimum for utvaskingen, ikke som et klinisk godkjent fast forløp.
  - Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.3 og 4.5)*
  - Fra fluoksetin til MAO-hemmer: fluoksetin seponeres (trappes ned over 40 mg daglig), så 5–6 ukers utvasking før MAO-hemmeren startes forsiktig i lav dose. *([keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/), tabell 3)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (nedtrapping) | strategi.prosent | 50 % | veiledende | **OUSFAR-vurdering, åpent forslag:** Eksempelet i NICE er 50 % av forrige dose. (bygger på nice-ng222 anbefaling 1.4.16) |
| fra: fase 1 (nedtrapping) | strategi.sluttdose_mg | 10 mg | veiledende | **OUSFAR-vurdering, åpent forslag:** Daglig 10 mg i stedet for 20 mg annenhver dag, som modellen ikke har; under den seponeres. (bygger på nice-ng222 anbefaling 1.4.18) |
| fra: fase 1 (nedtrapping) | trinnlengde | 28 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** RCPsych anbefaler minst fire uker før neste reduksjon av langtidsvirkende fluoksetin, fordi symptomene kan komme sent; NICE nevner én til to uker for å vurdere virkningen. OUSFAR bruker det strengeste. (bygger på rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.18 (om fluoksetin)) |
| fra: fase 1 (nedtrapping) | minste_varighet | 14 dager | bindende krav | **OUSFAR-vurdering, åpent forslag:** «Minst én til to uker» er lest konservativt som minst 14 dager. (bygger på dmp-fluoxetin pkt. 4.2) |
| til: start | utvasking | 35 dager | bindende krav | dmp-fluoxetin pkt. 4.3 og 4.5; keks-2016 tabell 3 |

**Betingelser:**

- Startdose 20–60 mg (bindende; dmp-fluoxetin pkt. 4.2)
- Må bekreftes (`spesialisthelsetjeneste`): Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten. (nice-ng222 anbefaling 1.9.5)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Fenelzin er en irreversibel, ikke-selektiv MAO-hemmer, så utvaskingskravet for slike gjelder.

**Usikkerhet:**

- Kildene er ikke enige om nedtrappingen: preparatomtalen sier gradvis over minst én til to uker, NICE nevner dosering annenhver dag ved 20 mg, og Keks mfl. seponerer uten nedtrapping ved 40 mg daglig eller mindre. Regelen følger preparatomtalen; valget må avklares faglig.
- Ved høye doser og lang behandling kan 6 uker være tryggere enn 5; regelen bruker minimum fra preparatomtalen.
- Utvaskingen gjør at pasienten er uten antidepressiv i minst fem uker; risikoen for tilbakefall må vurderes individuelt.
- Produktinformasjonen for fenelzin fra en godkjent utenlandsk kilde er ennå ikke kontrollert (kontrollrunden 30.10.2026).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fluoksetin 40 mg: to reduksjoner med 28 dager per trinn, 35 dager utvasking, fenelzin tidligst dag 92.* Inndata: startdose 40 mg; bekreftet: spesialisthelsetjeneste.
  - **fra:** dag 1–28: 20 mg; dag 29–56: 10 mg; fra dag 57: seponert
  - **til:** tidligst dag 92: oppstart, dosering beregnes ikke
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
  - Kontroll: Minst 35 dager uten fluoksetin før fenelzin (bindende) – oppfylt. Uten legemiddel dag 57–91 (35 dager); fenelzin tidligst dag 92.
- *Fluoksetin 20 mg: én reduksjon, fenelzin tidligst dag 64.* Inndata: startdose 20 mg; bekreftet: spesialisthelsetjeneste.
  - **fra:** dag 1–28: 10 mg; fra dag 29: seponert
  - **til:** tidligst dag 64: oppstart, dosering beregnes ikke
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
  - Kontroll: Minst 35 dager uten fluoksetin før fenelzin (bindende) – oppfylt. Uten legemiddel dag 29–63 (35 dager); fenelzin tidligst dag 64.
- *Uten bekreftelse om spesialisthelsetjenesten stopper beregningen.* Inndata: startdose 40 mg.
  - **Stoppet:** Må bekreftes før beregning: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Fe`.

## Bytte fra olanzapin til kvetiapin, kryss-titrering med fast opptrapping

`antipsykotikabytte-olanzapin-kvetiapin`, versjon 3, fingeravtrykk `378a51259483e5d00671533d6771f6544ff312e192ce8d40539ac20efada7ef7`. Kryssnedtrapping: olanzapin → kvetiapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Kvetiapin (vanlig frisetting) trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni, deretter 300–450 mg daglig.
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
- Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres, uten opphold.
  - Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres. Et opphold uten antipsykotikum anbefales ikke. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om byttestrategier)*
- Gradvis nedtrapping av olanzapin bør vurderes.
  - Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne. *([ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf), section 4.2 og 4.4)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR holder olanzapin uendret til kvetiapin er på 300 mg (dag 4). Nedtrappingen av olanzapin deretter beregnes ikke, men planlegges individuelt (kontrollrunden 30.10.2026).
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
  - Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres. Et opphold uten antipsykotikum anbefales ikke. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), tabell 4 og avsnittet om byttestrategier)*
- Regelen gjelder bare måldoser i det anbefalte vedlikeholdsområdet 300–450 mg; andre måldoser krever individuell vurdering.
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (hold) | varighet.dager | 4 dager | veiledende | **OUSFAR-vurdering, åpent forslag:** Til kvetiapin har nådd 300 mg dag 4. (bygger på dmp-seroquel pkt. 4.2) |
| til: fase 1 (opptrapping) | trinn[0].mg | 50 mg | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[0].dager | 1 dager | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[1].mg | 100 mg | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[1].dager | 1 dager | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[2].mg | 200 mg | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[2].dager | 1 dager | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[3].mg | 300 mg | veiledende | dmp-seroquel pkt. 4.2 |
| til: fase 1 (opptrapping) | trinn[3].dager | 1 dager | veiledende | dmp-seroquel pkt. 4.2 |

**Betingelser:**

- Startdose 5–20 mg (bindende; ema-zyprexa section 4.2)
- Måldose (må oppgis) 300–450 mg (bindende; dmp-seroquel pkt. 4.2)
- Må bekreftes (`indikasjon`): Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni. (dmp-seroquel pkt. 4.2)
- Må bekreftes (`peroral_formulering`): Pasienten bruker peroral olanzapin, ikke depotinjeksjon. (keks-2019 avsnittet om byttestrategier)
- Må bekreftes (`spesialist_risiko`): Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. (**OUSFAR-vurdering, åpent forslag:** Kontrollrunden 30.10.2026 fant at ingen fast byttemodell er validert for alle pasienter: redusert antipsykotisk dekning kan gi tilbakefall, og overlapp kan gi sedasjon og ortostase. (bygger på keks-2019 tabell 4 og avsnittet om byttestrategier))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Kvetiapin gis som tabletter med vanlig frisetting, to ganger daglig; døgndosen er oppgitt.

**Usikkerhet:**

- Kildene oppgir ingen varighet for nedtrappingen av olanzapin; den faste nedtrappingen med 25 % av startdosen per uke i versjon 2 var OUSFARs valg og er tatt ut.
- Sedasjon og ortostatisk blodtrykksfall kan øke mens begge brukes; det må følges klinisk.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Olanzapin 20 mg til kvetiapin 300 mg.* Inndata: startdose 20 mg; måldose 300 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **fra:** dag 1–4: 20 mg; fra dag 5: videre dosering beregnes ikke; planlegges individuelt
  - **til:** dag 1: 50 mg; dag 2: 100 mg; dag 3: 200 mg; fra dag 4: 300 mg
  - Kontroll: Bekreftet: Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 300–450 mg (bindende) – oppfylt. 300 mg.
- *Olanzapin 10 mg til kvetiapin 400 mg med startdato 2. november 2026.* Inndata: startdose 10 mg; måldose 400 mg; startdato 02.11.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **fra:** dag 1–4 (02.11.2026–05.11.2026): 10 mg; fra dag 5 (06.11.2026): videre dosering beregnes ikke; planlegges individuelt
  - **til:** dag 1 (02.11.2026): 50 mg; dag 2 (03.11.2026): 100 mg; dag 3 (04.11.2026): 200 mg; dag 4 (05.11.2026): 300 mg; fra dag 5 (06.11.2026): 400 mg
  - Kontroll: Bekreftet: Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 300–450 mg (bindende) – oppfylt. 400 mg.
- *30 mg olanzapin er over doseområdet regelen gjelder for.* Inndata: startdose 30 mg; måldose 300 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **Stoppet:** Startdosen 30 mg er utenfor det regelen gjelder for (5–20 mg).
- *Uten bekreftelse av at olanzapin er peroral (ikke depot) stopper beregningen.* Inndata: startdose 20 mg; måldose 300 mg; bekreftet: indikasjon, spesialist_risiko.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker peroral olanzapin, ikke depotinjeksjon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Ol>Qu`.

## Bytte fra et antipsykotikum i gruppen «øvrige antipsykotika» til aripiprazol, kryss-titrering

`gruppe-rest-ap-aripiprazol`, versjon 4, fingeravtrykk `be187975c27404d81fc3e2446528516bdc5c5e6b5be7640c512cd527a071d433`. Kryssnedtrapping: gruppen rest-ap → aripiprazol. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code).

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
  - Merknad: Dosen av aripiprazol holdes på 10 mg til zuklopentiksol er avsluttet. Avslutningen av zuklopentiksol vurderes individuelt, og videre dosering av aripiprazol beregnes ikke, men planlegges individuelt sammen med den.
- *Flupentiksol er medlem av gruppen, men ikke vurdert individuelt, så beregningen stopper.* Inndata: startdose 6 mg; virkestoff flupentiksol; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **Stoppet:** flupentiksol er ikke vurdert individuelt for gruppeanbefalingen: Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4).

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:RA>Pa`.

## Fra peroral aripiprazol til Abilify Maintena, oppstart med én injeksjon

`depot-aripiprazol-maintena`, versjon 2, fingeravtrykk `659ab5f674c2c8fcbb4b8523e61f6e55086625216e824485f0c1ac02b2fa2430`. Oppstart av depot: aripiprazol → aripiprazol. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Depotet er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på peroral aripiprazol, og tolerabilitet må være vist før det startes.
  - Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på peroral aripiprazol. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.1)*
  - Har pasienten aldri brukt aripiprazol, må tolerabilitet med peroral aripiprazol være vist før depotet startes. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
- Ved oppstart med én injeksjon gis 400 mg på startdagen, og peroral aripiprazol 10–20 mg fortsetter i 14 dager.
  - Oppstart med én injeksjon: 400 mg på startdagen, og peroral aripiprazol 10–20 mg daglig i 14 dager på rad. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
- Vedlikehold er 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon.
  - Vedlikehold 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon; 300 mg ved bivirkninger. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
- Langsomme CYP2D6-omsettere, sterke hemmere og induktorer krever andre doser eller bør unngås.
  - Kjente langsomme CYP2D6-omsettere skal ha andre doser (300 mg) og ikke oppstart med to injeksjoner. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
  - Ved samtidig bruk av sterke CYP2D6- eller CYP3A4-hemmere i mer enn 14 dager skal dosen reduseres. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
  - Samtidig bruk av CYP3A4-induktorer i mer enn 14 dager bør unngås. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Den perorale dosen pasienten bruker, fortsetter uendret i 14 dager (dag 1–14) og seponeres deretter.
  - Oppstart med én injeksjon: 400 mg på startdagen, og peroral aripiprazol 10–20 mg daglig i 14 dager på rad. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
- Oppstart med to injeksjoner er ikke tatt med i piloten.
  - Alternativ oppstart: to injeksjoner à 400 mg samme dag på to ulike steder, med én peroral dose på 20 mg. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*
- Dosereduksjon til 300 mg ved bivirkninger er en klinisk vurdering og beregnes ikke.
  - Vedlikehold 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon; 300 mg ved bivirkninger. *([ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf), section 4.2)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| fra: fase 1 (hold) | varighet.dager | 14 dager | bindende krav | ema-abilify-maintena section 4.2 |
| til: fase 1 (injeksjoner) | start[0].dag | 1 (dag) | bindende krav | ema-abilify-maintena section 4.2 |
| til: fase 1 (injeksjoner) | start[0].dose.mg | 400 mg | bindende krav | ema-abilify-maintena section 4.2 |
| til: fase 1 (injeksjoner) | vedlikehold.dose.mg | 400 mg | veiledende | ema-abilify-maintena section 4.2 |
| til: fase 1 (injeksjoner) | vedlikehold.maaneder | 1 måned(er) | bindende krav | ema-abilify-maintena section 4.2 |
| til: fase 1 (injeksjoner) | vedlikehold.tidligst_dager | 26 dager | bindende krav | ema-abilify-maintena section 4.2 |

**Betingelser:**

- Startdose 10–20 mg (bindende; ema-abilify-maintena section 4.2)
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol. (ema-abilify-maintena section 4.1; ema-abilify-maintena section 4.2)
- Unntak (`cyp2d6_langsom`): Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser. (ema-abilify-maintena section 4.2)
- Unntak (`sterk_cyp_hemmer`): Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres. (ema-abilify-maintena section 4.2)
- Unntak (`cyp3a4_induktor`): Pasienten bruker en CYP3A4-induktor, som bør unngås sammen med depotet. (ema-abilify-maintena section 4.2)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker peroral aripiprazol 10–20 mg daglig.
- Forskriveren har vurdert hvert unntak (CYP2D6-status, hemmere og induktorer) og svart nei; et ubesvart unntak stopper beregningen. «Nei» om CYP2D6 betyr at pasienten ikke er kjent langsom omsetter.

**Usikkerhet:**

- Regelen gjelder Abilify Maintena; andre aripiprazoldepoter (andre estere eller intervaller) har egne oppstartsregimer og er ikke omfattet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Peroral aripiprazol 15 mg; indikasjonen bekreftet og alle unntak avkreftet.* Inndata: startdose 15 mg; bekreftet: indikasjon; pasientforhold: cyp2d6_langsom nei, sterk_cyp_hemmer nei, cyp3a4_induktor nei.
  - **fra:** dag 1–14: 15 mg; fra dag 15: seponert
  - **til:** dag 1: 400 mg injeksjon; hver måned fra 1 måned etter dag 1, tidligst 26 dager etter forrige: 400 mg injeksjon
  - Kontroll: Avkreftet: Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker en CYP3A4-induktor, som bør unngås sammen med depotet. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 10–20 mg (bindende) – oppfylt. 15 mg.
- *Kjent langsom CYP2D6-omsetter: regelen gjelder ikke.* Inndata: startdose 15 mg; bekreftet: indikasjon; pasientforhold: cyp2d6_langsom ja, sterk_cyp_hemmer nei, cyp3a4_induktor nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser.
- *Hemmere og induktorer er ikke vurdert: ukjent stopper like mye som et unntak som gjelder.* Inndata: startdose 15 mg; bekreftet: indikasjon; pasientforhold: cyp2d6_langsom nei.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.; Må avklares før beregning (ukjent): Pasienten bruker en CYP3A4-induktor, som bør unngås sammen med depotet.
- *Uten bekreftet indikasjon og tolerabilitet stopper beregningen.* Inndata: startdose 15 mg; pasientforhold: cyp2d6_langsom nei, sterk_cyp_hemmer nei, cyp3a4_induktor nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pa>Da`.

## Fra peroral paliperidon depottablett til Xeplion

`depot-paliperidon-xeplion`, versjon 2, fingeravtrykk `19158b1df8057ab8285458b0e5957b3902c8c1a40da33ceb43a915fb32f35545`. Oppstart av depot: paliperidon → paliperidon. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Xeplion startes med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Andre oppstartsdose kan gis inntil 4 dager før eller etter dag 8; vedlikeholdsdosene inntil 7 dager før eller etter månedsdatoen. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (glemte doser))*
- Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.
  - Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.1)*
- Vedlikeholdsdosen som gir tilsvarende eksponering som 3, 6, 9 og 12 mg peroralt, er 25–50, 75, 100 og 150 mg.
  - Peroral paliperidon depottablett 3, 6, 9 og 12 mg daglig tilsvarer ved vedlikehold 25–50, 75, 100 og 150 mg Xeplion månedlig. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Ved nedsatt nyrefunksjon er start- og vedlikeholdsdosene andre, og under 50 ml/min anbefales ikke Xeplion.
  - Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (nedsatt nyrefunksjon))*
- Den perorale behandlingen kan seponeres når Xeplion startes.
  - Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Ved bytte mellom peroral behandling og depot må preparatspesifikke instruksjoner følges.
  - Ved bytte mellom peroral behandling og depot må preparatspesifikke instruksjoner følges. *([keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML), avsnittet om byttestrategier)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- OUSFAR seponerer den perorale behandlingen dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.
  - Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Ved 3 mg peroralt oppgis vedlikeholdsdosen som spennet 25–50 mg. Valget i spennet er en klinisk vurdering: forskriveren må oppgi dosen som måldose, ellers stopper beregningen. Ved 6, 9 og 12 mg må en oppgitt måldose være lik tabellens.
  - Peroral paliperidon depottablett 3, 6, 9 og 12 mg daglig tilsvarer ved vedlikehold 25–50, 75, 100 og 150 mg Xeplion månedlig. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
- Bytte fra peroral risperidon er ikke tatt med, fordi preparatomtalen ikke har en omregning fra risperidondose. *(OUSFARs vurdering)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (injeksjoner) | start[0].dag | 1 (dag) | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | start[0].dose.mg | 150 mg | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | start[1].dag | 8 (dag) | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | start[1].dose.mg | 100 mg | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | start[1].vindu_dager | 4 dager | bindende krav | ema-xeplion section 4.2 (glemte doser) |
| til: fase 1 (injeksjoner) | vedlikehold.maaneder | 1 måned(er) | bindende krav | ema-xeplion section 4.2 |
| til: fase 1 (injeksjoner) | vedlikehold.vindu_dager | 7 dager | bindende krav | ema-xeplion section 4.2 (glemte doser) |
| til: vedlikeholdsdose | omregningstabell | 3 → 25–50 mg, 6 → 75 mg, 9 → 100 mg, 12 → 150 mg | bindende krav | ema-xeplion section 4.2 (bytte fra peroral) |

**Betingelser:**

- Startdose 3, 6, 9, 12 mg (bindende; ema-xeplion section 4.2 (bytte fra peroral))
- Må bekreftes (`indikasjon`): Pasienten er voksen, har schizofreni og er stabilisert på peroral paliperidon depottablett. (ema-xeplion section 4.1; ema-xeplion section 4.2 (bytte fra peroral))
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. (ema-xeplion section 4.2 (nedsatt nyrefunksjon))

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten bruker én av depottablettstyrkene 3, 6, 9 eller 12 mg daglig.
- Forskriveren har vurdert nyrefunksjonen og svart at kreatininclearance ikke er under 80 ml/min; ubesvart stopper beregningen.

**Usikkerhet:**

- Ved bytte fra 9–12 mg til injeksjon i setemuskelen kan eksponeringen bli lavere de første seks månedene (preparatomtalen); valg av injeksjonssted beregnes ikke.
- Tremånedersdepotene (Trevicta, Byannli) har egne regler og er ikke omfattet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Paliperidon depottablett 6 mg; indikasjonen bekreftet og nedsatt nyrefunksjon avkreftet.* Inndata: startdose 6 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei.
  - **fra:** fra dag 1: seponert
  - **til:** dag 1: 150 mg injeksjon, deltoideus; dag 8 (±4 dager): 100 mg injeksjon, deltoideus; hver måned fra 1 måned etter dag 8 (±7 dager): 75 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på peroral paliperidon depottablett. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 3, 6, 9, 12 mg (bindende) – oppfylt. 6 mg.
- *Fra 3 mg med klinikerens valg 50 mg i spennet 25–50 mg, startdato 24. januar 2027: dag 8 er 31. januar, og én måned senere er siste dag i februar.* Inndata: startdose 3 mg; måldose 50 mg; startdato 24.01.2027; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei.
  - **fra:** fra dag 1 (24.01.2027): seponert
  - **til:** dag 1 (24.01.2027): 150 mg injeksjon, deltoideus; dag 8 (31.01.2027, ±4 dager): 100 mg injeksjon, deltoideus; hver måned fra 1 måned etter dag 8 (28.02.2027, ±7 dager): 50 mg injeksjon, deltoideus eller setemuskel
  - Kontroll: Avkreftet: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er voksen, har schizofreni og er stabilisert på peroral paliperidon depottablett. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 3, 6, 9, 12 mg (bindende) – oppfylt. 3 mg.
- *Fra 3 mg uten valgt dose i spennet: beregningen velger ikke selv, og stopper.* Inndata: startdose 3 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei.
  - **Stoppet:** Ved 3 mg gir omregningstabellen et spenn på 25–50 mg. Dosen i spennet er et klinisk valg og må oppgis som måldose; beregningen velger ikke selv.
- *15 mg finnes ikke i omregningstabellen, så beregningen stopper.* Inndata: startdose 15 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon nei.
  - **Stoppet:** Startdosen 15 mg er utenfor det regelen gjelder for (3, 6, 9, 12 mg).
- *Kreatininclearance under 80 ml/min: regelen gjelder ikke.* Inndata: startdose 6 mg; bekreftet: indikasjon; pasientforhold: nedsatt_nyrefunksjon ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.
- *Nyrefunksjonen er ikke vurdert: ukjent stopper like mye som nedsatt.* Inndata: startdose 6 mg; bekreftet: indikasjon.
  - **Stoppet:** Må avklares før beregning (ukjent): Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Pp>Dp`.
