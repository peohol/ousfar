/**
 * Rydder gamle grener ingen annen opprydding kjenner (`docs/grenrydding.md`).
 * Kjøres av `.github/workflows/rydd-grener.yml`.
 *
 *   npm run rydd-grener              (sletter)
 *   npm run rydd-grener -- --kun-vis (viser bare hva som ville blitt slettet)
 *
 * Miljøet: `GH_TOKEN` og `GITHUB_REPOSITORY` (arbeidsflytens nøkkel og repoet),
 * og `GITHUB_STEP_SUMMARY`, der oversikten skrives. Avslutter med 1, uten å
 * slette noe, når noe ikke kan leses.
 */
import { appendFileSync } from 'node:fs'
import { kjorGrenrydding, lagGrengithub } from '../src/grenrydding/kjoring'
import { grenMarkdown } from '../src/grenrydding/regler'

const TITTEL = 'Opprydding av gamle grener'
const kunVis = process.argv.includes('--kun-vis')
const repo = process.env.GITHUB_REPOSITORY?.trim()
const token = process.env.GH_TOKEN?.trim()
const oppsummer = (tekst: string) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tekst}\n`)

try {
  if (!repo || !token) throw new Error('Mangler GitHub-repoet eller nøkkelen.')
  const utfall = await kjorGrenrydding({ github: lagGrengithub(repo, token), kunVis, na: new Date().toISOString() })
  oppsummer(grenMarkdown(utfall.oversikt, { kunVis, slettet: utfall.slettet, alleGrener: utfall.alleGrener }))
  // Advarslene vises på kjøringen i GitHub, ikke bare i loggen.
  for (const a of utfall.oversikt.advarsler) console.log(`::warning title=${TITTEL}::${a}`)
  const antall = kunVis ? utfall.oversikt.slettes.length : utfall.slettet.size
  console.log(`${kunVis ? 'Ville slettet' : 'Slettet'}: ${antall} / beholdt: ${utfall.oversikt.vurderinger.length - antall}`)
} catch (e) {
  const melding = e instanceof Error ? e.message : String(e)
  console.log(`::error title=${TITTEL}::${melding}`)
  oppsummer(`## ${TITTEL}\n\n**Stoppet:** ${melding}\n`)
  process.exitCode = 1
}
