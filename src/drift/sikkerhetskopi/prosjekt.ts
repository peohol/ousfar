/**
 * Tilgangen kopijobben får til produksjonsprosjektet, med minst mulig makt
 * og uten et fast databasepassord (`docs/drift-gjenoppretting.md`, «Kopiene i
 * drift»):
 *
 * - **Databasen:** en midlertidig, skrivebeskyttet innloggingsrolle fra
 *   Management API-et (`POST /cli/login-role` med `read_only`), den samme
 *   Supabase-CLI-en bruker. Den lages først når referansen er bygget, varer i
 *   noen minutter og fornyes tre ganger i løpet av levetiden mens kopien tas;
 *   rollen slettes til slutt. Den er ikke en tilpasning (`MIDLERTIDIG_ROLLE`). Forbindelsen går gjennom
 *   tilkoblingspoolen i sesjonsmodus (GitHubs maskiner har ikke IPv6), med
 *   kryptering påkrevd.
 * - **Storage:** den hemmelige nøkkelen, hentet når jobben starter, aldri lagret.
 *
 * Passord og nøkler skrives aldri ut; i GitHub Actions maskeres de i loggen
 * med en gang de er hentet.
 */
import { OffentligStopp, Stopp } from './feil'
import { masker } from './logg'
import { hent as hentMedFrist, management, PROSJEKT } from '../managementApi'

/** Et kall til Management API-et; en feil sier hvilket kall, og at tokenet kan mangle en rettighet. */
async function api<T>(sti: string, init: RequestInit = {}): Promise<T> {
  try {
    return await management<T>(sti, init)
  } catch (e) {
    // Bare kallet og statusen; svaret fra API-et skrives ikke i loggen.
    const status = /svarte (\d{3})/.exec((e as Error).message)?.[1]
    throw new OffentligStopp(`Management API ${init.method ?? 'GET'} ${sti.split('?')[0]}${status ? ` svarte ${status}` : ' svarte ikke'}. Har tokenet rettighetene i docs/drift-gjenoppretting.md?`)
  }
}

export interface Databasetilgang {
  /** Uten passord; passordet står i `PGPASSWORD`, som fornyes. */
  dbUrl: string
  /** Slutter å fornye passordet, sletter rollen og stopper hvis en fornying feilet. */
  lukk(): Promise<void>
}

export interface Prosjekttilgang {
  apiUrl: string
  /** Den hemmelige nøkkelen for Storage. */
  nokkel: string
  /** Versjonene til tjenestene, for referansen. */
  versjoner: { auth: string; storage: string; postgres: string }
  /**
   * Lager den midlertidige innloggingsrollen. Kalles først når referansen er
   * bygget: den bygges synkront og kan ta lenger enn passordet varer.
   */
  apneDatabase(): Promise<Databasetilgang>
}

/** Hvor ofte passordet fornyes: tre ganger i løpet av levetiden, så én fornying kan feile uten at det går ut. */
export const fornyingshyppighet = (ttlSekunder: number) => Math.max(20, Math.floor(ttlSekunder / 3)) * 1000

/**
 * Leser det kopien trenger fra prosjektet: adressen, nøkkelen til Storage og
 * versjonene. Ingen databaserolle lages før `apneDatabase()`.
 */
export async function apneProsjekt(ref = PROSJEKT): Promise<Prosjekttilgang> {
  masker(process.env.SUPABASE_ACCESS_TOKEN ?? '')
  const prosjekt = await api<{ database?: { version?: string } }>('')
  const pool = (await api<{ database_type: string; db_host: string; db_name: string }[]>('/config/database/pooler')).find((p) => p.database_type === 'PRIMARY')
  if (!pool) throw new OffentligStopp('Fant ikke tilkoblingspoolen til prosjektet.')
  const nokler = await api<{ name: string; type?: string; api_key: string }[]>('/api-keys?reveal=true')
  const nokkel = (nokler.find((k) => k.type === 'secret') ?? nokler.find((k) => k.name === 'service_role'))?.api_key
  if (!nokkel) throw new OffentligStopp('Fant ingen hemmelig nøkkel for Storage i prosjektet.')
  masker(nokkel)

  const apiUrl = `https://${ref}.supabase.co`
  const hent = async (sti: string) => {
    const svar = await hentMedFrist(`${apiUrl}${sti}`, { headers: { apikey: nokkel } })
    if (!svar.ok) throw new OffentligStopp(`${sti}: ${svar.status}`)
    return svar.text()
  }
  const auth = (JSON.parse(await hent('/auth/v1/health')) as { version?: string }).version ?? ''
  const storage = (await hent('/storage/v1/version')).trim()

  /**
   * Passordet settes i `PGPASSWORD` (og `PGSSLMODE=require`) for prosessene
   * kopien starter, og fornyes lenge før det går ut, så nye forbindelser
   * virker gjennom hele kopien.
   */
  async function apneDatabase(): Promise<Databasetilgang> {
    let rolle = ''
    const forny = async (): Promise<number> => {
      const r = await api<{ role: string; password: string; ttl_seconds: number }>('/cli/login-role', { method: 'POST', body: JSON.stringify({ read_only: true }) })
      masker(r.password)
      if (rolle && r.role !== rolle) throw new OffentligStopp('Innloggingsrollen byttet navn underveis.')
      rolle = r.role
      process.env.PGPASSWORD = r.password
      return r.ttl_seconds
    }
    const ttl = await forny()
    process.env.PGSSLMODE = 'require'
    let feil: unknown
    const tidtaker = setInterval(() => void forny().catch((e: unknown) => (feil ??= e)), fornyingshyppighet(ttl))
    tidtaker.unref()
    return {
      dbUrl: `postgresql://${encodeURIComponent(`${rolle}.${ref}`)}@${pool!.db_host}:5432/${pool!.db_name}`,
      async lukk() {
        clearInterval(tidtaker)
        delete process.env.PGPASSWORD
        await api('/cli/login-role', { method: 'DELETE' }).catch(() => undefined)
        if (feil) throw feil instanceof Stopp ? feil : new OffentligStopp('Fornyingen av databasepassordet feilet.')
      },
    }
  }

  return {
    apiUrl,
    nokkel,
    versjoner: { auth: auth.startsWith('v') ? auth : `v${auth}`, storage: storage.startsWith('v') ? storage : `v${storage}`, postgres: prosjekt.database?.version ?? '' },
    apneDatabase,
  }
}
