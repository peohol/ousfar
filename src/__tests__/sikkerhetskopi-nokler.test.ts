/**
 * Nøklene fra nøkkelsiden (`src/drift/sikkerhetskopi/nokler.ts`): `age` kan
 * kryptere til den offentlige nøkkelen og åpne med den private, også med
 * nøkkelfila som den er; signeringsnøkkelen virker med signaturen til
 * kopiene; og kopijobben godtar bare offentlige `age`-nøkler.
 */
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { bech32, lagKopinokler, nokkelfil, offentligFraNokkelfil } from '../drift/sikkerhetskopi/nokler'
import { lesMottakere } from '../drift/sikkerhetskopi/natt'
import { lesSignatur, offentligNokkel, signer, lagSigneringsnokler } from '../drift/sikkerhetskopi/signatur'
import { taKopi } from '../drift/sikkerhetskopi/kopi'

const harAge = (() => {
  try {
    execFileSync('age', ['--version'])
    return true
  } catch {
    return false
  }
})()

describe('nøklene til kopiene', () => {
  const mappe = mkdtempSync(join(tmpdir(), 'ousfar-nokler-'))
  afterAll(() => rmSync(mappe, { recursive: true, force: true }))

  it('gir bech32 som i BIP 173', () => {
    // Testvektoren fra BIP 173 for en tom datadel.
    expect(bech32('a', new Uint8Array())).toBe('a12uel5l')
  })

  it.skipIf(!harAge)('lager et age-par som age selv godtar, også med nøkkelfila som den er', async () => {
    const n = await lagKopinokler()
    expect(n.mottaker).toMatch(/^age1[02-9ac-hj-np-z]{58}$/)
    expect(n.identitet).toMatch(/^AGE-SECRET-KEY-1[02-9AC-HJ-NP-Z]{58}$/)
    const fil = join(mappe, 'nokler.txt')
    writeFileSync(fil, nokkelfil(n, '2026-11-27'))
    // age regner ut den offentlige nøkkelen fra den private: den skal være lik.
    expect(execFileSync('age-keygen', ['-y', fil], { encoding: 'utf8' }).trim()).toBe(n.mottaker)
    const kryptert = execFileSync('age', ['-r', n.mottaker], { input: 'hemmelig innhold' })
    expect(execFileSync('age', ['-d', '-i', fil], { input: kryptert, encoding: 'utf8' })).toBe('hemmelig innhold')
  })

  it('lager et signeringspar som signaturen til kopiene godtar, og den offentlige leses fra nøkkelfila', async () => {
    const n = await lagKopinokler()
    expect(offentligNokkel(n.signeringPrivat)).toBe(n.signeringOffentlig)
    const fraFila = offentligFraNokkelfil(nokkelfil(n, '2026-11-27'))
    expect(fraFila).toBe(n.signeringOffentlig)
    const s = signer('ousfar-kopi-x.tar.age', 'a'.repeat(64), '2026-11-27T02:15:00.000Z', n.signeringPrivat, { md5: 'b'.repeat(32), bytes: 1, deler: [], mottakere: [n.mottaker] })
    expect(lesSignatur(JSON.parse(JSON.stringify(s)), fraFila)).toMatchObject({ fil: 'ousfar-kopi-x.tar.age', mottakere: [n.mottaker] })
    // Mottakerne er signert: en kopi kan ikke gis ut for å være kryptert til en annen nøkkel.
    const annen = (await lagKopinokler()).mottaker
    expect(() => lesSignatur({ ...s, mottakere: [annen] }, fraFila)).toThrow(/ikke laget med nøkkelen/)
    expect(() => lesSignatur({ ...s, mottakere: [] }, fraFila)).toThrow(/ugyldig/)
    expect(() => signer('x', 'a'.repeat(64), 'y', n.signeringPrivat, { md5: 'b'.repeat(32), bytes: 1, deler: [], mottakere: [n.identitet] })).toThrow(/offentlige age-nøkler/)
    expect(offentligFraNokkelfil(n.signeringOffentlig)).toBe(n.signeringOffentlig)
    expect(() => offentligFraNokkelfil(n.identitet)).toThrow(/offentlig signeringsnøkkel/)
  })

  it('godtar bare offentlige age-nøkler hos jobben, aldri en privat', async () => {
    const [a, b] = await Promise.all([lagKopinokler(), lagKopinokler()])
    expect(lesMottakere(`${a.mottaker}\n${b.mottaker}, `)).toEqual([a.mottaker, b.mottaker])
    expect(() => lesMottakere(a.identitet)).toThrow(/privat nøkkel/)
    expect(() => lesMottakere(a.identitet.toLowerCase())).toThrow(/privat nøkkel/)
    expect(() => lesMottakere(' ')).toThrow(/ingen/)
  })

  it('bygger en nøkkelside som ikke henter noe fra nettet', () => {
    const side = join(mappe, 'side.html')
    execFileSync('npx', ['vite-node', 'scripts/nokkelside.ts', '--', side], { stdio: 'ignore' })
    const html = readFileSync(side, 'utf8')
    expect(html).toContain('lagKopinokler')
    expect(html).not.toMatch(/<link\b|<img\b|<iframe\b|\bsrc=|@import|url\(/i)
    expect(html).not.toMatch(/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon|EventSource|localStorage|indexedDB/)
    // Den eneste adressen er lenken til miljøene i GitHub, som brukeren selv åpner.
    expect([...html.matchAll(/https?:\/\/[^\s"'<>`]+/g)].map((m) => m[0])).toEqual(['https://github.com/peohol/ousfar/settings/environments'])
  }, 60_000)

  it('tar ingen kopi i en mappe som alt har biter fra en annen kopi', async () => {
    const ut = mkdtempSync(join(mappe, 'ut-'))
    mkdirSync(join(ut, 'deler'))
    writeFileSync(join(ut, 'deler', `${'a'.repeat(64)}.age`), 'eldre kopi')
    const { mottaker } = await lagKopinokler()
    await expect(
      taKopi({ dbUrl: 'postgresql://ingen', apiUrl: 'http://ingen', nokkel: 'x', referanse: { versjoner: {}, objekter: [] } as never, mottakere: [mottaker], ut, migrasjoner: ut, signeringsnokkel: lagSigneringsnokler().privat }),
    ).rejects.toThrow(/ny, tom mappe/)
    expect(readFileSync(join(ut, 'deler', `${'a'.repeat(64)}.age`), 'utf8')).toBe('eldre kopi')
  })
})
