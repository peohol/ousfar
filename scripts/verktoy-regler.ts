/**
 * Regelmodellen og pilotsettet (P4), doseplanmotoren (P5) og nedtrappingsreglene (P7) for OUSFAR
 * Verktøy (`docs/verktøy-utviklingsplan.md`).
 *
 *   npm run verktoy:regler -- kontroll   Kontrollerer regelsettene (kilder, grunnlag, godkjenning, regneeksempler)
 *   npm run verktoy:regler -- rapport    docs/verktøy-p4-pilotsett.md, docs/verktøy-p7-regelutkast.md og docs/verktøy-p7-dekning.md
 *   npm run verktoy:regler -- motorrapport   docs/verktøy-p5-testtilfeller.md (doseplanmotoren, syntetiske data)
 *
 * Skriptet henter ingenting, skriver ikke til databasen og godkjenner ingen regel.
 */
import { writeFileSync } from 'node:fs'
import { DEKNINGSRAPPORTFIL, lagDekningsrapport } from '../src/verktoy/dekningsrapport'
import { kontrollerRegelsett } from '../src/verktoy/regler/kontroll'
import { lagRegelrapport, REGELRAPPORTER } from '../src/verktoy/regler/rapport'
import { lagMotorrapport, MOTORRAPPORTFIL } from '../src/verktoy/motor/rapport'

const skriv = (fil: string, innhold: string) => {
  writeFileSync(new URL(`../${fil}`, import.meta.url), innhold)
  console.log(`→ ${fil}`)
}

async function kontroll() {
  let antall = 0
  for (const { sett } of REGELRAPPORTER) {
    const feil = kontrollerRegelsett(sett)
    for (const f of feil) console.error(`✗ ${sett.id}: ${f}`)
    console.log(feil.length === 0 ? `✓ ${sett.id}: ${sett.regler.length} regler uten feil` : `${sett.id}: ${feil.length} feil`)
    antall += feil.length
  }
  if (antall > 0) process.exit(1)
}

async function rapport() {
  for (const r of REGELRAPPORTER) skriv(r.fil, lagRegelrapport(r.sett, r))
  skriv(DEKNINGSRAPPORTFIL, lagDekningsrapport())
}

async function motorrapport() {
  skriv(MOTORRAPPORTFIL, lagMotorrapport())
}

const [kommando] = process.argv.slice(2).filter((a) => a !== '--')
const kommandoer: Record<string, () => Promise<void>> = { kontroll, rapport, motorrapport }
const k = kommando ? kommandoer[kommando] : undefined
if (!k) {
  console.error(`Bruk: npm run verktoy:regler -- <${Object.keys(kommandoer).join(' | ')}>`)
  process.exit(1)
}
await k()
