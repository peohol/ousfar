# OUSFAR Verktøy – P3: kildegrunnlag fra Psychiatrienet

<!-- Laget av `npm run verktoy:kildeimport -- rapport` fra kildearkivet. Ikke rediger for hånd; hent på nytt eller endre kartleggingen og lag rapporten på nytt. -->

Hva som er hentet fra Psychiatrienets tre switchtabeller, hva som mangler, og
hvorfor. Grunnlaget er kildearkivet `src/data/verktoy/psychiatrienet-kildearkiv.json`
og identitetskartleggingen fra P1. Oppføringene er **kildeoppføringer, ikke
faglig godkjente regler**; ingen regel er laget eller endret (P4).

Arkivet har **ingen anbefalingstekst**, bare adresse, revisjon, tidspunkt,
kontrollsum og fakta om hver side (`docs/verktøy-p3-rettigheter.md`). Teksten
leses på kilden; kontrollsummen viser om den er den samme som da den ble hentet.

## Uttrekk

| Uttrekk | Startet | Ferdig | Leserversjon |
| --- | --- | --- | --- |
| 1 | 27.10.2026 kl. 20:01 UTC | 27.10.2026 kl. 20:09 UTC | 1 |

Rapporten gjelder uttrekk 1.

| Tabell | Revisjon | Lagret hos kilden | Kontrollsum (SHA-256 av tabellen) |
| --- | --- | --- | --- |
| [Combining Moodstabilizers](https://psychiatrienet.nl/switchtabel/show?id=CombiningMoodstabilizers) | 10184 | 09.03.2024 | `aefa7029ca6cf2bd…` |
| [Switching Antidepressants](https://psychiatrienet.nl/switchtabel/show?id=SwitchAntidepressants) | 10673 | 15.04.2026 | `e00d9452e05198df…` |
| [Switching Antipsychotics](https://psychiatrienet.nl/switchtabel/show?id=SwitchAntipsychotics) | 10641 | 29.01.2026 | `173f09d9cf92e353…` |

**Endringer siden forrige uttrekk:** første uttrekk.

## Sammendrag

- **1044 anbefalinger** som kildeoppføringer: 1041 hentet, 2 hentet fra kildens egen side på en annen adresse, 1 ikke tilgjengelig.
- Bytter: 911, tillegg (Combining Moodstabilizers): 110, Stop: 23.
- Gruppebaserte (Rest AP, Partial agonist): 76. Delt med andre celler: 54, på 1 side.
- Med depot- eller MA-formulering på minst én side: 221.
- 1 celle lenker til en undertabell; anbefalingene står i cellene der og er talt med over.
- 68 oppføringer har minst ett kjent kildeproblem (se under).
- Utelatt etter beslutning: 49 celler for johannesurt og 23 i Start-kolonnen. Sidene deres er ikke hentet.

## Dekning per tabell

Alle celler i hver tabell, etter status. Lenket = hentet + annen adresse +
ikke tilgjengelig + undertabell.

|  | Combining Moodstabilizers | Switching Antidepressants | Switching Antipsychotics |
| --- | --- | --- | --- |
| Celler (alle kombinasjoner) | 121 | 624 | 529 |
| ✓ Hentet | 110 | 526 | 399 |
| ↪ Hentet fra kildens egen side på en annen adresse | 0 | 2 | 0 |
| ✗ Lenket, men ikke tilgjengelig | 0 | 1 | 0 |
| ▦ Lenker til en undertabell (anbefalingene står i den) | 0 | 0 | 1 |
| — Ingen anbefaling i kilden («—») | 0 | 0 | 109 |
| · Samme rad og kolonne, uten lenke | 11 | 23 | 20 |
| ⊘ Ekskludert (johannesurt) | 0 | 49 | 0 |
| ○ Ikke importert (Start) | 0 | 23 | 0 |
| ? Ukjent kode, ikke kartlagt | 0 | 0 | 0 |
| **Anbefalinger (oppføringer)** | **110** | **529** | **405** |
| Gruppebaserte | 0 | 0 | 76 |
| Delt med andre celler | 0 | 0 | 54 |
| Med kjent kildeproblem | 6 | 3 | 59 |

## Alle kombinasjoner

Rad → kolonne (fra → til; i Combining Moodstabilizers eksisterende → legges
til). ✓ hentet, ↪ hentet fra kildens egen side på en annen adresse, ✗ lenket, men ikke tilgjengelig, ▦ lenker til en undertabell (anbefalingene står i den), — ingen anbefaling i kilden («—»), · samme rad og kolonne, uten lenke, ⊘ ekskludert (johannesurt), ○ ikke importert (start), ? ukjent kode, ikke kartlagt. «!» betyr at oppføringen har et kjent kildeproblem.

### Combining Moodstabilizers

|  | Ar | Ca | Ga | La | Li | To | Va | Rd | Ol | Qu | Zi |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Ar** | · | ✓ | ✓ | ✓! | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | ✓! |
| **Ca** | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ga** | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **La** | ✓! | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Li** | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **To** | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Va** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ |
| **Rd** | ✓! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ |
| **Ol** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ |
| **Qu** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ |
| **Zi** | ✓! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · |

### Switching Antidepressants

|  | Start | Ag | At | Bu | Ci | Cl | Ds | Dx | Du | Es | Fe | Fo | Fv | Hy | Im | Ma | Mz | Mo | No | Pa | Se | Tc | Td | Ve | Vo | Stop |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Ag** | ○ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **At** | ○ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Bu** | ○ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ci** | ○ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Cl** | ○ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ds** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dx** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ↪! |
| **Du** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Es** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Fe** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗! |
| **Fo** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Fv** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Hy** | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ | ⊘ |
| **Im** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Ma** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Mz** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Mo** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **No** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Pa** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Se** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Tc** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ |
| **Td** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ |
| **Ve** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ |
| **Vo** | ○ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ⊘ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ↪! |

### Switching Antipsychotics

|  | Am | Cp | Hp | Lu | Ol | Pp | Pa | Pf | Pi | Qu | Rd | Sd | Sr | RA | Da | Di | Df | Dh | Do | Dp | Dr | Dz | Mz |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Am** | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Cp** | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Hp** | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | ✓ | — | — | — | — | ✓! |
| **Lu** | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Ol** | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | ✓ | — | — | — | ✓ |
| **Pp** | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | ✓! | ✓ | — | ✓ |
| **Pa** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | — | — | — | — | — | — | — | ✓ |
| **Pf** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Pi** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Qu** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Rd** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓! | — | — | — | — | — | ✓! | ✓ | — | ✓ |
| **Sd** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **Sr** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓! | — | — | — | — | — | — | — | — | ✓ |
| **RA** | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | — | ✓! | ✓! | — | — | — | — | ✓! | ✓! |
| **Da** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Di** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Df** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| **Dh** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ | ✓! |
| **Do** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | ✓ | ✓ | · | ✓ | ✓ | ✓ | ✓ |
| **Dp** | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓ | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓! | ✓ | ✓ | ✓ | ✓ | ✓ | ▦ | ✓! | ✓ | ✓! |
| **Dr** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | · | ✓ | ✓ |
| **Dz** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | · | ✓ |
| **Mz** | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓! | — | — | — | — | — | — | — | ✓ | · |

### Undertabell: Switching Antipsychotics Dp → Dp (`/switchdetail/paliperidone-er-paliperidone-er`)

Lp = Paliperidone LP, Sp = Paliperidone SP, Up = Paliperidone UP.

|  | Lp | Sp | Up |
| --- | --- | --- | --- |
| **Lp** | · | ✓ | ✓ |
| **Sp** | ✓ | · | ✓ |
| **Up** | ✓ | ✓ | · |

## Stop-kolonnen (Switching Antidepressants)

| Kode | Kildens navn | Status | Kildeside |
| --- | --- | --- | --- |
| Ag | agomelatine | Hentet | `/switchdetail/stop-agomelatine` |
| At | amitriptyline | Hentet | `/switchdetail/stop-amitriptyline` |
| Bu | bupropion | Hentet | `/switchdetail/stop-bupropion` |
| Ci | citalopram | Hentet | `/switchdetail/stop-citalopram` |
| Cl | clomipramine | Hentet | `/switchdetail/stop-clomipramine` |
| Ds | dosulepine | Hentet | `/switchdetail/stop-dosulepine` |
| Dx | doxepine | Hentet fra kildens egen side på en annen adresse | `/switchdetail/stop-doxepin` |
| Du | duloxetine | Hentet | `/switchdetail/stop-duloxetine` |
| Es | escitalopram | Hentet | `/switchdetail/stop-escitalopram` |
| Fe | fenelzine | Lenket, men ikke tilgjengelig | `/switchdetail/stop-fenelzine` svarer ikke |
| Fo | fluoxetine | Hentet | `/switchdetail/stop-fluoxetine` |
| Fv | fluvoxamine | Hentet | `/switchdetail/stop-fluvoxamine` |
| Hy | hypericum | Ekskludert (johannesurt) | – |
| Im | imipramine | Hentet | `/switchdetail/stop-imipramine` |
| Ma | maprotiline | Hentet | `/switchdetail/stop-maprotiline` |
| Mz | mirtazapine | Hentet | `/switchdetail/stop-mirtazapine` |
| Mo | moclobemide | Hentet | `/switchdetail/stop-moclobemide` |
| No | nortriptyline | Hentet | `/switchdetail/stop-nortriptyline` |
| Pa | paroxetine | Hentet | `/switchdetail/stop-paroxetine` |
| Se | sertraline | Hentet | `/switchdetail/stop-sertraline` |
| Tc | tranylcypromine | Hentet | `/switchdetail/stop-tranylcypromine` |
| Td | trazodone | Hentet | `/switchdetail/stop-trazodone` |
| Ve | venlafaxine | Hentet | `/switchdetail/stop-venlafaxine` |
| Vo | vortioxetine | Hentet fra kildens egen side på en annen adresse | `/switchdetail/stop-vortioxetine` |

## Kjente kildeproblemer

Gruppert per problem. Ingen av dem er rettet eller tolket bort; de må vurderes
faglig i P4.

- Siden oppgir lamotrigine → aripiprazole, tabellen Aripiprazole → Lamotrigine. (1: Combining Moodstabilizers: Aripiprazole → Lamotrigine)
- Siden oppgir risperidone → aripiprazole, tabellen Aripiprazole → Risperidone. (1: Combining Moodstabilizers: Aripiprazole → Risperidone)
- Siden oppgir ziprasidone → aripiprazole, tabellen Aripiprazole → Ziprasidone. (1: Combining Moodstabilizers: Aripiprazole → Ziprasidone)
- Siden oppgir aripiprazole → lamotrigine, tabellen Lamotrigine → Aripiprazole. (1: Combining Moodstabilizers: Lamotrigine → Aripiprazole)
- Siden oppgir aripiprazole → risperidone, tabellen Risperidone → Aripiprazole. (1: Combining Moodstabilizers: Risperidone → Aripiprazole)
- Siden oppgir aripiprazole → ziprasidone, tabellen Ziprasidone → Aripiprazole. (1: Combining Moodstabilizers: Ziprasidone → Aripiprazole)
- Tabellen lenker til /switchdetail/stop-doxepine, som svarer 404; hentet fra kildens egen side /switchdetail/stop-doxepin. (1: Switching Antidepressants: doxepine → Stop)
- Tabellen lenker til /switchdetail/stop-fenelzine, som svarer 404. Ingen annen adresse finnes; anbefalingen er ikke tilgjengelig. (1: Switching Antidepressants: fenelzine → Stop)
- Tabellen lenker til /switchdetail/stop, som svarer 404; hentet fra kildens egen side /switchdetail/stop-vortioxetine. (1: Switching Antidepressants: vortioxetine → Stop)
- Faktaboksen «Rest anti-psychotics» på siden har andre medlemmer enn Rest AP i tabellen: mangler Fluphenazine, Promazine, Ziprasidone; har i tillegg Paliperidone. (24: Switching Antipsychotics: Amisulpride → Rest AP; Switching Antipsychotics: Haloperidol → Rest AP; Switching Antipsychotics: Lurasidone → Rest AP; Switching Antipsychotics: Olanzapine → Rest AP; Switching Antipsychotics: Pimozide → Rest AP; Switching Antipsychotics: Quetiapine → Rest AP …)
- Faktaboksen «Rest anti-psychotics» på siden har andre medlemmer enn Rest AP i tabellen: mangler Fluphenazine, Promazine. (17: Switching Antipsychotics: Clozapine → Rest AP; Switching Antipsychotics: Paliperidone → Rest AP; Switching Antipsychotics: Partial agonist → Rest AP; Switching Antipsychotics: Penfluridol → Rest AP; Switching Antipsychotics: Rest AP → Paliperidone; Switching Antipsychotics: Rest AP → Partial agonist …)
- Samme anbefalingstekst som /switchdetail/haloperidol-la-zuclopenthixol-ma. (1: Switching Antipsychotics: Haloperidol → Zuclopenthixol_MA)
- Siden oppgir Paliperidone → Paliperidone_LA, tabellen Paliperidone → Paliperidone_ER. (1: Switching Antipsychotics: Paliperidone → Paliperidone_ER)
- Siden oppgir Risperidone → Paliperidone_LA, tabellen Risperidone → Paliperidone_ER. (1: Switching Antipsychotics: Risperidone → Paliperidone_ER)
- Samme anbefalingstekst som /switchdetail/haloperidol-zuclopenthixol-ma. (1: Switching Antipsychotics: Haloperidol_LA → Zuclopenthixol_MA)
- Siden oppgir Haloperidol → Zuclopenthixol_MA, tabellen Haloperidol_LA → Zuclopenthixol_MA. (1: Switching Antipsychotics: Haloperidol_LA → Zuclopenthixol_MA)
- Siden oppgir Paliperidone LA → Amisulpride, tabellen Paliperidone_ER → Amisulpride. (1: Switching Antipsychotics: Paliperidone_ER → Amisulpride)
- Siden oppgir Paliperidone_LA → Clozapine, tabellen Paliperidone_ER → Clozapine. (1: Switching Antipsychotics: Paliperidone_ER → Clozapine)
- Siden oppgir Paliperidone LA → Haloperidol, tabellen Paliperidone_ER → Haloperidol. (1: Switching Antipsychotics: Paliperidone_ER → Haloperidol)
- Siden oppgir Paliperidone LA → Lurasidone, tabellen Paliperidone_ER → Lurasidone. (1: Switching Antipsychotics: Paliperidone_ER → Lurasidone)
- Siden oppgir Paliperidone LA → Olanzapine, tabellen Paliperidone_ER → Olanzapine. (1: Switching Antipsychotics: Paliperidone_ER → Olanzapine)
- Siden oppgir Paliperidone LA → Paliperidone, tabellen Paliperidone_ER → Paliperidone. (1: Switching Antipsychotics: Paliperidone_ER → Paliperidone)
- Siden oppgir Paliperidone LA → Penfluridol, tabellen Paliperidone_ER → Penfluridol. (1: Switching Antipsychotics: Paliperidone_ER → Penfluridol)
- Siden oppgir Paliperidone LA → Pimozide, tabellen Paliperidone_ER → Pimozide. (1: Switching Antipsychotics: Paliperidone_ER → Pimozide)
- Siden oppgir Paliperidone LA → Quetiapine, tabellen Paliperidone_ER → Quetiapine. (1: Switching Antipsychotics: Paliperidone_ER → Quetiapine)
- Siden oppgir Paliperidone LA → Risperidone, tabellen Paliperidone_ER → Risperidone. (1: Switching Antipsychotics: Paliperidone_ER → Risperidone)
- Siden oppgir Paliperidone LA → Sertindole, tabellen Paliperidone_ER → Sertindole. (1: Switching Antipsychotics: Paliperidone_ER → Sertindole)
- Siden oppgir Paliperidone LA → Sulpiride, tabellen Paliperidone_ER → Sulpiride. (1: Switching Antipsychotics: Paliperidone_ER → Sulpiride)
- Siden oppgir Paliperidone LA → Rest AP, tabellen Paliperidone_ER → Rest AP. (1: Switching Antipsychotics: Paliperidone_ER → Rest AP)
- Siden oppgir Paliperidone LA → Risperidone LA, tabellen Paliperidone_ER → Risperidone_LA. (1: Switching Antipsychotics: Paliperidone_ER → Risperidone_LA)
- Siden oppgir Paliperidone LA → Zuclopenthixol MA, tabellen Paliperidone_ER → Zuclopenthixol_MA. (1: Switching Antipsychotics: Paliperidone_ER → Zuclopenthixol_MA)
- Siden oppgir Risperidone LA → Paliperidone LA, tabellen Risperidone_LA → Paliperidone_ER. (1: Switching Antipsychotics: Risperidone_LA → Paliperidone_ER)

## Sider som deles av flere celler

- `/switchdetail/depot-depot`: 54 celler (Aripiprazole_LA → Flupenthixol_LA, Aripiprazole_LA → Fluphenazine_LA, Aripiprazole_LA → Haloperidol_LA, Aripiprazole_LA → Olanzapine_LA …)

## Hva arkivet har for hver side

Adressen, svaret (status og eventuell videresending), tidspunktet den ble
hentet, MediaWiki-revisjonen og når kilden lagret den, kontrollsummen av hele
innholdet og av selve anbefalingen (SHA-256 av normalisert tekst), hva siden
selv sier at den gjelder («from … to …», «Adding …», «Stop …»),
overskriftene på avsnittene, navnene i faktaboksene (med gruppemedlemmer), og
undertabellen når siden har en. Ikke anbefalingsteksten, referansene eller
annen tekst fra siden.
