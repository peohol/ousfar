/**
 * Nedtrappingsreglene i P7 (`docs/verktøy-p7-nedtrapping.md`): utkast til
 * OUSFARs egne regler for seponering av hvert antidepressiv der det finnes
 * forsvarlig kildegrunnlag, laget per virkestoff fra preparatomtalen og NICE.
 * Hvilke virkestoffer som har regel, bare fagtekst, mangler anbefaling eller
 * har en annen begrensning, står i dekningen (`verktoy/nedtrappingsdekning.ts`).
 *
 * Reglene følger ett felles prinsipp, skrevet ut i hver regel så det kan
 * kontrolleres: halvering av aktuell dose (NICEs eksempel), mindre trinn
 * (25 %) fra laveste dose preparatomtalen oppgir når den er over sluttdosen,
 * 14 dager per trinn, og seponering når neste dose blir under sluttdosen.
 * Sluttdosen er halvparten av laveste registrerte styrke når FEST oppgir at
 * den kan deles, ellers styrken selv. Der preparatomtalen sier noe annet om
 * stoffet, er det tatt inn og begrunnet i regelen (paroksetin, fluoksetin).
 *
 * Reglene gir ideelle doser og har **ingen toleranse**: en dose som ikke kan
 * gis nøyaktig med norske preparater, gir en forklart stopp i doseplanmotoren
 * (P5), ikke et avvik fra regelen. **Ingen regel er klinisk godkjent.** Alle
 * er til uavhengig faglig kontroll (P7.5), og verdiene som er OUSFARs valg, er
 * åpne forslag. Psychiatrienet står bare som referanse til Stop-oppføringen
 * fra P3; ingen regel bygger på eller gjengir teksten der.
 */
import { FORUTSETNINGER_FELLES, forslag, h, halvering, kilde, minst14, NICE, pn, steg, trinn14, utsagn } from './bygg'
import type { Godkjenning, Grunnlag, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Utsagn } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { SPC } from './pilotsett'

/* --- Fakta fra preparatomtalene, med egne ord ----------------------------------------- */

const P7 = {
  sarotexDose: h('dmp-sarotex', 'pkt. 4.2', 'Depresjon: start 50 mg daglig, økes ved behov til 150 mg; eldre starter med 10–25 mg. Ved smerte og migreneprofylakse 25–75 mg daglig, med start 10–25 mg.'),
  sarotexSeponering: h('dmp-sarotex', 'pkt. 4.2 og 4.8', 'Når behandlingen avsluttes, trappes amitriptylin gradvis ned over flere uker; brå seponering etter lang bruk kan gi abstinenssymptomer.'),
  anafranilDose: h('dmp-anafranil', 'pkt. 4.2', 'Depresjon: start 50–75 mg, vanligvis 100–150 mg, høyst 250 mg daglig. Panikklidelse: start 10 mg, vanligvis 25–100 mg, høyst 150 mg. Eldre: start 10 mg.'),
  anafranilSeponering: h('dmp-anafranil', 'pkt. 4.2 og 4.4', 'Brå seponering bør unngås; etter jevnlig bruk lenge trappes dosen gradvis ned, og pasienten følges nøye.'),
  noritrenDose: h('dmp-noritren', 'pkt. 4.2', 'Voksne: vanligvis 50–75 mg daglig i starten (25–30 mg ved lettere tilfeller), opptil 150 mg og sjelden 200 mg. Eldre: start 25–30 mg, vedlikehold 25–50 mg.'),
  noritrenVedlikehold: h('dmp-noritren', 'pkt. 4.2', 'Når effekten er inntrådt, holdes dosen minst 2 uker og trappes så gradvis ned, f.eks. 10–25 mg hver 3.–8. dag, til laveste dose som holder symptomene i sjakk.'),
  noritrenSeponering: h('dmp-noritren', 'pkt. 4.4', 'Brå seponering etter lang tids bruk kan gi abstinenssymptomer.'),
  fevarinDose: h('dmp-fevarin', 'pkt. 4.2', 'Depresjon: start 50 eller 100 mg, anbefalt 100 mg, høyst 300 mg daglig.'),
  fevarinSeponering: h('dmp-fevarin', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  seroxatDose: h('dmp-seroxat', 'pkt. 4.2', 'Depresjon: anbefalt 20 mg, høyst 50 mg daglig. Tvangslidelse og panikklidelse: anbefalt 40 mg, høyst 60 mg; ved panikklidelse startes det med 10 mg.'),
  seroxatRegime: h('dmp-seroxat', 'pkt. 4.2', 'I nedtrappingen i de kliniske studiene ble døgndosen redusert med 10 mg hver uke. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  seroxatVarighet: h('dmp-seroxat', 'pkt. 4.4', 'Seponeringsreaksjoner er vanlige; paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.'),
  efexorDose: h('dmp-efexor-depot', 'pkt. 4.2', 'Depresjon: start 75 mg, høyst 375 mg daglig. Panikklidelse: 37,5 mg daglig den første uken.'),
  efexorSeponering: h('dmp-efexor-depot', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker, for noen over måneder. Kapslene skal svelges hele.'),
  wellbutrinDose: h('dmp-wellbutrin', 'pkt. 4.2', 'Start 150 mg daglig; kan økes til 300 mg. Tablettene skal ikke deles, knuses eller tygges.'),
  wellbutrinSeponering: h('dmp-wellbutrin', 'pkt. 4.2', 'Seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes; en nedtrappingsperiode bør vurderes.'),
  aurorixDose: h('dmp-aurorix', 'pkt. 4.2', 'Start 300 mg daglig fordelt på to doser; kan økes til 600 mg. Ved alvorlig nedsatt leverfunksjon halveres dosen eller senkes til en tredjedel.'),
  aurorixSeponering: h('dmp-aurorix', 'pkt. 4.2', 'Preparatomtalen gir ingen anvisning om nedtrapping; et annet antidepressiv kan startes dagen etter at moklobemid er avsluttet.'),
  cymbaltaDose: h('ema-cymbalta', 'section 4.2', 'Depresjon: start og anbefalt dose 60 mg daglig; opptil 120 mg er undersøkt. Generalisert angstlidelse: start 30 mg.'),
  cymbaltaSeponering: h('ema-cymbalta', 'section 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.'),
  brintellixDose: h('ema-brintellix', 'section 4.2', 'Start og anbefalt dose 10 mg daglig hos voksne under 65 år; 5–20 mg etter respons.'),
  brintellixSeponering: h('ema-brintellix', 'section 4.2', 'Gradvis dosereduksjon kan vurderes for å unngå seponeringssymptomer, men data er for få til å anbefale en bestemt nedtrappingsplan.'),
  valdoxanDose: h('ema-valdoxan', 'section 4.2', 'Anbefalt dose 25 mg ved sengetid; kan økes til 50 mg.'),
  valdoxanSeponering: h('ema-valdoxan', 'section 4.2', 'Ingen nedtrapping er nødvendig når behandlingen avsluttes.'),
}

/** FEST-uttrekket styrkene og delingen i sluttdosene er lest fra (`fest-formuleringer.json`, P1). */
export const FEST_UTTREKK = '08.10.2026'

/* --- Felles byggesteiner for P7 ------------------------------------------------------- */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P7.5). Ikke klinisk godkjent.'
const tilKontroll = (): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [steg('utkast', 1, 'Utkast til nedtrappingsregel (P7.2).'), steg('til_faglig_kontroll', 1, TIL_KONTROLL)],
})

const tall = (x: number) => String(x).replace('.', ',')

/** Laveste registrerte styrke i FEST, og om minst ett preparat i den styrken er oppgitt som delbart i 2. */
export interface Laveste {
  mg: number
  delbar: boolean
}

/** Sluttdosen: halvparten av laveste registrerte styrke når den kan deles, ellers styrken selv. */
export const sluttdoseFor = (l: Laveste) => (l.delbar ? l.mg / 2 : l.mg)

const sluttdose = (l: Laveste): Parameter =>
  forslag(
    sluttdoseFor(l),
    'mg',
    l.delbar
      ? `Halvparten av laveste registrerte styrke (${tall(l.mg)} mg), som FEST oppgir som delbar i 2 for minst ett preparat (uttrekk ${FEST_UTTREKK}); under den seponeres.`
      : `Laveste registrerte styrke (${tall(l.mg)} mg) i FEST (uttrekk ${FEST_UTTREKK}), som ikke er oppgitt som delbar; under den seponeres.`,
  )

/** Mindre trinn fra laveste dose preparatomtalen oppgir, når den er over sluttdosen. */
const lavtTrinn = (grense: number, dose: Kildehenvisning) => ({
  prosent: forslag(25, 'prosent', 'Eksempelet i NICE på mindre trinn ved lav dose.', { henvisninger: [NICE.andel] }),
  grense: forslag(grense, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [dose] }),
})

/** «Gradvis» uten varighet i preparatomtalen, lest som minst 14 dager som for SSRI-ene; et åpent forslag. */
const gradvis14 = (seponering: Kildehenvisning) =>
  forslag(14, 'dager', 'Preparatomtalen sier gradvis nedtrapping uten varighet; OUSFAR foreslår minst 14 dager, som for preparatene der den sier minst én til to uker.', {
    art: 'bindende_krav',
    henvisninger: [seponering],
  })

const verdi = (p: Parameter | undefined) => p?.verdi ?? null

/** OUSFARs valg i en regel, skrevet ut fra verdiene så teksten aldri kan avvike fra dem. */
function valgtekst(s: Nedtrappingsstrategi, trinnlengde: Parameter, minste?: Parameter): string {
  const minst = minste ? ` Nedtrappingen skal vare minst ${verdi(minste)} dager; blir den kortere, stopper beregningen.` : ''
  if (s.type === 'absolutt') return `Døgndosen reduseres med ${tall(verdi(s.mg)!)} mg hver ${verdi(trinnlengde)}. dag til null.${minst}`
  if (s.type !== 'prosent_av_aktuell') throw new Error(`Strategien ${s.type} brukes ikke i P7`)
  const lav = s.lav_grense_mg ? ` ned til ${tall(verdi(s.lav_grense_mg)!)} mg og deretter ${verdi(s.lav_prosent)} %` : ''
  return `OUSFAR trapper ned med ${verdi(s.prosent)} % av aktuell dose${lav}, med ${verdi(trinnlengde)} dager per trinn, og seponerer når neste dose blir under ${tall(verdi(s.sluttdose_mg)!)} mg.${minst}`
}

const eks = (id: string, beskrivelse: string, startdose_mg: number, forventet: string[]): Regneeksempel => ({ id, beskrivelse, inndata: { startdose_mg }, forventet: { fra: forventet } })
const stopp = (id: string, beskrivelse: string, startdose_mg: number, grunn: RegExp): Regneeksempel => ({ id, beskrivelse, inndata: { startdose_mg }, forventet: {}, stopp: grunn })

interface Stoffregel {
  nokkel: string
  /** Virkestoffnavnet i tittel og tekst, med liten forbokstav. */
  navn: string
  /** Raden i Psychiatrienets antidepressivtabell; regelen viser til Stop-oppføringen der. */
  kode: string
  /** Dosene regelen gjelder for, med grunnlaget (normalt preparatomtalens doseområde). */
  omrade: [number, number]
  omradeGrunnlag: Kildehenvisning
  /** Laveste registrerte styrke i FEST; gir sluttdosen i det felles prinsippet. */
  laveste?: Laveste
  /** Grensen for lav dose (mg) og kildestedet den er hentet fra; da brukes mindre trinn under den. */
  lav?: [number, Kildehenvisning]
  /** En annen strategi enn det felles prinsippet, begrunnet i regelen. */
  strategi?: Nedtrappingsstrategi
  trinnlengde?: Parameter
  minste_varighet?: Parameter
  kildetro: Utsagn[]
  /** Begrunnelser for valg utover det felles prinsippet. */
  tilpasninger?: Utsagn[]
  forutsetninger?: string[]
  usikkerhet: string[]
  eksempler: Regneeksempel[]
}

const FELLES_USIKKERHET = [
  'Prosentene, grensen for lav dose og sluttdosen er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.',
  'Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.',
  'Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5. Om regelen skal ha en toleranse eller bruke flytende form, er et faglig valg.',
]

function strategiFor(s: Stoffregel): Nedtrappingsstrategi {
  if (s.strategi) return s.strategi
  if (!s.laveste) throw new Error(`${s.nokkel}: regelen mangler laveste styrke eller egen strategi`)
  return halvering(sluttdose(s.laveste), s.lav && lavtTrinn(...s.lav))
}

function seponeringsregel(s: Stoffregel): Regel {
  const strategi = strategiFor(s)
  const trinnlengde = s.trinnlengde ?? trinn14('Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste.')
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  const omradeGrunnlag: Grunnlag = { type: 'kilde', henvisninger: [s.omradeGrunnlag] }
  return {
    id: `seponering-${s.nokkel}`,
    versjon: 1,
    tittel: `Seponering av ${s.navn}, ${strategi.type === 'absolutt' ? 'nedtrapping i faste trinn' : 'gjentatt prosentvis nedtrapping'}`,
    fra: virkestoff,
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff,
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'nedtrapping', strategi, trinnlengde, ...(s.minste_varighet ? { minste_varighet: s.minste_varighet } : {}) }],
        },
      ],
    },
    inndata: [{ navn: 'startdose', omrade: s.omrade, art: 'bindende_krav', grunnlag: omradeGrunnlag }],
    bekreftelser: [],
    unntak: [],
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [...s.kildetro, utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo), utsagn('Det bør gå én til to uker mellom reduksjonene.', NICE.vurdering)],
      tilpasninger: [utsagn(valgtekst(strategi, trinnlengde, s.minste_varighet), NICE.andel, NICE.vurdering), ...(s.tilpasninger ?? [])],
      forutsetninger: [...FORUTSETNINGER_FELLES, 'Planen gjelder seponering, ikke bytte til et annet antidepressiv.', ...(s.forutsetninger ?? [])],
      usikkerhet: [...FELLES_USIKKERHET, ...s.usikkerhet],
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    eksempler: s.eksempler,
    godkjenning: tilKontroll(),
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const FOR_KORT = /kortere enn 14 dager/
const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)

/* --- Reglene ------------------------------------------------------------------------ */

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  omrade: [10, 40],
  omradeGrunnlag: SPC.cipramilDose,
  laveste: { mg: 10, delbar: false },
  minste_varighet: minst14(SPC.cipramilSeponering),
  kildetro: [utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering)],
  usikkerhet: ['Laveste dose preparatomtalen oppgir (10 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose; doser under 10 mg krever deling av 10 mg, som FEST ikke oppgir, eller flytende form.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: halvering til 10 mg, så seponering.', 40, ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: ett trinn på 10 mg.', 20, ['dag 1–14: 10 mg', 'fra dag 15: seponert']),
    stopp('fra-10-mg', 'Fra 10 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 14 dager, så beregningen stopper.', 10, FOR_KORT),
  ],
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  omrade: [25, 200],
  omradeGrunnlag: SPC.zoloftDose,
  laveste: { mg: 25, delbar: false },
  minste_varighet: minst14(SPC.zoloftSeponering),
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: ['Laveste dose preparatomtalen oppgir (25 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.'],
  eksempler: [
    eks('fra-200-mg', 'Fra 200 mg: halvering til 25 mg, så seponering (langvarig).', 200, ['dag 1–14: 100 mg', 'dag 15–28: 50 mg', 'dag 29–42: 25 mg', 'fra dag 43: seponert']),
    eks('fra-150-mg', 'Fra 150 mg: 37,5 mg er et ideelt trinn som må kunne gis med preparatene (P5).', 150, ['dag 1–14: 75 mg', 'dag 15–28: 37,5 mg', 'fra dag 29: seponert']),
    stopp('fra-25-mg', 'Fra 25 mg blir nedtrappingen kortere enn 14 dager, så beregningen stopper.', 25, FOR_KORT),
    stopp('over-maksimum', '250 mg er over dosene regelen gjelder for.', 250, utenfor(250)),
  ],
})

const fluoksetin = stoff({
  nokkel: 'fluoksetin',
  navn: 'fluoksetin',
  kode: 'Fo',
  omrade: [20, 60],
  omradeGrunnlag: SPC.fluoksetinDose,
  laveste: { mg: 20, delbar: true },
  minste_varighet: minst14(SPC.fluoksetinSeponering),
  kildetro: [
    utsagn('Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.', SPC.fluoksetinSeponering),
    utsagn('Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.', NICE.fluoksetin),
  ],
  tilpasninger: [
    utsagn(
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.',
      SPC.fluoksetinSeponering,
    ),
  ],
  usikkerhet: ['Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halv tablett (10 mg) i stedet.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: 20 mg og 10 mg (halv tablett), så seponering.', 40, ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: ett trinn på 10 mg.', 20, ['dag 1–14: 10 mg', 'fra dag 15: seponert']),
    eks('fra-60-mg', 'Fra 60 mg: 15 mg er et ideelt trinn som må kunne gis med preparatene (P5).', 60, ['dag 1–14: 30 mg', 'dag 15–28: 15 mg', 'fra dag 29: seponert']),
  ],
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  omrade: [50, 300],
  omradeGrunnlag: P7.fevarinDose,
  laveste: { mg: 50, delbar: true },
  lav: [50, P7.fevarinDose],
  minste_varighet: minst14(P7.fevarinSeponering),
  kildetro: [utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering)],
  usikkerhet: [],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 25 mg.', 100, ['dag 1–14: 50 mg', 'dag 15–28: 37,5 mg', 'dag 29–42: 28,13 mg', 'fra dag 43: seponert']),
    eks('fra-300-mg', 'Fra 300 mg (høyeste dose): langvarig nedtrapping.', 300, ['dag 1–14: 150 mg', 'dag 15–28: 75 mg', 'dag 29–42: 37,5 mg', 'dag 43–56: 28,13 mg', 'fra dag 57: seponert']),
  ],
})

const venlafaksin = stoff({
  nokkel: 'venlafaksin',
  navn: 'venlafaksin',
  kode: 'Ve',
  omrade: [37.5, 375],
  omradeGrunnlag: P7.efexorDose,
  laveste: { mg: 37.5, delbar: false },
  minste_varighet: minst14(P7.efexorSeponering),
  kildetro: [utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering)],
  forutsetninger: ['Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'],
  usikkerhet: ['Laveste dose preparatomtalen oppgir (37,5 mg) er lik sluttdosen, så regelen har ikke mindre trinn ved lav dose. Venlafaksin har kort halveringstid og er kjent for seponeringssymptomer; om trinnet fra 37,5 mg til null er forsvarlig, må vurderes faglig.'],
  eksempler: [
    eks('fra-150-mg', 'Fra 150 mg: 75 mg og 37,5 mg, så seponering.', 150, ['dag 1–14: 75 mg', 'dag 15–28: 37,5 mg', 'fra dag 29: seponert']),
    eks('fra-225-mg', 'Fra 225 mg: 56,25 mg er et ideelt trinn som ikke kan gis med kapsler på 37,5, 75 og 150 mg (P5 stopper).', 225, ['dag 1–14: 112,5 mg', 'dag 15–28: 56,25 mg', 'fra dag 29: seponert']),
    stopp('fra-37-5-mg', 'Fra 37,5 mg blir nedtrappingen kortere enn 14 dager.', 37.5, FOR_KORT),
  ],
})

const duloksetin = stoff({
  nokkel: 'duloksetin',
  navn: 'duloksetin',
  kode: 'Du',
  omrade: [30, 120],
  omradeGrunnlag: P7.cymbaltaDose,
  laveste: { mg: 30, delbar: false },
  minste_varighet: minst14(P7.cymbaltaSeponering),
  kildetro: [utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering)],
  forutsetninger: ['Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'],
  usikkerhet: ['Fra 30 mg kan ingen nedtrapping gis med registrerte kapsler; da stopper beregningen.'],
  eksempler: [
    eks('fra-120-mg', 'Fra 120 mg: 60 mg og 30 mg, så seponering.', 120, ['dag 1–14: 60 mg', 'dag 15–28: 30 mg', 'fra dag 29: seponert']),
    eks('fra-60-mg', 'Fra 60 mg: ett trinn på 30 mg.', 60, ['dag 1–14: 30 mg', 'fra dag 15: seponert']),
    stopp('fra-30-mg', 'Fra 30 mg blir nedtrappingen kortere enn 14 dager (manglende lavere styrke).', 30, FOR_KORT),
  ],
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  omrade: [5, 20],
  omradeGrunnlag: P7.brintellixDose,
  laveste: { mg: 5, delbar: false },
  kildetro: [utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering)],
  tilpasninger: [utsagn('Preparatomtalen krever ingen minste varighet, så regelen har ingen; fra 5 mg seponeres vortioksetin uten nedtrapping.', P7.brintellixSeponering)],
  usikkerhet: ['Nedtrappingen bygger på NICEs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg: 10 mg og 5 mg, så seponering.', 20, ['dag 1–14: 10 mg', 'dag 15–28: 5 mg', 'fra dag 29: seponert']),
    eks('fra-5-mg', 'Fra laveste dose seponeres vortioksetin fra dag 1.', 5, ['fra dag 1: seponert']),
  ],
})

const bupropion = stoff({
  nokkel: 'bupropion',
  navn: 'bupropion',
  kode: 'Bu',
  omrade: [150, 300],
  omradeGrunnlag: P7.wellbutrinDose,
  laveste: { mg: 150, delbar: false },
  kildetro: [utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering)],
  tilpasninger: [utsagn('Med 150 og 300 mg som ikke kan deles, er eneste mulige nedtrapping 300 → 150 mg; fra 150 mg seponeres bupropion uten nedtrapping.', P7.wellbutrinDose)],
  forutsetninger: ['Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.'],
  usikkerhet: ['Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.'],
  eksempler: [
    eks('fra-300-mg', 'Fra 300 mg: 150 mg i 14 dager, så seponering.', 300, ['dag 1–14: 150 mg', 'fra dag 15: seponert']),
    eks('fra-150-mg', 'Fra 150 mg seponeres bupropion fra dag 1.', 150, ['fra dag 1: seponert']),
  ],
})

const moklobemid = stoff({
  nokkel: 'moklobemid',
  navn: 'moklobemid',
  kode: 'Mo',
  omrade: [300, 600],
  omradeGrunnlag: P7.aurorixDose,
  laveste: { mg: 150, delbar: false },
  lav: [300, P7.aurorixDose],
  kildetro: [utsagn('Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.', P7.aurorixSeponering)],
  tilpasninger: [utsagn('Regelen bygger på NICEs generelle råd om gradvis nedtrapping av antidepressiva; preparatomtalen krever ingen minste varighet, så regelen har ingen.', NICE.andel)],
  forutsetninger: ['Doser under 300 mg ved nedsatt leverfunksjon omfattes ikke av regelen.'],
  usikkerhet: ['Det er ikke avklart om moklobemid, som er en reversibel MAO-hemmer med kort virketid, trenger nedtrapping.'],
  eksempler: [
    eks('fra-600-mg', 'Fra 600 mg: 300 mg, så 25 % per trinn til neste dose er under 150 mg.', 600, ['dag 1–14: 300 mg', 'dag 15–28: 225 mg', 'dag 29–42: 168,75 mg', 'fra dag 43: seponert']),
    eks('fra-300-mg', 'Fra 300 mg: 25 % per trinn fra første trinn.', 300, ['dag 1–14: 225 mg', 'dag 15–28: 168,75 mg', 'fra dag 29: seponert']),
  ],
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  omrade: [15, 45],
  omradeGrunnlag: SPC.remeronDose,
  laveste: { mg: 15, delbar: true },
  lav: [15, SPC.remeronDose],
  minste_varighet: gradvis14(SPC.remeronDose),
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose)],
  usikkerhet: ['Smeltetablettene deles ikke; halve doser krever tabletter som FEST oppgir som delbare.'],
  eksempler: [
    eks('fra-30-mg', 'Fra 30 mg: 15 mg, så 25 % per trinn til neste dose er under 7,5 mg.', 30, ['dag 1–14: 15 mg', 'dag 15–28: 11,25 mg', 'dag 29–42: 8,44 mg', 'fra dag 43: seponert']),
    eks('fra-15-mg', 'Fra 15 mg, på grensen: 25 % fra første trinn.', 15, ['dag 1–14: 11,25 mg', 'dag 15–28: 8,44 mg', 'fra dag 29: seponert']),
  ],
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  omrade: [10, 150],
  omradeGrunnlag: P7.sarotexDose,
  laveste: { mg: 10, delbar: false },
  minste_varighet: gradvis14(P7.sarotexSeponering),
  kildetro: [utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering)],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.'],
  usikkerhet: ['«Over flere uker» er ikke et tall; 14 dager som minimum er OUSFARs forslag og kan være for kort.', 'Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 og 37,5 mg) kan derfor ikke gis nøyaktig.'],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: halvering til neste dose er under 10 mg (langvarig).', 100, ['dag 1–14: 50 mg', 'dag 15–28: 25 mg', 'dag 29–42: 12,5 mg', 'fra dag 43: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: ett trinn på 10 mg.', 20, ['dag 1–14: 10 mg', 'fra dag 15: seponert']),
    stopp('fra-10-mg', 'Fra 10 mg blir nedtrappingen kortere enn 14 dager.', 10, FOR_KORT),
  ],
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  omrade: [10, 250],
  omradeGrunnlag: P7.anafranilDose,
  laveste: { mg: 10, delbar: true },
  lav: [10, P7.anafranilDose],
  minste_varighet: gradvis14(P7.anafranilSeponering),
  kildetro: [utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering)],
  usikkerhet: ['Fra høye doser blir planen lang (12 uker fra 150 mg); flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [
    eks('fra-150-mg', 'Fra 150 mg: halvering ned til 10 mg, så 25 % til neste dose er under 5 mg (langvarig).', 150, [
      'dag 1–14: 75 mg',
      'dag 15–28: 37,5 mg',
      'dag 29–42: 18,75 mg',
      'dag 43–56: 9,38 mg',
      'dag 57–70: 7,03 mg',
      'dag 71–84: 5,27 mg',
      'fra dag 85: seponert',
    ]),
    eks('fra-50-mg', 'Fra 50 mg: 25 og 12,5 mg kan gis med halve tabletter; 6,25 mg er et ideelt trinn P5 må kunne gi.', 50, ['dag 1–14: 25 mg', 'dag 15–28: 12,5 mg', 'dag 29–42: 6,25 mg', 'fra dag 43: seponert']),
  ],
})

const nortriptylin = stoff({
  nokkel: 'nortriptylin',
  navn: 'nortriptylin',
  kode: 'No',
  omrade: [25, 200],
  omradeGrunnlag: P7.noritrenDose,
  laveste: { mg: 10, delbar: false },
  lav: [25, P7.noritrenDose],
  minste_varighet: gradvis14(P7.noritrenSeponering),
  kildetro: [utsagn('Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.', P7.noritrenSeponering)],
  tilpasninger: [utsagn('Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.', P7.noritrenVedlikehold)],
  usikkerhet: ['Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 10 mg.', 50, ['dag 1–14: 25 mg', 'dag 15–28: 18,75 mg', 'dag 29–42: 14,06 mg', 'dag 43–56: 10,55 mg', 'fra dag 57: seponert']),
  ],
})

const paroksetin = stoff({
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  omrade: [10, 60],
  omradeGrunnlag: P7.seroxatDose,
  strategi: { type: 'absolutt', mg: kilde(10, 'mg', 'veiledende_preferanse', P7.seroxatRegime) },
  trinnlengde: forslag(7, 'dager', 'Ukentlige trinn som i studiene i preparatomtalen; at studienedtrappingen brukes som regel, er OUSFARs valg.', { henvisninger: [P7.seroxatRegime] }),
  kildetro: [
    utsagn('I de kliniske studiene ble døgndosen av paroksetin redusert med 10 mg hver uke.', P7.seroxatRegime),
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
  ],
  tilpasninger: [
    utsagn(
      'Regelen følger nedtrappingen fra studiene i preparatomtalen (10 mg per uke) i stedet for det felles prinsippet. Den er en rask kildevariant: fra 20 mg er planen én uke.',
      P7.seroxatRegime,
    ),
  ],
  usikkerhet: [
    'Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder) og enn NICE; om regelen skal ha lengre trinn eller mindre trinn ved lav dose, må avgjøres faglig.',
    'Fra 10 mg seponeres paroksetin fra dag 1, fordi 10 mg er ett trinn.',
  ],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: 10 mg mindre hver uke.', 40, ['dag 1–7: 30 mg', 'dag 8–14: 20 mg', 'dag 15–21: 10 mg', 'fra dag 22: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: én uke på 10 mg (rask).', 20, ['dag 1–7: 10 mg', 'fra dag 8: seponert']),
  ],
})

/** Agomelatin: preparatomtalen sier at det ikke trengs nedtrapping. Bare fagtekst, ingen beregning. */
const agomelatin: Regel = {
  id: 'seponering-agomelatin',
  versjon: 1,
  tittel: 'Seponering av agomelatin',
  fra: { type: 'virkestoff', nokkel: 'agomelatin' },
  til: null,
  plan: {
    form: 'seponering',
    forlop: [{ id: 'fra', virkestoff: { type: 'virkestoff', nokkel: 'agomelatin' }, administrasjon: 'peroral', utgangsdose: 'startdose', start: { type: 'dag', dag: 1 }, faser: [{ type: 'seponer' }] }],
  },
  inndata: [{ navn: 'startdose', omrade: [25, 50], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [P7.valdoxanDose] } }],
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'bare_tekstlig',
  fortolkning: {
    kildetro: [utsagn('Agomelatin kan seponeres uten nedtrapping.', P7.valdoxanSeponering)],
    tilpasninger: [utsagn('OUSFAR beregner ingen nedtrappingsplan for agomelatin. I Norge finnes agomelatin bare med godkjenningsfritak.')],
    forutsetninger: [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), 'Gjelder seponering, ikke bytte til et annet antidepressiv.'],
    usikkerhet: ['Preparatomtalen er den sentralt godkjente fra EMA; det finnes ingen norsk preparatomtale fordi preparatet ikke er markedsført i Norge.'],
  },
  referanser: [pn('SwitchAntidepressants:Ag>Stop')],
  eksempler: [],
  godkjenning: tilKontroll(),
}

const STOFFER = [amitriptylin, bupropion, citalopram, duloksetin, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, venlafaksin, vortioksetin]

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen og NICE. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [...STOFFER.map(seponeringsregel), agomelatin],
}

/** Laveste registrerte styrke i FEST per virkestoff som sluttdosen er regnet fra (kontrolleres mot FEST-uttrekket i testene). */
export const LAVESTE_STYRKE: Readonly<Record<string, Laveste>> = Object.fromEntries(STOFFER.flatMap((s) => (s.laveste ? [[s.nokkel, s.laveste]] : [])))
