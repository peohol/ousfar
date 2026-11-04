import type { KeyboardEvent } from 'react'
import type { Svaralternativ } from '../../verktoy/flyt/typer'

export interface SvarvalgProps {
  /** Navnet radioknappene deler; unikt på siden. */
  navn: string
  /** Id-en til teksten som stiller spørsmålet, så gruppen får navnet sitt fra den. */
  etikett: string
  /** Id-en til en forklaring ved svaret (hjelpetekst eller hva svaret betyr). */
  beskrivelse?: string
  alternativer: readonly Svaralternativ[]
  /** Verdien som er valgt, eller ingen. */
  valgt: string | undefined
  /** Ubesvart der et svar trengs før planen kan lages. */
  mangler?: boolean
  onVelg: (verdi: string) => void
}

/**
 * Et svar som segmenterte knapper med like store trykkflater (minst 44 px),
 * som «Ja / Nei / Ukjent» (§8 i `docs/verktøy-brukervennlighet-2026-11.md`).
 * Under ligger vanlige radioknapper, så piltastene flytter valget og
 * skjermlesere leser det som en radiogruppe; tallene 1, 2, 3 … velger
 * alternativet på den plassen. Valgt svar har en hake i tillegg til fargen.
 */
export function Svarvalg({ navn, etikett, beskrivelse, alternativer, valgt, mangler = false, onVelg }: SvarvalgProps) {
  const tast = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return
    const a = alternativer[Number(e.key) - 1]
    if (!a) return
    e.preventDefault()
    onVelg(a.verdi)
    e.currentTarget.querySelectorAll('input')[Number(e.key) - 1]?.focus()
  }
  return (
    <div className="svarvalg" role="radiogroup" aria-labelledby={etikett} aria-describedby={beskrivelse} aria-invalid={mangler || undefined} data-mangler={mangler || undefined} onKeyDown={tast}>
      {alternativer.map((a) => (
        <label key={a.verdi} className="svarvalg__valg">
          <input type="radio" name={navn} value={a.verdi} checked={valgt === a.verdi} onChange={() => onVelg(a.verdi)} />
          <svg className="svarvalg__hake" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {a.tekst}
        </label>
      ))}
    </div>
  )
}
