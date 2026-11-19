# Stillinger

Leses før noe som har med brukernes stilling å gjøre, endres: lista, hvem som
kan sette stillingen til hvem, og hvor den vises. Innført 19.11.2026 etter
Peders ønske; migrasjonen er `supabase/migrations/20261119125000_stillinger.sql`.

## Kort fortalt

Hver bruker kan oppgi stillingen sin fra en fast liste, eller stå uten. Lista
er data i databasen, ikke kode: kategorier med stillinger i, i en rekkefølge
systemarkitektene bestemmer. Den startet slik Peder ga den:

| Kategori | Stillinger |
| --- | --- |
| Leger | LIS, Overlege |
| Laboratorieansatte | Bioingeniør, Kjemiker, Overingeniør |
| Annet | Fortolkningsrådgiver, Administrasjonskonsulent |

Herfra endres lista bare i appen, under «Stillinger» i administrasjonen.

## Hvem kan hva

| Hvem | Kan |
| --- | --- |
| Brukeren selv | Velge eller fjerne sin egen stilling i «Kontoen din» |
| Lokal administrator | Sette stillingen til medlemmene (også inviterte) i fagmiljøene hen administrerer, i «Brukere», men ikke til en systemarkitekt |
| Systemarkitekt | Sette stillingen til alle, og endre lista: legge til, gi nytt navn, flytte og fjerne kategorier og stillinger |

Den ene avgjørelsen om hvem som kan sette stillingen til hvem, er
`intern.stillingsavslag(aktor, mal)`. `sett_stilling` stopper med den, og
`medlemsoversikt` viser «Endre stilling» i brukerlista etter den
(`endre_stilling`). Katalogvakten kaller kontrollen `stillingsmyndighet`
(`docs/fagmiljoer.md`, «Katalogvaktene»). Endringene av lista krever
systemarkitekt (`intern.krev_systemarkitekt`) og går etter hverandre under én
lås.

## Hvor stillingen står

- `profiles.stilling_id` er stillingen, eller `null`. Den hører til
  profilkortet (`PROFILKORT` i `supabase/functions/_delt/profil.ts`), så den
  som ser profilen til en annen, ser også stillingen, med de samme reglene som
  for navnet og bildet (`docs/fagmiljoer.md`, «Profiler og profilbilder»).
  Kolonnen kan ikke skrives fra nettleseren; den settes med `sett_stilling`.
- `stillingskategorier` og `stillinger` leses av alle med aktivt medlemskap.
  De er ikke personopplysninger.
- I appen henter `src/stillinger/katalog.ts` lista én gang per innlogging og
  deler den (`useStillinger`). Navnet til en brukers stilling slås opp med
  `stillingsnavn(katalog, profilkort)`; en flate som viser profilkort, trenger
  altså ikke noe eget oppslag i databasen.
- Profilkortet ved hovering får navnet på stillingen fra databasen, i svaret
  fra `profilkortdetaljer` (`docs/fagmiljoer.md`, «Profilkortet»), med de
  samme synlighetsreglene som resten av kortet.
- Valget vises med `Stillingsvelger` (`src/components/stillinger/`), med
  kategoriene som grupper.

## Når en stilling fjernes

En stilling ingen har, fjernes med to trykk. En stilling noen har, kan ikke
forsvinne under dem: fremmednøkkelen fra `profiles` stopper det
(`on delete restrict`). I appen åpner «Fjern» en side som viser hvem som har
stillingen, med fagmiljøene deres (`brukere_med_stilling`), og systemarkitekten
velger enten

1. **alle på én gang**: én ny stilling til alle, og stillingen fjernes i samme
   operasjon (`fjern_stilling(stilling, erstatning)`), eller
2. **én og én**: en ny stilling per bruker (`sett_stilling`). Når ingen har den
   lenger, kan den fjernes.

`fjern_stilling` holder stillingen låst mens den gjøres, og `sett_stilling`
holder stillingen den setter, så en bruker ikke kan få en stilling som er i
ferd med å forsvinne. En kategori kan bare fjernes når den er tom.

## Navnene

Et navn er trimmet, uten doble mellomrom, og 1–60 tegn, som fornavn og
etternavn (`normaliserNavn` og `navnFeil` i `@delt/profil`; databasen har
`intern.er_stillingsnavn`, og en test holder dem like). Navnene er unike i hele
lista uten hensyn til store og små bokstaver, og en tekst som ligner et
fødselsnummer, avvises som andre steder (`docs/pasientopplysninger.md`).
