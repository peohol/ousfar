/**
 * Katalogavtrykk og kontrollerte avtrykk (S5b og §4.4 i
 * `docs/verktøy-brukervennlighet-2026-11.md`). Avbildningen fra katalogen
 * til motorens felt er bundet til kontrollen på samme måte som en klinisk
 * godkjenning: for hver regelversjon beregnes et avtrykk av
 * katalogoppføringene regelen bruker, og katalogen brukes bare når nøyaktig
 * det avtrykket er ført som kontrollert for nøyaktig den regelversjonen og
 * det regelfingeravtrykket. Ellers brukes den trygge standarden: hver
 * betingelse med regelens egen tekst, og hver bekreftelse som avkrysning.
 *
 * Et avtrykk føres her først når ChatGPT har godkjent tabellen i
 * `docs/verktøy-sporsmalskatalog.md` med nøyaktig de avtrykkene den viser
 * for regelversjonen. Det første settet føres i samme PR som katalogen
 * (#329), før merge; senere endringer av katalogen føres på samme måte.
 */
import { fingeravtrykk, kanonisk, sha256 } from '../regler/godkjenning'
import type { Regel } from '../regler/modell'
import { KATALOGBETINGELSER, KATALOGSPORSMAL, SVARSETT, type Katalogbetingelse, type Katalogsporsmal } from './sporsmal'

/** Et katalogavtrykk som er kontrollert for én regelversjon. */
export interface Katalogkontroll {
  regel: string
  regelversjon: number
  /** Regelens fingeravtrykk da katalogen ble kontrollert. */
  fingeravtrykk: string
  katalogavtrykk: string
  dato: string
  av: string
  merknad: string
}

/** Avtrykkene som er kontrollert. Tom til ChatGPT har kontrollert katalogtabellen. */
export const KONTROLLERTE_KATALOGER: readonly Katalogkontroll[] = []

/** Katalogoppføringene for regelens betingelser, i regelens rekkefølge. */
export const betingelserFor = (r: Pick<Regel, 'id'>, katalog: readonly Katalogbetingelse[] = KATALOGBETINGELSER): Katalogbetingelse[] => katalog.filter((b) => b.regel === r.id)

/** Spørsmålene betingelsene bruker, også dem de bare vises etter, i katalogens rekkefølge. */
export function sporsmalFor(betingelser: readonly Katalogbetingelse[], sporsmal: readonly Katalogsporsmal[] = KATALOGSPORSMAL): Katalogsporsmal[] {
  const ider = new Set(betingelser.flatMap((b) => (b.fra ?? []).map((k) => k.sporsmal)))
  for (let endret = true; endret; ) {
    endret = false
    for (const s of sporsmal) {
      if (ider.has(s.id) && s.vises && !ider.has(s.vises.sporsmal)) {
        ider.add(s.vises.sporsmal)
        endret = true
      }
    }
  }
  return sporsmal.filter((s) => ider.has(s.id))
}

/**
 * Avtrykket av katalogen slik den gjelder regelen: betingelsene med kategori,
 * avbildning, kombinasjon og forklaring, og spørsmålene de bruker med tekst,
 * hjelp, gruppe, svar og betinget visning. Regelens egne tekster for
 * betingelsene er med, så en endret regeltekst også gir et nytt avtrykk.
 */
export function katalogavtrykk(r: Regel, katalog: readonly Katalogbetingelse[] = KATALOGBETINGELSER, sporsmal: readonly Katalogsporsmal[] = KATALOGSPORSMAL): string {
  const betingelser = betingelserFor(r, katalog)
  const regeltekster = {
    sporsmal: (r.sporsmal ?? []).map((s) => [s.id, s.tekst]),
    unntak: r.unntak.map((u) => [u.id, u.tekst]),
    bekreftelser: r.bekreftelser.map((b) => [b.id, b.tekst, b.ved ?? null]),
  }
  const brukte = sporsmalFor(betingelser, sporsmal).map((s) => ({ ...s, alternativer: SVARSETT[s.svar] }))
  return sha256(kanonisk({ regel: r.id, versjon: r.versjon, regeltekster, betingelser, sporsmal: brukte }))
}

/**
 * Om katalogen kan brukes for regelen: et avtrykk er ført som kontrollert for
 * nøyaktig denne regelversjonen og dette fingeravtrykket, og avtrykket stemmer
 * med katalogen slik den er nå.
 */
export function katalogGjelder(r: Regel, kontrollerte: readonly Katalogkontroll[] = KONTROLLERTE_KATALOGER, katalog?: readonly Katalogbetingelse[], sporsmal?: readonly Katalogsporsmal[]): boolean {
  const k = kontrollerte.filter((x) => x.regel === r.id && x.regelversjon === r.versjon)
  if (k.length === 0) return false
  const fa = fingeravtrykk(r)
  const avtrykk = katalogavtrykk(r, katalog, sporsmal)
  return k.some((x) => x.fingeravtrykk === fa && x.katalogavtrykk === avtrykk)
}

/** Om regelen har en kontrollert katalog i appen (avtrykket i {@link KONTROLLERTE_KATALOGER}); ellers gjelder reservevisningen (S5, plan §11 kriterium 2). */
export const harKontrollertKatalog = (r: Regel): boolean => katalogGjelder(r)
