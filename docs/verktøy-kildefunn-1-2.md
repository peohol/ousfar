# Kildefunn 1 og 2: undersøkelse før faglig kontroll (tråd F)

Undersøkt 02.11.2026 av Claude. Bare lesing: ingen funn er vurdert, lukket eller endret i databasen, og kildegrunnlaget (`KILDER`, `kildekontroll-grunnlag.json`) er urørt. Rapporten legges frem for ChatGPT som uavhengig kontrollør (§6). Gjelder planpunktet om funn 1 og 2 i `docs/verktøy-omlegging-2026-11.md` (VDR-0 og VDR-5).

## 1. Konklusjon

| | Funn 1: Australian Prescriber, `keks-2016` | Funn 2: RCPsych, `rcpsych-stopping` |
|---|---|---|
| Hva er påvist | Kontrollsummen av siden slik den ble hentet 28.10.2026 kan ikke gjenskapes. PMC legger engangsverdier i hver side, så den kan aldri gjenskapes, heller ikke ett sekund senere. Den synlige teksten er lik ved alle fire hentinger 31.10–02.11. | Kontrollsummen fra 28.10.2026 kan ikke gjenskapes. Siden er lik fra minutt til minutt, men ulik fra dag til dag. Den synlige teksten er lik ved alle ti hentinger 31.10–02.11. |
| Faglig innhold regelen bygger på | Stedet regelen viser til (tabell 2) finnes og støtter faktumet regelen bruker. Ingen rettelse eller erratum er registrert for artikkelen. | Seks av de syv faktaene de godkjente reglene bruker, støttes av siden slik den er nå. Det sjuende (`RCPSYCH.langvarig`) støttes bare delvis: kilden regner prosenten av den opprinnelige dosen, faktumet sier «av dosen» (uavklart, §6 spørsmål 3). Dette er ikke en endring i kilden. Siden oppgir fortsatt «Published: Mar 2024», som er versjonen regelen bygger på. Publiseringssystemet oppgir at siden sist ble endret 28.04.2025. |
| Det som ikke kan avgjøres | Om den synlige teksten 28.10 var den samme som nå. Teksten fra 28.10 ble ikke lagret (rettigheter), og nettarkivet kunne ikke leses fra dette miljøet. | Det samme. |
| Sannsynlig forklaring (antatt, ikke påvist) | Endret avtrykk skyldes engangsverdiene i PMC-siden, ikke artikkelen. | Endret avtrykk skyldes noe i siden rundt teksten, ikke selve rådene. |
| Godkjente regler som berøres | `kryssnedtrapping-sertralin-mirtazapin` v9 | `kryssnedtrapping-sertralin-mirtazapin` v9 og `seponering-vortioksetin` v11 |

Ingen av kildene erklæres faglig uendret. Det som er påvist, er at det regelen bygger på, finnes og står slik regelen gjengir det **nå**, med ett unntak: et uavklart avvik i hva prosenten regnes av (§4, §6 spørsmål 3). Avviket er ikke en kildeendring. At dette også gjaldt 28.10, er sannsynlig, men ikke påvist. Funnene bør derfor ikke lukkes før kontrolløren har tatt stilling til spørsmålene i §6.

## 2. Tilstanden i databasen 02.11.2026 kl. 20.46 UTC

Lest fra `public.kildefunn` og `public.kildeovervaking_kjoringer`.

| Nr. | Funn | Opprettet | Status | Teknisk vurdering | Beslutning |
|---|---|---|---|---|---|
| 1 | `dokument:keks-2016` | 31.10 20.59 (kjøring 1) | Avløst av nr. 4 02.11 06.50 | ingen | ingen |
| 2 | `dokument:rcpsych-stopping` | 31.10 20.59 (kjøring 1) | Avløst av nr. 5 02.11 06.50 | ingen | ingen |
| 3 | `provesak:syntetisk` (prøve) | 31.10 21.05 (kjøring 2) | Åpen | 31.10 21.07 | ingen |
| 4 | `dokument:keks-2016` | 02.11 06.50 (kjøring 3, ukentlig) | Åpen, avløser nr. 1 | ingen | ingen |
| 5 | `dokument:rcpsych-stopping` | 02.11 06.50 (kjøring 3, ukentlig) | Åpen, avløser nr. 2 | ingen | ingen |

Funn 1 og 2 lever altså videre som nr. 4 og 5. De ble avløst fordi kontrollsummen av siden slik den kom var ny, ikke fordi den synlige teksten var endret: den er lik i nr. 1 og 4 og i nr. 2 og 5. Prøvefunn 3 er urørt og bevart. Ingen funn er lukket.

## 3. Kontrollsummene

Kontrollsummene er beregnet med `kontrollsummer` i `src/verktoy/overvaking/dokumenter.ts` og `hentDokument` i `src/verktoy/kildehenting.ts`, de samme som i overvåkingen. «Synlig tekst» er siden uten skript, stil, kommentarer og tagger.

**keks-2016** (`https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/`)

| Hentet (UTC) | Siden slik den kom | Synlig tekst |
|---|---|---|
| 28.10 03.35 (grunnlaget i `KILDER`) | `55c5b956f46b…` | ikke beregnet |
| 31.10 20.59 (funn 1) | `1ec433de49d3…` | `5a5bd2e2411c…` |
| 02.11 06.41 (funn 4) | `9668c4d51b52…` | `5a5bd2e2411c…` |
| 02.11 20.47, henting 1 | `e3060fde660a…` | `5a5bd2e2411c…` |
| 02.11 20.47, henting 2 | `4fde97a53fa6…` | `5a5bd2e2411c…` |

De to hentingene 02.11 kl. 20.47 skilte seg bare på to linjer: en sporings-id (`ncbi_phid`) og et skjematoken (`csrfmiddlewaretoken`), som PMC lager på nytt for hver forespørsel. **Påvist:** grunnlaget fra 28.10 var en kontrollsum som ikke kunne gjenskapes.

**rcpsych-stopping** (`https://www.rcpsych.ac.uk/mental-health/treatments-and-wellbeing/stopping-antidepressants`)

| Hentet (UTC) | Siden slik den kom | Synlig tekst |
|---|---|---|
| 28.10 16.11 (grunnlaget i `KILDER`) | `f465fb1dbece…` | ikke beregnet |
| 31.10 20.59 (funn 2) | `d9e723eb59a1…` | `c35339d41f62…` |
| 02.11 06.41 (funn 5) | `c25af5729d02…` | `c35339d41f62…` |
| 02.11 20.47–20.50, åtte hentinger | `c3f3b0b26ff2…` | `c35339d41f62…` |

Siden er lik innenfor minutter, men har tre ulike kontrollsummer på tre dager uten at den synlige teksten har endret seg. Den har lenker til hjelpefiler med kodede parametere fra publiseringssystemet (ASP.NET), som kan skifte ved omstart eller utrulling. **Antatt, ikke påvist:** det er dette som skifter. Siden opplyser selv `"CreatedOn":"2020-09-04…"` og `"ModifiedOn":"2025-04-28T09:20:21Z"` og har teksten «Published: Mar 2024».

Merk at beskrivelsen i `docs/verktøy-p12-overvaking.md` §8 («RCPsych-siden er lik fra gang til gang nå») bare holder innenfor kort tid; se §5.

## 4. Det de godkjente reglene bygger på

Funnet ved å lese henvisningene i de klinisk godkjente regelversjonene (`godkjenteRegler` i `src/verktoy/overvaking/berorte.ts`). Hvert faktum er sammenlignet med kilden slik den er nå. Faktaene står med OUSFARs egne ord i `src/verktoy/regler/bygg.ts` og `pilotsett.ts`. Kildeteksten gjengis ikke her.

**keks-2016** brukes bare av `kryssnedtrapping-sertralin-mirtazapin` v9 (fingeravtrykk `dc878aa9065c…`):

| Sted | Faktum (OUSFAR) | Nå |
|---|---|---|
| tabell 2 | De fire byttemetodene (konservativ, moderat, direkte, kryssnedtrapping) | Støttes. Tabell 2 har de fire metodene, og kryssnedtrapping er beskrevet som at det nye legemidlet startes mens det første trappes ned. |

Europe PMC oppgir ingen rettelse, erratum eller tilbaketrekking for artikkelen (PMID 27346915), bare den opprinnelige kommentaren på side 84. Artikkelen har samme doi, nummer og sider som i `KILDER`. Faktaene fra tabell 3 og noten til den (`KEKS16.nedtrapping`, `KEKS16.fluoksetinMao`) brukes ikke av noen godkjent regel, men støttes også av teksten nå.

**rcpsych-stopping** brukes av `kryssnedtrapping-sertralin-mirtazapin` v9 (de to første radene) og `seponering-vortioksetin` v11 (fingeravtrykk `a6e488637de8…`, alle radene):

| Sted | Faktum (OUSFAR, kortet ned) | Nå |
|---|---|---|
| How should I gradually reduce my dose? | Første trinn en firedel eller halvdel, to til fire uker før neste | Støttes |
| If you have been taking antidepressants for longer | Små trinn fra start etter lang bruk, tidligere symptomer eller høyrisikostoff, for eksempel 5–10 % | **Delvis støttet, uavklart.** Situasjonene og 5–10 % står i kilden, men kilden regner prosenten av den *opprinnelige* dosen. Faktumet sier «av dosen», og reglene regner fra dosen pasienten bruker nå. For det første trinnet er det det samme. Se spørsmål 3 i §6. |
| How should I gradually reduce my dose? | Tilbake til siste gode dose og mindre trinn, 10 % eller 5 % | Støttes |
| When and how should I stop my antidepressants? | Minst fire uker også etter kort bruk; måneder eller lenger etter lang bruk | Støttes |
| When and how should I stop my antidepressants? | Mindre trinn etter hvert, noen helt ned mot 2 % | Støttes |
| Appendix 1 | Sertralin og de andre i middels risiko; vortioksetin i lav | Støttes. Inndelingen er den samme for alle stoffene faktumet nevner. |
| Which plan should I follow? | Om lag 50 % hver 2.–4. uke ved middels eller lavere risiko, om lag 10 % ved høyest | Støttes (eksempel 1 og 2) |

De fire andre godkjente reglene henviser ikke til noen av de to kildene. Funnene sperrer ingen beregning (`docs/verktøy-omlegging-2026-11.md` §1 pkt. 4).

## 5. Tekniske observasjoner for tråd A (VDR-1)

Disse er ikke kliniske og er ikke endret her.

1. Avtrykket til et funn tar med kontrollsummen av siden slik den kom. For PMC er den ny for hver henting, så hver ukentlig kjøring avløser funnet med et nytt nummer, selv om den synlige teksten er den samme. Det samme skjer for RCPsych når siden skifter.
2. Den synlige teksten omfatter hele nettstedets meny og bunntekst. For RCPsych er det om lag halvparten av teksten. Endres menyen, endres kontrollsummen uten at rådene er endret. En kontrollsum av bare artikkelinnholdet ville vært mer treffsikker.
3. For PMC-artikler kan Europe PMC sitt XML-uttrekk brukes, slik `keks-2019` allerede gjør. Det har ikke engangsverdier.
4. Setningen i `docs/verktøy-p12-overvaking.md` §8 om at RCPsych-siden er lik fra gang til gang, bør rettes når tråd A oppdaterer dokumentet.

## 6. Spørsmål til ChatGPT (uavhengig kontrollør)

1. **Nettarkivet.** Internet Archive har kopier av begge sidene før grunnlaget: RCPsych 24.10.2026 (`web.archive.org/web/20261024063524/…stopping-antidepressants`) og PMC 20.10.2026 (`web.archive.org/web/20261020103950/https://pmc.ncbi.nlm.nih.gov/articles/PMC4919171/`). Dette miljøet når ikke web.archive.org. Vil du sammenligne stedene i §4 i disse kopiene med sidene nå? Stemmer de, er en endring mellom 24.10 og 28.10 som senere er reversert, svært usannsynlig.
2. **Klassifisering.** Er du enig i at funn 1/4 og 2/5 er tekniske avvik i dokumentavtrykket, at det regelen bygger på, er påvist å stå slik regelen gjengir det nå (med unntaket i spørsmål 3), og at uendret innhold 28.10 er sannsynlig, men ikke påvist? Er det tilstrekkelig til å fastsette den synlige teksten som nytt grunnlag, eller må spørsmål 3 avklares først (`kildekontroll-grunnlag.json`, `synlig_tekst`, med kontrollsummene `5a5bd2e2411c…` og `c35339d41f62…`) i en egen PR, uten å endre reglene eller fingeravtrykkene? Eller skal det vente på den nye saksmodellen fra tråd A?
3. **En nyanse som ikke skyldes funnet.** RCPsych sier at små trinn fra start etter lang bruk kan være 5 % eller 10 % *av den opprinnelige dosen*. Faktumet i `RCPSYCH.langvarig` sier «av dosen», og reglene regner prosent av dosen pasienten bruker nå. For det første trinnet er det det samme. Vortioksetinregelen v11 er bare godkjent for én første reduksjon, og sertralin → mirtazapin v9 sammenligner tiden, ikke prosenten. Mener du at faktumet bør presiseres ved neste regelversjon, eller er det dekket av fagkontrollen 29.–30.10?
4. **Avslutning.** Skal funnene avsluttes med en faglig beslutning som viser til denne rapporten og PR-en for nytt grunnlag, når du har godkjent den? Prøvefunn 3 holdes utenfor og avsluttes som prøve etter planen.

## 7. Slik etterprøves rapporten

- Funnene: les `public.kildefunn` (nr. 1–5) og `public.kildeovervaking_kjoringer` (nr. 1–3), eller vinduet Kildeovervåking i Adminmeny. Kjøring 3 er GitHub Actions-kjøring 41401463529.
- Kontrollsummene: hent hver adresse to ganger med `hentDokument` og beregn `kontrollsummer`. PMC gir ny kontrollsum av siden hver gang, men samme synlige tekst. RCPsych gir samme kontrollsum innenfor noen minutter.
- Henvisningene: `godkjenteRegler()` og `henvisninger(regel)`, filtrert på kildene `keks-2016` og `rcpsych-stopping`.
- Rettelser: Europe PMC REST, `search?query=PMCID:PMC4919171&resultType=core`, feltet `commentCorrectionList`.
