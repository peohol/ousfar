/**
 * Kontrollgrunnlaget for språket i flyten (§4.4 i
 * `docs/verktøy-brukervennlighet-2026-11.md`): `docs/verktøy-sporsmalskatalog.md`,
 * generert fra katalogen, med én rad per betingelse i hver godkjent regel.
 * ChatGPT kontrollerer tabellen; et kontrollert avtrykk føres så i
 * `katalogkontroll.ts`. Testen `verktoyflyt.test.ts` sier fra når filen ikke
 * stemmer med koden.
 *
 *   npx vite-node scripts/verktoy-sporsmalskatalog.ts
 */
import { fingeravtrykk, godkjenningsfeil } from '../regler/godkjenning'
import type { Regel, Regelsett } from '../regler/modell'
import { REGELSETT } from '../tilgjengelighet'
import { BESLUTNINGER } from './beslutninger'
import { flytoppsett, SAMLET, standardId, vurderFlyt } from './flyt'
import { katalogavtrykk, katalogGjelder, KONTROLLERTE_KATALOGER, betingelserFor } from './katalogkontroll'
import { jaVed, KATALOGSPORSMAL, neiVed, SVARSETT, type Betingelsestype, type Svarkilde } from './sporsmal'

export const KATALOGTABELLFIL = 'docs/verktøy-sporsmalskatalog.md'

const TYPENAVN: Record<Betingelsestype, string> = { sporsmal: 'Spørsmål', unntak: 'Unntak', bekreftelse: 'Bekreftelse' }
const FELT: Record<Betingelsestype, string> = { sporsmal: 'svar', unntak: 'pasientforhold', bekreftelse: 'bekreftet' }
const KATEGORINAVN: Record<string, string> = {
  sikkerhetsopplysning: 'Sikkerhetsopplysning',
  avledet: 'Avledet',
  forbehold: 'Forbehold',
  klinisk_vurdering: 'Klinisk vurdering',
  uklassifisert: 'Uklassifisert (regelens tekst)',
}

const celle = (t: string | undefined) => (t ?? '').replaceAll('|', '\\|').replaceAll('\n', ' ')
const sporsmalet = (id: string) => KATALOGSPORSMAL.find((s) => s.id === id)
const etikett = (sporsmal: string, verdi: string) =>
  sporsmal === SAMLET ? 'Bekreftet' : ((SVARSETT[sporsmalet(sporsmal)?.svar ?? 'ja_nei_ukjent'] as readonly { verdi: string; tekst: string }[]).find((a) => a.verdi === verdi)?.tekst ?? verdi)
const svarliste = (sporsmal: string, verdier: readonly string[]) => verdier.map((v) => `«${etikett(sporsmal, v)}»`).join(' / ')

/** Hvordan svarene avgjør betingelsen, i klartekst: «`pasientforhold.under_18` fra `alder` (ja ved «Under 18 år»; nei ved …)». */
function avbildningstekst(type: Betingelsestype, id: string, fra: readonly Svarkilde[], kombinasjon: 'en' | 'alle'): string {
  const kilde = (k: Svarkilde) => {
    const deler = [jaVed(k).length > 0 && `ja ved ${svarliste(k.sporsmal, jaVed(k))}`, neiVed(k).length > 0 && `nei ved ${svarliste(k.sporsmal, neiVed(k))}`].filter(Boolean)
    return `\`${k.sporsmal}\` (${deler.join('; ')})`
  }
  const felt = type === 'bekreftelse' ? `\`bekreftet\` får \`${id}\`` : `\`${FELT[type]}.${id}\``
  const regel = fra.length < 2 ? '' : kombinasjon === 'en' ? '; ja når ett gir ja, nei når ingen gir ja og ingen er ubesvart' : '; ja når alle gir ja, nei når ett gir nei'
  return `${felt} fra ${fra.map(kilde).join(' og ')}${regel}${type === 'bekreftelse' ? '; bare ja bekrefter' : ''}`
}

const ukjentTekst = (type: Betingelsestype) => (type === 'bekreftelse' ? 'Ikke bekreftet: ingen plan.' : 'Ubesvart for motoren: ingen plan, «Må avklares».')

/** Forklaringene ved stopp for en betingelse: betingelsens egen, og hver svarkildes med spørsmålet den gjelder. */
const forklaringstekst = (forklaring: string | undefined, fra: readonly Svarkilde[] | undefined) =>
  [forklaring, ...(fra ?? []).filter((k) => k.forklaring).map((k) => `Ved \`${k.sporsmal}\`: ${k.forklaring}`)].filter(Boolean).join(' ')

/**
 * Hvert svar som stopper planen, med forklaringen klinikeren får, slik flyten
 * viser den når katalogen brukes: én rad per synlig spørsmål og stoppende svar.
 */
function stopptabell(r: Regel, g: Parameters<typeof vurderFlyt>[2]): string[] {
  const forste = vurderFlyt(r, {}, g)
  const rader = forste.sporsmal.flatMap((s) =>
    (s.stopperVed ?? []).map((svar) => {
      const tekst = vurderFlyt(r, { [s.id]: svar }, g).sporsmal.find((x) => x.id === s.id)?.forklaring ?? ''
      return `| \`${s.id}\` ${celle(s.tekst)} | «${etikett(s.id, svar)}» | ${celle(tekst)} |`
    }),
  )
  return rader.length === 0 ? [] : ['', '**Svar som stopper planen** (med katalogen):', '', '| Spørsmål | Svar | Det klinikeren får vite |', '| --- | --- | --- |', ...rader]
}

function regelavsnitt(r: Regel): string[] {
  const kontrollert = katalogGjelder(r)
  const medKatalog = {
    kontrollerte: [{ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogavtrykk(r), dato: '', av: '', merknad: '' }],
    beslutninger: BESLUTNINGER,
  }
  const katalog = flytoppsett(r, medKatalog)
  const oppforinger = betingelserFor(r)
  const alle: [Betingelsestype, { id: string; tekst: string }][] = [
    ...r.unntak.map((x): [Betingelsestype, typeof x] => ['unntak', x]),
    ...(r.sporsmal ?? []).map((x): [Betingelsestype, typeof x] => ['sporsmal', x]),
    ...r.bekreftelser.map((x): [Betingelsestype, typeof x] => ['bekreftelse', x]),
  ]
  const rader = alle.map(([type, x]) => {
    const o = oppforinger.find((b) => b.type === type && b.id === x.id)
    const a = katalog.avbildninger.find((y) => y.type === type && y.id === x.id)
    const ny = a?.fra
      .map((k) => katalog.sporsmal.find((s) => s.id === k.sporsmal))
      .filter((s) => !!s)
      .map((s) => (s!.id === SAMLET ? 'Samlet avkrysning til slutt: «Bekreft forutsetningene for planen»' : `${s!.tekst}${s!.hjelp ? ` _(${s!.hjelp})_` : ''}`))
      .join(' + ')
    const kategori = KATEGORINAVN[o?.kategori ?? 'uklassifisert']
    const avb =
      o?.kategori === 'forbehold' && !BESLUTNINGER.B1
        ? `Til B1: samlet avkrysning. Med B1: står i planen og kopien, \`bekreftet\` settes.`
        : a
          ? avbildningstekst(type, x.id, a.fra, a.kombinasjon)
          : ''
    const svar = a
      ? [
          ...new Set(
            a.fra.map((k) =>
              k.sporsmal === SAMLET
                ? '«Bekreftet»'
                : svarliste(
                    k.sporsmal,
                    (SVARSETT[sporsmalet(k.sporsmal)?.svar ?? 'ja_nei_ukjent'] as readonly { verdi: string }[]).map((v) => v.verdi),
                  ),
            ),
          ),
        ].join('; ')
      : ''
    const ukjent = o?.kategori === 'forbehold' ? 'Ikke relevant (ikke et spørsmål).' : ukjentTekst(type)
    return `| ${TYPENAVN[type]} \`${x.id}\` | ${celle(x.tekst)} | ${celle(ny ?? (o ? '' : `Regelens tekst (\`${standardId(type, x.id)}\`)`))} | ${kategori} | ${celle(svar)} | ${celle(avb)} | ${ukjent} | ${celle(forklaringstekst(a?.forklaring, a?.fra))} |`
  })
  return [
    `### ${r.tittel} (\`${r.id}\` v${r.versjon})`,
    '',
    `Fingeravtrykk \`${fingeravtrykk(r)}\` · katalogavtrykk \`${katalogavtrykk(r)}\` · ${kontrollert ? 'katalogen er kontrollert og brukes' : 'ikke kontrollert ennå: appen bruker regelens egne tekster (S5b)'}.`,
    '',
    ...(rader.length === 0
      ? ['Regelen har ingen spørsmål, unntak eller bekreftelser.']
      : [
          '| Betingelse | Regelens tekst | Ny tekst i flyten | Kategori | Svar | Avbildning til motoren | «Vet ikke» / ubesvart gir | Forklaring ved stopp |',
          '| --- | --- | --- | --- | --- | --- | --- | --- |',
          ...rader,
          ...stopptabell(r, medKatalog),
        ]),
    '',
  ]
}

/** Tabellen for de godkjente reglene i regelsettet. */
export function lagKatalogtabell(regelsett: Regelsett = REGELSETT): string {
  const godkjente = regelsett.regler.filter((r) => godkjenningsfeil(r).length === 0)
  const besl = Object.entries(BESLUTNINGER)
    .map(([k, v]) => `${k}: ${v ? 'akseptert' : 'ikke akseptert ennå'}`)
    .join(' · ')
  return [
    '# Spørsmålskatalog for OUSFAR Verktøy (til ChatGPT-kontroll)',
    '',
    `Generert fra \`src/verktoy/flyt/sporsmal.ts\` (\`npx vite-node scripts/verktoy-sporsmalskatalog.ts\`); rediger katalogen, ikke denne filen. Planen: \`docs/verktøy-brukervennlighet-2026-11.md\` §4 og S4–S6, S5b, og P2a i \`docs/verktøy-p0-rapport-2026-11.md\` §8.`,
    '',
    '**Hva som skal kontrolleres.** For hver betingelse i hver klinisk godkjent regel: at den nye teksten betyr det samme som regelens tekst, at kategorien er riktig, og at avbildningen gir motoren nøyaktig det svaret regelen forventer. Katalogen endrer ingen regel og intet fingeravtrykk. Den brukes for en regelversjon først når katalogavtrykket er ført som kontrollert i `src/verktoy/flyt/katalogkontroll.ts`; til da viser appen regelens egne tekster.',
    '',
    `**Beslutninger (§10):** ${besl}. Avgjort av ChatGPT 04.11 med avgrensninger: forbehold (B1) er bare rent informative; avledet (B2) er bare det som følger logisk av et eksakt, eksplisitt valg, og fravær av kontraindikasjoner eller vurdert toleranse avledes aldri; «Ingen av disse» (B5) er et aktivt valg som aldri er forhåndsutfylt, bare besvarer ubesvarte stoppforhold med «Nei» og aldri endrer «Ja» eller «Vet ikke».`,
    '',
    '**Reservevisningen (S5).** Til katalogavtrykket for en regelversjon er kontrollert, viser appen hver betingelse med regelens egen, fullstendige tekst og opprinnelige svarlogikk: spørsmål med «Ja / Nei», unntak som regelens utsagn med «Stemmer / Stemmer ikke» og bekreftelser som avkrysning. «Stemmer» på et unntak gir «Verktøyet har ingen godkjent plan når dette stemmer for pasienten, og behandlingen må planlegges individuelt.» Den gir de samme motorinndataene som før (testet), og blir aldri et generisk spørsmål.',
    '',
    '**Faste regler for alle rader.** «Vet ikke», ubesvart og «Ikke ennå» gir aldri et trygt svar: betingelsen sendes ubesvart, og motoren lager ingen plan (S4). «Vet ikke» har verdien `ukjent`, som før; bare knappeteksten er ny. Et spørsmål som er skjult, sendes ikke til motoren. Når et svar stopper planen, vises ikke spørsmålene i de senere gruppene. Rekkefølgen er stoppforhold → forhold som endrer planen → kliniske vurderinger; innen stoppforholdene kommer først spørsmålene om planen gjelder pasienten, så forholdene som utelukker den.',
    '',
    '## Endringer i denne runden (P2a, 07.11.2026) – til ny semantisk kontroll',
    '',
    'Hele katalogen er endret, så alle katalogavtrykkene er nye og ingen er kontrollert. Ingen regel, dose, sperre eller godkjenning er endret, og intet regelfingeravtrykk. Det som må kontrolleres, er at hver endring under betyr nøyaktig det samme for motoren som før:',
    '',
    '- **«Vet ikke»** erstatter «Ukjent» på alle knapper (samme verdi). Reservevisningen bruker «Stemmer / Stemmer ikke» i stedet for «Gjelder / Gjelder ikke».',
    '- **Forklaring per svar.** En svarkilde kan ha sin egen forklaring, som går foran betingelsens. Hvert stoppende svar sier da hvilket forhold som stopper, hvorfor den godkjente planen ikke dekker det, og hva som må planlegges individuelt. Forklaringene skiller mellom kontraindikasjon (bare der regelen sier det) og manglende godkjent standardplan. Tabellen «Svar som stopper planen» under hver regel viser nøyaktig teksten klinikeren får. Feilen der «65 år eller eldre» ga forklaringen for «under 18 år», er rettet.',
    '- **Tidligere seponeringsvansker** spørres som «Har pasienten tidligere fått seponeringssymptomer eller opplevd mislykket nedtrapping eller seponering av …?». Ved «Ja»: «Verktøyet har foreløpig ingen godkjent standardplan ved tidligere seponeringsvansker.» Teksten om en «langsom variant», som ikke finnes, er fjernet. Sertralin → mirtazapin og «mange måneder» for sertralin har egne spørsmål som nevner sertralin.',
    '- **Delte spørsmål (`en`: unntaket gjelder når ett er «Ja»):** `ustabil_dose_eller_bytte` = bytte / ustabil dose / uregelmessig bruk; `qt_forlengelse` = kjent QT-forlengelse eller medfødt langt QT / annet QT-forlengende legemiddel.',
    '- **Delte bekreftelser (`alle`: bekreftet bare når alle gir «Ja»):** indikasjonen i byttene til aripiprazol = alder (voksen) + schizofreni + stabil + følges poliklinisk + årsak til bytte; indikasjonen i depotreglene = alder (voksen) + schizofreni + stabilisert på det perorale legemidlet; `spesialist_risiko` = spesialistvurdert + kan følges tett; `ppp_indikasjon` = annen behandling uten effekt eller ikke tolerert + spesialistvurdering; `fortsetter_valproat` = bruker valproat fast + skal ikke endres; `fortsetter_litium` = bruker litium fast + skal ikke endres + serumlitium følges; `serotonerg_sammedisinering` = øvrige legemidler kontrollert + bruker ikke andre serotonerge eller risikoøkende legemidler.',
    '- **Snudd retning** (`ja` ved «Nei», `nei` ved «Ja»), så «Ja» betyr et problem i stoppforholdene: «Skal valproat/litium endres eller seponeres i løpet av opptrappingen?», «Bruker pasienten andre serotonerge legemidler …?» og, i `tilbakefall_innlagt`, «Er pasienten stabil?».',
    '- **Konkrete svar i stedet for ja/nei der «Nei» stoppet:** «Hvordan følges pasienten?» (Poliklinisk / Innlagt / Annet / Vet ikke) avgjør både «følges poliklinisk» i indikasjonen og «innlagt» i `tilbakefall_innlagt`; «Hvorfor byttes …?» (Bivirkninger / Utilstrekkelig effekt / Annen grunn / Vet ikke) avgjør årsaken i indikasjonen.',
    '- **Avledet av et tidligere svar:** «voksen» i indikasjonene avgjøres av alderen (18–64 år og 65 år eller eldre er voksen, under 18 år er det ikke), så «Er pasienten voksen …?» spørres ikke lenger etter «Hvor gammel er pasienten?». Depotreglene og byttene til aripiprazol spør derfor om alderen.',
    '- **Kortere spørsmål med hjelpetekst:** «Følges pasienten opp ved vurderingspunktene i planen?» i byttene til sertralin har vurderingspunktene i hjelpeteksten. «Er pasienten over 65 år?» har hjelpeteksten «En pasient som er 65 år, svarer «Nei».».',
    '- **Ikke endret:** `akutt_situasjon` (bare ordlyd), `risperidon_interaksjon`, `seponeringsplager_*`, informasjonen og vurderingene i valproatreglene, siste trinn i byttene til aripiprazol og «peroral» i byttene til aripiprazol. «Peroral» kunne vært avledet av legemiddelformen i steg 2, men bare når formen er valgt av klinikeren og ikke av verktøyet (B4); det er ikke gjort.',
    '',
    '## Merknader til kontrollen',
    '',
    '- **Alder** spørres én gang som «Under 18 år / 18–64 år / 65 år eller eldre / Vet ikke». «Under 18 år» avgjør unntaket `under_18`. Vortioksetin, escitalopram v14 og byttene til aripiprazol bruker «65 år eller eldre». Risperidon til Xeplion og byttene til sertralin bruker «over 65 år»: «18–64 år» besvarer både «over 65 år» og «65 år eller eldre» med nei. «65 år eller eldre» avleder ikke «over 65 år»; da spørres «Er pasienten over 65 år?» (grenseverdiene 64/65/66 er testet). Escitalopram v13 er erstattet av v14 i appen.',
    '- **Bekreftelser om pasienten** er stilt som spørsmål med «Ja / Nei / Vet ikke» eller konkrete svar; bare svaret som oppfyller forutsetningen, bekrefter. **Kliniske vurderinger** har «Ja / Ikke ennå»; bare «Ja» bekrefter, og «Ikke ennå» stopper ikke, men gjenstår.',
    '- **Stoppende svar for spørsmål** utledes av regelens kliniske omfang: et svar som ikke finnes i noe kontrollert tilfelle, stopper med forklaring (for eksempel nedsatt leverfunksjon for escitalopram). Svar som bare stopper for én legemiddelform, avgjøres av forhåndskontrollen; forklaringen i katalogen brukes også da.',
    '',
    '## Regler',
    '',
    ...godkjente.flatMap(regelavsnitt),
    '## Kontrollerte avtrykk',
    '',
    KONTROLLERTE_KATALOGER.length === 0
      ? 'Ingen for den nåværende katalogen. Avtrykkene ChatGPT kontrollerte 04.11.2026 (de sju K3- og K4-reglene) gjaldt katalogen før P2a og er tatt ut.'
      : [
          '| Regel | Versjon | Katalogavtrykk | Dato | Av |',
          '| --- | --- | --- | --- | --- |',
          ...KONTROLLERTE_KATALOGER.map((k) => `| \`${k.regel}\` | ${k.regelversjon} | \`${k.katalogavtrykk}\` | ${k.dato} | ${k.av} |`),
        ].join('\n'),
    '',
  ].join('\n')
}
