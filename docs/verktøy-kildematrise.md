# OUSFAR Verktøy – uavhengige kilder for K1–K4

**Status:** kildegrunnlag til bruk for trådene som lager kliniske regler (spor C–F i `docs/verktøy-klinisk-leveranseplan-2026-11.md` §6). **Ingenting her er en klinisk regel eller en faglig godkjenning.** Dokumentet sier hvilke kilder som finnes, hva de dekker, og hvilken bruksrett de har. Selve verdiene hentes fra kilden når regelen lages, og kontrolleres uavhengig (ChatGPT) sammen med regelen.

**Kontrollert:** 03.11.2026. Preparatomtalene er lastet ned samme dag; kontrollsummen er SHA-256 av PDF-filen slik den ble hentet, samme metode som i `src/verktoy/regler/kilder.ts`. For de tre som alt er registrert (Sarotex, Noritren, Cipralex tabletter), og for Xeplion og Abilify Maintena, var kontrollsummen uendret. Markedsføringsstatus og styrker er fra FEST (`fest251.zip`, endret 29.10.2026) og uttrekket i `src/data/verktoy/fest-formuleringer.json` (08.10.2026). FEST viser legemiddelopplysninger, ikke lagerstatus.

## Regler for bruk

- **Fakta med egne ord.** En regel gjengir fakta fra kilden (en dose, en frist, en metode) med egne ord og en henvisning, aldri teksten eller en tabell slik den står. Det gjelder også kilder med åpen lisens, så alle kilder behandles likt.
- **Registrering.** Tråden som lager regelen, legger kilden inn i `src/verktoy/regler/kilder.ts` i sin egen PR, med id, versjon, `hentet` og `sha256`. Forslagene til id i avsnitt 3 følger mønsteret der. Last ned på nytt den dagen regelen lages; er kontrollsummen endret, er dokumentet revidert og må leses på nytt.
- **Norsk gjennomførbarhet** kontrolleres i FEST for nøyaktig de preparatene regelen bruker: markedsføring, godkjenningsfritak, styrker, form, delbarhet og flytende former.
- **Egen vurdering.** Regelen bygger på OUSFARs egen farmakologiske og kliniske vurdering av kildene, ikke på kopierte anbefalingstekster. **Psychiatrienet** kan brukes som faglig referanse og kildehenvises da; teksten gjengis aldri. En systematisk masseoverføring av tabellsettet vurderes for seg (`docs/verktøy-p3-rettigheter.md`).
- **Mangler en kilde, sier verktøyet det.** Der ingen uavhengig kilde gir en verdi, skal regelen stoppe med en konkret grunn, ikke fylle inn en verdi.

## 1. Kildetyper og bruksrett

| Kilde | Hva den gir | Bruksrett | Hvordan OUSFAR kan bruke den |
| --- | --- | --- | --- |
| **Norske preparatomtaler (DMP)**, `produktinformasjon.legemiddelsok.no` | Dosering og titrering (pkt. 4.2), forsiktighet og seponering (4.4), interaksjoner (4.5), graviditet (4.6), farmakokinetikk (5.2), delbarhet og form (2, 3, 6.6) | Offentlige myndighetsdokumenter | **Primærkilde.** Lenken til hver preparatomtale står i FEST. |
| **EMA-produktinformasjon (EPAR)** for sentralt godkjente preparater | Det samme, på engelsk; FEST har ingen lenke til disse | Offentlige myndighetsdokumenter | **Primærkilde.** |
| **FEST (DMP)** | Markedsføring, godkjenningsfritak, styrker, former, pakninger, lenker til preparatomtaler, og DMPs interaksjonsvurderinger (`KatInteraksjon`, om lag 11 000) | Offentlige data, alt synkronisert til OUSFAR (`docs/legemiddeldata.md`) | **Primærkilde** for norske preparater og for interaksjoner i K2 og K4. |
| **Helsedirektoratet**, «Psykoselidelser – behandling» (sist faglig oppdatert 13.08.2026) | Bare overordnede anbefalinger: antipsykotika tilbys, fortsatt behandling, depot kan tilbys dem som har tålt antipsykotika. **Ingen doser, bytter eller seponering.** | Åpne data (API under NLOD) med krav om kildeangivelse | Norsk ramme for K3, ikke grunnlag for doser. Depresjons- og bipolarretningslinjene er **arkivert** og er ikke gjeldende. |
| **NICE** NG222 (depresjon), NG215 (avhengighets- og seponeringslegemidler), CG178 (psykose), CG185 (bipolar) | Anbefalinger om nedtrapping, bytte, depot og monitorering | Bruk **utenfor Storbritannia** av NICEs innhold krever lisens og betaling, unntatt personlig studie («Reusing our content», lest 03.11.2026) | Bare fakta med egne ord og lenke, aldri tekst eller tabeller. NG222 er alt registrert (`nice-ng222`). |
| **RCPsych**, «Stopping antidepressants» | Trinnstørrelse og tempo etter risiko | Offentlig nettside | Registrert (`rcpsych-stopping`). |
| **Australian Prescriber** (Keks 2016 og 2019) | Strategier for bytte og seponering av antidepressiva og antipsykotika | Fri fulltekst; 2019 under CC BY-NC-ND 4.0 | Registrert (`keks-2016`, `keks-2019`). |
| **CANMAT 2023**, depresjon (Lam et al., Can J Psychiatry 2024;69:641–687, PMC11351064) | Behandlingsvalg, utilstrekkelig respons og bytte | CC BY | Ny. |
| **CANMAT/ISBD 2018**, bipolar (Yatham et al., Bipolar Disord 2018;20:97–170, PMC5947163) | Kombinasjoner og tilleggsbehandling ved bipolar lidelse, monitorering | CC BY-NC-ND | Ny; viktig for K4. |
| **BAP 2016**, bipolar (Goodwin et al., J Psychopharmacol 2016;30:495–553, PMC4922419) | Det samme, britisk | Fri fulltekst, ingen åpen lisens oppgitt | Ny; bare fakta med egne ord. BAP 2015 (depresjon) og BAP 2020 (schizofreni) har ingen fri fulltekst i Europe PMC. |
| Primær- og oversiktslitteratur (Horowitz og Taylor 2019, Sørensen 2022 m.fl.) | Begrunnelse for hyperbolsk nedtrapping og reseptorbinding | Varierer | Registrert (`horowitz-2019` bare sammendrag, `sorensen-2022` CC BY). Cerovecki et al., CNS Drugs 2013 (seponering og rebound ved bytte av antipsykotika) har ingen fri fulltekst. |
| **Proprietære samleverk:** Maudsley Prescribing Guidelines og Maudsley Deprescribing Guidelines (Wiley), Felleskatalogen, Norsk legemiddelhåndbok, BNF | Ferdige tabeller for bytte og nedtrapping | Alle rettigheter forbeholdt | Kan brukes som faglig referanse med kildehenvisning, men tabellene overføres ikke systematisk, av samme grunn som for Psychiatrienet. Verdiene i en regel kontrolleres mot en primærkilde over. |
| Psychiatrienet | Switchtabellene | Ingen lisens | Faglig referanse med kildehenvisning. Teksten gjengis aldri, og ingen masseoverføring uten tillatelse eller konkret juridisk avklaring (`docs/verktøy-p3-rettigheter.md`). |

## 2. Hva hvert verktøy trenger, og hvor det finnes

### K1 – Trappe ned antidepressiv

| Trenger | Uavhengig kilde | Merknad |
| --- | --- | --- |
| Trinnstørrelse, tempo og symptomstyrt oppfølging | `rcpsych-stopping`, `nice-ng222` 1.4.12–1.4.21, `horowitz-2019`; NG215 avsnitt 1.5 (ny) | NG222 1.4.18 omtaler fluoksetin særskilt. |
| Startdose, dosegrenser og seponering per stoff | Preparatomtalene pkt. 4.2 og 4.4; 15 alt registrert | |
| Lave doser og siste trinn | Cipralex dråper 20 mg/ml, **1 dråpe = 1 mg** (`dmp-cipralex-draper`, ny); tablettstyrker og delbarhet i FEST og preparatomtalene | Zoloft konsentrat er fortsatt sperret fordi oppmålingen ikke er dokumentert. Et siste trinn som ikke kan doseres med et norsk preparat, må stå som grense, ikke som et nulltrinn. |
| Reseptorbinding som begrunnelse for ikke-lineære trinn | `sorensen-2022` | |

**Først å se på:** amitriptylin, nortriptylin og escitalopram (VDK-3), der preparatomtalene og de norske styrkene (Sarotex 10 og 25 mg, Noritren 10 og 25 mg, Cipralex tabletter og dråper) gir flere gjennomførbare trinn. Kontrollsummene for disse tre preparatomtalene er uendret siden 28.10.2026.

### K2 – Bytte antidepressiv

| Trenger | Uavhengig kilde | Merknad |
| --- | --- | --- |
| Strategi (direkte bytte, kryssnedtrapping, utvasking) | `keks-2016`, `nice-ng222` 1.9.5 og 1.9.9; CANMAT 2023 (ny) | NG222 1.9.5: bytte til eller fra MAO-hemmer skjer i eller med råd fra spesialisthelsetjenesten. |
| Utvaskingstider og kontraindiserte kombinasjoner | Preparatomtalene pkt. 4.3 og 4.5 (fluoksetins lange eliminasjon, MAO-hemmere: `dmp-aurorix`, `emc-nardil`) | Fenelzin og tranylcypromin finnes bare på godkjenningsfritak. |
| Interaksjoner i overlappsperioden | DMPs interaksjoner i FEST | Allerede i OUSFAR (`les_interaksjoner`). |
| Oppstart og opptrapping av det nye stoffet | Preparatomtalene pkt. 4.2 | Alt registrert for de vanlige SSRI-ene, mirtazapin, venlafaksin, duloksetin, vortioksetin, bupropion og agomelatin. |

**Først å se på:** sertralin → mirtazapin (godkjent bare startforløpet), escitalopram og citalopram → mirtazapin (VDK-2 forslag 5), og SSRI → SSRI der preparatomtalene gir både avslutning og oppstart.

### K3 – Bytte antipsykotikum

| Trenger | Uavhengig kilde | Merknad |
| --- | --- | --- |
| Strategier for peroralt bytte, seponering og rebound | `keks-2019`; preparatomtalene pkt. 4.2 og 4.4 | Ingen fri, autoritativ kilde gir ferdige byttetabeller. Hver kombinasjon må bygges fra preparatomtalene til begge stoffene. |
| Peroral → depot, dose og overlapp | Preparatomtalene pkt. 4.2 (tabell under) | Hvert depotpreparat har sin egen regel. |
| Depot → depot | Trevicta: 3,5 ganger siste Xeplion-dose (EPAR); Abilify Maintena 400 → 960 mg (`ema-abilify-maintena`) | Krever preparatvalg i verktøyet (VDK-2, «depot til depot»). |
| Norsk ramme | Helsedirektoratet, «Psykoselidelser – behandling» (depot kan tilbys); NICE CG178 1.5.6 | Ingen doser. |

Hva preparatomtalene for de norske depotpreparatene sier om overgang fra peroral behandling (kontrollert i teksten 03.11.2026; ikke vurdert klinisk):

| Depotpreparat (markedsført) | Overgang fra peroral behandling ifølge preparatomtalen | Praktisk forhold i Norge |
| --- | --- | --- |
| Xeplion, Paliperidon Zentiva, Palmeux (paliperidonpalmitat, månedlig) | Oppstartsregime med to injeksjoner (`ema-xeplion`, godkjent regel) | Peroral paliperidon (Invega) bare på godkjenningsfritak; overgang fra peroral risperidon er den vanlige veien (VDK-2 forslag 3). |
| Trevicta (paliperidonpalmitat, hver 3. måned) | Bare fra månedlig paliperidonpalmitat, 3,5 ganger siste dose | |
| Abilify Maintena 400 mg (månedlig) og 720/960 mg (hver 2. måned) | Oppstart med peroral overlapp eller to injeksjoner (`ema-abilify-maintena`, godkjent regel) | |
| Risperdal Consta (hver 2. uke) | Peroral dekning i tre uker etter første injeksjon | |
| Okedi (risperidon, hver 28. dag) | Startdose etter tidligere peroral risperidondose (75 mg ved 3 mg/døgn, 100 mg ved 4 mg/døgn eller mer), om lag 24 timer etter siste perorale dose; verken ladningsdose eller peroral tilleggsdose. Pasienter uten etablert risperidonbehandling titreres først peroralt | |
| Zypadhera (olanzapinpamoat) | Dosetabell fra peroral olanzapindose; overvåking etter injeksjon | |
| Haldol Depot (haloperidoldekanoat) | 10–15 ganger den perorale døgndosen | Haldol tabletter er bare markedsført som 1 mg; andre styrker på godkjenningsfritak. |
| Fluanxol Depot (flupentiksoldekanoat) | 4 ganger peroral døgndose hver 2. uke, eller 8 ganger hver 4. uke | |
| Cisordinol Depot (zuklopentiksoldekanoat) | 8 ganger peroral døgndose hver 2. uke, eller 16 ganger hver 4. uke | Cisordinol-Acutard er et eget, middels langtidsvirkende preparat. |
| Trilafon Dekanoat (perfenazindekanoat) | Se preparatomtalen | Peroral perfenazin bare på godkjenningsfritak. |

### K4 – Kombinere stemningsstabiliserende (eksisterende → legges til)

| Trenger | Uavhengig kilde | Merknad |
| --- | --- | --- |
| Opptrapping av det nye stoffet, justert etter det eksisterende | Preparatomtalen for Lamictal (`dmp-lamictal`, ny): tabell 3 gir opptrapping ved bipolar lidelse i tre varianter – med valproat, med legemidler som induserer lamotrigin (blant annet karbamazepin), og uten noen av dem; tabell 5 gir justering når et annet legemiddel legges til lamotrigin | Det mest direkte grunnlaget i hele K4. Lamictal er bare markedsført som tygge-/dispergerbare tabletter (2, 5, 25, 50, 100 og 200 mg); vanlige lamotrigintabletter bare på godkjenningsfritak. |
| Litium: oppstart, serumkonsentrasjon og prøvetidspunkt | Lithionit (`dmp-lithionit`, ny) og Carblit (`dmp-carblit`, ny): dosen styres etter serumlitium tatt 12 timer etter siste dose | |
| Valproat: dosering, interaksjoner, svangerskapsforebyggende program | Orfiril (`dmp-orfiril`, ny) | |
| Karbamazepin som induktor | Tegretol og Tegretol Retard (`dmp-tegretol`, `dmp-tegretol-retard`, nye) | Indikasjon ved akutt mani og profylakse ved bipolar lidelse. |
| Antipsykotika som eksisterende behandling eller tillegg | Preparatomtalene for aripiprazol, kvetiapin og olanzapin (registrert), risperidon (`dmp-risperdal`, ny) og ziprasidon | |
| Interaksjoner og forsiktighet | DMPs interaksjoner i FEST; pkt. 4.5 i begge preparatomtalene | Dobbeltkontroll er krav i leveranseplanen §5. |
| Monitorering og når en kombinasjon er rimelig | NICE CG185 1.8 og 1.10 («Using lithium», «Using valproate», «Using lamotrigine»); CANMAT/ISBD 2018; BAP 2016 | |
| Gabapentin og topiramat | Neurontin og Topimax (nye): ingen indikasjon ved bipolar lidelse | Kan bare gi interaksjons- og forsiktighetstekst, ikke en doseplan, uten en annen kilde. |

**Først å se på:** eksisterende valproat → lamotrigin legges til, og eksisterende litium → lamotrigin legges til. Begge har opptrappingen direkte i én norsk preparatomtale og norske styrker som dekker hvert trinn. Eksisterende karbamazepin → lamotrigin legges til har samme grunnlag, men karbamazepin skal også ses mot andre legemidler pasienten bruker.

## 3. Preparatomtaler kontrollert 03.11.2026, ikke registrert ennå

Hentet 03.11.2026 kl. 16:50 UTC (DMP) og 16:55 UTC (EMA). «Oppdatert» er datoen i pkt. 10 i preparatomtalen; for EMA er det tidspunktet filen sist ble endret hos EMA.

| Forslag til id | Preparatomtale | Adresse | Oppdatert | SHA-256 |
| --- | --- | --- | --- | --- |
| `dmp-lamictal` | Lamictal (lamotrigin) tygge-/dispergerbare tabletter | DMP `0000-08198` | 30.06.2025 | `85fd47d3d8ac3e1310238c34f080f58b6276402b8333871e6cb0b31bdbd4529d` |
| `dmp-lithionit` | Lithionit (litiumsulfat) depottabletter | DMP `0000-05559` | 08.07.2026 | `f553e4364b09ac0342386d768aa5e3b3bbebb72697eb57379a062ce5bad4f77f` |
| `dmp-carblit` | Carblit (litiumkarbonat) tabletter | DMP `23-15504` | 12.12.2024 | `d7c4bbe0010c16a4ea3c19a270d108661171a4138c73a00b17e8c3ef88fcf5b5` |
| `dmp-orfiril` | Orfiril (valproat) enterotabletter | DMP `0000-06564` | 03.09.2026 | `694efe92738bbffb3fb6a0b94ada793803361b3c561b613437c860cfc41243e4` |
| `dmp-orfiril-mikstur` | Orfiril (valproat) mikstur | DMP `0000-06563` | 03.09.2026 | `de5a6df16bd0bff5dc6a215d4b643869150eb3b956860e11780c65457ad8ddbe` |
| `dmp-tegretol` | Tegretol (karbamazepin) tabletter | DMP `0000-04851` | 21.09.2026 | `5b2276592c928272dbd68fd8aa426698fb8b91733f8d57bf855a13329a3dfe96` |
| `dmp-tegretol-retard` | Tegretol Retard (karbamazepin) depottabletter | DMP `0000-07239` | 21.09.2026 | `18e1e6dfb35db1ee4f4bfb80fb3385a809540ac35eaa0a8aaab272d3d319cfe5` |
| `dmp-topimax` | Topimax (topiramat) tabletter | DMP `1995-00790` | 03.05.2024 | `990792d03b54aeb906d837d8e55e4f29927c54a3fbcaf27076264f7b07999aea` |
| `dmp-neurontin` | Neurontin (gabapentin) kapsler | DMP `0000-08220` | 29.01.2026 | `674e7202efd087cc4549d6927f58deaf249ad8c092880682af28b338a9d7cd97` |
| `dmp-risperdal` | Risperdal (risperidon) tabletter | DMP `0000-08037` | 19.08.2022 | `dd2ce96c875c8f820a1c394533ca20fea2f9f7140f6640db9ff11e1af3a0bba2` |
| `dmp-risperdal-mikstur` | Risperdal (risperidon) mikstur 1 mg/ml | DMP `1995-00684` | 05.06.2026 | `b116a728ab221ec9fde45cc8268f80e46d1d14f02eebe93ce3d02f1d81d9eba6` |
| `dmp-risperdal-consta` | Risperdal Consta (risperidon depotinjeksjon) | DMP `2001-09858` | 11.05.2021 | `f8083addc64cc2958b21d59f512bab97afa33d6b5c9283c80c6f27fe8a4f32a8` |
| `dmp-haldol-depot` | Haldol Depot (haloperidoldekanoat) | DMP `0000-06767` | 15.12.2023 | `259383c97b8ab69d5088853cf148a542d2a9e2a6504bbad2b886cbb572395e85` |
| `dmp-fluanxol-depot` | Fluanxol Depot (flupentiksoldekanoat) | DMP `0000-05934` | 04.08.2025 | `c3f6bc0d6135279e9dbcd9fa298dede55f79bc28aeebcc4ff03bdd6a052e8636` |
| `dmp-cisordinol-depot` | Cisordinol Depot (zuklopentiksoldekanoat) | DMP `0000-06226` | 16.02.2026 | `f21dc36806b839eaddd102256473b7460d264e08407d95ff5447613563dce942` |
| `dmp-cisordinol-acutard` | Cisordinol-Acutard (zuklopentiksolacetat) | DMP `0000-07543` | 16.02.2026 | `3b458fba6b0b08c1510658cc80fd3db44341d8056e2b393a4f7a261b9c71579b` |
| `dmp-trilafon-dekanoat` | Trilafon Dekanoat (perfenazindekanoat) | DMP `0000-07128` | 07.10.2021 | `51b43ee140c20db77443d03910e1cbacc93beea388fdaec74948c714e62b4c95` |
| `dmp-leponex` | Leponex (klozapin) tabletter | DMP `0000-07578` | 24.02.2026 | `0b56419e1fff0319fe477b1dca1e037274e0fc8148081ab9635154a246e6e269` |
| `dmp-solian` | Solian (amisulprid) tabletter | DMP `1997-03714` | 17.08.2022 | `9b14d05e63c9d6ce120a897c3e3d459b11ee0d31770d7b073c4311c51341cc95` |
| `dmp-cipralex-draper` | Cipralex (escitalopram) dråper 20 mg/ml | DMP `07-4892` | 02.05.2024 | `8cdc32851beab96c1032d10e444ab372186525790f32dd284dec5ec7a78e68ee` |
| `ema-zypadhera` | Zypadhera (olanzapinpamoat depotinjeksjon) | EMA `zypadhera` | 08.10.2026 | `5eee4543487d58354518319e0b1b7414c5442797ce74794c52c9bfc9f51dcbf7` |
| `ema-trevicta` | Trevicta (paliperidonpalmitat, hver 3. måned) | EMA `trevicta` | 08.10.2026 | `99ebe823a4176eaf71ac968669b40cc1d436d37ca85db0659155fedcb56c8f2c` |
| `ema-okedi` | Okedi (risperidon depotinjeksjon) | EMA `okedi` | 08.10.2026 | `ac8b37b5f8372560baaff47a527f53c8609dd1479d84555b9228335503334046` |
| `ema-latuda` | Latuda (lurasidon) | EMA `latuda` | 08.10.2026 | `1b4eb934eea6c777e082db5accb51f11c854318bf5d2d82b61249264a6b6a684` |
| `ema-reagila` | Reagila (kariprazin) | EMA `reagila` | 08.10.2026 | `9d13d908e239f6368505bfcde6e4381ffb6295f6bc6de049f006e4abed967ec2` |
| `ema-rxulti` | Rxulti (brekspiprazol) | EMA `rxulti` | 08.10.2026 | `d060cc667cc18af4e73efacd249c6f69ccb808c8be005b26cc608ba465837472` |

DMP-adressene er `https://produktinformasjon.legemiddelsok.no/preparatomtaler/<nr>.pdf`; EMA-adressene er `https://www.ema.europa.eu/en/documents/product-information/<navn>-epar-product-information_en.pdf`, samme mønster som i `kilder.ts`.

## 4. Åpne kildehull

- **Peroral → peroral for antipsykotika:** ingen fri, autoritativ kilde gir byttetabeller. Hver kombinasjon må begrunnes fra preparatomtalene til begge stoffene og `keks-2019`, og kontrolleres for seg.
- **Seponering av antipsykotika og rebound:** Cerovecki 2013 og BAP 2020 har ingen fri fulltekst. `keks-2019` og preparatomtalene er grunnlaget inntil videre.
- **Gabapentin og topiramat i K4:** ingen bipolarindikasjon i de norske preparatomtalene; uten en annen kilde blir de bare interaksjons- og forsiktighetstekst.
- **Norsk retningslinje for depresjon og bipolar lidelse:** begge er arkivert hos Helsedirektoratet. Det finnes ingen gjeldende norsk retningslinje for disse to områdene å vise til.
- **Flytende former:** Zoloft konsentrat mangler dokumentert oppmåling; Cipralex dråper (1 mg per dråpe) og Risperdal mikstur (1 mg/ml) er dokumentert i preparatomtalene.
