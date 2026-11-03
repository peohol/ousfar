# OUSFAR Verktøy – rettigheter til Psychiatrienets anbefalinger

**Undersøkt:** 27.10.2026 (P3.1 i `docs/verktøy-utviklingsplan.md`), revidert samme dag etter kontroll av PR #281. **Undersøkt på nytt 03.11.2026** for den kliniske leveranseplanen (`docs/verktøy-klinisk-leveranseplan-2026-11.md` §4, spor B).

**Konklusjon:** Psychiatrienet gir ingen lisens til å kopiere, lagre eller videreformidle anbefalingene, og utgiveren er nå en del av Koninklijke Boom uitgevers, som generelt forbeholder seg både opphavsrett og databaserett. OUSFAR lagrer derfor ingen tekst fra kilden, bare et minimum av metadata som trengs for å vise til og følge med på hver anbefaling (koordinater, lenke, revisjon, tidspunkt, kontrollsum og hvilke legemidler og hvilken retning siden gjelder). **OUSFAR viser aldri Psychiatrienets anbefalinger ordrett, heller ikke korte sitater, og heller ikke oversatt eller omskrevet.** Det som vises, er OUSFARs egne, faglig vurderte og matematisk formulerte regler med kildehenvisning.

**Selvstendige regler er ikke avhengige av tillatelse.** Faglige metoder, doseprinsipper og medisinske fakta er ikke i seg selv opphavsrettslig vernet. OUSFAR kan derfor lage og publisere selvstendige, kildekritisk vurderte regler fra preparatomtaler, primærlitteratur og andre lovlig tilgjengelige kilder, også når en regel ligner en anbefaling hos Psychiatrienet. Der Psychiatrienet er brukt som faglig referanse, kildehenvises det. Hvordan regelmotoren bygger på kildene, står i «Regelgrunnlaget» nederst.

**Systematisk masseoverføring er en annen sak.** Et systematisk, omfattende uttrekk og en ombygging av Psychiatrienets tabellsett kan reise databaserettslige spørsmål, også når alt er omskrevet. Det er ikke fastslått at samlingen oppfyller vernevilkårene, eller at en konkret bruk fra OUSFAR ville krenke et slikt vern, og det skal ikke fremstilles som ulovlig. Planlegges en slik masseoverføring, bør enten en tillatelse fra utgiveren eller en konkret juridisk avklaring foreligge før den gjennomføres. Ingen slik overføring er planlagt.

**Henvendelsen til utgiveren er et frivillig utkast.** Den er ikke sendt, Peder ønsker ikke å sende den nå (03.11.2026), og den er **ikke et blokkeringstrinn**: ingen regel, godkjenning eller leveranse venter på den eller på et svar, og det er ingen oppgave eller frist knyttet til den.

Dette er en faglig og praktisk vurdering, ikke en juridisk betenkning (se «Trengs en juridisk vurdering?»).

## Hva som er funnet

Kontrollert 27.10.2026 og på nytt 03.11.2026 (sidene lest, ingen tekst lagret):

- **Eier:** Psychiatrienet «is een website van De Tijdstroom», og kontaktsiden sier at nettstedet er «eigendom van De Tijdstroom Uitgeverij» (De Tijdstroom uitgeverij BV, Utrecht, KvK 71653430). **Nytt 03.11.2026:** `tijdstroom.nl` sender nå videre til `boom.nl/medisch`, der forlaget heter «Boom Medisch | de Tijdstroom» og er en del av Koninklijke Boom uitgevers B.V. (Meppel). Forlagsredaktør er Hannah Klein Haneveld, som også er sluttredaktør for Psychiatrienet ifølge colofonen (`/colofon`). Switchtabellene redigeres av Walter J. Broekema og Joost van Raaij.
- **Kontaktadresse for switchtabellene:** hver tabellside ber nå om forslag til `medisch@boom.nl`.
- **Ingen lisens på Psychiatrienet:** verken tabellsidene, anbefalingssidene, colofonen, kontaktsiden eller disclaimeren nevner lisens eller vilkår for gjenbruk. Disclaimeren handler bare om ansvar. `robots.txt` sperrer ingenting, og det finnes ingen maskinlesbar reservasjon mot tekst- og datautvinning (`/.well-known/tdmrep.json` og `/ai.txt` svarer 404).
- **Boom uitgevers' generelle vilkår (nytt 03.11.2026):**
  - Disclaimeren på `boom.nl` sier at all informasjon på «deze site» tilhører Koninklijke Boom uitgevers, bare kan brukes privat og ikke kan mangfoldiggjøres, lagres i en automatisert database eller offentliggjøres uten skriftlig samtykke. Den nevner forlagets egne nettsteder og nettsteder til lærebøker. Det er **ikke avklart** at den gjelder `psychiatrienet.nl`, men den viser forlagets holdning.
  - De alminnelige vilkårene (art. 9) forbeholder forlaget blant annet opphavsrett og databankrett til innholdet og forbyr bruk av innholdet i eller for kunstig intelligens og språkmodeller uten skriftlig samtykke. Vilkårene gjelder avtaler med kunder (kjøp og abonnement), ikke uten videre en gratis besøkende, men forbeholdet om KI er relevant fordi OUSFAR utvikles med et KI-verktøy (se «Vurdering per bruk»).
- **Repoet er offentlig** (`peohol/ousfar` på GitHub). Det som legges der, er videreformidlet til alle. Selve appen er lukket: bare brukere en administrator har opprettet, kan logge inn (`docs/brukere.md`).

## Det rettslige utgangspunktet

To ulike vern kan være aktuelle, og de må holdes fra hverandre:

- **Opphavsrett** (i Nederland Auteurswet 1912, i Norge åndsverkloven § 2) verner **uttrykksformen**: formuleringene, valget av ord og oppbyggingen av den enkelte teksten. Den verner ikke medisinske fakta, ideer eller metoder. At en anbefaling sier «stopp A dag 1, start B dag 2», er en faglig metode; måten den er skrevet på, er vernet. Sitatretten (åndsverkloven § 29) gir ikke rett til å gjengi anbefalingene, og OUSFAR skal uansett ikke sitere dem.
- **Databasevern** (EUs databasedirektiv 96/9/EF art. 7, i Nederland Databankenwet, i Norge åndsverkloven § 24) kan verne en samling mot at hele eller en **vesentlig del** av innholdet hentes ut eller brukes på nytt, også når enkeltdelene er fakta, og mot gjentatt, systematisk uttrekk av uvesentlige deler. Vernet gjelder bare når produsenten har gjort en **vesentlig investering i å skaffe, kontrollere eller presentere** innholdet; investering i å *skape* selve innholdet teller ikke (EU-domstolen, C-203/02 *British Horseracing Board* og C-46/02 *Fixtures Marketing*). EU-domstolen har senere presisert at et uttrekk bare er forbudt når det kan skade produsentens mulighet til å få igjen investeringen, typisk når den nye tjenesten kan erstatte databasen (C-762/19 *CV-Online Latvia*, 2021). **Det er ikke fastslått at Psychiatrienets samling har slikt vern**, men forlaget hevder generelt databankrett, og tabellene er revidert 2024–2026, så et eventuelt vern løper fortsatt.

Det betyr i praksis: enkeltstående, selvstendig vurderte regler med kildehenvisning har lav risiko. Et komplett OUSFAR-regelsett bygget ut fra alle 1 044 kildeoppføringene celle for celle kunne for norske klinikere bli en **erstatning** for switchtabellene, også om ingen tekst er gjengitt. Det er den bruken som bør ha en tillatelse eller en konkret juridisk avklaring før den eventuelt gjennomføres. Det betyr ikke at den er fastslått å være ulovlig.

At OUSFAR ikke lagrer tekst, og at koordinater og legemiddelnavn hver for seg er fakta, betyr altså ikke automatisk at et systematisk uttrekk av hele samlingen er fritt. Et unntak for tekst- og datautvinning (DSM-direktivet (EU) 2019/790) legges heller ikke til grunn: forlaget har reservert seg i vilkårene sine, og det er ikke vurdert om eller hvordan unntaket gjelder i Norge.

## Vurdering per bruk

| Bruk | Vurdering | Hva OUSFAR gjør |
| --- | --- | --- |
| Lese sidene og lenke til dem | Tillatt. | Hver kildeoppføring har adressen til siden. |
| Lagre metadata om sidene: tabellkoordinater og lenker, revisjon, tidspunkt, kontrollsum, legemiddelnavnene siden oppgir og hvilken retning den gjelder, og hva slags avsnitt den har | Ingen tekst fra kilden, så opphavsretten til tekstene berøres ikke. Men det er et systematisk uttrekk av samlingens oppbygning (hvilke kombinasjoner som har en anbefaling, og hvor). Hvis samlingen har databasevern, er det **ikke avklart** at dette er tillatt. Vurdert som akseptabelt fordi det er et minimum for å kunne vise til og følge med på kilden, ikke gjengir noen anbefaling og ikke kan erstatte kilden, men det hevdes ikke å være ubetinget tillatt. | Lagres i `src/data/verktoy/psychiatrienet-kildearkiv.json`, med en fast liste over tillatte felt i testene. Spørsmål 1 i utkastet. |
| Automatisk lesing for å oppdage endringer (P12): et skript leser alle sidene i minnet, regner ut kontrollsummen og sammenligner, første mandag i hver måned (`.github/workflows/verktoy-overvaking.yml`) | Gjentatt, systematisk henting av hele samlingen, men ingen lagring av tekst og ingen gjengivelse. Den månedlige kjøringen er et vanlig skript på GitHub Actions, uten KI. Skriptene er skrevet og vedlikeholdes med et KI-verktøy (Claude Code), det første fullstendige uttrekket (27.10.2026) ble kjørt fra det utviklingsmiljøet, og enkeltsider er kontrollert derfra (sist 03.11.2026). Forlagets vilkår forbeholder bruk «ten behoeve van» KI. Lav risiko, men **ikke avklart**. Dette er en annen bruksform enn å lage enkeltregler, og vurderes for seg. | Fortsetter uendret inntil videre; stanses straks hvis utgiveren ber om det. Spørsmål 2 i utkastet. |
| **Intern lagring** av anbefalingstekstene (kopi av sidene, også i en lukket database eller midlertidig på disk) | Eksemplarfremstilling av hele tekster. Krever tillatelse med mindre et lovbestemt unntak gjelder, og ingen unntak som passer, er funnet. Unntaket for privat bruk gjelder bare enkeltpersoner, ikke en virksomhets systematiske lagring. | Ikke gjort. Sidene leses i minnet for å regne ut kontrollsummen og skrives aldri til disk. Spørsmål 3 i utkastet. |
| **Egne regler** – en fagperson vurderer en kombinasjon ut fra preparatomtaler, retningslinjer og primærkilder og formulerer en egen, matematisk regel med kildehenvisning; Psychiatrienet er bare en referanse regelen kan sammenlignes med | Opphavsretten er ikke til hinder: den verner ikke faglige metoder, doseprinsipper eller medisinske fakta, og OUSFARs regel har ikke kildens uttrykksform. Kan lages og publiseres uten tillatelse, også når regelen ligner en anbefaling hos Psychiatrienet. | Slik lages alle regler i dag (`docs/verktøy-p4-regelmodell.md`). Psychiatrienet kildehenvises der det er brukt som faglig referanse. |
| **Fullstendig systematisk overføring** – hele tabellsettet, eller en vesentlig del, gjøres celle for celle om til OUSFAR-regler med Psychiatrienet som grunnlag | Kan reise databaserettslige spørsmål, også når reglene er formulert med egne ord: det kan være uttrekk eller gjenbruk av en vesentlig del av samlingen, og resultatet kan erstatte kilden. Det er ikke fastslått at samlingen er vernet, eller at bruken ville krenke et vern. Betinget risiko, ikke fastslått ulovlig. | Ikke gjort og ikke planlagt. Planlegges det, bør en tillatelse (spørsmål 4 i utkastet) eller en konkret juridisk avklaring foreligge først. |
| **Offentlig visning** av anbefalingene (i repoet, i appen eller i en utskrift) | Eksemplarfremstilling og tilgjengeliggjøring av tekstene. Er uansett utelukket av produktbeslutningen under. | Aldri. Testene stopper tekst i arkivet. |

## Produktbeslutning: aldri vise kildeteksten

Bestemt 27.10.2026 (kontrollen av PR #281): **OUSFAR skal aldri vise Psychiatrienets anbefalinger ordrett, heller ikke korte sitater.** OUSFAR viser heller ikke oversatte eller omskrevne versjoner av originalteksten. OUSFAR viser selvstendig faglig vurderte, matematisk formulerte regler og kildehenvisninger (lenke, revisjon og dato). Beslutningen gjelder uansett hva en eventuell tillatelse fra utgiveren dekker, og den er ført inn i P4–P8 i `docs/verktøy-utviklingsplan.md`.

## Løsningen i P3

OUSFAR lagrer bare det som trengs for å gjenfinne, kontrollere og følge med på hver anbefaling:

- **Hvor den står:** tabell, rad og kolonne (og cellen i en undertabell), og adressen. For tabellene: radene, kolonnene og gruppene med kildens koder og legemiddelnavn, og hver celles koordinater og lenke. Ikke lenketitler, lenketekster eller fotnoter, verken i P3-arkivet eller i P1-bildene (`psychiatrienet-tabeller.json`, `psychiatrienet-lenker.json`).
- **Hvilken versjon:** MediaWiki-revisjonen, tidspunktet kilden lagret siden, og tidspunktet OUSFAR hentet den (UTC).
- **Kontrollsummer:** SHA-256 av hele innholdet og av selve anbefalingen, som normalisert tekst. Når noen senere leser siden hos kilden, viser kontrollsummen om teksten er den samme som den OUSFAR registrerte. Hver ny innhenting sammenligner kontrollsummene og viser hva som er endret.
- **Hva siden selv sier den gjelder:** bare legemiddelnavnene i «Switch medication from A to B», «Adding B to A» eller «Stop A», så retningen kan kontrolleres mot tabellen.
- **Hva slags avsnitt** siden har (stopp, start, informasjon), uten overskriftene, og **navnene i faktaboksene**, også gruppemedlemmene siden oppgir.

Tabellstrukturen lagres fordi den er selve kildehenvisningen: uten koordinatene og lenkene kan en senere regel ikke vise nøyaktig hvilken anbefaling den bygger på, og en endring i kilden kan ikke oppdages. P1 har allerede publisert den samme strukturen (`src/data/verktoy/psychiatrienet-tabeller.json`, nå uten fotnoter, lenketitler og lenketekster). Alle tre datasettene har en fast liste over tillatte felt (`src/verktoy/kildefelt.ts`); skriptene kontrollerer dataene mot den før de skriver, og testene kontrollerer filene i repoet. Ingen av skriptene skriver sidene til disk, heller ikke midlertidig. Hvis utgiveren ber om det, kan arkivet flyttes ut av det offentlige repoet uten endringer i resten av modellen.

Det som **kan gå tapt** med denne løsningen, er selve teksten hvis Psychiatrienet endrer eller fjerner en side. Vi vil da vite at den er endret og hvilken versjon vi hadde, men ikke kunne lese den gamle teksten. To ting kan lukke det hullet:

1. **Tillatelse fra utgiveren** til å lagre sidene i et lukket, ikke-offentlig arkiv (spørsmål 3 i utkastet). Kontrollsummene viser da at den lagrede teksten er den som ble registrert.
2. **En offentlig nettarkivkopi** (Internet Archive). Den ble ikke prøvd: tjenesten var ikke tilgjengelig fra miljøet OUSFAR utvikles i (27.10.2026), og å be et nettarkiv kopiere hele samlingen bør vurderes sammen med tillatelsen.

**Kjent forhold:** den første versjonen av arkivet i PR #281 hadde avsnittsoverskrifter (f.eks. «More information»), lenketitler og én fotnote fra kilden, og P1-bildet (slått sammen i PR #279) hadde lenketitlene (f.eks. «Combining-Aripiprazole-Lithium»), lenketekstene (kodene, f.eks. «ArLi») og den samme fotnoten. Alt er fjernet i PR #281. Det som ble slått sammen med P1, finnes fortsatt i historikken til hovedgrenen; det som bare var i PR #281, finnes bare i PR-ens historikk. Historikken skrives ikke om. Utkastet til henvendelse opplyser om dette.

## Utkast til henvendelse – frivillig, ikke sendt

**Status: frivillig utkast til eventuell senere bruk. Ikke sendt, og ikke et blokkeringstrinn.** Peder ønsker ikke å sende den nå (03.11.2026). Ingen regel, godkjenning eller leveranse er avhengig av den eller av et svar, og det er ingen oppgave eller frist knyttet til den.

Det er ikke registrert at den forrige versjonen av utkastet (27.10.2026) ble sendt; denne erstatter den. Den spør om systematisk bruk av tabellene, opplyser om den automatiske lesingen og KI-verktøyet, og tilbyr utgiveren noe konkret tilbake: feilene OUSFAR har funnet i tabellene (`docs/verktøy-p3-kildegrunnlag.md`, «Kjente kildeproblemer»).

Hvis den senere skal brukes: navn, stilling og arbeidssted fylles inn nederst, og setningen i hakeparentes om at OUSFAR er gratis og ikke-kommersielt bekreftes eller strykes (den er ikke kontrollert). Mottakere er `medisch@boom.nl` (adressen switchtabellene selv oppgir), med kopi til `h.kleinhaneveld@boom.nl` (forlagsredaktør og sluttredaktør for Psychiatrienet).

> **Subject:** Permission request – use of the Psychiatrienet switch tables in OUSFAR (Norway), with a list of broken links we found
>
> Dear Ms Klein Haneveld, dear editors of the Psychiatrienet switch tables,
>
> I am responsible for the clinical content of OUSFAR, a web tool for clinicians in Norway that supports the interpretation of pharmacological analyses. The tool is closed: only clinicians who have been given an account can log in. [It is free of charge and not commercially distributed.] We are now building four planning aids: tapering an antidepressant, switching between antidepressants, switching between antipsychotics (including long-acting injectables), and adding a mood stabiliser to an existing treatment. We regard the Psychiatrienet switch tables (Combining Moodstabilizers, Switching Antidepressants and Switching Antipsychotics) as an important professional reference, and we would like to use them in a way you are comfortable with.
>
> **What we do today**
>
> - We do not store your recommendation texts. We do not display, translate or paraphrase them, and we never will, whatever your answer to the questions below. Clinicians see only our own, independently reviewed rules, based on the summaries of product characteristics, guidelines and the literature, with a reference and a link to your page where relevant.
> - For each cell we keep references only: the table coordinates and link, the page revision and retrieval date, a SHA-256 checksum, and which drugs and which direction the page concerns. This metadata is published in our public source code repository (github.com/peohol/ousfar). An earlier version also briefly included link titles, link texts and one footnote; these were removed, but remain in the repository's history.
> - Once a month, an automated script on GitHub Actions reads the pages (in memory only, nothing is saved) to detect changes by comparing checksums; no AI is involved in that run. The scripts themselves are written and maintained with the help of an AI coding assistant, the first full retrieval (27 October 2026) was run from that development environment, and individual pages have occasionally been checked from it.
>
> **Our questions** (each can be answered separately, and we will respect a no to any of them):
>
> 1. Do you accept that we keep the references described above in a publicly visible repository, or would you prefer us to move them to a non-public location?
> 2. Do you accept the monthly automated reading of the pages to detect changes, and occasional retrievals from our AI-assisted development environment for the same purpose? No text is stored or shown.
> 3. May we store copies of the switch-table pages in a closed, non-public archive, solely to document which version of each recommendation our clinical reviewers have assessed?
> 4. This is our main question: may we use the switch tables **systematically, across all cells**, as one basis for our own clinically reviewed rules – in our own wording, never showing your text, and always with a reference and a link to the original page?
>
> If you agree to any of these, it would help us greatly if you could state the scope in writing: which tables and pages, whether it covers future revisions, how you would like Psychiatrienet to be credited, any conditions or fees, and how long the permission applies and how it can be withdrawn. We will move or delete the metadata at once if you ask us to. We do not consider these questions legally settled, which is why we are asking.
>
> **Something in return.** While building the references, we noted some issues in the tables that may interest you, for example: the Stop links for phenelzine, doxepine and vortioxetine point to addresses that do not respond (`/switchdetail/stop-fenelzine`, `/switchdetail/stop-doxepine`, `/switchdetail/stop`); in Combining Moodstabilizers, six pages state the opposite direction of the table cell that links to them (aripiprazole with lamotrigine, risperidone and ziprasidone); and the members of «Rest anti-psychotics» on some pages differ from the «Rest AP» group in the table. We are happy to send the complete list.
>
> Kind regards,
> [name], [position]
> [institution], Norway
> [e-mail, telephone]

Kort på norsk: brevet sier at OUSFAR aldri viser eller lagrer teksten deres, forklarer hvilke henvisninger som ligger i det offentlige repoet og den månedlige automatiske kontrollen (også at et KI-verktøy brukes i utviklingen), og stiller fire spørsmål: (1) om henvisningene kan ligge offentlig, (2) om den automatiske kontrollen er i orden, (3) om vi kan lagre kopier i et lukket arkiv, og (4) hovedspørsmålet, om vi kan bruke tabellene systematisk som grunnlag for egne regler. Det ber om omfanget skriftlig og tilbyr listen over feil vi har funnet i tabellene.

## Hvis utkastet senere sendes og besvares

Svaret registreres her, i en egen PR til kontroll:

- dato, avsender og om svaret gjelder på vegne av utgiveren;
- utfallet per spørsmål 1–4 (ja, ja med vilkår, nei, ikke besvart), med nøyaktig omfang: tabeller, revisjoner, kreditering, varighet, vilkår og eventuelle kostnader;
- hva som endres: ved nei på 1 eller 2 flyttes arkivet ut av repoet eller overvåkingen stanses; ved ja på 3 lages det lukkede arkivet; ved ja på 4 får koordinatoren grunnlaget for å endre §4 i leveranseplanen for nøyaktig det omfanget tillatelsen dekker.

Et uteblitt svar er ikke en tillatelse, men heller ikke et hinder: selvstendige regler trenger ingen av delene.

## Trengs en juridisk vurdering?

**Anbefaling: ikke nå.** Så lenge OUSFAR lager selvstendige regler og ikke planlegger en systematisk masseoverføring av tabellsettet, er det lite en juridisk vurdering vil endre. Planlegges en slik overføring, er en konkret juridisk avklaring av databasevernet og erstatningsvirkningen (C-762/19) det ene alternativet; en skriftlig tillatelse fra utgiveren er det andre. Ett av dem bør foreligge før overføringen gjennomføres.

## Regelgrunnlaget

- **Egen vurdering, ikke kopiert tekst.** Regelmotoren bygger på OUSFARs egen farmakologiske og kliniske vurdering av hver kombinasjon, ut fra preparatomtaler, retningslinjer, primærlitteratur og andre lovlig tilgjengelige kilder. Den bygger ikke på kopierte anbefalingstekster, og ingen regel, forklaring eller utskrift gjengir Psychiatrienets tekst, heller ikke oversatt eller omskrevet (produktbeslutningen over).
- **Sporbarhet.** Hver regel viser til kildene sine med id, versjon, hentetidspunkt og kontrollsum (`src/verktoy/regler/kilder.ts`), og hver godkjenning gjelder et bestemt fingeravtrykk av regelinnholdet (`docs/verktøy-p4-regelmodell.md`). Er Psychiatrienet brukt som faglig referanse, vises kildeoppføringen fra P3.
- **Kildekritikk.** Verdiene kontrolleres mot primærkilden og mot norske preparater i FEST, og kontrolleres uavhengig før godkjenning. Der kildene ikke gir en verdi, stopper regelen med en grunn i stedet for å fylle inn en verdi.
- **Automatisk innhenting og overvåking** er en annen bruksform enn å lage enkeltregler og er vurdert for seg i tabellen over.
- **Ingen masseoverføring.** Reglene lages per kombinasjon, ikke som en systematisk overføring av hele tabellsettet; se konklusjonen øverst.
- Uavhengige kilder og deres bruksrett for K1–K4 står i `docs/verktøy-kildematrise.md`.
