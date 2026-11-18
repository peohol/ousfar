/**
 * Analyttkatalogen til OUS Klinisk farmakologi for komponentene i testene,
 * slik appen gir dem katalogen den har hentet fra databasen, med
 * referanseområdet per kode fra fasiten (`REFERANSEOMRADER`): i appen står
 * det i fagmiljøets katalog i databasen, ikke i repoet.
 */
import { render, type RenderOptions } from '@testing-library/react'
import type { ReactElement, ReactNode } from 'react'
import { byggKatalog, type Katalogdata } from '../../domain/analyttkatalog'
import type { Referanseomrade } from '../../domain/piller'
import { OUS_KATALOGDATA } from '../../domain/ouskatalog'
import { AnalyttkatalogKilde, type Katalogkilde } from '../../katalog/Analyttkatalogkilde'
import { REFERANSEOMRADER } from './referanseomrader'

/** Fagmiljøet testene bruker for OUS Klinisk farmakologi. */
export const OUS_FAGMILJO = { id: 'kf', navn: 'OUS Klinisk farmakologi' }

/** Katalogdataene med referanseområdet per kode, slik databasen gir dem. */
export function medReferanseomrader(
  data: Katalogdata,
  perKode: Readonly<Record<string, Referanseomrade>> = REFERANSEOMRADER,
): Katalogdata {
  return {
    ...data,
    oppforinger: data.oppforinger.map((o) => ({
      ...o,
      koder: o.koder.map((k) => ({ ...k, referanseomrade: perKode[k.kode] ?? null })),
    })),
  }
}

/** Svaret `les_analyttkatalog()` gir et medlem av OUS Klinisk farmakologi. */
export const OUS_KATALOGSVAR: Katalogdata = { ...medReferanseomrader(OUS_KATALOGDATA), fagmiljo: OUS_FAGMILJO }

/** Katalogen appen bygger av svaret. */
export const OUS_KATALOG_MED_REFERANSEOMRADER = byggKatalog(OUS_KATALOGSVAR)

const KILDE: Katalogkilde = { katalog: OUS_KATALOG_MED_REFERANSEOMRADER, feil: null }

export function MedOusKatalog({ children }: { children: ReactNode }) {
  return <AnalyttkatalogKilde verdi={KILDE}>{children}</AnalyttkatalogKilde>
}

/** `render` med katalogen til OUS Klinisk farmakologi rundt, slik appen gir den. */
export function renderMedOusKatalog(innhold: ReactElement, valg?: Omit<RenderOptions, 'wrapper'>) {
  return render(innhold, { ...valg, wrapper: MedOusKatalog })
}
