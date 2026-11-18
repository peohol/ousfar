# Navigasjon: adresser, tilbake og Escape

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
| `#/chat`, `#/chat/gruppe/<ID>` | Chatten som helside, med samtalen som er valgt (`docs/gruppechat.md`, «Chatmenyen») |
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

Et nytt lag som skal lukkes med Escape, bruker `useEscapelag` og lytter ikke
etter tasten selv. Testene står i `src/__tests__/lagstakk.test.tsx` og under
«forsiden og veien tilbake» i `src/__tests__/navigasjon.test.tsx`.
