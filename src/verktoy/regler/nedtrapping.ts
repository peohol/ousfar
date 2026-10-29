/**
 * Nedtrappingsreglene i P7 (`docs/verktøy-p7-nedtrapping.md`): utkast til
 * OUSFARs egne regler for seponering av hvert antidepressiv der det finnes
 * forsvarlig kildegrunnlag, laget per virkestoff fra preparatomtalen, NICE og
 * Royal College of Psychiatrists (RCPsych). Hvilke virkestoffer som har regel,
 * bare fagtekst, mangler anbefaling eller har en annen begrensning, står i
 * dekningen (`verktoy/dekning.ts`).
 *
 * Reglene følger ett felles prinsipp, skrevet ut i hver regel så det kan
 * kontrolleres. Valgene følger risikogruppen for seponeringssymptomer
 * (RCPsych) slik fagvurderingen 29.10.2026 (beslutning 1) fastsatte dem: ved
 * høyest risiko 10 % av aktuell dose per trinn (forskriveren kan velge
 * 5–10 %) og minst 28 dager per trinn; ellers 25 % (5–50 %, over 25 % krever
 * begrunnelse) og minst 14 dager (28 for fluoksetin), med 28 dager som
 * standard. Dagene har ingen klinisk øvre grense: et trinn er en minstetid og
 * forlenges så lenge seponeringssymptomene krever det. Forskriveren må oppgi om
 * behandlingstiden er lang; da krever kortere trinn og (ved middels risiko)
 * mer enn 10 % begrunnelse.
 *
 * **Ingen plan går til null** (beslutning 2): ingen sluttdose er godkjent som
 * automatisk avslutning. Planen trapper ned til neste dose ville vært under
 * en nedre grense (en firedel av laveste døgndose, en uavklart
 * modellforutsetning), og siste dose fortsetter til avslutningen er vurdert
 * individuelt.
 *
 * Hver plan er et **startforslag**: forskriveren må bekrefte det, og regelen
 * gjelder ikke når et tidligere forsøk har gitt seponeringssymptomer. Reglene
 * gir ideelle doser og har **ingen toleranse**: en dose som ikke kan gis
 * nøyaktig med norske preparater, gir en forklart stopp i doseplanmotoren
 * (P5), ikke et avvik fra regelen. **Ingen regel er klinisk godkjent.** Alle
 * er til uavhengig faglig kontroll (P7.5); valgområdene er avklart i
 * fagvurderingen, de andre verdiene som er OUSFARs valg, er åpne forslag.
 * Escitalopram, som var pilotregel i P4, følger nå samme prinsipp. Paroksetins raske studievariant ligger i et eget
 * sammenligningssett, ikke i verktøyet. Psychiatrienet står bare som
 * referanse til Stop-oppføringen fra P3; ingen regel bygger på eller gjengir
 * teksten der.
 */
import { AVSLUTNING_KORT, kravtekst, omradetekst } from './beregning'
import { FORUTSETNINGER_FELLES, forslag, h, kilde, NICE, pn, RCPSYCH, steg, utsagn } from './bygg'
import type { Avklaring, Begrunnelseskrav, Bekreftelse, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Sporsmal, Unntak, Utsagn } from './modell'
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
/** Dagen den gjeldende regelversjonen ble laget, etter fagvurderingen. */
const NY_VERSJON = '2026-10-29'
/** Hva som er endret i hver versjon; regelversjonen er antallet. */
const UTKAST = 'Utkast til nedtrappingsregel (P7.2).'
const KONTROLL_1 =
  'Omarbeidet etter første uavhengige kontroll (P7.5): startforslag som må bekreftes, unntak ved tidligere seponeringssymptomer, sluttdose uavhengig av styrkene, langsom variant der NICE krever særlig varsomhet, begrunnede minstevarigheter og lave restdoser.'
const KONTROLL_2 =
  'Omarbeidet etter andre uavhengige kontroll (P7.5): trinnlengden bygger på RCPsych, ikke NICEs råd om fluoksetin; trinnstørrelsen følger risikoen for seponeringssymptomer; forskriveren kan justere trinnstørrelse og trinnlengde innenfor et område; sluttdosen er merket som uavklart modellforutsetning; minst 28 dager.'
const KONTROLL_3 =
  'Omarbeidet etter fagvurderingen 29.10.2026 (P7.5): valgområder per risikogruppe (høy risiko 5–10 %, ellers standard 25 % og begrunnelse over 25 %), minst 14 eller 28 dager per trinn uten klinisk øvre grense, lang behandlingstid registreres, begrunnelse for raske valg, og ingen automatisk seponering: planen stopper ved nedre grense, og avslutningen vurderes individuelt.'
/** Historikken for merknadene, én versjon hver; med `ny` er den siste laget etter fagvurderingen. */
const historikk = (merknader: string[], ny = true) =>
  merknader.flatMap((m, i) => {
    const dato = ny && i === merknader.length - 1 ? NY_VERSJON : undefined
    return [steg('utkast', i + 1, m, dato), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, dato)]
  })

const tall = (x: number) => String(x).replace('.', ',')

/**
 * Avklaringen fra fagvurderingen 29.10.2026 (beslutning 1): valgområdene per
 * risikogruppe kan innføres som rammer for individuell planlegging. Den gjelder
 * regelversjonen den står i; den er ingen klinisk godkjenning.
 */
const beslutning1 = (regelversjon: number): Avklaring => ({
  dato: NY_VERSJON,
  av: 'ChatGPT (uavhengig kontrollør)',
  rolle: 'uavhengig_kontrollor',
  regelversjon,
  merknad: 'Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier',
})

/** Bekreftelsen hver beregnbar regel krever: planen er et startforslag med minstetider, ikke en fast tidsplan. */
export const STARTFORSLAG: Bekreftelse = {
  id: 'startforslag',
  tekst:
    'Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.',
  grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] },
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

/** Spørsmålet hver beregnbar regel stiller: behandlingstiden registreres og avgjør hvilke valg som krever begrunnelse. */
export const LANG_BEHANDLINGSTID: Sporsmal = {
  id: 'lang_behandlingstid',
  tekst: 'Har pasienten brukt legemidlet i mange måneder eller lenger?',
  ja: 'lang behandlingstid',
  grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] },
}

/** Feltene forskriveren kan justere, slik de vises i verktøyet. */
export const JUSTERING = { prosent: 'Reduksjon per trinn (% av aktuell dose)', dager: 'Minste antall dager per trinn' } as const

/** Den tekniske øvre grensen for dager per trinn i én beregning; ingen klinisk grense (et trinn kan alltid forlenges). */
export const TEKNISK_MAKS_DAGER = 365

/** Laveste og høyeste døgndose preparatomtalen oppgir for voksne, med kildestedet. */
interface Doser {
  lavest: number
  hoyest: number
  kilde: Kildehenvisning
}

/**
 * Valgene for en risikogruppe (fagvurderingen 29.10.2026, beslutning 1):
 * reduksjon per trinn og minste antall dager per trinn, med standardverdi,
 * område og når et valg krever begrunnelse.
 */
interface Risikogruppe {
  tittel: string
  prosent: { standard: number; omrade: [number, number]; begrunnelseOver?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Over denne reduksjonen ved lang behandlingstid kreves begrunnelse: OUSFARs måte å følge rådet om 5–10 % på. */
  langOver?: number
  dager: { standard: number; minst: number; begrunnelseUnderVedLang?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Mindre trinn (25 %) fra laveste døgndose når en større reduksjon er valgt. */
  lavtTrinn: boolean
}

const HOY: Risikogruppe = {
  tittel: 'langsom prosentvis nedtrapping (høy risiko)',
  prosent: {
    standard: 10,
    omrade: [5, 10],
    begrunnelse:
      'Høyest potensiell risiko for seponeringssymptomer (RCPsych): 10 % av aktuell dose per trinn, og forskriveren kan velge 5–10 %. Større reduksjoner er utenfor regelen og krever en individuelt utarbeidet plan.',
    henvisninger: [RCPSYCH.hoyRisiko, RCPSYCH.plan, RCPSYCH.langvarig],
  },
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse: 'Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Den nedre grensen er et konservativt valg, ikke en validert biologisk terskel.',
    henvisninger: [RCPSYCH.tid, NICE.tempo],
  },
  lavtTrinn: false,
}

const MIDDELS: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: {
    standard: 25,
    omrade: [5, 50],
    begrunnelseOver: 25,
    begrunnelse:
      'Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som forsiktig standard, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet. Forskriveren kan velge 5–50 %; over 25 % krever begrunnelse, særlig om behandlingstid og tidligere toleranse.',
    henvisninger: [RCPSYCH.middelsRisiko, RCPSYCH.plan, RCPSYCH.tid, NICE.halveringstid],
  },
  langOver: 10,
  dager: {
    standard: 28,
    minst: 14,
    begrunnelseUnderVedLang: 28,
    begrunnelse: 'Minst 14 dager per trinn, uten klinisk fastsatt øvre grense; standard 28. Kortere trinn enn 28 dager etter lang behandlingstid krever begrunnelse.',
    henvisninger: [RCPSYCH.tid, RCPSYCH.langvarig, NICE.tempo],
  },
  lavtTrinn: true,
}

/** Fluoksetin: middels risiko, men lang virketid gir minst 28 dager per trinn og ingen mindre trinn ved lav dose. */
const FLUOKSETIN: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: { ...MIDDELS.prosent, begrunnelse: 'Middels potensiell risiko (RCPsych): 25 % av aktuell dose per trinn som standard; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse.' },
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse:
      'Minst 28 dager per trinn, uten klinisk fastsatt øvre grense: fluoksetin og den aktive metabolitten virker lenge, og seponeringssymptomer kan komme sent. RCPsych anbefaler å vente minst fire uker før neste reduksjon; NICE nevner én til to uker for å vurdere virkningen.',
    henvisninger: [RCPSYCH.fluoksetin, NICE.fluoksetinVurdering],
  },
  lavtTrinn: false,
}

const LAV: Risikogruppe = {
  tittel: 'gjentatt prosentvis nedtrapping',
  prosent: {
    ...MIDDELS.prosent,
    begrunnelse: 'Lav potensiell risiko (RCPsych) og lang halveringstid: 25 % av aktuell dose per trinn som standard; forskriveren kan velge 5–50 %, og over 25 % krever begrunnelse.',
    henvisninger: [RCPSYCH.middelsRisiko, RCPSYCH.plan, RCPSYCH.tid],
  },
  dager: MIDDELS.dager,
  lavtTrinn: true,
}

/** Reduksjonen per trinn for gruppen, med begrunnelseskravene. */
function reduksjon(g: Risikogruppe, avklaring: Avklaring): Parameter {
  const krav: Begrunnelseskrav[] = [
    ...(g.prosent.begrunnelseOver !== undefined
      ? [
          {
            over: g.prosent.begrunnelseOver,
            grunnlag: {
              type: 'ousfar_vurdering' as const,
              begrunnelse: `Større reduksjoner enn ${g.prosent.begrunnelseOver} % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet.`,
              henvisninger: [RCPSYCH.plan, RCPSYCH.langvarig],
              avklaring,
            },
          },
        ]
      : []),
    ...(g.langOver !== undefined
      ? [
          {
            over: g.langOver,
            ved: LANG_BEHANDLINGSTID.id,
            grunnlag: {
              type: 'ousfar_vurdering' as const,
              begrunnelse: 'Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); OUSFAR krever begrunnelse for mer, så et raskere valg aldri står som likeverdig standard.',
              henvisninger: [RCPSYCH.langvarig],
              avklaring: null,
            },
          },
        ]
      : []),
  ]
  return forslag(g.prosent.standard, 'prosent', g.prosent.begrunnelse, {
    omrade: g.prosent.omrade,
    justerbar: JUSTERING.prosent,
    henvisninger: g.prosent.henvisninger,
    ...(krav.length > 0 && { begrunnelseskrav: krav }),
    avklaring,
  })
}

/** Minste antall dager per trinn for gruppen: uten klinisk øvre grense, bare en teknisk. */
function dagerPerTrinn(g: Risikogruppe, avklaring: Avklaring): Parameter {
  const krav = g.dager.begrunnelseUnderVedLang
  return forslag(g.dager.standard, 'dager', g.dager.begrunnelse, {
    omrade: [g.dager.minst, TEKNISK_MAKS_DAGER],
    teknisk_maks: true,
    justerbar: JUSTERING.dager,
    henvisninger: g.dager.henvisninger,
    ...(krav !== undefined && {
      begrunnelseskrav: [
        {
          under: krav,
          ved: LANG_BEHANDLINGSTID.id,
          grunnlag: {
            type: 'ousfar_vurdering',
            begrunnelse: `Kortere trinn enn ${krav} dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping.`,
            henvisninger: [RCPSYCH.langvarig, RCPSYCH.tid],
            avklaring,
          },
        },
      ],
    }),
    avklaring,
  })
}

/** Planens nedre grense: en firedel av laveste døgndose, uavhengig av styrkene. En uavklart modellforutsetning, aldri et automatisk sluttpunkt. */
const nedreGrense = (d: Doser): Parameter =>
  forslag(
    d.lavest / 4,
    'mg',
    `Uavklart modellforutsetning: planens nedre grense, en firedel av laveste døgndose preparatomtalen oppgir for voksne (${tall(d.lavest)} mg). Planen beregner ingen trinn under den og går aldri til null; avslutningen vurderes individuelt. Fagvurderingen 29.10.2026 avviste grensen som automatisk sluttpunkt: ingen kilde oppgir en sluttdose, og en lav dose kan fortsatt gi betydelig reseptorbinding. Valgt uavhengig av styrkene; om dosene kan gis, avgjøres i P5.`,
    { henvisninger: [d.kilde, NICE.andel, NICE.flytende, RCPSYCH.lavDose] },
  )

/** Det felles prinsippet for stoffets risikogruppe. */
function strategi(d: Doser, g: Risikogruppe, avklaring: Avklaring): Nedtrappingsstrategi {
  const prosent = reduksjon(g, avklaring)
  if (!g.lavtTrinn) return { type: 'prosent_av_aktuell', prosent, sluttdose_mg: nedreGrense(d) }
  return {
    type: 'prosent_av_aktuell',
    prosent,
    lav_prosent: forslag(25, 'prosent', 'Eksempelet i NICE på mindre trinn ved lav dose; aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt.', { henvisninger: [NICE.andel, RCPSYCH.lavDose] }),
    lav_grense_mg: forslag(d.lavest, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [d.kilde] }),
    sluttdose_mg: nedreGrense(d),
  }
}

/** Hva forskriveren kan velge for en parameter, og hva som krever begrunnelse. */
function valgområde(p: Parameter): string {
  if (!p.justerbar || !p.omrade) return ''
  const krav = (p.begrunnelseskrav ?? []).map((k) => kravtekst(k, p, [LANG_BEHANDLINGSTID]))
  return ` (forskriveren kan velge ${omradetekst(p as Parameter & { omrade: [number, number] })}${krav.length > 0 ? `; begrunnelse kreves ${krav.join(' og ')}` : ''})`
}

/** OUSFARs valg i en regel, skrevet ut fra verdiene så teksten aldri kan avvike fra dem. */
function valgtekst(s: Nedtrappingsstrategi, trinnlengde: Parameter): string {
  const dager = `minst ${trinnlengde.verdi} dager per trinn${valgområde(trinnlengde)}`
  const slutt = 'Planen går ikke til null: siste dose fortsetter, og avslutningen vurderes individuelt.'
  if (s.type === 'absolutt') return `Døgndosen reduseres med ${tall(s.mg.verdi!)} mg, ${dager}. ${slutt}`
  if (s.type !== 'prosent_av_aktuell') throw new Error(`Strategien ${s.type} brukes ikke i P7`)
  const lav = s.lav_grense_mg ? `, høyst ${s.lav_prosent?.verdi} % fra ${tall(s.lav_grense_mg.verdi!)} mg` : ''
  return `OUSFAR trapper ned med ${s.prosent.verdi} % av aktuell dose${valgområde(s.prosent)}${lav}, med ${dager}, til neste dose ville vært under planens nedre grense ${tall(s.sluttdose_mg.verdi!)} mg. ${slutt}`
}

/** Valgene i et regneeksempel: justeringer (prosent, dager), om behandlingstiden er lang, og begrunnelsen. */
interface Eksempelvalg {
  justert?: Partial<Record<keyof typeof JUSTERING, number>>
  lang?: boolean
  begrunnelse?: string
}

const eks = (id: string, beskrivelse: string, startdose_mg: number, forventet: string[], valg: Eksempelvalg = {}): Regneeksempel => ({
  id,
  beskrivelse,
  inndata: {
    startdose_mg,
    svar: { [LANG_BEHANDLINGSTID.id]: valg.lang ?? false },
    ...(valg.justert && { justert: valg.justert as Record<string, number> }),
    ...(valg.begrunnelse && { begrunnelse: valg.begrunnelse }),
  },
  forventet: { fra: [...forventet, AVSLUTNING_KORT] },
})
const stopp = (id: string, beskrivelse: string, startdose_mg: number, grunn: RegExp, valg: Eksempelvalg = {}): Regneeksempel => ({
  ...eks(id, beskrivelse, startdose_mg, [], valg),
  forventet: {},
  stopp: grunn,
})

/** Stien til de justerbare parametrene i en regel bygd her. */
const STI = { prosent: 'plan.forlop[0].faser[0].strategi.prosent', dager: 'plan.forlop[0].faser[0].trinnlengde' } as const

interface Stoffregel {
  nokkel: string
  /** Virkestoffnavnet i tittel og tekst, med liten forbokstav. */
  navn: string
  /** Raden i Psychiatrienets antidepressivtabell; regelen viser til Stop-oppføringen der. */
  kode: string
  dose: Doser
  /** Risikogruppen for seponeringssymptomer etter RCPsych, med valgene fra fagvurderingen. */
  gruppe: Risikogruppe
  /** En variant ved siden av stoffets regel, med egen strategi; bare i sammenligningssettet. */
  variant?: { id: string; tittel: string; merknad: string; strategi: Nedtrappingsstrategi; trinnlengde: Parameter }
  /** Versjonene før denne, når regelen har en annen historikk enn P7-reglene (f.eks. fra pilotsettet). */
  tidligere?: string[]
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
  'Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.',
  'Beregningen kjenner dosen, om behandlingstiden er lang, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan tidligere nedtrappinger har gått eller hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.',
]

const FELLES_USIKKERHET = [
  'Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.',
  'Planens nedre grense (en firedel av laveste døgndose) er en uavklart modellforutsetning, ikke en validert seponeringsterskel; noen trenger langt lavere doser før seponering (RCPsych). Planen går derfor ikke til null, og hvordan en forsvarlig avslutning skal beregnes, er et eget, uavklart spørsmål.',
  'Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.',
  'Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper beregningen i P5 med begrunnelse. Om regelen skal ha toleranse, flytende form eller en annen dokumentert formulering, er et faglig valg.',
]

function seponeringsregel(s: Stoffregel): Regel {
  const merknader = s.variant ? [s.variant.merknad, KONTROLL_2, KONTROLL_3] : [...(s.tidligere ?? [UTKAST, KONTROLL_1, KONTROLL_2]), KONTROLL_3]
  const versjon = merknader.length
  const avklaring = beslutning1(versjon)
  const strat = s.variant?.strategi ?? strategi(s.dose, s.gruppe, avklaring)
  const trinnlengde = s.variant?.trinnlengde ?? dagerPerTrinn(s.gruppe, avklaring)
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  // En prosentvis regel gjelder enhver lav aktuell dose; under den nedre grensen stopper beregningen med den grunnen, ikke fordi dosen er ugyldig.
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
  const kort = { [LANG_BEHANDLINGSTID.id]: false }
  return {
    id: `seponering-${s.nokkel}${s.variant ? `-${s.variant.id}` : ''}`,
    versjon,
    tittel: `Seponering av ${s.navn}, ${s.variant?.tittel ?? s.gruppe.tittel}`,
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
          faser: [{ type: 'nedtrapping', strategi: strat, trinnlengde, avslutning: 'individuell' }],
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
            ? `Høyst den høyeste døgndosen preparatomtalen oppgir (${tall(s.dose.hoyest)} mg). Lave restdoser under det ordinære doseområdet er med, fordi nedtrappingen skal kunne fortsette fra dem. Under planens nedre grense har regelen ingen trinn; da stopper beregningen og sier at videre nedtrapping og avslutning må vurderes individuelt, uten å kalle dosen ugyldig.`
            : `Fra ${tall(nedre)} mg til høyeste døgndose preparatomtalen oppgir (${tall(s.dose.hoyest)} mg).`,
          henvisninger: [s.dose.kilde],
          avklaring: null,
        },
      },
    ],
    bekreftelser: [STARTFORSLAG],
    unntak,
    sporsmal: [LANG_BEHANDLINGSTID],
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        ...s.kildetro,
        utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
        utsagn('To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.', RCPSYCH.tid, RCPSYCH.plan),
        utsagn('Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', NICE.tempo, NICE.alvorlig),
      ],
      tilpasninger: [
        utsagn(valgtekst(strat, trinnlengde), NICE.andel, RCPSYCH.tid),
        utsagn(
          'Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.',
          NICE.tempo,
          NICE.tidligere,
          RCPSYCH.langvarig,
        ),
        utsagn('Planen går ikke til null. Ingen avslutning (nulltrinn) er godkjent etter fagvurderingen 29.10.2026, så siste dose fortsetter til avslutningen er vurdert individuelt.', RCPSYCH.lavDose),
        ...(s.tilpasninger ?? []),
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, ...FORUTSETNINGER_P7, ...(s.forutsetninger ?? [])],
      usikkerhet: [...FELLES_USIKKERHET, ...s.usikkerhet],
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    eksempler: [
      ...s.eksempler.map(besvart),
      { id: 'uten-bekreftelse', beskrivelse: 'Uten bekreftelse av at planen er et startforslag, stopper beregningen.', inndata: { startdose_mg: start, pasientforhold: avkreftet, svar: kort }, forventet: {}, stopp: /Må bekreftes før beregning: Planen er et startforslag/ },
      {
        id: 'tidligere-symptomer',
        beskrivelse: 'Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen.',
        inndata: { startdose_mg: start, bekreftet: [STARTFORSLAG.id], pasientforhold: { ...avkreftet, [TIDLIGERE_SYMPTOMER.id]: true }, svar: kort },
        forventet: {},
        stopp: /Regelen gjelder ikke: Et tidligere forsøk/,
      },
      {
        id: 'uten-behandlingstid',
        beskrivelse: 'Uten svar på om behandlingstiden er lang, stopper beregningen.',
        inndata: { startdose_mg: start, bekreftet: [STARTFORSLAG.id], pasientforhold: avkreftet },
        forventet: {},
        stopp: /Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger\?/,
      },
    ],
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(merknader) },
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)
const UNDER_NEDRE_GRENSE = /er under regelens nedre grense .* videre nedtrapping og avslutning må vurderes individuelt/
const INGEN_REDUKSJON = /har regelen ingen reduksjon før avslutningen/
const KREVER_BEGRUNNELSE = /krever en skriftlig begrunnelse fra forskriveren/

/* --- Reglene ------------------------------------------------------------------------ */

/** Syntetisk begrunnelse i eksemplene; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.'

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  dose: { lavest: 10, hoyest: 40, kilde: SPC.cipramilDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering)],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper P5.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 2,5 mg.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'fra dag 169: 2,67 mg',
    ]),
    eks('fra-20-mg-lang', 'Fra 20 mg etter lang behandlingstid med 10 % per trinn: ingen begrunnelse trengs.', 20, [
      'dag 1–28: 18 mg',
      'dag 29–56: 16,2 mg',
      'dag 57–84: 14,58 mg',
      'dag 85–112: 13,12 mg',
      'dag 113–140: 11,81 mg',
      'dag 141–168: 10,63 mg',
      'dag 169–196: 9,57 mg',
      'dag 197–224: 8,61 mg',
      'dag 225–252: 7,75 mg',
      'dag 253–280: 6,97 mg',
      'dag 281–308: 6,28 mg',
      'dag 309–336: 5,65 mg',
      'dag 337–364: 5,08 mg',
      'dag 365–392: 4,58 mg',
      'dag 393–420: 4,12 mg',
      'dag 421–448: 3,71 mg',
      'dag 449–476: 3,34 mg',
      'dag 477–504: 3 mg',
      'fra dag 505: 2,7 mg',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('lang-25-uten-begrunnelse', 'Etter lang behandlingstid krever 25 % (over 10 %) en begrunnelse.', 20, KREVER_BEGRUNNELSE, { lang: true }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse: 10 mg, så høyst 25 % fra laveste døgndose.', 20, ['dag 1–28: 10 mg', 'dag 29–56: 7,5 mg', 'dag 57–84: 5,63 mg', 'dag 85–112: 4,22 mg', 'fra dag 113: 3,16 mg'], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('50-uten-begrunnelse', '50 % (over 25 %) uten begrunnelse stopper.', 20, KREVER_BEGRUNNELSE, { justert: { prosent: 50 } }),
    stopp('fra-3-mg', 'Fra 3 mg ville første trinn vært under 2,5 mg: ingen reduksjon, og ingen godkjent avslutning.', 3, INGEN_REDUKSJON),
    stopp('under-nedre-grense', '2 mg er under den nedre grensen: regelen har ingen trinn, og beregningen sier det.', 2, UNDER_NEDRE_GRENSE),
  ],
})

const escitalopram = stoff({
  nokkel: 'escitalopram',
  navn: 'escitalopram',
  kode: 'Es',
  dose: { lavest: 5, hoyest: 20, kilde: SPC.cipralexDose },
  gruppe: MIDDELS,
  tidligere: [
    'Utkast til pilotregel (P4.7).',
    'Kildegrunnlaget for trinnlengden rettet etter kontrollen av P7 (PR #286): NICEs én til to uker gjelder fluoksetin, så forslaget bygger på RCPsychs to til fire uker.',
    'Flyttet fra pilotsettet (P4) til nedtrappingsreglene (P7), så escitalopram følger det samme prinsippet som de andre antidepressivene.',
  ],
  kildetro: [utsagn('Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipralexSeponering)],
  tilpasninger: [utsagn('Pilotregelens sluttdose på 2,5 mg er erstattet av P7-prinsippet (en firedel av laveste døgndose, 1,25 mg); fagvurderingen 29.10.2026 avviste begge som automatisk sluttpunkt.', SPC.cipralexDose)],
  usikkerhet: ['Doser under 5 mg krever deling eller flytende form; om det finnes, avgjøres i P5.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 1,25 mg.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'fra dag 225: 1,5 mg',
    ]),
    eks('fra-10-mg-lang', 'Fra 10 mg etter lang behandlingstid med 10 % per trinn.', 10, [
      'dag 1–28: 9 mg',
      'dag 29–56: 8,1 mg',
      'dag 57–84: 7,29 mg',
      'dag 85–112: 6,56 mg',
      'dag 113–140: 5,9 mg',
      'dag 141–168: 5,31 mg',
      'dag 169–196: 4,78 mg',
      'dag 197–224: 4,3 mg',
      'dag 225–252: 3,87 mg',
      'dag 253–280: 3,49 mg',
      'dag 281–308: 3,14 mg',
      'dag 309–336: 2,82 mg',
      'dag 337–364: 2,54 mg',
      'dag 365–392: 2,29 mg',
      'dag 393–420: 2,06 mg',
      'dag 421–448: 1,85 mg',
      'dag 449–476: 1,67 mg',
      'dag 477–504: 1,5 mg',
      'fra dag 505: 1,35 mg',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('over-maksimum', '25 mg er over dosene regelen gjelder for.', 25, utenfor(25)),
  ],
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  dose: { lavest: 25, hoyest: 200, kilde: SPC.zoloftDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: ['Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke av motoren før doseringen per ml er dokumentert.'],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 6,25 mg.', 100, [
      'dag 1–28: 75 mg',
      'dag 29–56: 56,25 mg',
      'dag 57–84: 42,19 mg',
      'dag 85–112: 31,64 mg',
      'dag 113–140: 23,73 mg',
      'dag 141–168: 17,8 mg',
      'dag 169–196: 13,35 mg',
      'dag 197–224: 10,01 mg',
      'fra dag 225: 7,51 mg',
    ]),
    eks('fra-50-mg-lang', 'Fra 50 mg etter lang behandlingstid med 10 % per trinn og 28 dager.', 50, [
      'dag 1–28: 45 mg',
      'dag 29–56: 40,5 mg',
      'dag 57–84: 36,45 mg',
      'dag 85–112: 32,81 mg',
      'dag 113–140: 29,52 mg',
      'dag 141–168: 26,57 mg',
      'dag 169–196: 23,91 mg',
      'dag 197–224: 21,52 mg',
      'dag 225–252: 19,37 mg',
      'dag 253–280: 17,43 mg',
      'dag 281–308: 15,69 mg',
      'dag 309–336: 14,12 mg',
      'dag 337–364: 12,71 mg',
      'dag 365–392: 11,44 mg',
      'dag 393–420: 10,29 mg',
      'dag 421–448: 9,27 mg',
      'dag 449–476: 8,34 mg',
      'dag 477–504: 7,5 mg',
      'fra dag 505: 6,75 mg',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn (under 28) en begrunnelse.', 50, KREVER_BEGRUNNELSE, { lang: true, justert: { prosent: 10, dager: 14 } }),
    eks('fra-50-mg-kort-14-dager', 'Fra 50 mg etter kort behandlingstid med 14 dager per trinn: ingen begrunnelse trengs.', 50, [
      'dag 1–14: 37,5 mg',
      'dag 15–28: 28,13 mg',
      'dag 29–42: 21,09 mg',
      'dag 43–56: 15,82 mg',
      'dag 57–70: 11,87 mg',
      'dag 71–84: 8,9 mg',
      'fra dag 85: 6,67 mg',
    ], { justert: { dager: 14 } }),
    eks('fra-12-5-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 12.5, ['dag 1–28: 9,38 mg', 'fra dag 29: 7,03 mg']),
    stopp('under-nedre-grense', '6 mg er under den nedre grensen: regelen har ingen trinn, og beregningen sier det.', 6, UNDER_NEDRE_GRENSE),
    stopp('over-maksimum', '250 mg er over dosene regelen gjelder for.', 250, utenfor(250)),
  ],
})

const fluoksetin = stoff({
  nokkel: 'fluoksetin',
  navn: 'fluoksetin',
  kode: 'Fo',
  dose: { lavest: 20, hoyest: 60, kilde: SPC.fluoksetinDose },
  gruppe: FLUOKSETIN,
  kildetro: [
    utsagn('Fluoksetin trappes ned gradvis over minst én til to uker; aktivt stoff finnes i kroppen i flere uker etter seponering.', SPC.fluoksetinSeponering),
    utsagn('Ved 20 mg daglig kan dosering annenhver dag være en egnet reduksjon; ved 40–60 mg brukes gradvis nedtrapping.', NICE.fluoksetin),
    utsagn('Seponeringssymptomer kan komme dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.', RCPSYCH.fluoksetin),
  ],
  tilpasninger: [
    utsagn(
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene med middels risiko: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Det er OUSFARs vurdering og må avklares.',
      SPC.fluoksetinSeponering,
      NICE.fluoksetin,
    ),
    utsagn('Trinnene varer minst 28 dager og kan forlenges så lenge det trengs for å fange opp sene seponeringssymptomer, men ikke kortes ned.', RCPSYCH.fluoksetin),
  ],
  usikkerhet: ['Dosering annenhver dag (NICE) er ikke en del av regelmodellen; regelen gir lavere daglige doser i stedet, og doser under 10 mg krever flytende form eller deling i fire.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg med standardvalgene: 25 % per trinn, minst 28 dager, til neste dose ville vært under 5 mg.', 40, [
      'dag 1–28: 30 mg',
      'dag 29–56: 22,5 mg',
      'dag 57–84: 16,88 mg',
      'dag 85–112: 12,66 mg',
      'dag 113–140: 9,49 mg',
      'dag 141–168: 7,12 mg',
      'fra dag 169: 5,34 mg',
    ]),
    eks('fra-20-mg-42-dager', 'Fra 20 mg med 42 dager per trinn, så sene seponeringssymptomer kan fanges opp før neste reduksjon.', 20, ['dag 1–42: 15 mg', 'dag 43–84: 11,25 mg', 'dag 85–126: 8,44 mg', 'fra dag 127: 6,33 mg'], { justert: { dager: 42 } }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse.', 20, ['dag 1–28: 10 mg', 'fra dag 29: 5 mg'], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('fra-20-mg-14-dager', 'Kortere trinn enn 28 dager er utenfor regelen.', 20, /Minste antall dager per trinn: 14 dager er utenfor det regelen tillater/, { justert: { dager: 14 } }),
    stopp('fra-6-mg', 'Fra 6 mg ville første trinn vært under 5 mg: ingen reduksjon, og ingen godkjent avslutning.', 6, INGEN_REDUKSJON),
  ],
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  dose: { lavest: 50, hoyest: 300, kilde: P7.fevarinDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering)],
  usikkerhet: [],
  eksempler: [eks('fra-100-mg', 'Fra 100 mg med standardvalgene, til neste dose ville vært under 12,5 mg.', 100, [
    'dag 1–28: 75 mg',
    'dag 29–56: 56,25 mg',
    'dag 57–84: 42,19 mg',
    'dag 85–112: 31,64 mg',
    'dag 113–140: 23,73 mg',
    'dag 141–168: 17,8 mg',
    'fra dag 169: 13,35 mg',
  ])],
})

const venlafaksin = stoff({
  nokkel: 'venlafaksin',
  navn: 'venlafaksin',
  kode: 'Ve',
  dose: { lavest: 37.5, hoyest: 375, kilde: P7.efexorDose },
  gruppe: HOY,
  kildetro: [
    utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering),
    utsagn('Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'],
  usikkerhet: ['De fleste trinnene kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så P5 stopper med begrunnelse; om regelen skal ha toleranse eller annen formulering, må avgjøres faglig.'],
  eksempler: [
    eks('fra-37-5-mg', 'Fra laveste døgndose: 10 % per trinn, minst 28 dager, til neste dose ville vært under 9,38 mg.', 37.5, [
      'dag 1–28: 33,75 mg',
      'dag 29–56: 30,38 mg',
      'dag 57–84: 27,34 mg',
      'dag 85–112: 24,6 mg',
      'dag 113–140: 22,14 mg',
      'dag 141–168: 19,93 mg',
      'dag 169–196: 17,94 mg',
      'dag 197–224: 16,14 mg',
      'dag 225–252: 14,53 mg',
      'dag 253–280: 13,08 mg',
      'dag 281–308: 11,77 mg',
      'dag 309–336: 10,59 mg',
      'fra dag 337: 9,53 mg',
    ]),
    stopp('25-prosent', 'Mer enn 10 % per trinn er utenfor regelen ved høyest risiko og krever en individuelt utarbeidet plan.', 150, /Reduksjon per trinn \(% av aktuell dose\): 25 % er utenfor det regelen tillater \(5–10 %\)/, { justert: { prosent: 25 } }),
  ],
})

const duloksetin = stoff({
  nokkel: 'duloksetin',
  navn: 'duloksetin',
  kode: 'Du',
  dose: { lavest: 30, hoyest: 120, kilde: P7.cymbaltaDose },
  gruppe: HOY,
  kildetro: [
    utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering),
    utsagn('Duloksetin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'],
  usikkerhet: ['Trinnene kan ikke gis med registrerte kapsler på 30 og 60 mg; da stopper P5 med begrunnelse i stedet for å avslutte ved 30 mg.'],
  eksempler: [eks('fra-30-mg', 'Fra 30 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 7,5 mg.', 30, [
    'dag 1–28: 27 mg',
    'dag 29–56: 24,3 mg',
    'dag 57–84: 21,87 mg',
    'dag 85–112: 19,68 mg',
    'dag 113–140: 17,71 mg',
    'dag 141–168: 15,94 mg',
    'dag 169–196: 14,35 mg',
    'dag 197–224: 12,91 mg',
    'dag 225–252: 11,62 mg',
    'dag 253–280: 10,46 mg',
    'dag 281–308: 9,41 mg',
    'dag 309–336: 8,47 mg',
    'fra dag 337: 7,63 mg',
  ])],
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  dose: { lavest: 5, hoyest: 20, kilde: P7.brintellixDose },
  gruppe: LAV,
  kildetro: [utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering)],
  usikkerhet: ['Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.', 'Trinnene under 5 mg krever flytende form (dråper); uten det stopper P5.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene, til neste dose ville vært under 1,25 mg.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'fra dag 225: 1,5 mg',
    ]),
    eks('fra-10-mg-lang', 'Fra 10 mg etter lang behandlingstid med 25 % og 28 dager: ingen begrunnelse trengs ved lav risiko.', 10, [
      'dag 1–28: 7,5 mg',
      'dag 29–56: 5,63 mg',
      'dag 57–84: 4,22 mg',
      'dag 85–112: 3,16 mg',
      'dag 113–140: 2,37 mg',
      'dag 141–168: 1,78 mg',
      'fra dag 169: 1,33 mg',
    ], { lang: true }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn en begrunnelse.', 10, KREVER_BEGRUNNELSE, { lang: true, justert: { dager: 14 } }),
  ],
})

const bupropion = stoff({
  nokkel: 'bupropion',
  navn: 'bupropion',
  kode: 'Bu',
  dose: { lavest: 150, hoyest: 300, kilde: P7.wellbutrinDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering)],
  forutsetninger: ['Bupropion finnes bare som tabletter med modifisert frisetting, som ikke deles, knuses eller tygges.'],
  usikkerhet: [
    'Preparatomtalen sier ikke hvor lenge nedtrappingen bør vare.',
    'Med tabletter på 150 og 300 mg som ikke kan deles, kan ingen dose under 150 mg gis, så P5 stopper. Om bupropion kan seponeres direkte fra 150 mg, er et faglig spørsmål regelen ikke avgjør.',
  ],
  eksempler: [eks('fra-300-mg', 'Fra 300 mg med standardvalgene, til neste dose ville vært under 37,5 mg.', 300, [
    'dag 1–28: 225 mg',
    'dag 29–56: 168,75 mg',
    'dag 57–84: 126,56 mg',
    'dag 85–112: 94,92 mg',
    'dag 113–140: 71,19 mg',
    'dag 141–168: 53,39 mg',
    'fra dag 169: 40,05 mg',
  ])],
})

const moklobemid = stoff({
  nokkel: 'moklobemid',
  navn: 'moklobemid',
  kode: 'Mo',
  dose: { lavest: 300, hoyest: 600, kilde: P7.aurorixDose },
  gruppe: HOY,
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
  eksempler: [eks('fra-300-mg', 'Fra 300 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 75 mg.', 300, [
    'dag 1–28: 270 mg',
    'dag 29–56: 243 mg',
    'dag 57–84: 218,7 mg',
    'dag 85–112: 196,83 mg',
    'dag 113–140: 177,15 mg',
    'dag 141–168: 159,43 mg',
    'dag 169–196: 143,49 mg',
    'dag 197–224: 129,14 mg',
    'dag 225–252: 116,23 mg',
    'dag 253–280: 104,6 mg',
    'dag 281–308: 94,14 mg',
    'dag 309–336: 84,73 mg',
    'fra dag 337: 76,26 mg',
  ])],
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  dose: { lavest: 15, hoyest: 45, kilde: SPC.remeronDose },
  gruppe: HOY,
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose), utsagn('Mirtazapin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko)],
  usikkerhet: ['Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper P5.'],
  eksempler: [eks('fra-15-mg', 'Fra 15 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 3,75 mg.', 15, [
    'dag 1–28: 13,5 mg',
    'dag 29–56: 12,15 mg',
    'dag 57–84: 10,94 mg',
    'dag 85–112: 9,84 mg',
    'dag 113–140: 8,86 mg',
    'dag 141–168: 7,97 mg',
    'dag 169–196: 7,17 mg',
    'dag 197–224: 6,46 mg',
    'dag 225–252: 5,81 mg',
    'dag 253–280: 5,23 mg',
    'dag 281–308: 4,71 mg',
    'dag 309–336: 4,24 mg',
    'fra dag 337: 3,81 mg',
  ])],
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  dose: { lavest: 10, hoyest: 150, kilde: P7.sarotexDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering)],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.'],
  usikkerhet: ['Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn kan derfor ikke gis nøyaktig, og P5 stopper.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til neste dose ville vært under 2,5 mg.', 50, [
      'dag 1–28: 37,5 mg',
      'dag 29–56: 28,13 mg',
      'dag 57–84: 21,09 mg',
      'dag 85–112: 15,82 mg',
      'dag 113–140: 11,87 mg',
      'dag 141–168: 8,9 mg',
      'dag 169–196: 6,67 mg',
      'dag 197–224: 5,01 mg',
      'dag 225–252: 3,75 mg',
      'fra dag 253: 2,82 mg',
    ]),
    stopp('fra-3-mg', 'Fra 3 mg ville første trinn vært under 2,5 mg: ingen reduksjon, og ingen godkjent avslutning.', 3, INGEN_REDUKSJON),
  ],
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  dose: { lavest: 10, hoyest: 250, kilde: P7.anafranilDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering)],
  usikkerhet: ['Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til neste dose ville vært under 2,5 mg.', 50, [
    'dag 1–28: 37,5 mg',
    'dag 29–56: 28,13 mg',
    'dag 57–84: 21,09 mg',
    'dag 85–112: 15,82 mg',
    'dag 113–140: 11,87 mg',
    'dag 141–168: 8,9 mg',
    'dag 169–196: 6,67 mg',
    'dag 197–224: 5,01 mg',
    'dag 225–252: 3,75 mg',
    'fra dag 253: 2,82 mg',
  ])],
})

const nortriptylin = stoff({
  nokkel: 'nortriptylin',
  navn: 'nortriptylin',
  kode: 'No',
  dose: { lavest: 25, hoyest: 200, kilde: P7.noritrenDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Brå seponering av nortriptylin etter lang tids bruk kan gi abstinenssymptomer.', P7.noritrenSeponering)],
  tilpasninger: [utsagn('Preparatomtalens råd om å redusere 10–25 mg hver 3.–8. dag gjelder justering til vedlikeholdsdose, ikke seponering, og er ikke brukt.', P7.noritrenVedlikehold)],
  usikkerhet: ['Preparatomtalen sier ikke hvordan nortriptylin skal trappes ned ved seponering; regelen bygger på NICE og RCPsych.'],
  eksempler: [
    eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til neste dose ville vært under 6,25 mg.', 50, [
      'dag 1–28: 37,5 mg',
      'dag 29–56: 28,13 mg',
      'dag 57–84: 21,09 mg',
      'dag 85–112: 15,82 mg',
      'dag 113–140: 11,87 mg',
      'dag 141–168: 8,9 mg',
      'fra dag 169: 6,67 mg',
    ]),
    eks('fra-15-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn.', 15, ['dag 1–28: 11,25 mg', 'dag 29–56: 8,44 mg', 'fra dag 57: 6,33 mg']),
    stopp('fra-8-mg', 'Fra 8 mg ville første trinn vært under 6,25 mg: ingen reduksjon, og ingen godkjent avslutning.', 8, INGEN_REDUKSJON),
  ],
})

const PAROKSETIN = {
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  dose: { lavest: 10, hoyest: 60, kilde: P7.seroxatDose },
  gruppe: HOY,
}

const paroksetin = stoff({
  ...PAROKSETIN,
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
    eks('fra-20-mg', 'Fra 20 mg: 10 % per trinn, minst 28 dager, til neste dose ville vært under 2,5 mg.', 20, [
      'dag 1–28: 18 mg',
      'dag 29–56: 16,2 mg',
      'dag 57–84: 14,58 mg',
      'dag 85–112: 13,12 mg',
      'dag 113–140: 11,81 mg',
      'dag 141–168: 10,63 mg',
      'dag 169–196: 9,57 mg',
      'dag 197–224: 8,61 mg',
      'dag 225–252: 7,75 mg',
      'dag 253–280: 6,97 mg',
      'dag 281–308: 6,28 mg',
      'dag 309–336: 5,65 mg',
      'dag 337–364: 5,08 mg',
      'dag 365–392: 4,58 mg',
      'dag 393–420: 4,12 mg',
      'dag 421–448: 3,71 mg',
      'dag 449–476: 3,34 mg',
      'dag 477–504: 3 mg',
      'fra dag 505: 2,7 mg',
    ]),
    eks(
      'fra-20-mg-5-prosent',
      'Stresstest fra fagvurderingen: 5 % per trinn fra 20 mg gir 40 reduksjoner over mer enn tre år, og siste dose er fortsatt 2,57 mg. Planen går ikke til null; avslutningen vurderes individuelt.',
      20,
      [
        'dag 1–28: 19 mg',
        'dag 29–56: 18,05 mg',
        'dag 57–84: 17,15 mg',
        'dag 85–112: 16,29 mg',
        'dag 113–140: 15,48 mg',
        'dag 141–168: 14,7 mg',
        'dag 169–196: 13,97 mg',
        'dag 197–224: 13,27 mg',
        'dag 225–252: 12,6 mg',
        'dag 253–280: 11,97 mg',
        'dag 281–308: 11,38 mg',
        'dag 309–336: 10,81 mg',
        'dag 337–364: 10,27 mg',
        'dag 365–392: 9,75 mg',
        'dag 393–420: 9,27 mg',
        'dag 421–448: 8,8 mg',
        'dag 449–476: 8,36 mg',
        'dag 477–504: 7,94 mg',
        'dag 505–532: 7,55 mg',
        'dag 533–560: 7,17 mg',
        'dag 561–588: 6,81 mg',
        'dag 589–616: 6,47 mg',
        'dag 617–644: 6,15 mg',
        'dag 645–672: 5,84 mg',
        'dag 673–700: 5,55 mg',
        'dag 701–728: 5,27 mg',
        'dag 729–756: 5,01 mg',
        'dag 757–784: 4,76 mg',
        'dag 785–812: 4,52 mg',
        'dag 813–840: 4,29 mg',
        'dag 841–868: 4,08 mg',
        'dag 869–896: 3,87 mg',
        'dag 897–924: 3,68 mg',
        'dag 925–952: 3,5 mg',
        'dag 953–980: 3,32 mg',
        'dag 981–1008: 3,16 mg',
        'dag 1009–1036: 3 mg',
        'dag 1037–1064: 2,85 mg',
        'dag 1065–1092: 2,71 mg',
        'fra dag 1093: 2,57 mg',
      ],
      { justert: { prosent: 5 } },
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
    eks('fra-40-mg', 'Fra 40 mg: 10 mg mindre hver uke, uten nulltrinnet.', 40, ['dag 1–7: 30 mg', 'dag 8–14: 20 mg', 'fra dag 15: 10 mg']),
    eks('fra-20-mg', 'Fra 20 mg: én uke på 10 mg (rask), uten nulltrinnet.', 20, ['fra dag 1: 10 mg']),
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
  godkjenning: { status: 'til_faglig_kontroll', historikk: historikk([UTKAST], false) },
}

const STOFFER = [amitriptylin, bupropion, citalopram, duloksetin, escitalopram, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, venlafaksin, vortioksetin]

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 4,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych. Hver plan er et startforslag med minstetider som forskriveren kan justere innenfor valgområdene fra fagvurderingen, og ingen plan går til null. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [...STOFFER.map(seponeringsregel), agomelatin],
}

/**
 * Varianter som bare regnes ut til sammenligning med reglene i verktøyet
 * (P7.5), f.eks. en rask studienedtrapping. De er ikke i verktøyets
 * regelsett og er ikke kliniske anbefalinger.
 */
export const SAMMENLIGNINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping-sammenligning',
  versjon: 3,
  modell: REGELMODELLVERSJON,
  beskrivelse: 'Varianter til sammenligning med nedtrappingsreglene (P7.5). Ikke i verktøyet og ikke kliniske anbefalinger; til faglig kontroll.',
  regler: [seponeringsregel(paroksetinStudievariant)],
}
