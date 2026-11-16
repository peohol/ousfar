/**
 * Hva den innloggede får redigere i faginnholdet, etter rettighetene i
 * databasen (P2a, docs/fagmiljoer.md «Faginnholdet etter rekkevidden»):
 *
 * - `felles`: fagsidene, kortene og referansene, som er felles for alle
 *   fagmiljøer. Bare systemarkitektene, til nasjonale redaktører slås på (P5, B2).
 * - `lokalt`: fortolkningens regler og kommentarer, som hører til et
 *   fagmiljø. Den som har endringsrett i fagmiljøet innholdet hører til
 *   (`public.kan_endre_lokalt_innhold()`): administratorene der,
 *   systemarkitektene og redaktørene for fortolkningen der. Å administrere et
 *   annet fagmiljø gir det ikke. En redaktør for ett regelsett (P5) får
 *   redigere fortolkningen for analyttkodene regelsettet gjelder (`koder`).
 * - `publisere`: om fortolkningen kan publiseres. Redaktørene endrer
 *   utkastet, men publiserer ikke.
 *
 * Den gamle adminrollen spiller ingen rolle, heller ikke i databasen. Dette
 * styrer bare hva appen viser; databasen kontrollerer hver endring.
 */
import { klient } from '../auth/klient'
import { INGEN_RETTIGHETER, kanPublisereFortolkningen, type Rettigheter } from '../auth/rettigheter'
import { useKontoensSvar } from '../hooks/useKontoensSvar'

export interface Redigeringsrett {
  felles: boolean
  lokalt: boolean
  /** Analyttkodene fortolkningen kan redigeres for; `null` når alle kan (endringsrett i fagmiljøet). */
  koder: ReadonlySet<string> | null
  /** Om den innloggede publiserer det som redigeres i fortolkningen. */
  publisere: boolean
  /** Om rettighetene er hentet; før det vises ingen redigering, men ingen adresse byttes heller. */
  kjent: boolean
}

const INGEN_KODER: ReadonlySet<string> = new Set()

/**
 * `lokalEndringsrett` er svaret fra `public.kan_endre_lokalt_innhold()`, og
 * `null` før det er kommet. `regelsettkoder` er analyttkodene i regelsettene
 * den innloggede er redaktør for (`redigerbareKoder`), og `null` til de er
 * hentet for en redaktør.
 */
export function redigeringsrett(
  rettigheter: Rettigheter,
  lokalEndringsrett: boolean | null,
  regelsettkoder: ReadonlySet<string> | null = INGEN_KODER,
): Redigeringsrett {
  const iFagmiljoet = lokalEndringsrett === true
  const koder = regelsettkoder ?? INGEN_KODER
  return {
    felles: rettigheter.systemarkitekt,
    lokalt: iFagmiljoet || koder.size > 0,
    koder: iFagmiljoet ? null : koder,
    publisere: kanPublisereFortolkningen(rettigheter),
    kjent: rettigheter !== INGEN_RETTIGHETER && lokalEndringsrett !== null && regelsettkoder !== null,
  }
}

/** Om fortolkningen med analyttkodene kan redigeres etter retten. */
export const kanRedigereKodene = (rett: Redigeringsrett, koder: readonly string[]): boolean =>
  rett.lokalt && (rett.koder === null || koder.some((k) => rett.koder!.has(k)))

export async function hentLokalEndringsrett(): Promise<boolean> {
  const { data, error } = await klient().rpc('kan_endre_lokalt_innhold')
  if (error) throw error
  return data === true
}

/** Om kontoen `bruker` har endringsrett til lokalt innhold; `null` til svaret er kommet. */
export function useLokalEndringsrett(bruker: string, hent: () => Promise<boolean> = hentLokalEndringsrett): boolean | null {
  return useKontoensSvar<boolean | null>(bruker, hent, null)
}
