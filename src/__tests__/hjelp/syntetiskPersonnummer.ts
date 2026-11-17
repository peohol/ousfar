/**
 * Syntetiske fødselsnumre til testene av regelen om pasientopplysninger
 * (docs/pasientopplysninger.md). Numrene lages av en oppdiktet dato og et
 * individnummer når testen kjører, så ingen gyldige fødselsnumre står i
 * repoet.
 */

const VEKT1 = [3, 7, 6, 1, 8, 9, 4, 5, 2]
const VEKT2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2]

/**
 * Et nummer med gyldige kontrollsifre, eller `null` når individnummeret ikke
 * gir et. `dag` og `maaned` tar tillegget for D- og H-nummer (40).
 */
export function lagPersonnummer(dag: number, maaned: number, aar: number, individ: number): string | null {
  const ni = [dag, maaned, aar].map((t) => String(t).padStart(2, '0')).join('') + String(individ).padStart(3, '0')
  const sifre = [...ni].map(Number)
  const kontroll = (vekter: number[], d: number[]) => {
    const k = 11 - (vekter.reduce((s, v, i) => s + v * d[i]!, 0) % 11)
    return k === 11 ? 0 : k
  }
  const k1 = kontroll(VEKT1, sifre)
  if (k1 === 10) return null
  const k2 = kontroll(VEKT2, [...sifre, k1])
  if (k2 === 10) return null
  return `${ni}${k1}${k2}`
}

/** Det første gyldige nummeret for datoen, fra individnummer 500 og oppover. */
export function syntetiskPersonnummer(dag: number, maaned: number, aar: number): string {
  for (let individ = 500; individ < 1000; individ++) {
    const nr = lagPersonnummer(dag, maaned, aar, individ)
    if (nr) return nr
  }
  throw new Error('Fant ikke noe nummer')
}
