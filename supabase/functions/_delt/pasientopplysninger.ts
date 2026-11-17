/**
 * Pasientopplysninger er ikke tillatt noe sted i OUSFAR (Peder 17.11.2026,
 * docs/pasientopplysninger.md): verken identifiserbare eller pseudonymiserte
 * opplysninger, og heller ikke kasuistikker som kan knyttes til enkeltpersoner.
 *
 * Appen viser ingen påminnelse eller advarsel om dette ved skrivefeltene
 * (Peder 17.11.2026: brukerne er godt trent i personvern, og flere advarsler
 * blir bare støy). Det som står igjen, er gjenkjenningen av fødselsnumre og
 * avslaget fra databasen: databasen har de samme reglene i
 * `intern.ligner_personnummer` og avviser med `PASIENTREGEL.avvist`
 * (`intern.krev_uten_personnummer`); en test holder dem like. Gjenkjenningen
 * er et sikkerhetsnett for åpenbare feil, ikke en garanti: den finner ikke
 * navn, diagnoser eller kasuistikker, og ingen tekst sendes til eksterne
 * tjenester for kontroll.
 */

/** Teksten om regelen som appen viser, når databasen avviser en sending. */
export const PASIENTREGEL = {
  /** Avslaget fra databasen, ordrett som i `intern.krev_uten_personnummer`. */
  avvist: 'Teksten ser ut til å inneholde et fødselsnummer. Pasientopplysninger er ikke tillatt i OUSFAR.',
} as const

/** 11 sifre som ikke står inntil andre sifre, eventuelt delt etter de seks første. */
const KANDIDAT = /(?<!\d)(\d{6})[ .-]?(\d{5})(?!\d)/g
const VEKT1 = [3, 7, 6, 1, 8, 9, 4, 5, 2, 1] as const
const VEKT2 = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2, 1] as const

function vektsum(sifre: readonly number[], vekter: readonly number[]): number {
  return vekter.reduce((sum, vekt, i) => sum + vekt * sifre[i]!, 0)
}

/** Sant når de 11 sifrene er et gyldig fødsels-, D- eller H-nummer. */
export function erPersonnummer(sifre: string): boolean {
  if (!/^\d{11}$/.test(sifre)) return false
  const d = [...sifre].map(Number)
  const dag = d[0]! * 10 + d[1]!
  const maaned = d[2]! * 10 + d[3]!
  if (!((dag >= 1 && dag <= 31) || (dag >= 41 && dag <= 71))) return false
  if (!((maaned >= 1 && maaned <= 12) || (maaned >= 41 && maaned <= 52))) return false
  // Det første kontrollsifferet godtas også etter regelen fra 2032 (resten 0–3).
  return vektsum(d, VEKT1) % 11 <= 3 && vektsum(d, VEKT2) % 11 === 0
}

/**
 * Sant når teksten har et norsk fødselsnummer, D-nummer eller H-nummer med
 * gyldige kontrollsifre, også med mellomrom, punktum eller bindestrek etter de
 * seks første sifrene.
 */
export function lignerPersonnummer(tekst: string | null | undefined): boolean {
  if (!tekst || !/\d{5}/.test(tekst)) return false
  for (const treff of tekst.matchAll(KANDIDAT)) {
    if (erPersonnummer(treff[1]! + treff[2]!)) return true
  }
  return false
}
