import { gzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { hentHeleLoggen } from '../../data/endringslogg'
import { registermodul, sidemodul, sidenummer, SIDEMODUL } from '../../drift/endringsmoduler'
import { antallSider, fraSide, sideFor, siderFor, visningFor } from '../endringssider'
import { ENDRINGER_PER_SIDE as S, endringsmerke, varslesIBjella, type Endring } from '../versjon'

/** Hele loggen, slik appen henter den. */
const ENDRINGSLOGG: readonly Endring[] = await hentHeleLoggen()

/** En logg med `antall` føringer, nyest først: plass 0 heter `antall - 1`. */
const logg = (antall: number) => Array.from({ length: antall }, (_, plass) => antall - 1 - plass)

/** De `vist` nyeste, satt sammen fra sidene slik appen gjør. */
const sattSammen = (l: readonly number[], vist: number) => siderFor(vist, l.length).flatMap((side) => fraSide(l, side)).slice(0, vist)

describe('sidene i endringsloggen', () => {
  it('telles fra den eldste, så en ny føring bare endrer den øverste siden', () => {
    const for_ = logg(3 * S + 4)
    const etter = logg(3 * S + 5)
    expect(antallSider(for_.length)).toBe(4)
    for (const side of [0, 1, 2]) expect(fraSide(etter, side)).toEqual(fraSide(for_, side))
    expect(fraSide(etter, 0)).toEqual(Array.from({ length: S }, (_, i) => S - 1 - i))
    expect(fraSide(etter, 3)).toHaveLength(5)
  })

  it.each([0, 1, S - 1, S, S + 1, 3 * S, 4 * S - 1])('gir akkurat de nyeste føringene i en logg med %i', (antall) => {
    const l = logg(antall)
    for (let vist = 0; vist <= antall + S; vist++) expect(sattSammen(l, vist)).toEqual(l.slice(0, vist))
    expect(antallSider(antall)).toBe(Math.ceil(antall / S))
  })

  it('henter så få sider som mulig', () => {
    const antall = 4 * S + 3
    expect(siderFor(S, antall)).toEqual([4, 3])
    expect(siderFor(3, antall)).toEqual([4])
    expect(siderFor(antall, antall)).toEqual([4, 3, 2, 1, 0])
    expect(siderFor(0, antall)).toEqual([])
  })

  it('viser hele visningen en føring står i', () => {
    expect(visningFor(0)).toBe(S)
    expect(visningFor(S - 1)).toBe(S)
    expect(visningFor(S)).toBe(2 * S)
  })

  it('sier fra om plasser og sider som ikke finnes', () => {
    expect(() => sideFor(5, 5)).toThrow()
    expect(() => sideFor(-1, 5)).toThrow()
    expect(() => fraSide(logg(5), 1)).toThrow()
  })
})

describe('modulene byggingen gir appen', () => {
  it('har loggen sett fra appen lik loggen byggingen beregnet, side for side', async () => {
    const { REGISTER, VARSLEDE } = await import('virtual:ousfar-endringer')
    expect(REGISTER).toEqual(ENDRINGSLOGG.map(endringsmerke))
    expect(VARSLEDE).toEqual(ENDRINGSLOGG.filter(varslesIBjella))
  })

  it('har ikke teksten i føringene i den delen appen har fra start, bare i de bjella varsler', () => {
    const modul = registermodul(ENDRINGSLOGG)
    const varslede = new Set(ENDRINGSLOGG.filter(varslesIBjella))
    for (const endring of ENDRINGSLOGG) {
      if (varslede.has(endring)) continue
      for (const punkt of endring.punkter) expect(modul.includes(JSON.stringify(punkt)), endring.versjon).toBe(false)
    }
    // Og den er liten: komprimert, slik den sendes, under en tidel av hele loggen.
    expect(gzipSync(modul).length).toBeLessThan(gzipSync(JSON.stringify(ENDRINGSLOGG)).length / 10)
  })

  it('har en henting per side, og hver side har sine føringer', () => {
    const modul = registermodul(ENDRINGSLOGG)
    const sider = antallSider(ENDRINGSLOGG.length)
    expect(modul.match(/import\(/g)).toHaveLength(sider)
    for (let side = 0; side < sider; side++) {
      expect(modul).toContain(JSON.stringify(SIDEMODUL + side))
      expect(sidemodul(ENDRINGSLOGG, side)).toBe(`export const ENDRINGER = ${JSON.stringify(fraSide(ENDRINGSLOGG, side))}\n`)
    }
  })

  it('kjenner bare igjen sider med et gyldig nummer', () => {
    expect(sidenummer(`${SIDEMODUL}0`)).toBe(0)
    expect(sidenummer(`${SIDEMODUL}12`)).toBe(12)
    for (const id of [`${SIDEMODUL}`, `${SIDEMODUL}01`, `${SIDEMODUL}-1`, `${SIDEMODUL}1.5`, 'virtual:ousfar-endringer']) {
      expect(sidenummer(id), id).toBeNull()
    }
  })
})
