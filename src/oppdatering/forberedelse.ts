/**
 * Før siden lastes på nytt med en ny versjon: at den nye versjonen faktisk
 * kan hentes.
 *
 * «Oppdater nå» skal føre brukeren tilbake til siden hen var på, ikke til
 * «Fikk ikke hentet appen». Den kliniske delen av appen hentes bak
 * innloggingsveggen (`middleware.ts`), og etter en utrulling kan den første
 * forespørselen dit feile: økten i informasjonskapselen er gått ut mens
 * telefonen lå i ro, nettet er ikke helt oppe igjen, eller kanten har ikke
 * rukket å hente nøklene sine. Derfor hentes den nye kliniske delen her først,
 * mens den gamle versjonen fortsatt står. Når det går, ligger fila i
 * nettleserens mellomlager, og siden lastes på nytt. Avviser veggen økten,
 * fornyes den, og det prøves igjen. Går det ikke etter noen forsøk, blir den
 * gamle versjonen stående, så brukeren ikke mister siden.
 *
 * Hvor den kliniske delen ligger, står i `versjon.json` (`klinisk`). Et bygg
 * fra før feltet fantes, og en som ikke er logget inn (innloggingssiden
 * trenger ikke den kliniske delen), lastes på nytt uten å sjekke.
 */
import { erKonfigurert, klient } from '../auth/klient'
import type { Byggopplysninger } from './byggopplysninger'

/** Pausene før hvert forsøk, i millisekunder: fire forsøk, med sju sekunders pauser til sammen. */
export const PAUSER = [0, 1_000, 2_000, 4_000]

/**
 * Hvor lenge ett forsøk, med svaret og hele fila, kan ta før det avbrytes og
 * neste begynner. Romslig: fila er stor, og en kald kant kan bruke noen
 * sekunder på nøklene sine (`src/auth/veggnokler.ts`).
 */
export const FORSOKSFRIST = 20_000

/**
 * Hvor lenge oppslaget og fornyelsen av økten kan ta. Svarer ikke Supabase,
 * går sjekken videre i stedet for å la knappen stå på «Oppdaterer …».
 */
export const OKTFRIST = 5_000

/** Hvor lenge en vellykket sjekk gjelder, før den gjøres på nytt. */
export const KLAR_I = 60_000

export interface Klargjoringsavhengigheter {
  hent?: typeof fetch
  /** Om noen er logget inn. Fornyer økten når den snart går ut. */
  harOkt?: () => Promise<boolean>
  /** Fornyer økten, så informasjonskapselen veggen leser, er fersk. */
  fornyOkt?: () => Promise<void>
  vent?: (ms: number) => Promise<void>
  /** Fristen for hvert forsøk på å hente pakken (`FORSOKSFRIST`). */
  frist?: number
  /** Fristen for oppslaget og fornyelsen av økten (`OKTFRIST`). */
  oktfrist?: number
}

/**
 * Svaret fra `lofte`, eller `reserve` når det feiler eller ikke kommer innen
 * `ms`. Det som henger, får henge for seg selv; den som venter, går videre.
 */
export function innen<T>(lofte: Promise<T>, ms: number, reserve: T): Promise<T> {
  return new Promise<T>((ferdig) => {
    const tidsfrist = setTimeout(() => ferdig(reserve), ms)
    lofte.then(
      (verdi) => ferdig(verdi),
      () => ferdig(reserve),
    ).finally(() => clearTimeout(tidsfrist))
  })
}

async function harInnloggetOkt(): Promise<boolean> {
  if (!erKonfigurert()) return false
  const { data } = await klient().auth.getSession()
  return data.session !== null
}

async function fornyInnloggetOkt(): Promise<void> {
  await klient().auth.refreshSession()
}

/**
 * Sant når den nye versjonen kan tas i bruk: den kliniske delen er hentet,
 * eller det er ingenting å sjekke. Usant når den ikke lot seg hente.
 */
export async function forbered(
  bygg: Byggopplysninger,
  {
    hent = fetch,
    harOkt = harInnloggetOkt,
    fornyOkt = fornyInnloggetOkt,
    vent = (ms) => new Promise((ferdig) => setTimeout(ferdig, ms)),
    frist = FORSOKSFRIST,
    oktfrist = OKTFRIST,
  }: Klargjoringsavhengigheter = {},
): Promise<boolean> {
  if (!bygg.klinisk) return true
  // Lar det seg ikke avgjøre om noen er logget inn, også når svaret ikke
  // kommer, sjekkes det likevel.
  const innlogget = await innen(harOkt(), oktfrist, true)
  if (!innlogget) return true

  const adresse = new URL(bygg.klinisk, document.baseURI)
  for (const pause of PAUSER) {
    if (pause > 0) await vent(pause)
    // Fristen gjelder både svaret og hele fila: et forsøk som henger, skal ikke stoppe de neste.
    const avbrudd = new AbortController()
    const tidsfrist = setTimeout(() => avbrudd.abort(), frist)
    try {
      const svar = await hent(adresse, { credentials: 'same-origin', cache: 'no-cache', signal: avbrudd.signal })
      if (svar.ok) {
        // Hele fila, så den ligger i mellomlageret når siden lastes på nytt.
        await svar.arrayBuffer()
        return true
      }
      // Byttet ut av et enda nyere bygg: siden lastes på nytt med det.
      if (svar.status === 404) return true
      if (svar.status === 401) await innen(fornyOkt(), oktfrist, undefined)
    } catch {
      // Uten nett, over fristen eller avbrutt underveis: prøver igjen.
    } finally {
      clearTimeout(tidsfrist)
    }
  }
  return false
}

/** Klargjøringen av ett bygg, delt mellom meldingen og oppdateringen i stillhet. */
export interface Klargjoring {
  /** Starter sjekken, eller gir den som pågår eller nylig lyktes. */
  start: (bygg: Byggopplysninger) => Promise<boolean>
  /** Sant når bygget kan tas i bruk med én gang, uten å vente. */
  klar: (bygg: Byggopplysninger) => boolean
}

export function lagKlargjoring(
  avhengigheter: Klargjoringsavhengigheter = {},
  naa: () => number = Date.now,
): Klargjoring {
  let siste: { bygg: string; startet: number; svar: Promise<boolean>; klar?: boolean } | null = null
  const gjelder = (bygg: Byggopplysninger) =>
    siste !== null && siste.bygg === bygg.bygg && siste.klar !== false && naa() - siste.startet < KLAR_I

  return {
    start(bygg) {
      if (siste && gjelder(bygg)) return siste.svar
      const denne: NonNullable<typeof siste> = { bygg: bygg.bygg, startet: naa(), svar: forbered(bygg, avhengigheter) }
      void denne.svar.then((klar) => {
        denne.klar = klar
      })
      siste = denne
      return denne.svar
    },
    klar: (bygg) => !bygg.klinisk || (gjelder(bygg) && siste?.klar === true),
  }
}

/** Klargjøringen appen bruker. */
export const klargjoring = lagKlargjoring()
