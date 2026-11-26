/**
 * Én kjøring av oppryddingen av gamle grener (`docs/grenrydding.md`): henter
 * grenene, PR-ene og hva hver gren endrer, vurderer grenene etter reglene i
 * `./regler`, og sletter dem som kan slettes. GitHub kommer inn utenfra, så
 * kjøringen kan prøves uten nettverk.
 *
 * Alt leses før noe slettes. Feiler en lesing, stopper kjøringen uten å slette
 * noe. Slettingen går gjennom `../github/slettrunde`: de åpne PR-ene leses på
 * nytt rett før hver sletting, grenen slettes bare om den står på commiten som
 * ble vurdert, og en feil stopper runden.
 */
import type { Grensletter, Slettutfall } from '../github/gitslett'
import { alleGrener, githubRest, grenerIBruk, grenNa, lesPrer, type Grenhode, type Prgren } from '../github/rest'
import { slettRunde } from '../github/slettrunde'
import { ryddesAvAndre, vurderGrener, type Grenoversikt, type Grenvurderingsgrunnlag } from './regler'

export type Pr = Prgren

export interface Sammenligning {
  /** Commits på grenen som ikke står på hovedgrenen. */
  foran: number
  /** Commiten der grenen skilte lag med hovedgrenen. */
  skillepunkt: string | null
}

/** Filene i en commit: sti → «modus type sha» for hver fil, lenke og undermodul (ikke mappene). */
export type Filtre = ReadonlyMap<string, string>

/** Det kjøringen trenger fra GitHub. */
export interface Grengithub {
  hovedgren(): Promise<string>
  grener(): Promise<Grenhode[]>
  /** Én gren nå, med tidspunktet for commiten; `null` når den er borte. */
  gren(navn: string): Promise<{ sha: string; commit_kl: string | null } | null>
  /** Alle PR-ene mot dette repoet. Feiler heller enn å gi en ufullstendig liste. */
  prer(): Promise<Pr[]>
  /** De åpne PR-ene nå, på samme måte. */
  apnePr(): Promise<Pr[]>
  /** Grenens commit mot hovedgrenens; `null` når de ikke har noe felles. */
  sammenlign(base: string, sha: string): Promise<Sammenligning | null>
  /** Filene i commiten; `null` når GitHub ikke gir alle. */
  tre(sha: string): Promise<Filtre | null>
  /** Sletter grenen bare om den fortsatt står på commiten; kaster ved en driftsfeil. */
  slett(navn: string, sha: string): Promise<Slettutfall>
}

export interface Grenryddevalg {
  github: Grengithub
  kunVis: boolean
  na: string
  logg?: (linje: string) => void
}

export interface Grenryddeutfall {
  oversikt: Grenoversikt
  slettet: Set<string>
  /** Grener reglene ville slettet, men som ble beholdt fordi noe endret seg underveis, med hvorfor. */
  underveis: Map<string, string>
  /** Feilen som stoppet slettingen, eller `null`. */
  feil: string | null
  alleGrener: number
}

/**
 * Om alt grenen endrer fra skillepunktet, står likt på hovedgrenen: hver sti
 * der grenen avviker fra skillepunktet (innhold, type eller modus, også en
 * fil som er fjernet), er nøyaktig som på grenen på hovedgrenen. `null` når et
 * av trærne mangler.
 */
export function likPaHovedgrenen(skillepunkt: Filtre | null, gren: Filtre | null, hoved: Filtre | null): boolean | null {
  if (!skillepunkt || !gren || !hoved) return null
  for (const sti of new Set([...skillepunkt.keys(), ...gren.keys()])) {
    if (skillepunkt.get(sti) !== gren.get(sti) && hoved.get(sti) !== gren.get(sti)) return false
  }
  return true
}

export async function kjorGrenrydding({ github, kunVis, na, logg = console.log }: Grenryddevalg): Promise<Grenryddeutfall> {
  const hovedgren = await github.hovedgren()
  const [alle, prer] = await Promise.all([github.grener(), github.prer()])
  const hoved = alle.find((g) => g.navn === hovedgren)
  if (!hoved) throw new Error(`Fant ikke hovedgrenen ${hovedgren}. Ingen grener slettes.`)
  const egne = alle.filter((g) => !ryddesAvAndre(g.navn, hovedgren))

  let hovedtre: Promise<Filtre | null> | null = null
  const grunnlag: (Grenvurderingsgrunnlag & { sha: string })[] = []
  for (const g of egne) {
    const [detaljer, sammenligning] = await Promise.all([github.gren(g.navn), github.sammenlign(hoved.sha, g.sha)])
    if (!detaljer) continue // Slettet av noen andre underveis.
    let lik: boolean | null = null
    if (sammenligning && sammenligning.foran > 0 && sammenligning.skillepunkt) {
      hovedtre ??= github.tre(hoved.sha)
      const [skille, egen, hovedet] = await Promise.all([github.tre(sammenligning.skillepunkt), github.tre(g.sha), hovedtre])
      lik = likPaHovedgrenen(skille, egen, hovedet)
    }
    grunnlag.push({
      navn: g.navn,
      sha: g.sha,
      beskyttet: g.beskyttet,
      commit_kl: detaljer.sha === g.sha ? detaljer.commit_kl : null,
      foran: sammenligning?.foran ?? null,
      likPaHovedgrenen: lik,
      prer: prer.filter((p) => p.gren === g.navn).map(({ nummer, tilstand, lukket_kl }) => ({ nummer, tilstand, lukket_kl })),
      baseFor: prer.filter((p) => p.tilstand === 'apen' && p.base === g.navn).map((p) => p.nummer),
    })
  }

  const oversikt = vurderGrener(grunnlag, { na, hovedgren, andres: alle.length - egne.length })
  const runde = await slettRunde({
    grener: oversikt.slettes.map((v) => ({ gren: v.gren, sha: grunnlag.find((g) => g.navn === v.gren)!.sha, grunn: v.grunn })),
    kunVis,
    iBruk: async () => grenerIBruk(await github.apnePr()),
    slett: (gren, sha) => github.slett(gren, sha),
    logg,
  })
  for (const v of oversikt.beholdes) logg(`BEHOLDT: ${v.gren} (${v.grunn})`)
  for (const a of oversikt.advarsler) logg(`ADVARSEL: ${a}`)
  return { oversikt, ...runde, alleGrener: alle.length }
}

type Rad = Record<string, unknown>
const tekst = (v: unknown) => (typeof v === 'string' ? v : null)

/** `Grengithub` gjennom GitHubs REST-API med arbeidsflytens nøkkel; slettingen gjennom git. */
export function lagGrengithub(repo: string, token: string, sletter: Grensletter, hent: typeof fetch = fetch): Grengithub {
  const api = githubRest(repo, token, hent)
  let hovedgren: string | null = null
  return {
    async hovedgren() {
      const r = (await api('')) as Rad | null
      hovedgren = tekst(r?.default_branch)
      if (!hovedgren) throw new Error('Fant ikke hovedgrenen til repoet.')
      return hovedgren
    },
    grener: () => alleGrener(api),
    gren: (navn) => grenNa(api, navn),
    prer: () => lesPrer(api, repo, 'all'),
    apnePr: () => lesPrer(api, repo, 'open'),
    async sammenlign(base, sha) {
      // Én commit per side: bare tallet og skillepunktet trengs.
      const r = (await api(`compare/${base}...${sha}?per_page=1`)) as Rad | null
      if (!r || typeof r.ahead_by !== 'number') return null
      return { foran: r.ahead_by, skillepunkt: tekst((r.merge_base_commit as Rad | undefined)?.sha) }
    },
    async tre(sha) {
      const r = (await api(`git/trees/${sha}?recursive=1`)) as { tree?: Rad[]; truncated?: unknown } | null
      if (!r || r.truncated !== false || !Array.isArray(r.tree)) return null
      const ut = new Map<string, string>()
      for (const e of r.tree) {
        if (e.type === 'tree') continue
        if (typeof e.path !== 'string' || typeof e.mode !== 'string' || typeof e.type !== 'string' || typeof e.sha !== 'string') return null
        ut.set(e.path, `${e.mode} ${e.type} ${e.sha}`)
      }
      return ut
    },
    async slett(navn, sha) {
      if (!hovedgren) throw new Error('Hovedgrenen er ikke lest; sletter ingenting.')
      const eier = ryddesAvAndre(navn, hovedgren)
      if (eier) throw new Error(`Sletter ikke ${navn}: den ryddes av ${eier}.`)
      return sletter(navn, sha)
    },
  }
}
