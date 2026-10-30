/**
 * Pilotsettet i P4 (`docs/verktøy-p4-regelmodell.md`): seks regler som
 * prøver regelmodellen på hver regelklasse planen prioriterer –
 * kryssnedtrapping, MAO-relatert utvasking, antipsykotikabytte med fast
 * opptrapping, gruppebasert bytte og to oppstarter med depot. Den gjentatt
 * prosentvise seponeringen av escitalopram er flyttet til nedtrappingsreglene
 * i P7 (`nedtrapping.ts`), og den hyperbolske seponeringen av citalopram til
 * sammenligningssettet der: den er ikke en valgbar klinisk strategi
 * (fagkontrollen 30.10.2026).
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
 * som ble endret etter første uavhengige kontroll (PR #282), eller fikk rettet
 * kildegrunnlaget for trinnlengden etter kontrollen av P7 (PR #286), har
 * versjon 2 og er sendt til kontroll på nytt.
 */
import { fluoksetinTrinn28, FORUTSETNINGER_FELLES, forslag, h, halvering, kilde, minst14, NICE, planhorisont, pn, RCPSYCH, steg, trinn14, utsagn } from './bygg'
import type { Bekreftelse, Godkjenning, Godkjenningssteg, Regel, Regelsett, Sporsmal, Unntak } from './modell'
import { REGELMODELLVERSJON } from './modell'

/* --- Godkjenning ------------------------------------------------------------------ */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold og regneeksempler (P4.8). Ikke klinisk godkjent.'

/** Historikken for en pilotregel: versjon 1 til kontroll, og én ny versjon til kontroll på nytt for hver retting etter en kontroll. */
function tilKontroll(...rettinger: { merknad: string; dato?: string }[]): Godkjenning {
  const versjoner = [{ merknad: 'Utkast til pilotregel (P4.7).' }, ...rettinger]
  return { status: 'til_faglig_kontroll', historikk: versjoner.flatMap((v, i) => [steg('utkast', i + 1, v.merknad, v.dato), steg('til_faglig_kontroll', i + 1, TIL_KONTROLL, v.dato)]) }
}

/** Tar en regel ut av verktøyet: en ny versjon som utkast i sammenligningssettet, ikke til klinisk kontroll. */
const utAvVerktoyet = (g: Godkjenning, versjon: number, merknad = UT_AV_VERKTOYET): Godkjenning => ({ status: 'utkast', historikk: [...g.historikk, steg('utkast', versjon, merknad, '2026-10-30')] })

/** Kontrollørens beslutning P4-A 30.10.2026: gruppebyttet er ikke en klinisk beregnbar regel. */
const GRUPPEBYTTE_SPERRET =
  'Tatt ut av verktøyet etter kontrollørens beslutning P4-A 30.10.2026: ikke godkjent som klinisk beregnbar gruppebytteregel, heller ikke en generisk første uke med aripiprazol 10 mg for ulike antipsykotika. Beholdes bare som sperret modelleringsdemonstrasjon i utviklingssettet; en eventuell regel for zuklopentiksol lages for seg.'

const etterPilotkontrollen = (rettet: string) => ({ merknad: `Rettet etter første uavhengige kontroll (PR #282): ${rettet}` })

/** Trinnlengden i v1 viste til NICEs én til to uker, som gjelder fluoksetin; kildegrunnlaget er rettet etter kontrollen av P7. */
const TRINNLENGDE_RETTET = {
  merknad: 'Kildegrunnlaget for trinnlengden er rettet etter kontrollen av P7 (PR #286): NICEs én til to uker gjelder fluoksetin, så forslaget bygger nå på RCPsychs to til fire uker.',
}

/** Fagvurderingen av P7 29.10.2026 avviste automatisk seponering: en seponeringsregel stopper før nulltrinnet. */
const UTEN_NULLTRINN = {
  merknad: 'Rettet etter fagvurderingen av P7 29.10.2026: ingen automatisk seponering. Planen tar ikke trinnet til null; siste dose fortsetter, og avslutningen vurderes individuelt.',
  dato: '2026-10-29',
}

/** Kontrollrunden 30.10.2026 (P4.8): byttereglene ble ikke godkjent som de sto, og er rettet eller avgrenset. */
const RUNDE_4 = '2026-10-30'
const etterKontrollrunden = (rettet: string) => ({ merknad: `Rettet etter kontrollrunden 30.10.2026 (P4.8): ${rettet}`, dato: RUNDE_4 })
/** Gjennomgangen av de rettede versjonene samme dag: ingen beregnet del uten et substansspesifikt, kontrollert forløp. */
const etterGjennomgangen = (rettet: string) => ({ merknad: `Rettet etter gjennomgangen av de rettede versjonene 30.10.2026 (P4.8): ${rettet}`, dato: RUNDE_4 })

/** Kontrollørens beslutninger 30.10.2026 om byttene og depotreglene (P4-A og P4-B); ingen av dem er en klinisk godkjenning. */
const RUNDE_5 = '2026-10-30'
const etterBeslutningene = (rettet: string) => ({ merknad: `Rettet etter kontrollørens beslutninger 30.10.2026 (P4.8): ${rettet}`, dato: RUNDE_5 })
/** Rettet etter kontrollørens gjennomgang av de rettede versjonene (HEAD fe08fac, 30.10.2026). */
const etterGjennomgangenAvFe08fac = (rettet: string) => ({ merknad: `Rettet etter kontrollørens gjennomgang av fe08fac 30.10.2026 (P4.8): ${rettet}`, dato: RUNDE_5 })

/** Kontrollørens gjennomgang av HEAD 62ebb21 30.10.2026 (P4.8). */
const RUNDE_6 = '2026-10-30'
const KONTROLLOR = 'ChatGPT (uavhengig fagkontrollør)'
const kontrollorsteg = (status: Godkjenningssteg['status'], regelversjon: number, merknad: string, fingeravtrykk?: string): Godkjenningssteg => ({
  status,
  dato: RUNDE_6,
  av: KONTROLLOR,
  rolle: 'uavhengig_kontrollor',
  regelversjon,
  ...(fingeravtrykk && { fingeravtrykk }),
  merknad: `Kontrollørens gjennomgang av 62ebb21 30.10.2026 (P4.8): ${merknad}`,
})

/**
 * Kontrollørens avgrensede kliniske godkjenning av nøyaktig regelversjonen
 * kontrolløren kontrollerte i HEAD 62ebb21, med fingeravtrykket for den
 * versjonen (oppgitt i PR-kommentaren til kontrollen). OUSFAR Dev setter
 * aldri en klinisk godkjenning selv, og godkjenningen faller bort når regelen
 * endres.
 */
const avgrensetGodkjent = (g: Godkjenning, versjon: number, fingeravtrykk: string, avgrensning: string): Godkjenning => ({
  status: 'klinisk_godkjent',
  historikk: [...g.historikk, kontrollorsteg('klinisk_godkjent', versjon, `faglig akseptert og klinisk godkjent bare for nøyaktig denne avgrensede situasjonen: ${avgrensning}`, fingeravtrykk)],
})

/** Kontrollørens avgrensning av hva en regelversjon kan godkjennes som; regelen står fortsatt til kontroll og er ikke godkjent. */
const medKontrollorsavgrensning = (g: Godkjenning, versjon: number, avgrensning: string): Godkjenning => ({
  status: g.status,
  historikk: [...g.historikk, kontrollorsteg('til_faglig_kontroll', versjon, avgrensning)],
})

/** En ny versjon til kontroll etter en historikk som allerede har steg for den forrige. */
const nyVersjon = (g: Godkjenning, versjon: number, v: { merknad: string; dato: string }): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [...g.historikk, steg('utkast', versjon, v.merknad, v.dato), steg('til_faglig_kontroll', versjon, TIL_KONTROLL, v.dato)],
})

/**
 * Depotreglene ble funnet kildemessig akseptable som avgrensede varianter i
 * kontrollrunden 30.10.2026. Det er ikke en klinisk godkjenning: regelen står
 * til faglig kontroll, uendret, til siste kontroll av preparatomtalen og
 * regneeksemplene er gjort.
 */
const kildemessigAkseptabel = (g: Godkjenning, versjon: number, avgrensning: string): Godkjenning => ({
  ...g,
  historikk: [
    ...g.historikk,
    steg(
      'til_faglig_kontroll',
      versjon,
      `Kontrollrunden 30.10.2026 (P4.8): kildemessig akseptabel som ${avgrensning}. Ikke klinisk godkjent; gjenstår er en siste kontroll av gjeldende preparatomtale, doser og enheter, injeksjonsvinduer og regneeksempler, og en signert godkjenning av nøyaktig denne versjonen.`,
      RUNDE_4,
    ),
  ],
})

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

export const SPC = {
  cipralexDose: h('dmp-cipralex', 'pkt. 4.2', 'Dosene som oppgis er 5–20 mg daglig; sikkerheten over 20 mg daglig er ikke vist.'),
  cipralexSeponering: h('dmp-cipralex', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere.'),
  cipramilDose: h('dmp-cipramil', 'pkt. 4.2', 'Anbefalt dose er 20 mg daglig, maksimalt 40 mg; ved panikklidelse startes det med 10 mg.'),
  cipramilSeponering: h('dmp-cipramil', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Ved utålelige symptomer kan man gå tilbake til forrige dose og trappe ned langsommere.'),
  zoloftDose: h('dmp-zoloft', 'pkt. 4.2', 'Startdose 50 mg daglig (25 mg ved enkelte angstlidelser); økning i trinn på 50 mg til maksimalt 200 mg daglig.'),
  zoloftSeponering: h('dmp-zoloft', 'pkt. 4.2 og 4.4', 'Dosen reduseres gradvis over minst én til to uker; noen trenger nedtrapping over flere uker eller måneder.'),
  remeronDose: h('dmp-remeron', 'pkt. 4.2', 'Effektiv døgndose er vanligvis 15–45 mg; startdosen er 15 eller 30 mg. Behandlingen avsluttes gradvis.'),
  fluoksetinDose: h('dmp-fluoxetin', 'pkt. 4.2', 'Anbefalt dose ved depresjon er 20 mg daglig, maksimalt 60 mg.'),
  fluoksetinSeponering: h('dmp-fluoxetin', 'pkt. 4.2', 'Brå seponering bør unngås; dosen reduseres gradvis over minst én til to uker. Aktivt stoff finnes i kroppen i flere uker etter seponering.'),
  fluoksetinMao: h('dmp-fluoxetin', 'pkt. 4.3 og 4.5', 'Kontraindisert sammen med irreversibel, ikke-selektiv MAO-hemmer; det skal gå minst 5 uker etter seponering av fluoksetin før en slik MAO-hemmer startes.'),
  nardilKontra: h(
    'emc-nardil',
    'section 4.3 og 4.5',
    'Preparatomtalen har viktige kontraindikasjoner og interaksjoner, blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.',
  ),
  nardilSsri: h('emc-nardil', 'section 4.5', 'Fenelzin brukes ikke sammen med serotoninreopptakshemmere; det må gå lang nok tid til at de og metabolittene er skilt ut, for eksempel 5 uker etter fluoksetin.'),
  seroquel: h('dmp-seroquel', 'pkt. 4.2', 'Schizofreni: døgndose 50, 100, 200 og 300 mg dag 1–4; fra dag 4 anbefales 300–450 mg daglig, individuelt innenfor 150–750 mg.'),
  seroquelToGanger: h('dmp-seroquel', 'pkt. 4.2', 'Tablettene med vanlig frisetting tas to ganger daglig; ved schizofreni gjelder døgndosene dag 1–4 og vedlikeholdsdosen fordelt på to doser.'),
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

/** Bekreftelse av at pasienten bruker en peroral formulering, når samme virkestoff også finnes som depot. */
const perorFormulering = (tekst: string): Bekreftelse => ({ id: 'peroral_formulering', tekst, grunnlag: { type: 'kilde', henvisninger: [KEKS19.depot] } })

/* --- Reglene ------------------------------------------------------------------------------- */

/** Fagkontrollen 30.10.2026 (beslutning 5.8): den hyperbolske regelen er ikke en valgbar klinisk strategi. */
const UT_AV_VERKTOYET =
  'Tatt ut av verktøyet etter fagkontrollen 30.10.2026 (beslutning 5.8): ikke godkjent som valgbar klinisk strategi. Beholdes bare i sammenlignings- og utviklingssettet, med teknisk planhorisont som de andre planene uten nulltrinn.'

/**
 * Den hyperbolske seponeringen av citalopram (B2). Ikke i verktøyet: bare i
 * sammenligningssettet i `nedtrapping.ts`, som ikke er klinisk.
 */
export const seponeringCitalopramHyperbolsk: Regel = {
  id: 'seponering-citalopram-hyperbolsk',
  versjon: 4,
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
            trinnlengde: trinn14('Nedre del av RCPsychs to til fire uker mellom reduksjonene; en minstetid.'),
            avslutning: 'individuell',
            horisont: planhorisont(),
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
        'Beregnet binding relativt til maksimum, f = D / (3,4 + D), senkes i åtte like store trinn fra startdosen mot null, og dosen er D = 3,4 · f / (1 − f). Maksimal binding går ut av regnestykket. Antall trinn og 14 dager per trinn er OUSFARs forslag.',
        LITTERATUR.ed50,
        LITTERATUR.horowitz,
      ),
      utsagn('Strategien er ikke en valgbar klinisk strategi (fagkontrollen 30.10.2026); den regnes bare ut til sammenligning med gjentatt prosentvis nedtrapping (B2).'),
      utsagn('Planen tar ikke det åttende trinnet til null: ingen avslutning er godkjent etter fagvurderingen av P7, så siste dose fortsetter til avslutningen er vurdert individuelt. Trinnlengden er en minstetid.'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'ED50 fra PET-studier av SERT-binding gjelder pasienten tilnærmet.'],
    usikkerhet: [
      'Bindingskurven bygger på få og små studier med ulike metoder; at like trinn i binding gir mindre seponeringssymptomer, er ikke vist i kontrollerte studier av denne planen.',
      'De siste dosene (under 1 mg) krever flytende form; om det finnes, avgjøres i P5.',
      'Flere trinn er ikke automatisk bedre (P4.6): fra 20 mg tar de sju trinnene før null 12 uker.',
      'Fagkontrollen 30.10.2026 godkjente ikke strategien som valgbar i verktøyet (B2). Om den senere skal vurderes klinisk, er et eget utviklingsspørsmål, adskilt fra P7.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Ci>Stop')],
  eksempler: [
    {
      id: 'fra-20-mg',
      beskrivelse: 'Fra 20 mg: like trinn i beregnet binding (85,5 % av maksimum ved 20 mg), uten det åttende trinnet til null.',
      inndata: { startdose_mg: 20 },
      forventet: {
        fra: ['dag 1–14: 10,08 mg', 'dag 15–28: 6,07 mg', 'dag 29–42: 3,9 mg', 'dag 43–56: 2,54 mg', 'dag 57–70: 1,6 mg', 'dag 71–84: 0,92 mg', 'fra dag 85: 0,41 mg', 'siste trinn før null; avslutning vurderes individuelt'],
      },
    },
  ],
  godkjenning: utAvVerktoyet(tilKontroll(TRINNLENGDE_RETTET, UTEN_NULLTRINN), 4),
}

/** Svarene som lar kryssnedtrappingen beregnes: toleransen følges, ingen tidligere seponeringssymptomer, kort behandlingstid. */
const KRYSS_BESVART = { bekreftet: ['toleranse_overlapp'], pasientforhold: { tidligere_seponeringssymptomer: false }, svar: { lang_behandlingstid: false } }

const kryssSertralinMirtazapin: Regel = {
  id: 'kryssnedtrapping-sertralin-mirtazapin',
  versjon: 5,
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
            strategi: halvering(forslag(25, 'mg', 'Laveste startdose i preparatomtalen; her stopper beregningen, og seponeringen derfra planlegges individuelt.', { henvisninger: [SPC.zoloftDose] })),
            trinnlengde: trinn14('NICE åpner for raskere nedtrapping ved bytte; OUSFAR foreslår likevel 14 dager.', { omrade: [7, 14], henvisninger: [NICE.bytte] }),
            avslutning: 'individuell',
            horisont: forslag(3, 'trinn', 'Teknisk planhorisont: halvering fra høyeste startdose (200 mg) når 25 mg på tre reduksjoner; beregningen stopper uansett ved 25 mg.'),
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
          { type: 'vedlikehold', dose: { type: 'aktuell' } },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [50, 200], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [SPC.zoloftDose] } }],
  bekreftelser: [
    {
      id: 'toleranse_overlapp',
      tekst:
        'Toleransen vurderes før hver reduksjon av sertralin: dagene er minstetider, og neste reduksjon gjøres først når eventuelle seponeringssymptomer er borte eller tålelige. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning.',
      grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, RCPSYCH.tid, NICE.kombinasjon] },
    },
  ],
  unntak: [
    {
      id: 'tidligere_seponeringssymptomer',
      tekst: 'Et tidligere forsøk på å trappe ned eller seponere sertralin har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn.',
      grunnlag: { type: 'kilde', henvisninger: [NICE.tidligere, RCPSYCH.langvarig] },
    },
  ] satisfies Unntak[],
  sporsmal: [
    {
      id: 'lang_behandlingstid',
      tekst: 'Har pasienten brukt sertralin i mange måneder eller lenger?',
      ja: 'lang behandlingstid',
      krever_begrunnelse: true,
      grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.langvarig, NICE.bytte] },
    },
  ] satisfies Sporsmal[],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Sertralin trappes ned gradvis over minst én til to uker.', SPC.zoloftSeponering),
      utsagn('Ved kryssnedtrapping startes det nye antidepressivet mens det første trappes ned.', KEKS16.metoder),
      utsagn('Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.', NICE.kombinasjon),
      utsagn('Mirtazapin startes med 15 eller 30 mg; effektiv dose er 15–45 mg.', SPC.remeronDose),
    ],
    tilpasninger: [
      utsagn('OUSFAR halverer sertralin hver 14. dag ned til 25 mg og starter mirtazapin 15 mg dag 1.', NICE.andel, SPC.remeronDose),
      utsagn(
        'Seponeringen av sertralin fra 25 mg beregnes ikke, og heller ikke økningen av mirtazapin til måldosen: begge planlegges individuelt ut fra toleransen (kontrollrunden 30.10.2026). Mirtazapin holdes på 15 mg til da.',
        NICE.tempo,
        SPC.remeronDose,
      ),
      utsagn(
        'At dette er et bytte, kan begrunne raskere nedtrapping enn ved seponering, men ikke samme tempo for alle (kontrollrunden 30.10.2026). Etter tidligere seponeringssymptomer stopper regelen; ved lang behandlingstid krever halvering hver 14. dag en skriftlig begrunnelse, ellers planlegges byttet individuelt.',
        NICE.bytte,
        NICE.tidligere,
        RCPSYCH.langvarig,
      ),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Pasienten har ikke andre serotonerge legemidler som gjør overlappen mer risikofylt.'],
    usikkerhet: [
      'Ved samtidig bruk kan serotonerge bivirkninger øke; overlappens lengde er OUSFARs valg.',
      'NICE åpner for raskere nedtrapping ved bytte; 14 dager per trinn kan være lengre enn nødvendig.',
      'Om og når siste sertralindose seponeres, er forskriverens individuelle valg (kontrollørens beslutning P4-A 30.10.2026); regelen beregner det ikke, og det er ikke et åpent spørsmål for beregningen.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Se>Mz')],
  eksempler: [
    {
      id: 'fra-100-mg',
      beskrivelse: 'Sertralin 100 mg til mirtazapin: halvering til 25 mg; seponeringen derfra og måldosen for mirtazapin planlegges individuelt.',
      inndata: { startdose_mg: 100, ...KRYSS_BESVART },
      forventet: { fra: ['dag 1–14: 50 mg', 'fra dag 15: 25 mg', 'siste trinn før null; avslutning vurderes individuelt'], til: ['fra dag 1: 15 mg', 'holdes til sertralin er avsluttet; videre dosering planlegges individuelt'] },
    },
    {
      id: 'fra-50-mg',
      beskrivelse: 'Sertralin 50 mg til mirtazapin: én reduksjon til 25 mg, som fortsetter til avslutningen er vurdert.',
      inndata: { startdose_mg: 50, ...KRYSS_BESVART },
      forventet: { fra: ['fra dag 1: 25 mg', 'siste trinn før null; avslutning vurderes individuelt'], til: ['fra dag 1: 15 mg', 'holdes til sertralin er avsluttet; videre dosering planlegges individuelt'] },
    },
    {
      id: 'tidligere-seponeringssymptomer',
      beskrivelse: 'Etter seponeringssymptomer ved et tidligere forsøk gjelder ikke regelen; byttet planlegges individuelt.',
      inndata: { startdose_mg: 100, ...KRYSS_BESVART, pasientforhold: { tidligere_seponeringssymptomer: true } },
      forventet: {},
      stopp: /Regelen gjelder ikke: Et tidligere forsøk på å trappe ned eller seponere sertralin/,
    },
    {
      id: 'lang-behandlingstid',
      beskrivelse: 'Ved lang behandlingstid krever den faste halveringen en skriftlig begrunnelse.',
      inndata: { startdose_mg: 100, ...KRYSS_BESVART, svar: { lang_behandlingstid: true } },
      forventet: {},
      stopp: /Svaret ja \(lang behandlingstid\) krever en skriftlig begrunnelse/,
    },
  ],
  godkjenning: tilKontroll(
    TRINNLENGDE_RETTET,
    etterKontrollrunden('tidligere seponeringssymptomer stopper regelen, lang behandlingstid krever begrunnelse, og toleransen og overlappen må følges før hver reduksjon.'),
    etterGjennomgangen('beregningen stopper ved 25 mg sertralin; seponeringen derfra og måldosen for mirtazapin planlegges individuelt.'),
    etterBeslutningene('godtatt bare som avgrenset innledende plan (ned til en positiv sertralindose, mirtazapin 15 mg samtidig), uten automatisk seponering eller måldose for mirtazapin; om og når siste sertralindose seponeres, er forskriverens individuelle valg.'),
  ),
}

const maoFluoksetinFenelzin: Regel = {
  id: 'mao-fluoksetin-fenelzin',
  versjon: 7,
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
            trinnlengde: fluoksetinTrinn28(),
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
            grunn:
              'Fenelzin startes ikke automatisk: dagen planen viser, er den tidligste etter minimum 35 dagers utvasking, ikke en anbefalt startdag. Senere oppstart kan være nødvendig etter høy dose eller lang behandling med fluoksetin, ved interaksjoner og etter klinisk vurdering. Fenelzin har ingen norsk preparatomtale (bare godkjenningsfritak); startdose og opptrapping vurderes i spesialisthelsetjenesten. Før en eventuell oppstart må fenelzins kontraindikasjoner og interaksjoner kontrolleres klinisk (den britiske preparatomtalen, pkt. 4.3 og 4.5), blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.',
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
      utsagn('Den britiske preparatomtalen for fenelzin sier at det må gå lang nok tid til at fluoksetin er skilt ut, med 5 uker som eksempel; den gir ikke et eget minimum. Minimumet på 35 dager kommer fra preparatomtalen for fluoksetin.', SPC.nardilSsri),
      utsagn('Fenelzin har viktige kontraindikasjoner og interaksjoner, blant annet ved hjertesvikt, cerebrovaskulær sykdom og leversykdom, og med serotonerge legemidler, sympatomimetika, enkelte opioider og tyramin.', SPC.nardilKontra),
      utsagn('Litteraturen anbefaler 5–6 ukers utvasking, og at MAO-hemmeren startes forsiktig i lav dose.', KEKS16.fluoksetinMao),
      utsagn('Fluoksetin trappes ned gradvis over minst én til to uker.', SPC.fluoksetinSeponering),
      utsagn('Seponeringssymptomer kan komme dager til uker etter en reduksjon av fluoksetin; det er best å vente minst fire uker før neste.', RCPSYCH.fluoksetin),
      utsagn('Bytte til en MAO-hemmer skal skje i, eller med råd fra, spesialisthelsetjenesten.', NICE.mao),
    ],
    tilpasninger: [
      utsagn('OUSFAR halverer fluoksetin hver 28. dag ned til 10 mg og seponerer deretter. Utvaskingen på 35 dager regnes fra første dag uten fluoksetin; fenelzin kan tidligst startes dagen etter.', SPC.fluoksetinMao),
      utsagn('Startdosen for fenelzin beregnes ikke, fordi det ikke finnes en norsk preparatomtale å bygge den på.'),
      utsagn(
        'Utvaskingen på 35 dager er et minimum, ikke en fast tidsplan: fenelzin startes ikke automatisk på dagen planen viser (kontrollrunden 30.10.2026). Nedtrappingen av fluoksetin er godtatt bare som minimum for utvaskingen, ikke som et klinisk godkjent fast forløp.',
        SPC.fluoksetinMao,
        KEKS16.fluoksetinMao,
      ),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Fenelzin er en irreversibel, ikke-selektiv MAO-hemmer, så utvaskingskravet for slike gjelder.'],
    usikkerhet: [
      'Kildene er ikke enige om nedtrappingen: preparatomtalen sier gradvis over minst én til to uker, NICE nevner dosering annenhver dag ved 20 mg, og Keks mfl. seponerer uten nedtrapping ved 40 mg daglig eller mindre. Regelen følger preparatomtalen; valget må avklares faglig.',
      'Ved høye doser og lang behandling kan 6 uker være tryggere enn 5; regelen bruker minimum fra preparatomtalen.',
      'Utvaskingen gjør at pasienten er uten antidepressiv i minst fem uker; risikoen for tilbakefall må vurderes individuelt.',
      'Fenelzindelen er utvaskingsinformasjon, ikke en oppstartsplan (kontrollørens beslutning P4-A 30.10.2026): verktøyet kontrollerer ikke fenelzins kontraindikasjoner og interaksjoner, så de står framhevet i planen og må kontrolleres klinisk ved en eventuell oppstart.',
    ],
  },
  referanser: [pn('SwitchAntidepressants:Fo>Fe')],
  eksempler: [
    {
      id: 'fra-40-mg',
      beskrivelse: 'Fluoksetin 40 mg: to reduksjoner med 28 dager per trinn og 35 dager utvasking; dag 92 er tidligste dag en oppstart av fenelzin kan vurderes, ikke en oppstart.',
      inndata: { startdose_mg: 40, bekreftet: ['spesialisthelsetjeneste'] },
      forventet: { fra: ['dag 1–28: 20 mg', 'dag 29–56: 10 mg', 'fra dag 57: seponert'], til: ['tidligst dag 92: 35 dagers utvasking fullført; fenelzin er ikke startet eller dosert av planen. Klinisk oppstart kan først vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold'] },
    },
    {
      id: 'fra-20-mg',
      beskrivelse: 'Fluoksetin 20 mg: én reduksjon; dag 64 er tidligste dag en oppstart av fenelzin kan vurderes.',
      inndata: { startdose_mg: 20, bekreftet: ['spesialisthelsetjeneste'] },
      forventet: { fra: ['dag 1–28: 10 mg', 'fra dag 29: seponert'], til: ['tidligst dag 64: 35 dagers utvasking fullført; fenelzin er ikke startet eller dosert av planen. Klinisk oppstart kan først vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold'] },
    },
    {
      id: 'uten-spesialist',
      beskrivelse: 'Uten bekreftelse om spesialisthelsetjenesten stopper beregningen.',
      inndata: { startdose_mg: 40 },
      forventet: {},
      stopp: /Må bekreftes før beregning: Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten/,
    },
  ],
  godkjenning: medKontrollorsavgrensning(
    tilKontroll(
      TRINNLENGDE_RETTET,
      etterKontrollrunden('fenelzin startes ikke automatisk på dagen planen viser; utvaskingen er et minimum, og senere oppstart kan være nødvendig.'),
      etterGjennomgangen('den britiske preparatomtalen for fenelzin (pkt. 4.5) er lagt til som kilde for minimum 5 uker etter fluoksetin.'),
      etterGjennomgangen('den britiske preparatomtalen for fenelzin gir 5 uker etter fluoksetin som eksempel, ikke som eget minimum; minimumet på 35 dager bygger på preparatomtalen for fluoksetin.'),
      etterBeslutningene('35 døgn uten fluoksetin er godtatt bare som kildebasert tidligste utvasking, ikke en anbefalt startdato; fenelzin startes og doseres ikke, og fenelzins kontraindikasjoner og interaksjoner (den britiske preparatomtalen, pkt. 4.3 og 4.5) står framhevet i planen.'),
      etterGjennomgangenAvFe08fac('planlinjen for fenelzin sier ikke lenger «oppstart», men at utvaskingen er fullført, at fenelzin ikke er startet eller dosert av planen, og at klinisk oppstart først kan vurderes etter kontroll av kontraindikasjoner, interaksjoner og øvrige forhold.'),
    ),
    7,
    'akseptert bare som kildebasert utvaskingsinformasjon (35 dager etter siste fluoksetindose som minimum, fenelzin ikke startet eller dosert av planen), ikke som en klinisk godkjent fast nedtrapping av fluoksetin. Regelen kan derfor ikke godkjennes som en samlet klinisk doseplan; den står som modell. En godkjennbar regel må skille utvaskingen fra nedtrappingen, for eksempel med bekreftet dato for siste fluoksetindose som inndata.',
  ),
}

/**
 * Bekreftelsen i byttene mellom antipsykotika etter kontrollrunden 30.10.2026:
 * en fast plan for alle er ikke validert, så byttet må vurderes og tilpasses
 * klinisk.
 */
const VURDERT_AP: Bekreftelse = {
  id: 'spesialist_risiko',
  tekst:
    'Byttet gjøres i, eller med råd fra, spesialisthelsetjenesten, og indikasjonen, risikoen for tilbakefall og tempoet er vurdert. Byttet tilpasses toleransen og symptomene; sedasjon, ortostatisk blodtrykksfall, akatisi og forverring følges.',
  grunnlag: {
    type: 'ousfar_vurdering',
    begrunnelse: 'Kontrollrunden 30.10.2026 fant at ingen fast byttemodell er validert for alle pasienter: redusert antipsykotisk dekning kan gi tilbakefall, og overlapp kan gi sedasjon og ortostase.',
    henvisninger: [KEKS19.kryss],
    avklaring: null,
  },
}

const BEKREFTET_AP = ['indikasjon', 'peroral_formulering', VURDERT_AP.id]

const antipsykotikabytteOlanzapinKvetiapin: Regel = {
  id: 'antipsykotikabytte-olanzapin-kvetiapin',
  versjon: 5,
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
            type: 'uten_beregning',
            grunn:
              'Nedtrappingen av olanzapin beregnes ikke: et fast skjema er ikke validert (kontrollrunden 30.10.2026). Den planlegges i, eller med råd fra, spesialisthelsetjenesten og tilpasses toleransen og symptomene; olanzapin seponeres ikke brått.',
          },
        ],
      },
      {
        id: 'til',
        virkestoff: { type: 'virkestoff', nokkel: 'kvetiapin' },
        administrasjon: 'peroral',
        formulering: 'vanlig frisetting',
        // Bare tabletter med vanlig frisetting (FEST-form 53), aldri depottabletter, også ved eksplisitt formvalg.
        legemiddelformer: ['53'],
        fordeling: { antall: [2], grunnlag: { type: 'kilde', henvisninger: [SPC.seroquelToGanger] } },
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
    VURDERT_AP,
  ],
  unntak: [],
  beregnbarhet: 'beregnbar_etter_avklaring',
  fortolkning: {
    kildetro: [
      utsagn('Kvetiapin (vanlig frisetting) trappes opp med 50, 100, 200 og 300 mg de fire første dagene ved schizofreni, deretter 300–450 mg daglig.', SPC.seroquel),
      utsagn('Tablettene med vanlig frisetting tas to ganger daglig.', SPC.seroquelToGanger),
      utsagn('Ved kryss-titrering trappes det første antipsykotikumet ned mens det andre innføres, uten opphold.', KEKS19.kryss),
      utsagn('Gradvis nedtrapping av olanzapin bør vurderes.', SPC.zyprexaSeponering),
    ],
    tilpasninger: [
      utsagn('OUSFAR holder olanzapin uendret til kvetiapin er på 300 mg (dag 4). Nedtrappingen av olanzapin deretter beregnes ikke, men planlegges individuelt (kontrollrunden 30.10.2026).', SPC.seroquel, KEKS19.kryss),
      utsagn('Regelen gjelder bare måldoser i det anbefalte vedlikeholdsområdet 300–450 mg; andre måldoser krever individuell vurdering.', SPC.seroquel),
      utsagn('Planen bruker bare tabletter med vanlig frisetting i FEST, aldri depottabletter, som har en annen opptrapping og vanligvis gis én gang daglig. Hver døgndose, også vedlikeholdsdosen, gis fordelt på to doser som kan settes sammen av tablettene; kan den ikke det, stopper planen.', SPC.seroquelToGanger),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES, 'Kvetiapin gis som tabletter med vanlig frisetting, to ganger daglig; planen viser døgndosen og fordelingen.'],
    usikkerhet: [
      'Kildene oppgir ingen varighet for nedtrappingen av olanzapin; den faste nedtrappingen med 25 % av startdosen per uke i versjon 2 var OUSFARs valg og er tatt ut.',
      'Sedasjon og ortostatisk blodtrykksfall kan øke mens begge brukes; det må følges klinisk.',
      'Opptrappingen av kvetiapin bygger på preparatomtalen, men validerer ikke kryssbyttet som helhet (kontrollørens beslutning P4-A 30.10.2026).',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:Ol>Qu')],
  eksempler: [
    {
      id: 'fra-20-mg',
      beskrivelse: 'Olanzapin 20 mg til kvetiapin 300 mg.',
      inndata: { startdose_mg: 20, maldose_mg: 300, bekreftet: BEKREFTET_AP },
      forventet: {
        fra: ['dag 1–4: 20 mg', 'fra dag 5: videre dosering beregnes ikke; planlegges individuelt'],
        til: ['dag 1: 50 mg, fordelt på 2 doser', 'dag 2: 100 mg, fordelt på 2 doser', 'dag 3: 200 mg, fordelt på 2 doser', 'fra dag 4: 300 mg, fordelt på 2 doser'],
      },
    },
    {
      id: 'med-startdato',
      beskrivelse: 'Olanzapin 10 mg til kvetiapin 400 mg med startdato 2. november 2026.',
      inndata: { startdose_mg: 10, maldose_mg: 400, startdato: '2026-11-02', bekreftet: BEKREFTET_AP },
      forventet: {
        fra: ['dag 1–4 (02.11.2026–05.11.2026): 10 mg', 'fra dag 5 (06.11.2026): videre dosering beregnes ikke; planlegges individuelt'],
        til: [
          'dag 1 (02.11.2026): 50 mg, fordelt på 2 doser',
          'dag 2 (03.11.2026): 100 mg, fordelt på 2 doser',
          'dag 3 (04.11.2026): 200 mg, fordelt på 2 doser',
          'dag 4 (05.11.2026): 300 mg, fordelt på 2 doser',
          'fra dag 5 (06.11.2026): 400 mg, fordelt på 2 doser',
        ],
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
      inndata: { startdose_mg: 20, maldose_mg: 300, bekreftet: ['indikasjon', VURDERT_AP.id] },
      forventet: {},
      stopp: /Må bekreftes før beregning: Pasienten bruker peroral olanzapin/,
    },
  ],
  godkjenning: tilKontroll(
    etterPilotkontrollen('indikasjonen (schizofreni) og at olanzapin er peroral, må bekreftes.'),
    etterKontrollrunden('nedtrappingen av olanzapin beregnes ikke, men planlegges individuelt; vurderingen av risiko og tempo i, eller med råd fra, spesialisthelsetjenesten må bekreftes.'),
    etterBeslutningene('opptrappingen av kvetiapin er godtatt som avgrenset modell ved schizofreni, med klinisk vurdering av toleransen og overvåking; nedtrappingen av olanzapin er fortsatt individuell, uten nulltrinn, og opptrappingen validerer ikke kryssbyttet som helhet.'),
    etterGjennomgangenAvFe08fac('kvetiapin er bundet til tabletter med vanlig frisetting i FEST (form 53), så depottabletter avvises også ved eksplisitt formvalg, og hver døgndose, også vedlikeholdsdosen, gis fordelt på to doser.'),
  ),
}

const IKKE_VURDERT = 'Ikke vurdert individuelt (halveringstid, formulering og norske preparater); gruppeanbefalingen alene er ikke nok (B4).'
const UTEN_PREPARAT = 'Har ingen preparater i FEST (P2.5); ikke vurdert individuelt.'

/**
 * Gruppebyttet til aripiprazol. Ikke i verktøyet: bare i
 * sammenligningssettet i `nedtrapping.ts`, som modelleringsdemonstrasjon av
 * gruppebaserte regler (kontrollørens beslutning P4-A 30.10.2026).
 */
export const gruppeRestApAripiprazol: Regel = {
  id: 'gruppe-rest-ap-aripiprazol',
  versjon: 5,
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
            type: 'uten_beregning',
            grunn:
              'Nedtrappingen av det gamle antipsykotikumet beregnes ikke: ingen felles algoritme er validert for gruppen, og ingen substansspesifikk plan er kontrollert (kontrollrunden 30.10.2026). Den planlegges i, eller med råd fra, spesialisthelsetjenesten og tilpasses toleransen og symptomene; legemidlet seponeres ikke brått.',
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
          { type: 'vedlikehold', dose: { type: 'aktuell' } },
        ],
      },
    ],
  },
  inndata: [{ navn: 'startdose', omrade: [20, 40], gjelder_medlem: 'zuklopentiksol', art: 'veiledende_preferanse', grunnlag: { type: 'kilde', henvisninger: [SPC.cisordinolDose] } }],
  bekreftelser: [
    { id: 'indikasjon', tekst: 'Indikasjonen er schizofreni.', grunnlag: { type: 'kilde', henvisninger: [SPC.abilifyDose] } },
    perorFormulering('Pasienten bruker en peroral formulering, ikke depotinjeksjon eller korttidsvirkende injeksjon.'),
    VURDERT_AP,
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
      utsagn('OUSFAR starter aripiprazol 10 mg dag 1 og holder det gamle antipsykotikumet uendret i én uke. Nedtrappingen av det gamle og økningen av aripiprazol til måldosen beregnes ikke, men planlegges individuelt (kontrollrunden 30.10.2026); aripiprazol holdes på 10 mg til da.', SPC.abilifyDose, KEKS19.kryss),
      utsagn('Gruppen følger P1-kartleggingen (tabellens medlemmer). Bare medlemmer som er vurdert hver for seg, kan beregnes (B4); i piloten gjelder det bare zuklopentiksol, som forslag.'),
      utsagn('Regelen er ikke godkjent som klinisk beregnbar gruppebytteregel, heller ikke den første uken med aripiprazol 10 mg (kontrollørens beslutning P4-A 30.10.2026); den er tatt ut av verktøyet og står bare som modelleringsdemonstrasjon.'),
      utsagn('Regelen er ikke en gruppebasert klinisk doseplan (kontrollrunden 30.10.2026): én felles algoritme er ikke validert for antipsykotika med ulik farmakologi. Gruppen viser bare hvordan modellen håndterer medlemmer; det kliniske kandidatforslaget er zuklopentiksol alene, helst som en egen regel til ny kontroll.'),
    ],
    forutsetninger: [...FORUTSETNINGER_FELLES],
    usikkerhet: [
      'Kildesidene og tabellen er ikke enige om hvem som er med i gruppen (P3); gruppens sammensetning må avklares faglig.',
      'Medlemmene har ulik halveringstid og ulike doser; samme plan passer ikke nødvendigvis alle.',
      'Aripiprazol er en partiell agonist og kan gi forverring eller akatisi ved bytte fra en full antagonist; overlappens lengde er OUSFARs valg.',
      'Den faste nedtrappingen med 25 % av startdosen per uke i versjon 3 var OUSFARs valg og er tatt ut. En beregnet nedtrapping krever en egen regel for zuklopentiksol med et substansspesifikt, kontrollert forløp.',
    ],
  },
  referanser: [pn('SwitchAntipsychotics:RA>Pa')],
  eksempler: [
    {
      id: 'zuklopentiksol-20-mg',
      beskrivelse: 'Zuklopentiksol 20 mg til aripiprazol: første uke beregnes; nedtrappingen og måldosen planlegges individuelt.',
      inndata: { startdose_mg: 20, medlem: 'zuklopentiksol', bekreftet: BEKREFTET_AP },
      forventet: {
        fra: ['dag 1–7: 20 mg', 'fra dag 8: videre dosering beregnes ikke; planlegges individuelt'],
        til: ['fra dag 1: 10 mg', 'holdes til zuklopentiksol er avsluttet; videre dosering planlegges individuelt'],
      },
    },
    {
      id: 'flupentiksol-ikke-vurdert',
      beskrivelse: 'Flupentiksol er medlem av gruppen, men ikke vurdert individuelt, så beregningen stopper.',
      inndata: { startdose_mg: 6, medlem: 'flupentiksol', bekreftet: BEKREFTET_AP },
      forventet: {},
      stopp: /flupentiksol er ikke vurdert individuelt/,
    },
  ],
  godkjenning: utAvVerktoyet(
    tilKontroll(
      etterPilotkontrollen('indikasjonen (schizofreni) og peroral formulering må bekreftes.'),
      etterKontrollrunden('ikke en gruppebasert klinisk doseplan; vurderingen av indikasjon, tilbakefallsrisiko og tempo i, eller med råd fra, spesialisthelsetjenesten må bekreftes.'),
      etterGjennomgangen('nedtrappingen av det gamle antipsykotikumet og måldosen for aripiprazol beregnes ikke, heller ikke for zuklopentiksol.'),
    ),
    5,
    GRUPPEBYTTE_SPERRET,
  ),
}

const depotAripiprazol: Regel = {
  id: 'depot-aripiprazol-maintena',
  versjon: 3,
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
        // Varenavnet dekker også styrkene til injeksjon annenhver måned (720 og 960 mg); den månedlige er pulver og væske til depotinjeksjonsvæske [FEST 819].
        preparater: ['Abilify Maintena'],
        legemiddelformer: ['819'],
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
    usikkerhet: [
      'Regelen gjelder Abilify Maintena; andre aripiprazoldepoter (andre estere eller intervaller) har egne oppstartsregimer og er ikke omfattet, heller ikke Abilify Maintena 720 og 960 mg til injeksjon annenhver måned. Pasienter som trenger en annen dosering, planlegges individuelt.',
    ],
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
  godkjenning: avgrensetGodkjent(
    nyVersjon(
      kildemessigAkseptabel(
        tilKontroll(etterPilotkontrollen('indikasjonen må bekreftes, og hvert unntak må besvares; et ukjent unntak stopper beregningen.')),
        2,
        'avgrenset oppstart med én injeksjon fra stabilisert og tolerert peroral aripiprazol; det gjelder ikke andre oppstartsvarianter eller depoter',
      ),
      3,
      etterBeslutningene(
        'doseringsprinsippene er godtatt i samsvar med preparatomtalen (P4-B). Depotforløpet er koblet til Abilify Maintena i FEST, bare den månedlige presentasjonen (pulver og væske til depotinjeksjonsvæske), så beregningen kan gi en plan med faktiske preparater; ikke andre aripiprazoldepoter.',
      ),
    ),
    3,
    '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20',
    'oppstart med én injeksjon Abilify Maintena 400 mg, peroral aripiprazol i 14 dager og deretter 400 mg månedlig, hos voksne med schizofreni som er stabilisert på og har tålt peroral aripiprazol. Gjelder ikke andre depottyper eller oppstartsvarianter, kjent langsom CYP2D6-omsetning, sterke CYP2D6- eller CYP3A4-hemmere, CYP3A4-induktorer eller ubekreftet stabilisering eller toleranse.',
  ),
}

const NYRE_AVKREFTET = { nedsatt_nyrefunksjon: false }

/** Injeksjonsstedet for vedlikeholdet etter bytte fra 9–12 mg, med deltoideus framhevet i planen (kontrollørens beslutning P4-B). */
const XEPLION_HOY_STED = 'deltoideus eller setemuskel; etter bytte fra 9–12 mg kan setemuskelen gi lavere eksponering de første seks månedene, så deltoideus bør vurderes'

const depotPaliperidon: Regel = {
  id: 'depot-paliperidon-xeplion',
  versjon: 3,
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
        // Tremånedersdepotet (Trevicta) og andre paliperidondepoter har egne varenavn og er ikke omfattet.
        preparater: ['Xeplion'],
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
                  { fra_mg: 9, til_mg: 100, sted: XEPLION_HOY_STED },
                  { fra_mg: 12, til_mg: 150, sted: XEPLION_HOY_STED },
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
      utsagn('Dosene er i mg paliperidon: 150 mg tilsvarer 234 mg paliperidonpalmitat, og 100 mg tilsvarer 156 mg.', SPC.xeplionStart),
      utsagn('Xeplion er til vedlikeholdsbehandling av schizofreni hos voksne som er stabilisert på paliperidon eller risperidon.', SPC.xeplionIndikasjon),
      utsagn('Ved bytte fra 9–12 mg peroralt kan injeksjon i setemuskelen gi lavere eksponering de første seks månedene; deltoideus kan vurderes da.', SPC.xeplionHoyDose),
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
      utsagn('Etter bytte fra 9 eller 12 mg står deltoideus framhevet i selve planen for vedlikeholdet, ikke bare i usikkerheten (kontrollørens beslutning P4-B 30.10.2026).', SPC.xeplionHoyDose),
    ],
    forutsetninger: [
      ...FORUTSETNINGER_FELLES,
      'Pasienten bruker én av depottablettstyrkene 3, 6, 9 eller 12 mg daglig.',
      'Forskriveren har vurdert nyrefunksjonen og svart at kreatininclearance ikke er under 80 ml/min; ubesvart stopper beregningen.',
    ],
    usikkerhet: [
      'Valget av injeksjonssted for vedlikeholdet beregnes ikke; planen viser bare hva preparatomtalen sier om det.',
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
  godkjenning: avgrensetGodkjent(
    nyVersjon(
      kildemessigAkseptabel(
        tilKontroll(etterPilotkontrollen('indikasjonen må bekreftes, nyrefunksjonen må besvares, og ved 3 mg må klinikeren velge dosen i spennet 25–50 mg.')),
        2,
        'avgrenset overgang fra stabiliserte perorale paliperidon-depottabletter med normal nyrefunksjon; det gjelder ikke risperidon, nedsatt nyrefunksjon eller andre depotregimer',
      ),
      3,
      etterBeslutningene(
        'doseringsprinsippene er godtatt i samsvar med preparatomtalen (P4-B). Depotforløpet er koblet til Xeplion i FEST, så beregningen kan gi en plan med faktiske preparater; etter bytte fra 9–12 mg står deltoideus framhevet i selve planen, og dosene er oppgitt som paliperidon med palmitat-ekvivalentene.',
      ),
    ),
    3,
    '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf',
    'overgang fra perorale paliperidon-depottabletter til Xeplion med 150 mg paliperidon dag 1 og 100 mg dag 8 i deltoideus, deretter månedlig fra én måned etter dag 8, hos voksne med schizofreni som er stabilisert, med kreatininclearance minst 80 ml/min og med deltoideus framhevet etter 9–12 mg peroralt. Gjelder ikke andre depottyper eller depotregimer, risperidon, nedsatt nyrefunksjon eller ubekreftet stabilisering eller toleranse.',
  ),
}

export const PILOTSETT: Regelsett = {
  id: 'ousfar-verktoy-pilot',
  versjon: 10,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Pilotsett for regelmodellen i P4: én regel per regelklasse planen prioriterer. Etter kontrollrunden 30.10.2026 er byttereglene rettet eller avgrenset og sendt til ny kontroll, og de to depotreglene er funnet kildemessig akseptable som avgrensede varianter. Etter kontrollørens beslutninger samme dag er byttene avgrenset slik kontrolløren godtok dem, gruppebyttet til aripiprazol er tatt ut av verktøyet (en modelleringsdemonstrasjon i utviklingssettet), og depotreglene er koblet til preparatet sitt i FEST. Etter kontrollørens gjennomgang av de rettede versjonene er kvetiapin bundet til tabletter med vanlig frisetting fordelt på to doser, og fenelzin vises som utvasking fullført, ikke som oppstart. Etter gjennomgangen av 62ebb21 er de to depotreglene (versjon 3) klinisk godkjent av den uavhengige kontrolløren, bare for nøyaktig de avgrensede oppstartene, og fenelzinregelen står som modell for utvaskingen, ikke som en godkjennbar samlet doseplan. De tre byttereglene er til faglig kontroll og brukes ikke i appen.',
  regler: [kryssSertralinMirtazapin, maoFluoksetinFenelzin, antipsykotikabytteOlanzapinKvetiapin, depotAripiprazol, depotPaliperidon],
}
