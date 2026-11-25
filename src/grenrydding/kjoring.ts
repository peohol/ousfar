/**
 * Én kjøring av oppryddingen av gamle grener (`docs/grenrydding.md`): henter
 * grenene, PR-ene og hva hver gren endrer, vurderer grenene etter reglene i
 * `./regler`, og sletter dem som kan slettes. GitHub kommer inn utenfra, så
 * kjøringen kan prøves uten nettverk.
 *
 * Alt leses før noe slettes. Feiler en lesing, stopper kjøringen uten å slette
 * noe. En gren som er endret siden den ble vurdert, slettes ikke.
 */
import { alleGrener, githubRest, grenNa, slettGren, type Grenhode } from '../github/rest'
import { ryddesAvAndre, vurderGrener, type Grenoversikt, type Grenvurderingsgrunnlag, type Prinfo } from './regler'

/** Én fil grenen endrer, fra der den skilte lag med hovedgrenen. */
export interface Filendring {
  sti: string
  /** GitHubs `status`: `added`, `modified`, `removed`, `renamed` … */
  status: string
  /** Blob-SHA-en filen har på grenen. */
  sha: string | null
  /** Det gamle navnet, for en fil som har fått nytt navn. */
  forrige: string | null
}

export interface Sammenligning {
  /** Commits på grenen som ikke står på hovedgrenen. */
  foran: number
  /** Filene grenen endrer, eller `null` når GitHub ikke gir alle. */
  filer: Filendring[] | null
}

/** Det kjøringen trenger fra GitHub. */
export interface Grengithub {
  hovedgren(): Promise<string>
  grener(): Promise<Grenhode[]>
  /** Én gren nå, med tidspunktet for commiten; `null` når den er borte. */
  gren(navn: string): Promise<{ sha: string; commit_kl: string | null } | null>
  /** Alle PR-ene fra grener i dette repoet. */
  prer(): Promise<(Prinfo & { gren: string })[]>
  /** Grenens commit mot hovedgrenens; `null` når de ikke har noe felles. */
  sammenlign(base: string, sha: string): Promise<Sammenligning | null>
  /** Filene i commiten, sti → blob-SHA; `null` når GitHub ikke gir alle. */
  tre(sha: string): Promise<ReadonlyMap<string, string> | null>
  slett(navn: string): Promise<void>
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
  alleGrener: number
}

/** Om alt grenen endrer, står likt på hovedgrenen: hver fil med samme innhold, og hver fil den fjerner, borte. */
export function likPaHovedgrenen(filer: readonly Filendring[] | null, tre: ReadonlyMap<string, string> | null): boolean | null {
  if (!filer || !tre) return null
  return filer.every((f) => {
    if (f.status === 'removed') return !tre.has(f.sti)
    if (f.status === 'renamed' && f.forrige && tre.has(f.forrige)) return false
    return f.sha !== null && tre.get(f.sti) === f.sha
  })
}

export async function kjorGrenrydding({ github, kunVis, na, logg = console.log }: Grenryddevalg): Promise<Grenryddeutfall> {
  const hovedgren = await github.hovedgren()
  const [alle, prer] = await Promise.all([github.grener(), github.prer()])
  const hoved = alle.find((g) => g.navn === hovedgren)
  if (!hoved) throw new Error(`Fant ikke hovedgrenen ${hovedgren}. Ingen grener slettes.`)
  const egne = alle.filter((g) => !ryddesAvAndre(g.navn, hovedgren))

  let tre: Promise<ReadonlyMap<string, string> | null> | null = null
  const grunnlag: (Grenvurderingsgrunnlag & { sha: string })[] = []
  for (const g of egne) {
    const grenensPr = prer.filter((p) => p.gren === g.navn).map(({ nummer, tilstand, lukket_kl }) => ({ nummer, tilstand, lukket_kl }))
    const [detaljer, sammenligning] = await Promise.all([github.gren(g.navn), github.sammenlign(hoved.sha, g.sha)])
    if (!detaljer) continue // Slettet av noen andre underveis.
    let lik: boolean | null = null
    if (sammenligning && sammenligning.foran > 0) {
      tre ??= github.tre(hoved.sha)
      lik = likPaHovedgrenen(sammenligning.filer, await tre)
    }
    grunnlag.push({
      navn: g.navn,
      sha: g.sha,
      beskyttet: g.beskyttet,
      commit_kl: detaljer.sha === g.sha ? detaljer.commit_kl : null,
      foran: sammenligning?.foran ?? null,
      likPaHovedgrenen: lik,
      prer: grenensPr,
    })
  }

  const oversikt = vurderGrener(grunnlag, { na, hovedgren, andres: alle.length - egne.length })
  const slettet = new Set<string>()
  for (const v of oversikt.slettes) {
    if (kunVis) {
      logg(`VILLE SLETTET: ${v.gren} (${v.grunn})`)
      continue
    }
    const sha = grunnlag.find((g) => g.navn === v.gren)!.sha
    const nyss = await github.gren(v.gren)
    if (!nyss || nyss.sha !== sha) {
      logg(`BEHOLDT: ${v.gren} (endret underveis)`)
      continue
    }
    await github.slett(v.gren)
    slettet.add(v.gren)
    logg(`SLETTET: ${v.gren} (${v.grunn})`)
  }
  for (const v of oversikt.beholdes) logg(`BEHOLDT: ${v.gren} (${v.grunn})`)
  for (const a of oversikt.advarsler) logg(`ADVARSEL: ${a}`)
  return { oversikt, slettet, alleGrener: alle.length }
}

type Rad = Record<string, unknown>
const tekst = (v: unknown) => (typeof v === 'string' ? v : null)

/** GitHub gir høyst så mange filer i en sammenligning; flere betyr at listen er ufullstendig. */
const MAKS_FILER = 300

/** `Grengithub` gjennom GitHubs REST-API med arbeidsflytens nøkkel. */
export function lagGrengithub(repo: string, token: string, hent: typeof fetch = fetch): Grengithub {
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
    async prer() {
      const ut: (Prinfo & { gren: string })[] = []
      for (let side = 1; ; side += 1) {
        const rader = await api(`pulls?state=all&per_page=100&page=${side}`)
        if (!Array.isArray(rader)) throw new Error('Fikk ingen gyldig liste over PR-ene.')
        for (const r of rader as Rad[]) {
          const head = r.head as { ref?: unknown; repo?: { full_name?: unknown } | null } | undefined
          const gren = tekst(head?.ref)
          if (head?.repo?.full_name !== repo || !gren || typeof r.number !== 'number') continue
          const tilstand: Prinfo['tilstand'] = r.merged_at ? 'sammenslatt' : r.state === 'closed' ? 'lukket' : 'apen'
          ut.push({ nummer: r.number, gren, tilstand, lukket_kl: tekst(r.closed_at) })
        }
        if (rader.length < 100) return ut
        if (side === 100) throw new Error('Over 10 000 PR-er: avbryter for sikkerhets skyld.')
      }
    },
    async sammenlign(base, sha) {
      // Én commit per side: filene står uansett på første side.
      const r = (await api(`compare/${base}...${sha}?per_page=1`)) as Rad | null
      if (!r || typeof r.ahead_by !== 'number') return null
      const filer = Array.isArray(r.files) && r.files.length < MAKS_FILER ? (r.files as Rad[]) : null
      return {
        foran: r.ahead_by,
        filer: filer?.map((f) => ({ sti: tekst(f.filename) ?? '', status: tekst(f.status) ?? '', sha: tekst(f.sha), forrige: tekst(f.previous_filename) })) ?? null,
      }
    },
    async tre(sha) {
      const r = (await api(`git/trees/${sha}?recursive=1`)) as { tree?: { path?: unknown; sha?: unknown; type?: unknown }[]; truncated?: unknown } | null
      if (!r || r.truncated !== false || !Array.isArray(r.tree)) return null
      return new Map(r.tree.filter((e) => e.type !== 'tree' && typeof e.path === 'string' && typeof e.sha === 'string').map((e) => [e.path as string, e.sha as string]))
    },
    async slett(navn) {
      if (!hovedgren) throw new Error('Hovedgrenen er ikke lest; sletter ingenting.')
      const eier = ryddesAvAndre(navn, hovedgren)
      if (eier) throw new Error(`Sletter ikke ${navn}: den ryddes av ${eier}.`)
      await slettGren(api, navn)
    },
  }
}
