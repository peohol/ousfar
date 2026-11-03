/**
 * Byttereglene for antipsykotika i K3 (`docs/verktøy-klinisk-leveranseplan-2026-11.md`):
 * komplette forløp fra dagens behandling til et definert sluttmål, to
 * depotrelaterte og tre perorale. Bakgrunnen, kildene og hva som fortsatt
 * ikke er dekket, står i `docs/verktøy-k3-antipsykotika.md` (rapporten over reglene: `docs/verktøy-k3-antipsykotikabytter.md`). Filen eies av K3; registreringen står i `domenesett.ts`.
 *
 * Hver regel bygger bare på preparatomtaler (DMP og EMA) og Keks 2019; ingen
 * bygger på Psychiatrienet, som bare står som referanse til kildeoppføringen
 * (`docs/verktøy-p3-rettigheter.md`). Reglene er valgt fordi kildene selv
 * beskriver hele forløpet, så ingen dose, frist eller nedtrapping er OUSFARs
 * eget påfunn:
 *
 * - Depot: Xeplion fra peroral risperidon og fra Risperdal Consta
 *   (Xeplion pkt. 4.2). Sluttmålet er fast månedlig vedlikehold.
 * - Peroralt: direkte bytte fra aripiprazol til olanzapin eller risperidon
 *   (Keks 2019: direkte bytte er mulig fra aripiprazol, som har svært lang
 *   halveringstid og ingen antikolinerg effekt), og fra kariprazin til
 *   kvetiapin (Reagila pkt. 4.2: ingen kryss-titrering, det nye startes i
 *   laveste dose). Sluttmålet er den nye behandlingen i startdosen eller
 *   vedlikeholdsdosen preparatomtalen oppgir; videre justering er klinisk.
 *
 * **Ingen av reglene er klinisk godkjent.** De står til uavhengig faglig
 * kontroll og gir ingen klinisk plan i appen før en kontrollør har godkjent
 * nøyaktig versjonen og fingeravtrykket.
 */
import { FORUTSETNINGER_FELLES, h, kilde, pn, steg, utsagn } from './bygg'
import type { Domenesett } from './domenesett'
import type { Bekreftelse, Fase, Forlop, Godkjenning, Kildehenvisning, Regel, Regelsett, Unntak } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { SPC } from './pilotsett'

/* --- Godkjenning ------------------------------------------------------------------ */

const K3 = '2026-11-03'
const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, norske preparater og regneeksempler (K3). Ikke klinisk godkjent.'
const tilKontroll = (merknad: string): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [steg('utkast', 1, merknad, K3), steg('til_faglig_kontroll', 1, TIL_KONTROLL, K3)],
})

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

const KEKS = {
  spesialist: h('keks-2019', 'tabell 4 og avsnittet om bytte', 'Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett.'),
  direkte: h('keks-2019', 'tabell 4 (direkte bytte)', 'Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt.'),
  fraAripiprazol: h('keks-2019', 'avsnittet om direkte bytte', 'Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt.'),
  aripiprazolHalveringstid: h('keks-2019', 'tabell 1', 'Halveringstiden til aripiprazol er om lag 75 timer, og 95 timer for den aktive metabolitten.'),
  depotTilDepot: h('keks-2019', 'tabell 4 (depot til depot)', 'Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet gjøres oftest direkte og blir på grunn av de lange halveringstidene i praksis en kryss-titrering.'),
  ingenOpphold: h('keks-2019', 'avsnittet om byttestrategier', 'I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste.'),
}

const XEPLION = {
  fraRisperidon: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Ved bytte fra peroral paliperidon eller peroral risperidon startes Xeplion med den vanlige oppstarten: 150 mg dag 1 og 100 mg dag 8.'),
  vedlikehold: h('ema-xeplion', 'section 4.2', 'Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt.'),
  justering: h('ema-xeplion', 'section 4.2', 'Vedlikeholdsdosen kan justeres månedlig; full effekt av en endret dose kan først sees etter flere måneder.'),
  fraConsta: h('ema-xeplion', 'section 4.2 (bytte fra risperidon depotinjeksjon)', 'Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8.'),
  constaTabell: h('ema-xeplion', 'section 4.2 (bytte fra risperidon depotinjeksjon)', 'Risperidon depotinjeksjon 25, 37,5 og 50 mg hver 2. uke tilsvarer ved vedlikehold Xeplion 50, 75 og 100 mg månedlig.'),
  eldre: h('ema-xeplion', 'section 4.2 (eldre)', 'Effekt og sikkerhet hos eldre over 65 år er ikke fastslått; eldre kan ha nedsatt nyrefunksjon som krever andre doser.'),
}

const RISPERDAL = {
  dose: h('dmp-risperdal', 'pkt. 4.2', 'Schizofreni hos voksne: start med 2 mg daglig; dosen kan økes til 4 mg dag 2 og deretter holdes eller tilpasses. De fleste har effekt av 4–6 mg daglig.'),
  maks: h('dmp-risperdal', 'pkt. 4.2', 'Doser over 10 mg daglig har ikke vist bedre effekt; doser over 16 mg daglig er ikke vurdert for sikkerhet og anbefales ikke.'),
  enEllerTo: h('dmp-risperdal', 'pkt. 4.2', 'Risperidon kan gis én eller to ganger daglig.'),
  eldre: h('dmp-risperdal', 'pkt. 4.2', 'Eldre: anbefalt startdose er 0,5 mg to ganger daglig, med langsom økning til 1–2 mg to ganger daglig.'),
  nyreLever: h('dmp-risperdal', 'pkt. 4.2 og 4.4', 'Ved nedsatt nyre- eller leverfunksjon bør start- og vedlikeholdsdosen halveres og opptrappingen gå langsommere.'),
  interaksjoner: h('dmp-risperdal', 'pkt. 4.5', 'Når en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin) startes eller seponeres, bør doseringen vurderes på nytt.'),
}

const CONSTA = {
  dose: h('dmp-risperdal-consta', 'pkt. 4.2', 'Risperdal Consta gis intramuskulært annenhver uke, vanligvis 25 mg; noen trenger 37,5 eller 50 mg. Høyere doser enn 50 mg anbefales ikke.'),
}

const REAGILA = {
  dose: h('ema-reagila', 'section 4.2', 'Anbefalt startdose er 1,5 mg én gang daglig, med langsom økning i trinn på 1,5 mg til høyst 6 mg daglig.'),
  fra: h('ema-reagila', 'section 4.2 (bytte fra kariprazin)', 'Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres.'),
  halvering: h('ema-reagila', 'section 4.2 og 5.2', 'Plasmakonsentrasjonen av kariprazin og de aktive metabolittene faller med om lag 50 % på én uke etter seponering; effekten avtar gradvis.'),
  indikasjon: h('ema-reagila', 'section 4.1', 'Kariprazin er godkjent til behandling av schizofreni hos voksne.'),
}

const ZYPREXA = {
  start: h('ema-zyprexa', 'section 4.2', 'Schizofreni: anbefalt startdose er 10 mg daglig. Dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.'),
  lavereStart: h('ema-zyprexa', 'section 4.2', 'Lavere startdose (5 mg) bør vurderes fra 65 år når kliniske forhold tilsier det, ved nedsatt nyre- eller leverfunksjon og ved flere faktorer for langsommere omsetning (kvinne, høy alder, ikke-røyker).'),
  cyp1a2: h('ema-zyprexa', 'section 4.5', 'Ved samtidig bruk av fluvoksamin eller andre CYP1A2-hemmere, som ciprofloksacin, bør lavere startdose av olanzapin vurderes.'),
}

const SEROQUEL = {
  eldre: h('dmp-seroquel', 'pkt. 4.2 (eldre)', 'Eldre kan trenge langsommere opptrapping og lavere vedlikeholdsdose; plasmaclearance er 30–50 % lavere enn hos yngre.'),
  lever: h('dmp-seroquel', 'pkt. 4.2 (nedsatt leverfunksjon)', 'Ved nedsatt leverfunksjon bør startdosen være 25 mg daglig, med økning på 25–50 mg daglig til effektiv dose.'),
  cyp3a4: h('dmp-seroquel', 'pkt. 4.3', 'Samtidig bruk av CYP3A4-hemmere, som HIV-proteasehemmere, azolantimykotika, erytromycin, klaritromycin og nefazodon, er kontraindisert.'),
}

/* --- Felles byggesteiner -------------------------------------------------------------- */

/** De felles forutsetningene og regelens egne. */
const forutsetninger = (...tillegg: string[]) => [...FORUTSETNINGER_FELLES, ...tillegg]

const NYRE: Unntak = {
  id: 'nedsatt_nyrefunksjon',
  tekst: 'Pasienten har kreatininclearance under 80 ml/min; preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.',
  grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionNyre] },
}
const XEPLION_ELDRE: Unntak = {
  id: 'over_65',
  tekst: 'Pasienten er over 65 år; effekt og sikkerhet av Xeplion er ikke fastslått i denne gruppen.',
  grunnlag: { type: 'kilde', henvisninger: [XEPLION.eldre] },
}

/** Bekreftelsen i de perorale byttene: byttet er vurdert av spesialist, og pasienten følges tett. */
const spesialist = (): Bekreftelse => ({
  id: 'spesialist_risiko',
  tekst:
    'Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten, og pasienten kan følges tett de første ukene: forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.',
  grunnlag: { type: 'kilde', henvisninger: [KEKS.spesialist, KEKS.direkte] },
})

const peroral = (stoff: string): Bekreftelse => ({
  id: 'peroral_formulering',
  tekst: `Pasienten bruker peroral ${stoff}, ikke depotinjeksjon.`,
  grunnlag: { type: 'kilde', henvisninger: [KEKS.depotTilDepot] },
})

/** Forløpet for legemidlet pasienten slutter med: siste dose er dagen før dag 1. */
const seponeres = (nokkel: string, administrasjon: Forlop['administrasjon'], ekstra: Partial<Forlop> = {}): Forlop => ({
  id: 'fra',
  virkestoff: { type: 'virkestoff', nokkel },
  administrasjon,
  utgangsdose: 'startdose',
  start: { type: 'dag', dag: 1 },
  faser: [{ type: 'seponer' }],
  ...ekstra,
})

/** Forløpet for det nye perorale legemidlet fra dag 1. */
const startes = (nokkel: string, faser: Fase[], ekstra: Partial<Forlop> = {}): Forlop => ({
  id: 'til',
  virkestoff: { type: 'virkestoff', nokkel },
  administrasjon: 'peroral',
  utgangsdose: null,
  start: { type: 'dag', dag: 1 },
  faser,
  ...ekstra,
})

const XEPLION_STED = 'deltoideus eller setemuskel'

/* --- Depot: peroral risperidon → Xeplion ----------------------------------------------- */

const NYRE_AVKREFTET = { nedsatt_nyrefunksjon: false, over_65: false }

const risperidonXeplion: Regel = {
  id: 'depot-risperidon-xeplion',
  versjon: 1,
  tittel: 'Fra peroral risperidon til Xeplion',
  fra: { type: 'virkestoff', nokkel: 'risperidon' },
  til: { type: 'virkestoff', nokkel: 'paliperidon' },
  plan: {
    form: 'oppstart_depot',
    forlop: [
      seponeres('risperidon', 'peroral'),
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Xeplion (paliperidonpalmitat, månedlig)',
        // Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotet er ikke kontrollert og ikke omfattet.
        preparater: ['Xeplion'],
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [
              { dag: kilde(1, 'dag', 'bindende_krav', XEPLION.fraRisperidon), dose: { type: 'fast', mg: kilde(150, 'mg', 'bindende_krav', SPC.xeplionStart, XEPLION.fraRisperidon) }, sted: 'deltoideus' },
              {
                dag: kilde(8, 'dag', 'bindende_krav', SPC.xeplionStart),
                dose: { type: 'fast', mg: kilde(100, 'mg', 'bindende_krav', SPC.xeplionStart, XEPLION.fraRisperidon) },
                sted: 'deltoideus',
                vindu_dager: kilde(4, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              },
            ],
            vedlikehold: {
              dose: { type: 'inndata', navn: 'maldose' },
              maaneder: kilde(1, 'maaneder', 'bindende_krav', SPC.xeplionStart),
              vindu_dager: kilde(7, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              sted: XEPLION_STED,
            },
          },
        ],
      },
    ],
  },
  inndata: [
    { navn: 'startdose', omrade: [0, 16], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.maks] } },
    { navn: 'maldose', omrade: [25, 150], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [XEPLION.vedlikehold] } },
  ],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på, og har tålt, peroral risperidon.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.fraRisperidon] },
    },
  ],
  unntak: [NYRE, XEPLION_ELDRE],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.', SPC.xeplionIndikasjon),
      utsagn('Fra peroral risperidon startes Xeplion med 150 mg dag 1 og 100 mg dag 8 (±4 dager), begge i deltoideus; deretter månedlig (±7 dager), første gang én måned etter andre dose.', XEPLION.fraRisperidon, SPC.xeplionStart, SPC.xeplionVinduer),
      utsagn('Anbefalt vedlikeholdsdose er 75 mg månedlig, innenfor 25–150 mg etter toleranse og effekt, i deltoideus eller setemuskel.', XEPLION.vedlikehold, SPC.xeplionStart),
      utsagn('Peroral risperidon kan seponeres når Xeplion startes.', SPC.xeplionSeponering),
      utsagn('Preparatomtalen har ingen tabell fra peroral risperidondose til Xeplion-dose; tabellen gjelder paliperidon depottabletter.', SPC.xeplionOmregning),
      utsagn('Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.', SPC.xeplionNyre, XEPLION.eldre),
    ],
    tilpasninger: [
      utsagn('OUSFAR seponerer peroral risperidon dagen før første injeksjon; gradvis seponering, som preparatomtalen nevner for noen, er ikke modellert.', SPC.xeplionSeponering),
      utsagn('Vedlikeholdsdosen regnes ikke ut fra risperidondosen. Forskriveren velger den innenfor 25–150 mg; preparatomtalen anbefaler 75 mg. Planen bruker bare styrker av Xeplion som finnes i FEST.', XEPLION.vedlikehold),
      utsagn('Risperidondosen oppgis som dokumentasjon av stabiliseringen og må være innenfor det preparatomtalen anbefaler (høyst 16 mg daglig); den brukes ikke i beregningen.', RISPERDAL.maks),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral risperidon (tabletter eller mikstur) daglig.',
      'Forskriveren har vurdert nyrefunksjonen og alderen og svart at kreatininclearance ikke er under 80 ml/min og at pasienten ikke er over 65 år; ubesvart stopper beregningen.',
    ),
    usikkerhet: [
      'Hvilken vedlikeholdsdose som gir samme effekt som pasientens risperidondose, sier preparatomtalen ikke; valget er klinisk, og full effekt av en dose kan først sees etter flere måneder.',
      'Generiske paliperidonpalmitat (Niapelf, Palmeux, Paliperidon Zentiva) og tremånedersdepotene er ikke kontrollert mot regelen og er ikke omfattet.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Rd>Dp')],
  eksempler: [
    {
      id: 'fra-4-mg-75',
      beskrivelse: 'Risperidon 4 mg, vedlikehold 75 mg, startdato 1. desember 2026.',
      inndata: { startdose_mg: 4, maldose_mg: 75, startdato: '2026-12-01', bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (01.12.2026): seponert'],
        til: [
          'dag 1 (01.12.2026): 150 mg injeksjon, deltoideus',
          'dag 8 (08.12.2026, ±4 dager): 100 mg injeksjon, deltoideus',
          'hver måned fra 1 måned etter dag 8 (08.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel',
        ],
      },
    },
    {
      id: 'fra-2-mg-50',
      beskrivelse: 'Risperidon 2 mg, vedlikehold 50 mg.',
      inndata: { startdose_mg: 2, maldose_mg: 50, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 150 mg injeksjon, deltoideus', 'dag 8 (±4 dager): 100 mg injeksjon, deltoideus', 'hver måned fra 1 måned etter dag 8 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt vedlikeholdsdose: beregningen velger ikke selv.',
      inndata: { startdose_mg: 4, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
    {
      id: 'maldose-over-150',
      beskrivelse: 'Vedlikehold 175 mg er over området i preparatomtalen.',
      inndata: { startdose_mg: 6, maldose_mg: 175, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 175 mg er utenfor/,
    },
    {
      id: 'risperidon-over-16',
      beskrivelse: 'Risperidon 20 mg er over det preparatomtalen anbefaler.',
      inndata: { startdose_mg: 20, maldose_mg: 150, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 20 mg er utenfor/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: ['indikasjon'], pasientforhold: { ...NYRE_AVKREFTET, nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'alder-ukjent',
      beskrivelse: 'Alderen er ikke vurdert: ukjent stopper like mye som over 65 år.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: ['indikasjon'], pasientforhold: { nedsatt_nyrefunksjon: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten er over 65 år/,
    },
    {
      id: 'uten-indikasjon',
      beskrivelse: 'Uten bekreftet stabilisering og toleranse stopper beregningen.',
      inndata: { startdose_mg: 4, maldose_mg: 75, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på/,
    },
  ],
  godkjenning: tilKontroll('Ny regel (K3, VDK-2 forslag 3): samme oppstart som den godkjente regelen fra paliperidon depottablett, med vedlikeholdsdosen valgt av forskriveren innenfor preparatomtalens område.'),
}

/* --- Depot: Risperdal Consta → Xeplion ----------------------------------------------- */

const CONSTA_TABELL = {
  type: 'tabell' as const,
  rader: [
    { fra_mg: 25, til_mg: 50 },
    { fra_mg: 37.5, til_mg: 75 },
    { fra_mg: 50, til_mg: 100 },
  ],
  grunnlag: { type: 'kilde' as const, henvisninger: [XEPLION.constaTabell] },
}

const constaXeplion: Regel = {
  id: 'depot-consta-xeplion',
  versjon: 1,
  tittel: 'Fra Risperdal Consta til Xeplion',
  fra: { type: 'virkestoff', nokkel: 'risperidon' },
  til: { type: 'virkestoff', nokkel: 'paliperidon' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('risperidon', 'depotinjeksjon', { formulering: 'Risperdal Consta (hver 2. uke)', preparater: ['Risperdal Consta'] }),
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'paliperidon' },
        administrasjon: 'depotinjeksjon',
        formulering: 'Xeplion (paliperidonpalmitat, månedlig)',
        preparater: ['Xeplion'],
        utgangsdose: null,
        start: { type: 'dag', dag: 1 },
        faser: [
          {
            type: 'injeksjoner',
            start: [{ dag: kilde(1, 'dag', 'bindende_krav', XEPLION.fraConsta), dose: CONSTA_TABELL, sted: XEPLION_STED }],
            vedlikehold: {
              dose: CONSTA_TABELL,
              maaneder: kilde(1, 'maaneder', 'bindende_krav', XEPLION.fraConsta),
              vindu_dager: kilde(7, 'dager', 'bindende_krav', SPC.xeplionVinduer),
              sted: XEPLION_STED,
            },
          },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', verdier: [25, 37.5, 50], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, CONSTA.dose] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på Risperdal Consta i den oppgitte dosen hver 2. uke.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.constaTabell] },
    },
    {
      id: 'preparat_consta',
      tekst: 'Depotet er Risperdal Consta hver 2. uke, ikke Okedi eller et annet risperidondepot, som har andre intervaller og ikke er omfattet.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, CONSTA.dose] },
    },
    {
      id: 'neste_injeksjon',
      tekst: 'Startdatoen (dag 1) er dagen neste Consta-injeksjon skulle vært gitt; Consta gis ikke mer.',
      grunnlag: { type: 'kilde', henvisninger: [XEPLION.fraConsta] },
    },
  ],
  unntak: [NYRE, XEPLION_ELDRE],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Fra risperidon depotinjeksjon gis Xeplion i stedet for neste planlagte injeksjon og deretter månedlig, uten oppstartsdosene dag 1 og dag 8.', XEPLION.fraConsta),
      utsagn('Consta 25, 37,5 og 50 mg hver 2. uke tilsvarer Xeplion 50, 75 og 100 mg månedlig.', XEPLION.constaTabell),
      utsagn('Månedlige injeksjoner kan gis inntil 7 dager før eller etter månedsdatoen, i deltoideus eller setemuskel.', SPC.xeplionVinduer, SPC.xeplionStart),
      utsagn('Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet blir i praksis en kryss-titrering.', KEKS.depotTilDepot),
      utsagn('Ved nedsatt nyrefunksjon er dosene andre, og effekt og sikkerhet er ikke fastslått over 65 år.', SPC.xeplionNyre, XEPLION.eldre),
    ],
    tilpasninger: [
      utsagn('Første Xeplion-dose regnes som injeksjonen dag 1, med samme dose som vedlikeholdet etter tabellen; den neste kommer én måned senere.', XEPLION.fraConsta, XEPLION.constaTabell),
      utsagn('I verktøyet er Consta og Okedi samme valg («risperidon, depotinjeksjon»); forskriveren må derfor bekrefte at depotet er Consta hver 2. uke.', CONSTA.dose),
    ],
    forutsetninger: forutsetninger(
      'Pasienten har fått Risperdal Consta hver 2. uke i den oppgitte dosen lenge nok til at dosen er stabil.',
      'Forskriveren har vurdert nyrefunksjonen og alderen og svart at kreatininclearance ikke er under 80 ml/min og at pasienten ikke er over 65 år; ubesvart stopper beregningen.',
    ),
    usikkerhet: [
      'Preparatomtalen oppgir intet vindu for første Xeplion-injeksjon; den gis på dagen neste Consta-injeksjon skulle vært gitt.',
      'Consta-doser som ikke står i tabellen (for eksempel høyere doser), og andre risperidondepoter, er ikke omfattet.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Dr>Dp')],
  eksempler: [
    {
      id: 'consta-37-5',
      beskrivelse: 'Consta 37,5 mg; neste injeksjon skulle vært gitt 15. desember 2026.',
      inndata: { startdose_mg: 37.5, startdato: '2026-12-15', bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (15.12.2026): seponert'],
        til: ['dag 1 (15.12.2026): 75 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (15.01.2027, ±7 dager): 75 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-25',
      beskrivelse: 'Consta 25 mg gir Xeplion 50 mg.',
      inndata: { startdose_mg: 25, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 50 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-50',
      beskrivelse: 'Consta 50 mg gir Xeplion 100 mg.',
      inndata: { startdose_mg: 50, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 100 mg injeksjon, deltoideus eller setemuskel', 'hver måned fra 1 måned etter dag 1 (±7 dager): 100 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'consta-uten-tabellverdi',
      beskrivelse: 'Consta 62,5 mg står ikke i tabellen.',
      inndata: { startdose_mg: 62.5, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 62,5 mg er utenfor/,
    },
    {
      id: 'annet-depot',
      beskrivelse: 'Uten bekreftelse av at depotet er Consta (for eksempel Okedi) stopper beregningen.',
      inndata: { startdose_mg: 50, bekreftet: ['indikasjon', 'neste_injeksjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Depotet er Risperdal Consta/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 37.5, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: { ...NYRE_AVKREFTET, nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'over-65',
      beskrivelse: 'Over 65 år: regelen gjelder ikke.',
      inndata: { startdose_mg: 37.5, bekreftet: ['indikasjon', 'preparat_consta', 'neste_injeksjon'], pasientforhold: { ...NYRE_AVKREFTET, over_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er over 65 år/,
    },
  ],
  godkjenning: tilKontroll('Ny regel (K3, VDK-2 forslag 6): Xeplion i stedet for neste Consta-injeksjon, med dosen fra tabellen i preparatomtalen og uten oppstartsdoser.'),
}

/* --- Peroralt: aripiprazol → olanzapin og risperidon, kariprazin → kvetiapin ---------------- */

const ARIPIPRAZOL_INNDATA = { navn: 'startdose' as const, omrade: [10, 30] as [number, number], art: 'bindende_krav' as const, grunnlag: { type: 'kilde' as const, henvisninger: [SPC.abilifyDose] } }

const FRA_ARIPIPRAZOL_KILDETRO = [
  utsagn('Når det første antipsykotikumet er aripiprazol, kan byttet gjøres direkte: aripiprazol stoppes, og det nye startes dagen etter. Aripiprazol har svært lang halveringstid og ingen antikolinerg effekt.', KEKS.direkte, KEKS.fraAripiprazol, KEKS.aripiprazolHalveringstid),
  utsagn('Et opphold uten antipsykotikum anbefales ikke.', KEKS.ingenOpphold),
  utsagn('Et direkte bytte krever erfaring, gjøres helst der pasienten kan følges tett, og bør vurderes av psykiater.', KEKS.direkte, KEKS.spesialist),
]
const FRA_ARIPIPRAZOL_USIKKERHET = [
  'Kilden beskriver direkte bytte fra aripiprazol som mulig, ikke som den eneste eller beste strategien; kryss-titrering er like akseptabelt og planlegges da individuelt.',
  'Effekten av aripiprazol avtar over flere dager etter siste dose; forverring kan komme sent i den første uken og må følges.',
]
const ARIPIPRAZOL_BEKREFTET = ['indikasjon', 'peroral_formulering', 'spesialist_risiko']

const ALDER_65 = (tekst: string, ...henvisninger: Kildehenvisning[]): Unntak => ({ id: 'alder_65', tekst, grunnlag: { type: 'kilde', henvisninger } })

const aripiprazolOlanzapin: Regel = {
  id: 'antipsykotikabytte-aripiprazol-olanzapin',
  versjon: 1,
  tittel: 'Fra aripiprazol til olanzapin, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'olanzapin' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('aripiprazol', 'peroral'),
      startes('olanzapin', [{ type: 'vedlikehold', dose: { type: 'fast', mg: kilde(10, 'mg', 'bindende_krav', ZYPREXA.start) } }]),
    ],
  },
  inndata: [ARIPIPRAZOL_INNDATA],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose, ZYPREXA.start] },
    },
    peroral('aripiprazol'),
    spesialist(),
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen sier at lavere startdose bør vurderes da.', ZYPREXA.lavereStart),
    { id: 'nedsatt_nyre_lever', tekst: 'Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen sier at lavere startdose bør vurderes da.', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.lavereStart] } },
    {
      id: 'langsom_omsetning',
      tekst: 'Pasienten har flere faktorer for langsommere omsetning av olanzapin (kvinne, høy alder, ikke-røyker); preparatomtalen sier at lavere startdose bør vurderes da.',
      grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.lavereStart] },
    },
    { id: 'cyp1a2_hemmer', tekst: 'Pasienten bruker fluvoksamin eller en annen CYP1A2-hemmer, som ciprofloksacin; lavere startdose av olanzapin bør vurderes da.', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.cyp1a2] } },
  ],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni er anbefalt startdose av olanzapin 10 mg daglig; dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.', ZYPREXA.start),
      utsagn('Lavere startdose bør vurderes fra 65 år, ved nedsatt nyre- eller leverfunksjon, ved flere faktorer for langsom omsetning og sammen med CYP1A2-hemmere.', ZYPREXA.lavereStart, ZYPREXA.cyp1a2),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før olanzapin startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Planen slutter med olanzapin 10 mg daglig fra dag 1. Videre justering innenfor 5–20 mg er en klinisk vurdering og beregnes ikke.', ZYPREXA.start),
    ],
    forutsetninger: forutsetninger('Pasienten bruker peroral aripiprazol 10–30 mg daglig, det doseområdet preparatomtalen oppgir ved schizofreni.', 'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.'),
    usikkerhet: [...FRA_ARIPIPRAZOL_USIKKERHET, 'Sedasjon, vektøkning og metabolske bivirkninger av olanzapin må følges; de er ikke en del av beregningen.'],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Ol')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Aripiprazol 15 mg til olanzapin, startdato 7. desember 2026.',
      inndata: { startdose_mg: 15, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['fra dag 1 (07.12.2026): 10 mg'] },
    },
    {
      id: 'fra-30-mg',
      beskrivelse: 'Aripiprazol 30 mg (høyeste dose) til olanzapin.',
      inndata: { startdose_mg: 30, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1: seponert'], til: ['fra dag 1: 10 mg'] },
    },
    {
      id: 'aripiprazol-5-mg',
      beskrivelse: 'Aripiprazol 5 mg er under doseområdet ved schizofreni; regelen gjelder ikke.',
      inndata: { startdose_mg: 5, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Startdosen 5 mg er utenfor/,
    },
    {
      id: 'fluvoksamin',
      beskrivelse: 'Fluvoksamin samtidig: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker fluvoksamin/,
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftet spesialistvurdering og tett oppfølging stopper beregningen.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon', 'peroral_formulering'], pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten/,
    },
    {
      id: 'omsetning-ukjent',
      beskrivelse: 'Faktorene for langsom omsetning er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 15, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har flere faktorer for langsommere omsetning/,
    },
  ],
  godkjenning: tilKontroll('Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til olanzapin i anbefalt startdose ved schizofreni (Zyprexa pkt. 4.2).'),
}

const RISPERIDON_AVKREFTET = { alder_65: false, nedsatt_nyre_lever: false, risperidon_interaksjon: false }

const aripiprazolRisperidon: Regel = {
  id: 'antipsykotikabytte-aripiprazol-risperidon',
  versjon: 1,
  tittel: 'Fra aripiprazol til risperidon, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'risperidon' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('aripiprazol', 'peroral'),
      startes(
        'risperidon',
        [
          { type: 'opptrapping', trinn: [{ mg: kilde(2, 'mg', 'bindende_krav', RISPERDAL.dose), dager: kilde(1, 'dager', 'veiledende_preferanse', RISPERDAL.dose) }] },
          { type: 'vedlikehold', dose: { type: 'fast', mg: kilde(4, 'mg', 'veiledende_preferanse', RISPERDAL.dose) } },
        ],
        // Bare tabletter: miksturen har ingen dokumentert oppmåling i verktøyet.
        { formulering: 'tabletter', legemiddelformer: ['53'] },
      ),
    ],
  },
  inndata: [ARIPIPRAZOL_INNDATA],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og aripiprazol er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose, RISPERDAL.dose] },
    },
    peroral('aripiprazol'),
    spesialist(),
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen har en lavere startdose og langsommere opptrapping for eldre.', RISPERDAL.eldre),
    { id: 'nedsatt_nyre_lever', tekst: 'Pasienten har nedsatt nyre- eller leverfunksjon; preparatomtalen halverer da start- og vedlikeholdsdosen.', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.nyreLever] } },
    {
      id: 'risperidon_interaksjon',
      tekst: 'Pasienten bruker en sterk CYP2D6-hemmer (f.eks. paroksetin, fluoksetin) eller en sterk CYP3A4-induktor (f.eks. karbamazepin); doseringen av risperidon må da vurderes særskilt.',
      grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.interaksjoner] },
    },
  ],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni startes risperidon med 2 mg daglig og kan økes til 4 mg dag 2; deretter holdes dosen eller tilpasses. De fleste har effekt av 4–6 mg daglig.', RISPERDAL.dose),
      utsagn('Risperidon kan gis én eller to ganger daglig.', RISPERDAL.enEllerTo),
      utsagn('Eldre, nedsatt nyre- eller leverfunksjon og sterke CYP2D6-hemmere eller CYP3A4-induktorer krever andre doser eller en ny vurdering av doseringen.', RISPERDAL.eldre, RISPERDAL.nyreLever, RISPERDAL.interaksjoner),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før risperidon startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Planen følger opptrappingen i preparatomtalen, 2 mg dag 1 og 4 mg fra dag 2, og slutter med 4 mg daglig. En langsommere opptrapping eller en annen dose innenfor 4–6 mg er en klinisk vurdering og beregnes ikke.', RISPERDAL.dose),
      utsagn('Planen bruker bare risperidontabletter; miksturen har ingen dokumentert oppmåling i verktøyet.'),
    ],
    forutsetninger: forutsetninger('Pasienten bruker peroral aripiprazol 10–30 mg daglig, det doseområdet preparatomtalen oppgir ved schizofreni.', 'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.'),
    usikkerhet: [
      ...FRA_ARIPIPRAZOL_USIKKERHET,
      'Preparatomtalen sier at en langsommere opptrapping og lavere startdose kan være riktig for noen; det avgjøres klinisk.',
      'Ortostatisk blodtrykksfall tidlig i behandlingen, ekstrapyramidale bivirkninger og prolaktinøkning må følges.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Rd')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Aripiprazol 15 mg til risperidon, startdato 7. desember 2026.',
      inndata: { startdose_mg: 15, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['dag 1 (07.12.2026): 2 mg', 'fra dag 2 (08.12.2026): 4 mg'] },
    },
    {
      id: 'fra-10-mg',
      beskrivelse: 'Aripiprazol 10 mg (laveste dose i området) til risperidon.',
      inndata: { startdose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1: 2 mg', 'fra dag 2: 4 mg'] },
    },
    {
      id: 'aripiprazol-over-30',
      beskrivelse: 'Aripiprazol 40 mg er over høyeste dose; regelen gjelder ikke.',
      inndata: { startdose_mg: 40, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 40 mg er utenfor/,
    },
    {
      id: 'eldre',
      beskrivelse: '65 år eller eldre: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...RISPERIDON_AVKREFTET, alder_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er 65 år eller eldre/,
    },
    {
      id: 'depot',
      beskrivelse: 'Uten bekreftelse av at aripiprazol er peroral (ikke Abilify Maintena) stopper beregningen.',
      inndata: { startdose_mg: 15, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten bruker peroral aripiprazol/,
    },
  ],
  godkjenning: tilKontroll('Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til risperidon med opptrappingen i preparatomtalen ved schizofreni (Risperdal pkt. 4.2).'),
}

const KVETIAPIN_AVKREFTET = { alder_65: false, nedsatt_leverfunksjon: false, cyp3a4_hemmer: false }

const kariprazinKvetiapin: Regel = {
  id: 'antipsykotikabytte-kariprazin-kvetiapin',
  versjon: 1,
  tittel: 'Fra kariprazin til kvetiapin, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'kariprazin' },
  til: { type: 'virkestoff', nokkel: 'kvetiapin' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('kariprazin', 'peroral'),
      startes(
        'kvetiapin',
        [
          { type: 'opptrapping', trinn: [50, 100, 200].map((mg) => ({ mg: kilde(mg, 'mg', 'bindende_krav', SPC.seroquel, REAGILA.fra), dager: kilde(1, 'dager', 'bindende_krav', SPC.seroquel) })) },
          { type: 'vedlikehold', dose: { type: 'fast', mg: kilde(300, 'mg', 'veiledende_preferanse', SPC.seroquel) } },
        ],
        {
          formulering: 'vanlig frisetting',
          // Bare tabletter med vanlig frisetting (FEST-form 53), aldri depottabletter, som har en annen opptrapping.
          legemiddelformer: ['53'],
          fordeling: { antall: [2], grunnlag: { type: 'kilde', henvisninger: [SPC.seroquelToGanger] } },
        },
      ),
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [1.5, 6], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [REAGILA.dose] } }],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen og har schizofreni, og kariprazin er det eneste antipsykotikumet.',
      grunnlag: { type: 'kilde', henvisninger: [REAGILA.indikasjon, SPC.seroquel] },
    },
    spesialist(),
  ],
  unntak: [
    ALDER_65('Pasienten er 65 år eller eldre; preparatomtalen sier at eldre kan trenge langsommere opptrapping og lavere dose av kvetiapin.', SEROQUEL.eldre),
    { id: 'nedsatt_leverfunksjon', tekst: 'Pasienten har nedsatt leverfunksjon; preparatomtalen har da en lavere startdose (25 mg) og langsommere opptrapping.', grunnlag: { type: 'kilde', henvisninger: [SEROQUEL.lever] } },
    { id: 'cyp3a4_hemmer', tekst: 'Pasienten bruker en CYP3A4-hemmer (f.eks. azolantimykotika, klaritromycin, erytromycin, HIV-proteasehemmere); kvetiapin er da kontraindisert.', grunnlag: { type: 'kilde', henvisninger: [SEROQUEL.cyp3a4] } },
  ],
  beregnbarhet: 'entydig_beregnbar',
  fortolkning: {
    kildetro: [
      utsagn('Ved bytte fra kariprazin trengs ingen gradvis kryss-titrering: det nye antipsykotikumet startes i laveste dose mens kariprazin seponeres.', REAGILA.fra),
      utsagn('Kariprazin og de aktive metabolittene faller med om lag 50 % på én uke, så virkningen avtar gradvis etter seponering.', REAGILA.halvering),
      utsagn('Kvetiapin med vanlig frisetting trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg.', SPC.seroquel),
      utsagn('Tablettene med vanlig frisetting tas to ganger daglig.', SPC.seroquelToGanger),
      utsagn('Et opphold uten antipsykotikum anbefales ikke.', KEKS.ingenOpphold),
    ],
    tilpasninger: [
      utsagn('Kariprazin seponeres uten nedtrapping dagen før kvetiapin startes (siste dose dagen før dag 1).', REAGILA.fra, REAGILA.halvering),
      utsagn('Planen følger opptrappingen ved schizofreni og slutter med 300 mg daglig fra dag 4, laveste anbefalte vedlikeholdsdose. Økning mot 450 mg eller en annen dose er en klinisk vurdering og beregnes ikke.', SPC.seroquel),
      utsagn('Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter. Hver døgndose gis fordelt på to doser; kan den ikke fordeles med tablettene, stopper planen.', SPC.seroquelToGanger),
    ],
    forutsetninger: forutsetninger('Pasienten bruker kariprazin 1,5–6 mg daglig.', 'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.'),
    usikkerhet: [
      'Virkningen av kariprazin avtar over uker, så bivirkninger og effekt av kvetiapin kan først vurderes etter noen uker.',
      'Sedasjon og ortostatisk blodtrykksfall kan komme i opptrappingen av kvetiapin og må følges.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Qu')],
  eksempler: [
    {
      id: 'fra-4-5-mg',
      beskrivelse: 'Kariprazin 4,5 mg til kvetiapin, startdato 7. desember 2026.',
      inndata: { startdose_mg: 4.5, startdato: '2026-12-07', bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {
        fra: ['fra dag 1 (07.12.2026): seponert'],
        til: [
          'dag 1 (07.12.2026): 50 mg, fordelt på 2 doser',
          'dag 2 (08.12.2026): 100 mg, fordelt på 2 doser',
          'dag 3 (09.12.2026): 200 mg, fordelt på 2 doser',
          'fra dag 4 (10.12.2026): 300 mg, fordelt på 2 doser',
        ],
      },
    },
    {
      id: 'fra-1-5-mg',
      beskrivelse: 'Kariprazin 1,5 mg (laveste dose) til kvetiapin.',
      inndata: { startdose_mg: 1.5, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 50 mg, fordelt på 2 doser', 'dag 2: 100 mg, fordelt på 2 doser', 'dag 3: 200 mg, fordelt på 2 doser', 'fra dag 4: 300 mg, fordelt på 2 doser'],
      },
    },
    {
      id: 'kariprazin-over-6',
      beskrivelse: 'Kariprazin 9 mg er over høyeste dose; regelen gjelder ikke.',
      inndata: { startdose_mg: 9, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 9 mg er utenfor/,
    },
    {
      id: 'cyp3a4-hemmer',
      beskrivelse: 'Klaritromycin samtidig: kvetiapin er kontraindisert, og regelen gjelder ikke.',
      inndata: { startdose_mg: 3, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: { ...KVETIAPIN_AVKREFTET, cyp3a4_hemmer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker en CYP3A4-hemmer/,
    },
    {
      id: 'lever-ukjent',
      beskrivelse: 'Leverfunksjonen er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 3, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: { alder_65: false, cyp3a4_hemmer: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har nedsatt leverfunksjon/,
    },
  ],
  godkjenning: tilKontroll('Ny regel (K3): bytte fra kariprazin uten kryss-titrering (Reagila pkt. 4.2) til kvetiapin med opptrappingen ved schizofreni (Seroquel pkt. 4.2).'),
}

/** FEST-uttrekket reglene testes ende til ende med (`npm run verktoy:regler -- hent-fest`). */
export const FEST_ANTIPSYKOTIKA = 'src/data/verktoy/fest-antipsykotika.json'

/* --- Settet ----------------------------------------------------------------------------- */

export const ANTIPSYKOTIKASETT: Regelsett = {
  id: 'ousfar-verktoy-antipsykotikabytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Byttereglene for antipsykotika i K3: komplette forløp til et definert sluttmål, bygget på preparatomtaler og Keks 2019. To depotrelaterte (Xeplion fra peroral risperidon og fra Risperdal Consta) og tre perorale direkte bytter (aripiprazol til olanzapin og til risperidon, kariprazin til kvetiapin). Alle står til uavhengig faglig kontroll; ingen er klinisk godkjent.',
  regler: [risperidonXeplion, constaXeplion, aripiprazolOlanzapin, aripiprazolRisperidon, kariprazinKvetiapin],
}

export const ANTIPSYKOTIKABYTTER: Domenesett = {
  sett: ANTIPSYKOTIKASETT,
  rapport: {
    fil: 'docs/verktøy-k3-antipsykotikabytter.md',
    tittel: 'K3: regler for bytte av antipsykotikum',
    notater: ['docs/verktøy-k3-antipsykotika.md', 'docs/verktøy-klinisk-leveranseplan-2026-11.md', 'docs/verktøy-p4-regelmodell.md'],
  },
}
