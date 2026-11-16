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
 *   redigere fortolkningen for analyttkodene regelsettet gjelder (`koder`),
 *   og der bare regelsettet selv (`regelsett`), også på en side med flere.
 * - `publisere`: om fortolkningen kan publiseres. Redaktørene endrer
 *   utkastet, men publiserer ikke.
 *
 * Den gamle adminrollen spiller ingen rolle, heller ikke i databasen. Dette
 * styrer bare hva appen viser; databasen kontrollerer hver endring.
 */
import { klient } from '../auth/klient'
import { INGEN_RETTIGHETER, kanPublisereFortolkningen, type Rettigheter } from '../auth/rettigheter'
import { useKontoensSvar } from '../hooks/useKontoensSvar'
import { INGEN_REGELSETT, type RedigerbareRegelsett } from '../redaktorer/ansvar'

export interface Redigeringsrett {
  felles: boolean
  lokalt: boolean
  /** Analyttkodene fortolkningen kan redigeres for; `null` når alle kan (endringsrett i fagmiljøet). */
  koder: ReadonlySet<string> | null
  /** Id-ene til regelsettene som kan redigeres; `null` når alle kan. */
  regelsett: ReadonlySet<string> | null
  /** Om den innloggede publiserer det som redigeres i fortolkningen. */
  publisere: boolean
  /** Om rettighetene er hentet; før det vises ingen redigering, men ingen adresse byttes heller. */
  kjent: boolean
}

/**
 * `lokalEndringsrett` er svaret fra `public.kan_endre_lokalt_innhold()`, og
 * `null` før det er kommet. `redaktorens` er regelsettene den innloggede er
 * redaktør for (`redigerbareRegelsett`), og `null` til de er hentet for en
 * redaktør.
 */
export function redigeringsrett(
  rettigheter: Rettigheter,
  lokalEndringsrett: boolean | null,
  redaktorens: RedigerbareRegelsett | null = INGEN_REGELSETT,
): Redigeringsrett {
  const iFagmiljoet = lokalEndringsrett === true
  const { koder, ider } = redaktorens ?? INGEN_REGELSETT
  return {
    felles: rettigheter.systemarkitekt,
    lokalt: iFagmiljoet || koder.size > 0,
    koder: iFagmiljoet ? null : koder,
    regelsett: iFagmiljoet ? null : ider,
    publisere: kanPublisereFortolkningen(rettigheter),
    kjent: rettigheter !== INGEN_RETTIGHETER && lokalEndringsrett !== null && redaktorens !== null,
  }
}

/** Om fortolkningen med analyttkodene kan redigeres etter retten. */
export const kanRedigereKodene = (rett: Redigeringsrett, koder: readonly string[]): boolean =>
  rett.lokalt && (rett.koder === null || koder.some((k) => rett.koder!.has(k)))

/** Om regelsettet (id-en) kan redigeres etter retten; `null` er alle. */
export const kanRedigereRegelsettet = (regelsett: ReadonlySet<string> | null, id: string): boolean =>
  regelsett === null || regelsett.has(id)

export async function hentLokalEndringsrett(): Promise<boolean> {
  const { data, error } = await klient().rpc('kan_endre_lokalt_innhold')
  if (error) throw error
  return data === true
}

/** Om kontoen `bruker` har endringsrett til lokalt innhold; `null` til svaret er kommet. */
export function useLokalEndringsrett(bruker: string, hent: () => Promise<boolean> = hentLokalEndringsrett): boolean | null {
  return useKontoensSvar<boolean | null>(bruker, hent, null)
}
