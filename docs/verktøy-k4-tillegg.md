# OUSFAR Verktøy – K4: regler for kombinasjon av stemningsstabiliserende

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-tillegg` versjon 1, regelmodell 12, beregningsmotor 10. Utkast til tilleggsregler for kombinering av stemningsstabiliserende legemidler (K4): lamotrigin lagt til valproat og lagt til litium, etter opptrappingstabellen for bipolar lidelse i Lamictal-preparatomtalen, med Lamictal tyggetabletter/dispergerbare tabletter. Det eksisterende legemidlet fortsetter uendret. Ingen av reglene er klinisk godkjent.

**2 regler, 0 klinisk godkjent.** Utfallet av kontrollen: 2 ikke ferdig kontrollert. Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. De er ikke empirisk validerte kliniske anbefalinger, og ingen av reglene er klinisk godkjent. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-klinisk-leveranseplan-2026-11.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `tillegg-valproat-lamotrigin` | tillegg til eksisterende legemiddel | valproat → lamotrigin | entydig beregnbar | 0 | til faglig kontroll | 9 |
| `tillegg-litium-lamotrigin` | tillegg til eksisterende legemiddel | litium → lamotrigin | entydig beregnbar | 0 | til faglig kontroll | 11 |

## Kilder

Hentet og lest 03.11.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf) | preparatomtale | Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale | Oppdatert 30.06.2025 | `85fd47d3d8ac3e13…` |
| [dmp-orfiril](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf) | preparatomtale | Orfiril (natriumvalproat) enterotabletter, preparatomtale | Oppdatert 03.09.2026 | `694efe92738bbffb…` |
| [dmp-lithionit](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05559.pdf) | preparatomtale | Lithionit (litiumsulfat) depottabletter, preparatomtale | Oppdatert 08.07.2026 | `f553e4364b09ac03…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Legge lamotrigin til valproat

`tillegg-valproat-lamotrigin`, versjon 1, fingeravtrykk `3123e0c2b65a53269ad35bff3001a595ff1f8451cbcb813d6230b3f7a8ca70b5`. Tillegg til eksisterende legemiddel: valproat → lamotrigin. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Lamotrigin lagt til valproat trappes opp etter preparatomtalens plan for denne kombinasjonen, til 100 mg/dag som vanlig stabiliserende måldose fra uke 6.
  - Sammen med valproat: 12,5 mg/dag (25 mg annenhver dag) uke 1–2, 25 mg/dag uke 3–4, 50 mg/dag uke 5 og 100 mg/dag fra uke 6 som vanlig måldose. Gjelder uavhengig av andre legemidler. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Startdosen og doseøkningen skal ikke overskrides, fordi risikoen for alvorlig hudutslett øker med høy startdose og rask opptrapping.
  - Startdosen og doseøkningen skal ikke overskrides, på grunn av risikoen for hudutslett. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse)*
  - Risikoen for utslett er særlig knyttet til høy startdose, raskere doseøkning enn anbefalt og samtidig bruk av valproat. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.4, Hudutslett)*
- Valproat hemmer glukuronideringen av lamotrigin og omtrent dobler halveringstiden, så lamotrigin trappes opp langsommere og til en lavere dose enn uten valproat.
  - Valproat hemmer glukuronideringen av lamotrigin og omtrent dobler halveringstiden; det øker konsentrasjonen av lamotrigin. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.5, tabell 6)*
  - Valproat hemmer omsetningen av lamotrigin, så lamotrigindosen bør reduseres; risikoen for hudreaksjoner ser ut til å øke ved kombinasjonen. *([dmp-orfiril](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf), pkt. 4.5, Lamotrigin)*
- Sammen med valproat gjelder opptrappingen uavhengig av andre legemidler, og høyst 200 mg/dag kan brukes etter klinisk respons.
  - Sammen med valproat: 12,5 mg/dag (25 mg annenhver dag) uke 1–2, 25 mg/dag uke 3–4, 50 mg/dag uke 5 og 100 mg/dag fra uke 6 som vanlig måldose. Gjelder uavhengig av andre legemidler. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
  - Sammen med valproat kan høyst 200 mg/dag brukes, avhengig av klinisk respons. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Samtidig bruk av valproat er en egen risikofaktor for utslett.
  - Risikoen for utslett er særlig knyttet til høy startdose, raskere doseøkning enn anbefalt og samtidig bruk av valproat. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.4, Hudutslett)*
  - Valproat hemmer omsetningen av lamotrigin, så lamotrigindosen bør reduseres; risikoen for hudreaksjoner ser ut til å øke ved kombinasjonen. *([dmp-orfiril](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf), pkt. 4.5, Lamotrigin)*
- Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser.
  - Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Planen gjelder bare Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), de markedsførte lamotriginformene i Norge; alle dosene er hele tabletter. Vanlige tabletter krever godkjenningsfritak og er utenfor regelen.
  - Tyggetablettene/de dispergerbare tablettene skal ikke gis som delmengder; en dose som ikke gir hele tabletter, rundes ned. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Dosering)*
- Valproat fortsetter uendret; planen endrer det ikke og beregner ingen dose av det. Opptrappingen gjelder bare så lenge pasienten fortsetter med det.
  - Sammen med valproat: 12,5 mg/dag (25 mg annenhver dag) uke 1–2, 25 mg/dag uke 3–4, 50 mg/dag uke 5 og 100 mg/dag fra uke 6 som vanlig måldose. Gjelder uavhengig av andre legemidler. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Planen stopper ved den vanlige stabiliserende måldosen. Videre justering etter klinisk respons beregnes ikke, men står som et vurderingspunkt.
  - Den stabiliserende måldosen avhenger av klinisk respons. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: dosevalg | maks_mg | 200 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3 |
| til: fase 1 (opptrapping) | trinn[0].mg | 25 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[0].dager | 14 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[0].hver | 2 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3 |
| til: fase 1 (opptrapping) | trinn[1].mg | 25 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[1].dager | 14 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[2].mg | 50 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[2].dager | 7 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 2 (vedlikehold) | dose.mg | 100 mg | veiledende | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3 |

**Betingelser:**

- Må bekreftes (`fortsetter_valproat`): Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`valproat_vurdert`): Valproatbehandlingen er vurdert som fortsatt riktig, også etter kravene for jenter og kvinner i fertil alder (det graviditetsforebyggende programmet). (dmp-orfiril pkt. 4.2, Jenter og kvinner i fertil alder)
- Må bekreftes (`aktuell_dose`): Døgndosen som er fylt inn for valproat, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare. (dmp-orfiril pkt. 4.2, Maniske episoder ved bipolar lidelse)
- Må bekreftes (`utslett_informert`): Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. (dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.2, Bipolar lidelse)
- Unntak (`under_18`): Pasienten er under 18 år. (dmp-lamictal pkt. 4.1 og 4.2, Barn og ungdom under 18 år)
- Unntak (`tidligere_reaksjon`): Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`bruker_lamotrigin`): Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. (dmp-lamictal pkt. 4.2, Gjenopptatt behandling; dmp-lamictal pkt. 5.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). (dmp-lamictal pkt. 4.2, Nedsatt leverfunksjon)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. (dmp-lamictal pkt. 4.2, Nedsatt nyrefunksjon)
- Unntak (`graviditet`): Pasienten er gravid, planlegger graviditet eller ammer. (dmp-lamictal pkt. 4.6)
- Unntak (`hla_b1502`): Pasienten er kjent positiv for HLA-B*1502. (dmp-lamictal pkt. 4.4, Hudutslett)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

**Usikkerhet:**

- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen viser bare den vanlige måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Lamotrigin lagt til valproat: hele opptrappingen til 100 mg/dag fra dag 36; valproat fortsetter uendret.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **fra:** 
  - **til:** dag 1–14: 25 mg annenhver dag; dag 15–28: 25 mg; dag 29–35: 50 mg; fra dag 36: 100 mg
  - Kontroll: Avkreftet: Pasienten er under 18 år. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er kjent positiv for HLA-B*1502. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Valproatbehandlingen er vurdert som fortsatt riktig, også etter kravene for jenter og kvinner i fertil alder (det graviditetsforebyggende programmet). – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. – oppfylt. Bekreftet av forskriveren.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er under 18 år.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 ja, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er under 18 år.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon ja, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin ja, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon ja, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon ja, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er gravid, planlegger graviditet eller ammer.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet ja, hla_b1502 nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er gravid, planlegger graviditet eller ammer.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er kjent positiv for HLA-B*1502.* Inndata: startdose 1000 mg; bekreftet: fortsetter_valproat, valproat_vurdert, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er kjent positiv for HLA-B*1502.
- *Uten bekreftelsene beregnes ingen plan.* Inndata: startdose 1000 mg; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen.; Må bekreftes før beregning: Valproatbehandlingen er vurdert som fortsatt riktig, også etter kravene for jenter og kvinner i fertil alder (det graviditetsforebyggende programmet).; Må bekreftes før beregning: Døgndosen som er fylt inn for valproat, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare.; Må bekreftes før beregning: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `CombiningMoodstabilizers:Va>La`.

## Legge lamotrigin til litium

`tillegg-litium-lamotrigin`, versjon 1, fingeravtrykk `7ea4ca3f7419d69c8516528cdc323ea786e7a5be2cdcd8a7b3a427f06de6bb20`. Tillegg til eksisterende legemiddel: litium → lamotrigin. **Entydig beregnbar**; status **til faglig kontroll**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code).

**Kildetro – det som følger direkte av kildene:**

- Lamotrigin lagt til litium trappes opp etter preparatomtalens plan for denne kombinasjonen, til 200 mg/dag som vanlig stabiliserende måldose fra uke 6.
  - Uten valproat og uten legemidler som induserer lamotrigin-glukuronidering: 25 mg/dag uke 1–2, 50 mg/dag uke 3–4, 100 mg/dag uke 5 og 200 mg/dag fra uke 6 som vanlig måldose. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Startdosen og doseøkningen skal ikke overskrides, fordi risikoen for alvorlig hudutslett øker med høy startdose og rask opptrapping.
  - Startdosen og doseøkningen skal ikke overskrides, på grunn av risikoen for hudutslett. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse)*
  - Risikoen for utslett er særlig knyttet til høy startdose, raskere doseøkning enn anbefalt og samtidig bruk av valproat. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.4, Hudutslett)*
- Litium har liten eller ingen effekt på konsentrasjonen av lamotrigin, og lamotrigin endret ikke litiums farmakokinetikk; opptrappingen er den samme som uten valproat og uten induserende legemidler.
  - Litium har liten eller ingen effekt på konsentrasjonen av lamotrigin, og lamotrigin 100 mg/dag endret ikke litiums farmakokinetikk hos friske frivillige. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.5, tabell 6)*
  - Uten valproat og uten legemidler som induserer lamotrigin-glukuronidering: 25 mg/dag uke 1–2, 50 mg/dag uke 3–4, 100 mg/dag uke 5 og 200 mg/dag fra uke 6 som vanlig måldose. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser.
  - Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*

**OUSFARs selvstendige tilpasninger (må kontrolleres):**

- Planen gjelder bare Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), de markedsførte lamotriginformene i Norge; alle dosene er hele tabletter. Vanlige tabletter krever godkjenningsfritak og er utenfor regelen.
  - Tyggetablettene/de dispergerbare tablettene skal ikke gis som delmengder; en dose som ikke gir hele tabletter, rundes ned. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Dosering)*
- Litium fortsetter uendret; planen endrer det ikke og beregner ingen dose av det. Opptrappingen gjelder bare så lenge pasienten fortsetter med det.
  - Uten valproat og uten legemidler som induserer lamotrigin-glukuronidering: 25 mg/dag uke 1–2, 50 mg/dag uke 3–4, 100 mg/dag uke 5 og 200 mg/dag fra uke 6 som vanlig måldose. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
- Planen stopper ved den vanlige stabiliserende måldosen. Videre justering etter klinisk respons beregnes ikke, men står som et vurderingspunkt.
  - Den stabiliserende måldosen avhenger av klinisk respons. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*

**Den matematiske regelen – parametre:**

| Hvor | Parameter | Verdi | Art | Grunnlag |
| --- | --- | --- | --- | --- |
| til: fase 1 (opptrapping) | trinn[0].mg | 25 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[0].dager | 14 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[1].mg | 50 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[1].dager | 14 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[2].mg | 100 mg | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 1 (opptrapping) | trinn[2].dager | 7 dager | bindende krav | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse |
| til: fase 2 (vedlikehold) | dose.mg | 200 mg | veiledende | dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3 |

**Betingelser:**

- Må bekreftes (`fortsetter_litium`): Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig. (dmp-lithionit pkt. 4.2; dmp-lamictal pkt. 4.5, tabell 6)
- Må bekreftes (`aktuell_dose`): Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare. (dmp-lithionit pkt. 4.2)
- Må bekreftes (`utslett_informert`): Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. (dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.2, Bipolar lidelse)
- Unntak (`under_18`): Pasienten er under 18 år. (dmp-lamictal pkt. 4.1 og 4.2, Barn og ungdom under 18 år)
- Unntak (`tidligere_reaksjon`): Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`bruker_lamotrigin`): Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. (dmp-lamictal pkt. 4.2, Gjenopptatt behandling; dmp-lamictal pkt. 5.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). (dmp-lamictal pkt. 4.2, Nedsatt leverfunksjon)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. (dmp-lamictal pkt. 4.2, Nedsatt nyrefunksjon)
- Unntak (`graviditet`): Pasienten er gravid, planlegger graviditet eller ammer. (dmp-lamictal pkt. 4.6)
- Unntak (`hla_b1502`): Pasienten er kjent positiv for HLA-B*1502. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`valproat_eller_induserende`): Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Unntak (`ukjent_interaksjon`): Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.) (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Litiumbehandlingen følges opp som før med serumlitium og nyre-, hjerte- og stoffskiftefunksjon; planen endrer ikke litiumdosen.

**Usikkerhet:**

- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen viser bare den vanlige måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Lamotrigin lagt til litium: hele opptrappingen til 200 mg/dag fra dag 36; litium fortsetter uendret.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **fra:** 
  - **til:** dag 1–14: 25 mg; dag 15–28: 50 mg; dag 29–35: 100 mg; fra dag 36: 200 mg
  - Kontroll: Avkreftet: Pasienten er under 18 år. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er kjent positiv for HLA-B*1502. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.) – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. – oppfylt. Bekreftet av forskriveren.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er under 18 år.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 ja, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er under 18 år.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon ja, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin ja, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon ja, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon ja, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er gravid, planlegger graviditet eller ammer.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet ja, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er gravid, planlegger graviditet eller ammer.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er kjent positiv for HLA-B*1502.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 ja, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er kjent positiv for HLA-B*1502.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping.* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende ja, ukjent_interaksjon nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.)* Inndata: startdose 168 mg; bekreftet: fortsetter_litium, aktuell_dose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon ja.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se vurderingspunktene.)
- *Uten bekreftelsene beregnes ingen plan.* Inndata: startdose 168 mg; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig.; Må bekreftes før beregning: Døgndosen som er fylt inn for litium, er den pasienten bruker nå. Verktøyet kontrollerer ikke denne dosen; planen gjentar den bare.; Må bekreftes før beregning: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `CombiningMoodstabilizers:Li>La`.
