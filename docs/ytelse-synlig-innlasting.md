# Ytelse: raskere synlig innlasting og personsøk

**Status:** Vedtatt gjennomføringsplan (20.11.2026). **Prosjekt:** OUSFAR Dev (`ansvar:dev`). **Ansvarlig systemarkitekt:** `peohol`. **Samleoppgave:** [#499](https://github.com/peohol/ousfar/issues/499).

## Arbeidsoppgaver og avhengigheter
- [#500 P0 – baseline og måleverktøy](https://github.com/peohol/ousfar/issues/500) – **først**, tar planfilen med i første PR.
- [#501 P1 – appskall/kode per rute](https://github.com/peohol/ousfar/issues/501) – parallelt etter P0.
- [#502 P2 – personsøk](https://github.com/peohol/ousfar/issues/502) – parallelt etter P0.
- [#503 P3 – fagsider](https://github.com/peohol/ousfar/issues/503) – parallelt etter P0.
- [#504 P4 – bakgrunnskall](https://github.com/peohol/ousfar/issues/504) – analyse parallelt, felles kode etter P1.
- [#505 P5 – samlet etterkontroll](https://github.com/peohol/ousfar/issues/505) – til slutt, når P1–P4 er merget.

## 1. Formål og prioritet

OUSFAR skal *oppleves rask*, ikke bare sende færre SQL-kall: innlogget bruker skal se relevant, korrekt innhold og kunne foreta sin neste handling så snart de nødvendige dataene er klare. Sider og paneler som ikke er synlige, skal som hovedregel ikke forsinke disse handlingene.

Prioriter dette:
1. **Tid til første meningsfulle visning og brukbar navigasjon.**
2. **Tid fra fullført personsøk til relevante treff vises.**
3. **Tid til valgt fagsides synlige faginnhold.**
4. **Unødig oppstartsarbeid, dupliserte forespørsler og store kodepakker.**

Dette er en ytelses- og UX-endring, ikke en anledning til å endre klinisk semantikk, tilgang eller presentasjonsstruktur ellers.

## 2. Konkrete funn fra koden (hypoteser, ikke målte flaskehalser)

| Område | Nåværende design | Hvorfor undersøke |
| --- | --- | --- |
| Innloggingsport | `src/components/konto/Port.tsx` laster `App` med `lazy()` *etter* avklart autentisering og profil; innloggingsveggen beskytter klinisk kode | Dette vernet må beholdes; all videre kodedeling skjer **innenfor** den beskyttede appen |
| Startskjerm | `src/App.tsx` returnerer en tom `port` mens `useHentAnalyttkatalog` er i `laster` | Hele UI venter på katalogen, også ruter som ikke bruker analyttene |
| Kode | `App.tsx` importerer svært mange sidekomponenter direkte; Vite har allerede egen riktekstpakke | Uåpnede sider, administrasjon og redigering kan koste nedlasting/parsing ved oppstart |
| Rettigheter | `useMineRettigheter`, `useKontoensSvar` og katalogen har arbeidskontekst avhengig av fagmiljø | Progressiv visning må aldri vise gammelt fagmiljø eller funksjoner før nødvendige rettigheter er kjent |
| Personsøk | `src/personsok/usePersonsok.ts` venter 250 ms, krever minst to tegn og husker gjeldende søk; `src/personsok/api.ts` kaller RPC | Måle nettverkslatens og serverens kjøretid før man justerer debounce eller legger på mer caching |
| SQL-personsøk | `intern.personsokbare`, `intern.personsoktreff` og `sok_{gruppekandidater,medlemskandidater,direktemottakere}` i migrasjonen `20261119190000_personsok.sql` | Rettighetskontroller og fuzzy sammenligning kan være tunge før de 20 resultatene returneres; må bekreftes med plan/måling |
| Fagsider | `src/components/stoffside/Stoffside.tsx` starter lesing fra mange kilder; `useLegemidler`, `useInteraksjoner`, `useFarmakogenetikk` mfl. | Skille datasett som faktisk trengs for synlig kort/konvertering/referanser fra lukkede detaljpaneler |
| Oppdatering/cache | `src/auth/mellomlager.ts`, `src/faginnhold/globaltSok.ts`, `useSokeindeks`, `useNaarLedig` har allerede mellomlager, versjonskontroll og utsatt indekshenting | Gjenbruk og forbedre eksisterende mekanismer; ikke lag nye generelle systemer uten demonstrert behov |
| Bakgrunn | `useKontoensSvar`, `useJevnligSjekk`, adminstatus, forsiden og chat/varsler starter egne kontroller | Kan konkurrere med kritiske forespørsler eller dupliseres ved fokus og synliggjøring |
| DB-historikk | `docs/stoffsidelesing-ytelse.md` beskriver at `les_stoff` alt er kraftig optimalisert, mens `les_stoffer` fremdeles er forholdsvis tung | Ikke gjør om allerede løste problemer; mål forholdet mellom full søkeindeks og synlig sidelesing |

**Viktig:** En visuelt pen skjelettvisning regnes ikke som gevinst hvis faktisk innhold/handling ikke kommer tidligere. Tilsvarende er en rask SQL-funksjon uten nettlesereffekt ikke et selvstendig mål.

## 3. Baseline før endringer (P0)

Bruk lokalt, isolert testmiljø fra [docs/qa-testmiljo.md](qa-testmiljo.md) via `apneTestmiljo()`. Benchmark må bruke et produksjonsbygg, syntetiske personer og stoffdata i realistisk skala, uten nettverkskall til produksjon. Gjenbruk eksisterende QA-infrastruktur og skriv et eget reproduserbart måleskript, f.eks. `src/__tests__/qa/ytelse.ts`, samt rapport `docs/ytelse-maling.md`.

**Målepunkter:** Fra navigasjon/handling til (a) første meningsfulle innhold, (b) synlig og brukbar navigasjon, (c) første vellykkede interaksjon, (d) nødvendige data på valgt side, og (e) oppdatert/komplett side. Skill nettverk, server, lasting av JS, parsing og React-rendring der det lar seg gjøre; registrer overført JS/CSS og antall forespørsler før (a) og (c). Instrumenteringen må ikke legge inn vedvarende brukerdata i logger.

**Scenarier:** Kald oppstart etter innlogging, varm oppstart med gyldig økt, overgang forside → stoffside, direkte lenke til fagside, forside → fortolkning, åpne administrasjon/Brukere, bytte arbeidsfagmiljø, og søk i gruppeinvitasjon, medlemskandidater og direktemeldinger. Test første søk, gjentatt søk, raske tastetrykk, tomt treff, feil og lang responstid.

**Syntetiske datasett:** Små og realistiske, samt et større datasett som avslører skalering (eksempelvis 50 / 500 / 5 000 personer når testmiljøet tåler det). Fordel kandidater mellom fagmiljøer, med roller, aktive/avsluttede medlemskap, private profiler, reserverte navn og blokkerte direktemeldinger. For fagsidene: bygg på `src/__tests__/hjelp/syntetiskeFagsider.ts` og dokumenter datastørrelsen. Samme testdata og miljø ved før/etter.

**Metode:** Minst fem repetisjoner per scenario; rapporter median og p95 der antallet er tilstrekkelig, samt spredning og testforhold (maskin, nettverksprofil, varm/kald cache). Skill målt tid i nettleser fra `EXPLAIN (ANALYZE, BUFFERS)`/`pg_stat_statements` (hvis tilgjengelig) for konkrete SQL-kall. Ikke bruk oppkonstruerte produksjonstall.

**Målsetning, ikke garantier:** Etter endring bør median til første nyttige innhold/handling forbedres tydelig (som arbeidsmål minst 25 % i scenarier med dokumentert ventetid), og sakte personsøk bør få lavere p95. Er forbedringen mindre, oppgi hvorfor og vurder å forkaste kompleksiteten. Sett konkrete terskler etter baseline; aldri endre korrekthet for å nå tall.

P0 er et **stoppsignal** før risikofylt ytelsesendring: vi må vite hva som faktisk koster tid. De uavhengige trådene kan analysere kode parallelt, men alle sammenligninger skal bruke uendret P0-baseline.

## 4. Leveranse P1: trygt, raskt appskall og mindre oppstartspakke

**Filer å undersøke:** `src/App.tsx`, `src/components/konto/Port.tsx`, `src/auth/okt.tsx`, `src/auth/rettigheter.tsx`, `src/katalog/Analyttkatalogkilde.tsx`, `vite.config.ts`, `src/components/forside/*`, rutekomponentene i `src/components/*`.

1. Kartlegg hvilke ruter som krever analyttkatalog, egne rettigheter, profil, stoffregister og andre data. Behandle **nødvendig per rute** i stedet for **alt nødvendig for hele appen**. Profil og innloggingsport må fortsatt være avklart før beskyttet UI/kode vises.
2. Vis trygg toppnavigasjon, sideoverskrift, forside og rutehandlinger så snart de nødvendige rettigheter/egne opplysninger er bekreftet. Fortolkning skal ikke gi valg eller kommentartekst før **riktig** analyttkatalog og regelgrunnlag er klart. Vis relevant lokal lastetilstand der det mangler data.
3. Ikke gi den vanlige brukeren adminvalg i ventetiden. Ikke vis den forrige arbeidskontekstens kliniske innhold etter bytte. Fagmiljøbytte må fortsatt ta ned det gamle dataområdet og hindre kryssbruk; kontosperring/utlogging må fortsatt stenge alt umiddelbart.
4. Del etter reelle ruter: først tunge/admin-/kuraterings-/redigeringsflater, videre fagside/verktøydeler dersom byggrapporten tilsier det. Bruk `React.lazy`/`Suspense` der det er nyttig. **Ikke** flytt klinisk innhold utenfor beskyttet JS-pakke eller svekk `scripts/kontroller-vegg.mjs`. Behold den eksisterende autentiseringsporten rundt dynamiske import-kall.
5. Ikke del så aggressivt at navigasjon med varm cache eller tastaturflyt blir merkbart tregere. Eventuelt etterlast sannsynlig neste rute først etter at det synlige innholdet er interaktivt, og ikke på bekostning av nødvendige nettverkskall.

**Aksept:** Første meningsfulle visning kommer før urelaterte bakgrunnskall er ferdige; en sen katalog gjør ikke forsiden blank; fortolkning venter riktig; logging/arbeidskontekst, rettigheter, feilmeldinger, sideadresse, taster, appoppdatering og tilgjengelighet er intakte. Mål nedlastet JS før interaktivitet, ikke bare størrelsen på totalpakken.

## 5. Leveranse P2: personsøk, både faktisk og opplevd responstid

**Filer:** `src/personsok/*`, `src/components/personsok/Personsok.tsx`, `supabase/migrations/*_personsok.sql` (eldre migrasjoner **endres ikke**), `src/__tests__/personsok.test.ts`, `src/__tests__/qa/personsoknettleser.ts`. Les [supabase/AGENTS.md](../supabase/AGENTS.md), [docs/fagmiljoer.md](fagmiljoer.md) og [docs/brukere.md](brukere.md) først.

1. Bruk P0s separate latensmålinger for 250 ms-tastaturpause, nettverkskall, databasearbeid, svarstørrelse og rendring. Først når SQL er sannsynlig flaskehals, analyser søkets spørreplan og antall kandidater/scoreberegninger.
2. Undersøk om en billig, **sikker** forfiltrering (f.eks. eksakt eller prefiks før fuzzy matching) og færre repetisjoner av `personsokdeler`/`personsoktripler` kan redusere kostnaden. Ikke reduser eller endre treffmengde/rangering uten å beholde kontrakten; top-20 må være top-20 av hele den lovlig synlige kandidatmengden. Ikke bruk en usikker `LIMIT` før endelig rangering. Velg indeks bare hvis den gir målbar gevinst.
3. Bevar samme synlighet, invitasjons- og medlemskapsrettigheter, blokkering og chat-bryter. Bruk databasebegrenset søk; **aldri hent alle brukere til nettleseren** for å søke lokalt. Bevar støtte for æ/ø/å, aksenter, delord og skrivefeil, 2-tegnskravet, 100 tegn/fem ord og sortering.
4. Undersøk klientens debounce, avbrytelse og mellomlager. Avbryt eller ignorer utgåtte svar; ikke vis tidligere søketekst sine treff. Unngå søkekall under pågående skriving, og ikke bruk langvarig lagring av søkeresultater som kan bli feil etter rettighetsendring. Eventuelle kortvarige cachetreff skal nøckles etter innlogget bruker, relevant gruppe/fagmiljø og spørrestreng, med korrekt invalidasjon.
5. Test autorisasjon og negativ adgang minst like grundig som funksjonell hastighet; særskilt prøving av systemarkitekt, fagmiljøadministrator, ordinært medlem, avsluttet tilgang, ulike fagmiljøer, gruppeinvitasjon og direktemeldinger.

**Aksept:** Helt samme tillatte treff og rekkefølge som før for et representativt frosset datasett (inkl. stavefeil og nordiske tegn), ingen uvedkommende profil, forbedring i målt tregt søk, og raske tastetrykk gir ingen blinkende/stale treff.

## 6. Leveranse P3: fagside – synlig først, detaljer senere

**Filer:** `src/components/stoffside/Stoffside.tsx`, `useStoffside.ts`, `useLegemidler.ts`, `useInteraksjoner.ts`, `useFarmakogenetikk.ts`, de tilhørende panelene og `src/faginnhold/*`.

1. Lag først en tabell over **hvilke data hvert synlig felt og hver lukket seksjon faktisk bruker**: identitet, viktige data, oppsummeringer, interaksjoner, farmakogenetikk, bivirkninger, laboratorier, kjemi, referanseliste og konsentrasjonsomregning. Få med direkte lenker til en åpnet seksjon og søk på siden.
2. Behold liten og korrekt kjerne på første skjerm. Utsett kildekall for virkelig unødvendige **lukkede** detaljseksjoner hvis nettverksprofilen viser nytte. En åpnet seksjon/direktelenke skal umiddelbart starte sin nødvendige henting; en eventuell forhåndshenting kan skje etter synlig innhold.
3. Referansenumrene er knyttet til redaksjonelle og automatiske kilder. **Ikke la dem renummereres tilfeldig når paneler lastes**: enten sørg for stabile nummer før de vises, eller endre lastestrategien så nødvendig referansemetadata fortsatt er tilgjengelig. Ingen ufullstendige kliniske data presenteres som fullstendige; ingen foreløpig feil molekylvekt, enhet, terapigrense eller referanse.
4. Behold redigering/publisering, favoritter, seksjonsposisjon, bokmerker, søk, feilhåndtering og de tidligere beskyttelsene for publikasjon/utkast. Hvis per-panel-utsettelse gir flere kall eller ubetydelig gevinst, behold dagens parallelle henting fremfor å øke kompleksiteten.

**Aksept:** Korrekte og stabile tall, kilder, referanser og rekkefølger ved sen respons, feilet kilde, skjult/åpen seksjon og direkte lenke. Mål faktisk tid til synlig faginnhold.

## 7. Leveranse P4: fornuftig prioritering av bakgrunnsarbeid

**Filer:** `src/hooks/useKontoensSvar.ts`, `useJevnligSjekk.ts`, `useNaarLedig.ts`, `src/auth/aktivitet.ts`, `src/components/konto/Administrasjon.tsx`, `src/components/forside/Forsidepanel.tsx`, `src/varsler/*`, `src/grupper/*`, `src/gruppechat/*` og `src/App.tsx` **bare etter samordning med P1**.

1. Kartlegg alle kall første sekunder etter oppstart og etter fokus/synliggjøring; skill nødvendige rettighets- og medlemskapskall fra status/varsler/oversikter/søkeindekser.
2. Behold kontroll for opphevet medlemskap, rolle/arbeidsfagmiljø og beskyttet tilgang. Ikke erstatt aktuelle autorisasjonsbeslutninger med gamle nettleserdata. Nettleserlagring av bruker-/fagmiljøspesifikke data må nøckles og slettes/ugyldiggjøres korrekt.
3. Slå sammen identiske samtidige lesekall og unngå dobbeltoppfriskning ved `focus` + `visibilitychange`, når det gir målt gevinst. Sørg for at hendelser/oppdateringer som skal vises straks fortsatt gjør det.
4. Utsett *ikke-kritiske* forhåndshentinger til synlig UI er interaktivt. `useNaarLedig` og eksisterende mellomlager kan gjenbrukes. Ikke introduser global kall-kø som risikerer å holde tilbake kliniske eller brukerinitierte handlinger.
5. Ikke optimaliser ved å skjule feil eller gi brukeren et uriktig «ingen varsler»- eller «ingenting pågår»-signal.

**Aksept:** Mindre konkurrerende bakgrunnstrafikk og ingen funksjonsforsinkelse, gamle brukerdata ved utlogging eller avvik i varsler/tilgangskontroller.

## 8. Etterkontroll (P5)

Kjør P0-scenariene fra **samme** syntetiske datasett, identiske innstillinger og målemetode. Sammenlign før og etter tabellvis for median, p95, antall kall, bytes/JS, tid til første brukbar handling og SQL CPU/tid der relevant. Kontroller særlig:
- Innlogging, utlogging, nytt fagmiljø og avsluttet medlemskap under pågående last.
- Mobil og smal skjerm, langsomt nett, tastatur/snarveier, skjermleser/statusmeldinger og fokushåndtering.
- Direkte lenke til stoff-/underside og kjente søkeruter, raske tastetrykk, gammelt svar etter nytt søk.
- Korrekt fagside ved sen CPIC/CYPinfo/PubChem/FEST-data, stabil referansenummerering og enhetsomregning.
- Ingen uforutsett lekkasje fra innloggingsveggen ved nye dynamiske JS-pakker.
- Test at appoppdatering med gamle hashed filer fremdeles har trygg gjenoppretting.

Gjennomfør `npm test`, `npm run build` og relevante lokale nettleserkontroller. Rapporter det som **ikke** ble raskere, og vurder å fjerne komplekse optimaliseringer med liten effekt. Ingen belastningskjøring mot produksjonsdatabasen eller Vercel-preview mot produksjonsdata.

## 9. Parallell gjennomføring og grenser

**Bølge A (først): P0, måling og denne planen til `main`.** P0-tråden kan ta utgangspunkt i grenen `plan/ytelse-synlig-innlasting-20261120`, som allerede inneholder planen. Ingen annen tråd endrer målegrunnlaget før dette er dokumentert.

**Bølge B (tre parallelle arbeidstråder, etter P0):**
- **B1 – appskall og kodepakking (P1):** eier `src/App.tsx`, `src/components/konto/Port.tsx`, `vite.config.ts`, rutekobling og beskyttelse av JS.
- **B2 – personsøk (P2):** eier `src/personsok/*`, `src/components/personsok/*`, ny additiv SQL-migrasjon og tilhørende søketester.
- **B3 – fagsider (P3):** eier `src/components/stoffside/*` og tilhørende kilder/tester; skal **ikke** samtidig endre `src/App.tsx`.

De tre skal ha egne Issues, grener og PR-er. De kan alle opprette sin egen enkeltstående endringsloggfil uten å endre `package.json`; oppdater alltid mot nyeste `main` før klarering.

**Bølge C:** P4 kan undersøkes parallelt med bølge B, men kodeendringer som berører `App.tsx` eller andre felles oppstartsflater skal vente til B1 er slått sammen. Andre dokumentert uavhengige P4-endringer kan leveres separat. Ikke gjør endringer i SQL-migrasjonene fra flere tråder samtidig uten eksplisitt filavgrensning.

**Bølge D:** P5 først etter at relevante leveranser er merget. Koordinatortråden i Claude har ansvar for avhengigheter, Issue-merking, konflikthåndtering, at PR-er sendes til ChatGPT-kontroll og for å fortsette gjennom alle avtalte faser. Claude slår aldri sammen PR-er. Ingen nye periodiske kontrolljobber opprettes automatisk.

**For hver PR:** Én eier `ansvar:dev`, kun `peohol` som assignee, korrekt arbeidsoppgave (Refs/Closes), kort menneskelig sammendrag, avhengigheter, tester og måleresultater, oppdatert HEAD, grønn CI. Hvis endring i ett spor viser seg å berøre Verktøy-faginnhold eller Fag-kuratering, overleveres det som eget Issue etter `docs/prosjektansvar.md`, ikke parallell implementering her.

## 10. Avgjørelser og begrensninger

- Planen godkjenner **ikke** svekket tilgang, endring av kliniske regler eller destruktive DB-migrasjoner. Reell sikkerhetsrisiko, vesentlig nedetid eller vanskelig reversering krever Peders eksplisitte ja etter repoets regler.
- Pasientopplysninger er forbudt i OUSFAR og i testsystemet. Logg ikke brukernavn, personnavn, fri tekst, JWT eller identifiserende søk i ytelsestelemetri; bruk aggregater og syntetiske verdier.
- Prioriter dokumentert forbedring fremfor ny cache-infrastruktur, mikroskopiske visuelle fiks eller unødvendig omfattende refaktorering.
- Vurderingen av produksjonshastighet er foreløpig en hypotese. Det kreves før- og etter-måling før resultater kan hevdes.
