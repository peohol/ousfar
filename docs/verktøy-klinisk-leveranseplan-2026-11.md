# OUSFAR Verktøy – klinisk leveranseplan fra 03.11.2026

**Status:** Ny styrende arbeidsplan, ikke en klinisk godkjenning. **Mål:** brukbare, norske, interaktive psykofarmakaverktøy – ikke mer infrastruktur som mål i seg selv.

Denne planen **overstyrer prioritering og ferdigkriterier** for klinisk funksjon i `docs/verktøy-utviklingsplan.md` (P7–P10) og `docs/verktøy-omlegging-2026-11.md` (VDK), der dokumentene er forskjellige. Historiske beslutninger, gjeldende sikkerhetssperrer og tidligere faglige kontrollutfall beholdes. Planen skal ikke tolkes som tillatelse til å sette ikke-godkjente regler i produksjon.

## 1. Hvorfor vi skifter kurs

Pr. 03.11.2026 viser `docs/verktøy-vdk1-regeldekning.md` bare **1 av 23** nedtrappingsvalg, **1 av 506** antidepressivbytter og **2 av 1 122** antipsykotikabytter med en avgrenset, klinisk godkjent *beregningsregel*. Det er ikke det samme som fire fullstendige brukerforløp: vortioksetin 20 → 15 mg og sertralin → mirtazapin gir bare starten; de to depotforløpene gjelder snevre situasjoner. To ytterligere regler gir bare fagtekst. Tallene må beregnes på nytt fra gjeldende kode ved hver milepæl; de er et datert nullpunkt, ikke evige sannheter.

P1–P6 og store deler av P11–P12 har gitt fungerende kartlegging, FEST-integrasjon, regelmotor, tester, nødstopper og kildeoppfølging. De skal **gjenbrukes**. Hovedmangelen er kliniske regler, gjennomførbare norske doser, komplette planforløp og faktisk klinisk tilgjengelighet. Ikke start en ny runde med administrasjons- eller overvåkingsfunksjoner uten konkret påvist svikt.

## 2. Hva den opprinnelige bestillingen skal bli

Brukerrettet mål er **fire** verktøy, bygget på de tre opprinnelige tabellområdene hos Psychiatrienet samt «Stop»-anbefalingene:

1. **Trappe ned antidepressiv:** pasientens gjeldende behandling → et planforslag frem til seponering når en slik plan kan forsvares og gjennomføres; alternativt tydelig begrunnet grense for hva som kan planlegges.
2. **Bytte antidepressiv:** fra- og til-virkestoff, aktuelle former og doser → sammenhengende tidslinje med avslutning av gammel behandling og oppstart/opptrapping av ny innenfor godkjent omfang.
3. **Bytte antipsykotikum:** peroralt ↔ peroralt, peroralt ↔ depot og depot ↔ depot der dokumentert; preparat, formulering, injeksjonsintervall og relevante kliniske betingelser identifiseres særskilt.
4. **Kombinere stemningsstabiliserende legemidler:** bevar retningen **eksisterende legemiddel → legemiddel som legges til** fra `Combining Moodstabilizers`. Gi en nyttig, kildeforankret plan for oppstart/oppfølging der dette er faglig mulig, med interaksjons-, forsiktighets- og monitoreringspunkter. Dette **ble feilaktig skjøvet ut av den tidligere brukerrettede leveransen** og tas nå uttrykkelig inn igjen.

Ingen funksjon skal fremstilles som individuell forskrivning, diagnose eller automatisk faglig beslutning. Johannesurt forblir utelatt. Ikke importer antidepressivtabellens generelle «Start»-kolonne bare fordi ny plan opprettes; eventuell endring krever selvstendig, dokumentert faglig begrunnelse.

## 3. Hva «fungerer» betyr – bindende akseptanse

For et **ferdig klinisk forløp** skal en kliniker kunne:

- velge en reell, støttet situasjon og fylle inn de få nødvendige opplysningene på forståelig norsk;
- få en klinisk kontrollert, sammenhengende plan fra definert start til **relevant sluttmål** (seponering, fullført bytte eller stabilt/definert tilleggsregime), ikke bare ett innledende trinn uten videre løsning;
- se konkrete doser, datoer/relative intervaller, tilgjengelige norske preparater, styrker og antall enheter per dose, inkludert dokumentert deling, dråper/oppløsning eller injeksjonsregime når aktuelt;
- velge eller justere faglig tillatte intervaller/dosealternativer der det finnes dokumentert spillerom, se faktiske avvik og konsekvenser og få oppdatert, kontrollert plan;
- se kilde, faglige forutsetninger, relevante kontraindikasjoner, særtilfeller, forbehold og når ny vurdering er nødvendig;
- kopiere/skrive ut en klinisk forståelig plan uten å miste vesentlig informasjon.

**Fullstendig betyr ikke at fremtidig pasientrespons kan forutsies.** Planen kan være betinget av symptomstyrt evaluering mellom trinn, med eksplisitte stopp-/revurderingspunkter. Den er likevel ikke «fullstendig» dersom den bare slutter midt i en forventet trinnkjede, skjuler et ikke-godkjent nulltrinn eller lar neste nødvendige handling stå ubeskrevet.

**Tre forskjellige utfall skal aldri blandes:**
- **Komplett, klinisk kontrollert plan** (oppfyller punktene over for klart avgrenset pasient- og doseområde).
- **Avgrenset delplan/fagtekst** (med tydelig beskjed om hva som *ikke* er dekket, og ingen antydning om komplett bytte/seponering).
- **Ingen godkjent plan** (kort konkret grunn og eventuelt faglig kildehenvisning; aldri en improvisert beregning).

Ikke tilby tomme valg som om de er støttet. Presiser «ikke-markedsført», «godkjenningsfritak», «uten dokumentert doseringsmulighet» og «mangler vurdert regel» hver for seg. FEST viser legemiddelopplysninger, **ikke lagerstatus**.

## 4. Faglige og rettslige rammer

- **Kildebruk:** `docs/verktøy-p3-rettigheter.md` beskriver uavklart tillatelse og mulig databasevern. Undersøk om utgiveren vil gi **uttrykkelig rett til systematisk regelavledning/bruk**, ikke bare tekstlagring; dokumenter tillatelsens nøyaktige omfang før en massiv celle-for-celle-konvertering. Innhent eventuelt juridisk vurdering. Claude skal utarbeide grunnlaget og en handlingsklar forespørsel, men **ikke sende en henvendelse på Peders vegne uten fullmakt**.
- **Mens dette er uavklart:** utvikle **selvstendige** kliniske modeller basert på etterprøvbare preparatomtaler fra DMP/EMA, relevante faglige retningslinjer og primærkilder. Ikke kopier, oversett, omskriv eller rekonstruer Psychiatrienets beskyttede anbefalingstekster, og ikke omgå uavklart databasevern ved systematisk manuell transkripsjon. Behold lenker og allerede tillatte kildeidentifikatorer, ikke proprietær tekst.
- **Faglig regel før beregning:** gjenbruk felles matematiske strategier (for eksempel direkte bytte, gradvis nedtrapping, kryssnedtrapping, sekvensielt bytte/utvasking, depot-oppstart/-overgang, tillegg), men **aldri anta at en strategi passer en kombinasjon uten dokumentert vurdering** av stoff, doseområde, formulering, interaksjoner og spesielle grupper.
- **Norsk gjennomførbarhet:** benytt eksisterende FEST-integrasjon med aktuell, kontrollert datokilde. Kontroller markedsstatus, styrke, frigjøring, dokumentert delbarhet, flytende former, administrasjonsform, pakning og injeksjonsintervall mot relevante autoritative preparatopplysninger. Ikke finn på mg-doser eller tillat ugyldige tablettdelinger. Mulige alternative dosetrinn kan presenteres med eksakt prosentavvik **bare når faglig forhåndsgodkjent**.
- **Klinisk sikkerhet:** behold uavhengig godkjenning knyttet til regelinnhold/versjon, negative tester, nødstopper, ferskhetskrav og håndtering av ukjente opplysninger. Særskilt kontroll av MAO-hemmere/utvasking, fluoksetins lange eliminasjon, interaksjoner, depotregimer, organfunksjon, alder, tidligere seponeringsproblemer og dosegrenser der relevant. Det må være trygt å **avstå fra å beregne**.
- **Ingen automatisk breddetilgang:** `src/verktoy/synlighet.ts` står foreløpig på `admin`. Utvidelse til vanlige brukere krever produktaksept, relevante kliniske kontroller og dokumentert produksjonsprøve; ikke åpne menyen bare fordi nye regler er skrevet.

## 5. Milepæler og leveranser

| ID | Leveranse og prioritet | Målbar akseptanse | Status ved opprettelse |
| --- | --- | --- | --- |
| **K0** | **Nullpunkt og kliniske demonstrasjoner** | Gjenkjør faktisk dekningsrapport; identifiser hvilke eksisterende godkjente planer som er komplette kontra delplaner. Lag 8–12 konkrete, syntetiske *vanlige* eksempler fordelt på alle fire verktøy, knyttet til dokumenterte norske formuleringer og reelle kilder. Velg først de situasjonene som er gjennomførbare, dokumenter resten som åpne. | Ikke startet |
| **K1** | **Nedtrapping av antidepressiv – første nyttige leveranse** | Minst **to vanlige, klinisk godkjente og komplette** end-to-end-eksempler fra reelle norske preparater, med dokumenterte siste trinn, symptomstyrt oppfølging og negative tester. Undersøk eksisterende amitriptylin-, nortriptylin- og escitalopramutkast (VDK-3) først; legg ikke til ulovlige eller faglig uakseptable nulltrinn for å oppnå målet. | Ikke startet |
| **K2** | **Bytte antidepressiv – første nyttige leveranse** | Minst **tre vanlige, forskjellige, komplette** byttescenarier med norsk tilgjengelige formuleringer. Begynn med sertralin → mirtazapin og klinisk relevante SSRI-bytter som kildene kan støtte. Hele forløpet, inklusive videre avslutning og relevant opptrapping, må være vurdert. | Ikke startet |
| **K3** | **Bytte antipsykotikum – første nyttige leveranse** | Minst **to komplette peroral-til-peroral** og **to komplette depotrelaterte** scenarier fra dokumenterte kilder. Gjenbruk godkjente Maintena-/Xeplion-grunnlag der mulig; undersøk også risperidon → Xeplion, preparatforskjeller og depotintervaller. Ustøttede varianter stopper. | Ikke startet |
| **K4** | **Kombinere stemningsstabiliserende – gjeninnfør opprinnelig kildeområde** | Verktøyet finnes i meny/søk for admin. Minst **to klinisk kontrollerte, gjennomførbare** tilleggsscenarier med start/oppfølging/monitorering; ikke gi doseplan for en kombinasjon uten tilstrekkelig kildegrunnlag. Bevar retning og dobbelkontroller interaksjoner. | Ikke startet |
| **K5** | **Bredde, kvalitet og utrulling** | Utvid godkjent dekning systematisk per evidensbasert strategi og relevante virkestoff/formuleringer – **ikke tusen PR-er for tusen celler**. Klinisk prøvebruk, eksempler fra produksjon med syntetiske data og Peders godkjenning før åpning for andre. | Ikke startet |

**Tallene i K1–K4 er minstekrav til den første reelt nyttige leveransen, ikke et påskudd for å erklære hele tabellgrunnlaget ferdig.** Det langsiktige målet er høy og etterprøvbar dekning av relevante norske kliniske situasjoner. Kildemangel, manglende norsk preparat og uforsvarlige kombinasjoner skal være eksplisitte unntak, aldri stilltiende «ferdig».

**Leveringsrekkefølge:** K0 bør gi et kort faktagrunnlag raskt; K1–K4 kan **utredes og utvikles parallelt** så snart felles grensesnitt er avklart. Ikke vent på fullføringen av K1 før arbeid med K2–K4 begynner. Slik kan hvert verktøy få en brukbar vertikal leveranse tidlig.

## 6. Parallell Claude Code Projects-arbeidsform

Start én **koordinatortråd** som oppretter/delegerer **reelle parallelle prosjekttråder dersom Projects støtter det i denne økten**. Ikke påstå at parallelle tråder er opprettet uten faktisk opprettelse; ved manglende støtte, bruk uavhengige branches/oppgaver uten å foregi bakgrunnsarbeid. Koordinator holder én samlet oversikt og tar ansvar for integrasjon. Anbefalt ansvarsdeling:

| Spor | Oppgave | Filer/konfliktregel |
| --- | --- | --- |
| **A – koordinator** | K0, avhengigheter, fordeling, integrasjon, planens avkrysninger, PR-rekkefølge, kliniske kontrollporter | **Eier alene** denne planen, `docs/verktøy-utviklingsplan.md`, versjon/endringslogg og endelig felles register/tilgjengelighet |
| **B – kilder/rettigheter** | Dokumentert rettighetsavklaring og uavhengig kildematrise for K1–K4 | Les/analyser først; skriv egne kilde- og avklaringsnotater. Ikke endre kliniske regler |
| **C – nedtrapping** | K1, fullførte stoppforløp, godkjente norske dosetrinn og kliniske testkasus | Arbeid i egen gren og hovedsakelig egne nedtrappingsfiler/tester. Ikke endre felles motor uten avtale |
| **D – antidepressivbytter** | K2, omfang og nye kliniske regler med komplette forløp | Egen gren, egne regelmoduler og tester |
| **E – antipsykotikabytter** | K3, perorale og depotrelaterte komplette forløp | Egen gren, egne regelmoduler og tester |
| **F – kombinasjon** | K4, fagmodell for tillegg av stemningsstabiliserende og egen brukerflyt | Egen gren, ny dedikert modul; koordinator integrerer i registeret |
| **G – motor/brukerflate** | Gjenbruk og eventuelle felles nødvendige endringer i dose-/planmotor, konkrete preparatvalg, kopiering og tilgjengelighet | **Eneste skriveeier** for felles motor og delte verktøykomponenter mens arbeid pågår |
| **H – uavhengig test** | Faktiske end-to-end-tester og dekningsmåling per kasus; observerte stoppårsaker | Egne testfiler og rapporter; endrer ikke fagregler eller fabrikerer forventede doser |

**Koordineringskontrakt:** først et kort felles grensesnitt mellom motor, regler, tilgjengelighet og visning. Sporene B–F kan samtidig undersøke kilder, konkrete brukerforløp og dokumenterte regler. Hver tråd leverer til en **egen gren/PR med avgrensede filer**; ikke del arbeidsgren eller rediger fremdriftsplan/endringslogg parallelt. Koordinator integrerer i avhengighetsrekkefølge, avstemmer felles filer og kjører samlet test. Foretrekk få, **klinisk sammenhengende leveranse-PR-er** fremfor små tekniske del-PR-er. Parallelle tråder øker fart, ikke antall godkjente kliniske regler automatisk.

## 7. Kontrollporter for hver kliniske PR

- [ ] PR-en viser **hvilket konkret brukerforløp som nå fungerer** og hva som fremdeles er delvis/ikke støttet – før og etter.
- [ ] Kilde, versjon/dato, avsnitt, norsk preparat/fomulering og hver klinisk parameter er eksplisitt dokumentert. Ingen proprietær kildetekst.
- [ ] Minst ett positivt syntetisk ende-til-ende-eksempel fra start til sluttmål, og relevante negative/grenseeksempler (feil dose, form, manglende bekreftelse, interaksjon, tilgjengelighet, utgått FEST og nødstopper).
- [ ] Uavhengig **faglig kontroll fra ChatGPT** er innhentet for nøyaktig regelinnhold, avgrensning og klinisk resultat; eventuelle prinsipielle medisinske beslutninger løftes til Peder med én tydelig anbefaling og konsekvens.
- [ ] CI, bygg og relevante automatiske tester er grønne, og det er utført en reell gjennomgang av skjermbildet/planen for en vanlig norsk situasjon.
- [ ] Ingen tidligere godkjent regel faller bort ved utilsiktet nytt fingeravtrykk eller endret register.
- [ ] PR-en er merket **«Til ChatGPT-kontroll – ikke merge»** inntil ChatGPT har kontrollert siste head. **Claude skal ikke slå sammen PR-er uten denne kontrollen.**
- [ ] Koordinator oppdaterer denne ene statusoversikten ved godkjent merge og viser faktisk klinisk gevinst, ikke bare antall PR-er.

For rene tekniske endringer er klinisk substanskontroll ikke nødvendig, men ChatGPT skal fortsatt kontrollere PR-ene før merge slik prosjektet tidligere har bestemt.

## 8. Måling, prioritering og ferdigmelding

Før og etter hver milepæl rapporteres for **hvert** av de fire verktøyene:

| Måltall | Definisjon |
| --- | --- |
| **Komplette forløp** | Antall klart definerte, reelle norske valg/kliniske scenarioer som gir en end-to-end-plan innen godkjent omfang |
| **Delplan/fagtekst** | Antall som ikke dekker et helt forløp; telles aldri som komplett |
| **Godkjent regel, men blokkert i praksis** | Klinisk godkjent, men kan ikke realiseres med aktuell formulering/styrke eller av andre driftshensyn |
| **Ikke støttet** | Delt etter manglende regel/kilde, manglende norske preparater, uavklart rett og medisinsk kontraindikasjon |
| **Klinisk prøveverifisert** | Syntetisk, dokumentert kasus kjørt i faktisk app, med tilsvarende kopi/utskrift og kildehenvisning |

Bruk både full dekningsnevner (inkludert dagens 23/506/1 122) **og** en separat, faglig begrunnet liste over vanlige norske kasus. Ikke påstå en «prosent av klinisk praksis» uten bruksdata. Antall godkjente **regelversjoner alene er ikke et nytte-mål**.

**Ferdigmelding av første nyttige leveranse:** K1–K4 har oppfylt målbare, klinisk vurderte eksempler, og de er prøvd gjennom appen. **Ferdigmelding av prosjektets opprinnelige brede ambisjon:** vesentlig bredere dokumentert dekning, beslutning om rettigheter og eksplisitt oversikt over legitimt ikke-støttede kombinasjoner. Ingen av disse ferdigmeldingene kan gjøres på grunnlag av CI, kildearkiv eller PR-antall alene.

**Hvem gjør hva:** Claude Code utfører undersøkelser, kode, tester, integrasjon, kjøringer og PR-er. ChatGPT gjennomfører uavhengige kliniske kontroller og PR-kontroller **når brukeren ber om det**; den kjører ikke fortløpende i bakgrunnen. Peder trenger bare å ta stilling til reelle prinsipielle kliniske valg, rettighets-/avtalespørsmål og beslutning om åpning for ordinære brukere. Ingen nye betalte tjenester forutsettes.

## 9. Startordre

1. Koordinator: les eksisterende dokumenter og regelfiler; etabler ett kort K0-nullpunkt med konkrete normale kasus; marker utviklingsplanens foreldede «neste oppdrag» som erstattet. Ikke bruk første leveranse på en ny overvåkings-/administrasjonsløsning.
2. Start samtidig rettighets-/kildespor, K1, K2, K3, K4 og felles motor/visning/QA som uavhengige arbeidstråder, med eksplisitt fileierskap.
3. Velg den **første brukbare vertikale leveransen** for hvert verktøy og produser en klinisk sammenhengende PR så snart kilder og norske styrker er kontrollert. **Ikke vent** på at hele kildetabellen er behandlet.
4. Be om ChatGPT-kontroll på hver PR før merge. Når én leveranse er godkjent, fortsett med neste avgrensede kliniske område og oppdater dekningsmålingen.
