<!-- Den fulle rapporten fra sluttkontrollen (#505), laget av src/__tests__/qa/ytelse.ts med YTELSE_FOR satt til rådataene fra utgangspunktet (docs/ytelse-maling-utgangspunkt.md). Rådataene ligger i prosjektmappa (ytelse/etter-2026-11-20). -->

# Ytelsesmåling 2026-11-20 18:52 UTC

Miljø: `{"kode":"91e23444","appkode":"lik origin/main","cpu":"Intel(R) Xeon(R) Processor @ 2.10GHz","kjerner":4,"minneGB":16,"node":"v22.23.5","postgres":"17.11","work_mem":"4MB","gjentakelser":5,"profiler":["rask","treg"]}`

Datagrunnlag per personmengde: `{"50":{"profiler":53,"syntetiske_personer":50,"aktive_medlemskap":54,"avsluttede_medlemskap":11,"inviterte_medlemskap":1,"lokale_administratorer":3,"direktemeldinger_pa":21,"blokkeringer":3,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"500":{"profiler":503,"syntetiske_personer":500,"aktive_medlemskap":518,"avsluttede_medlemskap":100,"inviterte_medlemskap":10,"lokale_administratorer":12,"direktemeldinger_pa":201,"blokkeringer":30,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"5000":{"profiler":5003,"syntetiske_personer":5000,"aktive_medlemskap":5153,"avsluttede_medlemskap":1000,"inviterte_medlemskap":100,"lokale_administratorer":102,"direktemeldinger_pa":2001,"blokkeringer":300,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79}}`

## Før og etter: utgangspunktet (docs/ytelse-maling-utgangspunkt.md) mot denne målingen

Miljøet før: `{"kode":"22af4ec9","appkode":"lik origin/main","cpu":"Intel(R) Xeon(R) Processor @ 2.10GHz","kjerner":4,"minneGB":16,"node":"v22.23.5","postgres":"17.11","work_mem":"4MB","gjentakelser":5,"profiler":["rask","treg"]}`. Datagrunnlaget før: `{"50":{"profiler":53,"syntetiske_personer":50,"aktive_medlemskap":54,"avsluttede_medlemskap":11,"inviterte_medlemskap":1,"lokale_administratorer":3,"direktemeldinger_pa":21,"blokkeringer":3,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"500":{"profiler":503,"syntetiske_personer":500,"aktive_medlemskap":518,"avsluttede_medlemskap":100,"inviterte_medlemskap":10,"lokale_administratorer":12,"direktemeldinger_pa":201,"blokkeringer":30,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"5000":{"profiler":5003,"syntetiske_personer":5000,"aktive_medlemskap":5153,"avsluttede_medlemskap":1000,"inviterte_medlemskap":100,"lokale_administratorer":102,"direktemeldinger_pa":2001,"blokkeringer":300,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79}}`.

| Scenario · profil · personer · merke | Median | p95 | API-kall innen (median) | JS utpakket innen (median) |
| --- | --- | --- | --- | --- |
| kald · rask · 500 · skall | 679 ms → 408 ms (−40 %) | 748 ms → 545 ms (−27 %) | 27 → 24 (−11 %) | 2464 kB → 1019 kB (−59 %) |
| kald · rask · 500 · forside | 679 ms → 408 ms (−40 %) | 748 ms → 545 ms (−27 %) | 27 → 24 (−11 %) | 2464 kB → 1019 kB (−59 %) |
| kald · rask · 500 · forside_tittel | 801 ms → 544 ms (−32 %) | 878 ms → 618 ms (−30 %) | 27 → 27 (±0 %) | 2464 kB → 1019 kB (−59 %) |
| kald · rask · 500 · fagsok_svar | 1792 ms → 686 ms (−62 %) | 1901 ms → 1106 ms (−42 %) | 45 → 27 (−40 %) | 2464 kB → 1019 kB (−59 %) |
| kald · rask · 500 · forside_paneler | 1051 ms → 817 ms (−22 %) | 1339 ms → 1128 ms (−16 %) | 41 → 31 (−24 %) | 2464 kB → 1019 kB (−59 %) |
| varm · rask · 500 · skall | 454 ms → 175 ms (−61 %) | 515 ms → 240 ms (−53 %) | 26 → 26 (±0 %) | 2918 kB → 1474 kB (−49 %) |
| varm · rask · 500 · forside | 454 ms → 175 ms (−61 %) | 515 ms → 240 ms (−53 %) | 26 → 26 (±0 %) | 2918 kB → 1474 kB (−49 %) |
| varm · rask · 500 · forside_tittel | 588 ms → 206 ms (−65 %) | 684 ms → 371 ms (−46 %) | 29 → 26 (−10 %) | 2918 kB → 1474 kB (−49 %) |
| varm · rask · 500 · fagsok_svar | 1055 ms → 948 ms (−10 %) | 1165 ms → 1165 ms (±0 %) | 40 → 30 (−25 %) | 2918 kB → 1474 kB (−49 %) |
| varm · rask · 500 · forside_paneler | 1024 ms → 498 ms (−51 %) | 1124 ms → 569 ms (−49 %) | 40 → 26 (−35 %) | 2918 kB → 1474 kB (−49 %) |
| fagside · rask · 500 · fagside_navn | 55 ms → 64 ms (+16 %) | 73 ms → 100 ms (+37 %) | 6 → 3 (−50 %) | 0 kB → 45 kB |
| fagside · rask · 500 · fagside_innhold | 139 ms → 162 ms (+16 %) | 157 ms → 203 ms (+29 %) | 6 → 7 (+17 %) | 129 kB → 174 kB (+35 %) |
| fagside · rask · 500 · fagside_komplett | 139 ms → 290 ms (+109 %) | 157 ms → 343 ms (+118 %) | 6 → 8 (+33 %) | 129 kB → 174 kB (+35 %) |
| fagside · rask · 500 · referanser med nytt nummer | 31 → 0 (−100 %) | 31 → 0 (−100 %) |  |  |
| direkte · rask · 500 · skall | 442 ms → 220 ms (−50 %) | 458 ms → 303 ms (−34 %) | 29 → 24 (−17 %) | 2918 kB → 1776 kB (−39 %) |
| direkte · rask · 500 · fagside_navn | 679 ms → 373 ms (−45 %) | 708 ms → 450 ms (−36 %) | 38 → 25 (−34 %) | 3047 kB → 1776 kB (−42 %) |
| direkte · rask · 500 · fagside_innhold | 708 ms → 450 ms (−36 %) | 716 ms → 482 ms (−33 %) | 38 → 27 (−29 %) | 3047 kB → 1776 kB (−42 %) |
| direkte · rask · 500 · fagside_komplett | 708 ms → 632 ms (−11 %) | 716 ms → 686 ms (−4 %) | 38 → 30 (−21 %) | 3047 kB → 1905 kB (−37 %) |
| direkte · rask · 500 · referanser med nytt nummer | 31 → 0 (−100 %) | 31 → 0 (−100 %) |  |  |
| fortolkning · rask · 500 · fortolkning | 85 ms → 129 ms (+50 %) | 107 ms → 186 ms (+74 %) | 0 → 0 | 0 kB → 0 kB |
| fortolkning · rask · 500 · fortolkning_treff | 119 ms → 204 ms (+72 %) | 138 ms → 251 ms (+82 %) | 0 → 0 | 0 kB → 0 kB |
| fagmiljobytte · rask · 500 · forside_tittel | 112 ms → 288 ms (+156 %) | 132 ms → 337 ms (+155 %) | 1 → 20 (+1900 %) | 0 kB → 0 kB |
| fagmiljobytte · rask · 500 · forside_paneler | 398 ms → 339 ms (−15 %) | 409 ms → 417 ms (+2 %) | 42 → 20 (−52 %) | 0 kB → 0 kB |
| kald · treg · 500 · skall | 2798 ms → 1514 ms (−46 %) | 2917 ms → 1638 ms (−44 %) | 39 → 27 (−31 %) | 2464 kB → 1019 kB (−59 %) |
| kald · treg · 500 · forside | 2798 ms → 1514 ms (−46 %) | 2917 ms → 1638 ms (−44 %) | 39 → 27 (−31 %) | 2464 kB → 1019 kB (−59 %) |
| kald · treg · 500 · forside_tittel | 2798 ms → 1514 ms (−46 %) | 2917 ms → 1638 ms (−44 %) | 39 → 27 (−31 %) | 2464 kB → 1019 kB (−59 %) |
| kald · treg · 500 · fagsok_svar | 13.3 s → 3005 ms (−77 %) | 13.6 s → 3607 ms (−73 %) | 44 → 30 (−32 %) | 2464 kB → 1019 kB (−59 %) |
| kald · treg · 500 · forside_paneler | 3641 ms → 2564 ms (−30 %) | 3830 ms → 2671 ms (−30 %) | 39 → 27 (−31 %) | 2464 kB → 1019 kB (−59 %) |
| varm · treg · 500 · skall | 1924 ms → 1013 ms (−47 %) | 2031 ms → 1094 ms (−46 %) | 38 → 26 (−32 %) | 0 kB → 1474 kB |
| varm · treg · 500 · forside | 1924 ms → 1013 ms (−47 %) | 2031 ms → 1094 ms (−46 %) | 38 → 26 (−32 %) | 0 kB → 1474 kB |
| varm · treg · 500 · forside_tittel | 1924 ms → 1013 ms (−47 %) | 2031 ms → 1094 ms (−46 %) | 38 → 26 (−32 %) | 0 kB → 1474 kB |
| varm · treg · 500 · fagsok_svar | 12.3 s → 3761 ms (−69 %) | 12.5 s → 4151 ms (−67 %) | 43 → 30 (−30 %) | 0 kB → 2106 kB |
| varm · treg · 500 · forside_paneler | 2888 ms → 2079 ms (−28 %) | 2986 ms → 2438 ms (−18 %) | 39 → 26 (−33 %) | 0 kB → 1474 kB |
| fagside · treg · 500 · fagside_navn | 577 ms → 323 ms (−44 %) | 843 ms → 822 ms (−2 %) | 6 → 3 (−50 %) | 129 kB → 45 kB (−65 %) |
| fagside · treg · 500 · fagside_innhold | 866 ms → 616 ms (−29 %) | 1135 ms → 1275 ms (+12 %) | 6 → 3 (−50 %) | 129 kB → 45 kB (−65 %) |
| fagside · treg · 500 · fagside_komplett | 866 ms → 1625 ms (+88 %) | 1135 ms → 2353 ms (+107 %) | 6 → 8 (+33 %) | 129 kB → 174 kB (+35 %) |
| fagside · treg · 500 · referanser med nytt nummer | 31 → 0 (−100 %) | 31 → 0 (−100 %) |  |  |
| direkte · treg · 500 · skall | 2107 ms → 961 ms (−54 %) | 2177 ms → 1126 ms (−48 %) | 37 → 21 (−43 %) | 0 kB → 2151 kB |
| direkte · treg · 500 · fagside_navn | 2680 ms → 1680 ms (−37 %) | 2812 ms → 1781 ms (−37 %) | 37 → 26 (−30 %) | 129 kB → 2280 kB (+1668 %) |
| direkte · treg · 500 · fagside_innhold | 2941 ms → 1926 ms (−35 %) | 2974 ms → 2082 ms (−30 %) | 37 → 26 (−30 %) | 129 kB → 2280 kB (+1668 %) |
| direkte · treg · 500 · fagside_komplett | 2941 ms → 3056 ms (+4 %) | 2974 ms → 3334 ms (+12 %) | 37 → 32 (−14 %) | 129 kB → 2280 kB (+1668 %) |
| direkte · treg · 500 · referanser med nytt nummer | 31 → 0 (−100 %) | 31 → 0 (−100 %) |  |  |
| fortolkning · treg · 500 · fortolkning | 725 ms → 320 ms (−56 %) | 941 ms → 463 ms (−51 %) | 0 → 0 | 0 kB → 0 kB |
| fortolkning · treg · 500 · fortolkning_treff | 893 ms → 447 ms (−50 %) | 1130 ms → 746 ms (−34 %) | 1 → 0 (−100 %) | 0 kB → 0 kB |
| fagmiljobytte · treg · 500 · forside_tittel | 412 ms → 904 ms (+119 %) | 1071 ms → 999 ms (−7 %) | 2 → 19 (+850 %) | 0 kB → 0 kB |
| fagmiljobytte · treg · 500 · forside_paneler | 1006 ms → 1044 ms (+4 %) | 1071 ms → 1151 ms (+8 %) | 11 → 19 (+73 %) | 0 kB → 0 kB |
| brukere · rask · 50 · brukere | 216 ms → 322 ms (+49 %) | 281 ms → 330 ms (+17 %) | 1 → 1 (±0 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · rask · 50 · svar | 319 ms → 275 ms (−14 %) | 325 ms → 295 ms (−9 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · rask · 50 · svar | 24 ms → 22 ms (−6 %) | 67 ms → 66 ms (−2 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · rask · 50 · svar | 327 ms → 288 ms (−12 %) | 372 ms → 294 ms (−21 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · rask · 50 · svar | 313 ms → 284 ms (−9 %) | 343 ms → 289 ms (−16 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · rask · 50 · svar | 317 ms → 278 ms (−12 %) | 328 ms → 283 ms (−14 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · rask · 50 · svar | 313 ms → 278 ms (−11 %) | 339 ms → 294 ms (−13 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · rask · 50 · svar | 268 ms → 270 ms (+1 %) | 274 ms → 279 ms (+2 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · rask · 50 · svar | 329 ms → 287 ms (−13 %) | 347 ms → 318 ms (−8 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · rask · 50 · svar | 298 ms → 276 ms (−8 %) | 303 ms → 293 ms (−3 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · rask · 50 · svar | 37 ms → 18 ms (−52 %) | 88 ms → 78 ms (−11 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · rask · 50 · svar | 303 ms → 280 ms (−7 %) | 319 ms → 289 ms (−9 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · rask · 50 · svar | 298 ms → 275 ms (−8 %) | 316 ms → 290 ms (−8 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · rask · 50 · svar | 293 ms → 283 ms (−3 %) | 310 ms → 285 ms (−8 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · rask · 50 · svar | 294 ms → 270 ms (−8 %) | 321 ms → 277 ms (−14 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · rask · 50 · svar | 268 ms → 268 ms (±0 %) | 270 ms → 278 ms (+3 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · rask · 50 · svar | 325 ms → 286 ms (−12 %) | 341 ms → 320 ms (−6 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · rask · 50 · svar | 287 ms → 271 ms (−5 %) | 307 ms → 289 ms (−6 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · rask · 50 · svar | 5 ms → 15 ms (+198 %) | 31 ms → 29 ms (−8 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · rask · 50 · svar | 293 ms → 274 ms (−7 %) | 300 ms → 276 ms (−8 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · rask · 50 · svar | 284 ms → 273 ms (−4 %) | 298 ms → 277 ms (−7 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · rask · 50 · svar | 290 ms → 274 ms (−6 %) | 296 ms → 277 ms (−6 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · rask · 50 · svar | 292 ms → 268 ms (−8 %) | 296 ms → 278 ms (−6 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · rask · 50 · svar | 266 ms → 271 ms (+2 %) | 275 ms → 275 ms (±0 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · rask · 50 · svar | 288 ms → 280 ms (−3 %) | 301 ms → 285 ms (−6 %) | 1 → 1 (±0 %) |  |
| brukere · treg · 50 · brukere | 619 ms → 796 ms (+29 %) | 741 ms → 884 ms (+19 %) | 2 → 1 (−50 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · treg · 50 · svar | 376 ms → 383 ms (+2 %) | 380 ms → 396 ms (+4 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · treg · 50 · svar | 26 ms → 32 ms (+21 %) | 79 ms → 93 ms (+18 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · treg · 50 · svar | 375 ms → 394 ms (+5 %) | 382 ms → 416 ms (+9 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · treg · 50 · svar | 373 ms → 376 ms (+1 %) | 389 ms → 401 ms (+3 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · treg · 50 · svar | 376 ms → 378 ms (+1 %) | 388 ms → 391 ms (+1 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · treg · 50 · svar | 367 ms → 379 ms (+3 %) | 369 ms → 500 ms (+35 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · treg · 50 · svar | 286 ms → 309 ms (+8 %) | 298 ms → 373 ms (+25 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · treg · 50 · svar | 373 ms → 404 ms (+8 %) | 398 ms → 434 ms (+9 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · treg · 50 · svar | 358 ms → 362 ms (+1 %) | 360 ms → 591 ms (+64 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · treg · 50 · svar | 71 ms → 55 ms (−22 %) | 113 ms → 118 ms (+4 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · treg · 50 · svar | 377 ms → 390 ms (+4 %) | 378 ms → 398 ms (+5 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · treg · 50 · svar | 374 ms → 385 ms (+3 %) | 378 ms → 396 ms (+5 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · treg · 50 · svar | 381 ms → 394 ms (+3 %) | 390 ms → 438 ms (+13 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · treg · 50 · svar | 375 ms → 380 ms (+1 %) | 382 ms → 764 ms (+100 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · treg · 50 · svar | 293 ms → 300 ms (+3 %) | 300 ms → 319 ms (+6 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · treg · 50 · svar | 382 ms → 411 ms (+8 %) | 410 ms → 463 ms (+13 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · treg · 50 · svar | 356 ms → 370 ms (+4 %) | 384 ms → 388 ms (+1 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · treg · 50 · svar | 18 ms → 20 ms (+12 %) | 24 ms → 30 ms (+23 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · treg · 50 · svar | 368 ms → 374 ms (+1 %) | 375 ms → 376 ms (±0 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · treg · 50 · svar | 362 ms → 370 ms (+2 %) | 376 ms → 376 ms (±0 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · treg · 50 · svar | 359 ms → 372 ms (+4 %) | 1294 ms → 833 ms (−36 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · treg · 50 · svar | 364 ms → 376 ms (+3 %) | 376 ms → 425 ms (+13 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · treg · 50 · svar | 290 ms → 303 ms (+5 %) | 300 ms → 336 ms (+12 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · treg · 50 · svar | 362 ms → 371 ms (+2 %) | 380 ms → 379 ms (±0 %) | 1 → 1 (±0 %) |  |
| brukere · rask · 500 · brukere | 715 ms → 542 ms (−24 %) | 789 ms → 627 ms (−21 %) | 1 → 1 (±0 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · rask · 500 · svar | 666 ms → 311 ms (−53 %) | 720 ms → 328 ms (−54 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · rask · 500 · svar | 23 ms → 43 ms (+90 %) | 66 ms → 80 ms (+21 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · rask · 500 · svar | 800 ms → 325 ms (−59 %) | 862 ms → 366 ms (−58 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · rask · 500 · svar | 756 ms → 321 ms (−58 %) | 842 ms → 338 ms (−60 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · rask · 500 · svar | 742 ms → 319 ms (−57 %) | 794 ms → 332 ms (−58 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · rask · 500 · svar | 690 ms → 314 ms (−55 %) | 816 ms → 317 ms (−61 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · rask · 500 · svar | 273 ms → 271 ms (−1 %) | 277 ms → 279 ms (+1 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · rask · 500 · svar | 673 ms → 332 ms (−51 %) | 728 ms → 345 ms (−53 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · rask · 500 · svar | 497 ms → 287 ms (−42 %) | 504 ms → 289 ms (−43 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · rask · 500 · svar | 17 ms → 26 ms (+59 %) | 63 ms → 96 ms (+53 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · rask · 500 · svar | 533 ms → 299 ms (−44 %) | 634 ms → 301 ms (−53 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · rask · 500 · svar | 504 ms → 284 ms (−44 %) | 637 ms → 302 ms (−53 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · rask · 500 · svar | 534 ms → 293 ms (−45 %) | 635 ms → 299 ms (−53 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · rask · 500 · svar | 517 ms → 286 ms (−45 %) | 586 ms → 302 ms (−48 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · rask · 500 · svar | 276 ms → 283 ms (+3 %) | 282 ms → 291 ms (+3 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · rask · 500 · svar | 511 ms → 323 ms (−37 %) | 517 ms → 354 ms (−31 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · rask · 500 · svar | 436 ms → 287 ms (−34 %) | 444 ms → 301 ms (−32 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · rask · 500 · svar | 16 ms → 17 ms (+6 %) | 22 ms → 18 ms (−17 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · rask · 500 · svar | 505 ms → 294 ms (−42 %) | 560 ms → 315 ms (−44 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · rask · 500 · svar | 442 ms → 295 ms (−33 %) | 479 ms → 312 ms (−35 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · rask · 500 · svar | 476 ms → 283 ms (−40 %) | 508 ms → 291 ms (−43 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · rask · 500 · svar | 447 ms → 290 ms (−35 %) | 522 ms → 300 ms (−43 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · rask · 500 · svar | 264 ms → 272 ms (+3 %) | 268 ms → 277 ms (+3 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · rask · 500 · svar | 438 ms → 297 ms (−32 %) | 466 ms → 307 ms (−34 %) | 1 → 1 (±0 %) |  |
| brukere · treg · 500 · brukere | 1682 ms → 1627 ms (−3 %) | 1807 ms → 1773 ms (−2 %) | 2 → 1 (−50 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · treg · 500 · svar | 751 ms → 390 ms (−48 %) | 781 ms → 415 ms (−47 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · treg · 500 · svar | 25 ms → 51 ms (+100 %) | 107 ms → 117 ms (+9 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · treg · 500 · svar | 852 ms → 389 ms (−54 %) | 920 ms → 423 ms (−54 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · treg · 500 · svar | 802 ms → 385 ms (−52 %) | 2073 ms → 399 ms (−81 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · treg · 500 · svar | 830 ms → 371 ms (−55 %) | 859 ms → 380 ms (−56 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · treg · 500 · svar | 735 ms → 364 ms (−50 %) | 845 ms → 379 ms (−55 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · treg · 500 · svar | 298 ms → 307 ms (+3 %) | 302 ms → 315 ms (+4 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · treg · 500 · svar | 726 ms → 417 ms (−42 %) | 761 ms → 462 ms (−39 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · treg · 500 · svar | 513 ms → 375 ms (−27 %) | 576 ms → 390 ms (−32 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · treg · 500 · svar | 50 ms → 73 ms (+48 %) | 102 ms → 191 ms (+86 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · treg · 500 · svar | 645 ms → 444 ms (−31 %) | 715 ms → 508 ms (−29 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · treg · 500 · svar | 573 ms → 422 ms (−26 %) | 2098 ms → 464 ms (−78 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · treg · 500 · svar | 658 ms → 418 ms (−36 %) | 710 ms → 450 ms (−37 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · treg · 500 · svar | 559 ms → 451 ms (−19 %) | 646 ms → 488 ms (−24 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · treg · 500 · svar | 323 ms → 346 ms (+7 %) | 330 ms → 355 ms (+7 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · treg · 500 · svar | 607 ms → 456 ms (−25 %) | 673 ms → 520 ms (−23 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · treg · 500 · svar | 447 ms → 378 ms (−15 %) | 478 ms → 456 ms (−5 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · treg · 500 · svar | 22 ms → 21 ms (−4 %) | 33 ms → 46 ms (+40 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · treg · 500 · svar | 538 ms → 386 ms (−28 %) | 589 ms → 388 ms (−34 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · treg · 500 · svar | 459 ms → 382 ms (−17 %) | 501 ms → 387 ms (−23 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · treg · 500 · svar | 483 ms → 368 ms (−24 %) | 525 ms → 440 ms (−16 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · treg · 500 · svar | 460 ms → 360 ms (−22 %) | 497 ms → 387 ms (−22 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · treg · 500 · svar | 289 ms → 300 ms (+4 %) | 300 ms → 328 ms (+9 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · treg · 500 · svar | 462 ms → 362 ms (−22 %) | 508 ms → 388 ms (−24 %) | 1 → 1 (±0 %) |  |
| brukere · rask · 5000 · brukere | 5002 ms → 2506 ms (−50 %) | 5500 ms → 2593 ms (−53 %) | 1 → 1 (±0 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · rask · 5000 · svar | 4119 ms → 641 ms (−84 %) | 4308 ms → 678 ms (−84 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · rask · 5000 · svar | 16 ms → 44 ms (+177 %) | 55 ms → 67 ms (+22 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · rask · 5000 · svar | 5405 ms → 771 ms (−86 %) | 5688 ms → 857 ms (−85 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · rask · 5000 · svar | 4432 ms → 686 ms (−85 %) | 5085 ms → 815 ms (−84 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · rask · 5000 · svar | 4996 ms → 687 ms (−86 %) | 5150 ms → 720 ms (−86 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · rask · 5000 · svar | 4839 ms → 698 ms (−86 %) | 5393 ms → 756 ms (−86 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · rask · 5000 · svar | 265 ms → 271 ms (+2 %) | 272 ms → 277 ms (+2 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · rask · 5000 · svar | 4329 ms → 723 ms (−83 %) | 4606 ms → 760 ms (−83 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · rask · 5000 · svar | 2700 ms → 407 ms (−85 %) | 2936 ms → 604 ms (−79 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · rask · 5000 · svar | 12 ms → 16 ms (+26 %) | 79 ms → 67 ms (−15 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · rask · 5000 · svar | 2892 ms → 397 ms (−86 %) | 3322 ms → 418 ms (−87 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · rask · 5000 · svar | 2743 ms → 386 ms (−86 %) | 3063 ms → 428 ms (−86 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · rask · 5000 · svar | 2822 ms → 373 ms (−87 %) | 2856 ms → 392 ms (−86 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · rask · 5000 · svar | 2836 ms → 359 ms (−87 %) | 3126 ms → 405 ms (−87 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · rask · 5000 · svar | 283 ms → 286 ms (+1 %) | 288 ms → 290 ms (+1 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · rask · 5000 · svar | 2619 ms → 389 ms (−85 %) | 2697 ms → 450 ms (−83 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · rask · 5000 · svar | 1998 ms → 427 ms (−79 %) | 2024 ms → 441 ms (−78 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · rask · 5000 · svar | 13 ms → 15 ms (+22 %) | 26 ms → 19 ms (−26 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · rask · 5000 · svar | 2424 ms → 485 ms (−80 %) | 2571 ms → 547 ms (−79 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · rask · 5000 · svar | 1925 ms → 449 ms (−77 %) | 2360 ms → 510 ms (−78 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · rask · 5000 · svar | 2294 ms → 428 ms (−81 %) | 2406 ms → 484 ms (−80 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · rask · 5000 · svar | 2045 ms → 445 ms (−78 %) | 2330 ms → 501 ms (−79 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · rask · 5000 · svar | 267 ms → 271 ms (+2 %) | 270 ms → 276 ms (+2 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · rask · 5000 · svar | 2034 ms → 456 ms (−78 %) | 2100 ms → 488 ms (−77 %) | 1 → 1 (±0 %) |  |
| brukere · treg · 5000 · brukere | 7648 ms → 3980 ms (−48 %) | 7756 ms → 4145 ms (−47 %) | 2 → 1 (−50 %) | 0 kB → 14 kB |
| personsøk gruppeinvitasjon: første søk · treg · 5000 · svar | 4345 ms → 682 ms (−84 %) | 4415 ms → 694 ms (−84 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: gjentatt søk · treg · 5000 · svar | 40 ms → 26 ms (−35 %) | 87 ms → 83 ms (−4 %) | 0 → 0 |  |
| personsøk gruppeinvitasjon: skrivefeil · treg · 5000 · svar | 5482 ms → 787 ms (−86 %) | 6116 ms → 804 ms (−87 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: aksent · treg · 5000 · svar | 4643 ms → 770 ms (−83 %) | 5066 ms → 869 ms (−83 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: tomt treff · treg · 5000 · svar | 5056 ms → 768 ms (−85 %) | 5184 ms → 838 ms (−84 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: rask skriving · treg · 5000 · svar | 4382 ms → 710 ms (−84 %) | 5131 ms → 879 ms (−83 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: feil · treg · 5000 · svar | 289 ms → 297 ms (+3 %) | 300 ms → 320 ms (+7 %) | 1 → 1 (±0 %) |  |
| personsøk gruppeinvitasjon: sent svar på forrige søk · treg · 5000 · svar | 4372 ms → 770 ms (−82 %) | 4775 ms → 879 ms (−82 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: første søk · treg · 5000 · svar | 2877 ms → 391 ms (−86 %) | 3485 ms → 445 ms (−87 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: gjentatt søk · treg · 5000 · svar | 91 ms → 61 ms (−33 %) | 167 ms → 190 ms (+13 %) | 0 → 0 |  |
| personsøk medlemskandidater: skrivefeil · treg · 5000 · svar | 3270 ms → 500 ms (−85 %) | 3599 ms → 517 ms (−86 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: aksent · treg · 5000 · svar | 3083 ms → 480 ms (−84 %) | 3309 ms → 1066 ms (−68 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: tomt treff · treg · 5000 · svar | 3136 ms → 498 ms (−84 %) | 3373 ms → 564 ms (−83 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: rask skriving · treg · 5000 · svar | 3087 ms → 471 ms (−85 %) | 3170 ms → 575 ms (−82 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: feil · treg · 5000 · svar | 381 ms → 397 ms (+4 %) | 451 ms → 420 ms (−7 %) | 1 → 1 (±0 %) |  |
| personsøk medlemskandidater: sent svar på forrige søk · treg · 5000 · svar | 3138 ms → 525 ms (−83 %) | 3162 ms → 641 ms (−80 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: første søk · treg · 5000 · svar | 2202 ms → 438 ms (−80 %) | 2512 ms → 485 ms (−81 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: gjentatt søk · treg · 5000 · svar | 24 ms → 18 ms (−24 %) | 41 ms → 23 ms (−44 %) | 0 → 0 |  |
| personsøk direktemelding: skrivefeil · treg · 5000 · svar | 2597 ms → 503 ms (−81 %) | 2864 ms → 530 ms (−81 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: aksent · treg · 5000 · svar | 2134 ms → 453 ms (−79 %) | 2574 ms → 493 ms (−81 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: tomt treff · treg · 5000 · svar | 2421 ms → 441 ms (−82 %) | 2991 ms → 552 ms (−82 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: rask skriving · treg · 5000 · svar | 2439 ms → 451 ms (−82 %) | 3089 ms → 492 ms (−84 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: feil · treg · 5000 · svar | 289 ms → 304 ms (+5 %) | 298 ms → 324 ms (+9 %) | 1 → 1 (±0 %) |  |
| personsøk direktemelding: sent svar på forrige søk · treg · 5000 · svar | 2121 ms → 436 ms (−79 %) | 2437 ms → 527 ms (−78 %) | 1 → 1 (±0 %) |  |
| SQL sok_gruppekandidater · systemarkitekt · 50 · «nils johansen» | 50 ms → 14 ms (−72 %) | 53 ms → 18 ms (−66 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 50 · «johanssen» | 62 ms → 17 ms (−73 %) | 66 ms → 22 ms (−66 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 50 · «an» | 25 ms → 17 ms (−33 %) | 39 ms → 22 ms (−45 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 50 · «nils johansen» | 32 ms → 10 ms (−70 %) | 36 ms → 12 ms (−67 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 50 · «johanssen» | 40 ms → 11 ms (−72 %) | 42 ms → 12 ms (−71 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 50 · «an» | 27 ms → 13 ms (−51 %) | 28 ms → 18 ms (−36 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 50 · «nils johansen» | 26 ms → 12 ms (−55 %) | 29 ms → 16 ms (−45 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 50 · «johanssen» | 25 ms → 15 ms (−40 %) | 26 ms → 16 ms (−37 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 50 · «an» | 25 ms → 11 ms (−55 %) | 27 ms → 12 ms (−54 %) |  |  |
| SQL sok_direktemottakere · medlem · 50 · «nils johansen» | 22 ms → 10 ms (−53 %) | 34 ms → 19 ms (−43 %) |  |  |
| SQL sok_direktemottakere · medlem · 50 · «johanssen» | 26 ms → 12 ms (−53 %) | 27 ms → 15 ms (−45 %) |  |  |
| SQL sok_direktemottakere · medlem · 50 · «an» | 13 ms → 10 ms (−21 %) | 15 ms → 15 ms (±0 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 500 · «nils johansen» | 443 ms → 51 ms (−89 %) | 559 ms → 71 ms (−87 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 500 · «johanssen» | 600 ms → 66 ms (−89 %) | 643 ms → 70 ms (−89 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 500 · «an» | 195 ms → 57 ms (−71 %) | 206 ms → 66 ms (−68 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 500 · «nils johansen» | 270 ms → 17 ms (−94 %) | 290 ms → 26 ms (−91 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 500 · «johanssen» | 318 ms → 23 ms (−93 %) | 328 ms → 26 ms (−92 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 500 · «an» | 208 ms → 21 ms (−90 %) | 267 ms → 25 ms (−91 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 500 · «nils johansen» | 163 ms → 17 ms (−90 %) | 170 ms → 17 ms (−90 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 500 · «johanssen» | 160 ms → 11 ms (−93 %) | 194 ms → 12 ms (−94 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 500 · «an» | 157 ms → 16 ms (−90 %) | 160 ms → 17 ms (−90 %) |  |  |
| SQL sok_direktemottakere · medlem · 500 · «nils johansen» | 171 ms → 23 ms (−87 %) | 275 ms → 36 ms (−87 %) |  |  |
| SQL sok_direktemottakere · medlem · 500 · «johanssen» | 236 ms → 28 ms (−88 %) | 246 ms → 29 ms (−88 %) |  |  |
| SQL sok_direktemottakere · medlem · 500 · «an» | 79 ms → 32 ms (−59 %) | 92 ms → 39 ms (−58 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 5000 · «nils johansen» | 4421 ms → 406 ms (−91 %) | 4538 ms → 462 ms (−90 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 5000 · «johanssen» | 6237 ms → 454 ms (−93 %) | 6362 ms → 490 ms (−92 %) |  |  |
| SQL sok_gruppekandidater · systemarkitekt · 5000 · «an» | 1885 ms → 369 ms (−80 %) | 2047 ms → 414 ms (−80 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 5000 · «nils johansen» | 2901 ms → 90 ms (−97 %) | 2937 ms → 124 ms (−96 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 5000 · «johanssen» | 3230 ms → 110 ms (−97 %) | 3881 ms → 110 ms (−97 %) |  |  |
| SQL sok_medlemskandidater · systemarkitekt · 5000 · «an» | 2242 ms → 89 ms (−96 %) | 2392 ms → 107 ms (−96 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 5000 · «nils johansen» | 1724 ms → 20 ms (−99 %) | 1836 ms → 26 ms (−99 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 5000 · «johanssen» | 1752 ms → 18 ms (−99 %) | 2025 ms → 20 ms (−99 %) |  |  |
| SQL sok_medlemskandidater · lokal administrator · 5000 · «an» | 1721 ms → 17 ms (−99 %) | 1786 ms → 27 ms (−99 %) |  |  |
| SQL sok_direktemottakere · medlem · 5000 · «nils johansen» | 2008 ms → 164 ms (−92 %) | 2048 ms → 178 ms (−91 %) |  |  |
| SQL sok_direktemottakere · medlem · 5000 · «johanssen» | 2698 ms → 226 ms (−92 %) | 2721 ms → 240 ms (−91 %) |  |  |
| SQL sok_direktemottakere · medlem · 5000 · «an» | 851 ms → 165 ms (−81 %) | 939 ms → 173 ms (−82 %) |  |  |

## Appen: tid til hvert merke (fra handlingen)

| Scenario | Profil | Personer | Merke | Tid: median (p95; min–maks) | API-kall startet innen | JS hentet innen: overført / utpakket | Lange oppgaver innen (sum) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kald | rask | 500 | skall | 408 ms (p95 545 ms; 378 ms–545 ms) | 24 (19–27) | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 97 ms (p95 189 ms; 90 ms–189 ms) |
| kald | rask | 500 | forside | 408 ms (p95 545 ms; 378 ms–545 ms) | 24 (19–27) | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 97 ms (p95 189 ms; 90 ms–189 ms) |
| kald | rask | 500 | forside_tittel | 544 ms (p95 618 ms; 378 ms–618 ms) | 27 (19–29) | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 138 ms (p95 189 ms; 90 ms–189 ms) |
| kald | rask | 500 | fagsok_svar | 686 ms (p95 1106 ms; 572 ms–1106 ms) | 27 (27–35) | 304 kB (p95 513 kB; 304 kB–513 kB) / 1019 kB (p95 1651 kB; 1019 kB–1651 kB) | 166 ms (p95 319 ms; 90 ms–319 ms) |
| kald | rask | 500 | forside_paneler | 817 ms (p95 1128 ms; 698 ms–1128 ms) | 31 (27–32) | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 166 ms (p95 402 ms; 90 ms–402 ms) |
| varm | rask | 500 | skall | 175 ms (p95 240 ms; 169 ms–240 ms) | 26 (18–26) | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 77 ms (p95 117 ms; 59 ms–117 ms) |
| varm | rask | 500 | forside | 175 ms (p95 240 ms; 169 ms–240 ms) | 26 (18–26) | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 77 ms (p95 117 ms; 59 ms–117 ms) |
| varm | rask | 500 | forside_tittel | 206 ms (p95 371 ms; 170 ms–371 ms) | 26 (23–28) | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 77 ms (p95 117 ms; 59 ms–117 ms) |
| varm | rask | 500 | fagsok_svar | 948 ms (p95 1165 ms; 399 ms–1165 ms) | 30 (26–32) | 5 kB (p95 5 kB; 1 kB–5 kB) / 1474 kB (p95 2106 kB; 0 kB–2106 kB) | 145 ms (p95 201 ms; 77 ms–201 ms) |
| varm | rask | 500 | forside_paneler | 498 ms (p95 569 ms; 399 ms–569 ms) | 26 (26–29) | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 79 ms (p95 118 ms; 74 ms–118 ms) |
| fagside | rask | 500 | fagside_navn | 64 ms (p95 100 ms; 58 ms–100 ms) | 3 | 17 kB (p95 17 kB; 17 kB–17 kB) / 45 kB (p95 45 kB; 45 kB–45 kB) | 0 ms (p95 52 ms; 0 ms–52 ms) |
| fagside | rask | 500 | fagside_innhold | 162 ms (p95 203 ms; 112 ms–203 ms) | 7 (5–7) | 59 kB (p95 59 kB; 59 kB–59 kB) / 174 kB (p95 174 kB; 174 kB–174 kB) | 0 ms (p95 52 ms; 0 ms–52 ms) |
| fagside | rask | 500 | fagside_komplett | 290 ms (p95 343 ms; 250 ms–343 ms) | 8 | 59 kB (p95 59 kB; 59 kB–59 kB) / 174 kB (p95 174 kB; 174 kB–174 kB) | 0 ms (p95 52 ms; 0 ms–52 ms) |
| direkte | rask | 500 | skall | 220 ms (p95 303 ms; 197 ms–303 ms) | 24 (21–24) | 22 kB (p95 22 kB; 22 kB–22 kB) / 1776 kB (p95 2151 kB; 45 kB–2151 kB) | 99 ms (p95 133 ms; 74 ms–133 ms) |
| direkte | rask | 500 | fagside_navn | 373 ms (p95 450 ms; 316 ms–450 ms) | 25 (24–26) | 22 kB (p95 64 kB; 22 kB–64 kB) / 1776 kB (p95 2280 kB; 45 kB–2280 kB) | 99 ms (p95 133 ms; 74 ms–133 ms) |
| direkte | rask | 500 | fagside_innhold | 450 ms (p95 482 ms; 407 ms–482 ms) | 27 (24–28) | 64 kB (p95 64 kB; 22 kB–64 kB) / 1776 kB (p95 2280 kB; 174 kB–2280 kB) | 99 ms (p95 133 ms; 74 ms–133 ms) |
| direkte | rask | 500 | fagside_komplett | 632 ms (p95 686 ms; 544 ms–686 ms) | 30 (29–31) | 64 kB (p95 64 kB; 64 kB–64 kB) / 1905 kB (p95 2280 kB; 174 kB–2280 kB) | 99 ms (p95 133 ms; 74 ms–133 ms) |
| fortolkning | rask | 500 | fortolkning | 129 ms (p95 186 ms; 122 ms–186 ms) | 0 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| fortolkning | rask | 500 | fortolkning_treff | 204 ms (p95 251 ms; 193 ms–251 ms) | 0 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| fagmiljobytte | rask | 500 | forside_tittel | 288 ms (p95 337 ms; 274 ms–337 ms) | 20 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 74 ms (p95 109 ms; 63 ms–109 ms) |
| fagmiljobytte | rask | 500 | forside_paneler | 339 ms (p95 417 ms; 305 ms–417 ms) | 20 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 74 ms (p95 109 ms; 63 ms–109 ms) |
| kald | treg | 500 | skall | 1514 ms (p95 1638 ms; 1384 ms–1638 ms) | 27 | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 662 ms (p95 751 ms; 532 ms–751 ms) |
| kald | treg | 500 | forside | 1514 ms (p95 1638 ms; 1384 ms–1638 ms) | 27 | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 662 ms (p95 751 ms; 532 ms–751 ms) |
| kald | treg | 500 | forside_tittel | 1514 ms (p95 1638 ms; 1384 ms–1638 ms) | 27 | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 662 ms (p95 751 ms; 532 ms–751 ms) |
| kald | treg | 500 | fagsok_svar | 3005 ms (p95 3607 ms; 1749 ms–3607 ms) | 30 (27–32) | 304 kB (p95 513 kB; 304 kB–513 kB) / 1019 kB (p95 1651 kB; 1019 kB–1651 kB) | 1225 ms (p95 1282 ms; 718 ms–1282 ms) |
| kald | treg | 500 | forside_paneler | 2564 ms (p95 2671 ms; 2209 ms–2671 ms) | 27 (27–29) | 304 kB (p95 304 kB; 304 kB–304 kB) / 1019 kB (p95 1019 kB; 1019 kB–1019 kB) | 1075 ms (p95 1203 ms; 880 ms–1203 ms) |
| varm | treg | 500 | skall | 1013 ms (p95 1094 ms; 915 ms–1094 ms) | 26 | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 468 ms (p95 500 ms; 386 ms–500 ms) |
| varm | treg | 500 | forside | 1013 ms (p95 1094 ms; 915 ms–1094 ms) | 26 | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 468 ms (p95 500 ms; 386 ms–500 ms) |
| varm | treg | 500 | forside_tittel | 1013 ms (p95 1094 ms; 915 ms–1094 ms) | 26 | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 468 ms (p95 500 ms; 386 ms–500 ms) |
| varm | treg | 500 | fagsok_svar | 3761 ms (p95 4151 ms; 2563 ms–4151 ms) | 30 (28–30) | 5 kB (p95 5 kB; 1 kB–5 kB) / 2106 kB (p95 2106 kB; 0 kB–2106 kB) | 1212 ms (p95 1461 ms; 844 ms–1461 ms) |
| varm | treg | 500 | forside_paneler | 2079 ms (p95 2438 ms; 1723 ms–2438 ms) | 26 | 1 kB (p95 1 kB; 1 kB–1 kB) / 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 1016 ms (p95 1209 ms; 844 ms–1209 ms) |
| fagside | treg | 500 | fagside_navn | 323 ms (p95 822 ms; 243 ms–822 ms) | 3 (3–5) | 17 kB (p95 226 kB; 17 kB–226 kB) / 45 kB (p95 676 kB; 45 kB–676 kB) | 391 ms (p95 529 ms; 283 ms–529 ms) |
| fagside | treg | 500 | fagside_innhold | 616 ms (p95 1275 ms; 469 ms–1275 ms) | 3 (3–10) | 17 kB (p95 268 kB; 17 kB–268 kB) / 45 kB (p95 805 kB; 45 kB–805 kB) | 478 ms (p95 650 ms; 354 ms–650 ms) |
| fagside | treg | 500 | fagside_komplett | 1625 ms (p95 2353 ms; 1412 ms–2353 ms) | 8 (8–13) | 59 kB (p95 268 kB; 59 kB–268 kB) / 174 kB (p95 805 kB; 174 kB–805 kB) | 908 ms (p95 970 ms; 662 ms–970 ms) |
| direkte | treg | 500 | skall | 961 ms (p95 1126 ms; 948 ms–1126 ms) | 21 | 22 kB (p95 227 kB; 22 kB–227 kB) / 2151 kB (p95 2151 kB; 676 kB–2151 kB) | 409 ms (p95 552 ms; 355 ms–552 ms) |
| direkte | treg | 500 | fagside_navn | 1680 ms (p95 1781 ms; 1600 ms–1781 ms) | 26 (25–26) | 64 kB (p95 269 kB; 64 kB–269 kB) / 2280 kB (p95 2280 kB; 805 kB–2280 kB) | 831 ms (p95 989 ms; 812 ms–989 ms) |
| direkte | treg | 500 | fagside_innhold | 1926 ms (p95 2082 ms; 1850 ms–2082 ms) | 26 (26–28) | 64 kB (p95 269 kB; 64 kB–269 kB) / 2280 kB (p95 2280 kB; 805 kB–2280 kB) | 943 ms (p95 1078 ms; 872 ms–1078 ms) |
| direkte | treg | 500 | fagside_komplett | 3056 ms (p95 3334 ms; 2902 ms–3334 ms) | 32 (31–33) | 64 kB (p95 269 kB; 64 kB–269 kB) / 2280 kB (p95 2280 kB; 805 kB–2280 kB) | 1435 ms (p95 1663 ms; 1263 ms–1663 ms) |
| fortolkning | treg | 500 | fortolkning | 320 ms (p95 463 ms; 265 ms–463 ms) | 0 (0–4) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 100 ms (p95 179 ms; 85 ms–179 ms) |
| fortolkning | treg | 500 | fortolkning_treff | 447 ms (p95 746 ms; 401 ms–746 ms) | 0 (0–4) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 193 ms (p95 350 ms; 160 ms–350 ms) |
| fagmiljobytte | treg | 500 | forside_tittel | 904 ms (p95 999 ms; 729 ms–999 ms) | 19 (19–20) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 528 ms (p95 561 ms; 433 ms–561 ms) |
| fagmiljobytte | treg | 500 | forside_paneler | 1044 ms (p95 1151 ms; 869 ms–1151 ms) | 19 (19–20) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 593 ms (p95 620 ms; 489 ms–620 ms) |
| brukere | rask | 50 | brukere | 322 ms (p95 330 ms; 247 ms–330 ms) | 1 | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| brukere | treg | 50 | brukere | 796 ms (p95 884 ms; 700 ms–884 ms) | 1 (1–2) | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 252 ms (p95 357 ms; 157 ms–357 ms) |
| brukere | rask | 500 | brukere | 542 ms (p95 627 ms; 533 ms–627 ms) | 1 | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 88 ms (p95 123 ms; 65 ms–123 ms) |
| brukere | treg | 500 | brukere | 1627 ms (p95 1773 ms; 1540 ms–1773 ms) | 1 | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 719 ms (p95 864 ms; 576 ms–864 ms) |
| brukere | rask | 5000 | brukere | 2506 ms (p95 2593 ms; 2214 ms–2593 ms) | 1 | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 191 ms (p95 205 ms; 157 ms–205 ms) |
| brukere | treg | 5000 | brukere | 3980 ms (p95 4145 ms; 3749 ms–4145 ms) | 1 | 6 kB (p95 6 kB; 6 kB–6 kB) / 14 kB (p95 14 kB; 14 kB–14 kB) | 1202 ms (p95 1282 ms; 1105 ms–1282 ms) |

## Fagsiden: referanselisten mens kildene kommer

| Scenario | Profil | Referanser til slutt | Visninger av listen | Referanser som fikk nytt nummer | Referanser lagt til etter første visning |
| --- | --- | --- | --- | --- | --- |
| fagside | rask | 32 | 1 | 0 | 0 |
| direkte | rask | 32 | 1 | 0 | 0 |
| fagside | treg | 32 | 1 | 0 | 0 |
| direkte | treg | 32 | 1 | 0 | 0 |

## Personsøket: fra siste tastetrykk til svaret står

| Søket | Profil | Personer | Svar: median (p95; min–maks) | Pause før kallet | Kallet (nett og server) | Visning | Kall per søk | Riktige treff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gruppeinvitasjon: første søk | rask | 50 | 275 ms (p95 295 ms; 271 ms–295 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 15 ms (p95 26 ms; 11 ms–26 ms) | 9 ms (p95 17 ms; 6 ms–17 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 50 | 22 ms (p95 66 ms; 11 ms–66 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 50 | 288 ms (p95 294 ms; 273 ms–294 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 14 ms (p95 18 ms; 13 ms–18 ms) | 21 ms (p95 24 ms; 5 ms–24 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 50 | 284 ms (p95 289 ms; 277 ms–289 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 16 ms (p95 21 ms; 13 ms–21 ms) | 14 ms (p95 23 ms; 9 ms–23 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 50 | 278 ms (p95 283 ms; 272 ms–283 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 13 ms (p95 14 ms; 12 ms–14 ms) | 13 ms (p95 18 ms; 8 ms–18 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 50 | 278 ms (p95 294 ms; 268 ms–294 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 15 ms (p95 26 ms; 11 ms–26 ms) | 11 ms (p95 18 ms; 6 ms–18 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 50 | 270 ms (p95 279 ms; 267 ms–279 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 50 | 287 ms (p95 318 ms; 282 ms–318 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 50 | 276 ms (p95 293 ms; 267 ms–293 ms) | 252 ms (p95 262 ms; 252 ms–262 ms) | 9 ms (p95 10 ms; 7 ms–10 ms) | 15 ms (p95 21 ms; 6 ms–21 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 50 | 18 ms (p95 78 ms; 3 ms–78 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 50 | 280 ms (p95 289 ms; 272 ms–289 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 10 ms (p95 13 ms; 9 ms–13 ms) | 19 ms (p95 24 ms; 11 ms–24 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 50 | 275 ms (p95 290 ms; 266 ms–290 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 9 ms (p95 16 ms; 8 ms–16 ms) | 11 ms (p95 22 ms; 6 ms–22 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 50 | 283 ms (p95 285 ms; 268 ms–285 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 9 ms (p95 12 ms; 9 ms–12 ms) | 21 ms (p95 24 ms; 7 ms–24 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 50 | 270 ms (p95 277 ms; 266 ms–277 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 9 ms (p95 10 ms; 7 ms–10 ms) | 10 ms (p95 17 ms; 6 ms–17 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 50 | 268 ms (p95 278 ms; 267 ms–278 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 50 | 286 ms (p95 320 ms; 271 ms–320 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 50 | 271 ms (p95 289 ms; 266 ms–289 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 9 ms (p95 16 ms; 7 ms–16 ms) | 7 ms (p95 21 ms; 4 ms–21 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 50 | 15 ms (p95 29 ms; 5 ms–29 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 50 | 274 ms (p95 276 ms; 271 ms–276 ms) | 253 ms (p95 254 ms; 253 ms–254 ms) | 12 ms (p95 13 ms; 10 ms–13 ms) | 9 ms (p95 11 ms; 7 ms–11 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 50 | 273 ms (p95 277 ms; 269 ms–277 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 10 ms (p95 14 ms; 8 ms–14 ms) | 11 ms (p95 12 ms; 7 ms–12 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 50 | 274 ms (p95 277 ms; 268 ms–277 ms) | 253 ms (p95 257 ms; 252 ms–257 ms) | 10 ms (p95 13 ms; 9 ms–13 ms) | 8 ms (p95 15 ms; 3 ms–15 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 50 | 268 ms (p95 278 ms; 264 ms–278 ms) | 252 ms (p95 254 ms; 252 ms–254 ms) | 9 ms (p95 10 ms; 7 ms–10 ms) | 6 ms (p95 17 ms; 3 ms–17 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 50 | 271 ms (p95 275 ms; 267 ms–275 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 50 | 280 ms (p95 285 ms; 266 ms–285 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 50 | 383 ms (p95 396 ms; 377 ms–396 ms) | 261 ms (p95 262 ms; 257 ms–262 ms) | 87 ms (p95 89 ms; 84 ms–89 ms) | 35 ms (p95 50 ms; 31 ms–50 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 50 | 32 ms (p95 93 ms; 22 ms–93 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 50 | 394 ms (p95 416 ms; 383 ms–416 ms) | 260 ms (p95 265 ms; 259 ms–265 ms) | 88 ms (p95 89 ms; 86 ms–89 ms) | 42 ms (p95 71 ms; 37 ms–71 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 50 | 376 ms (p95 401 ms; 366 ms–401 ms) | 261 ms (p95 265 ms; 258 ms–265 ms) | 85 ms (p95 87 ms; 84 ms–87 ms) | 29 ms (p95 51 ms; 23 ms–51 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 50 | 378 ms (p95 391 ms; 369 ms–391 ms) | 259 ms (p95 263 ms; 258 ms–263 ms) | 85 ms (p95 86 ms; 84 ms–86 ms) | 34 ms (p95 46 ms; 21 ms–46 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 50 | 379 ms (p95 500 ms; 364 ms–500 ms) | 261 ms (p95 267 ms; 258 ms–267 ms) | 86 ms (p95 87 ms; 84 ms–87 ms) | 35 ms (p95 151 ms; 16 ms–151 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 50 | 309 ms (p95 373 ms; 302 ms–373 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 50 | 404 ms (p95 434 ms; 391 ms–434 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 50 | 362 ms (p95 591 ms; 359 ms–591 ms) | 262 ms (p95 317 ms; 259 ms–317 ms) | 85 ms (p95 88 ms; 84 ms–88 ms) | 15 ms (p95 186 ms; 13 ms–186 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 50 | 55 ms (p95 118 ms; 29 ms–118 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 50 | 390 ms (p95 398 ms; 381 ms–398 ms) | 259 ms (p95 262 ms; 258 ms–262 ms) | 88 ms (p95 91 ms; 84 ms–91 ms) | 44 ms (p95 53 ms; 36 ms–53 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 50 | 385 ms (p95 396 ms; 357 ms–396 ms) | 261 ms (p95 263 ms; 258 ms–263 ms) | 86 ms (p95 89 ms; 85 ms–89 ms) | 38 ms (p95 52 ms; 15 ms–52 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 50 | 394 ms (p95 438 ms; 376 ms–438 ms) | 261 ms (p95 302 ms; 259 ms–302 ms) | 86 ms (p95 87 ms; 85 ms–87 ms) | 44 ms (p95 63 ms; 31 ms–63 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 50 | 380 ms (p95 764 ms; 367 ms–764 ms) | 257 ms (p95 623 ms; 255 ms–623 ms) | 85 ms (p95 86 ms; 85 ms–86 ms) | 36 ms (p95 56 ms; 25 ms–56 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 50 | 300 ms (p95 319 ms; 295 ms–319 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 50 | 411 ms (p95 463 ms; 371 ms–463 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 50 | 370 ms (p95 388 ms; 367 ms–388 ms) | 263 ms (p95 268 ms; 260 ms–268 ms) | 86 ms (p95 88 ms; 86 ms–88 ms) | 23 ms (p95 38 ms; 14 ms–38 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 50 | 20 ms (p95 30 ms; 12 ms–30 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 50 | 374 ms (p95 376 ms; 355 ms–376 ms) | 260 ms (p95 262 ms; 259 ms–262 ms) | 88 ms (p95 91 ms; 84 ms–91 ms) | 24 ms (p95 29 ms; 11 ms–29 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 50 | 370 ms (p95 376 ms; 364 ms–376 ms) | 260 ms (p95 262 ms; 258 ms–262 ms) | 86 ms (p95 90 ms; 85 ms–90 ms) | 25 ms (p95 30 ms; 16 ms–30 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 50 | 372 ms (p95 833 ms; 364 ms–833 ms) | 264 ms (p95 706 ms; 261 ms–706 ms) | 87 ms (p95 87 ms; 84 ms–87 ms) | 24 ms (p95 39 ms; 14 ms–39 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 50 | 376 ms (p95 425 ms; 363 ms–425 ms) | 260 ms (p95 327 ms; 258 ms–327 ms) | 86 ms (p95 87 ms; 86 ms–87 ms) | 20 ms (p95 36 ms; 11 ms–36 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 50 | 303 ms (p95 336 ms; 293 ms–336 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 50 | 371 ms (p95 379 ms; 360 ms–379 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | rask | 500 | 311 ms (p95 328 ms; 302 ms–328 ms) | 252 ms (p95 255 ms; 252 ms–255 ms) | 41 ms (p95 58 ms; 35 ms–58 ms) | 17 ms (p95 21 ms; 9 ms–21 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 500 | 43 ms (p95 80 ms; 13 ms–80 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 500 | 325 ms (p95 366 ms; 310 ms–366 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 55 ms (p95 87 ms; 48 ms–87 ms) | 19 ms (p95 26 ms; 10 ms–26 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 500 | 321 ms (p95 338 ms; 308 ms–338 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 54 ms (p95 67 ms; 40 ms–67 ms) | 17 ms (p95 20 ms; 9 ms–20 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 500 | 319 ms (p95 332 ms; 309 ms–332 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 50 ms (p95 64 ms; 48 ms–64 ms) | 17 ms (p95 18 ms; 6 ms–18 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 500 | 314 ms (p95 317 ms; 296 ms–317 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 45 ms (p95 51 ms; 34 ms–51 ms) | 14 ms (p95 20 ms; 4 ms–20 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 500 | 271 ms (p95 279 ms; 267 ms–279 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 500 | 332 ms (p95 345 ms; 322 ms–345 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 500 | 287 ms (p95 289 ms; 279 ms–289 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 16 ms (p95 18 ms; 15 ms–18 ms) | 19 ms (p95 20 ms; 11 ms–20 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 500 | 26 ms (p95 96 ms; 5 ms–96 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 500 | 299 ms (p95 301 ms; 285 ms–301 ms) | 253 ms (p95 257 ms; 252 ms–257 ms) | 21 ms (p95 26 ms; 19 ms–26 ms) | 19 ms (p95 30 ms; 14 ms–30 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 500 | 284 ms (p95 302 ms; 279 ms–302 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 15 ms (p95 22 ms; 14 ms–22 ms) | 17 ms (p95 32 ms; 13 ms–32 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 500 | 293 ms (p95 299 ms; 283 ms–299 ms) | 252 ms (p95 254 ms; 252 ms–254 ms) | 17 ms (p95 22 ms; 14 ms–22 ms) | 24 ms (p95 27 ms; 16 ms–27 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 500 | 286 ms (p95 302 ms; 270 ms–302 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 15 ms (p95 20 ms; 14 ms–20 ms) | 19 ms (p95 33 ms; 4 ms–33 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 500 | 283 ms (p95 291 ms; 273 ms–291 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 500 | 323 ms (p95 354 ms; 285 ms–354 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 500 | 287 ms (p95 301 ms; 283 ms–301 ms) | 253 ms (p95 253 ms; 253 ms–253 ms) | 23 ms (p95 32 ms; 22 ms–32 ms) | 12 ms (p95 18 ms; 3 ms–18 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 500 | 17 ms (p95 18 ms; 6 ms–18 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 500 | 294 ms (p95 315 ms; 285 ms–315 ms) | 253 ms (p95 253 ms; 252 ms–253 ms) | 27 ms (p95 43 ms; 25 ms–43 ms) | 9 ms (p95 19 ms; 8 ms–19 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 500 | 295 ms (p95 312 ms; 280 ms–312 ms) | 253 ms (p95 253 ms; 252 ms–253 ms) | 24 ms (p95 37 ms; 18 ms–37 ms) | 18 ms (p95 22 ms; 6 ms–22 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 500 | 283 ms (p95 291 ms; 277 ms–291 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 23 ms (p95 29 ms; 20 ms–29 ms) | 5 ms (p95 15 ms; 4 ms–15 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 500 | 290 ms (p95 300 ms; 276 ms–300 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 26 ms (p95 36 ms; 16 ms–36 ms) | 10 ms (p95 12 ms; 2 ms–12 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 500 | 272 ms (p95 277 ms; 265 ms–277 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 500 | 297 ms (p95 307 ms; 281 ms–307 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 500 | 390 ms (p95 415 ms; 371 ms–415 ms) | 259 ms (p95 262 ms; 259 ms–262 ms) | 86 ms (p95 90 ms; 84 ms–90 ms) | 47 ms (p95 67 ms; 27 ms–67 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 500 | 51 ms (p95 117 ms; 20 ms–117 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 500 | 389 ms (p95 423 ms; 373 ms–423 ms) | 259 ms (p95 263 ms; 258 ms–263 ms) | 91 ms (p95 95 ms; 89 ms–95 ms) | 41 ms (p95 67 ms; 22 ms–67 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 500 | 385 ms (p95 399 ms; 376 ms–399 ms) | 262 ms (p95 265 ms; 260 ms–265 ms) | 87 ms (p95 94 ms; 86 ms–94 ms) | 39 ms (p95 39 ms; 28 ms–39 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 500 | 371 ms (p95 380 ms; 367 ms–380 ms) | 259 ms (p95 266 ms; 257 ms–266 ms) | 86 ms (p95 89 ms; 85 ms–89 ms) | 25 ms (p95 34 ms; 22 ms–34 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 500 | 364 ms (p95 379 ms; 351 ms–379 ms) | 257 ms (p95 259 ms; 257 ms–259 ms) | 85 ms (p95 88 ms; 85 ms–88 ms) | 22 ms (p95 33 ms; 9 ms–33 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 500 | 307 ms (p95 315 ms; 280 ms–315 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 500 | 417 ms (p95 462 ms; 398 ms–462 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 500 | 375 ms (p95 390 ms; 367 ms–390 ms) | 260 ms (p95 260 ms; 257 ms–260 ms) | 88 ms (p95 90 ms; 84 ms–90 ms) | 30 ms (p95 43 ms; 19 ms–43 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 500 | 73 ms (p95 191 ms; 46 ms–191 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 500 | 444 ms (p95 508 ms; 425 ms–508 ms) | 263 ms (p95 264 ms; 258 ms–264 ms) | 88 ms (p95 89 ms; 86 ms–89 ms) | 93 ms (p95 161 ms; 73 ms–161 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 500 | 422 ms (p95 464 ms; 383 ms–464 ms) | 260 ms (p95 263 ms; 259 ms–263 ms) | 87 ms (p95 89 ms; 85 ms–89 ms) | 74 ms (p95 112 ms; 35 ms–112 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 500 | 418 ms (p95 450 ms; 404 ms–450 ms) | 260 ms (p95 263 ms; 258 ms–263 ms) | 87 ms (p95 88 ms; 86 ms–88 ms) | 70 ms (p95 101 ms; 57 ms–101 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 500 | 451 ms (p95 488 ms; 362 ms–488 ms) | 259 ms (p95 332 ms; 257 ms–332 ms) | 88 ms (p95 89 ms; 85 ms–89 ms) | 81 ms (p95 105 ms; 20 ms–105 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 500 | 346 ms (p95 355 ms; 336 ms–355 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 500 | 456 ms (p95 520 ms; 424 ms–520 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 500 | 378 ms (p95 456 ms; 361 ms–456 ms) | 261 ms (p95 261 ms; 259 ms–261 ms) | 87 ms (p95 92 ms; 83 ms–92 ms) | 28 ms (p95 109 ms; 14 ms–109 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 500 | 21 ms (p95 46 ms; 9 ms–46 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 500 | 386 ms (p95 388 ms; 371 ms–388 ms) | 262 ms (p95 267 ms; 258 ms–267 ms) | 88 ms (p95 89 ms; 86 ms–89 ms) | 35 ms (p95 41 ms; 23 ms–41 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 500 | 382 ms (p95 387 ms; 373 ms–387 ms) | 264 ms (p95 269 ms; 259 ms–269 ms) | 86 ms (p95 87 ms; 84 ms–87 ms) | 32 ms (p95 37 ms; 25 ms–37 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 500 | 368 ms (p95 440 ms; 361 ms–440 ms) | 263 ms (p95 345 ms; 258 ms–345 ms) | 86 ms (p95 89 ms; 85 ms–89 ms) | 18 ms (p95 21 ms; 7 ms–21 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 500 | 360 ms (p95 387 ms; 354 ms–387 ms) | 258 ms (p95 264 ms; 256 ms–264 ms) | 86 ms (p95 88 ms; 84 ms–88 ms) | 19 ms (p95 35 ms; 9 ms–35 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 500 | 300 ms (p95 328 ms; 294 ms–328 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 500 | 362 ms (p95 388 ms; 356 ms–388 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | rask | 5000 | 641 ms (p95 678 ms; 590 ms–678 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 371 ms (p95 382 ms; 280 ms–382 ms) | 54 ms (p95 58 ms; 12 ms–58 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 5000 | 44 ms (p95 67 ms; 7 ms–67 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 5000 | 771 ms (p95 857 ms; 693 ms–857 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 479 ms (p95 567 ms; 409 ms–567 ms) | 37 ms (p95 59 ms; 7 ms–59 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 5000 | 686 ms (p95 815 ms; 579 ms–815 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 420 ms (p95 519 ms; 286 ms–519 ms) | 28 ms (p95 45 ms; 14 ms–45 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 5000 | 687 ms (p95 720 ms; 675 ms–720 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 414 ms (p95 440 ms; 399 ms–440 ms) | 29 ms (p95 37 ms; 9 ms–37 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 5000 | 698 ms (p95 756 ms; 614 ms–756 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 411 ms (p95 494 ms; 342 ms–494 ms) | 21 ms (p95 54 ms; 10 ms–54 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 5000 | 271 ms (p95 277 ms; 260 ms–277 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 5000 | 723 ms (p95 760 ms; 544 ms–760 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 5000 | 407 ms (p95 604 ms; 316 ms–604 ms) | 252 ms (p95 254 ms; 252 ms–254 ms) | 119 ms (p95 137 ms; 53 ms–137 ms) | 21 ms (p95 231 ms; 11 ms–231 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 5000 | 16 ms (p95 67 ms; 6 ms–67 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 5000 | 397 ms (p95 418 ms; 392 ms–418 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 105 ms (p95 133 ms; 97 ms–133 ms) | 40 ms (p95 51 ms; 30 ms–51 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 5000 | 386 ms (p95 428 ms; 351 ms–428 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 106 ms (p95 137 ms; 86 ms–137 ms) | 29 ms (p95 39 ms; 9 ms–39 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 5000 | 373 ms (p95 392 ms; 370 ms–392 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 94 ms (p95 98 ms; 79 ms–98 ms) | 38 ms (p95 43 ms; 27 ms–43 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 5000 | 359 ms (p95 405 ms; 342 ms–405 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 79 ms (p95 108 ms; 69 ms–108 ms) | 28 ms (p95 47 ms; 21 ms–47 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 5000 | 286 ms (p95 290 ms; 278 ms–290 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 5000 | 389 ms (p95 450 ms; 370 ms–450 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 5000 | 427 ms (p95 441 ms; 380 ms–441 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 165 ms (p95 170 ms; 120 ms–170 ms) | 9 ms (p95 19 ms; 8 ms–19 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 5000 | 15 ms (p95 19 ms; 2 ms–19 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 5000 | 485 ms (p95 547 ms; 437 ms–547 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 213 ms (p95 276 ms; 177 ms–276 ms) | 19 ms (p95 21 ms; 8 ms–21 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 5000 | 449 ms (p95 510 ms; 396 ms–510 ms) | 253 ms (p95 254 ms; 252 ms–254 ms) | 186 ms (p95 236 ms; 130 ms–236 ms) | 12 ms (p95 24 ms; 11 ms–24 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 5000 | 428 ms (p95 484 ms; 418 ms–484 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 172 ms (p95 212 ms; 162 ms–212 ms) | 4 ms (p95 20 ms; 3 ms–20 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 5000 | 445 ms (p95 501 ms; 397 ms–501 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 183 ms (p95 242 ms; 130 ms–242 ms) | 14 ms (p95 21 ms; 7 ms–21 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 5000 | 271 ms (p95 276 ms; 263 ms–276 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 5000 | 456 ms (p95 488 ms; 391 ms–488 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 5000 | 682 ms (p95 694 ms; 606 ms–694 ms) | 259 ms (p95 259 ms; 258 ms–259 ms) | 361 ms (p95 399 ms; 313 ms–399 ms) | 37 ms (p95 74 ms; 32 ms–74 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 5000 | 26 ms (p95 83 ms; 20 ms–83 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 5000 | 787 ms (p95 804 ms; 707 ms–804 ms) | 260 ms (p95 261 ms; 257 ms–261 ms) | 472 ms (p95 518 ms; 380 ms–518 ms) | 49 ms (p95 70 ms; 26 ms–70 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 5000 | 770 ms (p95 869 ms; 675 ms–869 ms) | 260 ms (p95 269 ms; 257 ms–269 ms) | 454 ms (p95 520 ms; 347 ms–520 ms) | 67 ms (p95 80 ms; 36 ms–80 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 5000 | 768 ms (p95 838 ms; 735 ms–838 ms) | 260 ms (p95 263 ms; 257 ms–263 ms) | 427 ms (p95 523 ms; 410 ms–523 ms) | 55 ms (p95 122 ms; 46 ms–122 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 5000 | 710 ms (p95 879 ms; 677 ms–879 ms) | 257 ms (p95 260 ms; 256 ms–260 ms) | 426 ms (p95 557 ms; 336 ms–557 ms) | 54 ms (p95 85 ms; 24 ms–85 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 5000 | 297 ms (p95 320 ms; 288 ms–320 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 5000 | 770 ms (p95 879 ms; 587 ms–879 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 5000 | 391 ms (p95 445 ms; 386 ms–445 ms) | 259 ms (p95 259 ms; 258 ms–259 ms) | 114 ms (p95 140 ms; 85 ms–140 ms) | 43 ms (p95 47 ms; 18 ms–47 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 5000 | 61 ms (p95 190 ms; 56 ms–190 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 5000 | 500 ms (p95 517 ms; 480 ms–517 ms) | 262 ms (p95 265 ms; 256 ms–265 ms) | 113 ms (p95 119 ms; 107 ms–119 ms) | 125 ms (p95 142 ms; 104 ms–142 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 5000 | 480 ms (p95 1066 ms; 372 ms–1066 ms) | 261 ms (p95 793 ms; 258 ms–793 ms) | 101 ms (p95 131 ms; 88 ms–131 ms) | 104 ms (p95 143 ms; 25 ms–143 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 5000 | 498 ms (p95 564 ms; 450 ms–564 ms) | 261 ms (p95 275 ms; 259 ms–275 ms) | 93 ms (p95 120 ms; 85 ms–120 ms) | 130 ms (p95 182 ms; 104 ms–182 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 5000 | 471 ms (p95 575 ms; 390 ms–575 ms) | 260 ms (p95 272 ms; 257 ms–272 ms) | 96 ms (p95 136 ms; 86 ms–136 ms) | 105 ms (p95 167 ms; 45 ms–167 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 5000 | 397 ms (p95 420 ms; 356 ms–420 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 5000 | 525 ms (p95 641 ms; 488 ms–641 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 5000 | 438 ms (p95 485 ms; 435 ms–485 ms) | 260 ms (p95 262 ms; 257 ms–262 ms) | 167 ms (p95 202 ms; 149 ms–202 ms) | 21 ms (p95 26 ms; 11 ms–26 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 5000 | 18 ms (p95 23 ms; 11 ms–23 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 5000 | 503 ms (p95 530 ms; 470 ms–530 ms) | 260 ms (p95 262 ms; 258 ms–262 ms) | 200 ms (p95 238 ms; 179 ms–238 ms) | 33 ms (p95 44 ms; 28 ms–44 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 5000 | 453 ms (p95 493 ms; 435 ms–493 ms) | 261 ms (p95 267 ms; 258 ms–267 ms) | 159 ms (p95 195 ms; 146 ms–195 ms) | 31 ms (p95 37 ms; 14 ms–37 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 5000 | 441 ms (p95 552 ms; 438 ms–552 ms) | 261 ms (p95 265 ms; 258 ms–265 ms) | 165 ms (p95 256 ms; 161 ms–256 ms) | 20 ms (p95 36 ms; 10 ms–36 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 5000 | 451 ms (p95 492 ms; 386 ms–492 ms) | 260 ms (p95 261 ms; 257 ms–261 ms) | 172 ms (p95 196 ms; 114 ms–196 ms) | 26 ms (p95 53 ms; 12 ms–53 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 5000 | 304 ms (p95 324 ms; 280 ms–324 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 5000 | 436 ms (p95 527 ms; 408 ms–527 ms) | – | – | – | 1 | 5/5 |

## Oppstarten: kode og stil hentet fra siden ble åpnet til panelene på forsiden står

| Scenario | Profil | JS overført | JS utpakket | CSS overført | Kodefiler |
| --- | --- | --- | --- | --- | --- |
| kald | rask | 440 kB (p95 440 kB; 440 kB–440 kB) | 1474 kB (p95 1474 kB; 1474 kB–1474 kB) | 35 kB (p95 35 kB; 35 kB–35 kB) | 3 |
| varm | rask | 1 kB (p95 1 kB; 1 kB–1 kB) | 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 1 kB (p95 1 kB; 1 kB–1 kB) | 3 |
| kald | treg | 440 kB (p95 440 kB; 440 kB–440 kB) | 1474 kB (p95 1474 kB; 1474 kB–1474 kB) | 35 kB (p95 35 kB; 35 kB–35 kB) | 3 |
| varm | treg | 1 kB (p95 1 kB; 1 kB–1 kB) | 1474 kB (p95 1474 kB; 0 kB–1474 kB) | 1 kB (p95 1 kB; 1 kB–1 kB) | 3 |

## API-kall startet før merket (første gjentakelse)

| Scenario | Profil | Merke | Kall |
| --- | --- | --- | --- |
| kald | rask | skall | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | rask | forside | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | rask | forside_tittel | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | rask | fagsok_svar | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | rask | forside_paneler | brukerinnstillinger ×6, forsideoppsummering ×4, auth/token, autoerstatt_regler, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | skall | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | forside | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | forside_tittel | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | fagsok_svar | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| varm | rask | forside_paneler | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| fagside | rask | fagside_navn | kuratering_admin, les_bivirkninger, les_stoff |
| fagside | rask | fagside_innhold | brukerinnstillinger, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_cypinfo, les_legemidler, les_stoff |
| fagside | rask | fagside_komplett | brukerinnstillinger, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_cypinfo, les_interaksjoner, les_legemidler, les_stoff |
| direkte | rask | skall | autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_navn | brukerinnstillinger ×2, autoerstatt_regler, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_innhold | brukerinnstillinger ×2, autoerstatt_regler, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_cypinfo, les_forslagsko, les_intervallregelsett, les_kommentarer, les_legemidler, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_komplett | brukerinnstillinger ×2, autoerstatt_regler, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_cypinfo, les_forslagsko, les_interaksjoner, les_intervallregelsett, les_kommentarer, les_legemidler, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| fortolkning | rask | fortolkning | – |
| fortolkning | rask | fortolkning_treff | – |
| fagmiljobytte | rask | forside_tittel | forsideoppsummering ×4, brukerinnstillinger ×2, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_thc_regelsett, mine_chatvalg, mine_direktesamtaler, mine_gruppesamtaler, uleste_varsler, velg_arbeidsfagmiljo |
| fagmiljobytte | rask | forside_paneler | forsideoppsummering ×4, brukerinnstillinger ×2, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_thc_regelsett, mine_chatvalg, mine_direktesamtaler, mine_gruppesamtaler, uleste_varsler, velg_arbeidsfagmiljo |
| kald | treg | skall | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | treg | forside | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | treg | forside_tittel | forsideoppsummering ×4, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| kald | treg | fagsok_svar | forsideoppsummering ×4, les_stoffregister ×2, auth/token, autoerstatt_regler, brukerinnstillinger, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, sokedata_versjoner, stillingskategorier, uleste_varsler |
| kald | treg | forside_paneler | forsideoppsummering ×4, les_stoffregister ×2, auth/token, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, sokedata_versjoner, stillingskategorier, uleste_varsler |
| varm | treg | skall | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | treg | forside | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | treg | forside_tittel | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | treg | fagsok_svar | forsideoppsummering ×4, les_stoffregister ×2, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, sokedata_versjoner, stillingskategorier, uleste_varsler |
| varm | treg | forside_paneler | forsideoppsummering ×4, autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| fagside | treg | fagside_navn | datakilder_status, les_fagsaker, les_stoffregister, rydd_stoffpapirkurven, sokedata_versjoner |
| fagside | treg | fagside_innhold | brukerinnstillinger, datakilder_status, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_fagsaker, les_stoff, les_stoffregister, rydd_stoffpapirkurven, sokedata_versjoner |
| fagside | treg | fagside_komplett | brukerinnstillinger, datakilder_status, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_cypinfo, les_fagsaker, les_interaksjoner, les_legemidler, les_stoff, les_stoffregister, rydd_stoffpapirkurven, sokedata_versjoner |
| direkte | treg | skall | autoerstatt_regler, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_navn | brukerinnstillinger ×2, autoerstatt_regler, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_innhold | brukerinnstillinger ×2, autoerstatt_regler, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_komplett | brukerinnstillinger ×2, les_stoffregister ×2, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_cypinfo, les_fagsaker, les_forslagsko, les_interaksjoner, les_intervallregelsett, les_kommentarer, les_legemidler, les_scenarioregler, les_stoff, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, sokedata_versjoner, stillingskategorier, uleste_varsler |
| fortolkning | treg | fortolkning | datakilder_status, les_fagsaker, les_stoffregister, sokedata_versjoner |
| fortolkning | treg | fortolkning_treff | datakilder_status, les_fagsaker, les_stoffregister, sokedata_versjoner |
| fagmiljobytte | treg | forside_tittel | forsideoppsummering ×4, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_thc_regelsett, mine_chatvalg, mine_direktesamtaler, mine_gruppesamtaler, uleste_varsler, velg_arbeidsfagmiljo |
| fagmiljobytte | treg | forside_paneler | forsideoppsummering ×4, brukerinnstillinger, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_thc_regelsett, mine_chatvalg, mine_direktesamtaler, mine_gruppesamtaler, uleste_varsler, velg_arbeidsfagmiljo |
| brukere | rask | brukere | medlemsoversikt |
| brukere | treg | brukere | medlemsoversikt |

## SQL: personsøkene i databasen (EXPLAIN ANALYZE, uten nett)

| RPC | Hvem | Personer | Søk | Kjøretid: median (p95; min–maks) | Treff | Blokker lest |
| --- | --- | --- | --- | --- | --- | --- |
| sok_gruppekandidater | systemarkitekt | 50 | «nils johansen» | 14 ms (p95 18 ms; 12 ms–18 ms) | 1 | 2070 |
| sok_gruppekandidater | systemarkitekt | 50 | «johanssen» | 17 ms (p95 22 ms; 16 ms–22 ms) | 1 | 2104 |
| sok_gruppekandidater | systemarkitekt | 50 | «an» | 17 ms (p95 22 ms; 13 ms–22 ms) | 10 | 2273 |
| sok_medlemskandidater | systemarkitekt | 50 | «nils johansen» | 10 ms (p95 12 ms; 9 ms–12 ms) | 0 | 1895 |
| sok_medlemskandidater | systemarkitekt | 50 | «johanssen» | 11 ms (p95 12 ms; 10 ms–12 ms) | 2 | 2149 |
| sok_medlemskandidater | systemarkitekt | 50 | «an» | 13 ms (p95 18 ms; 13 ms–18 ms) | 3 | 2147 |
| sok_medlemskandidater | lokal administrator | 50 | «nils johansen» | 12 ms (p95 16 ms; 10 ms–16 ms) | 0 | 2144 |
| sok_medlemskandidater | lokal administrator | 50 | «johanssen» | 15 ms (p95 16 ms; 9 ms–16 ms) | 0 | 2144 |
| sok_medlemskandidater | lokal administrator | 50 | «an» | 11 ms (p95 12 ms; 10 ms–12 ms) | 0 | 2144 |
| sok_direktemottakere | medlem | 50 | «nils johansen» | 10 ms (p95 19 ms; 8 ms–19 ms) | 0 | 1559 |
| sok_direktemottakere | medlem | 50 | «johanssen» | 12 ms (p95 15 ms; 9 ms–15 ms) | 0 | 1765 |
| sok_direktemottakere | medlem | 50 | «an» | 10 ms (p95 15 ms; 9 ms–15 ms) | 3 | 1762 |
| sok_gruppekandidater | systemarkitekt | 500 | «nils johansen» | 51 ms (p95 71 ms; 46 ms–71 ms) | 1 | 2074 |
| sok_gruppekandidater | systemarkitekt | 500 | «johanssen» | 66 ms (p95 70 ms; 53 ms–70 ms) | 18 | 2562 |
| sok_gruppekandidater | systemarkitekt | 500 | «an» | 57 ms (p95 66 ms; 50 ms–66 ms) | 20 | 2547 |
| sok_medlemskandidater | systemarkitekt | 500 | «nils johansen» | 17 ms (p95 26 ms; 16 ms–26 ms) | 0 | 1907 |
| sok_medlemskandidater | systemarkitekt | 500 | «johanssen» | 23 ms (p95 26 ms; 23 ms–26 ms) | 6 | 2348 |
| sok_medlemskandidater | systemarkitekt | 500 | «an» | 21 ms (p95 25 ms; 20 ms–25 ms) | 20 | 2743 |
| sok_medlemskandidater | lokal administrator | 500 | «nils johansen» | 17 ms (p95 17 ms; 11 ms–17 ms) | 0 | 2141 |
| sok_medlemskandidater | lokal administrator | 500 | «johanssen» | 11 ms (p95 12 ms; 10 ms–12 ms) | 0 | 2140 |
| sok_medlemskandidater | lokal administrator | 500 | «an» | 16 ms (p95 17 ms; 10 ms–17 ms) | 0 | 2140 |
| sok_direktemottakere | medlem | 500 | «nils johansen» | 23 ms (p95 36 ms; 21 ms–36 ms) | 0 | 1572 |
| sok_direktemottakere | medlem | 500 | «johanssen» | 28 ms (p95 29 ms; 27 ms–29 ms) | 7 | 1983 |
| sok_direktemottakere | medlem | 500 | «an» | 32 ms (p95 39 ms; 32 ms–39 ms) | 20 | 2159 |
| sok_gruppekandidater | systemarkitekt | 5000 | «nils johansen» | 406 ms (p95 462 ms; 352 ms–462 ms) | 10 | 2630 |
| sok_gruppekandidater | systemarkitekt | 5000 | «johanssen» | 454 ms (p95 490 ms; 365 ms–490 ms) | 20 | 2981 |
| sok_gruppekandidater | systemarkitekt | 5000 | «an» | 369 ms (p95 414 ms; 358 ms–414 ms) | 20 | 2988 |
| sok_medlemskandidater | systemarkitekt | 5000 | «nils johansen» | 90 ms (p95 124 ms; 81 ms–124 ms) | 0 | 2373 |
| sok_medlemskandidater | systemarkitekt | 5000 | «johanssen» | 110 ms (p95 110 ms; 96 ms–110 ms) | 20 | 3332 |
| sok_medlemskandidater | systemarkitekt | 5000 | «an» | 89 ms (p95 107 ms; 70 ms–107 ms) | 20 | 3274 |
| sok_medlemskandidater | lokal administrator | 5000 | «nils johansen» | 20 ms (p95 26 ms; 18 ms–26 ms) | 0 | 2597 |
| sok_medlemskandidater | lokal administrator | 5000 | «johanssen» | 18 ms (p95 20 ms; 17 ms–20 ms) | 0 | 2597 |
| sok_medlemskandidater | lokal administrator | 5000 | «an» | 17 ms (p95 27 ms; 17 ms–27 ms) | 0 | 2597 |
| sok_direktemottakere | medlem | 5000 | «nils johansen» | 164 ms (p95 178 ms; 159 ms–178 ms) | 0 | 1737 |
| sok_direktemottakere | medlem | 5000 | «johanssen» | 226 ms (p95 240 ms; 201 ms–240 ms) | 20 | 2749 |
| sok_direktemottakere | medlem | 5000 | «an» | 165 ms (p95 173 ms; 159 ms–173 ms) | 20 | 2419 |

## Serverens tid per kall (pg_stat_statements, alle gjentakelser i scenariet, over 0,5 ms i snitt)

| Scenario | Profil | Personer | Kall | Antall | Snitt | Maks |
| --- | --- | --- | --- | --- | --- | --- |
| brukere | rask | 50 | les_stoffer | 5 | 487.6 ms | 527.5 ms |
| brukere | rask | 50 | forsideoppsummering | 20 | 15.8 ms | 79.5 ms |
| brukere | rask | 50 | les_kommentarer | 5 | 45.4 ms | 53.7 ms |
| brukere | rask | 50 | medlemsoversikt | 5 | 29.1 ms | 35.8 ms |
| brukere | rask | 50 | les_stoffregister | 11 | 8.3 ms | 15.1 ms |
| brukere | rask | 50 | les_intervallregelsett | 5 | 11.5 ms | 47.2 ms |
| brukere | rask | 50 | les_forslagsko | 10 | 5.1 ms | 12.5 ms |
| brukere | rask | 50 | les_scenarioregler | 5 | 9.3 ms | 27.0 ms |
| brukere | rask | 50 | mine_gruppesamtaler | 5 | 9.1 ms | 13.1 ms |
| brukere | rask | 50 | mine_rettigheter | 5 | 6.0 ms | 7.3 ms |
| brukere | rask | 50 | les_analyttkatalog | 5 | 4.8 ms | 5.9 ms |
| brukere | rask | 50 | mine_grupper | 5 | 4.1 ms | 5.0 ms |
| brukere | rask | 50 | uleste_varsler | 5 | 3.5 ms | 8.0 ms |
| brukere | rask | 50 | kan_endre_lokalt_innhold | 5 | 3.3 ms | 7.5 ms |
| brukere | rask | 50 | les_thc_regelsett | 5 | 2.4 ms | 3.9 ms |
| brukere | rask | 50 | datakilder_status | 5 | 2.4 ms | 4.3 ms |
| brukere | rask | 50 | les_preparatsok | 5 | 2.3 ms | 6.6 ms |
| brukere | rask | 50 | profiles | 5 | 1.8 ms | 2.9 ms |
| brukere | rask | 50 | les_interaksjonssok | 5 | 1.7 ms | 2.2 ms |
| brukere | rask | 50 | ideer_med_nytt | 5 | 1.6 ms | 3.2 ms |
| brukere | rask | 50 | les_fagsaker | 5 | 1.6 ms | 2.2 ms |
| brukere | rask | 50 | sokedata_versjoner | 5 | 1.3 ms | 2.1 ms |
| brukere | rask | 50 | mine_direktesamtaler | 5 | 1.3 ms | 2.2 ms |
| brukere | rask | 50 | stillingskategorier | 5 | 1.1 ms | 2.7 ms |
| brukere | rask | 50 | les_laboratoriesok | 5 | 1.1 ms | 2.3 ms |
| brukere | rask | 50 | rydd_stoffpapirkurven | 5 | 1.0 ms | 1.4 ms |
| brukere | rask | 50 | les_mine_forslag | 5 | 0.9 ms | 1.0 ms |
| brukere | rask | 50 | mine_chatvalg | 5 | 0.7 ms | 1.2 ms |
| brukere | rask | 50 | er_systemarkitekt | 5 | 0.7 ms | 0.9 ms |
| brukere | rask | 50 | min_profil | 5 | 0.6 ms | 0.7 ms |
| brukere | rask | 500 | les_stoffer | 5 | 520.9 ms | 559.1 ms |
| brukere | rask | 500 | medlemsoversikt | 5 | 224.1 ms | 258.9 ms |
| brukere | rask | 500 | forsideoppsummering | 20 | 17.7 ms | 65.9 ms |
| brukere | rask | 500 | les_kommentarer | 5 | 46.6 ms | 65.1 ms |
| brukere | rask | 500 | les_stoffregister | 10 | 7.2 ms | 17.0 ms |
| brukere | rask | 500 | les_scenarioregler | 5 | 10.4 ms | 13.3 ms |
| brukere | rask | 500 | les_forslagsko | 10 | 5.1 ms | 12.6 ms |
| brukere | rask | 500 | mine_gruppesamtaler | 5 | 7.6 ms | 12.5 ms |
| brukere | rask | 500 | mine_rettigheter | 5 | 6.3 ms | 7.6 ms |
| brukere | rask | 500 | mine_grupper | 5 | 4.8 ms | 5.6 ms |
| brukere | rask | 500 | les_analyttkatalog | 5 | 4.5 ms | 5.7 ms |
| brukere | rask | 500 | profiles | 5 | 4.2 ms | 8.5 ms |
| brukere | rask | 500 | les_thc_regelsett | 5 | 4.0 ms | 6.7 ms |
| brukere | rask | 500 | les_intervallregelsett | 5 | 2.8 ms | 5.2 ms |
| brukere | rask | 500 | kan_endre_lokalt_innhold | 5 | 2.6 ms | 5.2 ms |
| brukere | rask | 500 | ideer_med_nytt | 5 | 2.1 ms | 5.0 ms |
| brukere | rask | 500 | les_preparatsok | 5 | 1.7 ms | 4.0 ms |
| brukere | rask | 500 | les_mine_forslag | 5 | 1.5 ms | 3.0 ms |
| brukere | rask | 500 | les_laboratoriesok | 5 | 1.3 ms | 3.8 ms |
| brukere | rask | 500 | les_stoffavoritter | 5 | 1.3 ms | 5.1 ms |
| brukere | rask | 500 | brukerinnstillinger | 5 | 1.3 ms | 4.4 ms |
| brukere | rask | 500 | datakilder_status | 5 | 1.3 ms | 1.6 ms |
| brukere | rask | 500 | sokedata_versjoner | 5 | 1.2 ms | 1.6 ms |
| brukere | rask | 500 | les_fagsaker | 5 | 1.1 ms | 1.8 ms |
| brukere | rask | 500 | uleste_varsler | 5 | 1.1 ms | 1.4 ms |
| brukere | rask | 500 | mine_chatvalg | 5 | 1.1 ms | 2.3 ms |
| brukere | rask | 500 | stillingskategorier | 5 | 1.1 ms | 2.4 ms |
| brukere | rask | 500 | mine_direktesamtaler | 5 | 1.0 ms | 2.5 ms |
| brukere | rask | 500 | les_interaksjonssok | 5 | 1.0 ms | 1.4 ms |
| brukere | rask | 500 | rydd_stoffpapirkurven | 5 | 0.9 ms | 1.1 ms |
| brukere | rask | 500 | er_systemarkitekt | 5 | 0.7 ms | 0.9 ms |
| brukere | rask | 500 | min_profil | 5 | 0.7 ms | 0.8 ms |
| brukere | rask | 5000 | medlemsoversikt | 5 | 2032.5 ms | 2114.6 ms |
| brukere | rask | 5000 | les_stoffer | 5 | 496.4 ms | 562.5 ms |
| brukere | rask | 5000 | forsideoppsummering | 20 | 15.2 ms | 60.8 ms |
| brukere | rask | 5000 | les_kommentarer | 5 | 49.8 ms | 66.5 ms |
| brukere | rask | 5000 | les_forslagsko | 10 | 14.8 ms | 23.7 ms |
| brukere | rask | 5000 | les_stoffregister | 13 | 9.2 ms | 18.1 ms |
| brukere | rask | 5000 | les_thc_regelsett | 5 | 11.3 ms | 26.8 ms |
| brukere | rask | 5000 | mine_rettigheter | 5 | 7.6 ms | 14.1 ms |
| brukere | rask | 5000 | mine_gruppesamtaler | 5 | 7.6 ms | 11.4 ms |
| brukere | rask | 5000 | profiles | 5 | 6.8 ms | 12.4 ms |
| brukere | rask | 5000 | les_scenarioregler | 5 | 6.3 ms | 9.0 ms |
| brukere | rask | 5000 | ideer_med_nytt | 5 | 6.2 ms | 12.7 ms |
| brukere | rask | 5000 | mine_grupper | 5 | 4.8 ms | 6.5 ms |
| brukere | rask | 5000 | les_analyttkatalog | 5 | 4.6 ms | 7.1 ms |
| brukere | rask | 5000 | les_intervallregelsett | 5 | 3.3 ms | 6.2 ms |
| brukere | rask | 5000 | kan_endre_lokalt_innhold | 5 | 2.0 ms | 3.3 ms |
| brukere | rask | 5000 | les_interaksjonssok | 5 | 1.9 ms | 3.4 ms |
| brukere | rask | 5000 | datakilder_status | 5 | 1.8 ms | 3.9 ms |
| brukere | rask | 5000 | les_fagsaker | 5 | 1.5 ms | 2.3 ms |
| brukere | rask | 5000 | mine_chatvalg | 5 | 1.4 ms | 4.3 ms |
| brukere | rask | 5000 | sokedata_versjoner | 5 | 1.4 ms | 1.8 ms |
| brukere | rask | 5000 | uleste_varsler | 5 | 1.3 ms | 1.8 ms |
| brukere | rask | 5000 | rydd_stoffpapirkurven | 5 | 1.3 ms | 2.4 ms |
| brukere | rask | 5000 | les_laboratoriesok | 5 | 1.2 ms | 2.1 ms |
| brukere | rask | 5000 | min_profil | 5 | 1.0 ms | 2.0 ms |
| brukere | rask | 5000 | les_preparatsok | 5 | 0.9 ms | 1.3 ms |
| brukere | rask | 5000 | les_mine_forslag | 5 | 0.9 ms | 1.1 ms |
| brukere | rask | 5000 | autoerstatt_regler | 5 | 0.8 ms | 2.2 ms |
| brukere | rask | 5000 | mine_direktesamtaler | 5 | 0.8 ms | 2.0 ms |
| brukere | rask | 5000 | stillingskategorier | 5 | 0.7 ms | 0.9 ms |
| brukere | rask | 5000 | er_systemarkitekt | 5 | 0.6 ms | 0.7 ms |
| brukere | treg | 50 | les_stoffer | 3 | 530.8 ms | 562.2 ms |
| brukere | treg | 50 | forsideoppsummering | 20 | 17.7 ms | 55.9 ms |
| brukere | treg | 50 | les_kommentarer | 5 | 41.1 ms | 57.6 ms |
| brukere | treg | 50 | medlemsoversikt | 5 | 36.7 ms | 53.2 ms |
| brukere | treg | 50 | les_stoffregister | 8 | 6.5 ms | 9.6 ms |
| brukere | treg | 50 | mine_gruppesamtaler | 5 | 8.5 ms | 14.2 ms |
| brukere | treg | 50 | les_forslagsko | 10 | 4.1 ms | 10.5 ms |
| brukere | treg | 50 | mine_rettigheter | 5 | 7.2 ms | 12.0 ms |
| brukere | treg | 50 | les_scenarioregler | 5 | 6.6 ms | 9.8 ms |
| brukere | treg | 50 | mine_grupper | 5 | 5.8 ms | 6.3 ms |
| brukere | treg | 50 | les_analyttkatalog | 5 | 5.2 ms | 7.0 ms |
| brukere | treg | 50 | les_thc_regelsett | 5 | 3.6 ms | 7.2 ms |
| brukere | treg | 50 | les_intervallregelsett | 5 | 3.0 ms | 4.4 ms |
| brukere | treg | 50 | uleste_varsler | 5 | 2.5 ms | 3.7 ms |
| brukere | treg | 50 | profiles | 5 | 2.3 ms | 6.0 ms |
| brukere | treg | 50 | kan_endre_lokalt_innhold | 5 | 2.2 ms | 3.3 ms |
| brukere | treg | 50 | ideer_med_nytt | 5 | 1.8 ms | 2.2 ms |
| brukere | treg | 50 | mine_direktesamtaler | 5 | 1.3 ms | 2.7 ms |
| brukere | treg | 50 | datakilder_status | 5 | 1.2 ms | 1.9 ms |
| brukere | treg | 50 | les_mine_forslag | 5 | 0.9 ms | 1.2 ms |
| brukere | treg | 50 | stillingskategorier | 5 | 0.9 ms | 1.3 ms |
| brukere | treg | 50 | min_profil | 5 | 0.8 ms | 1.6 ms |
| brukere | treg | 50 | rydd_stoffpapirkurven | 3 | 1.2 ms | 1.7 ms |
| brukere | treg | 50 | er_systemarkitekt | 5 | 0.7 ms | 0.9 ms |
| brukere | treg | 50 | sokedata_versjoner | 3 | 1.2 ms | 1.5 ms |
| brukere | treg | 50 | autoerstatt_regler | 5 | 0.6 ms | 1.0 ms |
| brukere | treg | 50 | les_preparatsok | 3 | 0.9 ms | 1.0 ms |
| brukere | treg | 50 | brukerinnstillinger | 5 | 0.5 ms | 0.8 ms |
| brukere | treg | 50 | mine_chatvalg | 5 | 0.5 ms | 0.8 ms |
| brukere | treg | 50 | les_fagsaker | 3 | 0.8 ms | 1.0 ms |
| brukere | treg | 50 | les_interaksjonssok | 3 | 0.8 ms | 0.9 ms |
| brukere | treg | 50 | les_laboratoriesok | 3 | 0.8 ms | 1.2 ms |
| brukere | treg | 500 | les_stoffer | 5 | 540.3 ms | 597.1 ms |
| brukere | treg | 500 | medlemsoversikt | 5 | 286.8 ms | 337.0 ms |
| brukere | treg | 500 | forsideoppsummering | 20 | 12.4 ms | 42.5 ms |
| brukere | treg | 500 | les_kommentarer | 5 | 32.6 ms | 38.3 ms |
| brukere | treg | 500 | les_stoffregister | 10 | 5.6 ms | 8.9 ms |
| brukere | treg | 500 | les_forslagsko | 10 | 3.9 ms | 9.6 ms |
| brukere | treg | 500 | les_scenarioregler | 5 | 7.1 ms | 11.0 ms |
| brukere | treg | 500 | mine_rettigheter | 5 | 6.9 ms | 8.5 ms |
| brukere | treg | 500 | mine_gruppesamtaler | 5 | 6.5 ms | 8.4 ms |
| brukere | treg | 500 | mine_grupper | 5 | 4.8 ms | 5.9 ms |
| brukere | treg | 500 | les_analyttkatalog | 5 | 4.6 ms | 6.3 ms |
| brukere | treg | 500 | profiles | 5 | 3.3 ms | 7.6 ms |
| brukere | treg | 500 | les_intervallregelsett | 5 | 2.5 ms | 3.7 ms |
| brukere | treg | 500 | les_thc_regelsett | 5 | 2.2 ms | 3.5 ms |
| brukere | treg | 500 | kan_endre_lokalt_innhold | 5 | 2.1 ms | 3.8 ms |
| brukere | treg | 500 | ideer_med_nytt | 5 | 1.9 ms | 3.4 ms |
| brukere | treg | 500 | uleste_varsler | 5 | 1.4 ms | 1.8 ms |
| brukere | treg | 500 | sokedata_versjoner | 5 | 1.4 ms | 1.6 ms |
| brukere | treg | 500 | rydd_stoffpapirkurven | 5 | 1.3 ms | 2.1 ms |
| brukere | treg | 500 | les_preparatsok | 5 | 1.1 ms | 1.3 ms |
| brukere | treg | 500 | stillingskategorier | 5 | 1.0 ms | 1.7 ms |
| brukere | treg | 500 | datakilder_status | 5 | 1.0 ms | 1.4 ms |
| brukere | treg | 500 | les_interaksjonssok | 5 | 1.0 ms | 1.7 ms |
| brukere | treg | 500 | les_fagsaker | 5 | 0.9 ms | 1.0 ms |
| brukere | treg | 500 | les_laboratoriesok | 5 | 0.9 ms | 1.6 ms |
| brukere | treg | 500 | les_mine_forslag | 5 | 0.8 ms | 1.2 ms |
| brukere | treg | 500 | mine_chatvalg | 5 | 0.8 ms | 1.3 ms |
| brukere | treg | 500 | er_systemarkitekt | 5 | 0.7 ms | 1.0 ms |
| brukere | treg | 500 | brukerinnstillinger | 5 | 0.7 ms | 1.6 ms |
| brukere | treg | 500 | autoerstatt_regler | 5 | 0.7 ms | 0.8 ms |
| brukere | treg | 500 | min_profil | 5 | 0.6 ms | 0.7 ms |
| brukere | treg | 500 | mine_direktesamtaler | 5 | 0.6 ms | 0.7 ms |
| brukere | treg | 5000 | medlemsoversikt | 5 | 1963.2 ms | 2194.5 ms |
| brukere | treg | 5000 | les_stoffer | 5 | 477.7 ms | 533.1 ms |
| brukere | treg | 5000 | forsideoppsummering | 20 | 13.3 ms | 43.1 ms |
| brukere | treg | 5000 | les_kommentarer | 5 | 39.7 ms | 60.4 ms |
| brukere | treg | 5000 | les_forslagsko | 10 | 14.4 ms | 26.1 ms |
| brukere | treg | 5000 | les_stoffregister | 10 | 5.4 ms | 7.8 ms |
| brukere | treg | 5000 | mine_rettigheter | 5 | 7.5 ms | 8.3 ms |
| brukere | treg | 5000 | les_scenarioregler | 5 | 5.6 ms | 7.7 ms |
| brukere | treg | 5000 | mine_gruppesamtaler | 5 | 5.6 ms | 9.5 ms |
| brukere | treg | 5000 | profiles | 5 | 5.2 ms | 8.6 ms |
| brukere | treg | 5000 | mine_grupper | 5 | 5.1 ms | 6.5 ms |
| brukere | treg | 5000 | les_analyttkatalog | 5 | 4.6 ms | 5.2 ms |
| brukere | treg | 5000 | les_thc_regelsett | 5 | 4.4 ms | 11.6 ms |
| brukere | treg | 5000 | les_interaksjonssok | 5 | 2.9 ms | 5.2 ms |
| brukere | treg | 5000 | uleste_varsler | 5 | 2.7 ms | 4.6 ms |
| brukere | treg | 5000 | les_intervallregelsett | 5 | 2.6 ms | 3.5 ms |
| brukere | treg | 5000 | datakilder_status | 5 | 2.3 ms | 3.3 ms |
| brukere | treg | 5000 | les_preparatsok | 5 | 2.1 ms | 5.6 ms |
| brukere | treg | 5000 | kan_endre_lokalt_innhold | 5 | 2.1 ms | 3.0 ms |
| brukere | treg | 5000 | ideer_med_nytt | 5 | 1.8 ms | 2.4 ms |
| brukere | treg | 5000 | stillingskategorier | 5 | 1.6 ms | 3.1 ms |
| brukere | treg | 5000 | mine_direktesamtaler | 5 | 1.6 ms | 2.2 ms |
| brukere | treg | 5000 | sokedata_versjoner | 5 | 1.5 ms | 1.9 ms |
| brukere | treg | 5000 | rydd_stoffpapirkurven | 5 | 1.4 ms | 1.7 ms |
| brukere | treg | 5000 | les_fagsaker | 5 | 1.1 ms | 1.8 ms |
| brukere | treg | 5000 | les_laboratoriesok | 5 | 1.1 ms | 1.5 ms |
| brukere | treg | 5000 | les_mine_forslag | 5 | 1.0 ms | 1.1 ms |
| brukere | treg | 5000 | er_systemarkitekt | 5 | 1.0 ms | 1.7 ms |
| brukere | treg | 5000 | mine_chatvalg | 5 | 0.7 ms | 0.8 ms |
| brukere | treg | 5000 | min_profil | 5 | 0.6 ms | 0.7 ms |
| direkte | rask | 500 | les_stoffer | 5 | 421.7 ms | 486.7 ms |
| direkte | rask | 500 | les_kommentarer | 10 | 59.0 ms | 68.8 ms |
| direkte | rask | 500 | forsideoppsummering | 20 | 19.9 ms | 89.8 ms |
| direkte | rask | 500 | les_stoff | 5 | 44.8 ms | 53.4 ms |
| direkte | rask | 500 | les_stoffregister | 18 | 9.1 ms | 26.3 ms |
| direkte | rask | 500 | les_scenarioregler | 10 | 7.9 ms | 17.5 ms |
| direkte | rask | 500 | mine_gruppesamtaler | 10 | 7.7 ms | 13.6 ms |
| direkte | rask | 500 | mine_rettigheter | 10 | 7.1 ms | 9.8 ms |
| direkte | rask | 500 | les_analyttkatalog | 10 | 6.5 ms | 18.4 ms |
| direkte | rask | 500 | les_forslagsko | 10 | 5.5 ms | 11.7 ms |
| direkte | rask | 500 | mine_grupper | 10 | 5.3 ms | 9.5 ms |
| direkte | rask | 500 | les_intervallregelsett | 10 | 3.7 ms | 7.0 ms |
| direkte | rask | 500 | les_thc_regelsett | 10 | 3.0 ms | 7.2 ms |
| direkte | rask | 500 | datakilder_status | 10 | 2.1 ms | 4.0 ms |
| direkte | rask | 500 | ideer_med_nytt | 10 | 2.1 ms | 6.1 ms |
| direkte | rask | 500 | profiles | 5 | 3.6 ms | 5.6 ms |
| direkte | rask | 500 | kan_endre_lokalt_innhold | 10 | 1.7 ms | 2.9 ms |
| direkte | rask | 500 | diskusjonsoversikt | 5 | 3.2 ms | 4.6 ms |
| direkte | rask | 500 | sokedata_versjoner | 10 | 1.5 ms | 3.9 ms |
| direkte | rask | 500 | les_bivirkninger | 5 | 3.0 ms | 6.6 ms |
| direkte | rask | 500 | les_interaksjonssok | 5 | 2.8 ms | 7.0 ms |
| direkte | rask | 500 | stillingskategorier | 10 | 1.3 ms | 5.5 ms |
| direkte | rask | 500 | les_fagsaker | 10 | 1.2 ms | 2.3 ms |
| direkte | rask | 500 | er_systemarkitekt | 10 | 1.2 ms | 2.9 ms |
| direkte | rask | 500 | uleste_varsler | 10 | 1.1 ms | 1.4 ms |
| direkte | rask | 500 | rydd_stoffpapirkurven | 10 | 1.1 ms | 1.5 ms |
| direkte | rask | 500 | kuratering_admin | 5 | 2.0 ms | 5.3 ms |
| direkte | rask | 500 | mine_direktesamtaler | 10 | 0.9 ms | 1.3 ms |
| direkte | rask | 500 | les_stoffavoritter | 10 | 0.9 ms | 6.3 ms |
| direkte | rask | 500 | les_cypinfo | 5 | 1.7 ms | 2.5 ms |
| direkte | rask | 500 | les_interaksjoner | 5 | 1.6 ms | 2.3 ms |
| direkte | rask | 500 | min_profil | 10 | 0.7 ms | 1.0 ms |
| direkte | rask | 500 | mine_chatvalg | 10 | 0.6 ms | 1.8 ms |
| direkte | rask | 500 | autoerstatt_regler | 10 | 0.5 ms | 1.5 ms |
| direkte | rask | 500 | les_laboratoriesok | 5 | 0.9 ms | 0.9 ms |
| direkte | rask | 500 | les_preparatsok | 5 | 0.8 ms | 0.9 ms |
| direkte | treg | 500 | les_stoffer | 5 | 505.6 ms | 559.4 ms |
| direkte | treg | 500 | les_kommentarer | 10 | 37.8 ms | 47.8 ms |
| direkte | treg | 500 | forsideoppsummering | 20 | 13.1 ms | 47.4 ms |
| direkte | treg | 500 | les_stoff | 5 | 25.4 ms | 28.9 ms |
| direkte | treg | 500 | mine_gruppesamtaler | 10 | 8.7 ms | 17.7 ms |
| direkte | treg | 500 | mine_rettigheter | 10 | 7.5 ms | 11.8 ms |
| direkte | treg | 500 | les_stoffregister | 15 | 4.8 ms | 9.5 ms |
| direkte | treg | 500 | mine_grupper | 10 | 5.4 ms | 8.4 ms |
| direkte | treg | 500 | les_analyttkatalog | 10 | 5.2 ms | 7.6 ms |
| direkte | treg | 500 | les_forslagsko | 10 | 4.4 ms | 8.9 ms |
| direkte | treg | 500 | les_scenarioregler | 10 | 4.2 ms | 6.1 ms |
| direkte | treg | 500 | ideer_med_nytt | 10 | 3.5 ms | 8.4 ms |
| direkte | treg | 500 | les_intervallregelsett | 10 | 2.5 ms | 3.7 ms |
| direkte | treg | 500 | les_thc_regelsett | 10 | 2.5 ms | 4.2 ms |
| direkte | treg | 500 | kan_endre_lokalt_innhold | 10 | 1.8 ms | 3.5 ms |
| direkte | treg | 500 | diskusjonsoversikt | 5 | 3.4 ms | 4.2 ms |
| direkte | treg | 500 | profiles | 5 | 3.1 ms | 5.5 ms |
| direkte | treg | 500 | uleste_varsler | 10 | 1.5 ms | 4.5 ms |
| direkte | treg | 500 | sokedata_versjoner | 9 | 1.6 ms | 3.9 ms |
| direkte | treg | 500 | stillingskategorier | 10 | 1.4 ms | 4.7 ms |
| direkte | treg | 500 | brukerinnstillinger | 15 | 0.8 ms | 4.7 ms |
| direkte | treg | 500 | er_systemarkitekt | 10 | 1.1 ms | 4.5 ms |
| direkte | treg | 500 | les_stoffavoritter | 10 | 1.0 ms | 6.0 ms |
| direkte | treg | 500 | datakilder_status | 9 | 1.0 ms | 1.3 ms |
| direkte | treg | 500 | rydd_stoffpapirkurven | 9 | 0.9 ms | 1.3 ms |
| direkte | treg | 500 | les_bivirkninger | 5 | 1.7 ms | 2.2 ms |
| direkte | treg | 500 | mine_direktesamtaler | 10 | 0.8 ms | 2.8 ms |
| direkte | treg | 500 | les_cypinfo | 5 | 1.5 ms | 1.9 ms |
| direkte | treg | 500 | les_interaksjonssok | 4 | 1.8 ms | 3.1 ms |
| direkte | treg | 500 | min_profil | 10 | 0.7 ms | 1.1 ms |
| direkte | treg | 500 | les_fagsaker | 9 | 0.8 ms | 1.1 ms |
| direkte | treg | 500 | mine_chatvalg | 10 | 0.6 ms | 1.1 ms |
| direkte | treg | 500 | autoerstatt_regler | 10 | 0.5 ms | 1.0 ms |
| direkte | treg | 500 | les_interaksjoner | 5 | 1.0 ms | 1.2 ms |
| direkte | treg | 500 | kuratering_admin | 5 | 1.0 ms | 1.4 ms |
| direkte | treg | 500 | les_preparatsok | 4 | 1.1 ms | 1.5 ms |
| direkte | treg | 500 | les_laboratoriesok | 4 | 0.8 ms | 0.9 ms |
| fagmiljobytte | rask | 500 | les_stoffer | 5 | 502.3 ms | 535.6 ms |
| fagmiljobytte | rask | 500 | forsideoppsummering | 40 | 15.2 ms | 63.0 ms |
| fagmiljobytte | rask | 500 | les_kommentarer | 10 | 43.6 ms | 56.4 ms |
| fagmiljobytte | rask | 500 | les_stoffregister | 14 | 9.3 ms | 22.6 ms |
| fagmiljobytte | rask | 500 | les_forslagsko | 15 | 4.9 ms | 12.5 ms |
| fagmiljobytte | rask | 500 | les_scenarioregler | 10 | 7.0 ms | 12.4 ms |
| fagmiljobytte | rask | 500 | les_thc_regelsett | 10 | 5.6 ms | 34.0 ms |
| fagmiljobytte | rask | 500 | mine_gruppesamtaler | 10 | 5.4 ms | 11.6 ms |
| fagmiljobytte | rask | 500 | mine_rettigheter | 5 | 7.1 ms | 9.2 ms |
| fagmiljobytte | rask | 500 | velg_arbeidsfagmiljo | 5 | 7.0 ms | 8.7 ms |
| fagmiljobytte | rask | 500 | les_analyttkatalog | 10 | 3.5 ms | 9.3 ms |
| fagmiljobytte | rask | 500 | ideer_med_nytt | 10 | 3.2 ms | 8.7 ms |
| fagmiljobytte | rask | 500 | mine_grupper | 5 | 6.2 ms | 8.6 ms |
| fagmiljobytte | rask | 500 | les_intervallregelsett | 10 | 2.9 ms | 6.6 ms |
| fagmiljobytte | rask | 500 | les_interaksjonssok | 5 | 5.0 ms | 15.2 ms |
| fagmiljobytte | rask | 500 | kan_endre_lokalt_innhold | 10 | 2.3 ms | 9.8 ms |
| fagmiljobytte | rask | 500 | brukerinnstillinger | 19 | 1.2 ms | 5.1 ms |
| fagmiljobytte | rask | 500 | uleste_varsler | 10 | 1.4 ms | 4.3 ms |
| fagmiljobytte | rask | 500 | profiles | 5 | 2.3 ms | 3.2 ms |
| fagmiljobytte | rask | 500 | mine_direktesamtaler | 10 | 1.1 ms | 3.3 ms |
| fagmiljobytte | rask | 500 | mine_chatvalg | 10 | 1.0 ms | 4.9 ms |
| fagmiljobytte | rask | 500 | datakilder_status | 6 | 1.5 ms | 2.1 ms |
| fagmiljobytte | rask | 500 | er_systemarkitekt | 10 | 0.9 ms | 1.6 ms |
| fagmiljobytte | rask | 500 | les_fagsaker | 6 | 1.4 ms | 3.5 ms |
| fagmiljobytte | rask | 500 | sokedata_versjoner | 5 | 1.2 ms | 1.4 ms |
| fagmiljobytte | rask | 500 | autoerstatt_regler | 5 | 1.2 ms | 3.6 ms |
| fagmiljobytte | rask | 500 | les_preparatsok | 5 | 0.9 ms | 1.2 ms |
| fagmiljobytte | rask | 500 | rydd_stoffpapirkurven | 5 | 0.9 ms | 1.3 ms |
| fagmiljobytte | rask | 500 | stillingskategorier | 5 | 0.8 ms | 1.1 ms |
| fagmiljobytte | rask | 500 | les_laboratoriesok | 5 | 0.8 ms | 0.8 ms |
| fagmiljobytte | rask | 500 | min_profil | 5 | 0.7 ms | 1.0 ms |
| fagmiljobytte | rask | 500 | les_stoffavoritter | 5 | 0.6 ms | 1.4 ms |
| fagmiljobytte | treg | 500 | les_stoffer | 5 | 573.9 ms | 673.8 ms |
| fagmiljobytte | treg | 500 | forsideoppsummering | 40 | 13.0 ms | 59.6 ms |
| fagmiljobytte | treg | 500 | les_kommentarer | 10 | 41.6 ms | 51.1 ms |
| fagmiljobytte | treg | 500 | les_stoffregister | 10 | 10.3 ms | 32.3 ms |
| fagmiljobytte | treg | 500 | les_forslagsko | 15 | 5.7 ms | 21.1 ms |
| fagmiljobytte | treg | 500 | mine_rettigheter | 5 | 12.8 ms | 23.2 ms |
| fagmiljobytte | treg | 500 | les_scenarioregler | 10 | 5.9 ms | 9.9 ms |
| fagmiljobytte | treg | 500 | mine_gruppesamtaler | 10 | 5.4 ms | 7.4 ms |
| fagmiljobytte | treg | 500 | les_analyttkatalog | 10 | 4.5 ms | 14.7 ms |
| fagmiljobytte | treg | 500 | velg_arbeidsfagmiljo | 5 | 7.4 ms | 10.2 ms |
| fagmiljobytte | treg | 500 | les_thc_regelsett | 10 | 3.4 ms | 9.5 ms |
| fagmiljobytte | treg | 500 | brukerinnstillinger | 15 | 2.0 ms | 23.1 ms |
| fagmiljobytte | treg | 500 | les_intervallregelsett | 10 | 2.6 ms | 4.9 ms |
| fagmiljobytte | treg | 500 | ideer_med_nytt | 10 | 2.6 ms | 9.0 ms |
| fagmiljobytte | treg | 500 | uleste_varsler | 10 | 2.5 ms | 7.7 ms |
| fagmiljobytte | treg | 500 | profiles | 5 | 5.0 ms | 12.1 ms |
| fagmiljobytte | treg | 500 | mine_grupper | 5 | 4.6 ms | 5.8 ms |
| fagmiljobytte | treg | 500 | kan_endre_lokalt_innhold | 10 | 2.1 ms | 3.0 ms |
| fagmiljobytte | treg | 500 | er_systemarkitekt | 10 | 0.9 ms | 2.3 ms |
| fagmiljobytte | treg | 500 | rydd_stoffpapirkurven | 5 | 1.8 ms | 4.4 ms |
| fagmiljobytte | treg | 500 | sokedata_versjoner | 5 | 1.5 ms | 2.4 ms |
| fagmiljobytte | treg | 500 | mine_direktesamtaler | 10 | 0.7 ms | 1.2 ms |
| fagmiljobytte | treg | 500 | stillingskategorier | 5 | 1.4 ms | 2.7 ms |
| fagmiljobytte | treg | 500 | les_interaksjonssok | 5 | 1.2 ms | 2.3 ms |
| fagmiljobytte | treg | 500 | datakilder_status | 5 | 1.2 ms | 2.0 ms |
| fagmiljobytte | treg | 500 | les_preparatsok | 5 | 1.1 ms | 1.6 ms |
| fagmiljobytte | treg | 500 | mine_chatvalg | 10 | 0.5 ms | 0.8 ms |
| fagmiljobytte | treg | 500 | les_laboratoriesok | 5 | 1.0 ms | 2.1 ms |
| fagmiljobytte | treg | 500 | min_profil | 5 | 0.9 ms | 1.4 ms |
| fagmiljobytte | treg | 500 | les_fagsaker | 5 | 0.8 ms | 1.0 ms |
| fagmiljobytte | treg | 500 | autoerstatt_regler | 5 | 0.6 ms | 0.9 ms |
| fagmiljobytte | treg | 500 | les_stoffavoritter | 5 | 0.6 ms | 1.7 ms |
| fagside | rask | 500 | les_stoffer | 5 | 465.0 ms | 528.0 ms |
| fagside | rask | 500 | forsideoppsummering | 20 | 21.8 ms | 63.9 ms |
| fagside | rask | 500 | les_kommentarer | 5 | 49.5 ms | 68.1 ms |
| fagside | rask | 500 | les_stoff | 5 | 40.8 ms | 59.0 ms |
| fagside | rask | 500 | mine_gruppesamtaler | 5 | 16.8 ms | 29.2 ms |
| fagside | rask | 500 | les_stoffregister | 10 | 6.7 ms | 10.4 ms |
| fagside | rask | 500 | les_scenarioregler | 5 | 7.8 ms | 14.9 ms |
| fagside | rask | 500 | mine_rettigheter | 5 | 5.7 ms | 6.5 ms |
| fagside | rask | 500 | ideer_med_nytt | 5 | 5.3 ms | 13.1 ms |
| fagside | rask | 500 | diskusjonsoversikt | 5 | 5.0 ms | 9.5 ms |
| fagside | rask | 500 | profiles | 5 | 4.8 ms | 10.1 ms |
| fagside | rask | 500 | mine_grupper | 5 | 4.4 ms | 6.1 ms |
| fagside | rask | 500 | les_forslagsko | 5 | 4.0 ms | 5.8 ms |
| fagside | rask | 500 | les_analyttkatalog | 5 | 4.0 ms | 4.7 ms |
| fagside | rask | 500 | les_intervallregelsett | 5 | 3.2 ms | 5.9 ms |
| fagside | rask | 500 | les_bivirkninger | 5 | 2.7 ms | 4.3 ms |
| fagside | rask | 500 | les_interaksjonssok | 5 | 2.6 ms | 4.9 ms |
| fagside | rask | 500 | stillingskategorier | 5 | 2.3 ms | 8.3 ms |
| fagside | rask | 500 | datakilder_status | 5 | 2.3 ms | 3.4 ms |
| fagside | rask | 500 | les_cypinfo | 5 | 2.2 ms | 3.5 ms |
| fagside | rask | 500 | les_thc_regelsett | 5 | 1.8 ms | 2.1 ms |
| fagside | rask | 500 | kuratering_admin | 5 | 1.7 ms | 3.1 ms |
| fagside | rask | 500 | er_systemarkitekt | 5 | 1.7 ms | 5.1 ms |
| fagside | rask | 500 | autoerstatt_regler | 5 | 1.6 ms | 5.3 ms |
| fagside | rask | 500 | uleste_varsler | 5 | 1.6 ms | 3.9 ms |
| fagside | rask | 500 | les_interaksjoner | 5 | 1.4 ms | 1.7 ms |
| fagside | rask | 500 | kan_endre_lokalt_innhold | 5 | 1.4 ms | 1.9 ms |
| fagside | rask | 500 | sokedata_versjoner | 5 | 1.4 ms | 2.3 ms |
| fagside | rask | 500 | les_fagsaker | 5 | 1.2 ms | 1.5 ms |
| fagside | rask | 500 | rydd_stoffpapirkurven | 5 | 1.2 ms | 1.9 ms |
| fagside | rask | 500 | mine_direktesamtaler | 5 | 1.1 ms | 2.0 ms |
| fagside | rask | 500 | les_preparatsok | 5 | 1.1 ms | 1.5 ms |
| fagside | rask | 500 | les_laboratoriesok | 5 | 1.0 ms | 1.1 ms |
| fagside | rask | 500 | min_profil | 5 | 0.6 ms | 0.7 ms |
| fagside | rask | 500 | les_stoffavoritter | 5 | 0.5 ms | 1.3 ms |
| fagside | treg | 500 | les_stoffer | 5 | 586.5 ms | 660.9 ms |
| fagside | treg | 500 | forsideoppsummering | 20 | 13.6 ms | 54.1 ms |
| fagside | treg | 500 | les_stoff | 5 | 46.1 ms | 75.4 ms |
| fagside | treg | 500 | les_kommentarer | 5 | 45.4 ms | 61.8 ms |
| fagside | treg | 500 | les_stoffregister | 10 | 5.8 ms | 11.2 ms |
| fagside | treg | 500 | les_forslagsko | 5 | 6.9 ms | 13.9 ms |
| fagside | treg | 500 | mine_rettigheter | 5 | 6.7 ms | 8.1 ms |
| fagside | treg | 500 | mine_gruppesamtaler | 5 | 6.3 ms | 10.7 ms |
| fagside | treg | 500 | les_scenarioregler | 5 | 5.2 ms | 6.6 ms |
| fagside | treg | 500 | les_intervallregelsett | 5 | 4.4 ms | 10.2 ms |
| fagside | treg | 500 | mine_grupper | 5 | 4.3 ms | 6.9 ms |
| fagside | treg | 500 | les_analyttkatalog | 5 | 4.0 ms | 4.6 ms |
| fagside | treg | 500 | profiles | 5 | 4.0 ms | 8.3 ms |
| fagside | treg | 500 | diskusjonsoversikt | 5 | 3.7 ms | 5.9 ms |
| fagside | treg | 500 | les_cypinfo | 5 | 2.9 ms | 7.3 ms |
| fagside | treg | 500 | les_thc_regelsett | 5 | 2.7 ms | 4.7 ms |
| fagside | treg | 500 | les_bivirkninger | 5 | 1.9 ms | 2.8 ms |
| fagside | treg | 500 | stillingskategorier | 5 | 1.9 ms | 4.1 ms |
| fagside | treg | 500 | les_interaksjoner | 5 | 1.8 ms | 4.2 ms |
| fagside | treg | 500 | brukerinnstillinger | 10 | 0.9 ms | 4.4 ms |
| fagside | treg | 500 | kuratering_admin | 5 | 1.6 ms | 3.0 ms |
| fagside | treg | 500 | les_fagsaker | 5 | 1.6 ms | 4.3 ms |
| fagside | treg | 500 | kan_endre_lokalt_innhold | 5 | 1.5 ms | 2.2 ms |
| fagside | treg | 500 | ideer_med_nytt | 5 | 1.4 ms | 1.9 ms |
| fagside | treg | 500 | sokedata_versjoner | 5 | 1.4 ms | 1.9 ms |
| fagside | treg | 500 | datakilder_status | 5 | 1.3 ms | 1.6 ms |
| fagside | treg | 500 | rydd_stoffpapirkurven | 5 | 1.2 ms | 2.0 ms |
| fagside | treg | 500 | er_systemarkitekt | 5 | 1.0 ms | 2.6 ms |
| fagside | treg | 500 | uleste_varsler | 5 | 1.0 ms | 1.2 ms |
| fagside | treg | 500 | les_preparatsok | 3 | 1.4 ms | 1.6 ms |
| fagside | treg | 500 | les_stoffavoritter | 5 | 0.8 ms | 1.3 ms |
| fagside | treg | 500 | les_interaksjonssok | 3 | 1.1 ms | 1.4 ms |
| fagside | treg | 500 | min_profil | 5 | 0.6 ms | 0.7 ms |
| fagside | treg | 500 | mine_direktesamtaler | 5 | 0.6 ms | 0.9 ms |
| fagside | treg | 500 | mine_chatvalg | 5 | 0.5 ms | 0.6 ms |
| fagside | treg | 500 | autoerstatt_regler | 5 | 0.5 ms | 0.8 ms |
| fagside | treg | 500 | les_laboratoriesok | 3 | 0.8 ms | 0.9 ms |
| fortolkning | rask | 500 | les_stoffer | 5 | 511.6 ms | 587.3 ms |
| fortolkning | rask | 500 | forsideoppsummering | 20 | 16.8 ms | 64.8 ms |
| fortolkning | rask | 500 | les_kommentarer | 5 | 39.4 ms | 44.6 ms |
| fortolkning | rask | 500 | les_stoffregister | 13 | 6.5 ms | 17.2 ms |
| fortolkning | rask | 500 | mine_rettigheter | 5 | 7.0 ms | 10.3 ms |
| fortolkning | rask | 500 | mine_gruppesamtaler | 5 | 6.5 ms | 9.5 ms |
| fortolkning | rask | 500 | mine_grupper | 5 | 6.2 ms | 10.6 ms |
| fortolkning | rask | 500 | les_scenarioregler | 5 | 5.3 ms | 7.3 ms |
| fortolkning | rask | 500 | les_analyttkatalog | 5 | 4.7 ms | 5.6 ms |
| fortolkning | rask | 500 | les_forslagsko | 5 | 4.1 ms | 7.1 ms |
| fortolkning | rask | 500 | profiles | 5 | 3.9 ms | 6.2 ms |
| fortolkning | rask | 500 | les_thc_regelsett | 5 | 3.2 ms | 7.7 ms |
| fortolkning | rask | 500 | diskusjonsoversikt | 5 | 3.0 ms | 3.6 ms |
| fortolkning | rask | 500 | uleste_varsler | 5 | 2.9 ms | 6.6 ms |
| fortolkning | rask | 500 | kan_endre_lokalt_innhold | 5 | 2.5 ms | 4.3 ms |
| fortolkning | rask | 500 | ideer_med_nytt | 5 | 2.4 ms | 3.7 ms |
| fortolkning | rask | 500 | stillingskategorier | 5 | 2.3 ms | 8.7 ms |
| fortolkning | rask | 500 | sokedata_versjoner | 5 | 2.1 ms | 3.4 ms |
| fortolkning | rask | 500 | les_interaksjonssok | 5 | 2.1 ms | 2.9 ms |
| fortolkning | rask | 500 | les_intervallregelsett | 5 | 2.0 ms | 2.4 ms |
| fortolkning | rask | 500 | brukerinnstillinger | 13 | 0.7 ms | 1.9 ms |
| fortolkning | rask | 500 | les_preparatsok | 5 | 1.7 ms | 3.9 ms |
| fortolkning | rask | 500 | rydd_stoffpapirkurven | 5 | 1.2 ms | 2.1 ms |
| fortolkning | rask | 500 | er_systemarkitekt | 5 | 1.1 ms | 2.9 ms |
| fortolkning | rask | 500 | mine_direktesamtaler | 5 | 1.1 ms | 2.5 ms |
| fortolkning | rask | 500 | les_fagsaker | 5 | 0.9 ms | 1.3 ms |
| fortolkning | rask | 500 | datakilder_status | 5 | 0.9 ms | 1.4 ms |
| fortolkning | rask | 500 | les_laboratoriesok | 5 | 0.9 ms | 1.0 ms |
| fortolkning | rask | 500 | min_profil | 5 | 0.7 ms | 0.9 ms |
| fortolkning | treg | 500 | les_stoffer | 5 | 514.5 ms | 539.7 ms |
| fortolkning | treg | 500 | forsideoppsummering | 20 | 12.6 ms | 45.6 ms |
| fortolkning | treg | 500 | les_kommentarer | 5 | 40.6 ms | 56.9 ms |
| fortolkning | treg | 500 | les_stoffregister | 10 | 6.0 ms | 13.1 ms |
| fortolkning | treg | 500 | mine_gruppesamtaler | 5 | 6.4 ms | 7.6 ms |
| fortolkning | treg | 500 | mine_grupper | 5 | 6.1 ms | 7.9 ms |
| fortolkning | treg | 500 | mine_rettigheter | 5 | 6.0 ms | 8.3 ms |
| fortolkning | treg | 500 | les_scenarioregler | 5 | 5.1 ms | 6.3 ms |
| fortolkning | treg | 500 | les_analyttkatalog | 5 | 4.0 ms | 4.9 ms |
| fortolkning | treg | 500 | les_forslagsko | 5 | 3.6 ms | 6.0 ms |
| fortolkning | treg | 500 | diskusjonsoversikt | 3 | 4.4 ms | 6.6 ms |
| fortolkning | treg | 500 | les_thc_regelsett | 5 | 2.4 ms | 3.8 ms |
| fortolkning | treg | 500 | les_intervallregelsett | 5 | 2.3 ms | 3.6 ms |
| fortolkning | treg | 500 | ideer_med_nytt | 5 | 1.8 ms | 2.6 ms |
| fortolkning | treg | 500 | kan_endre_lokalt_innhold | 5 | 1.7 ms | 2.0 ms |
| fortolkning | treg | 500 | stillingskategorier | 5 | 1.7 ms | 3.3 ms |
| fortolkning | treg | 500 | profiles | 5 | 1.7 ms | 1.8 ms |
| fortolkning | treg | 500 | sokedata_versjoner | 5 | 1.6 ms | 2.7 ms |
| fortolkning | treg | 500 | uleste_varsler | 5 | 1.2 ms | 1.8 ms |
| fortolkning | treg | 500 | datakilder_status | 5 | 1.1 ms | 1.3 ms |
| fortolkning | treg | 500 | er_systemarkitekt | 5 | 1.0 ms | 1.7 ms |
| fortolkning | treg | 500 | brukerinnstillinger | 9 | 0.5 ms | 1.1 ms |
| fortolkning | treg | 500 | les_preparatsok | 4 | 1.1 ms | 1.3 ms |
| fortolkning | treg | 500 | les_interaksjonssok | 4 | 1.1 ms | 1.7 ms |
| fortolkning | treg | 500 | les_fagsaker | 5 | 0.9 ms | 1.0 ms |
| fortolkning | treg | 500 | rydd_stoffpapirkurven | 4 | 1.0 ms | 1.2 ms |
| fortolkning | treg | 500 | mine_direktesamtaler | 5 | 0.7 ms | 1.2 ms |
| fortolkning | treg | 500 | mine_chatvalg | 5 | 0.7 ms | 0.9 ms |
| fortolkning | treg | 500 | min_profil | 5 | 0.7 ms | 0.9 ms |
| fortolkning | treg | 500 | autoerstatt_regler | 5 | 0.6 ms | 1.1 ms |
| fortolkning | treg | 500 | les_laboratoriesok | 4 | 0.6 ms | 0.8 ms |
| kald | rask | 500 | les_stoffer | 5 | 436.6 ms | 472.8 ms |
| kald | rask | 500 | forsideoppsummering | 20 | 18.9 ms | 75.8 ms |
| kald | rask | 500 | les_kommentarer | 5 | 71.3 ms | 114.0 ms |
| kald | rask | 500 | les_stoffregister | 12 | 8.3 ms | 26.0 ms |
| kald | rask | 500 | les_forslagsko | 5 | 16.4 ms | 40.5 ms |
| kald | rask | 500 | les_scenarioregler | 5 | 14.2 ms | 34.6 ms |
| kald | rask | 500 | mine_rettigheter | 5 | 10.4 ms | 20.0 ms |
| kald | rask | 500 | mine_gruppesamtaler | 5 | 7.2 ms | 14.5 ms |
| kald | rask | 500 | les_analyttkatalog | 5 | 7.1 ms | 14.4 ms |
| kald | rask | 500 | mine_grupper | 5 | 6.5 ms | 10.6 ms |
| kald | rask | 500 | les_thc_regelsett | 5 | 6.2 ms | 13.2 ms |
| kald | rask | 500 | les_intervallregelsett | 5 | 5.7 ms | 10.9 ms |
| kald | rask | 500 | les_interaksjonssok | 5 | 5.3 ms | 13.1 ms |
| kald | rask | 500 | datakilder_status | 5 | 5.0 ms | 14.2 ms |
| kald | rask | 500 | profiles | 5 | 4.4 ms | 6.2 ms |
| kald | rask | 500 | brukerinnstillinger | 12 | 1.7 ms | 8.4 ms |
| kald | rask | 500 | les_fagsaker | 5 | 3.4 ms | 6.5 ms |
| kald | rask | 500 | kan_endre_lokalt_innhold | 5 | 3.3 ms | 6.0 ms |
| kald | rask | 500 | les_laboratoriesok | 5 | 3.3 ms | 6.0 ms |
| kald | rask | 500 | ideer_med_nytt | 5 | 3.3 ms | 8.9 ms |
| kald | rask | 500 | rydd_stoffpapirkurven | 5 | 3.0 ms | 9.5 ms |
| kald | rask | 500 | uleste_varsler | 5 | 1.8 ms | 5.6 ms |
| kald | rask | 500 | sokedata_versjoner | 5 | 1.6 ms | 1.9 ms |
| kald | rask | 500 | mine_direktesamtaler | 5 | 1.4 ms | 2.0 ms |
| kald | rask | 500 | les_preparatsok | 5 | 1.3 ms | 1.6 ms |
| kald | rask | 500 | stillingskategorier | 5 | 0.9 ms | 1.8 ms |
| kald | rask | 500 | mine_chatvalg | 5 | 0.9 ms | 2.2 ms |
| kald | rask | 500 | min_profil | 5 | 0.7 ms | 1.1 ms |
| kald | rask | 500 | er_systemarkitekt | 5 | 0.6 ms | 0.7 ms |
| kald | treg | 500 | les_stoffer | 5 | 541.9 ms | 664.8 ms |
| kald | treg | 500 | forsideoppsummering | 20 | 14.5 ms | 58.9 ms |
| kald | treg | 500 | les_kommentarer | 5 | 44.7 ms | 65.2 ms |
| kald | treg | 500 | les_stoffregister | 10 | 6.4 ms | 9.5 ms |
| kald | treg | 500 | mine_rettigheter | 5 | 8.2 ms | 13.2 ms |
| kald | treg | 500 | mine_gruppesamtaler | 5 | 7.8 ms | 13.4 ms |
| kald | treg | 500 | les_analyttkatalog | 5 | 5.7 ms | 7.3 ms |
| kald | treg | 500 | mine_grupper | 5 | 5.5 ms | 7.1 ms |
| kald | treg | 500 | les_scenarioregler | 5 | 5.1 ms | 7.4 ms |
| kald | treg | 500 | les_intervallregelsett | 5 | 4.2 ms | 9.8 ms |
| kald | treg | 500 | profiles | 5 | 4.2 ms | 13.5 ms |
| kald | treg | 500 | les_forslagsko | 5 | 4.0 ms | 8.0 ms |
| kald | treg | 500 | ideer_med_nytt | 5 | 3.9 ms | 10.7 ms |
| kald | treg | 500 | kan_endre_lokalt_innhold | 5 | 3.1 ms | 6.4 ms |
| kald | treg | 500 | les_thc_regelsett | 5 | 3.1 ms | 3.8 ms |
| kald | treg | 500 | brukerinnstillinger | 5 | 1.9 ms | 6.5 ms |
| kald | treg | 500 | mine_direktesamtaler | 5 | 1.5 ms | 3.9 ms |
| kald | treg | 500 | uleste_varsler | 5 | 1.1 ms | 1.5 ms |
| kald | treg | 500 | sokedata_versjoner | 5 | 1.1 ms | 1.5 ms |
| kald | treg | 500 | stillingskategorier | 5 | 1.1 ms | 1.9 ms |
| kald | treg | 500 | autoerstatt_regler | 5 | 1.1 ms | 3.5 ms |
| kald | treg | 500 | datakilder_status | 5 | 1.1 ms | 1.4 ms |
| kald | treg | 500 | rydd_stoffpapirkurven | 4 | 1.2 ms | 1.8 ms |
| kald | treg | 500 | les_fagsaker | 5 | 0.9 ms | 1.0 ms |
| kald | treg | 500 | er_systemarkitekt | 5 | 0.9 ms | 1.8 ms |
| kald | treg | 500 | min_profil | 5 | 0.7 ms | 0.8 ms |
| kald | treg | 500 | mine_chatvalg | 5 | 0.6 ms | 0.7 ms |
| personsøk | rask | 50 | les_stoffer | 3 | 533.6 ms | 590.0 ms |
| personsøk | rask | 50 | sok_gruppekandidater | 59 | 9.4 ms | 20.1 ms |
| personsøk | rask | 50 | sok_medlemskandidater | 59 | 3.8 ms | 7.6 ms |
| personsøk | rask | 50 | sok_direktemottakere | 59 | 3.8 ms | 9.4 ms |
| personsøk | rask | 50 | les_kommentarer | 3 | 57.7 ms | 72.3 ms |
| personsøk | rask | 50 | forsideoppsummering | 12 | 12.5 ms | 44.8 ms |
| personsøk | rask | 50 | les_stoffregister | 7 | 8.3 ms | 23.8 ms |
| personsøk | rask | 50 | medlemsoversikt | 1 | 34.3 ms | 34.3 ms |
| personsøk | rask | 50 | les_scenarioregler | 3 | 10.7 ms | 15.2 ms |
| personsøk | rask | 50 | mine_rettigheter | 3 | 6.5 ms | 6.7 ms |
| personsøk | rask | 50 | les_forslagsko | 3 | 6.2 ms | 12.6 ms |
| personsøk | rask | 50 | mine_grupper | 3 | 4.8 ms | 5.9 ms |
| personsøk | rask | 50 | les_analyttkatalog | 3 | 4.4 ms | 5.3 ms |
| personsøk | rask | 50 | les_thc_regelsett | 3 | 3.5 ms | 5.1 ms |
| personsøk | rask | 50 | mine_gruppesamtaler | 3 | 3.2 ms | 3.4 ms |
| personsøk | rask | 50 | gruppeoversikt | 1 | 9.6 ms | 9.6 ms |
| personsøk | rask | 50 | brukerinnstillinger | 11 | 0.8 ms | 2.5 ms |
| personsøk | rask | 50 | les_intervallregelsett | 3 | 2.6 ms | 3.8 ms |
| personsøk | rask | 50 | kan_endre_lokalt_innhold | 3 | 2.5 ms | 4.5 ms |
| personsøk | rask | 50 | profiles | 3 | 2.4 ms | 3.3 ms |
| personsøk | rask | 50 | les_interaksjonssok | 3 | 2.3 ms | 3.3 ms |
| personsøk | rask | 50 | sokedata_versjoner | 3 | 1.8 ms | 3.5 ms |
| personsøk | rask | 50 | er_systemarkitekt | 3 | 1.7 ms | 3.6 ms |
| personsøk | rask | 50 | mine_direktesamtaler | 3 | 1.4 ms | 3.1 ms |
| personsøk | rask | 50 | ideer_med_nytt | 3 | 1.4 ms | 1.6 ms |
| personsøk | rask | 50 | diskusjonsoversikt | 1 | 4.0 ms | 4.0 ms |
| personsøk | rask | 50 | les_preparatsok | 3 | 1.1 ms | 1.4 ms |
| personsøk | rask | 50 | gruppeaktivitet | 1 | 3.3 ms | 3.3 ms |
| personsøk | rask | 50 | uleste_varsler | 3 | 1.0 ms | 1.1 ms |
| personsøk | rask | 50 | datakilder_status | 2 | 1.4 ms | 1.6 ms |
| personsøk | rask | 50 | stillingskategorier | 3 | 0.9 ms | 1.3 ms |
| personsøk | rask | 50 | les_laboratoriesok | 3 | 0.7 ms | 1.1 ms |
| personsøk | rask | 50 | rydd_stoffpapirkurven | 2 | 1.0 ms | 1.0 ms |
| personsøk | rask | 50 | min_profil | 3 | 0.6 ms | 0.8 ms |
| personsøk | rask | 50 | mine_chatvalg | 3 | 0.5 ms | 0.6 ms |
| personsøk | rask | 50 | les_fagsaker | 2 | 0.7 ms | 0.7 ms |
| personsøk | rask | 500 | sok_gruppekandidater | 59 | 45.6 ms | 77.7 ms |
| personsøk | rask | 500 | les_stoffer | 3 | 506.6 ms | 522.1 ms |
| personsøk | rask | 500 | sok_direktemottakere | 59 | 21.0 ms | 36.1 ms |
| personsøk | rask | 500 | sok_medlemskandidater | 59 | 11.8 ms | 20.7 ms |
| personsøk | rask | 500 | medlemsoversikt | 1 | 282.8 ms | 282.8 ms |
| personsøk | rask | 500 | les_kommentarer | 3 | 47.0 ms | 70.3 ms |
| personsøk | rask | 500 | forsideoppsummering | 8 | 13.4 ms | 31.0 ms |
| personsøk | rask | 500 | profiles | 3 | 14.1 ms | 20.5 ms |
| personsøk | rask | 500 | les_stoffregister | 7 | 5.6 ms | 8.2 ms |
| personsøk | rask | 500 | mine_rettigheter | 3 | 7.4 ms | 9.4 ms |
| personsøk | rask | 500 | mine_gruppesamtaler | 3 | 5.3 ms | 7.4 ms |
| personsøk | rask | 500 | les_scenarioregler | 3 | 4.9 ms | 6.7 ms |
| personsøk | rask | 500 | mine_grupper | 3 | 4.6 ms | 6.2 ms |
| personsøk | rask | 500 | les_analyttkatalog | 3 | 4.5 ms | 4.7 ms |
| personsøk | rask | 500 | kan_endre_lokalt_innhold | 3 | 4.4 ms | 7.9 ms |
| personsøk | rask | 500 | les_forslagsko | 3 | 4.3 ms | 5.6 ms |
| personsøk | rask | 500 | les_intervallregelsett | 3 | 3.3 ms | 6.3 ms |
| personsøk | rask | 500 | gruppeoversikt | 1 | 9.2 ms | 9.2 ms |
| personsøk | rask | 500 | gruppeaktivitet | 1 | 7.6 ms | 7.6 ms |
| personsøk | rask | 500 | les_thc_regelsett | 3 | 2.1 ms | 2.5 ms |
| personsøk | rask | 500 | ideer_med_nytt | 3 | 1.5 ms | 1.8 ms |
| personsøk | rask | 500 | uleste_varsler | 3 | 1.4 ms | 2.4 ms |
| personsøk | rask | 500 | mine_chatvalg | 3 | 1.3 ms | 3.0 ms |
| personsøk | rask | 500 | diskusjonsoversikt | 1 | 3.8 ms | 3.8 ms |
| personsøk | rask | 500 | sokedata_versjoner | 3 | 1.2 ms | 1.5 ms |
| personsøk | rask | 500 | autoerstatt_regler | 3 | 1.1 ms | 2.7 ms |
| personsøk | rask | 500 | brukerinnstillinger | 5 | 0.6 ms | 1.4 ms |
| personsøk | rask | 500 | stillingskategorier | 3 | 0.8 ms | 1.1 ms |
| personsøk | rask | 500 | les_preparatsok | 3 | 0.8 ms | 0.8 ms |
| personsøk | rask | 500 | les_laboratoriesok | 3 | 0.8 ms | 0.9 ms |
| personsøk | rask | 500 | min_profil | 3 | 0.7 ms | 0.8 ms |
| personsøk | rask | 500 | les_interaksjonssok | 3 | 0.7 ms | 0.7 ms |
| personsøk | rask | 500 | rydd_stoffpapirkurven | 2 | 1.0 ms | 1.2 ms |
| personsøk | rask | 500 | datakilder_status | 2 | 0.9 ms | 1.0 ms |
| personsøk | rask | 500 | mine_direktesamtaler | 3 | 0.6 ms | 0.7 ms |
| personsøk | rask | 500 | er_systemarkitekt | 3 | 0.6 ms | 0.6 ms |
| personsøk | rask | 500 | les_fagsaker | 2 | 0.7 ms | 0.7 ms |
| personsøk | rask | 5000 | sok_gruppekandidater | 59 | 402.3 ms | 559.2 ms |
| personsøk | rask | 5000 | sok_direktemottakere | 59 | 175.6 ms | 267.5 ms |
| personsøk | rask | 5000 | sok_medlemskandidater | 59 | 92.4 ms | 137.3 ms |
| personsøk | rask | 5000 | medlemsoversikt | 1 | 1978.7 ms | 1978.7 ms |
| personsøk | rask | 5000 | les_stoffer | 3 | 446.2 ms | 490.9 ms |
| personsøk | rask | 5000 | les_kommentarer | 3 | 51.2 ms | 65.4 ms |
| personsøk | rask | 5000 | forsideoppsummering | 12 | 12.5 ms | 31.6 ms |
| personsøk | rask | 5000 | les_stoffregister | 8 | 7.2 ms | 17.5 ms |
| personsøk | rask | 5000 | les_forslagsko | 3 | 12.3 ms | 19.0 ms |
| personsøk | rask | 5000 | profiles | 3 | 11.9 ms | 29.0 ms |
| personsøk | rask | 5000 | les_scenarioregler | 3 | 10.2 ms | 16.6 ms |
| personsøk | rask | 5000 | mine_rettigheter | 3 | 7.6 ms | 8.8 ms |
| personsøk | rask | 5000 | les_analyttkatalog | 3 | 4.8 ms | 6.6 ms |
| personsøk | rask | 5000 | mine_gruppesamtaler | 3 | 4.7 ms | 6.8 ms |
| personsøk | rask | 5000 | mine_grupper | 3 | 3.9 ms | 4.3 ms |
| personsøk | rask | 5000 | gruppeoversikt | 1 | 10.2 ms | 10.2 ms |
| personsøk | rask | 5000 | les_interaksjonssok | 3 | 3.3 ms | 6.5 ms |
| personsøk | rask | 5000 | les_intervallregelsett | 3 | 3.0 ms | 3.6 ms |
| personsøk | rask | 5000 | autoerstatt_regler | 3 | 1.7 ms | 4.5 ms |
| personsøk | rask | 5000 | les_thc_regelsett | 3 | 1.7 ms | 1.8 ms |
| personsøk | rask | 5000 | ideer_med_nytt | 3 | 1.5 ms | 1.9 ms |
| personsøk | rask | 5000 | les_preparatsok | 3 | 1.4 ms | 2.4 ms |
| personsøk | rask | 5000 | kan_endre_lokalt_innhold | 3 | 1.4 ms | 1.7 ms |
| personsøk | rask | 5000 | uleste_varsler | 3 | 1.4 ms | 1.9 ms |
| personsøk | rask | 5000 | diskusjonsoversikt | 1 | 4.2 ms | 4.2 ms |
| personsøk | rask | 5000 | sokedata_versjoner | 3 | 1.2 ms | 1.4 ms |
| personsøk | rask | 5000 | stillingskategorier | 3 | 1.1 ms | 2.0 ms |
| personsøk | rask | 5000 | mine_direktesamtaler | 3 | 1.0 ms | 1.5 ms |
| personsøk | rask | 5000 | gruppeaktivitet | 1 | 2.7 ms | 2.7 ms |
| personsøk | rask | 5000 | les_laboratoriesok | 3 | 0.9 ms | 1.0 ms |
| personsøk | rask | 5000 | datakilder_status | 2 | 1.2 ms | 1.6 ms |
| personsøk | rask | 5000 | les_stoffavoritter | 3 | 0.8 ms | 1.6 ms |
| personsøk | rask | 5000 | rydd_stoffpapirkurven | 2 | 1.1 ms | 1.5 ms |
| personsøk | rask | 5000 | les_fagsaker | 2 | 1.0 ms | 1.1 ms |
| personsøk | rask | 5000 | mine_chatvalg | 3 | 0.6 ms | 0.7 ms |
| personsøk | rask | 5000 | er_systemarkitekt | 3 | 0.6 ms | 0.7 ms |
| personsøk | rask | 5000 | min_profil | 3 | 0.5 ms | 0.7 ms |
| personsøk | rask | 5000 | les_mine_forslag | 1 | 0.6 ms | 0.6 ms |
| personsøk | treg | 50 | les_stoffer | 3 | 602.2 ms | 741.7 ms |
| personsøk | treg | 50 | sok_gruppekandidater | 59 | 8.9 ms | 18.0 ms |
| personsøk | treg | 50 | sok_medlemskandidater | 59 | 4.1 ms | 14.1 ms |
| personsøk | treg | 50 | sok_direktemottakere | 59 | 3.9 ms | 8.7 ms |
| personsøk | treg | 50 | forsideoppsummering | 12 | 13.6 ms | 40.7 ms |
| personsøk | treg | 50 | les_kommentarer | 3 | 34.9 ms | 49.2 ms |
| personsøk | treg | 50 | medlemsoversikt | 1 | 29.5 ms | 29.5 ms |
| personsøk | treg | 50 | les_stoffregister | 6 | 4.8 ms | 7.0 ms |
| personsøk | treg | 50 | mine_rettigheter | 3 | 6.7 ms | 9.7 ms |
| personsøk | treg | 50 | mine_grupper | 3 | 5.7 ms | 6.3 ms |
| personsøk | treg | 50 | mine_gruppesamtaler | 3 | 5.6 ms | 9.8 ms |
| personsøk | treg | 50 | les_scenarioregler | 3 | 4.5 ms | 5.4 ms |
| personsøk | treg | 50 | les_forslagsko | 3 | 3.9 ms | 5.2 ms |
| personsøk | treg | 50 | les_analyttkatalog | 3 | 3.6 ms | 3.8 ms |
| personsøk | treg | 50 | gruppeoversikt | 1 | 8.3 ms | 8.3 ms |
| personsøk | treg | 50 | les_intervallregelsett | 3 | 2.2 ms | 2.5 ms |
| personsøk | treg | 50 | stillingskategorier | 3 | 1.9 ms | 4.4 ms |
| personsøk | treg | 50 | les_thc_regelsett | 3 | 1.8 ms | 2.0 ms |
| personsøk | treg | 50 | ideer_med_nytt | 3 | 1.8 ms | 2.1 ms |
| personsøk | treg | 50 | profiles | 3 | 1.8 ms | 3.6 ms |
| personsøk | treg | 50 | sokedata_versjoner | 3 | 1.4 ms | 1.5 ms |
| personsøk | treg | 50 | les_interaksjonssok | 3 | 1.4 ms | 2.5 ms |
| personsøk | treg | 50 | er_systemarkitekt | 3 | 1.3 ms | 2.0 ms |
| personsøk | treg | 50 | kan_endre_lokalt_innhold | 3 | 1.3 ms | 1.4 ms |
| personsøk | treg | 50 | les_preparatsok | 3 | 1.3 ms | 1.6 ms |
| personsøk | treg | 50 | diskusjonsoversikt | 1 | 3.6 ms | 3.6 ms |
| personsøk | treg | 50 | datakilder_status | 2 | 1.6 ms | 2.4 ms |
| personsøk | treg | 50 | mine_direktesamtaler | 3 | 1.1 ms | 2.2 ms |
| personsøk | treg | 50 | brukerinnstillinger | 4 | 0.7 ms | 1.1 ms |
| personsøk | treg | 50 | uleste_varsler | 3 | 0.9 ms | 1.0 ms |
| personsøk | treg | 50 | rydd_stoffpapirkurven | 2 | 1.2 ms | 1.5 ms |
| personsøk | treg | 50 | gruppeaktivitet | 1 | 2.2 ms | 2.2 ms |
| personsøk | treg | 50 | autoerstatt_regler | 3 | 0.7 ms | 1.0 ms |
| personsøk | treg | 50 | les_laboratoriesok | 3 | 0.7 ms | 0.8 ms |
| personsøk | treg | 50 | les_fagsaker | 2 | 1.0 ms | 1.3 ms |
| personsøk | treg | 50 | min_profil | 3 | 0.6 ms | 0.6 ms |
| personsøk | treg | 50 | les_mine_forslag | 1 | 0.8 ms | 0.8 ms |
| personsøk | treg | 500 | sok_gruppekandidater | 59 | 48.8 ms | 112.0 ms |
| personsøk | treg | 500 | les_stoffer | 3 | 543.3 ms | 598.6 ms |
| personsøk | treg | 500 | sok_direktemottakere | 59 | 21.6 ms | 52.8 ms |
| personsøk | treg | 500 | sok_medlemskandidater | 59 | 13.4 ms | 28.5 ms |
| personsøk | treg | 500 | medlemsoversikt | 1 | 239.0 ms | 239.0 ms |
| personsøk | treg | 500 | forsideoppsummering | 12 | 13.1 ms | 42.7 ms |
| personsøk | treg | 500 | les_kommentarer | 3 | 48.7 ms | 51.8 ms |
| personsøk | treg | 500 | les_stoffregister | 6 | 4.8 ms | 6.0 ms |
| personsøk | treg | 500 | mine_rettigheter | 3 | 8.8 ms | 10.0 ms |
| personsøk | treg | 500 | les_scenarioregler | 3 | 6.9 ms | 9.9 ms |
| personsøk | treg | 500 | mine_grupper | 3 | 5.3 ms | 7.6 ms |
| personsøk | treg | 500 | les_analyttkatalog | 3 | 5.3 ms | 5.8 ms |
| personsøk | treg | 500 | les_intervallregelsett | 3 | 4.6 ms | 7.4 ms |
| personsøk | treg | 500 | mine_gruppesamtaler | 3 | 4.3 ms | 5.2 ms |
| personsøk | treg | 500 | les_forslagsko | 3 | 4.0 ms | 4.4 ms |
| personsøk | treg | 500 | les_thc_regelsett | 3 | 3.7 ms | 6.5 ms |
| personsøk | treg | 500 | profiles | 3 | 3.5 ms | 5.3 ms |
| personsøk | treg | 500 | gruppeoversikt | 1 | 6.0 ms | 6.0 ms |
| personsøk | treg | 500 | kan_endre_lokalt_innhold | 3 | 1.9 ms | 2.5 ms |
| personsøk | treg | 500 | ideer_med_nytt | 3 | 1.8 ms | 2.3 ms |
| personsøk | treg | 500 | uleste_varsler | 3 | 1.8 ms | 3.0 ms |
| personsøk | treg | 500 | stillingskategorier | 3 | 1.8 ms | 2.9 ms |
| personsøk | treg | 500 | sokedata_versjoner | 3 | 1.6 ms | 2.5 ms |
| personsøk | treg | 500 | gruppeaktivitet | 1 | 3.5 ms | 3.5 ms |
| personsøk | treg | 500 | diskusjonsoversikt | 1 | 3.3 ms | 3.3 ms |
| personsøk | treg | 500 | mine_direktesamtaler | 3 | 1.1 ms | 1.9 ms |
| personsøk | treg | 500 | datakilder_status | 2 | 1.3 ms | 1.7 ms |
| personsøk | treg | 500 | les_preparatsok | 3 | 0.9 ms | 1.1 ms |
| personsøk | treg | 500 | er_systemarkitekt | 3 | 0.8 ms | 1.2 ms |
| personsøk | treg | 500 | les_interaksjonssok | 3 | 0.8 ms | 0.9 ms |
| personsøk | treg | 500 | brukerinnstillinger | 4 | 0.6 ms | 0.7 ms |
| personsøk | treg | 500 | mine_chatvalg | 3 | 0.7 ms | 0.8 ms |
| personsøk | treg | 500 | rydd_stoffpapirkurven | 2 | 1.0 ms | 1.2 ms |
| personsøk | treg | 500 | autoerstatt_regler | 3 | 0.7 ms | 0.9 ms |
| personsøk | treg | 500 | min_profil | 3 | 0.6 ms | 0.6 ms |
| personsøk | treg | 500 | les_laboratoriesok | 3 | 0.6 ms | 0.6 ms |
| personsøk | treg | 500 | les_fagsaker | 2 | 0.7 ms | 0.8 ms |
| personsøk | treg | 500 | les_mine_forslag | 1 | 0.6 ms | 0.6 ms |
| personsøk | treg | 5000 | sok_gruppekandidater | 59 | 412.5 ms | 544.1 ms |
| personsøk | treg | 5000 | sok_direktemottakere | 59 | 163.6 ms | 248.6 ms |
| personsøk | treg | 5000 | sok_medlemskandidater | 59 | 90.8 ms | 136.0 ms |
| personsøk | treg | 5000 | medlemsoversikt | 1 | 1899.4 ms | 1899.4 ms |
| personsøk | treg | 5000 | les_stoffer | 3 | 480.5 ms | 540.1 ms |
| personsøk | treg | 5000 | forsideoppsummering | 12 | 14.2 ms | 58.6 ms |
| personsøk | treg | 5000 | les_kommentarer | 3 | 35.6 ms | 50.4 ms |
| personsøk | treg | 5000 | les_forslagsko | 3 | 14.1 ms | 21.5 ms |
| personsøk | treg | 5000 | profiles | 3 | 10.6 ms | 16.2 ms |
| personsøk | treg | 5000 | les_stoffregister | 6 | 4.3 ms | 5.3 ms |
| personsøk | treg | 5000 | mine_gruppesamtaler | 3 | 8.3 ms | 9.1 ms |
| personsøk | treg | 5000 | les_scenarioregler | 3 | 6.6 ms | 9.7 ms |
| personsøk | treg | 5000 | mine_rettigheter | 3 | 5.8 ms | 7.1 ms |
| personsøk | treg | 5000 | mine_grupper | 3 | 5.7 ms | 6.4 ms |
| personsøk | treg | 5000 | les_analyttkatalog | 3 | 4.0 ms | 4.1 ms |
| personsøk | treg | 5000 | les_thc_regelsett | 3 | 3.6 ms | 5.2 ms |
| personsøk | treg | 5000 | ideer_med_nytt | 3 | 2.8 ms | 4.9 ms |
| personsøk | treg | 5000 | gruppeoversikt | 1 | 7.2 ms | 7.2 ms |
| personsøk | treg | 5000 | les_interaksjonssok | 3 | 2.2 ms | 2.4 ms |
| personsøk | treg | 5000 | diskusjonsoversikt | 1 | 6.2 ms | 6.2 ms |
| personsøk | treg | 5000 | les_intervallregelsett | 3 | 2.0 ms | 2.0 ms |
| personsøk | treg | 5000 | uleste_varsler | 3 | 1.9 ms | 3.1 ms |
| personsøk | treg | 5000 | kan_endre_lokalt_innhold | 3 | 1.8 ms | 2.1 ms |
| personsøk | treg | 5000 | mine_direktesamtaler | 3 | 1.7 ms | 2.3 ms |
| personsøk | treg | 5000 | sokedata_versjoner | 3 | 1.5 ms | 2.0 ms |
| personsøk | treg | 5000 | les_preparatsok | 3 | 1.2 ms | 1.3 ms |
| personsøk | treg | 5000 | les_laboratoriesok | 3 | 1.1 ms | 1.2 ms |
| personsøk | treg | 5000 | gruppeaktivitet | 1 | 3.3 ms | 3.3 ms |
| personsøk | treg | 5000 | rydd_stoffpapirkurven | 2 | 1.4 ms | 2.2 ms |
| personsøk | treg | 5000 | stillingskategorier | 3 | 0.9 ms | 1.4 ms |
| personsøk | treg | 5000 | datakilder_status | 2 | 1.3 ms | 1.3 ms |
| personsøk | treg | 5000 | les_fagsaker | 2 | 1.2 ms | 1.6 ms |
| personsøk | treg | 5000 | er_systemarkitekt | 3 | 0.8 ms | 0.9 ms |
| personsøk | treg | 5000 | min_profil | 3 | 0.7 ms | 1.1 ms |
| personsøk | treg | 5000 | mine_chatvalg | 3 | 0.7 ms | 0.9 ms |
| varm | rask | 500 | les_stoffer | 5 | 438.0 ms | 474.9 ms |
| varm | rask | 500 | forsideoppsummering | 40 | 17.2 ms | 61.3 ms |
| varm | rask | 500 | les_kommentarer | 10 | 47.3 ms | 68.9 ms |
| varm | rask | 500 | les_stoffregister | 17 | 8.1 ms | 21.8 ms |
| varm | rask | 500 | les_scenarioregler | 10 | 9.2 ms | 21.0 ms |
| varm | rask | 500 | mine_rettigheter | 10 | 7.4 ms | 11.2 ms |
| varm | rask | 500 | mine_gruppesamtaler | 10 | 7.1 ms | 13.5 ms |
| varm | rask | 500 | les_thc_regelsett | 10 | 6.2 ms | 18.0 ms |
| varm | rask | 500 | mine_grupper | 10 | 6.0 ms | 10.1 ms |
| varm | rask | 500 | les_analyttkatalog | 10 | 4.5 ms | 6.3 ms |
| varm | rask | 500 | les_intervallregelsett | 10 | 4.2 ms | 15.1 ms |
| varm | rask | 500 | profiles | 10 | 4.2 ms | 9.9 ms |
| varm | rask | 500 | les_forslagsko | 10 | 3.5 ms | 4.6 ms |
| varm | rask | 500 | min_profil | 10 | 3.0 ms | 22.7 ms |
| varm | rask | 500 | ideer_med_nytt | 10 | 2.2 ms | 4.7 ms |
| varm | rask | 500 | datakilder_status | 10 | 2.1 ms | 4.5 ms |
| varm | rask | 500 | sokedata_versjoner | 10 | 1.9 ms | 4.6 ms |
| varm | rask | 500 | kan_endre_lokalt_innhold | 10 | 1.8 ms | 4.4 ms |
| varm | rask | 500 | uleste_varsler | 10 | 1.3 ms | 2.8 ms |
| varm | rask | 500 | les_interaksjonssok | 5 | 2.5 ms | 4.0 ms |
| varm | rask | 500 | les_fagsaker | 10 | 1.3 ms | 1.9 ms |
| varm | rask | 500 | stillingskategorier | 10 | 1.2 ms | 6.1 ms |
| varm | rask | 500 | autoerstatt_regler | 10 | 1.1 ms | 7.2 ms |
| varm | rask | 500 | mine_direktesamtaler | 10 | 1.1 ms | 2.2 ms |
| varm | rask | 500 | rydd_stoffpapirkurven | 10 | 1.0 ms | 1.3 ms |
| varm | rask | 500 | mine_chatvalg | 10 | 1.0 ms | 3.7 ms |
| varm | rask | 500 | les_preparatsok | 5 | 1.9 ms | 4.3 ms |
| varm | rask | 500 | er_systemarkitekt | 10 | 0.8 ms | 1.7 ms |
| varm | rask | 500 | brukerinnstillinger | 12 | 0.6 ms | 3.0 ms |
| varm | rask | 500 | les_laboratoriesok | 5 | 1.0 ms | 1.4 ms |
| varm | treg | 500 | les_stoffer | 5 | 542.6 ms | 692.7 ms |
| varm | treg | 500 | forsideoppsummering | 40 | 14.4 ms | 58.4 ms |
| varm | treg | 500 | les_kommentarer | 10 | 39.3 ms | 56.5 ms |
| varm | treg | 500 | les_stoffregister | 15 | 5.8 ms | 10.5 ms |
| varm | treg | 500 | mine_gruppesamtaler | 10 | 7.8 ms | 24.2 ms |
| varm | treg | 500 | mine_rettigheter | 10 | 7.8 ms | 12.4 ms |
| varm | treg | 500 | mine_grupper | 10 | 5.8 ms | 13.6 ms |
| varm | treg | 500 | les_scenarioregler | 10 | 5.0 ms | 13.1 ms |
| varm | treg | 500 | les_forslagsko | 10 | 4.5 ms | 8.8 ms |
| varm | treg | 500 | les_analyttkatalog | 10 | 4.5 ms | 5.8 ms |
| varm | treg | 500 | profiles | 10 | 2.5 ms | 3.7 ms |
| varm | treg | 500 | les_intervallregelsett | 10 | 2.5 ms | 3.9 ms |
| varm | treg | 500 | les_thc_regelsett | 10 | 2.4 ms | 3.9 ms |
| varm | treg | 500 | stillingskategorier | 10 | 1.8 ms | 4.4 ms |
| varm | treg | 500 | sokedata_versjoner | 9 | 2.0 ms | 4.6 ms |
| varm | treg | 500 | ideer_med_nytt | 10 | 1.7 ms | 2.6 ms |
| varm | treg | 500 | uleste_varsler | 10 | 1.7 ms | 3.8 ms |
| varm | treg | 500 | kan_endre_lokalt_innhold | 10 | 1.4 ms | 1.8 ms |
| varm | treg | 500 | datakilder_status | 10 | 1.2 ms | 1.9 ms |
| varm | treg | 500 | les_interaksjonssok | 4 | 2.7 ms | 6.9 ms |
| varm | treg | 500 | rydd_stoffpapirkurven | 8 | 1.1 ms | 1.4 ms |
| varm | treg | 500 | min_profil | 10 | 0.8 ms | 2.0 ms |
| varm | treg | 500 | mine_direktesamtaler | 10 | 0.8 ms | 2.1 ms |
| varm | treg | 500 | er_systemarkitekt | 10 | 0.8 ms | 1.4 ms |
| varm | treg | 500 | mine_chatvalg | 10 | 0.6 ms | 1.4 ms |
| varm | treg | 500 | les_fagsaker | 8 | 0.8 ms | 1.0 ms |
| varm | treg | 500 | les_preparatsok | 4 | 1.4 ms | 2.7 ms |
| varm | treg | 500 | les_laboratoriesok | 4 | 0.8 ms | 0.9 ms |