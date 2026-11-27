# Personvern i gruppechatten (D6)

Den avgrensede personvern- og funksjonsvurderingen for gruppechatten i P7
(beslutning D6 i `docs/ousfar-nasjonal-p0-kartlegging.md`, sikkerhetsport S5).
Kontrakten for chatten står i [gruppechat.md](gruppechat.md), og den varige
regelen om pasientopplysninger i [pasientopplysninger.md](pasientopplysninger.md),
som gjelder fullt ut her.

Vurderingen foreslår **konservative standardvalg**: chatten tar vare på så
lite som mulig, så kort som mulig, og viser det bare til dem som er med.
Hvert valg er merket med hvem som eier det:

- **Avgjort:** Peder har bestemt det.
- **Teknisk:** et valg Claude og ChatGPT tar innenfor Peders rammer. Det kan
  endres senere uten tap av data, og trenger ikke eget ja.
- **Peders ja:** krever en beslutning fra Peder før det kan gjøres.

## Det chatten behandler

| Opplysning | Hvor | Hvorfor |
| --- | --- | --- |
| Meldingsteksten | `gruppemeldinger.tekst` | Selve chatten. Fjernes når meldingen slettes |
| Hvem som skrev og når, og om den er endret eller slettet, av hvem og når | `gruppemeldinger` | Samtalen må henge sammen; moderering skal kunne etterprøves |
| Hvor langt hver bruker har lest | `gruppechat_lest.lest_til_nr` | Tallet på uleste og varslene. Vises ikke for andre |
| At chatten har endret seg | `gruppechatter` (løpenummer og endringsteller, ingen tekst eller avsender) | Låsen for skrivingen og dørklokken for sanntiden |
| At det er nye meldinger | `varsler` (gruppe-ID, antall, tidspunkt) | Varselet i bjella. Ingen tekst og ingen avsendernavn |
| Avsenderens profilkort | `profiles` (fra før) | Navn og bilde ved meldingen, som ellers i samhandlingen |

Chatten lagrer ikke hvem som har lest hvilken melding, IP-adresser, enheter
eller noe annet om bruken.

## Standardvalgene

| Område | Valg | Eier |
| --- | --- | --- |
| **Lagringstid** | 12 måneder. En melding eldre enn det slettes helt (raden fjernes) og kan ikke hentes tilbake, også de som står som slettet. Den er borte for brukerne fra fristen, også før raden er ryddet | Avgjort (Peder, 17.11.2026) |
| Lesestatus | `gruppechat_lest` har bare ett tall per bruker og gruppe, og står så lenge gruppen finnes. Den sier ikke hva som er skrevet | Teknisk |
| Varslene | Ryddes som de andre varslene: leste etter 30 dager (`intern.varselfrist()`) | Teknisk (fra før) |
| **Redigering** | Bare forfatteren, så lenge gruppen er aktiv. Den nye teksten erstatter den gamle, som ikke lagres; meldingen merkes «redigert» med tidspunktet. Ingen tidsfrist | Teknisk |
| **Sletting** | Forfatteren, og gruppens moderatorer og ansvarlige og systemarkitektene; i en arkivert gruppe bare systemarkitektene. Teksten settes til tom i databasen med en gang. Plassen står som «Meldingen er slettet» eller «Fjernet av en moderator», med hvem og når, så samtalen henger sammen | Teknisk |
| **Moderering** | Moderatorene fjerner uønsket innhold ved å slette det; det finnes ingen «skjul» med en lagret kopi, som i diskusjonene, fordi en kopi er det som skal bort når noe er delt ved en feil. Vedvarende misbruk: en ansvarlig fjerner personen fra gruppen. Ingen «meld fra»-knapp i første versjon; man sier fra til en moderator | Teknisk |
| **Innsyn: hvem leser** | De aktive medlemmene i gruppen, og systemarkitektene i OUSFAR (myndigheten fra P6). Ikke inviterte, fjernede, lokale administratorer som ikke er med, eller andre. Chatten sier det ikke lenger øverst (Peder 20.11.2026: overflødig); tallene kommer fortsatt med samtalen (`lesere`). | Teknisk (innenfor P6) |
| Tap av tilgang | Når medlemskapet i gruppen, fagmiljøet eller OUSFAR avsluttes, er tilgangen borte med en gang: databasen avviser neste henting, sanntiden sender ikke flere hendelser, og en åpen chat tømmes innen ett minutt (livstegnet) | Teknisk |
| **Tilgangslogg** | Ingen logg over hvem som leste hva. Modereringen lagres på meldingen selv (`slettet_av`, `slettet_kl`); medlemskapene føres i tilgangsloggen som før. Meldingsteksten skrives aldri i tilgangsloggen, feilmeldinger, `raise`-tekster eller varsler | Teknisk |
| **Utilsiktet delte opplysninger** | Brukerne er godt trent i personvern, så chatten minner ikke om regelen ved skrivefeltet (Peder 17.11.2026, se `pasientopplysninger.md`). Databasen avviser tekst som ligner et fødselsnummer, og appen viser avslaget. Ellers fjernes det etter hendelsesrutinen i `pasientopplysninger.md`: forfatteren eller en moderator sletter meldingen, og teksten er borte fra databasen, varslene og de åpne chattene innen ett minutt | Teknisk |
| Slettet konto | Meldingene står med avsenderen tom («tidligere bruker»), som idéene og diskusjonene, til lagringstiden går ut | Teknisk |
| **Varslingsinnhold** | «Nye meldinger i <gruppe>» med antallet. Aldri tekst, utdrag eller avsendernavn. Ingen e-post. Varsel på enheten (push) for den som selv har slått det på: gruppens navn og antallet uleste, kryptert for enheten (`chatvarsler.md`) | Teknisk; push: Peder 19.11.2026 |
| **Eksterne tjenester** | Supabase (EU) lagrer meldingene. Sanntiden (Supabase Realtime) bærer bare dørklokken på `gruppechatter`, uten tekst og avsender, og radsikkerheten gjelder for hver hendelse. Ingen AI eller annen tjeneste får chatinnhold, heller ikke for kontroll | Teknisk |
| Grenser | Høyst 4000 tegn per melding og 20 nye meldinger i minuttet per bruker og gruppe | Teknisk |
| Søk og eksport | Finnes ikke i første versjon | Teknisk |
| Filer og vedlegg | Finnes ikke; hører til P8 og krever egen vurdering | Peders ja (P8) |

## Det som krever Peders ja

- **Å slå på chatten (S5). Gitt** av Peder 17.11.2026 («Ja, skru på
  chatten.», P7-tråden). Aktiveringen er migrasjonen
  `*_gruppechat_aktivering.sql`, slått sammen etter punktene under.
- Å avvike fra standardvalgene på en måte som tar vare på mer, lenger eller
  hos flere: lengre lagringstid, en lagret kopi av slettet eller endret tekst,
  logg over hvem som leste hva, e-post eller push med innhold, eksport, eller
  en tjeneste utenfor OUSFAR som får chatinnhold.
- Filvedlegg (P8).

Endringer som tar vare på mindre (kortere frister, færre lesere) er tekniske
og kan gjøres uten eget ja, men skal skrives her.

## Kjente begrensninger

- **Sikkerhetskopier.** En slettet eller endret melding finnes i
  sikkerhetskopiene til de er ryddet, normalt om lag 8 døgn
  ([sikkerhetskopi-personvern.md](sikkerhetskopi-personvern.md)), og en
  gjenoppretting må fjerne det som var slettet etter at kopien ble tatt.
- **Arkiverte grupper.** I en arkivert gruppe kan bare systemarkitektene
  slette meldinger, så noe som ikke hører hjemme der, kan fjernes uten å åpne
  gruppen igjen. Idéene og oppgavene i en arkivert gruppe er fortsatt frosset
  (K2 i `pasientopplysninger.md`).
- **Skjermen hos andre.** En melding som slettes, kan stå på en annen brukers
  skjerm til chatten der henter endringene, høyst ett minutt med åpen chat.
  Det som er lest eller kopiert, kan ikke kalles tilbake.
- **Innsyn for den registrerte.** Ingen eksport i første versjon. Ber en
  bruker om innsyn i egne meldinger, kan en systemarkitekt hente dem ut av
  databasen.
- **Fødselsnummerkontrollen** er et sikkerhetsnett, ikke en garanti
  (`pasientopplysninger.md`).

## Det som gjenstår for S5

S5 er Peders ja til å slå på chatten. Han ga det 17.11.2026, før
sluttkontrollen var ferdig; aktiveringsmigrasjonen slås derfor ikke sammen før
dette er oppfylt:

1. Trådene A, B og C er slått sammen, og migrasjonene er rullet ut med
   chatten avslått.
2. Krysstestene og sluttkontrollen i [p7-testplan.md](p7-testplan.md) er
   grønne (tråd D3), med funnene rettet.
3. Denne vurderingen er kontrollert, og standardvalgene står i appen slik de
   står her.

Med 1–3 oppfylt kan aktiveringen slås sammen uten nytt spørsmål til Peder.
