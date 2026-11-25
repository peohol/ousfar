# Opprydding av gamle grener

Trådene i Claude kan ikke slette grener i GitHub, og GitHub sletter selv bare
grenen til en PR som slås sammen. Uten en opprydding blir derfor grener fra
lukkede PR-er, grener som er pushet til igjen etter en sammenslåing, og grener
med feil navn stående for alltid (sak #580).

Det er tre oppryddinger, og hver gren hører til nøyaktig én:

| Grener | Ryddes av | Regler |
| --- | --- | --- |
| `kuratorjobb/…` med gyldig navn | «Rydd ferdige kuratorjobbgrener», hver time | [kuratorjobber.md](kuratorjobber.md), «Automatisk opprydding av jobbgrener» |
| `kurateringsko/okt/…` med gyldig navn | Kurateringskøen, hver time | [kurateringsko.md](kurateringsko.md), `okt_slettes_etter_dager` |
| Alle andre, unntatt hovedgrenen og `kurateringsko/tilstand` | «Rydd gamle grener», hver time | Under |

## Rydd gamle grener

Arbeidsflyten `.github/workflows/rydd-grener.yml` går hver time fra `main`,
kan startes for hånd (med «kun vis» for en forhåndsvisning uten sletting), og
starter også når reglene endres på `main`. Reglene står i
`src/grenrydding/regler.ts`, kjøringen i `src/grenrydding/kjoring.ts`, med
tester i `src/__tests__/grenrydding.test.ts`. Den bruker bare GitHubs egen
nøkkel.

Reglene, i rekkefølge:

| Gren | Hva skjer |
| --- | --- |
| Hovedgrenen, `kurateringsko/tilstand`, gyldige jobb- og øktgrener | Røres aldri; de andre oppryddingene eier dem |
| Beskyttet i GitHub, eller en åpen PR kommer fra den | Beholdes, uansett alder |
| Ingen commits utover `main` | Slettes med en gang |
| Alt grenen endrer, står likt på `main` (hver fil med samme innhold, og det den fjerner, borte) | Slettes med en gang |
| Navnet ligner en jobb- eller øktgren uten å følge mønsteret (som `kurateringsko-okt-…` eller `kuratorjobb-…`) | Slettes ett døgn etter den siste commiten |
| Den siste PR-en fra grenen er slått sammen eller lukket | Slettes tre døgn etter den siste commiten eller etter at PR-en ble avsluttet, det som kom sist |
| Ingen PR ennå | Beholdes: det kan være arbeid som pågår. Etter 30 døgn uten commits vises en advarsel |

Fristene står i `GRENFRISTER`, i timer. En gren fra en PR kan gjenopprettes
fra PR-siden i GitHub («Restore branch»), og commitene i PR-en står der
uansett.

**Stopp ved usikkerhet:** Alt leses før noe slettes. Kan grenene, PR-ene eller
en sammenligning ikke leses, stopper kjøringen uten å slette noe og feiler
synlig. Gir GitHub ikke hele fillisten for en gren (over 300 filer) eller
hele filtreet på `main`, regnes grenen ikke som lik `main`. En gren som er
endret mens kjøringen pågikk, slettes ikke.

**Oversikten:** Hver kjøring skriver en tabell i oppsummeringen i GitHub
Actions med hver gren den vurderte, om den er slettet eller beholdt, og
hvorfor.
