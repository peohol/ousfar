import { useCallback, useEffect, useMemo, useState } from 'react'

/** Dataene fra én kilde for det siden er koblet til, og visningen bygd av dem. */
export type Kildetilstand<U, V> =
  | { status: 'ingen' }
  | { status: 'laster' }
  | { status: 'klar'; utvalg: U; visning: V }
  | { status: 'feil'; feil: string }

const INGEN = { status: 'ingen' } as const
const LASTER = { status: 'laster' } as const

/** En kilde som leser dataene for en liste ID-er. */
export interface Kildeleser<U> {
  les(ider: readonly string[]): Promise<U>
}

/**
 * Leser dataene fra en kilde for ID-ene siden er koblet til, og bygger
 * visningen av dem. `ingen` når siden ikke er koblet, eller appen er satt opp
 * uten kilden. `lesPaNytt` leser dem igjen, etter at en administrator har
 * hentet nye; det som er hentet, står til det nye kommer. `bygg` må være den
 * samme funksjonen hver gang.
 *
 * Tilstanden regnes ut av hva som er lest for hvilke ID-er, ikke settes etter
 * tegningen: allerede i den første tegningen med ID-ene er den `laster`, så
 * siden aldri et øyeblikk viser «ingen data» — eller nummererer referansene
 * uten kilden — for en kilde som faktisk hentes.
 */
export function useKilde<U, V>(
  leser: Kildeleser<U> | undefined,
  koblet: readonly string[],
  bygg: (utvalg: U, ider: readonly string[]) => V,
): { tilstand: Kildetilstand<U, V>; lesPaNytt: () => void } {
  // Nøkkelen, og ikke lista, avgjør om koblingen er ny.
  const nokkel = koblet.join('\n')
  const ider = useMemo(() => (nokkel ? nokkel.split('\n') : []), [nokkel])
  const [runde, setRunde] = useState(0)
  // Det siste svaret, med kilden, ID-ene og runden det gjelder.
  const [lest, setLest] = useState<{
    leser: Kildeleser<U>
    nokkel: string
    runde: number
    tilstand: Kildetilstand<U, V>
  } | null>(null)

  useEffect(() => {
    if (!leser || ider.length === 0) return
    let gjelder = true
    const svar = (tilstand: Kildetilstand<U, V>) => {
      if (gjelder) setLest({ leser, nokkel, runde, tilstand })
    }
    leser
      .les(ider)
      .then((utvalg) => svar({ status: 'klar', utvalg, visning: bygg(utvalg, ider) }))
      .catch((e: Error) => svar({ status: 'feil', feil: e.message }))
    return () => {
      gjelder = false
    }
  }, [leser, ider, nokkel, bygg, runde])

  const tilstand = useMemo<Kildetilstand<U, V>>(() => {
    if (!leser || ider.length === 0) return INGEN
    if (!lest || lest.leser !== leser || lest.nokkel !== nokkel) return LASTER
    if (lest.runde === runde || lest.tilstand.status === 'klar') return lest.tilstand
    return LASTER
  }, [leser, ider, nokkel, runde, lest])

  const lesPaNytt = useCallback(() => setRunde((r) => r + 1), [])
  return { tilstand, lesPaNytt }
}
