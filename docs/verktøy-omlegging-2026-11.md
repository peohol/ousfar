# OUSFAR Verktøy – ny kildeoppfølging, redaktørflyt og klinisk tilgjengelighet

**Beslutning:** 01.11.2026. **Status:** vedtatt utviklingsretning, ikke implementert. Denne filen er en gjennomføringsplan; produksjonen følger fortsatt den gamle løsningen til endrings-PR-ene er kontrollert og publisert.

**Knyttet til:** P12.1/P12.5 (kilde- og FEST-overvåking), P12.2–P12.4 (regelversjoner), P11.6 (målrettet nødstopp), P4/P7–P10 (klinisk regeldekning), og den kanoniske fremdriftsplanen i docs/verktøy-utviklingsplan.md. De tekniske beskrivelsene i docs/verktøy-p12-overvaking.md og docs/verktøy-p12-regelforvaltning.md beskriver dagens løsning der de avviker fra denne planen.

## 1. Bakgrunn og presise problemstillinger

1. P12-overvåkingen virker teknisk, men en endret kontrollsum gir en sak i administratorens grensesnitt uten at det er avklart om den faglige teksten har endret seg. Skjermbildet 01.11.2026 viste RCPsych «Stopping antidepressants» med to kontrollsummer, interne nøkler, tekstbokser for «Teknisk vurdering» og «Faglig beslutning» og en frist på 24 timer. En klinisk redaktør kan ikke utlede klinisk betydning av dette.
2. Det er i dag 24 timer til teknisk vurdering og, for høy prioritet, 72 timer til faglig beslutning. Dette er vilkårlige prosessfrister uten bemannet vaktordning. OUSFAR er en lukket app med få faglige brukere; det skal ikke etableres en helge- eller døgnberedskap ved normale kildeendringer.
3. «Lagre beslutning og avslutt» lagrer i dag en fritekst og lukker et funn, uten å gjennomføre et påkrevd kildeskifte, en regelendring eller en sperre. Lukket sak er derfor ikke nødvendigvis utført tiltak.
4. Bare seks regelversjoner er klinisk godkjent, hvorav to bare gir fagtekst; beregninger er i tillegg snevert avgrenset. Dette er hovedforklaringen på at verktøyene i liten grad kan brukes. Kildeovervåkingens uavsluttede prøvefunn **sperrer ikke** beregningene. Andre uavhengige stoppmekanismer omfatter FEST-data eldre enn 48 timer og manglende fersk lesing av kliniske sperrer.
5. To reelle funn fra 31.10.2026 (RCPsych, nøkkel rcpsych-stopping; Australian Prescriber/«keks-2016») er bare påvist som endrede dokumentavtrykk. Det er **ikke påvist** om endringene gjelder de delene de godkjente reglene bygger på. Prøvefunn 3 er syntetisk og har ingen klinisk betydning.

**Mål:** Kliniske brukere får enkle, nyttige verktøy; redaktører får bare forståelige faglige beslutninger med klare konsekvenser; tekniske funn undersøkes og håndteres uten at redaktørene blir systemutviklere. Bevar pasientsikkerhet, sporbarhet og uavhengig godkjenning.

## 2. Beslutninger og ufravikelige prinsipper

- **Ingen tekniske beslutninger i admin-UI.** Ingen kontrollsummer, database-ID-er, fingeravtrykk, rå logger eller skjema for teknisk vurdering i normal redaktørvisning. Slike opplysninger beholdes i reviderbar teknisk dokumentasjon i repoet og kan gjøres tilgjengelige for kontrollører, ikke forlanges av klinikere.
- **Ingen generelle tidsfrister på 24/72 timer.** Fjern nedtelling, «over fristen» og kunstig eskalering basert på helgedager. Prioritet fastsettes av konkret klinisk risiko. For reell, troverdig alvorlig fare må det kunne handles straks, men det gir ikke en standardvaktordning.
- **Endret kontrollsum er ikke en faglig hendelse.** Slike funn undersøkes teknisk og skal ikke alene varsle redaktøren, vises i verktøyet, endre godkjenning eller stenge bruk.
- **Behold gjeldende godkjent regel ved uavklart, ikke-kritisk kildehendelse**, med versjon og grunnlag intakt. En sikkerhetsmessig viktig, relevant endring kan gi et kort og avgrenset varsel. Ved bekreftet eller troverdig alvorlig feil brukes eksisterende nødstopp for akkurat berørt regel/verktøy; resten fortsetter å fungere.
- **Ingen klinisk autogodkjenning.** Hver ny eller endret beregningsregel krever fortsatt uavhengig klinisk kontroll av regelversjon, fingeravtrykk og testkasus. Ikke omgå sperrene mot ikke-godkjente regler for å øke dekningen.
- **Ikke automatisk godta ny kilde som klinisk likeverdig** uten tilstrekkelig sammenligning. At en nettside gir stabil tekst ved nye hentinger, sier ikke hva den inneholdt da den opprinnelig ble kontrollert. Mangler sammenlignbart grunnlag, behold faglig uavklart status og undersøk originalgrunnlaget.
- **Ingen ny betalt tjeneste.** Bygg på GitHub Actions, eksisterende repo, Supabase og de allerede brukte utviklingsagentene. Kontroller at agentkjøring faktisk kan utløses pålitelig før arbeidsflyten omtales som automatisk.
- **Rettslig kildehåndtering videreføres.** Ikke lagre eller gjengi Psychiatrienets anbefalingstekst, heller ikke omskrevet. Tekniske rapporter kan vise tillatte metadata, eget faglig sammendrag og lenker; rå tredjepartstekst skal ikke kopieres inn i app, repo eller logger.

## 3. Fremtidig behandling av et kildefunn

| Verifisert tilstand | Hvem arbeider? | Konsekvens i OUSFAR |
| --- | --- | --- |
| Kun HTML, dynamiske elementer, navigasjon eller tekniske avtrykk endret; relevant faglig innhold dokumentert uendret | Teknisk agent/utvikler; kontrollert spor | Ingen redaktørsak, intet brukervarsel eller sperre. Eventuelt nytt teknisk sammenligningsgrunnlag føres inn kontrollert i PR |
| Kan ikke fastslå hva som er endret, eller kilde er utilgjengelig | Teknisk utredning med synlig teknisk status | Ingen automatisk klinisk beslutning eller sperre. Om alvorlig risiko er troverdig, løftes den konkret og raskt |
| Klinisk relevant tekst er endret, men ingen uforsvarlig beregning er påvist | Agent utarbeider kilde- og konsekvensvurdering; uavhengig kontroll ved behov | Bare berørt anbefaling kan få kort «Under faglig gjennomgang». Verktøyet forblir normalt brukbart innen godkjent omfang |
| Endring nødvendiggjør nytt faglig valg eller ny regel | Uavhengig klinisk kontrollør og eventuelt faglig redaktør | Presist faglig spørsmål med anbefalt valg og beskrevet konsekvens. Ny regelversjon via PR og godkjenning før publisering |
| Konkret, troverdig alvorlig sikkerhetsrisiko for en eksisterende plan | Ansvarlig klinisk vurdering med snarest mulig teknisk hjelp | Sett målrettet nødstopp; vis årsak og eventuelt sikkert alternativ. Ikke steng andre urelaterte regler |
| Syntetisk prøve eller dobbeltregistrering | Test-/driftsautomatisering | Skilles fra reelle faglige saker; prøven avsluttes med testbevis, ikke en fiktiv klinisk beslutning |

**Krav til spor:** Kilde, hentetidspunkt, hva som er sammenlignet, relevans for navngitt godkjent regel, vurderingsgrunnlag, konklusjon, den som utførte kontrollen, lenke til eventuell PR, og utfallet i produksjon. Et uendret klinisk innhold kan ikke erklæres på grunnlag av kun en hash eller en ikke-sammenlignbar eldre kilde.

**Saksforløp:** Oppdaget → teknisk undersøkt → (a) teknisk avklart uten faglig betydning, (b) usikkerhet under utredning, (c) konkret faglig spørsmål eller (d) påvist mulig alvorlig risiko → tiltak bestemt → tiltak utført/verifisert → avsluttet. En sak med tiltak kan ikke lukkes som «ferdig» mens PR, kildegrunnlagsoppdatering eller sperre ennå mangler. Historikken bevares; et nytt avtrykk må ikke viske ut en åpen beslutning. Unngå duplikater, samtidighetsfeil og utløste oppgaver som overskriver nyere vurderinger.

## 4. Hva administrator og vanlig bruker skal se

### Faglig redaktør

- Normalt **ingen** sak om rutinemessig drift eller teknisk avvik. Kritisk driftsfeil følges opp av teknisk ansvarlig; dersom den også rammer klinisk sikkerhet, beskrives det som et *faglig sikkerhetsproblem*.
- Når et reelt faglig valg gjenstår, vis ett kort med: **Hva er endret?** (faglig, med kildelenke), **Hvilke anbefalinger berøres?**, **Hvorfor er dette relevant?**, **Anbefalt beslutning og begrunnelse**, **Hva vil skje med verktøyet ved hvert valg?**, samt eventuell faktisk sikkerhetsstatus.
- Gi avgrensede, meningsfulle valg som «Behold godkjent regel», «Be om revidert anbefaling», «Deaktiver berørt regel» og «Utsett beslutning». Vis bare valg som er faglig og teknisk mulige. Beskriv før bekreftelse hvilke handlinger som utføres nå og hvilke som krever kontrollert PR.
- Tekniske sammenligninger, vedlikeholdsjobber og konfigurasjon ligger utenfor redaktørgrensesnittet. Ikke be redaktør lime inn SHA-er, skrive tekniske begrunnelser eller åpne GitHub.
- Vis «Oppfølging pågår» mens nødvendig tiltak utføres. «Avsluttet» først når utfallet er kontrollert. Bevar hvem, hva, når og hvorfor. En ren kvittering er ikke lik utført kilde-/regelendring.
- Admins må fortsatt kunne sette og oppheve en avgrenset klinisk nødstopp med forståelig årsak. Ikke innfør en ny, skjult stoppbryter.

### Klinisk bruker

- Bevar enkel hovedflyt: velg legemidler → oppgi nødvendige kliniske forhold → beregn → les plan/forutsetninger.
- Ingen interne regel-ID-er, kontrollsummer, overvåkingshistorikk eller utviklerstatuser i hovedvisningen. Dokumenter faglig grunnlag, forutsetninger, begrensninger, tidspunkt og kilder pedagogisk i en frivillig utvidbar del («Faglig grunnlag»).
- Bare **klinisk relevante** kildevarsler vises, på akkurat berørt anbefaling. Ved uavklart ikke-kritisk hendelse kan beregningen fortsette. Ved målrettet sperre vises tydelig hvorfor akkurat denne beregningen er utilgjengelig; andre kombinasjoner fungerer.
- Ikke fremstill en avgrenset plan som en komplett nedtrappings-/bytteplan. Ikke vis generell teknisk usikkerhet som om en klinisk endring var påvist.
- Test mobil og tastaturbruk; unngå at forklaringer skyver beregningsfeltene nedover eller forstyrrer arbeidsflyten.

## 5. Arbeidsdeling

| Rolle | Oppgaver | Avgrensning |
| --- | --- | --- |
| **Claude Code / utviklingsautomatisering** | Kildehenting, normalisering, teknisk sammenligning, tekniske rapporter, arbeid med kildegrunnlag og regelversjoner, tester, database- og UI-endringer, PR-er, etterprøvbar gjennomføring av vedtatte tiltak | Tar ikke nye kliniske prinsippbeslutninger eller gir regler klinisk godkjenning |
| **ChatGPT – uavhengig kontrollør** | Kontrollerer klinisk relevans og kilder selv, vurderer foreslåtte kliniske endringer, uenighet og sikkerhetskritiske PR-er; kontrollerer at godkjenningskrav og effekter er reelle | Faglig vurdering er ikke det samme som automatisk publisering |
| **Faglig redaktør** | Tar stilling til reelle, eksplisitt formulerte kliniske valg når uavhengig fagkontroll ikke alene avgjør spørsmålet; kan bruke nødstopp ved konkret sikkerhetsbekymring | Har ikke ansvar for tekniske vurderinger, kildenedlastinger, drift eller tilfeldige 24-timersfrister |

Teknisk oppfølging må fungere uten at redaktøren hver uke manuelt ber Claude gjøre en jobb. Undersøk først om GitHub Actions og nåværende agenttilgang kan starte en avgrenset kontroll automatisk når et funn registreres. Hvis ikke: opprett en sporbar **teknisk** arbeidskø/rapport med tydelig driftsansvar og en dokumentert manuell agentstart som midlertidig fallback; ikke merk dette «automatisert». Ingen nye betalte tjenester eller uavklarte sikkerhetsrettigheter. Kritiske kliniske hendelser må få en særskilt vei til ansvarlig redaktør uten å skape generelle tidsfrister.

## 6. Gjennomføring – egne PR-er og sjekklister

Alle punkter er **ikke påbegynt** per 01.11.2026. Claude gjennomfører tekniske leveranser og oppdaterer denne listen med PR, testbevis og faktisk produksjonskontroll. ChatGPT kontrollerer ved de angitte portene. Ikke gjør store database-, brukergrensesnitt- og kliniske endringer i én PR.

### VDR-0. Kartlegg og avgrens (før første kode-PR)

- [ ] Dokumenter datamodellen, tilgangskontrollen og de faktiske overganger for funn, tekniske vurderinger og avslutning: src/components/konto/Kildeovervaking.tsx, src/verktoy/overvaking/{varsling,modell,endepunkt}.ts, GitHub-arbeidsflyten og databasen.
- [ ] Identifiser alle steder med 24/72-timerslogikk, tekniske admin-felt, generelle varsler og kilde-/regelavhengigheter.
- [ ] Verifiser dagens produsert tilstand for funn 1, 2 og 3, den kliniske nødstoppen, og hvilke godkjente regler som faktisk kan beregnes. Ikke lukk eller godkjenn noe bare for å få en ryddig liste.
- [ ] Definer klart hvilke funn som kan avklares maskinelt, hvilke som krever kildegranskning, og hva som teller som alvorlig risiko. Lag representative syntetiske testtilfeller.

**Leveranse:** Kort teknisk og klinisk avgrensningsnotat i PR for VDR-1. Ingen implementasjon av nye kliniske regler.

### VDR-1. Trygg saksmodell og teknisk oppfølging

- [ ] Innfør separate tilstander for teknisk utredning, faglig beslutningsbehov, iverksetting og lukking, med historikk; migrer eksisterende rader uten tap og med tilgangskontroll.
- [ ] Fjern standardfristene 24/72 timer og fristeskaleringen fra app, tester og dokumentasjon. Prioriter etter vurdert klinisk risiko, ikke passert tid.
- [ ] Opprett pålitelig teknisk behandling av endringer i sideoppsett, dynamiske nettsider, reelle faglige avsnitt, utilgjengelige kilder og endret FEST. Bevis manglende faglig endring før automatisert teknisk avslutning.
- [ ] Skill teknisk driftsovervåking fra faglige varsler. Funn kan lagres teknisk uten å bli en redaktørsak. Ukjent/uavklart er ikke det samme som «ingen endring».
- [ ] Dokumenter hva som faktisk starter oppfølgingsarbeidet, hva som skjer ved mislykket jobb, og hvem som kan forsøke på nytt; ikke lov automatikk uten bestått ende-til-ende-test.
- [ ] Bevar uforanderlige godkjenningsfingeravtrykk, regelversjoner, kildearkiv og rettighetsregler. Oppdatering av nytt sammenligningsgrunnlag skjer kontrollert og sporbart, ikke som følge av et vilkårlig hashbytte.

**Kontrollport:** Test at normal kildevariasjon ikke gir redaktørsak/sperre, og at reell mulig sikkerhetsfare ikke kan skjules eller lukkes ved teknisk feil.

### VDR-2. Faglig redaktørvisning og reelle beslutninger

- [ ] Fjern teknisk vurderingsfelt og interne tekniske detaljer fra administratorgrensesnittet. Gi redaktør beskjed først når det finnes et konkret faglig spørsmål eller en reell sikkerhetsrisiko.
- [ ] Vis problem, dokumentert faglig endring, berørt regel, foreslått tiltak, kildehenvisning og konsekvens **før** noe kan bekreftes.
- [ ] Erstatt fritekst-«Lagre beslutning og avslutt» med en beslutning som følges av en sporbar gjennomføringsoppgave. Avslutning krever kontrollert iverksetting; et ønske om endret regel er ikke en ferdig endret regel.
- [ ] Test roller, parallell redigering, forsinket arbeid, utilgjengelig database, gjenopptaking, uklare funn og målrettet nødstopp.
- [ ] Kontrollér utforming og tekst med klinisk redaktørperspektiv, også på mobil.

**Kontrollport:** En klinisk farmakolog kan forklare hva som skal besluttes og hva valget faktisk vil gjøre, uten utviklerkunnskap.

### VDR-3. Klinisk verktøy-UI og relevante advarsler

- [ ] Skjul teknisk bakgrunnsinformasjon bak klinisk relevante forklaringer. Lag en pedagogisk og sammenleggbar seksjon «Faglig grunnlag».
- [ ] Knytt eventuell advarsel til nøyaktig berørt regel og godkjent omfang; ingen advarsel for ren hashendring.
- [ ] Vis målrettet sperre med faglig årsak, uten å stenge upåvirkede beregninger. Bevar kontrollen av regelversjon og godkjenning.
- [ ] Test at ufullstendige planer ikke fremstilles som fullstendige, og at UI fungerer for alle tre verktøyene.

**Kontrollport:** Verktøyet er uforstyrret når en irrelevant kilde endrer seg; en spesifikt sperret regel gir ingen plan, mens en annen godkjent regel fortsatt virker.

### VDR-4. Drift og tilgjengelighet – separat risikovurdering

- [ ] Undersøk om regelen om FEST-ferskhet på 48 timer og sperrelesing hvert minutt (gyldighet to minutter) gir unødvendige avbrudd i intern bruk. Beskriv klinisk risiko, hva som faktisk blir utdatert, og observerte feil før endring.
- [ ] Vurder konkret om en **senest dokumentert og validert** FEST-kopi kan brukes under kortvarig synkroniseringssvikt, med tydelige grenser og eventuelle restriksjoner. Ikke bruk ugyldige styrker, uregistrerte preparater eller ukjent tilgjengelighet som om data var ferske.
- [ ] Skill manglende **nettverkskontakt** fra en faktisk aktiv sikkerhetssperre. Ikke fjern kontrollen av aktive sperrer eller gjenåpne regler uten positivt sikkerhetsgrunnlag.
- [ ] Legg frem eventuell foreslått endring for selvstendig sikkerhetskontroll før implementasjon. Hvis ingen trygg forbedring kan begrunnes, behold dagens stoppbetingelser.

**Kontrollport:** Ingen klinisk feilberegning, gjenåpning av sperrede regler eller skjult usikkerhet som følge av økt tilgjengelighet.

### VDR-5. Produksjonskontroll og utfasing av gammel prøvesak

- [ ] Test hele flyten med **kontrollert klokke/testdata**, uten å vente 24 eller 72 virkelige timer: ingen klinisk konsekvens → teknisk avslutning; klinisk spørsmål → tydelig redaktørvalg → kontrollert tiltak → lukking; reell alvorlig risiko → målrettet sperre.
- [ ] Kontroller mot produksjonen at tekniske funn ikke vises som kliniske oppgaver, at målrettet sperre virker og kan oppheves, og at historikk og tilgangskontroll er intakt.
- [ ] Håndter eksisterende funn 1 (Australian Prescriber/KEKS) og 2 (RCPsych) med reell kildevurdering og dokumentert konklusjon; ikke anta at et endret avtrykk betyr endret faglig råd.
- [ ] Behold sporbarheten for syntetisk funn 3, avslutt det som **prøve** etter dokumentert resultat. Den gamle testen på en kunstig 72-timersfrist er ikke en ny ferdigport. Avklar den eksisterende påminnelsen 03.11.2026 når ny løsning er utrullet; ikke la gammel fristtest definere faglige krav.
- [ ] Oppdater docs/verktøy-p12-overvaking.md, docs/verktøy-p12-regelforvaltning.md, testene og fremdriftsloggen til det som faktisk er publisert. Kryss først da av de aktuelle P12-punktene.

**Kontrollport:** Dokumenterte kjøringer, sikkerhetstester, UI-test og kontrollørtillatelse. P12.1 skal ikke krysses av kun fordi den gamle prøvesaken har passert 72 timer.

## 7. Parallelt arbeid: øk klinisk nytte og regeldekning

Dette er **et eget klinisk spor**, ikke en underoppgave som må vente på VDR-1–VDR-5. Kildeovervåkingen hindrer ikke eksisterende godkjente beregninger.

- [ ] **VDK-1** Lag en praktisk dekningsoversikt for de tre verktøyene: hva kan beregnes i dag, hva gir bare fagtekst, og hvilke vanlige valg stopper. Ta utgangspunkt i faktiske regler og syntetiske kasus, ikke gjetninger om bruksmønstre.
- [ ] **VDK-2** Prioriter nyttige, faglig forsvarlige og ferdig spesifiserbare kombinasjoner og nedtrappingsregler. Få uavhengig kilde- og klinisk vurdering før konkrete anbefalinger formuleres som beregning.
- [ ] **VDK-3** Utvid dekningen i avgrensede kliniske PR-er med norske preparater, dosegrenser, avvik, negative tester og uavhengig godkjenning av hver endret regelversjon.
- [ ] **VDK-4** Test med et lite utvalg kliniske farmakologer og forbedre valg, forklaringer og planbegrensninger ut fra observerte problemer, uten å endre klinisk innhold umerket.

**Bevar:** ikke-godkjente regler gir ingen klinisk doseplan; ikke konstruer råd for kombinasjoner uten dokumentert grunnlag, og bruk ikke verbatim/avledet Psychiatrienet-tekst. Separate PR-er for ny faglig regel og ren UX gir klarere klinisk kontroll.

## 8. Leveranserekkefølge, PR-krav og ferdigkriterier

**Rekkefølge:** VDR-0 → VDR-1 → VDR-2 → VDR-3 → VDR-5. VDR-4 utredes separat og krever egen sikkerhetsbeslutning før kodeendring. VDK-1–VDK-4 går parallelt og kan gi tidlig nytte; ingen av sporene skal vente på en kunstig prøvesaksfrist.

**Hver PR** skal oppgi oppgave-ID, konkret atferdsendring, hva redaktør/bruker faktisk merker, testbevis, migrasjons- og tilbakeføringskonsekvens, og hvilket klinisk innhold som eventuelt krever uavhengig kontroll. Oppdater status i denne filen og fremdriftsloggen, og bruk repoets loggføringsprotokoll. Opprett ikke parallelle PR-er som samtidig redigerer fremdriftsplanen. Bevar eksisterende produksjonstilgang og data gjennom additive, rettighetskontrollerte overganger.

**Fullført når:** (1) normale kildeendringer ikke skaper tekniske adminoppgaver; (2) ingen 24/72-timerskrav gjenstår; (3) faglige spørsmål presenteres med grunnlag, valg og virkning; (4) sak avsluttes bare når faktisk tiltak er verifisert; (5) klinisk relevante varsler og sperrer er nøyaktig avgrenset; (6) ingen upåvirket godkjent beregning blir blokkert av vanlig kildevariasjon; (7) kliniske godkjennings- og sporbarhetskrav er beholdt; (8) teknisk drift/feil og reelle kildefunn er prøvd i produksjon. Økt regeldekning måles og godkjennes særskilt.

**Neste konkrete oppdrag til Claude Code:** Start VDR-0 og VDR-1, inkluder fysiske funn 1–3 som testgrunnlag uten å konkludere klinisk på en hash, og lag en avgrenset PR med design, nødvendig kode og tester. Send klinisk risikable valg til ChatGPT for uavhengig kontroll. Ikke start med å utvide kliniske beregninger i samme PR.
