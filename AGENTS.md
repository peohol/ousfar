# Agentinstruks – peohol/ousfar

Denne filen er den **faste inngangen for ChatGPTs arbeid med repoet**, særlig når Peder åpner en ny samtale og ber om PR-kontroll. For Claude Code gjelder dessuten CLAUDE.md.

## ChatGPT: PR-gjennomgang

**Før du kontrollerer eller merger en PR:** Les [fast PR-kontrollstandard](docs/chatgpt-pr-kontrollstandard.md) og følg den sammen med skills://github-pr-review og de seneste uttrykkelige brukerbeslutningene. Undersøk oppdatert GitHub-tilstand, relevant diff, kode, tester, kildegrunnlag, historikk, CI og de faktiske brukerforløpene.

**Tre obligatoriske vurderinger ut over teknisk kvalitet:**

1. **Produktformål:** Er dette faktisk det brukeren opprinnelig ønsket å få laget, eller bare en teknisk fungerende, men annerledes løsning?
2. **Brukbarhet:** Får en vanlig kliniker gjort en relevant oppgave, med en komplett og klinisk forsvarlig plan eller en konkret, forståelig begrunnelse for at den ikke kan lages?
3. **Informasjonsmengde:** Må brukeren se eller besvare alt som står på skjermen, eller bør det fjernes, forenkles eller flyttes til frivillig faglig detaljvisning? Bevar nødvendige sikkerhetsopplysninger.

Ikke godkjenn et sentralt brukerforløp utelukkende fordi CI er grønn, en medisinsk strategi *kan* forsvares, eller skjerm og kopi er identiske. **Kontroller også at strategien svarer til bestillingen, og at begge bygger på en uavhengig klinisk korrekt fasit.**

## Styrende verktøydokumenter

- [Aktuell produktrevisjons- og utbedringsplan](docs/verktøy-produktrevisjon-2026-11.md) – påviste feil, rekkefølge, produktkrav, ansvar, sluttkontroll.
- [Klinisk leveranseplan](docs/verktøy-klinisk-leveranseplan-2026-11.md) – K0–K5 og kliniske godkjenninger.
- [Brukervennlighetsplan](docs/verktøy-brukervennlighet-2026-11.md) – tidligere UX-arbeid.
- [K5-D-plan](docs/verktøy-k5-dosefleksible-forlop.md) – utsatt fram til dokumentert startport.
- [Rettighetsavklaring](docs/verktøy-p3-rettigheter.md) – selvstendig klinisk kildearbeid; ikke kopier eller systematisk overfør Psychiatrienets beskyttede anbefalinger.

**Fast arbeidsdeling:** Claude gjennomfører implementering og egne tester. ChatGPT skal være en reelt uavhengig kontrollør av kode, medisinsk innhold **og sluttbrukerverdi**, ikke en bekreftende gjennomleser av Claudes beskrivelse. Peder skal ikke måtte gjøre teknisk feilsøking eller lange skjema-/regresjonstester som agentene kan utføre. Nye kliniske regler krever eksakt godkjenning; ordinær klinikertilgang må besluttes særskilt.

Opprett ikke nye automatiske PR-kontroller når Peder har avsluttet slik oppfølging. Vurder en PR bare når brukeren ber om det eller det inngår i en uttrykkelig aktiv kontrolljobb.
