# Personalkalenderen: valgt design og arbeidsflyt

Vedtatt av Peder 27.11.2026 etter utprøving av de tre forslagene i
[peohol/vaktplan#18](https://github.com/peohol/vaktplan/pull/18) og
drøfting med ChatGPT. Dette er den detaljerte produktspesifikasjonen for B1,
B17–B19 i [personal.md](personal.md). Den erstatter motstridende detaljer i
prototypens v0.11 og de tre designforslagene. Øvrige regler, personvern,
rollegrenser, fasiter og akseptkrav står. Akseptmatrisen er
[personal-akseptmatrise.md](personal-akseptmatrise.md).

## 1. Retning og leveranser

Én samlet, klikkbar prototype: forsiden fra B, resten fra A, med endringene
nedenfor. Ikke bygg tre nye alternativer. Revider den åpne prototype-PR-en
#18 fremfor å starte konkurrerende arbeid. Bevar eksisterende fungerende
domene og prototypens kontroller, men tilpass dem til de nye vedtakene.
Forhåndsvisningen er beskyttet og bruker utelukkende syntetiske data.
P1 er ferdig når den samlede prototypen er prøvd og akseptert; valg av
retning er allerede avgjort. P2a kan fortsette parallelt med P1, koordinert
mot de nye domenereglene; P3–P5 følger avhengighetene i personal.md §8.11.
Ingen aktivering med reelle data før §3.4 og P7.

## 2. Felles regler og utseende

- **Svært kort, enkel tekst** (Peder 27.11.2026): ingen innledning når
  valget sier seg selv; knappen sier hva som skjer; under et valg står bare
  én konsekvens, eller hvorfor valget ikke går.
- **Samme mekanismer i dag, uke, måned og helår** (Peder 27.11.2026): slipp,
  valgbobler, statusbobler, forklaringer, datoetiketter og slippmål er
  felles, så samme handling oppfører seg likt i alle visninger.
- Slå sammen statusene Fri og Ferie til **Ferie**, med solikon. Ferie betyr
  faktisk ferie, også ulønnet ferie, og gir automatisk vaktfritak.
  Ordinære arbeidsfrie dager ved deltid registreres som Borte uten fritak;
  Avspasering og Ønske om fri beholdes. Ikke gi gammel Fri automatisk
  tilbakevirkende fritak: historiske registreringer og regelversjoner bevarer
  betydningen sin; nye syntetiske startdata bruker den nye katalogen. Ingen
  reell import/migrering er godkjent.
- Bruk Til stede, ikke På kontoret. Pilotens visningsgrupper er Til stede,
  Jobber et annet sted og Fraværende. Gruppetilhørighet, fysisk
  tilstedeværelse, fritak, fremhevede oppgaver og
  bemanningsbehov er konfigurasjon per fagmiljø (ledig for ny vakt er
  fortsatt bare den uten status, personal.md §7.2); ikke utled beregninger fra
  tekstetiketter eller visningsfilter. Forskning/undervisning kan ha annen
  gruppetilhørighet andre steder. Ingen status = planlagt til stede på
  arbeidsdager, ikke faktisk oppmøte.
- Ingen animasjon av statusikoner ved hovering. Bruk felles OUSFAR-ikoner,
  fargetokens, knapper og rullefelt (jf. #608, ikke egen konkurrerende
  fellesløsning). Dato-navigasjon bruker samme stil for begge piler overalt.
- Vis ikke toast for ordinære vellykkede statusendringer; kalenderens
  umiddelbare endring og Angre/Gjør om er tilstrekkelig. Behold tydelig
  tilbakemelding ved feil, konflikt, udekket vakt eller viktig konsekvens
  og ved publisering/tilbaketrekking; ikke kø opp mange like meldinger.
- Snakkeboblens pil ligger utenfor selve boblen både over og under
  ankeret. Ingen scrollbar forårsaket av pilspissen; begrens og rull bare
  det indre innholdet når nødvendig. Tilgjengelig på tastatur og berøring.
- Statusboblen dekker aldri cellen den hører til. Den velger side (over
  eller under) én gang når den åpnes, og pilen bytter ikke side og peker
  fortsatt på cellen når innholdet vokser; får ikke alt plass, ruller
  innholdet. «Merknad» åpner merknadsfeltet og «Hele dagen» øverst, rett
  under verktøylinjen og over statusgruppene, synlig i visningsområdet,
  og merknadsfeltet får fokus (Peder 27.11.2026). Når innholdet ruller,
  står toppen med navn, profilbilde og dato fast øverst i boblen. Pilen
  tegnes bare som sin ytre halvdel, så innhold som ruller under den ikke
  danner en rute (Peder 27.11.2026).
- Korte forklaringer på knapper og ikoner (f.eks. «Legg til status») vises
  som en liten snakkeboble over elementet, med en gang ved hover eller
  tastaturfokus, aldri som nettleserens forsinkede title-tekst. Ingen
  forklaring mens noe dras, og ingen der den bare ville gjentatt navnet,
  heller ikke på tomme Til stede-celler (Peder 27.11.2026).
- Alle flater fungerer på PC og mobil, i lyst og mørkt tema, med tastatur
  og berøring; ingen dekorative statusanimasjoner; presisjonsmarkøren ved flytting beholdes.

## 3. Forsiden (B)

- Ren leseflate for alle roller. Vis dato med like forrige/neste-knapper
  på hver side, f.eks. «← Lørdag 28. november →». Begge piler bruker
  stilen til B sin forrige-knapp; ingen separat overskrift «Dagen i dag».
  «I kalenderen» er en ordinær knapp med samme stil som «Åpne fortolkning»
  i OUSFAR, og er adskilt fra datopilene.
- Vakt 1, Vakt 2 og Referent i kompakte, tydelige kort øverst. Hvilke
  oppgaver som fremheves er konfigurerbart; Referent er fortsatt manuell.
  Den operative dekningen vises korrekt, og «Ikke publisert» må aldri
  se ut som «Udekket». Ingen kladd eller foreslått vakt, heller ikke for
  VPA/admin. Medarbeidere vises én gang; ikke gjenta de fremhevede.
- Alle navn i medarbeiderkort har profilbilde (initialer som reserve).
  Bruk kun eksisterende tillatt OUSFAR-profilbilde for aktive medlemmer
  innenfor samme fagmiljø, ikke kopier eller lagre en ekstra bildedatabase.
  I demo/testmiljø brukes bare oppdiktede avatarer/initialer. Se §3.4 før
  reell bruk.
- **Til stede:** grupper etter stilling; alfabetisk navn innen hver
  stillingsgruppe. Til stede uten fremhevet oppgave inkluderer f.eks.
  Opplæring. Vis relevante statuser når de finnes.
- **Jobber et annet sted:** Hjemmekontor, Forskning, Undervisning i piloten.
  **Fraværende:** Borte, Ferie, Avspasering, Ønske om fri. Begge gruppene
  viser alfabetisk sorterte personer med status på egen linje under navnet,
  ikke egne overskrifter per status.
- Ingen redigering, klikkhandling eller generell hover-effekt på
  medarbeiderkort, uansett rolle. Bare der det finnes merknad: en
  informasjonsboble med status og merknad ved hovering/fokus/berøring.
  «I kalenderen» åpner valgt dato i dagsvisningen. Mine vakter viser bare
  egne publiserte/operative oppgaver. «Alle mine vakter» er en vanlig knapp
  med kant og pil etter teksten, i samme stil som de andre knappene, ikke en
  tekstlenke (Peder 27.11.2026).

## 4. Kalenderen (A)

### Felles

- Bruk den retningsstyrte, roterende presisjonsmarkøren fra vaktplan#5.
  På mobil ligger pilspissen synlig foran/over fingeren (prøv 30–40 px,
  juster etter praktisk test og skjermkant). Det visuelt angitte målet og
  faktisk slippmål må være det samme, også ved automatisk rulling.
  Markering av mål med mer enn bare farge. Bevar langt trykk, vanlig
  berøringsrulling, tastaturalternativ og Escape. Den vanlige musepekeren
  skjules mens noe dras med presisjonsmarkøren (Peder 27.11.2026).
- Det dratte kortet beholder form og innhold, med delvis gjennomsiktig
  bakgrunn og backdrop-blur ca. 3 px (justerbar designverdi).
- Forklarende tekst under dra-og-slipp vises bare når slippet **ikke** er
  mulig: som en snakkeboble over målet (feltet man forsøker å slippe på),
  med «Ikke mulig» og årsaken. Ingen tekst følger pekeren, heller ikke
  «Flytt hit» eller «Samme sted» (Peder 27.11.2026).
- Til stede er en **virtuell** draggable, bare på dager personen er aktiv
  og planlagt til stede uten registrert status; subtil halvtransparent
  kontur uten fyll. Ikke lagre en ekstra status. Når en tom tilstede-celle
  slippes på en celle med status, er det et uttrykkelig bytte: den
  eksisterende statusen flyttes tilbake til kilden, målet blir uten status.
  Vis resultatet og krev samme kvalifikasjoner/rettigheter som ved
  ordinært bytte. Tom til tom gjør ingenting. Ingen skjult sletting.
- Et bytte mellom to helt like statuser (samme status, merknad, tid og lås,
  samme dag eller hos samme person), også Til stede mot Til stede,
  og et slipp på samme sted gjør ingenting: målet markeres ikke, og ingen
  tekst eller advarsel vises (Peder 27.11.2026). Vaktfritak teller ikke i
  sammenligningen: det følger aldri en flytting og er skjult for andre enn
  lokal administrator, så utfallet er det samme for alle roller.
- Fremhev og Alle medarbeidere: fest Nullstill, Vis alle og Skjul alle
  øverst i menyene; listen kan rulles separat. Filtre endrer aldri dekning
  eller fordelingsgrunnlag.
- Symmetriske forrige/neste-piler. Vis/skjul Helg (i dagsvisning kan teksten
  være Helg og helligdager), med åpent/lukket øye, i alle fire visninger.
  Skjult filter hopper over helger og helligdager i dagsnavigasjon og
  skjuler dem i perioder; kan vises igjen. Arbeidsdag og bemanningskrav
  følger fagmiljøets regler også i helger og helligdager; filteret styrer
  bare visning. Fagmiljø kan ha annen standard.
- Marker faktisk udekket behov tydelig (f.eks. rød datooverskrift og
  tilgjengelig tekst). Skill upublisert fra udekket. Planleggerens
  kladdvisning kan markere konflikt/hull, operativ visning gjør ikke
  skjulte kladdvakter til falske hull. Marker dagens dato og inneværende
  uke langt tydeligere, også i høy kontrast.
- I dag (og T) åpner/ruller/fokuserer **selve datoen**, ikke bare perioden;
  vis dagen om den ellers skjules. I helår ligger dagens celle synlig til
  høyre for fast navnekolonne. Bevar valgt medarbeiderrad der mulig.

### Dag

- Datooverskrift inkluderer år. Fjern separate Vakt 1/Vakt 2-kort over
  personlisten; vis tildelingene i listen.
- To kategoriseringsvalg med lagret preferanse per bruker og fagmiljø:
  stilling (sorter alfabetisk eller etter status), eller tilstedeværelse
  (samme tre grupper som på forsiden, sorter alfabetisk, etter stilling
  eller etter status). Bruk alfabetisk navn ved lik sorteringsverdi, stabil
  stillings-/statusrekkefølge fra konfigurasjon. Vis merknad og tid direkte.
- Dagsnavigasjon med helger og helligdager tilgjengelig; gyldig status og
  dekning følger arbeids- og bemanningskalenderen, ikke ukedagen hardkodet.

### Uke

- Tittel «Uke 53» (ISO-uke), med måned på hver datooverskrift, f.eks.
  «Man 28 des» og «Fre 1 jan» ved årsskiftet. Tilgjengelig full dato.
- Medarbeidere i rader og dager i kolonner som A; dagens kolonne og
  inneværende uke fremheves.

### Måned

- Klikk på datotallet åpner dagsvisningen for datoen; klikk på ukenummeret
  åpner den ISO-uken. Plussknapp horisontalt midtstilt på datolinjen når
  datocellen har hover/fokus (synlig/tilgjengelig med berøring). Kort snakkeboble
  «Legg til status»; åpner person-/statusvalg for datoen, ikke navigasjon.
- Hver status/person er ett kompakt kort som akkurat omslutter ikon og
  navn. Også ved flere med samme status har hver sitt ikon og navn som
  samlet draggable og egen informasjonsboble. Prøv responsivt to indre
  kolonner når plassen tillater det; ikke press navn/treffflater for små.
- Slipp på en annen dato betyr å **flytte personen med statusen til ny
  dato**, ikke å velge en ny medarbeider. Ingen personvelger mellom slipp
  og bekreftelse. Flytt merknad, tid og eventuell lås sammen med posten,
  aldri administrativt fritak. Dersom måldagen har samme vakttype hos
  en annen og behovet er fullt, vis konkrete, gyldige alternativer
  «Bytt vaktdager», «Overta vakten» og «Avbryt». Bytt = de to personenes
  vakter bytter dato; overta = kildens person tar vakten på måldatoen,
  kildedatoen blir udekket og måldatoens tidligere vakt fjernes. Vis også
  eventuelle andre statuser som må erstattes, og hvilke plasser blir
  udekket; ingen tredje tildeling forsvinner lydløst. Boblen er kort
  (Peder 27.11.2026): ingen tekst øverst, bare valgene. «Bytt vaktdager»
  uten forklaring under. «Tobias overtar vakten til Jonas» (fornavn, med
  etternavnsinitial bare når de to har samme fornavn), med «Noen andre må
  overta vakten til Tobias.» under. Deretter Avbryt. Ellers står det under
  et valg bare hvorfor det ikke går, eller hvilke statuser som erstattes. For oppgave med flere
  plasser: velg konkret motpart kun når nødvendig for et faktisk bytte,
  aldri hvem som skal motta den dratte statusen. Konflikt på kildens
  person/måldato håndteres eksplisitt. Begge datocellene og alle berørte
  poster valideres atomisk med kvalifikasjon, gyldighet, lås,
  rolle og versjon. Én Angre. Eksempel med syntetiske A/B:
  A Vakt 1 mandag, B Vakt 1 torsdag → ved bytte B mandag og A torsdag;
  ved overtakelse ingen mandag og A torsdag. Avbryt: ingen endring.
  Merknader følger respektive vakt, ikke bare teksten mellom personer.
- Slipp rett på en annens status er et forsøk på å bytte de to statusene
  (Peder 27.11.2026); slipp ellers på en dato flytter personen med statusen.
- Slippet tolkes likt i dag, uke, måned og helår (Peder 27.11.2026). Et
  slipp på egen rad en annen dag, eller rett på en annens samme vakt en
  annen dag, der vakten er tatt, gir de samme valgene som i måneden
  («Bytt vaktdager» / «X overtar vakten til Y»); det erstatter den tidligere
  avvisningen i uke og helår. Et slipp i en tredje persons tomme celle der
  vakten er tatt, avvises fortsatt med årsak; ingen vakt overtas lydløst.

### Helår

- Helg/helligdag-filter og I dag som over. Hurtigknapper for måneder som
  i den eksisterende v0.11-prototypen.
- ISO-ukenummer venstrejustert i én celle som dekker alle viste dager i
  uken (segmenter ved nødvendige tabellgrenser viser riktig ukenummer);
  tydeligere ukegrenser, også med helg skjult. Måneden markeres bare med en
  kort strek i månedsoverskriften der måneden begynner, ikke med loddrette
  linjer nedover i rutenettet (Peder 27.11.2026). Markering av inneværende
  uke og dagens dato. Månedens sticky overskrift stanser nøyaktig til
  høyre for navnekolonnen, ikke bak den.
- Klikk måned/uke/dag i overskriftene navigerer til tilsvarende visning
  og dato. Dagnummer skal ikke åpne statusredigering.
- Statuskort med avrundede hjørner inni cellen, som v0.11, også under
  dragging. Kandidater i kladden har stiplet ramme (og tilgjengelig
  tekst); operative vakter har ikke kladdmerking.
- Celler der personen er til stede uten status, ser tomme ut. Den stiplede
  Til stede-konturen vises bare ved hover, tastaturfokus og når cellen er
  slippmål; cellen kan fortsatt dras fra (Peder 27.11.2026).
- Fast navnekolonne har jevn liten padding og er bare så bred som
  nødvendig. Vis fornavn; ved like fornavn etternavnsinitial, og
  tilstrekkelig videre disambiguering hvis også initial er lik. Fullt
  navn tilgjengelig ved fokus/berøring/hovering. Bevar historiske rader,
  effektiv tegning og presist slipp ved vannrett rulling.

## 5. Vaktfordeling: forslag direkte til publisering

Vedtatt arbeidsflyt (erstatter «Lag forslag → Godta → Publiser → Publiser»):

1. VPA/admin velger periode og modus **Oppdater** (behold gyldige vakter,
   fyll hull med færrest mulige endringer) eller **Fordel på nytt**
   (omfordel ulåste vakter innenfor perioden). Eksisterende låser,
   kvalifikasjoner, historiske fasiter og fordelingsmål står. Endringer i
   allerede publisert plan må tillates uttrykkelig; standard er av.
2. **Lag forslag** oppretter én aktiv, delt kladd per fagmiljø. VPA/admin
   kan straks se og justere forslagets vakter i kalenderen, merket med
   stiplet ramme. Ikke endre operativ plan. Vis tydelig hva kladden
   erstatter, også fjernede tildelinger, uten å dobbeltregistrere dem.
   Manuell vaktredigering innen forslagets tidsrom gjøres i kladden;
   vanlige kollegers egne statuser og øvrige operative registreringer
   er ikke en del av kladden. Kladdens arbeidsflyt, statistikk og
   angre/gjør om holdes atskilt fra operativ kalender.
3. VPA/admin kan fortsette å justere eller oppdatere kladden; endringer i
   status, medlemskap, regler, historikk mv. kontrolleres løpende etter
   §8.7, K-KLA-1–5. Konfliktkandidat beholdes som konflikt, teller ikke
   i dekning, og publisering er blokkert. Endret beregningsgrunnlag
   varsles og oppdateres/bekreftes gjennom gyldig ny vurdering; foreldet
   grunnlag må aldri godtas lydløst. Ingen lekkasje av administrativt
   fritak i metadata, forklaringer eller statistikk.
4. **Publiser forslag** godtar og publiserer gjeldende manuelt justerte
   forslag i én atomisk serverkommando. Ingen separat Godta eller ny
   publiseringsdialog. Faktisk udekkede behov kan publiseres etter tydelig
   advarsel/bekreftelse; ugyldige kandidater kan ikke. Vis før/etter og
   antall i samme tidsrom; serveren validerer versjoner, medlemskap,
   låser, kvalifikasjoner, planperiode og rettigheter på nytt. Operativ
   plan vises for alle berettigede medlemmer først etter commit.
5. **Avbryt** forkaster bare den aktive kladden med alle dens
   manuelle vaktjusteringer; gjeldende publisert plan, medarbeideres
   egne statuser, historikk og endringer utenfor kladden står. Ingen
   generell tilbakestilling av kalenderens tilstand. Avbryt/reberegning
   må ikke lydløst overskrive en annen planleggers nyere arbeid.
6. **Trekk tilbake siste publisering** i 24 timer fra serverens
   publiseringstidspunkt: gjenopprett forrige operative plan i berørt
   omfang, ikke fjern alle publiserte vakter. Ny validert, atomisk
   endring; ingen omskriving av avviklede vaktdager. Ved senere
   relevante endringer eller konflikt som gjør sikker gjenoppretting
   umulig, avvis hele tilbaketrekkingen med kort forklaring og tilby
   manuell korrigering. Ikke overskriv ferie/status, nyere vaktendringer
   eller annen historikk. Ingen tilbaketrekking av eldre publisering
   eller etter 24 timer. Respekter medlemskap og rolle på nytt.
   Revider egne påminnelser og varsle berørte etter deres valg (B7/B10),
   som ved ordinære publiserte endringer. Bevar nødvendig revisjonsspor
   uten å forskuttere oppbevaringstiden i §3.4.

For manuelle vakter før det finnes et automatisk forslag opprettes/utvides
kladden i det upubliserte tidsrommet; når det finnes én aktiv kladd, må et
nytt periodevalg ikke lydløst forkaste den. VPA kan fremdeles korrigere
en publisert vakt manuelt utenfor kladdarbeidet gjennom eksisterende
atomiske kommando, uten egen bekreftelsesdialog («Endre publisert
vaktplan?»): vaktplanansvarlig forstår at endringen er operativ, den gjelder
med en gang og kan angres (Peder 27.11.2026). En vakt på
en publisert dag inngår i kladden bare når forslaget uttrykkelig tillater
endringer i publisert plan (punkt 1); ellers er en manuell endring der en
slik operativ korrigering. Dette er
ikke en ny generell publiseringsflyt. Vanlige kolleger ser aldri kladden,
heller ikke via Dagen i dag, Mine vakter, varsler, statistikk eller API.

## 6. Kontroll

Bruk de nye og reviderte A-ID-ene i akseptmatrisen og K-ID-ene i personal.md.
Prøv hele arbeidsforløpet med syntetiske medarbeidere: rollebytte,
fortid/publisert egen vakt, dags-/ukes-/måneds-/årsnavigasjon, like fornavn,
helg/helligdag i to ulike fagmiljøer, DnD med tom kilde, fullt bemanningsbehov,
to faktiske byttede datoer med merknader, avbryt og angre, rulling/berøring,
forslag → manuell endring → publisering eller avbryt, kollegas egen status
som kolliderer med kladd, samtidig endring, 24-timersgrense og trygg
tilbaketrekking. Kontroller negativt at den vanlige leseflaten aldri viser
kladd, administrativt fritak eller andre fagmiljøers data. Test også
visning med og uten profilbilde, merknad, forskjellige stillinger, bred og
smal skjerm, lyst og mørkt tema. P1 kan simulere serversvar; faktisk
serverkontroll og samtidighet kreves i OUSFAR før produktaksept.
