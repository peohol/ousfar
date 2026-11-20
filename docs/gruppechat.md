# Gruppechat (P7)

Leses før noe ved gruppechatten endres. Oppdraget er Peders bestilling av P7
(17.11.2026) under planen [#364](https://github.com/peohol/ousfar/issues/364)
(§10 P7), og fremdriften føres i [#369](https://github.com/peohol/ousfar/issues/369).
Gruppene chatten bygger på, står i `docs/fagmiljoer.md` («Gruppene», «Idéer og
oppgaver i gruppene»), varslene i `docs/varsler.md`, og den varige regelen om
pasientopplysninger i `docs/pasientopplysninger.md`.

Dokumentet er delplanen fra P7.0 og den felles kontrakten trådene A–E bygger
på: modellen, rettighetene, grensesnittene og filansvaret. Hver tråd fører sin
del inn i avsnittet sitt her når den er levert, og endrer ikke de andres
avsnitt eller kontrakten uten å avklare det med P7-tråden.

## Mål

- Hver gruppe har ett chatrom, i chatmenyen (D4a/D4b; først en fane på
  gruppesiden).
- Meldingene står i rekkefølge med avsender og tidspunkt, nye kommer uten at
  siden lastes på nytt, og historikken står når man kommer tilbake.
- Bare de som leser gruppen i dag, leser chatten. Tilgangen håndheves av
  databasen, både i funksjonene og i sanntidskanalen, og går tapt med en gang
  medlemskapet i gruppen eller fagmiljøet avsluttes.
- Ingen pasientopplysninger: regelen står ved skrivefeltet, og databasen
  avviser tekst som ser ut som et fødselsnummer.

Ikke med i første versjon: privatmeldinger, lyd og video, tråder i chatten,
reaksjoner, omtaler (@navn), filvedlegg (P8), søk i chatten og eksport.

## Peders rammer

- **Pasientopplysninger er forbudt i hele OUSFAR** (Peder 17.11.2026), også
  pseudonymiserte og kasuistikker som kan knyttes til enkeltpersoner
  (`docs/pasientopplysninger.md`).
- **D6/S5.** Personvernvurderingen for chatten står i
  `docs/gruppechat-personvern.md` (tråd D). **Peder sa ja til å slå på
  chatten 17.11.2026** («Ja, skru på chatten.», P7-tråden). Aktiveringen er
  migrasjonen `*_gruppechat_aktivering.sql`, som setter
  `intern.gruppechat_aktivert()` til `true`; den slås sammen sist, etter de
  andre P7-delene og sluttkontrollen (D3). Før det er chatten avslått.
- **Lagringstid: 12 måneder** (Peder 17.11.2026, beslutningskort). En melding
  eldre enn 12 måneder slettes helt (raden fjernes) og kan ikke hentes
  tilbake. Det er Peders uttrykkelige ja til denne automatiske slettingen;
  den gjelder bare gruppemeldinger (tråd A, se «Lagringstiden»).

## Det som finnes og gjenbrukes

| Behov | Finnes i dag | Hvordan P7 bruker det |
| --- | --- | --- |
| Hvem leser og skriver i gruppen | `intern.kan_lese_gruppe`, `intern.kan_bidra_i_gruppe`, `intern.kan_moderere_gruppe`, `public.mine_lesbare_grupper()` | De samme, ingen ny tilgangsmodell. Arkivert gruppe: bare lesing for systemarkitektene |
| Gruppesiden og fanene | `Grupperside.tsx`, `GRUPPEFANER` i `src/domain/rute.ts`, `gruppeoversikt(gruppe).samhandling` | Ny fane `chat` med tallet på uleste |
| Varsler | `intern.varsle`, `varselkategori`, ett ulest varsel per nøkkel | Ny kategori `gruppechat`, ett ulest varsel per gruppe, uten meldingstekst |
| Profilkort | `Profilkort` (`@delt/profil`) | Avsenderen i hver melding |
| Lokalt testmiljø | `apneTestmiljo()` (`docs/qa-testmiljo.md`) | Sanntiden må slås på der (tråd C) |
| Sanntid | Ingen i dag (P0 §2.8) | Ny: én dørklokke-tabell i `supabase_realtime` |

## Rettighetene

| Hvem | Lese | Skrive | Endre og slette egne | Slette andres | Se hvem som leser |
| --- | --- | --- | --- | --- | --- |
| Medlem | ja | ja | ja | nei | ja |
| Moderator | ja | ja | ja | ja | ja |
| Ansvarlig | ja | ja | ja | ja | ja |
| Systemarkitekt | ja, alle grupper | ja, i aktive grupper | ja | ja, også i arkiverte | ja |
| Invitert, fjernet, utenfor gruppen | nei | nei | nei | nei | nei |

- *Lese* er `intern.kan_lese_gruppe`, *skrive* `intern.kan_bidra_i_gruppe`,
  *slette andres* `intern.kan_moderere_gruppe`. Alt krever aktivt medlemskap i
  OUSFAR og, for en gruppe i et fagmiljø, i fagmiljøet.
- **Arkivert gruppe:** ingen nye meldinger og ingen endringer, heller ikke for
  systemarkitektene; de kan lese den som før. **Unntak:** en systemarkitekt
  kan slette en melding også i en arkivert gruppe, så noe som ikke hører
  hjemme der (som pasientopplysninger), kan fjernes uten å åpne gruppen igjen
  (`docs/pasientopplysninger.md`, hendelser).
- **Endre:** forfatteren, så lenge gruppen er aktiv. Endringen erstatter
  teksten, merkes «redigert», og den gamle teksten lagres ikke.
- **Slette:** forfatteren og moderatorene. Teksten fjernes i databasen med en
  gang (settes til `null`); meldingen står som «Meldingen er slettet» eller
  «Fjernet av en moderator», med hvem og når, så samtalen henger sammen.
- **Utenfor gruppen** får verken meldinger, antall, tidspunkter, deltakere
  eller om chatten finnes. Funksjonene svarer som for en gruppe som ikke
  finnes (`42501` med samme tekst), og sanntidskanalen gir ingenting.
- Systemarkitektene beholder myndigheten fra P6: de leser alle gruppene og
  kan moderere. Lokale administratorer som ikke er med, ser ingenting.

## Modellen (tråd A)

Tre tabeller i `public`, med radsikkerhet og uten rettigheter for nettleseren
utenom det som står:

**`gruppemeldinger`** — én rad per melding.

| Kolonne | Type | Merknad |
| --- | --- | --- |
| `id` | uuid | primærnøkkel |
| `gruppe_id` | uuid | `grupper`, kan ikke endres |
| `nr` | bigint | løpenummer i gruppen, 1, 2, 3 …, satt under låsen; rekkefølgen |
| `forfatter_id` | uuid null | `profiles`, `on delete set null` (meldingen står) |
| `klient_id` | uuid | fra nettleseren; unik per (gruppe, forfatter) — dobbeltinnsending gir samme melding |
| `tekst` | text null | 1–`MAKS_TEGN` tegn etter trimming; `null` når slettet |
| `skrevet_kl` | timestamptz | serverens tid |
| `redigert_kl` | timestamptz null | siste endring av teksten |
| `slettet_kl`, `slettet_av` | timestamptz null, uuid null | hvem som slettet |
| `endring` | bigint | gruppens endringsteller da raden sist ble endret (se under) |

**`gruppechatter`** — én rad per gruppe som har en chat: `gruppe_id`
(primærnøkkel), `siste_nr`, `siste_endring`, `endret_kl`. Raden er **låsen**
alle skriveoperasjoner tar (`for update`), og **dørklokken** sanntiden lytter
på. Den inneholder ingen tekst og ingen avsender.

**`gruppechat_lest`** — (`gruppe_id`, `bruker_id`) → `lest_til_nr`. Tallet på
uleste og varslene bygger på den.

**Endringstelleren.** Hver skriving (ny melding, endring, sletting) øker
`gruppechatter.siste_endring` med én og setter den nye verdien i meldingens
`endring`. Alt som har skjedd siden et tidspunkt, er da meldingene med
`endring > x`. Det gir gjenoppkobling, oppdatering av redigerte og slettede
meldinger og rekkefølge uten egne hendelser. `nr` sier rekkefølgen meldingene
vises i; `endring` sier hva klienten har sett.

**Radsikkerhet.** `gruppemeldinger` og `gruppechat_lest` kan ikke leses
direkte; alt går gjennom funksjonene. `gruppechatter` kan leses (`select`) av
`authenticated` for grupper i `mine_lesbare_grupper()`, og bare når chatten er
aktivert — det er dette sanntiden sjekker for hver hendelse.

## Funksjonene (tråd A)

Alle er `security definer`, krever aktivt medlemskap, tar gruppens
chatrad med `for update` (eller `for share` der det holder) når de skriver,
og står i `funksjonskontroller.ts`. Mens chatten er avslått, svarer alle med
`42501` og teksten «Gruppechatten er ikke slått på.».

| Funksjon | Svarer |
| --- | --- |
| `les_gruppechat(gruppe uuid, for_nr bigint default null, antall int default 50)` | `Chatside`: de siste `antall` (høyst 100) meldingene før `for_nr` (uten: de nyeste), stigende etter `nr`; `flere_eldre`; `siste_endring`; `lest_til_nr`; `kan_skrive`; `kan_moderere`; `lesere`; `grenser` |
| `gruppechat_endringer(gruppe uuid, etter bigint, antall int default 200)` | `Chatendringer`: meldingene med `endring > etter`, stigende etter `endring`, høyst `antall`; `siste_endring`; `flere` (det er mer å hente) |
| `send_gruppemelding(gruppe uuid, klient_id uuid, tekst text)` | `Gruppemelding`. Samme `klient_id` på nytt gir den samme meldingen, ikke en ny |
| `endre_gruppemelding(melding uuid, tekst text)` | `Gruppemelding` |
| `slett_gruppemelding(melding uuid)` | `Gruppemelding` (slettet; idempotent) |
| `merk_gruppechat_lest(gruppe uuid, til_nr bigint)` | `void`. Flytter bare framover; kaller `intern.merk_gruppechat_varsler_lest` |

`gruppeoversikt(gruppe).samhandling` får `chat_uleste` (antall meldinger fra
andre etter `lest_til_nr`, `null` når chatten er avslått), til tallet på fanen.

**Vaktene i `send_gruppemelding` og `endre_gruppemelding`**, i denne
rekkefølgen, med norske feilmeldinger:

1. Tom tekst eller over `MAKS_TEGN` (4000) tegn: `22023`.
2. `intern.krev_uten_personnummer(tekst)` (grunnmuren): `22023` med
   `PASIENTREGEL.avvist`.
3. Takten: høyst `MAKS_PER_MINUTT` (20) nye meldinger per bruker og gruppe
   siste 60 sekunder: `54000` «Du sender meldinger for fort. Vent litt og
   prøv igjen.». En gjentatt `klient_id` teller ikke.

Grensene står i `GRUPPECHAT_GRENSER` (`src/gruppechat/modell.ts`) og i
`les_gruppechat(...).grenser`; databasen er fasit, appen viser dem.

**Lagringstiden.** Meldinger med `skrevet_kl` eldre enn 12 måneder
(`intern.gruppechat_lagringstid()`, `interval '12 months'`) slettes helt.
Ryddingen gjøres i databasen uten ekstern jobb: `send_gruppemelding` og
`les_gruppechat` sletter de utgåtte i gruppen de gjelder, under gruppens lås,
og en egen funksjon for alle grupper (`intern.rydd_gruppechat()`) kan kjøres
av utrullingen eller en planlagt jobb senere. Funksjonene leser heller aldri
ut en utgått melding, så den er borte for brukerne fra fristen selv om raden
ennå ikke er ryddet. `siste_nr` og `siste_endring` står, så rekkefølgen og
endringene ikke brytes. Varslene peker bare på ID-er og viser ikke en melding
som er borte.

**Logging.** Meldingsteksten skrives aldri i tilgangsloggen, i `raise`-tekster
eller i varsler. Slettingen lagrer hvem og når på meldingen selv.

**Levert i A1** (`supabase/migrations/20261117130000_gruppechat.sql`, prøvd i
`src/__tests__/gruppechat.test.ts` og `gruppechat.samtidighet.test.ts`).
Det som ikke står i kontrakten over:

- `gruppemeldinger.gruppe_id` og `gruppechat_lest.gruppe_id` peker på
  `gruppechatter`, så chatraden alltid finnes for en melding. Raden lages ved
  første lesing (`les_gruppechat`) eller første skriving. Sanntiden (C) får
  derfor bare `UPDATE` på raden etter at chatten er åpnet; et abonnement på
  `INSERT` i tillegg skader ikke.
- `gruppemeldinger.slettet_som` (`forfatter` eller `moderator`) lagres ved
  slettingen, så `slettet.av` står riktig også når en konto senere slettes.
- Radsikkerheten på `gruppechatter` bruker `public.mine_lesbare_gruppechatter()`
  (tom mens chatten er avslått), i tillegg til den felles regelen
  `aktivt_medlemskap`.
- Svarkodene: `42501` for bryteren, en gruppe eller melding som ikke finnes
  eller ikke kan leses («Gruppen finnes ikke, eller du har ikke tilgang til
  den.» / «Meldingen finnes ikke, …»), og for å endre eller slette uten rett;
  `55000` for skriving i en arkivert gruppe og endring av en slettet melding;
  `22023` for vaktene og manglende `klient_id`; `54000` for takten. En utgått
  melding svarer som en som ikke finnes.
- Systemarkitektenes sletting i en arkivert gruppe går gjennom
  `intern.kan_moderere_gruppechat`, som også gir `kan_moderere` og
  `kan_slette` i svarene.
- `antall` er 1–100 i `les_gruppechat` og 1–500 i `gruppechat_endringer`.
  Takten gjelder nye meldinger; endringer telles ikke. Uendret tekst i
  `endre_gruppemelding` øker ikke endringstelleren.
- `merk_gruppechat_lest` flytter aldri forbi `siste_nr` og gjør ingenting i en
  gruppe uten meldinger.
- `intern.rydd_gruppechat()` kjøres hver natt av arbeidsflyten
  `.github/workflows/gruppechat-lagringstid.yml`
  (`npm run gruppechat:lagringstid`, `src/drift/gruppechatLagringstid.ts`), så
  de utgåtte meldingene slettes også i grupper ingen åpner. Jobben
  kontrollerer etterpå at ingen utgått melding står igjen, og kjøringen blir
  rød (GitHub varsler eieren av repoet) når ryddingen ikke gikk. Rapporten har
  bare antall og alder, aldri tekst, avsendere eller grupper. Ryddingen ved
  sending og lesing og sperren mot å lese ut en utgått melding står i
  tillegg.

## Formen på svarene

Typene står i `src/gruppechat/modell.ts` (grunnmuren) og leses med
`lesChatside`, `lesChatendringer` og `lesGruppemelding`, som gjør verdier uten
formen tomme i stedet for å velte visningen.

```ts
interface Gruppemelding {
  id: string
  nr: number
  endring: number
  forfatter: Profilkort | null // null når kontoen er slettet
  tekst: string | null         // null når meldingen er slettet
  skrevet_kl: string
  redigert_kl: string | null
  slettet: null | { av: 'forfatter' | 'moderator'; kl: string }
  egen: boolean
  klient_id: string | null     // bare på egne meldinger, ellers null
  kan_endre: boolean
  kan_slette: boolean
}

interface Chatside {
  meldinger: Gruppemelding[] // stigende etter nr
  flere_eldre: boolean
  siste_endring: number
  lest_til_nr: number
  kan_skrive: boolean
  kan_moderere: boolean
  lesere: { medlemmer: number; systemarkitekter: boolean }
  grenser: { maks_tegn: number; maks_per_minutt: number }
}

interface Chatendringer {
  meldinger: Gruppemelding[] // stigende etter endring
  siste_endring: number
  flere: boolean
}
```

## Sanntiden (tråd C)

**Dørklokke, ikke innhold.** Klienten abonnerer på `postgres_changes`
(`UPDATE`) på `public.gruppechatter` med filteret `gruppe_id=eq.<ID>`. Supabase
sjekker radsikkerheten for hver hendelse og hver abonnent, så den som har
mistet tilgangen, får ikke flere hendelser. Hendelsen sier bare at noe har
endret seg; klienten henter selv med `gruppechat_endringer(gruppe,
siste_endring)`, som kontrollerer tilgangen på nytt. Ingen meldingstekst går
gjennom sanntidstjenesten.

- **Gjenoppkobling:** ved ny tilkobling, når fanen blir synlig igjen og når
  nettleseren er på nett igjen, henter klienten endringene siden
  `siste_endring`. Er det mer enn `antall`, henter den til `flere` er usann.
- **Livstegn:** mens chatten står åpen, henter klienten endringene minst hvert
  45. sekund, også uten hendelser (så en åpen chat tømmes innen ett minutt
  også når tilgangen tas rett etter et livstegn, med tid til et tregt svar). Svarer databasen `42501`, viser chatten
  «Du har ikke lenger tilgang til denne gruppen.», tømmer meldingene og
  stopper abonnementet.
- **Rekkefølge og duplikater:** meldingene holdes i et kart etter `id`; en
  versjon med høyere `endring` erstatter en med lavere, og visningen sorteres
  etter `nr`. En sendt melding står som ventende (med `klient_id`) til svaret
  eller endringene har den, og flettes da sammen etter `klient_id`. Derfor har
  funksjonene `klient_id` på den innloggedes egne meldinger (og `null` på
  andres, så ingen andre ser den).
- **Feil ved sending:** den ventende meldingen står med «Ikke sendt», feilen
  fra databasen og «Prøv igjen» (samme `klient_id`) og «Forkast».

Publikasjonen: migrasjonen til tråd C legger `public.gruppechatter` i
`supabase_realtime`. Ingen andre tabeller.

**I appen (C1).** `src/gruppechat/tilstand.ts` fletter meldingene (rene
funksjoner), `dorklokke.ts` er abonnementet på dørklokken og `kall.ts`
kallene, begge for en gitt klient (appens står i `sanntid.ts` og `api.ts`, så
kontrollene i det lokale testmiljøet kan bruke de samme med egne
innlogginger), `kontroller.ts` holder én åpen chat (henting, gjenoppkobling,
livstegn, sending og lest-merking), og `useGruppechat.ts` kobler den til React.
Valgene som ikke står over:

- Livstegnet hopper over runder mens fanen er skjult, så en chat som står åpen
  i bakgrunnen ikke belaster databasen; når fanen blir synlig, hentes det som
  er nytt med en gang.
- Ringer dørklokken med en endringsteller som ikke er nyere enn den klienten
  har, hentes ingenting.
- Endringer i meldinger eldre enn det som er hentet, tas ikke inn (de ville
  stått over et hull); de kommer i riktig versjon når eldre meldinger hentes.
- Etter et brudd (kanalen eller nettet tilbake) leses også rettighetene og
  leserne på nytt (`les_gruppechat` med én melding), så en gruppe som er
  arkivert imens, ikke viser skrivefeltet.
- Egne meldinger sendes én om gangen, i den rekkefølgen de ble skrevet.
  `merkLest` sender høyst ett kall om gangen og ber bjella hente varslene på
  nytt (`oppfriskVarsler`).
- `tilkobling` er `frakoblet` når kanalen er nede, nettleseren er uten nett
  eller siste henting feilet, til en henting lykkes igjen.
- Lukker tjenesten kanalen, åpnes en ny etter 1, 2, 4 … høyst 30 sekunder;
  Supabase kobler ellers selv til igjen.

Prøvd i `src/__tests__/gruppechat.tilstand.test.ts`,
`gruppechat.sanntid.test.ts` (mot en falsk server og kanal,
`src/__tests__/hjelp/falskchat.ts`) og `gruppechat.krok.test.tsx`.

## Varslene (tråd C)

> **Fra D4b står chatten ikke lenger i bjella** (se «Uleste» under). Avsnittet
> beskriver det P7 leverte; utløseren er fjernet, og kategorien vises ikke.

Ny kategori `gruppechat` (gruppen «Grupper», kan slås av, på som standard).
Én ny melding gir de andre som leser gruppen ett varsel med nøkkelen
`gruppechat:<gruppe-ID>`, med `gruppe_id` satt, så den som mister tilgangen,
ikke ser det. Uleste legges i det samme varselet (bare antall og siste
tidspunkt, aldri tekst eller avsendere ut over ID-ene som lagres). Teksten i
varselet er «Nye meldinger i <gruppe>», og et trykk åpner chatfanen.
`merk_gruppechat_lest` merker varselet lest (gjennom
`intern.merk_gruppechat_varsler_lest`, som grunnmuren lager tom og tråd C
fyller). Endringer og slettinger varsler ingen.

**Levert i C2.** Varselet har én hendelse med `kl`, `gruppechat`, `antall`
og `til_nr`, og merkes lest når chatten er lest til og med `til_nr`; en
nyere melding imens holder det ulest. Det gis bare til aktive medlemmer i
gruppen (ikke systemarkitekter som ikke er med), og vises bare mens chatten
er slått på. Teksten er «Ny melding i <gruppe>» eller «N nye meldinger i
<gruppe>», og et trykk går til `#/grupper/<ID>/chat` gjennom skjemavaktene
(`visGruppechat`) og merker varselet lest først da. Innstillingen «Nye
meldinger i gruppechattene» står under «Grupper», men bare når chatten er
slått på: `mine_grupper()` svarer med `chat_aktivert` fra funksjonsbryteren
(`MineGrupper.chat_aktivert`), og kategorien har `funksjon: 'gruppechat'`. Detaljene står i `docs/varsler.md`. Prøvd i
`src/__tests__/gruppechat.varsler.test.ts` (databasen og publikasjonen),
`gruppechat.varselvisning.test.tsx` og `varselmodell.test.ts`, og med ekte
Realtime i det lokale testmiljøet (`src/__tests__/qa/gruppechatsanntid.ts`,
kriterium 1 og 4; `docs/qa-testmiljo.md`).

## Brukerflaten (tråd B)

- Panelet **Gruppechat** på gruppesiden viser tallet på uleste og knappen
  «Åpne chat», som åpner samtalen i chatmenyen (`visGruppesamtale`) og lar
  gruppesiden stå (D4b; før det en egen chatside). Panelet vises bare når
  `samhandling.chat_uleste` ikke er `null`.
- Ingen tekst om hvem som kan lese chatten (Peder 20.11.2026: overflødig;
  før det «Leses av de N medlemmene …», og «Bare dere to kan lese
  samtalen.» i en direktesamtale). Ingen påminnelse
  om pasientopplysninger (Peder 17.11.2026: brukerne er godt trent i
  personvern, og påminnelser blir støy); databasen avviser fortsatt tekst som
  ligner et fødselsnummer, og avvisningen vises som en sendefeil
  (`PASIENTREGEL.avvist`).
- Meldingene i en liste (`role="log"`), gruppert etter dag, med avsender og
  klokkeslett; egne meldinger kan endres og slettes fra en liten meny.
- Egne meldinger står til høyre og andres til venstre. Over egne står bare
  klokkeslettet, ikke eget navn (skjermlesere får «Du»). Teksten står i en
  snakkeboble under navnet, ved siden av profilbildet; det øvre hjørnet mot
  bildet er spissere enn de andre, bare på den første i en rekke fra samme
  avsender (Peder 18.11.2026).
- Navnene er korte (Peder 19.11.2026), regnet ut med `kortnavn` i
  `@delt/profil` blant de andre som har meldinger i samtalen: fornavnet; har
  flere samme fornavn, også forbokstaven i etternavnet («Ola N» og «Ola A»);
  har flere også samme forbokstav, hele navnet. I direktemeldingene regnes
  navnet ut blant alle i samtalelista (`motpartnavn`), så raden, overskriften
  og meldingene har det samme navnet. Søket etter personer og lista over
  blokkerte viser hele navnet.
- Står brukeren nederst, følger lista nye meldinger. Har hen rullet opp,
  står lista stille, og en knapp «N nye meldinger» tar hen ned. Eldre
  meldinger hentes når man ruller til toppen eller trykker «Vis eldre», og
  plasseringen i lista beholdes.
- Skrivefeltet: Enter sender, Shift+Enter gir ny linje; på berøringsskjerm
  gir Enter ny linje og Send-knappen sender. Utkastet bevares (`useBevart`).
- En arkivert gruppe viser historikken uten skrivefelt, med «Gruppen er
  arkivert».

`useGruppechat(gruppe)` (tråd C) gir det visningen trenger, med typen
`Gruppechat` i `src/gruppechat/modell.ts`. Tråd B bygger mot den og mot
testchatten i `src/__tests__/hjelp/testchat.ts`, uavhengig av A og C.

**Levert i B1** (`Gruppechat.tsx`, `Gruppechatmelding.tsx`,
`Gruppechatskriving.tsx` og de rene utregningene i `gruppechatvisning.ts`
under `src/components/grupper/`, stilen i `src/styles/gruppechat.css`,
prøvd i `src/__tests__/gruppechatvisning.test.tsx`):

- `Gruppechat` tar `chat: Gruppechat` og gruppen (`id`, `navn`, `status`).
  Koblingen til `useGruppechat(gruppe.id)` fra C1 står i chatmenyen
  (`Samtalevisning`; før D4b i `Gruppechatfane`). B2 er bare rettelsene fra tråd Ds
  sluttkontroll i nettleseren.
- ~~Chatsiden `#/grupper/<ID>/chat`~~ er fjernet i D4b; chatten står i
  chatmenyen og på `#/chat` (se «Chatmenyen»). Tallet i panelet er
  `chat_uleste`, og gruppesiden henter det på nytt hver gang meldinger i
  gruppen merkes lest (`meldGruppeendring`).
- Lista ruller for seg (`role="log"`, `aria-live="polite"`,
  `aria-relevant="additions"`, `aria-busy` mens eldre hentes), med dagene som
  overskrifter og «Nye meldinger» foran den første uleste fra andre da
  chatten ble åpnet. Er det mange uleste, åpner lista der; ellers nederst.
  Meldinger fra samme avsender innen fem minutter står under ett navn
  (navnet og tidspunktet står likevel for skjermlesere).
- Lest: `merkLest(siste nr)` bare når lista står nederst og nettleserfanen er
  framme (`visibilityState`).
- Menyen på en melding (`Nedtrekksmeny`, som i brukerlista) følger
  `kan_endre` og `kan_slette` fra databasen. I en arkivert gruppe står aldri
  «Endre», men slettingen følger `kan_slette`, så en systemarkitekt kan fjerne
  en melding der. «Fjern meldingen» for en moderator. Sletting bekreftes
  (`Bekreftelseskort`, «Avbryt» har fokus); endringen skjer i et felt på
  stedet, Enter lagrer og Escape avbryter, og fokus går tilbake til menyen.
- Utkastet står i minnet per innlogget bruker og gruppe mens appen er åpen
  (og over en oppdatering med `useBevart`, skilt etter kontoen), aldri i
  nettleserens lagring. Alle utkast glemmes ved hvert øktskifte
  (`vedOktskifte`), og en gruppes utkast når tilgangen til den er tapt.
- Uten tilgang tømmes skjermen for meldinger og skrivefelt. Den som kan
  lese, men ikke skrive (`kanSkrive` usann), får lista uten skrivefelt.

## Chatmenyen (D4a)

Chatten har fått en fast inngang i hele appen, etter D0-designet
(`docs/design/d0-dashboard-chat/`, skisse 14–16 og 25) og planen §6.1 og §6.3.
Fra D4b er chatmenyen og `#/chat` de eneste stedene chatten står; se «Den
gamle chatsiden» og «Uleste» under.

- **Inngangen.** På brede flater en rund boble i venstre kant under
  toppmenyen, speilet av diskusjonsboblen i høyre, med tallet på uleste. På
  smale flater chatknappen i toppmenyen, foran bjella. Begge står bare når
  chatten er slått på (`mine_grupper().chat_aktivert`), og tallet er summen av
  uleste i samtalelista, uten tekstutdrag.
- **Menyen** (`src/components/chat/Chatmeny.tsx`) er et panel langs venstre
  kant, 24rem bredt, som kan dras mellom 20rem og `min(40rem, 100vw − 45rem)`,
  også med piltastene (`Kanthandtak`, `useDrattLengde`). Om den står åpen og
  hvor bred den er, følger brukeren (`chat.apen`, `chat.bredde` i
  brukerinnstillingene), som diskusjonsmenyen. Overskriften «Grupper og
  samtaler» står bare for skjermlesere (Peder 19.11.2026: gruppene og
  samtalene sier selv hva menyen er). Øverst «Samtaler» (chatikonet foran):
  én liste, nyeste aktivitet først, med søk. Ingen liste over gruppene (Peder
  20.11.2026: de har sitt eget menyvalg). Knappene «Utvid» og × står i
  hjørnet, på linje med «Samtaler» eller «Til alle samtaler». Over en
  gruppesamtale fører knappen «Til gruppen» til gruppesiden.
  Hver gruppe og gruppesamtale har gruppens symbol i en sirkel (emoji, bilde
  eller gruppeikonet; se «Gruppesymbolet» i `docs/fagmiljoer.md`), og en
  direktemelding profilbildet eller initialene til den andre.
  Verken antall grupper eller hvor gruppene hører til står i menyen. En valgt
  samtale vises i panelet med «Til alle samtaler» tilbake. ⚙ nederst til
  høyre viser innstillingene for chatten (`Chatinnstillinger`, de samme som
  i fanen Chat under Innstillinger) med «Til alle samtaler» tilbake; Escape
  går også tilbake. På smale flater fyller menyen skjermen.
- **Samtalelista** kommer fra `mine_gruppesamtaler()`: gruppene den innloggede
  selv er aktivt medlem av, med tidspunktet for den nyeste meldingen og tallet
  på uleste (det samme som `chat_uleste`), uten tekst og avsendere. En
  systemarkitekt som ikke er med i en gruppe, får den ikke i lista; chatten
  der nås med «Åpne chat» på gruppesiden, som åpner den i menyen. En arkivert gruppe står ikke i lista. Lista
  hentes jevnlig, når fanen blir synlig, når dørklokken ringer i en av gruppene
  (én kanal på `gruppechatter` uten filter; radsikkerheten avgjør hvilke),
  når meldinger er merket lest, og med en gang en åpen samtale mister
  tilgangen (livstegnet). Da hentes også «Mine grupper» på nytt.
- **Helsiden** `#/chat` og `#/chat/gruppe/<ID>` er den samme komponenten
  utvidet, med lista og samtalen side om side (én kolonne på smale flater).
  «Utvid» går dit; «Gjenopprett» og Escape går tilbake dit brukeren kom fra
  (`tilbake`, ellers forsiden), med menyen åpen på samme samtale. Å velge en
  annen samtale der bytter adressen uten ny oppføring i historikken.
- **Samme samtale overalt.** Alle visningene av en gruppe deler én kontroller
  (`useGruppechat`): menyen og helsiden viser de samme meldingene og ventende
  meldingene, med ett abonnement. Utkastene følger
  brukeren og gruppen (`Gruppechatskriving`), så det som er skrevet i menyen,
  står på helsiden og omvendt.
- **Lest.** Å åpne menyen merker ingenting lest. En samtale merkes lest av
  `Gruppechat` når den vises, vinduet er synlig, bunnen er nådd og chatten
  ikke står skjult (parkert bak hovedmenyen).
- **Lag og Escape** (flyt.md §3–4, `useEscapelag`): på helsiden gjenoppretter
  Escape. I menyen på brede flater slipper Escape fokus og lar menyen stå; på
  smale lukker den. Hovedmenyen parkerer menyen (den skjules med alt bevart).
  Chatmenyen og diskusjonsmenyen står åpne samtidig bare når siden mellom dem
  får minst `--lesebredde-minst` (45rem); ellers vinner den som ble åpnet sist
  (`useKantmeny`).
- **Fra andre steder.** `visGruppesamtale(gruppe)` (`chatstyring.ts`) åpner
  menyen på en gruppechat: «Åpne chat» i panelet og chatraden under «Siste
  aktivitet» på gruppesiden, og den gamle adressen. Står menyen ikke klar ennå
  (chatten er ikke hentet), venter samtalen til den gjør det.
- **Direktemeldingene (D5).** De er slått på med
  `*_direktemeldinger_aktivering.sql`, og hver bruker velger selv om de vil
  motta dem. Da står direktesamtalene i
  den samme lista, «Ny chat» ved overskriften, og bryterne «Tillat
  direktemeldinger» og «Vis når jeg er aktiv» nederst. En direktesamtale vises
  med den samme kontrolleren og `Gruppechat` (`art="direkte"`), på
  `#/chat/direkte/<ID>`. Uleste i dempede samtaler teller ikke på boblen.
  Tilgangen, tekstene og valgene står i
  [direktemeldinger-personvern.md](direktemeldinger-personvern.md).

### Den gamle chatsiden (D4b)

Fanen og chatsiden på gruppesiden er fjernet; alt den hadde (snakkeboblene,
grupperingen, dagene, Enter/Shift+Enter, eldre meldinger, rulleposisjonen,
utkastet, endring, sletting, moderering, lesere) står i chatmenyen, som viser
den samme `Gruppechat`. Den gamle adressen `#/grupper/<ID>/chat` virker
fortsatt: den åpner gruppesiden med samtalen i chatmenyen og skrives om til
`#/grupper/<ID>` uten en ny oppføring i historikken (D0 flyt.md §1).

### Uleste (D4b)

Uleste chatmeldinger har ett sted: tallet på chatboblen og chatknappen, og
per samtale i samtalelista (planen §8). Bjella viser og teller dem ikke.

- **Ett opphav.** Tallet er `gruppechat_lest` (`mine_gruppesamtaler`,
  `chat_uleste`), og lest merkes bare av `merk_gruppechat_lest`, som før: når
  samtalen vises, vinduet er synlig og bunnen er nådd. Å åpne menyen merker
  ingenting lest.
- **Ingen varsler.** Migrasjonen `20261118224500_chatvarsler_ut_av_bjella.sql`
  fjerner utløseren som lagde varsler i kategorien `gruppechat`, og merker
  de som sto uleste, lest, uten å slette noe. Meldingene, lesemerkene og
  lagringstiden er uendret. Kategorien står i databasens enum og i
  `VARSELKATEGORIER` med `utenforBjella`, så et eldre varsel eller et eldre
  valg aldri vises, telles eller kan velges i bjella.
- **Tilgang.** Den som ikke er aktivt medlem (invitert, fjernet, utenfor
  gruppen, systemarkitekt som ikke er med), har ingen samtale i lista og
  ingen uleste (`gruppesamtaler.test.ts`, `gruppechat.varsler.test.ts`).

## Grunnmuren (P7.0)

`supabase/migrations/20261117125500_p7_grunnmur.sql`, prøvd i
`src/__tests__/p7grunnmur.test.ts`. Ingen atferdsendring og ingenting
nettleseren kan kalle.

| Del | Hva | Brukes av |
| --- | --- | --- |
| `intern.gruppechat_aktivert()` | `false` til Peder har godkjent aktiveringen | A, C |
| `intern.ligner_personnummer(tekst)` | Sant når teksten har et gyldig fødsels-, D- eller H-nummer (11 sifre med kontrollsifre, også med mellomrom eller punktum etter de seks første) | A, D |
| `intern.krev_uten_personnummer(tekst)` | Kaster `22023` med `PASIENTREGEL.avvist` | A |
| `intern.merk_gruppechat_varsler_lest(gruppe, bruker, til_nr)` | Tom; tråd C fyller den med samme signatur | A kaller, C fyller |
| `@delt/pasientopplysninger` | `PASIENTREGEL` (tekstene) og `lignerPersonnummer`, de samme reglene som SQL-en; en test holder dem like | B, D |
| ~~`src/components/Pasientregel.tsx`~~ | Påminnelsen og advarselen ved skrivefeltene; fjernet igjen i D4 etter Peders beskjed 17.11.2026 (ingen påminnelser i appen) | – |
| `src/gruppechat/modell.ts` | Typene over, lesefunksjonene, `GRUPPECHAT_GRENSER`, `Gruppechat` | A, B, C |
| `src/gruppechat/api.ts` | Kallene til funksjonene over | C |
| `src/__tests__/hjelp/testchat.ts` | En `Gruppechat` i minnet med syntetiske meldinger | B |

Gjenkjenningen er et sikkerhetsnett for åpenbare feil, ikke en garanti: den
finner ikke navn, sjeldne diagnoser eller kasuistikker, og ingen tekst sendes
til eksterne tjenester for kontroll.

## Arbeidsdelingen

| Tråd | Leverer | Avhenger av | Filer bare den endrer |
| --- | --- | --- | --- |
| **P7.0** (denne) | Kontrakten og grunnmuren; koordinering, #369 og samlet rapport | — | Dette dokumentet utenom trådenes avsnitt, grunnmuren |
| **A** Database og tilgang | Tabellene, funksjonene, radsikkerheten på `gruppechatter`, `chat_uleste` i `gruppeoversikt`, negative tilgangstester, samtidighet mot ekte Postgres, lagringstiden (12 måneder) | Grunnmuren | Migrasjonene for chatten utenom varsler og publikasjon, `src/__tests__/gruppechat*.test.ts` utenom C og D sine, oppføringene i `funksjonskontroller.ts` |
| **B** Brukergrensesnittet | Chatfanen, meldingslista, skrivefeltet, historikken, tilgjengelighet, mobil, navigasjon | Grunnmuren (testchatten); kobles til `useGruppechat` når C er levert | `src/components/grupper/Gruppechat*.tsx`, `src/components/grupper/gruppechatvisning.ts`, `src/__tests__/gruppechatvisning.test.tsx`, `src/styles/gruppechat.css`, fanen i `Grupperside.tsx`, `GRUPPEFANER` i `src/domain/rute.ts`, lesingen av `chat_uleste` i `src/grupper/modell.ts` |
| **C** Sanntid og varsler | `useGruppechat`, sammenfletting og rekkefølge, sanntidsabonnementet, gjenoppkobling, livstegn, varselkategorien og -visningen, publikasjonen, sanntid i det lokale testmiljøet | Grunnmuren; As funksjoner for integrasjonstestene | `src/gruppechat/` utenom `modell.ts`, varselmigrasjonene og publikasjonen, `src/varsler/modell.ts`, `Varsler.tsx` (rutingen), `src/__tests__/qa/lokalmiljo.ts` (sanntiden) |
| **D** Personvern og kvalitet | `docs/pasientopplysninger.md` (den globale regelen og håndteringen av hendelser), `docs/gruppechat-personvern.md` (D6), regelen i `AGENTS.md` og `docs/prosjektansvar.md`, kartleggingen av fritekst- og filflatene (også fortolkningen), påminnelsen der brukerne skriver fritekst (D2, fjernet igjen i D4 etter Peders beskjed 17.11.2026), testmatrisen og sluttkontrollen i nettleseren | Grunnmuren; krysstestene og nettleserkontrollen etter A–C | Dokumentene over, `docs/p7-testplan.md`, egne testfiler (`src/__tests__/gruppechat.krysstest.test.ts`, QA-skriptene) |
| **E** Forberedelse av P8 | `docs/p8-fildeling-plan.md`: kartlegging og plan for fildeling i gruppene. Ingen kode | — | Bare plandokumentet |

**Regler for trådene:**

1. Hver tråd har egen gren og egne, små PR-er. En PR som bygger på en annen
   som ikke er slått sammen, sier det under «Avhengigheter».
2. Migrasjonene får tidspunktet i UTC når de skrives og må være nyere enn
   alle på `main` og i PR-ene de bygger på.
3. Felles lister som bare vokser (`funksjonskontroller.ts`,
   `REKKEVIDDEHJELPERE`, `VARSELKATEGORIER`) kan alle legge til i; en
   flettekonflikt der løses ved å beholde begge.
4. Ingen tråd lager en egen variant av grunnmuren eller en egen tabell for det
   en annen tråd eier. Trengs en endring i kontrakten, avklares den med
   P7-tråden først.
5. Hver PR har én føring i endringsloggen (`docs/endringslogg.md`),
   etiketten `ansvar:dev`, tittelen «Til ChatGPT-kontroll – ikke merge: …»,
   HEAD-SHA og kjørte kontroller.
6. Bare syntetiske testdata. Ingen automatiske tester mot produksjonen.
7. Ingen kliniske regler, fortolkningsresultater eller faglige tekster
   endres.

## Tester og akseptkriterier

Felles krav for hver PR: `npm test`, `npm run build`, negative tester for hver
ny inngang og samtidighet der to kan endre det samme. Akseptkriteriene fra
bestillingen, med tråden som prøver dem først:

| # | Kriterium | Prøves av |
| --- | --- | --- |
| 1 | To medlemmer utveksler meldinger i sanntid | C (integrasjon), D (nettleser) |
| 2 | Et medlem kan ikke lese en annen gruppes meldinger, heller ikke med direkte kall | A |
| 3 | Medlemmer fra ulike fagmiljøer chatter i en tverrfaglig gruppe uten tilgang til lokale data | A, D |
| 4 | Et medlem som fjernes mens chatten er åpen, mister tilgangen | A (database), C (åpen chat), D (nettleser) |
| 5 | Gyldig innlogging, avsluttet medlemskap: verken hente eller sende | A |
| 6 | En arkivert gruppe tar ikke imot nye meldinger | A |
| 7 | En frakoblet bruker får riktig historikk ved gjenoppkobling | C |
| 8 | Samtidige meldinger uten tap eller duplikater | A (ekte Postgres), C (fletting) |
| 9 | Redigering og moderering følger rettighetene | A, B |
| 10 | Tastatur, mobil og skjermleser | B, D |

## Leveransene

Fylles ut av trådene.

| Del | PR | Status |
| --- | --- | --- |
| P7.0 kontrakt og grunnmur | [#440](https://github.com/peohol/ousfar/pull/440) | Slått sammen |
| E1 Plan for fildeling i gruppene (P8) | [#439](https://github.com/peohol/ousfar/pull/439) | Slått sammen |
| C1 sanntid og tilstand i appen (`useGruppechat`) | [#441](https://github.com/peohol/ousfar/pull/441) | Slått sammen |
| D1 Regelen om pasientopplysninger, D6 og testplanen | [#442](https://github.com/peohol/ousfar/pull/442) | Slått sammen |
| A1 Database og tilgang | [#443](https://github.com/peohol/ousfar/pull/443) | Slått sammen |
| D2 Regelen og advarselen ved de eksisterende skrivefeltene (fjernet igjen i D4) | [#445](https://github.com/peohol/ousfar/pull/445) | Slått sammen |
| B1 chatvisningen | [#444](https://github.com/peohol/ousfar/pull/444) | Slått sammen |
| C2 varsler, publikasjonen og sanntid i det lokale testmiljøet | [#447](https://github.com/peohol/ousfar/pull/447) | Slått sammen |
| D3 krysstestene og sluttkontrollen | [#449](https://github.com/peohol/ousfar/pull/449) | Slått sammen |
| D4 Påminnelsene om pasientopplysninger fjernes (Peder 17.11.2026) | [#450](https://github.com/peohol/ousfar/pull/450) | Slått sammen |
| Aktiveringen (slås sammen sist) | [#448](https://github.com/peohol/ousfar/pull/448) | Til kontroll |
