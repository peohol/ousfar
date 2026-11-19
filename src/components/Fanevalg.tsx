import type { KeyboardEvent as Tastetrykk } from 'react'
import { Ikon } from './ikon/Ikon'
import type { Ikonnavn } from './ikon/register'

export interface Fanedefinisjon<Id extends string = string> {
  id: Id
  navn: string
  ikon?: Ikonnavn
}

/** ID-en til fanen og til panelet den styrer, ut fra en felles ID (`useId`). */
export const faneId = (felles: string, fane: string) => `${felles}-fane-${fane}`
export const fanepanelId = (felles: string, fane: string) => `${felles}-${fane}`

/**
 * En faneliste: fanene i hovedmenyen (Stoffregister og Verktøy) og i
 * Innstillinger (Visning og Chat). Bare den valgte fanen nås med tabulator;
 * piltastene, Home og End flytter mellom fanene og velger dem. Panelene har
 * `fanepanelId(felles, id)` som ID og `role="tabpanel"`.
 */
export function Fanevalg<Id extends string>({
  faner,
  fane,
  felles,
  etikett,
  className,
  faneklasse,
  onVelg,
}: {
  faner: readonly Fanedefinisjon<Id>[]
  fane: Id
  felles: string
  etikett: string
  className: string
  faneklasse: string
  onVelg: (fane: Id) => void
}) {
  const paaTast = (event: Tastetrykk<HTMLDivElement>) => {
    const i = faner.findIndex((f) => f.id === fane)
    const ny =
      event.key === 'ArrowRight' ? (i + 1) % faner.length
      : event.key === 'ArrowLeft' ? (i - 1 + faner.length) % faner.length
      : event.key === 'Home' ? 0
      : event.key === 'End' ? faner.length - 1
      : -1
    if (ny < 0) return
    event.preventDefault()
    const neste = faner[ny]!.id
    onVelg(neste)
    document.getElementById(faneId(felles, neste))?.focus()
  }
  return (
    <div role="tablist" aria-label={etikett} className={className} onKeyDown={paaTast}>
      {faner.map((f) => (
        <button
          key={f.id}
          id={faneId(felles, f.id)}
          type="button"
          role="tab"
          className={faneklasse}
          aria-selected={fane === f.id}
          aria-controls={fanepanelId(felles, f.id)}
          tabIndex={fane === f.id ? 0 : -1}
          onClick={() => onVelg(f.id)}
        >
          {f.ikon && <Ikon navn={f.ikon} storrelse="ui" />}
          {f.navn}
        </button>
      ))}
    </div>
  )
}
