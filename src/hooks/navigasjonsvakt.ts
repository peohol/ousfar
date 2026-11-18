import { useEffect, useRef } from 'react'
import type { Forlat, Skjemastatus } from '../components/ideer/useForlatvakt'

/**
 * Vakten mot nettleserens tilbake- og framknapp for et skjema som står på
 * sin egen adresse, som et skjema i en arbeidsflate i en gruppe
 * (docs/navigasjon.md, «Ulagret arbeid og nettleserens tilbake»).
 *
 * Adressen er alt byttet når appen får vite om trykket, så `useRute` går
 * tilbake dit brukeren sto, og spør vakten. Forkaster brukeren endringene,
 * går appen dit trykket skulle; ellers står alt som før.
 */
interface Vakt {
  status: () => Skjemastatus
  forlat: Forlat
}

const vakter: Vakt[] = []

/**
 * For `useRute`: stopper byttet når et skjema har endringer som ikke er
 * lagret, og spør. `fortsett` gjør byttet når brukeren forkaster dem. Sant
 * når byttet er stoppet.
 */
export function stoppNavigasjon(fortsett: () => void): boolean {
  // Den sist meldte vakten som har noe å passe på, spør.
  const vakt = [...vakter].reverse().find((v) => v.status() !== 'uendret')
  if (!vakt) return false
  vakt.forlat(fortsett)
  return true
}

/**
 * Melder skjemaet på vakten mens det står. Statusen leses når nettleseren
 * bytter adresse, så den er alltid den skjemaet sist ble tegnet med.
 */
export function useNavigasjonsvakt(status: Skjemastatus, forlat: Forlat): void {
  const naa = useRef<Vakt>({ status: () => status, forlat })
  naa.current.status = () => status
  naa.current.forlat = forlat
  useEffect(() => {
    const vakt = naa.current
    vakter.push(vakt)
    return () => {
      const plass = vakter.indexOf(vakt)
      if (plass >= 0) vakter.splice(plass, 1)
    }
  }, [])
}
