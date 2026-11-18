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

Appen og databasen rulles ut hver for seg. Databasen gir fortsatt koblingene,
forbindelsene og datakortbruken i `les_analyttkatalog()`, og
`les_stoffreferanseomrader` står, så faner med appen fra før virker til de
lastes på nytt.

Møter den nye appen en database der migrasjonen ikke er kjørt ennå (eller der
den stoppet), har katalogen ikke referanseområdene. Da finner fortolkningen
dem som før, på fagsidene, etter samme regel som migrasjonen kopierer dem med,
og steg 2 viser de samme tallene før og etter (`lesReferanseomrader` i
`src/katalog/referanseomrader.ts`). Kan de ikke leses, sier fortolkningen fra i
stedet for å vise steg 2 uten grensene. Det er det eneste stedet fortolkningen
leser fra fagsidene.

Når overgangen er over, fjernes dette sammen med feltene fra før i
`les_analyttkatalog()`, `les_stoffreferanseomrader`, `analyttkatalog_koblinger`
og `analyttkoblede_stoffer` (#405); det er en sletting og venter på Peders ja.

