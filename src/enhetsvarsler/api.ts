/**
 * Valgene per formål for varsler på enheten (docs/enhetsvarsler.md, #600).
 * Bryteren for selve enheten står i `src/chatvarsler/` (abonnementet hos
 * push-tjenesten), som var der først.
 */
import { klient } from '../auth/klient'
import { lesFormalvalg, type Formalvalg } from './formal'

export async function hentFormalvalg(): Promise<Formalvalg[]> {
  const { data, error } = await klient().rpc('mine_enhetsvarselformal')
  if (error) throw new Error('Fikk ikke hentet varselvalgene.')
  return lesFormalvalg(data)
}

export async function settFormalvalg(formal: string, pa: boolean): Promise<void> {
  const { error } = await klient().rpc('sett_enhetsvarselvalg', { formal, pa })
  if (error) throw new Error('Kunne ikke lagre valget. Prøv igjen.')
}
