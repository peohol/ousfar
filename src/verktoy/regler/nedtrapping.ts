/**
 * Regelutkastene for verktøyet «Trappe ned antidepressiv» (P7 i
 * `docs/verktøy-utviklingsplan.md`; bakgrunn og valg i
 * `docs/verktøy-p7-nedtrapping.md`). Settet utfyller pilotsettet fra P4, som
 * alt har seponering av escitalopram og en hyperbolsk regel for citalopram.
 *
 * Reglene bygger på norske preparatomtaler (DMP), EU-preparatomtaler (EMA)
 * og NICE NG222, med fakta gjengitt med egne ord. Kildeoppføringen for
 * Psychiatrienets Stop-anbefaling står bare som referanse; ingen regel bygger
 * på teksten der, og ingen gjengir den. To slags regler:
 *
 * - **Beregnbare** der preparatomtalen sier at dosen skal trappes gradvis ned
 *   og oppgir et doseområde: halvering av aktuell dose (eksempelet i NICE)
 *   ned til laveste dose preparatomtalen oppgir, og deretter seponering.
 *   Paroksetin følger i stedet nedtrappingsregimet fra preparatomtalen.
 * - **Bare fagtekst** der kildene ikke gir grunnlag for en beregning
 *   (vortioksetin, agomelatin, bupropion).
 *
 * Statusen for alle antidepressivene i kildetabellen, også dem uten regel,
 * står i `dekning.ts`. **Ingen regel er klinisk godkjent.** Alle har status
 * «til faglig kontroll» (P7.5); OUSFARs egne valg er merket som åpne forslag,
 * og eksemplene er regnet ut for hånd og kontrolleres av testene.
 */
import { forslag, FORUTSETNINGER_FELLES, h, halvering, minst14, NICE, pn, SPC_AD, steg, trinn14, utsagn } from './felles'
import type { Godkjenning, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Utsagn, Virkestoffvalg } from './modell'
import { REGELMODELLVERSJON } from './modell'

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

const SEROXAT = {
  dose: h('dmp-seroxat', 'pkt. 4.2', 'Ved depresjon er anbefalt dose 20 mg daglig, med økning i trinn på 10 mg til høyst 50 mg; ved panikklidelse startes det med 10 mg, og høyeste dose er 60 mg.'),
  seponering: h(
    'dmp-seroxat',
    'pkt. 4.2',
    'Brå seponering bør unngås. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere.',
  ),
}

/** Den amerikanske preparatomtalen beskriver hvor studieregimet sluttet; det gjør ikke den norske. */
const PAXIL_FDA = h('fda-paxil', 'pkt. 5.7', 'I studiene ved generalisert angst og PTSD ble døgndosen redusert med 10 mg hver uke, og pasientene sto én uke på 20 mg før seponering.')

const FEVARIN = {
  dose: h('dmp-fevarin', 'pkt. 4.2', 'Ved depresjon er anbefalt dose 100 mg daglig, med start på 50 eller 100 mg; dosen kan økes til høyst 300 mg daglig.'),
  seponering: h('dmp-fevarin', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen fortsette langsommere.'),
}

const EFEXOR = {
  dose: h('dmp-efexor-depot', 'pkt. 4.2', 'Startdosen er 75 mg daglig (37,5 mg i 7 dager ved panikklidelse); høyeste dose er 375 mg daglig ved depresjon og 225 mg ved angstlidelser.'),
  seponering: h(
    'dmp-efexor-depot',
    'pkt. 4.2',
    'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Tiden som trengs avhenger av dose, behandlingstid og pasient; noen trenger nedtrapping over flere måneder.',
  ),
  kapsler: h('dmp-efexor-depot', 'pkt. 4.2', 'Depotkapslene skal svelges hele og ikke deles, knuses, tygges eller løses opp.'),
}

const DULOXETIN = {
  dose: h('dmp-duloxetin-pensa', 'pkt. 4.2', 'Ved depresjon er start- og vedlikeholdsdosen 60 mg daglig, høyst 120 mg; ved generalisert angstlidelse er startdosen 30 mg.'),
  seponering: h(
    'dmp-duloxetin-pensa',
    'pkt. 4.2',
    'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved uakseptable symptomer kan forrige dose gjenopptas og nedtrappingen fortsette over lengre tid.',
  ),
}

const REMERON = {
  seponering: h('dmp-remeron', 'pkt. 4.2 og 4.4', 'Behandlingen bør avsluttes gradvis for å unngå seponeringssymptomer; varighet oppgis ikke. Brå seponering etter lang tids bruk kan gi seponeringssymptomer, som oftest milde.'),
}

/** Preparatomtaler for virkestoffer uten beregnbar regel; brukes her og i `dekning.ts`. */
export const PREPARATOMTALER = {
  wellbutrinDose: h('dmp-wellbutrin-retard', 'pkt. 4.2', 'Startdosen er 150 mg én gang daglig; den kan økes til 300 mg.'),
  wellbutrinSeponering: h(
    'dmp-wellbutrin-retard',
    'pkt. 4.2',
    'Seponeringsreaksjoner ble ikke sett i de kliniske studiene, men en nedtrappingsperiode bør vurderes; rebound eller seponeringsreaksjoner kan ikke utelukkes.',
  ),
  wellbutrinHele: h('dmp-wellbutrin-retard', 'pkt. 4.2', 'Tablettene skal svelges hele og må ikke deles, knuses eller tygges, fordi det kan øke risikoen for bivirkninger, også krampeanfall.'),
  brintellixDose: h('ema-brintellix', 'section 4.2', 'Start- og anbefalt dose er 10 mg daglig hos voksne under 65 år; dosen kan økes til høyst 20 mg eller senkes til minst 5 mg.'),
  brintellixSeponering: h('ema-brintellix', 'section 4.2', 'Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men det finnes ikke nok data til å anbefale en bestemt nedtrappingsplan.'),
  valdoxanDose: h('ema-valdoxan', 'section 4.2', 'Anbefalt dose er 25 mg ved sengetid; etter to uker uten bedring kan dosen økes til 50 mg.'),
  valdoxanSeponering: h('ema-valdoxan', 'section 4.2', 'Dosen trenger ikke trappes ned når behandlingen avsluttes.'),
  sarotexSeponering: h('dmp-sarotex', 'pkt. 4.2', 'Når behandlingen avsluttes, skal dosen trappes gradvis ned over flere uker; trinn oppgis ikke.'),
  sarotexAbstinens: h('dmp-sarotex', 'pkt. 4.4', 'Plutselig seponering etter langvarig bruk kan gi abstinenssymptomer som hodepine, uvelhet, søvnløshet og irritabilitet.'),
  noritrenAbstinens: h('dmp-noritren', 'pkt. 4.4', 'Brå seponering etter lang tids behandling kan gi abstinenssymptomer som hodepine, uvelhet, søvnløshet og irritabilitet.'),
  noritrenVedlikehold: h(
    'dmp-noritren',
    'pkt. 4.2',
    'Etter effekt reduseres dosen gradvis, for eksempel 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene nede; det gjelder vedlikehold, ikke seponering.',
  ),
  anafranilSeponering: h('dmp-anafranil', 'pkt. 4.2', 'Brå seponering bør unngås; etter jevnlig bruk over lang tid trappes dosen gradvis ned, og pasienten følges nøye.'),
  anafranilRaskt: h('dmp-anafranil', 'pkt. 4.4', 'Skal behandlingen avsluttes, trappes legemidlet ned så raskt som mulig, men med hensyn til at brå seponering kan gi symptomer.'),
  aurorixDose: h('dmp-aurorix', 'pkt. 4.2', 'Anbefalt startdose er 300 mg daglig, eventuelt økt til 600 mg; avsnittet omtaler ikke nedtrapping ved seponering.'),
}
const P = PREPARATOMTALER

/* --- Felles for reglene ---------------------------------------------------------------- */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P7.5). Ikke klinisk godkjent.'

const tilKontroll = (): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [steg('utkast', 1, 'Utkast til nedtrappingsregel (P7.2).'), steg('til_faglig_kontroll', 1, TIL_KONTROLL)],
})

const SEPONERING = 'Planen gjelder seponering, ikke bytte til et annet antidepressiv.'

const USIKKERHET_FELLES = [
  'Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.',
  'Om hver dose kan gis med norske preparater (styrke, deling, flytende form), avgjøres av FEST når planen beregnes; en dose som ikke kan gis nøyaktig, stopper beregningen i stedet for å avrundes.',
]

const peroralt = (nokkel: string, faser: Regel['plan']['forlop'][number]['faser']): Regel['plan'] => ({
  form: 'seponering',
  forlop: [{ id: 'fra', virkestoff: { type: 'virkestoff', nokkel }, administrasjon: 'peroral', utgangsdose: 'startdose', start: { type: 'dag', dag: 1 }, faser }],
})

const fra = (nokkel: string): Virkestoffvalg => ({ type: 'virkestoff', nokkel })

const tall = (x: number) => String(x).replace('.', ',')

/** Det som skiller en beregnbar nedtrappingsregel fra de andre. */
interface Nedtrappingsgrunnlag {
  nokkel: string
  /** Virkestoffets kode i kildetabellen, for referansen til Stop-oppføringen. */
  kode: string
  dose: Kildehenvisning
  seponering: Kildehenvisning
  /** Startdosene regelen gjelder for, fra preparatomtalen. */
  doseomrade: [number, number]
  /** Dosen nedtrappingen ender med ved halvering; under den seponeres. */
  sluttdose?: { mg: number; hvorfor: string }
  /** Hva preparatomtalen sier om nedtrappingen, som kildetro utsagn. */
  kildetro: string
  /** Minste varighet; som standard «minst én til to uker» lest som 14 dager. */
  minste_varighet?: { parameter: Parameter; tekst: Utsagn }
  /** En annen strategi og trinnlengde enn halvering hver 14. dag, med OUSFARs begrunnelse. */
  strategi?: { strategi: Nedtrappingsstrategi; trinnlengde: Parameter; tekst: Utsagn[] }
  ekstra?: Partial<Pick<Regel['fortolkning'], 'kildetro' | 'tilpasninger' | 'usikkerhet' | 'forutsetninger'>>
  eksempler: Regneeksempel[]
}

/** En beregnbar regel for nedtrapping til seponering. */
function nedtrappingsregel(g: Nedtrappingsgrunnlag): Regel {
  const minste = g.minste_varighet ?? {
    parameter: minst14(g.seponering),
    tekst: utsagn('«Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.', g.seponering),
  }
  const slutt = g.sluttdose ?? { mg: 0, hvorfor: '' }
  const strategi = g.strategi ?? {
    strategi: halvering(forslag(slutt.mg, 'mg', `${slutt.hvorfor} Under den seponeres.`, { henvisninger: [g.dose] })),
    trinnlengde: trinn14('Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste.'),
    tekst: [
      utsagn(
        `OUSFAR halverer dosen (50 % av aktuell dose) med 14 dager per trinn og seponerer når neste dose blir under ${tall(slutt.mg)} mg. ${slutt.hvorfor} Halveringen, trinnlengden og sluttdosen er OUSFARs forslag etter eksemplene i NICE.`,
        NICE.andel,
        NICE.vurdering,
        g.dose,
      ),
    ],
  }
  const halverer = !g.strategi
  return {
    id: `seponering-${g.nokkel}`,
    versjon: 1,
    tittel: `Seponering av ${g.nokkel}, ${halverer ? 'gjentatt prosentvis nedtrapping' : 'nedtrapping etter preparatomtalen'}`,
    fra: fra(g.nokkel),
    til: null,
    plan: peroralt(g.nokkel, [{ type: 'nedtrapping', strategi: strategi.strategi, trinnlengde: strategi.trinnlengde, minste_varighet: minste.parameter }]),
    inndata: [{ navn: 'startdose', omrade: g.doseomrade, art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [g.dose] } }],
    bekreftelser: [],
    unntak: [],
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn(g.kildetro, g.seponering),
        utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
        utsagn('Det bør gå én til to uker mellom reduksjonene.', NICE.vurdering),
        ...(g.ekstra?.kildetro ?? []),
      ],
      tilpasninger: [...strategi.tekst, minste.tekst, ...(g.ekstra?.tilpasninger ?? [])],
      forutsetninger: [...FORUTSETNINGER_FELLES, SEPONERING, ...(g.ekstra?.forutsetninger ?? [])],
      usikkerhet: [
        ...(halverer
          ? [
              'Halveringen, trinnlengden og sluttdosen er OUSFARs valg etter eksemplene i NICE, ikke empirisk validerte verdier.',
              'Siste trinn går fra laveste dose i preparatomtalen rett til null. Om nedtrappingen bør fortsette med lavere doser eller mindre trinn, er et åpent faglig spørsmål og holdes utenfor denne regelen (B2).',
            ]
          : []),
        ...USIKKERHET_FELLES,
        ...(g.ekstra?.usikkerhet ?? []),
      ],
    },
    referanser: [pn(`SwitchAntidepressants:${g.kode}>Stop`)],
    eksempler: g.eksempler,
    godkjenning: tilKontroll(),
  }
}

/** En regel uten beregning: kildene gir bare grunnlag for fagtekst. */
function fagtekstregel(g: { nokkel: string; kode: string; kildetro: Utsagn[]; tilpasninger: Utsagn[]; usikkerhet: string[] }): Regel {
  return {
    id: `seponering-${g.nokkel}`,
    versjon: 1,
    tittel: `Seponering av ${g.nokkel}, fagtekst uten beregning`,
    fra: fra(g.nokkel),
    til: null,
    plan: peroralt(g.nokkel, []),
    inndata: [],
    bekreftelser: [],
    unntak: [],
    beregnbarhet: 'bare_tekstlig',
    fortolkning: {
      kildetro: g.kildetro,
      tilpasninger: g.tilpasninger,
      forutsetninger: [FORUTSETNINGER_FELLES[0]!, FORUTSETNINGER_FELLES[2]!, SEPONERING],
      usikkerhet: g.usikkerhet,
    },
    referanser: [pn(`SwitchAntidepressants:${g.kode}>Stop`)],
    eksempler: [],
    godkjenning: tilKontroll(),
  }
}

/** Et eksempel som skal stoppe fordi startdosen allerede er sluttdosen: nedtrappingen blir 0 dager. */
const vedSluttdosen = (nokkel: string, mg: number): Regneeksempel => ({
  id: `fra-${tall(mg)}-mg`,
  beskrivelse: `Fra ${tall(mg)} mg, laveste dose: neste trinn er under sluttdosen, så nedtrappingen blir 0 dager og beregningen stopper i stedet for å seponere brått.`,
  inndata: { startdose_mg: mg },
  forventet: {},
  stopp: new RegExp(`Nedtrappingen av ${nokkel} blir 0 dager, kortere enn`),
})

const overMaksimum = (mg: number): Regneeksempel => ({
  id: 'over-maksimum',
  beskrivelse: `${tall(mg)} mg er over dosene regelen gjelder for, så beregningen stopper.`,
  inndata: { startdose_mg: mg },
  forventet: {},
  stopp: new RegExp(`Startdosen ${tall(mg)} mg er utenfor`),
})

/* --- Reglene ------------------------------------------------------------------------------- */

const citalopram = nedtrappingsregel({
  nokkel: 'citalopram',
  kode: 'Ci',
  dose: SPC_AD.cipramilDose,
  seponering: SPC_AD.cipramilSeponering,
  doseomrade: [10, 40],
  sluttdose: { mg: 10, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (startdosen ved panikklidelse).' },
  kildetro: 'Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.',
  ekstra: {
    usikkerhet: ['Regelen er standardstrategien ved siden av den hyperbolske pilotregelen for citalopram; hvilken som skal være standard i verktøyet, avgjøres faglig (B2).'],
  },
  eksempler: [
    { id: 'fra-40-mg', beskrivelse: 'Fra 40 mg, høyeste dose: to halveringer, så seponering.', inndata: { startdose_mg: 40 }, forventet: { fra: ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert'] } },
    { id: 'fra-20-mg', beskrivelse: 'Fra 20 mg, vanlig dose: ett trinn på 14 dager, som akkurat oppfyller minimumet.', inndata: { startdose_mg: 20 }, forventet: { fra: ['dag 1–14: 10 mg', 'fra dag 15: seponert'] } },
    {
      id: 'fra-30-mg',
      beskrivelse: 'Fra 30 mg, uvanlig dose: halvparten er 15 mg; neste halvering er under 10 mg.',
      inndata: { startdose_mg: 30 },
      forventet: { fra: ['dag 1–14: 15 mg', 'fra dag 15: seponert'] },
    },
    vedSluttdosen('citalopram', 10),
    overMaksimum(60),
  ],
})

const sertralin = nedtrappingsregel({
  nokkel: 'sertralin',
  kode: 'Se',
  dose: SPC_AD.zoloftDose,
  seponering: SPC_AD.zoloftSeponering,
  doseomrade: [25, 200],
  sluttdose: { mg: 25, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (startdosen ved enkelte angstlidelser).' },
  kildetro: 'Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.',
  eksempler: [
    {
      id: 'fra-200-mg',
      beskrivelse: 'Fra 200 mg, høyeste dose: langvarig nedtrapping med tre halveringer.',
      inndata: { startdose_mg: 200 },
      forventet: { fra: ['dag 1–14: 100 mg', 'dag 15–28: 50 mg', 'dag 29–42: 25 mg', 'fra dag 43: seponert'] },
    },
    { id: 'fra-100-mg', beskrivelse: 'Fra 100 mg.', inndata: { startdose_mg: 100 }, forventet: { fra: ['dag 1–14: 50 mg', 'dag 15–28: 25 mg', 'fra dag 29: seponert'] } },
    {
      id: 'fra-150-mg',
      beskrivelse: 'Fra 150 mg: 75 og 37,5 mg, som ikke er hele tabletter.',
      inndata: { startdose_mg: 150 },
      forventet: { fra: ['dag 1–14: 75 mg', 'dag 15–28: 37,5 mg', 'fra dag 29: seponert'] },
    },
    vedSluttdosen('sertralin', 25),
  ],
})

const paroksetin = nedtrappingsregel({
  nokkel: 'paroksetin',
  kode: 'Pa',
  dose: SEROXAT.dose,
  seponering: SEROXAT.seponering,
  doseomrade: [10, 60],
  kildetro: 'Paroksetin seponeres ikke brått. I de kliniske studiene ble døgndosen redusert med 10 mg hver uke; den norske preparatomtalen sier ikke hvor regimet sluttet.',
  strategi: {
    strategi: {
      type: 'absolutt',
      mg: forslag(10, 'mg', 'Trinnet fra nedtrappingsregimet i de kliniske studiene; at regimet brukes som plan, er OUSFARs valg.', { henvisninger: [SEROXAT.seponering] }),
    },
    trinnlengde: forslag(7, 'dager', 'Én uke per trinn, som i studieregimet; innenfor NICEs én til to uker.', { omrade: [7, 14], henvisninger: [SEROXAT.seponering, NICE.vurdering] }),
    tekst: [
      utsagn(
        'OUSFAR bruker regimet fra de kliniske studiene i preparatomtalen som plan: døgndosen senkes med 10 mg hver uke. Trinnet og trinnlengden er kildens, men at regimet brukes som plan, er OUSFARs valg.',
        SEROXAT.seponering,
      ),
      utsagn(
        'Planen fortsetter til null, med en uke på 10 mg etter 20 mg. Det er OUSFARs valg, i tråd med NICEs råd om mindre trinn ved lav dose; den amerikanske preparatomtalen beskriver at studieregimet sluttet etter en uke på 20 mg.',
        NICE.andel,
        PAXIL_FDA,
      ),
    ],
  },
  minste_varighet: {
    parameter: forslag(7, 'dager', 'Brå seponering bør unngås; minst ett trinn på én uke.', { art: 'bindende_krav', henvisninger: [SEROXAT.seponering] }),
    tekst: utsagn('Planen må ha minst ett trinn på én uke; fra 10 mg ville regimet gi seponering uten nedtrapping, så da stopper beregningen.', SEROXAT.seponering),
  },
  ekstra: {
    kildetro: [utsagn('I den amerikanske preparatomtalen sluttet studieregimet etter en uke på 20 mg, uten et trinn på 10 mg.', PAXIL_FDA)],
    usikkerhet: [
      'Den norske preparatomtalen sier ikke hvor studieregimet sluttet, mens den amerikanske sier at det sluttet etter en uke på 20 mg. Om planen skal slutte etter 20 mg eller fortsette med en uke på 10 mg, må avklares faglig.',
      'Trinnene er like store i mg, ikke en andel av dosen som NICE beskriver; siste trinn (fra 10 mg til null) er derfor relativt størst. Om det passer pasienten, er et åpent faglig spørsmål.',
      'Én uke per trinn er nedre del av NICEs vurderingstid; preparatomtalen sier at noen trenger langsommere nedtrapping.',
    ],
  },
  eksempler: [
    {
      id: 'fra-60-mg',
      beskrivelse: 'Fra 60 mg, høyeste dose: fem ukentlige trinn.',
      inndata: { startdose_mg: 60 },
      forventet: { fra: ['dag 1–7: 50 mg', 'dag 8–14: 40 mg', 'dag 15–21: 30 mg', 'dag 22–28: 20 mg', 'dag 29–35: 10 mg', 'fra dag 36: seponert'] },
    },
    { id: 'fra-20-mg', beskrivelse: 'Fra 20 mg, vanlig dose: rask nedtrapping på én uke.', inndata: { startdose_mg: 20 }, forventet: { fra: ['dag 1–7: 10 mg', 'fra dag 8: seponert'] } },
    {
      id: 'fra-25-mg',
      beskrivelse: 'Fra 25 mg, uvanlig dose: 15 og 5 mg, som ikke er hele eller halve 20 mg-tabletter.',
      inndata: { startdose_mg: 25 },
      forventet: { fra: ['dag 1–7: 15 mg', 'dag 8–14: 5 mg', 'fra dag 15: seponert'] },
    },
    {
      id: 'fra-10-mg',
      beskrivelse: 'Fra 10 mg: regimet går rett til null, så nedtrappingen blir 0 dager og beregningen stopper.',
      inndata: { startdose_mg: 10 },
      forventet: {},
      stopp: /Nedtrappingen av paroksetin blir 0 dager, kortere enn 7 dager/,
    },
  ],
})

const fluoksetin = nedtrappingsregel({
  nokkel: 'fluoksetin',
  kode: 'Fo',
  dose: SPC_AD.fluoksetinDose,
  seponering: SPC_AD.fluoksetinSeponering,
  doseomrade: [20, 60],
  sluttdose: { mg: 10, hvorfor: 'Sluttdosen er halvparten av laveste dose i preparatomtalen: daglig 10 mg i stedet for 20 mg annenhver dag, som modellen ikke har.' },
  kildetro: 'Fluoksetin trappes ned gradvis over minst én til to uker; virkestoffet finnes i kroppen i flere uker etter seponering.',
  ekstra: {
    kildetro: [utsagn('Ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping.', NICE.fluoksetin)],
    usikkerhet: [
      'Kildene er ikke enige om hvor mye fluoksetin må trappes ned: preparatomtalen sier gradvis over minst én til to uker, NICE nevner dosering annenhver dag ved 20 mg, og Keks mfl. (2016) seponerer uten nedtrapping ved 40 mg daglig eller mindre. Regelen følger preparatomtalen; valget må avklares faglig.',
    ],
  },
  eksempler: [
    { id: 'fra-40-mg', beskrivelse: 'Fra 40 mg.', inndata: { startdose_mg: 40 }, forventet: { fra: ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert'] } },
    { id: 'fra-20-mg', beskrivelse: 'Fra 20 mg, vanlig dose.', inndata: { startdose_mg: 20 }, forventet: { fra: ['dag 1–14: 10 mg', 'fra dag 15: seponert'] } },
    {
      id: 'fra-60-mg',
      beskrivelse: 'Fra 60 mg, høyeste dose: 30 og 15 mg; neste halvering er under 10 mg.',
      inndata: { startdose_mg: 60 },
      forventet: { fra: ['dag 1–14: 30 mg', 'dag 15–28: 15 mg', 'fra dag 29: seponert'] },
    },
    overMaksimum(80),
  ],
})

const fluvoksamin = nedtrappingsregel({
  nokkel: 'fluvoksamin',
  kode: 'Fv',
  dose: FEVARIN.dose,
  seponering: FEVARIN.seponering,
  doseomrade: [50, 300],
  sluttdose: { mg: 50, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (startdosen ved depresjon).' },
  kildetro: 'Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.',
  eksempler: [
    {
      id: 'fra-300-mg',
      beskrivelse: 'Fra 300 mg, høyeste dose: 150 og 75 mg; neste halvering er under 50 mg.',
      inndata: { startdose_mg: 300 },
      forventet: { fra: ['dag 1–14: 150 mg', 'dag 15–28: 75 mg', 'fra dag 29: seponert'] },
    },
    { id: 'fra-100-mg', beskrivelse: 'Fra 100 mg, anbefalt dose.', inndata: { startdose_mg: 100 }, forventet: { fra: ['dag 1–14: 50 mg', 'fra dag 15: seponert'] } },
    vedSluttdosen('fluvoksamin', 50),
  ],
})

const venlafaksin = nedtrappingsregel({
  nokkel: 'venlafaksin',
  kode: 'Ve',
  dose: EFEXOR.dose,
  seponering: EFEXOR.seponering,
  doseomrade: [37.5, 375],
  sluttdose: { mg: 37.5, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (første uke ved panikklidelse).' },
  kildetro: 'Venlafaksin trappes ned gradvis over minst én til to uker; noen trenger nedtrapping over flere måneder.',
  ekstra: {
    kildetro: [utsagn('Depotkapslene kan ikke deles.', EFEXOR.kapsler)],
    usikkerhet: ['Preparatomtalen sier at noen trenger nedtrapping over flere måneder; planen er den korteste som oppfyller minimumet, og kan være for rask for noen.'],
  },
  eksempler: [
    {
      id: 'fra-375-mg',
      beskrivelse: 'Fra 375 mg, høyeste dose: langvarig nedtrapping med tre trinn.',
      inndata: { startdose_mg: 375 },
      forventet: { fra: ['dag 1–14: 187,5 mg', 'dag 15–28: 93,75 mg', 'dag 29–42: 46,88 mg', 'fra dag 43: seponert'] },
    },
    { id: 'fra-150-mg', beskrivelse: 'Fra 150 mg.', inndata: { startdose_mg: 150 }, forventet: { fra: ['dag 1–14: 75 mg', 'dag 15–28: 37,5 mg', 'fra dag 29: seponert'] } },
    {
      id: 'fra-225-mg',
      beskrivelse: 'Fra 225 mg: 112,5 og 56,25 mg; den siste er ikke en sum av hele kapsler.',
      inndata: { startdose_mg: 225 },
      forventet: { fra: ['dag 1–14: 112,5 mg', 'dag 15–28: 56,25 mg', 'fra dag 29: seponert'] },
    },
    vedSluttdosen('venlafaksin', 37.5),
  ],
})

const duloksetin = nedtrappingsregel({
  nokkel: 'duloksetin',
  kode: 'Du',
  dose: DULOXETIN.dose,
  seponering: DULOXETIN.seponering,
  doseomrade: [30, 120],
  sluttdose: { mg: 30, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (startdosen ved generalisert angstlidelse).' },
  kildetro: 'Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.',
  eksempler: [
    { id: 'fra-120-mg', beskrivelse: 'Fra 120 mg, høyeste dose.', inndata: { startdose_mg: 120 }, forventet: { fra: ['dag 1–14: 60 mg', 'dag 15–28: 30 mg', 'fra dag 29: seponert'] } },
    { id: 'fra-60-mg', beskrivelse: 'Fra 60 mg, vanlig dose.', inndata: { startdose_mg: 60 }, forventet: { fra: ['dag 1–14: 30 mg', 'fra dag 15: seponert'] } },
    { id: 'fra-90-mg', beskrivelse: 'Fra 90 mg: 45 mg, som ikke er en sum av hele kapsler på 30 og 60 mg.', inndata: { startdose_mg: 90 }, forventet: { fra: ['dag 1–14: 45 mg', 'fra dag 15: seponert'] } },
    vedSluttdosen('duloksetin', 30),
  ],
})

const mirtazapin = nedtrappingsregel({
  nokkel: 'mirtazapin',
  kode: 'Mz',
  dose: SPC_AD.remeronDose,
  seponering: REMERON.seponering,
  doseomrade: [15, 45],
  sluttdose: { mg: 15, hvorfor: 'Sluttdosen er laveste dose i preparatomtalen (startdosen).' },
  kildetro: 'Mirtazapin avsluttes gradvis; preparatomtalen oppgir ingen varighet.',
  minste_varighet: {
    parameter: forslag(14, 'dager', 'Preparatomtalen sier «gradvis» uten varighet; minst ett trinn på 14 dager.', { art: 'bindende_krav', henvisninger: [REMERON.seponering, NICE.vurdering] }),
    tekst: utsagn('«Gradvis» er lest som minst ett trinn på 14 dager; blir planen kortere, stopper beregningen.', REMERON.seponering, NICE.vurdering),
  },
  ekstra: { usikkerhet: ['Minimumet på 14 dager er OUSFARs tolkning av «gradvis»; preparatomtalen oppgir ingen varighet.'] },
  eksempler: [
    { id: 'fra-45-mg', beskrivelse: 'Fra 45 mg, høyeste dose: 22,5 mg; neste halvering er under 15 mg.', inndata: { startdose_mg: 45 }, forventet: { fra: ['dag 1–14: 22,5 mg', 'fra dag 15: seponert'] } },
    { id: 'fra-30-mg', beskrivelse: 'Fra 30 mg.', inndata: { startdose_mg: 30 }, forventet: { fra: ['dag 1–14: 15 mg', 'fra dag 15: seponert'] } },
    vedSluttdosen('mirtazapin', 15),
  ],
})

const NICE_GENERELT = utsagn('NICE beskriver trinnvis nedtrapping av antidepressiva generelt, med tempo etter pasientens seponeringssymptomer.', NICE.andel, NICE.tempo)

const vortioksetin = fagtekstregel({
  nokkel: 'vortioksetin',
  kode: 'Vo',
  kildetro: [
    utsagn('Vortioksetin kan trappes gradvis ned, men preparatomtalen gir ingen nedtrappingsplan.', P.brintellixSeponering),
    utsagn('Dosen er 5–20 mg daglig; 10 mg er start- og anbefalt dose hos voksne under 65 år.', P.brintellixDose),
    NICE_GENERELT,
  ],
  tilpasninger: [utsagn('OUSFAR beregner ingen plan for vortioksetin, fordi preparatomtalen sier at datagrunnlaget ikke er stort nok til en anbefalt nedtrappingsplan. Nedtrappingen vurderes individuelt.', P.brintellixSeponering)],
  usikkerhet: ['Om en generell prosentvis nedtrapping etter NICE likevel skal kunne beregnes for vortioksetin, er et åpent faglig spørsmål.'],
})

const agomelatin = fagtekstregel({
  nokkel: 'agomelatin',
  kode: 'Ag',
  kildetro: [utsagn('Agomelatin seponeres uten nedtrapping.', P.valdoxanSeponering), utsagn('Anbefalt dose er 25 mg ved sengetid, eventuelt 50 mg.', P.valdoxanDose), NICE_GENERELT],
  tilpasninger: [utsagn('OUSFAR beregner ingen plan for agomelatin, fordi preparatomtalen sier at nedtrapping ikke trengs.', P.valdoxanSeponering)],
  usikkerhet: [
    'NICE beskriver trinnvis nedtrapping av antidepressiva generelt, mens preparatomtalen sier at agomelatin ikke trenger nedtrapping; hvordan fagteksten skal forholde seg til begge, må avklares faglig.',
    'Preparatomtalen er EU-preparatomtalen for Valdoxan; i Norge finnes agomelatin bare som preparat med godkjenningsfritak (FEST 08.10.2026).',
  ],
})

const bupropion = fagtekstregel({
  nokkel: 'bupropion',
  kode: 'Bu',
  kildetro: [
    utsagn('En nedtrappingsperiode bør vurderes, men preparatomtalen gir ingen plan.', P.wellbutrinSeponering),
    utsagn('Tablettene kan ikke deles.', P.wellbutrinHele),
    utsagn('Dosen er 150 eller 300 mg én gang daglig.', P.wellbutrinDose),
  ],
  tilpasninger: [
    utsagn(
      'OUSFAR beregner ingen plan for bupropion: preparatomtalen gir ingen nedtrappingsplan, og fordi tablettene ikke kan deles, er den eneste mulige reduksjonen fra 300 til 150 mg før seponering. Nedtrappingen vurderes individuelt.',
      P.wellbutrinSeponering,
      P.wellbutrinHele,
    ),
  ],
  usikkerhet: ['Om en reduksjon fra 300 til 150 mg før seponering skal kunne beregnes, er et åpent faglig spørsmål.'],
})

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Regelutkast for nedtrapping til seponering av antidepressiva (P7): halvering etter NICE der preparatomtalen gir grunnlag, paroksetin etter preparatomtalens regime, og fagtekst der kildene ikke gir grunnlag for en beregning. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [agomelatin, bupropion, citalopram, duloksetin, fluoksetin, fluvoksamin, mirtazapin, paroksetin, sertralin, venlafaksin, vortioksetin],
}
