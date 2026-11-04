/**
 * Felles byggesteiner for regelsettene (pilotsettet i P4 og nedtrappingsreglene
 * i P7): henvisninger, utsagn, parametre med grunnlag, godkjenningssteg og
 * fakta fra NICE som flere regler bygger på. Faktaene er gjengitt med egne
 * ord, med sted i kilden (`kilder.ts`).
 */
import type { Disposisjon, Vurdertregel } from './godkjenning'
import type { Faktumrettelse } from './rettelse'
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
  langvarig: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Etter mange måneders behandling, tidligere plagsomme seponeringssymptomer eller bruk av et legemiddel med høy risiko for seponeringssymptomer anbefaler RCPsych små reduksjoner fra starten. Som eksempel nevnes 5–10 % av den opprinnelige dosen.'),
  proporsjonal: h('rcpsych-stopping', 'Examples of tapering plans', 'Andre deler av veiledningen beskriver også proporsjonale reduksjoner beregnet fra sist brukte dose.'),
  fluoksetin: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Langtidsvirkende stoffer som fluoksetin kan gi seponeringssymptomer dager til uker etter en reduksjon; det er best å vente minst fire uker før neste.'),
  fireUker: h('rcpsych-stopping', 'When and how should I stop my antidepressants?', 'Selv etter kort bruk og uten seponeringssymptomer er det best å trappe ned over minst fire uker; etter lang bruk vanligvis over måneder eller lenger.'),
  lavDose: h('rcpsych-stopping', 'When and how should I stop my antidepressants?', 'Trinnene blir mindre etter hvert som dosen synker, og noen trenger svært lave doser før de slutter, helt ned mot 2 % av opprinnelig dose.'),
  hoyRisiko: h('rcpsych-stopping', 'Appendix 1', 'Høyest potensiell risiko for seponeringssymptomer har blant andre duloksetin, mirtazapin, moklobemid, paroksetin og venlafaksin.'),
  middelsRisiko: h('rcpsych-stopping', 'Appendix 1', 'Middels potensiell risiko har blant andre amitriptylin, bupropion, citalopram, escitalopram, fluoksetin, fluvoksamin, klomipramin, nortriptylin og sertralin; lav har blant andre vortioksetin.'),
  plan: h('rcpsych-stopping', 'Which plan should I follow?', 'Planene er utgangspunkt som tilpasses underveis: om lag 50 % per trinn hver 2.–4. uke ved middels eller lavere risiko, og om lag 10 % ved høyest risiko.'),
}

/**
 * Fakta slik de stod da reglene som viser til dem, ble vurdert. Reglene bygges
 * fortsatt med dem, slik at de tidligere godkjenningene og disposisjonene kan
 * etterprøves mot nøyaktig innholdet de gjaldt; `FAKTUMRETTELSER` gir reglene
 * deretter en ny versjon med det rettede faktumet (`rettelse.ts`). En ny regel
 * bruker de gjeldende faktaene over.
 */
export const RCPSYCH_TIDLIGERE = {
  langvarig: h('rcpsych-stopping', 'If you have been taking antidepressants for longer', 'Etter mange måneders bruk, etter plagsomme seponeringssymptomer tidligere eller med et høyrisikostoff er små trinn fra start best, for eksempel 5–10 % av dosen.'),
}

const KONTROLLOR = 'ChatGPT (uavhengig fagkontrollør)'

/** Den uavhengige kontrolløren i avklaringene av nedtrappingsreglene (P7 og K1). */
export const KONTROLLOREN = { av: 'ChatGPT (uavhengig kontrollør)', rolle: 'uavhengig_kontrollor' } as const

/** En disposisjon med listen over regler frosset, så den ikke kan endres etter at den er registrert. */
const frosset = (d: Disposisjon): Disposisjon =>
  Object.freeze({ ...d, regler: Object.freeze(Object.fromEntries(Object.entries(d.regler).map(([id, v]) => [id, Object.freeze({ ...v })]))) })
const RETTELSESKONTROLLEN = 'Kontrollørens gjennomgang av a38fac14 03.11.2026 (rettelsen av RCPsych-faktumet, PR #309)'
const KORRIGERING =
  'Godkjenningen gjelder bare dette eksakte fingeravtrykket og disse betingelsene. Den er en korrigering av kildebeskrivelsen, ikke en ny generell godkjenning av algoritmer for nedtrapping.'
const IKKE_GODKJENT_ETTER_RETTELSEN = `${RETTELSESKONTROLLEN}: kontrollert, ikke klinisk godkjent, for nøyaktig denne versjonen og dette fingeravtrykket, som bare skiller seg fra versjonen som ble vurdert 31.10.2026 i det rettede faktumet. Regelen kan ikke gi kliniske doseplaner som følge av dette, og den separate substanskontrollen som kreves før en senere aktivering, bortfaller ikke.`

/** Rettelsene av fakta i regler som allerede er vurdert, i rekkefølge. Bare tillegg: en registrert rettelse endres eller fjernes ikke. */
export const FAKTUMRETTELSER: readonly Faktumrettelse[] = [
  {
    fra: RCPSYCH_TIDLIGERE.langvarig,
    til: [RCPSYCH.langvarig, RCPSYCH.proporsjonal],
    dato: '2026-11-03',
    grunn:
      'Faktumet fra RCPsych om små reduksjoner fra starten er presisert etter kontrollørens vurdering 03.11.2026 (ChatGPT, `docs/verktøy-kildefunn-1-2.md` §8): kilden regner 5–10 % av den opprinnelige dosen, og andre deler av veiledningen beskriver proporsjonale reduksjoner fra sist brukte dose. Kontrollørens formulering er delt i to fakta med hvert sitt sted i kilden. Ingen verdi, betingelse, beregning eller annen tekst i regelen er endret; den nye versjonen må kontrolleres på nytt.',
    // Kontrollørens svar R1–R4 på kontrollgrunnlaget (`docs/verktøy-rettelse-langvarig.md`), gjennomgangen av a38fac14 i PR #309.
    kontroll: {
      godkjenning: {
        av: KONTROLLOR,
        dato: '2026-11-03',
        gjennomgang: RETTELSESKONTROLLEN,
        regler: {
          'kryssnedtrapping-sertralin-mirtazapin': {
            versjon: 10,
            fingeravtrykk: '12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a',
            avgrensning: `bare det tidligere godkjente startforløpet fra sertralin 50 eller 100 mg, kort/ikke-langvarig behandling, med kontrollerte tabletter og styrker, obligatoriske bekreftelser og tidligere seponeringsplager fraværende. Dette omfatter ikke videre 25 → 0, opptrapping av mirtazapin, andre doser, langtidsbehandling eller endret trinnlengde. Identisk klinisk omfang som v9. ${KORRIGERING}`,
          },
          'seponering-vortioksetin': {
            versjon: 12,
            fingeravtrykk: 'b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3',
            avgrensning: `bare én første reduksjon 20 → 15 mg/døgn, med minst 28 dager før ny symptomstyrt vurdering, hos voksne under 65 år, kort/ikke-langvarig behandling, uten tidligere seponeringsplager, etter alle opprinnelige vurderinger/stopp, med kontrollerte tabletter/styrker. Ingen påfølgende reduksjon, langsom variant eller utvidet pasientgruppe. Identisk klinisk omfang som v11. ${KORRIGERING}`,
          },
        },
      },
      disposisjon: frosset({
        av: KONTROLLOR,
        dato: '2026-11-03',
        merknad: { beregnbar: IKKE_GODKJENT_ETTER_RETTELSEN, uten_beregning: IKKE_GODKJENT_ETTER_RETTELSEN },
        regler: {
          'seponering-amitriptylin': { versjon: 12, fingeravtrykk: 'a43c1164e4061a1757fefea381da027b8cefe92c077d742855fd4e2f5486b6e3' },
          'seponering-amitriptylin-langsom': { versjon: 8, fingeravtrykk: '187bc1250baf2af7c3c969e73e0edee424d2fc1fd8a8874a08523d6730b679ce' },
          'seponering-escitalopram': { versjon: 12, fingeravtrykk: '7710be648e96682c1c8a35a8e4d9c4428109b294f29b63ae9401ef29b41bd3c1' },
          'seponering-escitalopram-langsom': { versjon: 8, fingeravtrykk: '4e49c175ac6aa49cba89d7db711f710c14b654681cc3138994dbaaaebb69c095' },
          'seponering-fluoksetin': { versjon: 12, fingeravtrykk: 'df89f2dadfc482e86a6dd8852966922d9834ec6ae728de8ffe2fd5e46cc2951a' },
          'seponering-fluoksetin-langsom': { versjon: 8, fingeravtrykk: 'e9946f1fcd42cb834677d9ef6751307fbbe0a9ec41b28d4d28687ac2efe29ddd' },
          'seponering-fluvoksamin': { versjon: 13, fingeravtrykk: '778344f0ab04ad27d68cc588b868935a00456ae76674d48cbf51e384b5f4d5d0' },
          'seponering-fluvoksamin-langsom': { versjon: 9, fingeravtrykk: '95c2b4eeafb750464f998d390300634837372999a56c077f6bee053279bfa312' },
          'seponering-klomipramin': { versjon: 12, fingeravtrykk: '786fef7ded5f248dce7de7479a76aa5713939ed5e939605a5c9da98a3e71a3b3' },
          'seponering-klomipramin-langsom': { versjon: 8, fingeravtrykk: '11252e56fd5f8aa65f6d180621b259c7adee652cb0077c88a6cf634be6208a40' },
          'seponering-nortriptylin': { versjon: 12, fingeravtrykk: '300a71b147bf87eb61dbeaeccd27aa07add900435b579c14291061f38f63616c' },
          'seponering-nortriptylin-langsom': { versjon: 8, fingeravtrykk: '6637a47e0a0b34b1a271dff2546845840df7c54ccdc428f342ee47fca9b93f69' },
          'seponering-sertralin': { versjon: 12, fingeravtrykk: '5be29652a2afc47a60cbd394a45bf5cdbad92dfe259e1fa263751e5476a8198e' },
          'seponering-sertralin-langsom': { versjon: 8, fingeravtrykk: 'cf874ff4a4e5dbe69da6da154240c70a9f1e0d56d5d80225bafe5901c0a0f642' },
          'seponering-vortioksetin-langsom': { versjon: 8, fingeravtrykk: 'c191fcbc36fa91acdb6b46c3e9451c3b0d8272f0f2f79ffee1e351392c573d73' },
          'seponering-fluoksetin-annenhver-dag': { versjon: 5, fingeravtrykk: '1d807d01fee557b739ce4a4a9f9badaba60aa1ed982c10715fd8b67fe1a70e9f' },
        },
      }),
    },
  },
]

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
 * godkjenning er gitt med disposisjonen. Den gjelder bare de oppgitte reglene,
 * med nøyaktig versjonen og fingeravtrykket kontrolløren vurderte (se
 * `disponer`); listen er frosset.
 */
export const leveransen = (regler: Record<string, Vurdertregel>): Disposisjon => frosset({
  av: KONTROLLOR,
  dato: '2026-10-31',
  merknad: {
    beregnbar: `${LEVERANSEN}: kontrollert og ikke godkjent for klinisk doseberegning i denne første avgrensede leveransen. Regelen er et kontrollutkast og sperret for klinisk bruk; et tilfelle i det kliniske omfanget er teknisk, ikke et godkjenningsvedtak. En senere aktivering krever en ny, separat kontroll av kilder, FEST, risiko og dosebygging for nøyaktig den versjonen, med positive og negative tester, i en egen PR.`,
    uten_beregning: `${LEVERANSEN}: bare fagtekst, sperret for beregning. Det som mangler, er en dokumentert dosebygging med dagens preparater, ikke et klinisk behov for mindre doser. Fagteksten er ikke klinisk godkjent; en beregnbar regel kan bare vurderes på nytt med en dokumentert formulering eller metode og en ny kontroll i en egen PR.`,
  },
  regler,
})

/** En regel slik kontrolløren vurderte den: versjon, fingeravtrykk og eventuelt det som ble sagt om akkurat den. */
export const vurdert = (versjon: number, fingeravtrykk: string, tillegg?: string): Vurdertregel => ({ versjon, fingeravtrykk, ...(tillegg && { tillegg }) })
