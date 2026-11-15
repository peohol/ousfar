import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, openSync, closeSync, ftruncateSync, writeSync, rmSync, statSync, existsSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Stopp, filsum, pakk, pakkUt } from '../drift/sikkerhetskopi/kopi'

/**
 * Pakkingen og krypteringen av en sikkerhetskopi skal strømme fra prosess til
 * prosess, så størrelsen ikke begrenses av minnet eller av en buffer i Node
 * (`docs/drift-gjenoppretting.md`). Her strømmes en fil langt større enn
 * Nodes standardbuffer og større enn minneveksten testen tillater, med en ekte
 * strømmende kryptering (`openssl`, som finnes i CI), og med `age` der den er
 * installert, slik verktøyet bruker.
 */
const MiB = 1024 * 1024
const STOR = 192 * MiB

const finnes = (program: string) => {
  try {
    execFileSync('sh', ['-c', `command -v ${program}`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

const OPENSSL = ['openssl', 'enc', '-aes-256-ctr', '-pbkdf2', '-pass', 'pass:syntetisk-prove']
const krypterOpenssl = OPENSSL
const dekrypterOpenssl = [...OPENSSL.slice(0, 2), '-d', ...OPENSSL.slice(2), '-in']

describe('strømmet pakking og kryptering av sikkerhetskopien', () => {
  let rot: string
  let kilde: string
  let forventet: Record<string, string>

  beforeAll(async () => {
    rot = mkdtempSync(join(tmpdir(), 'ousfar-pakkeprove-'))
    kilde = join(rot, 'kilde')
    mkdirSync(join(kilde, 'filer/avatarer'), { recursive: true })
    // En stor fil med innhold i begge ender og et hull imellom, så den tar lite plass i kilden.
    const fd = openSync(join(kilde, 'data.sql'), 'w')
    writeSync(fd, 'begynnelsen\n')
    ftruncateSync(fd, STOR)
    writeSync(fd, 'slutten\n', STOR - 8)
    closeSync(fd)
    writeFileSync(join(kilde, 'manifest.json'), '{"syntetisk":true}')
    writeFileSync(join(kilde, 'filer/avatarer/a.webp'), Buffer.from([1, 2, 3]))
    forventet = {
      'data.sql': await filsum(join(kilde, 'data.sql')),
      'manifest.json': await filsum(join(kilde, 'manifest.json')),
      'filer/avatarer/a.webp': await filsum(join(kilde, 'filer/avatarer/a.webp')),
    }
  }, 120_000)

  afterAll(() => rmSync(rot, { recursive: true, force: true }))

  async function rundtur(navn: string, krypter: string[], dekrypter: string[]) {
    const fil = join(rot, `${navn}.tar.enc`)
    const ut = join(rot, `${navn}-ut`)
    mkdirSync(ut)
    global.gc?.()
    const for_ = process.memoryUsage().rss
    let topp = for_
    const maaler = setInterval(() => (topp = Math.max(topp, process.memoryUsage().rss)), 20)
    try {
      await pakk(kilde, fil, krypter)
      await pakkUt(fil, ut, dekrypter)
    } finally {
      clearInterval(maaler)
    }
    // Den krypterte fila er minst like stor som innholdet, og ingenting av det gikk gjennom Node.
    expect(statSync(fil).size).toBeGreaterThan(STOR)
    expect(topp - for_).toBeLessThan(64 * MiB)
    for (const [sti, sum] of Object.entries(forventet)) expect(await filsum(join(ut, sti))).toBe(sum)
    rmSync(fil, { force: true })
    rmSync(ut, { recursive: true, force: true })
  }

  it('strømmer en fil større enn buffer og tillatt minnevekst gjennom kryptering og tilbake, uendret', async () => {
    await rundtur('openssl', krypterOpenssl, dekrypterOpenssl)
  }, 180_000)

  it.runIf(finnes('age') && finnes('age-keygen'))('gjør det samme med age, slik verktøyet krypterer', async () => {
    const nokkel = join(rot, 'nokkel.txt')
    execFileSync('age-keygen', ['-o', nokkel], { stdio: 'ignore' })
    const mottaker = execFileSync('age-keygen', ['-y', nokkel], { encoding: 'utf8' }).trim()
    await rundtur('age', ['age', '-r', mottaker], ['age', '-d', '-i', nokkel])
  }, 180_000)

  it('stopper når krypteringen, pakkingen eller dekrypteringen feiler', async () => {
    await expect(pakk(kilde, join(rot, 'feil1'), ['false'])).rejects.toBeInstanceOf(Stopp)
    await expect(pakk(join(rot, 'finnes-ikke'), join(rot, 'feil2'), ['cat'])).rejects.toThrow(/tar feilet/)
    await expect(pakk(kilde, join(rot, 'feil3'), ['finnes-ikke-program'])).rejects.toBeInstanceOf(Stopp)

    // En skadet kopi gir feil fra dekrypteringen, ikke en halv utpakking som ser vellykket ut.
    const skadet = join(rot, 'skadet.tar.enc')
    writeFileSync(skadet, Buffer.from('ikke en kopi'))
    const ut = join(rot, 'skadet-ut')
    mkdirSync(ut)
    await expect(pakkUt(skadet, ut, dekrypterOpenssl)).rejects.toBeInstanceOf(Stopp)
    await expect(pakkUt(join(rot, 'borte.tar.enc'), ut, dekrypterOpenssl)).rejects.toThrow(/finnes ikke/)
    expect(existsSync(join(ut, 'manifest.json'))).toBe(false)
  }, 60_000)
})
