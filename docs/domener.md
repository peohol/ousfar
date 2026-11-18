# Fortolkningen og fagsidene: to adskilte domener

Bestemt av Peder 18.11.2026: fortolkningssidene og fagsidene er helt adskilte
domener i appen. Dette dokumentet er fasit for skillet; andre dokumenter
viser hit.

## Prinsippet

- **Fortolkningen** (`#/fortolkning/…`) hører til fagmiljøet: analyttkatalogen
  med kodene, analysemetodene, fortolkningsreglene, kommentarene og
  referanseområdene over knappene i steg 2.
- **Fagsidene** (`#/stoff/…`, stoffregisteret, fagsøket) er felles faginnhold
  om stoffene: kategoriene, oppsummeringen, datakortene i «Viktige data»,
  forbindelsesregisteret og de eksterne kildene.
- Ingen av dem viser, lenker til, leser fra eller søker i den andre:
  - fagsidene, sidemenyen, stoffregisteret og fagsøket viser ingen
    analysekoder, analysemetoder eller setninger om hva en analyse måler, og
    har ingen «Åpne fortolkning»;
  - fortolkningen har ingen «Åpne fagside» og ingen kodepiller som lenker til
    fagsider;
  - fortolkningen leser ikke datakortene på fagsidene, og fagsidenes
    datakortplasser kommer ikke av katalogens koder;
  - fagsøket indekserer ikke kodene, og en gammel adresse `#/analytt/KODE`
    fører til fortolkningen av koden, aldri til en fagside.
- Begge kan bruke det samme forbindelsesregisteret (`src/kjemi/forbindelser.ts`)
  og de samme kildene, men aldri hverandres data.

## Referanseområdene i fortolkningen

Hver kode i analyttkatalogen har sitt eget referanseområde
(`analyttkatalog_koder.referanseomrade`: `{nedre, ovre, enhet}` eller `null`),
som `les_analyttkatalog()` gir og appen viser over knappene i steg 2
(`referanseomraderI` i `src/domain/analyttkatalog.ts`). Det er fagmiljøets
eget og endres med en migrasjon, som resten av katalogen; en endring på en
fagside endrer det ikke.

Verdiene ble kopiert én gang i databasen fra kortene fortolkningen viste fram
til da (`20261118090000_fortolkning_skilt_fra_fagsidene.sql`): det publiserte
kortet «Referanseområde» på siden til kodens primære stoff. Ingen verdier ble
endret, og ingen står i repoet (`src/__tests__/referanseomrader.test.ts`
prøver kopieringen med syntetiske tall).

## Datakortplassene på fagsidene

En fagside har plass til sine egne datakort og til kortene for hver forbindelse
som har `datakort: true` for stoffet i forbindelsesregisteret
(O-desmetyltramadol på tramadolsiden, nordiazepam på diazepamsiden), og for
hver annen forbindelse siden alt har kort for
(`src/faginnhold/datakortplasser.ts`). Nye plasser legges til i
forbindelsesregisteret i en PR.

## Overgangen

Da skillet kom, sto koblingene fra kodene til stoffene fortsatt i databasen for
faner med appen fra før, og appen kunne finne referanseområdene på fagsidene
mens databasen ikke var oppdatert. Begge deler er fjernet, etter Peders ja
(`20261118120000_koblingene_fjernet.sql`, #405): tabellene
`analyttkatalog_koblinger` og `analyttkoblede_stoffer`, kolonnene `forbindelse`
og `datakort` i `analyttkatalog_koder` og funksjonen
`les_stoffreferanseomrader`. Det ene datakortet med en analyttkode i `gjelder`
(OTRAM på tramadolsiden) gjelder nå forbindelsen, og databasen tar bare imot
en forbindelsesnøkkel der.

Peder bestemte 18.11.2026 at slettingen skulle komme med en gang. Å vente gir
ingen sikkerhet, siden en fane kan stå åpen hvor lenge som helst. Slik går det
med en fane som fortsatt har appen fra før skillet (#457):

- Den har alt hentet katalogen og referanseområdene, og beholder dem når en ny
  henting feiler (`useHenting`). Tallene er de samme som nå. Den viser aldri
  et steg 2 uten grensene eller med andre tall.
- Det den henter på nytt etterpå, feiler med en melding. Det gjelder
  katalogen ved et bytte av fagmiljø. Den lastes på nytt, og da er det den
  nye appen (det finnes ingen service worker som holder på den gamle).
- Omskrivingen av kortet og slettingen av `les_stoffreferanseomrader` skjer i
  samme transaksjon. Derfor finnes det ikke et øyeblikk der appen fra før
  15.11 (som finner kortet bare med koden) kunne lese kortet uten koden.
