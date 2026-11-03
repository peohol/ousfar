/**
 * Kontrollgrunnlaget for tilleggsreglene i K4 (`regler/tillegg.ts`,
 * `docs/verktøy-klinisk-leveranseplan-2026-11.md`): syntetiske kasus som går
 * den samme veien som verktøysiden (`kjorKasus`), med preparatene i det
 * lagrede FEST-uttrekket `src/data/verktoy/fest-tillegg.json`, og hele
 * planteksten slik kopien ville vist den.
 *
 * Reglene er ikke godkjent. For å vise kontrolløren hva verktøyet ville vist
 * om nøyaktig den versjonen ble godkjent, regnes planene på en kopi av regelen
 * med en simulert godkjenning bundet til versjonen og fingeravtrykket under
 * kontroll (`simulerGodkjenning`). Kopien lagres aldri og går aldri til
 * verktøysiden. Kasusene uten simulert godkjenning viser hva appen gir i dag.
 *
 * Kasusene er syntetiske: ingen pasientopplysninger, bare doser og svar valgt
 * for å prøve reglene, også ved grensene. Rapporten skrives med
 * `npm run verktoy:regler -- tilleggsgrunnlag`, og testene sier fra når den
 * ikke er oppdatert.
 */
import { KOMPLETT } from './planvisning'
import type { Festuttrekk } from './regler/aksepttest'
import { fingeravtrykk } from './regler/godkjenning'
import type { Regel } from './regler/modell'
import {
  avvikFra,
  bareFritak,
  kjorKasus,
  KATEGORIER,
  midlertidigUtgatt,
  type Kontrollregel,
  type Pilotkasus,
  type Pilotutfall,
  simulerGodkjenning,
  type Uttrekkene,
} from './regler/pilotmatrise'
import { liste, tabell } from './regler/rapport'
import { LITIUM_LAMOTRIGIN, TILLEGGSSETT, VALPROAT_LAMOTRIGIN } from './regler/tillegg'
import type { Verktoysperre } from './sperrer'

export const TILLEGGSGRUNNLAGFIL = 'docs/verktøy-k4-kontrollgrunnlag.md'
export const FEST_TILLEGG = 'src/data/verktoy/fest-tillegg.json'

/** Virkestoffene uttrekket `FEST_TILLEGG` har: lamotrigin og de eksisterende legemidlene i reglene. */
export const TILLEGGSSTOFFER: readonly string[] = [...new Set(TILLEGGSSETT.regler.flatMap((r) => r.plan.forlop.flatMap((f) => (f.virkestoff.type === 'virkestoff' ? [f.virkestoff.nokkel] : []))))]

const VERKTOY = 'kombinere-stemningsstabiliserende'
const DATO = '2026-11-03'
const STARTDATO = '2026-11-09'

/** Versjonen og fingeravtrykket kontrolløren bes vurdere. */
export const kontrollregel = (r: Regel): Kontrollregel => ({ id: r.id, versjon: r.versjon, fingeravtrykk: fingeravtrykk(r) })

/** Regelen med en simulert godkjenning av nøyaktig versjonen under kontroll, eventuelt endret etterpå på kopien. */
const simulert = (r: Regel, etter?: { hva: string; endre: (x: Regel) => void }): NonNullable<Pilotkasus['regel']> => ({
  id: r.id,
  endre: {
    hva: `simulert klinisk godkjenning av versjon ${r.versjon}, bare på en kopi${etter ? `; deretter ${etter.hva}` : ''}`,
    endre: (x) => {
      simulerGodkjenning(x, kontrollregel(r), DATO)
      etter?.endre(x)
    },
  },
})

const peroral = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })
const valgFor = (fra: string) => ({ fra: peroral(fra), til: peroral('lamotrigin') })

export interface Tilleggskasus extends Pilotkasus {
  /** Regelen kasuset prøver, til grupperingen i rapporten; `null` når valget ikke har noen regel. */
  gjelder: string | null
}

const kasus = (
  id: string,
  gjelder: Regel | null,
  fra: string,
  kategori: Pilotkasus['kategori'],
  hva: string,
  dose: string,
  forventet: Pilotkasus['forventet'],
  x: Partial<Pilotkasus> = {},
): Tilleggskasus => ({
  id,
  gjelder: gjelder?.id ?? null,
  kategori,
  hva,
  verktoy: VERKTOY,
  valg: valgFor(fra),
  uttrekk: 'pilot',
  dose,
  ...x,
  skjema: { startdato: STARTDATO, ...x.skjema },
  forventet,
})

const sperre = (omfang: Verktoysperre['omfang'], mal: string | null): Verktoysperre => ({ id: `sperre-${mal ?? 'alle'}`, omfang, mal, grunn: 'Syntetisk nødstopp i kontrollgrunnlaget.', satt_kl: '2026-11-03T12:00:00Z', satt_av: null })

const UNNTAK = 'Regelen gjelder ikke'

const V = VALPROAT_LAMOTRIGIN
const L = LITIUM_LAMOTRIGIN

/**
 * Radene i planen for lamotrigin lagt til valproat 1000 mg og til litium
 * 168 mg, med startdato 09.11.2026, slik tabellen og kopien viser dem.
 * Kontrollert for hånd mot tabell 3 i preparatomtalen; testene sier fra når
 * beregningen gir noe annet.
 */
export const PLAN_VALPROAT: readonly string[] = [
  'Dag 1–14 (09.11.2026–22.11.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg annenhver dag = 1 tablett à 25 mg',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 15–28 (23.11.2026–06.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 29–35 (07.12.2026–13.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Fra dag 36 (fra 14.12.2026): Valproat peroralt: 1000 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den stabiliserende måldosen (100 mg/dag) er nådd. Vurder klinisk respons; videre justering (høyst 200 mg/dag sammen med valproat) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.',
]

export const PLAN_LITIUM: readonly string[] = [
  'Dag 1–14 (09.11.2026–22.11.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 25 mg = 1 tablett à 25 mg',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 15 (23.11.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 15–28 (23.11.2026–06.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 50 mg = 1 tablett à 50 mg',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 29 (07.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Dag 29–35 (07.12.2026–13.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 100 mg = 1 tablett à 100 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Før endringen: Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
  'Fra dag 36 (fra 14.12.2026): Litium peroralt: 168 mg = uendret dose; planen beregner den ikke; Lamotrigin peroralt: 200 mg = 1 tablett à 200 mg',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Den stabiliserende måldosen (200 mg/dag) er nådd. Vurder klinisk respons; videre justering (100–400 mg/dag er brukt i studier) beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.',
  'Dag 36 (14.12.2026): Vurdering (Lamotrigin): Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.',
]

export const TILLEGGSKASUS: readonly Tilleggskasus[] = [
  // Slik appen er i dag: reglene er ikke godkjent, så verktøyet gir ingen plan.
  kasus('K4-01', V, 'valproat', 'ikke_godkjent', 'regelen er til faglig kontroll; ingen plan i appen', '1000', { utfall: 'ingen', status: 'til_kontroll' }),
  kasus('K4-02', L, 'litium', 'ikke_godkjent', 'regelen er til faglig kontroll; ingen plan i appen', '168', { utfall: 'ingen', status: 'til_kontroll' }),
  // Valproat → lamotrigin, med simulert godkjenning.
  kasus('K4-10', V, 'valproat', 'vanlig_dose', 'hele opptrappingen med valproat', '1000', { utfall: 'plan', linjer: [...PLAN_VALPROAT] }, { regel: simulert(V) }),
  kasus('K4-11', V, 'valproat', 'pasientforhold', 'pasienten er under 18 år', '1000', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(V), skjema: { pasientforhold: { under_18: true } } }),
  kasus('K4-12', V, 'valproat', 'pasientforhold', 'tidligere utslett på lamotrigin', '1000', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(V), skjema: { pasientforhold: { tidligere_reaksjon: true } } }),
  kasus('K4-13', V, 'valproat', 'pasientforhold', 'graviditet er ikke vurdert (ubesvart)', '1000', { utfall: 'stopp', grunner: ['Må avklares før beregning (ukjent): Pasienten er gravid'] }, { regel: simulert(V), ubesvart: ['graviditet'] }),
  kasus('K4-14', V, 'valproat', 'pasientforhold', 'valproat er ikke bekreftet vurdert etter det graviditetsforebyggende programmet', '1000', { utfall: 'stopp', grunner: ['Må bekreftes før beregning: Valproatbehandlingen er vurdert'] }, {
    regel: simulert(V),
    skjema: { bekreftet: ['fortsetter_valproat', 'utslett_informert'] },
  }),
  kasus('K4-15', V, 'valproat', 'uvanlig_dose', 'ingen dose av valproat er fylt inn', '', { utfall: 'mangler', grunner: ['Aktuell døgndose må fylles inn'] }, { regel: simulert(V) }),
  kasus('K4-16', V, 'valproat', 'foreldet_fest', 'FEST-kopien er 49 timer gammel', '1000', { utfall: 'stopp', grunner: ['Den nattlige oppdateringen har ikke gått'] }, { regel: simulert(V), timer: 49 }),
  kasus('K4-17', V, 'valproat', 'preparat', 'alle lamotriginpreparatene krever godkjenningsfritak', '1000', { utfall: 'stopp', grunner: ['godkjenningsfritak'] }, { regel: simulert(V), fest: bareFritak('lamotrigin') }),
  kasus('K4-18', V, 'valproat', 'preparat', 'Lamictal 25 mg er midlertidig utgått: 25 mg annenhver dag kan ikke gis, og planen stopper i stedet for å velge en annen dose', '1000', { utfall: 'stopp', grunner: ['den ideelle dosen 25 mg annenhver dag kan ikke gis'] }, { regel: simulert(V), fest: midlertidigUtgatt('lamotrigin', 25, 'Lamictal') }),
  kasus('K4-19', V, 'valproat', 'regelendring', 'regelen er endret etter godkjenningen (måldose 150 mg)', '1000', { utfall: 'stopp', grunner: ['Regelen er endret etter godkjenningen'] }, {
    regel: simulert(V, { hva: 'måldosen endret til 150 mg', endre: (x) => void (x.plan.forlop[1]!.faser[1] = { type: 'vedlikehold', dose: { type: 'fast', mg: { ...maldose(x), verdi: 150 } } }) }),
  }),
  kasus('K4-20', V, 'valproat', 'uvanlig_dose', 'høyeste dose sammen med valproat: en plan over 200 mg stopper (godkjenningen simulert for den endrede kopien)', '1000', { utfall: 'stopp', grunner: ['den ideelle dosen 250 mg kan ikke gis med preparatene i FEST nøyaktig og ikke over 200 mg'] }, {
    regel: { id: V.id, endre: { hva: 'måldosen endret til 250 mg, deretter simulert godkjenning av kopien', endre: (x) => {
      x.plan.forlop[1]!.faser[1] = { type: 'vedlikehold', dose: { type: 'fast', mg: { ...maldose(x), verdi: 250 } } }
      simulerGodkjenning(x, kontrollregel(x), DATO)
    } } },
  }),
  kasus('K4-21', V, 'valproat', 'nodstopp', 'verktøyet er deaktivert med nødstoppen', '1000', { utfall: 'sperret' }, { regel: simulert(V), sperrer: [sperre('verktoy', VERKTOY)] }),
  // Litium → lamotrigin, med simulert godkjenning.
  kasus('K4-30', L, 'litium', 'vanlig_dose', 'hele opptrappingen med litium', '168', { utfall: 'plan', linjer: [...PLAN_LITIUM] }, { regel: simulert(L) }),
  kasus('K4-31', L, 'litium', 'interaksjon', 'pasienten bruker også karbamazepin', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(L), skjema: { pasientforhold: { valproat_eller_induserende: true } } }),
  kasus('K4-32', L, 'litium', 'interaksjon', 'pasienten bruker et legemiddel med ukjent interaksjon med lamotrigin', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(L), skjema: { pasientforhold: { ukjent_interaksjon: true } } }),
  kasus('K4-33', L, 'litium', 'pasientforhold', 'moderat nedsatt leverfunksjon', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(L), skjema: { pasientforhold: { nedsatt_leverfunksjon: true } } }),
  kasus('K4-34', L, 'litium', 'pasientforhold', 'bruker lamotrigin allerede (ikke en oppstart)', '168', { utfall: 'stopp', grunner: [UNNTAK] }, { regel: simulert(L), skjema: { pasientforhold: { bruker_lamotrigin: true } } }),
  // Kombinasjoner uten regel: verktøyet sier det, og beregner ingenting.
  kasus('K4-40', null, 'karbamazepin', 'ikke_godkjent', 'karbamazepin → lamotrigin (induserende legemiddel) har ingen regel', '600', { utfall: 'ingen', status: 'ikke_stottet' }),
  { ...kasus('K4-41', null, 'lamotrigin', 'ikke_godkjent', 'motsatt retning: lamotrigin → valproat har ingen regel', '200', { utfall: 'ingen', status: 'ikke_stottet' }), valg: { fra: peroral('lamotrigin'), til: peroral('valproat') } },
  kasus('K4-42', null, 'kvetiapin', 'ikke_godkjent', 'kvetiapin → lamotrigin har ingen regel', '300', { utfall: 'ingen', status: 'ikke_stottet' }),
]

function maldose(x: Regel) {
  const f = x.plan.forlop[1]!.faser[1]!
  if (f.type !== 'vedlikehold' || f.dose.type !== 'fast') throw new Error(`${x.id}: siste fase er ikke en fast vedlikeholdsdose`)
  return f.dose.mg
}

/** Uttrekkene kasusene leses fra: tilleggsuttrekket på begge plassene. */
export const uttrekkeneFor = (u: Festuttrekk): Uttrekkene => ({ pilot: u, aksept: u })

/** Utfallet av hvert kasus, og hvorfor det avviker fra forventningen (tom når det ikke gjør det). */
export function kjorTilleggskasus(u: Festuttrekk) {
  return TILLEGGSKASUS.map((k) => {
    const res = kjorKasus(k, uttrekkeneFor(u))
    return { k, res, avvik: avvikFra(k, res) }
  })
}

const celle = (x: string) => x.replaceAll('|', '\\|').replaceAll('\n', ' ')

function utfallstekst(u: Pilotutfall): string {
  switch (u.utfall) {
    case 'plan':
      return `plan (${u.linjer.length} rader)`
    case 'stopp':
    case 'mangler':
      return `${u.utfall}: ${u.grunner.join(' ')}`
    case 'formvalg':
      return `formvalg: ${u.forlop.join(', ')}`
    case 'fagtekst':
      return `fagtekst: ${u.regler.join(', ')}`
    case 'ingen':
      return `ingen plan (${u.status}): ${u.grunner.join(' ')}`
    case 'sperret':
      return 'deaktivert med nødstoppen'
  }
}

/** Kontrollspørsmålene til den uavhengige faglige kontrollen, med OUSFARs anbefaling. */
export const TILLEGGSSPORSMAL: readonly { nr: string; sporsmal: string; anbefalt: string }[] = [
  {
    nr: 'K4.1',
    sporsmal: 'Er opptrappingene og måldosene gjengitt riktig fra tabell 3 i Lamictal-preparatomtalen (valproat: 25 mg annenhver dag i 14 dager, 25 mg i 14 dager, 50 mg i 7 dager, 100 mg; uten valproat og induserende legemidler: 25, 50 og 100 mg, så 200 mg)?',
    anbefalt: 'Ja; dosene er hentet direkte fra tabellen, og planen går ikke over dem.',
  },
  {
    nr: 'K4.2',
    sporsmal: 'Er det riktig å regne den vanlige stabiliserende måldosen (100 mg med valproat, 200 mg ellers) som planens sluttmål, med videre justering som et vurderingspunkt som ikke beregnes?',
    anbefalt: 'Ja; preparatomtalen kaller dem vanlige måldoser og sier at måldosen avhenger av klinisk respons.',
  },
  {
    nr: 'K4.3',
    sporsmal: 'Skal planen bare bruke Lamictal tyggetabletter/dispergerbare tabletter (FEST-form 524), siden vanlige lamotrigintabletter i FEST krever godkjenningsfritak?',
    anbefalt: 'Ja; alle dosene kan gis med hele dispergerbare tabletter.',
  },
  {
    nr: 'K4.4',
    sporsmal: 'Er unntakene (under 18 år, tidligere alvorlig reaksjon, lamotrigin i bruk eller nylig avsluttet, moderat/alvorlig leversvikt, betydelig nyresvikt, graviditet/amming, HLA-B*1502) og bekreftelsene riktige og tilstrekkelige som stopp?',
    anbefalt: 'Ja, som en forsiktig første avgrensning; hver av dem har en egen dosering eller vurdering i preparatomtalen som regelen ikke beregner.',
  },
  {
    nr: 'K4.5',
    sporsmal: 'Unntaket for nylig avsluttet lamotrigin oppgir ca. 7 og ca. 15 døgn (fem gjennomsnittlige halveringstider, alene og med valproat, fra pkt. 5.2). Er det forsvarlig å vise disse omtrentlige tallene?',
    anbefalt: 'Ja, som veiledning i teksten; regelen bruker dem ikke i beregningen.',
  },
  {
    nr: 'K4.6',
    sporsmal: 'Er en obligatorisk bekreftelse av at valproat er vurdert etter det graviditetsforebyggende programmet nok som stoppunkt, eller skal kvinner i fertil alder alltid stoppe?',
    anbefalt: 'Bekreftelsen er nok: uten den beregnes ingen plan, og graviditet stopper uansett.',
  },
  {
    nr: 'K4.7',
    sporsmal: 'Litium oppgis i mg (som FEST og Lithionit oppgir styrken), ikke i mmol. Er det akseptabelt når planen bare viser dosen som uendret?',
    anbefalt: 'Ja for første leveranse; litiumdosen beregnes ikke.',
  },
  {
    nr: 'K4.8',
    sporsmal: 'Er hormonell prevensjon riktig behandlet som et vurderingspunkt ved måldosen (ikke et unntak), siden preparatomtalen sier at opptrappingen ikke endres?',
    anbefalt: 'Ja.',
  },
]

/** Kombinasjonene verktøyet bevisst ikke dekker ennå, med grunnen. */
export const IKKE_DEKKET: readonly string[] = [
  'Karbamazepin → lamotrigin (og andre induserende legemidler): preparatomtalen har en egen opptrapping der døgndoser fra 100 mg skal fordeles på to doser; fordelingen per trinn er ikke modellert ennå.',
  'Aripiprazol, olanzapin, gabapentin og topiramat → lamotrigin: samme opptrapping som med litium etter tabell 6, men hvert par må vurderes for seg før det legges til.',
  'Kvetiapin, risperidon og ziprasidon → lamotrigin: interaksjonen er ikke beskrevet i tabell 6; preparatomtalen sier da at opptrappingen for samtidig valproat skal brukes. Ikke laget.',
  'Lamotrigin → valproat (motsatt retning): lamotrigindosen skal halveres når valproat legges til (tabell 5), men opptrappingen av valproat er ikke vurdert. Ikke laget.',
  'Alle andre par i Combining Moodstabilizers (110 i alt): ingen kildeforankret regel ennå.',
]

/** Rapporten til den uavhengige faglige kontrollen. */
export function lagTilleggsgrunnlag(u: Festuttrekk): string {
  const resultater = kjorTilleggskasus(u)
  const avvik = resultater.filter((x) => x.avvik.length > 0)
  const linjer = [
    '# OUSFAR Verktøy – K4: kontrollgrunnlag for kombinasjon av stemningsstabiliserende',
    '',
    '> Generert av `npm run verktoy:regler -- tilleggsgrunnlag` fra `src/verktoy/tilleggsgrunnlag.ts`. Ikke rediger for hånd; testene sier fra når rapporten ikke er oppdatert.',
    '',
    'Kasusene går den samme veien som verktøysiden, med preparatene i det lagrede FEST-uttrekket. **Reglene er ikke godkjent.** Kasusene med «simulert godkjenning» viser hva verktøyet ville vist om nøyaktig versjonen og fingeravtrykket under ble godkjent; kopien lagres aldri og går aldri til appen. Kasusene er syntetiske, uten pasientopplysninger. Selve reglene, kildene og fakta står i `docs/verktøy-k4-tillegg.md`.',
    '',
    `FEST-uttrekket: \`${FEST_TILLEGG}\` (hentet ${u.hentet}, kontrollert ${u.utvalg.kontrollert_kl}).`,
    '',
    '## Versjonene under kontroll',
    '',
    tabell(
      ['Regel', 'Versjon', 'Fingeravtrykk'],
      TILLEGGSSETT.regler.map((r) => [`\`${r.id}\``, String(r.versjon), `\`${fingeravtrykk(r)}\``]),
    ),
    '',
    '## Kontrollspørsmål',
    '',
    tabell(['Nr.', 'Spørsmål', 'OUSFARs anbefaling'], TILLEGGSSPORSMAL.map((s) => [s.nr, s.sporsmal, s.anbefalt])),
    '',
    '## Ikke dekket',
    '',
    liste([...IKKE_DEKKET]),
    '',
    '## Kasusene',
    '',
    `**${resultater.length} kasus.** ${avvik.length === 0 ? 'Alle utfallene er som forventet.' : `**${avvik.length} utfall avviker fra forventningen.**`}`,
    '',
    tabell(
      ['Kasus', 'Regel', 'Kategori', 'Hva', 'Dose', 'Utfall'],
      resultater.map(({ k, res, avvik: a }) => [`${k.id}${a.length > 0 ? ' ✗' : ''}`, k.gjelder ? `\`${k.gjelder}\`` : '–', KATEGORIER[k.kategori], celle(k.hva), `«${k.dose}»`, celle(utfallstekst(res))]),
    ),
  ]
  for (const { k, res } of resultater.filter(({ res }) => res.utfall === 'plan')) {
    linjer.push('', `## ${k.id}: ${k.hva}`, '', `Planutfall: ${res.tekst?.includes(KOMPLETT) ? KOMPLETT : 'ikke komplett'}.`, '', '```text', res.tekst ?? '', '```')
  }
  return `${linjer.join('\n')}\n`
}
