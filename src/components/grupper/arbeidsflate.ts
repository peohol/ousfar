import { lesRute, type Gruppefane, type Rute } from '../../domain/rute'
import { STOFFREGISTER } from '../../domain/stoffregister'
import { inngangsvei, type Adressegrunnlag } from '../../hooks/useRute'

/**
 * Arbeidsflatene i en gruppe: idéene (`#/grupper/<ID>/ideer[/<idé>]`) og
 * oppgavene (`…/oppgaver[/<oppgave>]`). En flate er et stort lag med egen
 * adresse som ligger over siden den ble åpnet fra, og lukkes dit
 * (docs/design/d0-dashboard-chat/flyt.md §2):
 *
 * - åpnet fra en side i appen (forsiden, et varsel, gruppen): den siden står bak;
 * - åpnet fra en lenke utenfra, et bokmerke eller en ny fane: gruppen står bak,
 *   og er reserven når flaten lukkes.
 *
 * Chatten (`…/chat`) er fortsatt en side, til chatmenyen tar over den.
 */
export type Flatefane = Extract<Gruppefane, 'ideer' | 'oppgaver'>

export interface Arbeidsflate {
  gruppe: string
  fane: Flatefane
  element?: string
}

/** Arbeidsflaten ruten peker på, eller `null` når den er en vanlig side. */
export function arbeidsflate(rute: Rute): Arbeidsflate | null {
  if (rute.side !== 'grupper' || !rute.gruppe || (rute.fane !== 'ideer' && rute.fane !== 'oppgaver')) return null
  return { gruppe: rute.gruppe, fane: rute.fane, ...(rute.element ? { element: rute.element } : {}) }
}

/** Gruppesiden flaten hører til. */
const gruppen = (flate: Arbeidsflate): Rute => ({ side: 'grupper', gruppe: flate.gruppe })

/**
 * Siden som skal stå i appen: ruten selv, eller for en arbeidsflate siden den
 * ble åpnet fra (`fra`, inngangsveien). Kom flaten fra en annen flate, eller
 * fra ingen side i appen, står gruppen bak, så aldri to flater over
 * hverandre.
 */
export function flatebakgrunn(
  rute: Rute,
  fra: string | null | undefined = inngangsvei(),
  { register, katalog }: Adressegrunnlag = { register: STOFFREGISTER },
): Rute {
  const flate = arbeidsflate(rute)
  if (!flate) return rute
  if (!fra) return gruppen(flate)
  const bak = lesRute(fra, register, katalog)
  const annenFlate = arbeidsflate(bak)
  if (annenFlate) return gruppen(annenFlate)
  return bak.side === 'ukjent' ? gruppen(flate) : bak
}
