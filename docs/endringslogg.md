# Loggføringsprotokoll

Leses som **siste steg før en PR er klar til å slås sammen** — ikke underveis i
arbeidet. Da er det klart hva endringen faktisk ble, og føringen kan skrives én
gang i stedet for å måtte rettes for hver push.

Kort sagt: avgjør om endringen er MAJOR, MINOR, PATCH eller stille, og skriv
én føring i en egen, ny fil. Skriv aldri et versjonsnummer, og rør ikke
`package.json` eller låsefila for å føre en versjon. Nummeret settes
automatisk når PR-en er slått sammen og appen bygges. Reglene er de samme for
OUSFAR Dev, Fag og Verktøy.

## 0. Er det en stille designjustering?

En PR som **bare** justerer hvordan appen ser ut, uten at det betyr noe for hva
den gjør eller hva den viser, er stille: den får **ingen føring**, og dermed ingen ny
versjon, intet varsel og ingen melding om å oppdatere siden. Slikt er bare støy for brukerne, og de får endringen neste
gang de laster siden uansett.

Stille er for eksempel:

- luft: margin, padding, gap, linjeavstand, justering av plassering
- størrelser: bredder, høyder, ikoner, avrundinger, skygger
- overganger og animasjoner

Ikke stille — skal ha føring etter resten av protokollen:

- all tekst i grensesnittet, og alt faglig innhold
- farger, fordi de kan bære betydning (som «over» og «cut-off»)
- noe som vises, skjules, flyttes til et annet sted eller får en ny rekkefølge
- tastatur, fokus, tilgjengelighet eller noe annet ved hvordan appen brukes
- en retting av noe brukerne har meldt eller merket som feil

Er du i tvil, er det ikke stille. En PR som ellers har en føring, tar med
designjusteringene sine i den. Er PR-en stille, skriv «Stille
designjustering: ingen føring i endringsloggen» i beskrivelsen av den i stedet
for punktet om endringsloggen, og hopp over resten av denne protokollen.

Appen ber bare brukerne oppdatere når versjonen de skal oppdatere til — den
nyeste føringen som varsles — er ny (`docs/oppdatering.md`). En stille PR
endrer ikke den, og det gjør heller ikke en føring med `utenVarsel`.

## 1. Har denne grenen alt en føring?

Det skal være **nøyaktig én føring per PR** som ikke er stille (steg 0),
uansett hvor mange pushes den har.

```
git diff --name-only --diff-filter=A origin/main...HEAD -- src/data/endringer/
```

Viser den en fil, ligger føringen alt inne på grenen: **rediger den**. Legg
aldri til en føring nummer to.

## 2. Skriv føringen

```
npm run endring -- patch     # eller minor / major, etter steg 3
```

Det lager `src/data/endringer/<id>.json` med en ny, permanent ID (tidspunktet i
UTC og seks tilfeldige tegn) og `opprettet`, og tomme tekstfelt. Fyll den ut:

```json
{
  "id": "20261116-094849-3170df",
  "semver": "minor",
  "opprettet": "2026-11-16T09:48:49Z",
  "sammendrag": "Én ekstremt kort linje om hva som ble gjort",
  "typer": ["Funksjonalitet"],
  "omfang": "Mindre omfang",
  "gjelder": ["fortolkning/thc"],
  "punkter": [
    "Det konkrete, i vanlig språk.",
    "Ett punkt per ting brukeren vil merke."
  ]
}
```

- `id` er lik filnavnet og endres aldri. Den er kjent før PR-en slås sammen,
  og det er den oppgaver og lenker viser til (steg 7).
- `semver` er leddet endringen øker (steg 3). **Ingen `versjon` og ingen
  dato:** versjonen og datoen i loggen får endringen når den slås sammen.
- `gjelder` utelates for en føring med `utenVarsel` (steg 4).
- Feil form, et ukjent felt eller et tomt felt stopper testene og byggingen
  med en melding om hva som er galt.

Filene ordnes ikke etter navnet eller `opprettet`; rekkefølgen i loggen er
rekkefølgen PR-ene slås sammen i.

## 3. Hvilket tall som økes

| Ledd | Når |
| --- | --- |
| MAJOR | Arbeidsflyten legges om slik at den som kan appen må lære den på nytt, eller fortolkningsgrunnlaget byttes ut. Sjelden. |
| MINOR | Appen kan noe den ikke kunne før: ny modul, ny kategori, ny valgmulighet, ny snarvei. |
| PATCH | Retting eller justering av noe som fantes fra før — utseende, ordlyd, tastaturdetaljer, og feil i eksisterende fortolkning. En ren designjustering er stille og får ingen versjon (steg 0). |

Ledd til høyre nullstilles: `0.5.4` → `0.6.0` → `1.0.0`. Det gjør byggingen;
føringen sier bare hvilket ledd (`"semver": "major" | "minor" | "patch"`).

## 4. Merker

**Type** — én eller flere:

| Merke | Gjelder |
| --- | --- |
| `Design / layout` | Utseende, plassering, luft, farger, ordlyd i grensesnittet |
| `Funksjonalitet` | Hva appen gjør: taster, flyt, felt, navigasjon |
| `Fag` | Analytter, enheter, grenser, formler, fortolkningsregler, kommentartekster |

`Fag` settes når endringen **kan endre kommentaren eller vurderingen** — også
når den bare retter opp noe som var feil.

### Når skal endringen gi varsel i bjella?

**Hovedregelen er ingen varsling.** Alle endringer føres i versjonsloggen.
Varsler skal informere kliniske farmakologer om det de trenger å vite for
å bruke OUSFAR riktig i sitt kliniske arbeid, ikke om hva utviklerne har
gjort. At en funksjon er ny eller en endring omfattende er ikke tilstrekkelig.

Vurder tre spørsmål:

1. Må klinikeren kjenne endringen for å forstå, utføre eller bruke
   fortolkningen riktig?
2. Har fagsidene fått så vesentlig ny eller endret klinisk funksjonalitet
   at klinikeren bør kjenne til den eller en endret arbeidsmåte?
3. Kan manglende kjennskap til endringen føre til en klinisk relevant
   feil, uriktig vurdering eller pasientsikkerhetsrisiko?

Bruk eksplisitte markører bare når minst ett kriterium er oppfylt:

- **`endrerFortolkning: true`** når endringen faktisk gir andre kommentarer
  eller vurderinger i fortolkningen, eksempelvis endrede regler i koden.
  Obligatorisk varsel. Publisering i selve appen varsles allerede av
  databasen og trenger ikke markøren.
- **`varsleFunksjonsendring: true`** ved vesentlige endringer i hvordan
  fortolkningen brukes, eller større endringer i fagsidenes sentrale
  kliniske funksjonalitet. Valgfritt varsel (på som standard). Eksempler:
  en ny klinisk fortolkningsmetode eller en sentral seksjon som «Analyse
  ved norske laboratorier».
- **`kritiskFagligVarsel: true`** ved kritisk faglig informasjon som kan
  påvirke pasientsikkerhet eller påliteligheten til kliniske konklusjoner,
  også uten funksjonsendring. Obligatorisk varsel.

Design, brukeropplevelse, navigasjon, ytelse, vanlige filtre, intern
administrasjon, rutinefeilrettinger, løpende faglig kuratering og interne
systemendringer varsles normalt ikke. Ved tvil: ikke varsle. Varsle om
det samlede klinisk vesentlige resultatet, ikke hver tekniske delendring.

**`utenVarsel: true`** er for endringer som ikke krever at brukeren oppdaterer
appen, som kodeføring av noe som allerede er rullet ut. Det undertrykker
vanlige funksjonsvarsler, men ikke obligatoriske varsler om endret
fortolkning eller kritisk faglig sikkerhet. De obligatoriske unntakene
krever også oppdatering hos brukere med gammel app. En vanlig endringsloggføring
uten varselmerker kan fortsatt kreve at appen oppdateres. Varsel i bjella
og oppdateringsmelding er to ulike mekanismer (se `docs/varsler.md` og
`docs/oppdatering.md`).

**`gjelder`** — sidene endringen gjelder. Brukerne bes bare om å oppdatere
når de står på en av dem; ellers tas versjonen i bruk når de går til en annen
side eller nullstiller fortolkningen (`docs/oppdatering.md`). Hver føring som
varsles, skal ha den; en test krever det. Et område er siden slik den står i
adressen, uten `#/` og uten seksjonen på siden, og gjelder også sidene under:

| Område | Gjelder |
| --- | --- |
| `fortolkning` | Hele fortolkningen: søket, hver analytt og redigeringen av reglene |
| `fortolkning/thc` | Fortolkningen av én analytt og redigeringen av den (nøkkelen fra adressen) |
| `fortolkning/*/rediger` | Redigeringen av reglene, for alle analytter |
| `stoff` | Alle fagsidene |
| `stoff/bupropion` | Én fagside |
| `sok` | Søkesiden i fagstoffet |
| `stoffregister` | Stoffregisteret |
| `verktoy` | Verktøyene: oversikten og hvert verktøy (`verktoy/bytte-antidepressiv`) |
| `grupper` | Gruppene: oversikten og siden til hver gruppe |
| `vinduer` | Vinduene som åpnes over sidene, som idéene, varslene og endringsloggen |
| `hele appen` | Noe som står på alle sider, som toppmenyen, sidemenyen og diskusjonene, eller noe felles for dem |

Sett så mange områder som trengs. Gjelder endringen noe som står på alle sider,
eller er du i tvil, bruk `hele appen`. En test kontrollerer at hvert område
finnes, så en skrivefeil ikke lar brukerne stå på en gammel versjon.

**Omfang** — ett merke, vurdert skjønnsmessig. Beskrivelsene er veiledende:

| Merke | Omtrent |
| --- | --- |
| `Minimalt omfang` | Én detalj, merkes bare om man ser etter |
| `Mindre omfang` | Én tydelig endring, ett sted |
| `Moderat omfang` | Flere steder, eller noe man legger merke til med én gang |
| `Større omfang` | Endrer hvordan man arbeider i appen |
| `Betydelig omfang` | Ny modul eller kategori, eller noe som preger hele appen |

## 5. Språk

Føringen leses av legene som bruker appen. Skriv som til en kollega, ikke som
til en utvikler: ingen filnavn, funksjonsnavn, klassenavn eller
PR-nummer. `sammendrag` er én linje og tåler å være abstrakt; `punkter` er det
konkrete.

## 6. Fullfør

Kjør `npm test`. Testene kontrollerer formen på føringen, merkene og sidene i
`gjelder`, og at hele loggen henger sammen. `package.json` og
`package-lock.json` har en fast, intern versjon (`0.0.0`) som ikke endres.

## 7. Oppgaver som viser til føringen

En planlagt oppgave merkes utført med **ID-en** til føringen
(`select public.fullfor_oppgave(7, '20261116-094849-3170df')`), som er kjent
før PR-en slås sammen. Appen slår opp føringen med ID-en og viser versjonen
den fikk. Eldre oppgaver viser til versjonen, og det virker fortsatt.

## Slik settes versjonsnummeret

Når appen bygges (`vite.config.ts`, også i testene), leses
førsteforelder-historikken til commiten som bygges
(`src/drift/endringshistorikk.ts`): commitene slik de ble lagt på `main`, én per
sammenslått PR. En endring regnes som publisert i commiten som la fila dens
dit, og endringene nummereres i den rekkefølgen, fra den øverste versjonen i
det frosne arkivet (`src/data/endringshistorikk.ts`, siste versjon 1.134.5).
Bare endringer i samme commit ordnes etter `opprettet` og så ID-en
(`src/domain/versjonering.ts`). Resultatet bygges inn i appen; nettleseren spør
ikke GitHub om noe.

- **Stabilt:** samme commit gir alltid samme numre, også når den bygges på nytt
  senere. En ny sammenslåing legger bare til commits etter de gamle, så den
  endrer aldri numrene til endringer som alt er publisert.
- **Konfliktfritt:** to PR-er legger til hver sin nye fil og rører ikke de
  samme linjene, så de kan slås sammen i hvilken som helst rekkefølge.
- **Grunne kloner:** Vercel kloner bare de siste ti commitene, og GitHub
  Actions ofte bare én eller to. Byggingen henter da resten av historikken fra
  `origin`, eller fra repoet byggetjenesten oppgir (repoet er offentlig).
- **Byggingen stopper heller enn å gjette** når historikken ikke kan hentes,
  når en publisert endring er slettet eller har fått nytt navn, når leddet en
  publisert endring økte, er endret, eller når en fil har feil form. Appen som
  alt er lagt ut, står da urørt.
- **Forhåndsvisninger:** i bygget av en PR-gren regnes grenens commits som om de
  var slått sammen nå. Numrene der er ikke endelige. Endringer som bare finnes
  i arbeidstreet, ikke i en commit, får foreløpige numre etter de andre.
- Datoen i loggen er datoen (norsk tid) for commiten som tok endringen inn i
  `main`.

## Tilbakerulling og retting

- En publisert føring fjernes aldri, og den får aldri nytt navn eller nytt ledd.
  En tilbakerulling er en ny endring med sin egen føring, som sier hva som er
  tatt bort. Byggingen stopper på en PR som sletter en publisert føring, som en
  ren «Revert» i GitHub gjør; legg da fila tilbake og skriv en ny føring.
- Teksten i en publisert føring kan rettes (skrivefeil, bedre ordlyd) uten at
  versjonen endres.
- Arkivet er frosset: ingenting legges til, endres eller fjernes der
  (`src/__tests__/endringsarkiv.test.ts`).

## PR-er laget før ordningen

En PR som ble laget før denne ordningen, har en føring øverst i det som nå er
arkivet, og en ny versjon i `package.json` og `package-lock.json`. Når den
oppdateres mot `main`, gir det konflikt i de tre filene. Én gang per PR, av
tråden som eier den:

1. Ta `main` sin utgave av `src/data/endringshistorikk.ts`,
   `src/data/endringslogg.ts`, `package.json` og `package-lock.json`
   (`git checkout origin/main -- <filene>` under sammenslåingen), og ta med
   eventuelle andre endringer PR-en har i `package.json` på nytt.
2. Lag føringen på nytt med `npm run endring -- <ledd>` og flytt teksten,
   merkene og `gjelder` over. Utelat `versjon` og `dato`.
3. Fjern versjonsnummeret fra tittelen på PR-en, og kjør `npm test`.

En oppgave som alt er merket utført med et versjonsnummer som ikke ble
publisert, merkes om med ID-en i en ny migrasjon.
