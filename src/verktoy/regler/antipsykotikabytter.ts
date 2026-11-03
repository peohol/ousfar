/**
 * Byttereglene for antipsykotika i K3 (`docs/verktøy-klinisk-leveranseplan-2026-11.md`):
 * komplette forløp fra dagens behandling til et definert sluttmål, to
 * depotrelaterte og fem perorale. Bakgrunnen, kildene og hva som fortsatt
 * ikke er dekket, står i `docs/verktøy-k3-antipsykotika.md` (rapporten over reglene: `docs/verktøy-k3-antipsykotikabytter.md`). Filen eies av K3; registreringen står i `domenesett.ts`.
 *
 * Hver regel bygger bare på preparatomtaler (DMP og EMA), Keks 2019 og TARC 2018; ingen
 * bygger på Psychiatrienet, som bare står som referanse til kildeoppføringen
 * (`docs/verktøy-p3-rettigheter.md`). Reglene er valgt fordi kildene selv
 * beskriver hele forløpet, så ingen dose, frist eller nedtrapping er OUSFARs
 * eget påfunn:
 *
 * - Depot: Xeplion fra peroral risperidon og fra Risperdal Consta
 *   (Xeplion pkt. 4.2). Sluttmålet er fast månedlig vedlikehold; etter
 *   peroral risperidon krever en annen dose enn anbefalte 75 mg en begrunnelse.
 * - Peroralt: direkte bytte fra aripiprazol til olanzapin eller risperidon
 *   (Keks 2019: direkte bytte er mulig fra aripiprazol, som har svært lang
 *   halveringstid og ingen antikolinerg effekt), og fra kariprazin til
 *   kvetiapin (Reagila pkt. 4.2: ingen kryss-titrering, det nye startes i
 *   laveste dose). Fra aripiprazol er startregimet og forskriverens valgte
 *   måldose atskilt, med en ny klinisk vurdering før dosen endres; fra
 *   kariprazin er sluttmålet kvetiapindosen preparatomtalen oppgir.
 * - Kryss-titrering fra olanzapin og fra risperidon til aripiprazol hos stabile
 *   polikliniske pasienter (TARC 2018, figur 1): det forrige stoffet trappes
 *   ned til seponering, og aripiprazol står på måldosen 10 eller 15 mg.
 *
 * **Ingen av reglene er klinisk godkjent.** De står til uavhengig faglig
 * kontroll og gir ingen klinisk plan i appen før en kontrollør har godkjent
 * nøyaktig versjonen og fingeravtrykket.
 */
import { FORUTSETNINGER_FELLES, forslag, h, kilde, pn, steg, utsagn } from './bygg'
import type { Domenesett } from './domenesett'
import type { Bekreftelse, Fase, Forlop, Godkjenning, Inndatakrav, Kildehenvisning, Regel, Regelsett, Unntak } from './modell'
import { REGELMODELLVERSJON } from './modell'
import { TEKNISK_MAKS_DAGER } from './nedtrapping'
import { SPC } from './pilotsett'

/* --- Godkjenning ------------------------------------------------------------------ */

const K3 = '2026-11-03'
const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, norske preparater og regneeksempler (K3). Ikke klinisk godkjent.'
/**
 * Til faglig kontroll i siste versjon. `endringer` er hva hver senere versjon
 * endret (versjon 2, 3, ...), f.eks. etter kontrollørens gjennomgang.
 */
const tilKontroll = (merknad: string, ...endringer: string[]): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [merknad, ...endringer].flatMap((m, i) => [steg('utkast', i + 1, m, K3), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, K3)]),
})
/** Kontrollørens gjennomgang av #320 (03.11.2026), som versjon 2 svarer på. */
const GJENNOMGANG = 'Etter kontrollørens gjennomgang av #320 03.11.2026:'

/* --- Fakta fra kildene, med egne ord ------------------------------------------------- */

const KEKS = {
  spesialist: h('keks-2019', 'tabell 4 og avsnittet om bytte', 'Bytte mellom antipsykotika bør vurderes av psykiater. Under byttet kan sykdommen forverres og nye bivirkninger komme, så pasienten må følges tett.'),
  direkte: h('keks-2019', 'tabell 4 (direkte bytte)', 'Direkte bytte: det første antipsykotikumet stoppes og det neste startes dagen etter. Det krever erfaring og gjøres helst der pasienten kan følges tett, gjerne innlagt.'),
  fraAripiprazol: h('keks-2019', 'avsnittet om direkte bytte', 'Når det første antipsykotikumet er aripiprazol eller brekspiprazol, kan byttet gjøres direkte, fordi begge har svært lang halveringstid og ingen antikolinerg effekt.'),
  aripiprazolHalveringstid: h('keks-2019', 'tabell 1', 'Halveringstiden til aripiprazol er om lag 75 timer, og 95 timer for den aktive metabolitten.'),
  depotTilDepot: h('keks-2019', 'tabell 4 (depot til depot)', 'Ved bytte fra et depot til et annet følges instruksjonen for det nye depotet; byttet gjøres oftest direkte og blir på grunn av de lange halveringstidene i praksis en kryss-titrering.'),
  kryss: h('keks-2019', 'avsnittet om kryss-titrering', 'De fleste psykiatere bruker kryss-titrering: det første antipsykotikumet trappes ned mens det neste innføres.'),
  ingenOpphold: h('keks-2019', 'avsnittet om byttestrategier', 'I motsetning til ved bytte av antidepressiver anbefales ikke et opphold uten antipsykotikum mellom det første og det neste.'),
}

const XEPLION = {
  fraRisperidon: h('ema-xeplion', 'section 4.2 (bytte fra peroral)', 'Ved bytte fra peroral paliperidon eller peroral risperidon startes Xeplion med den vanlige oppstarten: 150 mg dag 1 og 100 mg dag 8.'),
  vedlikehold: h('ema-xeplion', 'section 4.2', 'Anbefalt månedlig vedlikeholdsdose er 75 mg; noen kan ha nytte av lavere eller høyere dose innenfor 25–150 mg ut fra toleranse og effekt.'),
  overvekt: h('ema-xeplion', 'section 4.2', 'Pasienter med overvekt eller fedme kan trenge doser i den øvre delen av området.'),
  overfolsomhet: h('ema-xeplion', 'section 4.3 og 4.4', 'Overfølsomhet for paliperidon eller risperidon er en kontraindikasjon. Anafylaktiske reaksjoner er sett etter injeksjon også hos pasienter som tidligere har tålt peroral risperidon eller paliperidon.'),
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
  tekst: `Pasienten bruker peroral ${stoff} (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon.`,
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
const XEPLION_BEKREFTET = ['indikasjon', 'tidligere_toleranse']

const risperidonXeplion: Regel = {
  id: 'depot-risperidon-xeplion',
  versjon: 2,
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
    // Preparatomtalen anbefaler 75 mg; en annen dose er et individuelt valg ut fra toleranse og effekt og må begrunnes.
    { navn: 'maldose', verdier: [75], art: 'veiledende_preferanse', krever_begrunnelse: true, grunnlag: { type: 'kilde', henvisninger: [XEPLION.vedlikehold, XEPLION.overvekt] } },
  ],
  bekreftelser: [
    {
      id: 'indikasjon',
      tekst: 'Pasienten er voksen, har schizofreni og er stabilisert på peroral risperidon.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.fraRisperidon] },
    },
    {
      id: 'tidligere_toleranse',
      tekst: 'Det er dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet. Anafylaksi er likevel mulig etter injeksjon.',
      grunnlag: { type: 'kilde', henvisninger: [SPC.xeplionIndikasjon, XEPLION.overfolsomhet] },
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
      utsagn('Vedlikeholdsdosen regnes ikke ut fra risperidondosen, fordi preparatomtalen ikke har noen omregning. Forskriveren velger den innenfor 25–150 mg. Preparatomtalen anbefaler 75 mg, så en annen dose krever en skriftlig begrunnelse ut fra toleranse og effekt (for eksempel overvekt), og begrunnelsen står i planen ved siden av risperidondosen. Planen bruker bare styrker av Xeplion som finnes i FEST.', XEPLION.vedlikehold, XEPLION.overvekt),
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
      inndata: { startdose_mg: 4, maldose_mg: 75, startdato: '2026-12-01', bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
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
      beskrivelse: 'Risperidon 2 mg, vedlikehold 50 mg med skriftlig begrunnelse.',
      inndata: { startdose_mg: 2, maldose_mg: 50, begrunnelse: 'Syntetisk eksempel: lav peroral dose og bivirkninger ved høyere dose.', bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {
        fra: ['fra dag 1: seponert'],
        til: ['dag 1: 150 mg injeksjon, deltoideus', 'dag 8 (±4 dager): 100 mg injeksjon, deltoideus', 'hver måned fra 1 måned etter dag 8 (±7 dager): 50 mg injeksjon, deltoideus eller setemuskel'],
      },
    },
    {
      id: 'lav-dose-150-uten-begrunnelse',
      beskrivelse: 'Risperidon 0,5 mg og vedlikehold 150 mg uten begrunnelse: en annen dose enn den anbefalte stopper.',
      inndata: { startdose_mg: 0.5, maldose_mg: 150, bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 150 mg .*krever en skriftlig begrunnelse/,
    },
    {
      id: 'uten-toleranse',
      beskrivelse: 'Uten dokumentert tidligere toleranse stopper beregningen.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: ['indikasjon'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Det er dokumentert i journalen at pasienten har tålt peroral risperidon/,
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt vedlikeholdsdose: beregningen velger ikke selv.',
      inndata: { startdose_mg: 4, bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
    {
      id: 'maldose-over-150',
      beskrivelse: 'Vedlikehold 175 mg er over området i preparatomtalen.',
      inndata: { startdose_mg: 6, maldose_mg: 175, bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 175 mg er utenfor/,
    },
    {
      id: 'risperidon-over-16',
      beskrivelse: 'Risperidon 20 mg er over det preparatomtalen anbefaler.',
      inndata: { startdose_mg: 20, maldose_mg: 150, bekreftet: XEPLION_BEKREFTET, pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 20 mg er utenfor/,
    },
    {
      id: 'nedsatt-nyrefunksjon',
      beskrivelse: 'Kreatininclearance under 80 ml/min: regelen gjelder ikke.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { ...NYRE_AVKREFTET, nedsatt_nyrefunksjon: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har kreatininclearance under 80 ml\/min/,
    },
    {
      id: 'alder-ukjent',
      beskrivelse: 'Alderen er ikke vurdert: ukjent stopper like mye som over 65 år.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: XEPLION_BEKREFTET, pasientforhold: { nedsatt_nyrefunksjon: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten er over 65 år/,
    },
    {
      id: 'uten-indikasjon',
      beskrivelse: 'Uten bekreftet stabilisering og toleranse stopper beregningen.',
      inndata: { startdose_mg: 4, maldose_mg: 75, bekreftet: ['tidligere_toleranse'], pasientforhold: NYRE_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten er voksen, har schizofreni og er stabilisert på/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3, VDK-2 forslag 3): samme oppstart som den godkjente regelen fra paliperidon depottablett, med vedlikeholdsdosen valgt av forskriveren innenfor preparatomtalens område.',
    `${GJENNOMGANG} dokumentert tidligere toleranse er en egen bekreftelse, og en annen vedlikeholdsdose enn anbefalte 75 mg krever en skriftlig begrunnelse.`,
  ),
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
  versjon: 2,
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
  inndata: [{ navn: 'startdose', verdier: [25, 37.5, 50], enhet: 'mg per injeksjon hver 2. uke', art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [XEPLION.constaTabell, CONSTA.dose] } }],
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
  godkjenning: tilKontroll(
    'Ny regel (K3, VDK-2 forslag 6): Xeplion i stedet for neste Consta-injeksjon, med dosen fra tabellen i preparatomtalen og uten oppstartsdoser.',
    `${GJENNOMGANG} Consta-dosen oppgis uttrykkelig som mg per injeksjon hver 2. uke, ikke som døgndose.`,
  ),
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

/**
 * Dagene på startregimet før forskriverens valgte måldose: et åpent
 * OUSFAR-valg. Preparatomtalen sier bare at dosen tilpasses etter en ny
 * klinisk vurdering (for olanzapin minst 24 timer mellom økningene).
 */
const dagerForMaldose = (stoff: string, ...henvisninger: Kildehenvisning[]) =>
  forslag(
    7,
    'dager',
    `OUSFARs valg: én uke på startregimet før ${stoff} endres til den valgte måldosen, slik at effekt og bivirkninger kan vurderes etter at aripiprazol er stoppet (aripiprazol virker i flere dager etter siste dose). Preparatomtalen gir ingen fast tid, bare en ny klinisk vurdering.`,
    { omrade: [1, TEKNISK_MAKS_DAGER], justerbar: 'Dager på startregimet før måldosen', teknisk_maks: true, henvisninger: [...henvisninger, KEKS.aripiprazolHalveringstid] },
  )

/** Vurderingen før hver doseendring på vei til den valgte måldosen. */
const forMaldose = (...henvisninger: Kildehenvisning[]) => ({
  id: 'for_maldose',
  nar: { type: 'for_hvert_trinn' as const },
  tekst: 'Ny klinisk vurdering av effekt og bivirkninger, og av at aripiprazol er stoppet, før dosen endres.',
  ved_funn: 'Ved bivirkninger holdes dosen; en annen dose enn den valgte måldosen er et nytt valg.',
  grunnlag: { type: 'kilde' as const, henvisninger },
})

const aripiprazolOlanzapin: Regel = {
  id: 'antipsykotikabytte-aripiprazol-olanzapin',
  versjon: 2,
  tittel: 'Fra aripiprazol til olanzapin, direkte bytte',
  fra: { type: 'virkestoff', nokkel: 'aripiprazol' },
  til: { type: 'virkestoff', nokkel: 'olanzapin' },
  plan: {
    form: 'direkte',
    forlop: [
      seponeres('aripiprazol', 'peroral'),
      startes(
        'olanzapin',
        [
          { type: 'opptrapping', trinn: [{ mg: kilde(10, 'mg', 'bindende_krav', ZYPREXA.start), dager: dagerForMaldose('olanzapin', ZYPREXA.start) }] },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
        { vurderinger: [forMaldose(ZYPREXA.start)] },
      ),
    ],
  },
  inndata: [ARIPIPRAZOL_INNDATA, { navn: 'maldose', omrade: [5, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [ZYPREXA.start] } }],
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
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni er anbefalt startdose av olanzapin 10 mg daglig; dosen kan senere justeres innenfor 5–20 mg etter ny klinisk vurdering, med minst 24 timer mellom økningene.', ZYPREXA.start),
      utsagn('Lavere startdose bør vurderes fra 65 år, ved nedsatt nyre- eller leverfunksjon, ved flere faktorer for langsom omsetning og sammen med CYP1A2-hemmere.', ZYPREXA.lavereStart, ZYPREXA.cyp1a2),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før olanzapin startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Startdosen (10 mg fra dag 1) og den terapeutiske måldosen er atskilt. Forskriveren velger måldosen innenfor 5–20 mg ut fra klinisk vurdering; planen holder 10 mg til en ny vurdering og slutter på måldosen. Hvor lenge startdosen holdes, er et åpent OUSFAR-valg (forslag: én uke).', ZYPREXA.start),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.',
      'Indikasjonen er schizofreni; ved andre indikasjoner (for eksempel mani) gjelder andre startdoser, og regelen passer ikke.',
      'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
    ),
    usikkerhet: [...FRA_ARIPIPRAZOL_USIKKERHET, 'Sedasjon, vektøkning og metabolske bivirkninger av olanzapin må følges; de er ikke en del av beregningen.'],
  },
  referanser: [pn('SwitchAntipsychotics:Pa>Ol')],
  eksempler: [
    {
      id: 'fra-15-mg',
      beskrivelse: 'Aripiprazol 15 mg til olanzapin, startdato 7. desember 2026.',
      inndata: { startdose_mg: 15, maldose_mg: 15, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['dag 1–7 (07.12.2026–13.12.2026): 10 mg', 'fra dag 8 (14.12.2026): 15 mg'] },
    },
    {
      id: 'fra-30-mg',
      beskrivelse: 'Aripiprazol 30 mg (høyeste dose) til olanzapin, måldose 20 mg.',
      inndata: { startdose_mg: 30, maldose_mg: 20, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1–7: 10 mg', 'fra dag 8: 20 mg'] },
    },
    {
      id: 'maldose-10',
      beskrivelse: 'Måldosen er startdosen, 10 mg.',
      inndata: { startdose_mg: 10, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: { fra: ['fra dag 1: seponert'], til: ['fra dag 1: 10 mg'] },
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt måldose: beregningen velger ikke selv.',
      inndata: { startdose_mg: 15, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
    {
      id: 'maldose-over-20',
      beskrivelse: 'Måldose 25 mg er over preparatomtalens område.',
      inndata: { startdose_mg: 15, maldose_mg: 25, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Måldosen 25 mg er utenfor/,
    },
    {
      id: 'aripiprazol-5-mg',
      beskrivelse: 'Aripiprazol 5 mg er under doseområdet ved schizofreni; regelen gjelder ikke.',
      inndata: { startdose_mg: 5, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Startdosen 5 mg er utenfor/,
    },
    {
      id: 'fluvoksamin',
      beskrivelse: 'Fluvoksamin samtidig: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten bruker fluvoksamin/,
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftet spesialistvurdering og tett oppfølging stopper beregningen.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ['indikasjon', 'peroral_formulering'], pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, langsom_omsetning: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten/,
    },
    {
      id: 'omsetning-ukjent',
      beskrivelse: 'Faktorene for langsom omsetning er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 15, maldose_mg: 10, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { alder_65: false, nedsatt_nyre_lever: false, cyp1a2_hemmer: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten har flere faktorer for langsommere omsetning/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til olanzapin i anbefalt startdose ved schizofreni (Zyprexa pkt. 4.2).',
    `${GJENNOMGANG} startdosen 10 mg og forskriverens valgte måldose 5–20 mg er atskilt, med en ny klinisk vurdering før endringen; tiden på startdosen er et åpent OUSFAR-valg.`,
  ),
}

const RISPERIDON_AVKREFTET = { alder_65: false, nedsatt_nyre_lever: false, risperidon_interaksjon: false }

const aripiprazolRisperidon: Regel = {
  id: 'antipsykotikabytte-aripiprazol-risperidon',
  versjon: 2,
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
          {
            type: 'opptrapping',
            trinn: [
              { mg: kilde(2, 'mg', 'bindende_krav', RISPERDAL.dose), dager: kilde(1, 'dager', 'veiledende_preferanse', RISPERDAL.dose) },
              { mg: kilde(4, 'mg', 'veiledende_preferanse', RISPERDAL.dose), dager: dagerForMaldose('risperidon', RISPERDAL.dose) },
            ],
          },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ],
        // Tabletter og smeltetabletter; miksturen har ingen dokumentert oppmåling i verktøyet.
        { formulering: 'tabletter eller smeltetabletter', legemiddelformer: ['53', '48'], vurderinger: [forMaldose(RISPERDAL.dose, RISPERDAL.maks)] },
      ),
    ],
  },
  inndata: [
    ARIPIPRAZOL_INNDATA,
    { navn: 'maldose', omrade: [0, 16], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.maks] } },
    // De fleste har effekt av 4–6 mg; over 10 mg er ikke bedre og gir mer ekstrapyramidale bivirkninger. Utenfor 4–6 mg må forskriveren begrunne valget.
    { navn: 'maldose', omrade: [4, 6], art: 'veiledende_preferanse', krever_begrunnelse: true, grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.dose, RISPERDAL.maks] } },
  ],
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
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      ...FRA_ARIPIPRAZOL_KILDETRO,
      utsagn('Ved schizofreni startes risperidon med 2 mg daglig og kan økes til 4 mg dag 2; deretter holdes dosen eller tilpasses. De fleste har effekt av 4–6 mg daglig.', RISPERDAL.dose),
      utsagn('Risperidon kan gis én eller to ganger daglig.', RISPERDAL.enEllerTo),
      utsagn('Eldre, nedsatt nyre- eller leverfunksjon og sterke CYP2D6-hemmere eller CYP3A4-induktorer krever andre doser eller en ny vurdering av doseringen.', RISPERDAL.eldre, RISPERDAL.nyreLever, RISPERDAL.interaksjoner),
    ],
    tilpasninger: [
      utsagn('Aripiprazol seponeres uten nedtrapping dagen før risperidon startes (siste dose dagen før dag 1).', KEKS.direkte, KEKS.fraAripiprazol),
      utsagn('Planen følger opptrappingen i preparatomtalen, 2 mg dag 1 og 4 mg fra dag 2. Startregimet og den terapeutiske måldosen er atskilt: forskriveren velger måldosen (høyst 16 mg), og en måldose utenfor 4–6 mg krever en skriftlig begrunnelse. Planen holder 4 mg til en ny vurdering og slutter på måldosen. Hvor lenge 4 mg holdes, er et åpent OUSFAR-valg (forslag: én uke). En langsommere opptrapping er en klinisk vurdering og beregnes ikke.', RISPERDAL.dose, RISPERDAL.maks),
      utsagn('Planen bruker risperidontabletter eller smeltetabletter; miksturen har ingen dokumentert oppmåling i verktøyet.'),
    ],
    forutsetninger: forutsetninger(
      'Pasienten bruker peroral aripiprazol 10–30 mg daglig (tabletter, smeltetabletter eller mikstur), det doseområdet preparatomtalen oppgir ved schizofreni. Aripiprazol bare stoppes, så dosen tolkes ikke som et antall tabletter.',
      'Indikasjonen er schizofreni; ved mani gjelder en annen dosering, og regelen passer ikke.',
      'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
    ),
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
      inndata: { startdose_mg: 15, maldose_mg: 6, startdato: '2026-12-07', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1 (07.12.2026): seponert'], til: ['dag 1 (07.12.2026): 2 mg', 'dag 2–8 (08.12.2026–14.12.2026): 4 mg', 'fra dag 9 (15.12.2026): 6 mg'] },
    },
    {
      id: 'fra-10-mg',
      beskrivelse: 'Aripiprazol 10 mg (laveste dose i området) til risperidon.',
      inndata: { startdose_mg: 10, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1: 2 mg', 'fra dag 2: 4 mg'] },
    },
    {
      id: 'maldose-8-begrunnet',
      beskrivelse: 'Måldose 8 mg med skriftlig begrunnelse.',
      inndata: { startdose_mg: 30, maldose_mg: 8, begrunnelse: 'Syntetisk eksempel: tidligere god effekt av 8 mg uten bivirkninger.', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: { fra: ['fra dag 1: seponert'], til: ['dag 1: 2 mg', 'dag 2–8: 4 mg', 'fra dag 9: 8 mg'] },
    },
    {
      id: 'maldose-8-uten-begrunnelse',
      beskrivelse: 'Måldose 8 mg uten begrunnelse stopper.',
      inndata: { startdose_mg: 30, maldose_mg: 8, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 8 mg .*krever en skriftlig begrunnelse/,
    },
    {
      id: 'maldose-over-16',
      beskrivelse: 'Måldose 20 mg er over det preparatomtalen anbefaler, også med begrunnelse.',
      inndata: { startdose_mg: 15, maldose_mg: 20, begrunnelse: 'Syntetisk eksempel.', bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Måldosen 20 mg er utenfor/,
    },
    {
      id: 'aripiprazol-over-30',
      beskrivelse: 'Aripiprazol 40 mg er over høyeste dose; regelen gjelder ikke.',
      inndata: { startdose_mg: 40, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 40 mg er utenfor/,
    },
    {
      id: 'eldre',
      beskrivelse: '65 år eller eldre: regelen gjelder ikke.',
      inndata: { startdose_mg: 15, maldose_mg: 4, bekreftet: ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...RISPERIDON_AVKREFTET, alder_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er 65 år eller eldre/,
    },
    {
      id: 'depot',
      beskrivelse: 'Uten bekreftelse av at aripiprazol er peroral (ikke Abilify Maintena) stopper beregningen.',
      inndata: { startdose_mg: 15, maldose_mg: 4, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: RISPERIDON_AVKREFTET },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten bruker peroral aripiprazol/,
    },
  ],
  godkjenning: tilKontroll(
    'Ny regel (K3): direkte bytte fra aripiprazol (Keks 2019) til risperidon med opptrappingen i preparatomtalen ved schizofreni (Risperdal pkt. 4.2).',
    `${GJENNOMGANG} startregimet og forskriverens valgte måldose (høyst 16 mg, utenfor 4–6 mg med begrunnelse) er atskilt, med en ny klinisk vurdering før endringen; tiden på 4 mg er et åpent OUSFAR-valg; også smeltetabletter.`,
  ),
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
  inndata: [{ navn: 'startdose', verdier: [1.5, 3, 4.5, 6], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [REAGILA.dose] } }],
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
      utsagn('Dagens dose må være en dose kapslene gir og opptrappingen i trinn på 1,5 mg når: 1,5, 3, 4,5 eller 6 mg. Andre doser stopper.', REAGILA.dose),
      utsagn('Planen følger opptrappingen ved schizofreni og slutter med 300 mg daglig fra dag 4, laveste anbefalte vedlikeholdsdose. Økning mot 450 mg eller en annen dose er en klinisk vurdering og beregnes ikke.', SPC.seroquel),
      utsagn('Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter. Hver døgndose gis fordelt på to doser; kan den ikke fordeles med tablettene, stopper planen.', SPC.seroquelToGanger),
    ],
    forutsetninger: forutsetninger('Pasienten bruker kariprazin 1,5, 3, 4,5 eller 6 mg daglig.', 'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.'),
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
      id: 'kariprazin-2-mg',
      beskrivelse: 'Kariprazin 2 mg er ingen dose kapslene gir (1,5, 3, 4,5 eller 6 mg).',
      inndata: { startdose_mg: 2, bekreftet: ['indikasjon', 'spesialist_risiko'], pasientforhold: KVETIAPIN_AVKREFTET },
      forventet: {},
      stopp: /Startdosen 2 mg er utenfor/,
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

/* --- Peroralt: olanzapin og risperidon → aripiprazol, kryss-titrering (TARC 2018) ---------- */

const TARC_STED = 'avsnittet om bytte hos stabile polikliniske pasienter med schizofreni (figur 1)'
const TARC = {
  opptrapping: h('tarc-2018', TARC_STED, 'Aripiprazol legges til den eksisterende behandlingen: 2,5–5 mg daglig den første uken, 5–10 mg daglig fra slutten av første uke og 10–15 mg daglig fra slutten av andre uke.'),
  overlapp: h('tarc-2018', TARC_STED, 'Når måldosen 10–15 mg er nådd, brukes aripiprazol og det forrige antipsykotikumet sammen i minst 2 uker.'),
  nedtrapping: h('tarc-2018', TARC_STED, 'Deretter trappes det forrige antipsykotikumet ned med 25 % av dosen, minst 2 uker mellom hver reduksjon, til det er stoppet; for eksempel 20 → 15 → 10 → 5 mg eller 4 → 3 → 2 → 1 mg og så stopp.'),
  hoyereDose: h('tarc-2018', TARC_STED, 'Trengs høyere dose, økes aripiprazol først til 15–20 mg i minst 2 uker og deretter eventuelt til 30 mg; vedlikehold er 10–30 mg daglig.'),
  pasienter: h('tarc-2018', TARC_STED, 'Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt av dagens behandling.'),
  andreGrupper: h('tarc-2018', 'avsnittene om gjentatte tilbakefall og om innlagte pasienter (figur 2 og 3)', 'Ved tidligere gjentatte psykotiske tilbakefall og hos innlagte anbefales en annen opptrapping, med høyere startdose og måldose.'),
  oppfolging: h('tarc-2018', 'avsnittet om vurdering før bytte', 'Før byttet vurderes pasienten grundig; under byttet følges pasienten tett med hyppige kontroller, og pasienten informeres om seponeringssymptomer, interaksjoner og mulig tilbakefall.'),
  sponsor: h('tarc-2018', 'erklæringen om interessekonflikter', 'Konsensusmøtet ble organisert og finansiert av et legemiddelfirma; forfatterne oppgir at anbefalingene er deres egne.'),
}

const ABILIFY = {
  interaksjoner: h('ema-abilify', 'section 4.2 og 4.5', 'Ved samtidig bruk av sterke CYP3A4- eller CYP2D6-hemmere skal aripiprazoldosen reduseres, og ved sterke CYP3A4-induktorer økes; dosen justeres igjen når legemidlet tas bort.'),
  eldre: h('ema-abilify', 'section 4.2 (eldre)', 'Effekt og sikkerhet ved schizofreni er ikke fastslått fra 65 år; lavere startdose bør vurderes når kliniske forhold tilsier det.'),
}

const TIL_ARIPIPRAZOL_BEKREFTET = ['indikasjon', 'peroral_formulering', 'spesialist_risiko']
const TIL_ARIPIPRAZOL_NEI = { tilbakefall_innlagt: false, alder_65: false, cyp_aripiprazol: false }

/** Det felles for bytte til aripiprazol: fra-stoffet holdes i 4 uker og trappes så ned med 25 % av startdosen minst hver 2. uke. */
function tilAripiprazol(a: {
  id: string
  fra: string
  fraNavn: string
  startdose: Inndatakrav
  fraKilder: Kildehenvisning[]
  referanse: string
  eksempler: Regel['eksempler']
  merknad: string
}): Regel {
  const ukedose = (verdi: number, omrade: [number, number], uke: string) =>
    forslag(verdi, 'mg', `Valgt innenfor TARC-området ${omrade.join('–').replace('.', ',')} mg ${uke}; forskriveren kan velge en annen dose i området.`, {
      omrade,
      justerbar: `Aripiprazol ${uke} (mg)`,
      henvisninger: [TARC.opptrapping],
    })
  return {
    id: a.id,
    versjon: 1,
    tittel: `Fra ${a.fraNavn} til aripiprazol, kryss-titrering`,
    fra: { type: 'virkestoff', nokkel: a.fra },
    til: { type: 'virkestoff', nokkel: 'aripiprazol' },
    plan: {
      form: 'kryssnedtrapping',
      forlop: [
        {
          id: 'fra',
          virkestoff: { type: 'virkestoff', nokkel: a.fra },
          administrasjon: 'peroral',
          utgangsdose: 'startdose',
          start: { type: 'dag', dag: 1 },
          faser: [
            { type: 'hold', dose: { type: 'aktuell' }, varighet: { type: 'dager', dager: kilde(28, 'dager', 'bindende_krav', TARC.opptrapping, TARC.overlapp) } },
            {
              type: 'nedtrapping',
              strategi: { type: 'prosent_av_startdose', prosent: kilde(25, 'prosent', 'bindende_krav', TARC.nedtrapping) },
              trinnlengde: { ...kilde(14, 'dager', 'bindende_krav', TARC.nedtrapping), omrade: [14, TEKNISK_MAKS_DAGER], justerbar: 'Minste antall dager per reduksjon', teknisk_maks: true },
            },
          ],
          vurderinger: [
            {
              id: 'for_reduksjon',
              nar: { type: 'for_hvert_trinn' },
              tekst: `Før hver reduksjon av ${a.fraNavn}: tilstanden vurderes, og pasienten følges tett gjennom hele byttet.`,
              grunnlag: { type: 'kilde', henvisninger: [TARC.oppfolging, KEKS.spesialist] },
            },
          ],
        },
        startes('aripiprazol', [
          { type: 'opptrapping', trinn: [
            { mg: ukedose(5, [2.5, 5], 'første uke'), dager: kilde(7, 'dager', 'bindende_krav', TARC.opptrapping) },
            { mg: ukedose(10, [5, 10], 'andre uke'), dager: kilde(7, 'dager', 'bindende_krav', TARC.opptrapping) },
          ] },
          { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
        ]),
      ],
    },
    inndata: [a.startdose, { navn: 'maldose', verdier: [10, 15], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [TARC.opptrapping, SPC.abilifyDose] } }],
    bekreftelser: [
      {
        id: 'indikasjon',
        tekst: `Pasienten er voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra ${a.fraNavn} på grunn av bivirkninger eller utilstrekkelig effekt.`,
        grunnlag: { type: 'kilde', henvisninger: [TARC.pasienter, SPC.abilifyDose] },
      },
      peroral(a.fraNavn),
      spesialist(),
    ],
    unntak: [
      {
        id: 'tilbakefall_innlagt',
        tekst: 'Pasienten har hatt gjentatte psykotiske tilbakefall, er innlagt eller er ikke stabil; kilden anbefaler da en annen opptrapping, som ikke er omfattet.',
        grunnlag: { type: 'kilde', henvisninger: [TARC.andreGrupper] },
      },
      ALDER_65('Pasienten er 65 år eller eldre; effekt og sikkerhet av aripiprazol er ikke fastslått i denne gruppen.', ABILIFY.eldre),
      {
        id: 'cyp_aripiprazol',
        tekst: 'Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer eller en sterk CYP3A4-induktor; aripiprazoldosen skal da justeres.',
        grunnlag: { type: 'kilde', henvisninger: [ABILIFY.interaksjoner] },
      },
    ],
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn('Aripiprazol legges til dagens behandling med 2,5–5 mg daglig første uke, 5–10 mg andre uke og 10–15 mg fra slutten av andre uke.', TARC.opptrapping),
        utsagn(`Når måldosen er nådd, brukes begge i minst 2 uker; deretter trappes ${a.fraNavn} ned med 25 % av dosen minst hver 2. uke til det er stoppet.`, TARC.overlapp, TARC.nedtrapping),
        utsagn('Opptrappingen gjelder stabile polikliniske pasienter som byttes på grunn av bivirkninger eller utilstrekkelig effekt; ved gjentatte tilbakefall og hos innlagte anbefales en annen.', TARC.pasienter, TARC.andreGrupper),
        utsagn('Under kryss-titrering trappes det første antipsykotikumet ned mens det neste innføres; de fleste psykiatere bruker denne strategien.', KEKS.kryss),
        utsagn('Pasienten følges tett under byttet, som bør vurderes av psykiater.', TARC.oppfolging, KEKS.spesialist),
        ...a.fraKilder.map((k) => utsagn(k.faktum ?? '', k)),
      ],
      tilpasninger: [
        utsagn('Aripiprazol foreslås som 5 mg den første uken og 10 mg den andre, øverst i kildens områder, fordi den laveste tablettstyrken i FEST er 5 mg og ikke er delbar; forskriveren kan velge 2,5 mg (mikstur) og 5–10 mg. Måldosen 10 eller 15 mg velges av forskriveren.', TARC.opptrapping),
        utsagn(`${a.fraNavn[0]!.toUpperCase()}${a.fraNavn.slice(1)} holdes uendret i 28 dager: 14 dagers opptrapping og 14 dager sammen med aripiprazol på måldosen. Første reduksjon er dag 29, og hver reduksjon står i minst 14 dager.`, TARC.opptrapping, TARC.overlapp, TARC.nedtrapping),
        utsagn('Hver reduksjon er 25 % av startdosen, så den siste dosen er en fjerdedel av den, og planen stopper når en dose ikke kan gis med tablettene i FEST.', TARC.nedtrapping),
      ],
      forutsetninger: forutsetninger(
        `Pasienten bruker peroral ${a.fraNavn} som eneste antipsykotikum, i en stabil dose.`,
        'Forskriveren har vurdert hvert unntak og svart nei; et ubesvart unntak stopper beregningen.',
      ),
      usikkerhet: [
        'Opptrappingen bygger på en konsensusrapport fra et ekspertpanel (lavt evidensnivå), og konsensusmøtet var finansiert av et legemiddelfirma. Rapporten nevner selv at raske bytter også er brukt i studier.',
        'Hvor lenge hvert trinn skal vare ut over minstetiden, og om nedtrappingen skal stoppes eller reverseres ved forverring, er en klinisk vurdering som ikke beregnes.',
        'Aripiprazol kan gi uro og akatisi tidlig; når dopaminblokkeringen fra det forrige stoffet avtar, kan symptomer komme tilbake, og det må følges.',
      ],
    },
    referanser: [pn(a.referanse)],
    eksempler: a.eksempler,
    godkjenning: tilKontroll(a.merknad),
  }
}

const olanzapinAripiprazol = tilAripiprazol({
  id: 'antipsykotikabytte-olanzapin-aripiprazol',
  fra: 'olanzapin',
  fraNavn: 'olanzapin',
  startdose: { navn: 'startdose', omrade: [5, 20], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.zyprexaDose] } },
  fraKilder: [SPC.zyprexaDose, SPC.zyprexaSeponering],
  referanse: 'SwitchAntipsychotics:Ol>Pa',
  eksempler: [
    {
      id: 'fra-20-mg-15',
      beskrivelse: 'Olanzapin 20 mg, aripiprazol til 15 mg, startdato 1. desember 2026.',
      inndata: { startdose_mg: 20, maldose_mg: 15, startdato: '2026-12-01', bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {
        fra: [
          'dag 1–28 (01.12.2026–28.12.2026): 20 mg',
          'dag 29–42 (29.12.2026–11.01.2027): 15 mg',
          'dag 43–56 (12.01.2027–25.01.2027): 10 mg',
          'dag 57–70 (26.01.2027–08.02.2027): 5 mg',
          'fra dag 71 (09.02.2027): seponert',
        ],
        til: ['dag 1–7 (01.12.2026–07.12.2026): 5 mg', 'dag 8–14 (08.12.2026–14.12.2026): 10 mg', 'fra dag 15 (15.12.2026): 15 mg'],
      },
    },
    {
      id: 'fra-10-mg-10',
      beskrivelse: 'Olanzapin 10 mg, aripiprazol til 10 mg.',
      inndata: { startdose_mg: 10, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 10 mg', 'dag 29–42: 7,5 mg', 'dag 43–56: 5 mg', 'dag 57–70: 2,5 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'fra dag 8: 10 mg'] },
    },
    {
      id: 'maldose-20',
      beskrivelse: 'Måldose 20 mg er over kildens område for dette bytte (10–15 mg).',
      inndata: { startdose_mg: 20, maldose_mg: 20, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Måldosen 20 mg er utenfor/,
    },
    {
      id: 'olanzapin-over-20',
      beskrivelse: 'Olanzapin 25 mg er over preparatomtalens doseområde.',
      inndata: { startdose_mg: 25, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 25 mg er utenfor/,
    },
    {
      id: 'tilbakefall-innlagt',
      beskrivelse: 'Gjentatte tilbakefall eller innlagt: en annen opptrapping, ikke omfattet.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...TIL_ARIPIPRAZOL_NEI, tilbakefall_innlagt: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten har hatt gjentatte psykotiske tilbakefall/,
    },
    {
      id: 'interaksjon-ukjent',
      beskrivelse: 'CYP-hemmere og -induktorer er ikke vurdert: ukjent stopper.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { tilbakefall_innlagt: false, alder_65: false } },
      forventet: {},
      stopp: /Må avklares før beregning \(ukjent\): Pasienten bruker en sterk CYP3A4- eller CYP2D6-hemmer/,
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftet spesialistvurdering stopper beregningen.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: ['indikasjon', 'peroral_formulering'], pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet er vurdert i, eller med råd fra, spesialisthelsetjenesten/,
    },
  ],
  merknad: 'Ny regel (K3, K0-07): kryss-titrering til aripiprazol etter TARC 2018 (stabile polikliniske pasienter), med nedtrapping av olanzapin til seponering.',
})

const risperidonAripiprazol = tilAripiprazol({
  id: 'antipsykotikabytte-risperidon-aripiprazol',
  fra: 'risperidon',
  fraNavn: 'risperidon',
  startdose: { navn: 'startdose', omrade: [0, 16], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [RISPERDAL.maks] } },
  fraKilder: [RISPERDAL.dose, RISPERDAL.maks],
  referanse: 'SwitchAntipsychotics:Rd>Pa',
  eksempler: [
    {
      id: 'fra-4-mg-15',
      beskrivelse: 'Risperidon 4 mg, aripiprazol til 15 mg.',
      inndata: { startdose_mg: 4, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 4 mg', 'dag 29–42: 3 mg', 'dag 43–56: 2 mg', 'dag 57–70: 1 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'dag 8–14: 10 mg', 'fra dag 15: 15 mg'] },
    },
    {
      id: 'fra-6-mg-10',
      beskrivelse: 'Risperidon 6 mg, aripiprazol til 10 mg.',
      inndata: { startdose_mg: 6, maldose_mg: 10, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: { fra: ['dag 1–28: 6 mg', 'dag 29–42: 4,5 mg', 'dag 43–56: 3 mg', 'dag 57–70: 1,5 mg', 'fra dag 71: seponert'], til: ['dag 1–7: 5 mg', 'fra dag 8: 10 mg'] },
    },
    {
      id: 'risperidon-over-16',
      beskrivelse: 'Risperidon 20 mg er over det preparatomtalen anbefaler.',
      inndata: { startdose_mg: 20, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Startdosen 20 mg er utenfor/,
    },
    {
      id: 'over-65',
      beskrivelse: '65 år eller eldre: regelen gjelder ikke.',
      inndata: { startdose_mg: 4, maldose_mg: 15, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: { ...TIL_ARIPIPRAZOL_NEI, alder_65: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Pasienten er 65 år eller eldre/,
    },
    {
      id: 'uten-maldose',
      beskrivelse: 'Uten valgt måldose (10 eller 15 mg) velger beregningen ikke selv.',
      inndata: { startdose_mg: 4, bekreftet: TIL_ARIPIPRAZOL_BEKREFTET, pasientforhold: TIL_ARIPIPRAZOL_NEI },
      forventet: {},
      stopp: /Måldosen må oppgis/,
    },
  ],
  merknad: 'Ny regel (K3, K0-08): kryss-titrering til aripiprazol etter TARC 2018 (stabile polikliniske pasienter), med nedtrapping av risperidon til seponering.',
})

/** FEST-uttrekket reglene testes ende til ende med (`npm run verktoy:regler -- hent-fest`). */
export const FEST_ANTIPSYKOTIKA = 'src/data/verktoy/fest-antipsykotika.json'

/* --- Settet ----------------------------------------------------------------------------- */

export const ANTIPSYKOTIKASETT: Regelsett = {
  id: 'ousfar-verktoy-antipsykotikabytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Byttereglene for antipsykotika i K3: komplette forløp til et definert sluttmål, bygget på preparatomtaler, Keks 2019 og TARC 2018. To depotrelaterte (Xeplion fra peroral risperidon og fra Risperdal Consta), tre perorale direkte bytter (aripiprazol til olanzapin og til risperidon, kariprazin til kvetiapin) og to kryss-titreringer til aripiprazol (fra olanzapin og fra risperidon, TARC 2018). Alle står til uavhengig faglig kontroll; ingen er klinisk godkjent.',
  regler: [risperidonXeplion, constaXeplion, aripiprazolOlanzapin, aripiprazolRisperidon, kariprazinKvetiapin, olanzapinAripiprazol, risperidonAripiprazol],
}

export const ANTIPSYKOTIKABYTTER: Domenesett = {
  sett: ANTIPSYKOTIKASETT,
  rapport: {
    fil: 'docs/verktøy-k3-antipsykotikabytter.md',
    tittel: 'K3: regler for bytte av antipsykotikum',
    notater: ['docs/verktøy-k3-antipsykotika.md', 'docs/verktøy-klinisk-leveranseplan-2026-11.md', 'docs/verktøy-p4-regelmodell.md'],
  },
}
