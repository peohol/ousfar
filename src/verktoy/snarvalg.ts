/**
 * Hva hvert verktøy faktisk kan gi nå (VDR-3 i
 * `docs/verktøy-omlegging-2026-11.md`): valgene av virkestoff og formulering
 * som gir en beregning eller godkjent fagtekst. Oversikten og verktøysidene
 * viser dem, så forskriveren ser med en gang hva som kan brukes, og kan velge
 * det med ett klikk.
 *
 * Valgene finnes ved å prøve hvert mulig valg i verktøyet mot
 * {@link tilgjengelighet}, den samme kontrollen siden bruker når noe er valgt.
 * Her avgjøres altså ingenting klinisk: et snarvalg er bare et utfylt valg,
 * og beregningen kontrollerer regel, godkjenning, omfang, FEST og sperrer
 * på nytt som ellers. Et valg tilbys bare som beregnbart når en av reglene
 * kan gi en komplett plan til sluttmålet ({@link komplettfeil}); klinikere
 * får aldri en delplan, så et valg som alltid stopper, ville vært et tomt
 * valg (leveranseplanen §3).
 */
import type { Kildeformulering } from './kartlegging'
import { FORMULERINGSNAVN, virkestoffvalg, type Verktoy, type Verktoyvirkestoff } from './register'
import { komplettfeil, type Regel, type Regelsett } from './regler/modell'
import { usperrede, type Verktoysperre } from './sperrer'
import { medlemFor, REGELSETT, tilgjengelighet, type Valgtvirkestoff, type Verktoyvalg } from './tilgjengelighet'

export interface Snarvalg {
  valg: Verktoyvalg
  /** `tilgjengelig` gir en beregning, `fagtekst` bare godkjent fagtekst. */
  status: 'tilgjengelig' | 'fagtekst'
  /** «Vortioksetin», «Sertralin → mirtazapin» eller «Aripiprazol: peroral → depotinjeksjon». */
  tekst: string
  /** Reglene valget gir beregning eller fagtekst etter, så en nødstopp kan holde det utenfor ({@link utenSperrede}). */
  regler: Pick<Regel, 'id'>[]
}

type Valgbar = { v: Verktoyvirkestoff; valgt: Valgtvirkestoff }

/** Hvert virkestoff i verktøyet i hver formulering kilden har det i. */
const valgbare = (verktoy: Verktoy): Valgbar[] =>
  virkestoffvalg(verktoy).flatMap((v) => v.formuleringer.map((formulering: Kildeformulering) => ({ v, valgt: { nokkel: v.nokkel, formulering } })))

const form = (f: Kildeformulering) => FORMULERINGSNAVN[f].toLowerCase()

/** Navnet, med formuleringen når virkestoffet har flere. */
const navn = (v: Verktoyvirkestoff, f: Kildeformulering) => (v.formuleringer.length > 1 ? `${v.navn} (${form(f)})` : v.navn)

/** Et bytte innen samme virkestoff sier bare formuleringene: «Aripiprazol: peroral → depotinjeksjon». */
const byttetekst = (fra: Valgbar, til: Valgbar) =>
  fra.v.nokkel === til.v.nokkel
    ? `${fra.v.navn}: ${form(fra.valgt.formulering)} → ${form(til.valgt.formulering)}`
    : `${navn(fra.v, fra.valgt.formulering)} → ${navn(til.v, til.valgt.formulering).toLowerCase()}`

const lagret = new WeakMap<Regelsett, Map<string, Snarvalg[]>>()

/** Valgene som gir en beregning, deretter dem som bare gir fagtekst, i navnenes rekkefølge. */
export function snarvalg(verktoy: Verktoy, regelsett: Regelsett = REGELSETT): Snarvalg[] {
  const perVerktoy = lagret.get(regelsett) ?? new Map<string, Snarvalg[]>()
  lagret.set(regelsett, perVerktoy)
  const funnet = perVerktoy.get(verktoy.id)
  if (funnet) return funnet

  const alle = valgbare(verktoy)
  const par =
    verktoy.type === 'seponering'
      ? alle.map((fra) => ({ valg: { fra: fra.valgt }, tekst: navn(fra.v, fra.valgt.formulering) }))
      : alle.flatMap((fra) => alle.map((til) => ({ valg: { fra: fra.valgt, til: til.valgt }, tekst: byttetekst(fra, til) })))
  const rang = { tilgjengelig: 0, fagtekst: 1 } as const
  const ut = par
    .flatMap(({ valg, tekst }): Snarvalg[] => {
      const t = tilgjengelighet(verktoy, valg, regelsett)
      const regler = t.status === 'tilgjengelig' ? t.regler.filter((r) => komplettfeil(r, medlemFor(r, valg)).length === 0) : t.regler
      return (t.status === 'tilgjengelig' && regler.length > 0) || t.status === 'fagtekst' ? [{ valg, status: t.status, tekst, regler: regler.map((r) => ({ id: r.id })) }] : []
    })
    .sort((a, b) => rang[a.status] - rang[b.status] || a.tekst.localeCompare(b.tekst, 'nb'))
  perVerktoy.set(verktoy.id, ut)
  return ut
}

/**
 * Snarvalgene som ikke er stanset av en aktiv nødstopp: et valg der hver regel
 * er sperret (for regelen, verktøyet eller alle), tilbys ikke som tilgjengelig.
 * Sperrene kontrolleres uansett på nytt når noe beregnes.
 */
export const utenSperrede = (valg: readonly Snarvalg[], sperrer: readonly Verktoysperre[], verktoy: Pick<Verktoy, 'id'>): Snarvalg[] =>
  valg.filter((s) => usperrede(sperrer, verktoy, s.regler).length > 0)

/** Hva et verktøy kan gi nå, i én setning til oversikten og verktøysiden (P11 i `docs/verktøy-brukervennlighet-2026-11.md`). */
export interface Verktoystatus {
  /** Om minst ett valg kan gi en komplett plan nå. */
  kanGiPlan: boolean
  tekst: string
  /** Valgene som kan gi en komplett plan, uten dem en nødstopp holder utenfor. */
  valg: Snarvalg[]
}

const navneliste = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} og ${xs.at(-1)}`)

/**
 * Hva verktøyet kan gi nå: «Komplett plan kan lages for escitalopram»,
 * «Ingen komplett plan er godkjent ennå» eller at verktøyet er deaktivert.
 * Det samme utvalget som snarvalgene, så teksten aldri lover mer enn
 * beregningen kan gi; alt kontrolleres på nytt når noe beregnes.
 */
export function verktoystatus(verktoy: Verktoy, sperrer: readonly Verktoysperre[], regelsett: Regelsett = REGELSETT): Verktoystatus {
  const alle = snarvalg(verktoy, regelsett).filter((s) => s.status === 'tilgjengelig')
  const valg = utenSperrede(alle, sperrer, verktoy)
  if (valg.length > 0) return { kanGiPlan: true, tekst: `Komplett plan kan lages for ${navneliste(valg.map((s) => s.tekst))}.`, valg }
  if (alle.length > 0) return { kanGiPlan: false, tekst: 'Verktøyet er midlertidig deaktivert. Ingen plan kan lages nå.', valg }
  return { kanGiPlan: false, tekst: 'Ingen komplett plan er godkjent ennå.', valg }
}
