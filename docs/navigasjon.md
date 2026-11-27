# Navigasjon: adresser, tilbake, Escape og hovedmenyen

Fasit for hvordan brukeren flytter seg i appen, innført i D1 av
`docs/ux-dashboard-chat-navigasjon-plan.md` etter designet i
`docs/design/d0-dashboard-chat/flyt.md`. Senere faser bygger på dette og
endrer det ikke uten å oppdatere denne fila.

## Adressene

Adressefeltet er fasit (`src/domain/rute.ts`, `useRute`). Hver side har sin
egen adresse, og en adresse som leses og skrives igjen, er den samme.

| Adresse | Side |
| --- | --- |
| `#/` (og tom adresse) | Forsiden |
| `#/fortolkning` | Fortolkningssøket |
| `#/fortolkning/<nøkkel>` | Fortolkningen av en analytt eller modul |
| `#/fortolkning/<nøkkel>/rediger…` | Redigeringen av reglene |
| `#/stoff/<nøkkel>`, `#/sok?q=…`, `#/stoffregister`, `#/verktoy…`, `#/grupper…` | Fagsider, søk, register, verktøy og grupper som før |
| `#/chat`, `#/chat/gruppe/<ID>`, `#/chat/direkte/<ID>` | Chatten som helside, med samtalen som er valgt: en gruppechat eller en direktesamtale (`docs/gruppechat.md`, «Chatmenyen»; `docs/direktemeldinger-personvern.md`) |
| Alt annet | «Siden finnes ikke», med adressen urørt og en knapp til forsiden |

Gamle adresser skrives om uten ny oppføring i historikken: `#/analytt/HBUP`
blir `#/fortolkning/hbup`, og direktelenkene (`docs/direktelenker.md`) setter
adressen til siden de åpnes over. En adresse som peker på noe brukeren ikke
har tilgang til (et verktøy uten administratorrolle), går til forsiden.

Fortolkningen står montert hele tiden, skjult bak de andre sidene, så en
påbegynt fortolkning står der den sto når brukeren går tilbake til den.
«Åpne fortolkning» på forsiden og snarveien i hovedmenyen åpner derimot alltid
søket; analytten som sto, ligger igjen i historikken. Søkefeltet får fokus
hver gang fortolkningen kommer fram.

## Tilbake og Lukk: inngangsveien

Hver oppføring i nettleserens historikk merkes med adressen i appen brukeren
kom fra (`history.state.ousfarFra`, se `src/hooks/useRute.ts`):

- en adresse: brukeren kom hit fra den siden i appen;
- `null`: appen ble åpnet her, fra et bokmerke, en lenke utenfra eller en ny fane.

`tilbake(reserve)` (fra `useRute`) går ett steg tilbake i historikken bare når
oppføringen har en adresse i appen å gå til. Ellers erstatter den adressen med
reserven, som er forsiden med mindre siden sier noe annet. Brukeren sendes
dermed aldri ut av appen av Lukk eller Escape, og nettleserens egne tilbake-
og framknapper virker som før.

Hver side som kan lukkes, lukkes med `tilbake`, både med Lukk og med Escape
(`useLukkMedEscape`), også mens den hentes eller viser en feil. Det gjelder
også en tidligere versjon av en fagside og en kurateringsgren; «Til fagsiden»
der er en egen, uttrykkelig handling.

Skriv aldri `window.location.replace` for å bytte side: den nullstiller
merket. Bruk `gaaTil(rute, { erstatt: true })` i komponentene eller
`erstattAdressen(adresse)` utenfor React.

## Gruppene og arbeidsflatene (D3)

`#/grupper` er gruppeoversikten, og Tilbake går til forsiden. Gruppesiden
`#/grupper/<id>` har reserven `#/grupper`. Den gamle chatsiden
`#/grupper/<id>/chat` (D4b) åpner gruppesiden med samtalen i chatmenyen og
skrives om til `#/grupper/<id>` med `erstattAdressen`, uten en ny oppføring i
historikken.

Idéene og oppgavene i en gruppe er arbeidsflater:
`#/grupper/<id>/ideer[/<idé>]` og `#/grupper/<id>/oppgaver[/<oppgave>]`.
En arbeidsflate er et stort lag (`Modallag` med `arbeidsflate`) over siden den
ble åpnet fra (`flatebakgrunn` i `src/components/grupper/arbeidsflate.ts`):

- fra en side i appen, som forsiden, et varsel eller gruppesiden: den siden
  står bak, og Tilbake, ×, Escape og nettleserens tilbake går dit;
- fra en lenke utenfra, eller fra en annen arbeidsflate: gruppen står bak, og
  lukkingen erstatter adressen med gruppen (`tilbakeTil`), så brukeren
  ikke går ut av appen.

Et valg i lista på flaten erstatter adressen (`erstattAdressen`) og legger
ingenting i historikken; lukkingen går derfor til samme sted uansett hvor
mange idéer brukeren har sett på.

## Ulagret arbeid og nettleserens tilbake

Hver oppføring merkes også med sin plass i historikken
(`history.state.ousfarNr`). Et skjema med ulagrede endringer melder seg som
navigasjonsvakt (`useNavigasjonsvakt`, `src/hooks/navigasjonsvakt.ts`). Går
brukeren tilbake eller fram i nettleseren mens en vakt har endringer, setter
`useRute` adressen tilbake der den sto og lar vakten spørre; forkaster
brukeren endringene, tas det samme steget igjen. Tilbake, × og Escape går
gjennom den samme vakten.

## Escape: lagstakken

Lag som legger seg over siden, som hovedmenyen og et nedtrekk, melder seg på
i lagstakken mens de står åpne (`useEscapelag`, `src/hooks/lagstakk.ts`). Én
lytter i vinduet gir trykket til laget som ble åpnet sist, og bare det:

1. Har et felt eller en knapp alt brukt trykket (`preventDefault`), som når
   søkefeltet tømmes, lukkes ingenting.
2. Står et dialogvindu åpent, lukker nettleseren det, og lagene utenfor
   vinduet får ikke trykket. Et lag inni vinduet, som et nedtrekk i et skjema,
   får det, og bare det lukkes: `Modallag` lar tasten gå forbi seg mens det
   øverste laget står inni vinduet (`overstLagInni`), også når skjemaet har en
   vakt mot ulagrede endringer. Neste trykk går til vinduet.
3. Ellers lukkes det øverste laget, og trykket tas fra resten av appen.

Sidene (`useLukkMedEscape`) og fortolkningens taster (`useKeyboard`) ligger i
ro så lenge et lag står åpent, og hører ikke på et trykk som alt er brukt.

I fortolkningen går Escape bakover gjennom fortolkningens egne trinn og
stopper i søket: der tømmer det søkefeltet, og et nytt trykk gjør ingenting.
Til forsiden går brukeren med knappen «Til forsiden» eller snarveien i
hovedmenyen.

Chatten (D4a) har to lag i stakken: helsiden `#/chat`, der Escape er
«Gjenopprett» (tilbake etter inngangsveien, med chatmenyen åpen på samme
samtale), og chatmenyen mens fokus står i den, der Escape slipper fokus på
brede flater og lukker på smale. Menyen blir stående til den lukkes med ×.
Fokus står i menyen når det kom dit med tastaturet, i et felt, eller når appen
selv flyttet det dit, som når menyen åpnes med pekeren (D7); da når Escape
aldri fortolkningen bak.

Et nytt lag som skal lukkes med Escape, bruker `useEscapelag` og lytter ikke
etter tasten selv. Testene står i `src/__tests__/lagstakk.test.tsx` og under
«forsiden og veien tilbake» i `src/__tests__/navigasjon.test.tsx`.

## Hovedmenyen

Hovedmenyen (Ctrl + M, menyknappen øverst til venstre) er et hierarki av
menynivåer (Issue #604). Et valg med undermeny erstatter innholdet i
menypanelet med nivået under; det ekspanderer ikke og åpner ikke et nytt
panel ved siden av.

```
Meny
├─ Forsiden · Fortolkning
├─ Fag
│  ├─ Stoffregister: søk, «Hele stoffregisteret», stoffkategoriene
│  │  └─ <kategori>: stoffene, med underkategoriene som mellomoverskrifter
│  ├─ Verktøy: «Verktøyoversikten» og verktøyene (for dem som ser verktøyene)
│  └─ Favoritter
├─ Personal (når det har et valg; OUSFAR Personal)
├─ Grupper · Chat (når chatten er på) · Endringsforslag
├─ Apputvikling: Idéer for appen, Planlagte oppgaver (systemarkitektene)
└─ Administrasjon: valgene etter rollen (`ADMINVALG`)
```

### Arkitekturen

- **Modellen** står i `src/components/meny/menytre.ts`: et nivå
  (`Menyniva`) har avsnitt med valg (`Menypunkt`), og et valg er en lenke
  (`adresse`), en handling (`handling`, som åpner et vindu) eller en
  undermeny (`undermeny`). Et valg kan ha ikon, en linje under navnet, et
  tall eller en merknad til høyre (`merke`, `hint`), noe nytt (`nytt`), en
  knapp ved siden av (`tillegg`) og om det er siden brukeren står på
  (`gjeldende`). Et nivå kan ha et søkefelt (`sok`), en bryter (`bryter`) og
  en tekst når det er tomt (`tomt`).
- **Hovedmenyens tre** bygges i `useHovedmenyen`
  (`src/components/Menynavigasjon.tsx`); Fag i `meny/fagmeny.ts`. Et nytt
  valg eller en ny undermeny er én oppføring der, uten egen kode for
  visning, tastatur, varsler eller tilstand.
- **Visningen** er `Sidemeny` (panelet, toppfeltet, stien og tastene) og
  `meny/Menyniva.tsx` (innholdet i ett nivå), med stilene i `sidemeny.css`.
  Bare nivået brukeren står på, tegnes.

### Tilgang og varsler

- Et valg brukeren ikke skal ha, får `vis: false` (eller tas ikke med).
  `rensNiva` tar bort skjulte valg og undermenyer uten innhold, også når
  innholdet ble borte lenger ned, så en tom undermeny aldri vises. Å skjule
  et valg er ingen tilgangskontroll: databasen, Edge-funksjonene og sidene
  kontrollerer selv (adressen til et verktøy fører fortsatt til forsiden for
  den som ikke ser verktøyene).
- **Personal** har ingen valg ennå og vises derfor ikke. OUSFAR Personal
  legger Kalender inn i `PERSONALVALG` når den bygges, bare synlig for
  systemarkitektene til personalfunksjonene er godkjent og senere bak
  funksjonsbryterne per fagmiljø (#598, `docs/personal.md`).
- Det som venter (`nytt`), gir en prikk ved valget, ved alle valgene som
  fører ned til det, og på menyknappen, med teksten i navnet. Et valg med
  et tall (`merke`, som «2 invitasjoner») får ikke prikk i tillegg. Chatten
  og forslagene står med tallet sitt, men gir ingen prikk på menyknappen.
- Siden brukeren står på, merkes med `aria-current="page"`; valgene som
  fører ned til den, får et svakere merke (`data-gjeldende="under"`).

### Navigasjonen i menyen

- Toppfeltet står fast med nivåets navn, «Tilbake til …» på undernivåene,
  «Til hovedmenyen» fra nivå to og dypere, og «Lukk menyen» på alle nivåer.
  Under det står ett rulleområde i hele høyden; ingenting annet i panelet
  ruller, og ingen knapper står fast nederst.
- Stien (`sidemeny/sti`), søket i nivået (`sidemeny/sok`) og «Vis
  underkategorier» tas vare på med `useBevart`, så menyen åpnes igjen på
  nivået den sto, også etter en oppdatering. Rulleplassen på nivået
  brukeren gikk fra, står der igjen når hen går tilbake. En sti til et nivå
  brukeren ikke lenger har, kortes av der det slutter.
- Nivåene legger ingenting i nettleserens historikk. Menyen lukkes når en
  lenke følges eller en handling åpner et vindu, ikke når nivået byttes. En
  lenke som åpnes i en ny fane (Ctrl, Cmd, Shift eller midtknappen), lar
  menyen stå.
- Tastaturet: Ctrl + M åpner og lukker; pil opp og ned går mellom valgene og
  søkefeltet (også fra panelet rett etter åpning); høyre eller Enter går inn
  i en undermeny, med fokus på det første feltet der; venstre går tilbake,
  med fokus på valget brukeren kom fra; tabulator går rundt i panelet.
  Escape tømmer et søkefelt med tekst, og lukker ellers menyen gjennom
  lagstakken. Fra pekeren får nivåets navn fokus, så skjermlesere sier hvor
  brukeren er.
- Et nytt nivå glir kort inn fra siden det kom fra; uten bevegelse
  (`prefers-reduced-motion` eller valget i Innstillinger) står det der med det
  samme.
- På smale flater fyller panelet hele bredden, trykkflatene er minst 44 px,
  og toppfeltet blir lavere på lave skjermer (som en telefon som ligger).
  Høyden følger mobilnettleserens synlige høyde (`100dvh`), og toppfeltet og
  lista holder seg innenfor de sikre områdene.

### Stoffregisteret i menyen

Søkefeltet øverst finner stoffene på begynnelsen av ordene i navnet og de
andre navnene (`navneord` og `begynnerOrd` i `faginnhold/sok.ts`, det samme
som verktøysøket), uten å hente noe; søket og navnene deles likt på
bindestrek, komma og andre skilletegn, så «THC-COOH» og
«3,4-metylendioksymetamfetamin» treffer. Som i fagsøket treffer søket også
når navnenøkkelen (`domain/sokenavn.ts`) til navnet begynner med søkets, så
«THCCOOH» og «kvetiapin» finner det samme som «THC-COOH» og «quetiapin».
Treff på et annet navn viser det navnet ved siden av. Kategoriene står med ikonet og antallet stoffer. En kategori
viser stoffene med underkategoriene (som SSRI, SNRI og TCA) som
mellomoverskrifter, eller i én bolk med «Vis underkategorier» av. Hvert stoff
lenker til fagsiden; laboratoriets koder står aldri her
(`docs/domener.md`). Menyen bruker det samme registeret som helsiden
(`Stoffregisterkilde`) og henter ingenting selv ved oppstart; tallet på
forslag som venter, hentes først når menyen åpnes.

Testene står i `src/__tests__/menytre.test.ts` (modellen og Fag),
`src/__tests__/toppmeny.test.tsx` («hovedmenyen») og
`src/__tests__/navigasjon.test.tsx` («stoffregisteret i hovedmenyen»), og
nettleserkontrollen i `src/__tests__/qa/hovedmenynettleser.ts`.
