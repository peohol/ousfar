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

**Når stillingen styrer vaktene** (B14 i `docs/personal.md` §8.12, vedtatt av
Peder 26.11.2026): er brukeren aktiv medarbeider i et fagmiljø der
personalkalenderen følger medlemmene (`personal.stilling_styrer_vakter`, i dag
ingen virkelige fagmiljøer), gjelder ikke tabellen over. Da kan stillingen bare
endres av en annen som er lokal administrator i **hvert** slikt fagmiljø
(aktivt medlem og administrator, `intern.administrerte_fagmiljoer`, B2),
uansett hvilket fagmiljø endringen gjøres fra. Brukeren kan ikke endre den
selv, og systemarkitektrollen gir ingenting ekstra; en systemarkitekts
stilling krever i tillegg en systemarkitekt, som før.

Den ene avgjørelsen om hvem som kan sette stillingen til hvem, er
`intern.stillingsavslag(aktor, mal)`, også for B14. `sett_stilling` stopper med
den, `fjern_stilling` med erstatning stopper med den for hver som har
stillingen, og `medlemsoversikt` viser «Endre stilling» i brukerlista etter den
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

## Stilling per dag

Innført 28.11.2026 for personalkalenderen (#602, `docs/personal.md` §7.4 og
§8.5), i `supabase/migrations/20261128094000_stillingshistorikk.sql`. Stillingen
styrer forventet antall vakter, så et bytte skal ikke skrive om tidligere dager.

- `intern.stillingshistorikk` har én rad per endring: brukeren, datoen den
  gjelder fra og stillingen (tom: uten stilling). En rad gjelder til dagen før
  den neste, så det kan verken bli hull eller overlapp, og ingen rad er lik den
  før. Uten rad er man uten stilling. De som hadde en stilling da historikken
  ble innført, fikk den som første rad med åpen startdato.
- Den gjeldende raden er alltid `profiles.stilling_id`. En utløser på `profiles`
  fører hver endring, uansett vei: «Kontoen din», «Brukere» i hvilket som helst
  fagmiljø, eller en erstatning når en stilling fjernes fra lista.
- En endring gjelder **fra i dag** (norsk tid, `intern.stillingsdag()`), aldri
  bakover. Flere endringer samme dag gir dagens siste. En vakt på tabellen
  stopper også en direkte endring av en tidligere dag; bare dagens rad kan
  endres. Historikken går med kontoen hvis den slettes (for en medarbeider i
  kalenderen stopper kalenderen slettingen til B9 er avgjort).
- **Katalogendringer skriver ikke om historikken.** Den viser til stillingen
  med ID-en, så nytt navn eller ny kategori er den samme stillingen. Fjernes
  en stilling noen har hatt, huskes den med navnet i
  `intern.fjernede_stillinger`, og ID-en står i historikken, så vektene per
  stilling for tidligere dager står. Lista i appen er bare de som finnes.
- **Lesingen er på serveren**, for funksjonene til personalkalenderen;
  nettleseren når ikke tabellene eller funksjonene:
  - `intern.stillingsperioder(brukere uuid[], periode_fra date, periode_til date)`
    gir stillingen til hver bruker som sammenhengende perioder som dekker hver
    dag i perioden nøyaktig én gang: `bruker_id`, `fra`, `til`, `stilling_id`,
    `stilling` (navnet) og `fjernet` (stillingen er fjernet fra lista).
    Fremtidige dager har dagens stilling.
  - `intern.stilling_pa_dag(bruker uuid, dag date)` gir stillingen én dag.
- Testene står i `src/__tests__/stillingshistorikk.test.ts` (bytte, uten
  stilling, flere fagmiljøer med og uten myndighet, katalogendringer, og at
  historikken ikke kan få hull eller overlapp).

## Når en stilling fjernes

En stilling ingen har, fjernes med to trykk. En stilling noen har, kan ikke
forsvinne under dem: fremmednøkkelen fra `profiles` stopper det
(`on delete restrict`). I appen åpner «Fjern» en side som viser hvem som har
stillingen, med fagmiljøene deres (`brukere_med_stilling`), og systemarkitekten
velger enten

1. **alle på én gang**: én ny stilling til alle, og stillingen fjernes i samme
   operasjon (`fjern_stilling(stilling, erstatning)`). Har noen av dem en
   stilling som styrer vaktene (B14) uten at systemarkitekten har myndighet
   over den, avvises erstatningen, og de må få en ny stilling der først, eller
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
