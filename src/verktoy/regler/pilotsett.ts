/**
 * Pilotsettet i P4 (`docs/verktøy-p4-regelmodell.md`): åtte regler som
 * prøver regelmodellen på hver regelklasse planen prioriterer – seponering av
 * antidepressiv (gjentatt prosentvis og hyperbolsk), kryssnedtrapping, MAO-
 * relatert utvasking, antipsykotikabytte med fast opptrapping,
 * gruppebasert bytte og to oppstarter med depot.
 *
 * Hver regel er OUSFARs egen faglige vurdering, bygget på preparatomtaler,
 * NICE og litteratur (`kilder.ts`), med fakta gjengitt med egne ord.
 * Psychiatrienet står bare som referanse til kildeoppføringen fra P3; ingen
 * regel bygger på teksten der, og ingen gjengir den. Pilotsettet er ikke en
 * overføring av tabellsettet.
 *
 * **Ingen regel er klinisk godkjent.** Alle har status «til faglig kontroll»
 * (P4.8). OUSFARs egne valg er merket som forslag og må avklares; eksemplene
 * er regnet ut for hånd og kontrolleres av testene mot beregningen. Reglene
 * som ble endret etter første uavhengige kontroll, har versjon 2 og er sendt
 * til kontroll på nytt.
 */
import type { Bekreftelse, Godkjenning, Regel, Regelsett, Unntak } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { forslag, FORUTSETNINGER_FELLES, h, halvering, kilde, minst14, NICE, pn, SPC_AD, steg, trinn14, utsagn } from './felles'

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P4.8). Ikke klinisk godkjent.'

/** Historikken for en pilotregel: versjon 1 til kontroll, og for en regel som er rettet etter kontrollen, versjon 2 til kontroll på nytt. */
function tilKontroll(rettet?: string): Godkjenning {
  const v1 = [steg('utkast', 1, 'Utkast til pilotregel (P4.7).'), steg('til_faglig_kontroll', 1, TIL_KONTROLL)]
  const v2 = rettet ? [steg('utkast', 2, `Rettet etter første uavhengige kontroll (PR #282): ${rettet}`), steg('til_faglig_kontroll', 2, TIL_KONTROLL)] : []
  return { status: 'til_faglig_kontroll', historikk: [...v1, ...v2] }
}

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

const KEKS16 = {
  metoder: h('keks-2016', 'tabell 2', 'Bytte kan gjøres konservativt (nedtrapping, utvasking, så oppstart), moderat, direkte eller med kryssnedtrapping, der det nye startes mens det første trappes ned.'),
  nedtrapping: h('keks-2016', 'note til tabell 3', 'Nedtrapping betyr her gradvis reduksjon, vanligvis over omtrent fire uker.'),
  fluoksetinMao: h('keks-2016', 'tabell 3', 'Fra fluoksetin til MAO-hemmer: fluoksetin seponeres (trappes ned over 40 mg daglig), så 5–6 ukers utvasking før MAO-hemmeren startes forsiktig i lav dose.'),
}

const KEKS19 = {
  kryss: h('keks-2019', 'tabell 4 og avsnittet om byttestrategier', 'Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres. Et opphold uten antipsykotikum anbefales ikke.'),
  depot: h('keks-2019', 'avsnittet om byttestrategier', 'Ved bytte mellom peroral behandling og depot må preparatspesifikke instruksjoner følges.'),
}

const SPC = {
  ...SPC_AD,
  seroquel: h('dmp-seroquel', 'pkt. 4.2', 'Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg.'),
  zyprexaDose: h('ema-zyprexa', 'section 4.2', 'Doseområdet er 5–20 mg daglig.'),
  zyprexaSeponering: h('ema-zyprexa', 'section 4.2 og 4.4', 'Gradvis nedtrapping bør vurderes ved seponering; akutte symptomer ved brå seponering er sjeldne.'),
  cisordinolDose: h('dmp-cisordinol', 'pkt. 4.2', 'Vedlikeholdsdose ved kronisk schizofreni og andre kroniske psykoser er vanligvis 20–40 mg daglig.'),
  cisordinolSeponering: h('dmp-cisordinol', 'pkt. 4.8', 'Brå seponering kan gi seponeringssymptomer, vanligvis innen 1–4 dager, som avtar innen 7–14 dager.'),
  abilifyDose: h('ema-abilify', 'section 4.2', 'Schizofreni: startdose 10 eller 15 mg daglig, vedlikehold 15 mg; effektivt doseområde 10–30 mg daglig.'),
  maintenaIndikasjon: h('ema-abilify-maintena', 'section 4.1', 'Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på peroral aripiprazol.'),
  maintenaToleranse: h('ema-abilify-maintena', 'section 4.2', 'Har pasienten aldri brukt aripiprazol, må tolerabilitet med peroral aripiprazol være vist før depotet startes.'),
  maintenaStart: h('ema-abilify-maintena', 'section 4.2', 'Oppstart med én injeksjon: 400 mg på startdagen, og peroral aripiprazol 10–20 mg daglig i 14 dager på rad.'),
  maintenaToInjeksjoner: h('ema-abilify-maintena', 'section 4.2', 'Alternativ oppstart: to injeksjoner à 400 mg samme dag på to ulike steder, med én peroral dose på 20 mg.'),
  maintenaVedlikehold: h('ema-abilify-maintena', 'section 4.2', 'Vedlikehold 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon; 300 mg ved bivirkninger.'),
  maintenaCyp2d6: h('ema-abilify-maintena', 'section 4.2', 'Kjente langsomme CYP2D6-omsettere skal ha andre doser (300 mg) og ikke oppstart med to injeksjoner.'),
  maintenaHemmere: h('ema-abilify-maintena', 'section 4.2', 'Ved samtidig bruk av sterke CYP2D6- eller CYP3A4-hemmere i mer enn 14 dager skal dosen reduseres.'),
  maintenaInduktorer: h('ema-abilify-maintena', 'section 4.2', 'Samtidig bruk av CYP3A4-induktorer i mer enn 14 dager bør unngås.'),
  xeplionIndikasjon: h('ema-xeplion', 'section 4.1', 'Vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.'),
  xeplionStart: h('ema-xeplion', 'section 4.2', 'Oppstart: 150 mg dag 1 og 100 mg dag 8, begge i deltoideus; tredje dose én måned etter andre. Vedlikehold kan gis i deltoideus eller setemuskel.'),
  xeplionVinduer: h('ema-xeplion', 'section 4.2 (glemte doser)', 'Andre oppstartsdose kan gis inntil 4 dager før eller etter dag 8; vedlikeholdsdosene inntil 7 dager før eller etter månedsdatoen.'),
  xeplionOmregning: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Peroral paliperidon depottablett 3, 6, 9 og 12 mg daglig tilsvarer ved vedlikehold 25–50, 75, 100 og 150 mg Xeplion månedlig.'),
  xeplionSeponering: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Peroral paliperidon eller risperidon kan seponeres når Xeplion startes; noen kan ha nytte av gradvis seponering.'),
  xeplionHoyDose: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Ved bytte fra 9–12 mg peroralt til injeksjon i setemuskel kan eksponeringen bli lavere de første seks månedene; deltoideus kan vurderes da.'),
  xeplionNyre: h(
    'ema-xeplion',
    'section 4.2 (nedsatt nyrefunksjon)',
    'Ved kreatininclearance fra 50 til under 80 ml/min er oppstarten 100 mg dag 1 og 75 mg én uke senere, og vedlikehold 50 mg (25–100 mg); under 50 ml/min anbefales ikke Xeplion.',
  ),
}

const LITTERATUR = {
  ed50: h('sorensen-2022', 'Results (dose og SERT-binding)', 'Dosen som gir halvparten av maksimal SERT-binding (ED50) er 3,4 mg for citalopram.'),
  hyperbolsk: h('sorensen-2022', 'Results og Discussion', 'SERT-bindingen øker hyperbolsk med dosen og flater ut ved omtrent 80 % rundt minste vanlige dose; studiene er små og metodene ulike.'),
  horowitz: h('horowitz-2019', 'sammendrag', 'Nedtrapping i like store trinn i SERT-binding gir stadig mindre dosetrinn og kan gå til doser godt under minste terapeutiske dose.'),
}

/* --- Felles forslag ----------------------------------------------------------------------- */

/** Bekreftelse av at pasienten bruker en peroral formulering, når samme virkestoff også finnes som depot. */
const perorFormulering = (tekst: string): Bekreftelse => ({ id: 'peroral_formulering', tekst, grunnlag: { type: 'kilde', henvisninger: [KEKS19.depot] } })

/* --- Reglene ------------------------------------------------------------------------------- */

const seponeringEscitalopram: Regel = {
  id: 'seponering-escitalopram',
  versjon: 1,
  tittel: 'Seponering av escitalopram, gjentatt prosentvis nedtrapping',
  fra: { type: 'virkestoff', nokkel: 'escitalopram' },
  til: null,
  plan: {
    form: 'seponering',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'escitalopram' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'nedtrapping',
            strategi: halvering(forslag(2.5, 'mg', 'Laveste dose i planen; under den seponeres. Halvparten av laveste tablettstyrke (5 mg).', { henvisninger: [SPC.cipralexDose] }), {
              prosent: forslag(25, 'prosent', 'Eksempelet i NICE på mindre trinn ved lav dose.', { henvisninger: [NICE.andel] }),
              grense: forslag(5, 'mg', 'Laveste dose som oppgis i preparatomtalen; fra den regnes dosen som lav.', { henvisninger: [SPC.cipralexDose] }),
            }),
            trinnlengde: trinn14('Øvre del av NICEs vurderingstid, så hvert trinn kan vurderes før neste.'),
            minste_varighet: minst14(SPC.cipralexSeponering),
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [5, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.cipralexDose] } }],
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Escitalopram trappes ned gradvis over minst én til to uker, ikke seponeres brått.', SPC.cipralexSeponering),
      utsagn('Hvert trinn er en andel av forrige dose, med mindre trinn ved lav dose, og nedtrappingen kan ta uker til måneder.', NICE.andel, NICE.tempo),
      utsagn('Det bør gå én til to uker mellom reduksjonene.', NICE.vurdering),
    ],
    tilpasninger: [
      utsagn('OUSFAR bruker 50 % av aktuell dose ned til 5 mg og deretter 25 %, med 14 dager per trinn, og seponerer når neste dose blir under 2,5 mg. Alle tallene er forslag innenfor eller etter eksemplene i kildene.', NICE.andel, NICE.vurdering),
      utsagn('«Minst én til to uker» er lest som et bindende minimum på 14 dager; blir planen kortere, stopper beregningen.', SPC.cipralexSeponering),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Planen gjelder seponering, ikke bytte til et annet antidepressiv.'],
    usikkerhet: [
      'Prosentene, grensen ved 5 mg og sluttdosen på 2,5 mg er eksempler eller OUSFARs valg, ikke empirisk validerte verdier.',
      'Den faktiske nedtrappingen bør styres av pasientens seponeringssymptomer (NICE 1.4.16); planen er et utgangspunkt, ikke en fast tidsplan.',
      'Doser under 5 mg krever deling eller flytende form; om det finnes, avgjøres i P5.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Es>Stop')],
  eksempler: [
    {
      id: 'fra-20-mg',
      beskrivelse: 'Fra 20 mg: 50 % ned til 5 mg, så 25 %, til neste dose er under 2,5 mg.',
      inndata: { startdose_mg: 20 },
      forventet: { fra: ['dag 1–14: 10 mg', 'dag 15–28: 5 mg', 'dag 29–42: 3,75 mg', 'dag 43–56: 2,81 mg', 'fra dag 57: seponert'] },
    },
    {
      id: 'fra-5-mg',
      beskrivelse: 'Fra 5 mg, på grensen: 25 % fra første trinn.',
      inndata: { startdose_mg: 5 },
      forventet: { fra: ['dag 1–14: 3,75 mg', 'dag 15–28: 2,81 mg', 'fra dag 29: seponert'] },
    },
    {
      id: 'over-maksimum',
      beskrivelse: '25 mg er over dosene regelen gjelder for, så beregningen stopper.',
      inndata: { startdose_mg: 25 },
      forventet: {},
      stopp: /Startdosen 25 mg er utenfor/,
    },
  ],
  godkjenning: tilKontroll(),
}

const seponeringCitalopramHyperbolsk: Regel = {
  id: 'seponering-citalopram-hyperbolsk',
  versjon: 1,
  tittel: 'Seponering av citalopram, hyperbolsk nedtrapping (alternativ strategi)',
  fra: { type: 'virkestoff', nokkel: 'citalopram' },
  til: null,
  plan: {
    form: 'seponering',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'citalopram' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'nedtrapping',
            strategi: {
              type: 'hyperbolsk',
              ed50_mg: kilde(3.4, 'mg', 'veiledende_preferanse', LITTERATUR.ed50),
              trinn: forslag(8, 'trinn', 'Åtte like store trinn i beregnet binding; et antall som må vurderes faglig mot pasientens toleranse.', { henvisninger: [LITTERATUR.horowitz] }),
            },
            trinnlengde: trinn14('Øvre del av NICEs vurderingstid.'),
            minste_varighet: minst14(SPC.cipramilSeponering),
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [10, 40], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.cipramilDose] } }],
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Citalopram trappes ned gradvis over minst én til to uker.', SPC.cipramilSeponering),
      utsagn('SERT-bindingen øker hyperbolsk med dosen; ED50 for citalopram er 3,4 mg.', LITTERATUR.ed50, LITTERATUR.hyperbolsk),
      utsagn('Like store trinn i binding gir stadig mindre dosetrinn ned mot null.', LITTERATUR.horowitz),
    ],
    tilpasninger: [
      utsagn(
        'Beregnet binding relativt til maksimum, f = D / (3,4 + D), senkes i åtte like store trinn fra startdosen til null, og dosen er D = 3,4 · f / (1 − f). Maksimal binding går ut av regnestykket. Antall trinn og 14 dager per trinn er OUSFARs forslag.',
        LITTERATUR.ed50,
        LITTERATUR.horowitz,
      ),
      utsagn('Strategien er et alternativ ved siden av gjentatt prosentvis nedtrapping, ikke en standard (B2).'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'ED50 fra PET-studier av SERT-binding gjelder pasienten tilnærmet.'],
    usikkerhet: [
      'Bindingskurven bygger på få og små studier med ulike metoder; at like trinn i binding gir mindre seponeringssymptomer, er ikke vist i kontrollerte studier av denne planen.',
      'De siste dosene (under 1 mg) krever flytende form; om det finnes, avgjøres i P5.',
      'Flere trinn er ikke automatisk bedre (P4.6): planen varer 14 uker fra 20 mg.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Ci>Stop')],
  eksempler: [
    {
      id: 'fra-20-mg',
      beskrivelse: 'Fra 20 mg: åtte like trinn i beregnet binding (85,5 % av maksimum ved 20 mg).',
      inndata: { startdose_mg: 20 },
      forventet: {
        fra: [
          'dag 1–14: 10,08 mg',
          'dag 15–28: 6,07 mg',
          'dag 29–42: 3,9 mg',
          'dag 43–56: 2,54 mg',
          'dag 57–70: 1,6 mg',
          'dag 71–84: 0,92 mg',
          'dag 85–98: 0,41 mg',
          'fra dag 99: seponert',
        ],
      },
    },
  ],
  godkjenning: tilKontroll(),
}

const kryssSertralinMirtazapin: Regel = {
  id: 'kryssnedtrapping-sertralin-mirtazapin',
  versjon: 1,
  tittel: 'Bytte fra sertralin til mirtazapin, kryssnedtrapping',
  fra: { type: 'virkestoff', nokkel: 'sertralin' },
  til: { type: 'virkestoff', nokkel: 'mirtazapin' },
  plan: {
    form: 'kryssnedtrapping',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'sertralin' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'nedtrapping',
            strategi: halvering(forslag(25, 'mg', 'Laveste startdose i preparatomtalen; under den seponeres.', { henvisninger: [SPC.zoloftDose] })),
            trinnlengde: trinn14('Øvre del av NICEs vurderingstid; NICE åpner for raskere nedtrapping ved bytte (7 dager).', NICE.bytte),
            minste_varighet: minst14(SPC.zoloftSeponering),
          },
        ],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'mirtazapin' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          { type: 'hold', dose: { type: 'fast', mg: kilde(15, 'mg', 'veiledende_preferanse', SPC.remeronDose) }, varighet: { type: 'til_forlop_er_avsluttet', forlop: 'fra' } },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
      },
    ],
  },
  inndata: [
    { navn: 'startdose', omrade: [50, 200], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.zoloftDose] } },
    { navn: 'maldose', omrade: [15, 45], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.remeronDose] } },
  ],
  bekreftelser: [],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Sertralin trappes ned gradvis over minst én til to uker.', SPC.zoloftSeponering),
      utsagn('Ved kryssnedtrapping startes det nye antidepressivet mens det første trappes ned.', KEKS16.metoder),
      utsagn('Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.', NICE.kombinasjon),
      utsagn('Mirtazapin startes med 15 eller 30 mg; effektiv dose er 15–45 mg.', SPC.remeronDose),
    ],
    tilpasninger: [
      utsagn('OUSFAR halverer sertralin hver 14. dag ned til 25 mg og starter mirtazapin 15 mg dag 1, holdt til sertralin er seponert, deretter måldosen.', NICE.andel, SPC.remeronDose),
      utsagn('Måldosen for mirtazapin må oppgis; regelen har ingen standard måldose (P6.8).'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Pasienten har ikke andre serotonerge legemidler som gjør overlappen mer risikofylt.'],
    usikkerhet: [
      'Ved samtidig bruk kan serotonerge bivirkninger øke; overlappens lengde er OUSFARs valg.',
      'NICE åpner for raskere nedtrapping ved bytte; 14 dager per trinn kan være lengre enn nødvendig.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Se>Mz')],
  eksempler: [
    {
      id: 'fra-100-mg',
      beskrivelse: 'Sertralin 100 mg til mirtazapin 30 mg.',
      inndata: { startdose_mg: 100, maldose_mg: 30 },
      forventet: { fra: ['dag 1–14: 50 mg', 'dag 15–28: 25 mg', 'fra dag 29: seponert'], til: ['dag 1–28: 15 mg', 'fra dag 29: 30 mg'] },
    },
    {
      id: 'fra-50-mg',
      beskrivelse: 'Sertralin 50 mg til mirtazapin 15 mg: én reduksjon, og mirtazapin fortsetter på 15 mg.',
      inndata: { startdose_mg: 50, maldose_mg: 15 },
      forventet: { fra: ['dag 1–14: 25 mg', 'fra dag 15: seponert'], til: ['fra dag 1: 15 mg'] },
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten måldose stopper beregningen; det finnes ingen skjult standard.',
      inndata: { startdose_mg: 100 },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
  ],
  godkjenning: tilKontroll(),
}

const maoFluoksetinFenelzin: Regel = {
  id: 'mao-fluoksetin-fenelzin',
  versjon: 1,
  tittel: 'Bytte fra fluoksetin til fenelzin, sekvensielt med utvasking',
  fra: { type: 'virkestoff', nokkel: 'fluoksetin' },
  til: { type: 'virkestoff', nokkel: 'fenelzin' },
  plan: {
    form: 'sekvensielt',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'fluoksetin' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'nedtrapping',
            strategi: halvering(forslag(10, 'mg', 'Daglig 10 mg i stedet for 20 mg annenhver dag, som modellen ikke har; under den seponeres.', { henvisninger: [NICE.fluoksetin] })),
            trinnlengde: trinn14('Øvre del av NICEs vurderingstid.'),
            minste_varighet: minst14(SPC.fluoksetinSeponering),
          },
        ],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'fenelzin' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'etter_utvasking', forlop: 'fra', utvasking: kilde(35, 'dager', 'bindende_krav', SPC.fluoksetinMao, KEKS16.fluoksetinMao) },
        faser: [
          {
            type: 'uten_beregning',
            grunn: 'Fenelzin har ingen norsk preparatomtale (bare godkjenningsfritak); startdose og opptrapping vurderes i spesialisthelsetjenesten.',
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [20, 60], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.fluoksetinDose] } }],
  bekreftelser: [
    {
      id: 'spesialisthelsetjeneste',
      tekst: 'Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten.',
      grunnlag: { type: 'kilde', henvisninger: [NICE.mao] },
    },
  ],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Fluoksetin og en irreversibel, ikke-selektiv MAO-hemmer skal ikke brukes samtidig; det skal gå minst 5 uker fra fluoksetin er seponert til MAO-hemmeren startes.', SPC.fluoksetinMao),
      utsagn('Litteraturen anbefaler 5–6 ukers utvasking, og at MAO-hemmeren startes forsiktig i lav dose.', KEKS16.fluoksetinMao),
      utsagn('Fluoksetin trappes ned gradvis over minst én til to uker.', SPC.fluoksetinSeponering),
      utsagn('Bytte til en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten.', NICE.mao),
    ],
    tilpasninger: [
      utsagn('OUSFAR halverer fluoksetin hver 14. dag ned til 10 mg og seponerer deretter. Utvaskingen på 35 dager regnes fra første dag uten fluoksetin; fenelzin kan tidligst startes dagen etter.', SPC.fluoksetinMao),
      utsagn('Startdosen for fenelzin beregnes ikke, fordi det ikke finnes en norsk preparatomtale å bygge den på.'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Fenelzin er en irreversibel, ikke-selektiv MAO-hemmer, så utvaskingskravet for slike gjelder.'],
    usikkerhet: [
      'Kildene er ikke enige om nedtrappingen: preparatomtalen sier gradvis over minst én til to uker, NICE nevner dosering annenhver dag ved 20 mg, og Keks mfl. seponerer uten nedtrapping ved 40 mg daglig eller mindre. Regelen følger preparatomtalen; valget må avklares faglig.',
      'Ved høye doser og lang behandling kan 6 uker være tryggere enn 5; regelen bruker minimum fra preparatomtalen.',
      'Utvaskingen gjør at pasienten er uten antidepressiv i minst fem uker; risikoen for tilbakefall må vurderes individuelt.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Fo>Fe')],
  eksempler: [
    {
      id: 'fra-40-mg',
      beskrivelse: 'Fluoksetin 40 mg: to reduksjoner, 35 dager utvasking, fenelzin tidligst dag 64.',
      inndata: { startdose_mg: 40, bekreftet: ['spesialisthelsetjeneste'] },
      forventet: { fra: ['dag 1–14: 20 mg', 'dag 15–28: 10 mg', 'fra dag 29: seponert'], til: ['tidligst dag 64: oppstart, dosering beregnes ikke'] },
    },
    {
      id: 'fra-20-mg',
      beskrivelse: 'Fluoksetin 20 mg: én reduksjon, fenelzin tidligst dag 50.',
      inndata: { startdose_mg: 20, bekreftet: ['spesialisthelsetjeneste'] },
      forventet: { fra: ['dag 1–14: 10 mg', 'fra dag 15: seponert'], til: ['tidligst dag 50: oppstart, dosering beregnes ikke'] },
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftelse om spesialisthelsetjenesten stopper beregningen.',
      inndata: { startdose_mg: 40 },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten/,
    },
  ],
  godkjenning: tilKontroll(),
}

const BEKREFTET_AP = ['indikasjon', 'peroral_formulering']

const antipsykotikabytteOlanzapinKvetiapin: Regel = {
  id: 'antipsykotikabytte-olanzapin-kvetiapin',
  versjon: 2,
  tittel: 'Bytte fra olanzapin til kvetiapin, kryss-titrering med fast opptrapping',
  fra: { type: 'virkestoff', nokkel: 'olanzapin' },
  til: { type: 'virkestoff', nokkel: 'kvetiapin' },
  plan: {
    form: 'kryssnedtrapping',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'olanzapin' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: forslag(4, 'dager', 'Til kvetiapin har nådd 300 mg dag 4.', { henvisninger: [SPC.seroquel] }) } },
          {
            type: 'nedtrapping',
            strategi: { type: 'prosent_av_startdose', prosent: forslag(25, 'prosent', 'Fire like store trinn.') },
            trinnlengde: forslag(7, 'dager', 'Én uke per trinn.', { omrade: [7, 14] }),
          },
        ],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'kvetiapin' },
        administrasjon: 'peroral',
        formulering: 'vanlig frisetting',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'opptrapping',
            trinn: [50, 100, 200, 300].map((mg) => ({ mg: kilde(mg, 'mg', 'veiledende_preferanse', SPC.seroquel), dager: kilde(1, 'dager', 'veiledende_preferanse', SPC.seroquel) })),
          },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
      },
    ],
  },
  inndata: [
    { navn: 'startdose', omrade: [5, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.zyprexaDose] } },
    { navn: 'maldose', omrade: [300, 450], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.seroquel] } },
  ],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Indikasjonen er schizofreni; opptrappingen av kvetiapin i regelen gjelder schizofreni.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.seroquel] },
    },
    perorFormulering('Pasienten bruker peroral olanzapin, ikke depotinjeksjon.'),
  ],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Kvetiapin (vanlig frisetting) trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni, deretter 300–450 mg daglig.', SPC.seroquel),
      utsagn('Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres, uten opphold.', KEKS19.kryss),
      utsagn('Gradvis nedtrapping av olanzapin bør vurderes.', SPC.zyprexaSeponering),
    ],
    tilpasninger: [
      utsagn('OUSFAR holder olanzapin uendret til kvetiapin er på 300 mg (dag 4), og trapper så ned med 25 % av startdosen hver uke.', SPC.seroquel, KEKS19.kryss),
      utsagn('Regelen gjelder bare måldoser i det anbefalte vedlikeholdsområdet 300–450 mg; andre måldoser krever individuell vurdering.', SPC.seroquel),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Kvetiapin gis som tabletter med vanlig frisetting, to ganger daglig; døgndosen er oppgitt.'],
    usikkerhet: [
      'Lengden på nedtrappingen av olanzapin (fire uker) er OUSFARs valg; kildene oppgir ingen varighet.',
      'Sedasjon og ortostatisk blodtrykksfall kan øke mens begge brukes; det må følges klinisk.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Ol>Qu')],
  eksempler: [
    {
      id: 'fra-20-mg',
      beskrivelse: 'Olanzapin 20 mg til kvetiapin 300 mg.',
      inndata: { startdose_mg: 20, maldose_mg: 300, bekreftet: BEKREFTET_AP },
      forventet: {
        fra: ['dag 1–4: 20 mg', 'dag 5–11: 15 mg', 'dag 12–18: 10 mg', 'dag 19–25: 5 mg', 'fra dag 26: seponert'],
        til: ['dag 1: 50 mg', 'dag 2: 100 mg', 'dag 3: 200 mg', 'fra dag 4: 300 mg'],
      },
    },
    {
      id: 'med-startdato',
      beskrivelse: 'Olanzapin 10 mg til kvetiapin 400 mg med startdato 2. november 2026.',
      inndata: { startdose_mg: 10, maldose_mg: 400, startdato: '2026-11-02', bekreftet: BEKREFTET_AP },
      forventet: {
        fra: [
          'dag 1–4 (02.11.2026–05.11.2026): 10 mg',
          'dag 5–11 (06.11.2026–12.11.2026): 7,5 mg',
          'dag 12–18 (13.11.2026–19.11.2026): 5 mg',
          'dag 19–25 (20.11.2026–26.11.2026): 2,5 mg',
          'fra dag 26 (27.11.2026): seponert',
        ],
        til: ['dag 1 (02.11.2026): 50 mg', 'dag 2 (03.11.2026): 100 mg', 'dag 3 (04.11.2026): 200 mg', 'dag 4 (05.11.2026): 300 mg', 'fra dag 5 (06.11.2026): 400 mg'],
      },
    },
    {
      id: 'over-maksimum',
      beskrivelse: '30 mg olanzapin er over doseområdet regelen gjelder for.',
      inndata: { startdose_mg: 30, maldose_mg: 300, bekreftet: BEKREFTET_AP },
      forventet: {},
      stopp: /Startdosen 30 mg er utenfor/,
    },
    {
      id: 'depotformulering',
      beskrivelse: 'Uten bekreftelse av at olanzapin er peroral (ikke depot) stopper beregningen.',
      inndata: { startdose_mg: 20, maldose_mg: 300, bekreftet: ['indikasjon'] },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten bruker peroral olanzapin/,
    },
  ],
  godkjenning: tilKontroll('indikasjonen (schizofreni) og at olanzapin er peroral, må bekreftes.'),
}

const IKKE_VURDERT = 'Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4).'
const UTEN_PREPARAT = 'Har ingen preparater i FEST (P2.5); ikke vurdert individuelt.'

const gruppeRestApAripiprazol: Regel = {
  id: 'gruppe-rest-ap-aripiprazol',
  versjon: 2,
  tittel: 'Bytte fra et antipsykotikum i gruppen «øvrige antipsykotika» til aripiprazol, kryss-titrering',
  fra: { type: 'gruppe', gruppe: 'rest-ap' },
  til: { type: 'virkestoff', nokkel: 'aripiprazol' },
  plan: {
    form: 'kryssnedtrapping',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'gruppe', gruppe: 'rest-ap' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [
          { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: forslag(7, 'dager', 'Første uke med aripiprazol før nedtrappingen starter.') } },
          {
            type: 'nedtrapping',
            strategi: { type: 'prosent_av_startdose', prosent: forslag(25, 'prosent', 'Fire like store trinn.') },
            trinnlengde: forslag(7, 'dager', 'Én uke per trinn.', { omrade: [7, 14] }),
          },
        ],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'aripiprazol' },
        administrasjon: 'peroral',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          { type: 'hold', dose: { type: 'fast', mg: kilde(10, 'mg', 'veiledende_preferanse', SPC.abilifyDose) }, varighet: { type: 'til_forlop_er_avsluttet', forlop: 'fra' } },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
      },
    ],
  },
  inndata: [
    { navn: 'startdose', omrade: [20, 40], gjelder_medlem: 'zuklopentiksol', art: 'veiledende_preferanse', grunnlag: { type: 'kilde', henvisninger: [SPC.cisordinolDose] } },
    { navn: 'maldose', omrade: [10, 30], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose] } },
  ],
  bekreftelser: [
    { id: 'indikasjon', tekst: 'Indikasjonen er schizofreni.', grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose] } },
    perorFormulering('Pasienten bruker en peroral formulering, ikke depotinjeksjon eller korttidsvirkende injeksjon.'),
  ],
  unntak: [],
  medlemmer: [
    { nokkel: 'klorprotiksen', validering: 'ikke_vurdert', begrunnelse: IKKE_VURDERT },
    { nokkel: 'flupentiksol', validering: 'ikke_vurdert', begrunnelse: IKKE_VURDERT },
    { nokkel: 'flufenazin', validering: 'ikke_vurdert', begrunnelse: 'Bare godkjenningsfritak i Norge (P2.5), og mangler i gruppens faktaboks på kildesidene (P3); ikke vurdert individuelt.' },
    { nokkel: 'loksapin', validering: 'ikke_vurdert', begrunnelse: UTEN_PREPARAT },
    { nokkel: 'perisiazin', validering: 'ikke_vurdert', begrunnelse: UTEN_PREPARAT },
    { nokkel: 'perfenazin', validering: 'ikke_vurdert', begrunnelse: IKKE_VURDERT },
    { nokkel: 'promazin', validering: 'ikke_vurdert', begrunnelse: `${UTEN_PREPARAT} Mangler også i gruppens faktaboks på kildesidene (P3).` },
    { nokkel: 'trifluoperazin', validering: 'ikke_vurdert', begrunnelse: UTEN_PREPARAT },
    { nokkel: 'ziprasidon', validering: 'ikke_vurdert', begrunnelse: `${IKKE_VURDERT} Mangler i gruppens faktaboks på en del kildesider (P3).` },
    {
      nokkel: 'zuklopentiksol',
      validering: 'foreslatt',
      begrunnelse: 'Vurdert mot preparatomtalen: seponeringssymptomer kommer innen 1–4 dager etter brå seponering, så gradvis nedtrapping med overlapp er rimelig. Foreslått, ikke validert.',
    },
  ],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Aripiprazol startes med 10 eller 15 mg ved schizofreni; doseområdet er 10–30 mg.', SPC.abilifyDose),
      utsagn('Brå seponering av zuklopentiksol kan gi seponeringssymptomer innen 1–4 dager.', SPC.cisordinolSeponering),
      utsagn('Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres, uten opphold.', KEKS19.kryss),
    ],
    tilpasninger: [
      utsagn('OUSFAR starter aripiprazol 10 mg dag 1, holder det gamle antipsykotikumet uendret i én uke og trapper det så ned med 25 % av startdosen per uke. Aripiprazol går til måldosen når det gamle er seponert.', SPC.abilifyDose, KEKS19.kryss),
      utsagn('Gruppen følger P1-kartleggingen (tabellens medlemmer). Bare medlemmer som er vurdert hver for seg, kan beregnes (B4); i piloten gjelder det bare zuklopentiksol, som forslag.'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES],
    usikkerhet: [
      'Kildesidene og tabellen er ikke enige om hvem som er med i gruppen (P3); gruppens sammensetning må avklares faglig.',
      'Medlemmene har ulik halveringstid og ulike doser; samme plan passer ikke nødvendigvis alle.',
      'Aripiprazol er en partiell agonist og kan gi forverring eller akatisi ved bytte fra en full antagonist; overlappens lengde er OUSFARs valg.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:RA>Pa')],
  eksempler: [
    {
      id: 'zuklopentiksol-20-mg',
      beskrivelse: 'Zuklopentiksol 20 mg til aripiprazol 15 mg.',
      inndata: { startdose_mg: 20, maldose_mg: 15, medlem: 'zuklopentiksol', bekreftet: BEKREFTET_AP },
      forventet: {
        fra: ['dag 1–7: 20 mg', 'dag 8–14: 15 mg', 'dag 15–21: 10 mg', 'dag 22–28: 5 mg', 'fra dag 29: seponert'],
        til: ['dag 1–28: 10 mg', 'fra dag 29: 15 mg'],
      },
    },
    {
      id: 'flupentiksol-ikke-vurdert',
      beskrivelse: 'Flupentiksol er medlem av gruppen, men ikke vurdert individuelt, så beregningen stopper.',
      inndata: { startdose_mg: 6, maldose_mg: 15, medlem: 'flupentiksol', bekreftet: BEKREFTET_AP },
      forventet: {},
      stopp: /flupentiksol er ikke vurdert individuelt/,
    },
  ],
  godkjenning: tilKontroll('indikasjonen (schizofreni) og peroral formulering må bekreftes.'),
}

const depotAripiprazol: Regel = {
  id: 'depot-aripiprazol-maintena',
  versjon: 2,
  tittel: 'Fra peroral aripiprazol til Abilify Maintena, oppstart med én injeksjon',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'aripiprazol' },
  plan: {
    form: 'oppstart_depot',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'aripiprazol' },
        administrasjon: 'peroral',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [{ type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: kilde(14, 'dager', 'bindende_krav', SPC.maintenaStart) } }],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'aripiprazol' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Abilify Maintena (månedlig)',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [{ dag: kilde(1, 'dag', 'bindende_krav', SPC.maintenaStart), dose: { type: 'fast', mg: kilde(400, 'mg', 'bindende_krav', SPC.maintenaStart) } }],
            vedlikehold: {
              dose: { type: 'fast', mg: kilde(400, 'mg', 'veiledende_preferanse', SPC.maintenaVedlikehold) },
              maaneder: kilde(1, 'maaneder', 'bindende_krav', SPC.maintenaVedlikehold),
              tidligst_dager: kilde(26, 'dager', 'bindende_krav', SPC.maintenaVedlikehold),
            },
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [10, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.maintenaStart] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral aripiprazol.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.maintenaIndikasjon, SPC.maintenaToleranse] },
    },
  ],
  unntak: [
    { id: 'cyp2d6_langsom', tekst: 'Pasienten er kjent langsom CYP2D6-omsetter; preparatomtalen har egne doser.', grunnlag: { type: 'kilde', henvisninger: [SPC.maintenaCyp2d6] } },
    { id: 'sterk_cyp_hemmer', tekst: 'Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer; dosen skal reduseres.', grunnlag: { type: 'kilde', henvisninger: [SPC.maintenaHemmere] } },
    { id: 'cyp3a4_induktor', tekst: 'Pasienten bruker en CYP3A4-induktor, som bør unngås sammen med depotet.', grunnlag: { type: 'kilde', henvisninger: [SPC.maintenaInduktorer] } },
  ] satisfies Unntak[],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Depotet er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på peroral aripiprazol, og tolerabilitet må være vist før det startes.', SPC.maintenaIndikasjon, SPC.maintenaToleranse),
      utsagn('Ved oppstart med én injeksjon gis 400 mg på startdagen, og peroral aripiprazol 10–20 mg fortsetter i 14 dager.', SPC.maintenaStart),
      utsagn('Vedlikehold er 400 mg én gang i måneden, tidligst 26 dager etter forrige injeksjon.', SPC.maintenaVedlikehold),
      utsagn('Langsomme CYP2D6-omsettere, sterke hemmere og induktorer krever andre doser eller bør unngås.', SPC.maintenaCyp2d6, SPC.maintenaHemmere, SPC.maintenaInduktorer),
    ],
    tilpasninger: [
      utsagn('Den perorale dosen pasienten bruker, fortsetter uendret i 14 dager (dag 1–14) og seponeres deretter.', SPC.maintenaStart),
      utsagn('Oppstart med to injeksjoner er ikke tatt med i piloten.', SPC.maintenaToInjeksjoner),
      utsagn('Dosereduksjon til 300 mg ved bivirkninger er en klinisk vurdering og beregnes ikke.', SPC.maintenaVedlikehold),
    ],
    forutsetninger: [
      ...FORUTSETNINGER_FELLES,
      'Pasienten bruker peroral aripiprazol 10–20 mg daglig.',
      'Forskriveren har vurdert hvert unntak (CYP2D6-status, hemmere og induktorer) og svart nei; et ubesvart unntak stopper beregningen. «Nei» om CYP2D6 betyr at pasienten ikke er kjent langsom omsetter.',
    ],
    usikkerhet: ['Regelen gjelder Abilify Maintena; andre aripiprazoldepoter (andre estere eller intervaller) har egne oppstartsregimer og er ikke omfattet.'],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Da')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Peroral aripiprazol 15 mg; indikasjonen bekreftet og alle unntak avkreftet.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: { cyp2d6_langsom: false, sterk_cyp_hemmer: false, cyp3a4_induktor: false } },
      forventet: {
        fra: ['dag 1–14: 15 mg', 'fra dag 15: seponert'],
        til: ['dag 1: 400 mg injeksjon', 'hver måned fra 1 måned etter dag 1, tidligst 26 dager etter forrige: 400 mg injeksjon'],
      },
    },
    {
      id: 'langsom-cyp2d6',
      beskrivelse: 'Kjent langsom CYP2D6-omsetter: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: { cyp2d6_langsom: true, sterk_cyp_hemmer: false, cyp3a4_induktor: false } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er kjent langsom CYP2D6-omsetter/,
    },
    {
      id: 'interaksjoner-ukjent',
      beskrivelse: 'Hemmere og induktorer er ikke vurdert: ukjent stopper like mye som et unntak som gjelder.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: { cyp2d6_langsom: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten bruker en sterk CYP2D6- eller CYP3A4-hemmer/,
    },
    {
      id: 'uten-indikasjon',
      beskrivelse: 'Uten bekreftet indikasjon og tolerabilitet stopper beregningen.',
      inndata: { startdose_mg: 15, pasientforhold: { cyp2d6_langsom: false, sterk_cyp_hemmer: false, cyp3a4_induktor: false } },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten er voksen, har schizofreni/,
    },
  ],
  godkjenning: tilKontroll('indikasjonen må bekreftes, og hvert unntak må besvares; et ukjent unntak stopper beregningen.'),
}

const NYRE_AVKREFTET = { nedsatt_nyrefunksjon: false }

const depotPaliperidon: Regel = {
  id: 'depot-paliperidon-xeplion',
  versjon: 2,
  tittel: 'Fra peroral paliperidon depottablett til Xeplion',
  fra: { type: 'virkestoff', nokkel: 'paliperidon' },
  til: { type: 'virkestoff', nokkel: 'paliperidon' },
  plan: {
    form: 'oppstart_depot',
    forlop: [
      {
        id: 'fra',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'peroral',
        formulering: 'depottablett',
        utgangsdose: 'startdose',
        start: { type: 'dag', dag: 1 },
        faser: [{ type: 'seponer' }],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Xeplion (paliperidonpalmitat, månedlig)',
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [
              { dag: kilde(1, 'dag', 'bindende_krav', SPC.xeplionStart), dose: { type: 'fast', mg: kilde(150, 'mg', 'bindende_krav', SPC.xeplionStart) }, sted: 'deltoideus' },
              {
                dag: kilde(8, 'dag', 'bindende_krav', SPC.xeplionStart),
                dose: { type: 'fast', mg: kilde(100, 'mg', 'bindende_krav', SPC.xeplionStart) },
                sted: 'deltoideus',
                vindu_dager: kilde(4, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              },
            ],
            vedlikehold: {
              dose: {
                type: 'tabell',
                rader: [
                  { fra_mg: 3, til_mg: [25, 50] },
                  { fra_mg: 6, til_mg: 75 },
                  { fra_mg: 9, til_mg: 100 },
                  { fra_mg: 12, til_mg: 150 },
                ],
                grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionOmregning] },
              },
              maaneder: kilde(1, 'maaneder', 'bindende_krav', SPC.xeplionStart),
              vindu_dager: kilde(7, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              sted: 'deltoideus eller setemuskel',
            },
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', verdier: [3, 6, 9, 12], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionOmregning] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på peroral paliperidon depottablett.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, SPC.xeplionOmregning] },
    } satisfies Bekreftelse,
  ],
  unntak: [
    {
      id: 'nedsatt_nyrefunksjon',
      tekst: 'Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionNyre] },
    },
  ],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Xeplion startes med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.', SPC.xeplionStart, SPC.xeplionVinduer),
      utsagn('Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.', SPC.xeplionIndikasjon),
      utsagn('Vedlikeholdsdosen som gir tilsvarende eksponering som 3, 6, 9 og 12 mg peroralt, er 25–50, 75, 100 og 150 mg.', SPC.xeplionOmregning),
      utsagn('Ved nedsatt nyrefunksjon er start- og vedlikeholdsdosene andre, og under 50 ml/min anbefales ikke Xeplion.', SPC.xeplionNyre),
      utsagn('Den perorale behandlingen kan seponeres når Xeplion startes.', SPC.xeplionSeponering),
      utsagn('Ved bytte mellom peroral behandling og depot må preparatspesifikke instruksjoner følges.', KEKS19.depot),
    ],
    tilpasninger: [
      utsagn('OUSFAR seponerer den perorale behandlingen dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.', SPC.xeplionSeponering),
      utsagn(
        'Ved 3 mg peroralt oppgis vedlikeholdsdosen som spennet 25–50 mg. Valget i spennet er en klinisk vurdering: forskriveren må oppgi dosen som måldose, ellers stopper beregningen. Ved 6, 9 og 12 mg må en oppgitt måldose være lik tabellens.',
        SPC.xeplionOmregning,
      ),
      utsagn('Bytte fra peroral risperidon er ikke tatt med, fordi preparatomtalen ikke har en omregning fra risperidondose.'),
    ],
    forutsetninger: [
      ...FORUTSETNINGER_FELLES,
      'Pasienten bruker én av depottablettstyrkene 3, 6, 9 eller 12 mg daglig.',
      'Forskriveren har vurdert nyrefunksjonen og svart at kreatininclearance ikke er under 80 ml/min; ubesvart stopper beregningen.',
    ],
    usikkerhet: [
      'Ved bytte fra 9–12 mg til injeksjon i setemuskelen kan eksponeringen bli lavere de første seks månedene (preparatomtalen); valg av injeksjonssted beregnes ikke.',
      'Tremånedersdepotene (Trevicta, Byannli) har egne regler og er ikke omfattet.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Pp>Dp')],
  eksempler: [
    {
      id: 'fra-6-mg',
      beskrivelse: 'Paliperidon depottablett 6 mg; indikasjonen bekreftet og nedsatt nyrefunksjon avkreftet.',
      inndata: { startdose_mg: 6, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: [
          'dag 1: 150 mg injeksjon, deltoideus',
          'dag 8 (±4 dager): 100 mg injeksjon, deltoideus',
          'hver måned fra 1 måned etter dag 8 (±7 dager): 75 mg injeksjon, deltoideus eller setemuskel',
        ],
      },
    },
    {
      id: 'fra-3-mg-med-dato',
      beskrivelse: 'Fra 3 mg med klinikerens valg 50 mg i spennet 25–50 mg, startdato 24. januar 2027: dag 8 er 31. januar, og én måned senere er siste dag i februar.',
      inndata: { startdose_mg: 3, maldose_mg: 50, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET, startdato: '2027-01-24' },
      forventet: {
        fra: ['fra dag 1 (24.01.2027): seponert'],
        til: [
          'dag 1 (24.01.2027): 150 mg injeksjon, deltoideus',
          'dag 8 (31.01.2027, ±4 dager): 100 mg injeksjon, deltoideus',
          'hver måned fra 1 måned etter dag 8 (28.02.2027, ±7 dager): 50 mg injeksjon, deltoideus eller setemuskel',
        ],
      },
    },
    {
      id: 'fra-3-mg-uten-dosevalg',
      beskrivelse: 'Fra 3 mg uten valgt dose i spennet: beregningen velger ikke selv, og stopper.',
      inndata: { startdose_mg: 3, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Ved 3 mg gir omregningstabellen et spenn på 25–50 mg/,
    },
    {
      id: 'dose-uten-omregning',
      beskrivelse: '15 mg finnes ikke i omregningstabellen, så beregningen stopper.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 15 mg er utenfor det regelen gjelder for \(3, 6, 9, 12 mg\)/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 6, bekreftet: ['indikasjon'], pasientforhold: { nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'nyrefunksjon-ukjent',
      beskrivelse: 'Nyrefunksjonen er ikke vurdert: ukjent stopper like mye som nedsatt.',
      inndata: { startdose_mg: 6, bekreftet: ['indikasjon'] },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har kreatininclearance under 80 ml\/min/,
    },
  ],
  godkjenning: tilKontroll('indikasjonen må bekreftes, nyrefunksjonen må besvares, og ved 3 mg må klinikeren velge dosen i spennet 25–50 mg.'),
}

export const PILOTSETT: Regelsett = {
  id: 'ousfar-verktoy-pilot',
  versjon: 2,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Pilotsett for regelmodellen i P4: én regel per regelklasse planen prioriterer. Til faglig kontroll; ingen regel er klinisk godkjent eller skal brukes i appen.',
  regler: [
    seponeringEscitalopram,
    seponeringCitalopramHyperbolsk,
    kryssSertralinMirtazapin,
    maoFluoksetinFenelzin,
    antipsykotikabytteOlanzapinKvetiapin,
    gruppeRestApAripiprazol,
    depotAripiprazol,
    depotPaliperidon,
  ],
}
