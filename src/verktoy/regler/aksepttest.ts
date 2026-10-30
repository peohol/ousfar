/**
 * Aksepttesten av nedtrappingsreglene i P7 med de faktiske norske preparatene
 * (`docs/verktøy-p7-aksepttest.md`), etter kontrollrunden 30.10.2026 (P7.5,
 * del E.2): for hvert virkestoff og hver legemiddelform i FEST regnes (a) en
 * vanlig dose, (b) lang behandlingstid, (c) tidligere seponeringssymptomer
 * (den langsomme varianten), (d) en lav dose, (f) videreføringen fra siste dose
 * i (a), og (g) om planen stopper allerede ved første trinn. Alt regnes med
 * preparatene i et lagret FEST-uttrekk (e), ikke syntetiske.
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
import { beregnDoseplan, formvalgSomTrengs, planform, type Doseplaninndata, type Doseplanresultat, type Omgivelse } from '../motor/plan'
import { festkoblinger, KARTLEGGING } from '../register'
import type { Beregningsinndata, Regel } from './modell'
import { LANG_BEHANDLINGSTID, NEDTRAPPINGSSETT, UTENFOR_DOSERAMME_ID } from './nedtrapping'

export const AKSEPTTESTFIL = 'docs/verktøy-p7-aksepttest.md'
export const FEST_AKSEPTTEST = 'src/data/verktoy/fest-aksepttest.json'

/** Stien til trinnstørrelsen forskriveren kan justere i en P7-regel. */
export const PROSENTSTI = 'plan.forlop[0].faser[0].strategi.prosent'
/** Trinnstørrelsen ved lang behandlingstid i (b): høyst 10 %, som ikke krever begrunnelse i noen risikogruppe. */
const LANG_PROSENT = 10

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

/** Laveste styrke i én enhet blant preparatene som kan brukes i formen. */
export function lavesteStyrke(u: Festuttrekk, n: string, form: Formalternativ): number | null {
  const mg = byggesteiner(grunnlagFor(u, n), n, omgivelseFor(u).idag)
    .filter((b) => b.begrensninger.length === 0 && b.registrering === 'registrert' && b.marked === 'markedsfort' && b.mg !== null)
    .filter((b) => form.kode === null || b.legemiddelform?.kode === form.kode)
    .map((b) => b.mg!)
  return mg.length > 0 ? Math.min(...mg) : null
}

export function beregnAksept(u: Festuttrekk, r: Regel, form: Formalternativ, inndata: Beregningsinndata): Doseplanresultat {
  const x: Doseplaninndata = { ...inndata, godkjenningsfritak: false, ...(form.kode && { formvalg: { fra: { legemiddelformer: [form.kode] } } }) }
  return beregnDoseplan(r, x, grunnlagFor(u, nokkel(r)), omgivelseFor(u), NEDTRAPPINGSSETT)
}

/** Antall reduksjoner planen kan gi med preparatene; 0 når den stopper før første trinn. */
export const reduksjoner = (p: Doseplanresultat) => (p.status === 'doseplan' ? (p.forlop[0]?.perioder.length ?? 0) : 0)
/** Siste dose planen gir, eller `null` når den stopper før første trinn. */
export const sisteDose = (p: Doseplanresultat) => (p.status === 'doseplan' ? (p.forlop[0]?.perioder.at(-1)?.mg ?? null) : null)

export type Scenario = 'a' | 'b' | 'c' | 'd' | 'f'

export const SCENARIOER: Record<Scenario, string> = {
  a: 'Vanlig dose, kort behandlingstid, standardvalgene',
  b: `Lang behandlingstid, ${LANG_PROSENT} % per trinn`,
  c: 'Tidligere seponeringssymptomer (langsom variant)',
  d: 'Lav dose: laveste styrke i formen',
  f: 'Videreføring: ny plan fra siste dose i (a)',
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
  const videre = sisteDose(a)
  const resultater: Akseptresultat[] = [
    { scenario: 'a', startdose_mg: dose, plan: a },
    { scenario: 'b', startdose_mg: dose, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, dose, { svar: LANG, justert: { [PROSENTSTI]: LANG_PROSENT } })) },
    { scenario: 'c', startdose_mg: dose, plan: beregnAksept(u, s.langsom, form, besvart(s.langsom, dose)) },
    lav === null
      ? { scenario: 'd', startdose_mg: null, plan: null, ikke_regnet: 'Ingen markedsført styrke med markedsføringstillatelse i formen.' }
      : { scenario: 'd', startdose_mg: lav, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, lav)) },
    videre === null
      ? { scenario: 'f', startdose_mg: null, plan: null, ikke_regnet: '(a) gir ingen dose å videreføre fra.' }
      : { scenario: 'f', startdose_mg: videre, plan: beregnAksept(u, s.hoved, form, besvart(s.hoved, videre)) },
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

const linjer = (p: Doseplanresultat) => {
  const form = planform(p)
  return form.stopp ? `Stopper:\n\n${liste(form.stopp)}` : liste(form.fra ?? [])
}

function scenariotekst(r: Akseptresultat): string {
  const hode = `**(${r.scenario}) ${SCENARIOER[r.scenario]}${r.startdose_mg !== null ? `, fra ${tall(r.startdose_mg)} mg` : ''}.**`
  return `${hode}\n\n${r.plan ? linjer(r.plan) : r.ikke_regnet}`
}

const formnavn = (f: Formalternativ) => (f.kode ? `${f.navn} [${f.kode}]` : 'eneste form')

export function lagAksepttestrapport(u: Festuttrekk): string {
  const sett = akseptsett(u)
  const forsteTrinn = sett.filter((t) => reduksjoner(t.resultater[0]!.plan!) === 0)
  const oversikt = tabell(
    ['Virkestoff', 'Form', ...(['a', 'b', 'c', 'd', 'f'] as const).map((s) => `(${s})`)],
    sett.map((t) => [t.nokkel, formnavn(t.form), ...t.resultater.map(utfall)]),
  )
  const annenhver = annenhverDag(u)
  return `<!-- Laget av \`npm run verktoy:regler -- aksepttest\` fra ${FEST_AKSEPTTEST}; rediger ikke for hånd. -->
# P7: aksepttest med norske preparater

Aksepttesten etter kontrollrunden 30.10.2026 (P7.5, del E.2). Hver hovedregel og langsom variant i \`ousfar-verktoy-nedtrapping\` versjon ${NEDTRAPPINGSSETT.versjon} er regnet med de faktiske preparatene i FEST, ikke syntetiske, for hver legemiddelform forskriveren kan velge. FEST-uttrekket er hentet ${norskDato(u.hentet.slice(0, 10))} (kildedato ${u.utvalg.kildedato ? norskDato(u.utvalg.kildedato.slice(0, 10)) : 'ukjent'}); bare preparater med markedsføringstillatelse som er markedsført, brukes, ikke godkjenningsfritak.

**Dette er modellberegninger til faglig kontroll, ikke kliniske planer.** Ingen beregnbar regel er klinisk godkjent, og verktøyet viser ingen av planene. Pasientopplysninger inngår ikke.

Scenariene er:

${liste(Object.entries(SCENARIOER).map(([k, v]) => `(${k}) ${v}.`))}
- (e) Alle scenariene bruker de norske preparatene i FEST.
- (g) Oversikten viser om planen stopper allerede ved første trinn.

Svarene er de samme i alle scenariene: startforslaget og organfunksjon er bekreftet, ingen unntak gjelder, dosen er innenfor rammen, og svaret er nei på stoffets spørsmål om pasientgruppe og indikasjon. Den vanlige dosen er startdosen i regelens første regneeksempel.

## Oversikt (g)

I (a) stopper ${forsteTrinn.length} av ${sett.length} kombinasjoner av virkestoff og form allerede ved første trinn${forsteTrinn.length > 0 ? `: ${forsteTrinn.map((t) => `${t.nokkel} (${formnavn(t.form)})`).join(', ')}` : ''}.

${oversikt}

## Per virkestoff

${sett.map((t) => `### ${t.nokkel}, ${formnavn(t.form)}\n\n${t.resultater.map(scenariotekst).join('\n\n')}`).join('\n\n')}

## Fluoksetin 20 mg annenhver dag

${annenhver.map((a) => `**${formnavn(a.form)}.**\n\n${linjer(a.plan)}`).join('\n\n')}
`
}
