/**
 * Nødstoppen for de kliniske verktøyene (P11.6 i
 * `docs/verktøy-utviklingsplan.md`, `docs/verktøy-p11-publisering.md`): en
 * administrator kan deaktivere alle verktøyene, ett verktøy eller én regel med
 * en gang, uten en ny versjon av appen, og oppheve sperren igjen. Sperrene står
 * i databasen (`public.verktoysperrer`), og ingen slettes.
 *
 * Verktøysidene leser de aktive sperrene før de viser en beregning eller
 * fagtekst, jevnlig mens siden står åpen, og igjen i det en plan beregnes. Får
 * de ikke lest dem, vises ingenting klinisk: en sperre som ikke kan
 * kontrolleres, regnes som en sperre.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Regel } from './regler/modell'
import type { Verktoy } from './register'

export type Sperreomfang = 'alle' | 'verktoy' | 'regel'

/** En aktiv sperre: hva den gjelder, hvorfor, og hvem som satte den, når. */
export interface Verktoysperre {
  id: string
  omfang: Sperreomfang
  /** Verktøyets eller regelens id; `null` når sperren gjelder alle. */
  mal: string | null
  grunn: string
  satt_kl: string
  satt_av: string | null
}

/** En sperre i historikken, også opphevet. */
export interface Sperrehistorikk extends Verktoysperre {
  opphevet_kl: string | null
  opphevet_av: string | null
  opphevet_grunn: string | null
}

/** Om sperren gjelder verktøyet, eller regelen i det. */
export const gjelder = (s: Verktoysperre, verktoy: Pick<Verktoy, 'id'>, regel?: Pick<Regel, 'id'>): boolean =>
  s.omfang === 'alle' || (s.omfang === 'verktoy' && s.mal === verktoy.id) || (s.omfang === 'regel' && !!regel && s.mal === regel.id)

/** Sperrene som gjelder hele verktøyet, uansett regel. */
export const verktoysperrer = (sperrer: readonly Verktoysperre[], verktoy: Pick<Verktoy, 'id'>): Verktoysperre[] => sperrer.filter((s) => gjelder(s, verktoy))

/** Reglene som ikke er sperret i verktøyet. */
export const usperrede = <R extends Pick<Regel, 'id'>>(sperrer: readonly Verktoysperre[], verktoy: Pick<Verktoy, 'id'>, regler: readonly R[]): R[] =>
  regler.filter((r) => !sperrer.some((s) => gjelder(s, verktoy, r)))

export const OMFANGSTEKST: Record<Sperreomfang, string> = { alle: 'Alle verktøyene', verktoy: 'Verktøyet', regel: 'Regelen' }

/** Teksten verktøysiden viser når det den skulle vist, er sperret. */
export const SPERRET = 'Verktøyet er midlertidig deaktivert av en administrator. Ingen doseplan eller fagtekst vises før sperren er opphevet.'

/** Teksten når sperrene ikke kunne leses: da vises ingenting klinisk. */
export const UKONTROLLERT = 'OUSFAR fikk ikke kontrollert om verktøyet er midlertidig deaktivert, og viser derfor ingen doseplan eller fagtekst. Prøv igjen.'

export interface Verktoysperreleser {
  /** De aktive sperrene; kaster når de ikke kan leses. */
  les(): Promise<Verktoysperre[]>
}

export interface Verktoysperrelager extends Verktoysperreleser {
  historikk(): Promise<Sperrehistorikk[]>
  sett(omfang: Sperreomfang, mal: string | null, grunn: string): Promise<string>
  opphev(sperre: string, grunn: string): Promise<void>
}

const OMFANG = new Set<string>(['alle', 'verktoy', 'regel'])

/** En sperre slik databasen gir den; alt som ikke har riktig form, avvises, så ingen sperre forsvinner i stillhet. */
function lesSperre(x: unknown): Verktoysperre {
  const s = x as Partial<Verktoysperre> | null
  if (!s || typeof s.id !== 'string' || !OMFANG.has(s.omfang as string) || (s.omfang !== 'alle' && typeof s.mal !== 'string') || typeof s.grunn !== 'string') {
    throw new Error('Sperrene har en form appen ikke kjenner.')
  }
  return { id: s.id, omfang: s.omfang!, mal: s.omfang === 'alle' ? null : s.mal!, grunn: s.grunn, satt_kl: String(s.satt_kl ?? ''), satt_av: s.satt_av ?? null }
}

export function lagVerktoysperrelager(klient: SupabaseClient): Verktoysperrelager {
  async function kall<T>(funksjon: string, argumenter?: Record<string, unknown>): Promise<T> {
    const { data, error } = await klient.rpc(funksjon, argumenter)
    if (error) throw new Error(error.message)
    return data as T
  }
  return {
    les: async () => {
      const rader = await kall<unknown>('les_verktoysperrer')
      if (!Array.isArray(rader)) throw new Error('Sperrene har en form appen ikke kjenner.')
      return rader.map(lesSperre)
    },
    historikk: async () => {
      const rader = await kall<unknown>('verktoysperrehistorikk')
      if (!Array.isArray(rader)) throw new Error('Sperrene har en form appen ikke kjenner.')
      return rader.map((x) => {
        const h = x as Partial<Sperrehistorikk>
        return { ...lesSperre(x), opphevet_kl: h.opphevet_kl ?? null, opphevet_av: h.opphevet_av ?? null, opphevet_grunn: h.opphevet_grunn ?? null }
      })
    },
    sett: (omfang, mal, grunn) => kall<string>('sett_verktoysperre', { omfang, mal, grunn }),
    opphev: async (sperre, grunn) => {
      await kall<null>('opphev_verktoysperre', { sperre, grunn })
    },
  }
}
