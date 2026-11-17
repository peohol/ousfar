/**
 * Kallene mot CYPinfo (`docs/cypinfo-integrasjon.md`). API-et er åpent, uten
 * nøkkel, men uten CORS, så nettleseren kan ikke kalle det: alt går fra
 * OUSFARs server. Kallene går ett om gangen, med minst ett sekund mellom
 * starten på hvert, og nye forsøk når CYPinfo svarer 429, har en serverfeil
 * eller ikke svarer innen tidsgrensen.
 */
import { lagHofligHenting, type Hoflighetsvalg } from '../server/hofligHenting.js'
import { erObjekt } from '../datakilder/struktur.js'
import { CYPINFO_API, CypinfoFeil } from './modell.js'

/** Minste tid mellom to kall. CYPinfo oppgir ingen grense; dette er god margin. */
export const MINSTE_AVSTAND_MS = 1000

export const BRUKERAGENT = 'OUSFAR-datasynk/1.0 (+https://github.com/peohol/ousfar)'

export interface CypinfoApi {
  /** Legemiddelkatalogen (`GET /api/legemiddel`), radene slik CYPinfo ga dem. */
  legemidler(): Promise<unknown[]>
  /** Gentabellen (`GET /api/gene`). */
  gentabell(): Promise<unknown[]>
  /**
   * Rapporten (`POST /api/legemiddel/rapport`) for disse gen:fenotype-parene
   * og legemidlene, slik CYPinfo ga den. Ukjente ID-er gir et tomt objekt, ikke
   * en feil.
   */
  rapport(kombinasjoner: readonly string[], legemidler: readonly string[]): Promise<unknown>
}

export function lagCypinfoApi(valg: Partial<Hoflighetsvalg> = {}): CypinfoApi {
  const hent = lagHofligHenting({
    avstand: MINSTE_AVSTAND_MS,
    tidsgrense: 30_000,
    ...valg,
    hoder: { accept: 'application/json', 'user-agent': BRUKERAGENT, ...valg.hoder },
  })

  async function json(sti: string, init?: RequestInit): Promise<unknown> {
    const res = await hent(`${CYPINFO_API}${sti}`, init)
    if (!res.ok) throw new CypinfoFeil(`CYPinfo svarte ${res.status} for ${sti}.`, res.status)
    return res.json().catch(() => {
      throw new CypinfoFeil(`CYPinfo ga ikke JSON for ${sti}.`)
    })
  }

  async function liste(sti: string): Promise<unknown[]> {
    const svar = await json(sti)
    if (!erObjekt(svar) || !Array.isArray(svar.data)) throw new CypinfoFeil(`CYPinfo ga ikke en liste for ${sti}.`)
    return svar.data
  }

  return {
    legemidler: () => liste('/legemiddel'),
    gentabell: () => liste('/gene'),
    rapport: (kombinasjoner, legemidler) =>
      json('/legemiddel/rapport', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: { combinations: kombinasjoner, drugs: legemidler } }),
      }),
  }
}
