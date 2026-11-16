import type { Stoffsidedata } from '../faginnhold/lesing'
import { panelFor } from '../faginnhold/paneler'
import { erAutomatisk, referansetekst } from '../faginnhold/referanser'
import { elementtekster } from '../faginnhold/sok'
import type { Sideelement, Sidemodell } from '../faginnhold/stoffside'
import type { Konsentrasjonsskriver } from '../faginnhold/riktekst'
import type { Forslagsvalg } from './modell'

/** Skillet mellom leddene i et sted: «Bupropion · Farmakokinetikk · Halveringstid». */
const SKILLE = ' · '

/** Kortets overskrift når det har en, ellers panelets navn. */
function elementnavn(element: Sideelement, tekster: readonly { tittel?: string }[]): { panel: string; kort: string | null } {
  const panel = panelFor(element.panel)?.tittel ?? element.panel
  return { panel, kort: tekster.find((t) => t.tittel)?.tittel ?? null }
}

/**
 * Det et forslag kan gjelde på en fagside: hele siden først, så hvert kort og
 * hver tekst slik leseren ser dem. Bare det publiserte kan foreslås endret,
 * så en side eller et element som aldri er publisert, er ikke med. Tom liste
 * når siden ikke er publisert.
 */
export function forslagsvalgForFagside(
  navn: string,
  data: Stoffsidedata,
  modell: Sidemodell,
  konsentrasjon?: Konsentrasjonsskriver,
): Forslagsvalg[] {
  const side = data.infoside
  if (!side || side.publisert_revisjon === null) return []
  const helhet: Forslagsvalg = {
    ressurs: side.id,
    element: null,
    grunnrevisjon: side.publisert_revisjon,
    sted: navn,
    etikett: 'Hele fagsiden',
  }
  const elementer = [...modell.paneler.values()].flat().flatMap((element): Forslagsvalg[] => {
    const revisjon = element.utgave.publisert_revisjon
    if (revisjon === null) return []
    const tekster = elementtekster(element.elementtype, element.data, konsentrasjon)
    const { panel, kort } = elementnavn(element, tekster)
    const ledd = kort ? [panel, kort] : [panel]
    return [
      {
        ressurs: side.id,
        element: element.id,
        grunnrevisjon: revisjon,
        sted: [navn, ...ledd].join(SKILLE),
        utdrag: tekster.map((t) => t.tekst).join('\n'),
        etikett: ledd.join(SKILLE),
      },
    ]
  })
  return [helhet, ...elementer]
}

/** Referansene fagsiden viser, som kan velges som kilde. De automatiske er ikke objekter og kan ikke velges. */
export function forslagsreferanser(modell: Sidemodell): { id: string; tittel: string }[] {
  return modell.referanser.filter((r) => !erAutomatisk(r)).map((r) => ({ id: r.id, tittel: referansetekst(r) }))
}
