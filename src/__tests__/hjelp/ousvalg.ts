/**
 * Søket indeksert med katalogen til OUS Klinisk farmakologi, slik appen gjør
 * for et medlem der: kodene, navnene og koblingene kommer fra katalogen.
 */
import { OUS_KATALOG } from '../../domain/ouskatalog'
import type { Indekseringsvalg } from '../../faginnhold/globaltSok'

export const OUS_VALG = { katalog: OUS_KATALOG } satisfies Indekseringsvalg
