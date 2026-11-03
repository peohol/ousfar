/**
 * `/api/kildeovervaking`: der kildeovervåkingen i GitHub Actions melder seg
 * (P12.1, `docs/verktøy-p12-overvaking.md` §5). Bare arbeidsflyten
 * `verktoy-overvaking.yml` på main slipper inn, med et OIDC-token GitHub har
 * utstedt for kjøringen; ingen hemmelighet å lagre. En administrator bruker
 * vinduet «Kildeovervåking» i appen, som går rett mot databasen.
 *
 * - `{ "oppgave": "registrer", "rapport": <funn.json>, "lenke": <kjøringen> }`
 *   melder en kjøring og funnene som krever vurdering.
 * - `{ "oppgave": <agentoppgave>, …, "av": <hvem> }` er agentens arbeid med en
 *   sak: `teknisk_konklusjon`, `faglig_sporsmal`, `brukervarsel`, `tiltak` og
 *   `avslutt_prove` (`agentoppgaver.ts`). Hver tar sakens nummer og versjonen
 *   agenten leste, og avvises når saken er endret siden.
 *
 * Endepunktet endrer eller godkjenner ingen regel og setter ingen sperre.
 */
import { kallMot, type Databasekall } from '../../legemiddeldata/lager.js'
import { hvem, serverklient, svar, type Githubsjekk, type Miljo } from '../../server/tilgang.js'
import { AGENTOPPGAVER, agentargumenter, erAgentoppgave, utforAgentoppgave } from './agentoppgaver.js'
import { KJORINGSLENKE, lesRapport, registrer } from './registrering.js'

/** Arbeidsflyten som kan melde seg. */
export const OVERVAKING_ARBEIDSFLYT = '.github/workflows/verktoy-overvaking.yml'

/** Største melding som tas imot. */
export const MAKS_BYTE = 4_000_000

/** Ingen administrator kaller dette endepunktet; de bruker databasen fra appen. */
const ingenAdmin = async () => false

export async function behandleKildeovervaking(
  foresporsel: Request,
  miljo: Miljo,
  { githubsjekk, kall }: { githubsjekk?: Githubsjekk; kall?: Databasekall } = {},
): Promise<Response> {
  if (foresporsel.method !== 'POST') return svar(405, { feil: 'Bare POST.' })
  const utlost = await hvem(foresporsel, miljo, ingenAdmin, { arbeidsflyt: OVERVAKING_ARBEIDSFLYT, sjekk: githubsjekk })
  if (!utlost) return svar(401, { feil: 'Ikke tilgang.' })

  const raa = await foresporsel.text()
  if (raa.length > MAKS_BYTE) return svar(413, { feil: 'Meldingen er for stor.' })
  let innhold: Record<string, unknown>
  try {
    innhold = JSON.parse(raa) as Record<string, unknown>
  } catch {
    return svar(400, { feil: 'Meldingen er ikke JSON.' })
  }

  const databasen = kall ?? (() => {
    const klient = serverklient(miljo)
    return klient ? kallMot(klient) : null
  })()
  if (!databasen) return svar(500, { feil: 'Mangler oppkoblingen mot databasen.' })

  try {
    if (innhold?.oppgave === 'registrer') {
      const rapport = lesRapport(innhold.rapport)
      const lenke = innhold.lenke ?? null
      if (!rapport || (lenke !== null && (typeof lenke !== 'string' || !KJORINGSLENKE.test(lenke)))) {
        return svar(400, { feil: 'Rapporten eller lenken har en form endepunktet ikke kjenner.' })
      }
      return svar(200, await registrer(databasen, rapport, utlost, lenke))
    }
    if (erAgentoppgave(innhold?.oppgave)) {
      const argumenter = agentargumenter(innhold.oppgave, innhold)
      if (!argumenter) return svar(400, { feil: `Oppgaven ${innhold.oppgave} trenger ${Object.keys(AGENTOPPGAVER[innhold.oppgave].felt).join(', ')} og av, i riktig form.` })
      return svar(200, { oppgave: innhold.oppgave, svar: await utforAgentoppgave(databasen, innhold.oppgave, argumenter) })
    }
  } catch (e) {
    // En sak som ikke finnes, er endret siden eller ikke tillater oppgaven, eller en databasefeil; ingenting er endret.
    return svar(409, { feil: e instanceof Error ? e.message : String(e) })
  }
  return svar(400, { feil: `Ukjent oppgave; bruk registrer eller ${Object.keys(AGENTOPPGAVER).join(', ')}.` })
}
