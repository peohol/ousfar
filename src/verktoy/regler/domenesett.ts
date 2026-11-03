/**
 * Registreringen av regelsettene fra de kliniske leveransene
 * (`docs/verktøy-klinisk-leveranseplan-2026-11.md` §5–6): bytte av
 * antidepressiv (K2), bytte av antipsykotikum (K3) og kombinasjon av
 * stemningsstabiliserende (K4). Nedtrappingsreglene (K1) står i
 * `nedtrapping.ts` som før.
 *
 * Hvert sett og rapporten om det eies av sin leveranse, i sin egen fil; denne
 * filen eies av motortråden og endres ikke av leveransene. Et sett uten
 * regler er med i verktøyene (det gir ingenting), men får ingen rapport før
 * det har regler.
 */
import type { Disposisjon } from './godkjenning'
import type { Regelsett } from './modell'
import { ANTIDEPRESSIVBYTTER } from './antidepressivbytter'
import { ANTIPSYKOTIKABYTTER } from './antipsykotikabytter'
import { TILLEGG } from './tillegg'

/** Ett regelsett fra en leveranse, med rapporten `npm run verktoy:regler -- rapport` skriver om det. */
export interface Domenesett {
  sett: Regelsett
  rapport: {
    fil: string
    tittel: string
    notater: readonly string[]
    disposisjoner?: readonly Disposisjon[]
  }
}

export const DOMENESETT: readonly Domenesett[] = [ANTIDEPRESSIVBYTTER, ANTIPSYKOTIKABYTTER, TILLEGG]
