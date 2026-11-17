# Pasientopplysninger i OUSFAR

Leses før noe som tar imot, lagrer, viser eller sender tekst eller filer fra
brukerne endres, og når pasientopplysninger er lagt inn ved en feil.
Gruppechatten har sin egen vurdering i
[gruppechat-personvern.md](gruppechat-personvern.md), som bygger på denne.

## Regelen

**Pasientopplysninger er ikke tillatt noe sted i OUSFAR** (Peder, 17.11.2026).
Det er en varig regel for hele appen.

- Ingen identifiserbare eller pseudonymiserte pasientopplysninger skal lagres
  eller deles: ikke navn, fødselsnummer, fødselsdato, adresse, prøvenummer,
  journalnummer eller andre kjennetegn, og heller ikke opplysninger om en
  person der kjennetegnene er tatt bort eller byttet ut.
- Forbudet gjelder også **kliniske kasuistikker som kan knyttes til
  enkeltpersoner**, for eksempel en sjelden kombinasjon av alder, diagnose,
  legemidler, prøvesvar og datoer.
- Det gjelder overalt der brukerne kan legge inn eller overføre noe: chat,
  diskusjoner, kommentarer og idéer, filer, vedlegg og dokumenter,
  endringsforslag og andre fritekstfelt, og det appen lager av dem: logger,
  varsler, søk, eksport og tjenester utenfor OUSFAR.
- Faglige spørsmål drøftes generelt: «en pasient i 70-årene på flere
  serotonerge legemidler» er ofte for mye sammen med et prøvesvar og en dato;
  skriv om det som et generelt spørsmål.

For repoet og GitHub gjelder den eldre regelen i `AGENTS.md` i tillegg: bare
syntetiske testdata, og ingen gyldige fødselsnumre i filene (testene lager
dem selv, se `src/__tests__/p7grunnmur.test.ts`).

## Den brukerrettede teksten

Tekstene står ett sted, i `PASIENTREGEL` (`supabase/functions/_delt/pasientopplysninger.ts`,
importert som `@delt/pasientopplysninger`), og brukes uendret i appen og
databasen:

| Nøkkel | Tekst | Brukes |
| --- | --- | --- |
| `kort` | «Ikke skriv pasientopplysninger, heller ikke uten navn eller som kasuistikk som kan knyttes til en person.» | Ved skrivefelt og opplasting (`Pasientregel`) |
| `advarsel` | «Dette ligner et fødselsnummer. Fjern det før du sender: pasientopplysninger er ikke tillatt i OUSFAR.» | Mens teksten i et felt ligner et fødselsnummer (`Pasientvarsel`) |
| `avvist` | «Teksten ser ut til å inneholde et fødselsnummer. Pasientopplysninger er ikke tillatt i OUSFAR.» | Avslaget fra databasen (`intern.krev_uten_personnummer`) |

Komponentene står i `src/components/Pasientregel.tsx`: `Pasientregel` er den
korte regelen, dempet under feltet og knyttet til det med
`aria-describedby`; `Pasientvarsel` sier fra med en gang (`role="alert"`) og
viser ingenting uten treff. Nye flater bruker dem i stedet for egne tekster.

Ved skrivefeltene som fantes før P7, setter `usePasientvakt`
(`src/hooks/usePasientvakt.tsx`) de to sammen og knytter dem til feltet;
`Rikteksteditor` og `Tekstomrade` (endringsforslagene) har den bak propen
`pasientregel`. En test (`pasientpaaminnelse.test.tsx`) holder hvert
skrivefelt i samhandlingen og endringsforslagene på den, og passer på at ingen
komponent har en egen tekst om pasientopplysninger.

## De tekniske kontrollene

**Hva de gjør.** Én kontroll, i to like utgaver: `intern.ligner_personnummer`
i databasen og `lignerPersonnummer` i appen, holdt like av
`src/__tests__/p7grunnmur.test.ts`. Den kjenner igjen et norsk fødsels-, D-
eller H-nummer med gyldige kontrollsifre, også med mellomrom, punktum eller
bindestrek etter de seks første sifrene. Appen advarer mens brukeren skriver;
databasen avviser teksten (`22023`) der kontrollen er slått på.

**Hva de ikke gjør.** Kontrollen er et **sikkerhetsnett for åpenbare feil,
ikke en garanti**. Den finner ikke navn, fødselsdatoer, prøvenumre, sjeldne
diagnoser eller kasuistikker, og den kan ikke vite om en tekst handler om en
person. Den kan også, sjelden, slå til på et 11-sifret tall som ikke er et
fødselsnummer; da må brukeren skrive tallet annerledes. Ansvaret ligger hos
den som skriver, og påminnelsen ved feltet er hovedtiltaket.

**Hvor databasen avviser i dag.** Gruppechatten (P7 tråd A). For de eldre
flatene er det foreslått i [Kartleggingen](#kartleggingen-av-inndataflatene).

**Ingen ekstern innholdskontroll.** Ingen tekst eller fil sendes til en
tjeneste utenfor OUSFAR (AI-baserte eller andre) for å bli kontrollert. Det
krever en egen vurdering av personvernet og Peders ja før det eventuelt
innføres.

## Tjenester utenfor OUSFAR

Det brukerne skriver, ligger hos disse, og ingen andre:

| Tjeneste | Hva den har av brukernes innhold |
| --- | --- |
| Supabase (EU, Stockholm) | Databasen, innloggingen, profilbildene og sanntiden. Sanntiden bærer bare at noe er endret (gruppechatten), aldri tekst |
| Vercel (EU, Stockholm) | Leverer appen og kjører synkene av offentlige legemiddeldata. Brukernes tekst går rett fra nettleseren til Supabase, ikke gjennom Vercel |
| Språkmodellene agentene kjører på (Claude, ChatGPT) | Kurateringen leser fagsidene og kurateringens kommentarer. De **planlagte oppgavene** leses av Claude når en systemarkitekt kjører `/utfor-oppgaver`: overskriften og prompten, som ofte kommer fra en idé. Ingen agent leser diskusjonene, idékommentarene, gruppene eller chatten |
| GitHub (offentlig) | Koden og dokumentasjonen. Ingen brukertekst; arbeidet med en planlagt oppgave kan sitere den i en PR, og da gjelder regelen fullt ut |

Ingen e-post, push-varsler, analyseverktøy eller feilrapportering sender
innhold ut av appen.

## Kartleggingen av inndataflatene

Status 17.11.2026, fra koden på `main` og P7.0. «Påminnelse» er det brukeren
ser ved feltet i dag. «Fjerne» er hvem som kan fjerne teksten helt i appen,
uten hjelp fra en utvikler. Tiltakene i D2 (regelen og advarselen ved feltet) er gjort uten å bygge om skjemaene;
resten foreslås som egne oppgaver.

### Samhandlingen (alle eller mange leser)

| Flate | Lagres | Påminnelse i dag | Fjerne i appen | Tiltak |
| --- | --- | --- | --- | --- |
| Diskusjoner: overskrift og første innlegg | `diskusjoner` | Regel og advarsel (D2) | Forfatteren endrer; moderator skjuler og «Fjern for godt»; moderator sletter tråden. Arkivert tråd må hentes tilbake først | Databasekontroll (forslag) |
| Diskusjonskommentarer | `diskusjonskommentarer`; skjult tekst i `diskusjon_skjulte_tekster` til «Fjern for godt» | Regel og advarsel (D2) | Forfatteren endrer eller sletter; moderator skjuler og fjerner for godt | Databasekontroll (forslag) |
| Idéer (felles) og idékommentarer | `ideer`, `idekommentarer` | Regel og advarsel (D2) | Forfatteren eller en systemarkitekt sletter; kommentar med svar står som «Slettet» uten tekst. En idé **overført** til planlagte oppgaver kan ingen slette (K1) | Databasekontroll (forslag) |
| Planlagte oppgaver (fra idéer) | `oppgaver` (overskrift, prompt) | Prompten: regel og advarsel (D2) | Systemarkitektene endrer prompten | Prompten leses av en språkmodell (se [Tjenester utenfor OUSFAR](#tjenester-utenfor-ousfar)); se over den før den merkes klar |
| Gruppeidéer, -kommentarer og -oppgaver | `ideer` (med `gruppe_id`), `idekommentarer`, `gruppeoppgaver` | Regel og advarsel (D2) | Forfatteren, gruppens moderatorer og ansvarlige, systemarkitektene. I en **arkivert** gruppe er alt frosset (K2) | Databasekontroll (forslag) |
| Gruppens navn og beskrivelse | `grupper`, og en kopi i `tilgangslogg` ved hver endring | Beskrivelsen: regel og advarsel (D2) | De ansvarlige endrer; kopien i tilgangsloggen kan ikke fjernes i appen (K3) | Databasekontroll (forslag) |
| Gruppechatten (P7, avslått) | `gruppemeldinger` | `Pasientregel` og `Pasientvarsel` (tråd B) | Forfatteren og moderatorene sletter, i en arkivert gruppe en systemarkitekt; teksten fjernes med en gang | Databasen avviser fødselsnumre (tråd A) |
| Endringsforslag, svar og kommentarer i tidslinjen | `endringsforslag`, `endringsforslag_hendelser` | Regel og advarsel (D2) | Ingen; forslag kan trekkes, men ikke slettes (K4) | Databasekontroll (forslag) |
| Profil: navn og bilde | `profiles`, bøtta `avatarer` | Nei | Brukeren selv | Ingen; lav risiko |

### Fagstoff og administrasjon (redaktører, administratorer, systemarkitekter)

| Flate | Lagres | Påminnelse i dag | Fjerne i appen | Tiltak |
| --- | --- | --- | --- | --- |
| Fagsidene (riktekst) og fortolkningens kommentartekster og regler | Gjeldende innhold og alle revisjoner (`objektrevisjoner`, `sideversjoner`) | Nei | En ny revisjon erstatter teksten, men historikken er låst mot endring og sletting (K5) | Ingen påminnelse: tekstene er faglige maler. Hendelser etter rutinen under |
| Kurateringens kommentarer | `kuratering.kommentarer` (låst mot endring og sletting) | Nei | Ingen (K5) | Ingen; bare systemarkitektene og agentene |
| Fagsaker: merknad til valget | `kildefunn` og hendelsene i `kildefunn_hendelser` | Nei | Systemarkitektene endrer valget; hendelsene står | Ingen; faglig, bare systemarkitektene |
| Verktøysperrer: grunn | `verktoysperrer` (vises for alle brukere av verktøyet) | Nei | Systemarkitektene endrer | Ingen; kort administrativ tekst |
| Kontosperring, medlemskap og roller: grunn | `tilgangslogg` (låst) | Nei | Ingen (K3) | Ingen; skal ikke inneholde noe om pasienter |

### Fortolkningen og verktøyene

**Fortolkningen tar imot opplysninger om én pasients prøve, men lagrer eller
deler dem ikke.** Kartlagt i `App.tsx`, `ThcStep.tsx`, `ThcSkjema.tsx`,
`RusStep.tsx`, `Rusvalg.tsx`, `SearchStep.tsx`, `PasteStep.tsx` og
`src/oppdatering/bevaring.ts`:

- **Hva som skrives inn:** analytt, konsentrasjoner og, for THC-syre,
  prøvedatoer for den aktuelle og tidligere prøver. Ingen navn, fødselsnummer
  eller prøvenummer, og ingen fritekst.
- **Hvor det står:** bare i nettleserens minne mens fortolkningen er åpen.
  Ingenting sendes til databasen, til loggene eller til andre tjenester, og
  ingenting gir varsler.
- **Lokal lagring:** når appen oppdateres til en ny versjon, legges det
  brukeren holder på med, også fortolkningen, et øyeblikk i fanens
  `sessionStorage` (`useBevart`) og hentes tilbake etter omlastingen. Bildet
  hører til den innloggede, leses én gang og slettes med en gang, og brukes
  ikke etter fem minutter. `localStorage` brukes bare til innstillinger.
- **Utklippstavlen:** kommentaren kopieres for å limes inn i
  laboratoriesystemet. Det er standardteksten for valget, ikke det brukeren
  skrev inn.

Verktøyene i verktøymenyen (eid av OUSFAR Verktøy) er lagt opp på samme måte:
dosene og svarene står i nettleseren og sendes ikke til databasen.

**Konflikt med forbudet:** ingen. Verdiene er ikke identifiserbare alene,
lagres ikke og deles ikke. Fortolkningen må fortsatt ikke få fritekstfelt,
lagring av inndata, deling eller logging av inndata uten en ny vurdering
etter denne regelen. Ingen kliniske regler eller resultater er endret.

### Konflikter med dagens funksjonalitet

Steder der en tekst med pasientopplysninger **ikke kan fjernes helt i appen**
i dag. Ingen av dem endres som del av P7; de foreslås som egne oppgaver, og
inntil da fjernes teksten etter [rutinen](#håndteringen-av-en-hendelse) med en
målrettet datamigrasjon.

| | Hva | Hvorfor | Forslag |
| --- | --- | --- | --- |
| K1 | En felles idé som er overført til de planlagte oppgavene, kan ingen slette | Idéen er låst for å bevare sporet til oppgaven | La systemarkitektene fjerne teksten i en overført idé (tom tekst, merket fjernet) |
| K2 | I en arkivert gruppe er idéene, kommentarene og oppgavene frosset, også for moderatorene og systemarkitektene (chatmeldingene kan systemarkitektene slette). Det som går i dag: en systemarkitekt åpner gruppen igjen, sletter og arkiverer den på nytt, men da kan medlemmene lese gruppen imens | Arkivet skal stå urørt | La systemarkitektene slette en idé, kommentar eller oppgave også i en arkivert gruppe, som for chatten |
| K3 | Tilgangsloggen tar en kopi av gruppens navn og beskrivelse ved hver endring, og kan ikke endres | Loggen er låst for å være til å stole på | La loggen lagre om beskrivelsen ble endret, ikke selve teksten |
| K4 | Endringsforslag og tidslinjen deres kan ikke slettes | Historikken skal stå | La systemarkitektene fjerne teksten i et forslag eller en hendelse, med merknad |
| K5 | Revisjonene av fagsidene og fortolkningen, og kurateringens kommentarer, kan ikke endres eller slettes | Historikken er låst for sporbarheten | Fjerne bare den aktuelle teksten i den aktuelle revisjonen ved en hendelse, med en migrasjon som slår av låsen i transaksjonen og setter den på igjen |

## Håndteringen av en hendelse

En hendelse er at pasientopplysninger er lagt inn eller delt i OUSFAR, eller
at noen mistenker det. Målet er å fjerne opplysningene raskt fra alle steder
OUSFAR har dem, uten å spre dem videre.

**1. Meld fra uten å gjenta opplysningene.** Den som ser det, sier fra til en
moderator i rommet eller en systemarkitekt, med lenke til stedet, ikke med en
kopi av teksten. Ingen tar skjermbilde, siterer eller videresender.

**2. Fjern teksten der den står**, med en gang, den som kan (se tabellene
over):

| Hvor | Hvem | Hvordan |
| --- | --- | --- |
| Gruppechatten | Forfatteren eller en moderator; i en arkivert gruppe en systemarkitekt | Slett meldingen. Teksten fjernes i databasen med en gang; den gamle teksten fra en endring lagres ikke |
| Diskusjonene | Forfatteren; ellers en moderator | Forfatteren sletter eller endrer. En moderator skjuler og velger «Fjern for godt», så kopien i `diskusjon_skjulte_tekster` også går; en arkivert tråd hentes tilbake først |
| Idéene og kommentarene | Forfatteren eller en systemarkitekt; i en gruppe også moderatorene og de ansvarlige | Slett. En kommentar med svar mister teksten og står som «Slettet» |
| Gruppens beskrivelse | De ansvarlige | Endre beskrivelsen; kopien i tilgangsloggen fjernes som under (K3) |
| Fagsidene og fortolkningen | Redaktøren eller en systemarkitekt | Publiser en rettet versjon med en gang; den gamle revisjonen fjernes som under (K5) |
| Alt i tabellen [Konflikter](#konflikter-med-dagens-funksjonalitet) | En systemarkitekt ber Claude (OUSFAR Dev) | En målrettet datamigrasjon som fjerner bare den aktuelle teksten, uten å gjenta den i repoet (migrasjonen finner raden etter ID og setter teksten tom) |

En datamigrasjon som fjerner noe fra en låst historikk, krever Peders ja,
som andre migrasjoner med risiko for tap av data (`AGENTS.md`).

**3. Det som følger med av seg selv:**

- **Varslene** lagrer bare ID-er, aldri tekst; navnene slås opp når varslene
  leses. Når teksten er fjernet, viser varslene den ikke lenger. En slettet
  idé eller kommentar forsvinner fra varslene.
- **Søket** leser tekstene der de står, når det søkes (diskusjonene) eller fra
  det appen har hentet; det finnes ingen egen søkeindeks. Fjernet tekst er
  borte fra søket ved neste henting.
- **Sanntiden** (gruppechatten) bærer aldri tekst.
- **Nettleserne** som hadde siden åpen, kan vise den gamle teksten til de
  henter på nytt. Gruppechatten henter endringene selv innen ett minutt.

**4. Kopiene utenfor databasen:**

- **Sikkerhetskopier:** Supabases gratisplan tar ingen daglige kopier. OUSFARs
  egne krypterte kopier ([drift-gjenoppretting.md](drift-gjenoppretting.md))
  er ikke satt i drift ennå. Når de er det, lever en kopi så lenge
  lagringsregelen for kopiene sier (avgjøres med tiltak 3); en tekst som er
  fjernet, finnes i kopiene til de er utløpt, og må fjernes på nytt om en kopi
  blir gjenopprettet.
- **Logger:** appen skriver ikke brukernes tekst i loggene. Supabase og
  Vercel har egne logger med kort oppbevaring på gratisplanene; de har
  forespørslene, ikke innholdet i innsendte skjemaer.
- **Lenker til filer:** profilbildene vises med signerte lenker fra Supabase.
  En slik lenke kan ikke trekkes tilbake og kan være mellomlagret til den
  utløper. Planen for fildelingen i gruppene (P8, [#439](https://github.com/peohol/ousfar/pull/439)) bruker
  derfor ingen signerte lenker.
- **GitHub og repoet:** ingen brukertekst skal dit. Har teksten likevel kommet
  dit (for eksempel i en oppgave eller en PR), fjernes den der, og GitHubs
  støtte bes om å fjerne den fra historikken.

**5. Hvem som varsles:** Peder (som eier av OUSFAR), forfatteren, og den som
er behandlingsansvarlig for OUSFAR når det er avklart (S4, `docs/s4-pilotplan.md`
§3.4). Den som la inn opplysningene, melder avvik etter rutinene i egen
virksomhet.

**6. Hva som noteres:** dato, hvilken flate, hvilke ID-er, hvem som fjernet,
hvilke kopier som er håndtert, og om det er meldt avvik. **Aldri
opplysningene selv**, og ikke i repoet eller GitHub, som er offentlige. Hvor
notatene føres, avgjøres sammen med behandlingsansvaret.

## Det som gjenstår å avgjøre

Ingen av disse stopper P7; de gjelder hele appen.

1. Hvor hendelsene noteres, og hvem som er behandlingsansvarlig (S4 §3.4).
2. Om Peder vil gi et varig ja til målrettede datamigrasjoner som fjerner
   pasientopplysninger fra de låste historikkene (K1–K5), slik at det kan
   gjøres samme dag uten å vente på et eget ja hver gang. Anbefalt: ja, med
   krav om at hver slik migrasjon bare fjerner tekst i navngitte rader og
   beskrives uten opplysningene.
3. Om konfliktene K1–K5 skal løses i appen (forslagene i tabellen), og i
   hvilken rekkefølge.
