# Sikkerhetskopiene og personvernet

Vurderingen før kopiene av produksjonen settes i drift (tiltak 3, issue
#615, [drift-gjenoppretting.md](drift-gjenoppretting.md), «Kopiene i drift»).
Kopieringen står av (`PRODUKSJONSKOPI_PA` i `src/drift/sikkerhetskopi/drift.ts`)
til Peder har avgjort punktene under «Det Peder avgjør».

## Hva som behandles, og hvor

| Steg | Hvor | Hva som er der |
| --- | --- | --- |
| Lesing | Supabase, `eu-north-1` (som i dag) | Databasen og profilbildene, lest med en midlertidig, skrivebeskyttet rolle |
| Kopien lages | En maskin GitHub leier ut for jobben (GitHub-hosted runner), som slettes når jobben er ferdig | Kopien **ukryptert** i minnet og på maskinens disk mens den lages: brukernavn, navn, profilbilder, passordhasher, tofaktornøkler, fritekst i diskusjoner, gruppechat og idéer, tilgangsloggen. Ingen direktemeldinger (under). Krypteres med `age` før noe forlater maskinen |
| Lagring | Backblaze B2, EU (`eu-central-003`) | Bare krypterte filer og signaturer. Backblaze kan ikke lese dem |
| Nøkkelen | Hos nøkkeleieren, to uavhengige steder | Den eneste nøkkelen som kan åpne kopiene. Aldri i GitHub, Backblaze eller hos Claude |

Ingenting av innholdet skrives til loggen, lastes opp som artefakt eller
legges i en cache, og bare koden på `main` kjører med hemmelighetene.

## GitHubs maskiner

[s4-pilotplan.md](s4-pilotplan.md) §3.4 lister GitHub som databehandler for
«kode og hemmeligheter, ingen persondata». Med kopijobben på GitHubs maskiner
behandler GitHub personopplysningene i noen minutter hver natt, ukryptert på
en maskin som slettes etterpå. Det er en endring fra dagens beskrivelse, og
derfor Peders avgjørelse.

- **For:** maskinen brukes bare av jobben og slettes etterpå; den kjører bare
  kode fra `main`; ingen ansatte i GitHub ser innholdet i vanlig drift; det
  er de samme leide maskinene som alt kjører migrasjonene og nattjobbene mot
  produksjonen. Det trengs ingen egen maskin som må holdes oppdatert.
- **Mot:** GitHubs maskiner står normalt i USA, så kopien behandles utenfor
  EU i noen minutter. GitHub er en ny databehandler for persondata, og
  databehandleravtalen må dekke det.
- **Alternativ:** en egen maskin i EU eller hos OUS som kjører jobben
  (self-hosted runner). Den må driftes, oppdateres og sikres, og den som har
  tilgang til den, har tilgang til kopien mens den lages.

**Anbefaling:** godkjenne GitHubs maskiner, og føre GitHub som databehandler
for kopijobben i oversikten (§3.4). Det gir minst risiko for en liten
installasjon uten egen drift. Passer det ikke med OUS' regler for
overføring, er en egen maskin i EU alternativet; koden er den samme.

## Direktemeldingene, gruppechatten og sletting

- **Direktemeldingene** er ikke med (Peders beslutning 3, 18.11.2026):
  hverken meldingene (`direktemeldinger`) eller samtalene (`direktesamtaler`,
  hvem som skriver med hvem, og når) eller lest-statusen deres
  (`direktesamtale_status`). Uten meldingene ville samtalene vært tomme, så
  kopien tar ikke med mer om de private samtalene enn den må. Valgene
  (`chatvalg`) og blokkeringene er med, så en gjenoppretting ikke opphever en
  blokkering. Ingen annen tabell har tekst fra direktemeldingene; det
  kontrolleres i testene mot databasen migrasjonene bygger, og kopien
  stopper hvis en tabell som er med, viser til en som er utelatt.
- **Køene for chatvarsler** er ikke med; de er flyktige.
- **Gruppechatten, diskusjonene og resten** er med. En slettet eller endret
  tekst finnes i kopiene til de er ryddet: en bit ingen kopi bruker lenger,
  slettes om lag 8 døgn etter endringen. Står kopieringen fast, beholdes den
  siste hele kopien til en ny er tatt, så det kan bli lenger.
- **Etter en gjenoppretting** må det som var slettet etter at kopien ble
  tatt, slettes på nytt ([pasientopplysninger.md](pasientopplysninger.md),
  «Kopiene utenfor databasen»). Lagringstiden på 12 måneder i chatten
  håndheves av nattjobben også etter en gjenoppretting.

## Det Peder avgjør

1. **Nøkkeleier:** hvem som lager og har den private nøkkelen (nøkkelsiden),
   og hvor den uavhengige kopien ligger.
2. **Beredskap:** hvem som kan sette i gang en gjenoppretting om databasen
   går tapt, og hvem som har nøkkelen om nøkkeleieren ikke er tilgjengelig.
3. **GitHubs maskiner:** om kopien kan lages der (anbefalt over), eller på en
   egen maskin i EU.

Backblaze er en ny databehandler for krypterte persondata.
Databehandleravtalen deres bør aksepteres på kontoen og føres i oversikten.
