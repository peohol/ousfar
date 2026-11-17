# CYPinfo som norsk farmakogenetisk kilde: kartlegging og plan

Leses før noe som har med CYPinfo å gjøre bygges: koblingen til fagsidene,
synkroniseringen av katalogen eller visningen i seksjonen «Farmakogenetikk».
Dokumentet begynte som etappe A, kartleggingen; etappene står til slutt, med
det som er bygd.
Mønstrene for datakildene står i `docs/legemiddeldata.md`, `docs/clinpgx.md`,
`docs/cpic.md` og `docs/datakilder.md`, og det som står der om prinsippene,
gjelder også her.

CYPinfo erstatter CPIC, som er stanset siden 6.11.2026 og skal erstattes av
norske farmakogenetiske data (`src/datakilder/stans.ts`). Ingenting i denne
kartleggingen tar CPIC i bruk igjen.

**Status:** etappe A (kartleggingen), B (katalogen i OUSFAR) og D (visningen
på fagsidene, bare for systemarkitektene) er bygd. Etappe C, oppslaget etter
en pasients resultat, bygges ikke (se under). E gjenstår: den kliniske
kontrollen og visningen for alle.

**Avklart av Peder 17.11.2026:** OUSFAR skal vise hvordan de ulike genotypene
(fenotypene) påvirker legemidlene, slik CYPinfo beskriver det, og ikke være et
verktøy der noen legger inn en pasients genotype; det er CYPinfo selv. Det
trengs derfor ingen personvernvurdering, og ingen skriftlig tillatelse, siden
CYPinfo driftes av Peders egen avdeling. CYPinfo vises for systemarkitektene
først.

## Kort oppsummert

- CYPinfo (cypinfo.no) har et åpent JSON-API uten nøkkel: legemiddelkatalogen
  (75 legemidler), gentabellen (10 gener, 176 genotyper) og rapporten med
  anbefalingen for et legemiddel ved et kjent resultat.
- **Anbefalingene slås opp på fenotypen**, ikke genotypen: «CYP2D6 Redusert
  enzymaktivitet», ikke «*1/*4». Gentabellen oversetter genotypen.
- **CYPinfo oppgir FEST-ID-en** (virkestoffet) for 60 av de 75 legemidlene, den
  samme ID-en OUSFAR kobler fagsidene til FEST med. Det gir en sikker kobling
  for 33 fagsider uten noen ny redaksjonell kobling.
- Alle legemidler med en genavhengig anbefaling som har en fagside i OUSFAR,
  har FEST-ID i CYPinfo. De 15 uten FEST-ID er legemidler CYPinfo sier ikke har
  en relevant gen–legemiddel-interaksjon.
- Løsningen: katalogen, gentabellen og hver anbefaling CYPinfo kan gi, med
  nivået og teksten, synkroniseres ukentlig til OUSFAR. Fagsidene viser for
  hvert legemiddel CYPinfos anbefaling ved hver fenotype, med lenke til
  CYPinfo for en pasients eget resultat. Tekstene redigeres aldri i OUSFAR.
- Funn som må tas hensyn til: enkelte feil ignoreres i stillhet (ukjente ID-er
  gir et tomt svar), oversettelsesendepunktet feiler for 43 av 176 genotyper,
  ATC-kodene har formfeil og én feil kode, og API-et har ingen versjon, dato
  eller lisens.
- Før visningen slås på for alle, kontrolleres den klinisk (etappe E).

## Kilden

| | |
| --- | --- |
| Kilde | [CYPinfo](https://cypinfo.no), utarbeidet ved Avdeling for farmakologi, Oslo universitetssykehus, sammen med de farmakologiske avdelingene ved St. Olavs hospital og Vestre Viken HF. Støttet av Legeforeningen |
| Faglig grunnlag | Rapporten «Harmonisering av farmakogenetiske analyser i Norge» (Norsk forening for klinisk farmakologi), CPIC, DPWG, PharmGKB, preparatomtaler og litteratur, tolket for norske forhold (siden «Om CYPinfo») |
| API | `https://cypinfo.no/api`, dokumentert på [cypinfo.no/dokumentasjon](https://cypinfo.no/dokumentasjon) (seks endepunkter, uten skjema) |
| Teknikk | Next.js på Vercel, innholdet i Sanity (svarene har `tags: ["sanity", …]`). API-funksjonene kjører i Vercels region `iad1` (USA, ifølge `x-vercel-id`) |
| Tilgang | Åpent, uten nøkkel og uten innlogging |
| Lisens og vilkår | Ikke oppgitt noe sted på nettstedet eller i API-et (kontrollert 16.11.2026). Se «Uavklart» |
| Kontakt ved feil | hjelp@fjellvann.no (står i dokumentasjonen) |

CYPinfo sier selv at anbefalingene bare er veiledning, at legemiddelinteraksjoner
ikke er med, og at det kan finnes legemidler med farmakogenetisk betydning som
ikke er tatt med.

## API-et, verifisert

Kontrollert 16.11.2026 med ekte kall fra OUSFARs utviklingsmiljø: rundt 300 kall,
høyst ett i sekundet, bare med syntetiske kombinasjoner (gen og fenotype, aldri
noe om en person). Dokumentasjonen beskriver bare adressene; formen på
forespørslene er funnet ut fra valideringsmeldingene og prøvd ut.

### Fellestrekk

- Svarene er JSON. `POST` krever `Content-Type: application/json` og en kropp
  med `{"data": …}`.
- **Ingen CORS-hoder** på API-et (forespørsel fra en annen opprinnelse får verken
  `Access-Control-Allow-Origin` på svaret eller på `OPTIONS`). Nettleseren kan
  altså ikke kalle CYPinfo direkte fra ousfar.vercel.app; kallene må gå fra
  OUSFARs server.
- `Cache-Control: public, max-age=0, must-revalidate`, ingen `ETag` på
  API-svarene, ingen versjon, release eller dato for innholdet.
- Ingen rate limit-hoder, og ingen 429 ved ett kall i sekundet. Grensen er ikke
  prøvd ut med vilje. OUSFAR holder seg til høyst ett kall i sekundet i
  synkroniseringen.
- Svartid (medianen, 95-persentilen): `GET /legemiddel` og `/gene` 0,5–1,2 s,
  `POST /legemiddel/rapport` 0,6 s og 0,8 s (høyst 1,1 s), `POST /result` 0,1 s
  og 0,3 s.
- ID-ene er Sanity-dokument-ID-er (UUID) og har vært stabile mellom kallene.
  Om de er stabile over tid, er ikke oppgitt.

### `GET /api/legemiddel` — katalogen

```json
{
  "data": [
    {
      "_id": "000b6b7c-9a13-44a2-8592-727bf4522ef1",
      "name": "aripiprazol",
      "atcCodes": ["N05AX12"],
      "festCodes": ["ID_4596EE8B-CD03-43E0-AEA8-CDB60778EA43"],
      "brandNames": ["Abilify"],
      "category": { "_id": "e1552c06-…", "name": "Antipsykotika" },
      "therapyArea": { "_id": "a4fdecff-…", "allowSelectAll": null, "name": "Psykiatri" }
    }
  ],
  "sourceMap": null,
  "tags": ["sanity", "sanity:s1:MePF2g", …]
}
```

- 75 legemidler. Navnet er norsk og stort sett med liten forbokstav (unntak:
  «5-FU», «Mavakamten»).
- `festCodes`: én FEST-ID for 60, tom for 15. Alle de 60 finnes i OUSFARs
  FEST-kopi som moderstoff som ikke er utgått, aldri som salt.
- `atcCodes`: én kode for 67, flere for 8. **Formfeil:** mellomrom inne i koden
  og harde mellomrom (U+00A0) foran, f.eks. ibuprofen
  `["C01E B16", "\u00a0\u00a0M01A E01", …]`, også for kodein, tramadol,
  simvastatin, takrolimus, palonosetron, esketamin og 5-FU. Koden må
  normaliseres (alt mellomrom fjernet) før den sammenlignes.
- **Feil ATC-kode:** kariprazin har `N05AX16`, som er brekspiprazols kode
  (kariprazin er `N05AX15`). ATC alene er derfor ikke nok til en kobling.
- «5-FU» (FEST-ID fluorouracil) omfatter også tegafur og kapecitabin
  (`brandNames` Teysuno, Capecitabine; `similarNames: ["tegafur"]` i rapporten).
- Terapiområdene: Psykiatri 41, Hjerte/kar 7, Protonpumpehemmere, Kvalmestillende,
  NSAID og ADHD 4 hver, Kreft 3, Antiepileptika 2, Immunsuppresjon 2,
  Opioider 2, Antiinfektiva 1, Andre 1.

### `GET /api/legemiddel/{id}` — ett legemiddel

Samme innhold, men **andre feltnavn**: `atcCode` og `festCode` (entall, men
fortsatt lister), og `therapyArea` uten `allowSelectAll`. En ukjent ID gir
`200` med `{"data": null, …}`, ikke 404. OUSFAR trenger ikke dette endepunktet:
katalogen har alt.

### `GET /api/gene` — gentabellen

```json
{
  "data": [
    {
      "gene": "CYP2D6",
      "geneId": "cyp2d6",
      "allele1": "*1",
      "allele2": "*4",
      "alleles": ["*1", "*4"],
      "isDuplicate": false,
      "phenotype": "Redusert enzymaktivitet",
      "phenotypeId": "5d907c94-1890-49c6-a589-ffe170405b47"
    }
  ]
}
```

- 176 rader: CYP2D6 90, TPMT 21, CYP2C19 15, DPYD 15, CYP2B6 10, UGT1A1 10,
  CYP2C9 6, CYP3A5 3, SLCO1B1 3, VKORC1 3.
- `geneId` er sluggen genet har i rapporten. Den er med små bokstaver, **unntatt
  `VKORC1`**, og må brukes nøyaktig som den står.
- `isDuplicate` er genduplikasjon (flere kopier). Den er `true`/`false` bare for
  CYP2D6 og `null` ellers. CYP2D6 *1/*1 er «Normal enzymaktivitet» uten
  duplikasjon og «Økt enzymaktivitet» med.
- **`phenotypeId` er fenotypen, ikke genotypen, og er felles for alle gener**:
  «Normal enzymaktivitet» har samme ID (`60850bc1-…`) for CYP2B6, CYP2C19,
  CYP2C9, CYP2D6, DPYD, TPMT og UGT1A1. Det er paret gen + fenotype-ID som
  identifiserer et resultat.
- Fenotypene (38 par gen + fenotype): Normal, Noe økt, Økt, Noe redusert,
  Redusert, Svært lav og Manglende enzymaktivitet; «Normal eller redusert
  enzymaktivitet» (CYP2D6 med duplikasjon av et redusert allel); SLCO1B1
  «Normal / Noe redusert / Redusert funksjon i transportpumpen OATP1B1»;
  VKORC1 «Normal / Noe økt / Økt følsomhet for warfarin»; og TPMT «Ugyldig
  fenotype» for *3B/*3C, som ingen anbefaling bruker.
- Allelnavnene er CYPinfos egne, også med forklaring i navnet
  («*4 (c.785A>G)», «TA7 (*28)», «c.-1639 A»).

### `POST /api/legemiddel/rapport` — anbefalingene

Forespørselen:

```json
{
  "data": {
    "combinations": ["cyp2d6:5d907c94-1890-49c6-a589-ffe170405b47"],
    "drugs": ["000b6b7c-9a13-44a2-8592-727bf4522ef1"]
  }
}
```

`combinations` er `"<geneId>:<phenotypeId>"`, ett per gen; `drugs` er
legemiddel-ID-ene fra katalogen. Svaret er gruppert på kategorinavnet:

```json
{
  "Antipsykotika": [
    {
      "_id": "1caa9bf6-01e1-4428-9c9f-38e77eb43a70",
      "combinations": [
        {
          "gene": { "name": "CYP2D6", "slug": "cyp2d6" },
          "result": {
            "_id": "5d907c94-1890-49c6-a589-ffe170405b47",
            "title": { "_type": "slug", "current": "Redusert enzymaktivitet" }
          }
        }
      ],
      "drug": {
        "_id": "000b6b7c-…", "name": "aripiprazol", "atcCode": "N05AX12",
        "festCode": "ID_4596EE8B-…", "brandNames": ["Abilify"],
        "category": "Antipsykotika", "therapyArea": "Psykiatri", "similarNames": null
      },
      "noRelavantGenes": null,
      "severity": "medium",
      "text": "Totalkonsentrasjonen av aktivt legemiddel (aripiprazol pluss metabolitten dehydroaripiprazol) kan være noe høyere …"
    }
  ]
}
```

- `_id` er anbefalingens ID i CYPinfo. `combinations` er genene og fenotypene
  anbefalingen gjelder, `null` når legemiddelet ikke har relevante gener.
- `noRelavantGenes` (stavet slik): `true` for de 19 legemidlene CYPinfo sier
  ikke har en relevant gen–legemiddel-interaksjon. Den anbefalingen kommer
  **uansett hvilke gener som sendes**, så lenge legemiddelet er med. Ellers
  `null`, og `false` én gang (bupropion).
- `severity` er `standard`, `medium`, `high` eller `info`. Betydningen står ikke
  i API-et, bare i forklaringen «Hva betyr symbolene?» på CYPinfos rapportside:

  | `severity` | CYPinfos farge og tekst |
  | --- | --- |
  | `info` | hvit/blå: «Lite/Ingen informasjon om metabolismevei» |
  | `standard` | grønn: «Standard dosering» |
  | `medium` | gul: «Kan ha bivirkninger/manglende effekt» («Standard dosering men obs manglende effekt/bivirkninger») |
  | `high` | rød: «Endret dosebehov eller bytte av legemiddel» |

- `drug` har andre felt enn katalogen: `atcCode` er én tekst med kodene skilt
  med komma (med de samme formfeilene), `festCode` en tekst eller `null`,
  `category` og `therapyArea` bare navnet, og `similarNames` (bare i rapporten:
  citalopram `["escitalopram"]`, 5-FU `["tegafur"]`, omeprazol `[""]`).
- `text` er ren tekst med avsnitt som `\n\n`, noen ganger med tomme avsnitt
  (`"\n\n \n\n"`). Noen tekster viser til CYPinfos eget skjema, f.eks. sertralin
  med bare CYP2C19: «Genotype av CYP2B6 … er ikke valgt i nedtrekksmeny».

**Hvordan anbefalingene velges** (prøvd ut for alle 38 par gen + fenotype mot
alle 75 legemidlene, og for alle kombinasjoner av to gener der det trengs):

- Én fenotype per gen gir én anbefaling per legemiddel som slås opp på genet.
  Alle 38 parene gir 254 ulike anbefalinger.
- **Noen legemidler slås opp på to gener samtidig** og har ingen anbefaling for
  ett gen alene: amitriptylin, doksepin, klomipramin og trimipramin (CYP2C19 og
  CYP2D6, alle 25 kombinasjoner har en anbefaling) og warfarin (CYP2C9 og
  VKORC1, alle 9). Sendes bare det ene genet, kommer **ingenting** for dem,
  uten melding.
- **Unntak, warfarin:** VKORC1 «Noe økt følsomhet» alene gir én anbefaling,
  `standard`, «Påviste genotyper tilsier normal dosering av warfarin», mens den
  samme VKORC1-fenotypen sammen med CYP2C9 Normal gir `medium`. Det må den
  kliniske kontrollen se på (etappe E).
- **Sertralin** har egne anbefalinger for CYP2C19 og CYP2B6 hver for seg, og en
  felles når begge sendes. Den felles erstatter da de to enkle. Svaret avhenger
  altså av hvilke gener som er sendt med, og OUSFAR kan ikke sette sammen
  enkeltsvarene selv.
- Sendes to fenotyper for samme gen, kommer anbefalingene for begge. OUSFAR må
  selv sørge for høyst én per gen.
- Gener som ikke gjelder legemiddelet, ignoreres.

Feiltilfellene:

| Forespørsel | Svar |
| --- | --- |
| `{}` eller uten `data` | 400 `{"error":[{"code":"invalid_type","path":["data"],"message":"Required"}]}` |
| `data` uten `combinations`/`drugs` | 400, én Zod-feil per manglende felt |
| Et element som ikke er tekst | 400 «Mangler kombinasjon» / «Mangler legemiddel» |
| Ikke JSON | 400 med Zod-listen alene, **uten** `{"error": …}` rundt |
| Tomme lister | 200 `{}` |
| Ukjent legemiddel-ID, ukjent fenotype-ID, eller gensluggen med feil store/små bokstaver (`CYP2D6`, `vkorc1`) | **200 `{}`** eller svar uten det ukjente, ingen feilmelding |
| `PUT` | 405 |

Et tomt svar betyr altså enten «ingen anbefaling» eller «noe var feil i
forespørselen», og CYPinfo kan ha endret en ID siden OUSFAR sist hentet
katalogen. OUSFAR kontrollerer derfor alle ID-ene mot sin kopi før kallet, og
behandler et tomt svar for en kombinasjon kopien sier har en anbefaling, som
avvik i kilden, ikke som «ingen anbefaling» (se «Visningen»).

### `POST /api/gene` — anbefalingene for alle legemidler

`{"data": {"combinations": ["cyp2d6:<phenotypeId>"]}}` gir svaret i samme form
som rapporten, for alle legemidlene der genet har betydning, men tilsynelatende
bare de som ikke er `standard` (CYP2D6 Normal ga `{}`). OUSFAR trenger det ikke:
rapporten med legemiddelet gir det samme for ett legemiddel.

### `POST /api/result` — fra genotype til fenotype

```json
{ "data": { "gene": "cyp2d6", "combination": ["*4", "*1"], "isDuplicate": false } }
```

gir `{"gene": "CYP2D6", "combinations": ["*1", "*4"], "isDuplicate": false,
"result": "5d907c94-…"}`, der `result` er fenotype-ID-en. Rekkefølgen på
allelene spiller ingen rolle.

**Ikke til å stole på:** alle 176 radene i gentabellen ble sendt tilbake hit.
133 ga samme fenotype som tabellen, men **43 ga 500 med tomt svar**: alle tre
VKORC1 og SLCO1B1, 12 av 15 DPYD, 15 av 21 TPMT og alle 10 UGT1A1. Ukjente
alleler, ett allel, feil gen og `VKORC1` gir også 500. Manglende `gene` gir 400
«Mangler gene». OUSFAR oversetter derfor selv, i sin kopi av gentabellen, og
bruker ikke dette endepunktet.

## Hvordan dataene passer med OUSFAR

### Identifikatorene

| CYPinfo | OUSFAR | Bruk |
| --- | --- | --- |
| `festCodes` (FEST-ID for virkestoffet, moderstoff) | `fest_id` i `legemiddelkobling` (seksjonen «Preparater») og `legemiddeldata.virkestoff` | **Koblingsnøkkelen.** Begge kobler til moderstoffet, så saltene følger med |
| `atcCodes` | ATC fra FEST-preparatene | Bare som støtte, etter normalisering. Aldri alene (feilen for kariprazin) |
| `name` | Fagsidens navn, FEST-navnet, aliasene i `src/data/stoffregister.json` | Bare som støtte |
| legemiddel-`_id` | — | Det OUSFAR sender til rapporten |
| `geneId` + `phenotypeId` | — | Det OUSFAR sender til rapporten |
| anbefalings-`_id` | — | Sporbarheten: hvilken anbefaling som ble vist |

CYPinfo har ingen ClinPGx-ID. Koblingen avhenger altså av FEST-koblingen, ikke
av ClinPGx-koblingen i «Farmakogenetikk».

### Dekningen

Sammenlignet 16.11.2026: CYPinfos 75 legemidler mot de 128 publiserte fagsidene
(FEST-koblingene og navnene i produksjonen, lest skrivebeskyttet) og de 115
stoffene i stoffregisteret.

| Klasse | Antall | Regel |
| --- | --- | --- |
| Sikre treff | 34 legemidler → 33 fagsider | CYPinfos FEST-ID er en av FEST-ID-ene fagsiden er koblet til |
| Usikre treff | 13 legemidler → 15 fagsider | Ingen FEST-ID i CYPinfo; navnet og/eller ATC-koden passer med en fagside |
| Uten treff | 28 legemidler | Ingen fagside i OUSFAR og ikke i stoffregisteret |
| Fagsider uten CYPinfo | 81 | Ingen av CYPinfos legemidler passer |

**Sikre treff med genavhengige anbefalinger** (31):

| CYPinfo | Fagside | Gener |
| --- | --- | --- |
| amitriptylin | Amitriptylin | CYP2C19 + CYP2D6 (begge kreves) |
| aripiprazol | Aripiprazol | CYP2D6 |
| atomoksetin | Atomoksetin | CYP2D6 |
| brexpiprazol | Brekspiprazol | CYP2D6 |
| bupropion | Bupropion | CYP2B6 |
| citalopram | Citalopram | CYP2C19 |
| doksepin | Doksepin | CYP2C19 + CYP2D6 (begge kreves) |
| duloksetin | Duloksetin | CYP2D6 |
| escitalopram | Escitalopram | CYP2C19 |
| fenytoin | Fenytoin | CYP2C9 |
| fluoksetin | Fluoksetin | CYP2D6 |
| fluvoksamin | Fluvoksamin | CYP2D6 |
| haloperidol | Haloperidol | CYP2D6 |
| klomipramin | Klomipramin | CYP2C19 + CYP2D6 (begge kreves) |
| kodein | Kodein | CYP2D6 |
| metoprolol | Metoprolol | CYP2D6 |
| mianserin | Mianserin | CYP2D6 |
| mirtazapin | Mirtazapin | CYP2D6 |
| moklobemid | Moklobemid | CYP2C19 |
| nortriptylin | Nortriptylin | CYP2D6 |
| paroksetin | Paroksetin | CYP2D6 |
| perfenazin | Perfenazin | CYP2D6 |
| pimozid | Pimozid | CYP2D6 |
| risperidon | Risperidon | CYP2D6 |
| sertindol | Sertindol | CYP2D6 |
| sertralin | Sertralin | CYP2C19 og CYP2B6 (hver for seg eller sammen) |
| tramadol | Tramadol | CYP2D6 |
| trimipramin | Trimipramin | CYP2C19 + CYP2D6 (begge kreves) |
| venlafaksin | Venlafaksin | CYP2D6 |
| vortioksetin | Vortioksetin | CYP2D6 |
| zuklopentiksol | Zuklopentiksol | CYP2D6 |

**Sikre treff uten relevante gener** (3): deksamfetamin og lisdeksamfetamin →
Amfetamin, metylfenidat → Metylfenidat. Alle tre: «Standard dosering (ikke
relevant gen-legemiddelinteraksjon).»

**Usikre treff** (13), alle legemidler CYPinfo sier ikke har relevante gener:

| CYPinfo | ATC i CYPinfo | Fagside | Grunnlag | Vurdering |
| --- | --- | --- | --- | --- |
| amisulprid | N05AL05 | Amisulprid | navn + ATC | Trygt |
| esketamin | N01AX14, N06AX27 | Ketamin | FEST-navnet + ATC | Ketaminsiden er koblet til både ketamin og esketamin i FEST; CYPinfo gjelder bare esketamin. Vises bare som esketamin |
| flupentiksol | N05AF01 | Flupentiksol | navn + ATC | Trygt |
| kariprazin | N05AX16 (feil) | Kariprazin, og Brekspiprazol på ATC-en | navn | Bare Kariprazin. Brekspiprazol er et falskt treff fra CYPinfos feil |
| klorprotiksen | N05AF02 | Klorprotiksen | navn (FEST har ingen ATC) | Trygt; `info` |
| klozapin | N05AH02 | Klozapin | navn + ATC | Trygt |
| kvetiapin | N05AH04 | Kvetiapin | navn + ATC | Trygt |
| levomepromazin | N05AA02 | Levomepromazin | navn + ATC | Trygt; `info` |
| litium | N05AN01 | Litium | navn + ATC | Trygt (FEST-koblingen er Litiumion) |
| lurasidon | N05AE05 | Lurasidon | navn + ATC | Trygt |
| olanzapin | N05AH03 | Olanzapin | navn + ATC | Trygt |
| paliperidon | N05AX13 | Paliperidon, og Hydroksyrisperidon | navn + ATC | Paliperidon trygt. Hydroksyrisperidon er også risperidons metabolitt; som for ClinPGx kobles en metabolitt ikke automatisk |
| ziprasidon | N05AE04 | Ziprasidon | navn + ATC | Trygt |

**Uten treff i OUSFAR** (28): 5-FU (DPYD), atorvastatin og simvastatin
(SLCO1B1), azatioprin og merkaptopurin (TPMT), celecoxib, ibuprofen,
meloksicam, piroxicam og fosfenytoin (CYP2C9), esomeprazol, lansoprazol,
omeprazol, pantoprazol, klopidogrel, Mavakamten og vorikonazol (CYP2C19),
flekainid, ondansetron, palonosetron, pitolisant og tropisetron (CYP2D6),
irinotekan (UGT1A1), takrolimus (CYP3A5), warfarin (CYP2C9 + VKORC1), og
granisetron, proklorperazin og reboksetin (uten relevante gener). Om noen av
dem skal få fagside, er et faglig valg, ikke en del av denne integrasjonen.

**Fagsider uten CYPinfo** (81). Blant dem:

- metabolitter og analytiske komponenter, som aldri kobles til moderstoffet:
  Dehydroaripiprazol, Desmetyldoksepin, Desmetylkariprazin,
  Didesmetylkariprazin, Desmetylklomipramin, Desmetylmianserin,
  Hydroksybupropion, Norfluoksetin, O-desmetyltramadol, O-desmetylvenlafaksin;
- legemidler med kjent farmakogenetikk i ClinPGx som CYPinfo ikke har i dag,
  f.eks. Imipramin, Karbamazepin og Okskarbazepin (HLA), Metadon, Oksykodon,
  Diazepam, Dosulepin. For dem fortsetter ClinPGx-visningen som før;
- resten (rusmidler, benzodiazepiner, antiepileptika, blodtrykksmidler …).

### Anbefalt koblingsmetode

1. **FEST-ID, automatisk.** En fagside viser CYPinfo for et legemiddel når
   legemiddelets `festCodes` har en av FEST-ID-ene i sidens publiserte
   `legemiddelkobling`. Ingen ny redaksjonell kobling: FEST-koblingen er alt
   kontrollert og publisert, og den sier hvilket virkestoff siden gjelder. Ny
   FEST-kobling på en side gir CYPinfo med en gang; fjernet kobling fjerner den.
2. **Legemidler uten FEST-ID**: en kontrollert liste i koden, som
   `clinpgxkoblinger.ts`, med siden, CYPinfo-ID-en og grunnlaget. Regelen er den
   samme som for ClinPGx: navnet og minst ett uavhengig kjennetegn til, og ATC
   bare etter normalisering. Fra tabellen over: de 11 trygge, esketamin på
   Ketamin (merket som esketamin), kariprazin bare på Kariprazin.
   Hydroksyrisperidon kobles ikke.
3. **Dekningsmodulen** `src/faginnhold/cypinfodekning.ts` gir hver publiserte
   fagside nøyaktig én status (`koblet_fest`, `koblet_liste`, `metabolitt`,
   `ikke_i_cypinfo`, `uavklart`), og testene feiler når en ny fagside mangler
   status, slik `clinpgxdekning.ts` gjør. Synkroniseringen melder hvert
   legemiddel i CYPinfo uten FEST-ID og uten oppføring i listen, og hver
   FEST-ID som er utgått i FEST, som «Til vurdering» i «Datakilder».
4. **Be CYPinfo** legge inn FEST-ID for de 15 som mangler og rette ATC-kodene.
   Da blir punkt 2 overflødig.

## Lagring og henting

Peders føring var først at katalogopplysninger kan lagres, mens anbefalingene
hentes fra CYPinfo ved behov, og at det ikke skal lages en parallell database
med egne, selvstendig vedlikeholdte anbefalinger. Etter avklaringen 17.11.2026
(over) viser fagsidene alle anbefalingene for et legemiddel, og da lagres
tekstene i kopien: de er CYPinfos, uendret, byttes ut hver uke og redigeres
aldri i OUSFAR, så kopien er ikke en egen samling anbefalinger.

### Det OUSFAR lagrer (katalogen)

Et eget skjema `cypinfo`, som `clinpgx`, uten tilgang for API-rollene, med
skrivefunksjoner bare for `service_role` og lesefunksjoner for innloggede:

| Tabell | Innhold |
| --- | --- |
| `synkroniseringer` | Kjøringene: status (`pagar`, `fullfort`, `feilet`), cron eller manuell, antallene, feilene, `parserversjon` |
| `legemiddel` | `cypinfo_id`, navn, normaliserte ATC-koder, FEST-ID-er, varenavn, kategori og terapiområde, `uten_relevante_gener` med CYPinfos tekst og nivå, og genene og gensettene legemiddelet slås opp på (`gener`, `gensett`: hvilke gener som har anbefalinger hver for seg, og hvilke som må sendes sammen), `raa`, `hash`, `utgatt_kl` |
| `genresultat` | Gentabellen: gen, `gen_slug`, allel 1 og 2, duplikasjon, `fenotype_id`, fenotypen, `raa`, `hash`, `utgatt_kl` |
| `anbefaling` | Hver anbefaling CYPinfo kan gi: CYPinfos ID, legemiddelet, genene og fenotypene den gjelder, nivået og teksten, delt i avsnitt (`avsnitt`; fra parserversjon 2, før det bare en sha256 av den). Utledet av synkroniseringen, se under |

Teksten for legemidlene uten relevante gener står på legemiddelet
(«Standard dosering (ikke relevant gen-legemiddelinteraksjon)»).

**Hvilke gener et legemiddel slås opp på**, står ikke i katalogen. Det utledes
ved hver synkronisering, med rapportkall mot alle legemidlene samtidig:

- ett kall per par gen + fenotype i gentabellen (38 i dag): hvilke legemidler
  har en anbefaling for genet alene, og for hvilke fenotyper;
- en parvis dekning med alle de ti genene samtidig (30 kall i dag): hver
  rad har én fenotype per gen, og hvert par av fenotyper for to ulike gener står
  sammen i minst ett kall. CYPinfo gir for hvert legemiddel anbefalingen med
  flest gener blant dem der alle parene er sendt (prøvd 16.11.2026), og en
  anbefaling for to gener kommer bare når begge parene er sendt. Dekningen gjør
  at en slik anbefaling kommer i minst ett kall uansett hvilken kombinasjon av
  fenotyper den gjelder, også når CYPinfo bare har den for én. Den viser hvilke
  gener som hører sammen (TCA-ene, warfarin, sertralin). Raden bygges grådig og
  sortert (`parvisDekning` i `src/cypinfo/synk.ts`), så rekkefølgen CYPinfo gir
  genene i, ikke endrer kallene. En anbefaling for tre eller flere gener finnes
  ikke i dag; den ville også vise seg i dekningen når kombinasjonen tilfeldigvis
  er med, men det er bare garantert for to gener.

Et legemiddel med gener i det andre, men ikke i det første, krever alle
genene sammen (TCA-ene, warfarin); ett som har genene hver for seg i det første
og sammen i det andre (sertralin), kan slås opp på ett eller flere.

- Til slutt ett kall per kombinasjon av fenotyper for hver gengruppe som hører
  sammen, med legemidlene i gruppen: i dag 5 × 5 = 25 for CYP2C19 + CYP2D6
  (TCA-ene), 3 × 3 = 9 for CYP2C9 + VKORC1 (warfarin) og 4 × 5 = 20 for
  CYP2B6 + CYP2C19 (sertralin). Slik har hver anbefaling CYPinfo kan gi, sin
  ID, nivå og tekst i kopien, også de felles, og hver endring kan oppdages.

Rådataene (`raa`) for en anbefaling er uten teksten, så en ny tekst hos
CYPinfo står bare i dataene og logges som en endring hos kilden, mens en ny
lesing av det samme svaret (en ny parserversjon) logges som metadata. Gir
synkroniseringen færre gener
for et legemiddel enn sist, stanser den planlagte synkroniseringen byttet og
melder det, så et endret svarmønster hos CYPinfo ikke fjerner et gen i
stillhet. En systemarkitekts «Hent nå» godtar endringen, med en merknad.
(Kartleggingen gjorde det samme og fant det som står i tabellene over.)

Synkroniseringen går hver uke fra GitHub Actions, som ClinPGx og
Farmakologiportalen, med høyst ett kall i sekundet: to `GET` og rundt 122
`POST` i dag (38 + 30 + 54), omtrent to minutter. Et kall som ikke svarer innen
30 sekunder, prøves på nytt, som ved 429 og serverfeil. Antallet følger av
gentabellen og gengruppene og regnes ut, ikke skrives inn. Alt
byttes inn i én transaksjon (katalogen og gentabellen er små), med vernet fra
`docs/datakilder.md`: hver type minst 80 % av radene fra før, og en
strukturkontroll som avviser svar der felt OUSFAR bygger på (`_id`, `name`,
`festCodes`, `geneId`, `phenotypeId`, `combinations`, `severity`) mangler eller
har en annen form. Kilden kommer i `DATAKILDER`, `KILDEOPPSETT` og
`datakilder_status`, med endringslogg på tabellene. Feltregler: navnene, ATC,
FEST, genene, fenotypene, nivået og teksten er kliniske; varenavn og kategori
metadata.

### Oppslaget etter en pasients resultat (bygges ikke)

Kartleggingen foreslo et serverendepunkt som slo opp anbefalingen for en
pasients resultat hos CYPinfo når brukeren ba om det. Det bygges ikke: OUSFAR
viser alle anbefalingene for legemiddelet, og for en pasients resultat lenkes
det til CYPinfo (Peder 17.11.2026). OUSFAR sender derfor ingenting om en
pasient noe sted, og fagsidene kaller aldri CYPinfo; de leser bare kopien.

## Visningen i «Farmakogenetikk»

Bygd 17.11.2026, og foreløpig bare synlig for systemarkitektene
(`CYPINFO_VISES_FOR` i `src/cypinfo/stoffside.ts`; `alle` slår den på for
alle). For andre leses ingenting fra CYPinfo. Begrensningen håndheves også i
databasen: `les_cypinfo` krever systemarkitekt (`intern.krev_systemarkitekt`)
til visningen slås på for alle.

CYPinfo får en egen gruppe, **«Anbefalinger fra CYPinfo»**, i seksjonen
«Farmakogenetikk», under de redaksjonelle kortene og over CPIC og ClinPGx. De
redaksjonelle kortene og panelteksten endres ikke, og CYPinfos tekst blandes
aldri inn i dem.

- Et legemiddel kobles når CYPinfo har en av FEST-ID-ene i sidens
  FEST-kobling, eller når det står i koblingslisten for siden
  (`src/faginnhold/cypinfokoblinger.ts`). Siden trenger ingen kobling til
  ClinPGx.
- Ingressen: «Hva CYPinfo anbefaler ved de ulike fenotypene, med CYPinfos
  tekst. For en pasients eget resultat: cypinfo.no.», med lenken.
- Ett detaljkort per legemiddel (`cypinfo-<navn>`), med genene og antallet
  anbefalinger i oppsummeringen. I kortet står gensettene hver for seg: ett
  gen («CYP2D6»), eller flere CYPinfo slår opp sammen («CYP2C19 og CYP2D6
  sammen»). Under hvert står anbefalingene, én per fenotype eller kombinasjon
  av fenotyper, i rekkefølgen fenotypene har i gentabellen: fenotypene som
  små merker, nivået som merke med CYPinfos tekst og en farge (rød, gul,
  turkis, nøytral; betydningen står alltid i teksten), og CYPinfos tekst,
  uendret, avsnitt for avsnitt.
- Et legemiddel uten relevante gener viser CYPinfos faste tekst.
- Nederst i kortet: «Kilde: CYPinfo, kontrollert <dato>. Gjelder ikke
  legemiddelinteraksjoner.»
- Den lukkede seksjonen oppsummerer: «CYPinfo: CYP2C19, CYP2D6».
- En side CYPinfo ikke har noe for, viser ingenting fra CYPinfo.

Ikke med ennå, til visningen er for alle: CYPinfo i referansefeltet, i søket på
siden og i kunnskapsbasen, og direktelenker til kortene.

## Personvern, sporbarhet, feil og klinisk kontroll

**Personvern.** Ingen legger inn noe om en pasient i OUSFAR, og OUSFAR sender
ingenting om noen til CYPinfo: synkroniseringen spør etter alle fenotypene,
og fagsidene leser bare kopien. Peder avklarte 17.11.2026 at det da ikke
trengs noen personvernvurdering.

**Kildesporbarhet.** Hver anbefaling i kopien har CYPinfos ID, genene og
fenotypene den gjelder, nivået og teksten, og kortet sier når kopien sist ble
kontrollert mot CYPinfo. Katalogen har sin kjøring, `raa` og `hash`, og hver
endring hos CYPinfo, også i en tekst, står i endringsloggen for datakildene.
CYPinfo har ingen versjon eller dato; sporet er derfor OUSFARs kjøring og
tidspunkt.

**Feilbehandling.** Synkroniseringen kontrollerer hvert svar fra CYPinfo, og et
tomt svar eller en ny form avviser hele kjøringen, så CYPinfos stille tomme svar
aldri blir «ingen anbefaling». Ved feil står katalogen fra forrige vellykkede
henting, og systemarkitektene ser feilen i «Datakilder». Fagsiden utelater en
rad som mangler noe, i stedet for å vise den halvt. CYPinfo kan stanses som CPIC, med
`STANSEDE_KILDER`, uten kodeendring andre steder.

**Klinisk kontroll.** CYPinfos tekster er CYPinfo-redaksjonens kliniske
vurderinger; OUSFAR gjengir dem uendret og kontrollerer dem ikke faglig.
Kontrollen gjelder at OUSFAR viser riktig anbefaling for riktig legemiddel og
fenotype, og ikke gir et inntrykk CYPinfo ikke gir. Den gjøres i etappe E av en
klinisk farmakolog (Peder eller den han peker ut), med testtilfellene under,
før gruppen slås på for alle. Funn i CYPinfos innhold (warfarin over,
ATC-feilen) meldes til CYPinfo, ikke rettes i OUSFAR.

## Etappene B–E

Alle etappene eies av OUSFAR Dev (`ansvar:dev`): datasynk, database, server,
fagsidenes visning. Ingen endrer faginnholdet eller verktøymenyen.

### B — Katalogen i OUSFAR

Bygd 17.11.2026. Slik den er:

- Migrasjonen `*_cypinfo.sql`: skjemaet `cypinfo` med tabellene `legemiddel`,
  `genresultat` og `anbefaling` (se tabellen over), `synkroniseringer` og
  `entiteter` (vernet, 80 % per type). `cypinfo_forrige_synk`,
  `cypinfo_start_synk`, `cypinfo_fullfor_synk` (byttet: alt i én transaksjon,
  uten mellomlager, siden katalogen er liten) og `cypinfo_avbryt_synk` for
  `service_role`; `les_cypinfo(fest_ider, cypinfo_ider)` for innloggede med
  aktivt medlemskap (legemidlene, anbefalingene og gentabellen for genene de
  bruker; i B uten nivå og tekst, fra D med, og da bare for systemarkitektene
  til E).
  Endringsloggen, feltreglene og etikettene i `datakilder`, og kilden i
  `datakilder_status`. Det trengtes ingen egen `cypinfo_status()`: «Datakilder»
  bruker `datakilder_status`, og `les_cypinfo` sier når katalogen sist ble
  kontrollert og endret.
- `cypinfo_fullfor_synk` melder også FEST-ID-er i CYPinfo som ikke er et aktivt
  virkestoff i OUSFARs FEST-kopi.
- `src/cypinfo/`: `api.ts` (ett kall i sekundet, nye forsøk ved 429, 5xx og
  tidsavbrudd), `modell.ts` (lesingen og normaliseringen), `struktur.ts`
  (strukturkontrollen, med den felles kontrollen i
  `src/datakilder/struktur.ts`, som ClinPGx også bruker), `synk.ts`
  (utledningen, kontrollen av hvert rapportsvar og rapporten til
  «Datakilder»), `lager.ts` og `endepunkt.ts`.
- `api/cypinfo.ts` (én funksjon; svarer 410 hvis CYPinfo settes i
  `STANSEDE_KILDER`) og `.github/workflows/cypinfo-synk.yml`, onsdag 03:45 UTC.
- `cypinfo` i `DATAKILDER` og `KILDEOPPSETT`, med «Hent nå».
- `src/faginnhold/cypinfokoblinger.ts`: de 13 legemidlene uten FEST-ID med
  fagside, og proklorperazin og reboksetin, som er vurdert og ikke har noen
  side (`side: null`). `src/faginnhold/cypinfodekning.ts` regner ut statusen
  for hver fagside av katalogen, FEST-koblingene og listen.
- Testene (`src/__tests__/cypinfo.test.ts`, `cypinfodekning.test.ts`) bruker
  utdraget i `src/__tests__/data/cypinfo/`: katalogen og gentabellen slik
  CYPinfo ga dem, alle 383 anbefalingene fra kartleggingen med syntetisk tekst
  der teksten avhenger av et resultat, og fagsidene med FEST-koblingene i
  produksjonen 16.11.2026. Det falske CYPinfo i `hjelp/cypinfo.ts` velger
  anbefalingene slik CYPinfo gjør; det er kontrollert mot alle de 104
  rapportkallene i kartleggingen.
- Ingenting vises på fagsidene i B. Første henting i produksjonen gjøres med «Hent
  nå» i «Datakilder», eller ved å starte arbeidsflyten «CYPinfo» i GitHub,
  etter sammenslåingen; ellers går den første onsdagen etter. Til da står
  CYPinfo som «Se over» i «Datakilder», fordi kilden ikke har noen kjøring.

### C — Oppslaget gjennom OUSFARs server (bygges ikke)

Bortfalt etter Peders avklaring 17.11.2026; se «Oppslaget etter en pasients
resultat».

### D — Visningen på fagsiden

Bygd 17.11.2026, beskrevet under «Visningen i «Farmakogenetikk»». Slik den er:

- Synkroniseringen (parserversjon 2) lagrer teksten for hver anbefaling. Den
  første hentingen etter sammenslåingen logger byttet fra hashen til teksten
  som metadata, ikke som endring hos CYPinfo.
- Migrasjonen `*_cypinfo_visning.sql`: `les_cypinfo` gir anbefalingene med
  genene og fenotypene, nivået og teksten, og bare til systemarkitektene.
- `src/cypinfo/lesing.ts` (leseren, som utelater rader som mangler noe) og
  `src/cypinfo/stoffside.ts` (hvem som ser den, hva siden spør etter, og
  ordningen), `useCypinfo` i `useFarmakogenetikk.ts`, og
  `Cypinfovisning.tsx` i `Farmakogenetikkpanel.tsx`.
- Testene: `cypinfovisning.test.ts` (ordningen med hele utdraget: ett gen,
  TCA-ene med 25, sertralin med gen hver for seg og sammen, uten relevante
  gener, en side uten CYPinfo, lesingen), `stoffside.test.tsx` (ingenting leses
  eller vises for andre enn systemarkitekter; kortet for systemarkitektene) og
  `cypinfo.test.ts` (tekstene lagres, ny lesing som metadata, `les_cypinfo`).

### E — Klinisk kontroll og visning for alle

- Den kliniske aksepttesten (under), gjort av en klinisk farmakolog, med
  resultatet ført i PR-en.
- CYPinfo i referansefeltet, søket og direktelenkene.
- Funnene meldes til CYPinfo: warfarin VKORC1 alene, kariprazins ATC, ATC-
  formen, FEST-ID for de 15, at `/api/result` feiler for 43 genotyper, og
  ønsket om en versjon eller dato og genene per legemiddel i katalogen.
- Visningen for alle: `CYPINFO_VISES_FOR = 'alle'`, og `les_cypinfo` tilbake
  til `intern.krev_aktivt_medlemskap()` i en ny migrasjon, i samme endring,
  med varsel i endringsloggen.
- Valget om CPIC-laget (skjemaet, koden og `Cpicoppslag.tsx`) skal fjernes når
  CYPinfo er i bruk. Det er en egen opprydding etter at E er godkjent.

## Test- og godkjenningskriterier

**Automatiske (B og D, i CI):**

- Hver av de 75 legemidlene i det lagrede utdraget leses; formfeilene i ATC
  normaliseres; feltnavnene i alle tre svarformene leses.
- Dekningen: 34 sikre treff gir nøyaktig de 33 fagsidene i tabellen; listen gir
  de 13 usikre slik vurderingen sier (Kariprazin ja, Brekspiprazol nei for
  kariprazin, Hydroksyrisperidon nei); hver publiserte fagside har én status.
- Utledningen gir CYP2C19 + CYP2D6 som par for de fire TCA-ene, CYP2C9 +
  VKORC1 for warfarin, og CYP2C19 og CYP2B6 hver for seg og sammen for
  sertralin, og synkroniseringen kaller hele produktet av fenotyper for hver
  gengruppe (i utdraget 25 + 9 + 20), så hver anbefaling har ID, nivå og tekst.
- Et tomt svar, 5xx, tidsavbrudd og ny form stopper kjøringen, og katalogen fra
  før står.
- Fagsiden viser ingenting fra CYPinfo, og leser ingenting, for andre enn dem
  `CYPINFO_VISES_FOR` gjelder.

**Klinisk aksepttest (E), med systemarkitektenes visning i produksjonen eller i
det lokale testmiljøet:**

| Fagside | Forventet |
| --- | --- |
| Aripiprazol | Ett kort, CYP2D6: Normal gir `standard` («Normal metabolisme.»), Redusert `medium` med teksten om dehydroaripiprazol |
| Kodein | Hver CYP2D6-fenotype med det cypinfo.no viser for den |
| Amitriptylin | «CYP2C19 og CYP2D6 sammen» med 25 anbefalinger, ingen for ett gen alene |
| Sertralin | CYP2B6 og CYP2C19 hver for seg, og sammen |
| Warfarin | «CYP2C9 og VKORC1 sammen», alle ni som på cypinfo.no |
| Amfetamin | To legemidler, CYPinfos tekst om ikke relevant gen-legemiddelinteraksjon |
| Ketamin | Esketamin |
| Karbamazepin | Ingen CYPinfo-gruppe; ClinPGx som før |

Godkjent når hver rad gir det samme som cypinfo.no for de samme fenotypene, den
redaksjonelle teksten på sidene er uendret, og kilden og tidspunktet står i
hvert kort.

## Uavklart

1. ~~Tillatelse til å bruke CYPinfo i OUSFAR~~ og ~~personvern~~: avklart av
   Peder 17.11.2026 (se øverst). Det trengs ingen av delene.
2. **Ett gen der CYPinfo bruker to** (warfarin med VKORC1 alene). Visningen
   viser det CYPinfo har; den kliniske kontrollen vurderer om noe bør
   forklares.
3. **Nivåenes betydning.** Teksten for `standard`/`medium`/`high`/`info` står bare
   på CYPinfos nettside, ikke i API-et. CYPinfo bør bekrefte at OUSFAR kan bruke
   den.

## Kontrollen 16.11.2026

Gjort fra OUSFARs utviklingsmiljø, rundt 300 kall over 15 minutter, ett i
sekundet eller sjeldnere, med en egen `User-Agent`:

- `GET` katalogen, gentabellen og ett legemiddel; ukjent legemiddel.
- Rapporten for alle 38 par gen + fenotype mot alle 75 legemidlene, og med
  alle ti genene samtidig; alle 25
  kombinasjoner CYP2C19 + CYP2D6 for TCA-ene; alle 9 CYP2C9 + VKORC1 for warfarin;
  sertralin med ett og to gener; to fenotyper for ett gen; tre gener samtidig;
  ukjente ID-er og feil store og små bokstaver.
- `/api/result` for hver av de 176 radene i gentabellen.
- `/api/gene` med fenotype-ID-er og andre former.
- Valideringsfeilene for hvert endepunkt, ugyldig JSON, feil metode, CORS.
- OUSFARs side: de publiserte fagsidene, `legemiddelkobling` og
  `clinpgxkobling`, og virkestoffene og ATC-kodene i FEST-kopien, lest
  skrivebeskyttet i produksjonsdatabasen; stoffregisteret fra
  `src/data/stoffregister.json`.

Ingen pasientdata er brukt. CYPinfo kan endre innholdet uten varsel; tallene
over gjelder denne dagen.
