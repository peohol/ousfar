# Den personlige forsiden

Forsiden (`#/`) er der appen åpner. Den har tre deler, ovenfra og ned:

1. **Fagmiljøet** brukeren arbeider i, som overskrift, med «Tilpass forsiden»
   til høyre. Den runde pila ved navnet har de samme valgene som «Fagmiljø» i
   kontomenyen (`useFagmiljobytte`), og står bare der når det er noe å velge.
   En systemarkitekt ser fagmiljøene hen ikke er medlem av, merket «Ikke
   medlem»; valget gjør hen ikke til medlem.
2. **Fortolkningen**, som den ene hovedhandlingen. «Åpne fortolkning» har fokus
   når siden åpnes, så `Enter` tar brukeren rett inn, og virker før panelene er
   hentet. Den kan ikke skjules eller flyttes.
3. **Panelene** brukeren har valgt, i to uavhengige kolonner (én på smal
   skjerm, under 56em): brukerens rekkefølge fordeles annethvert, første
   øverst til venstre og andre øverst til høyre, og hvert panel står rett
   under det forrige i sin kolonne, så et høyt panel ikke gir luft i
   nabokolonnen (`iKolonner`). Hvert panel har inntil tre hendelser i `Oppsummeringskort`
   (`src/components/oppsummering/`). Hele raden fører til selve hendelsen:
   idéen eller kommentaren, tråden, forslaget, oppgaven, gruppen eller delen av
   fagsiden, ikke til en liste.

Plan og skisser: `docs/ux-dashboard-chat-navigasjon-plan.md` §4 og
`docs/design/d0-dashboard-chat/` (skisse 01–05 og 24).

## Panelene

| Panel | Standard | Innhold | Hentes fra |
| --- | --- | --- | --- |
| Viktig nytt | på | Endret fortolkning, og føringer i endringsloggen som er varsler (kritisk faglig, fortolkning, ny funksjon). Uleste først. | `forsideoppsummering('viktig_nytt')` + endringsloggen i appen |
| Aktuelt for deg | på | Invitasjoner til grupper, så uleste varsler om forslag til behandling, gruppeoppgaver, egne forslag, egne idéer og egne diskusjoner. Følger brukerens varselvalg. | `forsideoppsummering('aktuelt')` |
| Mine grupper | på | Aktive grupper brukeren er aktivt medlem av, de med noe nytt først, med «N nye». | `forsideoppsummering('grupper')` |
| Oppdaterte fagsider | på | Fagsider med publiserte endringer siste 30 dager, uten rutinejobber, med delene som ble endret. | `forsideoppsummering('fagsider')` |
| Nytt i idébanken | av | Uleste og nylige varsler om nye idéer, felles og i gruppene. | `forsideoppsummering('ideer')` |
| Mine oppgaver | av | Åpne gruppeoppgaver brukeren er ansvarlig for, høy prioritet først. | `forsideoppsummering('oppgaver')` |
| Diskusjoner jeg følger | av | Varsler fra aktive diskusjoner og diskusjoner på favorittsider. | `forsideoppsummering('diskusjoner')` |
| Favorittfagsider | av | De siste favorittene, som snarveier. | Favorittene appen alt har |

«Nylig besøkt» er utsatt: den krever ny lagring av hva brukeren ser på.

Panelene gjenbruker det som alt finnes: varslene (`docs/varsler.md`) med de
samme tekstene og direktelenkene som varselvinduet, gruppesamhandlingen,
invitasjonene fra `mine_grupper()` og endringsloggen. Forsiden fører ingen
egen hendelseslogg.

En rad fra varslene merkes lest når den trykkes, som i varselvinduet. En
føring i endringsloggen har ingen egen adresse; raden åpner endringsloggen med
føringen og merker den lest i bjella (`merkEndringerLestIBjella`), som
varselvinduet gjør. «Alle varsler» åpner varselvinduet (`apneVarsler`). Kritiske
meldinger står i bjella uansett om «Viktig nytt» er skrudd av.

## Databasen: `forsideoppsummering(modul)`

Én smal funksjon, kalt én gang per panel, så hvert panel laster og feiler for
seg. Panelene venter med å hente til rettighetene, og dermed fagmiljøet, er
kjent (`useArbeidskontekst`), så hvert hentes én gang og ikke først uten og så
med fagmiljøet; overskriften står tom så lenge, ikke «OUSFAR» et øyeblikk (D7).
Den gir aldri mer enn tre rader, og filtrerer på tilgang i databasen:

- Brukeren må ha aktivt medlemskap (`intern.krev_aktivt_medlemskap`).
- Fagmiljøet er det serveren har som arbeidsfagmiljø (`intern.arbeidsfagmiljo`),
  ikke noe appen sender. Varsler fra et annet fagmiljø vises ikke.
- Varsler er bare brukerens egne, og bare der hen fortsatt kan lese
  samhandlingen (`intern.kan_lese_samhandling`): den som er tatt ut av en
  gruppe, ser ikke varslene derfra.
- Grupper er bare aktive grupper der brukeren er aktivt medlem. Arkiverte
  grupper vises ikke, heller ikke for en systemarkitekt.
- Oppgaver er bare åpne oppgaver i aktive grupper brukeren kan lese.

Svaret har `lest_kl`, så et varsel merkes lest slik det var da det ble vist.
Varslene bygges av `intern.varselsvar`, den samme som `mine_varsler()` bruker.
Testene står i `src/__tests__/forside.test.ts`.

## Brukerens oppsett

Oppsettet er én ordnet liste `{ modul, synlig }` per bruker, lagret i
brukerinnstillingene under `forside.moduler` (bare egne rader, RLS). Det er det
samme på alle maskiner og i alle fagmiljøer; innholdet følger fagmiljøet.

- Standarden (eller det siste kjente) tegnes med en gang; når det lagrede er
  hentet, byttes oppsettet uten at fokus flyttes. En endring brukeren gjør
  før det er hentet, vinner.
- Paneler appen ikke kjenner, hoppes over. Et panel som er kommet til siden
  brukeren lagret, legges nederst og skjult (`lesOppsett`).

«Tilpass forsiden» (`Modallag`) har én bryter og opp/ned per panel, og
«Gjenopprett standard». Ingen dra-og-slipp, så alt går like godt med tastatur
og skjermleser. Hver endring gjelder og lagres med en gang.

## Fagmiljøbytte

Det som er hentet, holdes per bruker, fagmiljø og panel mens appen står åpen,
så forsiden ikke blinker når brukeren kommer tilbake. Nøkkelen har fagmiljøet:
etter et bytte vises aldri det forrige fagmiljøets innhold, heller ikke mens
det nye hentes.

## Filene

- `src/forside/` — panelene, oppsettet og kallene (rene funksjoner og API)
- `src/components/forside/` — forsiden, panelene, overskriften og «Tilpass forsiden»
- `src/styles/forside.css`
- `supabase/migrations/20261118211000_forsideoppsummering.sql`
- Tester: `forside.test.ts` (databasen), `forsidemoduler.test.ts` (oppsettet),
  `forsidevisning.test.tsx` (visningen)
