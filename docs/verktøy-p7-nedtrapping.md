# OUSFAR Verktøy – P7: Trappe ned antidepressiv

Notat til P7.1–P7.4 i `docs/verktøy-utviklingsplan.md`, skrevet 28.10.2026 til uavhengig faglig kontroll (P7.5). **Ingen regel er klinisk godkjent, og verktøyet viser ingen doseplan.** P4.8 står åpen.

Det som er generert fra koden og ikke kan avvike fra den, står i to rapporter:

- `docs/verktøy-p7-dekning.md` – kilde- og dekningsmatrisen: én rad per antidepressivum med Stop-oppføringen fra P3, norske preparater, laveste styrke, status, regel, kildegrunnlag og forklaring.
- `docs/verktøy-p7-regelutkast.md` – hver regel med kildetro utsagn, OUSFARs tilpasninger, parametre med grunnlag, forutsetninger, usikkerhet, regneeksempler og kildene med versjon og kontrollsum.

Begge lages med `npm run verktoy:regler -- rapport`, og testene sier fra når de ikke er oppdatert.

## 1. Hva som er levert

| Del | Hvor | Innhold |
| --- | --- | --- |
| P7.1 Status per virkestoff | `src/verktoy/dekning.ts` | Alle 23 antidepressiva i kildetabellen, uten johannesurt: 15 med beregnbar regel under faglig kontroll, 1 bare fagtekst, 1 mangler anbefaling og 6 med annen begrunnet begrensning. |
| P7.2 Regelutkast | `src/verktoy/regler/nedtrapping.ts` | 14 nedtrappingsregler og én tekstregel (agomelatin) i regelsettet `ousfar-verktoy-nedtrapping`. Escitalopram dekkes av pilotregelen fra P4. |
| P7.3 Verktøyet | `src/verktoy/tilgjengelighet.ts`, `src/verktoy/doseplan.ts` | Appen bruker pilotsettet og P7-reglene sammen. Et stoff uten regel får forklaringen fra dekningen i stedet for en generell tekst. En plan oppgir regelsettet regelen hører til. |
| P7.4 Tester | `src/__tests__/verktoynedtrapping.test.ts` | Dekningen mot regelsettet, P3 og FEST; reglene ved grenseverdier; doseplaner med syntetiske preparater; klinisk sperre med fersk og foreldet FEST; at fortolkningen ikke bruker reglene. |

Reglene gjenbruker regelmodellen og beregningen fra P4 og doseplanmotoren fra P5 uten endringer. Felles byggesteiner for pilotsettet og P7 står i `src/verktoy/regler/bygg.ts`.

## 2. Kildegrunnlag

- **Preparatomtalene** er grunnlaget for doseområde, krav til varighet og det som er spesielt for stoffet. Norske preparatomtaler er hentet fra lenken FEST oppgir, og sentrale EU-preparatomtaler fra EMA. Duloksetin bruker Cymbalta, som generikaene i Norge viser til. Vortioksetin og agomelatin bruker Brintellix og Valdoxan, som er sentralt godkjent. 11 nye preparatomtaler står i kilderegisteret (`src/verktoy/regler/kilder.ts`) med versjon, tidspunkt og SHA-256.
- **NICE NG222** (1.4.16 og 1.4.18) er grunnlaget for selve trappeformen: hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og det bør gå én til to uker mellom reduksjonene.
- **Psychiatrienet** står bare som referanse til Stop-oppføringen fra P3. Ingen regel bygger på teksten der, og ingen tekst derfra er lagret, sitert, oversatt eller omskrevet.
- **FEST-uttrekket 08.10.2026** gir styrkene og delbarheten sluttdosen regnes fra.

Bare egne formuleringer av enkeltfakta er lagret, høyst 250 tegn, med punktet i preparatomtalen.

## 3. Det felles prinsippet

Hver del av prinsippet er merket med om den kommer fra kilden eller er OUSFARs valg. Alle OUSFAR-valgene er åpne forslag som må avklares.

| Del | Kilden | OUSFARs forslag |
| --- | --- | --- |
| Trinn | NICE: en andel av forrige dose, eksempel 50 % | 50 % av aktuell dose |
| Mindre trinn ved lav dose | NICE: eksempel 25 % «når dosen blir lav» | 25 % fra laveste døgndose preparatomtalen oppgir for voksne, når den er over sluttdosen |
| Trinnlengde | NICE: én til to uker for å vurdere hver reduksjon | 14 dager (område 7–14) |
| Sluttdose | – | Halvparten av laveste registrerte styrke når FEST oppgir den som delbar i 2 for minst ett preparat, ellers styrken selv. Under den seponeres det. |
| Minste varighet | Preparatomtalen: «minst én til to uker» (SSRI, SNRI) eller «gradvis» uten tall (TCA, mirtazapin) | Minst 14 dager som bindende krav. Er nedtrappingen kortere, stopper beregningen. |
| Startdose | Preparatomtalens doseområde for voksne | Doser utenfor området stopper beregningen. |
| Toleranse | – | Ingen. Et trinn som ikke kan gis nøyaktig, stopper beregningen. |

Kildens Stop-anbefaling og OUSFARs regel er to ulike ting: regelen er en selvstendig, etterprøvbar strategi bygd på preparatomtalen og NICE, ikke en validert optimal nedtrapping og ikke en omskriving av Stop-oppføringen.

## 4. Avvik fra prinsippet

- **Paroksetin – rask kildevariant.** Regelen følger nedtrappingen i studiene i preparatomtalen: 10 mg mindre hver uke. Fra 20 mg er planen bare én uke. Samme preparatomtale og NICE råder til nedtrapping over flere uker eller måneder.
- **Fluoksetin.** Regelen har ikke mindre trinn ved lav dose, fordi den lange virketiden gir et gradvis fall i konsentrasjonen. NICEs forslag om dosering annenhver dag ved 20 mg kan ikke uttrykkes i regelmodellen. Regelen bruker halv tablett i stedet.
- **Vortioksetin, bupropion og moklobemid** har ikke krav om minste varighet, fordi preparatomtalen ikke har det. Fra laveste styrke seponeres stoffet fra dag 1.
- **Moklobemid.** Preparatomtalen sier ingenting om nedtrapping. Regelen bygger bare på NICE.
- **Nortriptylin.** Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.
- **Escitalopram.** Pilotregelen fra P4 (`seponering-escitalopram`) er beholdt uendret. Den har sluttdose 2,5 mg (halv 5 mg-tablett) og mindre trinn fra 5 mg. Etter P7-prinsippet ville sluttdosen vært 5 mg uten mindre trinn, fordi FEST ikke oppgir noen 5 mg-tablett som delbar. Konflikten er ikke løst i koden; den må avgjøres faglig (beslutning 8).
- **Citalopram** har to regler: P7-regelen (`seponering-citalopram`) og den hyperbolske pilotregelen fra P4 (`seponering-citalopram-hyperbolsk`). Verktøyet lar klinikeren velge strategi når begge gjelder. Den hyperbolske regelen er en egen strategi etter B2, ikke en del av P7-prinsippet.

## 5. Stoffer uten beregnbar regel, og hva som mangler

| Stoff | Status | Hva som mangler |
| --- | --- | --- |
| Agomelatin | Bare fagtekst | Preparatomtalen sier at nedtrapping ikke trengs. Det finnes bare preparater med godkjenningsfritak. Tekstregelen må kontrolleres. |
| Fenelzin | Mangler anbefaling | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. Stop-oppføringen er ikke tilgjengelig (P3). Seponering av en irreversibel MAO-hemmer bør dessuten skje med spesialist (NICE 1.9.5). |
| Imipramin, tranylcypromin, trazodon | Begrenset | Det finnes bare preparater med godkjenningsfritak og ingen norsk preparatomtale. En regel krever en annen godkjent kilde, for eksempel en utenlandsk preparatomtale, og et faglig valg om at den kan brukes. |
| Doksepin | Begrenset | Sinequan 25 mg er markedsført, men FEST lenker ikke til noen preparatomtale. Stop-oppføringen er hentet fra en annen adresse enn tabellen lenker til. |
| Dosulepin, maprotilin | Begrenset | Ingen preparater i FEST. |

## 6. Beregning med norske preparater

Reglene gir den ideelle dosekurven. Doseplanmotoren (P5) setter sammen hver dose av preparatene i FEST: hele tabletter og kapsler, halve og kvarte tabletter bare der FEST oppgir dem som delbare, og hele dråper når dråper er valgt. Miksturer uten dokumentert dosering per ml brukes ikke. Fordi ingen regel har toleranse, stopper mange planer med en forklaring og de nærmeste dosene som kan gis. Eksempler fra testene:

- Sertralin 150 mg: 37,5 mg kan ikke gis med 25, 50 og 100 mg-tabletter. Nærmeste doser er 25 og 50 mg.
- Duloksetin 90 mg og venlafaksin 225 mg: 45 og 56,25 mg finnes ikke, og kapslene kan ikke deles.
- Klomipramin 150 mg: de små trinnene fra 18,75 mg kan ikke gis med halve 10 og 25 mg-tabletter.
- Fluoksetin 40 mg: 10 mg kan gis som halv tablett, men ikke med kapsler.
- Amitriptylin og nortriptylin: tablettene er ikke oppgitt som delbare, så 12,5 og 37,5 mg kan ikke gis.

Planer som kan gis, ender alltid med seponering (sertralin 100 og 200 mg, duloksetin 120 mg, paroksetin 40 og 20 mg, fluoksetin 40 mg med delbare tabletter).

## 7. Faglige beslutninger før P4.8 og P7.5 kan godkjennes

1. **Det felles prinsippet:** 50 % per trinn, 25 % fra laveste dose i preparatomtalen, 14 dager per trinn og sluttdosen fra laveste norske styrke. Skal det godkjennes, justeres per stoff, eller erstattes?
2. **Toleranse eller annen formulering:** Uten toleranse stopper mange vanlige planer (avsnitt 6). Skal enkelte regler få en begrunnet toleranse, skal flytende former eller andre styrker brukes, eller skal en forklart stopp være svaret? Toleranse må i så fall godkjennes per regelversjon.
3. **Minste varighet:** Er 14 dager riktig lesing av «minst én til to uker»? Og er 14 dager forsvarlig der preparatomtalen sier «gradvis» eller «over flere uker» (amitriptylin, klomipramin, nortriptylin, mirtazapin)?
4. **Stoffer uten krav til varighet:** Er det forsvarlig at vortioksetin, bupropion og moklobemid seponeres fra dag 1 ved laveste styrke?
5. **Paroksetin:** Skal den raske studievarianten (10 mg per uke) være regelen, eller skal paroksetin følge det felles prinsippet eller en langsommere variant?
6. **Fluoksetin:** Er det riktig å droppe mindre trinn ved lav dose? Skal dosering annenhver dag (NICE) støttes?
7. **Siste trinn:** For venlafaksin (37,5 mg), duloksetin (30 mg), citalopram (10 mg) og sertralin (25 mg) går planen fra laveste styrke rett til null. Er det forsvarlig, eller kreves flytende form eller lengre siste trinn?
8. **Escitalopram og citalopram:** Skal pilotregelen for escitalopram harmoniseres med P7-prinsippet, og skal den hyperbolske citalopramregelen stå som valgbar strategi i verktøyet (B2)?
9. **Doseområdene:** Reglene gjelder preparatomtalens doser for voksne. Lavere doser hos eldre, ved nedsatt leverfunksjon (moklobemid) eller ved andre indikasjoner faller utenfor og stopper beregningen. Er avgrensningen riktig?
10. **Stoffene med begrensning:** Skal OUSFAR lage regler for imipramin, tranylcypromin, trazodon, doksepin og fenelzin fra andre kilder, og i så fall hvilke?
11. **Agomelatin:** Godkjennes tekstregelen om at nedtrapping ikke trengs?

## 8. Holdt utenfor

- Spørsmålet om optimal hyperbolsk nedtrapping er et forskningsspørsmål og ikke en del av denne leveransen. Den hyperbolske citalopramregelen fra P4 er uendret.
- Ingen Psychiatrienet-anbefaling er importert, omskrevet eller brukt som grunnlag.
- Johannesurt er utelatt overalt.

## 9. Kontroll

- `npm run verktoy:regler -- kontroll` kontrollerer begge regelsettene: kilder, påstandsnære henvisninger, grunnlag, godkjenning og at hvert regneeksempel stemmer med beregningen.
- `src/__tests__/verktoynedtrapping.test.ts` kontrollerer dekningen, reglene og doseplanene som beskrevet over. `verktoyregister.test.ts` og `verktoyside.test.tsx` kontrollerer statusen i verktøyet for alle regler i begge settene.
- `fortolkningUendret.test.ts` holder fortolkningen uendret, og den nye testen kontrollerer at bare verktøyene bruker de nye reglene.
