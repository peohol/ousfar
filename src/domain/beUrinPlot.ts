import { penYAkse, velgDognsteg } from './figurakser'
import { verdiPaaKurve } from './thcKurver'
import type { BeUrinKurve } from './beUrinModell'
import type { BeUrinSammenligning } from './beUrinMotor'
import { ratioEtter, type BeUrinProfilsammenligning, type BeUrinRolle } from './beUrinProfiler'

/**
 * Tallgrunnlaget for figuren i fortolkningen av benzoylekgonin i urin:
 * profilene som prosentvis endring fra forrige prøve, 100 · (R − 1), fra 0 %
 * ved dag 0 til tersklene ved d, og denne prøven ved d. Tersklene i enden er
 * nøyaktig motorens, så figuren og vurderingen leser det samme. Form 1 har to
 * profiler ({@link byggBeUrinGraf}), form 2 fem ({@link byggProfilgraf}).
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

export interface BeUrinKurvespor<R = BeUrinTerskelrolle> {
  navn: string
  rolle: R
  punkter: { dag: number; prosent: number }[]
}

export interface BeUrinGraf<R = BeUrinTerskelrolle> {
  xMaks: number
  xSteg: number
  yTopp: number
  yBunn: number
  ySteg: number
  kurver: BeUrinKurvespor<R>[]
}

/** Prosentvis endring for en ratio: 100 · (R − 1). */
export const prosentFor = (ratio: number): number => (ratio - 1) * 100

/** Punktene for én profil over `dager` døgn: 0 % ved dag 0 og motorens terskel ved d. */
function punkterFor(dager: number, terskel: number, ratio: (dag: number) => number) {
  const punkter = []
  for (let n = 0; n <= OPPLOSNING; n++) {
    const dag = (dager * n) / OPPLOSNING
    punkter.push({ dag, prosent: prosentFor(n === 0 ? 1 : n === OPPLOSNING ? terskel : ratio(dag)) })
  }
  return punkter
}

/** Aksene for sporene og punktene til denne prøven. */
function grafFor<R>(dager: number, spor: BeUrinKurvespor<R>[], denne: readonly number[]): BeUrinGraf<R> {
  const alle = [...spor.flatMap((k) => k.punkter.map((p) => p.prosent)), ...denne]
  return { xMaks: dager, xSteg: velgDognsteg(dager), ...penYAkse(Math.min(...alle), Math.max(0, ...alle)), kurver: spor }
}

/**
 * Figuren for sammenligningen mot forrige prøve (form 1). `denne` er
 * prosentene for punktene til denne prøven y-aksen skal romme. Bare for
 * d ≥ 1; samme dag har ingen tidsakse å tegne.
 */
export function byggBeUrinGraf(s: BeUrinSammenligning, kurver: readonly BeUrinKurve[], denne: readonly number[]): BeUrinGraf {
  const roller = terskelroller(s)
  const spor = s.profiler.map((p, i) => {
    const kurve = kurver[i]!
    return {
      navn: p.navn,
      rolle: roller[i]!,
      punkter: punkterFor(s.dager, p.terskel, (dag) => verdiPaaKurve(p.tidspunkt + dag, kurve) / s.fra),
    }
  })
  return grafFor(s.dager, spor, denne)
}

/**
 * Figuren med alle fem profilene (form 2), med navnene de har i denne
 * sammenligningen. Bare for d ≥ 1.
 */
export function byggProfilgraf(s: BeUrinProfilsammenligning, navn: Record<BeUrinRolle, string>, denne: readonly number[]): BeUrinGraf<BeUrinRolle> {
  const spor = s.profiler.map((p) => ({
    navn: navn[p.rolle],
    rolle: p.rolle,
    punkter: punkterFor(s.dager, p.terskel, (dag) => ratioEtter(p, s.fra, dag)),
  }))
  return grafFor(s.dager, spor, denne)
}
