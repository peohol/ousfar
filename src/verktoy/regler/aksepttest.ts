/**
 * Aksepttesten av nedtrappingsreglene i P7 med de faktiske norske preparatene
 * (`docs/verktøy-p7-aksepttest.md`), etter kontrollrunden 30.10.2026 (P7.5,
 * del E.2): for hvert virkestoff og hver legemiddelform i FEST regnes (a) en
 * vanlig dose, (b) lang behandlingstid, (c) tidligere seponeringssymptomer
 * (den langsomme varianten), (d) en lav dose, (f) videreføringen fra siste dose
 * i (a), og (g) om planen stopper allerede ved første trinn. Alt regnes med
 * preparatene i et lagret FEST-uttrekk (e), ikke syntetiske. Der et trinn ikke
 * kan gis, viser rapporten dosene forskriveren kan velge (`Fase.trinnvalg`),
 * og (h) simulerer hvor langt planen kommer når et valg gjøres ved hvert slikt
 * trinn.
 *
 * Dette er modellberegninger til faglig kontroll, aldri kliniske planer:
 * ingen beregnbar regel er godkjent, og resultatet viser hvor mange av reglene
 * som faktisk kan gi en plan med preparatene. Uttrykket hentes med
 * `npm run verktoy:regler -- hent-fest`, og rapporten skrives med
 * `-- aksepttest`; testene sier fra når den ikke er oppdatert. Ingen
 * pasientopplysninger inngår.
 */
import type { Legemiddelutvalg } from '../../legemiddeldata/lesing'
import { byggesteiner, norskDato, type Preparatgrunnlag } from '../motor/byggesteiner'
import { beregnDoseplan, formvalgSomTrengs, omfangsfeil, planform, trinndosetekst, type Doseplaninndata, type Doseplanresultat, type Omgivelse, type Trinnvalg } from '../motor/plan'
import { festkoblinger, KARTLEGGING } from '../register'
import { avrund } from './beregning'
import { PLANHORISONT_TRINN } from './bygg'
import type { Beregningsinndata, Regel, Trinnvalgsvar } from './modell'
import { LANG_BEHANDLINGSTID, LANG_PROSENT, NEDTRAPPINGSSETT, STI, UTENFOR_DOSERAMME_ID } from './nedtrapping'

export const AKSEPTTESTFIL = 'docs/verktøy-p7-aksepttest.md'
export const FEST_AKSEPTTEST = 'src/data/verktoy/fest-aksepttest.json'
/** FEST-uttrekket ende-til-ende-testene av pilotreglene regnes fra (P4.8). */
export const FEST_PILOT = 'src/data/verktoy/fest-pilotsett.json'

/** Stien til trinnstørrelsen forskriveren kan justere i en P7-regel. */
export const PROSENTSTI = STI.prosent

/** Kort behandlingstid og dose innenfor rammen. */
export const KORT = { [LANG_BEHANDLINGSTID.id]: false, [UTENFOR_DOSERAMME_ID]: false }
export const LANG = { ...KORT, [LANG_BEHANDLINGSTID.id]: true }

/** Nei på stoffets egne spørsmål om pasientgruppe, indikasjon og organfunksjon; de felles spørsmålene står i {@link KORT}. */
export const stoffsvar = (r: Regel) => Object.fromEntries((r.sporsmal ?? []).filter((x) => !(x.id in KORT)).map((x) => [x.id, false]))

/**
 * Inndata med startforslag og organfunksjon bekreftet, hvert unntak avkreftet,
 * kort behandlingstid, dose innenfor rammen og nei på stoffets egne spørsmål.
 * Svar i `x` kommer i tillegg til stoffets nei.
 */
export const besvart = (r: Regel, startdose_mg: number, x: Partial<Beregningsinndata> = {}): Beregningsinndata => ({
  startdose_mg,
  bekreftet: r.bekreftelser.map((b) => b.id),
  pasientforhold: Object.fromEntries(r.unntak.map((u) => [u.id, false])),
  ...((r.sporsmal ?? []).length > 0 && { svar: { ...KORT, ...stoffsvar(r) } }),
  ...x,
  ...(x.svar && { svar: { ...stoffsvar(r), ...x.svar } }),
})

/** Startdosen i regelens første beregnede eksempel. */
export const vanligDose = (r: Regel) => r.eksempler.find((e) => !e.stopp)!.inndata.startdose_mg

const nokkel = (r: Regel) => (r.fra.type === 'virkestoff' ? r.fra.nokkel : '')
const regel = (id: string) => NEDTRAPPINGSSETT.regler.find((r) => r.id === id)!
const beregnbare = NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet !== 'bare_tekstlig')
/** Hovedregelen per virkestoff, med den langsomme varianten. */
export const AKSEPTSTOFFER = beregnbare
  .filter((r) => r.id === `seponering-${nokkel(r)}`)
  .map((r) => ({ nokkel: nokkel(r), hoved: r, langsom: regel(`${r.id}-langsom`) }))
const ANNENHVER_DAG = regel('seponering-fluoksetin-annenhver-dag')

export interface Festuttrekk {
  hentet: string
  utvalg: Legemiddelutvalg
}

/** Dagen preparatstatusen i uttrekket gjelder, og tidspunktet det ble kontrollert. */
export const omgivelseFor = (u: Festuttrekk): Omgivelse => ({ idag: u.hentet.slice(0, 10), naa: u.utvalg.kontrollert_kl ?? u.hentet })

const grunnlagFor = (u: Festuttrekk, n: string): Preparatgrunnlag => ({ utvalg: u.utvalg, koblinger: festkoblinger([n]), overstyringer: KARTLEGGING.festoverstyringer })

/** Én legemiddelform som kan velges, med koden i FEST; `null` når virkestoffet bare har én. */
export interface Formalternativ {
  kode: string | null
  navn: string
}

/** Legemiddelformene forskriveren må velge mellom for virkestoffet, eller én uten valg. */
export function formerFor(u: Festuttrekk, r: Regel): Formalternativ[] {
  const alt = formvalgSomTrengs(r, besvart(r, vanligDose(r)), grunnlagFor(u, nokkel(r)), omgivelseFor(u).idag)
  const former = alt.fra?.legemiddelformer ?? []
  return former.length > 0 ? former.map((f) => ({ kode: f.kode, navn: f.navn })) : [{ kode: null, navn: 'eneste form' }]
}

/** Styrkene i én enhet blant preparatene som kan brukes i formen: markedsført, med markedsføringstillatelse. */
export const styrker = (u: Festuttrekk, n: string, form: Formalternativ) =>
  byggesteiner(grunnlagFor(u, n), n, omgivelseFor(u).idag)
    .filter((b) => b.begrensninger.length === 0 && b.registrering === 'registrert' && b.marked === 'markedsfort' && b.mg !== null)
    .filter((b) => form.kode === null || b.legemiddelform?.kode === form.kode)
    .map((b) => b.mg!)

/** Laveste styrke i én enhet blant preparatene som kan brukes i formen. */
export function lavesteStyrke(u: Festuttrekk, n: string, form: Formalternativ): number | null {
  const mg = styrker(u, n, form)
  return mg.length > 0 ? Math.min(...mg) : null
}

/** Planen med de faktiske preparatene i FEST; `motor` er `kliniskDoseplan` når testen skal se det appen viser. */
export function beregnAksept(u: Festuttrekk, r: Regel, form: Formalternativ, inndata: Beregningsinndata, motor = beregnDoseplan): Doseplanresultat {
  const x: Doseplaninndata = { ...inndata, godkjenningsfritak: false, ...(form.kode && { formvalg: { fra: { legemiddelformer: [form.kode] } } }) }
  return motor(r, x, grunnlagFor(u, nokkel(r)), omgivelseFor(u), NEDTRAPPINGSSETT)
}

/** Antall reduksjoner planen kan gi med preparatene; 0 når den stopper før første trinn. */
export const reduksjoner = (p: Doseplanresultat) => (p.status === 'doseplan' ? (p.forlop[0]?.perioder.length ?? 0) : 0)
/** Siste dose planen gir, eller `null` når den stopper før første trinn. */
export const sisteDose = (p: Doseplanresultat) => (p.status === 'doseplan' ? (p.forlop[0]?.perioder.at(-1)?.mg ?? null) : null)

export type Scenario = 'a' | 'b' | 'c' | 'd' | 'f' | 'h'

export const SCENARIOER: Record<Scenario, string> = {
  a: 'Vanlig dose, kort behandlingstid, standardvalgene',
  b: `Lang behandlingstid, ${LANG_PROSENT} % per trinn`,
  c: 'Tidligere seponeringssymptomer (langsom variant)',
  d: 'Lav dose: laveste styrke i formen',
  f: 'Videreføring: ny plan fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg',
  h: 'Som (a), men ved hvert trinn som ikke kan gis, velges den tilbudte dosen med reduksjon nærmest standardvalget (en simulering av forskriverens valg, ikke et forslag)',
}

/**
 * Den tilbudte dosen med reduksjon nærmest regelens standardvalg (ved likt
 * avvik den minste reduksjonen): en simulering av forskriverens valg til
 * kontrollen, aldri et forslag; beregningen selv velger aldri.
 */
function simulertValg(r: Regel, tv: Trinnvalg): Trinnvalgsvar {
  const fase = r.plan.forlop[0]!.faser[0]!
  const standard = fase.type === 'nedtrapping' && fase.strategi.type === 'prosent_av_aktuell' ? (fase.strategi.prosent.verdi ?? 0) : 0
  const d = [...tv.doser].sort((a, b) => Math.abs(a.prosent - standard) - Math.abs(b.prosent - standard) || a.prosent - b.prosent)[0]!
  return { forlop: tv.forlop, trinn: tv.trinn, fra_mg: tv.fra_mg, mg: d.mg }
}

/** (h): planen når forskriveren ved hvert trinn som ikke kan gis, velger dosen {@link simulertValg} gir. */
export function medValg(u: Festuttrekk, r: Regel, form: Formalternativ, inndata: Beregningsinndata): Doseplanresultat {
  let x = inndata
  let plan = beregnAksept(u, r, form, x)
  // Hvert valg gir minst ett trinn til, så horisonten begrenser antallet.
  for (let i = 0; i < 2 * PLANHORISONT_TRINN && plan.trinnvalg?.length; i++) {
    x = { ...x, trinnvalg: [...(x.trinnvalg ?? []), simulertValg(r, plan.trinnvalg[0]!)] }
    plan = beregnAksept(u, r, form, x)
  }
  return plan
}

/**
 * Dosen en ny plan videreføres fra (f): siste dose planen gir, eller, når den
 * stopper før første trinn med et valg, dosen forskriveren velger der
 * ({@link simulertValg}); `null` når ingen av dem finnes.
 */
export function videreforingsdose(r: Regel, p: Doseplanresultat): number | null {
  const tv = p.trinnvalg?.find((t) => t.trinn === 1)
  return sisteDose(p) ?? (tv ? simulertValg(r, tv).mg : null)
}

export interface Akseptresultat {
  scenario: Scenario
  startdose_mg: number | null
  plan: Doseplanresultat | null
  /** Hvorfor scenariet ikke er regnet. */
  ikke_regnet?: string
}

export interface Aksepttilfelle {
  nokkel: string
  form: Formalternativ
  resultater: Akseptresultat[]
}

/** Scenariene (a)–(f) for ett virkestoff i én form. */
export function akseptFor(u: Festuttrekk, s: (typeof AKSEPTSTOFFER)[number], form: Formalternativ): Aksepttilfelle {
  const dose = vanligDose(s.hoved)
  const a = beregnAksept(u, s.hoved, form, besvart(s.hoved, dose))
  const lav = lavesteStyrke(u, s.nokkel, form)
  const videre = videreforingsdose(s.hoved, a)
  const resultater: Akseptresultat[] = [
    { scenario: 'a', startdose_mg: dose, plan: a },
    { scenario: 'b', startdose_mg: dose, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, dose, { svar: LANG, justert: { [PROSENTSTI]: LANG_PROSENT } })) },
    { scenario: 'c', startdose_mg: dose, plan: beregnAksept(u, s.langsom, form, besvart(s.langsom, dose)) },
    lav === null
      ? { scenario: 'd', startdose_mg: null, plan: null, ikke_regnet: 'Ingen markedsført styrke med markedsføringstillatelse i formen.' }
      : { scenario: 'd', startdose_mg: lav, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, lav)) },
    videre === null
      ? { scenario: 'f', startdose_mg: null, plan: null, ikke_regnet: '(a) gir ingen dose å videreføre fra, heller ikke en dose forskriveren kan velge.' }
      : { scenario: 'f', startdose_mg: videre, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, videre)) },
    { scenario: 'h', startdose_mg: dose, plan: medValg(u, s.hoved, form, besvart(s.hoved, dose)) },
  ]
  return { nokkel: s.nokkel, form, resultater }
}

export function akseptsett(u: Festuttrekk): Aksepttilfelle[] {
  return AKSEPTSTOFFER.flatMap((s) => formerFor(u, s.hoved).map((f) => akseptFor(u, s, f)))
}

/** Fluoksetin 20 mg annenhver dag, i hver form. */
export function annenhverDag(u: Festuttrekk): { form: Formalternativ; plan: Doseplanresultat }[] {
  return formerFor(u, ANNENHVER_DAG).map((form) => ({ form, plan: beregnAksept(u, ANNENHVER_DAG, form, besvart(ANNENHVER_DAG, 20)) }))
}

/* --- Rapporten ------------------------------------------------------------------- */

const celle = (t: string) => t.replace(/\|/g, '\\|').replace(/\n/g, ' ')
const tabell = (hode: string[], rader: string[][]) =>
  [`| ${hode.join(' | ')} |`, `| ${hode.map(() => '---').join(' | ')} |`, ...rader.map((r) => `| ${r.map(celle).join(' | ')} |`)].join('\n')
const tall = (x: number) => String(x).replace('.', ',')
const liste = (xs: string[]) => xs.map((x) => `- ${x}`).join('\n')

/** Kort sammendrag til oversiktstabellen: antall reduksjoner, eller at planen stopper ved første trinn. */
function utfall(r: Akseptresultat): string {
  if (!r.plan) return '–'
  const n = reduksjoner(r.plan)
  return n === 0 ? 'stopper ved første trinn' : `${n} ${n === 1 ? 'reduksjon' : 'reduksjoner'}`
}

/**
 * Det kliniske omfanget en plan har i ett scenario (P7.5, kontrollørens
 * gjennomgang av 62ebb21 og 9cb420b). Et avvik som krever begrunnelse, tilbys
 * ikke, så et trinn uten dose i det foretrukne området er et forklarende stopp.
 */
export type Omfang = 'delplan' | 'valg' | 'stopp'

export const OMFANG: Record<Omfang, string> = {
  delplan:
    'delplan med den foretrukne reduksjonen, som stopper ved trinnet før det første som ikke kan gis; med én reduksjon er den én mulig reduksjon med revurdering, ikke en fullstendig nedtrappingsplan',
  valg: 'første trinn bare med en dose forskriveren velger, innenfor det foretrukne området uten krav om begrunnelse',
  stopp: 'bare forklarende stopp; ingen dose med reduksjon innenfor det foretrukne området kan gis, og et avvik tilbys ikke',
}

/** Omfanget av planen: en delplan når første trinn kan gis med den foretrukne reduksjonen; ellers om forskriveren kan velge en dose for første trinn. */
export function omfang(p: Doseplanresultat): Omfang {
  if (reduksjoner(p) > 0) return 'delplan'
  return p.trinnvalg?.some((t) => t.trinn === 1) ? 'valg' : 'stopp'
}

const OMFANGSORD: Record<Omfang, string> = { delplan: 'delplan', valg: 'valgt dose', stopp: 'stopp' }

/** Omfanget i en tabellcelle, med antall reduksjoner; én reduksjon står som det den er. */
function omfangscelle(p: Doseplanresultat | null | undefined): string {
  if (!p) return '–'
  const o = omfang(p)
  if (o !== 'delplan') return OMFANGSORD[o]
  const n = reduksjoner(p)
  return n === 1 ? 'én reduksjon med revurdering' : `delplan (${n})`
}

/**
 * Startdosene omfanget regnes for per form: hver markedsført styrke i formen
 * som én enhet, regelens vanlige dose og grensene for startdosen (høyeste
 * døgndose og grensene for pasientgruppe og indikasjon), opp til den høyeste
 * startdosen svarene i scenariene tillater uten begrunnelse.
 */
export function startdoser(u: Festuttrekk, r: Regel, form: Formalternativ): number[] {
  const svar = besvart(r, 0).svar ?? {}
  const krav = r.inndata.flatMap((k) => (k.navn === 'startdose' && k.omrade ? [{ ...k, omrade: k.omrade }] : []))
  const hoyest = Math.min(...krav.filter((k) => !k.ved || (svar[k.ved.sporsmal] ?? false) === k.ved.svar).map((k) => k.omrade[1]))
  return [...new Set([...styrker(u, nokkel(r), form), vanligDose(r), ...krav.map((k) => k.omrade[1])])].filter((mg) => mg > 0 && mg <= hoyest).sort((a, b) => a - b)
}

/** Scenariene omfanget regnes for per startdose. */
export type Dosescenario = 'a' | 'b' | 'c' | 'f'

export interface Doseomfang {
  startdose_mg: number
  planer: Record<Dosescenario, Doseplanresultat | null>
  /** Om planen i scenariet er innenfor regelens kliniske omfang ({@link omfangsfeil}). */
  innenfor: Record<Dosescenario, boolean>
  /** Dosen (f) er videreført fra, eller `null` når (a) ikke gir noen. */
  videre_mg: number | null
}

/**
 * Om planen er innenfor regelens kliniske omfang: en delplan som den er, og
 * ved et valg for første trinn planen med dosen {@link simulertValg} gir.
 */
export function iOmfang(u: Festuttrekk, r: Regel, form: Formalternativ, inndata: Beregningsinndata, p: Doseplanresultat): boolean {
  const tv = p.trinnvalg?.find((t) => t.trinn === 1)
  const plan = reduksjoner(p) > 0 ? p : tv ? beregnAksept(u, r, form, { ...inndata, trinnvalg: [simulertValg(r, tv)] }) : null
  return plan?.status === 'doseplan' && reduksjoner(plan) > 0 && omfangsfeil(r, inndata, plan.forlop).length === 0
}

/** (a), (b), (c) og videreføringen (f) fra én startdose i én form. */
export function omfangFor(u: Festuttrekk, s: (typeof AKSEPTSTOFFER)[number], form: Formalternativ, startdose_mg: number): Doseomfang {
  const a = besvart(s.hoved, startdose_mg)
  const videre_mg = videreforingsdose(s.hoved, beregnAksept(u, s.hoved, form, a))
  const inndata: Record<Dosescenario, [Regel, Beregningsinndata] | null> = {
    a: [s.hoved, a],
    b: [s.hoved, besvart(s.hoved, startdose_mg, { svar: LANG, justert: { [PROSENTSTI]: LANG_PROSENT } })],
    c: [s.langsom, besvart(s.langsom, startdose_mg)],
    f: videre_mg === null ? null : [s.hoved, besvart(s.hoved, videre_mg)],
  }
  const planer = Object.fromEntries(Object.entries(inndata).map(([k, x]) => [k, x && beregnAksept(u, x[0], form, x[1])])) as Doseomfang['planer']
  const innenfor = Object.fromEntries(
    Object.entries(inndata).map(([k, x]) => [k, !!x && !!planer[k as Dosescenario] && iOmfang(u, x[0], form, x[1], planer[k as Dosescenario]!)]),
  ) as Doseomfang['innenfor']
  return { startdose_mg, videre_mg, planer, innenfor }
}

export function omfangssett(u: Festuttrekk): { nokkel: string; form: Formalternativ; doser: Doseomfang[] }[] {
  return AKSEPTSTOFFER.flatMap((s) => formerFor(u, s.hoved).map((form) => ({ nokkel: s.nokkel, form, doser: startdoser(u, s.hoved, form).map((mg) => omfangFor(u, s, form, mg)) })))
}

/** «Kan velges for trinn 2 (dag 29, beregnet 56,25 mg, fra 75 mg): 60 mg (−20 %).» */
export const valgtekst = (t: Trinnvalg) =>
  `Kan velges for trinn ${t.trinn} (dag ${t.fra_dag}, beregnet ${tall(avrund(t.beregnet_mg))} mg, fra ${tall(t.fra_mg)} mg): ${t.doser.map((d) => trinndosetekst({ ...d, prosent: avrund(d.prosent) })).join(' eller ')}.`

const linjer = (p: Doseplanresultat) => {
  const form = planform(p)
  const valg = (p.trinnvalg ?? []).map(valgtekst)
  return (form.stopp ? `Stopper:\n\n${liste(form.stopp)}` : liste(form.fra ?? [])) + (valg.length > 0 ? `\n\n${liste(valg)}` : '')
}

function scenariotekst(r: Akseptresultat): string {
  const hode = `**(${r.scenario}) ${SCENARIOER[r.scenario]}${r.startdose_mg !== null ? `, fra ${tall(r.startdose_mg)} mg` : ''}.**`
  return `${hode}\n\n${r.plan ? linjer(r.plan) : r.ikke_regnet}`
}

const formnavn = (f: Formalternativ) => (f.kode ? `${f.navn} [${f.kode}]` : 'eneste form')

export function lagAksepttestrapport(u: Festuttrekk): string {
  const sett = akseptsett(u)
  const forsteTrinn = sett.filter((t) => reduksjoner(t.resultater[0]!.plan!) === 0)
  const medValgForste = sett.filter((t) => reduksjoner(t.resultater.find((r) => r.scenario === 'h')!.plan!) === 0)
  const tilbud = sett.filter((t) => t.resultater[0]!.plan!.trinnvalg?.length)
  const oversikt = tabell(
    ['Virkestoff', 'Form', ...(Object.keys(SCENARIOER) as Scenario[]).map((s) => `(${s})`)],
    sett.map((t) => [t.nokkel, formnavn(t.form), ...t.resultater.map(utfall)]),
  )
  const kliniske = (Object.keys(SCENARIOER) as Scenario[]).filter((s) => s !== 'h')
  const omfangstabell = tabell(
    ['Virkestoff', 'Form', ...kliniske.map((s) => `(${s})`)],
    sett.map((t) => [t.nokkel, formnavn(t.form), ...kliniske.map((s) => omfangscelle(t.resultater.find((r) => r.scenario === s)?.plan))]),
  )
  const perDose = omfangssett(u)
  const dosetabell = tabell(
    ['Virkestoff', 'Form', 'Startdose', '(a)', '(b)', '(c)', '(f)'],
    perDose.flatMap((t) =>
      t.doser.map((d) => {
        const celle = (x: Dosescenario) => `${omfangscelle(d.planer[x])}${d.innenfor[x] ? ' **[klinisk omfang]**' : ''}`
        return [t.nokkel, formnavn(t.form), `${tall(d.startdose_mg)} mg`, celle('a'), celle('b'), celle('c'), d.videre_mg === null ? '–' : `fra ${tall(d.videre_mg)} mg: ${celle('f')}`]
      }),
    ),
  )
  const lave = sett.flatMap((t) => {
    const d = t.resultater.find((r) => r.scenario === 'd')?.plan
    return d && omfang(d) !== 'stopp' ? [`${t.nokkel} (${formnavn(t.form)})`] : []
  })
  const annenhver = annenhverDag(u)
  return `<!-- Laget av \`npm run verktoy:regler -- aksepttest\` fra ${FEST_AKSEPTTEST}; rediger ikke for hånd. -->
# P7: aksepttest med norske preparater

Aksepttesten etter kontrollrunden 30.10.2026 (P7.5, del E.2). Hver hovedregel og langsom variant i \`ousfar-verktoy-nedtrapping\` versjon ${NEDTRAPPINGSSETT.versjon} er regnet med de faktiske preparatene i FEST, ikke syntetiske, for hver legemiddelform forskriveren kan velge. FEST-uttrekket er hentet ${norskDato(u.hentet.slice(0, 10))} (kildedato ${u.utvalg.kildedato ? norskDato(u.utvalg.kildedato.slice(0, 10)) : 'ukjent'}); bare preparater med markedsføringstillatelse som er markedsført, brukes, ikke godkjenningsfritak.

**Dette er modellberegninger til faglig kontroll, ikke kliniske planer.** Ingen beregnbar P7-regel er klinisk godkjent, og verktøyet viser ingen av planene. Pasientopplysninger inngår ikke.

Scenariene er:

${liste(Object.entries(SCENARIOER).map(([k, v]) => `(${k}) ${v}.`))}
- (e) Alle scenariene bruker de norske preparatene i FEST.
- (g) Oversikten viser om planen stopper allerede ved første trinn.

Stoffene som bare har fagtekst, er ikke med: ${NEDTRAPPINGSSETT.regler.filter((r) => r.beregnbarhet === 'bare_tekstlig').map(nokkel).join(', ')}. Mirtazapin, moklobemid og paroksetin ble fagtekst etter kontrollørens beslutning P7-A fordi ingen dose innenfor valgområdet for første trinn kunne gis med de norske formene. Citalopram ble fagtekst etter gjennomgangen av 9cb420b, fordi den eneste dosen som kunne gis ved første trinn fra vanlig dose, var en halvering, og fluoksetinregelen gjelder ikke lenger de harde kapslene, av samme grunn.

Svarene er de samme i alle scenariene: startforslaget og organfunksjon er bekreftet, ingen unntak gjelder, dosen er innenfor rammen, og svaret er nei på stoffets spørsmål om pasientgruppe og indikasjon. Den vanlige dosen er startdosen i regelens første regneeksempel. Under hver plan som stopper ved et trinn forskriveren kan velge dosen for, står dosene som kan velges, med faktisk reduksjon.

## Oversikt (g)

I (a) stopper ${forsteTrinn.length} av ${sett.length} kombinasjoner av virkestoff og form allerede ved første trinn${forsteTrinn.length > 0 ? `: ${forsteTrinn.map((t) => `${t.nokkel} (${formnavn(t.form)})`).join(', ')}` : ''}.

Der et trinn ikke kan gis nøyaktig, kan forskriveren velge blant de nærmeste dosene som kan gis, med faktisk reduksjon innenfor valgområdet for risikogruppen (bidragsyterens valg 30.10.2026, akseptert som prinsipp i kontrollørens beslutning P7-A). I (a) tilbyr ${tilbud.length} av ${sett.length} kombinasjoner et slikt valg. Med et valg ved hvert slikt trinn (h) stopper ${medValgForste.length} av ${sett.length} ved første trinn.

${oversikt}

## Klinisk omfang per virkestoff og form (P7.5)

Til kontrollørens regel- og formspesifikke kontroll (gjennomgangen av 62ebb21 og 9cb420b): for hver kombinasjon og hvert klinisk scenario, om en oppnåelig delplan kan brukes, eller om bare et forklarende stopp er riktig. Tabellen er en teknisk matrise regnet ut av planene, ikke en klinisk godkjenning. Ingen delplan er en fullstendig seponering. Et avvik som krever begrunnelse, tilbys ikke: der det er det eneste som kan gis, er planen et forklarende stopp, og en annen plan vurderes individuelt utenfor verktøyet. Scenario (h) er en simulering og er ikke med.

${liste(Object.entries(OMFANG).map(([k, v]) => `**${OMFANGSORD[k as Omfang]}:** ${v}.`))}

${omfangstabell}

${lave.length === 0 ? 'Ingen av lavdoseeksemplene (d) gir et ordinært første trinn: fra laveste styrke i formen er planen et forklarende stopp i alle kombinasjonene.' : `Lavdoseeksemplene (d) gir et første trinn bare for ${lave.join(', ')}.`}

### Per startdose

Omfanget for hver markedsført styrke i formen, regelens vanlige dose og grensene for startdosen, så doseområdets grenser og andre faktiske startdoser er med, opp til den høyeste startdosen svarene over tillater uten begrunnelse; en høyere dose krever et ja eller en begrunnelse og er ikke med. Videreføringen (f) regnes fra siste dose i (a), eller fra dosen forskriveren velger ved første trinn når (a) bare gir et valg (den tilbudte dosen med reduksjon nærmest standardvalget, en simulering).

**[klinisk omfang]** markerer cellene som er innenfor regelens kliniske omfang etter kontrollørens gjennomgang av 0ae6d07 (legemiddelform, startdose, behandlingstid, tidligere seponeringssymptomer og trinnstørrelse som kontrollert, og for klomipramin uten delte tabletter). Merkingen er ingen godkjenning: en klinisk godkjenning kan bare gjelde disse tilfellene, og alle andre celler stopper med forklaring i verktøyet, også om regelen blir godkjent. En videreføring er bare med når dosen den regnes fra, selv er et kontrollert tilfelle.

${dosetabell}

## Per virkestoff

${sett.map((t) => `### ${t.nokkel}, ${formnavn(t.form)}\n\n${t.resultater.map(scenariotekst).join('\n\n')}`).join('\n\n')}

## Fluoksetin 20 mg annenhver dag

${annenhver.map((a) => `**${formnavn(a.form)}.**\n\n${linjer(a.plan)}`).join('\n\n')}
`
}
