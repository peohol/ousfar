/**
 * Varslene om nye chatmeldinger på denne enheten (docs/chatvarsler.md):
 * tjenestearbeideren, tillatelsen i nettleseren og abonnementet hos
 * push-tjenesten, og hvem på enheten det hører til.
 *
 * Valget er per enhet: å slå på her gir varsler bare i denne nettleseren.
 * Abonnementet avsluttes når brukeren slår av eller logger ut, og når en
 * annen konto logger inn i den samme nettleseren.
 *
 * Nettleseren nås bare gjennom `Enhetsavhengigheter`, så logikken kan prøves
 * uten en ekte nettleser.
 */

/** Hvordan det står til med varslene på enheten. */
export type Varseltilstand =
  /** Nettleseren kan ikke vise varsler fra appen. */
  | 'ustottet'
  /** iPhone og iPad: varsler krever at appen er lagt til på Hjem-skjermen og åpnet derfra. */
  | 'hjemskjerm'
  /** Brukeren har sagt nei til varsler for siden i nettleseren. */
  | 'blokkert'
  | 'av'
  | 'pa'

/** Det tjenestearbeideren sender når et varsel er trykket på (`public/chatvarsler.js`). */
export const APNE_MELDING = 'ousfar-chatvarsel-apne'

/** Fila med tjenestearbeideren, ved siden av `index.html`. */
export const TJENESTEARBEIDER = 'chatvarsler.js'

/** Nøkkelen i det lokale lageret for hvilken konto abonnementet på enheten hører til. */
export const EIERNOKKEL = 'ousfar/chatvarsler/eier'

/** Abonnementet slik databasen lagrer det. */
export interface Lagretabonnement {
  endepunkt: string
  p256dh: string
  auth: string
}

/** Kallene mot serveren (`api.ts`). */
export interface Varselserver {
  nokkel: () => Promise<string>
  lagre: (abonnement: Lagretabonnement) => Promise<void>
  slett: (endepunkt: string) => Promise<void>
}

export interface Enhetsavhengigheter {
  navigator: Navigator
  vindu: Pick<Window, 'matchMedia' | 'isSecureContext'> & { Notification?: typeof Notification; PushManager?: unknown }
  lager: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null
  server: Varselserver
  /** Adressen tjenestearbeideren hentes fra og gjelder for (mappa `index.html` ligger i). */
  grunnadresse: string
}

/** iPhone og iPad, også iPad som utgir seg for å være en Mac. */
function erIos(navigator: Navigator): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function base64url(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  let binar = ''
  for (const b of new Uint8Array(buffer)) binar += String.fromCharCode(b)
  return btoa(binar).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fraBase64url(kodet: string): Uint8Array<ArrayBuffer> {
  const vanlig = kodet.replace(/-/g, '+').replace(/_/g, '/')
  const binar = atob(vanlig + '='.repeat((4 - (vanlig.length % 4)) % 4))
  return Uint8Array.from(binar, (c) => c.charCodeAt(0))
}

/** Abonnementet i formen databasen lagrer. */
export function tilLagret(abonnement: PushSubscription): Lagretabonnement {
  return {
    endepunkt: abonnement.endpoint,
    p256dh: base64url(abonnement.getKey('p256dh')),
    auth: base64url(abonnement.getKey('auth')),
  }
}

export function lagChatvarsler(avh: Enhetsavhengigheter) {
  const { navigator, vindu, server } = avh
  const omfang = new URL('./', avh.grunnadresse).href

  const lesEier = () => {
    try {
      return avh.lager?.getItem(EIERNOKKEL) ?? null
    } catch {
      return null
    }
  }
  const settEier = (bruker: string | null) => {
    try {
      if (bruker) avh.lager?.setItem(EIERNOKKEL, bruker)
      else avh.lager?.removeItem(EIERNOKKEL)
    } catch {
      // Uten lager: abonnementet regnes som en annens neste gang, og avsluttes.
    }
  }

  const stottes = () =>
    vindu.isSecureContext && 'serviceWorker' in navigator && vindu.PushManager !== undefined && vindu.Notification !== undefined

  /** Registreringen som gjelder appen, uten å lage en ny. */
  const registrering = async (): Promise<ServiceWorkerRegistration | undefined> =>
    stottes() ? navigator.serviceWorker.getRegistration(omfang) : undefined

  const abonnementet = async (): Promise<PushSubscription | null> => (await registrering())?.pushManager.getSubscription() ?? null

  async function tilstand(): Promise<Varseltilstand> {
    if (!stottes()) return erIos(navigator) ? 'hjemskjerm' : 'ustottet'
    if (vindu.Notification!.permission === 'denied') return 'blokkert'
    if (vindu.Notification!.permission !== 'granted') return 'av'
    return (await abonnementet()) ? 'pa' : 'av'
  }

  /** Avslutter abonnementet på enheten, og sletter det på serveren når det er den innloggedes. */
  async function avslutt(slettPaServeren: boolean): Promise<void> {
    const abonnement = await abonnementet()
    if (abonnement) {
      if (slettPaServeren) await server.slett(abonnement.endpoint)
      await abonnement.unsubscribe()
    }
    settEier(null)
  }

  return {
    tilstand,

    /** Ber om tillatelse, registrerer tjenestearbeideren, abonnerer og lagrer abonnementet for `bruker`. */
    async slaPa(bruker: string): Promise<Varseltilstand> {
      if (!stottes()) return tilstand()
      const tillatelse =
        vindu.Notification!.permission === 'granted' ? 'granted' : await vindu.Notification!.requestPermission()
      if (tillatelse !== 'granted') return tilstand()

      const reg = await navigator.serviceWorker.register(new URL(TJENESTEARBEIDER, avh.grunnadresse).href, { scope: omfang })
      await navigator.serviceWorker.ready
      const nokkel = await server.nokkel()
      let abonnement = await reg.pushManager.getSubscription()
      // Et abonnement med en annen nøkkel (byttet på serveren) virker ikke; da lages et nytt.
      if (abonnement && base64url(abonnement.options.applicationServerKey) !== nokkel) {
        await abonnement.unsubscribe()
        abonnement = null
      }
      abonnement ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fraBase64url(nokkel) })
      await server.lagre(tilLagret(abonnement))
      settEier(bruker)
      return tilstand()
    },

    /** Slår av varslene på enheten. */
    async slaAv(): Promise<Varseltilstand> {
      await avslutt(true)
      return tilstand()
    },

    /**
     * Ved innlogging: et abonnement som hører til `bruker`, lagres på nytt
     * (nettleseren kan ha byttet nøklene); et som hører til en annen, avsluttes.
     */
    async synk(bruker: string): Promise<void> {
      const abonnement = await abonnementet()
      if (!abonnement) return
      if (lesEier() === bruker && vindu.Notification!.permission === 'granted') {
        await server.lagre(tilLagret(abonnement))
      } else {
        await avslutt(false)
      }
    },

    /** Før utlogging: ingen varsler til enheten etter at brukeren har logget ut. */
    vedUtlogging: () => avslutt(true),
  }
}

export type Chatvarsler = ReturnType<typeof lagChatvarsler>
