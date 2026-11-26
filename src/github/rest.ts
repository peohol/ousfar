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
