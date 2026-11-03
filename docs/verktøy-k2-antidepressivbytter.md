# OUSFAR Verktøy – K2: komplette bytter mellom antidepressiva

**Status 03.11.2026:** fem regler til uavhengig faglig kontroll, ingen klinisk godkjent. Styrende plan: `docs/verktøy-klinisk-leveranseplan-2026-11.md` (K2, kasus K0-04–K0-06 i §10.2). Reglene står i `src/verktoy/regler/antidepressivbytter.ts` og er med i verktøyet gjennom den felles registreringen (`domenesett.ts`, regelmodell 12). Regelrapporten (`docs/verktøy-k2-antidepressivbytter-regler.md`) lages med `npm run verktoy:regler -- rapport`, og kontrollgrunnlaget med alle planene og stoppene (`docs/verktøy-k2-kontrollgrunnlag.md`) med `npx vite-node scripts/verktoy-antidepressivbytter.ts -- rapport`.

## 1. Hva som er nytt for klinikeren

Før K2 kunne verktøyet «Bytte antidepressiv» bare gi startforløpet fra sertralin til mirtazapin (versjon 10): sertralin ned til 25 mg og mirtazapin 15 mg, uten seponering av sertralin og uten måldose for mirtazapin. Alle andre bytter ga ingen plan.

Når reglene er godkjent, kan klinikeren få en sammenhengende plan **fra dagens dose til sluttmålet**: det gamle legemidlet er trappet ned og seponert, og det nye står på en vedlikeholdsdose klinikeren har valgt, med konkrete tabletter fra FEST og datoer.

| Bytte | Strategi | Startdoser | Vedlikeholdsdose (velges) | Varighet til sluttmål |
| --- | --- | --- | --- | --- |
| Sertralin → mirtazapin (K0-04) | Kryssnedtrapping | 50, 100, 200 mg | 15 eller 30 mg | 2, 4 eller 6 uker |
| Escitalopram → mirtazapin (K0-05) | Kryssnedtrapping | 10, 20 mg | 15 eller 30 mg | 2 eller 4 uker |
| Citalopram → mirtazapin | Kryssnedtrapping | 20, 40 mg | 15 eller 30 mg | 2 eller 4 uker |
| Escitalopram → sertralin (K0-06) | Moderat bytte | 10, 20 mg | 50 eller 100 mg | 17 eller 31 dager til oppstart, 100 mg etter ytterligere 14 dager |
| Citalopram → sertralin | Moderat bytte | 20, 40 mg | 50 eller 100 mg | Som over |

Det godkjente startforløpet (versjon 10) er uendret. Det er en delplan, sertralin til 25 mg og mirtazapin 15 mg uten seponering og uten måldose, og kan ikke nå et komplett sluttmål uten en ny versjon og en ny godkjenning; den komplette erstatningen er `bytte-sertralin-mirtazapin`. Når appen ikke viser delplaner, gir sertralin → mirtazapin derfor «Komplett plan ikke tilgjengelig» til den komplette regelen er godkjent. De andre fire kombinasjonene viser «faglig kontroll gjenstår» til da, i stedet for at verktøyet ikke har noen regel.

## 2. Forløpene

**SSRI → mirtazapin.** SSRI-et halveres hver 14. dag ned til laveste dose i preparatomtalen (sertralin 25 mg, escitalopram 5 mg, citalopram 10 mg), som gis i 14 dager før seponering. Mirtazapin 15 mg tas fra dag 1 og holdes til siste SSRI-dose; dagen etter går mirtazapin til valgt vedlikeholdsdose 15 eller 30 mg. Eksempel sertralin 100 mg → mirtazapin 30 mg: sertralin 50 mg dag 1–14, 25 mg dag 15–28, seponert fra dag 29; mirtazapin 15 mg dag 1–28, 30 mg fra dag 29.

**(Es)citalopram → sertralin.** Nedtrapping som over til seponering, så tre hele dager uten SSRI, så sertralin 50 mg; er 100 mg valgt, økes dosen etter 14 dager. Eksempel escitalopram 20 mg → sertralin 100 mg: escitalopram 10 mg dag 1–14, 5 mg dag 15–28, seponert fra dag 29; ingen SSRI dag 29–31; sertralin 50 mg dag 32–45 og 100 mg fra dag 46.

Alle planer bruker bare hele tabletter (FEST-form 53): sertralin 25/50/100 mg, escitalopram 5/10/20 mg, citalopram 10/20/40 mg og mirtazapin 15/30/45 mg, markedsført og uten godkjenningsfritak i uttrekket 03.11.2026 (`src/data/verktoy/fest-antidepressivbytter.json`). Det kliniske omfanget for det nye legemidlet gjelder bare styrkene planene bruker (mirtazapin 15/30 mg, sertralin 50/100 mg); forsvinner mirtazapin 45 mg fra FEST, eller sertralin 25 mg der sertralin er det nye legemidlet, stopper ikke de planene.

**Bare komplette planer.** Hvert forløp i reglene krever en komplett plan (regelmodell 12): når nedtrappingen ikke når seponering, eller det nye legemidlet ikke når vedlikeholdsdosen, viser verktøyet «Komplett plan ikke tilgjengelig» og grunnen, aldri en delplan med doser.

**Vurderingspunkter.** Planen viser dem på riktig dag og samlet under «Vurderingspunkter»: seponeringssymptomer og forverring av depresjonen før hver reduksjon og før seponeringen av SSRI-et (NICE, RCPsych: hold dosen, eller gå tilbake til forrige dose ved plagsomme symptomer), toleransen før økningen av det nye legemidlet, og respons og bivirkninger fire uker etter oppstarten og etter hver doseendring av det, slutten av preparatomtalenes 2–4 uker. Eksempel sertralin 100 mg → mirtazapin 30 mg: dag 15 og 29 for sertralin, dag 29 før økningen og dag 29 og 57 for responsen på mirtazapin. Forskriveren bekrefter i tillegg at pasienten følges ved disse punktene, og at sedasjon og serotonerg belastning følges under overlappen eller seponeringssymptomer i dagene uten SSRI.

## 3. Hva som fortsatt ikke er støttet

Reglene stopper med forklaring, aldri med en improvisert dose, ved: lang behandlingstid (mange måneder eller mer), tidligere seponeringsplager, alder over 65 år, nedsatt leverfunksjon, kreatininclearance under 40 ml/min (mirtazapin), andre indikasjoner enn depresjon, andre startdoser (for eksempel sertralin 75 eller 150 mg, escitalopram 15 mg, citalopram 30 mg), andre vedlikeholdsdoser (mirtazapin 45 mg, sertralin 150–200 mg er senere, responsstyrte økninger), andre former (smeltetabletter, dråper, mikstur), ukjente forhold, manglende bekreftelser, en styrke som er borte fra FEST og FEST eldre enn 48 timer. Bytter fra fluoksetin, til og fra MAO-hemmere, SNRI-er, vortioksetin og bupropion er ikke vurdert i K2.

## 4. Kildegrunnlag

- Preparatomtalene fra DMP for Zoloft, Cipralex, Cipramil og Remeron (pkt. 4.2 og 5.2), kontrollert 03.11.2026 med uendret kontrollsum mot `kilder.ts`.
- Keks N, Hope J, Keogh S. *Switching and stopping antidepressants.* Aust Prescr 2016 (`keks-2016`): tabell 2 (kryssnedtrapping og moderat bytte), tabell 3 (fra SSRI til mirtazapin og til annet SSRI) og notene om nedtrapping og utvasking.
- NICE NG222 (1.4.15, 1.4.16, 1.9.9) og RCPsych *Stopping antidepressants* (tempo, lang behandlingstid, tidligere plager).
- Psychiatrienet står bare som referanse til kildeoppføringen (`SwitchAntidepressants:Se>Mz` osv.); ingen tekst eller tabell er brukt eller gjengitt.

## 5. OUSFARs valg til faglig kontroll

Spørsmålene K2-1–K2-7 med OUSFARs anbefaling står i `docs/verktøy-k2-kontrollgrunnlag.md`. De viktigste: 14 dager per trinn ved bytte (to uker fra laveste startdose, mens RCPsych og Keks beskriver om lag fire uker), seponering fra laveste dose som del av planen, økning av mirtazapin dagen etter siste SSRI-dose, moderat bytte med tre dagers opphold for (es)citalopram → sertralin i stedet for direkte bytte eller kryssnedtrapping, og om vurderingspunktene er riktige og nok.

En godkjenning kan bare gjelde en ny versjon der kontrolløren har avklart hvert åpne valg; den får et nytt fingeravtrykk, og kontrollgrunnlaget regnes da på nytt. Godkjennes den komplette regelen for sertralin → mirtazapin, må startforløpet (versjon 10) trekkes i samme endring; ellers tilbyr verktøyet begge planene, og forskriveren må velge mellom dem (testen «ved aktivering» viser begge tilfellene).
