<!-- Den fulle rapporten fra utgangspunktet (#500), laget av src/__tests__/qa/ytelse.ts. Personsøket ble målt på nytt kl. 07.39 UTC etter at merket for svaret ble rettet til å gjelde etter siste tastetrykk; resten er fra kjøringen kl. 06.53 UTC. Sammendraget og metoden: docs/ytelse-maling.md. -->

# Ytelsesmåling 2026-11-20 07:39 UTC

Miljø: `{"kode":"22af4ec9","appkode":"lik origin/main","cpu":"Intel(R) Xeon(R) Processor @ 2.10GHz","kjerner":4,"minneGB":16,"node":"v22.23.5","postgres":"17.11","work_mem":"4MB","gjentakelser":5,"profiler":["rask","treg"]}`

Datagrunnlag per personmengde: `{"50":{"profiler":53,"syntetiske_personer":50,"aktive_medlemskap":54,"avsluttede_medlemskap":11,"inviterte_medlemskap":1,"lokale_administratorer":3,"direktemeldinger_pa":21,"blokkeringer":3,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"500":{"profiler":503,"syntetiske_personer":500,"aktive_medlemskap":518,"avsluttede_medlemskap":100,"inviterte_medlemskap":10,"lokale_administratorer":12,"direktemeldinger_pa":201,"blokkeringer":30,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79},"5000":{"profiler":5003,"syntetiske_personer":5000,"aktive_medlemskap":5153,"avsluttede_medlemskap":1000,"inviterte_medlemskap":100,"lokale_administratorer":102,"direktemeldinger_pa":2001,"blokkeringer":300,"publiserte_fagsider":128,"objektutgaver":17634,"analyttkatalog_oppforinger":79}}`

## Appen: tid til hvert merke (fra handlingen)

| Scenario | Profil | Personer | Merke | Tid: median (p95; min–maks) | API-kall startet innen | JS hentet innen: overført / utpakket | Lange oppgaver innen (sum) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| kald | rask | 500 | skall | 679 ms (p95 748 ms; 628 ms–748 ms) | 27 (27–39) | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 332 ms (p95 381 ms; 327 ms–381 ms) |
| kald | rask | 500 | forside | 679 ms (p95 748 ms; 628 ms–748 ms) | 27 (27–39) | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 332 ms (p95 381 ms; 327 ms–381 ms) |
| kald | rask | 500 | forside_tittel | 801 ms (p95 878 ms; 748 ms–878 ms) | 27 (27–39) | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 379 ms (p95 387 ms; 329 ms–387 ms) |
| kald | rask | 500 | fagsok_svar | 1792 ms (p95 1901 ms; 1236 ms–1901 ms) | 45 (39–45) | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 577 ms (p95 690 ms; 536 ms–690 ms) |
| kald | rask | 500 | forside_paneler | 1051 ms (p95 1339 ms; 942 ms–1339 ms) | 41 (39–42) | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 379 ms (p95 690 ms; 329 ms–690 ms) |
| varm | rask | 500 | skall | 454 ms (p95 515 ms; 394 ms–515 ms) | 26 (26–35) | 1 kB (p95 1 kB; 1 kB–1 kB) / 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 316 ms (p95 344 ms; 265 ms–344 ms) |
| varm | rask | 500 | forside | 454 ms (p95 515 ms; 394 ms–515 ms) | 26 (26–35) | 1 kB (p95 1 kB; 1 kB–1 kB) / 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 316 ms (p95 344 ms; 265 ms–344 ms) |
| varm | rask | 500 | forside_tittel | 588 ms (p95 684 ms; 492 ms–684 ms) | 29 (26–39) | 1 kB (p95 1 kB; 1 kB–1 kB) / 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 334 ms (p95 366 ms; 268 ms–366 ms) |
| varm | rask | 500 | fagsok_svar | 1055 ms (p95 1165 ms; 614 ms–1165 ms) | 40 (29–40) | 1 kB (p95 1 kB; 1 kB–1 kB) / 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 520 ms (p95 645 ms; 366 ms–645 ms) |
| varm | rask | 500 | forside_paneler | 1024 ms (p95 1124 ms; 790 ms–1124 ms) | 40 (38–40) | 1 kB (p95 1 kB; 1 kB–1 kB) / 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 520 ms (p95 587 ms; 318 ms–587 ms) |
| fagside | rask | 500 | fagside_navn | 55 ms (p95 73 ms; 52 ms–73 ms) | 6 | 0 kB (p95 42 kB; 0 kB–42 kB) / 0 kB (p95 129 kB; 0 kB–129 kB) | 0 ms (p95 59 ms; 0 ms–59 ms) |
| fagside | rask | 500 | fagside_innhold | 139 ms (p95 157 ms; 119 ms–157 ms) | 6 | 42 kB (p95 42 kB; 42 kB–42 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 0 ms (p95 59 ms; 0 ms–59 ms) |
| fagside | rask | 500 | fagside_komplett | 139 ms (p95 157 ms; 119 ms–157 ms) | 6 | 42 kB (p95 42 kB; 42 kB–42 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 0 ms (p95 59 ms; 0 ms–59 ms) |
| direkte | rask | 500 | skall | 442 ms (p95 458 ms; 429 ms–458 ms) | 29 (29–34) | 1 kB (p95 43 kB; 1 kB–43 kB) / 2918 kB (p95 3047 kB; 2918 kB–3047 kB) | 299 ms (p95 312 ms; 291 ms–312 ms) |
| direkte | rask | 500 | fagside_navn | 679 ms (p95 708 ms; 633 ms–708 ms) | 38 (37–40) | 43 kB (p95 43 kB; 43 kB–43 kB) / 3047 kB (p95 3047 kB; 3047 kB–3047 kB) | 299 ms (p95 431 ms; 291 ms–431 ms) |
| direkte | rask | 500 | fagside_innhold | 708 ms (p95 716 ms; 679 ms–716 ms) | 38 (37–40) | 43 kB (p95 43 kB; 43 kB–43 kB) / 3047 kB (p95 3047 kB; 3047 kB–3047 kB) | 347 ms (p95 431 ms; 295 ms–431 ms) |
| direkte | rask | 500 | fagside_komplett | 708 ms (p95 716 ms; 679 ms–716 ms) | 38 (37–40) | 43 kB (p95 43 kB; 43 kB–43 kB) / 3047 kB (p95 3047 kB; 3047 kB–3047 kB) | 347 ms (p95 431 ms; 295 ms–431 ms) |
| fortolkning | rask | 500 | fortolkning | 85 ms (p95 107 ms; 74 ms–107 ms) | 0 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| fortolkning | rask | 500 | fortolkning_treff | 119 ms (p95 138 ms; 107 ms–138 ms) | 0 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| fagmiljobytte | rask | 500 | forside_tittel | 112 ms (p95 132 ms; 92 ms–132 ms) | 1 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| fagmiljobytte | rask | 500 | forside_paneler | 398 ms (p95 409 ms; 372 ms–409 ms) | 42 (41–42) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 89 ms (p95 137 ms; 75 ms–137 ms) |
| kald | treg | 500 | skall | 2798 ms (p95 2917 ms; 2738 ms–2917 ms) | 39 | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 1512 ms (p95 1639 ms; 1486 ms–1639 ms) |
| kald | treg | 500 | forside | 2798 ms (p95 2917 ms; 2738 ms–2917 ms) | 39 | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 1512 ms (p95 1639 ms; 1486 ms–1639 ms) |
| kald | treg | 500 | forside_tittel | 2798 ms (p95 2917 ms; 2738 ms–2917 ms) | 39 | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 1512 ms (p95 1639 ms; 1486 ms–1639 ms) |
| kald | treg | 500 | fagsok_svar | 13.3 s (p95 13.6 s; 13.3 s–13.6 s) | 44 | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 3263 ms (p95 3357 ms; 3162 ms–3357 ms) |
| kald | treg | 500 | forside_paneler | 3641 ms (p95 3830 ms; 3496 ms–3830 ms) | 39 | 733 kB (p95 733 kB; 733 kB–733 kB) / 2464 kB (p95 2464 kB; 2464 kB–2464 kB) | 1725 ms (p95 1889 ms; 1701 ms–1889 ms) |
| varm | treg | 500 | skall | 1924 ms (p95 2031 ms; 1913 ms–2031 ms) | 38 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1332 ms (p95 1418 ms; 1263 ms–1418 ms) |
| varm | treg | 500 | forside | 1924 ms (p95 2031 ms; 1913 ms–2031 ms) | 38 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1332 ms (p95 1418 ms; 1263 ms–1418 ms) |
| varm | treg | 500 | forside_tittel | 1924 ms (p95 2031 ms; 1913 ms–2031 ms) | 38 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1332 ms (p95 1418 ms; 1263 ms–1418 ms) |
| varm | treg | 500 | fagsok_svar | 12.3 s (p95 12.5 s; 12.2 s–12.5 s) | 43 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 3018 ms (p95 3180 ms; 2872 ms–3180 ms) |
| varm | treg | 500 | forside_paneler | 2888 ms (p95 2986 ms; 2842 ms–2986 ms) | 39 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1681 ms (p95 1788 ms; 1601 ms–1788 ms) |
| fagside | treg | 500 | fagside_navn | 577 ms (p95 843 ms; 359 ms–843 ms) | 6 | 42 kB (p95 42 kB; 0 kB–42 kB) / 129 kB (p95 129 kB; 0 kB–129 kB) | 528 ms (p95 746 ms; 456 ms–746 ms) |
| fagside | treg | 500 | fagside_innhold | 866 ms (p95 1135 ms; 716 ms–1135 ms) | 6 | 42 kB (p95 42 kB; 42 kB–42 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 686 ms (p95 949 ms; 599 ms–949 ms) |
| fagside | treg | 500 | fagside_komplett | 866 ms (p95 1135 ms; 716 ms–1135 ms) | 6 | 42 kB (p95 42 kB; 42 kB–42 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 686 ms (p95 949 ms; 599 ms–949 ms) |
| direkte | treg | 500 | skall | 2107 ms (p95 2177 ms; 2035 ms–2177 ms) | 37 | 1 kB (p95 1 kB; 1 kB–1 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1456 ms (p95 1568 ms; 1391 ms–1568 ms) |
| direkte | treg | 500 | fagside_navn | 2680 ms (p95 2812 ms; 2482 ms–2812 ms) | 37 | 43 kB (p95 43 kB; 43 kB–43 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 1790 ms (p95 1916 ms; 1725 ms–1916 ms) |
| direkte | treg | 500 | fagside_innhold | 2941 ms (p95 2974 ms; 2482 ms–2974 ms) | 37 | 43 kB (p95 43 kB; 43 kB–43 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 1938 ms (p95 2003 ms; 1725 ms–2003 ms) |
| direkte | treg | 500 | fagside_komplett | 2941 ms (p95 2974 ms; 2482 ms–2974 ms) | 37 | 43 kB (p95 43 kB; 43 kB–43 kB) / 129 kB (p95 129 kB; 129 kB–129 kB) | 1938 ms (p95 2003 ms; 1725 ms–2003 ms) |
| fortolkning | treg | 500 | fortolkning | 725 ms (p95 941 ms; 606 ms–941 ms) | 0 (0–1) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 403 ms (p95 539 ms; 362 ms–539 ms) |
| fortolkning | treg | 500 | fortolkning_treff | 893 ms (p95 1130 ms; 759 ms–1130 ms) | 1 (0–1) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 532 ms (p95 632 ms; 476 ms–632 ms) |
| fagmiljobytte | treg | 500 | forside_tittel | 412 ms (p95 1071 ms; 343 ms–1071 ms) | 2 (1–19) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 81 ms (p95 524 ms; 69 ms–524 ms) |
| fagmiljobytte | treg | 500 | forside_paneler | 1006 ms (p95 1071 ms; 908 ms–1071 ms) | 11 (10–19) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 486 ms (p95 524 ms; 456 ms–524 ms) |
| brukere | rask | 50 | brukere | 216 ms (p95 281 ms; 202 ms–281 ms) | 1 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 0 ms (p95 0 ms; 0 ms–0 ms) |
| brukere | treg | 50 | brukere | 619 ms (p95 741 ms; 533 ms–741 ms) | 2 (1–2) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 238 ms (p95 299 ms; 183 ms–299 ms) |
| brukere | rask | 500 | brukere | 715 ms (p95 789 ms; 669 ms–789 ms) | 1 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 72 ms (p95 139 ms; 69 ms–139 ms) |
| brukere | treg | 500 | brukere | 1682 ms (p95 1807 ms; 1525 ms–1807 ms) | 2 (1–2) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 692 ms (p95 802 ms; 613 ms–802 ms) |
| brukere | rask | 5000 | brukere | 5002 ms (p95 5500 ms; 4843 ms–5500 ms) | 1 | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 201 ms (p95 249 ms; 192 ms–249 ms) |
| brukere | treg | 5000 | brukere | 7648 ms (p95 7756 ms; 7375 ms–7756 ms) | 2 (1–2) | 0 kB (p95 0 kB; 0 kB–0 kB) / 0 kB (p95 0 kB; 0 kB–0 kB) | 1272 ms (p95 1432 ms; 1262 ms–1432 ms) |

## Fagsiden: referanselisten mens kildene kommer

| Scenario | Profil | Referanser til slutt | Visninger av listen | Referanser som fikk nytt nummer | Referanser lagt til etter første visning |
| --- | --- | --- | --- | --- | --- |
| fagside | rask | 32 | 2 | 31 | 1 |
| direkte | rask | 32 | 2 | 31 | 1 |
| fagside | treg | 32 | 2 | 31 | 1 |
| direkte | treg | 32 | 2 | 31 | 1 |

## Personsøket: fra siste tastetrykk til svaret står

| Søket | Profil | Personer | Svar: median (p95; min–maks) | Pause før kallet | Kallet (nett og server) | Visning | Kall per søk | Riktige treff |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| gruppeinvitasjon: første søk | rask | 50 | 319 ms (p95 325 ms; 287 ms–325 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 60 ms (p95 64 ms; 20 ms–64 ms) | 9 ms (p95 17 ms; 8 ms–17 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 50 | 24 ms (p95 67 ms; 4 ms–67 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 50 | 327 ms (p95 372 ms; 308 ms–372 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 60 ms (p95 111 ms; 50 ms–111 ms) | 15 ms (p95 16 ms; 6 ms–16 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 50 | 313 ms (p95 343 ms; 282 ms–343 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 52 ms (p95 80 ms; 21 ms–80 ms) | 11 ms (p95 16 ms; 7 ms–16 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 50 | 317 ms (p95 328 ms; 309 ms–328 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 53 ms (p95 56 ms; 48 ms–56 ms) | 14 ms (p95 23 ms; 6 ms–23 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 50 | 313 ms (p95 339 ms; 292 ms–339 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 48 ms (p95 82 ms; 23 ms–82 ms) | 8 ms (p95 17 ms; 5 ms–17 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 50 | 268 ms (p95 274 ms; 263 ms–274 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 50 | 329 ms (p95 347 ms; 320 ms–347 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 50 | 298 ms (p95 303 ms; 290 ms–303 ms) | 252 ms (p95 254 ms; 252 ms–254 ms) | 34 ms (p95 42 ms; 32 ms–42 ms) | 11 ms (p95 17 ms; 3 ms–17 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 50 | 37 ms (p95 88 ms; 14 ms–88 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 50 | 303 ms (p95 319 ms; 296 ms–319 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 38 ms (p95 57 ms; 35 ms–57 ms) | 10 ms (p95 13 ms; 8 ms–13 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 50 | 298 ms (p95 316 ms; 294 ms–316 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 30 ms (p95 41 ms; 30 ms–41 ms) | 15 ms (p95 23 ms; 12 ms–23 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 50 | 293 ms (p95 310 ms; 289 ms–310 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 32 ms (p95 35 ms; 30 ms–35 ms) | 11 ms (p95 23 ms; 7 ms–23 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 50 | 294 ms (p95 321 ms; 285 ms–321 ms) | 252 ms (p95 252 ms; 251 ms–252 ms) | 31 ms (p95 48 ms; 23 ms–48 ms) | 11 ms (p95 21 ms; 9 ms–21 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 50 | 268 ms (p95 270 ms; 264 ms–270 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 50 | 325 ms (p95 341 ms; 281 ms–341 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 50 | 287 ms (p95 307 ms; 276 ms–307 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 26 ms (p95 34 ms; 14 ms–34 ms) | 10 ms (p95 20 ms; 5 ms–20 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 50 | 5 ms (p95 31 ms; 2 ms–31 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 50 | 293 ms (p95 300 ms; 291 ms–300 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 31 ms (p95 35 ms; 28 ms–35 ms) | 12 ms (p95 17 ms; 4 ms–17 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 50 | 284 ms (p95 298 ms; 281 ms–298 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 25 ms (p95 33 ms; 14 ms–33 ms) | 11 ms (p95 19 ms; 3 ms–19 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 50 | 290 ms (p95 296 ms; 279 ms–296 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 25 ms (p95 26 ms; 23 ms–26 ms) | 13 ms (p95 18 ms; 4 ms–18 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 50 | 292 ms (p95 296 ms; 282 ms–296 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 26 ms (p95 37 ms; 14 ms–37 ms) | 13 ms (p95 17 ms; 4 ms–17 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 50 | 266 ms (p95 275 ms; 263 ms–275 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 50 | 288 ms (p95 301 ms; 271 ms–301 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 50 | 376 ms (p95 380 ms; 374 ms–380 ms) | 258 ms (p95 258 ms; 256 ms–258 ms) | 85 ms (p95 88 ms; 84 ms–88 ms) | 34 ms (p95 37 ms; 29 ms–37 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 50 | 26 ms (p95 79 ms; 20 ms–79 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 50 | 375 ms (p95 382 ms; 372 ms–382 ms) | 258 ms (p95 260 ms; 258 ms–260 ms) | 88 ms (p95 91 ms; 85 ms–91 ms) | 29 ms (p95 37 ms; 24 ms–37 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 50 | 373 ms (p95 389 ms; 360 ms–389 ms) | 257 ms (p95 261 ms; 255 ms–261 ms) | 86 ms (p95 86 ms; 84 ms–86 ms) | 30 ms (p95 42 ms; 21 ms–42 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 50 | 376 ms (p95 388 ms; 366 ms–388 ms) | 258 ms (p95 260 ms; 257 ms–260 ms) | 86 ms (p95 90 ms; 85 ms–90 ms) | 33 ms (p95 38 ms; 24 ms–38 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 50 | 367 ms (p95 369 ms; 364 ms–369 ms) | 257 ms (p95 259 ms; 256 ms–259 ms) | 85 ms (p95 88 ms; 84 ms–88 ms) | 23 ms (p95 29 ms; 20 ms–29 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 50 | 286 ms (p95 298 ms; 283 ms–298 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 50 | 373 ms (p95 398 ms; 369 ms–398 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 50 | 358 ms (p95 360 ms; 351 ms–360 ms) | 257 ms (p95 260 ms; 257 ms–260 ms) | 85 ms (p95 86 ms; 84 ms–86 ms) | 14 ms (p95 19 ms; 9 ms–19 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 50 | 71 ms (p95 113 ms; 13 ms–113 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 50 | 377 ms (p95 378 ms; 373 ms–378 ms) | 259 ms (p95 261 ms; 258 ms–261 ms) | 86 ms (p95 88 ms; 84 ms–88 ms) | 32 ms (p95 35 ms; 27 ms–35 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 50 | 374 ms (p95 378 ms; 356 ms–378 ms) | 258 ms (p95 259 ms; 256 ms–259 ms) | 85 ms (p95 86 ms; 84 ms–86 ms) | 31 ms (p95 37 ms; 13 ms–37 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 50 | 381 ms (p95 390 ms; 369 ms–390 ms) | 259 ms (p95 260 ms; 258 ms–260 ms) | 86 ms (p95 86 ms; 84 ms–86 ms) | 39 ms (p95 45 ms; 25 ms–45 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 50 | 375 ms (p95 382 ms; 351 ms–382 ms) | 257 ms (p95 258 ms; 256 ms–258 ms) | 86 ms (p95 87 ms; 83 ms–87 ms) | 35 ms (p95 37 ms; 9 ms–37 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 50 | 293 ms (p95 300 ms; 289 ms–300 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 50 | 382 ms (p95 410 ms; 379 ms–410 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 50 | 356 ms (p95 384 ms; 353 ms–384 ms) | 258 ms (p95 260 ms; 258 ms–260 ms) | 86 ms (p95 88 ms; 84 ms–88 ms) | 12 ms (p95 40 ms; 11 ms–40 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 50 | 18 ms (p95 24 ms; 10 ms–24 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 50 | 368 ms (p95 375 ms; 354 ms–375 ms) | 258 ms (p95 260 ms; 257 ms–260 ms) | 88 ms (p95 90 ms; 86 ms–90 ms) | 23 ms (p95 27 ms; 9 ms–27 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 50 | 362 ms (p95 376 ms; 361 ms–376 ms) | 259 ms (p95 261 ms; 257 ms–261 ms) | 84 ms (p95 87 ms; 84 ms–87 ms) | 20 ms (p95 32 ms; 17 ms–32 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 50 | 359 ms (p95 1294 ms; 353 ms–1294 ms) | 259 ms (p95 652 ms; 257 ms–652 ms) | 86 ms (p95 88 ms; 85 ms–88 ms) | 13 ms (p95 556 ms; 7 ms–556 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 50 | 364 ms (p95 376 ms; 357 ms–376 ms) | 257 ms (p95 259 ms; 257 ms–259 ms) | 86 ms (p95 88 ms; 84 ms–88 ms) | 19 ms (p95 32 ms; 15 ms–32 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 50 | 290 ms (p95 300 ms; 283 ms–300 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 50 | 362 ms (p95 380 ms; 356 ms–380 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | rask | 500 | 666 ms (p95 720 ms; 432 ms–720 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 397 ms (p95 445 ms; 166 ms–445 ms) | 18 ms (p95 28 ms; 14 ms–28 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 500 | 23 ms (p95 66 ms; 14 ms–66 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 500 | 800 ms (p95 862 ms; 678 ms–862 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 507 ms (p95 569 ms; 402 ms–569 ms) | 29 ms (p95 54 ms; 18 ms–54 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 500 | 756 ms (p95 842 ms; 419 ms–842 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 473 ms (p95 560 ms; 149 ms–560 ms) | 23 ms (p95 31 ms; 18 ms–31 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 500 | 742 ms (p95 794 ms; 706 ms–794 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 452 ms (p95 517 ms; 424 ms–517 ms) | 39 ms (p95 42 ms; 26 ms–42 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 500 | 690 ms (p95 816 ms; 595 ms–816 ms) | 251 ms (p95 252 ms; 251 ms–252 ms) | 416 ms (p95 548 ms; 326 ms–548 ms) | 17 ms (p95 36 ms; 6 ms–36 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 500 | 273 ms (p95 277 ms; 263 ms–277 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 500 | 673 ms (p95 728 ms; 419 ms–728 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 500 | 497 ms (p95 504 ms; 445 ms–504 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 225 ms (p95 237 ms; 180 ms–237 ms) | 15 ms (p95 20 ms; 14 ms–20 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 500 | 17 ms (p95 63 ms; 6 ms–63 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 500 | 533 ms (p95 634 ms; 517 ms–634 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 256 ms (p95 295 ms; 241 ms–295 ms) | 29 ms (p95 101 ms; 24 ms–101 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 500 | 504 ms (p95 637 ms; 458 ms–637 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 235 ms (p95 332 ms; 193 ms–332 ms) | 21 ms (p95 62 ms; 13 ms–62 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 500 | 534 ms (p95 635 ms; 506 ms–635 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 257 ms (p95 326 ms; 234 ms–326 ms) | 21 ms (p95 57 ms; 19 ms–57 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 500 | 517 ms (p95 586 ms; 435 ms–586 ms) | 252 ms (p95 252 ms; 251 ms–252 ms) | 245 ms (p95 307 ms; 170 ms–307 ms) | 21 ms (p95 31 ms; 14 ms–31 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 500 | 276 ms (p95 282 ms; 272 ms–282 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 500 | 511 ms (p95 517 ms; 462 ms–517 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 500 | 436 ms (p95 444 ms; 342 ms–444 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 172 ms (p95 179 ms; 84 ms–179 ms) | 9 ms (p95 20 ms; 4 ms–20 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 500 | 16 ms (p95 22 ms; 4 ms–22 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 500 | 505 ms (p95 560 ms; 479 ms–560 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 240 ms (p95 286 ms; 214 ms–286 ms) | 18 ms (p95 22 ms; 12 ms–22 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 500 | 442 ms (p95 479 ms; 355 ms–479 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 172 ms (p95 207 ms; 95 ms–207 ms) | 18 ms (p95 20 ms; 8 ms–20 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 500 | 476 ms (p95 508 ms; 458 ms–508 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 215 ms (p95 241 ms; 199 ms–241 ms) | 9 ms (p95 17 ms; 3 ms–17 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 500 | 447 ms (p95 522 ms; 370 ms–522 ms) | 252 ms (p95 252 ms; 251 ms–252 ms) | 182 ms (p95 257 ms; 107 ms–257 ms) | 12 ms (p95 14 ms; 11 ms–14 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 500 | 264 ms (p95 268 ms; 262 ms–268 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 500 | 438 ms (p95 466 ms; 335 ms–466 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 500 | 751 ms (p95 781 ms; 440 ms–781 ms) | 258 ms (p95 261 ms; 256 ms–261 ms) | 430 ms (p95 495 ms; 153 ms–495 ms) | 39 ms (p95 88 ms; 29 ms–88 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 500 | 25 ms (p95 107 ms; 21 ms–107 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 500 | 852 ms (p95 920 ms; 746 ms–920 ms) | 258 ms (p95 260 ms; 255 ms–260 ms) | 542 ms (p95 600 ms; 461 ms–600 ms) | 49 ms (p95 60 ms; 26 ms–60 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 500 | 802 ms (p95 2073 ms; 488 ms–2073 ms) | 259 ms (p95 782 ms; 258 ms–782 ms) | 501 ms (p95 525 ms; 200 ms–525 ms) | 64 ms (p95 766 ms; 30 ms–766 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 500 | 830 ms (p95 859 ms; 742 ms–859 ms) | 259 ms (p95 262 ms; 257 ms–262 ms) | 505 ms (p95 555 ms; 449 ms–555 ms) | 59 ms (p95 71 ms; 35 ms–71 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 500 | 735 ms (p95 845 ms; 446 ms–845 ms) | 257 ms (p95 258 ms; 255 ms–258 ms) | 433 ms (p95 525 ms; 155 ms–525 ms) | 33 ms (p95 63 ms; 19 ms–63 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 500 | 298 ms (p95 302 ms; 294 ms–302 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 500 | 726 ms (p95 761 ms; 478 ms–761 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 500 | 513 ms (p95 576 ms; 461 ms–576 ms) | 257 ms (p95 259 ms; 257 ms–259 ms) | 229 ms (p95 258 ms; 182 ms–258 ms) | 22 ms (p95 60 ms; 19 ms–60 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 500 | 50 ms (p95 102 ms; 41 ms–102 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 500 | 645 ms (p95 715 ms; 572 ms–715 ms) | 258 ms (p95 261 ms; 257 ms–261 ms) | 261 ms (p95 381 ms; 256 ms–381 ms) | 76 ms (p95 164 ms; 59 ms–164 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 500 | 573 ms (p95 2098 ms; 454 ms–2098 ms) | 258 ms (p95 696 ms; 257 ms–696 ms) | 249 ms (p95 293 ms; 180 ms–293 ms) | 66 ms (p95 1161 ms; 17 ms–1161 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 500 | 658 ms (p95 710 ms; 595 ms–710 ms) | 259 ms (p95 259 ms; 258 ms–259 ms) | 286 ms (p95 368 ms; 237 ms–368 ms) | 113 ms (p95 135 ms; 84 ms–135 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 500 | 559 ms (p95 646 ms; 504 ms–646 ms) | 257 ms (p95 260 ms; 256 ms–260 ms) | 247 ms (p95 324 ms; 218 ms–324 ms) | 65 ms (p95 68 ms; 27 ms–68 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 500 | 323 ms (p95 330 ms; 318 ms–330 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 500 | 607 ms (p95 673 ms; 503 ms–673 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 500 | 447 ms (p95 478 ms; 361 ms–478 ms) | 259 ms (p95 261 ms; 257 ms–261 ms) | 172 ms (p95 194 ms; 84 ms–194 ms) | 19 ms (p95 35 ms; 14 ms–35 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 500 | 22 ms (p95 33 ms; 9 ms–33 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 500 | 538 ms (p95 589 ms; 501 ms–589 ms) | 258 ms (p95 259 ms; 257 ms–259 ms) | 243 ms (p95 299 ms; 217 ms–299 ms) | 32 ms (p95 36 ms; 26 ms–36 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 500 | 459 ms (p95 501 ms; 366 ms–501 ms) | 258 ms (p95 263 ms; 258 ms–263 ms) | 170 ms (p95 213 ms; 85 ms–213 ms) | 26 ms (p95 32 ms; 14 ms–32 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 500 | 483 ms (p95 525 ms; 473 ms–525 ms) | 259 ms (p95 259 ms; 258 ms–259 ms) | 201 ms (p95 248 ms; 194 ms–248 ms) | 22 ms (p95 30 ms; 13 ms–30 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 500 | 460 ms (p95 497 ms; 361 ms–497 ms) | 256 ms (p95 260 ms; 255 ms–260 ms) | 175 ms (p95 210 ms; 89 ms–210 ms) | 20 ms (p95 31 ms; 16 ms–31 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 500 | 289 ms (p95 300 ms; 281 ms–300 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 500 | 462 ms (p95 508 ms; 363 ms–508 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | rask | 5000 | 4119 ms (p95 4308 ms; 1690 ms–4308 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 3829 ms (p95 4037 ms; 1409 ms–4037 ms) | 30 ms (p95 48 ms; 19 ms–48 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | rask | 5000 | 16 ms (p95 55 ms; 11 ms–55 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | rask | 5000 | 5405 ms (p95 5688 ms; 4571 ms–5688 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 5103 ms (p95 5424 ms; 4268 ms–5424 ms) | 50 ms (p95 57 ms; 12 ms–57 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | rask | 5000 | 4432 ms (p95 5085 ms; 2094 ms–5085 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 4158 ms (p95 4788 ms; 1815 ms–4788 ms) | 27 ms (p95 50 ms; 22 ms–50 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | rask | 5000 | 4996 ms (p95 5150 ms; 4837 ms–5150 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 4725 ms (p95 4852 ms; 4564 ms–4852 ms) | 21 ms (p95 46 ms; 19 ms–46 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | rask | 5000 | 4839 ms (p95 5393 ms; 2173 ms–5393 ms) | 252 ms (p95 258 ms; 252 ms–258 ms) | 4569 ms (p95 5096 ms; 1909 ms–5096 ms) | 30 ms (p95 48 ms; 13 ms–48 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | rask | 5000 | 265 ms (p95 272 ms; 262 ms–272 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | rask | 5000 | 4329 ms (p95 4606 ms; 1907 ms–4606 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | rask | 5000 | 2700 ms (p95 2936 ms; 1988 ms–2936 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 2405 ms (p95 2651 ms; 1707 ms–2651 ms) | 31 ms (p95 53 ms; 12 ms–53 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | rask | 5000 | 12 ms (p95 79 ms; 7 ms–79 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | rask | 5000 | 2892 ms (p95 3322 ms; 2760 ms–3322 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 2587 ms (p95 3029 ms; 2480 ms–3029 ms) | 46 ms (p95 67 ms; 29 ms–67 ms) | 1 | 5/5 |
| medlemskandidater: aksent | rask | 5000 | 2743 ms (p95 3063 ms; 2075 ms–3063 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 2435 ms (p95 2743 ms; 1801 ms–2743 ms) | 56 ms (p95 69 ms; 22 ms–69 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | rask | 5000 | 2822 ms (p95 2856 ms; 2594 ms–2856 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 2546 ms (p95 2575 ms; 2301 ms–2575 ms) | 29 ms (p95 51 ms; 24 ms–51 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | rask | 5000 | 2836 ms (p95 3126 ms; 2094 ms–3126 ms) | 252 ms (p95 253 ms; 251 ms–253 ms) | 2527 ms (p95 2808 ms; 1831 ms–2808 ms) | 58 ms (p95 68 ms; 12 ms–68 ms) | 1 | 5/5 |
| medlemskandidater: feil | rask | 5000 | 283 ms (p95 288 ms; 277 ms–288 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | rask | 5000 | 2619 ms (p95 2697 ms; 2294 ms–2697 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | rask | 5000 | 1998 ms (p95 2024 ms; 989 ms–2024 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 1736 ms (p95 1758 ms; 722 ms–1758 ms) | 14 ms (p95 16 ms; 10 ms–16 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | rask | 5000 | 13 ms (p95 26 ms; 4 ms–26 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | rask | 5000 | 2424 ms (p95 2571 ms; 2162 ms–2571 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 2163 ms (p95 2307 ms; 1895 ms–2307 ms) | 11 ms (p95 15 ms; 9 ms–15 ms) | 1 | 5/5 |
| direktemelding: aksent | rask | 5000 | 1925 ms (p95 2360 ms; 1047 ms–2360 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 1650 ms (p95 2088 ms; 788 ms–2088 ms) | 11 ms (p95 23 ms; 5 ms–23 ms) | 1 | 5/5 |
| direktemelding: tomt treff | rask | 5000 | 2294 ms (p95 2406 ms; 2192 ms–2406 ms) | 252 ms (p95 253 ms; 252 ms–253 ms) | 2023 ms (p95 2148 ms; 1929 ms–2148 ms) | 7 ms (p95 18 ms; 6 ms–18 ms) | 1 | 5/5 |
| direktemelding: rask skriving | rask | 5000 | 2045 ms (p95 2330 ms; 1025 ms–2330 ms) | 252 ms (p95 252 ms; 252 ms–252 ms) | 1782 ms (p95 2061 ms; 759 ms–2061 ms) | 13 ms (p95 18 ms; 7 ms–18 ms) | 1 | 5/5 |
| direktemelding: feil | rask | 5000 | 267 ms (p95 270 ms; 262 ms–270 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | rask | 5000 | 2034 ms (p95 2100 ms; 896 ms–2100 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: første søk | treg | 5000 | 4345 ms (p95 4415 ms; 1685 ms–4415 ms) | 259 ms (p95 259 ms; 258 ms–259 ms) | 4049 ms (p95 4067 ms; 1389 ms–4067 ms) | 67 ms (p95 89 ms; 37 ms–89 ms) | 1 | 5/5 |
| gruppeinvitasjon: gjentatt søk | treg | 5000 | 40 ms (p95 87 ms; 31 ms–87 ms) | – | – | – | 0 | 5/5 |
| gruppeinvitasjon: skrivefeil | treg | 5000 | 5482 ms (p95 6116 ms; 4874 ms–6116 ms) | 258 ms (p95 261 ms; 257 ms–261 ms) | 5177 ms (p95 5809 ms; 4552 ms–5809 ms) | 55 ms (p95 64 ms; 45 ms–64 ms) | 1 | 5/5 |
| gruppeinvitasjon: aksent | treg | 5000 | 4643 ms (p95 5066 ms; 1814 ms–5066 ms) | 259 ms (p95 260 ms; 258 ms–260 ms) | 4357 ms (p95 4748 ms; 1502 ms–4748 ms) | 52 ms (p95 60 ms; 28 ms–60 ms) | 1 | 5/5 |
| gruppeinvitasjon: tomt treff | treg | 5000 | 5056 ms (p95 5184 ms; 4675 ms–5184 ms) | 259 ms (p95 260 ms; 258 ms–260 ms) | 4742 ms (p95 4864 ms; 4384 ms–4864 ms) | 37 ms (p95 61 ms; 30 ms–61 ms) | 1 | 5/5 |
| gruppeinvitasjon: rask skriving | treg | 5000 | 4382 ms (p95 5131 ms; 1849 ms–5131 ms) | 258 ms (p95 259 ms; 256 ms–259 ms) | 4074 ms (p95 4845 ms; 1544 ms–4845 ms) | 46 ms (p95 59 ms; 26 ms–59 ms) | 1 | 5/5 |
| gruppeinvitasjon: feil | treg | 5000 | 289 ms (p95 300 ms; 282 ms–300 ms) | – | – | – | 1 | 5/5 |
| gruppeinvitasjon: sent svar på forrige søk | treg | 5000 | 4372 ms (p95 4775 ms; 1805 ms–4775 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: første søk | treg | 5000 | 2877 ms (p95 3485 ms; 2337 ms–3485 ms) | 260 ms (p95 264 ms; 257 ms–264 ms) | 2589 ms (p95 3181 ms; 2000 ms–3181 ms) | 43 ms (p95 80 ms; 29 ms–80 ms) | 1 | 5/5 |
| medlemskandidater: gjentatt søk | treg | 5000 | 91 ms (p95 167 ms; 62 ms–167 ms) | – | – | – | 0 | 5/5 |
| medlemskandidater: skrivefeil | treg | 5000 | 3270 ms (p95 3599 ms; 3251 ms–3599 ms) | 259 ms (p95 261 ms; 258 ms–261 ms) | 2853 ms (p95 3178 ms; 2816 ms–3178 ms) | 160 ms (p95 189 ms; 139 ms–189 ms) | 1 | 5/5 |
| medlemskandidater: aksent | treg | 5000 | 3083 ms (p95 3309 ms; 2210 ms–3309 ms) | 262 ms (p95 275 ms; 259 ms–275 ms) | 2661 ms (p95 2860 ms; 1899 ms–2860 ms) | 164 ms (p95 175 ms; 51 ms–175 ms) | 1 | 5/5 |
| medlemskandidater: tomt treff | treg | 5000 | 3136 ms (p95 3373 ms; 3065 ms–3373 ms) | 261 ms (p95 403 ms; 259 ms–403 ms) | 2706 ms (p95 2906 ms; 2653 ms–2906 ms) | 153 ms (p95 184 ms; 135 ms–184 ms) | 1 | 5/5 |
| medlemskandidater: rask skriving | treg | 5000 | 3087 ms (p95 3170 ms; 2495 ms–3170 ms) | 259 ms (p95 266 ms; 258 ms–266 ms) | 2694 ms (p95 2746 ms; 2206 ms–2746 ms) | 131 ms (p95 165 ms; 23 ms–165 ms) | 1 | 5/5 |
| medlemskandidater: feil | treg | 5000 | 381 ms (p95 451 ms; 376 ms–451 ms) | – | – | – | 1 | 5/5 |
| medlemskandidater: sent svar på forrige søk | treg | 5000 | 3138 ms (p95 3162 ms; 2423 ms–3162 ms) | – | – | – | 1 | 5/5 |
| direktemelding: første søk | treg | 5000 | 2202 ms (p95 2512 ms; 959 ms–2512 ms) | 262 ms (p95 266 ms; 259 ms–266 ms) | 1918 ms (p95 2231 ms; 690 ms–2231 ms) | 23 ms (p95 31 ms; 10 ms–31 ms) | 1 | 5/5 |
| direktemelding: gjentatt søk | treg | 5000 | 24 ms (p95 41 ms; 13 ms–41 ms) | – | – | – | 0 | 5/5 |
| direktemelding: skrivefeil | treg | 5000 | 2597 ms (p95 2864 ms; 2435 ms–2864 ms) | 262 ms (p95 265 ms; 260 ms–265 ms) | 2309 ms (p95 2556 ms; 2118 ms–2556 ms) | 40 ms (p95 53 ms; 23 ms–53 ms) | 1 | 5/5 |
| direktemelding: aksent | treg | 5000 | 2134 ms (p95 2574 ms; 1226 ms–2574 ms) | 260 ms (p95 262 ms; 259 ms–262 ms) | 1842 ms (p95 2269 ms; 933 ms–2269 ms) | 31 ms (p95 47 ms; 24 ms–47 ms) | 1 | 5/5 |
| direktemelding: tomt treff | treg | 5000 | 2421 ms (p95 2991 ms; 2346 ms–2991 ms) | 262 ms (p95 268 ms; 261 ms–268 ms) | 2137 ms (p95 2704 ms; 2075 ms–2704 ms) | 19 ms (p95 23 ms; 11 ms–23 ms) | 1 | 5/5 |
| direktemelding: rask skriving | treg | 5000 | 2439 ms (p95 3089 ms; 1022 ms–3089 ms) | 258 ms (p95 262 ms; 256 ms–262 ms) | 2160 ms (p95 2777 ms; 747 ms–2777 ms) | 18 ms (p95 54 ms; 13 ms–54 ms) | 1 | 5/5 |
| direktemelding: feil | treg | 5000 | 289 ms (p95 298 ms; 286 ms–298 ms) | – | – | – | 1 | 5/5 |
| direktemelding: sent svar på forrige søk | treg | 5000 | 2121 ms (p95 2437 ms; 988 ms–2437 ms) | – | – | – | 1 | 5/5 |

## Oppstarten: kode og stil hentet fra siden ble åpnet til panelene på forsiden står

| Scenario | Profil | JS overført | JS utpakket | CSS overført | Kodefiler |
| --- | --- | --- | --- | --- | --- |
| kald | rask | 869 kB (p95 869 kB; 869 kB–869 kB) | 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 50 kB (p95 50 kB; 50 kB–50 kB) | 4 |
| varm | rask | 1 kB (p95 1 kB; 1 kB–1 kB) | 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 1 kB (p95 1 kB; 1 kB–1 kB) | 4 |
| kald | treg | 869 kB (p95 869 kB; 869 kB–869 kB) | 2918 kB (p95 2918 kB; 2918 kB–2918 kB) | 50 kB (p95 50 kB; 50 kB–50 kB) | 4 |
| varm | treg | 1 kB (p95 1 kB; 1 kB–1 kB) | 0 kB (p95 0 kB; 0 kB–0 kB) | 1 kB (p95 1 kB; 1 kB–1 kB) | 4 |

## API-kall startet før merket (første gjentakelse)

| Scenario | Profil | Merke | Kall |
| --- | --- | --- | --- |
| kald | rask | skall | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | rask | forside | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | rask | forside_tittel | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | rask | fagsok_svar | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | rask | forside_paneler | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| varm | rask | skall | brukerinnstillinger ×9, autoerstatt_regler, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | forside | brukerinnstillinger ×9, autoerstatt_regler, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | forside_tittel | brukerinnstillinger ×9, autoerstatt_regler, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, profiles, stillingskategorier, uleste_varsler |
| varm | rask | fagsok_svar | brukerinnstillinger ×10, forsideoppsummering ×4, les_stoffregister ×2, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| varm | rask | forside_paneler | brukerinnstillinger ×10, forsideoppsummering ×4, les_stoffregister ×2, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| fagside | rask | fagside_navn | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| fagside | rask | fagside_innhold | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| fagside | rask | fagside_komplett | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| direkte | rask | skall | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_grupper, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_navn | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_innhold | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | rask | fagside_komplett | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| fortolkning | rask | fortolkning | – |
| fortolkning | rask | fortolkning_treff | – |
| fagmiljobytte | rask | forside_tittel | velg_arbeidsfagmiljo |
| fagmiljobytte | rask | forside_paneler | brukerinnstillinger ×11, forsideoppsummering ×8, les_intervallregelsett ×2, les_thc_regelsett ×2, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, mine_chatvalg, mine_direktesamtaler, mine_gruppesamtaler, rydd_stoffpapirkurven, uleste_varsler, velg_arbeidsfagmiljo |
| kald | treg | skall | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | treg | forside | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | treg | forside_tittel | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| kald | treg | fagsok_svar | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_interaksjonssok, les_intervallregelsett, les_kommentarer, les_laboratoriesok, les_preparatsok, les_scenarioregler, les_stoffavoritter, les_stoffer, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| kald | treg | forside_paneler | brukerinnstillinger ×10, forsideoppsummering ×4, auth/token, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| varm | treg | skall | brukerinnstillinger ×10, forsideoppsummering ×4, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| varm | treg | forside | brukerinnstillinger ×10, forsideoppsummering ×4, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| varm | treg | forside_tittel | brukerinnstillinger ×10, forsideoppsummering ×4, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| varm | treg | fagsok_svar | brukerinnstillinger ×10, forsideoppsummering ×4, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_interaksjonssok, les_intervallregelsett, les_kommentarer, les_laboratoriesok, les_preparatsok, les_scenarioregler, les_stoffavoritter, les_stoffer, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| varm | treg | forside_paneler | brukerinnstillinger ×10, forsideoppsummering ×4, autoerstatt_regler, datakilder_status, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, les_analyttkatalog, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, profiles, rydd_stoffpapirkurven, sokedata_versjoner, stillingskategorier, uleste_varsler |
| fagside | treg | fagside_navn | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| fagside | treg | fagside_innhold | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| fagside | treg | fagside_komplett | brukerinnstillinger ×2, diskusjonsoversikt, kuratering_admin, les_bivirkninger, les_stoff |
| direkte | treg | skall | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_navn | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_innhold | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| direkte | treg | fagside_komplett | brukerinnstillinger ×10, autoerstatt_regler, datakilder_status, diskusjonsoversikt, er_systemarkitekt, ideer_med_nytt, kan_endre_lokalt_innhold, kuratering_admin, les_analyttkatalog, les_bivirkninger, les_fagsaker, les_forslagsko, les_intervallregelsett, les_kommentarer, les_scenarioregler, les_stoff, les_stoffavoritter, les_stoffregister, les_thc_regelsett, min_profil, mine_chatvalg, mine_direktesamtaler, mine_grupper, mine_gruppesamtaler, mine_rettigheter, rydd_stoffpapirkurven, stillingskategorier, uleste_varsler |
| fortolkning | treg | fortolkning | sokedata_versjoner |
| fortolkning | treg | fortolkning_treff | sokedata_versjoner |
| fagmiljobytte | treg | forside_tittel | sokedata_versjoner, velg_arbeidsfagmiljo |
| fagmiljobytte | treg | forside_paneler | forsideoppsummering ×4, brukerinnstillinger, les_analyttkatalog, les_intervallregelsett, les_kommentarer, les_thc_regelsett, sokedata_versjoner, velg_arbeidsfagmiljo |
| brukere | rask | brukere | medlemsoversikt |
| brukere | treg | brukere | medlemsoversikt, sokedata_versjoner |

## SQL: personsøkene i databasen (EXPLAIN ANALYZE, uten nett)

| RPC | Hvem | Personer | Søk | Kjøretid: median (p95; min–maks) | Treff | Blokker lest |
| --- | --- | --- | --- | --- | --- | --- |
| sok_gruppekandidater | systemarkitekt | 50 | «nils johansen» | 50 ms (p95 53 ms; 49 ms–53 ms) | 1 | 2876 |
| sok_gruppekandidater | systemarkitekt | 50 | «johanssen» | 62 ms (p95 66 ms; 60 ms–66 ms) | 1 | 2876 |
| sok_gruppekandidater | systemarkitekt | 50 | «an» | 25 ms (p95 39 ms; 24 ms–39 ms) | 10 | 2840 |
| sok_medlemskandidater | systemarkitekt | 50 | «nils johansen» | 32 ms (p95 36 ms; 32 ms–36 ms) | 0 | 3933 |
| sok_medlemskandidater | systemarkitekt | 50 | «johanssen» | 40 ms (p95 42 ms; 39 ms–42 ms) | 2 | 3948 |
| sok_medlemskandidater | systemarkitekt | 50 | «an» | 27 ms (p95 28 ms; 26 ms–28 ms) | 3 | 3870 |
| sok_medlemskandidater | lokal administrator | 50 | «nils johansen» | 26 ms (p95 29 ms; 26 ms–29 ms) | 0 | 4115 |
| sok_medlemskandidater | lokal administrator | 50 | «johanssen» | 25 ms (p95 26 ms; 23 ms–26 ms) | 0 | 4115 |
| sok_medlemskandidater | lokal administrator | 50 | «an» | 25 ms (p95 27 ms; 25 ms–27 ms) | 0 | 4115 |
| sok_direktemottakere | medlem | 50 | «nils johansen» | 22 ms (p95 34 ms; 19 ms–34 ms) | 0 | 2184 |
| sok_direktemottakere | medlem | 50 | «johanssen» | 26 ms (p95 27 ms; 24 ms–27 ms) | 0 | 2184 |
| sok_direktemottakere | medlem | 50 | «an» | 13 ms (p95 15 ms; 12 ms–15 ms) | 3 | 2087 |
| sok_gruppekandidater | systemarkitekt | 500 | «nils johansen» | 443 ms (p95 559 ms; 437 ms–559 ms) | 1 | 10001 |
| sok_gruppekandidater | systemarkitekt | 500 | «johanssen» | 600 ms (p95 643 ms; 583 ms–643 ms) | 18 | 10087 |
| sok_gruppekandidater | systemarkitekt | 500 | «an» | 195 ms (p95 206 ms; 190 ms–206 ms) | 20 | 10013 |
| sok_medlemskandidater | systemarkitekt | 500 | «nils johansen» | 270 ms (p95 290 ms; 265 ms–290 ms) | 0 | 21431 |
| sok_medlemskandidater | systemarkitekt | 500 | «johanssen» | 318 ms (p95 328 ms; 295 ms–328 ms) | 6 | 21466 |
| sok_medlemskandidater | systemarkitekt | 500 | «an» | 208 ms (p95 267 ms; 205 ms–267 ms) | 20 | 21449 |
| sok_medlemskandidater | lokal administrator | 500 | «nils johansen» | 163 ms (p95 170 ms; 163 ms–170 ms) | 0 | 19984 |
| sok_medlemskandidater | lokal administrator | 500 | «johanssen» | 160 ms (p95 194 ms; 155 ms–194 ms) | 0 | 19984 |
| sok_medlemskandidater | lokal administrator | 500 | «an» | 157 ms (p95 160 ms; 157 ms–160 ms) | 0 | 19984 |
| sok_direktemottakere | medlem | 500 | «nils johansen» | 171 ms (p95 275 ms; 169 ms–275 ms) | 0 | 5403 |
| sok_direktemottakere | medlem | 500 | «johanssen» | 236 ms (p95 246 ms; 233 ms–246 ms) | 7 | 5403 |
| sok_direktemottakere | medlem | 500 | «an» | 79 ms (p95 92 ms; 76 ms–92 ms) | 20 | 5306 |
| sok_gruppekandidater | systemarkitekt | 5000 | «nils johansen» | 4421 ms (p95 4538 ms; 4221 ms–4538 ms) | 10 | 81846 |
| sok_gruppekandidater | systemarkitekt | 5000 | «johanssen» | 6237 ms (p95 6362 ms; 6045 ms–6362 ms) | 20 | 81543 |
| sok_gruppekandidater | systemarkitekt | 5000 | «an» | 1885 ms (p95 2047 ms; 1733 ms–2047 ms) | 20 | 81460 |
| sok_medlemskandidater | systemarkitekt | 5000 | «nils johansen» | 2901 ms (p95 2937 ms; 2750 ms–2937 ms) | 0 | 237428 |
| sok_medlemskandidater | systemarkitekt | 5000 | «johanssen» | 3230 ms (p95 3881 ms; 3160 ms–3881 ms) | 20 | 237533 |
| sok_medlemskandidater | systemarkitekt | 5000 | «an» | 2242 ms (p95 2392 ms; 2114 ms–2392 ms) | 20 | 237450 |
| sok_medlemskandidater | lokal administrator | 5000 | «nils johansen» | 1724 ms (p95 1836 ms; 1558 ms–1836 ms) | 0 | 214676 |
| sok_medlemskandidater | lokal administrator | 5000 | «johanssen» | 1752 ms (p95 2025 ms; 1512 ms–2025 ms) | 0 | 214676 |
| sok_medlemskandidater | lokal administrator | 5000 | «an» | 1721 ms (p95 1786 ms; 1512 ms–1786 ms) | 0 | 214676 |
| sok_direktemottakere | medlem | 5000 | «nils johansen» | 2008 ms (p95 2048 ms; 1854 ms–2048 ms) | 0 | 46840 |
| sok_direktemottakere | medlem | 5000 | «johanssen» | 2698 ms (p95 2721 ms; 2468 ms–2721 ms) | 20 | 46840 |
| sok_direktemottakere | medlem | 5000 | «an» | 851 ms (p95 939 ms; 831 ms–939 ms) | 20 | 46743 |

## Serverens tid per kall (pg_stat_statements, alle gjentakelser i scenariet, over 0,5 ms i snitt)

| Scenario | Profil | Personer | Kall | Antall | Snitt | Maks |
| --- | --- | --- | --- | --- | --- | --- |
| brukere | rask | 50 | les_stoffer | 5 | 513.3 ms | 557.0 ms |
| brukere | rask | 50 | forsideoppsummering | 20 | 16.1 ms | 51.3 ms |
| brukere | rask | 50 | medlemsoversikt | 5 | 49.1 ms | 50.6 ms |
| brukere | rask | 50 | les_kommentarer | 5 | 42.5 ms | 60.0 ms |
| brukere | rask | 50 | les_stoffregister | 9 | 6.1 ms | 11.0 ms |
| brukere | rask | 50 | les_forslagsko | 10 | 5.4 ms | 12.9 ms |
| brukere | rask | 50 | mine_gruppesamtaler | 5 | 9.3 ms | 15.1 ms |
| brukere | rask | 50 | mine_rettigheter | 5 | 7.4 ms | 9.4 ms |
| brukere | rask | 50 | mine_grupper | 5 | 6.8 ms | 7.7 ms |
| brukere | rask | 50 | les_scenarioregler | 5 | 6.8 ms | 13.0 ms |
| brukere | rask | 50 | brukerinnstillinger | 50 | 0.6 ms | 2.3 ms |
| brukere | rask | 50 | les_analyttkatalog | 5 | 4.6 ms | 5.8 ms |
| brukere | rask | 50 | les_fagsaker | 5 | 4.2 ms | 11.6 ms |
| brukere | rask | 50 | les_intervallregelsett | 5 | 3.8 ms | 6.5 ms |
| brukere | rask | 50 | kan_endre_lokalt_innhold | 5 | 3.0 ms | 7.3 ms |
| brukere | rask | 50 | les_thc_regelsett | 5 | 2.9 ms | 5.2 ms |
| brukere | rask | 50 | stillingskategorier | 5 | 2.8 ms | 6.5 ms |
| brukere | rask | 50 | ideer_med_nytt | 5 | 2.3 ms | 4.7 ms |
| brukere | rask | 50 | les_interaksjonssok | 5 | 2.3 ms | 3.0 ms |
| brukere | rask | 50 | profiles | 5 | 2.1 ms | 2.9 ms |
| brukere | rask | 50 | datakilder_status | 5 | 2.0 ms | 3.0 ms |
| brukere | rask | 50 | les_mine_forslag | 5 | 1.9 ms | 6.7 ms |
| brukere | rask | 50 | mine_direktesamtaler | 5 | 1.3 ms | 3.3 ms |
| brukere | rask | 50 | sokedata_versjoner | 5 | 1.1 ms | 1.3 ms |
| brukere | rask | 50 | uleste_varsler | 5 | 1.1 ms | 1.5 ms |
| brukere | rask | 50 | rydd_stoffpapirkurven | 5 | 1.1 ms | 2.2 ms |
| brukere | rask | 50 | les_preparatsok | 5 | 1.1 ms | 1.6 ms |
| brukere | rask | 50 | er_systemarkitekt | 5 | 1.0 ms | 1.7 ms |
| brukere | rask | 50 | les_laboratoriesok | 5 | 0.9 ms | 1.2 ms |
| brukere | rask | 50 | min_profil | 5 | 0.5 ms | 0.7 ms |
| brukere | rask | 50 | mine_chatvalg | 5 | 0.5 ms | 0.6 ms |
| brukere | rask | 500 | les_stoffer | 5 | 503.0 ms | 575.5 ms |
| brukere | rask | 500 | medlemsoversikt | 5 | 468.9 ms | 527.5 ms |
| brukere | rask | 500 | forsideoppsummering | 20 | 16.6 ms | 48.1 ms |
| brukere | rask | 500 | les_kommentarer | 5 | 42.3 ms | 55.7 ms |
| brukere | rask | 500 | les_stoffregister | 9 | 8.8 ms | 15.9 ms |
| brukere | rask | 500 | les_forslagsko | 10 | 6.7 ms | 15.5 ms |
| brukere | rask | 500 | mine_gruppesamtaler | 5 | 11.1 ms | 18.1 ms |
| brukere | rask | 500 | mine_rettigheter | 5 | 7.9 ms | 9.3 ms |
| brukere | rask | 500 | mine_grupper | 5 | 7.1 ms | 9.4 ms |
| brukere | rask | 500 | les_scenarioregler | 5 | 6.8 ms | 9.0 ms |
| brukere | rask | 500 | brukerinnstillinger | 50 | 0.6 ms | 2.8 ms |
| brukere | rask | 500 | les_analyttkatalog | 5 | 5.2 ms | 6.6 ms |
| brukere | rask | 500 | les_thc_regelsett | 5 | 4.8 ms | 14.3 ms |
| brukere | rask | 500 | les_intervallregelsett | 5 | 3.7 ms | 6.1 ms |
| brukere | rask | 500 | kan_endre_lokalt_innhold | 5 | 3.6 ms | 5.6 ms |
| brukere | rask | 500 | profiles | 5 | 3.1 ms | 4.1 ms |
| brukere | rask | 500 | datakilder_status | 5 | 2.5 ms | 5.6 ms |
| brukere | rask | 500 | ideer_med_nytt | 5 | 2.4 ms | 3.9 ms |
| brukere | rask | 500 | uleste_varsler | 5 | 1.7 ms | 4.9 ms |
| brukere | rask | 500 | rydd_stoffpapirkurven | 5 | 1.5 ms | 4.6 ms |
| brukere | rask | 500 | sokedata_versjoner | 5 | 1.4 ms | 1.7 ms |
| brukere | rask | 500 | les_interaksjonssok | 5 | 1.3 ms | 3.4 ms |
| brukere | rask | 500 | mine_direktesamtaler | 5 | 1.1 ms | 2.5 ms |
| brukere | rask | 500 | les_stoffavoritter | 5 | 1.1 ms | 4.0 ms |
| brukere | rask | 500 | les_fagsaker | 5 | 1.0 ms | 1.2 ms |
| brukere | rask | 500 | er_systemarkitekt | 5 | 0.9 ms | 1.7 ms |
| brukere | rask | 500 | stillingskategorier | 5 | 0.9 ms | 1.1 ms |
| brukere | rask | 500 | les_preparatsok | 5 | 0.9 ms | 0.9 ms |
| brukere | rask | 500 | min_profil | 5 | 0.9 ms | 2.0 ms |
| brukere | rask | 500 | les_laboratoriesok | 5 | 0.8 ms | 1.3 ms |
| brukere | rask | 500 | les_mine_forslag | 5 | 0.7 ms | 0.8 ms |
| brukere | rask | 500 | mine_chatvalg | 5 | 0.7 ms | 0.9 ms |
| brukere | rask | 5000 | medlemsoversikt | 5 | 4724.7 ms | 5074.0 ms |
| brukere | rask | 5000 | les_stoffer | 5 | 461.3 ms | 522.2 ms |
| brukere | rask | 5000 | forsideoppsummering | 20 | 21.6 ms | 64.2 ms |
| brukere | rask | 5000 | les_kommentarer | 5 | 40.0 ms | 43.9 ms |
| brukere | rask | 5000 | les_forslagsko | 10 | 16.7 ms | 20.7 ms |
| brukere | rask | 5000 | les_stoffregister | 9 | 10.8 ms | 16.0 ms |
| brukere | rask | 5000 | mine_gruppesamtaler | 5 | 14.9 ms | 19.9 ms |
| brukere | rask | 5000 | les_scenarioregler | 5 | 10.8 ms | 16.3 ms |
| brukere | rask | 5000 | mine_rettigheter | 5 | 10.2 ms | 15.4 ms |
| brukere | rask | 5000 | mine_grupper | 5 | 9.6 ms | 12.5 ms |
| brukere | rask | 5000 | profiles | 5 | 7.7 ms | 13.8 ms |
| brukere | rask | 5000 | brukerinnstillinger | 50 | 0.7 ms | 3.6 ms |
| brukere | rask | 5000 | les_thc_regelsett | 5 | 6.0 ms | 8.3 ms |
| brukere | rask | 5000 | les_analyttkatalog | 5 | 5.8 ms | 8.1 ms |
| brukere | rask | 5000 | ideer_med_nytt | 5 | 4.3 ms | 9.5 ms |
| brukere | rask | 5000 | les_intervallregelsett | 5 | 4.3 ms | 8.6 ms |
| brukere | rask | 5000 | datakilder_status | 5 | 4.0 ms | 6.3 ms |
| brukere | rask | 5000 | rydd_stoffpapirkurven | 5 | 3.9 ms | 14.9 ms |
| brukere | rask | 5000 | les_interaksjonssok | 5 | 3.8 ms | 6.8 ms |
| brukere | rask | 5000 | les_fagsaker | 5 | 3.6 ms | 6.9 ms |
| brukere | rask | 5000 | les_preparatsok | 5 | 2.6 ms | 6.3 ms |
| brukere | rask | 5000 | kan_endre_lokalt_innhold | 5 | 2.4 ms | 4.5 ms |
| brukere | rask | 5000 | mine_direktesamtaler | 5 | 2.4 ms | 5.9 ms |
| brukere | rask | 5000 | uleste_varsler | 5 | 1.9 ms | 5.7 ms |
| brukere | rask | 5000 | sokedata_versjoner | 5 | 1.6 ms | 1.9 ms |
| brukere | rask | 5000 | les_laboratoriesok | 5 | 1.3 ms | 2.1 ms |
| brukere | rask | 5000 | les_stoffavoritter | 5 | 1.3 ms | 3.9 ms |
| brukere | rask | 5000 | autoerstatt_regler | 5 | 1.1 ms | 4.0 ms |
| brukere | rask | 5000 | stillingskategorier | 5 | 1.0 ms | 2.5 ms |
| brukere | rask | 5000 | les_mine_forslag | 5 | 1.0 ms | 1.6 ms |
| brukere | rask | 5000 | mine_chatvalg | 5 | 0.9 ms | 1.5 ms |
| brukere | rask | 5000 | min_profil | 5 | 0.8 ms | 1.9 ms |
| brukere | rask | 5000 | er_systemarkitekt | 5 | 0.8 ms | 1.9 ms |
| brukere | treg | 50 | les_stoffer | 4 | 510.2 ms | 541.9 ms |
| brukere | treg | 50 | medlemsoversikt | 5 | 55.8 ms | 76.9 ms |
| brukere | treg | 50 | forsideoppsummering | 20 | 11.8 ms | 32.8 ms |
| brukere | treg | 50 | les_kommentarer | 5 | 30.6 ms | 35.0 ms |
| brukere | treg | 50 | mine_rettigheter | 5 | 8.0 ms | 8.3 ms |
| brukere | treg | 50 | mine_gruppesamtaler | 5 | 7.8 ms | 12.6 ms |
| brukere | treg | 50 | mine_grupper | 5 | 6.9 ms | 8.8 ms |
| brukere | treg | 50 | les_forslagsko | 10 | 2.9 ms | 4.4 ms |
| brukere | treg | 50 | les_stoffregister | 5 | 5.7 ms | 7.9 ms |
| brukere | treg | 50 | les_analyttkatalog | 5 | 4.2 ms | 5.0 ms |
| brukere | treg | 50 | les_scenarioregler | 5 | 3.8 ms | 3.9 ms |
| brukere | treg | 50 | ideer_med_nytt | 5 | 2.1 ms | 4.3 ms |
| brukere | treg | 50 | les_thc_regelsett | 5 | 2.0 ms | 2.6 ms |
| brukere | treg | 50 | kan_endre_lokalt_innhold | 5 | 1.9 ms | 3.8 ms |
| brukere | treg | 50 | les_intervallregelsett | 5 | 1.9 ms | 2.3 ms |
| brukere | treg | 50 | datakilder_status | 5 | 1.5 ms | 3.1 ms |
| brukere | treg | 50 | uleste_varsler | 5 | 1.3 ms | 2.8 ms |
| brukere | treg | 50 | profiles | 5 | 1.0 ms | 1.2 ms |
| brukere | treg | 50 | sokedata_versjoner | 4 | 1.3 ms | 1.5 ms |
| brukere | treg | 50 | rydd_stoffpapirkurven | 5 | 0.9 ms | 1.2 ms |
| brukere | treg | 50 | stillingskategorier | 5 | 0.9 ms | 1.3 ms |
| brukere | treg | 50 | er_systemarkitekt | 5 | 0.8 ms | 1.4 ms |
| brukere | treg | 50 | les_fagsaker | 5 | 0.8 ms | 1.1 ms |
| brukere | treg | 50 | les_mine_forslag | 5 | 0.6 ms | 0.9 ms |
| brukere | treg | 50 | mine_chatvalg | 5 | 0.6 ms | 1.0 ms |
| brukere | treg | 500 | medlemsoversikt | 5 | 473.3 ms | 575.4 ms |
| brukere | treg | 500 | les_stoffer | 4 | 513.8 ms | 557.5 ms |
| brukere | treg | 500 | forsideoppsummering | 20 | 16.0 ms | 43.2 ms |
| brukere | treg | 500 | les_kommentarer | 5 | 33.0 ms | 36.9 ms |
| brukere | treg | 500 | les_forslagsko | 10 | 5.5 ms | 9.9 ms |
| brukere | treg | 500 | mine_gruppesamtaler | 5 | 9.4 ms | 17.1 ms |
| brukere | treg | 500 | mine_rettigheter | 5 | 7.7 ms | 8.4 ms |
| brukere | treg | 500 | mine_grupper | 5 | 7.5 ms | 8.1 ms |
| brukere | treg | 500 | brukerinnstillinger | 50 | 0.6 ms | 1.4 ms |
| brukere | treg | 500 | les_scenarioregler | 5 | 5.2 ms | 8.3 ms |
| brukere | treg | 500 | les_stoffregister | 5 | 4.5 ms | 5.2 ms |
| brukere | treg | 500 | les_analyttkatalog | 5 | 4.2 ms | 5.2 ms |
| brukere | treg | 500 | profiles | 5 | 3.5 ms | 7.9 ms |
| brukere | treg | 500 | ideer_med_nytt | 5 | 2.7 ms | 6.9 ms |
| brukere | treg | 500 | les_thc_regelsett | 5 | 2.2 ms | 3.3 ms |
| brukere | treg | 500 | kan_endre_lokalt_innhold | 5 | 2.2 ms | 3.1 ms |
| brukere | treg | 500 | uleste_varsler | 5 | 2.2 ms | 4.0 ms |
| brukere | treg | 500 | les_intervallregelsett | 5 | 2.1 ms | 2.5 ms |
| brukere | treg | 500 | sokedata_versjoner | 5 | 1.6 ms | 2.2 ms |
| brukere | treg | 500 | stillingskategorier | 5 | 1.4 ms | 2.9 ms |
| brukere | treg | 500 | les_fagsaker | 5 | 1.1 ms | 1.9 ms |
| brukere | treg | 500 | mine_direktesamtaler | 5 | 0.9 ms | 2.2 ms |
| brukere | treg | 500 | rydd_stoffpapirkurven | 5 | 0.9 ms | 0.9 ms |
| brukere | treg | 500 | les_mine_forslag | 5 | 0.9 ms | 1.4 ms |
| brukere | treg | 500 | datakilder_status | 5 | 0.8 ms | 1.2 ms |
| brukere | treg | 500 | er_systemarkitekt | 5 | 0.7 ms | 0.8 ms |
| brukere | treg | 500 | mine_chatvalg | 5 | 0.6 ms | 1.0 ms |
| brukere | treg | 500 | min_profil | 5 | 0.6 ms | 0.6 ms |
| brukere | treg | 5000 | medlemsoversikt | 5 | 5111.2 ms | 5325.5 ms |
| brukere | treg | 5000 | les_stoffer | 5 | 495.5 ms | 557.1 ms |
| brukere | treg | 5000 | forsideoppsummering | 20 | 14.8 ms | 50.7 ms |
| brukere | treg | 5000 | les_kommentarer | 5 | 41.3 ms | 60.5 ms |
| brukere | treg | 5000 | les_forslagsko | 10 | 14.1 ms | 33.1 ms |
| brukere | treg | 5000 | mine_rettigheter | 5 | 9.8 ms | 13.7 ms |
| brukere | treg | 5000 | mine_gruppesamtaler | 5 | 9.7 ms | 13.3 ms |
| brukere | treg | 5000 | mine_grupper | 5 | 9.1 ms | 16.9 ms |
| brukere | treg | 5000 | les_stoffregister | 5 | 8.5 ms | 11.3 ms |
| brukere | treg | 5000 | les_scenarioregler | 5 | 8.1 ms | 13.6 ms |
| brukere | treg | 5000 | profiles | 5 | 5.7 ms | 7.3 ms |
| brukere | treg | 5000 | brukerinnstillinger | 50 | 0.6 ms | 2.7 ms |
| brukere | treg | 5000 | datakilder_status | 5 | 5.6 ms | 10.3 ms |
| brukere | treg | 5000 | les_analyttkatalog | 5 | 4.5 ms | 5.2 ms |
| brukere | treg | 5000 | les_thc_regelsett | 5 | 3.2 ms | 5.2 ms |
| brukere | treg | 5000 | les_intervallregelsett | 5 | 2.4 ms | 3.2 ms |
| brukere | treg | 5000 | les_fagsaker | 5 | 2.2 ms | 4.2 ms |
| brukere | treg | 5000 | kan_endre_lokalt_innhold | 5 | 2.0 ms | 2.4 ms |
| brukere | treg | 5000 | sokedata_versjoner | 5 | 1.8 ms | 3.2 ms |
| brukere | treg | 5000 | ideer_med_nytt | 5 | 1.8 ms | 2.3 ms |
| brukere | treg | 5000 | mine_direktesamtaler | 5 | 1.4 ms | 2.3 ms |
| brukere | treg | 5000 | rydd_stoffpapirkurven | 5 | 1.4 ms | 2.0 ms |
| brukere | treg | 5000 | uleste_varsler | 5 | 1.3 ms | 2.5 ms |
| brukere | treg | 5000 | er_systemarkitekt | 5 | 1.3 ms | 2.4 ms |
| brukere | treg | 5000 | les_mine_forslag | 5 | 1.0 ms | 1.6 ms |
| brukere | treg | 5000 | stillingskategorier | 5 | 0.8 ms | 1.0 ms |
| brukere | treg | 5000 | mine_chatvalg | 5 | 0.7 ms | 0.7 ms |
| brukere | treg | 5000 | min_profil | 5 | 0.6 ms | 0.7 ms |
| brukere | treg | 5000 | les_stoffavoritter | 5 | 0.6 ms | 0.9 ms |
| direkte | rask | 500 | les_stoffer | 5 | 494.0 ms | 552.4 ms |
| direkte | rask | 500 | les_kommentarer | 10 | 45.9 ms | 60.4 ms |
| direkte | rask | 500 | forsideoppsummering | 20 | 19.9 ms | 46.5 ms |
| direkte | rask | 500 | les_stoff | 5 | 47.6 ms | 58.6 ms |
| direkte | rask | 500 | les_stoffregister | 19 | 8.0 ms | 20.0 ms |
| direkte | rask | 500 | mine_gruppesamtaler | 10 | 11.2 ms | 23.5 ms |
| direkte | rask | 500 | les_scenarioregler | 10 | 8.9 ms | 16.1 ms |
| direkte | rask | 500 | mine_rettigheter | 10 | 8.5 ms | 11.7 ms |
| direkte | rask | 500 | mine_grupper | 10 | 7.5 ms | 11.1 ms |
| direkte | rask | 500 | les_forslagsko | 10 | 5.9 ms | 11.4 ms |
| direkte | rask | 500 | brukerinnstillinger | 100 | 0.5 ms | 3.4 ms |
| direkte | rask | 500 | les_analyttkatalog | 10 | 4.5 ms | 6.3 ms |
| direkte | rask | 500 | datakilder_status | 10 | 2.9 ms | 8.9 ms |
| direkte | rask | 500 | kan_endre_lokalt_innhold | 10 | 2.9 ms | 8.3 ms |
| direkte | rask | 500 | les_intervallregelsett | 10 | 2.7 ms | 5.9 ms |
| direkte | rask | 500 | diskusjonsoversikt | 5 | 5.4 ms | 9.0 ms |
| direkte | rask | 500 | les_thc_regelsett | 10 | 2.5 ms | 6.3 ms |
| direkte | rask | 500 | ideer_med_nytt | 10 | 2.0 ms | 4.4 ms |
| direkte | rask | 500 | les_interaksjonssok | 6 | 2.5 ms | 3.6 ms |
| direkte | rask | 500 | er_systemarkitekt | 10 | 1.4 ms | 5.2 ms |
| direkte | rask | 500 | sokedata_versjoner | 10 | 1.3 ms | 2.0 ms |
| direkte | rask | 500 | profiles | 5 | 2.6 ms | 3.8 ms |
| direkte | rask | 500 | les_fagsaker | 10 | 1.3 ms | 3.1 ms |
| direkte | rask | 500 | stillingskategorier | 10 | 1.2 ms | 3.2 ms |
| direkte | rask | 500 | uleste_varsler | 10 | 1.1 ms | 2.6 ms |
| direkte | rask | 500 | mine_direktesamtaler | 10 | 1.0 ms | 2.1 ms |
| direkte | rask | 500 | mine_chatvalg | 10 | 1.0 ms | 4.1 ms |
| direkte | rask | 500 | rydd_stoffpapirkurven | 10 | 0.9 ms | 1.6 ms |
| direkte | rask | 500 | les_cypinfo | 5 | 1.7 ms | 3.1 ms |
| direkte | rask | 500 | les_bivirkninger | 5 | 1.4 ms | 1.8 ms |
| direkte | rask | 500 | les_interaksjoner | 5 | 1.3 ms | 1.8 ms |
| direkte | rask | 500 | les_preparatsok | 6 | 1.1 ms | 1.4 ms |
| direkte | rask | 500 | min_profil | 10 | 0.6 ms | 1.2 ms |
| direkte | rask | 500 | kuratering_admin | 5 | 1.3 ms | 1.7 ms |
| direkte | rask | 500 | les_laboratoriesok | 6 | 0.8 ms | 1.0 ms |
| direkte | treg | 500 | les_stoffer | 5 | 520.1 ms | 571.2 ms |
| direkte | treg | 500 | les_kommentarer | 10 | 35.4 ms | 46.1 ms |
| direkte | treg | 500 | forsideoppsummering | 20 | 15.4 ms | 51.6 ms |
| direkte | treg | 500 | les_stoff | 5 | 31.9 ms | 39.6 ms |
| direkte | treg | 500 | mine_gruppesamtaler | 10 | 12.6 ms | 28.0 ms |
| direkte | treg | 500 | mine_grupper | 10 | 9.2 ms | 16.5 ms |
| direkte | treg | 500 | mine_rettigheter | 10 | 8.6 ms | 15.3 ms |
| direkte | treg | 500 | brukerinnstillinger | 100 | 0.6 ms | 3.9 ms |
| direkte | treg | 500 | les_stoffregister | 10 | 5.7 ms | 15.3 ms |
| direkte | treg | 500 | les_analyttkatalog | 10 | 5.5 ms | 9.7 ms |
| direkte | treg | 500 | les_scenarioregler | 10 | 4.8 ms | 7.4 ms |
| direkte | treg | 500 | les_forslagsko | 10 | 4.6 ms | 6.6 ms |
| direkte | treg | 500 | diskusjonsoversikt | 5 | 4.9 ms | 6.9 ms |
| direkte | treg | 500 | les_intervallregelsett | 10 | 2.4 ms | 4.1 ms |
| direkte | treg | 500 | kan_endre_lokalt_innhold | 10 | 2.2 ms | 5.7 ms |
| direkte | treg | 500 | les_thc_regelsett | 10 | 2.2 ms | 3.4 ms |
| direkte | treg | 500 | ideer_med_nytt | 10 | 1.7 ms | 3.0 ms |
| direkte | treg | 500 | uleste_varsler | 10 | 1.5 ms | 2.3 ms |
| direkte | treg | 500 | profiles | 5 | 2.4 ms | 3.9 ms |
| direkte | treg | 500 | rydd_stoffpapirkurven | 10 | 1.2 ms | 2.9 ms |
| direkte | treg | 500 | mine_chatvalg | 10 | 1.1 ms | 4.4 ms |
| direkte | treg | 500 | les_bivirkninger | 5 | 1.8 ms | 2.4 ms |
| direkte | treg | 500 | er_systemarkitekt | 10 | 0.9 ms | 1.6 ms |
| direkte | treg | 500 | datakilder_status | 10 | 0.9 ms | 1.3 ms |
| direkte | treg | 500 | stillingskategorier | 10 | 0.8 ms | 1.5 ms |
| direkte | treg | 500 | les_fagsaker | 10 | 0.8 ms | 1.0 ms |
| direkte | treg | 500 | kuratering_admin | 5 | 1.6 ms | 2.9 ms |
| direkte | treg | 500 | sokedata_versjoner | 5 | 1.5 ms | 2.2 ms |
| direkte | treg | 500 | les_cypinfo | 5 | 1.4 ms | 2.5 ms |
| direkte | treg | 500 | autoerstatt_regler | 10 | 0.7 ms | 1.5 ms |
| direkte | treg | 500 | min_profil | 10 | 0.7 ms | 1.1 ms |
| direkte | treg | 500 | les_interaksjoner | 5 | 1.2 ms | 1.4 ms |
| direkte | treg | 500 | mine_direktesamtaler | 10 | 0.5 ms | 0.6 ms |
| fagmiljobytte | rask | 500 | les_stoffer | 5 | 488.1 ms | 590.4 ms |
| fagmiljobytte | rask | 500 | forsideoppsummering | 60 | 17.3 ms | 70.0 ms |
| fagmiljobytte | rask | 500 | les_kommentarer | 15 | 45.8 ms | 75.1 ms |
| fagmiljobytte | rask | 500 | mine_gruppesamtaler | 10 | 13.2 ms | 21.6 ms |
| fagmiljobytte | rask | 500 | les_stoffregister | 14 | 7.6 ms | 20.5 ms |
| fagmiljobytte | rask | 500 | les_scenarioregler | 10 | 8.1 ms | 14.2 ms |
| fagmiljobytte | rask | 500 | les_forslagsko | 15 | 5.3 ms | 10.9 ms |
| fagmiljobytte | rask | 500 | brukerinnstillinger | 105 | 0.7 ms | 9.7 ms |
| fagmiljobytte | rask | 500 | les_intervallregelsett | 15 | 3.7 ms | 12.3 ms |
| fagmiljobytte | rask | 500 | les_thc_regelsett | 15 | 3.4 ms | 6.5 ms |
| fagmiljobytte | rask | 500 | velg_arbeidsfagmiljo | 5 | 9.9 ms | 13.0 ms |
| fagmiljobytte | rask | 500 | mine_rettigheter | 5 | 8.4 ms | 11.2 ms |
| fagmiljobytte | rask | 500 | mine_grupper | 5 | 7.9 ms | 10.6 ms |
| fagmiljobytte | rask | 500 | les_analyttkatalog | 10 | 3.3 ms | 9.7 ms |
| fagmiljobytte | rask | 500 | uleste_varsler | 10 | 2.7 ms | 6.9 ms |
| fagmiljobytte | rask | 500 | ideer_med_nytt | 10 | 2.7 ms | 5.7 ms |
| fagmiljobytte | rask | 500 | kan_endre_lokalt_innhold | 10 | 1.8 ms | 3.1 ms |
| fagmiljobytte | rask | 500 | les_fagsaker | 10 | 1.8 ms | 5.3 ms |
| fagmiljobytte | rask | 500 | profiles | 5 | 3.6 ms | 4.8 ms |
| fagmiljobytte | rask | 500 | datakilder_status | 10 | 1.2 ms | 2.2 ms |
| fagmiljobytte | rask | 500 | rydd_stoffpapirkurven | 10 | 1.1 ms | 2.3 ms |
| fagmiljobytte | rask | 500 | les_interaksjonssok | 5 | 1.7 ms | 2.5 ms |
| fagmiljobytte | rask | 500 | sokedata_versjoner | 6 | 1.4 ms | 1.7 ms |
| fagmiljobytte | rask | 500 | les_preparatsok | 5 | 1.5 ms | 3.9 ms |
| fagmiljobytte | rask | 500 | er_systemarkitekt | 10 | 0.7 ms | 1.5 ms |
| fagmiljobytte | rask | 500 | stillingskategorier | 5 | 1.5 ms | 4.1 ms |
| fagmiljobytte | rask | 500 | autoerstatt_regler | 10 | 0.7 ms | 1.8 ms |
| fagmiljobytte | rask | 500 | mine_direktesamtaler | 10 | 0.6 ms | 1.5 ms |
| fagmiljobytte | rask | 500 | les_stoffavoritter | 10 | 0.6 ms | 2.6 ms |
| fagmiljobytte | rask | 500 | les_laboratoriesok | 5 | 0.8 ms | 1.1 ms |
| fagmiljobytte | rask | 500 | min_profil | 5 | 0.6 ms | 0.7 ms |
| fagmiljobytte | treg | 500 | les_stoffer | 5 | 505.8 ms | 577.8 ms |
| fagmiljobytte | treg | 500 | forsideoppsummering | 60 | 13.2 ms | 41.4 ms |
| fagmiljobytte | treg | 500 | les_kommentarer | 10 | 34.2 ms | 46.3 ms |
| fagmiljobytte | treg | 500 | velg_arbeidsfagmiljo | 5 | 12.6 ms | 21.7 ms |
| fagmiljobytte | treg | 500 | les_forslagsko | 15 | 4.1 ms | 7.1 ms |
| fagmiljobytte | treg | 500 | mine_gruppesamtaler | 6 | 8.3 ms | 9.7 ms |
| fagmiljobytte | treg | 500 | mine_grupper | 5 | 9.9 ms | 18.7 ms |
| fagmiljobytte | treg | 500 | mine_rettigheter | 5 | 7.3 ms | 8.1 ms |
| fagmiljobytte | treg | 500 | les_intervallregelsett | 10 | 3.6 ms | 7.4 ms |
| fagmiljobytte | treg | 500 | les_analyttkatalog | 10 | 3.0 ms | 4.5 ms |
| fagmiljobytte | treg | 500 | les_thc_regelsett | 10 | 2.9 ms | 6.4 ms |
| fagmiljobytte | treg | 500 | les_scenarioregler | 5 | 4.9 ms | 7.5 ms |
| fagmiljobytte | treg | 500 | les_stoffregister | 5 | 4.8 ms | 7.8 ms |
| fagmiljobytte | treg | 500 | uleste_varsler | 9 | 1.6 ms | 3.3 ms |
| fagmiljobytte | treg | 500 | ideer_med_nytt | 8 | 1.5 ms | 2.0 ms |
| fagmiljobytte | treg | 500 | profiles | 5 | 2.2 ms | 2.8 ms |
| fagmiljobytte | treg | 500 | er_systemarkitekt | 10 | 0.8 ms | 1.5 ms |
| fagmiljobytte | treg | 500 | kan_endre_lokalt_innhold | 5 | 1.6 ms | 1.9 ms |
| fagmiljobytte | treg | 500 | stillingskategorier | 5 | 1.4 ms | 3.2 ms |
| fagmiljobytte | treg | 500 | datakilder_status | 8 | 0.8 ms | 1.2 ms |
| fagmiljobytte | treg | 500 | sokedata_versjoner | 5 | 1.2 ms | 1.4 ms |
| fagmiljobytte | treg | 500 | rydd_stoffpapirkurven | 5 | 1.1 ms | 1.7 ms |
| fagmiljobytte | treg | 500 | les_fagsaker | 8 | 0.6 ms | 0.8 ms |
| fagmiljobytte | treg | 500 | mine_direktesamtaler | 8 | 0.5 ms | 0.7 ms |
| fagmiljobytte | treg | 500 | min_profil | 5 | 0.5 ms | 0.6 ms |
| fagside | rask | 500 | les_stoffer | 5 | 463.4 ms | 520.0 ms |
| fagside | rask | 500 | forsideoppsummering | 20 | 16.7 ms | 54.8 ms |
| fagside | rask | 500 | les_stoff | 5 | 42.6 ms | 57.7 ms |
| fagside | rask | 500 | les_kommentarer | 5 | 37.3 ms | 42.0 ms |
| fagside | rask | 500 | les_stoffregister | 9 | 8.4 ms | 11.6 ms |
| fagside | rask | 500 | mine_gruppesamtaler | 5 | 11.0 ms | 24.2 ms |
| fagside | rask | 500 | diskusjonsoversikt | 5 | 8.6 ms | 14.4 ms |
| fagside | rask | 500 | les_forslagsko | 5 | 8.0 ms | 13.9 ms |
| fagside | rask | 500 | brukerinnstillinger | 60 | 0.6 ms | 2.5 ms |
| fagside | rask | 500 | les_scenarioregler | 5 | 7.2 ms | 14.0 ms |
| fagside | rask | 500 | mine_rettigheter | 5 | 7.0 ms | 7.4 ms |
| fagside | rask | 500 | mine_grupper | 5 | 6.7 ms | 7.7 ms |
| fagside | rask | 500 | les_analyttkatalog | 5 | 5.2 ms | 7.6 ms |
| fagside | rask | 500 | les_thc_regelsett | 5 | 4.7 ms | 7.7 ms |
| fagside | rask | 500 | kan_endre_lokalt_innhold | 5 | 4.5 ms | 11.3 ms |
| fagside | rask | 500 | les_bivirkninger | 5 | 3.7 ms | 9.1 ms |
| fagside | rask | 500 | kuratering_admin | 5 | 3.4 ms | 8.6 ms |
| fagside | rask | 500 | profiles | 5 | 3.0 ms | 4.0 ms |
| fagside | rask | 500 | datakilder_status | 5 | 2.5 ms | 6.6 ms |
| fagside | rask | 500 | les_intervallregelsett | 5 | 2.5 ms | 4.1 ms |
| fagside | rask | 500 | les_interaksjonssok | 5 | 2.3 ms | 3.1 ms |
| fagside | rask | 500 | ideer_med_nytt | 5 | 2.3 ms | 3.2 ms |
| fagside | rask | 500 | les_interaksjoner | 5 | 2.3 ms | 3.0 ms |
| fagside | rask | 500 | mine_direktesamtaler | 5 | 2.2 ms | 4.4 ms |
| fagside | rask | 500 | les_cypinfo | 5 | 1.8 ms | 2.6 ms |
| fagside | rask | 500 | uleste_varsler | 5 | 1.5 ms | 3.1 ms |
| fagside | rask | 500 | les_fagsaker | 5 | 1.4 ms | 3.0 ms |
| fagside | rask | 500 | sokedata_versjoner | 5 | 1.3 ms | 2.0 ms |
| fagside | rask | 500 | les_preparatsok | 5 | 1.0 ms | 1.2 ms |
| fagside | rask | 500 | rydd_stoffpapirkurven | 5 | 1.0 ms | 1.6 ms |
| fagside | rask | 500 | les_laboratoriesok | 5 | 1.0 ms | 1.4 ms |
| fagside | rask | 500 | stillingskategorier | 5 | 0.9 ms | 1.6 ms |
| fagside | rask | 500 | er_systemarkitekt | 5 | 0.7 ms | 0.9 ms |
| fagside | rask | 500 | les_stoffavoritter | 5 | 0.6 ms | 1.2 ms |
| fagside | rask | 500 | mine_chatvalg | 5 | 0.5 ms | 0.8 ms |
| fagside | treg | 500 | les_stoffer | 4 | 564.4 ms | 658.4 ms |
| fagside | treg | 500 | forsideoppsummering | 20 | 12.1 ms | 33.5 ms |
| fagside | treg | 500 | les_kommentarer | 5 | 32.9 ms | 40.1 ms |
| fagside | treg | 500 | les_stoff | 5 | 32.8 ms | 39.8 ms |
| fagside | treg | 500 | mine_rettigheter | 5 | 9.7 ms | 12.6 ms |
| fagside | treg | 500 | mine_gruppesamtaler | 5 | 9.6 ms | 15.4 ms |
| fagside | treg | 500 | profiles | 5 | 9.1 ms | 37.3 ms |
| fagside | treg | 500 | mine_grupper | 5 | 7.2 ms | 9.6 ms |
| fagside | treg | 500 | brukerinnstillinger | 60 | 0.6 ms | 5.3 ms |
| fagside | treg | 500 | les_scenarioregler | 5 | 5.4 ms | 7.0 ms |
| fagside | treg | 500 | les_analyttkatalog | 5 | 5.0 ms | 6.0 ms |
| fagside | treg | 500 | les_stoffregister | 5 | 4.4 ms | 5.9 ms |
| fagside | treg | 500 | les_forslagsko | 5 | 4.1 ms | 5.6 ms |
| fagside | treg | 500 | diskusjonsoversikt | 5 | 3.0 ms | 3.5 ms |
| fagside | treg | 500 | kan_endre_lokalt_innhold | 5 | 2.3 ms | 4.1 ms |
| fagside | treg | 500 | les_intervallregelsett | 5 | 2.3 ms | 2.8 ms |
| fagside | treg | 500 | les_thc_regelsett | 5 | 2.1 ms | 2.8 ms |
| fagside | treg | 500 | ideer_med_nytt | 5 | 1.8 ms | 2.5 ms |
| fagside | treg | 500 | les_bivirkninger | 5 | 1.6 ms | 1.9 ms |
| fagside | treg | 500 | kuratering_admin | 5 | 1.5 ms | 3.4 ms |
| fagside | treg | 500 | les_cypinfo | 5 | 1.4 ms | 1.8 ms |
| fagside | treg | 500 | les_interaksjoner | 5 | 1.4 ms | 2.4 ms |
| fagside | treg | 500 | sokedata_versjoner | 5 | 1.2 ms | 1.3 ms |
| fagside | treg | 500 | datakilder_status | 5 | 1.1 ms | 2.0 ms |
| fagside | treg | 500 | er_systemarkitekt | 5 | 1.0 ms | 1.9 ms |
| fagside | treg | 500 | stillingskategorier | 5 | 1.0 ms | 1.9 ms |
| fagside | treg | 500 | rydd_stoffpapirkurven | 5 | 1.0 ms | 1.4 ms |
| fagside | treg | 500 | uleste_varsler | 5 | 0.9 ms | 1.1 ms |
| fagside | treg | 500 | les_fagsaker | 5 | 0.9 ms | 1.8 ms |
| fagside | treg | 500 | min_profil | 5 | 0.6 ms | 0.8 ms |
| fagside | treg | 500 | mine_direktesamtaler | 5 | 0.6 ms | 0.7 ms |
| fagside | treg | 500 | mine_chatvalg | 5 | 0.6 ms | 0.8 ms |
| fagside | treg | 500 | autoerstatt_regler | 5 | 0.5 ms | 0.6 ms |
| fortolkning | rask | 500 | les_stoffer | 5 | 499.9 ms | 546.4 ms |
| fortolkning | rask | 500 | forsideoppsummering | 20 | 19.2 ms | 58.5 ms |
| fortolkning | rask | 500 | les_kommentarer | 5 | 42.9 ms | 57.2 ms |
| fortolkning | rask | 500 | mine_gruppesamtaler | 5 | 15.5 ms | 36.3 ms |
| fortolkning | rask | 500 | les_stoffregister | 9 | 6.7 ms | 13.4 ms |
| fortolkning | rask | 500 | les_scenarioregler | 5 | 11.0 ms | 13.9 ms |
| fortolkning | rask | 500 | brukerinnstillinger | 60 | 0.7 ms | 4.1 ms |
| fortolkning | rask | 500 | mine_grupper | 5 | 7.7 ms | 8.9 ms |
| fortolkning | rask | 500 | mine_rettigheter | 5 | 7.7 ms | 9.2 ms |
| fortolkning | rask | 500 | les_forslagsko | 5 | 6.1 ms | 8.0 ms |
| fortolkning | rask | 500 | diskusjonsoversikt | 5 | 4.9 ms | 6.5 ms |
| fortolkning | rask | 500 | les_analyttkatalog | 5 | 3.9 ms | 4.1 ms |
| fortolkning | rask | 500 | profiles | 5 | 3.6 ms | 9.3 ms |
| fortolkning | rask | 500 | kan_endre_lokalt_innhold | 5 | 2.8 ms | 6.8 ms |
| fortolkning | rask | 500 | les_intervallregelsett | 5 | 2.6 ms | 3.9 ms |
| fortolkning | rask | 500 | les_thc_regelsett | 5 | 2.3 ms | 3.8 ms |
| fortolkning | rask | 500 | les_interaksjonssok | 5 | 2.0 ms | 4.1 ms |
| fortolkning | rask | 500 | les_preparatsok | 5 | 1.9 ms | 4.9 ms |
| fortolkning | rask | 500 | uleste_varsler | 5 | 1.7 ms | 3.9 ms |
| fortolkning | rask | 500 | er_systemarkitekt | 5 | 1.6 ms | 4.1 ms |
| fortolkning | rask | 500 | ideer_med_nytt | 5 | 1.5 ms | 2.0 ms |
| fortolkning | rask | 500 | les_laboratoriesok | 5 | 1.3 ms | 2.9 ms |
| fortolkning | rask | 500 | sokedata_versjoner | 5 | 1.1 ms | 1.2 ms |
| fortolkning | rask | 500 | datakilder_status | 5 | 1.1 ms | 1.5 ms |
| fortolkning | rask | 500 | les_fagsaker | 5 | 1.0 ms | 1.2 ms |
| fortolkning | rask | 500 | rydd_stoffpapirkurven | 5 | 1.0 ms | 1.3 ms |
| fortolkning | rask | 500 | mine_direktesamtaler | 5 | 0.8 ms | 1.2 ms |
| fortolkning | rask | 500 | stillingskategorier | 5 | 0.8 ms | 1.0 ms |
| fortolkning | rask | 500 | autoerstatt_regler | 5 | 0.6 ms | 1.4 ms |
| fortolkning | rask | 500 | min_profil | 5 | 0.6 ms | 0.6 ms |
| fortolkning | rask | 500 | mine_chatvalg | 5 | 0.5 ms | 0.6 ms |
| fortolkning | treg | 500 | les_stoffer | 4 | 552.2 ms | 648.7 ms |
| fortolkning | treg | 500 | forsideoppsummering | 20 | 12.3 ms | 50.2 ms |
| fortolkning | treg | 500 | les_kommentarer | 5 | 36.6 ms | 43.9 ms |
| fortolkning | treg | 500 | mine_gruppesamtaler | 5 | 8.7 ms | 11.6 ms |
| fortolkning | treg | 500 | mine_rettigheter | 5 | 7.3 ms | 8.0 ms |
| fortolkning | treg | 500 | mine_grupper | 5 | 7.1 ms | 8.3 ms |
| fortolkning | treg | 500 | brukerinnstillinger | 60 | 0.5 ms | 2.5 ms |
| fortolkning | treg | 500 | diskusjonsoversikt | 5 | 6.3 ms | 9.8 ms |
| fortolkning | treg | 500 | les_stoffregister | 5 | 6.2 ms | 7.9 ms |
| fortolkning | treg | 500 | les_scenarioregler | 5 | 5.6 ms | 8.0 ms |
| fortolkning | treg | 500 | les_analyttkatalog | 5 | 4.8 ms | 6.5 ms |
| fortolkning | treg | 500 | les_forslagsko | 5 | 4.2 ms | 5.2 ms |
| fortolkning | treg | 500 | les_thc_regelsett | 5 | 2.9 ms | 4.1 ms |
| fortolkning | treg | 500 | profiles | 5 | 2.4 ms | 2.9 ms |
| fortolkning | treg | 500 | les_intervallregelsett | 5 | 2.3 ms | 3.1 ms |
| fortolkning | treg | 500 | ideer_med_nytt | 5 | 1.8 ms | 2.3 ms |
| fortolkning | treg | 500 | kan_endre_lokalt_innhold | 5 | 1.8 ms | 2.1 ms |
| fortolkning | treg | 500 | rydd_stoffpapirkurven | 5 | 1.4 ms | 3.5 ms |
| fortolkning | treg | 500 | er_systemarkitekt | 5 | 1.0 ms | 2.4 ms |
| fortolkning | treg | 500 | uleste_varsler | 5 | 1.0 ms | 1.4 ms |
| fortolkning | treg | 500 | datakilder_status | 5 | 1.0 ms | 1.5 ms |
| fortolkning | treg | 500 | sokedata_versjoner | 4 | 1.3 ms | 1.5 ms |
| fortolkning | treg | 500 | stillingskategorier | 5 | 1.0 ms | 1.2 ms |
| fortolkning | treg | 500 | les_fagsaker | 5 | 0.7 ms | 0.9 ms |
| fortolkning | treg | 500 | mine_direktesamtaler | 5 | 0.6 ms | 0.7 ms |
| fortolkning | treg | 500 | autoerstatt_regler | 5 | 0.5 ms | 0.8 ms |
| fortolkning | treg | 500 | min_profil | 5 | 0.5 ms | 0.6 ms |
| fortolkning | treg | 500 | mine_chatvalg | 5 | 0.5 ms | 0.6 ms |
| kald | rask | 500 | les_stoffer | 5 | 467.3 ms | 526.1 ms |
| kald | rask | 500 | forsideoppsummering | 20 | 37.4 ms | 356.6 ms |
| kald | rask | 500 | les_kommentarer | 5 | 90.0 ms | 280.1 ms |
| kald | rask | 500 | les_scenarioregler | 5 | 42.6 ms | 180.4 ms |
| kald | rask | 500 | datakilder_status | 5 | 42.4 ms | 195.1 ms |
| kald | rask | 500 | les_fagsaker | 5 | 41.8 ms | 184.2 ms |
| kald | rask | 500 | les_intervallregelsett | 5 | 39.2 ms | 171.7 ms |
| kald | rask | 500 | les_stoffregister | 9 | 19.2 ms | 83.0 ms |
| kald | rask | 500 | les_stoffavoritter | 5 | 23.4 ms | 115.0 ms |
| kald | rask | 500 | mine_gruppesamtaler | 5 | 16.2 ms | 42.4 ms |
| kald | rask | 500 | rydd_stoffpapirkurven | 5 | 12.5 ms | 57.2 ms |
| kald | rask | 500 | les_forslagsko | 5 | 11.7 ms | 22.0 ms |
| kald | rask | 500 | mine_rettigheter | 5 | 9.8 ms | 12.5 ms |
| kald | rask | 500 | mine_grupper | 5 | 8.6 ms | 12.0 ms |
| kald | rask | 500 | les_thc_regelsett | 5 | 7.4 ms | 19.1 ms |
| kald | rask | 500 | les_analyttkatalog | 5 | 6.2 ms | 8.6 ms |
| kald | rask | 500 | brukerinnstillinger | 50 | 0.6 ms | 4.3 ms |
| kald | rask | 500 | ideer_med_nytt | 5 | 4.2 ms | 9.3 ms |
| kald | rask | 500 | les_interaksjonssok | 4 | 5.1 ms | 7.2 ms |
| kald | rask | 500 | mine_direktesamtaler | 5 | 3.9 ms | 7.2 ms |
| kald | rask | 500 | profiles | 5 | 3.8 ms | 8.0 ms |
| kald | rask | 500 | uleste_varsler | 5 | 2.9 ms | 6.1 ms |
| kald | rask | 500 | stillingskategorier | 5 | 2.6 ms | 7.4 ms |
| kald | rask | 500 | kan_endre_lokalt_innhold | 5 | 2.3 ms | 4.2 ms |
| kald | rask | 500 | les_laboratoriesok | 4 | 2.5 ms | 6.0 ms |
| kald | rask | 500 | les_preparatsok | 4 | 2.3 ms | 4.6 ms |
| kald | rask | 500 | sokedata_versjoner | 5 | 1.8 ms | 2.7 ms |
| kald | rask | 500 | mine_chatvalg | 5 | 0.7 ms | 0.9 ms |
| kald | rask | 500 | min_profil | 5 | 0.7 ms | 1.7 ms |
| kald | rask | 500 | autoerstatt_regler | 5 | 0.7 ms | 2.0 ms |
| kald | rask | 500 | er_systemarkitekt | 5 | 0.7 ms | 0.9 ms |
| kald | treg | 500 | les_stoffer | 5 | 534.9 ms | 564.7 ms |
| kald | treg | 500 | forsideoppsummering | 20 | 16.8 ms | 48.5 ms |
| kald | treg | 500 | les_kommentarer | 5 | 36.2 ms | 41.7 ms |
| kald | treg | 500 | mine_gruppesamtaler | 5 | 12.3 ms | 22.0 ms |
| kald | treg | 500 | mine_rettigheter | 5 | 10.1 ms | 16.1 ms |
| kald | treg | 500 | mine_grupper | 5 | 8.0 ms | 11.1 ms |
| kald | treg | 500 | brukerinnstillinger | 50 | 0.7 ms | 4.3 ms |
| kald | treg | 500 | les_stoffregister | 5 | 6.1 ms | 11.2 ms |
| kald | treg | 500 | les_forslagsko | 5 | 4.9 ms | 6.7 ms |
| kald | treg | 500 | les_analyttkatalog | 5 | 4.8 ms | 7.2 ms |
| kald | treg | 500 | les_scenarioregler | 5 | 4.2 ms | 5.2 ms |
| kald | treg | 500 | les_thc_regelsett | 5 | 3.9 ms | 7.2 ms |
| kald | treg | 500 | profiles | 5 | 3.4 ms | 4.5 ms |
| kald | treg | 500 | les_intervallregelsett | 5 | 3.1 ms | 3.8 ms |
| kald | treg | 500 | ideer_med_nytt | 5 | 1.7 ms | 1.9 ms |
| kald | treg | 500 | kan_endre_lokalt_innhold | 5 | 1.6 ms | 1.7 ms |
| kald | treg | 500 | les_interaksjonssok | 5 | 1.5 ms | 3.0 ms |
| kald | treg | 500 | stillingskategorier | 5 | 1.5 ms | 3.9 ms |
| kald | treg | 500 | les_preparatsok | 5 | 1.4 ms | 2.6 ms |
| kald | treg | 500 | uleste_varsler | 5 | 1.3 ms | 1.7 ms |
| kald | treg | 500 | sokedata_versjoner | 5 | 1.3 ms | 1.5 ms |
| kald | treg | 500 | datakilder_status | 5 | 1.2 ms | 1.7 ms |
| kald | treg | 500 | er_systemarkitekt | 5 | 1.1 ms | 1.8 ms |
| kald | treg | 500 | mine_direktesamtaler | 5 | 1.1 ms | 3.0 ms |
| kald | treg | 500 | les_fagsaker | 5 | 0.9 ms | 1.8 ms |
| kald | treg | 500 | rydd_stoffpapirkurven | 5 | 0.9 ms | 1.1 ms |
| kald | treg | 500 | les_laboratoriesok | 5 | 0.8 ms | 1.0 ms |
| kald | treg | 500 | autoerstatt_regler | 5 | 0.8 ms | 1.3 ms |
| kald | treg | 500 | mine_chatvalg | 5 | 0.7 ms | 1.0 ms |
| kald | treg | 500 | min_profil | 5 | 0.7 ms | 0.9 ms |
| personsøk | rask | 50 | sok_gruppekandidater | 59 | 46.3 ms | 104.6 ms |
| personsøk | rask | 50 | sok_medlemskandidater | 59 | 29.6 ms | 74.0 ms |
| personsøk | rask | 50 | les_stoffer | 3 | 457.5 ms | 491.2 ms |
| personsøk | rask | 50 | sok_direktemottakere | 59 | 20.7 ms | 41.1 ms |
| personsøk | rask | 50 | forsideoppsummering | 12 | 18.3 ms | 54.2 ms |
| personsøk | rask | 50 | les_kommentarer | 3 | 59.8 ms | 101.5 ms |
| personsøk | rask | 50 | medlemsoversikt | 1 | 78.2 ms | 78.2 ms |
| personsøk | rask | 50 | les_stoffregister | 4 | 11.6 ms | 15.4 ms |
| personsøk | rask | 50 | les_scenarioregler | 3 | 12.7 ms | 13.6 ms |
| personsøk | rask | 50 | mine_grupper | 3 | 9.8 ms | 13.9 ms |
| personsøk | rask | 50 | mine_rettigheter | 3 | 9.7 ms | 11.1 ms |
| personsøk | rask | 50 | ideer_med_nytt | 3 | 9.4 ms | 22.8 ms |
| personsøk | rask | 50 | diskusjonsoversikt | 1 | 23.4 ms | 23.4 ms |
| personsøk | rask | 50 | mine_gruppesamtaler | 3 | 7.1 ms | 10.7 ms |
| personsøk | rask | 50 | brukerinnstillinger | 32 | 0.6 ms | 3.7 ms |
| personsøk | rask | 50 | les_intervallregelsett | 3 | 5.9 ms | 8.7 ms |
| personsøk | rask | 50 | les_interaksjonssok | 3 | 5.9 ms | 7.8 ms |
| personsøk | rask | 50 | les_thc_regelsett | 3 | 5.6 ms | 10.0 ms |
| personsøk | rask | 50 | les_analyttkatalog | 3 | 5.5 ms | 8.2 ms |
| personsøk | rask | 50 | les_forslagsko | 3 | 4.4 ms | 7.1 ms |
| personsøk | rask | 50 | les_fagsaker | 2 | 5.5 ms | 9.5 ms |
| personsøk | rask | 50 | gruppeaktivitet | 1 | 10.6 ms | 10.6 ms |
| personsøk | rask | 50 | gruppeoversikt | 1 | 9.0 ms | 9.0 ms |
| personsøk | rask | 50 | profiles | 3 | 2.8 ms | 4.4 ms |
| personsøk | rask | 50 | datakilder_status | 2 | 3.6 ms | 4.1 ms |
| personsøk | rask | 50 | les_preparatsok | 3 | 1.7 ms | 2.1 ms |
| personsøk | rask | 50 | kan_endre_lokalt_innhold | 3 | 1.6 ms | 1.6 ms |
| personsøk | rask | 50 | mine_direktesamtaler | 3 | 1.5 ms | 2.0 ms |
| personsøk | rask | 50 | sokedata_versjoner | 3 | 1.5 ms | 1.7 ms |
| personsøk | rask | 50 | uleste_varsler | 3 | 1.3 ms | 1.5 ms |
| personsøk | rask | 50 | rydd_stoffpapirkurven | 2 | 1.9 ms | 2.2 ms |
| personsøk | rask | 50 | er_systemarkitekt | 3 | 1.2 ms | 2.3 ms |
| personsøk | rask | 50 | les_laboratoriesok | 3 | 1.1 ms | 1.7 ms |
| personsøk | rask | 50 | stillingskategorier | 3 | 1.0 ms | 1.6 ms |
| personsøk | rask | 50 | mine_chatvalg | 3 | 0.9 ms | 1.2 ms |
| personsøk | rask | 50 | les_stoffavoritter | 3 | 0.6 ms | 0.7 ms |
| personsøk | rask | 50 | min_profil | 3 | 0.5 ms | 0.6 ms |
| personsøk | rask | 50 | les_mine_forslag | 1 | 0.9 ms | 0.9 ms |
| personsøk | rask | 500 | sok_gruppekandidater | 59 | 413.5 ms | 762.7 ms |
| personsøk | rask | 500 | sok_medlemskandidater | 59 | 234.7 ms | 327.4 ms |
| personsøk | rask | 500 | sok_direktemottakere | 59 | 177.5 ms | 281.1 ms |
| personsøk | rask | 500 | les_stoffer | 3 | 425.0 ms | 434.7 ms |
| personsøk | rask | 500 | medlemsoversikt | 1 | 447.5 ms | 447.5 ms |
| personsøk | rask | 500 | forsideoppsummering | 12 | 18.0 ms | 48.3 ms |
| personsøk | rask | 500 | les_kommentarer | 3 | 47.7 ms | 75.8 ms |
| personsøk | rask | 500 | les_stoffregister | 5 | 9.7 ms | 18.2 ms |
| personsøk | rask | 500 | mine_gruppesamtaler | 3 | 12.9 ms | 20.1 ms |
| personsøk | rask | 500 | les_scenarioregler | 3 | 12.4 ms | 21.6 ms |
| personsøk | rask | 500 | mine_rettigheter | 3 | 10.1 ms | 12.8 ms |
| personsøk | rask | 500 | mine_grupper | 3 | 8.1 ms | 9.0 ms |
| personsøk | rask | 500 | les_forslagsko | 3 | 6.9 ms | 12.0 ms |
| personsøk | rask | 500 | brukerinnstillinger | 32 | 0.6 ms | 3.5 ms |
| personsøk | rask | 500 | les_thc_regelsett | 3 | 6.2 ms | 10.5 ms |
| personsøk | rask | 500 | les_analyttkatalog | 3 | 4.7 ms | 5.8 ms |
| personsøk | rask | 500 | kan_endre_lokalt_innhold | 3 | 3.8 ms | 6.2 ms |
| personsøk | rask | 500 | datakilder_status | 2 | 5.5 ms | 7.8 ms |
| personsøk | rask | 500 | profiles | 3 | 3.1 ms | 5.5 ms |
| personsøk | rask | 500 | gruppeaktivitet | 1 | 7.1 ms | 7.1 ms |
| personsøk | rask | 500 | gruppeoversikt | 1 | 6.3 ms | 6.3 ms |
| personsøk | rask | 500 | les_interaksjonssok | 3 | 2.0 ms | 2.5 ms |
| personsøk | rask | 500 | les_intervallregelsett | 3 | 1.9 ms | 2.1 ms |
| personsøk | rask | 500 | les_fagsaker | 2 | 2.8 ms | 4.4 ms |
| personsøk | rask | 500 | sokedata_versjoner | 3 | 1.6 ms | 1.8 ms |
| personsøk | rask | 500 | ideer_med_nytt | 3 | 1.5 ms | 1.7 ms |
| personsøk | rask | 500 | diskusjonsoversikt | 1 | 4.0 ms | 4.0 ms |
| personsøk | rask | 500 | uleste_varsler | 3 | 1.1 ms | 1.3 ms |
| personsøk | rask | 500 | mine_direktesamtaler | 3 | 1.1 ms | 1.8 ms |
| personsøk | rask | 500 | les_laboratoriesok | 3 | 1.0 ms | 1.6 ms |
| personsøk | rask | 500 | stillingskategorier | 3 | 1.0 ms | 1.5 ms |
| personsøk | rask | 500 | les_preparatsok | 3 | 1.0 ms | 1.1 ms |
| personsøk | rask | 500 | mine_chatvalg | 3 | 0.9 ms | 1.3 ms |
| personsøk | rask | 500 | er_systemarkitekt | 3 | 0.7 ms | 0.8 ms |
| personsøk | rask | 500 | rydd_stoffpapirkurven | 2 | 1.0 ms | 1.2 ms |
| personsøk | rask | 500 | min_profil | 3 | 0.6 ms | 0.8 ms |
| personsøk | rask | 500 | les_mine_forslag | 1 | 1.0 ms | 1.0 ms |
| personsøk | rask | 5000 | sok_gruppekandidater | 59 | 3980.2 ms | 5471.5 ms |
| personsøk | rask | 5000 | sok_medlemskandidater | 59 | 2414.2 ms | 3024.6 ms |
| personsøk | rask | 5000 | sok_direktemottakere | 59 | 1687.6 ms | 2300.6 ms |
| personsøk | rask | 5000 | medlemsoversikt | 1 | 4896.6 ms | 4896.6 ms |
| personsøk | rask | 5000 | les_stoffer | 3 | 452.8 ms | 473.0 ms |
| personsøk | rask | 5000 | forsideoppsummering | 12 | 15.2 ms | 63.2 ms |
| personsøk | rask | 5000 | les_kommentarer | 3 | 54.2 ms | 63.5 ms |
| personsøk | rask | 5000 | les_forslagsko | 3 | 14.4 ms | 17.0 ms |
| personsøk | rask | 5000 | les_stoffregister | 4 | 9.3 ms | 16.5 ms |
| personsøk | rask | 5000 | les_scenarioregler | 3 | 10.2 ms | 12.6 ms |
| personsøk | rask | 5000 | profiles | 3 | 10.2 ms | 14.3 ms |
| personsøk | rask | 5000 | mine_grupper | 3 | 9.7 ms | 10.8 ms |
| personsøk | rask | 5000 | datakilder_status | 2 | 13.5 ms | 24.0 ms |
| personsøk | rask | 5000 | mine_rettigheter | 3 | 8.4 ms | 8.7 ms |
| personsøk | rask | 5000 | mine_gruppesamtaler | 3 | 7.8 ms | 11.4 ms |
| personsøk | rask | 5000 | brukerinnstillinger | 32 | 0.5 ms | 1.9 ms |
| personsøk | rask | 5000 | les_thc_regelsett | 3 | 4.7 ms | 6.3 ms |
| personsøk | rask | 5000 | les_analyttkatalog | 3 | 4.4 ms | 4.8 ms |
| personsøk | rask | 5000 | les_interaksjonssok | 3 | 4.0 ms | 5.7 ms |
| personsøk | rask | 5000 | gruppeoversikt | 1 | 12.1 ms | 12.1 ms |
| personsøk | rask | 5000 | ideer_med_nytt | 3 | 2.7 ms | 4.0 ms |
| personsøk | rask | 5000 | les_intervallregelsett | 3 | 2.7 ms | 4.2 ms |
| personsøk | rask | 5000 | diskusjonsoversikt | 1 | 7.8 ms | 7.8 ms |
| personsøk | rask | 5000 | kan_endre_lokalt_innhold | 3 | 2.4 ms | 3.4 ms |
| personsøk | rask | 5000 | rydd_stoffpapirkurven | 2 | 2.4 ms | 2.8 ms |
| personsøk | rask | 5000 | gruppeaktivitet | 1 | 4.9 ms | 4.9 ms |
| personsøk | rask | 5000 | uleste_varsler | 3 | 1.6 ms | 2.0 ms |
| personsøk | rask | 5000 | mine_direktesamtaler | 3 | 1.5 ms | 1.8 ms |
| personsøk | rask | 5000 | sokedata_versjoner | 3 | 1.5 ms | 1.7 ms |
| personsøk | rask | 5000 | les_preparatsok | 3 | 1.2 ms | 1.5 ms |
| personsøk | rask | 5000 | les_fagsaker | 2 | 1.8 ms | 2.2 ms |
| personsøk | rask | 5000 | stillingskategorier | 3 | 1.2 ms | 1.9 ms |
| personsøk | rask | 5000 | les_laboratoriesok | 3 | 1.1 ms | 1.4 ms |
| personsøk | rask | 5000 | min_profil | 3 | 1.1 ms | 1.6 ms |
| personsøk | rask | 5000 | er_systemarkitekt | 3 | 0.8 ms | 1.1 ms |
| personsøk | rask | 5000 | autoerstatt_regler | 3 | 0.8 ms | 1.4 ms |
| personsøk | rask | 5000 | mine_chatvalg | 3 | 0.8 ms | 0.9 ms |
| personsøk | rask | 5000 | les_stoffavoritter | 3 | 0.5 ms | 0.8 ms |
| personsøk | rask | 5000 | les_mine_forslag | 1 | 0.8 ms | 0.8 ms |
| personsøk | treg | 50 | sok_gruppekandidater | 59 | 47.5 ms | 84.2 ms |
| personsøk | treg | 50 | sok_medlemskandidater | 59 | 30.7 ms | 61.3 ms |
| personsøk | treg | 50 | les_stoffer | 3 | 442.1 ms | 475.3 ms |
| personsøk | treg | 50 | sok_direktemottakere | 59 | 20.5 ms | 45.5 ms |
| personsøk | treg | 50 | forsideoppsummering | 12 | 17.1 ms | 50.1 ms |
| personsøk | treg | 50 | les_kommentarer | 3 | 55.8 ms | 73.8 ms |
| personsøk | treg | 50 | medlemsoversikt | 1 | 61.9 ms | 61.9 ms |
| personsøk | treg | 50 | mine_grupper | 3 | 11.4 ms | 15.8 ms |
| personsøk | treg | 50 | les_stoffregister | 3 | 9.6 ms | 16.3 ms |
| personsøk | treg | 50 | mine_rettigheter | 3 | 9.0 ms | 10.0 ms |
| personsøk | treg | 50 | mine_gruppesamtaler | 3 | 8.5 ms | 11.9 ms |
| personsøk | treg | 50 | brukerinnstillinger | 32 | 0.5 ms | 2.6 ms |
| personsøk | treg | 50 | les_analyttkatalog | 3 | 5.6 ms | 7.0 ms |
| personsøk | treg | 50 | les_scenarioregler | 3 | 5.4 ms | 6.6 ms |
| personsøk | treg | 50 | les_forslagsko | 3 | 4.0 ms | 4.8 ms |
| personsøk | treg | 50 | datakilder_status | 2 | 4.7 ms | 7.9 ms |
| personsøk | treg | 50 | les_interaksjonssok | 3 | 2.8 ms | 3.1 ms |
| personsøk | treg | 50 | gruppeoversikt | 1 | 7.4 ms | 7.4 ms |
| personsøk | treg | 50 | rydd_stoffpapirkurven | 2 | 3.6 ms | 3.9 ms |
| personsøk | treg | 50 | les_thc_regelsett | 3 | 2.3 ms | 2.4 ms |
| personsøk | treg | 50 | les_intervallregelsett | 3 | 2.2 ms | 2.4 ms |
| personsøk | treg | 50 | diskusjonsoversikt | 1 | 6.2 ms | 6.2 ms |
| personsøk | treg | 50 | gruppeaktivitet | 1 | 5.7 ms | 5.7 ms |
| personsøk | treg | 50 | kan_endre_lokalt_innhold | 3 | 1.9 ms | 2.1 ms |
| personsøk | treg | 50 | mine_direktesamtaler | 3 | 1.9 ms | 2.4 ms |
| personsøk | treg | 50 | ideer_med_nytt | 3 | 1.6 ms | 2.1 ms |
| personsøk | treg | 50 | profiles | 3 | 1.6 ms | 2.8 ms |
| personsøk | treg | 50 | sokedata_versjoner | 3 | 1.5 ms | 1.7 ms |
| personsøk | treg | 50 | les_preparatsok | 3 | 1.5 ms | 2.0 ms |
| personsøk | treg | 50 | les_laboratoriesok | 3 | 1.4 ms | 2.2 ms |
| personsøk | treg | 50 | les_fagsaker | 2 | 1.9 ms | 2.6 ms |
| personsøk | treg | 50 | uleste_varsler | 3 | 1.1 ms | 1.2 ms |
| personsøk | treg | 50 | er_systemarkitekt | 3 | 1.0 ms | 1.8 ms |
| personsøk | treg | 50 | stillingskategorier | 3 | 0.8 ms | 0.9 ms |
| personsøk | treg | 50 | min_profil | 3 | 0.6 ms | 0.8 ms |
| personsøk | treg | 50 | autoerstatt_regler | 3 | 0.5 ms | 0.7 ms |
| personsøk | treg | 50 | les_mine_forslag | 1 | 1.3 ms | 1.3 ms |
| personsøk | treg | 500 | sok_gruppekandidater | 59 | 411.8 ms | 584.4 ms |
| personsøk | treg | 500 | sok_medlemskandidater | 59 | 245.9 ms | 369.1 ms |
| personsøk | treg | 500 | sok_direktemottakere | 59 | 172.4 ms | 288.1 ms |
| personsøk | treg | 500 | les_stoffer | 3 | 467.4 ms | 500.1 ms |
| personsøk | treg | 500 | medlemsoversikt | 1 | 517.7 ms | 517.7 ms |
| personsøk | treg | 500 | forsideoppsummering | 12 | 15.1 ms | 34.2 ms |
| personsøk | treg | 500 | les_kommentarer | 3 | 47.8 ms | 70.0 ms |
| personsøk | treg | 500 | mine_grupper | 3 | 10.8 ms | 16.8 ms |
| personsøk | treg | 500 | mine_rettigheter | 3 | 9.0 ms | 11.8 ms |
| personsøk | treg | 500 | mine_gruppesamtaler | 3 | 8.5 ms | 14.4 ms |
| personsøk | treg | 500 | profiles | 3 | 7.0 ms | 14.7 ms |
| personsøk | treg | 500 | les_stoffregister | 3 | 6.3 ms | 7.5 ms |
| personsøk | treg | 500 | brukerinnstillinger | 32 | 0.5 ms | 1.1 ms |
| personsøk | treg | 500 | les_scenarioregler | 3 | 5.6 ms | 8.8 ms |
| personsøk | treg | 500 | les_forslagsko | 3 | 5.4 ms | 6.1 ms |
| personsøk | treg | 500 | les_analyttkatalog | 3 | 5.3 ms | 7.6 ms |
| personsøk | treg | 500 | gruppeoversikt | 1 | 10.8 ms | 10.8 ms |
| personsøk | treg | 500 | kan_endre_lokalt_innhold | 3 | 3.6 ms | 6.2 ms |
| personsøk | treg | 500 | les_intervallregelsett | 3 | 2.8 ms | 3.6 ms |
| personsøk | treg | 500 | ideer_med_nytt | 3 | 2.4 ms | 3.6 ms |
| personsøk | treg | 500 | les_interaksjonssok | 3 | 2.3 ms | 2.7 ms |
| personsøk | treg | 500 | les_thc_regelsett | 3 | 2.0 ms | 2.1 ms |
| personsøk | treg | 500 | uleste_varsler | 3 | 1.9 ms | 3.5 ms |
| personsøk | treg | 500 | mine_direktesamtaler | 3 | 1.8 ms | 3.8 ms |
| personsøk | treg | 500 | datakilder_status | 2 | 2.7 ms | 2.8 ms |
| personsøk | treg | 500 | les_laboratoriesok | 3 | 1.3 ms | 1.4 ms |
| personsøk | treg | 500 | diskusjonsoversikt | 1 | 3.8 ms | 3.8 ms |
| personsøk | treg | 500 | sokedata_versjoner | 3 | 1.2 ms | 1.2 ms |
| personsøk | treg | 500 | les_preparatsok | 3 | 1.2 ms | 1.4 ms |
| personsøk | treg | 500 | rydd_stoffpapirkurven | 2 | 1.6 ms | 2.1 ms |
| personsøk | treg | 500 | stillingskategorier | 3 | 1.0 ms | 1.4 ms |
| personsøk | treg | 500 | les_fagsaker | 2 | 1.5 ms | 1.9 ms |
| personsøk | treg | 500 | gruppeaktivitet | 1 | 2.4 ms | 2.4 ms |
| personsøk | treg | 500 | er_systemarkitekt | 3 | 0.8 ms | 1.1 ms |
| personsøk | treg | 500 | mine_chatvalg | 3 | 0.6 ms | 0.8 ms |
| personsøk | treg | 500 | min_profil | 3 | 0.6 ms | 0.7 ms |
| personsøk | treg | 500 | autoerstatt_regler | 3 | 0.6 ms | 0.6 ms |
| personsøk | treg | 500 | les_mine_forslag | 1 | 1.3 ms | 1.3 ms |
| personsøk | treg | 5000 | sok_gruppekandidater | 59 | 3972.5 ms | 6027.3 ms |
| personsøk | treg | 5000 | sok_medlemskandidater | 59 | 2587.2 ms | 3163.7 ms |
| personsøk | treg | 5000 | sok_direktemottakere | 59 | 1886.1 ms | 2877.5 ms |
| personsøk | treg | 5000 | medlemsoversikt | 1 | 5695.4 ms | 5695.4 ms |
| personsøk | treg | 5000 | les_stoffer | 3 | 493.3 ms | 508.8 ms |
| personsøk | treg | 5000 | forsideoppsummering | 12 | 15.2 ms | 42.7 ms |
| personsøk | treg | 5000 | les_kommentarer | 3 | 52.1 ms | 67.4 ms |
| personsøk | treg | 5000 | les_forslagsko | 3 | 19.4 ms | 24.1 ms |
| personsøk | treg | 5000 | mine_gruppesamtaler | 3 | 11.2 ms | 15.7 ms |
| personsøk | treg | 5000 | mine_rettigheter | 3 | 10.8 ms | 13.0 ms |
| personsøk | treg | 5000 | mine_grupper | 3 | 10.1 ms | 10.6 ms |
| personsøk | treg | 5000 | brukerinnstillinger | 32 | 0.7 ms | 2.5 ms |
| personsøk | treg | 5000 | les_scenarioregler | 3 | 6.8 ms | 8.2 ms |
| personsøk | treg | 5000 | profiles | 3 | 6.7 ms | 11.5 ms |
| personsøk | treg | 5000 | les_stoffregister | 3 | 6.7 ms | 9.0 ms |
| personsøk | treg | 5000 | les_analyttkatalog | 3 | 6.7 ms | 9.3 ms |
| personsøk | treg | 5000 | les_interaksjonssok | 3 | 4.0 ms | 5.6 ms |
| personsøk | treg | 5000 | les_intervallregelsett | 3 | 3.9 ms | 5.8 ms |
| personsøk | treg | 5000 | datakilder_status | 2 | 5.0 ms | 7.3 ms |
| personsøk | treg | 5000 | les_preparatsok | 3 | 3.3 ms | 5.6 ms |
| personsøk | treg | 5000 | stillingskategorier | 3 | 3.0 ms | 7.3 ms |
| personsøk | treg | 5000 | les_thc_regelsett | 3 | 2.9 ms | 3.8 ms |
| personsøk | treg | 5000 | ideer_med_nytt | 3 | 2.8 ms | 5.0 ms |
| personsøk | treg | 5000 | gruppeoversikt | 1 | 8.3 ms | 8.3 ms |
| personsøk | treg | 5000 | les_fagsaker | 2 | 4.1 ms | 5.4 ms |
| personsøk | treg | 5000 | kan_endre_lokalt_innhold | 3 | 2.2 ms | 2.6 ms |
| personsøk | treg | 5000 | diskusjonsoversikt | 1 | 5.8 ms | 5.8 ms |
| personsøk | treg | 5000 | uleste_varsler | 3 | 1.9 ms | 3.0 ms |
| personsøk | treg | 5000 | sokedata_versjoner | 3 | 1.9 ms | 2.2 ms |
| personsøk | treg | 5000 | mine_direktesamtaler | 3 | 1.9 ms | 2.4 ms |
| personsøk | treg | 5000 | rydd_stoffpapirkurven | 2 | 2.1 ms | 2.8 ms |
| personsøk | treg | 5000 | les_laboratoriesok | 3 | 1.4 ms | 1.5 ms |
| personsøk | treg | 5000 | gruppeaktivitet | 1 | 3.5 ms | 3.5 ms |
| personsøk | treg | 5000 | mine_chatvalg | 3 | 1.0 ms | 1.2 ms |
| personsøk | treg | 5000 | min_profil | 3 | 0.7 ms | 0.8 ms |
| personsøk | treg | 5000 | er_systemarkitekt | 3 | 0.6 ms | 0.8 ms |
| personsøk | treg | 5000 | les_mine_forslag | 1 | 1.6 ms | 1.6 ms |
| personsøk | treg | 5000 | les_stoffavoritter | 3 | 0.5 ms | 0.6 ms |
| personsøk | treg | 5000 | autoerstatt_regler | 3 | 0.5 ms | 0.6 ms |
| varm | rask | 500 | les_stoffer | 5 | 436.3 ms | 449.7 ms |
| varm | rask | 500 | forsideoppsummering | 40 | 17.8 ms | 47.5 ms |
| varm | rask | 500 | les_kommentarer | 10 | 51.2 ms | 73.9 ms |
| varm | rask | 500 | les_stoffregister | 18 | 11.8 ms | 26.2 ms |
| varm | rask | 500 | mine_gruppesamtaler | 10 | 16.7 ms | 27.2 ms |
| varm | rask | 500 | les_scenarioregler | 10 | 10.0 ms | 19.8 ms |
| varm | rask | 500 | mine_grupper | 10 | 9.4 ms | 16.6 ms |
| varm | rask | 500 | mine_rettigheter | 10 | 9.2 ms | 12.4 ms |
| varm | rask | 500 | brukerinnstillinger | 100 | 0.6 ms | 2.6 ms |
| varm | rask | 500 | les_intervallregelsett | 10 | 5.4 ms | 13.3 ms |
| varm | rask | 500 | les_analyttkatalog | 10 | 5.3 ms | 7.4 ms |
| varm | rask | 500 | les_forslagsko | 10 | 5.0 ms | 6.8 ms |
| varm | rask | 500 | les_thc_regelsett | 10 | 3.7 ms | 7.8 ms |
| varm | rask | 500 | profiles | 10 | 3.5 ms | 6.8 ms |
| varm | rask | 500 | datakilder_status | 10 | 3.3 ms | 10.2 ms |
| varm | rask | 500 | kan_endre_lokalt_innhold | 10 | 3.0 ms | 5.5 ms |
| varm | rask | 500 | les_fagsaker | 10 | 2.8 ms | 14.6 ms |
| varm | rask | 500 | ideer_med_nytt | 10 | 2.1 ms | 3.8 ms |
| varm | rask | 500 | les_interaksjonssok | 9 | 2.3 ms | 3.2 ms |
| varm | rask | 500 | uleste_varsler | 10 | 1.8 ms | 5.8 ms |
| varm | rask | 500 | stillingskategorier | 10 | 1.6 ms | 5.1 ms |
| varm | rask | 500 | mine_direktesamtaler | 10 | 1.4 ms | 3.4 ms |
| varm | rask | 500 | rydd_stoffpapirkurven | 10 | 1.4 ms | 3.3 ms |
| varm | rask | 500 | les_laboratoriesok | 9 | 1.5 ms | 3.8 ms |
| varm | rask | 500 | sokedata_versjoner | 10 | 1.3 ms | 1.5 ms |
| varm | rask | 500 | er_systemarkitekt | 10 | 1.1 ms | 3.6 ms |
| varm | rask | 500 | mine_chatvalg | 10 | 1.1 ms | 4.9 ms |
| varm | rask | 500 | les_preparatsok | 7 | 1.3 ms | 1.8 ms |
| varm | rask | 500 | autoerstatt_regler | 10 | 0.8 ms | 3.0 ms |
| varm | rask | 500 | les_stoffavoritter | 10 | 0.8 ms | 4.9 ms |
| varm | rask | 500 | min_profil | 10 | 0.6 ms | 0.9 ms |
| varm | treg | 500 | les_stoffer | 5 | 500.1 ms | 563.9 ms |
| varm | treg | 500 | forsideoppsummering | 40 | 14.4 ms | 43.9 ms |
| varm | treg | 500 | les_kommentarer | 10 | 37.5 ms | 59.1 ms |
| varm | treg | 500 | mine_gruppesamtaler | 10 | 12.5 ms | 32.0 ms |
| varm | treg | 500 | mine_grupper | 10 | 8.0 ms | 11.3 ms |
| varm | treg | 500 | mine_rettigheter | 10 | 7.9 ms | 9.6 ms |
| varm | treg | 500 | les_stoffregister | 10 | 6.1 ms | 9.7 ms |
| varm | treg | 500 | brukerinnstillinger | 100 | 0.6 ms | 1.9 ms |
| varm | treg | 500 | les_scenarioregler | 10 | 5.4 ms | 6.7 ms |
| varm | treg | 500 | les_analyttkatalog | 10 | 5.2 ms | 8.1 ms |
| varm | treg | 500 | les_forslagsko | 10 | 5.1 ms | 6.8 ms |
| varm | treg | 500 | profiles | 10 | 2.8 ms | 5.4 ms |
| varm | treg | 500 | les_intervallregelsett | 10 | 2.6 ms | 4.0 ms |
| varm | treg | 500 | les_thc_regelsett | 10 | 2.1 ms | 2.8 ms |
| varm | treg | 500 | kan_endre_lokalt_innhold | 10 | 1.8 ms | 2.3 ms |
| varm | treg | 500 | ideer_med_nytt | 10 | 1.7 ms | 3.4 ms |
| varm | treg | 500 | uleste_varsler | 10 | 1.2 ms | 1.6 ms |
| varm | treg | 500 | mine_chatvalg | 10 | 1.1 ms | 5.5 ms |
| varm | treg | 500 | stillingskategorier | 10 | 1.0 ms | 2.0 ms |
| varm | treg | 500 | rydd_stoffpapirkurven | 10 | 1.0 ms | 1.4 ms |
| varm | treg | 500 | datakilder_status | 10 | 0.9 ms | 1.3 ms |
| varm | treg | 500 | les_fagsaker | 10 | 0.8 ms | 1.1 ms |
| varm | treg | 500 | er_systemarkitekt | 10 | 0.7 ms | 1.0 ms |
| varm | treg | 500 | sokedata_versjoner | 5 | 1.4 ms | 1.7 ms |
| varm | treg | 500 | min_profil | 10 | 0.6 ms | 0.8 ms |
| varm | treg | 500 | mine_direktesamtaler | 10 | 0.6 ms | 1.0 ms |
| varm | treg | 500 | les_interaksjonssok | 5 | 1.1 ms | 1.8 ms |
| varm | treg | 500 | les_preparatsok | 5 | 1.0 ms | 1.2 ms |
| varm | treg | 500 | les_laboratoriesok | 5 | 0.6 ms | 0.6 ms |