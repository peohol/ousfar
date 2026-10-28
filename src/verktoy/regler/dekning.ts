/**
 * Dekningen for «Trappe ned antidepressiv» (P7.1 i
 * `docs/verktøy-utviklingsplan.md`): statusen OUSFAR har for nedtrapping av
 * hvert antidepressivum i kildetabellen, med grunnen og de faglige
 * spørsmålene som står åpne. Johannesurt er utelatt og kommer aldri med.
 *
 * Statusen er OUSFARs egen og skilt fra kildens Stop-anbefaling: at
 * Psychiatrienet har en Stop-oppføring for et virkestoff, sier bare at kilden
 * finnes (P3), ikke at OUSFAR har en validert nedtrapping. Reglene selv står i
 * regelsettene (`nedtrapping.ts` og `pilotsett.ts`); kontrollen i
 * `kontroll.ts` krever at statusen her stemmer med dem, og at alle
 * antidepressivene i kildetabellen har nøyaktig én status.
 */
import type { Kildehenvisning } from './modell'
import { PREPARATOMTALER as P } from './nedtrapping'

export type Dekningsstatus = 'beregnbar_regel' | 'bare_fagtekst' | 'mangler_anbefaling' | 'begrenset'

export const DEKNINGSSTATUS: Record<Dekningsstatus, string> = {
  beregnbar_regel: 'Beregnbar regel til faglig kontroll',
  bare_fagtekst: 'Bare fagtekst',
  mangler_anbefaling: 'Mangler anbefaling',
  begrenset: 'Annen begrunnet begrensning',
}

export interface Nedtrappingsdekning {
  nokkel: string
  status: Dekningsstatus
  /** Hvorfor statusen er som den er, kort og uten klinisk anbefaling. Vises i verktøyet når det ikke finnes en regel. */
  grunn: string
  /** Fakta fra kildene statusen bygger på; tom når det ikke finnes en kilde å bygge på. */
  henvisninger: Kildehenvisning[]
  /** Faglige spørsmål som må avgjøres før statusen kan endres eller reglene godkjennes. */
  apne: string[]
}

const BARE_FRITAK = 'FEST har bare preparater med godkjenningsfritak og ingen norsk preparatomtale å bygge en regel på.'
const UTEN_PREPARATER = 'FEST har ingen preparater, og det finnes ingen norsk preparatomtale å bygge en regel på.'
const TRISYKLISK = 'Hvilken strategi trisykliske antidepressiva skal ha (andel av dosen eller faste mg-trinn), trinnlengde, sluttdose og minste varighet.'

export const NEDTRAPPINGSDEKNING: readonly Nedtrappingsdekning[] = [
  {
    nokkel: 'agomelatin',
    status: 'bare_fagtekst',
    grunn: 'Preparatomtalen sier at nedtrapping ikke trengs, så det er ingenting å beregne. I Norge finnes bare preparater med godkjenningsfritak.',
    henvisninger: [P.valdoxanSeponering],
    apne: ['Om fagteksten kan publiseres, og hvordan den skal forholde seg til NICEs generelle råd om trinnvis nedtrapping.'],
  },
  {
    nokkel: 'amitriptylin',
    status: 'begrenset',
    grunn:
      'Preparatomtalen sier at dosen skal trappes gradvis ned over flere uker, men oppgir verken trinn eller sluttdose, og FEST oppgir ikke delbarhet for tablettene på 10, 25 og 50 mg. En regel krever en faglig beslutning om strategien først.',
    henvisninger: [P.sarotexSeponering, P.sarotexAbstinens],
    apne: [TRISYKLISK, 'Amitriptylin brukes også i lave doser mot smerter og hodepine; om verktøyet skal gjelde de indikasjonene.'],
  },
  {
    nokkel: 'bupropion',
    status: 'bare_fagtekst',
    grunn: 'Preparatomtalen sier at en nedtrappingsperiode bør vurderes, men gir ingen plan, og tablettene med modifisert frisetting kan ikke deles.',
    henvisninger: [P.wellbutrinSeponering, P.wellbutrinHele],
    apne: ['Om fagteksten kan publiseres, og om en reduksjon fra 300 til 150 mg før seponering skal kunne beregnes.'],
  },
  {
    nokkel: 'citalopram',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. To regler: halvering (standard) og hyperbolsk (alternativ fra pilotsettet).',
    henvisninger: [],
    apne: ['Hvilken av de to strategiene som skal være standard i verktøyet (B2).'],
  },
  {
    nokkel: 'doksepin',
    status: 'mangler_anbefaling',
    grunn: 'FEST lenker ikke til en norsk preparatomtale for Sinequan, og OUSFAR har ikke en preparatomtale å bygge en regel på. Kapslene kan ikke deles.',
    henvisninger: [],
    apne: ['Om en norsk preparatomtale for Sinequan finnes og kan hentes.'],
  },
  { nokkel: 'dosulepin', status: 'mangler_anbefaling', grunn: UTEN_PREPARATER, henvisninger: [], apne: [] },
  {
    nokkel: 'duloksetin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet.',
    henvisninger: [],
    apne: [],
  },
  {
    nokkel: 'escitalopram',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet. Regelen er fra pilotsettet (P4).',
    henvisninger: [],
    apne: ['Pilotregelen går lenger ned (25 % trinn til 2,5 mg) enn P7-reglene, som slutter ved laveste dose i preparatomtalen; om sluttdosene skal samordnes.'],
  },
  {
    nokkel: 'fenelzin',
    status: 'mangler_anbefaling',
    grunn: `${BARE_FRITAK} Psychiatrienets Stop-oppføring er heller ikke tilgjengelig.`,
    henvisninger: [],
    apne: [],
  },
  {
    nokkel: 'fluoksetin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet.',
    henvisninger: [],
    apne: ['Om fluoksetin, med lang halveringstid, trenger nedtrapping; kildene er ikke enige.'],
  },
  {
    nokkel: 'fluvoksamin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet.',
    henvisninger: [],
    apne: [],
  },
  { nokkel: 'imipramin', status: 'mangler_anbefaling', grunn: BARE_FRITAK, henvisninger: [], apne: [] },
  {
    nokkel: 'klomipramin',
    status: 'begrenset',
    grunn:
      'Preparatomtalen sier at dosen trappes gradvis ned etter langvarig bruk, men også så raskt som mulig, uten trinn eller varighet. En regel krever en faglig beslutning om strategien først.',
    henvisninger: [P.anafranilSeponering, P.anafranilRaskt],
    apne: [TRISYKLISK],
  },
  { nokkel: 'maprotilin', status: 'mangler_anbefaling', grunn: UTEN_PREPARATER, henvisninger: [], apne: [] },
  {
    nokkel: 'mirtazapin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at behandlingen avsluttes gradvis, og oppgir doseområdet; varigheten er OUSFARs tolkning.',
    henvisninger: [],
    apne: ['Om «gradvis» kan leses som minst ett trinn på 14 dager.'],
  },
  {
    nokkel: 'moklobemid',
    status: 'mangler_anbefaling',
    grunn: 'Preparatomtalen omtaler ikke nedtrapping ved seponering, og FEST oppgir ikke delbarhet for tablettene på 150 og 300 mg.',
    henvisninger: [P.aurorixDose],
    apne: ['Om NICEs generelle prinsipp alene er nok grunnlag for en regel for en reversibel MAO-hemmer.'],
  },
  {
    nokkel: 'nortriptylin',
    status: 'begrenset',
    grunn:
      'Preparatomtalen sier at brå seponering etter lang tids bruk kan gi abstinenssymptomer, men gir ingen nedtrappingsplan; dosereduksjonen den beskriver gjelder vedlikeholdsdosen. En regel krever en faglig beslutning om strategien først.',
    henvisninger: [P.noritrenAbstinens, P.noritrenVedlikehold],
    apne: [TRISYKLISK],
  },
  {
    nokkel: 'paroksetin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen beskriver nedtrappingsregimet fra de kliniske studiene (10 mg lavere hver uke), og regelen følger det.',
    henvisninger: [],
    apne: [
      'Om studieregimet (like store mg-trinn) skal brukes, eller halvering som for de andre.',
      'Om planen skal slutte etter en uke på 20 mg, slik den amerikanske preparatomtalen beskriver studieregimet, eller fortsette med en uke på 10 mg, som nå.',
    ],
  },
  {
    nokkel: 'sertralin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet.',
    henvisninger: [],
    apne: [],
  },
  { nokkel: 'tranylcypromin', status: 'mangler_anbefaling', grunn: BARE_FRITAK, henvisninger: [], apne: [] },
  { nokkel: 'trazodon', status: 'mangler_anbefaling', grunn: BARE_FRITAK, henvisninger: [], apne: [] },
  {
    nokkel: 'venlafaksin',
    status: 'beregnbar_regel',
    grunn: 'Preparatomtalen sier at dosen trappes gradvis ned over minst én til to uker, og oppgir doseområdet.',
    henvisninger: [],
    apne: ['Om 14 dager per trinn er for raskt; preparatomtalen sier at noen trenger flere måneder.'],
  },
  {
    nokkel: 'vortioksetin',
    status: 'bare_fagtekst',
    grunn: 'Preparatomtalen sier at gradvis nedtrapping kan vurderes, men at det ikke finnes nok data til å anbefale en nedtrappingsplan.',
    henvisninger: [P.brintellixSeponering],
    apne: ['Om fagteksten kan publiseres, eller om en generell nedtrapping etter NICE skal kunne beregnes likevel.'],
  },
]

export const dekningFor = (nokkel: string): Nedtrappingsdekning | undefined => NEDTRAPPINGSDEKNING.find((d) => d.nokkel === nokkel)
