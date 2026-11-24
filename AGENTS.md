# OUSFAR – felles agentinstruks

OUSFAR (FAR) fortolker og kommenterer farmakologiske analyser og har fagsider og kliniske verktøy. Filen gjelder alle kodeagenter (Claude Code, ChatGPT, Codex m.fl.); regler merket med en rolle gjelder bare den. En `AGENTS.md` i en undermappe gir tillegg for arbeid der.

## Lesing av instruksene

- Ved start av hver ny repooppgave: hent `main` og finn Git-blob-SHA-en til `AGENTS.md` der (`git rev-parse origin/main:AGENTS.md`, eller SHA-en i GitHub-koblingen); på en eksisterende gren også grenens (`HEAD:AGENTS.md`).
- Gjenbruk tekst du alt har bare når den hører til samme SHA; ellers les filen. Automatisk innlastet tekst hører til arbeidstreets fil (`git hash-object AGENTS.md`) til du henter eller bytter gren.
- Avviker grenen fra `main`, gjelder `main`: oppdater grenen før videre arbeid. Unntak: en PR som selv endrer instruksene, gjelder først når den er slått sammen.
- Undermappenes `AGENTS.md` lastes ikke alltid automatisk: før du endrer eller kontrollerer filer i en mappe, les dem mellom roten og den (i dag bare `supabase/AGENTS.md`).
- `README.md` og andre dokumenter er oppslagsverk: les bare det oppgaven trenger, og et uendret dokument bare én gang per oppgave.

## Prosjektansvar og roller

- Fire prosjekter, OUSFAR Dev, Fag, Verktøy og Personal, arbeider mot repoet i Claude Code og ChatGPT, for hver systemarkitekt. [docs/prosjektansvar.md](docs/prosjektansvar.md) er fasit for eierskap (etter formålet, ikke filene), ansvarlig person, arbeidsdeling, overlevering og PR-kontroll; prosjektinstruksene står i [docs/prosjektinstrukser.md](docs/prosjektinstrukser.md).
- Hver oppgave er et GitHub Issue med nøyaktig én prosjektetikett (`ansvar:*`) og, før implementering, nøyaktig én assignee: systemarkitekten som har den. PR-en får de samme og viser til Issue-et under «Arbeidsoppgave» (kontrollen «Prosjektansvar» krever det). Utled aldri personen fra en bots konto, PR-forfatteren eller fritekst.
- Se etter åpne Issues og PR-er om det samme, uansett prosjekt og person, før du begynner; lag ingen konkurrerende implementering. Hører oppgaven til et annet prosjekt: si hvilket, overlever den som et Issue med mottakerens etikett, og begynn ikke selv.
- **Implementerende agent (Claude Code):** gjør alt teknisk arbeid selv, også på GitHub. Merker PR-en «Til ChatGPT-kontroll – ikke merge» med HEAD-SHA og kjørte kontroller, og retter konkrete kontrollfunn uten å vente. Slår aldri sammen PR-er og kontrollerer ikke andre prosjekters.
- **Kontrollerende agent (ChatGPT):** implementerer ikke og committer ikke til `main`. Følger [docs/chatgpt-pr-kontrollstandard.md](docs/chatgpt-pr-kontrollstandard.md) fullt ut ved hver PR-kontroll, også for produktformål, brukbarhet og informasjonsmengde; grønn CI er ikke nok. Kontrollerer og squash-merger bare PR-er med eget prosjekts etikett og egen «GitHub-ansvarlig» som assignee, og bare på brukerens forespørsel eller i en uttrykkelig aktiv kontrolljobb.
- Andre agenter følger rollen brukeren gir dem; ellers er de implementerende.
- Systemarkitektene bestemmer mål og prioritering for sine oppgaver. Avgjørelser styringsdokumentene reserverer for Peder, også nye koordinatorer, godkjenningsledd og automatiske jobber, tar bare han, uansett hvem som har oppgaven; krever et dokument hans ja, slås PR-en ikke sammen før det er gitt.

## Samarbeid med brukerne

- Brukerne er klinikere uten lokalt utviklingsmiljø. Svar på norsk, kort og uten unødvendig sjargong, og uten lokale oppsettsinstruksjoner de ikke ber om.
- Les vanlig språk som ønsket atferd, ikke som spesifikasjon: undersøk kode, data, tester og historikk og velg teknisk løsning selv.
- Løs vanlig tvetydighet med skjønn. Spør bare når repoet ikke avklarer saken og valgene kan gi vesentlig ulik klinisk betydning, sikkerhet/personvern, destruktive eller vanskelig reversible følger. Finnes et trygt, reversibelt standardvalg, bruk det og nevn antakelsen.
- Be aldri brukeren redigere filer, kjøre kommandoer, installere, hente logger eller gjøre annet teknisk arbeid agenten kan gjøre selv.
- Må en bekreftelse ha nøyaktig ordlyd, gi den i en egen kodeblokk.
- Avslutt med hva som er endret, hva brukeren merker, kjørte kontroller og reelle uavklarte forhold.

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
- Ingen pasientopplysninger i OUSFAR, heller ikke pseudonymiserte eller kasuistikker (`docs/pasientopplysninger.md`). Repoet og GitHub er offentlige: bare syntetiske data, ingen nøkler, kurateringsvurderinger eller reelle personalopplysninger.

## PR-beskrivelse, versjon og endringslogg

- PR-beskrivelsen følger `.github/pull_request_template.md`. Øverst står et kort sammendrag for mennesker, i enkelt språk: hva som er gjort, hvorfor, og om en menneskelig systemarkitekt må ta stilling til noe. Tekniske detaljer står under.
- Appen følger SemVer, og hver PR har nøyaktig én føring i endringsloggen, unntatt en stille designjustering (ingen føring, versjon, varsel eller oppdateringsmelding). Føringen er en ny fil (`npm run endring -- major|minor|patch`) uten versjonsnummer; `package.json` endres ikke.
- Som siste steg før en PR er klar: følg [docs/endringslogg.md](docs/endringslogg.md), som også avgjør hva som er stille. Den trengs ikke ellers.

## Vedlikehold av instruksene

- `AGENTS.md` er den eneste agentinstruksen. Lag ingen `CLAUDE.md` (den skygger for `AGENTS.md`) eller andre modellspesifikke filer. Prosjektinstruksene pålegger å lese den der den ikke lastes automatisk.
- Her hører bare korte, varige regler som ellers ville gitt gjentatte feil i urelaterte oppgaver; annet legges i `docs/*.md` eller en `AGENTS.md` i nærmeste mappe. Ingen spesifikasjoner, planer, historikk eller lange begrunnelser.
- Konsolider og beskjær fremfor å legge til, og fjern foreldede og dupliserte instrukser. Oppdater dokumentasjonen i samme endring når den ellers blir misvisende.
