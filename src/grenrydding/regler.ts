/**
 * Oppryddingen av gamle grener (`docs/grenrydding.md`): grener ingen annen
 * opprydding kjenner, som trådenes grener etter en lukket PR, grener uten noe
 * nytt og grener med feil navn. Her står bare reglene; kjøringen henter
 * dataene og sletter (`./kjoring`).
 *
 * Kuratorjobbenes grener og kurateringskøens grener har egne regler
 * (`docs/kuratorjobber.md`, `docs/kurateringsko.md`) og røres aldri her.
 */
import { KOGREN } from '../kuratorjobb/ryddekjoring'
import { JOBBGREN } from '../kuratorjobb/modell'
import { OKTGREN } from '../kurateringsko/modell'
import { varighet } from '../kuratorjobb/rydding'

const TIME = 3_600_000

/** Fristene, i timer, regnet fra den siste commiten eller fra da PR-en ble avsluttet, det som kom sist. */
export const GRENFRISTER = {
  /** Den siste PR-en fra grenen er slått sammen eller lukket, og ingen åpen PR kommer fra den. */
  etterPr: 3 * 24,
  /** Navnet ligner en jobb- eller øktgren, men følger ikke mønsteret, så ingen annen opprydding ser grenen. */
  feilNavn: 24,
} as const

/** Beholdt lenger enn dette etter den siste commiten, vises grenen som en advarsel. */
export const GAMMEL_GREN_DOGN = 30

/** Navn som ligner kuratorjobbenes og kurateringskøens grener. */
const LIGNER_KURATERINGSGREN = /^(kuratorjobb|kurateringsko)/

export interface Prinfo {
  nummer: number
  tilstand: 'apen' | 'lukket' | 'sammenslatt'
  /** Når PR-en ble lukket eller slått sammen. */
  lukket_kl: string | null
}

/** Det oppryddingen vet om én gren. */
export interface Grenvurderingsgrunnlag {
  navn: string
  beskyttet: boolean
  /** Tidspunktet for den siste commiten på grenen. */
  commit_kl: string | null
  /** Commits på grenen som ikke står på hovedgrenen; `null` når det ikke kunne avgjøres. */
  foran: number | null
  /** Om alt grenen endrer (fra der den skilte lag med hovedgrenen), står likt på hovedgrenen nå; `null` når det ikke kunne avgjøres. */
  likPaHovedgrenen: boolean | null
  /** PR-ene fra grenen, i dette repoet. */
  prer: readonly Prinfo[]
}

export interface Grenvurdering {
  gren: string
  slett: boolean
  /** Hvorfor, på norsk, for oversikten i kjøringen. */
  grunn: string
  /** Når en beholdt gren tidligst kan slettes etter reglene, hvis ingenting endrer seg. */
  tidligst_kl: string | null
  /** Den siste commiten, for advarselen om gamle grener. */
  sist_kl: string | null
}

/**
 * Hvem som ellers rydder grenen, eller `null` når det er denne oppryddingen.
 * Hovedgrenen, køens gren og de gyldige jobb- og øktgrenene røres aldri her.
 */
export function ryddesAvAndre(navn: string, hovedgren: string): string | null {
  if (navn === hovedgren) return 'hovedgrenen'
  if (navn === KOGREN) return 'kurateringskøens tilstand'
  if (JOBBGREN.test(navn)) return 'oppryddingen av kuratorjobbgrener'
  if (OKTGREN.test(navn)) return 'kurateringskøen'
  return null
}

const tid = (v: string | null) => {
  const t = v ? Date.parse(v) : NaN
  return Number.isFinite(t) ? t : NaN
}
const iso = (t: number) => new Date(t).toISOString()
const tidspunkt = (t: number) => `${iso(t).slice(0, 10)} kl. ${iso(t).slice(11, 16)} UTC`
const PRTILSTAND: Readonly<Record<Prinfo['tilstand'], string>> = { apen: 'åpen', lukket: 'lukket', sammenslatt: 'slått sammen' }

/**
 * Om én gren kan slettes. Reglene, i rekkefølge:
 *
 * 1. Beholdes alltid: en gren en annen opprydding eier, en gren GitHub
 *    beskytter, og en gren en åpen PR kommer fra.
 * 2. Slettes med en gang: en gren uten commits utover hovedgrenen, og en gren
 *    der alt den endrer, alt står likt på hovedgrenen. Ingenting går tapt.
 * 3. Slettes etter fristen: en gren med et navn som ligner en jobb- eller
 *    øktgren uten å følge mønsteret, og en gren der den siste PR-en er slått
 *    sammen eller lukket. Fristen regnes fra den siste commiten eller fra da
 *    PR-en ble avsluttet, det som kom sist, så en gren som er i bruk igjen,
 *    får stå.
 * 4. Ellers beholdes grenen: det kan være arbeid som ennå ikke har fått en PR.
 */
export function vurderGren(g: Grenvurderingsgrunnlag, { na, hovedgren }: { na: string; hovedgren: string }): Grenvurdering {
  const naTid = tid(na)
  const commit = tid(g.commit_kl)
  const sist_kl = Number.isFinite(commit) ? iso(commit) : null
  const behold = (grunn: string, tidligst_kl: string | null = null): Grenvurdering => ({ gren: g.navn, slett: false, grunn, tidligst_kl, sist_kl })
  const slett = (grunn: string): Grenvurdering => ({ gren: g.navn, slett: true, grunn, tidligst_kl: null, sist_kl })
  const etterFrist = (fra: number, timer: number, grunn: string) => {
    if (!Number.isFinite(fra)) return behold(`${grunn}, men tidspunktet for den siste endringen er ukjent`)
    const frist = fra + timer * TIME
    if (frist <= naTid) return slett(`${grunn}, og ingenting nytt på ${varighet(timer)}`)
    return behold(`${grunn}; slettes tidligst ${tidspunkt(frist)}`, iso(frist))
  }

  const eier = ryddesAvAndre(g.navn, hovedgren)
  if (eier) return behold(`ryddes av ${eier}`)
  if (g.beskyttet) return behold('grenen er beskyttet i GitHub')
  const apne = g.prer.filter((p) => p.tilstand === 'apen')
  if (apne.length > 0) return behold(`en åpen PR kommer fra grenen (${apne.map((p) => `#${p.nummer}`).join(', ')})`)

  if (g.foran === 0) return slett(`ingen commits utover ${hovedgren}`)
  if (g.likPaHovedgrenen === true) return slett(`alt grenen endrer, står likt på ${hovedgren}`)

  if (LIGNER_KURATERINGSGREN.test(g.navn)) {
    return etterFrist(commit, GRENFRISTER.feilNavn, 'navnet ligner en jobb- eller øktgren, men følger ikke mønsteret, så ingen annen opprydding ser grenen')
  }
  const siste = [...g.prer].sort((a, b) => b.nummer - a.nummer)[0]
  if (siste) {
    const fra = Math.max(...[commit, tid(siste.lukket_kl)].filter(Number.isFinite))
    return etterFrist(fra, GRENFRISTER.etterPr, `den siste PR-en fra grenen (#${siste.nummer}) er ${PRTILSTAND[siste.tilstand]}`)
  }
  return behold('ingen PR fra grenen ennå; kan være arbeid som pågår')
}

/** Oversikten over en kjøring. */
export interface Grenoversikt {
  vurderinger: Grenvurdering[]
  slettes: Grenvurdering[]
  beholdes: Grenvurdering[]
  /** Grenene andre oppryddinger eier, som ikke er vurdert her. */
  andres: number
  /** Det som kan tyde på at en gren er glemt. */
  advarsler: string[]
}

const liste = (navn: readonly string[]) => (navn.length <= 3 ? navn.join(', ') : `${navn.slice(0, 3).join(', ')} og ${navn.length - 3} til`)

export function vurderGrener(grener: readonly Grenvurderingsgrunnlag[], valg: { na: string; hovedgren: string; andres: number }): Grenoversikt {
  const vurderinger = grener.map((g) => vurderGren(g, valg)).sort((a, b) => a.gren.localeCompare(b.gren))
  const slettes = vurderinger.filter((v) => v.slett)
  const beholdes = vurderinger.filter((v) => !v.slett)
  const na = tid(valg.na)
  const gamle = beholdes.filter((v) => na - tid(v.sist_kl) > GAMMEL_GREN_DOGN * 24 * TIME)
  const advarsler =
    gamle.length > 0
      ? [`${gamle.length} ${gamle.length === 1 ? 'gren' : 'grener'} uten commits på over ${GAMMEL_GREN_DOGN} døgn er beholdt: ${liste(gamle.map((v) => v.gren))}. Se om de fortsatt trengs.`]
      : []
  return { vurderinger, slettes, beholdes, andres: valg.andres, advarsler }
}

/** Oversikten som Markdown, for kjøringens oppsummering i GitHub Actions. */
export function grenMarkdown(o: Grenoversikt, { kunVis, slettet, alleGrener }: { kunVis: boolean; slettet: ReadonlySet<string>; alleGrener: number }): string {
  const rad = (v: Grenvurdering, handling: string) => `| \`${v.gren}\` | ${handling} | ${v.grunn.replace(/\|/g, '\\|')} |`
  const handling = (v: Grenvurdering) => (!v.slett ? 'beholdt' : kunVis ? 'ville slettet' : slettet.has(v.gren) ? 'slettet' : 'beholdt: endret underveis')
  const antallSlettet = kunVis ? o.slettes.length : o.slettes.filter((v) => slettet.has(v.gren)).length
  const linjer = [
    '## Opprydding av gamle grener',
    '',
    ...(kunVis ? ['**Forhåndsvisning: ingenting er slettet.**', ''] : []),
    `Fant ${alleGrener} grener. ${o.andres} ryddes av egne regler (hovedgrenen, kuratorjobbene og kurateringskøen); ` +
      `av de ${o.vurderinger.length} andre ${kunVis ? 'ville' : 'ble'} ${antallSlettet} ${kunVis ? 'blitt slettet' : 'slettet'}.`,
    '',
    ...o.advarsler.flatMap((a) => [`> **Advarsel:** ${a}`, '']),
    '| Gren | Handling | Hvorfor |',
    '| --- | --- | --- |',
    ...[...o.slettes, ...o.beholdes].map((v) => rad(v, handling(v))),
    '',
  ]
  return linjer.join('\n')
}
