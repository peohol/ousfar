/**
 * Kontrollerer at en PR har nøyaktig én prosjektetikett (`docs/prosjektansvar.md`).
 *
 * Etiketten avgjør hvilket ChatGPT-prosjekt som kontrollerer og slår sammen
 * PR-en. Kontrollen ser bare på merkingen, ikke på om PR-en faktisk hører til
 * prosjektet: det vurderer den som kontrollerer.
 *
 * Kjøres av `.github/workflows/prosjektansvar.yml` med etikettnavnene som en
 * JSON-liste i miljøvariabelen `ETIKETTER`. Vanlig JavaScript uten
 * avhengigheter, så arbeidsflyten verken trenger `npm ci` eller tilgang til noe.
 */
import { appendFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

/** De gyldige etikettene og prosjektet hver av dem gir ansvaret til. */
export const PROSJEKTETIKETTER = new Map([
  ['ansvar:dev', 'OUSFAR Dev'],
  ['ansvar:fag', 'OUSFAR Fag'],
  ['ansvar:verktoy', 'OUSFAR Verktøy'],
])

/** Alt som begynner slik, regnes som et forsøk på prosjektetikett, også en feilstavet. */
const PREFIKS = 'ansvar:'

const NAVN = [...PROSJEKTETIKETTER.keys()]
const GYLDIGE = `${NAVN.slice(0, -1).join(', ')} eller ${NAVN.at(-1)}`
const PAA_NYTT = 'Kontrollen kjøres på nytt når etikettene endres.'
const RETTING = `Sett nøyaktig én av ${GYLDIGE}, etter hvilket prosjekt som eier oppgaven (docs/prosjektansvar.md). ${PAA_NYTT}`

/**
 * Vurderer etikettene på en PR.
 * @param {string[]} etiketter Navnene på alle etikettene PR-en har.
 * @returns {{ ok: true, etikett: string, prosjekt: string, melding: string } | { ok: false, melding: string }}
 */
export function vurderEtiketter(etiketter) {
  const forsok = [...new Set(etiketter.map((e) => e.trim()))].filter((e) => e.toLowerCase().startsWith(PREFIKS))
  if (forsok.length === 0) return { ok: false, melding: `PR-en mangler prosjektetikett. ${RETTING}` }
  if (forsok.length > 1) {
    return {
      ok: false,
      melding: `PR-en har ${forsok.length} prosjektetiketter (${forsok.join(', ')}), men skal ha nøyaktig én. Behold bare etiketten til prosjektet som eier oppgaven (docs/prosjektansvar.md). ${PAA_NYTT}`,
    }
  }
  const [etikett] = forsok
  const prosjekt = PROSJEKTETIKETTER.get(etikett)
  if (!prosjekt) return { ok: false, melding: `«${etikett}» er ikke en gyldig prosjektetikett. ${RETTING}` }
  return { ok: true, etikett, prosjekt, melding: `${prosjekt} eier PR-en (${etikett}) og kontrollerer den i ChatGPT-prosjektet ${prosjekt}.` }
}

/** Leser `ETIKETTER` som en JSON-liste med navn; alt annet er en feil i arbeidsflyten, ikke i PR-en. */
export function lesEtiketter(verdi) {
  const liste = JSON.parse(verdi ?? '')
  if (!Array.isArray(liste) || liste.some((e) => typeof e !== 'string')) throw new Error('ETIKETTER skal være en JSON-liste med etikettnavn.')
  return liste
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const vurdering = vurderEtiketter(lesEtiketter(process.env.ETIKETTER))
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Prosjektansvar\n\n${vurdering.melding}\n`)
  if (vurdering.ok) {
    console.log(vurdering.melding)
  } else {
    console.log(`::error title=Prosjektetiketten mangler eller er feil::${vurdering.melding}`)
    process.exitCode = 1
  }
}
