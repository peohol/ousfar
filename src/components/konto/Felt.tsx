import { useId, type InputHTMLAttributes, type ReactNode } from 'react'
import type { Pasientvakt } from '../../hooks/usePasientvakt'

export interface FeltProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  merkelapp: string
  /** Kort forklaring under feltet, f.eks. hva slags passord som godtas. */
  hjelp?: ReactNode
  /**
   * Advarselen om pasientopplysninger, knyttet til feltet. Settes av
   * `Fritekstfelt`, så innloggingen ikke trenger vakten (`src/auth/vegg.ts`).
   */
  vakt?: Pick<Pasientvakt, 'beskrevetAv' | 'varsel'>
}

/**
 * Ett skjemafelt med merkelapp. Merkelappen står alltid — den skal ikke
 * forsvinne når det skrives i feltet, slik en plassholder gjør.
 */
export function Felt({ merkelapp, hjelp, vakt, className, ...rest }: FeltProps) {
  const id = useId()
  const hjelpId = `${id}-hjelp`
  const beskrevetAv = [hjelp && hjelpId, vakt?.beskrevetAv].filter(Boolean).join(' ') || undefined

  return (
    <div className="felt">
      <label className="felt__merkelapp" htmlFor={id}>
        {merkelapp}
      </label>
      <input
        id={id}
        className={['felt__inndata', className].filter(Boolean).join(' ')}
        aria-describedby={beskrevetAv}
        {...rest}
      />
      {hjelp && (
        <span className="felt__hjelp" id={hjelpId}>
          {hjelp}
        </span>
      )}
      {vakt?.varsel}
    </div>
  )
}

/** En opplysning som vises, men ikke kan endres — brukernavnet. */
export function Lastfelt({
  merkelapp,
  verdi,
  hjelp,
}: {
  merkelapp: string
  verdi: string
  hjelp?: ReactNode
}) {
  return (
    <div className="felt">
      <span className="felt__merkelapp">{merkelapp}</span>
      <span className="felt__last">{verdi}</span>
      {hjelp && <span className="felt__hjelp">{hjelp}</span>}
    </div>
  )
}
