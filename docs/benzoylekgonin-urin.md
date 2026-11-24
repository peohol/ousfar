# Benzoylekgonin i urin (tentativ)

Leses når noe ved den tentative fortolkningen av benzoylekgonin i urin skal
endres, eller når den skal aktiveres. Bestilt av Peder 24.11.2026 (#562).

Modulen er **intern beslutningsstøtte** i OUS Klinisk farmakologi, ikke et
laboratoriesvar. Den har ingen kommentar, ingen kopiering, ingen eksport og
ingen kommentarmal. Serumfortolkningen av benzoylekgonin (scenarioet
`benzoylekgonin`, BEZ1, SRUS) og THC-syremodulen er uendret.

## Status: bygd, ikke aktivert

Koden, motoren, skjemaet, figuren og plassen i databasen er på plass og
prøvd med syntetiske data. **Ingen ser modulen** før den aktiveres: databasen
har ingen modell og ingen katalogoppføring for den. Aktiveringen venter på
Peders kliniske avklaringer (under).

## Fremgangsmåten

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

## Delene

| Hvor | Hva |
| --- | --- |
| `src/domain/beUrinModell.ts` | Modellen, kontrollen av den, svaret fra databasen |
| `src/domain/beUrinMotor.ts` | Motoren: Q, tersklene, konklusjonen, samlet vurdering, mildere margin, punktene per margin |
| `src/domain/beUrinPlot.ts`, `beUrinVisning.ts` | Figuren og ordlyden |
| `src/katalog/beUrinModell.ts` | Hentingen (`les_be_urin_modell`) og meldingene når modellen mangler |
| `src/components/BeUrinStep.tsx`, `BeUrinSkjema.tsx`, `BeUrinForklaring.tsx`, `BeUrinPlot.tsx` | Modulen |
| `src/domain/figurakser.ts`, `src/components/Figurdeler.tsx` | Aksene, etikettene og klammen, delt med THC-syremodulen uten endring der |
| `supabase/migrations/20261124095000_be_urin_modell.sql` | Tabellen, lesingen og oppføringstypen `be_urin` |
| `src/domain/__tests__/beUrinMotor.test.ts`, `src/__tests__/beUrinModell.test.ts`, `beUrinSteg.test.tsx` | Testene |
| `src/domain/__tests__/hjelp/beUrinTestmodell.ts` | De bestilte kurvene med syntetiske enheter og CV-er, bare for testene |

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
  (`validerBeUrinModell`: to navngitte profiler med positive tall, 0 < CV < 1,
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

**Aktiveringen** er én egen migrasjon, etter Peders kliniske godkjenning, som
legger inn modellen og oppføringen i OUS Klinisk farmakologi. Før den kan
skrives, må Peder bekrefte:

1. enhetene for benzoylekgonin og kreatinin og skalaen til
   regresjonskvotienten (og dermed `kvotientfaktor`);
2. den lokale urinkoden og analysemetoden. Katalogen har i dag ingen kode for
   benzoylekgonin i urin: BEZ1 er serum (SRUS) og skal ikke omdefineres, og
   urinmetodene er UCAK (THC-syre) og UETGHB (etanolmetabolitter);
3. CV for benzoylekgonin og for kreatinin, metodespesifikke;
4. hvordan det ekstrapolerte området skal håndteres (stoppgrense eller ikke);
5. den eksakte modellversjonen etter kontroll.

Oppføringens `navn` er det søketreffet viser. Serumoppføringen heter
«Benzoylekgonin», så urinoppføringen må hete noe som skiller den, for
eksempel «Benzoylekgonin i urin»; ellers skiller bare koden og fargen de to
treffene.

Nettleserkontrollen (`src/__tests__/qa/benzoylekgoninnettleser.ts`, lokalt
testmiljø) legger selv inn en syntetisk modell og oppføring og tar dem bort
igjen.

Appen må ha vært ute med denne koden før oppføringen legges inn: en eldre
app kjenner ikke typen `be_urin` og ville avvist hele katalogen.
