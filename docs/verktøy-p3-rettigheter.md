# OUSFAR Verktøy – P3: rettigheter til Psychiatrienets anbefalinger

**Undersøkt:** 27.10.2026 (P3.1 i `docs/verktøy-utviklingsplan.md`), revidert samme dag etter kontroll av PR #281  
**Konklusjon:** Psychiatrienet gir ingen lisens til å kopiere, lagre eller videreformidle anbefalingene. OUSFAR lagrer derfor ingen tekst fra kilden, bare et minimum av metadata som trengs for å vise til og følge med på hver anbefaling (koordinater, lenke, revisjon, tidspunkt, kontrollsum og hvilke legemidler og hvilken retning siden gjelder). **OUSFAR viser aldri Psychiatrienets anbefalinger ordrett, heller ikke korte sitater, og heller ikke oversatt eller omskrevet.** Det som vises, er OUSFARs egne, faglig vurderte og matematisk formulerte regler med kildehenvisning.

Dette er en faglig og praktisk vurdering, ikke en juridisk betenkning. Den bør vurderes av noen med juridisk kompetanse før OUSFAR bygger regler systematisk på hele kilden uten tillatelse.

## Hva som er funnet

- **Eier:** Psychiatrienet «is een website van De Tijdstroom», og kontaktsiden sier at nettstedet er «eigendom van De Tijdstroom Uitgeverij» (De Tijdstroom uitgeverij BV, Utrecht, info@tijdstroom.nl). Switchtabellene redigeres av navngitte redaktører (colofon: W.J. Broekema og J. van Raaij, «Switchtabellen»).
- **Ingen lisens:** Verken sidene, colofonen, kontaktsiden eller disclaimeren nevner en lisens eller vilkår for gjenbruk, og det finnes ingen side for opphavsrett eller bruksvilkår (`/pagina/copyright` og `/pagina/voorwaarden` svarer 404). Disclaimeren handler bare om ansvar for innholdet. Wikien bak sidene (`wiki.psychiatrienet.nl`) svarer 500, så eventuelle lisensopplysninger der kan ikke leses.
- **Teknisk tilgang:** `robots.txt` sperrer ingenting, og sidene er åpne uten innlogging. Det sier noe om tilgang, ikke om retten til å kopiere.
- **Repoet er offentlig** (`peohol/ousfar` på GitHub). Det som legges der, er videreformidlet til alle.

## Det rettslige utgangspunktet

To ulike vern kan være aktuelle, og de må holdes fra hverandre:

- **Opphavsrett** (i Nederland Auteurswet 1912, i Norge åndsverkloven § 2) verner **uttrykksformen**: formuleringene, valget av ord og oppbyggingen av den enkelte teksten. Den verner ikke medisinske fakta, ideer eller metoder. At en anbefaling sier «stopp A dag 1, start B dag 2», er en faglig metode; måten den er skrevet på, er vernet. Uten lisens er hovedregelen at alle rettigheter er forbeholdt teksten. Sitatretten (åndsverkloven § 29) gir ikke rett til å gjengi anbefalingene, og OUSFAR skal uansett ikke sitere dem (se under).
- **Databasevern** (EUs databasedirektiv 96/9/EF art. 7, i Norge åndsverkloven § 24) kan verne en samling mot at hele eller en **vesentlig del** av innholdet hentes ut eller brukes på nytt, også når enkeltdelene er fakta, og mot gjentatt, systematisk uttrekk av uvesentlige deler. Vernet gjelder bare når produsenten har gjort en **vesentlig investering i å skaffe, kontrollere eller presentere** innholdet; investering i å *skape* selve innholdet teller ikke (EU-domstolen, C-203/02 *British Horseracing Board* og C-46/02 *Fixtures Marketing*). **Det er ikke fastslått at Psychiatrienets samling har slikt vern.** Anbefalingene er skrevet av redaktørene (å skape innhold), men den systematiske kontrollen og presentasjonen i tabellene kan være en kvalifiserende investering. OUSFAR må derfor regne med at samlingen *kan* være vernet, uten å anta at den er det.

At koordinater og legemiddelnavn hver for seg er fakta, betyr altså ikke automatisk at et systematisk uttrekk av hele samlingen er fritt.

## Vurdering per bruk

| Bruk | Vurdering | Hva OUSFAR gjør |
| --- | --- | --- |
| Lese sidene og lenke til dem | Tillatt. | Hver kildeoppføring har adressen til siden. |
| Lagre metadata om sidene: tabellkoordinater og lenker, revisjon, tidspunkt, kontrollsum, legemiddelnavnene siden oppgir og hvilken retning den gjelder, og hva slags avsnitt den har | Ingen tekst fra kilden, så opphavsretten til tekstene berøres ikke. Men det er et systematisk uttrekk av samlingens oppbygning (hvilke kombinasjoner som har en anbefaling, og hvor). Hvis samlingen har databasevern, er det **ikke avklart** at dette er tillatt. Vurdert som akseptabelt fordi det er et minimum for å kunne vise til og følge med på kilden, ikke gjengir noen anbefaling og ikke kan erstatte kilden, men det hevdes ikke å være ubetinget tillatt. | Lagres i `src/data/verktoy/psychiatrienet-kildearkiv.json`, med en fast liste over tillatte felt i testene. Spørsmålet er tatt med i henvendelsen til utgiveren. |
| **Intern lagring** av anbefalingstekstene (kopi av sidene, også i en lukket database eller midlertidig på disk) | Krever tillatelse. Det er eksemplarfremstilling av tekstene og uttrekk av hele samlingen. Unntaket for privat bruk gjelder bare enkeltpersoner, ikke en virksomhets systematiske lagring. | Ikke gjort. Sidene leses i minnet for å regne ut kontrollsummen og skrives aldri til disk. |
| **Egne regler** – en fagperson leser en anbefaling, vurderer den faglig sammen med andre kilder og formulerer en egen, matematisk regel med kildehenvisning | Opphavsretten er ikke til hinder: den verner ikke de medisinske metodene, og OUSFARs regel har ikke kildens uttrykksform. Mulig lovlig bruk. | Ingen regler er laget (P4). |
| **Fullstendig systematisk overføring** – hele tabellsettet gjøres celle for celle om til OUSFAR-regler | Kan være uttrekk eller gjenbruk av en vesentlig del av databasen, hvis samlingen har databasevern, også når reglene er formulert med egne ord. **Må avklares** (med utgiveren eller juridisk) før det gjøres. | Ikke gjort. Satt opp som spørsmål til P4. |
| **Offentlig visning** av anbefalingene (i repoet, i appen eller i en utskrift) | Krever tillatelse, og er uansett utelukket av produktbeslutningen under. | Aldri. Testene stopper tekst i arkivet. |

## Produktbeslutning: aldri vise kildeteksten

Bestemt 27.10.2026 (kontrollen av PR #281): **OUSFAR skal aldri vise Psychiatrienets anbefalinger ordrett, heller ikke korte sitater.** OUSFAR viser heller ikke oversatte eller omskrevne versjoner av originalteksten. OUSFAR viser selvstendig faglig vurderte, matematisk formulerte regler og kildehenvisninger (lenke, revisjon og dato). Beslutningen gjelder uansett hva en eventuell tillatelse fra utgiveren dekker, og den er ført inn i P4–P8 i `docs/verktøy-utviklingsplan.md`.

## Løsningen i P3

OUSFAR lagrer bare det som trengs for å gjenfinne, kontrollere og følge med på hver anbefaling:

- **Hvor den står:** tabell, rad og kolonne (og cellen i en undertabell), og adressen. For tabellene: radene, kolonnene og gruppene med kildens koder og legemiddelnavn, og hver celles koordinater og lenke. Ikke lenketitler, lenketekster eller fotnoter.
- **Hvilken versjon:** MediaWiki-revisjonen, tidspunktet kilden lagret siden, og tidspunktet OUSFAR hentet den (UTC).
- **Kontrollsummer:** SHA-256 av hele innholdet og av selve anbefalingen, som normalisert tekst. Når noen senere leser siden hos kilden, viser kontrollsummen om teksten er den samme som den OUSFAR registrerte. Hver ny innhenting sammenligner kontrollsummene og viser hva som er endret.
- **Hva siden selv sier den gjelder:** bare legemiddelnavnene i «Switch medication from A to B», «Adding B to A» eller «Stop A», så retningen kan kontrolleres mot tabellen.
- **Hva slags avsnitt** siden har (stopp, start, informasjon), uten overskriftene, og **navnene i faktaboksene**, også gruppemedlemmene siden oppgir.

Tabellstrukturen lagres fordi den er selve kildehenvisningen: uten koordinatene og lenkene kan en senere regel ikke vise nøyaktig hvilken anbefaling den bygger på, og en endring i kilden kan ikke oppdages. P1 har allerede publisert den samme strukturen (`src/data/verktoy/psychiatrienet-tabeller.json`, nå uten fotnoter). Hvis utgiveren ber om det, kan arkivet flyttes ut av det offentlige repoet uten endringer i resten av modellen.

Det som **kan gå tapt** med denne løsningen, er selve teksten hvis Psychiatrienet endrer eller fjerner en side. Vi vil da vite at den er endret og hvilken versjon vi hadde, men ikke kunne lese den gamle teksten. To ting kan lukke det hullet:

1. **Tillatelse fra De Tijdstroom** til å lagre sidene i et lukket, ikke-offentlig arkiv (utkast til henvendelse under). Kontrollsummene viser da at den lagrede teksten er den som ble registrert.
2. **En offentlig nettarkivkopi** (Internet Archive). Den ble ikke prøvd: tjenesten var ikke tilgjengelig fra miljøet OUSFAR utvikles i (27.10.2026), og å be et nettarkiv kopiere hele samlingen bør vurderes sammen med tillatelsen.

**Kjent forhold:** den første versjonen av arkivet i PR #281 hadde avsnittsoverskrifter (f.eks. «More information»), lenketitler og én fotnote fra kilden. De er fjernet, og PR-en slås sammen som én endring, så de kommer ikke inn i hovedgrenen; de finnes bare i PR-ens historikk på GitHub.

## Utkast til henvendelse til utgiveren

Til: info@tijdstroom.nl. Bør sendes av den faglig ansvarlige for OUSFAR, med navn, stilling og arbeidssted fylt inn.

> Subject: Permission request – use of the Psychiatrienet switch tables in a clinical pharmacology tool
>
> Dear editors of Psychiatrienet and De Tijdstroom,
>
> We are developing OUSFAR, a tool for the interpretation of pharmacological analyses used by clinicians in Norway. We would like to build planning tools for tapering and switching antidepressants and antipsychotics, and we regard the Psychiatrienet switch tables (Combining Moodstabilizers, Switching Antidepressants and Switching Antipsychotics) as a valuable professional source.
>
> At present we store no text from your pages. We only keep references to them: the table cell and link, the page revision and retrieval date, a checksum, and which drugs and which direction each page concerns. OUSFAR will never display your recommendations, neither verbatim, in short quotations, nor translated or paraphrased. What clinicians see are our own independently reviewed rules, with a reference and a link to your page.
>
> We would like to ask:
>
> 1. whether you accept that we keep the references described above, in a repository that is publicly visible;
> 2. for permission to store copies of the switch-table pages in a closed, non-public archive, solely to document which version of each recommendation our clinical reviewers have assessed; and
> 3. for permission to use the switch tables systematically as one basis for our own clinically reviewed rules, always with a reference and a link to the original page.
>
> We would not publish the tables or the texts. We are happy to describe the tool in more detail, to follow any conditions you set, and to report errors we find in the tables (for instance links that no longer work).
>
> Kind regards,
> [name, position, institution]

## Hva som må avklares i P4

- Om tillatelsen kommer, og i så fall hva den dekker (punkt 1–3 over).
- Uten tillatelse: at OUSFARs regler lages som selvstendige faglige vurderinger per kombinasjon, med Psychiatrienet som én av flere kilder, og ikke som en fullstendig systematisk overføring av tabellsettet. Om en slik overføring likevel er ønsket, må databasespørsmålet avklares først.
- At ingen regel, forklaring eller utskrift gjengir kildeteksten, heller ikke oversatt eller omskrevet (produktbeslutningen over).
