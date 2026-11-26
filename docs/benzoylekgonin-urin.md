# Benzoylekgonin i urin

Leses når noe ved fortolkningen av benzoylekgonin i urin skal endres, eller
når en ny modell skal aktiveres. Bestilt av Peder 24.11.2026 (#562), utvidet
med fem utskillelsesprofiler 25.11.2026 (#570), og forenklet med nye
konklusjoner 25.11.2026 (#576).

Modulen har to **modellformer**. Form 1 (#562, to profiler) er den som er
aktivert i dag. Form 2 (#570, fem profiler og to vurderinger) er
implementert og venter på sin egen aktivering; se «Form 2» under og
«Utrullingen av form 2».

Modulen er **intern beslutningsstøtte** i OUS Klinisk farmakologi, ikke et
laboratoriesvar. Den har ingen kommentar, ingen kopiering, ingen eksport og
ingen kommentarmal. Serumfortolkningen av benzoylekgonin (scenarioet
`benzoylekgonin`, BEZ1, SRUS) og THC-syremodulen er uendret.

## Status

**Form 2 (fem profiler, #570) er aktivert i OUS Klinisk farmakologi.**

Peder svarte på de kliniske spørsmålene og godkjente form 1 24.11.2026
(under). Aktiveringen (`supabase/migrations/20261124143000_be_urin_aktivering.sql`)
la inn metoden URUS, oppføringen «Benzoylekgonin i urin» med koden UBEZ og
modellen `ous-kf-2026-11-24` (form 1) i OUS Klinisk farmakologi. Peder
godkjente kortreglene og tekstene for form 2 25.11.2026, og at prøver fra samme
dag ikke sammenlignes. `supabase/migrations/20261125121500_be_urin_fem_profiler.sql`
bytter modellen til `ous-kf-2026-11-25` (form 2); URUS, UBEZ og tilgangen er
uendret. Andre fagmiljøer har ingen modell og ingen oppføring. Appen kan
fortsatt lese form 1, til den ryddes bort.

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

**Skjemaet** er det samme for begge formene (#576, under «Form 2»).

**Sikkerhetsmarginen.** Bryteren, figuren med valgt eller alle marginer og banneret
«Vurder høyere sikkerhetsmargin» (`MildereMargin`) er slik THC-syremodulen hadde
dem før #586; THC-syre bruker nå den korte teksten ved kommentaren. Banneret viser hver
mildere konklusjon en høyere margin gir, også nytt inntak etter en eldre
prøve; valgt margin endres bare når brukeren trykker.

**Samlet vurdering.** «+ Legg til tidligere prøve» legger til
prøver med de samme tre feltene; alle må være tatt før forrige prøve. Bare
når hovedsammenligningen gir «Kan ikke fastslås», sammenlignes denne prøven
med hver av dem, nyeste først, med samme margin og modell og hver prøves egen
Q og tidsrom. Den første som overskrider begge profilene, vises for seg som
«Nytt inntak etter [dato] (modellindikasjon)»; hovedkonklusjonen, figuren og
beregningen står uendret. Ingen treff sies kort. En tom eller ugyldig tidligere
prøve gir ingen konklusjon før den er fylt ut eller fjernet, ikke en lydløs
fortolkning. Det er ingen regel om automatisk
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
| `gjentatte_doser` | mono | Utskillelse etter gjentatte doser innenfor et kort tidsrom | a = 1, k = 24·ln 2/35 = 0,47530092381253386 d⁻¹ | Jufer et al. 2000, doi:10.1093/jat/24.7.467 (PMID 11043648): 35 h er valgt fra største t½ 34,5 h; et valgt referansepunkt, ikke en dokumentert øvre grense (se under) |
| `moderat` | mono | Moderat utskillelse | a = 267,2691490332445, k = 0,2891162303589332 d⁻¹ (t½ = 57,54 h) | Log-lineær regresjon av 13 lokale kvotienter (R²(log) = 0,9053, RMSE(log) = 0,7242). Bare de avledede parametrene står her; rådataene skal aldri i repoet, testene eller dokumentasjonen |
| `bi_a` | bi | Treg eller ekstrem, per sammenligning | C1 i form 1, alle sifre | #562 |
| `bi_b` | bi | Treg eller ekstrem, per sammenligning | C2 i form 1, alle sifre | #562 |

Rekkefølgen i listen spiller ingen rolle; ID-en er nøkkelen, ikke navnet.

**Kildene og forbeholdene.** Jufer et al. 2000 gjaldt gjentatt
høydoseadministrasjon av kokain i opptil 16 dager, og den terminale
halveringstiden for benzoylekgonin ble beregnet med ARE-metoden (mengden som
gjenstår å skilles ut). Studien gir altså ingen direkte etablert øvre grense
for kreatininkorrigert utskillelse etter én kort sesjon; 35 h er et valgt
referansepunkt. For alle fem profilene gjelder at sammenligningene forutsetter
at prøvene er tatt i eliminasjonsfasen, etter at opptaket fra et inntak er
avsluttet, og om eliminasjonsfasen har startet, kan ikke fastslås ut fra
prøvene. Gradene og vurderingene er kvalitative faglige sammenligninger med
profilene, ikke kalibrerte sannsynligheter. Forbeholdet om eliminasjonsfasen
står i én kort, diskret linje under vurderingene (`BE_URIN_FORUTSETNING`), og
at vurderingene er kvalitative, i forklaringen (`BE_URIN_KVALITATIV`); ingen
faste bannere.

**Tersklene.** For de monoeksponentielle er R_i = e^(−k_i·d) direkte,
uavhengig av Q1 og a. For de bieksponentielle er fremgangsmåten den samme som
i form 1: t_i der C_i(t_i) = Q1, og R_i = C_i(t_i + d)/Q1, også når Q1 ligger
over C_i(0) (matematisk ekstrapolasjon). Fra #576 sier brukerflaten ingenting om
ekstrapolasjon, heller ikke for de eldre prøvene; matematikken er uendret.
Prøver fra samme dato sammenlignes ikke i form 2 (under).
Tersklene regnes også som logaritmer (log-sum-exp for de bieksponentielle), og
F sammenlignes med logaritmene når R_i eller F ikke lenger er et vanlig
flyttall. Et svært langt tidsrom gir derfor aldri en ugyldig vurdering, selv
om figuren viser −100 %.

**Treg og ekstrem.** For hver sammenligning (referanseprøven og d) er den av
`bi_a` og `bi_b` med høyest R «Ekstrem utskillelse» og den andre «Treg
utskillelse». Ved nøyaktig like terskler er `bi_a` ekstrem (`likeBi` i motoren;
fra #576 sies det ikke i resultatet). Navnene og fargene står fast gjennom
vurderingene, tabellen, figuren, forklaringen og alle marginene for den
sammenligningen, og regnes på nytt for
en ny referanseprøve eller et nytt tidsrom (i den samlede vurderingen for hver
eldre prøve for seg). Ingen rangering av de fem forutsettes.

**Gradene.** F_i = R_korr/R_i, uten avrunding: under (F < 1), på nivå med
(F = 1), over (1 < F ≤ 5), langt over (5 < F ≤ 10), svært langt over (F > 10).
Nøyaktig 5 og 10 hører til den lavere graden. Hver profil vurderes for seg, i
fast rekkefølge, og det telles ikke hvor mange profiler endringen ligger over.

**Designprinsippet (#576).** Brukeren skal se det som trengs, ikke alt appen
vet: konklusjonene før begrunnelsen, ingen bannere, ingen gjentakelser, ingen
lange tekster, ingen ikoner, skillelinjer eller kort i kort. En vanlig
fortolkning får plass på én PC-skjerm uten rulling.

**Skjemaet** (`BeUrinSkjema.tsx`, felles for begge formene). Forrige prøve og
denne prøven står side om side på bred skjerm, under hverandre på smal. Hver
prøve står i en ramme med navnet i kanten (`Provegruppe`, delt med THC-syre).
Hver prøve har benzoylekgonin, kreatinin og prøvedato; enheten står inne i feltet
(og i feltets navn for skjermlesere: «Benzoylekgonin (nmol/L)»), og
«Kreatinin-normalisert konsentrasjon 100 nmol/mmol» står diskret under
(«… –» før den kan regnes). Benzoylekgonin får litt bredere felt enn kreatinin,
så et femsifret tall får plass, og datofeltet er akkurat bredt nok til
«dd.mm.åååå». Tidligere prøver legges til med den diskrete knappen «+ Legg til tidligere
prøve» under feltene og fjernes med en rød ✕ i kanten av rammen; fokuset går til den nye
prøvens første felt, og til knappen når en fjernes. Det er ingen avkrysning for
den samlede vurderingen: den er med så snart det står en tidligere prøve. Et
skjema tatt vare på over en oppdatering fra før #576, med tidligere prøver og
den samlede vurderingen slått av, får ingen tidligere prøver
(`lesBevartBeUrinInndata`), så de ikke plutselig er med.
Mens skjemaet fylles ut, vises ingen liste over det som mangler, bare «Vurderingen
vises når prøvene er fylt inn.» (`BE_URIN_VENTER`). Et ugyldig felt sies kort ved
feltet (`feltfeil` i `beUrinMotor.ts`: «Må være et tall.», «Må være kvantifisert og
over 0.», «Må være over 0.», «Ugyldig dato.»), knyttet til feltet med
`aria-describedby`; et tomt felt er ikke en feil. Det som er galt utover det
enkelte feltet, står kort der vurderingen ellers står (`BeUrinMangler.feil`):
denne prøven før forrige, «Prøver fra samme dag kan ikke sammenlignes. Bruk en
forrige prøve fra en tidligere dag.» (`SAMME_DAG_FEIL`), en tidligere prøve som
ikke er før forrige, en kvotient som ikke lar seg regne ut, en margin modellen
ikke har, og `NUMERISK_FEIL`. Nullstill og tastaturflyten er som før.

**Sikkerhetsmarginen** er et kompakt valg «Ingen (50 %)», «90 %», «99 %»
(standard 90 %) med navnet «Sikkerhetsmargin» og et lite informasjonstegn ved
siden av. Forklaringen bak tegnet (`Sikkerhetsmargin`, delt med THC-syre fra #586) vises ved pekeren,
ved tastaturfokus og ved et trykk på berøringsskjerm, og leses av skjermlesere
fra tegnet. Den sier kort at målingene er usikre, at en høyere margin legger
en mer forsiktig endring til grunn, og at marginen gjelder måleusikkerheten,
ikke sannsynligheten for at fortolkningen er riktig.

**Resultatet** (`BeUrinProfilresultat.tsx`) kommer rett etter skjemaet:

1. De to vurderingene side om side på bred skjerm, under hverandre på smal,
   uten egne kort med bakgrunn eller ramme: «Sporadisk bruk lagt til grunn» og
   «Kronisk bruk lagt til grunn», hver med en kort konklusjon og eventuelt én
   setning til (reglene under).
2. Under vurderingen ved kronisk bruk: den samlede vurderingen, når den er
   gjort (under).
3. Forbeholdet om eliminasjonsfasen, i én kort linje.
4. «Utskillelsesprofiler og figur» og «Forklaring», lukket som standard.

Det en høyere margin ville gitt, står ikke i resultatet, men i snakkebobler
ved bryteren for sikkerhetsmarginen i skjemaet (#588, som i THC-syre), for
eksempel «Sporadisk: Kan ikke fastslås» ved 99 % (`beMildereMarginer`).
Brukeren velger selv; det er ingen knapp og intet banner.

Det står ingen setning om justering for måleusikkerhet, ingen grader i
resultatet, ingen merknad om like terskler og ingen merknad om ekstrapolasjon.

**Reglene for vurderingene** (#570, endret i #576; kvalitative vurderinger,
ikke kalibrerte sannsynligheter). F er den usikkerhetskorrigerte ratioen delt
på profilens terskel; likhet hører til den mildere vurderingen:

- Sporadisk bruk lagt til grunn:
  - F_enkelt ≤ 1 → «Nytt inntak kan ikke fastslås.» + «Endringen er forenlig
    med utskillelse etter et enkeltinntak.» (`forenlig_enkeltinntak`)
  - ellers F_gjentatt ≤ 1 → «Nytt inntak kan ikke fastslås.» + «Endringen er
    forenlig med utskillelse etter gjentatte doser innenfor et kort tidsrom.»
    (`forenlig_gjentatte_doser`)
  - ellers F_gjentatt ≤ 5 → «Sannsynlig nytt inntak.» (`sannsynlig`)
  - ellers (F_gjentatt > 5) → «Nytt inntak.» (`nytt_inntak`)
- Kronisk bruk lagt til grunn:
  - F_ekstrem > 5 → «Nytt inntak.» (`nytt_inntak`)
  - ellers F_ekstrem > 1 → «Sannsynlig nytt inntak.» (`sannsynlig`)
  - ellers F_moderat > 1 og F_treg > 1 → «Nytt inntak kan ikke fastslås.» +
    «En såpass treg utskillelse anses likevel som svært uvanlig.»
    (`uavklart_uvanlig`)
  - ellers «Nytt inntak kan ikke fastslås.» (`uavklart`)

Den sterkeste vurderingen er «Nytt inntak», ikke «Svært sannsynlig» (#576).
Det er verktøyets sterkeste kategori, ikke et matematisk bevis, og det sier
forklaringen. Tersklene, profilene, måleusikkerheten og logikken for de eldre
prøvene er uendret fra #570.

- Samme dato (bestemt av Peder 25.11.2026): prøver fra samme dag
  sammenlignes ikke, siden tiden mellom dem er ukjent. Det gis ingen
  vurderinger, figur eller forklaring, bare `SAMME_DAG_FEIL`. Eldre prøver i
  den samlede vurderingen er alltid fra før forrige prøve, så de har aldri
  samme dato som denne prøven. Form 1 sammenligner fortsatt samme dag, til den
  fjernes.
- Ved manglende eller ugyldige verdier og numeriske feil gis ingen
  vurderinger og ingen sannsynlighetsutsagn (over).

Tekstene står i `src/domain/beUrinProfilvisning.ts`, reglene i
`src/domain/beUrinProfiler.ts`.

**Høyere margin.** Begge vurderingene regnes med hver høyere margin i
modellen. Strengheten, fra mildest, er ved sporadisk bruk forenlig med
enkeltinntak, forenlig med gjentatte doser, sannsynlig og nytt inntak; ved
kronisk bruk uavklart, uavklart men uvanlig, indikasjon på nytt inntak etter
en eldre prøve (mildere jo eldre prøven er), sannsynlig og nytt inntak.
Hver mildere vurdering får en snakkeboble som peker på den laveste marginen
som gir den, med vurderingen og konklusjonen kort («Kronisk: Sannsynlig nytt
inntak», og «(indikasjon etter 01.06.2026)» når en høyere margin gir
indikasjon etter en eldre prøve). Vurderinger ved samme margin står i samme
boble; en linje som alt står ved en lavere margin, gjentas ikke. Boblen sier
bare det som endres: gir en høyere margin samme konklusjon og bare en annen
utdyping, får den ingen boble; faller bare indikasjonen etter en eldre prøve
bort, står «Kronisk: Ingen indikasjon etter tidligere prøve». Den første
boblen står over bryteren, den neste under. Skjermlesere får hele teksten for
hvert utfall som beskrivelse av bryteren (`mildereTekst`). Den gir alltid
hele det kliniske utfallet: konklusjonen,
utdypingen når utfallet har en (forenlig med enkeltinntak eller gjentatte
doser, svært uvanlig utskillelse), og indikasjonen etter en eldre prøve når
utfallet har en. Slik ser to marginer med samme konklusjon, men ulik utdyping,
aldri like ut (ChatGPT-kontrollen av #577: BE 200 → 240 etter ett døgn uten
margin gir «… svært uvanlig» ved 90 % og bare «kan ikke fastslås» ved 99 %).
Faller noe bort som står i vurderingen nå, sies det: «Uten bemerkningen om
svært uvanlig utskillelse.» og «Ingen indikasjon på nytt inntak etter de
tidligere prøvene.». Marginen endres bare når brukeren velger den.

Ekstrapolasjon skjer når forrige prøve (eller en eldre prøve i den samlede
vurderingen) har en kvotient over startverdien til en bieksponentiell profil
(om lag 111 og 120 nmol/mmol), uansett tidsrommet; testene og
nettleserkontrollen prøver dette med Q 150 og sjekker at ingenting om det står
i brukerflaten.

**Samlet vurdering.** Med minst én tidligere prøve sammenlignes denne prøven
med hver eldre prøve, nyeste først, når vurderingen ved kronisk bruk er
uavklart (F_ekstrem ≤ 1) men endringen ligger over minst én av moderat og
treg. Et treff er F_ekstrem > 1 for det paret (med parets egne treg/ekstrem),
og står rett under vurderingen ved kronisk bruk: «Sammenlignet med prøven fra
{dato} er det indikasjon på nytt inntak etter den prøven, men ikke
nødvendigvis etter forrige prøve.» Uten treff: «Heller ikke sammenlignet med
de tidligere prøvene er det indikasjon på nytt inntak.» Indikasjonen
graderes ikke. Vurderingene, figuren og forklaringen for hovedparet endres
ikke.

**Utskillelsesprofiler og figur** (lukket som standard). En kompakt tabell er
både tegnforklaringen og oversikten: profilens strek (farge og
stiplingsmønster som i figuren), det korte navnet (Enkeltinntak, Gjentatte
doser, Moderat utskillelse, Treg utskillelse, Ekstrem utskillelse), forventet
endring etter d døgn (motorens terskel i prosent) og hvor endringen ligger
(graden), i gruppene «Sporadisk bruk» og «Kronisk bruk». Under den står
avkrysningen «Vis alle sikkerhetsmarginer» og figuren med alle fem profilene
på de samme aksene (prosentvis endring og døgn), hver med sin farge
(`--be-profil-*` i tokens.css, lyst og mørkt tema, minst 3:1 mot kortet) og sitt
stiplingsmønster. Endepunktene er motorens terskler. Punktene for denne
prøven er nøytrale; med alle marginene står de også som en liste under
figuren. En endring så stor at Q2/Q1 ikke er et vanlig flyttall, vurderes med
logaritmene, men tegnes ikke: figuren erstattes av en merknad.

**Forklaring** (lukket som standard, `beUrinProfilforklaring.ts`), i vanlig
språk og uten formler, symboler, parametere, eksponentialer, logaritmer, SD
eller regresjon, i stilen fra THC-syremodulen. Alt leses av motorens
resultat, så forklaringen alltid stemmer med vurderingene:

- «Hvor stor er endringen mellom prøvene?»: kvotienten i begge prøvene med
  datoene, døgnene mellom dem og den målte endringen i prosent.
- «Hvordan er det tatt hensyn til måleusikkerhet?»: målingene er usikre; med
  margin legges en mer forsiktig endring til grunn slik at tvilen kommer
  prøvegiver til gode, og endringen som fortolkes, oppgis; uten margin
  sammenlignes den målte endringen direkte.
- «Hva kan forventes dersom det ikke har skjedd et nytt inntak?»: at
  utskillelsen varierer betydelig med bruksmønsteret, og hvor endringen ligger
  mot hver av de fem profilene.
- «Hvorfor blir konklusjonen slik?»: én setning per vurdering, etter utfallet
  og om kvotienten har falt, er uendret eller har økt; den samlede vurderingen
  (treff, ingen treff, eller hvorfor de tidligere prøvene ikke er brukt); og
  at vurderingene er kvalitative modellvurderinger, ikke kalibrerte
  sannsynligheter, og at «Nytt inntak» er verktøyets sterkeste vurdering, ikke
  et matematisk bevis (`BE_URIN_KVALITATIV`).

### Godkjenningen

Peder godkjente kortreglene og tekstene for #570 som foreslått 25.11.2026, og
bestemte at prøver fra samme dato ikke sammenlignes (over). Samme dag bestilte
han forenklingen og de nye konklusjonene i #576 («Nytt inntak» i stedet for
«Svært sannsynlig», og de korte tekstene over). Ingen faglige spørsmål står
åpne.

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
2. **Aktiveringen** (`20261125121500_be_urin_fem_profiler.sql`, egen PR etter
   at appen med form 2 var i produksjonen og reglene var godkjent): bytter
   bare OUS-modellen fra `ous-kf-2026-11-24` (form 1) til `ous-kf-2026-11-25`
   (form 2). De tre monoeksponentielle profilene står med alle sifrene i
   migrasjonen; de to bieksponentielle tas uendret fra form-1-modellens kurver
   (`bi_a` = utskillelsesprofil 1, `bi_b` = utskillelsesprofil 2), og
   marginene fra den. Enhetene er nmol/L, mmol/L og nmol/mmol. Migrasjonen
   stopper uten å endre noe hvis THC-syreregelsettet har en annen
   måleusikkerhet enn 0,2 og 0,05, eller modellen i fagmiljøet ikke er
   `ous-kf-2026-11-24` av form 1. URUS, UBEZ og tilgangen er uendret.
   Tilbakeføring: en ny migrasjon som legger inn form-1-modellen
   `ous-kf-2026-11-24` igjen (den står i 20261124143000, og som
   `FORM1_AKTIVERT` i testene). En app fra før form 2 får meldingen om å
   oppdatere.
3. **Opprydding:** når form 2 er aktivert og ingen eldre app er i bruk, kan
   form 1 fjernes fra appen i en egen endring.

## Delene

| Hvor | Hva |
| --- | --- |
| `src/domain/beUrinModell.ts` | Modellen i begge formene, kontrollen av dem, svaret fra databasen og overskriften med formene |
| `src/domain/beUrinMotor.ts` | Lesingen av inndataene (begge formene) og motoren for form 1: Q, tersklene, konklusjonen, samlet vurdering, mildere margin, punktene per margin |
| `src/domain/beUrinProfiler.ts` | Motoren for form 2: tersklene, treg/ekstrem, gradene, vurderingene, samlet vurdering, mildere margin |
| `src/domain/beUrinPlot.ts`, `beUrinVisning.ts`, `beUrinProfilvisning.ts` | Figuren og ordlyden (form 2 i `beUrinProfilvisning.ts`) |
| `src/domain/beUrinProfilforklaring.ts` | Forklaringen for form 2, i vanlig språk, lest av motorens resultat |
| `src/katalog/beUrinModell.ts` | Hentingen (`les_be_urin_modell`, med formene) og meldingene når modellen mangler |
| `src/components/BeUrinStep.tsx`, `BeUrinSkjema.tsx`, `BeUrinForklaring.tsx`, `BeUrinPlot.tsx`, `BeUrinDeler.tsx` | Modulen, delt mellom formene; resultatet for form 1 står i `BeUrinStep.tsx` |
| `src/components/Provegruppe.tsx` | Rammen rundt hver prøve og den røde ✕-en som fjerner en tidligere prøve, delt med THC-syre |
| `src/components/BeUrinProfilresultat.tsx`, `BeUrinProfilPlot.tsx`, `src/styles/beUrin.css` | Resultatet, profiltabellen, figuren og fargene for form 2, og skjemaets utseende |
| `src/domain/figurakser.ts`, `src/components/Figurdeler.tsx` | Aksene, etikettene og klammen, delt med THC-syremodulen uten endring der |
| `supabase/migrations/20261124095000_be_urin_modell.sql` | Tabellen, lesingen og oppføringstypen `be_urin` |
| `supabase/migrations/20261124143000_be_urin_aktivering.sql` | Aktiveringen av form 1: URUS, UBEZ og modellen i OUS Klinisk farmakologi |
| `supabase/migrations/20261125094800_be_urin_modellformer.sql` | Formkontrollen for begge formene og lesingen etter formene appen oppgir |
| `supabase/migrations/20261125121500_be_urin_fem_profiler.sql` | Aktiveringen av form 2: modellen `ous-kf-2026-11-25` i OUS Klinisk farmakologi |
| `src/domain/__tests__/beUrinMotor.test.ts`, `src/__tests__/beUrinModell.test.ts`, `beUrinSteg.test.tsx` | Testene av form 1 |
| `src/domain/__tests__/beUrinProfiler.test.ts`, `beUrinProfilforklaring.test.ts`, `src/__tests__/beUrinModellformer.test.ts`, `beUrinProfilSteg.test.tsx`, `beUrinFigurvalg.test.tsx` | Testene av form 2 (også grensene F = 1, 5 og 10 og forklaringen), formkontrollen og eldre/nyere app mot eldre/nyere database |
| `src/__tests__/qa/benzoylekgoninnettleser.ts` | Den lokale nettleserkontrollen av begge formene, med skjermbilder |
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
   bakover, med merknaden i beregningen (form 1). Ingen stoppgrense. Form 2
   regner likt, men sier det ikke i brukerflaten (#576).
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
