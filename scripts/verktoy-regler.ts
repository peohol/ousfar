/**
 * Regelmodellen, pilotsettet (P4), doseplanmotoren (P5) og
 * nedtrappingsreglene for antidepressiva (P7) i OUSFAR Verktøy
 * (`docs/verktøy-utviklingsplan.md`).
 *
 *   npm run verktoy:regler -- kontroll   Kontrollerer regelsettene (kilder, grunnlag, godkjenning, regneeksempler) og dekningen for nedtrapping
 *   npm run verktoy:regler -- rapport    docs/verktøy-p4-pilotsett.md og docs/verktøy-p7-regelsett.md
 *   npm run verktoy:regler -- motorrapport   docs/verktøy-p5-testtilfeller.md (doseplanmotoren, syntetiske data)
 *
 * Skriptet henter ingenting, skriver ikke til databasen og godkjenner ingen regel.
 */
import { writeFileSync } from 'node:fs'
import { NEDTRAPPINGSDEKNING } from '../src/verktoy/regler/dekning'
import { kontrollerDekning, kontrollerRegelsett } from '../src/verktoy/regler/kontroll'
import { NEDTRAPPINGSSETT } from '../src/verktoy/regler/nedtrapping'
import { PILOTSETT } from '../src/verktoy/regler/pilotsett'
import { lagNedtrappingsrapport, lagRegelrapport, NEDTRAPPINGSRAPPORTFIL, REGELRAPPORTFIL } from '../src/verktoy/regler/rapport'
import { lagMotorrapport, MOTORRAPPORTFIL } from '../src/verktoy/motor/rapport'
import { REGELSETT } from '../src/verktoy/tilgjengelighet'

async function kontroll() {
  let feil = 0
  for (const sett of [PILOTSETT, NEDTRAPPINGSSETT, REGELSETT]) {
    const f = kontrollerRegelsett(sett)
    for (const x of f) console.error(`✗ ${sett.id}: ${x}`)
    console.log(f.length === 0 ? `✓ ${sett.id}: ${sett.regler.length} regler uten feil` : `${sett.id}: ${f.length} feil`)
    feil += f.length
  }
  const d = kontrollerDekning(NEDTRAPPINGSDEKNING, REGELSETT)
  for (const x of d) console.error(`✗ dekning: ${x}`)
  console.log(d.length === 0 ? `✓ dekningen for nedtrapping: ${NEDTRAPPINGSDEKNING.length} antidepressiva uten feil` : `dekningen: ${d.length} feil`)
  if (feil + d.length > 0) process.exit(1)
}

async function rapport() {
  for (const [fil, lag] of [
    [REGELRAPPORTFIL, lagRegelrapport],
    [NEDTRAPPINGSRAPPORTFIL, lagNedtrappingsrapport],
  ] as const) {
    writeFileSync(new URL(`../${fil}`, import.meta.url), lag())
    console.log(`→ ${fil}`)
  }
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
