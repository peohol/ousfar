/**
 * Utregningene i ytelsesmålingen (`src/__tests__/qa/ytelsesmal.ts`,
 * `docs/ytelse-maling.md`): fordelingen, hva som var hentet innen et merke, og
 * navnene på API-kallene.
 */
import { describe, expect, it } from 'vitest'
import { fordeling, hentetInnen, endring, kallnavn, referansestabilitet, renummereringer, tabell, telling, visFordeling, type Ressurs } from './qa/ytelsesmal'

describe('fordeling', () => {
  it('gir median, p95 (nærmeste rang), min og maks, og hopper over det som mangler', () => {
    expect(fordeling([5, 1, 3, undefined, null, Number.NaN])).toEqual({ n: 3, median: 3, p95: 5, min: 1, maks: 5 })
    expect(fordeling([4, 1, 3, 2])).toEqual({ n: 4, median: 2.5, p95: 4, min: 1, maks: 4 })
    const tjue = Array.from({ length: 20 }, (_, i) => i + 1)
    expect(fordeling(tjue)?.p95).toBe(19)
    expect(fordeling([])).toBeNull()
  })

  it('vises som median med p95 og spennet, i ms, s eller kB', () => {
    expect(visFordeling(fordeling([100, 200, 300]))).toBe('200 ms (p95 300 ms; 100 ms–300 ms)')
    expect(visFordeling(fordeling([12_345]))).toBe('12.3 s')
    expect(visFordeling(fordeling([2048]), true)).toBe('2 kB')
    expect(visFordeling(null)).toBe('–')
  })
})

describe('hentetInnen', () => {
  const r = (sti: string, start: number, slutt: number, egen = true, overfort = 100, utpakket = 300): Ressurs => ({ sti, egen, start, slutt, overfort, kropp: overfort, utpakket })
  const ressurser = [
    r('/assets/index.js', 5, 50),
    r('/assets/klinisk.js', 60, 400),
    r('/assets/index.css', 6, 40, true, 10, 30),
    r('/rest/v1/rpc/les_stoff', 100, 150, false, 0, 0),
    r('/auth/v1/user', 20, 30, false, 0, 0),
    r('/rest/v1/profiles', 500, 520, false, 0, 0),
  ]

  it('teller det som startet innen merket, og koden som var ferdig hentet', () => {
    const i = hentetInnen(ressurser, 0, 200)
    expect(i.kall).toBe(5)
    expect(i.api).toEqual(['les_stoff', 'auth/user'])
    expect(i.kodefiler).toEqual(['/assets/index.js'])
    expect(i.kodeOverfort).toBe(100)
    expect(i.kodeUtpakket).toBe(300)
    expect(i.stilOverfort).toBe(10)
  })

  it('regner fra en senere nullstilling', () => {
    expect(hentetInnen(ressurser, 90, 600).api).toEqual(['les_stoff', 'profiles'])
  })
})

describe('kallnavn og telling', () => {
  it('gir RPC-funksjonen, tabellen eller auth-endepunktet', () => {
    expect(kallnavn('/rest/v1/rpc/sok_gruppekandidater')).toBe('sok_gruppekandidater')
    expect(kallnavn('/rest/v1/profiles')).toBe('profiles')
    expect(kallnavn('/auth/v1/token')).toBe('auth/token')
    expect(kallnavn('/annet')).toBe('/annet')
    expect(telling(['b', 'a', 'b', 'c', 'b', 'a'])).toBe('b ×3, a ×2, c')
  })

  it('lager en Markdown-tabell og beskytter loddrette streker', () => {
    expect(tabell(['A', 'B'], [['1', 'x|y']])).toBe('| A | B |\n| --- | --- |\n| 1 | x\\|y |')
  })
})

describe('referanselisten mens kildene kommer', () => {
  const vist = (t: number, ...par: [number, string][]) => [t, par.length, par.map(([nr, id]) => `${nr}:${id}`).join('|')] as const
  it('teller referanser som fikk nytt nummer fra første til siste visning, og dem som kom til', () => {
    const forløp = [vist(1, [1, 'a'], [2, 'b']), vist(2, [1, 'f'], [2, 'a'], [3, 'b'])]
    expect(referansestabilitet(forløp)).toEqual({ referanser: 3, listevisninger: 2, nyttNummer: 2, lagtTil: 1 })
    expect(referansestabilitet([vist(1, [1, 'a'], [2, 'b']), vist(2, [1, 'a'], [2, 'b'], [3, 'f'])])).toMatchObject({ nyttNummer: 0, lagtTil: 1 })
    expect(referansestabilitet([])).toEqual({ referanser: 0, listevisninger: 0, nyttNummer: 0, lagtTil: 0 })
  })
  it('teller også en renummerering som rettes igjen', () => {
    const forløp = [vist(1, [1, 'a'], [2, 'b']), vist(2, [1, 'b'], [2, 'a']), vist(3, [1, 'a'], [2, 'b'])]
    expect(referansestabilitet(forløp).nyttNummer).toBe(0)
    expect(renummereringer(forløp)).toBe(4)
  })
  it('leser id-er med kolon, som FEST-referansene, uten å miste nummeret', () => {
    const fest = 'referanse-fest:sertralin:ID_X'
    const forløp = [vist(1, [1, fest], [2, 'referanse-a']), vist(2, [2, fest], [1, 'referanse-a'])]
    expect(referansestabilitet(forløp)).toEqual({ referanser: 2, listevisninger: 2, nyttNummer: 2, lagtTil: 0 })
    expect(renummereringer(forløp)).toBe(2)
    expect(renummereringer([vist(1, [1, fest]), vist(2, [1, fest])])).toBe(0)
  })
})

describe('endring', () => {
  it('viser før og etter med prosent, i enheten som er valgt', () => {
    expect(endring(2800, 1460)).toBe('2800 ms → 1460 ms (−48 %)')
    expect(endring(12_300, 2700)).toBe('12.3 s → 2700 ms (−78 %)')
    expect(endring(39, 28, 'antall')).toBe('39 → 28 (−28 %)')
    expect(endring(733 * 1024, 301 * 1024, 'byte')).toBe('733 kB → 301 kB (−59 %)')
    expect(endring(100, 130)).toBe('100 ms → 130 ms (+30 %)')
    expect(endring(5, 5, 'antall')).toBe('5 → 5 (±0 %)')
  })
  it('setter en strek for det som mangler, og regner ikke prosent fra 0', () => {
    expect(endring(undefined, 300)).toBe('– → 300 ms')
    expect(endring(0, 3, 'antall')).toBe('0 → 3')
  })
})
