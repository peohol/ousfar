/**
 * Hvem som laget en kopi. `age` krypterer til en offentlig nøkkel, så hvem
 * som helst som kjenner den, kan lage en kopi som lar seg dekryptere. Derfor
 * signeres hver kopi med en privat Ed25519-nøkkel som bare kopijobben har, og
 * gjenopprettingen krever signaturen, kontrollert mot den offentlige nøkkelen
 * den som gjenoppretter oppgir, før noe i kopien åpnes
 * (`docs/drift-gjenoppretting.md`, «Hvem som laget kopien»).
 *
 * Signaturen ligger ved siden av kopien som `<kopi>.sig` og dekker filnavnet,
 * tidspunktet og sha256 av hele den krypterte fila.
 */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { Stopp } from './feil'

export interface Signatur {
  versjon: 1
  /** Filnavnet på kopien, uten mappe. */
  fil: string
  sha256: string
  laget: string
  /** Ed25519-signaturen, base64. */
  signatur: string
  /** Den offentlige nøkkelen som signerte, for å kjenne den igjen. Kontrollen bruker aldri denne. */
  avsender: string
}

const tekst = (s: Pick<Signatur, 'fil' | 'sha256' | 'laget'>) => Buffer.from(`ousfar-kopi:1\n${s.fil}\n${s.sha256}\n${s.laget}\n`)

/** Et nytt nøkkelpar: den private til kopijobben, den offentlige til den som gjenoppretter. */
export function lagSigneringsnokler(): { privat: string; offentlig: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return {
    privat: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    offentlig: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}

export function signer(fil: string, sha256: string, laget: string, privatPem: string): Signatur {
  let nokkel
  try {
    nokkel = createPrivateKey(privatPem)
  } catch {
    throw new Stopp('Signeringsnøkkelen kan ikke leses: den må være en privat Ed25519-nøkkel i PEM.')
  }
  if (nokkel.asymmetricKeyType !== 'ed25519') throw new Stopp('Signeringsnøkkelen må være Ed25519.')
  const s = { fil, sha256, laget }
  return {
    versjon: 1,
    ...s,
    signatur: sign(null, tekst(s), nokkel).toString('base64'),
    avsender: createPublicKey(nokkel).export({ type: 'spki', format: 'pem' }).toString(),
  }
}

/**
 * Stopper med mindre signaturen er gyldig for akkurat denne fila (navn og
 * sha256) og laget med den private nøkkelen til `offentligPem`. Nøkkelen i
 * signaturfila brukes ikke; tilliten kommer bare fra den som gjenoppretter.
 */
export function verifiser(innhold: unknown, fil: string, sha256: string, offentligPem: string): Signatur {
  let nokkel
  try {
    nokkel = createPublicKey(offentligPem)
  } catch {
    throw new Stopp('Avsendernøkkelen kan ikke leses: den må være en offentlig Ed25519-nøkkel i PEM.')
  }
  if (nokkel.asymmetricKeyType !== 'ed25519') throw new Stopp('Avsendernøkkelen må være Ed25519.')
  const s = innhold as Partial<Signatur> | null
  if (!s || s.versjon !== 1 || typeof s.fil !== 'string' || typeof s.sha256 !== 'string' || typeof s.laget !== 'string' || typeof s.signatur !== 'string') {
    throw new Stopp('Signaturen til kopien er ugyldig eller mangler. Ingenting er gjenopprettet.')
  }
  if (s.fil !== fil) throw new Stopp(`Signaturen gjelder ${s.fil}, ikke ${fil}. Ingenting er gjenopprettet.`)
  if (s.sha256 !== sha256) throw new Stopp('Kopien er ikke den som ble signert: innholdet er endret eller byttet ut. Ingenting er gjenopprettet.')
  if (!verify(null, tekst(s as Signatur), nokkel, Buffer.from(s.signatur, 'base64'))) {
    throw new Stopp('Signaturen er ikke laget med nøkkelen til kopijobben. Ingenting er gjenopprettet.')
  }
  return s as Signatur
}
