/**
 * Nedtrappingsreglene i P7 (`docs/verktøy-p7-nedtrapping.md`): utkast til
 * OUSFARs egne regler for seponering av hvert antidepressiv der det finnes
 * forsvarlig kildegrunnlag, laget per virkestoff fra preparatomtalen og NICE.
 * Hvilke virkestoffer som har regel, bare fagtekst, mangler anbefaling eller
 * har en annen begrensning, står i dekningen (`verktoy/dekning.ts`).
 *
 * Reglene følger ett felles prinsipp, skrevet ut i hver regel så det kan
 * kontrolleres: halvering av aktuell dose (NICEs eksempel), mindre trinn
 * (25 %) fra laveste døgndose preparatomtalen oppgir, 14 dager per trinn, og
 * seponering når neste dose blir under sluttdosen, som er en firedel av den
 * laveste døgndosen. Sluttdosen er et klinisk valg, ikke en tablettstyrke.
 * Paroksetin og venlafaksin har en langsom variant (25 % fra første trinn),
 * og fluoksetin har ikke mindre trinn ved lav dose.
 *
 * Hver plan er et **startforslag**: forskriveren må bekrefte det, og regelen
 * gjelder ikke når et tidligere forsøk har gitt seponeringssymptomer. Reglene
 * gir ideelle doser og har **ingen toleranse**: en dose som ikke kan gis
 * nøyaktig med norske preparater, gir en forklart stopp i doseplanmotoren
 * (P5), ikke et avvik fra regelen. **Ingen regel er klinisk godkjent.** Alle
 * er til uavhengig faglig kontroll (P7.5), og verdiene som er OUSFARs valg, er
 * åpne forslag. Paroksetins raske studievariant ligger i et eget
 * sammenligningssett, ikke i verktøyet. Psychiatrienet står bare som
 * referanse til Stop-oppføringen fra P3; ingen regel bygger på eller gjengir
 * teksten der.
 */
import { FORUTSETNINGER_FELLES, forslag, h, halvering, kilde, minst14, NICE, pn, steg, trinn14, utsagn } from './bygg'
import type { Bekreftelse, Godkjenning, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Unntak, Utsagn } from './modell'
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

/* --- Felles byggesteiner for P7 ------------------------------------------------------- */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P7.5). Ikke klinisk godkjent.'
const UTKAST = steg('utkast', 1, 'Utkast til nedtrappingsregel (P7.2).')
const tilKontroll = (versjon: number) => steg('til_faglig_kontroll', versjon, TIL_KONTROLL)
const OMARBEIDET =
  'Omarbeidet etter første uavhengige kontroll (P7.5): startforslag som må bekreftes, unntak ved tidligere seponeringssymptomer, klinisk sluttdose uavhengig av styrkene, langsom variant der NICE krever særlig varsomhet, begrunnede minstevarigheter og lave restdoser.'

const tall = (x: number) => String(x).replace('.', ',')
const verdi = (p: Parameter | undefined) => p?.verdi ?? null

/** Bekreftelsen hver beregnbar regel krever: planen er et startforslag, ikke en fast tidsplan. */
export const STARTFORSLAG: Bekreftelse = {
  id: 'startforslag',
  tekst:
    'Planen er et startforslag. Trinn og tempo tilpasses behandlingstiden, legemidlets egenskaper og pasientens ønsker, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige.',
  grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.halveringstid] },
}

/** Unntaket hver beregnbar regel har: etter seponeringssymptomer ved et tidligere forsøk trengs en individuell, langsommere plan. */
export const TIDLIGERE_SYMPTOMER: Unntak = {
  id: 'tidligere_seponeringssymptomer',
  tekst: 'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.',
  grunnlag: {
    type: 'ousfar_vurdering',
    begrunnelse: 'NICE anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen.',
    henvisninger: [NICE.tidligere, NICE.alvorlig],
    avklaring: null,
  },
}

/** Laveste og høyeste døgndose preparatomtalen oppgir for voksne, med kildestedet. */
interface Doser {
  lavest: number
  hoyest: number
  kilde: Kildehenvisning
}

/** Sluttdosen: en firedel av laveste døgndose, valgt klinisk og uavhengig av hvilke styrker som finnes. */
const sluttdose = (d: Doser): Parameter =>
  forslag(
    d.lavest / 4,
    'mg',
    `En firedel av laveste døgndose preparatomtalen oppgir for voksne (${tall(d.lavest)} mg); under den seponeres. Kildene oppgir ingen sluttdose. Den er valgt klinisk, ikke etter styrkene: om dosene kan gis med norske preparater, avgjøres i P5.`,
    { henvisninger: [d.kilde, NICE.andel, NICE.flytende] },
  )

/** Mindre trinn (25 %) fra laveste døgndose preparatomtalen oppgir. */
const lavtTrinn = (d: Doser) => ({
  prosent: forslag(25, 'prosent', 'Eksempelet i NICE på mindre trinn ved lav dose.', { henvisninger: [NICE.andel] }),
  grense: forslag(d.lavest, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [d.kilde] }),
})

/** Langsom variant: 25 % fra første trinn for stoffene NICE nevner særskilt. */
const langsomt = (d: Doser): Nedtrappingsstrategi => ({
  type: 'prosent_av_aktuell',
  prosent: forslag(25, 'prosent', 'Langsom variant: NICEs eksempel på mindre trinn (25 %) brukes fra første trinn, fordi NICE nevner stoffet blant dem som oftere gir seponeringssymptomer og krever særlig varsomhet.', {
    henvisninger: [NICE.andel, NICE.saerligRisiko],
  }),
  sluttdose_mg: sluttdose(d),
})

/** Minst fire uker der preparatomtalen sier «flere uker» eller bare «gradvis»; et åpent forslag, ikke et tall fra kilden. */
const fireUker = (lesning: string, seponering: Kildehenvisning) =>
  forslag(28, 'dager', `${lesning} 28 dager er OUSFARs forslag, ikke et tall fra kilden, og må vurderes faglig.`, { art: 'bindende_krav', henvisninger: [seponering, NICE.tempo] })

const GRADVIS = 'Preparatomtalen sier gradvis nedtrapping uten varighet; NICE sier at nedtrapping kan ta uker til måneder.'

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
  dose: Doser
  /** Langsom variant (25 % fra første trinn), eller ingen mindre trinn ved lav dose; ellers det felles prinsippet. */
  trinn?: 'langsom' | 'uten_lavt'
  /** En variant ved siden av stoffets regel, med egen strategi; bare i sammenligningssettet. */
  variant?: { id: string; tittel: string; merknad: string; strategi: Nedtrappingsstrategi; trinnlengde: Parameter }
  minste_varighet?: Parameter
  /** Unntak for stoffet i tillegg til tidligere seponeringssymptomer. */
  unntak?: Unntak[]
  kildetro: Utsagn[]
  /** Begrunnelser for valg utover det felles prinsippet. */
  tilpasninger?: Utsagn[]
  forutsetninger?: string[]
  usikkerhet: string[]
  /** Eksemplene med bekreftelse og alle unntak avkreftet; kontrolleksemplene uten dem legges til av {@link seponeringsregel}. */
  eksempler: Regneeksempel[]
}

const FORUTSETNINGER_P7 = [
  'Planen gjelder seponering, ikke bytte til et annet antidepressiv.',
  'Beregningen kjenner bare dosen. Den kan ikke avgjøre trinnstørrelse og tempo for pasienten, fordi den ikke vet behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; forskriveren bekrefter derfor at planen er et startforslag.',
]

const FELLES_USIKKERHET = [
  'Prosentene, grensen for lav dose, sluttdosen og trinnlengden er NICEs eksempler eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.',
  'Lang behandlingstid og kort halveringstid kan kreve mindre trinn og lengre tid (NICE 1.4.16); planen justeres ikke for det, og det faktiske tempoet styres av seponeringssymptomene.',
  'Sluttdosen er en klinisk grense, ikke en styrke. Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.',
]

function strategiFor(s: Stoffregel): Nedtrappingsstrategi {
  if (s.variant) return s.variant.strategi
  if (s.trinn === 'langsom') return langsomt(s.dose)
  return halvering(sluttdose(s.dose), s.trinn === 'uten_lavt' ? undefined : lavtTrinn(s.dose))
}

const TITTEL: Record<Nedtrappingsstrategi['type'], string> = {
  prosent_av_aktuell: 'gjentatt prosentvis nedtrapping',
  prosent_av_startdose: 'nedtrapping i like trinn',
  absolutt: 'nedtrapping i faste trinn',
  hyperbolsk: 'hyperbolsk nedtrapping',
}

function seponeringsregel(s: Stoffregel): Regel {
  const strategi = strategiFor(s)
  const trinnlengde = s.variant?.trinnlengde ?? trinn14('Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste.')
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  const nedre = strategi.type === 'prosent_av_aktuell' ? verdi(strategi.sluttdose_mg)! : s.dose.lavest
  const unntak = [TIDLIGERE_SYMPTOMER, ...(s.unntak ?? [])]
  const avkreftet = Object.fromEntries(unntak.map((u) => [u.id, false]))
  const besvart = (e: Regneeksempel): Regneeksempel => ({ ...e, inndata: { bekreftet: [STARTFORSLAG.id], pasientforhold: avkreftet, ...e.inndata } })
  const start = s.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
  const versjon = s.variant ? 1 : 2
  const godkjenning: Godkjenning = {
    status: 'til_faglig_kontroll',
    historikk: s.variant ? [steg('utkast', 1, s.variant.merknad), tilKontroll(1)] : [UTKAST, tilKontroll(1), steg('utkast', 2, OMARBEIDET), tilKontroll(2)],
  }
  return {
    id: `seponering-${s.nokkel}${s.variant ? `-${s.variant.id}` : ''}`,
    versjon,
    tittel: `Seponering av ${s.navn}, ${s.variant?.tittel ?? (s.trinn === 'langsom' ? 'langsom prosentvis nedtrapping' : TITTEL[strategi.type])}`,
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
    inndata: [
      {
        navn: 'startdose',
        omrade: [nedre, s.dose.hoyest],
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse: `Fra ${tall(nedre)} mg, der nedtrappingen slutter, til høyeste døgndose preparatomtalen oppgir (${tall(s.dose.hoyest)} mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem.`,
          henvisninger: [s.dose.kilde],
          avklaring: null,
        },
      },
    ],
    bekreftelser: [STARTFORSLAG],
    unntak,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        ...s.kildetro,
        utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
        utsagn('Det bør gå én til to uker mellom reduksjonene.', NICE.vurdering),
      ],
      tilpasninger: [
        utsagn(valgtekst(strategi, trinnlengde, s.minste_varighet), NICE.andel, NICE.vurdering),
        utsagn('Planen er et startforslag som forskriveren må bekrefte; har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, og en individuelt langsommere plan trengs.', NICE.tempo, NICE.tidligere, NICE.alvorlig),
        ...(s.tilpasninger ?? []),
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, ...FORUTSETNINGER_P7, ...(s.forutsetninger ?? [])],
      usikkerhet: [...FELLES_USIKKERHET, ...s.usikkerhet],
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    eksempler: [
      ...s.eksempler.map(besvart),
      { id: 'uten-bekreftelse', beskrivelse: 'Uten bekreftelse av at planen er et startforslag, stopper beregningen.', inndata: { startdose_mg: start, pasientforhold: avkreftet }, forventet: {}, stopp: /Må bekreftes før beregning: Planen er et startforslag/ },
      {
        id: 'tidligere-symptomer',
        beskrivelse: 'Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.',
        inndata: { startdose_mg: start, bekreftet: [STARTFORSLAG.id], pasientforhold: { ...avkreftet, [TIDLIGERE_SYMPTOMER.id]: true } },
        forventet: {},
        stopp: /Regelen gjelder ikke: Et tidligere forsøk/,
      },
    ],
    godkjenning,
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const kortere = (dager: number) => new RegExp(`kortere enn ${dager} dager`)
const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)

/* --- Reglene ------------------------------------------------------------------------ */

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  dose: { lavest: 10, hoyest: 40, kilde: SPC.cipramilDose },
  minste_varighet: minst14(SPC.cipramilSeponering),
  kildetro: [utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering)],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: halvering til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg (langvarig).', 40, [
      'dag 1–14: 20 mg',
      'dag 15–28: 10 mg',
      'dag 29–42: 7,5 mg',
      'dag 43–56: 5,63 mg',
      'dag 57–70: 4,22 mg',
      'dag 71–84: 3,16 mg',
      'fra dag 85: seponert',
    ]),
    eks('fra-20-mg', 'Fra 20 mg: ett halveringstrinn, så 25 % per trinn.', 20, ['dag 1–14: 10 mg', 'dag 15–28: 7,5 mg', 'dag 29–42: 5,63 mg', 'dag 43–56: 4,22 mg', 'dag 57–70: 3,16 mg', 'fra dag 71: seponert']),
    eks('fra-10-mg', 'Fra 10 mg, på grensen: 25 % fra første trinn.', 10, ['dag 1–14: 7,5 mg', 'dag 15–28: 5,63 mg', 'dag 29–42: 4,22 mg', 'dag 43–56: 3,16 mg', 'fra dag 57: seponert']),
    stopp('fra-2-5-mg', 'Fra sluttdosen (2,5 mg) blir nedtrappingen kortere enn 14 dager, så beregningen stopper.', 2.5, kortere(14)),
    stopp('under-sluttdosen', '2 mg er under sluttdosen, der regelen ikke gir noen nedtrapping.', 2, utenfor(2)),
  ],
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  dose: { lavest: 25, hoyest: 200, kilde: SPC.zoloftDose },
  minste_varighet: minst14(SPC.zoloftSeponering),
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: ['Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.'],
  eksempler: [
    eks('fra-200-mg', 'Fra 200 mg: halvering til 25 mg, så 25 % per trinn til neste dose er under 6,25 mg (langvarig).', 200, [
      'dag 1–14: 100 mg',
      'dag 15–28: 50 mg',
      'dag 29–42: 25 mg',
      'dag 43–56: 18,75 mg',
      'dag 57–70: 14,06 mg',
      'dag 71–84: 10,55 mg',
      'dag 85–98: 7,91 mg',
      'fra dag 99: seponert',
    ]),
    eks('fra-50-mg', 'Fra 50 mg: 25 mg, så 25 % per trinn.', 50, ['dag 1–14: 25 mg', 'dag 15–28: 18,75 mg', 'dag 29–42: 14,06 mg', 'dag 43–56: 10,55 mg', 'dag 57–70: 7,91 mg', 'fra dag 71: seponert']),
    eks('fra-12-5-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 12.5, ['dag 1–14: 9,38 mg', 'dag 15–28: 7,03 mg', 'fra dag 29: seponert']),
    stopp('under-sluttdosen', '6 mg er under sluttdosen, der regelen ikke gir noen nedtrapping.', 6, utenfor(6)),
    stopp('over-maksimum', '250 mg er over dosene regelen gjelder for.', 250, utenfor(250)),
  ],
})

const fluoksetin = stoff({
  nokkel: 'fluoksetin',
  navn: 'fluoksetin',
  kode: 'Fo',
  dose: { lavest: 20, hoyest: 60, kilde: SPC.fluoksetinDose },
  trinn: 'uten_lavt',
  minste_varighet: minst14(SPC.fluoksetinSeponering),
  kildetro: [
    utsagn('Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.', SPC.fluoksetinSeponering),
    utsagn('Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.', NICE.fluoksetin),
  ],
  tilpasninger: [
    utsagn(
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.',
      SPC.fluoksetinSeponering,
      NICE.fluoksetin,
    ),
  ],
  usikkerhet: ['Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halve doser i stedet, og 5 mg krever flytende form eller deling i fire.'],
  eksempler: [
    eks('fra-60-mg', 'Fra 60 mg: halvering til neste dose er under 5 mg.', 60, ['dag 1–14: 30 mg', 'dag 15–28: 15 mg', 'dag 29–42: 7,5 mg', 'fra dag 43: seponert']),
    eks('fra-40-mg', 'Fra 40 mg: 20, 10 og 5 mg, så seponering.', 40, ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'dag 29–42: 5 mg', 'fra dag 43: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: 10 og 5 mg.', 20, ['dag 1–14: 10 mg', 'dag 15–28: 5 mg', 'fra dag 29: seponert']),
    stopp('fra-7-mg', 'Fra 7 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 14 dager.', 7, kortere(14)),
  ],
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  dose: { lavest: 50, hoyest: 300, kilde: P7.fevarinDose },
  minste_varighet: minst14(P7.fevarinSeponering),
  kildetro: [utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering)],
  usikkerhet: [],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 12,5 mg.', 100, ['dag 1–14: 50 mg', 'dag 15–28: 37,5 mg', 'dag 29–42: 28,13 mg', 'dag 43–56: 21,09 mg', 'dag 57–70: 15,82 mg', 'fra dag 71: seponert']),
    eks('fra-300-mg', 'Fra 300 mg (høyeste dose): langvarig nedtrapping.', 300, [
      'dag 1–14: 150 mg',
      'dag 15–28: 75 mg',
      'dag 29–42: 37,5 mg',
      'dag 43–56: 28,13 mg',
      'dag 57–70: 21,09 mg',
      'dag 71–84: 15,82 mg',
      'fra dag 85: seponert',
    ]),
  ],
})

const venlafaksin = stoff({
  nokkel: 'venlafaksin',
  navn: 'venlafaksin',
  kode: 'Ve',
  dose: { lavest: 37.5, hoyest: 375, kilde: P7.efexorDose },
  trinn: 'langsom',
  minste_varighet: minst14(P7.efexorSeponering),
  kildetro: [
    utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering),
    utsagn('Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko),
  ],
  forutsetninger: ['Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'],
  usikkerhet: [
    'De fleste trinnene i den langsomme varianten kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.',
    'Om 25 % fra første trinn er langsomt nok, eller unødvendig langsomt ved høye doser, er ikke avklart.',
  ],
  eksempler: [
    eks('fra-150-mg', 'Fra 150 mg: 25 % per trinn til neste dose er under 9,38 mg (langvarig).', 150, [
      'dag 1–14: 112,5 mg',
      'dag 15–28: 84,38 mg',
      'dag 29–42: 63,28 mg',
      'dag 43–56: 47,46 mg',
      'dag 57–70: 35,6 mg',
      'dag 71–84: 26,7 mg',
      'dag 85–98: 20,02 mg',
      'dag 99–112: 15,02 mg',
      'dag 113–126: 11,26 mg',
      'fra dag 127: seponert',
    ]),
    eks('fra-37-5-mg', 'Fra laveste døgndose fortsetter nedtrappingen under den.', 37.5, ['dag 1–14: 28,13 mg', 'dag 15–28: 21,09 mg', 'dag 29–42: 15,82 mg', 'dag 43–56: 11,87 mg', 'fra dag 57: seponert']),
  ],
})

const duloksetin = stoff({
  nokkel: 'duloksetin',
  navn: 'duloksetin',
  kode: 'Du',
  dose: { lavest: 30, hoyest: 120, kilde: P7.cymbaltaDose },
  minste_varighet: minst14(P7.cymbaltaSeponering),
  kildetro: [utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering)],
  forutsetninger: ['Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'],
  usikkerhet: ['Trinnene under 30 mg kan ikke gis med registrerte kapsler; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.'],
  eksempler: [
    eks('fra-120-mg', 'Fra 120 mg: 60 og 30 mg, så 25 % per trinn til neste dose er under 7,5 mg.', 120, [
      'dag 1–14: 60 mg',
      'dag 15–28: 30 mg',
      'dag 29–42: 22,5 mg',
      'dag 43–56: 16,88 mg',
      'dag 57–70: 12,66 mg',
      'dag 71–84: 9,49 mg',
      'fra dag 85: seponert',
    ]),
    eks('fra-30-mg', 'Fra 30 mg fortsetter nedtrappingen under laveste styrke.', 30, ['dag 1–14: 22,5 mg', 'dag 15–28: 16,88 mg', 'dag 29–42: 12,66 mg', 'dag 43–56: 9,49 mg', 'fra dag 57: seponert']),
  ],
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  dose: { lavest: 5, hoyest: 20, kilde: P7.brintellixDose },
  kildetro: [utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering)],
  tilpasninger: [utsagn('Preparatomtalen krever ingen minste varighet, så regelen har ingen.', P7.brintellixSeponering)],
  usikkerhet: ['Nedtrappingen bygger på NICEs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.', 'Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg: 10 og 5 mg, så 25 % per trinn til neste dose er under 1,25 mg.', 20, [
      'dag 1–14: 10 mg',
      'dag 15–28: 5 mg',
      'dag 29–42: 3,75 mg',
      'dag 43–56: 2,81 mg',
      'dag 57–70: 2,11 mg',
      'dag 71–84: 1,58 mg',
      'fra dag 85: seponert',
    ]),
    eks('fra-1-25-mg', 'Fra sluttdosen seponeres vortioksetin fra dag 1, fordi regelen ikke har noen minste varighet.', 1.25, ['fra dag 1: seponert']),
  ],
})

const bupropion = stoff({
  nokkel: 'bupropion',
  navn: 'bupropion',
  kode: 'Bu',
  dose: { lavest: 150, hoyest: 300, kilde: P7.wellbutrinDose },
  kildetro: [utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering)],
  tilpasninger: [utsagn('Preparatomtalen krever ingen minste varighet, så regelen har ingen.', P7.wellbutrinSeponering)],
  forutsetninger: ['Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.'],
  usikkerhet: [
    'Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.',
    'Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.',
  ],
  eksempler: [
    eks('fra-300-mg', 'Fra 300 mg: 150 mg, så 25 % per trinn til neste dose er under 37,5 mg.', 300, ['dag 1–14: 150 mg', 'dag 15–28: 112,5 mg', 'dag 29–42: 84,38 mg', 'dag 43–56: 63,28 mg', 'dag 57–70: 47,46 mg', 'fra dag 71: seponert']),
    eks('fra-150-mg', 'Fra 150 mg: 25 % per trinn.', 150, ['dag 1–14: 112,5 mg', 'dag 15–28: 84,38 mg', 'dag 29–42: 63,28 mg', 'dag 43–56: 47,46 mg', 'fra dag 57: seponert']),
  ],
})

const moklobemid = stoff({
  nokkel: 'moklobemid',
  navn: 'moklobemid',
  kode: 'Mo',
  dose: { lavest: 300, hoyest: 600, kilde: P7.aurorixDose },
  unntak: [
    {
      id: 'nedsatt_leverfunksjon',
      tekst: 'Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [P7.aurorixDose] },
    },
  ],
  kildetro: [utsagn('Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.', P7.aurorixSeponering)],
  tilpasninger: [utsagn('Regelen bygger på NICEs generelle råd om gradvis nedtrapping av antidepressiva; preparatomtalen krever ingen minste varighet, så regelen har ingen.', NICE.andel)],
  usikkerhet: ['Det er ikke avklart om moklobemid, som er en reversibel MAO-hemmer med kort virketid, trenger nedtrapping.', 'Trinn som 225 mg krever deling av 150 mg, som FEST ikke oppgir; uten det stopper P5.'],
  eksempler: [
    eks('fra-600-mg', 'Fra 600 mg: 300 mg, så 25 % per trinn til neste dose er under 75 mg.', 600, ['dag 1–14: 300 mg', 'dag 15–28: 225 mg', 'dag 29–42: 168,75 mg', 'dag 43–56: 126,56 mg', 'dag 57–70: 94,92 mg', 'fra dag 71: seponert']),
    eks('fra-300-mg', 'Fra 300 mg: 25 % per trinn fra første trinn.', 300, ['dag 1–14: 225 mg', 'dag 15–28: 168,75 mg', 'dag 29–42: 126,56 mg', 'dag 43–56: 94,92 mg', 'fra dag 57: seponert']),
  ],
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  dose: { lavest: 15, hoyest: 45, kilde: SPC.remeronDose },
  minste_varighet: fireUker(GRADVIS, SPC.remeronDose),
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose)],
  usikkerhet: ['Smeltetablettene deles ikke; halve doser krever tabletter som FEST oppgir som delbare, og mindre doser flytende form.'],
  eksempler: [
    eks('fra-30-mg', 'Fra 30 mg: 15 mg, så 25 % per trinn til neste dose er under 3,75 mg.', 30, ['dag 1–14: 15 mg', 'dag 15–28: 11,25 mg', 'dag 29–42: 8,44 mg', 'dag 43–56: 6,33 mg', 'dag 57–70: 4,75 mg', 'fra dag 71: seponert']),
    eks('fra-15-mg', 'Fra 15 mg, på grensen: 25 % fra første trinn.', 15, ['dag 1–14: 11,25 mg', 'dag 15–28: 8,44 mg', 'dag 29–42: 6,33 mg', 'dag 43–56: 4,75 mg', 'fra dag 57: seponert']),
    stopp('fra-5-mg', 'Fra 5 mg blir nedtrappingen 14 dager, kortere enn 28 dager.', 5, kortere(28)),
  ],
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  dose: { lavest: 10, hoyest: 150, kilde: P7.sarotexDose },
  minste_varighet: fireUker('«Over flere uker» er lest som minst fire uker.', P7.sarotexSeponering),
  kildetro: [utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering)],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.'],
  usikkerhet: ['Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 mg og alt under 10 mg) kan derfor ikke gis nøyaktig, og P5 stopper.'],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: halvering ned til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg (langvarig).', 100, [
      'dag 1–14: 50 mg',
      'dag 15–28: 25 mg',
      'dag 29–42: 12,5 mg',
      'dag 43–56: 6,25 mg',
      'dag 57–70: 4,69 mg',
      'dag 71–84: 3,52 mg',
      'dag 85–98: 2,64 mg',
      'fra dag 99: seponert',
    ]),
    eks('fra-10-mg', 'Fra 10 mg: 25 % fra første trinn.', 10, ['dag 1–14: 7,5 mg', 'dag 15–28: 5,63 mg', 'dag 29–42: 4,22 mg', 'dag 43–56: 3,16 mg', 'fra dag 57: seponert']),
    stopp('fra-4-mg', 'Fra 4 mg blir nedtrappingen 14 dager, kortere enn 28 dager.', 4, kortere(28)),
  ],
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  dose: { lavest: 10, hoyest: 250, kilde: P7.anafranilDose },
  minste_varighet: fireUker(GRADVIS, P7.anafranilSeponering),
  kildetro: [utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering)],
  usikkerhet: ['Fra høye doser blir planen lang (16 uker fra 150 mg); flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [
    eks('fra-150-mg', 'Fra 150 mg: halvering ned til 10 mg, så 25 % til neste dose er under 2,5 mg (langvarig).', 150, [
      'dag 1–14: 75 mg',
      'dag 15–28: 37,5 mg',
      'dag 29–42: 18,75 mg',
      'dag 43–56: 9,38 mg',
      'dag 57–70: 7,03 mg',
      'dag 71–84: 5,27 mg',
      'dag 85–98: 3,96 mg',
      'dag 99–112: 2,97 mg',
      'fra dag 113: seponert',
    ]),
    eks('fra-50-mg', 'Fra 50 mg: 25 og 12,5 mg kan gis med halve tabletter; de lavere trinnene må P5 kunne gi.', 50, [
      'dag 1–14: 25 mg',
      'dag 15–28: 12,5 mg',
      'dag 29–42: 6,25 mg',
      'dag 43–56: 4,69 mg',
      'dag 57–70: 3,52 mg',
      'dag 71–84: 2,64 mg',
      'fra dag 85: seponert',
    ]),
  ],
})

const nortriptylin = stoff({
  nokkel: 'nortriptylin',
  navn: 'nortriptylin',
  kode: 'No',
  dose: { lavest: 25, hoyest: 200, kilde: P7.noritrenDose },
  minste_varighet: fireUker('Preparatomtalen sier ikke hvordan nortriptylin trappes ned ved seponering, bare at brå seponering kan gi abstinenssymptomer; NICE sier at nedtrapping kan ta uker til måneder.', P7.noritrenSeponering),
  kildetro: [utsagn('Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.', P7.noritrenSeponering)],
  tilpasninger: [utsagn('Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.', P7.noritrenVedlikehold)],
  usikkerhet: ['Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.', 50, ['dag 1–14: 25 mg', 'dag 15–28: 18,75 mg', 'dag 29–42: 14,06 mg', 'dag 43–56: 10,55 mg', 'dag 57–70: 7,91 mg', 'fra dag 71: seponert']),
    eks('fra-15-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 15, ['dag 1–14: 11,25 mg', 'dag 15–28: 8,44 mg', 'dag 29–42: 6,33 mg', 'fra dag 43: seponert']),
    stopp('fra-10-mg', 'Fra 10 mg blir nedtrappingen 14 dager, kortere enn 28 dager.', 10, kortere(28)),
  ],
})

const PAROKSETIN = {
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  dose: { lavest: 10, hoyest: 60, kilde: P7.seroxatDose },
}

const paroksetin = stoff({
  ...PAROKSETIN,
  trinn: 'langsom',
  minste_varighet: fireUker('«Flere uker eller måneder» er lest som minst fire uker.', P7.seroxatVarighet),
  kildetro: [
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
    utsagn('Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', P7.seroxatRegime),
    utsagn('Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko),
  ],
  tilpasninger: [
    utsagn(
      'Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) brukes ikke som regel; den ligger som rask studievariant i sammenligningssettet og er ikke en klinisk anbefaling ved langvarig behandling.',
      P7.seroxatRegime,
      P7.seroxatVarighet,
    ),
  ],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg eller flytende form (mikstur); uten det stopper P5.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: 25 % per trinn til neste dose er under 2,5 mg (langvarig).', 40, [
      'dag 1–14: 30 mg',
      'dag 15–28: 22,5 mg',
      'dag 29–42: 16,88 mg',
      'dag 43–56: 12,66 mg',
      'dag 57–70: 9,49 mg',
      'dag 71–84: 7,12 mg',
      'dag 85–98: 5,34 mg',
      'dag 99–112: 4 mg',
      'dag 113–126: 3 mg',
      'fra dag 127: seponert',
    ]),
    eks('fra-20-mg', 'Fra 20 mg: 25 % per trinn.', 20, [
      'dag 1–14: 15 mg',
      'dag 15–28: 11,25 mg',
      'dag 29–42: 8,44 mg',
      'dag 43–56: 6,33 mg',
      'dag 57–70: 4,75 mg',
      'dag 71–84: 3,56 mg',
      'dag 85–98: 2,67 mg',
      'fra dag 99: seponert',
    ]),
    eks('fra-10-mg', 'Fra 10 mg fortsetter nedtrappingen under laveste døgndose.', 10, ['dag 1–14: 7,5 mg', 'dag 15–28: 5,63 mg', 'dag 29–42: 4,22 mg', 'dag 43–56: 3,16 mg', 'fra dag 57: seponert']),
  ],
})

/** Paroksetins raske studievariant: bare til sammenligning, ikke i verktøyet og ikke en klinisk anbefaling. */
const paroksetinStudievariant = stoff({
  ...PAROKSETIN,
  variant: {
    id: 'studievariant',
    tittel: 'rask studievariant til sammenligning (ikke klinisk anbefaling)',
    merknad: 'Skilt ut fra seponering-paroksetin versjon 1 etter første uavhengige kontroll (P7.5): beholdes bare som rask studievariant til sammenligning, ikke som klinisk anbefaling ved langvarig behandling.',
    strategi: { type: 'absolutt', mg: kilde(10, 'mg', 'veiledende_preferanse', P7.seroxatRegime) },
    trinnlengde: forslag(7, 'dager', 'Ukentlige trinn som i studiene i preparatomtalen; at studienedtrappingen regnes ut til sammenligning, er OUSFARs valg.', { henvisninger: [P7.seroxatRegime] }),
  },
  kildetro: [
    utsagn('I de kliniske studiene ble døgndosen av paroksetin redusert med 10 mg hver uke.', P7.seroxatRegime),
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
  ],
  tilpasninger: [utsagn('Varianten er bare til sammenligning med den langsomme regelen og vises ikke i verktøyet.', P7.seroxatRegime)],
  usikkerhet: ['Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder) og enn NICE, og er ikke en klinisk anbefaling ved langvarig behandling.'],
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
  godkjenning: { status: 'til_faglig_kontroll', historikk: [UTKAST, tilKontroll(1)] },
}

const STOFFER = [amitriptylin, bupropion, citalopram, duloksetin, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, venlafaksin, vortioksetin]

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 2,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen og NICE. Hver plan er et startforslag. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [...STOFFER.map(seponeringsregel), agomelatin],
}

/**
 * Varianter som bare regnes ut til sammenligning med reglene i verktøyet
 * (P7.5), f.eks. en rask studienedtrapping. De er ikke i verktøyets
 * regelsett og er ikke kliniske anbefalinger.
 */
export const SAMMENLIGNINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping-sammenligning',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Varianter til sammenligning med nedtrappingsreglene (P7.5). Ikke i verktøyet og ikke kliniske anbefalinger; til faglig kontroll.',
  regler: [seponeringsregel(paroksetinStudievariant)],
}
