/**
 * Nøklene fra nøkkelsiden (`src/drift/sikkerhetskopi/nokler.ts`): `age` kan
 * kryptere til den offentlige nøkkelen og åpne med den private, også med
 * nøkkelfila som den er; signeringsnøkkelen virker med signaturen til
 * kopiene; og kopijobben godtar bare offentlige `age`-nøkler.
 */
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { bech32, lagKopinokler, nokkelfil, offentligFraNokkelfil } from '../drift/sikkerhetskopi/nokler'
import { lesMottakere } from '../drift/sikkerhetskopi/natt'
import { lesSignatur, offentligNokkel, signer } from '../drift/sikkerhetskopi/signatur'

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
    const s = signer('ousfar-kopi-x.tar.age', 'a'.repeat(64), '2026-11-27T02:15:00.000Z', n.signeringPrivat, { md5: 'b'.repeat(32), bytes: 1, deler: [] })
    expect(lesSignatur(JSON.parse(JSON.stringify(s)), fraFila).fil).toBe('ousfar-kopi-x.tar.age')
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
})
