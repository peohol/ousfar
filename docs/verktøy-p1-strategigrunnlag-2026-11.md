# OUSFAR – P1: beslutningsgrunnlag for byttestrategier og behandlingstid

**Dato:** 07.11.2026  
**Status:** Forslag til uavhengig fagkontroll (ChatGPT) og til Peders produktbeslutninger. **Ingen regel, dose, godkjenning, sperre, spørsmål eller skjerm er endret.** Alt som står som «forslag» eller «OUSFAR-vurdering» nedenfor er ikke klinisk godkjent, og ingen endret doseringsregel kan tas i bruk uten godkjenning av eksakt versjon og fingeravtrykk.  
**Bestilling:** Spor D (P1) i Peders oppdrag 07.11.2026, punkt 1–6, og P0-rapportens beslutningspunkter P1-1–P1-7 og M1/M4 ([P0-rapporten](verktøy-p0-rapport-2026-11.md) §6 og §8; [produktrevisjonen](verktøy-produktrevisjon-2026-11.md) §3 P1).  
**Rettigheter:** [Rettighetsavklaringen](verktøy-p3-rettigheter.md) er fulgt. Psychiatrienet er **ikke** lest for dette dokumentet; den eneste opplysningen herfra er P0-rapportens klassifisering av *strategitypen* (overgang med overlapp), som kontrolløren selv må bekrefte. Ingen doser, dager eller tekst fra Psychiatrienet eller fra proprietære samleverk (Maudsley, Felleskatalogen, NICE-tabeller) er brukt. Kildene i vedlegg A er gjengitt som fakta med egne ord.

## 1. Kort svar

1. **Dagens strategi er trygg, men passer bare få pasienter.** Citalopram/escitalopram → sertralin trapper i dag det gamle SSRI-et ned til laveste tablett og starter sertralin dagen etter. Det er en *forsiktig variant av direkte bytte* («nedtrapping, så overgang»). Den har lav risiko for serotonerg belastning, men gir pasienten 2–4 uker på redusert dose av et legemiddel som oftest byttes fordi det ikke virker eller ikke tåles. Kildene krever ikke en slik nedtrapping: Keks beskriver nedtrapping før oppstart av det nye SSRI-et, mens NHS SPS beskriver direkte bytte uten nedtrapping som normalt mulig mellom SSRI-er med kort halveringstid.
2. **8-ukersgrensen henger sammen med nedtrappingen, ikke med byttet.** Grensen ble innført fordi en rask nedtrapping (halvering hver 14. dag) bare er forsvarlig etter kort bruk. To uavhengige kilder regner bruk i mer enn 6–8 uker som en *risikofaktor* for seponeringssymptomer (Keks 2016; NHS SPS 2023/2024). Grensen utelukker dermed nettopp de pasientene som oftest skal bytte: de som har brukt et SSRI i måneder eller år.
3. **Ved direkte bytte mellom SSRI-er virker det nye legemidlet mot seponeringssymptomene fra det gamle** (NHS SPS). Det er grunnen til at SPS beskriver direkte bytte som normalt mulig mellom alle SSRI-er unntatt fluoksetin, uten nedtrapping og uten utvasking. Et **direkte bytte** fra (es)citalopram til sertralin er derfor den mest lovende veien til å støtte pasienter med lang behandlingstid. Det er OUSFARs forslag her, og det må vurderes og godkjennes som en ny regel.
4. **Forslaget er et bytteverktøy med to–tre godkjente strategier**, der klinikeren ser hvem hver passer for, i stedet for én smal standard (§5). Hver strategi er en egen regel med eget fingeravtrykk. Den godkjente regelen (v2) beholdes uendret til en erstatning er godkjent.
5. **Overlapp (kryssnedtrapping) mellom to SSRI-er har svak uavhengig kildestøtte.** Keks beskriver kryssnedtrapping som vanlig ved høy risiko for tilbakefall, men med interaksjonsrisiko. SPS beskriver det ikke for SSRI → SSRI. Om bestillingen krever en overlappende overgang, er et produktvalg for Peder (D-P1 i §8).
6. **Nedtrapping etter lang behandlingstid (K1) er et eget, praktisk doseringsproblem:** trinn på 10 % kan ikke gis med hele dråper under 10 mg escitalopram. Det krever en klinisk avgjørelse om minste trinn (§6.2).

## 2. Dagens regler og hvorfor de er slik

| Regel | Strategi | Godkjent omfang | Kilde for omfanget |
| --- | --- | --- | --- |
| `bytte-escitalopram-sertralin` v2 og `bytte-citalopram-sertralin` v2 (godkjent 05.11.2026) | Halvering hver 14. dag til laveste tablett (escitalopram 5 mg / citalopram 10 mg), 14 dager der, siste dose; sertralin 50 mg dagen etter; valgfri økning til 100 mg tidligst etter 14 dager | Voksne 18–65 år med depresjon, escitalopram 10/20 mg eller citalopram 20/40 mg, **høyst 8 ukers sammenhengende bruk**, ingen tidligere seponeringsplager, normal leverfunksjon, ingen kompliserende interaksjoner, tabletter | `docs/verktøy-k2-antidepressivbytter.md`, `K2VEDTAK` i `src/verktoy/regler/antidepressivbytter.ts` |
| `bytte-{sertralin,escitalopram,citalopram}-mirtazapin` v1 | Kryssnedtrapping; sluttrinnet (K2-2b) ikke avgjort | Ingen; alle planer stopper | Samme |
| `seponering-escitalopram-tabletter-og-draper` v14 (K1) | Nedtrapping 25 % av aktuell dose, minst 28 dager per trinn, dråper fra 1 mg, seponering fra 1 mg | Voksne under 65 år, **kort behandlingstid** («mange måneder» = nei), 10 eller 20 mg | `docs/verktøy-b2-escitalopram-kontrollgrunnlag.md` |

**Hvorfor 8 uker (punkt 3 i bestillingen).** Grensen ble foreslått av K2-tråden 04.11.2026 som en kontrollerbar øvre grense for «bare noen uker» hos RCPsych, der nedtrapping over omtrent en måned ofte er nok, før «mange måneder eller år», der nedtrappingen skal gå langsommere (`KORT_BEHANDLINGSTID_UKER`, K2-6 og K2-8 i `docs/verktøy-k2-kontrollgrunnlag.md`). Kontrolløren aksepterte den 05.11.2026 *som OUSFARs egen pilotgrense*, ikke som en medisinsk terskel. Grensen er altså en sikkerhetsgrense for den **raske nedtrappingen før byttet**, ikke for selve byttet.

**Er grensen faglig hensiktsmessig?**

- *Som sikkerhetsgrense for dagens strategi:* ja. Halvering hver 14. dag er raskere enn RCPsych og NICE anbefaler etter lang bruk, og etter mer enn 6–8 uker øker risikoen for seponeringssymptomer (Keks 2016: mulig etter mer enn seks uker; SPS: behandling i åtte uker eller mer er en risikofaktor). En nyere spørreundersøkelse fra britisk primærhelsetjeneste fant langt høyere odds for seponeringssyndrom etter mer enn 24 måneders bruk enn etter under 6 måneder (justert OR 10,4; 7–24 måneder OR 2,8), men med 18 % svarprosent og mulig seleksjon (Horowitz mfl. 2025). Meta-analysene av mest kortvarige studier finner lavere forekomst: omtrent 15 % av seponeringssymptomene kan tilskrives legemidlet, og omtrent 1 av 35 får alvorlige symptomer (Henssler mfl. 2024); ett ekstra symptom i gjennomsnitt den første uken (Kalfas mfl. 2025). Til sammen: lang bruk er en reell risikofaktor, og kunnskapen om de lengste brukerne er usikker.
- *Som produktomfang:* nei. Et bytte vurderes vanligvis først når en adekvat dose ikke har gitt effekt etter 4–6 uker (SPS), eller når bivirkninger eller tap av effekt kommer etter måneder eller år. Med grensen på 8 uker dekker verktøyet bare et smalt vindu, omtrent uke 4–8, og ingen som har stått lenge på behandling.
- *Konsekvens:* Den naturlige rettelsen er **ikke** å flytte grensen for dagens nedtrapping, men å tilby en strategi som ikke har en periode med redusert serotonerg dekning før byttet (§4).

## 3. Strategitypene og hva kildene sier

| Strategi | Hva skjer | Fordeler | Ulemper og risiko | Uavhengig støtte for (es)citalopram → sertralin |
| --- | --- | --- | --- | --- |
| **A. Direkte bytte** | Det gamle SSRI-et stoppes; sertralin startes dagen etter | Ingen periode uten SSRI; det nye legemidlet demper seponeringssymptomer fra det gamle; raskt og enkelt | Kortvarig samtidig eksponering mens det gamle elimineres (halveringstid ~30 t escitalopram, ~1,5 døgn citalopram); høyere doser øker risikoen for både serotonerg belastning og seponeringssymptomer (SPS); Keks regner seponeringssymptomer som sannsynlige og interaksjonsrisikoen som betydelig ved direkte bytte generelt | **Sterkest:** SPS (normalt mulig mellom SSRI-er unntatt fluoksetin; ingen kryssnedtrapping beskrevet); Keks (passer ved bytte mellom SSRI-er med kort halveringstid; utvasking ikke nødvendig mellom citalopram, escitalopram, paroksetin og sertralin ved forsiktig bytte og nær oppfølging) |
| **B. Nedtrapping, så overgang** (dagens v2) | Det gamle trappes ned, sertralin startes dagen etter siste dose | Liten samtidig eksponering | 2–4 uker på redusert dose av et legemiddel som ikke virker eller ikke tåles; selve nedtrappingen gir risiko for seponeringssymptomer etter lang bruk; SPS beskriver ikke nedtrapping før SSRI → SSRI | Keks (trapp ned, start det nye SSRI-et i lav dose) og NICE 1.4.16 (raskere nedtrapping kan passe ved bytte) |
| **C. Kryssnedtrapping / overlapp** | Sertralin startes mens det gamle trappes ned | Ingen svikt i behandlingen; brukt ved høy risiko for tilbakefall | To SSRI-er samtidig gir additiv serotonerg belastning og flere bivirkninger; lite teoretisk gevinst når begge hemmer samme transportør | Keks (vanlig ved høy tilbakefallsrisiko, men interaksjons- og bivirkningsrisiko); ikke beskrevet av SPS for SSRI → SSRI. Psychiatrienets type ifølge P0 |
| **D. Nedtrapping, pause, oppstart** (moderat/konservativ) | Det gamle trappes ned og stoppes, 2–5 dager (eller 5 halveringstider) uten legemiddel, så oppstart | Lavest interaksjonsrisiko | Dager uten SSRI gir risiko for seponeringssymptomer og forverring | Keks (moderat og konservativ strategi). Relevant når samtidig eksponering må unngås, for eksempel ved mistenkt serotonerg toksisitet eller fra fluoksetin; ikke nødvendig mellom (es)citalopram og sertralin |

**Effekt av byttet.** I STAR*D gav bytte fra citalopram til sertralin, bupropion eller venlafaksin omtrent lik remisjon (omtrent én av fire), og Keks oppgir at det ikke er vist at bytte til en annen klasse virker bedre enn bytte innen klassen. Et bytte innen SSRI-klassen er altså et rimelig klinisk valg; strategien for selve overgangen må likevel velges.

**Doseforhold.** Sertralin 50 mg er preparatomtalens startdose og ligger nær platået for transportørbinding (Sørensen mfl. 2022). En systematisk analyse av fleksibeldosestudier fant at fluoksetin 40 mg tilsvarer omtrent sertralin 98,5 mg og escitalopram 18 mg (Hayasaka mfl. 2015; citalopram var ikke med). Escitalopram 20 mg tilsvarer dermed grovt sertralin 100 mg, og escitalopram 10 mg grovt sertralin 50 mg. At escitalopram 10 mg tilsvarer citalopram 20 mg, er en farmakologisk OUSFAR-vurdering (escitalopram er den virksomme enantiomeren) som må kildebelegges før den brukes i en regel. Effektkurven for SSRI-er flater ut ved omtrent 20–40 mg fluoksetinekvivalenter (Furukawa mfl. 2019).

## 4. Hvilke pasientforhold taler for hvilken strategi (punkt 2)

Tabellen er OUSFARs sammenstilling fra kildene i §3 og vedlegg A, til kontroll.

| Forhold | Taler for | Begrunnelse |
| --- | --- | --- |
| Bytte fordi effekten uteblir, vanlig poliklinisk depresjon | **A** | Ingen grunn til å holde pasienten på redusert dose av et virkningsløst legemiddel |
| Lang behandlingstid (måneder–år) | **A** framfor B | Det nye SSRI-et demper seponeringssymptomene; B innebærer en nedtrapping som er for rask etter lang bruk |
| Høy dose av det gamle (escitalopram 20 mg, citalopram 40 mg) | A med sertralin 50 mg og planlagt økning, eller A med kort reduksjon først | Høyere doser øker både serotonerg risiko og risikoen for seponeringssymptomer (SPS); se beslutning D-K2-3 |
| Bytte på grunn av plagsomme, doseavhengige bivirkninger | A, eventuelt B | Rask avslutning av det gamle; B kan passe når pasienten selv ønsker å gå ned før byttet |
| Tidligere seponeringsplager ved dosereduksjon eller bytte | Individuell plan nå; A kan vurderes senere | Tidligere symptomer forutsier nye (Keks; NICE 1.4.15); B er minst egnet, og A er ikke vurdert for denne gruppen (D-K2-4) |
| Høy risiko for tilbakefall, alvorlig sykdom, nylig selvmordsrisiko | C eller individuell plan, med spesialist | Keks: kryssnedtrapping ved høy tilbakefallsrisiko. SPS: komplekse bytter med spesialistråd |
| Andre serotonerge legemidler (for eksempel tramadol, triptaner, linezolid, litium), mistenkt serotonerg toksisitet | D eller ingen standardplan | Samtidig eksponering bør unngås |
| Fra fluoksetin, til/fra MAO-hemmer | Ikke i K2 | Lang eliminasjon / spesialisthelsetjenesten (NICE 1.9.5) |
| Over 65 år, nedsatt leverfunksjon | Ingen standardplan nå | Egne doser og hyponatremirisiko i preparatomtalene; avgrensningen fra v2 beholdes. 65-årsgrensen: v2 er godkjent for «18–65 år», mens regelens unntak gjelder «over 65 år» og den nyere katalogen spør «65 år eller eldre». Om en pasient på nøyaktig 65 år er med, er uavklart (P0-rapporten §4 b) og avgjøres av kontrolløren (D-K2-8); forslagene her endrer ikke grensen |

## 5. Hvordan bytteverktøyet kan tilby trygge alternativer (punkt 4)

**Forslag til produktmodell:**

1. Klinikeren oppgir legemiddelpar, dose, **behandlingstid som konkrete alternativer** og **årsak til byttet**. Behandlingstid bør spørres med alternativer, for eksempel «under 8 uker / 8 uker–6 måneder / 6 måneder–2 år / mer enn 2 år / vet ikke», i stedet for ja/nei på et ubestemt «mange måneder». Kategoriene følger kildene (SPS 8 uker; Horowitz 2025: under 6, 7–24 og over 24 måneder) og gir samme svar i K1 og K2. Spørsmålsteksten eies av spor A; inndelingen er et klinisk valg til kontroll.
2. Verktøyet viser bare de **godkjente strategiene som passer** for svarene, med én linje om hvem hver passer for, og merker den anbefalte. Finnes det bare én, velges den uten ekstra klikk.
3. Etter valget stilles bare spørsmålene som gjelder den strategien.
4. Planen sier hvilken **strategitype** den bruker, og det utvidede faglige grunnlaget nevner kort de andre forsvarlige typene og hvorfor de ikke er valgt (P1-6).
5. Hver strategi er en egen regel med eget gyldighetsområde, egne positive og negative kasus og egen godkjenning av fingeravtrykk. En ny regel som skal erstatte v2, bruker `erstatter`, så den gamle trekkes i samme øyeblikk som den nye godkjennes.

**Konkret forslag for (es)citalopram → sertralin (til kontroll, ikke godkjent):**

| Strategi | Foreslått innhold (OUSFAR-vurdering) | Foreslått omfang |
| --- | --- | --- |
| **K2-A «Direkte bytte»** (ny, foreslått som standard) | Siste dose av det gamle SSRI-et dag 0; sertralin 50 mg fra dag 1; vurdering av seponeringssymptomer, serotonerg belastning og forverring etter omtrent én uke; valgt mål 50 eller 100 mg som i v2 (økning tidligst etter 14 dager, etter vurdering av effekt, behov, toleranse og seponeringssymptomer) | Voksne 18–65 år som i v2 (se D-K2-8 om 65 år), depresjon, escitalopram 10/20 mg eller citalopram 20/40 mg, tabletter, **uavhengig av behandlingstid** (eventuelt med en øvre grense, D-K2-2), normal leverfunksjon, ingen andre serotonerge legemidler |
| **K2-B «Nedtrapping, så overgang»** (dagens v2, uendret) | Som i dag | Som i dag (høyst 8 uker) |
| **K2-C «Overlapp»** (bare hvis Peder avgjør at bestillingen krever det, D-P1) | Må utledes selvstendig av kontrolløren fra uavhengige kilder; dette dokumentet foreslår ingen doser eller dager | Bare ved dokumentert høy tilbakefallsrisiko; strengere sjekk av serotonerg sammedisinering |

## 6. Pasienter som har brukt antidepressiver i mange måneder eller år (punkt 5)

### 6.1 Bytte (K2)

Med K2-A kan langvarige brukere få en komplett plan uten en langsom nedtrapping først, fordi sertralin overtar transportørhemmingen dagen etter. **Usikkerheten:** Ingen kilde vi har funnet, tallfester forekomsten av seponeringssymptomer ved direkte SSRI → SSRI-bytte hos pasienter som har brukt legemidlet i år. Forslaget forutsetter derfor:

- en vurdering etter omtrent én uke med en konkret handling ved plager: ved plagsomme seponeringssymptomer vurderes det å gå tilbake til den gamle dosen og planlegge individuelt (NICE 1.4.21, RCPsych);
- at «tidligere seponeringsplager» fortsatt stopper eller gir en egen, avklart variant (D-K2-4);
- at «vet ikke» om behandlingstid må avklares før plan, som i dag.

### 6.2 Nedtrapping (K1, M1)

Den godkjente escitalopramregelen (v14) dekker bare kort behandlingstid. Ved lang behandlingstid foreslår regelen 10 % av aktuell dose, men dråpene gir hele milligram, så planen stopper på 9 mg (K1.13): 9 → 8 mg er 11 %. En komplett plan krever en klinisk avgjørelse om én av disse:

- **K1-L1:** 10 % av aktuell dose ned til 10 mg, deretter én dråpe (1 mg) per trinn, med lengre minstetid per trinn (for eksempel 28 dager eller mer, symptomstyrt), og seponering fra 1 mg som i v14. Trinnene blir da større i prosent nettopp der RCPsych og NICE anbefaler de minste trinnene (11 % ved 9 mg, 50 % ved 2 mg). Det er en avveining mellom praktisk gjennomførbarhet og den hyperbolske modellen, og må vurderes uttrykkelig.
- **K1-L2:** Dokumentere en metode for doser under 1 mg (fortynning). Det er i dag sperret fordi ingen kilde beskriver oppmålingen.
- **K1-L3:** Fortsatt ingen plan ved lang behandlingstid, med en konkret forklaring (spor A/B). Det er dagens tilstand.

OUSFARs forslag er K1-L1 med en øvre grense for prosent per trinn under 10 mg som kontrolløren fastsetter, men dette krever både faglig kontroll og Peders avgjørelse, fordi det endrer den kliniske betydningen av «lang behandlingstid».

## 7. Utvide dekningen uten å svekke kontrollen (punkt 6)

- **Én strategi = én regel = ett fingeravtrykk.** Ingen generell «SSRI-bytteprotokoll» (kontrollørens avgrensning 05.11.2026 gjelder fortsatt).
- **FEST:** Hver ny regel bruker bare kontrollerte, markedsførte norske tabletter uten godkjenningsfritak (escitalopram 5/10/20 mg, citalopram 10/20/40 mg, sertralin 50/100 mg; FEST-uttrekket 03.11.2026). Citalopram finnes ikke som flytende form i FEST, og sertralinkonsentrat er sperret (kildematrisen). FEST eldre enn 48 timer og manglende styrke stopper som i dag.
- **Sikkerhetssperrer beholdes:** alder, lever, fluoksetin og MAO-hemmere, andre serotonerge legemidler, ukjente svar, nødstopp og administratortilgang.
- **Kasus ved grensene** for hver ny regel, i tillegg til P0-forløpene (vedlegg B): behandlingstid i hver kategori og «vet ikke», alder 64, 65 og 66 år, hver godkjent startdose og nærmeste ikke-godkjente (15 mg, 30 mg), hvert mål, og alle stoppgrunner.
- **Ingen aktivering uten godkjenning:** En ny regel legges inn med status til faglig kontroll; den gamle står til den nye er godkjent og erstatter den.

## 8. Beslutninger

**Til Peder (produktformål):**

| Nr. | Spørsmål | Anbefaling |
| --- | --- | --- |
| D-P1 | Krever bestillingen at bytteverktøyet kan gi en overlappende overgang mellom to SSRI-er (som Psychiatrienets type), eller holder det med kildebaserte, tydelig merkede strategier der direkte bytte er standard? (P1-2) | Direkte bytte som standard, med strategien tydelig merket. Overlapp mellom to SSRI-er har svak uavhengig støtte og høyere serotonerg belastning; den kan legges til senere for høy tilbakefallsrisiko hvis du ønsker det |
| D-P2 | Skal verktøyet tilby flere godkjente strategier å velge mellom, med en kort forklaring av hvem hver passer for (P1-1 alternativ D)? | Ja, men bare de som passer for svarene, og uten ekstra klikk når bare én passer (§5) |
| D-P3 | Skal pasienter med lang behandlingstid prioriteres i neste kliniske runde, for både bytte og nedtrapping (P1-4, M1)? | Ja; det er den vanligste situasjonen og den største årsaken til at verktøyene ikke gir plan |

**Til kontrolløren (klinisk substans):**

| Nr. | Spørsmål | OUSFARs forslag |
| --- | --- | --- |
| D-K2-1 | Er direkte bytte (K2-A) forsvarlig som standard for (es)citalopram → sertralin hos voksne 18–65 år med depresjon (samme aldersomfang som v2)? | Ja, med vurdering etter én uke og individuell tilpasning ved plager (SPS, Keks) |
| D-K2-2 | Skal K2-A gjelde uavhengig av behandlingstid, eller ha en øvre grense (for eksempel 2 år) til mer erfaring finnes? | Uavhengig av behandlingstid, men med tydeligere oppfølging etter mer enn 2 år; kontrolløren avgjør om en øvre grense trengs |
| D-K2-3 | Fra escitalopram 20 mg eller citalopram 40 mg: sertralin 50 mg dag 1 og valgt økning til 100 mg tidligst etter 14 dager (som v2), eller 100 mg fra dag 1 (doseekvivalent)? | 50 mg dag 1 (preparatomtalens startdose, nær platået for transportørbinding, lavere serotonerg risiko), med økning etter vurdering. Om økningen kan komme etter 7 dager (Zoloft: minst én uke mellom endringer), er et eget valg |
| D-K2-4 | Kan pasienter med tidligere seponeringsplager få K2-A, eller skal de fortsatt stoppe? | Fortsatt stopp i første versjon; vurderes på nytt med erfaring |
| D-K2-5 | Skal K2-B (dagens v2) beholdes som valgfri strategi når K2-A godkjennes? | Ja, for pasienter som selv ønsker å redusere først, innen dagens omfang |
| D-K2-6 | (P1-3) Skal det gamle SSRI-et trappes ned før overgangen? | Ikke som standard (K2-A); bare som valgt strategi (K2-B) |
| D-K2-7 | (P1-5, K2-2b) Siste trinn ved SSRI → mirtazapin | Se §9 |
| D-K2-8 | Er en pasient på nøyaktig 65 år med i byttereglene (v2 er godkjent for «18–65 år», unntaket gjelder «over 65 år», katalogen spør «65 år eller eldre»)? | Følge v2s godkjente ordlyd «18–65 år», slik at 65 år er med og bare over 65 år stopper; K2-A arver samme grense |
| D-K1-1 | (M1) Minste trinn ved escitalopram etter lang behandlingstid | K1-L1 med øvre prosentgrense under 10 mg (§6.2) |
| D-K1-2 | (P1-4/K2-8) Én felles inndeling av behandlingstid for alle verktøyene | Ja, med konkrete alternativer (§5 punkt 1) |

## 9. Øvrige beslutningspunkter fra P0

**P1-5 / K2-2b: siste trinn ved SSRI → mirtazapin.** Mirtazapin hemmer ikke serotonintransportøren, så argumentet for direkte bytte gjelder ikke. SPS beskriver forsiktig kryssnedtrapping over 2–4 uker med tempo etter toleranse, og Keks: trapp ned SSRI-et og start mirtazapin i lav dose. SPS viser et eksempel (hentet fra et proprietært samleverk, som ikke brukes her) der SSRI-et trappes ned under laveste tablettstyrke før stopp. Alternativene:

- **M-A:** seponering fra laveste tablett (sertralin 25 mg, escitalopram 5 mg, citalopram 10 mg) etter 14 dager der, med mirtazapin i gang. Det er scenarioet som i dag står i K2-kontrollgrunnlaget.
- **M-B:** lavere trinn der et norsk preparat finnes: escitalopram dråper (1 mg per dråpe), som krever overgang fra tabletter og resept på dråper. Det finnes ingen flytende citalopram i FEST, og sertralinkonsentrat er sperret.
- **M-C:** lengre tid på laveste tablett før stopp.

**OUSFARs konkrete forslag (bare ved kort behandlingstid, til kontroll):**

| Fra | Siste trinn før stopp | Begrunnelse og forbehold |
| --- | --- | --- |
| Escitalopram | 5 mg tablett i 14 dager → dråper 3 mg i 14 dager → dråper 1 mg i 14 dager → stopp | Mindre trinn når dosen er lav (NICE 1.4.16: mindre andel ved lav dose); 14 dager per trinn er kontrollørens godkjente minstetid ved bytte (K2-1); sluttdosen 1 mg er den samme som i den godkjente K1-planen, men Peders avgjørelse om 1 mg (K1.9) gjelder bare K1 og må tas særskilt for bytte |
| Citalopram | 10 mg tablett i 28 dager → stopp | Ingen lavere norsk dose uten deling; at citalopram 10 mg kan deles, er ikke kontrollert i preparatomtalen og er derfor ikke foreslått. Siste trinn forblir 10 → 0, og den lengre holdetiden er det eneste tiltaket |
| Sertralin | 25 mg i 28 dager → stopp | Som citalopram; konsentratet er sperret |

Mirtazapin 15 mg gis fra dag 1 og økes til valgt mål dagen etter siste SSRI-dose (som K2-3). Vurdering før hvert trinn og én uke etter stopp. Kontrolløren må avgjøre om 10 → 0 mg citalopram og 25 → 0 mg sertralin er forsvarlig med mirtazapin i gang (ingen transportørhemming), eller om disse to fortsatt skal stoppe. Lang behandlingstid før mirtazapin er i praksis et nedtrappingsproblem og bør vente på avgjørelsen i §6.2.

**P1-6: vis strategitypen.** Ja (§5 punkt 4).

**P1-7: K3-omfanget** (olanzapin 10–15 mg, risperidon 2–6 mg). Dette hører til K5-D2 (antipsykotika) og er ikke vurdert her. Forslaget er å behandle det som én dosefamilie per legemiddel etter K5-D-planen, ikke som nye enkeltdoser.

**M4: automatisk valg når bare én dose er mulig.** Klinisk sett endrer det ikke doseringen, fordi klinikeren uansett bare har ett valg. Etter beslutning B3 krever det likevel en ny regelversjon. Spor B utreder det; fra et klinisk ståsted er det ingen innvending.

## 10. Hva som ikke er undersøkt

- NICE NG222 svarte 403 og er ikke lest på nytt; fakta herfra er de som allerede er registrert i OUSFAR (`nice-ng222`, kontrollert 03.11.2026). NICE CKS, Maudsley, UpToDate og CANMAT 2023 er ikke lest.
- STAR*D-protokollens fremgangsmåte ved selve overgangen (pause eller ikke) er ikke bekreftet.
- Psychiatrienet er ikke lest (se rettighetsavsnittet øverst).
- Kildene i vedlegg A som ikke er registrert i `src/verktoy/regler/kilder.ts` (SPS, Hayasaka 2015, Furukawa 2019, Henssler 2024, Kalfas 2025, Horowitz 2025), må registreres med id, versjon, dato og kontrollsum av tråden som eventuelt lager en ny regel.

## Vedlegg A: Kilder (lest 07.11.2026 der ikke annet står)

| Påstand (egne ord) | Kilde |
| --- | --- |
| Direkte bytte er normalt mulig mellom SSRI-er unntatt fluoksetin; SSRI → mirtazapin kan kryssnedtrappes forsiktig over 2–4 uker etter toleranse | NHS Specialist Pharmacy Service (SPS), «SSRIs to other antidepressants: switching in adults», publisert 17.02.2023, sist oppdatert 2024: https://www.sps.nhs.uk/articles/ssris-to-other-antidepressants-switching-in-adults/ |
| Ved direkte bytte startes det nye i vanlig terapeutisk dose dagen etter; det andre antidepressivet bør dempe seponeringssymptomene fra det første; fem strategityper | SPS, «Switching strategies for antidepressants», publisert 22.05.2024: https://www.sps.nhs.uk/articles/switching-strategies-for-antidepressants/ |
| Behandling i åtte uker eller mer og doser i øvre del av godkjent område øker risikoen for seponeringssymptomer; høye doser øker også risikoen for serotonergt syndrom; komplekse bytter med spesialistråd | SPS, «Considerations when choosing an alternative antidepressant», sist endret 2024: https://www.sps.nhs.uk/articles/considerations-when-choosing-an-alternative-antidepressant/ |
| Kontroll innen omtrent 2 uker etter oppstart (1 uke ved høyere risiko); hva som skal følges med (seponeringssymptomer, serotonergt syndrom) | SPS, «Monitoring a person during and after antidepressant switching»: https://www.sps.nhs.uk/articles/monitoring-a-person-during-and-after-antidepressant-switching/ |
| Fire strategier med risiko; direkte bytte i utvalgte tilfeller som mellom SSRI-er med kort halveringstid; kryssnedtrapping ved høy tilbakefallsrisiko; utvasking ikke nødvendig mellom citalopram, escitalopram, paroksetin og sertralin ved forsiktig bytte; seponeringssymptomer mulig etter mer enn seks uker; ikke vist at bytte til annen klasse er bedre | Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016;39:76–83 (`keks-2016`): https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/ |
| Fluoksetin 40 mg ≈ sertralin 98,5 mg ≈ escitalopram 18 mg (citalopram ikke undersøkt) | Hayasaka Y mfl. Dose equivalents of antidepressants. J Affect Disord 2015;180:179–184, doi:10.1016/j.jad.2015.03.021 |
| Effekten av SSRI-er flater ut ved omtrent 20–40 mg fluoksetinekvivalenter | Furukawa TA mfl. Lancet Psychiatry 2019;6:601–609 (sammendrag og repositorium lest) |
| Transportørbindingen flater ut rundt minste vanlige dose | Sørensen A mfl. Mol Psychiatry 2022 (`sorensen-2022`, registrert) |
| Omtrent 31 % får symptomer etter seponering av antidepressiv mot 17 % etter placebo; omtrent 15 % tilskrives legemidlet, alvorlige hos omtrent 2,8 % | Henssler J mfl. Lancet Psychiatry 2024, doi:10.1016/S2215-0366(24)00133-0 (sammendrag og omtaler lest) |
| I randomiserte studier, mest med kort oppfølging, gir seponering i snitt omtrent ett ekstra symptom den første uken | Kalfas M mfl. JAMA Psychiatry 2025, doi:10.1001/jamapsychiatry.2025.1362 (sammendrag og omtaler lest) |
| Bruk i mer enn 24 måneder: justert OR 10,4 for seponeringssyndrom og 5,2 for alvorlige symptomer sammenlignet med under 6 måneder; 7–24 måneder OR 2,8; 18 % svarprosent | Horowitz MA, Buckman JEJ mfl. Psychiatry Research 2025;350:116497 (fulltekst lest) |
| Bytte fra citalopram til sertralin, bupropion eller venlafaksin gav omtrent lik remisjon, om lag én av fire | Rush AJ mfl. N Engl J Med 2006;354:1231–1242 (sammendrag lest) |
| Raskere nedtrapping kan passe ved bytte; tidligere seponeringsplager; gå tilbake til forrige dose ved alvorlige symptomer; MAO-hemmere i spesialisthelsetjenesten | NICE NG222, anbefaling 1.4.15, 1.4.16, 1.4.21 og 1.9.5 (`nice-ng222`, fakta registrert 03.11.2026; ikke lest på nytt) |
| Kort bruk mot mange måneder eller år; små trinn etter lang bruk | RCPsych, Stopping antidepressants (`rcpsych-stopping`, registrert) |
| Sertralin startes med 50 mg; minst én uke mellom doseendringer; halveringstider; doser for eldre og ved nedsatt leverfunksjon | Preparatomtalene for Zoloft, Cipralex og Cipramil (`dmp-zoloft`, `dmp-cipralex`, `dmp-cipramil`, registrert) |

## Vedlegg B: Testforløp for en eventuell ny regel (syntetiske)

Forventet utfall er *forslaget* i dette dokumentet. Det blir fasit først når kontrolløren har godkjent strategien, og det må da kontrolleres uavhengig av regelmotoren.

| Id | Situasjon | Forventet utfall med K2-A |
| --- | --- | --- |
| P1-T01 | Escitalopram 10 mg i 2 år, manglende effekt, 45 år, ingen unntak, mål sertralin 50 mg | Komplett plan: siste escitalopram dag 0, sertralin 50 mg fra dag 1, vurdering etter én uke og ved fire uker |
| P1-T02 | Citalopram 40 mg i 6 måneder, mål sertralin 100 mg | Komplett plan: sertralin 50 mg fra dag 1, 100 mg tidligst etter 14 dager etter vurdering (D-K2-3) |
| P1-T03 | Escitalopram 20 mg i 5 uker, bivirkninger | Komplett plan med K2-A; K2-B tilbys også |
| P1-T04 | Som T01, behandlingstid «vet ikke» | Ingen plan: behandlingstiden må avklares |
| P1-T05 | Som T01, 66 år | Ingen plan: ingen godkjent standardplan over 65 år (egne doser for eldre) |
| P1-T05b | Som T01, nøyaktig 65 år | Avhenger av D-K2-8; med OUSFARs forslag komplett plan som T01 |
| P1-T06 | Som T01, tidligere seponeringsplager | Ingen plan (D-K2-4) med konkret forklaring |
| P1-T07 | Som T01, bruker tramadol | Ingen plan: andre serotonerge legemidler gjør byttet mer risikofylt |
| P1-T08 | Fluoksetin 20 mg → sertralin | Ingen plan: fluoksetin har lang eliminasjon og er ikke vurdert |
| P1-T09 | Escitalopram 15 mg | Ingen plan: startdosen er ikke vurdert (K5-D) |
| P1-T10 | Som T01, nedsatt leverfunksjon | Ingen plan: preparatomtalene krever lavere doser |
| P1-T11 | Citalopram 20 mg i 7 uker, ønsker å gå ned først | K2-B (dagens v2) og K2-A tilbys; K2-B uendret |
| P1-T12 | Som T11, 9 uker | Bare K2-A tilbys; K2-B gjelder ikke etter 8 uker |
