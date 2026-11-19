import { useCallback, useEffect, useRef, useState } from 'react'
import { kanSoke, SOKEPAUSE_MS, type Personkilde, type Persontreff } from './modell'

export type Personsoksvar =
  /** For kort til å søke, eller ingen kilde. */
  | { status: 'kort' }
  | { status: 'soker' }
  | { status: 'klar'; treff: Persontreff[] }
  | { status: 'feil'; melding: string }

type Hentet = { kilde: Personkilde; ord: string } & ({ treff: Persontreff[] } | { feil: string })

const feiltekst = (aarsak: unknown) => (aarsak instanceof Error && aarsak.message ? aarsak.message : 'Noe gikk galt. Prøv igjen.')

/**
 * Treffene for søket i kilden: hentet først når skrivingen har stoppet
 * ({@link SOKEPAUSE_MS}) og søket har minst to tegn, så databasen bare får ett
 * kall per pause. Svarene huskes per søk til kilden byttes eller `glem` kalles
 * (etter at et treff er valgt, når kandidatene kan ha endret seg). Treffene
 * hører til søket de ble hentet for: et endret søk viser aldri de gamle.
 */
export function usePersonsok(kilde: Personkilde | null, sok: string): { svar: Personsoksvar; glem: () => void } {
  const ord = sok.trim()
  const [hentet, setHentet] = useState<Hentet | null>(null)
  const [runde, setRunde] = useState(0)
  const husket = useRef(new Map<string, Persontreff[]>())

  // En ny kilde (en annen gruppe eller et annet fagmiljø) har andre kandidater.
  useEffect(() => {
    husket.current = new Map()
  }, [kilde])

  useEffect(() => {
    if (!kilde || !kanSoke(ord)) return
    const fra = husket.current.get(ord)
    if (fra) {
      setHentet({ kilde, ord, treff: fra })
      return
    }
    let gjeldende = true
    const tidtaker = setTimeout(() => {
      kilde(ord).then(
        (treff) => {
          if (!gjeldende) return
          husket.current.set(ord, treff)
          setHentet({ kilde, ord, treff })
        },
        (aarsak) => gjeldende && setHentet({ kilde, ord, feil: feiltekst(aarsak) }),
      )
    }, SOKEPAUSE_MS)
    return () => {
      gjeldende = false
      clearTimeout(tidtaker)
    }
  }, [kilde, ord, runde])

  const glem = useCallback(() => {
    husket.current.clear()
    setHentet(null)
    setRunde((r) => r + 1)
  }, [])

  const svar: Personsoksvar =
    !kilde || !kanSoke(ord)
      ? { status: 'kort' }
      : hentet?.kilde !== kilde || hentet.ord !== ord
        ? { status: 'soker' }
        : 'feil' in hentet
          ? { status: 'feil', melding: hentet.feil }
          : { status: 'klar', treff: hentet.treff }
  return { svar, glem }
}
