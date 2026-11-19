/**
 * Håndhever lagringstiden for chatten i produksjonen (12 måneder for
 * gruppechatten, Peder 17.11.2026, og for direktemeldingene, beslutning 2,
 * 18.11.2026; docs/gruppechat.md og docs/direktemeldinger-personvern.md):
 *
 *   npm run gruppechat:lagringstid
 *
 * Sletter meldingene eldre enn lagringstiden i alle grupper og samtaler, og
 * det som er for gammelt i køen for chatvarsler (`LAGRINGSJOBBER`), kontrollerer at ingen står igjen, og skriver en kort
 * rapport. Stopper med en feil når en rydding ikke gikk, så kjøringen i
 * GitHub Actions blir rød. Leser aldri ut tekst, avsendere, grupper eller
 * samtaler.
 *
 * Trenger `SUPABASE_ACCESS_TOKEN` (Management API).
 */
import { appendFileSync } from 'node:fs'
import { LAGRINGSJOBBER, vurderLagringstid, type Kontrollsvar, type Ryddesvar } from '../src/drift/gruppechatLagringstid'
import { sql } from '../src/drift/managementApi'

let feilet = false
for (const jobb of LAGRINGSJOBBER) {
  try {
    const [rydd] = await sql<Ryddesvar>(jobb.rydd, { skriver: true })
    const [kontroll] = await sql<Kontrollsvar>(jobb.kontroll)
    if (!rydd || !kontroll) throw new Error('Databasen svarte uten rader.')
    const { ok, rapport } = vurderLagringstid(rydd, kontroll, jobb.navn, jobb.hva)
    console.log(rapport)
    if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${rapport}\n\n`)
    if (!ok) feilet = true
  } catch (feil) {
    // Den neste ryddes likevel; kjøringen blir rød til slutt.
    console.error(`Ryddingen (${jobb.navn}) feilet: ${feil instanceof Error ? feil.message : String(feil)}`)
    feilet = true
  }
}
if (feilet) process.exit(1)
