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
import { flytoppsett, SAMLET, standardId } from './flyt'
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

function regelavsnitt(r: Regel): string[] {
  const kontrollert = katalogGjelder(r)
  const katalog = flytoppsett(r, {
    kontrollerte: [{ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogavtrykk(r), dato: '', av: '', merknad: '' }],
    beslutninger: BESLUTNINGER,
  })
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
    return `| ${TYPENAVN[type]} \`${x.id}\` | ${celle(x.tekst)} | ${celle(ny ?? (o ? '' : `Regelens tekst (\`${standardId(type, x.id)}\`)`))} | ${kategori} | ${celle(svar)} | ${celle(avb)} | ${ukjent} | ${celle(a?.forklaring ?? '')} |`
  })
  return [
    `### ${r.tittel} (\`${r.id}\` v${r.versjon})`,
    '',
    `Fingeravtrykk \`${fingeravtrykk(r)}\` · katalogavtrykk \`${katalogavtrykk(r)}\` · ${kontrollert ? 'katalogen er kontrollert og brukes' : 'ikke kontrollert ennå: appen bruker regelens egne tekster (S5b)'}.`,
    '',
    ...(rader.length === 0
      ? ['Regelen har ingen spørsmål, unntak eller bekreftelser.']
      : [
          '| Betingelse | Regelens tekst | Ny tekst i flyten | Kategori | Svar | Avbildning til motoren | «Ukjent» / ubesvart gir | Forklaring ved stopp |',
          '| --- | --- | --- | --- | --- | --- | --- | --- |',
          ...rader,
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
    `Generert fra \`src/verktoy/flyt/sporsmal.ts\` (\`npx vite-node scripts/verktoy-sporsmalskatalog.ts\`); rediger katalogen, ikke denne filen. Planen: \`docs/verktøy-brukervennlighet-2026-11.md\` §4 og S4–S6, S5b.`,
    '',
    '**Hva som skal kontrolleres.** For hver betingelse i hver klinisk godkjent regel: at den nye teksten betyr det samme som regelens tekst, at kategorien er riktig, og at avbildningen gir motoren nøyaktig det svaret regelen forventer. Katalogen endrer ingen regel og intet fingeravtrykk. Den brukes for en regelversjon først når katalogavtrykket er ført som kontrollert i `src/verktoy/flyt/katalogkontroll.ts`; til da viser appen regelens egne tekster.',
    '',
    `**Beslutninger (§10):** ${besl}. Til B1 og B2 er akseptert, bekreftes forbehold og avledede forutsetninger samlet til slutt; «Ingen av disse» (B5) tilbys ikke.`,
    '',
    '**Faste regler for alle rader.** «Ukjent», ubesvart og «Ikke ennå» gir aldri et trygt svar: betingelsen sendes ubesvart, og motoren lager ingen plan (S4). Et spørsmål som er skjult, sendes ikke til motoren. Når et svar stopper planen, vises ikke spørsmålene i de senere gruppene. Rekkefølgen er stoppforhold → forhold som endrer planen → kliniske vurderinger.',
    '',
    '## Merknader til kontrollen',
    '',
    '- **Alder** spørres én gang som «Under 18 år / 18–64 år / 65 år eller eldre / Ukjent». «Under 18 år» avgjør unntaket `under_18`. Vortioksetin og byttene til aripiprazol bruker «65 år eller eldre». Escitalopram og risperidon til Xeplion bruker «over 65 år»: ved «65 år eller eldre» spørres «Er pasienten over 65 år?», med hjelpeteksten at en pasient på 65 ikke er over 65 (grenseverdiene 64/65/66 er testet). **Mulig konflikt:** kontrollørens godkjenning av escitalopram v13 beskriver omfanget som «voksne under 65 år», mens regelens spørsmål «over 65 år» med nei gir en plan også for en pasient på nøyaktig 65 (slik dagens skjema også gjør). Flyten følger regelen; ChatGPT bes avklare hva som er ment.',
    '- **Sammensatte unntak** er delt opp der delene er ulike forhold: `ustabil_dose_eller_bytte` (bytte / ustabil dose) `valproat_eller_induserende` (valproat / induserende legemiddel) og `cyp_aripiprazol` (sterk hemmer / sterk induktor). Unntaket gjelder når ett av delspørsmålene er ja, og er ukjent når ett er ukjent og ingen er ja. `akutt_situasjon`, `qt_forlengelse`, `tilbakefall_innlagt` og `risperidon_interaksjon` er ikke delt, fordi delene besvares samlet. Bekreftelsen `siste_trinn` i byttene til aripiprazol er delt i vurderingen av siste trinn og informasjonen til pasienten; den gis bare når begge er «Ja».',
    '- **Bekreftelser om pasienten** (indikasjon for depot og bytte, tålt risperidon, peroral formulering, valproat og litium fortsetter, PPP-vilkårene) er stilt som spørsmål med «Ja / Nei / Ukjent»; bare «Ja» bekrefter. **Kliniske vurderinger** (organfunksjon og interaksjoner, informasjon, måldose, effekt av risperidon, spesialistvurdering, siste trinn) har «Ja / Ikke ennå»; bare «Ja» bekrefter.',
    '- **Stoppende svar for spørsmål** utledes av regelens kliniske omfang: et svar som ikke finnes i noe kontrollert tilfelle, stopper med forklaring (for eksempel nedsatt leverfunksjon for escitalopram). Svar som bare stopper for én legemiddelform, avgjøres av forhåndskontrollen.',
    '- **Forklaringer ved stopp** gjengir regelens egen begrunnelse der den har én, og ellers at verktøyet ikke lager en plan og behandlingen må planlegges individuelt.',
    '',
    '## Regler',
    '',
    ...godkjente.flatMap(regelavsnitt),
    '## Kontrollerte avtrykk',
    '',
    KONTROLLERTE_KATALOGER.length === 0
      ? 'Ingen ennå.'
      : [
          '| Regel | Versjon | Katalogavtrykk | Dato | Av |',
          '| --- | --- | --- | --- | --- |',
          ...KONTROLLERTE_KATALOGER.map((k) => `| \`${k.regel}\` | ${k.regelversjon} | \`${k.katalogavtrykk}\` | ${k.dato} | ${k.av} |`),
        ].join('\n'),
    '',
  ].join('\n')
}
