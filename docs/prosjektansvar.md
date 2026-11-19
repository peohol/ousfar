# Prosjektansvar i OUSFAR

**Felles fasit for hvem som eier hvilke oppgaver og PR-er** i prosjektene som
arbeider mot `peohol/ousfar`: de tre prosjektområdene OUSFAR Dev, OUSFAR Fag og
OUSFAR Verktøy, hvert av dem i Claude Code Projects og i ChatGPT, for hver
systemarkitekt som utvikler (i dag Peder, `peohol`, og Max, `maxhag`).
Prosjektinstruksene som limes inn i prosjektinnstillingene, står i
[prosjektinstrukser.md](prosjektinstrukser.md) og peker hit; detaljreglene står
bare her.

Dokumentet avgjør eierskap, ansvarlig person, overlevering og PR-kontroll. Det endrer ingen faglige
prosedyrer: kurateringen og den uavhengige kontrollen av fagsidene
([kuratering-prosjekt.md](kuratering-prosjekt.md),
[kontrollorinstruks.md](kontrollorinstruks.md)), ChatGPTs
[PR-kontrollstandard](chatgpt-pr-kontrollstandard.md), verktøyenes kliniske
planer og reglene i `AGENTS.md` gjelder uendret ved siden av det. Eies av OUSFAR
Dev (`ansvar:dev`); de andre prosjektene foreslår endringer som en oppgave til Dev
(§5).

## 1. De tre prosjektene

| Prosjekt | Eier | Eier ikke | Etikett |
| --- | --- | --- | --- |
| **OUSFAR Fag** | Kuratering og faglig kontroll av innholdet på fagsidene (monografiene): Kurator, Kontrollør og Vaktmester, kuratorprotokollen, kontrollørinstruksen, skillene `monografikurator`, `monografikontrollor` og `vaktmester`, avgjørelser om nøkkeltall og beskyttede data, og nøklene til kurateringsagentene | Appens kode og utseende, kurateringsverktøyenes kode (som kurateringskøen og `npm run kurator`) og verktøyene i verktøymenyen | `ansvar:fag` |
| **OUSFAR Verktøy** | Alt faglig og teknisk arbeid med verktøyene i verktøymenyen: kliniske regler, doseplanmotoren, spørsmålene og stoppene, verktøyenes UI og UX, kildeovervåkingen og QA av verktøyene, med planene i `docs/verktøy-*.md` | Fagsidenes innhold, appens felles UI og infrastruktur når endringen har et eget formål utenfor verktøyene (§2) | `ansvar:verktoy` |
| **OUSFAR Dev** | Alt annet: appens generelle UI, UX og design (også fagsidenes oppsett og visning), søk, stoffregister, varsler, diskusjoner, brukere og tilgang, datasynkene (FEST, Farmakologiportalen og andre), database, migrasjoner, CI og arbeidsflyter, kurateringsverktøyenes kode, og de felles styringsdokumentene (dette dokumentet, `AGENTS.md`-filene, PR-malen, endringsloggrutinen) | Faginnholdet på fagsidene og verktøyene | `ansvar:dev` |

Er det uklart hvilket prosjekt en oppgave hører til, avgjør Peder det; Claude
eller ChatGPT gir én anbefaling med begrunnelse.

## 2. Formålet avgjør prosjektet, ikke filene

Prosjektet som eier en oppgave, er prosjektet som eier **formålet** med den,
uansett hvilke filer endringen berører. En endring i planvisningen til
nedtrappingsverktøyet tilhører Verktøy, også om den endrer felles CSS. Felles
filer som endringsloggen, `package.json` og stilarkene gir ikke eierskap.

Krever løsningen også en **selvstendig** endring av noe felles, som
designsystemet, en felles komponent eller databasen, skilles den delen normalt ut
som en egen oppgave til prosjektet som eier den (§5).

## 3. Ansvarlig systemarkitekt

Hver oppgave har to uavhengige merkinger:

| Akse | Avgjøres av | Merkes med | Avgjør |
| --- | --- | --- | --- |
| **Prosjekt** | Formålet (§1–2) | Nøyaktig én prosjektetikett | Hvilket prosjektområde som eier oppgaven, og hvilket ChatGPT-prosjekt som kontrollerer |
| **Ansvarlig systemarkitekt** | Hvem som har oppgaven | Nøyaktig én **assignee** på Issue-et og PR-en | Hvem sitt prosjekt det er: Peders ChatGPT-prosjekter kontrollerer bare PR-er med assignee `peohol`, Max' bare med `maxhag` |

Systemarkitektene som kan være ansvarlige, står i
[`.github/prosjektansvar.json`](../.github/prosjektansvar.json) sammen med
prosjektetikettene. Det finnes ingen personetiketter, og PR-forfatteren,
grennavnet, Claude- eller ChatGPT-kontoen og navn i fritekst sier ikke hvem som
er ansvarlig; det gjør bare assignee-feltet.

**Hvem som blir ansvarlig.** En agent setter assignee bare ut fra en identitet
GitHub eller agentplattformen har bekreftet ved innlogging:

1. Systemarkitekten tildeler oppgaven selv i GitHub, eller oppretter Issue-et
   selv direkte i GitHub (ikke gjennom en app som Claude eller ChatGPT). Da kan
   den som opprettet det, tildeles som standard.
2. Systemarkitekten ber selv en agent om oppgaven, og plattformen oppgir den
   innloggede brukerens GitHub-konto (i Claude Code Projects: «GitHub login» i
   øktens kontekst; en planlagt kjøring regnes som bestilt av den som opprettet
   den). Bestillingen er da den klare beslutningen om tildeling.
3. En systemarkitekt sier uttrykkelig at en oppgave skal tildeles eller
   overføres til en navngitt systemarkitekt. Agenten gjør den tekniske delen.

Agenten slutter aldri personen ut fra kontoen en app eller bot skriver under
(Issues fra Claude og ChatGPT står ofte med en persons konto som forfatter),
PR-forfatteren, grennavnet, prosjektets navn, en lenke, en signatur eller et
navn i teksten. Holder ingen av punktene, står Issue-et ufordelt, og agenten
spør i én setning hvem som skal ha det; implementeringen venter.

**Ufordelt backlog er lov, ufordelt utvikling ikke.** Et Issue kan ligge uten
assignee så lenge ingen arbeider med det. Ingen implementering starter før det
har nøyaktig én assignee. En større oppgave kan ha flere PR-er, men én
ansvarlig; selvstendige deler med ulike ansvarlige deles i egne Issues.

**Overføring** mellom systemarkitektene er uttrykkelig (punkt 3): agenten endrer
assignee på Issue-et og på de åpne PR-ene, og skriver en kort kommentar i
Issue-et om hvem som overtok og hvorfor. En overført PR kontrolleres i sin
helhet på nytt av den nye ansvarliges ChatGPT-prosjekt på gjeldende HEAD;
vurderinger fra et annet ChatGPT-prosjekt gjelder ikke. Å endre bare én av dem
gjør kontrollen «Prosjektansvar» rød (§6).

**Myndighet.** Å være ansvarlig for et Issue er en arbeidsrolle i
utviklingen, ikke appens systemarkitektrolle og ingen overføring av
beslutningsmyndighet. Avgjørelser styringsdokumentene reserverer for Peder
(blant annet kliniske regler og godkjenninger, beskyttede data og nøkkeltall,
nye fagmiljøer, sikkerhetsporter, destruktive migrasjoner og overordnede
prioriteringer) tar bare han, uansett hvem som har oppgaven, til noe annet er
vedtatt. Den uavhengige fagkontrollen i OUSFAR Fag og den kliniske kontrollen i
OUSFAR Verktøy gjelder uendret.

## 4. Arbeidsdelingen

| Hvem | Gjør | Gjør ikke |
| --- | --- | --- |
| **Claude Code** | Implementering og det meste av det tekniske arbeidet: kode, tester, dokumentasjon, migrasjoner, Issues, etiketter, assignees og GitHub-operasjoner. Merker PR-en «Til ChatGPT-kontroll – ikke merge», oppgir HEAD-SHA og kjørte kontroller, og retter konkrete funn fra ChatGPT uten å vente | Slår aldri sammen PR-er. Kontrollerer ikke PR-er fra andre prosjekter |
| **ChatGPT** | Drøfting, vurdering, planlegging og uavhengig kontroll av PR-er fra Claude etter [PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md). Slår sammen (squash) PR-er med sitt eget prosjekts etikett og sin egen systemarkitekt som assignee når de er godkjent | Implementerer ikke i repoet og committer ikke direkte til `main`. Kontrollerer eller slår ikke sammen andre prosjekters eller den andre systemarkitektens PR-er |
| **Systemarkitektene** | Bestemmer mål og prioritering for sine oppgaver og gjør korte aksepttester. Peder tar i tillegg de kliniske og faglige avgjørelsene styringsdokumentene reserverer for ham, og gir eksplisitt ja der et styrende dokument krever det (§3) | Gjør ikke tekniske operasjoner, videreformidler ikke tekniske meldinger mellom prosjekter og koordinerer ikke tråder |

Krever et styrende dokument Peders ja før sammenslåing (for eksempel en
destruktiv migrasjon etter `supabase/AGENTS.md`, nøklene i OUSFAR Fag eller en ny klinisk
regel), slår ChatGPT ikke sammen PR-en før det ja-et er gitt.

I OUSFAR Fag er ChatGPTs PR-kontroll en kontroll av selve PR-en. Den
**erstatter ikke** den uavhengige blindkontrollen av faginnholdet, som Kontrolløren
gjør etter [kuratering-prosjekt.md](kuratering-prosjekt.md). Faglige vurderinger
av et stoff hører ikke hjemme i GitHub, som er offentlig.

## 5. Nye oppgaver og overlevering

**Én eier og én ansvarlig per oppgave.** Før Claude begynner på en oppgave:

1. Avgjør eieren etter formålet (§1–2). Hører oppgaven til et annet prosjekt, sier
   Claude det i én setning med navnet på riktig prosjekt, overleverer den (under)
   og begynner ikke selv.
2. Les åpne Issues og PR-er som kan gjelde det samme problemet, uansett prosjekt
   og person. Arbeider en annen tråd, et annet prosjekt eller den andre
   systemarkitekten alt med det, lages ingen konkurrerende gren; arbeidet
   fortsetter der, eller deles i deloppgaver med avhengighetene skrevet ned.
3. Finn eller lag Issue-et for oppgaven, med prosjektetiketten og nøyaktig én
   assignee etter §3. Også en liten feilretting får et kort Issue. Står det
   ufordelt og ansvarlig ikke kan avgjøres etter §3, venter implementeringen.
4. Berører oppgaven flere prosjekter, deles den som hovedregel i avgrensede
   oppgaver, én per eier, med avhengighetene skrevet ned i hver av dem (i issuet
   eller i PR-beskrivelsen under «Avhengigheter»). Er en oppdeling ikke
   hensiktsmessig, avklares én hovedansvarlig før implementeringen starter, og
   PR-en får den hovedansvarliges etikett.

**Overlevering.** Prosjektene kan ikke sende meldinger til hverandre, og
systemarkitektene skal ikke formidle tekniske meldinger. Derfor overleveres en
oppgave som et GitHub Issue med mottakerens etikett (`ansvar:dev`, `ansvar:fag`
eller `ansvar:verktoy`): hva som trengs og hvorfor, avhengigheter og lenker.
Issue-et får samme assignee som oppgaven det kom fra, når den som bestilte,
skal ha det videre; ellers står det ufordelt (§3). Den som overleverer, gir
systemarkitekten én setning: «Dette hører til OUSFAR X; jeg har laget issue
#N.» Systemarkitekten åpner da bare det prosjektet og ber det ta issuet. Nye
Issues får prosjektetikett fra starten, gjerne med malen «Oppgave».

**Feil eier oppdaget underveis.** Viser det seg at en åpen PR hører til et annet
prosjekt, flyttes etiketten på både Issue-et og PR-en til riktig prosjekt, og det
prosjektet overtar både videre arbeid og kontroll; det første prosjektet stopper
sitt. Kontroll og sammenslåing venter til flyttingen er gjort.

**Status uten nye verktøy.** Hvor en oppgave står, leses av GitHub-feltene som
alt finnes; det trengs verken statusetiketter eller en egen tavle:

| Status | Betyr | Søk |
| --- | --- | --- |
| Ledig | Åpent Issue uten assignee | [`is:issue is:open no:assignee`](https://github.com/peohol/ousfar/issues?q=is%3Aissue+is%3Aopen+no%3Aassignee) |
| Tildelt / Pågår | Åpent Issue med assignee, med eller uten en åpen PR | [`is:issue is:open assignee:peohol`](https://github.com/peohol/ousfar/issues?q=is%3Aissue+is%3Aopen+assignee%3Apeohol) (bytt bruker) |
| Til kontroll | Åpen PR med etiketten «Til ChatGPT-kontroll – ikke merge» | [`is:pr is:open assignee:peohol`](https://github.com/peohol/ousfar/pulls?q=is%3Apr+is%3Aopen+assignee%3Apeohol) (bytt bruker) |
| Ferdig | Issue-et er lukket, normalt av «Closes #N» når siste PR slås sammen | |

En felles GitHub Projects-tavle kan legges oppå senere, men er ikke nødvendig.

**Konflikter mellom parallelle løp.** Én gren per arbeidsløp, aldri direkte til
`main`. Før en PR er klar: oppdatert base, grønne tester og avhengighetene
kontrollert. Vurder særlig migrasjoner, delte API-er og felles komponenter når
to løp er åpne samtidig; at Git ikke melder konflikt, beviser ikke at endringene
virker sammen. Versjon og endringslogg følger §6 punkt 9 uendret.

Det er fortsatt fritt å diskutere sammenhenger og avhengigheter mellom
prosjektene. Reglene gjelder eierskap og kontroll, ikke nødvendig
informasjonsutveksling.

## 6. PR-er: merking, kontroll og sammenslåing

1. **Nøyaktig én prosjektetikett** på hver PR, også dokumentasjonsendringer og
   små feilrettinger: `ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`, den
   samme som på Issue-et. Claude setter den når PR-en opprettes.
2. **Nøyaktig én assignee**, den samme som på Issue-et (§3). Claude setter den
   når PR-en opprettes.
3. **PR-beskrivelsen** følger malen (`.github/pull_request_template.md`): øverst
   et kort sammendrag i enkelt språk for mennesker (hva som er gjort, hvorfor, og
   om en menneskelig systemarkitekt må ta stilling til noe), deretter
   arbeidsoppgaven, ansvarlig prosjekt, avhengigheter til andre oppgaver eller
   PR-er, mulige virkninger utenfor prosjektets ansvarsområde og eventuelle
   tekniske detaljer for kontrollen. Under «Arbeidsoppgave» står `Refs #N` for
   en delleveranse og `Closes #N` bare når PR-en fullfører Issue-et. Flere PR-er
   kan vise til samme Issue.
4. **Den automatiske kontrollen** «Prosjektansvar» (`scripts/prosjektansvar.mjs`)
   består bare når PR-en har nøyaktig én gyldig prosjektetikett og nøyaktig én
   assignee blant systemarkitektene, og viser til minst ett Issue som har den
   samme etiketten og den samme ene assignee-en. Ellers feiler den med en kort
   forklaring av hva som må rettes. Regelsettet «Prosjektansvar» på `main` gjør
   den påkrevd før sammenslåing. Den kontrollerer bare merkingen, ikke om den er
   riktig, og ikke hvem som faktisk ba om arbeidet; det vurderer ChatGPT.
5. **Betrodd kjøring.** En PR kan ikke endre det som vurderer den selv:
   - Selve kontrollen (`.github/workflows/prosjektansvar.yml`) kjøres bare av
     hendelsene `workflow_run` og `issues`, som alltid bruker arbeidsflyten og
     skriptet slik de er på `main`. Den sjekker bare ut `main`, leser PR-en og
     Issue-ene som data fra GitHub og kjører ingen kode fra PR-en. Resultatet
     skrives på PR-ens siste commit som commit-statusen «Prosjektansvar», som
     er den regelsettet krever, og som en check run med samme navn og hele
     forklaringen. (GitHub teller ikke check runs som en arbeidsflyt lager
     gjennom Checks-API-et, som påkrevde sjekker, men commit-statuser fra den
     samme arbeidsflyten.) Begge settes til «pågår» før hver ny vurdering, så
     en gammel grønn ikke gjelder imens.
   - `.github/workflows/prosjektansvar-utloser.yml` kjører ved hver endring av
     en PR (nye commits, etiketter, assignees eller beskrivelse), uten tilganger
     og uten å kjøre noe; når den er ferdig, kjører kontrollen fra `main`.
     Fjerner eller ødelegger en PR utløseren, får den ingen «Prosjektansvar» og
     kan ikke slås sammen.
   - Får et Issue ny assignee eller etikett, eller slettes eller flyttes det,
     vurderes alle åpne PR-er som viser til det, på nytt med en ny status og
     check run, så en grønn kontroll ikke blir stående på et foreldet
     grunnlag.
   - Fordi «Prosjektansvar» kan etterlignes av enhver arbeidsflyt som kjører
     kode fra en gren eller PR (`pull_request`, `pull_request_target`, `push`,
     `workflow_dispatch`, `merge_group`), feiler kontrollen når en PR legger
     til eller endrer en slik arbeidsflyt som har en jobb som heter
     «Prosjektansvar», som kan skrive check runs eller statuser, eller som
     mangler en permissions-blokk. Det oppdager, men kan ikke teknisk hindre,
     at noen med skrivetilgang bevisst omgår kontrollen, for eksempel fra en
     annen gren; det krever særskilt kontroll av alle endringer i
     `.github/workflows/`.
   - En PR som endrer kontrollens egne filer, vurderes med versjonen på `main`
     og får en advarsel om det; endringen virker først når den er slått sammen.
6. **Overgang:**
   - Kravet om assignee og arbeidsoppgave gjelder PR-er som er opprettet etter
     at `.github/prosjektansvar.json` kom på `main`. Eldre PR-er får bare en
     advarsel og kan fullføres slik de ble startet; kravet om prosjektetikett
     gjelder dem som før. Unntaket følger opprettelsestidspunktet og gjelder
     ingen nye PR-er.
7. **Kontroll:** bare ChatGPT-prosjektet som eier etiketten, og som tilhører
   PR-ens assignee («GitHub-ansvarlig» i prosjektinstruksen), kontrollerer og
   slår sammen PR-en, etter [PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md).
   Ved «sjekk igjen» eller «alle åpne PR-er» hentes hele køen, men bare egen
   kombinasjon av etikett og assignee kontrolleres. Har PR-en virkninger utenfor
   eget område (som felles CSS), kontrollerer det samme prosjektet også dem. Et
   annet prosjekt kan bli orientert, men gjør ingen parallell kontroll. Dette er
   en avgrensning i instruksene, ikke en teknisk lesesperre.
8. **Uten gyldig merking** (ingen, flere, ukjent eller motstridende etikett
   eller assignee, eller rød «Prosjektansvar») får PR-en ingen ordinær kontroll
   og slås ikke sammen før den er rettet.
   - **Administrativ kommentar:** viser Issue-et under «Arbeidsoppgave»
     entydig at oppgaven hører til ChatGPT-prosjektets egen etikett og egen
     «GitHub-ansvarlig», kan det prosjektet skrive en kort kommentar på PR-en
     om hva som må rettes i merkingen. Kommentaren begynner med «Tilbakemelding
     fra ChatGPT», sier at den bare gjelder administrativ avklaring, og
     inneholder ingen vurdering av kode, faginnhold eller klinikk. Den er ingen
     ordinær kontroll, og PR-en må kontrolleres fullt etter at den er rettet.
   - Er tilhørigheten ikke entydig, eller hører PR-en til et annet prosjekt
     eller en annen systemarkitekt, sier ChatGPT bare kort fra om uklarheten
     eller hvem som eier den, uten å gjette eller overta arbeidet. Forbudet mot
     å kontrollere andre eieres PR-er gjelder uendret.
9. **Versjon og endringslogg:** hver PR har nøyaktig én føring etter
   [endringslogg.md](endringslogg.md), uansett prosjekt (unntatt en stille
   designjustering). Føringen er en ny fil som sier om endringen er MAJOR,
   MINOR eller PATCH, uten versjonsnummer; nummeret settes automatisk i den
   rekkefølgen PR-ene slås sammen. Ingen PR reserverer et nummer eller endrer
   `package.json` for å føre en versjon, så PR-er fra ulike prosjekter kan slås
   sammen i hvilken som helst rekkefølge uten konflikt i endringsloggen.

## 7. Felles regler for alle prosjektene

- `AGENTS.md`, med tilleggene i undermappenes `AGENTS.md`, gjelder for alle agenter i alle prosjektene.
- Automatiserte nettleserkontroller kjøres i det lokale testmiljøet, aldri som
  omfattende kjøringer mot den publiserte appen ([qa-testmiljo.md](qa-testmiljo.md)).
- Produksjonsmigrasjoner rulles ut etter [migrasjoner.md](migrasjoner.md).
- Pasientopplysninger er ikke tillatt noe sted i OUSFAR, heller ikke
  pseudonymiserte eller som kasuistikk som kan knyttes til en person (Peder
  17.11.2026, [pasientopplysninger.md](pasientopplysninger.md)). Det gjelder
  alle tre prosjektene og alt de lager: innhold, fritekst, filer, logger,
  varsler, eksport og tjenester utenfor.
- Repoet er offentlig: bare syntetiske testdata, ingen nøkler eller faglige
  vurderinger av stoffer fra kurateringen.
- Ingen nye koordinatorer, godkjenningsledd eller automatiske kontrollrunder uten
  at Peder ber om det.
- **Fire separate beslutninger.** Teknisk PR-godkjenning (ChatGPTs kontroll og
  sammenslåing), uavhengig klinisk eller faglig vurdering (Kontrolløren i OUSFAR
  Fag, den kliniske kontrollen i OUSFAR Verktøy), formell klinisk godkjenning
  (der styringsdokumentene krever Peders ja, for eksakt versjon og avgrensning)
  og aktivering i appen er hver sin beslutning. Den ene gir ikke den andre: en
  teknisk sammenslåing aktiverer aldri en klinisk regel som ikke er formelt
  godkjent, og grønn CI er ingen klinisk vurdering.
- **Alvorlige faglige bekymringer.** Oppdager ChatGPT eller en annen agent
  utenfor kurateringen en mulig alvorlig faglig feil i et stoff som er under
  kuratering eller blindkontroll, skal den ikke undertrykkes, men heller ikke
  nå Kurator eller Kontrollør. Den tas opp i den ikke-offentlige samtalen med
  systemarkitekten i eget prosjekt, aldri i GitHub (som er offentlig) og aldri
  i kurateringstrådene. Er systemarkitekten ikke Peder, bringer
  systemarkitekten bekymringen videre til Peder som fagansvarlig, utenom
  GitHub. Kan feilen få vesentlige følger, venter publisering og
  sammenslåing av det berørte innholdet til Peder har tatt stilling.

## 8. En ny systemarkitekt

Det trengs ingen nye etiketter, repoer eller personlige Claude-instrukser:

1. Peder gir vedkommende skrivetilgang til repoet på GitHub (Settings →
   Collaborators). Uten den kan GitHub ikke sette personen som assignee.
2. GitHub-brukeren føres inn under `systemarkitekter` i
   [`.github/prosjektansvar.json`](../.github/prosjektansvar.json) i en PR fra
   OUSFAR Dev.
3. Vedkommende lager sine egne prosjekter med de felles instruksene i
   [prosjektinstrukser.md](prosjektinstrukser.md): Claude-instruksene er like
   for alle, og ChatGPT-instruksene får bare sin egen linje
   `GitHub-ansvarlig: <GitHub-bruker>` øverst.

## 9. Kort sagt

- Ett prosjekt eier hver oppgave og hver PR, etter formålet; én systemarkitekt
  er ansvarlig, etter assignee.
- Ingen implementering uten et Issue med etikett og én assignee; PR-en har de
  samme og viser til Issue-et.
- Etiketten og assignee-en sier hvilket ChatGPT-prosjekt som kontrollerer og
  slår sammen; «sjekk igjen» betyr bare egen kombinasjon.
- Hører noe til et annet prosjekt: si hvilket, overlever med et issue, og la det
  være.
