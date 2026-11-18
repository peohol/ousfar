import type { ReactNode } from 'react'
import type { Maal } from './hendelse'

/**
 * En lenke til `til`, eller en knapp som kaller `ved` når målet ikke har egen
 * adresse ({@link Maal}). Knappen ser ut som lenken den står i stedet for.
 */
export function Maallenke({ maal, className, children }: { maal: Maal; className: string; children: ReactNode }) {
  if (maal.til === undefined)
    return (
      <button type="button" className={className} onClick={maal.ved}>
        {children}
      </button>
    )
  return (
    <a className={className} href={maal.til} onClick={maal.ved}>
      {children}
    </a>
  )
}
