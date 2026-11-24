# CYPinfo som OUSFARs eneste automatiske farmakogenetiske kilde

Leses før noe som har med farmakogenetikken på fagsidene å gjøre bygges eller
fjernes: CYPinfo-koblingen, -synkroniseringen og -visningen, og avviklingen av
CPIC og ClinPGx. Målet og gjennomføringsplanen står først; deretter
kartleggingen av CYPinfo (API-et, datamodellen og koblingen), som fortsatt
gjelder, og det som er bygd.
Mønstrene for datakildene står i `docs/legemiddeldata.md`, `docs/datakilder.md`,
`docs/clinpgx.md` og `docs/cpic.md` (historisk), og det som står der om
prinsippene, gjelder også her.

**Mål (Peder 23.11.2026, Issue #437):** CYPinfo er OUSFARs eneste automatiske,
strukturerte farmakogenetiske kilde på fagsidene. CPIC-importen er ryddet ut,
og ClinPGx-importen avvikles. CPIC, ClinPGx og DPWG kan fortsatt siteres som
vanlige, dokumenterte kilder i redaksjonell fritekst om klinisk vesentlige
forhold CYPinfo ikke dekker, men aldri som en automatisk, parallell visning.
Den faglige delen (hvilke mangler som er klinisk vesentlige, de redaksjonelle
tekstene og den faglige aksepten av CYPinfo-visningen) eies av OUSFAR Fag i
#533; alt teknisk eies av OUSFAR Dev i #437.

**Status 23.11.2026:** CYPinfo-katalogen synkroniseres hver uke og vises på
fagsidene for alle (Peder 23.11.2026, fase C). CPIC er stanset siden 6.11.2026
med dataene slettet, og koden er fjernet (#537). ClinPGx er stanset fra
23.11.2026: appen leser og viser ingenting derfra, og synken og endepunktene
svarer 410. Koden fjernes og dataene slettes etter en arkivkopi (fase C3 og D,
Peders ja 23.11.2026). Oppslaget etter en pasients resultat (den tidligere
etappe C) bygges ikke.

**Avklart av Peder 17.11.2026:** OUSFAR skal vise hvordan de ulike genotypene
(fenotypene) påvirker legemidlene, slik CYPinfo beskriver det, og ikke være et
verktøy der noen legger inn en pasients genotype; det er CYPinfo selv. Det
trengs derfor ingen personvernvurdering, og ingen skriftlig tillatelse, siden
CYPinfo driftes av Peders egen avdeling.

## Prinsippene for overgangen

- **Én automatisk kilde.** Fagsidene leser bare OUSFARs kopi av CYPinfo,
  synkronisert fra CYPinfos API. Kopien er et uendret speil, ikke en egen,
  redigerbar fagdatabase, og CYPinfos tekster endres aldri i OUSFAR.
- **Ingen pasientopplysninger.** Ingen genotype legges inn, lagres eller sendes
  noe sted; for en pasients resultat lenkes det til cypinfo.no.
- **Mangler betyr ikke «ikke relevant».** At CYPinfo ikke har et legemiddel,
  vises aldri som at farmakogenetikk er uten betydning. Bare CYPinfos egen,
  eksplisitte tekst om at legemiddelet ikke har relevante gener, gjengis slik.
- **Ingenting klinisk relevant forsvinner i stillhet.** ClinPGx-visningen
  fjernes først når OUSFAR Fag har vurdert de klinisk vesentlige manglene og
  gitt faglig aksept av CYPinfo-visningen (#533). Til da står ClinPGx som før,
  og en stanset ClinPGx-synk merkes som foreldet på siden (`clinpgxForeldet`,
  etter ti døgn), så foreldede data aldri vises umerket.
- **Historikken står.** Publiserte og historiske versjoner av fagsidene, de
  redaksjonelle henvisningene (også til CPIC og ClinPGx), endringsloggen og
  migrasjonsfilene beholdes. Elementtypen `clinpgxkobling` og etiketten i
  endringshistorikken står, så gamle versjoner og sammenligninger kan åpnes.
- **Databasen slettes sist.** Tabeller og skjemaer slettes først når ingen kode
  leser dem, i en egen migrasjon med Peders særskilte ja.

## Kartleggingen av CPIC og ClinPGx (23.11.2026)

Gjort i kildekoden på `main` (59958b2) og skrivebeskyttet i
produksjonsdatabasen.

### CPIC

- **Kode:** alt var allerede utkoblet: `lagCpicleserOmIBruk` gav ingen leser,
  endepunktet svarte 410, og ingen arbeidsflyt eller cron kjørte. Ingenting i
  `src/clinpgx/` eller `src/cypinfo/` bygde på `src/cpic/` (avhengigheten gikk
  andre veien). Fjernes i PR #537: endepunktet, `src/cpic/`, visningen,
  oppslaget, diplotypene, CPIC i søket, funksjonstesten og CSS-en, med testene.
  `cpic` står igjen i `DATAKILDER` og `STANSEDE_KILDER` så «Datakilder» viser
  den som stanset, med `synk: null`.
- **Database:** skjemaet `cpic` med 15 tomme datatabeller, `entiteter` og
  `henvisninger` (13 oppsettsrader hver), visningen `anbefalingsbetingelser`,
  `cpic.pagaende`, `cpic.kilde()`, og `cpic_*_synk`, `cpic_last_inn`,
  `cpic_status`, `les_cpic` og `les_cpic_diplotyper` i `public`;
  `datakilder.cpic_etter_bytte` og triggerne på tabellene. Rundt 0,5 MB.
- **Levende avhengigheter i databasen:** to funksjoner som ikke er CPICs,
  leser fortsatt fra skjemaet: `datakilder_status()` (`cpic.synkroniseringer`,
  siden «Datakilder») og `datakilder.etikett()` (`cpic.legemiddel`, kalt av
  endringsloggen for alle kildene). Funksjonskroppene er tekst, så Postgres
  sporer ikke avhengigheten: en `drop schema cpic cascade` uten å skrive dem om
  først ville ødelagt «Datakilder» og endringsloggen for ClinPGx, PubChem,
  Farmakologiportalen og CYPinfo. Den tredje, `sokedata_versjoner()`
  (`cpic.kilde()`, kalt ved hvert globalt søk), er skrevet om uten CPIC i
  migrasjonen `20261123150000_sokedata_versjon_cypinfo.sql` (#539).
- **Historisk og redaksjonelt (beholdes):** CPIC sitert som kilde i
  redaksjonell tekst (i dag nevner 77 publiserte kort og tekster på 56 fagsider CPIC, ClinPGx eller PharmGKB),
  migrasjonsfilene og endringshistorikken. De automatiske CPIC-referansene ble
  regnet ut ved visning og aldri lagret, så ingen lagret versjon viser til dem.

### ClinPGx

| Del | Hvor | Merknad |
| --- | --- | --- |
| Synk | `.github/workflows/clinpgx-synk.yml` (mandag 02:30 UTC, OIDC, opptil seks omganger), `api/clinpgx-synk.ts`, `src/clinpgx/{endepunkt,synk,api,lager,struktur}.ts` | «Hent nå» på fagsiden og i «Datakilder» bruker det samme endepunktet |
| Oppslag | `api/clinpgx-sok.ts` (bare systemarkitekter), `ClinpgxkoblingSkjema` i `Skjemaer.tsx` | Brukes når en side kobles i redigeringen |
| Visning | `Farmakogenetikkpanel.tsx` (`Clinpgxvisning`, panelets `tomt`), `src/clinpgx/stoffside.ts`, `useFarmakogenetikk` | Leserne i `App.tsx` går gjennom stansbryteren (`lagFarmakogenetikkleserOmIBruk`, `lagFarmakogenetikksokOmIBruk`, #539); uten leser er panelet tomt for ClinPGx og koblingen skjult |
| Søk | Søket på siden (`farmakogenetikksoketekster`) og det globale søket (`globaltSok.ts`, versjonsnøkkelen `clinpgx`, `les_farmakogenetikk_sok`), `treffvisning.ts` | CYPinfo står i begge søkene ved siden av, for dem som ser CYPinfo (#539): kilden `cypinfo` i `globaltSok.ts`, med egen versjonsnøkkel. Når ClinPGx stanses, faller ClinPGx-kilden bort av seg selv (ingen leser) |
| Referanser | `src/clinpgx/referanser.ts`: ClinPGx med lisensen (CC BY-SA 4.0) i referansefeltet og publikasjonene på hvert kort | Regnes ut ved visning, aldri lagret. Når de forsvinner, flyttes numrene fra «Farmakogenetikk» og utover på de koblede sidene; ingenting lagret brytes. CYPinfo står foran ClinPGx i det samme referansefeltet (`src/cypinfo/referanser.ts`, #539) |
| Redaksjonell kobling | Elementtypen `clinpgxkobling` i `innholdselementer` (en per side, publisert og utkast): 104 publiserte fagsider | 93 kom fra fire datamigrasjoner (generert av `scripts/lag-clinpgxkoblinger.ts` fra `clinpgxkoblinger.ts`), resten fra redigeringen. Dekningsregelen `clinpgxdekning.ts` krever en status for hver fagside |
| Historiske versjoner | `Utgavevisning.tsx`, `Versjonsside.tsx` | En gammel versjon har bare koblingselementet, aldri ClinPGx-data; dataene vises slik de er nå. Etter avviklingen viser gamle versjoner ingen ClinPGx-data; teksten på versjonssiden nevner bare kildene som ikke er stanset, og CYPinfo for dem som ser CYPinfo (#539) |
| Funksjonstesten | `src/kuratorjobb/funksjonstest.ts` (`clinpgx`, `farmakogenetikkvisning`) | |
| Datakilder | `DATAKILDER`, `KILDEOPPSETT.clinpgx` (intervall 7), `datakilder_status`, endringsloggen (1 623 føringer) | |
| Database | Skjemaet `clinpgx` (`kjemikalier` 105, `annotasjoner` 1 402, `kjemikalie_annotasjoner` 1 634, `synkroniseringer` 58; rundt 9 MB), `clinpgx_*`-funksjonene, `les_farmakogenetikk(_sok)`, `clinpgx_status`, `clinpgx.utvalg`, triggerne og `datakilder.clinpgx_*`; `sokedata_versjoner` og `datakilder_status` leser fra det | Ingen pg_cron, pg_net eller Edge-funksjon |
| Bruk utenfor farmakogenetikken | `scripts/kurer-forbindelser.ts` og `src/kjemi/kurering.ts` | Se under |

**Kjemiske forbindelser.** `kurer-forbindelser` (kjøres for hånd når nye
forbindelser legges til, `docs/kjemi.md`) godtar en PubChem-kobling bare når en
uavhengig kilde har samme InChIKey: ClinPGx (`/data/chemical?name=` → PubChem-CID
→ InChIKey) eller ChEBI. Av de 151 koblede forbindelsene i
`src/data/forbindelser.ts` hviler 96 på begge, 34 bare på ChEBI og 21 bare på
ClinPGx. Eksisterende koblinger skrives aldri om, så avviklingen endrer ingen
av dem, men en ny kontroll (`--alle`) ville meldt de 21 som uavklarte, og nye
forbindelser får én uavhengig kilde mindre. Kontrollkvaliteten skal ikke
senkes; erstatningen avgjøres i en egen oppgave (#538).

Ingenting annet bruker ClinPGx: ikke stoffregisteret, aliasene, ATC-koblingen
eller andre søkefunksjoner.

### Fagsidene med ClinPGx, og hva CYPinfo dekker

Av de 104 publiserte fagsidene som viser ClinPGx i dag, har **44** også
CYPinfo (FEST-koblingen eller koblingslisten), og **60** har bare ClinPGx.
Tabellen viser hva ClinPGx har for de 60, som et teknisk utgangspunkt for Fags
vurdering i #533. Antallet sier ikke noe om klinisk betydning: at et
gen–legemiddel-par står i ClinPGx, er ikke i seg selv grunn til å omtale det.

| Fagside (bare ClinPGx) | Retningslinjer (organisasjoner) | Preparatomtaler | Kliniske annotasjoner, nivå 1A/1B | Kliniske annotasjoner, alle |
| --- | --- | --- | --- | --- |
| Karbamazepin | 5 (CPIC/CPNDS/DPWG/RNPGx) | 6 | 2 | 52 |
| Karvedilol | 4 (CPIC/DPWG) | 3 | 0 | 8 |
| Okskarbazepin | 3 (CPIC/DPWG/RNPGx) | 4 | 1 | 20 |
| Bisoprolol | 3 (CPIC/DPWG) | 0 | 0 | 2 |
| O-desmetylvenlafaksin | 2 (CPIC) | 3 | 0 | 0 |
| Oksykodon | 2 (CPIC/DPWG) | 1 | 0 | 21 |
| Atenolol | 2 (CPIC/DPWG) | 0 | 0 | 44 |
| Labetalol | 2 (CPIC) | 0 | 0 | 0 |
| Metadon | 2 (CPIC) | 0 | 0 | 100 |
| Lamotrigin | 1 (DPWG) | 2 | 1 | 17 |
| Buprenorfin | 1 (CPIC) | 0 | 0 | 22 |
| Fentanyl | 1 (CPIC) | 0 | 0 | 48 |
| Flufenazin | 1 (DPWG) | 0 | 0 | 0 |
| Morfin | 1 (CPIC) | 0 | 0 | 43 |
| Valproat | 0 | 5 | 0 | 24 |
| Hydroksyrisperidon | 0 | 4 | 0 | 4 |
| GHB | 0 | 3 | 0 | 0 |
| Diazepam | 0 | 2 | 0 | 1 |
| Losartan | 0 | 1 | 0 | 11 |

De andre 41 har ingen retningslinje, preparatomtale eller klinisk
annotasjon på nivå 1A/1B i ClinPGx, bare annotasjoner på lavere nivå eller
ingenting: Alprazolam, Amlodipin, Bendroflumetiazid, Bumetanid, DMT, Diltiazem, Doksazosin, Enalapril, Eplerenon, Fenobarbital, Flunitrazepam, Furosemid, Gabapentin, Hydroklortiazid, Irbesartan, Kandesartan, Ketobemidon, Klonazepam, LSD, Lerkanidipin, Levetiracetam, Lisinopril, Loksapin, MDMA, Maprotilin, Nifedipin, Nitrazepam, Oksazepam, Perisiazin, Petidin, Promazin, Ramipril, Spironolakton, Sulpirid, Telmisartan, Topiramat, Trifluoperazin, Valsartan, Verapamil, Zolpidem, Zopiklon.

Tallene er fra produksjonen 23.11.2026; den skrivebeskyttede spørringen står i
PR-en som la dem inn, og kan kjøres på nytt.

## Gjennomføringsplanen

Fasene følger #437. Hver leveranse er en egen PR med etiketten `ansvar:dev`,
med #437 eller et deloppgave-Issue under «Arbeidsoppgave», og kontrolleres av
ChatGPT før sammenslåing. Fag-oppgavene står i #533.

### A. Kartlegging og plan (Dev og Fag parallelt)

- Dev: kartleggingen over og dette dokumentet. **Ferdig med denne PR-en.**
- Fag (#533): vurderer de klinisk vesentlige manglene risikobasert, med
  tabellen over som teknisk utgangspunkt, og skriver eventuelle korte
  redaksjonelle tekster etter kuratorprotokollen.

### B. Forberedelser uten synlig endring (Dev, kan gjøres nå)

1. **Fjerne CPIC-koden** (PR #537). Databasen røres ikke.
2. **Erstatte ClinPGx i kontrollen av kjemiske forbindelser** (#538), før
   ClinPGx-koden fjernes, uten å senke kontrollkvaliteten: en annen uavhengig
   strukturkilde, eller ClinPGx' åpne API bare i dette skriptet, flyttet til
   `src/kjemi/`. Avgjøres med en kjøring av `--alle` uten `--skriv` mot de 21.
3. **Gjøre ClinPGx-avviklingen klar bak brytere** (#539). Gjort i to deler:
   først stansbryteren, panelet og versjonssiden, og det CYPinfo låner, delt
   ut (`FARMAKOGENETIKKPANEL` står i `paneler.ts`, metabolittene i
   `metabolittsider.ts`); så CYPinfo i referansene, søkene og direktelenkene
   (se «Visningen»):
   - en stansbryter for ClinPGx som for CPIC (`lagFarmakogenetikkleserOmIBruk`
     og `stansetSvar` på begge endepunktene), så stansen er én linje i
     `STANSEDE_KILDER` og arbeidsflyten;
   - CYPinfo i referansefeltet, i søket på siden og i det globale søket, og
     direktelenker til kortene, bak `CYPINFO_VISES_FOR`, så det bare er synlig
     for systemarkitektene til fase C;
   - panelets `tomt` og oppsummering uten ClinPGx, og teksten på
     versjonssiden;
   - dele ut det `src/cypinfo/` og `src/faginnhold/cypinfodekning.ts` låner fra
     ClinPGx (`FARMAKOGENETIKKPANEL`, metabolittlisten `UKOBLEDE_STOFFSIDER`),
     så `src/clinpgx/` kan fjernes senere uten å røre CYPinfo.

### C. Bytte fagsidene over til CYPinfo

**Port:** Fag (#533) har gitt faglig aksept av CYPinfo-visningen (aksepttesten
under) og meldt at de prioriterte manglene er behandlet eller akseptert, og
Peder har godkjent det som er reservert ham. Dev starter ikke fase C før
statusen står i #533.

**Peder 23.11.2026:** «Slett de gamle dataene og slå på CYPinfo for alle.»
Fase C og D gjennomføres da før Fags aksept i #533 er ferdig. Fag hadde meldt
at de prioriterte manglene er behandlet; kurateringene som ennå er i kontroll,
og aksepttesten under, fullføres av Fag etter overgangen. Punkt 1 og 2 er gjort
i samme PR (#551), og punkt 3 i den neste, sammen med punkt 2 i fase D.

1. **CYPinfo for alle** (egen PR): `CYPINFO_VISES_FOR = 'alle'` og
   `les_cypinfo` tilbake til `intern.krev_aktivt_medlemskap()` i en ny
   migrasjon, i samme endring, med føring i endringsloggen. Referansen,
   søkene og direktelenkene følger bryteren og trenger ingen egen endring.
   Den kliniske aksepttesten føres i PR-en.
2. **ClinPGx stanses** (egen PR, samtidig med eller rett etter 1): `clinpgx` i
   `STANSEDE_KILDER` (arbeidsflyten `clinpgx-synk.yml` melder da 410 som
   stanset uten å feile, og planen i den kan tas ut), endepunktene svarer
   410, appen leser og viser ingenting fra ClinPGx (heller ikke referansene og
   søket), koblingsskjemaet skjules, og funksjonstesten melder kilden som ikke
   aktuell. Dataene i databasen står urørt, så stansen kan oppheves.
3. **Koden fjernes** når stansen har stått en stund uten feil: synken,
   endepunktene, arbeidsflyten, visningen, referansene, søket, skjemaet,
   `clinpgxkoblinger.ts` med generatoren og dekningsregelen
   `clinpgxdekning.ts` (erstattet av `cypinfodekning.ts`). Elementtypen
   `clinpgxkobling` og etiketten i endringshistorikken står, så gamle
   versjoner kan åpnes; leseren av dataene i den (`lesClinpgxkobling`) er
   fjernet, siden ingenting viser dem lenger. Koblingselementene på sidene
   slettes ikke og vises ikke; om de skal avpubliseres redaksjonelt, avgjøres
   med Fag. Funksjonstesten har en CYPinfo-kontroll (`cypinfo`,
   `cypinfovisning`) i stedet for ClinPGx, og «Hent nå» henter i én omgang
   (bare ClinPGx brukte omgangene).
4. Kontroll: alle publiserte fagsider åpnes; redigering, utkast,
   publisering, kurateringshistorikken, søket, referansenumrene og
   lesingene virker; en vanlig bruker ser CYPinfo og ingenting privilegert.

### D. Slette databasedataene (til slutt, med Peders særskilte ja)

Egen oppgave (#540), først når ingen kode leser skjemaene:

1. Eksportere `cpic.*` og `clinpgx.*`, med synkroniseringskjøringene, til et
   arkiv utenfor databasen, med kildeangivelsen (CC BY-SA 4.0 for ClinPGx).
   Eksporten er obligatorisk og kontrolleres (radtall) før punkt 3, og
   arkivet skal kunne åpnes av systemarkitektene. Hvor det ligger, avgjøres i
   #540.
2. Skrive om `sokedata_versjoner` (uten `clinpgx`; `cpic` er alt tatt ut,
   #539), `datakilder_status` og `datakilder.etikett` uten `cpic` og
   `clinpgx`, i en vanlig migrasjon.
   Etiketten for gamle føringer leses da fra kolonnen `etikett`, som alt er
   lagret på hver føring.
3. En destruktiv migrasjon (`-- destruktiv-godkjent:` etter Peders ja for
   nøyaktig den migrasjonen): `drop schema cpic` og `clinpgx` med funksjonene,
   triggerne, `datakilder.cpic_*`/`clinpgx_*` og feltreglene; testkatalogene
   (`funksjonskontroller.ts`, `ressurskatalog.ts`) oppdateres. Historiske
   migrasjonsfiler står.
   **Endringsloggen står:** radene i `datakilder.endringer` for de to kildene
   (før- og etterverdier, etikett, `synk_id`) slettes ikke. Tabellen har ingen
   fremmednøkkel til kildeskjemaene, så den overlever slettingen urørt, og
   `synk_id` kan slås opp i arkivet fra punkt 1. Migrasjonstesten kontrollerer
   at antallet føringer er uendret.
4. `cpic` og `clinpgx` blir stående i `DATAKILDER` som avviklede kilder, uten
   henting, så endringsloggen deres fortsatt kan leses under «Datakilder».

Uten Peders ja står dataene, uten lesing og uten import.

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
- Før visningen slås på for alle, kontrolleres den klinisk og aksepteres
  faglig av OUSFAR Fag (#533; fase C i planen over).

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
  kliniske kontrollen se på (aksepttesten i fase C).
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
  Diazepam, Dosulepin. ClinPGx-visningen står for dem til OUSFAR Fag har
  vurdert om noe er klinisk vesentlig og skal omtales redaksjonelt (#533; se
  «Fagsidene med ClinPGx, og hva CYPinfo dekker» over);
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

Bygd 17.11.2026, først bare for systemarkitektene, og for alle fra
23.11.2026 (`CYPINFO_VISES_FOR = 'alle'` i `src/cypinfo/stoffside.ts`;
`systemarkitekter` setter den tilbake). Databasen følger bryteren:
`les_cypinfo` krever et aktivt medlemskap (`20261123210000_cypinfo_for_alle.sql`);
tilbake til bare systemarkitektene er `intern.krev_systemarkitekt` som i
`20261117094000_cypinfo_visning.sql`, i samme endring som bryteren.

CYPinfo får en egen gruppe, **«Anbefalinger fra CYPinfo»**, i seksjonen
«Farmakogenetikk», under de redaksjonelle kortene. ClinPGx er stanset og vises ikke. De
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

Bak den samme bryteren (#539), for dem som ser CYPinfo:

- **Referansen.** CYPinfo står i referansefeltet til «Farmakogenetikk», foran
  ClinPGx, og i referanselisten nederst, merket som automatisk: tittelen
  «CYPinfo», utgiveren (Avdeling for farmakologi, Oslo universitetssykehus, med
  St. Olavs hospital og Vestre Viken HF), lenken til cypinfo.no og «Anbefalinger
  fra CYPinfo, gjengitt uendret, sist kontrollert <dato>»
  (`src/cypinfo/referanser.ts`). CYPinfo oppgir ingen lisens, så referansen
  nevner ingen. Den står bare når siden viser minst ett legemiddel fra CYPinfo.
  Mens CYPinfo hentes, venter numrene fra «Farmakogenetikk» og utover
  (`ventendeKilder`), så ingen vist nummer endres når den kommer.
- **Søket på siden** finner navnet på legemiddelet, genene, fenotypene, nivået
  og CYPinfos tekst (`cypinfosoketekster`), og åpner kortet treffet står i.
- **Søket i hele kunnskapsbasen** finner det samme, med kilden `cypinfo` i
  `globaltSok.ts`: `les_cypinfo` for alle legemidlene sidene er koblet til, i
  kall på høyst 200 ID-er, og hver side får sin del med samme regel som siden
  selv (`cypinfoFor`). Kilden gis bare når `cypinfoSynlig` er sann
  (`App.tsx`), og indeksen hentes på nytt når det endres. `sokedata_versjoner`
  har nøkkelen `cypinfo` (den siste fullførte hentingen), så det som er lagret
  i nettleseren, bare leses på nytt når CYPinfo er endret.
- **Direktelenker** til kortene: `#/stoff/<side>/farmakogenetikk/cypinfo-<navn>`
  åpner seksjonen og kortet, som for de andre detaljkortene.

En side CYPinfo ikke har noe for, en metabolittside og en side for den som ikke
ser CYPinfo får ingen referanse og ingen treff. Et tomt resultat er aldri et
faglig utsagn om at genene ikke betyr noe.

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
fenotype, og ikke gir et inntrykk CYPinfo ikke gir. Den gjøres i fase C av en
klinisk farmakolog (Peder eller den han peker ut), med testtilfellene under,
før gruppen slås på for alle. Funn i CYPinfos innhold (warfarin over,
ATC-feilen) meldes til CYPinfo, ikke rettes i OUSFAR.

## Det som er bygd (etappene fra kartleggingen 16.11.2026)

Kartleggingen 16.11.2026 delte arbeidet i etappene A (kartleggingen), B
(katalogen), C (oppslaget), D (visningen) og E (klinisk kontroll og visning for
alle). A, B og D er bygd, C bygges ikke, og E er tatt inn i fase C i
gjennomføringsplanen over. Alt eies av OUSFAR Dev (`ansvar:dev`); ingen
endrer faginnholdet eller verktøymenyen.

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
  gener, en side uten CYPinfo, lesingen), `stoffside.test.tsx` (kortet for en
  vanlig bruker, referansen og søket) og `cypinfo.test.ts` (tekstene lagres, ny
  lesing som metadata, `les_cypinfo` for alle med aktivt medlemskap).

### E — Klinisk kontroll og visning for alle (nå fase C)

Tatt inn i gjennomføringsplanen over: referansene, søket og direktelenkene
er bygd bak bryteren i fase B (#539), og aksepttesten og visningen for alle er
fase C. CPIC-laget fjernes alt nå (#537), uavhengig av E, etter den reviderte
beslutningen i #437. Funnene meldes fortsatt til CYPinfo: warfarin VKORC1
alene, kariprazins ATC, ATC-formen, FEST-ID for de 15, at `/api/result` feiler
for 43 genotyper, og ønsket om en versjon eller dato og genene per legemiddel i
katalogen.

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
- Fagsiden viser CYPinfo for alle (`CYPINFO_VISES_FOR = 'alle'`), og
  oppsummeringen sier aldri «ingen relevante gener» når CYPinfo sier noe annet
  (#544).

**Klinisk aksepttest (fase C), med systemarkitektenes visning i produksjonen
eller i det lokale testmiljøet. Resultatet føres i PR-en som slår visningen på
for alle, og Fags aksept i #533:**

| Fagside | Forventet |
| --- | --- |
| Aripiprazol | Ett kort, CYP2D6: Normal gir `standard` («Normal metabolisme.»), Redusert `medium` med teksten om dehydroaripiprazol |
| Kodein | Hver CYP2D6-fenotype med det cypinfo.no viser for den |
| Amitriptylin | «CYP2C19 og CYP2D6 sammen» med 25 anbefalinger, ingen for ett gen alene |
| Sertralin | CYP2B6 og CYP2C19 hver for seg, og sammen |
| Warfarin | «CYP2C9 og VKORC1 sammen», alle ni som på cypinfo.no |
| Amfetamin | To legemidler, CYPinfos tekst om ikke relevant gen-legemiddelinteraksjon |
| Ketamin | Esketamin |
| De tre andre TCA-ene med CYP2C19 + CYP2D6 i CYPinfo | Som amitriptylin |
| O-desmetylvenlafaksin (metabolitt) | Ingen CYPinfo-gruppe, og ingen tekst om at farmakogenetikk er uten betydning |
| Karbamazepin, Metadon (uten CYPinfo) | Ingen CYPinfo-gruppe, og ingen tekst om at farmakogenetikk er uten betydning; eventuell redaksjonell tekst fra Fag står uendret |

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
