/**
 * Regelmodellen og pilotsettet (P4) og doseplanmotoren (P5) for OUSFAR
 * Verktøy (`docs/verktøy-utviklingsplan.md`).
 *
 *   npm run verktoy:regler -- kontroll   Kontrollerer pilotsettet (kilder, grunnlag, godkjenning, regneeksempler)
 *   npm run verktoy:regler -- rapport    docs/verktøy-p4-pilotsett.md
 *   npm run verktoy:regler -- motorrapport   docs/verktøy-p5-testtilfeller.md (doseplanmotoren, syntetiske data)
 *
 * Skriptet henter ingenting, skriver ikke til databasen og godkjenner ingen regel.
 */
import { writeFileSync } from 'node:fs'
import { kontrollerRegelsett } from '../src/verktoy/regler/kontroll'
import { PILOTSETT } from '../src/verktoy/regler/pilotsett'
import { lagRegelrapport, REGELRAPPORTFIL } from '../src/verktoy/regler/rapport'
import { lagMotorrapport, MOTORRAPPORTFIL } from '../src/verktoy/motor/rapport'

async function kontroll() {
  const feil = kontrollerRegelsett(PILOTSETT)
  for (const f of feil) console.error(`✗ ${f}`)
  console.log(feil.length === 0 ? `✓ ${PILOTSETT.regler.length} regler uten feil` : `${feil.length} feil`)
  if (feil.length > 0) process.exit(1)
}

async function rapport() {
  writeFileSync(new URL(`../${REGELRAPPORTFIL}`, import.meta.url), lagRegelrapport())
  console.log(`→ ${REGELRAPPORTFIL}`)
}

async function motorrapport() {
  writeFileSync(new URL(`../${MOTORRAPPORTFIL}`, import.meta.url), lagMotorrapport())
  console.log(`→ ${MOTORRAPPORTFIL}`)
}

const [kommando] = process.argv.slice(2).filter((a) => a !== '--')
const kommandoer: Record<string, () => Promise<void>> = { kontroll, rapport, motorrapport }
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:regler -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
