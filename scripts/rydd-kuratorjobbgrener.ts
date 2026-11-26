/**
 * Rydder kuratorjobbgrenene (`docs/kuratorjobber.md`, «Automatisk opprydding
 * av jobbgrener»). Kjøres av `.github/workflows/rydd-kuratorjobbgrener.yml`.
 *
 *   npm run rydd-kuratorjobbgrener -- <klone>           (sletter)
 *   npm run rydd-kuratorjobbgrener -- <klone> --kun-vis (viser bare hva som ville blitt slettet)
 *
 * `<klone>` er en klone med legitimasjon til å skrive; grenene slettes
 * gjennom den, og bare når de står på commiten som ble vurdert
 * (`src/github/gitslett.ts`).
 *
 * Miljøet:
 * - `GH_TOKEN`, `GITHUB_REPOSITORY`: arbeidsflytens nøkkel og repoet.
 * - `OUSFAR_KO_ADRESSE` og OIDC-tokenet til arbeidsflyten: kurateringsgrenene i OUSFAR.
 * - `GITHUB_STEP_SUMMARY`: oversikten skrives dit.
 *
 * Avslutter med 1, uten å slette noe, når kurateringskøen eller hele
 * datasettet om kurateringsgrenene ikke kan leses.
 */
import { appendFileSync } from 'node:fs'
import { lagGrenleser } from '../src/kurateringsko/grener'
import { lagGrensletter } from '../src/github/gitslett'
import { kjorRydding, kontrollerGrener, lagRyddegithub } from '../src/kuratorjobb/ryddekjoring'
import { ryddeMarkdown } from '../src/kuratorjobb/rydding'

const kunVis = process.argv.includes('--kun-vis')
const klone = process.argv.slice(2).find((a) => !a.startsWith('-'))
const repo = process.env.GITHUB_REPOSITORY?.trim()
const token = process.env.GH_TOKEN?.trim()
const leser = lagGrenleser(process.env, fetch, { komplett: true })
const FORSOK = 10

/**
 * Kurateringsgrenene, hele datasettet, med nye forsøk: rett etter en
 * sammenslåing kan appen eller databasen ennå ikke ha fått det oppryddingen
 * trenger. Går det ikke etter siste forsøk, slettes ingenting.
 */
const lesGrener = leser
  ? async () => {
      for (let forsok = 1; ; forsok += 1) {
        try {
          const grener = await leser()
          kontrollerGrener(grener)
          return grener
        } catch (e) {
          if (forsok >= FORSOK) throw e
          console.log(`Kurateringsgrenene kunne ikke leses komplett (${e instanceof Error ? e.message : e}); prøver igjen om ett minutt (forsøk ${forsok} av ${FORSOK}).`)
          await new Promise((ok) => setTimeout(ok, 60_000))
        }
      }
    }
  : null

try {
  if (!repo || !token) throw new Error('Mangler GitHub-repoet eller nøkkelen.')
  if (!klone) throw new Error('Mangler klonen grenene slettes gjennom. Ingen grener slettes.')
  if (!lesGrener) throw new Error('Mangler adressen til kurateringsgrenene i OUSFAR eller OIDC-tokenet. Ingen grener slettes.')
  const utfall = await kjorRydding({ github: lagRyddegithub(repo, token, lagGrensletter(klone)), grener: lesGrener, kunVis, na: new Date().toISOString() })
  const tekst = ryddeMarkdown(utfall.oversikt, { kunVis, slettet: utfall.slettet, underveis: utfall.underveis, alleGrener: utfall.alleGrener })
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${tekst}\n`)
  // Advarslene vises på kjøringen i GitHub, ikke bare i loggen.
  for (const a of utfall.oversikt.advarsler) console.log(`::warning title=Opprydding av kuratorjobbgrener::${a}`)
  // En feil under slettingen stopper resten, og kjøringen feiler synlig.
  if (utfall.feil) throw new Error(utfall.feil)
  console.log(`${kunVis ? 'Ville slettet' : 'Slettet'}: ${kunVis ? utfall.oversikt.slettes.length : utfall.slettet.size} / beholdt: ${utfall.oversikt.vurderinger.length - (kunVis ? utfall.oversikt.slettes.length : utfall.slettet.size)}`)
} catch (e) {
  const melding = e instanceof Error ? e.message : String(e)
  console.log(`::error title=Opprydding av kuratorjobbgrener::${melding}`)
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Opprydding av kuratorjobbgrener\n\n**Stoppet:** ${melding}\n`)
  process.exitCode = 1
}
