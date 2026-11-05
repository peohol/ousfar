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

/** ChatGPTs merknad til kontrollen 04.11.2026 (HEAD 8322298 i #329), felles for de sju avtrykkene. */
const KONTROLL_2026_11_04 =
  'Avgrenset semantisk godkjenning av spørsmålskatalogen: ingen materiell meningsendring i spørsmål, kategorier eller avbildning. Gjelder bare språk, kategorisering og innmating av de samme kliniske betingelsene, ikke en ny godkjenning av doseringsregelen; doser, risikoavgjørelser, unntak og godkjenningsgrenser håndheves fortsatt av den godkjente regelversjonen.'

const kontrollert = (regel: string, regelversjon: number, fingeravtrykk: string, katalogavtrykk: string): Katalogkontroll => ({
  regel,
  regelversjon,
  fingeravtrykk,
  katalogavtrykk,
  dato: '2026-11-04',
  av: 'ChatGPT (via Peder)',
  merknad: KONTROLL_2026_11_04,
})

/**
 * Avtrykkene som er kontrollert. Escitalopram v13 er bevisst ikke med (regelen
 * spør «over 65 år», godkjenningen gjelder under 65 år; rettes i v14), og
 * heller ikke vortioksetin v12 og sertralin → mirtazapin v10, som ikke er
 * godkjent i denne kontrollen. De beholder reservevisningen. Bupropion og
 * agomelatin har ingen betingelser.
 */
export const KONTROLLERTE_KATALOGER: readonly Katalogkontroll[] = [
  kontrollert('depot-aripiprazol-maintena', 3, '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20', 'd8332fef6a65e76541133ea29ece36e4fd610b90425a11f3b9051e7bbb819428'),
  kontrollert('depot-paliperidon-xeplion', 3, '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf', 'f9c3e2226a4ed6dfd415db2df7c36981f7ad9d22f0f04ae970d1c3add5cb8267'),
  kontrollert('depot-risperidon-xeplion', 8, '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e', '699c4653569a26c396b180d3dc452a9855492c1fd4bf196f6009b0f5391aa4b7'),
  kontrollert('antipsykotikabytte-olanzapin-aripiprazol', 8, 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e', 'c864b7076a8be14a5637f5600ff44d1cb8107b5bf9fb4f29f3e6385e404989ee'),
  kontrollert('antipsykotikabytte-risperidon-aripiprazol', 8, '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870', '3829851fbeff48009199f69e0781e1402a0f92a272d6916fd7dc79fcbff6420d'),
  kontrollert('tillegg-valproat-lamotrigin', 2, '0a9213f31b5f428935fceeef41498a2999682631b1692749bb7ebe19c82639b8', '5705970026b34e98f4bd8f1e48ea1fe37717e85a0f9dbf4ec0f490987b79d4e9'),
  kontrollert('tillegg-litium-lamotrigin', 2, '786436a0ea8d115b7927a9a20ffabc736b59bc06c59117769551e5f75e89e44b', 'b4da785134bdad4212a1162bc4cf2dacf929bbb8e6bcef809c57841ffe49e264'),
]

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
