import { useCallback, useEffect, useRef } from 'react'
import { lyttPaDiskusjoner, type Klokkevalg } from './klokke'
import type { Diskusjonsside } from './modell'
import { abonnerPaDiskusjoner } from './sanntid'

/**
 * Lytter på dørklokken for siden så lenge komponenten står (`klokke.ts`), og
 * gir `vedEndring` det som er endret og `vedKlar` tiden for å hente første
 * gang. De kan endre identitet uten at abonnementet startes på nytt. Gir
 * tilbake en funksjon som sier om sanntiden er tilkoblet nå.
 */
export function useDiskusjonsklokke(side: Diskusjonsside, valg: Pick<Klokkevalg, 'vedEndring' | 'vedKlar'>): () => boolean {
  const siste = useRef(valg)
  siste.current = valg
  const tilkoblet = useRef(false)

  useEffect(() => {
    tilkoblet.current = false
    return lyttPaDiskusjoner(abonnerPaDiskusjoner, side, {
      vedEndring: (endring) => siste.current.vedEndring(endring),
      vedKlar: () => siste.current.vedKlar?.(),
      vedStatus: (na) => {
        tilkoblet.current = na
      },
    })
  }, [side])

  return useCallback(() => tilkoblet.current, [])
}
