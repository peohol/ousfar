/**
 * Katalogen fra P2a ført som kontrollert bare i testen: appen slik den blir
 * når ChatGPT har kontrollert katalogen og avtrykkene er ført i
 * `KONTROLLERTE_KATALOGER`. Til da bruker hver regel reservevisningen i
 * appen; en sidetest som gjelder spørsmålene i katalogen, fører kandidatene
 * slik:
 *
 * ```ts
 * vi.mock('../verktoy/flyt/katalogkontroll', async (original) => ({ ...(await original()), KONTROLLERTE_KATALOGER: [] }))
 * // i describe-blokken som gjelder katalogen:
 * beforeAll(forKatalogkandidater)
 * afterAll(utenKatalogkandidater)
 * ```
 *
 * Den mockede listen er tom som appens egen, så resten av filen tester appen
 * slik den er.
 *
 * Når avtrykkene er ført i appen, er kandidatene de samme, og mocken kan tas
 * bort.
 */
import * as katalogkontroll from '../../verktoy/flyt/katalogkontroll'
import { KATALOGBETINGELSER } from '../../verktoy/flyt/sporsmal'
import { fingeravtrykk, godkjenningsfeil } from '../../verktoy/regler/godkjenning'
import { REGELSETT } from '../../verktoy/tilgjengelighet'

/** Ett kontrollert avtrykk per godkjent regel med katalog, for regelens versjon og fingeravtrykk nå. */
export const katalogkandidater = (): katalogkontroll.Katalogkontroll[] =>
  REGELSETT.regler
    .filter((r) => godkjenningsfeil(r).length === 0 && KATALOGBETINGELSER.some((b) => b.regel === r.id))
    .map((r) => ({ regel: r.id, regelversjon: r.versjon, fingeravtrykk: fingeravtrykk(r), katalogavtrykk: katalogkontroll.katalogavtrykk(r), dato: '2026-11-07', av: 'Test', merknad: 'Bare i testen.' }))

/** Fører kandidatene i den mockede listen (se over). Appens egen liste er fryst, så uten mocken feiler dette i stedet for å endre den. */
export function forKatalogkandidater() {
  const liste = katalogkontroll.KONTROLLERTE_KATALOGER as katalogkontroll.Katalogkontroll[]
  if (Object.isFrozen(liste)) throw new Error('KONTROLLERTE_KATALOGER er ikke mocket; se src/__tests__/hjelp/katalogkandidater.ts')
  liste.splice(0, liste.length, ...katalogkandidater())
}

/** Tømmer den mockede listen igjen, som appens egen. */
export function utenKatalogkandidater() {
  ;(katalogkontroll.KONTROLLERTE_KATALOGER as katalogkontroll.Katalogkontroll[]).splice(0)
}
