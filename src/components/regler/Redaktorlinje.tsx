import { useEffect, useState } from 'react'
import { personnavn, redaktorlager, type Redaktorlager } from '../../redaktorer/ansvar'

/**
 * Hvem som er redaktør for regelsettene som redigeres (P5 tråd A), som én
 * linje over reglene. Bare for dem som kan se det (redaktørene og
 * administratorene); står tom når ingen har ansvaret, eller når svaret ikke
 * kan hentes.
 */
export function Redaktorlinje({ ressurser, lager = redaktorlager }: { ressurser: readonly string[]; lager?: Redaktorlager }) {
  const [navn, setNavn] = useState<string[]>([])
  const nokkel = [...ressurser].sort().join(',')

  useEffect(() => {
    let gjeldende = true
    const ider = nokkel ? nokkel.split(',') : []
    Promise.allSettled(ider.map((id) => lager.forRessurs(id))).then((svar) => {
      if (!gjeldende) return
      const personer = new Map<string, string>()
      for (const s of svar) if (s.status === 'fulfilled') for (const a of s.value) personer.set(a.bruker.id, personnavn(a.bruker))
      setNavn([...personer.values()].sort((a, b) => a.localeCompare(b, 'nb')))
    })
    return () => {
      gjeldende = false
    }
  }, [nokkel, lager])

  if (navn.length === 0) return null
  return <p className="regler__ingress">{navn.length === 1 ? 'Redaktør' : 'Redaktører'}: {navn.join(', ')}</p>
}
