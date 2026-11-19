/**
 * Varslene om nye chatmeldinger gjennom appens klient (docs/chatvarsler.md):
 * abonnementet i databasen, nøkkelen og utsendingen fra Edge-funksjonen
 * `chatvarsel`, og enheten (`enhet.ts`) koblet til nettleseren.
 */
import { klient } from '../auth/klient'
import { lagChatvarsler, type Varselserver } from './enhet'

const FUNKSJON = 'chatvarsel'

async function rpc(navn: string, argumenter: Record<string, unknown>): Promise<void> {
  const { error } = await klient().rpc(navn, argumenter)
  if (error) throw new Error('Kunne ikke lagre valget. Prøv igjen.')
}

export const varselserver: Varselserver = {
  nokkel: async () => {
    const { data, error } = await klient().functions.invoke<{ nokkel?: unknown }>(FUNKSJON, { body: { handling: 'nokkel' } })
    if (error || typeof data?.nokkel !== 'string') throw new Error('Varsler kan ikke slås på akkurat nå. Prøv igjen senere.')
    return data.nokkel
  },
  lagre: (a) => rpc('lagre_pushabonnement', { endepunkt: a.endepunkt, p256dh: a.p256dh, auth: a.auth }),
  slett: (endepunkt) => rpc('slett_pushabonnement', { endepunkt }),
}

/** Varslene på denne enheten, eller `null` utenfor en nettleser. */
export const chatvarsler =
  typeof window === 'undefined'
    ? null
    : lagChatvarsler({
        navigator: window.navigator,
        vindu: window,
        lager: (() => {
          try {
            return window.localStorage
          } catch {
            return null
          }
        })(),
        server: varselserver,
        grunnadresse: document.baseURI,
      })

/**
 * Hvor lenge appen venter etter en sending før den ber om varslene: en
 * mottaker som har samtalen åpen, rekker å lese meldingen først og får da
 * ikke noe varsel. Flere sendinger i den tiden gir ett kall.
 */
export const VENTETID_MS = 1500

let planlagt: ReturnType<typeof setTimeout> | null = null

/** Ber Edge-funksjonen sende varslene om den innloggedes nye meldinger. Feil gir bare ingen varsler. */
export function varsleOmNyeMeldinger(): void {
  if (planlagt !== null) return
  planlagt = setTimeout(() => {
    planlagt = null
    klient()
      .functions.invoke(FUNKSJON, { body: { handling: 'send' } })
      .catch(() => undefined)
  }, VENTETID_MS)
}

/** `send` som også ber om varslene etter at meldingen er lagret. */
export function medVarsler<A extends unknown[], T>(send: (...a: A) => Promise<T>): (...a: A) => Promise<T> {
  return async (...a) => {
    const melding = await send(...a)
    varsleOmNyeMeldinger()
    return melding
  }
}

/**
 * Før utlogging: abonnementet på enheten avsluttes og slettes, så den som har
 * logget ut, ikke får varsler her. Venter høyst tre sekunder; utloggingen
 * går uansett. Et abonnement som ble stående, avsluttes ved neste innlogging
 * på enheten, eller slettes når push-tjenesten sier at det er borte.
 */
export async function avsluttVarslerVedUtlogging(): Promise<void> {
  if (!chatvarsler) return
  await Promise.race([chatvarsler.vedUtlogging().catch(() => undefined), new Promise((ferdig) => setTimeout(ferdig, 3000))])
}
