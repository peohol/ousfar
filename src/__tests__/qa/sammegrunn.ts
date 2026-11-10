/**
 * Om appen og den lokale kjøringen gir samme grunn når ingen av dem gir en
 * plan (appkontrollen, `docs/verktøy-qa-appkontroll.md`). Egen modul så
 * sammenligningen kan prøves i `npm test` uten nettleser.
 */
import { reglerMedPlan } from '../../verktoy/flyt'
import { betingelserFor, harKontrollertKatalog } from '../../verktoy/flyt/katalogkontroll'
import type { Forlopsresultat } from './brukerforlop'

/** Tallene i en tekst, som «10, 20 mg» eller «10 og 20 mg». */
const tallI = (t: string) => (t.match(/\d+(?:,\d+)?/g) ?? []).join(' ')

/** Forhåndskontrollens stopp når ingen godkjent regel for valget kan gi en komplett plan (`forhandskontroll`, kode `ikke_komplett`). */
const INGEN_KOMPLETT_REGEL = 'Ingen godkjent regel gir en komplett plan for dette valget ennå.'

/**
 * Katalogens forklaring for et forhold forløpet svarer ja på, når den står
 * ordrett i appen. Med kontrollert katalog stopper flyten ved spørsmålet,
 * før motoren regner (spor B), mens den lokale kjøringen gir svaret rett til
 * motoren og stopper senere eller med en annen tekst. Bare forklaringene til
 * forhold forløpet faktisk har svart ja på, telles, så en forklaring for et
 * annet forhold gir avvik.
 */
function katalogensForklaring(r: Forlopsresultat, app: string): string | undefined {
  if (!r.regel || !harKontrollertKatalog(r.regel)) return undefined
  const ja = new Set(
    Object.entries({ ...r.skjema?.pasientforhold, ...r.skjema?.svar })
      .filter(([, v]) => v === true)
      .map(([id]) => id),
  )
  const treff = betingelserFor(r.regel)
    .filter((b) => b.type !== 'bekreftelse' && ja.has(b.id))
    .find((b) => [b.forklaring, ...(b.fra ?? []).map((k) => k.forklaring)].some((t) => t && app.includes(t)))
  return treff && `katalogens forklaring for svaret ja (${treff.id})`
}

/**
 * Om steg 4 i appen gir samme grunn som den lokale kjøringen, for hver mulig
 * grunn for seg (aldri en generisk tekst som kunne dekke flere):
 * - motorens egen stoppgrunn står ordrett i appen (bak «Vis detaljer» når
 *   beregningen er kjørt);
 * - flyten stopper ved et spørsmål: katalogens forklaring for et forhold
 *   forløpet har svart ja på, står ordrett i appen ({@link katalogensForklaring});
 * - forhåndskontrollen stopper på startdosen: lokalt stopper motoren på
 *   startdosen, og appen viser de samme tillatte startdosene;
 * - forhåndskontrollen stopper fordi ingen godkjent regel for valget kan gi en
 *   komplett plan: lokalt finnes det heller ingen slik regel for valget
 *   (`reglerMedPlan`), uavhengig av hvor motoren stopper.
 * Gir grunnen appen viser, eller `undefined` når den ikke er den samme.
 */
export function sammeGrunn(r: Forlopsresultat, app: string): string | undefined {
  const eksakt = r.vist.find((l) => app.includes(l))
  if (eksakt) return 'motorens tekst'
  const katalog = katalogensForklaring(r, app)
  if (katalog) return katalog
  const vist = /Regelen gjelder bare startdoser på ([^.]*)\./.exec(app)
  if (vist)
    return r.vist.some((l) => {
      const start = /^Startdosen [\d,]+ mg er utenfor det regelen gjelder for \(([^)]*)\)/.exec(l)
      return start && tallI(start[1]!) === tallI(vist[1]!)
    })
      ? 'de samme tillatte startdosene'
      : undefined
  if (app.includes(INGEN_KOMPLETT_REGEL))
    return r.verktoy && reglerMedPlan({ verktoy: r.verktoy, valg: r.forlop.valg }).length === 0 ? 'ingen regel for valget gir komplett plan, også lokalt' : undefined
  return undefined
}
