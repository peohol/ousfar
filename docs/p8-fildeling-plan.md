# P8 – fildeling i gruppene: kartlegging og plan

Plan for etappe P8 under planen [#364](https://github.com/peohol/ousfar/issues/364)
(§8.4 «Filer som separat, senere etappe»), med fremdriften i
[#369](https://github.com/peohol/ousfar/issues/369). Laget som tråd E i P7
(17.11.2026, `docs/gruppechat.md`). **Bare kartlegging og plan:** ingen kode,
ingen migrasjoner, ingen bøtter og ingen filopplasting er laget eller slått på.
P8 starter først når P7 er godkjent og Peder har bestilt den.

Planen bygger på gruppene (`docs/fagmiljoer.md`, «Gruppene»), kontrakten for
chatten (`docs/gruppechat.md`), den varige regelen om pasientopplysninger
(`docs/pasientopplysninger.md`, P7 tråd D), P0-kartleggingen
(`docs/ousfar-nasjonal-p0-kartlegging.md` §2.8, §4 og §6) og S4-planen
(`docs/s4-pilotplan.md`, D7).

## Kort fortalt

- Hver gruppe får en fane **Filer** der medlemmene kan legge ut og hente filer.
  Bare de som leser gruppen i dag, får se filene, og tilgangen sjekkes ved
  hver eneste nedlasting. Mister noen medlemskapet, får de ikke hentet noe mer
  fra det øyeblikket.
- **Pasientopplysninger er forbudt i filer også.** Appen sier det ved hver
  opplasting, sjekker filnavnet og tekstfiler for fødselsnumre og fjerner
  skjulte opplysninger i bilder (som posisjon). Den kan ikke se hva som står i
  et bilde eller et skannet dokument, og påstår ikke det.
- Ingen filer sendes til eksterne tjenester for kontroll.
- Før P8 slås på, må Peder ta åtte valg (§8). Hvert har et anbefalt svar.

## 1. Det som finnes i dag

### 1.1 Lagringen

OUSFAR har én bøtte i Supabase Storage, `avatarer`, for profilbildene
(`supabase/migrations/20260922101921_profilbilder.sql`, strammet inn i
`20260922115504_avatarsti_laast_til_eieren.sql` og P2c
`20261114130000_profiler_dataminimering.sql`). Den er det eneste mønsteret for
filer i appen, og P0 §2.8 slo fast at det ikke finnes noen gjenbrukbar
filmodell: P8 er nybygg.

| Egenskap | Profilbildene | Lærdom for P8 |
| --- | --- | --- |
| Bøtte | Privat, 1 MB, bare `image/webp` | Privat bøtte med grense og tillatelsesliste på bøtten som siste skanse |
| Sti | Fast: `<bruker-ID>/avatar.webp`, håndhevet med en regel på `profiles` og skrivereglene på hele navnet | Stien bestemmes av databasen, ikke av brukeren |
| Lesing | `storage.objects`: eieren, eller når den innloggede ser profilen som peker på bildet (regelen leser `public.profiles` som den innloggede) | Leseregelen spør det samme som resten av appen, så tilgangen følger gruppen av seg selv |
| Utlevering | Signerte lenker, 1 time (`AVATARLENKE_LEVETID`, `src/auth/api.ts`) | **Ikke for gruppefiler**: en signert lenke kan ikke trekkes tilbake (§3.4) |
| Bildebehandling | Beskjæres og lagres på nytt i nettleseren (`src/auth/bilde.ts`, lerret → WebP) | Samme teknikk fjerner EXIF og posisjon fra bilder |
| Omfang i produksjonen | 4 filer, 105 kB (S4-planen §2) | Lagringen er nesten tom |

### 1.2 Gruppene og tilgangshjelperne

Alt P8 trenger for å avgjøre tilgang, finnes alt (`docs/fagmiljoer.md`,
«Gruppene» og «Idéer og oppgaver i gruppene»; `docs/gruppechat.md`,
«Rettighetene»):

| Hjelper | Svarer | Brukes i P8 til |
| --- | --- | --- |
| `intern.kan_lese_gruppe(gruppe, bruker)` | Aktivt medlemskap i OUSFAR og en aktiv rolle i gruppen der brukeren fortsatt kan være med, eller systemarkitekt | Se lista og hente filer |
| `intern.kan_bidra_i_gruppe(gruppe, bruker)` | Lese en **aktiv** gruppe | Laste opp |
| `intern.kan_moderere_gruppe(gruppe, bruker)` | Moderator, ansvarlig eller systemarkitekt | Slette andres filer |
| `public.mine_lesbare_grupper()` | Gruppene den innloggede leser, regnet ut én gang per spørring | Radsikkerhet der en `public`-funksjon trengs |
| `intern.grupperolle`, `intern.kan_vaere_med_i_gruppe` | Den ene definisjonen av hvem som er med | Indirekte, gjennom de over |

Tilgangen regnes ut hver gang og krever aktivt medlemskap i gruppens fagmiljø
(eller i OUSFAR for en gruppe på tvers). Ingen opprydding trengs når noen
fjernes; det samme skal gjelde filene.

### 1.3 Edge-funksjonene

`fullfor-oppsett`, `nytt-passord`, `opprett-bruker` og `sett-rolle`, alle bygd
på `supabase/functions/_edge/kontekst.ts` (autentisering, bruker-ID fra JWT,
rolle slått opp på serveren, validerte inndata før en privilegert klient tas i
bruk) og rullet ut av GitHub Actions (`docs/edge-funksjoner.md`). Plattformens
grenser på gratisplanen er **256 MB minne og 2 sekunder CPU per kall**, og
biblioteker som trenger flere tråder (som bildebiblioteket sharp eller en
virusskanner) kan ikke kjøres. En Edge-funksjon kan altså kontrollere
filhoder og tekst i små tekstfiler, men ikke tolke PDF-er, Office-filer eller
bilder grundig.

### 1.4 Det P7 gir som P8 bygger videre på

| Del | Fra | Bruk i P8 |
| --- | --- | --- |
| Bryteren `intern.gruppechat_aktivert()` | P7.0 | Samme mønster: `intern.gruppefiler_aktivert()`, `false` til Peder har sagt ja |
| `intern.ligner_personnummer`, `intern.krev_uten_personnummer`, `@delt/pasientopplysninger` (`lignerPersonnummer`, `PASIENTREGEL`) | P7.0 | Filnavn, beskrivelser og tekstfiler |
| «Leses av de N medlemmene i gruppen og av systemarkitektene» | P7 tråd B | Øverst i filfanen |
| Gruppesidens faner (`GRUPPEFANER` i `src/domain/rute.ts`, `Grupperside.tsx`, `gruppevisning.ts`) | P6b, P7 | Ny fane `filer` |
| Varslene: ett ulest varsel per gruppe og nøkkel, med `gruppe_id`, uten innhold | P7 tråd C | Kategori `gruppefiler`, nøkkel `gruppefiler:<gruppe-ID>` |
| Lagringstiden i databasen (12 måneder, ingen ekstern jobb) | P7 tråd A | Samme frist; men filer må slettes gjennom Storage-API-et (§4.4) |
| Chatten | P7 | Ikke vedlegg i chatten i P8 (§6.4) |

### 1.5 Sikkerhetskopiene

Kopiverktøyet (`docs/drift-gjenoppretting.md`, `src/drift/sikkerhetskopi/kopi.ts`)
kopierer **alle** filer i alle bøtter: det leser `storage.objects` og henter
hver fil med sjekksum. Gruppefilene kommer altså med i de krypterte kopiene
uten endring i verktøyet. To følger:

- En fil som slettes fordi den hadde pasientopplysninger, ligger igjen i
  kopiene som ble tatt før den ble slettet, til de kopiene slettes. Hvor
  lenge kopiene oppbevares, er ikke avgjort ennå (S4, tiltak 3). Rutinen for
  hendelser må ta det med (§5.3).
- Kopiene og gjenopprettingen tar lengre tid jo mer som ligger der. Med
  grensene i §4.2 er det høyst noen hundre MB.

### 1.6 Gratisplanens grenser

| Grense | Verdi (Supabase-dokumentasjonen, 17.11.2026) | Betydning |
| --- | --- | --- |
| Største fil | 50 MB på gratisplanen | Taket for bøttens grense |
| Fillagring | 1 GB for **organisasjonen** | Deles med andre prosjekter i samme Supabase-organisasjon; må sjekkes i P8 A (§9) |
| Utgående trafikk | 10 GB i måneden (5 GB fra mellomlager, 5 GB uten) | En fil på 10 MB hentet av 20 medlemmer er 200 MB |
| Databasen | 437,6 av 500 MB (S4 §3.5) | Filene ligger utenfor databasen; bare en liten rad per fil i `storage.objects` og i P8-tabellen |
| Smart CDN | Bare Pro | Private filer mellomlagres ikke på tvers av brukere; hver nedlasting sjekkes |

Går organisasjonen over kvoten, kommer det et varsel og en frist, ikke en
regning. P8 skal derfor ha egne, lavere tak (§4.2).

## 2. Modellen

### 2.1 Bøtten og stien

- Ny privat bøtte `gruppefiler`, med `file_size_limit` og `allowed_mime_types`
  satt til tillatelseslisten (§4.1). Bøttens grenser er siste skanse; databasen
  og Edge-funksjonen kontrollerer det samme før og etter.
- Stien er `<gruppe-ID>/<fil-ID>`, uten filnavn. Det brukeren kaller filen,
  står bare i databasen. Da kommer filnavn aldri i Storage-loggene, i
  sikkerhetskopiens filliste eller i lenker, og filnavn med tegn Storage ikke
  godtar er ikke et problem.
- Filene kan ikke endres etter opplastingen (ingen `update`-regel, ingen
  `upsert`). En ny versjon er en ny fil. Det gjør det enkelt å vite at
  innholdet som ble kontrollert, er det som ligger der.

### 2.2 Tabellen `gruppefiler`

Én rad per fil, med radsikkerhet og uten rettigheter for nettleseren; alt går
gjennom funksjonene, som i chatten.

| Kolonne | Type | Merknad |
| --- | --- | --- |
| `id` | uuid | Primærnøkkel og siste ledd i stien |
| `gruppe_id` | uuid | `grupper`, kan ikke endres |
| `opplaster_id` | uuid null | `profiles`, `on delete set null` |
| `klient_id` | uuid | Fra nettleseren; unik per (gruppe, opplaster), så en gjentatt forberedelse gir samme rad |
| `navn` | text | 1–200 tegn, uten stiskilletegn; sjekket for fødselsnummer |
| `beskrivelse` | text null | Høyst 500 tegn; sjekket for fødselsnummer |
| `type` | text | Fra tillatelseslisten |
| `storrelse` | bigint | Oppgitt ved forberedelsen, kontrollert mot den lagrede filen |
| `status` | text | `venter` → `klar`, eller `avvist`; `slettet` |
| `opprettet_kl`, `klar_kl` | timestamptz | Serverens tid |
| `slettet_kl`, `slettet_av` | timestamptz null, uuid null | Hvem som slettet, og når |
| `fjernet_kl` | timestamptz null | Når selve filen er borte fra Storage (§4.4) |

Lagringsfristen regnes fra `klar_kl` (§4.4). Ingen versjonshistorikk og ingen
gamle navn lagres.

### 2.3 Opplastingen i tre steg

1. **`forbered_gruppefil(gruppe, klient_id, navn, type, storrelse, beskrivelse)`**
   (`security definer`): bryteren, `intern.kan_bidra_i_gruppe`, navn og
   beskrivelse gjennom `intern.krev_uten_personnummer`, typen i
   tillatelseslisten, størrelsen under grensen, gruppens og hele appens kvote
   (`venter` og `klar` teller), og en takt for opplastinger per bruker. Låser
   gruppens rad, så to samtidige opplastinger ikke kan sprenge kvoten. Gir
   `fil_id` og stien.
2. **Opplastingen** går fra nettleseren rett til Storage, til akkurat den
   stien. Skriveregelen på `storage.objects` slipper den bare inn når det
   finnes en rad i `venter` for stien, med den innloggede som opplaster, under
   15 minutter gammel, og den innloggede fortsatt kan bidra i gruppen.
3. **Edge-funksjonen `fullfor-gruppefil`** (bygd på `_edge/kontekst.ts`):
   kontrollerer at filen finnes, at størrelsen er den som ble oppgitt, at
   filhodet (de første bytene) stemmer med typen, og leser tekstfiler for
   fødselsnumre (`lignerPersonnummer`). Stemmer alt, settes raden `klar` og
   gruppen varsles. Ellers fjernes filen, raden settes `avvist`, og
   brukeren får en norsk feilmelding uten innholdet.

En fil i `venter` eller `avvist` kan ingen hente. En `venter` som aldri blir
fullført, ryddes (§4.4).

### 2.4 Funksjonene

Alle `security definer`, krever aktivt medlemskap, svarer `42501` med samme
tekst som for en gruppe som ikke finnes når brukeren ikke leser gruppen, svarer
«Fildelingen er ikke slått på.» mens bryteren er av, og står i
`funksjonskontroller.ts`.

| Funksjon | Svarer |
| --- | --- |
| `les_gruppefiler(gruppe)` | De klare filene, nyeste først, med profilkortet til opplasteren, `kan_slette` per fil; `kan_laste_opp`; kvoten (brukt og tak); grensene og tillatelseslisten; filer som venter på å bli fjernet fra Storage (§4.4) |
| `forbered_gruppefil(...)` | Over |
| `slett_gruppefil(fil)` | Opplasteren og `intern.kan_moderere_gruppe`. Raden blir `slettet` med en gang, så filen ikke kan hentes; gir stien til fjerningen |
| `endre_gruppefil(fil, navn, beskrivelse)` | Opplasteren, i en aktiv gruppe; samme kontroller som ved forberedelsen |
| `merk_gruppefiler_sett(gruppe, til)` | Merker varselet lest, som chatten |

`gruppeoversikt(gruppe).samhandling` får `nye_filer` (`null` når bryteren er
av), som tallet på fanen.

## 3. Tilgangen

### 3.1 Reglene på `storage.objects` for bøtten `gruppefiler`

Radsikkerhetsreglene kjøres som den innloggede og kan ikke kalle `intern`.
Som i P2c brukes `public`-funksjoner som bare svarer om den innloggede selv:

| Regel | Slipper gjennom |
| --- | --- |
| `select` | `public.kan_hente_gruppefil(name)`: bryteren på, raden er `klar`, ikke slettet og ikke utgått, og `intern.kan_lese_gruppe(gruppe)` |
| `insert` | `public.kan_laste_opp_gruppefil(name)`: som i §2.3 steg 2 |
| `update` | Ingen regel: filer endres ikke |
| `delete` | `public.kan_fjerne_gruppefil(name)`: raden er `slettet`, `avvist`, utgått eller en `venter` som har gått ut, og den innloggede leser gruppen eller er den som slettet. Databasen har alt bestemt at filen skal bort; regelen lar bare nettleseren gjøre selve fjerningen |

Ingen av reglene gir noe for en annen bøtte, og `avatarer` er uendret.

### 3.2 Hvem får gjøre hva

| Hvem | Se lista og hente | Laste opp | Endre navn og beskrivelse på egne | Slette egne | Slette andres |
| --- | --- | --- | --- | --- | --- |
| Medlem | ja | ja | ja | ja | nei |
| Moderator | ja | ja | ja | ja | ja |
| Ansvarlig | ja | ja | ja | ja | ja |
| Systemarkitekt | ja, alle grupper | ja, i aktive grupper | ja | ja | ja |
| Invitert, fjernet, utenfor gruppen | nei | nei | nei | nei | nei |
| Lokal administrator som ikke er med | nei | nei | nei | nei | nei |

Det er de samme rettighetene som for chatten (`docs/gruppechat.md`), så
brukerne bare har én modell å forholde seg til.

### 3.3 Arkivert gruppe

Som ellers i gruppene: ingen nye filer og ingen endringer, og bare
systemarkitektene leser. **Unntak foreslått:** en systemarkitekt kan slette en
fil i en arkivert gruppe når den inneholder noe som ikke skal være der
(pasientopplysninger). P6 fryser arkiverte grupper helt, også for
systemarkitektene; P7-kontrakten (`docs/gruppechat.md`) har tatt inn det
samme unntaket for chatten (17.11.2026), og P8 følger den.

### 3.4 Nedlasting uten signerte lenker

En signert lenke fra Supabase gjelder til den utløper, uansett hva som skjer
med medlemskapet, og kan bare trekkes tilbake ved å kontakte Supabase. Med
mellomlager på kanten kan et svar på en signert lenke dessuten leve videre
etter at lenken har utløpt. Det passer ikke med kravet om at tilgangen skal
forsvinne med en gang.

**Valg:** gruppefiler hentes alltid med den innloggedes egen innlogging
(Storage-klientens `download()`, med JWT-en i forespørselen). Reglene i §3.1 sjekkes
ved hver eneste nedlasting, og en privat bøtte deler ikke mellomlager mellom
brukere. Nettleseren får filen som en `Blob` og viser eller lagrer den med en
lokal lenke (`URL.createObjectURL`), som slettes når visningen lukkes. Ingen
signerte lenker lages for gruppefiler, og ingen lenke til en fil kan deles
utenfor appen.

**Tap av tilgang:** fjernes et medlem, eller mister hen medlemskapet i
fagmiljøet, svarer neste nedlasting nei, også med en gyldig innlogging, og
fanen viser «Du har ikke lenger tilgang til denne gruppen.» som chatten. En
fil som alt er lastet ned til en maskin, kan ingen system hente tilbake. Det
står i dokumentasjonen og i regelen brukerne ser (§5.2), og er grunnen til at
forebyggingen ved opplastingen er det viktigste.

### 3.5 Andre fagmiljøer

En fil hører til én gruppe og ingenting annet. I en gruppe på tvers ser
medlemmene fra B filene i gruppen, men ingenting lokalt i A, som for trådene,
idéene og chatten. P8 lager ikke filområder for fagmiljøene selv, og ingen
fil kan flyttes mellom grupper.

### 3.6 Opplasteren og profilene

Lista viser opplasteren med profilkortet, levert av `les_gruppefiler` (som
`security definer`, slik chatten gjør det). Har opplasteren forlatt gruppen,
står filen, og lista viser «Tidligere medlem» for dem som ikke lenger ser
profilen etter reglene i `docs/fagmiljoer.md` («Profiler og profilbilder»).
Tabellen leses ikke direkte fra nettleseren, så profilregelen trenger ikke
utvides.

## 4. Lagring og drift

### 4.1 Filtypene

Bare en tillatelsesliste; alt annet avvises i databasen, i bøtten og i
Edge-funksjonen. Anbefalt i første versjon (beslutning 3, §8):

| Type | MIME | Behandling |
| --- | --- | --- |
| PDF | `application/pdf` | Filhodet kontrolleres; vises i nettleserens PDF-visning |
| Bilder | `image/png`, `image/jpeg`, `image/webp` | Lagres på nytt i nettleseren før opplasting (EXIF og posisjon fjernes); vises i appen |
| Word, Excel, PowerPoint | `.docx`, `.xlsx`, `.pptx` | Filhodet kontrolleres (zip med riktig innhold); lastes ned, åpnes ikke i appen |
| Ren tekst og CSV | `text/plain`, `text/csv` | Hele teksten sjekkes for fødselsnumre på serveren; lastes ned |

**Ikke tillatt:** SVG, HTML, XML og alt annet nettleseren kan kjøre som kode
(en lokal lenke til en slik fil ville kjørt i appens eget opphav); filer med
makroer (`.docm`, `.xlsm`, `.pptm`); pakker (`.zip`, `.7z`); kjørbare filer;
lyd og video; og **medisinske formater som DICOM og HL7**, som er laget for å
bære pasientopplysninger.

### 4.2 Størrelse og kvoter

Anbefalt (beslutning 4):

| Grense | Anbefalt | Hvorfor |
| --- | --- | --- |
| Største fil | 10 MB | Nok for artikler, presentasjoner og protokoller; godt under gratisplanens 50 MB |
| Per gruppe | 100 MB | Ti store filer; holder en enkelt gruppe fra å fylle kvoten |
| Alle gruppefiler | 500 MB | Halvparten av organisasjonens 1 GB, så profilbildene, kopiene og andre prosjekter har plass |
| Opplastinger per bruker | 20 per time | Stopper løpske skript og feilbruk |

Grensene står ett sted (`@delt/gruppefiler`, som `GRUPPECHAT_GRENSER`) og i
svaret fra `les_gruppefiler`; databasen er fasit, appen viser dem. Kvoten
vises i fanen («42 av 100 MB brukt»).

### 4.3 Skadelig innhold

Supabase skanner ikke filer. En virusskanner (som ClamAV) kan ikke kjøres i
Edge-funksjonene (minne og CPU, §1.3), og eksterne skannetjenester (som
VirusTotal) får innholdet tilsendt, og noen deler det videre. Det strider mot
regelen om at brukerinnhold ikke sendes til tredjeparter uten særskilt
vurdering. **Anbefalt (beslutning 6): ingen ekstern skanning.** I stedet:

- tillatelseslisten uten aktive formater og makroer (§4.1);
- filhodet kontrolleres mot typen på serveren, så en kjørbar fil ikke kan
  kalles `.pdf`;
- bilder lagres på nytt i nettleseren, så det som lastes opp er et nytt bilde;
- Office-filer og tekst vises ikke i appen, bare lastes ned, og åpnes da med
  brukerens egne programmer og virksomhetens egen virusbeskyttelse;
- PDF-er vises i nettleserens egen PDF-visning, som kjører isolert;
- bare medlemmer av gruppen kan laste opp, og alt kan spores til en konto.

### 4.4 Lagringstid og sletting

**Anbefalt (beslutning 2): 12 måneder**, som chatten, regnet fra opplastingen.
Fra fristen er filen usynlig og kan ikke hentes (reglene i §3.1 og
funksjonene sjekker fristen selv), og så fjernes den fra Storage.

Filer kan ikke slettes med SQL; da blir de liggende i Storage uten rad
(Supabase-dokumentasjonen). Selve fjerningen må gå gjennom Storage-API-et, og
skjer på tre måter:

1. **Med en gang ved sletting:** nettleseren til den som slettet, fjerner
   filen rett etter `slett_gruppefil`, og `fjernet_kl` settes.
2. **Når gruppen åpnes:** `les_gruppefiler` gir stiene til filer som er
   slettet, avvist, utgått eller hengende i `venter`, men ikke fjernet ennå,
   og nettleseren fjerner dem (reglen `delete` i §3.1).
3. **En daglig ryddejobb** (beslutning 7) som fjerner det som er igjen, også i
   grupper ingen åpner. Det er en ny automatisk jobb, og den krever Peders ja
   (`AGENTS.md`). Uten den kan utgåtte filer bli liggende i Storage (usynlige)
   i grupper ingen besøker, og fortsatt komme med i sikkerhetskopiene.

En gruppe som arkiveres, beholder filene til fristen. Ingen eksisterende data
berøres: bøtten og tabellen er nye.

### 4.5 Logger

Ingen filnavn, beskrivelser eller innhold i logger, feilmeldinger, varsler
eller sanntidshendelser. Storage-loggene ser bare stier med ID-er (§2.1).
Tilgangsloggen får sletting av andres filer (fil-ID, gruppe, hvem, når), ikke
navnet.

### 4.6 Sikkerhetskopiene

Gruppefilene kommer med i kopiene uten endring (§1.5). Prøven i det lokale
testmiljøet (`npm run sikkerhetskopi:prove`) utvides med en gruppefil, så
gjenopprettingen viser at filen og reglene på bøtten er med. Hvor lenge
kopiene oppbevares, avgjøres i S4 (tiltak 3); for gruppefilene bør det ikke være
lenger enn nødvendig, fordi en slettet fil lever videre der.

## 5. Personvern og regelen om pasientopplysninger

### 5.1 Hva som kan sjekkes, og hva som ikke kan

| Kontroll | Hvor | Hva den fanger |
| --- | --- | --- |
| Filnavn og beskrivelse mot fødselsnummer | Databasen (`intern.krev_uten_personnummer`, avvisning) | «Prøvesvar 01017012345.pdf» |
| Tekst i `.txt` og `.csv` mot fødselsnummer | Edge-funksjonen (avvisning) | Lister med fødselsnumre |
| Tekst i `.docx`, `.xlsx`, `.pptx` mot fødselsnummer | Nettleseren, som stopper opplastingen med samme feil som avvisningen (filene er zip med XML og kan leses lokalt) | Tabeller og dokumenter med fødselsnumre. Ikke på serveren: å pakke ut store filer går ikke innenfor Edge-grensene |
| EXIF og posisjon i bilder | Nettleseren lagrer bildet på nytt | Når og hvor bildet ble tatt, kameraet |
| Bilder, skjermbilder og skannede dokumenter | **Ingen** | Et bilde av en journal, et prøvesvar eller en rekvisisjon kan ikke gjenkjennes uten bildegjenkjenning |
| Navn, diagnoser, kasuistikker i fritekst | **Ingen** | Bare brukerens eget skjønn |
| Tekst i PDF | **Ingen i første versjon** | Krever et PDF-bibliotek i nettleseren; kan vurderes senere |
| Metadata i Office og PDF (forfatter, firma) | **Ingen** | Ansattes navn, ikke pasienters; å skrive filene om krever et eget bibliotek |

Kontrollene er et sikkerhetsnett for åpenbare feil, ikke en garanti, og det
skal stå slik i dokumentasjonen. Ingen fil eller tekst sendes til
ekstern AI eller noen annen tjeneste for kontroll.

### 5.2 Det brukeren ser

- **Øverst i filfanen:** hvem som leser filene.
- **Ingen påminnelser eller avkrysninger om pasientopplysninger** (Peder
  17.11.2026: brukerne er godt trent i personvern, og påminnelser blir støy).
  Regelen står i dokumentasjonen (`docs/pasientopplysninger.md`).
- **Avvisning:** når navnet, beskrivelsen eller teksten i filen ligner et
  fødselsnummer, avviser databasen eller Edge-funksjonen opplastingen med
  `PASIENTREGEL.avvist`, og appen viser det som en feil ved opplastingen.
- **Mobil:** filvelgeren åpner ikke kameraet direkte (ingen `capture`), så et
  bilde må velges bevisst.

### 5.3 Fjerning og hendelser

Den felles rutinen står i `docs/pasientopplysninger.md` (tråd D). For filer
kommer dette i tillegg:

1. **Fjerne:** opplasteren, en moderator, en ansvarlig eller en
   systemarkitekt sletter filen (også i en arkivert gruppe for
   systemarkitekten, §3.3). Den kan ikke hentes fra det øyeblikket, og selve
   filen fjernes fra Storage med en gang (§4.4).
2. **Varsler og andre kopier:** varslene sier bare «Ny fil i <gruppe>», uten
   filnavn, så det er ingenting å rydde der. Filene er ikke i det globale
   søket, ikke i eksport og ikke i nettleserens mellomlager (lokale lenker
   slettes når visningen lukkes).
3. **Nedlastede kopier:** de ansvarlige ber medlemmene slette filen fra egne
   maskiner. Hvem som har hentet filen, logges ikke i første versjon (se
   beslutning 8).
4. **Sikkerhetskopiene:** filen ligger i kopiene tatt før slettingen.
   Systemarkitekten fører hendelsen og sørger for at de kopiene slettes etter
   rutinen S4 fastsetter (§4.6).
5. **Føre hendelsen** etter `docs/pasientopplysninger.md`, uten å gjengi
   opplysningene.

## 6. Brukerflaten

### 6.1 Fanen Filer

- `#/grupper/<ID>/filer` (`GRUPPEFANER`), med tallet på nye filer. Vises bare
  når `samhandling.nye_filer` ikke er `null`.
- Lista: navn, type, størrelse, hvem som la den ut og når, med beskrivelsen
  under. Sortert nyest først, med søk i navnene når lista blir lang.
- Et trykk på en PDF eller et bilde åpner den i appen; andre filer lastes ned.
  Menyen per fil har «Last ned», «Endre» (egne) og «Slett».
- «Last opp fil» åpner vinduet i §5.2, med valg av fil (også dra og slipp på
  PC), beskrivelse, fremdrift og feilmeldinger. Utkastet til navnet og
  beskrivelsen bevares (`useBevart`); filen selv kan ikke bevares over en
  oppdatering av siden, og vinduet sier det.
- En arkivert gruppe viser lista uten opplasting, med «Gruppen er arkivert».
- Designsystemet og de eksisterende komponentene (`docs/designsystem.md`);
  full tastaturbruk, skjermleser (fremdriften med `aria-live`) og smal skjerm.

### 6.2 Varslene

Ny kategori `gruppefiler` i gruppen «Grupper», på som standard. Én ny fil gir
de andre som leser gruppen ett varsel med nøkkelen `gruppefiler:<gruppe-ID>`
og `gruppe_id`, så den som mister tilgangen, ikke ser det. Teksten er «Nye
filer i <gruppe>», og et trykk åpner fanen. Slettinger og endringer varsler
ingen.

### 6.3 Direktelenker

En lenke til en fil (`#/grupper/<ID>/filer/<fil-ID>`) åpner fanen med filen
uthevet, men starter ikke en nedlasting. For den som ikke leser gruppen, er
filen borte, som en idé fra en annen gruppe.

### 6.4 Vedlegg i chatten

Ikke i P8. Når fildelingen har vært i bruk en stund, kan en chatmelding få
peke på en fil i samme gruppe (en `fil_id` på meldingen, vist som et kort som
henter filen gjennom de samme reglene). Det er en egen, liten etappe og
krever en endring i P7-kontrakten.

## 7. Leveransene

Som P7: en kontrakt og grunnmur først, deretter små, selvstendige PR-er som
kan kontrolleres hver for seg. Alle får `ansvar:dev` og bryteren står av til
Peder har godkjent aktiveringen.

| Del | Leverer | Avhenger av |
| --- | --- | --- |
| **P8.0** Kontrakt og grunnmur | `docs/gruppefiler.md` (kontrakten, etter denne planen og Peders valg), `intern.gruppefiler_aktivert()` = `false`, `@delt/gruppefiler` (tillatelseslisten, filhodene, grensene; delt av appen, Edge og testene), typene i `src/gruppefiler/modell.ts`, en testhjelper med syntetiske filer, og en utvidet `storage`-etterligning i testdatabasen (`metadata`, `storage.foldername`) | P7 slått sammen; Peders valg i §8 |
| **A** Database og tilgang | Bøtten, tabellen, funksjonene, reglene på `storage.objects`, `nye_filer` i `gruppeoversikt`, lagringstiden, negative tilgangstester og samtidighet mot ekte Postgres (kvoten) | P8.0 |
| **B** Kontroll ved opplasting | Edge-funksjonen `fullfor-gruppefil`: størrelsen, filhodet, tekstfilene, avvisning og fjerning; enhetstester med syntetiske filer | P8.0; As funksjoner for integrasjonen |
| **C** Brukerflaten | Fanen, lista, opplastingsvinduet, visning og nedlasting, bilder lagret på nytt, advarslene, tastatur og mobil | P8.0 (mot testhjelperen); kobles til A og B |
| **D** Varsler og lenker | Kategorien `gruppefiler`, varselet og rutingen, direktelenkene | A |
| **E** Personvern og kvalitet | Tillegget for filer i personvernvurderingen (D6), rutinen i §5.3 i `docs/pasientopplysninger.md`, testmatrisen, prøven av sikkerhetskopien med en gruppefil, sluttkontrollen i nettleseren i det lokale testmiljøet med ekte Storage | A–D |
| **Aktivering** | Én liten migrasjon som slår på bryteren og viser til Peders ja | Alt over kontrollert; Peders ja |
| **Ryddejobben** (hvis beslutning 7 er ja) | Den daglige fjerningen, i samme mønster som de andre planlagte kjøringene | A |

Fordelingen av filer mellom A–E skrives i kontrakten, som i P7.

### 7.1 Akseptkriterier

1. To medlemmer av samme gruppe deler en fil, og den andre ser og henter den.
2. Et medlem kan ikke se eller hente en annen gruppes filer, heller ikke med
   direkte kall til Storage med en gjettet eller kjent sti.
3. Medlemmer fra ulike fagmiljøer deler filer i en gruppe på tvers uten
   tilgang til lokale data.
4. Et medlem som fjernes, får nei ved neste nedlasting, også med fanen åpen
   og en gyldig innlogging.
5. Gyldig innlogging, avsluttet medlemskap i fagmiljøet: verken liste,
   hente eller laste opp.
6. En arkivert gruppe tar ikke imot filer; en systemarkitekt kan slette.
7. En fil med feil filhode, over grensen, av en type utenfor lista, eller en
   tekstfil med et (syntetisk) fødselsnummer, avvises og fjernes.
8. Kvoten holder også når to laster opp samtidig.
9. En slettet fil kan ikke hentes med en gang, og er borte fra Storage.
10. En utgått fil kan ikke hentes, og fjernes.
11. Tastatur, mobil og skjermleser.
12. Ingen filnavn eller innhold i logger, varsler eller feilmeldinger.

### 7.2 Testmatrisen

| Scenario | Database (`som()`) | Storage-regler | Edge | Komponent | Nettleser (lokalt) |
| --- | --- | --- | --- | --- | --- |
| Medlem, moderator, ansvarlig, systemarkitekt: lese, laste opp, slette | A | A | – | C | E |
| Invitert, fjernet, utenfor, lokal admin utenfor | A | A | – | – | E |
| Gyldig token etter avsluttet medlemskap i gruppen og i fagmiljøet | A | A | B | – | E |
| Gruppe på tvers, bruker fra B | A | A | – | – | E |
| Arkivert gruppe | A | A | – | C | – |
| Sti til en `venter`, `avvist`, `slettet` eller utgått fil | A | A | – | – | – |
| Opplasting til en annen sti enn den forberedte, eller over en eksisterende | – | A | – | – | – |
| Feil filhode, for stor, feil type, fødselsnummer i navn og tekst | A | – | B | C | E |
| To opplastinger mot kvoten samtidig; gjentatt `klient_id` | A (ekte Postgres) | – | – | – | – |
| Varsel til de andre, ikke til den som mistet tilgangen | D | – | – | D | E |
| Bryteren av: alt avvist | A | A | B | C | – |
| Sikkerhetskopi og gjenoppretting med en gruppefil | – | – | – | – | E |

Bare syntetiske filer og syntetiske fødselsnumre laget i testene (som
`src/__tests__/p7grunnmur.test.ts`). Ingen tester mot produksjonen.

## 8. Det Peder må ta stilling til

Før P8 bygges ferdig og slås på. Hvert punkt har et anbefalt svar; P8.0
bygger på anbefalingen hvis ikke Peder velger noe annet. Spørsmålene stilles
gjennom P7-hovedtråden når P8 bestilles, ikke nå.

| # | Spørsmål | Anbefalt | Hvorfor |
| --- | --- | --- | --- |
| 1 | Skal fildelingen slås på når den er ferdig og kontrollert? | Ja, etter samme kontroll som chatten | Bryteren står av til Peder sier ja |
| 2 | Hvor lenge skal filer lagres? | 12 måneder, så slettes de automatisk og kan ikke hentes tilbake | Samme som chatten; filer som ingen trenger, bør ikke ligge |
| 3 | Hvilke filtyper skal tillates? | PDF, bilder (PNG, JPEG, WebP), Word, Excel, PowerPoint, tekst og CSV | Dekker artikler, protokoller og presentasjoner, uten formater som kan kjøre kode |
| 4 | Hvor store filer, og hvor mye per gruppe? | 10 MB per fil, 100 MB per gruppe, 500 MB til sammen | Holder seg godt innenfor gratisplanen |
| 5 | Kan filer deles i grupper på tvers av fagmiljøene? | Ja, som tråder, idéer og chat | Pasientopplysninger er forbudt overalt, så reglene er de samme |
| 6 | Kan en ekstern tjeneste skanne filene for virus? | Nei | Det ville sendt filene til en tredjepart; tiltakene i §4.3 brukes i stedet |
| 7 | Kan OUSFAR få en daglig ryddejobb som fjerner slettede og utgåtte filer? | Ja | Uten den kan utgåtte filer ligge igjen i lagringen og i sikkerhetskopiene |
| 8 | Skal det logges hvem som har hentet en fil? | Nei i første versjon | Gir mer persondata om de ansatte; kan legges til hvis en hendelse viser behov |

**Tekniske valg som ikke trenger Peder** (står i planen): privat bøtte med
stier uten filnavn; ingen signerte lenker; filene kan ikke endres; kontroll av
filhodet; bilder lagret på nytt; ingen vedlegg i chatten ennå; rettighetene
som i chatten; at sikkerhetskopiene tar med filene.

## 9. Åpne punkter og risiko

- **Kvoten er organisasjonens.** Fillagringen på gratisplanen (1 GB) gjelder
  hele Supabase-organisasjonen. Om andre prosjekter ligger i samme
  organisasjon som `far`, sjekkes i P8 A før grensene i §4.2 settes; da kan
  totalgrensen måtte ned.
- **Testdatabasen** har bare en forenklet `storage.objects` (`id`,
  `bucket_id`, `name`). Reglene i §3.1 trenger `metadata` og
  `storage.foldername`, og den ekte Storage prøves bare i det lokale
  testmiljøet; P8.0 utvider etterligningen.
- **Pasientopplysninger i bilder og skannede dokumenter** kan ikke oppdages.
  Det er den største restrisikoen, og grunnen til avkrysningen og teksten om
  bilder i §5.2.
- **Nedlastede kopier** kan ikke trekkes tilbake. Rutinen i §5.3 er det som
  finnes.
- **Sikkerhetskopiene** beholder slettede filer til kopiene slettes; avhenger
  av S4 tiltak 3.
