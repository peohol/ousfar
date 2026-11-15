/**
 * Passordene.
 *
 * Det midlertidige passordet er det eneste som står mellom en ny konto og
 * hvem som helst, i det korte vinduet før brukeren har byttet det. Testen
 * kontrollerer at det faktisk er tilfeldig, langt nok og satt sammen av det
 * tegnsettet vi mener å bruke.
 */
import { describe, expect, it } from 'vitest'
import {
  genererMidlertidigPassord,
  MIDLERTIDIG_PASSORD_LENGDE,
  PASSORD_MINST,
  passordFeil,
} from '@delt/passord'

/** Tegnene som er tatt ut fordi de lett forveksles visuelt. */
const FORVEKSLINGER = ['0', 'O', '1', 'l', 'I']

describe('genererMidlertidigPassord', () => {
  it('har den avtalte lengden', () => {
    expect(genererMidlertidigPassord()).toHaveLength(MIDLERTIDIG_PASSORD_LENGDE)
    expect(genererMidlertidigPassord()).toHaveLength(16)
  })

  it('bruker bare tegn fra tegnsettet', () => {
    for (let i = 0; i < 200; i++) {
      expect(genererMidlertidigPassord()).toMatch(/^[a-zA-Z2-9]+$/)
    }
  })

  it('utelater tegn som lett forveksles', () => {
    for (let i = 0; i < 200; i++) {
      const passord = genererMidlertidigPassord()
      for (const tegn of FORVEKSLINGER) {
        expect(passord.includes(tegn), `${passord} inneholder ${tegn}`).toBe(false)
      }
    }
  })

  it('har alltid både små bokstaver, store bokstaver og tall', () => {
    for (let i = 0; i < 200; i++) {
      const passord = genererMidlertidigPassord()
      expect(passord, passord).toMatch(/[a-z]/)
      expect(passord, passord).toMatch(/[A-Z]/)
      expect(passord, passord).toMatch(/[2-9]/)
    }
  })

  it('gir et nytt passord hver gang', () => {
    const sett = new Set(Array.from({ length: 300 }, () => genererMidlertidigPassord()))
    expect(sett.size).toBe(300)
  })

  it('legger ikke de tre påkrevde tegnene først', () => {
    // Uten stokkingen ville plass 1 alltid vært liten bokstav, plass 2 stor
    // og plass 3 et tall. Over mange trekninger skal alle tre variere.
    const forste = new Set<string>()
    const andre = new Set<string>()
    const tredje = new Set<string>()
    for (let i = 0; i < 200; i++) {
      const passord = genererMidlertidigPassord()
      forste.add(kategori(passord[0] as string))
      andre.add(kategori(passord[1] as string))
      tredje.add(kategori(passord[2] as string))
    }
    expect(forste.size).toBeGreaterThan(1)
    expect(andre.size).toBeGreaterThan(1)
    expect(tredje.size).toBeGreaterThan(1)
  })

  it('nekter en lengde under minstekravet', () => {
    expect(() => genererMidlertidigPassord(PASSORD_MINST - 1)).toThrow()
  })
})

function kategori(tegn: string): string {
  if (/[a-z]/.test(tegn)) return 'liten'
  if (/[A-Z]/.test(tegn)) return 'stor'
  return 'tall'
}

describe('passordFeil', () => {
  it('krever at feltet er fylt ut', () => {
    expect(passordFeil('')).toBe('Skriv inn et passord.')
  })

  it('krever minstelengden, og godtar den akkurat', () => {
    const passord = 'Fjell-Bekk-9-Lyng'
    expect(passordFeil(passord.slice(0, PASSORD_MINST - 1))).toContain(`minst ${PASSORD_MINST}`)
    expect(passordFeil(passord.slice(0, PASSORD_MINST))).toBeNull()
  })

  it('godtar et midlertidig passord som det er', () => {
    expect(passordFeil(genererMidlertidigPassord())).toBeNull()
  })
})

describe('passordFeil', () => {
  it(`krever minst ${PASSORD_MINST} tegn, med grensen akkurat der`, () => {
    expect(PASSORD_MINST).toBe(12)
    expect(passordFeil('')).toMatch(/Skriv inn/)
    expect(passordFeil('Fjell-Bekk-9')).toBeNull()
    expect(passordFeil('Fjell-Bekk-')).toMatch(/minst 12 tegn/)
  })

  it('godtar lange passord og flere ord satt sammen', () => {
    for (const p of ['korrekt hest batteri stift', 'Blåbær-Tyttebær-71', 'x7#Lq9!vB2@m', '482915736042', genererMidlertidigPassord()]) {
      expect(passordFeil(p, 'kari.nordmann'), p).toBeNull()
    }
  })

  it('avviser et passord med brukernavnet i, uansett store og små bokstaver', () => {
    expect(passordFeil('Kari.Nordmann2025', 'kari.nordmann')).toMatch(/brukernavnet/)
    expect(passordFeil('minkari.nordmannkonto', 'kari.nordmann')).toMatch(/brukernavnet/)
    // Et svært kort brukernavn sperrer ikke vanlige passord.
    expect(passordFeil('korrekt hest batteri', 'ko')).toBeNull()
  })

  it('avviser for få ulike tegn', () => {
    expect(passordFeil('aaaaaaaaaaaa')).toMatch(/for få ulike/)
    expect(passordFeil('abababababab')).toMatch(/for få ulike/)
    expect(passordFeil('abcdabcdabcd')).toMatch(/for få ulike/)
  })

  it('avviser de vanligste mønstrene', () => {
    for (const p of [
      '123456789012', '098765432109', 'qwertyuiopåa', 'abcdefghijkl', 'lkjihgfedcba',
      'Passord2024!!', 'password1234', 'Sommer2025!!', 'Velkommen123', 'fotballfotball', 'Ousfar123456',
      'abc123abc123', 'hei12hei12hei12', '!@#$%1111111',
    ]) {
      expect(passordFeil(p), p).toMatch(/for lett å gjette|for få ulike/)
    }
  })

  it('bruker regelen for nye passord, ikke det midlertidige, som alltid holder', () => {
    for (let i = 0; i < 200; i++) {
      const p = genererMidlertidigPassord()
      expect(passordFeil(p), p).toBeNull()
    }
  })
})
