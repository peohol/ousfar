/**
 * Henting av én kildeadresse hos Psychiatrienet for kildeimporten (P3 i
 * `docs/verktøy-utviklingsplan.md`).
 *
 * Et svar som sier noe om siden (200, 404, 410 …), er et resultat og
 * registreres i arkivet. Et forbigående svar (tidsavbrudd, «for mange
 * forespørsler», serverfeil) eller et brudd i forbindelsen sier ingenting om
 * siden: det prøves på nytt med økende pause, og vedvarer det, kaster
 * hentingen, så innhentingen stopper før noe skrives og en midlertidig feil
 * aldri blir arkivert som et hull i kilden.
 */

export interface Kildesvar {
  status: number
  /** Adressen etter videresending. */
  endelig: string
  html: string
  hentet: string
}

export interface Hentevalg {
  /** `fetch`, eller en erstatning i testene. */
  hent?: typeof fetch
  vent?: (ms: number) => Promise<void>
  /** Antall forsøk før hentingen gir opp. */
  forsok?: number
  /** Pausen før andre forsøk; dobles for hvert forsøk etter det. */
  pause?: number
  /** Når svaret ble hentet; et fast tidspunkt i testene. */
  na?: () => string
}

/** Svar som ikke sier noe om siden, bare om serveren akkurat nå. */
export function erForbigaende(status: number): boolean {
  return status === 408 || status === 425 || status === 429 || status >= 500
}

export class ForbigaendeFeil extends Error {}

const standardVent = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))
const standardNa = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

export async function hentKilde(url: string, valg: Hentevalg = {}): Promise<Kildesvar> {
  const { hent = fetch, vent = standardVent, forsok = 5, pause = 2000, na = standardNa } = valg
  let siste = ''
  for (let i = 1; i <= forsok; i++) {
    if (i > 1) await vent(pause * 2 ** (i - 2))
    try {
      const svar = await hent(url, { redirect: 'follow' })
      const html = await svar.text()
      if (!erForbigaende(svar.status)) return { status: svar.status, endelig: svar.url || url, html, hentet: na() }
      siste = `svarte ${svar.status}`
    } catch (e) {
      siste = `feilet (${e instanceof Error ? e.message : String(e)})`
    }
  }
  throw new ForbigaendeFeil(`${url} ${siste} ${forsok} ganger på rad; innhentingen er stoppet uten å skrive noe`)
}
