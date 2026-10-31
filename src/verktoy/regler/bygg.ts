/**
 * Felles byggesteiner for regelsettene (pilotsettet i P4 og nedtrappingsreglene
 * i P7): henvisninger, utsagn, parametre med grunnlag, godkjenningssteg og
 * fakta fra NICE som flere regler bygger på. Faktaene er gjengitt med egne
 * ord, med sted i kilden (`kilder.ts`).
 */
import type { Disposisjon } from './godkjenning'
import type { Avklaring, Begrunnelseskrav, Godkjenningssteg, Kildehenvisning, Parameter, Parameterart, Utsagn } from './modell'

export const h = (kilde: string, sted: string, faktum: string): Kildehenvisning => ({ kilde, sted, faktum })
export const pn = (kildeoppforing: string): Kildehenvisning => ({ kilde: 'psychiatrienet', kildeoppforing })
export const utsagn = (tekst: string, ...henvisninger: Kildehenvisning[]): Utsagn => ({ tekst, henvisninger })

/** En verdi kilden selv oppgir. */
export const kilde = (verdi: number, enhet: Parameter['enhet'], art: Parameterart, ...henvisninger: Kildehenvisning[]): Parameter => ({
  verdi,
  enhet,
  art,
  grunnlag: { type: 'kilde', henvisninger },
})

/**
 * OUSFARs eget valg, eventuelt innenfor det en kilde tillater. Uten
 * `avklaring` er det et åpent forslag; med en er valget avklart av en
 * uavhengig kontrollør, men fortsatt OUSFARs.
 */
export const forslag = (
  verdi: number | null,
  enhet: Parameter['enhet'],
  begrunnelse: string,
  valg: {
    art?: Parameterart
    omrade?: [number, number]
    justerbar?: string
    teknisk_maks?: true
    begrunnelseskrav?: Begrunnelseskrav[]
    henvisninger?: Kildehenvisning[]
    avklaring?: Avklaring
  } = {},
): Parameter => ({
  verdi,
  enhet,
  art: valg.art ?? 'veiledende_preferanse',
  grunnlag: { type: 'ousfar_vurdering', begrunnelse, ...(valg.henvisninger ? { henvisninger: valg.henvisninger } : {}), avklaring: valg.avklaring ?? null },
  ...(valg.omrade ? { omrade: valg.omrade } : {}),
  ...(valg.justerbar ? { justerbar: valg.justerbar } : {}),
  ...(valg.teknisk_maks ? { teknisk_maks: true as const } : {}),
  ...(valg.begrunnelseskrav ? { begrunnelseskrav: valg.begrunnelseskrav } : {}),
})

export const steg = (status: Godkjenningssteg['status'], regelversjon: number, merknad: string, dato = '2026-10-28'): Godkjenningssteg => ({
  status,
  dato,
  av: 'Claude Code',
  rolle: 'utvikler',
  regelversjon,
  merknad,
})

/* --- Fakta fra NICE, med egne ord ------------------------------------------------- */

export const NICE = {
  andel: h('nice-ng222', 'anbefaling 1.4.16', 'Dosen trappes ned trinnvis til null; hvert trinn er en andel av forrige dose (eksempel: 50 %), med mindre trinn (eksempel: 25 %) når dosen blir lav.'),
  tempo: h('nice-ng222', 'anbefaling 1.4.16', 'Tempoet avtales med pasienten; neste reduksjon først når seponeringssymptomene er borte eller tålelige. Nedtrapping kan ta uker til måneder.'),
  bytte: h('nice-ng222', 'anbefaling 1.4.16', 'Raskere nedtrapping kan være aktuelt ved bytte av antidepressiv.'),
  flytende: h('nice-ng222', 'anbefaling 1.4.16', 'Flytende formuleringer kan vurderes når svært små doser ikke kan gis med tabletter eller kapsler.'),
  fluoksetinVurdering: h('nice-ng222', 'anbefaling 1.4.18 (om fluoksetin)', 'Ved nedtrapping av fluoksetin: la det gå én til to uker for å vurdere virkningen av en dosereduksjon før neste.'),
  fluoksetin: h('nice-ng222', 'anbefaling 1.4.18', 'Fluoksetin virker lenge: ved 20 mg daglig kan en periode med dosering annenhver dag være en egnet reduksjon; ved 40–60 mg daglig brukes gradvis nedtrapping.'),
  mao: h('nice-ng222', 'anbefaling 1.9.5', 'Bytte til eller fra en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten. Bytte kan kreve kryssnedtrapping.'),
  kombinasjon: h('nice-ng222', 'anbefaling 1.9.9', 'Mirtazapin lagt til et SSRI er et kombinasjonsalternativ; SSRI sammen med MAO-hemmer kan være farlig og skal unngås.'),
  halveringstid: h('nice-ng222', 'anbefaling 1.4.16', 'Ved nedtrapping tas det hensyn til farmakokinetikken og behandlingstiden; antidepressiva med kort halveringstid må trappes ned langsommere.'),
  saerligRisiko: h('nice-ng222', 'anbefaling 1.4.18', 'Seponeringssymptomer kan komme med mange antidepressiva; paroksetin og venlafaksin gir dem oftere og krever særlig varsomhet.'),
  tidligere: h('nice-ng222', 'anbefaling 1.4.15', 'Mange trenger mer støtte for å lykkes med seponering, særlig når tidligere forsøk har gitt seponeringssymptomer eller ikke har lyktes.'),
  alvorlig: h('nice-ng222', 'anbefaling 1.4.21', 'Ved mer alvorlige seponeringssymptomer kan forrige dose gjenopptas, og nedtrappingen forsøkes igjen langsommere og med mindre trinn når symptomene er borte.'),
}

/* --- Fakta fra Royal College of Psychiatrists, med egne ord ------------------------------ */

export const RCPSYCH = {
  tid: h('rcpsych-stopping', 'How should I gradually reduce my dose?', 'Et første trinn kan være en firedel eller halvdel av dosen, med to til fire uker før neste; tiden mellom trinnene bør være så lang som seponeringssymptomene krever.'),
  smaa: h('rcpsych-stopping', 'How should I gradually reduce my dose?', 'Gir et trinn ubehagelige symptomer, går man tilbake til siste gode dose og fortsetter senere med mindre trinn, for eksempel 10 % eller 5 %.'),
  langvarig: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen.'),
  fluoksetin: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.'),
  fireUker: h('rcpsych-stopping', 'When and how should I stop my antidepressants?', 'Selv etter kort bruk og uten seponeringssymptomer er det best å trappe ned over minst fire uker; etter lang bruk vanligvis over måneder eller lenger.'),
  lavDose: h('rcpsych-stopping', 'When and how should I stop my antidepressants?', 'Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose.'),
  hoyRisiko: h('rcpsych-stopping', 'Appendix 1', 'Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin.'),
  middelsRisiko: h('rcpsych-stopping', 'Appendix 1', 'Middels potensiell risiko har blant andre amitriptylin, bupropion, citalopram, escitalopram, fluoksetin, fluvoksamin, klomipramin, nortriptylin og sertralin; lav har blant andre vortioksetin.'),
  plan: h('rcpsych-stopping', 'Which plan should I follow?', 'Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko.'),
}

/* --- Felles forslag ----------------------------------------------------------------------- */

export const minst14 = (seponering: Kildehenvisning) =>
  forslag(14, 'dager', '«Minst én til to uker» er lest konservativt som minst 14 dager.', { art: 'bindende_krav', henvisninger: [seponering] })

/** 14 dager per trinn: nedre del av RCPsychs to til fire uker; et åpent forslag, ikke en regel fra NICE. */
export const trinn14 = (begrunnelse: string, valg: { omrade?: [number, number]; henvisninger?: Kildehenvisning[]; avklaring?: Avklaring } = {}) =>
  forslag(14, 'dager', begrunnelse, { omrade: valg.omrade ?? [14, 28], henvisninger: [RCPSYCH.tid, ...(valg.henvisninger ?? [])], ...(valg.avklaring && { avklaring: valg.avklaring }) })

/** 28 dager per trinn for fluoksetin: RCPsychs minst fire uker før neste reduksjon er strengere enn NICEs én til to uker. */
export const fluoksetinTrinn28 = () =>
  forslag(
    28,
    'dager',
    'RCPsych anbefaler minst fire uker før neste reduksjon av langtidsvirkende fluoksetin, fordi symptomene kan komme sent; NICE nevner én til to uker for å vurdere virkningen. OUSFAR bruker det strengeste.',
    { henvisninger: [RCPSYCH.fluoksetin, NICE.fluoksetinVurdering] },
  )

export const halvering = (sluttdose: Parameter, lav?: { prosent: Parameter; grense: Parameter }, avklaring?: Avklaring) => ({
  type: 'prosent_av_aktuell' as const,
  prosent: forslag(50, 'prosent', 'Eksempelet i NICE er 50 % av forrige dose.', { henvisninger: [NICE.andel], ...(avklaring && { avklaring }) }),
  ...(lav ? { lav_prosent: lav.prosent, lav_grense_mg: lav.grense } : {}),
  sluttdose_mg: sluttdose,
})

/**
 * Den tekniske planhorisonten for en plan uten nulltrinn: hvor mange
 * reduksjoner planen viser frem i tid (fagkontrollen 30.10.2026, beslutning
 * 3). Ingen klinisk sluttdose eller varighet; antallet er OUSFARs tekniske valg.
 */
export const PLANHORISONT_TRINN = 12

/**
 * Planhorisonten i de langsomme variantene etter tidligere
 * seponeringssymptomer (substanskontrollen 30.10.2026, beslutning 6): færre
 * reduksjoner per plan, så pasienten revurderes tettere.
 */
export const PLANHORISONT_LANGSOM = 6

/** Planhorisonten som parameter: `trinn` reduksjoner, med en egen begrunnelse og avklaring når regelen har det. */
export const planhorisont = (trinn = PLANHORISONT_TRINN, valg?: { begrunnelse: string; avklaring: Avklaring }) =>
  forslag(
    trinn,
    'trinn',
    valg?.begrunnelse ??
      `Teknisk planhorisont, ikke en klinisk grense: planen viser høyst ${trinn} reduksjoner frem i tid, omtrent ett år med 28 dager per trinn. Ved revurdering beregnes en ny plan fra dosen pasienten da bruker. At planen skal ha en slik horisont i stedet for en nedre grense, bestemte fagkontrollen 30.10.2026 (beslutning 3); antallet er OUSFARs tekniske valg.`,
    valg && { avklaring: valg.avklaring },
  )

export const FORUTSETNINGER_FELLES = [
  'Pasienten bruker legemidlet daglig i den oppgitte dosen og har gjort det lenge nok til at dosen er stabil.',
  'Dosene er den ideelle dosekurven, avrundet til to desimaler; hvilke doser som kan gis med norske preparater (styrker, deling, flytende form), avgjøres i P5.',
  'Beregningen kan ikke utlede komorbiditet, nyre- og leverfunksjon, enzymaktivitet, interaksjoner, graviditet, etterlevelse eller individuell toleranse fra dosen (B7); dette må vurderes av forskriveren.',
]

const LEVERANSEN = 'Kontrollørens disposisjon av leveranseomfanget 31.10.2026 (P4.8 og P7.5, kontrollert i 52b22a4)'

/**
 * Kontrollørens disposisjon av den første avgrensede leveransen (P4.8 og
 * P7.5): ikke alle regler skal godkjennes før publisering. Bare de seks
 * regelversjonene som allerede er klinisk godkjent i oppgitt omfang, kan
 * brukes klinisk; hver annen regel står som kontrollert og ikke godkjent, og
 * en senere aktivering krever en ny kontroll i en egen PR. Ingen ny
 * godkjenning er gitt med disposisjonen.
 */
export const leveransen = (tillegg?: Disposisjon['tillegg']): Disposisjon => ({
  av: 'ChatGPT (uavhengig fagkontrollør)',
  dato: '2026-10-31',
  merknad: {
    beregnbar: `${LEVERANSEN}: kontrollert og ikke godkjent for klinisk doseberegning i denne første avgrensede leveransen. Regelen er et kontrollutkast og sperret for klinisk bruk; et tilfelle i det kliniske omfanget er teknisk, ikke et godkjenningsvedtak. En senere aktivering krever en ny, separat kontroll av kilder, FEST, risiko og dosebygging for nøyaktig den versjonen, med positive og negative tester, i en egen PR.`,
    uten_beregning: `${LEVERANSEN}: bare fagtekst, sperret for beregning. Det som mangler, er en dokumentert dosebygging med dagens preparater, ikke et klinisk behov for mindre doser. Fagteksten er ikke klinisk godkjent; en beregnbar regel kan bare vurderes på nytt med en dokumentert formulering eller metode og en ny kontroll i en egen PR.`,
  },
  ...(tillegg && { tillegg }),
})
