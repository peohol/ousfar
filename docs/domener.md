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

Appen leser referanseområdene bare fra katalogen. Overgangen i appen, som fant
dem på fagsidene mens databasen ikke var oppdatert, er fjernet (#457); alle
databaser har områdene i katalogen (`20261118090000`).

Databasen gir fortsatt koblingene, forbindelsene og datakortbruken i
`les_analyttkatalog()`, og `les_stoffreferanseomrader` står, så faner med
appen fra før skillet virker til de lastes på nytt. Det samme gjelder
datakortet med analysekoden OTRAM på tramadolsiden: appen fra før 15.11.2026
finner det bare med koden, og den nåværende appen leser det som kortet for
forbindelsen.

Det fjernes i én migrasjon når ingen slike faner er i bruk (#405): kortet
skrives om til forbindelsen, `gjelder` får bare ta imot en forbindelsesnøkkel,
og feltene fra før, `les_stoffreferanseomrader`, `analyttkatalog_koblinger` og
`analyttkoblede_stoffer` slettes. Peder har sagt ja til slettingen. Den kommer
tidligst 25.11.2026, og bare når databasen viser at ingen har kalt
`les_stoffreferanseomrader` de siste 72 timene. Bare appen fra før skillet
kaller den (`pg_stat_statements`).

