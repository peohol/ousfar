/**
 * Tilleggsreglene for verktøyet «Kombinere stemningsstabiliserende» (K4 i
 * `docs/verktøy-klinisk-leveranseplan-2026-11.md`): planer for å legge et
 * stemningsstabiliserende legemiddel til et pasienten allerede bruker, i
 * kildetabellens retning **eksisterende legemiddel → legemiddel som legges
 * til**. Det eksisterende legemidlet fortsetter uendret; planen endrer det
 * aldri. Det som legges til, trappes opp til en definert stabiliserende dose.
 *
 * Første leveranse er lamotrigin lagt til valproat og lagt til litium, begge
 * etter opptrappingstabellen for bipolar lidelse i den norske
 * preparatomtalen for Lamictal (tabell 3, pkt. 4.2), med
 * interaksjonsgrunnlaget i pkt. 4.5 og forsiktighetsreglene i pkt. 4.4.
 * Opptrappingen avhenger bare av hvilken gruppe det eksisterende legemidlet
 * hører til (hemmer, induserer eller verken hemmer eller induserer
 * lamotrigin-glukuronidering), så én felles byggefunksjon lager reglene, og
 * et nytt par i samme gruppe er én oppføring. Hvert par må likevel
 * kontrolleres faglig for seg før det kan godkjennes.
 *
 * Planen bruker bare Lamictal tyggetabletter/dispergerbare tabletter (FEST-form
 * 524), som er de markedsførte formene i Norge; vanlige lamotrigintabletter
 * krever godkjenningsfritak. Ingen dose deles: alle dosene i planen er hele
 * tabletter. Psychiatrienet står bare som referanse til kildeoppføringen fra
 * P3; ingen regel bygger på eller gjengir teksten der.
 *
 * **Ingen av reglene er klinisk godkjent.** De er sendt til uavhengig faglig
 * kontroll; til da gir verktøyet ingen plan for dem.
 */
import { FORUTSETNINGER_FELLES, h, kilde, pn, steg, utsagn } from './bygg'
import type { Domenesett } from './domenesett'
import type { Bekreftelse, Forlop, Godkjenning, Inndatakrav, Kildehenvisning, Regel, Regelsett, Regneeksempel, Sporsmal, Unntak, Vurderingspunkt } from './modell'
import { REGELMODELLVERSJON } from './modell'

/* --- Kildene ---------------------------------------------------------------------- */

const LAMICTAL_BIPOLAR = 'pkt. 4.2, Bipolar lidelse, tabell 3'

/** Fakta fra Lamictal-preparatomtalen, med egne ord. */
export const LAMICTAL = {
  hemmer: h(
    'dmp-lamictal',
    LAMICTAL_BIPOLAR,
    'Sammen med valproat: 12,5 mg/dag (25 mg annenhver dag) uke 1–2, 25 mg/dag uke 3–4, 50 mg/dag uke 5 og 100 mg/dag fra uke 6 som vanlig måldose. Gjelder uavhengig av andre legemidler.',
  ),
  hemmerMaks: h('dmp-lamictal', LAMICTAL_BIPOLAR, 'Sammen med valproat kan høyst 200 mg/dag brukes, avhengig av klinisk respons.'),
  noytral: h(
    'dmp-lamictal',
    LAMICTAL_BIPOLAR,
    'Uten valproat og uten legemidler som induserer lamotrigin-glukuronidering: 25 mg/dag uke 1–2, 50 mg/dag uke 3–4, 100 mg/dag uke 5 og 200 mg/dag fra uke 6 som vanlig måldose.',
  ),
  noytralOmrade: h('dmp-lamictal', LAMICTAL_BIPOLAR, 'Uten valproat og uten induserende legemidler er doser på 100–400 mg/dag brukt i kliniske studier.'),
  induserer: h(
    'dmp-lamictal',
    LAMICTAL_BIPOLAR,
    'Fenytoin, karbamazepin, fenobarbital, primidon, rifampicin og lopinavir/ritonavir induserer lamotrigin-glukuronidering og krever en egen, raskere opptrapping uten valproat.',
  ),
  ukjent: h('dmp-lamictal', LAMICTAL_BIPOLAR, 'Ved samtidig bruk av legemidler med ukjent farmakokinetisk interaksjon med lamotrigin skal opptrappingen for samtidig valproat brukes.'),
  respons: h('dmp-lamictal', LAMICTAL_BIPOLAR, 'Den stabiliserende måldosen avhenger av klinisk respons.'),
  fordeling: h('dmp-lamictal', LAMICTAL_BIPOLAR, 'Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser.'),
  ikkeOverskrid: h('dmp-lamictal', 'pkt. 4.2, Bipolar lidelse', 'Startdosen og doseøkningen skal ikke overskrides, på grunn av risikoen for hudutslett.'),
  helTablett: h('dmp-lamictal', 'pkt. 4.2, Dosering', 'Tyggetablettene/de dispergerbare tablettene skal ikke gis som delmengder; en dose som ikke gir hele tabletter, rundes ned.'),
  gjenopptatt: h(
    'dmp-lamictal',
    'pkt. 4.2, Gjenopptatt behandling',
    'Er det gått mer enn fem halveringstider siden siste dose, titreres lamotrigin som ved oppstart; kortere opphold krever en egen vurdering av doseøkningen.',
  ),
  under18: h('dmp-lamictal', 'pkt. 4.1 og 4.2, Barn og ungdom under 18 år', 'Ved bipolar lidelse er lamotrigin indisert for voksne over 18 år og ikke anbefalt under 18 år.'),
  lever: h('dmp-lamictal', 'pkt. 4.2, Nedsatt leverfunksjon', 'Ved moderat og alvorlig nedsatt leverfunksjon reduseres start-, opptrappings- og vedlikeholdsdosene med ca. 50 % og 75 %.'),
  nyre: h('dmp-lamictal', 'pkt. 4.2, Nedsatt nyrefunksjon', 'Forsiktighet ved nyresvikt; ved nyresvikt i siste fase skal startdosene bygge på pasientens øvrige legemidler, og en lavere vedlikeholdsdose kan være effektiv.'),
  hormonell: h(
    'dmp-lamictal',
    'pkt. 4.2, Kvinner som bruker hormonelle antikonseptiva',
    'Oppstart hos kvinner som allerede bruker hormonell prevensjon følger vanlig opptrapping, men etter titreringen kan vedlikeholdsdosen måtte bli opptil dobbelt så høy.',
  ),
  utslett: h(
    'dmp-lamictal',
    'pkt. 4.4, Hudutslett',
    'Utslett kommer vanligvis de første åtte ukene. Alle med utslett skal utredes straks, og lamotrigin seponeres med mindre utslettet klart ikke skyldes lamotrigin.',
  ),
  utslettRisiko: h('dmp-lamictal', 'pkt. 4.4, Hudutslett', 'Risikoen for utslett er særlig knyttet til høy startdose, raskere doseøkning enn anbefalt og samtidig bruk av valproat.'),
  overfolsomhet: h('dmp-lamictal', 'pkt. 4.4, Hudutslett', 'Feber og hovne lymfeknuter kan være tidlige tegn på overfølsomhet (DRESS) også uten utslett; pasienten skal da utredes straks.'),
  aldriIgjen: h(
    'dmp-lamictal',
    'pkt. 4.4, Hudutslett',
    'Etter Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt på lamotrigin skal det ikke gjenopptas; etter annet utslett bare om nytten klart oppveier risikoen.',
  ),
  hla: h('dmp-lamictal', 'pkt. 4.4, Hudutslett', 'Hos pasienter som er kjent positive for HLA-B*1502, skal bruken av lamotrigin vurderes nøye.'),
  suicid: h('dmp-lamictal', 'pkt. 4.4, Forverring ved bipolar lidelse', 'Pasienter med bipolar lidelse skal følges nøye for klinisk forverring og selvmordstanker, særlig ved oppstart og doseendring.'),
  graviditet: h(
    'dmp-lamictal',
    'pkt. 4.6',
    'Kvinner som kan bli gravide, bør rådføre seg med spesialist. Under graviditet anbefales lavest mulig terapeutiske dose, og serumkonsentrasjonen bør følges før, under og etter graviditeten.',
  ),
  valproatInteraksjon: h('dmp-lamictal', 'pkt. 4.5, tabell 6', 'Valproat hemmer glukuronideringen av lamotrigin og omtrent dobler halveringstiden; det øker konsentrasjonen av lamotrigin.'),
  litiumInteraksjon: h(
    'dmp-lamictal',
    'pkt. 4.5, tabell 6',
    'Litium har liten eller ingen effekt på konsentrasjonen av lamotrigin, og lamotrigin 100 mg/dag endret ikke litiums farmakokinetikk hos friske frivillige.',
  ),
  halveringstid: h('dmp-lamictal', 'pkt. 5.2', 'Halveringstiden er ca. 33 timer alene, ca. 14 timer med induserende legemidler som karbamazepin og ca. 70 timer sammen med bare valproat.'),
} satisfies Record<string, Kildehenvisning>

/** Fakta fra Orfiril-preparatomtalen (valproat), med egne ord. */
export const ORFIRIL = {
  dose: h('dmp-orfiril', 'pkt. 4.2, Maniske episoder ved bipolar lidelse', 'Døgndosen av valproat tilpasses og følges individuelt etter klinisk respons; gjennomsnittlig døgndose er 1000–2000 mg.'),
  fertilAlder: h(
    'dmp-orfiril',
    'pkt. 4.4, Vilkår i det graviditetsforebyggende programmet',
    'Potensialet for graviditet vurderes hos alle kvinnelige pasienter. Vilkårene gjelder også kvinner som ikke er seksuelt aktive, med mindre det er sterke grunner til at det ikke er risiko for graviditet.',
  ),
  ppp: h(
    'dmp-orfiril',
    'pkt. 4.4, Vilkår i det graviditetsforebyggende programmet',
    'Pasienten skal ha forstått og anerkjent risikoen for misdannelser og nevrologiske utviklingsforstyrrelser, ha fått pasientinformasjonsheftet og vite at hun straks skal kontakte lege ved planlagt eller mistenkt graviditet.',
  ),
  prevensjon: h(
    'dmp-orfiril',
    'pkt. 4.4, Prevensjon',
    'Kvinner i fertil alder må bruke sikker prevensjon uten avbrudd i hele behandlingen: minst én sikker, helst brukeruavhengig metode, eller to komplementære metoder med en barrieremetode.',
  ),
  graviditetstest: h('dmp-orfiril', 'pkt. 4.4, Graviditetstest', 'Graviditet må utelukkes med negativ graviditetstest før behandlingsstart, og pasienten skal forstå behovet for graviditetstest under behandlingen ved behov.'),
  arlig: h('dmp-orfiril', 'pkt. 4.4, Årlige behandlingsevalueringer av spesialist', 'Spesialist skal minst årlig vurdere om valproat er den mest egnede behandlingen og gå gjennom risikoskjemaet med pasienten.'),
  ostrogen: h('dmp-orfiril', 'pkt. 4.4, Østrogenholdige produkter', 'Østrogenholdige produkter, også hormonprevensjon, kan redusere effekten av valproat; klinisk respons følges ved oppstart og seponering av dem.'),
  graviditet: h(
    'dmp-orfiril',
    'pkt. 4.3 og 4.4, Graviditetsplanlegging og Ved graviditet',
    'Ved bipolar lidelse er valproat kontraindisert under graviditet. Planlegger kvinnen graviditet, eller blir hun gravid, skal spesialist konsulteres og valproat revurderes, normalt seponeres.',
  ),
  lamotrigin: h('dmp-orfiril', 'pkt. 4.5, Lamotrigin', 'Valproat hemmer omsetningen av lamotrigin, så lamotrigindosen bør reduseres; risikoen for hudreaksjoner ser ut til å øke ved kombinasjonen.'),
  fertil: h(
    'dmp-orfiril',
    'pkt. 4.2, Jenter og kvinner i fertil alder',
    'Valproat skal ikke brukes hos jenter og kvinner i fertil alder med mindre annen behandling ikke virker eller ikke tåles, og forskrives etter det graviditetsforebyggende programmet.',
  ),
} satisfies Record<string, Kildehenvisning>

/** Fakta fra Lithionit-preparatomtalen (litium), med egne ord. */
export const LITHIONIT = {
  styrke: h('dmp-lithionit', 'pkt. 1, 2 og 4.2', 'Hver depottablett inneholder litiumsulfat tilsvarende 42 mg (6 mmol) litium, og skal svelges hel.'),
  vedlikehold: h('dmp-lithionit', 'pkt. 4.2', 'Veiledende vedlikeholdsdose er 4–10 tabletter daglig, justert etter serumlitium; hos eldre kan lavere dose være nødvendig.'),
  serum: h('dmp-lithionit', 'pkt. 4.2', 'Litiumdosen fastlegges etter serumlitium, målt 12 timer etter siste kveldsdose ved steady state, og nyre-, hjerte- og stoffskiftefunksjon følges regelmessig.'),
} satisfies Record<string, Kildehenvisning>

/** Lithionit: litium per tablett, og den høyeste veiledende vedlikeholdsdosen i tabletter (`LITHIONIT.styrke`, `LITHIONIT.vedlikehold`). */
const LITHIONIT_MG = 42
const LITHIONIT_MMOL = 6
const LITHIONIT_MAKS_TABLETTER = 10

/* --- Gruppene -------------------------------------------------------------------- */

/**
 * Hvordan det eksisterende legemidlet påvirker lamotrigin, etter
 * preparatomtalens tabell 3 og 6: valproat hemmer glukuronideringen,
 * enkelte legemidler induserer den, og andre gjør verken eller.
 * Induserende legemidler har ingen regel ennå (se `Lamotrigingruppe`).
 */
export type Lamotrigingruppe = 'hemmer' | 'noytral'

/** Opptrappingen per gruppe: døgndose (mg), hvor mange dager, og om dosen gis annenhver dag. */
interface Opptrappingstrinn {
  mg: number
  dager: number
  /** Dosen gis hver `hver`. dag (2: annenhver dag). */
  hver?: number
}

interface Gruppeplan {
  trinn: Opptrappingstrinn[]
  maldose: number
  /** Den uttrykkelige høyeste døgndosen sammen med det eksisterende legemidlet, når kilden gir en. */
  maks?: { mg: number; henvisning: Kildehenvisning }
  henvisning: Kildehenvisning
}

/** Tabell 3 i preparatomtalen, gruppe for gruppe. */
export const OPPTRAPPING: Record<Lamotrigingruppe, Gruppeplan> = {
  hemmer: {
    trinn: [
      { mg: 25, dager: 14, hver: 2 },
      { mg: 25, dager: 14 },
      { mg: 50, dager: 7 },
    ],
    maldose: 100,
    maks: { mg: 200, henvisning: LAMICTAL.hemmerMaks },
    henvisning: LAMICTAL.hemmer,
  },
  noytral: {
    trinn: [
      { mg: 25, dager: 14 },
      { mg: 50, dager: 14 },
      { mg: 100, dager: 7 },
    ],
    maldose: 200,
    henvisning: LAMICTAL.noytral,
  },
}

/* --- Felles byggesteiner --------------------------------------------------------- */

const TIL_KONTROLL = 'Sendt til uavhengig faglig kontroll av kilder, klinisk innhold, avgrensning og regneeksempler (K4). Ikke klinisk godkjent.'
const UTKAST_DATO = '2026-11-03'

/** Versjon 2 er revidert etter den uavhengige kontrollen av versjon 1 03.11.2026, som ikke godkjente den. */
const VERSJON = 2

const tilKontroll = (): Godkjenning => ({
  status: 'til_faglig_kontroll',
  historikk: [
    steg('utkast', 1, 'Utkast til tilleggsregel (K4).', UTKAST_DATO),
    steg('til_faglig_kontroll', 1, TIL_KONTROLL, UTKAST_DATO),
    steg(
      'utkast',
      VERSJON,
      'Revidert etter den uavhengige kontrollen av versjon 1: måldosen må velges, østrogenholdig behandling må vurderes, dosen av det eksisterende legemidlet er enten kontrollert eller uttrykkelig bare bekreftet, og for valproat bekreftes vilkårene i det graviditetsforebyggende programmet hver for seg.',
      UTKAST_DATO,
    ),
    steg('til_faglig_kontroll', VERSJON, TIL_KONTROLL, UTKAST_DATO),
  ],
})

/** Legemiddelformen i FEST for Lamictal tyggetabletter/dispergerbare tabletter, de markedsførte formene av lamotrigin i Norge. */
export const DISPERGERBARE = '524'

/** Unntakene som gjelder enhver opptrapping av lamotrigin. */
const LAMOTRIGINUNNTAK: Unntak[] = [
  {
    id: 'under_18',
    tekst: 'Pasienten er under 18 år.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.under18] },
  },
  {
    id: 'tidligere_reaksjon',
    tekst: 'Pasienten har tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.aldriIgjen] },
  },
  {
    id: 'bruker_lamotrigin',
    tekst:
      'Pasienten bruker lamotrigin nå, eller har sluttet så nylig at det er under fem halveringstider siden siste dose (ca. 7 døgn alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid). Da er dette ikke en oppstart.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.gjenopptatt, LAMICTAL.halveringstid] },
  },
  {
    id: 'nedsatt_leverfunksjon',
    tekst: 'Pasienten har moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C).',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.lever] },
  },
  {
    id: 'nedsatt_nyrefunksjon',
    tekst: 'Pasienten har betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.nyre] },
  },
  {
    id: 'graviditet',
    tekst: 'Pasienten er gravid, planlegger graviditet eller ammer.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.graviditet] },
  },
  {
    id: 'hla_b1502',
    tekst: 'Pasienten er kjent positiv for HLA-B*1502.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.hla] },
  },
]

/** Det forskriveren må bekrefte før enhver opptrapping av lamotrigin. */
const UTSLETTSINFORMASJON: Bekreftelse = {
  id: 'utslett_informert',
  tekst:
    'Pasienten er informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter.',
  grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.utslett, LAMICTAL.overfolsomhet, LAMICTAL.ikkeOverskrid] },
}

/** Dagen den første stabiliserende måldosen nås: dagen etter siste opptrappingstrinn. */
const maldag = (plan: Gruppeplan) => plan.trinn.reduce((n, t) => n + t.dager, 1)

/** Vurderingspunktene i enhver opptrapping av lamotrigin. */
const lamotriginvurderinger = (plan: Gruppeplan, navn: string): Vurderingspunkt[] => [
  {
    id: 'hud_og_overfolsomhet',
    nar: { type: 'for_hvert_trinn' },
    tekst: 'Før hver doseøkning: spør etter utslett, feber, hovne lymfeknuter og sår i munn eller øyne. Dosen økes bare når pasienten ikke har slike tegn.',
    ved_funn: 'Ved utslett eller tegn på overfølsomhet seponeres lamotrigin straks, med mindre utslettet klart ikke skyldes lamotrigin, og pasienten utredes. Planen gjelder ikke videre.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.utslett, LAMICTAL.overfolsomhet, LAMICTAL.utslettRisiko] },
  },
  {
    id: 'stemningsleie',
    nar: { type: 'for_hvert_trinn' },
    tekst: 'Følg stemningsleiet: forverring av depresjon, nye symptomer og selvmordstanker, særlig ved oppstart og ved hver doseendring.',
    ved_funn: 'Ved klinisk forverring eller selvmordstanker vurderes behandlingen på nytt, inkludert om lamotrigin skal seponeres.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.suicid] },
  },
  {
    id: 'maldose',
    nar: { type: 'dag', dag: kilde(maldag(plan), 'dag', 'bindende_krav', plan.henvisning) },
    tekst: `Den første stabiliserende måldosen som er valgt (${plan.maldose} mg/dag), er nådd. Vurder klinisk respons; videre justering ${
      plan.maks ? `(høyst ${plan.maks.mg} mg/dag sammen med ${navn})` : '(100–400 mg/dag er brukt i studier)'
    } beregnes ikke og planlegges individuelt, uten raskere økning enn preparatomtalen tillater.`,
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.respons, ...(plan.maks ? [plan.maks.henvisning] : [LAMICTAL.noytralOmrade])] },
  },
  {
    id: 'hormonell_prevensjon',
    nar: { type: 'dag', dag: kilde(maldag(plan), 'dag', 'bindende_krav', plan.henvisning) },
    tekst:
      'Bruker pasienten østrogenholdig prevensjon eller hormonbehandling, kan vedlikeholdsdosen etter titreringen måtte bli høyere (opptil det dobbelte), og det kan være aktuelt å måle serumkonsentrasjonen av lamotrigin. Det beregnes ikke.',
    grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.hormonell] },
  },
]

/* --- Regelen ------------------------------------------------------------------------ */

interface Eksisterende {
  /** P1-nøkkelen til legemidlet pasienten allerede bruker. */
  nokkel: string
  /** Navnet i teksten, med liten forbokstav. */
  navn: string
  /** Koden i Combining Moodstabilizers (P1), til referansen. */
  kode: string
  gruppe: Lamotrigingruppe
  /** En syntetisk døgndose (mg) av det eksisterende legemidlet til regneeksemplene; planen endrer den ikke. */
  eksempeldose: number
  /** Det forskriveren må bekrefte om det eksisterende legemidlet. */
  bekreftelser: Bekreftelse[]
  /** Pasientforhold som gjør at regelen ikke gjelder for dette paret, i tillegg til de felles; et med samme id som et felles erstatter det. */
  unntak: Unntak[]
  /** Kildetro utsagn om paret, i tillegg til de felles. */
  kildetro: { tekst: string; henvisninger: Kildehenvisning[] }[]
  /** Forhold som må følges for det eksisterende legemidlet; planen endrer det ikke. */
  forutsetninger: string[]
  /**
   * Dosen pasienten bruker av det eksisterende legemidlet: hva forskriveren
   * bekrefter om den (enhet og preparat), og kravene verktøyet kontrollerer
   * den mot. Uten krav kontrolleres den ikke, og teksten må si det.
   */
  dose: { tekst: string; henvisninger: Kildehenvisning[]; krav?: Inndatakrav[] }
  /** Spørsmål om pasienten som avgjør hvilke bekreftelser som gjelder (`Bekreftelse.ved`). */
  sporsmal?: Sporsmal[]
  /** Det preparatomtalen for det eksisterende legemidlet sier om østrogenholdige legemidler, i tillegg til Lamictal. */
  ostrogen?: Kildehenvisning
}

/** De felles unntakene og parets, der parets erstatter et felles med samme id. */
const unntakFor = (e: Eksisterende): Unntak[] => [...LAMOTRIGINUNNTAK.map((u) => e.unntak.find((x) => x.id === u.id) ?? u), ...e.unntak.filter((x) => !LAMOTRIGINUNNTAK.some((u) => u.id === x.id))]

const dagtekst = (fra: number, dager: number) => (dager === 1 ? `dag ${fra}` : `dag ${fra}–${fra + dager - 1}`)

/** Regneeksemplet som beregner hele planen, og stoppene for hvert unntak og hver manglende bekreftelse. */
function eksempler(e: Eksisterende, plan: Gruppeplan, bekreftet: string[], pasientforhold: Record<string, boolean>, svar: Record<string, boolean>): Regneeksempel[] {
  const startdose_mg = e.eksempeldose
  const maldose_mg = plan.maldose
  let dag = 1
  const linjer = plan.trinn.map((t) => {
    const linje = `${dagtekst(dag, t.dager)}: ${t.mg} mg${t.hver === 2 ? ' annenhver dag' : t.hver ? ` hver ${t.hver}. dag` : ''}`
    dag += t.dager
    return linje
  })
  return [
    {
      id: 'hele-opptrappingen',
      beskrivelse: `Lamotrigin lagt til ${e.navn}: hele opptrappingen til ${plan.maldose} mg/dag fra dag ${dag}; ${e.navn} fortsetter uendret.`,
      inndata: { startdose_mg, maldose_mg, bekreftet, pasientforhold, svar },
      forventet: { fra: [], til: [...linjer, `fra dag ${dag}: ${plan.maldose} mg`] },
    },
    ...unntakFor(e).map((u) => ({
      id: `unntak-${u.id}`,
      beskrivelse: `Regelen gjelder ikke når forholdet gjelder: ${u.tekst}`,
      inndata: { startdose_mg, maldose_mg, bekreftet, pasientforhold: { ...pasientforhold, [u.id]: true }, svar },
      forventet: {},
      stopp: /Regelen gjelder ikke/,
    })),
    {
      id: 'uten-bekreftelser',
      beskrivelse: 'Uten bekreftelsene beregnes ingen plan.',
      inndata: { startdose_mg, maldose_mg, pasientforhold, svar },
      forventet: {},
      stopp: /bekreft/i,
    },
  ]
}

/**
 * Dosen av det eksisterende legemidlet fastsettes individuelt (valproat etter
 * respons, litium etter serumkonsentrasjon). Planen endrer den ikke, men
 * forskriveren må bekrefte at den er pasientens aktuelle dose, i hvilken enhet
 * og på hvilket preparat; kontrollerer regelen den ikke, sier teksten det.
 */
const aktuellDose = (e: Eksisterende): Bekreftelse => ({ id: 'aktuell_dose', tekst: e.dose.tekst, grunnlag: { type: 'kilde', henvisninger: e.dose.henvisninger } })

/**
 * Måldosen er et klinisk avgrensningsvilkår, ikke en anbefaling til alle:
 * forskriveren bekrefter at preparatomtalens første stabiliserende måldose er
 * pasientens mål, og ved østrogenholdig behandling at målet er vurdert særskilt.
 */
const maldosebekreftelser = (plan: Gruppeplan, e: Eksisterende, ostrogen: Sporsmal): Bekreftelse[] => [
  {
    id: 'maldose_valgt',
    tekst: `Den første stabiliserende måldosen (${plan.maldose} mg/dag) er det kliniske målet for denne opptrappingen hos pasienten, vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen.`,
    grunnlag: { type: 'kilde', henvisninger: [plan.henvisning, LAMICTAL.respons] },
  },
  {
    id: 'ostrogen_maldose',
    tekst: `Måldosen er vurdert særskilt fordi østrogenholdig behandling kan kreve en vedlikeholdsdose opptil det dobbelte: opptrappingen går likevel bare til ${plan.maldose} mg/dag, og en senere økning planlegges individuelt etter respons og eventuelt serumkonsentrasjon av lamotrigin.`,
    ved: { sporsmal: ostrogen.id, svar: true },
    grunnlag: ostrogen.grunnlag,
  },
]

/**
 * Østrogenholdige legemidler kan gjøre den vanlige måldosen for lav (opptil
 * det dobbelte trengs etter titreringen). Opptrappingen er den samme, men et ja
 * krever en skriftlig vurdering av måldosen.
 */
const ostrogensporsmal = (e: Eksisterende): Sporsmal => ({
  id: 'ostrogen',
  tekst: 'Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon?',
  ja: 'østrogenholdig prevensjon eller behandling, som kan kreve en høyere vedlikeholdsdose av lamotrigin enn måldosen; måldosen krever en særskilt vurdering',
  nei: 'ingen østrogenholdig prevensjon eller behandling',
  krever_begrunnelse: true,
  grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.hormonell, ...(e.ostrogen ? [e.ostrogen] : [])] },
})

/** Regelen for å legge lamotrigin til `e`, etter gruppens opptrapping i preparatomtalen. */
export function lamotrigintillegg(e: Eksisterende): Regel {
  const plan = OPPTRAPPING[e.gruppe]
  const unntak = unntakFor(e)
  const ostrogen = ostrogensporsmal(e)
  const bekreftelser = [...e.bekreftelser, aktuellDose(e), ...maldosebekreftelser(plan, e, ostrogen), UTSLETTSINFORMASJON]
  const sporsmal = [...(e.sporsmal ?? []), ostrogen]
  const fra: Forlop = {
    id: 'fra',
    virkestoff: { type: 'virkestoff', nokkel: e.nokkel },
    administrasjon: 'peroral',
    utgangsdose: 'startdose',
    start: { type: 'dag', dag: 1 },
    faser: [{ type: 'uendret', grunnlag: { type: 'kilde', henvisninger: [plan.henvisning] } }],
    krever_komplett: true,
  }
  const til: Forlop = {
    id: 'til',
    virkestoff: { type: 'virkestoff', nokkel: 'lamotrigin' },
    administrasjon: 'peroral',
    legemiddelformer: [DISPERGERBARE],
    ...(plan.maks ? { dosevalg: { maks_mg: kilde(plan.maks.mg, 'mg', 'bindende_krav', plan.maks.henvisning) } } : {}),
    utgangsdose: null,
    start: { type: 'dag', dag: 1 },
    faser: [
      {
        type: 'opptrapping',
        trinn: plan.trinn.map((t) => ({
          mg: kilde(t.mg, 'mg', 'bindende_krav', plan.henvisning, LAMICTAL.ikkeOverskrid),
          dager: kilde(t.dager, 'dager', 'bindende_krav', plan.henvisning, LAMICTAL.ikkeOverskrid),
          ...(t.hver ? { hver: kilde(t.hver, 'dager', 'bindende_krav', plan.henvisning) } : {}),
        })),
      },
      { type: 'vedlikehold', dose: { type: 'inndata', navn: 'maldose' } },
    ],
    vurderinger: lamotriginvurderinger(plan, e.navn),
    // Planen gis bare når den når måldosen; ellers stopper den i stedet for å vise en delplan.
    krever_komplett: true,
  }
  const besvart = Object.fromEntries(unntak.map((u) => [u.id, false]))
  const svar = Object.fromEntries(sporsmal.map((x) => [x.id, false]))
  // Målet er preparatomtalens første stabiliserende måldose, og forskriveren må velge det; et annet mål trappes ikke opp hit.
  const maldose: Inndatakrav = { navn: 'maldose', verdier: [plan.maldose], art: 'bindende_krav', grunnlag: { type: 'kilde', henvisninger: [plan.henvisning, LAMICTAL.respons] } }
  return {
    id: `tillegg-${e.nokkel}-lamotrigin`,
    versjon: VERSJON,
    tittel: `Legge lamotrigin til ${e.navn}`,
    fra: { type: 'virkestoff', nokkel: e.nokkel },
    til: { type: 'virkestoff', nokkel: 'lamotrigin' },
    plan: { form: 'tillegg', forlop: [fra, til] },
    inndata: [...(e.dose.krav ?? []), maldose],
    bekreftelser,
    unntak,
    sporsmal,
    beregnbarhet: 'entydig_beregnbar',
    fortolkning: {
      kildetro: [
        utsagn(`Lamotrigin lagt til ${e.navn} trappes opp etter preparatomtalens plan for denne kombinasjonen, til ${plan.maldose} mg/dag som vanlig første stabiliserende måldose fra uke 6.`, plan.henvisning),
        utsagn('Startdosen og doseøkningen skal ikke overskrides, fordi risikoen for alvorlig hudutslett øker med høy startdose og rask opptrapping.', LAMICTAL.ikkeOverskrid, LAMICTAL.utslettRisiko),
        ...e.kildetro.map((u) => utsagn(u.tekst, ...u.henvisninger)),
        utsagn('Fra 50 mg/dag kan døgndosen gis en gang daglig eller fordelt på to doser.', LAMICTAL.fordeling),
      ],
      tilpasninger: [
        utsagn(
          `Planen gjelder bare Lamictal tyggetabletter/dispergerbare tabletter (FEST-form ${DISPERGERBARE}), de markedsførte lamotriginformene i Norge; alle dosene er hele tabletter. Vanlige tabletter krever godkjenningsfritak og er utenfor regelen.`,
          LAMICTAL.helTablett,
        ),
        utsagn(
          `${e.navn[0]!.toUpperCase()}${e.navn.slice(1)} fortsetter uendret; planen endrer det ikke og beregner ingen dose av det. Opptrappingen gjelder bare så lenge pasienten fortsetter med det.`,
          plan.henvisning,
        ),
        utsagn(
          `Forskriveren må velge måldosen, og regelen gjelder bare preparatomtalens vanlige første stabiliserende måldose (${plan.maldose} mg/dag). Planen er komplett til den; et annet mål og videre justering etter klinisk respons beregnes ikke, men står som et vurderingspunkt.`,
          plan.henvisning,
          LAMICTAL.respons,
        ),
      ],
      forutsetninger: [
        ...FORUTSETNINGER_FELLES,
        'Pasienten er voksen og har bipolar lidelse der lamotrigin er vurdert som riktig tillegg; planen tar ikke stilling til indikasjonen.',
        ...e.forutsetninger,
      ],
      usikkerhet: [
        'Preparatomtalen gir en fast opptrapping, men den stabiliserende dosen avhenger av klinisk respons; planen går bare til den vanlige første måldosen.',
        'Vurderingspunktene erstatter ikke ordinær klinisk oppfølging av pasienten og det eksisterende legemidlet.',
      ],
    },
    referanser: [pn(`CombiningMoodstabilizers:${e.kode}>La`)],
    eksempler: eksempler(e, plan, bekreftelser.map((b) => b.id), besvart, svar),
    godkjenning: tilKontroll(),
  }
}

/* --- Parene ------------------------------------------------------------------------ */

/** Om pasienten kan bli gravid: avgjør om vilkårene i det graviditetsforebyggende programmet for valproat skal bekreftes. */
const KAN_BLI_GRAVID: Sporsmal = {
  id: 'kan_bli_gravid',
  tekst: 'Er pasienten jente eller kvinne som kan bli gravid? Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet.',
  ja: 'kan bli gravid; vilkårene i det graviditetsforebyggende programmet for valproat må bekreftes hver for seg',
  nei: 'kan ikke bli gravid',
  grunnlag: { type: 'kilde', henvisninger: [ORFIRIL.fertilAlder, ORFIRIL.fertil] },
}

export const VALPROAT_LAMOTRIGIN = lamotrigintillegg({
  nokkel: 'valproat',
  navn: 'valproat',
  kode: 'Va',
  gruppe: 'hemmer',
  eksempeldose: 1000,
  bekreftelser: [
    {
      id: 'fortsetter_valproat',
      tekst: 'Pasienten bruker valproat fast og skal fortsette med det uendret gjennom hele opptrappingen.',
      grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.hemmer] },
    },
    // Jenter og kvinner som kan bli gravide: hvert vilkår i det graviditetsforebyggende programmet bekreftes for seg.
    ...[
      {
        id: 'ppp_indikasjon',
        tekst: 'Annen behandling har ikke effekt eller tolereres ikke, og spesialist i bipolar lidelse har ved siste årlige gjennomgang vurdert valproat som den mest egnede behandlingen.',
        henvisninger: [ORFIRIL.fertil, ORFIRIL.arlig],
      },
      {
        id: 'ppp_informasjon',
        tekst: 'Pasienten har fått pasientinformasjonsheftet, har forstått og anerkjent risikoen for misdannelser og nevrologiske utviklingsforstyrrelser hos barnet, og risikoskjemaet er gjennomgått ved siste årlige gjennomgang.',
        henvisninger: [ORFIRIL.ppp, ORFIRIL.arlig],
      },
      {
        id: 'ppp_prevensjon',
        tekst: 'Pasienten bruker sikker prevensjon uten avbrudd: minst én sikker, helst brukeruavhengig metode (som spiral eller implantat), eller to komplementære metoder med en barrieremetode.',
        henvisninger: [ORFIRIL.prevensjon],
      },
      {
        id: 'ppp_graviditet',
        tekst: 'Graviditet er utelukket med graviditetstest når det er behov for det, og pasienten vet at hun straks skal kontakte lege ved planlagt eller mistenkt graviditet.',
        henvisninger: [ORFIRIL.graviditetstest, ORFIRIL.ppp],
      },
    ].map((x) => ({ id: x.id, tekst: x.tekst, ved: { sporsmal: KAN_BLI_GRAVID.id, svar: true }, grunnlag: { type: 'kilde' as const, henvisninger: x.henvisninger } })),
  ],
  unntak: [
    {
      id: 'graviditet',
      tekst: 'Pasienten er gravid, planlegger graviditet eller ammer. Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres.',
      grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.graviditet, ORFIRIL.graviditet] },
    },
  ],
  kildetro: [
    { tekst: 'Valproat hemmer glukuronideringen av lamotrigin og omtrent dobler halveringstiden, så lamotrigin trappes opp langsommere og til en lavere dose enn uten valproat.', henvisninger: [LAMICTAL.valproatInteraksjon, ORFIRIL.lamotrigin] },
    { tekst: 'Sammen med valproat gjelder opptrappingen uavhengig av andre legemidler, og høyst 200 mg/dag kan brukes etter klinisk respons.', henvisninger: [LAMICTAL.hemmer, LAMICTAL.hemmerMaks] },
    { tekst: 'Samtidig bruk av valproat er en egen risikofaktor for utslett.', henvisninger: [LAMICTAL.utslettRisiko, ORFIRIL.lamotrigin] },
  ],
  dose: {
    tekst:
      'Døgndosen som er fylt inn for valproat, er den pasienten bruker nå, i mg slik styrken står på pasientens valproatpreparat. Verktøyet kontrollerer ikke denne dosen mot noe preparat eller område; planen gjentar den bare.',
    henvisninger: [ORFIRIL.dose],
  },
  ostrogen: ORFIRIL.ostrogen,
  sporsmal: [KAN_BLI_GRAVID],
  forutsetninger: ['Valproatbehandlingen følges opp som før (blodbilde, lever og pankreas etter preparatomtalen); planen endrer ikke valproatdosen.'],
})

export const LITIUM_LAMOTRIGIN = lamotrigintillegg({
  nokkel: 'litium',
  navn: 'litium',
  kode: 'Li',
  gruppe: 'noytral',
  eksempeldose: 168,
  bekreftelser: [
    {
      id: 'fortsetter_litium',
      tekst: 'Pasienten bruker litium fast, skal fortsette med det uendret gjennom hele opptrappingen, og serumlitium følges som vanlig.',
      grunnlag: { type: 'kilde', henvisninger: [LITHIONIT.serum, LAMICTAL.litiumInteraksjon] },
    },
  ],
  unntak: [
    {
      id: 'valproat_eller_induserende',
      tekst:
        'Pasienten bruker i tillegg valproat, eller et legemiddel som induserer lamotrigin-glukuronidering (fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir). Da gjelder en annen opptrapping.',
      grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.noytral, LAMICTAL.hemmer, LAMICTAL.induserer] },
    },
    {
      id: 'ukjent_interaksjon',
      tekst:
        'Pasienten bruker et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin. Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. (Østrogenholdig prevensjon alene er ikke et slikt forhold; se spørsmålet om østrogenholdig behandling.)',
      grunnlag: { type: 'kilde', henvisninger: [LAMICTAL.ukjent, LAMICTAL.hormonell] },
    },
  ],
  kildetro: [
    { tekst: 'Litium har liten eller ingen effekt på konsentrasjonen av lamotrigin, og lamotrigin endret ikke litiums farmakokinetikk; opptrappingen er den samme som uten valproat og uten induserende legemidler.', henvisninger: [LAMICTAL.litiumInteraksjon, LAMICTAL.noytral] },
  ],
  dose: {
    tekst: `Pasienten bruker Lithionit ${LITHIONIT_MG} mg depottabletter, og døgndosen er fylt inn i mg litium (Li⁺): antall tabletter × ${LITHIONIT_MG} mg (${LITHIONIT_MMOL} mmol litium per tablett). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen.`,
    henvisninger: [LITHIONIT.styrke],
    // Hele tabletter, opp til den høyeste veiledende vedlikeholdsdosen.
    krav: [
      {
        navn: 'startdose',
        verdier: Array.from({ length: LITHIONIT_MAKS_TABLETTER }, (_, i) => (i + 1) * LITHIONIT_MG),
        art: 'bindende_krav',
        enhet: 'mg litium (Li⁺) per døgn',
        grunnlag: { type: 'kilde', henvisninger: [LITHIONIT.styrke, LITHIONIT.vedlikehold] },
      },
    ],
  },
  forutsetninger: ['Litiumbehandlingen følges opp som før med serumlitium og nyre-, hjerte- og stoffskiftefunksjon; planen endrer ikke litiumdosen.'],
})

export const TILLEGGSSETT: Regelsett = {
  id: 'ousfar-verktoy-tillegg',
  versjon: 1,
  modell: REGELMODELLVERSJON,
  beskrivelse:
    'Utkast til tilleggsregler for kombinering av stemningsstabiliserende legemidler (K4): lamotrigin lagt til valproat og lagt til litium, etter opptrappingstabellen for bipolar lidelse i Lamictal-preparatomtalen, med Lamictal tyggetabletter/dispergerbare tabletter. Det eksisterende legemidlet fortsetter uendret. Ingen av reglene er klinisk godkjent.',
  regler: [VALPROAT_LAMOTRIGIN, LITIUM_LAMOTRIGIN],
}

export const TILLEGG: Domenesett = {
  sett: TILLEGGSSETT,
  rapport: { fil: 'docs/verktøy-k4-tillegg.md', tittel: 'K4: regler for kombinasjon av stemningsstabiliserende', notater: ['docs/verktøy-klinisk-leveranseplan-2026-11.md'] },
}
