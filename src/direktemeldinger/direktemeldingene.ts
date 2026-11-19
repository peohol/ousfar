import { lagDeltTilstand } from '../hooks/deltTilstand'
import type { Direktemeldinger } from './useDirekte'

/**
 * Direktemeldingene slik chatmenyen har dem, for resten av appen (som fanen
 * Chat i Innstillinger og profilkortet): `null` når de ikke er slått på eller
 * menyen ikke står. Chatmenyen eier dem, så valgene og lista er de samme
 * overalt, uten egne kall. Egen modul, så den som bare leser dem, ikke drar
 * med seg kallene og sanntiden.
 */
export const direktemeldingene = lagDeltTilstand<Direktemeldinger | null>(null)
