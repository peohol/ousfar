/**
 * Analyttkatalogen til OUS Klinisk farmakologi for komponentene i testene,
 * slik appen gir dem katalogen den har hentet fra databasen.
 */
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { OUS_KATALOG, OUS_KATALOGDATA } from '../../domain/ouskatalog'
import { AnalyttkatalogKilde, type Katalogkilde } from '../../katalog/Analyttkatalogkilde'

/** Fagmiljøet testene bruker for OUS Klinisk farmakologi. */
export const OUS_FAGMILJO = { id: 'kf', navn: 'OUS Klinisk farmakologi' }

const KILDE: Katalogkilde = { katalog: { ...OUS_KATALOG, fagmiljo: OUS_FAGMILJO }, feil: null }

/** Svaret `les_analyttkatalog()` gir et medlem av OUS Klinisk farmakologi. */
export const OUS_KATALOGSVAR = { ...OUS_KATALOGDATA, fagmiljo: OUS_FAGMILJO }

export function MedOusKatalog({ children }: { children: ReactNode }) {
  return <AnalyttkatalogKilde verdi={KILDE}>{children}</AnalyttkatalogKilde>
}

/** `render` med katalogen til OUS Klinisk farmakologi rundt, slik appen gir den. */
export function renderMedOusKatalog(innhold: ReactElement, valg?: Omit<RenderOptions, 'wrapper'>) {
  return render(innhold, { ...valg, wrapper: MedOusKatalog })
}
