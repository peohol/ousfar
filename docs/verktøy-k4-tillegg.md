# OUSFAR Verktøy – K4: regler for kombinasjon av stemningsstabiliserende

<!-- Laget av `npm run verktoy:regler -- rapport` fra reglene i src/verktoy/regler/. Ikke rediger for hånd; endre reglene og lag rapporten på nytt. -->

Regelsett `ousfar-verktoy-tillegg` versjon 1, regelmodell 12, beregningsmotor 10. Utkast til tilleggsregler for kombinering av stemningsstabiliserende legemidler (K4): lamotrigin lagt til valproat og lagt til litium, etter opptrappingstabellen for bipolar lidelse i Lamictal-preparatomtalen, med Lamictal tyggetabletter/dispergerbare tabletter. Det eksisterende legemidlet fortsetter uendret. Begge reglene er klinisk godkjent av en uavhengig kontrollør for nøyaktig sin versjon og sitt fingeravtrykk (TILLEGGSVEDTAK), og vises bare for administratorer.

**2 regler, 2 klinisk godkjent.** Utfallet av kontrollen: 2 kontrollert og godkjent i oppgitt omfang. Alle beregninger under er *modellberegninger*: den faglige dosekurven regelen gir, regnet ut deterministisk. Alle reglene er klinisk godkjent etter uavhengig faglig kontroll i nøyaktig denne versjonen; beregningene er likevel ikke empirisk validerte og erstatter ikke klinisk vurdering av den enkelte pasient. En klinisk godkjenning gjelder bare regelversjonen og fingeravtrykket den ble gitt for. Dosene er ideelle (to desimaler); hvilke doser som kan gis med norske preparater, avgjøres i P5. Modellen og valgene er beskrevet i `docs/verktøy-klinisk-leveranseplan-2026-11.md`.

Psychiatrienet er bare en referanse reglene kan sammenlignes med; ingen regel bygger på teksten der, og den vises ikke (`docs/verktøy-p3-rettigheter.md`).

## Oversikt

| Regel | Form | Fra → til | Beregnbarhet | Åpne valg | Status | Eksempler |
| --- | --- | --- | --- | --- | --- | --- |
| `tillegg-valproat-lamotrigin` | tillegg til eksisterende legemiddel | valproat → lamotrigin | entydig beregnbar | 0 | klinisk godkjent | 9 |
| `tillegg-litium-lamotrigin` | tillegg til eksisterende legemiddel | litium → lamotrigin | entydig beregnbar | 0 | klinisk godkjent | 11 |

## Kilder

Hentet og lest 03.11.2026. Kontrollsummen (SHA-256) er av dokumentet slik det ble hentet.

| Id | Type | Kilde | Versjon | SHA-256 |
| --- | --- | --- | --- | --- |
| [dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf) | preparatomtale | Lamictal (lamotrigin) tyggetabletter/dispergerbare tabletter 2–200 mg, preparatomtale | Oppdatert 30.06.2025 | `85fd47d3d8ac3e13…` |
| [dmp-orfiril](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-06565.pdf) | preparatomtale | Orfiril (natriumvalproat) enterotabletter, preparatomtale | Oppdatert 03.09.2026 | `694efe92738bbffb…` |
| [dmp-lithionit](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-05559.pdf) | preparatomtale | Lithionit (litiumsulfat) depottabletter, preparatomtale | Oppdatert 08.07.2026 | `f553e4364b09ac03…` |
| [psychiatrienet](https://www.psychiatrienet.nl/switchtabel) | kildeoppføring | Psychiatrienet, switchtabellene (kildearkivet fra P3) | Uttrekk og revisjon per kildeoppføring i src/data/verktoy/psychiatrienet-kildearkiv.json | – |

## Legge lamotrigin til valproat

`tillegg-valproat-lamotrigin`, versjon 2, fingeravtrykk `0a9213f31b5f428935fceeef41498a2999682631b1692749bb7ebe19c82639b8`. Tillegg til eksisterende legemiddel: valproat → lamotrigin. **Entydig beregnbar**; status **klinisk godkjent**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code) → klinisk godkjent (versjon 2, 04.11.2026, ChatGPT (uavhengig kontrollør)).

**Kildetro – det som følger direkte av kildene:**

- Lamotrigin lagt til valproat trappes opp etter preparatomtalens plan for denne kombinasjonen, til 100 mg/dag som vanlig første stabiliserende måldose fra uke 6.
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
- Forskriveren må velge måldosen, og regelen gjelder bare preparatomtalens vanlige første stabiliserende måldose (100 mg/dag). Planen er komplett til den; et annet mål og videre justering etter klinisk respons beregnes ikke, men står som et vurderingspunkt.
  - Sammen med valproat: 12,5 mg/dag (25 mg annenhver dag) uke 1–2, 25 mg/dag uke 3–4, 50 mg/dag uke 5 og 100 mg/dag fra uke 6 som vanlig måldose. Gjelder uavhengig av andre legemidler. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
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

**Betingelser:**

- Måldose (må oppgis) 100 mg (bindende; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`fortsetter_valproat`): Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`ppp_indikasjon`) ved kan bli gravid; vilkårene i det graviditetsforebyggende programmet for valproat må bekreftes hver for seg: Annen behandling har ikke effekt eller tolereres ikke, og spesialist i bipolar lidelse har ved siste årlige gjennomgang vurdert valproat som den mest egnede behandlingen. (dmp-orfiril pkt. 4.2, Jenter og kvinner i fertil alder; dmp-orfiril pkt. 4.4, Årlige behandlingsevalueringer av spesialist)
- Må bekreftes (`ppp_informasjon`) ved kan bli gravid; vilkårene i det graviditetsforebyggende programmet for valproat må bekreftes hver for seg: Pasienten har fått pasientinformasjonsheftet, har forstått og anerkjent risikoen for misdannelser og nevrologiske utviklingsforstyrrelser hos barnet, og risikoskjemaet er gjennomgått ved siste årlige gjennomgang. (dmp-orfiril pkt. 4.4, Vilkår i det graviditetsforebyggende programmet; dmp-orfiril pkt. 4.4, Årlige behandlingsevalueringer av spesialist)
- Må bekreftes (`ppp_prevensjon`) ved kan bli gravid; vilkårene i det graviditetsforebyggende programmet for valproat må bekreftes hver for seg: Pasienten bruker sikker prevensjon uten avbrudd: minst én sikker, helst brukeruavhengig metode (som spiral eller implantat), eller to komplementære metoder med en barrieremetode. (dmp-orfiril pkt. 4.4, Prevensjon)
- Må bekreftes (`ppp_graviditet`) ved kan bli gravid; vilkårene i det graviditetsforebyggende programmet for valproat må bekreftes hver for seg: Graviditet er utelukket med graviditetstest når det er behov for det, og pasienten vet at hun straks skal kontakte lege ved planlagt eller mistenkt graviditet. (dmp-orfiril pkt. 4.4, Graviditetstest; dmp-orfiril pkt. 4.4, Vilkår i det graviditetsforebyggende programmet)
- Må bekreftes (`far_informasjon`) ved kan bli far; informasjonen og vurderingen ved valproatbehandling av menn må bekreftes hver for seg: Pasienten er informert om den mulige risikoen for nevroutviklingsforstyrrelser hos barn som unnfanges mens han bruker valproat eller de 3 første månedene etter at han har sluttet (sammenhengen er usikker), om behovet for effektiv prevensjon, også for en kvinnelig partner, i hele denne perioden, og om at han ikke skal donere sæd i samme periode. (dmp-orfiril pkt. 4.4 og 4.6, Bruk hos mannlige pasienter; dmp-orfiril pkt. 4.4, Bruk hos mannlige pasienter)
- Må bekreftes (`far_vurdering`) ved kan bli far; informasjonen og vurderingen ved valproatbehandling av menn må bekreftes hver for seg: Behandlende lege har vurdert at valproat fortsatt er den mest passende behandlingen, og planlegger pasienten å bli far, er andre behandlingsalternativer vurdert og diskutert med ham. (dmp-orfiril pkt. 4.4, Bruk hos mannlige pasienter)
- Må bekreftes (`aktuell_dose`): Pasienten bruker et natriumvalproatpreparat, og døgndosen som er fylt inn, er den pasienten bruker nå, i mg natriumvalproat slik den står i legemiddellisten. Preparat, styrke og fordeling over døgnet fortsetter uendret som i legemiddellisten; preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare. (dmp-orfiril pkt. 2; dmp-orfiril pkt. 4.2, Maniske episoder ved bipolar lidelse)
- Må bekreftes (`maldose_valgt`): Den første stabiliserende måldosen (100 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`ostrogen_maldose`) ved østrogenholdig prevensjon eller behandling, som kan kreve en høyere vedlikeholdsdose av lamotrigin enn måldosen; måldosen krever en særskilt vurdering: Måldosen er vurdert særskilt fordi østrogenholdig behandling kan kreve en vedlikeholdsdose opptil det dobbelte: opptrappingen går likevel bare til 100 mg/dag, og en senere økning planlegges individuelt etter respons og eventuelt serumkonsentrasjon av lamotrigin. (dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva; dmp-orfiril pkt. 4.4, Østrogenholdige produkter)
- Må bekreftes (`utslett_informert`): Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. (dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.2, Bipolar lidelse)
- Unntak (`under_18`): Pasienten er under 18 år. (dmp-lamictal pkt. 4.1 og 4.2, Barn og ungdom under 18 år)
- Unntak (`tidligere_reaksjon`): Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`bruker_lamotrigin`): Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. (dmp-lamictal pkt. 4.2, Gjenopptatt behandling; dmp-lamictal pkt. 5.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). (dmp-lamictal pkt. 4.2, Nedsatt leverfunksjon)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. (dmp-lamictal pkt. 4.2, Nedsatt nyrefunksjon)
- Unntak (`graviditet`): Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres. (dmp-lamictal pkt. 4.6; dmp-orfiril pkt. 4.3 og 4.4, Graviditetsplanlegging og Ved graviditet)
- Unntak (`hla_b1502`): Pasienten er kjent positiv for HLA-B*1502. (dmp-lamictal pkt. 4.4, Hudutslett)
- Må besvares (`kan_bli_gravid`): Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. (dmp-orfiril pkt. 4.4, Vilkår i det graviditetsforebyggende programmet; dmp-orfiril pkt. 4.2, Jenter og kvinner i fertil alder)
- Må besvares (`kan_bli_far`): Er pasienten gutt eller mann som kan gjøre en partner gravid? (dmp-orfiril pkt. 4.4 og 4.6, Bruk hos mannlige pasienter)
- Må besvares (`ostrogen`): Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Et ja krever en skriftlig begrunnelse. (dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva; dmp-orfiril pkt. 4.4, Østrogenholdige produkter)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.

**Usikkerhet:**

- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Lamotrigin lagt til valproat: hele opptrappingen til 100 mg/dag fra dag 36; valproat fortsetter uendret.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **fra:** 
  - **til:** dag 1–14: 25 mg annenhver dag; dag 15–28: 25 mg; dag 29–35: 50 mg; fra dag 36: 100 mg
  - Kontroll: Avkreftet: Pasienten er under 18 år. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Avkreftet: Pasienten er kjent positiv for HLA-B*1502. – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker et natriumvalproatpreparat, og døgndosen som er fylt inn, er den pasienten bruker nå, i mg natriumvalproat slik den står i legemiddellisten. Preparat, styrke og fordeling over døgnet fortsetter uendret som i legemiddellisten; preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Den første stabiliserende måldosen (100 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet. Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Er pasienten gutt eller mann som kan gjøre en partner gravid? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Måldosen er 100 mg (bindende) – oppfylt. 100 mg.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er under 18 år.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 ja, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er under 18 år.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon ja, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin ja, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon ja, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon ja, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet ja, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er kjent positiv for HLA-B*1502.* Inndata: startdose 1000 mg; måldose 100 mg; bekreftet: fortsetter_valproat, ppp_indikasjon, ppp_informasjon, ppp_prevensjon, ppp_graviditet, far_informasjon, far_vurdering, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 ja; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er kjent positiv for HLA-B*1502.
- *Uten bekreftelsene beregnes ingen plan.* Inndata: startdose 1000 mg; måldose 100 mg; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei; svar: kan_bli_gravid nei, kan_bli_far nei, ostrogen nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen.; Må bekreftes før beregning: Pasienten bruker et natriumvalproatpreparat, og døgndosen som er fylt inn, er den pasienten bruker nå, i mg natriumvalproat slik den står i legemiddellisten. Preparat, styrke og fordeling over døgnet fortsetter uendret som i legemiddellisten; preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare.; Må bekreftes før beregning: Den første stabiliserende måldosen (100 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen.; Må bekreftes før beregning: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `CombiningMoodstabilizers:Va>La`.

## Legge lamotrigin til litium

`tillegg-litium-lamotrigin`, versjon 2, fingeravtrykk `786436a0ea8d115b7927a9a20ffabc736b59bc06c59117769551e5f75e89e44b`. Tillegg til eksisterende legemiddel: litium → lamotrigin. **Entydig beregnbar**; status **klinisk godkjent**.

**Godkjenningshistorikk:** utkast (versjon 1, 03.11.2026, Claude Code) → til faglig kontroll (versjon 1, 03.11.2026, Claude Code) → utkast (versjon 2, 03.11.2026, Claude Code) → til faglig kontroll (versjon 2, 03.11.2026, Claude Code) → klinisk godkjent (versjon 2, 04.11.2026, ChatGPT (uavhengig kontrollør)).

**Kildetro – det som følger direkte av kildene:**

- Lamotrigin lagt til litium trappes opp etter preparatomtalens plan for denne kombinasjonen, til 200 mg/dag som vanlig første stabiliserende måldose fra uke 6.
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
- Forskriveren må velge måldosen, og regelen gjelder bare preparatomtalens vanlige første stabiliserende måldose (200 mg/dag). Planen er komplett til den; et annet mål og videre justering etter klinisk respons beregnes ikke, men står som et vurderingspunkt.
  - Uten valproat og uten legemidler som induserer lamotrigin-glukuronidering: 25 mg/dag uke 1–2, 50 mg/dag uke 3–4, 100 mg/dag uke 5 og 200 mg/dag fra uke 6 som vanlig måldose. *([dmp-lamictal](https://produktinformasjon.legemiddelsok.no/preparatomtaler/0000-08198.pdf), pkt. 4.2, Bipolar lidelse, tabell 3)*
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

**Betingelser:**

- Startdose 42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg (bindende; dmp-lithionit pkt. 1, 2 og 4.2; dmp-lithionit pkt. 4.2)
- Måldose (må oppgis) 200 mg (bindende; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`fortsetter_litium`): Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig. (dmp-lithionit pkt. 4.2; dmp-lamictal pkt. 4.5, tabell 6)
- Må bekreftes (`aktuell_dose`): Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen. (dmp-lithionit pkt. 1, 2 og 4.2)
- Må bekreftes (`maldose_valgt`): Den første stabiliserende måldosen (200 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Må bekreftes (`ostrogen_maldose`) ved østrogenholdig prevensjon eller behandling, som kan kreve en høyere vedlikeholdsdose av lamotrigin enn måldosen; måldosen krever en særskilt vurdering: Måldosen er vurdert særskilt fordi østrogenholdig behandling kan kreve en vedlikeholdsdose opptil det dobbelte: opptrappingen går likevel bare til 200 mg/dag, og en senere økning planlegges individuelt etter respons og eventuelt serumkonsentrasjon av lamotrigin. (dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva)
- Må bekreftes (`utslett_informert`): Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. (dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.4, Hudutslett; dmp-lamictal pkt. 4.2, Bipolar lidelse)
- Unntak (`under_18`): Pasienten er under 18 år. (dmp-lamictal pkt. 4.1 og 4.2, Barn og ungdom under 18 år)
- Unntak (`tidligere_reaksjon`): Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`bruker_lamotrigin`): Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart. (dmp-lamictal pkt. 4.2, Gjenopptatt behandling; dmp-lamictal pkt. 5.2)
- Unntak (`nedsatt_leverfunksjon`): Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C). (dmp-lamictal pkt. 4.2, Nedsatt leverfunksjon)
- Unntak (`nedsatt_nyrefunksjon`): Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase. (dmp-lamictal pkt. 4.2, Nedsatt nyrefunksjon)
- Unntak (`graviditet`): Pasienten er gravid, planlegger graviditet eller ammer. (dmp-lamictal pkt. 4.6)
- Unntak (`hla_b1502`): Pasienten er kjent positiv for HLA-B*1502. (dmp-lamictal pkt. 4.4, Hudutslett)
- Unntak (`valproat_eller_induserende`): Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping. (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3)
- Unntak (`ukjent_interaksjon`): Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.) (dmp-lamictal pkt. 4.2, Bipolar lidelse, tabell 3; dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva)
- Må besvares (`ostrogen`): Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Et ja krever en skriftlig begrunnelse. (dmp-lamictal pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva)

**Kliniske forutsetninger:**

- Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.
- Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.
- Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.
- Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.
- Litiumbehandlingen følges opp som før med serumlitium og nyre-, hjerte- og stoffskiftefunksjon; planen endrer ikke litiumdosen.

**Usikkerhet:**

- Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.
- Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.

**Regneeksempler** (regnet ut for hånd, kontrollert mot beregningen; modellberegninger, ikke kliniske anbefalinger):

- *Lamotrigin lagt til litium: hele opptrappingen til 200 mg/dag fra dag 36; litium fortsetter uendret.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
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
  - Kontroll: Avkreftet: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.) – oppfylt. Vurdert og avkreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Den første stabiliserende måldosen (200 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bekreftet: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter. – oppfylt. Bekreftet av forskriveren.
  - Kontroll: Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon? Nei – oppfylt. Oppgitt av forskriveren.
  - Kontroll: Startdosen er 42, 84, 126, 168, 210, 252, 294, 336, 378, 420 mg (bindende) – oppfylt. 168 mg.
  - Kontroll: Måldosen er 200 mg (bindende) – oppfylt. 200 mg.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er under 18 år.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 ja, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er under 18 år.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon ja, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin ja, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon ja, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).
- *Regelen gjelder ikke når forholdet gjelder: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon ja, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er gravid, planlegger graviditet eller ammer.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet ja, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er gravid, planlegger graviditet eller ammer.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten er kjent positiv for HLA-B*1502.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 ja, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten er kjent positiv for HLA-B*1502.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping.* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende ja, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping.
- *Regelen gjelder ikke når forholdet gjelder: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.)* Inndata: startdose 168 mg; måldose 200 mg; bekreftet: fortsetter_litium, aktuell_dose, maldose_valgt, ostrogen_maldose, utslett_informert; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon ja; svar: ostrogen nei.
  - **Stoppet:** Regelen gjelder ikke: Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.)
- *Uten bekreftelsene beregnes ingen plan.* Inndata: startdose 168 mg; måldose 200 mg; pasientforhold: under_18 nei, tidligere_reaksjon nei, bruker_lamotrigin nei, nedsatt_leverfunksjon nei, nedsatt_nyrefunksjon nei, graviditet nei, hla_b1502 nei, valproat_eller_induserende nei, ukjent_interaksjon nei; svar: ostrogen nei.
  - **Stoppet:** Må bekreftes før beregning: Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig.; Må bekreftes før beregning: Pasienten bruker Lithionit 42 mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × 42 mg (6 mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen.; Må bekreftes før beregning: Den første stabiliserende måldosen (200 mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen.; Må bekreftes før beregning: Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter.

**Referanse til sammenligning** (ikke grunnlag, innholdet vises ikke): Psychiatrienet, kildeoppføring `CombiningMoodstabilizers:Li>La`.
