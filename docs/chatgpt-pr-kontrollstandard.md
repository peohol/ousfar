# ChatGPT – fast standard for PR-kontroll i peohol/ousfar

**Gjelder:** Hver gang ChatGPT vurderer kode, design, kliniske regler, planer eller pull requests fra Claude Code i dette repoet. Skal også brukes når samtalen er ny og ingen tidligere chatthistorikk er tilgjengelig.  
**Eier:** ChatGPT som uavhengig kontrollør på oppdrag fra Peder.  
**Oppdatert:** 10.11.2026 (felles AGENTS.md).  
**Hvilke PR-er:** bare PR-ene med etiketten til ChatGPT-prosjektet samtalen ligger i (`ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`), etter [prosjektansvar.md](prosjektansvar.md).  
**Viktig:** Dette er en arbeidsstandard i repoet, ikke en klinisk godkjenning, erstatning for de installerte PR-review-skill-instruksene eller et mandat til å begynne nye oppgaver.

## 1. Start alltid her – også i helt nye samtaler

Når Peder ber om «se over PR», «sjekk igjen» eller lignende:

1. Les repoets AGENTS.md (og AGENTS.md i undermapper PR-en endrer), [prosjektansvar.md](prosjektansvar.md) og dette dokumentet. For psykofarmakaverktøyene, les også [produktrevisjonsplanen](verktøy-produktrevisjon-2026-11.md), [klinisk leveranseplan](verktøy-klinisk-leveranseplan-2026-11.md), [brukervennlighetsplan](verktøy-brukervennlighet-2026-11.md), [K5-D-plan](verktøy-k5-dosefleksible-forlop.md) og ved behov [rettighetsvurderingen](verktøy-p3-rettigheter.md). Dokumentene og oppdatert GitHub-tilstand er referansen, ikke hukommelse fra gamle samtaler.
2. Bruk skills://github-pr-review og GitHub-koblingen. Finn nøyaktig PR-omfang, gjeldende HEAD-SHA, base, status, CI, tidligere ChatGPT-funn og diskusjoner **før** du vurderer. Ved «alle PR-er» hent hele køen med etiketter før kontroll og på nytt etterpå, og kontroller bare PR-ene med eget prosjekts etikett. En PR uten gyldig prosjektetikett får ikke ordinær kontroll og slås ikke sammen før eierskapet er avklart; en PR med et annet prosjekts etikett får ingen parallell kontroll herfra.
3. Sammenlign med sist vurderte eksakte SHA. Ikke kopier gamle kommentarer eller anmeld samme endring uten grunn. Hvis HEAD er uendret: kontroller oppdatert base, CI og faktiske avhengigheter, men ikke lag en duplikatkodegjennomgang.
4. Les relevant full diff **og omkringliggende kode, kliniske regler, kvalitetstester, kilder og faktisk brukerflyt**. PR-beskrivelsen er en påstand som skal kontrolleres, ikke et bevis. En velformulert dokumentasjon eller grønn CI er heller ikke bevis på produktnytte.
5. Skill klinisk signoff, teknisk kodegodkjenning, produktaksept og kontroll i publisert app. Disse er forskjellige beslutninger.

## 2. Still først spørsmålene om hensikten – ikke først om testene er grønne

Spør og dokumenter eksplisitt:

**A. Er dette det vi opprinnelig avtalte å lage?** Gjenfinn den opprinnelige brukerbestillingen, relevante senere vedtak og produktkontrakten. Er det levert en meningsfull variant av bestilt funksjon, eller har utviklingsarbeidet glidd over i et teknisk elegant, men utilstrekkelig eller annerledes produkt? Er en klinisk faglig forsvarlig *alternativ strategi* stille erstattet med noe annet enn det brukeren ba om?

**B. Er dette faktisk anvendelig?** Prøv å gjennomføre minst ett representativt realistisk forløp med **syntetiske** pasientdata. Kan en kliniker finne fram til en komplett plan uten å vite hvilke tekniske avkrysninger som må til? Er et negativt utfall forklart tydelig? Må klinikeren gjette på formulering, klinisk omfang eller skjulte regler? Hvis en normal bruker ikke klarer å få plan, må dette undersøkes som et produktavvik selv om enhetstester finner en snever positiv test.

**C. Er grensesnittet så enkelt som forsvarlig?** Spør om hvert synlige felt, spørsmål, bekreftelse, advarsel og avsnitt: Er dette nødvendig *nå* for en klinisk beslutning eller sikkerhet? Kan det utledes av et allerede eksplisitt svar, slås sammen, flyttes til en valgfri detaljvisning eller helt utelates uten å endre mening? Lang tekst, gjentakelser og upraktiske formuleringer er også faktiske brukerfeil når de hindrer arbeidsoppgaven.

**D. Hva får klinikeren faktisk ut?** Kontrollér **strategi, tidslinje, sluttmål og totalforløp**, ikke bare at dosene følger en intern formel. Ligner det forventede behandlingsregimet? Er det riktig kombinasjon/overlapp, start/slutt, opptrapping, oppfølging, reell norsk administrasjon og kopi? Se etter at skjerm og kopi er klinisk konsistente, men husk at begge kan gjenta den **samme feilaktige regelen**.

Disse fire spørsmålene må inngå i **alle relevante PR-beslutninger**, også når Claude sier at PR-en bare endrer brukerflate eller bare motor. Ved en ren dokumentasjons-PR skal man ikke kreve at senere planlagt kode allerede fungerer; bedøm om dokumentasjonen sannferdig identifiserer mangelen og gir realistiske tiltak.

## 3. Vurderingsakser – alle må være tilfredsstillende der de er relevante

### 3.1 Formål og omfang

- Finn opprinnelige og siste uttrykkelige krav. Ikke tillat at «klinisk godkjent regel» automatisk blir «opprinnelig bestilt verktøy».
- Sjekk hvordan typiske norske valg virker, og *ikke bare optimaliserte demonstilfeller*. Ingen skjult planregresjon ved endret regel, styrke, medisinform eller kilde.
- Oppgi konkret hva løsningen fortsatt ikke støtter. Antall merge-de PR-er, antall tester eller oppfylte minieksempler er ikke et mål på bredde.

### 3.2 UX og kognitiv belastning

- Normalt spørsmål i vanlig norsk + Ja/Nei/Vet ikke, eller få tydelige faktiske alternativer. Aldri «Gjelder/Gjelder ikke» på et langt sammensatt utsagn dersom det kan uttrykkes klart. Ja/nei må fortsatt avbildes korrekt til motorens underliggende betingelse.
- Ved negativt utfall: hvilket konkret forhold blokkerer, *hvorfor* finnes ingen godkjent plan for dette tilfellet, hva kan klinikeren gjøre videre? Skill risiko, mangel på støttet regel, mangel på data/preparat og teknisk feil. Unngå «Da gjelder ikke regelen».
- Vis standardplanen med medisin, dato/dager, dose, praktisk administrasjon og vesentlige oppfølgingspunkter. Unngå doble advarsler, lange rå preparatlister, teknisk kildehistorikk og alle sjekkbokssvar i første visning og vanlig kopi.
- Tell nødvendige klikk/svar og visuell tekstmengde i representative positive og negative kasus. Én unødvendig avkrysning kan være et reelt hinder; sikkerhetskritiske spørsmål må likevel bevares. Sjekk mobil, tastatur, lesbarhet, utskrift og kopiering.
- Fjern ikke sikkerhetsinformasjon ukritisk: flytt **ikke-essensiell forklaring** til detaljer, behold **handlingskritisk** informasjon synlig.

### 3.3 Klinisk substans og norske preparater

- Gjør egen kildeprøving når medisinsk innhold er endret eller omstridt: norske SPC/DMP/FEST, relevante retningslinjer og primærstudier. Verifiser faktisk regel, dosevalg, preparatform, deling, antall enheter, intervall, nedtrapping, overgang/overlapp, risiko, klinisk oppfølging og sluttmål.
- For et legemiddelbytte: vurder **strategitype** selvstendig (direkte bytte, kryssnedtrapping, sekvensielt bytte, utvasking) og om valgt strategi samsvarer med brukerens opprinnelige forventning. En annen forsvarlig strategi skal merkes som alternativ og besluttes, ikke smugles inn som den bestilte.
- En klinisk regel aktiveres ikke uten uavhengig signoff for eksakt versjon og fingeravtrykk, eksplisitt avgrensning og dokumentert godkjente positive/negative kasus. Ikke utvid godkjent omfang ved en ren språk- eller UX-endring.
- Komplett plan betyr gjennom helt sluttmål; ingen delplan forkledd som komplett. Den siste dosen til null er en seponering av administrasjonen, ikke øyeblikkelig null konsentrasjon; ikke krev uendelig mikronedtrapping. Minste preparatdose er ikke i seg selv et vitenskapelig seponeringskriterium.
- Ikke bruk Psychiatrienets proprietære tekst som database eller oversatt/omskrevet implementasjon. Sammenligning som avdekker strategisk avvik er legitim, men regelimplementering og klinisk godkjenning må bygge på uavhengige lovlige kilder og gjeldende rettighetsvurdering.

### 3.4 Teknikk, sikkerhet og observasjon

- Sjekk kodebane og reelle avhengigheter, typer, inputvalidering, feil- og tilstandsbehandling, kliniske nødstopp, autentisering/roller, FEST-kildens ferskhet, tidsendring og negative kasus. Ikke stol blindt på tester eller snapshots.
- Skille test med simulert godkjenning/mock fra **usimulert** app-regel, og komponenttest fra nettlesertest mot faktisk publisert versjon. «Alle tester grønne» sier ikke hva som ikke er testet.
- Test skjerm, tidslinje, kopiert plan og utskrift mot en **uavhengig klinisk fasit**, ikke bare mot hverandre. Kontroller at resultatet som vises for en administrator faktisk oppstår under realistiske valg.
- Klinisk tilgang for ordinære brukere endres ikke uten særskilt beslutning og produkt-/klinisk test.

## 4. PR-beslutningen

Før merge skriv kort i egen vurdering:
1. **Bestilling:** hvilket problem brukeren ønsket løst.
2. **Faktisk resultat:** hva ny HEAD gjør, med konkret representativt kasus.
3. **Produktgap:** oppfyller det formålet og er det enkelt nok? Hva er unødig synlig, hvor stopper brukeren?
4. **Faglig kontroll:** hva er verifisert uavhengig, hvilke regler/fingeravtrykk gjelder, hvilke kilder ligger bak?
5. **Teknikk og tester:** CI, basekonflikter, rettede tidligere funn, reelle positive/negative prøver, UI/kopi/utskrift og hva som *ikke* er demonstrert.
6. **Konklusjon:** merge / konkret blokkerende feil / midlertidig avhengighet eller ventende kontroll. Vær tydelig på om et funn er påvist, antatt eller uprøvd.

**Blokker før merge** ved verifisert feil mot bestilt kjernebeteende, vesentlig klinisk feil eller risiko, ubegrunnet faglig strategibytte, ufullstendig plan som fremstår komplett, misvisende stopp- eller valgspråk som gjør den aktuelle leveransen ubrukelig, brudd på sikkerhet/tilgang, eller manglende nødvendig verifikasjon. Dokumentér *hvorfor det er vesentlig* og en konkret rettingsvei. Ikke gjør smakspreferanser til absolutte sperrer. Ikke blokker en avgrenset plan-/dokumentasjons-PR fordi framtidig programfunksjon ennå ikke eksisterer.

**Kommenter på GitHub bare ved reelle utestående merge-blokkerende funn.** En vanlig toppnivåkommentar må begynne med nøyaktig «Tilbakemelding fra ChatGPT». Ta med eksakt HEAD-SHA, hva som ble kontrollert, hvilke tidligere funn som er rettet, og gjenstående konkrete problemer og akseptkriterier. Ikke dupliser samme funn på uendret HEAD eller skriv om gamle rettede feil.

**Merge** selvstendige, kontrollert klare PR-er med eget prosjekts etikett med squash (og expected_head_sha når verktøyet støtter det), etter bekreftet CI, grønn kontroll «Prosjektansvar» og avhengigheter. Bekreft faktisk merge-resultat fra GitHub; hent komplett PR-liste igjen. Hvis bare CI/integrasjon mangler, ikke oppfinn kodefeil. Respekter eksplisitt arbeidsdeling og brukerens siste prioritering.

## 5. Etterkontroll og kontinuitet

- Når en PR avdekker ny viktig feil i opprinnelig behov, klinikk eller UX, før den inn i **relevant styrende plan**, ikke bare i en kort chat eller en gammel PR-kommentar.
- Ved ny samtale: hent alltid ny repo- og PR-tilstand. Ikke trekk konklusjon fra tidligere SHA, status eller intern hukommelse uten kontroll.
- Ingen ny planlagt kontroll/automatisering uten at Peder ber om det; respekter en tidligere avsluttet oppfølging. En tom PR-kø er ikke i seg selv oppfordring til å starte mer implementering.
- Ved rapportering til Peder: si hva som faktisk ble kontrollert/merget/kommentert og hvilke **menneskelige** problemer som gjenstår. Hold språket kort, presist og uten teknisk støy.

**Kort kontrollspørsmål før enhver godkjenning:** «Er dette det vi skulle lage, er det faglig riktig, og kan en kliniker faktisk bruke det uten unødig arbeid eller tekst?»
