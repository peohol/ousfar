/**
 * Uavhengig kvalitetskontroll av verktøyene (spor H i
 * `docs/verktøy-klinisk-leveranseplan-2026-11.md`): vanlige, syntetiske
 * brukerforløp kjørt gjennom den samme veien som verktøysiden
 * (`kjorKasus`), og en egen vurdering av hva brukeren faktisk får.
 *
 * Kontrollen er bevisst skrevet uten domenetrådenes forventninger:
 * - Den finner ikke på doser. Katalogen sier bare hvilken situasjon som
 *   prøves (verktøy, virkestoffer, formulering og en vanlig aktuell dose);
 *   resultatet er det appen gir.
 * - Om en plan er **komplett** avgjøres av planens egne forløp, ikke av
 *   regelens tekst: en nedtrapping er komplett når legemidlet faktisk når
 *   seponering, et bytte når det gamle legemidlet er seponert og det nye
 *   fortsetter med en dose, et tillegg når begge legemidlene fortsetter.
 * - En plan som ikke er komplett, må si det selv (delplan), og en komplett
 *   plan må ikke kalle seg delplan (plan §3: «tre forskjellige utfall skal
 *   aldri blandes»).
 *
 * Ingen regel endres eller godkjennes her, og ingenting her er pasientdata.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { formvalgFor, spennFor, type Planskjema } from '../../verktoy/doseplan'
import type { Doseplanresultat } from '../../verktoy/motor/plan'
import { kombinasjoner } from '../../verktoy/regeldekning'
import { festkoblinger, VERKTOY, type Verktoy } from '../../verktoy/register'
import { FEST_PILOT, type Festuttrekk } from '../../verktoy/regler/aksepttest'
import { erKliniskGodkjent, fingeravtrykk, harBeregning } from '../../verktoy/regler/godkjenning'
import type { Forlop, Regel } from '../../verktoy/regler/modell'
import { avregistrert, besvartSkjema, kjorKasus, tidFor, type Pilotkasus, type Pilotutfall, type Uttrekkene as Kasusuttrekk } from '../../verktoy/regler/pilotmatrise'
import { fraForlop, REGELSETT, tilForlop, tilgjengelighet, type Verktoyvalg } from '../../verktoy/tilgjengelighet'

export const QA_RAPPORT = 'docs/verktøy-qa-brukerforlop.md'

/* --- Katalogen ------------------------------------------------------------------ */

/** Leveransen i planen forløpet hører til, og hva sluttmålet er. */
export const LEVERANSER = {
  K1: {
    verktoytype: 'seponering',
    navn: 'Trappe ned antidepressiv',
    sluttmal: 'seponering',
  },
  K2: {
    verktoytype: 'bytte',
    navn: 'Bytte antidepressiv',
    sluttmal: 'fullført bytte',
  },
  K3: {
    verktoytype: 'bytte',
    navn: 'Bytte antipsykotikum',
    sluttmal: 'fullført bytte',
  },
  K4: {
    verktoytype: 'tillegg',
    navn: 'Kombinere stemningsstabiliserende',
    sluttmal: 'stabilt tilleggsregime',
  },
} as const
export type Leveranse = keyof typeof LEVERANSER

/** Verktøyet hver leveranse prøves i. K4 finnes ikke ennå; det finnes på typen når det kommer. */
const VERKTOY_FOR: Record<Leveranse, (v: Verktoy) => boolean> = {
  K1: (v) => v.id === 'trappe-ned-antidepressiv',
  K2: (v) => v.id === 'bytte-antidepressiv',
  K3: (v) => v.id === 'bytte-antipsykotikum',
  K4: (v) => (v.type as string) === 'tillegg',
}

export interface Brukerforlop {
  id: string
  leveranse: Leveranse
  /** Situasjonen i vanlig språk. */
  hva: string
  valg: Verktoyvalg
  /** Aktuell døgndose (for K4: dosen av legemidlet pasienten allerede bruker), slik den skrives i feltet. */
  dose: string
  skjema?: Partial<Planskjema>
  /**
   * Dosen forløpet velger når siden lar forskriveren velge dose for et trinn
   * (`Fase.trinnvalg`): den første siden tilbyr (standard) eller den siste.
   */
  trinn?: 'forste' | 'siste'
  /** En endring i FEST (for eksempel en avregistrert styrke), gjort på en kopi av uttrekket. */
  fest?: Pilotkasus['fest']
  /** «regelens»: forskriveren velger måldosen regelen tilbyr, når den tilbyr nøyaktig én (som K4-reglene gjør). */
  maldose?: 'regelens'
  /**
   * Legemiddelformen forskriveren bytter til etter første beregning (FEST-kode),
   * for eksempel dråper etter at tablettvalget ikke ga plan. Forløpet regnes
   * da i to steg, slik siden gjør: først med formen siden foreslår, så med denne.
   */
  formbytte?: string
}

/** FEST-legemiddelformen dråper (mikstur, dråper), som escitalopram finnes som. */
const DRAPER = '748'
const form = (legemiddelform: string): Partial<Planskjema> => ({ formvalg: { fra: { legemiddelform } } })
const lang: Partial<Planskjema> = { svar: { lang_behandlingstid: true } }

/** Måldosen forskriveren velger i skjemaet (mg), når regelen tilbyr flere. */
const mal = (maldose: string): Pick<Brukerforlop, 'skjema'> => ({ skjema: { maldose } })
const p = (nokkel: string) => ({ nokkel, formulering: 'standard' as const })
const ned = (id: string, hva: string, nokkel: string, dose: string): Brukerforlop => ({
  id,
  leveranse: 'K1',
  hva,
  valg: { fra: p(nokkel) },
  dose,
})
const ad = (id: string, hva: string, fra: string, til: string, dose: string): Brukerforlop => ({
  id,
  leveranse: 'K2',
  hva,
  valg: { fra: p(fra), til: p(til) },
  dose,
})
const ap = (id: string, hva: string, fra: Verktoyvalg['fra'], til: NonNullable<Verktoyvalg['til']>, dose: string): Brukerforlop => ({ id, leveranse: 'K3', hva, valg: { fra, til }, dose })
const tillegg = (id: string, hva: string, fra: string, til: string, dose: string): Brukerforlop => ({
  id,
  leveranse: 'K4',
  hva,
  valg: { fra: p(fra), til: p(til) },
  dose,
  maldose: 'regelens',
})

/**
 * Vanlige situasjoner, syntetiske. K0-01–K0-12 er koordinatorens kasus i
 * leveranseplanen §10.2 (samme id-er, så resultatene kan føres direkte); H-
 * forløpene er QA-sporets egne tillegg. Utvalget sier hva som prøves, aldri
 * hva svaret skal være.
 */
export const BRUKERFORLOP: readonly Brukerforlop[] = [
  ned('K0-01', 'Escitalopram 10 mg tablett, kort behandlingstid, skal seponeres', 'escitalopram', '10'),
  ned('K0-02', 'Sertralin 100 mg tablett, kort behandlingstid, skal seponeres', 'sertralin', '100'),
  ned('K0-03', 'Amitriptylin 25 mg tablett, kort behandlingstid, skal seponeres', 'amitriptylin', '25'),
  { ...ad('K0-04', 'Sertralin 100 mg byttes til mirtazapin', 'sertralin', 'mirtazapin', '100'), ...mal('15') },
  { ...ad('K0-05', 'Escitalopram 20 mg byttes til mirtazapin', 'escitalopram', 'mirtazapin', '20'), ...mal('15') },
  { ...ad('K0-06', 'Escitalopram 20 mg byttes til sertralin', 'escitalopram', 'sertralin', '20'), ...mal('50') },
  { ...ap('K0-07', 'Olanzapin 10 mg tablett byttes til aripiprazol tablett', p('olanzapin'), p('aripiprazol'), '10'), ...mal('10') },
  { ...ap('K0-08', 'Risperidon 4 mg tablett byttes til aripiprazol tablett', p('risperidon'), p('aripiprazol'), '4'), ...mal('10') },
  ap('K0-09', 'Aripiprazol 15 mg tablett til Abilify Maintena', p('aripiprazol'), { nokkel: 'aripiprazol', formulering: 'LA' }, '15'),
  { ...ap('K0-10', 'Risperidon 4 mg tablett til paliperidonpalmitat månedlig', p('risperidon'), { nokkel: 'paliperidon', formulering: 'ER' }, '4'), maldose: 'regelens' },
  tillegg('K0-11', 'Står på litium (4 depottabletter à 42 mg); lamotrigin legges til', 'litium', 'lamotrigin', '168'),
  tillegg('K0-12', 'Står på valproat; lamotrigin legges til', 'valproat', 'lamotrigin', '1000'),

  ned('H-01', 'Vortioksetin 20 mg skal seponeres', 'vortioksetin', '20'),
  ned('H-02', 'Vortioksetin 10 mg skal seponeres', 'vortioksetin', '10'),
  ned('H-03', 'Escitalopram 20 mg skal seponeres', 'escitalopram', '20'),
  ned('H-04', 'Sertralin 50 mg skal seponeres', 'sertralin', '50'),
  ned('H-05', 'Citalopram 20 mg skal seponeres', 'citalopram', '20'),
  ned('H-06', 'Nortriptylin 50 mg skal seponeres', 'nortriptylin', '50'),
  ned('H-07', 'Mirtazapin 30 mg skal seponeres', 'mirtazapin', '30'),
  ned('H-08', 'Venlafaksin 75 mg skal seponeres', 'venlafaksin', '75'),
  ned('H-09', 'Paroksetin 20 mg skal seponeres', 'paroksetin', '20'),
  ned('H-10', 'Fluoksetin 20 mg skal seponeres', 'fluoksetin', '20'),
  ned('H-11', 'Duloksetin 60 mg skal seponeres', 'duloksetin', '60'),
  ned('H-12', 'Bupropion 300 mg skal seponeres', 'bupropion', '300'),
  ned('H-13', 'Agomelatin 25 mg skal seponeres', 'agomelatin', '25'),
  ad('H-14', 'Sertralin 50 mg byttes til mirtazapin', 'sertralin', 'mirtazapin', '50'),
  { ...ad('H-15', 'Citalopram 20 mg byttes til sertralin 100 mg', 'citalopram', 'sertralin', '20'), ...mal('100') },
  ad('H-16', 'Sertralin 100 mg byttes til escitalopram', 'sertralin', 'escitalopram', '100'),
  ad('H-17', 'Escitalopram 20 mg byttes til vortioksetin', 'escitalopram', 'vortioksetin', '20'),
  ad('H-18', 'Fluoksetin 20 mg byttes til sertralin', 'fluoksetin', 'sertralin', '20'),
  ad('H-19', 'Paroksetin 20 mg byttes til sertralin', 'paroksetin', 'sertralin', '20'),
  ad('H-20', 'Venlafaksin 150 mg byttes til duloksetin', 'venlafaksin', 'duloksetin', '150'),
  ad('H-21', 'Sertralin 100 mg byttes til bupropion', 'sertralin', 'bupropion', '100'),
  ap('H-22', 'Kvetiapin 400 mg byttes til aripiprazol (peroralt)', p('kvetiapin'), p('aripiprazol'), '400'),
  ap('H-23', 'Olanzapin 15 mg byttes til kvetiapin (peroralt)', p('olanzapin'), p('kvetiapin'), '15'),
  ap('H-24', 'Paliperidon 6 mg peroralt til Xeplion', p('paliperidon'), { nokkel: 'paliperidon', formulering: 'ER' }, '6'),
  ap('H-25', 'Olanzapin 10 mg peroralt til olanzapin depot', p('olanzapin'), { nokkel: 'olanzapin', formulering: 'LA' }, '10'),
  ap('H-26', 'Risperidon depot (37,5 mg) til Xeplion', { nokkel: 'risperidon', formulering: 'LA' }, { nokkel: 'paliperidon', formulering: 'ER' }, '37,5'),
  ap('H-27', 'Haloperidol 5 mg peroralt til haloperidol depot', p('haloperidol'), { nokkel: 'haloperidol', formulering: 'LA' }, '5'),
  tillegg('H-28', 'Står på lamotrigin; litium legges til', 'lamotrigin', 'litium', '200'),
  tillegg('H-29', 'Står på litium; valproat legges til', 'litium', 'valproat', '168'),
  { ...ned('H-30', 'Escitalopram dråper 10 mg skal seponeres', 'escitalopram', '10'), skjema: form(DRAPER) },
  { ...ned('H-31', 'Escitalopram dråper 20 mg skal seponeres', 'escitalopram', '20'), skjema: form(DRAPER) },
  { ...ned('H-32', 'Escitalopram dråper 20 mg, lang behandlingstid', 'escitalopram', '20'), skjema: { ...form(DRAPER), ...lang } },
  { ...ned('H-33', 'Nortriptylin 50 mg, lang behandlingstid', 'nortriptylin', '50'), skjema: lang },
  { ...ned('H-34', 'Nortriptylin 50 mg når 10 mg-tablettene er avregistrert', 'nortriptylin', '50'), fest: avregistrert('nortriptylin', 10) },
  ned('H-35', 'Sertralin 200 mg skal seponeres', 'sertralin', '200'),
  { ...ned('H-36', 'Vortioksetin 20 mg når 15 mg-tablettene er avregistrert', 'vortioksetin', '20'), fest: avregistrert('vortioksetin', 15) },
  { ...ad('H-37', 'Sertralin 100 mg byttes til mirtazapin når mirtazapin 15 mg er avregistrert', 'sertralin', 'mirtazapin', '100'), fest: avregistrert('mirtazapin', 15) },
  { ...tillegg('H-38', 'Står på valproat; lamotrigin legges til uten at måldosen er valgt', 'valproat', 'lamotrigin', '1000'), maldose: undefined },
  { ...ned('H-39', 'Escitalopram 10 mg tablett, kort behandlingstid; forskriveren bytter fra tablett til dråper i skjemaet', 'escitalopram', '10'), formbytte: DRAPER },
  { ...ap('H-40', 'Olanzapin 20 mg tablett byttes til aripiprazol 15 mg', p('olanzapin'), p('aripiprazol'), '20'), ...mal('15') },
  { ...ap('H-41', 'Risperidon 4 mg tablett byttes til aripiprazol 15 mg', p('risperidon'), p('aripiprazol'), '4'), ...mal('15') },
  { ...ap('H-42', 'Risperidon 3 mg tablett til Xeplion månedlig', p('risperidon'), { nokkel: 'paliperidon', formulering: 'ER' }, '3'), maldose: 'regelens' },
  { ...ap('H-43', 'Olanzapin 20 mg tablett byttes til aripiprazol med måldose 20 mg', p('olanzapin'), p('aripiprazol'), '20'), ...mal('20') },
  { ...ap('H-44', 'Risperidon 2 mg tablett til Xeplion månedlig', p('risperidon'), { nokkel: 'paliperidon', formulering: 'ER' }, '2'), maldose: 'regelens' },
  { ...ad('H-45', 'Escitalopram 10 mg byttes til sertralin 100 mg', 'escitalopram', 'sertralin', '10'), ...mal('100') },
  { ...ad('H-46', 'Citalopram 40 mg byttes til sertralin 50 mg', 'citalopram', 'sertralin', '40'), ...mal('50') },
  { ...ad('H-47', 'Escitalopram 20 mg byttes til sertralin med måldose 150 mg', 'escitalopram', 'sertralin', '20'), ...mal('150') },
  { ...ad('H-48', 'Escitalopram 15 mg byttes til sertralin 50 mg', 'escitalopram', 'sertralin', '15'), ...mal('50') },
]

/* --- Kjøringen ------------------------------------------------------------------- */

/** De lagrede FEST-uttrekkene, etter filnavn; domene-PR-ene legger sine egne ved siden av pilotsettet. */
export type Uttrekkene = Record<string, Festuttrekk>

const UTTREKKSMAPPE = dirname(FEST_PILOT)
const les = (fil: string) => JSON.parse(readFileSync(fil, 'utf8')) as Partial<Festuttrekk>

/** Hvert `fest-*.json` med et preparatutvalg, pilotsettet først (det vinner ved lik dekning). */
export const lesUttrekkene = (): Uttrekkene =>
  Object.fromEntries(
    readdirSync(UTTREKKSMAPPE)
      .filter((f) => /^fest-.+\.json$/.test(f))
      .map((f) => `${UTTREKKSMAPPE}/${f}`)
      .sort((a, b) => Number(b === FEST_PILOT) - Number(a === FEST_PILOT) || a.localeCompare(b))
      .map((fil) => [fil.slice(UTTREKKSMAPPE.length + 1), les(fil)] as const)
      .filter((x): x is readonly [string, Festuttrekk] => Array.isArray(x[1].utvalg?.virkestoff)),
  )

const virkestoffene = (valg: Verktoyvalg) => [valg.fra.nokkel, ...(valg.til ? [valg.til.nokkel] : [])]

/** Uttrekket som har flest av valgets virkestoffer (helst alle), så forløpet prøves mot preparater som finnes. */
export function uttrekkFor(valg: Verktoyvalg, u: Uttrekkene): string {
  const ider = Object.values(festkoblinger(virkestoffene(valg))).flat()
  const dekning = (n: string) => ider.filter((id) => u[n]!.utvalg.virkestoff.some((v) => v.id === id)).length
  return Object.keys(u).reduce((a, b) => (dekning(b) > dekning(a) ? b : a))
}

/** Det valgte uttrekket i formen kontrollmatrisen tar imot. */
const kasusuttrekk = (u: Uttrekkene, navn: string): Kasusuttrekk => ({ pilot: u[navn]!, aksept: u[navn]! })

/** Dosen slik den står i et skjemafelt («37,5»), som tall. */
const somTall = (x: string) => Number(x.replace(',', '.'))
export const planinndata = (dose: string, maldose?: string): Planinndata => ({ startdose_mg: somTall(dose), ...(maldose ? { maldose_mg: somTall(maldose) } : {}) })

/** Flere trinnvalg enn dette i ett forløp regnes som en løkke. */
const MAKS_TRINNVALG = 60

/** Tabletter (FEST-kode 53) når de finnes; ellers det første alternativet. Vises i rapporten. */
const FORETRUKKET_FORM = '53'

export type Utfallsklasse = 'komplett' | 'delplan' | 'fagtekst' | 'stoppet' | 'ikke_godkjent' | 'til_kontroll' | 'ikke_stottet' | 'sperret' | 'skjema' | 'verktoy_mangler'

export const KLASSENAVN: Record<Utfallsklasse, string> = {
  komplett: 'Komplett plan til sluttmål',
  delplan: 'Delplan',
  fagtekst: 'Godkjent fagtekst',
  stoppet: 'Regel finnes, men beregningen stopper',
  ikke_godkjent: 'Ikke godkjent regel',
  til_kontroll: 'Regel til kontroll',
  ikke_stottet: 'Ikke støttet',
  sperret: 'Sperret',
  skjema: 'Skjemaet krever mer',
  verktoy_mangler: 'Verktøyet finnes ikke',
}

export interface Forlopsresultat {
  forlop: Brukerforlop
  klasse: Utfallsklasse
  verktoy?: Verktoy
  /** Filnavnet til FEST-uttrekket forløpet ble prøvd mot. */
  uttrekk?: string
  utfall?: Pilotutfall & { resultat?: Doseplanresultat; tekst?: string }
  /** Formvalg gjort automatisk, i klartekst. */
  formvalg: string[]
  /** Doser valgt automatisk der siden lot forskriveren velge, i klartekst. */
  trinnvalg: string[]
  regel?: Regel
  /** Hva brukeren ser som grunn eller plan, kort. */
  vist: string[]
  /** Brudd på QA-invariantene; tom når alt er i orden. */
  feil: string[]
  /** Skjemaet slik forløpet til slutt fylte det ut (måldose, svar, formvalg og valgte doser). */
  skjema?: Partial<Planskjema>
  /** Ved formbytte: utfallet før byttet. */
  forBytte?: Utfallsklasse
}

/**
 * Peders beslutning (formidlet i ChatGPT-kontrollen av #321, 2026-11-03):
 * klinikerflaten skal aldri tilby en delplan som klinisk doseplan, heller
 * ikke for tidligere godkjente regelversjoner. En plan som vises uten å nå
 * sluttmålet, er derfor et QA-avvik, ikke bare en merknad.
 */
export const DELPLAN_VIST = 'Delplan vises som klinisk doseplan'

const regelFor = (u: Pilotutfall & { resultat?: Doseplanresultat }) => u.resultat && REGELSETT.regler.find((r) => r.id === u.resultat!.regel.id && r.versjon === u.resultat!.regel.versjon)

const endretKopi = (r: Regel, endring: NonNullable<Pilotkasus['regel']>) => {
  const kopi = structuredClone(r)
  endring.endre?.endre(kopi)
  return kopi
}

/** Skjemaet med måldosen regelen tilbyr, når forløpet velger den og verktøyet har nøyaktig én regel med én måldose. */
function medRegelensMaldose(verktoy: Verktoy, f: Brukerforlop): Partial<Planskjema> | undefined {
  if (f.maldose !== 'regelens') return f.skjema
  const regler = tilgjengelighet(verktoy, f.valg).regler
  const verdier = regler.length === 1 ? regler[0]!.inndata.find((k) => k.navn === 'maldose')?.verdier : undefined
  return verdier?.length === 1 ? { ...f.skjema, maldose: tall(verdier[0]!) } : f.skjema
}

/** Kjører forløpet som verktøysiden ville gjort, med automatiske formvalg der siden ber om det. */
export function kjorForlop(f: Brukerforlop, u: Uttrekkene, ekstra: Partial<Pilotkasus> = {}): Forlopsresultat {
  if (f.formbytte) {
    const { formbytte, ...uten } = f
    const forst = kjorEtt(uten, u, ekstra)
    const etter = kjorEtt({ ...uten, skjema: { ...uten.skjema, formvalg: { fra: { legemiddelform: formbytte } } } }, u, ekstra)
    return {
      ...etter,
      forlop: f,
      forBytte: forst.klasse,
      formvalg: [`først ${forst.formvalg.join(', ') || 'formen siden foreslår'}: ${KLASSENAVN[forst.klasse]}`, `byttet til legemiddelform ${formbytte}`, ...etter.formvalg],
      feil: [...forst.feil.filter((x) => x === DELPLAN_VIST), ...etter.feil],
    }
  }
  return kjorEtt(f, u, ekstra)
}

function kjorEtt(f: Brukerforlop, u: Uttrekkene, ekstra: Partial<Pilotkasus>): Forlopsresultat {
  const verktoy = VERKTOY.find(VERKTOY_FOR[f.leveranse])
  if (!verktoy)
    return {
      forlop: f,
      klasse: 'verktoy_mangler',
      formvalg: [],
      trinnvalg: [],
      vist: [`Ingen verktøy av typen «${LEVERANSER[f.leveranse].verktoytype}» i registeret.`],
      feil: [],
    }
  const uttrekk = uttrekkFor(f.valg, u)
  const kasus: Pilotkasus = {
    id: f.id,
    kategori: 'vanlig_dose',
    hva: f.hva,
    verktoy: verktoy.id,
    valg: f.valg,
    uttrekk: 'pilot',
    dose: f.dose,
    skjema: medRegelensMaldose(verktoy, f),
    ...(f.fest ? { fest: f.fest } : {}),
    forventet: { utfall: 'sperret' },
    ...ekstra,
  }
  const kasusU = kasusuttrekk(u, uttrekk)
  let skjema: Partial<Planskjema> = kasus.skjema ?? {}
  let utfall = kjorKasus(kasus, kasusU)
  const formvalg: string[] = []
  if (utfall.utfall === 'formvalg') {
    // En regel som kjøres som endret kopi (kasus.regel), velges slik kjorKasus gjør; ellers den siden tilbyr.
    const t = tilgjengelighet(verktoy, f.valg)
    const endret = kasus.regel && REGELSETT.regler.find((r) => r.id === kasus.regel!.id)
    const regel = endret ? endretKopi(endret, kasus.regel!) : t.regler.length === 1 ? t.regler[0]! : t.regler.find((r) => r.id === kasus.skjema?.regel)
    if (regel) {
      const naa = tidFor(kasus, kasusU)
      const besvart = besvartSkjema(regel, f.dose, kasus.skjema)
      const alternativer = formvalgFor(regel, f.valg, besvart, structuredClone(u[uttrekk]!.utvalg), naa)
      const valgt: Planskjema['formvalg'] = { ...besvart.formvalg }
      for (const forlop of utfall.forlop) {
        const a = alternativer[forlop]!
        const form = a.legemiddelformer.find((x) => x.kode === FORETRUKKET_FORM) ?? a.legemiddelformer[0]
        const klasse = a.klasser[0]
        valgt[forlop] = {
          ...(a.klasser.length > 1 && klasse ? { klasse: klasse.kode } : {}),
          ...(form ? { legemiddelform: form.kode } : {}),
        }
        formvalg.push(`${forlop}: ${[a.klasser.length > 1 ? klasse?.navn : null, form?.navn].filter(Boolean).join(', ')}`)
      }
      skjema = { ...skjema, formvalg: valgt }
      utfall = kjorKasus({ ...kasus, skjema }, kasusU)
    }
  }
  // Der siden lar forskriveren velge dosen for et trinn, velger forløpet én av dosene som tilbys, trinn for trinn.
  const trinnvalg: string[] = []
  for (let t = utfall.resultat?.trinnvalg?.[0]; t && t.doser.length > 0 && trinnvalg.length < MAKS_TRINNVALG; t = utfall.resultat?.trinnvalg?.[0]) {
    const mg = (f.trinn === 'siste' ? t.doser.at(-1) : t.doser[0])!.mg
    skjema = { ...skjema, trinnvalg: [...(skjema.trinnvalg ?? []), { forlop: t.forlop, trinn: t.trinn, fra_mg: t.fra_mg, mg }] }
    trinnvalg.push(`${t.virkestoff} trinn ${t.trinn}: ${tall(mg)} mg`)
    utfall = kjorKasus({ ...kasus, skjema }, kasusU)
  }
  // En regel som er endret på en kopi (simulert godkjenning i et kontrollgrunnlag), vurderes som kopien.
  const regel = ekstra.regel && regelFor(utfall) ? endretKopi(regelFor(utfall)!, ekstra.regel) : regelFor(utfall)
  const grunner = 'grunner' in utfall ? utfall.grunner : []
  const base = { forlop: f, verktoy, uttrekk, utfall, formvalg, trinnvalg, regel, skjema }
  switch (utfall.utfall) {
    case 'plan': {
      const klasse = komplett(regel!, utfall.resultat!, planinndata(f.dose, skjema.maldose)) ? 'komplett' : 'delplan'
      return {
        ...base,
        klasse,
        vist: [...(utfall.undertittel ? [utfall.undertittel] : []), ...utfall.linjer],
        feil: [...(klasse === 'delplan' ? [DELPLAN_VIST] : []), ...planfeil(regel, utfall, klasse)],
      }
    }
    case 'fagtekst':
      return { ...base, klasse: 'fagtekst', vist: utfall.regler, feil: [] }
    case 'ingen':
      return {
        ...base,
        klasse: utfall.status,
        vist: grunner,
        feil: grunner.length === 0 ? ['Ingen grunn vises når verktøyet ikke gir noen plan.'] : [],
      }
    case 'stopp':
      return {
        ...base,
        klasse: 'stoppet',
        vist: grunner,
        feil: grunner.length === 0 ? ['Beregningen stopper uten grunn.'] : [],
      }
    case 'mangler':
      return { ...base, klasse: 'skjema', vist: grunner, feil: [] }
    case 'formvalg':
      return {
        ...base,
        klasse: 'skjema',
        vist: [`Formvalg trengs for ${utfall.forlop.join(', ')}`],
        feil: [],
      }
    case 'sperret':
      return { ...base, klasse: 'sperret', vist: [], feil: [] }
  }
}

/** Tidslinjen slik appen viser den: kolonneoverskriftene og cellene i hver rad. */
export interface Tidslinje {
  koloner: string[]
  rader: string[][]
}

/**
 * Teksten redusert til bokstaver og tall, så celletekst og kopiert tekst kan
 * sammenlignes uten å bry seg om linjeskift og tegnsetting. Tallenes betydning
 * beholdes: et desimaltegn mellom sifre blir stående («2,5» og «25» er ulike),
 * og sifre som bare skilles av mellomrom eller tegn, holdes atskilt.
 */
export const kjerne = (x: string) =>
  x
    .replace(/(\p{N})[,.](?=\p{N})/gu, '$1‡')
    .replace(/(\p{N})[^\p{L}\p{N}‡]+(?=\p{N})/gu, '$1|')
    .replace(/[^\p{L}\p{N}‡|]/gu, '')
    .toLowerCase()

interface Tidslinjecelle {
  naar: string
  /** Kolonnene (legemiddel og administrasjon) cellen kan høre til. */
  kolonner: string[]
  tekst: string
}

/** Cellene i tabellen, med sin kolonne; tomme celler og «–» (ikke i bruk) er ikke med. */
const tabellceller = (t: Tidslinje): Tidslinjecelle[] =>
  t.rader.flatMap(([naar, ...celler]) => celler.flatMap((c, i) => (c && c !== '–' ? [{ naar: naar!, kolonner: [t.koloner[i + 1]!], tekst: c.replace(/^(Vurdering|Injeksjon)\s+/, '') }] : [])))

/**
 * Tidslinjelinjene i kopien, delt i ett ledd per legemiddel: «Dag 1–14: Litium
 * peroralt: …; Lamotrigin peroralt: …» gir to ledd, ett per kolonne. En
 * vurdering («Dag 15: Vurdering (Lamotrigin): …») hører til legemidlets
 * kolonner. Linjer som ikke begynner med en kolonne eller en vurdering, er ikke
 * en del av tidslinjen.
 */
function kopiledd(t: Tidslinje, kopi: string): Tidslinjecelle[] {
  const koloner = t.koloner.slice(1)
  return kopi.split('\n').flatMap((linje) => {
    const m = /^(.+?): (.+)$/.exec(linje)
    if (!m) return []
    const [, naar, rest] = m as unknown as [string, string, string]
    const vurdering = /^Vurdering \(([^)]+)\): (.+)$/.exec(rest)
    if (vurdering) {
      const kolonner = koloner.filter((k) => k.startsWith(vurdering[1]!))
      return kolonner.length ? [{ naar, kolonner, tekst: vurdering[2]! }] : []
    }
    const starter = koloner
      .flatMap((k) => [...rest.matchAll(new RegExp(`(?:^|; )(${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})(?::? )`, 'g'))].map((x) => ({ k, fra: x.index! + x[0].length, ved: x.index! })))
      .sort((a, b) => a.ved - b.ved)
    if (starter[0]?.ved !== 0) return []
    return starter.map((x, i) => ({ naar, kolonner: [x.k], tekst: rest.slice(x.fra, starter[i + 1]?.ved ?? rest.length) }))
  })
}

/**
 * Den synlige tidslinjen mot den kopierte teksten, celle for celle: hver
 * celle i tabellen skal stå i kopien på samme tidspunkt, under samme
 * legemiddel og med samme tall og ord, og hvert ledd i kopiens tidslinje skal
 * ha en slik celle. En dose under feil legemiddel, et flyttet desimaltegn
 * eller en rad som bare finnes på den ene siden, er avvik.
 */
export function tidslinjeavvik(t: Tidslinje, kopi: string): string[] {
  const igjen = kopiledd(t, kopi)
  const avvik: string[] = []
  for (const c of tabellceller(t)) {
    const i = igjen.findIndex((x) => x.naar === c.naar && x.kolonner.includes(c.kolonner[0]!) && kjerne(x.tekst) === kjerne(c.tekst))
    if (i >= 0) igjen.splice(i, 1)
    else avvik.push(`cellen «${c.tekst.slice(0, 50)}» (${c.naar}, ${c.kolonner[0]}) står ikke slik i kopien`)
  }
  for (const x of igjen) avvik.push(`kopiens «${x.naar}: ${x.tekst.slice(0, 50)}» (${x.kolonner.join(' / ')}) har ingen slik celle i tabellen`)
  return avvik
}

/* --- Den uavhengige vurderingen ---------------------------------------------------- */

const fortsetterMedDose = (f: Doseplanresultat & { status: 'doseplan' }, id: string | undefined) => {
  const x = f.forlop.find((y) => y.id === id)
  if (!x || x.siste_dosedag !== null) return false
  const siste = x.perioder.at(-1)
  return (siste !== undefined && siste.til === null && siste.mg > 0) || x.injeksjoner.some((i) => i.vedlikehold && i.mg > 0)
}
/**
 * Det eksisterende legemidlet i et tillegg holdes på nøyaktig forskriverens
 * aktuelle dose gjennom hele forløpet, fra planens første dag:
 * - som uendret dose (`uendret_mg`, motoren viser den fra forløpets start),
 *   der forløpet starter på planens første dag; eventuelle perioder i tillegg
 *   er overflødige, men må ha samme dose, henge sammen og ikke slutte;
 * - ellers som perioder alene, der den første begynner på planens første dag
 *   og resten henger sammen, har den dosen og ikke slutter.
 * En plan som ikke sier noe om dosen, som endrer den i ett trinn eller til
 * slutt, eller som først fører legemidlet opp etter planens første dag, holder
 * den ikke uendret.
 */
const fortsetterUendret = (f: Doseplanresultat & { status: 'doseplan' }, id: string | undefined, startdose_mg: number) => {
  const x = f.forlop.find((y) => y.id === id)
  if (!x || x.siste_dosedag !== null || x.injeksjoner.length > 0) return false
  const planstart = Math.min(...f.forlop.map((y) => y.start))
  const sammenhengende = x.perioder.every((p, i) => i === 0 || (x.perioder[i - 1]!.til !== null && p.fra === x.perioder[i - 1]!.til! + 1))
  const perioderUendret = sammenhengende && x.perioder.every((p) => nesten(p.mg, startdose_mg)) && (x.perioder.at(-1)?.til ?? null) === null
  if (x.uendret_mg !== undefined) return nesten(x.uendret_mg, startdose_mg) && x.start === planstart && perioderUendret
  return x.perioder.length > 0 && x.perioder[0]!.fra === planstart && perioderUendret
}
const seponeres = (f: Doseplanresultat & { status: 'doseplan' }, id: string | undefined) => {
  const x = f.forlop.find((y) => y.id === id)
  return x !== undefined && x.siste_dosedag !== null && !x.avslutning
}

/** Det planen er beregnet fra: aktuell dose og eventuell måldose forskriveren har valgt. */
export interface Planinndata {
  startdose_mg: number
  maldose_mg?: number
}

/**
 * Den kliniske måldosen regelen sier det nye legemidlet skal ende på: dosen i
 * forløpets avsluttende vedlikehold (peroralt eller som depot), slått opp fra
 * det forskriveren har oppgitt. `null` når forløpet ikke ender i et
 * vedlikehold (for eksempel en opptrapping eller en introduksjonsdose), eller
 * når måldosen ikke kan bestemmes; da er sluttmålet ikke nådd.
 */
export function maldoseFor(forlop: Forlop | undefined, inn: Planinndata): number | null {
  const sist = forlop?.faser.at(-1)
  const dose = sist?.type === 'vedlikehold' ? sist.dose : sist?.type === 'injeksjoner' ? sist.vedlikehold.dose : null
  if (!dose) return null
  switch (dose.type) {
    case 'fast':
      return dose.mg.verdi
    case 'aktuell':
      return inn.startdose_mg
    case 'inndata':
      return dose.navn === 'maldose' ? (inn.maldose_mg ?? null) : inn.startdose_mg
    case 'tabell': {
      const rad = dose.rader.find((x) => nesten(x.fra_mg, inn.startdose_mg))
      if (!rad) return null
      if (typeof rad.til_mg === 'number') return rad.til_mg
      const m = inn.maldose_mg
      return m !== undefined && m >= rad.til_mg[0] && m <= rad.til_mg[1] ? m : null
    }
  }
}

/** Dosen forløpet fortsetter på når planen slutter: siste periode uten slutt, eller depotvedlikeholdet. */
const sluttdose = (f: Doseplanresultat & { status: 'doseplan' }, id: string | undefined): number | null => {
  const x = f.forlop.find((y) => y.id === id)
  const siste = x?.perioder.at(-1)
  if (siste && siste.til === null) return siste.mg
  return x?.injeksjoner.filter((i) => i.vedlikehold).at(-1)?.mg ?? null
}

/** Det nye legemidlet fortsetter på nøyaktig den kliniske måldosen regelen og forskriveren har satt. */
const naarMaldosen = (regel: Regel, r: Doseplanresultat & { status: 'doseplan' }, inn: Planinndata) => {
  const til = tilForlop(regel)
  const mal = maldoseFor(til, inn)
  const slutt = sluttdose(r, til?.id)
  return fortsetterMedDose(r, til?.id) && mal !== null && slutt !== null && nesten(slutt, mal)
}

/**
 * Om planen når sluttmålet, avgjort av planens forløp og regelens sluttmål:
 * nedtrapping → seponert; bytte → det gamle seponert og det nye fortsetter
 * på den valgte kliniske måldosen; tillegg → det eksisterende fortsetter
 * på nøyaktig forskriverens aktuelle dose og det nye fortsetter på måldosen. Et nytt legemiddel som blir
 * stående på en introduksjonsdose, når ikke sluttmålet.
 */
export function komplett(regel: Regel, r: Doseplanresultat, inn: Planinndata): boolean {
  if (r.status !== 'doseplan') return false
  const fra = fraForlop(regel)?.id
  if (!regel.til) return r.forlop.every((x) => seponeres(r, x.id))
  if (regel.plan.form === ('tillegg' as string)) return fortsetterUendret(r, fra, inn.startdose_mg) && naarMaldosen(regel, r, inn)
  return seponeres(r, fra) && naarMaldosen(regel, r, inn)
}

/** Tekst som sier at planen ikke er fullstendig. */
export const DELPLANMERKE = /delplan|ikke (en )?(validert )?(fullstendig|komplett)/i

const nesten = (a: number, b: number) => Math.abs(a - b) < 1e-6

/**
 * QA-invariantene for en plan brukeren får se:
 * 1. Regelen er klinisk godkjent for nøyaktig versjonen og innholdet planen bygger på.
 * 2. Delplan og komplett plan blandes aldri: en delplan sier det, en komplett plan gjør ikke.
 * 3. Hver dose kan gis: enhetene summerer til døgndosen, delinger er dokumentert i FEST, og ingen preparater har begrensninger.
 * 4. Perioder og dager går framover, og dosene er positive tall.
 * 5. Kopien har det samme som skjermen: undertittelen, hver rad og regelversjonen.
 */
export function planfeil(regel: Regel | undefined, u: Pilotutfall & { resultat?: Doseplanresultat; tekst?: string }, klasse: 'komplett' | 'delplan'): string[] {
  const feil: string[] = []
  const r = u.resultat
  if (!r || r.status !== 'doseplan' || u.utfall !== 'plan') return ['Planen mangler beregningsresultat.']
  if (!regel) return [`Regelen ${r.regel.id} v${r.regel.versjon} finnes ikke i registeret.`]
  if (!r.klinisk) feil.push('Planen vises uten å være klinisk.')
  if (!erKliniskGodkjent(regel) || !harBeregning(regel)) feil.push(`Regelen ${regel.id} v${regel.versjon} er ikke klinisk godkjent som beregning.`)
  if (r.regel.fingeravtrykk !== fingeravtrykk(regel)) feil.push('Planens fingeravtrykk er ikke regelens.')

  const merket = u.undertittel !== null && DELPLANMERKE.test(u.undertittel)
  if (klasse === 'delplan' && !merket) feil.push(`Planen når ikke sluttmålet, men sier ikke at den er en delplan (undertittel ${JSON.stringify(u.undertittel)}).`)
  if (klasse === 'komplett' && merket) feil.push(`Planen når sluttmålet, men kaller seg delplan (${JSON.stringify(u.undertittel)}).`)

  for (const f of r.forlop) {
    let forrige = -Infinity
    for (const per of f.perioder) {
      if (!Number.isFinite(per.mg) || per.mg < 0) feil.push(`${f.virkestoff}: ugyldig dose ${per.mg}.`)
      if (per.fra < forrige || (per.til !== null && per.til < per.fra)) feil.push(`${f.virkestoff}: periodene går ikke framover (dag ${per.fra}–${per.til}).`)
      forrige = per.fra
      if (per.mg > 0 && per.elementer.length === 0) feil.push(`${f.virkestoff} dag ${per.fra}: ${per.mg} mg uten enheter som kan gis.`)
      if (per.mg > 0 && per.elementer.length > 0) {
        const sum = per.elementer.reduce((s, e) => s + e.mg * e.antall, 0)
        if (
          !nesten(sum, per.mg) &&
          !(
            per.doser &&
            nesten(
              per.doser.reduce((a, b) => a + b, 0),
              per.mg,
            )
          )
        )
          feil.push(`${f.virkestoff} dag ${per.fra}: enhetene gir ${sum} mg, ikke ${per.mg} mg.`)
      }
      for (const e of per.elementer) {
        for (const b of e.preparater) {
          if (!Number.isInteger(e.antall * b.deling) || e.antall <= 0) feil.push(`${b.navn_form_styrke}: ${e.antall} enheter kan ikke gis (deling ${b.deling}).`)
          if (b.begrensninger.length > 0) feil.push(`${b.navn_form_styrke} brukes trass i begrensninger: ${b.begrensninger.join('; ')}`)
        }
      }
    }
    for (const i of f.injeksjoner) if (!(i.mg > 0) || i.element.preparater.length === 0) feil.push(`${f.virkestoff}: injeksjon uten dose eller preparat.`)
  }

  const tekst = u.tekst ?? ''
  if (u.undertittel && !tekst.includes(u.undertittel)) feil.push('Kopien mangler undertittelen.')
  for (const l of u.linjer) if (!tekst.includes(l)) feil.push(`Kopien mangler raden «${l}».`)
  if (!tekst.includes(`Regel ${regel.id}, versjon ${regel.versjon}`)) feil.push('Kopien mangler regelversjonen.')
  return feil
}

/* --- Omfangssveipet ---------------------------------------------------------------- */

/** Dosene sveipet prøver: 0,5–40 mg i halve mg og 5–400 mg i trinn på 5. */
export const SVEIPDOSER: readonly number[] = [...new Set([...Array.from({ length: 80 }, (_, i) => (i + 1) / 2), ...Array.from({ length: 80 }, (_, i) => (i + 1) * 5)])].sort((a, b) => a - b)

const tall = (x: number) => String(x).replace('.', ',')

/** Hver kombinasjon av legemiddelformer siden kan be om for valget, ved dosen. */
function formkombinasjoner(regel: Regel, valg: Verktoyvalg, dose: string, u: Uttrekkene): Planskjema['formvalg'][] {
  const uttrekk = uttrekkFor(valg, u)
  const naa = tidFor({ uttrekk: 'pilot' }, kasusuttrekk(u, uttrekk))
  const alternativer = formvalgFor(regel, valg, besvartSkjema(regel, dose), structuredClone(u[uttrekk]!.utvalg), naa)
  let kombinasjoner: Planskjema['formvalg'][] = [{}]
  for (const [forlop, a] of Object.entries(alternativer)) {
    if (a.legemiddelformer.length <= 1 && a.klasser.length <= 1) continue
    const former = a.legemiddelformer.length > 0 ? a.legemiddelformer : [undefined]
    const klasser = a.klasser.length > 1 ? a.klasser : [undefined]
    kombinasjoner = kombinasjoner.flatMap((k) =>
      klasser.flatMap((kl) =>
        former.map((fo) => ({
          ...k,
          [forlop]: {
            ...(kl ? { klasse: kl.kode } : {}),
            ...(fo ? { legemiddelform: fo.kode } : {}),
          },
        })),
      ),
    )
  }
  return kombinasjoner
}

export interface Sveiptreff {
  dose: number
  maldose?: number
  formvalg: Planskjema['formvalg']
  resultat: Forlopsresultat
}

export interface Sveip {
  verktoy: Verktoy
  valg: Verktoyvalg
  regel: Regel
  /** Hver dose, måldose og legemiddelform som gir en plan. */
  treff: Sveiptreff[]
  /** Unntak, spørsmål og bekreftelser: utfallet ved første treff når ett av dem endres. */
  endringer: { hva: string; klasse: Utfallsklasse }[]
}

/**
 * Prøver hvert valg som gir en beregning i dag, ved hver dose i
 * {@link SVEIPDOSER}, hver legemiddelform og, der regelen spør etter
 * måldose, hver hele måldose rundt tabellens spenn.
 */
export function omfangssveip(u: Uttrekkene): Sveip[] {
  return VERKTOY.flatMap((verktoy) =>
    kombinasjoner(verktoy).flatMap((valg) => {
      const t = tilgjengelighet(verktoy, valg)
      return t.status === 'tilgjengelig' ? t.regler.map((regel) => sveipRegel(verktoy, valg, regel, u)) : []
    }),
  )
}

/** Måldosene å prøve ved dosen: rundt tabellens spenn, rundt regelens område i trinn på 5 mg, eller regelens verdier. */
function maldoser(regel: Regel, dose: number): (number | undefined)[] {
  const spenn = spennFor(regel, { startdose: tall(dose) })
  if (spenn) return Array.from({ length: spenn.til_mg[1] - spenn.til_mg[0] + 3 }, (_, i) => spenn.til_mg[0] - 1 + i)
  const m = regel.inndata.find((k) => k.navn === 'maldose')
  if (m?.omrade) return Array.from({ length: (m.omrade[1] - m.omrade[0]) / 5 + 3 }, (_, i) => m.omrade![0] - 5 + i * 5).filter((x) => x > 0)
  if (m?.verdier) return [...m.verdier, ...m.verdier.map((x) => x + 1)]
  return [undefined]
}

/**
 * Sveipet for én regel: hver dose, legemiddelform og måldose. `regelendring`
 * brukes når en domene-PR kontrolleres før regelen er godkjent: regelen
 * godkjennes da (simulert) på en kopi, slik kontrollgrunnlagene gjør.
 */
export function sveipRegel(verktoy: Verktoy, valg: Verktoyvalg, regel: Regel, u: Uttrekkene, regelendring?: Pilotkasus['regel']): Sveip {
  const leveranse = (Object.keys(VERKTOY_FOR) as Leveranse[]).find((l) => VERKTOY_FOR[l](verktoy))!
  const ekstra = regelendring ? { regel: regelendring } : {}
  const forlop = (dose: number, skjema: Partial<Planskjema>): Brukerforlop => ({ id: 'sveip', leveranse, hva: '', valg, dose: tall(dose), skjema: { regel: regel.id, ...skjema } })
  const treff: Sveiptreff[] = []
  for (const dose of SVEIPDOSER) {
    for (const formvalg of formkombinasjoner(regel, valg, tall(dose), u)) {
      for (const maldose of maldoser(regel, dose)) {
        const f = forlop(dose, { formvalg, ...(maldose !== undefined ? { maldose: tall(maldose) } : {}) })
        const forsteDose = kjorForlop(f, u, ekstra)
        // Der siden tilbyr doser å velge mellom, prøves både den første og den siste hele veien.
        for (const r of forsteDose.trinnvalg.length > 0 ? [forsteDose, kjorForlop({ ...f, trinn: 'siste' }, u, ekstra)] : [forsteDose])
          if (r.klasse === 'komplett' || r.klasse === 'delplan') treff.push({ dose, ...(maldose !== undefined ? { maldose } : {}), formvalg, resultat: r })
      }
    }
  }
  const endringer: Sveip['endringer'] = []
  const forste = treff[0]
  if (forste) {
    const skjema = { formvalg: forste.formvalg, ...(forste.maldose !== undefined ? { maldose: tall(forste.maldose) } : {}) }
    const prov = (hva: string, x: Partial<Planskjema>) => endringer.push({ hva, klasse: kjorForlop(forlop(forste.dose, { ...skjema, ...x }), u, ekstra).klasse })
    for (const x of regel.unntak) prov(`unntak ${x.id} = ja`, { pasientforhold: { [x.id]: true } })
    for (const x of regel.sporsmal ?? []) prov(`spørsmål ${x.id} = ja`, { svar: { [x.id]: true } })
    // En bekreftelse som bare kreves ved et bestemt svar (`ved`), prøves med det svaret og en skriftlig begrunnelse, så bare bekreftelsen mangler.
    for (const x of regel.bekreftelser)
      prov(`bekreftelse ${x.id} mangler${x.ved ? ` (ved ${x.ved.sporsmal} = ${x.ved.svar ? 'ja' : 'nei'})` : ''}`, {
        bekreftet: regel.bekreftelser.map((b) => b.id).filter((b) => b !== x.id),
        ...(x.ved ? { svar: { [x.ved.sporsmal]: x.ved.svar }, begrunnelse: 'Syntetisk QA-begrunnelse.' } : {}),
      })
    // Og kontrollprøven: med svaret, begrunnelsen og alle bekreftelser gis planen igjen, så stoppet over skyldes bekreftelsen.
    for (const ved of [...new Map(regel.bekreftelser.flatMap((b) => (b.ved ? [[b.ved.sporsmal, b.ved] as const] : []))).values()])
      prov(`spørsmål ${ved.sporsmal} = ${ved.svar ? 'ja' : 'nei'} med begrunnelse og alle bekreftelser`, { svar: { [ved.sporsmal]: ved.svar }, begrunnelse: 'Syntetisk QA-begrunnelse.' })
  }
  return { verktoy, valg, regel, treff, endringer }
}

const intervaller = (doser: readonly number[]) =>
  [...new Set(doser)]
    .sort((a, b) => a - b)
    .map(tall)
    .join(', ') || 'ingen'

/** Sveipet i rapporten: hvilke doser som gir plan, og hva hver endring gir. */
export function sveiplinjer(sveip: readonly Sveip[]): string[] {
  return [
    '## Omfangssveip for regler som gir beregning',
    '',
    `Startdosene ${tall(SVEIPDOSER[0]!)}–${tall(SVEIPDOSER.at(-1)!)} mg (halve mg opp til 40 mg, så trinn på 5 mg), hver legemiddelform siden kan be om og hver hele måldose rundt tabellens spenn, med alle bekreftelser og nei på hvert unntak og spørsmål. Deretter, ved første dose med plan: ja på ett unntak eller spørsmål om gangen, og én bekreftelse om gangen tatt bort (en bekreftelse som bare gjelder ved et bestemt svar, med det svaret og en begrunnelse). Til slutt kontrollprøven: det svaret med begrunnelse og alle bekreftelser.`,
    '',
    ...sveip.flatMap((s) => [
      `### ${s.verktoy.navn}: ${s.regel.id} v${s.regel.versjon}`,
      '',
      `- Startdoser med plan: ${intervaller(s.treff.map((t) => t.dose))}`,
      ...(s.treff.some((t) => t.maldose !== undefined)
        ? [`- Måldoser med plan: ${[...new Set(s.treff.map((t) => `${tall(t.dose)} → ${t.maldose !== undefined ? tall(t.maldose) : '–'}`))].join('; ')}`]
        : []),
      `- Klasse: ${[...new Set(s.treff.map((t) => KLASSENAVN[t.resultat.klasse]))].join(', ') || '–'}`,
      `- QA-avvik i planene: ${s.treff.flatMap((t) => t.resultat.feil).length}`,
      `- ${DELPLAN_VIST}: ${s.treff.filter((t) => t.resultat.feil.includes(DELPLAN_VIST)).length} av ${s.treff.length} planer`,
      ...s.endringer.map((e) => `- ${e.hva}: ${KLASSENAVN[e.klasse]}`),
      '',
    ]),
  ]
}

/* --- Rapporten ----------------------------------------------------------------------- */

const celle = (x: string) => x.replace(/\|/g, '\\|').replace(/\n/g, ' ')

/** Rapporten med måltallene per leveranse (plan §8), hvert forløp og avsnittene i `tillegg`. */
export function lagQaRapport(resultater: readonly Forlopsresultat[], tillegg: readonly string[]): string {
  const klasser = Object.keys(KLASSENAVN) as Utfallsklasse[]
  const ut: string[] = [
    `<!-- Laget av \`QA_SKRIV=1 npx vitest run src/__tests__/qa\`; rediger ikke for hånd. -->`,
    '# OUSFAR Verktøy – uavhengig QA av brukerforløp',
    '',
    'Spor H i `docs/verktøy-klinisk-leveranseplan-2026-11.md`. Hvert forløp er en syntetisk, vanlig situasjon kjørt gjennom den samme veien som verktøysiden, mot de lagrede FEST-uttrekkene. Klassen er QA-testens egen vurdering av planens forløp (komplett = når sluttmålet), ikke regelens selvbeskrivelse. Dette er en måling, ikke en klinisk godkjenning. Verktøyene er bare synlige for administratorer; ingen plan her er tilgjengelig for klinikere. K0-01 slik den står (tablett valgt i skjemaet) gir komplett plan med escitalopram versjon 14 (B2, klinisk godkjent av kontrolløren 05.11.2026): tabletter så lenge hele tabletter gir dosen, så dråper mg for mg; fra 10 mg går planen over til dråper fra første trinn. Med dråper valgt (H-30, H-31 og H-39) gir 10 og 20 mg ved kort behandlingstid den samme komplette planen som før, i et snevert omfang.',
    '',
    '## Måltall per leveranse',
    '',
    `| Leveranse | ${klasser.map((k) => KLASSENAVN[k]).join(' | ')} |`,
    `| --- | ${klasser.map(() => '---:').join(' | ')} |`,
    ...(Object.keys(LEVERANSER) as Leveranse[]).map(
      (l) => `| ${l} ${LEVERANSER[l].navn} | ${klasser.map((k) => resultater.filter((r) => r.forlop.leveranse === l && r.klasse === k).length || '').join(' | ')} |`,
    ),
    '',
    '## Forløpene',
    '',
    '| Id | Situasjon | Utfall | Det brukeren ser | Avvik |',
    '| --- | --- | --- | --- | --- |',
    ...resultater
      .map((r) =>
        [
          r.forlop.id,
          celle(r.forlop.hva),
          `${KLASSENAVN[r.klasse]}${r.regel ? ` (${r.regel.id} v${r.regel.versjon})` : ''}`,
          celle(
            [...(r.skjema?.maldose ? [`[måldose ${r.skjema.maldose} mg]`] : []), ...r.formvalg.map((f) => `[formvalg ${f}]`), ...r.trinnvalg.map((t) => `[valgt dose ${t}]`), ...r.vist].join(' / '),
          ),
          celle(r.feil.join(' / ') || '–'),
        ].join(' | '),
      )
      .map((l) => `| ${l} |`),
    '',
    `## ${DELPLAN_VIST}`,
    '',
    `Klinikerflaten skal aldri tilby en delplan som klinisk doseplan, heller ikke for tidligere godkjente regelversjoner (Peders beslutning). Hvert forløp som gjør det, er et QA-avvik som får testen til å feile: ${
      resultater
        .filter((r) => r.feil.includes(DELPLAN_VIST))
        .map((r) => r.forlop.id)
        .join(', ') || 'ingen'
    }.`,
    '',
    ...tillegg,
    '',
  ]
  return ut.join('\n')
}
