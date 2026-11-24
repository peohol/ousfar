import { penYAkse, velgXSteg } from './figurakser'
import { verdiPaaKurve } from './thcKurver'
import type { BeUrinKurve } from './beUrinModell'
import type { BeUrinSammenligning } from './beUrinMotor'

/**
 * Tallgrunnlaget for figuren i fortolkningen av benzoylekgonin i urin: de to
 * profilene som prosentvis endring fra forrige prøve, 100 · (R − 1), fra 0 %
 * ved dag 0 til tersklene ved d, og denne prøven ved d. Tersklene i enden er
 * nøyaktig motorens, så figuren og konklusjonen leser det samme.
 */

/**
 * Hva en profil er for akkurat disse prøvene: den nedre terskelen skiller
 * «ikke nødvendigvis» fra «kan ikke fastslås», den øvre «kan ikke fastslås»
 * fra nytt inntak. Hvilken profil som er hva, varierer med Q og tid. Med like
 * terskler finnes det ikke noe mellomutfall.
 */
export type BeUrinTerskelrolle = 'nedre' | 'ovre' | 'lik'

/** Rollen hver profil har, i profilenes rekkefølge. */
export function terskelroller(s: BeUrinSammenligning): [BeUrinTerskelrolle, BeUrinTerskelrolle] {
  const [a, b] = s.profiler
  if (a.terskel === b.terskel) return ['lik', 'lik']
  return a.terskel < b.terskel ? ['nedre', 'ovre'] : ['ovre', 'nedre']
}

/** Punkter per profil. */
const OPPLOSNING = 160

export interface BeUrinKurvespor {
  navn: string
  rolle: BeUrinTerskelrolle
  punkter: { dag: number; prosent: number }[]
}

export interface BeUrinGraf {
  xMaks: number
  xSteg: number
  yTopp: number
  yBunn: number
  ySteg: number
  kurver: BeUrinKurvespor[]
}

/** Prosentvis endring for en ratio: 100 · (R − 1). */
export const prosentFor = (ratio: number): number => (ratio - 1) * 100

/**
 * Figuren for sammenligningen mot forrige prøve. `denne` er prosentene for
 * punktene til denne prøven y-aksen skal romme. Bare for d ≥ 1; samme dag
 * har ingen tidsakse å tegne.
 */
export function byggBeUrinGraf(s: BeUrinSammenligning, kurver: readonly BeUrinKurve[], denne: readonly number[]): BeUrinGraf {
  const roller = terskelroller(s)
  const spor = s.profiler.map((p, i) => {
    const kurve = kurver[i]!
    const punkter = []
    for (let n = 0; n <= OPPLOSNING; n++) {
      const dag = (s.dager * n) / OPPLOSNING
      // Endepunktene er motorens: 0 % ved dag 0 og terskelen ved d.
      const ratio = n === 0 ? 1 : n === OPPLOSNING ? p.terskel : verdiPaaKurve(p.tidspunkt + dag, kurve) / s.fra
      punkter.push({ dag, prosent: prosentFor(ratio) })
    }
    return { navn: p.navn, rolle: roller[i]!, punkter }
  })
  const alle = [...spor.flatMap((k) => k.punkter.map((p) => p.prosent)), ...denne]
  return { xMaks: s.dager, xSteg: velgXSteg(s.dager), ...penYAkse(Math.min(...alle), Math.max(0, ...alle)), kurver: spor }
}
