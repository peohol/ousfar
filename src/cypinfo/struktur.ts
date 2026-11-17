/**
 * Strukturkontrollen av katalogen og gentabellen fra CYPinfo: et
 * sikkerhetsnett mot at API-et endrer formen, så lesingen i `modell.ts` stille
 * gir tomme felt. Rapporten kontrolleres strengt der den leses
 * (`lesRapport`).
 *
 * Kravene gjelder feltene OUSFAR bygger på, slik CYPinfo sendte dem
 * 16.11.2026. Har for mange rader avvik, er formatet endret, og da byttes
 * ingenting inn (`synk.ts`). Alt her er rene funksjoner.
 */
import { formavvik, type Krav } from '../datakilder/struktur.js'

/** Hvor stor andel av radene som kan ha avvik før formatet regnes som endret. */
export const STRUKTURGRENSE = 0.05

export const STRUKTURKRAV = {
  legemiddel: [
    { sti: '_id', form: 'tekst' },
    { sti: 'name', form: 'tekst' },
    { sti: 'atcCodes', form: 'liste', hver: 'tekst' },
    { sti: 'festCodes', form: 'liste', hver: 'tekst' },
    { sti: 'brandNames', form: 'liste', valgfri: true, hver: 'tekst' },
    { sti: 'category', form: 'objekt', valgfri: true, ettAv: ['name'] },
    { sti: 'therapyArea', form: 'objekt', valgfri: true, ettAv: ['name'] },
  ],
  genresultat: [
    { sti: 'gene', form: 'tekst' },
    { sti: 'geneId', form: 'tekst' },
    { sti: 'allele1', form: 'tekst' },
    { sti: 'allele2', form: 'tekst' },
    { sti: 'isDuplicate', form: 'sannhet', valgfri: true },
    { sti: 'phenotype', form: 'tekst' },
    { sti: 'phenotypeId', form: 'tekst' },
  ],
} as const satisfies Record<string, readonly Krav[]>

export type Listetype = keyof typeof STRUKTURKRAV

const LISTENAVN: Record<Listetype, string> = { legemiddel: 'Legemiddelkatalogen', genresultat: 'Gentabellen' }

/**
 * Det som er galt med formen på en hel liste, som én tekst, eller `null` når
 * den er som ventet. En tom liste er alltid et avvik: CYPinfo har aldri gitt
 * en tom katalog.
 */
export function listeavvik(type: Listetype, rader: readonly unknown[]): string | null {
  if (rader.length === 0) return `${LISTENAVN[type]} fra CYPinfo er tom.`
  const avvik = rader.map((r) => formavvik(STRUKTURKRAV[type], r)).filter((a) => a.length > 0)
  if (avvik.length <= rader.length * STRUKTURGRENSE) return null
  const vanligste = [...new Set(avvik.flat())].slice(0, 3).join('; ')
  return `${LISTENAVN[type]} fra CYPinfo har trolig endret form (${avvik.length} av ${rader.length} rader: ${vanligste}).`
}
