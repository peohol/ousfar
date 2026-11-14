/**
 * Hva den innloggede får redigere i faginnholdet, etter rettighetene i
 * databasen (P2a, docs/fagmiljoer.md «Faginnholdet etter rekkevidden»):
 *
 * - `felles`: fagsidene, kortene og referansene, som er felles for alle
 *   fagmiljøer. Bare systemarkitektene, til felles redaktører finnes (P5).
 * - `lokalt`: fortolkningens regler og kommentarer, som hører til et
 *   fagmiljø. Den som har endringsrett i fagmiljøet innholdet hører til
 *   (`public.kan_endre_lokalt_innhold()`): administratorene der og
 *   systemarkitektene. Å administrere et annet fagmiljø gir det ikke.
 *
 * Den gamle adminrollen spiller ingen rolle, heller ikke i databasen. Dette
 * styrer bare hva appen viser; databasen kontrollerer hver endring.
 */
import { klient } from '../auth/klient'
import { INGEN_RETTIGHETER, type Rettigheter } from '../auth/rettigheter'
import { useKontoensSvar } from '../hooks/useKontoensSvar'

export interface Redigeringsrett {
  felles: boolean
  lokalt: boolean
  /** Om rettighetene er hentet; før det vises ingen redigering, men ingen adresse byttes heller. */
  kjent: boolean
}

/**
 * `lokalEndringsrett` er svaret fra `public.kan_endre_lokalt_innhold()`, og
 * `null` før det er kommet.
 */
export function redigeringsrett(rettigheter: Rettigheter, lokalEndringsrett: boolean | null): Redigeringsrett {
  return {
    felles: rettigheter.systemarkitekt,
    lokalt: lokalEndringsrett === true,
    kjent: rettigheter !== INGEN_RETTIGHETER && lokalEndringsrett !== null,
  }
}

export async function hentLokalEndringsrett(): Promise<boolean> {
  const { data, error } = await klient().rpc('kan_endre_lokalt_innhold')
  if (error) throw error
  return data === true
}

/** Om kontoen `bruker` har endringsrett til lokalt innhold; `null` til svaret er kommet. */
export function useLokalEndringsrett(bruker: string, hent: () => Promise<boolean> = hentLokalEndringsrett): boolean | null {
  return useKontoensSvar<boolean | null>(bruker, hent, null)
}
