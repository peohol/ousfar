/**
 * Tilgangen kopijobben får til produksjonsprosjektet, med minst mulig makt
 * og uten et fast databasepassord (`docs/drift-gjenoppretting.md`, «Kopiene i
 * drift»):
 *
 * - **Databasen:** en midlertidig, skrivebeskyttet innloggingsrolle fra
 *   Management API-et (`POST /cli/login-role` med `read_only`), den samme
 *   Supabase-CLI-en bruker. Passordet varer i noen minutter og fornyes mens
 *   kopien tas; rollen slettes til slutt. Forbindelsen går gjennom
 *   tilkoblingspoolen i sesjonsmodus (GitHubs maskiner har ikke IPv6), med
 *   kryptering påkrevd.
 * - **Storage:** den hemmelige nøkkelen, hentet når jobben starter, aldri lagret.
 *
 * Passord og nøkler skrives aldri ut; i GitHub Actions maskeres de i loggen
 * med en gang de er hentet.
 */
import { Stopp } from './feil'
import { hent as hentMedFrist, management, PROSJEKT } from '../managementApi'

/** Maskerer en hemmelighet i loggen til GitHub Actions resten av jobben. */
export function masker(verdi: string): void {
  if (process.env.GITHUB_ACTIONS === 'true' && verdi) console.log(`::add-mask::${verdi}`)
}

/** Et kall til Management API-et; en feil sier hvilket kall, og at tokenet kan mangle en rettighet. */
async function api<T>(sti: string, init: RequestInit = {}): Promise<T> {
  try {
    return await management<T>(sti, init)
  } catch (e) {
    throw new Stopp(`Management API ${init.method ?? 'GET'} ${sti.split('?')[0]}: ${(e as Error).message.split(':')[0]}. Har tokenet rettighetene i docs/drift-gjenoppretting.md?`)
  }
}

export interface Prosjekttilgang {
  /** Uten passord; passordet står i `PGPASSWORD`, som fornyes. */
  dbUrl: string
  apiUrl: string
  /** Den hemmelige nøkkelen for Storage. */
  nokkel: string
  /** Versjonene til tjenestene, for referansen. */
  versjoner: { auth: string; storage: string; postgres: string }
  lukk(): Promise<void>
}

/**
 * Åpner tilgangen. Passordet settes i `PGPASSWORD` (og `PGSSLMODE=require`)
 * for prosessene kopien starter, og fornyes før det går ut, så nye
 * forbindelser virker gjennom hele kopien.
 */
export async function apneProsjekt(ref = PROSJEKT): Promise<Prosjekttilgang> {
  masker(process.env.SUPABASE_ACCESS_TOKEN ?? '')
  const prosjekt = await api<{ database?: { version?: string } }>('')
  const pool = (await api<{ database_type: string; db_host: string; db_name: string }[]>('/config/database/pooler')).find((p) => p.database_type === 'PRIMARY')
  if (!pool) throw new Stopp('Fant ikke tilkoblingspoolen til prosjektet.')
  const nokler = await api<{ name: string; type?: string; api_key: string }[]>('/api-keys?reveal=true')
  const nokkel = (nokler.find((k) => k.type === 'secret') ?? nokler.find((k) => k.name === 'service_role'))?.api_key
  if (!nokkel) throw new Stopp('Fant ingen hemmelig nøkkel for Storage i prosjektet.')
  masker(nokkel)

  let rolle = ''
  const forny = async (): Promise<number> => {
    const r = await api<{ role: string; password: string; ttl_seconds: number }>('/cli/login-role', { method: 'POST', body: JSON.stringify({ read_only: true }) })
    masker(r.password)
    if (rolle && r.role !== rolle) throw new Stopp('Innloggingsrollen byttet navn underveis.')
    rolle = r.role
    process.env.PGPASSWORD = r.password
    return r.ttl_seconds
  }
  const ttl = await forny()
  process.env.PGSSLMODE = 'require'
  let feil: unknown
  const tidtaker = setInterval(() => void forny().catch((e: unknown) => (feil = e)), Math.max(30, ttl - 90) * 1000)
  tidtaker.unref()

  const apiUrl = `https://${ref}.supabase.co`
  const hent = async (sti: string) => {
    const svar = await hentMedFrist(`${apiUrl}${sti}`, { headers: { apikey: nokkel } })
    if (!svar.ok) throw new Stopp(`${sti}: ${svar.status}`)
    return svar.text()
  }
  const auth = (JSON.parse(await hent('/auth/v1/health')) as { version?: string }).version ?? ''
  const storage = (await hent('/storage/v1/version')).trim()
  return {
    dbUrl: `postgresql://${encodeURIComponent(`${rolle}.${ref}`)}@${pool.db_host}:5432/${pool.db_name}`,
    apiUrl,
    nokkel,
    versjoner: { auth: auth.startsWith('v') ? auth : `v${auth}`, storage: storage.startsWith('v') ? storage : `v${storage}`, postgres: prosjekt.database?.version ?? '' },
    async lukk() {
      clearInterval(tidtaker)
      delete process.env.PGPASSWORD
      await api('/cli/login-role', { method: 'DELETE' }).catch(() => undefined)
      if (feil) throw feil instanceof Stopp ? feil : new Stopp(`Fornyingen av databasepassordet feilet: ${(feil as Error).message}`)
    },
  }
}
