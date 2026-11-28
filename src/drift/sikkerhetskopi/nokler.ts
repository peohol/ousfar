/**
 * Nøklene til kopiene i drift, laget i nettleseren til den som skal ha dem
 * (`docs/drift-gjenoppretting.md`, «Nøklene»; `scripts/nokkelside.ts`). Ingen
 * nøkkel går gjennom Claude, GitHub-loggene eller nettet:
 *
 * - et `age`-par (X25519): den offentlige nøkkelen (`age1…`) legges hos
 *   jobben, som krypterer kopiene til den; den private (`AGE-SECRET-KEY-1…`)
 *   er den eneste som kan åpne dem, og ligger bare hos nøkkeleieren;
 * - et Ed25519-par i PEM: den private legges hos jobben, som signerer hver
 *   kopi; den offentlige tas vare på sammen med den private `age`-nøkkelen, og
 *   gjenopprettingen godtar bare kopier signert med den.
 *
 * Bare Web Crypto brukes, så den samme koden kjører i nettleseren og i Node
 * (testene prøver nøklene mot `age` og mot signeringen i `signatur.ts`).
 */

const BECH32 = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l'

function polymod(verdier: number[]): number {
  const g = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3]
  let chk = 1
  for (const v of verdier) {
    const b = chk >> 25
    chk = ((chk & 0x1ffffff) << 5) ^ v
    for (let i = 0; i < 5; i++) if ((b >> i) & 1) chk ^= g[i]!
  }
  return chk
}

const utvid = (hrp: string) => [...[...hrp].map((c) => c.charCodeAt(0) >> 5), 0, ...[...hrp].map((c) => c.charCodeAt(0) & 31)]

/** Byte til grupper på fem bit, med utfylling til slutt (BIP 173). */
function femBit(data: Uint8Array): number[] {
  const ut: number[] = []
  let akk = 0
  let bit = 0
  for (const b of data) {
    akk = (akk << 8) | b
    bit += 8
    while (bit >= 5) {
      bit -= 5
      ut.push((akk >> bit) & 31)
    }
  }
  if (bit) ut.push((akk << (5 - bit)) & 31)
  return ut
}

/** Bech32 (BIP 173), som `age` bruker for nøklene, uten lengdegrensen på 90 tegn. */
export function bech32(hrp: string, data: Uint8Array): string {
  const d = femBit(data)
  const sjekk = polymod([...utvid(hrp), ...d, 0, 0, 0, 0, 0, 0]) ^ 1
  const sum = [0, 1, 2, 3, 4, 5].map((i) => (sjekk >> (5 * (5 - i))) & 31)
  return `${hrp}1${[...d, ...sum].map((v) => BECH32[v]).join('')}`
}

const base64 = (b: ArrayBuffer) => {
  let s = ''
  for (const x of new Uint8Array(b)) s += String.fromCharCode(x)
  return btoa(s)
}

const pem = (type: string, der: ArrayBuffer) => `-----BEGIN ${type}-----\n${base64(der).match(/.{1,64}/g)!.join('\n')}\n-----END ${type}-----\n`

/** Den rå private X25519-nøkkelen er de siste 32 bytene i PKCS #8-formen (RFC 8410). */
function raPrivat(pkcs8: ArrayBuffer): Uint8Array {
  const b = new Uint8Array(pkcs8)
  if (b.length !== 48) throw new Error('Uventet form på den private X25519-nøkkelen.')
  return b.slice(16)
}

export interface Kopinokler {
  /** Den private `age`-nøkkelen: bare hos nøkkeleieren, to uavhengige steder. */
  identitet: string
  /** Den offentlige `age`-nøkkelen: hemmeligheten `KOPI_MOTTAKERE` hos jobben. */
  mottaker: string
  /** Den private signeringsnøkkelen (PEM): hemmeligheten `KOPI_SIGNERINGSNOKKEL` hos jobben. */
  signeringPrivat: string
  /** Den offentlige signeringsnøkkelen (PEM): tas vare på sammen med `identitet`, utenfor GitHub og Backblaze. */
  signeringOffentlig: string
}

export async function lagKopinokler(krypto: Crypto = globalThis.crypto): Promise<Kopinokler> {
  const s = krypto.subtle
  const x = (await s.generateKey({ name: 'X25519' }, true, ['deriveBits'])) as CryptoKeyPair
  const e = (await s.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair
  const privat = raPrivat(await s.exportKey('pkcs8', x.privateKey))
  const offentlig = new Uint8Array(await s.exportKey('raw', x.publicKey))
  return {
    identitet: bech32('age-secret-key-', privat).toUpperCase(),
    mottaker: bech32('age', offentlig),
    signeringPrivat: pem('PRIVATE KEY', await s.exportKey('pkcs8', e.privateKey)),
    signeringOffentlig: pem('PUBLIC KEY', await s.exportKey('spki', e.publicKey)),
  }
}

/**
 * Fila nøkkeleieren tar vare på: den private `age`-nøkkelen og den offentlige
 * signeringsnøkkelen, med hva de er til. Den kan brukes som den er, både som
 * `age -i` (alt annet enn nøkkelen er kommentarer) og som `--avsender` til
 * `hent` og `gjenopprett` (se {@link offentligFraNokkelfil}).
 */
export function nokkelfil(n: Pick<Kopinokler, 'identitet' | 'mottaker' | 'signeringOffentlig'>, laget: string): string {
  return [
    '# OUSFAR – nøklene til sikkerhetskopiene',
    `# Laget ${laget}. Ta vare på denne fila to uavhengige steder, aldri i GitHub, Backblaze, e-post eller chat.`,
    '# Uten den private nøkkelen nedenfor kan ingen kopi åpnes. Se docs/drift-gjenoppretting.md, «Gjenopprette fra lageret».',
    '#',
    `# Offentlig nøkkel (står hos kopijobben): ${n.mottaker}`,
    '#',
    '# Den offentlige signeringsnøkkelen; gjenopprettingen godtar bare kopier signert med den:',
    ...n.signeringOffentlig.trimEnd().split('\n').map((l) => `# ${l}`),
    '#',
    '# Den private nøkkelen, til gjenoppretting:',
    n.identitet,
    '',
  ].join('\n')
}

/** Den offentlige signeringsnøkkelen (PEM), fra en PEM-fil eller fra nøkkelfila. */
export function offentligFraNokkelfil(tekst: string): string {
  const linjer = tekst.split(/\r?\n/).map((l) => l.replace(/^#\s?/, '').trim())
  const fra = linjer.indexOf('-----BEGIN PUBLIC KEY-----')
  const til = linjer.indexOf('-----END PUBLIC KEY-----', fra)
  if (fra < 0 || til < 0) throw new Error('Fant ingen offentlig signeringsnøkkel (BEGIN PUBLIC KEY) i fila.')
  return `${linjer.slice(fra, til + 1).join('\n')}\n`
}
