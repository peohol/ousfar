import { SENERE_SIDER } from '../../sidekode'

/**
 * Henter koden til sidene appen ellers henter først når de vises
 * (`src/sidekode.ts`), så en test som åpner dem, ikke venter på koden.
 */
export const hentSidene = () => Promise.all(SENERE_SIDER.map((side) => side.forhandslast()))
