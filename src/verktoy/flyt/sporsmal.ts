/**
 * Spørsmålskatalogen (§4 i `docs/verktøy-brukervennlighet-2026-11.md`):
 * hvert spørsmål flyten stiller, og hvordan svarene avbildes til
 * betingelsene i de godkjente reglene (`Sporsmal`, `Unntak`, `Bekreftelse`).
 *
 * Katalogen ligger utenfor reglene, så fingeravtrykket deres ikke endres
 * (S2), og den avbildes til nøyaktig de feltene motoren leser i dag
 * (`svar`, `pasientforhold`, `bekreftet`). Den brukes for en regelversjon
 * bare når katalogavtrykket for den er kontrollert (`katalogkontroll.ts`,
 * S5b); ellers spørres hver betingelse med regelens egen tekst.
 *
 * Teksten er klinisk meningsinnhold (CLAUDE.md). Den gjengir regelens
 * innhold med færre og enklere ord og legger ikke til medisinske verdier;
 * `{maldose}` erstattes med måldosen regelen har. Tabellen ChatGPT
 * kontrollerer, `docs/verktøy-sporsmalskatalog.md`, lages herfra
 * (`katalogtabell.ts`).
 */
import type { Kategori, Sporsmalsgruppe, Svaralternativ } from './typer'

/** Svarsettene katalogen bruker. */
export const SVARSETT = {
  ja_nei_ukjent: [
    { verdi: 'ja', tekst: 'Ja' },
    { verdi: 'nei', tekst: 'Nei' },
    { verdi: 'ukjent', tekst: 'Ukjent' },
  ],
  /** En klinisk vurdering: noe klinikeren har gjort eller ikke gjort ennå. «Ikke ennå» gir ingen plan. */
  ja_ikke_enna: [
    { verdi: 'ja', tekst: 'Ja' },
    { verdi: 'nei', tekst: 'Ikke ennå' },
  ],
  alder: [
    { verdi: 'under_18', tekst: 'Under 18 år' },
    { verdi: '18_64', tekst: '18–64 år' },
    { verdi: '65_eller_eldre', tekst: '65 år eller eldre' },
    { verdi: 'ukjent', tekst: 'Ukjent' },
  ],
  /** Én bekreftelse (reservevisningen og samlet bekreftelse). */
  bekreftet: [{ verdi: 'ja', tekst: 'Bekreftet' }],
  /** Reservevisningen av et spørsmål i regelen, som i dagens skjema (S5). */
  ja_nei: [
    { verdi: 'ja', tekst: 'Ja' },
    { verdi: 'nei', tekst: 'Nei' },
  ],
  /** Reservevisningen av et unntak, med regelens to svar som i dagens skjema (S5). */
  gjelder: [
    { verdi: 'ja', tekst: 'Gjelder' },
    { verdi: 'nei', tekst: 'Gjelder ikke' },
  ],
} as const satisfies Record<string, readonly Svaralternativ[]>

export type Svarsett = keyof typeof SVARSETT

/** Ett spørsmål i katalogen. Det samme spørsmålet kan avgjøre betingelser i flere regler, og stilles da én gang. */
export interface Katalogsporsmal {
  id: string
  tekst: string
  hjelp?: string
  gruppe: Sporsmalsgruppe
  kategori: Exclude<Kategori, 'uklassifisert' | 'forbehold'>
  svar: Svarsett
  /** Spørsmålet vises bare når et annet spørsmål har ett av disse svarene. */
  vises?: { sporsmal: string; svar: readonly string[] }
}

/**
 * Hvordan ett spørsmål bidrar til en betingelse: svarene i `ja` gjør
 * betingelsen sann, svarene i `nei` usann; et annet svar (ikke «Ukjent»)
 * avgjør ingenting og lar de andre spørsmålene avgjøre. Uten `ja` og `nei`
 * gjelder «Ja» og «Nei»; med bare den ene gir ingen andre svar den andre.
 */
export interface Svarkilde {
  sporsmal: string
  ja?: readonly string[]
  nei?: readonly string[]
}

/** Svarene som gjør betingelsen sann ({@link Svarkilde}). */
export const jaVed = (k: Svarkilde): readonly string[] => k.ja ?? (k.nei ? [] : ['ja'])
/** Svarene som gjør betingelsen usann ({@link Svarkilde}). */
export const neiVed = (k: Svarkilde): readonly string[] => k.nei ?? (k.ja ? [] : ['nei'])

export type Betingelsestype = 'sporsmal' | 'unntak' | 'bekreftelse'

/**
 * Én betingelse i én regel, og hvordan den avgjøres i flyten.
 * - Med `fra` avgjøres den av svarene: `en` (standard for unntak og spørsmål) er sann når ett spørsmål gir sann,
 *   `alle` (standard for bekreftelser) når alle gir sann. Et ubesvart eller ukjent spørsmål gir ukjent, aldri et trygt svar (S4).
 * - Et `forbehold` uten `fra` står i planen (beslutning B1); et `avledet` med `fra` avgjøres av valget (B2). Til de er akseptert,
 *   bekreftes de samlet til slutt.
 */
export interface Katalogbetingelse {
  regel: string
  type: Betingelsestype
  id: string
  kategori: Exclude<Kategori, 'uklassifisert'>
  fra?: readonly Svarkilde[]
  kombinasjon?: 'en' | 'alle'
  /** Én setning når svaret gjør at regelen ikke kan gi en plan: hva det betyr og hva klinikeren kan gjøre. */
  forklaring?: string
}

const ESC = 'seponering-escitalopram'
const ESC_B2 = 'seponering-escitalopram-tabletter-og-draper'
const VORT = 'seponering-vortioksetin'
const SERT = 'kryssnedtrapping-sertralin-mirtazapin'
const MAINTENA = 'depot-aripiprazol-maintena'
const XEPLION = 'depot-paliperidon-xeplion'
const VALPROAT = 'tillegg-valproat-lamotrigin'
const LITIUM = 'tillegg-litium-lamotrigin'
const RISPERIDON_XEPLION = 'depot-risperidon-xeplion'

/** Byttene til aripiprazol (K3), som har samme oppbygning: stoffet det byttes fra og seponeringsplagene regelen nevner for det. */
const TIL_ARIPIPRAZOL = [
  { regel: 'antipsykotikabytte-olanzapin-aripiprazol', stoff: 'olanzapin', plager: 'kvalme, oppkast, hodepine, uro, angst, søvnløshet og svetting' },
  { regel: 'antipsykotikabytte-risperidon-aripiprazol', stoff: 'risperidon', plager: 'kvalme, oppkast, svette og søvnløshet' },
] as const
type Bytte = (typeof TIL_ARIPIPRAZOL)[number]
const forHvertBytte = (lag: (b: Bytte) => Katalogsporsmal) => TIL_ARIPIPRAZOL.map(lag)

/** Byttene til sertralin (K2), som har samme oppbygning: antidepressivet det byttes fra. */
const TIL_SERTRALIN = [
  { regel: 'bytte-escitalopram-sertralin', stoff: 'escitalopram' },
  { regel: 'bytte-citalopram-sertralin', stoff: 'citalopram' },
] as const
type Sertralinbytte = (typeof TIL_SERTRALIN)[number]
const forHvertSertralinbytte = (lag: (b: Sertralinbytte) => Katalogsporsmal) => TIL_SERTRALIN.map(lag)

const INDIVIDUELT = 'Verktøyet lager ingen plan, og behandlingen må planlegges individuelt.'

/** Spørsmålene, i rekkefølgen de stilles innen hver gruppe. */
export const KATALOGSPORSMAL: readonly Katalogsporsmal[] = [
  // --- Stoppforhold ---
  { id: 'alder', tekst: 'Hvor gammel er pasienten?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'alder' },
  {
    id: 'indikasjon_aripiprazol',
    tekst: 'Er pasienten voksen, har schizofreni, og er stabilisert på og har tålt peroral aripiprazol?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'indikasjon_paliperidon',
    tekst: 'Er pasienten voksen, har schizofreni, og er stabilisert på peroral paliperidon depottablett?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'indikasjon_risperidon', tekst: 'Er pasienten voksen, har schizofreni, og er stabilisert på peroral risperidon?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'tolererer_risperidon',
    tekst: 'Er det dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet?',
    hjelp: 'Anafylaksi er likevel mulig etter injeksjon.',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  ...forHvertBytte(({ stoff }) => ({
    id: `indikasjon_bytte_${stoff}`,
    tekst: `Er pasienten voksen, har schizofreni, er stabil og følges poliklinisk, og byttes fra ${stoff} på grunn av bivirkninger eller utilstrekkelig effekt?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  ...forHvertBytte(({ stoff }) => ({
    id: `peroral_${stoff}`,
    tekst: `Bruker pasienten peroral ${stoff} (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  {
    id: 'tilbakefall_innlagt',
    tekst: 'Har pasienten hatt gjentatte psykotiske tilbakefall, er pasienten innlagt, eller er pasienten ikke stabil?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'akutt_situasjon',
    tekst: 'Har pasienten en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller trengs rask seponering av andre grunner?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'del_av_bytte', tekst: 'Skal legemidlet seponeres som del av et bytte til et annet legemiddel?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'ustabil_dose', tekst: 'Er dosen ikke stabil, eller tar pasienten legemidlet uregelmessig?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'tidligere_seponeringsplager',
    tekst: 'Har et tidligere forsøk på å trappe ned eller seponere legemidlet gitt seponeringssymptomer eller mislyktes?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  ...forHvertBytte(({ stoff }) => ({
    id: `seponeringsplager_${stoff}`,
    tekst: `Har pasienten tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av ${stoff}?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  {
    id: 'qt_forlengelse',
    tekst: 'Har pasienten kjent QT-forlengelse eller medfødt langt QT-syndrom, eller bruker pasienten et annet legemiddel som forlenger QT-intervallet?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'cyp2d6_langsom', tekst: 'Er pasienten kjent langsom CYP2D6-omsetter?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'sterk_cyp_hemmer', tekst: 'Bruker pasienten en sterk CYP2D6- eller CYP3A4-hemmer?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'cyp3a4_induktor', tekst: 'Bruker pasienten en CYP3A4-induktor?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'sterk_cyp3a4_induktor', tekst: 'Bruker pasienten en sterk CYP3A4-induktor?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'risperidon_interaksjon',
    tekst: 'Bruker pasienten en CYP2D6-hemmer eller en CYP3A4-induktor?',
    hjelp: 'For eksempel paroksetin, sertralin eller fluoksetin (CYP2D6-hemmere), eller karbamazepin (CYP3A4-induktor).',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'overvekt', tekst: 'Har pasienten overvekt eller fedme?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'kreatininclearance_under_80', tekst: 'Har pasienten kreatininclearance under 80 ml/min?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'fortsetter_valproat',
    tekst: 'Bruker pasienten valproat fast, og skal valproat fortsette uendret gjennom hele opptrappingen?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'fortsetter_litium',
    tekst: 'Bruker pasienten litium fast, og skal litium fortsette uendret gjennom hele opptrappingen, med serumlitium fulgt som vanlig?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'tidligere_reaksjon_lamotrigin',
    tekst: 'Har pasienten tidligere fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'bruker_lamotrigin',
    tekst: 'Bruker pasienten lamotrigin nå, eller har pasienten sluttet så nylig at det er under fem halveringstider siden siste dose?',
    hjelp: 'Det er ca. 7 døgn for lamotrigin alene og ca. 15 døgn sammen med valproat, ut fra gjennomsnittlig halveringstid.',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'hla_b1502', tekst: 'Er pasienten kjent positiv for HLA-B*1502?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'graviditet', tekst: 'Er pasienten gravid, planlegger graviditet eller ammer?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'nedsatt_leverfunksjon_child_pugh',
    tekst: 'Har pasienten moderat eller alvorlig nedsatt leverfunksjon (Child-Pugh B eller C)?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'nedsatt_nyrefunksjon_betydelig',
    tekst: 'Har pasienten betydelig nedsatt nyrefunksjon eller nyresvikt i siste fase?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'bruker_valproat', tekst: 'Bruker pasienten i tillegg valproat?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'induserer_glukuronidering',
    tekst: 'Bruker pasienten et legemiddel som induserer lamotrigin-glukuronidering?',
    hjelp: 'Fenytoin, karbamazepin, fenobarbital, primidon, rifampicin eller lopinavir/ritonavir.',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'ukjent_interaksjon_lamotrigin',
    tekst: 'Bruker pasienten et annet legemiddel med ukjent farmakokinetisk interaksjon med lamotrigin?',
    hjelp: 'Østrogenholdig prevensjon alene regnes ikke med her; den spørres om for seg.',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  // Avledet av valget av preparat (beslutning B2); stilles bare når B2 er akseptert.
  {
    id: 'preparat_lithionit',
    tekst: 'Bruker pasienten Lithionit 42 mg depottabletter, og er døgndosen fylt inn i mg litium (Li⁺) som antall tabletter × 42 mg?',
    hjelp: 'Én tablett er 42 mg litium (6 mmol). Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen.',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'preparat_natriumvalproat',
    tekst: 'Bruker pasienten et natriumvalproatpreparat, og er døgndosen fylt inn i mg natriumvalproat slik den står i legemiddellisten?',
    hjelp: 'Preparat, styrke og fordeling over døgnet fortsetter uendret. Preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen.',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
  },

  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `tidligere_seponeringsplager_${stoff}`,
    tekst: `Har et tidligere forsøk på å trappe ned eller seponere ${stoff} eller et annet antidepressiv gitt seponeringssymptomer eller mislyktes?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  // Byttereglenes egen grense (K2-8): ikke det samme som «mange måneder eller lenger» i «Trappe ned», og slås ikke sammen med det.
  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `over_8_uker_${stoff}`,
    tekst: `Har pasienten brukt ${stoff} sammenhengende i mer enn 8 uker?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  { id: 'depresjon_bytte', tekst: 'Gjelder byttet behandling av depresjon?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },

  // --- Forhold som endrer planen ---
  {
    id: 'eldre_enn_65',
    tekst: 'Er pasienten over 65 år?',
    gruppe: 'endrer',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
    vises: { sporsmal: 'alder', svar: ['65_eller_eldre'] },
  },
  { id: 'lang_behandlingstid', tekst: 'Har pasienten brukt legemidlet i mange måneder eller lenger?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'nedsatt_leverfunksjon', tekst: 'Har pasienten nedsatt leverfunksjon?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'langsom_cyp2c19', tekst: 'Er pasienten kjent langsom metaboliserer av CYP2C19?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'utenfor_doseramme',
    tekst: 'Er dosen ellers utenfor preparatomtalens doseramme for pasientens indikasjon eller pasientgruppe?',
    hjelp: 'For eksempel ved nedsatt organfunksjon, utover det de andre spørsmålene om pasientgruppe og indikasjon dekker.',
    gruppe: 'endrer',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'kan_bli_gravid',
    tekst: 'Er pasienten jente eller kvinne som kan bli gravid?',
    hjelp: 'Det gjelder også den som ikke er seksuelt aktiv, med mindre det er sterke grunner til at det ikke er risiko for graviditet.',
    gruppe: 'endrer',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'kan_bli_far', tekst: 'Er pasienten gutt eller mann som kan gjøre en partner gravid?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'ostrogen',
    tekst: 'Bruker pasienten østrogenholdig prevensjon eller annen østrogenholdig behandling, som hormonsubstitusjon?',
    gruppe: 'endrer',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },

  // --- Kliniske vurderinger ---
  {
    id: 'effekt_risperidon',
    tekst: 'Er det vurdert at dagens risperidondose har gitt god og stabil effekt, uten bivirkninger som har begrenset dosen og uten planer om å endre den, og at pasienten har tatt den regelmessig?',
    hjelp: 'Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'spesialist_risiko',
    tekst: 'Er byttet vurdert i, eller med råd fra, spesialisthelsetjenesten, og kan pasienten følges tett de første ukene?',
    hjelp: 'Følg med på forverring av psykosen, søvn, uro og akatisi, sedasjon og ortostatisk blodtrykksfall.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  ...forHvertBytte(({ stoff }) => ({
    id: `siste_trinn_${stoff}`,
    tekst: `Er siste trinn vurdert for denne pasienten: ${stoff} seponeres helt fra den siste lave dosen (hele dosen som gjenstår) mens aripiprazol har stått på måldosen i flere uker?`,
    hjelp: 'Ved forverring, uro eller seponeringsplager holdes siste dose, og resten planlegges individuelt.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  })),
  ...forHvertBytte(({ stoff, plager }) => ({
    id: `seponering_informert_${stoff}`,
    tekst: 'Vet pasienten hvilke seponeringsplager og tegn på tilbakefall som skal meldes, og blir pasienten vurdert før siste trinn og etter seponeringen?',
    hjelp: `Seponeringsplager kan være ${plager}, og akatisi, dystoni og dyskinesi.`,
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  })),
  {
    id: 'serotonerg_sammedisinering',
    tekst:
      'Er pasientens øvrige legemidler kontrollert, og bruker pasienten ingen andre serotonerge legemidler eller andre legemidler som gjør overlappen mellom sertralin og mirtazapin mer risikofylt?',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'organfunksjon_interaksjoner',
    tekst: 'Er lever- og nyrefunksjon og interaksjoner vurdert?',
    hjelp: 'Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'ppp_indikasjon',
    tekst: 'Har annen behandling ikke effekt eller tolereres ikke, og har spesialist i bipolar lidelse ved siste årlige gjennomgang vurdert valproat som den mest egnede behandlingen?',
    gruppe: 'vurdering',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'ppp_informasjon',
    tekst:
      'Har pasienten fått pasientinformasjonsheftet, forstått og anerkjent risikoen for misdannelser og nevrologiske utviklingsforstyrrelser hos barnet, og er risikoskjemaet gjennomgått ved siste årlige gjennomgang?',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'ppp_prevensjon',
    tekst: 'Bruker pasienten sikker prevensjon uten avbrudd?',
    hjelp: 'Minst én sikker, helst brukeruavhengig metode (som spiral eller implantat), eller to komplementære metoder med en barrieremetode.',
    gruppe: 'vurdering',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'ppp_graviditet',
    tekst: 'Er graviditet utelukket med graviditetstest når det er behov for det, og vet pasienten at hun straks skal kontakte lege ved planlagt eller mistenkt graviditet?',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'far_informasjon',
    tekst:
      'Er pasienten informert om den mulige risikoen for nevroutviklingsforstyrrelser hos barn som unnfanges mens han bruker valproat eller de 3 første månedene etter at han har sluttet, om behovet for effektiv prevensjon i hele denne perioden, også for en kvinnelig partner, og om at han ikke skal donere sæd i samme periode?',
    hjelp: 'Sammenhengen er usikker.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'far_vurdering',
    tekst: 'Har behandlende lege vurdert at valproat fortsatt er den mest passende behandlingen, og, hvis pasienten planlegger å bli far, vurdert og diskutert andre behandlingsalternativer med ham?',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'maldose_valgt',
    tekst: 'Er den første stabiliserende måldosen ({maldose} mg/dag) det kliniske målet for denne opptrappingen hos pasienten?',
    hjelp: 'Vurdert ut fra indikasjon, forventet respons og interaksjoner. Er et annet mål ønsket, gjelder ikke regelen.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'ostrogen_maldose',
    tekst: 'Er måldosen vurdert særskilt fordi østrogenholdig behandling kan kreve en vedlikeholdsdose opptil det dobbelte?',
    hjelp: 'Opptrappingen går likevel bare til {maldose} mg/dag, og en senere økning planlegges individuelt etter respons og eventuelt serumkonsentrasjon av lamotrigin.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'utslett_informert',
    tekst:
      'Er pasienten informert om å stoppe lamotrigin og ta kontakt straks ved utslett, feber, hovne lymfeknuter eller sår i munn eller øyne, og om ikke å øke dosen raskere enn planen eller ta igjen glemte doser med ekstra tabletter?',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `oppfolging_bytte_${stoff}`,
    tekst: `Følges pasienten opp ved vurderingspunktene i planen: før hver reduksjon og før seponeringen av ${stoff}, en uke etter overgangen til sertralin, før en eventuell økning av sertralin og fire uker etter oppstarten og hver endring av den?`,
    hjelp:
      'Før en økning vurderes effekt, toleranse og seponeringssymptomer. Dagene er minstetider. Den første uken etter overgangen følges seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  })),
  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `serotonerg_bytte_${stoff}`,
    tekst: `Er pasientens øvrige legemidler kontrollert, og bruker pasienten ingen andre serotonerge legemidler eller andre legemidler som gjør byttet fra ${stoff} til sertralin mer risikofylt?`,
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_nei_ukjent',
  })),
]

/** Alderen som avgjør «under 18 år» og «65 år eller eldre». */
const UNDER_18: Svarkilde = { sporsmal: 'alder', ja: ['under_18'], nei: ['18_64', '65_eller_eldre'] }
const FRA_65: Svarkilde = { sporsmal: 'alder', ja: ['65_eller_eldre'], nei: ['under_18', '18_64'] }
/** «Over 65 år»: under 65 er avgjort av alderen; ved 65 eller eldre avgjør oppfølgingsspørsmålet. */
const OVER_65: readonly Svarkilde[] = [{ sporsmal: 'alder', nei: ['under_18', '18_64'] }, { sporsmal: 'eldre_enn_65' }]

const fra = (...sporsmal: (string | Svarkilde)[]): Svarkilde[] => sporsmal.map((s) => (typeof s === 'string' ? { sporsmal: s } : s))

/** Betingelsene i nedtrappingsreglene for SSRI og vortioksetin, som har samme oppbygning. */
const nedtrapping = (regel: string): Katalogbetingelse[] => [
  { regel, type: 'unntak', id: 'under_18', kategori: 'sikkerhetsopplysning', fra: [UNDER_18], forklaring: 'Reglene er laget for voksne; nedtrapping hos barn og ungdom må vurderes særskilt.' },
  { regel, type: 'unntak', id: 'akutt_situasjon', kategori: 'sikkerhetsopplysning', fra: fra('akutt_situasjon'), forklaring: `Da passer ikke en gradvis nedtrapping. ${INDIVIDUELT}` },
  {
    regel,
    type: 'unntak',
    id: 'ustabil_dose_eller_bytte',
    kategori: 'sikkerhetsopplysning',
    fra: fra('del_av_bytte', 'ustabil_dose'),
    forklaring: `Nedtrappingen forutsetter en stabil dose som tas regelmessig, og gjelder ikke et bytte; et bytte planlegges i «Bytte antidepressiv». ${INDIVIDUELT}`,
  },
  {
    regel,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tidligere_seponeringsplager'),
    forklaring: `Da gjelder den langsomme varianten av nedtrappingen, ikke denne. ${INDIVIDUELT}`,
  },
  { regel, type: 'sporsmal', id: 'lang_behandlingstid', kategori: 'sikkerhetsopplysning', fra: fra('lang_behandlingstid') },
  { regel, type: 'sporsmal', id: 'utenfor_doseramme', kategori: 'sikkerhetsopplysning', fra: fra('utenfor_doseramme') },
  { regel, type: 'bekreftelse', id: 'startforslag', kategori: 'forbehold' },
  { regel, type: 'bekreftelse', id: 'organfunksjon_interaksjoner', kategori: 'klinisk_vurdering', fra: fra('organfunksjon_interaksjoner') },
]

/** Betingelsene i begge reglene for å legge lamotrigin til. */
const lamotrigin = (regel: string): Katalogbetingelse[] => [
  { regel, type: 'unntak', id: 'under_18', kategori: 'sikkerhetsopplysning', fra: [UNDER_18], forklaring: `Regelen gjelder bare voksne. ${INDIVIDUELT}` },
  { regel, type: 'unntak', id: 'tidligere_reaksjon', kategori: 'sikkerhetsopplysning', fra: fra('tidligere_reaksjon_lamotrigin'), forklaring: INDIVIDUELT },
  { regel, type: 'unntak', id: 'bruker_lamotrigin', kategori: 'sikkerhetsopplysning', fra: fra('bruker_lamotrigin'), forklaring: `Da er dette ikke en oppstart. ${INDIVIDUELT}` },
  { regel, type: 'unntak', id: 'nedsatt_leverfunksjon', kategori: 'sikkerhetsopplysning', fra: fra('nedsatt_leverfunksjon_child_pugh'), forklaring: INDIVIDUELT },
  { regel, type: 'unntak', id: 'nedsatt_nyrefunksjon', kategori: 'sikkerhetsopplysning', fra: fra('nedsatt_nyrefunksjon_betydelig'), forklaring: INDIVIDUELT },
  { regel, type: 'unntak', id: 'hla_b1502', kategori: 'sikkerhetsopplysning', fra: fra('hla_b1502'), forklaring: INDIVIDUELT },
  { regel, type: 'sporsmal', id: 'ostrogen', kategori: 'sikkerhetsopplysning', fra: fra('ostrogen') },
  {
    regel,
    type: 'bekreftelse',
    id: 'maldose_valgt',
    kategori: 'klinisk_vurdering',
    fra: fra('maldose_valgt'),
    forklaring: 'Er et annet mål ønsket, gjelder ikke regelen, og opptrappingen må planlegges individuelt.',
  },
  { regel, type: 'bekreftelse', id: 'ostrogen_maldose', kategori: 'klinisk_vurdering', fra: fra('ostrogen_maldose') },
  { regel, type: 'bekreftelse', id: 'utslett_informert', kategori: 'klinisk_vurdering', fra: fra('utslett_informert') },
]

/** Betingelsene i byttene til aripiprazol (K3). */
const tilAripiprazol = ({ regel, stoff }: Bytte): Katalogbetingelse[] => [
  {
    regel,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`indikasjon_bytte_${stoff}`),
    forklaring: `Regelen gjelder bare denne pasientgruppen. ${INDIVIDUELT}`,
  },
  { regel, type: 'bekreftelse', id: 'peroral_formulering', kategori: 'sikkerhetsopplysning', fra: fra(`peroral_${stoff}`), forklaring: `Regelen gjelder bare peroral ${stoff}. ${INDIVIDUELT}` },
  {
    regel,
    type: 'unntak',
    id: 'tilbakefall_innlagt',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tilbakefall_innlagt'),
    forklaring: `Kilden anbefaler da en annen opptrapping, som ikke er omfattet. ${INDIVIDUELT}`,
  },
  { regel, type: 'unntak', id: 'alder_65', kategori: 'sikkerhetsopplysning', fra: [FRA_65], forklaring: `Effekt og sikkerhet av aripiprazol er ikke fastslått fra 65 år. ${INDIVIDUELT}` },
  {
    regel,
    type: 'unntak',
    id: 'cyp_aripiprazol',
    kategori: 'sikkerhetsopplysning',
    fra: fra('sterk_cyp_hemmer', 'sterk_cyp3a4_induktor'),
    forklaring: `Aripiprazoldosen skal da justeres. ${INDIVIDUELT}`,
  },
  {
    regel,
    type: 'unntak',
    id: 'seponeringsplager',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`seponeringsplager_${stoff}`),
    forklaring: 'Regelen kan da ikke stå for siste trinn til 0, og nedtrappingen planlegges individuelt.',
  },
  { regel, type: 'bekreftelse', id: 'spesialist_risiko', kategori: 'klinisk_vurdering', fra: fra('spesialist_risiko') },
  { regel, type: 'bekreftelse', id: 'siste_trinn', kategori: 'klinisk_vurdering', fra: fra(`siste_trinn_${stoff}`, `seponering_informert_${stoff}`) },
]

/**
 * Betingelsene i byttene til sertralin (K2). Indikasjonen «voksen (18–65 år)
 * med depresjon» avgjøres av alderen, som spørres én gang, og av
 * indikasjonen: 18–64 år er innenfor; ved 65 år eller eldre avgjør «over 65
 * år», så 65 år er innenfor og over 65 år utenfor.
 */
const tilSertralin = ({ regel, stoff }: Sertralinbytte): Katalogbetingelse[] => [
  {
    regel,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    fra: [{ sporsmal: 'alder', ja: ['18_64'], nei: ['under_18'] }, { sporsmal: 'eldre_enn_65', ja: ['nei'], nei: ['ja'] }, { sporsmal: 'depresjon_bytte' }],
    forklaring: `Regelen gjelder bare voksne 18–65 år med depresjon. ${INDIVIDUELT}`,
  },
  {
    regel,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`tidligere_seponeringsplager_${stoff}`),
    forklaring: 'Da passer ikke den faste planen, og byttet planlegges individuelt med mindre trinn.',
  },
  {
    regel,
    type: 'unntak',
    id: 'lang_behandlingstid',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`over_8_uker_${stoff}`),
    forklaring: `Byttet er bare vurdert for de første 8 ukene av behandlingen. ${INDIVIDUELT}`,
  },
  { regel, type: 'unntak', id: 'over_65', kategori: 'sikkerhetsopplysning', fra: OVER_65, forklaring: `Preparatomtalene har egne doser eller krav om nøye oppfølging for eldre. ${INDIVIDUELT}` },
  {
    regel,
    type: 'unntak',
    id: 'nedsatt_leverfunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('nedsatt_leverfunksjon'),
    forklaring: `Preparatomtalene krever da lavere doser eller særskilt hensyn. ${INDIVIDUELT}`,
  },
  { regel, type: 'bekreftelse', id: 'toleranse_bytte', kategori: 'klinisk_vurdering', fra: fra(`oppfolging_bytte_${stoff}`) },
  { regel, type: 'bekreftelse', id: 'serotonerg_sammedisinering', kategori: 'klinisk_vurdering', fra: fra(`serotonerg_bytte_${stoff}`), forklaring: INDIVIDUELT },
]

/** Betingelsene i escitalopramreglene (K1 og B2), som bare skiller seg i aldersgrensen `eldre`. */
const escitalopram = (regel: string, eldre: readonly Svarkilde[]): Katalogbetingelse[] => [
  ...nedtrapping(regel),
  {
    regel,
    type: 'unntak',
    id: 'qt_forlengelse',
    kategori: 'sikkerhetsopplysning',
    fra: fra('qt_forlengelse'),
    forklaring: `Det er en kontraindikasjon i preparatomtalen, og en begrunnelse kan ikke overstyre den. ${INDIVIDUELT}`,
  },
  { regel, type: 'sporsmal', id: 'eldre', kategori: 'sikkerhetsopplysning', fra: eldre },
  { regel, type: 'sporsmal', id: 'nedsatt_leverfunksjon', kategori: 'sikkerhetsopplysning', fra: fra('nedsatt_leverfunksjon') },
  { regel, type: 'sporsmal', id: 'langsom_cyp2c19', kategori: 'sikkerhetsopplysning', fra: fra('langsom_cyp2c19') },
]

/** Hver betingelse i hver godkjent regel. En betingelse som ikke står her, spørres med regelens egen tekst (S5). */
export const KATALOGBETINGELSER: readonly Katalogbetingelse[] = [
  // Escitalopram (K1, v13): «over 65 år».
  ...escitalopram(ESC, OVER_65),
  // Escitalopram med tabletter og dråper (B2, v14): som versjon 13, men grensen er «65 år eller eldre».
  ...escitalopram(ESC_B2, [FRA_65]),

  // Vortioksetin (v12): grensen er «65 år eller eldre».
  ...nedtrapping(VORT),
  { regel: VORT, type: 'sporsmal', id: 'eldre', kategori: 'sikkerhetsopplysning', fra: [FRA_65] },

  // Sertralin → mirtazapin (v10): godkjent, men gir ingen komplett plan og tilbys ikke ennå.
  { regel: SERT, type: 'sporsmal', id: 'lang_behandlingstid', kategori: 'sikkerhetsopplysning', fra: fra('lang_behandlingstid') },
  {
    regel: SERT,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tidligere_seponeringsplager'),
    forklaring: 'Da passer ikke den faste kryssnedtrappingen, og byttet planlegges individuelt med mindre trinn.',
  },
  { regel: SERT, type: 'bekreftelse', id: 'toleranse_overlapp', kategori: 'forbehold' },
  { regel: SERT, type: 'bekreftelse', id: 'serotonerg_sammedisinering', kategori: 'klinisk_vurdering', fra: fra('serotonerg_sammedisinering'), forklaring: INDIVIDUELT },

  // Escitalopram eller citalopram → sertralin (K2, v2).
  ...TIL_SERTRALIN.flatMap(tilSertralin),

  // Aripiprazol → Abilify Maintena (v3).
  {
    regel: MAINTENA,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('indikasjon_aripiprazol'),
    forklaring: `Regelen gjelder bare denne pasientgruppen. ${INDIVIDUELT}`,
  },
  { regel: MAINTENA, type: 'unntak', id: 'cyp2d6_langsom', kategori: 'sikkerhetsopplysning', fra: fra('cyp2d6_langsom'), forklaring: `Preparatomtalen har egne doser. ${INDIVIDUELT}` },
  { regel: MAINTENA, type: 'unntak', id: 'sterk_cyp_hemmer', kategori: 'sikkerhetsopplysning', fra: fra('sterk_cyp_hemmer'), forklaring: `Dosen skal da reduseres. ${INDIVIDUELT}` },
  { regel: MAINTENA, type: 'unntak', id: 'cyp3a4_induktor', kategori: 'sikkerhetsopplysning', fra: fra('cyp3a4_induktor'), forklaring: `Den bør unngås sammen med depotet. ${INDIVIDUELT}` },

  // Paliperidon → Xeplion (v3).
  {
    regel: XEPLION,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('indikasjon_paliperidon'),
    forklaring: `Regelen gjelder bare denne pasientgruppen. ${INDIVIDUELT}`,
  },
  {
    regel: XEPLION,
    type: 'unntak',
    id: 'nedsatt_nyrefunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('kreatininclearance_under_80'),
    forklaring: `Preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. ${INDIVIDUELT}`,
  },

  // Peroral risperidon → Xeplion (K3, v8): grensen er «over 65 år».
  {
    regel: RISPERIDON_XEPLION,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('indikasjon_risperidon'),
    forklaring: `Regelen gjelder bare denne pasientgruppen. ${INDIVIDUELT}`,
  },
  { regel: RISPERIDON_XEPLION, type: 'bekreftelse', id: 'tidligere_toleranse', kategori: 'sikkerhetsopplysning', fra: fra('tolererer_risperidon'), forklaring: INDIVIDUELT },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'nedsatt_nyrefunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('kreatininclearance_under_80'),
    forklaring: `Preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min. ${INDIVIDUELT}`,
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'over_65',
    kategori: 'sikkerhetsopplysning',
    fra: OVER_65,
    forklaring: `Effekt og sikkerhet av Xeplion er ikke fastslått over 65 år. ${INDIVIDUELT}`,
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'overvekt',
    kategori: 'sikkerhetsopplysning',
    fra: fra('overvekt'),
    forklaring: `Preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig. ${INDIVIDUELT}`,
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'risperidon_interaksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('risperidon_interaksjon'),
    forklaring: `Da sier risperidondosen ikke hvilken eksponering Xeplion må gi. ${INDIVIDUELT}`,
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'bekreftelse',
    id: 'effekt_toleranse',
    kategori: 'klinisk_vurdering',
    fra: fra('effekt_risperidon'),
    forklaring: 'Er effekten utilstrekkelig, eller har bivirkninger holdt dosen nede, planlegges vedlikeholdsdosen individuelt.',
  },

  // Olanzapin og risperidon → aripiprazol (K3, v8).
  ...TIL_ARIPIPRAZOL.flatMap(tilAripiprazol),

  // Lamotrigin lagt til valproat (K4, v2).
  ...lamotrigin(VALPROAT),
  {
    regel: VALPROAT,
    type: 'unntak',
    id: 'graviditet',
    kategori: 'sikkerhetsopplysning',
    fra: fra('graviditet'),
    forklaring: `Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres. ${INDIVIDUELT}`,
  },
  { regel: VALPROAT, type: 'sporsmal', id: 'kan_bli_gravid', kategori: 'sikkerhetsopplysning', fra: fra('kan_bli_gravid') },
  { regel: VALPROAT, type: 'sporsmal', id: 'kan_bli_far', kategori: 'sikkerhetsopplysning', fra: fra('kan_bli_far') },
  {
    regel: VALPROAT,
    type: 'bekreftelse',
    id: 'fortsetter_valproat',
    kategori: 'sikkerhetsopplysning',
    fra: fra('fortsetter_valproat'),
    forklaring: `Regelen gjelder bare når valproat fortsetter uendret. ${INDIVIDUELT}`,
  },
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_indikasjon', kategori: 'sikkerhetsopplysning', fra: fra('ppp_indikasjon'), forklaring: INDIVIDUELT },
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_informasjon', kategori: 'klinisk_vurdering', fra: fra('ppp_informasjon') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_prevensjon', kategori: 'sikkerhetsopplysning', fra: fra('ppp_prevensjon'), forklaring: INDIVIDUELT },
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_graviditet', kategori: 'klinisk_vurdering', fra: fra('ppp_graviditet') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'far_informasjon', kategori: 'klinisk_vurdering', fra: fra('far_informasjon') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'far_vurdering', kategori: 'klinisk_vurdering', fra: fra('far_vurdering') },
  {
    regel: VALPROAT,
    type: 'bekreftelse',
    id: 'aktuell_dose',
    kategori: 'avledet',
    fra: fra('preparat_natriumvalproat'),
    forklaring: `Regelen gjelder bare natriumvalproat med dosen i mg natriumvalproat. ${INDIVIDUELT}`,
  },

  // Lamotrigin lagt til litium (K4, v2).
  ...lamotrigin(LITIUM),
  { regel: LITIUM, type: 'unntak', id: 'graviditet', kategori: 'sikkerhetsopplysning', fra: fra('graviditet'), forklaring: INDIVIDUELT },
  {
    regel: LITIUM,
    type: 'unntak',
    id: 'valproat_eller_induserende',
    kategori: 'sikkerhetsopplysning',
    fra: fra('bruker_valproat', 'induserer_glukuronidering'),
    forklaring: `Da gjelder en annen opptrapping. ${INDIVIDUELT}`,
  },
  {
    regel: LITIUM,
    type: 'unntak',
    id: 'ukjent_interaksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('ukjent_interaksjon_lamotrigin'),
    forklaring: 'Da skal opptrappingen for samtidig valproat brukes, og planen må lages for det. Verktøyet lager ingen plan etter denne regelen.',
  },
  {
    regel: LITIUM,
    type: 'bekreftelse',
    id: 'fortsetter_litium',
    kategori: 'sikkerhetsopplysning',
    fra: fra('fortsetter_litium'),
    forklaring: `Regelen gjelder bare når litium fortsetter uendret. ${INDIVIDUELT}`,
  },
  { regel: LITIUM, type: 'bekreftelse', id: 'aktuell_dose', kategori: 'avledet', fra: fra('preparat_lithionit'), forklaring: `Regelen gjelder bare Lithionit 42 mg depottabletter. ${INDIVIDUELT}` },
]
