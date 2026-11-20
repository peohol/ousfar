/**
 * Nøklene innloggingsveggen kontrollerer øktene med (`middleware.ts`).
 *
 * Supabase legger de offentlige nøklene ut som et nøkkelsett. Kanten henter
 * det, men kan ikke stå og falle med at Supabase svarer akkurat da: hver ny
 * instans på kanten må hente nøklene før den kan slippe noen inn, og rett
 * etter en utrulling er alle instansene nye. Svarte ikke Supabase innen fem
 * sekunder i det øyeblikket, avviste veggen en gyldig økt, og brukeren som
 * nettopp hadde trykket «Oppdater nå», fikk «Fikk ikke hentet appen».
 *
 * Derfor:
 *
 * - En instans uten nøkler prøver flere ganger før den gir opp, og mislykkes
 *   det, prøver den igjen tidligst etter `KALD_PAUSE`.
 * - En instans med nøkler fornyer dem når de er eldre enn `FERSKE_I`, med ett
 *   forsøk. Svarer ikke Supabase, brukes nøklene den har, men aldri når de er
 *   eldre enn `BRUKBARE_I`: det er like lenge som biblioteket (jose) alltid
 *   har brukt et hentet nøkkelsett uten å spørre igjen, så grensen for hvor
 *   lenge en nøkkel Supabase har trukket tilbake kan godtas, er den samme som
 *   før. Det som er nytt, er at fornyelsen begynner tidligere, så et øyeblikk
 *   uten svar ikke stenger noen ute.
 * - Kommer et token med en nøkkel instansen ikke kjenner — Supabase har
 *   byttet nøkler — hentes settet på nytt.
 * - Uansett grunn spørres Supabase ikke oftere enn hvert `NY_HENTING_ETTER`
 *   etter forrige forsøk, også når det mislyktes. Da kan verken et Supabase
 *   som ikke svarer eller tokens med oppdiktede nøkkelnavn gi en strøm av
 *   forespørsler, og forespørslene venter ikke på nye forsøk som ikke kan
 *   lykkes.
 */
import { createLocalJWKSet, errors, type JSONWebKeySet, type JWTVerifyGetKey } from 'jose'

/** Hvor lenge et hentet nøkkelsett brukes før det fornyes. */
export const FERSKE_I = 5 * 60_000

/**
 * Hvor lenge et nøkkelsett høyst brukes, også når Supabase ikke svarer på
 * fornyelsen: jose sin `cacheMaxAge`, som `createRemoteJWKSet` brukte før.
 */
export const BRUKBARE_I = 10 * 60_000

/** Supabase spørres ikke oftere enn dette etter forrige forsøk, når instansen har nøkler. */
export const NY_HENTING_ETTER = 30_000

/** Det samme for en instans uten nøkler, som ikke kan slippe noen inn før den får dem. */
export const KALD_PAUSE = 5_000

/** Forsøk når instansen ikke har noen nøkler ennå. */
export const FORSOK_UTEN_NOKLER = 3

/** Hvor lenge ett forsøk kan ta. */
export const TIDSAVBRUDD = 4_000

/** Ventetiden før hvert nytt forsøk, i millisekunder. */
const PAUSE = [250, 750]

interface Avhengigheter {
  hent?: typeof fetch
  naa?: () => number
  vent?: (ms: number) => Promise<void>
}

function erNokkelsett(data: unknown): data is JSONWebKeySet {
  const nokler = (data as { keys?: unknown } | null)?.keys
  return Array.isArray(nokler) && nokler.length > 0 && nokler.every((n) => typeof n === 'object' && n !== null)
}

/**
 * Nøkkeloppslaget `jwtVerify` trenger, for nøkkelsettet på `adresse`.
 * Holdes i instansen og deles av alle forespørslene den tar.
 */
export function veggnokler(
  adresse: URL,
  {
    hent = fetch,
    naa = Date.now,
    vent = (ms) => new Promise((ferdig) => setTimeout(ferdig, ms)),
  }: Avhengigheter = {},
): JWTVerifyGetKey {
  let lokale: { sett: ReturnType<typeof createLocalJWKSet>; hentet: number } | null = null
  let pagaende: Promise<void> | null = null
  let sistForsokt = -Infinity

  async function lastNed(forsok: number): Promise<void> {
    let sisteFeil: unknown
    for (let runde = 0; runde < forsok; runde++) {
      if (runde > 0) await vent(PAUSE[runde - 1] ?? PAUSE[PAUSE.length - 1] ?? 0)
      try {
        const svar = await hent(adresse, {
          headers: { accept: 'application/json' },
          signal: AbortSignal.timeout(TIDSAVBRUDD),
        })
        if (!svar.ok) throw new Error(`Nøkkelsettet svarte ${svar.status}`)
        const data: unknown = await svar.json()
        if (!erNokkelsett(data)) throw new Error('Nøkkelsettet var tomt eller uleselig')
        lokale = { sett: createLocalJWKSet(data), hentet: naa() }
        return
      } catch (feil) {
        sisteFeil = feil
      }
    }
    throw sisteFeil
  }

  /**
   * Henter settet, når det er lenge nok siden forrige forsøk. Én henting om
   * gangen; forespørsler som kommer samtidig, venter på den samme. Sant når
   * det ble forsøkt (eller et forsøk pågikk); feil kastes videre.
   */
  async function oppdater(forsok: number, pause: number): Promise<boolean> {
    if (!pagaende) {
      if (naa() - sistForsokt < pause) return false
      sistForsokt = naa()
      pagaende = lastNed(forsok).finally(() => {
        pagaende = null
      })
    }
    await pagaende
    return true
  }

  const alder = () => (lokale ? naa() - lokale.hentet : Infinity)

  return async (hode, token) => {
    if (alder() > FERSKE_I) {
      try {
        await (lokale ? oppdater(1, NY_HENTING_ETTER) : oppdater(FORSOK_UTEN_NOKLER, KALD_PAUSE))
      } catch {
        // Nøklene som finnes, kan fortsatt brukes, innen grensen under.
      }
    }
    const brukt = lokale
    if (!brukt || alder() > BRUKBARE_I) throw new Error('Ingen gyldige nøkler å kontrollere økten med')
    try {
      return await brukt.sett(hode, token)
    } catch (feil) {
      if (!(feil instanceof errors.JWKSNoMatchingKey)) throw feil
      // Kanskje har Supabase byttet nøkler. Ett forsøk, og ikke for ofte.
      if (!(await oppdater(1, NY_HENTING_ETTER).catch(() => false))) throw feil
      const ny = lokale
      if (!ny || ny === brukt) throw feil
      return ny.sett(hode, token)
    }
  }
}
