import { useEffect, useMemo, useState } from 'react'
import { byggInteraksjoner, interaksjonsnokler, type Interaksjonsoversikt } from '../../legemiddeldata/interaksjoner'
import type { Interaksjonsnokler } from '../../legemiddeldata/lesing'
import { useFaginnholdskilde } from './Faginnholdskilde'
import type { Legemiddeltilstand } from './useLegemidler'

export type Interaksjonstilstand =
  | { status: 'ingen' }
  | { status: 'laster' }
  | { status: 'klar'; oversikt: Interaksjonsoversikt }
  | { status: 'feil'; feil: string }

const INGEN = { status: 'ingen' } as const
const LASTER = { status: 'laster' } as const

/**
 * Interaksjonene for preparatene siden er koblet til. Slås opp når
 * preparatene er hentet, på ATC-kodene deres; `ingen` når siden ikke er
 * koblet, og `feil` også når preparatene ikke kunne hentes.
 *
 * Som i `useKilde` regnes tilstanden ut av hva som er lest for hvilke
 * nøkler, så den er `laster` fra første tegning med preparatene.
 */
export function useInteraksjoner(legemidler: Legemiddeltilstand, koblet: readonly string[]): Interaksjonstilstand {
  const { legemidler: leser } = useFaginnholdskilde()
  const utvalg = legemidler.status === 'klar' ? legemidler.utvalg : null
  // Nøkkelen, og ikke lista, avgjør om koblingen er ny, som i `useLegemidler`.
  const koblingsnokkel = koblet.join('\n')
  const nokler = useMemo(
    () => (utvalg ? interaksjonsnokler(utvalg, koblingsnokkel ? koblingsnokkel.split('\n') : []) : null),
    [utvalg, koblingsnokkel],
  )
  const [lest, setLest] = useState<{ leser: typeof leser; nokler: Interaksjonsnokler; tilstand: Interaksjonstilstand } | null>(
    null,
  )

  useEffect(() => {
    if (!leser || !nokler) return
    let gjelder = true
    const svar = (tilstand: Interaksjonstilstand) => {
      if (gjelder) setLest({ leser, nokler, tilstand })
    }
    leser
      .interaksjoner(nokler)
      .then((utvalg) => svar({ status: 'klar', oversikt: byggInteraksjoner(utvalg, nokler) }))
      .catch((e: Error) => svar({ status: 'feil', feil: e.message }))
    return () => {
      gjelder = false
    }
  }, [leser, nokler])

  return useMemo<Interaksjonstilstand>(() => {
    if (legemidler.status === 'feil') return { status: 'feil', feil: legemidler.feil }
    if (legemidler.status === 'laster') return LASTER
    if (!leser || !nokler) return INGEN
    return lest && lest.leser === leser && lest.nokler === nokler ? lest.tilstand : LASTER
  }, [legemidler, leser, nokler, lest])
}
