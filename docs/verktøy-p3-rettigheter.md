# OUSFAR Verktøy – P3: rettigheter til Psychiatrienets anbefalinger

**Undersøkt:** 27.10.2026 (P3.1 i `docs/verktøy-utviklingsplan.md`)  
**Konklusjon:** Psychiatrienet gir ingen tillatelse til å kopiere, lagre eller videreformidle anbefalingene. OUSFAR lagrer derfor bare fakta om dem (adresse, revisjon, tidspunkt, kontrollsum og hva siden gjelder), ikke teksten. Tillatelse fra utgiveren må til før teksten kan lagres, og før anbefalingene i sin helhet gjøres om til OUSFAR-regler.

Dette er en faglig og praktisk vurdering, ikke en juridisk betenkning. Den bør vurderes av noen med juridisk kompetanse hvis OUSFAR skal bygge på kilden uten tillatelse.

## Hva som er funnet

- **Eier:** Psychiatrienet «is een website van De Tijdstroom», og kontaktsiden sier at nettstedet er «eigendom van De Tijdstroom Uitgeverij» (De Tijdstroom uitgeverij BV, Utrecht, info@tijdstroom.nl). Switchtabellene redigeres av navngitte redaktører (colofon: W.J. Broekema og J. van Raaij, «Switchtabellen»).
- **Ingen lisens:** Verken sidene, colofonen, kontaktsiden eller disclaimeren nevner en lisens eller vilkår for gjenbruk, og det finnes ingen side for opphavsrett eller bruksvilkår (`/pagina/copyright` og `/pagina/voorwaarden` svarer 404). Disclaimeren handler bare om ansvar for innholdet. Wikien bak sidene (`wiki.psychiatrienet.nl`) svarer 500, så eventuelle lisensopplysninger der kan ikke leses.
- **Teknisk tilgang:** `robots.txt` sperrer ingenting, og sidene er åpne uten innlogging. Det sier noe om tilgang, ikke om retten til å kopiere.
- **Repoet er offentlig** (`peohol/ousfar` på GitHub). Det som legges der, er videreformidlet til alle.

Uten en lisens gjelder hovedregelen: alle rettigheter er forbeholdt. Tekstene er vernet av opphavsretten (i Nederland Auteurswet 1912, i Norge åndsverkloven § 2). Samlingen av anbefalinger i tabellene er i tillegg en database som forlaget har investert i, og er vernet mot at hele eller vesentlige deler av innholdet hentes ut og brukes på nytt, også når enkeltdelene er fakta (EUs databasedirektiv 96/9/EF, i Norge åndsverkloven § 24). Vernet gjelder også gjentatt, systematisk uttrekk av små deler.

## Vurdering per bruk

| Bruk | Vurdering | Hva OUSFAR gjør |
| --- | --- | --- |
| Lese sidene og lenke til dem | Tillatt. | Hver kildeoppføring har adressen til siden. |
| Lagre fakta om sidene: adresse, tabellkoordinater, revisjon, tidspunkt, kontrollsum, hvilke legemidler og hvilken retning siden gjelder, avsnittsoverskrifter | Tillatt. Det er opplysninger om sidene, ikke en kopi av innholdet, og samme struktur som P1 alt har publisert. | Lagres i `src/data/verktoy/psychiatrienet-kildearkiv.json`. |
| **Intern lagring** av anbefalingstekstene (kopi av sidene, også i en lukket database) | Krever tillatelse. Å kopiere alle sidene er uttrekk av hele databasen. Unntaket for privat bruk gjelder bare enkeltpersoner, ikke en virksomhets systematiske lagring. | Ikke gjort. Teksten hentes bare midlertidig for å regne ut kontrollsummen, og kastes. |
| **Bearbeiding til egne faglige regler** | Ideer, metoder og fakta (f.eks. «stopp dag 1, start dag 2») er ikke vernet av opphavsretten, og en fagperson kan lese en anbefaling og formulere en egen regel. Men å gjøre hele tabellsettet systematisk om til regler, også med egne ord, kan være uttrekk av databasen. **Uklart uten tillatelse.** | Ingen regler er laget (P4). Spørsmålet er satt opp til P4. |
| **Offentlig videreformidling** (i repoet, i appen eller i en utskrift) | Krever tillatelse. Sitatretten (åndsverkloven § 29) dekker korte sitater i en sammenheng, ikke gjengivelse av anbefalingene. | Ikke gjort. Testene stopper kildetekst i arkivet. |

## Løsningen i P3

OUSFAR lagrer det som er tillatt, og det er nok til å gjenfinne, kontrollere og følge med på hver anbefaling:

- **Hvor den står:** tabell, rad og kolonne (og cellen i en undertabell), og adressen.
- **Hvilken versjon:** MediaWiki-revisjonen, tidspunktet kilden lagret siden, og tidspunktet OUSFAR hentet den (UTC).
- **Kontrollsummer:** SHA-256 av hele innholdet og av selve anbefalingen, som normalisert tekst. Når noen senere leser siden hos kilden (eller i en kopi kilden eller utgiveren gir), viser kontrollsummen om teksten er den samme som den OUSFAR registrerte. Hver ny innhenting sammenligner kontrollsummene og viser hva som er endret.
- **Hva siden selv sier den gjelder:** «Switch medication from A to B», «Adding B to A» eller «Stop A», bare navnene, så retningen kan kontrolleres mot tabellen.
- **Avsnittsoverskriftene** («Stop …», «Start …», «More information», «Cave») og **navnene i faktaboksene**, også gruppemedlemmene siden oppgir.

Det som **kan gå tapt** med denne løsningen, er selve teksten hvis Psychiatrienet endrer eller fjerner en side. Vi vil da vite at den er endret og hvilken versjon vi hadde, men ikke kunne lese den gamle teksten. To ting kan lukke det hullet:

1. **Tillatelse fra De Tijdstroom** til å lagre sidene internt (utkast til henvendelse under). Da kan importøren lagre teksten i et lukket lager uten endringer i resten av modellen; kontrollsummene viser at den lagrede teksten er den som ble registrert.
2. **En offentlig nettarkivkopi** (Internet Archive). Den ble ikke prøvd: tjenesten var ikke tilgjengelig fra miljøet OUSFAR utvikles i (27.10.2026), og å be et nettarkiv kopiere hele samlingen bør vurderes sammen med tillatelsen.

## Utkast til henvendelse til utgiveren

Til: info@tijdstroom.nl. Bør sendes av den faglig ansvarlige for OUSFAR, med navn, stilling og arbeidssted fylt inn.

> Subject: Permission request – use of the Psychiatrienet switch tables in a clinical pharmacology tool
>
> Dear editors of Psychiatrienet and De Tijdstroom,
>
> We are developing OUSFAR, a tool for the interpretation of pharmacological analyses used by clinicians in Norway. We would like to build planning tools for tapering and switching antidepressants and antipsychotics, and we regard the Psychiatrienet switch tables (Combining Moodstabilizers, Switching Antidepressants and Switching Antipsychotics) as a valuable professional source.
>
> At present we only store references to your pages (address, revision, retrieval date and a checksum), never the text. We would like to ask for permission to:
>
> 1. store copies of the switch-table pages in a closed, non-public archive, solely to document which version of each recommendation our clinical reviewers have assessed;
> 2. use the recommendations as one basis for our own clinically reviewed rules, always with a reference and a link to the original page; and
> 3. show short excerpts with attribution to Psychiatrienet where clinicians need to see the source.
>
> We would not publish the tables or the texts. We are happy to describe the tool in more detail, to follow any conditions you set, and to report errors we find in the tables (for instance links that no longer work).
>
> Kind regards,
> [name, position, institution]

## Hva som må avklares i P4

- Om tillatelsen kommer, og i så fall hva den dekker (punkt 1–3 over).
- Uten tillatelse: om OUSFARs regler kan lages som egne faglige vurderinger per kombinasjon, med Psychiatrienet som én av flere kilder, i stedet for at tabellsettet gjøres om til regler.
