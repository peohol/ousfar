/**
 * Håndhever lagringstiden for gruppechatten i produksjonen (12 måneder, Peder
 * 17.11.2026; docs/gruppechat.md, «Lagringstiden»):
 *
 *   npm run gruppechat:lagringstid
 *
 * Sletter meldingene eldre enn lagringstiden i alle grupper
 * (`intern.rydd_gruppechat()`), kontrollerer at ingen står igjen, og skriver
 * en kort rapport. Stopper med en feil når ryddingen ikke gikk, så kjøringen
 * i GitHub Actions blir rød. Leser aldri ut tekst, avsendere eller grupper.
 *
 * Trenger `SUPABASE_ACCESS_TOKEN` (Management API).
 */
import { appendFileSync } from 'node:fs'
import { KONTROLL_SQL, RYDD_SQL, vurderLagringstid, type Kontrollsvar, type Ryddesvar } from '../src/drift/gruppechatLagringstid'
import { sql } from '../src/drift/managementApi'

try {
  const [rydd] = await sql<Ryddesvar>(RYDD_SQL, { skriver: true })
  const [kontroll] = await sql<Kontrollsvar>(KONTROLL_SQL)
  if (!rydd || !kontroll) throw new Error('Databasen svarte uten rader.')
  const { ok, rapport } = vurderLagringstid(rydd, kontroll)
  console.log(rapport)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${rapport}\n`)
  if (!ok) process.exit(1)
} catch (feil) {
  console.error(`Ryddingen av gruppechatten feilet: ${feil instanceof Error ? feil.message : String(feil)}`)
  process.exit(1)
}
