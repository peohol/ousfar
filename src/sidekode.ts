/**
 * Sidene og vinduene i appen som ikke vises når den åpnes. De hentes første
 * gang de trengs, så den første visningen ikke venter på koden deres
 * (`src/oppdatering/senere.ts`). Fortolkningen, forsiden og toppmenyen er
 * med fra start.
 */
import { senere } from './oppdatering/senere'
import { erRedigering, type Rute } from './domain/rute'

export const Stoffside = senere(() => import('./components/stoffside/Stoffside'), 'Stoffside')
export const Versjonsside = senere(() => import('./components/kuratering/Versjonsside'), 'Versjonsside')
export const Kurateringsside = senere(() => import('./components/kuratering/Kurateringsside'), 'Kurateringsside')
export const Stoffregisterside = senere(() => import('./components/stoffregister/Stoffregisterside'), 'Stoffregisterside')
export const Verktoyside = senere(() => import('./components/verktoy/Verktoyside'), 'Verktoyside')
export const Grupperside = senere(() => import('./components/grupper/Grupperside'), 'Grupperside')
export const Gruppeflate = senere(() => import('./components/grupper/Gruppeflate'), 'Gruppeflate')
export const Forslagsside = senere(() => import('./components/forslag/Forslagsside'), 'Forslagsside')
export const Fortolkningsredigering = senere(() => import('./components/regler/Fortolkningsredigering'), 'Fortolkningsredigering')
export const Diskusjonsmeny = senere(() => import('./components/diskusjoner/Diskusjonsmeny'), 'Diskusjonsmeny')

/** Alle sidene over, i den rekkefølgen de er ført opp. */
export const SENERE_SIDER = [
  Stoffside,
  Versjonsside,
  Kurateringsside,
  Stoffregisterside,
  Verktoyside,
  Grupperside,
  Gruppeflate,
  Forslagsside,
  Fortolkningsredigering,
  Diskusjonsmeny,
] as const

/** Koden siden en adresse peker på, trenger. */
export function sidekodeFor(rute: Rute) {
  switch (rute.side) {
    case 'stoff':
      return [Stoffside]
    case 'versjon':
      return [Versjonsside]
    case 'kuratering':
      return [Kurateringsside]
    case 'stoffregister':
      return [Stoffregisterside]
    case 'verktoy':
      return [Verktoyside]
    case 'grupper':
      return [Grupperside, Gruppeflate]
    case 'forslag':
      return [Forslagsside]
    case 'fortolkning':
      return erRedigering(rute) ? [Fortolkningsredigering] : []
    default:
      return []
  }
}
