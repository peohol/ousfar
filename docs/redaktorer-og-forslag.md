# Redaktører og endringsforslag (P5)

Leses før noe ved redaktøransvaret, endringsforslagene eller arbeidskøen for
forslag endres. Oppdraget er [#416](https://github.com/peohol/ousfar/issues/416)
under planen [#364](https://github.com/peohol/ousfar/issues/364) (§10 P5),
og fremdriften føres i [#369](https://github.com/peohol/ousfar/issues/369).
Bakgrunnen er P0-rapporten (`docs/ousfar-nasjonal-p0-kartlegging.md` §5.1,
§5.2 og §6.1) og tilgangsmodellen i `docs/fagmiljoer.md`.

Dokumentet er delplanen fra P5.0 og den felles kontrakten trådene A–D
bygger på: begrepene, datamodellen, grensesnittene og filansvaret. Hver
tråd fører sin del inn i avsnittet sitt her når den er levert, og endrer
ikke de andres avsnitt eller kontrakten uten å avklare det med P5-tråden.

## Mål

- En vanlig bruker kan foreslå en endring i faginnholdet fra der innholdet
  står, men aldri endre eller publisere det selv.
- Systemarkitektene og de lokale administratorene kan gi redaktøransvar
  innenfor sin myndighet, for én ressurs eller et avgrenset område, til
  flere personer.
- Redaktørene behandler forslagene uten å være administratorer, og et
  godkjent forslag arbeides inn i det vanlige utkastet med den vanlige
  historikken.
- Et godkjent forslag er ikke publisert innhold. Publisering, faglig
  godkjenning og den uavhengige kontrollen er som før.

Ikke med: sikkerhetskopi, innlogging, tofaktor, ekstern pilot, gruppechat og
gruppefiler. Ingen ny permanent koordinator, godkjenningsprosess eller
automatisk kontrolljobb.

## Det som finnes og gjenbrukes (P5.0)

| Behov | Finnes i dag | Hvordan P5 bruker det |
| --- | --- | --- |
| Stabil ID per ressurs | `redigerbare_objekter` (uforanderlig), fagsiden (`infoside`) med kortene (`innholdselement`), regelsettene og kommentarene | Ressursen er objekt-ID-en til fagsiden eller regelsettet |
| Rekkevidde per objekt | `ressursomfang` (felles / fagmiljø), `intern.kan_lese_objekt`, `intern.kan_endre_omfang` | Forslag, kø og ansvar følger rekkevidden; ingen egen modell |
| Endringsrett | `intern.kan_endre_objekt` → `intern.krev_endringsrett` i `intern.laas_utkast` og `intern.opprett_objekt_som`; porten `intern.krev_redaktor`; `public.kan_se_utkast` og de tillatende reglene for utkast | Tråd A utvider endringsretten med redaktøransvaret, i de samme funksjonene |
| Utkast, revisjoner, publisering | `objektrevisjoner`, `objekttilstander`, `objektpubliseringer`, `lagre_utkast`, `lagre_*regelsett`, `publiser_utkast` med `forventet_revisjon` og konflikt `PT409` | Et forslag arbeides inn gjennom de samme redigeringene; forslaget peker på revisjonen |
| Historikk og sammenligning | `les_historikk`, historikkvinduet (`src/components/historikk/`), `sideversjoner` | Konfliktkontrollen viser hva som er endret siden forslaget ble skrevet |
| Endringsloggen for innholdet | `innholdsendringer` (`docs/innholdsendringer.md`) | Uendret: innarbeidingen skjer gjennom de vanlige lagringene |
| Varsler | `intern.varsle`, `varselkategori`, `src/varsler/modell.ts` | To nye kategorier for forslag (tråd C) |
| Diskusjoner | Tråder per side (`docs/diskusjoner.md`) | Ikke brukt for forslag: et forslag er privat for forslagsstilleren og behandlerne, mens trådene er åpne for alle som leser siden. Samtalen om et forslag står i forslagets egen tidslinje |
| Rettigheter i appen | `public.mine_rettigheter()`, `useRettigheter()` | Tråd A legger til `redaktor` og `behandlerForslag` |
| Fagsidenes kuratering | Kurateringsgrener og -kø, Kurator og Kontrollør (OUSFAR Fag) | Uendret. Forslag til felles fagsider kobles til kurateringen først når Fag har avklart det (P5d) |

## Begreper

- **Ressurs** — det brukeren ser som én enhet, og som redaktøransvar og
  forslag gjelder: en **fagside** (`infoside`, med kortene på den) eller et
  **regelsett** i fortolkningen (`intervallregelsett`, `scenarioregelsett`,
  `thc_regelsett`). Identiteten er objekt-ID-en.
- **Element** — et kort på en fagside eller en kommentar et regelsett bruker.
  Et forslag kan peke på et element i ressursen. En kommentar kan brukes av
  flere regelsett og hører da til alle.
- **Område** — en avgrenset mengde ressurser et redaktøransvar kan gjelde:
  én ressurs, hele fortolkningen i ett fagmiljø, eller alle fagsidene.
- **Redaktør** — en person med aktivt redaktøransvar. Redaktøren leser og
  endrer utkastene i området og behandler forslagene der, men **publiserer
  ikke**: publiseringen blir hos dem som publiserer i dag (lokal
  administrator for lokalt innhold, systemarkitektene for felles), etter
  kontrollen som kreves i dag.
- **Myndighet** — det som gir endringsrett etter rekkevidden alene:
  systemarkitekt (felles og alt), lokal administrator (lokalt i fagmiljøet).
  `intern.har_ressursmyndighet`.
- **Nasjonalt redaktøransvar** — ansvar for felles innhold (fagsidene).
  Bare systemarkitektene kan gi det, og det er **avslått** til OUSFAR Fag har
  avklart #417; Peder har sagt ja til det på det vilkåret (planens B2; se
  [Nasjonale redaktører](#nasjonale-redaktører-b2)).
- **Lokalt redaktøransvar** — ansvar for lokalt innhold i ett fagmiljø
  (fortolkningen). Gis av den lokale administratoren der eller en
  systemarkitekt, til et aktivt medlem av fagmiljøet.

## Rettighetene

Tillegg til matrisen i `docs/fagmiljoer.md` («Faginnholdet etter
rekkevidden»), etter P0 §5.2:

| Handling | Vanlig bruker | Lokal redaktør | Nasjonal redaktør (av til B2) | Lokal admin | Systemarkitekt |
| --- | --- | --- | --- | --- | --- |
| Foreslå endring | Det man kan lese | Ja | Ja | Ja | Ja |
| Se egne forslag og følge dem | Ja | Ja | Ja | Ja | Ja |
| Trekke eget forslag tilbake | Til det er godkjent eller avvist | Samme | Samme | Samme | Samme |
| Se andres forslag og køen | Nei | Området | Området | Eget fagmiljøs lokale | Alt |
| Behandle (be om presisering, godkjenne, avvise, arbeide inn) | Nei | Området | Området | Eget fagmiljøs lokale | Alt |
| Lese og endre utkast | Nei | Området | Området | Eget fagmiljøs lokale | Alt |
| Publisere | Nei | Nei | Nei | Eget fagmiljøs lokale | Alt (felles etter Fags kontroll) |
| Gi lokalt redaktøransvar | Nei | Nei | Nei | Eget fagmiljø | Ja |
| Gi nasjonalt redaktøransvar | Nei | Nei | Nei | Nei | Ja, når Fag har avklart #417 (B2 godkjent av Peder 16.11.2026) |

To avklaringer (16.11.2026): en behandler kan behandle sitt eget forslag,
siden vedkommende kan endre utkastet uansett, og tidslinjen viser hvem som
gjorde hva. En redaktør kan ikke tilbakekalle sitt eget ansvar; bare den som
kan gi det, kan ta det tilbake.

**Delte elementer.** En kommentar kan brukes av flere regelsett
(`intern.ressurser_for` gir da flere ressurser). Et ressursansvar dekker et
element bare når redaktøren har ansvar for **alle** ressursene elementet hører
til, også når elementet lagres sammen med en av dem i `lagre_*regelsett`.
Ellers kunne en redaktør for ett regelsett endre klinisk tekst i et annet.
Å ta i bruk en delt kommentar uendret er fortsatt lov. Et ansvar for
fortolkningen i et fagmiljø dekker alle lokale objekter der uansett, og
lokale administratorer og systemarkitekter har myndigheten som før.

Den gamle adminrollen (`profiles.role = 'admin'`) gir ingenting her. Alle
kontroller krever aktivt medlemskap. Et redaktøransvar for lokalt innhold
gjelder bare så lenge redaktøren er aktivt medlem av fagmiljøet. Ingen kan gi
seg selv ansvar eller gi mer enn egen myndighet.

## Grunnmuren (P5.0, levert)

`supabase/migrations/20261116130000_p5_ressurser.sql`, prøvd i
`src/__tests__/p5ressurser.test.ts`. Ingen atferdsendring og ingenting
nettleseren kan kalle. Alle trådene bygger på disse funksjonene i `intern`
og lager ingen egne varianter av dem:

| Funksjon | Svarer | Endres av |
| --- | --- | --- |
| `er_ressurstype(type)` | Om objekttypen er en ressurs | — |
| `ressurser_for(objekt)` | Ressursene objektet hører til (seg selv, fagsiden for et kort, regelsettene for en kommentar) | — |
| `tilhorer_ressurs(objekt, ressurs)` | Om objektet er ressursen eller et element i den | — |
| `ressursbeskrivelse(ressurs)` | `{id, type, navn, stoff, analyttkode, omfang, fagmiljo_id, publisert_revisjon}`. Leser forbi radsikkerheten: kall den bare for en ressurs den innloggede kan lese | — |
| `har_ressursmyndighet(ressurs, bruker)` | Systemarkitekt (felles) eller lokal administrator (lokalt), uten redaktøransvar. Det som gir publiseringsretten | — |
| `ressursens_redaktorer(ressurs)` | De aktive redaktørene med ansvar for ressursen. **Tom i grunnmuren** | Tråd A, med samme signatur |
| `kan_behandle_forslag(ressurs, bruker)` | Aktivt medlemskap og (myndighet eller redaktøransvar) | — (følger A gjennom funksjonen over) |
| `forslagsbehandlere(ressurs)` | Mottakerne av et nytt forslag: redaktørene, og når ingen har ansvaret, de med myndighet (ansvarskøen) | — |

`kan_behandle_forslag` og `har_ressursmyndighet` står i
`REKKEVIDDEHJELPERE` (`src/__tests__/hjelp/tilgangskatalog.ts`), så en
funksjon som kaller dem, kan erklæres `rekkevidde` i
`src/__tests__/data/funksjonskontroller.ts`.

## Datamodellen

Alle tabellene er i `public`, med radsikkerhet på, uten skriverett for
nettleseren (endringer bare gjennom funksjonene) og uten sletting: historikken
står. Hver ny tabell føres i `src/__tests__/data/ressurskatalog.ts`, og hver
funksjon nettleseren kan kalle, i `funksjonskontroller.ts`.

### `redaktoransvar` (tråd A)

| Kolonne | Innhold |
| --- | --- |
| `id` | uuid |
| `bruker_id` | Redaktøren (`profiles`) |
| `omrade` | `ressurs`, `fortolkning` eller `fagsider` |
| `ressurs_id` | Objekt-ID-en når `omrade = 'ressurs'` (en ressurs etter `er_ressurstype`), ellers null |
| `fagmiljo_id` | Fagmiljøet når `omrade = 'fortolkning'`, ellers null |
| `tildelt_av`, `tildelt_kl` | Hvem og når |
| `tilbakekalt_av`, `tilbakekalt_kl` | Null mens ansvaret er aktivt |
| `merknad` | Valgfri kort tekst (høyst 300 tegn) |

Høyst ett aktivt ansvar per person og mål (delvis unik indeks). Et
tilbakekalt ansvar står. Om ansvaret er nasjonalt eller lokalt, følger av
målet: `fagsider`, og `ressurs` med felles rekkevidde, er nasjonalt;
`fortolkning`, og `ressurs` med lokal rekkevidde, er lokalt. Endringene
loggføres i `tilgangslogg` (`intern.loggfor_tilgang`), som de andre
tilgangsendringene.

### `endringsforslag` (tråd B)

| Kolonne | Innhold |
| --- | --- |
| `id` | uuid |
| `ressurs_id` | Ressursen (`er_ressurstype`) |
| `element_id` | Kortet eller kommentaren forslaget gjelder (`tilhorer_ressurs(element_id, ressurs_id)`), eller null for ressursen som helhet |
| `grunnrevisjon` | Den publiserte revisjonen av elementet (eller ressursen) forslagsstilleren så |
| `sideversjon` | Fagsidens versjon (`sideversjoner.nr`) forslagsstilleren så, for en fagside; ellers null |
| `sted` | Valgfri kort tekst om hvor (som seksjonen eller kortets navn), høyst 200 tegn |
| `utdrag` | Valgfritt sitat av teksten slik den står, høyst 2000 tegn |
| `forslag` | Den foreslåtte endringen, ren tekst, 1–8000 tegn |
| `begrunnelse` | Hvorfor, ren tekst, 1–4000 tegn |
| `kilder` | JSON-liste, høyst 10: `{tekst, lenke?, referanse?}` (lenke `https://`, referanse en ID i referansebasen) |
| `status` | Se under |
| `stilt_av`, `opprettet_kl` | Forslagsstilleren og tidspunktet |
| `oppdatert_kl` | Siste hendelse |
| `behandler_id` | Redaktøren som har tatt forslaget, eller null |
| `vedtak_av`, `vedtak_kl`, `vedtak_begrunnelse` | Godkjenningen eller avvisningen |
| `innarbeidet_objekt`, `innarbeidet_revisjon` | Revisjonen av utkastet forslaget ble arbeidet inn i |

**Statusene** og hvem som flytter dem:

| Status | Betyr | Videre til |
| --- | --- | --- |
| `ny` | Sendt, ikke tatt | `under_behandling` (behandler tar det eller skriver), `trukket` |
| `under_behandling` | En behandler arbeider med det | `venter_pa_forslagsstiller`, `godkjent`, `avvist`, `trukket` |
| `venter_pa_forslagsstiller` | Behandleren har bedt om en presisering | `under_behandling` (forslagsstilleren svarer), `avvist`, `trukket` |
| `godkjent` | Skal arbeides inn; er **ikke** publisert | `innarbeidet` |
| `innarbeidet` | Koblet til en revisjon av utkastet | — |
| `avvist` | Med begrunnelse | — |
| `trukket` | Av forslagsstilleren | — |

«Ferdigbehandlet» er `innarbeidet`, `avvist` og `trukket`. Forslagsstilleren
kan trekke forslaget til det er godkjent eller avvist.

### `endringsforslag_hendelser` (tråd B lager tabellen, C skriver de fleste)

Tidslinjen for ett forslag: `id`, `forslag_id`, `art`, `tekst` (valgfri, høyst
4000 tegn), `utfort_av`, `utfort_kl`, `data` (jsonb). Artene: `opprettet`,
`kommentar`, `presisering_bedt`, `presisering`, `tatt`, `godkjent`, `avvist`,
`trukket`, `innarbeidet`, `konflikt_sett`. Statusen i `endringsforslag`
endres bare sammen med en hendelse, i samme funksjon.

### Hvem ser et forslag

Forslaget og tidslinjen leses av forslagsstilleren, så lenge vedkommende kan
lese ressursen (`intern.kan_lese_objekt`), og av dem som kan behandle forslag
til ressursen (`intern.kan_behandle_forslag`). Ingen andre: forslag er ikke
offentlige for fagmiljøet, og ingenting fra et annet fagmiljøs lokale
ressurser vises, verken i lister, tellinger, søk eller varsler. Lesingen går
gjennom funksjoner som returnerer JSON, ikke direkte mot tabellene.

## Grensesnittene

Funksjonene nettleseren kaller, med eieren. Navnene er bindende; argumentene
kan utvides av eieren med standardverdier.

| Funksjon | Eier | Hva |
| --- | --- | --- |
| `public.tildel_redaktoransvar(bruker, omrade, ressurs default null, fagmiljo default null, merknad default null) → uuid` | A | Gir ansvar etter myndigheten. Nasjonalt avvises (42501) til B2 er slått på. Idempotent: det samme aktive ansvaret igjen gir samme id |
| `public.tilbakekall_redaktoransvar(ansvar) → void` | A | Avslutter ansvaret. Idempotent: et ansvar som alt er tilbakekalt, kan tilbakekalles igjen uten feil og uten endring |
| `public.les_redaktoransvar(fagmiljo default null) → jsonb` | A | Oversikten for den som tildeler: ansvarene og `ressurser` (alle ressursene innenfor egen myndighet, med `har_redaktor` og `analyttkoder`) |
| `public.mine_redaktoransvar() → jsonb` | A | Den innloggedes egne ansvar, med ressursbeskrivelsene |
| `public.ressursens_redaktoransvar(ressurs) → jsonb` | A | Redaktørene for én ressurs, for dem som kan behandle forslag til den eller administrere den |
| `public.mine_rettigheter()` | A | Får `redaktor` (har aktivt ansvar) og `behandler_forslag` (kan behandle forslag til noe) |
| `public.foresla_endring(ressurs, element, grunnrevisjon, sideversjon, sted, utdrag, forslag, begrunnelse, kilder) → uuid` | B | Lager forslaget og hendelsen `opprettet` |
| `public.trekk_forslag(forslag, begrunnelse default null) → void` | B | Forslagsstilleren trekker det |
| `public.svar_pa_forslag(forslag, tekst) → void` | B | Forslagsstilleren svarer på en presisering (`venter_pa_forslagsstiller` → `under_behandling`) eller kommenterer |
| `public.les_mine_forslag() → jsonb` | B | Forslagsstillerens egne, nyeste først, med status og ressursbeskrivelse |
| `public.les_forslag(forslag) → jsonb` | B | Ett forslag med tidslinjen, for den som kan se det; `kan_behandle` og `konflikt` i svaret |
| `public.les_forslagsko(filter default 'aktive') → jsonb` | C | Køen for den innloggede: `nye`, `pagaende`, `ferdige`, og `uten_redaktor` (ansvarskøen) |
| `public.ta_forslag(forslag)`, `public.kommenter_forslag(forslag, tekst)`, `public.be_om_presisering(forslag, tekst)` | C | Behandlingen |
| `public.godkjenn_forslag(forslag, begrunnelse default null)`, `public.avvis_forslag(forslag, begrunnelse)` | C | Vedtaket. Avvisning krever begrunnelse |
| `public.marker_forslag_innarbeidet(forslag, objekt, revisjon)` | C | Kobler et godkjent forslag til en revisjon av utkastet som finnes og hører til ressursen |

Alle krever aktivt medlemskap. En ressurs eller et forslag den innloggede
ikke kan se, gir `PT404` «Fant ikke …» (samme svar som noe som ikke finnes),
manglende rett `42501`, ugyldig innhold `22023` og en status som er endret
underveis `PT409`. Feilene skrives for å vises.

## Konflikter og samtidighet

- Forslaget husker `grunnrevisjon` (og `sideversjon`). Er den publiserte
  revisjonen eller utkastet endret siden, viser forslaget det
  (`konflikt` i `les_forslag`: revisjonen forslaget bygger på, den publiserte
  nå, og om det finnes upubliserte endringer i utkastet), med lenke til
  historikken for sammenligning. Redaktøren avgjør; ingenting skrives over.
- Innarbeidingen skjer i de vanlige redigeringene, som alt avviser en
  lagring mot en eldre revisjon (`PT409`). `marker_forslag_innarbeidet`
  krever at revisjonen finnes og hører til ressursen.
- Hver statusendring låser forslagsraden og avviser en overgang som ikke
  passer statusen den finner (`PT409`), så to behandlere eller en behandler
  og forslagsstilleren ikke kan gjøre motstridende endringer samtidig.
- Et kall fra en redaktør (eller en forslagsstiller) som kommer mens
  tilbakekallingen av ansvaret eller avslutningen av medlemskapet ennå ikke er
  lagret, venter ikke, men regnes som gjort før den. Når fjerningen er lagret,
  avvises alt, også i en transaksjon som begynte før.

## Varsler (tråd C)

To nye kategorier i `varselkategori` (egen migrasjon) og
`src/varsler/modell.ts`, i en ny gruppe «Endringsforslag»:

| Kategori | Til | Kan slås av |
| --- | --- | --- |
| `mine_forslag` | Forslagsstilleren: ny status, kommentar eller spørsmål | Nei |
| `forslag_til_behandling` | `intern.forslagsbehandlere(ressurs)`: nye forslag og svar fra forslagsstilleren | Ja, på som standard |

Mottakerne må kunne se forslaget i det varselet lages, og varselet får
fagmiljøet til en lokal ressurs, så det forsvinner med medlemskapet.

## Brukerflaten

Alt bygger på de eksisterende komponentene (`Modallag`, `Nedtrekksmeny`,
`Skuff`, knappene og ikonene i designsystemet, `useBevart` for skjemaer) og
fungerer med tastatur, berøring og på smal skjerm.

| Hvor | Hva | Eier |
| --- | --- | --- |
| Fagsiden: menyen på siden og hvert kort | «Foreslå endring» åpner skjemaet med siden eller kortet valgt | B |
| Fortolkningen: regelsettet og hver kommentar i visningen av reglene | «Foreslå endring» | B |
| Skjemaet | Hva det gjelder (forhåndsutfylt, med sitat), forslaget, begrunnelsen og kildene; på smal skjerm i hele høyden | B |
| `#/forslag` | «Mine forslag» for alle; fanen «Til behandling» for dem med `behandler_forslag` | B (siden og «Mine forslag»), C (fanen) |
| `#/forslag/<id>` | Forslaget med tidslinjen; forslagsstillerens handlinger (B), behandlerens (C), konfliktvisningen og lenken til redigeringen (C) | B, C |
| Kontomenyen | «Mine forslag», og «Til behandling» med tall for behandlerne | B, C |
| Adminmenyen | «Redaktører»: tildele, tilbakekalle, oversikten og ressursene uten redaktør | A |
| Ved redigeringen av en ressurs | Hvem som er redaktør, for dem som kan redigere eller administrere den | A |

Vanlige brukere ser ingen administrative valg. En redaktør som ikke er
administrator, ser ikke adminmenyen, men får redigeringen i området sitt og
fanen «Til behandling».

## Forslag (tråd B)

**B1, databasen** (`supabase/migrations/20261116131500_p5_endringsforslag.sql`,
prøvd i `src/__tests__/endringsforslag.test.ts` og
`endringsforslag.samtidighet.test.ts`):

- Tabellene `endringsforslag` og `endringsforslag_hendelser` etter
  «Datamodellen», med radsikkerhet på og uten noen rettigheter for
  nettleseren. Det forslagsstilleren skrev og tidslinjen kan ikke endres i
  ettertid (`intern.tilgang_faste_felter`); bare personfeltene tømmes når en
  konto slettes. Radene forsvinner bare med fagsiden, når den slettes for godt
  fra papirkurven, som resten av historikken.
- `foresla_endring` kontrollerer, i denne rekkefølgen: aktivt medlemskap;
  at ressursen er en publisert fagside eller et publisert regelsett den
  innloggede kan lese (ellers `PT404`); at elementet hører til ressursen, kan
  leses og er publisert (ellers `PT404`; ressursen selv som element lagres
  som ingen); at `grunnrevisjon` er en revisjon av elementet (eller ressursen)
  som er eller har vært publisert, og at `sideversjon` finnes for fagsiden
  (ellers `22023`; uten den gjelder et forslag til en fagside den nyeste
  versjonen, den forslagsstilleren ser når siden nettopp er lastet); tekstene og kildene; og grensen på **25 åpne forslag** per
  person (`intern.maks_apne_forslag()`), under en lås per person så to
  samtidige innsendinger ikke begge kommer forbi den.
- Kildene (`intern.forslagskilder`): høyst ti, hver med en tekst (høyst 500
  tegn), en lenke (bare `https://`) eller en publisert referanse den
  innloggede kan lese. Ukjente felt tas bort.
- Hjelperne tråd C bygger på, i `intern`, ingen av dem kallbare fra
  nettleseren:

  | Funksjon | Svarer |
  | --- | --- |
  | `kan_se_forslag(forslag, bruker)` | «Hvem ser et forslag»: forslagsstilleren som kan lese ressursen, eller en som kan behandle forslag til den |
  | `forslagsovergang(forslag, fra, til, art, tekst, data)` | Låser raden, `PT404` når den ikke finnes, `PT409` når statusen ikke er i `fra`, setter `til` (tom: bare hendelsen) og `oppdatert_kl`, og skriver hendelsen med den innloggede. Rettighetene kontrolleres av den som kaller |
  | `forslagskonflikt(forslag, med_utkast)` | `konflikt` i `les_forslag`: `grunnrevisjon`, `publisert_revisjon`, `endret_siden`, `sideversjon`, `publisert_sideversjon`, `side_endret_siden` og, med `med_utkast`, `utkast_endret` |
  | `apne_forslagsstatuser()` | `ny`, `under_behandling`, `venter_pa_forslagsstiller` |
  | `eget_forslag(forslag)` | Forslaget når den innloggede kan se det og har sendt det; ellers `PT404` eller `42501` |

- `trekk_forslag` og `svar_pa_forslag` går gjennom overgangen. Et svar når
  forslaget venter på forslagsstilleren, er en `presisering` og sender det
  tilbake til `under_behandling`; ellers, mens det er åpent, en `kommentar`
  uten statusendring.
- `les_forslag` gir forslaget med `ressurs` (`intern.ressursbeskrivelse`),
  `element` (`id`, `type`), kildene (med `referansetittel`), personene som
  `{er_meg, navn}` (navnet bare når profilen er synlig for den som leser,
  etter P2c), `vedtak`, `innarbeidet`, `hendelser`, `er_mitt`,
  `kan_behandle`, `kan_trekke`, `kan_svare` og `konflikt` (utkastet bare for
  den som kan behandle). `les_mine_forslag` gir de egne med `ressurs`,
  `sted`, `sammendrag` (de første 280 tegnene), tidene og `venter_pa_meg`.
- Varslene lager tråd C fra hendelsene; B1 lager ingen.

## Nasjonale redaktører (B2)

Tildeling av nasjonalt redaktøransvar bygges ferdig, men er avslått i
databasen (`intern.nasjonale_redaktorer_aktivert()` svarer nei).

**Peder sa ja 16.11.2026** (beslutningskort i P5-tråden): systemarkitektene
skal kunne utnevne nasjonale redaktører for fagsidene, **når OUSFAR Fag har
avklart** koblingen til kurateringen i
[#417](https://github.com/peohol/ousfar/issues/417). Aktiveringen er en egen,
liten migrasjon som henviser til ja-et og til svaret i #417, og lages først
når Fag har svart. Til
da behandler systemarkitektene forslagene til fagsidene, som er ansvarskøen
for felles innhold. Lokale redaktører krever ikke B2.

## Grensen mot OUSFAR Fag (P5d)

Dev eier funksjonen, tilgangene og brukerflaten. Fag eier de faglige
godkjenningsreglene, kurateringen og blindkontrollen. Forslag til felles
fagsider kan sendes og behandles, men hvordan et godkjent forslag går inn i
kurateringen (i en kurateringsgren hos Kuratoren, eller direkte i utkastet)
og hva en nasjonal redaktør får gjøre med fagsidenes utkast, avklares av Fag i
[#417](https://github.com/peohol/ousfar/issues/417) (`ansvar:fag`). Til det er avklart, arbeides forslag til
fagsidene inn av systemarkitektene etter dagens regler, og Dev endrer ingen
fagprotokoll eller faginnhold.

## Arbeidsdelingen

| Tråd | Leverer | Avhenger av | Filer bare den endrer |
| --- | --- | --- | --- |
| **P5.0** (denne) | Delplanen og grunnmuren | — | Kontrakten i dette dokumentet, grunnmursmigrasjonen |
| **A** Redaktøransvar | `redaktoransvar`, tildelingene, redaktørene i persongalleriet (`redaktorRessursA`: ett regelsett i A, `redaktorFortolkningA`, `redaktorNasjonal`), endringsretten utvidet (lese/endre utkast, ikke publisere), B2-bryteren, `mine_rettigheter`, adminpanelet «Redaktører» og visningen av redaktørene | Grunnmuren | `src/auth/rettigheter.tsx`, `src/components/konto/Adminmeny.tsx`, de nye panelene, redaktørene i persongalleriet (`src/__tests__/hjelp/persongalleri.ts`), migrasjonene som endrer `intern.kan_endre_objekt`, `intern.har_endringsrett_noe`, `public.kan_se_utkast`, reglene for utkast og `public.publiser_utkast` |
| **B** Foreslå endring | `endringsforslag` og tidslinjen, forslagsstillerens funksjoner, skjemaet, knappene på fagsiden og i fortolkningen, `#/forslag` med «Mine forslag» | Grunnmuren | `src/domain/rute.ts` (ruten), `src/components/forslag/` (oppretter), knappene i `src/components/stoffside/` og visningen av reglene |
| **C** Redaktørens arbeidsflyt | Køen, behandlingen, konfliktvisningen, innarbeidingen, varslene | Grunnmuren og Bs tabeller; As redaktører gjennom `ressursens_redaktorer` | `src/varsler/modell.ts`, varselmigrasjonen, behandlerdelen i `src/components/forslag/` |
| **D** Brukervennlighet og testing | Testplanen, persongalleriet med redaktørene, de negative testene på tvers, samtidighet, tastatur, mobil og at klinisk output er uendret | Testplanen alene; resten på integrert kode | `docs/p5-testplan.md` og egne testfiler; bruker redaktørene A legger i persongalleriet |

**Regler for trådene:**

1. Hver tråd har egen gren og egne, små PR-er. En PR som bygger på en annen
   som ikke er slått sammen, sier det under «Avhengigheter».
2. Migrasjonene får tidspunktet i UTC når de skrives og må være nyere enn
   alle på `main` og i PR-ene de bygger på.
3. Felles lister som bare vokser (`ressurskatalog.ts`,
   `funksjonskontroller.ts`, `REKKEVIDDEHJELPERE`, `tilgangsmatrise.test.ts`)
   kan alle legge til i; en flettekonflikt der løses ved å beholde begge.
4. Ingen tråd lager en egen variant av grunnmurens funksjoner eller en egen
   tabell for det en annen tråd eier.
5. Hver PR har én føring i endringsloggen (`docs/endringslogg.md`),
   etiketten `ansvar:dev`, tittelen «Til ChatGPT-kontroll – ikke merge: …»,
   HEAD-SHA og kjørte kontroller.

## Tester

Felles krav for hver PR: `npm test` og `npm run build`, negative tester for
hver ny inngang (A mot B og B mot A, fremmed ID, uten aktivt medlemskap, med
gyldig token etter avsluttet medlemskap), samtidighet der to kan endre det
samme, og at klinisk output er uendret (`fortolkningUendret.test.ts` og
fasitene i P0 §6.4). Nye flater prøves med tastatur og på smal skjerm i det
lokale testmiljøet (`docs/qa-testmiljo.md`), aldri mot produksjonen.

## Leveransene

Fylles ut av trådene.

| Del | PR | Status |
| --- | --- | --- |
| P5.0 delplan og grunnmur | [#418](https://github.com/peohol/ousfar/pull/418) | Til kontroll |
| A Redaktøransvar | — | — |
| B1 Forslagene i databasen | [#422](https://github.com/peohol/ousfar/pull/422) | Til kontroll |
| B2 Foreslå endring i appen | — | Under arbeid |
| C Redaktørens arbeidsflyt | — | — |
| D Brukervennlighet og testing | — | — |
