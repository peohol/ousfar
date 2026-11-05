# OUSFAR Verktøy – enklere og mer brukervennlige psykofarmakaverktøy (plan 04.11.2026)

**Status:** Plan til ChatGPT-kontroll, ikke en klinisk godkjenning. Gjelder alle fire verktøyene: *Trappe ned antidepressiv*, *Bytte antidepressiv*, *Bytte antipsykotikum* (inkludert depot) og *Kombinere stemningsstabiliserende*, og skal kunne gjenbrukes for senere verktøy.

**Forhold til andre planer:** `docs/verktøy-klinisk-leveranseplan-2026-11.md` styrer fortsatt hvilke kliniske regler som lages og godkjennes (K0–K5). Denne planen endrer **hvordan verktøyene brukes**, ikke hvilke regler som er godkjent. Pågående kliniske PR-er (#320 K3, #318 K2, #321 QA) og deres godkjenninger berøres ikke; arbeidet her slås sammen etter dem (§9). Versjonsnumre og merge-rekkefølge eies av K0-tråden.

**Bestilling (Peder 04.11.2026):** verktøyene skal føles som en hjelp, ikke som en ekstra arbeidsoppgave. Dagens «Trappe ned antidepressiv» på mobil ga et langt skjema med vanskelige spørsmål, uklare svaralternativer og mange bekreftelser, og til slutt ingen komplett plan.

## 1. Hva vi fant i dagens løsning

Kartlagt fra main (1.125.4): `src/components/verktoy/Verktoyside.tsx`, `src/verktoy/doseplan.ts`, `src/verktoy/motor/plan.ts`, `src/verktoy/motor/dosevalg.ts` og reglene som er klinisk godkjent.

**Ett skjema for alt.** Verktøysiden viser alle betingelsene i regelen på én gang, i regelens egen rekkefølge: dosefelt, «Om pasienten» (spørsmål med «Ja»/«Nei» og unntak med «Gjelder»/«Gjelder ikke»), «Tilpass planen», begrunnelse, formvalg, «Bekreft før beregning» og godkjenningsfritak. Ingenting skjer før «Beregn doseplan».

| Godkjent regel (main) | Spørsmål | Unntak («Gjelder») | Bekreftelser | Annet |
| --- | --- | --- | --- | --- |
| Escitalopram v13 (nedtrapping) | 5 | 5 | 2 lange tekster | 2 justerbare verdier, begrunnelse, formvalg etter første beregning, valg av minste trinn |
| Aripiprazol → Abilify Maintena v3 | 0 | 3 | 1 | – |
| Paliperidon → Xeplion v3 | 0 | 1 | 1 | krever godkjenningsfritak |
| Lamotrigin til valproat v2 | 3 | 7 | opptil 11 (7 betinget) | måldose, begrunnelse |
| Lamotrigin til litium v2 | 1 | 9 | opptil 5 | måldose, begrunnelse |
| Sertralin → mirtazapin v10, vortioksetin v12 | – | – | – | gir aldri komplett plan og tilbys ikke (#319) |

**Konkrete problemer** (nummerert for sporbarhet i trådene):

- **P1 Uklare svar.** Unntak vises som påstander med «Gjelder»/«Gjelder ikke». Det er uklart hva som gjelder, og noen tekster samler flere forhold i én påstand (for eksempel «akutt alvorlig bivirkning, forgiftning, alvorlig interaksjon eller rask seponering»).
- **P2 Ingen «Ukjent».** Bare to svar; den som ikke vet, må gjette eller la feltet stå, og får da en lite forståelig stopp.
- **P3 Tekniske bekreftelser.** Avkrysninger som egentlig er forbehold ved planen («Planen er et startforslag …») eller ting systemet allerede vet eller kan spørre enklere om («Pasienten bruker Lithionit 42 mg …, døgndosen er fylt inn i mg Li⁺»).
- **P4 Samme opplysning flere steder.** Alder, organfunksjon og interaksjoner spørres som separate punkter i ulike formuleringer; «over 65 år» og «65 år eller eldre» er ulike grenser i ulike regler.
- **P5 Sen beskjed om at planen ikke kan lages.** Klinisk omfang (startdose, legemiddelform, styrker), FEST-tilgjengelighet og formvalg kontrolleres først etter at hele skjemaet er fylt ut og «Beregn» er trykket. Escitalopram 10 mg med *tablett* valgt gir «Komplett plan ikke tilgjengelig» etter fullført skjema (K0-01 i leveranseplanen); bare dråper er godkjent.
- **P6 Én legemiddelform for hele forløpet.** Motoren stopper når et forløp spenner over flere former («beregningen blander dem ikke av seg selv», `entydig` i `plan.ts`), og klinisk omfang (`Klinisktilfelle.legemiddelform`) er bundet til én form. Skjemaet ber da om et valg etter første beregning, og klinikeren må beregne på nytt.
- **P7 Upraktiske doser er tillatt.** Dosevalget prioriterer avvik, så delinger, enheter og styrker; dråper teller som enheter med øvre søkegrense 60 (`MAKS_DRAPER`). Det finnes ingen preferanse for få dråper eller få administrasjonshandlinger.
- **P8 Manuelle dosevalg.** Trinn som ikke kan gis nøyaktig, gir knapper der klinikeren må velge dose, og planen beregnes på nytt (prinsippet P7-A: «forskriveren velger eksplisitt, aldri automatisk»).
- **P9 Interne begreper i grensesnittet.** «Strategi», «regel», kontrollutfall, «Faglig grunnlag» med regel-ID og fingeravtrykk, «omfang», «formuleringsklasse».
- **P10 Planen er en tabell.** Dager i én kolonne og én kolonne per legemiddel; vurderingspunkter og oppfølging står som tekst under. På mobil stables tabellen.
- **P11 Bytte antidepressiv gir ingenting nyttig ennå.** Ingen bytteregel gir komplett plan, men verktøyet lar klinikeren velge legemidler før det sier det.

**Anslag** (D måler nøyaktig, §8): vanlig escitalopramnedtrapping krever i dag rundt 20 handlinger (valg, svar, avkrysninger, to beregninger og dosevalg), litium + lamotrigin rundt 20.

## 2. Sikkerhetsinvarianter – det som ikke skal endres

Gjelder hver PR i denne planen. Hver invariant håndheves av en test som D eier eller kontrollerer.

| ID | Invariant |
| --- | --- |
| S1 | Planen kommer bare fra `kliniskDoseplan`. Delplaner vises aldri for klinikere. |
| S2 | Ingen godkjent regel får nytt fingeravtrykk av UI- eller motorarbeid. Ny klinisk atferd krever ny regelversjon og ny godkjenning. |
| S3 | For hver godkjent regel og hvert kasus i QA-katalogen (K0-01–K0-12, H-01–H-39) er planen (perioder, doser, preparater, vurderingspunkter) uendret, med mindre en ny, godkjent regelversjon uttrykkelig tar i bruk ny motoratferd. |
| S4 | «Ukjent» er aldri det trygge svaret. Ukjent og ubesvart gir ingen plan, men en konkret forklaring på hva som må avklares. |
| S5 | Hver betingelse i hver godkjent regel (spørsmål, unntak, bekreftelse) er enten spurt om, avledet fra et eksplisitt svar med testet avbildning, eller vist i planen og kopien. En betingelse uten kontrollert klassifisering vises i **reservevisningen**: regelens egen, fullstendige tekst med sin opprinnelige type og svarlogikk, slik dagens skjema viser den (spørsmål med «Ja»/«Nei», unntak med regelens to svar, bekreftelse som avkrysning). Den gjøres aldri om til et generisk spørsmål. |
| S5b | Avbildningen fra katalogen til motorens felt er bundet til kontrollen: hver regelversjon har et kontrollert katalogavtrykk (§4.4). Stemmer ikke avtrykket for katalogoppføringene regelen bruker, brukes reservevisningen fra S5 for hele regelen. Ingen godkjent regel får dermed andre inndata uten ny kontroll. |
| S6 | Avledninger testes ved grenseverdier (alder 17/18, 64/65/66; dosegrenser). |
| S7 | Nødstopper, sperrelesing, FEST-ferskhet, godkjenningsfritak og klokkekontroll virker som i dag; eksisterende tester endres ikke for å bli grønne. |
| S8 | Kopien inneholder hele planen: alle trinn med dager/datoer, doser, preparater, styrker og antall enheter, administrasjon, vurderingspunkter, forbehold, kilder, regelversjon og fingeravtrykk. |
| S9 | Forhåndskontrollen lover aldri en plan. Den kan si «kan ikke lages» eller «kan lages hvis …»; planen vises bare når motoren har beregnet den med de faktiske svarene. |

**Teknisk eller klinisk.** Hver PR sier i beskrivelsen hvilken av to kategorier hver endring hører til. *Teknisk:* endrer bare presentasjon, rekkefølge, avledning eller tidspunkt for kontroller, med uendret motorutfall (S3). *Klinisk:* endrer hva regelen tillater eller hva motoren velger for en godkjent regel. Kliniske endringer gjøres bare som ny regelversjon med eget kontrollgrunnlag og ChatGPTs faglige kontroll. Teksten i spørsmålene er klinisk meningsinnhold selv når den er teknisk avledet (CLAUDE.md), og kontrolleres av ChatGPT som en egen tabell (§4.4).

## 3. Ny felles arbeidsflyt

Samme fire steg i alle verktøy. Hvert steg vises først når det forrige er utfylt, og alt over står synlig og kan endres.

1. **Hva skal gjøres.** Legemidlet pasienten bruker (og ved bytte eller tillegg: legemidlet det gjelder), med form der det betyr noe (peroral eller depot). Søkefelt med forslag; snarvalg for det som kan gi komplett plan.
2. **Nåværende behandling.** Dose og preparat i pasientens egne termer: «10 mg tablett daglig», «Lithionit 42 mg, 4 tabletter». Systemet regner om (mg Li⁺, injeksjonsintervall) i stedet for å be klinikeren bekrefte omregningen. **Rett etter dette steget** kjøres forhåndskontrollen (§5): enten «En komplett plan kan lages hvis svarene under tillater det», eller en konkret stoppforklaring før ett eneste pasientspørsmål.
3. **Om pasienten.** Bare spørsmålene regelen faktisk trenger, gruppert og i fast rekkefølge (§4.3), med «Ja», «Nei» og «Ukjent». Spørsmål som avhenger av et svar, vises først når svaret er gitt. Et svar som stopper planen, sier det straks ved spørsmålet, med hva klinikeren kan gjøre i stedet.
4. **Planen.** Beregnes automatisk så snart alt som trengs er besvart, uten «Beregn»-knapp (FEST og sperrer leses som i dag rett før planen vises). Valgfrie justeringer (lengre trinn, startdato) ligger i planen som «Endre», ikke i skjemaet.

```
Mobil                                   Stor skjerm
┌──────────────────────────┐            ┌───────────────────────────┬────────────────────────────┐
│ Trappe ned antidepressiv │            │ 1 Hva skal gjøres   ✓     │  Planen                     │
│ 1 Escitalopram  ✓ endre  │            │ 2 Nåværende       ✓       │  ┃ Dag 1–28   10 mg  ▮ 1 tab │
│ 2 10 mg tablett ✓ endre  │            │ 3 Om pasienten            │  ┃  ○ Vurder plager          │
│ ✔ Komplett plan mulig    │            │   Alder  [18–64][65+][<18]│  ┃ Dag 29–56   5 mg  ▮ 1 tab │
│ 3 Om pasienten           │            │   Tidligere plager ved    │  ┃ Dag 57–…    3 mg  ● 3 dr  │
│   Alder [18–64][65+][<18]│            │   nedtrapping?  [J][N][?] │  ┃ …                         │
│   …                      │            │   …                       │  ┃ Seponert dag 197          │
│ 4 Planen (tidslinje)     │            │                           │  [Kopier planen] [Skriv ut] │
└──────────────────────────┘            └───────────────────────────┴────────────────────────────┘
```

Skissen viser oppsettet, ikke reelle doser. På stor skjerm står planen ved siden av spørsmålene og oppdateres mens det svares (et ufullstendig skjema viser hva som gjenstår, aldri en delplan). På mobil kommer planen under, og en fast knapp nederst («Se planen» / «2 spørsmål igjen») hopper dit.

## 4. Spørsmål og svar

### 4.1 Klassifisering av betingelsene

Hver betingelse i en regel (`Sporsmal`, `Unntak`, `Bekreftelse`) får én kategori i en ny katalog (`src/verktoy/flyt/sporsmal.ts`). Katalogen ligger **utenfor** regelen, så regelens fingeravtrykk ikke endres (S2). Avbildningen har likevel sitt eget kontrollerte avtrykk per regelversjon (S5b, §4.4), så en senere endring i katalogen ikke stille endrer hva motoren får. Den avbildes til nøyaktig de samme feltene motoren leser i dag (`svar`, `pasientforhold`, `bekreftet`).

| Kategori | Hva | Vises som | Eksempler fra godkjente regler |
| --- | --- | --- | --- |
| **Sikkerhetsopplysning** | Et forhold ved pasienten som kan stoppe eller endre planen | Spørsmål med «Ja»/«Nei»/«Ukjent» | tidligere seponeringsplager, QT-forlengelse, HLA-B*1502, tidligere utslett av lamotrigin, graviditet, CYP2C19 |
| **Avledet** | Følger entydig av et annet svar eller av valget av legemiddel, preparat eller dose | Ikke spurt; står i planen som «Forutsatt: …» | under 18 år og over 65 år fra aldersspørsmålet; «bruker Lithionit 42 mg, døgndosen i mg Li⁺» fra valgt preparat og antall tabletter; «bruker et natriumvalproatpreparat» fra valgt preparat |
| **Forbehold** | En forutsetning for hvordan planen skal brukes, ikke et forhold ved pasienten | Kort tekst øverst i planen og i kopien, ikke avkrysning | «Planen er et startforslag … dagene er minstetider»; «toleransen vurderes før hver reduksjon» |
| **Klinisk vurdering** | Noe klinikeren må ha vurdert og som ikke kan avledes | Ett spørsmål med «Ja»/«Ikke ennå» | «Lever- og nyrefunksjon og interaksjoner er vurdert»; «spesialist i bipolar lidelse har vurdert …» |

Uten kontrollert klassifisering (S5b) vises betingelsen i reservevisningen (S5): regelens egen, fullstendige tekst, med opprinnelig type og svarlogikk. Den gjøres ikke om til «Gjelder dette pasienten?» eller et annet generisk spørsmål, fordi det ville gjeninnføre tvetydigheten og for en bekreftelse kunne snu betydningen av ja og nei. Reservevisningen gir nøyaktig de samme motorinndataene som dagens skjema (testet). Kategoriene **avledet** og **forbehold** er akseptert avgrenset av ChatGPT (B1–B2, §10): bare rent informative forbehold og opplysninger som følger logisk av et eksakt, eksplisitt valg. En reell klinisk vurdering eller sikkerhetskritisk bekreftelse krever fortsatt et eksplisitt, forståelig svar, og fravær av kontraindikasjoner eller vurdert toleranse avledes aldri.

### 4.2 Språk

- Spørsmål stilles om pasienten, i andre person til klinikeren: «Har pasienten tidligere fått plager ved nedtrapping eller seponering?» – svar «Ja», «Nei», «Ukjent».
- Én opplysning per spørsmål. Sammensatte unntak deles opp når det gir klarere svar, og avbildes tilbake (unntaket gjelder hvis ett av delspørsmålene er ja, og er ukjent hvis ett er ukjent og ingen er ja).
- Hjelpetekst bare der spørsmålet kan misforstås (for eksempel hva «mange måneder» betyr, med regelens egen grense).
- Et stoppende svar forklares ved spørsmålet, i én setning, med hva som kan gjøres: «Da lager verktøyet ingen plan. Nedtrappingen må planlegges individuelt; mindre trinn enn én dråpe beregnes ikke.»
- Ingen regel-ID, kontrollutfall, «omfang», «strategi» eller formuleringskoder i det klinikeren ser. Regelversjon og fingeravtrykk står i kopien og i «Kilder og versjon» nederst i planen.

### 4.3 Rekkefølge og felles spørsmål

1. **Stoppforhold først**, de som gjør planen umulig uansett (under 18 år, akutt situasjon, ustabil dose, kontraindikasjoner), slik at klinikeren får beskjed tidlig.
2. **Forhold som endrer planen** (lang behandlingstid, alder, organfunksjon, interaksjoner, prevensjon).
3. **Kliniske vurderinger** til slutt.

Felles spørsmål på tvers av regler (alder, organfunksjon, interaksjoner, graviditet) har én ID i katalogen og stilles én gang. Alder spørres som «Under 18 / 18–64 / 65 eller eldre». Et svar avleder bare det som følger logisk av det: «18–64» besvarer både «over 65 år» og «65 år eller eldre» med nei, og «Under 18» besvarer under 18 år med ja. «65 eller eldre» besvarer «65 år eller eldre» med ja, men avleder **ikke** «over 65 år». Der spørres regelens eget spørsmål (S6, tester ved 17/18 og 64/65/66).

**Alder 65 og escitalopram (ChatGPT 04.11).** Escitalopram v13 er klinisk godkjent bare for voksne **under 65 år** (K1.9), men regelen spør «Er pasienten over 65 år?». En pasient på nøyaktig 65 år kan da svare nei og få en plan utenfor det godkjente omfanget. Det rettes ikke i flyten, for en avledning i grensesnittet skal aldri endre eller utvide en godkjenning. Rettelsen er klinisk og versjonsstyrt: den nye escitalopramregelen (B2, v14) spør «Er pasienten 65 år eller eldre?» og har tester ved 64/65/66. Den erstatter v13 først når ChatGPT har godkjent nøyaktig den versjonen. Til da viser C1 og A1 regelens eget spørsmål uendret for v13. Grensen er ført som kjent avvik i C1 (#329).

Sjeldne stoppforhold i samme gruppe kan besvares med «Ingen av disse» (B5). Det er et aktivt valg klinikeren gjør, alle forholdene står synlige, valget er aldri forhåndsutfylt, og det endrer aldri et forhold som er besvart «Ja» eller «Ukjent».

### 4.4 Kontrollgrunnlag for språket

C lager `docs/verktøy-sporsmalskatalog.md`: én rad per betingelse i hver godkjent regel med regelens tekst, ny tekst, kategori, svaralternativer, avbildning til motoren og hva «Ukjent» gir. ChatGPT kontrollerer tabellen sammen med C sin PR. Tabellen genereres fra katalogen, og en test sier fra når den ikke stemmer med koden.

**Katalogavtrykk (S5b).** For hver regelversjon beregnes et avtrykk (sha256) av katalogoppføringene regelen bruker: kategori, tekst, svar, avbildning, avledning og hva «Ukjent» gir. Når ChatGPT har kontrollert tabellen, føres avtrykket som kontrollert for nøyaktig den regelversjonen og det regelfingeravtrykket (`src/verktoy/flyt/katalogkontroll.ts`, samme mønster som godkjenningshistorikken). Ved kjøring brukes katalogen for en regel bare når avtrykket stemmer; ellers den trygge standarden. En test viser at en endret katalogoppføring gir standarden til ny kontroll er ført, og at standarden gir de samme motorinndataene som dagens skjema.

## 5. Tidlig kontroll av om en komplett plan kan lages

Ny funksjon `forhandskontroll` (`src/verktoy/flyt/forhandskontroll.ts`), kjørt etter steg 1 og etter steg 2, og på nytt ved hvert svar:

1. Finnes en klinisk godkjent, usperret regel for valget (`tilgjengelighet`, sperrer)?
2. Er startdosen (og ved behov form og preparat) innenfor regelens kliniske omfang (`klinisk_omfang.tilfeller`)? Hvis ikke: hvilke doser og former er godkjent, i klartekst («Godkjent for 10 og 20 mg»).
3. Finnes norske preparater i FEST for hele forløpet? FEST leses allerede etter steg 2, ikke etter skjemaet.
4. **Prøveberegning:** motoren kjøres med de svarene som er gitt og de trygge svarene for resten. Krever planen et valg av dose for et trinn (`trinnvalg`, for eksempel minste trinn for escitalopram v13), prøves hvert tillatte alternativ (avgrenset dybde); et slikt valg er en gjenstående opplysning, ikke en stopp. Gir ingen gren en komplett plan, og stopper alle av andre grunner enn manglende valg, sier verktøyet det nå, med grunnen. B skiller derfor stoppkoder for «valg trengs» fra reelle stopp. Gir det en plan, vises den ikke; brukeren får «En komplett plan kan lages hvis svarene under tillater det» og en teller for gjenstående spørsmål (S9).
5. **Gjenstående opplysninger:** hvilke spørsmål som fortsatt kan avgjøre utfallet.

Stoppgrunnene fra motoren er i dag fri tekst. B legger til en strukturert kode ved hver stoppgrunn (tekstene uendret), og C oversetter kodene til korte forklaringer med handling (`src/verktoy/flyt/stopp.ts`): hva som mangler, om det kan løses i verktøyet (for eksempel «velg dråper») eller må vurderes individuelt, og eventuell kilde. Oversikten over verktøyene og snarvalgene sier hva hvert verktøy kan gi i dag («Bytte antidepressiv: ingen komplett plan er godkjent ennå»), så ingen fyller ut et skjema forgjeves (P11).

## 6. Legemiddelformer og praktisk dosering

**Kombinere former i samme forløp (P6).** Regelmodellen får mulighet til å tillate en dokumentert overgang mellom legemiddelformer i et forløp, for eksempel tablett → dråper ved lave doser, med grunnlag (escitalopram: K1.11, mg for mg) og retning. Klinisk omfang kan da beskrive en rekkefølge av former i stedet for én form. Uten slik tillatelse i regelen blander motoren fortsatt ikke former (dagens atferd, S3). Når bare én form kan gi en komplett plan innenfor godkjent omfang, velger systemet den selv og sier det i planen, i stedet for å be om et valg (beslutning B4).

**Praktisk dosering (P7).** Etter de harde kravene og minst avvik vurderes en «praktisk belastning» per dose og for hele forløpet: antall dråper over en preferansegrense (forslag 5 per administrasjon, en justerbar regelparameter med begrunnelse, ikke en absolutt grense), delinger, antall enheter, antall ulike styrker og former, og antall formskifter. Tabletter foretrekkes fremfor mange dråper; dråper brukes når de gir en praktisk fordel (små doser). Den nye vurderingen gjelder bare regelversjoner som uttrykkelig tar den i bruk, så godkjente planer ikke endres i det stille (S2–S3). B dokumenterer hvilke godkjente planer som ville blitt annerledes, som grunnlag for nye regelversjoner.

**Automatisk dosevalg (P8).** Der en regel i dag krever at klinikeren velger dose for et trinn, foreslås at verktøyet velger det dokumenterte, foretrukne alternativet og viser alternativet som «Endre» i tidslinjen. Det endrer prinsippet P7-A og er en klinisk beslutning (B3). Avslås den, beholdes valget, men som ett trykk i tidslinjen uten ny beregning fra bunnen.

**Første kliniske bruk:** escitalopram ny versjon (v14) der en pasient på tablett 10 eller 20 mg trappes ned med tabletter så lenge de gir enkel og nøyaktig dose, og går over til dråper når det er mer praktisk (K0-01 med tablett som start). Egen PR med kontrollgrunnlag, til ChatGPTs faglige kontroll; v13 gjelder til v14 er godkjent (`Regel.erstatter`, #324). Andre godkjente regler (Maintena, Xeplion, K4) kontrolleres for om prinsippet gir praktisk gevinst; nye versjoner av dem er egne, senere leveranser.

## 7. Planresultat og kopi

- **Tidslinje** i stedet for tabell: én rad per periode med dager og eventuelle datoer, dose, hva som gis («1 tablett 10 mg», «3 dråper»), formskifte markert, vurderingspunkter og oppfølging på riktig sted i tiden, og sluttmålet tydelig til slutt («Seponert fra dag 197», «Fast månedlig injeksjon»).
- **Øverst:** én linje om hva planen er (komplett til sluttmålet), forutsetningene (avledede svar og forbehold) og eventuelle faglige varsler.
- **Pakninger:** samlet liste over preparater og styrker planen bruker, med FEST-forbeholdet om lagerstatus.
- **Kopi og utskrift:** «Kopier planen» gir hele planen som ren tekst i samme rekkefølge som tidslinjen (S8). Kopiteksten kan endres i form, men D kontrollerer at hvert element i planen fortsatt finnes i kopien, og ChatGPT kontrollerer kopien for minst ett forløp per verktøy.
- **Kilder og versjon** nederst, sammenleggbart; åpnes ved utskrift som i dag.

## 8. Designretning

Verktøyene bygger på OUSFARs eksisterende designsystem (Atlas, `src/styles/tokens.css`, `/mnt/project-files/design/atlas/`), så de ser ut som resten av appen: Public Sans i grensesnittet, Newsreader for sidetittel og plantittel, papirflate, blekk og den dype blågrønne aksenten. Ingen nye farger for kliniske betydninger; farge bærer aldri betydning alene (ikon og tekst følger med).

- **Det ene som skal huskes er tidslinjen:** en rolig, loddrett linje der dosen leses som tekst i stor, tabulær tallsats, og administrasjonen som små symboler (tablett, halv tablett, dråpe, injeksjon) med tall. Formskifter og vurderingspunkter er markeringer på linjen. Alt annet er stille.
- **Spørsmål som segmenterte valg**, ikke rader av radioknapper: tre like store trykkflater (minst 44 px) med «Ja», «Nei», «Ukjent», tastaturbruk med piltaster og 1/2/3, og valgt svar tydelig også uten farge. Besvarte grupper foldes sammen til én oppsummeringslinje («Ingen stoppforhold», «Endre»).
- **Statuslinjen** under steg 2 er den eneste fremhevede meldingen i skjemaet: komplett plan mulig, eller stopp med grunn og handling.
- **Typografi og luft:** sidetittel i Newsreader, alt annet i Public Sans, linjelengde under 70 tegn i hjelpetekst, venstrejustert. Ingen versaler som etiketter, ingen nummererte dekorelementer utenom de fire stegene, som faktisk er en rekkefølge.
- **Bevegelse** bare som svar på handling (et steg som åpnes, planen som oppdateres), og ingen ved «Reduser bevegelse».
- **Tilgjengelighet:** skjermleser får stegene som overskrifter, spørsmålene som `radiogroup`, statuslinjen som `status`, tidslinjen som ordnet liste; fokus flyttes aldri uventet; mørkt tema via eksisterende tokens.

A bruker `/frontend-design` og Atlas-komponentene, lager skisser i begge temaer før koden, og tar skjermbilder på mobil (390 px) og stor skjerm (1440 px) i egen PR.

## 9. Tråder, filer og avhengigheter

Fire parallelle tråder, i tillegg til denne hovedtråden som eier planen, grensesnittene mellom trådene og integrasjonen. **Ingen tråd skriver i filer en annen tråd eier.** Regelfilene i `src/verktoy/regler/` (unntatt det B får under), `kilder.ts`, `pilotsett.ts`, `aksepttest.ts` og leveranseplanen er urørt av alle.

| Tråd | Oppgave | Eier (skriver i) | Leser fra |
| --- | --- | --- | --- |
| **A – arbeidsflyt og design** | Ny felles flyt (§3), spørsmålsvisning (§4.2–4.3 visuelt), tidslinje og kopi (§7), design (§8); responsiv og tilgjengelig | `src/components/verktoy/**`, `src/styles/verktoy.css`, `src/verktoy/planvisning.ts`, `src/__tests__/verktoyside.test.tsx`, `src/__tests__/verktoytilleggside.test.tsx`, UI-stegene i `src/__tests__/kildesakflyt.test.tsx` og `src/__tests__/hjelp/pilotside.ts` (ikke hva de kontrollerer), nye komponenttester | C sine `flyt`-moduler, B sine typer |
| **B – legemiddelformer og praktisk dosering** | Strukturerte stoppkoder; formovergang i forløp; praktisk belastning (opt-in); automatisk formvalg når bare én form kan gi komplett plan; rapport over godkjente planer som ville endres; escitalopram v14 med kontrollgrunnlag | `src/verktoy/motor/**`, `src/verktoy/festformuleringer.ts`, nye valgfrie felt i `src/verktoy/regler/modell.ts` (etter #318), `src/verktoy/regler/k1.ts` (bare B2), `docs/verktøy-praktisk-dosering.md`, egne tester | – |
| **C – spørsmål og tidlig kontroll** | Spørsmålskatalog og klassifisering (§4.1), avledninger, rekkefølge og progressiv visning (§4.3), «Ukjent», forhåndskontroll med prøveberegning (§5), stoppforklaringer, katalogtabell til ChatGPT (§4.4) | `src/verktoy/flyt/**` (ny), `src/verktoy/snarvalg.ts`, `src/verktoy/doseplan.ts` (bare skjemaavbildningen), `docs/verktøy-sporsmalskatalog.md`, egne tester | motor, regler, `tilgjengelighet.ts` |
| **D – brukertest og regresjon** | Før-måling nå (antall handlinger per vanlig forløp på main); invariant-tester S1–S9; etter at #321 er slått sammen: overta `src/__tests__/qa/**` og tilpasse appkontrollen til ny flyt; ende-til-ende-forløp positive og negative; skjermbilder mobil og stor skjerm; tilgjengelighetskontroll; kritisk egenkontroll | `src/__tests__/qa/**` (etter #321), `src/__tests__/verktoyflyt-invarianter.test.ts`, `docs/verktøy-brukervennlighet-maling.md` | alt |

**Grensesnitt mellom trådene** (C definerer typene i `src/verktoy/flyt/typer.ts` i sin første commit; A og B kan bygge mot dem med midlertidige data til C er klar):

```ts
type Svar = 'ja' | 'nei' | 'ukjent'
interface Flytsporsmal { id: string; tekst: string; hjelp?: string; gruppe: 'stopp' | 'endrer' | 'vurdering'; svar: readonly Svar[]; stopperVed?: Svar[]; forklaring?: string }
interface Flyttilstand {
  steg: 'hva' | 'behandling' | 'pasient' | 'plan'
  sporsmal: Flytsporsmal[]            // bare de synlige, i rekkefølge
  forutsatt: string[]                 // avledede svar og forbehold, til planen og kopien
  kontroll: { utfall: 'ukjent' | 'kan_lages_hvis' | 'kan_ikke'; grunner: Stoppforklaring[]; gjenstar: number }
}
interface Stoppforklaring { kode: string; tekst: string; handling?: string; kilde?: string }
// B: Doseplanresultat får stoppkoder: { kode: string; tekst: string }[] ved siden av stoppgrunner (uendret).
```

**PR-er og rekkefølge** (versjoner tildeles av K0; alle «Til ChatGPT-kontroll – ikke merge»):

| Nr | PR | Avhenger av | Kategori |
| --- | --- | --- | --- |
| 0 | Denne planen | – | Dokumentasjon |
| 1 | B1 – stoppkoder, formovergang og praktisk belastning i motoren, uten endrede godkjente planer | #318 (berører `modell.ts`) | Teknisk |
| 2 | C1 – spørsmålskatalog, avledning, forhåndskontroll og stoppforklaringer | B1 (stoppkoder) | Teknisk, språket kontrolleres faglig |
| 3 | A1 – ny arbeidsflyt, tidslinje og design | C1 | Teknisk |
| 4 | B2 – escitalopram v14, tablett → dråper | B1 | **Klinisk** |
| 5 | D1 – QA-forløp og appkontroll for ny flyt, måling, skjermbilder | A1, helst B2 | Test |

Alle fem slås sammen **etter** #320, #318 og #321 (dagens K0-rekkefølge), slik at QA-rapportene for de kliniske PR-ene lages fra appen de ble kontrollert i, og D så tilpasser QA til den nye flyten. Utviklingen starter straks i alle tråder. B2 kan slås sammen før A1 hvis ChatGPT godkjenner den først; da virker escitalopram fra tablett også i dagens skjema.

## 10. Beslutninger som trengs fra ChatGPT (og Peder ved prinsipielle valg)

ChatGPT svarte på alle seks 04.11.2026 (kontroll av c90c838). Svarene under er bindende for trådene. Et avgrenset ja gjelder bare det som står.

| ID | Spørsmål | Anbefaling |
| --- | --- | --- |
| B1 | Kan bekreftelser som er **forbehold** vises i planen og kopien i stedet for å krysses av? | **Avgjort 04.11: ja, avgrenset** til rent informative forbehold. En reell klinisk vurdering eller sikkerhetskritisk bekreftelse krever fortsatt et eksplisitt, forståelig svar. |
| B2 | Kan bekreftelser som er **avledet** av et eksplisitt valg (preparat, antall tabletter, dose) oppfylles av valget? | **Avgjort 04.11: ja, avgrenset.** Preparat, enhetsmengde og formulering kan avledes fra eksakt og eksplisitt valgte opplysninger, med testet avbildning. Fravær av kontraindikasjoner, vurdert toleranse og annet som ikke følger logisk av valget, avledes ikke. |
| B3 | Kan verktøyet selv velge det foretrukne dosealternativet for et trinn som i dag krever klinikerens valg (endrer P7-A)? | **Avgjort 04.11: betinget ja, bare i et nytt, særskilt kontrollert regime.** Systemet velger praktiske formuleringer og dosekombinasjoner. Et klinisk meningsfullt trinnvalg i en allerede godkjent regel tas ikke over uten ny regelversjon med nytt fingeravtrykk, deterministisk og faglig godkjent grunnlag, kontroll av konsekvensene og mulighet for forskriveren til å endre eller avstå. Ikke en generell godkjenning av automatiske dosevalg. |
| B4 | Kan systemet velge legemiddelform selv når bare én form gir en komplett plan innenfor godkjent omfang? | **Avgjort 04.11: ja**, når formen er dokumentert tilgjengelig og innenfor godkjent omfang. Valgt eller endret form vises tydelig. Blanding av tabletter og dråper krever egen kontrollert regelversjon (v14). |
| B5 | Kan en gruppe sjeldne stoppforhold besvares med «Ingen av disse»? | **Avgjort 04.11: ja, betinget.** Alle konkrete stoppforhold vises, og klinikeren velger «Ingen av disse» aktivt. Valget er aldri forhåndsutfylt og setter aldri et ukjent forhold til nei. Gjelder ikke forhold som endrer planen. |
| B6 | Preferansegrense for dråper per administrasjon | **Avgjort 04.11: ja til 5** som justerbar praktisk preferanse, ikke en medisinsk sikkerhetsgrense eller hard stopp. Avveiningen mot antall tabletter, delinger, formbytter og risiko for tellefeil dokumenteres. Endelige dosevalg kontrolleres i B2. |

## 11. Akseptansekriterier og hvordan de vises

Arbeidet er ferdig når D har dokumentert alle punktene i `docs/verktøy-brukervennlighet-maling.md`, med før- og etter-måling fra den publiserte appen og skjermbilder:

| # | Kriterium (bestillingen) | Hvordan det måles |
| --- | --- | --- |
| 1 | Vesentlig raskere | Antall nødvendige handlinger fra første valg til plan for K0-01, K0-09, K0-11 og K0-12: minst halvert. |
| 2 | Forståelige spørsmål | ChatGPT har kontrollert katalogtabellen (§4.4) og avtrykkene er ført; da er det ingen regel-ID, «Gjelder», «omfang» eller kode i det klinikeren ser (test over all synlig tekst for regler med kontrollert katalog). Reservevisningen (S5) er unntatt fordi den med vilje viser regelens egne tekster og svar; testen sjekker i stedet at den bare brukes for regler uten kontrollert avtrykk. Kriteriet er nådd først når hver godkjent regel har kontrollert avtrykk. |
| 3 | Bare relevante spørsmål | Test: ingen betinget spørsmål eller bekreftelse vises før svaret som utløser det; avledede og forbehold vises ikke som spørsmål. Test for reservevisningen (S5): for en regel uten kontrollert katalogavtrykk vises hver betingelse med regelens fullstendige tekst, opprinnelige type og svar, ingen generisk «Gjelder dette pasienten?», og motorinndataene er de samme som i dagens skjema. |
| 4 | Tidlig beskjed | Negative forløp (escitalopram 15 mg, sertralin, et bytte uten regel, Lithionit 83 mg, sperre): stoppforklaring vises etter steg 2, før pasientspørsmål. |
| 5 | Praktiske formuleringer velges automatisk | K0-01 fra tablett gir plan uten formvalg (etter B2); forløp med bare én mulig form spør ikke om form. |
| 6 | Tabletter og dråper i samme forløp | Escitalopram v14: tablett til lav dose, så dråper, i én plan (etter godkjenning). |
| 7 | Få dråper, enkle kombinasjoner | B sin rapport og tester: ingen godkjent v14-plan over preferansegrensen uten begrunnelse; antall styrker og formskifter minimert. |
| 8 | Sperrer og godkjenninger uendret | S1–S9 grønne; QA-katalogen gir samme planer som før (S3); fingeravtrykk uendret (S2). |
| 9 | Konsekvent på mobil og stor skjerm | Skjermbilder av alle fire verktøy i begge bredder og begge temaer; tastatur- og skjermleserkontroll. |
| 10 | Testet fra første valg til plan eller stopp | Ende-til-ende i appen for minst ett positivt og ett negativt forløp per verktøy, med kopien kontrollert. |

I tillegg gjør D og hovedtråden en kritisk gjennomgang av hele opplevelsen: hver interaksjon som ikke har tydelig nytte, fjernes før ferdigmelding.
