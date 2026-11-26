import type { ReactNode } from 'react'
import { useTips } from './Tips'

/**
 * Rammen rundt én prøve i fortolkningene av THC-syre og benzoylekgonin i urin
 * («Forrige prøve», «Denne prøven», «Tidligere prøve 2»): hårlinje rundt og
 * navnet i kanten (`feltgruppe`). Valgene for prøven, som «Under cut-off» og
 * ✕ for å fjerne den, står i kanten til høyre, så de ikke skyver feltene ned:
 * feltene i prøvene ved siden av hverandre står på samme høyde.
 */
export function Provegruppe({ tittel, valg, children }: { tittel: string; valg?: ReactNode; children: ReactNode }) {
  return (
    <fieldset className="feltgruppe be-prove">
      <legend>{tittel}</legend>
      {valg && <div className="be-prove__valg">{valg}</div>}
      {children}
    </fieldset>
  )
}

/**
 * Den røde ✕-en som fjerner en tidligere prøve. Navnet («Fjern tidligere
 * prøve 2») står som tooltip og som knappens navn for skjermlesere.
 */
export function Fjernknapp({ etikett, onClick }: { etikett: string; onClick: () => void }) {
  const tips = useTips(etikett, { skjermleser: false })
  return (
    <button type="button" className="be-prove__fjern" aria-label={etikett} onClick={onClick} {...tips.props}>
      <span aria-hidden="true">✕</span>
    </button>
  )
}
