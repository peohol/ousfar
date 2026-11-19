# Personvern og tilgang i direktemeldingene (D5)

Vurderingen og tilgangsmodellen for direktemeldinger i OUSFAR: samtaler
mellom to brukere, på tvers av fagmiljøene, i den felles chatmenyen
([ux-dashboard-chat-navigasjon-plan.md](ux-dashboard-chat-navigasjon-plan.md)
§6.2–6.4 og §12 «Chat»). Dokumentet er grunnlaget D5-implementeringen
følger. **Det slår ingenting på**: direktemeldingene bygges med en bryter som
står av, og den slås på først når punktene under [Det som krever Peders
ja](#det-som-krever-peders-ja) er avgjort og testene er grønne. Peder ga sitt
ja til alle fem beslutningene 18.11.2026.

Utgangspunktet er gruppechatten ([gruppechat.md](gruppechat.md),
[gruppechat-personvern.md](gruppechat-personvern.md)). Regelen om
pasientopplysninger ([pasientopplysninger.md](pasientopplysninger.md)) gjelder
fullt ut, også at appen ikke minner om den ved skrivefeltet.

Som i gruppechatten er hvert valg merket med hvem som eier det:

- **Avgjort:** Peder har bestemt det (her: gjennom planen, som han har
  bestilt).
- **Teknisk:** et valg Claude og ChatGPT tar innenfor Peders rammer. Det kan
  endres senere uten tap av data, og trenger ikke eget ja.
- **Peders ja:** krever en beslutning fra Peder før det kan gjøres.

## Kort fortalt

- Bare de to i samtalen kan lese den i appen. Ingen administrator,
  moderator eller systemarkitekt får innsyn, i motsetning til gruppechatten.
- Ingen kan sende eller motta direktemeldinger før de selv har slått på
  `Tillat direktemeldinger`. Den står av for alle fra starten.
- Bare den som har slått det på, kan finnes i søket, og søket viser bare
  navn og brukernavn.
- Den som slår det av, blokkerer noen eller mister tilgangen til OUSFAR, kan
  ikke få nye meldinger. Det som alt er skrevet, blir stående til
  lagringstiden går ut, og kan fortsatt leses av de to.
- Hver av de to kan slette alle meldingene i samtalen sin, og teksten er da
  borte fra databasen med en gang. Det finnes ingen kopi.
- Ingen varsler med tekst eller navn, ingen e-post, ingen push og ingen
  «sist sett».

## Det som er annerledes enn i gruppechatten

| | Gruppechatten | Direktemeldingene |
| --- | --- | --- |
| Hvem leser | Gruppens aktive medlemmer og systemarkitektene | Bare de to deltakerne |
| Hvem kan være med | Medlemmene i gruppen | Alle aktive OUSFAR-brukere som selv har slått det på, på tvers av fagmiljøene |
| Moderering | Moderatorene og de ansvarlige i gruppen | Ingen moderatorer. Hver deltaker kan slette alle meldinger i samtalen og blokkere den andre |
| Hvem kan slette en melding | Forfatteren og moderatorene | Begge deltakerne (beslutning 5) |
| Varsler | I bjella («Nye meldinger i <gruppe>») til D4b flytter dem til chatknappen | Aldri i bjella; bare tallet på chatknappen og markøren i samtalelista |
| Bryter for den enkelte | Ingen (varselinnstillingen) | `Tillat direktemeldinger` og `Vis når jeg er aktiv`, begge av som standard |

Alt annet er som i gruppechatten: dørklokke uten innhold i sanntiden,
endringstelleren, `klient_id`, grensene, fødselsnummerkontrollen, ingen kopi av
endret eller slettet tekst, og lagringstiden.

## Det direktemeldingene behandler

| Opplysning | Hvor (skisse) | Hvorfor |
| --- | --- | --- |
| Meldingsteksten | `direktemeldinger.tekst` | Selve samtalen. Fjernes når meldingen slettes |
| Hvem som skrev og når, og om den er endret eller slettet, av hvem og når | `direktemeldinger` | Samtalen må henge sammen |
| At to personer har en samtale | `direktesamtaler` (de to bruker-ID-ene, løpenummer og endringsteller) | Én samtale per par; dørklokken for sanntiden |
| Hvor langt hver har lest, om samtalen er dempet eller skjult | `direktesamtale_status` | Tallet på uleste. Vises ikke for den andre |
| Egne valg | `chatvalg` (`tillat_direktemeldinger`, `vis_aktiv`) | Hvem som kan finnes og få meldinger |
| Hvem man har blokkert | `direktemelding_blokkeringer` | Håndheves ved sending og søk. Vises bare for den som blokkerte |
| At man er aktiv akkurat nå | `chataktivitet` (én rad med en frist høyst to minutter fram) | Den grønne prikken. Ingen historikk |
| Profilkortet | `profiles` (fra før) | Navn og bilde ved meldingene |

Direktemeldingene lagrer ikke hvem som har lest hvilken melding, IP-adresser,
enheter, søkene noen har gjort, når noen sist var aktiv eller noe annet om
bruken.

## Standardvalgene

| Område | Valg | Eier |
| --- | --- | --- |
| **Tilgang** | Bare de to deltakerne leser samtalen, meldingene, tallene og tidspunktene. Alle andre, også systemarkitektene og de lokale administratorene, får det samme svaret som for en samtale som ikke finnes, også med en gyldig samtale-ID. Systemarkitektenes myndighet fra P6 («kan lese alt») gjelder ikke her | Avgjort (planen §6.3–6.4; Peder, beslutning 1, 18.11.2026) |
| **Frivillig aktivering** | `Tillat direktemeldinger` er av for alle til den enkelte slår den på, i chatmenyen eller under Konto → Innstillinger → Chat (samme innstilling). Den kan slås av og på når som helst. Den er en tilgjengelighetsinnstilling, ikke en slettefunksjon | Avgjort (planen §6.2) |
| **Hvem kan sende** | Sending krever at **begge** har bryteren på, at **ingen** av dem har blokkert den andre, og at **begge** har aktivt medlemskap i OUSFAR. Kontrollen gjøres i databasen i selve sendingen, under en lås (se [Samtidighet](#låsing-og-samtidighet)), så den gjelder også åpne vinduer og parallell innlogging. Den som selv har slått av, kan heller ikke sende: man skriver ikke til noen man ikke kan få svar fra | Teknisk (strengere enn planen) |
| **Søkbarhet** | Søket viser bare andre aktive brukere som selv har bryteren på, og ingen man har blokkert eller er blokkert av. Det krever at den som søker, har bryteren på, minst to tegn, og gir høyst 20 treff. Treffet er navn og brukernavn; ikke bilde, fagmiljø, rolle, grupper eller om personen er aktiv. Søket lagres ikke | Teknisk (innenfor planen §6.2) |
| **Én samtale per par** | De to bruker-ID-ene lagres sortert, med en unik regel, så samme par aldri får to samtaler, heller ikke når begge starter samtidig. `Ny chat` med en man har snakket med, åpner den samme samtalen | Avgjort (planen) |
| **Avslått mottaker** | Usøkbar. Kan ikke få nye meldinger, heller ikke i en samtale som finnes; den andre ser en låst linje, «Kan ikke motta nye direktemeldinger.», i stedet for skrivefeltet. Historikken står og kan leses av begge til lagringstiden går ut; bryteren sletter, flytter eller forkorter ingenting. Slås den på igjen, fortsetter den samme samtalen | Avgjort (planen) |
| **Samme svar uansett grunn** | Avslått, blokkert, uten tilgang til OUSFAR og slettet konto gir den andre nøyaktig samme svar og samme tekst. Den som er blokkert, får altså ikke vite det. Den som selv har slått av eller blokkert, ser sin egen grunn | Teknisk |
| **Blokkering** | Hver kan blokkere den andre fra samtalen, og oppheve det igjen under Innstillinger → Chat. Blokkeringen virker begge veier for ny sending, fjerner begge fra hverandres søk og fra aktivitetsprikken, og gjelder til den oppheves. Den sletter ingenting. Man kan bare blokkere noen man har en samtale med eller ser i søket; ellers svarer databasen som for en person som ikke finnes | Teknisk (innenfor planen §6.2) |
| **Demping** | En dempet samtale teller ikke med på chatknappen. Den står i samtalelista med en dempet markør. Den andre får ikke vite det | Teknisk |
| **Skjule en samtale** | Hver kan skjule en samtale fra sin egen liste. Den kommer tilbake når det kommer en ny melding. Det sletter ingenting for noen | Teknisk |
| **Redigering** | Bare forfatteren, og bare så lenge det kan sendes i samtalen (ellers kunne en blokkert endre tekst den andre allerede har lest). Den nye teksten erstatter den gamle, som ikke lagres; meldingen merkes «redigert» med tidspunktet | Teknisk (som gruppechatten) |
| **Sletting** | Begge deltakerne kan slette enhver melding i samtalen, også når det ikke kan sendes lenger. Teksten settes til tom i databasen med en gang. Plassen står som «Meldingen er slettet» (forfatteren) eller «Fjernet av <navn>» (den andre), med tidspunktet. Det finnes ingen moderatorer, så dette er måten mottakeren selv får fjernet noe som ikke hører hjemme der | **Gitt** (Peder, beslutning 5, 18.11.2026) |
| **Lagringstid** | 12 måneder, som gruppechatten. En melding eldre enn det slettes helt og kan ikke hentes tilbake, også de som står som slettet. Den er borte for brukerne fra fristen, også før raden er ryddet. En samtale uten meldinger igjen og uten aktivitet de siste 12 månedene fjernes med statusen sin | **Gitt** (Peder, beslutning 2, 18.11.2026) |
| **Sikkerhetskopier** | Kopiene er ikke i drift ennå (`drift-gjenoppretting.md`, tiltak 3). Anbefalt: meldingstekstene tas ikke med i kopiene; valgene og blokkeringene tas med, så en gjenoppretting ikke opphever en blokkering | **Gitt** (Peder, beslutning 3, 18.11.2026) |
| **Innsyn ved misbruk eller hendelser** | Ingen i appen. Misbruk håndteres med blokkering og sletting av deltakerne selv. Pasientopplysninger fjernes av deltakerne (se [Utilsiktet delt innhold](#utilsiktet-delt-innhold)) | **Gitt** (Peder, beslutning 1, 18.11.2026) |
| **Teknisk tilgang til databasen** | Den som har driftsnøklene, kan teknisk lese alt (også Claude-miljøet, `s4-pilotplan.md`). Regelen: ingen leser meldingsteksten i databasen. Spørringer i drift og feilsøking bruker bare ID-er, antall og tidspunkter. Kodeagentene leser aldri meldingstekst | Teknisk (regel); unntak krever beslutning 1 |
| **Aktivitetsstatus** | Egen bryter, `Vis når jeg er aktiv`, av som standard og uavhengig av `Tillat direktemeldinger`. Prikken betyr bare at personen har brukt OUSFAR de siste to minuttene, ikke at hen er på jobb eller har lest noe. Den vises bare for dem man har en samtale med og ikke har blokkert, og bare når begge har aktivt medlemskap. Ingen «sist sett», ingen historikk; databasen gir bare ja/nei, aldri et tidspunkt | Avgjort (planen); synligheten teknisk |
| **Tap av tilgang til OUSFAR** | Med aktivt medlemskap borte stenger alle funksjonene med en gang, med samme token (P2.0), og sanntiden sender ingenting. Den andre ser «Kan ikke motta nye direktemeldinger.», og personen er borte fra søket. Får personen tilgang igjen, er samtalene og valgene som før. Bytte av arbeidsfagmiljø påvirker ikke direktemeldingene | Avgjort (planen §6.4) |
| **Slettet konto** | Meldingene står med avsenderen tom («tidligere bruker») til lagringstiden går ut, som ellers i appen. Den andre kan lese og slette, ikke sende. Valgene, blokkeringene og statusen til den slettede kontoen slettes med den | Teknisk |
| **Gruppechatten** | Påvirkes aldri av bryterne eller blokkeringene her. En blokkering gjelder bare direktemeldinger | Avgjort (planen) |
| **Varslingsinnhold** | Ingen varsler i bjella. Chatknappen viser antallet uleste i samtaler som ikke er dempet, og samtalelista en markør per samtale; ingen tekst, ingen utdrag, og i knappen heller ingen navn. Ingen e-post og ingen push | Avgjort (planen §6.3) |
| **Sanntid** | Dørklokke på `direktesamtaler` uten tekst og avsender, med radsikkerhet for hver hendelse, som i gruppechatten | Teknisk |
| **Eksterne tjenester** | Supabase (EU) lagrer meldingene. Ingen AI eller annen tjeneste får innholdet, heller ikke for kontroll | Avgjort (planen §6.3) |
| **Grenser** | Høyst 4000 tegn per melding, 20 nye meldinger i minuttet per bruker og samtale og 60 i minuttet per bruker til sammen, høyst 10 nye samtaler i timen per bruker | Teknisk |
| Søk i meldingene, eksport, vedlegg | Finnes ikke. Søket i samtalelista søker bare i navnene | Teknisk; vedlegg krever **Peders ja** (P8) |
| **Innsyn for den registrerte** | Begge ser hele samtalen i appen. Ber noen om sine data, hentes bare vedkommendes egne meldinger ut | Teknisk |

### Utilsiktet delt innhold

Brukerne er godt trent, så appen minner ikke om regelen. Databasen avviser tekst
som ligner et fødselsnummer (`intern.krev_uten_personnummer`) og appen viser
avslaget. Kommer pasientopplysninger likevel inn:

1. Den som ser det, forfatteren eller mottakeren, sletter meldingen selv med
   en gang (beslutning 5). Ingen andre trenger å lese teksten for å fjerne den.
2. Teksten er borte fra databasen med en gang, og fra den andres åpne vindu
   innen ett minutt (livstegnet). Sanntiden og varslene har aldri hatt den.
3. Hendelsen meldes uten å gjenta opplysningene, etter
   [pasientopplysninger.md](pasientopplysninger.md#håndteringen-av-en-hendelse).
   Meldingens ID trengs ikke, siden den alt er fjernet.
4. Meldingene er ikke i sikkerhetskopiene (beslutning 3), så de kommer ikke
   tilbake ved en gjenoppretting.

## Det som krever Peders ja

Fem beslutninger, hver med én anbefaling i vanlig språk. Peder ga sitt ja
til anbefalingene i 1–4 18.11.2026 («Jeg støtter dine anbefalinger.», i
D5-tråden), og til anbefalingen i 5 samme kveld («Ja, begge kan slette alt»).

| # | Spørsmål | Anbefaling | Hvorfor |
| --- | --- | --- | --- |
| 1 ✓ | **Skal noen andre enn de to i samtalen kunne lese direktemeldinger, for eksempel ved misbruk eller en hendelse?** | **Nei.** Bare de to leser dem. De kan slette meldinger og blokkere den andre, og det er nok til å stanse misbruk og fjerne noe som ikke hører hjemme der. Ingen leser meldingene i databasen heller | Det er det plattformene folk kjenner fra før gjør, og det de to forventer. Innsyn for administratorer krever rutiner, logging og en grunn til å lagre mer, og ingen av delene trengs når deltakerne selv kan fjerne innholdet |
| 2 ✓ | **Hvor lenge skal direktemeldinger lagres?** | **12 måneder**, som gruppechatten, og så slettes de automatisk for godt | Samme frist overalt er enklest å forstå og forklare, og ryddejobben finnes allerede. Peders ja fra 17.11.2026 gjaldt bare gruppechatten |
| 3 ✓ | **Skal direktemeldinger være med i sikkerhetskopiene, når de kommer?** | **Nei**, ikke selve meldingene. Innstillingene og blokkeringene tas med | En kopi holder på det som er slettet, og den som har nøkkelen kunne lest private samtaler. Går databasen tapt, mister man meldingene, men samtalene og blokkeringene står. For en chat er det et rimelig bytte |
| 4 ✓ | **Skal direktemeldingene slås på når de er ferdige og kontrollert?** | **Ja**, på samme vilkår som gruppechatten: når testene under er grønne, kontrollen i nettleseren er gjort og ChatGPT har godkjent | Da slipper Peder å bli spurt igjen etter at alt er klart. Uten dette ja-et står de av |
| 5 ✓ | **Skal mottakeren også kunne slette meldinger den andre har skrevet?** | **Ja**, begge kan slette alle meldinger i samtalen sin. Det står «Fjernet av <navn>» der meldingen var | Det finnes ingen moderator i private samtaler. Uten dette kan ingen fjerne for eksempel pasientopplysninger når avsenderen ikke gjør det selv. Prisen er at en av dem kan fjerne noe den andre skrev, for godt |

Alt som tar vare på **mer**, **lenger** eller hos **flere** enn dette dokumentet
sier, krever et nytt ja: innsyn for andre, lengre lagringstid, en kopi av
slettet eller endret tekst, en logg over hvem som leste hva, «sist sett»,
varsler med tekst eller navn, e-post eller push, eksport, vedlegg, eller en
tjeneste utenfor OUSFAR som får innholdet. Endringer som tar vare på mindre er
tekniske, men skal skrives her.

## Trusselvurdering

| Trussel | Tiltak |
| --- | --- |
| Noen gjetter eller kjenner en samtale-ID | Alle funksjonene svarer likt for en samtale som ikke finnes og en man ikke er med i (`42501`, samme tekst); tabellene kan ikke leses direkte; dørklokken har radsikkerhet |
| Omgåelse av takten med samtidige kall fra flere faner | Takten telles under en lås per bruker, se [Låsing og samtidighet](#låsing-og-samtidighet) |
| Kartlegging av hvem som finnes eller snakker sammen | Søket viser bare dem som selv har slått på, høyst 20 treff og uten fagmiljø eller rolle. Om to andre har en samtale, kan ingen se |
| Uønsket kontakt eller trakassering | Frivillig aktivering, blokkering som håndheves ved sending og fjerner fra søket, grense på nye samtaler i timen, og samme svar for blokkert og avslått, så den blokkerte ikke presser på |
| Den blokkerte endrer tekst den andre har lest | Redigering krever at det kan sendes i samtalen |
| Kappløp mellom sending og avslått bryter, blokkering eller avsluttet medlemskap | Låsene i sendingen: enten er meldingen sendt før endringen, eller så avvises den |
| Innhold på avveie gjennom varsler, sanntid, logger eller feilmeldinger | Ingen tekst i noen av dem; testene leter etter teksten i hele databasen |
| Systemarkitekt eller administrator leser privat samtale | Ingen funksjon gir dem tilgang; `er_systemarkitekt` brukes ikke i tilgangskontrollen her. Teknisk tilgang til databasen styres av regelen over |
| Pasientopplysninger i en melding | Fødselsnummerkontrollen; sletting med en gang av begge deltakerne; ingen kopier; ikke i sikkerhetskopiene |
| Aktivitetsprikken brukes til å følge med på noen | Av som standard, bare for samtalepartnere, bare ja/nei, ingen historikk |

## Datamodellen

Slik den er bygd i `supabase/migrations/20261118234500_direktemeldinger.sql`
(se også [Gjennomføringen](#gjennomføringen)). Alle tabellene
har radsikkerhet, den begrensende regelen `aktivt_medlemskap` der nettleseren
har en rettighet, og står i kartleggingen av tilgangsinngangene
(`tilgangsinnganger.test.ts`).

**`chatvalg`** — `bruker_id` (primærnøkkel, `profiles`, `on delete cascade`),
`tillat_direktemeldinger boolean default false`, `vis_aktiv boolean default
false`, `endret_kl`. Ingen rad betyr at begge er av. Ingen direkte tilgang;
leses og endres med funksjonene. Egen tabell, ikke `brukerinnstillinger`, fordi
databasen må lese den for andre under en lås, og fordi nettleseren skriver
fritt i `brukerinnstillinger`.

**`direktesamtaler`** — `id`, `bruker_lav`, `bruker_hoy` (`profiles`, `on delete
set null`; `check (bruker_lav < bruker_hoy)`; unik på paret når begge finnes),
`opprettet_av` (`on delete set null`), `siste_nr`, `siste_endring`,
`siste_melding_kl`, `opprettet_kl`, `endret_kl`. Raden er låsen for skrivingen
og dørklokken. `select` for `authenticated` bare på kolonnene dørklokken
trenger (`id`, `bruker_lav`, `bruker_hoy`, `siste_nr`, `siste_endring`,
`endret_kl`), og bare når den innloggede er en av de to; ingen andre
rettigheter. `opprettet_av` brukes bare av funksjonene: en samtale uten
meldinger står bare i lista til den som åpnet den, og grensen for nye
samtaler i timen teller etter den.

**`direktemeldinger`** — som `gruppemeldinger`: `id`, `samtale_id`, `nr`,
`forfatter_id` (`on delete set null`), `klient_id` (unik per samtale og
forfatter), `tekst` (null når slettet), `skrevet_kl`, `redigert_kl`,
`slettet_kl`, `slettet_som` (`forfatter` eller `motpart`), `endring`. Ingen
direkte tilgang.

**`direktesamtale_status`** — (`samtale_id`, `bruker_id`) → `lest_til_nr`,
`dempet`, `skjult_til_nr`. Ingen direkte tilgang.

**`direktemelding_blokkeringer`** — (`blokkerer`, `blokkert`) med
`opprettet_kl`, begge `on delete cascade`. Ingen direkte tilgang.

**`chataktivitet`** — `bruker_id` (primærnøkkel) → `aktiv_til`. Ingen direkte
tilgang. Rader med `aktiv_til < now()` slettes ved hver oppdatering og hver
lesing, og raden slettes når `vis_aktiv` slås av.

**Bryteren:** `intern.direktemeldinger_aktivert()` svarer `false` til
aktiveringsmigrasjonen. Mens den er av, svarer alle funksjonene `42501`
«Direktemeldingene er ikke slått på.», og radsikkerheten på `direktesamtaler`
gir ingen rader.

## Funksjonene og svarene

Alle er `security definer`, begynner med `intern.krev_aktivt_medlemskap()` og
bryteren, og står i `funksjonskontroller.ts`. Ingen av dem gir
systemarkitektene eller administratorene noe ekstra.

| Funksjon | Gjør |
| --- | --- |
| `mine_chatvalg()` / `sett_chatvalg(tillat, vis_aktiv)` | Leser og endrer egne valg (null = uendret). Endringen tar egen `chatvalg`-rad med `for update` |
| `sok_direktemottakere(sok text)` | Profilkortene (ID, brukernavn, fornavn, etternavn) etter reglene for søkbarhet |
| `aapne_direktesamtale(mottaker uuid)` | Samtalens ID. Finnes samtalen, gis den uansett brytere og blokkeringer (historikken kan leses). Ellers opprettes den bare når en ny melding kunne vært sendt; ellers `42501` «Personen finnes ikke, eller kan ikke motta direktemeldinger.» |
| `mine_direktesamtaler()` | Samtalene: ID, den andres profilkort (null for slettet konto), `siste_melding_kl`, antall uleste, `dempet`, `kan_skrive`. Ingen tekst, ikke de skjulte |
| `les_direktesamtale(samtale, for_nr, antall)` | Som `les_gruppechat`, med `motpart`, `kan_skrive`, `sperre` (`null`, `selv_av`, `selv_blokkert` eller `mottaker` — den siste uten grunn) og `lesere: 2` |
| `direktesamtale_endringer(samtale, etter, antall)` | Som `gruppechat_endringer` |
| `send_direktemelding(samtale, klient_id, tekst)` | Vaktene: tekst og lengde (`22023`), fødselsnummer (`22023`), takten (`PT429`), så låsene og sendevilkårene (`PT409` «Kan ikke motta nye direktemeldinger.» eller egen grunn) |
| `endre_direktemelding(melding, tekst)` | Bare forfatteren, bare når det kan sendes |
| `slett_direktemelding(melding)` | Begge deltakerne; idempotent |
| `merk_direktesamtale_lest(samtale, til_nr)` | Flytter bare framover |
| `demp_direktesamtale(samtale, dempet)` / `skjul_direktesamtale(samtale)` | Egen status |
| `blokker_bruker(bruker)` / `opphev_blokkering(bruker)` / `mine_blokkeringer()` | Som beskrevet over; blokkeringslista gir profilkortene |
| `marker_chataktivitet()` | Setter `aktiv_til = now() + 2 min` når `vis_aktiv` er på; ellers ingenting. Appen kaller den bare ved faktisk bruk (tastetrykk, klikk, berøring, rulling i en synlig fane), høyst én gang i minuttet, aldri på en tidtaker alene. Prikken forsvinner dermed mellom ett og to minutter etter siste bruk |
| `aktive_motparter()` | ID-ene til samtalepartnerne som er aktive nå etter reglene for aktivitetsstatus; aldri tidspunkter |

Svarkodene følger gruppechatten: `42501` for bryteren og for alt man ikke har
tilgang til eller som ikke finnes (samme tekst), `PT409` når samtalen finnes,
men det ikke kan sendes, `22023` for innholdet og `PT429` for takten.
Meldingsteksten står aldri i en `raise`-tekst, i tilgangsloggen eller i et
varsel.

## Låsing og samtidighet

Planen krever at bryteren og blokkeringen gjelder ved selve sendetidspunktet,
og grensene skal holde også når samme bruker sender fra flere faner samtidig.
Rekkefølgen i `send_direktemelding`:

0. En lås per avsender (`pg_advisory_xact_lock` på avsenderens ID i et eget
   navnerom) før takten telles, så samtidige kall fra samme bruker telles
   etter hverandre, også i ulike samtaler. Først da kontrolleres takten (20 per
   samtale, 60 til sammen). `aapne_direktesamtale` tar samme lås før grensen
   på nye samtaler telles. Låsen tas alltid først, så den ikke kan gi
   vranglås med de andre.
1. `pg_advisory_xact_lock_shared` på samme nøkkel som `intern.las_tilgang`
   tar eksklusivt, så sendingen venter på en samtidig endring av medlemskapene
   og omvendt.
2. Begge deltakernes `chatvalg`-rader med `for share`, i fast rekkefølge
   (`bruker_lav` først), så det ikke kan bli vranglås. `sett_chatvalg` og
   `blokker_bruker` tar sin egen rad med `for update` (og lager den om den
   mangler), så de venter på en sending som pågår, og sendingen på dem.
3. Samtalens rad med `for update`, som i gruppechatten (løpenummeret og
   endringstelleren).
4. Først nå leses medlemskapene, bryterne og blokkeringene.

`aapne_direktesamtale` tar de samme låsene og lager samtalen med `insert … on
conflict do nothing` på paret, så to som starter samtidig, får samme samtale.
D5 skal prøve rekkefølgen mot ekte Postgres (`ektepostgres.ts`) før den
regnes som ferdig.

## Profilene og sanntiden

**Profilkortene.** Leseregelen på `profiles` (`intern.synlige_profiler`)
utvides med «den andre i en direktesamtale jeg er med i», så navn og bilde
står ved meldingene også etter at den andre har slått av eller blokkert.
Søketreffene gis av funksjonen og gjør ingen profil synlig i tabellen.
Profilbildene følger profilen som før.

**Sanntiden.** `direktesamtaler` legges i publikasjonen `supabase_realtime`.
Klienten abonnerer på `INSERT` og `UPDATE`, og radsikkerheten gjør at bare de
to får hendelsen. Hendelsen har bare ID-ene, tellerne og tidspunktene; klienten
henter selv med `direktesamtale_endringer`, som kontrollerer tilgangen på nytt.
Livstegnet (45 sekunder) og gjenoppkoblingen gjenbrukes fra
`src/gruppechat/kontroller.ts`. Ingen andre direktemeldingstabeller legges i
publikasjonen. Aktivitetsprikken bruker ikke Realtime Presence, fordi
rettighetene der leses når kanalen åpnes og ikke trekkes tilbake med en gang;
`aktive_motparter()` hentes hvert minutt mens chatmenyen vises.

## Lagringstiden og ryddingen

`intern.direktemelding_lagringstid()` = `interval '12 months'` (etter
beslutning 2). Som i gruppechatten: sending og lesing rydder i samtalen de
gjelder, funksjonene leser aldri ut en utgått melding (heller ikke når den
samme `klient_id` sendes på nytt før nattjobben har ryddet), endringene sier
hvor fristen går (`frist`), så en samtale som står åpen, fjerner det som har
utgått mens den var åpen, og nattjobben
(`gruppechat-lagringstid.yml`) utvides til å kjøre `intern.rydd_direktemeldinger()`
og kontrollere at ingen utgått melding står igjen. Rapporten har bare antall
og alder. Samtaler uten meldinger og uten aktivitet på 12 måneder slettes med
statusen sin; blokkeringene og valgene står til brukeren endrer dem eller
kontoen slettes.

## De negative testene

Bygd på persongalleriet (`src/__tests__/hjelp/persongalleri.ts`). Samtalen
`K` er mellom `vanligA` og `vanligB` (to fagmiljøer), begge med bryteren på.
**Ingen tilgang** betyr `42501` med samme tekst som for en tilfeldig UUID,
og ingen rader, tall, tidspunkter eller deltakere.

| # | Hvem og hva | Ventet |
| --- | --- | --- |
| T1 | `systemarkitekt`, `arkitektB`, `adminA` (lokal admin for `vanligA`), `dobbeltAB` mot `K` i hver funksjon | Ingen tilgang |
| T2 | Tilfeldig UUID og ID-en til en melding i `K`, som en utenforstående | Samme svar som T1 |
| T3 | Direkte `select`, `insert`, `update`, `delete` som `authenticated` på alle tabellene | Ingen rader, avvist; `direktesamtaler` bare egne rader |
| T4 | Utenforstående abonnerer på `direktesamtaler` | Ingen hendelser; publikasjonen har bare `direktesamtaler` av disse tabellene |
| T5 | `vanligB` slår av | Usøkbar for alle; `vanligA` får `PT409` i `K` med den felles teksten; historikken uendret for begge (antall og tekst); ingenting slettet |
| T6 | `vanligB` slår på igjen | Samme `K`, ingen ny samtale |
| T7 | `vanligA` har selv slått av | Kan verken søke, starte eller sende; kan lese og slette i `K` |
| T8 | `vanligB` blokkerer `vanligA` | `vanligA` får samme svar og tekst som i T5; ingen av dem finner den andre i søket eller ser prikken; `vanligB` kan heller ikke sende; opphevet blokkering gir alt tilbake |
| T9 | Blokkert `vanligA` endrer en melding i `K` | Avvist; sletting av egen melding går |
| T10 | Medlemskapet til `vanligA` avsluttes (`avsluttMedlemskap`) med samme token | Ingen tilgang i alle funksjonene; `vanligB` ser den felles teksten; `vanligA` usøkbar; tilgangen og samtalen kommer tilbake med aktivt medlemskap |
| T11 | `utenMedlemskap` | Ingen tilgang; aldri i søket |
| T12 | `avsluttetA` (aktiv i B) | Kan bruke direktemeldinger som andre aktive |
| T13 | Bytte av arbeidsfagmiljø for `dobbeltAB` | Ingen endring i samtalene eller søket |
| T14 | Slettet konto for `vanligB` | `K` står med «tidligere bruker»; `vanligA` kan lese og slette, ikke sende |
| T15 | Sending til seg selv, til en som ikke finnes, til en usøkbar | Avvist; de to siste med samme svar |
| T16 | Søket | Ikke seg selv, ikke av-brytere, ikke blokkerte (begge veier), ikke uten medlemskap; høyst 20; under to tegn avvist; svaret har bare profilkortets fire felt |
| T17 | Sletting | Begge kan slette alle meldinger, en utenforstående ingen; `tekst` er `null`; teksten finnes ingen steder i databasen etterpå (`hvorStaar` fra krysstesten) |
| T18 | Teksten i varsler, tilgangslogg, feilmeldinger og sanntidshendelser | Finnes ikke; ingen rad i `varsler` for direktemeldinger |
| T19 | Lagringstiden | Melding eldre enn 12 måneder borte fra lesingen og ryddet, også ved ny sending med samme klient-ID; endringene gir fristen; tom, gammel samtale fjernet |
| T20 | Aktivitet: `vis_aktiv` av; på uten samtale; på men blokkert; på med samtale | Usynlig, usynlig, usynlig, synlig; aldri et tidspunkt; raden borte etter fristen og når bryteren slås av |
| T21 | Demping og skjuling | Dempet teller ikke på chatknappen; skjult kommer tilbake ved ny melding; den andre merker ingenting |
| T22 | Bryteren for hele funksjonen av | Alle funksjonene `42501` «Direktemeldingene er ikke slått på.» |
| T23 | Gruppechat | Upåvirket av brytere og blokkeringer |
| T24 | Takten og grensene | `PT429` over 20 i minuttet per samtale, 60 til sammen og 10 nye samtaler i timen |

**Samtidighet** (ekte Postgres):

| # | Hva | Ventet |
| --- | --- | --- |
| S1 | Sending samtidig med at mottakeren slår av | Sendt før, eller avvist; aldri sendt etter |
| S2 | Sending samtidig med blokkering | Som S1 |
| S3 | Sending samtidig med avsluttet medlemskap (hos avsender eller mottaker) | Som S1 |
| S4 | Begge åpner samtale samtidig | Én samtale |
| S5 | Samme `klient_id` samtidig | Én melding |
| S6 | Mange samtidige sendinger fra begge | `nr` og `endring` uten hull eller duplikater |
| S7 | Samme bruker sender samtidig over grensene, i én og i flere samtaler, og åpner mange samtaler samtidig | Aldri mer enn 20 per samtale, 60 til sammen og 10 nye samtaler; resten `PT429` |

**I nettleseren** (det lokale testmiljøet, aldri produksjonen): to brukere
utveksler meldinger i sanntid; avslått og blokkert mottaker gir låst linje
uten at historikken forsvinner; åpen samtale tømmes innen ett minutt når
tilgangen tas; tastatur, skjermleser, mobil, lyst og mørkt tema.

## Rekkefølgen for D5

1. Dette dokumentet slås sammen. Peder har svart på alle fem beslutningene.
2. D4a er slått sammen (chatmenyen og samtalelista D5 bygger på).
3. Databasen og funksjonene, med bryteren av, og testene T1–T24 og S1–S6.
4. Visningen i chatmenyen, og fanen Chat under Konto → Innstillinger med de
   samme bryterne og blokkeringene (`Chatvalg` i
   `src/components/chat/Chatvalg.tsx`). Fanen står bare når
   direktemeldingene er slått på; den bruker direktemeldingene chatmenyen
   har (`direktemeldingene` i `useDirekte.ts`), uten egne kall.
5. Kontroll i nettleseren og ChatGPTs kontroll.
6. Aktiveringsmigrasjonen, når 3–5 er grønne (beslutning 4 er gitt).

## Gjennomføringen

Det D5 bygde, og valgene som ble tatt underveis (alle **Teknisk**):

- **Databasen:** `supabase/migrations/20261118234500_direktemeldinger.sql`.
  Funksjonene står i katalogen som en egen kategori, `direktemelding`
  (`src/__tests__/data/funksjonskontroller.ts`): katalogvakten krever
  `security definer`, et kall til `intern.krev_direktemeldinger(` og ingen
  vei for systemarkitekter eller administratorer. Tabellene står som
  `personlig` i ressurskatalogen.
- **Ryddingen:** `intern.rydd_direktemeldinger()` sletter også samtaler der
  begge kontoene er slettet. Nattjobben (`gruppechat-lagringstid.yml`,
  `src/drift/gruppechatLagringstid.ts`) kjører ryddingen og kontrollen for
  gruppechatten og direktemeldingene etter hverandre, og feiler hvis én av
  dem feiler.
- **Feilkodene:** avslagene bruker `PT409` (det kan ikke sendes nå) og
  `PT429` (takten) i stedet for `55000` og `54000`, fordi API-et
  (PostgREST) gjør de to siste om til HTTP 500, som ser ut som en feil på
  serveren og stopper trafikkvakten i nettleserkontrollene. Med `PTxyz` blir
  svaret HTTP xyz, med samme tekst. Tilgangen er uendret: `42501` gir samme
  svar for det som ikke finnes og det man ikke har tilgang til.
- **Klienten:** kallene i `src/direktemeldinger/kall.ts`, lista, valgene og
  aktivitetsprikken i `useDirekte.ts`, og samtalen med den samme
  kontrolleren og visningen som gruppechatten (`useDirektesamtale.ts`,
  `lagChatkrok`). En sperre (`PT409`) ved sending henter sperren med en gang,
  og endringene (`direktesamtale_endringer`) har med `kan_skrive` og sperren,
  så en åpen samtale låses senest ved neste livstegn.
- **Chatmenyen:** direktesamtalene står i samme liste som gruppechattene,
  nyeste først; «Ny chat» åpner søket (skisse 17); samtalen har den andre
  øverst med en meny for demping, skjuling og blokkering (skisse 18); bryterne
  og «Blokkerte» står nederst i oversikten (skisse 14). Adressen er
  `#/chat/direkte/<samtale-ID>`. Dempede samtaler teller ikke på chatknappen.
  Direktemeldingene gir ingen varsler i bjella.
- **Aktivitetsprikken** hentes hvert minutt mens chatmenyen eller helsiden
  vises og det finnes samtaler. Egen aktivitet merkes bare med «Vis når jeg er
  aktiv» på, ved tastetrykk, trykk eller rulling i en synlig fane, høyst én
  gang i minuttet; prikken slukner to minutter etter siste merking.

## Kjente begrensninger

- **Skjermen hos den andre.** En slettet melding kan stå på den andres skjerm
  til chatten henter endringene, høyst ett minutt med åpen samtale. Det som er
  lest, kopiert eller tatt bilde av, kan ikke kalles tilbake.
- **Fødselsnummerkontrollen** er et sikkerhetsnett, ikke en garanti.
- **Ingen moderering.** Ingen andre kan gripe inn i en samtale (beslutning 1);
  den som opplever noe ubehagelig, blokkerer.
- **Teknisk tilgang til databasen** kan ikke stenges helt med regler i
  databasen; den styres av regelen over og av hvem som har driftsnøklene
  (S4).
- **Behandlingsansvaret** for OUSFAR er ikke avklart ennå (S4 §3.4). Det
  gjelder hele appen og stopper ikke D5, men hendelser i direktemeldinger
  meldes dit når det er avklart.
