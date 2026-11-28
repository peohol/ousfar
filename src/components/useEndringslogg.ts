import { useEffect, useMemo, useState } from 'react'
import { useSystemarkitekt } from '../auth/systemrolle'
import { hentUtproving, loggMed, OFFENTLIG_LOGG, type Endringslogg } from '../data/endringslogg'
import type { Endring } from '../domain/versjon'

/**
 * Endringsloggen den innloggede ser (`src/data/endringslogg.ts`): den alle
 * ser, og for systemarkitektene også føringene under utprøving
 * (`bareSystemarkitekter`, `docs/endringslogg.md`). De hentes først når
 * databasen har svart at hen er systemarkitekt; for alle andre hentes de
 * aldri, og loggen er som uten dem. Går hentingen galt, er loggen den alle ser.
 */
export function useEndringslogg(): Endringslogg {
  const systemarkitekt = useSystemarkitekt()
  const [utproving, setUtproving] = useState<readonly Endring[] | null>(null)
  useEffect(() => {
    if (!systemarkitekt) return
    let gjelder = true
    hentUtproving().then(
      (foringer) => gjelder && setUtproving(foringer),
      () => undefined,
    )
    return () => {
      gjelder = false
    }
  }, [systemarkitekt])
  return useMemo(() => (systemarkitekt && utproving ? loggMed(utproving) : OFFENTLIG_LOGG), [systemarkitekt, utproving])
}
