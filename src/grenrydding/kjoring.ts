/**
 * Én kjøring av oppryddingen av gamle grener (`docs/grenrydding.md`): henter
 * grenene, PR-ene og hva hver gren endrer, vurderer grenene etter reglene i
 * `./regler`, og sletter dem som kan slettes. GitHub kommer inn utenfra, så
 * kjøringen kan prøves uten nettverk.
 *
 * Alt leses før noe slettes. Feiler en lesing, stopper kjøringen uten å slette
 * noe. Rett før hver sletting leses de åpne PR-ene på nytt, og grenen slettes
 * bare om den fortsatt står på commiten som ble vurdert (`../github/gitslett`).
 */
import type { Grensletter } from '../github/gitslett'
import { alleGrener, githubRest, grenNa, type Grenhode } from '../github/rest'
import { ryddesAvAndre, vurderGrener, type Grenoversikt, type Grenvurderingsgrunnlag, type Prinfo } from './regler'

/** En PR, med grenen den kommer fra (`null` fra et annet repo) og grenen den skal inn i. */
export interface Pr extends Prinfo {
  gren: string | null
  base: string | null
}

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
  /** Alle PR-ene mot dette repoet. */
  prer(): Promise<Pr[]>
  /** De åpne PR-ene nå. */
  apnePr(): Promise<Pr[]>
  /** Grenens commit mot hovedgrenens; `null` når de ikke har noe felles. */
  sammenlign(base: string, sha: string): Promise<Sammenligning | null>
  /** Filene i commiten; `null` når GitHub ikke gir alle. */
  tre(sha: string): Promise<Filtre | null>
  /** Sletter grenen bare om den fortsatt står på commiten; `false` ellers. */
  slett(navn: string, sha: string): Promise<boolean>
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

const iBruk = (prer: readonly Pr[], navn: string) => prer.filter((p) => p.tilstand === 'apen' && (p.gren === navn || p.base === navn))

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
  const slettet = new Set<string>()
  const underveis = new Map<string, string>()
  for (const v of oversikt.slettes) {
    if (kunVis) {
      logg(`VILLE SLETTET: ${v.gren} (${v.grunn})`)
      continue
    }
    const sha = grunnlag.find((g) => g.navn === v.gren)!.sha
    // En PR åpnet eller gjenåpnet etter den første lesingen endrer ikke grenens commit; derfor leses de på nytt.
    const grunn = iBruk(await github.apnePr(), v.gren).length > 0 ? 'en PR ble åpnet underveis' : (await github.slett(v.gren, sha)) ? null : 'endret underveis'
    if (grunn) {
      underveis.set(v.gren, grunn)
      logg(`BEHOLDT: ${v.gren} (${grunn})`)
      continue
    }
    slettet.add(v.gren)
    logg(`SLETTET: ${v.gren} (${v.grunn})`)
  }
  for (const v of oversikt.beholdes) logg(`BEHOLDT: ${v.gren} (${v.grunn})`)
  for (const a of oversikt.advarsler) logg(`ADVARSEL: ${a}`)
  return { oversikt, slettet, underveis, alleGrener: alle.length }
}

type Rad = Record<string, unknown>
const tekst = (v: unknown) => (typeof v === 'string' ? v : null)

/** `Grengithub` gjennom GitHubs REST-API med arbeidsflytens nøkkel; slettingen gjennom git. */
export function lagGrengithub(repo: string, token: string, sletter: Grensletter, hent: typeof fetch = fetch): Grengithub {
  const api = githubRest(repo, token, hent)
  let hovedgren: string | null = null
  const lesPrer = async (tilstand: 'all' | 'open') => {
    const ut: Pr[] = []
    for (let side = 1; ; side += 1) {
      const rader = await api(`pulls?state=${tilstand}&per_page=100&page=${side}`)
      if (!Array.isArray(rader)) throw new Error('Fikk ingen gyldig liste over PR-ene.')
      for (const r of rader as Rad[]) {
        if (typeof r.number !== 'number') continue
        const head = r.head as { ref?: unknown; repo?: { full_name?: unknown } | null } | undefined
        ut.push({
          nummer: r.number,
          // En PR fra et annet repo kommer ikke fra en gren her, men kan skulle inn i en.
          gren: head?.repo?.full_name === repo ? tekst(head.ref) : null,
          base: tekst((r.base as Rad | undefined)?.ref),
          tilstand: r.merged_at ? 'sammenslatt' : r.state === 'closed' ? 'lukket' : 'apen',
          lukket_kl: tekst(r.closed_at),
        })
      }
      if (rader.length < 100) return ut
      if (side === 100) throw new Error('Over 10 000 PR-er: avbryter for sikkerhets skyld.')
    }
  }
  return {
    async hovedgren() {
      const r = (await api('')) as Rad | null
      hovedgren = tekst(r?.default_branch)
      if (!hovedgren) throw new Error('Fant ikke hovedgrenen til repoet.')
      return hovedgren
    },
    grener: () => alleGrener(api),
    gren: (navn) => grenNa(api, navn),
    prer: () => lesPrer('all'),
    apnePr: () => lesPrer('open'),
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
