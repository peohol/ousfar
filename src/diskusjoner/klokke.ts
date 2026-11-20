/**
 * Diskusjonene i sanntid (docs/diskusjoner.md, «Sanntiden»): dørklokken for
 * rommene på én side, med det appen trenger rundt den. Samme dørklokke som
 * chatten (`src/gruppechat/dorklokke.ts`): hendelsen sier bare at noe er endret
 * og i hvilken tråd; appen henter selv tråden eller lista på nytt, gjennom
 * funksjonene som kontrollerer tilgangen.
 *
 * Fila bruker ikke appens klient (den står i `sanntid.ts`), så testene og
 * kontrollene i det lokale testmiljøet kan bruke den med en egen.
 */
import type { Abonner, Dorklokkekilde } from '../gruppechat/dorklokke'
import type { Diskusjonsside } from './modell'

/** Én rad per rom i `public.diskusjonsklokker`; den første endringen i et rom lager raden. */
export const DISKUSJONSKILDE: Dorklokkekilde = { tabell: 'diskusjonsklokker', nokkel: 'side', hendelser: '*' }

/** Trådene som er endret, eller `alle` når hva som helst på siden kan være endret. */
export type Diskusjonsendring = ReadonlySet<string> | 'alle'

/** Om en endring gjelder tråden. */
export const gjelderTraad = (endring: Diskusjonsendring, traad: string): boolean => endring === 'alle' || endring.has(traad)

/** Hvor lenge ringinger samles før appen henter: en setning som berører mye, ringer ofte flere ganger. */
export const SAMLE_MS = 250

export interface Klokkevalg {
  vedEndring: (endring: Diskusjonsendring) => void
  /** Om sanntiden er tilkoblet; uten den ser appen etter nytt jevnlig, som før. */
  vedStatus?: (tilkoblet: boolean) => void
  samleMs?: number
  /** Dokumentet som sier om fanen er synlig (standard: `document`). */
  dokument?: Pick<Document, 'visibilityState' | 'addEventListener' | 'removeEventListener'> | null
}

/**
 * Lytter på dørklokken for siden til den stoppes, og gir videre det som er
 * endret:
 *
 * - Ringinger innen `samleMs` gir én endring.
 * - Mens fanen er skjult, hentes ingenting; det som har ringt imens, gis når
 *   den blir synlig.
 * - Etter et brudd (kanalen er tilkoblet igjen) kan hva som helst være endret.
 *   Ved den første tilkoblingen ikke: appen har nettopp hentet alt.
 */
export function lyttPaDiskusjoner(abonner: Abonner, side: Diskusjonsside, valg: Klokkevalg): () => void {
  const dokument = valg.dokument === undefined ? (typeof document === 'undefined' ? null : document) : valg.dokument
  const samleMs = valg.samleMs ?? SAMLE_MS
  const synlig = () => dokument?.visibilityState !== 'hidden'
  let ventende: Set<string> | 'alle' | null = null
  let tidtaker: ReturnType<typeof setTimeout> | null = null
  let tilkoblet = false
  let harVaertTilkoblet = false
  let stoppet = false

  const gi = () => {
    tidtaker = null
    if (stoppet || !ventende || !synlig()) return
    const endring = ventende
    ventende = null
    valg.vedEndring(endring)
  }
  const planlegg = () => {
    if (!tidtaker && ventende && synlig()) tidtaker = setTimeout(gi, samleMs)
  }
  const merk = (traad: string | null) => {
    if (traad === null || ventende === 'alle') ventende = 'alle'
    else {
      ventende ??= new Set()
      ventende.add(traad)
    }
    planlegg()
  }
  const naarSynlig = () => planlegg()

  const stoppKlokke = abonner(side, {
    vedRinging: (_endring, rad) => merk(typeof rad?.diskusjon_id === 'string' ? rad.diskusjon_id : null),
    vedStatus: (status) => {
      const na = status === 'tilkoblet'
      if (na && !tilkoblet && harVaertTilkoblet) merk(null)
      if (na) harVaertTilkoblet = true
      if (na !== tilkoblet) {
        tilkoblet = na
        valg.vedStatus?.(na)
      }
    },
  })
  dokument?.addEventListener('visibilitychange', naarSynlig)

  return () => {
    stoppet = true
    if (tidtaker) clearTimeout(tidtaker)
    dokument?.removeEventListener('visibilitychange', naarSynlig)
    stoppKlokke()
  }
}
