# D7: helhetlig kontroll av forsiden, grupper og chat

Den siste delen av D0-planen
([ux-dashboard-chat-navigasjon-plan.md](ux-dashboard-chat-navigasjon-plan.md)
§12): alle aksepttestene gått gjennom etter at D1–D6 er slått sammen, med
direktemeldingene slått på (#472). Kontrollert 19.11.2026.

## Slik er det kontrollert

- **Nettleseren, i det lokale testmiljøet** ([qa-testmiljo.md](qa-testmiljo.md)):
  databasen bygget på nytt fra alle migrasjonene, appen bygget mot den, og bare
  syntetiske kontoer og tekster. Ingenting er kjørt mot produksjonen. Sju
  kontroller, på PC (1440 × 900), nettbrett (820 × 1180) og mobil (390 × 844),
  i lyst og mørkt tema:

  | Kontroll | Punktene | Hva |
  | --- | --- | --- |
  | `helhetnettleser.ts` (ny, D7) | F1–F8, Y1–Y2, N1–N5, G1–G4, R1–R3, U1–U2, X | Forsiden, ytelsen, navigasjonen, gruppene, rettighetene og skjermstørrelsene |
  | `chatmenynettleser.ts` | P1–P9 | Chatmenyen, helsiden og mobil |
  | `chatulestnettleser.ts` | E0–E6 | Uleste i chatten, og at bjella ikke teller dem |
  | `direktemeldingnettleser.ts` | D1–D9 | Direktemeldingene: bryterne, søket, blokkering, mobil |
  | `menynettleser.ts` | M1–M8 | Toppmenyen, hovedmenyen, kontomenyen og Innstillinger |
  | `gruppechatnettleser.ts` | N1–N10 | Gruppechatten med to brukere |
  | `gruppechatsanntid.ts` | 1–2 | Sanntiden og at et fjernet medlem stenges ute |

- **Siste kjøring**: alle sju kontrollene grønne, alle punktene OK, ingen
  svar med 5xx utover det kjente avslaget i funn 3.
- **Enhetstestene** (`npm test`), med navnet på testen der den er beviset.
- **Skjermbildene** ligger i prosjektmappen `d7-kontroll/`, ett underkatalog per
  kontroll. Navnet sier hva, skjermen og temaet (`-moerkt`).

Kontoene i `helhetnettleser.ts`: Ada er med i to fagmiljøer og i en gruppe på
tvers, en arkivert gruppe og en invitasjon; Bo er med i ett fagmiljø og i
gruppen på tvers; Cy er ikke med i noen av gruppene.

## Resultat per aksepttest

«OK» betyr at aksepttesten er oppfylt og bevist med det som står i kolonnen.
Punktkodene viser til kontrollene over (`helhetnettleser.ts` med mindre en
annen er nevnt).

### Dashboard og fagmiljø

| Aksepttest | Resultat | Bevis |
| --- | --- | --- |
| Innlogging uten dyp lenke åpner `#/` med riktig fagmiljønavn, ikke fortolkningen | OK, etter rettelse 1 | F1 (navnet etter 50 ms, fokus på «Åpne fortolkning»); `forsidevisning.test.tsx` › «henter ingenting før rettighetene er kjent …» |
| «Åpne fortolkning» virker med ett klikk, uten å vente på panelene | OK | Y1: med alle panelene holdt tilbake i 8 s står knappen etter 0,5 s og søket etter 0,8 s, uten tunge kall; Y2: hvert panel hentes én gang, 22 kall i alt ved oppstart (rettelse 1); `forsidevisning.test.tsx` › «har fokus på «Åpne fortolkning», som virker før panelene er hentet» |
| Standard: hero og høyst fire kompakte paneler med høyst tre hendelser | OK | F2; skjermbilde `01-forside-pc` |
| Skjule, vise og flytte paneler; valget følger kontoen til ny pålogging og ny maskin | OK | F4 (ny nettleserkontekst for samme konto viser samme rekkefølge; «Gjenopprett standard»); `forsidemoduler.test.ts` |
| Fagmiljøvalget er skjult med ett valg, viser de tillatte ved flere, og bytter fortolkningsdata | OK | F6, F7; `forsidevisning.test.tsx` › «viser de fire standardpanelene …, uten pil når det bare er ett valg»; `arbeidsfagmiljovalg.test.tsx`; `fortolkningPerFagmiljo.test.ts` |
| Fagmiljøbytte viser ikke gamle lokale data mens det nye hentes; grupper på tvers blir | OK | F6 (panelene holdt tilbake under byttet: ingen av de gamle hendelsene vises, gruppen på tvers står etterpå); `forsidevisning.test.tsx` › «viser aldri det forrige fagmiljøets innhold etter et bytte»; `forside.test.ts` › «tar bare med det lokale fra fagmiljøet …» |
| En feil i ett panel lar resten virke, med «Prøv igjen» for det | OK | F5 (bare «Mine grupper» feiler; «Prøv igjen» henter bare det); skjermbilde `04-panelfeil-pc` |
| Kritiske varsler når bjella når «Viktig nytt» er slått av | OK | F8 (samme antall uleste i bjella med panelet av) |

### Navigasjon

| Aksepttest | Resultat | Bevis |
| --- | --- | --- |
| `#/fortolkning` åpner søket, og ekstra Escape i søket sender ikke til `#/` | OK | N1 (tre ekstra Escape: adressen står); `navigasjon.test.tsx` › «stopper Escape i søket: feltet tømmes, men søket står» |
| Escape går gjennom valgene i en fortolkning uten å endre klinisk output eller snarveier | OK | N1; `fortolkningUendret.test.ts`, `thcMotor.test.ts` og de øvrige testene av fortolkningen er grønne og uendret |
| Synlig knapp fra søket til forsiden | OK | N1 («Til forsiden»); `navigasjon.test.tsx` › «går fra forsiden til søket og tilbake med knappene» |
| Tilbake/fram på tvers av forside, søk, fortolkning, fagsider, grupper og chat | OK | N3: `#/` → `#/fortolkning` → `#/fortolkning/cital` → `#/grupper` → gruppen → `#/chat/gruppe/…`, alle tilbake og fram; fagsidene i `navigasjon.test.tsx` › «følger nettleserens tilbake fra en stoffside …» |
| Lukking går tilbake dit brukeren kom fra; direkte lenke gir trygg reserve | OK | N4 (fra forsiden tilbake til forsiden; direkte lenke til en gruppe gir gruppeoversikten, til registeret gir forsiden); F3; `gruppeflate.test.tsx` › «er siden flaten ble åpnet fra, ellers gruppen» |
| Gamle analytt-, idé-, diskusjons-, stoff- og gruppechatlenker virker | OK | N5 (`#/analytt/CITAL`, `#/grupper/<id>/chat`, `#/ide/<id>`, ukjent adresse); E3–E4 (`chatulestnettleser.ts`); `navigasjon.test.tsx` › «gamle adresser etter analyttkoden»; `direktelenker.test.tsx` |
| Escape i et vindu eller chatmenyen gjør ikke noe samtidig i fortolkningen | OK, etter rettelse 2 | N2 (hovedmenyen og chatmenyen over en åpen analytt); M2–M3 (`menynettleser.ts`); `lagstakk.test.tsx`; `chatmeny.test.tsx` › «åpnet med pekeren: … Escape ikke når siden bak (D7)» |

### Grupper og aktivitet

| Aksepttest | Resultat | Bevis |
| --- | --- | --- |
| `#/grupper`: kompakt liste, invitasjoner og «Opprett gruppe» som vindu | OK | G1 (invitasjonen øverst, kompakt liste; Ada kan ikke opprette grupper, så knappen står ikke der); `grupperside.test.tsx` › «oppretter en ny gruppe i en modal …» |
| Gruppesiden har ingen fanerad | OK | G2; `grupperside.test.tsx` › «har ingen faner, men overskriften, beskrivelsen, medlemslinjen og panelene» |
| Høyst tre i «Siste aktivitet», og korte paneler | OK | G2 (chat, oppgave og idé, i den rekkefølgen de skjedde) |
| Et aktivitetsklikk åpner riktig idé, oppgave, kommentar eller chat | OK | G3 (riktig idé i arbeidsflaten), F3 (riktig oppgave fra forsiden); `grupperside.test.tsx` › «fører hver rad til selve hendelsen» |
| Gruppeidéer og -oppgaver er merket med gruppen og kan deles med direktelenke; felles idéer er adskilt | OK | G3 og N5 (dialogen heter «Idéer for <gruppe>»; `#/ide/<id>` åpner den); `grupperside.test.tsx` › «leser og skriver fanene i gruppen, med én idé eller oppgave …» |
| Kompakt medlemsliste; full liste og administrasjon i eget vindu | OK | G2; `grupperside.test.tsx` › «viser medlemmene, de inviterte og hvem som er uten tilgang nå, i modalen» |
| Arkiverte grupper og manglende rettigheter respekteres også i oppsummeringene | OK | G4 (medlemmet ser ikke den arkiverte gruppen, heller ikke på forsiden; systemarkitekten ser den i lesemodus); R1 (en som ikke er med, ser verken siden, idéen, oppgaven, chatten eller navnet); `forside.test.ts` › «viser ikke en arkivert gruppe, heller ikke for systemarkitekten», «viser ikke varsler fra en gruppe brukeren er fjernet fra» |
| Ulagret tekst i arbeidsflaten gir advarsel | OK | G3 («Du har endringer som ikke er lagret.»; «Forkast» fullfører lukkingen); `gruppeflate.test.tsx` › «stopper nettleserens tilbake og spør …» |

### Chat

| Aksepttest | Resultat | Bevis |
| --- | --- | --- |
| Chatmenyen ved venstre kant, med grupper og samtaler, og kan endres i bredden | OK | P2 (`chatmenynettleser.ts`); håndtaket er det felles `Kanthandtak` (`kanthandtak.test.tsx`) |
| «Utvid» gir `#/chat`; «Gjenopprett» beholder samtalen og forrige side | OK | P4; N3; `chatmeny.test.tsx` › «utvider til #/chat med samme samtale og utkast, og gjenoppretter …» |
| Gruppechatten er borte fra gruppesiden, men alt virker i chatmenyen | OK | E2 (`chatulestnettleser.ts`); N1–N10 (`gruppechatnettleser.ts`); `chatmeny.test.tsx` › «har alt chatfanen på gruppesiden hadde» |
| Samtalelista nyeste først, med riktig ulestmerke uten tekstutdrag på knappen | OK | P1–P2; E1, E5 |
| Å åpne bare oversikten merker ikke meldingene lest | OK | P2; E2 |
| Chataktivitet øker ikke bjella | OK | R2; E1, E5; `gruppechatsanntid.ts` |
| `Tillat direktemeldinger = Av`: ikke søkbar, og ingen nye meldinger, også i gammel samtale | OK | D2, D4 (`direktemeldingnettleser.ts`); `direktemeldinger.test.ts` |
| Bryteren av: tidligere samtaler kan leses, ingenting slettes | OK | D4 |
| Bryteren på igjen: samme samtale fortsetter; gruppechatten påvirkes ikke | OK | D4; `direktemeldinger.test.ts` |
| Bare deltakerne leser en direktesamtale; ingen metadata for andre | OK | R1 (`#/chat/direkte/<tilfeldig id>` viser ingenting); `direktemeldinger.test.ts` (T1–T24) |
| «Vis når jeg er aktiv» er eget valg, av fra starten, uten «sist sett» | OK | D1, D6 |
| Blokkering hindrer sending på serveren; demping hindrer varsling | OK | D5; `chatmeny.test.tsx` › «en dempet samtale teller ikke på boblen»; `direktemeldinger.test.ts` |
| Fjernet medlem eller tapt tilgang stenger samtalen | OK | P9 (42 s); D8 (12 s); N3–N4 i `gruppechatnettleser.ts` (45 s, grensen er 60 s); E6; `gruppechatsanntid.ts` (2) |

### Kvalitet og personvern

| Aksepttest | Resultat | Bevis |
| --- | --- | --- |
| Hovedflytene med tastatur og skjermleser, også på smal mobil | OK, med forbehold (se under) | N1–N4 og G3 er kjørt med tastaturet; U2 (mobil og nettbrett: én kolonne, ingen siderulling, «Åpne fortolkning» 48 px høy); P8, D7, M8; kontrollene finner elementene på rolle og navn |
| Ingen uendelige lister, permanente animasjoner eller flere likeverdige primærknapper | OK | F2, G2 (høyst tre rader per panel); skjermbildene `01-forside-pc`, `11-gruppeside-pc`, `19-*`, `20-*` |
| Ingen data fra et annet fagmiljø eller en privat gruppe lekker | OK | R1 (Cy ser ingen gruppenavn, idé, oppgave eller chat); F6; G4; `forside.test.ts` › «tar bare med det lokale …», «viser ikke et varsel fra et fagmiljø brukeren ikke lenger er med i» |
| Direktemeldingene har dokumentert personvern- og slettevurdering før aktivering | OK | [direktemeldinger-personvern.md](direktemeldinger-personvern.md), med Peders ja til de fem beslutningene 18.11.2026; aktiveringen er #472 |
| Fortolkningsregler, kliniske tekster, kildegrunnlag og verktøyene er uendret | OK | Ingen kliniske filer er endret i D7; `fortolkningUendret.test.ts` › «gir nøyaktig den samme kliniske outputen som før» og `thcMotor.test.ts` er grønne |
| Ingen svar med 5xx under kontrollen | OK, med ett kjent avvik | X: bare det kjente avslaget fra `gruppeoversikt` (funn 3, issue #470) |

## Funn

### Rettet i denne PR-en

1. **Forsiden hentet panelene to ganger ved oppstart, og viste «OUSFAR» et
   øyeblikk.** Panelene hentet før rettighetene var kjent, uten fagmiljø, og så
   en gang til med fagmiljøet: åtte kall i stedet for fire, og overskriften
   blinket. Nå venter panelene og overskriften til fagmiljøet er kjent
   (`useArbeidskontekst` i `src/auth/rettigheter.tsx`). Y2 teller fire kall;
   testen `forsidevisning.test.tsx` › «henter ingenting før rettighetene er
   kjent, og så hvert panel én gang (D7)» feiler uten rettelsen.
2. **Escape i chatmenyen nådde fortolkningen bak.** Ble menyen åpnet med musen,
   flyttet appen fokus inn i den, men menyen regnet seg ikke som et lag (det
   gjorde den bare for tastatur og felt). Escape gikk da videre og tok
   fortolkningen et steg tilbake. Nå er fokus appen selv setter i menyen, et
   lag: Escape slipper fokus og menyen blir stående, som
   [flyt.md](design/d0-dashboard-chat/flyt.md) §4 sier. Testen
   `chatmeny.test.tsx` › «åpnet med pekeren …» feiler uten rettelsen.

### Rettet i kontrollverktøyene

- `chatulestnettleser.ts` slo gruppechatten **av** etter kjøringen, selv om den
  er på i migrasjonene. Den bruker nå `slaPaFunksjoner()`, som de andre
  chatkontrollene fikk i #472.
- `chatmenynettleser.ts` og `chatulestnettleser.ts` lukket ikke en chatmeny som
  stod åpen fra en tidligere kjøring: boblen står inne i menyen, og de så på
  feil element. Begge bruker nå `lukkChatmenyen()` i `kontroll.ts`.
- `gruppechatnettleser.ts` ventet på en melding fra Realtime som bare kommer
  ved en kald start, og feilet når en annen kontroll hadde kjørt først. Den
  teller nå abonnementene i databasen, som `gruppechatsanntid.ts` gjør
  (`chatabonnementer()` i `kontroll.ts`).
- Kontrollene deler kontoene `qa-chat-ada` og `qa-chat-bo`, og gruppene en
  kontroll lot stå, telte med blant de uleste i den neste. Hver kontroll
  arkiverer nå sine gamle syntetiske grupper først
  (`arkiverTidligereGrupper()`).
- `gruppechatnettleser.ts` ble stoppet av testmiljøet når Bo var fjernet fra
  gruppen og gruppesiden fikk avslaget som HTTP 500 (funn 3). Den gir nå de
  kjente avslagene videre som 409, som `helhetnettleser.ts`, og fører dem
  opp i et eget punkt X (`lagAvslagsvakt()` i `kontroll.ts`). N10 lukker
  chatmenyen på lista før meldingen sendes, så den ikke leses med en gang.
- Testmiljøet sier nå hvilket kall som svarte 5xx når det stopper
  (`trafikkvakt.ts`).
- **Appen i testmiljøet ble bygget i utviklingsutgaven.** `vite-node` setter
  `NODE_ENV=development`, og byggingen arvet det. Da monterer Reacts
  `StrictMode` alt to ganger, og av og til ble alt hentet dobbelt ved
  oppstart (Y2 så 8 kall i stedet for 4). Appen bygges nå med
  `NODE_ENV=production`, som i produksjonen (`lokalmiljo.ts`). Alle tallene i
  denne rapporten er fra produksjonsbygget; oppstarten av forsiden gjør 22
  kall mot databasen, mot 34–37 med utviklingsutgaven.

### Ikke rettet her

3. **Et avslag fra databasen kommer som HTTP 500.** `gruppeoversikt` avviser en
   gruppe brukeren ikke kan lese, med `P0002`, og PostgREST gjør det til 500.
   Brukeren ser riktig tekst («Gruppen finnes ikke, eller du har ikke tilgang
   til den.»), men svaret ser ut som en serverfeil i loggene og stopper
   testmiljøets trafikkvakt. Det er samme slags feil som issue #470 (54000 og
   55000), og P0002 brukes på rundt 45 steder i 17 migrasjoner. Rettelsen hører
   til #470: avslagene bør få en kode PostgREST gir som 4xx. Kontrollene
   godtar foreløpig nettopp disse kodene og fører dem opp (X i
   `helhetnettleser.ts` og `gruppechatnettleser.ts`).
4. **Escape tidlig på en side som lastes første gang.** Trykkes Escape før en
   side som gruppeoversikten er lastet (de lastes ved første besøk), skjer
   ingenting. Det er sjeldent og ufarlig: neste trykk virker. Ikke rettet.

## Det som ikke er kontrollert her

- **Fagsidene i nettleseren.** Den lokale databasen har ingen publiserte
  fagsider, så «Oppdaterte fagsider», lenkene til fagsidene og gamle
  stofflenker er kontrollert med enhetstestene (`forside.test.ts`,
  `navigasjon.test.tsx` › «adressene» og «forsiden og veien tilbake»).
- **Skjermleser** er kontrollert gjennom rollene og navnene kontrollene finner
  elementene på (regioner, overskrifter, knapper, dialoger, logg), ikke med en
  ekte skjermleser.
