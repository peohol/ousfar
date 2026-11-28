# Varsler på enheten for flere formål

Leses når et prosjekt vil sende varsler til mobilen eller PC-en (push) om noe
annet enn chatten, og når den felles infrastrukturen endres. Bestilt i
[#600](https://github.com/peohol/ousfar/issues/600) for påminnelsene i
personalkalenderen ([personal.md](personal.md) §8.9), men felles for alle
prosjektene. Eies av OUSFAR Dev; reglene, tekstene og innstillingene for hvert
formål eies av prosjektet som eier formålet.

Varslene om nye chatmeldinger var først, og står i
[chatvarsler.md](chatvarsler.md): det som er felles (abonnementene per enhet,
krypteringen, tjenestearbeideren, nøklene og Edge-funksjonen
`chatvarsel-utsending`), er beskrevet der og brukes av alle formålene. Navnene
med `chatvarsel` er fra den gang; de er beholdt fordi de er rullet ut med
hemmeligheter og Vault-navn.

## Kort fortalt

- **Én bryter per enhet.** «Varsler på denne enheten» står øverst i
  varselinnstillingene (bjella → ⚙), under overskriften «På denne enheten».
  Chatinnstillingene (bak ⚙ i chatmenyen og i Konto → Innstillinger → Chat)
  har en knapp dit. Bryteren gjelder bare nettleseren den slås på i.
- **Ett valg per formål** under bryteren, som «Chatmeldinger». Valgene gjelder
  den innloggede på alle enhetene hen har slått på. Et formål vises bare for den
  som har det; den som ikke har det, ser ingen spor av det, og serveren svarer
  «Finnes ikke.» på et kall om det.
- **Planlagte varsler.** Et formål kan planlegge et varsel til et bestemt
  tidspunkt, bytte det ut og avlyse det med en nøkkel. Det sendes én gang, til
  rett tid (innen et minutt), og aldri etter fristen.
- **Kontroll rett før utsending.** Medlemskapet, valget, funksjonsbryteren og
  formålets egen kontroll prøves på nytt for hvert varsel rett før det sendes.
- **Personvernet som for chatten.** Innholdet avgjøres i databasen av
  eierprosjektets egne funksjoner, aldri av nettleseren. Varslene slutter ved
  utlogging, avsluttet medlemskap, mistet tilgang og når en annen konto logger
  inn i nettleseren.

## Formålene

`intern.enhetsvarselformal` har én rad per formål. Eierprosjektet fører den inn
med en migrasjon:

| Kolonne | Hva |
| --- | --- |
| `formal` | Nøkkelen, som `chat` eller `kalender` (`^[a-z][a-z0-9_]{1,30}$`) |
| `funksjon` | Funksjonsbryteren formålet hører til ([fagmiljoer.md](fagmiljoer.md), «Funksjonsbrytere per fagmiljø»), eller tom. Står den, har bare den som har funksjonen i et eget fagmiljø, formålet, og hvert varsel gjelder ett fagmiljø |
| `tilgang` | Valgfri funksjon `(bruker uuid) returns boolean` for om brukeren har formålet ellers. Chatten bruker den for at chatten er slått på |
| `kontroll` | Valgfri funksjon `(bruker uuid, nokkel text, data jsonb, fagmiljo uuid) returns boolean`, kjørt rett før hver utsending: om grunnlaget for varselet fortsatt gjelder (for kalenderen: at tildelingen fortsatt er publisert og er mottakerens). Usant, tomt eller en feil stopper varselet |
| `standard` | Valget før brukeren har valgt selv. Chatten står på; nye formål bør stå av |
| `frist` | Hvor lenge etter tidspunktet varselet fortsatt kan sendes (1 minutt–1 døgn, standard 15 minutter) |
| `sti_monster` | Regulært uttrykk for adressene varslene kan åpne, i tillegg til den felles formen (en adresse i appen, `#/…`, høyst 300 tegn) |
| `rekkefolge` | Rekkefølgen i innstillingene |

Databasen kontrollerer at `tilgang` og `kontroll` har formen over. Appen viser
et formål bare når det også står i `VARSELFORMAL`
(`src/enhetsvarsler/formal.ts`) med navn og forklaring. Har formålet egne
innstillinger (som tidspunktene for påminnelsene), legges komponenten der som
`Innstillinger` med `lazy`, så koden bare lastes for dem som har formålet; den
vises under formålets bryter når valget står på.

### Valgene

`public.enhetsvarselvalg` har valget per bruker og formål. Nettleseren når det
bare gjennom `public.mine_enhetsvarselformal()` (formålene den innloggede har,
`[{formal, pa}]`) og `public.sett_enhetsvarselvalg(formal, pa)`, som svarer
`P0002` «Finnes ikke.» for et formål man ikke har.

## De planlagte varslene

`intern.enhetsvarsler` har ett varsel per formål, mottaker og nøkkel. Nøkkelen
velger eierprosjektet (`^[A-Za-z0-9:_.-]+$`, høyst 200 tegn), gjerne med et
prefiks som samler varsler som hører sammen, som `pub:<publisering>:` eller
`vakt:<tildeling>:`. Varslene planlegges bare fra eierprosjektets egne
funksjoner i databasen (`security definer`); nettleseren og Edge-funksjonene
har ingen tilgang til funksjonene under.

| Funksjon | Gjør |
| --- | --- |
| `intern.planlegg_enhetsvarsler(formal, varsler jsonb)` | Planlegger eller bytter ut. `varsler` er en liste med `{bruker, nokkel, tittel, tekst, sti, kl}` og valgfritt `fagmiljo` (påkrevd når formålet har en funksjon), `merke` (standard `<formål>:<nøkkel>`), `data` (til kontrollen) og `senest` (standard `kl` pluss fristen). Gir antallet som ble planlagt eller byttet ut |
| `intern.avlys_enhetsvarsler(formal, nokler text[], bruker default null)` | Avlyser varslene med nøklene, for alle eller én mottaker |
| `intern.avlys_enhetsvarsler_med_prefiks(formal, prefiks, bruker default null)` | Avlyser alle med nøkler som begynner med prefikset, i én operasjon |
| `intern.erstatt_enhetsvarsler(formal, prefiks, varsler jsonb)` | Erstatter alle med prefikset med `varsler`, i én operasjon: de som ikke er med lenger, avlyses, resten planlegges eller byttes ut. Til en ny eller trukket publisering. Gir `{planlagt, avlyst}` |

Reglene:

- **Tidspunktet lagres i UTC** (`timestamptz`). Eierprosjektet regner om fra
  fagmiljøets lokale tid, også ved sommertid, for eksempel
  `('2027-03-27'::date + time '15:00') at time zone 'Europe/Oslo'`.
- **Utbytting.** Samme mottaker og nøkkel gir det samme varselet. Et nytt
  innhold eller tidspunkt bytter det ut (`versjon` øker), så det aldri blir to.
  Et uendret varsel skriver ingenting. En enhet som alt har fått varselet til
  et tidspunkt, får det ikke igjen når bare innholdet byttes ut
  (`tidsversjon`); et nytt tidspunkt gir et nytt varsel.
- **Sendt er sendt.** Et varsel som alt er sendt, røres ikke når det planlegges
  på nytt til samme tidspunkt, og kan ikke avlyses; det blir stående et døgn
  etter fristen nettopp for at det ikke skal sendes igjen. Et nytt tidspunkt
  gjør det til et nytt varsel.
- **Fristen.** Et varsel med fristen passert planlegges ikke og sendes ikke.
  Fristen er høyst et døgn etter tidspunktet.
- **Innholdet.** Tittel (høyst 80 tegn), tekst (høyst 240) og adresse kommer
  fra eierprosjektets funksjon, aldri fra det en bruker har skrevet. Tekst som
  ligner et fødselsnummer, avvises ([pasientopplysninger.md](pasientopplysninger.md)).
  `data` (høyst 2 kB) er for kontrollen, ikke for visning, og skal ikke ha
  tekst fra brukerne. Hva som kan stå på låseskjermen, avgjøres av
  eierprosjektet og Peder (for kalenderen B7 i personal.md).
- Feil form gir `22023` (eller `23514` fra en regel i tabellen), og ingenting
  planlegges.

## Utsendingen

1. **Klokken.** pg_cron kjører `intern.enhetsvarsel_klokke()` hvert minutt
   (jobben `enhetsvarsler`). Er et varsel klart, ber den Edge-funksjonen
   `chatvarsel-utsending` om utsendingen med pg_net, som chatten
   (`intern.chatvarsel_vekk`). Et varsel som planlegges til et tidspunkt som
   alt er passert, ber om utsendingen med en gang. Én gang i timen sletter
   klokken loggen over sine egne kjøringer som er eldre enn et døgn, siden
   pg_cron ikke gjør det selv.
2. **Kontrollen.** `public.enhetsvarsel_hent()` tar varslene som skal sendes,
   og kjører `intern.enhetsvarsel_tillatt` for hvert: aktivt medlemskap,
   valget for formålet, funksjonen i varselets fagmiljø, formålets `tilgang`
   og `kontroll`. Det som ikke er tillatt, eller går til en mottaker uten
   enheter, blir ferdig uten å sendes.
3. **Sendingen.** Edge-funksjonen sender chatvarslene og de planlagte
   varslene med den samme koden (`sendFraKilde` i
   `supabase/functions/_edge/enhetsvarsler.ts`): ett varsel til hver av
   mottakerens enheter, kryptert for den ene nettleseren, med emnet (`Topic`)
   fra varselets ID. Mens det sendes, holder databasen varselet, så to
   utsendinger aldri sender det samme.
   - **Den siste kontrollen.** Rett før push-kallene kontrollerer
     `public.enhetsvarsel_bekreft(varsler)` alt på nytt for hvert varsel og
     hver enhet. Varselet må ikke være avlyst, ferdig eller byttet ut (samme
     `versjon`), og fristen må ikke være passert. Enheten må ikke ha fått det,
     og den må fortsatt være mottakerens abonnement. Til slutt må
     `intern.enhetsvarsel_tillatt` si ja. Det som ikke består, sendes ikke.
     Det kvitteres som `stoppet`, så databasen slipper varselet med en gang,
     og `enhetsvarsel_hent` avgjør det neste gang. Et varsel som er byttet ut,
     sendes i neste runde med det nye innholdet.
   - **Levetiden hos push-tjenesten** (`TTL`) er tiden som er igjen til
     fristen. Den regnes fra før den siste kontrollen, og ett sekund
     (`MARGIN_SEKUNDER`) trekkes fra for krypteringen og kallet. En enhet som
     er av, får derfor aldri et planlagt varsel etter fristen. Chatvarslene
     beholder ett døgn (`LEVETID_SEKUNDER`).
   - **Reservasjonen.** `enhetsvarsel_hent` holder varselet i ett minutt
     (`chatvarsel_laas()`, `neste_kl`). Hvert push-kall har et tidsavbrudd på
     ti sekunder, så en utsending kvitterer normalt lenge før det. Byttes
     innholdet ut til samme tidspunkt, beholdes reservasjonen, så en annen
     utsending ikke sender samtidig. Feiler utsendingen, sendes det nye
     innholdet etterpå. Kvitteres det aldri, er varselet ledig igjen når
     minuttet er gått.
4. **Kvitteringen.** `public.enhetsvarsel_kvitter(utfall)` fører hver enhet som
   har fått det (`sendt_til`). Varselet er ferdig når alle mottakerens enheter
   har fått det. En midlertidig feil prøves igjen bare for de enhetene som
   mangler, etter 1, 4, 9 … sekunder, høyst fem ganger. Svarer push-tjenesten
   at et abonnement er borte, slettes det. Et svar på en eldre versjon med det
   samme tidspunktet gjelder, fordi enheten har fått varselet til det
   tidspunktet, så det ikke sendes en gang til. Et svar fra før tidspunktet ble
   endret, gjelder ikke.
5. **Visningen.** Tjenestearbeideren (`public/chatvarsler.js`) viser varselet og
   åpner adressen ved trykk. Adressen må ha den felles formen
   (`VARSELSTI` i `supabase/functions/_delt/enhetsvarsel.ts`), som databasen,
   Edge-funksjonen og tjenestearbeideren alle kontrollerer.

### Hva som kan garanteres

- **Den siste kontrollen er grensen.** Det som er avlyst, byttet ut, ikke
  lenger tillatt, logget ut eller over fristen da `enhetsvarsel_bekreft`
  kjørte, sendes ikke. En endring som lagres etter kontrollen, kan ikke
  stoppe push-kallet som følger. Det gjelder bare tiden mellom kontrollen og
  push-kallet, normalt millisekunder: svaret fra databasen, krypteringen og
  selve kallet til push-tjenesten. Da har enheten fått det gamle varselet, og
  det kan ikke trekkes tilbake.
  - Er innholdet byttet ut til samme tidspunkt, får enheten ikke det nye i
    tillegg (`tidsversjon`), heller ikke fra en annen utsending samtidig
    (reservasjonen).
  - Er tidspunktet endret, kommer det nye til sin tid og erstatter det gamle
    på enheten, fordi de har samme merke.
  - Et avlyst varsel som alt er levert, blir stående på enheten.
- **Ingen levering etter fristen**, heller ikke til en enhet som har vært av,
  fordi levetiden hos push-tjenesten slutter ved fristen.
- **Høyst ett varsel per enhet og tidspunkt**, med to unntak:
  - Får Edge-funksjonen ikke svar fra push-tjenesten (tidsavbrudd), prøves det
    igjen. Har push-tjenesten likevel levert det første, viser enheten det
    samme varselet på nytt i stedet for det forrige (samme merke).
  - Kvitterer en utsending aldri (den stopper underveis), kan en annen sende
    når reservasjonen er utløpt etter ett minutt.

**Ryddingen.** Ved hver henting og i nattjobben
(`.github/workflows/gruppechat-lagringstid.yml`, «Planlagte varsler på
enheten») blir det som har passert fristen, ferdig, og det som har stått et
døgn etter fristen, slettes (`intern.rydd_enhetsvarsler()`). Tabellen er ikke
med i sikkerhetskopiene: varslene er flyktige, og et gammelt varsel etter en
gjenoppretting ville vært feil.

**Kostnaden.** Klokken er én liten spørring i minuttet mot en indeks, og et
kall til Edge-funksjonen bare når noe skal sendes. Ingenting går ut når ingen
har planlagt noe.

## Chatten

Chatten er formålet `chat` (på som standard, uten funksjon, med tilgang når
gruppechatten eller direktemeldingene er slått på). Chatvarslene har fortsatt
sin egen kø, fordi innholdet (antallet uleste) regnes ut når de sendes
([chatvarsler.md](chatvarsler.md)). Det eneste nye er at
`intern.chatvarselmottakere` også krever valget «Chatmeldinger», så den som slår
det av, ikke får flere chatvarsler, heller ikke dem som venter.

## Et nytt formål

1. En migrasjon fra eierprosjektet fører inn raden i
   `intern.enhetsvarselformal`, med kontrollfunksjonen.
2. Eierprosjektets egne funksjoner kaller `planlegg_enhetsvarsler`,
   `erstatt_enhetsvarsler` eller `avlys_enhetsvarsler…` når grunnlaget endres
   (for kalenderen: publisering, tilbaketrekking, bytte, endrede påminnelsesvalg).
3. Formålet føres inn i `VARSELFORMAL` med navn, forklaring og eventuelt egne
   innstillinger.
4. Tester med syntetiske data for at varslene planlegges, byttes ut og avlyses
   riktig, og at kontrollen stopper dem.

## Testene

- `src/__tests__/enhetsvarsler.test.ts`: formålene og valgene, planleggingen
  (til rett tid og én gang, utbytting, avlysning med nøkler og prefiks, mange i
  én operasjon, erstatning, fristen, feil form), kontrollen før utsending
  (grunnlaget borte, kontrollen feiler, funksjonen av, medlemskapet avsluttet,
  valget av, utlogget), den siste kontrollen med endringer etter hentingen og
  før push-kallet (avlyst, ikke lenger tillatt, funksjonen eller valget av,
  utlogget, fristen passert, byttet ut til nytt eller samme tidspunkt, og
  byttet ut mens push-kallet pågår), to utsendinger som overlapper ved
  utbytting til samme tidspunkt (bare ett push, det nye etter en feil, og
  fremdrift når reservasjonen er utløpt), levetiden hos push-tjenesten,
  utsendingen ende til ende med en falsk push-tjeneste,
  chatvalget, klokken og nattjobben, mot testdatabasen med et syntetisk formål.
- `src/__tests__/enhetsvarsler.valg.test.tsx`: bryteren for enheten, valgene
  per formål og veien fra chatinnstillingene.
- `src/__tests__/chatvarsler*.test.ts`: chatvarslene, som før.

## Tilbakeføring

En ny migrasjon som fjerner jobben `enhetsvarsler` i pg_cron, setter
`intern.chatvarselmottakere` tilbake og fjerner funksjonene og de tre tabellene
fra `20261128094500_enhetsvarsler.sql`. pg_cron kan stå.
