/**
 * Rydder kuratorjobbgrenene (`docs/kuratorjobber.md`, «Automatisk opprydding
 * av jobbgrener»). Kjøres av `.github/workflows/rydd-kuratorjobbgrener.yml`.
 *
 *   npm run rydd-kuratorjobbgrener            (sletter)
 *   npm run rydd-kuratorjobbgrener -- --kun-vis (viser bare hva som ville blitt slettet)
 *
 * Miljøet:
 * - `GH_TOKEN`, `GITHUB_REPOSITORY`: arbeidsflytens nøkkel og repoet.
 * - `OUSFAR_KO_ADRESSE` og OIDC-tokenet til arbeidsflyten: kurateringsgrenene i OUSFAR.
 * - `GITHUB_STEP_SUMMARY`: oversikten skrives dit.
 *
 * Avslutter med 1, uten å slette noe, når kurateringskøen eller
 * kurateringsgrenene ikke kan leses.
 */
import { appendFileSync } from 'node:fs'
import { lagGrenleser } from '../src/kurateringsko/grener'
import { kjorRydding, lagRyddegithub } from '../src/kuratorjobb/ryddekjoring'
import { ryddeMarkdown } from '../src/kuratorjobb/rydding'

const kunVis = process.argv.includes('--kun-vis')
const repo = process.env.GITHUB_REPOSITORY?.trim()
const token = process.env.GH_TOKEN?.trim()
const leser = lagGrenleser(process.env)

/**
 * Kurateringsgrenene, med nye forsøk: rett etter en sammenslåing kan appen
 * ennå ikke være rullet ut med det endepunktet trenger.
 */
const lesGrener = leser
  ? async () => {
      for (let forsok = 1; ; forsok += 1) {
        try {
          return await leser()
        } catch (e) {
          if (forsok >= 5) throw e
          console.log(`Kurateringsgrenene kunne ikke leses (${e instanceof Error ? e.message : e}); prøver igjen om ett minutt.`)
          await new Promise((ok) => setTimeout(ok, 60_000))
        }
      }
    }
  : null

try {
  if (!repo || !token) throw new Error('Mangler GitHub-repoet eller nøkkelen.')
  if (!lesGrener) throw new Error('Mangler adressen til kurateringsgrenene i OUSFAR eller OIDC-tokenet. Ingen grener slettes.')
  const utfall = await kjorRydding({ github: lagRyddegithub(repo, token), grener: lesGrener, kunVis, na: new Date().toISOString() })
  const tekst = ryddeMarkdown(utfall.oversikt, { kunVis, slettet: utfall.slettet, alleGrener: utfall.alleGrener })
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tekst}\n`)
  // Advarslene vises på kjøringen i GitHub, ikke bare i loggen.
  for (const a of utfall.oversikt.advarsler) console.log(`::warning title=Opprydding av kuratorjobbgrener::${a}`)
  console.log(`${kunVis ? 'Ville slettet' : 'Slettet'}: ${kunVis ? utfall.oversikt.slettes.length : utfall.slettet.size} / beholdt: ${utfall.oversikt.vurderinger.length - (kunVis ? utfall.oversikt.slettes.length : utfall.slettet.size)}`)
} catch (e) {
  const melding = e instanceof Error ? e.message : String(e)
  console.log(`::error title=Opprydding av kuratorjobbgrener::${melding}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Opprydding av kuratorjobbgrener\n\n**Stoppet uten å slette noe:** ${melding}\n`)
  process.exitCode = 1
}
