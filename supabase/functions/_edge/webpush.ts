/**
 * Web Push uten avhengigheter: bare WebCrypto, som både Deno og Node har.
 *
 * - Innholdet krypteres for den ene nettleseren med nøklene i abonnementet
 *   (RFC 8291, `aes128gcm` fra RFC 8188). Push-tjenesten som bringer det
 *   fram, kan ikke lese det.
 * - Avsenderen identifiserer seg med VAPID (RFC 8292): en kortlivet JWT
 *   signert med den private nøkkelen, som bare finnes i miljøet til
 *   Edge-funksjonen. Abonnementet er knyttet til den offentlige nøkkelen, så
 *   ingen andre kan sende varsler til det.
 */

/** Det nettleseren gir når den abonnerer (`PushSubscription.toJSON()`). */
export interface Pushabonnement {
  endepunkt: string
  /** Nettleserens offentlige P-256-nøkkel, base64url (65 byte, ukomprimert). */
  p256dh: string
  /** Hemmeligheten til abonnementet, base64url (16 byte). */
  auth: string
}

/** VAPID-nøklene, base64url: den offentlige ukomprimert (65 byte), den private som skalaren `d` (32 byte). */
export interface Vapidnokler {
  offentlig: string
  privat: string
}

export interface Pushvalg {
  /** Hvor lenge push-tjenesten skal holde på varselet når enheten er av, i sekunder. */
  levetid: number
  /** Ventende varsler med samme emne erstattes av det nyeste. */
  emne?: string
  /** Hvem som sender: `mailto:` eller en `https:`-adresse (VAPID `sub`). */
  kontakt: string
  /** Push-tjenesten skal levere med en gang. */
  haster?: boolean
}

/** Bytene WebCrypto og `fetch` tar imot. */
export type Bytes = Uint8Array<ArrayBuffer>

const tekst = new TextEncoder()
const POSTSTORRELSE = 4096

// --- base64url ---------------------------------------------------------------

export function tilBase64url(bytes: Bytes): string {
  let binar = ''
  for (const b of bytes) binar += String.fromCharCode(b)
  return btoa(binar).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function fraBase64url(kodet: string): Bytes {
  const vanlig = kodet.replace(/-/g, '+').replace(/_/g, '/').replace(/=+$/, '')
  const binar = atob(vanlig + '='.repeat((4 - (vanlig.length % 4)) % 4))
  return Uint8Array.from(binar, (c) => c.charCodeAt(0))
}

function sammen(...deler: Bytes[]): Bytes {
  const ut = new Uint8Array(deler.reduce((n, d) => n + d.length, 0))
  let i = 0
  for (const d of deler) {
    ut.set(d, i)
    i += d.length
  }
  return ut
}

// --- Nøklene -----------------------------------------------------------------

/** En offentlig P-256-nøkkel (65 byte, ukomprimert) som JWK, med `d` når den private følger med. */
function p256jwk(offentlig: Bytes, d?: Bytes): JsonWebKey {
  if (offentlig.length !== 65 || offentlig[0] !== 4) throw new Error('Ugyldig offentlig nøkkel.')
  return {
    kty: 'EC',
    crv: 'P-256',
    x: tilBase64url(offentlig.slice(1, 33)),
    y: tilBase64url(offentlig.slice(33, 65)),
    ...(d && { d: tilBase64url(d) }),
    ext: true,
  }
}

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const
const ECDSA = { name: 'ECDSA', namedCurve: 'P-256' } as const

async function hmac(nokkel: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', nokkel, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

/** HKDF med én blokk (høyst 32 byte), som RFC 8291 bruker den. */
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, lengde: number): Promise<Bytes> {
  const prk = await hmac(salt, ikm)
  return (await hmac(prk, sammen(info, new Uint8Array([1])))).slice(0, lengde)
}

// --- Krypteringen (RFC 8291) ---------------------------------------------------

/** Engangsnøkkelen og saltet; trekkes tilfeldig, men kan gis inn i testene. */
export interface Engangsverdier {
  /** Avsenderens engangsnøkkel: offentlig (65 byte) og privat (`d`, 32 byte). */
  offentlig: Bytes
  privat: Bytes
  salt: Bytes
}

async function nyeEngangsverdier(): Promise<Engangsverdier> {
  const par = (await crypto.subtle.generateKey(ECDH, true, ['deriveBits'])) as CryptoKeyPair
  const jwk = await crypto.subtle.exportKey('jwk', par.privateKey)
  return {
    offentlig: new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey)),
    privat: fraBase64url(jwk.d!),
    salt: crypto.getRandomValues(new Uint8Array(16)),
  }
}

/** Krypterer innholdet til én nettleser: kroppen push-tjenesten får, med hodet fra RFC 8188. */
export async function krypter(
  abonnement: Pick<Pushabonnement, 'p256dh' | 'auth'>,
  innhold: Bytes,
  engang?: Engangsverdier,
): Promise<Bytes> {
  const mottaker = fraBase64url(abonnement.p256dh)
  const hemmelighet = fraBase64url(abonnement.auth)
  if (hemmelighet.length !== 16) throw new Error('Ugyldig hemmelighet i abonnementet.')
  if (innhold.length > POSTSTORRELSE - 17 - 86) throw new Error('Varselet er for stort.')
  const e = engang ?? (await nyeEngangsverdier())

  const privat = await crypto.subtle.importKey('jwk', p256jwk(e.offentlig, e.privat), ECDH, false, ['deriveBits'])
  const motpart = await crypto.subtle.importKey('jwk', p256jwk(mottaker), ECDH, false, [])
  const delt = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: motpart }, privat, 256))

  const ikm = await hkdf(hemmelighet, delt, sammen(tekst.encode('WebPush: info\0'), mottaker, e.offentlig), 32)
  const cek = await hkdf(e.salt, ikm, tekst.encode('Content-Encoding: aes128gcm\0'), 16)
  const nonce = await hkdf(e.salt, ikm, tekst.encode('Content-Encoding: nonce\0'), 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  // Én post, avsluttet med 0x02 og uten utfylling.
  const kryptert = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aes, sammen(innhold, new Uint8Array([2]))),
  )
  const hode = new Uint8Array(16 + 4 + 1)
  hode.set(e.salt, 0)
  new DataView(hode.buffer).setUint32(16, POSTSTORRELSE)
  hode[20] = e.offentlig.length
  return sammen(hode, e.offentlig, kryptert)
}

// --- VAPID (RFC 8292) ------------------------------------------------------------

/** Den private VAPID-nøkkelen, klar til signering. */
export async function vapidnokkel(nokler: Vapidnokler): Promise<CryptoKey> {
  const offentlig = fraBase64url(nokler.offentlig)
  const d = fraBase64url(nokler.privat)
  if (d.length !== 32) throw new Error('Ugyldig privat VAPID-nøkkel.')
  return crypto.subtle.importKey('jwk', p256jwk(offentlig, d), ECDSA, false, ['sign'])
}

/** `Authorization`-hodet til push-tjenesten bak endepunktet, gyldig i tolv timer. */
export async function vapidhode(endepunkt: string, nokler: Vapidnokler, signering: CryptoKey, kontakt: string, na = Date.now()): Promise<string> {
  const del = (o: unknown) => tilBase64url(tekst.encode(JSON.stringify(o)))
  const usignert = `${del({ typ: 'JWT', alg: 'ES256' })}.${del({
    aud: new URL(endepunkt).origin,
    exp: Math.floor(na / 1000) + 12 * 60 * 60,
    sub: kontakt,
  })}`
  const signatur = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, signering, tekst.encode(usignert)))
  return `vapid t=${usignert}.${tilBase64url(signatur)}, k=${nokler.offentlig}`
}

// --- Sendingen ---------------------------------------------------------------------

/** Utfallet for ett abonnement: `borte` når push-tjenesten sier at det ikke finnes lenger. */
export type Pushutfall = 'sendt' | 'borte' | 'feil'

/** Forespørselen til push-tjenesten, uten å sende den. */
export async function pushforesporsel(
  abonnement: Pushabonnement,
  innhold: unknown,
  nokler: Vapidnokler,
  signering: CryptoKey,
  valg: Pushvalg,
): Promise<{ url: string; init: RequestInit }> {
  const kropp = await krypter(abonnement, tekst.encode(JSON.stringify(innhold)))
  const hoder: Record<string, string> = {
    Authorization: await vapidhode(abonnement.endepunkt, nokler, signering, valg.kontakt),
    'Content-Encoding': 'aes128gcm',
    'Content-Type': 'application/octet-stream',
    TTL: String(Math.max(0, Math.floor(valg.levetid))),
    Urgency: valg.haster ? 'high' : 'normal',
  }
  if (valg.emne) hoder.Topic = valg.emne
  return { url: abonnement.endepunkt, init: { method: 'POST', headers: hoder, body: kropp } }
}

/** Sender ett varsel og sier hvordan det gikk. 404 og 410 betyr at abonnementet er borte. */
export async function sendPush(
  abonnement: Pushabonnement,
  innhold: unknown,
  nokler: Vapidnokler,
  signering: CryptoKey,
  valg: Pushvalg,
  hent: typeof fetch = fetch,
): Promise<Pushutfall> {
  try {
    const { url, init } = await pushforesporsel(abonnement, innhold, nokler, signering, valg)
    const svar = await hent(url, { ...init, signal: AbortSignal.timeout(10_000) })
    await svar.body?.cancel()
    if (svar.ok) return 'sendt'
    return svar.status === 404 || svar.status === 410 ? 'borte' : 'feil'
  } catch {
    return 'feil'
  }
}
