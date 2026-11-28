/**
 * Hvem som laget en kopi. `age` krypterer til en offentlig nøkkel, så hvem
 * som helst som kjenner den, kan lage en kopi som lar seg dekryptere. Derfor
 * signeres hver kopi med en privat Ed25519-nøkkel som bare kopijobben har, og
 * gjenopprettingen krever signaturen, kontrollert mot den offentlige nøkkelen
 * den som gjenoppretter oppgir, før noe i kopien åpnes
 * (`docs/drift-gjenoppretting.md`, «Hvem som laget kopien»).
 *
 * Signaturen ligger ved siden av kopien som `<kopi>.sig` og dekker filnavnet,
 * tidspunktet og sha256 av hele den krypterte fila. Fra versjon 2 dekker den
 * også md5 og størrelsen, og bitene kopien består av (`deler.ts`): identiteten,
 * sha256, md5 og størrelsen til hver kryptert bit. Signaturen er da også
 * kopiens innholdsliste: den som gjenoppretter, og kopijobben selv neste
 * natt, vet hvilke biter som hører til, uten å dekryptere noe.
 *
 * Versjon 2 dekker også mottakerne: de offentlige `age`-nøklene kopien og
 * alle bitene er kryptert til. Kopijobben gjenbruker bare biter fra en kopi
 * med nøyaktig de samme mottakerne, så en kopi kan alltid åpnes med hver nøkkel
 * signaturen nevner, også etter et nøkkelbytte.
 */
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto'
import { Stopp } from './feil'

/** Én kryptert bit kopien viser til. */
export interface Delfil {
  identitet: string
  sha256: string
  md5: string
  bytes: number
}

export interface Signatur {
  versjon: 1 | 2
  /** Filnavnet på kopien, uten mappe. */
  fil: string
  sha256: string
  laget: string
  /** Fra versjon 2. */
  md5?: string
  bytes?: number
  deler?: Delfil[]
  /** Fra versjon 2: de offentlige `age`-nøklene kopien og bitene er kryptert til, sortert. */
  mottakere?: string[]
  /** Ed25519-signaturen, base64. */
  signatur: string
  /** Den offentlige nøkkelen som signerte, for å kjenne den igjen. Kontrollen bruker aldri denne. */
  avsender: string
}

const HEX = /^[0-9a-f]+$/

/** En offentlig `age`-nøkkel (X25519, bech32). */
export const MOTTAKER = /^age1[02-9ac-hj-np-z]{58}$/

/** Mottakerne slik signaturen fører dem: sortert og uten like. */
export const mottakersett = (m: readonly string[]) => [...new Set(m)].sort()

/** Om to kopier er kryptert til nøyaktig de samme mottakerne. */
export const sammeMottakere = (a: readonly string[] | undefined, b: readonly string[]) => (a ?? []).join(' ') === mottakersett(b).join(' ')

const gyldigeMottakere = (m: unknown): m is string[] =>
  Array.isArray(m) && m.length > 0 && m.every((x) => typeof x === 'string' && MOTTAKER.test(x)) && mottakersett(m).join(' ') === m.join(' ')

/** Det som signeres. Bitene sorteres, så rekkefølgen i fila ikke betyr noe. */
function tekst(s: Pick<Signatur, 'versjon' | 'fil' | 'sha256' | 'laget' | 'md5' | 'bytes' | 'deler' | 'mottakere'>): Buffer {
  if (s.versjon === 1) return Buffer.from(`ousfar-kopi:1\n${s.fil}\n${s.sha256}\n${s.laget}\n`)
  const deler = [...(s.deler ?? [])].sort((a, b) => a.identitet.localeCompare(b.identitet))
  return Buffer.from(
    `ousfar-kopi:2\n${s.fil}\n${s.sha256}\n${s.md5}\n${s.bytes}\n${s.laget}\nmottakere ${(s.mottakere ?? []).join(' ')}\n${deler.map((d) => `${d.identitet} ${d.sha256} ${d.md5} ${d.bytes}\n`).join('')}`,
  )
}

/** Om bitene i en signatur har riktig form: hex, unike identiteter og hele tall. */
function gyldigeDeler(deler: unknown): deler is Delfil[] {
  if (!Array.isArray(deler)) return false
  const sett = new Set<string>()
  return deler.every((d: Partial<Delfil>) =>
    typeof d?.identitet === 'string' && d.identitet.length === 64 && HEX.test(d.identitet) && !sett.has(d.identitet) && !!sett.add(d.identitet) &&
    typeof d.sha256 === 'string' && d.sha256.length === 64 && HEX.test(d.sha256) &&
    typeof d.md5 === 'string' && d.md5.length === 32 && HEX.test(d.md5) &&
    Number.isSafeInteger(d.bytes) && (d.bytes as number) >= 0,
  )
}

/** Et nytt nøkkelpar: den private til kopijobben, den offentlige til den som gjenoppretter. */
export function lagSigneringsnokler(): { privat: string; offentlig: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519')
  return {
    privat: privateKey.export({ type: 'pkcs8', format: 'pem' }).toString(),
    offentlig: publicKey.export({ type: 'spki', format: 'pem' }).toString(),
  }
}

/**
 * Signerer en kopi. Med `hele` (md5, størrelse, bitene og mottakerne) blir
 * signaturen versjon 2; uten dem versjon 1, som før kopiene ble delt.
 */
export function signer(fil: string, sha256: string, laget: string, privatPem: string, hele?: { md5: string; bytes: number; deler: Delfil[]; mottakere: readonly string[] }): Signatur {
  let nokkel
  try {
    nokkel = createPrivateKey(privatPem)
  } catch {
    throw new Stopp('Signeringsnøkkelen kan ikke leses: den må være en privat Ed25519-nøkkel i PEM.')
  }
  if (nokkel.asymmetricKeyType !== 'ed25519') throw new Stopp('Signeringsnøkkelen må være Ed25519.')
  if (hele && !gyldigeDeler(hele.deler)) throw new Stopp('Bitene i kopien har ugyldig form.')
  if (hele && !gyldigeMottakere(mottakersett(hele.mottakere))) throw new Stopp('Mottakerne må være offentlige age-nøkler (age1…).')
  const s = hele
    ? {
        versjon: 2 as const, fil, sha256, laget, md5: hele.md5, bytes: hele.bytes,
        deler: [...hele.deler].sort((a, b) => a.identitet.localeCompare(b.identitet)),
        mottakere: mottakersett(hele.mottakere),
      }
    : { versjon: 1 as const, fil, sha256, laget }
  return {
    ...s,
    signatur: sign(null, tekst(s), nokkel).toString('base64'),
    avsender: createPublicKey(nokkel).export({ type: 'spki', format: 'pem' }).toString(),
  }
}

function offentlig(offentligPem: string) {
  let nokkel
  try {
    nokkel = createPublicKey(offentligPem)
  } catch {
    throw new Stopp('Avsendernøkkelen kan ikke leses: den må være en offentlig Ed25519-nøkkel i PEM.')
  }
  if (nokkel.asymmetricKeyType !== 'ed25519') throw new Stopp('Avsendernøkkelen må være Ed25519.')
  return nokkel
}

function form(innhold: unknown): Signatur {
  const s = innhold as Partial<Signatur> | null
  if (
    !s || (s.versjon !== 1 && s.versjon !== 2) || typeof s.fil !== 'string' || typeof s.sha256 !== 'string' || typeof s.laget !== 'string' || typeof s.signatur !== 'string' ||
    (s.versjon === 2 && (typeof s.md5 !== 'string' || !Number.isSafeInteger(s.bytes) || !gyldigeDeler(s.deler) || !gyldigeMottakere(s.mottakere)))
  ) {
    throw new Stopp('Signaturen til kopien er ugyldig eller mangler. Ingenting er gjenopprettet.')
  }
  return s as Signatur
}

function ekte(s: Signatur, nokkel: ReturnType<typeof offentlig>): Signatur {
  if (!verify(null, tekst(s), nokkel, Buffer.from(s.signatur, 'base64'))) {
    throw new Stopp('Signaturen er ikke laget med nøkkelen til kopijobben. Ingenting er gjenopprettet.')
  }
  return s
}

/**
 * Stopper med mindre signaturen er gyldig for akkurat denne fila (navn og
 * sha256) og laget med den private nøkkelen til `offentligPem`. Nøkkelen i
 * signaturfila brukes ikke; tilliten kommer bare fra den som gjenoppretter.
 */
export function verifiser(innhold: unknown, fil: string, sha256: string, offentligPem: string): Signatur {
  const nokkel = offentlig(offentligPem)
  const s = form(innhold)
  if (s.fil !== fil) throw new Stopp(`Signaturen gjelder ${s.fil}, ikke ${fil}. Ingenting er gjenopprettet.`)
  if (s.sha256 !== sha256) throw new Stopp('Kopien er ikke den som ble signert: innholdet er endret eller byttet ut. Ingenting er gjenopprettet.')
  return ekte(s, nokkel)
}

/**
 * Signaturen alene, uten fila: kopijobben leser innholdslisten til forrige
 * kopi i lageret slik. Den stoler bare på lista når signaturen er ekte;
 * filene kontrolleres mot sha256 og md5 i den når de brukes.
 */
export function lesSignatur(innhold: unknown, offentligPem: string): Signatur {
  return ekte(form(innhold), offentlig(offentligPem))
}

/** Den offentlige nøkkelen til en privat signeringsnøkkel. */
export function offentligNokkel(privatPem: string): string {
  try {
    return createPublicKey(createPrivateKey(privatPem)).export({ type: 'spki', format: 'pem' }).toString()
  } catch {
    throw new Stopp('Signeringsnøkkelen kan ikke leses: den må være en privat Ed25519-nøkkel i PEM.')
  }
}
