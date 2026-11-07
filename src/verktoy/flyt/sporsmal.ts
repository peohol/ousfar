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
import type { Kildeformulering } from '../kartlegging'
import type { Kategori, Sporsmalsgruppe, Svaralternativ } from './typer'

/** Svarsettene katalogen bruker. */
export const SVARSETT = {
  ja_nei_ukjent: [
    { verdi: 'ja', tekst: 'Ja' },
    { verdi: 'nei', tekst: 'Nei' },
    { verdi: 'ukjent', tekst: 'Vet ikke' },
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
    { verdi: 'ukjent', tekst: 'Vet ikke' },
  ],
  /** Hvor pasienten følges opp, i stedet for to motsatte ja/nei-spørsmål om poliklinisk oppfølging og innleggelse. */
  oppfolging: [
    { verdi: 'poliklinisk', tekst: 'Poliklinisk' },
    { verdi: 'innlagt', tekst: 'Innlagt' },
    { verdi: 'annet', tekst: 'Annet' },
    { verdi: 'ukjent', tekst: 'Vet ikke' },
  ],
  /** Hvorfor legemidlet byttes, i stedet for et ja/nei-spørsmål der «Nei» stopper. */
  bytteaarsak: [
    { verdi: 'bivirkninger', tekst: 'Bivirkninger' },
    { verdi: 'effekt', tekst: 'Utilstrekkelig effekt' },
    { verdi: 'annet', tekst: 'Annen grunn' },
    { verdi: 'ukjent', tekst: 'Vet ikke' },
  ],
  /** Én bekreftelse (reservevisningen og samlet bekreftelse). */
  bekreftet: [{ verdi: 'ja', tekst: 'Bekreftet' }],
  /** Reservevisningen av et spørsmål i regelen, som i dagens skjema (S5). */
  ja_nei: [
    { verdi: 'ja', tekst: 'Ja' },
    { verdi: 'nei', tekst: 'Nei' },
  ],
  /** Reservevisningen av et unntak: regelens utsagn med svar om det stemmer for pasienten (S5). */
  gjelder: [
    { verdi: 'ja', tekst: 'Stemmer' },
    { verdi: 'nei', tekst: 'Stemmer ikke' },
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
  /**
   * Svaret følger av formuleringen klinikeren uttrykkelig valgte for forløpet
   * i steg 1 (beslutning B2), og spørsmålet stilles da ikke. Bare når
   * virkestoffet har flere formuleringer å velge mellom; ellers stilles det.
   */
  avledesAv?: { forlop: 'fra' | 'til'; formulering: Kildeformulering; svar: string }
}

/**
 * Hvordan ett spørsmål bidrar til en betingelse: svarene i `ja` gjør
 * betingelsen sann, svarene i `nei` usann; et annet svar (ikke «Vet ikke»)
 * avgjør ingenting og lar de andre spørsmålene avgjøre. Uten `ja` og `nei`
 * gjelder «Ja» og «Nei»; med bare den ene gir ingen andre svar den andre.
 */
export interface Svarkilde {
  sporsmal: string
  ja?: readonly string[]
  nei?: readonly string[]
  /**
   * Forklaringen når et svar på nettopp dette spørsmålet gjør at regelen ikke
   * kan gi en plan. Den går foran betingelsens forklaring, så hvert stoppende
   * svar sier hvilket forhold som stopper.
   */
  forklaring?: string
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
  /**
   * Forklaringen når svaret gjør at regelen ikke kan gi en plan: hvilket
   * forhold som stopper, hvorfor planen ikke dekker det, og hva klinikeren gjør
   * videre. En forklaring på svarkilden går foran.
   */
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

/** De perorale legemidlene det byttes fra til depot (K3), med spørsmålet om pasienten er stabilisert på dem. */
const TIL_DEPOT = [
  { id: 'stabilisert_aripiprazol', tekst: 'Er pasienten stabilisert på peroral aripiprazol?' },
  { id: 'stabilisert_paliperidon', tekst: 'Er pasienten stabilisert på peroral paliperidon depottablett?' },
  { id: 'stabilisert_risperidon', tekst: 'Er pasienten stabilisert på peroral risperidon?' },
] as const

/**
 * Det klinikeren gjør videre når planen stopper, per verktøy. Hver
 * stoppforklaring slutter med én av dem, så klinikeren alltid får vite at
 * behandlingen må planlegges utenfor verktøyet, og hva som skal planlegges.
 */
const VIDERE = {
  nedtrapping: 'Nedtrappingen må planlegges individuelt.',
  bytte: 'Byttet må planlegges individuelt.',
  depot: 'Overgangen til depot må planlegges individuelt.',
  opptrapping: 'Opptrappingen av lamotrigin må planlegges individuelt.',
} as const
type Videre = keyof typeof VIDERE

/** En stoppforklaring: grunnen, så hva som gjøres videre. */
const stopp = (grunn: string, videre: Videre) => `${grunn} ${VIDERE[videre]}`
/** Grunnen når forholdet ikke er dekket av den godkjente planen: manglende støtte, ikke nødvendigvis en kontraindikasjon. */
const ikkeDekket = (forhold: string) => `Verktøyet har foreløpig ingen godkjent standardplan ${forhold}.`
/** Grunnen når planen bare gjelder en avgrenset gruppe eller situasjon. */
const gjelderBare = (gruppe: string) => `Den godkjente planen gjelder bare ${gruppe}.`

/** Spørsmålene, i rekkefølgen de stilles innen hver gruppe: først om planen gjelder pasienten, så forholdene som utelukker den. */
export const KATALOGSPORSMAL: readonly Katalogsporsmal[] = [
  // --- Stoppforhold: om planen gjelder pasienten ---
  { id: 'alder', tekst: 'Hvor gammel er pasienten?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'alder' },
  { id: 'schizofreni', tekst: 'Har pasienten schizofreni?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  ...TIL_DEPOT.map(({ id, tekst }): Katalogsporsmal => ({ id, tekst, gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' })),
  { id: 'tolererer_aripiprazol', tekst: 'Har pasienten tålt peroral aripiprazol?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'tolererer_risperidon',
    tekst: 'Er det dokumentert i journalen at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet?',
    hjelp: 'Anafylaksi er likevel mulig etter injeksjon.',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'stabil', tekst: 'Er pasienten stabil?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'oppfolging', tekst: 'Hvordan følges pasienten?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'oppfolging' },
  ...forHvertBytte(({ stoff }) => ({ id: `bytteaarsak_${stoff}`, tekst: `Hvorfor byttes ${stoff}?`, gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'bytteaarsak' })),
  ...forHvertBytte(({ stoff }) => ({
    id: `peroral_${stoff}`,
    tekst: `Bruker pasienten peroral ${stoff} (tabletter, smeltetabletter eller mikstur), ikke depotinjeksjon?`,
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
    avledesAv: { forlop: 'fra', formulering: 'standard', svar: 'ja' },
  })),
  { id: 'depresjon_bytte', tekst: 'Gjelder byttet behandling av depresjon?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'valproat_fast', tekst: 'Bruker pasienten valproat fast?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'litium_fast', tekst: 'Bruker pasienten litium fast?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'serumlitium', tekst: 'Følges serumlitium som vanlig under opptrappingen?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  // Avledet av valget av preparat (beslutning B2); stilles bare når B2 er akseptert.
  {
    id: 'preparat_lithionit',
    tekst: 'Bruker pasienten Lithionit 42 mg depottabletter?',
    hjelp: 'Andre litiumpreparater, også de der styrken oppgis som mg litiumsalt, er utenfor regelen.',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'dose_lithionit',
    tekst: 'Er døgndosen fylt inn i mg litium (Li⁺), som antall tabletter × 42 mg?',
    hjelp: 'Én tablett er 42 mg litium (6 mmol).',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
    vises: { sporsmal: 'preparat_lithionit', svar: ['ja'] },
  },
  {
    id: 'preparat_natriumvalproat',
    tekst: 'Bruker pasienten et natriumvalproatpreparat?',
    hjelp: 'Preparat, styrke og fordeling over døgnet fortsetter uendret.',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'dose_natriumvalproat',
    tekst: 'Er døgndosen fylt inn i mg natriumvalproat, slik den står i legemiddellisten?',
    hjelp: 'Preparater der dosen ikke oppgis i mg natriumvalproat, er utenfor regelen.',
    gruppe: 'stopp',
    kategori: 'avledet',
    svar: 'ja_nei_ukjent',
    vises: { sporsmal: 'preparat_natriumvalproat', svar: ['ja'] },
  },

  // --- Stoppforhold: forhold som utelukker planen («Ja» stopper) ---
  { id: 'gjentatte_tilbakefall', tekst: 'Har pasienten hatt gjentatte psykotiske tilbakefall?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'akutt_situasjon',
    tekst: 'Har pasienten en akutt alvorlig bivirkning, en forgiftning eller en alvorlig interaksjon, eller må legemidlet av andre grunner seponeres raskt?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  { id: 'del_av_bytte', tekst: 'Skal legemidlet seponeres som del av et bytte til et annet legemiddel?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'ustabil_dose', tekst: 'Er dosen ustabil?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'uregelmessig_bruk', tekst: 'Tar pasienten legemidlet uregelmessig?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  {
    id: 'tidligere_seponeringsplager',
    tekst: 'Har pasienten tidligere fått seponeringssymptomer eller opplevd mislykket nedtrapping eller seponering av dette legemidlet?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'tidligere_seponeringsplager_sertralin',
    tekst: 'Har pasienten tidligere fått seponeringssymptomer eller opplevd mislykket nedtrapping eller seponering av sertralin?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `tidligere_seponeringsplager_${stoff}`,
    tekst: `Har pasienten tidligere fått seponeringssymptomer eller opplevd mislykket nedtrapping eller seponering av ${stoff} eller et annet antidepressiv?`,
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
  ...forHvertBytte(({ stoff }) => ({
    id: `seponeringsplager_${stoff}`,
    tekst: `Har pasienten tidligere fått seponeringsplager, uro, søvnvansker eller forverring av psykosen ved dosereduksjon eller seponering av ${stoff}?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  { id: 'qt_forlengelse', tekst: 'Har pasienten kjent QT-forlengelse eller medfødt langt QT-syndrom?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'qt_legemiddel', tekst: 'Bruker pasienten et annet legemiddel som forlenger QT-intervallet?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
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
  {
    id: 'serotonerge_mirtazapin',
    tekst: 'Bruker pasienten andre serotonerge legemidler, eller andre legemidler som gjør overlappen mellom sertralin og mirtazapin mer risikofylt?',
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  ...forHvertSertralinbytte(({ stoff }) => ({
    id: `serotonerge_${stoff}`,
    tekst: `Bruker pasienten andre serotonerge legemidler, eller andre legemidler som gjør byttet fra ${stoff} til sertralin mer risikofylt?`,
    gruppe: 'stopp',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  })),
  { id: 'overvekt', tekst: 'Har pasienten overvekt eller fedme?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'kreatininclearance_under_80', tekst: 'Har pasienten kreatininclearance under 80 ml/min?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'valproat_endres', tekst: 'Skal valproat endres eller seponeres i løpet av opptrappingen?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'litium_endres', tekst: 'Skal litium endres eller seponeres i løpet av opptrappingen?', gruppe: 'stopp', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
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

  // --- Forhold som endrer planen ---
  {
    id: 'eldre_enn_65',
    tekst: 'Er pasienten over 65 år?',
    hjelp: 'En pasient som er 65 år, svarer «Nei».',
    gruppe: 'endrer',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
    vises: { sporsmal: 'alder', svar: ['65_eller_eldre'] },
  },
  { id: 'lang_behandlingstid', tekst: 'Har pasienten brukt legemidlet i mange måneder eller lenger?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
  { id: 'lang_behandlingstid_sertralin', tekst: 'Har pasienten brukt sertralin i mange måneder eller lenger?', gruppe: 'endrer', kategori: 'sikkerhetsopplysning', svar: 'ja_nei_ukjent' },
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
  { id: 'spesialist_vurdert', tekst: 'Er byttet vurdert i, eller med råd fra, spesialisthelsetjenesten?', gruppe: 'vurdering', kategori: 'klinisk_vurdering', svar: 'ja_ikke_enna' },
  {
    id: 'tett_oppfolging',
    tekst: 'Kan pasienten følges tett de første ukene?',
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
  { id: 'legemidler_kontrollert', tekst: 'Er pasientens øvrige legemidler kontrollert?', gruppe: 'vurdering', kategori: 'klinisk_vurdering', svar: 'ja_ikke_enna' },
  {
    id: 'organfunksjon_interaksjoner',
    tekst: 'Er lever- og nyrefunksjon og interaksjoner vurdert?',
    hjelp: 'Ved nedsatt organfunksjon eller interaksjoner som kan endre konsentrasjonen av legemidlet, må dosen og planen vurderes individuelt.',
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  },
  {
    id: 'ppp_annen_behandling',
    tekst: 'Har annen behandling ikke effekt, eller tolereres den ikke?',
    gruppe: 'vurdering',
    kategori: 'sikkerhetsopplysning',
    svar: 'ja_nei_ukjent',
  },
  {
    id: 'ppp_spesialist',
    tekst: 'Har spesialist i bipolar lidelse ved siste årlige gjennomgang vurdert valproat som den mest egnede behandlingen?',
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
    tekst: 'Følges pasienten opp ved vurderingspunktene i planen?',
    hjelp: `Før hver reduksjon og før seponeringen av ${stoff}, en uke etter overgangen til sertralin, før en eventuell økning av sertralin (effekt, toleranse og seponeringssymptomer) og fire uker etter oppstarten og hver endring av den. Dagene er minstetider. Den første uken etter overgangen følges seponeringssymptomer, tegn på serotonerg belastning og forverring av depresjonen.`,
    gruppe: 'vurdering',
    kategori: 'klinisk_vurdering',
    svar: 'ja_ikke_enna',
  })),
]

/** Alderen som avgjør «under 18 år», «voksen» og «65 år eller eldre». */
const UNDER_18: Svarkilde = { sporsmal: 'alder', ja: ['under_18'], nei: ['18_64', '65_eller_eldre'] }
const FRA_65 = (forklaring?: string): Svarkilde => ({ sporsmal: 'alder', ja: ['65_eller_eldre'], nei: ['under_18', '18_64'], ...(forklaring && { forklaring }) })
const VOKSEN = (forklaring: string): Svarkilde => ({ sporsmal: 'alder', ja: ['18_64', '65_eller_eldre'], nei: ['under_18'], forklaring })
/** «Over 65 år»: under 65 er avgjort av alderen; ved 65 eller eldre avgjør oppfølgingsspørsmålet. */
const OVER_65: readonly Svarkilde[] = [{ sporsmal: 'alder', nei: ['under_18', '18_64'] }, { sporsmal: 'eldre_enn_65' }]
/** Et spørsmål der «Ja» gjør betingelsen usann: et forhold som utelukker en forutsetning i regelen. */
const motsatt = (sporsmal: string, forklaring?: string): Svarkilde => ({ sporsmal, ja: ['nei'], nei: ['ja'], ...(forklaring && { forklaring }) })
const med = (sporsmal: string, forklaring: string): Svarkilde => ({ sporsmal, forklaring })

const fra = (...sporsmal: (string | Svarkilde)[]): Svarkilde[] => sporsmal.map((s) => (typeof s === 'string' ? { sporsmal: s } : s))

const TIDLIGERE_SEPONERINGSVANSKER = ikkeDekket('ved tidligere seponeringsvansker')
const UNDER_65 = ikkeDekket('for pasienter som er 65 år eller eldre')
const PPP_IKKE_OPPFYLT = stopp('Et vilkår i det graviditetsforebyggende programmet for valproat er ikke oppfylt, og den godkjente planen gjelder bare når alle vilkårene er det.', 'opptrapping')

/** Betingelsene i nedtrappingsreglene for SSRI og vortioksetin, som har samme oppbygning. */
const nedtrapping = (regel: string): Katalogbetingelse[] => [
  {
    regel,
    type: 'unntak',
    id: 'under_18',
    kategori: 'sikkerhetsopplysning',
    fra: [UNDER_18],
    forklaring: `${gjelderBare('voksne')} Nedtrapping hos barn og ungdom må vurderes særskilt.`,
  },
  {
    regel,
    type: 'unntak',
    id: 'akutt_situasjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('akutt_situasjon'),
    forklaring: 'Når legemidlet må seponeres raskt, passer ikke en gradvis nedtrapping. Seponeringen må planlegges individuelt.',
  },
  {
    regel,
    type: 'unntak',
    id: 'ustabil_dose_eller_bytte',
    kategori: 'sikkerhetsopplysning',
    forklaring: stopp('Den godkjente planen forutsetter en stabil dose som tas regelmessig, og gjelder ikke seponering som del av et bytte.', 'nedtrapping'),
    fra: fra(
      med('del_av_bytte', 'Nedtrappingen gjelder ikke seponering som del av et bytte. Et bytte planlegges i «Bytte antidepressiv» eller individuelt.'),
      med('ustabil_dose', stopp('Den godkjente planen forutsetter en stabil dose.', 'nedtrapping')),
      med('uregelmessig_bruk', stopp('Den godkjente planen forutsetter at legemidlet tas regelmessig.', 'nedtrapping')),
    ),
  },
  {
    regel,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tidligere_seponeringsplager'),
    forklaring: `${TIDLIGERE_SEPONERINGSVANSKER} Nedtrappingen må tilpasses individuelt.`,
  },
  {
    regel,
    type: 'sporsmal',
    id: 'lang_behandlingstid',
    kategori: 'sikkerhetsopplysning',
    fra: fra('lang_behandlingstid'),
    forklaring: `${gjelderBare('kort behandlingstid')} Etter lang bruk anbefales vanligvis mindre reduksjoner og en langsommere, symptomstyrt nedtrapping. ${VIDERE.nedtrapping}`,
  },
  {
    regel,
    type: 'sporsmal',
    id: 'utenfor_doseramme',
    kategori: 'sikkerhetsopplysning',
    fra: fra('utenfor_doseramme'),
    forklaring: stopp(gjelderBare('doser innenfor preparatomtalens doseramme for pasientens indikasjon og pasientgruppe'), 'nedtrapping'),
  },
  { regel, type: 'bekreftelse', id: 'startforslag', kategori: 'forbehold' },
  { regel, type: 'bekreftelse', id: 'organfunksjon_interaksjoner', kategori: 'klinisk_vurdering', fra: fra('organfunksjon_interaksjoner') },
]

/** Betingelsene i begge reglene for å legge lamotrigin til. */
const lamotrigin = (regel: string): Katalogbetingelse[] => [
  { regel, type: 'unntak', id: 'under_18', kategori: 'sikkerhetsopplysning', fra: [UNDER_18], forklaring: stopp(gjelderBare('voksne'), 'opptrapping') },
  {
    regel,
    type: 'unntak',
    id: 'tidligere_reaksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tidligere_reaksjon_lamotrigin'),
    forklaring: `${ikkeDekket('når pasienten tidligere har fått utslett, Stevens-Johnsons syndrom, toksisk epidermal nekrolyse, DRESS eller aseptisk meningitt ved bruk av lamotrigin')} Om lamotrigin kan startes på nytt, må vurderes individuelt.`,
  },
  {
    regel,
    type: 'unntak',
    id: 'bruker_lamotrigin',
    kategori: 'sikkerhetsopplysning',
    fra: fra('bruker_lamotrigin'),
    forklaring: `${gjelderBare('en ny oppstart av lamotrigin')} Når pasienten bruker lamotrigin nå eller nylig har sluttet, må doseringen planlegges individuelt.`,
  },
  {
    regel,
    type: 'unntak',
    id: 'nedsatt_leverfunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('nedsatt_leverfunksjon_child_pugh'),
    forklaring: stopp(ikkeDekket('ved moderat eller alvorlig nedsatt leverfunksjon'), 'opptrapping'),
  },
  {
    regel,
    type: 'unntak',
    id: 'nedsatt_nyrefunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('nedsatt_nyrefunksjon_betydelig'),
    forklaring: stopp(ikkeDekket('ved betydelig nedsatt nyrefunksjon eller nyresvikt'), 'opptrapping'),
  },
  {
    regel,
    type: 'unntak',
    id: 'hla_b1502',
    kategori: 'sikkerhetsopplysning',
    fra: fra('hla_b1502'),
    forklaring: `${ikkeDekket('for pasienter som er kjent positive for HLA-B*1502')} Om lamotrigin kan startes, må vurderes individuelt.`,
  },
  { regel, type: 'sporsmal', id: 'ostrogen', kategori: 'sikkerhetsopplysning', fra: fra('ostrogen') },
  {
    regel,
    type: 'bekreftelse',
    id: 'maldose_valgt',
    kategori: 'klinisk_vurdering',
    fra: fra('maldose_valgt'),
    forklaring: `${gjelderBare('denne måldosen')} Er et annet mål ønsket, må opptrappingen planlegges individuelt.`,
  },
  { regel, type: 'bekreftelse', id: 'ostrogen_maldose', kategori: 'klinisk_vurdering', fra: fra('ostrogen_maldose') },
  { regel, type: 'bekreftelse', id: 'utslett_informert', kategori: 'klinisk_vurdering', fra: fra('utslett_informert') },
]

/** Indikasjonen «voksen med schizofreni som er stabilisert på det perorale legemidlet» i depotreglene (K3), spurt som enkle spørsmål; `ekstra` er et vilkår regelen har i tillegg, med spørsmålet og hvordan det står i forklaringen. */
const depotindikasjon = (regel: string, stabilisert: (typeof TIL_DEPOT)[number]['id'], legemiddel: string, ekstra?: { kilde: Svarkilde; vilkar: string }): Katalogbetingelse => ({
  regel,
  type: 'bekreftelse',
  id: 'indikasjon',
  kategori: 'sikkerhetsopplysning',
  forklaring: stopp(gjelderBare(`voksne med schizofreni som er stabilisert på ${legemiddel}${ekstra ? ` ${ekstra.vilkar}` : ''}`), 'depot'),
  fra: [
    VOKSEN(stopp(gjelderBare('voksne'), 'depot')),
    med('schizofreni', stopp(gjelderBare('pasienter med schizofreni'), 'depot')),
    med(stabilisert, stopp(gjelderBare(`pasienter som er stabilisert på ${legemiddel}`), 'depot')),
    ...(ekstra ? [ekstra.kilde] : []),
  ],
})

/** Betingelsene i byttene til aripiprazol (K3). */
const tilAripiprazol = ({ regel, stoff }: Bytte): Katalogbetingelse[] => [
  {
    regel,
    type: 'bekreftelse',
    id: 'indikasjon',
    kategori: 'sikkerhetsopplysning',
    forklaring: stopp(gjelderBare(`stabile voksne med schizofreni som følges poliklinisk, og bytte fra ${stoff} på grunn av bivirkninger eller utilstrekkelig effekt`), 'bytte'),
    fra: [
      VOKSEN(stopp(gjelderBare('voksne'), 'bytte')),
      med('schizofreni', stopp(gjelderBare('pasienter med schizofreni'), 'bytte')),
      med('stabil', stopp(gjelderBare('stabile pasienter'), 'bytte')),
      { sporsmal: 'oppfolging', ja: ['poliklinisk'], nei: ['innlagt', 'annet'], forklaring: stopp(gjelderBare('pasienter som følges poliklinisk'), 'bytte') },
      { sporsmal: `bytteaarsak_${stoff}`, ja: ['bivirkninger', 'effekt'], nei: ['annet'], forklaring: stopp(gjelderBare('bytte på grunn av bivirkninger eller utilstrekkelig effekt'), 'bytte') },
    ],
  },
  {
    regel,
    type: 'bekreftelse',
    id: 'peroral_formulering',
    kategori: 'avledet',
    fra: fra(`peroral_${stoff}`),
    forklaring: stopp(gjelderBare(`bytte fra peroral ${stoff}, ikke fra depotinjeksjon`), 'bytte'),
  },
  {
    regel,
    type: 'unntak',
    id: 'tilbakefall_innlagt',
    kategori: 'sikkerhetsopplysning',
    fra: [{ sporsmal: 'gjentatte_tilbakefall' }, { sporsmal: 'oppfolging', ja: ['innlagt'], nei: ['poliklinisk', 'annet'] }, motsatt('stabil')],
    forklaring: stopp('Ved gjentatte psykotiske tilbakefall, innleggelse eller ustabil tilstand anbefaler kilden en annen opptrapping, som verktøyet ikke har.', 'bytte'),
  },
  {
    regel,
    type: 'unntak',
    id: 'alder_65',
    kategori: 'sikkerhetsopplysning',
    fra: [FRA_65()],
    forklaring: stopp('Effekt og sikkerhet av aripiprazol er ikke fastslått fra 65 år, og den godkjente planen gjelder ikke denne aldersgruppen.', 'bytte'),
  },
  {
    regel,
    type: 'unntak',
    id: 'cyp_aripiprazol',
    kategori: 'sikkerhetsopplysning',
    fra: fra('sterk_cyp_hemmer', 'sterk_cyp3a4_induktor'),
    forklaring: stopp('Aripiprazoldosen skal da justeres, og den godkjente planen har ingen slik justering.', 'bytte'),
  },
  {
    regel,
    type: 'unntak',
    id: 'seponeringsplager',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`seponeringsplager_${stoff}`),
    forklaring: `Den godkjente planen kan ikke stå for siste trinn ned til 0 når pasienten tidligere har fått seponeringsplager eller forverring ved dosereduksjon eller seponering av ${stoff}. Nedtrappingen av ${stoff} må planlegges individuelt.`,
  },
  { regel, type: 'bekreftelse', id: 'spesialist_risiko', kategori: 'klinisk_vurdering', fra: fra('spesialist_vurdert', 'tett_oppfolging') },
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
    forklaring: stopp(gjelderBare('voksne fra 18 til og med 65 år og bytte ved behandling av depresjon'), 'bytte'),
    fra: [
      { sporsmal: 'alder', ja: ['18_64'], nei: ['under_18'], forklaring: stopp(gjelderBare('voksne fra 18 til og med 65 år'), 'bytte') },
      { sporsmal: 'eldre_enn_65', ja: ['nei'], nei: ['ja'] },
      med('depresjon_bytte', stopp(gjelderBare('bytte ved behandling av depresjon'), 'bytte')),
    ],
  },
  {
    regel,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`tidligere_seponeringsplager_${stoff}`),
    forklaring: `${TIDLIGERE_SEPONERINGSVANSKER} Byttet må planlegges individuelt, med mindre trinn.`,
  },
  {
    regel,
    type: 'unntak',
    id: 'lang_behandlingstid',
    kategori: 'sikkerhetsopplysning',
    fra: fra(`over_8_uker_${stoff}`),
    forklaring: `${gjelderBare(`de første 8 ukene med ${stoff}`)} Etter lengre bruk må byttet planlegges individuelt, og etter mange måneder anbefales mindre reduksjoner og en langsommere, symptomstyrt nedtrapping.`,
  },
  {
    regel,
    type: 'unntak',
    id: 'over_65',
    kategori: 'sikkerhetsopplysning',
    fra: OVER_65,
    forklaring: stopp('Den godkjente planen gjelder ikke pasienter over 65 år, fordi preparatomtalene har egne doser eller krav om nøye oppfølging for eldre.', 'bytte'),
  },
  {
    regel,
    type: 'unntak',
    id: 'nedsatt_leverfunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('nedsatt_leverfunksjon'),
    forklaring: stopp(`Ved nedsatt leverfunksjon krever preparatomtalene for ${stoff} og sertralin lavere doser eller særskilt hensyn.`, 'bytte'),
  },
  { regel, type: 'bekreftelse', id: 'toleranse_bytte', kategori: 'klinisk_vurdering', fra: fra(`oppfolging_bytte_${stoff}`) },
  {
    regel,
    type: 'bekreftelse',
    id: 'serotonerg_sammedisinering',
    kategori: 'klinisk_vurdering',
    forklaring: stopp(ikkeDekket('når pasienten bruker andre serotonerge legemidler eller legemidler som gjør byttet mer risikofylt'), 'bytte'),
    fra: [{ sporsmal: 'legemidler_kontrollert' }, motsatt(`serotonerge_${stoff}`)],
  },
]

/** Betingelsene i escitalopramreglene (K1 og B2), som bare skiller seg i aldersgrensen `eldre` og forklaringen der. */
const escitalopram = (regel: string, eldre: readonly Svarkilde[], eldreForklaring?: string): Katalogbetingelse[] => [
  ...nedtrapping(regel),
  {
    regel,
    type: 'unntak',
    id: 'qt_forlengelse',
    kategori: 'sikkerhetsopplysning',
    fra: fra('qt_forlengelse', 'qt_legemiddel'),
    forklaring: stopp('Det er en kontraindikasjon for escitalopram i preparatomtalen, og verktøyet kan ikke overstyre den.', 'nedtrapping'),
  },
  { regel, type: 'sporsmal', id: 'eldre', kategori: 'sikkerhetsopplysning', fra: eldre, ...(eldreForklaring && { forklaring: eldreForklaring }) },
  {
    regel,
    type: 'sporsmal',
    id: 'nedsatt_leverfunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('nedsatt_leverfunksjon'),
    forklaring: stopp('Nedsatt leverfunksjon krever en særskilt vurdering, som den godkjente planen ikke dekker.', 'nedtrapping'),
  },
  {
    regel,
    type: 'sporsmal',
    id: 'langsom_cyp2c19',
    kategori: 'sikkerhetsopplysning',
    fra: fra('langsom_cyp2c19'),
    forklaring: stopp(ikkeDekket('for kjent langsomme CYP2C19-metaboliserere'), 'nedtrapping'),
  },
]

/** Hver betingelse i hver godkjent regel. En betingelse som ikke står her, spørres med regelens egen tekst (S5). */
export const KATALOGBETINGELSER: readonly Katalogbetingelse[] = [
  // Escitalopram (K1, v13): «over 65 år». Erstattet av versjon 14 i appen.
  ...escitalopram(ESC, OVER_65, stopp(ikkeDekket('for pasienter over 65 år'), 'nedtrapping')),
  // Escitalopram med tabletter og dråper (B2, v14): som versjon 13, men grensen er «65 år eller eldre».
  ...escitalopram(ESC_B2, [FRA_65(stopp(UNDER_65, 'nedtrapping'))]),

  // Vortioksetin (v12): grensen er «65 år eller eldre».
  ...nedtrapping(VORT),
  { regel: VORT, type: 'sporsmal', id: 'eldre', kategori: 'sikkerhetsopplysning', fra: [FRA_65(stopp(UNDER_65, 'nedtrapping'))] },

  // Sertralin → mirtazapin (v10): godkjent, men gir ingen komplett plan og tilbys ikke ennå.
  {
    regel: SERT,
    type: 'sporsmal',
    id: 'lang_behandlingstid',
    kategori: 'sikkerhetsopplysning',
    fra: fra('lang_behandlingstid_sertralin'),
    forklaring: stopp(gjelderBare('kort behandlingstid med sertralin'), 'bytte'),
  },
  {
    regel: SERT,
    type: 'unntak',
    id: 'tidligere_seponeringssymptomer',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tidligere_seponeringsplager_sertralin'),
    forklaring: `${TIDLIGERE_SEPONERINGSVANSKER} Byttet må planlegges individuelt, med mindre trinn.`,
  },
  { regel: SERT, type: 'bekreftelse', id: 'toleranse_overlapp', kategori: 'forbehold' },
  {
    regel: SERT,
    type: 'bekreftelse',
    id: 'serotonerg_sammedisinering',
    kategori: 'klinisk_vurdering',
    forklaring: stopp(ikkeDekket('når pasienten bruker andre serotonerge legemidler eller legemidler som gjør byttet mer risikofylt'), 'bytte'),
    fra: [{ sporsmal: 'legemidler_kontrollert' }, motsatt('serotonerge_mirtazapin')],
  },

  // Escitalopram eller citalopram → sertralin (K2, v2).
  ...TIL_SERTRALIN.flatMap(tilSertralin),

  // Aripiprazol → Abilify Maintena (v3).
  depotindikasjon(MAINTENA, 'stabilisert_aripiprazol', 'peroral aripiprazol', { kilde: med('tolererer_aripiprazol', stopp(gjelderBare('pasienter som har tålt peroral aripiprazol'), 'depot')), vilkar: 'og har tålt den' }),
  {
    regel: MAINTENA,
    type: 'unntak',
    id: 'cyp2d6_langsom',
    kategori: 'sikkerhetsopplysning',
    fra: fra('cyp2d6_langsom'),
    forklaring: stopp('Preparatomtalen har egne doser for kjent langsomme CYP2D6-omsettere, og de er ikke med i den godkjente planen.', 'depot'),
  },
  {
    regel: MAINTENA,
    type: 'unntak',
    id: 'sterk_cyp_hemmer',
    kategori: 'sikkerhetsopplysning',
    fra: fra('sterk_cyp_hemmer'),
    forklaring: stopp('Dosen skal da reduseres, og den godkjente planen har ingen slik reduksjon.', 'depot'),
  },
  {
    regel: MAINTENA,
    type: 'unntak',
    id: 'cyp3a4_induktor',
    kategori: 'sikkerhetsopplysning',
    fra: fra('cyp3a4_induktor'),
    forklaring: stopp('En CYP3A4-induktor bør unngås sammen med depotet.', 'depot'),
  },

  // Paliperidon → Xeplion (v3).
  depotindikasjon(XEPLION, 'stabilisert_paliperidon', 'peroral paliperidon depottablett'),
  {
    regel: XEPLION,
    type: 'unntak',
    id: 'nedsatt_nyrefunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('kreatininclearance_under_80'),
    forklaring: stopp('Preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.', 'depot'),
  },

  // Peroral risperidon → Xeplion (K3, v8): grensen er «over 65 år».
  depotindikasjon(RISPERIDON_XEPLION, 'stabilisert_risperidon', 'peroral risperidon'),
  {
    regel: RISPERIDON_XEPLION,
    type: 'bekreftelse',
    id: 'tidligere_toleranse',
    kategori: 'sikkerhetsopplysning',
    fra: fra('tolererer_risperidon'),
    forklaring: stopp(gjelderBare('når det er dokumentert at pasienten har tålt peroral risperidon over tid, uten tegn til overfølsomhet'), 'depot'),
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'nedsatt_nyrefunksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('kreatininclearance_under_80'),
    forklaring: stopp('Preparatomtalen har andre start- og vedlikeholdsdoser fra 50 til under 80 ml/min og fraråder Xeplion under 50 ml/min.', 'depot'),
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'over_65',
    kategori: 'sikkerhetsopplysning',
    fra: OVER_65,
    forklaring: stopp('Effekt og sikkerhet av Xeplion er ikke fastslått over 65 år, og den godkjente planen gjelder ikke denne aldersgruppen.', 'depot'),
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'overvekt',
    kategori: 'sikkerhetsopplysning',
    fra: fra('overvekt'),
    forklaring: stopp('Preparatomtalen sier at doser i den øvre delen av området kan trengs, så anbefalte 75 mg er ikke nødvendigvis riktig.', 'depot'),
  },
  {
    regel: RISPERIDON_XEPLION,
    type: 'unntak',
    id: 'risperidon_interaksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('risperidon_interaksjon'),
    forklaring: stopp('Da sier risperidondosen ikke hvilken eksponering Xeplion må gi.', 'depot'),
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
    forklaring: stopp('Sammen med valproat gjelder det også valproatbehandlingen: valproat er kontraindisert under graviditet ved bipolar lidelse, og spesialist skal konsulteres.', 'opptrapping'),
  },
  { regel: VALPROAT, type: 'sporsmal', id: 'kan_bli_gravid', kategori: 'sikkerhetsopplysning', fra: fra('kan_bli_gravid') },
  { regel: VALPROAT, type: 'sporsmal', id: 'kan_bli_far', kategori: 'sikkerhetsopplysning', fra: fra('kan_bli_far') },
  {
    regel: VALPROAT,
    type: 'bekreftelse',
    id: 'fortsetter_valproat',
    kategori: 'sikkerhetsopplysning',
    forklaring: stopp(gjelderBare('når pasienten bruker valproat fast og fortsetter uendret gjennom hele opptrappingen'), 'opptrapping'),
    fra: [
      med('valproat_fast', stopp(gjelderBare('når pasienten bruker valproat fast'), 'opptrapping')),
      motsatt('valproat_endres', stopp(gjelderBare('når valproat fortsetter uendret gjennom hele opptrappingen'), 'opptrapping')),
    ],
  },
  ...(
    [
      ['ppp_indikasjon', ['ppp_annen_behandling', 'ppp_spesialist']],
      ['ppp_prevensjon', ['ppp_prevensjon']],
    ] as const
  ).map(
    ([id, sporsmal]): Katalogbetingelse => ({
      regel: VALPROAT,
      type: 'bekreftelse',
      id,
      kategori: 'sikkerhetsopplysning',
      fra: fra(...sporsmal),
      forklaring: PPP_IKKE_OPPFYLT,
    }),
  ),
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_informasjon', kategori: 'klinisk_vurdering', fra: fra('ppp_informasjon') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'ppp_graviditet', kategori: 'klinisk_vurdering', fra: fra('ppp_graviditet') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'far_informasjon', kategori: 'klinisk_vurdering', fra: fra('far_informasjon') },
  { regel: VALPROAT, type: 'bekreftelse', id: 'far_vurdering', kategori: 'klinisk_vurdering', fra: fra('far_vurdering') },
  {
    regel: VALPROAT,
    type: 'bekreftelse',
    id: 'aktuell_dose',
    kategori: 'avledet',
    fra: [
      med('preparat_natriumvalproat', stopp(gjelderBare('natriumvalproatpreparater'), 'opptrapping')),
      med('dose_natriumvalproat', stopp(gjelderBare('når døgndosen er fylt inn i mg natriumvalproat'), 'opptrapping')),
    ],
    forklaring: stopp(gjelderBare('natriumvalproat med dosen fylt inn i mg natriumvalproat'), 'opptrapping'),
  },

  // Lamotrigin lagt til litium (K4, v2).
  ...lamotrigin(LITIUM),
  {
    regel: LITIUM,
    type: 'unntak',
    id: 'graviditet',
    kategori: 'sikkerhetsopplysning',
    fra: fra('graviditet'),
    forklaring: stopp(ikkeDekket('under graviditet, ved planlagt graviditet eller ved amming'), 'opptrapping'),
  },
  {
    regel: LITIUM,
    type: 'unntak',
    id: 'valproat_eller_induserende',
    kategori: 'sikkerhetsopplysning',
    forklaring: stopp('Sammen med valproat eller et legemiddel som induserer glukuronideringen av lamotrigin, gjelder en annen opptrapping enn i denne planen.', 'opptrapping'),
    fra: fra(
      med('bruker_valproat', stopp('Sammen med valproat gjelder en annen opptrapping enn i denne planen.', 'opptrapping')),
      med('induserer_glukuronidering', stopp('Sammen med et legemiddel som induserer glukuronideringen av lamotrigin, gjelder en annen opptrapping enn i denne planen.', 'opptrapping')),
    ),
  },
  {
    regel: LITIUM,
    type: 'unntak',
    id: 'ukjent_interaksjon',
    kategori: 'sikkerhetsopplysning',
    fra: fra('ukjent_interaksjon_lamotrigin'),
    forklaring: stopp('Ved ukjent interaksjon skal opptrappingen for samtidig valproat brukes, og den er ikke med i denne planen.', 'opptrapping'),
  },
  {
    regel: LITIUM,
    type: 'bekreftelse',
    id: 'fortsetter_litium',
    kategori: 'sikkerhetsopplysning',
    forklaring: stopp(gjelderBare('når pasienten bruker litium fast, fortsetter uendret gjennom hele opptrappingen og serumlitium følges som vanlig'), 'opptrapping'),
    fra: [
      med('litium_fast', stopp(gjelderBare('når pasienten bruker litium fast'), 'opptrapping')),
      motsatt('litium_endres', stopp(gjelderBare('når litium fortsetter uendret gjennom hele opptrappingen'), 'opptrapping')),
      med('serumlitium', stopp(gjelderBare('når serumlitium følges som vanlig'), 'opptrapping')),
    ],
  },
  {
    regel: LITIUM,
    type: 'bekreftelse',
    id: 'aktuell_dose',
    kategori: 'avledet',
    fra: [
      med('preparat_lithionit', stopp(gjelderBare('Lithionit 42 mg depottabletter'), 'opptrapping')),
      med('dose_lithionit', stopp(gjelderBare('når døgndosen er fylt inn i mg litium (Li⁺)'), 'opptrapping')),
    ],
    forklaring: stopp(gjelderBare('Lithionit 42 mg depottabletter med dosen fylt inn i mg litium'), 'opptrapping'),
  },
]
