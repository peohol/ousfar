/**
 * Testene skal aldri kunne nå en ekte Supabase, uansett hva miljøet de kjøres
 * i inneholder. I CI er ingen av variablene satt, men i agentmiljøene står
 * produksjonsadressen og nøklene, og da kontaktet komponenttestene
 * produksjonsdatabasen uten innlogging (`docs/s4-pilotplan.md` §2.4, tiltak 10).
 *
 * Fila kjøres før hver testfil (`test.setupFiles` i `vite.config.ts`) og
 * fjerner variablene før noen modul leser dem, slik at testene ser det samme
 * miljøet som i CI. En test som trenger en av dem, setter den selv med en
 * plassholder, som testene for synkene gjør.
 */
import { PRODUKSJONSVARIABLER } from './produksjonsvariabler'

for (const navn of PRODUKSJONSVARIABLER) {
  delete process.env[navn]
  delete (import.meta.env as Record<string, unknown>)[navn]
}
