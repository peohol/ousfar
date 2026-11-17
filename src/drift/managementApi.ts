/**
 * Supabase Management API for driftsskriptene i GitHub Actions
 * (`scripts/db-maling.ts`, `scripts/gruppechat-lagringstid.ts`). Trenger
 * `SUPABASE_ACCESS_TOKEN`; `SUPABASE_PROJECT_REF` velger et annet prosjekt enn
 * produksjonen.
 */

export const PROSJEKT = process.env.SUPABASE_PROJECT_REF || 'jfzqowsmjtthpbipnxnf'
const API = `https://api.supabase.com/v1/projects/${PROSJEKT}`

/** `fetch` med tidsfrist, og ett nytt forsøk etter en serverfeil eller et brudd. */
export async function hent(url: string, init: RequestInit = {}, forsok = 2): Promise<Response> {
  for (let i = 1; ; i++) {
    try {
      const svar = await fetch(url, { ...init, signal: AbortSignal.timeout(60_000) })
      if (svar.ok || i >= forsok || svar.status < 500) return svar
    } catch (feil) {
      if (i >= forsok) throw feil
    }
    await new Promise((r) => setTimeout(r, 3000))
  }
}

function token(): string {
  const t = process.env.SUPABASE_ACCESS_TOKEN
  if (!t) throw new Error('SUPABASE_ACCESS_TOKEN må være satt.')
  return t
}

/** Et kall til prosjektet i Management API; `sti` begynner med `/`. */
export async function management<T>(sti: string, init: RequestInit = {}): Promise<T> {
  const svar = await hent(`${API}${sti}`, {
    ...init,
    headers: { Authorization: `Bearer ${token()}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  })
  if (!svar.ok) throw new Error(`${sti.split('?')[0]} svarte ${svar.status}: ${(await svar.text()).slice(0, 300)}`)
  return (await svar.json()) as T
}

/**
 * En spørring mot databasen. Skrivebeskyttet med mindre `skriver` er satt;
 * den skal bare brukes for en avgrenset, kjent operasjon.
 */
export async function sql<T>(sporring: string, { skriver = false }: { skriver?: boolean } = {}): Promise<T[]> {
  return management<T[]>('/database/query', { method: 'POST', body: JSON.stringify({ query: sporring, read_only: !skriver }) })
}
