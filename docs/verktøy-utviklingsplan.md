# OUSFAR – Verktøy: utviklingsplan og fremdrift

**Opprettet:** 27.10.2026  
**Status:** P1 til faglig kontroll – ingen verktøy er implementert gjennom denne planen  
**Omfang:** Tre første verktøy, felles regel- og beregningsmotor, kildedata og videre drift  
**Hovedansvar for implementering og oppdatering av denne planen:** Claude Code  
**Uavhengig faglig kontroll:** ChatGPT, etter eksplisitt forespørsel ved kontrollpunktene nedenfor

Dette er prosjektets **kanoniske fremdriftsplan**. Oppgaver krysses av først når resultatet finnes i repoet eller i en dokumentert kjøring. Hver gjennomførings-PR skal oppdatere relevant sjekkliste, evidens/kontroll og PR-lenke her. Arbeidet skal ikke deklareres ferdig på grunnlag av en plan eller en bestått byggtest alene.

## 1. Mål og ufravikelig avgrensning

**Første tre brukerrettede verktøy:**

1. **Trappe ned antidepressiv** – ett virkestoff, gjeldende dose, valgfri startdato; generert doseplan til seponering.
2. **Bytte antidepressiv** – to virkestoffer, gjeldende dose, ønsket måldose, valgfri startdato; beregnede samtidige/separate doseforløp.
3. **Bytte antipsykotikum** – tilsvarende, med særskilt identifikasjon av legemiddelform, frisetting, preparat og depot-/injeksjonsintervall der relevant.

Venstremenyen skal få valgene **Verktøy** og **Stoffregister**. Stoffregisteret beholder sin eksisterende oppbygning og funksjonalitet. Verktøyene skal også være søkbare i OUSFARs globale søk.

**Kildetabeller:** Psychiatrienets Combining Moodstabilizers, Switching Antidepressants og Switching Antipsychotics. Innhold fra Combining Moodstabilizers tas inn som kildemateriale for mulig senere bruk, men det opprettes **ikke et fjerde brukerrettet verktøy** i denne leveransen. Den tabellens retning «eksisterende legemiddel → legges til» må bevares.

**Endelig eksklusjon: Johannesurt (Hypericum / St. John's wort).**

- Ingen fagside skal opprettes for johannesurt. Eventuelle eksisterende egne oppføringer/fagsider må oppdages og håndteres kontrollert, slik at de ikke inngår i dette verktøyområdet.
- Ingen johannesurt i virkestoffvalg, forslag, doseberegning, regelsett eller publisert resultat.
- Ingen import av anbefalingstekster eller regler for nedtrapping av johannesurt eller for bytter **fra eller til** johannesurt. Utelat både rad, kolonne og Stop-oppføring. Eksklusjonen skal testes eksplisitt.
- Den generelle «Start»-kolonnen i antidepressivtabellen importeres **ikke**. «Stop»-kolonnen tas med for alle øvrige aktuelle virkestoffer.
- Ikke legg til en ny, generell OUSFAR-fagside om johannesurt som indirekte følge av importen.

**Ikke mål nå:** automatisk forskrivning, pasientjournal, dosetitrering uten klinisk validerte regler, fritt genererte bytter for celler uten anbefaling, eller ukritisk ekstrapolasjon fra Nederland til norske forhold.

## 2. Ansvar og arbeidsflyt

| Aktør | Har hovedansvar for | Skal ikke gjøre uten kontroll |
| --- | --- | --- |
| **Claude Code** | Repo- og FEST-kartlegging, datauthenting, importør, fagsider/koblinger, regelrepresentasjon, beregningskode, UI, automatiserte tester, dokumentasjon, PR-er og oppdatering av denne planen | Publisere eller «godkjenne» en ny klinisk beregningsregel bare fordi koden fungerer |
| **ChatGPT** | Uavhengig vurdering av utvalg av kilder, faglig kontroll av abstraherte regler, kliniske særtilfeller, uenigheter, beregningseksempler og gjennomgang av PR-er før risikofylt klinisk innhold tas i bruk | Erstatte kildedokumentasjon med antakelser; erklære en kontroll utført uten å ha kontrollert materialet |
| **Faglig beslutningstaker (Peder)** | Ta stilling til vesentlige kliniske prinsipielle avveininger og godkjenne eventuelle omstridte anbefalingsstrategier | Må ikke utføre innsamling, kodeendringer, FEST-jobber eller andre tekniske operasjoner |

**Samhandlingsregel:** Claude lager avgrensede PR-er og merker klinisk relevante endringer «Til faglig kontroll». Når en slik PR er klar, bes ChatGPT eksplisitt om gjennomgang (ChatGPT overvåker ikke repoet automatisk). ChatGPT rapporterer konkrete funn i PR-en eller med en handlingsklar tilbakemelding; Claude retter; ny kontroll utføres ved behov. En klinisk risikofylt PR skal ikke merges bare fordi tekniske tester er grønne.

**Sporbarhet:** Hver oppgave under har ID. PR-beskrivelsen skal oppgi oppgave-ID, datakilder, hva som er testet, hvilke oppføringer/regler som mangler faglig validering, og eventuelle avvik fra Psychiatrienet. Ved kontroll føres status og lenke inn i fremdriftsloggen nederst. Ikke opprett mange parallelle PR-er som skriver samtidig i denne filen.

## 3. Fremdriftsoversikt

Statusene er **Ikke startet / Pågår / Til faglig kontroll / Blokkert / Ferdig**. «Ferdig» krever oppfylte akseptansekriterier, PR eller annet etterprøvbart resultat og relevante kontroller.

| ID | Leveranse | Utførende | Uavhengig kontroll | Status | Dokumentasjon / PR |
| --- | --- | --- | --- | --- | --- |
| P0 | Plan og avgrensning | ChatGPT | – | **Ferdig** | Dette dokumentet, 27.10.2026 |
| P1 | Virkestoff- og FEST-kartlegging | Claude | ChatGPT (utvalg) | Til faglig kontroll | `docs/verktøy-p1-kartlegging.md`, PR #279 |
| P2 | Manglende fagsider og FEST-koblinger | Claude | ChatGPT (avvik) | Ikke startet | – |
| P3 | Komplett og lovlig kildeimport | Claude | ChatGPT (deknings- og stikkprøvekontroll) | Ikke startet | – |
| P4 | Faglig regelmodell og kontrollert pilotsett | Claude | **ChatGPT – sperrende** | Ikke startet | – |
| P5 | Felles dose- og planmotor med FEST | Claude | **ChatGPT – kliniske testtilfeller** | Ikke startet | – |
| P6 | Meny, søk, ruter og felles planvisning | Claude | ChatGPT (produktkontroll) | Ikke startet | – |
| P7 | Trappe ned antidepressiv | Claude | **ChatGPT – sperrende** | Ikke startet | – |
| P8 | Bytte antidepressiv | Claude | **ChatGPT – sperrende** | Ikke startet | – |
| P9 | Bytte antipsykotikum, peroralt | Claude | **ChatGPT – sperrende** | Ikke startet | – |
| P10 | Depotantipsykotika og formuleringsovergang | Claude | **ChatGPT – sperrende** | Ikke startet | – |
| P11 | Klinisk godkjenning, pilot og publisering | Claude | ChatGPT + faglig beslutningstaker ved behov | Ikke startet | – |
| P12 | Vedlikehold, revisjon og kildeskifte | Claude | ChatGPT ved klinisk endring | Ikke startet | – |

**Avhengigheter:** P1 før P2; P1 og rettighetsavklaring før P3; P3 før faglig sluttgodkjenning av P4; P4 og P5 før P7–P10; P6 før brukerrettet pilot; P7–P10 kan publiseres hver for seg når sine kontrollporter er bestått. P12 etableres som del av utrullingen.

## 4. Oppgaver og akseptansekriterier

### P0 – Plan og prosjektstyring

- [x] **P0.1** Avgrens de tre første verktøyene og den felles beregningsmotoren.
- [x] **P0.2** Beslutt at johannesurt utelates fra sider, import og verktøy.
- [x] **P0.3** Beslutt ansvarsdeling mellom Claude Code, ChatGPT og faglig beslutningstaker.

**Ferdig når:** Planen ligger på main og den kan brukes som referanse ved neste PR.

### P1 – Fullstendig virkestoff- og formuleringskartlegging

- [x] **P1.1** Les aktuelle tabeller på https://psychiatrienet.nl/switchtabel på nytt. Lag en maskinlesbar oversikt over samtlige rad-/kolonneidentiteter og navn, også grupper og formuleringer.
- [x] **P1.2** Oversett/kontroller norske virkestoffnavn mot autoritative norske kilder, særlig FEST, og registrer engelske navn som søkealiaser. Identifiser usikre navn for faglig avklaring.
- [x] **P1.3** Sammenlign både stoffregisterfilen **og levende fagsidedata** i OUSFAR. Skill mellom allerede eksisterende fagside, uregistrert stoff og et stoff uten norsk markedsført preparat.
- [x] **P1.4** Opprett en versjonert koblingstabell: kilde-ID/navn → OUSFAR-stoffnøkkel → FEST-virkestoff-ID(er) → tilgjengelige formuleringer; kontroller salter/estere, moderstoffer og spesialtilfeller.
- [x] **P1.5** For antipsykotika: dokumenter alle medlemmer av «Partial agonist» og «Rest AP». Gruppene er **kilderegler, ikke valgbare virkestoffer**. Kartlegg egne poster for peroralt, modifisert frisetting, LA og MA; ikke anta at Psychiatrienets «ER» alltid betyr peroral depottablett.
- [x] **P1.6** Dokumenter matrisenes faktiske antall mulige, lenkede, tomme og utilgjengelige celler etter eksklusjon av johannesurt. Ikke bruk antatte totalsummer som dekningsbevis.
- [x] **P1.7** Verifiser at johannesurt ikke finnes som aktuell OUSFAR-fagside eller importmål.

**Akseptanse:** Én etterprøvbar identitetsliste uten uavklarte navnekollisjoner. Ingen gjetning basert bare på navnelikhet.

**Resultat (27.10.2026):** Kartleggingen er `src/data/verktoy/virkestoffkartlegging.json`, rapporten `docs/verktøy-p1-kartlegging.md` (laget av dataene). Øyeblikksbildene av tabellene, de 1 072 lenkede kildesidene, FEST (uttrekk 08.10.2026) og de publiserte fagsidene står i samme mappe og lages på nytt med `npm run verktoy:kartlegging`. `src/__tests__/verktoykartlegging.test.ts` kontrollerer at hver rad og kolonne er kartlagt én gang, FEST-ID-ene, fagsidene, navnekollisjoner, celletallene, depottilordningen, johannesurt og Start-kolonnen. 54 virkestoffer, 2 kildegrupper, 9 depot-/MA-varianter; 16 virkestoffer mangler fagside. Uavklart til faglig kontroll: rapportens avsnitt «Avvik og uavklarte punkter», blant annet tre Stop-lenker som ikke svarer (vortioksetin, doksepin, fenelzin), preparater som ikke er nevnt av kilden (Okedi, Paliperidon Zentiva, Niapelf), flufenazindepot med bare godkjenningsfritak, og intervallene for sentralt godkjente depotpreparater (P10.1).

### P2 – Opprette og koble nødvendige fagsider

- [ ] **P2.1** Opprett fagsider bare for virkestoffer som mangler dem; bevar eksisterende identiteter og historie.
- [ ] **P2.2** Marker nye sider uten kuratert faginnhold tydelig som ikke-kuraterte. Ikke fyll dem med oppdiktede monografidata.
- [ ] **P2.3** Legg til og kontroller FEST-koblinger med eksisterende OUSFAR-mekanisme. Kjør eksisterende referanse- og stoffregistertester.
- [ ] **P2.4** Kontroller at opprettelse og koblinger ikke endrer fortolkningsregler, referanseområder eller andre stoffers data.
- [ ] **P2.5** Dokumenter hvilke stoffer som ikke har ordinært markedsførte preparater i Norge, men likevel kan ha faglige anbefalinger.

**Akseptanse:** Alle inkluderbare virkestoffer kan velges/identifiseres, uten nye fagsider for johannesurt og uten brudd i eksisterende stoffregister.

### P3 – Kildetilfang, fullstendighet og proveniens

- [ ] **P3.1** Avklar gjenbruksrettigheter for systematisk uttrekk, lagring og eventuell videreformidling av Psychiatrienets tekster. Ved uklar eller manglende rett: lagre bare det materialet vi har rett til og bruk lenker/selvstendig formulert regelgrunnlag. Ikke omgå sperrer eller publiser beskyttet tekst.
- [ ] **P3.2** Importer tilgjengelige anbefalinger for **Combining Moodstabilizers** (retning eksisterende → tillegg). Materialet skal arkiveres/klassifiseres, ikke gi et brukerrettet kombineringverktøy i første leveranse.
- [ ] **P3.3** Importer tilgjengelige retningsbestemte antidepressivbytter og hver **Stop**-anbefaling, men ingen Start-anbefalinger og ingen celler til/fra johannesurt.
- [ ] **P3.4** Importer alle reelt tilgjengelige antipsykotikabyttinger, inkludert grupper og ulike administrasjonsformer. Skill mellom tom celle, manglende lenke, delt/felles anbefaling og særskilt anbefaling.
- [ ] **P3.5** Ta vare på kilde-URL, hentet tidspunkt med tidssone, eventuell kildeoppdatering, kildeversjon, kontrollsum, tabellkoordinater, identifikatorer og importørversjon for hver oppføring.
- [ ] **P3.6** Lag en fullstendig dekningsrapport per tabell: forventede celler, funnet lenke, vellykket hentet, eksplisitt uten lenke, feil/til kontroll og ekskludert av beslutning. Feil eller manglende datadekning skal ikke telles som «ferdig importert».
- [ ] **P3.7** Gjør importen deterministisk og repeterbar, og vis differanse mot forrige innhenting. Nytt kildeuttrekk skal aldri selv publisere nye kliniske regler.
- [ ] **P3.8** ChatGPT kontrollerer representative kilder fra hver tabell, inklusive Stop, gruppeanbefaling, utvasking, depot og én bevisst manglende celle.

**Akseptanse:** Dokumentert komplett oversikt over *tilgjengelig* kildemateriale, med eksplisitte hull og sporbar innhentingsdato. De lagrede anbefalingene er **ikke** ennå klinisk godkjente beregningsregler.

### P4 – Kildeuavhengig, faglig validert regelmodell

- [ ] **P4.1** Definer egne objekter for kildeoppføring, faglig fortolkning, versjonert regelsett, godkjenningsstatus og beregningsresultat. Et regelsett skal kunne bruke andre kilder enn Psychiatrienet senere.
- [ ] **P4.2** Støtt: prosent av **startdose**, prosent av **aktuell dose**, faste doser, intervall i dager/uker, mål-/startdose, overlapp, sekvensielt bytte, pauser/utvasking, dosegrenser, administrasjonsformer og betingelser.
- [ ] **P4.3** Skil tydelig mellom bindende krav (f.eks. nødvendig utvasking, begrenset overlapp, formulering) og veiledende preferanser (f.eks. omtrentlig prosent og ønsket trinnlengde).
- [ ] **P4.4** Klassifiser kildene som **entydig beregnbar**, **beregnbar etter eksplisitt faglig avklaring**, **bare tekstlig veiledning** eller **mangler anbefaling**. Ingen automatisk regel ved tvetydighet.
- [ ] **P4.5** Beskriv for hver foreslått generalisering hva som er kildetro og hva som er OUSFARs selvstendige faglige tilpasning. Ikke bruk samme klassifikasjon for «kildeutdrag» og «godkjent anbefaling».
- [ ] **P4.6** Vurder klinisk ulike nedtrappingsstrategier (lineær, gjentatt prosentvis, hyperbolsk/ikke-lineær) og grenser for når ekstra trinn er forsvarlige. Flere trinn er et mulig valg, ikke automatisk en forbedring.
- [ ] **P4.7** Definer minst ett lite pilotsett med ulike regelklasser og konkrete, forventede beregningseksempler. Prioriter enkel seponering, krysstapering, fast opptrapping, MAO-utvasking, gruppebasert antipsykotikabytte og depot.
- [ ] **P4.8** ChatGPT gjør uavhengig kildekontroll og stresstest av pilotreglene; uenigheter avgjøres eksplisitt før de merkes «klinisk godkjent».

**Sperrende kontrollport:** Ingen kildebasert automatisk doseplan vises klinisk før tilhørende regelversjon er godkjent og har testsaker som dokumenterer fortolkningen.

### P5 – FEST-tilpasset, deterministisk beregningsmotor

- [ ] **P5.1** Bruk den **eksisterende** nattlige FEST-synkroniseringen og «Hent nå», ikke en parallell importør. Sjekk status og dato for siste vellykkede uttrekk.
- [ ] **P5.2** Definer dosebyggesteiner per faktisk preparat, legemiddelform og styrke (inkludert enhet, saltforhold, administrasjonsvei og eventuelle dosebegrensninger).
- [ ] **P5.3** Beregn halve/fjerdedels tabletter **bare** når informasjon for akkurat dette preparatet tillater det. Uavklart deling betyr ikke delbart; ikke anta at kapsler eller modifisert frisetting kan åpnes/deles/knuses.
- [ ] **P5.4** Skill mellom markedsført/registrert preparat, godkjenningsfritak, avregistrert og midlertidig utgått. FEST er ikke sanntidsbeholdning i apotek. Manglende bekreftet norsk løsning skal vises som begrensning.
- [ ] **P5.5** Implementer ønsket faglig dosekurve **før** praktisk dosevalg. Beregn oppnåelige doser og velg en plan som først oppfyller harde sikkerhetskrav, deretter minimerer doseavvik og praktisk kompleksitet.
- [ ] **P5.6** Legg til presis avrunding, doseenheter, maksimum/minimum, trinnvarighet, ikke-negative doser, riktig håndtering av dag 1 og korrekte kalenderdatoer ved valgfri startdato. Avvik fra ønsket plan må dokumenteres.
- [ ] **P5.7** Støtt to samtidige legemiddelforløp uten å glemme utvaskingsperioder; for depot må tidspunkt og varighet håndteres som egen tidsmodell, ikke som perorale daglige doser.
- [ ] **P5.8** Mangler gyldig regel, preparat eller gjennomførbar dose: stans beregningen, oppgi grunnen og vis eventuell godkjent fagtekst; ikke gjett eller utvid en regel lydløst.
- [ ] **P5.9** Merk hver beregnet plan med kilde-/regelversjon, beregningsmotorversjon og FEST-uttrekkets dato. Like inndata og like versjoner skal gi samme resultat.
- [ ] **P5.10** Lag automatiserte enhets-, grense- og egenskapstester, særlig for prosentdefinisjoner, deling, ikke-delbare depotpreparater, manglende styrker, utvasking og runding. ChatGPT kontrollerer klinisk meningsinnhold i testtilfellene.

**Akseptanse:** Samme motor brukes i alle tre verktøy. Ingen dose kan presenteres som fysisk gjennomførbar uten et spor til konkrete, tillatte preparatbyggesteiner.

### P6 – Felles navigasjon og brukergrensesnitt

- [ ] **P6.1** Lag et verktøyregister med stabil ID, navn, søkealiaser og rute per verktøy. Det skal være enkelt å legge til senere verktøy.
- [ ] **P6.2** Bygg om sidemenyen med to tydelige valg: Verktøy og Stoffregister. Bevar eksisterende stoffregister, favoritter, tastaturflyt, Ctrl+M, tilgjengelighet og gjenoppretting etter oppdatering.
- [ ] **P6.3** Vis de tre verktøyene i verktøymenyen; ingen gruppeetiketter som «Rest AP» eller «Partial agonist» som valg for virkestoff.
- [ ] **P6.4** La søk på navn og relevante aliaser finne verktøyene som **trefftypen Verktøy**, uten å blande dem med stoff- eller preparattreff. Bevar eksisterende søkeflyt.
- [ ] **P6.5** Gi hvert verktøy en stabil, delbar adresse; navigasjon og direkte åpning skal fungere i tråd med OUSFARs eksisterende rutemodell.
- [ ] **P6.6** Del felles inndatafelter: virkestoff med autoforslag, nåværende dose, valgt formulering/preparat når nødvendig, måldose for nytt virkestoff og valgfri startdato. Legg til felter betinget av type bytte.
- [ ] **P6.7** Vis en konkret dag-/datotabell med hvert virkestoffs dose, preparatstyrke, tablettantall/-deler, relevante advarsler, antakelser, kilder og avvik fra kildens eksempel.
- [ ] **P6.8** Gjør det tydelig når planen er beregnet, når den bare er en tekstlig anbefaling, og når kombinasjonen ikke er støttet. Ingen skjult default-måldose.
- [ ] **P6.9** Støtt mobil, tastatur, skjermleser, lyst/mørkt tema og utskrift/kopiering uten å endre eksisterende fortolkningsfunksjoner. Ikke lagre pasientidentifiserende data i repo, tester eller logger.

**Akseptanse:** Verktøy kan åpnes både fra sidemeny og søk; stoffregisteret fungerer som før.

### P7 – Første brukerrettede verktøy: Trappe ned antidepressiv

- [ ] **P7.1** Bruk Stop-kildene for samtlige inkluderte antidepressiva og registrer regelstatus for hvert stoff.
- [ ] **P7.2** Inndata: valgt stoff, gjeldende dose og valgfri startdato; etterspør preparat/formulering når doseberegningen krever det.
- [ ] **P7.3** Generer dag-for-dag eller trinnvis plan helt til seponering, med konkret tilgjengelig dosebygging.
- [ ] **P7.4** Kontroller typiske og utypiske startdoser, for rask nedtrapping, små sluttdoser og manglende norske styrker.
- [ ] **P7.5** ChatGPT kontrollerer et representativt utvalg, inkludert minst én langvarig og én rask kildevariant, før klinisk publisering.

**Akseptanse:** Alle inkluderte stoffer har dokumentert status: klinisk godkjent beregning, bare fagtekst eller ikke tilgjengelig. Verktøyet skal ikke late som dekningen er større.

### P8 – Bytte antidepressiv

- [ ] **P8.1** Implementer retningsbestemt fra/til-kobling; A→B og B→A skal ikke blandes.
- [ ] **P8.2** Krev gjeldende dose og en klinisk gyldig måldose/eksplisitt bekreftet standarddose for nytt stoff, pluss nødvendig preparat/formulering.
- [ ] **P8.3** Støtt overlapp, sekvensielt bytte, utvasking, farmakokinetisk betingede særregler og valgfrie datoer.
- [ ] **P8.4** Legg inn testtilfeller for MAO-hemmere, fluoksetinrelaterte lange utvaskinger, betydelige interaksjoner og andre kombinasjoner med egne sikkerhetsvilkår.
- [ ] **P8.5** Ingen automatisk plan når kilden ikke tilbyr bytte eller det ikke finnes en klinisk godkjent generalisering.
- [ ] **P8.6** ChatGPT kontrollerer høy-risiko- og grensekombinasjoner.

**Akseptanse:** Begge virkestoffers doser og perioder er entydige; ingen utvaskings-/overlappskrav brytes av doseoptimaliseringen.

### P9 – Bytte antipsykotikum: perorale varianter

- [ ] **P9.1** Eksponer faktiske virkestoffer i søk; løs opp gruppene til hvert medlem med eksplisitt kildearv.
- [ ] **P9.2** Marker gruppeanbefaling som gruppeanbefaling. Ikke regn hvert gruppemedlem som særskilt validert før den faglige kontrollen.
- [ ] **P9.3** Støtt peroral umiddelbar/modifisert frisetting når det er en reell formulering i kildene og FEST. Ikke bytt formulering implisitt.
- [ ] **P9.4** Test krysstapering, særskilt opptrapping, farmakokinetiske overganger og kombinasjoner uten anbefaling.
- [ ] **P9.5** ChatGPT kontrollerer utvalgte individuelle og gruppebaserte regler.

**Akseptanse:** De oppførte virkestoffene gir bare de faktisk støttede kombinasjonene; ingen gruppesnarvei overstyrer særregler.

### P10 – Bytte antipsykotikum: depot og andre administrasjonsformer

- [ ] **P10.1** Kartlegg konkret preparat, formulering og intervall for relevante depotantipsykotika mot FEST og preparatomtaler.
- [ ] **P10.2** Vis tilleggsvalg **bare** når valgt virkestoff har relevant administrasjonsform, inkludert eventuelle LA-/MA-varianter.
- [ ] **P10.3** Be om siste injeksjonsdato, dose/intervall og øvrige nødvendige detaljer; håndter neste injeksjonsdato og eventuell peroral overlapp når regelen krever det.
- [ ] **P10.4** Skill depot→depot, peroral→depot og depot→peroral. Respekter at Psychiatrienet mangler flere kombinasjoner; ikke konstruer dem automatisk.
- [ ] **P10.5** Kontroller depotspesifikke regler og produktforskjeller uavhengig, inklusive mulige variasjoner innenfor samme virkestoff og intervalklasse.
- [ ] **P10.6** ChatGPT kontrollerer depotcasene før de gis status klinisk godkjent.

**Akseptanse:** Ingen preparater med ulik frigjøringsprofil eller injeksjonsintervall behandles som om de var like; manglende støtte vises eksplisitt.

### P11 – Klinisk godkjenning og kontrollert publisering

- [ ] **P11.1** Lag testmatrise: normaldose, høy/lav dose, uvanlig dose, 1/2 og 1/4 tablett, ikke-delbar tablett, manglende styrke, uregistrert preparat, utgått preparat, manglende kilde, MAO-utvasking og depotcase.
- [ ] **P11.2** Kjør relevante tester, npm test, npm run build og migrasjonskontroller for hver implementerings-PR; dokumenter eventuelle avvik. Eksisterende fortolkningsregler må forbli uendret.
- [ ] **P11.3** Få uavhengig faglig kontroll av regelendringer og kliniske testforventninger. Ingen blokkeringer eller uavklarte sikkerhetsspørsmål før publisering av den aktuelle funksjonen.
- [ ] **P11.4** Gjør begrenset faglig pilot med syntetiske kasus, ikke reelle pasientdata. Registrer og rett misvisende beregninger, uklart UI og feil ved preparatvalg.
- [ ] **P11.5** Publiser bare godkjente regelversjoner; øvrige kombinasjoner skal tydelig opplyse om begrensningen. Skill mellom «beregning tilgjengelig» og «kilde anbefaler».
- [ ] **P11.6** Dokumenter rollback/deaktivering ved kritisk feil, og etterprøv et reelt kontrollert tilbakerullingsscenario.

**Akseptanse:** Kliniske og tekniske kontrollporter er grønnmerket per funksjon, med dokumentert sporbarhet og ingen skjulte fallback-anbefalinger.

### P12 – Vedlikehold og utskifting av kunnskapsgrunnlag

- [ ] **P12.1** Etabler kontroll av kildesidenes endringer og forskjellsrapport per nytt uttrekk. Ikke automatisk overskriv godkjente regler.
- [ ] **P12.2** Legg kliniske regelversjoner og fullstendig revisjonshistorikk i et datalag uavhengig av visningen og beregningsmotoren.
- [ ] **P12.3** Lag mekanisme for å erstatte/utfylle Psychiatrienet med nye kilder uten endringer i doseberegningsmotor eller brukergrensesnitt.
- [ ] **P12.4** Nye faglige regler går samme vei: import → tydelig tolkning → tester → uavhengig kontroll → publisering.
- [ ] **P12.5** FEST oppdateres som i dag; endringer i dosebyggesteiner skal kunne varsle om at eksisterende planskisser kan bli uaktuelle ved ny beregning.
- [ ] **P12.6** Avklar senere om Combining Moodstabilizers skal få et eget brukerrettet verktøy. Ikke snikinnfør det i dette prosjektet.

**Akseptanse:** Kildeskifte og nye preparatdata kan håndteres kontrollert uten skjult endring i allerede godkjente kliniske regler.

## 5. Kliniske designbeslutninger som må protokollføres

Følgende spørsmål skal ikke avgjøres umerket i kode. Claude dokumenterer forslag og kilder; ChatGPT gjør kritisk gjennomgang; vesentlige faglige avveininger legges frem for faglig beslutningstaker.

| ID | Spørsmål | Foreløpig føring | Avgjøres senest |
| --- | --- | --- | --- |
| B1 | Hva betyr «25 % reduksjon» i hver kilde? | Skill konsekvent startdose og aktuell dose; ingen gjetning | Før P4-godkjenning |
| B2 | Skal utvidet/hyperbolsk nedtrapping være mulig? | Ja som mulig separat strategi, **ikke** som uprøvd standard eller ukritisk forlengelse av kilden | Før P7-publisering |
| B3 | Hvordan velges mellom flere oppnåelige doser? | Først sikkerhet og faglig kurve, så minimal avvik/kompleksitet | Før P5-godkjenning |
| B4 | Hvor mye kan gruppeanbefalinger generaliseres? | Arv med eksplisitt kilde og individuell faglig validering der nødvendig | Før P9 |
| B5 | Hvordan håndteres manglende norsk styrke/form? | Stopp automatisk beregning eller dokumenter validert alternativ; aldri anta tilgjengelighet | Før P5 |
| B6 | Hvordan håndteres utilstrekkelige depotdata? | Ikke beregn; vis begrunnelse og tilgjengelig godkjent fagtekst | Før P10 |
| B7 | Hvilke pasientforhold krever separat vurdering? | Motoren kan ikke utlede bl.a. komorbiditet, enzymaktivitet, etterlevelse, graviditet eller individuell tolerabilitet fra dose alene; begrens bruksområdet tydelig | Før første pilot |
| B8 | Når kan nye kilderevisjoner påvirke publiserte planer? | Aldri før ny faglig validering; knytt plan til konkrete versjoner | Før P11 |

## 6. Avvik, feil og eksempler som skal fanges

- **Ingen lenke i kildetabellen ≠ anbefalt direkte bytte.** Skal behandles som ingen tilgjengelig anbefaling.
- **«Stop»-anbefaling ≠ selvstendig godkjent optimal nedtrapping.** Vi må dokumentere eventuell norsk tilpasning.
- **En delestrek i ett produkt ≠ samme delbarhet i alle produkter med styrken.**
- **FEST-registrert ≠ på lager, og ≠ at pasienten kan skaffe preparatet.**
- **Peroral dose ≠ ekvivalent depotdose.** Depot må ha egen dose-/tidsmodell.
- **Felles gruppekilde ≠ individuell validering.**
- **Kildetolkning ≠ teknisk verifisert beregning ≠ klinisk godkjent anbefaling.**
- **Johannesurt:** automatiske tester skal slå ut hvis navn/alias, valgt virkestoff, importert anbefaling eller beregningsregel omfatter johannesurt.

## 7. Fremdriftslogg og oppdateringsrutine

Før en oppgave eller fase krysses av:

1. Claude dokumenterer leveransen med PR/commit, relevante filer, kilderevisjon og testresultat.
2. Dersom fasen har faglig kontroll: ChatGPT vurderer underlaget etter eksplisitt forespørsel; kontrollfunnet eller godkjenningen knyttes til PR-en.
3. Claude retter funn og oppdaterer både oppgaveavkryssinger, statusfeltet i tabellen og denne loggen.
4. Ferdig fase kan merkes «Ferdig» først når både akseptansekriterier og påkrevd kontroll er oppfylt.
5. Ingen oppgave skal avkrysses på bakgrunn av arbeid som bare er *planlagt* eller en hypotetisk test som ikke ble kjørt.

| Dato | Fase / oppgave | Resultat, PR/commit | Kontroll / gjenstående |
| --- | --- | --- | --- |
| 27.10.2026 | P0.1–P0.3 | Plan og ansvarsdeling fastlagt; johannesurt eksplisitt ekskludert | Ingen kildedata eller kode er importert/implementert gjennom denne planoppgaven |
| 27.10.2026 | P1.1–P1.7 | Kartlegging, øyeblikksbilder, rapport og tester, PR #279. Kilder: Psychiatrienet (revisjon 10184 / 10673 / 10641, hentet 27.10.2026), FEST-uttrekk 08.10.2026, fagsidene i produksjon 27.10.2026. `npm test` og `npm run build` grønne | Venter på ChatGPTs kontroll av utvalget og de uavklarte punktene i rapporten. Ingen fagsider, anbefalingstekster eller regler er laget |

## 8. Startoppdrag til Claude Code

**Neste arbeid er P1, ikke implementasjon av verktøyet.**

1. Les dette dokumentet, docs/legemiddeldata.md, docs/stoffregister.md, docs/faginnhold.md, docs/stoffsider-og-redigering.md og relevante nåværende filer. Bekreft faktisk tilstand – ikke anta at gammel repooversikt er oppdatert.
2. Lag den fulle matrisekartleggingen og navnelisten med norske navn, kilde-ID-er, gruppe-/formuleringsvarianter og sammenligning mot OUSFAR/FEST. Arbeid kun med syntetiske/testdata.
3. Verifiser at johannesurt er ekskludert **før** eventuelle importer eller fagsideopprettelser, og at generisk Start-kolonne ikke inkluderes.
4. Legg kartleggingen, testene, dekningsstatus og en kort rapport i én avgrenset PR. Oppdater fremdriftstabellen og avkryssede punkter.
5. Be om uavhengig gjennomgang av avvik/uklare koblinger før neste fase. Fortsett ikke med å publisere doseberegningsregler før P4-kontrollporten er passert.

**Hovedregel:** Kildetilfang og klinisk regelpublisering er to separate leveranser. Prioriter etterprøvbar faglig korrekthet over automatisk dekning.
