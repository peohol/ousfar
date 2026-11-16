import { useState } from 'react'
import type { Laboratorieanalytt } from '../../domain/analyttkatalog'
import { lesRegeldata, type Faginnholdsleser } from '../../faginnhold/lesing'
import { forslagsvalgForFortolkning, regelgrunnlag } from '../../forslag/fortolkning'
import { Ikonknapp } from '../Ikonknapp'
import { useForeslaEndring } from './Forslagskilde'

/**
 * «Foreslå endring» i fortolkningen: leser de publiserte regelsettene og
 * kommentarene først når knappen trykkes, så fortolkningen selv ikke endres,
 * og åpner skjemaet med hvert regelsett og hver kommentar å velge mellom.
 */
export function Fortolkningsforslag({
  sidenavn,
  analytter,
  leser,
}: {
  sidenavn: string
  analytter: readonly Laboratorieanalytt[]
  leser: Faginnholdsleser
}) {
  const apne = useForeslaEndring()
  const [henter, setHenter] = useState(false)
  const [feil, setFeil] = useState<string | null>(null)
  if (!apne || analytter.length === 0) return null

  const foresla = async () => {
    setHenter(true)
    setFeil(null)
    try {
      const valg = forslagsvalgForFortolkning(sidenavn, await lesRegeldata(leser, regelgrunnlag(analytter), 'publisert'))
      if (valg.length === 0) setFeil('Fortolkningen har ingen publiserte regler å foreslå endringer i.')
      else apne({ tittel: sidenavn, valg })
    } catch (e) {
      setFeil((e as Error).message)
    } finally {
      setHenter(false)
    }
  }

  return (
    <>
      <Ikonknapp
        ikon="foresla"
        etikett={henter ? 'Henter reglene …' : feil ?? 'Foreslå endring'}
        aria-busy={henter || undefined}
        disabled={henter}
        onClick={() => void foresla()}
      />
      {feil && (
        <span className="kun-skjermleser" role="status">
          {feil}
        </span>
      )}
    </>
  )
}
