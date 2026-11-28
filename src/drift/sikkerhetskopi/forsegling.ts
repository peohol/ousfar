/**
 * Forseglet boks (libsodiums `crypto_box_seal`), slik GitHub krever at en
 * hemmelighet krypteres før den legges inn med API-et: bare den som har den
 * private nøkkelen til miljøet, GitHub, kan åpne den. Brukes av nøkkelbyttet
 * (`nokkelbytte.ts`), så den nye nøkkelen til lageret går rett fra Backblaze
 * til GitHub uten å vises.
 *
 * Boksen er engangsnøkkelen (32 byte) fulgt av XSalsa20-Poly1305 av meldingen
 * med nøkkelen HSalsa20(X25519(engangs, mottaker)) og nonce
 * BLAKE2b-192(engangsnøkkel ‖ mottaker). Testene åpner en boks libsodium har
 * laget.
 */
import { x25519 } from '@noble/curves/ed25519'
import { blake2b } from '@noble/hashes/blake2b'
import { hsalsa, xsalsa20poly1305 } from '@noble/ciphers/salsa'
import { u32 } from '@noble/ciphers/utils'

const SIGMA = u32(new TextEncoder().encode('expand 32-byte k'))

function sammen(...deler: Uint8Array[]): Uint8Array {
  const ut = new Uint8Array(deler.reduce((n, d) => n + d.length, 0))
  let i = 0
  for (const d of deler) {
    ut.set(d, i)
    i += d.length
  }
  return ut
}

/** `crypto_box_beforenm`: HSalsa20 av den delte X25519-hemmeligheten med null som inndata. */
function boksnokkel(privat: Uint8Array, offentlig: Uint8Array): Uint8Array {
  const ut = new Uint32Array(8)
  hsalsa(SIGMA, u32(x25519.getSharedSecret(privat, offentlig)), new Uint32Array(4), ut)
  return new Uint8Array(ut.buffer)
}

const nonce = (engangs: Uint8Array, mottaker: Uint8Array) => blake2b(sammen(engangs, mottaker), { dkLen: 24 })

/** Forsegler meldingen til den offentlige X25519-nøkkelen. */
export function forsegl(melding: Uint8Array, mottaker: Uint8Array, engangs: Uint8Array = x25519.utils.randomPrivateKey()): Uint8Array {
  if (mottaker.length !== 32) throw new Error('Mottakernøkkelen skal være 32 byte.')
  const offentlig = x25519.getPublicKey(engangs)
  return sammen(offentlig, xsalsa20poly1305(boksnokkel(engangs, mottaker), nonce(offentlig, mottaker)).encrypt(melding))
}

/** Åpner en forseglet boks med den private nøkkelen (til testene og en kontroll). */
export function apne(boks: Uint8Array, privat: Uint8Array): Uint8Array {
  const engangs = boks.subarray(0, 32)
  const mottaker = x25519.getPublicKey(privat)
  return xsalsa20poly1305(boksnokkel(privat, engangs), nonce(engangs, mottaker)).decrypt(boks.subarray(32))
}
