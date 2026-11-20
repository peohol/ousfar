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

/** Hvor lenge appen venter på kanalen før den henter første gang likevel. */
export const VENT_PAA_KANALEN_MS = 1500

export interface Klokkevalg {
  vedEndring: (endring: Diskusjonsendring) => void
  /**
   * Tiden for å hente første gang: når kanalen er tilkoblet, så ingen endring
   * faller mellom hentingen og abonnementet, eller etter `ventPaaKanalenMs`
   * uten. Kommer kanalen først etter det, gis `alle` når den kommer.
   */
  vedKlar?: () => void
  ventPaaKanalenMs?: number
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
 * - Appen henter første gang når kanalen er tilkoblet (`vedKlar`), eller
 *   etter en frist uten; da gis `alle` når kanalen kommer.
 * - Etter et brudd (kanalen er tilkoblet igjen) kan hva som helst være endret.
 * - Kan ikke abonnementet startes, hentes det med en gang, og appen ser etter
 *   nytt jevnlig som uten sanntid.
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
  let klar = false
  const giKlar = () => {
    if (klar || stoppet) return
    klar = true
    clearTimeout(frist)
    valg.vedKlar?.()
  }
  let frist = setTimeout(giKlar, valg.ventPaaKanalenMs ?? VENT_PAA_KANALEN_MS)

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

  let stoppKlokke = () => {}
  try {
    stoppKlokke = abonner(side, {
      vedRinging: (_endring, rad) => merk(typeof rad?.diskusjon_id === 'string' ? rad.diskusjon_id : null),
      vedStatus: (status) => {
        const na = status === 'tilkoblet'
        // Første gang: hent nå, eller (etter fristen) det som kan ha kommet imellom. Senere: alt etter bruddet.
        if (na && !harVaertTilkoblet && !klar) giKlar()
        else if (na && !tilkoblet) merk(null)
        if (na) harVaertTilkoblet = true
        if (na !== tilkoblet) {
          tilkoblet = na
          valg.vedStatus?.(na)
        }
      },
    })
  } catch {
    // Uten sanntid (f.eks. en klient uten kanaler): ikke vent på en kanal som ikke kommer.
    clearTimeout(frist)
    frist = setTimeout(giKlar, 0)
  }
  dokument?.addEventListener('visibilitychange', naarSynlig)

  return () => {
    stoppet = true
    clearTimeout(frist)
    if (tidtaker) clearTimeout(tidtaker)
    dokument?.removeEventListener('visibilitychange', naarSynlig)
    stoppKlokke()
  }
}
