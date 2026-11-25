# Benzoylekgonin i urin

Leses når noe ved fortolkningen av benzoylekgonin i urin skal endres, eller
når en ny modell skal aktiveres. Bestilt av Peder 24.11.2026 (#562) og utvidet
med fem utskillelsesprofiler 25.11.2026 (#570).

Modulen har to **modellformer**. Form 1 (#562, to profiler) er den som er
aktivert i dag. Form 2 (#570, fem profiler og to vurderinger) er
implementert og venter på sin egen aktivering; se «Form 2» under og
«Utrullingen av form 2».

Modulen er **intern beslutningsstøtte** i OUS Klinisk farmakologi, ikke et
laboratoriesvar. Den har ingen kommentar, ingen kopiering, ingen eksport og
ingen kommentarmal. Serumfortolkningen av benzoylekgonin (scenarioet
`benzoylekgonin`, BEZ1, SRUS) og THC-syremodulen er uendret.

## Status

**Form 1 er aktivert i OUS Klinisk farmakologi.**

Peder svarte på de kliniske spørsmålene og godkjente modellen 24.11.2026
(under). Aktiveringen (`supabase/migrations/20261124143000_be_urin_aktivering.sql`)
legger inn metoden URUS, oppføringen «Benzoylekgonin i urin» med koden UBEZ og
modellen `ous-kf-2026-11-24` i OUS Klinisk farmakologi. Andre fagmiljøer har
ingen modell og ingen oppføring.

## Form 1: to profiler (#562)

Q er benzoylekgonin/kreatinin i samme kvotientenhet som regresjonene, t i
døgn. De to profilene er bestillingens, med alle oppgitte sifre:

- C1(t) = 107.189780 · e^(−0.07822197·t) + 3.879389 · e^(−0.00796211·t)
- C2(t) = 115.772143 · e^(−0.408875962·t) + 4.569599 · e^(−0.015911821·t)

Kurvene er to ekstreme empiriske utskillelsesprofiler, ikke validerte
populasjonspersentiler eller biologiske maksimumsgrenser. I appen heter de
nøytralt «Utskillelsesprofil 1» og «Utskillelsesprofil 2».

1. Q1 = f · B1/K1 og Q2 = f · B2/K2 (f er modellens `kvotientfaktor`, 1 når
   feltenes enheter er regresjonenes). Begge prøvene er påkrevd.
2. d er kalenderdøgnene mellom prøvedatoene (`dagerMellom`, samme som THC;
   UTC-datoer, så sommertid flytter ingenting).
3. For hver profil: t_i der C_i(t_i) = Q1 (`tidForVerdi` fra `thcKurver.ts`),
   og terskelen R_i = C_i(t_i + d)/Q1. Samme dato gir d = 0 og R_i = 1
   nøyaktig. t_i er et matematisk punkt på kurven, ikke tiden siden inntak.
4. R_målt = Q2/Q1, og R_korr = R_målt · exp(z · √(2 · (CV_BE² + CV_kreatinin²))),
   z = Φ⁻¹(1 − margin). Marginene er «Ingen (50 %)», 90 % og 99 %, med 90 %
   som standard, og z er de samme som THC-syreregelsettets.
5. Antall profiler R_korr ligger strengt over: 0 «Ikke nødvendigvis nytt
   inntak.», 1 «Kan ikke fastslås.», 2 «Nytt inntak.». Ratioene sammenlignes
   direkte med full presisjon. Profilene krysser hverandre (rundt Q ≈ 3,7
   for korte tidsrom), så ingen rekkefølge forutsettes; med like terskler
   finnes det ikke noe mellomutfall.

**Validering.** Ingen konklusjon, graf eller gammelt resultat ved et tomt
eller ugyldig felt: datoer må være ekte, denne prøven kan ikke være før
forrige, kreatinin må være over 0, og benzoylekgonin må være kvantifisert og
over 0 i begge prøvene. 0, ikke påvist og under kvantifiseringsgrensen kan
modellen ikke vurdere; det sies, og ingenting imputeres. En numerisk feil
(et tidspunkt som ikke lar seg finne med full presisjon) gir heller ingen
konklusjon.

**Ekstrapolasjon.** Ligger Q1 over startverdien C_i(0) (≈ 111,1 og ≈ 120,3),
er t_i < 0 og terskelen regnet ved matematisk ekstrapolasjon. Modulen sier
det, uten å hevde at modellen er dokumentert der. Det empiriske
gyldighetsområdet er ikke oppgitt; om det skal bli en stoppgrense, avklares
før aktivering.

**Sikkerhetsmarginen.** Bryteren, forklaringen («Hva er sikkerhetsmarginen?»,
med modellens egne CV-er), figuren med valgt eller alle marginer og banneret
«Vurder høyere sikkerhetsmargin» er THC-syremodulens. Banneret viser hver
mildere konklusjon en høyere margin gir, også nytt inntak etter en eldre
prøve; valgt margin endres bare når brukeren trykker.

**Samlet vurdering.** «Samlet vurdering med enda tidligere prøver» legger til
prøver med de samme tre feltene; alle må være tatt før forrige prøve. Bare
når hovedsammenligningen gir «Kan ikke fastslås», sammenlignes denne prøven
med hver av dem, nyeste først, med samme margin og modell og hver prøves egen
Q og tidsrom. Den første som overskrider begge profilene, vises for seg som
«Nytt inntak etter [dato] (modellindikasjon)»; hovedkonklusjonen, figuren og
beregningen står uendret. Ingen treff sies kort. En ugyldig tidligere prøve
gir mangler, ikke en lydløs fortolkning. Det er ingen regel om automatisk
nytt inntak ved Q = 0 (som i THC).

**Figuren** er THC-syremodulens: x er døgn siden forrige prøve, y er
100 · (R − 1), begge profilene starter på 0 %, og denne prøven står ved d.
Endepunktene er motorens terskler. Fargen følger terskelen profilen er for
disse prøvene (nedre grønn, øvre rød), og legenden sier det med ord. Samme
dag tegnes ingen figur, bare beregningen.

## Form 2: fem profiler (#570)

Bestilt i #570 (Peder 25.11.2026, med ChatGPTs gjennomgang). Bare i OUS
Klinisk farmakologi. Serum, THC-syre, verktøymenyen og tilgangen er uendret.
Modulen er fortsatt intern beslutningsstøtte uten kopiering, eksport eller
laboratoriesvar; «kommentar» betyr tekst i resultatpanelet.

**Modellen.** Q = benzoylekgonin/kreatinin, med benzoylekgonin i nmol/L,
kreatinin i mmol/L og Q i nmol/mmol (kvotientfaktor 1). t og d er
kalenderdøgn. CV 0,2 og 0,05, marginene 50/90/99 % (standard 90 %) og
korreksjonen er de samme som i form 1. Modellen har feltet `form: 2` og
listen `profiler` med fem profiler, hver med fast ID og type:

| ID | Type | Navn i appen | Parametre | Kilde |
| --- | --- | --- | --- | --- |
| `enkeltinntak` | mono | Utskillelse etter enkeltinntak | a = 1, k = 24·ln 2/7 = 2,3765046190626693 d⁻¹ | Cone et al. 2003, doi:10.1093/jat/27.7.386: egen log-lineær regresjon av 18 profiler, største t½ ≈ 6,95 h, rundet til 7 h |
| `gjentatte_doser` | mono | Utskillelse etter gjentatte doser innenfor et kort tidsrom | a = 1, k = 24·ln 2/35 = 0,47530092381253386 d⁻¹ | Jufer et al. 2000, doi:10.1093/jat/24.7.467: 35 h er valgt fra største t½ 34,5 h; et valgt referansepunkt, ikke en dokumentert øvre grense |
| `moderat` | mono | Moderat utskillelse | a = 267,2691490332445, k = 0,2891162303589332 d⁻¹ (t½ = 57,54 h) | Log-lineær regresjon av 13 lokale kvotienter (R²(log) = 0,9053, RMSE(log) = 0,7242). Bare de avledede parametrene står her; rådataene skal aldri i repoet, testene eller dokumentasjonen |
| `bi_a` | bi | Treg eller ekstrem, per sammenligning | C1 i form 1, alle sifre | #562 |
| `bi_b` | bi | Treg eller ekstrem, per sammenligning | C2 i form 1, alle sifre | #562 |

Rekkefølgen i listen spiller ingen rolle; ID-en er nøkkelen, ikke navnet.

**Tersklene.** For de monoeksponentielle er R_i = e^(−k_i·d) direkte,
uavhengig av Q1 og a. For de bieksponentielle er fremgangsmåten den samme som
i form 1: t_i der C_i(t_i) = Q1, og R_i = C_i(t_i + d)/Q1, med merknaden om
ekstrapolasjon når Q1 ligger over C_i(0). Samme dato gir R_i = 1 for alle.
Tersklene regnes også som logaritmer (log-sum-exp for de bieksponentielle), og
F sammenlignes med logaritmene når R_i eller F ikke lenger er et vanlig
flyttall. Et svært langt tidsrom gir derfor aldri en ugyldig vurdering, selv
om figuren viser −100 %.

**Treg og ekstrem.** For hver sammenligning (referanseprøven og d) er den av
`bi_a` og `bi_b` med høyest R «Ekstrem utskillelse» og den andre «Treg
utskillelse». Ved nøyaktig like terskler er `bi_a` ekstrem, og appen sier at
de gir samme terskel. Navnene og fargene står fast gjennom resultatet, figuren,
beregningen og alle marginene for den sammenligningen, og regnes på nytt for
en ny referanseprøve eller et nytt tidsrom (i den samlede vurderingen for hver
eldre prøve for seg). Ingen rangering av de fem forutsettes.

**Gradene.** F_i = R_korr/R_i, uten avrunding: under (F < 1), på nivå med
(F = 1), over (1 < F ≤ 5), langt over (5 < F ≤ 10), svært langt over (F > 10).
Nøyaktig 5 og 10 hører til den lavere graden. Hver profil vurderes for seg, i
fast rekkefølge, og det telles ikke hvor mange profiler endringen ligger over.

**Resultatpanelet.** Uten den faste merkingen «Tentativ modell – ikke klinisk
validert …»; de andre forbeholdene står. Øverst «Konsentrasjonsendringene er
justert for måleusikkerhet med {margin} % sikkerhetsmargin.» (50 %: «… er
ikke justert for måleusikkerhet (50 % sikkerhetsmargin).»), så en skillelinje,
gradene mot enkeltinntak og gjentatte doser under «Sammenlignet med det som
kan ses ved sporadisk bruk …», en skillelinje, gradene mot moderat, treg og
ekstrem under «Sammenlignet med det som kan ses ved kronisk bruk …», en
skillelinje, og de to kortene side om side (under hverandre på smal skjerm):
«Sporadisk bruk lagt til grunn» og «Kronisk bruk lagt til grunn».

**Reglene for kortene** (foreslått i #570, kvalitative vurderinger, ikke
kalibrerte sannsynligheter; må godkjennes uttrykkelig før aktiveringen):

- Sporadisk: F_enkelt ≤ 1 → «Endringen er forenlig med utskillelse etter et
  enkeltinntak. Et nytt inntak kan ikke fastslås.»; ellers F_gjentatt ≤ 1 →
  «Endringen er forenlig med utskillelse etter gjentatte doser innenfor et
  kort tidsrom. Et nytt inntak kan ikke fastslås.»; ellers F_gjentatt ≤ 5 →
  «Det er sannsynlig at et nytt inntak har skjedd.»; ellers «Det er svært
  sannsynlig at et nytt inntak har skjedd.»
- Kronisk: F_ekstrem > 5 → «Det er svært sannsynlig …»; ellers F_ekstrem > 1 →
  «Det er sannsynlig …»; ellers F_moderat > 1 og F_treg > 1 → «Det kan ikke
  fastslås om et nytt inntak har skjedd basert på analyseresultatene alene.
  Det bemerkes likevel at en såpass ekstrem utskillelse anses svært uvanlig.»;
  ellers «Det kan ikke fastslås om et nytt inntak har skjedd basert på
  analyseresultatene alene.»
- Samme dato (forslag): alle fem ratioene graderes mot 1 og forklaringen om
  ukjent tid står, og begge kortene sier «Prøvene har samme dato, så tiden
  mellom dem er ukjent. Et nytt inntak kan ikke fastslås ut fra prøvene alene.»
- Ved manglende eller ugyldige verdier og numeriske feil gis ingen kort og
  ingen sannsynlighetsutsagn, bare det som mangler.

Tekstene står i `src/domain/beUrinProfilvisning.ts`, reglene i
`src/domain/beUrinProfiler.ts`.

**Høyere margin.** Begge kortene og gradene regnes med hver høyere margin i
modellen. Banneret «Vurder høyere sikkerhetsmargin» viser hver mildere
vurdering, og hvilken vurdering (sporadisk eller kronisk bruk) den gjelder.
Marginen endres bare når brukeren trykker.

**Samlet vurdering.** Er den slått på, sammenlignes denne prøven med hver
eldre prøve, nyeste først, når kortet for kronisk bruk er uavklart
(F_ekstrem ≤ 1) men endringen ligger over minst én av moderat og treg. Et
treff er F_ekstrem > 1 for det paret (med parets egne treg/ekstrem), og vises
under kortet for kronisk bruk med datoen og forbeholdet «indikasjon på nytt
inntak etter den eldre prøven, ikke nødvendigvis etter forrige prøve».
Kortene, figuren og beregningen for hovedparet endres ikke. Ugyldige eldre
prøver gir mangler, som i form 1. Samme dato for hovedparet: tiden er ukjent,
så den samlede vurderingen er alltid aktuell da (åpent spørsmål, under).

**Figuren** viser alle fem profilene samtidig på de samme aksene (prosentvis
endring og døgn), hver med sin farge (`--be-profil-*` i tokens.css, lyst og
mørkt tema, minst 3:1 mot kortet), sitt stiplingsmønster og navnet i
legenden. Endepunktene er motorens terskler. Samme dag tegnes ingen figur.
Den målte/korrigerte prøven og valget av margin er som i form 1; punktene for
denne prøven er nøytrale, siden det ikke finnes én samlet konklusjon å farge
dem etter. Beregningen viser Q med enhet, R_målt, R_korr, og for hver profil
terskelen R, F og graden.

### Åpne faglige spørsmål (til godkjenningen)

1. Kortreglene og tekstene over er forslag og må godkjennes uttrykkelig.
2. Teksten på kortene ved samme dato er et forslag.
3. Den samlede vurderingen når hovedparet har samme dato: her alltid aktuell
   (tiden er ukjent), med det vanlige treffkriteriet F_ekstrem > 1. Alternativet
   er å bruke kriteriet for d > 0 også da.

## Utrullingen av form 2

1. **Denne endringen (implementeringen):** appen kjenner begge formene og
   oppgir dem i overskriften `x-far-be-urin-modellformer` («1,2»).
   Formkontrollen i databasen godtar begge (`intern.be_urin_modellform`), og
   `public.les_be_urin_modell()` gir bare en form appen oppgir; en app uten
   overskriften (fra før form 2) får 22023 med «… krever en nyere utgave av
   appen. Last inn siden på nytt for å oppdatere.», som den viser. Den leser
   aldri fem profiler som to, og får aldri et annet fagmiljøs modell. Modellen
   i OUS Klinisk farmakologi er uendret (form 1), og modulen ser ut og
   fortolker som før. Rekkefølgen spiller ingen rolle: en database uten
   endringen ser bort fra overskriften.
2. **Aktiveringen (egen migrasjon, egen PR):** først når appen med form 2 er i
   produksjonen og den eksakte modellversjonen og kortreglene er godkjent.
   Den bytter bare OUS-modellen til form 2 med en ny versjon, beholder URUS,
   UBEZ, CV-ene, marginene og tilgangen, har samme kontroll av måleusikkerheten
   mot THC-syreregelsettet som 20261124143000, og `intern.endring_start`.
   Tilbakeføring: en ny migrasjon som legger inn form-1-modellen
   `ous-kf-2026-11-24` igjen (den står i 20261124143000).
3. **Opprydding:** når form 2 er aktivert og ingen eldre app er i bruk, kan
   form 1 fjernes fra appen i en egen endring.

## Delene

| Hvor | Hva |
| --- | --- |
| `src/domain/beUrinModell.ts` | Modellen i begge formene, kontrollen av dem, svaret fra databasen og overskriften med formene |
| `src/domain/beUrinMotor.ts` | Lesingen av inndataene (begge formene) og motoren for form 1: Q, tersklene, konklusjonen, samlet vurdering, mildere margin, punktene per margin |
| `src/domain/beUrinProfiler.ts` | Motoren for form 2: tersklene, treg/ekstrem, gradene, kortene, samlet vurdering, mildere margin |
| `src/domain/beUrinPlot.ts`, `beUrinVisning.ts`, `beUrinProfilvisning.ts` | Figuren og ordlyden (form 2 i `beUrinProfilvisning.ts`) |
| `src/katalog/beUrinModell.ts` | Hentingen (`les_be_urin_modell`, med formene) og meldingene når modellen mangler |
| `src/components/BeUrinStep.tsx`, `BeUrinSkjema.tsx`, `BeUrinForklaring.tsx`, `BeUrinPlot.tsx`, `BeUrinDeler.tsx` | Modulen, delt mellom formene; resultatet for form 1 står i `BeUrinStep.tsx` |
| `src/components/BeUrinProfilresultat.tsx`, `BeUrinProfilPlot.tsx`, `src/styles/beUrin.css` | Resultatpanelet, figuren og fargene for form 2 |
| `src/domain/figurakser.ts`, `src/components/Figurdeler.tsx` | Aksene, etikettene og klammen, delt med THC-syremodulen uten endring der |
| `supabase/migrations/20261124095000_be_urin_modell.sql` | Tabellen, lesingen og oppføringstypen `be_urin` |
| `supabase/migrations/20261124143000_be_urin_aktivering.sql` | Aktiveringen av form 1: URUS, UBEZ og modellen i OUS Klinisk farmakologi |
| `supabase/migrations/20261125094800_be_urin_modellformer.sql` | Formkontrollen for begge formene og lesingen etter formene appen oppgir |
| `src/domain/__tests__/beUrinMotor.test.ts`, `src/__tests__/beUrinModell.test.ts`, `beUrinSteg.test.tsx` | Testene av form 1 |
| `src/domain/__tests__/beUrinProfiler.test.ts`, `src/__tests__/beUrinModellformer.test.ts`, `beUrinProfilSteg.test.tsx` | Testene av form 2, formkontrollen og eldre/nyere app mot eldre/nyere database |
| `src/domain/__tests__/hjelp/beUrinTestmodell.ts`, `src/__tests__/hjelp/beUrinvisning.tsx` | De bestilte profilene med syntetiske enheter og CV-er for form 1, modellen for form 2 slik #570 oppgir den, og oppsettet for skjermtestene; bare for testene |

## Konfigurasjonen, tilgangen og aktiveringen

- **Lokal.** Modellen står i `public.be_urin_modeller`, høyst én per fagmiljø,
  og leses bare med `public.les_be_urin_modell()`: aktivt medlemskap kreves,
  og svaret er arbeidskontekstens modell (`intern.arbeidsfagmiljo`), eller
  `null`. Tabellen har radsikkerhet uten regler og ingen rettigheter for
  nettleseren, og funksjonen tar ingen argumenter. Klientpakken har ingen
  modell og ingen reserve. Et annet fagmiljø, en direkte lenke eller et
  bytte av fagmiljø gir aldri OUS Klinisk farmakologi sin.
- **Versjonert.** Modellen har `versjon`, som databasen krever er den samme i
  kolonnen og i modellen. Den endres bare med en migrasjon; appen skriver
  ikke til den. Appen kontrollerer hele modellen før den brukes
  (`validerBeUrinModell`: enhetene som tekst, der tom tekst betyr
  laboratoriets egne enheter uten navn i appen, to navngitte profiler med
  positive tall, 0 < CV < 1,
  marginene med z mot AS 241, standarden blant dem), og en modell som ikke
  består, brukes ikke.
- **Søket.** Oppføringen er en vanlig katalogoppføring med typen `be_urin`
  i fagmiljøets katalog (`docs/fagmiljoer.md`); søket, adressen og
  tilgangen følger katalogen som for de andre modulene. Den lenker ikke til
  fagsidene (`docs/domener.md`).
- **Skjemaet** overlever en oppdatering av appen (`useBevart`,
  `fortolkning/be-urin/<fagmiljø>/<modellversjon>`), men bare med samme
  fagmiljø og modellversjon: følger en ny modell med oppdateringen, begynner
  skjemaet tomt. Det tømmes ved «Nullstill» og ved bytte av fagmiljø, og
  hører til den innloggede (`Bevaringseier`). Ingen prøveverdier lagres,
  sendes, logges eller står i adressen.

**Aktiveringen** er én egen migrasjon som legger inn modellen og oppføringen
i OUS Klinisk farmakologi. Peders avklaringer (24.11.2026), og hva de blir:

1. **Enhetene.** Kurvene viser benzoylekgonin/kreatinin i de samme enhetene
   som brukeren taster inn: `kvotientfaktor` 1, og enhetene står tomme, så
   feltene heter bare «Benzoylekgonin» og «Kreatinin», som i THC-syremodulen.
2. **Koden.** Analysen hører til metoden URUS, som ikke var i appen før:
   metoden URUS opprettes i katalogen, og analysen får koden UBEZ inntil
   videre. BEZ1 (serum, SRUS) er urørt.
3. **Måleusikkerheten** er den samme som THC-syreregelsettets (IRCAK): CV for
   benzoylekgonin = THC-syrens CV, CV for kreatinin = kreatininens. Verdiene
   tas fra det publiserte THC-syreregelsettet i OUS Klinisk farmakologi når
   migrasjonen kjører, og står deretter fast i modellversjonen; en senere
   endring av THC-syreregelsettet endrer ikke denne modellen.
4. **Det ekstrapolerte området** behandles som i THC-syre: ekstrapolert
   bakover, med merknaden i beregningen. Ingen stoppgrense.
5. **Modellen er godkjent** av Peder.

Oppføringens `navn` er det søketreffet viser. Serumoppføringen heter
«Benzoylekgonin», så urinoppføringen heter «Benzoylekgonin i urin»; ellers
skiller bare koden og fargen de to treffene.

Nettleserkontrollen (`src/__tests__/qa/benzoylekgoninnettleser.ts`, lokalt
testmiljø) prøver den aktiverte oppføringen og modellen med oppdiktede
prøveverdier, og deretter form 2 med den syntetiske modellen lagt inn bare i
den lokale databasen.

En eldre app kjenner ikke typen `be_urin` og ville avvist hele katalogen.
Katalogen gir derfor bare typene appen oppgir at den kjenner, og en app fra
før dette får ikke oppføringen eller metoden URUS (docs/fagmiljoer.md,
«Typene appen kjenner»).
