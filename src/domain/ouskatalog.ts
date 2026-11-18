import koblingsdata from '../data/analyttkoblinger.json'
import { antihypertensivdatasett, dataset } from './analytes'
import { byggKatalog, type Analysemetode, type Katalogdata, type Katalogoppforing } from './analyttkatalog'
import { displayName } from './names'
import type { RusModul } from './rus'
import type { Analyte } from '../types'

/**
 * Analyttkatalogen til OUS Klinisk farmakologi slik den sto i klientpakken
 * før den ble flyttet til databasen (P4c, docs/fagmiljoer.md, «Analyttkatalogen
 * per fagmiljø»): kildedataene katalogen i databasen ble importert fra.
 *
 * Bare for skriptene og testene. Appen leser katalogen fra databasen, per
 * fagmiljø, og byggekontrollen (`scripts/kontroller-vegg.mjs`) stopper en
 * klientpakke som drar inn denne modulen eller datafilene den bygger på.
 * Katalogen i databasen endres med en ny migrasjon, ikke her: importen
 * (`scripts/analyttkatalog-import.ts`) og testene holder de to like.
 *
 * Kildene:
 *
 * - konsentrasjonsanalyttene i `src/data/analytter.json` og
 *   `src/data/antihypertensiver.json` (`npm run data`), i den rekkefølgen;
 * - THC-syre, rusmodulene og EtG og EtS, som sto i `src/domain/thc.ts`,
 *   `rus.ts` og `etg.ts`, nedenfor uendret;
 * - analysemetodene, som sto i `src/domain/analysemetoder.ts`;
 * - koblingene fra kodene til stoffene, som sto i `src/data/stoffregister.json`
 *   og nå står i `src/data/analyttkoblinger.json`.
 *
 * Koblingene er bare grunnlaget for de kjørte migrasjonene; tabellen de ble
 * lagt i, er slettet (`20261118120000_koblingene_fjernet.sql`). Appen bruker
 * dem ikke: fortolkningen og fagsidene er adskilte domener (`docs/domener.md`), og fortolkningen har sitt eget
 * referanseområde per kode i katalogen. Det er ikke med her: det ble kopiert
 * i databasen fra fagsidene slik de var publisert
 * (`*_fortolkning_skilt_fra_fagsidene.sql`), og står ikke i repoet.
 */

/* --- Analysemetodene ----------------------------------------------------- */

/**
 * Metodene i den rekkefølgen filterraden viser dem. Beskrivelsene er metodenes
 * egne navn i labsystemet. Rekkefølgen bestemmer også fargen og hurtigtasten.
 */
export const ANALYSEMETODER: Analysemetode[] = [
  { kode: 'SPFA', beskrivelse: 'Antidepressiver og antipsykotika i serum' },
  { kode: 'SRUS', beskrivelse: 'Stoffer med ruspotensial i serum' },
  { kode: 'UCAK', beskrivelse: 'THC-syre i urin' },
  { kode: 'UETGHB', beskrivelse: 'Etanolmetabolitter i urin' },
  { kode: 'AHT', beskrivelse: 'Antihypertensiver' },
]

/* --- THC-syre ------------------------------------------------------------- */

export const THC_KODE = 'IRCAK'
export const THC_ANALYSEMETODE = 'UCAK'

const THC_OPPFORING: Analyte = {
  kode: THC_KODE,
  navn: 'THC-syre',
  visningsnavn: 'THC-syre i urin',
  komponenter: [],
  gruppe: 'Rusmiddelanalyse',
  analysemetode: THC_ANALYSEMETODE,
  kategori: '',
  enhet: '',
  maleomrade: { tekst: '', deler: [] },
  aliaser: ['THC-COOH', 'cannabis'],
}

/* --- Rusmodulene ---------------------------------------------------------- */

export const RUS_ANALYSEMETODE = 'SRUS'

const BENZO = 'Benzodiazepiner og Z-hypnotika'
const OPIOIDER = 'Opioider'
const STIMULERENDE = 'Sentralstimulerende'

/**
 * En modul. Analyttene står som [kode, navn]; en modul for én analytt heter
 * det samme som analytten. Kodene er alltid søkeord.
 */
function modul(
  id: string,
  navn: string,
  gruppe: string,
  analytter: [string, string][],
  { aliaser = [], kategori = gruppe }: { aliaser?: string[]; kategori?: string } = {},
): RusModul {
  return {
    id,
    gruppe,
    kategori,
    navn,
    analytter: analytter.map(([kode, analyttnavn]) => ({ kode, navn: analyttnavn })),
    aliaser: [...analytter.map(([kode]) => kode), ...aliaser],
  }
}

/** En modul for én analytt. */
function enkelt(id: string, kode: string, navn: string, gruppe: string, aliaser: string[] = [], kategori = gruppe) {
  return modul(id, navn, gruppe, [[kode, navn]], { aliaser, kategori })
}

export const RUS_MODULER: RusModul[] = [
  enkelt('alprazolam', 'APR', 'Alprazolam', BENZO),
  modul(
    'diazepamgruppen',
    'Diazepam + N-desmetyldiazepam + oksazepam',
    BENZO,
    [
      ['DIAZ', 'Diazepam'],
      ['DMI', 'N-desmetyldiazepam'],
      ['OXA', 'Oksazepam'],
    ],
    { aliaser: ['desmetyldiazepam'] },
  ),
  enkelt('klonazepam', 'CZP', 'Klonazepam', BENZO),
  enkelt('nitrazepam', 'NIT', 'Nitrazepam', BENZO),
  enkelt('zolpidem', 'ZOLP', 'Zolpidem', BENZO),
  enkelt('zopiklon', 'ZOPI', 'Zopiklon', BENZO),
  enkelt('thc', 'THC', 'THC', 'Cannabis', ['cannabis'], 'Cannabinoider'),
  enkelt('buprenorfin', 'BUP', 'Buprenorfin', OPIOIDER),
  enkelt('fentanyl', 'FYL', 'Fentanyl', OPIOIDER),
  modul('kodeingruppen', 'Kodein + morfin', OPIOIDER, [
    ['KOD', 'Kodein'],
    ['MOR', 'Morfin'],
  ]),
  enkelt('metadon', 'MDO', 'Metadon', OPIOIDER),
  enkelt('oksykodon', 'OKSY', 'Oksykodon', OPIOIDER),
  enkelt('tapentadol', 'TAP', 'Tapentadol', OPIOIDER),
  modul(
    'tramadolgruppen',
    'Tramadol + O-desmetyltramadol',
    OPIOIDER,
    [
      ['TRAM', 'Tramadol'],
      ['OTRAM', 'O-desmetyltramadol'],
    ],
    { aliaser: ['desmetyltramadol'] },
  ),
  modul('amfetamingruppen', 'Amfetamin + metamfetamin', STIMULERENDE, [
    ['AMF1', 'Amfetamin'],
    ['MAF1', 'Metamfetamin'],
  ]),
  enkelt('benzoylekgonin', 'BEZ1', 'Benzoylekgonin', STIMULERENDE, ['kokain']),
  enkelt('mdma', 'ECS1', 'MDMA', STIMULERENDE, ['ecstasy']),
]

/* --- EtG og EtS ----------------------------------------------------------- */

export const ETG_KODE = 'UETGS'
export const ETS_KODE = 'UETS'
export const ETG_ANALYSEMETODE = 'UETGHB'
/** Modulnøkkelen, den samme som scenarioregelsettet EtG og EtS fortolkes med. */
export const ETG_MODUL = 'etg'

const ETG_ANALYTTER = [
  { kode: ETG_KODE, navn: 'EtG' },
  { kode: ETS_KODE, navn: 'EtS' },
]

const ETG_OPPFORING: Analyte = {
  kode: `${ETG_KODE} · ${ETS_KODE}`,
  navn: 'EtG + EtS',
  visningsnavn: 'EtG + EtS i urin',
  komponenter: ['Etylglukuronid', 'Etylsulfat'],
  gruppe: 'Rusmiddelanalyse',
  analysemetode: ETG_ANALYSEMETODE,
  kategori: '',
  enhet: '',
  maleomrade: { tekst: '', deler: [] },
  aliaser: [ETG_KODE, ETS_KODE, 'EtG', 'EtS', 'etanol', 'alkohol'],
}

/* --- Katalogen ----------------------------------------------------------- */

function oppforing(
  a: Analyte,
  type: Katalogoppforing['type'],
  nokkel: string,
  koder: { kode: string; navn: string }[],
  undertittel: string | null = null,
): Katalogoppforing {
  return {
    nokkel,
    type,
    navn: a.navn,
    visningsnavn: a.visningsnavn,
    undertittel,
    komponenter: [...a.komponenter],
    gruppe: a.gruppe,
    analysemetode: a.analysemetode,
    kategori: a.kategori,
    enhet: a.enhet,
    maleomrade: a.maleomrade,
    antihypertensiv: a.antihypertensiv ?? null,
    aliaser: [...a.aliaser],
    koder: koder.map(({ kode, navn }) => ({ kode, navn, referanseomrade: null })),
  }
}

/** Rusmodulen som søkeoppføring, slik `src/domain/rus.ts` laget den. */
function rusoppforing(m: RusModul): Katalogoppforing {
  const a: Analyte = {
    kode: m.analytter.map((x) => x.kode).join(' · '),
    navn: m.navn,
    visningsnavn: m.navn,
    komponenter: m.analytter.map((x) => x.navn),
    gruppe: m.gruppe,
    analysemetode: RUS_ANALYSEMETODE,
    kategori: m.kategori,
    enhet: '',
    maleomrade: { tekst: '', deler: [] },
    aliaser: m.aliaser,
  }
  return oppforing(a, 'scenario', m.id, m.analytter)
}

/** En kobling fra en analyttkode til et stoff, slik den ble importert. Bare for de kjørte migrasjonene. */
export interface Analyttkoblingsdata {
  kode: string
  stoff: string
  relasjon: string
  primar: boolean
  merknad: string | null
}

/** Koblingene fra analyttkodene til stoffene, i datafilens rekkefølge, slik de ble importert. */
export const OUS_ANALYTTKOBLINGER: Analyttkoblingsdata[] = (
  koblingsdata as { analyttkoblinger: { kode: string; stoff: string; relasjon: string; primar?: boolean; merknad?: string | null }[] }
).analyttkoblinger.map((k) => ({
  kode: k.kode,
  stoff: k.stoff,
  relasjon: k.relasjon,
  primar: k.primar ?? true,
  merknad: k.merknad ?? null,
}))

/**
 * Katalogen til OUS Klinisk farmakologi i formen databasen gir den, med
 * oppføringene i den rekkefølgen søket hadde dem: konsentrasjonsanalyttene,
 * THC-syre, rusmodulene og EtG og EtS.
 */
export const OUS_KATALOGDATA: Katalogdata = {
  // Fagmiljøet settes av databasen, etter arbeidskonteksten til den som leser.
  fagmiljo: null,
  metoder: ANALYSEMETODER,
  oppforinger: [
    ...[...dataset.analytter, ...antihypertensivdatasett.analytter].map((a) =>
      oppforing(a, 'konsentrasjon', a.kode, [{ kode: a.kode, navn: displayName(a) }]),
    ),
    oppforing(THC_OPPFORING, 'thc', 'thc-syre', [{ kode: THC_KODE, navn: THC_OPPFORING.navn }]),
    ...RUS_MODULER.map(rusoppforing),
    oppforing(ETG_OPPFORING, 'etg', ETG_MODUL, ETG_ANALYTTER, 'Etylglukuronid og etylsulfat i urin'),
  ],
}

/** Katalogen bygd av kildedataene, som appen ville bygd den av databasens svar. */
export const OUS_KATALOG = byggKatalog(OUS_KATALOGDATA)

/** Alt OUS Klinisk farmakologi kan fortolke, som søkeoppføringer. */
export const FORTOLKNINGSOPPFORINGER: readonly Analyte[] = OUS_KATALOG.fortolkninger

/** Analyttene katalogen har, én per kode. */
export const ANALYTTKATALOG = OUS_KATALOG

const etterNokkel = (nokkel: string): Analyte => {
  const f = OUS_KATALOG.fortolkninger.find((a) => (a.modul ? a.modul.id : a.kode) === nokkel)
  if (!f) throw new Error(`Fant ikke ${nokkel} i katalogen.`)
  return f
}

/** Søkeoppføringen for THC-syre. */
export const THC_ANALYTT = etterNokkel('thc-syre')
/** Søkeoppføringen for EtG og EtS. */
export const ETG_ANALYTT = etterNokkel(ETG_MODUL)
/** Rusmodulene som søkeoppføringer. */
export const RUS_ANALYTTER: readonly Analyte[] = RUS_MODULER.map((m) => etterNokkel(m.id))
