/**
 * GitHubs REST-API med arbeidsflytens nøkkel, for oppryddingene av grener
 * (`src/kuratorjobb/ryddekjoring.ts`, `src/grenrydding/kjoring.ts`). Her står
 * bare det de deler: kallet og grenene. Slettingen går gjennom git, så den
 * krever at grenen står uendret (`./gitslett`).
 */

/** Ett kall mot repoet (en tom sti er selve repoet); `null` for 404 og 204. */
export type Restkall = (sti: string, metode?: string) => Promise<unknown>

export interface Grenhode {
  navn: string
  sha: string
  beskyttet: boolean
}

export function githubRest(repo: string, token: string, hent: typeof fetch = fetch): Restkall {
  const hode = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' }
  return async (sti, metode = 'GET') => {
    const svar = await hent(`https://api.github.com/repos/${repo}${sti ? `/${sti}` : ''}`, { method: metode, headers: hode })
    if (svar.status === 404) return null
    if (!svar.ok) throw new Error(`GitHub svarte ${svar.status} på ${metode} ${sti.split('?')[0]}.`)
    return svar.status === 204 ? null : svar.json()
  }
}

/** Alle grenene i repoet, med commiten hver peker på. */
export async function alleGrener(api: Restkall): Promise<Grenhode[]> {
  const ut: Grenhode[] = []
  for (let side = 1; ; side += 1) {
    const rader = await api(`branches?per_page=100&page=${side}`)
    if (!Array.isArray(rader)) throw new Error('Fikk ingen gyldig liste over grenene.')
    for (const r of rader as { name: string; commit: { sha: string }; protected?: boolean }[]) ut.push({ navn: r.name, sha: r.commit.sha, beskyttet: r.protected === true })
    if (rader.length < 100) return ut
    if (side === 30) throw new Error('Over 3000 grener: avbryter for sikkerhets skyld.')
  }
}

/** Én gren nå, med tidspunktet for commiten; `null` når den er borte. */
export async function grenNa(api: Restkall, navn: string): Promise<{ sha: string; commit_kl: string | null } | null> {
  // Hele navnet er én parameter i GitHubs API, også skråstreken.
  const r = (await api(`branches/${encodeURIComponent(navn)}`)) as { commit?: { sha?: string; commit?: { committer?: { date?: string } } } } | null
  if (!r?.commit?.sha) return null
  return { sha: r.commit.sha, commit_kl: r.commit.commit?.committer?.date ?? null }
}

/** En PR mot repoet, med grenen den kommer fra (`null` fra et annet repo) og grenen den skal inn i. */
export interface Prgren {
  nummer: number
  gren: string | null
  base: string | null
  tilstand: 'apen' | 'lukket' | 'sammenslatt'
  /** Når PR-en ble lukket eller slått sammen. */
  lukket_kl: string | null
}

const MAKS_PRSIDER = 100

/**
 * PR-ene mot repoet, alle sider. Feiler i stedet for å gi en ufullstendig
 * liste: et svar som ikke er en liste (også 404), eller flere sider enn
 * grensen. Oppryddingene bruker den til å beholde grener i bruk, så den må
 * feile lukket.
 */
export async function lesPrer(api: Restkall, repo: string, tilstand: 'all' | 'open'): Promise<Prgren[]> {
  const tekst = (v: unknown) => (typeof v === 'string' ? v : null)
  const ut: Prgren[] = []
  for (let side = 1; side <= MAKS_PRSIDER; side += 1) {
    const rader = await api(`pulls?state=${tilstand}&per_page=100&page=${side}`)
    if (!Array.isArray(rader)) throw new Error('Fikk ingen gyldig liste over PR-ene.')
    for (const r of rader as Record<string, unknown>[]) {
      if (typeof r.number !== 'number') throw new Error('Fikk en PR uten nummer.')
      const head = r.head as { ref?: unknown; repo?: { full_name?: unknown } | null } | undefined
      ut.push({
        nummer: r.number,
        // En PR fra et annet repo kommer ikke fra en gren her, men kan skulle inn i en.
        gren: head?.repo?.full_name === repo ? tekst(head.ref) : null,
        base: tekst((r.base as Record<string, unknown> | undefined)?.ref),
        tilstand: r.merged_at ? 'sammenslatt' : r.state === 'closed' ? 'lukket' : 'apen',
        lukket_kl: tekst(r.closed_at),
      })
    }
    if (rader.length < 100) return ut
  }
  throw new Error(`Over ${MAKS_PRSIDER * 100} PR-er: avbryter for sikkerhets skyld.`)
}

/** Grenene i repoet åpne PR-er kommer fra eller skal inn i. */
export const grenerIBruk = (prer: readonly Prgren[]): Set<string> =>
  new Set(prer.filter((p) => p.tilstand === 'apen').flatMap((p) => [p.gren, p.base].filter((g): g is string => g !== null)))
