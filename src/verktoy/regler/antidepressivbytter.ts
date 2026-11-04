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
 *   preparatomtalen; mirtazapin 15 mg fra dag 1 og, når SSRI-et er seponert,
 *   den valgte vedlikeholdsdosen 15 eller 30 mg. Seponeringen fra laveste dose
 *   er ikke avgjort faglig (K2-2), så planene stopper.
 * - **(Es)citalopram → sertralin, nedtrapping og direkte overgang**: halvering
 *   hver 14. dag ned til laveste tablettdose og seponering derfra, sertralin
 *   50 mg dagen etter og, etter tidligst 14 dager og en vurdering av effekt,
 *   toleranse og seponeringssymptomer, den valgte vedlikeholdsdosen 50 eller
 *   100 mg. Planen gjelder bare de første ukene av behandlingen
 *   ({@link KORT_BEHANDLINGSTID_UKER}).
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
import { LANG_BEHANDLINGSTID } from './nedtrapping'
import { LITTERATUR, SPC } from './pilotsett'
import type { Avslutning, Bekreftelse, Beregningsinndata, Forlop, Godkjenning, Kildehenvisning, Regel, Regelsett, Regneeksempel, Unntak, Vurderingspunkt } from './modell'
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
  direkte: h(
    'keks-2016',
    'tabell 2 (direct switch)',
    'Direkte bytte: det første stoppes, og det andre startes dagen etter i vanlig terapeutisk dose. Passer bare i utvalgte tilfeller, som bytte fra ett SSRI med kort halveringstid til et annet, og krever klinisk erfaring.',
  ),
  direkteRisiko: h('keks-2016', 'tabell 2 (direct switch)', 'Ved direkte bytte er seponeringssymptomer sannsynlige og interaksjonsrisikoen betydelig, begge avhengig av det andre legemidlet.'),
  utenUtvasking: h(
    'keks-2016',
    'note * til tabell 3',
    'I de merkede tilfellene, blant dem fra citalopram, escitalopram, paroksetin eller sertralin til et annet av dem, er utvasking ikke nødvendig når byttet gjøres forsiktig og under nær oppfølging og kliniske forhold støtter det.',
  ),
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
  zoloftRespons: h(
    'dmp-zoloft',
    'pkt. 4.2',
    'Effekten kan ses i løpet av sju dager, men vanligvis trengs lengre observasjonstid for å vise terapeutisk effekt. Doseendringer gjøres ikke oftere enn én gang i uken (eliminasjonshalveringstid 24 timer).',
  ),
  zoloftVedlikehold: h('dmp-zoloft', 'pkt. 4.2', 'Ved langtidsbehandling holdes dosen på laveste effektive nivå og justeres etter terapeutisk respons.'),
  cipralexEldre: h('dmp-cipralex', 'pkt. 4.2', 'Over 65 år startes det med 5 mg, høyst 10 mg; ved mild til moderat nedsatt leverfunksjon 5 mg de to første ukene, høyst 10 mg.'),
  cipralexHalveringstid: h('dmp-cipralex', 'pkt. 5.2', 'Halveringstiden etter gjentatt dosering er omtrent 30 timer.'),
  cipralexSymptomer: h(
    'dmp-cipralex',
    'pkt. 4.4',
    'Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i 2–3 måneder eller mer.',
  ),
  cipramilEldre: h('dmp-cipramil', 'pkt. 4.2', 'Over 65 år halveres dosen til 10–20 mg, høyst 20 mg daglig.'),
  cipramilHalveringstid: h('dmp-cipramil', 'pkt. 5.2', 'Eliminasjonshalveringstiden er omtrent halvannet døgn; den er lengre hos eldre og ved nedsatt leverfunksjon.'),
  cipramilStart: h('dmp-cipramil', 'pkt. 4.2', 'Ved panikklidelse startes det med 10 mg; ved depresjon er anbefalt dose 20 mg, høyst 40 mg.'),
  cipramilSymptomer: h(
    'dmp-cipramil',
    'pkt. 4.4',
    'Seponeringssymptomer kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker, men kan hos noen vare i 2–3 måneder eller mer.',
  ),
}

/** Fakta fra RCPsych-veiledningen som K2 trenger utover de felles (`RCPSYCH` i `bygg.ts`). */
const RCPSYCH_K2 = {
  kort: h(
    'rcpsych-stopping',
    'When and how should I stop my antidepressants?',
    'Etter bare noen ukers bruk kan nedtrapping og seponering ofte skje over omtrent en måned, helst minst fire uker; etter mange måneder eller år går nedtrappingen langsommere, vanligvis over måneder.',
  ),
  kortRisiko: h(
    'rcpsych-stopping',
    'Who is affected by antidepressant withdrawal symptoms?',
    'Risikoen for seponeringssymptomer synes størst etter høy dose over lang tid, men de kan komme også etter kort bruk, og hvem som får dem, kan ikke forutsies.',
  ),
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

/**
 * Det overgangen til sertralin bygger på for hvert SSRI: halveringstiden
 * (preparatomtalen pkt. 5.2, i timer) og når seponeringssymptomene vanligvis
 * kommer (pkt. 4.4).
 */
interface Overgang {
  timer: number
  henvisning: Kildehenvisning
  symptomer: Kildehenvisning
}
const OVERGANG: Partial<Record<Fra['nokkel'], Overgang>> = {
  escitalopram: { timer: 30, henvisning: PREPARATOMTALE.cipralexHalveringstid, symptomer: PREPARATOMTALE.cipralexSymptomer },
  citalopram: { timer: 36, henvisning: PREPARATOMTALE.cipramilHalveringstid, symptomer: PREPARATOMTALE.cipramilSymptomer },
}

/** Tablett (FEST-form 53), den eneste formen reglene gjelder. */
const TABLETT = '53'

/* --- Felles deler -------------------------------------------------------------------------- */

const DATO = '2026-11-03'
const UTKAST = 'Utkast til komplett bytteregel (K2, `docs/verktøy-klinisk-leveranseplan-2026-11.md`).'
const TIL_KONTROLL =
  'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, norske preparater og regneeksempler (K2). Ikke klinisk godkjent; alle OUSFAR-valg er åpne forslag.'
const tilKontroll = (): Godkjenning => ({ status: 'til_faglig_kontroll', historikk: [steg('utkast', 1, UTKAST, DATO), steg('til_faglig_kontroll', 1, TIL_KONTROLL, DATO)] })

/**
 * Sluttrinnet ved bytte (K2-2): om, og fra hvilken dose, det gamle SSRI-et kan
 * seponeres mens det nye legemidlet er startet eller startes. Laveste dose i
 * preparatomtalen er ingen seponeringsgrense (ChatGPTs kontroll 03.11.2026), og
 * ingen kilde i OUSFAR dokumenterer sluttrinnet ved bytte. Til det er avgjort
 * faglig, har avslutningen ingen verdi, og hver plan stopper med «Komplett
 * plan ikke tilgjengelig» i stedet for å seponere.
 */
function sluttrinnVedBytte(fra: Fra, dekning?: Dekning): Avslutning {
  if (dekning) {
    return {
      type: 'seponering',
      fra_hoyst_mg: forslag(fra.sluttdose.mg, 'mg', dekning.begrunnelse, { art: 'bindende_krav', henvisninger: dekning.henvisninger }),
      grunnlag: {
        type: 'ousfar_vurdering',
        begrunnelse: `${stor(fra.nokkel)} seponeres fra ${fra.sluttdose.mg} mg bare i denne planen, der ${dekning.nytt} startes dagen etter; uten et nytt legemiddel med samme virkningsmekanisme er ${fra.sluttdose.mg} mg ingen seponeringsgrense. Seponeringen skjer først når toleransen på ${fra.sluttdose.mg} mg er vurdert, og den første uken etter overgangen følges seponeringssymptomer og forverring tett. Gjelder bare omfanget i regelen (K2-2).`,
        henvisninger: [...dekning.henvisninger, NICE.tempo, NICE.bytte],
        avklaring: null,
      },
    }
  }
  return {
    type: 'seponering',
    fra_hoyst_mg: forslag(
      null,
      'mg',
      `Ikke avgjort. Halveringen stopper ved ${fra.sluttdose.mg} mg, laveste dose som kan gis med hele tabletter av styrkene i FEST, men det dokumenterer ikke at ${fra.nokkel} kan seponeres derfra. NICE og RCPsych beskriver mindre trinn ved lave doser og eventuelt flytende formuleringer; om det nye legemidlet gjør et kortere sluttforløp forsvarlig ved bytte, må avgjøres faglig (K2-2).`,
      { art: 'bindende_krav', henvisninger: [NICE.andel, NICE.flytende, RCPSYCH.lavDose, NICE.bytte] },
    ),
    grunnlag: {
      type: 'ousfar_vurdering',
      begrunnelse: `Seponering av ${fra.nokkel} ved bytte krever en faglig avgjørelse av sluttrinnet for dette avgrensede omfanget. Uten den beregner regelen ingen seponering, og planen er ikke komplett.`,
      henvisninger: [NICE.tempo, NICE.bytte],
      avklaring: null,
    },
  }
}

/**
 * Det som kan gjøre siste trinn av det gamle SSRI-et forsvarlig ved bytte: et
 * nytt legemiddel med samme virkningsmekanisme som startes dagen etter, med
 * begrunnelsen, kildene og oppfølgingen. Det gir en forventet, ikke garantert,
 * fortsatt virkning. Uten dekning har sluttrinnet ingen verdi
 * ({@link sluttrinnVedBytte}).
 */
interface Dekning {
  nytt: string
  begrunnelse: string
  henvisninger: Kildehenvisning[]
  /** Oppfølging etter siste dose av det gamle SSRI-et. */
  etter_seponering: Vurderingspunkt[]
}

const stor = (x: string) => `${x[0]!.toUpperCase()}${x.slice(1)}`

/**
 * Nedtrappingen av SSRI-et: halvering hver 14. dag ned til laveste
 * tablettdose, som holdes ett trinn; seponering bare med et sluttrinn som har
 * en verdi ({@link sluttrinnVedBytte}).
 */
function nedtrappingTilSeponering(fra: Fra, dekning?: Dekning): Forlop {
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
            `Halveringen stopper ved ${fra.sluttdose.mg} mg, laveste dose i preparatomtalen og laveste dose som kan gis med hele tabletter av styrkene i FEST. Dosen er ingen seponeringsgrense; seponeringen herfra er et eget valg (sluttrinnet ved bytte, K2-2).`,
            { henvisninger: [fra.sluttdose.henvisning, NICE.andel] },
          ),
        ),
        trinnlengde: trinn14('Ved bytte åpner NICE for raskere nedtrapping enn ved seponering; OUSFAR foreslår nedre del av RCPsychs to til fire uker. Dagene er minstetider: neste reduksjon først når toleransen er vurdert.', {
          henvisninger: [NICE.bytte, fra.seponering],
        }),
        avslutning: sluttrinnVedBytte(fra, dekning),
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
      ...(dekning?.etter_seponering ?? []),
    ],
  }
}

/** Når respons på det nye legemidlet kan vurderes, etter preparatomtalen. */
interface Respons {
  /** Hvorfor fire uker, med preparatomtalens egne ord om responstiden. */
  begrunnelse: string
  henvisninger: Kildehenvisning[]
}

/**
 * Oppfølgingen av det nye legemidlet: effekt, toleranse og
 * seponeringssymptomer etter det gamle SSRI-et før hver økning i planen, og
 * respons og bivirkninger fire uker etter oppstarten og etter hver
 * doseendring. Vedlikeholdsdosen er forskriverens valg og kan justeres.
 */
function oppfolgingAvNyttLegemiddel(navn: string, fra: Fra, respons: Respons, okning: Kildehenvisning[]): Vurderingspunkt[] {
  return [
    {
      id: 'for_okning',
      nar: { type: 'for_hvert_trinn' },
      tekst: `Vurder effekten av ${navn} så langt og om økningen fortsatt trengs, hvordan ${navn} tåles, og om pasienten har seponeringssymptomer etter ${fra.nokkel}.`,
      ved_funn: `Vedlikeholdsdosen er forskriverens valg og kan justeres. Er effekten tilstrekkelig, beholdes dosen. Ved dårlig toleranse eller seponeringssymptomer økes den ikke nå, men vurderes på nytt senere; ved vedvarende plager planlegges byttet individuelt.`,
      grunnlag: { type: 'kilde', henvisninger: [...okning, fra.seponering] },
    },
    {
      id: 'respons',
      nar: {
        type: 'etter_endring',
        dager: forslag(28, 'dager', `Respons og bivirkninger av ${navn} vurderes fire uker etter oppstarten og etter hver doseendring: ${respons.begrunnelse}`, {
          omrade: [14, 28],
          henvisninger: respons.henvisninger,
        }),
      },
      tekst: `Vurder respons og bivirkninger av ${navn}.`,
      ved_funn: 'Uten tilstrekkelig respons vurderes videre behandling etter preparatomtalen; det er utenfor denne planen.',
      grunnlag: { type: 'kilde', henvisninger: respons.henvisninger },
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

/**
 * Lengste sammenhengende bruk av det gamle SSRI-et (uker) som byttereglene er
 * vurdert for: en avgrensning av K2-omfanget, OUSFARs forslag uten kilde og åpent
 * til det er avklart ({@link felleUnntak}). Det er ingen ny felles definisjon av
 * kort behandlingstid; de andre verktøyene spør fortsatt {@link LANG_BEHANDLINGSTID}.
 */
export const KORT_BEHANDLINGSTID_UKER = 8

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
      tekst: `Pasienten har brukt ${fra.nokkel} sammenhengende i mer enn ${KORT_BEHANDLINGSTID_UKER} uker. Byttet er bare vurdert for de første ${KORT_BEHANDLINGSTID_UKER} ukene av behandlingen; etter lengre bruk planlegges det individuelt, og etter mange måneder anbefales mindre reduksjoner og langsommere, symptomstyrt nedtrapping.`,
      grunnlag: {
        type: 'ousfar_vurdering',
        begrunnelse:
          `RCPsych skiller mellom bruk i bare noen uker, der nedtrapping og seponering ofte kan skje over omtrent en måned, og bruk i mange måneder eller år, der nedtrappingen går langsommere, men gir ingen eksakt grense. ` +
          `OUSFAR foreslår ${KORT_BEHANDLINGSTID_UKER} uker som kontrollerbar grense for byttereglene: den øvre delen av «noen uker», før «mange måneder». Grensen er OUSFARs valg, ikke en verdi fra kildene. ` +
          `Den avgrenser bare disse reglene og er ingen ny felles definisjon av kort behandlingstid: «Trappe ned» spør fortsatt «${LANG_BEHANDLINGSTID.tekst}». En pasient som har brukt legemidlet lenger enn ${KORT_BEHANDLINGSTID_UKER} uker, men ikke i mange måneder, kan derfor få en plan der og ikke her. En eventuell felles grense må avgjøres for alle verktøyene samtidig (K2-8).`,
        henvisninger: [RCPSYCH_K2.kort, RCPSYCH.langvarig, RCPSYCH.fireUker],
        avklaring: null,
      },
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

/**
 * Regneeksempelet for en startdose og vedlikeholdsdose i omfanget: uten
 * avgjort sluttrinn (K2-2) seponeres ikke det gamle SSRI-et, og regelen gir
 * ingen plan. Planene et avgjort sluttrinn ville gitt, står i
 * kontrollgrunnlaget og er ikke del av regelen.
 */
function utenSluttrinn(fra: Fra, til: string, bekreftet: string[], unntak: Unntak[], startdose: number, maldose: number): Regneeksempel {
  return {
    id: `fra-${startdose}-mg-til-${maldose}-mg`,
    beskrivelse: `${fra.nokkel} ${startdose} mg til ${til} ${maldose} mg: halveringen når ${fra.sluttdose.mg} mg, men uten avgjort sluttrinn seponeres ikke ${fra.nokkel}, og planen stopper før en delplan.`,
    inndata: besvart(bekreftet, unntak, maldose, startdose),
    forventet: {},
    stopp: /avslutning\.fra_hoyst_mg mangler og må avklares faglig/,
  }
}

/** Den syntetiske dosen kasusene bruker når en regel skal stoppe av en annen grunn enn dosen. */
const forsteDose = (fra: Fra) => fra.startdoser.at(-1)!

/* --- SSRI → mirtazapin, kryssnedtrapping ------------------------------------------------------- */

const MIRTAZAPIN = { navn: 'mirtazapin', eldre: PREPARATOMTALE.remeronEldre, lever: PREPARATOMTALE.remeronNyreLever }
const MIRTAZAPIN_MALDOSER = [15, 30]
/** Tablettstyrkene av mirtazapin i FEST (mg) da reglene ble laget; 45 mg brukes ikke i planene. */
const MIRTAZAPIN_STYRKER = [15, 30, 45]
const BEKREFTET_MIRTAZAPIN = ['indikasjon', 'toleranse_overlapp', 'serotonerg_sammedisinering']
const MIRTAZAPIN_RESPONS: Respons = {
  begrunnelse: 'ved slutten av de 2–4 ukene preparatomtalen oppgir før respons kan ventes.',
  henvisninger: [PREPARATOMTALE.remeronRespons],
}

/**
 * Det godkjente startforløpet fra sertralin til mirtazapin (pilotsettet,
 * versjon 10) er en delplan. Den komplette regelen erstatter det, så motoren
 * trekker det i samme øyeblikk som den komplette regelen er gyldig godkjent.
 */
export const STARTFORLOP_SERTRALIN_MIRTAZAPIN = 'kryssnedtrapping-sertralin-mirtazapin'

/** `erstatter`: eldre regler for samme bytte som denne regelen trekker når den godkjennes. */
export function ssriTilMirtazapin(fra: Fra, erstatter?: string[]): Regel {
  const unntak: Unntak[] = [
    ...felleUnntak(fra, MIRTAZAPIN),
    {
      id: 'nedsatt_nyrefunksjon',
      tekst: 'Pasienten har kreatininclearance under 40 ml/min. Clearance av mirtazapin kan da være nedsatt, så byttet planlegges individuelt.',
      grunnlag: { type: 'kilde', henvisninger: [PREPARATOMTALE.remeronNyreLever] },
    },
  ]
  const eksempel = (startdose: number, maldose: number) => utenSluttrinn(fra, 'mirtazapin', BEKREFTET_MIRTAZAPIN, unntak, startdose, maldose)

  const lav = fra.startdoser[0]!
  const hoy = forsteDose(fra)
  return {
    id: `bytte-${fra.nokkel}-mirtazapin`,
    versjon: 1,
    tittel: `Bytte fra ${fra.nokkel} til mirtazapin, kryssnedtrapping til seponering`,
    ...(erstatter ? { erstatter } : {}),
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
          vurderinger: oppfolgingAvNyttLegemiddel('mirtazapin', fra, MIRTAZAPIN_RESPONS, [KEKS.kryss, PREPARATOMTALE.remeronRespons]),
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
          `OUSFAR halverer ${fra.nokkel} hver 14. dag ned til ${fra.sluttdose.mg} mg, gir den dosen i 14 dager og seponerer derfra først når sluttrinnet ved bytte er avgjort faglig (K2-2). Mirtazapin 15 mg gis fra dag 1 og holdes til siste dose ${fra.nokkel}.`,
          NICE.andel,
          NICE.bytte,
          fra.sluttdose.henvisning,
          SPC.remeronDose,
        ),
        utsagn('Dagen etter siste dose av SSRI-et går mirtazapin til vedlikeholdsdosen forskriveren har valgt, 15 eller 30 mg. Planen er da fullført; en eventuell økning til 45 mg er en senere, responsstyrt vurdering.', KEKS.kryss, PREPARATOMTALE.remeronRespons),
        utsagn(
          `Planen gjelder bare de første ${KORT_BEHANDLINGSTID_UKER} ukene av sammenhengende bruk, uten tidligere seponeringsplager, voksne til og med 65 år og normal lever- og nyrefunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.`,
          RCPSYCH_K2.kort,
          RCPSYCH.langvarig,
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
        stopp: new RegExp(`Regelen gjelder ikke: Pasienten har brukt ${fra.nokkel} sammenhengende i mer enn ${KORT_BEHANDLINGSTID_UKER} uker`),
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
/** Dager uten SSRI mellom siste dose av det gamle og første dose sertralin: ingen, sertralin startes dagen etter. */
const UTVASKING_DAGER = 0
/** Dager etter siste dose av det gamle SSRI-et da overgangen vurderes. */
const OVERGANG_VURDERES_DAG = 7
const SERTRALIN_RESPONS: Respons = {
  begrunnelse:
    'preparatomtalen oppgir at effekten kan ses i løpet av sju dager, men at det vanligvis trengs lengre observasjonstid for å vise terapeutisk effekt. Fire uker er OUSFARs valg innenfor det.',
  henvisninger: [PREPARATOMTALE.zoloftRespons],
}

/**
 * Dekningen ved (es)citalopram → sertralin: sertralin 50 mg dagen etter siste
 * dose ventes å holde SERT-hemmingen oppe, men det er ikke garantert at det
 * hindrer seponeringssymptomer eller forverring, så den første uken følges tett
 * og planen justeres individuelt. OUSFARs forslag til kontrolløren (K2-2, K2-4).
 */
function overgangTilSertralin(fra: Fra, overgang: Overgang): Dekning {
  const t = overgang.timer
  return {
    nytt: 'sertralin',
    begrunnelse:
      `Seponering fra ${fra.sluttdose.mg} mg med direkte overgang: siste dose ${fra.nokkel} er ${fra.sluttdose.mg} mg, og sertralin 50 mg startes dagen etter. Siste trinn er 100 % av den ordinerte dosen ${fra.nokkel}. ` +
      `Sertralin 50 mg er preparatomtalens startdose ved depresjon, og ved minste vanlige SSRI-dose er SERT-bindingen omtrent 80 % (Sørensen mfl.); ${fra.nokkel} elimineres dessuten gradvis over flere døgn (halveringstid omtrent ${t} timer). ` +
      `SERT-hemmingen ventes derfor å fortsette etter overgangen, men det er ikke garantert at den hindrer seponeringssymptomer eller forverring: Keks mfl. regner seponeringssymptomer som sannsynlige ved direkte bytte, avhengig av det nye legemidlet, og RCPsych beskriver at de kan komme også etter kort bruk. ` +
      `Keks mfl. regner bytte fra ett SSRI med kort halveringstid til et annet som et av de utvalgte tilfellene der direkte bytte kan brukes, og utvasking som ikke nødvendig mellom disse SSRI-ene når byttet gjøres forsiktig og under nær oppfølging. ` +
      `Nedtrappingen til ${fra.sluttdose.mg} mg først gjør overlappen i eksponering de første dagene liten. Den første uken etter overgangen følges seponeringssymptomer, serotonerg belastning og forverring, og planen justeres individuelt ved plager.`,
    henvisninger: [KEKS.direkte, KEKS.direkteRisiko, KEKS.utenUtvasking, KEKS.ssriSsri, LITTERATUR.hyperbolsk, RCPSYCH_K2.kortRisiko, PREPARATOMTALE.zoloftStart, overgang.henvisning],
    etter_seponering: [
      {
        id: 'etter_overgang',
        nar: {
          type: 'etter_seponering',
          dager: forslag(
            OVERGANG_VURDERES_DAG,
            'dager',
            `En uke etter siste dose ${fra.nokkel}, når sertralin er tatt i en uke: seponeringssymptomer kommer vanligvis de første dagene etter seponering, og overlappen i eksponering for de to SSRI-ene er da i hovedsak over (omtrent ${tall5(t)} halveringstider). OUSFARs valg; dagen kan fremskyndes ved symptomer.`,
            { omrade: [3, 7], henvisninger: [overgang.symptomer, KEKS.forsiktig, KEKS.direkte, overgang.henvisning] },
          ),
        },
        tekst: `Vurder seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen etter overgangen fra ${fra.nokkel} til sertralin.`,
        ved_funn:
          'Ved plagsomme seponeringssymptomer eller forverring planlegges det videre forløpet individuelt, og en eventuell økning av sertralin venter til symptomene er vurdert. Ved tegn på serotonerg belastning vurderes sertralin og øvrige legemidler straks.',
        grunnlag: { type: 'kilde', henvisninger: [overgang.symptomer, KEKS.forsiktig, KEKS.direkteRisiko] },
      },
    ],
  }
}

/** Antall halveringstider på en uke, med én desimal. */
const tall5 = (timer: number) => ((OVERGANG_VURDERES_DAG * 24) / timer).toFixed(1).replace('.', ',')

/** Doselinjene i nedtrappingen: halvering hver 14. dag ned til sluttdosen, holdt ett trinn, og seponering. */
function nedtrappingslinjer(startdose: number, sluttdose: number): { linjer: string[]; sisteDag: number } {
  const linjer: string[] = []
  let dag = 1
  for (let mg = startdose / 2; mg >= sluttdose; mg /= 2) {
    linjer.push(`dag ${dag}–${dag + 13}: ${mg} mg`)
    dag += 14
  }
  return { linjer: [...linjer, `fra dag ${dag}: seponert`], sisteDag: dag - 1 }
}

export function ssriTilSertralin(fra: Fra): Regel {
  const unntak = felleUnntak(fra, SERTRALIN_TIL)
  const overgang = OVERGANG[fra.nokkel]
  if (!overgang) throw new Error(`${fra.nokkel}: halveringstiden og symptomtiden overgangen bygger på, mangler`)
  const eksempel = (startdose: number, maldose: number): Regneeksempel => {
    const { linjer, sisteDag } = nedtrappingslinjer(startdose, fra.sluttdose.mg)
    const start = sisteDag + UTVASKING_DAGER + 1
    return {
      id: `fra-${startdose}-mg-til-${maldose}-mg`,
      beskrivelse: `${fra.nokkel} ${startdose} mg til sertralin ${maldose} mg: halvering hver 14. dag til ${fra.sluttdose.mg} mg og seponering, sertralin 50 mg fra dagen etter${maldose === 50 ? ' som fortsetter' : ` i 14 dager og deretter ${maldose} mg`}.`,
      inndata: besvart(BEKREFTET_SERTRALIN, unntak, maldose, startdose),
      forventet: { fra: linjer, til: maldose === 50 ? [`fra dag ${start}: 50 mg`] : [`dag ${start}–${start + 13}: 50 mg`, `fra dag ${start + 14}: ${maldose} mg`] },
    }
  }

  const lav = fra.startdoser[0]!
  const hoy = forsteDose(fra)
  return {
    id: `bytte-${fra.nokkel}-sertralin`,
    versjon: 1,
    tittel: `Bytte fra ${fra.nokkel} til sertralin, nedtrapping og direkte overgang`,
    fra: { type: 'virkestoff', nokkel: fra.nokkel },
    til: { type: 'virkestoff', nokkel: 'sertralin' },
    plan: {
      form: 'sekvensielt',
      forlop: [
        nedtrappingTilSeponering(fra, overgangTilSertralin(fra, overgang)),
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
              `Ingen dager uten SSRI: sertralin startes dagen etter siste dose ${fra.nokkel} (direkte overgang etter nedtrapping til ${fra.sluttdose.mg} mg). Keks mfl. regner utvasking som ikke nødvendig fra ett av disse SSRI-ene til et annet når byttet gjøres forsiktig og under nær oppfølging. ` +
                `Moderat bytte med 2–4 dager uten legemiddel er vurdert og ikke valgt: det har lavest interaksjonsrisiko, men i dagene uten SSRI kan seponeringssymptomer komme uten noe SSRI, mens ${fra.nokkel} bare er delvis eliminert (halveringstid omtrent ${overgang.timer} timer). ` +
                'Kryssnedtrapping med to SSRI-er i terapeutisk dose samtidig er heller ikke valgt, fordi det gir størst serotonerg belastning. Lengre halveringstid hos eldre og ved nedsatt leverfunksjon er utenfor omfanget (unntakene) (K2-4).',
              { art: 'bindende_krav', henvisninger: [KEKS.utenUtvasking, KEKS.direkte, KEKS.moderat, KEKS.utvasking, overgang.henvisning] },
            ),
          },
          faser: [
            {
              type: 'hold',
              dose: { type: 'fast', mg: kilde(50, 'mg', 'veiledende_preferanse', PREPARATOMTALE.zoloftStart) },
              varighet: {
                type: 'dager',
                dager: forslag(
                  14,
                  'dager',
                  'Preparatomtalen krever minst én uke mellom doseendringer, og effekten trenger vanligvis lengre observasjonstid enn én uke. OUSFAR foreslår 14 dager på 50 mg før en eventuell økning, så effekt, toleranse og seponeringssymptomer etter overgangen kan vurderes først; dagene er minstetider.',
                  {
                    omrade: [7, 28],
                    henvisninger: [PREPARATOMTALE.zoloftOkning, PREPARATOMTALE.zoloftRespons],
                  },
                ),
              },
            },
            { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
          ],
          vurderinger: oppfolgingAvNyttLegemiddel('sertralin', fra, SERTRALIN_RESPONS, [PREPARATOMTALE.zoloftOkning, PREPARATOMTALE.zoloftRespons, PREPARATOMTALE.zoloftVedlikehold]),
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
            'Forskriveren velger vedlikeholdsdosen 50 eller 100 mg. Sertralin startes med 50 mg, preparatomtalens startdose ved depresjon, og 100 mg er én økning på 50 mg, som preparatomtalen beskriver ved manglende respons på 50 mg. Før økningen vurderes effekt, toleranse og seponeringssymptomer, og valget kan justeres der. Høyere doser er senere, responsstyrte økninger og ingen del av planen.',
          henvisninger: [PREPARATOMTALE.zoloftStart, PREPARATOMTALE.zoloftOkning, PREPARATOMTALE.zoloftVedlikehold],
          avklaring: null,
        },
      },
    ],
    bekreftelser: [
      bekreftelseIndikasjon([PREPARATOMTALE.zoloftStart, fra.dose]),
      {
        id: 'toleranse_bytte',
        tekst: `Pasienten følges opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av ${fra.nokkel}, en uke etter overgangen til sertralin, før en eventuell økning av sertralin (effekt, toleranse og seponeringssymptomer) og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Den første uken etter overgangen følges seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen.`,
        grunnlag: { type: 'kilde', henvisninger: [NICE.tempo, RCPSYCH.tid, KEKS.direkte, KEKS.forsiktig, PREPARATOMTALE.zoloftRespons] },
      },
      bekreftelseSammedisinering(fra, 'sertralin'),
    ],
    unntak,
    beregnbarhet: 'beregnbar_etter_avklaring',
    fortolkning: {
      kildetro: [
        utsagn(`${fra.nokkel[0]!.toUpperCase()}${fra.nokkel.slice(1)} trappes ned gradvis, over minst én til to uker.`, fra.seponering),
        utsagn('Fra et SSRI til et annet: det første trappes ned, og det nye startes i lav dose.', KEKS.ssriSsri),
        utsagn('Mellom disse SSRI-ene er utvasking ikke nødvendig når byttet gjøres forsiktig og under nær oppfølging, og kliniske forhold støtter det.', KEKS.utenUtvasking),
        utsagn('Direkte bytte, der det nye startes dagen etter, passer i utvalgte tilfeller som bytte fra ett SSRI med kort halveringstid til et annet; seponeringssymptomene og interaksjonsrisikoen avhenger av det nye legemidlet.', KEKS.direkte, KEKS.direkteRisiko),
        utsagn('SERT-bindingen flater ut ved omtrent 80 % rundt minste vanlige dose.', LITTERATUR.hyperbolsk),
        utsagn('Sertralin startes med 50 mg ved depresjon og økes i trinn på 50 mg med minst én ukes mellomrom.', PREPARATOMTALE.zoloftStart, PREPARATOMTALE.zoloftOkning),
        utsagn('Effekten av sertralin kan ses i løpet av sju dager, men vanligvis trengs lengre observasjonstid for å vise terapeutisk effekt.', PREPARATOMTALE.zoloftRespons),
        utsagn('Seponeringssymptomer kan komme også etter kort bruk; de kommer vanligvis de første dagene etter seponering og går vanligvis over innen to uker.', RCPSYCH_K2.kortRisiko, overgang.symptomer),
      ],
      tilpasninger: [
        utsagn(
          `OUSFAR halverer ${fra.nokkel} hver 14. dag ned til ${fra.sluttdose.mg} mg, gir den dosen i 14 dager og seponerer derfra med direkte overgang til sertralin dagen etter (K2-2). Sertralin ventes å holde SERT-hemmingen oppe, men det er ikke garantert at det hindrer seponeringssymptomer; de følges tett den første uken, og planen justeres individuelt ved plager.`,
          NICE.andel,
          NICE.bytte,
          KEKS.direkte,
          KEKS.direkteRisiko,
          LITTERATUR.hyperbolsk,
          RCPSYCH_K2.kortRisiko,
        ),
        utsagn(
          `Dagen etter siste dose ${fra.nokkel} startes sertralin 50 mg. Har forskriveren valgt 100 mg, økes dosen tidligst etter 14 dager, når effekt, toleranse og seponeringssymptomer er vurdert; planen er da fullført. Vedlikeholdsdosen kan justeres ved vurderingen, og høyere doser er senere, responsstyrte vurderinger.`,
          KEKS.utenUtvasking,
          PREPARATOMTALE.zoloftStart,
          PREPARATOMTALE.zoloftOkning,
          PREPARATOMTALE.zoloftRespons,
        ),
        utsagn(
          'OUSFAR har valgt nedtrapping til laveste tablettdose og så direkte overgang, ikke moderat bytte med dager uten SSRI eller kryssnedtrapping med to SSRI-er i terapeutisk dose samtidig: nedtrappingen gjør overlappen i eksponering liten, og sertralin ventes å gi fortsatt SERT-hemming i dagene etter siste dose. Seponeringssymptomer kan likevel komme.',
          KEKS.direkte,
          KEKS.utenUtvasking,
          KEKS.moderat,
        ),
        utsagn(
          `Planen gjelder bare de første ${KORT_BEHANDLINGSTID_UKER} ukene av sammenhengende bruk, uten tidligere seponeringsplager, voksne til og med 65 år og normal leverfunksjon, med tabletter for begge legemidlene. Alt annet stopper, og byttet planlegges individuelt.`,
          RCPSYCH_K2.kort,
          RCPSYCH.langvarig,
          NICE.tidligere,
        ),
      ],
      forutsetninger: [
        ...FORUTSETNINGER_FELLES,
        `Pasienten bruker ${fra.nokkel} i én av dosene ${fra.startdoser.join(' og ')} mg daglig, som tabletter.`,
        'Dagene er minstetider. Kommer det plagsomme seponeringssymptomer eller forverring, går pasienten tilbake til forrige dose og byttet planlegges på nytt.',
      ],
      usikkerhet: [
        'De første dagene etter overgangen bruker pasienten sertralin mens det gamle SSRI-et fortsatt elimineres; Keks mfl. regner interaksjonsrisikoen ved direkte bytte som betydelig, avhengig av det nye legemidlet. Nedtrappingen til laveste tablettdose først gjør overlappen liten, men ingen kilde tallfester den.',
        'At sertralin 50 mg kan dempe seponeringssymptomene etter det gamle SSRI-et, bygger på at begge hemmer SERT og at bindingen flater ut rundt minste vanlige dose; ingen kilde har målt seponeringssymptomer ved akkurat denne overgangen, og symptomene kan komme likevel.',
        `Grensen på ${KORT_BEHANDLINGSTID_UKER} uker er OUSFARs valg uten kilde: RCPsych skiller bare mellom «noen uker» og «mange måneder eller år». Den avgrenser bare byttereglene; «Trappe ned» spør om «mange måneder eller lenger», så de to verktøyene kan avgrense samme pasient ulikt (K2-8).`,
        'RCPsych og Keks mfl. beskriver nedtrapping over omtrent fire uker; fra laveste startdose tar planen to uker. Om det er forsvarlig ved bytte, er et spørsmål til faglig kontroll.',
      ],
    },
    referanser: [pn(`SwitchAntidepressants:${fra.kort}>Se`)],
    eksempler: [
      eksempel(hoy, 100),
      eksempel(lav, 50),
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
    'Komplette bytter mellom antidepressiva (K2): fra pasientens nåværende dose til seponering av det gamle legemidlet og en valgt vedlikeholdsdose av det nye. Fem regler i to familier, til uavhengig faglig kontroll; ingen er klinisk godkjent. Til sertralin har sluttrinnet et konkret forslag (direkte overgang med tett oppfølging den første uken); til mirtazapin er det ikke avgjort, og planene stopper.',
  regler: [ssriTilMirtazapin(SERTRALIN, [STARTFORLOP_SERTRALIN_MIRTAZAPIN]), ssriTilMirtazapin(ESCITALOPRAM), ssriTilMirtazapin(CITALOPRAM), ssriTilSertralin(ESCITALOPRAM), ssriTilSertralin(CITALOPRAM)],
}

export const ANTIDEPRESSIVBYTTER: Domenesett = {
  sett: BYTTESETT,
  rapport: {
    fil: 'docs/verktøy-k2-antidepressivbytter-regler.md',
    tittel: 'K2: komplette bytter mellom antidepressiva (til faglig kontroll)',
    notater: ['docs/verktøy-k2-antidepressivbytter.md', 'docs/verktøy-k2-kontrollgrunnlag.md', 'docs/verktøy-p4-regelmodell.md'],
  },
}
