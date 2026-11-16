import { useCallback } from 'react'
import { useKontoensSvar } from '../hooks/useKontoensSvar'
import { redaktorlager, type Redaktoransvar } from './ansvar'

const INGEN: Redaktoransvar[] = []

/**
 * Den innloggedes egne redaktøransvar, holdt oppdatert som rettighetene. For
 * den som ikke er redaktør (`redaktor` fra `mine_rettigheter`), hentes
 * ingenting og svaret er tomt med en gang; for en redaktør er det `null` til
 * det første svaret er kommet.
 */
export function useMineRedaktoransvar(bruker: string, redaktor: boolean, hent: () => Promise<Redaktoransvar[]> = redaktorlager.mine): Redaktoransvar[] | null {
  const hentHvisRedaktor = useCallback(() => (redaktor ? hent() : Promise.resolve(INGEN)), [redaktor, hent])
  return useKontoensSvar<Redaktoransvar[] | null>(`${bruker}:${redaktor}`, hentHvisRedaktor, redaktor ? null : INGEN)
}
