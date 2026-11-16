# Testplan for P5: redaktøransvar og endringsforslag

Tråd D i P5 ([#416](https://github.com/peohol/ousfar/issues/416)). Planen
prøver det kontrakten i [redaktorer-og-forslag.md](redaktorer-og-forslag.md)
lover: at brukerflytene henger sammen, at ingen ser eller endrer mer enn
rekkevidden gir, at to som gjør noe samtidig ikke ødelegger for hverandre, at
de nye flatene kan brukes med tastatur, skjermleser og på smal skjerm, og at
klinisk output, publisert innhold, kurateringen og den vanlige redigeringen er
uendret.

Dokumentet har tre deler: planen (avsnitt 1–7), fordelingen mellom trådene
(avsnitt 8) og rapporten fra sluttkontrollen (avsnitt 9), som fylles ut når
A–C er integrert. Planen endrer ikke kontrakten. Der den forutsetter noe
kontrakten ikke sier, står det under [Åpne spørsmål](#åpne-spørsmål), avklart
med P5-tråden.

## 1. Grunnlaget

### Personene

Persongalleriet (`src/__tests__/hjelp/persongalleri.ts`) med fagmiljø A (OUS
Klinisk farmakologi) og B (OUS Rettstoksikologi, åpnet i testdatabasen).
Personene som finnes i dag, brukes som de er. Tråd A legger til redaktørene;
D bruker dem og lager ingen egne.

| Person | Står for | Fra |
| --- | --- | --- |
| `systemarkitekt` | Systemarkitekt, primær i A, med den gamle adminrollen | Finnes |
| `arkitektB` | Systemarkitekt og lokal admin i B, uten adminrollen (som maxhag) | Finnes |
| `vanligA`, `vanligB` | Vanlige brukere; forslagsstillere | Finnes |
| `adminA`, `adminB` | Lokale administratorer | Finnes |
| `dobbeltAB` | Aktiv i både A og B; i testene også «en annen vanlig bruker i A» | Finnes |
| `avsluttetA` | Medlemskapet i A avsluttet, aktiv i B | Finnes |
| `utenMedlemskap`, `tidligereAdmin` | Gyldig token, ingen aktive medlemskap | Finnes |
| `redaktorRessursA` | Lokalt redaktøransvar for ett regelsett i A (`RA1`) | Tråd A |
| `redaktorFortolkningA` | Lokalt redaktøransvar for hele fortolkningen i A | Tråd A |
| `redaktorNasjonal` | Nasjonalt ansvar for fagsidene; lages bare i testen som slår bryteren på | Tråd A |

### Testdataene

Syntetiske, lagt inn gjennom de samme funksjonene appen bruker
(`leggInnTestdata` utvidet, eller en egen `leggInnP5data` i D2 som bygger på
den):

| Navn | Hva | Rekkevidde |
| --- | --- | --- |
| `F` | En publisert fagside med kortet `F.kort` | Felles |
| `RA1`, `RA2` | To publiserte regelsett i A; `RA1.kommentar` er en kommentar bare `RA1` bruker | Lokal A |
| `RB` | Et publisert regelsett i B med `RB.kommentar` | Lokal B |
| `Rutkast` | Et regelsett som bare finnes som utkast | Lokal A |
| `FA1` | Forslag fra `vanligA` til `RA1.kommentar` | A |
| `FA2` | Forslag fra `vanligA` til `RA2` | A |
| `FB` | Forslag fra `vanligB` til `RB` | B |
| `FF` | Forslag fra `vanligB` til `F.kort` | Felles |

Regelsettene hentes fra dagens import (`DAGENS_IMPORT`) og flyttes til B slik
`p5ressurser.test.ts` gjør. Ingen kliniske verdier endres eller lages.

### Utfallene

Som i `tilgangsmatrise.test.ts`: **tilgang** (lest noe eller fått skrive) eller
**avvist**. I tillegg kreves riktig feilkode der kontrakten sier den:

- `PT404` for en ressurs, et forslag eller et ansvar personen ikke kan se, med
  **samme kode og samme tekst** som for en ID som ikke finnes;
- `42501` for manglende rett til noe personen kan se;
- `22023` for ugyldig innhold;
- `PT409` for en status som er endret underveis.

## 2. Brukerflytene

Hver flyt prøves i tre lag: databasen (funksjonene og radsikkerheten),
komponentene (Vitest med Testing Library) og hele appen i det lokale
testmiljøet (D3). Kolonnen «Ventet» er det brukeren skal oppleve.

### Vanlig bruker (BF-V)

| # | Steg | Ventet |
| --- | --- | --- |
| BF-V1 | Åpner en fagside, menyen på siden | «Foreslå endring» står i menyen; ingen redigering eller publisering |
| BF-V2 | Åpner menyen på et kort | «Foreslå endring» med kortet valgt og et sitat av teksten |
| BF-V3 | Åpner fortolkningen for en analytt, visningen av reglene | «Foreslå endring» ved regelsettet og ved hver kommentar |
| BF-V4 | Fyller ut forslaget, begrunnelsen og to kilder (en lenke, en referanse) og sender | Kvittering med lenke til forslaget; status «Ny» |
| BF-V5 | Sender med tomt forslag, tom begrunnelse, for lang tekst eller en `http://`-lenke | Sendes ikke; feilen står ved feltet, på norsk |
| BF-V6 | Skriver halvveis, oppdaterer siden (eller appen oppdateres) | Utkastet til forslaget står der det stod (`useBevart`) |
| BF-V7 | Åpner «Mine forslag» fra kontomenyen | Egne forslag, nyeste først, med status i tekst |
| BF-V8 | Behandleren ber om presisering; brukeren får varsel, åpner forslaget og svarer | Status tilbake til «Under behandling»; svaret står i tidslinjen |
| BF-V9 | Trekker forslaget mens det er «Ny», «Under behandling» eller «Venter på deg» | Status «Trukket»; ingen «Trekk tilbake» etter godkjenning eller avvisning |
| BF-V10 | Får varsel om godkjenning, avvisning (med begrunnelse) og innarbeiding | Ett varsel per hendelse i gruppen «Endringsforslag»; lenken åpner forslaget |
| BF-V11 | Alt over på smal skjerm (390 × 844) med berøring | Skjemaet i hele høyden; ingen vannrett rulling; knappene nås med tommelen |
| BF-V12 | Ikke innlogget, eller uten aktivt medlemskap | Ingen «Foreslå endring», ingen «Mine forslag» |

### Redaktør (BF-R)

| # | Steg | Ventet |
| --- | --- | --- |
| BF-R1 | Logger inn som `redaktorRessursA` | Ingen adminmeny; «Til behandling» med tall i kontomenyen; «Mitt redaktøransvar» viser `RA1` |
| BF-R2 | Åpner «Til behandling» | Fanene nye, pågående og ferdige; bare forslag til `RA1` |
| BF-R3 | Tar et forslag | Status «Under behandling», behandleren står på forslaget, forslagsstilleren får varsel |
| BF-R4 | Kommenterer, og ber om presisering | Tidslinjen viser begge; status «Venter på forslagsstiller» etter presiseringen |
| BF-R5 | Avviser uten begrunnelse | Ikke mulig; feltet er påkrevd |
| BF-R6 | Godkjenner | Status «Godkjent»; det publiserte er uendret; teksten sier at det ikke er publisert |
| BF-R7 | «Åpne utkastet» | Den vanlige redigeringen av `RA1`; lagring virker; ingen publiseringsknapp |
| BF-R8 | Lagrer endringen og «Marker som innarbeidet» | Revisjonen utkastet står på er forhåndsvalgt; status «Innarbeidet»; forslagsstilleren får varsel |
| BF-R9 | Et forslag der `RA1` er publisert på nytt etter at forslaget ble skrevet | Konfliktvisningen: revisjonen forslaget bygger på, den publiserte nå, om utkastet har upubliserte endringer, og lenke til historikken |
| BF-R10 | Prøver å åpne redigeringen av `RA2` eller et forslag til `RA2` (direkte adresse) | Samme svar som for noe som ikke finnes |
| BF-R11 | Redaktøransvaret tilbakekalles mens fanen står åpen | Neste handling avvises med en forståelig melding; fanen forsvinner ved neste lasting |

### Lokal administrator (BF-L)

| # | Steg | Ventet |
| --- | --- | --- |
| BF-L1 | Adminmenyen, «Redaktører» | Oversikten etter område, og ressursene i A uten redaktør |
| BF-L2 | «Gi redaktøransvar» for hele fortolkningen i A til `vanligA` | Bare medlemmer av A kan velges; ansvaret vises i oversikten |
| BF-L3 | Gir ansvar for ett regelsett, valgt etter analyttkode | Regelsettet forsvinner fra «uten redaktør» |
| BF-L4 | Gir to personer ansvar for samme regelsett | Begge står; begge får varsel om nye forslag |
| BF-L5 | Tilbakekaller, med bekreftelse | Ansvaret står i historikken som tilbakekalt; personen mister redigeringen |
| BF-L6 | Ser de nasjonale valgene | Vises ikke for en lokal administrator |
| BF-L7 | Et forslag til et regelsett uten redaktør | Står i ansvarskøen («uten redaktør») hos administratoren; ingenting forsvinner |
| BF-L8 | Publiserer utkastet en redaktør har arbeidet inn | Den vanlige publiseringen, med samme kontroll som før |

### Systemarkitekt (BF-S)

| # | Steg | Ventet |
| --- | --- | --- |
| BF-S1 | «Redaktører» | Alle fagmiljøer; nasjonale valg vises, men er avslått med en kort forklaring |
| BF-S2 | «Til behandling» | Forslagene til fagsidene (ansvarskøen for felles innhold) og de lokale i alle fagmiljøer |
| BF-S3 | Prøver å gi nasjonalt ansvar (bryteren av) | Avvist med forklaringen; ingenting lagres |
| BF-S4 | Behandler `FF` og arbeider det inn i fagsidens utkast | Som før P5 for fagsidene; kurateringen er uendret (se avsnitt 7) |

## 3. Den negative matrisen

Radene legges i `tilgangsmatrise.test.ts` med etappen `P5`, i samme form som
de andre (`navn`, `person`, `etappe`, `idag`, `mal`, `prov`). Hver rad kjøres i
en transaksjon som rulles tilbake. Når en rad er ventet avvist, prøves også at
feilkoden er den kontrakten sier (avsnitt 1).

Forkortelser: **V** = forventet tilgang, **–** = forventet avvist.

### 3.1 Foreslå og følge (tråd B)

| Inngang | Mål | vanligA | vanligB | dobbeltAB | avsluttetA | adminA | adminB | systemarkitekt | utenMedlemskap / tidligereAdmin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `foresla_endring` | `RA1` | V | – (PT404) | V | – (PT404) | V | – (PT404) | V | – |
| `foresla_endring` | `RB` | – (PT404) | V | V | V | – (PT404) | V | V | – |
| `foresla_endring` | `F`, `F.kort` | V | V | V | V | V | V | V | – |
| `les_forslag` | `FA1` | V (eier) | – (PT404) | – | – | V | – (PT404) | V | – |
| `les_forslag` | `FB` | – (PT404) | V (eier) | – | – | – (PT404) | V | V | – |
| `les_forslag` | `FF` | – | V (eier) | – | – | – | – | V | – |
| `les_mine_forslag` | nevner andres forslag | – | – | – | – | – | – | – | – |
| `trekk_forslag` | `FA1` | V | – (PT404) | – | – | – (42501) | – (PT404) | – (42501) | – |
| `svar_pa_forslag` | `FA1` | V | – (PT404) | – | – | – (42501) | – (PT404) | – (42501) | – |

Manipulerte og ugyldige verdier, som `vanligA` (alle avvist):

- ressursen er et kort, en kommentar eller en referanse, ikke en ressurs (`22023`);
- `Rutkast`, som ikke er publisert;
- elementet `RB.kommentar` med ressursen `RA1` (elementet hører til en annen
  ressurs; svaret skal ikke røpe at `RB.kommentar` finnes);
- `grunnrevisjon` som ikke finnes eller ikke er publisert;
- en kilde med `http://`- eller `javascript:`-lenke, mer enn 10 kilder, en
  referanse som ikke finnes;
- forslag, begrunnelse, sted og utdrag over grensene, og tomme påkrevde felt;
- en tilfeldig UUID som forslag i `les_forslag`, `trekk_forslag` og
  `svar_pa_forslag`: samme kode og tekst som for `FB`.

### 3.2 Behandle (tråd C)

`ta_forslag`, `kommenter_forslag`, `be_om_presisering`, `godkjenn_forslag`,
`avvis_forslag` og `marker_forslag_innarbeidet`, hver for seg:

| Forslag | vanligA (eier) | dobbeltAB | redaktorRessursA | redaktorFortolkningA | adminA | adminB | arkitektB | systemarkitekt | utenMedlemskap / tidligereAdmin |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `FA1` (`RA1`) | – (42501) | – (PT404) | V | V | V | – (PT404) | V | V | – |
| `FA2` (`RA2`) | – (42501) | – (PT404) | – (PT404) | V | V | – (PT404) | V | V | – |
| `FB` (`RB`) | – (PT404) | – (PT404) | – (PT404) | – (PT404) | – (PT404) | V | V | V | – |
| `FF` (`F`) | – (PT404) | – (PT404) | – (PT404) | – (PT404) | – (PT404) | – (PT404) | V | V | – |

`les_forslagsko`: hver person ser nøyaktig forslagene i raden der den har V,
også i tellingene og i `uten_redaktor`; `vanligA` får ingen kø.

`marker_forslag_innarbeidet`, som `adminA` på et godkjent `FA1`:

- en revisjon av `RA2` (hører ikke til ressursen): avvist (`22023`);
- en revisjon av `RB` (manipulert ID): samme svar som en som ikke finnes;
- en revisjon som ikke finnes: avvist;
- på `FA1` med status `ny` eller `avvist`: `PT409`.

Vedtakene publiserer ingenting: etter `godkjenn_forslag` og
`marker_forslag_innarbeidet` er `objektpubliseringer` og den publiserte
revisjonen av `RA1` uendret (avsnitt 7, REG-P1).

### 3.3 Redaktøransvar (tråd A)

`tildel_redaktoransvar`:

| Tildeling | Av | Ventet |
| --- | --- | --- |
| Fortolkningen i A til `vanligA` | `adminA` | V |
| Fortolkningen i A til `vanligA` | `adminB`, `redaktorFortolkningA`, `vanligA`, `tidligereAdmin` | – |
| Fortolkningen i A til `vanligB` (ikke medlem i A) | `adminA` | – |
| Fortolkningen i A til `avsluttetA` eller `utenMedlemskap` | `adminA` | – |
| Fortolkningen i A til seg selv | `adminA` | – |
| Fortolkningen i B til seg selv | `arkitektB` | – |
| Fortolkningen i B til `vanligB` | `systemarkitekt`, `arkitektB`, `adminB` | V |
| `RB` til `vanligA` (manipulert ID) | `adminA` | – (PT404) |
| `RA1` til `vanligA` | `adminA` | V |
| Et kort, en kommentar eller en tilfeldig UUID som ressurs | `adminA` | – |
| Fagsidene, eller `F` som ressurs | `adminA` | – (42501) |
| Fagsidene, eller `F` som ressurs (bryteren av) | `systemarkitekt` | – (42501) |
| Fagsidene (bryteren slått på i testen) | `systemarkitekt` | V |
| Det samme ansvaret en gang til mens det første er aktivt | `adminA` | – (ett aktivt) |

`tilbakekall_redaktoransvar` på ansvaret til `redaktorFortolkningA`: `adminA`
og `systemarkitekt` V; `adminB` – (PT404); `redaktorFortolkningA` og
`vanligA` –; et ansvar som alt er tilbakekalt `PT409`.

Lesingen:

| Inngang | Ventet |
| --- | --- |
| `les_redaktoransvar()` | `adminA` ser A, ikke B; `adminB` omvendt; systemarkitektene alt; `vanligA` og redaktørene – |
| `les_redaktoransvar(B)` | `adminA` –; ingenting fra B i svaret |
| `mine_redaktoransvar()` | Bare egne; tom for `vanligA` |
| `ressursens_redaktoransvar(RA1)` | `adminA`, `redaktorRessursA`, `redaktorFortolkningA` V; `vanligA` –; `vanligB`, `adminB` – (PT404) |
| `mine_rettigheter()` | `redaktor` bare for redaktørene; `behandler_forslag` for redaktørene, administratorene og systemarkitektene, ikke for `vanligA`/`vanligB` |

### 3.4 Redaktørens endringsrett (tråd A)

| Handling | `redaktorRessursA` | `redaktorFortolkningA` |
| --- | --- | --- |
| Lese utkastet til `RA1` (`kan_se_utkast`, `les_kommentarer('utkast')`) | V | V |
| Lagre `RA1` med en ny kommentar regelsettet tar i bruk | V | V |
| Lagre `RA2` | – | V |
| Lagre en lokal kommentar i A som ikke hører til `RA1` | – | V |
| Lagre `RB` eller en kommentar i B | – (PT404) | – (PT404) |
| Lagre utkastet til `F` eller `F.kort` | – | – |
| `publiser_utkast` på noe | – | – |
| `gjenopprett_revisjon` på `RA1` | Som lagring (V), aldri publisering | V |
| Opprette en fagside eller en referanse; `slett_referanse` | – | – |

Etter tilbakekalling, og etter avsluttet medlemskap i A, er hver V over –, med
gyldig token. `ressursens_redaktorer` og `forslagsbehandlere` tar dem ikke med.

### 3.5 Direkte i tabellene

For alle personene: `select`, `insert`, `update` og `delete` direkte mot
`redaktoransvar`, `endringsforslag` og `endringsforslag_hendelser` gir ingen
rader og ingen endring. Selvheving: ingen kan legge inn eller endre et ansvar
eller et vedtak uten funksjonene. Katalogtestene (`tilgangskatalog.test.ts`,
`tilgangsinnganger.test.ts`, `aktivtmedlemskap.test.ts`) har med de nye
tabellene og funksjonene.

### 3.6 Varsler

| Hendelse | Får varsel | Får ikke |
| --- | --- | --- |
| Nytt `FA1` | `redaktorRessursA`, `redaktorFortolkningA` (`forslag_til_behandling`) | `adminA` (redaktørene har ansvaret), alle i B, `vanligA` |
| Nytt forslag til et regelsett i A uten redaktør | `adminA` og systemarkitektene | Alle i B |
| Nytt `FF` | Systemarkitektene (ansvarskøen for fagsidene) | De lokale administratorene og redaktørene |
| Statusendring, kommentar eller presisering på `FA1` | `vanligA` (`mine_forslag`) | Alle andre |
| Svar fra forslagsstilleren | Behandlerne av ressursen | Alle i B |
| `adminA` slår av `forslag_til_behandling` | Ingen nye i den kategorien | — |
| `vanligA` prøver å slå av `mine_forslag` | Ikke mulig | — |
| Medlemskapet i A avsluttes | Varslene om lokale forslag i A forsvinner | — |

Ingen varseltekst, telling eller lenke nevner et forslag eller en ressurs
mottakeren ikke kan se. Forslag er ikke med i fagsøket eller det globale søket.

## 4. Samtidighet

På ekte Postgres (`OUSFAR_POSTGRES_URL`, som de andre `*.samtidighet.test.ts`;
CI starter Postgres 17), med to eller tre forbindelser styrt steg for steg
(`hjelp/ektepostgres.ts`). Hvert scenario kjøres i begge rekkefølger, og etter
hvert scenario stemmer statusen med den siste hendelsen i tidslinjen.

| # | Scenario | Ventet |
| --- | --- | --- |
| SAM-1 | To behandlere tar samme forslag | Den ene får det, den andre `PT409`; én hendelse `tatt` |
| SAM-2 | Den ene godkjenner, den andre avviser | Ett vedtak; den andre `PT409` |
| SAM-3 | Behandleren godkjenner mens forslagsstilleren trekker | Én av dem lykkes; aldri både `godkjent` og `trukket` |
| SAM-4 | Forslagsstilleren svarer mens behandleren avviser | Én av dem lykkes; tidslinjen og statusen stemmer |
| SAM-5 | `RA1` publiseres på nytt mens forslaget behandles | `les_forslag` viser konflikten etterpå; ingenting skrives over |
| SAM-6 | To redaktører lagrer samme utkast mot samme revisjon | Den andre `PT409` (den vanlige konfliktkontrollen, nå også for redaktører) |
| SAM-7 | To administratorer gir samme ansvar samtidig | Ett aktivt ansvar; den andre får en forståelig avvisning, ikke en ubehandlet feil |
| SAM-8 | Ansvaret tilbakekalles mens redaktøren lagrer | Lagringen er enten ferdig før tilbakekallingen, eller avvist etter; aldri lagret etter |
| SAM-9 | Medlemskapet avsluttes mens redaktøren lagrer eller forslagsstilleren sender | Som SAM-8 |
| SAM-10 | `marker_forslag_innarbeidet` mens forslagsstilleren trekker et godkjent forslag | Trekkingen avvises (`PT409`) uansett rekkefølge; forslaget blir innarbeidet |
| SAM-11 | Mange forslag fra samme person samtidig, ved grensen for åpne forslag | Grensen holder |

## 5. Tilgjengelighet og mobil

Hver ny flate prøves i komponenttestene (roller og navn med Testing Library)
og i D3 i nettleseren, bredt (1280 × 800) og smalt (390 × 844, berøring).

| Flate | Kontroller |
| --- | --- |
| «Foreslå endring» i menyene | Nås med Tab og piltastene i `Nedtrekksmeny`; Enter åpner skjemaet; fokuset tilbake til menyknappen når skjemaet lukkes |
| Skjemaet (`Modallag`) | Fokus i første felt; fokusfellen og Escape fra `<dialog>`; Escape med ulagret tekst lukker ikke uten å spørre (`vedLukking`); hvert felt har en synlig etikett; feilene er knyttet til feltet (`aria-describedby`) og leses opp; tegntelling for lange felt; kildene legges til og fjernes med tastatur; hele høyden på smal skjerm uten vannrett rulling |
| Kvitteringen | Leses opp (`role="status"`); lenken til forslaget får fokus |
| `#/forslag` | Én `h1`; fanene som faner med piltastene; valgt fane og filter overlever en oppdatering (`useBevart`); statusen står i tekst, ikke bare i farge |
| `#/forslag/<id>` | Tidslinjen som liste med tidspunkt; handlingene som knapper med entydig navn; avvisning med påkrevd begrunnelse; konflikten i tekst, ikke bare i farge |
| Kontomenyen | Tallet på «Til behandling» har en tekst skjermleseren leser («3 forslag venter»), ikke bare et merke |
| «Redaktører» | Velg person og område med tastatur; tilbakekallingen bekreftes (`Bekreftelseskort`); de avslåtte nasjonale valgene er `disabled` med forklaringen lest opp |
| Alle | Berøringsmål minst 44 × 44 px på smal skjerm; ingen tekst kuttes; lys og mørk modus; appens hurtigtaster står i ro mens et lag er åpent (`lagLiggerOver()`) |

## 6. Dataskillet i brukerflaten

Utover databasen (avsnitt 3) prøves i komponenttestene og i D3 at brukerflaten
ikke røper noe: en direkte adresse til et forslag eller en ressurs i B gir
samme side som en ID som ikke finnes; tellingene i kontomenyen og fanene teller
bare det personen kan se; ingen feilmelding nevner navnet på en ressurs
personen ikke kan lese.

## 7. Regresjon

### Automatiske kontroller (i `npm test` ved hver PR)

| # | Hva | Testene |
| --- | --- | --- |
| REG-K1 | Klinisk output er uendret | `fortolkningUendret.test.ts`, `steg2regler.test.tsx`, `intervallregelsett.test.ts` (med `dagensgrenser.json`), `referanseomrader.test.ts`, `thcregler.test.tsx`, `thcsteg.test.tsx`, `scenarioregler.test.tsx`, `scenarioregelsett.test.ts`, `rusimport.test.ts` (med pariteten i `hjelp/rusparitet.ts`), `fortolkningPerFagmiljo.test.ts`, `analyttkatalogPerFagmiljo.test.ts` |
| REG-K2 | Tilgangene fra P1–P4 holder | `tilgangsmatrise.test.ts` (alle etapper i `HOLDER`), `rekkevidde.test.ts`, `redigeringsrett.test.ts`, `systemrettigheter.test.ts`, `aktivtmedlemskap.test.ts`, `tilgangskatalog.test.ts`, `tilgangsinnganger.test.ts`, `s2tilgang.test.ts` |
| REG-K3 | Den vanlige redigeringen | `faginnhold.test.ts`, `regelredigering.test.ts`, `fortolkningsredigering.test.tsx`, `scenarioredigering.test.ts`, `thcredigering*.test.ts(x)`, `endringshistorikk.test.ts`, `sideversjoner.test.ts`, `innholdsendringer.test.ts`, `opprettelse.test.ts` |
| REG-K4 | Kurateringen | `kurateringskjeden.test.ts`, `kurateringsgrener.test.ts`, `kurateringsendepunkt.test.ts`, `kurateringsko.test.ts`, `monografkuratering.test.ts`, `kuratorprotokoll.test.ts` |
| REG-K5 | Varsler, diskusjoner og fagsidene | `varsler.test.ts`, `varselmodell.test.ts`, `samhandlingsvarsler.test.ts`, `diskusjoner.test.ts`, `stoffside.test.tsx`, `stoffsidelesing.test.ts` |
| REG-K6 | Ytelsen for vanlige brukere | `MAAL_REKKEVIDDE=1 npx vitest run src/__tests__/ytelse/rekkeviddeytelse.test.ts` før og etter tråd A |

### Nye tester for at publisert innhold er uendret (D2)

| # | Hva |
| --- | --- |
| REG-P1 | Et øyeblikksbilde av alt publisert (publisert revisjon per objekt, `objektpubliseringer`, `les_kommentarer('publisert')` og regelsettene appen leser) før og etter et helt forløp: sende, ta, presisere, svare, godkjenne, arbeide inn i utkastet og markere innarbeidet. Bildene er like; bare utkastet har endret seg |
| REG-P2 | Det samme for et forslag som avvises og et som trekkes |
| REG-P3 | Fortolkningen for analytten til `RA1` gir samme utfall som før forløpet (`fortolkningsutfall`) |

### Manuelle kontroller i D3 (lokalt testmiljø)

- En vanlig bruker ser fagsiden og fortolkningen som før, bortsett fra
  «Foreslå endring»; ingen nye administrative valg.
- En administrator redigerer og publiserer en kommentar i fortolkningen som
  før, med samme publiseringsdialog.
- Historikkvinduet og sammenligningen virker for et regelsett en redaktør har
  lagret.
- Kontomenyen, adminmenyen og varselvinduet har samme rekkefølge og
  tastaturflyt som før, med de nye punktene lagt til.

## 8. Fordelingen

Trådene tester sine egne funksjoner i sine egne PR-er (kontrakten,
«Tester»). D lager ingen duplikater, men det som går på tvers:

| Del | Hvor | Når |
| --- | --- | --- |
| Avsnitt 3.1, 3.2 | Rader i `tilgangsmatrise.test.ts` (etappen `P5`), og det som trengs utover i en samlet `p5tvers.test.ts` | D2, når B1 og C2 har PR-er |
| Avsnitt 3.3, 3.4 | Det tråd A ikke alt har i sine tester, som rader i `tilgangsmatrise.test.ts` | D2, når A1 har PR |
| Avsnitt 3.6 | Mottakerne for hele forløpet i `p5tvers.test.ts`; kategoriene selv er Cs | D2 |
| Avsnitt 4 | `p5.samtidighet.test.ts` for SAM-3, SAM-4, SAM-8–SAM-10 (på tvers av trådene); SAM-1, SAM-2, SAM-6, SAM-7 og SAM-11 hos eieren hvis de ikke alt er der | D2 |
| Avsnitt 5, 6 | Komponenttestene hos eierne; nettleserkontrollen i D3 | D3 |
| REG-P1–P3 | `p5tvers.test.ts` | D2 |
| D3 | Brukerflytene i avsnitt 2 med Playwright i det lokale testmiljøet (`apneTestmiljo()`), skjermbilder i prosjektmappen | Når A–C er integrert |

Funn i en annen tråds del meldes til den tråden med steg for å gjenskape dem;
D retter ikke i andres filer.

## Åpne spørsmål

Spørsmål kontrakten ikke avgjør, sendt til P5-tråden. Svarene føres her.

1. Kan en behandler (en administrator eller redaktør) behandle sitt eget
   forslag? Planen forutsetter ja, fordi vedkommende kan endre utkastet uansett;
   tidslinjen viser det.
2. Kan en redaktør tilbakekalle sitt eget ansvar? Planen forutsetter nei: bare
   den som kan gi ansvaret, kan ta det tilbake.

## 9. Rapport fra sluttkontrollen

Fylles ut i D3, på integrert kode.

| Del | Prøvd | Resultat |
| --- | --- | --- |
| Brukerflytene (avsnitt 2) | — | — |
| Den negative matrisen (avsnitt 3) | — | — |
| Samtidighet (avsnitt 4) | — | — |
| Tilgjengelighet og mobil (avsnitt 5) | — | — |
| Regresjon (avsnitt 7) | — | — |
