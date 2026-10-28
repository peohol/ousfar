/**
 * Nedtrappingsreglene i P7 (`docs/verktøy-p7-nedtrapping.md`): utkast til
 * OUSFARs egne regler for seponering av hvert antidepressiv der det finnes
 * forsvarlig kildegrunnlag, laget per virkestoff fra preparatomtalen, NICE og
 * Royal College of Psychiatrists (RCPsych). Hvilke virkestoffer som har regel,
 * bare fagtekst, mangler anbefaling eller har en annen begrensning, står i
 * dekningen (`verktoy/dekning.ts`).
 *
 * Reglene følger ett felles prinsipp, skrevet ut i hver regel så det kan
 * kontrolleres. Trinnstørrelsen følger risikoen for seponeringssymptomer
 * (RCPsych): om lag 50 % av aktuell dose ved middels eller lavere risiko, med
 * mindre trinn (25 %) fra laveste døgndose i preparatomtalen, og om lag 10 %
 * ved høyest risiko. Trinnene varer 14 dager (28 for fluoksetin), og hele
 * nedtrappingen minst 28 dager. Forskriveren kan velge reduksjon per trinn og
 * dager per trinn innenfor områdene regelen oppgir. Under sluttdosen, en
 * firedel av laveste døgndose, seponeres det; sluttdosen er en uavklart
 * modellforutsetning, ikke en validert klinisk terskel.
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
import { FORUTSETNINGER_FELLES, fluoksetinTrinn28, forslag, h, kilde, NICE, pn, RCPSYCH, steg, utsagn } from './bygg'
import type { Bekreftelse, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Unntak, Utsagn } from './modell'
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
const tilKontroll = (versjon: number) => steg('til_faglig_kontroll', versjon, TIL_KONTROLL)
/** Hva som er endret i hver versjon; regelversjonen er antallet. */
const UTKAST = 'Utkast til nedtrappingsregel (P7.2).'
const KONTROLL_1 =
  'Omarbeidet etter første uavhengige kontroll (P7.5): startforslag som må bekreftes, unntak ved tidligere seponeringssymptomer, sluttdose uavhengig av styrkene, langsom variant der NICE krever særlig varsomhet, begrunnede minstevarigheter og lave restdoser.'
const KONTROLL_2 =
  'Omarbeidet etter andre uavhengige kontroll (P7.5): trinnlengden bygger på RCPsych, ikke NICEs råd om fluoksetin; trinnstørrelsen følger risikoen for seponeringssymptomer; forskriveren kan justere trinnstørrelse og trinnlengde innenfor et område; sluttdosen er merket som uavklart modellforutsetning; minst 28 dager.'
const historikk = (merknader: string[]) => merknader.flatMap((m, i) => [steg('utkast', i + 1, m), tilKontroll(i + 1)])

const tall = (x: number) => String(x).replace('.', ',')
const verdi = (p: Parameter | undefined) => p?.verdi ?? null

/** Bekreftelsen hver beregnbar regel krever: planen er et startforslag, ikke en fast tidsplan. */
export const STARTFORSLAG: Bekreftelse = {
  id: 'startforslag',
  tekst:
    'Planen er et startforslag. Jeg har vurdert behandlingstiden, legemidlets halveringstid, tidligere seponeringssymptomer og pasientens ønsker, og valgt trinnstørrelse og dager per trinn etter det (etter lang bruk anbefaler RCPsych 5–10 % per trinn). Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; trengs mer tid, beregnes en ny plan fra dosen pasienten da bruker.',
  grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.halveringstid, RCPSYCH.plan, RCPSYCH.langvarig] },
}

/** Unntaket hver beregnbar regel har: etter seponeringssymptomer ved et tidligere forsøk trengs en individuell, langsommere plan. */
export const TIDLIGERE_SYMPTOMER: Unntak = {
  id: 'tidligere_seponeringssymptomer',
  tekst: 'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da trengs en individuelt langsommere plan med mindre trinn.',
  grunnlag: {
    type: 'ousfar_vurdering',
    begrunnelse: 'NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene. Hvor mye langsommere kan ikke utledes av dosen, så regelen beregner ikke planen.',
    henvisninger: [NICE.tidligere, NICE.alvorlig, RCPSYCH.langvarig],
    avklaring: null,
  },
}

/** Feltene forskriveren kan justere, slik de vises i verktøyet. */
export const JUSTERING = { prosent: 'Reduksjon per trinn (% av aktuell dose)', dager: 'Dager per trinn' } as const

/** Laveste og høyeste døgndose preparatomtalen oppgir for voksne, med kildestedet. */
interface Doser {
  lavest: number
  hoyest: number
  kilde: Kildehenvisning
}

/** Sluttdosen: en firedel av laveste døgndose, uavhengig av styrkene. En uavklart modellforutsetning. */
const sluttdose = (d: Doser): Parameter =>
  forslag(
    d.lavest / 4,
    'mg',
    `Uavklart modellforutsetning: en firedel av laveste døgndose preparatomtalen oppgir for voksne (${tall(d.lavest)} mg); under den seponeres. Ingen kilde oppgir en sluttdose, og noen trenger langt lavere doser før seponering. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5. Må vurderes for stoffet før godkjenning.`,
    { henvisninger: [d.kilde, NICE.andel, NICE.flytende, RCPSYCH.lavDose] },
  )

/** Risikoen for seponeringssymptomer (RCPsych, tillegg 1); høyest risiko gir små trinn fra start. */
type Risiko = 'hoy' | 'middels_eller_lav'

const reduksjon = (prosent: number, begrunnelse: string, ...henvisninger: Kildehenvisning[]) =>
  forslag(prosent, 'prosent', `${begrunnelse} Forskriveren kan velge 5–50 %; 5–10 % passer etter lang bruk (RCPsych).`, { omrade: [5, 50], justerbar: JUSTERING.prosent, henvisninger: [...henvisninger, RCPSYCH.langvarig] })

/** Det felles prinsippet for stoffets risiko, eller halvering uten mindre trinn ved lav dose (fluoksetin). */
function strategi(d: Doser, risiko: Risiko, utenLavtTrinn = false): Nedtrappingsstrategi {
  const sluttdose_mg = sluttdose(d)
  if (risiko === 'hoy') {
    return {
      type: 'prosent_av_aktuell',
      prosent: reduksjon(10, 'Høyest potensiell risiko for seponeringssymptomer: om lag 10 % av aktuell dose per trinn, som RCPsychs utgangspunkt for disse stoffene.', RCPSYCH.hoyRisiko, RCPSYCH.plan),
      sluttdose_mg,
    }
  }
  const prosent = reduksjon(50, 'Middels eller lavere risiko: om lag 50 % av aktuell dose per trinn, som RCPsychs utgangspunkt og NICEs eksempel.', RCPSYCH.middelsRisiko, RCPSYCH.plan, NICE.andel)
  if (utenLavtTrinn) return { type: 'prosent_av_aktuell', prosent, sluttdose_mg }
  return {
    type: 'prosent_av_aktuell',
    prosent,
    lav_prosent: forslag(25, 'prosent', 'Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers.', { henvisninger: [NICE.andel, RCPSYCH.lavDose] }),
    lav_grense_mg: forslag(d.lavest, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [d.kilde] }),
    sluttdose_mg,
  }
}

/** 14 dager per trinn, justerbart til 28: RCPsychs to til fire uker. */
const DAGER_PER_TRINN = forslag(
  14,
  'dager',
  'RCPsych foreslår to til fire uker mellom reduksjonene; OUSFAR foreslår 14 dager som utgangspunkt, og forskriveren kan velge 14–28 dager. Trenger pasienten mer tid på et trinn, beregnes en ny plan fra dosen pasienten da bruker.',
  { omrade: [14, 28], justerbar: JUSTERING.dager, henvisninger: [RCPSYCH.tid, NICE.tempo] },
)

/** Minst 28 dager i alt: RCPsychs «minst fire uker», strengere enn eller i tillegg til preparatomtalen. */
const minst28 = (lesning: string, seponering: Kildehenvisning) =>
  forslag(28, 'dager', `${lesning} RCPsych anbefaler å trappe ned over minst fire uker, også uten seponeringssymptomer. 28 dager er OUSFARs forslag og må vurderes faglig.`, {
    art: 'bindende_krav',
    henvisninger: [seponering, RCPSYCH.fireUker],
  })

const EN_TIL_TO_UKER = 'Preparatomtalen sier minst én til to uker.'
const GRADVIS = 'Preparatomtalen sier gradvis nedtrapping uten varighet.'
const INGEN_VARIGHET = 'Preparatomtalen krever ingen minste varighet.'

const justerbartOmrade = (p: Parameter) => (p.justerbar && p.omrade ? ` (forskriveren kan velge ${tall(p.omrade[0])}–${tall(p.omrade[1])})` : '')

/** OUSFARs valg i en regel, skrevet ut fra verdiene så teksten aldri kan avvike fra dem. */
function valgtekst(s: Nedtrappingsstrategi, trinnlengde: Parameter, minste?: Parameter): string {
  const minst = minste ? ` Nedtrappingen skal vare minst ${verdi(minste)} dager; blir den kortere, stopper beregningen.` : ''
  const dager = `${verdi(trinnlengde)} dager per trinn${justerbartOmrade(trinnlengde)}`
  if (s.type === 'absolutt') return `Døgndosen reduseres med ${tall(verdi(s.mg)!)} mg, ${dager}, til null.${minst}`
  if (s.type !== 'prosent_av_aktuell') throw new Error(`Strategien ${s.type} brukes ikke i P7`)
  const lav = s.lav_grense_mg ? ` ned til ${tall(verdi(s.lav_grense_mg)!)} mg og deretter ${verdi(s.lav_prosent)} %` : ''
  return `OUSFAR trapper ned med ${verdi(s.prosent)} % av aktuell dose${justerbartOmrade(s.prosent)}${lav}, med ${dager}, og seponerer når neste dose blir under ${tall(verdi(s.sluttdose_mg)!)} mg.${minst}`
}

const eks = (id: string, beskrivelse: string, startdose_mg: number, forventet: string[], justert?: Partial<Record<keyof typeof JUSTERING, number>>): Regneeksempel => ({
  id,
  beskrivelse,
  inndata: { startdose_mg, ...(justert && { justert: justert as Record<string, number> }) },
  forventet: { fra: forventet },
})
const stopp = (id: string, beskrivelse: string, startdose_mg: number, grunn: RegExp): Regneeksempel => ({ id, beskrivelse, inndata: { startdose_mg }, forventet: {}, stopp: grunn })

/** Stien til de justerbare parametrene i en regel bygd her. */
const STI = { prosent: 'plan.forlop[0].faser[0].strategi.prosent', dager: 'plan.forlop[0].faser[0].trinnlengde' } as const

interface Stoffregel {
  nokkel: string
  /** Virkestoffnavnet i tittel og tekst, med liten forbokstav. */
  navn: string
  /** Raden i Psychiatrienets antidepressivtabell; regelen viser til Stop-oppføringen der. */
  kode: string
  dose: Doser
  /** Risikoen for seponeringssymptomer etter RCPsych. */
  risiko: Risiko
  /** Fluoksetin: ingen mindre trinn ved lav dose. */
  utenLavtTrinn?: true
  /** En annen trinnlengde enn 14 dager, begrunnet. */
  trinnlengde?: Parameter
  /** Hva preparatomtalen sier om varighet, og kildestedet; gir minstevarigheten. */
  varighet?: [string, Kildehenvisning]
  /** En variant ved siden av stoffets regel, med egen strategi; bare i sammenligningssettet. */
  variant?: { id: string; tittel: string; merknad: string; strategi: Nedtrappingsstrategi; trinnlengde: Parameter }
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
  'Beregningen kjenner bare dosen og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke behandlingstiden, hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn, og kan derfor ikke selv avgjøre tempoet for pasienten; forskriveren bekrefter at planen er et startforslag og velger eventuelt mindre trinn eller lengre tid.',
]

const FELLES_USIKKERHET = [
  'Prosentene, grensen for lav dose, trinnlengden og minstevarigheten er eksempler fra NICE og RCPsych eller OUSFARs valg, ikke empirisk validerte verdier for dette stoffet.',
  'Sluttdosen (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert klinisk terskel; noen trenger langt lavere doser før seponering (RCPsych).',
  'Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.',
]

const TITTEL: Record<Risiko, string> = { hoy: 'langsom prosentvis nedtrapping (høy risiko)', middels_eller_lav: 'gjentatt prosentvis nedtrapping' }

function seponeringsregel(s: Stoffregel): Regel {
  const strat = s.variant?.strategi ?? strategi(s.dose, s.risiko, s.utenLavtTrinn)
  const trinnlengde = s.variant?.trinnlengde ?? s.trinnlengde ?? DAGER_PER_TRINN
  const minste_varighet = s.varighet && minst28(...s.varighet)
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  // En prosentvis regel gjelder enhver lav aktuell dose; under sluttdosen stopper beregningen med den grunnen, ikke fordi dosen er ugyldig.
  const prosentvis = strat.type === 'prosent_av_aktuell'
  const nedre = prosentvis ? 0 : s.dose.lavest
  const unntak = [TIDLIGERE_SYMPTOMER, ...(s.unntak ?? [])]
  const avkreftet = Object.fromEntries(unntak.map((u) => [u.id, false]))
  const besvart = (e: Regneeksempel): Regneeksempel => ({
    ...e,
    inndata: {
      bekreftet: [STARTFORSLAG.id],
      pasientforhold: avkreftet,
      ...e.inndata,
      ...(e.inndata.justert && { justert: Object.fromEntries(Object.entries(e.inndata.justert).map(([k, v]) => [STI[k as keyof typeof STI], v])) }),
    },
  })
  const start = s.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
  const merknader = s.variant ? [s.variant.merknad, KONTROLL_2] : [UTKAST, KONTROLL_1, KONTROLL_2]
  return {
    id: `seponering-${s.nokkel}${s.variant ? `-${s.variant.id}` : ''}`,
    versjon: merknader.length,
    tittel: `Seponering av ${s.navn}, ${s.variant?.tittel ?? TITTEL[s.risiko]}`,
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
          faser: [{ type: 'nedtrapping', strategi: strat, trinnlengde, ...(minste_varighet ? { minste_varighet } : {}) }],
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
          begrunnelse: prosentvis
            ? `Høyst den høyeste døgndosen preparatomtalen oppgir (${tall(s.dose.hoyest)} mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under sluttdosen har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping må vurderes individuelt, uten å kalle dosen ugyldig.`
            : `Fra ${tall(nedre)} mg til høyeste døgndose preparatomtalen oppgir (${tall(s.dose.hoyest)} mg).`,
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
        utsagn('To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.', RCPSYCH.tid, RCPSYCH.plan),
      ],
      tilpasninger: [
        utsagn(valgtekst(strat, trinnlengde, minste_varighet), NICE.andel, RCPSYCH.tid),
        utsagn(
          'Planen er et startforslag som forskriveren må bekrefte, og forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; valget vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.',
          NICE.tempo,
          NICE.tidligere,
          RCPSYCH.smaa,
        ),
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
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(merknader) },
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const KORTERE = /kortere enn 28 dager/
const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)
const UNDER_SLUTTDOSEN = /er under regelens sluttdose .* ingen godkjent videre nedtrapping eller seponering fra en så lav dose/

/* --- Reglene ------------------------------------------------------------------------ */

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  dose: { lavest: 10, hoyest: 40, kilde: SPC.cipramilDose },
  risiko: 'middels_eller_lav',
  varighet: [EN_TIL_TO_UKER, SPC.cipramilSeponering],
  kildetro: [utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering)],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg: ett halveringstrinn til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg.', 20, ['dag 1–14: 10 mg', 'dag 15–28: 7,5 mg', 'dag 29–42: 5,63 mg', 'dag 43–56: 4,22 mg', 'dag 57–70: 3,16 mg', 'fra dag 71: seponert']),
    eks('fra-10-mg', 'Fra 10 mg, på grensen: 25 % fra første trinn.', 10, ['dag 1–14: 7,5 mg', 'dag 15–28: 5,63 mg', 'dag 29–42: 4,22 mg', 'dag 43–56: 3,16 mg', 'fra dag 57: seponert']),
    stopp('fra-3-34-mg', 'Fra 3,34 mg blir nedtrappingen 14 dager, kortere enn 28 dager, så beregningen stopper.', 3.34, KORTERE),
    stopp('under-sluttdosen', '2 mg er under sluttdosen: regelen har ingen videre nedtrapping, og beregningen sier det.', 2, UNDER_SLUTTDOSEN),
  ],
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  dose: { lavest: 25, hoyest: 200, kilde: SPC.zoloftDose },
  risiko: 'middels_eller_lav',
  varighet: [EN_TIL_TO_UKER, SPC.zoloftSeponering],
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: ['Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.'],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: halvering til 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.', 100, [
      'dag 1–14: 50 mg',
      'dag 15–28: 25 mg',
      'dag 29–42: 18,75 mg',
      'dag 43–56: 14,06 mg',
      'dag 57–70: 10,55 mg',
      'dag 71–84: 7,91 mg',
      'fra dag 85: seponert',
    ]),
    eks(
      'fra-200-mg-langsomt',
      'Fra 200 mg med forskriverens valg av 25 % og 28 dager per trinn, f.eks. etter lang behandlingstid.',
      200,
      [
        'dag 1–28: 150 mg',
        'dag 29–56: 112,5 mg',
        'dag 57–84: 84,38 mg',
        'dag 85–112: 63,28 mg',
        'dag 113–140: 47,46 mg',
        'dag 141–168: 35,6 mg',
        'dag 169–196: 26,7 mg',
        'dag 197–224: 20,02 mg',
        'dag 225–252: 15,02 mg',
        'dag 253–280: 11,26 mg',
        'dag 281–308: 8,45 mg',
        'dag 309–336: 6,34 mg',
        'fra dag 337: seponert',
      ],
      { prosent: 25, dager: 28 },
    ),
    eks('fra-12-5-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 12.5, ['dag 1–14: 9,38 mg', 'dag 15–28: 7,03 mg', 'fra dag 29: seponert']),
    stopp('under-sluttdosen', '6 mg er under sluttdosen: regelen har ingen videre nedtrapping, og beregningen sier det.', 6, UNDER_SLUTTDOSEN),
    stopp('over-maksimum', '250 mg er over dosene regelen gjelder for.', 250, utenfor(250)),
  ],
})

const fluoksetin = stoff({
  nokkel: 'fluoksetin',
  navn: 'fluoksetin',
  kode: 'Fo',
  dose: { lavest: 20, hoyest: 60, kilde: SPC.fluoksetinDose },
  risiko: 'middels_eller_lav',
  utenLavtTrinn: true,
  trinnlengde: fluoksetinTrinn28(),
  varighet: [EN_TIL_TO_UKER, SPC.fluoksetinSeponering],
  kildetro: [
    utsagn('Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.', SPC.fluoksetinSeponering),
    utsagn('Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.', NICE.fluoksetin),
    utsagn('Seponeringssymptomer kan komme dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.', RCPSYCH.fluoksetin),
  ],
  tilpasninger: [
    utsagn(
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.',
      SPC.fluoksetinSeponering,
      NICE.fluoksetin,
    ),
    utsagn('Trinnene varer 28 dager og kan ikke kortes ned.', RCPSYCH.fluoksetin),
  ],
  usikkerhet: ['Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir halve doser i stedet, og 5 mg krever flytende form eller deling i fire.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg: 20, 10 og 5 mg med 28 dager per trinn.', 40, ['dag 1–28: 20 mg', 'dag 29–56: 10 mg', 'dag 57–84: 5 mg', 'fra dag 85: seponert']),
    eks('fra-20-mg', 'Fra 20 mg: 10 og 5 mg.', 20, ['dag 1–28: 10 mg', 'dag 29–56: 5 mg', 'fra dag 57: seponert']),
    stopp('fra-7-mg', 'Fra 7 mg er neste dose under sluttdosen; nedtrappingen blir kortere enn 28 dager.', 7, KORTERE),
  ],
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  dose: { lavest: 50, hoyest: 300, kilde: P7.fevarinDose },
  risiko: 'middels_eller_lav',
  varighet: [EN_TIL_TO_UKER, P7.fevarinSeponering],
  kildetro: [utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering)],
  usikkerhet: [],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: 50 mg, så 25 % per trinn til neste dose er under 12,5 mg.', 100, ['dag 1–14: 50 mg', 'dag 15–28: 37,5 mg', 'dag 29–42: 28,13 mg', 'dag 43–56: 21,09 mg', 'dag 57–70: 15,82 mg', 'fra dag 71: seponert']),
  ],
})

const venlafaksin = stoff({
  nokkel: 'venlafaksin',
  navn: 'venlafaksin',
  kode: 'Ve',
  dose: { lavest: 37.5, hoyest: 375, kilde: P7.efexorDose },
  risiko: 'hoy',
  varighet: [EN_TIL_TO_UKER, P7.efexorSeponering],
  kildetro: [
    utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering),
    utsagn('Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'],
  usikkerhet: ['De fleste trinnene kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.'],
  eksempler: [
    eks('fra-37-5-mg', 'Fra laveste døgndose: 10 % per trinn til neste dose er under 9,38 mg (seks måneder).', 37.5, [
      'dag 1–14: 33,75 mg',
      'dag 15–28: 30,38 mg',
      'dag 29–42: 27,34 mg',
      'dag 43–56: 24,6 mg',
      'dag 57–70: 22,14 mg',
      'dag 71–84: 19,93 mg',
      'dag 85–98: 17,94 mg',
      'dag 99–112: 16,14 mg',
      'dag 113–126: 14,53 mg',
      'dag 127–140: 13,08 mg',
      'dag 141–154: 11,77 mg',
      'dag 155–168: 10,59 mg',
      'dag 169–182: 9,53 mg',
      'fra dag 183: seponert',
    ]),
    eks(
      'fra-150-mg-justert',
      'Fra 150 mg med forskriverens valg av 25 % og 28 dager per trinn.',
      150,
      [
        'dag 1–28: 112,5 mg',
        'dag 29–56: 84,38 mg',
        'dag 57–84: 63,28 mg',
        'dag 85–112: 47,46 mg',
        'dag 113–140: 35,6 mg',
        'dag 141–168: 26,7 mg',
        'dag 169–196: 20,02 mg',
        'dag 197–224: 15,02 mg',
        'dag 225–252: 11,26 mg',
        'fra dag 253: seponert',
      ],
      { prosent: 25, dager: 28 },
    ),
  ],
})

const duloksetin = stoff({
  nokkel: 'duloksetin',
  navn: 'duloksetin',
  kode: 'Du',
  dose: { lavest: 30, hoyest: 120, kilde: P7.cymbaltaDose },
  risiko: 'hoy',
  varighet: [EN_TIL_TO_UKER, P7.cymbaltaSeponering],
  kildetro: [
    utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering),
    utsagn('Duloksetin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'],
  usikkerhet: ['Trinnene kan ikke gis med registrerte kapsler på 30 og 60 mg; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.'],
  eksempler: [
    eks('fra-30-mg', 'Fra 30 mg: 10 % per trinn til neste dose er under 7,5 mg.', 30, [
      'dag 1–14: 27 mg',
      'dag 15–28: 24,3 mg',
      'dag 29–42: 21,87 mg',
      'dag 43–56: 19,68 mg',
      'dag 57–70: 17,71 mg',
      'dag 71–84: 15,94 mg',
      'dag 85–98: 14,35 mg',
      'dag 99–112: 12,91 mg',
      'dag 113–126: 11,62 mg',
      'dag 127–140: 10,46 mg',
      'dag 141–154: 9,41 mg',
      'dag 155–168: 8,47 mg',
      'dag 169–182: 7,63 mg',
      'fra dag 183: seponert',
    ]),
  ],
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  dose: { lavest: 5, hoyest: 20, kilde: P7.brintellixDose },
  risiko: 'middels_eller_lav',
  varighet: [INGEN_VARIGHET, P7.brintellixSeponering],
  kildetro: [utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering)],
  usikkerhet: ['Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.', 'Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.'],
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
    stopp('fra-1-25-mg', 'Fra sluttdosen blir nedtrappingen kortere enn 28 dager.', 1.25, KORTERE),
  ],
})

const bupropion = stoff({
  nokkel: 'bupropion',
  navn: 'bupropion',
  kode: 'Bu',
  dose: { lavest: 150, hoyest: 300, kilde: P7.wellbutrinDose },
  risiko: 'middels_eller_lav',
  varighet: [INGEN_VARIGHET, P7.wellbutrinSeponering],
  kildetro: [utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering)],
  forutsetninger: ['Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles.'],
  usikkerhet: [
    'Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.',
    'Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.',
  ],
  eksempler: [
    eks('fra-300-mg', 'Fra 300 mg: 150 mg, så 25 % per trinn til neste dose er under 37,5 mg.', 300, ['dag 1–14: 150 mg', 'dag 15–28: 112,5 mg', 'dag 29–42: 84,38 mg', 'dag 43–56: 63,28 mg', 'dag 57–70: 47,46 mg', 'fra dag 71: seponert']),
  ],
})

const moklobemid = stoff({
  nokkel: 'moklobemid',
  navn: 'moklobemid',
  kode: 'Mo',
  dose: { lavest: 300, hoyest: 600, kilde: P7.aurorixDose },
  risiko: 'hoy',
  varighet: [INGEN_VARIGHET, P7.aurorixSeponering],
  unntak: [
    {
      id: 'nedsatt_leverfunksjon',
      tekst: 'Pasienten har alvorlig nedsatt leverfunksjon; preparatomtalen reduserer da dosen, og nedtrappingen må vurderes individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [P7.aurorixDose] },
    },
  ],
  kildetro: [
    utsagn('Preparatomtalen gir ingen anvisning om nedtrapping av moklobemid.', P7.aurorixSeponering),
    utsagn('Moklobemid er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
  ],
  usikkerhet: [
    'Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko. Regelen følger RCPsych; det må avklares faglig.',
    'Trinnene krever doser som ikke kan settes sammen av tabletter på 150 og 300 mg; uten det stopper P5.',
  ],
  eksempler: [
    eks('fra-300-mg', 'Fra 300 mg: 10 % per trinn til neste dose er under 75 mg.', 300, [
      'dag 1–14: 270 mg',
      'dag 15–28: 243 mg',
      'dag 29–42: 218,7 mg',
      'dag 43–56: 196,83 mg',
      'dag 57–70: 177,15 mg',
      'dag 71–84: 159,43 mg',
      'dag 85–98: 143,49 mg',
      'dag 99–112: 129,14 mg',
      'dag 113–126: 116,23 mg',
      'dag 127–140: 104,6 mg',
      'dag 141–154: 94,14 mg',
      'dag 155–168: 84,73 mg',
      'dag 169–182: 76,26 mg',
      'fra dag 183: seponert',
    ]),
  ],
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  dose: { lavest: 15, hoyest: 45, kilde: SPC.remeronDose },
  risiko: 'hoy',
  varighet: [GRADVIS, SPC.remeronDose],
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose), utsagn('Mirtazapin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko)],
  usikkerhet: ['Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper P5.'],
  eksempler: [
    eks('fra-15-mg', 'Fra 15 mg: 10 % per trinn til neste dose er under 3,75 mg.', 15, [
      'dag 1–14: 13,5 mg',
      'dag 15–28: 12,15 mg',
      'dag 29–42: 10,94 mg',
      'dag 43–56: 9,84 mg',
      'dag 57–70: 8,86 mg',
      'dag 71–84: 7,97 mg',
      'dag 85–98: 7,17 mg',
      'dag 99–112: 6,46 mg',
      'dag 113–126: 5,81 mg',
      'dag 127–140: 5,23 mg',
      'dag 141–154: 4,71 mg',
      'dag 155–168: 4,24 mg',
      'dag 169–182: 3,81 mg',
      'fra dag 183: seponert',
    ]),
  ],
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  dose: { lavest: 10, hoyest: 150, kilde: P7.sarotexDose },
  risiko: 'middels_eller_lav',
  varighet: ['Preparatomtalen sier gradvis over flere uker.', P7.sarotexSeponering],
  kildetro: [utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering)],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.'],
  usikkerhet: ['Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn (12,5 mg og alt under 10 mg) kan derfor ikke gis nøyaktig, og P5 stopper.'],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg: halvering ned til 10 mg, så 25 % per trinn til neste dose er under 2,5 mg.', 100, [
      'dag 1–14: 50 mg',
      'dag 15–28: 25 mg',
      'dag 29–42: 12,5 mg',
      'dag 43–56: 6,25 mg',
      'dag 57–70: 4,69 mg',
      'dag 71–84: 3,52 mg',
      'dag 85–98: 2,64 mg',
      'fra dag 99: seponert',
    ]),
    stopp('fra-4-mg', 'Fra 4 mg blir nedtrappingen 14 dager, kortere enn 28 dager.', 4, KORTERE),
  ],
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  dose: { lavest: 10, hoyest: 250, kilde: P7.anafranilDose },
  risiko: 'middels_eller_lav',
  varighet: [GRADVIS, P7.anafranilSeponering],
  kildetro: [utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering)],
  usikkerhet: ['Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [
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
  risiko: 'middels_eller_lav',
  varighet: ['Preparatomtalen sier bare at brå seponering etter lang bruk kan gi abstinenssymptomer.', P7.noritrenSeponering],
  kildetro: [utsagn('Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.', P7.noritrenSeponering)],
  tilpasninger: [utsagn('Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.', P7.noritrenVedlikehold)],
  usikkerhet: ['Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE og RCPsych.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg: 25 mg, så 25 % per trinn til neste dose er under 6,25 mg.', 50, ['dag 1–14: 25 mg', 'dag 15–28: 18,75 mg', 'dag 29–42: 14,06 mg', 'dag 43–56: 10,55 mg', 'dag 57–70: 7,91 mg', 'fra dag 71: seponert']),
    eks('fra-15-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 15, ['dag 1–14: 11,25 mg', 'dag 15–28: 8,44 mg', 'dag 29–42: 6,33 mg', 'fra dag 43: seponert']),
    stopp('fra-10-mg', 'Fra 10 mg blir nedtrappingen 14 dager, kortere enn 28 dager.', 10, KORTERE),
  ],
})

const PAROKSETIN = {
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  dose: { lavest: 10, hoyest: 60, kilde: P7.seroxatDose },
  risiko: 'hoy' as const,
}

const paroksetin = stoff({
  ...PAROKSETIN,
  varighet: ['Preparatomtalen sier over flere uker eller måneder.', P7.seroxatVarighet],
  kildetro: [
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
    utsagn('Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', P7.seroxatRegime),
    utsagn('Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  tilpasninger: [
    utsagn(
      'Nedtrappingen fra studiene i preparatomtalen (10 mg mindre hver uke) brukes ikke som regel; den ligger som rask studievariant i sammenligningssettet og er ikke en klinisk anbefaling ved langvarig behandling.',
      P7.seroxatRegime,
      P7.seroxatVarighet,
    ),
  ],
  usikkerhet: ['De fleste trinnene krever deling av tabletter eller flytende form (mikstur); uten det stopper P5.'],
  eksempler: [
    eks('fra-10-mg', 'Fra 10 mg: 10 % per trinn til neste dose er under 2,5 mg (seks måneder).', 10, [
      'dag 1–14: 9 mg',
      'dag 15–28: 8,1 mg',
      'dag 29–42: 7,29 mg',
      'dag 43–56: 6,56 mg',
      'dag 57–70: 5,9 mg',
      'dag 71–84: 5,31 mg',
      'dag 85–98: 4,78 mg',
      'dag 99–112: 4,3 mg',
      'dag 113–126: 3,87 mg',
      'dag 127–140: 3,49 mg',
      'dag 141–154: 3,14 mg',
      'dag 155–168: 2,82 mg',
      'dag 169–182: 2,54 mg',
      'fra dag 183: seponert',
    ]),
    eks(
      'fra-20-mg-justert',
      'Fra 20 mg med forskriverens valg av 25 % per trinn.',
      20,
      ['dag 1–14: 15 mg', 'dag 15–28: 11,25 mg', 'dag 29–42: 8,44 mg', 'dag 43–56: 6,33 mg', 'dag 57–70: 4,75 mg', 'dag 71–84: 3,56 mg', 'dag 85–98: 2,67 mg', 'fra dag 99: seponert'],
      { prosent: 25 },
    ),
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
  tilpasninger: [utsagn('Varianten er bare til sammenligning med regelen i verktøyet og vises ikke der.', P7.seroxatRegime)],
  usikkerhet: ['Studienedtrappingen er raskere enn rådet i samme preparatomtale (flere uker eller måneder), NICE og RCPsych, og er ikke en klinisk anbefaling ved langvarig behandling.'],
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
  godkjenning: { status: 'til_faglig_kontroll', historikk: historikk([UTKAST]) },
}

const STOFFER = [amitriptylin, bupropion, citalopram, duloksetin, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, venlafaksin, vortioksetin]

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 3,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych. Hver plan er et startforslag som forskriveren kan justere innenfor regelens områder. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [...STOFFER.map(seponeringsregel), agomelatin],
}

/**
 * Varianter som bare regnes ut til sammenligning med reglene i verktøyet
 * (P7.5), f.eks. en rask studienedtrapping. De er ikke i verktøyets
 * regelsett og er ikke kliniske anbefalinger.
 */
export const SAMMENLIGNINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping-sammenligning',
  versjon: 2,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Varianter til sammenligning med nedtrappingsreglene (P7.5). Ikke i verktøyet og ikke kliniske anbefalinger; til faglig kontroll.',
  regler: [seponeringsregel(paroksetinStudievariant)],
}
