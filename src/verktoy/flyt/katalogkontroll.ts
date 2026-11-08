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

/**
 * ChatGPTs merknad til kontrollen 07.11.2026 av katalogen fra P2a (#345, HEAD
 * 02585a4), felles for de tolv avtrykkene.
 */
const KONTROLL_2026_11_07 =
  'Avgrenset semantisk godkjenning: ingen utestående menings- eller avbildningsfeil i katalogen for de 12 aktive reglene. Gjelder kun spørsmålsformuleringer, betingelser, stoppforklaringer og tilhørende motorinndata for de eksakte regel- og katalogavtrykkene, ikke ny godkjenning av doser, kliniske strategier, utvidet omfang eller senere katalogendringer.'

const kontrollert = (regel: string, regelversjon: number, fingeravtrykk: string, katalogavtrykk: string): Katalogkontroll => ({
  regel,
  regelversjon,
  fingeravtrykk,
  katalogavtrykk,
  dato: '2026-11-07',
  av: 'ChatGPT (via Peder)',
  merknad: KONTROLL_2026_11_07,
})

/**
 * Avtrykkene som er kontrollert, nøyaktig slik `docs/verktøy-sporsmalskatalog.md`
 * viser dem. Escitalopram v13 er erstattet av v14 i appen og er ikke med. En
 * endring i katalogen eller regelen gir et nytt avtrykk, og regelen viser da
 * reservevisningen (S5) til det nye avtrykket er kontrollert og ført; denne
 * godkjenningen gjenbrukes ikke. Avtrykkene ChatGPT godkjente 04.11.2026 (#329)
 * gjaldt katalogen før P2a og er erstattet.
 */
export const KONTROLLERTE_KATALOGER: readonly Katalogkontroll[] = Object.freeze([
  kontrollert('kryssnedtrapping-sertralin-mirtazapin', 10, '12801aa22a0ca2a576b9ba737d5d5cb52db3a73dc1b437bde7f20a896214c81a', 'ecb2ff7f8eab6822a8168bb32cf874bf7bf0c99dd88e238ad3a4a5a736b1c794'),
  kontrollert('depot-aripiprazol-maintena', 3, '04d1debe48f02ea03a31aab3d7cd5cdeb15c56d4b43797bda353f3d857297f20', '8b42edb2bbfe9df0697e7db4595e05d9c1260525e24b50747cdb246474fdac12'),
  kontrollert('depot-paliperidon-xeplion', 3, '21a335eec8c3816ee21627ceec3197e52957ccdf99cdbfaa00a3ca3cb5987bdf', 'cb84d59b5fa95c77bd5adea92a0c37e56979e8e69bf8f2e5000f244741991c99'),
  kontrollert('seponering-vortioksetin', 12, 'b28dec93f5ede06c6565e1ce5d6aa62606c69250f1a9088dae0c57d3121101f3', '69b7d1907082e2498e3b30018a5f31300b11d1af741f1b6fc2158279c9ec9ddd'),
  kontrollert('seponering-escitalopram-tabletter-og-draper', 14, '01b2fb560a8defe0114f9552d619bc6bf15e27b07fa6352d6331d9beb500721f', '2e9c28244fff4aa16e038f94873fd18fc4ce3991960683379dabf1c4c1f2158d'),
  kontrollert('bytte-escitalopram-sertralin', 2, 'c0bf6c61e38c437d4c8e41d36653fe1ce3b1a9c1dfb0f9d9af603e9f7dd0289c', '225e7e10dddb64c5fb5d29b6cf2785d587fa1288cbb37ed0cfeed415b543e5c3'),
  kontrollert('bytte-citalopram-sertralin', 2, '2b64ff9e383e6f9462600c4921a9dd7828ea2adc4ab404646f142ce306a57aa8', 'fc34ff396c1fe9c4611426f9eba32cb09248aabdf0f36171ced2e579aea6fe12'),
  kontrollert('depot-risperidon-xeplion', 8, '1672334c468f28cf181aa4d786370e60f3f232f76f63d374e0c505d847ab184e', '4436def26dad4887ada66b80c99aade860287b4a4c85f273f3114bc8db1d9b26'),
  kontrollert('antipsykotikabytte-olanzapin-aripiprazol', 8, 'f141a13a9e9368542d7719cfb0abea7cfb77a41d7d89248e5f9e1d70e0aa5f5e', '53de23f5cbd195cde4f1e7dbd555baf368a01fa2cf05e32d2040cfa57070533e'),
  kontrollert('antipsykotikabytte-risperidon-aripiprazol', 8, '866ac93c58fb921c78cd71518ec91637cb31a175b7a9a480552fcebe54cca870', 'a26697d8036f71c7f7befac403c7724fef83187ebd3ed4c33253d587c306854d'),
  kontrollert('tillegg-valproat-lamotrigin', 2, '0a9213f31b5f428935fceeef41498a2999682631b1692749bb7ebe19c82639b8', '35c45eb8dbdb4411dfce0ade5f6438c7653d7f775aa7e7fba295f11c748d9d54'),
  kontrollert('tillegg-litium-lamotrigin', 2, '786436a0ea8d115b7927a9a20ffabc736b59bc06c59117769551e5f75e89e44b', '699ce72181ee0ed3ff667918a3f578c6b77ff8196f1437301906561757bbb05b'),
])

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
