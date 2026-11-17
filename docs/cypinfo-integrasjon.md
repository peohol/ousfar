# CYPinfo som norsk farmakogenetisk kilde: kartlegging og plan

Leses før noe som har med CYPinfo å gjøre bygges: koblingen til fagsidene,
synkroniseringen av katalogen, oppslaget etter et kjent resultat eller
visningen i seksjonen «Farmakogenetikk». Dokumentet er etappe A: kartleggingen.
Etappene B–E står til slutt, så de kan bygges uten mer teknisk kartlegging.
Mønstrene for datakildene står i `docs/legemiddeldata.md`, `docs/clinpgx.md`,
`docs/cpic.md` og `docs/datakilder.md`, og det som står der om prinsippene,
gjelder også her.

CYPinfo erstatter CPIC, som er stanset siden 6.11.2026 og skal erstattes av
norske farmakogenetiske data (`src/datakilder/stans.ts`). Ingenting i denne
kartleggingen tar CPIC i bruk igjen.

**Status:** etappe A (kartleggingen) og B (katalogen i OUSFAR) er gjort.
Etappe B er beskrevet slik den er bygd under «B — Katalogen i OUSFAR».

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
- Anbefalt løsning: katalogen, gentabellen og hvilke gener hvert legemiddel slås
  opp på lagres i OUSFAR og synkroniseres ukentlig; selve anbefalingen for et
  resultat hentes fra CYPinfo når brukeren ber om den, gjennom OUSFARs server,
  og lagres ikke.
- Funn som må tas hensyn til: enkelte feil ignoreres i stillhet (ukjente ID-er
  gir et tomt svar), oversettelsesendepunktet feiler for 43 av 176 genotyper,
  ATC-kodene har formfeil og én feil kode, og API-et har ingen versjon, dato
  eller lisens.
- Før noe vises til brukerne trengs en skriftlig avtale med CYPinfo om bruken,
  og en klinisk kontroll av visningen (etappe E).

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

Peders føring: katalogopplysninger kan lagres eller mellomlagres, mens
genotypebaserte anbefalinger hentes fra CYPinfo ved behov. Ingen parallell
database med egne anbefalinger.

### Det OUSFAR lagrer (katalogen)

Et eget skjema `cypinfo`, som `clinpgx`, uten tilgang for API-rollene, med
skrivefunksjoner bare for `service_role` og lesefunksjoner for innloggede:

| Tabell | Innhold |
| --- | --- |
| `synkroniseringer` | Kjøringene: status (`pagar`, `fullfort`, `feilet`), cron eller manuell, antallene, feilene, `parserversjon` |
| `legemiddel` | `cypinfo_id`, navn, normaliserte ATC-koder, FEST-ID-er, varenavn, kategori og terapiområde, `uten_relevante_gener` med CYPinfos tekst og nivå, og genene og gensettene legemiddelet slås opp på (`gener`, `gensett`: hvilke gener som har anbefalinger hver for seg, og hvilke som må sendes sammen), `raa`, `hash`, `utgatt_kl` |
| `genresultat` | Gentabellen: gen, `gen_slug`, allel 1 og 2, duplikasjon, `fenotype_id`, fenotypen, `raa`, `hash`, `utgatt_kl` |
| `anbefaling` | Hver anbefaling CYPinfo kan gi: CYPinfos ID, legemiddelet, genene og fenotypene den gjelder, nivået og sha256 av teksten. Teksten lagres ikke. Utledet av synkroniseringen, se under |

Teksten for legemidlene uten relevante gener lagres, fordi den ikke avhenger av
noe resultat; den er en del av katalogen («Standard dosering (ikke relevant
gen-legemiddelinteraksjon)»). Ingen genavhengige anbefalingstekster lagres.

**Hvilke gener et legemiddel slås opp på**, står ikke i katalogen. Det utledes
ved hver synkronisering, med rapportkall mot alle legemidlene samtidig:

- ett kall per par gen + fenotype i gentabellen (38 i dag): hvilke legemidler
  har en anbefaling for genet alene, og for hvilke fenotyper;
- fem kall der fenotype nummer *k* for hvert av de ti genene sendes samtidig.
  Da gir CYPinfo nøyaktig én anbefaling per legemiddel, den med flest gener
  (prøvd 16.11.2026: 75 anbefalinger for 75 legemidler). Den viser hvilke gener
  som hører sammen (TCA-ene, warfarin, sertralin). Etter fem kall er hver
  fenotype for hvert gen sendt minst én gang.

Et legemiddel med gener i det andre, men ikke i det første, krever alle
genene sammen (TCA-ene, warfarin); ett som har genene hver for seg i det første
og sammen i det andre (sertralin), kan slås opp på ett eller flere.

- Til slutt ett kall per kombinasjon av fenotyper for hver gengruppe som hører
  sammen, med legemidlene i gruppen: i dag 5 × 5 = 25 for CYP2C19 + CYP2D6
  (TCA-ene), 3 × 3 = 9 for CYP2C9 + VKORC1 (warfarin) og 4 × 5 = 20 for
  CYP2B6 + CYP2C19 (sertralin). Slik har hver anbefaling CYPinfo kan gi, sin
  ID og teksthash i kopien, også de felles, og hver endring kan oppdages.

Det som lagres, er bare genene, fenotypene og anbefalingens ID og en sha256 av teksten
(for å se at noe er endret, se under); teksten kastes. Gir dette færre gener
for et legemiddel enn sist, stanser den planlagte synkroniseringen byttet og
melder det, så et endret svarmønster hos CYPinfo ikke fjerner et gen i
stillhet. En systemarkitekts «Hent nå» godtar endringen, med en merknad.
(Kartleggingen gjorde det samme og fant det som står i tabellene over.)

Synkroniseringen går hver uke fra GitHub Actions, som ClinPGx og
Farmakologiportalen, med høyst ett kall i sekundet: to `GET` og rundt 97
`POST` i dag (38 + 5 + 54), omtrent to minutter. Antallet følger av
gentabellen og gengruppene og regnes ut, ikke skrives inn. Alt
byttes inn i én transaksjon (katalogen og gentabellen er små), med vernet fra
`docs/datakilder.md`: hver type minst 80 % av radene fra før, og en
strukturkontroll som avviser svar der felt OUSFAR bygger på (`_id`, `name`,
`festCodes`, `geneId`, `phenotypeId`, `combinations`, `severity`) mangler eller
har en annen form. Kilden kommer i `DATAKILDER`, `KILDEOPPSETT` og
`datakilder_status`, med endringslogg på tabellene. Feltregler: navnene, ATC,
FEST, genene, fenotypene og teksthashen er kliniske; varenavn og kategori
metadata.

### Det OUSFAR henter ved behov (anbefalingen)

Ett serverendepunkt hos OUSFAR, `POST /api/cypinfo` (én Vercel-funksjon for
både synkroniseringen og oppslaget; det er ti funksjoner i `api/` i dag, og
Vercels Hobby-plan tillater høyst tolv per utrulling), som tar
`{ handling: "rapport", legemiddel, resultater: [{ gen_slug, fenotype_id }] }` og:

1. krever en innlogget bruker med aktivt medlemskap: en ny sjekk
   `harAktivtMedlemskap` i `src/server/tilgang.ts` ved siden av
   `erSystemarkitekt`, som kaller databasens fasit
   `public.har_aktivt_medlemskap()` med brukerens token. Et gyldig token alene
   er ikke nok, så en bruker som nettopp har mistet medlemskapet, avvises med
   en gang. I dag har `tilgang.ts` bare sjekkene for cron, GitHub Actions og
   systemarkitekter, fordi alle endepunktene er synkroniseringer;
2. kontrollerer at legemiddelet, genene og fenotypene finnes i OUSFARs kopi, at
   det er høyst én fenotype per gen, og at genene er blant dem legemiddelet slås
   opp på. Ellers 400 med en norsk melding, uten å kalle CYPinfo;
3. kaller `POST /api/legemiddel/rapport` med bare det ene legemiddelet og
   gen:fenotype-parene, tidsgrense 8 s, ett nytt forsøk ved 5xx eller tidsavbrudd;
4. leser svaret med den samme strukturkontrollen, og gir appen anbefalingen med
   CYPinfos ID, genene og fenotypene den gjelder, nivået, teksten som ren tekst
   delt i avsnitt (tomme avsnitt fjernet), og tidspunktet den ble hentet;
5. lagrer ingenting og logger ikke forespørselen eller svaret (bare status og
   svartid, uten innhold).

Nettleseren kan ikke kalle CYPinfo selv (ingen CORS), og OUSFARs server gir
kontrollen i punkt 2. Det samme mønsteret kan senere brukes av OUSFAR Verktøy.

## Visningen i «Farmakogenetikk»

CYPinfo får en egen gruppe, **«Norske anbefalinger fra CYPinfo»**, i seksjonen
«Farmakogenetikk», der CPIC-gruppen sto: under de redaksjonelle kortene og over
ClinPGx. De redaksjonelle kortene og panelteksten endres ikke, og CYPinfos tekst
blandes aldri inn i dem. Gruppen har egen overskrift, ingress og kilde, som
CPIC-gruppen hadde, så det er tydelig hva som er OUSFARs redaksjonelle tekst,
hva som er CYPinfos norske anbefalinger, og hva som er ClinPGx' internasjonale
oversikt.

**1. Hva CYPinfo har for legemiddelet** (ett lite kort, alltid synlig når siden
er koblet):

- «CYPinfo har anbefalinger for aripiprazol ved CYP2D6-resultat.» Eller for
  TCA-ene: «… ved CYP2C19- og CYP2D6-resultat sammen.» Eller: «CYPinfo: Standard
  dosering (ikke relevant gen-legemiddelinteraksjon).»
- Har siden flere legemidler (Amfetamin, Ketamin), ett avsnitt per legemiddel.
- Den lukkede seksjonen oppsummerer: «CYPinfo: CYP2D6».

**2. «Slå opp anbefaling etter kjent resultat»** (detaljkort, bare for
legemidler med gener):

- Ingressen: «For et farmakogenetisk resultat som allerede er kjent. Velg
  resultatet slik det står i svaret fra laboratoriet. Ingenting lagres.»
- Ett valg per gen legemiddelet slås opp på, med CYPinfos fenotyper i deres
  rekkefølge (Normal, Noe økt, Økt, Noe redusert, Redusert, Svært lav,
  Manglende), bare de som gir en anbefaling for legemiddelet. Fenotypene vises
  med CYPinfos ord.
- «Oversett fra genotype» ved hvert gen: søk i OUSFARs kopi av CYPinfos
  gentabell, i nettleseren (to alleler, rekkefølgen og stjernene spiller ingen
  rolle; for CYP2D6 et valg for duplikasjon). Treffet viser genotypen →
  fenotypen og velger fenotypen. En genotype som ikke står i tabellen, oversettes
  ikke; da velges fenotypen fra svaret. Det er samme mønster som CPIC-oppslaget
  (`docs/cpic.md`, «Oversettelsen fra diplotype»), som kan gjenbrukes.
- Knappen «Hent anbefaling» kaller `/api/cypinfo` når hvert gen som *må* være
  med, er valgt. For TCA-ene og warfarin står knappen inaktiv med teksten
  «CYPinfo slår opp amitriptylin på CYP2C19 og CYP2D6 sammen. Velg begge.»
  Et gen fylles aldri inn.
- For sertralin kan ett gen være nok. Er bare det ene valgt, står det over
  svaret: «Svaret bygger bare på CYP2C19. CYPinfo bruker også CYP2B6 for
  sertralin.» (CYPinfos egen tekst viser til «nedtrekksmenyen» deres; den
  gjengis uendret, med OUSFARs forklaring over.)
- **Svaret**: nivået som merke med CYPinfos farge og tekst (rød «Endret
  dosebehov eller bytte av legemiddel», gul «Kan ha bivirkninger/manglende
  effekt», grønn «Standard dosering», nøytral «Lite/ingen informasjon om
  metabolismevei»), med symbol i tillegg til fargen; så CYPinfos tekst, uendret,
  avsnitt for avsnitt; så «Hvorfor»: det som ble valgt for hvert gen, genotypen
  hvis den ble oversatt, og CYPinfos ID for anbefalingen.
- Under: «Kilde: CYPinfo (cypinfo.no), hentet 16.11.2026 kl. 21.40. Gjelder
  ikke legemiddelinteraksjoner. Bare veiledning; vurderes sammen med pasientens
  kliniske situasjon.» Og lenken til CYPinfo.
- «Nullstill» tar alle valgene.

**Feil og tomme svar**: «CYPinfo svarer ikke nå. Prøv igjen om litt.» ved
tidsavbrudd eller 5xx. «CYPinfo har ingen anbefaling for denne kombinasjonen»
vises bare når OUSFARs kopi sier det, og da kalles ikke CYPinfo (valgene tilbyr
uansett bare fenotyper med en anbefaling). Kommer det likevel et tomt svar for
en kombinasjon kopien sier har en anbefaling, er det avvik i kilden, ikke et
klinisk svar: «CYPinfo ga ikke anbefalingen OUSFAR ventet. Se cypinfo.no, eller
prøv igjen etter neste oppdatering.», med lenken til CYPinfo, og endepunktet
melder avviket i «Datakilder» (uten valgene) så synkroniseringen kan kjøres
på nytt;
«Katalogen fra CYPinfo er ikke hentet ennå» før første synkronisering; og
meldingen om gamle data når katalogen ikke er kontrollert på over ti døgn, som
for ClinPGx.

**Personvern i visningen**: valgene står bare i komponentens tilstand, som i
CPIC-oppslaget. De bevares ikke over oppdateringer (`useBevart` brukes bevisst
ikke), står ikke i adressen, sendes ikke til søket, og lagres ikke. Det er
avvik fra regelen i `AGENTS.md` om `useBevart`, begrunnet i at valgene er
opplysninger om en pasient.

**Søket** på siden og i kunnskapsbasen finner gruppen og oppslagskortet på
legemiddelnavnet og genene, ikke anbefalingstekstene (de hentes bare ved
oppslag).

**Referansene**: CYPinfo står som automatisk, ikke-redigerbar referanse i
seksjonens referansefelt (`cypinfo:kilde`), som ClinPGx, med teksten avtalen
med CYPinfo krever.

**Tastatur og tilgjengelighet**: valgene er vanlige `<select>`-er i
rekkefølge, Enter i genotypesøket velger bare et nøyaktig treff, og svaret
kunngjøres med `aria-live="polite"`. Nivået har tekst og symbol, ikke bare
farge.

## Personvern, sporbarhet, feil og klinisk kontroll

**Personvern.** Det som sendes til CYPinfo, er legemiddelets ID og gen:fenotype,
aldri navn, fødselsnummer, alder eller noe annet om en person. OUSFAR lagrer det
ikke og logger det ikke. Forespørselen går likevel til CYPinfos servere hos
Vercel i USA, og en fenotype som en kliniker slår opp, gjelder en pasient. Uten
identifikatorer er det vanskelig å knytte den til en person, men det bør
nevnes i avtalen med CYPinfo og vurderes av den som har ansvaret for
personvernet ved OUS (se «Uavklart»). Brukerne får en påminnelse i ingressen
om at de ikke skal skrive inn noe annet enn resultatet, og det er ingen
fritekstfelt.

**Kildesporbarhet.** Hver viste anbefaling har CYPinfos ID, genene og
fenotypene den gjelder, og når den ble hentet. Katalogen har sin kjøring,
`raa` og `hash`, og endringene står i endringsloggen for datakildene. Fordi
synkroniseringen lagrer en hash av hver anbefalingstekst den ser, logges det
også når CYPinfo endrer en anbefaling, selv om teksten ikke lagres. CYPinfo har
ingen versjon eller dato; sporet er derfor OUSFARs kjøring og tidspunkt.

**Feilbehandling.** Alt sjekkes mot katalogen før kallet, og et tomt svar der
katalogen venter en anbefaling, er avvik i kilden, så CYPinfos stille tomme svar
aldri vises som «ingen anbefaling». Svar som ikke kan leses,
eller har en ny form, vises ikke; brukeren får feilmeldingen og
systemarkitektene en føring i «Datakilder». Ved feil i synkroniseringen står
katalogen fra forrige vellykkede henting. CYPinfo kan stanses som CPIC, med
`STANSEDE_KILDER`, uten kodeendring andre steder.

**Klinisk kontroll.** CYPinfos tekster er CYPinfo-redaksjonens kliniske
vurderinger; OUSFAR gjengir dem uendret og kontrollerer dem ikke faglig.
Kontrollen gjelder at OUSFAR viser riktig anbefaling for riktig legemiddel og
resultat, og ikke gir et inntrykk CYPinfo ikke gir. Den gjøres i etappe E av en
klinisk farmakolog (Peder eller den han peker ut), med testtilfellene under,
før gruppen slås på for brukerne. Funn i CYPinfos innhold (warfarin over,
ATC-feilen) meldes til CYPinfo, ikke rettes i OUSFAR.

## Etappene B–E

Alle etappene eies av OUSFAR Dev (`ansvar:dev`): datasynk, database, server,
fagsidenes visning. Ingen endrer faginnholdet eller verktøymenyen. Hver etappe
er én PR, i denne rekkefølgen.

### B — Katalogen i OUSFAR

Bygd 17.11.2026. Slik den er:

- Migrasjonen `*_cypinfo.sql`: skjemaet `cypinfo` med tabellene `legemiddel`,
  `genresultat` og `anbefaling` (se tabellen over), `synkroniseringer` og
  `entiteter` (vernet, 80 % per type). `cypinfo_forrige_synk`,
  `cypinfo_start_synk`, `cypinfo_fullfor_synk` (byttet: alt i én transaksjon,
  uten mellomlager, siden katalogen er liten) og `cypinfo_avbryt_synk` for
  `service_role`; `les_cypinfo(fest_ider, cypinfo_ider)` for innloggede med
  aktivt medlemskap (legemidlene, hvilke kombinasjoner av gen og fenotype som
  har en anbefaling, uten nivå og tekst, og gentabellen for genene de bruker).
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
- Ingenting vises på fagsidene. Første henting i produksjonen gjøres med «Hent
  nå» i «Datakilder», eller ved å starte arbeidsflyten «CYPinfo» i GitHub,
  etter sammenslåingen; ellers går den første onsdagen etter. Til da står
  CYPinfo som «Se over» i «Datakilder», fordi kilden ikke har noen kjøring.

### C — Oppslaget gjennom OUSFARs server

- `api/cypinfo.ts` får oppslaget (`POST` med `handling: "rapport"`) i samme
  funksjon, så antallet funksjoner holdes nede.
- `src/cypinfo/rapport.ts`: kontrollen mot katalogen (ukjent legemiddel, ukjent
  gen eller fenotype, to fenotyper for ett gen, gen legemiddelet ikke slås opp
  på, manglende gen for to-gens legemidler), kallet, lesingen.
- `src/cypinfo/genotype.ts`: oversettelsen i gentabellen (rekkefølge, stjerner,
  store og små bokstaver, duplikasjon bare for CYP2D6), uten `/api/result`.
- Testene: hver avvisning med melding uten at CYPinfo kalles; et tomt svar; 5xx
  og tidsavbrudd; et svar med ny form; at ingenting logges eller lagres (spion
  på loggeren og databasen); at innlogging og aktivt medlemskap kreves (også en innlogget bruker uten
  aktivt medlemskap avvises); at et tomt svar for en kombinasjon katalogen har,
  gir avviksmeldingen og en føring, ikke «ingen anbefaling». CYPinfo etterlignes i
  testene; ingen test kaller CYPinfo.

### D — Visningen på fagsiden

- `src/components/stoffside/Cypinfovisning.tsx` og `Cypinfooppslag.tsx`, i
  `Farmakogenetikkpanel.tsx` der `Cpicvisning` står, og `useCypinfo` i
  `useFarmakogenetikk.ts` (`useKilde`, lest med sidens FEST-ID-er og listen).
- Gjenbruk det generelle fra CPIC-oppslaget og oversettelsen (velgerne,
  genotypesøket, «Hvorfor»), flyttet til felles komponenter, ikke kopiert.
- Referansen `cypinfo:kilde` i `src/cypinfo/referanser.ts`, oppsummeringen av
  den lukkede seksjonen, søketekstene, direktelenkene (`cypinfo-oppslag`).
- Gruppen er skjult bak et kildeoppsett («ikke aktivert») til etappe E er
  godkjent, så den kan prøves i det lokale testmiljøet og av systemarkitektene
  uten at brukerne ser den.
- Testene: komponenttester med etterlignet API for aripiprazol (ett gen),
  amitriptylin (to gener som kreves), sertralin (ett eller begge), warfarin,
  Amfetamin (to legemidler, uten relevante gener), Ketamin (esketamin), en side
  uten CYPinfo, en metabolittside; tastaturflyten; at valgene ikke står i
  adressen eller i `useBevart`; Playwright i det lokale testmiljøet
  (`apneTestmiljo()`), aldri mot produksjonen. Endringsloggen: MINOR,
  `Funksjonalitet`, og varsel ved aktiveringen i E (ny klinisk funksjon på
  fagsidene).

### E — Klinisk kontroll, avtale og aktivering

- Avtalen med CYPinfo (se «Uavklart»), og teksten referansen skal ha.
- Den kliniske aksepttesten (under), gjort av en klinisk farmakolog, med
  resultatet ført i PR-en.
- Funnene meldes til CYPinfo: warfarin VKORC1 alene, kariprazins ATC, ATC-
  formen, FEST-ID for de 15, at `/api/result` feiler for 43 genotyper, og
  ønsket om en versjon eller dato og genene per legemiddel i katalogen.
- Aktiveringen: kildeoppsettet slås på, varsel i endringsloggen.
- Valget om CPIC-laget (skjemaet, koden og `Cpicoppslag.tsx`) skal fjernes når
  CYPinfo er i bruk. Det er en egen opprydding etter at E er godkjent.

## Test- og godkjenningskriterier

**Automatiske (B–D, i CI):**

- Hver av de 75 legemidlene i det lagrede utdraget leses; formfeilene i ATC
  normaliseres; feltnavnene i alle tre svarformene leses.
- Dekningen: 34 sikre treff gir nøyaktig de 33 fagsidene i tabellen; listen gir
  de 13 usikre slik vurderingen sier (Kariprazin ja, Brekspiprazol nei for
  kariprazin, Hydroksyrisperidon nei); hver publiserte fagside har én status.
- Utledningen gir CYP2C19 + CYP2D6 som påkrevd par for de fire TCA-ene, CYP2C9
  + VKORC1 for warfarin, og CYP2C19 og CYP2B6 hver for seg for sertralin, og
  synkroniseringen kaller hele produktet av fenotyper for hver gengruppe (i
  utdraget 25 + 9 + 20), så hver felles anbefaling har ID og teksthash.
- Endepunktet sender aldri noe til CYPinfo som ikke finnes i katalogen, og
  avviser to fenotyper for samme gen.
- Et tomt svar, 5xx, tidsavbrudd og ny form gir hver sin melding, og ingen
  anbefaling vises. Et tomt svar for en kombinasjon katalogen har, vises som
  avvik i kilden, aldri som «ingen anbefaling».
- Ingenting fra oppslaget lagres eller logges; valgene står ikke i adressen.

**Klinisk aksepttest (E), i det lokale testmiljøet eller med systemarkitektenes
forhåndsvisning, med syntetiske resultater:**

| Legemiddel | Resultat | Forventet |
| --- | --- | --- |
| Aripiprazol | CYP2D6 Normal | `standard`, «Normal metabolisme.» |
| Aripiprazol | CYP2D6 Redusert | `medium`, teksten om dehydroaripiprazol |
| Kodein | CYP2D6 Manglende og Økt | Det CYPinfo viser for de samme valgene på cypinfo.no |
| Amitriptylin | bare CYP2D6 | Knappen inaktiv, melding om CYP2C19 |
| Amitriptylin | CYP2C19 Normal + CYP2D6 Redusert | `high`, felles anbefaling |
| Sertralin | CYP2C19 Normal alene | `standard` og OUSFARs merknad om CYP2B6 |
| Sertralin | CYP2C19 Normal + CYP2B6 Redusert | `medium`, felles anbefaling |
| Warfarin | CYP2C9 og VKORC1, alle ni | Samme som cypinfo.no |
| Citalopram | genotype CYP2C19 *1/*17 | Oversatt til «Noe økt enzymaktivitet» |
| CYP2D6 | genotype *1/*1 med duplikasjon | «Økt enzymaktivitet» |
| Amfetamin | — | To avsnitt, «ikke relevant gen-legemiddelinteraksjon», ingen oppslag |
| Karbamazepin | — | Ingen CYPinfo-gruppe; ClinPGx som før |

Godkjent når hver rad gir det samme som cypinfo.no for de samme valgene, den
redaksjonelle teksten på sidene er uendret, kilden og tidspunktet står ved hvert
svar, og ingenting om valgene finnes i adressen, i databasen eller i loggene.

## Uavklart

Spørsmål kartleggingen ikke kan avgjøre. Det første må være avklart før noe
vises for brukerne; de andre før eller i etappe E.

1. **Tillatelse til å bruke CYPinfo i OUSFAR.** Nettstedet og API-et oppgir
   ingen lisens eller vilkår. Tekstene er CYPinfo-redaksjonens. OUSFAR trenger
   en skriftlig tillatelse fra CYPinfo (redaksjonen ved OUS Avdeling for
   farmakologi), med hvordan kilden skal oppgis, om katalogen kan mellomlagres,
   og om det er greit at OUSFAR kaller API-et fra sin server (ukentlig, og ved
   hvert oppslag). Farmakologiportalen ble tatt i bruk på tilsvarende måte med
   en skriftlig tillatelse.
2. **Personvern.** Om det er greit at fenotyper klinikere slår opp, sendes uten
   identifikatorer til CYPinfos servere i USA. Er det ikke det, kan oppslaget
   ikke bygges som foreslått; da står katalogkortet alene.
3. **Ett gen der CYPinfo bruker to** (sertralin, og warfarin med VKORC1 alene).
   Forslaget er å vise svaret med OUSFARs merknad for sertralin, og kreve begge
   for TCA-ene og warfarin. Den kliniske kontrollen bekrefter eller endrer det.
4. **Nivåenes betydning.** Teksten for `standard`/`medium`/`high`/`info` står bare
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
