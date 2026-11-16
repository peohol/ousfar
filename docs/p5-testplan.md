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
kontrakten ikke sier, står det under [Avklaringer](#avklaringer), avklart med
P5-tråden.

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
| `RA1`, `RA2` | To publiserte regelsett i A; `RA1.kommentar` er en kommentar bare `RA1` bruker, og `delt.kommentar` en kommentar både `RA1` og `RA2` bruker | Lokal A |
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
| BF-V4 | Fyller ut forslaget, begrunnelsen og to kilder (en lenke, en referanse) og sender | Kvittering med lenke til forslaget; status «Sendt» (behandlerne ser «Ny») |
| BF-V5 | Sender med tomt forslag, tom begrunnelse, for lang tekst eller en `http://`-lenke | Sendes ikke; feilen står ved feltet, på norsk |
| BF-V6 | Skriver halvveis, og appen oppdateres til en ny versjon | Utkastet til forslaget står der det stod (`useBevart`; en vanlig omlasting av siden bevarer ikke, etter `docs/oppdatering.md`) |
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
| BF-R10 | Prøver å lagre `RA2`, som redaktøren kan lese, men ikke redigere; og åpner et forslag til `RA2` med direkte adresse | Lagringen avvises som manglende rett (`42501`, en forståelig melding); forslaget, som redaktøren ikke kan se, gir samme svar som et som ikke finnes (`PT404`) |
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

Tabellene prøves i `p5tvers.test.ts`, én test per inngang for hele
persongalleriet, med dataene fra `hjelp/p5data.ts`. Hvert kall kjøres i en
transaksjon som rulles tilbake. Når et kall er ventet avvist, prøves også at
feilkoden er den kontrakten sier (avsnitt 1). Tråd A har sine rader i
`tilgangsmatrise.test.ts`; tabellene her ligger for seg, så trådene ikke endrer
den samme listen samtidig.

Forkortelser: **V** = forventet tilgang, **–** = forventet avvist. Er koden ikke oppgitt, følger den regelen i avsnitt 1: `PT404` for det personen ikke kan lese, ellers `42501`.

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

- ressursen er et kort, en kommentar eller en referanse, ikke en ressurs (`PT404`, som en ressurs som ikke finnes);
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
| Det samme ansvaret en gang til mens det første er aktivt | `adminA` | V, uten virkning: samme ID tilbake, fortsatt ett aktivt ansvar og ingen ny rad |

`tilbakekall_redaktoransvar` på ansvaret til `redaktorFortolkningA`: `adminA`
og `systemarkitekt` V; `adminB` – (PT404); `redaktorFortolkningA` og
`vanligA` –. Et ansvar som alt er tilbakekalt, kan tilbakekalles igjen uten feil og uten endring (tidspunktet og hvem som tilbakekalte, står som før).

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
| Lagre `RA2` | – (42501) | V |
| Lagre `RA1.kommentar` | V | V |
| Lagre `delt.kommentar`, som også `RA2` bruker | – (42501, se under) | V |
| Lagre `RA1` slik at det tar i bruk `delt.kommentar` uendret | V | V |
| Lagre en lokal kommentar i A som ikke hører til `RA1` | – (42501) | V |
| Lagre `RB` eller en kommentar i B | – (PT404) | – (PT404) |
| Lagre utkastet til `F` eller `F.kort` | – (42501) | – (42501) |
| `publiser_utkast` på noe | – (42501) | – (42501) |
| `gjenopprett_revisjon` på `RA1` | Som lagring (V), aldri publisering | V |
| Opprette en fagside eller en referanse; `slett_referanse` | – | – |

Et element som hører til flere ressurser (en delt kommentar), kan en
redaktør bare endre med ansvar for **alle** ressursene det hører til, ellers
endrer et ansvar for `RA1` den kliniske teksten i `RA2`. Testen prøver også at
det ikke er nok å ha ansvar for én av dem når `delt.kommentar` lagres sammen
med `RA1` i `lagre_*regelsett`. Regelen står under
[Avklaringer](#avklaringer).

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
| SAM-1 | To behandlere tar samme nye forslag | Den andre venter på låsen og tar så forslaget over, slik en annen behandler kan ta over et forslag: status `under_behandling`, to hendelser `tatt`, og behandleren er den som tok det sist. Vedtakene serialiseres som i SAM-2 |
| SAM-2 | Den ene godkjenner, den andre avviser | Ett vedtak; den andre `PT409` |
| SAM-3 | Behandleren godkjenner mens forslagsstilleren trekker | Én av dem lykkes; aldri både `godkjent` og `trukket` |
| SAM-4 | Forslagsstilleren svarer mens behandleren avviser | Kommer svaret først, er forslaget under behandling igjen og avvisningen lykkes etterpå; kommer avvisningen først, avvises svaret (`PT409`). Statusen er `avvist` i begge rekkefølger, og tidslinjen stemmer |
| SAM-5 | `RA1` publiseres på nytt mens forslaget behandles | `les_forslag` viser konflikten etterpå; ingenting skrives over |
| SAM-6 | To redaktører lagrer samme utkast mot samme revisjon | Den andre `PT409` (den vanlige konfliktkontrollen, nå også for redaktører) |
| SAM-7 | To administratorer gir samme ansvar samtidig | Den andre venter på låsen og får samme ID tilbake uten feil (tildelingen er idempotent, som i 3.3); ett aktivt ansvar |
| SAM-8 | Ansvaret tilbakekalles mens redaktøren lagrer | Er tilbakekallingen lagret, avvises lagringen, også i en transaksjon som begynte før. Kommer lagringen mens tilbakekallingen ennå ikke er lagret, regnes den som gjort før (kontrakten, «Konflikter og samtidighet»). Etterpå avvises neste lagring |
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
| `#/forslag` | Én `h1`; «Mine forslag» og «Til behandling» som lenker med `aria-current`, og utvalget i køen (nye, pågående, ferdige) som knapper med `aria-pressed`, nådd med Tab; valgt utvalg og filter overlever en ny versjon av appen (`useBevart`); statusen står i tekst, ikke bare i farge |
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
| REG-P3 | Grunnlaget for fortolkningen er uendret: `les_intervallregelsett('publisert')` og `les_kommentarer('publisert')` slik en vanlig bruker leser dem, er like før og etter forløpet. Fortolkningen regnes ut i appen fra dette grunnlaget, og utregningen selv er prøvd i REG-K1 |

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
| Avsnitt 3.1, 3.2, 3.5 | Tabellene for hele persongalleriet i `p5tvers.test.ts` | D2 |
| Avsnitt 3.3, 3.4 | Tråd A (`redaktoransvar.test.ts` og radene i `tilgangsmatrise.test.ts`); det A ikke har for alle personene, i `p5tvers.test.ts` | D2 |
| Avsnitt 3.6 | Mottakerne for hele forløpet, og at ingen har et varsel om et forslag de ikke kan se, i `p5tvers.test.ts`; kategoriene selv er Cs | D2 |
| Avsnitt 4 | `p5.samtidighet.test.ts` for SAM-1, SAM-3, SAM-4, SAM-8–SAM-10 (på tvers av trådene); SAM-2, SAM-6, SAM-7 og SAM-11 hos eieren | D2 |
| Avsnitt 5, 6 | Komponenttestene hos eierne; nettleserkontrollen i D3 | D3 |
| REG-P1–P3 | `p5tvers.test.ts` | D2 |
| D3 | Brukerflytene i avsnitt 2 med Playwright i det lokale testmiljøet (`apneTestmiljo()`), skjermbilder i prosjektmappen | Når A–C er integrert |

Funn i en annen tråds del meldes til den tråden med steg for å gjenskape dem;
D retter ikke i andres filer.

## Avklaringer

Spørsmål kontrakten først ikke avgjorde, avklart med P5-tråden 16.11.2026 og
ført inn i kontrakten («Rettighetene»):

1. En behandler (en administrator eller redaktør) kan behandle sitt eget
   forslag; tidslinjen viser det.
2. En redaktør kan ikke tilbakekalle sitt eget ansvar. Bare den som kan gi
   ansvaret, kan ta det tilbake.
3. En redaktør kan endre et element som hører til flere ressurser (en
   kommentar flere regelsett bruker), bare med ansvar for alle ressursene det
   hører til (avsnitt 3.4). Funnet i kontrollen av denne planen; ført inn i
   kontrakten («Delte elementer», 82aec2e).

## 9. Rapport fra sluttkontrollen

Sluttkontrollen (D3) er kjørt 16.11.2026 på main `8cff430` (A1, A2, B1, B2,
C1–C3 og D2 slått sammen), i det lokale testmiljøet med en database bygd på
nytt, syntetiske personer og bare syntetiske data. Ingenting ble kjørt mot
produksjonen. Det er tre kjøringer, med 78 kontroller i alt. Skjermbildene, funnene
(`funn.json`) og loggen ligger i prosjektmappen `p5/qa/d3/`, og skriptene
ligger i `p5/qa/skript/` (`d3.ts`, `d3b.ts`, `d3c.ts`).

| Del | Prøvd | Resultat |
| --- | --- | --- |
| Brukerflytene (avsnitt 2) | BF-V1–V5, V7–V11; BF-R1–R8, R10, R11 (ved neste innlogging); BF-L1–L3, L5, L6; BF-S1, S2. Lokal administrator, forslagsstiller, redaktør og systemarkitekt i nettleseren, i ett sammenhengende forløp | Holder. Statusen forslagsstilleren ser for et nytt forslag, er «Sendt» (rettet i BF-V4) |
| Den negative matrisen (avsnitt 3) | Hele matrisen i `p5tvers.test.ts` (D2). I nettleseren: en annen bruker i samme fagmiljø, en bruker i et annet fagmiljø og redaktøren åpner forslag de ikke kan se, med direkte adresse | Holder. Alle tre får «Fant ikke forslaget», med samme side som for en ID som ikke finnes |
| Samtidighet (avsnitt 4) | `p5.samtidighet.test.ts` på ekte Postgres (D2) og trådenes egne | Holder, med fasiten over |
| Tilgjengelighet og mobil (avsnitt 5) | Tastatur i «Redaktører», i køen, i behandlingen og i menyen «Mer for fagsiden». Fokus inn og ut av lagene. Én `h1`. Tallet i kontomenyen. Den avslåtte nasjonale knappen med forklaring. Smal skjerm (390 × 844, berøring) på fem flater. Mørk modus | Holder ikke helt: trykkflatene i funn 1 og 2 under er mindre enn 44 × 44 px på smal skjerm, og kontrollen står åpen til de er rettet og prøvd på nytt. Resten holder |
| Dataskillet (avsnitt 6) | Køen, tellingen og «Mine forslag» for redaktøren, for en bruker i et annet fagmiljø og for systemarkitekten | Holder. Redaktøren ser bare forslagene til sitt regelsett, og forslaget til fagsiden står bare hos systemarkitekten |
| Regresjon (avsnitt 7) | REG-K1–K5 i `npm test` og REG-P1–P3 (D2). I nettleseren: en vanlig bruker har ikke «Rediger fortolkningen», og systemarkitekten har den fortsatt. Etter tilbakekallingen har redaktøren mistet både redigeringen og køen | Holder |

Det som ikke er prøvd i nettleseren, er prøvd i testene. BF-V12 prøves i
`endringsforslag.test.ts` (ingen forslag uten aktivt medlemskap). BF-V6, og
utvalget og filteret i køen, prøves i `p5bevaring.test.tsx`: etter en
oppdatering til en ny versjon (`oppdaterOgTaVare`, så monteres alt på nytt)
står det halvskrevne forslaget og køen som før, og etter en vanlig omlasting
gjør de ikke det. BF-R9
(konflikten) prøves i `forslagsbehandling.test.ts`. BF-L4 (to redaktører får
begge varsel) og BF-L7 (forslag uten redaktør går til administratorene) prøves
i `p5tvers.test.ts` (avsnitt 3.6), og BF-S3 prøves i `redaktoransvar.test.ts`. BF-L8 og BF-S4 er den
vanlige publiseringen og kurateringen, som REG-K3 og REG-K4 prøver.

**Funn i sluttkontrollen**, alle om utseende. Ingen stopper bruken, men funn 1
og 2 betyr at kravet om trykkflater i avsnitt 5 ennå ikke er oppfylt. Alle er
sendt til eierne gjennom P5-tråden:

1. Utvalgsknappene «Nye», «Pågående» og «Ferdige» i køen er 35 px høye på
   smal skjerm, mot 44 px i avsnitt 5 (tråd C).
2. Knappene «Send forslaget» og «Avbryt» i skjemaet er 42 px høye på smal
   skjerm. Lenken «Gå til fortolkningen» på forslaget er 23 px høy (tråd B).
3. Listen på «Mine forslag» og «Til behandling» mangler den øverste kanten og
   de runde hjørnene øverst (tråd B).
4. Tittelen på et forslag til fortolkningen gjentar ordet: «Fortolkning ·
   Fortolkning av … · Reglene for HBUP» (tråd B).

De fem funnene fra den tidlige kontrollen av del B er prøvd på nytt på main,
og alle er fortsatt i orden (`d3c.ts`).

**Tidlig kontroll av del B (16.11.2026).** Forslagsstillerens flyt (BF-V1–V5,
V7, V9, V11, tastatur og en annen brukers direkte adresse) er prøvd i det
lokale testmiljøet på tråd Bs databasedel og brukerflate før PR-en for
brukerflaten. Flyten virker. Fem funn er sendt til tråd B: fokus forsvinner
etter innsendingen, ingen inngang for hele fagsiden, ikonet kan forveksles med
diskusjonene, og to mindre om skjermleser. Tråd B rettet dem, og en ny kontroll
samme dag fant alle fem i orden. Sluttkontrollen prøver dem på nytt.

**Krysstestene (D2, 16.11.2026).** Prøvd på A1, B1 og C slått sammen.
Tabellene i avsnitt 3 og samtidigheten i avsnitt 4 holder. To funn ved
sammenslåingen er rettet av eierne: testene for behandlingen bygde på at
ingen i A hadde redaktøransvar (rettet i C), og `p5ressurser.test.ts` manglet
tidsfrist for oppsettet (rettet i P5.0). Samtidigheten på ekte Postgres
avklarte fasiten for SAM-1, SAM-4, SAM-7, SAM-8 og SAM-9 over.
