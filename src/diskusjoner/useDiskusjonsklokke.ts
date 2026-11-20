import { useCallback, useEffect, useRef } from 'react'
import { lyttPaDiskusjoner, type Diskusjonsendring } from './klokke'
import type { Diskusjonsside } from './modell'
import { abonnerPaDiskusjoner } from './sanntid'

/**
 * Lytter på dørklokken for siden så lenge komponenten står (`klokke.ts`), og
 * gir `vedEndring` det som er endret. `vedEndring` kan endre identitet uten
 * at abonnementet startes på nytt. Gir tilbake en funksjon som sier om
 * sanntiden er tilkoblet nå.
 */
export function useDiskusjonsklokke(side: Diskusjonsside, vedEndring: (endring: Diskusjonsendring) => void): () => boolean {
  const siste = useRef(vedEndring)
  siste.current = vedEndring
  const tilkoblet = useRef(false)

  useEffect(() => {
    tilkoblet.current = false
    return lyttPaDiskusjoner(abonnerPaDiskusjoner, side, {
      vedEndring: (endring) => siste.current(endring),
      vedStatus: (na) => {
        tilkoblet.current = na
      },
    })
  }, [side])

  return useCallback(() => tilkoblet.current, [])
}
