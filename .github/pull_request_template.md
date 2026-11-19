## Sammendrag

<!-- For mennesker, ikke for kodeagenter: kort, enkelt språk, uten teknisk sjargong og på et høyt abstraksjonsnivå. -->

- **Hva er gjort:** <!-- Også hva brukerne vil merke, eller «ingen endring i appen». -->
- **Hvorfor:**
- **Må en menneskelig systemarkitekt ta stilling til noe?** <!-- «Nei», eller hva som må avgjøres, med valgene i vanlig språk. -->

## Arbeidsoppgave

<!-- Issue-et med oppgaven: «Refs #N» for en delleveranse, «Closes #N» bare når PR-en fullfører det. Issue-et og PR-en har den samme prosjektetiketten og den samme ene assignee-en: systemarkitekten som har oppgaven. Bare assignee-feltet teller, ikke navn i teksten (docs/prosjektansvar.md §3). Kontrollen «Prosjektansvar» sjekker det. -->

- Refs #

## Ansvarlig prosjekt

<!-- Nøyaktig ett, etter oppgavens formål (docs/prosjektansvar.md), og den samme etiketten på PR-en: `ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`. -->

- Prosjekt:
- Avhengigheter: <!-- Andre oppgaver, Issues eller PR-er denne venter på eller som venter på den. «Ingen» hvis ingen. -->
- Virkninger utenfor prosjektets ansvarsområde: <!-- For eksempel felles CSS, en felles komponent eller databasen, og hva det betyr der. «Ingen» hvis ingen. -->

## Tekniske detaljer

<!-- Valgfritt: det den kontrollerende agenten har nytte av å vite, som berørte deler, valg som er gjort og hva som bør kontrolleres særskilt. Teknisk språk er greit her. -->

## Kontroller

- [ ] `npm test`
- [ ] `npm run build`
- [ ] Endringsloggen er oppdatert — nøyaktig én ny fil i `src/data/endringer/` med leddet (major/minor/patch) og uten versjonsnummer, etter `docs/endringslogg.md` (eller: stille designjustering, ingen føring)
