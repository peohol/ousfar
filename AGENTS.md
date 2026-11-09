# Agentinstruks – peohol/ousfar

Denne filen er den **faste inngangen for ChatGPTs arbeid med repoet**, særlig når Peder åpner en ny samtale og ber om PR-kontroll. For Claude Code gjelder dessuten CLAUDE.md.

## Hvilket prosjekt eier PR-en?

Tre prosjekter, OUSFAR Dev, OUSFAR Fag og OUSFAR Verktøy, arbeider mot repoet, hvert i både ChatGPT og Claude Code. [Prosjektansvar](docs/prosjektansvar.md) er felles fasit for hva hvert av dem eier, og prosjektinstruksene står i [prosjektinstrukser.md](docs/prosjektinstrukser.md). Hver PR har nøyaktig én etikett, `ansvar:dev`, `ansvar:fag` eller `ansvar:verktoy`, og bare ChatGPT-prosjektet som eier etiketten, kontrollerer og slår den sammen:

- **«Se over alle åpne PR-er», «sjekk igjen» og lignende** gjelder bare PR-ene med etiketten til prosjektet samtalen ligger i.
- **En PR uten gyldig prosjektetikett** får ikke ordinær kontroll og slås ikke sammen før eierskapet er avklart.
- **En konkret PR med et annet prosjekts etikett:** si hvilket prosjekt den tilhører, og gjør ikke en parallell kontroll. Sammenhenger og avhengigheter kan likevel drøftes.

## ChatGPT: PR-gjennomgang

**Før du kontrollerer eller merger en PR:** Les [fast PR-kontrollstandard](docs/chatgpt-pr-kontrollstandard.md) og følg den sammen med skills://github-pr-review og de seneste uttrykkelige brukerbeslutningene. Undersøk oppdatert GitHub-tilstand, relevant diff, kode, tester, kildegrunnlag, historikk, CI og de faktiske brukerforløpene.

**Tre obligatoriske vurderinger ut over teknisk kvalitet:**

1. **Produktformål:** Er dette faktisk det brukeren opprinnelig ønsket å få laget, eller bare en teknisk fungerende, men annerledes løsning?
2. **Brukbarhet:** Får en vanlig kliniker gjort en relevant oppgave, med en komplett og klinisk forsvarlig plan eller en konkret, forståelig begrunnelse for at den ikke kan lages?
3. **Informasjonsmengde:** Må brukeren se eller besvare alt som står på skjermen, eller bør det fjernes, forenkles eller flyttes til frivillig faglig detaljvisning? Bevar nødvendige sikkerhetsopplysninger.

Ikke godkjenn et sentralt brukerforløp utelukkende fordi CI er grønn, en medisinsk strategi *kan* forsvares, eller skjerm og kopi er identiske. **Kontroller også at strategien svarer til bestillingen, og at begge bygger på en uavhengig klinisk korrekt fasit.**

## Styrende verktøydokumenter (OUSFAR Verktøy)

- [Aktuell produktrevisjons- og utbedringsplan](docs/verktøy-produktrevisjon-2026-11.md) – påviste feil, rekkefølge, produktkrav, ansvar, sluttkontroll.
- [Klinisk leveranseplan](docs/verktøy-klinisk-leveranseplan-2026-11.md) – K0–K5 og kliniske godkjenninger.
- [Brukervennlighetsplan](docs/verktøy-brukervennlighet-2026-11.md) – tidligere UX-arbeid.
- [K5-D-plan](docs/verktøy-k5-dosefleksible-forlop.md) – utsatt fram til dokumentert startport.
- [Rettighetsavklaring](docs/verktøy-p3-rettigheter.md) – selvstendig klinisk kildearbeid; ikke kopier eller systematisk overfør Psychiatrienets beskyttede anbefalinger.

**Fast arbeidsdeling:** Claude gjennomfører implementering og egne tester, og slår aldri sammen PR-er. ChatGPT skal være en reelt uavhengig kontrollør av kode, medisinsk innhold **og sluttbrukerverdi**, ikke en bekreftende gjennomleser av Claudes beskrivelse, og slår sammen det som er godkjent i eget prosjekt (docs/prosjektansvar.md §3). Peder skal ikke måtte gjøre teknisk feilsøking eller lange skjema-/regresjonstester som agentene kan utføre. Nye kliniske regler krever eksakt godkjenning; ordinær klinikertilgang må besluttes særskilt.

Opprett ikke nye automatiske PR-kontroller når Peder har avsluttet slik oppfølging. Vurder en PR bare når brukeren ber om det eller det inngår i en uttrykkelig aktiv kontrolljobb.
