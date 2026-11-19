/**
 * Nettleserens side av Web Push, til testene: et abonnement med egne nøkler,
 * dekryptering av et varsel (RFC 8291) og VAPID-nøkler.
 */
import { fraBase64url, tilBase64url, type Bytes, type Pushabonnement, type Vapidnokler } from '../../../supabase/functions/_edge/webpush'

const ECDH = { name: 'ECDH', namedCurve: 'P-256' } as const

export interface Testabonnement {
  abonnement: Pushabonnement
  privat: CryptoKey
}

let teller = 0

/** Et abonnement hos FCM med nøkler testen holder den private delen av. */
export async function nyttAbonnement(endepunkt = `https://fcm.googleapis.com/fcm/send/test-${++teller}`): Promise<Testabonnement> {
  const par = (await crypto.subtle.generateKey(ECDH, true, ['deriveBits'])) as CryptoKeyPair
  return {
    abonnement: {
      endepunkt,
      p256dh: tilBase64url(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))),
      auth: tilBase64url(crypto.getRandomValues(new Uint8Array(16))),
    },
    privat: par.privateKey,
  }
}

/** Et par VAPID-nøkler i formen Edge-funksjonen leser fra miljøet. */
export async function nyeVapidnokler(): Promise<Vapidnokler> {
  const par = (await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign'])) as CryptoKeyPair
  return {
    offentlig: tilBase64url(new Uint8Array(await crypto.subtle.exportKey('raw', par.publicKey))),
    privat: (await crypto.subtle.exportKey('jwk', par.privateKey)).d!,
  }
}

async function hmac(nokkel: Bytes, data: Bytes): Promise<Bytes> {
  const k = await crypto.subtle.importKey('raw', nokkel, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return new Uint8Array(await crypto.subtle.sign('HMAC', k, data))
}

const sammen = (...d: Bytes[]) => Uint8Array.from(d.flatMap((x) => [...x]))
const tekst = new TextEncoder()

/** Leser et varsel slik nettleseren gjør det (RFC 8188 og 8291), skrevet uavhengig av senderen. */
export async function dekrypter(kropp: Bytes, mottaker: Testabonnement): Promise<string> {
  const salt = kropp.slice(0, 16)
  const idlengde = kropp[20]!
  const avsender = kropp.slice(21, 21 + idlengde)
  const kryptert = kropp.slice(21 + idlengde)

  const offentlig = await crypto.subtle.importKey('raw', avsender, ECDH, false, [])
  const delt = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: offentlig }, mottaker.privat, 256))
  const ua = fraBase64url(mottaker.abonnement.p256dh)
  const prkNokkel = await hmac(fraBase64url(mottaker.abonnement.auth), delt)
  const ikm = await hmac(prkNokkel, sammen(tekst.encode('WebPush: info\0'), ua, avsender, new Uint8Array([1])))
  const prk = await hmac(salt, ikm)
  const cek = (await hmac(prk, sammen(tekst.encode('Content-Encoding: aes128gcm\0'), new Uint8Array([1])))).slice(0, 16)
  const nonce = (await hmac(prk, sammen(tekst.encode('Content-Encoding: nonce\0'), new Uint8Array([1])))).slice(0, 12)

  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['decrypt'])
  const klar = new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: nonce }, aes, kryptert))
  // Utfyllingen etter innholdet: avslutningen 0x02 og eventuelle nuller.
  let slutt = klar.length - 1
  while (slutt >= 0 && klar[slutt] === 0) slutt -= 1
  if (klar[slutt] !== 2) throw new Error('Mangler avslutningen på den siste posten.')
  return new TextDecoder().decode(klar.slice(0, slutt))
}
