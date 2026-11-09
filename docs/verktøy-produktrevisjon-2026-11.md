# OUSFAR – produktrevisjon og utbedring av psykofarmakaverktøyene

**Dato:** 06.11.2026  
**Status:** Styrende plan for neste utbedring og uavhengig produktaksept; IKKE klinisk godkjenning.  
**Omfang:** Trappe ned antidepressiv (K1), bytte antidepressiv (K2), bytte antipsykotikum (K3) og kombinere stemningsstabiliserende (K4).

**Formål:** Lage de interaktive, norske og faktisk anvendelige kliniske verktøyene som opprinnelig ble bestilt. En teknisk korrekt regelmotor, pene komponenter, grønn CI og en klinisk forsvarlig *enkeltstrategi* er ikke alene en levert brukerfunksjon.

**Forhold til andre planer:** Denne planen supplerer de kliniske sikkerhets- og godkjenningskravene i [klinisk leveranseplan](verktøy-klinisk-leveranseplan-2026-11.md) og [brukervennlighetsplanen](verktøy-brukervennlighet-2026-11.md). Den retter et påvist gap mellom det opprinnelige produktmålet og det som faktisk vises for klinikeren. [K5-D](verktøy-k5-dosefleksible-forlop.md) forblir utsatt til den avtalte startporten er dokumentert oppfylt, **inkludert ny samlet kontroll i publisert app**. Ikke opphev administratortilgangen uten særskilt beslutning.

## 1. Observerte problemer – ikke avskriv dem fordi testene er grønne

1. **Escitalopramnedtrapping:** Peder får ikke en plan ved normal bruk selv om det finnes snevert klinisk godkjente komplette forløp fra 10 og 20 mg med tabletter/dråper i kode og komponenttester. Dette er et **uavklart produktavvik**, ikke bevis for at godkjenningen er feil. Undersøk gjeldende publisert administrator-app med syntetiske inndata; finn nøyaktig hva som hindrer et nyttig resultat.
2. **Uforståelig spørsmål:** Et langt utsagn om tidligere seponeringsvansker bruker svarene «Gjelder/Gjelder ikke». Ved «Gjelder» får klinikeren «Da gjelder ikke regelen». Det er både språklig selvmotsigende og utilstrekkelig som forklaring.
3. **Verifisert teknisk årsak:** Escitalopram v14 og de relevante K2-reglene har ikke semantisk godkjente spørsmålskataloger i src/verktoy/flyt/katalogkontroll.ts. De får dermed reservevisningen i src/verktoy/flyt/flyt.ts, som med hensikt viser regelens gamle unntakstekst og «Gjelder/Gjelder ikke». A1 endret utforming, ikke dette innholdet.
4. **Avvik i behandlingsstrategi:** OUSFARs nåværende citalopram → sertralin-plan reduserer citalopram alene først og starter sertralin etter seponering. Dette er ikke samme type tidslinje som den samtidige overgangen i Psychiatrienets publiserte eksempel (https://psychiatrienet.nl/switchdetail/citalopram-sertraline). En sekvensiell overgang kan være et faglig mulig alternativ i gitte situasjoner, men **er ikke automatisk oppfyllelse av bestilt strategi**. Ulikheten må vurderes kritisk og eksplisitt, ikke gjemmes bak ordet «klinisk godkjent».
5. **Informasjonsstøy:** Den vanlige planen kan inkludere omfattende avsnitt med antakelser, usikkerhet, rå preparatlister, alle kontroller og gjentatte vurderingspunkter. Klinikeren og pasienten trenger først og fremst *hva som skal tas, når, hvordan, hva som skal kontrolleres, og når planen ikke gjelder*. Faglig dokumentasjon skal finnes, men ikke dominere standardvisningen eller den vanlige kopien.
6. **For smal brukbarhet:** Gjeldende godkjente K1- og K2-forløp dekker få vanlige situasjoner. At en bestemt kombinasjon gir komplett plan i test, sier ikke at verktøyet er nyttig i klinisk praksis. Ikke kall et mål «oppnådd» uten å angi nevner, klinisk relevans og faktisk produkttest.

## 2. Produktkontrakt – hva som regnes som et vellykket forløp

- Klinikeren velger et relevant legemiddel, **faktisk** startdose/form, mål og nødvendige pasientforhold.
- Så tidlig som mulig skal verktøyet fortelle om det kan tilby en *komplett klinisk godkjent plan* eller hvorfor ikke. Ingen lang runde gjennom irrelevante spørsmål før et åpenbart nei.
- Ingen plan utenfor signert regelomfang, ved nødvendig uavklart informasjon, kontraindikasjon eller utilgjengelig/uegnet norsk formulering. Skill tydelig mellom **medisinsk risiko**, **ingen godkjent modell for dette tilfellet**, **manglende norske preparater/data** og **midlertidig teknisk sperre**. Manglende støtte er ikke nødvendigvis kontraindikasjon.
- Ved støttet situasjon: hele forløpet fram til seponering, oppnådd måldose/vedlikehold eller definert tilleggsbehandling, med dato/dag, dose, legemiddel, praktisk administrasjon (tablettstyrker/deling, dråper, injeksjoner), de viktigste vurderingspunktene og kliniske sikkerhetsforbehold.
- Standardvisning og standardkopi skal være korte, tydelige og identiske når det gjelder dose, dato og administrasjon. Sporbar kilde, avgrensning, detaljerte vurderinger, usikkerhet og versjon skal være tilgjengelig i **frivillig utvidet faglig grunnlag**, eventuelt i egen utvidet kopi. Vurder hva som også må være synlig i utskrift av hensyn til pasientsikkerhet.
- Ikke forespeil en plan som ikke kommer. Ikke gi en delplan som om den er komplett.
- Produktet må oppleves som et hjelpemiddel: bare nødvendige spørsmål, kortfattede svar og minimalt med gjentatte opplysninger.

## 3. Arbeidspakker og rekkefølge

### P0 – Mål brukeropplevelsen i den faktiske appen (før ny UI-polering)

**Claude:** Reproduser gjeldende administratorflyt i publisert app, ikke bare lokal React-test. Bruk utelukkende syntetiske pasientforhold. Start med escitalopram 10 og 20 mg fra både tablett og dråper samt citalopram 20 mg → sertralin 100 mg. Følg med nøyaktig på hvilke valg som tilbys, hvilke spørsmål som faktisk vises, hvor/om det stopper og den endelige planen. Test også ett representativt godkjent K3-peroralt forløp, ett depotforløp og ett K4-tillegg.

Dokumenter per kasus: forventet strategi og sluttmål; valgte inndata; kontrollert regel/fingeravtrykk og FEST-kilde; skjerm og faktisk tekst/kopi/utskrift; antall brukerhandlinger og uavklarte felt; *første* hindring, ordlyd og kategori; utfall (full plan, korrekt forklarlig stopp, feil, teknisk blokk). Ikke bruk et syntetisk «godkjent» regelsett i stedet for appens faktiske godkjenninger.

**Leveranse:** En kort, etterprøvbar feil-/friksjonsmatrise og reproduksjon for de viktigste problemene. Finn årsaken til at Peder ikke får escitalopramplan i stedet for å gjette.

**Levert 06.11.2026:** [`verktøy-p0-rapport-2026-11.md`](verktøy-p0-rapport-2026-11.md) med matrise, årsaker, prioriterte rettelser og forslag til parallelle spor.

### P1 – Avklar hva bytteverktøyet skal anbefale, før motoren endres

**Claude (klinisk spor):** For citalopram → sertralin og minst ett annet vanlig SSRI-bytte: lag en nøytral sammenligning av bestilt funksjon, Psychiatrienets *type* overgang, gjeldende OUSFAR-strategi og uavhengige kilder (norske SPC/Felleskatalogen/DMP, NICE, aktuell faglitteratur). Vurder overlapp, interaksjoner/serotonerg toksisitet, seponering, halveringstid, behandlingstid, indikasjon og klinisk seleksjon. Hvorfor ville man velge kryssnedtrapping, direkte bytte eller sekvensiell overgang? Hva kan forsvares, og for hvem?

**ChatGPT:** Gjør uavhengig kilde- og produktformålskontroll. Faglig mulig er ikke lik opprinnelig bestilt. Endring av strategi eller godkjent dosering krever egen regelversjon, eksakt fingeravtrykk, klinisk signoff og reelle komplette FEST-/positive-/negative tester. Bevar eksisterende klinisk avgrensning inntil ny er godkjent; ikke «fikse» mismatch ved å fjerne sperrer.

**Rettigheter:** Følg docs/verktøy-p3-rettigheter.md. Psychiatrienet kan brukes som referanse for å **oppdage et strategisk avvik**, men innholdet skal ikke kopieres, oversettes eller systematisk avledes til OUSFAR uten nødvendig rettighetsavklaring. Nye regler må utledes selvstendig av lovlig tilgjengelige fagkilder. Eventuelt behov for lisens avklares særskilt.

**Leveranse:** Et dokumentert klinisk strategivalg og konkrete testforløp, før en PR med endret klinisk motor/regler åpnes.

### P2 – Erstatt reservevisningens språk og generiske stoppmeldinger

**Claude:** Kartlegg alle godkjente regler som fremdeles bruker reservevisning. Lag/oppdater spørsmålskatalogene med **entydige spørsmål** og «Ja», «Nei», «Vet ikke» der det er meningsfullt, eventuelt konkrete svaralternativer som alder eller legemiddelform. Ikke gjør bare en mekanisk ommerking av knappene: bevar motorens eksakte ja/nei-mapping, også når betingelsen er negativt formulert eller gjelder flere unntak. Knyt katalogene til regelversjon og fingeravtrykk.

Eksempel:
- Spørsmål: «Har pasienten tidligere fått seponeringssymptomer eller opplevd mislykket nedtrapping av dette legemidlet?»
- Ja: «Verktøyet har foreløpig ingen godkjent standardplan ved tidligere seponeringsvansker. Nedtrappingen må tilpasses individuelt.»
- Nei: svar registrert; videre til det som faktisk er nødvendig.
- Vet ikke/ubesvart: «Dette må avklares før en plan kan lages.»

For hvert stopp: **hvilket forhold**, **hvorfor standardplanen ikke dekker tilfellet**, og **hva klinikeren kan gjøre videre** (uten å love individuell medisinsk rådgivning). Ingen generiske «Da gjelder ikke regelen». Ingen full setning som egentlig er et komplisert utsagn som skal «gjelde».

**ChatGPT:** Semantisk kontroll av katalogenes tekst, klassifisering, mapper og stoppkonsekvens mot regelversjonens kliniske innhold før katalogavtrykk godkjennes. Godkjenning av spørsmålsformulering er aldri klinisk signoff for nye doseringsregler.

### P3 – Prioriter klinisk handling i planen, ikke tekstmengde

**Claude (UI):** Standard: kompakt tidslinje med dag/dato, medisin, dose, **nøyaktig hvordan dosen gis**, endringer og bare handlingsrelevante vurderinger og vesentlige advarsler. Lange antakelser, generelle ansvarsfraskrivelser, rå FEST-produktlister, utviklingsnotater og detaljert kilde-/usikkerhetsdrøfting vises ved behov. Fjern duplisert informasjon, ikke medisinsk nødvendig informasjon. Korte kliniker-/journalvennlige kopier; utvidet fullkopi/grundig grunnlag er et bevisst valg.

Test faktisk skjerm på mobil og PC, tastatur, skjermleser, utskrift og utklippstavle. Forkort ikke doser eller sikkerhetssignaler bare for å gjøre skjermen pen.

### P4 – Uavhengig test av faktisk produkt, ikke bare kodens interne konsistens

**Claude (QA):** Utvid datasettet med klinisk uavhengig fasit for *strategi*, endelig mål og hvert tids-/dosepunkt, ikke bare «motor = kopiert tekst». Kjør representative støttede og ikke-støttede kasus fra P0 gjennom publisert administrator-app med nettleser og faktisk signert regelsett, og sammenlign skjerm, kopi og utskrift mot klinisk kontrollgrunnlag.

Minimum: K1 10/20 mg escitalopram i to startformer samt unntak for tidligere plager, behandlingstid, alder og manglende FEST; K2 citalopram → sertralin med eksplisitt strategisammenligning og forsvarlige risikokasus; minst ett komplett peroralt K3, ett relevant depot-K3 og ett K4-tillegg; negative tester for sperrer og endret/ugyldig FEST. For scenarier som ikke kan godkjennes, forventes et **riktig forklart stopp**, aldri en improvisert plan.

Kjør regelkontroll, enhet/integrasjon, bygg, GH CI, Playwright/nettleser og faktisk kopiering og utskrift. Skille bevis fra local/test doubles, publisert app og klinisk substanskontroll. Registrer dato, appversjon, SHA, regel-fingeravtrykk og FEST-dato i rapporten. Ingen reelle pasientopplysninger.

### P5 – Kort, reell brukertest og leveranseavgjørelse

Før Peder involveres, skal Claude og ChatGPT ha dokumentert at testkasusene virker. Peder får **to–fire konkrete, realistiske oppgaver**, uten forklaring på hvordan man skal «lure» verktøyet til å gi plan. Registrer feil og unødig tids-/tekstbruk. Endre ved vesentlige funn, og prøv på nytt. Godkjenn ikke en arbeidsflyt som bare blir forståelig med utviklerens veiledning.

**Utgangsport:** Ingen vesentlige kliniske strategiavvik eller sikkerhetsfeil; relevante positive komplette forløp og korrekte negative stopp på deployert app; klar og kort standardplan/kopi; tekstene forstås uten kodekunnskap; dokumentert klinisk gyldighetsområde og norsk FEST. Små demomål er ikke det samme som bred nasjonal klinisk dekning. Først deretter revurderes K5-D-startport og, **separat**, åpning fra 'admin' til ordinære klinikere.

## 4. Arbeidsdeling, PR-er og godkjenning

- **Claude Code:** implementering, reproduksjon, kildekartlegging, egenkontroll, skjerm-/kopi-/utskriftstester og konkrete PR-er. Parallelle tråder for uavhengig klinisk kildearbeid, UI og QA, men endringer i felles klinisk regelmotor koordineres.
- **ChatGPT:** uavhengig PR-kontroll etter [fast standard](chatgpt-pr-kontrollstandard.md): spør alltid både «Virker dette?» og «Er dette produktet vi skulle lage?». Les underliggende fagkilder selv der klinisk betydning står på spill. Se spesifikt etter friksjon og unødvendig synlig tekst. Ingen klinisk godkjenning kun på grunnlag av grønn CI eller gode tekniske tester.
- **Peder:** avgjør reelle kliniske/produktmessige avveininger som krever klinikereier; gjennomfører bare en kort avsluttende aksepttest. Ikke påfør Peder teknisk feilsøking, manuell testmatrise eller timevis med skjema.
- **PR-krav:** Hver PR skal oppgi hvilket konkret menneskelig problem den løser, hvilket representativt brukerforløp som nå virker, hva som *fortsatt ikke* virker, hvor mye klinikeren må lese/besvare, kliniske godkjenninger og verifisert nivå av test. En doc-/plan-PR kan vurderes uten at framtidige funksjoner allerede er implementert. Ingen automatisk ny utvikling fordi PR-køen er tom.
- **Overordnede akseptspørsmål:** 1) Er dette opprinnelig bestilt funksjon eller en uavklart substitusjon? 2) Får en kliniker et nyttig svar med rimelig innsats? 3) Ser brukeren bare det som er nødvendig i denne fasen? 4) Er behandling, dose, sikkerhet, kilder og norsk preparatgrunnlag faktisk riktig? 5) Er dette dokumentert i appen, ikke bare i koden?

## 5. Status som skal holdes oppdatert

| Port | Status ved opprettelsen | Status etter P0 (06.11.2026, publisert app 1.126.3) | Status etter P4 (08.11.2026, publisert app 1.128.2, main 952c0ee) |
| --- | --- | --- | --- |
| Alle PR-er fra foregående runde integrert | Ja, main 1.126.2 06.11.2026 | Uendret | Ja. P1 (#343), P2-b (#344), P3 (#346) og P2-a (#345) er slått sammen |
| K1 faktisk lett å bruke i publisert app | Ikke dokumentert; Peder rapporterer at han ikke får plan | Nei. Escitalopram gir plan bare ved kort behandlingstid, ingen unntak og standardvalg i «Tilpass planen», og først etter 5–7 ekstra dosevalg med ett alternativ hvert. «Ja» på lang behandlingstid og enhver tilpasning gir stopp uten konkret grunn ([P0-rapporten](verktøy-p0-rapport-2026-11.md) §3) | Ja innenfor omfanget. Escitalopram 10 og 20 mg, tabletter og dråper, gir komplett plan etter 17 handlinger, uten dosevalg med ett alternativ. Låste felt i «Tilpass planen» gir standardplanen. Lang behandlingstid gir et konkret stopp, og «Vet ikke» ber om avklaring. Verifisert lokalt og i publisert app ([P4-rapporten](verktøy-p4-rapport-2026-11.md) §2–3) |
| Spørsmål og stoppmeldinger tydelige for alle fire | Nei; reservevisning med «Gjelder/Gjelder ikke» | Nei. Fem regler i bruk vises i reservevisningen fordi katalogen deres ikke er kontrollert, og 28 stoppende svar i åtte regler gir bare en generisk melding (rapporten §4, `src/__tests__/verktoyp0.test.ts`) | Ja i alle testede forløp, som bruker ti av de tolv reglene med kontrollert spørsmålskatalog: Ja/Nei/Vet ikke, og ingen reservevisning eller «Da gjelder ikke regelen». Alle 13 negative forløp sier hva som stopper. D04 nevner programmet, men ikke det konkrete vilkåret (rapporten §5.2) |
| K2-strategien svarer til bestilt klinisk formål | Uavklart/avvik dokumentert for citalopram → sertralin; krever faglig beslutning | Avvik bekreftet: nedtrapping og så direkte overgang, mens bestillingen bygde på Psychiatrienets overgang med overlapp. Beslutningspunkter P1-1–P1-7 i rapporten §6 | Avgjort av Peder 07.11.2026: direkte bytte er standard. Planen heter «nedtrapping og direkte overgang», og fasiten bekrefter at sertralin starter dag 15 uten overlapp og uten dager uten SSRI |
| Kompakt standardvisning og kopi | Ikke dokumentert; Peder rapporterer for mye tekst | Nei. Kopien av escitalopramplanen er 15 267 tegn, der under 10 % er selve doseringen, og den inneholder utviklertekst (rapporten §5) | Ja. Den korte kopien er 1 126–5 405 tegn (før 4 193–17 401), og utskriften er 1–3 sider (før opptil 5). Doser, dager og administrasjon er like på skjerm, i kopi og i utskrift, også på mobil. Det faglige grunnlaget står i egen utvidet kopi |
| Ny, samlet klinisk/UX-E2E på publisert main etter A1 | Ikke gjennomført/dokumentert | Gjennomført som P0 (24 forløp, `scripts/verktoy-p0-app.mjs`). K3 og K4 ga riktige komplette planer; K1 og K2 har funnene over | Gjennomført som P4. Lokalt kjørte 34 forløp: alle 21 positive stemmer dag for dag med en uavhengig fasit på skjerm, i kopi og i utskrift. Mot publisert admin-app kjørte 6 forløp med samme resultat. Nødstopp og foreldet FEST er prøvd lokalt (rapporten §4, `docs/verktøy-qa-appkontroll.md`) |
| Bred klinisk praksisdekning | Nei, kun avgrensede kasus | Uendret | Uendret |
| Ordinær klinikertilgang | Nei, administratortilgang beholdes | Uendret | Uendret |
| Start K5-D | Ikke åpnet; tidligere og disse kvalitetsportene må vurderes | Ikke åpnet. P2-a/P2-b, P3 og P1 kommer først (rapporten §9) | Ikke åpnet. P5 (Peders korte aksepttest) kommer først |

**Oppdater denne tabellen med verifiserte funn, ikke med PR-antall eller testantall.**
