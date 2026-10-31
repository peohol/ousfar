/**
 * Kildeovervåkingen for Verktøy melder kjøringene og de tekniske vurderingene
 * hit fra GitHub Actions (`.github/workflows/verktoy-overvaking.yml`). Logikken
 * står i `src/verktoy/overvaking/endepunkt.ts`.
 */
import { behandleKildeovervaking } from '../src/verktoy/overvaking/endepunkt.js'

export function POST(request: Request): Promise<Response> {
  return behandleKildeovervaking(request, process.env)
}
