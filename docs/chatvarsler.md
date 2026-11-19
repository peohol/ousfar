# Varsler på enheten om nye chatmeldinger

Leses når varslene om nye meldinger i gruppechatten og direktemeldingene
endres: hva de viser, hvem som får dem, og hvordan de sendes. Peder ba om dem
19.11.2026: «Innfør muligheten for å få skrivebordsvarsler eller varsler på
mobil hvis man får nye meldinger i chatten. Hvis man trykker på varslet, skal
man komme direkte til den aktuelle chatten.»

## Kort fortalt

- Hver bruker slår dem på selv, **per enhet**: bryteren «Varsler på denne
  enheten» under Konto → Innstillinger → Chat. Den står av til man slår den
  på, og gjelder bare nettleseren den slås på i.
- Et varsel kommer når noen andre skriver i en gruppechat man er aktivt
  medlem av, eller sender en direktemelding man kan motta (bryteren på, ikke
  blokkert, samtalen ikke dempet).
- Varselet sier **aldri hva som er skrevet eller hvem som skrev det**: bare
  gruppens navn eller «Direktemelding», og hvor mange uleste det er.
  Trykk på varselet åpner samtalen (`#/chat/gruppe/<id>` eller
  `#/chat/direkte/<id>`), i et vindu med appen som alt er åpent, ellers i et nytt.
- Har mottakeren alt lest meldingen (samtalen er åpen), kommer det ikke noe
  varsel. Ellers vises det, også når appen er åpen: nettleserne krever at
  hvert varsel som leveres, vises (`userVisibleOnly`).
- Et nytt varsel om den samme samtalen erstatter det forrige, så det blir
  ett per samtale.
- Varslene slutter når man slår av, logger ut (på enheten også når serveren
  ikke svarer), mister tilgangen til gruppen eller OUSFAR, eller en annen
  konto logger inn i den samme nettleseren.

### Nettlesere og enheter

| Enhet | Hva som trengs |
| --- | --- |
| PC og Mac (Chrome, Edge, Firefox, Safari) | Slå på i Innstillinger og si ja når nettleseren spør |
| Android (Chrome, Firefox, Samsung Internet) | Det samme |
| iPhone og iPad (iOS 16.4 eller nyere) | Legg OUSFAR til på Hjem-skjermen (Del → Legg til på Hjem-skjerm), åpne appen derfra, og slå på der. I Safari-fanen kan iOS ikke vise varsler; bryteren forklarer det |

Har man sagt nei i nettleseren, sier bryteren at varsler er blokkert, og at
det må tillates i nettleserens innstillinger.

## Personvernet

| Spørsmål | Svar |
| --- | --- |
| Innholdet i varselet | Tittel (gruppens navn eller «Direktemelding»), en tekst med antallet uleste, adressen til samtalen og et merke. Ingen meldingstekst, ingen avsender, ingen ID-er for personer |
| Hvem ser det | Den som har enheten. Det kan stå på låseskjermen; derfor står det verken tekst eller avsender |
| Push-tjenestene | Nettleserens egen tjeneste bringer varselet fram: Google (Chrome, Edge og Android), Mozilla (Firefox), Apple (Safari) eller Microsoft (eldre Edge). Varselet er kryptert for den ene nettleseren (RFC 8291), så tjenesten kan ikke lese det. Den ser at enheten får et varsel, når, og hvor stort det er |
| Hva databasen lagrer | Per enhet: push-tjenestens adresse for nettleseren og nøklene varselet krypteres med (`public.pushabonnementer`), og hvem det hører til. Ingenting om hvilke varsler som er sendt |
| Køen | En ny melding legger bare ID-ene sine i `intern.chatvarselko`, og bare når noen som kan få varsel om den, har varsler på. Raden slettes når varslene hentes, og brukes aldri etter ti minutter. Det som er eldre, slettes ved neste henting eller melding i køen, og senest av nattjobben for lagringstiden (`intern.rydd_chatvarselko()`) |
| Når abonnementet slettes | Når brukeren slår av eller logger ut, når kontoen slettes, når push-tjenesten sier at det ikke finnes lenger, og når en annen konto logger inn på enheten (da avsluttes det i nettleseren og forsvinner ved neste forsøk). Høyst ti enheter per bruker; den eldste faller ut |
| Gruppechatten og direktemeldingene | Uendret: ingen kan lese mer enn før, og ingen tekst går ut av Supabase. Direktemeldinger varsles bare til den andre i samtalen |

Dette er innenfor beslutningene i `gruppechat-personvern.md` og
`direktemeldinger-personvern.md`: push uten innhold. Varsler **med** tekst
eller avsendernavn krever et nytt ja fra Peder.

## Slik virker det

1. **Abonnementet.** Når brukeren slår på, registrerer appen
   tjenestearbeideren `public/chatvarsler.js`, ber om tillatelse, henter den
   offentlige VAPID-nøkkelen fra Edge-funksjonen `chatvarsel`
   (`{ handling: 'nokkel' }`), abonnerer hos nettleserens push-tjeneste og
   lagrer abonnementet (`lagre_pushabonnement`). Hvilken konto abonnementet på
   enheten hører til, står i nettleserens lokale lager
   (`src/chatvarsler/enhet.ts`).
2. **Køen.** Utløserne `gruppemeldinger_chatvarsel` og
   `direktemeldinger_chatvarsel` legger en ny melding i køen når minst én
   mottaker har et abonnement. Mottakerne avgjøres av
   `intern.chatvarselmottakere`, som også brukes når varslene hentes.
3. **Utsendingen.** Etter en sending venter appen halvannet sekund (så en
   mottaker som har samtalen åpen, rekker å lese) og ber `chatvarsel` sende
   (`{ handling: 'send' }`, `src/chatvarsler/api.ts`). Funksjonen henter
   avsenderens kø med den hemmelige nøkkelen (`chatvarsel_hent`): ett varsel
   per mottaker, samtale og enhet, med antallet uleste, og bare der det er
   uleste. Den krypterer og sender hvert varsel (`_edge/webpush.ts`,
   `_edge/chatvarsler.ts`), og sletter abonnementene push-tjenesten svarer
   404 eller 410 på (`chatvarsel_fjern_abonnementer`). Den sender bare til
   kjente push-tjenester (`PUSHTJENESTER` i `_delt/chatvarsel.ts`).
4. **Visningen.** Tjenestearbeideren viser hvert varsel, og åpner samtalen ved
   trykk. Mens appen er åpen, sender den adressen til vinduet, som bytter side
   uten å laste på nytt (`Chatvarselvakt`).

Den innloggede kan ikke velge hvem som får varsel eller hva det står:
funksjonen sender bare om egne nye meldinger, og hver melding bare én gang
(køen tømmes når den hentes). Lukkes fanen før halvannet sekund har gått,
blir det ikke sendt noe varsel om den meldingen.

Varslene teller ett kall til Edge-funksjonen per sending (gratisplanen har
500 000 i måneden), og ingen ekstra lesing når ingen har varsler på.

## Nøklene

VAPID-nøklene ligger som hemmeligheter i miljøet til Edge-funksjonene i
Supabase, ikke i repoet: `CHATVARSEL_VAPID_OFFENTLIG` (den offentlige nøkkelen,
65 byte, base64url) og `CHATVARSEL_VAPID_PRIVAT` (skalaren `d`, 32 byte,
base64url). `CHATVARSEL_KONTAKT` er adressen push-tjenestene kan kontakte
(`mailto:` eller `https:`; i dag appens adresse); uten den brukes prosjektets
Supabase-adresse. De tre ble satt i produksjonen 19.11.2026, med nøkler laget
for formålet. Mangler nøklene, svarer funksjonen 503, og bryteren sier at
varsler ikke kan slås på akkurat nå.

Nye nøkler lages med WebCrypto (P-256) og settes med Management API-et
(`POST /v1/projects/<ref>/secrets`). Byttes de, virker ikke de gamle
abonnementene lenger; appen lager et nytt neste gang brukeren slår på, og de
gamle slettes når push-tjenesten avviser dem.

## Ikonene

`public/ikon-180.png`, `ikon-192.png` og `ikon-512.png` er `favicon.svg` uten
runde hjørner, gjengitt i de tre størrelsene. Varselet bruker 192, Hjem-skjermen
på iPhone 180 (`apple-touch-icon`), og `public/manifest.webmanifest` alle.
Endres `favicon.svg`, lages de på nytt.

## Testene

- `src/__tests__/chatvarsler.test.ts`: abonnementene, køen, mottakerne og
  utsendingen ende til ende mot testdatabasen, med en falsk push-tjeneste som
  dekrypterer varselet.
- `src/__tests__/chatvarsler.webpush.test.ts`: krypteringen mot eksempelet i
  RFC 8291 og VAPID-signaturen.
- `src/__tests__/chatvarsler.enhet.test.ts`: enheten med en falsk nettleser, og
  at tjenestearbeideren og appen er enige.
- `src/__tests__/qa/chatvarslernettleser.ts`: tjenestearbeideren i en ekte
  nettleser i det lokale testmiljøet (varselet vises og åpner samtalen).
