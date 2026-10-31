/**
 * `/api/kildeovervaking`: der kildeovervåkingen i GitHub Actions melder seg
 * (P12.1, `docs/verktøy-p12-overvaking.md` §5). Bare arbeidsflyten
 * `verktoy-overvaking.yml` på main slipper inn, med et OIDC-token GitHub har
 * utstedt for kjøringen; ingen hemmelighet å lagre. En administrator bruker
 * vinduet «Kildeovervåking» i appen, som går rett mot databasen.
 *
 * - `{ "oppgave": "registrer", "rapport": <funn.json>, "lenke": <kjøringen> }`
 *   melder en kjøring og funnene som krever vurdering.
 * - `{ "oppgave": "teknisk_vurdering", "funn": <nøkkel>, "vurdering": <tekst>, "av": <hvem> }`
 *   skriver den tekniske vurderingen av et åpent funn, når Claude (eller noen
 *   andre med tilgang til repoet) har vurdert det.
 *
 * Endepunktet endrer, godkjenner eller sperrer ingen regel.
 */
import { kallMot, type Databasekall } from '../../legemiddeldata/lager.js'
import { hvem, serverklient, svar, type Githubsjekk, type Miljo } from '../../server/tilgang.js'
import { KJORINGSLENKE, lesRapport, registrer, tekniskFraAgent } from './registrering.js'

/** Arbeidsflyten som kan melde seg. */
export const OVERVAKING_ARBEIDSFLYT = '.github/workflows/verktoy-overvaking.yml'

/** Største melding som tas imot. */
export const MAKS_BYTE = 4_000_000

/** Ingen administrator kaller dette endepunktet; de bruker databasen fra appen. */
const ingenAdmin = async () => false

const tekst = (x: unknown, min: number, maks: number): x is string => typeof x === 'string' && x.trim().length >= min && x.trim().length <= maks

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
    if (innhold?.oppgave === 'teknisk_vurdering') {
      const { funn, vurdering, av } = innhold
      if (!tekst(funn, 3, 300) || !tekst(vurdering, 5, 5000) || !tekst(av, 2, 200)) {
        return svar(400, { feil: 'Oppgi funnets nøkkel, vurderingen (5–5000 tegn) og hvem som har vurdert.' })
      }
      return svar(200, { funn: await tekniskFraAgent(databasen, funn.trim(), vurdering, av) })
    }
  } catch (e) {
    // Et funn som ikke finnes eller allerede er vurdert, eller en databasefeil; ingenting er endret.
    return svar(409, { feil: e instanceof Error ? e.message : String(e) })
  }
  return svar(400, { feil: 'Ukjent oppgave; bruk «registrer» eller «teknisk_vurdering».' })
}
