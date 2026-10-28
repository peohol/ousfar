# OUSFAR Verktøy – P1: virkestoff- og formuleringskartlegging

<!-- Laget av `npm run verktoy:kartlegging -- rapport` fra src/data/verktoy/. Ikke rediger for hånd; endre kartleggingen og lag rapporten på nytt. -->

Grunnlaget for de neste fasene i `docs/verktøy-utviklingsplan.md`. Den
maskinlesbare kartleggingen er `src/data/verktoy/virkestoffkartlegging.json`
(valgt for hånd), og den kontrolleres av
`src/__tests__/verktoykartlegging.test.ts` mot øyeblikksbildene i samme mappe.
Ingen fagsider er opprettet, ingen anbefalingstekster er hentet inn, og ingen
regler er laget.

## Kilder

| Kilde | Versjon | Hentet |
| --- | --- | --- |
| [Combining Moodstabilizers](https://psychiatrienet.nl/switchtabel/show?id=CombiningMoodstabilizers) | revisjon 10184, lagret 09.03.2024 | 27.10.2026 |
| [Switching Antidepressants](https://psychiatrienet.nl/switchtabel/show?id=SwitchAntidepressants) | revisjon 10673, lagret 15.04.2026 | 27.10.2026 |
| [Switching Antipsychotics](https://psychiatrienet.nl/switchtabel/show?id=SwitchAntipsychotics) | revisjon 10641, lagret 29.01.2026 | 27.10.2026 |
| De 1072 lenkede sidene på https://psychiatrienet.nl | status, overskrift og revisjon per side | 27.10.2026 |
| FEST (fest251.zip) | uttrekk 08.10.2026, fil endret 21.10.2026 | – |
| Fagsidene i OUSFAR | 107 publiserte | 27.10.2026 |
| Stoffregisterfilen | src/data/stoffregister.json, 115 stoffer | – |

Markedsstatusen gjelder dagen FEST-uttrekket ble laget. FEST er ikke
sanntidsbeholdning i apotek.

## Sammendrag

- **54 ulike virkestoffer** (MS: 11, AD: 23, AP: 25), alle med norsk navn og moderstoff i FEST. Johannesurt er ikke med.
- **2 kildegrupper** (Rest AP: 10, Partial agonist: 3). Gruppene er kilderegler, ikke valgbare virkestoffer.
- **9 egne formuleringsvarianter** i Switching Antipsychotics (LA: 7, ER: 1, MA: 1), knyttet til 13 preparatnavn i FEST.
- **60 rad- og kolonneidentiteter** i de tre tabellene (MS: 11, AD: 26, AP: 23).
- **530 preparater (merkevarer) i FEST** for virkestoffene, uten kombinasjonspreparater:
  - Peroral, vanlig frisetting: 358
  - Peroral, modifisert frisetting: 110
  - Injeksjon, korttidsvirkende: 7
  - Injeksjon, middels langtidsvirkende (MA): 1
  - Depotinjeksjon (LA): 52
  - Annen administrasjonsform: 2
- **Fagsider:** 38 finnes, **16 mangler**: Agomelatin, Dosulepin, Fenelzin, Flufenazin, Imipramin, Loksapin, Maprotilin, Moklobemid, Penfluridol, Perisiazin, Pimozid, Promazin, Sulpirid, Tranylcypromin, Trazodon, Trifluoperazin. 16 av dem lages i P2 (`src/verktoy/fagsider.ts`).
- **Celler:** 1274 i alt, 1110 lenkede, 164 tomme. Etter johannesurt og Start-kolonnen er **1039 celler importmål** i P3, og 1036 av dem svarte.

## Dekning per tabell

Tellingen er gjort i tabellene slik de faktisk er, ikke ut fra antatte
totalsummer. «Tom» er en celle med «—»: kilden har ingen anbefaling.

|  | Combining Moodstabilizers | Switching Antidepressants | Switching Antipsychotics |
| --- | --- | --- | --- |
| Rader × kolonner | 11 × 11 | 24 × 26 | 23 × 23 |
| Celler | 121 | 624 | 529 |
| Diagonal (samme identitet) | 11 (0 med lenke) | 24 (0 med lenke) | 23 (3 med lenke) |
| Lenkede celler | 110 | 600 | 400 |
| Tomme celler | 11 | 24 | 129 |
| Tomme utenom diagonalen (ingen anbefaling) | 0 | 0 | 109 |
| Unike lenkemål | 110 | 600 | 347 |
| Lenkede celler som ikke svarer (404) | 0 | 5 | 0 |
| Ekskludert: johannesurt (celler / lenkede) | 0 / 0 | 49 / 48 | 0 / 0 |
| Ikke importert: Start (celler / lenkede) | 0 / 0 | 23 / 23 | 0 / 0 |
| **Importmål** (lenkede, etter utelatelser) | **110** | **529** | **400** |
| Importmål som svarte | 110 | 526 | 400 |

Retning: rad → kolonne. I Combining Moodstabilizers er raden det
eksisterende legemiddelet og kolonnen det som legges til; i de to andre er
raden det man bytter fra og kolonnen det man bytter til. A → B og B → A er
ulike celler med hver sin lenke.

### Lenker som ikke svarer

| Lenke | Funn |
| --- | --- |
| `/switchdetail/partial-agonist` | Gruppesiden for Partial agonist finnes ikke (404). Medlemmene står i innledningen over tabellen. |
| `/switchdetail/rest-ap` | Gruppesiden for Rest AP finnes ikke (404). Medlemmene står i innledningen over tabellen. |
| `/switchdetail/start-dosulepine` | 404. Gjelder Start-kolonnen, som ikke skal importeres. |
| `/switchdetail/start-doxepine` | 404. Gjelder Start-kolonnen, som ikke skal importeres. |
| `/switchdetail/stop` | Stop-cellen for vortioxetine lenker hit (404) i stedet for til virkestoffets side. /switchdetail/stop-vortioxetine finnes (200) og heter «Stop-vortioxetine». P3 henter den siden for cellen og merker at den er hentet fra en annen adresse enn tabellen lenker til. |
| `/switchdetail/stop-doxepine` | 404. /switchdetail/stop-doxepin finnes (200) og heter «Stop-doxepin». P3 henter den siden for cellen og merker at den er hentet fra en annen adresse enn tabellen lenker til. |
| `/switchdetail/stop-fenelzine` | 404. Ingen annen adresse finnes: stop-phenelzine, stop-fenelzin, stop-phenelzin og Stop-fenelzine svarer også 404, og søket på nettstedet finner ingen Stop-side for fenelzin (kontrollert 27.10.2026). Kilden har ingen tilgjengelig Stop-anbefaling for fenelzin, og P3 lager ingen. |

## Kildeidentiteter

### Combining Moodstabilizers

| Kode | Kildens navn | OUSFAR | Formulering |
| --- | --- | --- | --- |
| Ar | Aripiprazole | Virkestoff: Aripiprazol (`aripiprazol`) | uten tillegg |
| Ca | Carbamazepine | Virkestoff: Karbamazepin (`karbamazepin`) | uten tillegg |
| Ga | Gabapentin | Virkestoff: Gabapentin (`gabapentin`) | uten tillegg |
| La | Lamotrigine | Virkestoff: Lamotrigin (`lamotrigin`) | uten tillegg |
| Li | Lithium | Virkestoff: Litium (`litium`) | uten tillegg |
| To | Topiramate | Virkestoff: Topiramat (`topiramat`) | uten tillegg |
| Va | Valproic acid | Virkestoff: Valproat (`valproat`) | uten tillegg |
| Rd | Risperidone | Virkestoff: Risperidon (`risperidon`) | uten tillegg |
| Ol | Olanzapine | Virkestoff: Olanzapin (`olanzapin`) | uten tillegg |
| Qu | Quetiapine | Virkestoff: Kvetiapin (`kvetiapin`) | uten tillegg |
| Zi | Ziprasidone | Virkestoff: Ziprasidon (`ziprasidon`) | uten tillegg |

### Switching Antidepressants

| Kode | Kildens navn | OUSFAR | Formulering |
| --- | --- | --- | --- |
| Start | – | Generell start – **importeres ikke** | – |
| Ag | agomelatine | Virkestoff: Agomelatin (`agomelatin`) | uten tillegg |
| At | amitriptyline | Virkestoff: Amitriptylin (`amitriptylin`) | uten tillegg |
| Bu | bupropion | Virkestoff: Bupropion (`bupropion`) | uten tillegg |
| Ci | citalopram | Virkestoff: Citalopram (`citalopram`) | uten tillegg |
| Cl | clomipramine | Virkestoff: Klomipramin (`klomipramin`) | uten tillegg |
| Ds | dosulepine | Virkestoff: Dosulepin (`dosulepin`) | uten tillegg |
| Dx | doxepine | Virkestoff: Doksepin (`doksepin`) | uten tillegg |
| Du | duloxetine | Virkestoff: Duloksetin (`duloksetin`) | uten tillegg |
| Es | escitalopram | Virkestoff: Escitalopram (`escitalopram`) | uten tillegg |
| Fe | fenelzine | Virkestoff: Fenelzin (`fenelzin`) | uten tillegg |
| Fo | fluoxetine | Virkestoff: Fluoksetin (`fluoksetin`) | uten tillegg |
| Fv | fluvoxamine | Virkestoff: Fluvoksamin (`fluvoksamin`) | uten tillegg |
| Hy | hypericum | **Ekskludert** (johannesurt) | – |
| Im | imipramine | Virkestoff: Imipramin (`imipramin`) | uten tillegg |
| Ma | maprotiline | Virkestoff: Maprotilin (`maprotilin`) | uten tillegg |
| Mz | mirtazapine | Virkestoff: Mirtazapin (`mirtazapin`) | uten tillegg |
| Mo | moclobemide | Virkestoff: Moklobemid (`moklobemid`) | uten tillegg |
| No | nortriptyline | Virkestoff: Nortriptylin (`nortriptylin`) | uten tillegg |
| Pa | paroxetine | Virkestoff: Paroksetin (`paroksetin`) | uten tillegg |
| Se | sertraline | Virkestoff: Sertralin (`sertralin`) | uten tillegg |
| Tc | tranylcypromine | Virkestoff: Tranylcypromin (`tranylcypromin`) | uten tillegg |
| Td | trazodone | Virkestoff: Trazodon (`trazodon`) | uten tillegg |
| Ve | venlafaxine | Virkestoff: Venlafaksin (`venlafaksin`) | uten tillegg |
| Vo | vortioxetine | Virkestoff: Vortioksetin (`vortioksetin`) | uten tillegg |
| Stop | – | Seponering (Stop) – importeres | – |

### Switching Antipsychotics

| Kode | Kildens navn | OUSFAR | Formulering |
| --- | --- | --- | --- |
| Am | Amisulpride | Virkestoff: Amisulprid (`amisulprid`) | uten tillegg |
| Cp | Clozapine | Virkestoff: Klozapin (`klozapin`) | uten tillegg |
| Hp | Haloperidol | Virkestoff: Haloperidol (`haloperidol`) | uten tillegg |
| Lu | Lurasidone | Virkestoff: Lurasidon (`lurasidon`) | uten tillegg |
| Ol | Olanzapine | Virkestoff: Olanzapin (`olanzapin`) | uten tillegg |
| Pp | Paliperidone | Virkestoff: Paliperidon (`paliperidon`) | uten tillegg |
| Pa | Partial agonist | Gruppe (kilderegel): Aripiprazol, Brekspiprazol, Kariprazin | – |
| Pf | Penfluridol | Virkestoff: Penfluridol (`penfluridol`) | uten tillegg |
| Pi | Pimozide | Virkestoff: Pimozid (`pimozid`) | uten tillegg |
| Qu | Quetiapine | Virkestoff: Kvetiapin (`kvetiapin`) | uten tillegg |
| Rd | Risperidone | Virkestoff: Risperidon (`risperidon`) | uten tillegg |
| Sd | Sertindole | Virkestoff: Sertindol (`sertindol`) | uten tillegg |
| Sr | Sulpiride | Virkestoff: Sulpirid (`sulpirid`) | uten tillegg |
| RA | Rest AP | Gruppe (kilderegel): Klorprotiksen, Flupentiksol, Flufenazin, Loksapin, Perisiazin, Perfenazin, Promazin, Trifluoperazin, Ziprasidon, Zuklopentiksol | – |
| Da | Aripiprazole_LA | Virkestoff: Aripiprazol (`aripiprazol`) | LA |
| Di | Flupenthixol_LA | Virkestoff: Flupentiksol (`flupentiksol`) | LA |
| Df | Fluphenazine_LA | Virkestoff: Flufenazin (`flufenazin`) | LA |
| Dh | Haloperidol_LA | Virkestoff: Haloperidol (`haloperidol`) | LA |
| Do | Olanzapine_LA | Virkestoff: Olanzapin (`olanzapin`) | LA |
| Dp | Paliperidone_ER | Virkestoff: Paliperidon (`paliperidon`) | ER |
| Dr | Risperidone_LA | Virkestoff: Risperidon (`risperidon`) | LA |
| Dz | Zuclopenthixol_LA | Virkestoff: Zuklopentiksol (`zuklopentiksol`) | LA |
| Mz | Zuclopenthixol_MA | Virkestoff: Zuklopentiksol (`zuklopentiksol`) | MA |

Kildeformuleringene:

- **Uten tillegg** → Peroral, vanlig frisetting eller Peroral, modifisert frisetting. Rad uten tillegg. Kilden sier ikke om vanlig eller modifisert frisetting gjelder.
- **LA** → Depotinjeksjon (LA). Long acting: depotinjeksjon.
- **ER** → Depotinjeksjon (LA). Extended release. I Switching Antipsychotics er dette paliperidonpalmitat som depotinjeksjon, ikke peroral depottablett.
- **MA** → Injeksjon, middels langtidsvirkende (MA). Medium acting: injeksjon som virker i noen dager.

## Virkestoffer

Norsk navn er FESTs navn på moderstoffet, eller fagsidens navn når den har et
annet. Aliasene er FESTs engelske navn og kildens stavemåter.

| Norsk navn | Nøkkel | Aliaser | FEST (moderstoff) | Salter/estere i FEST | Fagside | I stoffregisterfilen | Marked | Tabeller |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Agomelatin | `agomelatin` | agomelatine | Agomelatin `ID_B01358F8-EB08-4C5C-8399-4F70197493F1` | – | lages i P2 | ja | Bare preparater med godkjenningsfritak | AD |
| Amisulprid | `amisulprid` | amisulpride | Amisulprid `ID_23A8F342-84DC-41FF-B835-B9A45B2F6394` | – | finnes | ja | Markedsført legemiddel i Norge | AP |
| Amitriptylin | `amitriptylin` | amitriptyline | Amitriptylin `ID_0A1B24EF-A7F8-488B-97B8-8023193E976D` | Amitriptylinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Aripiprazol | `aripiprazol` | aripiprazole | Aripiprazol `ID_4596EE8B-CD03-43E0-AEA8-CDB60778EA43` | Aripiprazolmonohydrat | finnes | ja | Markedsført legemiddel i Norge | MS, AP |
| Brekspiprazol | `brekspiprazol` | brexpiprazole | Brekspiprazol `ID_68DCFD07-0824-4962-AA56-FD6ED472D9B8` | – | finnes | ja | Markedsført legemiddel i Norge | AP |
| Bupropion | `bupropion` | – | Bupropion `ID_4FE84EA2-FC1B-44A6-8D70-2A118B211697` | Bupropionhydrobromid, Bupropionhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Citalopram | `citalopram` | – | Citalopram `ID_E2B9E074-0D21-4E5E-9867-BC70B8FC2654` | Citalopramhydrobromid, Citalopramhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Doksepin | `doksepin` | doxepin, doxepine | Doksepin `ID_AF1D3EF5-E7BA-45E4-8C6F-EB410DB3C4AF` | Doksepinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Dosulepin | `dosulepin` | dosulepine | Dosulepin `ID_DD009B35-8BF4-4080-80C5-3F400A89F713` | – | lages i P2 | ja | Ingen preparater i FEST | AD |
| Duloksetin | `duloksetin` | duloxetine | Duloksetin `ID_D27A3210-135D-42C9-9DB3-8AB8CBEA77E6` | Duloksetinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Escitalopram | `escitalopram` | – | Escitalopram `ID_13E05918-25C1-4DAA-A0F5-1266DEC3A75F` | Escitalopramoksalat | finnes | ja | Markedsført legemiddel i Norge | AD |
| Fenelzin | `fenelzin` | fenelzine, phenelzine | Fenelzin `ID_B3CA8826-0F7A-4190-B1C3-E3B897AE69FF` | Fenelzinsulfat | lages i P2 | ja | Bare preparater med godkjenningsfritak | AD |
| Flufenazin | `flufenazin` | fluphenazine | Flufenazin `ID_0263C5B9-693B-4BE3-84D4-7EB46AB0A71C` | Flufenazindekanoat, Flufenazindihydroklorid, Flufenazinenantat | lages i P2 | ja | Bare preparater med godkjenningsfritak | AP |
| Fluoksetin | `fluoksetin` | fluoxetine | Fluoksetin `ID_D473FE91-133D-494A-A2B0-C644A8372A8B` | Fluoksetinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Flupentiksol | `flupentiksol` | flupenthixol, flupentixol | Flupentiksol `ID_9E8C912B-84DB-4AFF-BE91-DB21F945B83E` | Flupentiksoldekanoat, Flupentiksoldihydroklorid | finnes | ja | Markedsført legemiddel i Norge | AP |
| Fluvoksamin | `fluvoksamin` | fluvoxamine | Fluvoksamin `ID_A39218DE-5973-4473-A005-FBA8B4E86C62` | Fluvoksaminmaleat | finnes | ja | Markedsført legemiddel i Norge | AD |
| Gabapentin | `gabapentin` | – | Gabapentin `ID_A46CFA9C-F01A-4F03-AF5C-28A5579898DB` | – | finnes | ja | Markedsført legemiddel i Norge | MS |
| Haloperidol | `haloperidol` | – | Haloperidol `ID_667FA975-A8EC-4CF8-A89E-96F97808E3AD` | Haloperidoldekanoat | finnes | ja | Markedsført legemiddel i Norge | AP |
| Imipramin | `imipramin` | imipramine | Imipramin `ID_D136F468-4949-4C91-81E4-04628D7C07DE` | Imipraminhydroklorid | lages i P2 | ja | Bare preparater med godkjenningsfritak | AD |
| Karbamazepin | `karbamazepin` | carbamazepine | Karbamazepin `ID_8418C9B9-33E9-4757-9224-7D3A76E776B6` | – | finnes | ja | Markedsført legemiddel i Norge | MS |
| Kariprazin | `kariprazin` | cariprazine | Kariprazin `ID_966A0E9E-10AF-40C1-BA48-3E2E6ECF49C2` | Kariprazinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AP |
| Klomipramin | `klomipramin` | clomipramine | Klomipramin `ID_40E4710B-8115-40CA-986D-E98AE4C2D6B0` | Klomipraminhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Klorprotiksen | `klorprotiksen` | chlorprothixene | Klorprotiksen `ID_9672824E-CE48-45EB-B232-E41DC928D08B` | Klorprotiksenhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AP |
| Klozapin | `klozapin` | clozapine | Klozapin `ID_41137AC7-7E5B-47BA-BF41-4CE0672EF755` | – | finnes | ja | Markedsført legemiddel i Norge | AP |
| Kvetiapin | `kvetiapin` | quetiapine | Kvetiapin `ID_61E766DA-E71D-4381-B4DE-2A06C51A2BD8` | Kvetiapinfumarat | finnes | ja | Markedsført legemiddel i Norge | MS, AP |
| Lamotrigin | `lamotrigin` | lamotrigine | Lamotrigin `ID_F456CD11-3821-4C60-B36F-DE0C9D51ED22` | – | finnes | ja | Markedsført legemiddel i Norge | MS |
| Litium | `litium` | lithium, litiumion | Litiumion `ID_36AEA22F-E6BC-4CF0-9A3F-2E9341A7B5F6` | Litiumhydroksidmonohydrat, Litiumkarbonat, Litiumklorid, Litiumorotat, Litiumsitrat, Litiumsitrat, Ph. Eur., Litiumsuksinat, Litiumsulfat | finnes | ja | Markedsført legemiddel i Norge | MS |
| Loksapin | `loksapin` | loxapine | Loksapin `ID_CBF9DD3B-0EFC-4CB2-B78C-9D61AFD78AFA` | – | lages i P2 | ja | Ingen preparater i FEST | AP |
| Lurasidon | `lurasidon` | lurasidone | Lurasidon `ID_3B369762-A4B8-49DB-931D-6AC9D901ABAC` | Lurasidonhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AP |
| Maprotilin | `maprotilin` | maprotiline | Maprotilin `ID_EC5AFDB1-7FAD-44E8-BD51-89E84AC709E3` | – | lages i P2 | ja | Ingen preparater i FEST | AD |
| Mirtazapin | `mirtazapin` | mirtazapine | Mirtazapin `ID_0AFFD596-9932-44A7-86E8-F35BBDB1FCAD` | Mirtazapinhemihydrat | finnes | ja | Markedsført legemiddel i Norge | AD |
| Moklobemid | `moklobemid` | moclobemide | Moklobemid `ID_D1F74888-C7D1-474F-A9E8-2E58CB136B06` | – | lages i P2 | ja | Markedsført legemiddel i Norge | AD |
| Nortriptylin | `nortriptylin` | nortriptyline | Nortriptylin `ID_829694BA-B839-4173-BE1A-37CD35C17700` | Nortriptylinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Olanzapin | `olanzapin` | olanzapine | Olanzapin `ID_A86FC555-41CA-4E80-A188-ED521EEC5903` | Olanzapinembonatmonohydrat | finnes | ja | Markedsført legemiddel i Norge | MS, AP |
| Paliperidon | `paliperidon` | paliperidone | Paliperidon `ID_82CAEDDE-7CB1-4302-9C30-6A2010DB6D85` | Paliperidonpalmitat | finnes | ja | Markedsført legemiddel i Norge | AP |
| Paroksetin | `paroksetin` | paroxetine | Paroksetin `ID_0F9E3AC0-1950-4CF5-8F4F-4008696E85B8` | Paroksetinhydroklorid, Paroksetinhydrokloridhemihydrat, Paroksetinmesilat | finnes | ja | Markedsført legemiddel i Norge | AD |
| Penfluridol | `penfluridol` | – | Penfluridol `ID_DF5D1607-B995-49E6-A7F1-CF4440AC101A` | – | lages i P2 | ja | Bare preparater med godkjenningsfritak | AP |
| Perfenazin | `perfenazin` | perphenazine | Perfenazin `ID_57F9D9AC-707C-4172-8A52-2C2D944B5FF5` | Perfenazindekanoat | finnes | ja | Markedsført legemiddel i Norge | AP |
| Perisiazin | `perisiazin` | periciazine, pericyazine | Perisiazin `ID_429EE77E-79B6-4431-98E8-D5281A9E1D39` | – | lages i P2 | ja | Ingen preparater i FEST | AP |
| Pimozid | `pimozid` | pimozide | Pimozid `ID_D700661D-AD77-4F91-880E-5B101EFAC189` | – | lages i P2 | ja | Bare preparater med godkjenningsfritak | AP |
| Promazin | `promazin` | promazine | Promazin `ID_891C7906-F62A-4D2B-80B2-2CE5478CAF18` | – | lages i P2 | ja | Ingen preparater i FEST | AP |
| Risperidon | `risperidon` | risperidone | Risperidon `ID_852F4AC9-FF5C-4C97-999E-03FE3C144223` | – | finnes | ja | Markedsført legemiddel i Norge | MS, AP |
| Sertindol | `sertindol` | sertindole | Sertindol `ID_79EE8CA6-168F-444A-9C83-2F6110A42CF0` | – | finnes | ja | Markedsført legemiddel i Norge | AP |
| Sertralin | `sertralin` | sertraline | Sertralin `ID_1C2C9254-987B-4A37-AC48-6349BB671F07` | Sertralinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Sulpirid | `sulpirid` | sulpiride | Sulpirid `ID_E5BEB70C-39AD-4EA1-87B5-63983C1D534A` | – | lages i P2 | ja | Bare preparater med godkjenningsfritak | AP |
| Topiramat | `topiramat` | topiramate | Topiramat `ID_A8E3BC2D-A60C-4AA6-B069-5D09BC84ADE0` | – | finnes | ja | Markedsført legemiddel i Norge | MS |
| Tranylcypromin | `tranylcypromin` | tranylcypromine | Tranylcypromin `ID_6E876C08-FF0F-48BC-AAEE-15C0A3B83DCA` | Tranylcyprominsulfat | lages i P2 | ja | Bare preparater med godkjenningsfritak | AD |
| Trazodon | `trazodon` | trazodone | Trazodon `ID_90E0E28B-FDED-44F8-88DA-EEB0232AEAFD` | Trazodonhydroklorid | lages i P2 | ja | Bare preparater med godkjenningsfritak | AD |
| Trifluoperazin | `trifluoperazin` | trifluoperazine | Trifluoperazin `ID_E52C65FD-26A0-4B1F-8E26-EB3012B77F81` | – | lages i P2 | ja | Ingen preparater i FEST | AP |
| Valproat | `valproat` | valproic acid, valproinsyre | Valproinsyre `ID_A61E2EDC-D6B4-4E52-89F4-3D10F0E03E38` | Divalproeksnatrium, Natriumvalproat | finnes | ja | Markedsført legemiddel i Norge | MS |
| Venlafaksin | `venlafaksin` | venlafaxine | Venlafaksin `ID_289921F8-A934-43E2-8F86-DB736FA198DF` | Venlafaksinhydroklorid | finnes | ja | Markedsført legemiddel i Norge | AD |
| Vortioksetin | `vortioksetin` | vortioxetine | Vortioksetin `ID_328991B3-C34B-4D78-AD5C-7D7DDA7B2DCA` | Vortioksetin DL-laktat, Vortioksetinhydrobromid, Vortioksetinhydrobromidbenzylalkoholhemisolvat | finnes | ja | Markedsført legemiddel i Norge | AD |
| Ziprasidon | `ziprasidon` | ziprasidone | Ziprasidon `ID_97EEA6F8-10CB-44CC-B37D-9B3DC81A6398` | Ziprasidonhydroklorid, Ziprasidonhydrokloridmonohydrat, Ziprasidonmesilattrihydrat | finnes | ja | Markedsført legemiddel i Norge | MS, AP |
| Zuklopentiksol | `zuklopentiksol` | zuclopenthixol, zuclopentixol | Zuklopentiksol `ID_31472D31-DAB7-49DF-AB66-A7CDA5A8222B` | Zuklopentiksolacetat, Zuklopentiksoldekanoat, Zuklopentiksoldihydroklorid | finnes | ja | Markedsført legemiddel i Norge | AP |

MS = Combining Moodstabilizers, AD = Switching Antidepressants, AP = Switching Antipsychotics.

### Virkestoffer som mangler fagside

Etter fagsidene i produksjon da øyeblikksbildet ble tatt. Sidene P2 lager, er
uten faginnhold og kobles til moderstoffet i FEST; de står her til bildet er
tatt på nytt etter utrullingen.

| Virkestoff | Nøkkel | Marked | Tabeller | Kategori i stoffregisteret (P2) |
| --- | --- | --- | --- | --- |
| Agomelatin | `agomelatin` | Bare preparater med godkjenningsfritak | AD | Antidepressiver |
| Dosulepin | `dosulepin` | Ingen preparater i FEST | AD | Antidepressiver › TCA |
| Fenelzin | `fenelzin` | Bare preparater med godkjenningsfritak | AD | Antidepressiver › MAO-hemmere |
| Flufenazin | `flufenazin` | Bare preparater med godkjenningsfritak | AP | Antipsykotika › Førstegenerasjonsmidler |
| Imipramin | `imipramin` | Bare preparater med godkjenningsfritak | AD | Antidepressiver › TCA |
| Loksapin | `loksapin` | Ingen preparater i FEST | AP | Antipsykotika › Førstegenerasjonsmidler |
| Maprotilin | `maprotilin` | Ingen preparater i FEST | AD | Antidepressiver |
| Moklobemid | `moklobemid` | Markedsført legemiddel i Norge | AD | Antidepressiver › MAO-hemmere |
| Penfluridol | `penfluridol` | Bare preparater med godkjenningsfritak | AP | Antipsykotika › Førstegenerasjonsmidler |
| Perisiazin | `perisiazin` | Ingen preparater i FEST | AP | Antipsykotika › Førstegenerasjonsmidler |
| Pimozid | `pimozid` | Bare preparater med godkjenningsfritak | AP | Antipsykotika › Førstegenerasjonsmidler |
| Promazin | `promazin` | Ingen preparater i FEST | AP | Antipsykotika › Førstegenerasjonsmidler |
| Sulpirid | `sulpirid` | Bare preparater med godkjenningsfritak | AP | Antipsykotika › Førstegenerasjonsmidler |
| Tranylcypromin | `tranylcypromin` | Bare preparater med godkjenningsfritak | AD | Antidepressiver › MAO-hemmere |
| Trazodon | `trazodon` | Bare preparater med godkjenningsfritak | AD | Antidepressiver |
| Trifluoperazin | `trifluoperazin` | Ingen preparater i FEST | AP | Antipsykotika › Førstegenerasjonsmidler |

### Søkealiaser som ikke finnes i dag

Navn fagsøket ikke allerede finner gjennom stavemåteregelen (`navnenokkel`)
eller stoffregisterfilen.

Ingen: de er lagt inn i stoffregisterfilen (P2).

## Formuleringer i FEST

Antall preparatnavn (merkevarer) per legemiddelform, uten
kombinasjonspreparater. Formuleringen er lest av FESTs legemiddelform og
administrasjonsvei, med overstyringene under.

| Virkestoff | Formuleringer |
| --- | --- |
| Agomelatin | **Peroral, vanlig frisetting:** Tablett (1) |
| Amisulprid | **Peroral, vanlig frisetting:** Tablett (8) |
| Amitriptylin | **Peroral, vanlig frisetting:** Tablett (8), Mikstur, oppløsning (2)<br>**Peroral, modifisert frisetting:** Depotkapsel, hard (1) |
| Aripiprazol | **Peroral, vanlig frisetting:** Mikstur, oppløsning (4), Smeltetablett (6), Tablett (18)<br>**Injeksjon, korttidsvirkende:** Injeksjonsvæske, oppløsning (1)<br>**Depotinjeksjon (LA):** Depotinjeksjonsvæske, suspensjon (3), Pulver og væske til depotinjeksjonsvæske, suspensjon (2) |
| Brekspiprazol | **Peroral, vanlig frisetting:** Tablett (7) |
| Bupropion | **Peroral, modifisert frisetting:** Tablett med modifisert frisetting (6) |
| Citalopram | **Peroral, vanlig frisetting:** Tablett (6) |
| Doksepin | **Peroral, vanlig frisetting:** Kapsel, hard (2) |
| Dosulepin | *ingen preparater i FEST* |
| Duloksetin | **Peroral, modifisert frisetting:** Enterokapsel, hard (8) |
| Escitalopram | **Peroral, vanlig frisetting:** Dråper, oppløsning (3), Tablett (11) |
| Fenelzin | **Peroral, vanlig frisetting:** Tablett (3) |
| Flufenazin | **Peroral, vanlig frisetting:** Tablett (2)<br>**Depotinjeksjon (LA):** Injeksjonsvæske, oppløsning (3) |
| Fluoksetin | **Peroral, vanlig frisetting:** Dispergerbar tablett (7), Tablett (4), Kapsel, hard (6), Smeltetablett (1) |
| Flupentiksol | **Peroral, vanlig frisetting:** Tablett (4)<br>**Depotinjeksjon (LA):** Injeksjonsvæske, oppløsning (4) |
| Fluvoksamin | **Peroral, vanlig frisetting:** Tablett (4) |
| Gabapentin | **Peroral, vanlig frisetting:** Mikstur, oppløsning (4), Kapsel, hard (4), Tablett (2) |
| Haloperidol | **Peroral, vanlig frisetting:** Mikstur, oppløsning (1), Tablett (4)<br>**Injeksjon, korttidsvirkende:** Injeksjonsvæske, oppløsning (1)<br>**Depotinjeksjon (LA):** Injeksjonsvæske, oppløsning (1) |
| Imipramin | **Peroral, vanlig frisetting:** Tablett (2) |
| Karbamazepin | **Peroral, vanlig frisetting:** Mikstur, suspensjon (1), Tablett (2)<br>**Peroral, modifisert frisetting:** Depottablett (7)<br>**Annen administrasjonsform:** Stikkpille (2) |
| Kariprazin | **Peroral, vanlig frisetting:** Kapsel, hard (4) |
| Klomipramin | **Peroral, vanlig frisetting:** Tablett (4) |
| Klorprotiksen | **Peroral, vanlig frisetting:** Tablett (5) |
| Klozapin | **Peroral, vanlig frisetting:** Tablett (4), Smeltetablett (2) |
| Kvetiapin | **Peroral, vanlig frisetting:** Tablett (16), Mikstur, suspensjon (1)<br>**Peroral, modifisert frisetting:** Depottablett (53) |
| Lamotrigin | **Peroral, vanlig frisetting:** Tablett (8), Tyggetablett/dispergerbar tablett (7) |
| Litium | **Peroral, vanlig frisetting:** Kapsel, hard (1), Tablett (3), Sirup (1)<br>**Peroral, modifisert frisetting:** Depottablett (7)<br>**Injeksjon, korttidsvirkende:** Injeksjonsvæske, oppløsning (1) |
| Loksapin | *ingen preparater i FEST* |
| Lurasidon | **Peroral, vanlig frisetting:** Tablett (9) |
| Maprotilin | *ingen preparater i FEST* |
| Mirtazapin | **Peroral, vanlig frisetting:** Smeltetablett (11), Tablett (7), Mikstur, oppløsning (1) |
| Moklobemid | **Peroral, vanlig frisetting:** Tablett (6) |
| Nortriptylin | **Peroral, vanlig frisetting:** Tablett (3) |
| Olanzapin | **Peroral, vanlig frisetting:** Tablett (21), Smeltetablett (14)<br>**Injeksjon, korttidsvirkende:** Pulver til injeksjonsvæske, oppløsning (2)<br>**Depotinjeksjon (LA):** Pulver og væske til depotinjeksjonsvæske, suspensjon (7) |
| Paliperidon | **Peroral, modifisert frisetting:** Depottablett (2)<br>**Depotinjeksjon (LA):** Depotinjeksjonsvæske, suspensjon (22) |
| Paroksetin | **Peroral, vanlig frisetting:** Tablett (3) |
| Penfluridol | **Peroral, vanlig frisetting:** Tablett (1) |
| Perfenazin | **Peroral, vanlig frisetting:** Tablett (7)<br>**Depotinjeksjon (LA):** Injeksjonsvæske, oppløsning (1) |
| Perisiazin | *ingen preparater i FEST* |
| Pimozid | **Peroral, vanlig frisetting:** Tablett (4) |
| Promazin | *ingen preparater i FEST* |
| Risperidon | **Peroral, vanlig frisetting:** Mikstur, oppløsning (2), Tablett (14), Smeltetablett (2)<br>**Depotinjeksjon (LA):** Pulver og væske til depotinjeksjonsvæske, suspensjon (5) |
| Sertindol | **Peroral, vanlig frisetting:** Tablett (4) |
| Sertralin | **Peroral, vanlig frisetting:** Tablett (15), Kapsel, hard (2), Konsentrat til mikstur (2) |
| Sulpirid | **Peroral, vanlig frisetting:** Kapsel, hard (1), Tablett (1) |
| Topiramat | **Peroral, vanlig frisetting:** Tablett (7), Kapsel, hard (2), Mikstur, suspensjon (1) |
| Tranylcypromin | **Peroral, vanlig frisetting:** Tablett (3) |
| Trazodon | **Peroral, vanlig frisetting:** Tablett (7), Kapsel, hard (3) |
| Trifluoperazin | *ingen preparater i FEST* |
| Valproat | **Peroral, vanlig frisetting:** Mikstur, oppløsning (4)<br>**Peroral, modifisert frisetting:** Enterotablett (6), Enterokapsel, hard (1), Depottablett (3), Depotkapsel, hard (3), Depotgranulat (2)<br>**Injeksjon, korttidsvirkende:** Injeksjonsvæske, oppløsning (1), Injeksjons-/infusjonsvæske, oppløsning (1) |
| Venlafaksin | **Peroral, modifisert frisetting:** Depotkapsel, hard (7), Depottablett (4) |
| Vortioksetin | **Peroral, vanlig frisetting:** Tablett (10) |
| Ziprasidon | **Peroral, vanlig frisetting:** Kapsel, hard (4) |
| Zuklopentiksol | **Peroral, vanlig frisetting:** Dråper, oppløsning (1), Tablett (3)<br>**Injeksjon, middels langtidsvirkende (MA):** Injeksjonsvæske, oppløsning (1)<br>**Depotinjeksjon (LA):** Injeksjonsvæske, oppløsning (4) |

### Overstyrt formulering

FEST skiller ikke en esterdepot fra en vanlig injeksjon i formen eller
styrken. Disse preparatene har derfor fått formuleringen uttrykkelig:

| Preparat | Virkestoff | Formulering | Grunnlag |
| --- | --- | --- | --- |
| Haldol Depot | Haloperidol | Depotinjeksjon (LA) | Haloperidoldekanoat (preparatomtalen 0000-06767). FEST oppgir vanlig injeksjonsvæske med styrken på haloperidol. |
| Fluanxol Depot | Flupentiksol | Depotinjeksjon (LA) | Flupentiksoldekanoat (preparatomtalen 0000-05934). FEST oppgir vanlig injeksjonsvæske med styrken på flupentiksol. |
| Cisordinol Depot | Zuklopentiksol | Depotinjeksjon (LA) | Zuklopentiksoldekanoat (preparatomtalen 0000-06226). FEST oppgir vanlig injeksjonsvæske med styrken på zuklopentiksol. |
| Cisordinol-Acutard | Zuklopentiksol | Injeksjon, middels langtidsvirkende (MA) | Zuklopentiksolacetat (preparatomtalen 0000-07543). FEST oppgir vanlig injeksjonsvæske med styrken på zuklopentiksol. |
| Trilafon Dekanoat | Perfenazin | Depotinjeksjon (LA) | Perfenazindekanoat (preparatomtalen 0000-07128). FEST oppgir vanlig injeksjonsvæske. |
| Modecate | Flufenazin | Depotinjeksjon (LA) | Godkjenningsfritak uten preparatomtale i FEST; ført som depot fordi kilden har en egen depotrad for flufenazin og FEST ikke har noen annen flufenazininjeksjon. Ikke kontrollert mot preparatomtale. |
| Fluphenazin-neuraxpharm D | Flufenazin | Depotinjeksjon (LA) | Godkjenningsfritak uten preparatomtale i FEST; ført som depot av samme grunn som Modecate. Ikke kontrollert mot preparatomtale. |

## Depot- og MA-varianter i Switching Antipsychotics

| Kode | Kildens navn | Preparat | Salt/ester | Intervall | Grunnlag | I FEST |
| --- | --- | --- | --- | --- | --- | --- |
| Da | Aripiprazole_LA | Abilify Maintena | ikke kontrollert | Kilden: 300 og 400 mg én gang i måneden, 720 og 960 mg hver annen måned | Psychiatrienet, f.eks. /switchdetail/aripiprazole-la-amisulpride. Ikke kontrollert mot preparatomtalen (sentralt godkjent). | Abilify Maintena depotinj væske, susp 720 mg<br>Abilify Maintena depotinj væske, susp 960 mg<br>Abilify Maintena pulv til depotinj væske, susp 400 mg<br>Abilify Maintena pulv til depotinj væske, susp 400 mg/sprøyte |
| Di | Flupenthixol_LA | Fluanxol Depot | flupentiksoldekanoat | hver 2. til 4. uke | Preparatomtalen 0000-05934, pkt. 2 og 4.2 | Fluanxol Depot inj, oppl 100 mg/ml |
| Df | Fluphenazine_LA | Fluphenazin-neuraxpharm D | ikke kontrollert | ikke kontrollert | Bare godkjenningsfritak; ingen preparatomtale i FEST. Ester og intervall ikke kontrollert. | Fluphenazin-neuraxpharm D inj, oppl 100 mg/ml (Krever godkj. Fritak)<br>Fluphenazin-neuraxpharm D inj, oppl 12,5 mg/0,5 ml (Krever godkj. Fritak) |
| Df | Fluphenazine_LA | Modecate | ikke kontrollert | ikke kontrollert | Bare godkjenningsfritak; ingen preparatomtale i FEST. Ester og intervall ikke kontrollert. | Modecate inj, oppl 25 mg/ml (Krever godkj. Fritak) |
| Dh | Haloperidol_LA | Haldol Depot | haloperidoldekanoat | vanligvis 4 uker | Preparatomtalen 0000-06767, pkt. 2 og 4.2 | Haldol Depot inj, oppl 100 mg/ml |
| Do | Olanzapine_LA | Zypadhera | ikke kontrollert | ikke kontrollert | Sentralt godkjent; ikke kontrollert mot preparatomtalen i P1. | Zypadhera pulv til depotinj væske, susp 210 mg<br>Zypadhera pulv til depotinj væske, susp 210 mg (Krever godkj. Fritak)<br>Zypadhera pulv til depotinj væske, susp 300 mg (Krever godkj. Fritak)<br>Zypadhera pulv til depotinj væske, susp 300 mg<br>Zypadhera pulv til depotinj væske, susp 405 mg (Krever godkj. Fritak)<br>Zypadhera pulv til depotinj væske, susp 405 mg |
| Do | Olanzapine_LA | Zyprexa Relprevv | ikke kontrollert | ikke kontrollert | Kildesidene nevner «Relprevv». I FEST bare med godkjenningsfritak. | Zyprexa Relprevv pulv til depotinj væske, susp 405 mg (Krever godkj. Fritak) |
| Dp | Paliperidone_ER | Xeplion | ikke kontrollert | ikke kontrollert | Står i kildens fotnote om ER. Sentralt godkjent; ikke kontrollert mot preparatomtalen i P1. | Xeplion depotinj væske, susp 100 mg/sprøyte<br>Xeplion depotinj væske, susp 100 mg/sprøyte (Krever godkj. Fritak)<br>Xeplion depotinj væske, susp 150 mg<br>Xeplion depotinj væske, susp 150 mg/sprøyte (Krever godkj. Fritak)<br>Xeplion depotinj væske, susp 150 mg/sprøyte<br>Xeplion depotinj væske, susp 25 mg/sprøyte (Krever godkj. Fritak)<br>Xeplion depotinj væske, susp 50 mg/sprøyte<br>Xeplion depotinj væske, susp 75 mg/sprøyte<br>Xeplion depotinj væske, susp 75 mg/sprøyte (Krever godkj. Fritak) |
| Dp | Paliperidone_ER | Trevicta | ikke kontrollert | ikke kontrollert | Står i kildens fotnote om ER (skrevet «Trivecta»). Sentralt godkjent; ikke kontrollert mot preparatomtalen i P1. | Trevicta depotinj væske, susp 175 mg/sprøyte<br>Trevicta depotinj væske, susp 263 mg/sprøyte<br>Trevicta depotinj væske, susp 350 mg/sprøyte<br>Trevicta depotinj væske, susp 525 mg/sprøyte |
| Dp | Paliperidone_ER | Palmeux | ikke kontrollert | ikke kontrollert | Står i kildens fotnote om ER. Ikke kontrollert mot preparatomtalen i P1. | Palmeux depotinj væske, susp 100 mg/sprøyte<br>Palmeux depotinj væske, susp 150 mg/sprøyte<br>Palmeux depotinj væske, susp 50 mg/sprøyte<br>Palmeux depotinj væske, susp 75 mg/sprøyte |
| Dr | Risperidone_LA | Risperdal Consta | risperidon (ikke salt eller ester) | annenhver uke | Preparatomtalen 2001-09858, pkt. 2 og 4.2 | Risperdal Consta pulv til depotinj væske, susp 25 mg/sprøyte<br>Risperdal Consta pulv til depotinj væske, susp 37,5 mg/sprøyte<br>Risperdal Consta pulv til depotinj væske, susp 50 mg/sprøyte |
| Dz | Zuclopenthixol_LA | Cisordinol Depot | zuklopentiksoldekanoat | hver 2. til 4. uke | Preparatomtalen 0000-06226, pkt. 2 og 4.2 | Cisordinol Depot inj, oppl 200 mg/ml<br>Cisordinol Depot inj, oppl 500 mg/ml (Krever godkj. Fritak) |
| Mz | Zuclopenthixol_MA | Cisordinol-Acutard | zuklopentiksolacetat | ny injeksjon etter 2–3 dager ved behov; behandlingen bør ikke overstige 2 uker | Preparatomtalen 0000-07543, pkt. 2 og 4.2 | Cisordinol-Acutard inj, oppl 50 mg/ml |

### Depotinjeksjoner i FEST uten kildevariant

| Preparat | Virkestoff | Grunn |
| --- | --- | --- |
| Trilafon Dekanoat | Perfenazin | Perfenazin er bare med i kilden som medlem av Rest AP; kilden har ingen depotrad for perfenazin. |
| Okedi | Risperidon | Nevnes ikke av kilden. Om Risperidone_LA omfatter Okedi, må avklares før P10. |
| Paliperidon Zentiva | Paliperidon | Ikke nevnt i kildens fotnote om ER. Om Paliperidone_ER omfatter preparatet, må avklares før P10. |
| Niapelf | Paliperidon | Godkjenningsfritak, ikke nevnt i kildens fotnote om ER. Om Paliperidone_ER omfatter preparatet, må avklares før P10. |

## Avvik og uavklarte punkter

- **Doksepin:** Kilden staver «doxepine».
- **Dosulepin:** Kilden staver «dosulepine».
- **Fenelzin:** Kilden staver «fenelzine» (nederlandsk form); FESTs engelske navn er «Phenelzine».
- **Flupentiksol:** Kilden staver både «Flupentixol» (i Rest AP) og «Flupenthixol» (depotraden).
- **Litium:** Kilden: «Lithium». Fagsiden heter Litium og er koblet til FESTs «Litiumion», som litiumsaltene i preparatene hører til; virkestoffet «Litium» i FEST har ingen preparater.
- **Perisiazin:** Kilden staver «Pericyazine»; FEST har «Perisiazin» (engelsk «Periciazine»).
- **Valproat:** Kilden: «Valproic acid». Fagsiden heter Valproat og er koblet til FESTs «Valproinsyre», som natriumvalproat og divalproeksnatrium er salter av.
- **Ziprasidon:** Egen rad i Combining Moodstabilizers, men medlem av gruppen Rest AP i Switching Antipsychotics.
- **Zuklopentiksol:** Kilden staver både «Zuclopentixol» (i Rest AP) og «Zuclopenthixol» (depot- og MA-radene).
- **Agomelatin:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Dosulepin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Fenelzin:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Flufenazin:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Imipramin:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Loksapin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Maprotilin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Penfluridol:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Perisiazin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Pimozid:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Promazin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Sulpirid:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Tranylcypromin:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Trazodon:** bare preparater med godkjenningsfritak i FEST, ingen med norsk markedsføringstillatelse.
- **Trifluoperazin:** ingen preparater i FEST. Kan likevel ha anbefalinger i kilden (P2.5).
- **Amitriptylin:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).
- **Karbamazepin:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).
- **Kvetiapin:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).
- **Litium:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).
- **Valproat:** FEST har både vanlig og modifisert frisetting peroralt; kildens rad skiller dem ikke. Hvilken som omfattes, avklares før beregning (P7–P9).
- **Aripiprazol:** korttidsvirkende injeksjon i FEST (Abilify) har ingen egen rad i kilden og dekkes ikke av kartleggingen.
- **Haloperidol:** korttidsvirkende injeksjon i FEST (Haldol) har ingen egen rad i kilden og dekkes ikke av kartleggingen.
- **Litium:** korttidsvirkende injeksjon i FEST (Lithium Chloride Lidco) har ingen egen rad i kilden og dekkes ikke av kartleggingen.
- **Olanzapin:** korttidsvirkende injeksjon i FEST (Zyprexa) har ingen egen rad i kilden og dekkes ikke av kartleggingen.
- **Valproat:** korttidsvirkende injeksjon i FEST (Orfiril, Valproat Life Medical) har ingen egen rad i kilden og dekkes ikke av kartleggingen.
- **Switching Antipsychotics:** 54 celler deler lenken `/switchdetail/depot-depot`, altså én felles anbefaling.
- **Switching Antipsychotics:** lenke på diagonalen for Pa, RA, Dp (bytte innen samme gruppe eller formulering).
- **Rest AP:** En kilderegel for ti virkestoffer, ikke et valgbart virkestoff. Flupentiksol, flufenazin og zuklopentiksol har i tillegg egne depotrader; perfenazin har depot i Norge (Trilafon Dekanoat), men ingen egen depotrad i kilden.
- **Partial agonist:** En kilderegel for tre virkestoffer, ikke et valgbart virkestoff. Aripiprazol har i tillegg en egen depotrad (Aripiprazole_LA).
- **Aripiprazole_LA:** Intervallet følger styrken, ikke preparatnavnet: FEST har 400 mg og 720/960 mg under samme varenavn. 300 mg finnes ikke i FEST.
- **Fluphenazine_LA:** Ingen markedsført flufenazin med norsk markedsføringstillatelse; bare preparater med godkjenningsfritak.
- **Paliperidone_ER:** Psychiatrienets «ER» er her paliperidonpalmitat som depotinjeksjon, ikke peroral depottablett. Fotnoten nevner også Byannli, som ikke finnes i FEST. Preparatene har ulike styrkeserier i FEST (Xeplion 25–150 mg, Palmeux 50–150 mg, Trevicta 175–525 mg). Intervallene kontrolleres mot preparatomtalene i P10.1, og varianten skal ikke behandles som én formulering før det er gjort.
- **Risperidone_LA:** Okedi (risperidon, depotinjeksjon) finnes i FEST, men nevnes ikke av kilden og er ikke tilordnet.

## Johannesurt og Start-kolonnen

- Johannesurt: Uttrykkelig utelatt av faglig beslutningstaker (P0.2): ingen fagside, ingen import, ingen regler og ingen bytter til eller fra johannesurt. Utelatt fra Switching Antidepressants (Hy, «hypericum»). Sperrede navn: johannesurt, hypericum, hypericum perforatum, hyperici herba, perikum, prikkperikum, st. john's wort, st john's wort, saint john's wort.
- Switching Antidepressants, Start: Den generelle Start-kolonnen skal ikke importeres (P0.2). Stop-kolonnen beholdes.
- Ingen fagside, ingen stoffregisteroppføring og ingen gruppe i kartleggingen har et sperret navn, og ingen av de 1039 importmålene gjelder johannesurt. Testen slår ut om det endrer seg.

## Hvor fullstendig kartleggingen er

- Alle rader og kolonner i de tre tabellene er kartlagt nøyaktig én gang, og alle 1072 lenkede sider (cellene og gruppemedlemmene) er kontrollert én for én.
- Alle 54 virkestoffer har moderstoff i FEST, og ingen navn eller aliaser kolliderer etter stavemåteregelen.
- Hver depot- og MA-injeksjon i FEST for virkestoffene er tilordnet én kildevariant eller står uttrykkelig uten.
- Ikke kontrollert i P1: anbefalingstekstene (P3), intervallene for sentralt godkjente depotpreparater mot EMA-preparatomtalen (P10.1), og om kildens rader uten tillegg omfatter modifisert frisetting (P9).
