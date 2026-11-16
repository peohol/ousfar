import { useId, type ReactNode, type Ref } from 'react'

/**
 * Et tekstfelt over flere linjer med merkelapp, hjelpetekst og en teller når
 * teksten nærmer seg grensen databasen har. Høyden vokser med teksten.
 */
export function Tekstomrade({
  merkelapp,
  verdi,
  onEndre,
  maks,
  hjelp,
  rader = 3,
  pakrevd,
  autoFocus,
  ugyldig,
  feilId,
  feltRef,
}: {
  merkelapp: string
  verdi: string
  onEndre: (verdi: string) => void
  maks: number
  hjelp?: ReactNode
  rader?: number
  pakrevd?: boolean
  autoFocus?: boolean
  /** Feltet har feilen skjemaet viser; `feilId` er meldingen, som da leses opp med feltet. */
  ugyldig?: boolean
  feilId?: string
  feltRef?: Ref<HTMLTextAreaElement>
}) {
  const id = useId()
  const hjelpId = `${id}-hjelp`
  const tellerId = `${id}-teller`
  // Telleren står først når det er under en tidel igjen.
  const igjen = maks - verdi.length
  const visTeller = igjen < maks / 10
  const beskrevet = [ugyldig && feilId, hjelp && hjelpId, visTeller && tellerId].filter(Boolean).join(' ') || undefined
  return (
    <div className="felt">
      <label className="felt__merkelapp" htmlFor={id}>
        {merkelapp}
      </label>
      <textarea
        ref={feltRef}
        id={id}
        className="felt__inndata felt__inndata--flerlinje"
        rows={Math.max(rader, Math.min(12, Math.ceil(verdi.length / 70)))}
        value={verdi}
        maxLength={maks}
        required={pakrevd}
        aria-required={pakrevd || undefined}
        aria-describedby={beskrevet}
        aria-invalid={ugyldig || undefined}
        autoFocus={autoFocus}
        onChange={(e) => onEndre(e.target.value)}
      />
      {hjelp && (
        <span className="felt__hjelp" id={hjelpId}>
          {hjelp}
        </span>
      )}
      {visTeller && (
        <span className="felt__hjelp" id={tellerId} aria-live="polite">
          {igjen === 1 ? 'Ett tegn igjen' : `${igjen} tegn igjen`}
        </span>
      )}
    </div>
  )
}
