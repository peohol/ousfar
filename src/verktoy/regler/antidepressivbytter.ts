/**
 * K2 i `docs/verktøy-klinisk-leveranseplan-2026-11.md`: komplette bytter
 * mellom antidepressiva, fra pasientens nåværende dose til et definert
 * sluttmål – det gamle legemidlet er seponert, og det nye står på en valgt
 * vedlikeholdsdose – ikke bare de første reduksjonene. Bakgrunnen og
 * valgene står i `docs/verktøy-k2-antidepressivbytter.md`.
 *
 * To familier, hver bygget av én funksjon så de samme vurderingene gjelder
 * likt for hvert virkestoff:
 *
 * - **SSRI → mirtazapin, kryssnedtrapping** (sertralin, escitalopram,
 *   citalopram): SSRI-et halveres hver 14. dag ned til laveste dose i
 *   preparatomtalen og seponeres etter den; mirtazapin 15 mg fra dag 1 og,
 *   når SSRI-et er seponert, den valgte vedlikeholdsdosen 15 eller 30 mg.
 * - **(Es)citalopram → sertralin, moderat bytte** : nedtrapping som over til
 *   seponering, tre hele dager uten SSRI, så sertralin 50 mg og etter 14 dager
 *   den valgte vedlikeholdsdosen 50 eller 100 mg.
 *
 * Hver regel er OUSFARs egen vurdering, bygget på norske preparatomtaler,
 * Keks mfl. 2016 (tabell 2 og 3), NICE NG222 og RCPsych, med fakta gjengitt
 * med egne ord. Psychiatrienet står bare som referanse til kildeoppføringen
 * fra P3; ingen regel bygger på teksten der, og ingen tabell er overført.
 *
 * **Ingen av reglene er klinisk godkjent.** De er sendt til uavhengig faglig
 * kontroll; alle OUSFAR-valg står som åpne forslag til de er avklart. Det
 * godkjente startforløpet fra sertralin til mirtazapin (versjon 10 i
 * `pilotsett.ts`) er uendret og brukes fortsatt i appen.
 *
 * Settet er med i verktøyene gjennom `domenesett.ts` (`ANTIDEPRESSIVBYTTER`),
 * og `npm run verktoy:regler -- rapport` skriver regelrapporten om det.
 */
import type { Domenesett } from './domenesett'
import { FORUTSETNINGER_FELLES, forslag, h, halvering, kilde, NICE, pn, RCPSYCH, steg, trinn14, utsagn } from './bygg'
import { SPC } from './pilotsett'
import type { Bekreftelse, Beregningsinndata, Forlop, Godkjenning, Kildehenvisning, Regel, Regelsett, Regneeksempel, Unntak, Vurderingspunkt } from './modell'
import { REGELMODELLVERSJON } from './modell'

/* --- Fakta fra kildene, med egne ord ------------------------------------------------ */

/** Keks N, Hope J, Keogh S. Switching and stopping antidepressants. Aust Prescr 2016 (`keks-2016` i `kilder.ts`). */
const KEKS = {
  kryss: h(
    'keks-2016',
    'tabell 2 (cross-taper switch)',
    'Ved kryssnedtrapping trappes det første ned og seponeres; det andre startes i lav dose underveis og økes til terapeutisk dose når det første er seponert.',
  ),
  moderat: h(
    'keks-2016',
    'tabell 2 (moderate switch)',
    'Moderat bytte: det første trappes gradvis ned og seponeres, så 2–4 dager uten legemiddel, så startes det nye i lav dose. Anbefalt også i allmennpraksis; interaksjonsrisikoen er lav.',
  ),
  ssriMirtazapin: h('keks-2016', 'tabell 3 (fra SSRI til mirtazapin)', 'Fra citalopram, escitalopram, paroksetin eller sertralin til mirtazapin: trapp ned SSRI-et og start mirtazapin i lav dose.'),
  ssriSsri: h('keks-2016', 'tabell 3 (fra SSRI til annet SSRI)', 'Fra citalopram, escitalopram, paroksetin eller sertralin til et annet av dem: trapp ned og start det nye SSRI-et i lav dose.'),
  utvasking: h(
    'keks-2016',
    'note * til tabell 3',
    'Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel (oftest 2–5 dager) før det nye startes; forsiktig kryssnedtrapping kan brukes der tabellen tillater det.',
  ),
  nedtrapping: h('keks-2016', 'note til tabell 3', 'Nedtrapping betyr her gradvis reduksjon, vanligvis over omtrent fire uker, tilpasset pasient, legemiddel og sykdom.'),
  forsiktig: h('keks-2016', 'note til tabell 3', 'Alle bytter kan gi alvorlige komplikasjoner og må gjøres forsiktig og under nær oppfølging; forløpet kan måtte endres etter pasientens utvikling.'),
}

/** Fakta fra de norske preparatomtalene som K2 trenger utover pilotsettet (`SPC` i `pilotsett.ts`). */
const PREPARATOMTALE = {
  remeronRespons: h(
    'dmp-remeron',
    'pkt. 4.2',
    'Virkningen kommer vanligvis etter 1–2 uker; en adekvat dose bør gi respons innen 2–4 uker. Ved utilstrekkelig respons kan dosen økes til maksimal dose; uten respons etter ytterligere 2–4 uker bør behandlingen stoppes.',
  ),
  remeronEldre: h('dmp-remeron', 'pkt. 4.2', 'Eldre får samme anbefalte dose, men doseøkning bør skje under nøye oppfølging.'),
  remeronNyreLever: h('dmp-remeron', 'pkt. 4.2', 'Clearance kan være nedsatt ved kreatininclearance under 40 ml/min og ved nedsatt leverfunksjon; det må tas hensyn til ved forskrivning.'),
  zoloftStart: h('dmp-zoloft', 'pkt. 4.2', 'Ved depresjon startes sertralin med 50 mg daglig.'),
  zoloftOkning: h('dmp-zoloft', 'pkt. 4.2', 'Ved manglende respons på 50 mg kan dosen økes i trinn på 50 mg med minst én ukes mellomrom, høyst 200 mg daglig.'),
  zoloftEldreLever: h('dmp-zoloft', 'pkt. 4.2', 'Doseringen til eldre vurderes nøye (hyponatremi); ved nedsatt leverfunksjon brukes lavere eller sjeldnere dosering.'),
  cipralexEldre: h('dmp-cipralex', 'pkt. 4.2', 'Over 65 år startes det med 5 mg, høyst 10 mg; ved mild til moderat nedsatt leverfunksjon 5 mg de to første ukene, høyst 10 mg.'),
  cipralexHalveringstid: h('dmp-cipralex', 'pkt. 5.2', 'Halveringstiden etter gjentatt dosering er omtrent 30 timer.'),
  cipralexRespons: h('dmp-cipralex', 'pkt. 4.2', 'Ved depresjon er 10 mg vanlig dose, høyst 20 mg; vanligvis trengs 2–4 ukers behandling før antidepressiv respons.'),
  cipramilEldre: h('dmp-cipramil', 'pkt. 4.2', 'Over 65 år halveres dosen til 10–20 mg, høyst 20 mg daglig.'),
  cipramilHalveringstid: h('dmp-cipramil', 'pkt. 5.2', 'Eliminasjonshalveringstiden er omtrent halvannet døgn; den er lengre hos eldre og ved nedsatt leverfunksjon.'),
  cipramilStart: h('dmp-cipramil', 'pkt. 4.2', 'Ved panikklidelse startes det med 10 mg; ved depresjon er anbefalt dose 20 mg, høyst 40 mg.'),
}

/* --- Virkestoffene ---------------------------------------------------------------------- */

/** Det reglene trenger å vite om SSRI-et pasienten bytter fra. */
interface Fra {
  nokkel: 'sertralin' | 'escitalopram' | 'citalopram'
  /** Kortnavnet i Psychiatrienets kildeoppføringer (bare til referansen). */
  kort: 'Se' | 'Es' | 'Ci'
  /** Startdosene (mg) som kan trappes ned med hele tabletter av styrkene i FEST, halvering for halvering. */
  startdoser: number[]
  /** Laveste dose i preparatomtalen, siste trinn før seponering. */
  sluttdose: { mg: number; henvisning: Kildehenvisning }
  /** Tablettstyrkene i FEST (mg) da reglene ble laget. */
  styrker: number[]
  dose: Kildehenvisning
  seponering: Kildehenvisning
  eldre: Kildehenvisning
  lever: Kildehenvisning
}

const SERTRALIN: Fra = {
  nokkel: 'sertralin',
  kort: 'Se',
  startdoser: [50, 100, 200],
  sluttdose: { mg: 25, henvisning: SPC.zoloftDose },
  styrker: [25, 50, 100],
  dose: SPC.zoloftDose,
  seponering: SPC.zoloftSeponering,
  eldre: PREPARATOMTALE.zoloftEldreLever,
  lever: PREPARATOMTALE.zoloftEldreLever,
}

const ESCITALOPRAM: Fra = {
  nokkel: 'escitalopram',
  kort: 'Es',
  startdoser: [10, 20],
  sluttdose: { mg: 5, henvisning: PREPARATOMTALE.cipralexEldre },
  styrker: [5, 10, 20],
  dose: SPC.cipralexDose,
  seponering: SPC.cipralexSeponering,
  eldre: PREPARATOMTALE.cipralexEldre,
  lever: PREPARATOMTALE.cipralexEldre,
}

const CITALOPRAM: Fra = {
  nokkel: 'citalopram',
  kort: 'Ci',
  startdoser: [20, 40],
  sluttdose: { mg: 10, henvisning: PREPARATOMTALE.cipramilStart },
  styrker: [10, 20, 40],
  dose: SPC.cipramilDose,
  seponering: SPC.cipramilSeponering,
  eldre: PREPARATOMTALE.cipramilEldre,
  lever: PREPARATOMTALE.cipramilHalveringstid,
}

/** Halveringstiden som utvaskingen før sertralin bygger på. */
const HALVERINGSTID: Partial<Record<Fra['nokkel'], Kildehenvisning>> = { escitalopram: PREPARATOMTALE.cipralexHalveringstid, citalopram: PREPARATOMTALE.cipramilHalveringstid }

/** Tablett (FEST-form 53), den eneste formen reglene gjelder. */
const TABLETT = '53'

/* --- Felles deler -------------------------------------------------------------------------- */

const DATO = '2026-11-03'
const UTKAST = 'Utkast til komplett bytteregel (K2, `docs/verktøy-klinisk-leveranseplan-2026-11.md`).'
const TIL_KONTROLL =
  'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, norske preparater og regneeksempler (K2). Ikke klinisk godkjent; alle OUSFAR-valg er åpne forslag.'
const tilKontroll = (): Godkjenning => ({ status: 'til_faglig_kontroll', historikk: [steg('utkast', 1, UTKAST, DATO), steg('til_faglig_kontroll', 1, TIL_KONTROLL, DATO)] })

/** Nedtrappingen av SSRI-et til seponering: halvering hver 14. dag ned til laveste dose i preparatomtalen, som gis i 14 dager før seponering. */
function nedtrappingTilSeponering(fra: Fra): Forlop {
  return {
    id: 'fra',
    virkestoff: { type: 'virkestoff', nokkel: fra.nokkel },
    administrasjon: 'peroral',
    legemiddelformer: [TABLETT],
    utgangsdose: 'startdose',
    start: { type: 'dag', dag: 1 },
    faser: [
      {
        type: 'nedtrapping',
        strategi: halvering(
          forslag(
            fra.sluttdose.mg,
            'mg',
            `Laveste dose i preparatomtalen (${fra.sluttdose.mg} mg) er siste trinn; den gis like lenge som de andre trinnene, og ${fra.nokkel} seponeres etter den. Halveringen gir da bare hele tabletter av styrkene i FEST.`,
            { henvisninger: [fra.sluttdose.henvisning, NICE.andel] },
          ),
        ),
        trinnlengde: trinn14('Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert.', {
          henvisninger: [NICE.bytte, fra.seponering],
        }),
      },
    ],
    vurderinger: [
      {
        id: 'toleranse',
        nar: { type: 'for_hvert_trinn' },
        tekst: `Vurder seponeringssymptomer og forverring av depresjonen før ${fra.nokkel} reduseres eller seponeres. Neste trinn tas først når symptomene er borte eller tålelige; dagene er minstetider.`,
        ved_funn: 'Hold dosen til symptomene er tålelige. Ved plagsomme symptomer går pasienten tilbake til forrige dose, og byttet planlegges på nytt med mindre trinn.',
        grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, NICE.alvorlig, RCPSYCH.smaa] },
      },
    ],
  }
}

/**
 * Oppfølgingen av det nye legemidlet: toleransen før hver økning i planen, og
 * respons og bivirkninger når preparatomtalens 2–4 uker etter oppstarten og
 * etter hver doseendring er gått.
 */
function oppfolgingAvNyttLegemiddel(navn: string, respons: Kildehenvisning, okning: Kildehenvisning): Vurderingspunkt[] {
  return [
    {
      id: 'toleranse_for_okning',
      nar: { type: 'for_hvert_trinn' },
      tekst: `Vurder at dosen av ${navn} så langt tåles.`,
      ved_funn: 'Tåles den dårlig, økes den ikke, og byttet vurderes på nytt.',
      grunnlag: { type: 'kilde', henvisninger: [okning] },
    },
    {
      id: 'respons',
      nar: {
        type: 'etter_endring',
        dager: forslag(28, 'dager', `Respons og bivirkninger av ${navn} vurderes fire uker etter oppstarten og etter hver doseendring: ved slutten av de 2–4 ukene preparatomtalen oppgir før respons kan ventes.`, {
          omrade: [14, 28],
          henvisninger: [respons],
        }),
      },
      tekst: `Vurder respons og bivirkninger av ${navn}.`,
      ved_funn: 'Uten tilstrekkelig respons vurderes videre behandling etter preparatomtalen; det er utenfor denne planen.',
      grunnlag: { type: 'kilde', henvisninger: [respons] },
    },
  ]
}

const bekreftelseIndikasjon = (henvisninger: Kildehenvisning[]): Bekreftelse => ({
  id: 'indikasjon',
  tekst: 'Pasienten er voksen (18–65 år), og byttet gjelder behandling av depresjon.',
  grunnlag: { type: 'kilde', henvisninger },
})

const bekreftelseSammedisinering = (fra: Fra, til: string): Bekreftelse => ({
  id: 'serotonerg_sammedisinering',
  tekst: `Forskriveren har kontrollert pasientens øvrige legemidler: pasienten bruker ikke andre serotonerge legemidler eller andre legemidler som gjør byttet fra ${fra.nokkel} til ${til} mer risikofylt.`,
  grunnlag: { type: 'kilde', henvisninger: [NICE.kombinasjon, KEKS.forsiktig] },
})

/** Pasientforholdene der ingen av reglene gjelder: byttet planlegges da individuelt. */
function felleUnntak(fra: Fra, til: { navn: string; eldre: Kildehenvisning; lever: Kildehenvisning }): Unntak[] {
  return [
    {
      id: 'tidligere_seponeringssymptomer',
      tekst: `Et tidligere forsøk på å trappe ned eller seponere ${fra.nokkel} eller et annet antidepressiv har gitt seponeringssymptomer eller mislyktes. Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn.`,
      grunnlag: { type: 'kilde', henvisninger: [NICE.tidligere, RCPSYCH.langvarig, RCPSYCH.proporsjonal] },
    },
    {
      id: 'lang_behandlingstid',
      tekst: `Pasienten har brukt ${fra.nokkel} i mange måneder eller lenger. Da anbefales mindre reduksjoner fra starten, og byttet planlegges individuelt med langsommere, symptomstyrt nedtrapping.`,
      grunnlag: { type: 'kilde', henvisninger: [RCPSYCH.langvarig, RCPSYCH.proporsjonal, RCPSYCH.fireUker] },
    },
    {
      id: 'over_65',
      tekst: `Pasienten er over 65 år. Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre, så byttet planlegges individuelt.`,
      grunnlag: { type: 'kilde', henvisninger: [fra.eldre, til.eldre] },
    },
    {
      id: 'nedsatt_leverfunksjon',
      tekst: `Pasienten har nedsatt leverfunksjon. Preparatomtalene for ${fra.nokkel} og ${til.navn} krever da lavere doser eller særskilt hensyn, så byttet planlegges individuelt.`,
      grunnlag: { type: 'kilde', henvisninger: [fra.lever, til.lever] },
    },
  ]
}

const besvart = (bekreftet: string[], unntak: Unntak[], maldose_mg: number, startdose_mg: number, endre: Partial<Beregningsinndata> = {}): Beregningsinndata => ({
  startdose_mg,
  maldose_mg,
  bekreftet,
  pasientforhold: Object.fromEntries(unntak.map((u) => [u.id, false])),
  ...endre,
})

/** Dag–dag for hvert trinn i halveringen fra `startdose`, til og med siste dag før seponering; `n` er antall trinn. */
function nedtrappingslinjer(startdose: number, sluttdose: number): { linjer: string[]; sisteDag: number } {
  const linjer: string[] = []
  let dag = 1
  for (let mg = startdose / 2; mg >= sluttdose; mg /= 2) {
    linjer.push(`dag ${dag}–${dag + 13}: ${mg} mg`)
    dag += 14
  }
  return { linjer: [...linjer, `fra dag ${dag}: seponert`], sisteDag: dag - 1 }
}

/** Den syntetiske dosen kasusene bruker når en regel skal stoppe av en annen grunn enn dosen. */
const forsteDose = (fra: Fra) => fra.startdoser.at(-1)!

/* --- SSRI → mirtazapin, kryssnedtrapping ------------------------------------------------------- */

const MIRTAZAPIN = { navn: 'mirtazapin', eldre: PREPARATOMTALE.remeronEldre, lever: PREPARATOMTALE.remeronNyreLever }
const MIRTAZAPIN_MALDOSER = [15, 30]
/** Tablettstyrkene av mirtazapin i FEST (mg) da reglene ble laget; 45 mg brukes ikke i planene. */
const MIRTAZAPIN_STYRKER = [15, 30, 45]
const BEKREFTET_MIRTAZAPIN = ['indikasjon', 'toleranse_overlapp', 'serotonerg_sammedisinering']

export function ssriTilMirtazapin(fra: Fra): Regel {
  const unntak: Unntak[] = [
    ...felleUnntak(fra, MIRTAZAPIN),
    {
      id: 'nedsatt_nyrefunksjon',
      tekst: 'Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [PREPARATOMTALE.remeronNyreLever] },
    },
  ]
  const eksempel = (startdose: number, maldose: number): Regneeksempel => {
    const { linjer, sisteDag } = nedtrappingslinjer(startdose, fra.sluttdose.mg)
    return {
      id: `fra-${startdose}-mg-til-${maldose}-mg`,
      beskrivelse: `${fra.nokkel} ${startdose} mg til mirtazapin ${maldose} mg: halvering hver 14. dag til ${fra.sluttdose.mg} mg og seponering, mirtazapin 15 mg fra dag 1${maldose === 15 ? ' som fortsetter' : ` og ${maldose} mg fra dagen etter siste dose ${fra.nokkel}`}.`,
      inndata: besvart(BEKREFTET_MIRTAZAPIN, unntak, maldose, startdose),
      forventet: { fra: linjer, til: maldose === 15 ? ['fra dag 1: 15 mg'] : [`dag 1–${sisteDag}: 15 mg`, `fra dag ${sisteDag + 1}: ${maldose} mg`] },
    }
  }
  const lav = fra.startdoser[0]!
  const hoy = forsteDose(fra)
  return {
    id: `bytte-${fra.nokkel}-mirtazapin`,
    versjon: 1,
    tittel: `Bytte fra ${fra.nokkel} til mirtazapin, kryssnedtrapping til seponering`,
    fra: { type: 'virkestoff', nokkel: fra.nokkel },
    til: { type: 'virkestoff', nokkel: 'mirtazapin' },
    plan: {
      form: 'kryssnedtrapping',
      forlop: [
        nedtrappingTilSeponering(fra),
        {
          id: 'til',
          virkestoff: { type: 'virkestoff', nokkel: 'mirtazapin' },
          administrasjon: 'peroral',
          legemiddelformer: [TABLETT],
          utgangsdose: null,
          start: { type: 'dag', dag: 1 },
          faser: [
            { type: 'hold', dose: { type: 'fast', mg: kilde(15, 'mg', 'veiledende_preferanse', SPC.remeronDose) }, varighet: { type: 'til_forlop_er_avsluttet', forlop: 'fra' } },
            { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
          ],
          vurderinger: oppfolgingAvNyttLegemiddel('mirtazapin', PREPARATOMTALE.remeronRespons, KEKS.kryss),
        },
      ],
    },
    inndata: [
      {
        navn: 'startdose',
        verdier: fra.startdoser,
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse: `Regelen gjelder bare ${fra.nokkel} ${fra.startdoser.join(', ')} mg: dosene som kan halveres ned til ${fra.sluttdose.mg} mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt.`,
          henvisninger: [fra.dose],
          avklaring: null,
        },
      },
      {
        navn: 'maldose',
        verdier: MIRTAZAPIN_MALDOSER,
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse:
            'Forskriveren velger vedlikeholdsdosen 15 eller 30 mg, startdosene i preparatomtalen. Den gis fra dagen etter siste dose av SSRI-et. 45 mg er en senere, responsstyrt økning etter preparatomtalen og ingen del av planen.',
          henvisninger: [SPC.remeronDose, KEKS.kryss, PREPARATOMTALE.remeronRespons],
          avklaring: null,
        },
      },
    ],
    bekreftelser: [
      bekreftelseIndikasjon([SPC.remeronDose, fra.dose]),
      {
        id: 'toleranse_overlapp',
        tekst: `Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av ${fra.nokkel}, før økningen av mirtazapin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Mens begge brukes, følges økt sedasjon og tegn på serotonerg belastning.`,
        grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, RCPSYCH.tid, NICE.kombinasjon, PREPARATOMTALE.remeronRespons] },
      },
      bekreftelseSammedisinering(fra, 'mirtazapin'),
    ],
    unntak,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn(`${fra.nokkel[0]!.toUpperCase()}${fra.nokkel.slice(1)} trappes ned gradvis, over minst én til to uker.`, fra.seponering),
        utsagn('Fra et SSRI til mirtazapin: SSRI-et trappes ned, og mirtazapin startes i lav dose; forsiktig kryssnedtrapping er et alternativ til utvasking.', KEKS.ssriMirtazapin, KEKS.utvasking),
        utsagn('Ved kryssnedtrapping økes det nye legemidlet til terapeutisk dose når det første er seponert.', KEKS.kryss),
        utsagn('Mirtazapin sammen med et SSRI er et anerkjent kombinasjonsalternativ, så overlappen er ikke en kjent kontraindisert kombinasjon.', NICE.kombinasjon),
        utsagn('Mirtazapin startes med 15 eller 30 mg; effektiv dose er vanligvis 15–45 mg, og responsen vurderes etter 2–4 uker.', SPC.remeronDose, PREPARATOMTALE.remeronRespons),
      ],
      tilpasninger: [
        utsagn(
          `OUSFAR halverer ${fra.nokkel} hver 14. dag ned til ${fra.sluttdose.mg} mg, gir den dosen i 14 dager og seponerer etter den. Mirtazapin 15 mg gis fra dag 1 og holdes til siste dose ${fra.nokkel}.`,
          NICE.andel,
          NICE.bytte,
          fra.sluttdose.henvisning,
          SPC.remeronDose,
        ),
        utsagn('Dagen etter siste dose av SSRI-et går mirtazapin til vedlikeholdsdosen forskriveren har valgt, 15 eller 30 mg. Planen er da fullført; en eventuell økning til 45 mg er en senere, responsstyrt vurdering.', KEKS.kryss, PREPARATOMTALE.remeronRespons),
        utsagn(
          'Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal lever- og nyrefunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.',
          RCPSYCH.langvarig, RCPSYCH.proporsjonal,
          NICE.tidligere,
        ),
      ],
      forutsetninger: [
        ...FORUTSETNINGER_FELLES,
        `Pasienten bruker ${fra.nokkel} i én av dosene ${fra.startdoser.join(', ')} mg daglig, som tabletter.`,
        'Dagene er minstetider. Kommer det plagsomme seponeringssymptomer, går pasienten tilbake til forrige dose og byttet planlegges på nytt med mindre trinn.',
      ],
      usikkerhet: [
        'RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker, fordi NICE åpner for raskere nedtrapping ved bytte og mirtazapin startes samtidig. Om det er forsvarlig, er et spørsmål til faglig kontroll.',
        'Overlappens lengde og tidspunktet for økning av mirtazapin er OUSFARs valg innenfor kildene; serotonerge bivirkninger kan øke mens begge brukes.',
        'Mirtazapin hemmer ikke serotoninreopptaket, så seponeringssymptomer etter SSRI-et kan komme også under byttet.',
      ],
    },
    referanser: [pn(`SwitchAntidepressants:${fra.kort}>Mz`)],
    eksempler: [
      eksempel(hoy, 30),
      eksempel(lav, 15),
      eksempel(lav, 30),
      {
        id: 'startdose-utenfor',
        beskrivelse: `En dose som ikke kan halveres med hele tabletter, stopper.`,
        inndata: besvart(BEKREFTET_MIRTAZAPIN, unntak, 30, fra.startdoser[0]! * 1.5),
        forventet: {},
        stopp: /er utenfor det regelen gjelder for/,
      },
      {
        id: 'uten-maldose',
        beskrivelse: 'Uten valgt vedlikeholdsdose for mirtazapin velger beregningen ikke selv.',
        inndata: besvart(BEKREFTET_MIRTAZAPIN, unntak, 30, hoy, { maldose_mg: undefined }),
        forventet: {},
        stopp: /Måldosen må oppgis/i,
      },
      {
        id: 'maldose-45',
        beskrivelse: '45 mg er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.',
        inndata: besvart(BEKREFTET_MIRTAZAPIN, unntak, 45, hoy),
        forventet: {},
        stopp: /Måldosen 45 mg er utenfor det regelen gjelder for/,
      },
      {
        id: 'lang-behandlingstid',
        beskrivelse: 'Etter lang behandlingstid gjelder ikke regelen.',
        inndata: besvart(BEKREFTET_MIRTAZAPIN, unntak, 30, hoy, { pasientforhold: { ...Object.fromEntries(unntak.map((u) => [u.id, false])), lang_behandlingstid: true } }),
        forventet: {},
        stopp: new RegExp(`Regelen gjelder ikke: Pasienten har brukt ${fra.nokkel} i mange måneder`),
      },
    ],
    klinisk_omfang: {
      tilfeller: [{ legemiddelform: TABLETT, startdoser: fra.startdoser, svar: {}, styrker: { fra: fra.styrker, til: MIRTAZAPIN_MALDOSER } }],
      grunnlag: {
        type: 'ousfar_vurdering',
        begrunnelse: `En klinisk godkjenning kan bare gjelde ${fra.nokkel} ${fra.startdoser.join(', ')} mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende.`,
        henvisninger: [fra.dose, SPC.remeronDose],
        avklaring: null,
      },
    },
    godkjenning: tilKontroll(),
  }
}

/* --- (Es)citalopram → sertralin, moderat bytte --------------------------------------------- */

const SERTRALIN_MALDOSER = [50, 100]
const BEKREFTET_SERTRALIN = ['indikasjon', 'toleranse_bytte', 'serotonerg_sammedisinering']
const SERTRALIN_TIL = { navn: 'sertralin', eldre: PREPARATOMTALE.zoloftEldreLever, lever: PREPARATOMTALE.zoloftEldreLever }
const UTVASKING_DAGER = 3

export function ssriTilSertralin(fra: Fra): Regel {
  const unntak = felleUnntak(fra, SERTRALIN_TIL)
  const halveringstid = HALVERINGSTID[fra.nokkel]
  if (!halveringstid) throw new Error(`${fra.nokkel}: halveringstiden utvaskingen bygger på, mangler`)
  const eksempel = (startdose: number, maldose: number): Regneeksempel => {
    const { linjer, sisteDag } = nedtrappingslinjer(startdose, fra.sluttdose.mg)
    const start = sisteDag + UTVASKING_DAGER + 1
    return {
      id: `fra-${startdose}-mg-til-${maldose}-mg`,
      beskrivelse: `${fra.nokkel} ${startdose} mg til sertralin ${maldose} mg: halvering hver 14. dag til ${fra.sluttdose.mg} mg og seponering, tre dager uten SSRI, så sertralin 50 mg${maldose === 50 ? ' som fortsetter' : ` i 14 dager og deretter ${maldose} mg`}.`,
      inndata: besvart(BEKREFTET_SERTRALIN, unntak, maldose, startdose),
      forventet: { fra: linjer, til: maldose === 50 ? [`fra dag ${start}: 50 mg`] : [`dag ${start}–${start + 13}: 50 mg`, `fra dag ${start + 14}: ${maldose} mg`] },
    }
  }
  const lav = fra.startdoser[0]!
  const hoy = forsteDose(fra)
  return {
    id: `bytte-${fra.nokkel}-sertralin`,
    versjon: 1,
    tittel: `Bytte fra ${fra.nokkel} til sertralin, nedtrapping og kort utvasking`,
    fra: { type: 'virkestoff', nokkel: fra.nokkel },
    til: { type: 'virkestoff', nokkel: 'sertralin' },
    plan: {
      form: 'sekvensielt',
      forlop: [
        nedtrappingTilSeponering(fra),
        {
          id: 'til',
          virkestoff: { type: 'virkestoff', nokkel: 'sertralin' },
          administrasjon: 'peroral',
          legemiddelformer: [TABLETT],
          utgangsdose: null,
          start: {
            type: 'etter_utvasking',
            forlop: 'fra',
            utvasking: forslag(
              UTVASKING_DAGER,
              'dager',
              `Tre hele dager uten SSRI: innenfor de 2–4 dagene ved et moderat bytte og minst to halveringstider for ${fra.nokkel} (omtrent 30–36 timer). Et minimum, ikke en fast startdato.`,
              { art: 'bindende_krav', henvisninger: [KEKS.moderat, KEKS.utvasking, halveringstid] },
            ),
          },
          faser: [
            {
              type: 'hold',
              dose: { type: 'fast', mg: kilde(50, 'mg', 'veiledende_preferanse', PREPARATOMTALE.zoloftStart) },
              varighet: {
                type: 'dager',
                dager: forslag(14, 'dager', 'Preparatomtalen krever minst én uke mellom doseendringer; OUSFAR foreslår 14 dager på 50 mg før en eventuell økning, så responsen kan vurderes.', {
                  omrade: [7, 28],
                  henvisninger: [PREPARATOMTALE.zoloftOkning, PREPARATOMTALE.cipralexRespons],
                }),
              },
            },
            { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
          ],
          vurderinger: oppfolgingAvNyttLegemiddel('sertralin', PREPARATOMTALE.cipralexRespons, PREPARATOMTALE.zoloftOkning),
        },
      ],
    },
    inndata: [
      {
        navn: 'startdose',
        verdier: fra.startdoser,
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse: `Regelen gjelder bare ${fra.nokkel} ${fra.startdoser.join(' og ')} mg: dosene som kan halveres ned til ${fra.sluttdose.mg} mg med hele tabletter av styrkene i FEST. Andre doser planlegges individuelt.`,
          henvisninger: [fra.dose],
          avklaring: null,
        },
      },
      {
        navn: 'maldose',
        verdier: SERTRALIN_MALDOSER,
        art: 'bindende_krav',
        grunnlag: {
          type: 'ousfar_vurdering',
          begrunnelse:
            'Forskriveren velger vedlikeholdsdosen 50 eller 100 mg. Sertralin startes med 50 mg, preparatomtalens startdose ved depresjon, og 100 mg er én økning på 50 mg. Høyere doser er senere, responsstyrte økninger og ingen del av planen.',
          henvisninger: [PREPARATOMTALE.zoloftStart, PREPARATOMTALE.zoloftOkning],
          avklaring: null,
        },
      },
    ],
    bekreftelser: [
      bekreftelseIndikasjon([PREPARATOMTALE.zoloftStart, fra.dose]),
      {
        id: 'toleranse_bytte',
        tekst: `Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av ${fra.nokkel}, før økningen av sertralin og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. I dagene uten SSRI følges seponeringssymptomer og forverring av depresjonen.`,
        grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, RCPSYCH.tid, KEKS.moderat, PREPARATOMTALE.cipralexRespons] },
      },
      bekreftelseSammedisinering(fra, 'sertralin'),
    ],
    unntak,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn(`${fra.nokkel[0]!.toUpperCase()}${fra.nokkel.slice(1)} trappes ned gradvis, over minst én til to uker.`, fra.seponering),
        utsagn('Fra et SSRI til et annet: det første trappes ned, og det nye startes i lav dose.', KEKS.ssriSsri),
        utsagn('Moderat bytte: nedtrapping til seponering, 2–4 dager uten legemiddel og oppstart i lav dose; interaksjonsrisikoen er lav.', KEKS.moderat),
        utsagn('Tryggest med tanke på interaksjoner er 2–5 halveringstider uten legemiddel før det nye startes.', KEKS.utvasking, halveringstid),
        utsagn('Sertralin startes med 50 mg ved depresjon og økes i trinn på 50 mg med minst én ukes mellomrom.', PREPARATOMTALE.zoloftStart, PREPARATOMTALE.zoloftOkning),
      ],
      tilpasninger: [
        utsagn(
          `OUSFAR halverer ${fra.nokkel} hver 14. dag ned til ${fra.sluttdose.mg} mg, gir den dosen i 14 dager og seponerer etter den.`,
          NICE.andel,
          NICE.bytte,
          fra.sluttdose.henvisning,
        ),
        utsagn(
          `Etter tre hele dager uten SSRI startes sertralin 50 mg. Har forskriveren valgt 100 mg, økes dosen etter 14 dager; planen er da fullført. Høyere doser er senere, responsstyrte vurderinger.`,
          KEKS.moderat,
          halveringstid,
          PREPARATOMTALE.zoloftOkning,
        ),
        utsagn('OUSFAR har valgt et moderat bytte med utvasking, ikke direkte bytte eller kryssnedtrapping, fordi to SSRI-er samtidig gir høyere risiko for serotonerge bivirkninger.', KEKS.utvasking, KEKS.moderat),
        utsagn(
          'Planen gjelder bare kort behandlingstid uten tidligere seponeringsplager, voksne til og med 65 år og normal leverfunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.',
          RCPSYCH.langvarig, RCPSYCH.proporsjonal,
          NICE.tidligere,
        ),
      ],
      forutsetninger: [
        ...FORUTSETNINGER_FELLES,
        `Pasienten bruker ${fra.nokkel} i én av dosene ${fra.startdoser.join(' og ')} mg daglig, som tabletter.`,
        'Dagene er minstetider. Kommer det plagsomme seponeringssymptomer eller forverring, går pasienten tilbake til forrige dose og byttet planlegges på nytt.',
      ],
      usikkerhet: [
        'I dagene uten SSRI kan seponeringssymptomer og forverring av depresjonen komme; Keks mfl. nevner dette som ulempen ved et moderat bytte. Om direkte bytte eller kryssnedtrapping er bedre for noen, er et spørsmål til faglig kontroll.',
        'RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker. Om det er forsvarlig ved bytte, er et spørsmål til faglig kontroll.',
        'Tre dager er OUSFARs valg innenfor kildene, ikke en verdi preparatomtalene oppgir.',
      ],
    },
    referanser: [pn(`SwitchAntidepressants:${fra.kort}>Se`)],
    eksempler: [
      eksempel(hoy, 100),
      eksempel(lav, 50),
      eksempel(lav, 100),
      {
        id: 'startdose-utenfor',
        beskrivelse: 'En dose som ikke kan halveres med hele tabletter, stopper.',
        inndata: besvart(BEKREFTET_SERTRALIN, unntak, 100, fra.startdoser[0]! * 1.5),
        forventet: {},
        stopp: /er utenfor det regelen gjelder for/,
      },
      {
        id: 'maldose-150',
        beskrivelse: '150 mg sertralin er en senere, responsstyrt økning og ikke en vedlikeholdsdose planen beregner.',
        inndata: besvart(BEKREFTET_SERTRALIN, unntak, 150, hoy),
        forventet: {},
        stopp: /Måldosen 150 mg er utenfor det regelen gjelder for/,
      },
      {
        id: 'over-65',
        beskrivelse: 'Over 65 år gjelder ikke regelen.',
        inndata: besvart(BEKREFTET_SERTRALIN, unntak, 50, hoy, { pasientforhold: { ...Object.fromEntries(unntak.map((u) => [u.id, false])), over_65: true } }),
        forventet: {},
        stopp: /Regelen gjelder ikke: Pasienten er over 65 år/,
      },
    ],
    klinisk_omfang: {
      tilfeller: [{ legemiddelform: TABLETT, startdoser: fra.startdoser, svar: {}, styrker: { fra: fra.styrker, til: SERTRALIN_MALDOSER } }],
      grunnlag: {
        type: 'ousfar_vurdering',
        begrunnelse: `En klinisk godkjenning kan bare gjelde ${fra.nokkel} ${fra.startdoser.join(' og ')} mg med tabletter (FEST-form 53) for begge virkestoffene og styrkene i FEST som er verifisert ende til ende.`,
        henvisninger: [fra.dose, PREPARATOMTALE.zoloftStart],
        avklaring: null,
      },
    },
    godkjenning: tilKontroll(),
  }
}

/* --- Regelsettet ------------------------------------------------------------------------------ */

/**
 * Tablettstyrkene av det nye legemidlet i FEST da reglene ble laget. Planene
 * bruker bare styrkene som er lik startdosen og vedlikeholdsdosene (én hel
 * tablett), og det kliniske omfanget er kontrollert med bare dem; de andre
 * skal kunne forsvinne fra FEST uten at planene stopper.
 */
export const NYTT_LEGEMIDDEL_I_FEST: Record<string, readonly number[]> = { mirtazapin: MIRTAZAPIN_STYRKER, sertralin: SERTRALIN.styrker }

export const BYTTESETT: Regelsett = {
  id: 'ousfar-verktoy-antidepressivbytter',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Komplette bytter mellom antidepressiva (K2): fra pasientens nåværende dose til seponering av det gamle legemidlet og en valgt vedlikeholdsdose av det nye. Fem regler i to familier, til uavhengig faglig kontroll; ingen er klinisk godkjent.',
  regler: [ssriTilMirtazapin(SERTRALIN), ssriTilMirtazapin(ESCITALOPRAM), ssriTilMirtazapin(CITALOPRAM), ssriTilSertralin(ESCITALOPRAM), ssriTilSertralin(CITALOPRAM)],
}

export const ANTIDEPRESSIVBYTTER: Domenesett = {
  sett: BYTTESETT,
  rapport: {
    fil: 'docs/verktøy-k2-antidepressivbytter-regler.md',
    tittel: 'K2: komplette bytter mellom antidepressiva (til faglig kontroll)',
    notater: ['docs/verktøy-k2-antidepressivbytter.md', 'docs/verktøy-k2-kontrollgrunnlag.md', 'docs/verktøy-p4-regelmodell.md'],
  },
}
