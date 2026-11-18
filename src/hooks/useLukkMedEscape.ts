import { useEffect, useRef } from 'react'
import { lagLiggerOver, skrivesIFelt } from './useKeyboard'

/**
 * `Escape` lukker siden — en fagside, søkesiden, en gruppe — og går dit
 * brukeren kom fra (`useRute`, «inngangsveien»), men ikke fra et felt, et åpent
 * redigeringsskjema eller et lag over siden (`lagstakk.ts`). En annen lytter
 * som alt har brukt tasten, går foran.
 */
export function useLukkMedEscape(onLukk: () => void) {
  const lukk = useRef(onLukk)
  lukk.current = onLukk
  useEffect(() => {
    const paaTast = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      if (event.ctrlKey || event.metaKey || event.altKey) return
      if (lagLiggerOver() || skrivesIFelt()) return
      if (document.querySelector('.stoffside .redigering')) return
      event.preventDefault()
      lukk.current()
    }
    window.addEventListener('keydown', paaTast)
    return () => window.removeEventListener('keydown', paaTast)
  }, [])
}
