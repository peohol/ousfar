# OUSFAR Verktøy – klinisk leveranseplan fra 03.11.2026

> **Oppfølging 06.11.2026:** [Produktrevisjon og utbedringsplan](verktøy-produktrevisjon-2026-11.md) dokumenterer påvist avvik mellom bestilt funksjon, publisert arbeidsflyt og klinisk strategi, samt nye krav til reell brukbarhet og kortfattet visning. Denne kliniske planen beholder de bindende kravene til kilder, eksakte regelgodkjenninger og pasientsikkerhet. **Ikke anse tidligere merge-de UX-PR-er som dokumentasjon på at den opprinnelige bestillingen er oppfylt.** K5-D forblir utsatt til startporten og samlet klinisk/UX-produktkontroll er dokumentert.

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
| **K0** | **Nullpunkt og kliniske demonstrasjoner** | Gjenkjør faktisk dekningsrapport; identifiser hvilke eksisterende godkjente planer som er komplette kontra delplaner. Lag 8–12 konkrete, syntetiske *vanlige* eksempler fordelt på alle fire verktøy, knyttet til dokumenterte norske formuleringer og reelle kilder. Velg først de situasjonene som er gjennomførbare, dokumenter resten som åpne. | **Nullpunkt slått sammen 03.11.2026 (#316, §10); fremdrift føres i §10.4** |
| **K1** | **Nedtrapping av antidepressiv – første nyttige leveranse** | Minst **to vanlige, klinisk godkjente og komplette** end-to-end-eksempler fra reelle norske preparater, med dokumenterte siste trinn, symptomstyrt oppfølging og negative tester. Undersøk eksisterende amitriptylin-, nortriptylin- og escitalopramutkast (VDK-3) først; legg ikke til ulovlige eller faglig uakseptable nulltrinn for å oppnå målet. | **1 av 2: escitalopram til seponering, med dråper (#323, 04.11.2026) og fra 05.11.2026 også fra tabletter (versjon 14, #330, §10.4).** Minstekravet er ikke nådd; nortriptylin, amitriptylin og sertralin mangler dokumentert metode helt ned |
| **K2** | **Bytte antidepressiv – første nyttige leveranse** | Minst **tre vanlige, forskjellige, komplette** byttescenarier med norsk tilgjengelige formuleringer. Begynn med sertralin → mirtazapin og klinisk relevante SSRI-bytter som kildene kan støtte. Hele forløpet, inklusive videre avslutning og relevant opptrapping, må være vurdert. | **Avgrenset K2-leveranse i #318: escitalopram og citalopram → sertralin klinisk godkjent av kontrolløren 05.11.2026 for nøyaktig `bytte-escitalopram-sertralin` v2 (`c0bf6c61e38c437d4c8e41d36653fe1ce3b1a9c1dfb0f9d9af603e9f7dd0289c`) og `bytte-citalopram-sertralin` v2 (`2b64ff9e383e6f9462600c4921a9dd7828ea2adc4ab404646f142ce306a57aa8`); mirtazapinbyttene stopper. 2 av minst 3 (§10.4)** |
| **K3** | **Bytte antipsykotikum – første nyttige leveranse** | Minst **to komplette peroral-til-peroral** og **to komplette depotrelaterte** scenarier fra dokumenterte kilder. Gjenbruk godkjente Maintena-/Xeplion-grunnlag der mulig; undersøk også risperidon → Xeplion, preparatforskjeller og depotintervaller. Ustøttede varianter stopper. | **Avgrenset første leveranse 04.11.2026 (#320, §10.4); minstekravet er nådd etter QA-tellingen (#321: peroral 2 av 2, depot 2 av 2)** |
| **K4** | **Kombinere stemningsstabiliserende – gjeninnfør opprinnelig kildeområde** | Verktøyet finnes i meny/søk for admin. Minst **to klinisk kontrollerte, gjennomførbare** tilleggsscenarier med start/oppfølging/monitorering; ikke gi doseplan for en kombinasjon uten tilstrekkelig kildegrunnlag. Bevar retning og dobbelkontroller interaksjoner. | **Første leveranse slått sammen 04.11.2026 (#322): to komplette, klinisk godkjente tilleggsforløp (§10.4). Minstekravet er nådd; verktøyet er fortsatt bare for administratorer** |
| **K5** | **Bredde, kvalitet og utrulling** | Utvid godkjent dekning systematisk per evidensbasert strategi og relevante virkestoff/formuleringer – **ikke tusen PR-er for tusen celler**. Klinisk prøvebruk, eksempler fra produksjon med syntetiske data og Peders godkjenning før åpning for andre. | **Neste fase, ikke startet:** K5-D, dosefleksible og komplette forløp ([egen plan](verktøy-k5-dosefleksible-forlop.md), Peders bestilling 05.11.2026). Starter først når startporten er dokumentert oppfylt (§10.5) |

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
- [ ] Kilde, versjon/dato, avsnitt, norsk preparat/formulering og hver klinisk parameter er eksplisitt dokumentert. Ingen proprietær kildetekst.
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

## 10. K0-nullpunkt 03.11.2026

Dekningsrapporten er kjørt på nytt fra main (`npm run verktoy:regler -- regeldekning`, 1.124.4) og er uendret: `docs/verktøy-vdk1-regeldekning.md` gjelder. Preparatene under er fra FEST-uttrekkene i repoet (formuleringene 08.10.2026, pilotsettet 30.10.2026), bare markedsførte preparater uten godkjenningsfritak. Hver tråd kontrollerer mot ferskt FEST før en regel sendes til kontroll. Ingen regel, godkjenning, sperre eller synlighet er endret i K0.

### 10.1 Måltall per verktøy ved nullpunktet 03.11.2026 (§8)

Tabellen er utgangspunktet og oppdateres ikke; dagens tall står i §10.4.

| Måltall | Trappe ned antidepressiv | Bytte antidepressiv | Bytte antipsykotikum | Kombinere stemningsstabiliserende |
| --- | --- | --- | --- | --- |
| Full nevner | 23 | 506 | 1 122 | 110 ordnede par (11 virkestoffer); verktøyet finnes ikke |
| **Komplette forløp** | **0** | **0** | **2, begge i snevert omfang:** aripiprazol tablett → Abilify Maintena 400 mg (v3) og peroral paliperidon → Xeplion (v3) går fra start til fast månedlig vedlikehold | **0** |
| Delplan/fagtekst | 3: vortioksetin bare 20 → 15 mg (v12); bupropion (v5) og agomelatin (v1) bare fagtekst | 1: sertralin → mirtazapin bare startforløpet (v10), uten 25 → 0 og opptrapping av mirtazapin | 0 | 0 |
| Godkjent, men begrenset i praksis | 0 | 0 | 1: Xeplion v3 forutsetter peroral paliperidon, som i Norge bare finnes på godkjenningsfritak (Invega) | 0 |
| Ikke støttet: regel finnes, ikke godkjent | 7 beregnbare, 6 fagtekst | 1 (fluoksetin → fenelzin) | 1 (olanzapin → kvetiapin) | 0 |
| Ikke støttet: ingen regel, rettighet uavklart (kilden har anbefaling) | 0 | 504 | 892 | 110 |
| Ikke støttet: ingen regel, kilden har ingen | 0 | 0 | 161 | 0 |
| Ikke støttet: preparat eller kilde mangler | 7 | 0 | 66 (middels langtidsvirkende injeksjon) | 0 |
| Klinisk prøveverifisert (§8) | 0 | 0 | 0 | 0 |

Om de to depotforløpene skal telle som K3-scenarier, avgjøres i K3-kontrollen mot §3; anbefalingen er at Maintena teller, mens Xeplion først blir praktisk nyttig med risperidon som start (K0-10).

### 10.2 Vanlige brukerforløp – første leveranser

Kolonnene «I dag» og «Kjent hindring» viser status ved nullpunktet og, der en godkjent PR er slått sammen, status nå (§10.4). Syntetiske, vanlige situasjoner for voksne 18–64 år uten tidligere seponeringsplager, kjente interaksjoner eller nedsatt organfunksjon, med mindre annet står. Sluttmålet er det planen skal nå for å telle som komplett (§3). Kildene er id-er i `src/verktoy/regler/kilder.ts`; «ny kilde» betyr at preparatomtalen må legges til registeret med kontrollsum før regelen skrives. Doser i kolonnen «Situasjon» er utgangspunktet klinikeren oppgir, ikke anbefalinger.

| ID | Verktøy | Situasjon | Norske formuleringer (FEST) | Sluttmål | Grunnlag i repoet | I dag | Kjent hindring |
| --- | --- | --- | --- | --- | --- | --- | --- |
| K0-01 | Trappe ned | Escitalopram 10 mg tablett, kort behandlingstid | Tablett 5, 10, 20 mg; dråper 20 mg/ml (1 mg per dråpe dokumentert) | Seponert, med symptomstyrt vurdering mellom trinn | `seponering-escitalopram` v12 (VDK-3 forslag 1); `rcpsych-stopping`, `nice-ng222`, `dmp-cipralex` | Ingen plan ved nullpunktet. Fra 04.11 (#323, v13): komplett når forskriveren velger Cipralex dråper. Fra 05.11 (#330, v14): **komplett også med tablett valgt**; planen går over til dråper fra første reduksjon | Ved nullpunktet: tablett 10 mg utenfor kontrollert omfang (F1-21), dråpekjeden sluttet på 3 mg, og overgang tablett → dråper var ikke vurdert. Nå: verktøyet gjør overgangen mg for mg selv (v14). Lang behandlingstid, tidligere seponeringsplager og 65 år eller eldre stopper |
| K0-02 | Trappe ned | Sertralin 100 mg tablett, kort behandlingstid | Tablett 25, 50, 100 mg; konsentrat 20 mg/ml er sperret uten dokumentert oppmåling | Seponert | `seponering-sertralin` v12; `rcpsych-stopping`, `dmp-zoloft` | Ingen plan | Høyst 25 % gir bare 100 → 75 mg; siste trinn 25 → 0 |
| K0-03 | Trappe ned | Amitriptylin 25 mg tablett, lav dose, kort behandlingstid | Tablett 10, 25, 50 mg (mikstur bare på fritak) | Seponert | `seponering-amitriptylin` v12 (VDK-3 forslag 1); `dmp-sarotex` | Ingen plan | 25 mg er innenfor det kontrollerte omfanget, men kjeden stopper etter 25 → 20 mg (F1-03); siste trinn til 0 er ikke vurdert |
| K0-04 | Bytte AD | Sertralin 100 mg → mirtazapin | Sertralin tablett 25, 50, 100 mg; mirtazapin tablett og smeltetablett 15, 30, 45 mg | Sertralin seponert og mirtazapin på måldose | `kryssnedtrapping-sertralin-mirtazapin` v10 (startforløpet godkjent); `bytte-sertralin-mirtazapin` v1 (#318); `keks-2016`, `dmp-zoloft`, `dmp-remeron` | Delplan ved nullpunktet; fra 03.11 (#319) «Komplett plan ikke tilgjengelig». Uendret i #318 | Ved nullpunktet: videre 25 → 0 og opptrapping av mirtazapin var ikke vurdert. Nå: komplett kryssnedtrapping er skrevet (#318), men siste trinn fra 25 mg er ikke avgjort faglig (mirtazapin hemmer ikke SERT, K2-3 er ikke godkjent), så planen stopper. v10 trekkes atomisk når regelen en gang godkjennes |
| K0-05 | Bytte AD | Escitalopram 20 mg → mirtazapin | Som K0-01 og K0-04 | Som K0-04 | VDK-2 forslag 5; `bytte-escitalopram-mirtazapin` v1 (#318); `keks-2016`, `dmp-cipralex`, `dmp-remeron` | Ingen regel ved nullpunktet. I #318: regel skrevet, planen stopper | Ved nullpunktet: ny regel etter sertralinmønsteret. Nå: som K0-04, siste trinn fra 5 mg er ikke avgjort |
| K0-06 | Bytte AD | Escitalopram 20 mg → sertralin (SSRI til SSRI) | Som K0-01 og K0-02 | Escitalopram seponert og sertralin på måldose | `bytte-escitalopram-sertralin` v2 (#318); `keks-2016`, `nice-ng222`, `rcpsych-stopping`, `sorensen-2022`, `dmp-cipralex`, `dmp-zoloft` | Ingen regel ved nullpunktet. I #318: komplett forløp, klinisk godkjent av kontrolløren 05.11 for nøyaktig v2 og fingeravtrykket: escitalopram 10 mg dag 1–14 og 5 mg dag 15–28, sertralin 50 mg fra dag 29 (direkte overgang dagen etter siste dose), 100 mg fra dag 43 hvis valgt, etter vurdering av effekt, toleranse og seponeringssymptomer | Ved nullpunktet: strategien var ikke vurdert. Nå: direkte overgang er valgt for et snevert omfang (voksne med depresjon, høyst åtte ukers sammenhengende bruk, ingen tidligere seponeringsplager eller kompliserende interaksjoner); alt annet stopper. Klinisk godkjent av kontrolløren 05.11.2026 (PR #318, kommentar 6649961365) bare i dette omfanget |
| K0-07 | Bytte AP, peroralt | Olanzapin 10 mg tablett → aripiprazol tablett | Olanzapin tablett 2,5–10 mg og smeltetablett 5–20 mg; aripiprazol tablett 5, 10, 15, 30 mg | Olanzapin seponert og aripiprazol på måldose | `keks-2019`, `ema-abilify`; ny kilde: preparatomtale for olanzapin | Ingen regel ved nullpunktet. Fra 04.11 (#320, v8): **komplett kryss-titrering fra olanzapin 20 mg** (20 → 15 → 10 → 5 → 0 mg, 14 dager per trinn, seponert dag 71) til aripiprazol 10 eller 15 mg. Med olanzapin 10 mg som i situasjonen stopper planen | Ved nullpunktet: ny regel og kilde. Nå: bare kildens eksempel fra 20 mg (TARC 2018) er godkjent; andre startdoser, inkludert 10 mg, gjentatte tilbakefall, innlagte, 65 år eller eldre, tidligere seponeringsplager og sterke CYP-interaksjoner stopper |
| K0-08 | Bytte AP, peroralt | Risperidon 4 mg tablett → aripiprazol tablett | Risperidon tablett 0,5–4 mg og mikstur 1 mg/ml; aripiprazol som K0-07 | Risperidon seponert og aripiprazol på måldose | `keks-2019`, `ema-abilify`; ny kilde: preparatomtale for risperidon | Ingen regel ved nullpunktet. Fra 04.11 (#320, v8): **komplett kryss-titrering fra risperidon 4 mg** (4 → 3 → 2 → 1 → 0 mg, 14 dager per trinn, seponert dag 71) til aripiprazol 10 eller 15 mg | Ved nullpunktet: ny regel og kilde. Nå: bare kildens eksempel fra 4 mg (TARC 2018) er godkjent; andre startdoser og de samme pasientgruppene som i K0-07 stopper |
| K0-09 | Bytte AP, depot | Aripiprazol 15 mg tablett → Abilify Maintena | Tablett som K0-07; Maintena 400 mg (månedlig), 720 og 960 mg (annenhver måned) | Fast månedlig injeksjon, tabletter seponert | `depot-aripiprazol-maintena` v3; `ema-abilify-maintena` | **Komplett i snevert omfang** | To-injeksjonsstart og 720/960 mg er ikke støttet (VDK-2 forslag 4 og 9) |
| K0-10 | Bytte AP, depot | Risperidon 4 mg tablett → paliperidonpalmitat månedlig (Xeplion eller generisk) | Risperidon som K0-08; paliperidonpalmitat 50–150 mg (Xeplion, Palmeux og Paliperidon Zentiva; 25 mg bare på fritak) | Fast månedlig injeksjon, tabletter seponert | `depot-paliperidon-xeplion` v3 (starter fra paliperidon); VDK-2 forslag 3; `ema-xeplion` | Ingen regel ved nullpunktet. Fra 04.11 (#320, v8): **komplett fra risperidon 3 mg** til Xeplion 150 mg dag 1 og 100 mg dag 8 i deltoideus, så 75 mg månedlig, med vurdering før hver injeksjon. Med risperidon 4 mg som i situasjonen stopper planen | Ved nullpunktet: måldosen fra risperidon (ingen tabell i preparatomtalen). Nå: bare 3 mg → 75 mg, der preparatomtalen og Russu 2018 er enige, er godkjent; 4 mg og andre doser stopper. Bare Xeplion (ikke Palmeux eller Paliperidon Zentiva); manglende bekreftet effekt og toleranse, overvekt, nedsatt nyrefunksjon, over 65 år og interaksjoner stopper |
| K0-11 | Kombinere | Står på litium, lamotrigin legges til | Litium depottablett (42 og 83 mg); lamotrigin tyggetablett/dispergerbar tablett 2–200 mg (vanlige tabletter bare på fritak) | Lamotrigin på vedlikeholdsdose etter opptrapping, litium uendret, oppfølgingspunkter beskrevet | Ny kilde: preparatomtalene for lamotrigin og litium | Verktøyet fantes ikke ved nullpunktet. Fra 04.11 (#322): **komplett**, bare med Lithionit 42 mg | Ved nullpunktet: verktøy, tilleggsstrategi i motoren og kilder. Nå: Lithionit 83 mg og andre litiumpreparater stopper eksplisitt |
| K0-12 | Kombinere | Står på valproat, lamotrigin legges til | Valproat enterotablett, depottablett, depotkapsel, depotgranulat og mikstur; lamotrigin som K0-11 | Som K0-11, med valproat uendret | Ny kilde: preparatomtalene for lamotrigin og valproat | Verktøyet fantes ikke ved nullpunktet. Fra 04.11 (#322): **komplett** | Ved nullpunktet: egen opptrapping ved samtidig valproat, og valproat hos jenter og kvinner som kan bli gravide som eget stoppunkt. Nå: begge er løst i regelen (#322); andre styrker, formuleringer og kombinasjoner stopper |

**Neste konkrete leveranser (nullpunktsplan 03.11, historisk):** K1 tar K0-01 og K0-03 først (kontrollerte, ikke godkjente regelutkast finnes, men omfanget må utvides og vurderes på nytt for å nå 0), deretter K0-02. K2 fullfører K0-04 og tar K0-05 og K0-06. K3 tar K0-09 (vurder om det allerede teller), K0-10 og K0-07, og velger K0-08 eller olanzapin → kvetiapin. K4 tar K0-11 og K0-12 etter at motoren støtter tillegg.

**Gjenstående første leveranser etter §10.4 (05.11.2026):** K1 mangler ett virkestoff til; sertralin (K0-02) og amitriptylin (K0-03) mangler dokumentert metode helt ned, mens K0-01 er komplett også fra tabletter med versjon 14 (#330). K2 har i #318 escitalopram → sertralin (K0-06) og citalopram → sertralin, klinisk godkjent av kontrolløren 05.11 for nøyaktige versjoner og fingeravtrykk (2 av minst 3); K0-04 og K0-05 (til mirtazapin) stopper fordi siste trinn ikke er avgjort, så K2 mangler ett bytte til. K3 har en avgrenset første leveranse (#320): K0-08 er komplett, mens K0-07 og K0-10 er komplette bare fra en annen startdose enn situasjonen oppgir (olanzapin 20 mg og risperidon 3 mg); minstekravet er nådd etter den separate tellingen i QA (#321: peroral 2 av 2, depot 2 av 2 med Maintena v3 og risperidon → Xeplion v8; paliperidon → Xeplion v3 telles ikke), og K0-09 er teknisk ende-til-ende-verifisert i appen. K4 har nådd minstekravet.

**Kjente vanlige situasjoner som ikke er første leveranse:** full nedtrapping av vortioksetin (bare 20 → 15 mg godkjent), venlafaksin og paroksetin (bare fagtekst; depotkapsler kan ikke deles), lang behandlingstid (10 %-trinn krever flytende form), bytter fra fluoksetin og til eller fra MAO-hemmere (egne utvaskingsregler), Risperdal Consta, Okedi og Zypadhera (VDK-2 forslag 6–8) og depot til depot (forslag 9).

### 10.3 Arbeidsdeling og integrasjon

| Spor | Eier | Skriver i |
| --- | --- | --- |
| A – koordinering (K0) | Koordinatortråden | Denne planen, `docs/verktøy-utviklingsplan.md`, `package.json`-versjon og endringslogg, merge-rekkefølge |
| B – kilder og rettigheter | Egen tråd | Egne kilde- og avklaringsnotater; nye kilder i `src/verktoy/regler/kilder.ts` etter avtale med G |
| C–F – K1–K4 | Én tråd per verktøy | Egne regelfiler og tester |
| G – motor og brukerflate | Egen tråd | Felles motor, register (`register.ts`, `regeldekning.ts`) og delte verktøykomponenter, inkludert tilleggsstrategien K4 trenger |
| H – uavhengig test | Egen tråd | Egne testfiler; tester K0-01–K0-12 i appen |

**Versjon og rekkefølge:** hver PR får versjonsnummeret sitt fra koordinatoren når den er klar til kontroll, og koordinatoren nummererer om når merge-rekkefølgen endres. Rekkefølgen er avhengighetsstyrt: G sine motorendringer før reglene som bruker dem (K4 etter tillegg i motoren), ellers den PR-en ChatGPT godkjenner først. Hver PR skriver sin egen føring i endringsloggen med det tildelte nummeret. Bare koordinatoren redigerer denne planen og utviklingsplanen, og fører faktiske leveranser her etter godkjent merge.

**Leveranse-PR-er og planlagt rekkefølge** (oppdateres av koordinatoren; alle merket «Til ChatGPT-kontroll – ikke merge»):

| Rekkefølge | PR | Spor | Versjon | Avhenger av | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | #316 | A – K0-nullpunkt | 1.124.5 | – | Slått sammen 03.11 |
| 2 | #319 | G – felles motor, delplaner sperret | 1.125.0 | – | Slått sammen 03.11 |
| 3 | #322 | F – K4, lamotrigin lagt til valproat eller litium (K0-11 og K0-12) | 1.125.1 | #319 | Slått sammen 04.11 |
| 4 | #323 | C – K1, escitalopram-dråper fra 10 eller 20 mg til seponering (K0-01 når dråper velges; med tablett valgt og for K0-03 amitriptylin stopper planen fortsatt) | 1.125.2 | #322 | Slått sammen 04.11 |
| 5 | #325 | A – K0, fremdrift ført etter merge (denne planen) | 1.125.3 | #323 | Slått sammen 04.11 |
| 6 | #324 | G – motor: gammel regel trekkes atomisk når ny godkjennes | 1.125.4 | – | Slått sammen 04.11 |
| 7 | #320 | E – K3, sju bytteregler (K0-07, K0-08 og K0-10) | 1.125.5 | #319 | Slått sammen 04.11 (3 av 7 regler klinisk godkjent) |
| 8 | #318 | D – K2, fem bytteregler (K0-04–K0-06) | 1.125.6 | #324 | Slått sammen 05.11 som avgrenset K2-leveranse: `bytte-escitalopram-sertralin` v2 (`c0bf6c61e38c437d4c8e41d36653fe1ce3b1a9c1dfb0f9d9af603e9f7dd0289c`) og `bytte-citalopram-sertralin` v2 (`2b64ff9e383e6f9462600c4921a9dd7828ea2adc4ab404646f142ce306a57aa8`) klinisk godkjent; mirtazapinreglene stopper |
| 9 | #321 | H – testkasus K0-01–K0-12 og kontroll i den publiserte appen | 1.125.7 | alle over (rapporten lages på nytt sist) | Slått sammen 05.11 |
| 10 | #326 | Brukervennlighet – plan for enklere verktøy ([plan](verktøy-brukervennlighet-2026-11.md)) | 1.125.8 | #321 | Slått sammen 05.11 |
| 11 | #328 | Brukervennlighet D – før-måling og sikkerhetsinvarianter S1–S9 | 1.125.9 | #321 (gjenbruker QA-kontrollene) | Slått sammen 05.11 |
| 12 | #327 | Brukervennlighet B1 – stoppkoder, formovergang og praktisk dosering i motoren | 1.125.10 | #328 | Slått sammen 05.11; ingen regel endret |
| 13 | #329 | Brukervennlighet C1 – spørsmålskatalog og forhåndskontroll | 1.125.11 | – | Slått sammen 05.11 |
| 14 | #330 | Brukervennlighet B2 – escitalopram v14, tabletter og dråper i samme nedtrapping | 1.125.12 | #327 | Slått sammen 05.11; v14 klinisk godkjent og erstatter v13 (§10.4) |
| 15 | #331 | Brukervennlighet A1 – felles firestegsflyt og planen som tidslinje | 1.126.1 | #329, #330 og #334 | Slått sammen 06.11; ingen regel endret |
| 16 | denne | A – K0, K5-D registrert som neste fase; startporten kontrolleres før merge | 1.126.2 | alle over | Til kontroll; slås sammen sist |

#334 (THC-syre, 1.126.0) hører ikke til denne planen, men ble slått sammen 05.11.2026 før #331 etter Peders prioritering og tok derfor versjonen før A1.

Rekkefølgen ble endret 04.11.2026 slik at PR-ene som er nærmest godkjent, slås sammen først. Godkjenner ChatGPT i en annen rekkefølge, nummererer koordinatoren om de uavhengige PR-ene; PR-er som avhenger av #319, merges etter den.

### 10.4 Fremdrift etter godkjent merge

Føres av koordinatoren bare når en PR er slått sammen etter ChatGPTs kontroll. En godkjenning i en åpen PR teller ikke før den er på main.

| Dato | PR | Hva administratorene kan nå | Teller mot minstekravet (§5) |
| --- | --- | --- | --- |
| 03.11.2026 | #319 | Delplaner vises aldri (Peders beslutning 03.11). Startforløpet for sertralin → mirtazapin (v10) og vortioksetin 20 → 15 mg (v12) er trukket fra appen; verktøyene viser i stedet «Komplett plan ikke tilgjengelig» med grunnen. «Kan beregnes nå» viser bare valg som kan gi komplett plan. | – |
| 04.11.2026 | #322 | Verktøyet «Kombinere stemningsstabiliserende» gir komplett plan for lamotrigin lagt til uendret Lithionit 42 mg (til 200 mg/dag fra dag 36) og lagt til uendret natriumvalproat (til 100 mg/dag fra dag 36), begge med Lamictal dispergerbare tabletter etter tabell 3 i preparatomtalen. Måldosen må velges. For valproat bekreftes vilkårene i det graviditetsforebyggende programmet hver for seg. Andre preparater, styrker og kombinasjoner stopper. | K4: 2 av 2 |
| 04.11.2026 | #323 | «Trappe ned antidepressiv» gir komplett plan for Cipralex dråper 20 mg/ml (1 mg per dråpe) fra 10 eller 20 mg til seponering, ett virkestoff med to startdoser: høyst 25 % per trinn ned til 3 mg, så 2 og 1 mg, der 1 mg holdes et helt trinn før seponering, med vurdering før hver endring og 7, 14 og 28 dager etter siste dose. Overgang fra tablett til dråper mg for mg er faglig akseptert, men forskriveren må selv velge dråper; med tablett valgt stopper planen. Bare voksne under 65 år med kort behandlingstid og uten tidligere seponeringsplager (Peders avgjørelse om 1 mg → 0, 04.11), uten nedsatt leverfunksjon, kjent langsom CYP2C19 eller QT-kontraindikasjon. Alle andre, nortriptylin, amitriptylin og sertralin får «Komplett plan ikke tilgjengelig». | K1: 1 av 2 |
| 04.11.2026 | #320 | «Bytte antipsykotikum» gir komplett plan for tre bytter, hver bare for stabile voksne med schizofreni: risperidon 3 mg tablett → Xeplion 150 mg dag 1 og 100 mg dag 8 i deltoideus, så 75 mg månedlig, med bekreftet effekt og toleranse av dagens dose og vurdering før hver injeksjon; og langsom kryss-titrering til aripiprazol 10 eller 15 mg (5 mg uke 1, 10 mg uke 2) fra olanzapin 20 mg (20 → 15 → 10 → 5 → 0 mg) eller fra risperidon 4 mg (4 → 3 → 2 → 1 → 0 mg), 14 dager per trinn og seponert dag 71, med vurdering før hver endring, før siste trinn og 14 dager etter seponeringen. Andre startdoser og måldoser stopper, og det samme gjør overvekt, nedsatt nyrefunksjon og alder over 65 år (Xeplion), 65 år eller eldre, gjentatte tilbakefall, innleggelse og tidligere seponeringsplager (aripiprazol) og kjente interaksjoner. De fire andre bytteutkastene (Risperdal Consta → Xeplion, aripiprazol → olanzapin og → risperidon, kariprazin → kvetiapin) står til faglig kontroll og gir ingen plan. | K3 peroral: 2 ulike forløp; K3 depot: risperidon → Xeplion i tillegg til Maintena v3. Om minstekravet er nådd, avgjøres etter separat telling i QA (#321) |
| 05.11.2026 | #318 | «Bytte antidepressiv» gir komplett plan for to bytter til sertralin, klinisk godkjent av kontrolløren 05.11.2026 for nøyaktig sin versjon og sitt fingeravtrykk, hver bare for voksne 18–65 år med depresjon, høyst åtte ukers sammenhengende bruk (OUSFARs egen pilotgrense, ikke en kildeverdi; «Trappe ned» er uendret), uten tidligere seponeringsplager, kompliserende interaksjoner eller nedsatt leverfunksjon og med de dokumenterte norske tablettene: escitalopram 10 eller 20 mg og citalopram 20 eller 40 mg halveres hver 14. dag ned til 5 eller 10 mg, som holdes i 14 dager, og sertralin 50 mg startes dagen etter siste dose (direkte overgang). Har forskriveren valgt 100 mg, økes sertralin tidligst etter 14 dager, når effekt og behov, toleranse og seponeringssymptomer er vurdert. Vurdering før hver endring, en uke etter overgangen og fire uker etter oppstarten og hver doseendring av sertralin. Sertralin ventes å holde SERT-hemmingen oppe, men det er ingen garanti mot seponeringssymptomer. De tre byttene til mirtazapin (fra sertralin, escitalopram og citalopram) stopper med «Komplett plan ikke tilgjengelig», fordi siste trinn ikke er avgjort; startforløpet sertralin → mirtazapin (v10) vises fortsatt ikke. | K2: 2 av minst 3 |
| 05.11.2026 | #321 | Ingen endring i hva verktøyene kan. Uavhengig QA (spor H) fra integrert main etter #318: 60 syntetiske brukerforløp (K0-01–K0-12 og H-01–H-48) gir samme resultat lokalt og i den publiserte appen (1.125.6, 57 prøvd i appen, 3 bare lokalt fordi de endrer FEST), uten avvik og uten delplan som doseplan. 15 planer er teknisk ende-til-ende-verifisert i appen (kopien lik linje for linje og tidslinjen lik kopien), blant dem K0-06, K0-08, K0-09, K0-11 og K0-12; det er ikke klinisk prøveverifisering. K0-01 med tablett gir fortsatt ingen plan; med dråper valgt (H-39) gir den komplett plan. Rapporter: `docs/verktøy-qa-brukerforlop.md` og `docs/verktøy-qa-appkontroll.md`. | Talt i ulike godkjente regler: K1 1 av 2; K2 2 av 3; K3 peroral → peroral 2 av 2 (olanzapin og risperidon → aripiprazol); K3 depot 2 av 2 (Maintena v3 og risperidon → Xeplion v8), mens paliperidon → Xeplion v3 telles ikke fordi peroral paliperidon bare finnes med godkjenningsfritak; K4 2 av 2 |
| 05.11.2026 | #326 | Ingen endring i hva verktøyene kan. Plan for enklere verktøy ([plan](verktøy-brukervennlighet-2026-11.md)) er vedtatt. | – |
| 05.11.2026 | #328 | Ingen endring i hva verktøyene kan. Før-måling av dagens arbeidsflyt og automatiske sikkerhetskontroller S1–S9 som skal hindre at forenklingen endrer godkjente planer, viser delplaner, gir plan på et ubesvart spørsmål eller svekker nødstopp, FEST-kontroll og kopi. | – |
| 05.11.2026 | #327 | Ingen endring i hva verktøyene kan og ingen regel endret. Motoren kan beskrive en dokumentert overgang mellom legemiddelformer og foretrekke praktiske doser, og hver stoppgrunn har fått en fast kode. | – |
| 05.11.2026 | #329 | Ingen endring i hva verktøyene kan og ingen regel endret. Grunnlag for spørsmål i vanlig språk med «Ja», «Nei» og «Ukjent» («Ukjent» gir aldri plan) og en forhåndskontroll som sier tidlig hvorfor en komplett plan ikke kan lages. | – |
| 05.11.2026 | #330 | «Trappe ned antidepressiv» gir komplett plan for escitalopram også når pasienten bruker Cipralex tabletter 10 eller 20 mg. Versjon 14 av nedtrappingen er klinisk godkjent av kontrolløren 05.11.2026 (PR #330, kommentar 6665304397) for nøyaktig sin versjon og fingeravtrykket `01b2fb560a8defe0114f9552d619bc6bf15e27b07fa6352d6331d9beb500721f`, og erstatter versjon 13. Fra 20 mg gis første trinn (15 mg) som én tablett à 10 mg og én à 5 mg, så dråper mg for mg: 12, 9, 7, 6, 5, 4, 3, 2 og 1 mg før seponering; fra 10 mg gis dråper fra første reduksjon: 8, 6, 5, 4, 3, 2 og 1 mg. Den samme dosen gis aldri som tabletter og dråper samtidig. Med dråper som startform er planen den samme som i versjon 13. Omfanget er det samme som i #323, men spørsmålet om alder er nå «65 år eller eldre», så en pasient på nøyaktig 65 år stopper. Andre startdoser og avregistrerte styrker stopper. Verifisert uten simulering gjennom verktøysiden (`src/__tests__/verktoyb2side.test.tsx`). | K1: 1 av 2 (samme virkestoff som #323; K0-01 er nå komplett også fra tabletter) |
| 06.11.2026 | #331 | Ingen regel, dose eller godkjenning endret, og planene beregnes som før. Alle fire verktøyene har én arbeidsflyt i fire steg (hva som skal gjøres, nåværende behandling, om pasienten, planen) uten «Beregn»-knapp. Verktøyet sier så tidlig som mulig om en komplett plan kan lages, og velger legemiddelform selv når bare én kan gi komplett plan. Planen vises som tidslinje og kopieres i sin helhet. Escitalopram v14 er prøvd gjennom flyten fra tabletter og dråper (10 og 20 mg) til 0 mg, og stoppene (65 år eller eldre, lang behandlingstid, tidligere seponeringsplager, manglende FEST-styrker) virker. | – |

**Komplette forløp i appen nå:**

| Trappe ned antidepressiv | Bytte antidepressiv | Bytte antipsykotikum | Kombinere stemningsstabiliserende |
| --- | --- | --- | --- |
| 1 av minst 2 | 2 av minst 3 (escitalopram og citalopram → sertralin) | Peroral → peroral 2 av minst 2 (olanzapin 20 mg og risperidon 4 mg → aripiprazol); depot 2 av minst 2 (Maintena v3 og risperidon 3 mg → Xeplion v8). Paliperidon → Xeplion v3 krever godkjenningsfritak og telles ikke (QA, #321) | 2 av minst 2 |

Klinisk prøveverifisert (§8): 0 i alle fire verktøy. Teknisk ende-til-ende-verifisert i appen (QA, #321, 05.11.2026): 15 planer, alle komplette planer i katalogen; se `docs/verktøy-qa-appkontroll.md`. Alle verktøyene er fortsatt bare synlige for administratorer.

### 10.5 Neste fase: K5-D, dosefleksible og komplette forløp

Peder bestemte 05.11.2026 at [K5-D-planen](verktøy-k5-dosefleksible-forlop.md) skal gjennomføres når de pågående kliniske leveransene (K1–K4, QA) og arbeidet med brukervennlighet ([plan](verktøy-brukervennlighet-2026-11.md)) er ferdige. Målet er at de fire verktøyene gir komplette planer innenfor klinisk godkjente **doseområder**, ikke bare ved forhåndsdefinerte startdoser. Uavhengig klinisk godkjenning av eksakt gyldighetsområde og fingeravtrykk og kravet om komplette forløp gjelder uendret.

**K5-D er ikke startet.** Koordinatoren kontrollerer startporten (K5-D-planen §1) og fører resultatet her. Når de andre punktene er dokumentert oppfylt, lager koordinatoren det nye, daterte nullpunktet som første del av K5-D0, og det oppfyller det tredje punktet. Først da gjør koordinatoren resten av K5-D0 (prioritering) og deler arbeidet i parallelle tråder (D1 motor og QA, D2 de fire fagsporene). Ingen annen K5-D-implementering starter før alle fire punktene er oppfylt.

| Startport (K5-D-planen §1) | Status 06.11.2026 | Status 09.11.2026 |
| --- | --- | --- |
| Pågående PR-er integrert eller eksplisitt avsluttet | Oppfylles når denne PR-en er slått sammen: #318, #321 og #326–#330 er slått sammen 05.11 og #331 06.11 (§10.3); ingen er lukket uten merge | Oppfylt for de oppførte og senere PR-ene: #343–#348 er slått sammen, og ingen er lukket uten merge. Rettingen av D04-stoppet (#351) er slått sammen 10.11; denne oppdateringen av appkontrollen er det siste etterarbeidet etter P4 |
| Samlet `main` består bygg, tester, regel- og FEST-kontroll og syntetisk brukerflyt i den publiserte administrator-appen, med skjermvisning og kopi | Ikke oppfylt: kjøres på integrert `main` etter at denne PR-en er slått sammen. QA-kontrollen i appen (#321) ble gjort før arbeidsflyten ble endret (#327–#331) og må gjøres på nytt | Delvis: P4 (#348) kjørte 34 forløp lokalt og 6 i den publiserte administrator-appen (1.128.2, 08.11) med skjerm, kopi og utskrift, men D04 avvek. Rettingen endrer en stopptekst, så P4-forløpene må kjøres på nytt i den publiserte appen etter sammenslåingen. Peders korte aksepttest (P5) er heller ikke gjort; produktrevisjonen §3 P5 og §5 krever den før startporten vurderes |
| Koordinatoren har oppdatert fremdriften og laget et nytt, datert nullpunkt med gjenstående K1–K4-mangler | Ikke oppfylt: lages som første del av K5-D0 når de andre punktene er oppfylt | Ikke oppfylt: venter på de to punktene over |
| `VERKTOYENE_VISES_FOR` er fortsatt `'admin'` | Oppfylt: uendret, og K5-D endrer den ikke | Oppfylt: fortsatt `'admin'` |

**Vurdering 09.11.2026: startporten er ikke oppfylt, og K5-D (også K5-D0) starter ikke ennå.** Det som gjenstår, i rekkefølge: (1) appkontrollen slås sammen (D04-rettingen, #351, er slått sammen 10.11); (2) P4-forløpene kjøres på nytt, kort, i den publiserte administrator-appen, og D04 nevner da sikker prevensjon; (3) Peder gjør aksepttesten (P5), og vesentlige funn rettes; (4) koordinatoren lager det daterte nullpunktet, som er første del av K5-D0.
