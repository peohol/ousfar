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
 * - En instans uten nøkler prøver flere ganger før den gir opp.
 * - En instans med nøkler henter dem på nytt når de er eldre enn
 *   `FERSKE_I`, med ett forsøk. Svarer ikke Supabase, brukes nøklene den
 *   har, så lenge de ikke er eldre enn `BRUKBARE_I`.
 * - Kommer et token med en nøkkel instansen ikke kjenner — Supabase har
 *   byttet nøkler — hentes settet på nytt, men ikke oftere enn `NY_NOKKEL_ETTER`.
 *
 * Nøklene er offentlige; det er signaturen på tokenet som slipper noen inn, og
 * den kontrolleres alltid. Det eneste de gamle nøklene kan gi, er at en nøkkel
 * Supabase nettopp har trukket tilbake, fortsatt godtas mens Supabase ikke
 * svarer, og høyst `BRUKBARE_I`.
 */
import { createLocalJWKSet, errors, type JSONWebKeySet, type JWTVerifyGetKey } from 'jose'

/** Hvor lenge et hentet nøkkelsett brukes uten å spørre Supabase igjen. */
export const FERSKE_I = 10 * 60_000

/** Hvor lenge et nøkkelsett kan brukes når Supabase ikke svarer. */
export const BRUKBARE_I = 24 * 60 * 60_000

/** Hvor ofte et ukjent nøkkelnavn får settet hentet på nytt. */
export const NY_NOKKEL_ETTER = 30_000

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

  /** Én nedlasting om gangen; forespørsler som kommer samtidig, venter på den samme. */
  const oppdater = (forsok: number) =>
    (pagaende ??= lastNed(forsok).finally(() => {
      pagaende = null
    }))

  const alder = () => (lokale ? naa() - lokale.hentet : Infinity)

  return async (hode, token) => {
    if (alder() > FERSKE_I) {
      try {
        await oppdater(lokale ? 1 : FORSOK_UTEN_NOKLER)
      } catch (feil) {
        if (alder() > BRUKBARE_I) throw feil
      }
    }
    const brukt = lokale
    if (!brukt) throw new Error('Ingen nøkler å kontrollere økten med')
    try {
      return await brukt.sett(hode, token)
    } catch (feil) {
      if (!(feil instanceof errors.JWKSNoMatchingKey) || alder() < NY_NOKKEL_ETTER) throw feil
      await oppdater(FORSOK_UTEN_NOKLER)
      return (lokale ?? brukt).sett(hode, token)
    }
  }
}
