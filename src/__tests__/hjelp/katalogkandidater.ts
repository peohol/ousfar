/**
 * Avtrykkene katalogen har nå, for hver godkjent regel med katalog: det som
 * står i `KONTROLLERTE_KATALOGER` når katalogen er kontrollert, også for en
 * regel som ikke er i bruk (escitalopram v13). Testene bruker dem til å føre
 * katalogen som kontrollert i en test, og til å se at appens avtrykk stemmer
 * med katalogen slik den er.
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
