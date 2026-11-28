# Personalkalenderen i databasen

Hvordan personalkalenderen er bygd i databasen: skjemaet `personal`, rollene,
det versjonerte oppsettet, medarbeiderne og Sandkasse. Trinn P2b i
integrasjonsplanen ([personal.md](personal.md) §8.11,
[#616](https://github.com/peohol/ousfar/issues/616)). Rammen, rollene og
kravene står i personal.md §8.3–8.7; her står hvordan de er oppfylt, og
hvilke tester som viser det. Domenekoden er `supabase/functions/_delt/personal/`
(P2a), og databasen holder de samme reglene som den.

P2b leveres i to deler:

1. **Grunnmuren** (`*_personal_grunnmur.sql`, `*_personal_utproving.sql`):
   funksjonen, rollene og vaktplanansvarlige, oppsettet, medarbeiderne og
   kvalifikasjonene, og Sandkasse.
2. **Kalenderen** (`*_personal_kalender.sql`): oppføringene med
   invariantene, kommandoene, lesemodellen for fritak, endringsloggen og
   samtidigheten.

P2c ([#620](https://github.com/peohol/ousfar/issues/620)) legger til
**medarbeiderne 1:1 med medlemmene**, **innstillingene** (kvalifikasjonene og
vaktandelen) og **«Vis som»** (`*_personal_medarbeidere.sql`), med
brukerflatene for dem. Kalenderens visninger kommer i P3.

## Skjerming og tilgang

Alt ligger i skjemaet `personal`, som nettleseren ikke har noen rettigheter
til: ingen tabeller, ingen funksjoner, og ingen nye funksjoner får det av seg
selv (`alter default privileges`). Nettleseren når kalenderen bare gjennom
funksjonene `public.personal_*`, som alle er `security definer` og går
gjennom én port:

```
personal.krev_tilgang(fagmiljø, handling)
  → intern.krev_funksjon('personal', fagmiljø)   aktivt eget medlemskap, ellers 42501
                                                 funksjonen tilgjengelig, ellers P0002 «Finnes ikke.»
  → personal.rolle(fagmiljø, innlogget)          rollen i kalenderen
  → personal.kan(rolle, handling)                ellers 42501
```

- **K-SKJ-1, K-SKJ-3.** Uten funksjonen i fagmiljøet svarer alle
  funksjonene `P0002 «Finnes ikke.»`, det samme som for et fagmiljø som ikke
  finnes. Med `utprøving` har bare systemarkitekter med eget aktivt
  medlemskap funksjonen (#598). Katalogvakten (kategorien `personal` i
  `src/__tests__/data/funksjonskontroller.ts`) krever porten i hver funksjon.
- **K-SKJ-5, K-TIL-1.** Rollen bygger bare på eget medlemskap og lokal
  administrasjon uten systemarkitektunntak (`intern.administrerte_fagmiljoer`,
  #572). Systemarkitektrollen og den gamle adminrollen gir ingenting; en
  systemarkitekt som er vanlig medlem, er kollega.
- **K-SKJ-6, K-SKJ-10.** Funksjonen `personal` er ført inn i
  `public.funksjoner` **uten noen godkjenning**. Databasen nekter derfor
  `utprøving` og `på` i alle fagmiljøer som ikke er testmiljøer. Godkjenningen
  for ett bestemt fagmiljø gis bare med en egen migrasjon fra Personal etter
  Peders ja og avklaringen i personal.md §3.4; deretter slår en systemarkitekt
  den på i appen uten kodeendring.
- **Samtidige tilgangsendringer.** Kommandoene som endrer noe går gjennom
  `personal.krev_skrivetilgang`, som tar den felles tilgangslåsen delt før
  porten (som direktemeldingene). Utpekingen av vaktplanansvarlige endrer selv
  tilgang, tar låsen eksklusivt (`intern.las_tilgang`) og kontrollerer rollen
  på nytt etter den. En kommando som kjøres mens noen avslutter medlemskapet
  eller fjerner rollen til den som handler, venter derfor på endringen og
  avvises etterpå.
- **Bare i `read committed`.** Alt som endrer kalenderen eller oppsettet,
  krever `read committed`, som data-API-et bruker for hver forespørsel
  (`personal.krev_ferske_data`, `25001` ellers). Kontrollene etter en lås ser
  da det siste som er lagret, også det en annen transaksjon lagret mens denne
  ventet. I `repeatable read` ville de sett tilstanden fra før ventingen, så
  der stoppes endringen, som tilgangsendringene (`intern.las_tilgang`).
- **Kontosletting.** En konto kan slettes som før (`docs/brukere.md`), også
  når den har lagret oppsettet, utpekt og avsluttet vaktplanansvarlige, endret
  kalenderen eller gitt fritak. Fremmednøklene nuller da `lagret_av`,
  `tildelt_av`, `avsluttet_av`, `endret_av` og `aktor` i endringsloggen, og de
  uforanderlige radene slipper bare den endringen gjennom
  (`personal.bare_kontosletting`: bare de feltene, bare til tomt, og bare når
  kontoen ikke finnes lenger). Alt annet står fast som før.

### Rollene

`personal.rolle(fagmiljø, bruker)` gir rollen når funksjonen er tilgjengelig
for brukeren der, ellers ingenting:

| Rolle | Hvem (personal.md §8.4) |
| --- | --- |
| `localAdmin` | Lokal administrator i fagmiljøet (også B2: systemarkitekt som selv er medlem og lokal administrator) |
| `planner` | Vaktplanansvarlig, utpekt av lokal administrator |
| `reader` | Andre aktive medlemmer |

Handlingene per rolle står i `personal.kan(rolle, handling)`, med de samme
navnene og den samme tabellen som `MATRIX` i `permissions.ts`; en test holder
dem like. Ny handling i P2b: `managePlanners` (B3), bare for `localAdmin`.

### Vaktplanansvarlige (K-TIL-5)

`personal.vaktplanansvarlige` har én rad per utpeking med fra, til, hvem som
utpekte og hvem som avsluttet. Flere kan ha rollen samtidig. Rollen gjelder
bare så lenge medlemskapet som fantes da personen ble utpekt, er aktivt: den
som går ut og blir medlem igjen, er kollega til hen utpekes på nytt.

`public.personal_sett_vaktplanansvarlig(fagmiljø, bruker, ansvarlig)` krever
`managePlanners`, og den utpekte må være eget aktivt medlem. Kallet er
idempotent. Hver utpeking og avslutning føres i `public.tilgangslogg` med
begrunnelsen «Personal: …».

## Oppsettet (K-KON-3, K-KON-4)

`personal.oppsett` har fagmiljøets oppsett i versjoner: `regler` er `RuleSet`
uten `version` og `effectiveFrom` (statuskatalogen, visningsgruppene,
bemanningsbehovene med rollevekter og belastning, arbeidskalenderen og
vaktfordelingen), og kolonnene er enheten (`Unit`: tidssone, arbeidsåret og
helgefilteret).

- **Bare nye versjoner.** Ingen versjon endres eller fjernes, og hver ny
  følger rett etter den forrige (`personal.kontroller_oppsett`). En ny
  versjon tar låsen for fagmiljøets oppsett eksklusivt (`personal.las_oppsett`);
  det som leser reglene for å endre noe, tar den delt. En status kan derfor
  ikke fjernes samtidig som den tas i bruk: den som kommer sist, venter og ser
  den andres endring.
- **Gjelder fra dagen den lagres**, i fagmiljøets tidssone.
  `personal.oppsett_for(fagmiljø, dato)` gir versjonen som gjaldt en dato, så
  tidligere dager vurderes etter reglene som gjaldt da.
- **Serveren validerer.** `personal.oppsettfeil(regler)` gir de samme
  meldingene som `validateRules` i `commands.ts`, og en sjekk i tabellen
  stopper et ugyldig oppsett også utenom kommandoen. I tillegg avvises det
  TypeScript-typene ellers sikrer: ukjente felt, feil typer, ID-er som ikke
  er små bokstaver og bindestrek, for lange tekster og for mange elementer,
  og tekst som ligner et fødselsnummer.
- **Konsekvensen før lagring** regnes i appen med `ruleImpact` fra
  domenekoden (P3); databasen gir grunnlaget.

`public.personal_lagre_oppsett(fagmiljø, {enhet, regler}, forventet_versjon)`
krever `editRules`. Har noen lagret imens, avvises den med `PT409`. En status
som er i bruk, kan ikke fjernes (gjøres inaktiv i stedet), som
`removedStatusErrors`.

## Medarbeiderne (K-MED-4, K-SKJ-9)

`personal.medarbeidere` har enten en konto (`bruker_id`, ordinær drift fra
P2c) eller et syntetisk navn og en stilling (testmiljø), aldri begge.

- **Syntetiske bare i et testmiljø, og et testmiljø bare med syntetiske.**
  Databasen avviser begge brudd: en medarbeider av feil slag
  (`personal.kontroller_medarbeider`), og å fjerne testmerkingen mens det
  finnes syntetiske medarbeidere, eller å sette den mens det finnes
  virkelige (`personal.kontroller_testmiljo`). Fagmiljøet og slaget kan ikke
  endres, så ingenting overføres fra et testmiljø til et virkelig fagmiljø.
- **Kvalifikasjonene** (`personal.kvalifikasjoner`) har gyldighetsdatoer uten
  overlapp per medarbeider og status. Kontrollen låser medarbeideren og kjøres
  etter låsen i `read committed`, så to samtidige endringer prøves etter
  hverandre og den andre ser den første. Bare planleggerne ser dem i
  lesemodellen.
- **En konto som slettes,** stoppes så lenge den er medarbeider: ordningen
  for historikken avgjøres før ordinær bruk (B9).

### 1:1 med medlemmene (P2c: K-MED-1, K-MED-3, K-MED-5, B13)

Utenfor et testmiljø, når funksjonen ikke står av, er medarbeiderne nøyaktig
fagmiljøets aktive medlemmer (`personal.knytter_medlemmer`). Ingen legger dem
inn: utløsere på `public.medlemskap`, `public.funksjonsbrytere` og
`public.fagmiljoer` kjører `personal.synk_medarbeider` i transaksjonen som
endrer medlemskapet, bryteren eller testmerkingen.

- **Periodene** (`personal.medarbeiderperioder`) sier hvilke dager
  medarbeideren er med: fra dagen medlemskapet blir aktivt, til og med dagen
  det avsluttes. Et nytt medlemskap samme dag gjenåpner perioden; senere gir
  det en ny. Perioder kan ikke slettes, begynne bakover i tid, endres bakover
  eller overlappe, og syntetiske medarbeidere har ingen (de bruker aktiv fra
  og til). `personal.aktiv_paa(medarbeider, dag)` er det kalenderen spør.
- **Avsluttet medlemskap** stopper den fremtidige planleggingen fra dagen
  etter: registreringene etter dagen fjernes (og står i kalenderens logg, så
  dekningen viser hullet), kvalifikasjonene avsluttes, så et nytt medlemskap
  senere begynner uten, og ingen ny registrering eller ny status kan legges
  på en dag utenfor periodene, heller ikke rett i tabellen. Alt til og med
  dagen står. Tilgangen stopper samme dag (rollen krever aktivt medlemskap).
- **Mens funksjonen står av** følges ikke medlemskapene; de tas igjen når
  den slås på.
- **Navnet og stillingen** leses fra profilen hver gang, og stillingene er
  appens stillinger (K-MED-5). Stilling per dag kommer med Dev
  ([#602](https://github.com/peohol/ousfar/issues/602), før P4).
- **Til B14** gir `personal.stilling_styrer_vakter(bruker)` fagmiljøene der
  brukerens stilling styrer vaktene, så kontrollen av stillingsendringer i
  #602 kan kreve lokal administrativ myndighet i hvert av dem.
- `personal.innstillingslogg` fører hver endring av medlemskapet,
  kvalifikasjonene og vaktandelen, med hvem, når, før og etter. Loggen kan
  ikke endres.

### Innstillingene (P2c: K-MED-2, §6.2)

Hver medarbeider har en `revisjon` som klienten sender med; har noen endret
innstillingene imens, avvises endringen med `PT409`. En medarbeider som ikke
lenger er med etter i dag, kan ikke endres («… er ikke lenger medarbeider.»).

- `public.personal_sett_kvalifikasjoner(fagmiljø, medarbeider, statuser,
  revisjon)` krever `editPeople`. `statuser` er hele lista som skal gjelde:
  en ny kvalifikasjon gjelder fra i dag, en som fjernes, til og med i går.
  Bare oppgaver som krever kvalifikasjon og er aktive i dagens oppsett, kan
  legges til.
- `public.personal_lagre_vaktandel(fagmiljø, medarbeider, vaktandel,
  revisjon)` krever `editDutyShare` og lagrer hele planen
  (`DutyShareSchedule`). `personal.vaktandelfeil` gir de samme meldingene som
  `validateDutySchedule`, og `personal.vaktandel_endrer_fortid` det samme
  svaret som `changesPast`; begge håndheves også rett i tabellen
  (`personal.vaktandeler`).
- `public.personal_medlemmer(fagmiljø)` gir den lokale administratoren de
  aktive medlemmene å velge vaktplanansvarlige blant (`managePlanners`).
- Lesemodellen gir alle rollene periodene, revisjonen og vaktandelen;
  kvalifikasjonene bare planleggerne, som før.

### «Vis som» (P2c: K-SKJ-7)

Bare i et testmiljø kan den innloggede prøve kalenderen med en lavere rolle
(`reader`, `planner`, `localAdmin`) og som én syntetisk medarbeider
(`public.personal_vis_som(fagmiljø, rolle, medarbeider)`, begge tomme
avslutter). Valget lagres i `personal.vis_som` og håndheves på serveren:
`personal.rolle` er den laveste av den virkelige rollen og den valgte, så alle
kommandoene og lesemodellen følger den, og `personal.meg` er den valgte
syntetiske medarbeideren. En høyere rolle avvises (`42501`). Utenfor et
testmiljø finnes ikke funksjonen («Finnes ikke.»), tabellen avviser rader
der, valget gjelder ikke der selv om en rad skulle finnes, og radene fjernes
når testmerkingen tas bort. Under utprøving har bare systemarkitektene
tilgang, så bare de kan bruke det.

## Lesemodellen

`public.personal_grunnlag(fagmiljø)` gir det kalenderen trenger før selve
oppføringene: rollen, dagens dato i fagmiljøet, enheten, alle versjonene av
oppsettet, stillingene, medarbeiderne og de vaktplanansvarlige. Fra P2c også
om fagmiljøet er testmiljø, hvem den innloggede er i kalenderen (`meg`),
simuleringen (`simulering`), og per medarbeider periodene, revisjonen og
vaktandelen.

## Kalenderen (K-DAT-1–3, K-TIL-4)

`personal.oppforinger` har én rad per medarbeider og dato (personal.md §8.7):
statusen, et valgfritt tidsrom i minutter fra midnatt, merknaden, låsen, det
administrative fritaket, regelversjonen og revisjonene. Ingen årsak eller
fritekst ut over den kontrollerte merknaden. Medarbeideren og fagmiljøet
henger sammen (fremmednøkkel på paret), og en oppføring kan ikke flyttes til
en annen dato eller medarbeider; en flytting er å fjerne og legge inn.

### Invariantene i databasen

Uansett vei inn, også rett i tabellen:

- **én status per medarbeider og dato** (unik);
- **høyst én per dato** for en status som er «én per dag», og **høyst
  bemanningsbehovet** for en annen bemannet oppgave (`staffingCap`). En dato
  som alt var over grensen fordi behovet er senket etterpå, kan endres så
  lenge antallet ikke øker (`invariantErrors`). Antallet før transaksjonen
  huskes i datoraden (`personal.dager.foer`, merket med transaksjonen) når den
  først rører statusen og datoen, så klienten ikke kan påvirke det, og
  grensen kontrolleres ved slutten av transaksjonen
  (`personal.kontroller_bemanning`, en utsatt utløser) for hver oppføring som
  legges inn eller får en ny status. En endring som beholder statusen, som en
  merknad, et fritak eller kontoslettingens nulling av hvem som endret, endrer
  ikke antallet og kontrolleres ikke;
- **statusen kjent** i reglene som gjelder datoen (`23514` ellers);
- **fritaket** bare på en status med `dutyExemption: 'administrative'`, og det
  følger aldri en ny status. En ny versjon av oppsettet kan ikke ta fritaket
  fra en status som har fritak fra og med datoen versjonen gjelder fra
  (`personal.kontroller_fritak_i_oppsett`, `22023`): fritaket må fjernes
  først, så det aldri står igjen skjult og påvirker vaktbelastningen.

### Kommandoene

`public.personal_endre_kalender(fagmiljø, endringer)` krever `editCalendar` og
tar en liste med opptil 500 endringer `{medarbeider, dato, revisjon, status,
tid, merknad}`. Alt lagres samlet eller ingenting (K-DAT-2):

1. formen på alle endringene, og ingen celle to ganger. `revisjon` og
   `status` må alltid stå der; bare en uttrykkelig `status: null` fjerner
   registreringen;
2. låsen på hver dato, i fast rekkefølge;
3. revisjonene: hver celle må ha revisjonen klienten så (null for en tom
   celle), ellers `PT409`;
4. endringene én etter én, kontrollert med de samme reglene og meldingene som
   `planSet` i rules.ts (`personal.statusbrudd`): medarbeideren registrert
   dagen, statusen kjent og aktiv etter reglene som gjaldt dagen,
   kvalifikasjonen, arbeidsdagen etter arbeidskalenderen og de norske
   helligdagene, tidsrommet, merknaden (`checkNote`), og om vakten eller alle
   plassene alt er tatt. En vakt tas over ved å fjerne den hos den som har
   den først i samme endring. Brudd gir `22023` med meldingen og hvilken
   endring det gjelder.

Samme status i cellen beholder registreringen (låsen, fritaket og
regelversjonen); en ny status er en ny registrering (`entryFromPlan`).

`public.personal_sett_fritak(...)` krever `manageExemption` (lokal
administrator), revisjonen og fritaksrevisjonen klienten så, og en status som
kan ha administrativt fritak. Vaktplanansvarlige kan ikke gi fritak, heller
ikke på egne registreringer.

Kollegaens egne statuser (B6, B15, B15b, B16, K-TIL-6) hører til P3; i P2b
endrer bare planleggerne kalenderen.

### Lesemodellen for fritak (K-TIL-4, K-DAT-1)

`public.personal_kalender(fagmiljø, fra, til)` (høyst 400 dager) gir
oppføringene for rollen. Fritaket og fritaksrevisjonen er bare med for
`manageExemption`. Fritaket har sin egen revisjon fra en egen sekvens, og en
endring av bare fritaket endrer verken revisjonen, ID-en eller tidspunktet
andre ser. Kalenderen, svarene fra kommandoene og historikken er derfor
nøyaktig like med og uten fritak for alle andre roller.

### Endringsloggen

`personal.endringer` får en rad per endring: hvem, når, før og etter. Ingen
rad kan endres eller fjernes. `public.personal_historikk(fagmiljø, fra, til)`
gir den til rollene som redigerer kalenderen (antakelse: kollegaer ser den
ikke). Uten `manageExemption` er fritaket tatt ut, og en endring av bare
fritaket er borte.

### Samtidighet (K-DAT-3)

Alle endringer, også rett i tabellen, tar låsene i den samme rekkefølgen, så
ingen venter i ring:

1. tilgangslåsen, delt (bare kommandoene);
2. låsen for fagmiljøets oppsett (`personal.las_oppsett`): delt for
   kalenderen og kvalifikasjonene, eksklusiv for en ny versjon av oppsettet.
   En status kan derfor ikke fjernes fra oppsettet samtidig som den tas i
   bruk;
3. datoen i `personal.dager`, i fast rekkefølge når flere datoer endres;
4. raden. Også fritaket tar datoen før raden.

Endringer av samme dato prøves derfor etter hverandre, og den andre får
`PT409` eller regelbruddet. Ingen endring overskriver en annen. Det samme
gjelder fritaket mot en samtidig statusendring, og to lagringer av oppsettet
(`PT409`). Alt dette krever `read committed` («Bare i `read committed`» over).

Endringen og fritaket går gjennom `personal.krev_skrivetilgang`, som tar den
felles tilgangslåsen delt før porten («Samtidige tilgangsendringer» over). En
endring som kjøres mens medlemskapet eller rollen til den som handler
avsluttes, venter på det og avvises etterpå.

Innstillingene (P2c) tar de samme låsene: tilgangslåsen delt, oppsettet delt
og så medarbeideren (`personal.las_medarbeider`). En endring av medlemskapet
tar tilgangslåsen eksklusivt og oppsettet eksklusivt
(`personal.synk_medarbeider`), så en registrering eller kvalifikasjon som ble
lagret like før, ryddes av avslutningen, og en som venter, avvises etter den,
også rett i tabellen, der bare oppsettet låses.

## Sandkasse

Migrasjonen `*_personal_utproving.sql` gjør Sandkasse klar til utprøving,
bare når Sandkasse finnes og er merket som testmiljø:

- pilotoppsettet (`defaultRuleSet()`), med rollevektene på stillingene LIS og
  Overlege;
- de tolv syntetiske medarbeiderne fra prototypen, med oppdiktede navn og
  kvalifikasjoner for vakt 1 og vakt 2;
- funksjonen `personal` på `utprøving`.

Ingen konto blir medarbeider, og ingen godkjenning for ordinær bruk
opprettes. Alle virkelige fagmiljøer står av.

## Testene

`src/__tests__/personal/grunnmur.test.ts`, med persongalleriet og et
syntetisk Sandkasse (`src/__tests__/personal/database.ts`):

- funksjonen uten godkjenning, og ingen `utprøving` eller `på` utenfor et
  testmiljø;
- rollene for hver person i galleriet, med og uten funksjonen, også for
  systemarkitekter uten medlemskap, avsluttet medlemskap og andre fagmiljøer;
- vaktplanansvarlige: hvem som kan utpeke, idempotens, loggen og et nytt
  medlemskap;
- oppsettet: paritet med `validateRules` for alle feiltyper, grensene,
  formfeilene, versjonene og lagring mot en foreldet versjon (`PT409`);
- medarbeiderne: K-MED-4 begge veier, testmerkingen og Sandkasse;
- kontosletting: en lokal administrator som har lagret oppsettet og utpekt
  og avsluttet vaktplanansvarlige, slettes som før, radene står med tomme
  felt, og ingen annen endring slipper gjennom;
- `repeatable read` stopper endringene.

`src/__tests__/personal/kalender.test.ts`, med Sandkasse og et andre
syntetisk testmiljø:

- tilgangen for hver rolle og hvert fagmiljø: uten medlemskap, utenfor
  fagmiljøet, i virkelige fagmiljøer, under utprøving, kollega,
  vaktplanansvarlig som prøver å gi fritak, avsluttet og nytt medlemskap, og
  medarbeidere og data fra det andre testmiljøet (K-TIL-1–3);
- regelpariteten: over 500 kombinasjoner av medarbeider, status, dag, tid og
  merknad gir de samme bruddene som `planSet`, og helligdagene (2000–2099),
  dagtypene, bemanningsbehovet og merknadskontrollen er like domenets;
- overtakelse, bytte, alt eller ingenting, formfeil og revisjonskonflikter;
- grensene i databasen, også rett i tabellen og med overskudd etter et senket
  behov, og tidligere dager etter oppsettet som gjaldt da;
- fritaket: likt svar med og uten for kollega og vaktplanansvarlig, også i
  historikken, og at oppsettet ikke kan ta fritaket fra en status som har det
  fremover;
- endringsloggen, og kontosletting av en planlegger som har endret kalenderen,
  gitt fritak og fylt en dag som senere er over et senket behov;
- en ukjent status og den gamle innstillingen `personal.foer` rett i tabellen.

`src/__tests__/personal.samtidighet.test.ts` kjører de samtidige endringene
med to forbindelser mot ekte Postgres med hele databasestrukturen (kjøres når
`OUSFAR_POSTGRES_URL` er satt, og i CI med Postgres 17):

- i `read committed`, som data-API-et bruker: to som lagrer oppsettet fra den
  samme versjonen, to som endrer den samme cellen, den samme vakten til to,
  grensen rett i tabellen, fritaket mot en statusendring og mot flere celler
  samme dag i begge rekkefølger, at fritaket tar datoen før raden, og en status
  som fjernes fra oppsettet mens den tas i bruk, i begge rekkefølger;
- i `read committed`: utpeking, lagring av oppsettet, endring i kalenderen og
  fritak mens rollen eller medlemskapet til den som handler fjernes;
- i `read committed`, i et fagmiljø der medlemmene er medarbeiderne (P2c):
  registreringen og kvalifikasjonene mot et medlemskap som avsluttes, i begge
  rekkefølger og rett i tabellen, og to endringer av innstillingene fra den
  samme revisjonen;
- i `repeatable read`: alle endringene stoppes med `25001`, også
  innstillingene og et avsluttet medlemskap.

`src/__tests__/personal/medarbeidere.test.ts` (P2c), med et syntetisk
fagmiljø R som ikke er testmiljø og har en syntetisk godkjenning i
testdatabasen:

- 1:1: ingen medarbeidere før funksjonen er på, alle aktive medlemmer når den
  slås på, et nytt medlem og en invitasjon som tas imot, stillingen fra
  profilen, avsluttet og nytt medlemskap samme dag og senere, vernet av
  periodene, funksjonen av og på igjen, andre fagmiljøer og Sandkasse;
- innstillingene: rollene, kvalifikasjonene fra i dag, formfeil, foreldet
  revisjon, synligheten, vaktandelen fra i dag og vernet av tidligere dager
  rett i tabellen, og pariteten med `validateDutySchedule` og `changesPast`;
- «Vis som»: lavere rolle håndhevet, aldri høyere, syntetisk identitet, aldri
  i et virkelig fagmiljø (heller ikke med en rad lagt inn forbi funksjonen),
  og fjernet når testmerkingen tas bort;
- vaktplanansvarlige: medlemmene den lokale administratoren velger blant.
