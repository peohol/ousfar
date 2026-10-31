# OUSFAR Verktøy – P4: pilotsettet

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-pilot` versjon 13, regelmodell 11, beregningsmotor 9. Pilotsett for regelmodellen i P4: én regel per regelklasse planen prioriterer. Etter kontrollrunden 30.10.2026 er byttereglene rettet eller avgrenset og sendt til ny kontroll, og de to depotreglene er funnet kildemessig akseptable som avgrensede varianter. Etter kontrollørens beslutninger samme dag er byttene avgrenset slik kontrolløren godtok dem, gruppebyttet til aripiprazol er tatt ut av verktøyet (en modelleringsdemonstrasjon i utviklingssettet), og depotreglene er koblet til preparatet sitt i FEST. Etter kontrollørens gjennomgang av de rettede versjonene er kvetiapin bundet til tabletter med vanlig frisetting fordelt på to doser, og fenelzin vises som utvasking fullført, ikke som oppstart. Etter gjennomgangen av 62ebb21 er de to depotreglene (versjon 3) klinisk godkjent av den uavhengige kontrolløren, bare for nøyaktig de avgrensede oppstartene, og fenelzinregelen står som modell for utvaskingen, ikke som en godkjennbar samlet doseplan. Etter gjennomgangene av 9cb420b, 0ae6d07 og d6cc3dd gjelder byttet fra sertralin til mirtazapin (versjon 8) bare 50 mg og 100 mg sertralin, med bekreftet kontroll av serotonerg sammedisinering, og det kliniske omfanget er bare kort behandlingstid med tablettene og styrkene i FEST som er kontrollert. De tre byttereglene er til faglig kontroll og brukes ikke i appen.

**5 regler, 2 klinisk godkjent.** Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. 2 av reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; de andre er ikke, og beregningene etter dem er ikke kliniske anbefalinger. Ingen av beregningene er empirisk validerte. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-p4-regelmodell.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `kryssnedtrapping-sertralin-mirtazapin` | kryssnedtrapping | sertralin → mirtazapin | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 4 |
| `mao-fluoksetin-fenelzin` | sekvensielt bytte | fluoksetin → fenelzin | beregnbar etter faglig avklaring | 4 | til faglig kontroll | 3 |
| `antipsykotikabytte-olanzapin-kvetiapin` | kryssnedtrapping | olanzapin → kvetiapin | beregnbar etter faglig avklaring | 2 | til faglig kontroll | 4 |
| `depot-aripiprazol-maintena` | oppstart av depot | aripiprazol → aripiprazol | entydig beregnbar | 0 | klinisk godkjent | 4 |
| `depot-paliperidon-xeplion` | oppstart av depot | paliperidon → paliperidon | entydig beregnbar | 0 | klinisk godkjent | 6 |

## Kilder

Hentet og lest 28.10.2026 og 30.10.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-zoloft](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08203.pdf) | preparatomtale | Zoloft (sertralin) tabletter, preparatomtale | Oppdatert 07.01.2026 | `4ac8f7305379de98…` |
| [dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf) | preparatomtale | Fluoxetine Vitabalans (fluoksetin) tabletter, preparatomtale | Oppdatert 12.11.2021 | `221a73511f81243a…` |
| [dmp-remeron](https://produktinformasjon.legemiddelsok.no/preparatomtaler/1997-03657.pdf) | preparatomtale | Remeron (mirtazapin) tabletter, preparatomtale | Oppdatert 01.09.2021 | `2bc89cecfe0b2a80…` |
| [dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf) | preparatomtale | Seroquel (kvetiapin) tabletter, preparatomtale | Oppdatert 03.07.2024 | `87e197ef056358d0…` |
| [ema-abilify-maintena](https://www.ema.europa.eu/en/documents/product-information/abilify-maintena-epar-product-information_en.pdf) | preparatomtale | Abilify Maintena (aripiprazol depotinjeksjon), produktinformasjon | Sist endret 08.10.2026 | `41ea025269b746fe…` |
| [ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf) | preparatomtale | Xeplion (paliperidonpalmitat depotinjeksjon), produktinformasjon | Sist endret 08.10.2026 | `2d38bdc767adb9ed…` |
| [emc-nardil](https://www.medicines.org.uk/emc/product/228/smpc) | preparatomtale | Nardil (fenelzin) 15 mg filmdrasjerte tabletter, britisk preparatomtale (SmPC) | Revidert 02.07.2025 | `ace676d3533deee6…` |
| [ema-zyprexa](https://www.ema.europa.eu/en/documents/product-information/zyprexa-epar-product-information_en.pdf) | preparatomtale | Zyprexa (olanzapin), produktinformasjon | Sist endret 08.10.2026 | `d7a60e6f4908c9e7…` |
| [nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations) | retningslinje | Depression in adults: treatment and management (NG222), Recommendations | Publisert 29.06.2022 | `8fb54d455ce9ebee…` |
| [rcpsych-stopping](https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants) | retningslinje | Stopping antidepressants | Publisert mars 2024 | `f465fb1dbece0c76…` |
| [keks-2016](https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/) | oversiktsartikkel | Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83 | doi:10.18773/austprescr.2016.039, PMC4919171 | `55c5b956f46b02f9…` |
| [keks-2019](https://www.ebi.ac.uk/europepmc/webservices/rest/PMC6787301/fullTextXML) | oversiktsartikkel | Keks N, Schwartz D, Hope J. Stopping and switching antipsychotic drugs. Aust Prescr 2019;42:152–157 | doi:10.18773/austprescr.2019.052, PMC6787301 | `26102eb58a504876…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Bytte fra sertralin til mirtazapin, kryssnedtrapping

`kryssnedtrapping-sertralin-mirtazapin`, versjon 8, fingeravtrykk `89db19ef05c928ee8e3f58581f55a4476821d5eb765b7bf749f5d5d0cedf512d`. Kryssnedtrapping: sertralin → mirtazapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code) → utkast (versjon 5, 30.10.2026, Claude Code) → til faglig kontroll (versjon 5, 30.10.2026, Claude Code) → til faglig kontroll (versjon 5, 31.10.2026, ChatGPT (uavhengig fagkontrollør)) → utkast (versjon 6, 31.10.2026, Claude Code) → til faglig kontroll (versjon 6, 31.10.2026, Claude Code) → til faglig kontroll (versjon 6, 31.10.2026, ChatGPT (uavhengig fagkontrollør)) → utkast (versjon 7, 31.10.2026, Claude Code) → til faglig kontroll (versjon 7, 31.10.2026, Claude Code) → til faglig kontroll (versjon 7, 31.10.2026, ChatGPT (uavhengig fagkontrollør)) → utkast (versjon 8, 31.10.2026, Claude Code) → til faglig kontroll (versjon 8, 31.10.2026, Claude Code).

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
- Lang behandlingstid er utenfor det kliniske omfanget (kontrollørens gjennomgang av d6cc3dd 31.10.2026): også med en begrunnelse gir regelen da ingen klinisk plan, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping. Det kliniske omfanget er bare sertralin 50 eller 100 mg ved kort behandlingstid, med tablettene og styrkene i FEST som er kontrollert.
  - Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder. *([nice-ng222](https://www.nice.org.uk/guidance/ng222/chapter/Recommendations), anbefaling 1.4.16)*
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

- Startdose 50, 100 mg (bindende; **OUSFAR-vurdering, avklart 31.10.2026 av ChatGPT (uavhengig fagkontrollør) (versjon 6): Kontrollørens gjennomgang av 0ae6d07 (P4.8): bindende verdier 50 og 100 mg, ikke et sammenhengende område:** Regelen gjelder bare sertralin 50 mg og 100 mg, de to startdosene som er verifisert ende til ende med preparatene i FEST. Preparatomtalen tillater opptil 200 mg, men andre doser, også dosene mellom 50 og 100 mg, er ikke verifisert, så byttet planlegges da individuelt. (bygger på dmp-zoloft pkt. 4.2))
- Må bekreftes (`toleranse_overlapp`): Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. (nice-ng222 anbefaling 1.4.16; rcpsych-stopping How should I gradually reduce my dose?; nice-ng222 anbefaling 1.9.9)
- Må bekreftes (`serotonerg_sammedisinering`): Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør overlappen mellom sertralin og mirtazapin mer risikofylt. (nice-ng222 anbefaling 1.9.9)
- Unntak (`tidligere_seponeringssymptomer`): Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. (nice-ng222 anbefaling 1.4.15; rcpsych-stopping If you have been taking antidepressants for longer)
- Må besvares (`lang_behandlingstid`): Har pasienten brukt sertralin i mange måneder eller lenger? Et ja krever en skriftlig begrunnelse. (rcpsych-stopping If you have been taking antidepressants for longer; nice-ng222 anbefaling 1.4.16)

**Klinisk omfang** (en klinisk godkjenning kan bare gjelde disse tilfellene; alt annet stopper med forklaring, også et annet valg av trinnstørrelse eller trinnlengde, med eller uten begrunnelse; **OUSFAR-vurdering, avklart 31.10.2026 av ChatGPT (uavhengig fagkontrollør) (versjon 7): Kontrollørens gjennomgang av d6cc3dd (P4.8): godkjennbart bare som begrenset innledende kryssnedtrapping ved ikke-langvarig behandling; lang behandlingstid er ikke del av omfanget, selv med begrunnelse:** En klinisk godkjenning kan bare gjelde startforløpet fra sertralin 50 eller 100 mg ved kort behandlingstid, med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende. Lang behandlingstid er utenfor, også med begrunnelse, og det samme er en annen trinnlengde enn 14 dager. (bygger på nice-ng222 anbefaling 1.4.16; rcpsych-stopping If you have been taking antidepressants for longer)):

- 50 og 100 mg, FEST-legemiddelform 53, med nei på alle spørsmålene, styrker (fra) 25, 50 og 100 mg, styrker (til) 15, 30 og 45 mg

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.

**Usikkerhet:**

- Ved samtidig bruk kan serotonerge bivirkninger øke; overlappens lengde er OUSFARs valg.
- NICE åpner for raskere nedtrapping ved bytte; 14 dager per trinn kan være lengre enn nødvendig.
- Om og når siste sertralindose seponeres, er forskriverens individuelle valg (kontrollørens beslutning P4-A 30.10.2026); regelen beregner det ikke, og det er ikke et åpent spørsmål for beregningen.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Sertralin 100 mg til mirtazapin: halvering til 25 mg; seponeringen derfra og måldosen for mirtazapin planlegges individuelt.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** dag 1–14: 50 mg; fra dag 15: 25 mg; siste trinn før null; avslutning vurderes individuelt
  - **til:** fra dag 1: 15 mg; holdes til sertralin er avsluttet; videre dosering planlegges individuelt
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør overlappen mellom sertralin og mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt sertralin i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 50, 100 mg (bindende) – oppfylt. 100 mg.
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 15 står pasienten på 25 mg av sertralin til planen revurderes. Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose. Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.
  - Merknad: Dosen av mirtazapin holdes på 15 mg til sertralin er avsluttet. Avslutningen av sertralin vurderes individuelt, og videre dosering av mirtazapin beregnes ikke, men planlegges individuelt sammen med den.
  - Merknad: Dagene og datoene er tidligste mulige tidspunkt dersom alle tidligere reduksjoner gjennomføres som planlagt; utsettes et trinn, forskyves alle senere tidspunkter tilsvarende.
- *Sertralin 50 mg til mirtazapin: én reduksjon til 25 mg, som fortsetter til avslutningen er vurdert.* Inndata: startdose 50 mg; bekreftet: toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid nei.
  - **fra:** fra dag 1: 25 mg; siste trinn før null; avslutning vurderes individuelt
  - **til:** fra dag 1: 15 mg; holdes til sertralin er avsluttet; videre dosering planlegges individuelt
  - Kontroll: Avkreftet: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør overlappen mellom sertralin og mirtazapin mer risikofylt. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Har pasienten brukt sertralin i mange måneder eller lenger? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 50, 100 mg (bindende) – oppfylt. 50 mg.
  - Merknad: Regelens siste trinn før null er nådd. Fra dag 1 står pasienten på 25 mg av sertralin til planen revurderes. Planen stopper her av tekniske grunner. Fortsett med denne dosen inntil forskriveren har vurdert videre nedtrapping. Dosen er ikke nødvendigvis en sluttdose. Planen går ikke til null og foreslår ingen dato for siste dose. En ny plan beregnes fra dosen pasienten faktisk bruker når forskriveren revurderer, ikke nødvendigvis siste dose her, og tidligere symptomer, toleranse og utsettelser må vurderes.
  - Merknad: Dosen av mirtazapin holdes på 15 mg til sertralin er avsluttet. Avslutningen av sertralin vurderes individuelt, og videre dosering av mirtazapin beregnes ikke, men planlegges individuelt sammen med den.
- *Etter seponeringssymptomer ved et tidligere forsøk gjelder ikke regelen; byttet planlegges individuelt.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer ja; svar: lang_behandlingstid nei.
  - **Stoppet:** Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn.
- *Ved lang behandlingstid krever den faste halveringen en skriftlig begrunnelse.* Inndata: startdose 100 mg; bekreftet: toleranse_overlapp, serotonerg_sammedisinering; pasientforhold: tidligere_seponeringssymptomer nei; svar: lang_behandlingstid ja.
  - **Stoppet:** Svaret ja (lang behandlingstid) krever en skriftlig begrunnelse fra forskriveren, en særskilt vurdering. Skriv begrunnelsen, eller vurder om regelen passer.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Se>Mz`.

## Bytte fra fluoksetin til fenelzin, sekvensielt med utvasking

`mao-fluoksetin-fenelzin`, versjon 7, fingeravtrykk `f5a08286869d143797cb3f032b0781c7c0e5785265d1a9198c7ebaa280402b6a`. Sekvensielt bytte: fluoksetin → fenelzin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code) → utkast (versjon 5, 30.10.2026, Claude Code) → til faglig kontroll (versjon 5, 30.10.2026, Claude Code) → utkast (versjon 6, 30.10.2026, Claude Code) → til faglig kontroll (versjon 6, 30.10.2026, Claude Code) → utkast (versjon 7, 30.10.2026, Claude Code) → til faglig kontroll (versjon 7, 30.10.2026, Claude Code) → til faglig kontroll (versjon 7, 30.10.2026, ChatGPT (uavhengig fagkontrollør)).

**Kildetro – det som følger direkte av kildene:**

- Fluoksetin og en irreversibel, ikke-selektiv MAO-hemmer skal ikke brukes samtidig; det skal gå minst 5 uker fra fluoksetin er seponert til MAO-hemmeren startes.
  - Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes. *([dmp-fluoxetin](https://produktinformasjon.legemiddelsok.no/preparatomtaler/10-7362.pdf), pkt. 4.3 og 4.5)*
- Den britiske preparatomtalen for fenelzin sier at det må gå lang nok tid til at fluoksetin er skilt ut, med 5 uker som eksempel; den gir ikke et eget minimum. Minimumet på 35 dager kommer fra preparatomtalen for fluoksetin.
  - Fenelzin brukes ikke sammen med serotoninreopptakshemmere; det må gå lang nok tid til at de og metabolittene er skilt ut, for eksempel 5 uker etter fluoksetin. *([emc-nardil](https://www.medicines.org.uk/emc/product/228/smpc), section 4.5)*
- Fenelzin har viktige kontraindikasjoner og interaksjoner, blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.
  - Preparatomtalen har viktige kontraindikasjoner og interaksjoner, blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin. *([emc-nardil](https://www.medicines.org.uk/emc/product/228/smpc), section 4.3 og 4.5)*
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
- Fenelzindelen er utvaskingsinformasjon, ikke en oppstartsplan (kontrollørens beslutning P4-A 30.10.2026): verktøyet kontrollerer ikke fenelzins kontraindikasjoner og interaksjoner, så de står framhevet i planen og må kontrolleres klinisk ved en eventuell oppstart.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Fluoksetin 40 mg: to reduksjoner med 28 dager per trinn og 35 dager utvasking; dag 92 er tidligste dag en oppstart av fenelzin kan vurderes, ikke en oppstart.* Inndata: startdose 40 mg; bekreftet: spesialisthelsetjeneste.
  - **fra:** dag 1–28: 20 mg; dag 29–56: 10 mg; fra dag 57: seponert
  - **til:** tidligst dag 92: 35 dagers utvasking fullført; fenelzin er ikke startet eller dosert av planen. Klinisk oppstart kan først vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 40 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–56 (56 dager).
  - Kontroll: Minst 35 dager uten fluoksetin før fenelzin (bindende) – oppfylt. Uten legemiddel dag 57–91 (35 dager); fenelzin tidligst dag 92.
  - Merknad: fenelzin: Fenelzin startes ikke automatisk: dagen planen viser, er den tidligste etter minimum 35 dagers utvasking, ikke en anbefalt startdag. Senere oppstart kan være nødvendig etter høy dose eller lang behandling med fluoksetin, ved interaksjoner og etter klinisk vurdering. Fenelzin har ingen norsk preparatomtale (bare godkjenningsfritak); startdose og opptrapping vurderes i spesialisthelsetjenesten. Før en eventuell oppstart må fenelzins kontraindikasjoner og interaksjoner kontrolleres klinisk (den britiske preparatomtalen, pkt. 4.3 og 4.5), blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.
- *Fluoksetin 20 mg: én reduksjon; dag 64 er tidligste dag en oppstart av fenelzin kan vurderes.* Inndata: startdose 20 mg; bekreftet: spesialisthelsetjeneste.
  - **fra:** dag 1–28: 10 mg; fra dag 29: seponert
  - **til:** tidligst dag 64: 35 dagers utvasking fullført; fenelzin er ikke startet eller dosert av planen. Klinisk oppstart kan først vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 20–60 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Nedtrappingen av fluoksetin varer minst 14 dager (bindende) – oppfylt. Nedtrapping dag 1–28 (28 dager).
  - Kontroll: Minst 35 dager uten fluoksetin før fenelzin (bindende) – oppfylt. Uten legemiddel dag 29–63 (35 dager); fenelzin tidligst dag 64.
  - Merknad: fenelzin: Fenelzin startes ikke automatisk: dagen planen viser, er den tidligste etter minimum 35 dagers utvasking, ikke en anbefalt startdag. Senere oppstart kan være nødvendig etter høy dose eller lang behandling med fluoksetin, ved interaksjoner og etter klinisk vurdering. Fenelzin har ingen norsk preparatomtale (bare godkjenningsfritak); startdose og opptrapping vurderes i spesialisthelsetjenesten. Før en eventuell oppstart må fenelzins kontraindikasjoner og interaksjoner kontrolleres klinisk (den britiske preparatomtalen, pkt. 4.3 og 4.5), blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.
- *Uten bekreftelse om spesialisthelsetjenesten stopper beregningen.* Inndata: startdose 40 mg.
  - **Stoppet:** Må bekreftes før beregning: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntidepressants:Fo>Fe`.

## Bytte fra olanzapin til kvetiapin, kryss-titrering med fast opptrapping

`antipsykotikabytte-olanzapin-kvetiapin`, versjon 5, fingeravtrykk `af1093a3a02176f584d783b567656bffe5fad00cfffefb75390122a11b951f12`. Kryssnedtrapping: olanzapin → kvetiapin. **Beregnbar etter faglig avklaring**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → utkast (versjon 4, 30.10.2026, Claude Code) → til faglig kontroll (versjon 4, 30.10.2026, Claude Code) → utkast (versjon 5, 30.10.2026, Claude Code) → til faglig kontroll (versjon 5, 30.10.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Kvetiapin (vanlig frisetting) trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni, deretter 300–450 mg daglig.
  - Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
- Tablettene med vanlig frisetting tas to ganger daglig.
  - Tablettene med vanlig frisetting tas to ganger daglig; ved schizofreni gjelder døgndosene dag 1–4 og vedlikeholdsdosen fordelt på to doser. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*
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
- Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter, som har en annen opptrapping og vanligvis gis én gang daglig. Hver døgndose, også vedlikeholdsdosen, gis fordelt på to doser som kan settes sammen av tablettene; kan den ikke det, stopper planen.
  - Tablettene med vanlig frisetting tas to ganger daglig; ved schizofreni gjelder døgndosene dag 1–4 og vedlikeholdsdosen fordelt på to doser. *([dmp-seroquel](https://produktinformasjon.legemiddelsok.no/preparatomtaler/02-1435.pdf), pkt. 4.2)*

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
- Kvetiapin gis som tabletter med vanlig frisetting, to ganger daglig; planen viser døgndosen og fordelingen.

**Usikkerhet:**

- Kildene oppgir ingen varighet for nedtrappingen av olanzapin; den faste nedtrappingen med 25 % av startdosen per uke i versjon 2 var OUSFARs valg og er tatt ut.
- Sedasjon og ortostatisk blodtrykksfall kan øke mens begge brukes; det må følges klinisk.
- Opptrappingen av kvetiapin bygger på preparatomtalen, men validerer ikke kryssbyttet som helhet (kontrollørens beslutning P4-A 30.10.2026).

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Olanzapin 20 mg til kvetiapin 300 mg.* Inndata: startdose 20 mg; måldose 300 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **fra:** dag 1–4: 20 mg; fra dag 5: videre dosering beregnes ikke; planlegges individuelt
  - **til:** dag 1: 50 mg, fordelt på 2 doser; dag 2: 100 mg, fordelt på 2 doser; dag 3: 200 mg, fordelt på 2 doser; fra dag 4: 300 mg, fordelt på 2 doser
  - Kontroll: Bekreftet: Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 20 mg.
  - Kontroll: Måldosen er 300–450 mg (bindende) – oppfylt. 300 mg.
  - Merknad: olanzapin: Nedtrappingen av olanzapin beregnes ikke: et fast skjema er ikke validert (kontrollrunden 30.10.2026). Den planlegges i, eller med råd fra, spesialisthelsetjenesten og tilpasses toleransen og symptomene; olanzapin seponeres ikke brått.
- *Olanzapin 10 mg til kvetiapin 400 mg med startdato 2. november 2026.* Inndata: startdose 10 mg; måldose 400 mg; startdato 02.11.2026; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **fra:** dag 1–4 (02.11.2026–05.11.2026): 10 mg; fra dag 5 (06.11.2026): videre dosering beregnes ikke; planlegges individuelt
  - **til:** dag 1 (02.11.2026): 50 mg, fordelt på 2 doser; dag 2 (03.11.2026): 100 mg, fordelt på 2 doser; dag 3 (04.11.2026): 200 mg, fordelt på 2 doser; dag 4 (05.11.2026): 300 mg, fordelt på 2 doser; fra dag 5 (06.11.2026): 400 mg, fordelt på 2 doser
  - Kontroll: Bekreftet: Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker peroral olanzapin, ikke depotinjeksjon. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Startdosen er 5–20 mg (bindende) – oppfylt. 10 mg.
  - Kontroll: Måldosen er 300–450 mg (bindende) – oppfylt. 400 mg.
  - Merknad: olanzapin: Nedtrappingen av olanzapin beregnes ikke: et fast skjema er ikke validert (kontrollrunden 30.10.2026). Den planlegges i, eller med råd fra, spesialisthelsetjenesten og tilpasses toleransen og symptomene; olanzapin seponeres ikke brått.
- *30 mg olanzapin er over doseområdet regelen gjelder for.* Inndata: startdose 30 mg; måldose 300 mg; bekreftet: indikasjon, peroral_formulering, spesialist_risiko.
  - **Stoppet:** Startdosen 30 mg er utenfor det regelen gjelder for (5–20 mg).
- *Uten bekreftelse av at olanzapin er peroral (ikke depot) stopper beregningen.* Inndata: startdose 20 mg; måldose 300 mg; bekreftet: indikasjon, spesialist_risiko.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker peroral olanzapin, ikke depotinjeksjon.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `SwitchAntipsychotics:Ol>Qu`.

## Fra peroral aripiprazol til Abilify Maintena, oppstart med én injeksjon

`depot-aripiprazol-maintena`, versjon 3, fingeravtrykk `04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20`. Oppstart av depot: aripiprazol → aripiprazol. **Entydig beregnbar**; status **klinisk godkjent**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 30.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → klinisk godkjent (versjon 3, 30.10.2026, ChatGPT (uavhengig fagkontrollør)).

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

- Regelen gjelder Abilify Maintena; andre aripiprazoldepoter (andre estere eller intervaller) har egne oppstartsregimer og er ikke omfattet, heller ikke Abilify Maintena 720 og 960 mg til injeksjon annenhver måned. Pasienter som trenger en annen dosering, planlegges individuelt.

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

`depot-paliperidon-xeplion`, versjon 3, fingeravtrykk `21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf`. Oppstart av depot: paliperidon → paliperidon. **Entydig beregnbar**; status **klinisk godkjent**.

**Godkjenningshistorikk:** utkast (versjon 1, 28.10.2026, Claude Code) → til faglig kontroll (versjon 1, 28.10.2026, Claude Code) → utkast (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 28.10.2026, Claude Code) → til faglig kontroll (versjon 2, 30.10.2026, Claude Code) → utkast (versjon 3, 30.10.2026, Claude Code) → til faglig kontroll (versjon 3, 30.10.2026, Claude Code) → klinisk godkjent (versjon 3, 30.10.2026, ChatGPT (uavhengig fagkontrollør)).

**Kildetro – det som følger direkte av kildene:**

- Xeplion startes med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
  - Andre oppstartsdose kan gis inntil 4 dager før eller etter dag 8; vedlikeholdsdosene inntil 7 dager før eller etter månedsdatoen. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (glemte doser))*
- Dosene er i mg paliperidon: 150 mg tilsvarer 234 mg paliperidonpalmitat, og 100 mg tilsvarer 156 mg.
  - Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2)*
- Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.
  - Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.1)*
- Ved bytte fra 9–12 mg peroralt kan injeksjon i setemuskelen gi lavere eksponering de første seks månedene; deltoideus kan vurderes da.
  - Ved bytte fra 9–12 mg peroralt til injeksjon i setemuskel kan eksponeringen bli lavere de første seks månedene; deltoideus kan vurderes da. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*
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
- Etter bytte fra 9 eller 12 mg står deltoideus framhevet i selve planen for vedlikeholdet, ikke bare i usikkerheten (kontrollørens beslutning P4-B 30.10.2026).
  - Ved bytte fra 9–12 mg peroralt til injeksjon i setemuskel kan eksponeringen bli lavere de første seks månedene; deltoideus kan vurderes da. *([ema-xeplion](https://www.ema.europa.eu/en/documents/product-information/xeplion-epar-product-information_en.pdf), section 4.2 (bytte fra peroral))*

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

- Valget av injeksjonssted for vedlikeholdet beregnes ikke; planen viser bare hva preparatomtalen sier om det.
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
