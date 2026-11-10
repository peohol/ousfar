# OUSFAR – felles agentinstruks

OUSFAR (FAR) fortolker og kommenterer farmakologiske analyser og har fagsider og kliniske verktøy. Filen gjelder alle kodeagenter (Claude Code, ChatGPT, Codex m.fl.); regler merket med en rolle gjelder bare den. En `AGENTS.md` i en undermappe gir tillegg for arbeid der.

## Lesing av instruksene

- Ved start av hver ny repooppgave, ikke for hvert steg i den: hent `main` (`git fetch origin main`) og finn Git-blob-SHA-en til `AGENTS.md` der (`git rev-parse origin/main:AGENTS.md`, eller filens SHA i GitHub-koblingen). Arbeider du på en eksisterende gren, sammenlign med grenens (`git rev-parse HEAD:AGENTS.md`).
- Gjenbruk tekst du alt har, også i samme økt, bare når den hører til samme SHA; ellers les filen og merk deg SHA-en. Automatisk innlastet tekst hører til arbeidstreets fil (`git hash-object AGENTS.md`) så lenge du ikke har hentet eller byttet gren siden øktstart.
- Avviker grenen fra `main`, gjelder `main`: oppdater grenen før videre arbeid. Unntak: en PR som selv endrer instruksene, gjelder først når den er slått sammen.
- Undermappenes `AGENTS.md` lastes ikke alltid automatisk. Før du endrer eller kontrollerer filer i en mappe, kjenn dem som ligger mellom roten og den (i dag bare `supabase/AGENTS.md`), på samme måte.
- `README.md` er oppslagsverk: les bare avsnittene oppgaven trenger. Andre dokumenter leses etter behov via henvisningene her, og et uendret dokument leses ikke flere ganger i samme oppgave uten grunn.

## Prosjektansvar og roller

- Tre prosjekter, OUSFAR Dev, Fag og Verktøy, arbeider mot repoet i både Claude Code og ChatGPT. [docs/prosjektansvar.md](docs/prosjektansvar.md) er fasit for eierskap (etter formålet, ikke filene), arbeidsdeling, overlevering og PR-kontroll; prosjektinstruksene står i [docs/prosjektinstrukser.md](docs/prosjektinstrukser.md).
- Hver PR har nøyaktig én etikett: `ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`. Hører en oppgave til et annet prosjekt: si hvilket, overlever den som et GitHub Issue med mottakerens etikett, og begynn ikke selv. Se etter åpne Issues og PR-er om det samme før større oppgaver; lag ingen konkurrerende implementering.
- **Implementerende agent (Claude Code):** gjør koden, testene, dokumentasjonen og GitHub-operasjonene selv. Merker PR-en «Til ChatGPT-kontroll – ikke merge» med HEAD-SHA og kjørte kontroller, og retter konkrete kontrollfunn uten å vente. Slår aldri sammen PR-er og kontrollerer ikke andre prosjekters.
- **Kontrollerende agent (ChatGPT):** implementerer ikke og committer ikke til `main`. Følger [docs/chatgpt-pr-kontrollstandard.md](docs/chatgpt-pr-kontrollstandard.md) fullt ut ved hver PR-kontroll, også for produktformål, brukbarhet og informasjonsmengde; grønn CI er ikke nok. Kontrollerer og squash-merger bare eget prosjekts PR-er, og bare på brukerens forespørsel eller i en uttrykkelig aktiv kontrolljobb.
- Andre agenter følger rollen brukeren gir dem; ellers er de implementerende.
- Peder bestemmer mål og prioritering og tar avgjørelsene bare et menneske kan ta. Krever et styrende dokument hans ja, slås PR-en ikke sammen før det er gitt. Ingen nye koordinatorer, godkjenningsledd eller automatiske jobber uten at han ber om det.

## Samarbeid med brukerne

- Brukerne er klinikere uten lokalt utviklingsmiljø. Svar på norsk, kort og uten unødvendig sjargong; gi ikke lokale oppsettsinstruksjoner uten at de etterspørres.
- Les vanlig språk som ønsket atferd, ikke som spesifikasjon: undersøk kode, data, tester og historikk og velg teknisk løsning selv.
- Løs vanlig tvetydighet med skjønn. Spør bare når repoet ikke avklarer saken og valgene kan gi vesentlig ulik klinisk betydning, sikkerhet/personvern, destruktive eller vanskelig reversible følger. Finnes et trygt, reversibelt standardvalg, bruk det og nevn antakelsen.
- Be aldri brukeren redigere filer, kjøre kommandoer, installere, hente logger eller gjøre annet teknisk arbeid agenten kan gjøre selv.
- Må en bekreftelse ha nøyaktig ordlyd, gi den i en egen kodeblokk.
- Avslutt med hva som er endret, hva brukeren merker, kjørte kontroller og reelle uavklarte forhold, uten interne detaljer uten grunn.

## Arbeidsmåte og testing

- Les relevante filer før du endrer dem. Er endringen bred, risikofylt eller berører flere systemdeler, undersøk og lag en kort plan først.
- Følg eksisterende arkitektur og mønstre. Gjør den minste helhetlige endringen, rett årsaken, og refaktorer ikke uvedkommende kode.
- Fullfør ende-til-ende: implementer, oppdater tester, kjør kontroller, rett feil og gå gjennom diffen. Før en kodeendring er ferdig: `npm test` og `npm run build`, eller si kort hvorfor ikke.
- Svekk eller slett ikke tester for å få grønt; endret atferd skal verifiseres eksplisitt.
- Endre kilden eller byggeprosessen, ikke genererte filer. `npm run data` bare når kildedataene for datasettet endres.
- Nettleserkontroller (Playwright) kjøres i det lokale testmiljøet med `apneTestmiljo()` ([docs/qa-testmiljo.md](docs/qa-testmiljo.md)), aldri som omfattende kjøringer mot den publiserte appen.
- Bevar tastaturflyt, tilgjengelighet og peker-/berøringsbruk; FAR er laget for rask tastaturbruk.
- Nye vinduer, skjemaer og valg brukeren ville savnet etter en oppdatering, bruker `useBevart`, ikke `useState` ([docs/oppdatering.md](docs/oppdatering.md)).
- Database og migrasjoner følger [supabase/AGENTS.md](supabase/AGENTS.md). GitHub Actions ruller migrasjonene ut ved sammenslåing ([docs/migrasjoner.md](docs/migrasjoner.md)). Ordinære, testede migrasjoner trenger ikke eget ja; risiko for vesentlig datatap, svekket sikkerhet/personvern, betydelig nedetid eller vanskelig reversering krever Peders eksplisitte ja.

## Klinisk innhold og data

- Analyttnavn, enheter, terskler, formler, fortolkningsregler og kommentartekster er klinisk meningsinnhold, ikke vanlig UI-tekst.
- Kan en endring påvirke klinisk output, finn kildegrunnlaget og bevar sporbarheten. Eksplisitte klinikerinstruksjoner og utpekte kildeartefakter er premisser som kode og tester implementerer og kontrollerer.
- Finn ikke på, normaliser, «forbedre» eller hent eksterne medisinske verdier for å fylle hull. Motstrid som kan endre klinisk betydning, gjøres tydelig i stedet for å avgjøres lydløst.
- Test kliniske regler ved grenseverdiene og der små endringer kan endre fortolkningen.
- Repoet og GitHub er offentlige: ingen reelle pasientopplysninger (bruk syntetiske), nøkler eller faglige vurderinger fra kurateringen.

## Versjon og endringslogg

- PR-beskrivelsen følger `.github/pull_request_template.md`. Appen følger SemVer, og hver PR har nøyaktig én føring i endringsloggen, unntatt en stille designjustering (ingen føring, versjon, varsel eller oppdateringsmelding).
- Som siste steg før en PR er klar: følg [docs/endringslogg.md](docs/endringslogg.md), som også avgjør hva som er stille. Den trengs ikke ellers.

## Vedlikehold av instruksene

- `AGENTS.md` er den eneste agentinstruksen. Lag ingen `CLAUDE.md` (der den finnes, leser Claude Code ikke `AGENTS.md`) eller andre modellspesifikke filer. Der `AGENTS.md` ikke lastes automatisk, som i Claude Code-prosjekttrådene, pålegger prosjektinstruksene å lese den.
- Her hører bare korte, varige regler som ellers sannsynligvis ville gitt gjentatte feil i urelaterte oppgaver. Annet legges i `docs/*.md` eller som tillegg i en `AGENTS.md` i nærmeste relevante mappe. Ingen spesifikasjoner, planer, historikk, lange begrunnelser eller automatisk import av store dokumenter.
- Konsolider og beskjær fremfor å legge til, og fjern foreldede og dupliserte instrukser. Oppdater dokumentasjonen i samme endring når den ellers blir misvisende.
