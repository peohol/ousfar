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
 * **Ingen plan går til null, og ingen har en fast nedre grense**
 * (fagkontrollene 29. og 30.10.2026): planen viser høyst
 * {@link PLANHORISONT_TRINN} reduksjoner frem i tid (en teknisk
 * planhorisont), aldri et trinn under laveste dose formuleringen kan gi (en
 * praktisk grense, for depotkapslene), og stopper ved første trinn som ikke kan
 * gis med norske preparater (P5). Siste dose fortsetter til planen revurderes;
 * avslutningen vurderes alltid individuelt, og planen foreslår aldri en dato
 * for siste dose.
 *
 * Hver plan er et **startforslag**: forskriveren må bekrefte det og at
 * organfunksjon og interaksjoner er vurdert, og en dose utenfor rammen for
 * indikasjonen eller pasientgruppen krever en begrunnelse. Har et tidligere
 * forsøk gitt seponeringssymptomer, gjelder regelens **langsomme variant**
 * (1–5 % per trinn, minst 28 dager), en egen regel. Fluoksetin har i tillegg
 * dosering annenhver dag som valgfri strategi. Reglene har **ingen
 * toleranse**. **Ingen regel er klinisk godkjent.** Alle er til uavhengig
 * faglig kontroll (P7.5). Bupropion er bare fagtekst: med depottablettene som
 * ikke kan deles, er den prosentvise regelen ikke beregnbar. Den hyperbolske
 * citalopramregelen ligger bare i sammenligningssettet, som ikke er klinisk.
 * Psychiatrienet står bare som referanse til Stop-oppføringen fra P3; ingen
 * regel bygger på eller gjengir teksten der.
 */
import { kravtekst, omradetekst } from './beregning'
import { FORUTSETNINGER_FELLES, forslag, h, kilde, NICE, planhorisont, PLANHORISONT_TRINN, pn, RCPSYCH, steg, utsagn } from './bygg'
import type { Avklaring, Begrunnelseskrav, Bekreftelse, Dosevalg, Fase, Grunnlag, Kildehenvisning, Nedtrappingsstrategi, Parameter, Regel, Regelsett, Regneeksempel, Sporsmal, Unntak, Utsagn } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { seponeringCitalopramHyperbolsk, SPC } from './pilotsett'

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
/** Datoene for de to fagkontrollene versjonene bygger på. */
const RUNDE_1 = '2026-10-29'
const RUNDE_2 = '2026-10-30'

/** Hva som er endret i en versjon, og når; regelversjonen er antallet versjoner. */
interface Versjon {
  merknad: string
  dato?: string
}
const UTKAST: Versjon = { merknad: 'Utkast til nedtrappingsregel (P7.2).' }
const KONTROLL_1: Versjon = {
  merknad:
    'Omarbeidet etter første uavhengige kontroll (P7.5): startforslag som må bekreftes, unntak ved tidligere seponeringssymptomer, sluttdose uavhengig av styrkene, langsom variant der NICE krever særlig varsomhet, begrunnede minstevarigheter og lave restdoser.',
}
const KONTROLL_2: Versjon = {
  merknad:
    'Omarbeidet etter andre uavhengige kontroll (P7.5): trinnlengden bygger på RCPsych, ikke NICEs råd om fluoksetin; trinnstørrelsen følger risikoen for seponeringssymptomer; forskriveren kan justere trinnstørrelse og trinnlengde innenfor et område; sluttdosen er merket som uavklart modellforutsetning; minst 28 dager.',
}
const KONTROLL_3: Versjon = {
  merknad:
    'Omarbeidet etter fagvurderingen 29.10.2026 (P7.5): valgområder per risikogruppe (høy risiko 5–10 %, ellers standard 25 % og begrunnelse over 25 %), minst 14 eller 28 dager per trinn uten klinisk øvre grense, lang behandlingstid registreres, begrunnelse for raske valg, og ingen automatisk seponering: planen stopper ved nedre grense, og avslutningen vurderes individuelt.',
  dato: RUNDE_1,
}
const KONTROLL_4: Versjon = {
  merknad:
    'Omarbeidet etter fagkontrollen 30.10.2026 (P7.5): ingen fast nedre grense, men en teknisk planhorisont og praktiske grenser for formuleringene; planen stopper ved første trinn som ikke kan gis; startdose utenfor rammen for indikasjon eller pasientgruppe krever begrunnelse; organfunksjon og interaksjoner bekreftes; tidligere seponeringssymptomer gir den langsomme varianten.',
  dato: RUNDE_2,
}
/** Den første versjonen av en regel laget etter fagkontrollen 30.10.2026. */
const NY_ETTER_RUNDE_2 = (hva: string): Versjon => ({ merknad: `Ny regel etter fagkontrollen 30.10.2026 (P7.5): ${hva}`, dato: RUNDE_2 })

/** Historikken for versjonene, én versjon hver. */
const historikk = (versjoner: Versjon[]) => versjoner.flatMap((v, i) => [steg('utkast', i + 1, v.merknad, v.dato), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, v.dato)])

const tall = (x: number) => String(x).replace('.', ',')

const kontrollor = { av: 'ChatGPT (uavhengig kontrollør)', rolle: 'uavhengig_kontrollor' } as const

/**
 * Avklaringen fra fagvurderingen 29.10.2026 (beslutning 1): valgområdene per
 * risikogruppe kan innføres som rammer for individuell planlegging. Den gjelder
 * regelversjonen den står i; den er ingen klinisk godkjenning.
 */
const beslutning1 = (regelversjon: number): Avklaring => ({
  dato: RUNDE_1,
  ...kontrollor,
  regelversjon,
  merknad: 'Beslutning 1 i fagvurderingen 29.10.2026: valgområdet, standardverdien og kravet om begrunnelse kan innføres som rammer for individuell planlegging, ikke som dokumenterte optimale verdier',
})

/** Beslutningene i fagkontrollen 30.10.2026 som avklarer et valg; ingen av dem er en klinisk godkjenning. */
const RUNDE_2_BESLUTNING = {
  praktisk: 'Beslutning 3: ingen fast klinisk nedre grense; formuleringens laveste dose er en praktisk grense, og lavere doser krever en annen dokumentert administrasjonsform',
  langOver: 'Beslutning 5.3: begrunnelse for mer enn 10 % per trinn ved lang behandlingstid i middelsgruppen, ikke utenfor regelen',
  lavtTrinn: 'Beslutning 5.4: høyst 25 % fra laveste døgndose er en konservativ øvre ramme, ikke en anbefaling; en lavere valgt prosent gjelder fortsatt',
  doseramme: 'Beslutning 5.5: høyeste døgndose for voksne er ingen automatisk godkjent ramme; en dose utenfor rammen for indikasjon eller pasientgruppe krever forskriverens særskilte vurdering',
  langsom: 'Beslutning 5.6: en egen langsom variant ved tidligere seponeringssymptomer, 1–5 % per trinn (standard 5 %) og minst 28 dager, i stedet for å utelukke pasientene',
  organfunksjon: 'Beslutning 5.6: organfunksjon og interaksjoner må vurderes for alle stoffer; unntaket for moklobemid alene er ikke nok',
  annenhverDag: 'Beslutning 5.10: fluoksetin 20 mg annenhver dag som valgfri strategi ved 20 mg daglig, i minst fire uker før revurdering, uten automatisk seponering',
} as const

const runde2 = (regelversjon: number, hva: keyof typeof RUNDE_2_BESLUTNING): Avklaring => ({
  dato: RUNDE_2,
  ...kontrollor,
  regelversjon,
  merknad: `Fagkontrollen 30.10.2026, ${RUNDE_2_BESLUTNING[hva]}`,
})

const vurdering = (begrunnelse: string, henvisninger: Kildehenvisning[], avklaring: Avklaring | null): Grunnlag => ({ type: 'ousfar_vurdering', begrunnelse, henvisninger, avklaring })

/** Bekreftelsen hver beregnbar regel krever: planen er et startforslag med minstetider, ikke en fast tidsplan. */
export const STARTFORSLAG: Bekreftelse = {
  id: 'startforslag',
  tekst:
    'Planen er et startforslag, og dagene per trinn er minstetider. Neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige; til da forlenges trinnet. Ved mer uttalte symptomer vurderes å gå tilbake til siste tolererte dose og senere forsøke mindre trinn. Endres dosen, trinnstørrelsen eller strategien, beregnes en ny plan fra dosen pasienten da bruker.',
  grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.tid, RCPSYCH.smaa] },
}

/** Bekreftelsen om organfunksjon og interaksjoner, som gjelder alle stoffer (beslutning 5.6). */
export const ORGANFUNKSJON_ID = 'organfunksjon_interaksjoner'
const organfunksjon = (versjon: number): Bekreftelse => ({
  id: ORGANFUNKSJON_ID,
  tekst:
    'Lever- og nyrefunksjon og interaksjoner er vurdert. Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt.',
  grunnlag: vurdering('Beregningen kan ikke utlede organfunksjon eller interaksjoner fra dosen, og de kan endre hvordan pasienten tåler hvert trinn; forskriveren må vurdere dem for hvert stoff.', [NICE.halveringstid], runde2(versjon, 'organfunksjon')),
})

/** Bekreftelsen i den langsomme varianten: at de tidligere symptomene var seponeringssymptomer (beslutning 5.6). */
export const TIDLIGERE_VURDERT_ID = 'tidligere_seponeringssymptomer_vurdert'
const tidligereVurdert = (versjon: number): Bekreftelse => ({
  id: TIDLIGERE_VURDERT_ID,
  tekst:
    'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt symptomer som forskriveren har vurdert som seponeringssymptomer, ikke tilbakefall, bivirkninger eller andre årsaker.',
  grunnlag: vurdering('Den langsomme varianten gjelder bare når de tidligere symptomene virkelig var seponeringssymptomer; det kan ikke utledes av dosen.', [NICE.tidligere, RCPSYCH.langvarig], runde2(versjon, 'langsom')),
})

/** Unntaket i hovedregelen: etter seponeringssymptomer ved et tidligere forsøk gjelder den langsomme varianten. */
export const TIDLIGERE_SYMPTOMER_ID = 'tidligere_seponeringssymptomer'
const tidligereSymptomer = (versjon: number): Unntak => ({
  id: TIDLIGERE_SYMPTOMER_ID,
  tekst: 'Et tidligere forsøk på å trappe ned eller seponere dette legemidlet har gitt seponeringssymptomer eller mislyktes; da gjelder den langsomme varianten av regelen.',
  grunnlag: vurdering(
    'NICE og RCPsych anbefaler mer støtte og langsommere nedtrapping med mindre trinn for disse pasientene; den langsomme varianten har 1–5 % per trinn og minst 28 dager.',
    [NICE.tidligere, NICE.alvorlig, RCPSYCH.langvarig],
    runde2(versjon, 'langsom'),
  ),
})

/** Spørsmålet hver beregnbar regel stiller: behandlingstiden registreres og avgjør hvilke valg som krever begrunnelse. */
export const LANG_BEHANDLINGSTID: Sporsmal = {
  id: 'lang_behandlingstid',
  tekst: 'Har pasienten brukt legemidlet i mange måneder eller lenger?',
  ja: 'lang behandlingstid',
  grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.fireUker, NICE.halveringstid] },
}

/** Spørsmålet om dosen er utenfor rammen for indikasjonen eller pasientgruppen; et ja krever begrunnelse (beslutning 5.5). */
export const UTENFOR_DOSERAMME_ID = 'utenfor_doseramme'
const utenforDoseramme = (versjon: number, kilde: Kildehenvisning): Sporsmal => ({
  id: UTENFOR_DOSERAMME_ID,
  tekst: 'Er dosen utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe, for eksempel eldre eller nedsatt organfunksjon?',
  ja: 'dose utenfor rammen for indikasjon eller pasientgruppe',
  krever_begrunnelse: true,
  grunnlag: vurdering(
    'Regelen gjelder fra dosen pasienten faktisk bruker, men høyeste døgndose for voksne er ingen automatisk godkjent ramme for alle: en dose utenfor rammen for indikasjonen eller pasientgruppen krever forskriverens særskilte vurdering og vises ikke som automatisk godkjent.',
    [kilde],
    runde2(versjon, 'doseramme'),
  ),
})

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
 * Valgene for en risikogruppe (fagvurderingen 29.10.2026, beslutning 1, og den
 * langsomme varianten fra fagkontrollen 30.10.2026): reduksjon per trinn og
 * minste antall dager per trinn, med standardverdi, område og når et valg
 * krever begrunnelse.
 */
interface Risikogruppe {
  tittel: string
  prosent: { standard: number; omrade: [number, number]; begrunnelseOver?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Over denne reduksjonen ved lang behandlingstid kreves begrunnelse (beslutning 5.3). */
  langOver?: number
  dager: { standard: number; minst: number; begrunnelseUnderVedLang?: number; begrunnelse: string; henvisninger: Kildehenvisning[] }
  /** Mindre trinn (høyst 25 %) fra laveste døgndose når en større reduksjon er valgt (beslutning 5.4). */
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
    begrunnelse: 'Minst 28 dager per trinn ved høyest risiko, uten klinisk fastsatt øvre grense; standard 28. Minstetiden er et konservativt valg, ikke en validert biologisk terskel.',
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

/** Den langsomme varianten ved tidligere seponeringssymptomer, for alle stoffene (beslutning 5.6). */
const LANGSOM: Risikogruppe = {
  tittel: 'langsom variant etter tidligere seponeringssymptomer',
  prosent: {
    standard: 5,
    omrade: [1, 5],
    begrunnelse:
      'Etter seponeringssymptomer ved et tidligere forsøk: 5 % av aktuell dose per trinn, og forskriveren kan velge 1–5 %. Større reduksjoner er utenfor varianten. Dosene må kunne gis; et trinn som ikke kan gis, stopper planen.',
    henvisninger: [RCPSYCH.langvarig, RCPSYCH.smaa, NICE.tidligere, NICE.alvorlig],
  },
  dager: {
    standard: 28,
    minst: 28,
    begrunnelse: 'Minst 28 dager per trinn etter tidligere seponeringssymptomer, uten klinisk fastsatt øvre grense; lengre intervaller kan velges.',
    henvisninger: [RCPSYCH.tid, RCPSYCH.langvarig, NICE.tempo],
  },
  lavtTrinn: false,
}

/** Reduksjonen per trinn for gruppen, med begrunnelseskravene. */
function reduksjon(g: Risikogruppe, avklaring: Avklaring, versjon: number): Parameter {
  const krav: Begrunnelseskrav[] = [
    ...(g.prosent.begrunnelseOver !== undefined
      ? [
          {
            over: g.prosent.begrunnelseOver,
            grunnlag: vurdering(
              `Større reduksjoner enn ${g.prosent.begrunnelseOver} % krever dokumentert begrunnelse, særlig om behandlingstid og tidligere toleranse, fordi regelen ikke vet hvor lenge pasienten har brukt legemidlet.`,
              [RCPSYCH.plan, RCPSYCH.langvarig],
              avklaring,
            ),
          },
        ]
      : []),
    ...(g.langOver !== undefined
      ? [
          {
            over: g.langOver,
            ved: LANG_BEHANDLINGSTID.id,
            grunnlag: vurdering(
              'Etter lang behandlingstid bør reduksjonen vanligvis være 5–10 % (RCPsych, fagvurderingen 29.10.2026); mer krever begrunnelse, så et raskere valg aldri står som likeverdig standard.',
              [RCPSYCH.langvarig],
              runde2(versjon, 'langOver'),
            ),
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
          grunnlag: vurdering(`Kortere trinn enn ${krav} dager etter lang behandlingstid krever begrunnelse; etter lang bruk anbefaler RCPsych langsommere nedtrapping.`, [RCPSYCH.langvarig, RCPSYCH.tid], avklaring),
        },
      ],
    }),
    avklaring,
  })
}

/** Det felles prinsippet for stoffets risikogruppe: uten sluttdose, så planen aldri går til null. */
function strategi(d: Doser, g: Risikogruppe, avklaring: Avklaring, versjon: number): Nedtrappingsstrategi {
  const prosent = reduksjon(g, avklaring, versjon)
  if (!g.lavtTrinn) return { type: 'prosent_av_aktuell', prosent }
  const lav = runde2(versjon, 'lavtTrinn')
  return {
    type: 'prosent_av_aktuell',
    prosent,
    lav_prosent: forslag(25, 'prosent', 'Høyst 25 % per trinn fra laveste døgndose: en konservativ øvre ramme etter eksempelet i NICE, ikke en anbefaling. Aldri større enn reduksjonen ellers, så det betyr bare noe når en større reduksjon er valgt.', { henvisninger: [NICE.andel, RCPSYCH.lavDose], avklaring: lav }),
    lav_grense_mg: forslag(d.lavest, 'mg', 'Laveste døgndose preparatomtalen oppgir for voksne; fra den regnes dosen som lav.', { henvisninger: [d.kilde], avklaring: lav }),
  }
}

/** Laveste dose formuleringen kan gi, når den setter en praktisk grense (ikke en klinisk) for beregnede trinn. */
interface Praktiskgrense {
  mg: number
  /** Hvorfor ingen lavere dose kan gis, med egne ord. */
  hvorfor: string
  henvisninger: Kildehenvisning[]
}

const dosevalgFor = (p: Praktiskgrense | undefined, versjon: number): Dosevalg | undefined =>
  p && {
    min_mg: forslag(p.mg, 'mg', `Praktisk grense, ikke en klinisk: ${p.hvorfor} Planen beregner ingen trinn under ${tall(p.mg)} mg; lavere doser krever en annen dokumentert administrasjonsform.`, {
      art: 'bindende_krav',
      henvisninger: p.henvisninger,
      avklaring: runde2(versjon, 'praktisk'),
    }),
  }

/** Hva forskriveren kan velge for en parameter, og hva som krever begrunnelse. */
function valgområde(p: Parameter): string {
  if (!p.justerbar || !p.omrade) return ''
  const krav = (p.begrunnelseskrav ?? []).map((k) => kravtekst(k, p, [LANG_BEHANDLINGSTID]))
  return ` (forskriveren kan velge ${omradetekst(p as Parameter & { omrade: [number, number] })}${krav.length > 0 ? `; begrunnelse kreves ${krav.join(' og ')}` : ''})`
}

const UTEN_NULL = `Planen viser høyst ${PLANHORISONT_TRINN} reduksjoner (en teknisk planhorisont) og går ikke til null: siste dose fortsetter til planen revurderes, og avslutningen vurderes individuelt.`

/** OUSFARs valg i en regel, skrevet ut fra verdiene så teksten aldri kan avvike fra dem. */
function valgtekst(s: Nedtrappingsstrategi, trinnlengde: Parameter, praktisk?: Praktiskgrense): string {
  if (s.type !== 'prosent_av_aktuell') throw new Error(`Strategien ${s.type} brukes ikke i P7`)
  const lav = s.lav_grense_mg ? `, høyst ${s.lav_prosent?.verdi} % fra ${tall(s.lav_grense_mg.verdi!)} mg` : ''
  const grense = praktisk ? ` Ingen trinn under ${tall(praktisk.mg)} mg, den laveste dosen formuleringen kan gi.` : ''
  return `OUSFAR trapper ned med ${s.prosent.verdi} % av aktuell dose${valgområde(s.prosent)}${lav}, med minst ${trinnlengde.verdi} dager per trinn${valgområde(trinnlengde)}.${grense} ${UTEN_NULL}`
}

/** Valgene i et regneeksempel: justeringer (prosent, dager), svarene på spørsmålene, og begrunnelsen. */
interface Eksempelvalg {
  justert?: Partial<Record<keyof typeof JUSTERING, number>>
  lang?: boolean
  utenforRamme?: boolean
  begrunnelse?: string
}

/** Et regneeksempel; `forventet` er planen for forløpet `fra`, med linjen om slutten. */
const eks = (id: string, beskrivelse: string, startdose_mg: number, forventet: string[], valg: Eksempelvalg = {}): Regneeksempel => ({
  id,
  beskrivelse,
  inndata: {
    startdose_mg,
    svar: { [LANG_BEHANDLINGSTID.id]: valg.lang ?? false, [UTENFOR_DOSERAMME_ID]: valg.utenforRamme ?? false },
    ...(valg.justert && { justert: valg.justert as Record<string, number> }),
    ...(valg.begrunnelse && { begrunnelse: valg.begrunnelse }),
  },
  forventet: { fra: forventet },
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
  /** Laveste dose formuleringen kan gi, når den er en praktisk grense for trinnene (beslutning 3). */
  praktisk?: Praktiskgrense
  /** Versjonene før fagkontrollen 30.10.2026, når regelen har en annen historikk enn P7-reglene (f.eks. fra pilotsettet). */
  tidligere?: Versjon[]
  /** Unntak for stoffet i tillegg til tidligere seponeringssymptomer. */
  unntak?: Unntak[]
  kildetro: Utsagn[]
  /** Begrunnelser for valg utover det felles prinsippet. */
  tilpasninger?: Utsagn[]
  forutsetninger?: string[]
  usikkerhet: string[]
  /** Eksemplene med bekreftelsene gitt og alle unntak avkreftet; kontrolleksemplene uten dem legges til av {@link seponeringsregel}. */
  eksempler: Regneeksempel[]
  /** Startdosen og planen i eksempelet for den langsomme varianten (standardvalgene). */
  langsom: { startdose_mg: number; forventet: string[] }
}

const FORUTSETNINGER_P7 = [
  'Planen gjelder elektiv seponering hos voksne, ikke bytte til et annet antidepressiv.',
  'Beregningen kjenner dosen, om behandlingstiden er lang, om dosen er utenfor rammen for indikasjonen eller pasientgruppen, og forskriverens valg av trinnstørrelse og trinnlengde. Den vet ikke hvordan pasienten tåler hvert trinn; trinnene er minstetider, og planen tilpasses symptomene underveis.',
]

const FELLES_USIKKERHET = [
  'Prosentene og trinnlengdene er tillatte rammer for individuell planlegging (fagvurderingen 29.10.2026), ikke vitenskapelig dokumenterte optimale verdier.',
  `Ingen fast nedre grense for beregnede trinn er godkjent (fagkontrollen 30.10.2026): en lav dose kan fortsatt gi betydelig reseptorbinding, og noen trenger svært lave doser før seponering (RCPsych). Planen viser derfor høyst ${PLANHORISONT_TRINN} reduksjoner, en teknisk horisont, og videre nedtrapping beregnes fra dosen pasienten da bruker. Hvor langt ned den enkelte trenger å gå, avgjøres individuelt.`,
  'Hva som er lang behandlingstid, avgjør forskriveren; RCPsych sier «mange måneder eller lenger» uten en eksakt grense.',
  'Regelen har ingen toleranse: et trinn som ikke kan gis nøyaktig med norske preparater, stopper planen ved trinnet før, med de nærmeste dosene og den faktiske reduksjonen. En annen dose er et nytt forslag med egen vurdering og godkjenning (fagkontrollen 30.10.2026).',
]

/** Det hver beregnbar P7-regel stiller som betingelser: bekreftelsene, unntakene og spørsmålene. */
function betingelser(s: Stoffregel, versjon: number, langsom: boolean) {
  return {
    bekreftelser: [STARTFORSLAG, organfunksjon(versjon), ...(langsom ? [tidligereVurdert(versjon)] : [])],
    unntak: [...(langsom ? [] : [tidligereSymptomer(versjon)]), ...(s.unntak ?? [])],
    sporsmal: [LANG_BEHANDLINGSTID, utenforDoseramme(versjon, s.dose.kilde)],
  }
}

/** Svarene og bekreftelsene et eksempel bygger på, så bare det eksempelet sier noe om, avviker. */
function besvart(r: Pick<Regel, 'bekreftelser' | 'unntak' | 'sporsmal'>, e: Regneeksempel): Regneeksempel {
  return {
    ...e,
    inndata: {
      bekreftet: r.bekreftelser.map((b) => b.id),
      pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
      ...e.inndata,
      ...(e.inndata.justert && { justert: Object.fromEntries(Object.entries(e.inndata.justert).map(([k, v]) => [STI[k as keyof typeof STI], v])) }),
    },
  }
}

/** Kontrolleksemplene hver beregnbar P7-regel har: hver betingelse som mangler, stopper beregningen. */
function kontrolleksempler(r: Pick<Regel, 'bekreftelser' | 'unntak' | 'sporsmal'>, start: number): Regneeksempel[] {
  const avkreftet = Object.fromEntries(r.unntak.map((u) => [u.id, false]))
  const bekreftet = r.bekreftelser.map((b) => b.id)
  const svar = { [LANG_BEHANDLINGSTID.id]: false, [UTENFOR_DOSERAMME_ID]: false }
  const ut: Regneeksempel[] = [
    { id: 'uten-bekreftelse', beskrivelse: 'Uten bekreftelsene stopper beregningen.', inndata: { startdose_mg: start, pasientforhold: avkreftet, svar }, forventet: {}, stopp: /Må bekreftes før beregning: Planen er et startforslag/ },
    {
      id: 'uten-organfunksjon',
      beskrivelse: 'Uten bekreftelse av at organfunksjon og interaksjoner er vurdert, stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet: bekreftet.filter((b) => b !== ORGANFUNKSJON_ID), pasientforhold: avkreftet, svar },
      forventet: {},
      stopp: /Må bekreftes før beregning: Lever- og nyrefunksjon og interaksjoner er vurdert/,
    },
    {
      id: 'uten-behandlingstid',
      beskrivelse: 'Uten svar på om behandlingstiden er lang, stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: avkreftet, svar: { [UTENFOR_DOSERAMME_ID]: false } },
      forventet: {},
      stopp: /Må besvares før beregning: Har pasienten brukt legemidlet i mange måneder eller lenger\?/,
    },
    {
      id: 'utenfor-doseramme-uten-begrunnelse',
      beskrivelse: 'En dose utenfor rammen for indikasjonen eller pasientgruppen krever en begrunnelse; uten den stopper beregningen.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: avkreftet, svar: { ...svar, [UTENFOR_DOSERAMME_ID]: true } },
      forventet: {},
      stopp: /Svaret ja \(dose utenfor rammen for indikasjon eller pasientgruppe\) krever en skriftlig begrunnelse/,
    },
  ]
  if (r.unntak.some((u) => u.id === TIDLIGERE_SYMPTOMER_ID)) {
    ut.push({
      id: 'tidligere-symptomer',
      beskrivelse: 'Har et tidligere forsøk gitt seponeringssymptomer, gjelder ikke regelen, men den langsomme varianten.',
      inndata: { startdose_mg: start, bekreftet, pasientforhold: { ...avkreftet, [TIDLIGERE_SYMPTOMER_ID]: true }, svar },
      forventet: {},
      stopp: /Regelen gjelder ikke: Et tidligere forsøk .* da gjelder den langsomme varianten/,
    })
  }
  return ut
}

/** Inndatakravet for startdosen: fra dosen pasienten bruker, høyst høyeste døgndose for voksne. */
const startdosekrav = (d: Doser): Regel['inndata'] => [
  {
    navn: 'startdose',
    omrade: [0, d.hoyest],
    art: 'bindende_krav',
    grunnlag: vurdering(
      `Regelen gjelder fra dosen pasienten faktisk bruker, også lave restdoser under det ordinære doseområdet, høyst den høyeste døgndosen preparatomtalen oppgir for voksne (${tall(d.hoyest)} mg). Den er ingen automatisk godkjent ramme for alle: er dosen utenfor rammen for indikasjonen eller pasientgruppen, kreves et ja og en begrunnelse.`,
      [d.kilde],
      null,
    ),
  },
]

const FELLES_KILDETRO = [
  utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
  utsagn('To til fire uker mellom reduksjonene er et vanlig utgangspunkt, og planen tilpasses symptomene underveis.', RCPSYCH.tid, RCPSYCH.plan),
  utsagn('Neste reduksjon gjøres først når seponeringssymptomene er borte eller tålelige; ved mer alvorlige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', NICE.tempo, NICE.alvorlig),
]

const FELLES_TILPASNINGER = [
  utsagn(
    `Planen går ikke til null og foreslår ingen dato for siste dose. Ingen avslutning (nulltrinn) og ingen fast nedre grense er godkjent (fagkontrollene 29. og 30.10.2026). Planen viser høyst ${PLANHORISONT_TRINN} reduksjoner, aldri et trinn under laveste dose formuleringen kan gi, og stopper ved første trinn som ikke kan gis; siste beregnede dose er ikke nødvendigvis den siste pasienten trenger før seponering.`,
    RCPSYCH.lavDose,
  ),
  utsagn(
    'Regelen gjelder fra dosen pasienten faktisk bruker. Høyeste døgndose for voksne er ingen automatisk godkjent ramme: en dose utenfor rammen for indikasjonen eller pasientgruppen krever et ja og en begrunnelse fra forskriveren, og organfunksjon og interaksjoner må være vurdert for alle stoffer.',
  ),
]

function seponeringsregel(s: Stoffregel, langsom = false): Regel {
  const versjoner = langsom ? [NY_ETTER_RUNDE_2(`langsom variant for ${s.navn} etter tidligere seponeringssymptomer.`)] : [...(s.tidligere ?? [UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3]), KONTROLL_4]
  const versjon = versjoner.length
  const gruppe = langsom ? LANGSOM : s.gruppe
  const avklaring = langsom ? runde2(versjon, 'langsom') : beslutning1(versjon)
  const strat = strategi(s.dose, gruppe, avklaring, versjon)
  const trinnlengde = dagerPerTrinn(gruppe, avklaring)
  const virkestoff = { type: 'virkestoff' as const, nokkel: s.nokkel }
  const dosevalg = dosevalgFor(s.praktisk, versjon)
  const vilkar = betingelser(s, versjon, langsom)
  const eksempler = langsom
    ? [
        eks(`fra-${tall(s.langsom.startdose_mg).replace(',', '-')}-mg`, `Fra ${tall(s.langsom.startdose_mg)} mg med standardvalgene: 5 % per trinn, minst 28 dager.`, s.langsom.startdose_mg, s.langsom.forventet),
        stopp('over-5-prosent', 'Mer enn 5 % per trinn er utenfor den langsomme varianten.', s.langsom.startdose_mg, /Reduksjon per trinn \(% av aktuell dose\): 10 % er utenfor det regelen tillater \(1–5 %\)/, { justert: { prosent: 10 } }),
      ]
    : s.eksempler
  const start = langsom ? s.langsom.startdose_mg : s.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg
  return {
    id: `seponering-${s.nokkel}${langsom ? '-langsom' : ''}`,
    versjon,
    tittel: `Seponering av ${s.navn}, ${gruppe.tittel}`,
    fra: virkestoff,
    til: null,
    plan: {
      form: 'seponering',
      forlop: [
        {
          id: 'fra',
          virkestoff,
          administrasjon: 'peroral',
          ...(dosevalg && { dosevalg }),
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [{ type: 'nedtrapping', strategi: strat, trinnlengde, avslutning: 'individuell', horisont: planhorisont() }],
        },
      ],
    },
    inndata: startdosekrav(s.dose),
    ...vilkar,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [...s.kildetro, ...FELLES_KILDETRO],
      tilpasninger: [
        utsagn(valgtekst(strat, trinnlengde, s.praktisk), NICE.andel, RCPSYCH.tid),
        langsom
          ? utsagn(
              'Varianten gjelder når et tidligere forsøk har gitt seponeringssymptomer: 1–5 % per trinn (standard 5 %) og minst 28 dager, og dosene må kunne gis. Forskriveren må vurdere og bekrefte at de tidligere symptomene virkelig var seponeringssymptomer.',
              NICE.tidligere,
              RCPSYCH.langvarig,
            )
          : utsagn(
              'Planen er et startforslag som forskriveren må bekrefte, og forskriveren må oppgi om behandlingstiden er lang. Forskriveren kan velge mindre trinn eller lengre tid innenfor områdene over; et raskere valg krever begrunnelse, og valget og begrunnelsen vises i planen. Har et tidligere forsøk gitt seponeringssymptomer, gjelder den langsomme varianten.',
              NICE.tempo,
              NICE.tidligere,
              RCPSYCH.langvarig,
            ),
        ...FELLES_TILPASNINGER,
        ...(s.tilpasninger ?? []),
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, ...FORUTSETNINGER_P7, ...(s.forutsetninger ?? [])],
      usikkerhet: [...FELLES_USIKKERHET, ...s.usikkerhet],
    },
    referanser: [pn(`SwitchAntidepressants:${s.kode}>Stop`)],
    eksempler: [...eksempler.map((e) => besvart(vilkar, e)), ...kontrolleksempler(vilkar, start)],
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(versjoner) },
  }
}

/** Et stoff med det regelen bygges av; selve regelen lages i {@link seponeringsregel}. */
const stoff = (s: Stoffregel) => s

const utenfor = (mg: number) => new RegExp(`Startdosen ${tall(mg)} mg er utenfor`)
const KREVER_BEGRUNNELSE = /krever en skriftlig begrunnelse fra forskriveren/
const UNDER_PRAKTISK_GRENSE = /den laveste dosen som kan gis med formuleringen regelen gjelder/

/** Syntetisk begrunnelse i eksemplene; aldri pasientopplysninger. */
const BEGRUNNELSE = 'Kort behandlingstid (åtte uker) og ingen tidligere seponeringssymptomer; pasienten ønsker raskere nedtrapping.'
const BEGRUNNELSE_RAMME = 'Dosen er vurdert særskilt for pasientgruppen; syntetisk eksempel.'

/** Kapsler som skal svelges hele, med laveste styrke: en praktisk grense for trinnene. */
const heleKapsler = (mg: number, formulering: string, ...henvisninger: Kildehenvisning[]): Praktiskgrense => ({
  mg,
  hvorfor: `${formulering} skal svelges hele, og laveste styrke er ${tall(mg)} mg, så ingen lavere dose kan gis med dem.`,
  henvisninger,
})

/* --- Reglene ------------------------------------------------------------------------ */

const citalopram = stoff({
  nokkel: 'citalopram',
  navn: 'citalopram',
  kode: 'Ci',
  dose: { lavest: 10, hoyest: 40, kilde: SPC.cipramilDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Citalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipramilSeponering)],
  usikkerhet: ['Trinnene under 10 mg krever deling av 10 mg, som FEST ikke oppgir som delbar, eller flytende form; uten det stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,84 mg',
      'fra dag 309: 0,63 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
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
      'fra dag 309: 5,65 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('lang-25-uten-begrunnelse', 'Etter lang behandlingstid krever 25 % (over 10 %) en begrunnelse.', 20, KREVER_BEGRUNNELSE, { lang: true }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse: 10 mg, så høyst 25 % fra laveste døgndose.', 20, [
      'dag 1–28: 10 mg',
      'dag 29–56: 7,5 mg',
      'dag 57–84: 5,63 mg',
      'dag 85–112: 4,22 mg',
      'dag 113–140: 3,16 mg',
      'dag 141–168: 2,37 mg',
      'dag 169–196: 1,78 mg',
      'dag 197–224: 1,33 mg',
      'dag 225–252: 1 mg',
      'dag 253–280: 0,75 mg',
      'dag 281–308: 0,56 mg',
      'fra dag 309: 0,42 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('50-uten-begrunnelse', '50 % (over 25 %) uten begrunnelse stopper.', 20, KREVER_BEGRUNNELSE, { justert: { prosent: 50 } }),
    eks(
      'fra-2-5-mg-5-prosent',
      'Fra 2,5 mg med 5 % per trinn: ingen nedre grense stopper trinnene (fra 2,5 til omtrent 1 mg er det rundt 18 slike trinn); planen viser 12 reduksjoner, den tekniske horisonten, og regnes på nytt fra dosen pasienten da bruker.',
      2.5,
      [
        'dag 1–28: 2,38 mg',
        'dag 29–56: 2,26 mg',
        'dag 57–84: 2,14 mg',
        'dag 85–112: 2,04 mg',
        'dag 113–140: 1,93 mg',
        'dag 141–168: 1,84 mg',
        'dag 169–196: 1,75 mg',
        'dag 197–224: 1,66 mg',
        'dag 225–252: 1,58 mg',
        'dag 253–280: 1,5 mg',
        'dag 281–308: 1,42 mg',
        'fra dag 309: 1,35 mg',
        'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
      ],
      { justert: { prosent: 5 } },
    ),
    eks('utenfor-doseramme-begrunnet', 'En dose utenfor rammen for indikasjonen eller pasientgruppen gir planen med et ja og en begrunnelse, og begrunnelsen står som kontroll.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,84 mg',
      'fra dag 309: 0,63 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], {
      utenforRamme: true,
      begrunnelse: BEGRUNNELSE_RAMME,
    }),
  ],
  langsom: { startdose_mg: 20, forventet: [
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
    'fra dag 309: 10,81 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const escitalopram = stoff({
  nokkel: 'escitalopram',
  navn: 'escitalopram',
  kode: 'Es',
  dose: { lavest: 5, hoyest: 20, kilde: SPC.cipralexDose },
  gruppe: MIDDELS,
  tidligere: [
    { merknad: 'Utkast til pilotregel (P4.7).' },
    { merknad: 'Kildegrunnlaget for trinnlengden rettet etter kontrollen av P7 (PR #286): NICEs én til to uker gjelder fluoksetin, så forslaget bygger på RCPsychs to til fire uker.' },
    { merknad: 'Flyttet fra pilotsettet (P4) til nedtrappingsreglene (P7), så escitalopram følger det samme prinsippet som de andre antidepressivene.', dato: RUNDE_1 },
    KONTROLL_3,
  ],
  kildetro: [utsagn('Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipralexSeponering)],
  tilpasninger: [utsagn('Pilotregelens sluttdose på 2,5 mg er fjernet; fagkontrollene 29. og 30.10.2026 avviste både den og en fast nedre grense.', SPC.cipralexDose)],
  usikkerhet: ['Doser under 5 mg krever dråper (1 mg per dråpe i FEST) eller deling; finnes de ikke, stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,84 mg',
      'fra dag 309: 0,63 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
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
      'fra dag 309: 2,82 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('over-maksimum', '25 mg er over dosene regelen gjelder for.', 25, utenfor(25)),
  ],
  langsom: { startdose_mg: 10, forventet: [
    'dag 1–28: 9,5 mg',
    'dag 29–56: 9,03 mg',
    'dag 57–84: 8,57 mg',
    'dag 85–112: 8,15 mg',
    'dag 113–140: 7,74 mg',
    'dag 141–168: 7,35 mg',
    'dag 169–196: 6,98 mg',
    'dag 197–224: 6,63 mg',
    'dag 225–252: 6,3 mg',
    'dag 253–280: 5,99 mg',
    'dag 281–308: 5,69 mg',
    'fra dag 309: 5,4 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const sertralin = stoff({
  nokkel: 'sertralin',
  navn: 'sertralin',
  kode: 'Se',
  dose: { lavest: 25, hoyest: 200, kilde: SPC.zoloftDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Sertralin trappes ned gradvis over minst én til to uker; noen trenger flere uker eller måneder.', SPC.zoloftSeponering)],
  usikkerhet: [
    'Trinnene under 25 mg kan ikke gis med hele tabletter på 25, 50 og 100 mg. Konsentratet til mikstur (20 mg/ml) brukes ikke før doseringen per ml og måleoppløsningen er dokumentert og nøyaktigheten kontrollert (P5).',
  ],
  eksempler: [
    eks('fra-100-mg', 'Fra 100 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 100, [
      'dag 1–28: 75 mg',
      'dag 29–56: 56,25 mg',
      'dag 57–84: 42,19 mg',
      'dag 85–112: 31,64 mg',
      'dag 113–140: 23,73 mg',
      'dag 141–168: 17,8 mg',
      'dag 169–196: 13,35 mg',
      'dag 197–224: 10,01 mg',
      'dag 225–252: 7,51 mg',
      'dag 253–280: 5,63 mg',
      'dag 281–308: 4,22 mg',
      'fra dag 309: 3,17 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
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
      'fra dag 309: 14,12 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true, justert: { prosent: 10 } }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn (under 28) en begrunnelse.', 50, KREVER_BEGRUNNELSE, { lang: true, justert: { prosent: 10, dager: 14 } }),
    eks('fra-50-mg-kort-14-dager', 'Fra 50 mg etter kort behandlingstid med 14 dager per trinn: ingen begrunnelse trengs.', 50, [
      'dag 1–14: 37,5 mg',
      'dag 15–28: 28,13 mg',
      'dag 29–42: 21,09 mg',
      'dag 43–56: 15,82 mg',
      'dag 57–70: 11,87 mg',
      'dag 71–84: 8,9 mg',
      'dag 85–98: 6,67 mg',
      'dag 99–112: 5,01 mg',
      'dag 113–126: 3,75 mg',
      'dag 127–140: 2,82 mg',
      'dag 141–154: 2,11 mg',
      'fra dag 155: 1,58 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { dager: 14 } }),
    eks('fra-12-5-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn, uten nedre grense.', 12.5, [
      'dag 1–28: 9,38 mg',
      'dag 29–56: 7,03 mg',
      'dag 57–84: 5,27 mg',
      'dag 85–112: 3,96 mg',
      'dag 113–140: 2,97 mg',
      'dag 141–168: 2,22 mg',
      'dag 169–196: 1,67 mg',
      'dag 197–224: 1,25 mg',
      'dag 225–252: 0,94 mg',
      'dag 253–280: 0,7 mg',
      'dag 281–308: 0,53 mg',
      'fra dag 309: 0,4 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    stopp('over-maksimum', '250 mg er over dosene regelen gjelder for.', 250, utenfor(250)),
  ],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'dag 141–168: 36,75 mg',
    'dag 169–196: 34,92 mg',
    'dag 197–224: 33,17 mg',
    'dag 225–252: 31,51 mg',
    'dag 253–280: 29,94 mg',
    'dag 281–308: 28,44 mg',
    'fra dag 309: 27,02 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
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
      'Fluoksetin har ikke mindre trinn ved lav dose, i motsetning til de andre reglene med middels risiko: den lange virketiden gir et gradvis fall i konsentrasjonen etter hvert trinn. Fagkontrollen 30.10.2026 beholdt denne særregelen.',
      SPC.fluoksetinSeponering,
      NICE.fluoksetin,
    ),
    utsagn('Trinnene varer minst 28 dager og kan forlenges så lenge det trengs for å fange opp sene seponeringssymptomer, men ikke kortes ned.', RCPSYCH.fluoksetin),
    utsagn('Ved 20 mg daglig kan forskriveren i stedet velge dosering annenhver dag, en egen regel. Om 5 mg brukes som et frivillig punkt for å vurdere avslutningen, avgjør forskriveren; det er ingen sperre i regelen.', NICE.fluoksetin),
  ],
  usikkerhet: ['Doser under 10 mg krever flytende form eller deling i fire; finnes det ikke, stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-40-mg', 'Fra 40 mg med standardvalgene: 25 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 40, [
      'dag 1–28: 30 mg',
      'dag 29–56: 22,5 mg',
      'dag 57–84: 16,88 mg',
      'dag 85–112: 12,66 mg',
      'dag 113–140: 9,49 mg',
      'dag 141–168: 7,12 mg',
      'dag 169–196: 5,34 mg',
      'dag 197–224: 4 mg',
      'dag 225–252: 3 mg',
      'dag 253–280: 2,25 mg',
      'dag 281–308: 1,69 mg',
      'fra dag 309: 1,27 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-20-mg-42-dager', 'Fra 20 mg med 42 dager per trinn, så sene seponeringssymptomer kan fanges opp før neste reduksjon.', 20, [
      'dag 1–42: 15 mg',
      'dag 43–84: 11,25 mg',
      'dag 85–126: 8,44 mg',
      'dag 127–168: 6,33 mg',
      'dag 169–210: 4,75 mg',
      'dag 211–252: 3,56 mg',
      'dag 253–294: 2,67 mg',
      'dag 295–336: 2 mg',
      'dag 337–378: 1,5 mg',
      'dag 379–420: 1,13 mg',
      'dag 421–462: 0,84 mg',
      'fra dag 463: 0,63 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { justert: { dager: 42 } }),
    eks('fra-20-mg-50-begrunnet', 'Fra 20 mg med 50 % per trinn og begrunnelse: ingen mindre trinn ved lav dose.', 20, [
      'dag 1–28: 10 mg',
      'dag 29–56: 5 mg',
      'dag 57–84: 2,5 mg',
      'dag 85–112: 1,25 mg',
      'dag 113–140: 0,63 mg',
      'dag 141–168: 0,31 mg',
      'dag 169–196: 0,16 mg',
      'dag 197–224: 0,08 mg',
      'dag 225–252: 0,04 mg',
      'fra dag 253: 0,02 mg',
      'teknisk grense: ingen trinn under 0,01 mg; avslutning vurderes individuelt',
    ], { justert: { prosent: 50 }, begrunnelse: BEGRUNNELSE }),
    stopp('fra-20-mg-14-dager', 'Kortere trinn enn 28 dager er utenfor regelen.', 20, /Minste antall dager per trinn: 14 dager er utenfor det regelen tillater/, { justert: { dager: 14 } }),
  ],
  langsom: { startdose_mg: 20, forventet: [
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
    'fra dag 309: 10,81 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const fluvoksamin = stoff({
  nokkel: 'fluvoksamin',
  navn: 'fluvoksamin',
  kode: 'Fv',
  dose: { lavest: 50, hoyest: 300, kilde: P7.fevarinDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Fluvoksamin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.fevarinSeponering)],
  usikkerhet: [],
  eksempler: [eks('fra-100-mg', 'Fra 100 mg med standardvalgene, til den tekniske planhorisonten.', 100, [
    'dag 1–28: 75 mg',
    'dag 29–56: 56,25 mg',
    'dag 57–84: 42,19 mg',
    'dag 85–112: 31,64 mg',
    'dag 113–140: 23,73 mg',
    'dag 141–168: 17,8 mg',
    'dag 169–196: 13,35 mg',
    'dag 197–224: 10,01 mg',
    'dag 225–252: 7,51 mg',
    'dag 253–280: 5,63 mg',
    'dag 281–308: 4,22 mg',
    'fra dag 309: 3,17 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 100, forventet: [
    'dag 1–28: 95 mg',
    'dag 29–56: 90,25 mg',
    'dag 57–84: 85,74 mg',
    'dag 85–112: 81,45 mg',
    'dag 113–140: 77,38 mg',
    'dag 141–168: 73,51 mg',
    'dag 169–196: 69,83 mg',
    'dag 197–224: 66,34 mg',
    'dag 225–252: 63,02 mg',
    'dag 253–280: 59,87 mg',
    'dag 281–308: 56,88 mg',
    'fra dag 309: 54,04 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const venlafaksin = stoff({
  nokkel: 'venlafaksin',
  navn: 'venlafaksin',
  kode: 'Ve',
  dose: { lavest: 37.5, hoyest: 375, kilde: P7.efexorDose },
  gruppe: HOY,
  praktisk: heleKapsler(37.5, 'Depotkapslene', P7.efexorSeponering),
  kildetro: [
    utsagn('Venlafaksin trappes ned gradvis over minst én til to uker, for noen over måneder; kapslene svelges hele.', P7.efexorSeponering),
    utsagn('Venlafaksin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske venlafaksinpreparater har modifisert frisetting; kapslene og depottablettene deles ikke.'],
  usikkerhet: [
    'De fleste trinnene kan ikke gis nøyaktig med kapsler på 37,5, 75 og 150 mg, så planen stopper ved trinnet før. Doser under 37,5 mg krever en dokumentert annen formulering.',
  ],
  eksempler: [
    eks('fra-75-mg', 'Fra 75 mg: 10 % per trinn, minst 28 dager, til neste trinn ville vært under 37,5 mg (den praktiske grensen for depotkapslene).', 75, [
      'dag 1–28: 67,5 mg',
      'dag 29–56: 60,75 mg',
      'dag 57–84: 54,68 mg',
      'dag 85–112: 49,21 mg',
      'dag 113–140: 44,29 mg',
      'fra dag 141: 39,86 mg',
      'praktisk grense: ingen trinn under 37,5 mg; avslutning vurderes individuelt',
    ]),
    stopp('fra-37-5-mg', 'Fra 37,5 mg kan ingen lavere dose gis med depotkapslene: regelen har ingen trinn, og beregningen sier hvorfor.', 37.5, UNDER_PRAKTISK_GRENSE),
    stopp('25-prosent', 'Mer enn 10 % per trinn er utenfor regelen ved høyest risiko og krever en individuelt utarbeidet plan.', 150, /Reduksjon per trinn \(% av aktuell dose\): 25 % er utenfor det regelen tillater \(5–10 %\)/, { justert: { prosent: 25 } }),
  ],
  langsom: { startdose_mg: 75, forventet: [
    'dag 1–28: 71,25 mg',
    'dag 29–56: 67,69 mg',
    'dag 57–84: 64,3 mg',
    'dag 85–112: 61,09 mg',
    'dag 113–140: 58,03 mg',
    'dag 141–168: 55,13 mg',
    'dag 169–196: 52,38 mg',
    'dag 197–224: 49,76 mg',
    'dag 225–252: 47,27 mg',
    'dag 253–280: 44,91 mg',
    'dag 281–308: 42,66 mg',
    'fra dag 309: 40,53 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const duloksetin = stoff({
  nokkel: 'duloksetin',
  navn: 'duloksetin',
  kode: 'Du',
  dose: { lavest: 30, hoyest: 120, kilde: P7.cymbaltaDose },
  gruppe: HOY,
  praktisk: heleKapsler(30, 'Enterokapslene', P7.cymbaltaDose),
  kildetro: [
    utsagn('Duloksetin trappes ned gradvis over minst én til to uker, ikke seponeres brått.', P7.cymbaltaSeponering),
    utsagn('Duloksetin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko),
  ],
  forutsetninger: ['Alle norske duloksetinpreparater er enterokapsler, som ikke deles eller åpnes; 20 mg finnes bare med godkjenningsfritak.'],
  usikkerhet: ['Trinnene mellom 60 og 30 mg kan ikke gis med registrerte kapsler på 30 og 60 mg, så planen stopper ved trinnet før. Doser under 30 mg krever en dokumentert annen administrasjonsform.'],
  eksempler: [
    eks('fra-60-mg', 'Fra 60 mg: 10 % per trinn, minst 28 dager, til neste trinn ville vært under 30 mg (den praktiske grensen for enterokapslene).', 60, [
      'dag 1–28: 54 mg',
      'dag 29–56: 48,6 mg',
      'dag 57–84: 43,74 mg',
      'dag 85–112: 39,37 mg',
      'dag 113–140: 35,43 mg',
      'fra dag 141: 31,89 mg',
      'praktisk grense: ingen trinn under 30 mg; avslutning vurderes individuelt',
    ]),
    stopp('fra-30-mg', 'Fra 30 mg kan ingen lavere dose gis med enterokapslene: regelen har ingen trinn, og beregningen sier hvorfor.', 30, UNDER_PRAKTISK_GRENSE),
  ],
  langsom: { startdose_mg: 60, forventet: [
    'dag 1–28: 57 mg',
    'dag 29–56: 54,15 mg',
    'dag 57–84: 51,44 mg',
    'dag 85–112: 48,87 mg',
    'dag 113–140: 46,43 mg',
    'dag 141–168: 44,11 mg',
    'dag 169–196: 41,9 mg',
    'dag 197–224: 39,81 mg',
    'dag 225–252: 37,81 mg',
    'dag 253–280: 35,92 mg',
    'dag 281–308: 34,13 mg',
    'fra dag 309: 32,42 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const vortioksetin = stoff({
  nokkel: 'vortioksetin',
  navn: 'vortioksetin',
  kode: 'Vo',
  dose: { lavest: 5, hoyest: 20, kilde: P7.brintellixDose },
  gruppe: LAV,
  kildetro: [utsagn('Gradvis dosereduksjon kan vurderes, men preparatomtalen har ikke data nok til en bestemt nedtrappingsplan.', P7.brintellixSeponering)],
  usikkerhet: ['Nedtrappingen bygger på NICEs og RCPsychs generelle råd; preparatomtalen sier uttrykkelig at data mangler for en bestemt plan.', 'Trinnene under 5 mg krever flytende form (dråper); uten det stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg med standardvalgene, til den tekniske planhorisonten.', 20, [
      'dag 1–28: 15 mg',
      'dag 29–56: 11,25 mg',
      'dag 57–84: 8,44 mg',
      'dag 85–112: 6,33 mg',
      'dag 113–140: 4,75 mg',
      'dag 141–168: 3,56 mg',
      'dag 169–196: 2,67 mg',
      'dag 197–224: 2 mg',
      'dag 225–252: 1,5 mg',
      'dag 253–280: 1,13 mg',
      'dag 281–308: 0,84 mg',
      'fra dag 309: 0,63 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-10-mg-lang', 'Fra 10 mg etter lang behandlingstid med 25 % og 28 dager: ingen begrunnelse trengs ved lav risiko.', 10, [
      'dag 1–28: 7,5 mg',
      'dag 29–56: 5,63 mg',
      'dag 57–84: 4,22 mg',
      'dag 85–112: 3,16 mg',
      'dag 113–140: 2,37 mg',
      'dag 141–168: 1,78 mg',
      'dag 169–196: 1,33 mg',
      'dag 197–224: 1 mg',
      'dag 225–252: 0,75 mg',
      'dag 253–280: 0,56 mg',
      'dag 281–308: 0,42 mg',
      'fra dag 309: 0,32 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ], { lang: true }),
    stopp('lang-14-dager-uten-begrunnelse', 'Etter lang behandlingstid krever 14 dager per trinn en begrunnelse.', 10, KREVER_BEGRUNNELSE, { lang: true, justert: { dager: 14 } }),
  ],
  langsom: { startdose_mg: 10, forventet: [
    'dag 1–28: 9,5 mg',
    'dag 29–56: 9,03 mg',
    'dag 57–84: 8,57 mg',
    'dag 85–112: 8,15 mg',
    'dag 113–140: 7,74 mg',
    'dag 141–168: 7,35 mg',
    'dag 169–196: 6,98 mg',
    'dag 197–224: 6,63 mg',
    'dag 225–252: 6,3 mg',
    'dag 253–280: 5,99 mg',
    'dag 281–308: 5,69 mg',
    'fra dag 309: 5,4 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
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
  tilpasninger: [utsagn('Unntaket ved alvorlig nedsatt leverfunksjon kommer i tillegg til bekreftelsen om organfunksjon og interaksjoner, som gjelder alle stoffene; det alene er ikke nok (fagkontrollen 30.10.2026).', P7.aurorixDose)],
  usikkerhet: [
    'Preparatomtalen og RCPsych trekker i ulik retning: preparatomtalen gir ingen anvisning om nedtrapping, mens RCPsych regner moklobemid blant stoffene med høyest risiko. Regelen følger RCPsych; det må avklares faglig.',
    'Trinnene krever doser som ikke kan settes sammen av tabletter på 150 og 300 mg; uten det stopper planen ved trinnet før.',
  ],
  eksempler: [eks('fra-300-mg', 'Fra 300 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 300, [
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
    'fra dag 309: 84,73 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 300, forventet: [
    'dag 1–28: 285 mg',
    'dag 29–56: 270,75 mg',
    'dag 57–84: 257,21 mg',
    'dag 85–112: 244,35 mg',
    'dag 113–140: 232,13 mg',
    'dag 141–168: 220,53 mg',
    'dag 169–196: 209,5 mg',
    'dag 197–224: 199,03 mg',
    'dag 225–252: 189,07 mg',
    'dag 253–280: 179,62 mg',
    'dag 281–308: 170,64 mg',
    'fra dag 309: 162,11 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const mirtazapin = stoff({
  nokkel: 'mirtazapin',
  navn: 'mirtazapin',
  kode: 'Mz',
  dose: { lavest: 15, hoyest: 45, kilde: SPC.remeronDose },
  gruppe: HOY,
  kildetro: [utsagn('Behandlingen med mirtazapin avsluttes gradvis.', SPC.remeronDose), utsagn('Mirtazapin er blant stoffene med høyest potensiell risiko for seponeringssymptomer.', RCPSYCH.hoyRisiko)],
  usikkerhet: ['Smeltetablettene deles ikke; de fleste trinnene krever flytende form; uten det stopper planen ved trinnet før.'],
  eksempler: [eks('fra-15-mg', 'Fra 15 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 15, [
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
    'fra dag 309: 4,24 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 15, forventet: [
    'dag 1–28: 14,25 mg',
    'dag 29–56: 13,54 mg',
    'dag 57–84: 12,86 mg',
    'dag 85–112: 12,22 mg',
    'dag 113–140: 11,61 mg',
    'dag 141–168: 11,03 mg',
    'dag 169–196: 10,48 mg',
    'dag 197–224: 9,95 mg',
    'dag 225–252: 9,45 mg',
    'dag 253–280: 8,98 mg',
    'dag 281–308: 8,53 mg',
    'fra dag 309: 8,11 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const amitriptylin = stoff({
  nokkel: 'amitriptylin',
  navn: 'amitriptylin',
  kode: 'At',
  dose: { lavest: 10, hoyest: 150, kilde: P7.sarotexDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Amitriptylin trappes gradvis ned over flere uker når behandlingen avsluttes.', P7.sarotexSeponering)],
  forutsetninger: ['Regelen gjelder alle indikasjonene i preparatomtalen, også smerte og migreneprofylakse med lavere doser.'],
  usikkerhet: ['Tablettene på 10, 25 og 50 mg er ikke oppgitt som delbare; mange ideelle trinn kan derfor ikke gis nøyaktig, og planen stopper ved trinnet før.'],
  eksempler: [eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
    'dag 1–28: 37,5 mg',
    'dag 29–56: 28,13 mg',
    'dag 57–84: 21,09 mg',
    'dag 85–112: 15,82 mg',
    'dag 113–140: 11,87 mg',
    'dag 141–168: 8,9 mg',
    'dag 169–196: 6,67 mg',
    'dag 197–224: 5,01 mg',
    'dag 225–252: 3,75 mg',
    'dag 253–280: 2,82 mg',
    'dag 281–308: 2,11 mg',
    'fra dag 309: 1,58 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'dag 141–168: 36,75 mg',
    'dag 169–196: 34,92 mg',
    'dag 197–224: 33,17 mg',
    'dag 225–252: 31,51 mg',
    'dag 253–280: 29,94 mg',
    'dag 281–308: 28,44 mg',
    'fra dag 309: 27,02 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const klomipramin = stoff({
  nokkel: 'klomipramin',
  navn: 'klomipramin',
  kode: 'Cl',
  dose: { lavest: 10, hoyest: 250, kilde: P7.anafranilDose },
  gruppe: MIDDELS,
  kildetro: [utsagn('Brå seponering av klomipramin bør unngås; etter lang bruk trappes dosen gradvis ned.', P7.anafranilSeponering)],
  usikkerhet: ['Fra høye doser blir planen lang; flere trinn er ikke automatisk bedre (P4.6).'],
  eksempler: [eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
    'dag 1–28: 37,5 mg',
    'dag 29–56: 28,13 mg',
    'dag 57–84: 21,09 mg',
    'dag 85–112: 15,82 mg',
    'dag 113–140: 11,87 mg',
    'dag 141–168: 8,9 mg',
    'dag 169–196: 6,67 mg',
    'dag 197–224: 5,01 mg',
    'dag 225–252: 3,75 mg',
    'dag 253–280: 2,82 mg',
    'dag 281–308: 2,11 mg',
    'fra dag 309: 1,58 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ])],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'dag 141–168: 36,75 mg',
    'dag 169–196: 34,92 mg',
    'dag 197–224: 33,17 mg',
    'dag 225–252: 31,51 mg',
    'dag 253–280: 29,94 mg',
    'dag 281–308: 28,44 mg',
    'fra dag 309: 27,02 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
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
    eks('fra-50-mg', 'Fra 50 mg med standardvalgene, til den tekniske planhorisonten.', 50, [
      'dag 1–28: 37,5 mg',
      'dag 29–56: 28,13 mg',
      'dag 57–84: 21,09 mg',
      'dag 85–112: 15,82 mg',
      'dag 113–140: 11,87 mg',
      'dag 141–168: 8,9 mg',
      'dag 169–196: 6,67 mg',
      'dag 197–224: 5,01 mg',
      'dag 225–252: 3,75 mg',
      'dag 253–280: 2,82 mg',
      'dag 281–308: 2,11 mg',
      'fra dag 309: 1,58 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks('fra-15-mg', 'Lav restdose under ordinært doseområde: 25 % per trinn, uten nedre grense.', 15, [
      'dag 1–28: 11,25 mg',
      'dag 29–56: 8,44 mg',
      'dag 57–84: 6,33 mg',
      'dag 85–112: 4,75 mg',
      'dag 113–140: 3,56 mg',
      'dag 141–168: 2,67 mg',
      'dag 169–196: 2 mg',
      'dag 197–224: 1,5 mg',
      'dag 225–252: 1,13 mg',
      'dag 253–280: 0,84 mg',
      'dag 281–308: 0,63 mg',
      'fra dag 309: 0,48 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
  ],
  langsom: { startdose_mg: 50, forventet: [
    'dag 1–28: 47,5 mg',
    'dag 29–56: 45,13 mg',
    'dag 57–84: 42,87 mg',
    'dag 85–112: 40,73 mg',
    'dag 113–140: 38,69 mg',
    'dag 141–168: 36,75 mg',
    'dag 169–196: 34,92 mg',
    'dag 197–224: 33,17 mg',
    'dag 225–252: 31,51 mg',
    'dag 253–280: 29,94 mg',
    'dag 281–308: 28,44 mg',
    'fra dag 309: 27,02 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

const paroksetin = stoff({
  nokkel: 'paroksetin',
  navn: 'paroksetin',
  kode: 'Pa',
  dose: { lavest: 10, hoyest: 60, kilde: P7.seroxatDose },
  gruppe: HOY,
  kildetro: [
    utsagn('Paroksetin bør trappes ned gradvis over flere uker eller måneder etter pasientens behov.', P7.seroxatVarighet),
    utsagn('Ved utålelige symptomer kan forrige dose gjenopptas og nedtrappingen gå langsommere.', P7.seroxatRegime),
    utsagn('Paroksetin gir oftere seponeringssymptomer og krever særlig varsomhet.', NICE.saerligRisiko, RCPSYCH.hoyRisiko),
  ],
  tilpasninger: [
    utsagn(
      'Bakgrunn: i de kliniske studiene i preparatomtalen ble døgndosen redusert med 10 mg hver uke. Det er en historisk strategi fra studiene, ikke en anbefaling, og den beregnes ikke, heller ikke til sammenligning (fagkontrollen 30.10.2026).',
      P7.seroxatRegime,
      P7.seroxatVarighet,
    ),
  ],
  usikkerhet: ['De fleste trinnene krever deling av tabletter eller flytende form (mikstur); uten det stopper planen ved trinnet før.'],
  eksempler: [
    eks('fra-20-mg', 'Fra 20 mg: 10 % per trinn, minst 28 dager, til den tekniske planhorisonten.', 20, [
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
      'fra dag 309: 5,65 mg',
      'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
    ]),
    eks(
      'fra-20-mg-5-prosent',
      'Stresstest fra fagvurderingen: 5 % per trinn fra 20 mg. Planen viser 12 reduksjoner, den tekniske horisonten, ikke en sluttdose; videre nedtrapping regnes fra dosen pasienten da bruker.',
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
        'fra dag 309: 10,81 mg',
        'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
      ],
      { justert: { prosent: 5 } },
    ),
  ],
  langsom: { startdose_mg: 20, forventet: [
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
    'fra dag 309: 10,81 mg',
    'teknisk planhorisont: 12 reduksjoner; avslutning vurderes individuelt',
  ] },
})

/* --- Fluoksetin annenhver dag ---------------------------------------------------------- */

/** Fluoksetin 20 mg annenhver dag: en valgfri strategi ved 20 mg daglig, bare for fluoksetin (beslutning 5.10). */
function fluoksetinAnnenhverDag(): Regel {
  const versjoner = [NY_ETTER_RUNDE_2('fluoksetin 20 mg annenhver dag som valgfri strategi ved 20 mg daglig.')]
  const versjon = versjoner.length
  const avklaring = runde2(versjon, 'annenhverDag')
  const virkestoff = { type: 'virkestoff' as const, nokkel: 'fluoksetin' }
  const vilkar = betingelser({ ...fluoksetin, unntak: [] }, versjon, false)
  const revurdering: Bekreftelse = {
    id: 'revurdering',
    tekst:
      'Dosering annenhver dag er et valgfritt alternativ forskriveren velger. Etter minst fire uker revurderes pasienten; videre nedtrapping eller seponering er forskriverens beslutning og beregnes ikke av planen.',
    grunnlag: vurdering('Fagkontrollen godkjente strategien uten automatisk seponering: planen sier ikke hva som skjer etter revurderingen.', [NICE.fluoksetin, RCPSYCH.fluoksetin], avklaring),
  }
  const r: Regel = {
    id: 'seponering-fluoksetin-annenhver-dag',
    versjon,
    tittel: 'Seponering av fluoksetin, 20 mg annenhver dag',
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
          faser: [
            {
              type: 'intervalldosering',
              dose: { type: 'aktuell' },
              hver: kilde(2, 'dager', 'veiledende_preferanse', NICE.fluoksetin),
              minstetid: forslag(28, 'dager', 'Minst fire uker med dosering annenhver dag før pasienten revurderes, uten klinisk fastsatt øvre grense; lengre tid kan velges.', {
                art: 'bindende_krav',
                omrade: [28, TEKNISK_MAKS_DAGER],
                teknisk_maks: true,
                justerbar: 'Minste antall dager før revurdering',
                henvisninger: [RCPSYCH.fluoksetin],
                avklaring,
              }),
            },
          ],
        },
      ],
    },
    inndata: [{ navn: 'startdose', verdier: [20], art: 'bindende_krav', grunnlag: vurdering('Strategien gjelder bare ved 20 mg daglig; ved 40–60 mg brukes gradvis nedtrapping.', [NICE.fluoksetin], avklaring) }],
    bekreftelser: [...vilkar.bekreftelser.filter((b) => b.id !== STARTFORSLAG.id), revurdering],
    unntak: [tidligereSymptomer(versjon)],
    sporsmal: vilkar.sporsmal,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [fluoksetin.kildetro[1]!, fluoksetin.kildetro[2]!, fluoksetin.kildetro[0]!],
      tilpasninger: [
        utsagn('Fra 20 mg daglig gis 20 mg annenhver dag i minst 28 dager før pasienten revurderes. Planen gjør ingen ny reduksjon og går ikke til null; videre nedtrapping eller seponering er forskriverens beslutning.', NICE.fluoksetin, RCPSYCH.fluoksetin),
        utsagn('Strategien gjelder bare fluoksetin, fordi den lange virketiden jevner ut konsentrasjonen mellom dosene; den gjelder ikke andre antidepressiva (fagkontrollen 30.10.2026).', NICE.fluoksetin),
        ...FELLES_TILPASNINGER.slice(1),
      ],
      forutsetninger: [...FORUTSETNINGER_FELLES, FORUTSETNINGER_P7[0]!],
      usikkerhet: ['At dosering annenhver dag gir færre seponeringssymptomer enn en lavere daglig dose, er ikke vist i kontrollerte studier; NICE omtaler den som en mulig egnet reduksjon.'],
    },
    referanser: [pn('SwitchAntidepressants:Fo>Stop')],
    eksempler: [],
    godkjenning: { status: 'til_faglig_kontroll', historikk: historikk(versjoner) },
  }
  const ok = (e: Regneeksempel) => besvart(r, e)
  r.eksempler = [
    ok(eks('fra-20-mg', 'Fra 20 mg daglig: 20 mg annenhver dag i minst 28 dager før revurdering, uten automatisk seponering.', 20, ['fra dag 1: 20 mg annenhver dag', 'annenhver dag i minst 28 dager; avslutning vurderes individuelt'])),
    ok(stopp('fra-40-mg', 'Ved 40 mg gjelder ikke strategien; da brukes gradvis nedtrapping.', 40, utenfor(40))),
    ...kontrolleksempler({ ...r, bekreftelser: [STARTFORSLAG, ...r.bekreftelser] }, 20).filter((e) => e.id !== 'uten-bekreftelse'),
  ]
  return r
}

/* --- Regler uten beregning ------------------------------------------------------------- */

/** En seponeringsregel som bare er fagtekst, uten beregnet plan. */
const tekstregel = (r: Pick<Regel, 'id' | 'versjon' | 'tittel' | 'inndata' | 'fortolkning' | 'referanser' | 'godkjenning'> & { nokkel: string; fase: Fase }): Regel => ({
  id: r.id,
  versjon: r.versjon,
  tittel: r.tittel,
  fra: { type: 'virkestoff', nokkel: r.nokkel },
  til: null,
  plan: { form: 'seponering', forlop: [{ id: 'fra', virkestoff: { type: 'virkestoff', nokkel: r.nokkel }, administrasjon: 'peroral', utgangsdose: 'startdose', start: { type: 'dag', dag: 1 }, faser: [r.fase] }] },
  inndata: r.inndata,
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'bare_tekstlig',
  fortolkning: r.fortolkning,
  referanser: r.referanser,
  eksempler: [],
  godkjenning: r.godkjenning,
})

/** Bupropion: med depottablettene som ikke kan deles, er den prosentvise regelen ikke beregnbar (beslutning 3 og 4). Bare fagtekst. */
const BUPROPION_GRUNN = 'Med norske depottabletter, som ikke kan deles, kan ingen døgndose under 150 mg gis; regelen beregner ingen trinn.'
const bupropion = tekstregel({
  id: 'seponering-bupropion',
  versjon: 5,
  tittel: 'Seponering av bupropion',
  nokkel: 'bupropion',
  fase: { type: 'uten_beregning', grunn: BUPROPION_GRUNN },
  inndata: [{ navn: 'startdose', omrade: [150, 300], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [P7.wellbutrinDose] } }],
  fortolkning: {
    kildetro: [
      utsagn('En nedtrappingsperiode bør vurderes; seponeringsreaksjoner ble ikke sett i studiene, men kan ikke utelukkes.', P7.wellbutrinSeponering),
      utsagn('Bupropion finnes som tabletter med modifisert frisetting, som ikke skal deles, knuses eller tygges.', P7.wellbutrinDose),
    ],
    tilpasninger: [
      utsagn(`${BUPROPION_GRUNN} Den prosentvise regelen er derfor ikke beregnbar med depotpreparatene (fagkontrollen 30.10.2026).`, P7.wellbutrinDose),
      utsagn('Avslutningen vurderes individuelt fra en dose som kan gis med depottablettene; OUSFAR beregner ingen plan og foreslår ingen dato for siste dose.', P7.wellbutrinSeponering),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), FORUTSETNINGER_P7[0]!],
    usikkerhet: ['Preparatomtalen sier ikke hvor lenge en nedtrapping bør vare.'],
  },
  referanser: [pn('SwitchAntidepressants:Bu>Stop')],
  godkjenning: {
    status: 'til_faglig_kontroll',
    historikk: historikk([UTKAST, KONTROLL_1, KONTROLL_2, KONTROLL_3, { merknad: 'Gjort om til fagtekst etter fagkontrollen 30.10.2026 (P7.5): med depottablettene som ikke kan deles, er den prosentvise regelen ikke beregnbar, og avslutningen vurderes individuelt fra en dose som kan gis.', dato: RUNDE_2 }]),
  },
})

/** Agomelatin: preparatomtalen sier at det ikke trengs nedtrapping. Bare fagtekst, ingen beregning. */
const agomelatin = tekstregel({
  id: 'seponering-agomelatin',
  versjon: 1,
  tittel: 'Seponering av agomelatin',
  nokkel: 'agomelatin',
  fase: { type: 'seponer' },
  inndata: [{ navn: 'startdose', omrade: [25, 50], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [P7.valdoxanDose] } }],
  fortolkning: {
    kildetro: [utsagn('Agomelatin kan seponeres uten nedtrapping.', P7.valdoxanSeponering)],
    tilpasninger: [utsagn('OUSFAR beregner ingen nedtrappingsplan for agomelatin. I Norge finnes agomelatin bare med godkjenningsfritak.')],
    forutsetninger: [...FORUTSETNINGER_FELLES.filter((f) => !f.startsWith('Dosene er')), 'Gjelder seponering, ikke bytte til et annet antidepressiv.'],
    usikkerhet: ['Preparatomtalen er den sentralt godkjente fra EMA; det finnes ingen norsk preparatomtale fordi preparatet ikke er markedsført i Norge.'],
  },
  referanser: [pn('SwitchAntidepressants:Ag>Stop')],
  godkjenning: { status: 'til_faglig_kontroll', historikk: historikk([UTKAST]) },
})

const STOFFER = [amitriptylin, citalopram, duloksetin, escitalopram, fluoksetin, fluvoksamin, klomipramin, mirtazapin, moklobemid, nortriptylin, paroksetin, sertralin, venlafaksin, vortioksetin]

export const NEDTRAPPINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping',
  versjon: 5,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til nedtrappingsregler for antidepressiva (P7): én regel per virkestoff med forsvarlig kildegrunnlag, laget fra preparatomtalen, NICE og RCPsych, og en langsom variant av hver etter tidligere seponeringssymptomer. Hver plan er et startforslag med minstetider som forskriveren kan justere innenfor valgområdene fra fagvurderingen; ingen plan går til null eller har en fast nedre grense. Til faglig kontroll; ingen regel er klinisk godkjent.',
  regler: [...STOFFER.flatMap((s) => [seponeringsregel(s), seponeringsregel(s, true)]), fluoksetinAnnenhverDag(), bupropion, agomelatin],
}

/**
 * Regler som bare regnes ut til sammenligning og utvikling (P7.5), som den
 * hyperbolske citalopramregelen (B2). De er ikke i verktøyets regelsett, kan
 * ikke velges klinisk og er ikke kliniske anbefalinger.
 */
export const SAMMENLIGNINGSSETT: Regelsett = {
  id: 'ousfar-verktoy-nedtrapping-sammenligning',
  versjon: 4,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Sammenlignings- og utviklingssett for nedtrappingsreglene (P7.5): strategier som ikke er godkjent som valgbare kliniske strategier. Ikke i verktøyet og ikke kliniske anbefalinger.',
  regler: [seponeringCitalopramHyperbolsk],
}
