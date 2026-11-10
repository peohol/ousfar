# Prosjektansvar i OUSFAR

**Felles fasit for hvem som eier hvilke oppgaver og PR-er** i de seks
prosjektene som arbeider mot `peohol/ousfar`: OUSFAR Dev, OUSFAR Fag og OUSFAR
Verktøy, hvert av dem både i Claude Code Projects og i ChatGPT. Prosjektinstruksene
som limes inn i prosjektinnstillingene, står i
[prosjektinstrukser.md](prosjektinstrukser.md) og peker hit; detaljreglene står
bare her.

Dokumentet avgjør eierskap, overlevering og PR-kontroll. Det endrer ingen faglige
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

## 2. Formålet avgjør, ikke filene

Prosjektet som eier en oppgave, er prosjektet som eier **formålet** med den,
uansett hvilke filer endringen berører. En endring i planvisningen til
nedtrappingsverktøyet tilhører Verktøy, også om den endrer felles CSS. Felles
filer som endringsloggen, `package.json` og stilarkene gir ikke eierskap.

Krever løsningen også en **selvstendig** endring av noe felles, som
designsystemet, en felles komponent eller databasen, skilles den delen normalt ut
som en egen oppgave til prosjektet som eier den (§4).

## 3. Arbeidsdelingen

| Hvem | Gjør | Gjør ikke |
| --- | --- | --- |
| **Claude Code** | Implementering og det meste av det tekniske arbeidet: kode, tester, dokumentasjon, migrasjoner, etiketter og GitHub-operasjoner. Merker PR-en «Til ChatGPT-kontroll – ikke merge», oppgir HEAD-SHA og kjørte kontroller, og retter konkrete funn fra ChatGPT uten å vente | Slår aldri sammen PR-er. Kontrollerer ikke PR-er fra andre prosjekter |
| **ChatGPT** | Drøfting, vurdering, planlegging og uavhengig kontroll av PR-er fra Claude etter [PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md). Slår sammen (squash) PR-er med sitt eget prosjekts etikett når de er godkjent | Implementerer ikke i repoet og committer ikke direkte til `main`. Kontrollerer eller slår ikke sammen PR-er fra andre prosjekter |
| **Peder** | Bestemmer mål og prioritering, tar de kliniske og faglige avgjørelsene bare et menneske kan ta, gir eksplisitt ja der et styrende dokument krever det, og gjør korte aksepttester | Gjør ikke tekniske operasjoner, videreformidler ikke tekniske meldinger mellom prosjekter og koordinerer ikke tråder |

Krever et styrende dokument Peders ja før sammenslåing (for eksempel en
destruktiv migrasjon etter `supabase/AGENTS.md`, nøklene i OUSFAR Fag eller en ny klinisk
regel), slår ChatGPT ikke sammen PR-en før det ja-et er gitt.

I OUSFAR Fag er ChatGPTs PR-kontroll en kontroll av selve PR-en. Den
**erstatter ikke** den uavhengige blindkontrollen av faginnholdet, som Kontrolløren
gjør etter [kuratering-prosjekt.md](kuratering-prosjekt.md). Faglige vurderinger
av et stoff hører ikke hjemme i GitHub, som er offentlig.

## 4. Nye oppgaver og overlevering

**Én eier per oppgave.** Før Claude begynner på en oppgave:

1. Avgjør eieren etter formålet (§1–2). Hører oppgaven til et annet prosjekt, sier
   Claude det i én setning med navnet på riktig prosjekt, overleverer den (under)
   og begynner ikke selv.
2. Før større utviklingsoppgaver: les åpne Issues og PR-er som kan gjelde det samme
   problemet. Arbeider en annen tråd eller et annet prosjekt alt med det, lages
   ingen konkurrerende implementering; arbeidet fortsetter der, eller deles etter
   punkt 3.
3. Berører oppgaven flere prosjekter, deles den som hovedregel i avgrensede
   oppgaver, én per eier, med avhengighetene skrevet ned i hver av dem (i issuet
   eller i PR-beskrivelsen under «Avhengigheter»). Er en oppdeling ikke
   hensiktsmessig, avklares én hovedansvarlig før implementeringen starter, og
   PR-en får den hovedansvarliges etikett.

**Overlevering.** Prosjektene kan ikke sende meldinger til hverandre, og Peder
skal ikke formidle tekniske meldinger. Derfor overleveres en oppgave som et GitHub
Issue med mottakerens etikett (`ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`):
hva som trengs og hvorfor, avhengigheter og lenker. Den som overleverer, gir Peder
én setning: «Dette hører til OUSFAR X; jeg har laget issue #N.» Peder åpner da
bare det prosjektet og ber det ta issuet. Nye Issues får prosjektetikett fra
starten.

**Feil eier oppdaget underveis.** Viser det seg at en åpen PR hører til et annet
prosjekt, flyttes etiketten til riktig prosjekt, og det prosjektet overtar både
videre arbeid og kontroll; det første prosjektet stopper sitt. Kontroll og
sammenslåing venter til flyttingen er gjort.

Det er fortsatt fritt å diskutere sammenhenger og avhengigheter mellom
prosjektene. Reglene gjelder eierskap og kontroll, ikke nødvendig
informasjonsutveksling.

## 5. PR-er: merking, kontroll og sammenslåing

1. **Nøyaktig én prosjektetikett** på hver PR, også dokumentasjonsendringer og
   små feilrettinger: `ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`. Claude
   setter den når PR-en opprettes, etter formålet.
2. **PR-beskrivelsen** følger malen (`.github/pull_request_template.md`): ansvarlig
   prosjekt, avhengigheter til andre oppgaver eller PR-er, og mulige virkninger
   utenfor prosjektets ansvarsområde.
3. **Den automatiske kontrollen** «Prosjektansvar»
   (`.github/workflows/prosjektansvar.yml`) består bare med nøyaktig én gyldig
   etikett, feiler med en kort forklaring ellers, og kjøres på nytt når etiketter
   legges til eller fjernes. Regelsettet «Prosjektansvar» på `main` gjør den
   påkrevd før sammenslåing. Den kontrollerer bare merkingen, ikke om PR-en hører
   til riktig prosjekt; det vurderer ChatGPT.
4. **Kontroll:** bare ChatGPT-prosjektet som eier etiketten, kontrollerer og slår
   sammen PR-en, etter [PR-kontrollstandarden](chatgpt-pr-kontrollstandard.md).
   Har PR-en virkninger utenfor eget område (som felles CSS), kontrollerer det
   samme prosjektet også dem. Et annet prosjekt kan bli orientert, men gjør ingen
   parallell kontroll.
5. **Uten gyldig etikett** får PR-en ingen ordinær kontroll og slås ikke sammen
   før eierskapet er avklart.
6. **Versjon og endringslogg:** hver PR har nøyaktig én føring etter
   [endringslogg.md](endringslogg.md), uansett prosjekt (unntatt en stille
   designjustering). Kommer en annen PR først og tar versjonsnummeret, nummererer
   tråden som eier PR-en om sin egen føring når den oppdaterer grenen.

## 6. Felles regler for alle tre prosjektene

- `AGENTS.md`, med tilleggene i undermappenes `AGENTS.md`, gjelder for alle agenter i alle prosjektene.
- Automatiserte nettleserkontroller kjøres i det lokale testmiljøet, aldri som
  omfattende kjøringer mot den publiserte appen ([qa-testmiljo.md](qa-testmiljo.md)).
- Produksjonsmigrasjoner rulles ut etter [migrasjoner.md](migrasjoner.md).
- Repoet er offentlig: ingen pasientopplysninger, nøkler eller faglige
  vurderinger av stoffer fra kurateringen.
- Ingen nye koordinatorer, godkjenningsledd eller automatiske kontrollrunder uten
  at Peder ber om det.

## 7. Kort sagt

- Ett prosjekt eier hver oppgave og hver PR, etter formålet.
- Etiketten sier hvilket prosjekt; bare det prosjektets ChatGPT kontrollerer og
  slår sammen.
- «Se over alle åpne PR-er» betyr de med eget prosjekts etikett.
- Hører noe til et annet prosjekt: si hvilket, overlever med et issue, og la det
  være.
