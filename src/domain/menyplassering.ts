/**
 * Hvor en nedtrekksmeny skal stå i vinduet.
 *
 * Menyen ligger i nettleserens øverste lag (`useOverlag`), festet til vinduet,
 * så ingen beholder kan klippe den. Da må plassen regnes ut her: helst rett
 * under knappen, med kanten i flukt med knappens (høyre kant som standard,
 * venstre for menyer som åpner seg fra et navn). Er det ikke plass under,
 * åpner den seg over, der det er mest plass. Den skyves inn fra vinduskantene,
 * og blir den høyere enn plassen, får den en makshøyde og rulles. Den holder
 * seg i vinduet også når knappen rulles ut av det.
 *
 * Rene tall, uten DOM, så reglene kan prøves i test. Alle mål er i piksler i
 * vinduets koordinater (som `getBoundingClientRect`).
 */
import { klem, TIPSKANT, type Rute, type Storrelse } from './tipsplassering'

/** Avstanden mellom knappen og menyen. */
export const MENYLUFT = 6

/** Minste avstand fra menyen til vinduskanten; den samme som for tooltipene. */
export const MENYKANT = TIPSKANT

/** Hvilken kant av knappen menyen flukter med. */
export type Menyjustering = 'start' | 'slutt'

export interface Menyplassering {
  venstre: number
  topp: number
  side: 'under' | 'over'
  /** Høyden menyen får bruke; er innholdet høyere, rulles det. */
  maksHoyde: number
}

export function plasserMeny(anker: Rute, meny: Storrelse, vindu: Storrelse, justering: Menyjustering = 'slutt'): Menyplassering {
  const bunn = anker.topp + anker.hoyde
  const romUnder = Math.max(0, vindu.hoyde - bunn - MENYLUFT - MENYKANT)
  const romOver = Math.max(0, anker.topp - MENYLUFT - MENYKANT)

  // Under når den får plass der, ellers på siden med mest plass.
  const side: Menyplassering['side'] = meny.hoyde <= romUnder || romUnder >= romOver ? 'under' : 'over'
  // Aldri høyere enn vinduet, heller ikke når knappen er rullet ut av det.
  const maksHoyde = Math.min(side === 'under' ? romUnder : romOver, Math.max(0, vindu.hoyde - 2 * MENYKANT))
  const hoyde = Math.min(meny.hoyde, maksHoyde)
  const onsketTopp = side === 'under' ? bunn + MENYLUFT : anker.topp - MENYLUFT - hoyde
  // Rulles knappen ut av vinduet mens menyen står åpen, blir menyen stående
  // ved kanten i stedet for å følge den ut.
  const topp = klem(onsketTopp, MENYKANT, vindu.hoyde - hoyde - MENYKANT)

  const onsket = justering === 'slutt' ? anker.venstre + anker.bredde - meny.bredde : anker.venstre
  const venstre = klem(onsket, MENYKANT, vindu.bredde - meny.bredde - MENYKANT)

  return { venstre, topp, side, maksHoyde }
}
